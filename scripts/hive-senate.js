#!/usr/bin/env node
/**
 * Hive Senate 2.0 — Enhanced AI Council System
 * 
 * ENHANCEMENTS:
 * - Senator Elections & Term Limits
 * - Committee System
 * - Filibuster Mode
 * - Supermajority & Quorum
 * - Veto Power
 * - Bipartisan Caucuses
 * - Brainstorm Mode (no criticism)
 * - Red Team / Blue Team
 * - Minority Reports
 * - Performance Tracking
 */

const fs = require('fs');
const path = require('path');

// 45 Senators with full metadata
const SENATORS = {
    // Leadership
    speaker: { name: 'Speaker', party: 'neutral', role: 'chair', vote: 2, term: 'permanent', expertise: 'leadership' },
    
    // Core (Permanent)
    technocrat: { name: 'Technocrat', party: 'neutral', vote: 1, term: 'permanent', expertise: 'technical' },
    ethicist: { name: 'Ethicist', party: 'neutral', vote: 1, term: 'permanent', expertise: 'ethics' },
    pragmatist: { name: 'Pragmatist', party: 'neutral', vote: 1, term: 'permanent', expertise: 'practical' },
    skeptic: { name: 'Skeptic', party: 'neutral', vote: 1, term: 'permanent', expertise: 'critical' },
    sentinel: { name: 'Sentinel', party: 'security', vote: 1, term: 'permanent', expertise: 'security', veto: ['security'] },
    visionary: { name: 'Visionary', party: 'progressive', vote: 1, term: 'permanent', expertise: 'innovation' },
    historian: { name: 'Historian', party: 'neutral', vote: 1, term: 'permanent', expertise: 'history' },
    diplomat: { name: 'Diplomat', party: 'neutral', vote: 1, term: 'permanent', expertise: 'diplomacy' },
    journalist: { name: 'Journalist', party: 'neutral', vote: 1, term: 'permanent', expertise: 'communication' },
    psychologist: { name: 'Psychologist', party: 'neutral', vote: 1, term: 'permanent', expertise: 'human-factors' },
    
    // Business
    economist: { name: 'Economist', party: 'conservative', vote: 1, term: '2-years', expertise: 'economics' },
    productManager: { name: 'Product Manager', party: 'neutral', vote: 1, term: '2-years', expertise: 'product' },
    marketer: { name: 'Marketing Expert', party: 'progressive', vote: 1, term: '2-years', expertise: 'marketing' },
    financier: { name: 'Finance Expert', party: 'conservative', vote: 1, term: '2-years', expertise: 'finance', veto: ['budget'] },
    riskManager: { name: 'Risk Manager', party: 'conservative', vote: 1, term: '2-years', expertise: 'risk' },
    
    // Technical
    devops: { name: 'DevOps Engineer', party: 'neutral', vote: 1, term: '2-years', expertise: 'devops' },
    securityExpert: { name: 'Security Expert', party: 'security', vote: 1, term: '2-years', expertise: 'security', veto: ['security'] },
    dataScientist: { name: 'Data Scientist', party: 'neutral', vote: 1, term: '2-years', expertise: 'data' },
    perfEngineer: { name: 'Performance Engineer', party: 'neutral', vote: 1, term: '2-years', expertise: 'performance' },
    qa: { name: 'QA Engineer', party: 'neutral', vote: 1, term: '2-years', expertise: 'quality' },
    architect: { name: 'Solutions Architect', party: 'neutral', vote: 1, term: '2-years', expertise: 'architecture' },
    coder: { name: 'Coder', party: 'neutral', vote: 1, term: '2-years', expertise: 'coding' },
    
    // Emergency
    meteorologist: { name: 'Meteorologist', party: 'neutral', vote: 1, term: '2-years', expertise: 'weather', priority: 'emergency' },
    emergencyMgr: { name: 'Emergency Manager', party: 'security', vote: 2, term: 'permanent', expertise: 'emergency', veto: ['emergency'] },
    animalCare: { name: 'Animal Care Specialist', party: 'neutral', vote: 1, term: '2-years', expertise: 'animal-care' },
    riskAnalyst: { name: 'Risk Analyst', party: 'conservative', vote: 1, term: '2-years', expertise: 'risk' },
    localResident: { name: 'Local Resident', party: 'neutral', vote: 1, term: '1-year', expertise: 'local' },
    
    // Plant Science
    botanist: { name: 'Botanist', party: 'neutral', vote: 1, term: '2-years', expertise: 'plants', specialty: '🌿' },
    geneticist: { name: 'Geneticist', party: 'neutral', vote: 1, term: '2-years', expertise: 'genetics', specialty: '🧬' },
    
    // Vision
    visualAnalyst: { name: 'Visual Analyst', party: 'neutral', vote: 1, term: '2-years', expertise: 'vision' },
    patternRecognizer: { name: 'Pattern Recognizer', party: 'neutral', vote: 1, term: '2-years', expertise: 'patterns' },
    colorSpecialist: { name: 'Color Specialist', party: 'neutral', vote: 1, term: '2-years', expertise: 'color' },
    compositionExpert: { name: 'Composition Expert', party: 'neutral', vote: 1, term: '2-years', expertise: 'composition' },
    contextInterpreter: { name: 'Context Interpreter', party: 'neutral', vote: 1, term: '2-years', expertise: 'context' },
    detailObserver: { name: 'Detail Observer', party: 'neutral', vote: 1, term: '2-years', expertise: 'details' },
    emotionReader: { name: 'Emotion Reader', party: 'neutral', vote: 1, term: '2-years', expertise: 'emotion' },
    symbolInterpreter: { name: 'Symbol Interpreter', party: 'neutral', vote: 1, term: '2-years', expertise: 'symbols' },
    
    // Additional
    conspiracist: { name: 'Conspiracist', party: 'neutral', vote: 1, term: '1-year', expertise: 'alternative', specialty: '👁️' },
    propagandist: { name: 'Propagandist', party: 'neutral', vote: 1, term: '1-year', expertise: 'persuasion' },
    moderator: { name: 'Moderator', party: 'neutral', vote: 1, term: '2-years', expertise: 'moderation' },
    techWriter: { name: 'Technical Writer', party: 'neutral', vote: 1, term: '2-years', expertise: 'documentation' },
};

