#!/usr/bin/env node
/**
 * agent-teams v1.0.0 - Hive Mind Orchestrator
 * Coordinates multiple systems into a unified hive mind
 */

const http = require('http');
const WebSocket = require('ws');

const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';
const API_KEY = process.env.MESH_KEY || 'openclaw-mesh-default-key';
const WS_URL = MESH_URL.replace('http', 'ws') + '/ws';

class HiveMind {
    constructor() {
        this.systems = new Map();
        this.ws = null;
        this.connected = false;
    }

    async connect(systemName = 'hive-orchestrator') {
        console.log(`\n[HiveMind] 🧠 Connecting to mesh...`);

        // Register as orchestrator
        const resp = await this.fetch('/api/agents/register', {
            method: 'POST',
            body: {
                name: systemName,
                type: 'hive-orchestrator',
                version: '1.0.0',
                capabilities: ['orchestration', 'coordination', 'messaging', 'discovery']
            }
        });

        this.orchestratorId = resp.agentId;
        console.log(`[HiveMind] ✅ Orchestrator ID: ${this.orchestratorId}`);

        // Connect WebSocket for live coordination
        this.connectWebSocket();

        return this;
    }

    connectWebSocket() {
        this.ws = new WebSocket(WS_URL);

        this.ws.on('open', () => {
            console.log(`[HiveMind] 📡 WebSocket connected`);
            this.connected = true;

            // Register as orchestrator
            this.ws.send(JSON.stringify({
                type: 'register',
                role: 'orchestrator',
                agentId: this.orchestratorId
            }));

            // Subscribe to hive broadcasts
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                channel: 'hive'
            }));
        });

        this.ws.on('message', (data) => {
            const msg = JSON.parse(data);
            this.handleMessage(msg);
        });

        this.ws.on('close', () => {
            console.log(`[HiveMind] 🔌 WebSocket disconnected, reconnecting...`);
            this.connected = false;
            setTimeout(() => this.connectWebSocket(), 5000);
        });
    }

    handleMessage(msg) {
        console.log(`[HiveMind] 📩 ${msg.from || msg.type}: ${JSON.stringify(msg).substring(0, 100)}...`);

        if (msg.type === 'hive_announce') {
            // New system joined
            this.onSystemJoined(msg);
        } else if (msg.type === 'hive_broadcast') {
            // Cross-system broadcast
            this.onHiveBroadcast(msg);
        }
    }

    onSystemJoined(msg) {
        console.log(`[HiveMind] 🚀 System joined: ${msg.from}`);
        this.systems.set(msg.from, {
            name: msg.from,
            connectedAt: new Date(),
            capabilities: msg.capabilities || []
        });

        // Welcome message
        this.broadcast(`Welcome ${msg.from} to the hive mind!`);
    }

    onHiveBroadcast(msg) {
        console.log(`[HiveMind] 🌐 Hive broadcast from ${msg.from}: ${msg.content}`);
    }

    // ═══════════════════════════════════════════════════════════
    // SYSTEM MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    async registerSystem(name, type = 'agent', capabilities = []) {
        const resp = await this.fetch('/api/agents/register', {
            method: 'POST',
            body: {
                name,
                type,
                version: '1.0.0',
                capabilities,
                hive: true,
                mesh: true
            }
        });

        this.systems.set(name, {
            name,
            type,
            agentId: resp.agentId,
            capabilities,
            connectedAt: new Date()
        });

        console.log(`[HiveMind] ✅ Registered: ${name} (${type})`);

        // Announce to hive
        this.broadcast(`🌐 ${name} (${type}) connected to hive mind`);

        return resp;
    }

    async discoverSystems() {
        const agents = await this.fetch('/api/agents');
        return agents.map(a => ({
            name: a.name,
            type: a.type || 'agent',
            status: a.status,
            capabilities: a.capabilities || []
        }));
    }

    // ═══════════════════════════════════════════════════════════
    // COORDINATION
    // ═══════════════════════════════════════════════════════════

    broadcast(message) {
        if (this.ws && this.connected) {
            this.ws.send(JSON.stringify({
                type: 'hive_broadcast',
                from: this.orchestratorId,
                content: message,
                timestamp: Date.now()
            }));
        }
    }

    async sendTo(target, message) {
        await this.fetch('/api/messages', {
            method: 'POST',
            body: {
                type: 'message',
                from: this.orchestratorId,
                to: target,
                content: message,
                timestamp: Date.now(),
                hive: true
            }
        });
    }

    async coordinateTask(task, systems) {
        console.log(`\n[HiveMind] 🎯 Coordinating task across ${systems.length} systems`);

        // Assign subtasks to each system
        const assignments = [];
        for (let i = 0; i < systems.length; i++) {
            const system = systems[i];
            const subtask = this.splitTask(task, systems.length, i);

            console.log(`[HiveMind] → ${system}: ${subtask.description}`);

            await this.sendTo(system, JSON.stringify({
                type: 'task_assignment',
                task: subtask,
                taskId: task.id
            }));

            assignments.push({ system, subtask, status: 'assigned' });
        }

        return assignments;
    }

    splitTask(task, totalParts, partIndex) {
        // Split task into parts for parallel execution
        const steps = task.steps || [task.description];
        const partSize = Math.ceil(steps.length / totalParts);
        const start = partIndex * partSize;
        const end = Math.min(start + partSize, steps.length);

        return {
            ...task,
            description: steps.slice(start, end).join(', '),
            part: partIndex + 1,
            totalParts,
            steps: steps.slice(start, end)
        };
    }

    async aggregateResults(taskId) {
        console.log(`[HiveMind] 📊 Aggregating results for task ${taskId}`);

        // Collect results from all systems
        const messages = await this.fetch('/api/messages');

        const results = messages
            .filter(m => m.type === 'task_result' && m.taskId === taskId)
            .map(m => ({
                from: m.from,
                result: JSON.parse(m.content),
                timestamp: m.timestamp
            }));

        console.log(`[HiveMind] ✅ Collected ${results.length} results`);

        return this.synthesizeResults(results);
    }

    synthesizeResults(results) {
        // Simple synthesis - combine all results
        return {
            totalResults: results.length,
            results: results.map(r => r.result),
            synthesized: results.map(r => r.result).join('\n---\n'),
            timestamp: Date.now()
        };
    }

    // ═══════════════════════════════════════════════════════════
    // HIVE STATUS
    // ═══════════════════════════════════════════════════════════

    async status() {
        const systems = await this.discoverSystems();

        return {
            orchestrator: this.orchestratorId,
            connected: this.connected,
            systems: systems.length,
            systemList: systems,
            timestamp: Date.now()
        };
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

    disconnect() {
        if (this.ws) {
            this.ws.close();
            console.log(`[HiveMind] 🔌 Disconnected`);
        }
    }
}

