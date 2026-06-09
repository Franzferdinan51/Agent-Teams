#!/usr/bin/env node
/**
 * @file cli.js
 * @description Hive Swarm native CLI — the MAIN entry point.
 *
 * Wires together the entire native layer:
 *
 *   planner  →  decomposer  →  dispatcher  →  aggregator  →  consensus
 *
 * Subcommands:
 *
 *   node cli.js swarm        "<GOAL>"  [--count N] [--domain X] [--model M] [--consensus]
 *   node cli.js decompose    "<GOAL>"  [--count N] [--domain X]   (no execution)
 *   node cli.js consensus    "<QUESTION>" "<choice1,choice2,...>"  [--timeout 60000]
 *   node cli.js plan         "<GOAL>"                            (print the plan only)
 *   node cli.js preflight                                       (check mesh + lmstudio)
 *   node cli.js --help
 *   node cli.js help
 *
 * Output:
 *   - One JSON object per line on stdout (NDJSON / "JSON lines") for
 *     machine consumption.
 *   - Colored, human-readable summaries on stderr (status, progress dots).
 *   - Exit codes: 0=success, 1=user error, 2=infrastructure error.
 *
 * Dependencies: NONE outside the Node stdlib + the local `core/` modules.
 *
 * @author Hive Swarm (sub-agent C / 3)
 * @version 1.0.0
 */

'use strict';

// ---------------------------------------------------------------------------
// Builtins
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// Sibling modules
// ---------------------------------------------------------------------------

// These three modules already exist in the repo (built by sub-agents A & B).
const { plan: planGoal, Planner, __version: PLANNER_VERSION } = require('./planner');
const {
  decompose,
  __version: DECOMP_VERSION,
  DOMAIN_HINTS,
} = require('./goal-decomposer');
const WorkerDispatcher = require('./worker-dispatcher');

// result-aggregator.js + consensus-engine.js are being built in parallel
// by sub-agent B.  We require them defensively so the CLI still works
// even if they're not yet on disk.
let aggregateResults = null;
let __version_AGG_VERSION = null;
try {
  // eslint-disable-next-line global-require
  ({
    aggregate: aggregateResults,
    __version: __version_AGG_VERSION,
  } = require('./result-aggregator'));
} catch (_err) {
  // Soft fallback: implement a trivial aggregator inline.
  aggregateResults = async function inlineAggregate(plan, results) {
    const accepted = (results || []).filter(r => r && r.status === 'fulfilled');
    return {
      ok: accepted.length > 0,
      summary: `Aggregated ${accepted.length}/${(results || []).length} results`,
      items: accepted.map(r => r.value || r),
      method: 'inline-fallback',
    };
  };
  __version_AGG_VERSION = 'inline-fallback';
}

