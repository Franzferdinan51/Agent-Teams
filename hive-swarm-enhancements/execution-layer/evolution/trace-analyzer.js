/**
 * trace-analyzer.js
 *
 * Heuristic analyzer for execution traces emitted by the subagent-runner /
 * swarm-runner. Ported (adapted) from agnt's services/goal/TraceAnalyzer.js
 * (446 lines, ES Modules + Mongo).
 *
 * SAFETY DIFFERENCE vs. agnt:
 *   - agnt's TraceAnalyzer is the *front* of an A/B-test pipeline that
 *     auto-discards / auto-promotes skill files. We don't have that pipe
 *     (by design — see skill-evolver.js). This module is read-only:
 *     load, aggregate, classify. It never touches skill files.
 *
 * Adapts to the Agent-Teams swarm-run shape: each "trace" is a JSON file
 * under `build-logs/swarm-runs/<ts>-<swarmId>.json` with shape:
 *   { swarmId, goal, startedAt, completedAt, totalDuration,
 *     subtasks:[{ id, title, role, depends_on }],
 *     results: [{ dispatchId, subtaskId, agentId, result:{ status, output,
 *                  agent, role, mode, duration } }],
 *     synthesis: { winner, synthesized, scores, meta } }
 *
 * v1 — pure analysis, no LLM, no mutation.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const __version = '0.1.0';

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

// We sit in execution-layer/evolution/. Candidate storage roots, first hit wins:
//   1. ../storage/traces/                        (spec — preferred)
//   2. ../../build-logs/swarm-runs/              (actual subagent-runner output)
function resolveTraceDir() {
  const evolutionDir = __dirname;
  const candidates = [
    path.join(evolutionDir, '..', 'storage', 'traces'),
    path.join(evolutionDir, '..', '..', 'build-logs', 'swarm-runs'),
  ];
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        return dir;
      }
    } catch (_) { /* ignore */ }
  }
  // Neither exists — return the preferred one so the caller gets a clean ENOENT.
  return candidates[0];
}

// Companion dirs we'll need elsewhere (insights + pending-evolutions live next to it).
function resolveInsightDir() {
  return path.join(__dirname, '..', 'storage', 'insights');
}
function resolvePendingDir() {
  return path.join(__dirname, '..', 'storage', 'pending-evolutions');
}

// ---------------------------------------------------------------------------
// Trace shape normalization
// ---------------------------------------------------------------------------

// A swarm-run file is *one* trace. The analyzer also flattens its per-subtask
// results into individual "task traces" for finer-grained stats.
function normalizeTrace(raw, sourceFile) {
  if (!raw || typeof raw !== 'object') return null;
  const startedAt = raw.startedAt || null;
  const completedAt = raw.completedAt
    ? (typeof raw.completedAt === 'number' ? raw.completedAt : Date.parse(raw.completedAt))
    : null;
  const totalDuration = raw.totalDuration != null
    ? raw.totalDuration
    : (completedAt && startedAt ? Math.max(0, completedAt - startedAt) : null);

  const subtasks = Array.isArray(raw.subtasks) ? raw.subtasks : [];
  const results = Array.isArray(raw.results) ? raw.results : [];

  // Build subtask lookup so we can pair results → subtask meta.
  const subtaskById = new Map();
  for (const st of subtasks) {
    if (st && st.id) subtaskById.set(st.id, st);
  }

  const taskTraces = results.map((r, i) => {
    const st = r && r.subtaskId ? subtaskById.get(r.subtaskId) : null;
    const inner = (r && r.result) || {};
    const status = (inner.status || 'unknown').toString().toLowerCase();
    return {
      taskId: r && r.subtaskId ? r.subtaskId : `t${i + 1}`,
      title: st && st.title ? st.title : null,
      role: (st && st.role) || inner.role || null,
      agentId: r && r.agentId ? r.agentId : (inner.agent || null),
      status, // 'completed' | 'failed' | 'timeout' | 'unknown'
      mode: inner.mode || null,
      duration: typeof inner.duration === 'number' ? inner.duration : null,
      hasOutput: !!(inner.output && String(inner.output).length > 0),
      outputLength: inner.output ? String(inner.output).length : 0,
      error: inner.error || null,
    };
  });

  return {
    id: raw.swarmId || path.basename(sourceFile, '.json'),
    sourceFile,
    goal: raw.goal || null,
    startedAt,
    completedAt,
    totalDurationMs: totalDuration,
    subtaskCount: subtasks.length,
    resultCount: results.length,
    tasks: taskTraces,
    synthesis: raw.synthesis || null,
  };
}

// ---------------------------------------------------------------------------
// TraceAnalyzer
// ---------------------------------------------------------------------------

class TraceAnalyzer {
  constructor(opts = {}) {
    this.traceDir = opts.traceDir || resolveTraceDir();
    this.insightDir = opts.insightDir || resolveInsightDir();
    this.pendingDir = opts.pendingDir || resolvePendingDir();
  }

  /**
   * Load traces from disk, optionally filtered.
   * Filter keys: ids (string[]), sinceMs, untilMs, goalContains, status.
   */
  loadTraces(filter = {}) {
    let files = [];
    try {
      files = fs.readdirSync(this.traceDir).filter(f => f.endsWith('.json'));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
    files.sort(); // chronological (filenames start with ISO timestamp)
    let traces = [];
    for (const f of files) {
      const full = path.join(this.traceDir, f);
      try {
        const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
        const t = normalizeTrace(raw, full);
        if (t) traces.push(t);
      } catch (err) {
        // Skip corrupt files but log so they're not invisible.
        console.warn(`[trace-analyzer] skipping unreadable ${f}: ${err.message}`);
      }
    }

    if (Array.isArray(filter.ids) && filter.ids.length) {
      const set = new Set(filter.ids);
      traces = traces.filter(t => set.has(t.id));
    }
    if (typeof filter.sinceMs === 'number') {
      traces = traces.filter(t => (t.startedAt || 0) >= filter.sinceMs);
    }
    if (typeof filter.untilMs === 'number') {
      traces = traces.filter(t => (t.startedAt || 0) <= filter.untilMs);
    }
    if (filter.goalContains) {
      const q = String(filter.goalContains).toLowerCase();
      traces = traces.filter(t => (t.goal || '').toLowerCase().includes(q));
    }
    if (filter.status) {
      const s = String(filter.status).toLowerCase();
      traces = traces.filter(t =>
        t.tasks.some(task => task.status === s)
      );
    }
    return traces;
  }

  /**
   * Aggregate stats across traces.
   * Returns { totalTraces, totalTasks, successRate, avgDurationMs,
   *           p50DurationMs, p90DurationMs, errorFrequency, byAgent, byRole }
   */
  aggregateStats(traces) {
    const allTasks = [];
    for (const t of traces) {
      for (const task of t.tasks) allTasks.push(task);
    }
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const failed = allTasks.filter(t => t.status === 'failed' || t.status === 'timeout').length;
    const successRate = allTasks.length ? completed / allTasks.length : 0;

    const durations = allTasks.map(t => t.duration).filter(d => typeof d === 'number');
    durations.sort((a, b) => a - b);
    const avg = durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;
    const pct = (p) => {
      if (!durations.length) return 0;
      const idx = Math.min(durations.length - 1, Math.floor(p * durations.length));
      return durations[idx];
    };

    // Error frequency: count by (error message prefix || status)
    const errorFrequency = {};
    for (const t of allTasks) {
      if (t.status === 'completed') continue;
      const key = t.error ? String(t.error).slice(0, 80) : `status:${t.status}`;
      errorFrequency[key] = (errorFrequency[key] || 0) + 1;
    }

    // Per-agent and per-role success/latency
    const groupBy = (keyFn) => {
      const buckets = new Map();
      for (const t of allTasks) {
        const k = keyFn(t);
        if (!k) continue;
        if (!buckets.has(k)) buckets.set(k, { count: 0, completed: 0, durations: [] });
        const b = buckets.get(k);
        b.count += 1;
        if (t.status === 'completed') b.completed += 1;
        if (typeof t.duration === 'number') b.durations.push(t.duration);
      }
      const out = {};
      for (const [k, b] of buckets) {
        const d = b.durations.slice().sort((a, c) => a - c);
        const sum = d.reduce((s, x) => s + x, 0);
        out[k] = {
          count: b.count,
          successRate: b.count ? b.completed / b.count : 0,
          avgDurationMs: d.length ? sum / d.length : 0,
        };
      }
      return out;
    };

    return {
      totalTraces: traces.length,
      totalTasks: allTasks.length,
      completedTasks: completed,
      failedTasks: failed,
      successRate,
      avgDurationMs: Math.round(avg),
      p50DurationMs: Math.round(pct(0.5)),
      p90DurationMs: Math.round(pct(0.9)),
      errorFrequency,
      byAgent: groupBy(t => t.agentId || 'unassigned'),
      byRole: groupBy(t => t.role || 'unassigned'),
    };
  }

  /**
   * Anomalies = outliers. Per agnt TraceAnalyzer's spirit we look at tasks
   * whose duration exceeds 3x the median OR are repeated timeouts.
   */
  findAnomalies(traces) {
    const durations = [];
    for (const t of traces) {
      for (const task of t.tasks) {
        if (typeof task.duration === 'number') durations.push(task.duration);
      }
    }
    if (!durations.length) return [];
    durations.sort((a, b) => a - b);
    const median = durations[Math.floor(durations.length / 2)];
    const threshold = median * 3;

    const anomalies = [];
    for (const t of traces) {
      for (const task of t.tasks) {
        if (task.status === 'timeout') {
          anomalies.push({
            type: 'timeout',
            traceId: t.id,
            taskId: task.taskId,
            role: task.role,
            agentId: task.agentId,
            duration: task.duration,
            detail: 'Task timed out',
          });
        } else if (typeof task.duration === 'number' && task.duration >= threshold && threshold > 0) {
          anomalies.push({
            type: 'duration_outlier',
            traceId: t.id,
            taskId: task.taskId,
            role: task.role,
            agentId: task.agentId,
            duration: task.duration,
            medianMs: median,
            detail: `Duration ${task.duration}ms >= 3x median (${median}ms)`,
          });
        }
      }
    }
    return anomalies;
  }

  /**
   * What do successful runs have in common? Lightweight frequent-attribute
   * mining across the role/agent/mode of completed tasks. Returns an array
   * of { attribute, value, frequency, successRate }.
   */
  findSuccessPatterns(traces) {
    return this._attributeFrequency(traces, 'completed');
  }

  /**
   * Mirror of findSuccessPatterns for failed/timeout tasks.
   */
  findFailurePatterns(traces) {
    return this._attributeFrequency(traces, 'failed-or-timeout');
  }

  // --- private ---

  _attributeFrequency(traces, target) {
    const isTarget = (status) => target === 'completed'
      ? status === 'completed'
      : (status === 'failed' || status === 'timeout');

    const buckets = new Map(); // key: "attr:value" -> { attr, value, total, matched }
    for (const t of traces) {
      for (const task of t.tasks) {
        const attrs = [
          ['role', task.role],
          ['agentId', task.agentId],
          ['mode', task.mode],
        ];
        for (const [attr, value] of attrs) {
          if (!value) continue;
          const k = `${attr}:${value}`;
          if (!buckets.has(k)) buckets.set(k, { attr, value, total: 0, matched: 0 });
          const b = buckets.get(k);
          b.total += 1;
          if (isTarget(task.status)) b.matched += 1;
        }
      }
    }
    const out = [];
    for (const b of buckets.values()) {
      if (b.total < 2) continue; // skip singletons
      out.push({
        attribute: b.attr,
        value: b.value,
        frequency: b.total,
        successRate: b.matched / b.total,
      });
    }
    out.sort((a, b) => b.frequency - a.frequency);
    return out;
  }
}

module.exports = {
  TraceAnalyzer,
  __version,
  // Export internals for tests and for insight-engine.js
  _resolveTraceDir: resolveTraceDir,
  _resolveInsightDir: resolveInsightDir,
  _resolvePendingDir: resolvePendingDir,
  _normalizeTrace: normalizeTrace,
};
