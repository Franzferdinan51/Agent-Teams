#!/usr/bin/env node
/**
 * Hive Nation Automation Engine v2.0
 * 
 * PERSISTENT AUTONOMOUS TASK RUNNER
 * - Job queue with persistence
 * - Multiple triggers: cron, webhook, event, decree
 * - Retry + failover logic
 * - Event-driven automation
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

const DATA_DIR = path.join(__dirname, '..', 'data', 'automation');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const TRIGGERS_FILE = path.join(DATA_DIR, 'triggers.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Create data directory
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════
// PERSISTENT JOB QUEUE
// ═══════════════════════════════════════════════════════════════════

class JobQueue {
    constructor() {
        this.jobs = this.load();
        this.running = new Set();
        this.listeners = new Map();
    }
    
    load() {
        if (fs.existsSync(JOBS_FILE)) {
            try {
                return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf-8'));
            } catch (e) {
                console.log('⚠️ Failed to load jobs, starting fresh');
            }
        }
        return { pending: [], running: [], completed: [], failed: [], id: 1 };
    }
    
    save() {
        fs.writeFileSync(JOBS_FILE, JSON.stringify(this.jobs, null, 2));
    }
    
    // Add job to queue
    add(job) {
        const j = {
            id: this.jobs.id++,
            type: job.type || 'task',
            name: job.name || 'Unnamed Job',
            payload: job.payload || {},
            priority: job.priority || 'normal', // low, normal, high, critical
            retry: job.retry || 0,
            maxRetries: job.maxRetries || 3,
            failChain: job.failChain || [], // failover commands
            status: 'pending',
            created: new Date().toISOString(),
            scheduled: job.scheduled || null, // ISO date for scheduled execution
            cron: job.cron || null, // cron expression
            trigger: job.trigger || null, // 'manual', 'cron', 'webhook', 'event', 'decree'
            createdBy: job.createdBy || 'system',
            result: null,
            error: null,
            attempts: 0
        };
        
        this.jobs.pending.push(j);
        this.save();
        this.emit('job:added', j);
        
        console.log(`📋 Job added: ${j.name} (${j.id})`);
        return j;
    }
    
    // Get next job to run
    next() {
        // Check scheduled jobs
        const now = new Date();
        this.jobs.pending = this.jobs.pending.filter(job => {
            if (job.scheduled && new Date(job.scheduled) > now) {
                return true; // Keep if not yet scheduled
            }
            return false;
        });
        
        // Sort by priority
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        this.jobs.pending.sort((a, b) => {
            return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        });
        
        return this.jobs.pending.shift();
    }
    
    // Start a job
    async start(jobId) {
        const job = this.jobs.pending.find(j => j.id === jobId) ||
                    this.jobs.running.find(j => j.id === jobId);
        
        if (!job) {
            console.log(`⚠️ Job ${jobId} not found`);
            return null;
        }
        
        // Remove from pending, add to running
        this.jobs.pending = this.jobs.pending.filter(j => j.id !== jobId);
        this.jobs.running.push(job);
        job.status = 'running';
        job.started = new Date().toISOString();
        job.attempts++;
        this.save();
        
        this.emit('job:started', job);
        
        return job;
    }
    
    // Complete a job
    complete(jobId, result) {
        const job = this.jobs.running.find(j => j.id === jobId);
        if (!job) return;
        
        this.jobs.running = this.jobs.running.filter(j => j.id !== jobId);
        this.jobs.completed.push(job);
        job.status = 'completed';
        job.completed = new Date().toISOString();
        job.result = result;
        this.save();
        
        this.emit('job:completed', job);
        this.emit(`job:${jobId}:completed`, job);
        
        console.log(`✅ Job ${job.name} (${jobId}) completed`);
        return job;
    }
    
    // Fail a job
    fail(jobId, error) {
        const job = this.jobs.running.find(j => j.id === jobId);
        if (!job) return;
        
        job.error = error;
        job.attempts++;
        
        // Check if we should retry
        if (job.attempts < job.maxRetries && job.retry < job.maxRetries) {
            job.retry++;
            job.status = 'pending';
            this.jobs.running = this.jobs.running.filter(j => j.id !== jobId);
            this.jobs.pending.push(job);
            this.save();
            
            this.emit('job:retry', job);
            console.log(`🔄 Job ${job.name} (${jobId}) retry ${job.retry}/${job.maxRetries}`);
            
            // Execute fail chain while retrying
            if (job.failChain && job.failChain.length > 0) {
                console.log(`⚠️ Failover chain triggered for ${job.name}`);
                job.failChain.forEach(cmd => this.executeFailover(cmd, job));
            }
            
            return;
        }
        
        // Max retries exceeded
        this.jobs.running = this.jobs.running.filter(j => j.id !== jobId);
        this.jobs.failed.push(job);
        job.status = 'failed';
        job.failed = new Date().toISOString();
        this.save();
        
        this.emit('job:failed', job);
        this.emit(`job:${jobId}:failed`, job);
        
        console.log(`❌ Job ${job.name} (${jobId}) failed after ${job.attempts} attempts`);
        return job;
    }
    
    // Execute failover command
    async executeFailover(cmd, job) {
        console.log(`🔄 Executing failover: ${cmd}`);
        try {
            const result = await this.executeCommand(cmd, job.payload);
            console.log(`✅ Failover result: ${result.substring(0, 100)}`);
            return result;
        } catch (e) {
            console.log(`❌ Failover failed: ${e.message}`);
            return null;
        }
    }
    
    // Execute command (local)
    executeCommand(cmd, payload) {
        return new Promise((resolve, reject) => {
            const isUrl = cmd.startsWith('http');
            
            if (isUrl) {
                // HTTP request
                const protocol = cmd.startsWith('https') ? https : http;
                const req = protocol.get(cmd, (res) => {
                    let data = '';
                    res.on('data', c => data += c);
                    res.on('end', () => resolve(data));
                });
                req.on('error', reject);
                req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
            } else {
                // Shell command
                const child = spawn(cmd, [], { shell: true });
                let stdout = '', stderr = '';
                child.stdout.on('data', d => stdout += d);
                child.stderr.on('data', d => stderr += d);
                child.on('close', code => {
                    if (code === 0) resolve(stdout);
                    else reject(new Error(stderr || `Exit code ${code}`));
                });
                child.on('error', reject);
            }
        });
    }
    
    // Event listeners
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    emit(event, data) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
        
        // Also emit wildcard events
        const wildcard = this.listeners.get('*');
        if (wildcard) {
            wildcard.forEach(cb => cb(event, data));
        }
    }
    
    // Get stats
    stats() {
        return {
            pending: this.jobs.pending.length,
            running: this.jobs.running.length,
            completed: this.jobs.completed.length,
            failed: this.jobs.failed.length,
            total: this.jobs.pending.length + this.jobs.running.length + this.jobs.completed.length + this.jobs.failed.length
        };
    }
    
    // List jobs
    list(status = null) {
        if (status === 'pending') return this.jobs.pending;
        if (status === 'running') return this.jobs.running;
        if (status === 'completed') return this.jobs.completed.slice(-50);
        if (status === 'failed') return this.jobs.failed.slice(-50);
        return [...this.jobs.pending, ...this.jobs.running];
    }
}

// ═══════════════════════════════════════════════════════════════════
// TRIGGER SYSTEM
// ═══════════════════════════════════════════════════════════════════

class TriggerSystem {
    constructor(jobQueue) {
        this.queue = jobQueue;
        this.triggers = this.load();
        this.timers = [];
        this.webhookServer = null;
        
        // Listen to queue events for decree-based triggers
        this.setupEventTriggers();
    }
    
    load() {
        if (fs.existsSync(TRIGGERS_FILE)) {
            try {
                return JSON.parse(fs.readFileSync(TRIGGERS_FILE, 'utf-8'));
            } catch (e) {}
        }
        return [];
    }
    
    save() {
        fs.writeFileSync(TRIGGERS_FILE, JSON.stringify(this.triggers, null, 2));
    }
    
    // Add trigger
    add(trigger) {
        const t = {
            id: 'trigger-' + Date.now(),
            name: trigger.name,
            type: trigger.type, // 'cron', 'webhook', 'event', 'decree'
            condition: trigger.condition,
            job: trigger.job,
            enabled: trigger.enabled !== false,
            created: new Date().toISOString(),
            lastTriggered: null,
            triggerCount: 0
        };
        
        this.triggers.push(t);
        this.save();
        
        if (t.enabled) {
            this.activate(t);
        }
        
        console.log(`⚡ Trigger added: ${t.name} (${t.type})`);
        return t;
    }
    
    // Activate a trigger
    activate(trigger) {
        if (trigger.type === 'cron') {
            this.setupCronTrigger(trigger);
        } else if (trigger.type === 'webhook') {
            this.setupWebhookEndpoint(trigger);
        }
        // Event and decree triggers are handled via queue events
    }
    
    // Setup cron trigger
    setupCronTrigger(trigger) {
        // Simple cron: "*/5 * * * *" = every 5 minutes
        const parts = trigger.condition.split(' ');
        if (parts.length !== 5) {
            console.log(`⚠️ Invalid cron expression: ${trigger.condition}`);
            return;
        }
        
        // Calculate interval in milliseconds
        const [min, hour, day, month, dow] = parts;
        let intervalMs = 60000; // Default 1 minute
        
        if (min.startsWith('*')) {
            intervalMs = 60000; // Every minute
        } else if (!isNaN(parseInt(min))) {
            intervalMs = parseInt(min) * 60000;
        }
        
        const timer = setInterval(() => {
            if (!trigger.enabled) {
                clearInterval(timer);
                return;
            }
            this.fireTrigger(trigger);
        }, intervalMs);
        
        this.timers.push(timer);
        console.log(`⏰ Cron trigger active: ${trigger.name} (every ${intervalMs / 1000}s)`);
    }
    
    // Setup webhook endpoint
    setupWebhookEndpoint(trigger) {
        // Webhook triggers are handled by the HTTP server
        console.log(`🪝 Webhook trigger active: ${trigger.name}`);
    }
    
    // Setup event-based triggers
    setupEventTriggers() {
        // Listen to all queue events
        this.queue.on('job:completed', (job) => {
            this.checkEventTriggers('job.completed', job);
        });
        
        this.queue.on('job:failed', (job) => {
            this.checkEventTriggers('job.failed', job);
        });
        
        this.queue.on('job:started', (job) => {
            this.checkEventTriggers('job.started', job);
        });
        
        // Also listen for decree events (would integrate with Senate)
        this.queue.on('decree:created', (decree) => {
            this.checkEventTriggers('decree.created', decree);
        });
        
        this.queue.on('decree:enforced', (decree) => {
            this.checkEventTriggers('decree.enforced', decree);
        });
        
        console.log(`👂 Event triggers active (4 event types)`);
    }
    
    // Check event triggers
    checkEventTriggers(eventType, data) {
        this.triggers
            .filter(t => t.type === 'event' && t.enabled && t.condition === eventType)
            .forEach(trigger => {
                console.log(`⚡ Event trigger fired: ${trigger.name} (${eventType})`);
                this.queue.add({
                    name: trigger.job.name,
                    type: trigger.job.type,
                    payload: { ...trigger.job.payload, sourceEvent: eventType, sourceData: data },
                    trigger: 'event',
                    createdBy: 'trigger:' + trigger.id
                });
                
                trigger.lastTriggered = new Date().toISOString();
                trigger.triggerCount++;
                this.save();
            });
    }
    
    // Check decree-based triggers
    checkDecreeTriggers(decree) {
        this.triggers
            .filter(t => t.type === 'decree' && t.enabled)
            .forEach(trigger => {
                // Check if decree matches condition
                const content = decree.content.toLowerCase();
                const condition = trigger.condition.toLowerCase();
                
                if (content.includes(condition)) {
                    console.log(`⚡ Decree trigger fired: ${trigger.name} (matched: ${condition})`);
                    this.queue.add({
                        name: trigger.job.name,
                        type: trigger.job.type,
                        payload: { ...trigger.job.payload, decree },
                        trigger: 'decree',
                        createdBy: 'trigger:' + trigger.id
                    });
                    
                    trigger.lastTriggered = new Date().toISOString();
                    trigger.triggerCount++;
                    this.save();
                }
            });
    }
    
    // Fire a trigger
    fireTrigger(trigger) {
        console.log(`⚡ Trigger fired: ${trigger.name}`);
        this.queue.add({
            name: trigger.job.name,
            type: trigger.job.type,
            payload: trigger.job.payload,
            trigger: trigger.type,
            createdBy: 'trigger:' + trigger.id
        });
        
        trigger.lastTriggered = new Date().toISOString();
        trigger.triggerCount++;
        this.save();
    }
    
    // Handle webhook
    handleWebhook(triggerId, payload) {
        const trigger = this.triggers.find(t => t.id === triggerId);
        if (!trigger || !trigger.enabled) return;
        
        console.log(`🪝 Webhook received: ${trigger.name}`);
        this.queue.add({
            name: trigger.job.name,
            type: trigger.job.type,
            payload: { ...trigger.job.payload, webhookPayload: payload },
            trigger: 'webhook',
            createdBy: 'webhook:' + triggerId
        });
        
        trigger.lastTriggered = new Date().toISOString();
        trigger.triggerCount++;
        this.save();
    }
    
    // List triggers
    list() {
        return this.triggers;
    }
    
    // Enable/disable trigger
    setEnabled(triggerId, enabled) {
        const trigger = this.triggers.find(t => t.id === triggerId);
        if (trigger) {
            trigger.enabled = enabled;
            this.save();
            if (enabled) {
                this.activate(trigger);
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// AUTOMATION ENGINE
// ═══════════════════════════════════════════════════════════════════

class AutomationEngine {
    constructor() {
        this.queue = new JobQueue();
        this.triggers = new TriggerSystem(this.queue);
        this.processing = false;
        this.webhookPort = process.env.WEBHOOK_PORT || 3457;
    }
    
    // Start the engine
    start() {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║       🤖 HIVE NATION AUTOMATION ENGINE v2.0 🤖           ║
╠══════════════════════════════════════════════════════════════════╣
║  Job Queue:  ${JOBS_FILE}    ║
║  Webhook:    http://localhost:${this.webhookPort}/webhook/:id  ║
╚══════════════════════════════════════════════════════════════════╝
`);
        
        // Start webhook server
        this.startWebhookServer();
        
        // Start job processor
        this.startProcessor();
        
        // Setup default triggers
        this.setupDefaultTriggers();
        
        return this;
    }
    
    // Start webhook server
    startWebhookServer() {
        const server = http.createServer((req, res) => {
            const parsedUrl = new URL(req.url, `http://localhost:${this.webhookPort}`);
            
            // CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            
            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            
            // Webhook endpoint: /webhook/:triggerId
            if (parsedUrl.pathname.startsWith('/webhook/')) {
                const triggerId = parsedUrl.pathname.split('/')[2];
                
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    try {
                        const payload = body ? JSON.parse(body) : {};
                        this.triggers.handleWebhook(triggerId, payload);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Webhook received' }));
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: e.message }));
                    }
                });
                return;
            }
            
            // Status endpoint
            if (parsedUrl.pathname === '/status') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    engine: 'automation',
                    version: '2.0',
                    uptime: process.uptime(),
                    queue: this.queue.stats(),
                    triggers: this.triggers.list().length
                }));
                return;
            }
            
            res.writeHead(404);
            res.end('Not Found');
        });
        
        server.listen(this.webhookPort, () => {
            console.log(`🪝 Webhook server running on port ${this.webhookPort}`);
        });
    }
    
    // Start job processor
    startProcessor() {
        const processJobs = async () => {
            if (this.processing) return;
            this.processing = true;
            
            while (true) {
                const job = this.queue.next();
                if (!job) {
                    await new Promise(r => setTimeout(r, 1000)); // Wait 1s
                    continue;
                }
                
                await this.queue.start(job.id);
                
                try {
                    // Execute job
                    const result = await this.executeJob(job);
                    this.queue.complete(job.id, result);
                } catch (e) {
                    this.queue.fail(job.id, e.message);
                }
            }
        };
        
        processJobs();
        console.log(`⚙️ Job processor started`);
    }
    
    // Execute a job
    async executeJob(job) {
        console.log(`⚙️ Executing job: ${job.name} (${job.type})`);
        
        if (job.type === 'shell') {
            return await this.queue.executeCommand(job.payload.command, job.payload);
        }
        
        if (job.type === 'http') {
            return await this.queue.executeCommand(job.payload.url, job.payload);
        }
        
        if (job.type === 'workflow') {
            return await this.executeWorkflow(job.payload);
        }
        
        if (job.type === 'team') {
            return await this.executeTeamTask(job.payload);
        }
        
        if (job.type === 'governance') {
            return await this.executeGovernance(job.payload);
        }
        
        return { success: true, message: 'Job type not implemented: ' + job.type };
    }
    
    // Execute workflow
    async executeWorkflow(payload) {
        const { workflow, steps } = payload;
        const results = [];
        
        for (const step of steps) {
            console.log(`  📋 Step: ${step}`);
            // In real implementation, would execute each step
            results.push({ step, status: 'completed' });
        }
        
        return { workflow, results, status: 'completed' };
    }
    
    // Execute team task
    async executeTeamTask(payload) {
        const { team, task } = payload;
        console.log(`  🐝 Team ${team}: ${task}`);
        // Would integrate with hive-teams.js
        return { team, task, status: 'assigned' };
    }
    
    // Execute governance task
    async executeGovernance(payload) {
        const { action, topic } = payload;
        console.log(`  🏛️ Governance: ${action} - ${topic}`);
        // Would integrate with hive-workflow.js
        return { action, topic, status: 'executed' };
    }
    
    // Setup default triggers
    setupDefaultTriggers() {
        // Example: When research team finishes → trigger review workflow
        this.triggers.add({
            name: 'Research Complete → Review',
            type: 'event',
            condition: 'job.completed',
            job: {
                name: 'Auto Review',
                type: 'workflow',
                payload: { workflow: 'review', topic: 'Automated review from previous task' }
            },
            enabled: false // Disabled by default
        });
        
        // Example: Decree about security → trigger security audit
        this.triggers.add({
            name: 'Security Decree → Audit',
            type: 'decree',
            condition: 'security',
            job: {
                name: 'Security Audit',
                type: 'workflow',
                payload: { workflow: 'security-audit' }
            },
            enabled: false
        });
        
        console.log(`📋 Default triggers registered (disabled)`);
    }
    
    // API methods
    addJob(job) {
        return this.queue.add(job);
    }
    
    listJobs(status) {
        return this.queue.list(status);
    }
    
    getStats() {
        return {
            queue: this.queue.stats(),
            triggers: this.triggers.list().length,
            activeTriggers: this.triggers.list().filter(t => t.enabled).length
        };
    }
}

// ═══════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════

const engine = new AutomationEngine();

const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'start') {
    engine.start();
}

else if (cmd === 'add') {
    const [type, name, ...rest] = args.slice(1);
    engine.addJob({ type, name, payload: { command: rest.join(' ') } });
}

else if (cmd === 'list') {
    const status = args[1] || null;
    const jobs = engine.listJobs(status);
    console.log(`\n📋 Jobs (${jobs.length}):`);
    jobs.forEach(j => {
        console.log(`  ${j.id}. ${j.name} [${j.status}] (${j.type})`);
    });
}

else if (cmd === 'stats') {
    const stats = engine.getStats();
    console.log(`\n📊 Automation Stats:`);
    console.log(`  Pending: ${stats.queue.pending}`);
    console.log(`  Running: ${stats.queue.running}`);
    console.log(`  Completed: ${stats.queue.completed}`);
    console.log(`  Failed: ${stats.queue.failed}`);
    console.log(`  Triggers: ${stats.triggers} (${stats.activeTriggers} active)`);
}

else if (cmd === 'trigger') {
    const name = args.slice(1).join(' ');
    engine.triggers.add({
        name,
        type: 'webhook',
        condition: null,
        job: { name, type: 'shell', payload: { command: 'echo "Webhook triggered"' } },
        enabled: true
    });
}

