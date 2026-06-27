#!/usr/bin/env node
/**
 * Hive Memory - Production Memory System
 * 
 * Integrated with:
 * - Scoring (track decision outcomes)
 * - Trace (store task learnings)
 * - Budget (log resource decisions)
 * - Government (track legislation outcomes)
 * 
 * Usage:
 *   node scripts/hive-memory.js <command>
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// SIMPLE EMBEDDED DATABASE
// ═══════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════
// HIVE MEMORY CLASS
// ═══════════════════════════════════════════════════════════════════

class HiveMemory {
    constructor() {
        this.memoryDir = '/tmp/hive-memory';
        if (!fs.existsSync(this.memoryDir)) fs.mkdirSync(this.memoryDir, { recursive: true });
        
        this.db = new SimpleDB(path.join(this.memoryDir, 'hive-memory.json'));
        this.decisions = new SimpleDB(path.join(this.memoryDir, 'decisions.json'));
        this.learnings = new SimpleDB(path.join(this.memoryDir, 'learnings.json'));
        this.workflows = new SimpleDB(path.join(this.memoryDir, 'workflows.json'));
        this.projects = new SimpleDB(path.join(this.memoryDir, 'projects.json'));
    }

    // ═══════════════════════════════════════════════════════════
    // QUICK REMEMBER (Most Used)
    // ═══════════════════════════════════════════════════════════

    remember(args) {
        const { category = 'general', content, tags = [], importance = 5 } = args;
        
        const memory = {
            category,
            content,
            tags,
            importance,
            accessCount: 0,
            lastAccessed: null
        };

        const saved = this.db.insert(memory);
        
        console.log(`\n✓ Memory saved [${category}]: ${content.substring(0, 60)}...`);
        return saved;
    }

    // ═══════════════════════════════════════════════════════════
    // QUICK RECALL (Most Used)
    // ═══════════════════════════════════════════════════════════

    recall(query, category = null) {
        const results = this.db.search(query, category);
        
        console.log(`\n📚 RECALL: "${query}"`);
        console.log('═'.repeat(50));
        
        if (results.length === 0) {
            console.log('\nNo memories found.');
            return [];
        }

        for (const r of results) {
            r.accessCount++;
            r.lastAccessed = Date.now();
            this.db.save();

            const age = this.ageString(r.timestamp);
            console.log(`\n[${age}] [${r.category}]`);
            console.log(`  ${r.content.substring(0, 150)}`);
            if (r.tags.length) console.log(`  Tags: ${r.tags.join(', ')}`);
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════
    // DECISION LOG (Critical for Decision Making)
    // ═══════════════════════════════════════════════════════════

    logDecision(args) {
        const { context, decision, rationale, outcome = null, agent = 'system', score = null } = args;
        
        const entry = {
            context,
            decision,
            rationale,
            outcome,
            agent,
            score,
            timestamp: Date.now()
        };

        this.decisions.insert(entry);
        
        console.log(`\n✓ Decision logged:`);
        console.log(`  Context: ${context.substring(0, 50)}...`);
        console.log(`  Decision: ${decision}`);
        console.log(`  Agent: ${agent}`);
        if (score) console.log(`  Score: ${score}/100`);
        
        return entry;
    }

    // ═══════════════════════════════════════════════════════════
    // PAST DECISIONS (For Reference)
    // ═══════════════════════════════════════════════════════════

    pastDecisions(query = 'test', limit = 10) {
        const results = this.decisions.search(query, null, limit);
        
        console.log(`\n⚖️ PAST DECISIONS: "${query}"`);
        console.log('═'.repeat(50));

        for (const d of results) {
            const age = this.ageString(d.timestamp);
            console.log(`\n[${age}] ${d.decision}`);
            console.log(`  Context: ${d.context.substring(0, 80)}...`);
            console.log(`  Rationale: ${d.rationale.substring(0, 80)}...`);
            if (d.outcome) console.log(`  Outcome: ${d.outcome}`);
            if (d.score) console.log(`  Score: ${d.score}/100`);
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════
    // LEARNINGS (From Experience)
    // ═══════════════════════════════════════════════════════════

    learn(args) {
        const { topic, learning, source, confidence = 7, type = 'general' } = args;
        
        const entry = {
            topic,
            learning,
            source,
            confidence,
            type, // 'technical', 'process', 'decision', 'pattern'
            timestamp: Date.now()
        };

        this.learnings.insert(entry);
        
        console.log(`\n✓ Learning stored [${type}]:`);
        console.log(`  Topic: ${topic}`);
        console.log(`  ${learning.substring(0, 100)}...`);
        console.log(`  Confidence: ${confidence}/10`);
        
        return entry;
    }

    recallLearnings(topic = 'test', limit = 10) {
        const results = this.learnings.search(topic, null, limit);
        
        console.log(`\n🧠 LEARNINGS: "${topic}"`);
        console.log('═'.repeat(50));

        for (const l of results) {
            const age = this.ageString(l.timestamp);
            console.log(`\n[${age}] [${l.type}] ${l.confidence}/10 confidence`);
            console.log(`  ${l.learning.substring(0, 150)}`);
            if (l.source) console.log(`  Source: ${l.source}`);
        }

        return results;
    }

    // ═══════════════════════════════════════════════════════════
    // WORKFLOWS (Reusable Templates)
    // ═══════════════════════════════════════════════════════════

    createWorkflow(args) {
        const { name, steps, description, category = 'general' } = args;
        
        const workflow = {
            name,
            description,
            category,
            steps,
            createdAt: Date.now(),
            usageCount: 0
        };

        const saved = this.workflows.insert(workflow);
        console.log(`\n✓ Workflow created: ${name}`);
        console.log(`  Steps: ${steps.length}`);
        return saved;
    }

    runWorkflow(name) {
        const workflows = this.workflows.search(name);
        if (workflows.length === 0) {
            console.log(`Workflow not found: ${name}`);
            return null;
        }

        const workflow = workflows[0];
        workflow.usageCount++;
        this.workflows.save();

        console.log(`\n▶ Running workflow: ${workflow.name}`);
        console.log(`  ${workflow.description}`);
        console.log('\nSteps:');
        
        workflow.steps.forEach((step, i) => {
            console.log(`  ${i + 1}. ${step}`);
        });

        return workflow;
    }

    listWorkflows() {
        const workflows = this.workflows.recent(20);
        
        console.log('\n📋 WORKFLOWS');
        console.log('═'.repeat(50));

        for (const w of workflows) {
            console.log(`\n  ${w.name} [${w.category}]`);
            console.log(`    ${w.description}`);
            console.log(`    Steps: ${w.steps.length} | Used: ${w.usageCount}x`);
        }

        return workflows;
    }

    // ═══════════════════════════════════════════════════════════
    // PROJECTS (Track Work)
    // ═══════════════════════════════════════════════════════════

    trackProject(args) {
        const { name, status = 'active', description, milestones = [] } = args;
        
        const project = {
            name,
            description,
            status,
            milestones,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            notes: []
        };

        const saved = this.projects.insert(project);
        console.log(`\n✓ Project tracked: ${name} [${status}]`);
        return saved;
    }

    updateProject(name, updates) {
        const projects = this.projects.search(name);
        if (projects.length === 0) {
            console.log(`Project not found: ${name}`);
            return null;
        }

        Object.assign(projects[0], updates, { updatedAt: Date.now() });
        this.projects.save();
        
        console.log(`\n✓ Project updated: ${name}`);
        return projects[0];
    }

    projectStatus() {
        const all = this.projects.recent(50);
        
        const active = all.filter(p => p.status === 'active').length;
        const completed = all.filter(p => p.status === 'completed').length;
        const paused = all.filter(p => p.status === 'paused').length;

        console.log('\n📊 PROJECT STATUS');
        console.log('═'.repeat(50));
        console.log(`  Active: ${active}`);
        console.log(`  Completed: ${completed}`);
        console.log(`  Paused: ${paused}`);
        console.log(`  Total: ${all.length}`);

        if (active > 0) {
            console.log('\n  Active Projects:');
            for (const p of all.filter(p => p.status === 'active').slice(0, 5)) {
                console.log(`    • ${p.name}`);
            }
        }

        return { active, completed, paused, total: all.length };
    }

    // ═══════════════════════════════════════════════════════════
    // INTEGRATION: SCORING DECISIONS
    // ═══════════════════════════════════════════════════════════

    scoreDecision(decisionId, outcome, score) {
        const decisions = this.decisions.db.data.memories;
        const decision = decisions.find(d => d.id === decisionId);
        
        if (decision) {
            decision.outcome = outcome;
            decision.score = score;
            decision.scoredAt = Date.now();
            this.decisions.save();
            
            console.log(`\n✓ Decision scored: ${score}/100`);
            console.log(`  Outcome: ${outcome}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // INTEGRATION: TRACE LEARNINGS
    // ═══════════════════════════════════════════════════════════

    learnFromTask(taskId, agent, result, success) {
        this.learn({
            topic: 'task-execution',
            learning: `Task ${taskId} by ${agent}: ${result.substring(0, 100)}...`,
            source: 'trace',
            confidence: success ? 9 : 5,
            type: success ? 'pattern' : 'error'
        });
    }

    // ═══════════════════════════════════════════════════════════
    // QUICK TEMPLATES
    // ═══════════════════════════════════════════════════════════

    quick(args) {
        const { type, content } = args;
        
        switch (type) {
            case 'todo':
                return this.remember({
                    category: 'todo',
                    content,
                    tags: ['action', 'pending']
                });
            
            case 'learn':
                return this.learn({
                    topic: 'quick-learn',
                    learning: content,
                    source: 'quick-note'
                });
            
            case 'decision':
                return this.logDecision({
                    context: 'quick',
                    decision: content,
                    rationale: 'Quick logged'
                });
            
            case 'note':
                return this.remember({
                    category: 'notes',
                    content,
                    tags: ['note']
                });
            
            default:
                return this.remember({
                    category: 'quick',
                    content
                });
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
        const decisionCount = this.decisions.db.data.memories.length;
        const learningCount = this.learnings.db.data.memories.length;
        const workflowCount = this.workflows.db.data.memories.length;
        const projectStats = this.projects.db.data.memories.length;

        console.log('\n' + '═'.repeat(50));
        console.log('🐝 HIVE MEMORY DASHBOARD');
        console.log('═'.repeat(50));
        
        console.log('\n📊 STORAGE:');
        console.log(`   Memories: ${memStats.total}`);
        console.log(`   Decisions: ${decisionCount}`);
        console.log(`   Learnings: ${learningCount}`);
        console.log(`   Workflows: ${workflowCount}`);
        console.log(`   Projects: ${projectStats}`);
        
        console.log('\n📁 CATEGORIES:');
        for (const [cat, count] of Object.entries(memStats.categories)) {
            console.log(`   ${cat}: ${count}`);
        }
        
        console.log('\n🕐 RECENT (5):');
        const recent = this.db.recent(5);
        for (const m of recent) {
            console.log(`   ${this.ageString(m.timestamp)}: ${m.content.substring(0, 50)}...`);
        }

        console.log('\n⚖️ RECENT DECISIONS (3):');
        const recentDecisions = this.decisions.recent(3);
        for (const d of recentDecisions) {
            console.log(`   ${this.ageString(d.timestamp)}: ${d.decision.substring(0, 40)}...`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // API EXPORT (For WebUI/Integration)
    // ═══════════════════════════════════════════════════════════

    api() {
        return {
            stats: this.db.stats(),
            recent: this.db.recent(20),
            decisions: this.decisions.recent(20),
            learnings: this.learnings.recent(20),
            workflows: this.workflows.recent(20),
            projects: this.projects.recent(20)
        };
    }
}

// ═══════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════

const memory = new HiveMemory();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    // Quick actions
    remember: () => memory.remember({
        category: args[0] || 'general',
        content: args.slice(1).join(' ') || 'Remember this'
    }),
    recall: () => memory.recall(args.join(' ') || 'test'),
    quick: () => memory.quick({ type: args[0], content: args.slice(1).join(' ') }),
    
    // Decisions
    decision: () => memory.logDecision({
        context: args[0] || 'general',
        decision: args[1] || 'decision made',
        rationale: args[2] || 'reasoning',
        agent: args[3]
    }),
    pastDecisions: () => memory.pastDecisions(args.join(' ') || 'test'),
    
    // Learnings
    learn: () => memory.learn({
        topic: args[0] || 'general',
        learning: args.slice(1).join(' ') || 'learned something',
        source: args[3]
    }),
    recallLearnings: () => memory.recallLearnings(args.join(' ') || 'test'),
    
    // Workflows
    createWorkflow: () => memory.createWorkflow({
        name: args[0],
        description: args[1],
        steps: args.slice(2)
    }),
    runWorkflow: () => memory.runWorkflow(args[0]),
    workflows: () => memory.listWorkflows(),
    
    // Projects
    project: () => memory.trackProject({ name: args[0], description: args.slice(1).join(' ') }),
    projectStatus: () => memory.projectStatus(),
    
    // Categories & Stats
    categories: () => memory.db.stats(),
    recent: () => memory.db.recent(parseInt(args[0]) || 20),
    
    // Dashboard
    dashboard: () => memory.dashboard(),
    
    // API
    api: () => console.log(JSON.stringify(memory.api(), null, 2)),
    
    // Help
    help: () => console.log(`
HIVE MEMORY - Production Memory System
═══════════════════════════════════════════════════════════════

QUICK ACTIONS:
  remember <category> <content>   Save a memory
  recall <query>                 Search memories
  quick <type> <content>          Quick save (todo|learn|decision|note)

DECISIONS:
  decision <context> <decision> [rationale] [agent]
  pastDecisions <query>          Search past decisions

LEARNINGS:
  learn <topic> <learning> [source]
  recallLearnings <topic>         Search learnings

WORKFLOWS:
  createWorkflow <name> <desc> <step1> <step2> ...
  runWorkflow <name>             Run a workflow
  workflows                      List workflows

PROJECTS:
  project <name> [description]   Track new project
  projectStatus                  Show all projects

INFO:
  categories                     Memory categories
  recent [n]                     Recent memories
  dashboard                      Full dashboard
  api                            JSON export for integrations

EXAMPLES:
  hive-memory remember work "Use MiniMax M2.7 for agents"
  hive-memory recall "model preferences"
  hive-memory decision "Use MiniMax" "Best for agents" "Fast + accurate"
  hive-memory learn model-choice "MiniMax M2.7 is best for agents" "benchmark"
  hive-memory quick todo "Review PRs on Friday"
  hive-memory createWorkflow deploy "Deploy to production" "build" "test" "push"
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveMemory };