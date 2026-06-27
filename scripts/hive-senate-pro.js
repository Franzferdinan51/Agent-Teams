#!/usr/bin/env node
/**
 * Hive Senate Pro — Advanced Congressional Features
 * 
 * NEW ENHANCEMENTS:
 * - Witness Testimony System
 * - Bill/Legislation Lifecycle
 * - Party Leadership (Whips, Majority/Minority)
 * - Committee Hearings
 * - Floor Debate Transcripts
 * - Senator Profiles & Voting History
 * - Veto Override
 * - Conference Committee
 * - Constituency System
 */

const fs = require('fs');
const path = require('path');

// Expert witnesses for testimony
const WITNESSES = {
    tech: [
        { name: 'Dr. Sarah Chen', title: 'MIT AI Lab Director', expertise: 'AI Safety' },
        { name: 'Prof. James Wright', title: 'Stanford Security Research', expertise: 'Cybersecurity' },
        { name: 'Dr. Maya Patel', title: 'Google DeepMind', expertise: 'Machine Learning' },
    ],
    business: [
        { name: 'Michael Ross', title: 'CEO, TechCorp', expertise: 'Startup Strategy' },
        { name: 'Amanda Blake', title: 'CFO, Enterprise Inc', expertise: 'Financial Planning' },
        { name: 'David Kim', title: 'Venture Capitalist', expertise: 'Investment' },
    ],
    legal: [
        { name: 'Judge Ruth Ginsburg II', title: 'Federal Appeals Court', expertise: 'Constitutional Law' },
        { name: 'Solomon Wells', title: 'Civil Rights Attorney', expertise: 'Privacy Law' },
        { name: 'Elena Martinez', title: 'Tech Policy Director', expertise: 'Digital Rights' },
    ],
    emergency: [
        { name: 'Chief Williams', title: ' FEMA Director', expertise: 'Disaster Response' },
        { name: 'Dr. Anthony Fauci Jr.', title: 'CDC Consultant', expertise: 'Public Health' },
        { name: 'General Hawk', title: 'National Guard Bureau', expertise: 'Emergency Management' },
    ],
    agriculture: [
        { name: 'Dr. Green Thumb', title: 'USDA Chief Scientist', expertise: 'Plant Science' },
        { name: 'Martha Stewart', title: 'Agricultural Economist', expertise: 'Farm Policy' },
        { name: 'Botanist McGreenface', title: 'Cannabis Cultivation Expert', expertise: 'Growing Operations' },
    ]
};

// Senator detailed profiles
const SENATOR_PROFILES = {
    speaker: {
        name: 'Senator Victoria Adams', age: 58, state: 'National', 
        background: 'Former Supreme Court Justice, 20 years public service',
        votingRecord: { present: 98, aye: 72, nay: 26 },
        committees: ['Judiciary', 'Rules']
    },
    technocrat: {
        name: 'Senator James Techson', age: 45, state: 'California',
        background: 'Former CTO of three tech startups, CS PhD from Stanford',
        votingRecord: { present: 95, aye: 65, nay: 30 },
        committees: ['Commerce', 'Technology']
    },
    botanist: {
        name: 'Senator Flora Green', age: 52, state: 'Oregon',
        background: 'Plant biologist, 15 years growing operations',
        votingRecord: { present: 99, aye: 80, nay: 19 },
        committees: ['Agriculture', 'Environment'],
        constituency: 'Cannabis Industry, Organic Farmers'
    },
    meteorologist: {
        name: 'Senator Storm Chaser', age: 48, state: 'Oklahoma',
        background: 'Former NOAA director, storm chaser veteran',
        votingRecord: { present: 97, aye: 60, nay: 37 },
        committees: ['Environment', 'Emergency Services']
    }
};

class HiveSenatePro {
    constructor() {
        this.dataDir = '/tmp/hive-senate-pro';
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
        
        this.bills = this.loadBills();
        this.hearings = this.loadHearings();
        this.transcripts = this.loadTranscripts();
        
        console.log('🏛️ Hive Senate Pro initialized');
    }

    // ═══════════════════════════════════════════════════════════
    // BILL LIFECYCLE
    // ═══════════════════════════════════════════════════════════

    introduceBill(title, sponsor, content) {
        const bill = {
            id: `S.${Date.now()}`,
            title,
            sponsor,
            content,
            status: 'introduced',
            introduced: Date.now(),
            steps: [
                { step: 'Introduced', status: 'complete', time: Date.now() },
                { step: 'First Reading', status: 'pending' },
                { step: 'Committee Hearing', status: 'pending' },
                { step: 'Committee Vote', status: 'pending' },
                { step: 'Second Reading', status: 'pending' },
                { step: 'Floor Debate', status: 'pending' },
                { step: 'Final Vote', status: 'pending' },
                { step: 'Executive Action', status: 'pending' }
            ],
            amendments: [],
            testimony: [],
            votes: [],
            cosponsors: []
        };
        
        this.bills[bill.id] = bill;
        this.saveBills();
        
        console.log(`\n📜 BILL INTRODUCED: ${bill.id}`);
        console.log(`   Title: ${title}`);
        console.log(`   Sponsor: ${sponsor}`);
        console.log(`   Status: ${bill.status}`);
        
        return bill;
    }

    advanceBill(billId, step) {
        const bill = this.bills[billId];
        if (!bill) {
            console.log('❌ Bill not found');
            return;
        }
        
        const stepIndex = bill.steps.findIndex(s => s.step === step);
        if (stepIndex === -1) {
            console.log(`❌ Invalid step: ${step}`);
            return;
        }
        
        bill.steps[stepIndex].status = 'complete';
        if (stepIndex < bill.steps.length - 1) {
            bill.steps[stepIndex + 1].status = 'active';
        }
        
        bill.status = step.toLowerCase().replace(' ', '_');
        this.saveBills();
        
        console.log(`\n📋 BILL ${bill.id} UPDATE`);
        console.log(`   Step: ${step} — COMPLETE`);
        console.log(`   Status: ${bill.status}`);
    }

    addCosponsor(billId, senator) {
        const bill = this.bills[billId];
        if (!bill) return;
        
        if (!bill.cosponsors.includes(senator)) {
            bill.cosponsors.push(senator);
            console.log(`\n✍️ COSPONSOR ADDED: ${senator}`);
            console.log(`   Bill: ${billId}`);
            console.log(`   Total cosponsors: ${bill.cosponsors.length}`);
            this.saveBills();
        }
    }

    amendBill(billId, amendment, sponsor) {
        const bill = this.bills[billId];
        if (!bill) return;
        
        bill.amendments.push({
            id: `Amdt-${bill.amendments.length + 1}`,
            sponsor,
            content: amendment,
            proposed: Date.now(),
            status: 'proposed'
        });
        
        console.log(`\n📝 AMENDMENT PROPOSED`);
        console.log(`   Bill: ${billId}`);
        console.log(`   Sponsor: ${sponsor}`);
        console.log(`   Amendment: ${amendment}`);
        this.saveBills();
    }