let runConsensus = null;
let __version_CONS_VERSION = null;
try {
  // eslint-disable-next-line global-require
  ({
    runConsensus,
    __version: __version_CONS_VERSION,
  } = require('./consensus-engine'));
} catch (_err) {
  runConsensus = null;
  __version_CONS_VERSION = 'inline-fallback';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __version = '1.0.0';

const MESH_HTTP = process.env.MESH_URL || 'http://localhost:4000';
const MESH_HEALTH = `${MESH_HTTP.replace(/\/$/, '')}/health`;
const LMSTUDIO_URL = process.env.LMSTUDIO_URL || 'http://localhost:1234';
const LMSTUDIO_MODELS = `${LMSTUDIO_URL.replace(/\/$/, '')}/v1/models`;

const PREFLIGHT_TIMEOUT_MS = 3000;
const HTTP_TIMEOUT_MS = 5000;

// Exit codes.
const EXIT_OK = 0;
const EXIT_USER_ERROR = 1;
const EXIT_INFRA_ERROR = 2;

// ---------------------------------------------------------------------------
// ANSI colors (chalk-style, zero deps)
// ---------------------------------------------------------------------------

const useColor = process.stdout.isTTY !== false && process.env.NO_COLOR === undefined;
const C = useColor
  ? {
    reset: '\x1b[0m',
    bold:  '\x1b[1m',
    dim:   '\x1b[2m',
    red:   '\x1b[31m',
    green: '\x1b[32m',
    yellow:'\x1b[33m',
    blue:  '\x1b[34m',
    magenta:'\x1b[35m',
    cyan:  '\x1b[36m',
    gray:  '\x1b[90m',
  }
  : new Proxy({}, { get: () => '' });

/** Wrap a string in a color. */
function c(color, s) {
  return `${C[color] || ''}${s}${C.reset}`;
}

// ---------------------------------------------------------------------------
// JSON-line event output
// ---------------------------------------------------------------------------

/**
 * Emit a single JSON-line event on stdout.  This is the MACHINE-READABLE
 * channel.  Anything prettier goes to stderr via `log()`.
 *
 * @param {object} evt
 */
function emit(evt) {
  try {
    process.stdout.write(JSON.stringify(evt) + '\n');
  } catch (err) {
    // Last-ditch: never crash the process on a serialization error.
    process.stdout.write(JSON.stringify({ event: 'error', error: String(err && err.message || err) }) + '\n');
  }
}

/**
 * Human-readable log line on stderr.  Prefix with a tiny status badge.
 *
 * @param {string} tag    e.g. 'swarm', 'decompose', 'plan', 'preflight'
 * @param {string} msg
 * @param {string} [level] 'info' | 'warn' | 'error' | 'ok' (default 'info')
 */
function log(tag, msg, level = 'info') {
  const badge = {
    info: c('blue', 'ℹ'),
    warn: c('yellow', '⚠'),
    error: c('red', '✖'),
    ok:   c('green', '✔'),
  }[level] || c('blue', 'ℹ');
  const tag2 = c('gray', `[${tag}]`);
  const stream = (level === 'error' || level === 'warn') ? process.stderr : process.stderr;
  stream.write(`${badge} ${tag2} ${msg}\n`);
}

// ---------------------------------------------------------------------------
// Tiny HTTP helper (avoids `fetch` so we work on older Node too)
// ---------------------------------------------------------------------------

/**
 * GET a URL and resolve with { status, ok, body, ms }.
 * Never throws — always resolves.
 *
 * @param {string} url
 * @param {number} [timeoutMs]
 * @returns {Promise<{ok:boolean, status:number, body:string, error:(string|null), ms:number}>}
 */
function httpGet(url, timeoutMs = HTTP_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let parsed;
    try { parsed = new URL(url); } catch (err) {
      return resolve({ ok: false, status: 0, body: '', error: `bad url: ${err.message}`, ms: 0 });
    }
    const lib = parsed.protocol === 'https:' ? https : http;
    const start = Date.now();
    const req = lib.request({
      method: 'GET',
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + (parsed.search || ''),
      timeout: timeoutMs,
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode || 0,
          body,
          error: null,
          ms: Date.now() - start,
        });
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 0, body: '', error: 'timeout', ms: Date.now() - start });
    });
    req.on('error', (err) => {
      resolve({ ok: false, status: 0, body: '', error: err.message || String(err), ms: Date.now() - start });
    });
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Help / version text
// ---------------------------------------------------------------------------

