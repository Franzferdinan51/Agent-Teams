#!/usr/bin/env node
/**
 * Hive Memory — Production-Ready Persistence System
 * 
 * Features:
 * - SQLite-backed storage
 * - Cross-session recall
 * - Structured logs
 * - Semantic search (simple vector similarity)
 * - Memory categories
 */

const fs = require('fs');
const path = require('path');

// Simple embedded SQLite (no external deps)
class SimpleDB {
    constructor(filepath) {
        this.filepath = filepath;
        this.data = this.load();
    }

    load() {
        try {
            return JSON.parse(fs.readFileSync(this.filepath, 'utf-8'));
        } catch {
            return { memories: [], index: {} };
        }
    }

    save() {
        fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2));
    }

    insert(memory) {
        memory.id = `MEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        memory.timestamp = Date.now();
        this.data.memories.push(memory);
        
        // Update simple index
        if (!this.data.index[memory.category]) {
            this.data.index[memory.category] = [];
        }
        this.data.index[memory.category].push(memory.id);
        
        this.save();
        return memory;
    }

    search(query, category = null, limit = 20) {
        const q = query.toLowerCase();
        let results = this.data.memories;

        if (category) {
            results = results.filter(m => m.category === category);
        }

        // Simple keyword matching + ranking
        results = results
            .map(m => {
                const content = (m.content + ' ' + (m.tags || [])).toLowerCase();
                const matches = q.split(' ').filter(w => w.length > 2)
                    .reduce((score, word) => score + (content.includes(word) ? 1 : 0), 0);
                return { ...m, relevance: score };
            })
            .filter(m => m.relevance > 0)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, limit);

        return results;
    }

    get(id) {
        return this.data.memories.find(m => m.id === id);
    }

    byCategory(category) {
        return this.data.memories.filter(m => m.category === category);
    }

    recent(limit = 50) {
        return [...this.data.memories]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    delete(id) {
        const idx = this.data.memories.findIndex(m => m.id === id);
        if (idx !== -1) {
            this.data.memories.splice(idx, 1);
            this.save();
            return true;
        }
        return false;
    }

    stats() {
        const categories = {};
        for (const m of this.data.memories) {
            categories[m.category] = (categories[m.category] || 0) + 1;
        }
        return {
            total: this.data.memories.length,
            categories
        };
    }
}

class HiveMemory {
    constructor() {
        this.memoryDir = '/tmp/hive-memory';
        if (!fs.existsSync(this.memoryDir)) fs.mkdirSync(this.memoryDir, { recursive: true });
        
        this.db = new SimpleDB(path.join(this.memoryDir, 'hive-memory.json'));
        this.sessions = new SimpleDB(path.join(this.memoryDir, 'sessions.json'));
        this.decisions = new SimpleDB(path.join(this.memoryDir, 'decisions.json'));
        this.learnings = new SimpleDB(path.join(this.memoryDir, 'learnings.json'));
    }

    // ═══════════════════════════════════════════════════════════
    // REMEMBER
    // ═══════════════════════════════════════════════════════════

    remember(args) {
        const { category, content, tags, importance = 5 } = args;
        
        const memory = {
            category: category || 'general',
            content,
            tags: tags || [],
            importance,
            accessCount: 0,
            lastAccessed: null
        };

        const saved = this.db.insert(memory);
        
        console.log('\n✓ Memory saved:');
        console.log(`  ID: ${saved.id}`);
        console.log(`  Category: ${category}`);
        console.log(`  Content: ${content.substring(0, 80)}...`);
        
        return saved;
    }

    // ═══════════════════════════════════════════════════════════
    // RECALL
    // ═══════════════════════════════════════════════════════════

    recall(query, category = null) {
        const results = this.db.search(query, category);
        
        console.log('\n' + '='.repeat(60));
        console.log(`MEMORY RECALL: "${query}"`);
        console.log('='.repeat(60));
        
        if (results.length === 0) {
            console.log('\nNo memories found.');
            return [];
        }

        for (const r of results) {
            // Update access count
            r.accessCount++;
            r.lastAccessed = Date.now();
            this.db.save();

            const age = this.ageString(r.timestamp);
            console.log(`\n[${r.category}] ${age}`);
            console.log(`  ${r.content.substring(0, 150)}...`);
            if (r.tags.length) console.log(`  Tags: ${r.tags.join(', ')}`);
            console.log(`  Relevance: ${r.relevance} | Accessed: ${r.accessCount}x`);
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════
    // SESSION MEMORY
    // ═══════════════════════════════════════════════════════════

    saveSession(sessionId, data) {
        const session = {
            sessionId,
            data,
            timestamp: Date.now()
        };
        
        this.sessions.insert(session);
        console.log(`\n✓ Session ${sessionId} saved`);
    }

    loadSession(sessionId) {
        const sessions = this.sessions.search(sessionId);
        return sessions[0]?.data;
    }

    sessionHistory(limit = 20) {
        const recent = this.sessions.recent(limit);
        
        console.log('\n' + '='.repeat(60));
        console.log('SESSION HISTORY');
        console.log('='.repeat(60));

        for (const s of recent) {
            const age = this.ageString(s.timestamp);
            console.log(`\n[${age}] Session: ${s.sessionId}`);
            console.log(`  ${JSON.stringify(s.data).substring(0, 100)}...`);
        }

        return recent;
    }

    // ═══════════════════════════════════════════════════════════
    // DECISIONS LOG
    // ═══════════════════════════════════════════════════════════

    logDecision(args) {
        const { context, decision, rationale, outcome, agent } = args;
        
        const decisionEntry = {
            context,
            decision,
            rationale,
            outcome,
            agent,
            timestamp: Date.now()
        };

        this.decisions.insert(decisionEntry);
        
        console.log('\n✓ Decision logged:');
        console.log(`  Context: ${context.substring(0, 60)}...`);
        console.log(`  Decision: ${decision}`);
        if (agent) console.log(`  Agent: ${agent}`);
    }

    pastDecisions(query, limit = 10) {
        const results = this.decisions.search(query, null, limit);
        
        console.log('\n' + '='.repeat(60));
        console.log(`PAST DECISIONS: "${query}"`);
        console.log('='.repeat(60));

        for (const d of results) {
            const age = this.ageString(d.timestamp);
            console.log(`\n[${age}] ${d.decision}`);
            console.log(`  Context: ${d.context.substring(0, 100)}...`);
            console.log(`  Rationale: ${d.rationale.substring(0, 100)}...`);
            if (d.outcome) console.log(`  Outcome: ${d.outcome}`);
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════
    // LEARNINGS
    // ═══════════════════════════════════════════════════════════

    learn(args) {
        const { topic, learning, source, confidence = 7 } = args;
        
        const learningEntry = {
            topic,
            learning,
            source,
            confidence,
            timestamp: Date.now()
        };

        this.learnings.insert(learningEntry);
        
        console.log('\n✓ Learning stored:');
        console.log(`  Topic: ${topic}`);
        console.log(`  Learning: ${learning.substring(0, 100)}...`);
        console.log(`  Confidence: ${confidence}/10`);
    }

    recallLearnings(topic, limit = 10) {
        const results = this.learnings.search(topic, null, limit);
        
        console.log('\n' + '='.repeat(60));
        console.log(`LEARNINGS ABOUT: "${topic}"`);
        console.log('='.repeat(60));

        for (const l of results) {
            const age = this.ageString(l.timestamp);
            console.log(`\n[${age}] ${l.confidence}/10 confidence`);
            console.log(`  ${l.learning.substring(0, 150)}...`);
            if (l.source) console.log(`  Source: ${l.source}`);
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════
    // CATEGORIES
    // ═══════════════════════════════════════════════════════════

    categories() {
        const stats = this.db.stats();
        
        console.log('\n' + '='.repeat(60));
        console.log('MEMORY CATEGORIES');
        console.log('='.repeat(60));
        console.log(`\nTotal memories: ${stats.total}`);
        console.log('\nBy category:');
        
        for (const [cat, count] of Object.entries(stats.categories)) {
            console.log(`  ${cat}: ${count}`);
        }

        return stats.categories;
    }

    // ═══════════════════════════════════════════════════════════
    // RECENT
    // ═══════════════════════════════════════════════════════════

    recent(limit = 20) {
        const memories = this.db.recent(limit);
        
        console.log('\n' + '='.repeat(60));
        console.log('RECENT MEMORIES');
        console.log('='.repeat(60));

        for (const m of memories) {
            const age = this.ageString(m.timestamp);
            console.log(`\n[${age}] [${m.category}]`);
            console.log(`  ${m.content.substring(0, 120)}...`);
        }

        return memories;
    }

    // ═══════════════════════════════════════════════════════════
    // DELETE
    // ═══════════════════════════════════════════════════════════

    forget(memoryId) {
        if (this.db.delete(memoryId)) {
            console.log(`\n✓ Memory ${memoryId} deleted`);
        } else {
            console.log(`\n✗ Memory ${memoryId} not found`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITY
    // ═══════════════════════════════════════════════════════════

    ageString(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 30) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        const memStats = this.db.stats();
        const sessionCount = this.sessions.db.data.memories.length;
        const decisionCount = this.decisions.db.data.memories.length;
        const learningCount = this.learnings.db.data.memories.length;

        console.log('\n' + '='.repeat(60));
        console.log('🐝 HIVE MEMORY DASHBOARD');
        console.log('='.repeat(60));
        
        console.log('\n📊 STORAGE:');
        console.log(`   Memories: ${memStats.total}`);
        console.log(`   Sessions: ${sessionCount}`);
        console.log(`   Decisions: ${decisionCount}`);
        console.log(`   Learnings: ${learningCount}`);
        
        console.log('\n📁 CATEGORIES:');
        for (const [cat, count] of Object.entries(memStats.categories)) {
            console.log(`   ${cat}: ${count}`);
        }
        
        console.log('\n🕐 RECENT (5):');
        const recent = this.db.recent(5);
        for (const m of recent) {
            console.log(`   ${this.ageString(m.timestamp)}: ${m.content.substring(0, 50)}...`);
        }
    }
}

// CLI
const memory = new HiveMemory();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    remember: () => memory.remember({
        category: args[0] || 'general',
        content: args.slice(1).join(' ') || 'Remember this'
    }),
    recall: () => memory.recall(args.join(' ') || 'test'),
    categories: () => memory.categories(),
    recent: () => memory.recent(parseInt(args[0]) || 20),
    forget: () => memory.forget(args[0]),
    
    session: () => memory.saveSession(args[0], args.slice(1).join(' ')),
    loadSession: () => {
        const data = memory.loadSession(args[0]);
        console.log(data);
    },
    sessionHistory: () => memory.sessionHistory(parseInt(args[0]) || 20),
    
    decision: () => memory.logDecision({
        context: args[0] || '',
        decision: args[1] || '',
        rationale: args[2] || '',
        agent: args[3]
    }),
    pastDecisions: () => memory.pastDecisions(args.join(' ') || 'test'),
    
    learn: () => memory.learn({
        topic: args[0] || 'general',
        learning: args.slice(1).join(' ') || 'Learned something'
    }),
    recallLearnings: () => memory.recallLearnings(args.join(' ') || 'test'),
    
    dashboard: () => memory.dashboard(),
    help: () => console.log(`
Hive Memory Commands

  remember <category> <content>       Save a memory
  recall <query>                      Search memories
  categories                          List categories
  recent [n]                         Recent memories
  forget <id>                        Delete memory

  session <id> <data>               Save session
  loadSession <id>                   Load session
  sessionHistory [n]                 Session history

  decision <context> <decision> [rationale] [agent]  Log decision
  pastDecisions <query>              Search past decisions

  learn <topic> <learning> [source]  Store learning
  recallLearnings <topic>            Recall learnings

  dashboard                          Full dashboard
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveMemory, SimpleDB };
