#!/usr/bin/env node
/**
 * Hive Nation - Council Integration
 * 
 * Integrates with AI Council v3.1.0 for enhanced deliberation
 * - 46 councilors with diverse perspectives
 * - Live SSE streaming of deliberations
 * - 13 deliberation modes
 * - Multi-agent coordination
 */

const http = require('http');
const https = require('https');
const { EventEmitter } = require('events');

const COUNCIL_HOST = 'localhost';
const COUNCIL_PORT = 3006;
const COUNCIL_API = `http://${COUNCIL_HOST}:${COUNCIL_PORT}/api`;

// ═══════════════════════════════════════════════════════════════════
// Council Client
// ═══════════════════════════════════════════════════════════════════

class CouncilClient extends EventEmitter {
    constructor() {
        super();
        this.connected = false;
        this.councilors = [];
        this.session = null;
        this.events = [];
    }
    
    // Check if council is available
    async checkHealth() {
        try {
            const data = await this.apiGet('/health');
            this.connected = true;
            return data;
        } catch (e) {
            this.connected = false;
            return null;
        }
    }
    
    // Get all councilors
    async getCouncilors() {
        try {
            const data = await this.apiGet('/councilors');
            this.councilors = data.councilors || [];
            return this.councilors;
        } catch (e) {
            return [];
        }
    }
    
    // Start a new deliberation session
    async startSession(topic, mode = 'balanced') {
        try {
            const data = await this.apiPost('/session/start', {
                topic,
                mode,
                councilors: this.councilors.filter(c => c.enabled).slice(0, 10).map(c => c.id)
            });
            this.session = data.session;
            return data;
        } catch (e) {
            return { error: e.message };
        }
    }
    
    // Add event to session
    async addEvent(type, content) {
        if (!this.session) return { error: 'No active session' };
        try {
            return await this.apiPost('/session/event', {
                sessionId: this.session.id,
                type,
                content
            });
        } catch (e) {
            return { error: e.message };
        }
    }
    
    // Get session status
    async getSession() {
        try {
            const data = await this.apiGet('/session');
            this.session = data.session;
            return data;
        } catch (e) {
            return { session: null };
        }
    }
    
    // Get session messages
    async getMessages(limit = 50) {
        try {
            const data = await this.apiGet(`/session/messages?limit=${limit}`);
            return data.messages || [];
        } catch (e) {
            return [];
        }
    }
    
    // Clear session
    async clearSession() {
        try {
            return await this.apiPost('/session/clear', {});
        } catch (e) {
            return { error: e.message };
        }
    }
    
    // Get deliberation modes
    async getModes() {
        try {
            const data = await this.apiGet('/modes');
            return data.modes || [];
        } catch (e) {
            return [];
        }
    }
    
