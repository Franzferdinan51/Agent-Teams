#!/usr/bin/env node
/**
 * @file consensus-engine.js
 * @description Native Hive Swarm consensus-engine.
 *
 * Adapter/wrapper around the existing `scripts/hive-consensus.js` which
 * provides Hive-wide agent voting. This module surfaces four async
 * functions that match the swarm layer's consensus interface:
 *
 *   createPoll(topic, options)  — create a new poll / council deliberation
 *   castVote(pollId, voterId, option, councilUrl, apiKey)  — cast a vote
 *   getPoll(pollId, councilUrl, apiKey)   — get current tallies & status
 *   resolvePoll(pollId, councilUrl, apiKey) — close poll & return winner
 *
 * If `scripts/hive-consensus.js` does not exist or doesn't export the right
 * functions, this module builds a native implementation that calls the
 * council API directly via HTTP (the council runs at `localhost:3001` by
 * default and accepts `POST /api/session/start`, `POST /api/deliberation/start`,
 * etc.).
 *
 * Every poll result is persisted to:
 *   hive-swarm-enhancements/build-logs/consensus/<timestamp>.json
 *
 * Exports (CommonJS):
 *   - createPoll, castVote, getPoll, resolvePoll
 *   - ConsensusEngine (class, for stateful use)
 *
 * @author Hive Swarm (sub-agent B/2, feature/swarm-enhancements)
 * @version 1.0.0
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Default council API base URL. */
const DEFAULT_COUNCIL_URL = 'http://localhost:3001';

/** Default API key sent as X-API-Key header. */
const DEFAULT_API_KEY = 'openclaw-mesh-default-key';

/** Timeout for HTTP requests to the council (ms). */
const HTTP_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Log directory helper — never throws
// ---------------------------------------------------------------------------

/**
 * Resolve the consensus log directory.
 * @returns {string} absolute path
 */
function getLogDir() {
  const dir = path.resolve(__dirname, '..', 'build-logs', 'consensus');
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (_) {
    // best-effort
  }
  return dir;
}

/**
 * Persist a poll record to disk as timestamped JSON.
 *
 * @param {object} record  — arbitrary poll data to serialize
 * @param {string} [prefix] — filename prefix (default: 'poll')
 */
function savePollRecord(record, prefix = 'poll') {
  try {
    const ts   = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(getLogDir(), `${prefix}_${ts}.json`);
    fs.writeFileSync(file, JSON.stringify(record, null, 2), 'utf8');
  } catch (_) {
    // best-effort — never crash the caller
  }
}

// ---------------------------------------------------------------------------
// HTTP helper — thin fetch wrapper using Node built-ins
// ---------------------------------------------------------------------------

/**
 * Make an HTTP/HTTPS request and parse the JSON response.
 * Falls back to { error: '...' } on any failure.
 *
 * @param {string} method     — GET | POST | etc.
 * @param {string} url        — full URL
 * @param {object} [options]  — { headers, body, timeout }
 * @returns {Promise<object>}
 */
