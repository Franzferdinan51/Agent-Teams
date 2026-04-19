#!/usr/bin/env node
/**
 * Hive Agent Scoring — Production-Ready Evaluation System
 */

const fs = require('fs');
const os = require('os');
const pathModule = require('path');

class HiveScoring {
    constructor() {
        this.dataDir = '/tmp/hive-scoring';
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        this.scores = this.loadScores();
        this.agents = this.loadAgents();
        this.feedback = this.loadFeedback();
        this.tasks = this.loadTasks();
    }

    loadScores() {
        try {
            const file = pathModule.join(this.dataDir, 'scores.json');
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
            return { rankings: {}, history: [] };
        }
    }

    loadAgents() {
        try {
            const file = pathModule.join(this.dataDir, 'agents.json');
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
            return {};
        }
    }

    loadFeedback() {
        try {
            const file = pathModule.join(this.dataDir, 'feedback.json');
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
            return [];
        }
    }

    loadTasks() {
        try {
            const file = pathModule.join(this.dataDir, 'tasks.json');
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
            return [];
        }
    }

    saveScores() {
        const file = pathModule.join(this.dataDir, 'scores.json');
        fs.writeFileSync(file, JSON.stringify(this.scores, null, 2));
    }

    saveAgents() {
        const file = pathModule.join(this.dataDir, 'agents.json');
        fs.writeFileSync(file, JSON.stringify(this.agents, null, 2));
    }

    // Score an agent
    score(agentId, score, category = 'general') {
        if (!this.scores.rankings[agentId]) {
            this.scores.rankings[agentId] = {
                total: 0,
                count: 0,
                avg: 0,
                history: []
            };
        }
        const ranking = this.scores.rankings[agentId];
        ranking.total += score;
        ranking.count++;
        ranking.avg = ranking.total / ranking.count;
        ranking.history.push({ score, category, timestamp: Date.now() });
        this.saveScores();
        return ranking;
    }

    // Get agent scores
    getScore(agentId) {
        return this.scores.rankings[agentId] || null;
    }

    // Get all rankings
    getRankings() {
        return Object.entries(this.scores.rankings)
            .map(([id, data]) => ({ agentId: id, ...data }))
            .sort((a, b) => b.avg - a.avg);
    }

    // Dashboard
    dashboard() {
        const rankings = this.getRankings();
        const totalAgents = rankings.length;
        const totalScores = rankings.reduce((sum, r) => sum + r.count, 0);
        const avgScore = totalAgents > 0 
            ? (rankings.reduce((sum, r) => sum + r.avg, 0) / totalAgents).toFixed(2)
            : 0;

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              📊 HIVE SCORING SYSTEM 📊                       ║
╠══════════════════════════════════════════════════════════════════╣
║  Total Agents: ${(totalAgents + '').padEnd(55)}║
║  Total Scores: ${(totalScores + '').padEnd(55)}║
║  Average Score: ${(avgScore + '').padEnd(51)}║
╚══════════════════════════════════════════════════════════════════╝
`);
    }
}

// CLI
const scoring = new HiveScoring();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    score: () => {
        const agentId = args[0];
        const score = parseFloat(args[1]);
        const category = args[2] || 'general';
        if (!agentId || isNaN(score)) {
            console.log('Usage: hive-scoring score <agentId> <score> [category]');
            return;
        }
        const result = scoring.score(agentId, score, category);
        console.log(`\n✓ ${agentId} scored: ${score} (avg: ${result.avg.toFixed(2)})`);
    },
    get: () => {
        const agentId = args[0];
        if (!agentId) {
            console.log('Usage: hive-scoring get <agentId>');
            return;
        }
        const result = scoring.getScore(agentId);
        if (result) {
            console.log(`\n📊 ${agentId}:`);
            console.log(`   Total: ${result.total}`);
            console.log(`   Count: ${result.count}`);
            console.log(`   Average: ${result.avg.toFixed(2)}`);
        } else {
            console.log(`\nNo scores for ${agentId}`);
        }
    },
    rankings: () => {
        const rankings = scoring.getRankings();
        console.log('\n🏆 AGENT RANKINGS:');
        rankings.slice(0, 10).forEach((r, i) => {
            console.log(`  ${i + 1}. ${r.agentId} - ${r.avg.toFixed(2)} avg (${r.count} scores)`);
        });
    },
    dashboard: () => scoring.dashboard(),
    help: () => console.log(`
📊 HIVE SCORING

  score <agentId> <score> [category]  Score an agent
  get <agentId>                       Get agent score
  rankings                            Show top rankings
  dashboard                            Show dashboard
`)
};

commands[cmd]?.() || commands.dashboard();

module.exports = { HiveScoring };
