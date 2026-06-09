/**
 * @file planner.js
 * @description Hive Swarm native planner / router.
 *
 * Given a free-form goal, decides WHICH attack strategy to use:
 *
 *   - 'direct'           — one worker, no decomposition
 *   - 'swarm'            — decompose into N parallel subtasks (no agreement step)
 *   - 'consensus'        — N workers answer the SAME question, then we vote
 *   - 'swarm+consensus'  — decompose + run + then vote / synthesize
 *   - 'decompose-only'   — produce a decomposition plan but DO NOT dispatch
 *
 * The router is intentionally simple:
 *
 *   1. Try a small, fast LLM call (via the shared ProviderManager) asking
 *      two yes/no questions: "Should this be done in parallel?" and
 *      "Does the answer need agreement across workers?".
 *   2. If the LLM is unreachable, parse-errored, or we can't load the
 *      provider adapter — fall back to a deterministic heuristic
 *      over the goal text. The heuristic covers the common phrasings
 *      the user actually types (see KEYWORD_* tables below) and also
 *      picks a sensible default domain / agent count.
 *
 * The planner NEVER throws.  It always returns a fully-populated plan
 * object so the CLI / dispatcher can move forward.
 *
 * Exports:
 *   - `plan(goal, context)`   — primary async function
 *   - `Planner`               — stateful class wrapper (history + provider cache)
 *   - `__version`             — module version
 *   - `HEURISTIC_RULES`       — frozen table for tests / introspection
 *
 * @author Hive Swarm (sub-agent C / 3)
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Optional provider wiring — identical pattern to goal-decomposer.js
// ---------------------------------------------------------------------------
//
// The planner wants to call the LLM *if available*, but it's perfectly
// happy to fall back to the heuristic table if the provider can't load.
let ProviderManager = null;
try {
  // eslint-disable-next-line global-require
  ({ ProviderManager } = require(
    path.resolve(__dirname, '..', '..', 'providers', 'provider-adapter.js')
  ));
} catch (_err) {
  // Silent: the runtime fall-back path will report 'heuristic' as the source.
  ProviderManager = null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Module version (semver-ish). */
const __version = '1.0.0';

/** Default LLM model for the planning call. */
const DEFAULT_MODEL = 'qwen3.6-35b-a3b';

/** Fallback LLM if primary is down. */
const FALLBACK_MODEL = 'glm-5';

/** Default provider name (matches the rest of the swarm). */
const DEFAULT_PROVIDER = 'lmstudio';

/** Default number of agents for a swarm (overridable via context.count). */
const DEFAULT_COUNT = 4;

/** Allowed approach values. */
const APPROACHES = Object.freeze([
  'direct',
  'swarm',
  'consensus',
  'swarm+consensus',
  'decompose-only',
]);

/** Allowed domain values (mirrors goal-decomposer.js DOMAIN_HINTS keys). */
const VALID_DOMAINS = Object.freeze([
  'auto', 'build', 'game', 'research', 'audit', 'data', 'mobile', 'web', 'general',
]);

// ---------------------------------------------------------------------------
// Heuristic rules
// ---------------------------------------------------------------------------
//
// Two simple tables: keywords that scream "use a swarm" and keywords that
// scream "you need agreement".  An empty goal OR a goal with none of these
// markers falls through to the default — which is "swarm" for non-trivial
// builds, "direct" for trivial verbs.

/** Keywords that strongly suggest parallel work / multiple specialists. */
const SWARM_KEYWORDS = Object.freeze([
  'audit', 'review', 'build', 'create', 'design', 'implement',
  'research', 'investigate', 'explore', 'mobile', 'app',
  'data', 'pipeline', 'analyze', 'analysis', 'survey',
  'compare', 'benchmark', 'migrate', 'refactor', 'optimize',
  'test', 'qa', 'document', 'integrate', 'deploy',
]);

/** Keywords that strongly suggest a vote / agreement / decision. */
const CONSENSUS_KEYWORDS = Object.freeze([
  'should we', 'decide', 'decision', 'vote', 'pick', 'choose',
  'which is', 'best', 'recommend', 'opinions', 'consensus',
  'agree', 'disagree', 'rate', 'rank', 'prioritize',
]);

