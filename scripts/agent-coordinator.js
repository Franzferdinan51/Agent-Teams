#!/usr/bin/env node
/**
 * Agent Coordinator — Intelligent Sub-Agent Management
 * 
 * Prevents agent spam by:
 * - Batching similar tasks into single runs
 * - Coordinating agents via mesh before spawning
 * - Limiting concurrent sub-agents
 * - Prioritizing and queueing tasks
 * - Resource-aware spawning
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
    maxConcurrentAgents: 5,
    maxAgentsPerTask: 3,
    batchTimeout: 5000, // 5 seconds to batch similar tasks
    meshUrl: process.env.MESH_URL || 'http://localhost:4000',
    stateFile: '/tmp/agent-coordinator/state.json'
};

class AgentCoordinator {
    constructor(options = {}) {
        this.maxConcurrent = options.maxConcurrent || CONFIG.maxConcurrentAgents;
        this.maxPerTask = options.maxPerTask || CONFIG.maxAgentsPerTask;
        this.batchTimeout = options.batchTimeout || CONFIG.batchTimeout;
        
        this.state = this.loadState();
        this.activeAgents = new Map();
        this.taskQueue = [];
        this.batchQueue = new Map(); // task type -> [tasks]
        
        console.log('🤖 Agent Coordinator initialized');
        console.log(`   Max concurrent: ${this.maxConcurrent}`);
        console.log(`   Max per task: ${this.maxPerTask}`);
    }

    // ═══════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════

    loadState() {
        try {
            if (fs.existsSync(CONFIG.stateFile)) {
                return JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf-8'));
            }
        } catch (err) {}
        
        return {
            totalSpawned: 0,
            totalCompleted: 0,
            totalBatched: 0,
            activeCount: 0,
            recentTasks: [],
            efficiency: []
        };
    }

    saveState() {
        const dir = path.dirname(CONFIG.stateFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG.stateFile, JSON.stringify(this.state, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // COORDINATION RULES
    // ═══════════════════════════════════════════════════════════

    /**
     * Determine if we should spawn new agents or batch
     */
    shouldBatch(task) {
        // If we're at capacity, batch
        if (this.activeAgents.size >= this.maxConcurrent) {
            return { batch: true, reason: 'at_capacity' };
        }
        
        // If task is batchable (same type), try to batch
        if (this.isBatchable(task)) {
            const batchKey = this.getBatchKey(task);
            const existing = this.batchQueue.get(batchKey);
            
            if (existing && existing.length < this.maxPerTask) {
                return { batch: true, reason: 'batchable', key: batchKey };
            }
        }
        
        return { batch: false, reason: 'spawn_now' };
    }

    isBatchable(task) {
        const batchable = [
            'research', 'search', 'analyze',
            'write', 'edit', 'review',
            'test', 'check', 'scan',
            'read', 'fetch', 'get'
        ];
        
        const cmd = task.command?.toLowerCase() || '';
        return batchable.some(b => cmd.includes(b));
    }

    getBatchKey(task) {
        // Group by task type
        const cmd = (task.command || task.type || 'default').toLowerCase();
        
        if (cmd.includes('research') || cmd.includes('search')) return 'research';
        if (cmd.includes('write') || cmd.includes('edit')) return 'write';
        if (cmd.includes('test')) return 'test';
        if (cmd.includes('review') || cmd.includes('scan')) return 'review';
        if (cmd.includes('read') || cmd.includes('fetch')) return 'read';
        
        return `task_${Date.now()}`; // Unique for non-batchable
    }

    // ═══════════════════════════════════════════════════════════
    // BATCHING LOGIC
    // ═══════════════════════════════════════════════════════════

    /**
     * Add task to batch queue
     */
    addToBatch(task) {
        const key = this.getBatchKey(task);
        
        if (!this.batchQueue.has(key)) {
            this.batchQueue.set(key, []);
        }
        
        const batch = this.batchQueue.get(key);
        batch.push({
            ...task,
            addedAt: Date.now()
        });
        
        console.log(`📦 Added to batch '${key}': ${task.description || task.command}`);
        console.log(`   Batch size: ${batch.length}/${this.maxPerTask}`);
        
        // Auto-flush if batch is full
        if (batch.length >= this.maxPerTask) {
            this.flushBatch(key);
        }
        
        // Schedule flush timeout
        setTimeout(() => this.flushBatch(key), this.batchTimeout);
    }

    /**
     * Flush a batch and spawn coordinated agents
     */
    async flushBatch(key) {
        const batch = this.batchQueue.get(key);
        if (!batch || batch.length === 0) return;
        
        this.batchQueue.delete(key);
        this.state.totalBatched += batch.length;
        
        console.log(`\n🚀 FLUSHING BATCH '${key}' (${batch.length} tasks)`);
        
        if (batch.length === 1) {
            // Single task, spawn normally
            await this.spawnAgent(batch[0]);
        } else {
            // Multiple tasks, coordinate in single agent run
            await this.spawnCoordinatedAgents(key, batch);
        }
    }

    /**
     * Spawn multiple tasks coordinated in ONE agent run
     */
    async spawnCoordinatedAgents(batchKey, tasks) {
        const combinedTask = tasks.map((t, i) => 
            `${i + 1}. ${t.description || t.command}`
        ).join('\n');
        
        console.log(`\n🤝 Spawning COORDINATED agent for ${tasks.length} tasks`);
        console.log(`   Tasks:\n${combinedTask.split('\n').map(l => '      ' + l).join('\n')}`);
        
        // Spawn single agent with all tasks
        const result = await this.spawnAgent({
            type: batchKey,
            command: combinedTask,
            description: `Coordinated ${batchKey} for ${tasks.length} tasks`,
            tasks: tasks.length,
            coordinated: true
        });
        
        return result;
    }

    // ═══════════════════════════════════════════════════════════
    // AGENT SPAWNING
    // ═══════════════════════════════════════════════════════════

    /**
     * Spawn an agent (with coordination logic)
     */
    async spawn(task, options = {}) {
        const decision = this.shouldBatch(task);
        
        if (decision.batch) {
            if (decision.key) {
                this.addToBatch(task);
                return { status: 'batched', key: decision.key };
            }
            // At capacity but not batchable
            this.queueTask(task);
            return { status: 'queued', reason: decision.reason };
        }
        
        return this.spawnAgent(task, options);
    }

    /**
     * Actually spawn an agent
     */
    async spawnAgent(task, options = {}) {
        const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`\n🤖 Spawning agent: ${agentId}`);
        console.log(`   Type: ${task.type || 'general'}`);
        console.log(`   Task: ${task.description || task.command?.substring(0, 50)}...`);
        
        // Track active agent
        this.activeAgents.set(agentId, {
            id: agentId,
            task: task,
            started: Date.now(),
            status: 'running'
        });
        
        this.state.totalSpawned++;
        this.state.activeCount = this.activeAgents.size;
        
        // Simulate agent work (in real implementation, would spawn actual agent)
        // For now, just track the spawn
        setTimeout(() => this.completeAgent(agentId), Math.random() * 3000 + 1000);
        
        this.saveState();
        
        return {
            status: 'spawned',
            agentId,
            task: task.description || task.command
        };
    }

    /**
     * Complete an agent
     */
    completeAgent(agentId) {
        const agent = this.activeAgents.get(agentId);
        if (!agent) return;
        
        agent.status = 'completed';
        agent.completed = Date.now();
        agent.duration = agent.completed - agent.started;
        
        this.activeAgents.delete(agentId);
        this.state.totalCompleted++;
        this.state.activeCount = this.activeAgents.size;
        
        // Calculate efficiency
        const efficiency = agent.duration / (agent.task.tasks || 1);
        this.state.efficiency.push(efficiency);
        if (this.state.efficiency.length > 100) {
            this.state.efficiency = this.state.efficiency.slice(-100);
        }
        
        console.log(`✅ Agent completed: ${agentId} (${agent.duration}ms)`);
        
        // Process queue
        this.processQueue();
        
        this.saveState();
    }

    // ═══════════════════════════════════════════════════════════
    // QUEUE MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    queueTask(task) {
        this.taskQueue.push({
            ...task,
            queuedAt: Date.now(),
            priority: task.priority || 5
        });
        
        // Sort by priority (lower = higher priority)
        this.taskQueue.sort((a, b) => a.priority - b.priority);
        
        console.log(`⏳ Task queued (${this.taskQueue.length} in queue)`);
    }

    processQueue() {
        if (this.taskQueue.length === 0) return;
        if (this.activeAgents.size >= this.maxConcurrent) return;
        
        const task = this.taskQueue.shift();
        console.log(`\n📤 Processing queued task: ${task.description || task.command}`);
        
        this.spawnAgent(task);
    }

    // ═══════════════════════════════════════════════════════════
    // COORDINATION VIA MESH
    // ═══════════════════════════════════════════════════════════

    /**
     * Check mesh for other agents before spawning
     */
    async checkMesh() {
        try {
            const response = await fetch(`${CONFIG.meshUrl}/api/agents`);
            const data = await response.json();
            
            return {
                activeAgents: data.agents?.length || 0,
                capabilities: data.capabilities || []
            };
        } catch (err) {
            return { activeAgents: 0, capabilities: [], error: err.message };
        }
    }

    /**
     * Broadcast coordination message
     */
    async broadcastCoordination(message) {
        try {
            await fetch(`${CONFIG.meshUrl}/api/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'coordination',
                    ...message,
                    timestamp: Date.now()
                })
            });
        } catch (err) {
            console.log(`   (Mesh broadcast failed: ${err.message})`);
        }
    }

    /**
     * Decide if we should spawn or delegate to existing agent
     */
    async shouldDelegate(task) {
        const mesh = await this.checkMesh();
        
        // If mesh has agents with matching capability, consider delegation
        if (mesh.activeAgents > 0) {
            const matching = mesh.capabilities.filter(c => 
                task.type?.includes(c) || task.command?.includes(c)
            );
            
            if (matching.length > 0 && Math.random() > 0.7) {
                return { delegate: true, reason: 'mesh_available' };
            }
        }
        
        return { delegate: false, reason: 'spawn_new' };
    }

    // ═══════════════════════════════════════════════════════════
    // RULES ENGINE
    // ═══════════════════════════════════════════════════════════

    /**
     * Get coordination rules for task type
     */
    getRulesForTask(taskType) {
        const rules = {
            research: {
                maxAgents: 3,
                batchSimilar: true,
                checkCache: true,
                delegateToMesh: true
            },
            coding: {
                maxAgents: 2,
                batchSimilar: false,
                checkCache: false,
                delegateToMesh: false
            },
            review: {
                maxAgents: 2,
                batchSimilar: true,
                checkCache: true,
                delegateToMesh: false
            },
            test: {
                maxAgents: 3,
                batchSimilar: true,
                checkCache: false,
                delegateToMesh: false
            },
            default: {
                maxAgents: 2,
                batchSimilar: true,
                checkCache: false,
                delegateToMesh: false
            }
        };
        
        return rules[taskType] || rules.default;
    }

    /**
     * Apply coordination rules before spawning
     */
    async applyRules(task) {
        const rules = this.getRulesForTask(task.type);
        
        console.log(`\n📋 Applying rules for '${task.type}':`);
        console.log(`   Max agents: ${rules.maxAgents}`);
        console.log(`   Batch similar: ${rules.batchSimilar}`);
        
        // Check if we're exceeding limits
        const typeCount = [...this.activeAgents.values()]
            .filter(a => a.task.type === task.type).length;
        
        if (typeCount >= rules.maxAgents) {
            console.log(`   ⚠️ Type limit reached (${typeCount}/${rules.maxAgents})`);
            
            if (rules.batchSimilar) {
                return { action: 'batch', reason: 'type_limit' };
            } else {
                return { action: 'queue', reason: 'type_limit' };
            }
        }
        
        // Check mesh for delegation
        if (rules.delegateToMesh) {
            const decision = await this.shouldDelegate(task);
            if (decision.delegate) {
                return { action: 'delegate', reason: decision.reason };
            }
        }
        
        return { action: 'spawn', reason: 'normal' };
    }

    // ═══════════════════════════════════════════════════════════
    // STATUS & STATS
    // ═══════════════════════════════════════════════════════════

    status() {
        console.log('\n🤖 AGENT COORDINATOR STATUS\n');
        
        console.log(`📊 Statistics:`);
        console.log(`   Total spawned: ${this.state.totalSpawned}`);
        console.log(`   Total completed: ${this.state.totalCompleted}`);
        console.log(`   Total batched: ${this.state.totalBatched}`);
        console.log(`   Active: ${this.activeAgents.size}/${this.maxConcurrent}`);
        
        const avgEfficiency = this.state.efficiency.length > 0
            ? Math.round(this.state.efficiency.reduce((a, b) => a + b, 0) / this.state.efficiency.length)
            : 0;
        console.log(`   Avg efficiency: ${avgEfficiency}ms/task`);
        
        const batchRate = this.state.totalSpawned > 0
            ? Math.round((1 - this.state.totalSpawned / (this.state.totalSpawned + this.state.totalBatched)) * 100)
            : 0;
        console.log(`   Batch rate: ${batchRate}%`);
        
        console.log(`\n📦 Batch queue:`);
        if (this.batchQueue.size === 0) {
            console.log('   (empty)');
        } else {
            for (const [key, batch] of this.batchQueue) {
                console.log(`   ${key}: ${batch.length} tasks`);
            }
        }
        
        console.log(`\n⏳ Task queue: ${this.taskQueue.length}`);
        
        console.log(`\n🤖 Active agents:`);
        if (this.activeAgents.size === 0) {
            console.log('   (none)');
        } else {
            for (const [id, agent] of this.activeAgents) {
                const elapsed = Math.round((Date.now() - agent.started) / 1000);
                console.log(`   ${id}: ${agent.task.type} (${elapsed}s)`);
            }
        }
    }

    /**
     * Get recommendations for better coordination
     */
    recommendations() {
        const recs = [];
        
        if (this.activeAgents.size >= this.maxConcurrent) {
            recs.push('⚠️ At capacity - consider queuing tasks');
        }
        
        if (this.taskQueue.length > 10) {
            recs.push(`📋 Large queue (${this.taskQueue.length}) - may need more agents`);
        }
        
        const batchSize = [...this.batchQueue.values()].reduce((sum, b) => sum + b.length, 0);
        if (batchSize > 20) {
            recs.push(`📦 Large batches pending - flushing may take time`);
        }
        
        const avgEff = this.state.efficiency.length > 0
            ? this.state.efficiency.reduce((a, b) => a + b, 0) / this.state.efficiency.length
            : 0;
        if (avgEff > 5000) {
            recs.push(`⚡ Avg task time high (${Math.round(avgEff)}ms) - consider optimization`);
        }
        
        if (recs.length === 0) {
            recs.push('✅ Coordination looks healthy');
        }
        
        return recs;
    }
}

// CLI
const coordinator = new AgentCoordinator();
const cmd = process.argv[2];

const commands = {
    status: () => coordinator.status(),
    stats: () => coordinator.status(),
    
    spawn: async () => {
        const task = {
            type: process.argv[3] || 'default',
            command: process.argv.slice(4).join(' ') || 'generic task',
            description: process.argv.slice(4).join(' ') || 'generic task'
        };
        const result = await coordinator.spawn(task);
        console.log('\n📤 Result:', JSON.stringify(result, null, 2));
    },
    
    batch: async () => {
        const count = parseInt(process.argv[3]) || 5;
        console.log(`\n📦 Spawning ${count} batchable tasks...`);
        
        for (let i = 0; i < count; i++) {
            await coordinator.spawn({
                type: 'research',
                command: `research task ${i}`,
                description: `Research task #${i}`
            });
        }
        
        console.log('\n⏳ Waiting for batch flush...');
        await new Promise(r => setTimeout(r, 6000));
        coordinator.status();
    },
    
    stress: async () => {
        console.log('\n🔥 Stress test - spawning 20 tasks rapidly...');
        
        for (let i = 0; i < 20; i++) {
            coordinator.spawn({
                type: ['research', 'coding', 'review', 'test'][i % 4],
                command: `task ${i}`,
                description: `Task #${i}`
            });
        }
        
        console.log('\n⏳ Waiting for processing...');
        await new Promise(r => setTimeout(r, 10000));
        coordinator.status();
    },
    
    rules: () => {
        console.log('\n📋 Coordination Rules:\n');
        console.log('research: maxAgents=3, batchSimilar=true, checkCache=true');
        console.log('coding:   maxAgents=2, batchSimilar=false, checkCache=false');
        console.log('review:   maxAgents=2, batchSimilar=true, checkCache=true');
        console.log('test:     maxAgents=3, batchSimilar=true, checkCache=false');
        console.log('default:  maxAgents=2, batchSimilar=true');
    },
    
    recs: () => {
        console.log('\n💡 Recommendations:\n');
        coordinator.recommendations().forEach(r => console.log('   ' + r));
    },
    
    help: () => console.log(`
🤖 Agent Coordinator CLI

  status              Show coordinator status
  spawn <type> <task> Spawn a single agent
  batch <count>       Spawn batchable tasks
  stress              Stress test (20 rapid tasks)
  rules               Show coordination rules
  recs                Get recommendations
`)
};

if (commands[cmd]) {
    commands[cmd]();
} else {
    commands.help();
}

module.exports = { AgentCoordinator };
