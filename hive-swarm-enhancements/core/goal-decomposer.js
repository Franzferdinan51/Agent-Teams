/**
 * @file goal-decomposer.js
 * @description Native Hive Swarm goal-decomposer.
 *
 * Takes a high-level goal string and, via the shared `ProviderManager`
 * (see `../../providers/provider-adapter.js`), asks an LLM to break it
 * down into 3-7 parallel, role-assigned subtasks. The resulting plan is
 * saved as a timestamped JSON file under
 * `hive-swarm-enhancements/build-logs/decompositions/` for audit /
 * replay.
 *
 * Design goals:
 *  - **CommonJS** to match the rest of the project (`module.exports`).
 *  - **Never crash** — if the LLM call fails or returns garbage, fall
 *    back to a heuristic best-effort decomposition so the swarm can
 *    still move forward.
 *  - **Domain-aware** — the prompt is biased by `options.domain`
 *    ('build' | 'game' | 'research' | 'audit' | 'data' | 'mobile' |
 *    'auto') to elicit realistic role assignments.
 *  - **Auditable** — every decomposition (success or fallback) is
 *    written to disk with a stable timestamp filename.
 *
 * Exports:
 *  - `decompose(goal, options)` — primary async function
 *  - `GoalDecomposer`            — class wrapper (for stateful use
 *                                  with a pre-configured provider)
 *  - `DOMAIN_HINTS`              — exported for tests / introspection
 *  - `__version`                 — module version string
 *
 * @author Hive Swarm (overnight build, sub-agent 1/3)
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Provider wiring
// ---------------------------------------------------------------------------
//
// The shared `ProviderManager` lives in `providers/provider-adapter.js`
// (sibling of `hive-swarm-enhancements/`).  From this file the relative
// path is `../../providers/provider-adapter.js`.
//
// We resolve it once at module load.  If the file is missing we record
// the failure but still allow the module to export — `decompose()`
// will return a heuristic fallback and the audit log will show why.
const PROVIDER_ADAPTER_PATH = path.resolve(
  __dirname, '..', '..', 'providers', 'provider-adapter.js'
);

let ProviderManager = null;
try {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  ({ ProviderManager } = require(PROVIDER_ADAPTER_PATH));
} catch (err) {
  // Swallow at load time — runtime will fall back to heuristic mode.
  // We deliberately do NOT throw so that downstream tooling
  // (CLI, dispatcher) can still require this file.
  // eslint-disable-next-line no-console
  console.warn(
    `[goal-decomposer] WARN: could not load provider-adapter from ` +
    `${PROVIDER_ADAPTER_PATH}: ${err.message}`
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Library version. Exposed for downstream tools / audit logs. */
const __version = '1.0.0';

/** Default primary model. Matches the 35b profile in provider-adapter. */
const DEFAULT_MODEL = 'qwen3.6-35b-a3b';

/** Fallback model if primary fails. */
const FALLBACK_MODEL = 'glm-5';

/** Default LM Studio provider name (matches council-server.js). */
const DEFAULT_PROVIDER = 'lmstudio';

/**
 * Domain → role hint map.
 *
 * The LLM prompt is seeded with one of these "decomposition hints"
 * describing which kinds of parallel roles make sense for the domain.
 * The LLM is *free* to invent more / different roles, but this primes
 * the output toward sensible answers.
 */
