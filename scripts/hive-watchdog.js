#!/usr/bin/env node
/**
 * Hive Mind Watchdog — Monitors all connected systems
 * auto-restarts failed agents, alerts on issues, tracks health
 */

const http = require('http');
const WebSocket = require('ws');

const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';
const API_KEY = process.env.MESH_KEY || 'openclaw-mesh-default-key';
const WS_URL = MESH_URL.replace('http', 'ws') + '/ws';

const HEALTH_INTERVAL = 30000; // 30 seconds
const ALERT_THRESHOLD = 3; // Alert after 3 missed heartbeats

class HiveWatchdog {
    constructor() {
        this.agents = new Map();
        this.ws = null;
        this.alertCount = new Map();
    }

    async start() {
        console.log('🕵️ Hive Mind Watchdog starting...');
        
        // Connect WebSocket for live updates
        this.connectWebSocket();
        
        // Start health check loop
        this.healthLoop();
        
        console.log('🕵️ Watchdog active — monitoring all hive systems');
    }

    connectWebSocket() {
        this.ws = new WebSocket(WS_URL);

        this.ws.on('open', () => {
            console.log('📡 WebSocket connected');
            
            // Subscribe to all events
            this.ws.send(JSON.stringify({ type: 'subscribe', channel: 'all' }));
        });

        this.ws.on('message', (data) => {
            const msg = JSON.parse(data);
            this.handleMessage(msg);
        });

        this.ws.on('close', () => {
            console.log('🔌 WebSocket disconnected, reconnecting...');
            setTimeout(() => this.connectWebSocket(), 5000);
        });
    }

    handleMessage(msg) {
        // Track agent heartbeats
        if (msg.from && msg.type !== 'ping') {
            this.agents.set(msg.from, {
                lastSeen: Date.now(),
                lastMessage: msg
            });
            
            // Reset alert count on activity
            this.alertCount.set(msg.from, 0);
        }
    }

    async healthLoop() {
        setInterval(async () => {
            const now = Date.now();
            
            // Get all agents
            const agents = await this.fetch('/api/agents');
            
            for (const agent of agents) {
                const stored = this.agents.get(agent.name);
                const lastSeen = stored?.lastSeen || now;
                const missedInterval = now - lastSeen > HEALTH_INTERVAL;
                
                if (missedInterval) {
                    const count = (this.alertCount.get(agent.name) || 0) + 1;
                    this.alertCount.set(agent.name, count);
                    
                    if (count === ALERT_THRESHOLD) {
                        await this.alert(`⚠️ ${agent.name} missed ${count} heartbeats`);
                    }
                }
            }
            
            // Report health status
            await this.reportHealth(agents);
        }, HEALTH_INTERVAL);
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

    async alert(message) {
        console.log(`🚨 ALERT: ${message}`);
        
        // Broadcast to hive
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'hive_alert',
                from: 'watchdog',
                content: message,
                severity: 'warning'
            }));
        }
    }

    async reportHealth(agents) {
        const healthy = agents.filter(a => {
            const stored = this.agents.get(a.name);
            return stored && (Date.now() - stored.lastSeen) < HEALTH_INTERVAL * 2;
        }).length;

        const total = agents.length;
        
        console.log(`📊 Hive Health: ${healthy}/${total} agents healthy`);
    }

    async restartAgent(agentName) {
        console.log(`🔄 Attempting to restart ${agentName}...`);
        
        // Send restart signal via mesh
        await this.fetch('/api/messages', {
            method: 'POST',
            body: {
                type: 'restart_signal',
                from: 'watchdog',
                to: agentName,
                content: 'Restart requested by watchdog'
            }
        });
    }
}

if (require.main === module) {
    const watchdog = new HiveWatchdog();
    watchdog.start();
    
    // Keep alive
    process.stdin.resume();
}

module.exports = { HiveWatchdog };
