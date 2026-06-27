#!/usr/bin/env node
/**
 * Hive Nation - Governance Workflow Engine
 * 
 * Complete Council → Senate → Teams integration:
 * 
 * 1. COUNCIL deliberates on an issue
 * 2. COUNCIL reaches consensus/recommendation
 * 3. SENATE converts recommendation into binding decree
 * 4. TEAMS execute per the decree
 * 
 * This creates a proper governance pipeline where ideas are:
 * - Debated by diverse councilors
 * - Turned into law by Senate
 * - Executed by teams
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const COUNCIL_HOST = 'localhost';
const COUNCIL_PORT = 3006;
const COUNCIL_API = `http://${COUNCIL_HOST}:${COUNCIL_PORT}/api`;

const DATA_DIR = path.join(__dirname, '..', 'data', 'workflow');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// State
let state = {
    workflows: [],
    recommendations: [],
    enactedDecrees: []
};
const STATE_FILE = path.join(DATA_DIR, 'governance-state.json');

if (fs.existsSync(STATE_FILE)) {
    try {
        state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    } catch (e) {}
}

function saveState() {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ═══════════════════════════════════════════════════════════════════
// COUNCIL CLIENT
// ═══════════════════════════════════════════════════════════════════

function councilApi(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: COUNCIL_HOST,
            port: COUNCIL_PORT,
            path: `/api${path}`,
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { resolve({ error: 'Parse error' }); }
            });
        });
        
        req.on('error', () => resolve({ error: 'Council not available' }));
        req.setTimeout(5000, () => { req.destroy(); resolve({ error: 'Timeout' }); });
        
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// ═══════════════════════════════════════════════════════════════════
// SENATE CLIENT
// ═══════════════════════════════════════════════════════════════════

let Senate;
try {
    const SenateModule = require('./hive-senate-complete.js');
    Senate = new SenateModule.SenateComplete();
} catch (e) {
    Senate = null;
}

// ═══════════════════════════════════════════════════════════════════
// TEAMS CLIENT
// ═══════════════════════════════════════════════════════════════════

let Teams;
try {
    Teams = require('./hive-teams.js');
} catch (e) {
    Teams = null;
}

// ═══════════════════════════════════════════════════════════════════
// GOVERNANCE WORKFLOW
// ═══════════════════════════════════════════════════════════════════

class GovernanceWorkflow {
    constructor(options = {}) {
        this.id = 'workflow-' + Date.now();
        this.topic = options.topic || 'Untitled';
        this.description = options.description || '';
        this.status = 'pending';
        this.stages = {
            council: { status: 'pending', result: null },
            senate: { status: 'pending', decree: null },
            teams: { status: 'pending', assignments: [] }
        };
        this.created = new Date().toISOString();
        this.updated = new Date().toISOString();
    }
    
    // Stage 1: Council Deliberation
    async runCouncil(topic, mode = 'balanced') {
        console.log(`\n🏛️ STAGE 1: COUNCIL DELIBERATION`);
        console.log(`   Topic: ${topic}`);
        console.log(`   Mode: ${mode}`);
        
        this.stages.council.status = 'in_progress';
        this.updated = new Date().toISOString();
        
        // Check if council is available
        const health = await councilApi('/health');
        if (health.error) {
            console.log(`   ❌ Council not available: ${health.error}`);
            console.log(`   💡 Start council: node ~/Desktop/AI-Bot-Council-Concensus/server.js`);
            this.stages.council.status = 'failed';
            return null;
        }
        
        try {
            // Start session
            const session = await councilApi('/session/start', 'POST', {
                topic,
                mode,
                topic
            });
            
            // Wait for deliberation
            console.log(`   ⏳ Deliberation in progress...`);
            await new Promise(r => setTimeout(r, 3000));
            
            // Get messages
            const messages = await councilApi('/session/messages?limit=20');
            
            // Extract consensus
            const consensus = this.extractConsensus(messages.messages || []);
            
            this.stages.council.status = 'completed';
            this.stages.council.result = {
                sessionId: session.session?.id,
                messages: messages.messages || [],
                consensus,
                timestamp: new Date().toISOString()
            };
            
            console.log(`   ✅ Council complete!`);
            console.log(`   📊 Consensus: ${consensus.verdict} (${consensus.supportPct}% support)`);
            console.log(`   📝 Recommendation: ${consensus.summary}`);
            
            this.updated = new Date().toISOString();
            return this.stages.council.result;
            
        } catch (e) {
            console.log(`   ❌ Council error: ${e.message}`);
            this.stages.council.status = 'failed';
            return null;
        }
    }
    
    extractConsensus(messages) {
        let support = 0, oppose = 0, abstain = 0;
        let summary = '';
        
        messages.forEach(m => {
            const text = (m.content || '').toLowerCase();
            if (text.includes('support') || text.includes('agree') || text.includes('yes') || text.includes('approve')) support++;
            else if (text.includes('oppose') || text.includes('disagree') || text.includes('no') || text.includes('reject')) oppose++;
            else abstain++;
        });
        
        const total = support + oppose + abstain || 1;
        
        if (support > oppose) {
            summary = `Council APPROVES with ${support} supporting voices. ${oppose} opposed.`;
            if (support > oppose * 2) summary += ' STRONG consensus.';
        } else if (oppose > support) {
            summary = `Council REJECTS with ${oppose} opposing voices. ${support} supporting.`;
        } else {
            summary = `Council is DIVIDED: ${support} support, ${oppose} oppose.`;
        }
        
        return {
            verdict: support > oppose ? 'APPROVED' : oppose > support ? 'REJECTED' : 'DIVIDED',
            support,
            oppose,
            abstain,
            supportPct: Math.round((support / total) * 100),
            summary
        };
    }
    
    // Stage 2: Senate Decree
    async runSenate(authority = 'duckets') {
        console.log(`\n⚖️ STAGE 2: SENATE DECREE`);
        
        if (!this.stages.council.result) {
            console.log(`   ❌ Council stage not complete`);
            return null;
        }
        
        const consensus = this.stages.council.result.consensus;
        
        if (consensus.verdict !== 'APPROVED') {
            console.log(`   ⏭️  Skipping - Council rejected proposal`);
            this.stages.senate.status = 'skipped';
            return null;
        }
        
        this.stages.senate.status = 'in_progress';
        this.updated = new Date().toISOString();
        
        if (!Senate) {
            console.log(`   ❌ Senate not available`);
            this.stages.senate.status = 'failed';
            return null;
        }
        
        try {
            // Create decree from council recommendation
            const decreeText = this.generateDecreeText();
            
            const decree = Senate.issueDecree(
                decreeText,
                authority,
                'universal',
                'high'
            );
            
            this.stages.senate.status = 'completed';
            this.stages.senate.decree = {
                ...decree,
                source: 'council-recommendation',
                workflowId: this.id
            };
            
            console.log(`   ✅ Decree enacted!`);
            console.log(`   📜 "${decreeText.substring(0, 60)}..."`);
            
            this.updated = new Date().toISOString();
            return this.stages.senate.decree;
            
        } catch (e) {
            console.log(`   ❌ Senate error: ${e.message}`);
            this.stages.senate.status = 'failed';
            return null;
        }
    }
    
    generateDecreeText() {
        const consensus = this.stages.council.result.consensus;
        const topic = this.topic;
        
        // Generate binding decree language from council consensus
        return `Pursuant to Council deliberation on "${topic}", all agents SHALL ${this.getActionFromTopic(topic)}. ${consensus.summary}`;
    }
    
    getActionFromTopic(topic) {
        const t = topic.toLowerCase();
        if (t.includes('security')) return 'implement enhanced security measures and conduct regular audits';
        if (t.includes('privacy')) return 'encrypt all sensitive data and protect user information';
        if (t.includes('performance')) return 'optimize system performance and monitor resource usage';
        if (t.includes('backup')) return 'maintain regular backups and test restoration procedures';
        if (t.includes('monitoring')) return 'implement comprehensive monitoring and alerting';
        if (t.includes('code') || t.includes('review')) return 'conduct peer code reviews before deployment';
        if (t.includes('testing')) return 'maintain minimum test coverage and run automated tests';
        return 'follow best practices and maintain quality standards';
    }
    
    // Stage 3: Team Execution
    async runTeams(template = 'code') {
        console.log(`\n🐝 STAGE 3: TEAM EXECUTION`);
        
        if (!this.stages.senate.decree) {
            console.log(`   ⏭️  Skipping - No decree enacted`);
            return null;
        }
        
        this.stages.teams.status = 'in_progress';
        this.updated = new Date().toISOString();
        
        if (!Teams) {
            console.log(`   ❌ Teams not available`);
            this.stages.teams.status = 'failed';
            return null;
        }
        
        try {
            // Spawn execution team
            const team = Teams.spawnTeam(template, `Execution-${this.id.split('-')[1]}`);
            
            // Add task from decree
            const task = team.addTask(
                `Execute decree: ${this.stages.senate.decree.content || this.topic}`,
                'high'
            );
            
            this.stages.teams.status = 'completed';
            this.stages.teams.assignments = [{
                teamId: team.id,
                teamName: team.name,
                taskId: task.id,
                decree: this.stages.senate.decree.id
            }];
            
            console.log(`   ✅ Team spawned!`);
            console.log(`   🐝 ${team.name} (${team.id})`);
            console.log(`   📋 Task: ${task.id}`);
            
            this.updated = new Date().toISOString();
            return this.stages.teams.assignments;
            
        } catch (e) {
            console.log(`   ❌ Teams error: ${e.message}`);
            this.stages.teams.status = 'failed';
            return null;
        }
    }
    
    // Run full pipeline
    async run() {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`🏛️ GOVERNANCE WORKFLOW: ${this.topic}`);
        console.log(`${'═'.repeat(60)}`);
        
        // Stage 1: Council
        await this.runCouncil(this.topic);
        
        // Stage 2: Senate
        await this.runSenate();
        
        // Stage 3: Teams
        await this.runTeams();
        
        // Summary
        this.status = 'completed';
        this.showSummary();
        
        return this;
    }
    
    showSummary() {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`📊 WORKFLOW SUMMARY: ${this.topic}`);
        console.log(`${'═'.repeat(60)}`);
        console.log(`Status: ${this.status}`);
        console.log(`\n1. 🏛️ Council: ${this.stages.council.status.toUpperCase()}`);
        if (this.stages.council.result) {
            console.log(`   ${this.stages.council.result.consensus.summary}`);
        }
        console.log(`\n2. ⚖️ Senate: ${this.stages.senate.status.toUpperCase()}`);
        if (this.stages.senate.decree) {
            console.log(`   Decree: ${this.stages.senate.decree.id}`);
        }
        console.log(`\n3. 🐝 Teams: ${this.stages.teams.status.toUpperCase()}`);
        if (this.stages.teams.assignments.length > 0) {
            this.stages.teams.assignments.forEach(a => {
                console.log(`   ${a.teamName} assigned task ${a.taskId}`);
            });
        }
        console.log(`\n${'═'.repeat(60)}\n`);
    }
    
    toJSON() {
        return {
            id: this.id,
            topic: this.topic,
            status: this.status,
            stages: this.stages,
            created: this.created,
            updated: this.updated
        };
    }
}

// ═══════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════

function printBanner() {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║        🏛️ HIVE NATION GOVERNANCE WORKFLOW ENGINE 🏛️        ║
║                                                          ║
║    Council → Senate → Teams                               ║
║    Debates → Laws → Execution                             ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

// ═══════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const cmd = args[0] || '';

// Show help if no args or --help
if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    printBanner();
    console.log(`
📖 USAGE:

  node hive-workflow.js <command> [args]

🛠️  COMMANDS:

  pipeline <topic>     Run full Council→Senate→Teams pipeline
                      Example: node hive-workflow.js pipeline "Enhance security"
  
  council <topic>     Request Council deliberation only
                      Example: node hive-workflow.js council "Should we use 2FA?"
  
  senate <content>    Issue a Senate decree directly
                      Example: node hive-workflow.js senate "All MUST use 2FA"
  
  teams [template] [name]   Spawn an execution team
                      Examples:
                        node hive-workflow.js teams
                        node hive-workflow.js teams security
                        node hive-workflow.js teams research "Research Team"
  
  status [id]         Show workflow status
                      Example: node hive-workflow.js status
  
  dashboard           Show full governance overview
  
  --help, -h, help    Show this help message

📋 TEMPLATES:
  research, code, security, emergency, planning, analysis, devops, swarm

🧠 COUNCIL DELIBERATION MODES:
  balanced, adversarial, consensus, devil-advocate, brainstorm, legislature, prediction, swarm, inspector

🔗 WEBUI:
  http://localhost:3131

🌐 For more info: https://github.com/Franzferdinan51/Agent-Teams
`);
    process.exit(0);
}

if (cmd === 'run' || cmd === 'execute') {
    const topic = args.slice(1).join(' ') || 'Standard governance review';
    
    printBanner();
    
    const workflow = new GovernanceWorkflow({ topic });
    state.workflows.push(workflow);
    saveState();
    
    workflow.run().then(() => {
        state.workflows = state.workflows.map(w => w.id === workflow.id ? workflow : w);
        saveState();
    }).catch(console.error);
}

else if (cmd === 'status' || cmd === 'info') {
    printBanner();
    
    const workflowId = args[1];
    if (workflowId) {
        const w = state.workflows.find(w => w.id === workflowId);
        if (w) {
            w.showSummary ? w.showSummary() : console.log(JSON.stringify(w, null, 2));
        } else {
            console.log(`\n❌ Workflow ${workflowId} not found\n`);
        }
    } else {
        console.log('\n📋 RECENT WORKFLOWS:\n');
        state.workflows.slice(-10).reverse().forEach(w => {
            console.log(`   ${w.id} | ${w.topic.substring(0, 40)} | ${w.status}`);
        });
        console.log('');
    }
}

else if (cmd === 'council' || cmd === 'deliberate') {
    const topic = args.slice(1).join(' ') || 'General governance matter';
    const mode = args.find(a => a.startsWith('--mode='))?.split('=')[1] || 'balanced';
    
    printBanner();
    
    const workflow = new GovernanceWorkflow({ topic });
    workflow.runCouncil(topic, mode).then(result => {
        if (result) {
            console.log(`\n✅ Council deliberation complete!`);
            console.log(`📊 ${result.consensus.summary}`);
        }
    }).catch(console.error);
}

else if (cmd === 'senate' || cmd === 'decree') {
    const content = args.slice(1).join(' ');
    
    if (!content) {
        console.log('\n❌ Usage: hive-workflow senate <decree-content>\n');
        process.exit(1);
    }
    
    if (!Senate) {
        console.log('\n❌ Senate not available\n');
        process.exit(1);
    }
    
    printBanner();
    
    const decree = Senate.issueDecree(content, 'duckets', 'universal', 'high');
    console.log(`\n✅ Decree enacted!`);
    console.log(`📜 ID: ${decree.id}`);
    console.log(`   "${content}"\n`);
}

else if (cmd === 'teams' || cmd === 'execute') {
    const template = args[1] || 'code';
    const name = args.slice(2).join(' ') || null;
    
    if (!Teams) {
        console.log('\n❌ Teams not available\n');
        process.exit(1);
    }
    
    printBanner();
    
    const team = Teams.spawnTeam(template, name);
    console.log(`\n✅ Team spawned!`);
    console.log(`🐝 ${team.name}`);
    console.log(`   Members: ${team.members.length}`);
    console.log(`   Roles: ${team.roles.join(', ')}\n`);
}

else if (cmd === 'dashboard') {
    printBanner();
    
    console.log(`📊 GOVERNANCE DASHBOARD\n`);
    console.log(`Total Workflows: ${state.workflows.length}`);
    console.log(`Completed: ${state.workflows.filter(w => w.status === 'completed').length}`);
    console.log(`Pending: ${state.workflows.filter(w => w.status === 'pending').length}`);
    
    console.log(`\n🗳️ RECENT DECREES:\n`);
    if (Senate && Senate.activeDecrees) {
        Senate.activeDecrees.slice(-5).reverse().forEach(d => {
            console.log(`   ${d.id} | ${(d.content || '').substring(0, 50)}...`);
        });
    }
    
    console.log(`\n🐝 ACTIVE TEAMS:\n`);
    if (Teams) {
        const teams = Teams.listTeams({ status: 'active' });
        teams.forEach(t => {
            console.log(`   ${t.icon} ${t.name} | ${t.members.length} members`);
        });
    }
    
    console.log('');
}

else if (cmd === 'pipeline') {
    // Run full pipeline
    const topic = args.slice(1).join(' ') || 'Implement enhanced security measures';
    
    printBanner();
    
    const workflow = new GovernanceWorkflow({ topic });
    state.workflows.push(workflow);
    
    workflow.run().then(() => {
        saveState();
    }).catch(console.error);
}

else {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║        🏛️ HIVE NATION GOVERNANCE WORKFLOW 🏛️                ║
║                                                          ║
║  Full Pipeline: Council → Senate → Teams                 ║
║                                                          ║
╠══════════════════════════════════════════════════════════════════╣
║                                                          ║
║  PIPELINE:                                               ║
║    pipeline <topic>     Run full Council→Senate→Teams     ║
║                                                          ║
║  STAGES:                                                 ║
║    council <topic>     Just Council deliberation        ║
║    senate <content>    Issue Senate decree              ║
║    teams [template]     Spawn execution team            ║
║                                                          ║
║  INFO:                                                   ║
║    status [id]          Show workflow status            ║
║    dashboard            Full governance overview         ║
║                                                          ║
║  EXAMPLES:                                               ║
║    node hive-workflow.js pipeline "Enhance security"      ║
║    node hive-workflow.js council "Should we use 2FA?"    ║
║    node hive-workflow.js senate "All MUST use 2FA"       ║
║    node hive-workflow.js teams security "Security Squad"  ║
║                                                          ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

// Export
module.exports = { GovernanceWorkflow, state };