const DOMAIN_HINTS = Object.freeze({
  auto: {
    label: 'auto',
    roles: ['planner', 'researcher', 'implementer', 'reviewer', 'qa'],
    guidance:
      'Detect the most likely domain from the goal and decompose ' +
      'accordingly. Always include a final integration/QA subtask.',
  },
  build: {
    label: 'build',
    roles: ['front-end', 'back-end', 'database', 'devops', 'qa', 'docs'],
    guidance:
      'Split the build across front-end, back-end, database, and ' +
      'devops tracks. Include a docs subtask and a final integration ' +
      'verification subtask.',
  },
  game: {
    label: 'game',
    roles: ['gameplay', 'engine', 'art', 'audio', 'ui', 'qa'],
    guidance:
      'Decompose into gameplay mechanics, engine/systems, art/' +
      'visuals, audio, UI/HUD, and a final playtest subtask. ' +
      'Favor tracks that can be built in parallel.',
  },
  research: {
    label: 'research',
    roles: ['scout', 'analyst', 'synthesizer', 'critic', 'writer'],
    guidance:
      'Decompose into: source scouting, deep analysis, cross-source ' +
      'synthesis, adversarial critique, and a final write-up. ' +
      'Scout/analysis can run in parallel; synthesis depends on both.',
  },
  audit: {
    label: 'audit',
    roles: ['security', 'performance', 'quality', 'compliance', 'reporter'],
    guidance:
      'Decompose into security review, performance review, code ' +
      'quality review, compliance/policy review, and a final report ' +
      'synthesis. The reporter subtask depends on all four.',
  },
  data: {
    label: 'data',
    roles: ['ingest', 'clean', 'analyze', 'visualize', 'report'],
    guidance:
      'Decompose into data ingestion, cleaning/normalization, ' +
      'analysis, visualization, and a final report. Ingest and ' +
      'clean can run in parallel; analyze depends on clean.',
  },
  mobile: {
    label: 'mobile',
    roles: ['ios', 'android', 'shared-logic', 'ux', 'qa'],
    guidance:
      'Decompose into iOS, Android, and shared logic/SDK tracks, ' +
      'plus a UX/design pass and a final device QA subtask. iOS and ' +
      'Android can be built fully in parallel.',
  },
});

/** Valid domain keys (frozen list, used for input validation). */
const VALID_DOMAINS = Object.freeze(Object.keys(DOMAIN_HINTS));

/** Hard cap on the number of subtasks (matches `options.count` upper). */
const MAX_SUBTASKS = 15;

/** Hard floor on subtasks (LLM will be told to produce at least this). */
const MIN_SUBTASKS = 3;

/**
 * Fallback role cycle used by the heuristic when the LLM is unavailable.
 * Roles cycle so a 5-task fallback is still diverse.
 */
const FALLBACK_ROLES = Object.freeze([
  'researcher', 'planner', 'implementer', 'reviewer', 'qa',
]);

// ---------------------------------------------------------------------------
// Module-level logger — never throws, always returns a string.
// ---------------------------------------------------------------------------

/**
 * Append a single line to the build log. Best-effort: silently no-ops on
 * filesystem failure so the caller can never crash.
 *
 * @param {string} line - Line to append (no trailing newline required).
 * @param {string} [logDir] - Directory to write into. Defaults to
 *   `hive-swarm-enhancements/build-logs/`.
 * @returns {void}
 */
function logLine(line, logDir) {
  try {
    const dir = logDir || path.resolve(__dirname, '..', 'build-logs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(
      path.join(dir, 'decomposer.log'),
      `[${new Date().toISOString()}] ${line}\n`,
      'utf8'
    );
  } catch (_) {
    // Swallow — logging must never crash the caller.
  }
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

/**
 * Build the system+user message pair sent to the LLM.
 *
 * The user message is a strict JSON-output demand wrapped around the
 * goal and the domain hint. We do *not* embed the goal in the system
 * message because some local models (qwen3.6 family included) only
 * pay attention to the last user turn.
 *
 * @param {string} goal - High-level goal text.
 * @param {object} options - Normalized options (see `normalizeOptions`).
 * @returns {Array<{role:string, content:string}>} messages
 */
function buildPrompt(goal, options) {
  const domain = DOMAIN_HINTS[options.domain] || DOMAIN_HINTS.auto;
  const count = options.count;
  const safeGoal = (goal || '').trim().slice(0, 4000) || '(no goal supplied)';

  const system = [
    'You are the Hive Swarm goal-decomposer.',
    'Your job: take a high-level GOAL and break it into parallel,',
    'role-assigned subtasks that can be executed by independent agents.',
    'You MUST reply with valid JSON only. No prose, no markdown, no',
    'code fences — just one JSON object.',
  ].join(' ');

  const user = [
    `GOAL: ${safeGoal}`,
    '',
    `DOMAIN: ${domain.label}`,
    `DOMAIN HINT: ${domain.guidance}`,
    `SUGGESTED ROLES: ${domain.roles.join(', ')}`,
    `TARGET SUBTASK COUNT: ${count} (hard range: ${MIN_SUBTASKS}-${MAX_SUBTASKS})`,
    '',
    'OUTPUT SCHEMA (strict, return ONLY this JSON shape):',
    '{',
    '  "subtasks": [',
    '    {',
    '      "id": "t1",',
    '      "title": "Short imperative title (<= 8 words)",',
    '      "prompt": "Self-contained instruction an agent can execute alone. Include the goal context.",',
    '      "role": "one of the suggested roles or a close variant",',
    '      "depends_on": []',
    '    }',
    '    ...',
    '  ]',
    '}',
    '',
    'RULES:',
    `- Produce between ${MIN_SUBTASKS} and ${Math.max(count, MIN_SUBTASKS)} subtasks.`,
    '- Subtasks should be as parallel as possible.',
    '- Use "depends_on" with a list of subtask ids (e.g. ["t1"]) only when a subtask truly cannot start until another finishes.',
    '- First subtask(s) should have empty depends_on.',
    '- Final subtask should usually be a synthesis / integration / QA step that depends on the earlier work.',
    '- "prompt" must be self-contained — an agent reading it cold should know what to do without seeing this prompt.',
    '- Do not wrap output in ```json``` or any other fences.',
    '- Do not include commentary before or after the JSON.',
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

// ---------------------------------------------------------------------------
// Response parsing — handles the full zoo of LLM output shapes.
// ---------------------------------------------------------------------------

/**
 * Extract the first JSON object from a string. Tolerant of:
 *  - leading/trailing whitespace
 *  - ```json ... ``` fences
 *  - stray prose before/after the JSON
 *  - nested braces (counts depth)
 *
 * @param {string} text - Raw LLM response.
 * @returns {string|null} the first balanced JSON object substring, or null.
 */
function extractFirstJsonObject(text) {
  if (typeof text !== 'string' || !text) return null;

  // Strip BOM and zero-width chars.
  let s = text.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\u2060]/g, '');

  // Strip code fences: ```json ... ``` or ``` ... ```
  s = s.replace(/```(?:json|JSON)?\s*/g, '').replace(/```/g, '');

  // Find the first '{' that starts a balanced object.
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        return s.slice(start, i + 1);
      }
      if (depth < 0) {
        // Stray '}' before any object — restart search from next '{'.
        depth = 0;
        start = -1;
      }
    }
  }
  return null;
}

/**
 * Coerce a parsed `subtasks` value into the canonical shape:
 *  [{ id, title, prompt, role, depends_on: string[] }, ...]
 *
 * Drops anything that isn't a usable subtask. Never throws.
 *
 * @param {*} raw - The raw `subtasks` field from parsed JSON.
 * @returns {Array<object>} normalized subtasks (may be empty).
 */
