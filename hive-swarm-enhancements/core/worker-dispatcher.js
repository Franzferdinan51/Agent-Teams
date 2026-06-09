#!/usr/bin/env node
/**
 * WorkerDispatcher v1.0.0 — Hive Swarm Enhancement
 *
 * Parallel dispatch of subtasks to agents over the Agent Mesh WebSocket.
 * Compatible with scripts/live-messenger.js protocol + AGENTS.md message format.
 *
 *   - Connects once, auto-reconnects with 5s backoff
 *   - Queues outbound messages when the mesh is down, drains on reconnect
 *   - Tracks per-subtask state: pending → running → completed | failed | killed
 *   - Persists every dispatch to hive-swarm-enhancements/build-logs/dispatches/
 *   - Emits lifecycle events: agent_started, agent_progress, agent_completed,
 *     agent_failed, dispatch_complete
 *   - Promise-based: dispatch() returns { dispatchId, promises[] }
 *
 * Message format (matches AGENTS.md §"Live Messaging Protocol"):
 *   { type, from, to, version: "1.0.0", content, timestamp, room }
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const WebSocket = require('ws');

// ────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────

const MESH_HTTP = process.env.MESH_URL || 'http://localhost:4000';
const MESH_KEY = process.env.MESH_KEY || 'openclaw-mesh-default-key';
const MESH_WS = MESH_HTTP.replace(/^http/i, 'ws') + '/ws';
const VERSION = '1.0.0';

const DEFAULT_SUBTASK_TIMEOUT_MS = 5 * 60 * 1000;   // 5 minutes
const DEFAULT_RECONNECT_MS = 5 * 1000;              // 5 s backoff
const DEFAULT_DISPATCH_DIR = path.join(
    __dirname, '..', 'build-logs', 'dispatches'
);

const ROOM_ROLE_HINTS = {
    build:        ['build', 'coder', 'engineer', 'implement', 'scaffold'],
    research:     ['research', 'analyst', 'investigate', 'explore'],
    audit:        ['audit', 'reviewer', 'qa', 'review', 'security'],
    planning:     ['planner', 'architect', 'designer', 'strategy'],
    coordination: ['coordinator', 'orchestrator', 'lead', 'manager'],
    general:      []
};

/**
 * WorkerDispatcher — fans subtasks out across the Agent Mesh.
 *
 * @fires WorkerDispatcher#agent_started    — { dispatchId, subtaskId, agentId, room, subtask }
 * @fires WorkerDispatcher#agent_progress   — { dispatchId, subtaskId, agentId, progress, note }
 * @fires WorkerDispatcher#agent_completed  — { dispatchId, subtaskId, agentId, result }
 * @fires WorkerDispatcher#agent_failed     — { dispatchId, subtaskId, agentId, error }
 * @fires WorkerDispatcher#dispatch_complete — { dispatchId, summary }
 */
class WorkerDispatcher extends EventEmitter {
    /**
     * @param {object} [opts]
     * @param {string} [opts.dispatcherId]   Identifier used as `from` on every outbound frame
     * @param {number} [opts.subtaskTimeout] Per-subtask timeout in ms (default 5 min)
     * @param {number} [opts.reconnectMs]     Reconnect backoff in ms (default 5 s)
     * @param {string} [opts.dispatchDir]     Where to write dispatch state JSON files
     * @param {boolean} [opts.persist]       Write state to disk (default true)
     * @param {boolean} [opts.autoConnect]   Open the WS immediately (default true)
     */
    constructor(opts = {}) {
        super();

        this.dispatcherId  = opts.dispatcherId  || `worker-dispatcher-${Date.now()}`;
        this.subtaskTimeout = opts.subtaskTimeout || DEFAULT_SUBTASK_TIMEOUT_MS;
        this.reconnectMs    = opts.reconnectMs    || DEFAULT_RECONNECT_MS;
        this.dispatchDir    = opts.dispatchDir    || DEFAULT_DISPATCH_DIR;
        this.persist        = opts.persist !== false;
        this._autoConnect   = opts.autoConnect !== false;

        this._ws = null;
        this._wsReady = false;
        this._wsShouldRun = false;
        this._wsReconnectTimer = null;
        this._outbox = [];                 // queued frames when WS is down
        this._inflight = new Map();        // dispatchId|subtaskId → { agent, room, timer, resolve, reject, startedAt }
        this._dispatches = new Map();      // dispatchId → DispatchRecord

        if (this.persist) {
            try {
                fs.mkdirSync(this.dispatchDir, { recursive: true });
            } catch (err) {
                // Persistence failure is non-fatal — we just log and continue in memory.
                console.error(`[WorkerDispatcher] ⚠️  cannot create ${this.dispatchDir}: ${err.message}`);
                this.persist = false;
            }
        }

        if (this._autoConnect) {
            // Don't await — caller can use .ready() if they want to wait.
            this._connect();
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Public API
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Dispatch a list of subtasks across the provided agents.
     *
     * Each subtask resolves independently. The returned `promises` array
     * preserves the order of `subtasks`. The overall `dispatchId` resolves
     * only after every subtask has settled.
     *
     * @param {Array<{id?: string, title?: string, description?: string, room?: string, payload?: object, timeoutMs?: number}>} subtasks
     * @param {Array<{id: string, name: string, role: string, model?: string, room?: string, capabilities?: string[]}>} agents
     * @param {object} [opts]
     * @param {string} [opts.goal]          Originating goal, for logging
     * @param {number} [opts.timeoutMs]     Override default subtask timeout
     * @returns {{ dispatchId: string, promises: Promise<object>[] }}
     */
    dispatch(subtasks, agents, opts = {}) {
        if (!Array.isArray(subtasks)) {
            throw new TypeError('dispatch(): subtasks must be an array');
        }
        if (!Array.isArray(agents) || agents.length === 0) {
            throw new TypeError('dispatch(): agents must be a non-empty array');
        }

        const dispatchId = `dispatch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const overallTimeoutMs = opts.timeoutMs || this.subtaskTimeout;

        const record = {
            id: dispatchId,
            goal: opts.goal || null,
            createdAt: Date.now(),
            status: 'pending',
            subtasks: [],
            summary: { total: subtasks.length, completed: 0, failed: 0, killed: 0 }
        };
        this._dispatches.set(dispatchId, record);

        const promises = subtasks.map((sub, idx) => {
            const subtaskId = sub.id || `${dispatchId}#${idx}`;
            const agent = this._pickAgent(sub, agents);
            const room  = sub.room || agent.room || this._inferRoom(sub, agent);

            const subRecord = {
                id: subtaskId,
                index: idx,
                title: sub.title || null,
                description: sub.description || null,
                room,
                agentId: agent ? agent.id : null,
                agentName: agent ? agent.name : null,
                agentRole: agent ? agent.role : null,
                state: 'pending',          // pending → running → completed | failed | killed
                progress: 0,
                startedAt: null,
                endedAt: null,
                result: null,
                error: null,
                timeoutMs: sub.timeoutMs || overallTimeoutMs
            };
            record.subtasks.push(subRecord);

            return new Promise((resolve, reject) => {
                this._sendSubtask(dispatchId, subtaskId, sub, agent, room, subRecord, resolve, reject);
            });
        });

        // Aggregate-level promise (resolved when every subtask settles).
        const aggregate = Promise.allSettled(promises).then(results => {
            const failed = results.filter(r => r.status === 'rejected').length;
            const completed = results.length - failed;

            record.status = failed === 0 ? 'completed' : (completed === 0 ? 'failed' : 'completed');
            record.endedAt = Date.now();
            record.summary.completed = completed;
            record.summary.failed = failed;

            this._persistRecord(record);
            this.emit('dispatch_complete', {
                dispatchId,
                summary: record.summary,
                status: record.status
            });
            return { dispatchId, status: record.status, summary: record.summary, results };
        });

        record.aggregate = aggregate;
        this._persistRecord(record);

        return { dispatchId, promises, all: aggregate };
    }

    /**
     * Return the current state of a dispatch (deep-copied, safe to mutate).
     * @param {string} dispatchId
     * @returns {object|null}
     */
    getStatus(dispatchId) {
        const rec = this._dispatches.get(dispatchId);
        if (!rec) return null;
        return JSON.parse(JSON.stringify(rec, (k, v) => (k === 'aggregate' ? undefined : v)));
    }

    /**
     * Force-fail every still-running subtask in a dispatch and emit failures.
     * @param {string} dispatchId
     * @returns {{killed: number, dispatchId: string} | null}
     */
    kill(dispatchId) {
        const rec = this._dispatches.get(dispatchId);
        if (!rec) return null;

        let killed = 0;
        for (const sub of rec.subtasks) {
            if (sub.state === 'running' || sub.state === 'pending') {
                const key = this._inflightKey(dispatchId, sub.id);
                const handle = this._inflight.get(key);
                if (handle) {
                    clearTimeout(handle.timer);
                    this._inflight.delete(key);
                }
                sub.state = 'killed';
                sub.endedAt = Date.now();
                sub.error = 'killed by dispatcher';
                killed++;
                this.emit('agent_failed', {
                    dispatchId,
                    subtaskId: sub.id,
                    agentId: sub.agentId,
                    error: sub.error
                });
            }
        }
        rec.status = killed > 0 ? 'killed' : rec.status;
        rec.endedAt = Date.now();
        rec.summary.killed = killed;
        this._persistRecord(rec);
        return { dispatchId, killed };
    }

    /**
     * List all in-flight dispatches (status pending or with running subtasks).
     * @returns {object[]}
     */
    listActive() {
        const out = [];
        for (const rec of this._dispatches.values()) {
            const hasRunning = rec.subtasks.some(s => s.state === 'running' || s.state === 'pending');
            if (hasRunning || rec.status === 'pending' || rec.status === 'running') {
                out.push(this.getStatus(rec.id));
            }
        }
        return out;
    }

    /**
     * Resolve when the underlying WebSocket is open. Useful at startup.
     */
    ready() {
        return new Promise(resolve => {
            if (this._wsReady) return resolve(true);
            this.once('_ws_open', () => resolve(true));
        });
    }

