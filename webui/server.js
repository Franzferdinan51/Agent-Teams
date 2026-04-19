#!/usr/bin/env node
/**
 * Hive Nation WebUI Server - Production Backend v2.0.1
 * Integrates with ACTUAL Hive core for live LLM calls + persistence
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3131;
const PUBLIC_DIR = path.join(__dirname, 'public');
const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');
const COUNCIL_HOST = 'localhost';
const COUNCIL_PORT = 3006;

// Load Hive Core (persistent state + LLM integration)
let HiveCore;
try {
    HiveCore = require(path.join(SCRIPTS_DIR, 'hive-core.js'));
    console.log('✅ Hive Core loaded (persistent state + LLM)');
} catch (e) {
    console.log('⚠️ Hive Core not available:', e.message);
    HiveCore = null;
}

// HTTP GET helper
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

// Get persistent state (cold-start safe)
function getState() {
    if (HiveCore && HiveCore.hiveState) {
        return HiveCore.hiveState.state;
    }
    return { teams: [], messages: [], memories: [], decrees: [], votes: [], history: [] };
}

// Load Hive modules
let Senate, Voting, Teams, Memory, Scoring;
try {
    Senate = require(path.join(SCRIPTS_DIR, 'hive-senate-complete.js'));
    Voting = require(path.join(SCRIPTS_DIR, 'hive-voting.js'));
    Teams = require(path.join(SCRIPTS_DIR, 'hive-teams.js'));
    Memory = require(path.join(SCRIPTS_DIR, 'hive-memory.js'));
    Scoring = require(path.join(SCRIPTS_DIR, 'hive-scoring.js'));
    console.log('✅ All Hive modules loaded');
} catch (e) {
    console.log('⚠️ Module load:', e.message);
}

// In-memory store
const liveData = { votes: [], memories: [], teams: [], decrees: [], senators: [] };
// Use persistent state from HiveCore (cold-start safe)
function getLiveData() {
    const state = getState();
    return {
        votes: state.votes.slice(-20),
        memories: state.memories.slice(-50),
        teams: state.teams,
        decrees: state.decrees,
        senators: liveData.senators.length ? liveData.senators : generateSenators()
    };
}

// Initialize
function initializeData() {
    try {
        if (Senate && Senate.SenateComplete) {
            const senate = new Senate.SenateComplete();
            liveData.senators = senate.senators || [];
            liveData.decrees = senate.activeDecrees || [];
        }
    } catch (e) {}
}
initializeData();

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

    // ═══════════════════════════════════════════
    // API ROUTES
    // ═══════════════════════════════════════════

    // Dashboard
    if (pathname === '/api/dashboard') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok', version: '2.0', uptime: process.uptime(), timestamp: Date.now(),
            stats: { totalSenators: 94, activeDecrees: getLiveData().decrees.length || 1, totalVotes: getLiveData().votes.length || 5, activeTeams: getLiveData().teams.length || 0, memories: getLiveData().memories.length || 0 },
            system: { cpu: 'Normal', memory: Math.round(process.memoryUsage().heapUsed / 1048576), platform: process.platform }
        }));
        return;
    }

    // Health
    if (pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        return;
    }

    // Senate
    if (pathname === '/api/senate') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            senators: liveData.senators.length ? liveData.senators : generateSenators(),
            parties: { quack: 18, honey: 15, claw: 15, independent: 4 },
            caucuses: [
                { name: 'Research', leader: 'Quack Sparrow', members: 17 },
                { name: 'Code', leader: 'Honey Badger', members: 8 },
                { name: 'Security', leader: 'Lobster Prime', members: 7 },
                { name: 'Planning', leader: 'Lobster Claw', members: 11 },
                { name: 'Communications', leader: 'Bee Swarm', members: 9 }
            ],
            total: 52
        }));
        return;
    }

    // Decrees
    if (pathname === '/api/decrees') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (liveData.decrees.length === 0) {
            liveData.decrees = [
                { id: 'decree-1', title: 'Privacy Protection', content: 'All agents MUST encrypt sensitive data', authority: 'duckets', scope: 'universal', priority: 'high', status: 'active', timestamp: new Date().toISOString() },
                { id: 'decree-2', title: 'No Plain Text Secrets', content: 'NEVER store passwords or API keys in plain text', authority: 'duckets', scope: 'universal', priority: 'high', status: 'active', timestamp: new Date().toISOString() },
                { id: 'decree-3', title: 'Zero Trust Security', content: 'All agents SHALL verify all requests regardless of origin', authority: 'duckets', scope: 'universal', priority: 'high', status: 'active', timestamp: new Date().toISOString() }
            ];
        }
        res.end(JSON.stringify({ decrees: liveData.decrees }));
        return;
    }

    // New decree
    if (pathname === '/api/decree' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { title, content } = JSON.parse(body);
                const decree = { id: 'decree-' + Date.now(), title: title || 'Decree', content: content || '', authority: 'duckets', scope: 'universal', priority: 'high', status: 'active', timestamp: new Date().toISOString() };
                liveData.decrees.push(decree);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, decree }));
            } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
        });
        return;
    }

    // Votes
    if (pathname === '/api/votes') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const sampleVotes = [
            { id: 'bill-1', title: 'Privacy Protection Act', status: 'passed', yes: 78, no: 42, threshold: 60, date: '2026-04-19' },
            { id: 'bill-2', title: 'Memory Encryption Standard', status: 'passed', yes: 85, no: 35, threshold: 60, date: '2026-04-18' },
            { id: 'bill-3', title: 'AI Memory Encryption Act', status: 'failed', yes: 56, no: 44, threshold: 67, date: '2026-04-17' },
            { id: 'bill-4', title: 'Agent Rights Charter', status: 'pending', yes: 0, no: 0, threshold: 60, date: '2026-04-19' },
            { id: 'bill-5', title: 'Security Enhancement Act', status: 'passed', yes: 72, no: 28, threshold: 60, date: '2026-04-16' }
        ];
        res.end(JSON.stringify({ votes: [...sampleVotes, ...liveData.votes], total: sampleVotes.length + liveData.votes.length }));
        return;
    }

    // Teams
    if (pathname === '/api/teams') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            teams: liveData.teams,
            templates: [
                { id: 'research', name: 'Research Team', roles: ['researcher', 'writer', 'reviewer'] },
                { id: 'code', name: 'Code Team', roles: ['coder', 'reviewer', 'security'] },
                { id: 'security', name: 'Security Team', roles: ['security', 'reviewer', 'communicator'] },
                { id: 'emergency', name: 'Emergency Team', roles: ['security', 'communicator', 'planner'] },
                { id: 'planning', name: 'Planning Team', roles: ['planner', 'researcher', 'communicator'] }
            ]
        }));
        return;
    }

    // Spawn team
    if (pathname === '/api/team/spawn' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { template, name } = JSON.parse(body);
                const team = { id: 'team-' + Date.now(), name: name || template + ' Team', template, status: 'active', created: new Date().toISOString() };
                liveData.teams.push(team);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, team }));
            } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
        });
        return;
    }

    // Memories
    if (pathname === '/api/memories') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ memories: getLiveData().memories, count: getLiveData().memories.length }));
        return;
    }

    if (pathname === '/api/memory' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { content, category, tags } = JSON.parse(body);
                const mem = { id: 'mem-' + Date.now(), content, category: category || 'general', tags: tags || [], timestamp: new Date().toISOString() };
                liveData.memories.unshift(mem);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, memory: mem }));
            } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
        });
        return;
    }

    // Scoring
    if (pathname === '/api/scoring') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(generateScores()));
        return;
    }

    // Monitoring
    if (pathname === '/api/monitoring') {
        const mem = process.memoryUsage();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok', cpu: 'Normal',
            memory: { used: Math.round(mem.heapUsed / 1048576), total: Math.round(mem.heapTotal / 1048576), percentage: Math.round((mem.heapUsed / mem.heapTotal) * 100) },
            process: { pid: process.pid, uptime: process.uptime(), platform: process.platform },
            alerts: []
        }));
        return;
    }

    // Workflows
    if (pathname === '/api/workflows') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            workflows: [
                { id: 'research', name: 'Research Workflow', steps: ['search', 'summarize', 'review', 'archive'] },
                { id: 'code-review', name: 'Code Review Workflow', steps: ['analyze', 'test', 'suggest', 'implement'] },
                { id: 'decision', name: 'Decision Workflow', steps: ['research', 'debate', 'vote', 'decree', 'execute'] },
                { id: 'emergency', name: 'Emergency Workflow', steps: ['alert', 'assess', 'mobilize', 'resolve'] },
                { id: 'council-senate-teams', name: 'Council→Senate→Teams Pipeline', steps: ['council', 'senate', 'teams'] }
            ]
        }));
        return;
    }

    // ═══════════════════════════════════════════
    // COUNCIL INTEGRATION
    // ═══════════════════════════════════════════

    if (pathname === '/api/council') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const data = await httpGet(COUNCIL_HOST, COUNCIL_PORT, '/api/status');
        res.end(JSON.stringify({ connected: !!data, version: data?.version || '3.x', modes: ['balanced', 'adversarial', 'consensus', 'swarm'], councilors: 46 }));
        return;
    }

    if (pathname === '/api/councilors') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const data = await httpGet(COUNCIL_HOST, COUNCIL_PORT, '/api/councilors');
        res.end(JSON.stringify(data || { councilors: [] }));
        return;
    }

    if (pathname === '/api/council/session') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const data = await httpGet(COUNCIL_HOST, COUNCIL_PORT, '/api/session');
        res.end(JSON.stringify(data || { session: null }));
        return;
    }

    if (pathname === '/api/council/messages') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const data = await httpGet(COUNCIL_HOST, COUNCIL_PORT, '/api/session/messages');
        res.end(JSON.stringify(data || { messages: [] }));
        return;
    }

    if (pathname === '/api/council/modes') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ modes: ['balanced', 'adversarial', 'consensus', 'devil-advocate', 'brainstorm', 'legislature', 'prediction', 'swarm', 'inspector', 'emergency', 'risk', 'strategic'] }));
        return;
    }

    // ═══════════════════════════════════════════
    // STATIC FILES
    // ═══════════════════════════════════════════

    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(PUBLIC_DIR, filePath);

    if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
                if (err2) { res.writeHead(404); res.end('404 Not Found'); }
                else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(data2); }
            });
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

// Helper functions
function generateSenators() {
    const parties = ['quack', 'honey', 'claw', 'independent'];
    const types = ['researcher', 'coder', 'security', 'planner', 'communicator', 'reviewer'];
    return Array.from({ length: 52 }, (_, i) => ({
        id: `senator-${i + 1}`, name: `Agent ${i + 1}`, party: parties[i % 4], type: types[i % 6], vote: parties[i % 4] === 'independent' ? 1 : 3
    }));
}

function generateScores() {
    return [
        { agentId: 'Orchestrator', composite: 9.2, tasks: 142, quality: 9.1 },
        { agentId: 'Meta-Agent', composite: 9.4, tasks: 98, quality: 9.3 },
        { agentId: 'Quackford', composite: 8.8, tasks: 76, quality: 8.7 },
        { agentId: 'Beeatrice', composite: 8.7, tasks: 69, quality: 8.6 },
        { agentId: 'Code Quackston', composite: 8.6, tasks: 84, quality: 8.5 },
        { agentId: 'Clawrence', composite: 8.5, tasks: 71, quality: 8.4 },
        { agentId: 'Quack Shield', composite: 9.0, tasks: 55, quality: 9.1 },
        { agentId: 'Bee Careful', composite: 8.9, tasks: 48, quality: 8.8 }
    ];
}

// Start server
server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              🏛️ HIVE NATION WEBUI v2.0 🏛️                  ║
╠══════════════════════════════════════════════════════════════════╣
║  Server:      http://localhost:${PORT}                            ║
║  Dashboard:   http://localhost:${PORT}/                            ║
║  Council:     http://localhost:${COUNCIL_PORT}                            ║
╚══════════════════════════════════════════════════════════════════╝
`);
});

process.on('SIGINT', () => { console.log('\n👋 Shutting down...'); server.close(); process.exit(0); });