/** Single-step verbs → direct (no decomposition). */
const DIRECT_VERBS = Object.freeze([
  'fix', 'rename', 'add comment', 'typo', 'format',
  'lint', 'spell', 'remove', 'delete', 'update version',
  'bump', 'pin', 'unpin', 'tag', 'untag', 'commit',
]);

/** Heuristic rules table, exported for tests. */
const HEURISTIC_RULES = Object.freeze({
  SWARM_KEYWORDS,
  CONSENSUS_KEYWORDS,
  DIRECT_VERBS,
});

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/**
 * Lowercase + collapse whitespace.  Used for keyword matching so the
 * heuristic doesn't get thrown off by capitalization.
 *
 * @param {string} s
 * @returns {string}
 */
function norm(s) {
  return (typeof s === 'string' ? s : '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Word-boundary keyword matcher.  Avoids "fix" matching inside "suffix".
 *
 * @param {string} text  Already lowercased.
 * @param {string} kw    Already lowercased.
 * @returns {boolean}
 */
function hasWord(text, kw) {
  // Multi-word keywords (e.g. "should we") — plain substring is fine.
  if (kw.includes(' ')) return text.includes(kw);
  // Single-word keywords — word boundary.
  const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i');
  return re.test(text);
}

/**
 * Build the LLM prompt for the planning decision.
 *
 * Kept deliberately small — a one-shot completion that returns two booleans.
 * We use a strict JSON response so the parser never has to do anything fancy.
 *
 * @param {string} goal
 * @returns {Array<{role:string, content:string}>}
 */
function buildPlanningPrompt(goal) {
  const system = [
    'You are the Hive Swarm planner.  You receive a single user goal and must',
    'decide HOW the swarm should attack it.  Reply with a STRICT JSON object',
    'and nothing else (no commentary, no markdown fences).  The JSON shape is:',
    '',
    '{',
    '  "parallel": true|false,    // true if it benefits from multiple workers in parallel',
    '  "consensus": true|false,   // true if the final answer needs agreement / voting',
    '  "approach": "direct"|"swarm"|"consensus"|"swarm+consensus"|"decompose-only",',
    '  "count": <integer 2-8>,    // suggested number of parallel workers',
    '  "domain": "<one of: auto,build,game,research,audit,data,mobile,web,general>",',
    '  "reason": "<one short sentence>"',
    '}',
    '',
    'Definitions:',
    '  direct           = one worker, no decomposition, no vote.',
    '  swarm            = decompose into N parallel subtasks, aggregate the results.',
    '  consensus        = N workers answer the SAME question, then we vote / merge.',
    '  swarm+consensus  = decompose + dispatch, then have a consensus layer score / pick.',
    '  decompose-only   = produce a decomposition plan, but DO NOT execute it.',
    '',
    'If the goal is a single trivial edit (rename, fix typo, add comment) prefer "direct".',
    'If the goal asks for a decision / vote / pick / should-we, prefer consensus.',
    'If the goal is a complex build, research, or multi-step task, prefer swarm.',
    'If BOTH parallel work AND a final decision are required, use swarm+consensus.',
  ].join('\n');

  const user = `GOAL: ${goal}\n\nReturn the JSON object now.`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/**
 * Pull the first JSON object out of an LLM response.
 * Tolerant of markdown fences, leading prose, trailing garbage.
 *
 * @param {string} text
 * @returns {object|null}
 */
function extractFirstJsonObject(text) {
  if (typeof text !== 'string' || !text) return null;
  // Strip markdown code fences if present.
  const stripped = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  // Quick win — the whole string parses.
  try { return JSON.parse(stripped); } catch (_) { /* fall through */ }
  // Find the first balanced { ... }.
  const start = stripped.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const candidate = stripped.slice(start, i + 1);
        try { return JSON.parse(candidate); } catch (_) { return null; }
      }
    }
  }
  return null;
}

/**
 * Coerce an LLM-returned object into a valid plan, or return null if it's
 * too broken to use.
 *
 * @param {any} obj
 * @returns {object|null}
 */
