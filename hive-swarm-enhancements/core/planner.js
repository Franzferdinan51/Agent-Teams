/**
 * @file planner.js
 * Top-level swarm planner. Wires decompose → dispatch → aggregate into a single run.
 *
 * Usage:
 *   const { runSwarm } = require('./planner');
 *   const result = await runSwarm("build a REST API for my project", { count: 3, domain: 'build' });
 *
 * @author Hive Swarm (feature/swarm-enhancements)
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Sibling modules
// ---------------------------------------------------------------------------

const { GoalDecomposer } = require('./goal-decomposer');
const WorkerDispatcher = require('./worker-dispatcher');
const { aggregate } = require('./result-aggregator');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_COUNT = 3;
const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const SWARM_RUNS_DIR = path.resolve(__dirname, '..', 'build-logs', 'swarm-runs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure the swarm-runs directory exists (best-effort). */
function ensureSwarmRunsDir() {
  try {
    if (!fs.existsSync(SWARM_RUNS_DIR)) {
      fs.mkdirSync(SWARM_RUNS_DIR, { recursive: true });
    }
  } catch (_) { /* best-effort */ }
}

/**
 * Save a swarm run record to build-logs/swarm-runs/<timestamp>-<id>.json
 *
 * @param {object} record
 * @returns {string|null} path if saved, null otherwise
 */
function saveSwarmRun(record) {
  ensureSwarmRunsDir();
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const id = record.swarmId || 'unknown';
    const file = path.join(SWARM_RUNS_DIR, `${ts}-${id}.json`);
    fs.writeFileSync(file, JSON.stringify(record, null, 2), 'utf8');
    return file;
  } catch (_) {
    return null;
  }
}

/**
 * Coerce a value to a positive integer, with a default.
 * @param {any} n
 * @param {number} def
 * @returns {number}
 */
function toCount(n, def) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.min(15, Math.floor(v)) : def;
}

/**
 * Pick the best result from an array of Promise.allSettled results.
 * @param {Array} results
 * @returns {object[]}
 */
function settledResults(results) {
  return (results || []).map(r =>
    r && r.status === 'fulfilled' ? r.value : null
  ).filter(Boolean);
}

// ---------------------------------------------------------------------------
// runSwarm — the primary top-level entry point
// ---------------------------------------------------------------------------

/**
 * Run a complete swarm: decompose → dispatch → aggregate → save.
 *
 * @param {string} goal  The free-form goal string.
 * @param {object} [options]
 * @param {number} [options.count]          Number of workers (default 3)
 * @param {string} [options.domain]         Domain hint: auto|build|game|research|audit|data|mobile|web|general (default 'auto')
 * @param {number} [options.timeout]        Per-subtask timeout in ms (default 5*60*1000)
 * @param {string} [options.dispatcherId]   Custom dispatcher ID
 * @param {boolean} [options.persist]       Write dispatch/subtask state to disk (default true)
 * @returns {Promise<{
 *   swarmId: string,
 *   goal: string,
 *   subtasks: Array,
 *   dispatchId: string,
 *   results: Array,
 *   synthesis: object,
 *   scores: Array,
 *   ranked: Array,
 *   totalDuration: number
 * }>}
 */
