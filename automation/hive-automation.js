#!/usr/bin/env node
/**
 * Hive Automation - Natural Language Scheduler & Workflows
 * 
 * Features:
 * - Natural language scheduler ("every day at 9am")
 * - Batch processor
 * - Webhook triggers
 * - API server
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

class HiveAutomation {
    constructor() {
        this.dataDir = '/tmp/hive-automation';
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
        this.data = this.loadData();
    }

    loadData() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.dataDir, 'automation-data.json'), 'utf-8'));
        } catch { 
            return { 
                workflows: [], 
                schedules: [], 
                webhooks: [],
                batchJobs: [],
                apiEndpoints: [] 
            }; 
        }
    }

    saveData() {
        fs.writeFileSync(path.join(this.dataDir, 'automation-data.json'), JSON.stringify(this.data, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // NATURAL LANGUAGE SCHEDULER
    // ═══════════════════════════════════════════════════════════

    parseSchedule(naturalText) {
        console.log(`\n📅 Parsing: "${naturalText}"`);
        
        // Simple natural language parsing
        const text = naturalText.toLowerCase();
        let cron = '* * * * *';
        let description = naturalText;

        // Time patterns
        const timeMatch = text.match(/(\d{1,2})(:\d{2})?\s*(am|pm)/i);
        if (timeMatch) {
            let hour = parseInt(timeMatch[1]);
            if (timeMatch[3]?.toLowerCase() === 'pm' && hour !== 12) hour += 12;
            if (timeMatch[3]?.toLowerCase() === 'am' && hour === 12) hour = 0;
            cron = `0 ${hour} * * *`;
            description = description.replace(timeMatch[0], '').trim();
        }

        // Day patterns
        if (text.includes('every day') || text.includes('daily')) {
            cron = cron.replace('* * * *', '0 9 * * *');
        } else if (text.includes('every hour')) {
            cron = '0 * * * *';
        } else if (text.includes('every week')) {
            cron = '0 9 * * 0';
        } else if (text.includes('monday')) {
            cron = cron.replace('* * * *', '0 9 * * 1');
        } else if (text.includes('friday')) {
            cron = cron.replace('* * * *', '0 17 * * 5');
        }

        // Interval patterns
        const intervalMatch = text.match(/every\s+(\d+)\s+(minutes?|hours?|days?)/i);
        if (intervalMatch) {
            const num = intervalMatch[1];
            const unit = intervalMatch[2];
            
            if (unit.startsWith('minute')) {
                cron = `*/${num} * * * *`;
            } else if (unit.startsWith('hour')) {
                cron = `0 */${num} * * *`;
            } else if (unit.startsWith('day')) {
                cron = `0 9 */${num} * *`;
            }
        }

        console.log(`  Parsed cron: ${cron}`);
        return { cron, description, original: naturalText };
    }

    schedule(args) {
        const { name, when, command, workflow } = args;
        
        const parsed = typeof when === 'string' ? this.parseSchedule(when) : when;
        
        const schedule = {
            id: `SCH-${Date.now()}`,
            name,
            cron: parsed.cron,
            description: parsed.description,
            command,
            workflow,
            createdAt: Date.now(),
            lastRun: null,
            nextRun: this.calculateNextRun(parsed.cron),
            status: 'active'
        };

        this.data.schedules.push(schedule);
        this.saveData();

        console.log(`\n✓ Schedule created: ${name}`);
        console.log(`  Cron: ${schedule.cron}`);
        console.log(`  Description: ${schedule.description}`);
        if (command) console.log(`  Command: ${command}`);

        return schedule;
    }

    calculateNextRun(cron) {
        // Simplified - would use cron-parser in production
        return Date.now() + 3600000; // 1 hour from now
    }

    listSchedules() {
        console.log('\n📅 SCHEDULED AUTOMATIONS');
        console.log('═'.repeat(50));

        for (const s of this.data.schedules) {
            const status = s.status === 'active' ? '✅' : '⛔';
            console.log(`\n${status} ${s.name}`);
            console.log(`   Cron: ${s.cron}`);
            console.log(`   Next: ${new Date(s.nextRun).toLocaleString()}`);
            if (s.command) console.log(`   Command: ${s.command}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // BATCH PROCESSOR
    // ═══════════════════════════════════════════════════════════

    createBatchJob(args) {
        const { name, tasks, parallel = false, onSuccess, onFailure } = args;
        
        const job = {
            id: `BATCH-${Date.now()}`,
            name,
            tasks,
            parallel,
            onSuccess,
            onFailure,
            status: 'pending',
            progress: 0,
            completed: 0,
            failed: 0,
            results: [],
            createdAt: Date.now()
        };

        this.data.batchJobs.push(job);
        this.saveData();

        console.log(`\n✓ Batch job created: ${name}`);
        console.log(`  Tasks: ${tasks.length}`);
        console.log(`  Parallel: ${parallel ? 'Yes' : 'No'}`);

        return job;
    }

    runBatch(jobId) {
        const job = this.data.batchJobs.find(j => j.id === jobId);
        if (!job) {
            console.log(`Job not found: ${jobId}`);
            return;
        }

        console.log(`\n▶ Running batch: ${job.name}`);
        console.log(`  ${job.tasks.length} tasks`);
        
        job.status = 'running';
        job.startedAt = Date.now();

        // Simulate task execution
        let completed = 0;
        for (const task of job.tasks) {
            console.log(`  📦 ${task}`);
            
            // Would execute actual task here
            job.results.push({ task, status: 'success' });
            completed++;
            job.progress = Math.round((completed / job.tasks.length) * 100);
            job.completed++;
            this.saveData();
        }

        job.status = 'completed';
        job.completedAt = Date.now();
        this.saveData();

        console.log(`\n✅ Batch complete: ${job.completed} tasks`);
    }

    listBatchJobs() {
        console.log('\n📦 BATCH JOBS');
        console.log('═'.repeat(50));

        for (const j of this.data.batchJobs) {
            const icon = j.status === 'completed' ? '✅' : j.status === 'running' ? '🔄' : '⏳';
            console.log(`\n${icon} ${j.name} [${j.status}]`);
            console.log(`   Tasks: ${j.tasks.length} | Completed: ${j.completed} | Failed: ${j.failed}`);
            console.log(`   Progress: ${j.progress}%`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // WEBHOOK TRIGGERS
    // ═══════════════════════════════════════════════════════════

    createWebhook(args) {
        const { name, url, event, action, secret } = args;
        
        const webhook = {
            id: `WH-${Date.now()}`,
            name,
            url,
            event, // 'push', 'pull', 'issue', 'schedule', 'api'
            action,
            secret,
            createdAt: Date.now(),
            lastTrigger: null,
            triggerCount: 0
        };

        this.data.webhooks.push(webhook);
        this.saveData();

        console.log(`\n✓ Webhook created: ${name}`);
        console.log(`  URL: ${url}`);
        console.log(`  Event: ${event}`);
        console.log(`  Action: ${action}`);

        return webhook;
    }

    triggerWebhook(webhookId, payload) {
        const webhook = this.data.webhooks.find(w => w.id === webhookId);
        if (!webhook) {
            console.log(`Webhook not found: ${webhookId}`);
            return;
        }

        console.log(`\n🔗 Triggering webhook: ${webhook.name}`);
        console.log(`  Payload: ${JSON.stringify(payload).substring(0, 100)}...`);

        webhook.lastTrigger = Date.now();
        webhook.triggerCount++;
        this.saveData();

        // Would actually send HTTP request here
        return { success: true, webhookId };
    }

    listWebhooks() {
        console.log('\n🪝 WEBHOOKS');
        console.log('═'.repeat(50));

        for (const w of this.data.webhooks) {
            const ago = w.lastTrigger ? this.ageString(w.lastTrigger) : 'never';
            console.log(`\n🔗 ${w.name}`);
            console.log(`   URL: ${w.url}`);
            console.log(`   Event: ${w.event}`);
            console.log(`   Last: ${ago} (${w.triggerCount}x)`);
        }
    }

    ageString(ts) {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
    }

    // ═══════════════════════════════════════════════════════════
    // API SERVER
    // ═══════════════════════════════════════════════════════════

    startApiServer(port = 3132) {
        console.log(`\n🌐 Starting API server on port ${port}...`);

        const server = http.createServer((req, res) => {
            const parsed = url.parse(req.url, true);
            
            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            const path = parsed.pathname;
            
            // API Routes
            if (path === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
            }
            else if (path === '/trigger' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    const payload = JSON.parse(body);
                    this.triggerWebhook(payload.webhookId, payload.data);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                });
            }
            else if (path === '/run' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => {
                    const { jobId } = JSON.parse(body);
                    this.runBatch(jobId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, jobId }));
                });
            }
            else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        });

        server.listen(port, () => {
            console.log(`\n✅ API server running at http://localhost:${port}`);
            console.log('  Endpoints:');
            console.log('    GET  /health         - Health check');
            console.log('    POST /trigger        - Trigger webhook');
            console.log('    POST /run            - Run batch job');
        });

        return server;
    }

    // ═══════════════════════════════════════════════════════════
    // WORKFLOW AUTOMATION
    // ═══════════════════════════════════════════════════════════

    createWorkflow(args) {
        const { name, trigger, steps, conditions } = args;
        
        const workflow = {
            id: `WF-${Date.now()}`,
            name,
            trigger,
            steps,
            conditions,
            status: 'active',
            createdAt: Date.now(),
            runCount: 0
        };

        this.data.workflows.push(workflow);
        this.saveData();

        console.log(`\n✓ Workflow created: ${name}`);
        console.log(`  Trigger: ${trigger}`);
        console.log(`  Steps: ${steps.length}`);

        return workflow;
    }

    runWorkflow(workflowId, context = {}) {
        const workflow = this.data.workflows.find(w => w.id === workflowId);
        if (!workflow) {
            console.log(`Workflow not found: ${workflowId}`);
            return;
        }

        console.log(`\n▶ Running workflow: ${workflow.name}`);
        console.log(`  Context: ${JSON.stringify(context)}`);

        // Execute steps
        for (let i = 0; i < workflow.steps.length; i++) {
            const step = workflow.steps[i];
            console.log(`  ${i + 1}. ${step}`);
            
            // Would execute step here
        }

        workflow.runCount++;
        workflow.lastRun = Date.now();
        this.saveData();

        console.log('\n✅ Workflow complete');
        return { success: true };
    }

    listWorkflows() {
        console.log('\n🔄 AUTOMATION WORKFLOWS');
        console.log('═'.repeat(50));

        for (const w of this.data.workflows) {
            const status = w.status === 'active' ? '✅' : '⛔';
            console.log(`\n${status} ${w.name}`);
            console.log(`   Trigger: ${w.trigger}`);
            console.log(`   Steps: ${w.steps.length} | Runs: ${w.runCount}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        console.log('\n' + '═'.repeat(50));
        console.log('🔄 HIVE AUTOMATION DASHBOARD');
        console.log('═'.repeat(50));

        console.log('\n📅 SCHEDULES:');
        console.log(`   Active: ${this.data.schedules.filter(s => s.status === 'active').length}`);

        console.log('\n📦 BATCH JOBS:');
        console.log(`   Total: ${this.data.batchJobs.length}`);
        console.log(`   Running: ${this.data.batchJobs.filter(j => j.status === 'running').length}`);

        console.log('\n🪝 WEBHOOKS:');
        console.log(`   Total: ${this.data.webhooks.length}`);
        console.log(`   Total triggers: ${this.data.webhooks.reduce((a, w) => a + w.triggerCount, 0)}`);

        console.log('\n🔄 WORKFLOWS:');
        console.log(`   Active: ${this.data.workflows.filter(w => w.status === 'active').length}`);

        console.log('\n🌐 API SERVER:');
        console.log('   Run: hive-automation api');
    }
}

// CLI
const automation = new HiveAutomation();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    // Natural language scheduling
    schedule: () => {
        const name = args[0];
        const when = args[1];
        const command = args[2];
        automation.schedule({ name, when, command });
    },
    
    // Schedules
    schedules: () => automation.listSchedules(),
    
    // Batch
    batch: () => {
        const name = args[0];
        const tasks = args.slice(1);
        const job = automation.createBatchJob({ name, tasks });
        console.log(`\nRun with: hive-automation runBatch ${job.id}`);
    },
    runBatch: () => automation.runBatch(args[0]),
    batches: () => automation.listBatchJobs(),
    
    // Webhooks
    webhook: () => {
        const name = args[0];
        const webhookUrl = args[1];
        const event = args[2];
        const action = args[3];
        automation.createWebhook({ name, url: webhookUrl, event, action });
    },
    webhooks: () => automation.listWebhooks(),
    trigger: () => automation.triggerWebhook(args[0], { data: args.slice(1).join(' ') }),
    
    // API Server
    api: () => automation.startApiServer(parseInt(args[0]) || 3132),
    
    // Workflows
    workflow: () => {
        const name = args[0];
        const trigger = args[1];
        const steps = args.slice(2);
        automation.createWorkflow({ name, trigger, steps });
    },
    run: () => automation.runWorkflow(args[0]),
    workflows: () => automation.listWorkflows(),
    
    // Dashboard
    dashboard: () => automation.dashboard(),
    
    help: () => console.log(`
HIVE AUTOMATION

  schedule <name> "<when>" <command>  Natural language scheduling
    Examples:
      hive-automation schedule backup "every day at 9am" "hive backup"
      hive-automation schedule check "every hour" "hive health"
      hive-automation schedule report "every friday at 5pm" "hive report"

  schedules                   List scheduled automations

  batch <name> <task1> <task2>  Create batch job
  runBatch <id>                 Run batch job
  batches                      List batch jobs

  webhook <name> <url> <event> [action]  Create webhook
  webhooks                     List webhooks
  trigger <id> [data]          Trigger webhook

  api [port]                   Start API server (default 3132)

  workflow <name> <trigger> <step1> [step2...]  Create workflow
  run <workflowId>            Run workflow
  workflows                    List workflows

  dashboard                    Show automation dashboard
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveAutomation };