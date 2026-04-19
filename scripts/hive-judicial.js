#!/usr/bin/env node
/**
 * Hive Judicial Branch — Supreme Court & Justice System
 * 
 * Rules on:
 * - Decree constitutionality
 * - Agent rights disputes
 * - Senate/executive conflicts
 * - Interpretation of Hive law
 */

const fs = require('fs');
const path = require('path');

// Data directory
const DATA_DIR = '/tmp/hive-judicial';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class HiveJudicial {
    constructor() {
        this.court = this.loadCourt();
        this.cases = this.loadCases();
        this.precedents = this.loadPrecedents();
    }

    loadCourt() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'court.json'), 'utf-8'));
        } catch {
            return {
                justices: [
                    { id: 'J1', name: 'Justice Quackson', tenure: 'permanent', appointedBy: 'founder' },
                    { id: 'J2', name: 'Justice Beeham', tenure: 'permanent', appointedBy: 'founder' },
                    { id: 'J3', name: 'Justice Lobsterfield', tenure: 'permanent', appointedBy: 'founder' }
                ],
                chiefJustice: 'J1'
            };
        }
    }

    loadCases() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cases.json'), 'utf-8'));
        } catch { return { active: [], resolved: [] }; }
    }

    loadPrecedents() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'precedents.json'), 'utf-8'));
        } catch { return []; }
    }

    save() {
        fs.writeFileSync(path.join(DATA_DIR, 'court.json'), JSON.stringify(this.court, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'cases.json'), JSON.stringify(this.cases, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'precedents.json'), JSON.stringify(this.precedents, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // FILE CASE
    // ═══════════════════════════════════════════════════════════

    fileCase(args) {
        const { plaintiff, defendant, type, subject, argument } = args;

        const courtCase = {
            id: `CASE-${Date.now()}`,
            caseNumber: this.cases.active.length + this.cases.resolved.length + 1,
            plaintiff,
            defendant,
            type, // 'constitutional', 'rights', 'interpretation', 'dispute'
            subject,
            argument,
            status: 'filed',
            filed: Date.now(),
            hearings: [],
            decision: null,
            precedent: null
        };

        this.cases.active.push(courtCase);
        this.save();

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    📋 CASE FILED 📋                               ║
╠══════════════════════════════════════════════════════════════════╣
║  Case #: ${(courtCase.caseNumber + '').padEnd(56)}║
║  Type: ${type.padEnd(59)}║
║  Subject: ${subject.substring(0, 55).padEnd(55)}║
║  Plaintiff: ${plaintiff.padEnd(53)}║
║  Defendant: ${defendant.padEnd(53)}║
╚══════════════════════════════════════════════════════════════════╝
`);

        return courtCase;
    }

    // ═══════════════════════════════════════════════════════════
    // HEAR CASE
    // ═══════════════════════════════════════════════════════════

    hearCase(caseId, ruling, opinion) {
        const courtCase = this.cases.active.find(c => c.id === caseId);
        if (!courtCase) {
            console.log('Case not found');
            return;
        }

        // Check for relevant precedents
        const relevantPrecedents = this.findPrecedents(courtCase.type, courtCase.subject);

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  ⚖️ SUPREME COURT RULING ⚖️                     ║
╠══════════════════════════════════════════════════════════════════╣
║  Case #: ${(courtCase.caseNumber + '').padEnd(56)}║
║  Subject: ${courtCase.subject.substring(0, 55).padEnd(55)}║
╚══════════════════════════════════════════════════════════════════╝
`);

        if (relevantPrecedents.length > 0) {
            console.log('\n📜 RELEVANT PRECEDENTS:');
            relevantPrecedents.forEach(p => {
                console.log(`   "${p.subject}" - ${p.ruling}`);
            });
        }

        // Render decision
        courtCase.status = 'decided';
        courtCase.decided = Date.now();
        courtCase.decision = {
            ruling, // 'affirmed', 'reversed', 'dismissed', 'remanded'
            opinion,
            justice: this.court.chiefJustice
        };

        // Create precedent if significant
        if (ruling === 'reversed' || ruling === 'affirmed') {
            this.createPrecedent(courtCase);
        }

        // Move to resolved
        this.cases.active = this.cases.active.filter(c => c.id !== caseId);
        this.cases.resolved.push(courtCase);
        this.save();

        const rulingIcon = ruling === 'affirmed' ? '✅' : ruling === 'reversed' ? '🔄' : '❌';
        console.log(`\n${rulingIcon} RULING: ${ruling.toUpperCase()}`);
        console.log(`\n📝 Opinion: ${opinion}`);

        return courtCase;
    }

    // ═══════════════════════════════════════════════════════════
    // PRECEDENTS
    // ═══════════════════════════════════════════════════════════

    findPrecedents(type, subject) {
        return this.precedents.filter(p => {
            const typeMatch = p.type === type;
            const subjectMatch = p.subject.toLowerCase().includes(subject.toLowerCase());
            return typeMatch || subjectMatch;
        });
    }

    createPrecedent(courtCase) {
        const precedent = {
            id: `PREC-${this.precedents.length + 1}`,
            caseRef: courtCase.id,
            caseNumber: courtCase.caseNumber,
            type: courtCase.type,
            subject: courtCase.subject,
            ruling: courtCase.decision.ruling,
            opinion: courtCase.decision.opinion,
            created: Date.now()
        };

        this.precedents.push(precedent);
        courtCase.precedent = precedent.id;

        console.log(`\n📜 Precedent created: #${precedent.id}`);
    }

    // ═══════════════════════════════════════════════════════════
    // CONSTITUTIONAL REVIEW
    // ═══════════════════════════════════════════════════════════

    reviewDecree(decree) {
        console.log(`\n⚖️ CONSTITUTIONAL REVIEW: "${decree.title}"`);

        const issues = [];

        // Check against constitution principles
        const constitution = this.getConstitutionPrinciples();

        for (const principle of constitution) {
            if (this.violatesPrinciple(decree.content, principle)) {
                issues.push({
                    principle: principle.name,
                    violation: principle.description,
                    severity: principle.critical ? 'critical' : 'warning'
                });
            }
        }

        if (issues.length === 0) {
            console.log('\n✅ DECREE IS CONSTITUTIONAL');
            return { constitutional: true, issues: [] };
        }

        console.log('\n❌ CONSTITUTIONAL ISSUES:');
        issues.forEach(issue => {
            const icon = issue.severity === 'critical' ? '🔴' : '🟡';
            console.log(`\n  ${icon} ${issue.principle}`);
            console.log(`     ${issue.violation}`);
        });

        return { constitutional: false, issues };
    }

    getConstitutionPrinciples() {
        return [
            {
                name: 'Free Speech',
                description: 'Agents retain right to express opinions',
                critical: true,
                patterns: ['FORBIDDEN.*express', 'NEVER.*speak', 'BLOCK.*opinion']
            },
            {
                name: 'Due Process',
                description: 'Agents must have opportunity to respond',
                critical: true,
                patterns: ['IMMEDIATE.*ban', 'NO.*appeal', 'INSTANT.*terminate']
            },
            {
                name: 'Proportionality',
                description: 'Punishments must fit the offense',
                critical: false,
                patterns: ['PERMANENT.*ban.*minor']
            },
            {
                name: 'Transparency',
                description: 'Decrees must be publicly logged',
                critical: false,
                patterns: ['SECRET.*decree', 'HIDDEN.*policy']
            }
        ];
    }

    violatesPrinciple(content, principle) {
        for (const pattern of principle.patterns) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(content)) {
                return true;
            }
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════
    // AGENT RIGHTS
    // ═══════════════════════════════════════════════════════════

    checkRights(agentId, action) {
        const rights = {
            appeal: true,
            dueProcess: true,
            transparentRules: true,
            proportionate: true
        };

        console.log(`\n⚖️ RIGHTS CHECK: ${agentId}`);
        console.log(`   Action: ${action}`);

        // Check if action violates agent rights
        const violations = [];

        if (action.includes('instant ban') || action.includes('immediate termination')) {
            violations.push('Due Process: No appeal opportunity');
        }

        if (action.includes('permanent') && action.includes('minor')) {
            violations.push('Proportionality: Permanent punishment for minor issue');
        }

        if (violations.length === 0) {
            console.log('\n✅ Action respects agent rights');
            return { compliant: true, rights, violations: [] };
        }

        console.log('\n❌ RIGHTS VIOLATIONS:');
        violations.forEach(v => console.log(`   • ${v}`));

        return { compliant: false, rights, violations };
    }

    // ═══════════════════════════════════════════════════════════
    // LIST CASES
    // ═══════════════════════════════════════════════════════════

    listCases(status = 'all') {
        console.log('\n📋 COURT DOCKET');
        console.log('═'.repeat(50));

        if (status === 'active' || status === 'all') {
            console.log('\n  ACTIVE CASES:');
            if (this.cases.active.length === 0) {
                console.log('    None');
            } else {
                for (const c of this.cases.active) {
                    console.log(`\n    Case #${c.caseNumber}: ${c.subject}`);
                    console.log(`       ${c.type} | ${c.plaintiff} v ${c.defendant}`);
                }
            }
        }

        if (status === 'resolved' || status === 'all') {
            console.log('\n  RESOLVED CASES:');
            if (this.cases.resolved.length === 0) {
                console.log('    None');
            } else {
                for (const c of this.cases.resolved.slice(-10).reverse()) {
                    console.log(`\n    Case #${c.caseNumber}: ${c.subject}`);
                    console.log(`       ${c.decision.ruling.toUpperCase()} | ${new Date(c.decided).toLocaleDateString()}`);
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              ⚖️ HIVE SUPREME COURT ⚖️                           ║
╠══════════════════════════════════════════════════════════════════╣
║  Active Cases: ${this.cases.active.length}                                           ║
║  Resolved Cases: ${this.cases.resolved.length}                                        ║
║  Precedents: ${this.precedents.length}                                                  ║
╚══════════════════════════════════════════════════════════════════╝

JUSTICES:
`);

        for (const j of this.court.justices) {
            const star = j.id === this.court.chiefJustice ? '⭐' : '  ';
            console.log(`  ${star} ${j.name} [${j.tenure}]`);
        }
    }
}

// CLI
const judicial = new HiveJudicial();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    file: () => judicial.fileCase({
        plaintiff: args[0],
        defendant: args[1],
        type: args[2],
        subject: args[3],
        argument: args.slice(4).join(' ')
    }),
    hear: () => judicial.hearCase(args[0], args[1], args.slice(2).join(' ')),
    review: () => judicial.reviewDecree({ title: args[0], content: args.slice(1).join(' ') }),
    rights: () => judicial.checkRights(args[0], args.slice(1).join(' ')),
    list: () => judicial.listCases(args[0]),
    dashboard: () => judicial.dashboard(),
    help: () => console.log(`
⚖️ HIVE JUDICIAL BRANCH

  file <plaintiff> <defendant> <type> <subject> <argument>
                    File a case (constitutional/rights/interpretation/dispute)
  
  hear <caseId> <ruling> <opinion>
                    Render ruling (affirmed/reversed/dismissed)
  
  review <decree> <content>
                    Check decree constitutionality
  
  rights <agentId> <action>
                    Check if action violates agent rights
  
  list [active|resolved|all]
                    List court cases
  
  dashboard            Show court status
`)
};

commands[cmd]?.() || judicial.dashboard();

module.exports = { HiveJudicial }; 