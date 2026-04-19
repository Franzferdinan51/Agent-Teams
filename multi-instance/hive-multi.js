#!/usr/bin/env node
/**
 * Hive Multi-Instance - Distributed System
 * 
 * Features:
 * - Distributed memory
 * - Master/agent topology
 * - Clipboard sync
 * - Centralized logs
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { execSync } = require('child_process');

class HiveMultiInstance {
    constructor() {
        this.dataDir = '/tmp/hive-multi';
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
        this.data = this.loadData();
        this.instanceId = `instance-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }

    loadData() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.dataDir, 'multi-data.json'), 'utf-8'));
        } catch { 
            return { 
                instances: [], 
                memories: [], 
                clipboardHistory: [],
                centralizedLogs: [],
                topology: 'standalone' // 'master', 'agent', 'standalone'
            }; 
        }
    }

    saveData() {
        fs.writeFileSync(path.join(this.dataDir, 'multi-data.json'), JSON.stringify(this.data, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // INSTANCE MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    registerInstance(role = 'standalone') {
        const instance = {
            id: this.instanceId,
            role, // 'master', 'agent', 'standalone'
            hostname: require('os').hostname(),
            platform: process.platform,
            createdAt: Date.now(),
            lastHeartbeat: Date.now(),
            status: 'online'
        };

        this.data.instances.push(instance);
        this.data.topology = role;
        this.saveData();

        console.log(`\n✓ Instance registered: ${this.instanceId}`);
        console.log(`  Role: ${role}`);
        console.log(`  Platform: ${instance.platform}`);

        return instance;
    }

    listInstances() {
        console.log('\n🌐 CONNECTED INSTANCES');
        console.log('═'.repeat(50));

        for (const inst of this.data.instances) {
            const ago = this.ageString(inst.lastHeartbeat);
            const status = inst.status === 'online' ? '🟢' : '🔴';
            console.log(`\n${status} ${inst.id}`);
            console.log(`   Role: ${inst.role}`);
            console.log(`   Host: ${inst.hostname}`);
            console.log(`   Platform: ${inst.platform}`);
            console.log(`   Last seen: ${ago}`);
        }
    }

    heartbeat() {
        const instance = this.data.instances.find(i => i.id === this.instanceId);
        if (instance) {
            instance.lastHeartbeat = Date.now();
            this.saveData();
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DISTRIBUTED MEMORY
    // ═══════════════════════════════════════════════════════════

    shareMemory(content, tags = [], sourceInstance = null) {
        const memory = {
            id: `MEM-${Date.now()}`,
            content,
            tags,
            sourceInstance: sourceInstance || this.instanceId,
            createdAt: Date.now(),
            accessCount: 0
        };

        this.data.memories.push(memory);
        this.saveData();

        console.log(`\n✓ Memory shared: ${content.substring(0, 50)}...`);
        console.log(`  From: ${memory.sourceInstance}`);

        return memory;
    }

    recallFromCluster(query, limit = 10) {
        const q = query.toLowerCase();
        const results = this.data.memories
            .filter(m => {
                const content = (m.content + ' ' + m.tags.join(' ')).toLowerCase();
                return q.split(' ').some(w => content.includes(w) && w.length > 2);
            })
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, limit);

        // Update access counts
        results.forEach(r => r.accessCount++);
        this.saveData();

        console.log(`\n📚 CLUSTER RECALL: "${query}"`);
        console.log('═'.repeat(50));
        console.log(`  Found: ${results.length} memories`);

        for (const r of results) {
            console.log(`\n  [${r.sourceInstance}] ${r.content.substring(0, 80)}...`);
            console.log(`     Tags: ${r.tags.join(', ')}`);
        }

        return results;
    }

    listClusterMemories() {
        console.log('\n🧠 CLUSTER MEMORIES');
        console.log('═'.repeat(50));

        for (const m of this.data.memories.slice(-20).reverse()) {
            const ago = this.ageString(m.createdAt);
            console.log(`\n[${ago}] [${m.sourceInstance}]`);
            console.log(`  ${m.content.substring(0, 100)}...`);
            console.log(`  Tags: ${m.tags.join(', ')}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // MASTER/AGENT TOPOLOGY
    // ═══════════════════════════════════════════════════════════

    setupMaster(port = 4141) {
        console.log(`\n🌟 Setting up as MASTER on port ${port}...`);

        const server = http.createServer((req, res) => {
            // CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

            const parsed = new URL(req.url, `http://localhost:${port}`);

            // Agent registration
            if (parsed.pathname === '/register' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    const agent = JSON.parse(body);
                    agent.lastHeartbeat = Date.now();
                    this.data.instances.push(agent);
                    this.saveData();
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, masterId: this.instanceId }));
                });
            }

            // Task distribution
            else if (parsed.pathname === '/task' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    const task = JSON.parse(body);
                    console.log(`\n📋 New task from master: ${task.description}`);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, taskId: task.id }));
                });
            }

            // Memory sync
            else if (parsed.pathname === '/sync' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    const memories = JSON.parse(body);
                    this.data.memories.push(...memories);
                    this.saveData();
                    res.writeHead(200);
                    res.end(JSON.stringify({ synced: memories.length }));
                });
            }

            // Health check
            else if (parsed.pathname === '/health') {
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'ok', instances: this.data.instances.length }));
            }

            else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        });

        server.listen(port, () => {
            console.log(`\n✅ Master running at http://localhost:${port}`);
            console.log('  Endpoints:');
            console.log('    POST /register - Agent registration');
            console.log('    POST /task - Task distribution');
            console.log('    POST /sync - Memory sync');
            console.log('    GET  /health - Health check');
        });

        // Start heartbeat
        setInterval(() => this.heartbeat(), 30000);

        return server;
    }

    setupAgent(masterUrl) {
        console.log(`\n🤖 Setting up as AGENT, connecting to ${masterUrl}...`);

        const register = () => {
            const agentData = {
                id: this.instanceId,
                role: 'agent',
                hostname: require('os').hostname(),
                platform: process.platform,
                createdAt: Date.now(),
                lastHeartbeat: Date.now(),
                status: 'online'
            };

            try {
                const postData = JSON.stringify(agentData);
                const url = new URL('/register', masterUrl);
                
                const options = {
                    hostname: url.hostname,
                    port: url.port || 80,
                    path: url.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const req = http.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        const response = JSON.parse(data);
                        if (response.success) {
                            console.log(`\n✅ Connected to master: ${response.masterId}`);
                        }
                    });
                });

                req.write(postData);
                req.end();
            } catch (e) {
                console.log(`  ⚠️ Could not connect to master: ${e.message}`);
            }
        };

        register();
        setInterval(register, 60000); // Re-register every minute

        // Start heartbeat
        setInterval(() => this.heartbeat(), 30000);
    }

    // ═══════════════════════════════════════════════════════════
    // CLIPBOARD SYNC
    // ═══════════════════════════════════════════════════════════

    syncClipboard(content) {
        const entry = {
            id: `CLIP-${Date.now()}`,
            content,
            instance: this.instanceId,
            timestamp: Date.now()
        };

        this.data.clipboardHistory.push(entry);
        
        // Keep only last 50 entries
        if (this.data.clipboardHistory.length > 50) {
            this.data.clipboardHistory = this.data.clipboardHistory.slice(-50);
        }
        
        this.saveData();

        console.log(`\n✓ Clipboard synced: "${content.substring(0, 50)}..."`);

        return entry;
    }

    getClipboardHistory(limit = 20) {
        const entries = this.data.clipboardHistory.slice(-limit).reverse();
        
        console.log('\n📋 CLIPBOARD HISTORY');
        console.log('═'.repeat(50));

        for (const e of entries) {
            const ago = this.ageString(e.timestamp);
            console.log(`\n[${ago}] [${e.instance}]`);
            console.log(`  ${e.content.substring(0, 100)}`);
        }

        return entries;
    }

    // ═══════════════════════════════════════════════════════════
    // CENTRALIZED LOGS
    // ═══════════════════════════════════════════════════════════

    log(entry) {
        const logEntry = {
            id: `LOG-${Date.now()}`,
            instance: this.instanceId,
            level: entry.level || 'info',
            message: entry.message,
            data: entry.data,
            timestamp: Date.now()
        };

        this.data.centralizedLogs.push(logEntry);

        // Keep only last 1000 logs
        if (this.data.centralizedLogs.length > 1000) {
            this.data.centralizedLogs = this.data.centralizedLogs.slice(-1000);
        }

        this.saveData();

        const icon = logEntry.level === 'error' ? '❌' : logEntry.level === 'warn' ? '⚠️' : '📝';
        console.log(`${icon} [${logEntry.level}] ${logEntry.message}`);

        return logEntry;
    }

    queryLogs(query = '', level = null, limit = 50) {
        let logs = this.data.centralizedLogs;

        if (level) {
            logs = logs.filter(l => l.level === level);
        }

        if (query) {
            const q = query.toLowerCase();
            logs = logs.filter(l => l.message.toLowerCase().includes(q));
        }

        logs = logs.slice(-limit).reverse();

        console.log(`\n📜 LOGS (${logs.length} entries)`);
        console.log('═'.repeat(50));

        for (const l of logs) {
            const ago = this.ageString(l.timestamp);
            const icon = l.level === 'error' ? '❌' : l.level === 'warn' ? '⚠️' : '📝';
            console.log(`\n${icon} [${ago}] [${l.instance}] ${l.message}`);
        }

        return logs;
    }

    ageString(ts) {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        console.log('\n' + '═'.repeat(50));
        console.log('🌐 HIVE MULTI-INSTANCE DASHBOARD');
        console.log('═'.repeat(50));

        console.log('\n📍 THIS INSTANCE:');
        console.log(`   ID: ${this.instanceId}`);
        console.log(`   Role: ${this.data.topology}`);

        console.log('\n🌐 CONNECTED:');
        console.log(`   Instances: ${this.data.instances.length}`);
        console.log(`   Memories: ${this.data.memories.length}`);
        console.log(`   Clipboard: ${this.data.clipboardHistory.length}`);
        console.log(`   Logs: ${this.data.centralizedLogs.length}`);

        console.log('\n📊 TOPOLOGY:');
        const masters = this.data.instances.filter(i => i.role === 'master').length;
        const agents = this.data.instances.filter(i => i.role === 'agent').length;
        console.log(`   Masters: ${masters}`);
        console.log(`   Agents: ${agents}`);
    }
}

// CLI
const multi = new HiveMultiInstance();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    // Instance
    register: () => multi.registerInstance(args[0] || 'standalone'),
    instances: () => multi.listInstances(),
    heartbeat: () => multi.heartbeat(),

    // Memory
    share: () => multi.shareMemory(args.join(' ')),
    recall: () => multi.recallFromCluster(args.join(' ')),
    memories: () => multi.listClusterMemories(),

    // Topology
    master: () => multi.setupMaster(parseInt(args[0]) || 4141),
    agent: () => multi.setupAgent(args[0]),
    connect: () => multi.setupAgent(args[0]),

    // Clipboard
    clipboardSync: () => multi.syncClipboard(args.join(' ')),
    clipboard: () => multi.getClipboardHistory(parseInt(args[0]) || 20),

    // Logs
    log: () => multi.log({ level: args[0] || 'info', message: args.slice(1).join(' ') }),
    logs: () => multi.queryLogs(args[0], args[1], parseInt(args[2]) || 50),

    // Dashboard
    dashboard: () => multi.dashboard(),

    help: () => console.log(`
HIVE MULTI-INSTANCE

  Instance:
    register [role]       Register as master/agent/standalone
    instances             List connected instances
    heartbeat             Send heartbeat

  Distributed Memory:
    share <content>       Share memory across cluster
    recall <query>        Recall from cluster
    memories              List cluster memories

  Topology:
    master [port]        Start as master (default 4141)
    agent <masterUrl>      Connect as agent to master
    connect <masterUrl>   Connect as agent

  Clipboard:
    clipboardSync <text>  Sync clipboard content
    clipboard [n]         View clipboard history (default 20)

  Logs:
    log [level] <message>  Log entry (info/warn/error)
    logs [query] [level] [n]  Query logs

  Dashboard:
    dashboard              Multi-instance dashboard
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveMultiInstance };