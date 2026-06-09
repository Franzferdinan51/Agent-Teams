/**
 * insight-engine.js
 *
 * Adapted from agnt's services/evolution/InsightEngine.js (ES Modules, ~590 LOC)
 * and the agnt SkillForgeOrchestrator / InsightTriggers trio.
 *
 * Goal: take execution traces, ask an LLM "what patterns do you see?", and
 * also produce a deterministic heuristic analysis as a fallback. Save the
 * resulting insights to disk so the SkillEvolver (advisor mode) can read them
 * later.
 *
 * SAFETY DIFFERENCE vs. agnt:
 *   - agnt's InsightEngine + SkillApplicator chain ends in *automatic* skill
 *     promotion / parameter tuning, gated only by per-user settings. We
 *     intentionally do not auto-apply anything. The highest authority of
 *     this module is `analyzeTraces` — it writes INSIGHTS, not SUGGESTIONS
 *     for changes. Skill change suggestions live in skill-evolver.js
 *     and require a human `applyEvolution` call.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { TraceAnalyzer, _normalizeTrace, _resolveTraceDir, _resolveInsightDir } = require('./trace-analyzer');

const __version = '0.1.0';

// ---------------------------------------------------------------------------
// Optional LLM call. Lazy-loaded so the module works in offline / LM-Studio-
// down environments. The shape mirrors agnt's `createLlmClient().generate(prompt)`
// but we speak plain fetch + JSON against the OpenAI-compatible /v1/chat route.
// ---------------------------------------------------------------------------

async function callLlm(prompt, { timeoutMs = 30000 } = {}) {
  const base = process.env.LMSTUDIO_URL || process.env.OPENAI_BASE_URL || 'http://localhost:1234';
  const apiKey = process.env.LMSTUDIO_KEY || process.env.OPENAI_API_KEY || '';
  const model = process.env.LMSTUDIO_MODEL || process.env.OPENAI_MODEL || 'local-model';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an evidence-based AI systems analyst. Be concise, structured, and only claim what the data supports.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`LLM HTTP ${res.status}: ${await res.text().catch(() => '')}`);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

// Best-effort: try to peel a JSON object out of the LLM's reply.
function extractJson(text) {
  if (!text) return null;
  // Strip code fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // Find the outermost { ... }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch (_) { return null; }
}

// ---------------------------------------------------------------------------
// Heuristic analysis (no LLM) — mirrors TraceAnalyzer stats + the
// "what worked / what failed" axes from agnt's LLM judge prompt.
// ---------------------------------------------------------------------------

function heuristicAnalysis(traces, stats) {
  const insights = [];
  const patterns = [];
  const recommendations = [];

  // Insight 1: success rate headline
  if (stats.totalTasks > 0) {
    insights.push({
      type: 'success_rate',
      severity: stats.successRate < 0.5 ? 'high' : (stats.successRate < 0.8 ? 'med' : 'low'),
      text: `Aggregate success rate is ${(stats.successRate * 100).toFixed(1)}% over ${stats.totalTasks} task(s) across ${stats.totalTraces} trace(s).`,
    });
  }

  // Insight 2: top error messages
  const topErrors = Object.entries(stats.errorFrequency)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [msg, count] of topErrors) {
    insights.push({
      type: 'error_frequency',
      severity: count >= 3 ? 'high' : 'med',
      text: `Error "${msg.slice(0, 120)}" appeared ${count} time(s).`,
    });
  }

  // Insight 3: latency tail
  if (stats.p90DurationMs > 0 && stats.avgDurationMs > 0) {
    const tailRatio = stats.p90DurationMs / Math.max(1, stats.avgDurationMs);
    if (tailRatio >= 3) {
      insights.push({
        type: 'latency_tail',
        severity: 'med',
        text: `p90 latency (${stats.p90DurationMs}ms) is ${tailRatio.toFixed(1)}x the average (${stats.avgDurationMs}ms) — possible outlier / stuck-task pattern.`,
      });
    }
  }

  // Patterns: dominant role / agent
  const topRoles = Object.entries(stats.byRole)
    .sort((a, b) => b[1].count - a[1].count).slice(0, 3);
  for (const [role, s] of topRoles) {
    if (s.count < 2) continue;
    patterns.push({
      type: 'role_dominance',
      role,
      frequency: s.count,
      successRate: s.successRate,
      text: `Role "${role}" ran ${s.count} times with ${(s.successRate * 100).toFixed(0)}% success.`,
    });
  }
  const topAgents = Object.entries(stats.byAgent)
    .sort((a, b) => b[1].count - a[1].count).slice(0, 3);
  for (const [agent, s] of topAgents) {
    if (s.count < 2) continue;
    patterns.push({
      type: 'agent_dominance',
      agent,
      frequency: s.count,
      successRate: s.successRate,
      text: `Agent "${agent}" ran ${s.count} times with ${(s.successRate * 100).toFixed(0)}% success.`,
    });
  }

  // Recommendations
  if (stats.successRate < 0.6) {
    recommendations.push({
      priority: 'high',
      action: 'investigate_failures',
      rationale: 'Success rate is below 60% — review the dominant error messages before adding new skills.',
    });
  }
  if (topErrors.length) {
    recommendations.push({
      priority: 'med',
      action: 'guard_against_top_error',
      rationale: `The most common error is: ${topErrors[0][0]}. A skill that pre-checks for this condition could prevent retries.`,
    });
  }
  if (stats.p90DurationMs > 2 * stats.avgDurationMs) {
    recommendations.push({
      priority: 'low',
      action: 'add_timeout_guard',
      rationale: 'Long-tail tasks are inflating p90 — a per-role timeout may be cheaper than another planner pass.',
    });
  }

  return { insights, patterns, recommendations };
}

// ---------------------------------------------------------------------------
// LLM analysis — runs only if LMSTUDIO_URL is reachable. The prompt mirrors
// the rubric in agnt's TraceAnalyzer._llmJudgeAnalysis but trimmed to the
// "what worked / what failed" axes that are useful for advisor-mode evolution.
// ---------------------------------------------------------------------------

const LLM_PROMPT = (traceSummary, stats) => `You are reviewing execution traces from an autonomous multi-agent system.

Below is a deterministic summary of the traces. Identify:
- 2-5 EVIDENCE-BASED PATTERNS of what consistently worked (cite the role/agent/mode + success rate)
- 2-5 EVIDENCE-BASED PATTERNS of what consistently failed (cite the dominant error)
- 2-3 concrete RECOMMENDATIONS a human could act on (each with priority high|med|low)

Constraints:
- Only claim what the data supports. If something is too thin to call, say "insufficient data".
- Do NOT propose specific code changes — only patterns and recommendations.

Return a JSON object of the form:
{
  "patterns": [{ "text": "...", "evidence": "..." }],
  "failures": [{ "text": "...", "evidence": "..." }],
  "recommendations": [{ "priority": "high|med|low", "action": "...", "rationale": "..." }]
}

--- TRACE SUMMARY ---
${traceSummary}

--- AGGREGATE STATS ---
${JSON.stringify(stats, null, 2)}
`;

function buildTraceSummary(traces) {
  const maxTraces = 25;
  const slice = traces.slice(-maxTraces);
  const lines = [];
  for (const t of slice) {
    const tasks = t.tasks.map(task =>
      `    - ${task.taskId} role=${task.role || '?'} agent=${task.agentId || '?'} status=${task.status} dur=${task.duration != null ? task.duration + 'ms' : '?'}`
    ).join('\n');
    lines.push(`[${t.id}] goal="${t.goal}" dur=${t.totalDurationMs}ms tasks=${t.tasks.length}\n${tasks}`);
  }
  return lines.join('\n\n');
}

// ---------------------------------------------------------------------------
// InsightEngine
// ---------------------------------------------------------------------------

class InsightEngine {
  constructor(opts = {}) {
    this.traceDir = opts.traceDir || _resolveTraceDir();
    this.insightDir = opts.insightDir || _resolveInsightDir();
    this.analyzer = new TraceAnalyzer({ traceDir: this.traceDir, insightDir: this.insightDir });
    this.llmEnabled = opts.llmEnabled !== false; // default: try
    this.idCounter = 0;
  }

  _nextInsightId() {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const rand = crypto.randomBytes(3).toString('hex');
    return `ins-${ts}-${rand}`;
  }

  _ensureInsightDir() {
    if (!fs.existsSync(this.insightDir)) {
      fs.mkdirSync(this.insightDir, { recursive: true });
    }
  }

  /**
   * Analyze the given traces (or, if traceIds omitted, all on disk) and
   * write a JSON insight report to ../storage/insights/<id>.json.
   * Returns { insights, patterns, recommendations, insightId, source, llmAttempted }.
   */
  async analyzeTraces(traceIds) {
    const filter = Array.isArray(traceIds) && traceIds.length
      ? { ids: traceIds }
      : {};
    const traces = this.analyzer.loadTraces(filter);
    const stats = this.analyzer.aggregateStats(traces);
    const anomalies = this.analyzer.findAnomalies(traces);
    const successPatterns = this.analyzer.findSuccessPatterns(traces);
    const failurePatterns = this.analyzer.findFailurePatterns(traces);

    // Always-on heuristic view
    const heur = heuristicAnalysis(traces, stats);

    // LLM layer (optional). Failure is non-fatal.
    let llmAttempted = false;
    let llmResult = null;
    let llmError = null;
    if (this.llmEnabled) {
      llmAttempted = true;
      try {
        const summary = buildTraceSummary(traces);
        const reply = await callLlm(LLM_PROMPT(summary, stats));
        llmResult = extractJson(reply);
        if (llmResult) {
          // Merge LLM findings into the heuristic buckets.
          if (Array.isArray(llmResult.patterns)) {
            for (const p of llmResult.patterns) {
              heur.patterns.push({ type: 'llm_pattern', text: p.text, evidence: p.evidence });
            }
          }
          if (Array.isArray(llmResult.failures)) {
            for (const f of llmResult.failures) {
              heur.insights.push({ type: 'llm_failure', severity: 'med', text: f.text, evidence: f.evidence });
            }
          }
          if (Array.isArray(llmResult.recommendations)) {
            for (const r of llmResult.recommendations) {
              heur.recommendations.push({
                priority: r.priority || 'low',
                action: r.action,
                rationale: r.rationale,
                source: 'llm',
              });
            }
          }
        }
      } catch (err) {
        llmError = err.message;
      }
    }

    // Mine anomalies as their own recommendations
    if (anomalies.length) {
      heur.recommendations.push({
        priority: 'med',
        action: 'review_anomalies',
        rationale: `${anomalies.length} anomalous task(s) detected (timeouts or duration outliers). Review trace-analyzer.findAnomalies() output.`,
        source: 'heuristic',
        anomalyCount: anomalies.length,
      });
    }

    // Persist
    this._ensureInsightDir();
    const insightId = this._nextInsightId();
    const report = {
      id: insightId,
      createdAt: new Date().toISOString(),
      traceDir: this.traceDir,
      insightDir: this.insightDir,
      traceCount: traces.length,
      traceIds: traces.map(t => t.id),
      stats,
      anomalyCount: anomalies.length,
      successPatterns,
      failurePatterns,
      insights: heur.insights,
      patterns: heur.patterns,
      recommendations: heur.recommendations,
      source: llmResult ? 'llm+heuristic' : 'heuristic',
      llmAttempted,
      llmError,
      __version,
    };
    const outPath = path.join(this.insightDir, `${insightId}.json`);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    return report;
  }

  /** Load a previously saved insight report by id. */
  loadInsight(insightId) {
    const p = path.join(this.insightDir, `${insightId}.json`);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }

  /** List all saved insight reports, newest first. */
  listInsights() {
    if (!fs.existsSync(this.insightDir)) return [];
    const files = fs.readdirSync(this.insightDir).filter(f => f.endsWith('.json'));
    return files.sort().reverse().map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(this.insightDir, f), 'utf8')); }
      catch { return { id: f, _corrupt: true }; }
    });
  }
}

// ---------------------------------------------------------------------------
// Stand-alone function so the file is usable from cron/scripts.
// ---------------------------------------------------------------------------

async function analyzeTraces(traceIds, opts = {}) {
  const engine = new InsightEngine(opts);
  return engine.analyzeTraces(traceIds);
}

module.exports = {
  InsightEngine,
  analyzeTraces,
  __version,
  // For tests / advanced use
  _heuristicAnalysis: heuristicAnalysis,
  _callLlm: callLlm,
  _extractJson: extractJson,
};
