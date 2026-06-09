#!/usr/bin/env node
/**
 * @file result-aggregator.js
 * @description Native Hive Swarm result-aggregator.
 *
 * Takes the per-agent outputs produced by `worker-dispatcher.js` and
 * produces a single best-response plus a synthesized summary that
 * blends the top-N candidates together.
 *
 * Three aggregation methods are supported:
 *  - `pick-best`  : score every output, return the highest-scoring one
 *  - `synthesize` : ask the LLM to merge the top-K into a single
 *                   coherent response, ignoring individual scores
 *  - `hybrid`     : score everything, pick the best, AND synthesize the
 *                   top-3. The synthesized answer wins unless the
 *                   best-scored output is dramatically higher.
 *
 * The aggregator is the last stage of the swarm pipeline. It is
 * designed to NEVER throw — every error path returns a defensive
 * result that downstream consumers can still act on.
 *
 * Scoring is a weighted blend of:
 *  - LLM scores (per criterion, 0-10) when an LLM is reachable
 *  - Heuristic scores: word count, structure (lists/headings/code
 *    blocks), and keyword overlap with the originating goal
 *
 * Every aggregation is persisted to
 *   `hive-swarm-enhancements/build-logs/aggregations/<timestamp>.json`
 * for replay / audit.
 *
 * Exports:
 *   - `aggregate(outputs, options)` — primary async entry
 *   - `ResultAggregator`            — stateful class wrapper
 *   - `__version`                   — module version string
 *
 * @author Hive Swarm (overnight build, sub-agent B/2)
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Provider wiring (mirrors goal-decomposer.js pattern)
// ---------------------------------------------------------------------------
//
// The shared `ProviderManager` lives in `providers/provider-adapter.js`.
// From this file the relative path is
// `../../providers/provider-adapter.js`. We resolve once at module load
// time. If it is missing, we record the failure but still let the
// module export — the aggregator will fall back to heuristic scoring.
const PROVIDER_ADAPTER_PATH = path.resolve(
  __dirname, '..', '..', 'providers', 'provider-adapter.js'
);

let ProviderManager = null;
try {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  ({ ProviderManager } = require(PROVIDER_ADAPTER_PATH));
} catch (err) {
  // Swallow at load time — runtime will fall back to heuristic mode.
  // We deliberately do NOT throw so downstream tooling (the swarm
  // orchestrator, the dashboard) can still require this file.
  // eslint-disable-next-line no-console
  console.warn(
    `[result-aggregator] WARN: could not load provider-adapter from ` +
    `${PROVIDER_ADAPTER_PATH}: ${err.message}`
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Library version. */
const __version = '1.0.0';

/** Default primary model. Matches the 35b profile used elsewhere. */
const DEFAULT_MODEL = 'qwen3.6-35b-a3b';

/** Fallback model if primary fails. */
const FALLBACK_MODEL = 'glm-5';

/** Default LM Studio provider name. */
const DEFAULT_PROVIDER = 'lmstudio';

/** Default LM Studio base URL. */
const DEFAULT_BASE_URL =
  process.env.LM_STUDIO_BASE_URL || 'http://127.0.0.1:1234/v1';

/** Default API key (LM Studio doesn't require one, but the adapter expects a value). */
const DEFAULT_API_KEY = process.env.LM_STUDIO_API_KEY || '';

/** Default scoring criteria. */
const DEFAULT_CRITERIA = Object.freeze([
  'relevance',
  'completeness',
  'accuracy',
]);

/** All valid criteria — frozen for sanity. */
const VALID_CRITERIA = Object.freeze([
  'relevance',
  'completeness',
  'accuracy',
  'clarity',
  'conciseness',
  'usefulness',
  'creativity',
  'safety',
]);

/** Valid aggregation methods. */
const VALID_METHODS = Object.freeze(['pick-best', 'synthesize', 'hybrid']);

/** Cap on the number of outputs we will actually score / synthesize. */
const MAX_OUTPUTS = 50;

/** Top-K that gets fed into the synthesis prompt. */
const SYNTHESIS_TOP_K = 3;

/** Per-LLM-call timeout (ms). */
const LLM_TIMEOUT_MS = 60_000;

/** Per-criterion weight in the weighted score (must sum to 1.0). */
const CRITERION_WEIGHTS = Object.freeze({
  relevance: 0.30,
  completeness: 0.30,
  accuracy: 0.25,
  clarity: 0.10,
  conciseness: 0.05,
  usefulness: 0.10,
  creativity: 0.05,
  safety: 0.10,
});

/** Score below which we refuse to surface the synthesized answer as winner. */
const HYBRID_SYNTHESIS_FLOOR = 0.40;

/** Score advantage the top output must have over synthesis to win in hybrid. */
const HYBRID_WIN_MARGIN = 0.15;

// ---------------------------------------------------------------------------
// Module-level logger — never throws, always best-effort.
// ---------------------------------------------------------------------------

/**
 * Append a single line to the aggregator log. Best-effort: silently
 * no-ops on filesystem failure so the caller can never crash.
 *
 * @param {string} line - Line to append (no trailing newline required).
 * @param {string} [logDir] - Override log directory.
 * @returns {void}
 */
function logLine(line, logDir) {
  try {
    const dir = logDir || path.resolve(__dirname, '..', 'build-logs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(
      path.join(dir, 'aggregator.log'),
      `[${new Date().toISOString()}] ${line}\n`,
      'utf8'
    );
  } catch (_) {
    // Logging must never crash the caller.
  }
}

// ---------------------------------------------------------------------------
// Tokenization helpers
// ---------------------------------------------------------------------------

/**
 * Extract lowercase word tokens from a string. Defensive against
 * non-strings and weird unicode.
 *
 * @param {*} s - Anything.
 * @returns {string[]} unique lowercased tokens (alpha only, length >= 2).
 */
