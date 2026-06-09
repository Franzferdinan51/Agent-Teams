/**
 * @file goal-store.js
 * @description Simple JSON-file backed persistent store for goals and their tasks.
 *
 * The agnt reference implementation stores goals in SQLite (GoalModel + TaskModel).
 * For the Hive Swarm execution layer we keep it deliberately simple: one JSON
 * file per goal under `hive-swarm-enhancements/execution-layer/storage/goals/`,
 * plus a tiny `_index.json` for fast listing.
 *
 * Design goals (matching the rest of the project):
 *  - **CommonJS**, no external npm deps (Node builtins only).
 *  - **Atomic writes** — write to `<file>.tmp` then `fs.renameSync` so a crash
 *    mid-write can never corrupt the on-disk file.
 *  - **In-memory index** — `_index.json` is loaded once and rebuilt on every
 *    mutation, so `listGoals()` never has to scan the directory.
 *  - **Never throws** on caller-facing methods; errors are returned as
 *    `{ ok: false, error: '...' }` so the swarm keeps moving.
 *
 * Exports:
 *  - `GoalStore` — class with a constructor (options) and methods.
 *  - `__version` — module version string.
 *
 * @author Hive Swarm (sub-agent HARVEST-1, ported from agnt GoalModel/TaskModel)
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Library version. Exposed for downstream tools / audit logs. */
const __version = '1.0.0';

/** Default storage root. Resolved relative to this file at construction time. */
const DEFAULT_STORAGE_ROOT = path.resolve(
  __dirname, '..', 'storage', 'goals'
);

/** Index file name — keep this name stable; tooling depends on it. */
const INDEX_FILENAME = '_index.json';

/** Valid goal statuses. Mirrors agnt's vocabulary. */
const GOAL_STATUSES = Object.freeze([
  'pending', 'in_progress', 'blocked', 'completed', 'failed', 'archived', 'validated', 'needs_review',
]);

/** Valid task statuses. */
const TASK_STATUSES = Object.freeze([
  'pending', 'in_progress', 'blocked', 'completed', 'failed', 'skipped',
]);

/** Throttle for the persistent index write (ms). */
const INDEX_DEBOUNCE_MS = 50;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Generate a short, sortable, URL-safe id.
 * Format: `<prefix>_<timestampMs>_<rand8>` — e.g. `goal_1717939200000_3a8c91f2`.
 * @param {string} prefix
 * @returns {string}
 */
function newId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Atomic JSON write — tmp file + rename. Never leaves a half-written file.
 * @param {string} file
 * @param {*} data
 * @returns {boolean} true on success
 */
function atomicWriteJson(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    return true;
  } catch (err) {
    // Best-effort cleanup of the tmp file.
    try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
    return false;
  }
}

/**
 * Read a JSON file. Returns `null` if the file doesn't exist or is malformed.
 * @param {string} file
 * @returns {*}
 */
function readJsonSafe(file) {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

/**
 * Ensure `dir` exists. Returns true on success.
 * @param {string} dir
 * @returns {boolean}
 */
function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (_) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// GoalStore
// ---------------------------------------------------------------------------

/**
 * @class GoalStore
 * @classdesc JSON-file backed store for goals and their nested tasks.
 *
 * Storage layout:
 *   <root>/
 *     _index.json                      — array of {id, title, status, priority, createdAt, taskCount}
 *     <goalId>.json                    — full goal document
 *     <goalId>.json                    — full goal document
 *
 * Goal document shape (mirrors agnt's GoalModel + TaskModel, but flat):
 *   {
 *     id: 'goal_...',
 *     title: 'string',
 *     description: 'string',
 *     status: 'pending',
 *     priority: 'low|medium|high|urgent',
 *     createdAt: 'iso',
 *     updatedAt: 'iso',
 *     successCriteria: { deliverables: [], qualityChecks: [] },
 *     estimatedDuration: 120,          // minutes
 *     tasks: [
 *       {
 *         id: 'task_...',
 *         title, description, status, priority,
 *         requiredTools: [...], dependsOn: [...],
 *         orderIndex, createdAt, updatedAt,
 *         result: null | { ... }      // populated by the execution layer
 *       }
 *     ],
 *     meta: { source, domain, model, provider }
 *   }
 */
class GoalStore {
  /**
   * @param {object} [options]
   * @param {string} [options.root] - Directory to write JSON files into.
   */
  constructor(options = {}) {
    this.root = path.resolve(options.root || DEFAULT_STORAGE_ROOT);
    this.indexFile = path.join(this.root, INDEX_FILENAME);
    /** @type {Array<object>} in-memory index (mirrors _index.json) */
    this._index = [];
    /** @type {NodeJS.Timeout|null} debounce handle for index writes */
    this._indexWriteTimer = null;
    /** @type {boolean} */
    this._loaded = false;
    ensureDir(this.root);
    // Eagerly hydrate from disk so `listGoals` works on a fresh instance
    // even before any local mutations have been made.
    this.load();
  }

  // -------------------------------------------------------------------------
  // Index management
  // -------------------------------------------------------------------------

  /**
   * Load the index from disk. Idempotent. Preserves any in-memory state
   * that was built up since construction if the disk file is missing —
   * the in-memory state is the source of truth within a single process.
   * @returns {boolean} true if a pre-existing index was loaded from disk
   */
  load() {
    const data = readJsonSafe(this.indexFile);
    if (Array.isArray(data)) {
      this._index = data;
      this._loaded = true;
      return true;
    }
    // No file (or malformed) — keep whatever's in memory. This makes
    // repeated `load()` calls safe: they only overwrite when there's
    // actually a persisted index to load.
    this._loaded = true;
    return false;
  }

  /**
   * Schedule a debounced write of the index to disk. Collapses bursts of
   * mutations into a single fsync.
   * @private
   */
  _scheduleIndexWrite() {
    if (this._indexWriteTimer) return;
    this._indexWriteTimer = setTimeout(() => {
      this._indexWriteTimer = null;
      atomicWriteJson(this.indexFile, this._index);
    }, INDEX_DEBOUNCE_MS);
    // Don't keep the event loop alive just for the debounce.
    if (typeof this._indexWriteTimer.unref === 'function') {
      this._indexWriteTimer.unref();
    }
  }

  /**
   * Force-flush the index to disk synchronously. Safe to call before exit.
   * @returns {boolean}
   */
  flush() {
    if (this._indexWriteTimer) {
      clearTimeout(this._indexWriteTimer);
      this._indexWriteTimer = null;
    }
    return atomicWriteJson(this.indexFile, this._index);
  }

  /**
   * Rebuild the index from the on-disk goal files. Useful after a crash
   * or a manual edit. Synchronous and O(n) on goal count.
   * @returns {number} number of goals indexed
   */
  rebuildIndex() {
    this._index = [];
    let files;
    try {
      files = fs.readdirSync(this.root).filter(
        (f) => f.endsWith('.json') && f !== INDEX_FILENAME
      );
    } catch (_) {
      return 0;
    }
    for (const f of files) {
      const goal = readJsonSafe(path.join(this.root, f));
      if (goal && goal.id) this._index.push(this._indexEntry(goal));
    }
    this._scheduleIndexWrite();
    return this._index.length;
  }

  /**
   * Build a minimal index entry from a full goal doc.
   * @private
   */
  _indexEntry(goal) {
    return {
      id: goal.id,
      title: goal.title,
      status: goal.status || 'pending',
      priority: goal.priority || 'medium',
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
      taskCount: Array.isArray(goal.tasks) ? goal.tasks.length : 0,
    };
  }

  /**
   * Upsert the index entry for `goal`.
   * @private
   */
  _upsertIndex(goal) {
    const entry = this._indexEntry(goal);
    const idx = this._index.findIndex((g) => g.id === goal.id);
    if (idx >= 0) this._index[idx] = entry;
    else this._index.push(entry);
    this._scheduleIndexWrite();
  }

  /**
   * Remove the index entry for `goalId`.
   * @private
   */
  _removeIndex(goalId) {
    const before = this._index.length;
    this._index = this._index.filter((g) => g.id !== goalId);
    if (this._index.length !== before) this._scheduleIndexWrite();
  }

  // -------------------------------------------------------------------------
  // Goal CRUD
  // -------------------------------------------------------------------------

  /**
   * Create a new goal. `data` may include:
   *   title, description, priority, successCriteria, estimatedDuration,
   *   meta, and optionally pre-built tasks[].
   * @param {object} data
   * @returns {{ok:boolean, goal?:object, error?:string}}
   */
  createGoal(data) {
    if (!data || typeof data !== 'object') {
      return { ok: false, error: 'createGoal: data must be an object' };
    }
    const title = (data.title || data.description || '').toString().trim();
    if (!title) {
      return { ok: false, error: 'createGoal: title (or description) is required' };
    }

    const now = new Date().toISOString();
    const goal = {
      id: data.id || newId('goal'),
      title: title.length > 60 ? title.slice(0, 57) + '...' : title,
      description: (data.description || title).toString(),
      status: GOAL_STATUSES.includes(data.status) ? data.status : 'pending',
      priority: ['low', 'medium', 'high', 'urgent'].includes(data.priority)
        ? data.priority
        : 'medium',
      createdAt: data.createdAt || now,
      updatedAt: now,
      successCriteria: data.successCriteria || {
        deliverables: ['Complete the requested goal'],
        qualityChecks: ['Output meets requirements'],
      },
      estimatedDuration: Number.isFinite(data.estimatedDuration) ? data.estimatedDuration : 120,
      tasks: Array.isArray(data.tasks) ? data.tasks.map((t) => this._normalizeTask(t)) : [],
      meta: data.meta || {},
    };

    const file = path.join(this.root, `${goal.id}.json`);
    if (!atomicWriteJson(file, goal)) {
      return { ok: false, error: `createGoal: failed to write ${file}` };
    }
    this._upsertIndex(goal);
    return { ok: true, goal };
  }

  /**
   * Fetch a goal by id. Returns the full document, or null if missing.
   * @param {string} goalId
   * @returns {object|null}
   */
  getGoal(goalId) {
    if (!goalId) return null;
    return readJsonSafe(path.join(this.root, `${goalId}.json`));
  }

  /**
   * List goals. Reads the in-memory index (fast), then optionally hydrates
   * full documents. Supports simple filter: { status, priority }.
   * @param {object} [filter]
   * @param {boolean} [filter.full=false] - Hydrate full goal docs.
   * @param {string} [filter.status]
   * @param {string} [filter.priority]
   * @param {number} [filter.limit]
   * @returns {Array<object>}
   */
  listGoals(filter = {}) {
    if (!this._loaded) this.load();
    let out = this._index.slice();
    if (filter.status) out = out.filter((g) => g.status === filter.status);
    if (filter.priority) out = out.filter((g) => g.priority === filter.priority);
    // Newest first by createdAt (fall back to updatedAt or '').
    out.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    if (filter.limit && Number.isFinite(filter.limit)) {
      out = out.slice(0, filter.limit);
    }
    if (filter.full) {
      return out
        .map((entry) => this.getGoal(entry.id))
        .filter((g) => g !== null);
    }
    return out;
  }

  /**
   * Patch a goal. `patch` may include any of:
   *   title, description, status, priority, successCriteria,
   *   estimatedDuration, meta. Tasks are NOT patched here — use
   *   `createTask` / `updateTask` for that.
   * @param {string} goalId
   * @param {object} patch
   * @returns {{ok:boolean, goal?:object, error?:string}}
   */
  updateGoal(goalId, patch) {
    const goal = this.getGoal(goalId);
    if (!goal) return { ok: false, error: `updateGoal: goal ${goalId} not found` };
    if (!patch || typeof patch !== 'object') {
      return { ok: false, error: 'updateGoal: patch must be an object' };
    }
    if (patch.status && !GOAL_STATUSES.includes(patch.status)) {
      return { ok: false, error: `updateGoal: invalid status '${patch.status}'` };
    }
    if (patch.priority && !['low', 'medium', 'high', 'urgent'].includes(patch.priority)) {
      return { ok: false, error: `updateGoal: invalid priority '${patch.priority}'` };
    }

    const allowed = ['title', 'description', 'status', 'priority',
      'successCriteria', 'estimatedDuration', 'meta'];
    for (const k of allowed) {
      if (k in patch) goal[k] = patch[k];
    }
    goal.updatedAt = new Date().toISOString();

    const file = path.join(this.root, `${goal.id}.json`);
    if (!atomicWriteJson(file, goal)) {
      return { ok: false, error: `updateGoal: failed to write ${file}` };
    }
    this._upsertIndex(goal);
    return { ok: true, goal };
  }

  /**
   * Delete a goal. Removes both the file and the index entry.
   * @param {string} goalId
   * @returns {{ok:boolean, error?:string}}
   */
  deleteGoal(goalId) {
    const file = path.join(this.root, `${goalId}.json`);
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (err) {
      return { ok: false, error: `deleteGoal: ${err.message}` };
    }
    this._removeIndex(goalId);
    return { ok: true };
  }

  // -------------------------------------------------------------------------
  // Task CRUD
  // -------------------------------------------------------------------------

  /**
   * Normalize a task input into our canonical task shape.
   * @private
   */
  _normalizeTask(input) {
    const now = new Date().toISOString();
    return {
      id: (input && input.id) || newId('task'),
      title: (input && input.title) || 'Untitled task',
      description: (input && input.description) || '',
      status: TASK_STATUSES.includes(input && input.status) ? input.status : 'pending',
      priority: ['low', 'medium', 'high', 'urgent'].includes(input && input.priority)
        ? input.priority
        : 'medium',
      requiredTools: Array.isArray(input && input.requiredTools)
        ? input.requiredTools.slice()
        : ['general'],
      dependsOn: Array.isArray(input && input.dependsOn)
        ? input.dependsOn.slice()
        : [],
      orderIndex: Number.isFinite(input && input.orderIndex) ? input.orderIndex : 0,
      createdAt: (input && input.createdAt) || now,
      updatedAt: now,
      result: input && 'result' in input ? input.result : null,
    };
  }

  /**
   * Append a task to a goal. Returns the created task.
   * @param {string} goalId
   * @param {object} data
   * @returns {{ok:boolean, task?:object, error?:string}}
   */
  createTask(goalId, data) {
    const goal = this.getGoal(goalId);
    if (!goal) return { ok: false, error: `createTask: goal ${goalId} not found` };
    const task = this._normalizeTask(data || {});
    // Re-index at the end of the list if not specified.
    if (!Number.isFinite(data && data.orderIndex)) {
      task.orderIndex = goal.tasks.length;
    }
    goal.tasks.push(task);
    goal.updatedAt = new Date().toISOString();
    const file = path.join(this.root, `${goal.id}.json`);
    if (!atomicWriteJson(file, goal)) {
      return { ok: false, error: `createTask: failed to write ${file}` };
    }
    this._upsertIndex(goal);
    return { ok: true, task };
  }

  /**
   * Patch a task inside a goal.
   * @param {string} goalId
   * @param {string} taskId
   * @param {object} patch
   * @returns {{ok:boolean, task?:object, error?:string}}
   */
  updateTask(goalId, taskId, patch) {
    const goal = this.getGoal(goalId);
    if (!goal) return { ok: false, error: `updateTask: goal ${goalId} not found` };
    const idx = goal.tasks.findIndex((t) => t.id === taskId);
    if (idx < 0) return { ok: false, error: `updateTask: task ${taskId} not found` };
    if (!patch || typeof patch !== 'object') {
      return { ok: false, error: 'updateTask: patch must be an object' };
    }
    if (patch.status && !TASK_STATUSES.includes(patch.status)) {
      return { ok: false, error: `updateTask: invalid status '${patch.status}'` };
    }
    const allowed = ['title', 'description', 'status', 'priority',
      'requiredTools', 'dependsOn', 'orderIndex', 'result'];
    const merged = { ...goal.tasks[idx] };
    for (const k of allowed) {
      if (k in patch) merged[k] = patch[k];
    }
    merged.updatedAt = new Date().toISOString();
    goal.tasks[idx] = merged;
    goal.updatedAt = merged.updatedAt;

    const file = path.join(this.root, `${goal.id}.json`);
    if (!atomicWriteJson(file, goal)) {
      return { ok: false, error: `updateTask: failed to write ${file}` };
    }
    this._upsertIndex(goal);
    return { ok: true, task: merged };
  }

  /**
   * List all tasks for a goal. Optional filter: { status }.
   * @param {string} goalId
   * @param {object} [filter]
   * @returns {Array<object>}
   */
  listTasks(goalId, filter = {}) {
    const goal = this.getGoal(goalId);
    if (!goal) return [];
    let tasks = goal.tasks.slice();
    if (filter.status) tasks = tasks.filter((t) => t.status === filter.status);
    tasks.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    return tasks;
  }

  // -------------------------------------------------------------------------
  // Convenience helpers
  // -------------------------------------------------------------------------

  /**
   * Return one-line summary stats for the store.
   * @returns {{total:number, byStatus:object, byPriority:object}}
   */
  stats() {
    if (!this._loaded) this.load();
    const byStatus = {};
    const byPriority = {};
    for (const g of this._index) {
      byStatus[g.status] = (byStatus[g.status] || 0) + 1;
      byPriority[g.priority] = (byPriority[g.priority] || 0) + 1;
    }
    return { total: this._index.length, byStatus, byPriority };
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  GoalStore,
  __version,
  // Constants — exported so callers don't have to hardcode strings.
  GOAL_STATUSES,
  TASK_STATUSES,
};
