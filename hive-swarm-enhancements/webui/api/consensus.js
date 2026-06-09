'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Council server configuration
const COUNCIL_URL = process.env.COUNCIL_URL || 'http://localhost:3001';
const COUNCIL_API_KEY = process.env.COUNCIL_API_KEY || 'openclaw-mesh-default-key';
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

async function councilFetch(pathname, opts = {}) {
  const url = `${COUNCIL_URL}${pathname}`;
  const headers = Object.assign(
    { 'X-API-Key': COUNCIL_API_KEY, 'Content-Type': 'application/json' },
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

function makeId(prefix = '') {
  const rand = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return `${prefix}${t}-${rand}`;
}

function broadcastToBrowsers(obj) {
  if (global.__hiveBus) {
    global.__hiveBus.emit('broadcast', obj);
  }
}

// In-memory polls store (shared with swarm.js via store module)
const polls = require('./store').polls;

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
 * GET /api/consensus/polls
 * List active and recent polls.
 */
router.get('/polls', (req, res) => {
  try {
    const all = Array.from(polls.values())
      .sort((a, b) => b.createdAt - a.createdAt);
    sendJson(res, 200, { count: all.length, polls: all.map(summarizePoll) });
  } catch (e) {
    log('ERROR', `GET /api/consensus/polls failed: ${e.message}`);
    sendJson(res, 500, { error: 'internal', message: e.message });
  }
});

/**
 * POST /api/consensus/polls
 * Create a new poll. Body: { topic, options[], quorum? }
 * Forwards to council-api-server at localhost:3001.
 * Returns poll id.
 */
router.post(
  '/polls',
  asyncHandler(async (req, res) => {
    try {
      const { topic, options, quorum } = req.body || {};
      if (!topic || typeof topic !== 'string' || !topic.trim()) {
        return sendJson(res, 400, { error: 'topic is required' });
      }
      if (!Array.isArray(options) || options.length < 2) {
        return sendJson(res, 400, { error: 'options must be an array of >=2 strings' });
      }
      // Try the council server first
      const r = await councilFetch('/api/polls', {
        method: 'POST',
        body: JSON.stringify({
          question: topic.trim(),
          choices: options.map((o) => o.toString()),
          timeout: quorum || 300,
        }),
        timeoutMs: 5000,
      });
      if (r.ok && r.body && r.body.pollId) {
        return sendJson(res, 201, { pollId: r.body.pollId });
      }
      // Fall back to local poll creation if council is unavailable
      const id = makeId('poll-');
      const ttl = Math.max(5, Math.min(parseInt(quorum || 300, 10) || 300, 3600));
      const poll = {
        id,
        question: topic.trim(),
        choices: options.map((o) => o.toString()),
        votes: {},
        createdAt: Date.now(),
        closesAt: Date.now() + ttl * 1000,
        status: 'open',
      };
      polls.set(id, poll);
      log('INFO', 'consensus', `poll "${poll.question}" opened (${poll.choices.length} choices, ${ttl}s)`);
      broadcastToBrowsers({ type: 'consensus_update', payload: summarizePoll(poll) });
      sendJson(res, 201, { pollId: id });
    } catch (e) {
      log('ERROR', `POST /api/consensus/polls failed: ${e.message}`);
      sendJson(res, 500, { error: 'internal', message: e.message });
    }
  })
);

/**
 * GET /api/consensus/polls/:id
 * Get poll with current votes + tallies.
 */
router.get('/polls/:id', (req, res) => {
  try {
    const p = polls.get(req.params.id);
    if (!p) return sendJson(res, 404, { error: 'not found' });
    sendJson(res, 200, summarizePoll(p));
  } catch (e) {
    log('ERROR', `GET /api/consensus/polls/:id failed: ${e.message}`);
    sendJson(res, 500, { error: 'internal', message: e.message });
  }
});

/**
 * POST /api/consensus/polls/:id/vote
 * Cast a vote. Body: { option, voterId }
 */
router.post(
  '/polls/:id/vote',
  asyncHandler(async (req, res) => {
    try {
      const p = polls.get(req.params.id);
      if (!p) return sendJson(res, 404, { error: 'not found' });
      if (p.status !== 'open') {
        return sendJson(res, 409, { error: 'poll is closed' });
      }
      if (Date.now() > p.closesAt) {
        p.status = 'closed';
        return sendJson(res, 409, { error: 'poll expired' });
      }
      const option = (req.body && req.body.option || '').toString();
      if (!p.choices.includes(option)) {
        return sendJson(res, 400, { error: 'option not in poll', valid: p.choices });
      }
      const voterId =
        (req.body && req.body.voterId && req.body.voterId.toString()) ||
        'anonymous-' + (req.ip || 'unknown');
      // one vote per voter — replace
      for (const c of p.choices) {
        p.votes[c] = (p.votes[c] || []).filter((v) => v.voter !== voterId);
      }
      p.votes[option] = p.votes[option] || [];
      p.votes[option].push({ voter: voterId, ts: Date.now() });
      log('INFO', 'consensus', `vote by ${voterId} -> ${option}`);
      broadcastToBrowsers({ type: 'consensus_update', payload: summarizePoll(p) });
      sendJson(res, 200, summarizePoll(p));
    } catch (e) {
      log('ERROR', `POST /api/consensus/polls/:id/vote failed: ${e.message}`);
      sendJson(res, 500, { error: 'internal', message: e.message });
    }
  })
);

/**
 * POST /api/consensus/polls/:id/resolve
 * Resolve/close a poll.
 */
router.post(
  '/polls/:id/resolve',
  asyncHandler(async (req, res) => {
    try {
      const p = polls.get(req.params.id);
      if (!p) return sendJson(res, 404, { error: 'not found' });
      if (p.status !== 'open') {
        return sendJson(res, 409, { error: 'poll is already ' + p.status });
      }
      p.status = 'resolved';
      p.updatedAt = Date.now();
      log('INFO', 'consensus', `poll "${p.question}" resolved`);
      broadcastToBrowsers({ type: 'consensus_update', payload: summarizePoll(p) });
      sendJson(res, 200, summarizePoll(p));
    } catch (e) {
      log('ERROR', `POST /api/consensus/polls/:id/resolve failed: ${e.message}`);
      sendJson(res, 500, { error: 'internal', message: e.message });
    }
  })
);

module.exports = router;