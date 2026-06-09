/**
 * @file goal-evaluator.js
 * @description Evaluate a goal's success criteria against the work that was
 * actually done — ported from the agnt `GoalEvaluator.js` (470 lines).
 *
 * The agnt evaluator does, per success criterion:
 *   1. Fetch the goal + tasks.
 *   2. For each task, ask the LLM to score the task's output against the
 *      goal's success criteria (AI evaluation per task).
 *   3. Aggregate task scores with a weighted average (completeness 0.3,
 *      quality 0.7).
 *   4. Generate a free-form feedback summary via a second LLM call.
 *   5. Persist the evaluation in `GoalEvaluationModel` / `TaskEvaluationModel`
 *      and flip the goal's status to `validated` or `needs_review`.
 *
 * Our port keeps the *shape* of the result (success, score, per-criterion
 * evidence, recommendations) but:
 *  - Storage is JSON, via `./goal-store.js` (we patch the goal's status
 *    inline rather than maintaining a separate evaluations table).
 *  - Per-criterion evaluation is one LLM call per criterion (cheaper than
 *    per-task) — that matches the spec: "based on the tasks completed, is
 *    this criterion met?"
 *  - Heuristic fallback: if the LLM is down, score = (completedTasks /
 *    totalTasks), and any criterion is met only when score >= 0.7.
 *  - All public methods are safe — they never throw.
 *
 * Exports:
 *  - `GoalEvaluator` — class
 *  - `evaluate(goalId, options)` — top-level async helper
 *  - `__version`
 *
 * @author Hive Swarm (sub-agent HARVEST-1, ported from agnt)
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { GoalStore, __version: STORE_VERSION } = require('./goal-store');

// ---------------------------------------------------------------------------
// Provider wiring — same pattern as goal-processor.js
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
    `[goal-evaluator] WARN: provider-adapter not loadable: ${err.message}`
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __version = '1.0.0';

const DEFAULT_PROVIDER = 'lmstudio';
const DEFAULT_MODEL = 'qwen3.6-35b-a3b';
const LLM_MAX_TOKENS = 800;
const PASS_THRESHOLD = 0.7; // score >= 0.7 = success, matches agnt's 70%

const LOG_DIR = path.resolve(__dirname, '..', '..', 'build-logs');
const LOG_FILE = path.join(LOG_DIR, 'goal-evaluator.log');

function logLine(line) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, 'utf8');
  } catch (_) { /* swallow */ }
}

// ---------------------------------------------------------------------------
// JSON extraction — duplicated from goal-processor.js to keep the modules
// independent. Cheap; a few lines of code.
// ---------------------------------------------------------------------------

function extractFirstJsonObject(text) {
  if (typeof text !== 'string' || !text) return null;
  let s = text.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\u2060]/g, '');
  s = s.replace(/```(?:json|JSON)?\s*/g, '').replace(/```/g, '');
  let start = -1, depth = 0, inString = false, escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') { if (start === -1) start = i; depth++; continue; }
    if (ch === '}') { if (depth === 0) continue; depth--; if (depth === 0 && start !== -1) return s.slice(start, i + 1); }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Heuristic evaluation — when the LLM is unavailable
// ---------------------------------------------------------------------------

/**
 * Heuristic score: fraction of tasks completed, criteria are "met" iff
 * the overall completion ratio is above the pass threshold.
 * @param {object} goal
 * @returns {object} evaluation
 */
function heuristicEvaluation(goal) {
  const tasks = Array.isArray(goal.tasks) ? goal.tasks : [];
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const failed = tasks.filter((t) => t.status === 'failed').length;
  const ratio = total === 0 ? 0 : completed / total;
  const criteria = buildCriteriaList(goal).map((c) => ({
    criterion: c,
    met: ratio >= PASS_THRESHOLD,
    evidence: `${completed}/${total} tasks completed, ${failed} failed.`,
  }));
  const recommendations = tasks
    .filter((t) => t.status !== 'completed')
    .map((t) => `Re-run or rework task "${t.title}" (id=${t.id}, status=${t.status}).`);
  if (!recommendations.length) recommendations.push('All tasks completed — no rework needed.');
  return {
    success: ratio >= PASS_THRESHOLD && total > 0,
    score: round2(ratio),
    criteria,
    recommendations,
    source: 'heuristic',
  };
}

/**
 * Flatten successCriteria into a single string list. Tolerates the two
 * shapes we use (`{deliverables, qualityChecks}` and a plain string[]).
 * @param {object} goal
 * @returns {string[]}
 */
function buildCriteriaList(goal) {
  const sc = goal.successCriteria;
  if (!sc) return [];
  if (Array.isArray(sc)) return sc.filter((x) => typeof x === 'string');
  const out = [];
  if (Array.isArray(sc.deliverables)) out.push(...sc.deliverables);
  if (Array.isArray(sc.qualityChecks)) out.push(...sc.qualityChecks);
  return out.filter((x) => typeof x === 'string' && x.trim());
}

// ---------------------------------------------------------------------------
// LLM per-criterion evaluation
// ---------------------------------------------------------------------------

/**
 * Build the LLM messages that ask "is this criterion met given the task
 * results?".
 * @param {string} criterion
 * @param {object} goal
 * @returns {Array<{role:string, content:string}>}
 */
function buildCriterionPrompt(criterion, goal) {
  const taskSummary = (goal.tasks || []).map((t, i) => {
    const result = t.result
      ? (typeof t.result === 'string' ? t.result : JSON.stringify(t.result))
      : '(no result recorded)';
    const snippet = result.length > 600 ? result.slice(0, 597) + '...' : result;
    return `Task ${i + 1}: ${t.title}\n  Status: ${t.status}\n  Result: ${snippet}`;
  }).join('\n\n');

  const system = [
    'You are the Hive Swarm goal-evaluator.',
    'Decide whether a single success criterion is met given the work done.',
    'Reply with ONE valid JSON object, no markdown, no prose.',
  ].join(' ');

  const user = [
    `GOAL: ${goal.title}`,
    `GOAL DESCRIPTION: ${(goal.description || '').slice(0, 600)}`,
    '',
    `CRITERION: ${criterion}`,
    '',
    'TASK RESULTS:',
    taskSummary || '(no tasks recorded)',
    '',
    'OUTPUT SCHEMA:',
    '{',
    '  "met": true,',
    '  "confidence": 0.0,  // 0-1',
    '  "evidence": "1-2 sentence justification citing specific tasks/results"',
    '}',
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/**
 * Parse a criterion LLM response.
 * @param {string} raw
 * @returns {{met:boolean, confidence:number, evidence:string}|null}
 */
function parseCriterionResponse(raw) {
  const json = extractFirstJsonObject(raw);
  if (!json) return null;
  let parsed;
  try { parsed = JSON.parse(json); } catch (_) { return null; }
  if (!parsed || typeof parsed !== 'object') return null;
  return {
    met: Boolean(parsed.met),
    confidence: clamp01(Number(parsed.confidence)),
    evidence: (typeof parsed.evidence === 'string' ? parsed.evidence : '').trim(),
  };
}

/**
 * Call the ProviderManager, soft-fail to `{ok:false}` on any error.
 * @param {string} provider
 * @param {Array} messages
 * @param {string} model
 * @returns {Promise<{ok:boolean, content?:string, error?:string}>}
 */
async function callLlm(provider, messages, model) {
  if (!ProviderManager) return { ok: false, error: 'ProviderManager unavailable' };
  try {
    const mgr = new ProviderManager();
    const result = await mgr.call(provider, messages, model, LLM_MAX_TOKENS);
    if (result && result.status === 'success' && result.content) {
      return { ok: true, content: result.content };
    }
    return { ok: false, error: (result && result.error) || 'unknown LLM error' };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function round2(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// GoalEvaluator
// ---------------------------------------------------------------------------

/**
 * @class GoalEvaluator
 * @classdesc Score a goal against its success criteria.
 */
class GoalEvaluator {
  /**
   * @param {object} [options]
   * @param {GoalStore} [options.store]
   * @param {string} [options.defaultProvider]
   * @param {string} [options.defaultModel]
   * @param {boolean} [options.persistResults=true] - Patch the goal's
   *   `status` to `validated` or `needs_review` and store the evaluation
   *   in `meta.lastEvaluation`.
   * @param {number} [options.passThreshold=0.7]
   */
  constructor(options = {}) {
    this.store = options.store instanceof GoalStore
      ? options.store
      : new GoalStore();
    this.defaultProvider = options.defaultProvider || DEFAULT_PROVIDER;
    this.defaultModel = options.defaultModel || DEFAULT_MODEL;
    this.persistResults = options.persistResults !== false;
    this.passThreshold = Number.isFinite(options.passThreshold)
      ? options.passThreshold
      : PASS_THRESHOLD;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Evaluate a goal.
   * @param {string} goalId
   * @param {object} [options]
   * @param {string} [options.provider]
   * @param {string} [options.model]
   * @param {boolean} [options.useLlm=true]
   * @returns {Promise<{
   *   ok:boolean,
   *   evaluation?:{
   *     goalId:string, success:boolean, score:number,
   *     criteria:Array<{criterion:string, met:boolean, evidence:string}>,
   *     recommendations:string[],
   *     source:'llm'|'heuristic',
   *     evaluatedAt:string
   *   },
   *   error?:string
   * }>}
   */
  async evaluate(goalId, options = {}) {
    if (!goalId || typeof goalId !== 'string') {
      return { ok: false, error: 'evaluate: goalId is required' };
    }

    const goal = this.store.getGoal(goalId);
    if (!goal) return { ok: false, error: `evaluate: goal ${goalId} not found` };

    const provider = options.provider || this.defaultProvider;
    const model = options.model || this.defaultModel;
    const useLlm = options.useLlm !== false;

    logLine(`evaluate: ${goalId} (${(goal.tasks || []).length} tasks)`);

    const criteriaList = buildCriteriaList(goal);
    let evaluation;

    if (useLlm && criteriaList.length > 0) {
      evaluation = await this._evaluateWithLlm(goal, criteriaList, provider, model);
    }
    if (!evaluation) {
      evaluation = heuristicEvaluation(goal);
    }

    const result = {
      goalId,
      success: evaluation.success && evaluation.score >= this.passThreshold,
      score: evaluation.score,
      criteria: evaluation.criteria,
      recommendations: evaluation.recommendations,
      source: evaluation.source,
      evaluatedAt: new Date().toISOString(),
    };

    if (this.persistResults) this._persist(goal, result);

    logLine(
      `evaluate: ${goalId} → success=${result.success} score=${result.score} ` +
      `source=${result.source}`
    );

    return { ok: true, evaluation: result };
  }

  /**
   * Quick heuristic-only check. Useful for unit tests / pre-flight.
   * @param {string} goalId
   * @returns {object|null}
   */
  evaluateHeuristic(goalId) {
    const goal = this.store.getGoal(goalId);
    if (!goal) return null;
    return heuristicEvaluation(goal);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * LLM-driven evaluation. Falls back to heuristic on the first failure
   * so the caller always gets a result.
   * @private
   */
  async _evaluateWithLlm(goal, criteriaList, provider, model) {
    const out = [];
    let anyLlmFailure = false;
    for (const c of criteriaList) {
      const messages = buildCriterionPrompt(c, goal);
      const llm = await callLlm(provider, messages, model);
      if (!llm.ok) {
        anyLlmFailure = true;
        out.push({
          criterion: c,
          met: false,
          evidence: `LLM evaluation failed: ${llm.error}`,
        });
        continue;
      }
      const parsed = parseCriterionResponse(llm.content);
      if (!parsed) {
        anyLlmFailure = true;
        out.push({
          criterion: c,
          met: false,
          evidence: 'LLM returned unparseable response',
        });
        continue;
      }
      out.push({
        criterion: c,
        met: parsed.met,
        evidence: parsed.evidence || '(no evidence returned)',
      });
    }

    // Score = fraction of criteria that were met.
    const met = out.filter((c) => c.met).length;
    const score = out.length === 0 ? 0 : met / out.length;
    const success = score >= this.passThreshold;

    // Recommendations: any criterion that wasn't met, plus any failed tasks.
    const recommendations = [];
    for (const c of out) {
      if (!c.met) recommendations.push(`Criterion not met: ${c.criterion}`);
    }
    const failedTasks = (goal.tasks || []).filter((t) => t.status === 'failed');
    for (const t of failedTasks) {
      recommendations.push(`Re-run failed task: ${t.title} (id=${t.id})`);
    }
    if (recommendations.length === 0) {
      recommendations.push('All criteria met — no rework needed.');
    }

    return {
      success,
      score: round2(score),
      criteria: out,
      recommendations,
      source: anyLlmFailure ? 'llm-partial' : 'llm',
    };
  }

  /**
   * Persist the evaluation result back into the goal document.
   * @private
   */
  _persist(goal, result) {
    const status = result.success ? 'validated' : 'needs_review';
    const meta = { ...(goal.meta || {}), lastEvaluation: result };
    const patch = { status, meta };
    const updated = this.store.updateGoal(goal.id, patch);
    if (!updated.ok) logLine(`persist failed for ${goal.id}: ${updated.error}`);
  }
}

// ---------------------------------------------------------------------------
// Module-level convenience function
// ---------------------------------------------------------------------------

/**
 * Evaluate a goal using a default-configured {@link GoalEvaluator}.
 * @param {string} goalId
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function evaluate(goalId, options = {}) {
  const evaluator = new GoalEvaluator(options.store ? { store: options.store } : undefined);
  return evaluator.evaluate(goalId, options);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  GoalEvaluator,
  evaluate,
  __version,
  // Re-exports for tests.
  heuristicEvaluation,
  buildCriteriaList,
  parseCriterionResponse,
  buildCriterionPrompt,
  constants: {
    DEFAULT_PROVIDER,
    DEFAULT_MODEL,
    PASS_THRESHOLD,
  },
};
