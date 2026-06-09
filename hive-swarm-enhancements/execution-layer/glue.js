/**
 * @file glue.js
 * @description The Hive Swarm GLUE — unifies the core swarm layer
 * (`core/worker-dispatcher.js`, `core/result-aggregator.js`) with the
 * execution layer (`goal-system/goal-processor.js`,
 * `goal-system/goal-store.js`, `goal-system/goal-evaluator.js`,
 * `evolution/insight-engine.js`, `subagent-orchestrator/subagent-runner.js`).
 *
 * The two halves were built side-by-side and never wired together:
 *
 *   core/worker-dispatcher.js   expects subtasks in the shape
 *     { id, title, prompt, role, depends_on }
 *     and resolves them over the Agent Mesh WebSocket.
 *
 *   execution-layer/goal-processor.js  emits tasks in the shape
 *     { id, title, description, requiredTools[], priority, dependsOn[] }
 *     and persists them to GoalStore.
 *
 * This module is the single entry point that turns a free-form goal text
 * into a completed, evaluated, insight-rich run:
 *
 *   1. GoalProcessor.processGoal(goalText)            → goal + tasks
 *   2. GoalStore.createGoal(...)                      → persisted
 *   3. _convertTasks(tasks)                           → core/{id,title,prompt,role,depends_on}
 *   4. WorkerDispatcher.dispatch(tasks, agents)       → parallel execution
 *   5. For each result, build a SubagentRunner-style trace, persist
 *      to execution-layer/storage/traces/<traceId>.json
 *   6. Persist a top-level swarm-run file in the trace-analyzer schema
 *      so the evolution engine can read it.
 *   7. GoalEvaluator.evaluate(goalId)                  → evaluation
 *   8. InsightEngine.analyzeTraces(traceIds)           → insights
 *   9. Return { goalId, runId, traces, results, evaluation, insights }
 *
 * @module execution-layer/glue
 * @version 1.0.0
 * @author Hive Swarm (sub-agent GLUE-1)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// ────────────────────────────────────────────────────────────────────────────
// Sibling modules
// ────────────────────────────────────────────────────────────────────────────

const WorkerDispatcher = require('../core/worker-dispatcher');

const { GoalProcessor, processGoal, __version: PROCESSOR_VERSION }
  = require('./goal-system/goal-processor');
const { GoalStore, __version: STORE_VERSION }
  = require('./goal-system/goal-store');
const { GoalEvaluator, evaluate, __version: EVALUATOR_VERSION }
  = require('./goal-system/goal-evaluator');
const { SubagentRunner, __version: RUNNER_VERSION }
  = require('./subagent-orchestrator/subagent-runner');
const { analyzeTraces: analyzeTracesFn, __version: INSIGHT_VERSION }
  = require('./evolution/insight-engine');

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const __version = '1.0.0';

const STORAGE_ROOT      = path.resolve(__dirname, 'storage');
const TRACES_DIR        = path.join(STORAGE_ROOT, 'traces');
const LOG_DIR           = path.resolve(__dirname, '..', 'build-logs');
const LOG_FILE          = path.join(LOG_DIR, 'glue.log');

const MESH_HTTP = process.env.MESH_URL || 'http://localhost:4000';
const MESH_KEY  = process.env.MESH_KEY || 'openclaw-mesh-default-key';
const MESH_WS   = MESH_HTTP.replace(/^http/i, 'ws') + '/ws';

const DEFAULT_AGENT_POOL = Object.freeze([
  { id: 'researcher-1', name: 'Researcher',  role: 'researcher',
    capabilities: ['research', 'investigate', 'web_search', 'web_scrape'],
    room: 'research' },
  { id: 'planner-1',    name: 'Planner',     role: 'planner',
    capabilities: ['planner', 'architect', 'design', 'strategy'],
    room: 'planning' },
  { id: 'coder-1',      name: 'Implementer', role: 'implementer',
    capabilities: ['build', 'coder', 'engineer', 'implement',
                   'execute_javascript', 'file_operations', 'github_api'],
    room: 'build' },
  { id: 'reviewer-1',   name: 'Reviewer',    role: 'reviewer',
    capabilities: ['audit', 'reviewer', 'qa', 'review', 'security'],
    room: 'audit' },
  { id: 'coordinator-1',name: 'Coordinator', role: 'coordinator',
    capabilities: ['coordinator', 'orchestrator', 'lead', 'manager'],
    room: 'coordination' },
]);

/** Map tool-library names → inferred role. Used when GoalProcessor didn't
 *  attach a role hint. Order matters: first match wins. */