function tokenize(s) {
  if (typeof s !== 'string') return [];
  const lowered = s.toLowerCase();
  // Match runs of a-z, 0-9, dash, apostrophe. We strip numbers/punct
  // out below. \p{L} would be more correct but is overkill here.
  const raw = lowered.match(/[a-z][a-z0-9'-]{1,}/g) || [];
  // Filter to alpha-only words of length >= 2; dedupe via Set.
  const seen = new Set();
  const out = [];
  for (const w of raw) {
    const cleaned = w.replace(/[^a-z]/g, '');
    if (cleaned.length < 2) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
  }
  return out;
}

/**
 * Extract keyword phrases from a string by removing stopwords.
 * Defensive against non-strings.
 *
 * @param {*} s - Anything.
 * @returns {string[]} keyword tokens (no stopwords, length >= 3).
 */
const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','else','for','on','in','at',
  'to','of','with','by','from','as','is','are','was','were','be','been',
  'being','this','that','these','those','it','its','they','them','their',
  'there','here','what','which','who','whom','whose','why','how','when',
  'where','i','you','he','she','we','me','us','him','her','my','your',
  'his','our','do','does','did','done','have','has','had','will','would',
  'should','could','can','may','might','must','shall','not','no','yes',
  'so','than','too','very','just','also','any','all','some','each','every',
  'one','two','three','about','into','over','after','before','up','down',
  'out','off','again','still','only','own','same','such','because','while',
  'until','since','against','between','through','during','above','below',
  'please','thanks','thank','ok','okay','sure','well','really','actually',
  'thing','things','way','ways','kind','sort','like',
]);

/**
 * Extract meaningful keywords from a string. Drops stopwords and very
 * short tokens.
 *
 * @param {*} s - Anything.
 * @returns {string[]} keyword tokens.
 */
