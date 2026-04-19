#!/usr/bin/env node
/**
 * Task Decomposer v2 — Standalone module
 * 
 * Breaks complex tasks into executable subtasks with:
 * - Dependency tracking (which subtasks must complete before others)
 * - Parallel group detection (which subtasks can run concurrently)
 * - Optimal agent assignment per subtask
 * - Senate decree compliance at each step
 * - Result merging from parallel execution
 * - Complexity scoring for orchestration routing
 * 
 * Can be used standalone or imported into the orchestrator.
 */

const fs = require('fs');
const path = require('path');

// Load Senate (optional — graceful degradation if unavailable)
let senate = null;
try {
  const SenateRegistry = require('../scripts/hive-senate-decrees.js');
  senate = new SenateRegistry();
} catch {
  console.warn('[TaskDecomposer] Senate registry not available — running without decree checks');
}

// ═══════════════════════════════════════════════════════════════════
// TASK TYPE CLASSIFIER
// ═══════════════════════════════════════════════════════════════════

const TASK_TYPES = {
  BUILD:    'build',
  RESEARCH: 'research',
  FIX:      'fix',
  PLAN:     'plan',
  AUDIT:    'audit',
  DEPLOY:   'deploy',
  MIGRATE:  'migrate',
  DOCUMENT: 'document',
  GENERIC:  'generic',
};

function classifyTask(taskText) {
  const lower = taskText.toLowerCase().trim();
  if (/\b(build|create|implement|make|develop)\b/.test(lower)) return TASK_TYPES.BUILD;
  if (/\b(research|search|investigate|look.up|find)\b/.test(lower)) return TASK_TYPES.RESEARCH;
  if (/\b(fix|debug|resolve|repair|patch)\b/.test(lower)) return TASK_TYPES.FIX;
  if (/\b(plan|strategy|roadmap|architect|design)\b/.test(lower)) return TASK_TYPES.PLAN;
  if (/\b(audit|review|scan|assess|check)\b/.test(lower)) return TASK_TYPES.AUDIT;
  if (/\b(deploy|release|launch|ship|cicd|ci.cd)\b/.test(lower)) return TASK_TYPES.DEPLOY;
  if (/\b(migrate|convert|port|upgrade|refactor)\b/.test(lower)) return TASK_TYPES.MIGRATE;
  if (/\b(write|document|spec|readme|draft)\b/.test(lower)) return TASK_TYPES.DOCUMENT;
  return TASK_TYPES.GENERIC;
}

// ═══════════════════════════════════════════════════════════════════
// COMPLEXITY SCORER — rates task complexity 1-10 for routing
// ═══════════════════════════════════════════════════════════════════

function scoreComplexity(taskText, subtasks) {
  let score = 1;

  const lower = taskText.toLowerCase();

  // Scope factors
  if (/\b(microservice|distributed|multi|tier)\b/.test(lower)) score += 2;
  if (/\b(api|rest|grpc|webhook)\b/.test(lower)) score += 1;
  if (/\b(database|schema|migration)\b/.test(lower)) score += 1;
  if (/\b(security|auth|encrypt)\b/.test(lower)) score += 1;
  if (/\b(test|coverage|ci.cd)\b/.test(lower)) score += 1;
  if (/\b(deploy|kubernetes|docker|cloud)\b/.test(lower)) score += 1;

  // Multi-step factors
  if (subtasks.length >= 3) score += 1;
  if (subtasks.length >= 6) score += 1;
  if (subtasks.length >= 10) score += 1;

  // Language/model factors
  if (/\b(translate|localize|i18n)\b/.test(lower)) score += 1;
  if (/\b(cross.platform|native)\b/.test(lower)) score += 1;

  return Math.min(score, 10);
}

// ═══════════════════════════════════════════════════════════════════
// AGENT ASSIGNMENT MAP
// ═══════════════════════════════════════════════════════════════════

const AGENT_FOR_STEP = {
  research: ['researcher'],
  analyze:  ['researcher', 'data'],
  plan:     ['planner', 'architect'],
  design:   ['architect', 'planner'],
  code:     ['coder'],
  implement:['coder'],
  fix:      ['coder'],
  debug:    ['coder', 'researcher'],
  test:     ['reviewer', 'qa'],
  review:   ['reviewer'],
  security: ['security'],
  deploy:   ['devops'],
  migrate:  ['coder', 'devops'],
  document: ['writer', 'techwriter'],
  write:    ['writer'],
  audit:    ['reviewer', 'security'],
  monitor:  ['devops'],
  optimize: ['perfengineer', 'coder'],
};

// ═══════════════════════════════════════════════════════════════════
// SUBTASK TEMPLATES PER TASK TYPE
// ═══════════════════════════════════════════════════════════════════

const SUBTASK_TEMPLATES = {
  [TASK_TYPES.BUILD]: [
    { phase: 'discover',   step: 'research',   desc: '[DISCOVER] Gather requirements and constraints', parallel: false },
    { phase: 'design',     step: 'plan',       desc: '[DESIGN] Create architecture and solution design', parallel: false },
    { phase: 'build',      step: 'code',       desc: '[BUILD] Implement core functionality', parallel: false },
    { phase: 'build',      step: 'code',       desc: '[BUILD] Implement supporting utilities', parallel: false },
    { phase: 'quality',    step: 'security',   desc: '[SECURITY] Security review of implementation', parallel: false },
    { phase: 'quality',    step: 'test',       desc: '[TEST] Write and execute tests', parallel: false },
    { phase: 'quality',    step: 'review',     desc: '[REVIEW] Code review and quality gate', parallel: false },
    { phase: 'release',    step: 'deploy',     desc: '[DEPLOY] Deploy to target environment', parallel: false },
  ],
  [TASK_TYPES.RESEARCH]: [
    { phase: 'gather',     step: 'research',   desc: '[GATHER] Web research and information gathering', parallel: true },
    { phase: 'gather',     step: 'research',   desc: '[GATHER] Secondary source verification', parallel: true },
    { phase: 'synthesize', step: 'analyze',    desc: '[SYNTHESIZE] Analyze and organize findings', parallel: false },
    { phase: 'synthesize', step: 'write',      desc: '[COMPILE] Draft research summary', parallel: false },
  ],
  [TASK_TYPES.FIX]: [
    { phase: 'diagnose',   step: 'analyze',    desc: '[DIAGNOSE] Identify root cause of the issue', parallel: false },
    { phase: 'diagnose',   step: 'research',   desc: '[DIAGNOSE] Gather context and reproduction steps', parallel: false },
    { phase: 'remediate',  step: 'fix',         desc: '[FIX] Implement targeted fix', parallel: false },
    { phase: 'verify',     step: 'test',        desc: '[VERIFY] Test the fix', parallel: false },
    { phase: 'verify',     step: 'review',      desc: '[REVIEW] Confirm no regressions', parallel: false },
  ],
  [TASK_TYPES.PLAN]: [
    { phase: 'research',   step: 'research',   desc: '[RESEARCH] Gather context, constraints, and dependencies', parallel: false },
    { phase: 'design',     step: 'plan',        desc: '[ANALYZE] Evaluate options and tradeoffs', parallel: false },
    { phase: 'design',     step: 'design',      desc: '[DRAFT] Create initial plan/roadmap', parallel: false },
    { phase: 'review',     step: 'review',      desc: '[REVIEW] Review plan for completeness', parallel: false },
    { phase: 'publish',    step: 'write',       desc: '[PUBLISH] Finalize and document plan', parallel: false },
  ],
  [TASK_TYPES.AUDIT]: [
    { phase: 'collect',    step: 'research',   desc: '[COLLECT] Gather evidence, logs, and data', parallel: true },
    { phase: 'collect',    step: 'research',    desc: '[COLLECT] Review configuration and code', parallel: true },
    { phase: 'analyze',    step: 'analyze',     desc: '[ANALYZE] Perform audit analysis', parallel: false },
    { phase: 'security',   step: 'security',   desc: '[SECURITY] Check security implications', parallel: false },
    { phase: 'report',     step: 'write',       desc: '[REPORT] Compile audit findings and recommendations', parallel: false },
  ],
  [TASK_TYPES.DEPLOY]: [
    { phase: 'prepare',    step: 'research',    desc: '[PREPARE] Verify environment and dependencies', parallel: false },
    { phase: 'build',      step: 'code',        desc: '[BUILD] Build artifact if needed', parallel: false },
    { phase: 'deploy',     step: 'deploy',     desc: '[DEPLOY] Execute deployment', parallel: false },
    { phase: 'verify',     step: 'test',       desc: '[VERIFY] Health check and smoke tests', parallel: false },
    { phase: 'monitor',    step: 'monitor',    desc: '[MONITOR] Confirm stable operation', parallel: false },
  ],
  [TASK_TYPES.MIGRATE]: [
    { phase: 'assess',     step: 'research',   desc: '[ASSESS] Inventory existing system', parallel: false },
    { phase: 'plan',       step: 'plan',       desc: '[PLAN] Design migration path', parallel: false },
    { phase: 'execute',    step: 'code',       desc: '[MIGRATE] Execute data/code migration', parallel: false },
    { phase: 'verify',     step: 'test',       desc: '[VERIFY] Validate migrated system', parallel: false },
    { phase: 'deploy',     step: 'deploy',     desc: '[DEPLOY] Switch to new system', parallel: false },
  ],
  [TASK_TYPES.DOCUMENT]: [
    { phase: 'research',   step: 'research',   desc: '[RESEARCH] Gather context and source material', parallel: false },
    { phase: 'outline',   step: 'plan',       desc: '[OUTLINE] Create document structure', parallel: false },
    { phase: 'write',     step: 'write',      desc: '[WRITE] Draft document content', parallel: false },
    { phase: 'review',    step: 'review',     desc: '[REVIEW] Review for accuracy and clarity', parallel: false },
  ],
  [TASK_TYPES.GENERIC]: [
    { phase: 'execute',   step: 'research',   desc: '[EXECUTE] Process and complete the request', parallel: false },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// DEFAULT AGENT (when Senate is unavailable)
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_AGENT = 'coder';

function getAgentsForStep(step) {
  return AGENT_FOR_STEP[step] || [DEFAULT_AGENT];
}

// ═══════════════════════════════════════════════════════════════════
// MAIN TASK DECOMPOSER CLASS
// ═══════════════════════════════════════════════════════════════════

class TaskDecomposer {
  constructor(orchestratorRef = null) {
    this.orchestrator = orchestratorRef;
    this.dataDir = '/tmp/hive-agents';
    if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
  }

  /**
   * Main entry point: decompose a task into subtasks with full metadata.
   */
  decompose(taskText, context = {}) {
    const taskType = classifyTask(taskText);
    const templates = SUBTASK_TEMPLATES[taskType] || SUBTASK_TEMPLATES[TASK_TYPES.GENERIC];

    // ── Senate compliance check on full task ──────────────────────
    let compliance = { compliant: true, violations: [], warnings: [] };
    if (senate) {
      compliance = senate.checkCompliance(taskText);
      if (!compliance.compliant) {
        return {
          blocked: true,
          taskType,
          complexity: 0,
          subtasks: [],
          violations: compliance.violations,
          warnings: compliance.warnings,
        };
      }
    }

    // ── Build subtask list ───────────────────────────────────────
    let subtasks = this._buildSubtasks(taskText, taskType, templates, context);

    // ── Inject Senate compliance steps ────────────────────────────
    const activePolicies = senate ? senate.getActivePolicies() : [];
    const criticalPolicies = activePolicies.filter(p => p.priority === 'critical' || p.priority === 'high');

    if (criticalPolicies.length > 0) {
      subtasks.unshift(this._makeSubtask({
        id: 'senate-verify-init',
        description: `[SENATE] Pre-check: verify compliance with ${criticalPolicies.length} active decree(s)`,
        phase: 'senate',
        type: 'compliance',
        agent: null,
        dependsOn: [],
        parallelGroup: null,
      }));
    }

    // ── Add Senate decree requirements to task description ────────
    let enrichedTask = taskText;
    for (const req of compliance.required || []) {
      enrichedTask = `[REQ:${req.decree}] ${enrichedTask}`;
    }

    // ── Assign IDs and dependencies ──────────────────────────────
    subtasks = this._assignIdsAndDeps(subtasks);

    // ── Score complexity ──────────────────────────────────────────
    const complexity = scoreComplexity(taskText, subtasks);

    return {
      blocked: false,
      taskType,
      complexity,
      originalTask: taskText,
      enrichedTask,
      subtasks,
      violations: compliance.violations,
      warnings: compliance.warnings,
      required: compliance.required || [],
      activePolicies: activePolicies.length,
      parallelGroups: this._detectParallelGroups(subtasks),
    };
  }

  _buildSubtasks(taskText, taskType, templates, context) {
    return templates.map((t, i) => this._makeSubtask({
      id: null, // assigned later
      description: t.desc,
      phase: t.phase,
      type: taskType,
      agent: getAgentsForStep(t.step)[0],
      possibleAgents: getAgentsForStep(t.step),
      dependsOn: i > 0 ? [] : [], // filled in _assignIdsAndDeps
      parallelGroup: t.parallel ? `parallel-${t.phase}` : null,
      step: t.step,
    }));
  }

  _makeSubtask({ id, description, phase, type, agent, possibleAgents, dependsOn, parallelGroup, step }) {
    return {
      id: id || '',
      description,
      phase,
      type,
      agent,
      possibleAgents: possibleAgents || [agent],
      dependsOn: dependsOn || [],
      parallelGroup,
      step,
      status: 'pending',
    };
  }

  _assignIdsAndDeps(subtasks) {
    const result = [];
    const byPhase = {};

    subtasks.forEach((st, i) => {
      // Assign sequential ID within task
      const stId = `st-${i}`;
      st.id = stId;

      // Track last subtask per phase for dependency injection
      if (!byPhase[st.phase]) byPhase[st.phase] = [];
      byPhase[st.phase].push(stId);

      result.push(st);
    });

    // Second pass: assign dependencies
    // Rule: each subtask depends on the LAST subtask of the previous phase
    const phases = [...new Set(subtasks.map(s => s.phase))];
    const phaseOrder = Object.keys(Object.fromEntries(
      phases.map(p => [p, subtasks.findIndex(s => s.phase === p)])
    )).sort((a, b) => byPhase[a][0] > byPhase[b][0] ? 1 : -1);

    result.forEach(st => {
      const phaseIdx = phaseOrder.indexOf(st.phase);
      if (phaseIdx > 0) {
        const prevPhase = phaseOrder[phaseIdx - 1];
        // Depend on last subtask of previous phase
        const lastOfPrev = byPhase[prevPhase][byPhase[prevPhase].length - 1];
        if (!st.dependsOn.includes(lastOfPrev) && st.phase !== 'senate') {
          st.dependsOn.push(lastOfPrev);
        }
      }
    });

    return result;
  }

  _detectParallelGroups(subtasks) {
    const groups = {};
    subtasks.forEach(st => {
      if (st.parallelGroup) {
        groups[st.parallelGroup] = groups[st.parallelGroup] || [];
        groups[st.parallelGroup].push(st.id);
      }
    });
    return groups;
  }

  // ─────────────────────────────────────────────────────────────────
  // PARALLEL EXECUTION PLANNING
  // ─────────────────────────────────────────────────────────────────

  /**
   * Given a list of subtasks, return an execution plan:
   * which subtasks can run in parallel, which must wait.
   */
  planExecution(subtasks) {
    const groups = this._detectParallelGroups(subtasks);
    const sequential = subtasks.filter(st => !st.parallelGroup);
    const parallel = subtasks.filter(st => st.parallelGroup);

    // Build a topological sort respecting dependencies
    const scheduled = new Set();
    const schedule = [];

    // Keep iterating until all scheduled
    const remaining = new Set(subtasks.map(s => s.id));
    let iterations = 0;
    const maxIterations = subtasks.length * 2;

    while (remaining.size > 0 && iterations < maxIterations) {
      iterations++;
      for (const st of subtasks) {
        if (scheduled.has(st.id) || !remaining.has(st.id)) continue;
        // Check dependencies
        const depsMet = st.dependsOn.every(dep => scheduled.has(dep));
        if (!depsMet) continue;
        // Check parallel group constraint
        if (st.parallelGroup) {
          // Only schedule first of parallel group (others handled together)
          const groupMembers = groups[st.parallelGroup].map(id => subtasks.find(s => s.id === id));
          const anyUnscheduled = groupMembers.some(s => remaining.has(s.id));
          if (anyUnscheduled && scheduled.has(st.id + '-group')) continue;
          if (!scheduled.has(st.id + '-group')) {
            schedule.push({ type: 'parallel-group', groupId: st.parallelGroup, members: groupMembers.map(s => s.id), tasks: groupMembers });
            scheduled.add(st.id + '-group');
            groupMembers.forEach(s => { scheduled.add(s.id); remaining.delete(s.id); });
          }
        } else {
          schedule.push({ type: 'single', taskId: st.id, task: st });
          scheduled.add(st.id);
          remaining.delete(st.id);
        }
      }
    }

    return { schedule, parallelGroups: Object.keys(groups), sequentialCount: sequential.length };
  }

  // ─────────────────────────────────────────────────────────────────
  // RESULT MERGING
  // ─────────────────────────────────────────────────────────────────

  /**
   * Merge outputs from multiple subtask executions into a coherent result.
   */
  mergeResults(results) {
    if (!Array.isArray(results) || results.length === 0) {
      return { success: true, output: null, merged: true };
    }

    const succeeded = results.filter(r => r && r.success);
    const failed    = results.filter(r => r && !r.success);

    // Collect all outputs
    const outputs = succeeded.map(r => r.output).filter(Boolean);
    const errors  = failed.map(r => r.error).filter(Boolean);

    // Merge text outputs intelligently
    let synthesized = '';
    if (outputs.length > 0) {
      if (outputs.every(o => typeof o === 'string')) {
        synthesized = outputs.join('\n\n---\n\n');
      } else {
        synthesized = outputs;
      }
    }

    return {
      success: failed.length === 0,
      total: results.length,
      succeeded: succeeded.length,
      failed: failed.length,
      outputs,
      errors,
      synthesized,
      summary: this._summarizeMerge(results),
    };
  }

  _summarizeMerge(results) {
    const total = results.length;
    const ok = results.filter(r => r && r.success).length;
    if (ok === total) return `All ${total} subtasks completed successfully.`;
    if (ok === 0) return `All ${total} subtasks failed.`;
    return `${ok}/${total} subtasks succeeded.`;
  }
}

// ═══════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════

const decomposer = new TaskDecomposer();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
  decompose: () => {
    const result = decomposer.decompose(args.join(' '));
    console.log(JSON.stringify(result, null, 2));
  },

  plan: () => {
    const result = decomposer.decompose(args.join(' '));
    if (result.blocked) {
      console.log('BLOCKED:', JSON.stringify(result.violations, null, 2));
      return;
    }
    const plan = decomposer.planExecution(result.subtasks);
    console.log(JSON.stringify(plan, null, 2));
  },

  merge: () => {
    // Expects JSON input from stdin or args
    let results;
    try {
      results = JSON.parse(args.join(' '));
    } catch {
      console.log('Usage: decompose merge <json-array-of-results>');
      return;
    }
    console.log(JSON.stringify(decomposer.mergeResults(results), null, 2));
  },

  type: () => {
    console.log(`Task type: ${classifyTask(args.join(' '))}`);
  },

  complexity: () => {
    const result = decomposer.decompose(args.join(' '));
    console.log(`Complexity: ${result.complexity}/10`);
  },

  dashboard: () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              📋 TASK DECOMPOSER — COMMAND CENTER               ║
╠══════════════════════════════════════════════════════════════════╣
║  Supported task types:                                          ║
║    build | research | fix | plan | audit | deploy | migrate     ║
║    document | generic                                            ║
╠══════════════════════════════════════════════════════════════════╣
║  Commands:                                                      ║
║    decompose <task>    Full decomposition with deps            ║
║    plan <task>         Show execution plan (parallel/seq)      ║
║    merge <json>        Merge results from subtasks             ║
║    type <task>         Show task type classification           ║
║    complexity <task>   Show complexity score (1-10)            ║
╚══════════════════════════════════════════════════════════════════╝
`);
  },

  help: () => commands.dashboard(),
};

commands[cmd]?.() || commands.dashboard();

module.exports = { TaskDecomposer, classifyTask, scoreComplexity, TASK_TYPES };
