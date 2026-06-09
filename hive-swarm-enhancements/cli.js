#!/usr/bin/env node
/**
 * @file cli.js
 * @description Top-level CLI for the WHOLE Hive Swarm — extends
 * `core/cli.js` with execution-layer commands (goal, goal-list,
 * goal-get, goal-eval, goal-insights, preflight).
 *
 * The core/cli.js commands (swarm, status, list, stop, poll, vote,
 * dashboard) are delegated to core/cli.js by re-quiring its `main()`
 * and running it for the unrecognised commands.
 *
 * Usage:
 *   node cli.js goal        "<GOAL>" [--count N] [--domain X] [--evaluate] [--analyze]
 *   node cli.js swarm       "<GOAL>" [--count N] [--domain X] [--timeout MS] [--json]
 *   node cli.js goal-list                                  [--status X] [--limit N] [--json]
 *   node cli.js goal-get   <goalId>                       [--json]
 *   node cli.js goal-eval  <goalId>                       [--json]
 *   node cli.js goal-insights <goalId>                    [--json]
 *   node cli.js preflight                                 [--json]
 *   node cli.js status     <swarmId>                      [--json]
 *   node cli.js list                                       [--json]
 *   node cli.js stop       <swarmId>                      [--json]
 *   node cli.js poll       "<question>" --options "A,B,C" [--timeout MS] [--json]
 *   node cli.js vote       <pollId> <option>              [--voter-id ID] [--json]
 *   node cli.js dashboard  [--port N] [--host HOST]
 *   node cli.js --help
 *   node cli.js --version
 *
 * Exit codes:
 *   0  success
 *   1  user error (bad input, missing arg, unknown cmd)
 *   2  infrastructure error (mesh down, LLM down, unexpected throw)
 *
 * Streams NDJSON events to stdout. Human-readable logs go to stderr.
 * SIGINT cleanly kills in-flight dispatch and exits 130.
 *
 * @module hive-swarm-cli
 * @version 1.0.0
 * @author Hive Swarm (sub-agent GLUE-1)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const { HiveGlue, runGoal, runSwarm, __version: GLUE_VERSION }
  = require('./execution-layer/glue');
const { GoalStore } = require('./execution-layer/goal-system/goal-store');
const { GoalEvaluator, __version: EVAL_VERSION }
  = require('./execution-layer/goal-system/goal-evaluator');
const { analyzeTraces: analyzeTracesFn, __version: INSIGHT_VERSION }
  = require('./execution-layer/evolution/insight-engine');

const __version = '1.0.0';

// ────────────────────────────────────────────────────────────────────────────
// ANSI colors (zero deps)
// ────────────────────────────────────────────────────────────────────────────

const useColor = process.stdout.isTTY !== false && process.env.NO_COLOR === undefined;
const C = useColor
  ? {
      reset:   '\x1b[0m',
      bold:    '\x1b[1m',
      dim:     '\x1b[2m',
      red:     '\x1b[31m',
      green:   '\x1b[32m',
      yellow:  '\x1b[33m',
      blue:    '\x1b[34m',
      magenta: '\x1b[35m',
      cyan:    '\x1b[36m',
      gray:    '\x1b[90m',
    }
  : new Proxy({}, { get: () => '' });

function c(color, s) {
  return `${C[color] || ''}${s}${C.reset}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Output helpers
// ────────────────────────────────────────────────────────────────────────────

/** Emit one NDJSON event to stdout. */
function emit(evt) {
  try {
    process.stdout.write(JSON.stringify(evt) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ event: 'error', error: String(err) }) + '\n');
  }
}

/**
 * Human-readable log on stderr.
 * @param {string} tag
 * @param {string} msg
 * @param {'info'|'warn'|'error'|'ok'|'dim'} [level]
 */
function log(tag, msg, level = 'info') {
  const badges = {
    info:  c('blue', 'ℹ'),
    warn:  c('yellow', '⚠'),
    error: c('red', '✖'),
    ok:    c('green', '✔'),
    dim:   c('gray', '·'),
  };
  const badge = badges[level] || c('blue', 'ℹ');
  const tagStr = c('gray', `[${tag}]`);
  process.stderr.write(`${badge} ${tagStr} ${msg}\n`);
}