async function runSwarm(goal, options = {}) {
  const count = toCount(options.count, DEFAULT_COUNT);
  const domain = String(options.domain || 'auto').toLowerCase();
  const timeout = Number.isFinite(options.timeout) ? options.timeout : DEFAULT_TIMEOUT;

  const swarmId = `swarm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();

  // 1. Decompose the goal
  const decomposer = new GoalDecomposer();
  const decomposition = await decomposer.decompose(goal, { count, domain });

  // 2. Build synthetic agents (same pattern as CLI)
  const agents = buildSyntheticAgents(count, domain);

  // 3. Dispatch
  const dispatcher = new WorkerDispatcher({
    dispatcherId: options.dispatcherId || `dispatcher-${swarmId}`,
    subtaskTimeout: timeout,
    persist: options.persist !== false,
    autoConnect: true,
  });

  const { dispatchId, promises } = dispatcher.dispatch(
    decomposition.subtasks,
    agents,
    { goal }
  );

  // 4. Wait for all results
  const settled = await Promise.allSettled(promises);
  const results = settledResults(settled);

  // 5. Aggregate
  const synthesis = await aggregate(decomposition, results);

  const totalDuration = Date.now() - startedAt;

  // 6. Score + rank (if aggregator returned scores)
  const scores = synthesis && synthesis.scores ? synthesis.scores : [];
  const ranked = synthesis && synthesis.ranked ? synthesis.ranked : [];

  // 7. Save swarm run
  const record = {
    swarmId,
    goal,
    startedAt,
    completedAt: new Date().toISOString(),
    totalDuration,
    domain,
    count,
    timeout,
    dispatchId,
    subtasks: decomposition.subtasks,
    agents: agents.map(a => ({ id: a.id, role: a.role, name: a.name })),
    results,
    synthesis,
    scores,
    ranked,
    swarmRunsDir: SWARM_RUNS_DIR,
  };

  const savedPath = saveSwarmRun(record);
  record._savedPath = savedPath;

  return record;
}

/**
 * Build synthetic agents for dispatch (mirrors the CLI pattern).
 * @param {number} count
 * @param {string} domain
 * @returns {Array<object>}
 */
function buildSyntheticAgents(count, domain) {
  const rooms = {
    build: 'engineering', game: 'game-dev', research: 'research',
    audit: 'qa', data: 'data-eng', mobile: 'mobile', web: 'web',
    general: 'general', auto: 'general',
  };
  const roles = {
    build:        ['planner', 'implementer', 'reviewer', 'qa', 'integrator', 'doc-writer'],
    game:         ['game-designer', 'engineer', 'artist', 'qa', 'producer'],
    research:     ['researcher', 'analyst', 'writer', 'critic'],
    audit:        ['security', 'performance', 'style', 'tester', 'reviewer'],
    data:         ['data-engineer', 'analyst', 'visualizer', 'validator'],
    mobile:       ['ios-dev', 'android-dev', 'ux', 'qa', 'backend'],
    web:          ['frontend', 'backend', 'ux', 'qa', 'devops'],
    general:      ['planner', 'implementer', 'reviewer', 'qa'],
    auto:         ['planner', 'implementer', 'reviewer', 'qa'],
  };
  const room = rooms[domain] || 'general';
  const pool = roles[domain] || roles.general;
  return Array.from({ length: count }, (_, i) => ({
    id: `agent-${i + 1}`,
    name: `${pool[i % pool.length]}-${i + 1}`,
    role: pool[i % pool.length],
    model: 'qwen3.6-35b-a3b',
    room,
    capabilities: [pool[i % pool.length], domain, 'swarm-worker'],
  }));
}

// ---------------------------------------------------------------------------
// Planner — tracks multiple active swarms
// ---------------------------------------------------------------------------

/**
 * Stateful planner that can track multiple active swarms.
 *
 * @example
 *   const planner = new Planner();
 *   const { swarmId } = await planner.run("build a REST API");
 *   const status = planner.getStatus(swarmId);
 *   planner.stop(swarmId);
 */
class Planner {
  /**
   * @param {object} [opts]
   * @param {number} [opts.defaultCount]    Default worker count (default 3)
   * @param {string} [opts.defaultDomain]   Default domain (default 'auto')
   * @param {number} [opts.defaultTimeout]  Default timeout in ms (default 5 min)
   */
  constructor(opts = {}) {
    this.defaultCount = toCount(opts.defaultCount, DEFAULT_COUNT);
    this.defaultDomain = String(opts.defaultDomain || 'auto').toLowerCase();
    this.defaultTimeout = Number.isFinite(opts.defaultTimeout)
      ? opts.defaultTimeout
      : DEFAULT_TIMEOUT;

    /** @type {Map<string, object>} swarmId → swarm record */
    this._swarms = new Map();

    /** @type {Map<string, WorkerDispatcher>} swarmId → active dispatcher */
    this._dispatchers = new Map();
  }

  /**
   * Run a swarm and track it.
   *
   * @param {string} goal
   * @param {object} [options]  Same options as runSwarm()
   * @returns {Promise<object>} The full swarm run record
   */
  async run(goal, options = {}) {
    const mergedOptions = {
      count: toCount(options.count, this.defaultCount),
      domain: String(options.domain || this.defaultDomain).toLowerCase(),
      timeout: Number.isFinite(options.timeout) ? options.timeout : this.defaultTimeout,
      dispatcherId: `planner-${Date.now()}`,
      persist: options.persist !== false,
    };

    // Track the dispatcher before running so stop() works immediately
    const dispatcher = new WorkerDispatcher({
      dispatcherId: mergedOptions.dispatcherId,
      subtaskTimeout: mergedOptions.timeout,
      persist: mergedOptions.persist,
      autoConnect: false, // we manage connection lifecycle
    });

    // Create swarm record up-front so it appears in listActive immediately
    const tempSwarmId = `swarm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const placeholder = {
      swarmId: tempSwarmId,
      goal,
      status: 'initializing',
      startedAt: Date.now(),
      dispatcherId: mergedOptions.dispatcherId,
    };
    this._swarms.set(tempSwarmId, placeholder);
    this._dispatchers.set(tempSwarmId, dispatcher);

    try {
      // Connect the dispatcher before dispatching
      dispatcher._connect();

      const result = await runSwarm(goal, mergedOptions);

      // Update the tracked record
      result.status = 'completed';
      this._swarms.set(result.swarmId, result);
      // Clean up dispatcher reference
      this._dispatchers.delete(result.swarmId);

      return result;
    } catch (err) {
      // Mark as failed
      const record = this._swarms.get(tempSwarmId) || placeholder;
      record.status = 'failed';
      record.error = String(err && err.message || err);
      record.completedAt = new Date().toISOString();
      this._swarms.set(tempSwarmId, record);
      this._dispatchers.delete(tempSwarmId);
      throw err;
    }
  }

  /**
   * Get the full record for a swarm (includes final result if completed).
   * Returns null if the swarmId is not tracked.
   *
   * @param {string} swarmId
   * @returns {object|null}
   */
  getStatus(swarmId) {
    const rec = this._swarms.get(swarmId);
    if (!rec) return null;
    // Deep-copy so callers can't mutate internal state
    return JSON.parse(JSON.stringify(rec));
  }

  /**
   * List all tracked swarms (active and completed).
   * @returns {object[]} Array of swarm records (status summary only)
   */
  listActive() {
    const out = [];
    for (const [swarmId, rec] of this._swarms) {
      out.push({
        swarmId,
        goal: rec.goal,
        status: rec.status,
        startedAt: rec.startedAt,
        completedAt: rec.completedAt || null,
        totalDuration: rec.totalDuration || (Date.now() - rec.startedAt),
        error: rec.error || null,
      });
    }
    return out;
  }

  /**
   * Stop (kill) an active swarm by swarmId.
   * @param {string} swarmId
   * @returns {{ stopped: boolean, swarmId: string, killed: number } | null}
   */
  stop(swarmId) {
    const dispatcher = this._dispatchers.get(swarmId);
    if (!dispatcher) {
      // Swarm may have already completed or never existed
      const rec = this._swarms.get(swarmId);
      if (!rec) return null;
      rec.status = rec.status === 'completed' ? 'completed' : 'stopped';
      return { stopped: false, swarmId, killed: 0, reason: 'no active dispatcher' };
    }

    const dispatchId = dispatcher._dispatches.size > 0
      ? dispatcher._dispatches.keys().next().value
      : null;

    let killed = 0;
    if (dispatchId) {
      const result = dispatcher.kill(dispatchId);
      killed = result ? result.killed : 0;
    }

    dispatcher.close().catch(() => {});

    const rec = this._swarms.get(swarmId);
    if (rec) {
      rec.status = 'stopped';
      rec.completedAt = new Date().toISOString();
      rec.killed = killed;
    }

    this._dispatchers.delete(swarmId);

    return { stopped: true, swarmId, killed };
  }

  /**
   * Clear the in-memory history of completed swarms.
   * Active swarms are NOT cleared (they must be stopped first).
   */
  clearHistory() {
    for (const [swarmId, dispatcher] of this._dispatchers) {
      dispatcher.close().catch(() => {});
    }
    this._dispatchers.clear();
    this._swarms.clear();
  }
}

// ---------------------------------------------------------------------------
// CommonJS exports
// ---------------------------------------------------------------------------

module.exports = { runSwarm, Planner };
