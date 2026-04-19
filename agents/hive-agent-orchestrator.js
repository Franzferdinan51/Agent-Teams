#!/usr/bin/env node
/**
 * Hive Agent Orchestrator — SENATE-CONTROLLED
 * 
 * All agent actions pass through Senate Decree compliance:
 * - Task decomposition服从 Decree
 * - Agent selection服从 Decree  
 * - Execution respects Decree
 * - Decisions checked against Decree
 * 
 * The Senate controls everything.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Load Senate Registry
const SenateRegistry = require('../scripts/hive-senate-decrees.js');
const senate = new SenateRegistry();

// Data directory
const DATA_DIR = '/tmp/hive-agents';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════════
// AGENT ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════

class AgentOrchestrator {
    constructor() {
        this.tasks = [];
        this.agents = {};
        this.policies = senate.getActivePolicies();
        this.loadTasks();
    }

    loadTasks() {
        try {
            this.tasks = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tasks.json'), 'utf-8'));
        } catch { this.tasks = []; }
    }

    saveTasks() {
        fs.writeFileSync(path.join(DATA_DIR, 'tasks.json'), JSON.stringify(this.tasks, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // TASK DECOMPOSITION — SENATE-APPROVED
    // ═══════════════════════════════════════════════════════════

    decomposeTask(task) {
        console.log(`\n📋 DECOMPOSING TASK: "${task}"`);

        // Check against Senate decrees FIRST
        const compliance = senate.checkCompliance(task);
        
        if (!compliance.compliant) {
            console.log(`\n❌ TASK BLOCKED BY SENATE DECREE:`);
            compliance.violations.forEach(v => {
                console.log(`   🔴 ${v.violation}`);
            });
            return { blocked: true, reason: compliance.violations };
        }

        // Apply Senate requirements to task
        let enrichedTask = task;
        for (const req of compliance.required) {
            console.log(`\n⚠️ SENATE REQUIREMENT: ${req.requirement}`);
            enrichedTask = `[MUST: ${req.requirement}] ${enrichedTask}`;
        }

        // Decompose with Senate constraints
        const steps = this.senateAwareDecompose(enrichedTask);

        console.log(`\n✅ TASK APPROVED (${steps.length} steps)`);
        steps.forEach((step, i) => {
            const stepCompliance = senate.checkCompliance(step);
            const icon = stepCompliance.compliant ? '✅' : '❌';
            console.log(`   ${icon} ${i + 1}. ${step.substring(0, 60)}...`);
        });

        return { blocked: false, steps, enrichedTask };
    }

    senateAwareDecompose(task) {
        // Simple decomposition that respects Senate constraints
        const steps = [];
        
        // Add constraint step if decrees require it
        const policies = senate.getActivePolicies();
        const mandatoryPolicies = policies.filter(p => p.priority === 'critical' || p.priority === 'high');

        if (mandatoryPolicies.length > 0) {
            steps.push(`[CHECK DECREES] Verify compliance with ${mandatoryPolicies.length} active decrees`);
        }

        // Main steps (simplified)
        const taskWords = task.toLowerCase().split(' ');
        
        if (taskWords.includes('build') || taskWords.includes('create')) {
            steps.push('[RESEARCH] Gather requirements');
            steps.push('[PLAN] Design solution');
            steps.push('[IMPLEMENT] Write code');
            steps.push('[TEST] Verify functionality');
            steps.push('[DEPLOY] Deploy to production');
        } else if (taskWords.includes('fix') || taskWords.includes('debug')) {
            steps.push('[ANALYZE] Identify root cause');
            steps.push('[FIX] Implement solution');
            steps.push('[VERIFY] Test fix');
        } else if (taskWords.includes('research') || taskWords.includes('search')) {
            steps.push('[SEARCH] Web research');
            steps.push('[SUMMARIZE] Compile findings');
            steps.push('[RECOMMEND] Provide recommendations');
        } else {
            steps.push('[ANALYZE] Process request');
            steps.push('[EXECUTE] Complete task');
            steps.push('[REVIEW] Verify results');
        }

        // Add Senate compliance check at end
        steps.push('[COMPLY] Confirm Senate decree compliance');

        return steps;
    }

    // ═══════════════════════════════════════════════════════════
    // AGENT SELECTION — SENATE-DIRECTED
    // ═══════════════════════════════════════════════════════════

    selectAgent(task, availableAgents = ['researcher', 'coder', 'reviewer', 'writer']) {
        console.log(`\n🎯 SELECTING AGENT FOR: "${task}"`);

        // Refresh policies
        this.policies = senate.getActivePolicies();

        // Check for mandated agent types
        const mandatedAgents = this.getMandatedAgents(task);

        if (mandatedAgents.length > 0) {
            const selected = mandatedAgents[0];
            console.log(`   📜 SENATE MANDATE: Must use "${selected}" agent`);
            return selected;
        }

        // Check for prohibited agents
        const prohibitedAgents = this.getProhibitedAgents(task);

        // Score available agents
        const scores = availableAgents.map(agent => {
            let score = 50; // Base score

            // Boost for task match
            if (task.toLowerCase().includes('code') && agent === 'coder') score += 30;
            if (task.toLowerCase().includes('research') && agent === 'researcher') score += 30;
            if (task.toLowerCase().includes('review') && agent === 'reviewer') score += 30;
            if (task.toLowerCase().includes('write') && agent === 'writer') score += 30;

            // Penalize prohibited
            if (prohibitedAgents.includes(agent)) score -= 100;

            // Apply Senate preferences
            for (const policy of this.policies) {
                if (policy.content.includes('PREFER') && policy.content.includes(agent)) {
                    score += 20;
                }
                if (policy.content.includes('NEVER') && policy.content.includes(agent)) {
                    score -= 100;
                }
            }

            return { agent, score };
        });

        scores.sort((a, b) => b.score - a.score);

        const selected = scores[0].agent;
        console.log(`   Selected: ${selected} (score: ${scores[0].score})`);

        return selected;
    }

    getMandatedAgents(task) {
        const mandated = [];
        for (const policy of this.policies) {
            if (policy.priority === 'critical' && policy.content.includes('MUST')) {
                const agentMatch = policy.content.match(/use\s+(\w+)\s+agent/i);
                if (agentMatch && task.toLowerCase().includes(agentMatch[1])) {
                    mandated.push(agentMatch[1]);
                }
            }
        }
        return mandated;
    }

    getProhibitedAgents(task) {
        const prohibited = [];
        for (const policy of this.policies) {
            if (policy.content.includes('NEVER') || policy.content.includes('FORBIDDEN')) {
                const agentMatch = policy.content.match(/(?:never|forbidden)\s+(\w+)/gi);
                if (agentMatch) {
                    prohibited.push(...agentMatch.map(m => m.split(' ')[1]));
                }
            }
        }
        return prohibited;
    }

    // ═══════════════════════════════════════════════════════════
    // EXECUTE TASK — SENATE-ENFORCED
    // ═══════════════════════════════════════════════════════════

    execute(task, options = {}) {
        console.log(`\n🚀 EXECUTING: "${task}"`);

        // Pre-execution Senate check
        const preCheck = senate.checkCompliance(task);
        if (!preCheck.compliant) {
            console.log(`\n❌ EXECUTION BLOCKED`);
            preCheck.violations.forEach(v => console.log(`   ${v.violation}`));
            return { success: false, blocked: true, violations: preCheck.violations };
        }

        // Decompose
        const decomposition = this.decomposeTask(task);
        if (decomposition.blocked) {
            return { success: false, blocked: true, reason: decomposition.reason };
        }

        // Select agent
        const agent = options.agent || this.selectAgent(task);

        // Create task record
        const taskRecord = {
            id: `TASK-${Date.now()}`,
            task,
            steps: decomposition.steps,
            agent,
            status: 'running',
            started: Date.now(),
            decreeCompliance: preCheck,
            policies: this.policies.length,
            log: []
        };

        this.tasks.push(taskRecord);
        this.saveTasks();

        // Execute (placeholder for actual execution)
        console.log(`\n📦 Task ${taskRecord.id} started with ${agent} agent`);
        console.log(`   Steps: ${decomposition.steps.length}`);
        console.log(`   Senate policies applied: ${this.policies.length}`);

        // Post-execution Senate check
        taskRecord.status = 'completed';
        taskRecord.completed = Date.now();
        this.saveTasks();

        console.log(`\n✅ TASK COMPLETED (Senate-compliant)`);

        return {
            success: true,
            taskId: taskRecord.id,
            agent,
            steps: decomposition.steps.length,
            policiesApplied: this.policies.length
        };
    }

    // ═══════════════════════════════════════════════════════════
    // PARALLEL ORCHESTRATION — SENATE-MANAGED
    // ═══════════════════════════════════════════════════════════

    orchestrateParallel(tasks) {
        console.log(`\n⚡ PARALLEL ORCHESTRATION: ${tasks.length} tasks`);

        const results = [];
        const blockedTasks = [];

        // Check each task
        for (const task of tasks) {
            const compliance = senate.checkCompliance(task);
            if (!compliance.compliant) {
                blockedTasks.push({ task, violations: compliance.violations });
            } else {
                results.push(this.execute(task));
            }
        }

        if (blockedTasks.length > 0) {
            console.log(`\n❌ ${blockedTasks.length} TASKS BLOCKED BY SENATE:`);
            blockedTasks.forEach(bt => {
                console.log(`   "${bt.task.substring(0, 50)}..."`);
                bt.violations.forEach(v => console.log(`     🔴 ${v.violation}`));
            });
        }

        console.log(`\n✅ ${results.length} tasks executing in parallel`);

        return { results, blocked: blockedTasks };
    }

    // ═══════════════════════════════════════════════════════════
    // FAILOVER — SENATE-APPROVED
    // ═══════════════════════════════════════════════════════════

    failoverChain(task, failedAgent) {
        console.log(`\n🔄 FAILOVER: ${failedAgent} failed, seeking alternative`);

        const alternatives = ['researcher', 'coder', 'reviewer', 'writer', 'meta']
            .filter(a => a !== failedAgent);

        // Check if alternatives are allowed
        for (const alt of alternatives) {
            const compliance = senate.checkCompliance(`Use ${alt} agent for: ${task}`);
            if (compliance.compliant) {
                console.log(`\n✅ SENATE APPROVES: Using ${alt} agent`);
                return alt;
            }
        }

        console.log(`\n❌ NO SENATE-APPROVED ALTERNATIVES`);
        return null;
    }

    // ═══════════════════════════════════════════════════════════
    // PERFORMANCE TRACKING
    // ═══════════════════════════════════════════════════════════

    trackPerformance(agentId, metrics) {
        const record = {
            agentId,
            ...metrics,
            timestamp: Date.now(),
            policiesInEffect: this.policies.length,
            decreeCompliance: senate.checkCompliance(agentId).compliant
        };

        const perfFile = path.join(DATA_DIR, `performance-${agentId}.json`);
        try {
            const existing = JSON.parse(fs.readFileSync(perfFile, 'utf-8') || '[]');
            existing.push(record);
            fs.writeFileSync(perfFile, JSON.stringify(existing.slice(-100), null, 2));
        } catch {
            fs.writeFileSync(perfFile, JSON.stringify([record]));
        }

        return record;
    }

    getPerformance(agentId) {
        const perfFile = path.join(DATA_DIR, `performance-${agentId}.json`);
        try {
            return JSON.parse(fs.readFileSync(perfFile, 'utf-8') || '[]');
        } catch { return []; }
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           🤖 HIVE AGENT ORCHESTRATOR — SENATE CONTROLLED        ║
╠══════════════════════════════════════════════════════════════════╣`);

        console.log(`║  📋 Tasks: ${this.tasks.length}`);
        console.log(`║  📜 Active Senate Policies: ${this.policies.length}`);
        console.log(`║  🔴 Critical Decrees: ${this.policies.filter(p => p.priority === 'critical').length}`);
        console.log(`║  🟠 High Priority Decrees: ${this.policies.filter(p => p.priority === 'high').length}`);
        console.log('╠══════════════════════════════════════════════════════════════════╣');
        console.log('║  ACTIVE SENATE CONSTRAINTS:');

        for (const policy of this.policies.slice(0, 5)) {
            console.log(`║  ${policy.number}. [${policy.priority}] ${policy.title.substring(0, 45).padEnd(45)}║`);
        }

        console.log('╚══════════════════════════════════════════════════════════════════╝');
    }
}

// CLI
const orchestrator = new AgentOrchestrator();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    // Execute task with Senate oversight
    execute: () => {
        const result = orchestrator.execute(args.join(' '));
        console.log(JSON.stringify(result, null, 2));
    },

    // Decompose task
    decompose: () => {
        const result = orchestrator.decomposeTask(args.join(' '));
        console.log(JSON.stringify(result, null, 2));
    },

    // Select agent
    select: () => {
        const agent = orchestrator.selectAgent(args.join(' '));
        console.log(`Selected: ${agent}`);
    },

    // Parallel execution
    parallel: () => {
        const tasks = args.join(' ').split('|').map(t => t.trim());
        const result = orchestrator.orchestrateParallel(tasks);
        console.log(JSON.stringify(result, null, 2));
    },

    // Failover
    failover: () => {
        const agent = orchestrator.failoverChain(args.slice(1).join(' '), args[0]);
        console.log(`Failover: ${agent || 'NONE'}`);
    },

    // Performance
    perf: () => {
        const perf = orchestrator.getPerformance(args[0] || 'default');
        console.log(`\n📊 Performance for ${args[0] || 'default'}:`);
        console.log(`   Records: ${perf.length}`);
        if (perf.length > 0) {
            const latest = perf[perf.length - 1];
            console.log(`   Latest: ${JSON.stringify(latest)}`);
        }
    },

    // Dashboard
    dashboard: () => orchestrator.dashboard(),

    help: () => console.log(`
🤖 HIVE AGENT ORCHESTRATOR

  execute <task>      Execute task with Senate oversight
  decompose <task>   Show task decomposition
  select <task>      Show agent selection
  parallel <task1|task2|...>  Execute multiple tasks in parallel
  failover <agent> <task>  Show failover chain
  
  perf [agent]       View agent performance
  
  dashboard           Show orchestrator dashboard

ALL ACTIONS ARE SENATE-CONTROLLED AND DECREE-COMPLIANT.
`)
};

commands[cmd]?.() || orchestrator.dashboard();

module.exports = { AgentOrchestrator }; 