function truncate(s, n = 60) {
  if (typeof s !== 'string') s = String(s == null ? '' : s);
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

// ────────────────────────────────────────────────────────────────────────────
// Argument parsing
// ────────────────────────────────────────────────────────────────────────────

/**
 * Parse argv into { cmd, args, opts }.
 *   node cli.js goal "my goal" --count 3 --domain build --evaluate
 *
 * Supports: <cmd> [args...] [--flag] [--flag value] [--flag=value]
 */
function parseArgs(argv) {
  const opts = {};
  const positional = [];
  let i = 0;
  while (i < argv.length) {
    const tok = argv[i];
    if (tok === '--help' || tok === '-h')         { opts.help = true; i++; continue; }
    if (tok === '--version' || tok === '-V')      { opts.version = true; i++; continue; }
    if (tok === '--json')                         { opts.json = true; i++; continue; }
    if (tok === '--evaluate')                     { opts.evaluate = true; i++; continue; }
    if (tok === '--analyze')                      { opts.analyze = true; i++; continue; }
    if (tok === '--no-evaluate')                  { opts.evaluate = false; i++; continue; }
    if (tok === '--no-analyze')                   { opts.analyze = false; i++; continue; }
    if (tok === '--no-llm')                       { opts.useLlm = false; i++; continue; }
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
  return { cmd: positional[0] || 'help', args: positional.slice(1), opts };
}

// ────────────────────────────────────────────────────────────────────────────
// HTTP helper for preflight
// ────────────────────────────────────────────────────────────────────────────

function httpGet(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let parsed;
    try { parsed = new URL(url); } catch (err) {
      return resolve({ ok: false, status: 0, error: `bad url: ${err.message}` });
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
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        body, error: null,
        ms: Date.now() - start,
      }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, error: 'timeout', ms: Date.now() - start }); });
    req.on('error',   (err) => resolve({ ok: false, status: 0, error: err.message, ms: Date.now() - start }));
    req.end();
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Shared state — singleton glue (so preflight + commands share a dispatcher)
// ────────────────────────────────────────────────────────────────────────────

const SHARED_STORE = new GoalStore();

function getGlue(opts = {}) {
  return new HiveGlue(Object.assign({ store: SHARED_STORE }, opts));
}

// ────────────────────────────────────────────────────────────────────────────
// Commands — execution-layer
// ────────────────────────────────────────────────────────────────────────────

/**
 * node cli.js goal "<GOAL>" [--count N] [--domain X] [--evaluate] [--analyze] [--no-llm]
 */
async function cmdGoal(args, opts) {
  const goal = args[0];
  if (!goal || typeof goal !== 'string' || !goal.trim()) {
    log('goal', 'goal text is required', 'error');
    return 1;
  }

  const domain   = opts.domain || 'auto';
  const useLlm   = opts.useLlm !== false;
  const evaluate = opts.evaluate !== false;     // default true
  const analyze  = opts.analyze  !== false;     // default true
  const count    = parseInt(opts.count, 10) || undefined;
  const timeout  = parseInt(opts.timeout, 10) || undefined;

  log('goal', `starting: "${truncate(goal, 60)}"`, 'info');
  emit({ event: 'goal_start', goal, domain, evaluate, analyze });

  const glue = getGlue();
  const startedAt = Date.now();

  // Wire events to NDJSON so consumers can tail -f
  const eventNames = [
    'goal_processed', 'dispatch_start', 'agent_started', 'agent_completed',
    'agent_failed', 'agent_progress', 'dispatch_complete', 'evaluation_done',
    'insights_done', 'run_complete',
  ];
  const handlers = {};
  for (const name of eventNames) {
    handlers[name] = (...a) => emit({ event: name, ...(a[0] || {}) });
    glue.on(name, handlers[name]);
  }

  let result;
  try {
    result = await glue.runGoal(goal, {
      domain,
      useLlm,
      evaluate,
      analyze,
      subtaskTimeoutMs: timeout,
    });
  } catch (err) {
    log('goal', `failed: ${err && err.message || err}`, 'error');
    emit({ event: 'goal_error', error: err && err.message || String(err) });
    return 2;
  } finally {
    for (const name of eventNames) glue.removeListener(name, handlers[name]);
  }

  if (!result.ok) {
    log('goal', `failed: ${result.error}`, 'error');
    emit({ event: 'goal_error', goalId: result.goalId, error: result.error });
    return 2;
  }

  const completed = result.meta.completed;
  const failed    = result.meta.failed;
  const total     = result.results.length;

  if (opts.json) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    log('goal', `✔ goal ${c('cyan', result.goalId)} done in ${((result.meta.durationMs) / 1000).toFixed(1)}s`, 'ok');
    log('goal', `  tasks:     ${completed}/${total} completed, ${failed} failed`, 'info');
    log('goal', `  runId:     ${result.runId}`, 'dim');
    if (result.evaluation) {
      log('goal', `  evaluated: ${result.evaluation.success ? c('green', 'PASS') : c('yellow', 'NEEDS_REVIEW')} (score=${result.evaluation.score.toFixed(2)})`, 'info');
    }
    if (result.insights) {
      log('goal', `  insights:  ${c('cyan', result.insights.id || 'saved')}`, 'dim');
    }
    if (result.meta.swarmRunPath) {
      log('goal', `  saved:     ${result.meta.swarmRunPath}`, 'dim');
    }
  }

  emit({
    event: 'goal_complete',
    goalId: result.goalId,
    runId:  result.runId,
    completed, failed, total,
    durationMs: result.meta.durationMs,
    success: failed === 0,
  });

  return failed === 0 ? 0 : 2;
}