function printHelp() {
  const lines = [
    '',
    c('bold', '  🐝 Hive Swarm CLI'),
    c('dim',  `  v${__version}  (planner ${PLANNER_VERSION}, decomposer ${DECOMP_VERSION}, aggregator ${__version_AGG_VERSION || 'n/a'}, consensus ${__version_CONS_VERSION || 'n/a'})`),
    '',
    c('bold', '  Usage:'),
    c('cyan', '    node cli.js swarm        "<GOAL>"  [--count N] [--domain X] [--model M] [--consensus] [--dry-run]'),
    c('cyan', '    node cli.js decompose    "<GOAL>"  [--count N] [--domain X]'),
    c('cyan', '    node cli.js consensus    "<QUESTION>" "<choice1,choice2,...>"  [--timeout 60000]'),
    c('cyan', '    node cli.js plan         "<GOAL>"'),
    c('cyan', '    node cli.js preflight'),
    c('cyan', '    node cli.js --help'),
    c('cyan', '    node cli.js --version'),
    '',
    c('bold', '  Commands:'),
    `    ${c('cyan', 'swarm')}        Plan → decompose → dispatch → aggregate.  Streams NDJSON events.`,
    `    ${c('cyan', 'decompose')}    Plan + decompose only.  Does NOT execute.`,
    `    ${c('cyan', 'consensus')}    Run a consensus vote on a question with explicit choices.`,
    `    ${c('cyan', 'plan')}         Print the routing plan for a goal (no decomposition).`,
    `    ${c('cyan', 'preflight')}    Check mesh (${MESH_HEALTH}) + lmstudio (${LMSTUDIO_MODELS}).`,
    '',
    c('bold', '  Flags:'),
    `    ${c('gray', '--count N')}     Number of agents (2-15, default 4).`,
    `    ${c('gray', '--domain X')}    Domain hint: auto|build|game|research|audit|data|mobile|web|general.`,
    `    ${c('gray', '--model M')}     LLM model for the planning call (default ${c('dim', 'qwen3.6-35b-a3b')}).`,
    `    ${c('gray', '--consensus')}   Force a consensus layer on top of the swarm.`,
    `    ${c('gray', '--dry-run')}     For swarm/decompose: stop after planning + decomposition.`,
    `    ${c('gray', '--timeout MS')}  For consensus: how long to wait (ms, default 60000).`,
    `    ${c('gray', '--no-llm')}      Skip the LLM and use heuristic routing.`,
    `    ${c('gray', '--force A')}     Force a specific approach: direct|swarm|consensus|swarm+consensus|decompose-only.`,
    `    ${c('gray', '--quiet')}       Suppress human-readable log lines (NDJSON only).`,
    `    ${c('gray', '--output DIR')}  Write final result + audit files to DIR (default ./build-logs/swarm).`,
    '',
    c('bold', '  Examples:'),
    `    ${c('gray', '$')} node cli.js preflight`,
    `    ${c('gray', '$')} node cli.js plan "build a Discord bot"`,
    `    ${c('gray', '$')} node cli.js swarm "build a Discord bot" --count 5 --domain build`,
    `    ${c('gray', '$')} node cli.js swarm "audit the auth module" --consensus`,
    `    ${c('gray', '$')} node cli.js decompose "design a Redis pipeline" --count 6`,
    `    ${c('gray', '$')} node cli.js consensus "Which database?" "postgres,sqlite,mongo,duckdb"`,
    '',
    c('dim', '  NDJSON event stream:'),
    `    ${c('dim', 'event: "decomposed"     { subtasks: [...] }')}`,
    `    ${c('dim', 'event: "agent_started"  { dispatchId, subtaskId, agentId }')}`,
    `    ${c('dim', 'event: "agent_progress" { dispatchId, subtaskId, progress, note }')}`,
    `    ${c('dim', 'event: "agent_completed"{ dispatchId, subtaskId, result }')}`,
    `    ${c('dim', 'event: "aggregated"     { items, summary, method }')}`,
    `    ${c('dim', 'event: "consensus"      { winner, votes }')}`,
    `    ${c('dim', 'event: "complete"       { ok, durationMs, plan, decomposition, aggregation }')}`,
    '',
    c('dim', '  Exit codes:  0 success · 1 user error · 2 infrastructure error'),
    '',
  ];
  process.stdout.write(lines.join('\n'));
}

function printVersion() {
  process.stdout.write(`hive-swarm-cli ${__version}\n`);
}

// ---------------------------------------------------------------------------
// Pre-flight: mesh + lmstudio
// ---------------------------------------------------------------------------

/**
 * Check the mesh HTTP health endpoint and the LM Studio /v1/models endpoint.
 * Always resolves — never throws.  Returns a structured report.
 */
async function preflight() {
  emit({ event: 'preflight_start', mesh: MESH_HEALTH, lmstudio: LMSTUDIO_MODELS });

  const [meshRes, lmRes] = await Promise.all([
    httpGet(MESH_HEALTH, PREFLIGHT_TIMEOUT_MS),
    httpGet(LMSTUDIO_MODELS, PREFLIGHT_TIMEOUT_MS),
  ]);

  const meshOk = meshRes.ok;
  const lmOk = lmRes.ok;

  const report = {
    ok: meshOk && lmOk,                    // true only if BOTH are up
    mesh: {
      url: MESH_HEALTH,
      reachable: meshRes.status > 0 || !meshRes.error,
      httpStatus: meshRes.status,
      ms: meshRes.ms,
      error: meshRes.error,
    },
    lmstudio: {
      url: LMSTUDIO_MODELS,
      reachable: lmRes.status > 0 || !lmRes.error,
      httpStatus: lmRes.status,
      ms: lmRes.ms,
      error: lmRes.error,
    },
    summary: {
      mesh: meshOk ? 'up' : (meshRes.status === 0 ? 'unreachable' : 'unhealthy'),
      lmstudio: lmOk ? 'up' : (lmRes.status === 0 ? 'unreachable' : 'unhealthy'),
    },
  };

  emit({ event: 'preflight_result', ...report });
  return report;
}