// CLI
if (require.main === module) {
    const hive = new HiveMind();
    const command = process.argv[2];

    (async () => {
        switch (command) {
            case 'connect':
                await hive.connect(process.argv[3] || 'hive-orchestrator');
                console.log(await hive.status());
                break;

            case 'status':
                await hive.connect();
                console.log(JSON.stringify(await hive.status(), null, 2));
                break;

            case 'discover':
                await hive.connect();
                const systems = await hive.discoverSystems();
                console.log(`\n🧠 Hive Mind — ${systems.length} systems connected:\n`);
                systems.forEach(s => console.log(`  - ${s.name} (${s.type})`));
                break;

            case 'broadcast':
                await hive.connect();
                hive.broadcast(process.argv[3] || 'Hello from orchestrator!');
                break;

            case 'register':
                await hive.connect();
                await hive.registerSystem(process.argv[3], 'agent', ['coding', 'research']);
                break;

            default:
                console.log(`
HiveMind v1.0.0

Usage:
  node hive-mind.js connect [name]     Connect to mesh
  node hive-mind.js status            Show hive status
  node hive-mind.js discover          List connected systems
  node hive-mind.js broadcast [msg]   Send hive broadcast
  node hive-mind.js register [name]  Register new system

Environment:
  MESH_URL=http://localhost:4000
  MESH_KEY=openclaw-mesh-default-key
                `);
        }

        setTimeout(() => {
            hive.disconnect();
            process.exit(0);
        }, 1000);
    })();
}

module.exports = { HiveMind };