/**
 * skill-evolver.js
 *
 * Adapted from agnt's services/goal/SkillEvolver.js (712 LOC) and
 * SkillForgeOrchestrator.js (249 LOC).
 *
 * **ADVISOR MODE — DOES NOT MUTATE SKILL FILES.**
 *
 * agnt's SkillEvolver runs an A/B test, auto-creates skill drafts in its
 * SkillModel, auto-deletes them if delta is below threshold, and auto-
 * promotes winners. We deliberately do NOT do that. The risk surface of
 * auto-mutating prompt files that drive subagent behavior is too high to
 * expose without a human in the loop.
 *
 * v1 contract:
 *   - suggestEvolution(skillName, insights)  ->  writes pending-evolution.json
 *   - applyEvolution(suggestionId, approver) ->  writes a diff-applied
 *      entry to audit-log.jsonl. It DOES NOT actually edit any skill file —
 *      the actual write is left to the human reviewer (or a separate, gated
 *      tooling process). The audit trail records the *intent* and the
 *      human who signed off.
 *
 * The pending file contains:
 *   { id, skillName, suggestion, rationale, risk, diff, evidence,
 *     createdAt, sourceInsights }
 *
 * The audit log (one JSON object per line) records:
 *   { ts, event: "suggested" | "approved" | "rejected" | "applied",
 *     suggestionId, skillName, approver, rationale }
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { _resolveInsightDir, _resolvePendingDir } = require('./trace-analyzer');

const __version = '0.1.0';

// ---------------------------------------------------------------------------
// Lightweight LLM call. Mirrors insight-engine's wrapper so behavior is
// predictable across the evolution subsystem.
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
          { role: 'system', content: 'You propose improvements to skill prompts. Be conservative, evidence-based, and produce small, reviewable diffs. Never recommend anything you cannot justify from the supplied evidence.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1200,
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

function extractJson(text) {
  if (!text) return null;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch (_) { return null; }
}

// ---------------------------------------------------------------------------
// Diff preview — produce a unified-diff-shaped string from "old" and "new".
// This is a *display* helper only; we never auto-apply. The diff helps the
// human reviewer eyeball the change.
// ---------------------------------------------------------------------------

function unifiedDiff(oldText, newText, fromName = 'skill', toName = 'skill (proposed)') {
  const a = String(oldText || '').split('\n');
  const b = String(newText || '').split('\n');
  // Naive LCS-based diff. Good enough for short skill prompts.
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [`--- ${fromName}`, `+++ ${toName}`];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) { out.push(` ${a[i]}`); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(`-${a[i]}`); i++; }
    else { out.push(`+${b[j]}`); j++; }
  }
  while (i < m) { out.push(`-${a[i++]}`); }
  while (j < n) { out.push(`+${b[j++]}`); }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Risk classification
// ---------------------------------------------------------------------------

function classifyRisk(suggestion) {
  // Heuristic, deterministic. LLM suggestions always get at least "med".
  // Manual suggestions with no code change are "low".
  const text = (suggestion && suggestion.proposedChange) || '';
  if (/delete|remove|destroy|wipe/.test(text.toLowerCase())) return 'high';
  if (/replace|overhaul|rewrite/.test(text.toLowerCase())) return 'high';
  if (/add|extend|clarify|annotate|document/.test(text.toLowerCase())) return 'low';
  return 'med';
}

// ---------------------------------------------------------------------------
// SkillEvolver
// ---------------------------------------------------------------------------

class SkillEvolver {
  constructor(opts = {}) {
    this.insightDir = opts.insightDir || _resolveInsightDir();
    this.pendingDir = opts.pendingDir || _resolvePendingDir();
    this.auditLogPath = opts.auditLogPath || path.join(this.pendingDir, 'audit-log.jsonl');
    this.llmEnabled = opts.llmEnabled !== false;
  }

  _ensurePendingDir() {
    if (!fs.existsSync(this.pendingDir)) {
      fs.mkdirSync(this.pendingDir, { recursive: true });
    }
  }

  _newSuggestionId() {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const rand = crypto.randomBytes(3).toString('hex');
    return `evo-${ts}-${rand}`;
  }

  _audit(entry) {
    this._ensurePendingDir();
    const line = JSON.stringify({ ts: new Date().toISOString(), __version, ...entry }) + '\n';
    fs.appendFileSync(this.auditLogPath, line, 'utf8');
  }

  // ----- Read existing pending suggestions -----

  /** List pending suggestions (those not yet applied/rejected). */
  listPending() {
    this._ensurePendingDir();
    const files = fs.readdirSync(this.pendingDir).filter(f =>
      f.endsWith('.json') && f !== 'audit-log.jsonl'
    );
    const out = [];
    for (const f of files) {
      try {
        const p = JSON.parse(fs.readFileSync(path.join(this.pendingDir, f), 'utf8'));
        if (!p.decision) out.push(p);
      } catch (_) { /* skip */ }
    }
    return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  loadSuggestion(suggestionId) {
    const p = path.join(this.pendingDir, `${suggestionId}.json`);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }

  // ----- Suggest (the only mutating side effect: write pending file) -----

  /**
   * Build an evolution suggestion for a named skill, given a list of
   * insight reports (or a single one).
   *
   * @param {string} skillName
   * @param {Object|Object[]} insights  Insight report(s) from InsightEngine.analyzeTraces()
   * @param {Object} [opts]              { currentPrompt?: string, manualSuggestion?: { proposedChange, rationale } }
   * @returns {Object} The pending-evolution record (also written to disk).
   */
  async suggestEvolution(skillName, insights, opts = {}) {
    const arr = Array.isArray(insights) ? insights : [insights];
    const sourceInsightIds = arr.map(i => i && i.id).filter(Boolean);

    let suggestion, llmAttempted = false, llmError = null;

    if (opts.manualSuggestion && opts.manualSuggestion.proposedChange) {
      // Bypass LLM — caller has already done the thinking.
      suggestion = {
        proposedChange: String(opts.manualSuggestion.proposedChange),
        rationale: String(opts.manualSuggestion.rationale || 'Manually proposed by caller.'),
      };
    } else if (this.llmEnabled) {
      llmAttempted = true;
      try {
        suggestion = await this._llmSuggest(skillName, arr, opts.currentPrompt || '');
      } catch (err) {
        llmError = err.message;
        suggestion = this._fallbackSuggestion(skillName, arr);
      }
    } else {
      suggestion = this._fallbackSuggestion(skillName, arr);
    }

    const risk = classifyRisk(suggestion);
    const newPrompt = opts.currentPrompt
      ? this._applyToPrompt(opts.currentPrompt, suggestion.proposedChange)
      : null;
    const diff = opts.currentPrompt && newPrompt
      ? unifiedDiff(opts.currentPrompt, newPrompt, `${skillName} (current)`, `${skillName} (proposed)`)
      : null;

    const record = {
      id: this._newSuggestionId(),
      skillName,
      createdAt: new Date().toISOString(),
      status: 'pending',
      suggestion,
      rationale: suggestion.rationale,
      risk,
      diff,
      proposedPrompt: newPrompt,
      evidence: {
        insightIds: sourceInsightIds,
        insightSummaries: arr.map(i => ({
          id: i && i.id,
          successRate: i && i.stats && i.stats.successRate,
          recommendationCount: i && i.recommendations && i.recommendations.length,
        })),
      },
      llmAttempted,
      llmError,
      __version,
    };

    this._ensurePendingDir();
    const outPath = path.join(this.pendingDir, `${record.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
    this._audit({ event: 'suggested', suggestionId: record.id, skillName, risk });

    return record;
  }

  // ----- Human-in-the-loop approval gates -----

  /**
   * Approve a pending suggestion. Does NOT mutate the skill file —
   * it only marks the suggestion as approved in place and appends to the
   * audit log. The human reviewer is responsible for actually editing the
   * skill file, OR a separate gated tool (not in this module) can do it.
   *
   * @param {string} suggestionId
   * @param {string} approver  Human/system id that approved
   * @param {string} [note]
   */
  approveEvolution(suggestionId, approver, note = '') {
    if (!approver) throw new Error('approver is required');
    const record = this.loadSuggestion(suggestionId);
    if (record.decision) throw new Error(`Suggestion ${suggestionId} already decided (${record.decision})`);
    record.decision = 'approved';
    record.decidedAt = new Date().toISOString();
    record.approver = approver;
    record.decisionNote = note;
    fs.writeFileSync(path.join(this.pendingDir, `${suggestionId}.json`), JSON.stringify(record, null, 2));
    this._audit({ event: 'approved', suggestionId, skillName: record.skillName, approver, note });
    return record;
  }

  /**
   * Reject a pending suggestion. Pure metadata update + audit.
   */
  rejectEvolution(suggestionId, approver, note = '') {
    if (!approver) throw new Error('approver is required');
    const record = this.loadSuggestion(suggestionId);
    if (record.decision) throw new Error(`Suggestion ${suggestionId} already decided (${record.decision})`);
    record.decision = 'rejected';
    record.decidedAt = new Date().toISOString();
    record.approver = approver;
    record.decisionNote = note;
    fs.writeFileSync(path.join(this.pendingDir, `${suggestionId}.json`), JSON.stringify(record, null, 2));
    this._audit({ event: 'rejected', suggestionId, skillName: record.skillName, approver, note });
    return record;
  }

  /**
   * Mark a previously-approved suggestion as applied. STILL does not
   * mutate any file outside of its own pending-evolution directory.
   * The caller is expected to have applied the change to the real skill
   * file by some other means — this call just records that it happened.
   */
  applyEvolution(suggestionId, appliedBy) {
    if (!appliedBy) throw new Error('appliedBy is required');
    const record = this.loadSuggestion(suggestionId);
    if (record.decision !== 'approved') {
      throw new Error(`applyEvolution requires an approved suggestion (${suggestionId} is ${record.decision || 'pending'})`);
    }
    record.appliedAt = new Date().toISOString();
    record.appliedBy = appliedBy;
    record.status = 'applied';
    fs.writeFileSync(path.join(this.pendingDir, `${suggestionId}.json`), JSON.stringify(record, null, 2));
    this._audit({ event: 'applied', suggestionId, skillName: record.skillName, appliedBy });
    return record;
  }

  // ----- LLM & heuristics (private) -----

  async _llmSuggest(skillName, insightReports, currentPrompt) {
    const evidence = insightReports.map(i => ({
      id: i.id,
      successRate: i.stats && i.stats.successRate,
      topErrors: i.stats && Object.entries(i.stats.errorFrequency || {}).slice(0, 3),
      recommendations: (i.recommendations || []).slice(0, 5),
      anomalies: i.anomalyCount,
    }));
    const prompt = `You are reviewing evidence about a skill named "${skillName}" and proposing a small, safe improvement to its prompt.

Rules:
- Propose AT MOST one focused change (a few sentences / a single paragraph).
- Do NOT propose removing safety guardrails.
- Keep the diff minimal and easy to review.
- The proposed change should be a concrete text addition/replacement for the skill prompt.
- Set risk to "low" if it's a clarification; "med" if it adds new instructions; "high" if it removes/overhauls existing behavior.

Current skill prompt (may be empty):
"""
${currentPrompt || '(none provided)'}
"""

Evidence from execution traces:
${JSON.stringify(evidence, null, 2)}

Return JSON of the form:
{
  "proposedChange": "<the new paragraph / instruction to add or replace>",
  "rationale": "<why this change, citing the evidence>",
  "risk": "low|med|high"
}`;
    const reply = await callLlm(prompt);
    const parsed = extractJson(reply);
    if (!parsed || !parsed.proposedChange) {
      throw new Error('LLM did not return a parseable suggestion');
    }
    return parsed;
  }

  _fallbackSuggestion(skillName, insightReports) {
    // No-LLM path: pick the top recommendation from the first insight
    // report that has one, and frame it as a skill-prompt addition.
    for (const i of insightReports) {
      const recs = (i && i.recommendations) || [];
      const top = recs.find(r => r.priority === 'high') || recs[0];
      if (top) {
        return {
          proposedChange: `Add guidance: when this skill runs, "${top.action}". Reason: ${top.rationale}.`,
          rationale: `Derived from insight ${i.id || '(unnamed)'} recommendation (priority=${top.priority || 'n/a'}).`,
          risk: 'med',
        };
      }
    }
    return {
      proposedChange: `Clarify the skill prompt to state its scope, inputs, and expected outputs more explicitly.`,
      rationale: 'No actionable recommendations were available in the supplied insight reports; defaulting to a low-risk clarification.',
      risk: 'low',
    };
  }

  _applyToPrompt(currentPrompt, proposedChange) {
    if (!currentPrompt) return proposedChange;
    // Append as a clearly-marked ADVISOR NOTE so reviewers can find it.
    const sep = currentPrompt.endsWith('\n') ? '\n' : '\n\n';
    return `${currentPrompt}${sep}<!-- ADVISOR NOTE (pending review) -->\n${proposedChange}\n`;
  }
}

// ---------------------------------------------------------------------------
// Stand-alone helpers
// ---------------------------------------------------------------------------

async function suggestEvolution(skillName, insights, opts = {}) {
  return new SkillEvolver(opts).suggestEvolution(skillName, insights, opts);
}

function applyEvolution(suggestionId, appliedBy, opts = {}) {
  return new SkillEvolver(opts).applyEvolution(suggestionId, appliedBy);
}

module.exports = {
  SkillEvolver,
  suggestEvolution,
  applyEvolution,
  __version,
  // For tests
  _classifyRisk: classifyRisk,
  _unifiedDiff: unifiedDiff,
  _callLlm: callLlm,
  _extractJson: extractJson,
};
