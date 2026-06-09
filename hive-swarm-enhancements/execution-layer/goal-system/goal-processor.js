/**
 * @file goal-processor.js
 * @description Take a free-form goal string and turn it into a saved Goal with
 * a structured task breakdown — ported from the agnt `GoalProcessor.js` (402 lines).
 *
 * The agnt reference implementation does this:
 *   1. `_analyzeGoal(goalText)` — call the LLM to produce {title, priority,
 *      estimatedDuration, successCriteria, taskBreakdown}.
 *   2. `GoalModel.create(...)` — persist the goal row (SQLite).
 *   3. `_createTasks(goalId, taskBreakdown)` — create one TaskModel row per
 *      subtask.
 *
 * We port the *pattern*, not the lines:
 *  - Persistence is JSON files in `storage/goals/<goalId>.json` (via
 *    `./goal-store.js`), not SQLite.
 *  - The LLM call goes through the shared `ProviderManager`
 *    (`../../../providers/provider-adapter.js`).
 *  - Heuristic fallback: if the LLM is unreachable or returns garbage, we
 *    split the goal on sentence / ` and ` / comma boundaries and assign
 *    roles cyclically.
 *  - Every step is logged via the same `build-logs/decomposer.log` pattern
 *    used by `core/goal-decomposer.js`, so audit trails stay consistent.
 *  - All public methods are safe — they never throw. Errors are returned in
 *    the result object.
 *
 * Exports:
 *  - `GoalProcessor` — class
 *  - `processGoal(goalText, options)` — top-level async helper
 *  - `__version`
 *
 * @author Hive Swarm (sub-agent HARVEST-1, ported from agnt)
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { GoalStore, __version: STORE_VERSION } = require('./goal-store');

// ---------------------------------------------------------------------------
// Provider wiring — mirror the pattern from core/goal-decomposer.js.
// ---------------------------------------------------------------------------

const PROVIDER_ADAPTER_PATH = path.resolve(
  __dirname, '..', '..', '..', 'providers', 'provider-adapter.js'
);

let ProviderManager = null;
try {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  ({ ProviderManager } = require(PROVIDER_ADAPTER_PATH));
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn(
    `[goal-processor] WARN: provider-adapter not loadable from ` +
    `${PROVIDER_ADAPTER_PATH}: ${err.message}`
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __version = '1.0.0';

const DEFAULT_PROVIDER = 'lmstudio';
const DEFAULT_MODEL = 'qwen3.6-35b-a3b';
const FALLBACK_MODEL = 'glm-5';
const LLM_MAX_TOKENS = 1500;
const LLM_TEMPERATURE = 0.4; // lower than decomposer — we want structure

const LOG_DIR = path.resolve(__dirname, '..', '..', 'build-logs');
const LOG_FILE = path.join(LOG_DIR, 'goal-processor.log');

const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/** Default available tool list. Matches the built-in task executor in agnt. */
const DEFAULT_TOOL_LIBRARY = Object.freeze([
  'web_search', 'web_scrape', 'execute_javascript', 'file_operations',
  'send_email', 'generate_with_ai_llm', 'gmail_api', 'google_calendar',
  'google_drive', 'slack_api', 'github_api', 'notion_api', 'general',
]);

/** Roles cycled through in the heuristic fallback (matches core/). */
const FALLBACK_ROLES = Object.freeze([
  'researcher', 'planner', 'implementer', 'reviewer', 'qa',
]);

// ---------------------------------------------------------------------------
// Logging — never throws.
// ---------------------------------------------------------------------------

function logLine(line) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, 'utf8');
  } catch (_) { /* swallow */ }
}

// ---------------------------------------------------------------------------
// Options normalization
// ---------------------------------------------------------------------------

/**
 * Coerce an options bag into a canonical shape. Mirrors the
 * `normalizeOptions` discipline in core/goal-decomposer.js.
 * @param {object} [options]
 * @returns {object} normalized
 */
function normalizeOptions(options = {}) {
  const o = options || {};
  return {
    provider: typeof o.provider === 'string' ? o.provider : DEFAULT_PROVIDER,
    model: typeof o.model === 'string' ? o.model : DEFAULT_MODEL,
    useLlm: o.useLlm !== false,                 // default true
    domain: typeof o.domain === 'string' ? o.domain : 'auto',
    toolLibrary: Array.isArray(o.toolLibrary) && o.toolLibrary.length
      ? o.toolLibrary
      : DEFAULT_TOOL_LIBRARY,
    store: o.store instanceof GoalStore ? o.store : null,
    // Optional: pre-existing goalId (if the caller wants to attach the
    // analysis to an existing goal). Otherwise we mint a fresh id.
    goalId: typeof o.goalId === 'string' ? o.goalId : null,
    // Optional: caller-supplied priority override. We let the LLM pick
    // otherwise.
    priority: VALID_PRIORITIES.includes(o.priority) ? o.priority : null,
  };
}

// ---------------------------------------------------------------------------
// LLM plumbing
// ---------------------------------------------------------------------------

/**
 * Call the ProviderManager. Returns `{ ok, content, error }` — never throws.
 * @param {object} options
 * @param {Array<{role:string, content:string}>} messages
 * @returns {Promise<{ok:boolean, content:string, error?:string}>}
 */
