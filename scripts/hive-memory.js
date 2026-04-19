#!/usr/bin/env node
/**
 * Hive Shared Memory — Context sharing across all agents
 * Agents share state, context, and learnings via mesh
 */

const http = require('http');
const WebSocket = require('ws');

const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';
const API_KEY = process.env.MESH_KEY || 'openclaw-mesh-default-key';
const WS_URL = MESH_URL.replace('http', 'ws') + '/ws';

class SharedMemory {
    constructor(namespace = 'hive') {
        this.namespace = namespace;
        this.store = new Map();
        this.subscribers = new Map();
        this.ws = null;
        this.history = new Map();
        this.maxHistory = 100;
    }

    async connect() {
        this.connectWebSocket();
        await this.loadFromMesh();
        console.log(`🧠 Shared Memory ready — ${this.store.size} keys`);
    }

    connectWebSocket() {
        this.ws = new WebSocket(WS_URL);

        this.ws.on('open', () => {
            this.ws.send(JSON.stringify({ type: 'subscribe', channel: 'memory' }));
            console.log('📡 Connected to mesh for memory sync');
        });

        this.ws.on('message', (data) => {
            const msg = JSON.parse(data);
            this.handleMessage(msg);
        });
    }

    handleMessage(msg) {
        if (msg.type === 'memory_update') {
            this.store.set(msg.key, msg.value);
            console.log(`📥 Memory update from mesh: ${msg.key}`);
        }
        
        if (msg.type === 'memory_delete') {
            this.store.delete(msg.key);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // CORE OPERATIONS
    // ═══════════════════════════════════════════════════════════

    set(key, value, options = {}) {
        const fullKey = `${this.namespace}:${key}`;
        
        const entry = {
            key: fullKey,
            value,
            setBy: options.setBy || 'anonymous',
            setAt: Date.now(),
            ttl: options.ttl || 0,
            tags: options.tags || [],
            version: (this.store.get(fullKey)?.version || 0) + 1
        };

        this.store.set(fullKey, entry);
        this.addToHistory(fullKey, entry);

        // Broadcast to mesh
        this.broadcast({
            type: 'memory_update',
            key: fullKey,
            value: entry,
            operation: 'set'
        });

        console.log(`💾 SET ${fullKey}:`, JSON.stringify(value).substring(0, 50) + '...');

        return entry;
    }

    get(key) {
        const fullKey = `${this.namespace}:${key}`;
        const entry = this.store.get(fullKey);

        if (!entry) return null;

        // Check TTL
        if (entry.ttl && Date.now() > entry.setAt + entry.ttl) {
            this.delete(key);
            return null;
        }

        return entry.value;
    }

    delete(key) {
        const fullKey = `${this.namespace}:${key}`;
        this.store.delete(fullKey);

        this.broadcast({
            type: 'memory_delete',
            key: fullKey
        });

        console.log(`🗑️ DELETE ${fullKey}`);
    }

    has(key) {
        return this.store.has(`${this.namespace}:${key}`);
    }

    // ═══════════════════════════════════════════════════════════
    // ADVANCED
    // ═══════════════════════════════════════════════════════════

    setWithTags(key, value, tags) {
        return this.set(key, value, { tags });
    }

    getByTag(tag) {
        const results = [];
        for (const [key, entry] of this.store.entries()) {
            if (entry.tags?.includes(tag)) {
                results.push({ key, value: entry.value });
            }
        }
        return results;
    }

    search(query) {
        query = query.toLowerCase();
        const results = [];

        for (const [key, entry] of this.store.entries()) {
            const keyLower = key.toLowerCase();
            const valueStr = JSON.stringify(entry.value).toLowerCase();

            if (keyLower.includes(query) || valueStr.includes(query)) {
                results.push({
                    key: key.replace(`${this.namespace}:`, ''),
                    value: entry.value,
                    score: keyLower.includes(query) ? 2 : 1
                });
            }
        }

        return results.sort((a, b) => b.score - a.score);
    }

    // ═══════════════════════════════════════════════════════════
    // CONTEXT MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    setContext(agentName, context) {
        return this.set(`context:${agentName}`, context, {
            setBy: agentName,
            tags: ['context', agentName]
        });
    }

    getContext(agentName) {
        return this.get(`context:${agentName}`);
    }

    shareTask(task) {
        return this.set(`task:${task.id || Date.now()}`, {
            ...task,
            sharedAt: Date.now(),
            sharedBy: task.agent || 'anonymous'
        }, {
            tags: ['task', 'shared'],
            ttl: 3600000 // 1 hour
        });
    }

    getActiveTasks() {
        return this.getByTag('task');
    }

    setSharedState(key, value) {
        return this.set(`shared:${key}`, value, {
            tags: ['shared', 'state'],
            ttl: 86400000 // 24 hours
        });
    }

    getSharedState(key) {
        return this.get(`shared:${key}`);
    }

    // ═══════════════════════════════════════════════════════════
    // LEARNING
    // ═══════════════════════════════════════════════════════════

    recordLearning(agentName, learning) {
        return this.set(`learn:${agentName}:${Date.now()}`, {
            agent: agentName,
            learning,
            learnedAt: Date.now()
        }, {
            tags: ['learning', agentName],
            ttl: 604800000 // 7 days
        });
    }

    getRecentLearnings() {
        return this.search('learn:');
    }

    // ═══════════════════════════════════════════════════════════
    // HISTORY
    // ═══════════════════════════════════════════════════════════

    addToHistory(key, entry) {
        if (!this.history.has(key)) {
            this.history.set(key, []);
        }

        const hist = this.history.get(key);
        hist.push({ ...entry });

        if (hist.length > this.maxHistory) {
            hist.shift();
        }
    }

    getHistory(key) {
        return this.history.get(`${this.namespace}:${key}`) || [];
    }

    // ═══════════════════════════════════════════════════════════
    // MESH SYNC
    // ═══════════════════════════════════════════════════════════

    async loadFromMesh() {
        try {
            const agents = await this.fetch('/api/agents');
            console.log(`📥 Loaded ${agents.length} agents from mesh`);
        } catch (e) {
            console.log('⚠️ Could not load from mesh (mesh may be offline)');
        }
    }

    broadcast(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                ...message,
                namespace: this.namespace
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
        const keys = [...this.store.keys()];
        const stats = {
            total: keys.length,
            byNamespace: {},
            byTag: {}
        };

        for (const key of keys) {
            const entry = this.store.get(key);
            
            // By tag
            for (const tag of entry.tags || []) {
                stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
            }
        }

        return stats;
    }

    dump() {
        console.log('\n🧠 SHARED MEMORY DUMP\n');
        console.log('═'.repeat(60));

        for (const [key, entry] of this.store.entries()) {
            const shortKey = key.replace(`${this.namespace}:`, '');
            console.log(`📌 ${shortKey}`);
            console.log(`   Value: ${JSON.stringify(entry.value).substring(0, 80)}...`);
            console.log(`   Tags: ${entry.tags?.join(', ') || 'none'}`);
            console.log('');
        }

        console.log(`Total: ${this.store.size} entries`);
    }
}

// CLI
if (require.main === module) {
    const memory = new SharedMemory();
    const command = process.argv[2];

    (async () => {
        await memory.connect();

        switch (command) {
            case 'set':
                const key = process.argv[3];
                const value = JSON.parse(process.argv[4] || '{}');
                memory.set(key, value);
                break;

            case 'get':
                console.log(memory.get(process.argv[3]));
                break;

            case 'delete':
                memory.delete(process.argv[3]);
                break;

            case 'search':
                const results = memory.search(process.argv[3] || '');
                console.log(JSON.stringify(results, null, 2));
                break;

            case 'dump':
                memory.dump();
                break;

            case 'status':
                console.log(JSON.stringify(memory.status(), null, 2));
                break;

            case 'context':
                if (process.argv[3]) {
                    console.log(memory.setContext(process.argv[3], JSON.parse(process.argv[4] || '{}')));
                } else {
                    console.log(memory.status());
                }
                break;

            case 'learn':
                memory.recordLearning(process.argv[3], process.argv[4]);
                break;

            default:
                console.log(`
🧠 Shared Memory v1.0.0

Usage:
  node hive-memory.js set <key> <json-value>
  node hive-memory.js get <key>
  node hive-memory.js delete <key>
  node hive-memory.js search <query>
  node hive-memory.js dump
  node hive-memory.js status
  node hive-memory.js context <agent> [json-context]
  node hive-memory.js learn <agent> "learning text"

Examples:
  node hive-memory.js set current-task "Build API"
  node hive-memory.js get current-task
  node hive-memory.js search task
  node hive-memory.js context duck-cli '{"task":"coding"}'
  node hive-memory.js learn ai-council "Use shorter explanations"
                `);
        }

        setTimeout(() => process.exit(0), 1000);
    })();
}

module.exports = { SharedMemory };
