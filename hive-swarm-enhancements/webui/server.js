/**
 * @file Hive Swarm Dashboard — Express + WebSocket relay server.
 *
 * This is the multi-agent master dashboard backend. It:
 *   - Serves the static SPA in `public/`
 *   - Exposes a REST API under `/api/*` for swarms, agents, consensus, logs
 *   - Hosts a WebSocket endpoint at `/ws` that bridges:
 *       browser <-> mesh server (localhost:4000)
 *       browser <-> hermes (internal bridge)
 *   - Persists swarm state to `build-logs/swarms.json` for durability
 *
 * Run: `npm start` (default port 8787, override with PORT env).
 * Mesh URL: `http://localhost:4000` (override with MESH_URL env).
 *
 * @module hive-swarm-dashboard
 */

'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const { WebSocketServer } = require('ws');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '8787', 10);
const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';
const MESH_WS_URL = process.env.MESH_WS_URL || 'ws://localhost:4000';
const MESH_API_KEY = process.env.MESH_API_KEY || 'openclaw-mesh-default-key';
const HERMES_BRIDGE_ENABLED =
  (process.env.HERMES_BRIDGE || 'true').toLowerCase() === 'true';
const HERMES_SOCKET = process.env.HERMES_SOCKET || null; // optional unix socket path

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
// swarm state is persisted alongside the other build artifacts
const BUILD_LOGS_DIR = path.join(ROOT_DIR, '..', 'build-logs');
const SWARMS_FILE = path.join(BUILD_LOGS_DIR, 'swarms.json');
const LOGS_FILE = path.join(BUILD_LOGS_DIR, 'dashboard.log');
const MAX_SWARMS = 200;
const MAX_LOG_LINES = 5000;
const MAX_POLL_BYTES = 1024 * 64; // 64KB cap on incoming WS frames

// ---------------------------------------------------------------------------
// Logging helpers — every line is timestamped ISO + level
// ---------------------------------------------------------------------------

/**
 * Format the current time as an ISO-8601 string with millisecond precision.
 * @returns {string} timestamp like "2026-06-09T03:14:15.926Z"
 */
function ts() {
  return new Date().toISOString();
}

/**
 * Emit a timestamped log line to stdout, and append to the rotating log file.
 * @param {'INFO'|'WARN'|'ERROR'|'DEBUG'} level severity
 * @param {string} msg human readable message
 * @param {object} [meta] optional structured metadata (will be JSON.stringified)
 */
function log(level, msg, meta) {
  const line =
    `[${ts()}] [${level}] ${msg}` +
    (meta !== undefined ? ' ' + safeJsonStringify(meta) : '');
  // stdout (or stderr for ERROR)
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  // best-effort append to dashboard.log
  try {
    fs.appendFileSync(LOGS_FILE, line + '\n', 'utf8');
  } catch (e) {
    // swallow — file logging is best-effort
  }
}

/**
 * JSON.stringify that never throws (replaces circular refs, drops functions).
 * @param {*} obj
 * @returns {string}
 */
function safeJsonStringify(obj) {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (k, v) => {
      if (typeof v === 'function') return '[Function]';
      if (v && typeof v === 'object') {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    });
  } catch (e) {
    return '[Unstringifiable]';
  }
}

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Swarm
 * @property {string} id         unique id (uuid-like)
 * @property {string} goal       user-supplied high-level goal
 * @property {number} count      requested worker count
 * @property {string} domain     optional domain hint (code, research, etc)
 * @property {string} status     one of: started | running | completed | failed | killed
 * @property {number} createdAt  epoch ms
 * @property {number} updatedAt  epoch ms
 * @property {Array}  subtasks   decomposed subtasks (filled in async)
 * @property {Array}  workers    worker agent ids assigned
 * @property {Array}  logs       recent log lines for this swarm
 * @property {string} [error]    failure reason if any
 */