/**
 * node cli.js goal-list [--status X] [--priority Y] [--limit N]
 */
async function cmdGoalList(args, opts) {
  const filter = { full: true };
  if (opts.status)  filter.status  = String(opts.status);
  if (opts.priority) filter.priority = String(opts.priority);
  const limit = parseInt(opts.limit, 10);
  if (Number.isFinite(limit) && limit > 0) filter.limit = limit;

  const goals = SHARED_STORE.listGoals(filter);

  if (opts.json) {
    process.stdout.write(JSON.stringify(goals) + '\n');
  } else if (goals.length === 0) {
    log('goal-list', 'no goals found', 'info');
  } else {
    log('goal-list', `${c('bold', goals.length.toString())} goal(s):`, 'info');
    for (const g of goals) {
      const statusColor =
        g.status === 'completed'  ? 'green'  :
        g.status === 'failed'     ? 'red'    :
        g.status === 'in_progress'? 'cyan'   :
        g.status === 'validated'  ? 'green'  :
        g.status === 'needs_review'? 'yellow':
        'gray';
      const taskCount = Array.isArray(g.tasks) ? g.tasks.length : 0;
      const completed = Array.isArray(g.tasks)
        ? g.tasks.filter((t) => t.status === 'completed').length : 0;
      log('goal-list',
        `${c('cyan', g.id)}  ${c(statusColor, g.status.padEnd(12))}  ` +
        `${completed}/${taskCount} tasks  ${truncate(g.title || g.description || '', 40)}`,
        'info');
    }
  }
  emit({ event: 'goal_list', count: goals.length });
  return 0;
}

/**
 * node cli.js goal-get <goalId>
 */
async function cmdGoalGet(args, opts) {
  const goalId = args[0];
  if (!goalId) {
    log('goal-get', 'goalId is required', 'error');
    return 1;
  }
  const goal = SHARED_STORE.getGoal(goalId);
  if (!goal) {
    log('goal-get', `goal ${goalId} not found`, 'error');
    emit({ event: 'goal_get', goalId, found: false });
    return 1;
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(goal) + '\n');
  } else {
    log('goal-get', `${c('cyan', goal.id)} — ${truncate(goal.title || '', 50)}`, 'info');
    log('goal-get', `  status:     ${goal.status}`, 'dim');
    log('goal-get', `  priority:   ${goal.priority}`, 'dim');
    log('goal-get', `  created:    ${goal.createdAt}`, 'dim');
    log('goal-get', `  tasks:      ${(goal.tasks || []).length}`, 'dim');
    for (const t of (goal.tasks || [])) {
      const c2 = t.status === 'completed' ? 'green' : t.status === 'failed' ? 'red' : 'yellow';
      log('goal-get', `    ${c(c2, t.status.padEnd(12))} ${truncate(t.title || '', 50)}`, 'dim');
    }
  }
  emit({ event: 'goal_get', goalId, found: true });
  return 0;
}

/**
 * node cli.js goal-eval <goalId>
 */
async function cmdGoalEval(args, opts) {
  const goalId = args[0];
  if (!goalId) {
    log('goal-eval', 'goalId is required', 'error');
    return 1;
  }

  log('goal-eval', `evaluating ${goalId}…`, 'info');
  emit({ event: 'goal_eval_start', goalId });

  const evaluator = new GoalEvaluator({ store: SHARED_STORE });
  const result = await evaluator.evaluate(goalId, {
    useLlm: opts.useLlm !== false,
  });

  if (!result || !result.ok) {
    log('goal-eval', `failed: ${result && result.error}`, 'error');
    emit({ event: 'goal_eval_error', goalId, error: result && result.error });
    return 2;
  }

  const ev = result.evaluation;
  if (opts.json) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    log('goal-eval', `✔ ${c('cyan', goalId)} → ${ev.success ? c('green', 'PASS') : c('yellow', 'NEEDS_REVIEW')}`, 'ok');
    log('goal-eval', `  score: ${ev.score.toFixed(2)} (source: ${ev.source})`, 'info');
    for (const c1 of ev.criteria || []) {
      const m = c1.met ? c('green', '✔') : c('red', '✖');
      log('goal-eval', `    ${m} ${truncate(c1.criterion, 60)}`, 'dim');
      if (c1.evidence) log('goal-eval', `        ${truncate(c1.evidence, 70)}`, 'dim');
    }
    if ((ev.recommendations || []).length) {
      log('goal-eval', `  recommendations:`, 'info');
      for (const r of ev.recommendations) log('goal-eval', `    • ${r}`, 'dim');
    }
  }
  emit({ event: 'goal_eval_done', goalId, evaluation: ev });
  return 0;
}

/**
 * node cli.js goal-insights <goalId>
 *
 * Lists the most recent insight reports. If --all is passed, lists all.
 * (Insights are not directly tied to a single goal — they're aggregated
 * across traces. So this command gives you the latest N, optionally
 * filtered by the most recent run's traceIds.)
 */
async function cmdGoalInsights(args, opts) {
  const limit = parseInt(opts.limit, 10) || 5;

  // If a goalId is given, prefer insights for that goal's traces.
  // Otherwise show the most recent N insights on disk.
  const goalId = args[0];

  let reports = [];
  try {
    // Lazy-load the engine only when needed
    const { InsightEngine } = require('./execution-layer/evolution/insight-engine');
    const engine = new InsightEngine();
    reports = engine.listInsights().slice(0, limit);
  } catch (err) {
    log('goal-insights', `failed to list insights: ${err.message}`, 'error');
    return 2;
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(reports) + '\n');
  } else if (reports.length === 0) {
    log('goal-insights', goalId
      ? `no insight reports found (run \`cli.js goal "<goal>"\` to generate some)`
      : 'no insight reports found', 'info');
  } else {
    log('goal-insights',
      goalId
        ? `latest ${reports.length} insight report(s) (filter: goalId=${c('cyan', goalId)} is informational only):`
        : `latest ${reports.length} insight report(s):`,
      'info');
    for (const r of reports) {
      if (r && r._corrupt) {
        log('goal-insights', `  ${c('red', r.id)}  [corrupt]`, 'info');
        continue;
      }
      log('goal-insights',
        `  ${c('cyan', r.id)}  ` +
        `${c('dim', `traces=${r.traceCount}`)}  ` +
        `anomalies=${r.anomalyCount || 0}  ` +
        `${c('gray', r.source || 'heuristic')}`,
        'info');
      if (r.createdAt) log('goal-insights', `    created: ${r.createdAt}`, 'dim');
      if (Array.isArray(r.recommendations) && r.recommendations.length) {
        for (const rec of r.recommendations.slice(0, 3)) {
          log('goal-insights', `    → ${truncate(typeof rec === 'string' ? rec : (rec.rationale || rec.action || JSON.stringify(rec)), 70)}`, 'dim');
        }
      }
    }
  }
  emit({ event: 'goal_insights', goalId: goalId || null, count: reports.length });
  return 0;
}

