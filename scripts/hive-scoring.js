#!/usr/bin/env node
/**
 * Hive Agent Scoring — Production-Ready Evaluation System
 * 
 * Features:
 * - Rank agent outputs
 * - Track success rates
 * - Feedback loop
 * - Token usage tracking
 * - Performance metrics
 */

const fs = require('fs');
const path = require('path');

class HiveScoring {
    constructor() {
        this.dataDir = '/tmp/hive-scoring';
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
        
        this.scores = this.loadScores();
        this.agents = this.loadAgents();
        this.feedback = this.loadFeedback();
        this.tasks = this.loadTasks();
    }

    loadScores() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.dataDir, 'scores.json'), 'utf-8');
        } catch { return { rankings: {}, history: [] }; }
    }

    loadAgents() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.dataDir, 'agents.json'), 'utf-8');
        } catch { return {}; }
    }

    loadFeedback() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.dataDir, 'feedback.json'), 'utf-8');
        } catch { return []; }
    }

    loadTasks() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.dataDir, 'tasks.json'), 'utf-8');
        } catch { return []; }
    }

    saveScores() {
        fs.writeFileSync(path.join(this.dataDir, 'scores.json'), JSON.stringify(this.scores, null, 2));
    }

    saveAgents() {
        fs.writeFileSync(path.join(this.dataDir, 'agents.json'), JSON.stringify(this.agents, null, 2));
    }

    saveFeedback() {
        fs.writeFileSync(path.join(this.dataDir, 'feedback.json'), JSON.stringify(this.feedback, null, 2));
    }

    saveTasks() {
        fs.writeFileSync(path.join(this.dataDir, 'tasks.json'), JSON.stringify(this.tasks, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // SCORE AN AGENT OUTPUT
    // ═══════════════════════════════════════════════════════════

    score(args) {
        const { agentId, task, output, quality, speed, accuracy, usefulness, feedback } = args;
        
        // Calculate composite score
        const qualityScore = (quality || 7) * 10;
        const speedScore = (10 - (speed || 5)) * 5; // Faster = higher score
        const accuracyScore = (accuracy || 7) * 10;
        const usefulnessScore = (usefulness || 7) * 10;
        
        const composite = Math.round((qualityScore + speedScore + accuracyScore + usefulnessScore) / 4);
        
        const score = {
            id: `SCORE-${Date.now()}`,
            agentId,
            task,
            timestamp: Date.now(),
            quality: quality || 7,
            speed: speed || 5,
            accuracy: accuracy || 7,
            usefulness: usefulness || 7,
            composite,
            feedback: feedback || ''
        };

        // Update agent stats
        if (!this.agents[agentId]) {
            this.agents[agentId] = {
                id: agentId,
                totalScores: 0,
                totalQuality: 0,
                totalSpeed: 0,
                totalAccuracy: 0,
                totalUsefulness: 0,
                tasks: [],
                successCount: 0,
                failureCount: 0,
                avgLatency: 0,
                totalTokens: 0
            };
        }

        const agent = this.agents[agentId];
        agent.totalScores++;
        agent.totalQuality += score.quality;
        agent.totalSpeed += score.speed;
        agent.totalAccuracy += score.accuracy;
        agent.totalUsefulness += score.usefulness;
        agent.tasks.push(score.id);
        agent.lastScore = composite;

        // Update rankings
        this.scores.rankings[agentId] = {
            avgQuality: Math.round(agent.totalQuality / agent.totalScores),
            avgSpeed: Math.round(agent.totalSpeed / agent.totalScores),
            avgAccuracy: Math.round(agent.totalAccuracy / agent.totalScores),
            avgUsefulness: Math.round(agent.totalUsefulness / agent.totalScores),
            composite: Math.round((agent.totalQuality + agent.totalSpeed + agent.totalAccuracy + agent.totalUsefulness) / agent.totalScores / 4),
            totalTasks: agent.totalScores,
            successRate: agent.totalScores > 0 ? Math.round((agent.successCount / agent.totalScores) * 100) : 0
        };

        // Add to history
        this.scores.history.push(score);

        this.saveScores();
        this.saveAgents();

        console.log('\n' + '='.repeat(60));
        console.log('AGENT SCORED');
        console.log('='.repeat(60));
        console.log(`\nAgent: ${agentId}`);
        console.log(`Task: ${task}`);
        console.log(`Composite Score: ${composite}/100`);
        console.log(`  Quality:  ${score.quality}/10`);
        console.log(`  Speed:    ${score.speed}/10`);
        console.log(`  Accuracy: ${score.accuracy}/10`);
        console.log(`  Usefulness: ${score.usefulness}/10`);
        if (feedback) console.log(`\nFeedback: ${feedback}`);
        console.log(`\nAgent Avg: ${this.scores.rankings[agentId].composite}/100`);

        return score;
    }

    // ═══════════════════════════════════════════════════════════
    // RANK AGENTS
    // ═══════════════════════════════════════════════════════════

    rankings() {
        const rankings = Object.entries(this.scores.rankings)
            .map(([id, stats]) => ({ agentId: id, ...stats }))
            .sort((a, b) => b.composite - a.composite);

        console.log('\n' + '='.repeat(60));
        console.log('AGENT RANKINGS');
        console.log('='.repeat(60));
        console.log('\nRank | Agent                  | Score | Tasks | Success');
        console.log('-'.repeat(60));

        rankings.forEach((agent, i) => {
            console.log(`${(i + 1).toString().padStart(4)} | ${agent.agentId.padEnd(21)} | ${agent.composite.toString().padStart(5)} | ${agent.totalTasks.toString().padStart(5)} | ${agent.successRate}%`);
        });

        return rankings;
    }

    // ═══════════════════════════════════════════════════════════
    // AGENT STATS
    // ═══════════════════════════════════════════════════════════

    agentStats(agentId) {
        const agent = this.agents[agentId];
        if (!agent) {
            console.log(`Agent ${agentId} not found.`);
            return;
        }

        console.log('\n' + '='.repeat(60));
        console.log(`AGENT STATS: ${agentId}`);
        console.log('='.repeat(60));
        console.log(`\nTotal Tasks: ${agent.totalScores}`);
        console.log(`Success Rate: ${agent.successRate}%`);
        console.log(`Avg Latency: ${agent.avgLatency}ms`);
        console.log(`Total Tokens: ${agent.totalTokens.toLocaleString()}`);
        console.log(`\nAVERAGES:`);
        console.log(`  Quality:    ${agent.totalScores > 0 ? Math.round(agent.totalQuality / agent.totalScores : 0)}/10`);
        console.log(`  Speed:      ${agent.totalScores > 0 ? Math.round(agent.totalSpeed / agent.totalScores : 0)}/10`);
        console.log(`  Accuracy:   ${agent.totalScores > 0 ? Math.round(agent.totalAccuracy / agent.totalScores : 0)}/10`);
        console.log(`  Usefulness: ${agent.totalScores > 0 ? Math.round(agent.totalUsefulness / agent.totalScores : 0)}/10`);
        console.log(`\nCOMPOSITE:   ${this.scores.rankings[agentId]?.composite || 0}/100`);

        return agent;
    }

    // ═══════════════════════════════════════════════════════════
    // SUCCESS / FAILURE TRACKING
    // ═══════════════════════════════════════════════════════════

    markSuccess(agentId, taskId) {
        if (this.agents[agentId]) {
            this.agents[agentId].successCount++;
            this.saveAgents();
            console.log(`\n✓ Marked success for ${agentId} (task: ${taskId})`);
        }
    }

    markFailure(agentId, taskId, reason) {
        if (this.agents[agentId]) {
            this.agents[agentId].failureCount++;
            this.saveAgents();
            console.log(`\n✗ Marked failure for ${agentId} (task: ${taskId})`);
            if (reason) console.log(`  Reason: ${reason}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // FEEDBACK
    // ═══════════════════════════════════════════════════════════

    addFeedback(args) {
        const { agentId, task, type, content, sentiment } = args;
        
        const feedback = {
            id: `FB-${Date.now()}`,
            agentId,
            task,
            type: type || 'general', // 'correction', 'praise', 'criticism', 'suggestion'
            content,
            sentiment: sentiment || this.analyzeSentiment(content),
            timestamp: Date.now(),
            incorporated: false
        };

        this.feedback.push(feedback);
        this.saveFeedback();

        console.log('\n' + '='.repeat(60));
        console.log('FEEDBACK RECORDED');
        console.log('='.repeat(60));
        console.log(`\nAgent: ${agentId}`);
        console.log(`Type: ${type}`);
        console.log(`Sentiment: ${sentiment}`);
        console.log(`Content: ${content}`);

        return feedback;
    }

    analyzeSentiment(text) {
        const positive = ['good', 'great', 'excellent', 'perfect', 'love', 'awesome', 'best', 'correct', 'helpful'];
        const negative = ['bad', 'wrong', 'terrible', 'hate', 'worst', 'incorrect', 'broken', 'failed', 'sucks'];
        
        const lower = text.toLowerCase();
        const posCount = positive.filter(w => lower.includes(w)).length;
        const negCount = negative.filter(w => lower.includes(w)).length;
        
        if (posCount > negCount) return 'positive';
        if (negCount > posCount) return 'negative';
        return 'neutral';
    }

    viewFeedback(agentId = null) {
        const filtered = agentId ? this.feedback.filter(f => f.agentId === agentId) : this.feedback;
        
        console.log('\n' + '='.repeat(60));
        console.log(`FEEDBACK${agentId ? ` FOR ${agentId}` : ' (ALL AGENTS)'}`);
        console.log('='.repeat(60));

        for (const fb of filtered.slice(-20)) {
            const icon = fb.sentiment === 'positive' ? '✓' : fb.sentiment === 'negative' ? '✗' : '•';
            console.log(`\n${icon} [${fb.type}] ${fb.agentId} - ${new Date(fb.timestamp).toLocaleString()}`);
            console.log(`  ${fb.content.substring(0, 100)}...`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // TASK TRACKING
    // ═══════════════════════════════════════════════════════════

    trackTask(args) {
        const { taskId, agentId, task, startTime } = args;
        
        const taskEntry = {
            taskId,
            agentId,
            task,
            startTime: startTime || Date.now(),
            endTime: null,
            duration: null,
            status: 'running',
            output: null,
            score: null
        };

        this.tasks.push(taskEntry);
        this.saveTasks();

        console.log(`\n→ Task ${taskId} started by ${agentId}`);
        return taskEntry;
    }

    completeTask(taskId, output, score) {
        const task = this.tasks.find(t => t.taskId === taskId);
        if (task) {
            task.endTime = Date.now();
            task.duration = task.endTime - task.startTime;
            task.status = 'completed';
            task.output = output;
            task.score = score;
            this.saveTasks();
            console.log(`\n✓ Task ${taskId} completed in ${task.duration}ms`);
        }
    }

    failTask(taskId, error) {
        const task = this.tasks.find(t => t.taskId === taskId);
        if (task) {
            task.endTime = Date.now();
            task.duration = task.endTime - task.startTime;
            task.status = 'failed';
            task.error = error;
            this.saveTasks();
            console.log(`\n✗ Task ${taskId} failed: ${error}`);
        }
    }

    taskHistory(limit = 20) {
        const recent = this.tasks.slice(-limit);
        
        console.log('\n' + '='.repeat(60));
        console.log('RECENT TASKS');
        console.log('='.repeat(60));
        console.log('\nTask ID    | Agent               | Duration | Status');
        console.log('-'.repeat(60));

        for (const t of recent) {
            const dur = t.duration ? `${t.duration}ms` : 'running';
            const status = t.status === 'completed' ? '✓' : t.status === 'failed' ? '✗' : '•';
            console.log(`${t.taskId.toString().padEnd(9)} | ${(t.agentId || 'unknown').padEnd(20)} | ${dur.padStart(8)} | ${status} ${t.status}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // TOKEN USAGE
    // ═══════════════════════════════════════════════════════════

    trackTokens(agentId, tokens) {
        if (this.agents[agentId]) {
            this.agents[agentId].totalTokens += tokens;
            this.saveAgents();
        }
    }

    tokenReport() {
        console.log('\n' + '='.repeat(60));
        console.log('TOKEN USAGE REPORT');
        console.log('='.repeat(60));

        let total = 0;
        for (const [agentId, agent] of Object.entries(this.agents)) {
            total += agent.totalTokens;
            console.log(`${agentId.padEnd(25)}: ${agent.totalTokens.toLocaleString().padStart(12)} tokens`);
        }
        console.log('-'.repeat(60));
        console.log(`${'TOTAL'.padEnd(25)}: ${total.toLocaleString().padStart(12)} tokens`);
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        console.log('\n' + '='.repeat(60));
        console.log('🐝 HIVE AGENT SCORING DASHBOARD');
        console.log('='.repeat(60));

        const agentCount = Object.keys(this.agents).length;
        const taskCount = this.tasks.length;
        const completedCount = this.tasks.filter(t => t.status === 'completed').length;
        const failedCount = this.tasks.filter(t => t.status === 'failed').length;
        const totalFeedback = this.feedback.length;

        console.log('\n📊 OVERVIEW:');
        console.log(`   Agents Tracked: ${agentCount}`);
        console.log(`   Tasks Executed: ${taskCount}`);
        console.log(`   Success Rate: ${taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0}%`);
        console.log(`   Feedback Items: ${totalFeedback}`);

        console.log('\n🏆 TOP AGENTS:');
        const top = this.rankings().slice(0, 5);
        top.forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.agentId} — ${a.composite}/100`);
        });

        console.log('\n📈 RECENT PERFORMANCE:');
        const recent = this.tasks.slice(-10);
        const recentSuccess = recent.filter(t => t.status === 'completed').length;
        console.log(`   Last 10 tasks: ${recentSuccess}/${recent.length} successful`);
        
        const avgDuration = recent.filter(t => t.duration).reduce((a, t) => a + t.duration, 0) / recent.filter(t => t.duration).length;
        console.log(`   Avg Duration: ${Math.round(avgDuration)}ms`);

        this.tokenReport();
    }
}

// CLI
const scoring = new HiveScoring();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    score: () => scoring.score({
        agentId: args[0] || 'unknown',
        task: args[1] || 'task',
        quality: parseInt(args[2]) || 7,
        speed: parseInt(args[3]) || 5,
        accuracy: parseInt(args[4]) || 7,
        usefulness: parseInt(args[5]) || 7,
        feedback: args.slice(6).join(' ')
    }),
    rankings: () => scoring.rankings(),
    stats: () => scoring.agentStats(args[0] || 'unknown'),
    success: () => scoring.markSuccess(args[0], args[1]),
    failure: () => scoring.markFailure(args[0], args[1], args.slice(2).join(' ')),
    feedback: () => scoring.addFeedback({
        agentId: args[0],
        task: args[1],
        type: args[2],
        content: args.slice(3).join(' ')
    }),
    viewFeedback: () => scoring.viewFeedback(args[0]),
    track: () => scoring.trackTask({
        taskId: args[0] || `T-${Date.now()}`,
        agentId: args[1] || 'unknown',
        task: args.slice(2).join(' ')
    }),
    complete: () => scoring.completeTask(args[0], args.slice(1).join(' ')),
    fail: () => scoring.failTask(args[0], args.slice(1).join(' ')),
    history: () => scoring.taskHistory(parseInt(args[0]) || 20),
    tokens: () => scoring.tokenReport(),
    dashboard: () => scoring.dashboard(),
    help: () => console.log(`
Hive Agent Scoring Commands

  score <agent> <task> [quality speed accuracy usefulness] [feedback]
  rankings              View agent rankings
  stats <agent>        View agent statistics
  success <agent> <task>   Mark task success
  failure <agent> <task> [reason]  Mark task failure
  
  feedback <agent> <task> <type> <content>  Add feedback
  viewFeedback [agent]  View feedback
  
  track <taskId> <agent> <task>   Track task start
  complete <taskId> [output]  Mark task complete
  fail <taskId> <error>     Mark task failed
  history [n]          View task history
  
  tokens                Token usage report
  dashboard              Full dashboard
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveScoring };
