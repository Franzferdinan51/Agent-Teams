#!/usr/bin/env node
/**
 * @file cli.js
 * Command-line interface for the Hive Swarm native swarm layer.
 *
 * Usage:
 *   node cli.js swarm        "your task here" [--count 3] [--domain build]
 *   node cli.js status       <swarmId>
 *   node cli.js list
 *   node cli.js stop         <swarmId>
 *   node cli.js poll         "Should we use TypeScript?" --options "Yes,No,Maybe"
 *   node cli.js vote         <pollId> <option>
 *   node cli.js dashboard
 *   node cli.js --help
 *
 * @author Hive Swarm (feature/swarm-enhancements)
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

const { runSwarm, Planner } = require('./planner');
const { createPoll, castVote, getPoll, ConsensusEngine } = require('./consensus-engine');

// ---------------------------------------------------------------------------
// ANSI colors (zero deps)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Global planner instance (used by status / list / stop)
// ---------------------------------------------------------------------------

const globalPlanner = new Planner();

// ---------------------------------------------------------------------------
// JSON-line output
// ---------------------------------------------------------------------------

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
 * @param {'info'|'warn'|'error'|'ok'} [level]
 */
function log(tag, msg, level = 'info') {
  const badges = {
    info:  c('blue', 'ℹ'),
    warn:  c('yellow', '⚠'),
    error: c('red', '✖'),
    ok:    c('green', '✔'),
  };
  const badge = badges[level] || c('blue', 'ℹ');
  const tagStr = c('gray', `[${tag}]`);
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stderr;
  stream.write(`${badge} ${tagStr} ${msg}\n`);
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

/**
 * GET a URL, resolve with { ok, status, body, error, ms }.
 * Never throws.
 */
function httpGet(url, timeoutMs = 5000) {
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
      res.on('end', () => resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        body,
        error: null,
        ms: Date.now() - start,
      }));
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 0, body: '', error: 'timeout', ms: Date.now() - start });
    });
    req.on('error', (err) => resolve({ ok: false, status: 0, body: '', error: err.message, ms: Date.now() - start }));
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

