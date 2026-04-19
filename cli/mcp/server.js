#!/usr/bin/env node
/**
 * Hive MCP Server
 * 
 * Model Context Protocol server for Claude integration.
 * Works on Mac, Linux, and Termux (Android).
 * 
 * Usage:
 *   node cli/mcp/server.js
 *   # Then connect via Claude CLI
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

// Load Hive modules
const HiveScoring = require('../scripts/hive-scoring.js');
const HiveMemory = require('../scripts/hive-memory.js');
const HiveTrace = require('../scripts/hive-trace.js');
const HiveBudget = require('../scripts/hive-budget.js');
const { Platform, platform } = require('./platform-detect.js');

// Initialize Hive components
const scoring = new HiveScoring();
const memory = new HiveMemory();
const trace = new HiveTrace();
const budget = new HiveBudget();

// Create MCP Server
const server = new Server(
    {
        name: 'Hive Nation MCP',
        version: '1.0.0',
        description: 'Multi-agent government framework with production tools'
    },
    {
        capabilities: {
            tools: {}
        }
    }
);

// ═══════════════════════════════════════════════════════════
// TOOL DEFINITIONS
// ═══════════════════════════════════════════════════════════

const tools = [
    // Government Tools
    {
        name: 'hive_senate',
        description: 'Hive Nation Senate operations - debates, votes, legislation',
        inputSchema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['list', 'session', 'vote', 'debate'] },
                args: { type: 'string' }
            }
        }
    },
    {
        name: 'hive_congress',
        description: 'Hive Nation Congress - House/Senate operations',
        inputSchema: {
            type: 'object',
            properties: {
                action: { type: 'string' },
                args: { type: 'string' }
            }
        }
    },
    {
        name: 'hive_constitution',
        description: 'View Hive Nation Constitution',
        inputSchema: {
            type: 'object',
            properties: {
                article: { type: 'string' }
            }
        }
    },
    {
        name: 'hive_law',
        description: 'View Hive Nation legal code',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'number' }
            }
        }
    },
    {
        name: 'hive_orders',
        description: 'View Hive Nation Executive Orders',
        inputSchema: {
            type: 'object',
            properties: {
                orderId: { type: 'string' }
            }
        }
    },

    // Production Tools
    {
        name: 'hive_score',
        description: 'Score agent output (quality, speed, accuracy, usefulness)',
        inputSchema: {
            type: 'object',
            properties: {
                agentId: { type: 'string' },
                task: { type: 'string' },
                quality: { type: 'number', minimum: 1, maximum: 10 },
                speed: { type: 'number', minimum: 1, maximum: 10 },
                accuracy: { type: 'number', minimum: 1, maximum: 10 },
                usefulness: { type: 'number', minimum: 1, maximum: 10 },
                feedback: { type: 'string' }
            },
            required: ['agentId', 'task']
        }
    },
    {
        name: 'hive_rankings',
        description: 'View agent performance rankings'
    },
    {
        name: 'hive_memory_remember',
        description: 'Store information in Hive memory',
        inputSchema: {
            type: 'object',
            properties: {
                category: { type: 'string' },
                content: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } }
            },
            required: ['content']
        }
    },
    {
        name: 'hive_memory_recall',
        description: 'Search Hive memory',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                category: { type: 'string' }
            },
            required: ['query']
        }
    },
    {
        name: 'hive_trace_start',
        description: 'Start execution trace for task',
        inputSchema: {
            type: 'object',
            properties: {
                taskId: { type: 'string' },
                task: { type: 'string' }
            },
            required: ['taskId', 'task']
        }
    },
    {
        name: 'hive_trace_step',
        description: 'Record step in execution trace',
        inputSchema: {
            type: 'object',
            properties: {
                agent: { type: 'string' },
                action: { type: 'string' },
                duration: { type: 'number' },
                result: { type: 'string' }
            },
            required: ['agent', 'action']
        }
    },
    {
        name: 'hive_trace_end',
        description: 'End execution trace'
    },
    {
        name: 'hive_budget_status',
        description: 'View budget and resource status'
    },
    {
        name: 'hive_can_spawn',
        description: 'Check if agent can spawn',
        inputSchema: {
            type: 'object',
            properties: {
                agentType: { type: 'string' }
            }
        }
    },

    // Termux API Tools (if available)
    {
        name: 'termux_camera',
        description: 'Take photo with Termux camera',
        inputSchema: {
            type: 'object',
            properties: {
                cameraId: { type: 'number', default: 0 },
                outputPath: { type: 'string' }
            }
        }
    },
    {
        name: 'termux_location',
        description: 'Get GPS location via Termux',
        inputSchema: {
            type: 'object',
            properties: {
                provider: { type: 'string', enum: ['gps', 'network'] }
            }
        }
    },
    {
        name: 'termux_clipboard',
        description: 'Get/Set clipboard via Termux',
        inputSchema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['get', 'set'] },
                text: { type: 'string' }
            }
        }
    },
    {
        name: 'termux_notification',
        description: 'Show notification via Termux',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string' },
                content: { type: 'string' }
            },
            required: ['title']
        }
    },
    {
        name: 'termux_speak',
        description: 'Text-to-speech via Termux',
        inputSchema: {
            type: 'object',
            properties: {
                text: { type: 'string' }
            },
            required: ['text']
        }
    },
    {
        name: 'termux_sms',
        description: 'Send SMS via Termux',
        inputSchema: {
            type: 'object',
            properties: {
                number: { type: 'string' },
                message: { type: 'string' }
            },
            required: ['number', 'message']
        }
    },

    // Platform Info
    {
        name: 'hive_platform_info',
        description: 'Get platform information (OS, capabilities)'
    },
    {
        name: 'hive_dashboard',
        description: 'View Hive system dashboard'
    }
];

// ═══════════════════════════════════════════════════════════
// TOOL HANDLERS
// ═══════════════════════════════════════════════════════════

async function handleToolCall(toolName, args) {
    try {
        switch (toolName) {
            // Scoring
            case 'hive_score':
                const score = scoring.score({
                    agentId: args.agentId,
                    task: args.task,
                    quality: args.quality || 7,
                    speed: args.speed || 5,
                    accuracy: args.accuracy || 7,
                    usefulness: args.usefulness || 7,
                    feedback: args.feedback
                });
                return { success: true, content: `Score recorded: ${score.composite}/100` };

            case 'hive_rankings':
                const rankings = scoring.rankings();
                return { success: true, content: JSON.stringify(rankings, null, 2) };

            // Memory
            case 'hive_memory_remember':
                const mem = memory.remember({
                    category: args.category || 'general',
                    content: args.content,
                    tags: args.tags || []
                });
                return { success: true, content: `Memory saved: ${mem.id}` };

            case 'hive_memory_recall':
                const results = memory.recall(args.query, args.category);
                return { success: true, content: JSON.stringify(results, null, 2) };

            // Trace
            case 'hive_trace_start':
                trace.start(args.taskId, args.task);
                return { success: true, content: `Trace started: ${args.taskId}` };

            case 'hive_trace_step':
                trace.step({
                    agent: args.agent,
                    action: args.action,
                    duration: args.duration,
                    result: args.result
                });
                return { success: true, content: `Step recorded for ${args.agent}` };

            case 'hive_trace_end':
                const completedTrace = trace.end();
                return { success: true, content: `Trace completed: ${completedTrace.stats.totalSteps} steps` };

            // Budget
            case 'hive_budget_status':
                budget.status();
                return { success: true, content: 'Budget status shown' };

            case 'hive_can_spawn':
                const canSpawn = budget.canSpawn(args.agentType || 'default');
                return { success: true, content: canSpawn.canSpawn ? 'Can spawn' : 'Cannot spawn' };

            // Platform
            case 'hive_platform_info':
                return { success: true, content: JSON.stringify(platform.toJSON(), null, 2) };

            case 'hive_dashboard':
                scoring.dashboard();
                memory.dashboard();
                budget.status();
                return { success: true, content: 'Dashboard complete' };

            // Termux Tools
            case 'termux_camera':
                if (!platform.canUseTermuxAPI()) {
                    return { success: false, content: 'Termux:API not available' };
                }
                const { execSync } = require('child_process');
                const cameraPath = args.outputPath || '/sdcard/hive-photo.jpg';
                execSync(`termux-camera-photo -c ${args.cameraId || 0} ${cameraPath}`);
                return { success: true, content: `Photo saved: ${cameraPath}` };

            case 'termux_location':
                if (!platform.canUseTermuxAPI()) {
                    return { success: false, content: 'Termux:API not available' };
                }
                const location = execSync(`termux-location ${args.provider || ''}`.trim()).toString();
                return { success: true, content: location };

            case 'termux_clipboard':
                if (!platform.canUseTermuxAPI()) {
                    return { success: false, content: 'Termux:API not available' };
                }
                if (args.action === 'get') {
                    const text = execSync('termux-clipboard-get').toString();
                    return { success: true, content: text };
                } else {
                    execSync(`termux-clipboard-set "${args.text}"`);
                    return { success: true, content: 'Clipboard set' };
                }

            case 'termux_notification':
                if (!platform.canUseTermuxAPI()) {
                    return { success: false, content: 'Termux:API not available' };
                }
                execSync(`termux-notification --title "${args.title}" --content "${args.content || ''}"`);
                return { success: true, content: 'Notification shown' };

            case 'termux_speak':
                if (!platform.canUseTermuxAPI()) {
                    return { success: false, content: 'Termux:API not available' };
                }
                execSync(`termux-tts-speak "${args.text}"`);
                return { success: true, content: 'Speaking...' };

            case 'termux_sms':
                if (!platform.canUseTermuxAPI()) {
                    return { success: false, content: 'Termux:API not available' };
                }
                execSync(`termux-sms-send -n "${args.number}" "${args.message}"`);
                return { success: true, content: 'SMS sent' };

            default:
                return { success: false, content: `Unknown tool: ${toolName}` };
        }
    } catch (error) {
        return { success: false, content: `Error: ${error.message}` };
    }
}

// ═══════════════════════════════════════════════════════════
// REGISTER TOOLS
// ═══════════════════════════════════════════════════════════

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const result = await handleToolCall(name, args || {});
    
    return {
        content: [
            {
                type: 'text',
                text: result.content
            }
        ]
    };
});

// ═══════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // Log startup (only stderr so it doesn't break MCP protocol)
    console.error('Hive MCP Server started');
}

main().catch(console.error);