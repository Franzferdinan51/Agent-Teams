/**
 * @file loop.test.js
 * @description End-to-end test of the Hive Swarm execution loop.
 *
 * Exercises the full pipeline using Node's built-in `node:test` runner — no
 * external test framework required. The test:
 *
 *   1. Creates a real goal via GoalProcessor (heuristic path, offline-safe)
 *   2. Saves it via GoalStore
 *   3. Matches stub agents to tasks via AgentTaskMatcher
 *   4. Simulates task execution (hand-crafted responses)
 *   5. Saves traces to a sandboxed storage dir
 *   6. Runs TraceAnalyzer on the traces
 *   7. Runs InsightEngine on the traces
 *   8. Runs SkillEvolver.suggestEvolution() with the insights
 *   9. Runs GoalEvaluator.evaluate() on the goal
 *  10. Verifies all output files exist on disk and have valid JSON
 *
 * Storage is fully isolated under `tests/e2e/.tmp-loop/<run-id>/` so the
 * test never touches the real `execution-layer/storage/` data. The temp
 * dir is removed on test teardown.
 *
 * All modules are exercised with LLM calls disabled (`useLlm: false`,
 * `llmEnabled: false`) so the test runs offline in well under 30s.
 *
 * @author Hive Swarm (sub-agent E2E-1)
 * @version 1.0.0
 */

'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('node:fs');
const path     = require('node:path');
const os       = require('node:os');

// ────────────────────────────────────────────────────────────────────────────
// Module imports — production code under test
// ────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EXEC_DIR  = path.join(REPO_ROOT, 'hive-swarm-enhancements', 'execution-layer');

const { GoalProcessor } = require(path.join(EXEC_DIR, 'goal-system',  'goal-processor.js'));
const { GoalStore   }   = require(path.join(EXEC_DIR, 'goal-system',  'goal-store.js'));
const { GoalEvaluator } = require(path.join(EXEC_DIR, 'goal-system',  'goal-evaluator.js'));
const { AgentTaskMatcher } = require(
  path.join(EXEC_DIR, 'subagent-orchestrator', 'agent-task-matcher.js')
);
const { TraceAnalyzer }  = require(path.join(EXEC_DIR, 'evolution', 'trace-analyzer.js'));
const { InsightEngine }  = require(path.join(EXEC_DIR, 'evolution', 'insight-engine.js'));
const { SkillEvolver }   = require(path.join(EXEC_DIR, 'evolution', 'skill-evolver.js'));

// ────────────────────────────────────────────────────────────────────────────
// Sandbox storage helper
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build a fresh sandboxed storage root mirroring the production tree:
 *   <sandbox>/{goals,traces,insights,pending-evolutions}/
 * Returns a handle with `cleanup()` for teardown.
 */