async function callLlm(options, messages) {
  if (!ProviderManager) {
    return { ok: false, error: 'ProviderManager unavailable' };
  }
  try {
    const mgr = new ProviderManager();
    // We don't register any provider here — the manager is expected to
    // self-bootstrap from environment / config. If nothing is registered,
    // `.call()` resolves with a soft error and we fall back gracefully.
    const result = await mgr.call(options.provider, messages, options.model, LLM_MAX_TOKENS);
    if (result && result.status === 'success' && result.content) {
      return { ok: true, content: result.content };
    }
    return { ok: false, error: (result && result.error) || 'unknown LLM error' };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

// ---------------------------------------------------------------------------
// JSON extraction — defensive parsing of LLM output
// ---------------------------------------------------------------------------

/**
 * Extract the first balanced JSON object from a string. Handles markdown
 * fences, stray prose, and nested braces. Mirrors the helper in
 * `core/goal-decomposer.js`.
 * @param {string} text
 * @returns {string|null}
 */
function extractFirstJsonObject(text) {
  if (typeof text !== 'string' || !text) return null;
  let s = text.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\u2060]/g, '');
  s = s.replace(/```(?:json|JSON)?\s*/g, '').replace(/```/g, '');

  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') {
      if (start === -1) start = i;
      depth++;
      continue;
    }
    if (ch === '}') {
      if (depth === 0) continue;
      depth--;
      if (depth === 0 && start !== -1) return s.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Parse the LLM's response into our analysis shape, validating the schema.
 * @param {string} raw
 * @param {string[]} toolLibrary
 * @returns {object|null} analysis or null if unparseable
 */
function parseAnalysis(raw, toolLibrary) {
  const json = extractFirstJsonObject(raw);
  if (!json) return null;
  let parsed;
  try { parsed = JSON.parse(json); } catch (_) { return null; }
  if (!parsed || typeof parsed !== 'object') return null;
  if (typeof parsed.title !== 'string') return null;
  if (!Array.isArray(parsed.taskBreakdown)) return null;

  // Normalize tasks.
  const tasks = parsed.taskBreakdown.map((t, i) => {
    const title = (typeof t.title === 'string' && t.title.trim())
      ? t.title.trim().slice(0, 80)
      : `Task ${i + 1}`;
    const description = (typeof t.description === 'string' && t.description.trim())
      ? t.description.trim()
      : title;
    const requiredTools = Array.isArray(t.requiredTools)
      ? t.requiredTools
        .map((x) => (typeof x === 'string' ? x.trim() : ''))
        .filter((x) => x && toolLibrary.includes(x))
      : [];
    const dependsOn = Array.isArray(t.dependencies)
      ? t.dependencies.filter((x) => typeof x === 'string')
      : Array.isArray(t.dependsOn)
        ? t.dependsOn.filter((x) => typeof x === 'string')
        : [];
    return {
      title,
      description,
      requiredTools: requiredTools.length ? requiredTools : ['general'],
      dependsOn,
      orderIndex: Number.isFinite(t.orderIndex) ? t.orderIndex : i,
    };
  });

  return {
    title: parsed.title.trim().slice(0, 80),
    priority: VALID_PRIORITIES.includes(parsed.priority) ? parsed.priority : 'medium',
    estimatedDuration: Number.isFinite(parsed.estimatedDuration)
      ? parsed.estimatedDuration
      : Math.max(30, tasks.length * 30),
    successCriteria: {
      deliverables: Array.isArray(parsed.successCriteria && parsed.successCriteria.deliverables)
        ? parsed.successCriteria.deliverables.filter((x) => typeof x === 'string')
        : ['Complete the requested goal'],
      qualityChecks: Array.isArray(parsed.successCriteria && parsed.successCriteria.qualityChecks)
        ? parsed.successCriteria.qualityChecks.filter((x) => typeof x === 'string')
        : ['Output meets requirements'],
    },
    tasks,
    source: 'llm',
  };
}

// ---------------------------------------------------------------------------
// Heuristic analysis — when the LLM is down
// ---------------------------------------------------------------------------

/**
 * Build an analysis from the raw goal text alone. Mirrors the
 * `_createFallbackAnalysis` logic in agnt's `GoalProcessor.js`, but with
 * richer splitting (sentence, ` and `, comma, semicolon).
 *
 * @param {string} goalText
 * @param {string[]} toolLibrary
 * @returns {object} analysis
 */
function heuristicAnalysis(goalText, toolLibrary) {
  const safe = (goalText || '').trim() || '(untitled goal)';
  const title = safe.length > 60 ? safe.slice(0, 57) + '...' : safe;
  const isSimple = safe.length < 80 && !/ and |,|;|\.|\?/.test(safe);

  if (isSimple) {
    return {
      title,
      priority: 'medium',
      estimatedDuration: 30,
      successCriteria: {
        deliverables: ['Complete the requested task'],
        qualityChecks: ['Output meets requirements'],
      },
      tasks: [
        {
          title: title.length > 50 ? safe.slice(0, 47) + '...' : title,
          description: safe,
          requiredTools: ['general'],
          dependsOn: [],
          orderIndex: 0,
        },
      ],
      source: 'heuristic',
    };
  }

  // Split on sentence boundaries first, then on ` and `, then commas.
  let fragments = safe
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (fragments.length < 2) {
    fragments = safe.split(/\s+and\s+|\s*,\s+|\s*;\s+/).map((s) => s.trim()).filter(Boolean);
  }
  if (fragments.length < 2) fragments = [safe]; // give up, treat as one

  const tasks = fragments.map((frag, i) => {
    const words = frag.split(/\s+/).slice(0, 8).join(' ');
    const role = FALLBACK_ROLES[i % FALLBACK_ROLES.length];
    return {
      title: `${role}: ${words.length > 40 ? words.slice(0, 37) + '...' : words}`,
      description: frag,
      requiredTools: ['general'],
      dependsOn: i === 0 ? [] : [String(i - 1)],
      orderIndex: i,
    };
  });

  return {
    title,
    priority: 'medium',
    estimatedDuration: Math.max(30, tasks.length * 30),
    successCriteria: {
      deliverables: tasks.map((t) => t.title),
      qualityChecks: ['All tasks completed successfully'],
    },
    tasks,
    source: 'heuristic',
  };
}

// ---------------------------------------------------------------------------
// Prompt building
// ---------------------------------------------------------------------------

/**
 * Build the LLM messages for goal analysis. Stays in the same family as
 * the agnt prompt, but trimmed for our smaller tool library and
 * CommonJS / no-toolLibrary style.
 * @param {string} goalText
 * @param {object} options
 * @returns {Array<{role:string, content:string}>}
 */
function buildAnalysisPrompt(goalText, options) {
  const tools = options.toolLibrary.join(', ');
  const system = [
    'You are the Hive Swarm goal-processor.',
    'Your job: take a high-level GOAL and break it into a small set of',
    'ordered, self-contained tasks that downstream agents can execute.',
    'You MUST reply with valid JSON only. No prose, no markdown fences,',
    'no commentary — one JSON object, nothing else.',
  ].join(' ');

  const user = [
    `GOAL: ${(goalText || '').trim().slice(0, 4000) || '(no goal supplied)'}`,
    '',
    `DOMAIN: ${options.domain}`,
    `AVAILABLE TOOLS: ${tools}`,
    '',
    'OUTPUT SCHEMA (return ONLY this JSON shape):',
    '{',
    '  "title": "Short descriptive title (<= 60 chars)",',
    '  "priority": "low|medium|high|urgent",',
    '  "estimatedDuration": 120,',
    '  "successCriteria": {',
    '    "deliverables": ["list", "of", "expected", "outputs"],',
    '    "qualityChecks": ["list", "of", "validation", "criteria"]',
    '  },',
    '  "taskBreakdown": [',
    '    {',
    '      "title": "Task name (<= 50 chars)",',
    '      "description": "What needs to be done, self-contained.",',
    '      "requiredTools": ["tool-from-available-list"],',
    '      "dependencies": [],',
    '      "orderIndex": 0',
    '    }',
    '  ]',
    '}',
    '',
    'RULES:',
    '- Use the MINIMUM number of tasks needed (1-7).',
    '- Each task must be specific and self-contained — an agent reading',
    '  it cold should know exactly what to do.',
    '- `requiredTools` MUST only contain names from AVAILABLE TOOLS above.',
    '- `dependencies` is a list of orderIndex integers for tasks that must',
    '  finish first. Keep it sparse; default to [].',
    '- Do not wrap output in ```json``` or any fences.',
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

// ---------------------------------------------------------------------------
// GoalProcessor
// ---------------------------------------------------------------------------

/**
 * @class GoalProcessor
 * @classdesc Turn a free-form goal into a saved, task-decomposed Goal record.
 *
 * Stateless and safe — every method is non-throwing. The only state is
 * an optional {@link GoalStore} instance provided via the constructor.
 */
class GoalProcessor {
  /**
   * @param {object} [options]
   * @param {GoalStore} [options.store] - Storage backend. If omitted, a
   *   default GoalStore rooted at the conventional storage path is used.
   * @param {string} [options.defaultProvider]
   * @param {string} [options.defaultModel]
   */
  constructor(options = {}) {
    this.store = options.store instanceof GoalStore
      ? options.store
      : new GoalStore();
    this.defaultProvider = options.defaultProvider || DEFAULT_PROVIDER;
    this.defaultModel = options.defaultModel || DEFAULT_MODEL;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Process a goal end-to-end. Returns the persisted goal document.
   *
   * @param {string} goalText
   * @param {object} [options]
   * @param {string} [options.provider]  - LLM provider key (default 'lmstudio')
   * @param {string} [options.model]     - LLM model id
   * @param {boolean} [options.useLlm=true] - Set false to force heuristic
   * @param {string} [options.domain='auto']
   * @param {string[]} [options.toolLibrary]
   * @returns {Promise<{
   *   ok:boolean,
   *   goal?:object,
   *   error?:string,
   *   meta?:{source:string, provider:string, model:string, durationMs:number}
   * }>}
   */
  async processGoal(goalText, options = {}) {
    const t0 = Date.now();
    const opts = normalizeOptions({
      provider: options.provider || this.defaultProvider,
      model: options.model || this.defaultModel,
      useLlm: options.useLlm !== false,
      domain: options.domain,
      toolLibrary: options.toolLibrary,
      store: options.store || this.store,
      goalId: options.goalId,
      priority: options.priority,
    });

    logLine(`processGoal: ${(goalText || '').slice(0, 80).replace(/\n/g, ' ')}`);

    if (typeof goalText !== 'string' || !goalText.trim()) {
      return { ok: false, error: 'processGoal: goalText is required' };
    }

    // 1. Analyze.
    let analysis;
    let source = 'heuristic';
    if (opts.useLlm) {
      const llmResult = await this._analyzeWithLlm(goalText, opts);
      if (llmResult.ok) {
        analysis = llmResult.analysis;
        source = 'llm';
      } else {
        logLine(`LLM analysis failed: ${llmResult.error} — using heuristic`);
      }
    }
    if (!analysis) {
      analysis = heuristicAnalysis(goalText, opts.toolLibrary);
    }
    if (opts.priority) analysis.priority = opts.priority;

    // 2. Persist as a goal.
    const goalInput = {
      id: opts.goalId || undefined,
      title: analysis.title,
      description: goalText,
      priority: analysis.priority,
      status: 'pending',
      successCriteria: analysis.successCriteria,
      estimatedDuration: analysis.estimatedDuration,
      tasks: analysis.tasks.map((t, i) => ({
        title: t.title,
        description: t.description,
        requiredTools: t.requiredTools,
        dependsOn: t.dependsOn,
        orderIndex: Number.isFinite(t.orderIndex) ? t.orderIndex : i,
      })),
      meta: {
        source,
        domain: opts.domain,
        model: opts.model,
        provider: opts.provider,
        processedAt: new Date().toISOString(),
      },
    };

    const created = this.store.createGoal(goalInput);
    if (!created.ok) {
      logLine(`createGoal failed: ${created.error}`);
      return { ok: false, error: created.error, meta: this._meta(t0, source, opts) };
    }

    logLine(
      `goal ${created.goal.id} created (source=${source}, ` +
      `tasks=${created.goal.tasks.length}, duration=${Date.now() - t0}ms)`
    );

    return {
      ok: true,
      goal: created.goal,
      meta: this._meta(t0, source, opts),
    };
  }

  /**
   * Lightweight heuristic-only processor. Same return shape as processGoal
   * but with `useLlm=false` baked in. Useful for offline / test paths.
   * @param {string} goalText
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async processGoalHeuristic(goalText, options = {}) {
    return this.processGoal(goalText, { ...options, useLlm: false });
  }

  /**
   * Check whether a goal is complete (all tasks `completed`).
   * Mirrors agnt's `validateGoalCompletion`.
   * @param {string} goalId
   * @returns {boolean}
   */
  isGoalComplete(goalId) {
    const goal = this.store.getGoal(goalId);
    if (!goal || !goal.tasks || !goal.tasks.length) return false;
    return goal.tasks.every((t) => t.status === 'completed');
  }

  /**
   * Mark a goal `completed` if all its tasks are completed. No-op otherwise.
   * @param {string} goalId
   * @returns {{ok:boolean, completed:boolean}}
   */
  validateGoalCompletion(goalId) {
    if (!this.isGoalComplete(goalId)) return { ok: true, completed: false };
    return this.store.updateGoal(goalId, { status: 'completed' });
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * @private
   */
  _meta(t0, source, opts) {
    return {
      source,
      provider: opts.provider,
      model: opts.model,
      durationMs: Date.now() - t0,
    };
  }

  /**
   * Run the LLM analysis pass. Returns `{ ok, analysis, error }`.
   * @private
   */
  async _analyzeWithLlm(goalText, opts) {
    const messages = buildAnalysisPrompt(goalText, opts);
    const llm = await callLlm(opts, messages);
    if (!llm.ok) return { ok: false, error: llm.error };
    const analysis = parseAnalysis(llm.content, opts.toolLibrary);
    if (!analysis) return { ok: false, error: 'failed to parse LLM analysis' };
    return { ok: true, analysis };
  }
}

// ---------------------------------------------------------------------------
// Module-level convenience function
// ---------------------------------------------------------------------------

/**
 * Process a goal using a default-configured {@link GoalProcessor}.
 * @param {string} goalText
 * @param {object} [options]  - Forwarded to `GoalProcessor#processGoal`.
 * @returns {Promise<object>}
 */
async function processGoal(goalText, options = {}) {
  const processor = new GoalProcessor(options.store ? { store: options.store } : undefined);
  return processor.processGoal(goalText, options);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  GoalProcessor,
  processGoal,
  __version,
  // Re-exports for convenience and test parity.
  heuristicAnalysis,
  parseAnalysis,
  buildAnalysisPrompt,
  // For tests / introspection.
  constants: {
    DEFAULT_PROVIDER,
    DEFAULT_MODEL,
    FALLBACK_MODEL,
    DEFAULT_TOOL_LIBRARY,
    VALID_PRIORITIES,
  },
};
