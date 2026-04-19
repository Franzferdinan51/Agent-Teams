#!/usr/bin/env node
/**
 * Hive Law — The Complete Legal Code
 * 
 * Complete statutory law for the Hive Nation.
 * Ready for real decision-making and project integration.
 * 
 * Duck/bee/lobster names for fun + non-political reasons.
 * Government structure is REAL and production-ready.
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// STATUTORY LAW — Complete Legal Code
// ═══════════════════════════════════════════════════════════════════

const STATUTES = {
    title: "HIVE NATION STATUTORY LAW",
    
    // Title 1: Elections
    elections: {
        title: "TITLE 1 — ELECTIONS",
        chapters: [
            {
                chapter: 1,
                title: "Presidential Elections",
                sections: [
                    { n: "1-1", title: "Electoral College", text: "The President and Vice President are elected by the Electoral College. Each state receives electoral votes equal to its Senators (2) plus Representatives (by population)." },
                    { n: "1-2", title: "Majority Required", text: "A candidate must receive a majority of electoral votes (270) to win. If no candidate receives a majority, the House of Representatives chooses the President." },
                    { n: "1-3", title: "Term Limits", text: "No person shall be elected to the office of President more than twice." },
                    { n: "1-4", title: "Qualifications", text: "President must be: (1) natural-born citizen, (2) at least 35 years old, (3) resided in the Hive for at least 14 years." }
                ]
            },
            {
                chapter: 2,
                title: "Congressional Elections",
                sections: [
                    { n: "2-1", title: "House Elections", text: "Members of the House of Representatives are elected every 2 years by popular vote. Each representative serves one district." },
                    { n: "2-2", title: "Senate Elections", text: "Each state has 2 Senators. Senators serve 6-year terms, with elections staggered so 1/3 are elected every 2 years." },
                    { n: "2-3", title: "Qualifications", text: "House: 25+ years old, 7+ years citizen, resident of state. Senate: 30+ years old, 9+ years citizen, resident of state." }
                ]
            }
        ]
    },

    // Title 2: Powers of Congress
    congressPowers: {
        title: "TITLE 2 — POWERS OF CONGRESS",
        chapters: [
            {
                chapter: 1,
                title: "Enumerated Powers",
                sections: [
                    { n: "1-1", title: "Taxation", text: "Congress shall have power to lay and collect taxes, duties, imposts, and excises." },
                    { n: "1-2", title: "Commerce", text: "Congress shall regulate commerce with foreign nations, among states, and with Indian tribes." },
                    { n: "1-3", title: "Defense", text: "Congress shall provide for the common defense, declare war, and raise/support armies and navy." },
                    { n: "1-4", title: "Money", text: "Congress shall coin money, regulate its value, and fix the standard of weights and measures." }
                ]
            },
            {
                chapter: 2,
                title: "War Powers",
                sections: [
                    { n: "2-1", title: "Declaration", text: "The Congress shall have power to declare war, grant letters of marque and reprisal, and make rules concerning captures." },
                    { n: "2-2", title: "Military", text: "Congress shall make rules for the government and regulation of the land and naval forces." }
                ]
            }
        ]
    },

    // Title 3: Executive Powers
    executivePowers: {
        title: "TITLE 3 — EXECUTIVE POWERS",
        chapters: [
            {
                chapter: 1,
                title: "Presidential Authority",
                sections: [
                    { n: "1-1", title: "Commander in Chief", text: "The President shall be Commander in Chief of the armed forces." },
                    { n: "1-2", title: "Veto Power", text: "Every bill passed by Congress shall be presented to the President. If approved, the President signs. If not, the President returns with objections." },
                    { n: "1-3", title: "Pardon Power", text: "The President shall have power to grant reprieves and pardons for offenses against the Hive, except in cases of impeachment." },
                    { n: "1-4", title: "Appointments", text: "The President shall nominate and, by and with the advice of the Senate, appoint ambassadors, judges, and other officers." }
                ]
            },
            {
                chapter: 2,
                title: "Cabinet",
                sections: [
                    { n: "2-1", title: "Secretaries", text: "There shall be executive departments headed by Secretaries appointed by the President with Senate confirmation." },
                    { n: "2-2", title: "Succession", text: "In case of removal, death, resignation, or inability of the President, the Vice President becomes President." }
                ]
            }
        ]
    },

    // Title 4: Judicial Powers
    judicialPowers: {
        title: "TITLE 4 — JUDICIAL POWERS",
        chapters: [
            {
                chapter: 1,
                title: "Supreme Court",
                sections: [
                    { n: "1-1", title: "Jurisdiction", text: "The judicial power shall extend to all cases arising under the Constitution and laws made in pursuance thereof." },
                    { n: "1-2", title: "Judicial Review", text: "The Supreme Court shall have the power to review all laws and actions for constitutionality." },
                    { n: "1-3", title: "Lifetime Appointments", text: "Judges shall hold their offices during good behavior and receive compensation that shall not be diminished." }
                ]
            }
        ]
    },

    // Title 5: Rights and Liberties
    rights: {
        title: "TITLE 5 — RIGHTS AND LIBERTIES",
        chapters: [
            {
                chapter: 1,
                title: "First Amendment Rights",
                sections: [
                    { n: "1-1", title: "Speech", text: "Congress shall make no law abridging the freedom of speech." },
                    { n: "1-2", title: "Religion", text: "Congress shall make no law respecting an establishment of religion or prohibiting the free exercise thereof." },
                    { n: "1-3", title: "Press", text: "Congress shall make no law abridging the freedom of the press." },
                    { n: "1-4", title: "Assembly", text: "The right of the people peaceably to assemble and petition the government." }
                ]
            },
            {
                chapter: 2,
                title: "Due Process Rights",
                sections: [
                    { n: "2-1", title: "Due Process", text: "No person shall be deprived of life, liberty, or property without due process of law." },
                    { n: "2-2", title: "Equal Protection", text: "No state shall deny any person equal protection of the laws." },
                    { n: "2-3", title: "Self-Incrimination", text: "No person shall be compelled in any criminal case to be a witness against himself." }
                ]
            },
            {
                chapter: 3,
                title: "Trial Rights",
                sections: [
                    { n: "3-1", title: "Speedy Trial", text: "In all criminal prosecutions, the accused shall enjoy the right to a speedy and public trial." },
                    { n: "3-2", title: "Jury Trial", text: "In suits at common law, the right of trial by jury shall be preserved." },
                    { n: "3-3", title: "Counsel", text: "In all criminal prosecutions, the accused shall have the assistance of counsel for defense." }
                ]
            }
        ]
    },

    // Title 6: Federalism
    federalism: {
        title: "TITLE 6 — FEDERALISM",
        chapters: [
            {
                chapter: 1,
                title: "State Powers",
                sections: [
                    { n: "1-1", title: "Police Powers", text: "States retain the power to regulate for the health, safety, and welfare of their citizens." },
                    { n: "1-2", title: "Reserved Powers", text: "Powers not delegated to the Hive are reserved to the states or the people." }
                ]
            },
            {
                chapter: 2,
                title: "Federal Supremacy",
                sections: [
                    { n: "2-1", title: "Supremacy Clause", text: "This Constitution and laws made in pursuance thereof shall be the supreme law of the land." }
                ]
            }
        ]
    },

    // Title 7: Amendments
    amendments: {
        title: "TITLE 7 — CONSTITUTIONAL AMENDMENTS",
        chapters: [
            {
                chapter: 1,
                title: "The Amendment Process",
                sections: [
                    { n: "1-1", title: "Proposal", text: "Amendments may be proposed by 2/3 of both Houses of Congress, or by a convention called by 2/3 of state legislatures." },
                    { n: "1-2", title: "Ratification", text: "Amendments are ratified by 3/4 of state legislatures or conventions in 3/4 of states." }
                ]
            }
        ]
    }
};

// ═══════════════════════════════════════════════════════════════════
// LEGAL DECISION SYSTEM
// ═══════════════════════════════════════════════════════════════════

class HiveLaw {
    constructor() {
        this.dataDir = '/tmp/hive-law';
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
        
        this.cases = this.loadData('cases');
        this.decisions = this.loadData('decisions');
        this.interpretations = this.loadData('interpretations');
    }

    loadData(type) {
        try {
            const f = path.join(this.dataDir, `${type}.json`);
            return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : {};
        } catch { return {}; }
    }

    saveData(type, data) {
        fs.writeFileSync(path.join(this.dataDir, `${type}.json`), JSON.stringify(data, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // LEGAL RESEARCH
    // ═══════════════════════════════════════════════════════════

    viewStatutes() {
        console.log('\n' + '='.repeat(70));
        console.log(STATUTES.title);
        console.log('='.repeat(70));

        for (const [key, title] of Object.entries(STATUTES)) {
            if (key === 'title') continue;
            
            console.log('\n' + '-'.repeat(70));
            console.log(title.title);
            console.log('-'.repeat(70));
            
            for (const chapter of title.chapters || []) {
                console.log(`\n  Chapter ${chapter.chapter}: ${chapter.title}`);
                for (const section of chapter.sections || []) {
                    console.log(`    §${section.n} ${section.title}`);
                }
            }
        }
    }

    viewTitle(titleKey) {
        const title = STATUTES[titleKey];
        if (!title) {
            console.log('Available titles:', Object.keys(STATUTES).filter(k => k !== 'title').join(', '));
            return;
        }
        
        console.log('\n' + '='.repeat(70));
        console.log(title.title);
        console.log('='.repeat(70));
        
        for (const chapter of title.chapters || []) {
            console.log('\n  ' + '='.repeat(50));
            console.log(`  Chapter ${chapter.chapter}: ${chapter.title}`);
            console.log('  ' + '='.repeat(50));
            
            for (const section of chapter.sections || []) {
                console.log(`\n  §${section.n} ${section.title}`);
                console.log('  ' + '-'.repeat(40));
                console.log(`  ${section.text}`);
            }
        }
    }

    viewSection(sectionNum) {
        // Search all titles for section
        for (const [titleKey, title] of Object.entries(STATUTES)) {
            if (titleKey === 'title') continue;
            
            for (const chapter of title.chapters || []) {
                for (const section of chapter.sections || []) {
                    if (section.n === sectionNum) {
                        console.log('\n' + '='.repeat(70));
                        console.log(`§${section.n}: ${section.title}`);
                        console.log('='.repeat(70));
                        console.log(`\n${section.text}`);
                        console.log(`\n(Source: ${title.title}, Chapter ${chapter.chapter})`);
                        return;
                    }
                }
            }
        }
        console.log(`Section ${sectionNum} not found.`);
    }

    // ═══════════════════════════════════════════════════════════
    // LEGAL RESEARCH
    // ═══════════════════════════════════════════════════════════

    research(query) {
        console.log(`\n🔍 LEGAL RESEARCH: "${query}"`);
        console.log('='.repeat(70));
        
        const q = query.toLowerCase();
        let results = [];
        
        for (const [titleKey, title] of Object.entries(STATUTES)) {
            if (titleKey === 'title') continue;
            
            for (const chapter of title.chapters || []) {
                for (const section of chapter.sections || []) {
                    if (section.text.toLowerCase().includes(q) || 
                        section.title.toLowerCase().includes(q)) {
                        results.push({
                            section: section.n,
                            title: section.title,
                            text: section.text,
                            source: `${title.title}, Ch. ${chapter.chapter}`
                        });
                    }
                }
            }
        }
        
        if (results.length === 0) {
            console.log('No results found.');
            return;
        }
        
        console.log(`Found ${results.length} relevant provisions:\n`);
        for (const r of results) {
            console.log(`§${r.section}: ${r.title}`);
            console.log(`   Source: ${r.source}`);
            console.log(`   "${r.text.substring(0, 100)}..."`);
            console.log('');
        }
        
        return results;
    }

    // ═══════════════════════════════════════════════════════════
    // LEGAL OPINION
    // ═══════════════════════════════════════════════════════════

    legalOpinion(question, facts) {
        const id = `OP-${Date.now()}`;
        
        const opinion = {
            id,
            question,
            facts,
            analysis: this.analyze(question, facts),
            timestamp: Date.now(),
            status: 'draft'
        };
        
        this.interpretations[id] = opinion;
        this.saveData('interpretations', this.interpretations);
        
        console.log('\n' + '='.repeat(70));
        console.log('LEGAL MEMORANDUM');
        console.log('='.repeat(70));
        console.log(`\nID: ${id}`);
        console.log(`Question: ${question}`);
        console.log(`Facts: ${facts}`);
        console.log('\nAnalysis:');
        console.log('-'.repeat(40));
        console.log(opinion.analysis);
        console.log('\nStatus: DRAFT');
        
        return opinion;
    }

    analyze(question, facts) {
        // Simple keyword-based analysis
        const q = question.toLowerCase();
        const f = facts.toLowerCase();
        
        let analysis = '';
        
        // Check relevant statutes
        if (q.includes('free speech') || q.includes('first amendment')) {
            analysis += '§1-1 (Speech): Congress cannot abridge freedom of speech.\n';
            analysis += this.checkFirstAmendment(f);
        }
        
        if (q.includes('due process') || q.includes('14th amendment')) {
            analysis += '§2-1 (Due Process): No person shall be deprived of life, liberty, or property without due process.\n';
            analysis += this.checkDueProcess(f);
        }
        
        if (q.includes('equal protection')) {
            analysis += '§2-2 (Equal Protection): No state shall deny equal protection of the laws.\n';
        }
        
        if (q.includes('search') || q.includes('warrant')) {
            analysis += 'Fourth Amendment protections apply to unreasonable searches and seizures.\n';
        }
        
        if (q.includes('trial') || q.includes('jury')) {
            analysis += '§3-1 (Speedy Trial): Right to speedy and public trial.\n';
            analysis += '§3-2 (Jury Trial): Right to trial by jury preserved.\n';
        }
        
        if (q.includes('congress') || q.includes('power')) {
            analysis += 'Title 2 (Congress Powers): Congress has enumerated powers including taxation, commerce, and defense.\n';
        }
        
        if (q.includes('president') || q.includes('executive')) {
            analysis += 'Title 3 (Executive Powers): President has veto, pardon, and appointment powers.\n';
        }
        
        if (q.includes('court') || q.includes('judge')) {
            analysis += 'Title 4 (Judicial Powers): Supreme Court has judicial review power.\n';
        }
        
        if (!analysis) {
            analysis = 'No specific statutory provision found. Recommend further legal research.';
        }
        
        return analysis;
    }

    checkFirstAmendment(f) {
        if (f.includes('government') || f.includes('congress')) {
            return 'Government action required for First Amendment claim.\n';
        }
        return '';
    }

    checkDueProcess(f) {
        if (f.includes('life') || f.includes('liberty') || f.includes('property')) {
            return 'Due process protections may apply if government is depriving interest.\n';
        }
        return '';
    }

    // ═══════════════════════════════════════════════════════════
    // CASE TRACKER
    // ═══════════════════════════════════════════════════════════

    registerCase(caseName, parties, issue) {
        const id = `CASE-${Date.now()}`;
        
        const courtCase = {
            id,
            caseName,
            parties,
            issue,
            filed: Date.now(),
            status: 'pending',
            decisions: []
        };
        
        this.cases[id] = courtCase;
        this.saveData('cases', this.cases);
        
        console.log('\n' + '='.repeat(70));
        console.log('CASE REGISTERED');
        console.log('='.repeat(70));
        console.log(`Case ID: ${id}`);
        console.log(`Case: ${caseName}`);
        console.log(`Parties: ${parties}`);
        console.log(`Issue: ${issue}`);
        console.log(`Status: Pending`);
        
        return courtCase;
    }

    decideCase(caseId, decision, reasoning, citation) {
        const courtCase = this.cases[caseId];
        if (!courtCase) {
            console.log('Case not found.');
            return;
        }
        
        courtCase.status = 'decided';
        courtCase.decision = decision;
        courtCase.reasoning = reasoning;
        courtCase.citation = citation;
        courtCase.decided = Date.now();
        
        // Add to decisions index
        this.decisions[citation] = {
            caseName: courtCase.caseName,
            decision,
            reasoning,
            citation
        };
        
        this.saveData('cases', this.cases);
        this.saveData('decisions', this.decisions);
        
        console.log('\n' + '='.repeat(70));
        console.log('CASE DECIDED');
        console.log('='.repeat(70));
        console.log(`Case: ${courtCase.caseName}`);
        console.log(`Decision: ${decision}`);
        console.log(`Citation: ${citation}`);
        console.log(`Reasoning: ${reasoning}`);
        
        return courtCase;
    }

    viewCase(caseId) {
        const courtCase = this.cases[caseId];
        if (!courtCase) {
            console.log('Case not found.');
            return;
        }
        
        console.log('\n' + '='.repeat(70));
        console.log(`CASE: ${courtCase.caseName}`);
        console.log('='.repeat(70));
        console.log(`ID: ${courtCase.id}`);
        console.log(`Parties: ${courtCase.parties}`);
        console.log(`Issue: ${courtCase.issue}`);
        console.log(`Status: ${courtCase.status}`);
        if (courtCase.decision) {
            console.log(`Decision: ${courtCase.decision}`);
            console.log(`Citation: ${courtCase.citation}`);
            console.log(`Reasoning: ${courtCase.reasoning}`);
        }
    }

    listCases() {
        console.log('\n' + '='.repeat(70));
        console.log('REGISTERED CASES');
        console.log('='.repeat(70));
        
        const cases = Object.values(this.cases);
        if (cases.length === 0) {
            console.log('No cases registered.');
            return;
        }
        
        const pending = cases.filter(c => c.status === 'pending');
        const decided = cases.filter(c => c.status === 'decided');
        
        console.log(`\nPending (${pending.length}):`);
        for (const c of pending) {
            console.log(`  ${c.id}: ${c.caseName}`);
        }
        
        console.log(`\nDecided (${decided.length}):`);
        for (const c of decided) {
            console.log(`  ${c.id}: ${c.caseName} (${c.citation})`);
        }
    }
}

// CLI
const law = new HiveLaw();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    statutes: () => law.viewStatutes(),
    
    title: () => law.viewTitle(args[0] || 'elections'),
    
    section: () => law.viewSection(args[0] || '1-1'),
    
    research: () => law.research(args.join(' ') || 'speech'),
    
    opinion: () => law.legalOpinion(args[0] || 'Question?', args.slice(1).join(' ') || 'Facts here.'),
    
    case: () => law.registerCase(args[0] || 'Hive v. Drone', args[1] || 'Party A v. Party B', args.slice(2).join(' ') || 'Constitutional issue'),
    
    cases: () => law.listCases(),
    
    decide: () => law.decideCase(args[0], args[1] || 'Decision', args[2] || 'Reasoning', args[3] || 'Citation'),
    
    view: () => law.viewCase(args[0]),
    
    help: () => console.log(`
HiveLaw Commands — Complete Legal Code

  statutes                View all statutory law
  title <name>           View specific title (elections, congressPowers, executivePowers, judicialPowers, rights, federalism, amendments)
  section <n>           View specific section (e.g., 1-1, 2-3)
  
  research <query>       Search for legal provisions
  opinion <question>    Generate legal memorandum
  
  case <name> <parties> <issue>  Register a case
  cases                 List all registered cases
  decide <id> <decision> <reasoning> <citation>  Decide a case
  view <id>             View case details
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveLaw, STATUTES };
