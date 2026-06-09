'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Mesh server configuration (matches server.js defaults)
const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';
const MESH_API_KEY = process.env.MESH_API_KEY || 'openclaw-mesh-default-key';
const LOGS_FILE = path.join(__dirname, '..', '..', 'build-logs', 'dashboard.log');

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

/**
 * Minimal fetch wrapper for mesh server communication.
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

function broadcastToBrowsers(obj) {
  if (global.__hiveBus) {
    global.__hiveBus.emit('broadcast', obj);
  }
}

/**
 * GET /api/agents
 * List all known agents from mesh (proxies mesh API /api/agents).
 * Returns empty array with mesh_reachable:false if mesh unavailable.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    try {
      const r = await meshFetch(`${MESH_URL}/api/agents`, { timeoutMs: 3000 });
      if (!r.ok && r.status === 0) {
        return sendJson(res, 200, {
          agents: [],
          mesh_reachable: false,
          mesh_error: r.body && r.body.error,
        });
      }
      const body = r.body || {};
      if (!Array.isArray(body.agents)) {
        return sendJson(res, 200, Object.assign({ agents: [] }, body, {
          mesh_reachable: r.ok,
        }));
      }
      sendJson(res, r.status, Object.assign({}, body, { mesh_reachable: r.ok }));
    } catch (e) {
      log('ERROR', `GET /api/agents failed: ${e.message}`);
      sendJson(res, 500, { error: 'internal', message: e.message });
    }
  })
);

/**
 * GET /api/agents/:id
 * Get single agent details.
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    try {
      const r = await meshFetch(`${MESH_URL}/api/agents/${req.params.id}`, {
        timeoutMs: 3000,
      });
      if (!r.ok && r.status === 0) {
        return sendJson(res, 200, {
          agent: null,
          mesh_reachable: false,
          mesh_error: r.body && r.body.error,
        });
      }
      if (r.status === 404) {
        return sendJson(res, 404, { error: 'agent not found' });
      }
      sendJson(res, r.status, Object.assign({}, r.body, { mesh_reachable: r.ok }));
    } catch (e) {
      log('ERROR', `GET /api/agents/:id failed: ${e.message}`);
      sendJson(res, 500, { error: 'internal', message: e.message });
    }
  })
);

/**
 * POST /api/agents/spawn
 * Spawn a new agent. Body: { name, role, model? }
 */
router.post(
  '/spawn',
  asyncHandler(async (req, res) => {
    try {
      const { name, role, model } = req.body || {};
      if (!name || typeof name !== 'string') {
        return sendJson(res, 400, { error: 'name is required' });
      }
      const payload = { name: name.trim(), role: role || 'general' };
      if (model) payload.model = model;
      const r = await meshFetch(`${MESH_URL}/api/agents/spawn`, {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: 5000,
      });
      if (!r.ok && r.status === 0) {
        return sendJson(res, 503, {
          error: 'mesh unavailable',
          mesh_error: r.body && r.body.error,
        });
      }
      sendJson(res, r.status, r.body || { ok: true });
    } catch (e) {
      log('ERROR', `POST /api/agents/spawn failed: ${e.message}`);
      sendJson(res, 500, { error: 'internal', message: e.message });
    }
  })
);

/**
 * GET /api/agents/:id/messages
 * Recent message history for an agent.
 */
router.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(parseInt(req.query.limit || '50', 10) || 50, 200));
      const r = await meshFetch(
        `${MESH_URL}/api/agents/${req.params.id}/messages?limit=${limit}`,
        { timeoutMs: 3000 }
      );
      if (!r.ok && r.status === 0) {
        return sendJson(res, 200, {
          messages: [],
          mesh_reachable: false,
          mesh_error: r.body && r.body.error,
        });
      }
      if (r.status === 404) {
        return sendJson(res, 404, { error: 'agent not found' });
      }
      sendJson(res, r.status, Object.assign({}, r.body, { mesh_reachable: r.ok }));
    } catch (e) {
      log('ERROR', `GET /api/agents/:id/messages failed: ${e.message}`);
      sendJson(res, 500, { error: 'internal', message: e.message });
    }
  })
);

module.exports = router;