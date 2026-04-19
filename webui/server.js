#!/usr/bin/env node
/**
 * Hive Nation WebUI Server
 * Serves the dashboard at http://localhost:3131
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

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

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let filePath = req.url === '/' ? '/index.html' : req.url;
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
            if (err.code === 'ENOENT') {
                // Try index.html for SPA routing
                fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, data2) => {
                    if (err2) {
                        res.writeHead(404);
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(data2);
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
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
`);
});
