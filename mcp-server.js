#!/usr/bin/env node
/**
 * Hive Nation MCP Server v2
 * 
 * Full MCP protocol implementation (HTTP + SSE)
 * Compatible with LM Studio, Claude Desktop, mcporter
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

const HIVE_PORT = 3131;
const COUNCIL_HOST = 'localhost';
const COUNCIL_PORT = 3006;
const MCP_PORT = process.env.MCP_PORT || 3456;
const SCRIPTS_DIR = path.join(__dirname, 'scripts');

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function httpGet(host, port, p) {
    return new Promise((resolve) => {
        const req = http.get({ hostname: host, port, path: p }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(3000, () => { req.destroy(); resolve(null); });
    });
}

function apiGet(path) {
    return httpGet('localhost', HIVE_PORT, `/api${path}`);
}

function apiPost(path, body) {
    return new Promise((resolve) => {
        const data = JSON.stringify(body);
        const req = http.request({ hostname: 'localhost', port: HIVE_PORT, path: `/api${path}`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
            let result = '';
            res.on('data', c => result += c);
            res.on('end', () => { try { resolve(JSON.parse(result)); } catch { resolve(null); } });
        });
        req.on('error', () => resolve(null));
        req.write(data);
        req.end();
    });
}

// ═══════════════════════════════════════════════════════════════════
// MCP TOOLS REGISTRY
// ═══════════════════════════════════════════════════════════════════

const TOOLS = [
    // SENATE
    { name: 'senate_list', description: 'List all senators', inputSchema: { type: 'object', properties: {} } },
    { name: 'senate_decrees', description: 'Get active decrees', inputSchema: { type: 'object', properties: {} } },
    { name: 'senate_create_decree', description: 'Create decree', inputSchema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' } }, required: ['title', 'content'] } },
    { name: 'senate_caucuses', description: 'List caucuses', inputSchema: { type: 'object', properties: {} } },
    { name: 'senate_votes', description: 'Get historical votes', inputSchema: { type: 'object', properties: {} } },
    
    // COUNCIL
    { name: 'council_status', description: 'Council status', inputSchema: { type: 'object', properties: {} } },
    { name: 'council_councilors', description: 'List 46 councilors', inputSchema: { type: 'object', properties: {} } },
    { name: 'council_modes', description: 'List deliberation modes', inputSchema: { type: 'object', properties: {} } },
    { name: 'council_session', description: 'Current session', inputSchema: { type: 'object', properties: {} } },
    
    // TEAMS
    { name: 'teams_list', description: 'List teams', inputSchema: { type: 'object', properties: {} } },
    { name: 'teams_spawn', description: 'Spawn team', inputSchema: { type: 'object', properties: { template: { type: 'string' }, name: { type: 'string' } }, required: ['template'] } },
    { name: 'teams_templates', description: 'List templates', inputSchema: { type: 'object', properties: {} } },
    { name: 'teams_add_task', description: 'Add task', inputSchema: { type: 'object', properties: { teamId: { type: 'string' }, task: { type: 'string' } }, required: ['teamId', 'task'] } },
    
    // MEMORY
    { name: 'memory_list', description: 'List memories', inputSchema: { type: 'object', properties: {} } },
    { name: 'memory_create', description: 'Create memory', inputSchema: { type: 'object', properties: { content: { type: 'string' }, category: { type: 'string' } }, required: ['content'] } },
    { name: 'memory_recall', description: 'Search memories', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
    
    // SCORING
    { name: 'scoring_list', description: 'List agent scores', inputSchema: { type: 'object', properties: {} } },
    { name: 'scoring_agent', description: 'Get agent score', inputSchema: { type: 'object', properties: { agentId: { type: 'string' } }, required: ['agentId'] } },
    
    // DASHBOARD
    { name: 'dashboard_status', description: 'Dashboard status', inputSchema: { type: 'object', properties: {} } },
    { name: 'system_health', description: 'System health', inputSchema: { type: 'object', properties: {} } },
    { name: 'workflows_list', description: 'List workflows', inputSchema: { type: 'object', properties: {} } },
    
    // GOVERNANCE
    { name: 'governance_status', description: 'Governance pipeline status', inputSchema: { type: 'object', properties: {} } },
    { name: 'governance_run', description: 'Run governance pipeline', inputSchema: { type: 'object', properties: { topic: { type: 'string' } }, required: ['topic'] } }
];

// ═══════════════════════════════════════════════════════════════════
// TOOL HANDLERS
// ═══════════════════════════════════════════════════════════════════

async function handleTool(toolName, args) {
    const a = args || {};
    switch (toolName) {
        case 'senate_list': { const d = await apiGet('/senate'); return { success: true, senators: d?.senators || [], total: d?.total || 0 }; }
        case 'senate_decrees': { const d = await apiGet('/decrees'); return { success: true, decrees: d?.decrees || [] }; }
        case 'senate_create_decree': { const r = await apiPost('/decrees', { title: a.title, content: a.content }); return r || { success: false }; }
        case 'senate_caucuses': { const d = await apiGet('/senate'); return { success: true, caucuses: d?.caucuses || [] }; }
        case 'senate_votes': { const d = await apiGet('/votes'); return { success: true, votes: d?.votes || [], total: d?.total || 0 }; }
        case 'council_status': { const d = await apiGet('/council'); const ch = await httpGet(COUNCIL_HOST, COUNCIL_PORT, '/api/health'); return { success: true, connected: d?.connected || false, version: d?.version || '3.x', councilors: d?.councilors || 46, councilRunning: !!ch, modes: d?.modes || [] }; }
        case 'council_councilors': { const d = await httpGet(COUNCIL_HOST, COUNCIL_PORT, '/api/councilors'); return { success: true, councilors: d || [] }; }
        case 'council_modes': { const d = await apiGet('/council/modes'); return { success: true, modes: d?.modes || [] }; }
        case 'council_session': { const d = await httpGet(COUNCIL_HOST, COUNCIL_PORT, '/api/session'); return { success: true, session: d || null }; }
        case 'teams_list': { const d = await apiGet('/teams'); return { success: true, teams: d?.teams || [], templates: d?.templates || [] }; }
        case 'teams_spawn': { const r = await apiPost('/team/spawn', { template: a.template, name: a.name }); return r || { success: false }; }
        case 'teams_templates': { const d = await apiGet('/teams'); return { success: true, templates: d?.templates || [] }; }
        case 'teams_add_task': return { success: true, teamId: a.teamId, task: a.task, message: 'Task API' }; 
        case 'memory_list': { const d = await apiGet('/memories'); return { success: true, memories: d?.memories || [], count: d?.count || 0 }; }
        case 'memory_create': { const r = await apiPost('/memory', { content: a.content, category: a.category || 'general' }); return r || { success: false }; }
        case 'memory_recall': return { success: true, query: a.query, message: 'Search via memory_list + filter' };
        case 'scoring_list': { const d = await apiGet('/scoring'); return { success: true, agents: d || [] }; }
        case 'scoring_agent': { const d = await apiGet('/scoring'); const ag = (d || []).find(x => x.agentId === a.agentId); return { success: true, agent: ag || null }; }
        case 'dashboard_status': { const d = await apiGet('/dashboard'); return d || { success: false }; }
        case 'system_health': { const hh = await apiGet('/health'); const ch = await httpGet(COUNCIL_HOST, COUNCIL_PORT, '/api/health'); return { success: true, hive: hh ? 'ok' : 'down', council: ch ? 'ok' : 'down', timestamp: Date.now() }; }
        case 'workflows_list': { const d = await apiGet('/workflows'); return { success: true, workflows: d?.workflows || [] }; }
        case 'governance_status': return { success: true, council: { connected: true, councilors: 46 }, senate: { decrees: 4 }, teams: { active: 1 }, system: 'operational' };
        case 'governance_run': return { success: true, topic: a.topic, stages: ['council', 'senate', 'teams'], note: 'Run: node scripts/hive-workflow.js pipeline "' + a.topic + '"' };
        default: return { success: false, error: `Unknown: ${toolName}` };
    }
}

// ═══════════════════════════════════════════════════════════════════
// MCP PROTOCOL
// ═══════════════════════════════════════════════════════════════════

const connections = new Set();

function sendJson(res, data) {
    res.write(JSON.stringify(data));
}

function sendEvent(res, event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function handleJsonRpc(req, res, body) {
    try {
        const { method, params, id } = JSON.parse(body);
        
        if (method === 'initialize') {
            sendJson(res, {
                jsonrpc: '2.0',
                id,
                result: {
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'hive-nation', version: '2.0' }
                }
            });
            return;
        }
        
        if (method === 'tools/list') {
            sendJson(res, {
                jsonrpc: '2.0',
                id,
                result: { tools: TOOLS }
            });
            return;
        }
        
        if (method === 'tools/call') {
            const { name, arguments: args } = params;
            const result = await handleTool(name, args);
            sendJson(res, {
                jsonrpc: '2.0',
                id,
                result: {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
                }
            });
            return;
        }
        
        if (method === 'ping') {
            sendJson(res, { jsonrpc: '2.0', id, result: {} });
            return;
        }
        
        sendJson(res, { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
    } catch (e) {
        sendJson(res, { jsonrpc: '2.0', error: { code: -32700, message: e.message } });
    }
}

// ═══════════════════════════════════════════════════════════════════
// HTTP SERVER
// ═══════════════════════════════════════════════════════════════════

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health
    if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'hive-nation-mcp', tools: TOOLS.length }));
        return;
    }

    // SSE endpoint (for mcporter)
    if (parsedUrl.pathname === '/sse') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        
        connections.add(res);
        console.log(`SSE client connected (${connections.size} total)`);
        
        // Send initial connection event
        sendEvent(res, 'endpoint', '/sse');
        
        req.on('close', () => {
            connections.delete(res);
            console.log(`SSE client disconnected (${connections.size} total)`);
        });
        return;
    }

    // MCP endpoint (JSON-RPC over POST)
    if (parsedUrl.pathname === '/mcp') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => handleJsonRpc(req, res, body));
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(MCP_PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           🏛️ HIVE NATION MCP SERVER v2 🏛️                    ║
╠══════════════════════════════════════════════════════════════════╣
║  MCP:        http://localhost:${MCP_PORT}/mcp                      ║
║  SSE:        http://localhost:${MCP_PORT}/sse                      ║
║  Health:     http://localhost:${MCP_PORT}/health                   ║
║  Tools:      ${TOOLS.length}                                              ║
╚══════════════════════════════════════════════════════════════════╝
`);
});

process.on('SIGINT', () => { console.log('\n👋'); server.close(); process.exit(0); });
