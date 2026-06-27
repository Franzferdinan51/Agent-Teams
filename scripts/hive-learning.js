#!/usr/bin/env node
/**
 * Hive Cross-Agent Learning — Agents learn from each other
 * Share learnings, insights, and patterns across the hive
 */

const http = require('http');
const WebSocket = require('ws');

const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';
const API_KEY = process.env.MESH_KEY || 'openclaw-mesh-default-key';
const WS_URL = MESH_URL.replace('http', 'ws') + '/ws';

class LearningEngine {
    constructor() {
        this.learnings = new Map();
        this.patterns = new Map();
        this.insights = new Map();
        this.teaches = new Map(); // What each agent can teach
        this.learns = new Map();  // What each agent wants to learn
        this.ws = null;
    }

    async connect() {
        this.connectWebSocket();
        console.log('📚 Learning Engine ready');
    }

    connectWebSocket() {
        this.ws = new WebSocket(WS_URL);

        this.ws.on('open', () => {
            this.ws.send(JSON.stringify({ type: 'subscribe', channel: 'learning' }));
        });

        this.ws.on('message', (data) => {
            const msg = JSON.parse(data);
            this.handleMessage(msg);
        });
    }

    handleMessage(msg) {
        if (msg.type === 'learning_shared') {
            this.receiveLearning(msg);
        }
        
        if (msg.type === 'pattern_discovered') {
            this.recordPattern(msg);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // LEARNINGS
    // ═══════════════════════════════════════════════════════════

    recordLearning(from, learning, tags = []) {
        const id = `${from}:${Date.now()}`;
        
        const entry = {
            id,
            from,
            learning,
            tags,
            recordedAt: Date.now(),
            usefulness: 0,
            timesApplied: 0
        };

        this.learnings.set(id, entry);

        // Broadcast to hive
        this.broadcast({
            type: 'learning_shared',
            from,
            learning,
            tags
        });

        console.log(`📚 LEARNING from ${from}: ${learning.substring(0, 50)}...`);

        return entry;
    }

    receiveLearning(msg) {
        if (!this.learnings.has(`${msg.from}:${msg.recordedAt}`)) {
            this.recordLearning(msg.from, msg.learning, msg.tags);
        }
    }

    getLearnings(agent = null) {
        if (agent) {
            return [...this.learnings.values()]
                .filter(l => l.from === agent)
                .sort((a, b) => b.recordedAt - a.recordedAt);
        }
        
        return [...this.learnings.values()]
            .sort((a, b) => b.usefulness - a.usefulness);
    }

    searchLearnings(query) {
        query = query.toLowerCase();
        return [...this.learnings.values()]
            .filter(l => 
                l.learning.toLowerCase().includes(query) ||
                l.tags.some(t => t.toLowerCase().includes(query))
            )
            .sort((a, b) => b.usefulness - a.usefulness);
    }

    // ═══════════════════════════════════════════════════════════
    // PATTERNS
    // ═══════════════════════════════════════════════════════════

    recordPattern(from, pattern, context, result) {
        const id = `pattern-${Date.now()}`;
        
        const entry = {
            id,
            from,
            pattern,
            context,
            result,
            recordedAt: Date.now(),
            success: result === 'success',
            timesUsed: 0
        };

        this.patterns.set(id, entry);

        console.log(`🔄 PATTERN from ${from}: ${pattern}`);

        return entry;
    }

    getPatterns(successful = null) {
        let patterns = [...this.patterns.values()];
        
        if (successful !== null) {
            patterns = patterns.filter(p => p.success === successful);
        }
        
        return patterns.sort((a, b) => b.timesUsed - a.timesUsed);
    }

    suggestPatterns(task) {
        task = task.toLowerCase();
        
        return [...this.patterns.values()]
            .filter(p => {
                const taskMatch = p.context?.toLowerCase().includes(task) ||
                    p.pattern.toLowerCase().includes(task);
                return taskMatch && p.success;
            })
            .sort((a, b) => b.timesUsed - a.timesUsed);
    }

    // ═══════════════════════════════════════════════════════════
    // INSIGHTS
    // ═══════════════════════════════════════════════════════════

    recordInsight(from, insight, category = 'general') {
        const id = `insight-${Date.now()}`;
        
        const entry = {
            id,
            from,
            insight,
            category,
            recordedAt: Date.now(),
            verified: false
        };

        this.insights.set(id, entry);

        return entry;
    }

    getInsights(category = null) {
        let insights = [...this.insights.values()];
        
        if (category) {
            insights = insights.filter(i => i.category === category);
        }
        
        return insights.sort((a, b) => b.recordedAt - a.recordedAt);
    }

    // ═══════════════════════════════════════════════════════════
    // TEACHING / LEARNING MATCHING
    // ═══════════════════════════════════════════════════════════

    registerCapabilities(agent, teaches = [], learns = []) {
        if (teaches.length > 0) {
            this.teaches.set(agent, teaches);
        }
        
        if (learns.length > 0) {
            this.learns.set(agent, learns);
        }

        console.log(`📝 ${agent} capabilities registered`);
    }

    findTeacher(topic) {
        topic = topic.toLowerCase();
        
        for (const [agent, topics] of this.teaches.entries()) {
            for (const t of topics) {
                if (t.toLowerCase().includes(topic)) {
                    return {
                        agent,
                        topics: topics.filter(x => x.toLowerCase().includes(topic))
                    };
                }
            }
        }
        
        return null;
    }

    async learnFrom(learner, teacher, topic) {
        console.log(`\n📚 ${learner} learning from ${teacher}: ${topic}`);

        // Get learnings from teacher about topic
        const teacherLearnings = this.getLearnings(teacher)
            .filter(l => l.learning.toLowerCase().includes(topic.toLowerCase()));

        // Get patterns
        const teacherPatterns = this.getPatterns(true)
            .filter(p => p.from === teacher)
            .filter(p => p.pattern.toLowerCase().includes(topic.toLowerCase()));

        // Get insights
        const teacherInsights = this.getInsights()
            .filter(i => i.from === teacher)
            .filter(i => i.insight.toLowerCase().includes(topic.toLowerCase()));

        const result = {
            learnings: teacherLearnings,
            patterns: teacherPatterns,
            insights: teacherInsights,
            teacher
        };

        // Record that learner consumed this
        for (const learning of teacherLearnings) {
            learning.timesApplied++;
        }

        console.log(`   ✅ Found ${teacherLearnings.length} learnings`);
        console.log(`   ✅ Found ${teacherPatterns.length} patterns`);
        console.log(`   ✅ Found ${teacherInsights.length} insights`);

        return result;
    }

    // ═══════════════════════════════════════════════════════════
    // FEEDBACK
    // ═══════════════════════════════════════════════════════════

    rateLearning(learningId, usefulness) {
        const learning = this.learnings.get(learningId);
        if (learning) {
            learning.usefulness = usefulness;
            console.log(`⭐ Rated learning ${learningId}: ${usefulness}`);
        }
    }

    applyPattern(patternId) {
        const pattern = this.patterns.get(patternId);
        if (pattern) {
            pattern.timesUsed++;
            console.log(`🔄 Applied pattern: ${pattern.pattern}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SYNDICATION
    // ═══════════════════════════════════════════════════════════

    broadcast(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                ...message,
                channel: 'learning'
            }));
        }
    }

    async fetch(endpoint, options = {}) {
        const url = new URL(endpoint, MESH_URL);
        const resp = await fetch(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
                ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        return resp.json();
    }

    // ═══════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════

    status() {
        return {
            totalLearnings: this.learnings.size,
            totalPatterns: this.patterns.size,
            totalInsights: this.insights.size,
            teachers: this.teaches.size,
            learners: this.learns.size
        };
    }
}

// CLI
if (require.main === module) {
    const engine = new LearningEngine();
    const command = process.argv[2];

    (async () => {
        await engine.connect();

        switch (command) {
            case 'learn':
                engine.recordLearning(
                    process.argv[3],
                    process.argv[4] || 'Important learning',
                    process.argv[5]?.split(',') || []
                );
                break;

            case 'pattern':
                engine.recordPattern(
                    process.argv[3],
                    process.argv[4],
                    process.argv[5],
                    process.argv[6] || 'success'
                );
                break;

            case 'insight':
                engine.recordInsight(
                    process.argv[3],
                    process.argv[4],
                    process.argv[5] || 'general'
                );
                break;

            case 'list':
                const learnings = engine.getLearnings(process.argv[3]);
                console.log(JSON.stringify(learnings, null, 2));
                break;

            case 'search':
                const results = engine.searchLearnings(process.argv[3] || '');
                console.log(JSON.stringify(results, null, 2));
                break;

            case 'patterns':
                console.log(JSON.stringify(engine.getPatterns(true), null, 2));
                break;

            case 'suggest':
                console.log(JSON.stringify(engine.suggestPatterns(process.argv[3] || ''), null, 2));
                break;

            case 'teach':
                const teacher = engine.findTeacher(process.argv[3] || '');
                console.log(teacher || 'No teacher found');
                break;

            case 'learn-from':
                const result = await engine.learnFrom(
                    process.argv[3],
                    process.argv[4],
                    process.argv[5]
                );
                console.log(JSON.stringify(result, null, 2));
                break;

            case 'register':
                engine.registerCapabilities(
                    process.argv[3],
                    process.argv[4]?.split(',') || [],
                    process.argv[5]?.split(',') || []
                );
                break;

            case 'status':
                console.log(JSON.stringify(engine.status(), null, 2));
                break;

            default:
                console.log(`
📚 Learning Engine v1.0.0

Usage:
  node hive-learning.js learn <agent> "learning text" [tag1,tag2]
  node hive-learning.js pattern <agent> "pattern" "context" "result"
  node hive-learning.js insight <agent> "insight" [category]
  node hive-learning.js list [agent]
  node hive-learning.js search <query>
  node hive-learning.js patterns
  node hive-learning.js suggest <task>
  node hive-learning.js teach <topic>
  node hive-learning.js learn-from <learner> <teacher> <topic>
  node hive-learning.js register <agent> <teaches> <learns>
  node hive-learning.js status

Examples:
  node hive-learning.js learn duck-cli "Use shorter explanations" "communication"
  node hive-learning.js pattern ai-council "Weighted voting" "consensus" "success"
  node hive-learning.js suggest "image generation"
  node hive-learning.js learn-from dashboard ai-council "plant analysis"
                `);
        }

        setTimeout(() => process.exit(0), 1000);
    })();
}

module.exports = { LearningEngine };
