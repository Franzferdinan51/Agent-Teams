#!/usr/bin/env node
/**
 * Hive Task Router — Routes tasks to best-fit agent
 * Analyzes task → matches capabilities → routes to right agent
 */

const http = require('http');

const MESH_URL = process.env.MESH_URL || 'http://localhost:4000';
const API_KEY = process.env.MESH_KEY || 'openclaw-mesh-default-key';

const CAPABILITY_MAP = {
    // Image generation
    'image': ['image-generator', 'sdxl-artist', 'comfyui', 'minimax-creative'],
    'picture': ['image-generator', 'sdxl-artist'],
    'photo': ['image-generator'],
    'generate image': ['image-generator', 'sdxl-artist'],
    
    // Video generation
    'video': ['video-generator', 'animate-artist', 'svd-artist'],
    'animate': ['animate-artist', 'video-generator'],
    'animation': ['animate-artist', 'video-generator'],
    
    // 3D
    '3d': ['3d-modeler', 'blender-artist'],
    'model': ['3d-modeler', 'blender-artist'],
    'blender': ['blender-artist'],
    'render': ['render-artist'],
    'texture': ['texture-artist'],
    
    // Audio
    'music': ['music-generator'],
    'song': ['music-generator'],
    'audio': ['music-generator', 'speech-agent'],
    'speech': ['speech-agent'],
    'tts': ['speech-agent'],
    'voice': ['speech-agent'],
    
    // Coding
    'code': ['coder', 'micro-sh'],
    'program': ['coder'],
    'build': ['coder'],
    'write code': ['coder'],
    'debug': ['debugger', 'bug-hunt'],
    'fix': ['debugger'],
    'test': ['test-writer', 'qa-test-writer'],
    'review': ['code-review', 'review-summary'],
    
    // Research
    'research': ['researcher', 'researcher-deep'],
    'search': ['researcher'],
    'find': ['researcher'],
    'analyze': ['researcher', 'summarizer'],
    'compare': ['comparer'],
    
    // Planning
    'plan': ['planner'],
    'architect': ['architect'],
    'design': ['architect', 'api-designer', 'db-designer'],
    
    // Documentation
    'document': ['doc-writer'],
    'write docs': ['doc-writer'],
    'readme': ['readme-writer'],
    'changelog': ['changelog-writer'],
    
    // Android
    'android': ['android-control', 'adb-agent'],
    'phone': ['android-control'],
    'screenshot': ['android-control'],
    'tap': ['android-control'],
    
    // Database
    'database': ['db-designer'],
    'sql': ['query-writer'],
    'query': ['query-writer'],
    'api': ['api-designer'],
    
    // Security
    'security': ['security-scan', 'qa-security-scan'],
    'vulnerability': ['security-scan'],
    'audit': ['security-scan', 'code-review'],
};

class TaskRouter {
    constructor() {
        this.routes = [];
        this.stats = new Map();
    }

    async route(taskDescription) {
        console.log(`\n🎯 ROUTING TASK: "${taskDescription}"`);
        console.log('═'.repeat(60));

        const taskLower = taskDescription.toLowerCase();
        
        // Match capabilities
        const matchedCaps = this.matchCapabilities(taskLower);
        console.log(`📦 Matched capabilities: ${matchedCaps.join(', ')}`);

        // Get all agents
        const agents = await this.fetch('/api/agents');
        
        // Score each agent
        const scored = [];
        for (const agent of agents) {
            const agentCaps = agent.capabilities || [];
            const score = this.scoreAgent(agentCaps, matchedCaps);
            
            if (score > 0) {
                scored.push({
                    name: agent.name,
                    type: agent.type,
                    score,
                    matchedCaps: matchedCaps.filter(c => agentCaps.includes(c))
                });
            }
        }

        // Sort by score
        scored.sort((a, b) => b.score - a.score);

        // Get best agent
        const best = scored[0];

        if (best) {
            console.log(`\n✅ BEST AGENT: ${best.name}`);
            console.log(`   Type: ${best.type}`);
            console.log(`   Score: ${best.score}`);
            console.log(`   Matches: ${best.matchedCaps.join(', ')}`);

            // Show alternatives
            if (scored.length > 1) {
                console.log(`\n📋 ALTERNATIVES:`);
                scored.slice(1, 4).forEach((agent, i) => {
                    console.log(`   ${i + 2}. ${agent.name} (score: ${agent.score})`);
                });
            }

            // Route the task
            await this.sendToAgent(best.name, taskDescription);

            // Track stats
            this.trackStat(best.name, taskDescription);

            return {
                agent: best.name,
                score: best.score,
                alternatives: scored.slice(1, 4),
                task: taskDescription
            };
        } else {
            console.log(`\n❌ NO MATCH FOUND`);
            console.log(`   Tried to match: ${matchedCaps.join(', ')}`);
            console.log(`   Available agents: ${agents.length}`);
            
            return { agent: null, alternatives: [] };
        }
    }

    matchCapabilities(taskLower) {
        const matches = [];
        
        for (const [keyword, capabilities] of Object.entries(CAPABILITY_MAP)) {
            if (taskLower.includes(keyword)) {
                for (const cap of capabilities) {
                    if (!matches.includes(cap)) {
                        matches.push(cap);
                    }
                }
            }
        }
        
        return matches;
    }

    scoreAgent(agentCaps, requiredCaps) {
        let score = 0;
        
        for (const cap of requiredCaps) {
            if (agentCaps.some(ac => ac.toLowerCase().includes(cap.toLowerCase()))) {
                score += 10;
            }
        }
        
        // Exact match bonus
        for (const required of requiredCaps) {
            if (agentCaps.includes(required)) {
                score += 5;
            }
        }
        
        return score;
    }

    async sendToAgent(agentName, taskDescription) {
        await this.fetch('/api/messages', {
            method: 'POST',
            body: {
                type: 'task_assignment',
                from: 'task-router',
                to: agentName,
                content: JSON.stringify({
                    task: taskDescription,
                    routedAt: Date.now()
                }),
                priority: 'normal',
                taskId: `task-${Date.now()}`
            }
        });
    }

    trackStat(agentName, task) {
        const current = this.stats.get(agentName) || { count: 0, tasks: [] };
        current.count++;
        current.tasks.push({ task, at: Date.now() });
        this.stats.set(agentName, current);
    }

    getStats() {
        const sorted = [...this.stats.entries()]
            .map(([name, data]) => ({ name, count: data.count }))
            .sort((a, b) => b.count - a.count);
        
        return sorted;
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
}

// CLI
if (require.main === module) {
    const router = new TaskRouter();
    const task = process.argv.slice(2).join(' ');

    if (!task) {
        console.log(`
🎯 Task Router v1.0.0

Usage:
  node hive-router.js "generate an image of a cat"
  node hive-router.js "build a REST API"
  node hive-router.js "debug this code"
  node hive-router.js "research AI agents"

Routes tasks to best-fit agent based on capabilities.
        `);
        process.exit(0);
    }

    router.route(task).then(result => {
        if (result.agent) {
            console.log(`\n📊 Routing stats:`, router.getStats());
        }
        process.exit(0);
    });
}

module.exports = { TaskRouter, CAPABILITY_MAP };