function normalizeSubtasks(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seenIds = new Set();

  raw.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;

    const title = String(
      item.title || item.name || item.task || `Subtask ${idx + 1}`
    ).slice(0, 200);

    const prompt = String(
      item.prompt || item.description || item.desc || item.instruction || title
    ).slice(0, 4000);

    const role = String(
      item.role || item.agent || 'generalist'
    ).toLowerCase().slice(0, 64) || 'generalist';

    // Id: keep if it looks sane, else mint one.
    let id = String(item.id || '').trim();
    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(id)) {
      id = `t${idx + 1}`;
    }
    // Guarantee uniqueness.
    let unique = id;
    let n = 2;
    while (seenIds.has(unique)) {
      unique = `${id}_${n++}`;
    }
    seenIds.add(unique);

    // depends_on: array of strings, referencing earlier ids only.
    let deps = [];
    if (Array.isArray(item.depends_on)) {
      deps = item.depends_on
        .map(d => String(d || '').trim())
        .filter(d => /^[a-zA-Z0-9_-]{1,32}$/.test(d) && seenIds.has(d) === false)
        // After we've added this id, "earlier" means: already in seenIds OR
        // refers to an id we'll definitely create. We only allow references
        // to ids we've already finalized, so filter post-hoc below.
        ;
    }
    // Re-filter depends_on: only keep ids that exist in the final set OR
    // are likely siblings. We resolve in a second pass for safety.
    out.push({
      id: unique,
      title,
      prompt,
      role,
      depends_on: deps,
    });
  });

  // Second pass: drop depends_on entries that don't refer to any subtask
  // id in the final list. (Handles LLM-invented ids like "t0" when our
  // list starts at "t1".)
  const allIds = new Set(out.map(t => t.id));
  for (const t of out) {
    t.depends_on = t.depends_on.filter(d => allIds.has(d));
  }

  return out;
}

/**
 * Parse the LLM response text into a `{subtasks: [...]}` object.
 *
 * Tries (in order):
 *   1. direct `JSON.parse(text)`
 *   2. `extractFirstJsonObject(text)` then `JSON.parse`
 *   3. regex fallback for `{"subtasks":[...]}` anywhere in the string
 *
 * Returns `{ ok: true, subtasks }` on success, `{ ok: false, error }`
 * on failure. Never throws.
 *
 * @param {string} text - Raw LLM response.
 * @returns {{ok:boolean, subtasks?:Array, error?:string}}
 */
function parseDecompositionResponse(text) {
  const tried = [];

  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: 'empty LLM response' };
  }

  // 1. Direct parse.
  tried.push('direct');
  try {
    const obj = JSON.parse(text);
    if (obj && Array.isArray(obj.subtasks)) {
      return { ok: true, subtasks: normalizeSubtasks(obj.subtasks) };
    }
  } catch (_) { /* fall through */ }

  // 2. Extract first balanced JSON object.
  tried.push('balanced-extract');
  const candidate = extractFirstJsonObject(text);
  if (candidate) {
    try {
      const obj = JSON.parse(candidate);
      if (obj && Array.isArray(obj.subtasks)) {
        return { ok: true, subtasks: normalizeSubtasks(obj.subtasks) };
      }
    } catch (_) { /* fall through */ }
  }

  // 3. Regex rescue — find a {"subtasks": [...]} block.
  tried.push('regex');
  const m = text.match(/\{\s*"subtasks"\s*:\s*\[[\s\S]*?\]\s*\}/);
  if (m) {
    try {
      const obj = JSON.parse(m[0]);
      if (obj && Array.isArray(obj.subtasks)) {
        return { ok: true, subtasks: normalizeSubtasks(obj.subtasks) };
      }
    } catch (_) { /* fall through */ }
  }

  return {
    ok: false,
    error: `could not parse JSON from LLM response (tried: ${tried.join(', ')})`,
  };
}

// ---------------------------------------------------------------------------
// Heuristic fallback — used when the LLM is unavailable or returns junk.
// ---------------------------------------------------------------------------

/**
 * Build a best-effort decomposition locally, without an LLM call.
 *
 * Splits the goal by sentence boundaries, distributes roles from the
 * domain hint, and chains a final synthesis subtask.
 *
 * @param {string} goal - The raw goal string.
 * @param {object} options - Normalized options.
 * @returns {Array<object>} normalized subtasks
 */
