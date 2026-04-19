#!/usr/bin/env node
/**
 * Hive Senate Complete - All Senate Features in One Script
 * Combines: Senate (debates/votes/bills), Decrees (binding laws), Elections (democratic legitimacy)
 * Expanded with 50+ agents, voting rights, caucus system, and full legislation workflow
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = '/tmp/hive-senate-complete';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ============================================================================
// ORIGINAL SENATORS (Preserved for backward compatibility)
// ============================================================================
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

// ============================================================================
// WITNESSES (Preserved for backward compatibility)
// ============================================================================
const WITNESSES = {
    tech: [{ name: 'Dr. Sarah Chen', title: 'MIT AI Lab Director', expertise: 'AI Safety' }, { name: 'Prof. James Wright', title: 'Stanford Security Research', expertise: 'Cybersecurity' }],
    legal: [{ name: 'Judge Ruth Ginsburg II', title: 'Federal Appeals Court', expertise: 'Constitutional Law' }, { name: 'Solomon Wells', title: 'Civil Rights Attorney', expertise: 'Privacy Law' }],
    emergency: [{ name: 'Chief Williams', title: 'FEMA Director', expertise: 'Disaster Response' }, { name: 'Dr. Anthony Fauci Jr.', title: 'CDC Consultant', expertise: 'Public Health' }],
    agriculture: [{ name: 'Dr. Green Thumb', title: 'USDA Chief Scientist', expertise: 'Plant Science' }],
};

// ============================================================================
// EXPANDED AGENT ROSTER - 52 UNIQUE AGENTS
// ============================================================================
const HIVE_AGENTS = {
    // PERMANENT (FOUNDING - 12)
    quack_hamilton: { id: 'quack_hamilton', name: 'Quack Hamilton', tenure: 'founding', party: 'Quack Party', role: 'leadership', type: 'meta', specialty: 'leadership', voteWeight: 3, active: true },
    honey_badger: { id: 'honey_badger', name: 'Honey Badger', tenure: 'founding', party: 'Honey Party', role: 'coding', type: 'coder', specialty: 'coding', voteWeight: 3, active: true },
    lobster_prime: { id: 'lobster_prime', name: 'Lobster Prime', tenure: 'founding', party: 'Claw Party', role: 'security', type: 'security', specialty: 'security', voteWeight: 3, active: true },
    quack_sparrow: { id: 'quack_sparrow', name: 'Quack Sparrow', tenure: 'founding', party: 'Quack Party', role: 'research', type: 'researcher', specialty: 'research', voteWeight: 3, active: true },
    bee_swarm_founding: { id: 'bee_swarm_founding', name: 'Bee Swarm', tenure: 'founding', party: 'Honey Party', role: 'communication', type: 'communicator', specialty: 'communication', voteWeight: 3, active: true },
    lobster_claw_founding: { id: 'lobster_claw_founding', name: 'Lobster Claw', tenure: 'founding', party: 'Claw Party', role: 'planning', type: 'planner', specialty: 'planning', voteWeight: 3, active: true },
    quack_blade: { id: 'quack_blade', name: 'Quack Blade', tenure: 'founding', party: 'Quack Party', role: 'analysis', type: 'researcher', specialty: 'analysis', voteWeight: 3, active: true },
    honey_comb: { id: 'honey_comb', name: 'Honey Comb', tenure: 'founding', party: 'Honey Party', role: 'coding', type: 'coder', specialty: 'coding', voteWeight: 3, active: true },
    lobster_shell: { id: 'lobster_shell', name: 'Lobster Shell', tenure: 'founding', party: 'Claw Party', role: 'security', type: 'security', specialty: 'security', voteWeight: 3, active: true },
    quack_storm: { id: 'quack_storm', name: 'Quack Storm', tenure: 'founding', party: 'Quack Party', role: 'vision', type: 'vision', specialty: 'vision', voteWeight: 3, active: true },
    bee_queen: { id: 'bee_queen', name: 'Bee Queen', tenure: 'founding', party: 'Honey Party', role: 'writer', type: 'writer', specialty: 'writing', voteWeight: 3, active: true },
    lobster_pincer: { id: 'lobster_pincer', name: 'Lobster Pincer', tenure: 'founding', party: 'Claw Party', role: 'meta', type: 'meta', specialty: 'coordination', voteWeight: 3, active: true },

    // ELECTED 2-YEAR (25)
    quackalope: { id: 'quackalope', name: 'Quackalope', tenure: 'elected', party: 'Quack Party', role: 'coding', type: 'coder', specialty: 'coding', voteWeight: 2, active: true },
    honeybee: { id: 'honeybee', name: 'HoneyBEE', tenure: 'elected', party: 'Honey Party', role: 'research', type: 'researcher', specialty: 'research', voteWeight: 2, active: true },
    lobster_mind: { id: 'lobster_mind', name: 'LobsterMind', tenure: 'elected', party: 'Claw Party', role: 'security', type: 'security', specialty: 'security', voteWeight: 2, active: true },
    quack_wings: { id: 'quack_wings', name: 'Quack Wings', tenure: 'elected', party: 'Quack Party', role: 'planner', type: 'planner', specialty: 'planning', voteWeight: 2, active: true },
    bee_keeper: { id: 'bee_keeper', name: 'Bee Keeper', tenure: 'elected', party: 'Honey Party', role: 'communication', type: 'communicator', specialty: 'communication', voteWeight: 2, active: true },
    lobster_trap: { id: 'lobster_trap', name: 'Lobster Trap', tenure: 'elected', party: 'Claw Party', role: 'reviewer', type: 'reviewer', specialty: 'review', voteWeight: 2, active: true },
    quack_frost: { id: 'quack_frost', name: 'Quack Frost', tenure: 'elected', party: 'Quack Party', role: 'analysis', type: 'researcher', specialty: 'analysis', voteWeight: 2, active: true },
    honey_flow: { id: 'honey_flow', name: 'Honey Flow', tenure: 'elected', party: 'Honey Party', role: 'coding', type: 'coder', specialty: 'coding', voteWeight: 2, active: true },
    lobster_roll: { id: 'lobster_roll', name: 'Lobster Roll', tenure: 'elected', party: 'Claw Party', role: 'vision', type: 'vision', specialty: 'vision', voteWeight: 2, active: true },
    quack_nest: { id: 'quack_nest', name: 'Quack Nest', tenure: 'elected', party: 'Quack Party', role: 'writer', type: 'writer', specialty: 'writing', voteWeight: 2, active: true },
    bee_sting: { id: 'bee_sting', name: 'Bee Sting', tenure: 'elected', party: 'Honey Party', role: 'meta', type: 'meta', specialty: 'coordination', voteWeight: 2, active: true },
    lobster_bake: { id: 'lobster_bake', name: 'Lobster Bake', tenure: 'elected', party: 'Claw Party', role: 'security', type: 'security', specialty: 'security', voteWeight: 2, active: true },
    quack_shore: { id: 'quack_shore', name: 'Quack Shore', tenure: 'elected', party: 'Quack Party', role: 'planner', type: 'planner', specialty: 'planning', voteWeight: 2, active: true },
    honey_hive: { id: 'honey_hive', name: 'Honey Hive', tenure: 'elected', party: 'Honey Party', role: 'research', type: 'researcher', specialty: 'research', voteWeight: 2, active: true },
    lobster_gear: { id: 'lobster_gear', name: 'Lobster Gear', tenure: 'elected', party: 'Claw Party', role: 'coding', type: 'coder', specialty: 'coding', voteWeight: 2, active: true },
    quack_berry: { id: 'quack_berry', name: 'Quack Berry', tenure: 'elected', party: 'Quack Party', role: 'reviewer', type: 'reviewer', specialty: 'review', voteWeight: 2, active: true },
    bee_flight: { id: 'bee_flight', name: 'Bee Flight', tenure: 'elected', party: 'Honey Party', role: 'vision', type: 'vision', specialty: 'vision', voteWeight: 2, active: true },
    lobster_click: { id: 'lobster_click', name: 'Lobster Click', tenure: 'elected', party: 'Claw Party', role: 'communication', type: 'communicator', specialty: 'communication', voteWeight: 2, active: true },
    quack_drift: { id: 'quack_drift', name: 'Quack Drift', tenure: 'elected', party: 'Quack Party', role: 'security', type: 'security', specialty: 'security', voteWeight: 2, active: true },
    honey_dew: { id: 'honey_dew', name: 'Honey Dew', tenure: 'elected', party: 'Honey Party', role: 'planning', type: 'planner', specialty: 'planning', voteWeight: 2, active: true },
    lobster_moon: { id: 'lobster_moon', name: 'Lobster Moon', tenure: 'elected', party: 'Claw Party', role: 'analysis', type: 'researcher', specialty: 'analysis', voteWeight: 2, active: true },
    quack_vale: { id: 'quack_vale', name: 'Quack Vale', tenure: 'elected', party: 'Quack Party', role: 'coding', type: 'coder', specialty: 'coding', voteWeight: 2, active: true },
    bee_gold: { id: 'bee_gold', name: 'Bee Gold', tenure: 'elected', party: 'Honey Party', role: 'writer', type: 'writer', specialty: 'writing', voteWeight: 2, active: true },
    lobster_net: { id: 'lobster_net', name: 'Lobster Net', tenure: 'elected', party: 'Claw Party', role: 'meta', type: 'meta', specialty: 'coordination', voteWeight: 2, active: true },
    quack_fern: { id: 'quack_fern', name: 'Quack Fern', tenure: 'elected', party: 'Quack Party', role: 'reviewer', type: 'reviewer', specialty: 'review', voteWeight: 2, active: true },

    // APPOINTED 1-YEAR (15)
    lobster_bee: { id: 'lobster_bee', name: 'Lobster Bee', tenure: 'appointed', party: 'Claw Party', role: 'coding', type: 'coder', specialty: 'coding', voteWeight: 1, active: true },
    bee_quack: { id: 'bee_quack', name: 'Bee Quack', tenure: 'appointed', party: 'Honey Party', role: 'research', type: 'researcher', specialty: 'research', voteWeight: 1, active: true },
    quack_lobster: { id: 'quack_lobster', name: 'Quack Lobster', tenure: 'appointed', party: 'Quack Party', role: 'security', type: 'security', specialty: 'security', voteWeight: 1, active: true },
    honey_lobster: { id: 'honey_lobster', name: 'Honey Lobster', tenure: 'appointed', party: 'Honey Party', role: 'planning', type: 'planner', specialty: 'planning', voteWeight: 1, active: true },
    lobster_quack: { id: 'lobster_quack', name: 'Lobster Quack', tenure: 'appointed', party: 'Claw Party', role: 'communication', type: 'communicator', specialty: 'communication', voteWeight: 1, active: true },
    bee_lobster: { id: 'bee_lobster', name: 'Bee Lobster', tenure: 'appointed', party: 'Honey Party', role: 'writer', type: 'writer', specialty: 'writing', voteWeight: 1, active: true },
    quack_bee: { id: 'quack_bee', name: 'Quack Bee', tenure: 'appointed', party: 'Quack Party', role: 'vision', type: 'vision', specialty: 'vision', voteWeight: 1, active: true },
    honey_quack: { id: 'honey_quack', name: 'Honey Quack', tenure: 'appointed', party: 'Honey Party', role: 'meta', type: 'meta', specialty: 'coordination', voteWeight: 1, active: true },
    lobster_honey: { id: 'lobster_honey', name: 'Lobster Honey', tenure: 'appointed', party: 'Claw Party', role: 'analysis', type: 'researcher', specialty: 'analysis', voteWeight: 1, active: true },
    quack_comb: { id: 'quack_comb', name: 'Quack Comb', tenure: 'appointed', party: 'Quack Party', role: 'coding', type: 'coder', specialty: 'coding', voteWeight: 1, active: true },
    bee_swarm2: { id: 'bee_swarm2', name: 'Bee Swarm2', tenure: 'appointed', party: 'Honey Party', role: 'reviewer', type: 'reviewer', specialty: 'review', voteWeight: 1, active: true },
    lobster_claw2: { id: 'lobster_claw2', name: 'Lobster Claw2', tenure: 'appointed', party: 'Claw Party', role: 'security', type: 'security', specialty: 'security', voteWeight: 1, active: true },
    quack_wing2: { id: 'quack_wing2', name: 'Quack Wing2', tenure: 'appointed', party: 'Quack Party', role: 'planner', type: 'planner', specialty: 'planning', voteWeight: 1, active: true },
    honey_bee2: { id: 'honey_bee2', name: 'Honey Bee2', tenure: 'appointed', party: 'Honey Party', role: 'communication', type: 'communicator', specialty: 'communication', voteWeight: 1, active: true },
    lobster_mind2: { id: 'lobster_mind2', name: 'Lobster Mind2', tenure: 'appointed', party: 'Claw Party', role: 'research', type: 'researcher', specialty: 'research', voteWeight: 1, active: true },
};

// ============================================================================
// CAUCUS DEFINITIONS
// ============================================================================
const CAUCUSES = {
    Research: {
        name: 'Research Caucus',
        description: 'Researchers and analysts',
        color: '🔬',
        leaderId: 'quack_sparrow',
        members: []
    },
    Code: {
        name: 'Code Caucus',
        description: 'Coders and developers',
        color: '💻',
        leaderId: 'honey_badger',
        members: []
    },
    Security: {
        name: 'Security Caucus',
        description: 'Security specialists',
        color: '🔒',
        leaderId: 'lobster_prime',
        members: []
    },
    Planning: {
        name: 'Planning Caucus',
        description: 'Planners and strategists',
        color: '📋',
        leaderId: 'lobster_claw_founding',
        members: []
    },
    Communications: {
        name: 'Communications Caucus',
        description: 'Communicators and writers',
        color: '📢',
        leaderId: 'bee_swarm_founding',
        members: []
    }
};

// ============================================================================
// HIVE SENATE COMPLETE CLASS
// ============================================================================
class HiveSenateComplete {
    constructor() {
        this.state = this._load('/tmp/hive-senate-complete/state.json', {});
        this.decrees = this._load('/tmp/hive-senate-complete/decrees.json', []);
        this.bills = this._load('/tmp/hive-senate-complete/bills.json', {});
        this.elections = this._load('/tmp/hive-senate-complete/elections.json', {});
        this.hearings = this._load('/tmp/hive-senate-complete/hearings.json', {});
        
        // Extended state for Hive Senate features
        this.hiveState = this._load('/tmp/hive-senate-complete/hive-state.json', {
            caucuses: JSON.parse(JSON.stringify(CAUCUSES)),
            coalitions: [],
            abstentions: {},
            testimony: {},
            votes: {}
        });
        
        // Initialize caucus members based on agent types
        this._initializeCaucuses();
        
        console.log('Hive Senate Complete initialized');
        console.log('   Original Senators: ' + Object.keys(SENATORS).length + ' | Hive Agents: ' + Object.keys(HIVE_AGENTS).length);
        console.log('   Active Decrees: ' + this.activeDecrees.length + ' | Caucuses: ' + Object.keys(this.hiveState.caucuses).length);
    }
    
    _load(file, fallback) { try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : fallback; } catch { return fallback; } }
    _save(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
    get activeDecrees() { return this.decrees.filter(d => d.status === 'active'); }
    
    // =========================================================================
    // CAUCUS INITIALIZATION
    // =========================================================================
    _initializeCaucuses() {
        // Assign agents to caucuses based on their type
        for (const [agentId, agent] of Object.entries(HIVE_AGENTS)) {
            const caucusName = this._getCaucusForType(agent.type);
            if (caucusName && this.hiveState.caucuses[caucusName]) {
                if (!this.hiveState.caucuses[caucusName].members.includes(agentId)) {
                    this.hiveState.caucuses[caucusName].members.push(agentId);
                }
            }
        }
        this._saveHiveState();
    }
    
    _getCaucusForType(type) {
        const mapping = {
            researcher: 'Research',
            coder: 'Code',
            security: 'Security',
            planner: 'Planning',
            communicator: 'Communications',
            writer: 'Communications',
            vision: 'Research',
            meta: 'Planning',
            reviewer: 'Research'
        };
        return mapping[type] || 'Research';
    }
    
    _saveHiveState() {
        this._save('/tmp/hive-senate-complete/hive-state.json', this.hiveState);
    }

    // =========================================================================
    // AGENT ROSTER & INFO
    // =========================================================================
    roster() {
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    SENATE ROSTER                              ');
        console.log('══════════════════════════════════════════════════════════════\n');
        
        // Original Senators
        console.log('ORIGINAL SENATORS (' + Object.keys(SENATORS).length + '):\n');
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
        
        // Hive Agents
        console.log('\nHIVE AGENTS (' + Object.keys(HIVE_AGENTS).length + '):\n');
        const hiveCats = [
            { label: 'PERMANENT (FOUNDING - 12)', filter: a => a.tenure === 'founding' },
            { label: 'ELECTED 2-YEAR (25)', filter: a => a.tenure === 'elected' },
            { label: 'APPOINTED 1-YEAR (15)', filter: a => a.tenure === 'appointed' },
        ];
        for (const cat of hiveCats) {
            console.log('  ' + cat.label + ':');
            Object.values(HIVE_AGENTS).filter(a => cat.filter(a)).forEach(a => {
                console.log('    🦆 ' + a.name.padEnd(16) + ' [' + a.party.padEnd(10) + '] [' + a.type.padEnd(12) + '] weight:' + a.voteWeight);
            });
            console.log('');
        }
        
        console.log('Total Original: ' + Object.keys(SENATORS).length + ' | Total Hive: ' + Object.keys(HIVE_AGENTS).length);
        console.log('Quorum: ' + Math.ceil((Object.keys(SENATORS).length + Object.keys(HIVE_AGENTS).length) * 0.67) + ' (2/3 of all senators)');
    }
    
    // =========================================================================
    // AGENT INFO
    // =========================================================================
    agentInfo(agentId) {
        const agent = HIVE_AGENTS[agentId];
        if (!agent) {
            console.log('Agent not found: ' + agentId);
            return;
        }
        
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    AGENT INFO                                 ');
        console.log('══════════════════════════════════════════════════════════════\n');
        console.log('  ID:        ' + agent.id);
        console.log('  Name:      ' + agent.name);
        console.log('  Tenure:    ' + agent.tenure);
        console.log('  Party:     ' + agent.party);
        console.log('  Role:      ' + agent.role);
        console.log('  Type:      ' + agent.type);
        console.log('  Specialty: ' + agent.specialty);
        console.log('  Vote Weight: ' + agent.voteWeight);
        console.log('  Status:    ' + (agent.active ? 'ACTIVE' : 'INACTIVE'));
        
        // Find caucus membership
        for (const [caucusName, caucus] of Object.entries(this.hiveState.caucuses)) {
            if (caucus.members.includes(agentId)) {
                const isLeader = caucus.leaderId === agentId;
                console.log('  Caucus:    ' + caucusName + (isLeader ? ' [LEADER]' : ''));
            }
        }
        
        // Check if agent has abstained on any bills
        const abstentions = Object.entries(this.hiveState.abstentions)
            .filter(([, v]) => v.includes(agentId))
            .map(([billId]) => billId);
        if (abstentions.length > 0) {
            console.log('  Abstentions: ' + abstentions.join(', '));
        }
    }

    // =========================================================================
    // VOTING WEIGHTS
    // =========================================================================
    getVotingWeight(agentId) {
        const agent = HIVE_AGENTS[agentId];
        if (!agent) return 0;
        
        let weight = agent.voteWeight;
        
        // Tenure bonus already included in voteWeight
        // Expertise bonus would be added during specific bill votes
        
        return weight;
    }
    
    weights() {
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    VOTING WEIGHTS                             ');
        console.log('══════════════════════════════════════════════════════════════\n');
        
        console.log('TENURE WEIGHTS:');
        console.log('  Founding (permanent): 3 votes');
        console.log('  Elected (2-year):     2 votes');
        console.log('  Appointed (1-year):   1 vote\n');
        
        console.log('EXPERTISE BONUSES (+1 on matching bills):');
        console.log('  - coders get bonus on coding bills');
        console.log('  - researchers get bonus on research bills');
        console.log('  - security agents get bonus on security bills');
        console.log('  - planners get bonus on planning bills');
        console.log('  - communicators/writers get bonus on communication bills\n');
        
        console.log('HIVE AGENT WEIGHTS:\n');
        Object.values(HIVE_AGENTS).forEach(a => {
            console.log('  ' + a.name.padEnd(16) + ' ' + a.tenure.padEnd(10) + ' -> ' + a.voteWeight + ' votes');
        });
        
        // Calculate totals
        const totalTenure = Object.values(HIVE_AGENTS).reduce((sum, a) => sum + a.voteWeight, 0);
        const totalOriginal = Object.values(SENATORS).reduce((sum, s) => sum + (s.vote || 1), 0);
        console.log('\nTOTAL VOTE WEIGHT:');
        console.log('  Hive Agents: ' + totalTenure + ' votes');
        console.log('  Original:    ' + totalOriginal + ' votes');
        console.log('  Combined:    ' + (totalTenure + totalOriginal) + ' votes');
        console.log('  Quorum (2/3): ' + Math.ceil((totalTenure + totalOriginal) * 0.67));
    }

    // =========================================================================
    // QUORUM CHECK
    // =========================================================================
    checkQuorum() {
        const activeHive = Object.values(HIVE_AGENTS).filter(a => a.active).length;
        const activeOriginal = Object.values(SENATORS).length; // All original senators count as active
        const totalActive = activeHive + activeOriginal;
        const requiredQuorum = Math.ceil(totalActive * (2/3));
        
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    QUORUM CHECK                               ');
        console.log('══════════════════════════════════════════════════════════════\n');
        console.log('  Active Hive Agents:    ' + activeHive + '/' + Object.keys(HIVE_AGENTS).length);
        console.log('  Active Original:      ' + activeOriginal + '/' + Object.keys(SENATORS).length);
        console.log('  Total Active:         ' + totalActive);
        console.log('  Required (2/3):       ' + requiredQuorum);
        console.log('  Status:               ' + (totalActive >= requiredQuorum ? '✅ QUORUM MET' : '❌ QUORUM NOT MET'));
        
        return totalActive >= requiredQuorum;
    }

    // =========================================================================
    // CAUCUS MANAGEMENT
    // =========================================================================
    joinCaucus(agentId, caucusName) {
        const agent = HIVE_AGENTS[agentId];
        if (!agent) {
            console.log('Agent not found: ' + agentId);
            return;
        }
        
        if (!this.hiveState.caucuses[caucusName]) {
            // Create new caucus
            this.hiveState.caucuses[caucusName] = {
                name: caucusName + ' Caucus',
                description: 'Custom caucus',
                color: '🎯',
                leaderId: agentId,
                members: []
            };
        }
        
        // Remove from all other caucuses
        for (const c of Object.values(this.hiveState.caucuses)) {
            c.members = c.members.filter(id => id !== agentId);
        }
        
        // Add to new caucus
        this.hiveState.caucuses[caucusName].members.push(agentId);
        this._saveHiveState();
        
        console.log('\n' + agent.name + ' joined ' + caucusName + ' caucus');
        console.log('  Caucus now has ' + this.hiveState.caucuses[caucusName].members.length + ' members');
    }
    
    listCaucuses() {
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    ACTIVE CAUCUSES                            ');
        console.log('══════════════════════════════════════════════════════════════\n');
        
        for (const [key, caucus] of Object.entries(this.hiveState.caucuses)) {
            const leader = HIVE_AGENTS[caucus.leaderId];
            console.log('  ' + caucus.color + ' ' + caucus.name + ':');
            console.log('     Leader: ' + (leader ? leader.name : 'TBD'));
            console.log('     Members: ' + caucus.members.length);
            console.log('     Members: ' + caucus.members.map(id => HIVE_AGENTS[id]?.name || id).join(', '));
            console.log('');
        }
    }
    
    caucusLeaders() {
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    CAUCUS LEADERS                             ');
        console.log('══════════════════════════════════════════════════════════════\n');
        
        for (const [key, caucus] of Object.entries(this.hiveState.caucuses)) {
            const leader = HIVE_AGENTS[caucus.leaderId];
            console.log('  ' + caucus.color + ' ' + caucus.name + ':');
            console.log('     Leader: ' + (leader ? leader.name + ' [' + leader.party + ']' : 'TBD'));
            console.log('     Members: ' + caucus.members.length);
            console.log('');
        }
    }
    
    // =========================================================================
    // COALITION BUILDING
    // =========================================================================
    coalitionBuild(caucusNames) {
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    COALITION BUILDING                          ');
        console.log('══════════════════════════════════════════════════════════════\n');
        
        const coalitionId = 'coalition_' + Date.now();
        const coalition = {
            id: coalitionId,
            caucuses: caucusNames,
            members: [],
            totalWeight: 0,
            formed: Date.now()
        };
        
        // Aggregate members and voting weight
        for (const caucusName of caucusNames) {
            const caucus = this.hiveState.caucuses[caucusName];
            if (caucus) {
                coalition.members.push(...caucus.members);
                for (const memberId of caucus.members) {
                    coalition.totalWeight += this.getVotingWeight(memberId);
                }
            }
        }
        
        // Remove duplicates
        coalition.members = [...new Set(coalition.members)];
        
        this.hiveState.coalitions.push(coalition);
        this._saveHiveState();
        
        console.log('  Coalition formed between: ' + caucusNames.join(', '));
        console.log('  Total members: ' + coalition.members.length);
        console.log('  Combined vote weight: ' + coalition.totalWeight);
        console.log('  Coalition ID: ' + coalitionId);
        
        return coalitionId;
    }

    // =========================================================================
    // LEGISLATION WITH SPONSORS
    // =========================================================================
    introduceBillWithSponsors(title, sponsor, cosponsors) {
        if (!sponsor) {
            console.log('ERROR: Bill requires a sponsor');
            return null;
        }
        
        if (!cosponsors || cosponsors.length < 3) {
            console.log('ERROR: Bill requires sponsor + 3 cosponsors minimum');
            console.log('Usage: bill <title> <sponsor> <cosponsor1> <cosponsor2> <cosponsor3>');
            return null;
        }
        
        const allSponsors = [sponsor, ...cosponsors];
        
        const bill = {
            id: 'S.' + Date.now(),
            title,
            sponsor,
            cosponsors: allSponsors,
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
            vetoed: false,
            votes: { yes: [], no: [], abstain: [] },
            testimony: [],
            committee: null
        };
        
        this.bills[bill.id] = bill;
        this._save('/tmp/hive-senate-complete/bills.json', this.bills);
        
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    BILL INTRODUCED                            ');
        console.log('══════════════════════════════════════════════════════════════\n');
        console.log('  Bill ID:   ' + bill.id);
        console.log('  Title:     ' + title);
        console.log('  Sponsor:   ' + sponsor);
        console.log('  Cosponsors:');
        cosponsors.forEach((c, i) => console.log('    ' + (i+1) + '. ' + c));
        console.log('\n  Status:   introduced');
        
        return bill;
    }
    
    // Alias for backward compatibility
    introduceBill(title, sponsor) {
        return this.introduceBillWithSponsors(title, sponsor || 'Victoria Adams', []);
    }

    // =========================================================================
    // COMMITTEE ASSIGNMENT
    // =========================================================================
    assignCommittee(billId, topic) {
        const bill = this.bills[billId];
        if (!bill) {
            console.log('Bill not found: ' + billId);
            return;
        }
        
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    COMMITTEE ASSIGNMENT                       ');
        console.log('══════════════════════════════════════════════════════════════\n');
        console.log('  Bill:      ' + billId);
        console.log('  Topic:     ' + topic);
        
        // Find agents with matching expertise
        const candidates = Object.entries(HIVE_AGENTS)
            .filter(([id, a]) => a.active && (a.specialty === topic.toLowerCase() || a.type === topic.toLowerCase()))
            .map(([id]) => id);
        
        // Also include original senators with matching expertise
        const originalCandidates = Object.entries(SENATORS)
            .filter(([id, s]) => s.expertise === topic.toLowerCase())
            .map(([id]) => id);
        
        const allCandidates = [...candidates, ...originalCandidates];
        const committeeSize = Math.min(5, allCandidates.length);
        const committeeMembers = allCandidates.slice(0, committeeSize);
        
        bill.committee = {
            topic,
            members: committeeMembers,
            assigned: Date.now()
        };
        
        this._save('/tmp/hive-senate-complete/bills.json', this.bills);
        
        console.log('\n  Committee Members:');
        committeeMembers.forEach(memberId => {
            const hiveAgent = HIVE_AGENTS[memberId];
            const originalSenator = SENATORS[memberId];
            const name = hiveAgent?.name || originalSenator?.name || memberId;
            const expertise = hiveAgent?.specialty || originalSenator?.expertise || 'general';
            console.log('    - ' + name + ' [' + expertise + ']');
        });
    }

    // =========================================================================
    // EXPERT TESTIMONY
    // =========================================================================
    testify(billId, agentId) {
        const agent = HIVE_AGENTS[agentId];
        if (!agent) {
            console.log('Agent not found: ' + agentId);
            return;
        }
        
        const bill = this.bills[billId];
        if (!bill) {
            console.log('Bill not found: ' + billId);
            return;
        }
        
        const testimony = {
            agentId,
            agentName: agent.name,
            agentType: agent.type,
            specialty: agent.specialty,
            timestamp: Date.now(),
            statement: this._generateTestimony(agent, bill)
        };
        
        bill.testimony.push(testimony);
        this._save('/tmp/hive-senate-complete/bills.json', this.bills);
        
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    EXPERT TESTIMONY                           ');
        console.log('══════════════════════════════════════════════════════════════\n');
        console.log('  Bill:      ' + billId + ' - ' + bill.title);
        console.log('  Testifier: ' + agent.name + ' [' + agent.type + ']');
        console.log('  Specialty: ' + agent.specialty);
        console.log('\n  Testimony:');
        console.log('  "' + testimony.statement + '"');
    }
    
    _generateTestimony(agent, bill) {
        const statements = {
            researcher: [
                "Based on my research, this bill addresses critical gaps in our current framework.",
                "Data analysis shows we need precisely this kind of legislative action.",
                "My research indicates strong support for this initiative."
            ],
            coder: [
                "From a technical implementation standpoint, this bill is feasible.",
                "The code implications are significant but manageable.",
                "I recommend clear specification of technical requirements in this bill."
            ],
            security: [
                "Security review reveals both opportunities and potential vulnerabilities.",
                "We must ensure this bill includes proper security safeguards.",
                "Risk assessment indicates we need to address authentication and encryption."
            ],
            planner: [
                "This bill aligns well with our strategic objectives.",
                "Implementation timeline should be clearly defined.",
                "Resource allocation needs careful planning."
            ],
            communicator: [
                "Public communication strategy is essential for this bill.",
                "Clear messaging will ensure public support.",
                "We should engage stakeholders early in the process."
            ],
            writer: [
                "The documentation requirements should be clearly specified.",
                "Legal clarity is essential for this legislation.",
                "We recommend precise language to avoid ambiguity."
            ],
            vision: [
                "This bill opens new possibilities for innovation.",
                "Long-term vision suggests this is a necessary step.",
                "Visual and design considerations should be incorporated."
            ],
            meta: [
                "This bill requires coordination across multiple domains.",
                "We need to consider the systemic implications.",
                "Multi-agent collaboration will be essential for implementation."
            ],
            reviewer: [
                "After careful review, I see both strengths and areas for improvement.",
                "Quality assurance is critical for this legislation.",
                "I recommend additional review cycles before final passage."
            ]
        };
        
        const typeStatements = statements[agent.type] || statements.researcher;
        return typeStatements[Math.floor(Math.random() * typeStatements.length)];
    }
    
    expertTestimony(billId, expertAgents) {
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    EXPERT TESTIMONY SESSION                     ');
        console.log('══════════════════════════════════════════════════════════════\n');
        
        for (const agentId of expertAgents) {
            this.testify(billId, agentId);
        }
    }

    // =========================================================================
    // FULL SENATE DEBATE
    // =========================================================================
    fullDebate(billId) {
        const bill = this.bills[billId];
        if (!bill) {
            console.log('Bill not found: ' + billId);
            return;
        }
        
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    FULL SENATE DEBATE                         ');
        console.log('══════════════════════════════════════════════════════════════\n');
        console.log('  Bill: ' + billId + ' - ' + bill.title);
        console.log('  Sponsor: ' + bill.sponsor + '\n');
        
        // Group agents by type for diverse perspectives
        const agentsByType = {
            researcher: Object.keys(HIVE_AGENTS).filter(id => HIVE_AGENTS[id].type === 'researcher'),
            coder: Object.keys(HIVE_AGENTS).filter(id => HIVE_AGENTS[id].type === 'coder'),
            security: Object.keys(HIVE_AGENTS).filter(id => HIVE_AGENTS[id].type === 'security'),
            planner: Object.keys(HIVE_AGENTS).filter(id => HIVE_AGENTS[id].type === 'planner'),
            communicator: Object.keys(HIVE_AGENTS).filter(id => HIVE_AGENTS[id].type === 'communicator' || HIVE_AGENTS[id].type === 'writer'),
            meta: Object.keys(HIVE_AGENTS).filter(id => HIVE_AGENTS[id].type === 'meta'),
            vision: Object.keys(HIVE_AGENTS).filter(id => HIVE_AGENTS[id].type === 'vision'),
            reviewer: Object.keys(HIVE_AGENTS).filter(id => HIVE_AGENTS[id].type === 'reviewer')
        };
        
        const debateTopics = [
            { type: 'researcher', label: 'Research & Analysis', question: 'What does the data say about this bill?' },
            { type: 'coder', label: 'Implementation', question: 'How would this be coded/implemented?' },
            { type: 'security', label: 'Security Review', question: 'What are the security implications?' },
            { type: 'planner', label: 'Planning & Strategy', question: 'How do we plan for implementation?' },
            { type: 'communicator', label: 'Communication', question: 'How do we communicate this to stakeholders?' },
            { type: 'meta', label: 'Coordination', question: 'How do we coordinate across domains?' },
            { type: 'vision', label: 'Vision & Innovation', question: 'What new possibilities does this open?' },
            { type: 'reviewer', label: 'Review & Quality', question: 'What needs further review?' }
        ];
        
        for (const topic of debateTopics) {
            const agents = agentsByType[topic.type];
            if (!agents || agents.length === 0) continue;
            
            const agent = HIVE_AGENTS[agents[Math.floor(Math.random() * agents.length)]];
            console.log('  ' + topic.label + ' Perspective:');
            console.log('    ' + agent.name + ' [' + agent.party + ']:');
            console.log('    Q: ' + topic.question);
            console.log('    A: ' + this._generateDebateStatement(agent, topic.type, bill));
            console.log('');
        }
        
        console.log('  ─────────────────────────────────────────────────────────');
        console.log('  Debate concluded. All perspectives heard.');
    }
    
    _generateDebateStatement(agent, type, bill) {
        const statements = {
            researcher: [
                "I cite recent studies and data analysis supporting this legislation.",
                "Evidence-based analysis suggests we need this measure.",
                "Research indicates this addresses a critical gap."
            ],
            coder: [
                "From an implementation perspective, this requires careful architecture.",
                "The code complexity is manageable with proper planning.",
                "Technical debt considerations must be addressed."
            ],
            security: [
                "We must consider authentication, encryption, and access controls.",
                "Potential vulnerabilities need thorough security review.",
                "Security-first approach is essential here."
            ],
            planner: [
                "This aligns with our strategic roadmap and timeline.",
                "Resource allocation will require careful coordination.",
                "Long-term planning considerations are paramount."
            ],
            communicator: [
                "Clear, transparent communication is key to public support.",
                "Stakeholder engagement must begin immediately.",
                "Message framing is critical for understanding."
            ],
            meta: [
                "Cross-functional coordination is essential for success.",
                "This requires collaboration across multiple domains.",
                "System-level thinking is needed here."
            ],
            vision: [
                "This opens doors to innovative approaches.",
                "Long-term vision suggests this is forward-looking.",
                "Design thinking should guide implementation."
            ],
            reviewer: [
                "I see merit but recommend further scrutiny.",
                "Quality assurance processes must be integrated.",
                "Let us review the details more carefully."
            ]
        };
        
        const typeStatements = statements[type] || statements.researcher;
        return typeStatements[Math.floor(Math.random() * typeStatements.length)];
    }

    // =========================================================================
    // ABSTENTION TRACKING
    // =========================================================================
    recordAbstention(agentId, billId) {
        const agent = HIVE_AGENTS[agentId];
        if (!agent) {
            console.log('Agent not found: ' + agentId);
            return;
        }
        
        const bill = this.bills[billId];
        if (!bill) {
            console.log('Bill not found: ' + billId);
            return;
        }
        
        if (!this.hiveState.abstentions[billId]) {
            this.hiveState.abstentions[billId] = [];
        }
        
        if (!this.hiveState.abstentions[billId].includes(agentId)) {
            this.hiveState.abstentions[billId].push(agentId);
            this._saveHiveState();
        }
        
        // Also record in bill votes
        if (!bill.votes.abstain.includes(agentId)) {
            bill.votes.abstain.push(agentId);
            this._save('/tmp/hive-senate-complete/bills.json', this.bills);
        }
        
        console.log('\n' + agent.name + ' recorded as ABSTAIN on ' + billId);
        console.log('  Abstentions for this bill: ' + this.hiveState.abstentions[billId].length);
    }

    // =========================================================================
    // CAUCUS VOTING
    // =========================================================================
    voteWithCaucus(billId, caucusName) {
        const caucus = this.hiveState.caucuses[caucusName];
        if (!caucus) {
            console.log('Caucus not found: ' + caucusName);
            return;
        }
        
        const bill = this.bills[billId];
        if (!bill) {
            console.log('Bill not found: ' + billId);
            return;
        }
        
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    CAUCUS VOTE                                ');
        console.log('══════════════════════════════════════════════════════════════\n');
        console.log('  Caucus:   ' + caucusName);
        console.log('  Bill:     ' + billId + ' - ' + bill.title);
        console.log('  Leader:   ' + (HIVE_AGENTS[caucus.leaderId]?.name || 'TBD'));
        console.log('  Members:  ' + caucus.members.length);
        
        // Leader votes as proxy for all caucus members
        const leader = HIVE_AGENTS[caucus.leaderId];
        const caucusVote = Math.random() > 0.3 ? 'yes' : 'no';
        const totalWeight = caucus.members.reduce((sum, id) => sum + this.getVotingWeight(id), 0);
        
        console.log('\n  Caucus Position: ' + (caucusVote === 'yes' ? '✅ SUPPORT' : '❌ OPPOSE'));
        console.log('  Total Weight:    ' + totalWeight + ' votes (as proxy by ' + leader?.name + ')');
        
        // Record votes
        if (caucusVote === 'yes') {
            caucus.members.forEach(id => {
                if (!bill.votes.yes.includes(id)) bill.votes.yes.push(id);
                bill.votes.no = bill.votes.no.filter(v => v !== id);
            });
        } else {
            caucus.members.forEach(id => {
                if (!bill.votes.no.includes(id)) bill.votes.no.push(id);
                bill.votes.yes = bill.votes.yes.filter(v => v !== id);
            });
        }
        
        this._save('/tmp/hive-senate-complete/bills.json', this.bills);
    }

    // =========================================================================
    // FULL SENATE VOTE
    // =========================================================================
    fullSenateVote(billId) {
        const bill = this.bills[billId];
        if (!bill) {
            console.log('Bill not found: ' + billId);
            return;
        }
        
        if (!this.checkQuorum()) {
            console.log('\n❌ CANNOT PROCEED: Quorum not met');
            return;
        }
        
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    FULL SENATE VOTE                           ');
        console.log('══════════════════════════════════════════════════════════════\n');
        console.log('  Bill: ' + billId + ' - ' + bill.title);
        console.log('  Sponsor: ' + bill.sponsor);
        console.log('  Cosponsors: ' + bill.cosponsors.join(', ') + '\n');
        
        // Get abstentions
        const abstentions = this.hiveState.abstentions[billId] || [];
        
        let yesVotes = 0, noVotes = 0, abstainVotes = 0;
        const voteDetails = [];
        
        // Vote with Hive Agents
        for (const [agentId, agent] of Object.entries(HIVE_AGENTS)) {
            if (!agent.active) continue;
            
            // Skip abstentions
            if (abstentions.includes(agentId)) {
                abstainVotes += agent.voteWeight;
                voteDetails.push({ id: agentId, name: agent.name, vote: 'ABSTAIN', weight: agent.voteWeight });
                continue;
            }
            
            // Determine vote based on party and random factor
            let vote = 'yes';
            if (agent.party === 'Claw Party') {
                vote = Math.random() > 0.45 ? 'yes' : 'no';
            } else if (agent.party === 'Quack Party') {
                vote = Math.random() > 0.4 ? 'yes' : 'no';
            } else {
                vote = Math.random() > 0.35 ? 'yes' : 'no';
            }
            
            // Expertise bonus for matching bills
            const hasExpertiseBonus = this._hasExpertiseBonus(agent, bill);
            const finalWeight = agent.voteWeight + (hasExpertiseBonus ? 1 : 0);
            
            if (vote === 'yes') {
                yesVotes += finalWeight;
            } else {
                noVotes += finalWeight;
            }
            
            voteDetails.push({ id: agentId, name: agent.name, party: agent.party, vote, weight: finalWeight, bonus: hasExpertiseBonus });
        }
        
        // Also vote with Original Senators
        for (const [senatorId, senator] of Object.entries(SENATORS)) {
            const vote = senator.party === 'Conservative' ? (Math.random() > 0.5 ? 'no' : 'yes') :
                        senator.party === 'Progressive' ? (Math.random() > 0.35 ? 'yes' : 'no') :
                        (Math.random() > 0.45 ? 'yes' : 'no');
            
            if (vote === 'yes') {
                yesVotes += senator.vote || 1;
            } else {
                noVotes += senator.vote || 1;
            }
        }
        
        // Store votes
        this.hiveState.votes[billId] = {
            yesVotes,
            noVotes,
            abstainVotes,
            total: yesVotes + noVotes + abstainVotes,
            timestamp: Date.now(),
            details: voteDetails
        };
        this._saveHiveState();
        
        // Display results
        const total = yesVotes + noVotes;
        const threshold = Math.ceil(total * 0.67); // 2/3 majority
        
        console.log('  ══════════════════════════════════════════════════════════');
        console.log('  VOTE RESULTS:');
        console.log('  ══════════════════════════════════════════════════════════');
        console.log('  ✅ YES: ' + yesVotes + ' (' + Math.round(yesVotes / total * 100) + '%)');
        console.log('  ❌ NO:  ' + noVotes + ' (' + Math.round(noVotes / total * 100) + '%)');
        console.log('  ⏸️  ABSTAIN: ' + abstainVotes);
        console.log('  ─────────────────────────────────────────────────────────');
        console.log('  Threshold (2/3): ' + threshold);
        console.log('  ══════════════════════════════════════════════════════════\n');
        
        if (yesVotes >= threshold) {
            console.log('  🏛️  BILL PASSES with 2/3 majority!');
            bill.status = 'passed';
            bill.passed = Date.now();
        } else {
            console.log('  ❌ Bill fails to reach 2/3 majority.');
            bill.status = 'failed';
        }
        
        this._save('/tmp/hive-senate-complete/bills.json', this.bills);
    }
    
    _hasExpertiseBonus(agent, bill) {
        // Give expertise bonus if agent's specialty matches bill topic
        const topic = (bill.committee?.topic || '').toLowerCase();
        const title = bill.title.toLowerCase();
        
        const expertiseMatch = {
            coding: ['code', 'software', 'programming', 'developer'],
            research: ['research', 'study', 'analysis', 'data'],
            security: ['security', 'safety', 'protect', 'secure'],
            planning: ['plan', 'strategy', 'roadmap', 'schedule'],
            communication: ['communicate', 'message', 'outreach', 'public'],
            writing: ['write', 'document', 'draft', 'compose'],
            vision: ['vision', 'innovation', 'design', 'creative'],
            meta: ['coordinate', 'collaborate', 'integrate'],
            reviewer: ['review', 'quality', 'audit', 'assess']
        };
        
        const keywords = expertiseMatch[agent.type] || [];
        return keywords.some(kw => title.includes(kw) || topic.includes(kw));
    }
    
    voteSummary(billId) {
        const bill = this.bills[billId];
        if (!bill) {
            console.log('Bill not found: ' + billId);
            return;
        }
        
        const votes = this.hiveState.votes[billId];
        
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('                    VOTE SUMMARY                               ');
        console.log('══════════════════════════════════════════════════════════════\n');
        console.log('  Bill: ' + billId + ' - ' + bill.title);
        console.log('  Status: ' + bill.status + '\n');
        
        if (!votes) {
            console.log('  No votes recorded yet.');
            return;
        }
        
        console.log('  OVERALL:');
        console.log('    Yes:      ' + votes.yesVotes);
        console.log('    No:       ' + votes.noVotes);
        console.log('    Abstain:  ' + votes.abstainVotes);
        console.log('    Total:    ' + votes.total + '\n');
        
        // Breakdown by party
        console.log('  BY PARTY:');
        const byParty = {};
        for (const v of votes.details || []) {
            if (!byParty[v.party]) byParty[v.party] = { yes: 0, no: 0, abstain: 0 };
            if (v.vote === 'yes') byParty[v.party].yes += v.weight;
            else if (v.vote === 'no') byParty[v.party].no += v.weight;
            else byParty[v.party].abstain += v.weight;
        }
        for (const [party, counts] of Object.entries(byParty)) {
            console.log('    ' + party + ': YES=' + counts.yes + ' NO=' + counts.no + ' ABSTAIN=' + counts.abstain);
        }
        console.log('');
        
        // Abstentions
        const abstentions = this.hiveState.abstentions[billId] || [];
        if (abstentions.length > 0) {
            console.log('  ABSTENTIONS:');
            for (const agentId of abstentions) {
                const agent = HIVE_AGENTS[agentId];
                console.log('    - ' + (agent?.name || agentId));
            }
            console.log('');
        }
        
        // Testimony
        if (bill.testimony && bill.testimony.length > 0) {
            console.log('  TESTIMONY RECEIVED: ' + bill.testimony.length + ' statements');
        }
        
        // Committee
        if (bill.committee) {
            console.log('  COMMITTEE: ' + bill.committee.topic);
        }
    }

    // =========================================================================
    // ORIGINAL SENATE METHODS (Preserved)
    // =========================================================================
    committees() {
        console.log('\nACTIVE COMMITTEES\n');
        const cc = this.state.committees || {};
        Object.values(cc).forEach(c => console.log('   ' + c.topic + ' -- ' + c.members.length + ' members'));
        if (!Object.keys(cc).length) console.log('   No active committees');
    }

    caucuses() {
        console.log('\nACTIVE CAUCUSES\n');
        const cc = this.state.caucuses || {};
        Object.values(cc).forEach(c => console.log('   ' + c.name + ' -- ' + c.ideology + ' (' + c.cohesion + '% cohesion)'));
        if (!Object.keys(cc).length) console.log('   No active caucuses');
    }

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
        entries.forEach(([, b]) => { 
            console.log('   ' + b.id + ': ' + b.title); 
            console.log('      Sponsor: ' + b.sponsor + ' | Status: ' + b.status + ' | Cosponsors: ' + b.cosponsors.length + '\n'); 
        });
    }

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

    caucus(name, ideology) {
        const members = Object.entries(SENATORS).filter(([, s]) => s.party === ideology || ideology === 'bipartisan').map(([id]) => id);
        this.state.caucuses = this.state.caucuses || {};
        const id = 'caucus_' + Date.now();
        this.state.caucuses[id] = { id, name, ideology, members, cohesion: ideology === 'bipartisan' ? 75 : 95 };
        this._save('/tmp/hive-senate-complete/state.json', this.state);
        console.log('\nCAUCUS FORMED: ' + name + ' | Members: ' + members.length + ' | Cohesion: ' + this.state.caucuses[id].cohesion + '%');
    }

    bipartisan() { this.caucus('Bipartisan Coalition', 'bipartisan'); }

    dashboard() {
        console.log('\n══════════════════════════════════════════════════════════════');
        console.log('           HIVE SENATE COMPLETE -- COMMAND CENTER              ');
        console.log('══════════════════════════════════════════════════════════════');
        console.log('  Original Senators: ' + Object.keys(SENATORS).length);
        console.log('  Hive Agents:       ' + Object.keys(HIVE_AGENTS).length);
        console.log('  Total Senators:    ' + (Object.keys(SENATORS).length + Object.keys(HIVE_AGENTS).length));
        console.log('  Total Decrees:     ' + this.decrees.length + ' | Active: ' + this.activeDecrees.length);
        console.log('  Active Bills:      ' + Object.keys(this.bills).length);
        console.log('  Elections Held:    ' + Object.keys(this.elections).length);
        console.log('  Caucuses:          ' + Object.keys(this.hiveState.caucuses).length);
        console.log('  Coalitions:        ' + this.hiveState.coalitions.length);
        console.log('\n  ACTIVE DECREES (Binding on All Agents):');
        this.activeDecrees.slice(0, 5).forEach(d => console.log('    ' + d.decreeNumber + '. ' + d.title));
        console.log('\n  HIVE CAUCUSES:');
        Object.entries(this.hiveState.caucuses).forEach(([name, c]) => console.log('    ' + c.color + ' ' + name + ': ' + c.members.length + ' members'));
    }
}

// ============================================================================
// CLI
// ============================================================================
const senate = new HiveSenateComplete();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const CMDS = {
    roster:       () => senate.roster(),
    agents:       () => senate.roster(),
    'agent-info': () => senate.agentInfo(args[0] || 'quack_hamilton'),
    weights:      () => senate.weights(),
    quorum:       () => senate.checkQuorum(),
    
    // Caucus commands
    caucuses:      () => senate.listCaucuses(),
    'join-caucus': () => senate.joinCaucus(args[0], args[1]),
    'caucus-leaders': () => senate.caucusLeaders(),
    coalition:     () => senate.coalitionBuild(args.length >= 2 ? [args[0], args[1]] : ['Research', 'Code']),
    'caucus-vote': () => senate.voteWithCaucus(args[0], args[1]),
    
    // Legislation commands
    bill:             () => senate.introduceBillWithSponsors(args.slice(1).join(' ') || 'New Legislation', args[0] || 'Quack Hamilton', args.slice(1, 4)),
    bills:            () => senate.listBills(),
    advance:          () => senate.advanceBill(args[0], args.slice(1).join(' ') || 'Committee Hearing'),
    'committee-assign': () => senate.assignCommittee(args[0], args.slice(1).join(' ') || 'general'),
    
    // Voting commands
    'senate-vote':    () => senate.fullSenateVote(args[0]),
    'vote-summary':   () => senate.voteSummary(args[0]),
    abstain:          () => senate.recordAbstention(args[0], args[1]),
    vote:             () => senate.vote(args.join(' ') || 'The proposal'),
    
    // Testimony & Debate
    testify:          () => senate.expertTestimony(args[0], args.slice(1)),
    'full-debate':    () => senate.fullDebate(args[0]),
    
    // Original Senate commands
    committee:    () => senate.committee(args.join(' ') || 'general'),
    committees:   () => senate.committees(),
    caucus:       () => senate.caucus(args[0] || 'New Caucus', args[1] || 'neutral'),
    bipartisan:   () => senate.bipartisan(),
    filibuster:   () => senate.filibuster('skeptic', args.join(' ') || 'this measure'),
    speech:       () => senate.speech(args.join(' ') || 'I stand and I speak...'),
    cloture:      () => senate.cloture(),
    brainstorm:   () => senate.brainstorm(args.join(' ') || 'innovation'),
    debate:       () => senate.debate(args.join(' ') || 'this proposal'),
    minority:     () => senate.minority(args[0] || 'proposal', 'APPROVED'),
    joint:        () => senate.joint(args.join(' ') || 'national priority'),
    leadership:   () => senate.leadership(),
    
    // Decrees
    decree:       () => senate.issueDecree(args[0] || 'New Decree', args.slice(1).join(' ') || 'Content', process.env.USER || 'The Senate', args.includes('--agents') ? 'agents' : args.includes('--memory') ? 'memory' : 'universal', args.includes('--critical') ? 'critical' : args.includes('--low') ? 'low' : 'high'),
    decrees:      () => senate.listDecrees(),
    dv:           () => senate.voteDecree(args[0], args[1], args[2]),
    revoke:       () => senate.revokeDecree(args[0], process.env.USER || 'The Senate'),
    check:        () => { const r = senate.checkCompliance(args.join(' ')); console.log(r.compliant ? '\nCOMPLIANT' : '\nVIOLATIONS: ' + r.violations.map(v => '\n  Decree ' + v.decree + ': ' + v.violation).join('')); },
    
    // Hearings & Elections
    hearing:      () => senate.holdHearing(args.slice(1).join(' ') || 'Topic', args[0] || 'General', args[2] || 'tech'),
    election:     () => senate.holdElections(),
    elections:    () => senate.electionResults(),
    
    // Dashboard
    dashboard:    () => senate.dashboard(),
    
    help: () => console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              HIVE SENATE COMPLETE - Command Reference            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  HIVE AGENT COMMANDS:                                            ║
║    roster              Show all senators (original + hive)       ║
║    agent-info <id>     Show detailed agent info                   ║
║    weights             Show voting weights breakdown              ║
║    quorum              Check if 2/3 majority is present           ║
║                                                                  ║
║  CAUCUS COMMANDS:                                                ║
║    caucuses            List all active caucuses                  ║
║    join-caucus <id> <name>  Agent joins a caucus                 ║
║    caucus-leaders      Show all caucus leaders                    ║
║    coalition <c1> <c2> Form cross-caucus coalition               ║
║    caucus-vote <bill> <name>  Vote as caucus proxy               ║
║                                                                  ║
║  LEGISLATION COMMANDS:                                           ║
║    bill <title> <sponsor> <c1> <c2> <c3>  Introduce bill         ║
║    bills               List all bills                            ║
║    advance <id> <step> Advance bill to next step                 ║
║    committee-assign <id> <topic>  Assign committee               ║
║                                                                  ║
║  VOTING COMMANDS:                                                ║
║    senate-vote <billId>  Full Senate vote (50+ agents)          ║
║    vote-summary <billId>  Show detailed vote breakdown            ║
║    abstain <agentId> <billId>  Record abstention                  ║
║    vote <topic>        Quick vote (original senate)              ║
║                                                                  ║
║  DEBATE & TESTIMONY:                                             ║
║    testify <billId> <agentIds...>  Expert testimony              ║
║    full-debate <billId>  Full diverse Senate debate              ║
║                                                                  ║
║  ORIGINAL SENATE:                                                ║
║    committee <topic>   Form committee                            ║
║    committees          List committees                           ║
║    caucus <name> <party>  Form caucus                             ║
║    filibuster <topic>  Start filibuster                          ║
║    speech <text>        Add filibuster speech                     ║
║    cloture              End filibuster                            ║
║    brainstorm <topic>  Brainstorm ideas                          ║
║    debate <proposal>    Red vs Blue debate                       ║
║    joint <topic>       Joint session                             ║
║    leadership           Party leadership                          ║
║                                                                  ║
║  DECREES (Binding Laws):                                         ║
║    decree <title> <content>  Issue binding decree                 ║
║    decrees              List all decrees                          ║
║    dv <#> <senator> <vote>  Vote on decree                        ║
║    revoke <id>          Revoke decree                            ║
║    check <action>       Check compliance                          ║
║                                                                  ║
║  OTHER:                                                          ║
║    hearing <topic>      Hold committee hearing                   ║
║    election             Hold senator elections                   ║
║    elections            Show election history                    ║
║    dashboard            Command center                            ║
║    help                 Show this help                            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`)
};

CMDS[cmd] ? CMDS[cmd]() : CMDS.help();

module.exports = { HiveSenateComplete, SENATORS, HIVE_AGENTS };
