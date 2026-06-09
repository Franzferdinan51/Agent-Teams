'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;

// Paths relative to this file (api/)
const ROOT_DIR = path.join(__dirname, '..');
const BUILD_LOGS_DIR = path.join(ROOT_DIR, '..', 'build-logs');
const SWARMS_FILE = path.join(BUILD_LOGS_DIR, 'swarms.json');
const LOGS_FILE = path.join(BUILD_LOGS_DIR, 'dashboard.log');

const MAX_SWARMS = 200;

// In-memory store — shared with server.js via module singleton
// (server.js exports these so other routers can access them)
const swarms = require('./store').swarms;
const polls = require('./store').polls;
const recentLogs = require('./store').recentLogs;

function makeId(prefix = '') {
  const rand = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return `${prefix}${t}-${rand}`;
}

function ts() {
  return new Date().toISOString();
}

function log(level, msg, meta) {
  const line = `[${ts()}] [${level}] ${msg}` +
    (meta !== undefined ? ' ' + JSON.stringify(meta) : '');
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
  try {
    fs.appendFileSync(LOGS_FILE, line + '\n', 'utf8');
  } catch (e) { /* best-effort */ }
}

function sendJson(res, status, body) {
  res.status(status).json(body);
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Persist swarms to disk
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

function pushLog(level, source, message, swarmId) {
  const entry = { ts: Date.now(), level, source, message, swarmId: swarmId || undefined };
  recentLogs.push(entry);
  if (recentLogs.length > 5000) recentLogs.splice(0, recentLogs.length - 5000);
  if (swarmId) {
    const s = swarms.get(swarmId);
    if (s) {
      s.logs = s.logs || [];
      s.logs.push(entry);
      if (s.logs.length > 500) s.logs.splice(0, s.logs.length - 500);
      s.updatedAt = entry.ts;
    }
  }
}

// Broadcast helper — events go to window.__hiveBroadcast if available
function broadcastToBrowsers(obj) {
  // This will be called by server.js when it wires up the WebSocket clients
  // The router can't directly broadcast; it must delegate via a shared emitter
  const event = { type: 'log', payload: obj };
  // Emit on the global event bus if present
  if (global.__hiveBus) {
    global.__hiveBus.emit('broadcast', event);
  }
}

// Stub lifecycle — actual decomposition/dispatch handled by sibling agents
async function runSwarmLifecycle(swarm) {
  swarm.status = 'running';
  swarm.updatedAt = Date.now();
  broadcastToBrowsers({ type: 'swarm_update', payload: swarm });

  // Synthesize placeholder subtasks so the UI has something to show
  swarm.subtasks = Array.from({ length: swarm.count }, (_, i) => ({
    id: `${swarm.id}-sub-${i + 1}`,
    title: `Subtask ${i + 1} of ${swarm.count}`,
    prompt: `Work on: ${swarm.goal}`,
    status: 'pending',
  }));
  broadcastToBrowsers({ type: 'swarm_update', payload: swarm });
  saveSwarms().catch(() => {});

  // Mark complete after a short delay (real impl ties to mesh worker msgs)
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

/**
 * GET /api/swarms
 * List all swarms, newest first.
 */
router.get('/', (req, res) => {
  try {
    const list = Array.from(swarms.values()).sort((a, b) => b.createdAt - a.createdAt);
    sendJson(res, 200, { count: list.length, swarms: list });
  } catch (e) {
    log('ERROR', `GET /api/swarms failed: ${e.message}`);
    sendJson(res, 500, { error: 'internal', message: e.message });
  }
});

/**
 * GET /api/swarms/:id
 * Get single swarm with its subtasks.
 */
router.get('/:id', (req, res) => {
  try {
    const s = swarms.get(req.params.id);
    if (!s) return sendJson(res, 404, { error: 'not found' });
    sendJson(res, 200, s);
  } catch (e) {
    log('ERROR', `GET /api/swarms/:id failed: ${e.message}`);
    sendJson(res, 500, { error: 'internal', message: e.message });
  }
});

/**
 * GET /api/swarms/:id/status
 * Live status: subtasks pending/running/completed/failed counts.
 */
router.get('/:id/status', (req, res) => {
  try {
    const s = swarms.get(req.params.id);
    if (!s) return sendJson(res, 404, { error: 'not found' });
    const subtasks = s.subtasks || [];
    const counts = { pending: 0, running: 0, completed: 0, failed: 0 };
    for (const t of subtasks) {
      if (counts[t.status] !== undefined) counts[t.status]++;
    }
    sendJson(res, 200, {
      id: s.id,
      status: s.status,
      counts,
      total: subtasks.length,
      updatedAt: s.updatedAt,
    });
  } catch (e) {
    log('ERROR', `GET /api/swarms/:id/status failed: ${e.message}`);
    sendJson(res, 500, { error: 'internal', message: e.message });
  }
});

/**
 * POST /api/swarms
 * Create a new swarm. Body: { goal, count, domain? }
 * Calls goal-decomposer if available, initializes state in swarms.json.
 * Returns the new swarm object with id.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { goal, count, domain } = req.body || {};
    if (!goal || typeof goal !== 'string' || !goal.trim()) {
      return sendJson(res, 400, { error: 'goal is required' });
    }
    const workerCount = Math.max(1, Math.min(parseInt(count || 3, 10) || 3, 32));
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

    sendJson(res, 202, { id: swarm.id, status: swarm.status });

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
 * DELETE /api/swarms/:id
 * Stop/kill a swarm.
 */
router.delete('/:id', (req, res) => {
  try {
    const s = swarms.get(req.params.id);
    if (!s) return sendJson(res, 404, { error: 'not found' });
    s.status = 'killed';
    s.updatedAt = Date.now();
    pushLog('WARN', 'swarm', `killed (by user request)`, s.id);
    broadcastToBrowsers({ type: 'swarm_update', payload: s });
    saveSwarms().catch(() => {});
    sendJson(res, 200, { id: s.id, status: s.status });
  } catch (e) {
    log('ERROR', `DELETE /api/swarms/:id failed: ${e.message}`);
    sendJson(res, 500, { error: 'internal', message: e.message });
  }
});

module.exports = router;