function heuristicDecompose(goal, options) {
  const domain = DOMAIN_HINTS[options.domain] || DOMAIN_HINTS.auto;
  const target = Math.max(
    MIN_SUBTASKS,
    Math.min(MAX_SUBTASKS, options.count || 5)
  );
  const safeGoal = (goal || '').trim() || 'Achieve the stated objective.';

  // Split into natural chunks: sentences, then "and", then comma, then
  // a single chunk. Take the first `target-1` so we can append a
  // synthesis task at the end.
  const sentences = safeGoal
    .split(/(?<=[.!?])\s+|\s+\band\b\s+|\s*,\s*/i)
    .map(s => s.trim())
    .filter(Boolean);

  const chunks = sentences.length > 1
    ? sentences.slice(0, target - 1)
    : [safeGoal];

  const roles = domain.roles.length ? domain.roles : FALLBACK_ROLES;

  const subtasks = chunks.map((chunk, idx) => {
    const role = roles[idx % roles.length] || FALLBACK_ROLES[idx % FALLBACK_ROLES.length];
    return {
      id: `t${idx + 1}`,
      title: capitalizeTitle(chunk.split(/\s+/).slice(0, 7).join(' ')) || `Subtask ${idx + 1}`,
      prompt: [
        `Original goal: ${safeGoal}`,
        '',
        `Your specific task (${role}):`,
        chunk,
        '',
        `Deliverable: a concrete result an integrator can combine with the other ${chunks.length - 1} parallel subtask(s).`,
        `Work in parallel — do not depend on outputs of other subtasks unless absolutely required.`,
      ].join('\n'),
      role,
      depends_on: [],
    };
  });

  // Final synthesis subtask.
  subtasks.push({
    id: `t${subtasks.length + 1}`,
    title: 'Integrate and verify the parallel work',
    prompt: [
      `Original goal: ${safeGoal}`,
      '',
      `Take the outputs of the ${subtasks.length} parallel subtasks above and:`,
      '  1. reconcile any overlaps or conflicts,',
      '  2. produce a single unified deliverable that satisfies the goal,',
      '  3. run a final QA / sanity check,',
      '  4. report back with the integrated result and a short summary.',
    ].join('\n'),
    role: 'integrator',
    depends_on: subtasks.map(s => s.id),
  });

  return subtasks;
}

/**
 * Tiny title-case helper, defensive against non-strings.
 * @param {string} s
 * @returns {string}
 */