    /**
     * Gracefully close the socket and stop reconnecting.
     */
    async close() {
        this._wsShouldRun = false;
        if (this._wsReconnectTimer) {
            clearTimeout(this._wsReconnectTimer);
            this._wsReconnectTimer = null;
        }
        if (this._ws) {
            try {
                this._ws.removeAllListeners();
                this._ws.close();
            } catch (_) { /* ignore */ }
        }
        this._ws = null;
        this._wsReady = false;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Internal — connection lifecycle
    // ════════════════════════════════════════════════════════════════════════

    _connect() {
        if (this._ws && (this._ws.readyState === WebSocket.OPEN ||
                         this._ws.readyState === WebSocket.CONNECTING)) {
            return;
        }
        this._wsShouldRun = true;

        let socket;
        try {
            socket = new WebSocket(MESH_WS, { headers: { 'X-API-Key': MESH_KEY } });
        } catch (err) {
            console.error(`[WorkerDispatcher] ❌ WS construct failed: ${err.message}`);
            this._scheduleReconnect();
            return;
        }
        this._ws = socket;

        socket.on('open', () => {
            this._wsReady = true;
            this.emit('_ws_open');

            // Register so the mesh can route replies back to us.
            try {
                socket.send(JSON.stringify({
                    type: 'register',
                    agentId: this.dispatcherId,
                    capabilities: ['dispatch', 'swarm', 'worker-dispatcher'],
                    room: 'coordination',
                    version: VERSION
                }));
            } catch (err) {
                console.error(`[WorkerDispatcher] ⚠️  register send failed: ${err.message}`);
            }

            // Drain queued frames.
            const q = this._outbox;
            this._outbox = [];
            for (const frame of q) {
                this._sendFrame(frame);
            }
        });

        socket.on('message', (raw) => {
            let msg;
            try { msg = JSON.parse(raw); } catch (_) { return; }
            this._handleMeshMessage(msg);
        });

        socket.on('close', () => {
            this._wsReady = false;
            if (this._wsShouldRun) this._scheduleReconnect();
        });

        socket.on('error', (err) => {
            // Don't crash — log and let the close handler reconnect.
            console.error(`[WorkerDispatcher] ⚠️  WS error: ${err.message}`);
        });
    }

    _scheduleReconnect() {
        if (this._wsReconnectTimer) return;
        this._wsReconnectTimer = setTimeout(() => {
            this._wsReconnectTimer = null;
            this._connect();
        }, this.reconnectMs);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Internal — message routing
    // ════════════════════════════════════════════════════════════════════════

    _handleMeshMessage(msg) {
        if (!msg || typeof msg !== 'object') return;
        const { type, room, from, content, dispatchId, subtaskId, progress, result, error, status } = msg;

        // Targeted at an in-flight subtask we own.
        if (dispatchId && subtaskId) {
            const key = this._inflightKey(dispatchId, subtaskId);
            const handle = this._inflight.get(key);
            if (!handle) return; // reply for a finished/killed subtask — ignore

            if (type === 'agent_started' || status === 'started') {
                this._markRunning(dispatchId, subtaskId);
                this.emit('agent_started', { dispatchId, subtaskId, agentId: from, room });
            } else if (type === 'agent_progress' || status === 'progress') {
                this._updateProgress(dispatchId, subtaskId, progress, content);
                this.emit('agent_progress', { dispatchId, subtaskId, agentId: from, progress, note: content });
            } else if (type === 'agent_completed' || status === 'completed' || type === 'result') {
                this._completeSubtask(dispatchId, subtaskId, result || content);
                this.emit('agent_completed', { dispatchId, subtaskId, agentId: from, result: result || content });
            } else if (type === 'agent_failed' || status === 'failed' || type === 'error') {
                this._failSubtask(dispatchId, subtaskId, error || content);
                this.emit('agent_failed', { dispatchId, subtaskId, agentId: from, error: error || content });
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Internal — subtask lifecycle
    // ════════════════════════════════════════════════════════════════════════

    _sendSubtask(dispatchId, subtaskId, sub, agent, room, subRecord, resolve, reject) {
        const target = agent ? agent.id : (room || 'general');
        const frame = {
            type: agent ? 'sendTo' : 'broadcast',
            from: this.dispatcherId,
            to: target,
            version: VERSION,
            content: JSON.stringify({
                dispatchId,
                subtaskId,
                room,
                title: sub.title || null,
                description: sub.description || null,
                payload: sub.payload || null,
                replyTo: this.dispatcherId,
                replyChannel: 'agent_started|agent_progress|agent_completed|agent_failed'
            }),
            timestamp: Date.now(),
            room
        };

        // If we have no agent match at all, we still try the broadcast to the
        // room — any listener can claim it.
        const timer = setTimeout(() => {
            this._failSubtask(dispatchId, subtaskId, `timeout after ${subRecord.timeoutMs}ms`);
            this.emit('agent_failed', {
                dispatchId, subtaskId, agentId: target,
                error: `timeout after ${subRecord.timeoutMs}ms`
            });
        }, subRecord.timeoutMs);

        this._inflight.set(this._inflightKey(dispatchId, subtaskId), {
            agent: target, room, timer, resolve, reject, startedAt: Date.now()
        });

        this._sendFrame(frame);
    }

    _markRunning(dispatchId, subtaskId) {
        const sub = this._findSubtask(dispatchId, subtaskId);
        if (!sub) return;
        sub.state = 'running';
        sub.startedAt = sub.startedAt || Date.now();
        const rec = this._dispatches.get(dispatchId);
        if (rec && rec.status === 'pending') rec.status = 'running';
        this._persistRecord(rec);
    }

    _updateProgress(dispatchId, subtaskId, progress, note) {
        const sub = this._findSubtask(dispatchId, subtaskId);
        if (!sub) return;
        if (typeof progress === 'number') sub.progress = Math.max(0, Math.min(100, progress));
        if (note) sub.lastNote = note;
        this._persistRecord(this._dispatches.get(dispatchId));
    }

    _completeSubtask(dispatchId, subtaskId, result) {
        const sub = this._findSubtask(dispatchId, subtaskId);
        const key = this._inflightKey(dispatchId, subtaskId);
        const handle = this._inflight.get(key);
        if (!sub || !handle) return;
        clearTimeout(handle.timer);
        this._inflight.delete(key);
        sub.state = 'completed';
        sub.progress = 100;
        sub.endedAt = Date.now();
        sub.result = result;
        handle.resolve({ dispatchId, subtaskId, agentId: sub.agentId, result });
        this._persistRecord(this._dispatches.get(dispatchId));
    }

    _failSubtask(dispatchId, subtaskId, error) {
        const sub = this._findSubtask(dispatchId, subtaskId);
        const key = this._inflightKey(dispatchId, subtaskId);
        const handle = this._inflight.get(key);
        if (!sub || !handle) return;
        clearTimeout(handle.timer);
        this._inflight.delete(key);
        sub.state = 'failed';
        sub.endedAt = Date.now();
        sub.error = String(error || 'unknown error');
        handle.reject(new Error(`[${dispatchId}/${subtaskId}] ${sub.error}`));
        this._persistRecord(this._dispatches.get(dispatchId));
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Internal — helpers
    // ════════════════════════════════════════════════════════════════════════

    _sendFrame(frame) {
        const data = JSON.stringify(frame);
        if (this._wsReady && this._ws && this._ws.readyState === WebSocket.OPEN) {
            try {
                this._ws.send(data);
            } catch (err) {
                // Send can throw mid-flight — fall through to queue.
                this._outbox.push(frame);
            }
        } else {
            // Mesh unreachable → queue. Will drain on reconnect.
            this._outbox.push(frame);
        }
    }

    _pickAgent(subtask, agents) {
        if (!subtask) return agents[0];
        const capMatch = subtask.requiredCapability || subtask.capability;
        if (capMatch) {
            const hit = agents.find(a =>
                Array.isArray(a.capabilities) &&
                a.capabilities.some(c => String(c).toLowerCase() === String(capMatch).toLowerCase())
            );
            if (hit) return hit;
        }
        if (subtask.agentId) {
            const hit = agents.find(a => a.id === subtask.agentId);
            if (hit) return hit;
        }
        if (subtask.room) {
            const hit = agents.find(a => a.room === subtask.room);
            if (hit) return hit;
        }
        return agents[0] || null;
    }

    _inferRoom(subtask, agent) {
        if (subtask && subtask.room) return subtask.room;
        if (agent && agent.room) return agent.room;

        const haystack = `${subtask?.title || ''} ${subtask?.description || ''} ${agent?.role || ''}`.toLowerCase();
        for (const [room, hints] of Object.entries(ROOM_ROLE_HINTS)) {
            if (hints.some(h => haystack.includes(h))) return room;
        }
        return 'general';
    }

    _findSubtask(dispatchId, subtaskId) {
        const rec = this._dispatches.get(dispatchId);
        if (!rec) return null;
        return rec.subtasks.find(s => s.id === subtaskId) || null;
    }

    _inflightKey(dispatchId, subtaskId) {
        return `${dispatchId}|${subtaskId}`;
    }

    _persistRecord(record) {
        if (!this.persist || !record) return;
        const file = path.join(this.dispatchDir, `${record.id}.json`);
        const snapshot = JSON.parse(JSON.stringify(record, (k, v) => (k === 'aggregate' ? undefined : v)));
        // Fire-and-forget write-through; failures are logged, never thrown.
        fs.writeFile(file, JSON.stringify(snapshot, null, 2), (err) => {
            if (err) console.error(`[WorkerDispatcher] ⚠️  persist ${file}: ${err.message}`);
        });
    }
}

module.exports = WorkerDispatcher;