/**
 * Parse argv into { cmd, args, opts }.
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

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function truncate(s, n) {
  if (typeof s !== 'string') s = String(s);
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

// ---------------------------------------------------------------------------
// Command: swarm
// ---------------------------------------------------------------------------

async function cmdSwarm(args, opts) {
  const goal = args[0];
  if (!goal || typeof goal !== 'string' || !goal.trim()) {
    log('swarm', 'goal is required', 'error');
    return 1;
  }

  const count = parseInt(opts.count, 10) || 3;
  const domain = opts.domain || 'auto';
  const timeout = parseInt(opts.timeout, 10) || (5 * 60 * 1000);

  log('swarm', `starting: "${truncate(goal, 60)}"`, 'info');
  emit({ event: 'swarm_start', goal, count, domain });

  const swarmOptions = { count, domain, timeout };

  try {
    // runSwarm returns the full record
    const result = await runSwarm(goal, swarmOptions);

    if (opts.json) {
      process.stdout.write(JSON.stringify(result) + '\n');
    } else {
      log('swarm', `✔ swarm ${result.swarmId} done in ${((result.totalDuration || 0) / 1000).toFixed(1)}s`, 'ok');
      log('swarm', `  subtasks: ${result.subtasks ? result.subtasks.length : 0}`, 'info');
      log('swarm', `  synthesis: ${result.synthesis ? (result.synthesis.summary || 'ok') : 'n/a'}`, 'info');
      if (result.scores && result.scores.length > 0) {
        log('swarm', `  top score: ${result.scores[0] && result.scores[0].score}`, 'info');
      }
      if (result._savedPath) {
        log('swarm', `  saved: ${result._savedPath}`, 'dim');
      }
    }

    emit({ event: 'swarm_complete', swarmId: result.swarmId, ...result });
    return 0;
  } catch (err) {
    log('swarm', `failed: ${err && err.message || err}`, 'error');
    emit({ event: 'swarm_error', error: err && err.message || String(err) });
    return 2;
  }
}

// ---------------------------------------------------------------------------
// Command: status
// ---------------------------------------------------------------------------

async function cmdStatus(args, opts) {
  const swarmId = args[0];
  if (!swarmId) {
    log('status', 'swarmId is required', 'error');
    return 1;
  }

  const status = globalPlanner.getStatus(swarmId);
  if (!status) {
    log('status', `swarm ${swarmId} not found`, 'error');
    emit({ event: 'status', swarmId, found: false });
    return 1;
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(status) + '\n');
  } else {
    log('status', `swarm ${swarmId}`, 'info');
    log('status', `  goal:     ${truncate(status.goal || '', 60)}`, 'dim');
    log('status', `  status:   ${c(status.status === 'completed' ? 'green' : status.status === 'failed' ? 'red' : 'yellow', status.status)}`, 'info');
    log('status', `  duration: ${((status.totalDuration || 0) / 1000).toFixed(1)}s`, 'dim');
  }

  emit({ event: 'status', swarmId, status });
  return 0;
}

// ---------------------------------------------------------------------------
// Command: list
// ---------------------------------------------------------------------------

async function cmdList(args, opts) {
  const swarms = globalPlanner.listActive();

  if (opts.json) {
    process.stdout.write(JSON.stringify(swarms) + '\n');
  } else {
    if (swarms.length === 0) {
      log('list', 'no active swarms', 'info');
    } else {
      for (const s of swarms) {
        const color = s.status === 'completed' ? 'green' : s.status === 'failed' ? 'red' : s.status === 'stopped' ? 'yellow' : 'cyan';
        log('list', `${c(color, s.swarmId)}  ${truncate(s.goal || '', 40)}  ${s.status}`, 'info');
      }
    }
  }

  emit({ event: 'list', count: swarms.length, swarms });
  return 0;
}

// ---------------------------------------------------------------------------
// Command: stop
// ---------------------------------------------------------------------------

async function cmdStop(args, opts) {
  const swarmId = args[0];
  if (!swarmId) {
    log('stop', 'swarmId is required', 'error');
    return 1;
  }

  const result = globalPlanner.stop(swarmId);
  if (!result) {
    log('stop', `swarm ${swarmId} not found`, 'error');
    return 1;
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    if (result.stopped) {
      log('stop', `✔ stopped ${swarmId} (${result.killed} tasks killed)`, 'ok');
    } else {
      log('stop', `⚠ could not stop ${swarmId}: ${result.reason || 'no active dispatcher'}`, 'warn');
    }
  }

  emit({ event: 'stop', swarmId, ...result });
  return 0;
}

// ---------------------------------------------------------------------------
// Command: poll
// ---------------------------------------------------------------------------

async function cmdPoll(args, opts) {
  const topic = args[0];
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    log('poll', 'topic is required', 'error');
    return 1;
  }

  const optionsRaw = opts.options || 'Yes,No';
  const options = optionsRaw.split(',').map(s => s.trim()).filter(Boolean);
  if (options.length < 2) {
    log('poll', 'need at least 2 options (--options "A,B,C")', 'error');
    return 1;
  }

  const timeoutMs = parseInt(opts.timeout, 10) || 60000;

  log('poll', `creating poll: "${truncate(topic, 60)}"`, 'info');
  emit({ event: 'poll_create_start', topic, options, timeoutMs });

  try {
    const poll = await createPoll(topic, { options, timeout: timeoutMs });

    if (poll.error) {
      log('poll', `poll creation failed: ${poll.error}`, 'error');
      emit({ event: 'poll_create_error', error: poll.error });
      return 2;
    }

    if (opts.json) {
      process.stdout.write(JSON.stringify(poll) + '\n');
    } else {
      log('poll', `✔ poll created: ${c('cyan', poll.pollId)}`, 'ok');
      log('poll', `  topic:   ${topic}`, 'dim');
      log('poll', `  options: ${options.join(', ')}`, 'dim');
      log('poll', `  status:  ${poll.status}`, 'dim');
    }

    emit({ event: 'poll_created', poll });
    return 0;
  } catch (err) {
    log('poll', `failed: ${err && err.message || err}`, 'error');
    emit({ event: 'poll_error', error: err && err.message || String(err) });
    return 2;
  }
}

// ---------------------------------------------------------------------------
// Command: vote
// ---------------------------------------------------------------------------

async function cmdVote(args, opts) {
  const pollId = args[0];
  const option = args[1];
  if (!pollId || !option) {
    log('vote', 'usage: node cli.js vote <pollId> <option>', 'error');
    return 1;
  }

  const voterId = opts.voterId || `voter-${Date.now()}`;

  log('vote', `casting vote for "${option}" on poll ${pollId}`, 'info');
  emit({ event: 'vote_cast_start', pollId, voterId, option });

  try {
    const result = await castVote(pollId, voterId, option);

    if (result.error) {
      log('vote', `vote failed: ${result.error}`, 'error');
      emit({ event: 'vote_error', error: result.error });
      return 2;
    }

    if (opts.json) {
      process.stdout.write(JSON.stringify(result) + '\n');
    } else {
      log('vote', `✔ vote cast: ${option}`, 'ok');
    }

    emit({ event: 'vote_cast', pollId, voterId, option, ...result });
    return 0;
  } catch (err) {
    log('vote', `failed: ${err && err.message || err}`, 'error');
    emit({ event: 'vote_error', error: err && err.message || String(err) });
    return 2;
  }
}

// ---------------------------------------------------------------------------
// Command: dashboard
// ---------------------------------------------------------------------------

async function cmdDashboard(args, opts) {
  const port = parseInt(opts.port, 10) || 3000;
  const host = opts.host || 'localhost';

  log('dashboard', `starting webui on ${host}:${port}`, 'info');
  emit({ event: 'dashboard_start', host, port });

  // Try to spawn the webui server if available
  try {
    const webuiServerPath = path.resolve(__dirname, '..', 'webui', 'server.js');
    if (fs.existsSync(webuiServerPath)) {
      const { spawn } = require('child_process');
      const child = spawn('node', [webuiServerPath], {
        stdio: 'inherit',
        detached: true,
        env: { ...process.env, PORT: port, HOST: host },
      });
      child.unref();
      log('dashboard', `✔ webui spawned (pid ${child.pid})`, 'ok');
      return 0;
    }
  } catch (_) { /* fall through */ }

  // Fallback: start a minimal static server
  const webuiIndexPath = path.resolve(__dirname, '..', 'webui', 'public', 'index.html');
  if (!fs.existsSync(webuiIndexPath)) {
    log('dashboard', 'webui not found — run from hive-swarm-enhancements/ or install webui', 'error');
    return 2;
  }

  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      fs.readFile(webuiIndexPath, (err, data) => {
        if (err) { res.writeHead(500); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(port, host, () => {
    log('dashboard', `✔ listening on ${host}:${port}`, 'ok');
  });

  emit({ event: 'dashboard_listening', host, port });
  return 0;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  const lines = [
    '',
    c('bold', '  🐝 Hive Swarm CLI'),
    c('dim', '  v1.0.0'),
    '',
    c('bold', '  Usage:'),
    `    ${c('cyan', 'node cli.js swarm')}      "your task" [--count N] [--domain X] [--timeout MS] [--json]`,
    `    ${c('cyan', 'node cli.js status')}     <swarmId> [--json]`,
    `    ${c('cyan', 'node cli.js list')}       [--json]`,
    `    ${c('cyan', 'node cli.js stop')}       <swarmId> [--json]`,
    `    ${c('cyan', 'node cli.js poll')}       "question?" --options "Yes,No,Maybe" [--timeout MS] [--json]`,
    `    ${c('cyan', 'node cli.js vote')}       <pollId> <option> [--voter-id ID] [--json]`,
    `    ${c('cyan', 'node cli.js dashboard')} [--port N] [--host HOST]`,
    `    ${c('cyan', 'node cli.js --help')}`,
    '',
    c('bold', '  Commands:'),
    `    ${c('cyan', 'swarm')}       Run the full decompose → dispatch → aggregate pipeline`,
    `    ${c('cyan', 'status')}      Show status of a previously-run swarm`,
    `    ${c('cyan', 'list')}        List all tracked swarms (active and completed)`,
    `    ${c('cyan', 'stop')}       Stop an active swarm by killing its tasks`,
    `    ${c('cyan', 'poll')}        Create a new consensus poll with explicit options`,
    `    ${c('cyan', 'vote')}        Cast a vote on an active poll`,
    `    ${c('cyan', 'dashboard')}    Start the web UI server`,
    '',
    c('bold', '  Flags:'),
    `    ${c('gray', '--count N')}      Worker count (default 3)`,
    `    ${c('gray', '--domain X')}     Domain hint: auto|build|game|research|audit|data|mobile|web|general`,
    `    ${c('gray', '--timeout MS')}   Per-subtask timeout in ms (default 300000)`,
    `    ${c('gray', '--options A,B')}  Comma-separated options for poll commands`,
    `    ${c('gray', '--json')}         Machine-readable JSON output`,
    `    ${c('gray', '--port N')}       Webui port (default 3000)`,
    `    ${c('gray', '--host HOST')}    Webui host (default localhost)`,
    '',
    c('bold', '  Examples:'),
    `    ${c('gray', '$')} node cli.js swarm "build a REST API for my project" --count 3 --domain build`,
    `    ${c('gray', '$')} node cli.js swarm "audit my codebase" --count 4 --domain audit`,
    `    ${c('gray', '$')} node cli.js list`,
    `    ${c('gray', '$')} node cli.js stop swarm-1234567890`,
    `    ${c('gray', '$')} node cli.js poll "Should we use TypeScript?" --options "Yes,No,Maybe"`,
    `    ${c('gray', '$')} node cli.js vote abc123 "Yes"`,
    '',
  ];
  process.stdout.write(lines.join('\n') + '\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { cmd, args, opts } = parseArgs(process.argv.slice(2));

  if (opts.help || cmd === 'help') {
    printHelp();
    return 0;
  }

  if (opts.version) {
    process.stdout.write('hive-swarm-cli 1.0.0\n');
    return 0;
  }

  // Suppress logs if --json
  if (opts.json) {
    // Keep emit() working, but silence log()
    const origLog = log;
    log = () => {};
  }

  try {
    switch (cmd) {
      case 'swarm':
        return await cmdSwarm(args, opts);
      case 'status':
        return await cmdStatus(args, opts);
      case 'list':
        return await cmdList(args, opts);
      case 'stop':
        return await cmdStop(args, opts);
      case 'poll':
        return await cmdPoll(args, opts);
      case 'vote':
        return await cmdVote(args, opts);
      case 'dashboard':
        return await cmdDashboard(args, opts);
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
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

if (require.main === module) {
  main().then((code) => {
    process.exit(typeof code === 'number' ? code : 0);
  }).catch((err) => {
    process.stderr.write(`\n${c('red', '✖')} fatal: ${err && err.message || err}\n`);
    process.exit(2);
  });
}

module.exports = { main, parseArgs };