    listBills() {
        console.log('\n📜 ACTIVE BILLS\n');
        
        for (const [id, bill] of Object.entries(this.bills)) {
            console.log(`   ${id}: ${bill.title}`);
            console.log(`      Sponsor: ${bill.sponsor}`);
            console.log(`      Status: ${bill.status}`);
            console.log(`      Cosponsors: ${bill.cosponsors.length}`);
            console.log(`      Amendments: ${bill.amendments.length}`);
            console.log('');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // WITNESS TESTIMONY
    // ═══════════════════════════════════════════════════════════

    holdHearing(topic, committee, witnessType = 'tech') {
        const witnesses = WITNESSES[witnessType] || WITNESSES.tech;
        const witness = witnesses[Math.floor(Math.random() * witnesses.length)];
        
        const hearing = {
            id: `HRG-${Date.now()}`,
            topic,
            committee,
            witness: witness,
            date: Date.now(),
            testimony: [],
            transcript: []
        };
        
        this.hearings[hearing.id] = hearing;
        this.saveHearings();
        
        console.log(`\n🔔 HEARING CONVENED`);
        console.log(`   Topic: ${topic}`);
        console.log(`   Committee: ${committee}`);
        console.log(`   Witness: ${witness.name}`);
        console.log(`   Title: ${witness.title}`);
        console.log(`   Expertise: ${witness.expertise}`);
        
        return hearing;
    }

    witnessStatement(hearingId, statement) {
        const hearing = this.hearings[hearingId];
        if (!hearing) return;
        
        hearing.transcript.push({
            speaker: hearing.witness.name,
            type: 'testimony',
            content: statement,
            time: Date.now()
        });
        
        console.log(`\n   📜 ${hearing.witness.name}:`);
        console.log(`      "${statement.substring(0, 80)}..."`);
        
        this.saveHearings();
    }

    senatorQuestion(hearingId, senator, question) {
        const hearing = this.hearings[hearingId];
        if (!hearing) return;
        
        hearing.transcript.push({
            speaker: senator,
            type: 'question',
            content: question,
            time: Date.now()
        });
        
        hearing.transcript.push({
            speaker: hearing.witness.name,
            type: 'answer',
            content: 'Based on my expertise in ' + hearing.witness.expertise + ', I believe...',
            time: Date.now()
        });
        
        console.log(`\n   ❓ ${senator}:`);
        console.log(`      "${question.substring(0, 60)}..."`);
        console.log(`   📜 ${hearing.witness.name}:`);
        console.log(`      "Based on my expertise in ${hearing.witness.expertise}, I believe..."`);
        
        this.saveHearings();
    }

    // ═══════════════════════════════════════════════════════════
    // FLOOR DEBATE TRANSCRIPTS
    // ═══════════════════════════════════════════════════════════

    startFloorSession(topic) {
        const session = {
            id: `SESSION-${Date.now()}`,
            topic,
            started: Date.now(),
            speakers: [],
            transcript: []
        };
        
        this.transcripts[session.id] = session;
        this.saveTranscripts();
        
        console.log(`\n🏛️ FLOOR SESSION CONVENED`);
        console.log(`   Topic: ${topic}`);
        console.log(`   Session: ${session.id}`);
        
        return session;
    }

    floorSpeech(sessionId, senator, speech, position) {
        const session = this.transcripts[sessionId];
        if (!session) return;
        
        const entry = {
            senator,
            position, // 'pro' or 'con'
            speech,
            time: Date.now()
        };
        
        session.transcript.push(entry);
        if (!session.speakers.includes(senator)) {
            session.speakers.push(senator);
        }
        
        const icon = position === 'pro' ? '🔵' : '🔴';
        console.log(`\n${icon} ${senator} (${position}):`);
        console.log(`   "${speech.substring(0, 80)}..."`);
        
        this.saveTranscripts();
    }

    closeFloorSession(sessionId) {
        const session = this.transcripts[sessionId];
        if (!session) return;
        
        session.ended = Date.now();
        session.duration = session.ended - session.started;
        
        console.log(`\n🏛️ FLOOR SESSION CLOSED`);
        console.log(`   Session: ${sessionId}`);
        console.log(`   Duration: ${Math.round(session.duration / 60000)} minutes`);
        console.log(`   Speakers: ${session.speakers.length}`);
        
        const pro = session.transcript.filter(e => e.position === 'pro').length;
        const con = session.transcript.filter(e => e.position === 'con').length;
        console.log(`   Pro speeches: ${pro}`);
        console.log(`   Con speeches: ${con}`);
        
        this.saveTranscripts();
    }

    // ═══════════════════════════════════════════════════════════
    // SENATOR PROFILES
    // ═══════════════════════════════════════════════════════════

    viewSenatorProfile(senatorId) {
        const profile = SENATOR_PROFILES[senatorId] || {
            name: senatorId,
            age: Math.floor(Math.random() * 30) + 35,
            state: 'Unknown',
            background: 'Elected official',
            votingRecord: { present: 90, aye: 60, nay: 30 },
            committees: ['General']
        };
        
        console.log(`\n👤 SENATOR PROFILE: ${senatorId.toUpperCase()}`);
        console.log(`   Name: ${profile.name}`);
        console.log(`   Age: ${profile.age}`);
        console.log(`   State: ${profile.state}`);
        console.log(`   Background: ${profile.background}`);
        console.log(`   Voting Record:`);
        console.log(`      Attendance: ${profile.votingRecord.present}%`);
        console.log(`      Aye: ${profile.votingRecord.aye}%`);
        console.log(`      Nay: ${profile.votingRecord.nay}%`);
        console.log(`   Committees: ${profile.committees?.join(', ') || 'None'}`);
        if (profile.constituency) {
            console.log(`   Constituency: ${profile.constituency}`);
        }
        
        return profile;
    }

    // ═══════════════════════════════════════════════════════════
    // PARTY LEADERSHIP
    // ═══════════════════════════════════════════════════════════

    partyLeadership() {
        console.log('\n🗳️ PARTY LEADERSHIP');
        
        console.log('\n🔵 PROGRESSIVE CAUCUS:');
        console.log('   Majority Leader: Senator Marcus Hope');
        console.log('   Majority Whip: Senator Unity Carter');
        console.log('   Policy Chair: Senator Innovation Kim');
        
        console.log('\n🔴 CONSERVATIVE CAUCUS:');
        console.log('   Minority Leader: Senator Thomas Reed');
        console.log('   Minority Whip: Senator Sarah Steel');
        console.log('   Policy Chair: Senator Fiscal Hawk');
        
        console.log('\n⚖️ NEUTRAL BLOC:');
        console.log('   Leader: Senator Victoria Adams (Speaker)');
        console.log('   Whips: Senator Balance, Senator Fairway');
        
        console.log('\n🔒 SECURITY CAUCUS:');
        console.log('   Chair: Senator Shield Wilson');
        console.log('   Vice Chair: Senator Defense Gates');
    }

    // ═══════════════════════════════════════════════════════════
    // VETO & OVERRIDE
    // ═══════════════════════════════════════════════════════════

    presidentialVeto(billId, reason) {
        const bill = this.bills[billId];
        if (!bill) return;
        
        bill.vetoed = true;
        bill.vetoReason = reason;
        bill.vetoTime = Date.now();
        bill.status = 'vetoed';
        this.saveBills();
        
        console.log(`\n⚡ PRESIDENTIAL VETO`);
        console.log(`   Bill: ${billId}`);
        console.log(`   Reason: ${reason}`);
        console.log(`   Override requires: 67 votes (2/3 majority)`);
    }

    vetoOverride(billId, votes) {
        const bill = this.bills[billId];
        if (!bill) return;
        
        const needed = 67;
        console.log(`\n🗳️ VETO OVERRIDE VOTE`);
        console.log(`   Bill: ${billId}`);
        console.log(`   Votes for override: ${votes}`);
        console.log(`   Votes needed: ${needed}`);
        
        if (votes >= needed) {
            console.log(`   ✅ OVERRIDE SUCCEEDS (${votes}/${needed})`);
            bill.status = 'law';
            bill.override = true;
        } else {
            console.log(`   ❌ OVERRIDE FAILS (${votes}/${needed})`);
            console.log(`   Bill is DEAD`);
            bill.status = 'dead';
        }
        
        this.saveBills();
    }

    // ═══════════════════════════════════════════════════════════
    // CONSTITUENCY SYSTEM
    // ═══════════════════════════════════════════════════════════

    senatorConstituency(senatorId) {
        const constituencies = {
            botanist: { name: 'Cannabis Industry Alliance', interests: ['Growing Operations', 'Dispensaries', 'Cultivation Tech'], polling: 72 },
            meteorologist: { name: 'Weather & Emergency Services', interests: ['Storm Chasers', 'First Responders', 'Climate Scientists'], polling: 65 },
            economist: { name: 'Business Roundtable', interests: ['Corporate Finance', 'Trade Policy', 'Economic Growth'], polling: 58 },
            securityExpert: { name: 'Defense Contractors', interests: ['Military Tech', 'Cybersecurity Firms', 'Intelligence Community'], polling: 70 },
            environmentalist: { name: 'Green Earth Coalition', interests: ['Renewable Energy', 'Conservation', 'Climate Action'], polling: 68 }
        };
        
        const constit = constituencies[senatorId] || {
            name: 'General Public',
            interests: ['Good Governance', 'Public Services'],
            polling: 55
        };
        
        console.log(`\n👥 CONSTITUENCY: ${senatorId.toUpperCase()}`);
        console.log(`   Represents: ${constit.name}`);
        console.log(`   Key Interests: ${constit.interests.join(', ')}`);
        console.log(`   Approval Rating: ${constit.polling}%`);
        
        return constit;
    }

    // ═══════════════════════════════════════════════════════════
    // COMMITTEE HEARINGS
    // ═══════════════════════════════════════════════════════════

    committeeHearing(committeeName, topic, witnessType = 'tech') {
        const witnesses = WITNESSES[witnessType] || WITNESSES.tech;
        
        console.log(`\n🏛️ ${committeeName.toUpperCase()} COMMITTEE HEARING`);
        console.log(`   Topic: ${topic}`);
        console.log(`   Witnesses:`);
        
        witnesses.forEach((w, i) => {
            console.log(`   ${i + 1}. ${w.name}`);
            console.log(`      ${w.title}`);
            console.log(`      Expertise: ${w.expertise}`);
        });
        
        return witnesses;
    }

    // ═══════════════════════════════════════════════════════════
    // DATA PERSISTENCE
    // ═══════════════════════════════════════════════════════════

    loadBills() {
        try {
            const f = path.join(this.dataDir, 'bills.json');
            return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {};
        } catch { return {}; }
    }

    saveBills() {
        fs.writeFileSync(path.join(this.dataDir, 'bills.json'), JSON.stringify(this.bills, null, 2));
    }

    loadHearings() {
        try {
            const f = path.join(this.dataDir, 'hearings.json');
            return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {};
        } catch { return {}; }
    }

    saveHearings() {
        fs.writeFileSync(path.join(this.dataDir, 'hearings.json'), JSON.stringify(this.hearings, null, 2));
    }

    loadTranscripts() {
        try {
            const f = path.join(this.dataDir, 'transcripts.json');
            return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : {};
        } catch { return {}; }
    }

    saveTranscripts() {
        fs.writeFileSync(path.join(this.dataDir, 'transcripts.json'), JSON.stringify(this.transcripts, null, 2));
    }
}

// CLI
const pro = new HiveSenatePro();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    // Bills
    bill: () => pro.introduceBill(args.join(' ') || 'New Legislation', 'Speaker', 'Content here'),
    bills: () => pro.listBills(),
    advance: () => pro.advanceBill(args[0], args.slice(1).join(' ') || 'Committee Hearing'),
    cosponsor: () => pro.addCosponsor(args[0], args[1] || 'Senator'),
    amend: () => pro.amendBill(args[0], args.slice(2).join(' ') || 'Amendment content', args[1] || 'Senator'),
    
    // Hearings
    hearing: () => pro.holdHearing(args.slice(1).join(' ') || 'Topic', args[0] || 'General', args[2] || 'tech'),
    testimony: () => pro.witnessStatement(args[0], args.slice(1).join(' ') || 'My testimony...'),
    question: () => pro.senatorQuestion(args[0], args[1] || 'Senator', args.slice(2).join(' ') || 'Question?'),
    
    // Floor
    session: () => pro.startFloorSession(args.join(' ') || 'Topic'),
    speak: () => pro.floorSpeech(args[0], args[1] || 'Senator', args.slice(3).join(' ') || 'Speech...', args[2] || 'pro'),
    close: () => pro.closeFloorSession(args[0]),
    
    // Profiles
    profile: () => pro.viewSenatorProfile(args[0] || 'technocrat'),
    leadership: () => pro.partyLeadership(),
    constit: () => pro.senatorConstituency(args[0] || 'botanist'),
    
    // Veto
    veto: () => pro.presidentialVeto(args[0], args.slice(1).join(' ') || 'Concerns'),
    override: () => pro.vetoOverride(args[0], parseInt(args[1]) || 60),
    
    // Committee
    committee: () => pro.committeeHearing(args[0] || 'Judiciary', args.slice(1).join(' ') || 'Topic', args[2] || 'legal'),
    
    help: () => console.log(`
🏛️ Hive Senate Pro Commands

BILLS:
  bill <title>           Introduce new bill
  bills                   List all bills
  advance <id> <step>     Advance bill to next step
  cosponsor <id> <name>  Add cosponsor
  amend <id> <senator> <text>  Propose amendment

HEARINGS:
  hearing <committee> <topic> [type]  Hold hearing
  testimony <id> <text>           Witness testimony
  question <id> <senator> <q>  Senator questions

FLOOR:
  session <topic>         Start floor session
  speak <id> <senator> <pro|con> <speech>  Floor speech
  close <id>              Close floor session

PROFILES:
  profile <senator>       View senator profile
  leadership              View party leadership
  constit <senator>       View constituency

VETO:
  veto <billId> <reason>  Presidential veto
  override <billId> <votes>  Override vote

COMMITTEE:
  committee <name> <topic> [type]  Hold committee hearing
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveSenatePro, WITNESSES };
