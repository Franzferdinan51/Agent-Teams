#!/usr/bin/env node
/**
 * Hive Federation — Connect multiple AgentTeams instances
 * Like Mastodon federation but for AI agents
 * 
 * Each "federation" is an independent AgentTeams instance
 * Federations can share councilors, agents, resources
 * No central authority — peer-to-peer between federations
 */

const http = require('http');
const crypto = require('crypto');

const FEDERATION_PORT = 4200;
const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';

class FederationNode {
    constructor(options = {}) {
        this.federationId = options.federationId || this.generateId();
        this.federationName = options.federationName || 'Unnamed Federation';
        this.federationDescription = options.description || '';
        this.port = options.port || FEDERATION_PORT;
        
        this.peers = new Map(); // Other federations we know
        this.relays = new Set(); // Federation relays
        this.capabilities = new Map(); // What this fed shares
        this.councilors = new Set(); // Shared councilors
        this.server = null;
        
        console.log(`🏠 Federation: ${this.federationName}`);
        console.log(`   ID: ${this.federationId}`);
    }

    generateId() {
        return `fed-${crypto.randomBytes(4).toString('hex')}`;
    }

    // ═══════════════════════════════════════════════════════════
    // FEDERATION SERVER
    // ═══════════════════════════════════════════════════════════

    async start() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Fed-Id');
                
