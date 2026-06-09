#!/usr/bin/env node
/**
 * AgentTaskMatcher v1.0.0 — Hive Swarm Enhancement
 *
 * Ranks available agents for a given task using a weighted scoring
 * heuristic adapted from the agnt AgentTaskMatcher (see
 * C:\Users\franz\agnt-research\backend\src\services\goal\AgentTaskMatcher.js).
 *
 * The agnt version was tightly coupled to its SQLite/ORM models, so here
 * we adapt the four-signal scoring idea into a pure function on plain
 * agent objects that the rest of the swarm already speaks.
 *
 *   role match         (40%)  — agent.role == task.requiredRole?
 *   capability match   (30%)  — does agent.capabilities cover task.requiredTools?
 *   load               (20%)  — prefer less-loaded agents
 *   recent success     (10%)  — boost agents with high success on similar work
 *
 * `recent success` reads from the evolution layer; until insight-engine.js
 * is built we fall back to a neutral 0.5 so the matcher stays usable.
 *
 * Usage:
 *   const { AgentTaskMatcher, match } = require('./agent-task-matcher');
 *   const ranked = match(task, availableAgents); // [{ agentId, score, reason }, ...]
 *   const m = new AgentTaskMatcher({ insightEngine });
 *   m.match(task, agents);
 */

'use strict';

const path = require('path');
const fs = require('fs');

// ────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────

const VERSION = '1.0.0';

const SCORE_WEIGHTS = Object.freeze({
    role:       0.40,
    capability: 0.30,
    load:       0.20,
    success:    0.10,
});

