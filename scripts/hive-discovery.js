#!/usr/bin/env node
/**
 * Hive Mind Capability Discovery
 * Auto-discovers and advertises agent capabilities
 * Agents can find who can do what without manual config
 */

const http = require('http');

const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';
const API_KEY = process.env.MESH_KEY || 'openclaw-mesh-default-key';

class CapabilityDiscovery {
    constructor() {
        this.capabilityIndex = new Map();
    }

    async discover() {
        console.log('🔍 Scanning hive for capabilities...\n');

        // Get all agents
        const agents = await this.fetch('/api/agents');

        // Build capability index
        this.capabilityIndex.clear();

        for (const agent of agents) {
            const caps = agent.capabilities || [];
            console.log(`📦 ${agent.name} (${agent.type || 'agent'})`);

            for (const cap of caps) {
                if (!this.capabilityIndex.has(cap)) {
                    this.capabilityIndex.set(cap, []);
                }

                this.capabilityIndex.get(cap).push({
                    name: agent.name,
                    version: agent.version,
                    type: agent.type
                });

                console.log(`   └─ ${cap}`);
            }
        }

        console.log(`\n✅ Discovered ${this.capabilityIndex.size} unique capabilities`);

        return this.capabilityIndex;
    }

    async findAgent(capability) {
        const agents = this.capabilityIndex.get(capability) || [];
        return agents[0] || null;
    }

    async findAllAgents(capability) {
        return this.capabilityIndex.get(capability) || [];
    }

    async findByCapabilities(requiredCaps) {
        // Find agent that has ALL required capabilities
        const results = [];

        const agents = await this.fetch('/api/agents');

        for (const agent of agents) {
            const caps = agent.capabilities || [];
            const hasAll = requiredCaps.every(cap => caps.includes(cap));

            if (hasAll) {
                results.push(agent);
            }
        }

        return results;
    }

    printCapabilityTree() {
        console.log('\n🌳 CAPABILITY TREE\n');

        const sorted = [...this.capabilityIndex.entries()].sort();

        for (const [capability, agents] of sorted) {
            console.log(`📌 ${capability.toUpperCase()}`);
            for (const agent of agents) {
                console.log(`   └─ ${agent.name} (${agent.type})`);
            }
            console.log('');
        }
    }

    async query(query) {
        query = query.toLowerCase();

        console.log(`\n🔍 Query: "${query}"\n`);

        // Find matching capabilities
        const matchingCaps = [...this.capabilityIndex.entries()]
            .filter(([cap]) => cap.toLowerCase().includes(query))
            .map(([cap, agents]) => ({ capability: cap, agents }));

        if (matchingCaps.length === 0) {
            console.log('   No matches found');
            return [];
        }

        for (const { capability, agents } of matchingCaps) {
            console.log(`📌 ${capability}`);
            for (const agent of agents) {
                console.log(`   └─ ${agent.name}`);
            }
        }

        return matchingCaps;
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

    advertise(agentName, capabilities) {
        // Broadcast capabilities to hive
        console.log(`📢 Advertising ${agentName} capabilities...`);

        return {
            type: 'capability_advert',
            from: agentName,
            capabilities,
            timestamp: Date.now()
        };
    }
}

// CLI
if (require.main === module) {
    const discovery = new CapabilityDiscovery();
    const command = process.argv[2];

    (async () => {
        switch (command) {
            case 'discover':
                await discovery.discover();
                break;

            case 'tree':
                await discovery.discover();
                discovery.printCapabilityTree();
                break;

            case 'find':
                const agent = await discovery.discover();
                const found = await discovery.findAgent(process.argv[3]);
                if (found) {
                    console.log(`\n✅ Found: ${found.name}`);
                } else {
                    console.log(`\n❌ Not found`);
                }
                break;

            case 'query':
                await discovery.discover();
                await discovery.query(process.argv[3] || 'image');
                break;

            default:
                console.log(`
🔍 Capability Discovery v1.0.0

Usage:
  node hive-discovery.js discover     Discover all capabilities
  node hive-discovery.js tree         Show capability tree
  node hive-discovery.js find <cap>   Find agent with capability
  node hive-discovery.js query <term> Search capabilities
                `);
        }
    })();
}

module.exports = { CapabilityDiscovery };