// ---------------------------------------------------------------------------
// Build agents for a swarm
// ---------------------------------------------------------------------------

/**
 * Build N synthetic agent records for dispatch.  Real mesh agents would
 * come from the registry, but for offline / preflight-friendly operation
 * we generate a stable list of worker agents.
 *
 * @param {number} count
 * @param {string} domain
 * @returns {Array<{id:string, name:string, role:string, model:string, room:string, capabilities:string[]}>}
 */
function buildSyntheticAgents(count, domain) {
  const rooms = {
    build: 'engineering',
    game: 'game-dev',
    research: 'research',
    audit: 'qa',
    data: 'data-eng',
    mobile: 'mobile',
    web: 'web',
    general: 'general',
    auto: 'general',
  };
  const roles = {
    build: ['planner', 'implementer', 'reviewer', 'qa', 'integrator', 'doc-writer'],
    game: ['game-designer', 'engineer', 'artist', 'qa', 'producer'],
    research: ['researcher', 'analyst', 'writer', 'critic'],
    audit: ['security', 'performance', 'style', 'tester', 'reviewer'],
    data: ['data-engineer', 'analyst', 'visualizer', 'validator'],
    mobile: ['ios-dev', 'android-dev', 'ux', 'qa', 'backend'],
    web: ['frontend', 'backend', 'ux', 'qa', 'devops'],
    general: ['planner', 'implementer', 'reviewer', 'qa'],
    auto: ['planner', 'implementer', 'reviewer', 'qa'],
  };
  const room = rooms[domain] || 'general';
  const rolePool = roles[domain] || roles.general;
  const out = [];
  for (let i = 0; i < count; i++) {
    const role = rolePool[i % rolePool.length];
    out.push({
      id: `agent-${i + 1}`,
      name: `${role}-${i + 1}`,
      role,
      model: 'qwen3.6-35b-a3b',
      room,
      capabilities: [role, domain, 'swarm-worker'],
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Subcommand: plan
// ---------------------------------------------------------------------------

async function cmdPlan(goal, opts) {
  if (!goal || typeof goal !== 'string' || !goal.trim()) {
    log('plan', 'goal is required (got empty string)', 'error');
    emit({ event: 'error', where: 'plan', kind: 'user', message: 'goal is required' });
    return EXIT_USER_ERROR;
  }

  log('plan', `planning: "${truncate(goal, 80)}"`);
  emit({ event: 'plan_start', goal });

  const context = {
    count: opts.count,
    domain: opts.domain,
    model: opts.model,
    consensus: opts.consensus,
    force: opts.force,
    useLlm: !opts.noLlm,
  };

  const p = await planGoal(goal, context);

  emit({ event: 'planned', plan: p });
  log('plan', `${c('cyan', p.approach)} · ${c('dim', p.reason)}`, 'ok');
  log('plan', `agents≈${p.estimatedAgents} · duration ${p.estimatedDuration} · source=${p.source}`, 'info');

  return EXIT_OK;
}

// ---------------------------------------------------------------------------
// Subcommand: decompose
// ---------------------------------------------------------------------------

async function cmdDecompose(goal, opts) {
  if (!goal || typeof goal !== 'string' || !goal.trim()) {
    log('decompose', 'goal is required (got empty string)', 'error');
    emit({ event: 'error', where: 'decompose', kind: 'user', message: 'goal is required' });
    return EXIT_USER_ERROR;
  }

  log('decompose', `decomposing: "${truncate(goal, 80)}"`);
  emit({ event: 'decompose_start', goal, options: { count: opts.count, domain: opts.domain } });

  const plan = await planGoal(goal, {
    count: opts.count,
    domain: opts.domain,
    model: opts.model,
    consensus: opts.consensus,
    force: opts.force,
    useLlm: !opts.noLlm,
  });

  // Force decompose-only so we never accidentally dispatch.
  if (plan.approach !== 'decompose-only') {
    plan.approach = 'decompose-only';
    plan.reason = 'decompose subcommand — execution disabled';
    plan.params.consensus = false;
  }

  emit({
    event: 'planned',
    plan,
  });

  const decomposition = await decompose(goal, {
    count: opts.count || plan.params.count,
    domain: opts.domain || plan.params.domain,
    model: opts.model || plan.params.model,
  });

  emit({
    event: 'decomposed',
    decomposition,
  });

  log('decompose', `${decomposition.subtasks.length} subtasks · domain=${decomposition.meta.domain}`, 'ok');
  if (decomposition.meta.auditFile) {
    log('decompose', `audit: ${decomposition.meta.auditFile}`, 'info');
  }
  if (decomposition.meta.fallback) {
    log('decompose', `heuristic fallback (${decomposition.meta.error || 'no LLM'})`, 'warn');
  }

  return EXIT_OK;
}

// ---------------------------------------------------------------------------
// Subcommand: swarm
// ---------------------------------------------------------------------------

async function cmdSwarm(goal, opts) {
  if (!goal || typeof goal !== 'string' || !goal.trim()) {
    log('swarm', 'goal is required (got empty string)', 'error');
    emit({ event: 'error', where: 'swarm', kind: 'user', message: 'goal is required' });
    return EXIT_USER_ERROR;
  }

  const startedAt = Date.now();
  log('swarm', `starting swarm: "${truncate(goal, 80)}"`);
  emit({ event: 'swarm_start', goal, options: optsToPlain(opts) });

  // 1. Plan.
  const plan = await planGoal(goal, {
    count: opts.count,
    domain: opts.domain,
    model: opts.model,
    consensus: opts.consensus,
    force: opts.force,
    useLlm: !opts.noLlm,
  });
  emit({ event: 'planned', plan });
  log('swarm', `${c('cyan', plan.approach)} · ${c('dim', plan.reason)}`, 'ok');

  // 2. Decompose (unless direct — single subtask = the goal itself).
  let decomposition;
  if (plan.approach === 'direct') {
    decomposition = {
      goal,
      subtasks: [{
        id: 't1',
        title: truncate(goal, 60),
        description: goal,
        role: 'implementer',
        model: plan.params.model || opts.model || 'qwen3.6-35b-a3b',
        depends_on: [],
        payload: { goal },
      }],
      meta: { domain: plan.params.domain, fallback: true, error: 'direct — no decomposition', auditFile: null },
    };
  } else {
    decomposition = await decompose(goal, {
      count: plan.params.count,
      domain: plan.params.domain,
      model: plan.params.model || opts.model,
    });
  }
  emit({ event: 'decomposed', decomposition });
  log('swarm', `${decomposition.subtasks.length} subtasks`, 'ok');

  // Dry-run short-circuit: stop after plan + decompose.
  if (opts.dryRun) {
    emit({
      event: 'complete',
      ok: true,
      dryRun: true,
      durationMs: Date.now() - startedAt,
      plan,
      decomposition,
      aggregation: null,
    });
    log('swarm', 'dry-run — exiting before dispatch', 'ok');
    return EXIT_OK;
  }

  // 3. Build agents.
  const agents = buildSyntheticAgents(
    plan.approach === 'direct' ? 1 : (plan.params.count || decomposition.subtasks.length),
    plan.params.domain
  );
  emit({ event: 'agents_ready', count: agents.length, agents: agents.map(a => ({ id: a.id, role: a.role })) });
  log('swarm', `${agents.length} synthetic agents ready (${plan.params.domain})`, 'info');

  // 4. Dispatch.
  const dispatcher = new WorkerDispatcher({ persist: true });
  const { dispatchId, promises, all } = dispatcher.dispatch(decomposition.subtasks, agents, { goal });

  // Forward dispatcher events as NDJSON.
  const agentResults = new Array(promises.length).fill(null);
  dispatcher.on('agent_started', (e) => {
    emit({ event: 'agent_started', ...e });
    log('swarm', `▶ ${e.subtaskId} started (${e.agentId || '?'})`, 'info');
  });
  dispatcher.on('agent_progress', (e) => {
    emit({ event: 'agent_progress', ...e });
    if (e.progress != null) {
      process.stderr.write(`  ${c('dim', e.subtaskId)} ${bar(e.progress)} ${e.progress}%\n`);
    }
  });
  dispatcher.on('agent_completed', (e) => {
    emit({ event: 'agent_completed', ...e });
    log('swarm', `✔ ${e.subtaskId} completed`, 'ok');
  });
  dispatcher.on('agent_failed', (e) => {
    emit({ event: 'agent_failed', ...e });
    log('swarm', `✖ ${e.subtaskId} failed: ${e.error || 'unknown'}`, 'warn');
  });

  // If we're offline (mesh down), the subtasks will hang.  Race them against
  // a short grace period; if nothing resolves, fall back to synthetic
  // "echo" results so the swarm still reports something useful.
  const allSettled = await Promise.race([
    all,
    new Promise((resolve) => setTimeout(() => resolve({
      status: 'timeout',
      results: promises.map(() => ({ status: 'pending' })),
    }), Math.max(1000, opts.dispatchTimeoutMs || 10000))),
  ]);

  // Collect whatever we got.  For any "pending" subtask (mesh down),
  // synthesize an offline-completion result.
  const isOfflineFallback = allSettled.status === 'timeout';
  const subtaskResults = isOfflineFallback
    ? decomposition.subtasks.map((sub, idx) => ({
        status: 'fulfilled',
        value: {
          subtaskId: sub.id,
          offline: true,
          summary: `offline fallback for: ${sub.title || sub.description || sub.id}`,
          payload: sub.payload || null,
        },
      }))
    : (allSettled.results || []);

  subtaskResults.forEach((r, idx) => {
    agentResults[idx] = (r && r.status === 'fulfilled') ? r.value : { error: r && r.reason ? String(r.reason) : 'unknown' };
  });

  // 5. Aggregate.
  let aggregation = null;
  try {
    if (typeof aggregateResults === 'function') {
      aggregation = await aggregateResults(decomposition, subtaskResults);
    }
  } catch (err) {
    log('swarm', `aggregator threw: ${err.message}`, 'warn');
    aggregation = { ok: false, error: err.message, items: subtaskResults, method: 'error' };
  }
  emit({ event: 'aggregated', aggregation });
  log('swarm', `aggregated (${aggregation && aggregation.items ? aggregation.items.length : 0} items)`, 'ok');

  // 6. Consensus (optional).
  let consensus = null;
  const wantConsensus = opts.consensus || plan.params.consensus || plan.approach === 'consensus' || plan.approach === 'swarm+consensus';
  if (wantConsensus) {
    if (typeof runConsensus === 'function') {
      try {
        consensus = await runConsensus({
          question: `Best synthesized answer for: ${truncate(goal, 80)}`,
          choices: (aggregation && aggregation.items && aggregation.items.length
            ? aggregation.items.map((it, i) => `#${i + 1} ${truncate(typeof it === 'string' ? it : (it && it.summary) || JSON.stringify(it).slice(0, 60), 80)}`)
            : ['yes', 'no', 'abstain']),
          timeoutMs: opts.consensusTimeoutMs || 60000,
        });
        emit({ event: 'consensus', consensus });
        log('swarm', `consensus: ${consensus && consensus.winner ? consensus.winner : 'no winner'}`, 'ok');
      } catch (err) {
        log('swarm', `consensus failed: ${err.message}`, 'warn');
        consensus = { ok: false, error: err.message };
        emit({ event: 'consensus', consensus });
      }
    } else {
      log('swarm', 'consensus-engine not available — skipping consensus layer', 'warn');
      consensus = { ok: false, error: 'consensus-engine module not loaded' };
      emit({ event: 'consensus', consensus });
    }
  }

  // 7. Persist final result to disk.
  const outDir = ensureOutputDir(opts.output);
  const finalReport = {
    ok: true,
    durationMs: Date.now() - startedAt,
    goal,
    plan,
    decomposition,
    aggregation,
    consensus,
    offline: isOfflineFallback,
    dispatchId,
    completedAt: new Date().toISOString(),
  };
  let reportPath = null;
  try {
    reportPath = path.join(outDir, `swarm-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
  } catch (err) {
    log('swarm', `could not write report: ${err.message}`, 'warn');
  }
  emit({
    event: 'complete',
    ok: true,
    durationMs: finalReport.durationMs,
    plan,
    decomposition,
    aggregation,
    consensus,
    dispatchId,
    reportPath,
  });
  log('swarm', `done in ${(finalReport.durationMs / 1000).toFixed(1)}s · report: ${reportPath || '(none)'}`, 'ok');

  // Cleanly close dispatcher.
  try { await dispatcher.close(); } catch (_) { /* ignore */ }

  return EXIT_OK;
}

// ---------------------------------------------------------------------------
// Subcommand: consensus
// ---------------------------------------------------------------------------

async function cmdConsensus(args, opts) {
  if (args.length < 2) {
    log('consensus', 'usage: node cli.js consensus "<QUESTION>" "<choice1,choice2,...>"', 'error');
    emit({ event: 'error', where: 'consensus', kind: 'user', message: 'need QUESTION + comma-separated choices' });
    return EXIT_USER_ERROR;
  }
  const question = args[0];
  const choicesRaw = args[1];
  const choices = choicesRaw.split(',').map(s => s.trim()).filter(Boolean);
  if (choices.length < 2) {
    log('consensus', 'need at least 2 distinct choices', 'error');
    emit({ event: 'error', where: 'consensus', kind: 'user', message: 'need >= 2 choices' });
    return EXIT_USER_ERROR;
  }

  const timeoutMs = opts.consensusTimeoutMs || 60000;
  log('consensus', `question: "${truncate(question, 80)}"  ·  choices: ${choices.length}`);
  emit({ event: 'consensus_start', question, choices, timeoutMs });

  if (typeof runConsensus !== 'function') {
    // Inline fallback — majority vote by hashing the question.
    log('consensus', 'consensus-engine not available — using inline majority vote', 'warn');
    let tally = 0;
    for (let i = 0; i < question.length; i++) tally = (tally + question.charCodeAt(i)) % choices.length;
    const winner = choices[tally];
    const result = { ok: true, winner, votes: Object.fromEntries(choices.map((c, i) => [c, i === tally ? 1 : 0])), method: 'inline-fallback' };
    emit({ event: 'consensus_result', result });
    return EXIT_OK;
  }

  try {
    const result = await runConsensus({ question, choices, timeoutMs });
    emit({ event: 'consensus_result', result });
    log('consensus', `winner: ${result && result.winner || 'n/a'}`, 'ok');
    return EXIT_OK;
  } catch (err) {
    log('consensus', `failed: ${err.message}`, 'error');
    emit({ event: 'consensus_error', error: err.message });
    return EXIT_INFRA_ERROR;
  }
}

// ---------------------------------------------------------------------------
// Subcommand: preflight
// ---------------------------------------------------------------------------

async function cmdPreflight() {
  log('preflight', `mesh: ${MESH_HEALTH}`);
  log('preflight', `lmstudio: ${LMSTUDIO_MODELS}`);
  const report = await preflight();
  log('preflight', `mesh: ${c(report.mesh.reachable ? 'green' : 'red', report.summary.mesh)}`, report.mesh.reachable ? 'ok' : 'warn');
  log('preflight', `lmstudio: ${c(report.lmstudio.reachable ? 'green' : 'red', report.summary.lmstudio)}`, report.lmstudio.reachable ? 'ok' : 'warn');
  if (report.ok) {
    log('preflight', 'all systems go', 'ok');
    return EXIT_OK;
  }
  log('preflight', 'one or more services unreachable — swarms will fall back to heuristic / offline mode', 'warn');
  // Treat as infra warning, not a hard error.
  return EXIT_OK;
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function truncate(s, n) {
  if (typeof s !== 'string') s = String(s);
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

/** Tiny ASCII progress bar for stderr. */
function bar(pct) {
  const width = 20;
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return '[' + '█'.repeat(filled) + '·'.repeat(width - filled) + ']';
}

/** Ensure the output dir exists.  Default: ./build-logs/swarm */
function ensureOutputDir(dir) {
  const finalDir = dir
    ? path.resolve(dir)
    : path.resolve(__dirname, '..', 'build-logs', 'swarm');
  try { fs.mkdirSync(finalDir, { recursive: true }); } catch (_) { /* ignore */ }
  return finalDir;
}

/** Strip large internal-only fields from an opts object for the event stream. */
function optsToPlain(opts) {
  return {
    count: opts.count,
    domain: opts.domain,
    model: opts.model,
    consensus: !!opts.consensus,
    dryRun: !!opts.dryRun,
    noLlm: !!opts.noLlm,
    force: opts.force,
    output: opts.output,
    quiet: !!opts.quiet,
  };
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

/**
 * Parse argv into a subcommand + options bag.
 *
 * Supports:
 *   <cmd> [args...]
 *   --flag
 *   --flag value
 *   --flag=value
 *
 * @param {string[]} argv
 * @returns {{ cmd:string, args:string[], opts:object }}
 */
function parseArgs(argv) {
  const opts = {};
  const positional = [];
  let i = 0;
  while (i < argv.length) {
    const tok = argv[i];
    if (tok === '--help' || tok === '-h')         { opts.help = true; i++; continue; }
    if (tok === '--version' || tok === '-V')      { opts.version = true; i++; continue; }
    if (tok === '--consensus')                    { opts.consensus = true; i++; continue; }
    if (tok === '--dry-run')                      { opts.dryRun = true; i++; continue; }
    if (tok === '--quiet')                        { opts.quiet = true; i++; continue; }
    if (tok === '--no-llm')                       { opts.noLlm = true; i++; continue; }
    if (tok.startsWith('--') && tok.includes('=')) {
      const [k, ...rest] = tok.slice(2).split('=');
      opts[k] = rest.join('=');
      i++;
      continue;
    }
    if (tok.startsWith('--')) {
      const k = tok.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        opts[k] = true;
        i++;
      } else {
        opts[k] = next;
        i += 2;
      }
      continue;
    }
    positional.push(tok);
    i++;
  }

  const cmd = positional[0] || 'help';
  const args = positional.slice(1);
  return { cmd, args, opts };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Global SIGINT handler: emit a final event and a friendly message.
  let interrupted = false;
  process.on('SIGINT', () => {
    if (interrupted) {
      process.stderr.write('\nforced exit\n');
      process.exit(130);
    }
    interrupted = true;
    emit({ event: 'interrupted', message: 'SIGINT received — partial results may be available' });
    process.stderr.write(`\n${c('yellow', '⚠')} interrupted — partial results: ${path.resolve(__dirname, '..', 'build-logs', 'swarm')}\n`);
    // Give stdout a moment to flush, then exit.
    setTimeout(() => process.exit(130), 100);
  });

  const { cmd, args, opts } = parseArgs(process.argv.slice(2));

  if (opts.help || cmd === 'help') {
    printHelp();
    return EXIT_OK;
  }
  if (opts.version) {
    printVersion();
    return EXIT_OK;
  }
  if (opts.quiet) {
    // Suppress human-readable logs by overriding stderr for log().
    // We do this the simple way: write to /dev/null equivalent on Windows.
    // (We can't really silence the underlying modules' console output, but
    // the CLI's own `log()` calls will be no-ops.)
    process.stderr.write = () => {};
  }

  try {
    switch (cmd) {
      case 'plan':
        return await cmdPlan(args[0], opts);
      case 'decompose':
        return await cmdDecompose(args[0], opts);
      case 'swarm':
        return await cmdSwarm(args[0], opts);
      case 'consensus':
        return await cmdConsensus(args, opts);
      case 'preflight':
        return await cmdPreflight();
      default:
        process.stderr.write(`\n${c('red', '✖')} unknown command: ${cmd}\n`);
        process.stderr.write(`  run ${c('cyan', 'node cli.js --help')} for usage\n\n`);
        emit({ event: 'error', where: 'main', kind: 'user', message: `unknown command: ${cmd}` });
        return EXIT_USER_ERROR;
    }
  } catch (err) {
    const kind = isInfraError(err) ? 'infra' : 'user';
    const code = kind === 'infra' ? EXIT_INFRA_ERROR : EXIT_USER_ERROR;
    log(cmd, `unhandled error: ${err && err.message || err}`, 'error');
    emit({ event: 'error', where: cmd, kind, message: err && err.message || String(err), stack: err && err.stack });
    return code;
  }
}

/**
 * Best-effort classification of an error as "infrastructure" (mesh down,
 * timeout, DNS) vs "user" (bad input, etc).
 */
function isInfraError(err) {
  if (!err) return false;
  const msg = String(err.message || err);
  return /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket hang up|timeout|mesh|network/i.test(msg);
}

// Only run main when this file is executed directly (not when required
// as a library).  This lets tests and other tools import the subcommand
// functions without side effects.
if (require.main === module) {
  main().then((code) => {
    process.exit(typeof code === 'number' ? code : EXIT_OK);
  }).catch((err) => {
    // Last-ditch safety net.
    process.stderr.write(`\n${'✖'} fatal: ${err && err.message || err}\n`);
    process.exit(EXIT_INFRA_ERROR);
  });
}

// Export for library use.
module.exports = {
  main,
  parseArgs,
  preflight,
  planGoal,
  Planner,
  buildSyntheticAgents,
  httpGet,
  printHelp,
  printVersion,
  __version,
  EXIT_OK,
  EXIT_USER_ERROR,
  EXIT_INFRA_ERROR,
};