function capitalizeTitle(s) {
  if (!s) return '';
  const trimmed = String(s).trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// ---------------------------------------------------------------------------
// Options normalization
// ---------------------------------------------------------------------------

/**
 * Normalize user-supplied options into a known-good shape, applying
 * defaults and clamping. Never throws.
 *
 * @param {object} [opts]
 * @returns {{
 *   count:number, domain:string, model:string, providerName:string,
 *   provider: object|null, saveAudit:boolean, logDir:string,
 *   extra: object
 * }}
 */
function normalizeOptions(opts) {
  const o = (opts && typeof opts === 'object') ? opts : {};

  // domain
  let domain = (typeof o.domain === 'string') ? o.domain.toLowerCase().trim() : 'auto';
  if (!VALID_DOMAINS.includes(domain)) domain = 'auto';

  // count (clamp 3..15)
  let count = Number.isFinite(o.count) ? Math.floor(o.count) : 5;
  if (count < MIN_SUBTASKS) count = MIN_SUBTASKS;
  if (count > MAX_SUBTASKS) count = MAX_SUBTASKS;

  // model
  let model = (typeof o.model === 'string' && o.model.trim())
    ? o.model.trim()
    : DEFAULT_MODEL;

  // provider
  let providerName = (typeof o.providerName === 'string' && o.providerName.trim())
    ? o.providerName.trim()
    : DEFAULT_PROVIDER;

  // provider instance — accept either an already-built ProviderManager
  // (so the caller can share one) or build a fresh one with default
  // env-var wiring.
  let provider = null;
  if (o.provider && typeof o.provider.call === 'function') {
    provider = o.provider;
  } else if (ProviderManager) {
    try {
      provider = new ProviderManager();
      provider.registerProvider(providerName, {
        baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://127.0.0.1:1234/v1',
        apiKey: process.env.LM_STUDIO_API_KEY || '',
        models: [DEFAULT_MODEL, FALLBACK_MODEL],
      });
    } catch (err) {
      logLine(`provider init failed: ${err.message}`);
      provider = null;
    }
  }

  // audit
  const saveAudit = o.saveAudit !== false; // default true
  const logDir = (typeof o.logDir === 'string' && o.logDir.trim())
    ? o.logDir
    : path.resolve(__dirname, '..', 'build-logs');

  return {
    count,
    domain,
    model,
    providerName,
    provider,
    saveAudit,
    logDir,
    extra: o.extra && typeof o.extra === 'object' ? o.extra : {},
  };
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

/**
 * Persist the decomposition plan as a timestamped JSON file. Never
 * throws — failures are logged and swallowed so the caller is not
 * affected.
 *
 * @param {object} plan - The full plan object to write.
 * @param {object} options - Normalized options (uses `logDir`).
 * @returns {string|null} absolute file path on success, null on failure.
 */
function saveAuditFile(plan, options) {
  if (!options.saveAudit) return null;
  try {
    const dir = path.join(options.logDir, 'decompositions');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Filename: <ISO timestamp>-<8-char hash>.json  (sanitized)
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const hash = crypto
      .createHash('sha1')
      .update(JSON.stringify(plan).slice(0, 2000))
      .digest('hex')
      .slice(0, 8);
    const file = path.join(dir, `${ts}-${hash}.json`);
    fs.writeFileSync(file, JSON.stringify(plan, null, 2), 'utf8');
    return file;
  } catch (err) {
    logLine(`audit save failed: ${err.message}`, options.logDir);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core LLM call — with model-level fallback
// ---------------------------------------------------------------------------

/**
 * Call the LLM with the constructed prompt. If the primary model fails
 * (network, timeout, model-not-loaded, etc.), try the fallback model.
 * If both fail, the caller falls back to the heuristic path.
 *
 * @param {object} options - Normalized options.
 * @param {Array} messages - Messages from `buildPrompt`.
 * @returns {Promise<{ok:boolean, content?:string, error?:string, model?:string}>}
 */
async function callLlmWithFallback(options, messages) {
  if (!options.provider) {
    return { ok: false, error: 'no ProviderManager available' };
  }

  const modelsToTry = [options.model, FALLBACK_MODEL]
    .filter((m, i, arr) => m && arr.indexOf(m) === i && m !== options.model || m === options.model);

  // De-dupe while keeping order.
  const tried = [];
  for (const m of [options.model, FALLBACK_MODEL]) {
    if (!m) continue;
    if (tried.includes(m)) continue;
    tried.push(m);
  }

  let lastErr = null;
  for (const model of tried) {
    try {
      logLine(`llm call: provider=${options.providerName} model=${model}`, options.logDir);
      const res = await options.provider.call(
        options.providerName,
        messages,
        model,
        2048
      );
      if (res && res.status === 'success' && typeof res.content === 'string' && res.content.trim()) {
        return { ok: true, content: res.content, model };
      }
      lastErr = (res && res.error) ? res.error : 'unknown LLM error';
      logLine(`llm call failed (model=${model}): ${lastErr}`, options.logDir);
    } catch (err) {
      lastErr = err && err.message ? err.message : String(err);
      logLine(`llm call threw (model=${model}): ${lastErr}`, options.logDir);
    }
  }

  return { ok: false, error: lastErr || 'all models failed' };
}

// ---------------------------------------------------------------------------
// Public API: decompose()
// ---------------------------------------------------------------------------

/**
 * Decompose a high-level goal into a swarm of parallel subtasks.
 *
 * Always resolves. Never throws. On any failure path, returns a
 * best-effort heuristic decomposition tagged with `meta.fallback: true`
 * so downstream consumers can decide whether to trust it.
 *
 * @param {string} goal - The high-level goal.
 * @param {object} [options] - See README / JSDoc on `GoalDecomposer`.
 * @returns {Promise<{
 *   subtasks: Array<{id:string,title:string,prompt:string,role:string,depends_on:string[]}>,
 *   meta: {
 *     domain: string,
 *     count: number,
 *     model: string|null,
 *     providerName: string,
 *     fallback: boolean,
 *     error: string|null,
 *     createdAt: string,
 *     auditFile: string|null,
 *     version: string
 *   }
 * }>}
 */
async function decompose(goal, options) {
  const startedAt = new Date();
  const opts = normalizeOptions(options);

  const plan = {
    goal: typeof goal === 'string' ? goal : '',
    subtasks: [],
    meta: {
      domain: opts.domain,
      count: opts.count,
      model: null,
      providerName: opts.providerName,
      fallback: false,
      error: null,
      createdAt: startedAt.toISOString(),
      auditFile: null,
      version: __version,
    },
  };

  // Edge case: empty goal.
  if (!plan.goal || !plan.goal.trim()) {
    plan.meta.fallback = true;
    plan.meta.error = 'empty goal';
    plan.subtasks = heuristicDecompose(plan.goal, opts);
    plan.meta.auditFile = saveAuditFile(plan, opts);
    return plan;
  }

  // Try the LLM path.
  try {
    const messages = buildPrompt(plan.goal, opts);
    const llmRes = await callLlmWithFallback(opts, messages);

    if (llmRes.ok) {
      plan.meta.model = llmRes.model || opts.model;
      const parsed = parseDecompositionResponse(llmRes.content);

      if (parsed.ok && parsed.subtasks.length >= MIN_SUBTASKS) {
        // Clamp to MAX_SUBTASKS.
        plan.subtasks = parsed.subtasks.slice(0, MAX_SUBTASKS);
      } else if (parsed.ok && parsed.subtasks.length > 0) {
        // LLM produced too few — pad with heuristic extras.
        logLine(
          `LLM returned only ${parsed.subtasks.length} subtasks; padding with heuristic extras`,
          opts.logDir
        );
        const extras = heuristicDecompose(plan.goal, {
          ...opts,
          count: MIN_SUBTASKS - parsed.subtasks.length,
        }).map((s, i) => ({
          ...s,
          id: `t${parsed.subtasks.length + i + 1}`,
          depends_on: [],
        }));
        plan.subtasks = [...parsed.subtasks, ...extras].slice(0, MAX_SUBTASKS);
      } else {
        // LLM responded but output was unparseable.
        plan.meta.fallback = true;
        plan.meta.error = parsed.error || 'unparseable LLM output';
        plan.subtasks = heuristicDecompose(plan.goal, opts);
        logLine(`LLM output unparseable: ${plan.meta.error}`, opts.logDir);
      }
    } else {
      // LLM call failed entirely.
      plan.meta.fallback = true;
      plan.meta.error = llmRes.error || 'LLM call failed';
      plan.subtasks = heuristicDecompose(plan.goal, opts);
      logLine(`LLM call failed, using heuristic: ${plan.meta.error}`, opts.logDir);
    }
  } catch (err) {
    // Belt-and-braces: the inner code shouldn't throw, but if it ever
    // does, we still return a usable plan.
    plan.meta.fallback = true;
    plan.meta.error = err && err.message ? err.message : String(err);
    plan.subtasks = heuristicDecompose(plan.goal, opts);
    logLine(`decompose() caught unexpected error: ${plan.meta.error}`, opts.logDir);
  }

  // Final clamp: never return 0, never return more than MAX_SUBTASKS.
  if (plan.subtasks.length < MIN_SUBTASKS) {
    const extras = heuristicDecompose(plan.goal, {
      ...opts,
      count: MIN_SUBTASKS - plan.subtasks.length,
    });
    plan.subtasks = plan.subtasks.concat(extras).slice(0, MAX_SUBTASKS);
    if (!plan.meta.fallback) {
      // We had partial LLM output but needed to pad.
      plan.meta.fallback = true;
      plan.meta.error = (plan.meta.error || '') + ' [padded to minimum]';
    }
  }
  if (plan.subtasks.length > MAX_SUBTASKS) {
    plan.subtasks = plan.subtasks.slice(0, MAX_SUBTASKS);
  }

  plan.meta.auditFile = saveAuditFile(plan, opts);
  return plan;
}

// ---------------------------------------------------------------------------
// Class wrapper
// ---------------------------------------------------------------------------

/**
 * Stateful wrapper around `decompose()`.
 *
 * Holds a ProviderManager + provider config so repeated calls don't
 * re-register providers. Also keeps a small in-memory history of
 * recent plans (capped at `historyLimit`) for the dashboard / webui.
 *
 * @example
 *   const gd = new GoalDecomposer({ domain: 'build', model: 'qwen3.6-35b-a3b' });
 *   const plan = await gd.decompose('Ship a REST API for todo lists');
 *   console.log(plan.subtasks.length, 'subtasks');
 */
class GoalDecomposer {
  /**
   * @param {object} [opts]
   * @param {string} [opts.domain] - Default domain hint.
   * @param {string} [opts.model]  - Default primary model.
   * @param {string} [opts.providerName] - Provider key.
   * @param {object} [opts.provider] - Pre-built ProviderManager to share.
   * @param {boolean} [opts.saveAudit] - Whether to write audit files (default true).
   * @param {string} [opts.logDir] - Override audit directory.
   * @param {number} [opts.historyLimit] - In-memory history size (default 32).
   */
  constructor(opts = {}) {
    this.opts = normalizeOptions(opts);
    this.history = [];
    this.historyLimit = Number.isFinite(opts.historyLimit)
      ? Math.max(0, Math.floor(opts.historyLimit))
      : 32;
  }

  /**
   * Run a decomposition. Returns the same shape as the standalone
   * `decompose()` function.
   *
   * @param {string} goal
   * @param {object} [callOpts] - Per-call overrides; merged on top of
   *   the instance defaults. `provider` is shared unless overridden.
   * @returns {Promise<object>} plan
   */
  async decompose(goal, callOpts = {}) {
    // Always reuse the instance's provider if the caller didn't supply one.
    const merged = {
      ...this.opts.extra,
      domain: this.opts.domain,
      model: this.opts.model,
      providerName: this.opts.providerName,
      saveAudit: this.opts.saveAudit,
      logDir: this.opts.logDir,
      ...callOpts,
    };
    if (!callOpts.provider && this.opts.provider) {
      merged.provider = this.opts.provider;
    }

    const plan = await decompose(goal, merged);

    if (this.historyLimit > 0) {
      this.history.unshift({
        goal: plan.goal,
        domain: plan.meta.domain,
        count: plan.subtasks.length,
        fallback: plan.meta.fallback,
        at: plan.meta.createdAt,
        auditFile: plan.meta.auditFile,
      });
      if (this.history.length > this.historyLimit) {
        this.history.length = this.historyLimit;
      }
    }
    return plan;
  }

  /**
   * Return a shallow copy of the recent history (most recent first).
   * @returns {Array<object>}
   */
  getHistory() {
    return this.history.slice();
  }

  /**
   * Wipe in-memory history.
   * @returns {void}
   */
  clearHistory() {
    this.history = [];
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  /** Primary entry point. Always resolves. */
  decompose,
  /** Class wrapper with shared provider + in-memory history. */
  GoalDecomposer,
  /** Domain hint table, frozen. Useful for tests / introspection. */
  DOMAIN_HINTS,
  /** Default model constant. */
  DEFAULT_MODEL,
  /** Fallback model constant. */
  FALLBACK_MODEL,
  /** Module version. */
  __version,
};
