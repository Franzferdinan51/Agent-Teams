#!/usr/bin/env node
/**
 * Hive Trace — Execution Visualization System
 * 
 * Features:
 * - Show agent decisions live
 * - Graph view of task flow
 * - Step-by-step tracing
 * - Timing visualization
 */

const fs = require('fs');
const path = require('path');

class HiveTrace {
    constructor() {
        this.traceDir = '/tmp/hive-trace';
        if (!fs.existsSync(this.traceDir)) fs.mkdirSync(this.traceDir, { recursive: true });
        
        this.traces = this.loadTraces();
        this.currentTrace = null;
    }

    loadTraces() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.traceDir, 'traces.json'), 'utf-8'));
        } catch { return []; }
    }

    saveTraces() {
        fs.writeFileSync(path.join(this.traceDir, 'traces.json'), JSON.stringify(this.traces, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // START TRACE
    // ═══════════════════════════════════════════════════════════

    start(taskId, task) {
        this.currentTrace = {
            taskId,
            task,
            startTime: Date.now(),
            steps: [],
            agents: [],
            decisions: [],
            events: [],
            status: 'running'
        };
        
        console.log('\n' + '─'.repeat(60));
        console.log('🔵 TRACE STARTED');
        console.log('─'.repeat(60));
        console.log(`   Task: ${task}`);
        console.log(`   ID: ${taskId}`);
        console.log(`   Time: ${new Date().toLocaleTimeString()}`);
        
        return this.currentTrace;
    }

    // ═══════════════════════════════════════════════════════════
    // STEP
    // ═══════════════════════════════════════════════════════════

    step(args) {
        const { agent, action, duration, result, status = 'success' } = args;
        
        if (!this.currentTrace) {
            console.log('No active trace. Use: hive-trace start <taskId> <task>');
            return;
        }

        const step = {
            n: this.currentTrace.steps.length + 1,
            agent,
            action,
            duration: duration || 0,
            result: result ? result.substring(0, 100) : null,
            status,
            timestamp: Date.now()
        };

        this.currentTrace.steps.push(step);

        // Track agent usage
        if (!this.currentTrace.agents.includes(agent)) {
            this.currentTrace.agents.push(agent);
        }

        // Visual output
        const icon = status === 'success' ? '✓' : status === 'error' ? '✗' : '•';
        const agentTag = `[${agent}]`.padEnd(15);
        const actionText = action.substring(0, 40).padEnd(40);
        const timeText = duration ? `+${duration}ms` : '';
        
        console.log(`   ${icon} ${agentTag} ${actionText} ${timeText}`);

        if (result) {
            console.log(`     └─ ${result.substring(0, 80)}...`);
        }

        return step;
    }

    // ═══════════════════════════════════════════════════════════
    // DECISION
    // ═══════════════════════════════════════════════════════════

    decision(args) {
        const { agent, context, options, chosen, reasoning } = args;
        
        if (!this.currentTrace) return;

        const decision = {
            agent,
            context,
            options,
            chosen,
            reasoning,
            timestamp: Date.now()
        };

        this.currentTrace.decisions.push(decision);

        console.log(`\n   ⚖️ DECISION by ${agent}:`);
        console.log(`      Context: ${context.substring(0, 60)}...`);
        console.log(`      Options: ${options.slice(0, 3).join(', ')}`);
        console.log(`      Chose: ${chosen}`);
        console.log(`      Why: ${reasoning.substring(0, 80)}...`);

        return decision;
    }

    // ═══════════════════════════════════════════════════════════
    // EVENT
    // ═══════════════════════════════════════════════════════════

    event(args) {
        const { type, message, data } = args;
        
        if (!this.currentTrace) return;

        const event = {
            type, // 'spawn', 'complete', 'fail', 'retry', 'fallback', 'timeout'
            message,
            data,
            timestamp: Date.now()
        };

        this.currentTrace.events.push(event);

        const icons = {
            spawn: '🔵',
            complete: '✅',
            fail: '❌',
            retry: '🔄',
            fallback: '↩️',
            timeout: '⏱️',
            error: '🚨',
            warning: '⚠️'
        };

        console.log(`\n   ${icons[type] || '📌'} ${type.toUpperCase()}: ${message}`);

        return event;
    }

    // ═══════════════════════════════════════════════════════════
    // END TRACE
    // ═══════════════════════════════════════════════════════════

    end(status = 'completed') {
        if (!this.currentTrace) return;

        this.currentTrace.endTime = Date.now();
        this.currentTrace.duration = this.currentTrace.endTime - this.currentTrace.startTime;
        this.currentTrace.status = status;

        // Calculate stats
        const steps = this.currentTrace.steps;
        const totalDuration = steps.reduce((a, s) => a + (s.duration || 0), 0);
        const successSteps = steps.filter(s => s.status === 'success').length;
        const failedSteps = steps.filter(s => s.status === 'error').length;

        this.currentTrace.stats = {
            totalSteps: steps.length,
            totalDuration,
            successSteps,
            failedSteps,
            successRate: steps.length > 0 ? Math.round((successSteps / steps.length) * 100) : 0,
            agentsUsed: this.currentTrace.agents.length,
            decisions: this.currentTrace.decisions.length
        };

        // Save trace
        this.traces.push(this.currentTrace);
        this.saveTraces();

        // Summary output
        console.log('\n' + '─'.repeat(60));
        console.log('🔴 TRACE ENDED');
        console.log('─'.repeat(60));
        console.log(`   Status: ${status}`);
        console.log(`   Duration: ${this.currentTrace.stats.totalDuration}ms`);
        console.log(`   Steps: ${this.currentTrace.stats.totalSteps} (${this.currentTrace.stats.successRate}% success)`);
        console.log(`   Agents: ${this.currentTrace.stats.agentsUsed}`);
        console.log(`   Decisions: ${this.currentTrace.stats.decisions}`);

        const trace = this.currentTrace;
        this.currentTrace = null;
        return trace;
    }

    // ═══════════════════════════════════════════════════════════
    // VISUALIZE
    // ═══════════════════════════════════════════════════════════

    visualize(traceId = null) {
        let trace;
        
        if (traceId) {
            trace = this.traces.find(t => t.taskId === traceId);
        } else if (this.currentTrace) {
            trace = this.currentTrace;
        } else {
            trace = this.traces[this.traces.length - 1];
        }

        if (!trace) {
            console.log('Trace not found.');
            return;
        }

        console.log('\n' + '═'.repeat(60));
        console.log(`TASK FLOW: ${trace.task}`);
        console.log('═'.repeat(60));
        console.log(`ID: ${trace.taskId} | Duration: ${trace.duration || 0}ms | Status: ${trace.status}`);

        console.log('\n📊 GRAPH VIEW:');
        console.log('─'.repeat(60));

        // Build ASCII graph
        let graph = '';
        let indent = 0;
        const agents = {};

        for (const step of trace.steps) {
            const agent = step.agent;
            if (!agents[agent]) agents[agent] = 0;
            agents[agent]++;

            const icon = step.status === 'success' ? '✓' : step.status === 'error' ? '✗' : '•';
            const bar = '█'.repeat(Math.min(agents[agent], 10));
            
            graph += `\n${icon} [${agent.padEnd(8)}] ${bar} ${step.action.substring(0, 35)}`;
            if (step.duration) graph += ` (+${step.duration}ms)`;
        }

        console.log(graph);

        console.log('\n⚖️ DECISIONS:');
        console.log('─'.repeat(60));
        for (const d of trace.decisions) {
            console.log(`   → ${d.context.substring(0, 40)}...`);
            console.log(`     Chose: ${d.chosen}`);
        }

        console.log('\n📈 STATS:');
        console.log('─'.repeat(60));
        if (trace.stats) {
            console.log(`   Total Steps: ${trace.stats.totalSteps}`);
            console.log(`   Success Rate: ${trace.stats.successRate}%`);
            console.log(`   Agents Used: ${trace.stats.agentsUsed}`);
            console.log(`   Total Duration: ${trace.stats.totalDuration}ms`);
        }

        return trace;
    }

    // ═══════════════════════════════════════════════════════════
    // HISTORY
    // ═══════════════════════════════════════════════════════════

    history(limit = 20) {
        const recent = this.traces.slice(-limit).reverse();
        
        console.log('\n' + '='.repeat(60));
        console.log('EXECUTION HISTORY');
        console.log('='.repeat(60));
        console.log('\nTask ID    | Task                       | Duration | Status');
        console.log('-'.repeat(60));

        for (const t of recent) {
            const task = t.task.substring(0, 25).padEnd(25);
            const dur = t.duration ? `${t.duration}ms`.padStart(8) : 'running'.padStart(8);
            const status = t.status === 'completed' ? '✅' : t.status === 'failed' ? '❌' : '⏳';
            console.log(`${t.taskId.toString().padEnd(10)} | ${task} | ${dur} | ${status}`);
        }

        return recent;
    }

    // ═══════════════════════════════════════════════════════════
    // ANALYZE
    // ═══════════════════════════════════════════════════════════

    analyze(agent = null) {
        const filtered = agent ? this.traces.filter(t => t.agents.includes(agent)) : this.traces;
        
        if (filtered.length === 0) {
            console.log(`No traces found${agent ? ` for agent ${agent}` : ''}.`);
            return;
        }

        const stats = {
            total: filtered.length,
            completed: filtered.filter(t => t.status === 'completed').length,
            failed: filtered.filter(t => t.status === 'failed').length,
            totalDuration: filtered.reduce((a, t) => a + (t.duration || 0), 0),
            avgDuration: 0,
            agentUsage: {},
            decisionCount: filtered.reduce((a, t) => a + (t.decisions?.length || 0), 0),
            commonFailures: []
        };

        stats.avgDuration = Math.round(stats.totalDuration / filtered.length);
        stats.successRate = Math.round((stats.completed / stats.total) * 100);

        // Count agent usage
        for (const t of filtered) {
            for (const a of t.agents) {
                stats.agentUsage[a] = (stats.agentUsage[a] || 0) + 1;
            }
        }

        // Find common failure patterns
        const failures = filtered.filter(t => t.status === 'failed');
        for (const f of failures) {
            for (const s of f.steps.filter(s => s.status === 'error')) {
                stats.commonFailures.push(s.action);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`ANALYSIS${agent ? ` FOR ${agent}` : ' (ALL AGENTS)'}`);
        console.log('='.repeat(60));

        console.log('\n📊 OVERALL:');
        console.log(`   Traces: ${stats.total}`);
        console.log(`   Success Rate: ${stats.successRate}%`);
        console.log(`   Avg Duration: ${stats.avgDuration}ms`);

        console.log('\n🤖 AGENT USAGE:');
        const sortedAgents = Object.entries(stats.agentUsage).sort((a, b) => b[1] - a[1]);
        for (const [a, count] of sortedAgents) {
            const pct = Math.round((count / stats.total) * 100);
            const bar = '█'.repeat(Math.min(pct / 5, 10));
            console.log(`   ${a.padEnd(15)} ${bar} ${count}x (${pct}%)`);
        }

        console.log('\n⚖️ DECISIONS:');
        console.log(`   Total: ${stats.decisionCount}`);
        console.log(`   Avg per trace: ${Math.round(stats.decisionCount / stats.total)}`);

        if (stats.commonFailures.length > 0) {
            console.log('\n⚠️ COMMON FAILURES:');
            const failureCounts = {};
            for (const f of stats.commonFailures) {
                failureCounts[f] = (failureCounts[f] || 0) + 1;
            }
            for (const [f, count] of Object.entries(failureCounts).slice(0, 5)) {
                console.log(`   ${count}x: ${f.substring(0, 50)}...`);
            }
        }

        return stats;
    }

    // ═══════════════════════════════════════════════════════════
    // LIVE VIEW
    // ═══════════════════════════════════════════════════════════

    live() {
        if (!this.currentTrace) {
            console.log('No active trace. Start one with: hive-trace start <taskId> <task>');
            return;
        }

        console.log('\n' + '='.repeat(60));
        console.log('🔵 LIVE TRACE VIEW');
        console.log('='.repeat(60));
        console.log(`\nTask: ${this.currentTrace.task}`);
        console.log(`Steps so far: ${this.currentTrace.steps.length}`);
        console.log(`Duration: ${Date.now() - this.currentTrace.startTime}ms`);
        console.log(`Agents: ${this.currentTrace.agents.join(', ')}`);

        console.log('\n📍 CURRENT STEPS:');
        for (const s of this.currentTrace.steps.slice(-5)) {
            const icon = s.status === 'success' ? '✓' : s.status === 'error' ? '✗' : '•';
            console.log(`   ${icon} [${s.agent}] ${s.action.substring(0, 40)}`);
        }

        console.log('\n📍 DECISIONS:');
        for (const d of this.currentTrace.decisions.slice(-3)) {
            console.log(`   → ${d.chosen} (${d.context.substring(0, 30)}...)`);
        }
    }
}

// CLI
const trace = new HiveTrace();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    start: () => trace.start(args[0] || `T-${Date.now()}`, args.slice(1).join(' ') || 'Task'),
    step: () => trace.step({
        agent: args[0] || 'agent',
        action: args[1] || 'doing something',
        duration: parseInt(args[2]) || 0,
        result: args[3]
    }),
    decision: () => trace.decision({
        agent: args[0] || 'agent',
        context: args[1] || 'choosing',
        options: args.slice(2, 5),
        chosen: args[2] || 'option1',
        reasoning: args[3] || 'because it makes sense'
    }),
    event: () => trace.event({
        type: args[0] || 'spawn',
        message: args.slice(1).join(' ') || 'event occurred'
    }),
    end: () => trace.end(args[0] || 'completed'),
    viz: () => trace.visualize(args[0]),
    history: () => trace.history(parseInt(args[0]) || 20),
    analyze: () => trace.analyze(args[0]),
    live: () => trace.live(),
    help: () => console.log(`
Hive Trace Commands

  start <taskId> <task>     Start new trace
  step <agent> <action> [ms] [result]  Record step
  decision <agent> <context> <chosen> <reasoning>  Log decision
  event <type> <message>    Log event (spawn/complete/fail/retry/fallback)
  end [status]               End trace (completed/failed)
  
  viz [traceId]              Visualize trace
  history [n]                View history
  analyze [agent]            Analyze performance
  live                        Live view of current trace
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveTrace };
