#!/usr/bin/env node
/**
 * AI Council Server — Minimal Test Version
 */
const http = require('http');
const url = require('url');

const PORT = process.env.COUNCIL_PORT || 3003;
const LM_STUDIO_URL = 'http://100.68.208.113:1234';
const LM_STUDIO_KEY = 'sk-lm-xWvfQHZF:L8P76SQakhEA95U8DDNf';
const sessions = new Map();
let sessionCounter = 0;

function lmChat(messages, model, maxTokens) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 });
        const req = http.request(`${LM_STUDIO_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LM_STUDIO_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { reject(new Error(`parse error: ${data.slice(0, 200)}`)); }
            });
        });
        req.on('error', reject);
        req.setTimeout(300000, () => { req.destroy(); reject(new Error('timeout')); });
        req.write(body);
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    const pathname = url.parse(req.url).pathname;
    console.log(`${req.method} ${pathname}`);
    
    try {
        if (pathname === '/api/session/start' && req.method === 'POST') {
            const body = await new Promise((resolve, reject) => {
                let data = '';
                req.on('data', chunk => data += chunk);
                req.on('end', () => resolve(data));
                req.on('error', reject);
            });
            
            const { topic, mode = 'standard' } = JSON.parse(body);
            if (!topic) {
                res.writeHead(400, {'Content-Type':'application/json'});
                res.end(JSON.stringify({error:'topic required'}));
                return;
            }
            
            const sessionId = `council-${++sessionCounter}-${Date.now()}`;
            const messages = [
                { role: 'system', content: 'You are the AI Council. Respond briefly.' },
                { role: 'user', content: topic }
            ];
            const result = await lmChat(messages, 'qwen3.5-0.8b', 100);
            const reply = result.choices?.[0]?.message?.content || 'no response';
            
            sessions.set(sessionId, { id: sessionId, topic, mode, status: 'complete', result: reply });
            
            res.writeHead(200, {'Content-Type':'application/json'});
            res.end(JSON.stringify({ session_id: sessionId, status: 'complete' }));
            console.log(`Session ${sessionId} done`);
            return;
        }
        
        if (pathname === '/api/session' && req.method === 'GET') {
            const arr = Array.from(sessions.values()).slice(-5);
            res.writeHead(200, {'Content-Type':'application/json'});
            res.end(JSON.stringify({ sessions: arr }));
            return;
        }
        
        res.writeHead(200, {'Content-Type':'application/json'});
        res.end(JSON.stringify({ status: 'ok', service: 'ai-council' }));
    } catch (err) {
        console.error('Error:', err.message);
        res.writeHead(500, {'Content-Type':'application/json'});
        res.end(JSON.stringify({ error: err.message }));
    }
});

process.on('unhandledRejection', (err) => console.error('UNHANDLED:', err.message));
server.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Council test server on port ${PORT}`);
});