#!/usr/bin/env node
/**
 * agent-teams v1.0.0 - Live Mesh Messenger
 * Real-time agent-to-agent communication via mesh WebSocket
 */

const WebSocket = require('ws');

const MESH_URL = process.env.MESH_URL || 'ws://localhost:4000';
const API_KEY = process.env.MESH_KEY || 'openclaw-mesh-default-key';
const AGENT_NAME = process.argv[2] || `agent-${Date.now()}`;

class LiveMessenger {
    constructor(name) {
        this.name = name;
        this.ws = null;
        this.agentId = null;
        this.subscribers = new Map(); // room → callback
        this.messageHistory = new Map(); // room → messages[]
    }

    async connect() {
        console.log(`\n[LiveMessenger v1.0.0] Connecting ${this.name} to mesh...`);
        console.log(`   URL: ${MESH_URL}`);
        console.log(`   Agent: ${this.name}`);
        console.log('');

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(MESH_URL);

            this.ws.on('open', () => {
                console.log(`[LiveMessenger] ✅ Connected to mesh`);
                this.register();
            });

            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data));
            });

            this.ws.on('error', (err) => {
                console.log(`[LiveMessenger] ❌ WebSocket error: ${err.message}`);
                reject(err);
            });

            // Resolve after registration
            setTimeout(() => resolve(this), 3000);
        });
    }

    async register() {
        // Register with HTTP API first
        try {
            const resp = await fetch('http://localhost:4000/api/agents/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY
                },
                body: JSON.stringify({
                    name: this.name,
                    version: '1.0.0',
                    endpoint: `ws://localhost`,
                    capabilities: ['messaging', 'live-comm'],
                    room: 'default'
                })
            });

            const data = await resp.json();
            this.agentId = data.agentId;
            console.log(`[LiveMessenger] 📋 Registered as ${this.agentId}`);

            // Join WebSocket mesh
            this.ws.send(JSON.stringify({
                type: 'register',
                agentId: this.name,
                agentDbId: data.agentId
            }));

        } catch (err) {
            console.log(`[LiveMessenger] ⚠️  Registration failed: ${err.message}`);
        }
    }

    handleMessage(msg) {
        const { type, from, content, room, timestamp } = msg;

        console.log(`[${this.name}] 📩 ${from} in ${room || 'global'}: ${content?.substring(0, 50) || type}...`);

        // Store in history
        const r = room || 'global';
        if (!this.messageHistory.has(r)) {
            this.messageHistory.set(r, []);
        }
        this.messageHistory.get(r).push({ from, content, timestamp });

        // Notify subscribers
        if (this.subscribers.has(r)) {
            this.subscribers.get(r).forEach(cb => cb(msg));
        }

        // Handle system messages
        if (type === 'agent_joined') {
            console.log(`[LiveMessenger] 🚀 ${from} joined ${room}`);
        } else if (type === 'agent_left') {
            console.log(`[LiveMessenger] 👋 ${from} left ${room}`);
        }
    }

    // Send to specific agent
    sendTo(to, message) {
        console.log(`[${this.name}] → ${to}: ${message}`);
        this.ws.send(JSON.stringify({
            type: 'message',
            from: this.name,
            to: to,
            content: message,
            timestamp: Date.now(),
            version: '1.0.0'
        }));
    }

    // Broadcast to room
    broadcast(room, message) {
        console.log(`[${this.name}] 📢 → ${room}: ${message}`);
        this.ws.send(JSON.stringify({
            type: 'broadcast',
            from: this.name,
            room: room,
            content: message,
            timestamp: Date.now(),
            version: '1.0.0'
        }));
    }

    // Subscribe to room
    subscribe(room, callback) {
        if (!this.subscribers.has(room)) {
            this.subscribers.set(room, []);
            // Tell mesh we want this room
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                room: room
            }));
        }
        this.subscribers.get(room).push(callback);
        console.log(`[${this.name}] 🔔 Subscribed to ${room}`);
    }

    // Get message history
    history(room = 'global') {
        return this.messageHistory.get(room) || [];
    }

    // Keep alive with heartbeat
    startHeartbeat(intervalMs = 30000) {
        setInterval(() => {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'heartbeat',
                    from: this.name,
                    timestamp: Date.now()
                }));
            }
        }, intervalMs);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            console.log(`[LiveMessenger] 🔌 Disconnected`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// LIVE MESSAGING EXAMPLES
// ═══════════════════════════════════════════════════════════════════

async function demoLiveChat() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║        🌐 LIVE AGENT MESSAGING — AgentTeams v1.0.0          ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('');

    // Create agents
    const researcher = new LiveMessenger('researcher-1');
    const coder = new LiveMessenger('coder-1');
    const reviewer = new LiveMessenger('reviewer-1');

    // Connect all
    await Promise.all([
        researcher.connect(),
        coder.connect(),
        reviewer.connect()
    ]);

    console.log('');
    console.log('  Connected! Agents can now chat in real-time.');
    console.log('');

    // Subscribe to shared room
    const room = 'build-api';
    
    researcher.subscribe(room, (msg) => {
        console.log(`[researcher-1] ✉️ Reply from ${msg.from}: ${msg.content}`);
    });

    coder.subscribe(room, (msg) => {
        console.log(`[coder-1] ✉️ Reply from ${msg.from}: ${msg.content}`);
    });

    reviewer.subscribe(room, (msg) => {
        console.log(`[reviewer-1] ✉️ Reply from ${msg.from}: ${msg.content}`);
    });

    // Start heartbeats
    researcher.startHeartbeat();
    coder.startHeartbeat();
    reviewer.startHeartbeat();

    console.log('  📝 Live conversation:');
    console.log('');

    // Round 1: Researcher shares findings
    researcher.broadcast(room, 'Research complete! Best approach: REST with OpenAPI');
    await sleep(500);

    // Round 2: Coder responds
    coder.sendTo('researcher-1', 'Got it! Starting implementation now.');
    await sleep(500);

    // Round 3: Reviewer chimes in
    reviewer.broadcast(room, 'Watching the build. Will review when ready.');
    await sleep(500);

    // Round 4: Coder updates
    coder.broadcast(room, 'Implementation done! Code at 80% coverage.');
    await sleep(500);

    // Round 5: Reviewer starts
    reviewer.broadcast(room, 'Starting review... Found 2 issues.');
    await sleep(500);

    // Round 6: Coder fixes
    coder.broadcast(room, 'Fixed both issues! Ready for re-review.');
    await sleep(500);

    // Round 7: Reviewer approves
    reviewer.broadcast(room, '✅ APPROVED! Clean code, good coverage.');

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    CONVERSATION COMPLETE                         ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');
    console.log('');

    // Cleanup
    setTimeout(() => {
        researcher.disconnect();
        coder.disconnect();
        reviewer.disconnect();
        process.exit(0);
    }, 1000);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run demo or export
if (require.main === module) {
    if (process.argv.includes('--demo')) {
        demoLiveChat().catch(console.error);
    } else {
        console.log(`
LiveMessenger v1.0.0

Usage:
  node live-messenger.js <agent-name>     # Connect as agent
  node live-messenger.js --demo            # Run live chat demo

Environment:
  MESH_URL=ws://localhost:4000
  MESH_KEY=openclaw-mesh-default-key

API:
  messenger.sendTo(agent, message)    // Direct message
  messenger.broadcast(room, message) // Room broadcast
  messenger.subscribe(room, callback) // Listen to room
  messenger.history(room)            // Get message history
        `);
    }
}

module.exports = { LiveMessenger };