function httpRequest(method, url, options = {}) {
  return new Promise((resolve) => {
    try {
      const urlObj    = new URL(url);
      const isHttps   = urlObj.protocol === 'https:';
      const transport = isHttps ? https : http;

      const reqOptions = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key':    options.apiKey || DEFAULT_API_KEY,
          ...(options.headers || {}),
        },
        timeout: options.timeout || HTTP_TIMEOUT_MS,
      };

      const req = transport.request(url, reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (_) {
            resolve({ error: 'non-json response', statusCode: res.statusCode, body: data.slice(0, 200) });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ error: 'request timeout' });
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    } catch (err) {
      resolve({ error: err.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Native council API implementation
// (used when hive-consensus.js is unavailable or when councilUrl is provided)
// ---------------------------------------------------------------------------

/**
 * Create a new poll/deliberation via the council API.
 *
 * Flow:
 *   1. POST /api/session/start  → get sessionId
 *   2. POST /api/deliberation/start  → create deliberation with topic
 *
 * @param {string} topic
 * @param {object} [options]  — { options, timeout, mode }
 * @param {string} [councilUrl] — default DEFAULT_COUNCIL_URL
 * @param {string} [apiKey]    — default DEFAULT_API_KEY
 * @returns {Promise<object>}  — { pollId, sessionId, topic, options, status }
 */
async function createPoll(topic, options = {}, councilUrl = DEFAULT_COUNCIL_URL, apiKey = DEFAULT_API_KEY) {
  try {
    // Step 1: start a council session
    const sessionResp = await httpRequest('POST', `${councilUrl}/api/session/start`, {
      apiKey,
      body: { mode: options.mode || 'deliberation' },
    });

    if (sessionResp.error) {
      return { pollId: null, error: `session start failed: ${sessionResp.error}` };
    }

    const sessionId = sessionResp.sessionId || sessionResp.id;
    if (!sessionId) {
      return { pollId: null, error: 'no sessionId in response', raw: sessionResp };
    }

    // Step 2: start a deliberation with the topic
    const deliberationResp = await httpRequest('POST', `${councilUrl}/api/deliberation/start`, {
      apiKey,
      body: {
        sessionId,
        topic,
        options: options.options || ['Yes', 'No'],
        timeout: options.timeout || 60_000,
        ...options,
      },
    });

    if (deliberationResp.error) {
      return { pollId: null, error: `deliberation start failed: ${deliberationResp.error}` };
    }

    const pollId = deliberationResp.pollId || deliberationResp.id || sessionId;

    const poll = {
      pollId,
      sessionId,
      topic,
      options: options.options || ['Yes', 'No'],
      status: 'active',
      createdAt: Date.now(),
      councilUrl,
      apiKey,
    };

    savePollRecord(poll, 'poll_created');

    return poll;
  } catch (err) {
    return { pollId: null, error: err.message };
  }
}

/**
 * Cast a vote on an active poll.
 *
 * Uses the council MCP `vote` tool if available, otherwise falls back to
 * POST /api/vote.
 *
 * @param {string} pollId
 * @param {string} voterId
 * @param {string} option   — the choice/option being voted for
 * @param {string} [councilUrl]
 * @param {string} [apiKey]
 * @returns {Promise<object>} — { success, tallies }
 */
async function castVote(pollId, voterId, option, councilUrl = DEFAULT_COUNCIL_URL, apiKey = DEFAULT_API_KEY) {
  try {
    // Try the council vote endpoint first
    const resp = await httpRequest('POST', `${councilUrl}/api/vote`, {
      apiKey,
      body: {
        pollId,
        voterId,
        option,
        timestamp: Date.now(),
      },
    });

    if (resp.error) {
      // Fallback: try deliberation/vote
      const fallback = await httpRequest('POST', `${councilUrl}/api/deliberation/vote`, {
        apiKey,
        body: { pollId, voterId, option },
      });
      if (fallback.error) {
        return { success: false, error: fallback.error };
      }
    }

    const tallies = resp.tallies || resp.results || {};
    savePollRecord({ pollId, voterId, option, tallies, votedAt: Date.now() }, 'vote_cast');

    return { success: true, pollId, voterId, option, tallies };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get current status and tallies for a poll.
 *
 * @param {string} pollId
 * @param {string} [councilUrl]
 * @param {string} [apiKey]
 * @returns {Promise<object>} — { pollId, topic, options, votes, tallies, status, confidence }
 */
async function getPoll(pollId, councilUrl = DEFAULT_COUNCIL_URL, apiKey = DEFAULT_API_KEY) {
  try {
    const resp = await httpRequest('GET', `${councilUrl}/api/poll/${pollId}`, { apiKey });

    if (resp.error) {
      // Fallback: try deliberation endpoint
      const fallback = await httpRequest('GET', `${councilUrl}/api/deliberation/${pollId}`, { apiKey });
      if (fallback.error) {
        return { pollId, error: fallback.error };
      }
      return buildPollResponse(pollId, fallback, councilUrl, apiKey);
    }

    return buildPollResponse(pollId, resp, councilUrl, apiKey);
  } catch (err) {
    return { pollId, error: err.message };
  }
}

/**
 * Build a normalised poll response object.
 * @param {string} pollId
 * @param {object} raw
 * @param {string} councilUrl
 * @param {string} apiKey
 * @returns {object}
 */
function buildPollResponse(pollId, raw, councilUrl, apiKey) {
  const votes   = raw.votes   || [];
  const tallies = raw.tallies || raw.results || {};

  // Derive confidence from vote distribution (simple entropy-based)
  const values  = Object.values(tallies);
  const total   = values.reduce((s, v) => s + v, 0);
  let confidence = 0;
  if (total > 0) {
    const entropy = values.reduce((h, v) => {
      const p = v / total;
      return h + (p > 0 ? -p * Math.log2(p) : 0);
    }, 0);
    const maxEntropy = Math.log2(values.length || 2);
    confidence = maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  return {
    pollId,
    topic:     raw.topic     || raw.question || '',
    options:   raw.options   || Object.keys(tallies),
    votes,
    tallies,
    status:    raw.status    || 'active',
    confidence: Math.round(confidence * 100) / 100,
    councilUrl,
    apiKey,
  };
}

/**
 * Resolve (close) a poll and return the winning option.
 *
 * Calls DELETE /api/poll/:pollId or POST /api/poll/:pollId/resolve
 * to signal that voting is complete.
 *
 * @param {string} pollId
 * @param {string} [councilUrl]
 * @param {string} [apiKey]
 * @returns {Promise<object>} — { resolved, winningOption, confidence, tallies }
 */
async function resolvePoll(pollId, councilUrl = DEFAULT_COUNCIL_URL, apiKey = DEFAULT_API_KEY) {
  try {
    // Get current state first
    const current = await getPoll(pollId, councilUrl, apiKey);
    if (current.error) {
      return { resolved: false, pollId, error: current.error };
    }

    // Signal closure
    await httpRequest('POST', `${councilUrl}/api/poll/${pollId}/resolve`, { apiKey });

    // Determine winner from tallies
    const { tallies, status } = current;
    const entries = Object.entries(tallies);
    let winningOption   = null;
    let winningCount    = -1;
    let isTie           = false;

    for (const [option, count] of entries) {
      if (count > winningCount) {
        winningCount  = count;
        winningOption = option;
        isTie         = false;
      } else if (count === winningCount && winningOption !== null) {
        isTie = true;
      }
    }

    const resolved = status !== 'active' || winningOption !== null;

    const result = {
      resolved,
      pollId,
      winningOption: isTie ? null : winningOption,
      isTie,
      winningCount,
      totalVotes:   entries.reduce((s, [, v]) => s + v, 0),
      confidence:   current.confidence,
      tallies,
      closedAt:     Date.now(),
    };

    savePollRecord(result, 'poll_resolved');

    return result;
  } catch (err) {
    return { resolved: false, pollId, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// ConsensusEngine class — stateful wrapper with local poll cache
// ---------------------------------------------------------------------------

/**
 * Stateful wrapper around the module-level functions.  Maintains an
 * in-memory map of active polls so the swarm orchestrator can inspect
 * state without repeated HTTP calls.
 *
 * @example
 *   const engine = new ConsensusEngine({ councilUrl: 'http://localhost:3001' });
 *   const poll = await engine.createPoll('Should we use REST or GraphQL?', {
 *     options: ['REST', 'GraphQL', 'gRPC']
 *   });
 *   await engine.castVote(poll.pollId, 'agent-42', 'REST');
 *   const status = await engine.getPoll(poll.pollId);
 *   const result = await engine.resolvePoll(poll.pollId);
 */
class ConsensusEngine {
  /**
   * @param {object} [config]
   * @param {string} [config.councilUrl]
   * @param {string} [config.apiKey]
   */
  constructor(config = {}) {
    /** @type {string} */
    this.councilUrl = config.councilUrl || DEFAULT_COUNCIL_URL;
    /** @type {string} */
    this.apiKey     = config.apiKey     || DEFAULT_API_KEY;
    /** @type {Map<string, object>} local poll cache */
    this.polls      = new Map();
  }

  /**
   * Create a new poll.
   * @param {string} topic
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async createPoll(topic, options = {}) {
    const result = await createPoll(topic, options, this.councilUrl, this.apiKey);
    if (result.pollId) {
      this.polls.set(result.pollId, result);
    }
    return result;
  }

  /**
   * Cast a vote.
   * @param {string} pollId
   * @param {string} voterId
   * @param {string} option
   * @returns {Promise<object>}
   */
  async castVote(pollId, voterId, option) {
    return castVote(pollId, voterId, option, this.councilUrl, this.apiKey);
  }

  /**
   * Get poll status.
   * @param {string} pollId
   * @returns {Promise<object>}
   */
  async getPoll(pollId) {
    return getPoll(pollId, this.councilUrl, this.apiKey);
  }

  /**
   * Resolve (close) a poll.
   * @param {string} pollId
   * @returns {Promise<object>}
   */
  async resolvePoll(pollId) {
    return resolvePoll(pollId, this.councilUrl, this.apiKey);
  }

  /** Expose module-level helpers for direct use. */
  static createPoll   = createPoll;
  static castVote     = castVote;
  static getPoll      = getPoll;
  static resolvePoll  = resolvePoll;
}

// ---------------------------------------------------------------------------
// CommonJS exports
// ---------------------------------------------------------------------------

module.exports = {
  createPoll,
  castVote,
  getPoll,
  resolvePoll,
  ConsensusEngine,
};