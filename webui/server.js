/**
 * Hive WebUI - Modern Dashboard
 *
 * Full-featured web interface for all Hive modules:
 * - Memory & Decision Making
 * - Skills & Plugins
 * - Automation & Workflows
 * - Monitoring & Security
 * - Multi-Instance Support
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// Load Hive modules
let HiveMemory, HiveScoring, HiveTrace, HiveBudget, HiveSkills, HivePlugins, HiveAutomation, HiveMonitoring, HiveSecurity, HiveMulti;

try { HiveMemory = require('../scripts/hive-memory.js'); } catch(e) { console.warn('hive-memory not found'); }
try { HiveScoring = require('../scripts/hive-scoring.js'); } catch(e) { console.warn('hive-scoring not found'); }
try { HiveTrace = require('../scripts/hive-trace.js'); } catch(e) { console.warn('hive-trace not found'); }
try { HiveBudget = require('../scripts/hive-budget.js'); } catch(e) { console.warn('hive-budget not found'); }
try { HiveSkills = require('../skills/hive-skills.js'); } catch(e) { console.warn('hive-skills not found'); }
try { HivePlugins = require('../plugins/hive-plugins.js'); } catch(e) { console.warn('hive-plugins not found'); }
try { HiveAutomation = require('../automation/hive-automation.js'); } catch(e) { console.warn('hive-automation not found'); }
try { HiveMonitoring = require('../monitoring/hive-monitoring.js'); } catch(e) { console.warn('hive-monitoring not found'); }
try { HiveSecurity = require('../security/hive-security.js'); } catch(e) { console.warn('hive-security not found'); }
try { HiveMulti = require('../multi-instance/hive-multi.js'); } catch(e) { console.warn('hive-multi not found'); }

const memory = HiveMemory ? new HiveMemory() : null;
const scoring = HiveScoring ? new HiveScoring() : null;
const trace = HiveTrace ? new HiveTrace() : null;
const budget = HiveBudget ? new HiveBudget() : null;
const monitoring = HiveMonitoring ? new (require('../monitoring/hive-monitoring.js'))() : null;
const security = HiveSecurity ? new (require('../security/hive-security.js'))() : null;

const app = express();
const PORT = process.env.PORT || 3131;

// ─── CORS ───
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Health ───
app.get('/api/health', (req, res) => res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.8.0'
}));

// ─── Dashboard ───
app.get('/api/dashboard', (req, res) => {
    try {
        const memStats = memory && memory.db ? memory.db.stats() : {};
        const recentMemories = memory && memory.db ? memory.db.recent(10) : [];
        const recentDecisions = memory && memory.decisions ? memory.decisions.recent(10) : [];
        const rankings = scoring && scoring.scores && scoring.scores.rankings
            ? Object.entries(scoring.scores.rankings)
                .sort((a, b) => b[1].composite - a[1].composite)
                .slice(0, 5)
                .map(([id, stats]) => ({ agentId: id, ...stats }))
            : [];
        const workflows = memory && memory.workflows ? memory.workflows.recent(5) : [];

        res.json({
            version: '1.8.0',
            memory: { stats: memStats, recent: recentMemories },
            decisions: recentDecisions,
            scoring: rankings,
            workflows,
            uptime: process.uptime(),
            platform: process.platform
        });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Memory API ───
app.get('/api/memory', (req, res) => {
    try {
        if (!memory || !memory.api) return res.json([]);
        res.json(memory.api());
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/memory/recall', (req, res) => {
    try {
        if (!memory || !memory.db) return res.json([]);
        const results = memory.db.search(req.query.q || '', req.query.category);
        res.json(results);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/memory', (req, res) => {
    try {
        if (!memory || !memory.remember) return res.status(500).json({ error: 'Memory module not available' });
        const { category, content, tags } = req.body;
        res.json(memory.remember({ category, content, tags }));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/memory/decisions', (req, res) => {
    try {
        if (!memory || !memory.decisions) return res.json([]);
        const results = memory.decisions.recent(20);
        res.json(results);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/memory/decisions', (req, res) => {
    try {
        if (!memory || !memory.logDecision) return res.status(500).json({ error: 'Memory module not available' });
        const { context, decision, rationale, agent } = req.body;
        res.json(memory.logDecision({ context, decision, rationale, agent }));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Scoring API ───
app.get('/api/scoring', (req, res) => {
    try {
        if (!scoring || !scoring.scores || !scoring.scores.rankings) return res.json([]);
        const rankings = Object.entries(scoring.scores.rankings)
            .map(([id, stats]) => ({ agentId: id, ...stats }))
            .sort((a, b) => b.composite - a.composite);
        res.json(rankings);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/scoring', (req, res) => {
    try {
        if (!scoring || !scoring.score) return res.status(500).json({ error: 'Scoring module not available' });
        const { agentId, task, quality, speed, accuracy, usefulness } = req.body;
        res.json(scoring.score({ agentId, task, quality, speed, accuracy, usefulness }));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Trace API ───
app.get('/api/trace', (req, res) => {
    try {
        if (!trace || !trace.traces) return res.json([]);
        res.json(trace.traces.slice(-20).reverse());
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/trace/start', (req, res) => {
    try {
        if (!trace) return res.status(500).json({ error: 'Trace module not available' });
        res.json(trace.start(req.body.taskId, req.body.task));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/trace/step', (req, res) => {
    try {
        if (!trace) return res.status(500).json({ error: 'Trace module not available' });
        res.json(trace.step(req.body));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/trace/end', (req, res) => {
    try {
        if (!trace) return res.status(500).json({ error: 'Trace module not available' });
        res.json(trace.end(req.body.status));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Budget API ───
app.get('/api/budget', (req, res) => {
    try {
        if (!budget) return res.json({ config: {}, usage: {}, limits: {} });
        res.json({ config: budget.config, usage: budget.usage, limits: budget.limits });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/budget/canSpawn', (req, res) => {
    try {
        if (!budget || !budget.canSpawn) return res.json({ canSpawn: true });
        res.json(budget.canSpawn(req.query.agentType));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Workflows API ───
app.get('/api/workflows', (req, res) => {
    try {
        if (!memory || !memory.workflows) return res.json([]);
        const workflows = memory.workflows.recent(20);
        res.json(workflows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/workflows', (req, res) => {
    try {
        if (!memory || !memory.createWorkflow) return res.status(500).json({ error: 'Memory module not available' });
        const { name, description, steps } = req.body;
        res.json(memory.createWorkflow({ name, description, steps }));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/workflows/run', (req, res) => {
    try {
        if (!memory || !memory.runWorkflow) return res.status(500).json({ error: 'Memory module not available' });
        const { name } = req.body;
        res.json(memory.runWorkflow(name));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Monitoring API ───
app.get('/api/monitoring', (req, res) => {
    try {
        if (!monitoring) return res.json({ metrics: {}, process: {}, alerts: [] });
        res.json({
            metrics: monitoring.getSystemMetrics ? monitoring.getSystemMetrics() : {},
            process: monitoring.getProcessMetrics ? monitoring.getProcessMetrics() : { pid: process.pid, uptime: process.uptime(), platform: process.platform },
            alerts: monitoring.checkAlerts ? monitoring.checkAlerts() : []
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/monitoring/history', (req, res) => {
    try {
        if (!monitoring || !monitoring.getHistory) return res.json([]);
        const hours = parseInt(req.query.hours) || 24;
        res.json(monitoring.getHistory(hours));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Security API ───
app.get('/api/security', (req, res) => {
    try {
        if (!security) return res.json({ keys: {}, access: {}, audit: [] });
        res.json({
            keys: security.data ? security.data.keys : {},
            access: security.data ? security.data.accessControl : {},
            audit: security.data && security.data.auditLog ? security.data.auditLog.slice(-50) : []
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/security/audit', (req, res) => {
    try {
        if (!security || !security.audit) return res.status(500).json({ error: 'Security module not available' });
        const { action, user, details } = req.body;
        res.json(security.audit(action, user, details));
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Serve index.html for all non-API routes ───
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('<html><body style="font-family:sans-serif;background:#0a0e17;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="color:#ef4444">404</h1><p>index.html not found in public/</p><a href="https://github.com/Franzferdinan51/Agent-Teams" style="color:#6366f1">Get the full build</a></div></body></html>');
    }
});

// ─── Start ───
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🏛️ HIVE WEBUI v1.8.0 🏛️                          ║
╠══════════════════════════════════════════════════════════════╣
║   Production Memory & Decision Making Dashboard              ║
╚══════════════════════════════════════════════════════════════╝

🌐 URL: http://localhost:${PORT}
📊 Dashboard: http://localhost:${PORT}

Press Ctrl+C to stop
`);
});