/** @type {Map<string, Swarm>} */
const swarms = new Map();
/** @type {Map<string, Object>} pollId -> poll record */
const polls = new Map();
/** @type {Array<{ts:number,level:string,source:string,message:string,swarmId?:string}>} */
const recentLogs = [];
/** @type {Set<import('ws').WebSocket>} browser-side websocket clients */
const browserClients = new Set();
/** @type {import('ws').WebSocket|null} upstream mesh websocket */
let meshSocket = null;
let meshReconnectTimer = null;
let meshReconnectDelay = 1000;
let isShuttingDown = false;

// ---------------------------------------------------------------------------
// File-backed persistence (swarms.json)
// ---------------------------------------------------------------------------

/**
 * Load swarms.json from disk into the in-memory map (best-effort).
 * @returns {void}
 */
function loadSwarms() {
  try {
    if (!fs.existsSync(SWARMS_FILE)) return;
    const raw = fs.readFileSync(SWARMS_FILE, 'utf8');
    if (!raw.trim()) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    for (const s of arr) {
      if (s && s.id) swarms.set(s.id, s);
    }
    log('INFO', `Loaded ${swarms.size} swarm(s) from swarms.json`);
  } catch (e) {
    log('WARN', `Failed to load swarms.json: ${e.message}`);
  }
}

/**
 * Atomically persist the current swarm map to swarms.json.
 * @returns {Promise<void>}
 */