const TOOL_TO_ROLE = Object.freeze([
  { tools: ['web_search', 'web_scrape'],     role: 'researcher' },
  { tools: ['gmail_api', 'slack_api', 'notion_api'],
                                           role: 'coordinator' },
  { tools: ['send_email'],                  role: 'coordinator' },
  { tools: ['execute_javascript',
            'file_operations',
            'github_api',
            'google_drive'],                role: 'implementer' },
  { tools: ['google_calendar'],             role: 'planner' },
  { tools: ['generate_with_ai_llm'],        role: 'planner' },
  { tools: ['general'],                     role: 'implementer' },
]);

const VALID_TASK_STATUSES = Object.freeze([
  'pending', 'in_progress', 'completed', 'failed', 'skipped', 'blocked',
]);

// ────────────────────────────────────────────────────────────────────────────
// Logging — never throws
// ────────────────────────────────────────────────────────────────────────────

function logLine(line) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`, 'utf8');
  } catch (_) { /* swallow */ }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generate a short, sortable, URL-safe id.
 * @param {string} prefix
 * @returns {string}
 */
function newId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Coerce any value to a primitive string for safe logging / serialization.
 * @param {*} v
 * @returns {string}
 */
function toStr(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch (_) { return String(v); }
}

/**
 * Truncate a string to N chars with an ellipsis suffix.
 * @param {string} s
 * @param {number} n
 * @returns {string}
 */
function truncate(s, n = 60) {
  const str = toStr(s);
  return str.length <= n ? str : str.slice(0, n - 1) + '…';
}

/**
 * Infer a role for an execution-layer task based on its `requiredTools`
 * and/or its `title`. Falls back to `implementer` when nothing matches.
 *
 * @param {{title?:string, description?:string, requiredTools?:string[]}} task
 * @returns {string} role name
 */
function inferRole(task) {
  if (!task || typeof task !== 'object') return 'implementer';

  const tools = Array.isArray(task.requiredTools) ? task.requiredTools : [];
  for (const t of tools) {
    if (typeof t !== 'string') continue;
    for (const mapping of TOOL_TO_ROLE) {
      if (mapping.tools.includes(t)) return mapping.role;
    }
  }

  const haystack = `${task.title || ''} ${task.description || ''}`.toLowerCase();
  if (/(research|investigate|find|search|analy[sz]e)/.test(haystack)) return 'researcher';
  if (/(plan|design|architect|strategy|roadmap)/.test(haystack))         return 'planner';
  if (/(review|audit|qa|verif|test|check)/.test(haystack))              return 'reviewer';
  if (/(coordin|orchestrat|schedul|message|notify)/.test(haystack))     return 'coordinator';
  if (/(build|implement|code|write|create|develop|fix)/.test(haystack))  return 'implementer';
  return 'implementer';
}

/**
 * Pick a room for the task — used by `WorkerDispatcher._inferRoom` if
 * the subtask doesn't carry an explicit `room`. We pre-resolve here so
 * the core dispatcher has less guessing to do.
 *
 * @param {string} role
 * @returns {string}
 */
function roomForRole(role) {
  const hit = DEFAULT_AGENT_POOL.find((a) => a.role === role);
  return hit ? hit.room : 'general';
}

/**
 * Convert an execution-layer task into the core subtask shape that
 * `WorkerDispatcher.dispatch()` expects.
 *
 *   { id, title, description, requiredTools[], dependsOn[] }
 *   ↓
 *   { id, title, prompt (=description), role (inferred), depends_on, room }
 *
 * @param {object} task
 * @param {number} index
 * @returns {object} core subtask
 */
function convertTask(task, index) {
  const id = task.id || `task_${index + 1}`;
  const title = (typeof task.title === 'string' && task.title.trim())
    ? task.title.trim().slice(0, 80)
    : `Task ${index + 1}`;
  const description = (typeof task.description === 'string' && task.description.trim())
    ? task.description.trim()
    : title;
  const role = inferRole(task);
  const dependsOn = Array.isArray(task.dependsOn)
    ? task.dependsOn.filter((d) => d != null).map(String)
    : [];
  const requiredTools = Array.isArray(task.requiredTools)
    ? task.requiredTools.filter((t) => typeof t === 'string')
    : [];

  return {
    id,
    title,
    prompt: description,           // ← core format: `prompt`
    description,                    // ← keep `description` too (dispatcher tolerates it)
    role,                           // ← inferred from requiredTools
    depends_on: dependsOn,          // ← core format: `depends_on` (snake)
    dependsOn,                      // ← keep camelCase too, for inspection
    requiredCapability: role,       // ← hint for _pickAgent
    room: roomForRole(role),
    payload: {
      requiredTools,
      priority: task.priority || 'medium',
    },
    timeoutMs: task.timeoutMs,
  };
}

/**
 * Pick the agents that should be used to execute a set of tasks.
 * - If the caller supplies `agents`, use that.
 * - Otherwise, derive one agent per distinct role inferred from the
 *   converted subtasks, falling back to the default pool.
 *
 * @param {object[]} subtasks   Output of `convertTasks`
 * @param {object[]} [agents]   Caller-supplied agent pool
 * @returns {object[]} agent list (non-empty)
 */
function pickAgents(subtasks, agents) {
  if (Array.isArray(agents) && agents.length > 0) return agents;

  const roles = new Set();
  for (const s of subtasks) {
    if (s && s.role) roles.add(s.role);
  }
  if (roles.size === 0) return DEFAULT_AGENT_POOL.slice();

  const out = [];
  for (const role of roles) {
    const hit = DEFAULT_AGENT_POOL.find((a) => a.role === role);
    if (hit) out.push(hit);
  }
  // Always include coordinator so orchestration is addressable.
  if (!out.find((a) => a.role === 'coordinator')) {
    out.push(DEFAULT_AGENT_POOL.find((a) => a.role === 'coordinator'));
  }
  return out.length > 0 ? out : DEFAULT_AGENT_POOL.slice();
}

/**
 * Build a per-subtask trace document compatible with the
 * `SubagentRunner._writeTrace` shape and the `TraceAnalyzer.normalizeTrace`
 * format (so the evolution engine can read it).
 *
 * @param {object} args
 * @returns {object} trace
 */
function buildTrace(args) {
  const {
    traceId, task, agent, startedAt, endedAt, status, output, error,
    dispatchId, subtaskId, result,
  } = args;

  const durationMs = Math.max(0, (endedAt || Date.now()) - (startedAt || Date.now()));
  const meta = {
    traceId,
    taskId:   task && task.id,
    agentId:  agent && agent.id,
    role:     agent && agent.role,
    provider: 'mesh',
    model:    agent && agent.model ? agent.model : 'mesh-default',
    startedAt:  new Date(startedAt).toISOString(),
    endedAt:    new Date(endedAt).toISOString(),
    durationMs,
    tokens: { prompt: 0, completion: 0, total: 0 },
    toolCalls: [],
    error: error || null,
    status,
  };

  return {
    traceId,
    task,
    agent,
    messages: [],                 // mesh-routed tasks don't capture LLM messages
    response: result || null,
    output:   output != null ? output : (result && result.output) || null,
    meta,
    // Fields the trace-analyzer normalizer looks for when scanning a
    // single-task trace file:
    swarmId:  dispatchId,         // dispatchId ≈ swarm-run id
    subtasks: [{
      id: subtaskId,
      title: task && task.title,
      role:  agent && agent.role,
    }],
    results: [{
      dispatchId, subtaskId,
      agentId: agent && agent.id,
      result: {
        status,
        output:  output != null ? output : (result && result.output),
        role:    agent && agent.role,
        mode:    'mesh',
        duration: durationMs,
        error:   error || null,
      },
    }],
  };
}

/**
 * Build the top-level swarm-run document (single file) in the shape
 * `TraceAnalyzer.normalizeTrace` expects:
 *   { swarmId, goal, startedAt, completedAt, totalDuration, subtasks, results, synthesis }
 *
 * @param {object} args
 * @returns {object}
 */
function buildSwarmRun(args) {
  const { runId, goalText, goalId, subtasks, results, startedAt, completedAt, agents } = args;
  return {
    swarmId:      runId,
    goalId:       goalId || null,
    goal:         goalText,
    startedAt,
    completedAt:  new Date(completedAt).toISOString(),
    totalDuration: Math.max(0, completedAt - startedAt),
    domain:       args.domain || 'auto',
    mode:         'glue',
    subtasks: subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      role: s.role,
      requiredTools: (s.payload && s.payload.requiredTools) || [],
      depends_on: s.depends_on || [],
    })),
    agents: agents.map((a) => ({ id: a.id, name: a.name, role: a.role, room: a.room })),
    results: results.map((r) => ({
      dispatchId: r.dispatchId,
      subtaskId:  r.subtaskId,
      agentId:    r.agentId,
      status:     r.status,
      result: {
        status: r.status,
        output: r.output,
        role:   r.role,
        mode:   r.mode || 'mesh',
        duration: r.duration,
        error:  r.error || null,
      },
    })),
    synthesis: {
      summary:  args.summary || 'glue pipeline complete',
      completedCount: results.filter((r) => r.status === 'completed').length,
      failedCount:    results.filter((r) => r.status === 'failed').length,
    },
  };
}

/**
 * Atomic JSON write — tmp file + rename.
 * @param {string} file
 * @param {*} data
 * @returns {boolean}
 */
function atomicWriteJson(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    if (!fs.existsSync(path.dirname(file))) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    return true;
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// HiveGlue
// ────────────────────────────────────────────────────────────────────────────

/**
 * @class HiveGlue
 * @classdesc The single entry point that unifies core swarm + execution
 * layer. Emits lifecycle events so CLI / WebUI can render progress.
 *
 * @fires HiveGlue#goal_processed     — { goalId, tasks }
 * @fires HiveGlue#dispatch_start     — { dispatchId, tasks }
 * @fires HiveGlue#agent_started      — { dispatchId, subtaskId, agentId }
 * @fires HiveGlue#agent_completed    — { dispatchId, subtaskId, result }
 * @fires HiveGlue#agent_failed       — { dispatchId, subtaskId, error }
 * @fires HiveGlue#dispatch_complete  — { dispatchId, summary }
 * @fires HiveGlue#evaluation_done    — { goalId, evaluation }
 * @fires HiveGlue#insights_done      — { insights }
 * @fires HiveGlue#run_complete       — { result }
 */
class HiveGlue extends EventEmitter {
  /**
   * @param {object} [options]
   * @param {GoalStore} [options.store]      Custom GoalStore (else: default)
   * @param {WorkerDispatcher} [options.dispatcher]  Custom dispatcher (else: created)
   * @param {GoalProcessor} [options.processor]      Custom processor (else: created)
   * @param {GoalEvaluator} [options.evaluator]      Custom evaluator (else: created)
   * @param {SubagentRunner} [options.runner]        Custom runner (else: created)
   * @param {string} [options.tracesDir]             Where to write per-trace files
   * @param {boolean} [options.evaluate=true]         Run GoalEvaluator after dispatch
   * @param {boolean} [options.analyze=true]          Run InsightEngine after evaluate
   * @param {boolean} [options.persist=true]          Persist traces + swarm-run to disk
   * @param {number}  [options.subtaskTimeoutMs=300000]
   * @param {object[]} [options.agents]               Custom agent pool
   */
  constructor(options = {}) {
    super();

    this.store       = options.store       instanceof GoalStore ? options.store : new GoalStore();
    this.processor   = options.processor   instanceof GoalProcessor ? options.processor : new GoalProcessor({ store: this.store });
    this.evaluator   = options.evaluator   instanceof GoalEvaluator ? options.evaluator : new GoalEvaluator({ store: this.store });
    this.dispatcher  = options.dispatcher  instanceof WorkerDispatcher
      ? options.dispatcher
      : new WorkerDispatcher({ subtaskTimeout: options.subtaskTimeoutMs });
    this.runner      = options.runner      instanceof SubagentRunner ? options.runner : new SubagentRunner({ dispatcher: this.dispatcher });

    this.tracesDir        = options.tracesDir || TRACES_DIR;
    this.evaluate         = options.evaluate !== false;
    this.analyze          = options.analyze  !== false;
    this.persist          = options.persist  !== false;
    this.subtaskTimeoutMs = options.subtaskTimeoutMs || 5 * 60 * 1000;
    this.agents           = Array.isArray(options.agents) ? options.agents : null;

    if (this.persist) {
      try { fs.mkdirSync(this.tracesDir, { recursive: true }); }
      catch (err) {
        console.error(`[HiveGlue] ⚠️  cannot create ${this.tracesDir}: ${err.message}`);
        this.persist = false;
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Public API
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Run the unified goal pipeline.
   *
   * @param {string} goalText
   * @param {object} [options]
   * @param {string} [options.domain]            Domain hint passed to GoalProcessor
   * @param {string} [options.provider]          LLM provider key
   * @param {string} [options.model]             LLM model id
   * @param {boolean} [options.useLlm=true]
   * @param {object[]} [options.agents]          Custom agent pool
   * @param {boolean} [options.evaluate]         Override constructor default
   * @param {boolean} [options.analyze]          Override constructor default
   * @param {boolean} [options.persist]          Override constructor default
   * @returns {Promise<{
   *   ok:boolean,
   *   goalId?:string,
   *   runId?:string,
   *   goal?:object,
   *   traces?:object[],
   *   results?:object[],
   *   evaluation?:object,
   *   insights?:object,
   *   error?:string
   * }>}
   */
  async runGoal(goalText, options = {}) {
    const t0 = Date.now();
    if (typeof goalText !== 'string' || !goalText.trim()) {
      return { ok: false, error: 'runGoal: goalText is required' };
    }
    const opts = {
      domain: options.domain || 'auto',
      provider: options.provider,
      model: options.model,
      useLlm: options.useLlm !== false,
      agents: Array.isArray(options.agents) ? options.agents : this.agents,
      evaluate: options.evaluate != null ? options.evaluate : this.evaluate,
      analyze:  options.analyze  != null ? options.analyze  : this.analyze,
      persist:  options.persist  != null ? options.persist  : this.persist,
    };

    logLine(`runGoal: "${truncate(goalText, 80)}" (domain=${opts.domain})`);

    // ── 1. GoalProcessor → goal + tasks
    const processed = await this.processor.processGoal(goalText, {
      domain: opts.domain,
      provider: opts.provider,
      model: opts.model,
      useLlm: opts.useLlm,
      store: this.store,
    });
    if (!processed.ok || !processed.goal) {
      logLine(`runGoal: processGoal failed: ${processed.error}`);
      return { ok: false, error: processed.error || 'processGoal failed' };
    }
    const goal = processed.goal;
    this.emit('goal_processed', { goalId: goal.id, tasks: goal.tasks });

    // Mark goal as in_progress in the store
    try { this.store.updateGoal(goal.id, { status: 'in_progress' }); } catch (_) { /* ignore */ }

    // ── 2. Convert tasks to core subtask shape
    const subtasks = (goal.tasks || []).map((t, i) => convertTask(t, i));
    if (subtasks.length === 0) {
      // Edge case: LLM returned no tasks. Synthesize one so dispatch isn't empty.
      subtasks.push(convertTask({
        id: 'task_synth_1',
        title: 'Execute goal',
        description: goalText,
        requiredTools: ['general'],
        dependsOn: [],
      }, 0));
    }

    // ── 3. Pick agent pool
    const agents = pickAgents(subtasks, opts.agents);

    // ── 4. Dispatch
    const runId = newId('run');
    const dispatchStartedAt = Date.now();
    let dispatchResult;
    try {
      dispatchResult = this.dispatcher.dispatch(subtasks, agents, {
        goal: goalText,
        timeoutMs: this.subtaskTimeoutMs,
      });
    } catch (err) {
      logLine(`runGoal: dispatch() threw: ${err.message}`);
      // Update task statuses to failed and bail.
      this._markAllTasksFailed(goal.id, subtasks, err.message);
      return { ok: false, error: `dispatch() failed: ${err.message}`, goalId: goal.id, runId };
    }

    this.emit('dispatch_start', { dispatchId: dispatchResult.dispatchId, tasks: subtasks });

    // ── 5. Wire up dispatcher events → re-emit on HiveGlue
    const forwardEvent = (evt) => (...a) => this.emit(evt, ...a);
    const onStarted   = forwardEvent('agent_started');
    const onCompleted = forwardEvent('agent_completed');
    const onFailed    = forwardEvent('agent_failed');
    const onProgress  = forwardEvent('agent_progress');
    this.dispatcher.on('agent_started',   onStarted);
    this.dispatcher.on('agent_completed', onCompleted);
    this.dispatcher.on('agent_failed',    onFailed);
    this.dispatcher.on('agent_progress',  onProgress);

    // Wait for all promises to settle.
    let settled;
    try {
      settled = await Promise.allSettled(dispatchResult.promises);
    } catch (err) {
      logLine(`runGoal: allSettled threw: ${err.message}`);
      settled = [];
    } finally {
      this.dispatcher.removeListener('agent_started',   onStarted);
      this.dispatcher.removeListener('agent_completed', onCompleted);
      this.dispatcher.removeListener('agent_failed',    onFailed);
      this.dispatcher.removeListener('agent_progress',  onProgress);
    }

    const dispatchEndedAt = Date.now();

    // ── 6. Build per-subtask results, traces, and persist
    const traces = [];
    const results = [];
    for (let i = 0; i < subtasks.length; i++) {
      const sub = subtasks[i];
      const settledRes = settled[i];
      const ok = settledRes && settledRes.status === 'fulfilled';
      const value = ok ? settledRes.value : null;
      const reason = ok ? null : (settledRes && settledRes.reason && settledRes.reason.message) || 'unknown error';

      // The dispatcher wraps the result as { dispatchId, subtaskId, agentId, result }
      const inner = value && value.result;
      const status = ok ? 'completed' : 'failed';
      const traceId = newId('trace');
      const startedAt = dispatchStartedAt + (i * 10); // approximate
      const endedAt   = ok ? Date.now() : dispatchEndedAt;
      const agent = agents.find((a) => a.id === (value && value.agentId)) || null;

      // Per-subtask result, in a normalized shape
      const resultRow = {
        dispatchId: dispatchResult.dispatchId,
        subtaskId:  sub.id,
        agentId:    agent ? agent.id : null,
        agentRole:  agent ? agent.role : sub.role,
        role:       sub.role,
        status,
        mode:       'mesh',
        output:     ok && inner != null ? inner : null,
        error:      ok ? null : reason,
        duration:   Math.max(0, endedAt - startedAt),
        traceId,
      };
      results.push(resultRow);

      // Build + persist per-subtask trace
      const trace = buildTrace({
        traceId,
        task: sub,
        agent,
        startedAt,
        endedAt,
        status,
        output: resultRow.output,
        error:  resultRow.error,
        dispatchId: dispatchResult.dispatchId,
        subtaskId:  sub.id,
        result:     resultRow.output,
      });
      traces.push(trace);

      if (this.persist) {
        atomicWriteJson(path.join(this.tracesDir, `${traceId}.json`), trace);
      }

      // Update the goal's task status in the store
      const storeStatus = status === 'completed' ? 'completed' : 'failed';
      try {
        this.store.updateTask(goal.id, sub.id, { status: storeStatus });
      } catch (_) { /* ignore — store may not have the task yet */ }
    }

    this.emit('dispatch_complete', {
      dispatchId: dispatchResult.dispatchId,
      summary: {
        total:     results.length,
        completed: results.filter((r) => r.status === 'completed').length,
        failed:    results.filter((r) => r.status === 'failed').length,
      },
    });

    // ── 7. Persist top-level swarm-run file (so trace-analyzer can find it)
    let swarmRunPath = null;
    if (this.persist) {
      const swarmRun = buildSwarmRun({
        runId,
        goalText,
        goalId: goal.id,
        subtasks,
        results,
        agents,
        startedAt: dispatchStartedAt,
        completedAt: dispatchEndedAt,
        domain: opts.domain,
        summary: `glue: ${results.filter((r) => r.status === 'completed').length}/${results.length} completed`,
      });
      const fileName = `${new Date(dispatchStartedAt).toISOString().replace(/[:.]/g, '-')}-${runId}.json`;
      swarmRunPath = path.join(this.tracesDir, fileName);
      atomicWriteJson(swarmRunPath, swarmRun);
    }

    // ── 8. Mark goal status
    const allCompleted = results.every((r) => r.status === 'completed');
    const anyFailed    = results.some((r) => r.status === 'failed');
    const finalStatus  = allCompleted ? 'completed' : (anyFailed && !allCompleted ? 'in_progress' : 'in_progress');
    try { this.store.updateGoal(goal.id, { status: finalStatus }); } catch (_) { /* ignore */ }
    this.store.flush();

    // ── 9. Evaluation (optional)
    let evaluation = null;
    if (opts.evaluate) {
      try {
        const evalRes = await this.evaluator.evaluate(goal.id, {
          provider: opts.provider,
          model:    opts.model,
          useLlm:   opts.useLlm,
        });
        if (evalRes && evalRes.ok) {
          evaluation = evalRes.evaluation;
          this.emit('evaluation_done', { goalId: goal.id, evaluation });
        } else {
          logLine(`runGoal: evaluation failed: ${evalRes && evalRes.error}`);
        }
      } catch (err) {
        logLine(`runGoal: evaluation threw: ${err.message}`);
      }
    }

    // ── 10. Insights (optional)
    // `analyzeTracesFn(traceIds, opts)` returns the report directly
    // (or `null` on hard failure). We treat the report itself as the
    // success payload.
    let insights = null;
    if (opts.analyze) {
      try {
        const traceIds = traces.map((t) => t.traceId);
        const report = await analyzeTracesFn(traceIds, {
          traceDir: this.tracesDir,
        });
        if (report && (report.id || report.insights)) {
          insights = { ok: true, ...report };
          this.emit('insights_done', { insights });
        } else {
          logLine(`runGoal: analyzeTraces returned empty report`);
        }
      } catch (err) {
        logLine(`runGoal: analyzeTraces threw: ${err.message}`);
      }
    }

    const totalDurationMs = Date.now() - t0;
    logLine(`runGoal: ${goal.id} done in ${totalDurationMs}ms ` +
      `(${results.filter((r) => r.status === 'completed').length}/${results.length} completed)`);

    this.emit('run_complete', {
      goalId: goal.id,
      runId,
      results,
      evaluation,
      insights,
    });

    return {
      ok: true,
      goalId: goal.id,
      runId,
      goal,
      traces,
      results,
      evaluation,
      insights,
      meta: {
        durationMs: totalDurationMs,
        swarmRunPath,
        dispatchId: dispatchResult.dispatchId,
        completed: results.filter((r) => r.status === 'completed').length,
        failed:    results.filter((r) => r.status === 'failed').length,
      },
    };
  }

  /**
   * Run the core swarm CLI's flow but with a persisted goal backing it.
   * The actual core/ swarm is invoked via dynamic require so we don't
   * create a hard circular dependency.
   *
   * @param {string} goalText
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async runSwarm(goalText, options = {}) {
    const { runSwarm: coreRunSwarm } = require('../core/planner');
    logLine(`runSwarm: "${truncate(goalText, 60)}"`);

    // Process the goal first so we have an ID to attach the swarm run to
    const processed = await this.processor.processGoal(goalText, {
      domain: options.domain || 'auto',
      store: this.store,
    });
    if (!processed.ok || !processed.goal) {
      return { ok: false, error: processed.error || 'processGoal failed' };
    }
    const goal = processed.goal;
    try { this.store.updateGoal(goal.id, { status: 'in_progress' }); } catch (_) { /* ignore */ }

    // Delegate to the core swarm planner
    const swarmResult = await coreRunSwarm(goalText, {
      count:   options.count   != null ? options.count   : Math.max(3, (goal.tasks || []).length),
      domain:  options.domain  || 'auto',
      timeout: options.timeout || this.subtaskTimeoutMs,
    });

    // Persist the core swarm run under the goal
    if (this.persist && swarmResult) {
      const runId = newId('run');
      const fileName = `${new Date().toISOString().replace(/[:.]/g, '-')}-${runId}.json`;
      const swarmRunPath = path.join(this.tracesDir, fileName);
      const swarmRun = {
        ...swarmResult,
        goalId: goal.id,
        runId,
        mode: 'core-swarm',
        persistedAt: new Date().toISOString(),
      };
      atomicWriteJson(swarmRunPath, swarmRun);
      swarmResult._swarmRunPath = swarmRunPath;
    }

    // Update task statuses in the goal from swarmResult.subtasks/results
    if (swarmResult && Array.isArray(swarmResult.results)) {
      for (const r of swarmResult.results) {
        const inner = (r && r.result) || {};
        const status = (inner.status || '').toLowerCase();
        const storeStatus = VALID_TASK_STATUSES.includes(status)
          ? (status === 'completed' ? 'completed' : 'failed')
          : 'completed';
        try {
          this.store.updateTask(goal.id, r.subtaskId, { status: storeStatus });
        } catch (_) { /* ignore */ }
      }
    }
    try { this.store.updateGoal(goal.id, { status: 'completed' }); } catch (_) { /* ignore */ }
    this.store.flush();

    return {
      ok: true,
      goalId: goal.id,
      goal,
      swarm: swarmResult,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  //  Internals
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Mark all of a goal's tasks as `failed` (used when the dispatcher
   * itself throws — not the individual subtasks).
   * @private
   */
  _markAllTasksFailed(goalId, subtasks, message) {
    for (const s of subtasks) {
      try {
        this.store.updateTask(goalId, s.id, {
          status: 'failed',
          meta: { error: message },
        });
      } catch (_) { /* ignore */ }
    }
    try { this.store.updateGoal(goalId, { status: 'failed' }); } catch (_) { /* ignore */ }
    this.store.flush();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Module-level functional helpers (mirroring GoalProcessor's pattern)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Run the unified goal pipeline using a default-configured HiveGlue.
 * @param {string} goalText
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function runGoal(goalText, options = {}) {
  const glue = new HiveGlue(options);
  return glue.runGoal(goalText, options);
}

/**
 * Run the core swarm CLI flow with persistent goal backing.
 * @param {string} goalText
 * @param {object} [options]
 * @returns {Promise<object>}
 */
async function runSwarm(goalText, options = {}) {
  const glue = new HiveGlue(options);
  return glue.runSwarm(goalText, options);
}

// ────────────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────────────

module.exports = {
  HiveGlue,
  runGoal,
  runSwarm,
  // Re-exports so callers don't have to know the layer split.
  GoalProcessor,
  GoalStore,
  GoalEvaluator,
  SubagentRunner,
  WorkerDispatcher,
  analyzeTraces: analyzeTracesFn,
  // Helpers (re-exported for tests / advanced callers)
  _convertTask: convertTask,
  _inferRole: inferRole,
  _pickAgents: pickAgents,
  _buildTrace: buildTrace,
  _buildSwarmRun: buildSwarmRun,
  // Version
  __version,
  // Layer versions for debugging
  _layerVersions: {
    glue:        __version,
    processor:   PROCESSOR_VERSION,
    store:       STORE_VERSION,
    evaluator:   EVALUATOR_VERSION,
    runner:      RUNNER_VERSION,
    insight:     INSIGHT_VERSION,
    dispatcher:  '1.0.0',
  },
};
