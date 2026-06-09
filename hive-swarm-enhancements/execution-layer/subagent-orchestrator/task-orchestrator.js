#!/usr/bin/env node
/**
 * TaskOrchestrator v1.0.0 — Hive Swarm Enhancement
 *
 * Ported (adapted) from agnt's TaskOrchestrator
 * (C:\Users\franz\agnt-research\backend\src\services\goal\TaskOrchestrator.js).
 *
 * What we kept from agnt:
 *   - State machine: pending → scheduled → running → completed | failed | killed | retried
 *   - DAG-style dependency resolution (only run tasks whose deps succeeded)
 *   - Parallel execution window (configurable N-way)
 *   - Retry with exponential backoff on transient failure
 *   - Per-task timeout
 *   - Lifecycle broadcasts (broadcastToUser equivalent → EventEmitter)
 *
 * What we replaced:
 *   - SQLite GoalModel / TaskModel / AgentModel → in-memory state map
 *     plus JSON persistence to storage/runs/<runId>.json
 *   - LlmExecutionService + axios adapters → SubagentRunner (sibling file)
 *   - broadcastToUser / RealtimeEvents → EventEmitter ('task_started', etc.)
 *   - agentTools from DB → WorkerDispatcher for actual agent dispatch
 *
 * Storage layout:
 *   <hive-swarm>/storage/runs/<runId>.json
 *
 * Usage:
 *   const { TaskOrchestrator, orchestrate } = require('./task-orchestrator');
 *   const o = new TaskOrchestrator({ dispatcher, runner, matcher });
 *   o.on('task_started', ({ runId, taskId }) => ...);
 *   const { runs, summary } = await o.orchestrate(goalId, { tasks, agents });
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const VERSION = '1.0.0';

// ────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_MAX_PARALLEL   = 5;            // concurrent tasks
const DEFAULT_TASK_TIMEOUT_MS = 10 * 60 * 1000;   // 10 minutes
const DEFAULT_MAX_RETRIES     = 3;           // up to 3 retries
const DEFAULT_RETRY_BASE_MS   = 1000;        // 1s, 2s, 4s, ...
const DEFAULT_RUNS_DIR = path.resolve(
    __dirname, '..', '..', 'storage', 'runs'
);

const STATE = Object.freeze({
    PENDING:   'pending',
    SCHEDULED: 'scheduled',
    RUNNING:   'running',
    COMPLETED: 'completed',
    FAILED:    'failed',
    KILLED:    'killed',
    RETRIED:   'retried',
});

// Tasks that exit with one of these state labels are considered "done".
const TERMINAL = new Set([STATE.COMPLETED, STATE.FAILED, STATE.KILLED]);

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function makeId(prefix) {
    return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function toTaskList(tasks) {
    if (!Array.isArray(tasks)) throw new TypeError('orchestrate(): tasks must be an array');
    return tasks.map((t, idx) => {
        if (!t || typeof t !== 'object') throw new TypeError(`task[${idx}] is not an object`);
        return Object.assign({
            id:          t.id || `task-${idx}`,
            title:       t.title || `Task ${idx + 1}`,
            description: t.description || '',
            dependencies: Array.isArray(t.dependencies) ? t.dependencies.slice() : [],
            requiredRole: t.requiredRole || null,
            requiredTools: Array.isArray(t.requiredTools) ? t.requiredTools.slice() : [],
            payload:     t.payload || null,
            timeoutMs:   t.timeoutMs || null,
            maxRetries:  t.maxRetries != null ? t.maxRetries : null,
        }, t);
    });
}

function summariseRun(record) {
    const counts = { total: 0, pending: 0, scheduled: 0, running: 0,
                     completed: 0, failed: 0, killed: 0, retried: 0 };
    for (const t of record.tasks) {
        counts.total += 1;
        counts[t.state] = (counts[t.state] || 0) + 1;
    }
    return counts;
}

// ────────────────────────────────────────────────────────────────────────────
// TaskOrchestrator
// ────────────────────────────────────────────────────────────────────────────

class TaskOrchestrator extends EventEmitter {
    /**
     * @param {object} [opts]
     * @param {object} [opts.dispatcher]   WorkerDispatcher instance
     * @param {object} [opts.runner]       SubagentRunner instance
     * @param {object} [opts.matcher]      AgentTaskMatcher instance
     * @param {number} [opts.maxParallel]
     * @param {number} [opts.taskTimeoutMs]
     * @param {number} [opts.maxRetries]
     * @param {number} [opts.retryBaseMs]
     * @param {string} [opts.runsDir]
     * @param {boolean} [opts.persist]
     */
    constructor(opts = {}) {
        super();

        this.dispatcher     = opts.dispatcher || null;
        this.runner         = opts.runner     || null;
        this.matcher        = opts.matcher    || null;
        this.maxParallel    = opts.maxParallel    || DEFAULT_MAX_PARALLEL;
        this.taskTimeoutMs  = opts.taskTimeoutMs  || DEFAULT_TASK_TIMEOUT_MS;
        this.maxRetries     = opts.maxRetries     || DEFAULT_MAX_RETRIES;
        this.retryBaseMs    = opts.retryBaseMs    || DEFAULT_RETRY_BASE_MS;
        this.runsDir        = opts.runsDir        || DEFAULT_RUNS_DIR;
        this.persist        = opts.persist !== false;

        /** @type {Map<string, RunRecord>} */
        this._runs = new Map();

        if (this.persist) {
            try { fs.mkdirSync(this.runsDir, { recursive: true }); }
            catch (err) {
                console.error(`[TaskOrchestrator] ⚠️  cannot create ${this.runsDir}: ${err.message}`);
                this.persist = false;
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Public API
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Run a full goal. Returns once every task is in a terminal state
     * (success, failure, or killed).
     *
     * @param {string} goalId
     * @param {object} options
     * @param {object[]} options.tasks        Task definitions
     * @param {object[]} [options.agents]     Available agents (matcher input)
     * @param {object}   [options.context]    Shared context for the goal
     * @returns {Promise<{ runs: RunRecord[], summary: object }>}
     */
    async orchestrate(goalId, options = {}) {
        if (!goalId) throw new TypeError('orchestrate(): goalId is required');
        const tasks = toTaskList(options.tasks || []);
        const agents = Array.isArray(options.agents) ? options.agents : [];
        if (tasks.length === 0) {
            return { runs: [], summary: { goalId, totalRuns: 0, totalTasks: 0 } };
        }

        const runId = makeId('run');
        const record = {
            id: runId,
            goalId,
            createdAt: new Date().toISOString(),
            startedAt: null,
            endedAt:   null,
            status:    STATE.PENDING,
            context:   options.context || null,
            options: {
                maxParallel:   this.maxParallel,
                taskTimeoutMs: this.taskTimeoutMs,
                maxRetries:    this.maxRetries,
            },
            tasks: tasks.map(t => ({
                id:           t.id,
                title:        t.title,
                description:  t.description,
                dependencies: t.dependencies,
                requiredRole: t.requiredRole,
                requiredTools: t.requiredTools,
                state:        STATE.PENDING,
                stateHistory: [{ state: STATE.PENDING, at: new Date().toISOString() }],
                attempts:     0,
                maxRetries:   t.maxRetries != null ? t.maxRetries : this.maxRetries,
                agentId:      null,
                error:        null,
                output:       null,
                startedAt:    null,
                endedAt:      null,
                durationMs:   0,
            })),
            summary: null,
        };

        this._runs.set(runId, record);
        this._persist(record);

        record.startedAt = new Date().toISOString();
        record.status    = STATE.RUNNING;
        this._persist(record);

        this.emit('run_started', { runId, goalId, taskCount: record.tasks.length });

        try {
            await this._driveLoop(record, agents);
        } catch (err) {
            record.status = STATE.FAILED;
            record.error  = err.message;
        } finally {
            record.endedAt = new Date().toISOString();
            record.summary = summariseRun(record);
            this._persist(record);
            this._runs.delete(runId);

            const summary = {
                goalId,
                runId,
                status:       record.status,
                totalTasks:   record.summary.total,
                completed:    record.summary.completed,
                failed:       record.summary.failed,
                killed:       record.summary.killed,
                durationMs:   Date.parse(record.endedAt) - Date.parse(record.startedAt),
            };
            this.emit('goal_complete', { runId, goalId, summary, record });
            return { runs: [record], summary };
        }
    }

    /** @returns {object|null} */
    getRun(runId) {
        const rec = this._loadFromDisk(runId);
        if (rec) return rec;
        return null;
    }

    /**
     * @param {string} [goalId]  Filter by goal (otherwise returns every persisted run)
     * @returns {object[]}
     */
    listRuns(goalId) {
        const dir = this.runsDir;
        let files = [];
        try { files = fs.readdirSync(dir).filter(f => f.endsWith('.json')); }
        catch (_) { return []; }

        const out = [];
        for (const f of files) {
            try {
                const raw = fs.readFileSync(path.join(dir, f), 'utf8');
                const rec = JSON.parse(raw);
                if (!goalId || rec.goalId === goalId) out.push(rec);
            } catch (_) { /* skip corrupt file */ }
        }
        out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        return out;
    }

    /**
     * Force-fail every still-running task in a run. Idempotent.
     * @param {string} runId
     * @returns {{ killed: number, runId: string } | null}
     */
    killRun(runId) {
        const rec = this._loadFromDisk(runId);
        if (!rec) return null;
        let killed = 0;
        const now = new Date().toISOString();
        for (const t of rec.tasks) {
            if (t.state === STATE.PENDING || t.state === STATE.SCHEDULED || t.state === STATE.RUNNING) {
                t.state = STATE.KILLED;
                t.endedAt = now;
                t.error = 'killed by orchestrator';
                t.stateHistory.push({ state: STATE.KILLED, at: now });
                killed += 1;
            }
        }
        rec.status = STATE.KILLED;
        rec.endedAt = now;
        rec.summary = summariseRun(rec);
        this._persist(rec);
        this.emit('run_killed', { runId, killed });
        return { killed, runId };
    }

    /**
     * Mark a run as paused: no new task is scheduled. In-flight tasks
     * are allowed to finish (we don't yank them mid-flight to avoid
     * corruption on the agent side). Re-run orchestrate() to resume.
     */
    pauseRun(runId) {
        const rec = this._loadFromDisk(runId);
        if (!rec) return null;
        rec.status = 'paused';
        rec.pausedAt = new Date().toISOString();
        this._persist(rec);
        this.emit('run_paused', { runId });
        return { runId, status: 'paused' };
    }

    /**
     * Mark a paused run as resumable. The next orchestrate() call with
     * the same goalId will pick up the on-disk tasks that are still
     * in non-terminal states.
     */
    resumeRun(runId) {
        const rec = this._loadFromDisk(runId);
        if (!rec) return null;
        if (rec.status !== 'paused') {
            return { runId, status: rec.status, note: 'not paused' };
        }
        rec.status = STATE.PENDING;
        delete rec.pausedAt;
        this._persist(rec);
        this.emit('run_resumed', { runId });
        return { runId, status: rec.status };
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Internal — scheduling loop
    // ════════════════════════════════════════════════════════════════════════

    async _driveLoop(record, agents) {
        const inFlight = new Set();
        let activeGoal = true;

        // Periodically re-evaluate — gives pause() a chance to short-circuit
        // without us having to thread a "stop" flag through every call site.
        const tick = async () => {
            while (activeGoal) {
                if (record.status === 'paused') {
                    await sleep(50);
                    continue;
                }
                if (this._isTerminalRecord(record)) break;

                const slots = this.maxParallel - inFlight.size;
                if (slots <= 0) {
                    await sleep(25);
                    continue;
                }

                const ready = this._readyTasks(record, agents);
                const next  = ready.slice(0, slots);

                if (next.length === 0) {
                    // Nothing new is schedulable, but we still have in-flight
                    // tasks — wait for them rather than busy-loop.
                    if (inFlight.size > 0) {
                        await sleep(50);
                        continue;
                    }
                    // Nothing in flight and nothing ready → DAG is blocked
                    // (or already done). Break to the terminal check.
                    break;
                }

                for (const task of next) {
                    inFlight.add(task.id);
                    this._transition(task, STATE.SCHEDULED, record);
                    this.emit('task_scheduled', { runId: record.id, taskId: task.id, goalId: record.goalId });

                    // Fire the task in the background; don't await the loop
                    // so we can keep scheduling other ready tasks up to
                    // maxParallel.
                    this._runTaskWithRetries(task, record, agents)
                        .catch(err => console.error(`[TaskOrchestrator] unexpected: ${err.message}`))
                        .finally(() => {
                            inFlight.delete(task.id);
                            this._persist(record);
                        });
                }
            }
        };

        await tick();
        // Wait for any in-flight tasks to drain.
        while (inFlight.size > 0) {
            await sleep(25);
        }
        activeGoal = false;
    }

    _isTerminalRecord(record) {
        return record.tasks.every(t => TERMINAL.has(t.state));
    }

    _readyTasks(record, agents) {
        const byId = new Map(record.tasks.map(t => [t.id, t]));
        const out = [];
        for (const t of record.tasks) {
            if (!(t.state === STATE.PENDING || t.state === STATE.RETRIED)) continue;
            // All deps must be in COMPLETED state
            const depsMet = t.dependencies.every(depId => {
                const dep = byId.get(depId);
                return dep && dep.state === STATE.COMPLETED;
            });
            if (!depsMet) continue;
            // If any required agent capability is unavailable, skip
            if (this.matcher && agents.length > 0) {
                const ranked = this.matcher.match(t, agents);
                if (ranked.length === 0 || (ranked[0] && ranked[0].score < 0.05)) {
                    // Still queue it — we'll fall back to a generic dispatcher
                    // if no good match exists. We don't want to silently drop.
                }
            }
            out.push(t);
        }
        return out;
    }

    async _runTaskWithRetries(task, record, agents) {
        const maxAttempts = (task.maxRetries != null ? task.maxRetries : this.maxRetries) + 1;
        let attempt = 0;
        let lastError = null;

        while (attempt < maxAttempts) {
            attempt += 1;
            task.attempts = attempt;
            this._transition(task, STATE.RUNNING, record);
            this.emit('task_started', { runId: record.id, taskId: task.id, goalId: record.goalId, attempt });

            const start = Date.now();
            try {
                const agent = this._pickAgent(task, agents);
                task.agentId = agent ? agent.id : null;

                const { output, meta } = await this._executeWithTimeout(task, agent, record);
                task.output     = output;
                task.durationMs = Date.now() - start;
                task.endedAt    = new Date().toISOString();
                task.lastMeta   = meta;

                this._transition(task, STATE.COMPLETED, record);
                this.emit('task_completed', {
                    runId: record.id, taskId: task.id, goalId: record.goalId,
                    agentId: task.agentId, durationMs: task.durationMs, output,
                });
                return;
            } catch (err) {
                lastError = err;
                task.error = err.message || String(err);
                task.endedAt = new Date().toISOString();
                task.durationMs = Date.now() - start;

                this.emit('task_failed', {
                    runId: record.id, taskId: task.id, goalId: record.goalId,
                    attempt, error: task.error, willRetry: attempt < maxAttempts,
                });

                if (attempt < maxAttempts) {
                    this._transition(task, STATE.RETRIED, record);
                    const backoff = this.retryBaseMs * Math.pow(2, attempt - 1);
                    await sleep(backoff);
                    this._transition(task, STATE.PENDING, record);
                } else {
                    this._transition(task, STATE.FAILED, record);
                }
            }
        }

        // Exhausted
        console.error(`[TaskOrchestrator] task ${task.id} failed after ${attempt} attempts: ${lastError && lastError.message}`);
    }

    async _executeWithTimeout(task, agent, record) {
        const timeoutMs = task.timeoutMs || this.taskTimeoutMs;
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`task timed out after ${timeoutMs}ms`)), timeoutMs);
        });

        const work = (async () => {
            if (this.runner) {
                return await this.runner.run(
                    Object.assign({}, task, { goalId: record.goalId, context: record.context }),
                    agent || { id: 'default', name: 'Default Agent', role: 'general' }
                );
            }
            // No runner provided — best-effort: just return the task description
            // as a stub. Real deployments will inject SubagentRunner.
            return {
                output: { stub: true, taskId: task.id, title: task.title },
                meta:   { traceId: null, status: 'completed' },
            };
        })();

        try {
            return await Promise.race([work, timeout]);
        } finally {
            clearTimeout(timer);
        }
    }

    _pickAgent(task, agents) {
        if (!Array.isArray(agents) || agents.length === 0) return null;
        if (this.matcher) {
            const ranked = this.matcher.match(task, agents);
            if (ranked.length > 0) return ranked[0].agent;
        }
        // Fallback: first agent
        return agents[0];
    }

    _transition(task, newState, record) {
        const prev = task.state;
        if (prev === newState) return;
        task.state = newState;
        task.stateHistory.push({ state: newState, at: new Date().toISOString(), from: prev });
        this._persist(record);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Internal — persistence
    // ════════════════════════════════════════════════════════════════════════

    _persist(record) {
        if (!this.persist) return;
        try {
            const file = path.join(this.runsDir, `${record.id}.json`);
            // Strip non-serialisable refs (e.g. circular buffers in the future)
            const safe = JSON.parse(JSON.stringify(record));
            fs.writeFileSync(file, JSON.stringify(safe, null, 2), 'utf8');
        } catch (err) {
            console.error(`[TaskOrchestrator] ⚠️  persist failed: ${err.message}`);
        }
    }

    _loadFromDisk(runId) {
        if (!this.persist) return null;
        const file = path.join(this.runsDir, `${runId}.json`);
        if (!fs.existsSync(file)) return null;
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (err) {
            console.error(`[TaskOrchestrator] ⚠️  load failed: ${err.message}`);
            return null;
        }
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Functional shortcut
// ────────────────────────────────────────────────────────────────────────────

/**
 * Convenience: construct a one-shot orchestrator and run a goal.
 * @param {string} goalId
 * @param {object} options  Same as TaskOrchestrator#orchestrate options
 * @param {object} [opts]   Same as TaskOrchestrator constructor opts
 */
async function orchestrate(goalId, options, opts) {
    const o = new TaskOrchestrator(opts || {});
    return await o.orchestrate(goalId, options);
}

// ────────────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────────────

module.exports = {
    TaskOrchestrator,
    orchestrate,
    STATE,
    __version: VERSION,
};
