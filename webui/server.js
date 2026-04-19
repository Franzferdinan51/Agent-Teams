#!/usr/bin/env node
/**
 * Hive Nation WebUI Server
 * Serves the dashboard at http://localhost:3131
 * Uses built-in http module (no external dependencies)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3131;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);

    // Parse URL
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Route handling
    let filePath;
    
    if (pathname === '/api/dashboard') {
        // Return mock dashboard data
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            version: '1.9.4',
            uptime: process.uptime(),
            memory: { stats: { total: 42 } },
            scoring: [
                { agentId: 'Orchestrator', composite: 9.2 },
                { agentId: 'Meta-Agent', composite: 9.4 },
                { agentId: 'Researcher', composite: 8.7 },
                { agentId: 'Coder', composite: 8.5 },
                { agentId: 'Security', composite: 8.9 }
            ],
            decisions: [
                { decision: 'Adopted weighted voting system', category: 'governance' },
                { decision: 'Memory pruning strategy approved', category: 'technical' }
            ]
        }));
        return;
    }

    if (pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        return;
    }

    if (pathname === '/api/memory') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ memories: [], count: 0 }));
        return;
    }

    if (pathname === '/api/scoring') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
            { agentId: 'Orchestrator', composite: 9.2 },
            { agentId: 'Meta-Agent', composite: 9.4 },
            { agentId: 'Researcher', composite: 8.7 },
            { agentId: 'Coder', composite: 8.5 },
            { agentId: 'Security', composite: 8.9 },
            { agentId: 'Reviewer', composite: 8.1 },
            { agentId: 'Writer', composite: 7.8 }
        ]));
        return;
    }

    // Serve static files
    filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(PUBLIC_DIR, filePath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Try index.html for SPA routing
            fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
                if (err2) {
                    res.writeHead(404);
                    res.end('404 Not Found - Run: node webui/server.js');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data2);
                }
            });
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              🏛️ HIVE NATION WEBUI 🏛️                          ║
╠══════════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                        ║
║  Dashboard:         http://localhost:${PORT}/                        ║
║  Press Ctrl+C to stop                                           ║
╚══════════════════════════════════════════════════════════════════╝

📊 Features:
   • Overview Dashboard
   • Senate & Decrees
   • Voting System
   • Agent Roster
   • Team Management
   • Workflow Templates
   • Command Reference

⚠️  Note: This uses built-in http (no express needed)
`);
});

process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    server.close();
    process.exit(0);
});