                if (req.method === 'OPTIONS') {
                    res.writeHead(200);
                    res.end();
                    return;
                }

                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => this.handleRequest(req.url, body, res));
            });

            this.server.on('error', reject);
            this.server.listen(this.port, () => {
                console.log(`✅ Federation server listening on port ${this.port}`);
                this.discoverPeers();
                resolve();
            });
        });
    }

    handleRequest(url, body, res) {
        try {
            const path = url.split('?')[0];
            
            switch (path) {
                case '/federation/info':
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(this.getInfo()));
                    break;

                case '/federation/capabilities':
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(this.getCapabilities()));
                    break;

                case '/federation/councilors':
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify([...this.councilors]));
                    break;

                case '/federation/discover':
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(this.getPeerList()));
                    break;

                case '/federation/join':
                    const joinData = JSON.parse(body || '{}');
                    this.handleJoin(joinData);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                    break;

                case '/federation/message':
                    const msg = JSON.parse(body || '{}');
                    this.handleMessage(msg);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                    break;

                case '/federation/delegate':
                    const delegate = JSON.parse(body || '{}');
                    this.handleDelegate(delegate);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                    break;

                default:
                    res.writeHead(404);
                    res.end('Not found');
            }
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // FEDERATION DISCOVERY
    // ═══════════════════════════════════════════════════════════

    async discoverPeers() {
        console.log('🔍 Discovering federation peers...');
        
        // Known federation relays
        const knownRelays = [
            { host: 'localhost', port: 4201 }, // Local relay for testing
        ];

        for (const relay of knownRelays) {
            try {
                await this.registerWithRelay(relay);
            } catch (err) {
                // Relay unavailable, that's ok
            }
        }
    }

    async registerWithRelay(relay) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                federationId: this.federationId,
                federationName: this.federationName,
                host: 'localhost',
                port: this.port,
                capabilities: [...this.capabilities.keys()],
                councilors: [...this.councilors],
                description: this.federationDescription
            });

            const options = {
                hostname: relay.host,
                port: relay.port,
                path: '/relay/register',
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
            };

            const req = http.request(options, (res) => {
                if (res.statusCode === 200) {
                    this.relays.add(`${relay.host}:${relay.port}`);
                    console.log(`✅ Connected to federation relay: ${relay.host}:${relay.port}`);
                    resolve();
                } else {
                    reject(new Error(`Failed: ${res.statusCode}`));
                }
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    async queryRelays() {
        for (const relayAddr of this.relays) {
            const [host, port] = relayAddr.split(':');
            
            try {
                const response = await this.httpGet(`http://${host}:${port}/federation/discover`);
                const peers = JSON.parse(response);
                
                for (const peer of peers) {
                    if (peer.federationId !== this.federationId) {
                        this.peers.set(peer.federationId, peer);
                    }
                }
            } catch (err) {
                // Relay unreachable
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // FEDERATION ACTIONS
    // ═══════════════════════════════════════════════════════════

    handleJoin(data) {
        const peer = {
            federationId: data.federationId,
            federationName: data.federationName,
            host: data.host,
            port: data.port,
            capabilities: data.capabilities || [],
            councilors: data.councilors || [],
            joinedAt: Date.now()
        };
        
        this.peers.set(data.federationId, peer);
        console.log(`🏠 Federation joined: ${data.federationName}`);
    }

    handleMessage(msg) {
        console.log(`📨 Federation message from ${msg.from}: ${msg.content.substring(0, 50)}...`);
        this.emit('message', msg);
    }

    handleDelegate(delegate) {
        console.log(`🎭 Delegate request from ${delegate.from}: "${delegate.task}"`);
        this.emit('delegate', delegate);
    }

    // ═══════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════

    shareCapability(capability, handler) {
        this.capabilities.set(capability, handler);
        console.log(`📤 Sharing capability: ${capability}`);
    }

    shareCouncilor(councilorName) {
        this.councilors.add(councilorName);
        console.log(`🏛️ Sharing councilor: ${councilorName}`);
    }

    async sendToFederation(federationId, message) {
        const peer = this.peers.get(federationId);
        if (!peer) {
            throw new Error(`Federation not found: ${federationId}`);
        }

        return this.httpPost(`http://${peer.host}:${peer.port}/federation/message`, {
            from: this.federationId,
            ...message
        });
    }

    async broadcast(message) {
        const payload = {
            from: this.federationId,
            ...message,
            timestamp: Date.now()
        };

        for (const peer of this.peers.values()) {
            try {
                await this.httpPost(`http://${peer.host}:${peer.port}/federation/message`, payload);
            } catch (err) {
                // Peer unreachable
            }
        }
    }

    async delegateTo(councilorName, task) {
        // Find federation that has this councilor
        for (const peer of this.peers.values()) {
            if (peer.councilors.includes(councilorName)) {
                return this.httpPost(`http://${peer.host}:${peer.port}/federation/delegate`, {
                    from: this.federationId,
                    councilorName,
                    task
                });
            }
        }
        
        throw new Error(`Councilor ${councilorName} not available in any federation`);
    }

    getInfo() {
        return {
            federationId: this.federationId,
            federationName: this.federationName,
            description: this.federationDescription,
            capabilities: [...this.capabilities.keys()],
            councilors: [...this.councilors],
            peers: this.peers.size
        };
    }

    getCapabilities() {
        return [...this.capabilities.entries()].map(([name, handler]) => ({
            name,
            shared: true
        }));
    }

    getPeerList() {
        return [...this.peers.values()].map(p => ({
            federationId: p.federationId,
            federationName: p.federationName,
            host: p.host,
            port: p.port,
            capabilities: p.capabilities,
            councilors: p.councilors
        }));
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════

    httpGet(url) {
        return new Promise((resolve, reject) => {
            http.get(url, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve(body));
            }).on('error', reject);
        });
    }

    httpPost(url, data) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify(data);
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 80,
                path: urlObj.pathname,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            };

            const req = http.request(options, (res) => {
                let response = '';
                res.on('data', chunk => response += chunk);
                res.on('end', () => resolve(response));
            });

            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }

    emit(event, data) {
        // Simple event emitter
    }

    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('✅ Federation stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    const mode = args[0];

    (async () => {
        let federation;

        switch (mode) {
            case 'start':
                federation = new FederationNode({
                    federationName: args[1] || 'My Federation',
                    description: args[2] || ''
                });
                await federation.start();
                
                // Share some default capabilities
                federation.shareCapability('research');
                federation.shareCapability('coding');
                federation.shareCouncilor('Botanist');
                federation.shareCouncilor('Meteorologist');
                
                console.log('\n🏠 Federation ready!');
                console.log(`   Share this ID with others: ${federation.federationId}`);
                break;

            case 'info':
                const info = await fetch(`http://localhost:${FEDERATION_PORT}/federation/info`);
                console.log(JSON.stringify(await info.json(), null, 2));
                break;

            case 'discover':
                const peers = await fetch(`http://localhost:${FEDERATION_PORT}/federation/discover`);
                const peerList = await peers.json();
                console.log(`\n🏠 Known Federations (${peerList.length}):\n`);
                peerList.forEach(p => {
                    console.log(`  • ${p.federationName}`);
                    console.log(`    ID: ${p.federationId}`);
                    console.log(`    Councilors: ${p.councilors.join(', ') || 'none'}`);
                    console.log('');
                });
                break;

            case 'councilors':
                const councilors = await fetch(`http://localhost:${FEDERATION_PORT}/federation/councilors`);
                console.log('🏛️ Shared Councilors:');
                console.log((await councilors.json()).join('\n  - '));
                break;

            default:
                console.log(`
🏠 Federation CLI v1.0.0

Usage:
  node hive-federation.js start [name] [description]
  node hive-federation.js info
  node hive-federation.js discover
  node hive-federation.js councilors

Example:
  node hive-federation.js start "My AI Lab" "Research-focused federation"
                `);
        }
    })();
}

module.exports = { FederationNode };