// Path to the evolution layer (where insight-engine.js will live). Optional
// and resolved lazily so this module loads cleanly even if evolution is
// still a stub.
const EVOLUTION_DIR = path.resolve(__dirname, '..', 'evolution');

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function toStringArray(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(String);
    if (typeof v === 'string') {
        try {
            const parsed = JSON.parse(v);
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch (_) { /* not JSON */ }
        // Comma-separated fallback
        return v.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
}

function clamp01(n) {
    if (typeof n !== 'number' || Number.isNaN(n)) return 0;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
}

/**
 * Try to read recent success rates from the evolution layer.
 * @param {string} taskKey  — e.g. `${task.role}:${task.requiredTool}`
 * @returns {number} success rate 0..1, defaulting to 0.5
 */
function lookupRecentSuccess(taskKey) {
    try {
        const insightPath = path.join(EVOLUTION_DIR, 'insight-engine.js');
        if (!fs.existsSync(insightPath)) return 0.5;

        // The evolution layer is built by another sub-agent; require it
        // defensively. Any failure → neutral score.
        // eslint-disable-next-line global-require, import/no-dynamic-require
        const mod = require(insightPath);
        const engine = mod && (mod.default || mod.insightEngine || mod);

        if (engine && typeof engine.successRate === 'function') {
            const v = Number(engine.successRate(taskKey));
            if (Number.isFinite(v)) return clamp01(v);
        }
        if (engine && typeof engine.getSuccessRate === 'function') {
            const v = Number(engine.getSuccessRate(taskKey));
            if (Number.isFinite(v)) return clamp01(v);
        }
    } catch (_) { /* fall through */ }
    return 0.5;
}

// ────────────────────────────────────────────────────────────────────────────
// AgentTaskMatcher
// ────────────────────────────────────────────────────────────────────────────

class AgentTaskMatcher {
    /**
     * @param {object} [opts]
     * @param {object} [opts.insightEngine]  — pre-loaded insight engine (optional)
     * @param {object} [opts.weights]        — override SCORE_WEIGHTS
     */
    constructor(opts = {}) {
        this.insightEngine = opts.insightEngine || null;
        this.weights = Object.assign({}, SCORE_WEIGHTS, opts.weights || {});
    }

    /**
     * Score a single agent against a task.
     * @param {object} task   — { requiredRole, requiredTools }
     * @param {object} agent  — { id, role, capabilities, currentLoad, maxLoad, successRate }
     * @returns {{ agentId: string, score: number, reason: string, breakdown: object }}
     */
    scoreAgent(task, agent) {
        if (!agent || !agent.id) {
            return { agentId: null, score: 0, reason: 'invalid agent', breakdown: {} };
        }

        const breakdown = {};
        const reasons = [];

        // 1) Role match (40%) — exact match = 1, related role = 0.5, else 0
        const requiredRole = (task && task.requiredRole) || null;
        const agentRole    = (agent.role || '').toString().toLowerCase();
        if (requiredRole && agentRole) {
            if (agentRole === String(requiredRole).toLowerCase()) {
                breakdown.role = SCORE_WEIGHTS.role;
                reasons.push(`role match (${agentRole})`);
            } else if (agentRole.includes(String(requiredRole).toLowerCase()) ||
                       String(requiredRole).toLowerCase().includes(agentRole)) {
                breakdown.role = SCORE_WEIGHTS.role * 0.5;
                reasons.push(`role partial (${agentRole} ~ ${requiredRole})`);
            } else {
                breakdown.role = 0;
            }
        } else {
            // No role requirement stated — give a small base credit so we
            // don't zero-out perfectly capable agents.
            breakdown.role = SCORE_WEIGHTS.role * 0.25;
            reasons.push('no role requirement');
        }

        // 2) Capability match (30%) — fraction of requiredTools the agent has
        const requiredTools = toStringArray(task && task.requiredTools);
        const agentCaps     = toStringArray(agent.capabilities || agent.tools);

        if (requiredTools.length === 0) {
            // No tools required → neutral credit
            breakdown.capability = SCORE_WEIGHTS.capability * 0.5;
            reasons.push('no tools required');
        } else {
            const capSet = new Set(agentCaps.map(s => s.toLowerCase()));
            const hits = requiredTools.filter(t => capSet.has(String(t).toLowerCase())).length;
            const ratio = hits / requiredTools.length;
            breakdown.capability = SCORE_WEIGHTS.capability * ratio;
            reasons.push(`tools ${hits}/${requiredTools.length}`);
        }

        // 3) Load (20%) — prefer less-loaded agents. Score = 1 - utilization
        const maxLoad = Number(agent.maxLoad) > 0 ? Number(agent.maxLoad) : 1;
        const curLoad = Math.max(0, Number(agent.currentLoad) || 0);
        const utilization = Math.min(1, curLoad / maxLoad);
        breakdown.load = SCORE_WEIGHTS.load * (1 - utilization);
        reasons.push(`load ${curLoad}/${maxLoad}`);

        // 4) Recent success (10%) — pull from evolution layer
        const taskKey = `${requiredRole || 'any'}:${requiredTools.join('+') || 'any'}`;
        let successRate = 0.5;
        if (this.insightEngine && typeof this.insightEngine.successRate === 'function') {
            try {
                successRate = clamp01(Number(this.insightEngine.successRate(taskKey)));
            } catch (_) { successRate = 0.5; }
        } else if (typeof agent.successRate === 'number' && Number.isFinite(agent.successRate)) {
            // Use agent's own recent-success figure if provided
            successRate = clamp01(agent.successRate);
        } else {
            successRate = lookupRecentSuccess(taskKey);
        }
        breakdown.success = SCORE_WEIGHTS.success * successRate;
        reasons.push(`success ${(successRate * 100).toFixed(0)}%`);

        // Sum
        const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
        return {
            agentId: agent.id,
            score: Number(score.toFixed(4)),
            reason: reasons.join(' · '),
            breakdown,
        };
    }

    /**
     * Rank every agent for a task. Highest score first.
     * @param {object} task
     * @param {object[]} availableAgents
     * @returns {Array<{ agentId, score, reason, breakdown, agent }>}
     */
    match(task, availableAgents) {
        if (!Array.isArray(availableAgents) || availableAgents.length === 0) return [];

        const scored = availableAgents
            .map(agent => {
                const r = this.scoreAgent(task, agent);
                return Object.assign({}, r, { agent });
            })
            .sort((a, b) => b.score - a.score);

        return scored;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Functional shortcut
// ────────────────────────────────────────────────────────────────────────────

/**
 * Convenience: rank agents without constructing a matcher.
 * @param {object} task
 * @param {object[]} availableAgents
 * @returns {Array<{ agentId, score, reason, breakdown, agent }>}
 */
function match(task, availableAgents) {
    return new AgentTaskMatcher().match(task, availableAgents);
}

// ────────────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────────────

module.exports = {
    AgentTaskMatcher,
    match,
    __version: VERSION,
};