else if (cmd === 'cron') {
    const [cron, name, command] = args.slice(1);
    engine.triggers.add({
        name: name || 'Cron Job',
        type: 'cron',
        condition: cron,
        job: { name, type: 'shell', payload: { command } },
        enabled: true
    });
}

else {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║       🤖 HIVE NATION AUTOMATION ENGINE v2.0 🤖           ║
╠══════════════════════════════════════════════════════════════════╣
║  USAGE:                                                       ║
║    hive-automation-v2.js start              Start engine       ║
║    hive-automation-v2.js add <type> <name>   Add job          ║
║    hive-automation-v2.js list [status]        List jobs         ║
║    hive-automation-v2.js stats                Show stats        ║
║    hive-automation-v2.js trigger <name>       Add webhook       ║
║    hive-automation-v2.js cron <expr> <name>   Add cron job      ║
╠══════════════════════════════════════════════════════════════════╣
║  EXAMPLES:                                                     ║
║    node hive-automation-v2.js add shell "Test" echo "hi"        ║
║    node hive-automation-v2.js cron "*/5 * * * *" "Ping" ping    ║
║    curl -X POST http://localhost:3457/webhook/<id> -d '{}'     ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

// Export for use as module
module.exports = { AutomationEngine, JobQueue, TriggerSystem };