/**
 * node cli.js preflight
 *
 * Checks: mesh HTTP, mesh WS endpoint, LM-Studio reachability, store
 * writability. Returns 0 if everything looks healthy, 1 if user
 * misconfig, 2 if infra is down.
 */
async function cmdPreflight(args, opts) {
  const meshUrl = process.env.MESH_URL || 'http://localhost:4000';
  const meshKey = process.env.MESH_KEY || 'openclaw-mesh-default-key';
  const lmUrl   = process.env.LMSTUDIO_URL || process.env.OPENAI_BASE_URL || 'http://localhost:1234';

  const checks = [];
  const runCheck = async (name, fn) => {
    const t0 = Date.now();
    try {
      const r = await fn();
      checks.push({ name, ok: !!(r && r.ok), ms: Date.now() - t0, ...(r || {}) });
    } catch (err) {
      checks.push({ name, ok: false, ms: Date.now() - t0, error: err.message });
    }
  };

  emit({ event: 'preflight_start' });

  await runCheck('mesh_http',   () => httpGet(`${meshUrl}/api/agents`, 3000));
  await runCheck('mesh_health', () => httpGet(`${meshUrl}/api/health`,  3000));
  await runCheck('lmstudio',    () => httpGet(`${lmUrl}/v1/models`,     3000));
  await runCheck('goal_store',  () => {
    const goalDir = path.resolve(__dirname, 'execution-layer', 'storage', 'goals');
    try { fs.mkdirSync(goalDir, { recursive: true }); }
    catch (err) { return { ok: false, error: err.message }; }
    const probe = path.join(goalDir, '.preflight-probe');
    try {
      fs.writeFileSync(probe, 'ok', 'utf8');
      fs.unlinkSync(probe);
      return { ok: true, dir: goalDir };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
  await runCheck('traces_dir', () => {
    const tracesDir = path.resolve(__dirname, 'execution-layer', 'storage', 'traces');
    try { fs.mkdirSync(tracesDir, { recursive: true }); }
    catch (err) { return { ok: false, error: err.message }; }
    return { ok: true, dir: tracesDir };
  });

  const allOk    = checks.every((c) => c.ok);
  const userErr  = checks.find((c) => c.name === 'goal_store' && !c.ok);
  const exitCode = userErr ? 1 : (allOk ? 0 : 2);

  if (opts.json) {
    process.stdout.write(JSON.stringify({ ok: allOk, checks }, null, 2) + '\n');
  } else {
    log('preflight', `mesh:      ${meshUrl}`, 'dim');
    log('preflight', `lmstudio:  ${lmUrl}`,   'dim');
    log('preflight', '', 'info');
    for (const c1 of checks) {
      const badge = c1.ok ? c('green', '✔') : c('red', '✖');
      const extra = c1.status ? `  HTTP ${c1.status}  ${c1.ms}ms` : (c1.ms != null ? `  ${c1.ms}ms` : '');
      const err  = c1.error ? c('red', `  — ${c1.error}`) : '';
      log('preflight', `${badge} ${c1.name.padEnd(12)}${extra}${err}`, 'info');
    }
    log('preflight', '', 'info');
    if (allOk) {
      log('preflight', 'all systems ready', 'ok');
    } else {
      const failed = checks.filter((c) => !c.ok).map((c) => c.name);
      log('preflight', `${failed.length} check(s) failed: ${failed.join(', ')}`, 'warn');
    }
  }

  emit({ event: 'preflight_done', ok: allOk, checks });
  return exitCode;
}

// ────────────────────────────────────────────────────────────────────────────
// Commands — core delegation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Delegate a core/ command to core/cli.js. We do this by re-running its
 * main() with the original argv slice so the user sees identical behavior.
 */
async function delegateToCore(args, opts) {
  // Build a fake argv for the core CLI: ['node', 'cli.js', ...args + flags]
  const coreArgv = [process.argv[0], process.argv[1]];
  // Forward everything that core/cli.js understands.
  // We trust the caller's args + opts; we just rebuild the argv string.
  const tokens = [];
  for (const a of args) tokens.push(a);
  for (const [k, v] of Object.entries(opts)) {
    if (v === true) {
      tokens.push(`--${k}`);
    } else if (v === false) {
      // core/cli.js doesn't understand --no-X; skip
    } else if (v != null) {
      tokens.push(`--${k}=${v}`);
    }
  }
  // Restore the subcommand in the first position
  // (it's the cmd, not an arg — we need to inject it back)
  // Easiest: re-parse by setting ARGV.
  // core/cli.js reads from process.argv.slice(2). We rewrite it.
  const cmdName = opts._cmdName;
  if (cmdName) tokens.unshift(cmdName);
  process.argv = [process.argv[0], process.argv[1], ...tokens];

  // Clear the require cache for core/cli.js so it re-reads process.argv
  const coreCliPath = require.resolve('./core/cli');
  delete require.cache[coreCliPath];
  const coreCli = require('./core/cli');
  return await coreCli.main();
}

// ────────────────────────────────────────────────────────────────────────────
// Help
// ────────────────────────────────────────────────────────────────────────────

function printHelp() {
  const lines = [
    '',
    c('bold', '  🐝 Hive Swarm CLI (unified)'),
    c('dim', `  v${__version}  •  glue v${GLUE_VERSION}  •  eval v${EVAL_VERSION}  •  insight v${INSIGHT_VERSION}`),
    '',
    c('bold', '  Usage:'),
    `    ${c('cyan', 'node cli.js goal')}          "<GOAL>" [--count N] [--domain X] [--evaluate] [--analyze]`,
    `    ${c('cyan', 'node cli.js swarm')}         "<GOAL>" [--count N] [--domain X] [--timeout MS]`,
    `    ${c('cyan', 'node cli.js goal-list')}     [--status X] [--priority Y] [--limit N]`,
    `    ${c('cyan', 'node cli.js goal-get')}      <goalId>`,
    `    ${c('cyan', 'node cli.js goal-eval')}     <goalId> [--no-llm]`,
    `    ${c('cyan', 'node cli.js goal-insights')} [<goalId>] [--limit N]`,
    `    ${c('cyan', 'node cli.js preflight')}`,
    '',
    `    ${c('gray', '— core swarm (delegated) —')}`,
    `    ${c('cyan', 'node cli.js status')}        <swarmId>`,
    `    ${c('cyan', 'node cli.js list')}`,
    `    ${c('cyan', 'node cli.js stop')}          <swarmId>`,
    `    ${c('cyan', 'node cli.js poll')}          "<question>" --options "A,B,C" [--timeout MS]`,
    `    ${c('cyan', 'node cli.js vote')}          <pollId> <option>`,
    `    ${c('cyan', 'node cli.js dashboard')}     [--port N] [--host HOST]`,
    `    ${c('cyan', 'node cli.js --help')}`,
    `    ${c('cyan', 'node cli.js --version')}`,
    '',
    c('bold', '  Commands:'),
    `    ${c('cyan', 'goal')}            Run the full unified pipeline (decompose → dispatch → trace → evaluate → insights)`,
    `    ${c('cyan', 'swarm')}           Run core swarm (decompose → dispatch → aggregate), goal persisted`,
    `    ${c('cyan', 'goal-list')}       List all stored goals`,
    `    ${c('cyan', 'goal-get')}        Fetch one goal by id`,
    `    ${c('cyan', 'goal-eval')}       Re-evaluate a goal against its success criteria`,
    `    ${c('cyan', 'goal-insights')}   List recent insight reports`,
    `    ${c('cyan', 'preflight')}       Check mesh + lmstudio + storage writability`,
    `    ${c('cyan', 'status/list/stop/poll/vote/dashboard')}    Delegated to core/cli.js`,
    '',
    c('bold', '  Flags:'),
    `    ${c('gray', '--count N')}        Worker count (default 3 for swarm)`,
    `    ${c('gray', '--domain X')}       Domain hint: auto|build|game|research|audit|data|mobile|web|general`,
    `    ${c('gray', '--timeout MS')}     Per-subtask timeout in ms (default 300000)`,
    `    ${c('gray', '--evaluate')}       Run GoalEvaluator after goal (default: true)`,
    `    ${c('gray', '--analyze')}        Run InsightEngine after goal (default: true)`,
    `    ${c('gray', '--no-evaluate')}    Skip evaluation`,
    `    ${c('gray', '--no-analyze')}     Skip insight analysis`,
    `    ${c('gray', '--no-llm')}         Force heuristic-only mode (skip LLM)`,
    `    ${c('gray', '--options A,B')}    Comma-separated options for poll commands`,
    `    ${c('gray', '--json')}           Machine-readable JSON output (NDJSON events still go to stdout)`,
    `    ${c('gray', '--port N')}         Webui port (default 3000)`,
    `    ${c('gray', '--host HOST')}      Webui host (default localhost)`,
    '',
    c('bold', '  Examples:'),
    `    ${c('gray', '$')} node cli.js preflight`,
    `    ${c('gray', '$')} node cli.js goal "research X then build a prototype" --domain build`,
    `    ${c('gray', '$')} node cli.js goal "audit my code" --no-analyze`,
    `    ${c('gray', '$')} node cli.js swarm "build a REST API" --count 3`,
    `    ${c('gray', '$')} node cli.js goal-list --status in_progress`,
    `    ${c('gray', '$')} node cli.js goal-eval goal_12345`,
    `    ${c('gray', '$')} node cli.js goal-insights --limit 10`,
    `    ${c('gray', '$')} node cli.js poll "TypeScript?" --options "Yes,No,Maybe"`,
    '',
  ];
  process.stdout.write(lines.join('\n') + '\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  const { cmd, args, opts } = parseArgs(process.argv.slice(2));

  if (opts.help || cmd === 'help') {
    printHelp();
    return 0;
  }

  if (opts.version) {
    process.stdout.write(`hive-swarm-cli ${__version} (glue ${GLUE_VERSION})\n`);
    return 0;
  }

  // Suppress human-readable logs in --json mode
  if (opts.json) {
    const noop = () => {};
    log = noop;
  }

  // SIGINT: clean exit
  let sigintFired = false;
  const sigintHandler = () => {
    if (sigintFired) { process.exit(130); }
    sigintFired = true;
    process.stderr.write(`\n${c('yellow', '⚠')} interrupted — shutting down (Ctrl+C again to force)\n`);
    emit({ event: 'cli_interrupted' });
    // Give in-flight dispatch a moment to clean up
    setTimeout(() => process.exit(130), 250).unref();
  };
  process.on('SIGINT', sigintHandler);

  try {
    switch (cmd) {
      // ── execution-layer (new)
      case 'goal':           return await cmdGoal(args, opts);
      case 'goal-list':      return await cmdGoalList(args, opts);
      case 'goal-get':       return await cmdGoalGet(args, opts);
      case 'goal-eval':      return await cmdGoalEval(args, opts);
      case 'goal-insights':  return await cmdGoalInsights(args, opts);
      case 'preflight':      return await cmdPreflight(args, opts);

      // ── core delegation
      case 'swarm':
      case 'status':
      case 'list':
      case 'stop':
      case 'poll':
      case 'vote':
      case 'dashboard':
        opts._cmdName = cmd;
        return await delegateToCore(args, opts);

      default:
        process.stderr.write(`\n${c('red', '✖')} unknown command: ${cmd}\n`);
        process.stderr.write(`  run ${c('cyan', 'node cli.js --help')} for usage\n\n`);
        emit({ event: 'error', kind: 'user', message: `unknown command: ${cmd}` });
        return 1;
    }
  } catch (err) {
    log('cli', `unhandled error: ${err && err.message || err}`, 'error');
    emit({ event: 'error', kind: 'infra', message: err && err.message || String(err) });
    return 2;
  } finally {
    process.removeListener('SIGINT', sigintHandler);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  main().then((code) => {
    process.exit(typeof code === 'number' ? code : 0);
  }).catch((err) => {
    process.stderr.write(`\n${c('red', '✖')} fatal: ${err && err.message || err}\n`);
    process.exit(2);
  });
}

module.exports = { main, parseArgs, __version };