    // Connect to SSE stream
    connectSSE(callback) {
        const req = http.get(`${COUNCIL_API.replace('http://', '')}/events`, (res) => {
            res.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const event = JSON.parse(line.slice(6));
                            this.emit('event', event);
                            if (callback) callback(event);
                        } catch (e) {}
                    }
                }
            });
            res.on('end', () => {
                this.emit('disconnect');
            });
        });
        req.on('error', () => {
            this.emit('error', 'Connection failed');
        });
        return req;
    }
    
    // Helper: GET request
    apiGet(path) {
        return new Promise((resolve, reject) => {
            const req = http.get(`${COUNCIL_API}${path}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
        });
    }
    
    // Helper: POST request
    apiPost(path, body) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(body);
            const options = {
                hostname: COUNCIL_HOST,
                port: COUNCIL_PORT,
                path: `${COUNCIL_API.replace('http://localhost:3006', '')}${path}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };
            const req = http.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try { resolve(JSON.parse(responseData)); }
                    catch (e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
}

// ═══════════════════════════════════════════════════════════════════
// Hive-Council Bridge
// ═══════════════════════════════════════════════════════════════════

class HiveCouncilBridge {
    constructor() {
        this.client = new CouncilClient();
        this.integrations = [];
    }
    
    // Initialize bridge
    async init() {
        console.log('\n🧠 HIVE-COUNCIL BRIDGE v1.0 🧠\n'.padStart(50));
        
        // Check council connection
        const health = await this.client.checkHealth();
        if (health) {
            console.log('✅ Council connected (v' + (health.version || '3.x') + ')');
            const councilors = await this.client.getCouncilors();
            console.log(`📊 ${councilors.length} councilors available`);
            
            // Show councilor categories
            const roles = {};
            councilors.forEach(c => {
                roles[c.role] = (roles[c.role] || 0) + 1;
            });
            Object.entries(roles).forEach(([role, count]) => {
                console.log(`   ${role}: ${count}`);
            });
        } else {
            console.log('⚠️  Council not available (start with: node ~/Desktop/AI-Bot-Council-Concensus/server.js)');
        }
        
        console.log('');
        return this;
    }
    
    // Connect to live SSE stream
    watchDeliberations(callback) {
        return this.client.connectSSE(callback);
    }
    
    // Request council deliberation for a Hive decision
    async deliberate(topic, options = {}) {
        const mode = options.mode || 'balanced';
        const agents = options.agents || [];
        
        console.log(`\n⚖️  Requesting council deliberation...`);
        console.log(`   Topic: ${topic}`);
        console.log(`   Mode: ${mode}`);
        
        // Start council session
        const session = await this.client.startSession(topic, mode);
        if (session.error) {
            console.log(`   ❌ Council error: ${session.error}`);
            return { error: session.error };
        }
        
        // Add agent perspectives if provided
        for (const agent of agents) {
            await this.client.addEvent('agent', `${agent.name}: ${agent.perspective}`);
        }
        
        // Wait for deliberation
        await new Promise(r => setTimeout(r, 2000));
        
        // Get results
        const messages = await this.client.getMessages();
        
        console.log(`\n📋 Council deliberation complete (${messages.length} messages)\n`);
        
        return {
            session: session.session,
            messages,
            consensus: this.findConsensus(messages)
        };
    }
    
    // Find consensus in messages
    findConsensus(messages) {
        const stances = {};
        messages.forEach(m => {
            if (m.type === 'stance' || m.type === 'argument') {
                const text = (m.content || '').toLowerCase();
                if (text.includes('support') || text.includes('agree') || text.includes('yes')) {
                    stances.support = (stances.support || 0) + 1;
                } else if (text.includes('oppose') || text.includes('disagree') || text.includes('no')) {
                    stances.oppose = (stances.oppose || 0) + 1;
                } else {
                    stances.abstain = (stances.abstain || 0) + 1;
                }
            }
        });
        
        const total = stances.support + stances.oppose + stances.abstain;
        return {
            support: stances.support || 0,
            oppose: stances.oppose || 0,
            abstain: stances.abstain || 0,
            verdict: stances.support > stances.oppose ? 'APPROVED' : stances.oppose > stances.support ? 'REJECTED' : 'INCONCLUSIVE',
            supportPct: total > 0 ? Math.round((stances.support / total) * 100) : 0
        };
    }
    
    // Get councilor for specific role
    getCouncilor(role) {
        return this.client.councilors.find(c => c.role === role);
    }
    
    // Get all enabled councilors
    getEnabledCouncilors() {
        return this.client.councilors.filter(c => c.enabled);
    }
}

// ═══════════════════════════════════════════════════════════════════
// CLI Interface
// ═══════════════════════════════════════════════════════════════════

async function main() {
    const bridge = new HiveCouncilBridge();
    await bridge.init();
    
    const args = process.argv.slice(2);
    const cmd = args[0];
    
    if (cmd === 'watch') {
        console.log('👁️  Watching council deliberations...\n');
        bridge.watchDeliberations((event) => {
            console.log(`[${event.type || 'event'}] ${event.content || JSON.stringify(event)}`);
        });
    }
    else if (cmd === 'deliberate') {
        const topic = args.slice(1).join(' ') || 'What should we build next?';
        const result = await bridge.deliberate(topic);
        console.log('\n📊 CONSENSUS:', result.consensus);
    }
    else if (cmd === 'councilors') {
        const councilors = bridge.getEnabledCouncilors();
        console.log('\n📊 ENABLED COUNCILORS:\n');
        councilors.forEach(c => {
            console.log(`  ${c.role.padEnd(12)} ${c.name}`);
        });
    }
    else if (cmd === 'status') {
        const health = await bridge.client.checkHealth();
        console.log(`\n${health ? '✅' : '❌'} Council: ${health ? 'Connected' : 'Offline'}`);
        console.log(`📊 Councilors: ${bridge.client.councilors.length}`);
    }
    else {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           🧠 HIVE-COUNCIL BRIDGE 🧠                          ║
║   Integrate 46 AI Councilors into Hive Nation                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  COMMANDS:                                                       ║
║    status          Check council connection                       ║
║    councilors      List all enabled councilors                   ║
║    watch           Watch live deliberations (SSE)                ║
║    deliberate <topic>  Request council deliberation             ║
║                                                                  ║
║  INTEGRATION:                                                    ║
║    - 46 diverse councilors from AI Council v3.1               ║
║    - Live SSE streaming of deliberations                       ║
║    - 13 deliberation modes                                       ║
║    - Consensus finding for Hive decisions                       ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { CouncilClient, HiveCouncilBridge };