function coercePlannerResponse(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const approach = String(obj.approach || '').toLowerCase().trim();
  if (!APPROACHES.includes(approach)) return null;
  const count = Number.isFinite(obj.count) ? Math.max(2, Math.min(8, Math.floor(obj.count))) : DEFAULT_COUNT;
  const domain = VALID_DOMAINS.includes(String(obj.domain || '').toLowerCase())
    ? String(obj.domain).toLowerCase()
    : 'auto';
  return {
    approach,
    reason: typeof obj.reason === 'string' ? obj.reason.slice(0, 280) : 'LLM-provided plan',
    params: {
      count,
      domain,
      model: null,             // filled in by caller (or left null → use default)
      consensus: approach === 'consensus' || approach === 'swarm+consensus',
    },
  };
}

/**
 * Pure-text heuristic.  Used as the fallback when the LLM is unreachable.
 *
 * Returns a fully-populated plan object — same shape as `plan()`.
 *
 * @param {string} goal
 * @param {object} ctx  Already-normalized context (see normalizeContext)
 * @returns {object}
 */
function heuristicPlan(goal, ctx) {
  const text = norm(goal);
  const wordCount = text ? text.split(' ').length : 0;

  const hasSwarm = SWARM_KEYWORDS.some(k => hasWord(text, k));
  const hasConsensus = CONSENSUS_KEYWORDS.some(k => hasWord(text, k));
  const hasDirect = DIRECT_VERBS.some(k => hasWord(text, k));

  // Empty goal — safe default: swarm with a small count.
  if (!text) {
    return {
      approach: 'swarm',
      reason: 'empty goal — defaulting to a small swarm',
      params: {
        count: ctx.count || 3,
        domain: ctx.domain || 'auto',
        model: ctx.model || null,
        consensus: false,
      },
      estimatedAgents: ctx.count || 3,
      estimatedDuration: '~2 min',
      source: 'heuristic',
    };
  }

  // Trivial single-step verb → direct.
  if (hasDirect && !hasSwarm && !hasConsensus) {
    return {
      approach: 'direct',
      reason: `detected trivial verb (${DIRECT_VERBS.find(k => hasWord(text, k))}) — direct is enough`,
      params: {
        count: 1,
        domain: ctx.domain || 'general',
        model: ctx.model || null,
        consensus: false,
      },
      estimatedAgents: 1,
      estimatedDuration: '~30s',
      source: 'heuristic',
    };
  }

  // Both kinds of keywords → swarm + consensus.
  if (hasSwarm && hasConsensus) {
    return {
      approach: 'swarm+consensus',
      reason: 'goal mixes parallel work and a final decision — running both',
      params: {
        count: ctx.count || DEFAULT_COUNT,
        domain: ctx.domain || 'auto',
        model: ctx.model || null,
        consensus: true,
      },
      estimatedAgents: (ctx.count || DEFAULT_COUNT) + 3,   // workers + voters
      estimatedDuration: '~4 min',
      source: 'heuristic',
    };
  }

  // Consensus only.
  if (hasConsensus) {
    return {
      approach: 'consensus',
      reason: 'goal is a decision / vote — running N workers and merging',
      params: {
        count: ctx.count || 3,
        domain: ctx.domain || 'auto',
        model: ctx.model || null,
        consensus: true,
      },
      estimatedAgents: ctx.count || 3,
      estimatedDuration: '~2 min',
      source: 'heuristic',
    };
  }

  // Swarm only — the common case for "build a Discord bot" etc.
  if (hasSwarm) {
    return {
      approach: 'swarm',
      reason: 'goal looks like parallel work — running a swarm',
      params: {
        count: ctx.count || DEFAULT_COUNT,
        domain: ctx.domain || 'auto',
        model: ctx.model || null,
        consensus: false,
      },
      estimatedAgents: ctx.count || DEFAULT_COUNT,
      estimatedDuration: '~3 min',
      source: 'heuristic',
    };
  }

  // Long generic goal → swarm.
  if (wordCount >= 6) {
    return {
      approach: 'swarm',
      reason: `long goal (${wordCount} words) — defaulting to swarm for thoroughness`,
      params: {
        count: ctx.count || DEFAULT_COUNT,
        domain: ctx.domain || 'auto',
        model: ctx.model || null,
        consensus: false,
      },
      estimatedAgents: ctx.count || DEFAULT_COUNT,
      estimatedDuration: '~3 min',
      source: 'heuristic',
    };
  }

  // Short, generic → direct is fine.
  return {
    approach: 'direct',
    reason: 'short, simple goal — direct execution',
    params: {
      count: 1,
      domain: ctx.domain || 'general',
      model: ctx.model || null,
      consensus: false,
    },
    estimatedAgents: 1,
    estimatedDuration: '~30s',
    source: 'heuristic',
  };
}

/**
 * Normalize the user-supplied context into a stable shape.
 *
 * @param {object} ctx
 * @returns {{
 *   count:number, domain:string, model:(string|null),
 *   providerName:string, consensus:boolean, force:string|null
 * }}
 */
function normalizeContext(ctx) {
  const c = ctx && typeof ctx === 'object' ? ctx : {};
  const rawCount = Number(c.count);
  const count = Number.isFinite(rawCount) && rawCount > 0
    ? Math.max(1, Math.min(15, Math.floor(rawCount)))
    : DEFAULT_COUNT;
  const domain = VALID_DOMAINS.includes(String(c.domain || '').toLowerCase())
    ? String(c.domain).toLowerCase()
    : 'auto';
  const model = (typeof c.model === 'string' && c.model.trim()) ? c.model.trim() : null;
  const providerName = (typeof c.providerName === 'string' && c.providerName.trim())
    ? c.providerName.trim()
    : DEFAULT_PROVIDER;
  const force = APPROACHES.includes(String(c.force || '').toLowerCase())
    ? String(c.force).toLowerCase()
    : null;
  return {
    count,
    domain,
    model,
    providerName,
    consensus: c.consensus === true,
    force,
  };
}

/**
 * Estimate wall-clock duration for a plan, based on agent count.
 * Crude but useful for the CLI progress display.
 *
 * @param {string} approach
 * @param {number} agentCount
 * @returns {string} e.g. "~3 min"
 */
function estimateDuration(approach, agentCount) {
  const base = {
    'direct': 30,
    'swarm': 180,
    'consensus': 120,
    'swarm+consensus': 240,
    'decompose-only': 15,
  }[approach] || 120;
  const extra = Math.max(0, (agentCount || 1) - 1) * 20;
  const total = base + extra;
  if (total < 60) return `~${total}s`;
  return `~${Math.round(total / 60)} min`;
}

/**
 * Try the LLM, with hard timeouts.  If anything goes wrong, return null
 * (caller falls back to heuristic).
 *
 * @param {{
 *   count:number, domain:string, model:(string|null),
 *   providerName:string, consensus:boolean, force:string|null
 * }} ctx
 * @param {string} goal
 * @returns {Promise<object|null>}
 */
