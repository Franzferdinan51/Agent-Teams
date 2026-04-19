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
const HiveMemory = require('../scripts/hive-memory.js');
const HiveScoring = require('../scripts/hive-scoring.js');
const HiveTrace = require('../scripts/hive-trace.js');
const HiveBudget = require('../scripts/hive-budget.js');
const HiveSkills = require('../skills/hive-skills.js');
const HivePlugins = require('../plugins/hive-plugins.js');
const HiveAutomation = require('../automation/hive-automation.js');
const HiveMonitoring = require('../monitoring/hive-monitoring.js');
const HiveSecurity = require('../security/hive-security.js');
const HiveMulti = require('../multi-instance/hive-multi.js');

// Initialize modules
const memory = new HiveMemory();
const scoring = new HiveScoring();
const trace = new HiveTrace();
const budget = new HiveBudget();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3131;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
// ═══════════════════════════════════════════════════════════

// Memory API
app.get('/api/memory', (req, res) => res.json(memory.api()));
app.get('/api/memory/recall', (req, res) => {
    const results = memory.db.search(req.query.q || '', req.query.category);
    res.json(results);
});
app.post('/api/memory', (req, res) => {
    const { category, content, tags } = req.body;
    res.json(memory.remember({ category, content, tags }));
});
app.get('/api/memory/decisions', (req, res) => {
    const results = memory.decisions.recent(20);
    res.json(results);
});
app.post('/api/memory/decisions', (req, res) => {
    const { context, decision, rationale, agent } = req.body;
    res.json(memory.logDecision({ context, decision, rationale, agent }));
});

// Scoring API
app.get('/api/scoring', (req, res) => {
    const rankings = Object.entries(scoring.scores.rankings)
        .map(([id, stats]) => ({ agentId: id, ...stats }))
        .sort((a, b) => b.composite - a.composite);
    res.json(rankings);
});
app.post('/api/scoring', (req, res) => {
    const { agentId, task, quality, speed, accuracy, usefulness } = req.body;
    res.json(scoring.score({ agentId, task, quality, speed, accuracy, usefulness }));
});

// Trace API
app.get('/api/trace', (req, res) => res.json(trace.traces.slice(-20).reverse()));
app.post('/api/trace/start', (req, res) => res.json(trace.start(req.body.taskId, req.body.task)));
app.post('/api/trace/step', (req, res) => res.json(trace.step(req.body)));
app.post('/api/trace/end', (req, res) => res.json(trace.end(req.body.status)));

// Budget API
app.get('/api/budget', (req, res) => res.json({
    config: budget.config,
    usage: budget.usage,
    limits: budget.limits
}));
app.get('/api/budget/canSpawn', (req, res) => res.json(budget.canSpawn(req.query.agentType)));

// Workflows API
app.get('/api/workflows', (req, res) => {
    const workflows = memory.workflows.recent(20);
    res.json(workflows);
});
app.post('/api/workflows', (req, res) => {
    const { name, description, steps } = req.body;
    res.json(memory.createWorkflow({ name, description, steps }));
});
app.post('/api/workflows/run', (req, res) => {
    const { name } = req.body;
    res.json(memory.runWorkflow(name));
});

// Monitoring API
app.get('/api/monitoring', (req, res) => res.json({
    metrics: monitoring.getSystemMetrics(),
    process: monitoring.getProcessMetrics(),
    alerts: monitoring.checkAlerts()
}));
app.get('/api/monitoring/history', (req, res) => {
    const hours = parseInt(req.query.hours) || 24;
    res.json(monitoring.getHistory(hours));
});

// Security API
app.get('/api/security', (req, res) => res.json({
    keys: security.data.keys,
    access: security.data.accessControl,
    audit: security.data.auditLog.slice(-50)
}));
app.post('/api/security/audit', (req, res) => {
    const { action, user, details } = req.body;
    res.json(security.audit(action, user, details));
});

// Dashboard API
app.get('/api/dashboard', (req, res) => {
    const memStats = memory.db.stats();
    const recentMemories = memory.db.recent(10);
    const recentDecisions = memory.decisions.recent(10);
    const rankings = Object.entries(scoring.scores.rankings)
        .sort((a, b) => b[1].composite - a[1].composite)
        .slice(0, 5);
    const workflows = memory.workflows.recent(5);

    res.json({
        version: '1.8.0',
        memory: { stats: memStats, recent: recentMemories },
        decisions: recentDecisions,
        scoring: rankings,
        workflows,
        uptime: process.uptime(),
        platform: process.platform
    });
});

// Health
app.get('/api/health', (req, res) => res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    version: '1.8.0'
}));

// Serve index.html
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('WebUI not found');
    }
});

// Start server
const monitoring = new (require('../monitoring/hive-monitoring.js'))();
const security = new (require('../security/hive-security.js'))();

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           🏛️ HIVE WEBUI v1.8.0 🏛️                                ║
╠══════════════════════════════════════════════════════════════════╣
║   Production Memory & Decision Making Dashboard                  ║
╚══════════════════════════════════════════════════════════════════╝

🌐 URL: http://localhost:${PORT}
📊 Dashboard: http://localhost:${PORT}/dashboard
🧠 Memory: http://localhost:${PORT}/memory
⚖️ Decisions: http://localhost:${PORT}/decisions
🔄 Workflows: http://localhost:${PORT}/workflows
📊 Monitoring: http://localhost:${PORT}/monitoring
🛡️ Security: http://localhost:${PORT}/security

Press Ctrl+C to stop
`);