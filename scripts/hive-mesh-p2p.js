#!/usr/bin/env node
/**
 * HiveMesh P2P — Decentralized Agent Mesh
 * Peer-to-peer communication without central server
 * Inspired by BitChat's distributed model
 * 
 * Architecture:
 * - Agents discover each other via mDNS/Bonjour (local) or relay (remote)
 * - Direct WebSocket connections between peers
 * - Gossip protocol for message propagation
 * - No blockchain, no central server
 */

const http = require('http');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const DEFAULT_PORT = 4100;
const RELAY_PORT = 4101;

class HiveMeshNode extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.nodeId = options.nodeId || this.generateNodeId();
        this.port = options.port || DEFAULT_PORT;
        this.relayPort = options.relayPort || RELAY_PORT;
        this.peers = new Map(); // connected peers
        this.relays = new Map(); // relay servers
        this.discoveryServers = []; // known discovery servers
        this.messageHistory = new Map(); // message cache
        this.maxHistory = 1000;
        
        this.server = null;
        this.isRelay = options.isRelay || false;
        
        // Simple encryption key (for demo - use proper crypto in production)
        this.encryptionKey = crypto.randomBytes(32);
        
        console.log(`🕸️ HiveMesh Node: ${this.nodeId}`);
        console.log(`   Mode: ${this.isRelay ? 'Relay' : 'Peer'}`);
        console.log(`   Port: ${this.port}`);
    }

    generateNodeId() {
        return `node-${crypto.randomBytes(4).toString('hex')}-${Date.now()}`;
    }

    // ═══════════════════════════════════════════════════════════
    // NETWORK LAYER
    // ═══════════════════════════════════════════════════════════

    async start() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => this.handleRequest(req, res));
            
            this.server.on('error', (err) => {
                console.error(`❌ Server error: ${err.message}`);
                reject(err);
            });

            this.server.listen(this.port, () => {
                console.log(`✅ HiveMesh listening on port ${this.port}`);
                this.startPeerDiscovery();
                resolve();
            });
        });
    }

    handleRequest(req, res) {
        // CORS headers for cross-origin requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Peer-Id, X-Message-Type');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            this.handleMessage(req.url, body, req.headers, res);
        });
    }

    async handleMessage(url, body, headers, res) {
        try {
            const path = url.split('?')[0];
            
            switch (path) {
                case '/ping':
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        type: 'pong', 
                        nodeId: this.nodeId,
                        peers: this.peers.size,
                        timestamp: Date.now()
                    }));
                    break;

                case '/peer/announce':
                    // A peer announces itself
                    const announce = JSON.parse(body || '{}');
                    await this.handlePeerAnnounce(announce, headers, res);
                    break;

                case '/peer/discover':
                    // Get list of known peers
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        peers: [...this.peers.values()],
                        relays: [...this.relays.values()]
                    }));
                    break;

                case '/relay/register':
                    // Register as a relay
                    const relayInfo = JSON.parse(body || '{}');
                    this.relays.set(relayInfo.nodeId, relayInfo);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                    break;

                case '/message/broadcast':
                    // Broadcast a message
                    const broadcast = JSON.parse(body || '{}');
                    await this.handleBroadcast(broadcast, res);
                    break;

                case '/message/send':
                    // Send to specific peer
                    const send = JSON.parse(body || '{}');
                    await this.handleDirectMessage(send, res);
                    break;

                case '/message/history':
                    // Get message history
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify([...this.messageHistory.values()]));
                    break;

                default:
                    res.writeHead(404);
                    res.end('Not found');
            }
        } catch (err) {
            console.error(`❌ Handle error: ${err.message}`);
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PEER DISCOVERY
    // ═══════════════════════════════════════════════════════════

    startPeerDiscovery() {
        console.log('🔍 Starting peer discovery...');
        
        // In production, use:
        // 1. mDNS/Bonjour for local network
        // 2. Known relay servers for remote peers
        // 3. DHT for decentralized discovery
        
        // For now, connect to known relays
        this.connectToRelays();
    }

    async connectToRelays() {
        // Connect to known relay servers
        const knownRelays = [
            { host: 'localhost', port: this.relayPort }
        ];

        for (const relay of knownRelays) {
            try {
                await this.registerWithRelay(relay);
            } catch (err) {
                console.log(`⚠️ Relay ${relay.host}:${relay.port} unavailable`);
            }
        }
    }

    async registerWithRelay(relay) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                nodeId: this.nodeId,
                host: 'localhost',
                port: this.port,
                capabilities: ['messaging', 'discovery', 'relay'],
                isRelay: this.isRelay
            });

            const options = {
                hostname: relay.host,
                port: relay.port,
                path: '/relay/register',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data)
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        this.relays.set(`${relay.host}:${relay.port}`, relay);
                        console.log(`✅ Connected to relay: ${relay.host}:${relay.port}`);
                        resolve();
                    } else {
                        reject(new Error(`Failed: ${res.statusCode}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    async discoverPeers() {
        // Query relays for known peers
        for (const relay of this.relays.values()) {
            try {
                const response = await this.httpGet(`http://${relay.host}:${relay.port}/peer/discover`);
                const data = JSON.parse(response);
                
                for (const peer of data.peers) {
                    if (peer.nodeId !== this.nodeId && !this.peers.has(peer.nodeId)) {
                        await this.connectToPeer(peer);
                    }
                }
            } catch (err) {
                // Relay unavailable
            }
        }
    }

    async connectToPeer(peer) {
        if (this.peers.has(peer.nodeId)) return;
        
        console.log(`🔗 Connecting to peer: ${peer.nodeId}`);
        
        // In production, establish WebSocket connection
        // For demo, we track the peer info
        this.peers.set(peer.nodeId, {
            ...peer,
            connectedAt: Date.now(),
            lastSeen: Date.now()
        });

        this.emit('peer:connected', peer);
        console.log(`✅ Peer connected: ${peer.nodeId} (${this.peers.size} total)`);
    }

    // ═══════════════════════════════════════════════════════════
    // MESSAGING
    // ═══════════════════════════════════════════════════════════

    async handlePeerAnnounce(data, headers, res) {
        const peerInfo = {
            nodeId: data.nodeId,
            host: data.host,
            port: data.port,
            capabilities: data.capabilities || [],
            announcedAt: Date.now()
        };

        await this.connectToPeer(peerInfo);
        
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
    }

    async handleBroadcast(data, res) {
        const message = {
            id: crypto.randomBytes(16).toString('hex'),
            from: this.nodeId,
            type: data.type || 'broadcast',
            content: data.content,
            timestamp: Date.now(),
            ttl: data.ttl || 3 // hops remaining
        };

        // Store in history
        this.messageHistory.set(message.id, message);
        this.trimHistory();

        // Emit event
        this.emit('message', message);

        // Propagate to peers (gossip)
        if (message.ttl > 0) {
            await this.gossip(message);
        }

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, messageId: message.id }));
    }

    async handleDirectMessage(data, res) {
        const message = {
            id: crypto.randomBytes(16).toString('hex'),
            from: this.nodeId,
            to: data.to,
            type: 'direct',
            content: data.content,
            timestamp: Date.now()
        };

        this.messageHistory.set(message.id, message);
        this.emit('message:direct', message);

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, messageId: message.id }));
    }

    async gossip(message) {
        // Propagate message to all connected peers
        const gossipMessage = {
            ...message,
            ttl: message.ttl - 1,
            via: this.nodeId
        };

        for (const peer of this.peers.values()) {
            try {
                await this.httpPost(
                    `http://${peer.host}:${peer.port}/message/broadcast`,
                    gossipMessage
                );
            } catch (err) {
                // Peer unreachable, will be discovered on next round
                this.peers.delete(peer.nodeId);
                this.emit('peer:disconnected', peer);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════

    async broadcast(type, content) {
        const message = {
            type,
            content,
            ttl: 3
        };

        return this.httpPost(`http://localhost:${this.port}/message/broadcast`, message);
    }

    async sendTo(peerId, content) {
        const peer = this.peers.get(peerId);
        if (!peer) {
            throw new Error(`Peer not found: ${peerId}`);
        }

        return this.httpPost(`http://${peer.host}:${peer.port}/message/send`, {
            to: peerId,
            content
        });
    }

    async announce() {
        // Announce ourselves to network
        const announce = {
            nodeId: this.nodeId,
            host: 'localhost',
            port: this.port,
            capabilities: ['messaging', 'discovery']
        };

        // Send to all known relays
        for (const relay of this.relays.values()) {
            try {
                await this.httpPost(
                    `http://${relay.host}:${relay.port}/peer/announce`,
                    announce
                );
            } catch (err) {
                // Ignore
            }
        }
    }

    getPeers() {
        return [...this.peers.values()];
    }

    getMessageHistory(limit = 100) {
        return [...this.messageHistory.values()].slice(-limit);
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════

    trimHistory() {
        if (this.messageHistory.size > this.maxHistory) {
            const entries = [...this.messageHistory.entries()];
            const toRemove = entries.slice(0, entries.length - this.maxHistory);
            for (const [id] of toRemove) {
                this.messageHistory.delete(id);
            }
        }
    }

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
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
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

    async stop() {
        console.log('🛑 Stopping HiveMesh...');
        
        // Announce disconnect
        await this.broadcast('peer:leave', { nodeId: this.nodeId });
        
        // Close server
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('✅ HiveMesh stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════════
// RELAY SERVER (for nodes behind NAT)
// ═══════════════════════════════════════════════════════════════════

class HiveMeshRelay extends HiveMeshNode {
    constructor(options = {}) {
        super({ ...options, isRelay: true });
        this.relayPort = options.relayPort || RELAY_PORT;
        this.peerRegistry = new Map(); // registered peers
    }

    async start() {
        return new Promise((resolve, reject) => {
            // Start relay on separate port
            this.relayServer = http.createServer((req, res) => {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                
                if (req.method === 'OPTIONS') {
                    res.writeHead(200);
                    res.end();
                    return;
                }

                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => this.handleRelayRequest(req.url, body, res));
            });

            this.relayServer.on('error', reject);

            this.relayServer.listen(this.relayPort, () => {
                console.log(`🛰️ HiveMesh Relay listening on port ${this.relayPort}`);
                super.start().then(resolve).catch(reject);
            });
        });
    }

    async handleRelayRequest(url, body, res) {
        try {
            const path = url.split('?')[0];
            
            switch (path) {
                case '/relay/register':
                    // Peer registers with relay
                    const peer = JSON.parse(body || '{}');
                    this.peerRegistry.set(peer.nodeId, {
                        ...peer,
                        registeredAt: Date.now()
                    });
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true }));
                    break;

                case '/peer/discover':
                    // Return all registered peers
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        peers: [...this.peerRegistry.values()],
                        relays: []
                    }));
                    break;

                case '/peer/announce':
                    // Forward peer announcement
                    const announce = JSON.parse(body || '{}');
                    this.peerRegistry.set(announce.nodeId, {
                        ...announce,
                        lastSeen: Date.now()
                    });
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

    async stop() {
        return super.stop().then(() => {
            return new Promise((resolve) => {
                if (this.relayServer) {
                    this.relayServer.close(() => resolve());
                } else {
                    resolve();
                }
            });
        });
    }
}

// CLI
if (require.main === module) {
    const mode = process.argv[2];
    const port = parseInt(process.argv[3]) || DEFAULT_PORT;

    (async () => {
        let node;

        switch (mode) {
            case 'relay':
                node = new HiveMeshRelay({ port, relayPort: port + 1 });
                await node.start();
                console.log('🛰️ Relay mode - ready to help peers connect');
                break;

            case 'peer':
            default:
                node = new HiveMeshNode({ port });
                await node.start();
                
                // Announce ourselves
                await node.announce();
                
                // Periodic discovery
                setInterval(() => node.discoverPeers(), 30000);
                
                console.log('🕸️ Peer mode - starting mesh discovery...');
        }

        // Event handlers
        node.on('peer:connected', (peer) => {
            console.log(`🔗 Peer joined: ${peer.nodeId}`);
        });

        node.on('peer:disconnected', (peer) => {
            console.log(`🔌 Peer left: ${peer.nodeId}`);
        });

        node.on('message', (msg) => {
            console.log(`📨 Message: [${msg.type}] ${msg.content.substring(0, 50)}...`);
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await node.stop();
            process.exit(0);
        });
    })();
}

module.exports = { HiveMeshNode, HiveMeshRelay };
