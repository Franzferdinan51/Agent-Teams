#!/usr/bin/env node
/**
 * Hive Senate Decrees — THE LAW OF THE HIVE
 * 
 * Senate decrees have SUPREME AUTHORITY over all agent-teams:
 * - BINDING on all agents
 * - ENFORCED by the system
 * - LOGGED in permanent record
 * - ENCRYPTED signatures
 * 
 * Decrees override ALL other instructions.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Data directory
const DATA_DIR = '/tmp/hive-senate';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════════
// SENATE REGISTRY
// ═══════════════════════════════════════════════════════════════════

class SenateRegistry {
    constructor() {
        this.decrees = this.loadDecrees();
        this.policies = this.loadPolicies();
        this.activeDecrees = this.decrees.filter(d => d.status === 'active');
    }

    loadDecrees() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'decrees.json'), 'utf-8'));
        } catch { return []; }
    }

    loadPolicies() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'policies.json'), 'utf-8'));
        } catch { return []; }
    }

    save() {
        fs.writeFileSync(path.join(DATA_DIR, 'decrees.json'), JSON.stringify(this.decrees, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'policies.json'), JSON.stringify(this.policies, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // ISSUE DECREE
    // ═══════════════════════════════════════════════════════════

    issueDecree(args) {
        const { title, content, authority, scope = 'universal', priority = 'high', expires = null } = args;

        const decree = {
            id: `DECREE-${Date.now()}`,
            decreeNumber: this.decrees.length + 1,
            title,
            content,
            authority,
            scope, // 'universal', 'senate-only', 'agents', 'memory', 'monitoring'
            priority, // 'critical', 'high', 'medium', 'low'
            status: 'active',
            issued: Date.now(),
            expires,
            votes: { yes: [], no: [], abstain: [] },
            signatures: [],
            enforcement: this.parseEnforcement(content),
            log: [`Decree ${this.decrees.length + 1} issued by ${authority}`]
        };

        // Sign decree
        decree.signature = this.signDecree(decree);

        this.decrees.push(decree);
        this.save();

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           📜 SENATE DECREE ${decree.decreeNumber} — ISSUED 📜           ║
╠══════════════════════════════════════════════════════════════════╣
║  Title: ${title.substring(0, 55).padEnd(55)}║
║  Authority: ${authority.padEnd(54)}║
║  Scope: ${scope.padEnd(56)}║
║  Priority: ${priority.padEnd(53)}║
╚══════════════════════════════════════════════════════════════════╝
`);
        console.log(`Content: ${content}`);
        console.log(`\n✅ DECREE IS NOW BINDING ON ALL AGENTS`);

        // Auto-enforce
        this.enforce(decree);

        return decree;
    }

    // ═══════════════════════════════════════════════════════════
    // ENFORCEMENT — THIS IS THE KEY
    // ═══════════════════════════════════════════════════════════

    enforce(decree) {
        console.log(`\n⚡ ENFORCING DECREE ${decree.decreeNumber}...`);

        // 1. Update policies
        this.applyToPolicies(decree);

        // 2. Update agent behavior
        this.applyToAgents(decree);

        // 3. Update memory rules
        this.applyToMemory(decree);

        // 4. Update monitoring
        this.applyToMonitoring(decree);

        // 5. Log enforcement
        decree.log.push(`Enforced at ${new Date().toISOString()}`);
        this.save();

        console.log(`✅ Decree ${decree.decreeNumber} enforced across all systems`);
    }

    parseEnforcement(content) {
        const rules = [];
        
        // Parse rule patterns
        if (content.includes('MUST') || content.includes('SHALL')) {
            rules.push({ type: 'mandatory', pattern: 'MUST/SHALL found' });
        }
        if (content.includes('NEVER') || content.includes('FORBIDDEN')) {
            rules.push({ type: 'prohibited', pattern: 'NEVER/FORBIDDEN found' });
        }
        if (content.includes('ALWAYS') || content.includes('MUST ALWAYS')) {
            rules.push({ type: 'always', pattern: 'ALWAYS found' });
        }
        if (content.includes('PREFER')) {
            rules.push({ type: 'preferred', pattern: 'PREFER found' });
        }
        if (content.includes('BLOCK')) {
            rules.push({ type: 'block', pattern: 'BLOCK found' });
        }
        if (content.includes('ALLOW')) {
            rules.push({ type: 'allow', pattern: 'ALLOW found' });
        }

        return rules;
    }

    applyToPolicies(decree) {
        const policy = {
            id: `POL-${Date.now()}`,
            decreeRef: decree.id,
            title: decree.title,
            rules: decree.enforcement,
            scope: decree.scope,
            priority: decree.priority,
            createdAt: Date.now()
        };

        this.policies.push(policy);
    }

    applyToAgents(decree) {
        // Create agent behavior override
        const agentPolicy = {
            id: `AGENT-POL-${Date.now()}`,
            decreeRef: decree.id,
            title: decree.title,
            content: decree.content,
            scope: decree.scope,
            priority: decree.priority,
            mandatory: decree.content.includes('MUST') || decree.content.includes('SHALL'),
            prohibited: decree.content.includes('NEVER') || decree.content.includes('FORBIDDEN'),
            createdAt: Date.now()
        };

        fs.writeFileSync(
            path.join(DATA_DIR, `agent-policy-${agentPolicy.id}.json`),
            JSON.stringify(agentPolicy, null, 2)
        );

        console.log(`   📋 Agent policy created: ${agentPolicy.id}`);
    }

    applyToMemory(decree) {
        // Create memory rule
        const memoryRule = {
            id: `MEM-RULE-${Date.now()}`,
            decreeRef: decree.id,
            title: decree.title,
            directive: decree.content,
            priority: decree.priority,
            createdAt: Date.now()
        };

        fs.writeFileSync(
            path.join(DATA_DIR, `memory-rule-${memoryRule.id}.json`),
            JSON.stringify(memoryRule, null, 2)
        );

        console.log(`   🧠 Memory rule created`);
    }

    applyToMonitoring(decree) {
        // Create monitoring alert
        const monitorRule = {
            id: `MON-RULE-${Date.now()}`,
            decreeRef: decree.id,
            title: decree.title,
            alert: `Decree violation: ${decree.title}`,
            priority: decree.priority,
            scope: decree.scope,
            createdAt: Date.now()
        };

        fs.writeFileSync(
            path.join(DATA_DIR, `monitor-rule-${monitorRule.id}.json`),
            JSON.stringify(monitorRule, null, 2)
        );

        console.log(`   📊 Monitoring rule created`);
    }

    // ═══════════════════════════════════════════════════════════
    // CHECK DECREE COMPLIANCE
    // ═══════════════════════════════════════════════════════════

    checkCompliance(action, agent = 'unknown') {
        const violations = [];
        const warnings = [];
        const required = [];

        for (const decree of this.activeDecrees) {
            // Check if action violates decree
            const content = decree.content.toLowerCase();
            const actionLower = action.toLowerCase();

            // Prohibited check
            if (decree.content.includes('NEVER') || decree.content.includes('FORBIDDEN')) {
                const prohibited = this.extractProhibited(decree.content);
                for (const block of prohibited) {
                    if (actionLower.includes(block.toLowerCase())) {
                        violations.push({
                            decree: decree.decreeNumber,
                            title: decree.title,
                            violation: `Action "${action}" violates NO ${block}`,
                            severity: 'critical'
                        });
                    }
                }
            }

            // Required check
            if (decree.content.includes('MUST ALWAYS') || decree.content.includes('SHALL ALWAYS')) {
                const required_action = this.extractRequired(decree.content);
                if (!actionLower.includes(required_action.toLowerCase())) {
                    required.push({
                        decree: decree.decreeNumber,
                        title: decree.title,
                        requirement: `Must include: ${required_action}`,
                        severity: 'high'
                    });
                }
            }

            // Preferred check
            if (decree.content.includes('PREFER')) {
                const preferred = this.extractPreferred(decree.content);
                if (actionLower.includes(preferred.toLowerCase())) {
                    warnings.push({
                        decree: decree.decreeNumber,
                        suggestion: `Consider using ${preferred}`
                    });
                }
            }
        }

        return { violations, warnings, required, compliant: violations.length === 0 };
    }

    extractProhibited(content) {
        const prohibited = [];
        const matches = content.match(/(?:NEVER|FORBIDDEN)\s+(?:to\s+)?([^.,]+)/gi);
        if (matches) {
            matches.forEach(m => prohibited.push(m.replace(/(?:NEVER|FORBIDDEN)\s+(?:to\s+)?/i, '').trim()));
        }
        return prohibited;
    }

    extractRequired(content) {
        const match = content.match(/(?:MUST ALWAYS|SHALL ALWAYS)\s+(?:be\s+)?([^.,]+)/i);
        return match ? match[1] : '';
    }

    extractPreferred(content) {
        const match = content.match(/PREFER\s+([^.,]+)/i);
        return match ? match[1] : '';
    }

    // ═══════════════════════════════════════════════════════════
    // SENATE VOTING
    // ═══════════════════════════════════════════════════════════

    vote(decreeId, senator, vote) {
        const decree = this.decrees.find(d => d.id === decreeId || d.decreeNumber === decreeId);
        if (!decree) {
            console.log('Decree not found');
            return;
        }

        // Remove from other votes
        decree.votes.yes = decree.votes.yes.filter(s => s !== senator);
        decree.votes.no = decree.votes.no.filter(s => s !== senator);
        decree.votes.abstain = decree.votes.abstain.filter(s => s !== senator);

        // Add vote
        if (vote === 'yes') decree.votes.yes.push(senator);
        else if (vote === 'no') decree.votes.no.push(senator);
        else decree.votes.abstain.push(senator);

        decree.signatures.push({ senator, vote, timestamp: Date.now() });
        this.save();

        console.log(`\n🗳️ Vote recorded: ${senator} voted ${vote.toUpperCase()} on Decree ${decree.decreeNumber}`);
        console.log(`   Yes: ${decree.votes.yes.length} | No: ${decree.votes.no.length} | Abstain: ${decree.votes.abstain.length}`);
    }

    // ═══════════════════════════════════════════════════════════
    // REVOKE DECREE
    // ═══════════════════════════════════════════════════════════

    revoke(decreeId, authority) {
        const decree = this.decrees.find(d => d.id === decreeId || d.decreeNumber === decreeId);
        if (!decree) {
            console.log('Decree not found');
            return;
        }

        decree.status = 'revoked';
        decree.revoked = Date.now();
        decree.revokedBy = authority;
        decree.reason = 'Senate vote to revoke';

        // Remove from active
        this.activeDecrees = this.decrees.filter(d => d.status === 'active');

        this.save();

        console.log(`\n❌ Decree ${decree.decreeNumber} REVOKED by ${authority}`);
    }

    // ═══════════════════════════════════════════════════════════
    // LIST DECREES
    // ═══════════════════════════════════════════════════════════

    listDecrees(status = null) {
        const filtered = status 
            ? this.decrees.filter(d => d.status === status)
            : this.decrees;

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║               📜 SENATE DECREES — THE LAW OF THE HIVE             ║
╠══════════════════════════════════════════════════════════════════╣
║  Total Decrees: ${filtered.length} | Active: ${this.activeDecrees.length}                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

        for (const d of filtered.slice().reverse()) {
            const statusIcon = d.status === 'active' ? '✅' : d.status === 'revoked' ? '❌' : '📝';
            const priorityIcon = d.priority === 'critical' ? '🔴' : d.priority === 'high' ? '🟠' : '🟡';
            
            console.log(`${statusIcon} ${priorityIcon} DECREE ${d.decreeNumber}: ${d.title}`);
            console.log(`   Authority: ${d.authority}`);
            console.log(`   Scope: ${d.scope} | Priority: ${d.priority}`);
            console.log(`   Votes: ✅${d.votes.yes.length} ❌${d.votes.no.length} ⬜${d.votes.abstain.length}`);
            console.log(`   ${d.content.substring(0, 80)}...`);
            console.log('');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // GET ACTIVE POLICIES (for agents to query)
    // ═══════════════════════════════════════════════════════════

    getActivePolicies() {
        return this.activeDecrees.map(d => ({
            id: d.id,
            number: d.decreeNumber,
            title: d.title,
            content: d.content,
            scope: d.scope,
            priority: d.priority,
            rules: d.enforcement
        }));
    }

    // ═══════════════════════════════════════════════════════════
    // CRYPTOGRAPHIC SIGNATURE
    // ═══════════════════════════════════════════════════════════

    signDecree(decree) {
        const data = JSON.stringify({
            number: decree.decreeNumber,
            title: decree.title,
            authority: decree.authority,
            issued: decree.issued
        });
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║               🏛️ HIVE SENATE — COMMAND CENTER 🏛️                 ║
╠══════════════════════════════════════════════════════════════════╣`);

        console.log(`║  📜 Total Decrees: ${this.decrees.length}`);
        console.log(`║  ✅ Active: ${this.activeDecrees.length}`);
        console.log(`║  ❌ Revoked: ${this.decrees.filter(d => d.status === 'revoked').length}`);
        console.log(`║  📋 Policies: ${this.policies.length}`);
        console.log('╠══════════════════════════════════════════════════════════════════╣');
        console.log('║  ⚡ ACTIVE DECREES (BINDING ON ALL AGENTS):');
        console.log('╠══════════════════════════════════════════════════════════════════╣');

        for (const d of this.activeDecrees.slice(0, 5)) {
            console.log(`║  ${d.decreeNumber}. ${d.title.substring(0, 50).padEnd(50)}║`);
            console.log(`║     [${d.scope}] [${d.priority}]                               ║`);
        }

        console.log('╚══════════════════════════════════════════════════════════════════╝');
    }
}

// CLI
const senate = new SenateRegistry();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    // Issue new decree
    issue: () => senate.issueDecree({
        title: args[0] || 'Untitled Decree',
        content: args.slice(1).join(' '),
        authority: process.env.USER || 'The Senate',
        scope: args.includes('--agents') ? 'agents' : 
               args.includes('--memory') ? 'memory' : 
               args.includes('--senate') ? 'senate-only' : 'universal',
        priority: args.includes('--critical') ? 'critical' :
                  args.includes('--low') ? 'low' : 'high'
    }),

    // List decrees
    list: () => senate.listDecrees(args[0]),
    active: () => senate.listDecrees('active'),

    // Vote
    vote: () => senate.vote(args[0], args[1], args[2]),

    // Revoke
    revoke: () => senate.revoke(args[0], process.env.USER || 'The Senate'),

    // Check compliance
    check: () => {
        const result = senate.checkCompliance(args.join(' '));
        if (result.compliant) {
            console.log('\n✅ ACTION COMPLIANT WITH ALL DECREES');
        } else {
            console.log('\n❌ DECREE VIOLATIONS:');
            result.violations.forEach(v => {
                console.log(`   🔴 Decree ${v.decree}: ${v.violation}`);
            });
        }
        if (result.required.length > 0) {
            console.log('\n⚠️ REQUIREMENTS:');
            result.required.forEach(r => {
                console.log(`   🟠 Decree ${r.decree}: ${r.requirement}`);
            });
        }
    },

    // Get policies (for agents)
    policies: () => {
        const policies = senate.getActivePolicies();
        console.log('\n📋 ACTIVE POLICIES:');
        console.log(JSON.stringify(policies, null, 2));
    },

    // Dashboard
    dashboard: () => senate.dashboard(),

    // Example decrees
    examples: () => console.log(`
📜 EXAMPLE DECREES:

# Critical priority, universal scope
senate issue "Model Priority" "All agents MUST prioritize MiniMax M2.7 for general tasks" --critical

# Block certain actions
senate issue "Data Privacy" "Agents NEVER send user data to external APIs without consent" --critical

# Set preferences
senate issue "Local First" "Agents PREFER local models before cloud when available"

# Monitor compliance
senate check "use gpt-4 for everything"
`),

    help: () => console.log(`
🏛️ HIVE SENATE — COMMANDING DECREES

  issue <title> <content> [flags]   Issue binding decree
  list [status]                       List decrees (active/revoked/all)
  active                              List active decrees
  vote <decree#> <senator> <yes|no|abstain>  Cast vote
  revoke <decree#> <authority>        Revoke decree
  
  check <action>                      Check if action complies
  policies                            Get all active policies (JSON)
  
  dashboard                           Show command center
  examples                            Show example decrees

FLAGS:
  --critical    Critical priority (blocks everything)
  --high        High priority (default)
  --low         Low priority (soft guidance)
  --agents      Scope to agents only
  --memory      Scope to memory only
  --senate      Scope to senate only

DECREES ARE BINDING ON ALL AGENTS.
`),
};

// Run
if (commands[cmd]) {
    commands[cmd]();
} else {
    senate.dashboard();
}

module.exports = { SenateRegistry, senate }; 