async function saveSwarms() {
  try {
    if (!fs.existsSync(BUILD_LOGS_DIR)) {
      await fsp.mkdir(BUILD_LOGS_DIR, { recursive: true });
    }
    const arr = Array.from(swarms.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_SWARMS);
    const tmp = SWARMS_FILE + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(arr, null, 2), 'utf8');
    await fsp.rename(tmp, SWARMS_FILE);
  } catch (e) {
    log('ERROR', `Failed to save swarms.json: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Generate a short, url-safe id. Not cryptographic.
 * @param {string} [prefix]
 * @returns {string}
 */
function makeId(prefix = '') {
  const rand = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return `${prefix}${t}-${rand}`;
}

/**
 * Append a log entry both to the rolling buffer and the per-swarm record.
 * @param {string} level
 * @param {string} source
 * @param {string} message
 * @param {string} [swarmId]
 */
function pushLog(level, source, message, swarmId) {
  const entry = {
    ts: Date.now(),
    level,
    source,
    message,
    swarmId: swarmId || undefined,
  };
  recentLogs.push(entry);
  // cap memory buffer
  if (recentLogs.length > MAX_LOG_LINES) {
    recentLogs.splice(0, recentLogs.length - MAX_LOG_LINES);
  }
  if (swarmId) {
    const s = swarms.get(swarmId);
    if (s) {
      s.logs = s.logs || [];
      s.logs.push(entry);
      if (s.logs.length > 500) s.logs.splice(0, s.logs.length - 500);
      s.updatedAt = entry.ts;
    }
  }
  // broadcast to all browser clients
  broadcastToBrowsers({ type: 'log', payload: entry });
}

/**
 * Wrap async route handlers so thrown errors become 500 JSON.
 * @param {Function} fn
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Send a JSON response. Centralized so we can tweak headers in one spot.
 * @param {import('express').Response} res
 * @param {number} status
 * @param {object} body
 */
function sendJson(res, status, body) {
  res.status(status).json(body);
}

// ---------------------------------------------------------------------------
// HTTP client to mesh (for proxied endpoints like /api/agents)
// ---------------------------------------------------------------------------

/**
 * Minimal fetch wrapper. Node 18+ has global fetch; we use it directly.
 * @param {string} url
 * @param {object} [opts]
 * @returns {Promise<{ok:boolean, status:number, body:any}>}
 */
async function meshFetch(url, opts = {}) {
  const headers = Object.assign(
    { 'X-API-Key': MESH_API_KEY, 'Content-Type': 'application/json' },
    opts.headers || {}
  );
  const timeoutMs = opts.timeoutMs || 5000;
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, headers, signal: controller.signal });
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: { error: e.message } };
  } finally {
    clearTimeout(tid);
  }
}

// ---------------------------------------------------------------------------
// Mesh WebSocket upstream — subscribe to mesh events and forward to browsers
// ---------------------------------------------------------------------------

/**
 * Connect (or reconnect) to the mesh WebSocket. All inbound messages are
 * re-broadcast to browser clients verbatim, with a small `source: 'mesh'`
 * tag added.
 * @returns {void}
 */
function connectMesh() {
  if (isShuttingDown) return;
  if (meshSocket && meshSocket.readyState === meshSocket.OPEN) return;
  try {
    log('INFO', `Connecting to mesh WS at ${MESH_WS_URL}`);
    meshSocket = new WebSocket(MESH_WS_URL);
  } catch (e) {
    log('ERROR', `Failed to construct mesh WS: ${e.message}`);
    scheduleMeshReconnect();
    return;
  }

  meshSocket.on('open', () => {
    log('INFO', 'Mesh WS connected');
    meshReconnectDelay = 1000; // reset backoff
    // identify ourselves to the mesh
    try {
      meshSocket.send(
        JSON.stringify({
          type: 'register',
          from: 'hive-dashboard',
          version: '1.0.0',
          role: 'dashboard',
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      log('WARN', `Failed to send register to mesh: ${e.message}`);
    }
    // also subscribe to the default coordination room
    try {
      meshSocket.send(
        JSON.stringify({
          type: 'subscribe',
          from: 'hive-dashboard',
          room: 'coordination',
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      log('WARN', `Failed to subscribe to coordination: ${e.message}`);
    }
    broadcastToBrowsers({ type: 'mesh_status', payload: { connected: true } });
  });

  meshSocket.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      log('DEBUG', 'Ignoring non-JSON mesh message');
      return;
    }
    // tag + forward
    broadcastToBrowsers(Object.assign({ source: 'mesh' }, msg));
    // also surface as a log if it looks like a status/broadcast
    if (msg.type === 'broadcast' || msg.type === 'status') {
      pushLog('INFO', 'mesh', `[${msg.from || '?'}] ${msg.content || ''}`);
    }
  });

  meshSocket.on('close', (code, reason) => {
    log('WARN', `Mesh WS closed (${code} ${reason || ''})`);
    meshSocket = null;
    broadcastToBrowsers({ type: 'mesh_status', payload: { connected: false } });
    scheduleMeshReconnect();
  });

  meshSocket.on('error', (err) => {
    log('WARN', `Mesh WS error: ${err.message}`);
    // close handler will fire and trigger reconnect
  });
}

/**
 * Schedule a reconnect with exponential backoff (cap 30s).
 */
function scheduleMeshReconnect() {
  if (isShuttingDown) return;
  if (meshReconnectTimer) return;
  const delay = Math.min(meshReconnectDelay, 30000);
  log('DEBUG', `Mesh reconnect in ${delay}ms`);
  meshReconnectTimer = setTimeout(() => {
    meshReconnectTimer = null;
    meshReconnectDelay = Math.min(meshReconnectDelay * 2, 30000);
    connectMesh();
  }, delay);
}

// ---------------------------------------------------------------------------
// WebSocket — browser clients
// ---------------------------------------------------------------------------

/**
 * Broadcast a JSON-serializable payload to every connected browser client.
 * Closes dead sockets lazily.
 * @param {object} obj
 */
function broadcastToBrowsers(obj) {
  const json = safeJsonStringify(obj);
  for (const ws of browserClients) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(json);
      } catch (e) {
        log('WARN', `Failed to send to browser client: ${e.message}`);
      }
    }
  }
}

/**
 * Forward a browser message upstream. If `type === 'hermes_command'` we
 * stash it for the hermes bridge instead of sending it to the mesh.
 * @param {object} msg parsed message from browser
 */
function handleBrowserMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'hermes_command') {
    // queue for hermes bridge
    hermesOutbox.push(msg);
    pushLog('INFO', 'hermes-bridge', `cmd: ${msg.command || ''}`);
    broadcastToBrowsers({
      type: 'hermes_ack',
      payload: { command: msg.command, queued: true },
    });
    return;
  }
  // forward to mesh if connected
  if (meshSocket && meshSocket.readyState === meshSocket.OPEN) {
    try {
      meshSocket.send(safeJsonStringify(msg));
    } catch (e) {
      log('WARN', `Failed to forward to mesh: ${e.message}`);
    }
  } else {
    // still echo back so the UI can show "offline"
    broadcastToBrowsers({
      type: 'mesh_status',
      payload: { connected: false, dropped: true },
    });
  }
}

// ---------------------------------------------------------------------------
// Hermes bridge — stub for now. We just collect outgoing commands and expose
// them via a debug endpoint. A future tick will wire this to the real hermes
// unix socket / process pipe.
// ---------------------------------------------------------------------------

/** @type {Array<object>} */
const hermesOutbox = [];
/** @type {Array<object>} */
const hermesInbox = [];

/**
 * Internal: called by the hermes bridge process to inject an inbound message
 * from hermes. Broadcasts to all browsers.
 * @param {object} msg
 */
function injectHermesMessage(msg) {
  hermesInbox.push(Object.assign({ ts: Date.now() }, msg));
  if (hermesInbox.length > 500) hermesInbox.shift();
  broadcastToBrowsers(Object.assign({ source: 'hermes' }, msg));
  pushLog('INFO', 'hermes', msg.content || msg.message || JSON.stringify(msg));
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// CORS — wide open for now, will tighten once auth is in place
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key'
  );
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// request log (lightweight — skip static)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    const start = Date.now();
    res.on('finish', () => {
      log(
        'INFO',
        `${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - start}ms)`
      );
    });
  }
  next();
});

// static SPA
app.use(express.static(PUBLIC_DIR, { fallthrough: true, index: 'index.html' }));

// ---------------------------------------------------------------------------
// REST API
// ---------------------------------------------------------------------------

/**
 * GET /api/health
 * Liveness probe. Reports mesh + hermes connectivity and process uptime.
 */
app.get(
  '/api/health',
  asyncHandler(async (req, res) => {
    const meshRes = await meshFetch(`${MESH_URL}/api/health`, {
      timeoutMs: 1500,
    }).catch(() => ({ ok: false, status: 0, body: { error: 'fetch-failed' } }));
    const mesh = {
      reachable: meshRes.ok || meshRes.status > 0,
      status: meshRes.status,
      body: meshRes.body,
    };
    const hermes = {
      enabled: HERMES_BRIDGE_ENABLED,
      socket: HERMES_SOCKET,
      outboxSize: hermesOutbox.length,
      inboxSize: hermesInbox.length,
    };
    sendJson(res, 200, {
      status: 'ok',
      mesh,
      hermes,
      uptime: process.uptime(),
      pid: process.pid,
      port: PORT,
      ts: ts(),
    });
  })
);

/**
 * GET /api/swarms
 * List all known swarms, newest first.
 */
app.get('/api/swarms', (req, res) => {
  const list = Array.from(swarms.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
  sendJson(res, 200, { count: list.length, swarms: list });
});

/**
 * POST /api/swarms
 * Start a new swarm. Body: { goal, count, domain }
 * Returns: { id, status: 'started' }
 *
 * Asynchronously kicks off decomposition via the core/goal-decomposer
 * (if it exists) and dispatch via core/worker-dispatcher. Both are dynamic
 * require()s so this server still starts if those modules are not yet
 * built by sibling sub-agents.
 */
app.post(
  '/api/swarms',
  asyncHandler(async (req, res) => {
    const { goal, count, domain } = req.body || {};
    if (!goal || typeof goal !== 'string' || !goal.trim()) {
      return sendJson(res, 400, { error: 'goal is required' });
    }
    const workerCount = Math.max(
      1,
      Math.min(parseInt(count || 3, 10) || 3, 32)
    );
    const swarm = {
      id: makeId('swarm-'),
      goal: goal.trim(),
      count: workerCount,
      domain: (domain || 'general').toString().slice(0, 64),
      status: 'started',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      subtasks: [],
      workers: [],
      logs: [],
    };
    swarms.set(swarm.id, swarm);
    pushLog('INFO', 'swarm', `started "${swarm.goal}" (count=${workerCount})`, swarm.id);
    broadcastToBrowsers({ type: 'swarm_update', payload: swarm });
    saveSwarms().catch(() => {});

    // Respond immediately with id+status
    sendJson(res, 202, { id: swarm.id, status: swarm.status });

    // Kick off async decomposition. We never block the response.
    runSwarmLifecycle(swarm).catch((e) => {
      log('ERROR', `Swarm ${swarm.id} lifecycle failed: ${e.message}`);
      swarm.status = 'failed';
      swarm.error = e.message;
      swarm.updatedAt = Date.now();
      broadcastToBrowsers({ type: 'swarm_update', payload: swarm });
      saveSwarms().catch(() => {});
    });
  })
);

/**
 * GET /api/swarms/:id
 * Return one swarm's full record.
 */
app.get('/api/swarms/:id', (req, res) => {
  const s = swarms.get(req.params.id);
  if (!s) return sendJson(res, 404, { error: 'not found' });
  sendJson(res, 200, s);
});

/**
 * DELETE /api/swarms/:id
 * Mark the swarm killed, broadcast an update, and persist.
 */
app.delete('/api/swarms/:id', (req, res) => {
  const s = swarms.get(req.params.id);
  if (!s) return sendJson(res, 404, { error: 'not found' });
  s.status = 'killed';
  s.updatedAt = Date.now();
  pushLog('WARN', 'swarm', `killed (by user request)`, s.id);
  broadcastToBrowsers({ type: 'swarm_update', payload: s });
  saveSwarms().catch(() => {});
  sendJson(res, 200, { id: s.id, status: s.status });
});

/**
 * GET /api/agents
 * Proxy to the mesh server at MESH_URL/api/agents. Falls back to an empty
 * list with a `mesh_reachable: false` flag if the mesh is down.
 */
app.get(
  '/api/agents',
  asyncHandler(async (req, res) => {
    const r = await meshFetch(`${MESH_URL}/api/agents`, { timeoutMs: 3000 });
    if (!r.ok && r.status === 0) {
      return sendJson(res, 200, {
        agents: [],
        mesh_reachable: false,
        mesh_error: r.body && r.body.error,
      });
    }
    // pass through mesh body, but ensure `agents` key exists
    const body = r.body || {};
    if (!Array.isArray(body.agents)) {
      return sendJson(res, 200, Object.assign({ agents: [] }, body, {
        mesh_reachable: r.ok,
      }));
    }
    sendJson(res, r.status, Object.assign({}, body, { mesh_reachable: r.ok }));
  })
);

/**
 * POST /api/consensus
 * Create a new poll. Body: { question, choices, timeout }
 * Returns: { pollId }
 */
app.post('/api/consensus', (req, res) => {
  const { question, choices, timeout } = req.body || {};
  if (!question || typeof question !== 'string') {
    return sendJson(res, 400, { error: 'question is required' });
  }
  if (!Array.isArray(choices) || choices.length < 2) {
    return sendJson(res, 400, { error: 'choices must be an array of >=2 strings' });
  }
  const id = makeId('poll-');
  const ttl = Math.max(5, Math.min(parseInt(timeout || 300, 10) || 300, 3600));
  const poll = {
    id,
    question: question.trim(),
    choices: choices.map((c) => c.toString()),
    votes: {}, // choice -> [{voter, ts}]
    createdAt: Date.now(),
    closesAt: Date.now() + ttl * 1000,
    status: 'open',
  };
  polls.set(id, poll);
  pushLog('INFO', 'consensus', `poll "${poll.question}" opened (${poll.choices.length} choices, ${ttl}s)`);
  broadcastToBrowsers({ type: 'consensus_update', payload: poll });
  sendJson(res, 201, { pollId: id });
});

/**
 * GET /api/consensus/:id
 * Fetch a poll with current tallies.
 */
app.get('/api/consensus/:id', (req, res) => {
  const p = polls.get(req.params.id);
  if (!p) return sendJson(res, 404, { error: 'not found' });
  sendJson(res, 200, summarizePoll(p));
});

/**
 * POST /api/consensus/:id/vote
 * Cast a vote. Body: { choice, voter }
 */
app.post('/api/consensus/:id/vote', (req, res) => {
  const p = polls.get(req.params.id);
  if (!p) return sendJson(res, 404, { error: 'not found' });
  if (p.status !== 'open') {
    return sendJson(res, 409, { error: 'poll is closed' });
  }
  if (Date.now() > p.closesAt) {
    p.status = 'closed';
    return sendJson(res, 409, { error: 'poll expired' });
  }
  const choice = (req.body && req.body.choice || '').toString();
  if (!p.choices.includes(choice)) {
    return sendJson(res, 400, {
      error: 'choice not in poll',
      valid: p.choices,
    });
  }
  const voter =
    (req.body && req.body.voter && req.body.voter.toString()) ||
    'anonymous-' + (req.ip || 'unknown');
  // one vote per voter — replace
  for (const c of p.choices) {
    p.votes[c] = (p.votes[c] || []).filter((v) => v.voter !== voter);
  }
  p.votes[choice] = p.votes[choice] || [];
  p.votes[choice].push({ voter, ts: Date.now() });
  pushLog('INFO', 'consensus', `vote by ${voter} -> ${choice}`, undefined);
  broadcastToBrowsers({ type: 'consensus_update', payload: summarizePoll(p) });
  sendJson(res, 200, summarizePoll(p));
});

/**
 * GET /api/logs?swarm=<id>&tail=200
 * Tail the recent log buffer, optionally filtered by swarmId.
 */
app.get('/api/logs', (req, res) => {
  const tail = Math.max(1, Math.min(parseInt(req.query.tail || '200', 10) || 200, 5000));
  const swarmId = req.query.swarm ? req.query.swarm.toString() : null;
  let buf = recentLogs;
  if (swarmId) {
    buf = buf.filter((e) => e.swarmId === swarmId);
  }
  const slice = buf.slice(-tail);
  sendJson(res, 200, { count: slice.length, logs: slice });
});

// ---------------------------------------------------------------------------
// Debug endpoints (NOT in /api prefix on purpose — easy to disable later)
// ---------------------------------------------------------------------------

/** GET /__hermes/outbox — peek at queued hermes commands (debug only). */
app.get('/__hermes/outbox', (req, res) => {
  sendJson(res, 200, { count: hermesOutbox.length, outbox: hermesOutbox });
});

/** POST /__hermes/inject — used by hermes bridge to push an inbound msg. */
app.post('/__hermes/inject', (req, res) => {
  if (!HERMES_BRIDGE_ENABLED) {
    return sendJson(res, 503, { error: 'hermes bridge disabled' });
  }
  const msg = req.body || {};
  if (!msg || typeof msg !== 'object') {
    return sendJson(res, 400, { error: 'body must be an object' });
  }
  injectHermesMessage(msg);
  sendJson(res, 200, { ok: true });
});

// ---------------------------------------------------------------------------
// Async swarm lifecycle
// ---------------------------------------------------------------------------

/**
 * Try to require a sibling core module without crashing the server if it
 * doesn't exist yet. Returns null if the module is missing.
 * @param {string} relPath path relative to the webui dir, e.g. '../core/goal-decomposer'
 * @returns {any|null}
 */
function tryRequireCore(relPath) {
  try {
    const full = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(full + '.js')) return null;
    return require(full);
  } catch (e) {
    log('WARN', `tryRequireCore(${relPath}) failed: ${e.message}`);
    return null;
  }
}

/**
 * Summarize a poll (votes -> counts, status, etc).
 * @param {object} p poll record
 */
function summarizePoll(p) {
  const tallies = {};
  let total = 0;
  for (const c of p.choices) {
    const n = (p.votes[c] || []).length;
    tallies[c] = n;
    total += n;
  }
  return {
    id: p.id,
    question: p.question,
    choices: p.choices,
    tallies,
    totalVotes: total,
    createdAt: p.createdAt,
    closesAt: p.closesAt,
    status: p.status,
  };
}

/**
 * Run the async lifecycle of a swarm: decompose, dispatch, watch.
 * @param {Swarm} swarm
 */
async function runSwarmLifecycle(swarm) {
  swarm.status = 'running';
  swarm.updatedAt = Date.now();
  broadcastToBrowsers({ type: 'swarm_update', payload: swarm });

  // 1. Decompose
  const decomposer = tryRequireCore('../core/goal-decomposer');
  if (decomposer && typeof decomposer.decompose === 'function') {
    try {
      const sub = await decomposer.decompose({
        goal: swarm.goal,
        count: swarm.count,
        domain: swarm.domain,
      });
      swarm.subtasks = Array.isArray(sub) ? sub : sub && sub.subtasks ? sub.subtasks : [];
      pushLog('INFO', 'decomposer', `produced ${swarm.subtasks.length} subtask(s)`, swarm.id);
    } catch (e) {
      pushLog('WARN', 'decomposer', `failed: ${e.message}`, swarm.id);
      swarm.subtasks = [];
    }
  } else {
    pushLog(
      'DEBUG',
      'decomposer not yet available — will be wired in by sibling sub-agent',
      swarm.id
    );
    // stub: synthesize placeholder subtasks so the UI has something to show
    swarm.subtasks = Array.from({ length: swarm.count }, (_, i) => ({
      id: `${swarm.id}-sub-${i + 1}`,
      title: `Subtask ${i + 1} of ${swarm.count}`,
      prompt: `Work on: ${swarm.goal}`,
      status: 'pending',
    }));
  }
  broadcastToBrowsers({ type: 'swarm_update', payload: swarm });

  // 2. Dispatch
  const dispatcher = tryRequireCore('../core/worker-dispatcher');
  if (dispatcher && typeof dispatcher.dispatch === 'function') {
    try {
      const dispatchRes = await dispatcher.dispatch({
        swarmId: swarm.id,
        subtasks: swarm.subtasks,
        domain: swarm.domain,
      });
      swarm.workers = (dispatchRes && dispatchRes.workers) || [];
      pushLog('INFO', 'dispatcher', `dispatched to ${swarm.workers.length} worker(s)`, swarm.id);
    } catch (e) {
      pushLog('WARN', 'dispatcher', `failed: ${e.message}`, swarm.id);
    }
  } else {
    pushLog('DEBUG', 'dispatcher not yet available — stub', swarm.id);
  }
  broadcastToBrowsers({ type: 'swarm_update', payload: swarm });
  saveSwarms().catch(() => {});

  // 3. Mark complete after a short delay (real impl would poll workers)
  //    The next ticks of the overnight build will replace this with a real
  //    poll/wait loop tied to mesh worker completion messages.
  setTimeout(() => {
    if (swarm.status === 'killed') return;
    if (swarm.status === 'failed') return;
    swarm.status = 'completed';
    swarm.updatedAt = Date.now();
    pushLog('INFO', 'swarm', `completed (stub lifecycle)`, swarm.id);
    broadcastToBrowsers({ type: 'swarm_update', payload: swarm });
    saveSwarms().catch(() => {});
  }, 1500);
}

// ---------------------------------------------------------------------------
// JSON error handler (last middleware)
// ---------------------------------------------------------------------------

// 404 for unknown /api routes
app.use('/api', (req, res) => {
  sendJson(res, 404, { error: 'not found', path: req.path });
});

// generic error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  log('ERROR', `Unhandled: ${err.message}`, { stack: err.stack });
  if (res.headersSent) return;
  sendJson(res, 500, { error: 'internal', message: err.message });
});

// ---------------------------------------------------------------------------
// HTTP + WS server boot
// ---------------------------------------------------------------------------

const server = http.createServer(app);

// WS server attached to the same HTTP server, path /ws
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const ip = (req.socket && req.socket.remoteAddress) || 'unknown';
  log('INFO', `Browser WS client connected from ${ip}`);
  browserClients.add(ws);

  // greet
  try {
    ws.send(
      JSON.stringify({
        type: 'hello',
        payload: {
          server: 'hive-swarm-dashboard',
          version: '0.1.0',
          ts: ts(),
          mesh: meshSocket && meshSocket.readyState === meshSocket.OPEN,
        },
      })
    );
  } catch (e) {
    log('WARN', `Failed to send hello: ${e.message}`);
  }

  ws.on('message', (data) => {
    if (data.length > MAX_POLL_BYTES) {
      try {
        ws.send(JSON.stringify({ type: 'error', payload: { error: 'frame too large' } }));
      } catch {}
      return;
    }
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      try {
        ws.send(JSON.stringify({ type: 'error', payload: { error: 'invalid json' } }));
      } catch {}
      return;
    }
    handleBrowserMessage(msg);
  });

  ws.on('close', () => {
    browserClients.delete(ws);
    log('INFO', `Browser WS client disconnected (${browserClients.size} remaining)`);
  });

  ws.on('error', (err) => {
    log('WARN', `Browser WS error: ${err.message}`);
  });

  // server-initiated ping every 30s to keep proxies happy
  const ping = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      try { ws.ping(); } catch {}
    } else {
      clearInterval(ping);
    }
  }, 30000);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

/**
 * Start the HTTP server (and the WS server piggybacked on it).
 * @returns {Promise<void>}
 */
function start() {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, '0.0.0.0', () => {
      log('INFO', `Hive Swarm Dashboard listening on http://0.0.0.0:${PORT}`);
      log('INFO', `WebSocket endpoint: ws://0.0.0.0:${PORT}/ws`);
      log('INFO', `Static files served from ${PUBLIC_DIR}`);
      log('INFO', `Mesh upstream: ${MESH_URL} (ws: ${MESH_WS_URL})`);
      log('INFO', `Hermes bridge: ${HERMES_BRIDGE_ENABLED ? 'enabled' : 'disabled'}`);
      resolve();
    });
  });
}

/**
 * Graceful shutdown — close server, drain sockets, persist state.
 * @param {string} signal
 */
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log('WARN', `Received ${signal} — shutting down...`);

  // stop accepting new HTTP connections
  server.close((err) => {
    if (err) log('ERROR', `server.close error: ${err.message}`);
  });

  // close browser clients
  for (const ws of browserClients) {
    try { ws.close(1001, 'server shutting down'); } catch {}
  }
  browserClients.clear();

  // close mesh upstream
  if (meshSocket) {
    try { meshSocket.close(1001, 'server shutting down'); } catch {}
  }
  if (meshReconnectTimer) clearTimeout(meshReconnectTimer);

  // persist swarms
  try {
    await saveSwarms();
  } catch (e) {
    log('ERROR', `saveSwarms during shutdown: ${e.message}`);
  }

  // give logs a moment to flush
  setTimeout(() => {
    log('INFO', 'Goodbye 👋');
    process.exit(0);
  }, 250);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  log('ERROR', `uncaughtException: ${err.message}`, { stack: err.stack });
});
process.on('unhandledRejection', (reason) => {
  log('ERROR', `unhandledRejection: ${reason}`);
});

// load persisted state, then start
loadSwarms();
start()
  .then(() => {
    // try the upstream mesh WS — non-fatal if it fails
    if (HERMES_BRIDGE_ENABLED) {
      connectMesh();
    }
  })
  .catch((e) => {
    log('ERROR', `Failed to start: ${e.message}`);
    process.exit(1);
  });