function makeSandbox() {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-e2e-loop-'));
  const goalsDir    = path.join(sandbox, 'goals');
  const tracesDir   = path.join(sandbox, 'traces');
  const insightsDir = path.join(sandbox, 'insights');
  const pendingDir  = path.join(sandbox, 'pending-evolutions');
  for (const d of [goalsDir, tracesDir, insightsDir, pendingDir]) {
    fs.mkdirSync(d, { recursive: true });
  }
  return {
    sandbox, goalsDir, tracesDir, insightsDir, pendingDir,
    cleanup: () => { try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch (_) {} },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Fixture builders
// ────────────────────────────────────────────────────────────────────────────

/** Small agent roster covering the roles the heuristic breakdown produces. */
function makeStubAgents() {
  return [
    { id: 'agent-coder-1',    role: 'implementer', capabilities: ['general', 'file_operations', 'execute_javascript'],
      currentLoad: 0, maxLoad: 3, successRate: 0.92 },
    { id: 'agent-coder-2',    role: 'implementer', capabilities: ['general', 'file_operations', 'web_search'],
      currentLoad: 2, maxLoad: 3, successRate: 0.80 },
    { id: 'agent-planner-1',  role: 'planner',     capabilities: ['general'],
      currentLoad: 1, maxLoad: 5, successRate: 0.88 },
    { id: 'agent-reviewer-1', role: 'reviewer',    capabilities: ['general'],
      currentLoad: 0, maxLoad: 2, successRate: 0.95 },
    { id: 'agent-qa-1',       role: 'qa',          capabilities: ['general', 'execute_javascript'],
      currentLoad: 1, maxLoad: 2, successRate: 0.85 },
    { id: 'agent-research-1', role: 'researcher',  capabilities: ['general', 'web_search', 'web_scrape'],
      currentLoad: 0, maxLoad: 2, successRate: 0.90 },
  ];
}

/** Pick a role for a task so TraceAnalyzer's byRole grouping is meaningful. */
function pickRoleForTask(task) {
  const title = (task.title || '').toLowerCase();
  if (title.includes('research'))   return 'researcher';
  if (title.includes('plan'))      return 'planner';
  if (title.includes('review'))    return 'reviewer';
  if (title.includes('qa') || title.includes('test')) return 'qa';
  if (title.includes('implement') || title.includes('code') || title.includes('build')) return 'implementer';
  return ['researcher', 'planner', 'implementer', 'reviewer', 'qa'][Number(task.orderIndex) % 5];
}

/** Hand-craft a single swarm-run result entry for a task. */
function makeTraceResult(task, agent, opts = {}) {
  const inner = {
    status:   opts.status   || 'completed',
    output:   opts.output   || `[stub] ${task.title} done by ${agent.id}`,
    agent:    agent.id,
    role:     agent.role,
    mode:     opts.mode     || 'stub',
    duration: Number.isFinite(opts.durationMs) ? opts.durationMs : 150,
  };
  if (opts.error) inner.error = opts.error;
  return { dispatchId: `dispatch-${task.id}`, subtaskId: task.id, agentId: agent.id, result: inner };
}

/**
 * Build a full swarm-run trace from a goal + agents. Optional `failTaskId`
 * and `slowTaskId` inject one failure and one slow-but-completed task so
 * TraceAnalyzer has anomalies + a partial success rate to report.
 */
function makeSwarmRunTrace(goal, agents, opts = {}) {
  const startMs = Date.now();
  const results = [];
  let agentIdx = 0;
  for (const task of goal.tasks) {
    const agent = agents[agentIdx++ % agents.length];
    let resultOpts;
    if (task.id === opts.failTaskId) {
      resultOpts = { status: 'failed', output: '', error: 'simulated dependency timeout', durationMs: 420 };
    } else if (task.id === opts.slowTaskId) {
      resultOpts = { status: 'completed', output: `[stub-slow] ${task.title} `.repeat(20), durationMs: 3000 };
    } else {
      resultOpts = {
        status: 'completed',
        output: `[stub] ${task.title}\nFabricated-but-shaped content for a CLI todo app.`,
        durationMs: 120 + (agentIdx * 35),
      };
    }
    results.push(makeTraceResult(task, agent, resultOpts));
  }
  return {
    swarmId: `e2e-${goal.id}`,
    goal: goal.description || goal.title,
    startedAt: startMs,
    completedAt: new Date(startMs + 1500).toISOString(),
    totalDuration: 1500,
    domain: 'cli-tools', count: goal.tasks.length, timeout: 300000, mode: 'e2e-stub',
    subtasks: goal.tasks.map((t) => ({
      id: t.id, title: t.title, role: pickRoleForTask(t), depends_on: t.dependsOn || [],
    })),
    results,
    synthesis: {
      winner: results[results.length - 1].agentId,
      synthesized: 'e2e stub synthesis',
      scores: results.map((r) => ({ subtaskId: r.subtaskId, score: r.result.status === 'completed' ? 0.9 : 0.1 })),
      meta: { source: 'loop.test.js' },
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Lightweight file-system sanity helpers
// ────────────────────────────────────────────────────────────────────────────

/** Assert that `p` exists, is a file, and is valid JSON. Returns parsed obj. */
function readValidJson(p) {
  assert.ok(fs.existsSync(p), `expected file to exist: ${p}`);
  const stat = fs.statSync(p);
  assert.ok(stat.isFile(),     `expected path to be a file: ${p}`);
  assert.ok(stat.size > 0,     `expected non-empty file: ${p}`);
  const raw = fs.readFileSync(p, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    assert.fail(`expected valid JSON in ${p}, got: ${err.message}`);
  }
  assert.equal(typeof parsed, 'object', `expected JSON object in ${p}`);
  return parsed;
}

// ────────────────────────────────────────────────────────────────────────────
// THE TEST
// ────────────────────────────────────────────────────────────────────────────

test('full loop: goal → orchestrate → evaluate → insights → suggest', async (t) => {
  // Sandbox: completely isolated storage for this run.
  const sb = makeSandbox();
  t.after(() => sb.cleanup());

  // Shared state across subtests. node:test's t.ctx is per-test, so we
  // use a plain object that the subtests' closures all capture.
  const ctx = {};

  // ── 1+2. Create a real goal via GoalProcessor and save via GoalStore ───
  await t.test('1+2. GoalProcessor + GoalStore create and persist the goal', async () => {
    const store = new GoalStore({ root: sb.goalsDir });
    const processor = new GoalProcessor({ store, defaultProvider: 'stub', defaultModel: 'stub' });

    const result = await processor.processGoal(
      'build a CLI todo app, research existing tools, plan the architecture, implement the code, review it, and run qa tests',
      { useLlm: false }
    );

    assert.equal(result.ok, true, `processGoal should succeed, got: ${result.error || '(no error)'}`);
    assert.ok(result.goal, 'processGoal should return a goal document');
    assert.ok(result.goal.id.startsWith('goal_'),
      `goal id should be goal_-prefixed, got ${result.goal.id}`);
    assert.ok(result.goal.tasks.length >= 2,
      `goal should have multiple tasks, got ${result.goal.tasks.length}`);
    assert.equal(result.meta.source, 'heuristic', 'with useLlm:false source should be heuristic');

    // Round-trip: read it back from the GoalStore.
    const reloaded = store.getGoal(result.goal.id);
    assert.ok(reloaded, 'goal should be re-readable from GoalStore');
    assert.equal(reloaded.tasks.length, result.goal.tasks.length);

    // On-disk file + index must be valid JSON.
    const onDisk = readValidJson(path.join(sb.goalsDir, `${result.goal.id}.json`));
    assert.equal(onDisk.id, result.goal.id);
    const idx = readValidJson(path.join(sb.goalsDir, '_index.json'));
    assert.ok(idx.some((e) => e.id === result.goal.id),
      'goal id should appear in the index file');

    ctx.goal  = result.goal;
    ctx.store = store;
  });

  // ── 3. Match agents to tasks via AgentTaskMatcher ──────────────────────
  await t.test('3. AgentTaskMatcher ranks stub agents for each task', async () => {
    const goal = ctx.goal;
    const agents = makeStubAgents();
    const matcher = new AgentTaskMatcher();

    ctx.matchings = [];
    for (const task of goal.tasks) {
      const matcherTask = {
        id: task.id,
        title: task.title,
        requiredRole: pickRoleForTask(task),
        requiredTools: (task.requiredTools && task.requiredTools.length)
          ? task.requiredTools : ['general'],
      };
      const ranked = matcher.match(matcherTask, agents);
      assert.equal(ranked.length, agents.length,
        `matcher should return ${agents.length} ranked entries for task ${task.id}`);
      // Highest score first, score is in [0,1].
      assert.ok(ranked[0].score >= ranked[ranked.length - 1].score,
        'ranked results should be sorted high → low');
      assert.ok(ranked[0].score > 0,
        `top match for task ${task.id} should have positive score, got ${ranked[0].score}`);
      assert.ok(ranked[0].agent && ranked[0].agent.id,
        'top match should include the full agent object');
      ctx.matchings.push({ task, ranked });
    }
    assert.equal(ctx.matchings.length, goal.tasks.length,
      'every task should have a matching run');
  });

  // ── 4+5. Simulate execution and save traces ────────────────────────────
  await t.test('4+5. Simulate execution and persist swarm-run traces', async () => {
    const goal = ctx.goal;
    const agents = makeStubAgents();

    // Fail the LAST task (the final QA step blew up) and slow the middle one.
    // That gives TraceAnalyzer a partial success rate + duration outliers.
    const failTaskId = goal.tasks[goal.tasks.length - 1].id;
    const slowTaskId = goal.tasks[Math.floor(goal.tasks.length / 2)].id;

    const swarmRun = makeSwarmRunTrace(goal, agents, { failTaskId, slowTaskId });
    // Filename format mirrors the real subagent-runner output.
    const isoLike = new Date(swarmRun.startedAt).toISOString().replace(/[:.]/g, '-');
    const traceFile = path.join(sb.tracesDir, `${isoLike}-swarm-${swarmRun.swarmId}.json`);
    fs.writeFileSync(traceFile, JSON.stringify(swarmRun, null, 2), 'utf8');

    const reloaded = readValidJson(traceFile);
    assert.equal(reloaded.swarmId, swarmRun.swarmId);
    assert.equal(reloaded.results.length, goal.tasks.length);
    const failedCount = reloaded.results.filter((r) => r.result.status !== 'completed').length;
    assert.ok(failedCount >= 1, `at least one task should be non-completed, got ${failedCount}`);

    ctx.swarmRun   = swarmRun;
    ctx.traceFile  = traceFile;
    ctx.failTaskId = failTaskId;
    ctx.slowTaskId = slowTaskId;
  });

  // ── 6. TraceAnalyzer: stats, anomalies, patterns ──────────────────────
  await t.test('6. TraceAnalyzer produces stats, anomalies, and patterns', async () => {
    const analyzer = new TraceAnalyzer({
      traceDir:   sb.tracesDir,
      insightDir: sb.insightsDir,
      pendingDir: sb.pendingDir,
    });

    const traces = analyzer.loadTraces();
    assert.equal(traces.length, 1, 'should load exactly the one trace we wrote');
    const trace = traces[0];
    assert.equal(trace.tasks.length, ctx.goal.tasks.length);
    assert.ok(trace.totalDurationMs > 0, 'total duration should be derived');

    // Stats — partial success rate, ≥1 failure, ≥1 completion, ≥2 agents used.
    const stats = analyzer.aggregateStats(traces);
    assert.equal(stats.totalTraces, 1);
    assert.equal(stats.totalTasks, ctx.goal.tasks.length);
    assert.ok(stats.successRate > 0 && stats.successRate < 1,
      `expected partial success rate, got ${stats.successRate}`);
    assert.ok(stats.completedTasks >= 1);
    assert.ok(stats.failedTasks >= 1);
    assert.ok(Object.keys(stats.byAgent).length >= 2, 'multiple agents should appear in byAgent');
    assert.ok(Object.keys(stats.errorFrequency).length >= 1, 'error frequency should have ≥1 bucket');

    // Anomalies — slow task should be flagged as a duration outlier.
    const anomalies = analyzer.findAnomalies(traces);
    const outliers = anomalies.filter((a) => a.type === 'duration_outlier');
    assert.ok(outliers.length >= 1,
      `expected ≥1 duration outlier, got ${outliers.length} (anomalies: ${JSON.stringify(anomalies)})`);

    // Patterns
    const successPatterns = analyzer.findSuccessPatterns(traces);
    const failurePatterns = analyzer.findFailurePatterns(traces);
    assert.ok(successPatterns.every((p) =>
      typeof p.attribute === 'string' &&
      typeof p.value === 'string' &&
      typeof p.frequency === 'number' &&
      typeof p.successRate === 'number'
    ), 'every success pattern should have attribute/value/frequency/successRate');
    assert.ok(failurePatterns.every((p) =>
      typeof p.attribute === 'string' && typeof p.frequency === 'number'
    ), 'every failure pattern should have attribute/frequency');

    ctx.stats           = stats;
    ctx.anomalies       = anomalies;
    ctx.successPatterns = successPatterns;
    ctx.failurePatterns = failurePatterns;
  });

  // ── 7. InsightEngine: produces an insight report ──────────────────────
  await t.test('7. InsightEngine writes an insight report to disk', async () => {
    // llmEnabled:false → no network calls, pure heuristic path.
    const engine = new InsightEngine({
      traceDir:   sb.tracesDir,
      insightDir: sb.insightsDir,
      llmEnabled: false,
    });

    const report = await engine.analyzeTraces();
    assert.ok(report);
    assert.ok(report.id.startsWith('ins-'), `insight id should be ins-prefixed, got ${report.id}`);
    assert.equal(report.traceCount, 1);
    assert.equal(report.source, 'heuristic', 'with llmEnabled:false source should be heuristic');
    assert.equal(report.llmAttempted, false);
    assert.ok(report.stats, 'report should embed aggregate stats');
    assert.equal(report.anomalyCount, ctx.anomalies.length);
    assert.ok(report.insights.length >= 1, 'report should contain ≥1 insight (e.g. success_rate)');
    assert.ok(report.recommendations.length >= 1, 'report should contain ≥1 recommendation');

    const insightFile = path.join(sb.insightsDir, `${report.id}.json`);
    const onDisk = readValidJson(insightFile);
    assert.equal(onDisk.id, report.id);
    assert.equal(onDisk.traceCount, 1);

    ctx.insightReport = report;
    ctx.insightFile   = insightFile;
  });

  // ── 8. SkillEvolver.suggestEvolution: produces a pending evolution ───
  await t.test('8. SkillEvolver.suggestEvolution() writes a pending record', async () => {
    // llmEnabled:false → heuristic suggestion derived from top recommendation.
    const evolver = new SkillEvolver({
      insightDir: sb.insightsDir,
      pendingDir: sb.pendingDir,
      llmEnabled: false,
    });

    const record = await evolver.suggestEvolution(
      'hive-swarm-task-execution',
      ctx.insightReport,
      {
        currentPrompt:
          'You are the hive-swarm task-execution skill. ' +
          'Take a single task from a goal and execute it end-to-end. ' +
          'Be concise and report your result clearly.',
      }
    );

    assert.ok(record);
    assert.ok(record.id.startsWith('evo-'), `evolution id should be evo-prefixed, got ${record.id}`);
    assert.equal(record.skillName, 'hive-swarm-task-execution');
    assert.equal(record.status, 'pending');
    assert.ok(['low', 'med', 'high'].includes(record.risk), `risk should be low|med|high, got ${record.risk}`);
    assert.ok(record.suggestion && record.suggestion.proposedChange.length > 0,
      'suggestion should include a non-empty proposedChange string');
    assert.ok(record.rationale && record.rationale.length > 0, 'rationale should be non-empty');
    assert.ok(record.evidence && Array.isArray(record.evidence.insightIds),
      'evidence should include insightIds');
    assert.ok(record.evidence.insightIds.includes(ctx.insightReport.id),
      'evidence should reference the source insight report');
    assert.ok(record.diff && record.diff.includes('+++'),
      'diff should be a unified-diff-shaped string');

    // Pending record should be on disk.
    const pendingFile = path.join(sb.pendingDir, `${record.id}.json`);
    const onDisk = readValidJson(pendingFile);
    assert.equal(onDisk.id, record.id);
    assert.equal(onDisk.status, 'pending');

    // Audit log should have at least one entry.
    const auditPath = path.join(sb.pendingDir, 'audit-log.jsonl');
    assert.ok(fs.existsSync(auditPath), 'audit log should exist after suggestEvolution');
    const auditLines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
    assert.ok(auditLines.length >= 1, 'audit log should have at least one line');
    const firstAudit = JSON.parse(auditLines[0]);
    assert.equal(firstAudit.event, 'suggested');
    assert.equal(firstAudit.suggestionId, record.id);

    ctx.evolutionRecord = record;
    ctx.pendingFile     = pendingFile;
  });

  // ── 9. GoalEvaluator: scores the goal against its success criteria ──
  await t.test('9. GoalEvaluator.evaluate() scores and persists the result', async () => {
    // Mark tasks completed/failed so the heuristic score is meaningful.
    const store = ctx.store;
    for (const task of ctx.goal.tasks) {
      const status = task.id === ctx.failTaskId ? 'failed' : 'completed';
      const update = store.updateTask(ctx.goal.id, task.id, { status });
      assert.equal(update.ok, true, `updateTask for ${task.id} should succeed, got ${update.error}`);
    }
    store.flush();

    const evaluator = new GoalEvaluator({ store, defaultProvider: 'stub', defaultModel: 'stub' });
    const evalResult = await evaluator.evaluate(ctx.goal.id, { useLlm: false });

    assert.equal(evalResult.ok, true, `evaluate should succeed, got ${evalResult.error || '(no error)'}`);
    assert.ok(evalResult.evaluation);
    assert.equal(evalResult.evaluation.goalId, ctx.goal.id);
    assert.equal(typeof evalResult.evaluation.success, 'boolean');
    assert.ok(evalResult.evaluation.score >= 0 && evalResult.evaluation.score <= 1,
      `score should be 0..1, got ${evalResult.evaluation.score}`);
    assert.ok(evalResult.evaluation.criteria.length >= 1,
      'evaluation should evaluate at least one criterion');
    assert.ok(Array.isArray(evalResult.evaluation.recommendations));
    // With one failed task out of N, the score must be partial (< 1.0).
    assert.ok(evalResult.evaluation.score < 1,
      `score should be < 1 because one task failed, got ${evalResult.evaluation.score}`);
    assert.equal(evalResult.evaluation.source, 'heuristic');

    // The goal's status should have been patched + lastEvaluation embedded.
    const reloaded = readValidJson(path.join(sb.goalsDir, `${ctx.goal.id}.json`));
    assert.ok(['needs_review', 'validated'].includes(reloaded.status),
      `goal status should be patched, got ${reloaded.status}`);
    assert.ok(reloaded.meta && reloaded.meta.lastEvaluation,
      'goal meta should embed lastEvaluation');
    assert.equal(reloaded.meta.lastEvaluation.goalId, ctx.goal.id);
    assert.equal(reloaded.meta.lastEvaluation.score, evalResult.evaluation.score);

    ctx.evalResult = evalResult;
  });

  // ── 10. Verify all output files exist on disk and have valid JSON ─────
  await t.test('10. All artifacts on disk are present and valid JSON', async () => {
    // 10a-d. Every named artifact must exist + parse.
    readValidJson(path.join(sb.goalsDir, `${ctx.goal.id}.json`));
    readValidJson(path.join(sb.goalsDir, '_index.json'));
    readValidJson(ctx.traceFile);
    readValidJson(ctx.insightFile);
    readValidJson(ctx.pendingFile);

    // Audit log: every non-blank line must parse and have an event.
    const auditPath = path.join(sb.pendingDir, 'audit-log.jsonl');
    assert.ok(fs.existsSync(auditPath), 'audit log should exist');
    const auditRaw = fs.readFileSync(auditPath, 'utf8').trim();
    assert.ok(auditRaw.length > 0, 'audit log should be non-empty');
    for (const line of auditRaw.split('\n').filter(Boolean)) {
      const entry = JSON.parse(line);
      assert.equal(typeof entry.event, 'string', 'every audit entry should have an event field');
    }

    // 10e. Walk the sandbox tree — only .json / .jsonl files should exist
    // (catches accidental binary blobs or stray artifacts).
    function walk(dir) {
      const out = [];
      for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const st = fs.statSync(p);
        if (st.isDirectory()) out.push(...walk(p));
        else out.push(p);
      }
      return out;
    }
    const allFiles = walk(sb.sandbox);
    assert.ok(allFiles.length >= 5,
      `sandbox should have ≥5 files (goal, index, trace, insight, pending, audit), got ${allFiles.length}`);
    for (const f of allFiles) {
      if (f.endsWith('.jsonl')) continue;
      assert.ok(f.endsWith('.json'),
        `non-jsonl file in sandbox should be .json, got: ${path.relative(sb.sandbox, f)}`);
    }
  });
});
