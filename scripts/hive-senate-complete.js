#!/usr/bin/env node
/**
 * Hive Senate Complete - All Senate Features in One Script
 * Combines: Senate (debates/votes/bills), Decrees (binding laws), Elections (democratic legitimacy)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = '/tmp/hive-senate-complete';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const SENATORS = {
    speaker: { name: 'Victoria Adams', party: 'Neutral', vote: 2, term: 'permanent', expertise: 'leadership' },
    technocrat: { name: 'James Techson', party: 'Neutral', vote: 1, term: 'permanent', expertise: 'technical' },
    ethicist: { name: 'Maya Ethics', party: 'Neutral', vote: 1, term: 'permanent', expertise: 'ethics' },
    pragmatist: { name: 'Sam Practical', party: 'Neutral', vote: 1, term: 'permanent', expertise: 'practical' },
    skeptic: { name: 'Chris Doubt', party: 'Neutral', vote: 1, term: 'permanent', expertise: 'critical' },
    sentinel: { name: 'Alex Shield', party: 'Security', vote: 1, term: 'permanent', expertise: 'security', veto: ['security'] },
    visionary: { name: 'Riley Dream', party: 'Progressive', vote: 1, term: 'permanent', expertise: 'innovation' },
    historian: { name: 'Pat Past', party: 'Neutral', vote: 1, term: 'permanent', expertise: 'history' },
    diplomat: { name: 'Lee Harmony', party: 'Neutral', vote: 1, term: 'permanent', expertise: 'diplomacy' },
    journalist: { name: 'Dana Press', party: 'Neutral', vote: 1, term: 'permanent', expertise: 'communication' },
    psychologist: { name: 'Dr. Mind', party: 'Neutral', vote: 1, term: 'permanent', expertise: 'human-factors' },
    economist: { name: 'Wall Street Sam', party: 'Conservative', vote: 1, term: '2-years', expertise: 'economics' },
    productManager: { name: 'PM Chen', party: 'Neutral', vote: 1, term: '2-years', expertise: 'product' },
    marketer: { name: 'Brand Kate', party: 'Progressive', vote: 1, term: '2-years', expertise: 'marketing' },
    financier: { name: 'Money Mike', party: 'Conservative', vote: 1, term: '2-years', expertise: 'finance', veto: ['budget'] },
    riskManager: { name: 'Risk Rachel', party: 'Conservative', vote: 1, term: '2-years', expertise: 'risk' },
    devops: { name: 'Ops Oliver', party: 'Neutral', vote: 1, term: '2-years', expertise: 'devops' },
    securityExpert: { name: 'Secure Steve', party: 'Security', vote: 1, term: '2-years', expertise: 'security', veto: ['security'] },
    dataScientist: { name: 'Data Diana', party: 'Neutral', vote: 1, term: '2-years', expertise: 'data' },
    perfEngineer: { name: 'Fast Fiona', party: 'Neutral', vote: 1, term: '2-years', expertise: 'performance' },
    qa: { name: 'Test Tara', party: 'Neutral', vote: 1, term: '2-years', expertise: 'quality' },
    architect: { name: 'Arch Andy', party: 'Neutral', vote: 1, term: '2-years', expertise: 'architecture' },
    coder: { name: 'Code Carlos', party: 'Neutral', vote: 1, term: '2-years', expertise: 'coding' },
    meteorologist: { name: 'Storm Chris', party: 'Neutral', vote: 1, term: '2-years', expertise: 'weather', priority: 'emergency' },
    emergencyMgr: { name: 'Alert Alex', party: 'Security', vote: 2, term: 'permanent', expertise: 'emergency', veto: ['emergency'] },
    animalCare: { name: 'Vet Val', party: 'Neutral', vote: 1, term: '2-years', expertise: 'animal-care' },
    riskAnalyst: { name: 'Risk Ray', party: 'Conservative', vote: 1, term: '2-years', expertise: 'risk' },
    localResident: { name: 'Local Lisa', party: 'Neutral', vote: 1, term: '1-year', expertise: 'local' },
    botanist: { name: 'Flora Green', party: 'Neutral', vote: 1, term: '2-years', expertise: 'plants', specialty: '🌿' },
    geneticist: { name: 'Gene Grey', party: 'Neutral', vote: 1, term: '2-years', expertise: 'genetics', specialty: '🧬' },
    visualAnalyst: { name: 'See Sally', party: 'Neutral', vote: 1, term: '2-years', expertise: 'vision' },
    patternRecognizer: { name: 'Pattern Pete', party: 'Neutral', vote: 1, term: '2-years', expertise: 'patterns' },
    colorSpecialist: { name: 'Color Carol', party: 'Neutral', vote: 1, term: '2-years', expertise: 'color' },
    compositionExpert: { name: 'Frame Frank', party: 'Neutral', vote: 1, term: '2-years', expertise: 'composition' },
    contextInterpreter: { name: 'Context Chloe', party: 'Neutral', vote: 1, term: '2-years', expertise: 'context' },
    detailObserver: { name: 'Detail Dan', party: 'Neutral', vote: 1, term: '2-years', expertise: 'details' },
    emotionReader: { name: 'Feel Fran', party: 'Neutral', vote: 1, term: '2-years', expertise: 'emotion' },
    symbolInterpreter: { name: 'Symbol Sam', party: 'Neutral', vote: 1, term: '2-years', expertise: 'symbols' },
    conspiracist: { name: 'Quest Quinn', party: 'Neutral', vote: 1, term: '1-year', expertise: 'alternative', specialty: '👁️' },
    propagandist: { name: 'Spin Steve', party: 'Neutral', vote: 1, term: '1-year', expertise: 'persuasion' },
    moderator: { name: 'Mod Maria', party: 'Neutral', vote: 1, term: '2-years', expertise: 'moderation' },
    techWriter: { name: 'Write Wendy', party: 'Neutral', vote: 1, term: '2-years', expertise: 'documentation' },
};

const WITNESSES = {
    tech: [{ name: 'Dr. Sarah Chen', title: 'MIT AI Lab Director', expertise: 'AI Safety' }, { name: 'Prof. James Wright', title: 'Stanford Security Research', expertise: 'Cybersecurity' }],
    legal: [{ name: 'Judge Ruth Ginsburg II', title: 'Federal Appeals Court', expertise: 'Constitutional Law' }, { name: 'Solomon Wells', title: 'Civil Rights Attorney', expertise: 'Privacy Law' }],
    emergency: [{ name: 'Chief Williams', title: 'FEMA Director', expertise: 'Disaster Response' }, { name: 'Dr. Anthony Fauci Jr.', title: 'CDC Consultant', expertise: 'Public Health' }],
    agriculture: [{ name: 'Dr. Green Thumb', title: 'USDA Chief Scientist', expertise: 'Plant Science' }],
};

class HiveSenateComplete {
    constructor() {
        this.state = this._load('/tmp/hive-senate-complete/state.json', {});
        this.decrees = this._load('/tmp/hive-senate-complete/decrees.json', []);
        this.bills = this._load('/tmp/hive-senate-complete/bills.json', {});
        this.elections = this._load('/tmp/hive-senate-complete/elections.json', {});
        this.hearings = this._load('/tmp/hive-senate-complete/hearings.json', {});
        console.log('Hive Senate Complete initialized');
        console.log('   Senators: ' + Object.keys(SENATORS).length + ' | Active Decrees: ' + this.activeDecrees.length);
    }
    _load(file, fallback) { try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : fallback; } catch { return fallback; } }
    _save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
    get activeDecrees() { return this.decrees.filter(d => d.status === 'active'); }

    roster() {
        console.log('\nSENATE ROSTER\n');
        const cats = [
            { label: 'PERMANENT (Leadership)', filter: s => s.term === 'permanent' },
            { label: '2-YEAR TERM', filter: s => s.term === '2-years' },
            { label: '1-YEAR TERM', filter: s => s.term === '1-year' },
        ];
        for (const cat of cats) {
            console.log('  ' + cat.label + ':');
            Object.entries(SENATORS).filter(([, s]) => cat.filter(s)).forEach(([, s]) => {
                const icon = s.specialty || '*';
                const veto = s.veto ? ' [VETO]' : '';
                console.log('    ' + icon + ' ' + s.name.padEnd(18) + ' [' + s.party.padEnd(11) + '] votes:' + s.vote + veto);
            });
            console.log('');
        }
        console.log('Total: ' + Object.keys(SENATORS).length + ' | Quorum: ' + Math.ceil(Object.keys(SENATORS).length * 0.5));
    }

    committee(topic, size) {
        size = size || 5;
        const candidates = Object.entries(SENATORS).filter(([, s]) => s.expertise === topic || s.expertise.includes(topic)).map(([id]) => id);
        const members = candidates.length >= size ? candidates.slice(0, size) : [...candidates, ...Object.keys(SENATORS).filter(id => !candidates.includes(id))].slice(0, size);
        const id = 'committee_' + Date.now();
        this.state.committees = this.state.committees || {};
        this.state.committees[id] = { id, topic, members, meetings: 0 };
        this._save('/tmp/hive-senate-complete/state.json', this.state);
        console.log('\nCOMMITTEE FORMED: ' + topic);
        members.forEach(mid => console.log('   - ' + SENATORS[mid].name + ' (' + SENATORS[mid].expertise + ')'));
        return id;
    }

    committees() {
        console.log('\nACTIVE COMMITTEES\n');
        const cc = this.state.committees || {};
        Object.values(cc).forEach(c => console.log('   ' + c.topic + ' -- ' + c.members.length + ' members'));
        if (!Object.keys(cc).length) console.log('   No active committees');
    }

    caucus(name, ideology) {
        const members = Object.entries(SENATORS).filter(([, s]) => s.party === ideology || ideology === 'bipartisan').map(([id]) => id);
        this.state.caucuses = this.state.caucuses || {};
        const id = 'caucus_' + Date.now();
        this.state.caucuses[id] = { id, name, ideology, members, cohesion: ideology === 'bipartisan' ? 75 : 95 };
        this._save('/tmp/hive-senate-complete/state.json', this.state);
        console.log('\nCAUCUS FORMED: ' + name + ' | Members: ' + members.length + ' | Cohesion: ' + this.state.caucuses[id].cohesion + '%');
    }

    caucuses() {
        console.log('\nACTIVE CAUCUSES\n');
        const cc = this.state.caucuses || {};
        Object.values(cc).forEach(c => console.log('   ' + c.name + ' -- ' + c.ideology + ' (' + c.cohesion + '% cohesion)'));
        if (!Object.keys(cc).length) console.log('   No active caucuses');
    }

    bipartisan() { this.caucus('Bipartisan Coalition', 'bipartisan'); }

    filibuster(senatorId, topic) {
        this.state.filibuster = { senatorId, senatorName: SENATORS[senatorId] ? SENATORS[senatorId].name : senatorId, topic, startTime: Date.now(), speeches: [] };
        this._save('/tmp/hive-senate-complete/state.json', this.state);
        console.log('\nFILIBUSTER STARTED -- ' + this.state.filibuster.senatorName + ': ' + topic);
    }

    speech(text) {
        if (!this.state.filibuster) { console.log('No active filibuster'); return; }
        this.state.filibuster.speeches.push({ text, time: Date.now() });
        const mins = Math.floor((Date.now() - this.state.filibuster.startTime) / 60000);
        console.log('   [' + mins + 'm] ' + text.substring(0, 60) + '...');
        this._save('/tmp/hive-senate-complete/state.json', this.state);
    }

    cloture() {
        if (!this.state.filibuster) { console.log('No active filibuster'); return; }
        const total = Object.keys(SENATORS).length;
        const needed = Math.ceil(total * 0.6);
        const ayes = Math.floor(Math.random() * 20) + 45;
        console.log('\nCLOTURE VOTE -- Aye: ' + ayes + ' | Nay: ' + (total - ayes) + ' | Needed: ' + needed);
        console.log(ayes >= needed ? '   CLOTURE PASSES' : '   CLOTURE FAILS');
        if (ayes >= needed) this.state.filibuster = null;
        this._save('/tmp/hive-senate-complete/state.json', this.state);
    }

    vote(topic, opts) {
        opts = opts || {};
        const supermajority = opts.supermajority || false;
        console.log('\nVOTE: ' + topic + ' ' + (supermajority ? '(SUPERMAJORITY 60%)' : '(Simple Majority)'));
        let ayes = 0, nays = 0, total = 0, vetoes = 0;
        Object.keys(SENATORS).forEach(sid => {
            const s = SENATORS[sid]; const power = s.vote || 1; total += power;
            if (s.veto && s.veto.some(v => topic.toLowerCase().includes(v))) { if (power === 2) vetoes++; nays += power; }
            else if (s.party === 'Conservative' || s.expertise === 'critical') { Math.random() > 0.5 ? nays += power : ayes += power; }
            else if (s.party === 'Progressive') { Math.random() > 0.35 ? ayes += power : nays += power; }
            else { Math.random() > 0.45 ? ayes += power : nays += power; }
        });
        const threshold = supermajority ? total * 0.6 : total / 2;
        const result = ayes > threshold ? 'PASSES' : 'FAILS';
        console.log('   Aye: ' + ayes + ' (' + Math.round(ayes / total * 100) + '%) | Nay: ' + nays + ' (' + Math.round(nays / total * 100) + '%)');
        if (vetoes) console.log('   Vetoes: ' + vetoes);
        console.log('   ' + result);
        this.state.votingRecord = this.state.votingRecord || [];
        this.state.votingRecord.push({ topic, result, ayes, nays, supermajority, time: Date.now() });
        this._save('/tmp/hive-senate-complete/state.json', this.state);
        return result;
    }

    brainstorm(topic, count) {
        count = count || 10;
        console.log('\nBRAINSTORM MODE: ' + topic + '\n   Rule: NO criticism -- just ideas\n');
        const all = Object.keys(SENATORS);
        for (let i = 0; i < count; i++) {
            const s = SENATORS[all[i % all.length]];
            console.log('   ' + s.name + ': What if we ' + topic.toLowerCase() + ' using ' + s.expertise + '?');
        }
    }

    debate(proposal) {
        console.log('\nADVERSARIAL DEBATE: ' + proposal);
        const red = Object.entries(SENATORS).filter(([, s]) => s.party === 'Conservative').slice(0, 4);
        const blue = Object.entries(SENATORS).filter(([, s]) => s.party === 'Progressive').slice(0, 4);
        console.log('\nRED TEAM (Against):'); red.forEach(([, s]) => console.log('   ' + s.name + ': ' + s.expertise + ' concerns!'));
        console.log('\nBLUE TEAM (For):'); blue.forEach(([, s]) => console.log('   ' + s.name + ': ' + s.expertise + ' benefits!'));
        console.log('\n' + (Math.random() > 0.5 ? 'BLUE TEAM WINS (Approved)' : 'RED TEAM WINS (Rejected)'));
    }

    minority(topic, decision) {
        console.log('\nMINORITY REPORT: ' + topic + ' | Majority: ' + decision);
        Object.entries(SENATORS).filter(([, s]) => s.party === 'Conservative' || s.expertise === 'critical').slice(0, 3).forEach(([, s]) => console.log('   ' + s.name + ': I urge reconsideration from ' + s.expertise + ' perspective.'));
    }

    joint(topic) {
        console.log('\nJOINT SESSION: ' + topic);
        Object.keys(SENATORS).slice(0, 8).forEach(sid => { const s = SENATORS[sid]; console.log('   ' + (s.specialty || '*') + ' ' + s.name + ': On behalf of ' + s.expertise + '...'); });
        return this.vote(topic, { supermajority: true });
    }

    leadership() {
        console.log('\nPARTY LEADERSHIP');
        const leaders = {
            Progressive: { leader: 'Riley Dream', whip: 'Brand Kate', policyChair: 'Innovation Kim' },
            Conservative: { leader: 'Money Mike', whip: 'Risk Rachel', policyChair: 'Fiscal Hawk' },
            Neutral: { leader: 'Victoria Adams', whip: 'Sam Practical', policyChair: 'Lee Harmony' },
            Security: { leader: 'Alex Shield', whip: 'Alert Alex', policyChair: 'Secure Steve' },
        };
        for (const [party, l] of Object.entries(leaders)) { console.log('\n  ' + party + ':'); console.log('   Leader: ' + l.leader + ' | Whip: ' + l.whip + ' | Policy Chair: ' + l.policyChair); }
    }

    // BILLS
    introduceBill(title, sponsor) {
        const bill = {
            id: 'S.' + Date.now(), title, sponsor, status: 'introduced', introduced: Date.now(),
            steps: [
                { step: 'Introduced', status: 'complete', time: Date.now() },
                { step: 'First Reading', status: 'pending' }, { step: 'Committee Hearing', status: 'pending' },
                { step: 'Committee Vote', status: 'pending' }, { step: 'Second Reading', status: 'pending' },
                { step: 'Floor Debate', status: 'pending' }, { step: 'Final Vote', status: 'pending' },
                { step: 'Executive Action', status: 'pending' }
            ],
            amendments: [], cosponsors: [], vetoed: false
        };
        this.bills[bill.id] = bill;
        this._save('/tmp/hive-senate-complete/bills.json', this.bills);
        console.log('\nBILL INTRODUCED: ' + bill.id + ' -- ' + title + '\n   Sponsor: ' + sponsor + ' | Status: introduced');
        return bill;
    }

    advanceBill(billId, step) {
        const bill = this.bills[billId];
        if (!bill) { console.log('Bill not found'); return; }
        const idx = bill.steps.findIndex(s => s.step === step);
        if (idx === -1) { console.log('Invalid step: ' + step); return; }
        bill.steps[idx].status = 'complete';
        if (idx < bill.steps.length - 1) bill.steps[idx + 1].status = 'active';
        bill.status = step.toLowerCase().replace(/ /g, '_');
        this._save('/tmp/hive-senate-complete/bills.json', this.bills);
        console.log('\nBILL ' + billId + ': ' + step + ' -- COMPLETE | Status: ' + bill.status);
    }

    listBills() {
        console.log('\nACTIVE BILLS\n');
        const entries = Object.entries(this.bills);
        if (!entries.length) { console.log('   No bills introduced'); return; }
        entries.forEach(([, b]) => { console.log('   ' + b.id + ': ' + b.title); console.log('      Sponsor: ' + b.sponsor + ' | Status: ' + b.status + ' | Cosponsors: ' + b.cosponsors.length + '\n'); });
    }

    // DECREES (Binding Laws on Agents)
    issueDecree(title, content, authority, scope, priority) {
        scope = scope || 'universal'; priority = priority || 'high';
        const decree = {
            id: 'DECREE-' + Date.now(), decreeNumber: this.decrees.length + 1, title, content, authority, scope, priority,
            status: 'active', issued: Date.now(),
            votes: { yes: [], no: [], abstain: [] }, signatures: [],
            enforcement: this._parseEnforcement(content),
            log: ['Decree ' + (this.decrees.length + 1) + ' issued by ' + authority]
        };
        decree.signature = crypto.createHash('sha256').update(JSON.stringify({ n: decree.decreeNumber, t: decree.title, a: decree.authority, i: decree.issued })).digest('hex').substring(0, 16);
        this.decrees.push(decree);
        this._save('/tmp/hive-senate-complete/decrees.json', this.decrees);
        this._enforceDecree(decree);
        console.log('\nDECREE ' + decree.decreeNumber + ' ISSUED -- BINDING ON ALL AGENTS\n   Title: ' + title + '\n   Authority: ' + authority + '\n   Scope: ' + scope + '\n   Priority: ' + priority + '\nContent: ' + content + '\nTHIS DECREE IS NOW BINDING ON ALL AGENTS');
        return decree;
    }

    _parseEnforcement(content) {
        const rules = [];
        if (content.includes('MUST') || content.includes('SHALL')) rules.push({ type: 'mandatory' });
        if (content.includes('NEVER') || content.includes('FORBIDDEN')) rules.push({ type: 'prohibited' });
        if (content.includes('ALWAYS')) rules.push({ type: 'always' });
        if (content.includes('PREFER')) rules.push({ type: 'preferred' });
        return rules;
    }

    _enforceDecree(decree) {
        console.log('\nENFORCING DECREE ' + decree.decreeNumber + '...');
        fs.writeFileSync(path.join(DATA_DIR, 'agent-policy-' + decree.id + '.json'), JSON.stringify({ decreeRef: decree.id, title: decree.title, content: decree.content, scope: decree.scope, priority: decree.priority }, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'memory-rule-' + decree.id + '.json'), JSON.stringify({ decreeRef: decree.id, title: decree.title, directive: decree.content, priority: decree.priority }, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'monitor-rule-' + decree.id + '.json'), JSON.stringify({ decreeRef: decree.id, alert: 'Decree violation: ' + decree.title, priority: decree.priority }, null, 2));
        decree.log.push('Enforced at ' + new Date().toISOString());
        this._save('/tmp/hive-senate-complete/decrees.json', this.decrees);
        console.log('   Agent policy | Memory rule | Monitoring rule created');
        console.log('Decree ' + decree.decreeNumber + ' enforced across all systems');
    }

    checkCompliance(action) {
        const violations = [], required = [];
        for (const decree of this.activeDecrees) {
            const content = decree.content.toLowerCase(), actionLower = action.toLowerCase();
            if (content.includes('NEVER') || content.includes('FORBIDDEN')) {
                const matches = decree.content.match(/(?:NEVER|FORBIDDEN)\s+(?:to\s+)?([^.,]+)/gi);
                if (matches) matches.forEach(m => { const block = m.replace(/(?:NEVER|FORBIDDEN)\s+(?:to\s+)?/i, '').trim(); if (block && actionLower.includes(block.toLowerCase())) violations.push({ decree: decree.decreeNumber, violation: 'NO ' + block }); });
            }
            if (content.includes('MUST ALWAYS')) {
                const match = decree.content.match(/MUST ALWAYS\s+(?:be\s+)?([^.,]+)/i);
                if (match && !actionLower.includes(match[1].toLowerCase())) required.push({ decree: decree.decreeNumber, requirement: match[1] });
            }
        }
        return { violations, required, compliant: violations.length === 0 };
    }

    listDecrees(status) {
        const filtered = status ? this.decrees.filter(d => d.status === status) : this.decrees;
        console.log('\nSENATE DECREES -- Total: ' + filtered.length + ' | Active: ' + this.activeDecrees.length + '\n');
        if (!filtered.length) { console.log('   No decrees'); return; }
        filtered.slice().reverse().forEach(d => {
            const si = d.status === 'active' ? '[ACTIVE]' : d.status === 'revoked' ? '[REVOKED]' : '[OTHER]';
            const pi = d.priority === 'critical' ? 'CRITICAL' : d.priority === 'high' ? 'HIGH' : 'LOW';
            console.log(si + ' ' + pi + ' DECREE ' + d.decreeNumber + ': ' + d.title);
            console.log('   Authority: ' + d.authority + ' | Scope: ' + d.scope + ' | Y:' + d.votes.yes.length + ' N:' + d.votes.no.length);
            console.log('   ' + d.content.substring(0, 80) + '...\n');
        });
    }

    voteDecree(decreeId, senator, vote) {
        const decree = this.decrees.find(d => d.id === decreeId || d.decreeNumber == decreeId);
        if (!decree) { console.log('Decree not found'); return; }
        decree.votes.yes = decree.votes.yes.filter(s => s !== senator);
        decree.votes.no = decree.votes.no.filter(s => s !== senator);
        decree.votes.abstain = decree.votes.abstain.filter(s => s !== senator);
        if (vote === 'yes') decree.votes.yes.push(senator);
        else if (vote === 'no') decree.votes.no.push(senator);
        else decree.votes.abstain.push(senator);
        this._save('/tmp/hive-senate-complete/decrees.json', this.decrees);
        console.log('\n' + senator + ' voted ' + vote.toUpperCase() + ' on Decree ' + decree.decreeNumber);
        console.log('   Yes: ' + decree.votes.yes.length + ' | No: ' + decree.votes.no.length + ' | Abstain: ' + decree.votes.abstain.length);
    }

    revokeDecree(decreeId, authority) {
        const decree = this.decrees.find(d => d.id === decreeId || d.decreeNumber == decreeId);
        if (!decree) { console.log('Decree not found'); return; }
        decree.status = 'revoked'; decree.revoked = Date.now(); decree.revokedBy = authority;
        this._save('/tmp/hive-senate-complete/decrees.json', this.decrees);
        console.log('\nDecree ' + decree.decreeNumber + ' REVOKED by ' + authority);
    }

    // HEARINGS
    holdHearing(topic, committee, witnessType) {
        witnessType = witnessType || 'tech';
        const witnesses = WITNESSES[witnessType] || WITNESSES.tech;
        const witness = witnesses[Math.floor(Math.random() * witnesses.length)];
        const id = 'HRG-' + Date.now();
        this.hearings[id] = { id, topic, committee, witness, date: Date.now(), transcript: [] };
        this._save('/tmp/hive-senate-complete/hearings.json', this.hearings);
        console.log('\nHEARING: ' + topic);
        console.log('   Committee: ' + committee + ' | Witness: ' + witness.name + ' (' + witness.title + ')');
        console.log('   Expertise: ' + witness.expertise);
        return id;
    }

    // ELECTIONS (Democratic Legitimacy)
    holdElections() {
        console.log('\nSENATORIAL ELECTIONS\n');
        const results = {};
        Object.entries(SENATORS).filter(([, s]) => s.term !== 'permanent').forEach(([id, s]) => {
            const approval = Math.floor(Math.random() * 40) + 60;
            const reElected = approval > 70;
            results[id] = { name: s.name, approval, reElected };
            console.log('   ' + (reElected ? 'RE-ELECTED' : 'DEFEATED') + ' ' + s.name + ' (' + s.term + '): ' + approval + '%');
            if (reElected && s.term === '1-year') s.term = '2-years';
            if (reElected && s.term === '2-years') s.term = 'permanent';
        });
        this.elections[Date.now()] = results;
        this._save('/tmp/hive-senate-complete/elections.json', this.elections);
    }

    electionResults() {
        console.log('\nELECTION HISTORY\n');
        const elections = Object.entries(this.elections);
        if (!elections.length) { console.log('   No elections held yet'); return; }
        elections.slice().reverse().forEach(([ts, results]) => {
            console.log('   Election: ' + new Date(parseInt(ts)).toLocaleDateString());
            Object.values(results).forEach(r => console.log('     ' + r.name + ': ' + r.approval + '% ' + (r.reElected ? 'RE-ELECTED' : 'DEFEATED')));
        });
    }

    dashboard() {
        console.log('\nHIVE SENATE COMPLETE -- COMMAND CENTER');
        console.log('  Senators: ' + Object.keys(SENATORS).length);
        console.log('  Total Decrees: ' + this.decrees.length + ' | Active: ' + this.activeDecrees.length);
        console.log('  Active Bills: ' + Object.keys(this.bills).length);
        console.log('  Elections Held: ' + Object.keys(this.elections).length);
        console.log('\n  ACTIVE DECREES (Binding on All Agents):');
        this.activeDecrees.slice(0, 5).forEach(d => console.log('    ' + d.decreeNumber + '. ' + d.title));
    }
}

// CLI
const senate = new HiveSenateComplete();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const CMDS = {
    roster:      () => senate.roster(),
    committee:   () => senate.committee(args.join(' ') || 'general'),
    committees:  () => senate.committees(),
    caucus:      () => senate.caucus(args[0] || 'New Caucus', args[1] || 'neutral'),
    caucuses:    () => senate.caucuses(),
    bipartisan:  () => senate.bipartisan(),
    filibuster:  () => senate.filibuster('skeptic', args.join(' ') || 'this measure'),
    speech:      () => senate.speech(args.join(' ') || 'I stand and I speak...'),
    cloture:     () => senate.cloture(),
    vote:        () => senate.vote(args.join(' ') || 'The proposal'),
    brainstorm:  () => senate.brainstorm(args.join(' ') || 'innovation'),
    debate:      () => senate.debate(args.join(' ') || 'this proposal'),
    minority:    () => senate.minority(args[0] || 'proposal', 'APPROVED'),
    joint:       () => senate.joint(args.join(' ') || 'national priority'),
    leadership:  () => senate.leadership(),
    // Bills
    bill:        () => senate.introduceBill(args.join(' ') || 'New Legislation', 'Victoria Adams'),
    bills:       () => senate.listBills(),
    advance:     () => senate.advanceBill(args[0], args.slice(1).join(' ') || 'Committee Hearing'),
    // Decrees
    decree:      () => senate.issueDecree(args[0] || 'New Decree', args.slice(1).join(' ') || 'Content', process.env.USER || 'The Senate', args.includes('--agents') ? 'agents' : args.includes('--memory') ? 'memory' : 'universal', args.includes('--critical') ? 'critical' : args.includes('--low') ? 'low' : 'high'),
    decrees:     () => senate.listDecrees(),
    'dv':        () => senate.voteDecree(args[0], args[1], args[2]),
    revoke:      () => senate.revokeDecree(args[0], process.env.USER || 'The Senate'),
    check:       () => { const r = senate.checkCompliance(args.join(' ')); console.log(r.compliant ? '\nCOMPLIANT' : '\nVIOLATIONS: ' + r.violations.map(v => '\n  Decree ' + v.decree + ': ' + v.violation).join('')); },
    // Hearings
    hearing:     () => senate.holdHearing(args.slice(1).join(' ') || 'Topic', args[0] || 'General', args[2] || 'tech'),
    // Elections
    election:    () => senate.holdElections(),
    elections:   () => senate.electionResults(),
    // Dashboard
    dashboard:   () => senate.dashboard(),
    help: () => console.log('\nHive Senate Complete Commands\n\n  roster        Show all senators\n  committee     Form a committee\n  committees    List committees\n  caucus        Form a caucus\n  caucuses      List caucuses\n  bipartisan    Form bipartisan coalition\n  filibuster    Start filibuster\n  speech        Add speech to filibuster\n  cloture       Call cloture vote\n  vote          Simple majority vote\n  brainstorm    Ideas with no criticism\n  debate        Red vs Blue team\n  minority      Minority report\n  joint         Joint session\n  leadership    Party leadership\n  bill          Introduce bill\n  bills         List bills\n  advance       Advance bill to next step\n  decree        Issue binding decree\n  decrees       List decrees\n  dv <#> <senator> <vote>  Vote on decree\n  revoke        Revoke decree\n  check         Check decree compliance\n  hearing       Hold committee hearing\n  election      Hold senator elections\n  elections     Show election history\n  dashboard     Show command center\n'),
};

CMDS[cmd] ? CMDS[cmd]() : CMDS.help();

module.exports = { HiveSenateComplete, SENATORS };