function keywords(s) {
  const toks = tokenize(s);
  const out = [];
  for (const t of toks) {
    if (t.length < 3) continue;
    if (STOPWORDS.has(t)) continue;
    out.push(t);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Similarity metrics
// ---------------------------------------------------------------------------

/**
 * Compute a Jaccard similarity between two strings.
 *
 * Jaccard similarity of the token sets:
 *   |A ∩ B| / |A ∪ B|
 * Range: [0, 1]. Returns 0 if both sets are empty.
 *
 * @param {string} a - First string.
 * @param {string} b - Second string.
 * @returns {number} similarity in [0, 1].
 */
function jaccard(a, b) {
  const setA = new Set(keywords(a));
  const setB = new Set(keywords(b));
  if (setA.size === 0 && setB.size === 0) return 0;
  let inter = 0;
  for (const t of setA) {
    if (setB.has(t)) inter++;
  }
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Compute a cosine similarity between two strings via their token
 * frequency vectors. Falls back to 0 on degenerate input.
 *
 * @param {string} a - First string.
 * @param {string} b - Second string.
 * @returns {number} similarity in [0, 1].
 */
function cosineTokens(a, b) {
  const toksA = keywords(a);
  const toksB = keywords(b);
  if (toksA.length === 0 || toksB.length === 0) return 0;

  // Build frequency maps.
  const fA = new Map();
  for (const t of toksA) fA.set(t, (fA.get(t) || 0) + 1);
  const fB = new Map();
  for (const t of toksB) fB.set(t, (fB.get(t) || 0) + 1);

  // Cosine: dot(A,B) / (|A| * |B|)
  let dot = 0;
  for (const [t, c] of fA) {
    if (fB.has(t)) dot += c * fB.get(t);
  }
  let magA = 0;
  for (const c of fA.values()) magA += c * c;
  let magB = 0;
  for (const c of fB.values()) magB += c * c;
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  // Clamp to [0, 1] (we should be there already, but be safe).
  return Math.max(0, Math.min(1, dot / denom));
}

/**
 * Compute similarity between two strings using the configured metric.
 *
 * Default is Jaccard (cheap, robust to length differences). If
 * `options.metric === 'cosine'`, uses cosine over token frequencies.
 * Returns a number in [0, 1].
 *
 * @param {string} a - First string.
 * @param {string} b - Second string.
 * @param {object} [options] - { metric: 'jaccard' | 'cosine' }.
 * @returns {number} similarity in [0, 1].
 */
function similarity(a, b, options) {
  try {
    const metric =
      options && options.metric === 'cosine' ? 'cosine' : 'jaccard';
    if (metric === 'cosine') return cosineTokens(a, b);
    return jaccard(a, b);
  } catch (_) {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Heuristic scoring
// ---------------------------------------------------------------------------

/**
 * Score a single output heuristically. Weights:
 *   - structure (headings/lists/code)        25%
 *   - word count in a sensible range         15%
 *   - keyword overlap with goal              35%
 *   - internal coherence (similarity of
 *     sentences to one another)              15%
 *   - "specificity" (numeric / proper-noun /
 *     URL density)                           10%
 *
 * Returns a number in [0, 1]. Defensive against any input.
 *
 * @param {object} output - { agentId, content, meta, completedAt }
 * @param {string} goal - The originating goal / query.
 * @returns {number} score in [0, 1]
 */
function heuristicScore(output, goal) {
  if (!output || typeof output.content !== 'string') return 0;
  const text = output.content;
  if (!text.trim()) return 0;

  // 1. Structure score — 0..1 based on detectable structure.
  let structure = 0;
  if (/^#{1,6}\s/m.test(text)) structure += 0.35;          // markdown headings
  if (/^[-*+]\s/m.test(text))  structure += 0.20;          // bullet lists
  if (/^\d+\.\s/m.test(text))  structure += 0.20;          // numbered lists
  if (/```[\s\S]*```/.test(text)) structure += 0.20;       // code blocks
  if (/^>\s/m.test(text))      structure += 0.05;          // blockquotes
  if (text.includes('|') && /\|.*\|.*\|/m.test(text)) structure += 0.05; // tables
  structure = Math.min(1, structure);

  // 2. Word count score — peak at 250 words, falls off either side.
  const wordCount = (text.match(/\S+/g) || []).length;
  let wcScore;
  if (wordCount < 10) {
    wcScore = wordCount / 10 * 0.4;  // very short — still partial credit
  } else if (wordCount <= 250) {
    wcScore = 0.6 + 0.4 * ((wordCount - 10) / 240);
  } else if (wordCount <= 1500) {
    wcScore = 1.0 - 0.3 * ((wordCount - 250) / 1250);
  } else {
    wcScore = 0.4;
  }
  wcScore = Math.max(0, Math.min(1, wcScore));

  // 3. Keyword overlap with goal.
  const goalKws = new Set(keywords(goal || ''));
  const textKws = keywords(text);
  let overlap = 0;
  if (goalKws.size > 0 && textKws.length > 0) {
    const textKwsSet = new Set(textKws);
    let shared = 0;
    for (const k of goalKws) {
      if (textKwsSet.has(k)) shared++;
    }
    overlap = shared / Math.max(goalKws.size, 1);
  } else {
    // No goal supplied — neutral 0.5 so we don't punish outputs
    // when the caller forgot to pass a goal.
    overlap = 0.5;
  }

  // 4. Coherence — average pairwise similarity of sentences.
  let coherence = 0.5;
  try {
    const sentences = text
      .split(/(?<=[.!?])\s+|\n{2,}/)
      .map(s => s.trim())
      .filter(s => s.length > 12);
    if (sentences.length >= 2) {
      let total = 0;
      let pairs = 0;
      const limit = Math.min(sentences.length, 8); // cap pairs
      for (let i = 0; i < limit; i++) {
        for (let j = i + 1; j < limit; j++) {
          total += jaccard(sentences[i], sentences[j]);
          pairs++;
        }
      }
      if (pairs > 0) coherence = total / pairs;
    }
  } catch (_) {
    coherence = 0.5;
  }

  // 5. Specificity — count of numbers, URLs, code identifiers.
  const numbers = (text.match(/\b\d+(?:\.\d+)?\b/g) || []).length;
  const urls = (text.match(/https?:\/\/\S+/g) || []).length;
  const identifiers = (text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) || [])
    .filter(w => /[A-Z]/.test(w) || /_/.test(w) || w.length >= 8)
    .length;
  const density = (numbers + urls + identifiers) / Math.max(wordCount, 1);
  let specificity = 0.4;
  if (density > 0.005) specificity = 0.55;
  if (density > 0.02)  specificity = 0.7;
  if (density > 0.05)  specificity = 0.85;
  if (density > 0.10)  specificity = 1.0;

  // Combine.
  const composite =
    0.25 * structure +
    0.15 * wcScore +
    0.35 * overlap +
    0.15 * coherence +
    0.10 * specificity;

  return Math.max(0, Math.min(1, composite));
}

// ---------------------------------------------------------------------------
// LLM scoring
// ---------------------------------------------------------------------------

/**
 * Build the per-output scoring prompt. We ask the model to rate the
 * output 0-10 on each criterion, returning strict JSON.
 *
 * @param {object} output - { agentId, content, meta, completedAt }
 * @param {string} goal - Originating goal.
 * @param {string[]} criteria - Criteria to score against.
 * @returns {Array<{role:string, content:string}>} messages
 */
function buildScoringPrompt(output, goal, criteria) {
  const safeGoal = (goal || '').trim().slice(0, 2000) || '(no goal supplied)';
  const safeContent = (output.content || '').toString().slice(0, 8000);
  const safeCriteria = Array.isArray(criteria) && criteria.length > 0
    ? criteria.filter(c => VALID_CRITERIA.includes(c))
    : [...DEFAULT_CRITERIA];
  if (safeCriteria.length === 0) safeCriteria.push(...DEFAULT_CRITERIA);

  const system = [
    'You are the Hive Swarm output-scorer.',
    'You rate a single agent output against an original goal on a',
    'small set of criteria, each on a 0-10 integer scale.',
    'Reply with valid JSON only — no prose, no markdown fences.',
  ].join(' ');

  const user = [
    `GOAL: ${safeGoal}`,
    '',
    `CRITERIA: ${safeCriteria.join(', ')}`,
    '',
    'AGENT OUTPUT:',
    '"""',
    safeContent,
    '"""',
    '',
    'OUTPUT SCHEMA (strict JSON, no other text):',
    '{',
    '  "scores": {',
    safeCriteria.map(c => `    "${c}": <integer 0-10>`).join(',\n'),
    '  },',
    '  "rationale": "<one short sentence>"',
    '}',
    '',
    'RULES:',
    '- Each score is an integer in [0, 10] inclusive.',
    '- Be strict but fair. Penalize factual errors, missing context, and fluff.',
    '- Do not wrap output in ``` or any other fences.',
    '- Do not include commentary before or after the JSON.',
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/**
 * Parse a scoring response from the LLM. Tolerant of fences, prose,
 * etc. Never throws.
 *
 * @param {string} text - Raw LLM response.
 * @returns {{ok:boolean, scores?:Object<string,number>, rationale?:string, error?:string}}
 */
function parseScoringResponse(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { ok: false, error: 'empty LLM response' };
  }

  const tried = [];

  // 1. Direct parse.
  tried.push('direct');
  try {
    const obj = JSON.parse(text);
    if (obj && obj.scores && typeof obj.scores === 'object') {
      return { ok: true, scores: obj.scores, rationale: obj.rationale || '' };
    }
  } catch (_) { /* fall through */ }

  // 2. Extract first balanced JSON object.
  tried.push('balanced');
  const candidate = extractFirstJsonObject(text);
  if (candidate) {
    try {
      const obj = JSON.parse(candidate);
      if (obj && obj.scores && typeof obj.scores === 'object') {
        return { ok: true, scores: obj.scores, rationale: obj.rationale || '' };
      }
    } catch (_) { /* fall through */ }
  }

  // 3. Regex rescue for `{"scores": ...}`.
  tried.push('regex');
  const m = text.match(/\{\s*"scores"\s*:\s*\{[\s\S]*?\}\s*(?:,\s*"rationale"\s*:\s*"[^"]*"\s*)?\}/);
  if (m) {
    try {
      const obj = JSON.parse(m[0]);
      if (obj && obj.scores && typeof obj.scores === 'object') {
        return { ok: true, scores: obj.scores, rationale: obj.rationale || '' };
      }
    } catch (_) { /* fall through */ }
  }

  return { ok: false, error: `could not parse scoring JSON (tried: ${tried.join(', ')})` };
}

/**
 * Extract the first balanced JSON object from a string. Tolerant of
 * fences, leading/trailing prose, BOM, etc.
 *
 * @param {string} text - Raw string.
 * @returns {string|null} the first balanced JSON object substring, or null.
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
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) return s.slice(start, i + 1);
      if (depth < 0) { depth = 0; start = -1; }
    }
  }
  return null;
}

/**
 * Call the LLM with a per-output scoring prompt. Falls back to the
 * secondary model on failure. Returns `{ ok, content }` on success.
 *
 * @param {object} provider - ProviderManager instance.
 * @param {string} providerName - Provider key.
 * @param {Array} messages - Messages to send.
 * @param {string} model - Primary model.
 * @returns {Promise<{ok:boolean, content?:string, error?:string, model?:string}>}
 */
async function callLlmWithFallback(provider, providerName, messages, model) {
  if (!provider || typeof provider.call !== 'function') {
    return { ok: false, error: 'no ProviderManager available' };
  }
  const tried = [];
  for (const m of [model, FALLBACK_MODEL]) {
    if (!m || tried.includes(m)) continue;
    tried.push(m);
    try {
      const res = await Promise.race([
        provider.call(providerName, messages, m, 512),
        new Promise(resolve => setTimeout(
          () => resolve({ status: 'error', error: 'timeout' }),
          LLM_TIMEOUT_MS
        )),
      ]);
      if (res && res.status === 'success' && typeof res.content === 'string' && res.content.trim()) {
        return { ok: true, content: res.content, model: m };
      }
    } catch (err) {
      logLine(`llm scoring call threw (model=${m}): ${err.message || err}`);
    }
  }
  return { ok: false, error: 'all models failed' };
}

/**
 * Score a single output via the LLM.
 *
 * @param {object} output - { agentId, content, meta, completedAt }
 * @param {string} goal - Originating goal.
 * @param {string[]} criteria - Criteria to score on.
 * @param {object} provider - ProviderManager.
 * @param {string} providerName - Provider key.
 * @param {string} model - Model name.
 * @returns {Promise<{ok:boolean, scores?:Object, rationale?:string, error?:string, model?:string}>}
 */
async function llmScoreOutput(output, goal, criteria, provider, providerName, model) {
  try {
    const messages = buildScoringPrompt(output, goal, criteria);
    const res = await callLlmWithFallback(provider, providerName, messages, model);
    if (!res.ok) return { ok: false, error: res.error };
    const parsed = parseScoringResponse(res.content);
    if (!parsed.ok) return { ok: false, error: parsed.error, raw: res.content };
    return { ok: true, scores: parsed.scores, rationale: parsed.rationale || '', model: res.model };
  } catch (err) {
    return { ok: false, error: (err && err.message) || String(err) };
  }
}

// ---------------------------------------------------------------------------
// Per-output scoreOutput()
// ---------------------------------------------------------------------------

/**
 * Combine LLM criterion scores (0-10) into a single 0-1 value using
 * the criterion-weight table. Missing criteria get a neutral 5/10.
 *
 * @param {Object<string,number>} scores - criterion → 0-10 integer.
 * @param {string[]} criteria - The criteria we asked for.
 * @returns {number} score in [0, 1].
 */
function combineLlmScores(scores, criteria) {
  if (!scores || typeof scores !== 'object') return 0;
  const cs = Array.isArray(criteria) && criteria.length > 0
    ? criteria
    : [...DEFAULT_CRITERIA];

  let weighted = 0;
  let weightSum = 0;
  for (const c of cs) {
    const w = CRITERION_WEIGHTS[c] || 0.1;
    let s = scores[c];
    if (typeof s !== 'number' || !Number.isFinite(s)) s = 5; // neutral
    s = Math.max(0, Math.min(10, s));
    weighted += (s / 10) * w;
    weightSum += w;
  }
  if (weightSum === 0) return 0;
  return Math.max(0, Math.min(1, weighted / weightSum));
}

/**
 * Score a single output.
 *
 * If an LLM is reachable, we ask it for per-criterion ratings, parse
 * the response, and combine them via `CRITERION_WEIGHTS`. The
 * returned `breakdown` includes both the LLM scores (0-10) and the
 * heuristic components so callers can audit.
 *
 * If the LLM is unreachable, we fall back to pure heuristic scoring
 * and return a breakdown that names the components.
 *
 * Always resolves. Never throws.
 *
 * @param {object} output - { agentId, content, meta, completedAt }
 * @param {object} [options] - { goal, criteria, model, provider, providerName, useLlm }
 * @returns {Promise<{score:number, breakdown:object}>}
 */
async function scoreOutput(output, options) {
  const opts = options || {};
  const goal = typeof opts.goal === 'string' ? opts.goal : '';
  const criteria = Array.isArray(opts.criteria) && opts.criteria.length > 0
    ? opts.criteria.filter(c => VALID_CRITERIA.includes(c))
    : [...DEFAULT_CRITERIA];
  if (criteria.length === 0) criteria.push(...DEFAULT_CRITERIA);

  const heuristic = heuristicScore(output, goal);

  // Heuristic breakdown (always available).
  const breakdown = {
    heuristic: Number(heuristic.toFixed(4)),
    components: _heuristicBreakdown(output, goal),
  };

  // If we have a provider and the caller didn't disable the LLM,
  // try to get LLM scores too.
  if (opts.useLlm !== false && opts.provider && typeof opts.provider.call === 'function') {
    const llm = await llmScoreOutput(
      output,
      goal,
      criteria,
      opts.provider,
      opts.providerName || DEFAULT_PROVIDER,
      opts.model || DEFAULT_MODEL
    );
    if (llm.ok && llm.scores) {
      const combined = combineLlmScores(llm.scores, criteria);
      breakdown.llm = llm.scores;
      breakdown.llmScore = Number(combined.toFixed(4));
      breakdown.llmModel = llm.model || null;
      breakdown.llmRationale = llm.rationale || '';
      // Blend: 65% LLM, 35% heuristic. The LLM is generally the
      // better signal when reachable; the heuristic prevents
      // catastrophic scoring when the LLM misbehaves.
      const blended = 0.65 * combined + 0.35 * heuristic;
      breakdown.blend = Number(blended.toFixed(4));
      return { score: Number(blended.toFixed(4)), breakdown };
    }
    breakdown.llmError = llm.error || 'unknown';
  }

  // Fallback: heuristic only.
  return { score: Number(heuristic.toFixed(4)), breakdown };
}

/**
 * Compute the components of the heuristic score, for the breakdown.
 * Internal helper.
 *
 * @param {object} output
 * @param {string} goal
 * @returns {object} components
 */
function _heuristicBreakdown(output, goal) {
  if (!output || typeof output.content !== 'string') {
    return { structure: 0, wordCountScore: 0, overlap: 0, coherence: 0, specificity: 0 };
  }
  const text = output.content;
  let structure = 0;
  if (/^#{1,6}\s/m.test(text)) structure += 0.35;
  if (/^[-*+]\s/m.test(text))  structure += 0.20;
  if (/^\d+\.\s/m.test(text))  structure += 0.20;
  if (/```[\s\S]*```/.test(text)) structure += 0.20;
  if (/^>\s/m.test(text))      structure += 0.05;
  if (text.includes('|') && /\|.*\|.*\|/m.test(text)) structure += 0.05;
  structure = Math.min(1, structure);

  const wordCount = (text.match(/\S+/g) || []).length;
  let wcScore;
  if (wordCount < 10) wcScore = wordCount / 10 * 0.4;
  else if (wordCount <= 250) wcScore = 0.6 + 0.4 * ((wordCount - 10) / 240);
  else if (wordCount <= 1500) wcScore = 1.0 - 0.3 * ((wordCount - 250) / 1250);
  else wcScore = 0.4;
  wcScore = Math.max(0, Math.min(1, wcScore));

  const goalKws = new Set(keywords(goal || ''));
  const textKws = keywords(text);
  let overlap = 0.5;
  if (goalKws.size > 0 && textKws.length > 0) {
    const textKwsSet = new Set(textKws);
    let shared = 0;
    for (const k of goalKws) if (textKwsSet.has(k)) shared++;
    overlap = shared / Math.max(goalKws.size, 1);
  }

  let coherence = 0.5;
  try {
    const sentences = text.split(/(?<=[.!?])\s+|\n{2,}/).map(s => s.trim()).filter(s => s.length > 12);
    if (sentences.length >= 2) {
      let total = 0; let pairs = 0;
      const limit = Math.min(sentences.length, 8);
      for (let i = 0; i < limit; i++) {
        for (let j = i + 1; j < limit; j++) {
          total += jaccard(sentences[i], sentences[j]);
          pairs++;
        }
      }
      if (pairs > 0) coherence = total / pairs;
    }
  } catch (_) { /* ignore */ }

  const numbers = (text.match(/\b\d+(?:\.\d+)?\b/g) || []).length;
  const urls = (text.match(/https?:\/\/\S+/g) || []).length;
  const identifiers = (text.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g) || [])
    .filter(w => /[A-Z]/.test(w) || /_/.test(w) || w.length >= 8).length;
  const density = (numbers + urls + identifiers) / Math.max(wordCount, 1);
  let specificity = 0.4;
  if (density > 0.005) specificity = 0.55;
  if (density > 0.02)  specificity = 0.7;
  if (density > 0.05)  specificity = 0.85;
  if (density > 0.10)  specificity = 1.0;

  return {
    structure: Number(structure.toFixed(4)),
    wordCountScore: Number(wcScore.toFixed(4)),
    wordCount,
    overlap: Number(overlap.toFixed(4)),
    coherence: Number(coherence.toFixed(4)),
    specificity: Number(specificity.toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// Synthesis
// ---------------------------------------------------------------------------

/**
 * Build the synthesis prompt. We hand the LLM the top-K outputs and
 * ask for a unified, faithful merge.
 *
 * @param {Array<object>} topK - Top-K outputs (with .content, .agentId, etc.)
 * @param {string} goal - Originating goal.
 * @returns {Array<{role:string, content:string}>} messages
 */
function buildSynthesisPrompt(topK, goal) {
  const safeGoal = (goal || '').trim().slice(0, 2000) || '(no goal supplied)';
  const blocks = topK.map((o, i) => {
    const cid = String(o.agentId || `agent-${i + 1}`);
    const text = (o.content || '').toString().slice(0, 6000);
    return `--- CANDIDATE ${i + 1} (agentId=${cid}) ---\n${text}\n--- END CANDIDATE ${i + 1} ---`;
  });

  const system = [
    'You are the Hive Swarm synthesizer.',
    'You receive multiple candidate responses to the same goal and',
    'must produce a single unified answer that combines the best of',
    'each, removes duplicates / contradictions, and preserves any',
    'concrete facts (numbers, names, code, URLs).',
    'Reply with valid JSON only — no prose, no markdown fences.',
  ].join(' ');

  const user = [
    `GOAL: ${safeGoal}`,
    '',
    `CANDIDATE COUNT: ${topK.length}`,
    '',
    blocks.join('\n\n'),
    '',
    'OUTPUT SCHEMA (strict JSON, no other text):',
    '{',
    '  "synthesized": "<the unified final answer, in plain text or simple markdown>",',
    '  "key_points": ["<short bullets summarising the merged answer>"],',
    '  "sources_used": [<agentIds that contributed meaningfully>]',
    '}',
    '',
    'RULES:',
    '- Be faithful: do not invent facts not present in the candidates.',
    '- If the candidates disagree, prefer the more specific / well-supported one and note the disagreement briefly.',
    '- Keep the response under 4000 characters unless a candidate is clearly very long-form.',
    '- Do not wrap output in ``` or any other fences.',
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/**
 * Parse a synthesis response from the LLM. Never throws.
 *
 * @param {string} text - Raw LLM response.
 * @returns {{ok:boolean, synthesized?:string, keyPoints?:string[], sourcesUsed?:string[], error?:string}}
 */
function parseSynthesisResponse(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { ok: false, error: 'empty LLM response' };
  }
  const tried = [];
  tried.push('direct');
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj.synthesized === 'string') {
      return {
        ok: true,
        synthesized: obj.synthesized,
        keyPoints: Array.isArray(obj.key_points) ? obj.key_points : [],
        sourcesUsed: Array.isArray(obj.sources_used) ? obj.sources_used : [],
      };
    }
  } catch (_) { /* fall through */ }

  tried.push('balanced');
  const candidate = extractFirstJsonObject(text);
  if (candidate) {
    try {
      const obj = JSON.parse(candidate);
      if (obj && typeof obj.synthesized === 'string') {
        return {
          ok: true,
          synthesized: obj.synthesized,
          keyPoints: Array.isArray(obj.key_points) ? obj.key_points : [],
          sourcesUsed: Array.isArray(obj.sources_used) ? obj.sources_used : [],
        };
      }
    } catch (_) { /* fall through */ }
  }

  tried.push('regex');
  const m = text.match(/\{\s*"synthesized"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"key_points"\s*:\s*\[[\s\S]*?\]\s*)?(?:,\s*"sources_used"\s*:\s*\[[\s\S]*?\]\s*)?\}/);
  if (m) {
    try {
      // Reconstruct a valid JSON string from the regex match.
      const fullMatch = m[0];
      const obj = JSON.parse(fullMatch);
      if (obj && typeof obj.synthesized === 'string') {
        return {
          ok: true,
          synthesized: obj.synthesized,
          keyPoints: Array.isArray(obj.key_points) ? obj.key_points : [],
          sourcesUsed: Array.isArray(obj.sources_used) ? obj.sources_used : [],
        };
      }
    } catch (_) { /* fall through */ }
  }

  return { ok: false, error: `could not parse synthesis JSON (tried: ${tried.join(', ')})` };
}

/**
 * Heuristic, no-LLM synthesis: take the top-K outputs and stitch
 * them together with brief connective tissue. Used as a fallback
 * when the LLM is unavailable.
 *
 * @param {Array<object>} topK - Top-K outputs.
 * @param {string} goal - Originating goal.
 * @returns {{synthesized:string, keyPoints:string[], sourcesUsed:string[]}}
 */
function heuristicSynthesize(topK, goal) {
  const header = goal
    ? `## Synthesis for: ${goal.trim().slice(0, 200)}\n\n`
    : `## Synthesis\n\n`;
  const intro = `_Combined from ${topK.length} top-scoring agent outputs._\n\n`;

  const bodies = topK.map((o, i) => {
    const cid = o.agentId || `agent-${i + 1}`;
    const text = (o.content || '').toString().trim();
    const label = `### From ${cid}\n\n`;
    return label + (text || '(empty)') + '\n\n';
  });

  // Key points = top 5 keyword phrases from the concatenated text.
  const concat = bodies.join('\n');
  const kws = keywords(concat);
  const seen = new Set();
  const topKws = [];
  for (const k of kws) {
    if (seen.has(k)) continue;
    seen.add(k);
    topKws.push(k);
    if (topKws.length >= 5) break;
  }

  return {
    synthesized: header + intro + bodies.join(''),
    keyPoints: topKws.map(k => `• contains reference to "${k}"`),
    sourcesUsed: topK.map(o => o.agentId).filter(Boolean),
  };
}

/**
 * Synthesize a unified response from the top-K outputs.
 *
 * Tries the LLM first. On any failure, falls back to
 * `heuristicSynthesize`. Always resolves. Never throws.
 *
 * @param {Array<object>} outputs - The full list of outputs.
 * @param {object} [options] - { goal, k, model, provider, providerName, useLlm }
 * @returns {Promise<{synthesized:string, keyPoints:string[], sourcesUsed:string[], method:string}>}
 */
async function synthesizeBest(outputs, options) {
  const opts = options || {};
  const goal = typeof opts.goal === 'string' ? opts.goal : '';
  const k = Number.isFinite(opts.k) ? Math.max(1, Math.floor(opts.k)) : SYNTHESIS_TOP_K;
  const model = opts.model || DEFAULT_MODEL;
  const providerName = opts.providerName || DEFAULT_PROVIDER;
  const provider = opts.provider;

  // Defensive copy + sort by score (highest first). The caller may
  // have already pre-scored these in `meta.score`; if not, we
  // compute a quick heuristic for ranking.
  const ranked = (Array.isArray(outputs) ? outputs : [])
    .filter(o => o && typeof o.content === 'string' && o.content.trim())
    .slice(0, MAX_OUTPUTS)
    .map(o => ({
      ...o,
      __score: typeof o.__score === 'number'
        ? o.__score
        : heuristicScore(o, goal),
    }))
    .sort((a, b) => b.__score - a.__score);

  const topK = ranked.slice(0, k);

  if (topK.length === 0) {
    return {
      synthesized: '',
      keyPoints: [],
      sourcesUsed: [],
      method: 'empty',
    };
  }

  // Only one output — return it directly, no synthesis needed.
  if (topK.length === 1) {
    return {
      synthesized: topK[0].content,
      keyPoints: [],
      sourcesUsed: [topK[0].agentId].filter(Boolean),
      method: 'passthrough',
    };
  }

  // Try the LLM.
  if (opts.useLlm !== false && provider && typeof provider.call === 'function') {
    try {
      const messages = buildSynthesisPrompt(topK, goal);
      const res = await callLlmWithFallback(provider, providerName, messages, model);
      if (res.ok) {
        const parsed = parseSynthesisResponse(res.content);
        if (parsed.ok) {
          return {
            synthesized: parsed.synthesized,
            keyPoints: parsed.keyPoints || [],
            sourcesUsed: parsed.sourcesUsed || [],
            method: 'llm',
            model: res.model || model,
          };
        }
        logLine(`synthesize LLM output unparseable: ${parsed.error}`);
      } else {
        logLine(`synthesize LLM call failed: ${res.error}`);
      }
    } catch (err) {
      logLine(`synthesize LLM threw: ${err.message || err}`);
    }
  }

  // Heuristic fallback.
  const fb = heuristicSynthesize(topK, goal);
  return {
    synthesized: fb.synthesized,
    keyPoints: fb.keyPoints,
    sourcesUsed: fb.sourcesUsed,
    method: 'heuristic',
  };
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

/**
 * Persist an aggregation result to disk. Never throws.
 *
 * @param {object} result - The aggregation result.
 * @param {string} [logDir] - Override log directory.
 * @returns {string|null} absolute file path on success, null on failure.
 */
function saveAggregationAudit(result, logDir) {
  try {
    const dir = path.join(
      logDir || path.resolve(__dirname, '..', 'build-logs'),
      'aggregations'
    );
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const hash = crypto
      .createHash('sha1')
      .update(JSON.stringify(result).slice(0, 4000))
      .digest('hex')
      .slice(0, 8);
    const file = path.join(dir, `${ts}-${hash}.json`);
    fs.writeFileSync(file, JSON.stringify(result, null, 2), 'utf8');
    return file;
  } catch (err) {
    logLine(`audit save failed: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Options normalization
// ---------------------------------------------------------------------------

/**
 * Normalize user-supplied options into a known-good shape. Never
 * throws.
 *
 * @param {object} [opts]
 * @returns {{
 *   method:string, model:string, providerName:string, provider:object|null,
 *   criteria:string[], goal:string, saveAudit:boolean, logDir:string,
 *   useLlm:boolean, k:number, extra:object
 * }}
 */
function normalizeOptions(opts) {
  const o = (opts && typeof opts === 'object') ? opts : {};

  let method = (typeof o.method === 'string') ? o.method.toLowerCase().trim() : 'hybrid';
  if (!VALID_METHODS.includes(method)) method = 'hybrid';

  let model = (typeof o.model === 'string' && o.model.trim())
    ? o.model.trim()
    : DEFAULT_MODEL;

  let providerName = (typeof o.providerName === 'string' && o.providerName.trim())
    ? o.providerName.trim()
    : DEFAULT_PROVIDER;

  let provider = null;
  if (o.provider && typeof o.provider.call === 'function') {
    provider = o.provider;
  } else if (ProviderManager) {
    try {
      provider = new ProviderManager();
      provider.registerProvider(providerName, {
        baseUrl: process.env.LM_STUDIO_BASE_URL || DEFAULT_BASE_URL,
        apiKey: process.env.LM_STUDIO_API_KEY || DEFAULT_API_KEY,
        models: [model, FALLBACK_MODEL],
      });
    } catch (err) {
      logLine(`provider init failed: ${err.message}`);
      provider = null;
    }
  }

  let criteria = Array.isArray(o.criteria) && o.criteria.length > 0
    ? o.criteria
        .filter(c => typeof c === 'string')
        .map(c => c.toLowerCase().trim())
        .filter(c => VALID_CRITERIA.includes(c))
    : [...DEFAULT_CRITERIA];
  if (criteria.length === 0) criteria = [...DEFAULT_CRITERIA];

  const goal = (typeof o.goal === 'string') ? o.goal : '';

  const saveAudit = o.saveAudit !== false;
  const logDir = (typeof o.logDir === 'string' && o.logDir.trim())
    ? o.logDir
    : path.resolve(__dirname, '..', 'build-logs');

  const useLlm = o.useLlm !== false;
  const k = Number.isFinite(o.k)
    ? Math.max(1, Math.min(10, Math.floor(o.k)))
    : SYNTHESIS_TOP_K;

  return {
    method,
    model,
    providerName,
    provider,
    criteria,
    goal,
    saveAudit,
    logDir,
    useLlm,
    k,
    extra: o.extra && typeof o.extra === 'object' ? o.extra : {},
  };
}

// ---------------------------------------------------------------------------
// Public API: aggregate()
// ---------------------------------------------------------------------------

/**
 * Aggregate a set of worker outputs into a single best response plus a
 * synthesized blend of the top-K candidates.
 *
 * Always resolves. Never throws. On any internal failure, returns a
 * defensive best-effort result tagged with `meta.fallback: true`.
 *
 * @param {Array<{agentId?:string, content:string, meta?:object, completedAt?:number|string}>} outputs
 * @param {object} [options]
 * @returns {Promise<{
 *   winner: { agentId:string|null, content:string, score:number, breakdown:object },
 *   synthesized: { content:string, keyPoints:string[], sourcesUsed:string[], method:string, score:number },
 *   scores: Array<{ agentId:string|null, score:number, breakdown:object }>,
 *   meta: {
 *     method:string, model:string, providerName:string, criteria:string[],
 *     goal:string, fallback:boolean, error:string|null,
 *     createdAt:string, auditFile:string|null, version:string,
 *     count:number, winnerAgentId:string|null, winnerScore:number
 *   }
 * }>}
 */
async function aggregate(outputs, options) {
  const startedAt = new Date();
  const opts = normalizeOptions(options);

  const result = {
    winner: { agentId: null, content: '', score: 0, breakdown: {} },
    synthesized: {
      content: '',
      keyPoints: [],
      sourcesUsed: [],
      method: 'none',
      score: 0,
    },
    scores: [],
    meta: {
      method: opts.method,
      model: opts.model,
      providerName: opts.providerName,
      criteria: opts.criteria,
      goal: opts.goal,
      fallback: false,
      error: null,
      createdAt: startedAt.toISOString(),
      auditFile: null,
      version: __version,
      count: 0,
      winnerAgentId: null,
      winnerScore: 0,
    },
  };

  try {
    // Step 0 — defensive input handling.
    if (!Array.isArray(outputs) || outputs.length === 0) {
      result.meta.fallback = true;
      result.meta.error = 'no outputs supplied';
      result.meta.auditFile = saveAggregationAudit(result, opts.logDir);
      return result;
    }

    const cleaned = outputs
      .filter(o => o && typeof o.content === 'string' && o.content.trim())
      .slice(0, MAX_OUTPUTS)
      .map((o, i) => ({
        agentId: o.agentId || `agent-${i + 1}`,
        content: o.content,
        meta: o.meta || {},
        completedAt: o.completedAt || null,
      }));

    if (cleaned.length === 0) {
      result.meta.fallback = true;
      result.meta.error = 'all outputs had empty content';
      result.meta.auditFile = saveAggregationAudit(result, opts.logDir);
      return result;
    }

    result.meta.count = cleaned.length;

    // Step 1 — score every output.
    const scored = [];
    for (const o of cleaned) {
      try {
        const { score, breakdown } = await scoreOutput(o, {
          goal: opts.goal,
          criteria: opts.criteria,
          model: opts.model,
          provider: opts.provider,
          providerName: opts.providerName,
          useLlm: opts.useLlm,
        });
        scored.push({ agentId: o.agentId, content: o.content, score, breakdown });
      } catch (err) {
        // Defensive: scoreOutput is supposed to never throw, but
        // belt-and-braces in case of weird inputs.
        scored.push({
          agentId: o.agentId,
          content: o.content,
          score: 0,
          breakdown: { error: err.message || String(err) },
        });
      }
    }

    result.scores = scored.map(s => ({
      agentId: s.agentId,
      score: s.score,
      breakdown: s.breakdown,
    }));

    // Rank descending by score.
    const ranked = scored.slice().sort((a, b) => b.score - a.score);

    // Step 2 — synthesize top-K.
    const synthInputs = ranked.map(s => ({
      agentId: s.agentId,
      content: s.content,
      __score: s.score,
    }));

    let synthRes;
    try {
      synthRes = await synthesizeBest(synthInputs, {
        goal: opts.goal,
        k: opts.k,
        model: opts.model,
        provider: opts.provider,
        providerName: opts.providerName,
        useLlm: opts.useLlm,
      });
    } catch (err) {
      logLine(`synthesizeBest threw: ${err.message || err}`);
      synthRes = heuristicSynthesize(synthInputs.slice(0, opts.k), opts.goal);
      synthRes.method = 'heuristic-fallback';
    }

    // Heuristic score for the synthesis (compare to goal + length).
    const synthScore = heuristicScore({ content: synthRes.synthesized }, opts.goal);
    result.synthesized = {
      content: synthRes.synthesized,
      keyPoints: synthRes.keyPoints || [],
      sourcesUsed: synthRes.sourcesUsed || [],
      method: synthRes.method || 'heuristic',
      score: Number(synthScore.toFixed(4)),
    };

    // Step 3 — pick the winner based on method.
    const top = ranked[0];
    if (opts.method === 'pick-best') {
      result.winner = {
        agentId: top.agentId,
        content: top.content,
        score: top.score,
        breakdown: top.breakdown,
      };
    } else if (opts.method === 'synthesize') {
      result.winner = {
        agentId: synthRes.sourcesUsed && synthRes.sourcesUsed[0]
          ? synthRes.sourcesUsed[0]
          : top.agentId,
        content: synthRes.synthesized,
        score: synthScore,
        breakdown: { method: synthRes.method, sources: synthRes.sourcesUsed },
      };
    } else {
      // 'hybrid' (default): pick best, but if the synthesis is
      // competitive (and the best isn't dramatically higher), prefer
      // the synthesis. This avoids "the best answer had a good
      // structure but missed an important fact" type failures.
      const topScore = top.score;
      const wantSynth =
        synthScore >= HYBRID_SYNTHESIS_FLOOR &&
        topScore - synthScore < HYBRID_WIN_MARGIN;

      if (wantSynth) {
        result.winner = {
          agentId: synthRes.sourcesUsed && synthRes.sourcesUsed[0]
            ? synthRes.sourcesUsed[0]
            : top.agentId,
          content: synthRes.synthesized,
          score: synthScore,
          breakdown: {
            method: synthRes.method,
            sources: synthRes.sourcesUsed,
            reason: 'hybrid: synthesis competitive with best',
          },
        };
      } else {
        result.winner = {
          agentId: top.agentId,
          content: top.content,
          score: top.score,
          breakdown: top.breakdown,
        };
      }
    }

    result.meta.winnerAgentId = result.winner.agentId;
    result.meta.winnerScore = result.winner.score;
  } catch (err) {
    // Catastrophic — return a defensive shell so the caller is
    // never stuck.
    result.meta.fallback = true;
    result.meta.error = (err && err.message) ? err.message : String(err);
    logLine(`aggregate() caught unexpected error: ${result.meta.error}`);
  }

  result.meta.auditFile = saveAggregationAudit(result, opts.logDir);
  return result;
}

// ---------------------------------------------------------------------------
// Class wrapper
// ---------------------------------------------------------------------------

/**
 * Stateful wrapper around `aggregate()`.
 *
 * Holds a ProviderManager + provider config so repeated calls don't
 * re-register providers. Also keeps a small in-memory history of
 * recent aggregations (capped at `historyLimit`) for the dashboard.
 *
 * @example
 *   const agg = new ResultAggregator({ method: 'hybrid', model: 'qwen3.6-35b-a3b' });
 *   const r = await agg.aggregate(outputs, { goal: 'Explain Kafka briefly' });
 *   console.log(r.winner.agentId, r.winner.score);
 */
class ResultAggregator {
  /**
   * @param {object} [opts]
   * @param {string} [opts.method]        - 'pick-best' | 'synthesize' | 'hybrid' (default hybrid)
   * @param {string} [opts.model]         - Primary model name
   * @param {string} [opts.providerName]  - Provider key
   * @param {object} [opts.provider]      - Pre-built ProviderManager
   * @param {string[]} [opts.criteria]    - Scoring criteria
   * @param {boolean} [opts.saveAudit]    - Persist results to build-logs/aggregations/
   * @param {string} [opts.logDir]        - Override audit directory
   * @param {boolean} [opts.useLlm]       - If false, skip LLM scoring / synthesis
   * @param {number}  [opts.k]            - Top-K for synthesis (default 3)
   * @param {number}  [opts.historyLimit] - In-memory history size (default 32)
   */
  constructor(opts = {}) {
    this.opts = normalizeOptions(opts);
    this.history = [];
    this.historyLimit = Number.isFinite(opts.historyLimit)
      ? Math.max(0, Math.floor(opts.historyLimit))
      : 32;
  }

  /**
   * Run an aggregation. Returns the same shape as the standalone
   * `aggregate()` function.
   *
   * @param {Array} outputs
   * @param {object} [callOpts] - Per-call overrides.
   * @returns {Promise<object>}
   */
  async aggregate(outputs, callOpts = {}) {
    const merged = {
      ...this.opts.extra,
      method: this.opts.method,
      model: this.opts.model,
      providerName: this.opts.providerName,
      criteria: this.opts.criteria,
      saveAudit: this.opts.saveAudit,
      logDir: this.opts.logDir,
      useLlm: this.opts.useLlm,
      k: this.opts.k,
      ...callOpts,
    };
    if (!callOpts.provider && this.opts.provider) {
      merged.provider = this.opts.provider;
    }

    const result = await aggregate(outputs, merged);

    if (this.historyLimit > 0) {
      this.history.unshift({
        method: result.meta.method,
        count: result.meta.count,
        winnerAgentId: result.meta.winnerAgentId,
        winnerScore: result.meta.winnerScore,
        fallback: result.meta.fallback,
        at: result.meta.createdAt,
        auditFile: result.meta.auditFile,
      });
      if (this.history.length > this.historyLimit) {
        this.history.length = this.historyLimit;
      }
    }
    return result;
  }

  /**
   * Score a single output using the instance's configured provider.
   * @param {object} output
   * @param {object} [options]
   * @returns {Promise<{score:number, breakdown:object}>}
   */
  async scoreOutput(output, options) {
    return scoreOutput(output, {
      ...(options || {}),
      provider: (options && options.provider) || this.opts.provider,
      providerName: (options && options.providerName) || this.opts.providerName,
      model: (options && options.model) || this.opts.model,
      useLlm: (options && options.useLlm !== undefined) ? options.useLlm : this.opts.useLlm,
    });
  }

  /**
   * Synthesize a unified response from a set of outputs.
   * @param {Array} outputs
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async synthesizeBest(outputs, options) {
    return synthesizeBest(outputs, {
      ...(options || {}),
      provider: (options && options.provider) || this.opts.provider,
      providerName: (options && options.providerName) || this.opts.providerName,
      model: (options && options.model) || this.opts.model,
      useLlm: (options && options.useLlm !== undefined) ? options.useLlm : this.opts.useLlm,
    });
  }

  /**
   * Compute similarity between two strings.
   * @param {string} a
   * @param {string} b
   * @param {object} [options]
   * @returns {number}
   */
  similarity(a, b, options) {
    return similarity(a, b, options);
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
  /** Primary entry point. Always resolves. Never throws. */
  aggregate,
  /** Stateful class wrapper with shared provider + in-memory history. */
  ResultAggregator,
  /** Score a single output (async; uses LLM if available). */
  scoreOutput,
  /** Synthesize top-K outputs into one. */
  synthesizeBest,
  /** Similarity metric. Jaccard by default, cosine optional. */
  similarity,
  /** Heuristic scorer (no LLM). */
  heuristicScore,
  /** Default criteria list. */
  DEFAULT_CRITERIA,
  /** Module version. */
  __version,
};