async function tryLlmPlan(ctx, goal) {
  if (!ProviderManager) return null;
  const model = ctx.model || DEFAULT_MODEL;
  const fallback = FALLBACK_MODEL;

  const messages = buildPlanningPrompt(goal);
  const pm = new ProviderManager();

  // Register lmstudio by default — the rest of the swarm assumes it.
  // We don't fail if it can't connect; we just return null.
  try {
    pm.registerProvider('lmstudio', {
      baseUrl: process.env.LMSTUDIO_URL || 'http://localhost:1234',
      apiKey: process.env.LMSTUDIO_KEY || '',
    });
  } catch (_) { /* ignore — provider may already be registered */ }

  const callWith = async (m) => {
    try {
      const res = await pm.call('lmstudio', messages, m, 400);
      if (res && res.status === 'success' && res.content) {
        const obj = extractFirstJsonObject(res.content);
        return coercePlannerResponse(obj);
      }
      return null;
    } catch (_) {
      return null;
    }
  };

  // Try primary, then fallback, but only if the primary model is different.
  let out = await callWith(model);
  if (!out && fallback && fallback !== model) {
    out = await callWith(fallback);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Plan how to attack a goal.
 *
 * @param {string} goal
 *   The free-form goal string (e.g. "build a Discord bot").
 * @param {object} [context]
 *   Optional knobs:
 *     - count       {number}  Preferred agent count (2-15).  Default 4.
 *     - domain      {string}  One of: auto|build|game|research|audit|data|mobile|web|general.
 *     - model       {string}  LLM model for the planning call.  Optional.
 *     - providerName{string}  LLM provider name.  Default "lmstudio".
 *     - consensus   {boolean} Force consensus layer on/off.  Optional.
 *     - force       {string}  Force a specific approach.  Optional.
 *     - useLlm      {boolean} Set to false to skip the LLM and go straight to heuristic.
 *
 * @returns {Promise<{
 *   approach: string,
 *   reason: string,
 *   params: { count:number, domain:string, model:(string|null), consensus:boolean },
 *   estimatedAgents: number,
 *   estimatedDuration: string,
 *   source: 'llm'|'heuristic',
 * }>}
 */
async function plan(goal, context) {
  const ctx = normalizeContext(context);
  const safeGoal = typeof goal === 'string' ? goal : '';

  // 1. Forced approach short-circuits everything.
  if (ctx.force) {
    return {
      approach: ctx.force,
      reason: `approach forced via context.force = ${ctx.force}`,
      params: {
        count: ctx.count,
        domain: ctx.domain,
        model: ctx.model,
        consensus: ctx.consensus || ctx.force === 'consensus' || ctx.force === 'swarm+consensus',
      },
      estimatedAgents: ctx.force === 'direct' ? 1 : ctx.count,
      estimatedDuration: estimateDuration(ctx.force, ctx.count),
      source: 'forced',
    };
  }

  // 2. Try the LLM (unless explicitly disabled).
  const wantLlm = !context || context.useLlm !== false;
  if (wantLlm) {
    try {
      const llmPlan = await tryLlmPlan(ctx, safeGoal);
      if (llmPlan) {
        // Merge model in if the LLM didn't pick one.
        if (!llmPlan.params.model) llmPlan.params.model = ctx.model;
        // Domain override wins.
        if (ctx.domain && ctx.domain !== 'auto') llmPlan.params.domain = ctx.domain;
        // Count override wins.
        if (ctx.count && ctx.count !== DEFAULT_COUNT) llmPlan.params.count = ctx.count;
        return {
          ...llmPlan,
          estimatedAgents: llmPlan.approach === 'direct' ? 1 : llmPlan.params.count,
          estimatedDuration: estimateDuration(llmPlan.approach, llmPlan.params.count),
          source: 'llm',
        };
      }
    } catch (_err) {
      // LLM blew up — fall through to heuristic.
    }
  }

  // 3. Heuristic fallback.
  return heuristicPlan(safeGoal, ctx);
}

// ---------------------------------------------------------------------------
// Class wrapper
// ---------------------------------------------------------------------------

/**
 * Stateful planner with a small in-memory history of recent plans.
 * Useful for the webui dashboard / debugging.
 *
 * @example
 *   const p = new Planner({ domain: 'build' });
 *   const out = await p.plan('build a Discord bot');
 *   console.log(out.approach);   // 'swarm'
 */
class Planner {
  /**
   * @param {object} [opts]
   * @param {string} [opts.providerName]
   * @param {string} [opts.model]
   * @param {number} [opts.historyLimit]  Max remembered plans.  Default 32.
   */
  constructor(opts = {}) {
    this.providerName = opts.providerName || DEFAULT_PROVIDER;
    this.model = opts.model || DEFAULT_MODEL;
    this.historyLimit = opts.historyLimit || 32;
    this._history = [];
  }

  /**
   * Run `plan()` and remember the result.
   *
   * @param {string} goal
   * @param {object} [context]
   * @returns {Promise<object>}
   */
  async plan(goal, context = {}) {
    const merged = { ...context, providerName: this.providerName, model: context.model || this.model };
    const out = await plan(goal, merged);
    this._history.push({ at: new Date().toISOString(), goal, plan: out });
    if (this._history.length > this.historyLimit) {
      this._history = this._history.slice(-this.historyLimit);
    }
    return out;
  }

  /** Read-only snapshot of recent plans. */
  history() {
    return JSON.parse(JSON.stringify(this._history));
  }

  /** Clear the in-memory history. */
  clearHistory() {
    this._history = [];
  }
}

module.exports = {
  plan,
  Planner,
  __version,
  HEURISTIC_RULES,
  VALID_DOMAINS,
  APPROACHES,
};