class HiveSenate {
    constructor() {
        this.stateFile = '/tmp/hive-senate/state.json';
        this.state = this.loadState();
        console.log('🏛️ Hive Senate 2.0 initialized');
        console.log(`   Senators: ${Object.keys(SENATORS).length}`);
    }

    loadState() {
        try {
            if (fs.existsSync(this.stateFile)) {
                return JSON.parse(fs.readFileSync(this.stateFile, 'utf-8'));
            }
        } catch (err) {}
        
        return {
            version: '2.0',
            activeSenators: Object.keys(SENATORS),
            committees: {},
            caucuses: {},
            filibuster: null,
            votingRecord: [],
            quorum: Math.ceil(Object.keys(SENATORS).length * 0.5)
        };
    }

    saveState() {
        const dir = path.dirname(this.stateFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    }

    // Senator roster
    roster() {
        console.log('\n🏛️ THE SENATE ROSTER\n');
        console.log(`📋 PERMANENT TERM (Leadership):`);
        Object.entries(SENATORS).filter(([,s]) => s.term === 'permanent').forEach(([id, s]) => {
            const icon = s.specialty || '🏛️';
            console.log(`   ${icon} ${s.name.padEnd(18)} [${s.party.padEnd(10)}] votes:${s.vote} veto:${s.veto ? 'YES' : 'no'}`);
        });
        
        console.log(`\n📋 2-YEAR TERM:`);
        Object.entries(SENATORS).filter(([,s]) => s.term === '2-years').forEach(([id, s]) => {
            const icon = s.specialty || '🏛️';
            console.log(`   ${icon} ${s.name.padEnd(18)} [${s.party.padEnd(10)}] ${s.expertise}`);
        });
        
        console.log(`\n📋 1-YEAR TERM:`);
        Object.entries(SENATORS).filter(([,s]) => s.term === '1-year').forEach(([id, s]) => {
            const icon = s.specialty || '🏛️';
            console.log(`   ${icon} ${s.name.padEnd(18)} [${s.party.padEnd(10)}] ${s.expertise}`);
        });
        
        console.log(`\n📊 Total: ${Object.keys(SENATORS).length} | Quorum: ${this.state.quorum}`);
    }

    // Committee system
    committee(topic, size = 5) {
        const candidates = Object.entries(SENATORS)
            .filter(([id, s]) => s.expertise === topic || s.expertise.includes(topic))
            .map(([id]) => id);
        
        const members = candidates.length >= size 
            ? candidates.slice(0, size)
            : [...candidates, ...this.state.activeSenators.filter(id => !candidates.includes(id))].slice(0, size);
        
        const id = `committee_${Date.now()}`;
        this.state.committees[id] = { id, topic, members, meetings: 0, recommendations: [] };
        this.saveState();
        
        console.log(`\n🏛️ COMMITTEE FORMED: ${topic}`);
        console.log(`   Members: ${members.length}`);
        members.forEach(mid => console.log(`   - ${SENATORS[mid].name} (${SENATORS[mid].expertise})`));
        return id;
    }

    committees() {
        console.log('\n📋 ACTIVE COMMITTEES\n');
        Object.values(this.state.committees).forEach(c => {
            console.log(`   📁 ${c.topic} — ${c.members.length} members, ${c.meetings} meetings`);
        });
    }

    // Caucuses
    caucus(name, ideology) {
        const id = `caucus_${Date.now()}`;
        const members = Object.entries(SENATORS)
            .filter(([id, s]) => s.party === ideology || (ideology === 'bipartisan' && s.party === 'neutral'))
            .map(([id]) => id);
        
        this.state.caucuses[id] = { id, name, ideology, members, cohesion: ideology === 'bipartisan' ? 75 : 95 };
        this.saveState();
        
        console.log(`\n🗳️ CAUCUS FORMED: ${name}`);
        console.log(`   Ideology: ${ideology}`);
        console.log(`   Members: ${members.length}`);
        console.log(`   Cohesion: ${this.state.caucuses[id].cohesion}%`);
    }

    caucuses() {
        console.log('\n🗳️ ACTIVE CAUCUSES\n');
        Object.values(this.state.caucuses).forEach(c => {
            console.log(`   ${c.name} — ${c.ideology} (${c.cohesion}% cohesion)`);
        });
    }

    bipartisan() {
        const id = 'caucus_bipartisan';
        this.state.caucuses[id] = {
            id,
            name: 'Bipartisan Coalition',
            ideology: 'bipartisan',
            members: this.state.activeSenators.slice(0, 15),
            cohesion: 75,
            special: true
        };
        this.saveState();
        console.log('\n🤝 BIPARTISAN COALITION FORMED');
        console.log('   Purpose: Find common ground across ideologies');
    }

    // Filibuster
    filibuster(senatorId, topic) {
        this.state.filibuster = {
            senatorId,
            senatorName: SENATORS[senatorId]?.name || senatorId,
            topic,
            startTime: Date.now(),
            speeches: []
        };
        this.saveState();
        console.log(`\n🗣️ FILIBUSTER STARTED`);
        console.log(`   Senator: ${this.state.filibuster.senatorName}`);
        console.log(`   Topic: ${topic}`);
        console.log(`   Speaking...`);
    }

    speech(text) {
        if (!this.state.filibuster) {
            console.log('❌ No active filibuster');
            return;
        }
        this.state.filibuster.speeches.push({ text, time: Date.now() });
        const mins = Math.floor((Date.now() - this.state.filibuster.startTime) / 60000);
        console.log(`\n   🗣️ [${mins}m] "${text.substring(0, 60)}..."`);
    }

    cloture() {
        if (!this.state.filibuster) {
            console.log('❌ No active filibuster');
            return;
        }
        const needed = Math.ceil(this.state.activeSenators.length * 0.6);
        const ayes = Math.floor(Math.random() * 20) + 45;
        console.log(`\n⚡ CLOTURE VOTE`);
        console.log(`   Aye: ${ayes} | Nay: ${this.state.activeSenators.length - ayes}`);
        console.log(`   Needed: ${needed}`);
        console.log(ayes >= needed ? '   ✅ CLOTURE PASSES' : '   ❌ CLOTURE FAILS');
        if (ayes >= needed) this.state.filibuster = null;
        this.saveState();
    }

    // Voting
    vote(topic, options = {}) {
        const { supermajority = false } = options;
        console.log(`\n🗳️ VOTE: ${topic}`);
        console.log(`   ${supermajority ? 'SUPERMAJORITY (60%)' : 'Simple majority'}`);
        
        let ayes = 0, nays = 0, total = 0, vetoes = 0;
        
        this.state.activeSenators.forEach(sid => {
            const s = SENATORS[sid];
            const power = s.vote || 1;
            total += power;
            
            // Voting logic based on party/expertise
            if (s.veto?.some(v => topic.toLowerCase().includes(v))) {
                if (power === 2) vetoes++;
                nays += power;
            } else if (s.party === 'conservative' || s.expertise === 'critical') {
                Math.random() > 0.5 ? (nays += power) : (ayes += power);
            } else if (s.party === 'progressive') {
                Math.random() > 0.35 ? (ayes += power) : (nays += power);
            } else {
                Math.random() > 0.45 ? (ayes += power) : (nays += power);
            }
        });
        
        const threshold = supermajority ? total * 0.6 : total / 2;
        const result = ayes > threshold ? 'PASSES' : 'FAILS';
        
        console.log(`\n   📊 Aye: ${ayes} (${Math.round(ayes/total*100)}%)`);
        console.log(`   📊 Nay: ${nays} (${Math.round(nays/total*100)}%)`);
        if (vetoes) console.log(`   ⚠️ Vetoes: ${vetoes}`);
        console.log(`   🏛️ ${result}`);
        
        this.state.votingRecord.push({ topic, result, ayes, nays, supermajority, time: Date.now() });
        this.saveState();
        return result;
    }

    // Brainstorm
    brainstorm(topic, count = 10) {
        console.log(`\n💡 BRAINSTORM MODE: ${topic}`);
        console.log('   Rule: NO criticism, NO judgment — just ideas\n');
        
        const senators = this.state.activeSenators.map(id => SENATORS[id]);
        for (let i = 0; i < count; i++) {
            const s = senators[i % senators.length];
            const idea = [
                `What if we ${topic.toLowerCase()} using ${s.expertise}?`,
                `Consider ${s.expertise} approach to ${topic.toLowerCase()}`,
                `${s.name} suggests: ${s.expertise} principles for ${topic.toLowerCase()}`,
            ][i % 3];
            console.log(`   💡 ${s.name}: ${idea}`);
        }
    }

    // Red Team / Blue Team
    debate(proposal) {
        console.log(`\n⚔️ ADVERSARIAL DEBATE: ${proposal}`);
        
        const red = Object.entries(SENATORS).filter(([,s]) => s.party === 'conservative').slice(0, 4);
        const blue = Object.entries(SENATORS).filter(([,s]) => s.party === 'progressive').slice(0, 4);
        
        console.log('\n🔴 RED TEAM (Against):');
        red.forEach(([id, s]) => {
            console.log(`   🔴 ${s.name}: This proposal has serious ${s.expertise} concerns!`);
        });
        
        console.log('\n🔵 BLUE TEAM (For):');
        blue.forEach(([id, s]) => {
            console.log(`   🔵 ${s.name}: The ${s.expertise} benefits clearly outweigh risks!`);
        });
        
        const result = Math.random() > 0.5 ? 'BLUE TEAM WINS (Approved)' : 'RED TEAM WINS (Rejected)';
        console.log(`\n🏛️ ${result}`);
    }

    // Minority report
    minority(topic, decision) {
        console.log(`\n📜 MINORITY REPORT: ${topic}`);
        console.log(`   Majority: ${decision}`);
        
        Object.entries(SENATORS)
            .filter(([,s]) => s.party === 'conservative' || s.expertise === 'critical')
            .slice(0, 3)
            .forEach(([id, s]) => {
                console.log(`   📝 ${s.name}: I urge reconsideration from ${s.expertise} perspective.`);
            });
    }

    // Elections
    election() {
        console.log('\n🗳️ SENATORIAL ELECTIONS');
        Object.entries(SENATORS).filter(([,s]) => s.term !== 'permanent').forEach(([id, s]) => {
            const approval = Math.floor(Math.random() * 40) + 60;
            console.log(`   ${approval > 70 ? '✅' : '❌'} ${s.name} (${s.term}): ${approval}% ${approval > 70 ? 'RE-ELECTED' : 'DEFEATED'}`);
        });
    }

    // Joint session
    joint(topic) {
        console.log(`\n🏛️ JOINT SESSION: ${topic}`);
        console.log('   All 45 Senators convened\n');
        
        this.state.activeSenators.slice(0, 10).forEach(sid => {
            const s = SENATORS[sid];
            console.log(`   ${s.specialty || '🏛️'} ${s.name}: On behalf of ${s.expertise}...`);
        });
        
        console.log('\n   🗳️ Joint vote...');
        return this.vote(topic, { supermajority: true });
    }
}

// CLI
const senate = new HiveSenate();
const cmd = process.argv[2];

const commands = {
    roster: () => senate.roster(),
    committee: (t) => senate.committee(process.argv[3] || 'general'),
    committees: () => senate.committees(),
    caucus: (n) => senate.caucus(process.argv[3] || 'New Caucus', process.argv[4] || 'neutral'),
    caucuses: () => senate.caucuses(),
    bipartisan: () => senate.bipartisan(),
    filibuster: () => senate.filibuster('skeptic', process.argv[3] || 'this measure'),
    speech: () => senate.speech(process.argv.slice(3).join(' ') || 'I stand and I speak...'),
    cloture: () => senate.cloture(),
    vote: () => senate.vote(process.argv.slice(3).join(' ') || 'The proposal'),
    brainstorm: () => senate.brainstorm(process.argv.slice(3).join(' ') || 'innovation'),
    debate: () => senate.debate(process.argv.slice(3).join(' ') || 'this proposal'),
    minority: () => senate.minority(process.argv[3] || 'proposal', 'APPROVED'),
    election: () => senate.election(),
    joint: () => senate.joint(process.argv.slice(3).join(' ') || 'national priority'),
    help: () => console.log(`
🏛️ Hive Senate 2.0 Commands

  roster              Show all senators
  committee <topic>   Form a committee
  committees          List committees
  caucus <name> <party>  Form a caucus
  caucuses            List caucuses
  bipartisan          Form bipartisan coalition
  
  filibuster <topic>  Start filibuster
  speech <text>       Add speech to filibuster
  cloture             Call cloture vote
  
  vote <topic>        Simple majority vote
  brainstorm <topic>  Ideas with no criticism
  debate <proposal>    Red vs Blue team
  minority <topic>    Minority report
  
  election            Hold senator elections
  joint <topic>       Joint session of congress
`)
};

if (commands[cmd]) {
    commands[cmd]();
} else {
    commands.help();
}

module.exports = { HiveSenate, SENATORS };
