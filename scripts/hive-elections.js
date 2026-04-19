#!/usr/bin/env node
/**
 * Hive Elections — Democratic Senate Elections
 * 
 * Citizens (users) elect Senators to the Hive Senate.
 * Democracy is the foundation of legitimate governance.
 */

const fs = require('fs');
const path = require('path');

// Data directory
const DATA_DIR = '/tmp/hive-elections';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class HiveElections {
    constructor() {
        this.census = this.loadCensus();
        this.elections = this.loadElections();
        this.votes = this.loadVotes();
    }

    loadCensus() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'census.json'), 'utf-8'));
        } catch { return { citizens: [], lastUpdated: null }; }
    }

    loadElections() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'elections.json'), 'utf-8'));
        } catch { return { races: [], history: [] }; }
    }

    loadVotes() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'votes.json'), 'utf-8'));
        } catch { return { ballots: [] }; }
    }

    save() {
        fs.writeFileSync(path.join(DATA_DIR, 'census.json'), JSON.stringify(this.census, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'elections.json'), JSON.stringify(this.elections, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'votes.json'), JSON.stringify(this.votes, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // CENSUS — Who Can Vote
    // ═══════════════════════════════════════════════════════════

    registerCitizen(id, name, role = 'citizen') {
        const citizen = {
            id,
            name,
            role, // 'citizen', 'senator', 'admin'
            registeredAt: Date.now(),
            votedIn: []
        };

        const existing = this.census.citizens.findIndex(c => c.id === id);
        if (existing >= 0) {
            this.census.citizens[existing] = citizen;
        } else {
            this.census.citizens.push(citizen);
        }

        this.census.lastUpdated = Date.now();
        this.save();

        console.log(`\n✓ Citizen registered: ${name} (${role})`);
        return citizen;
    }

    listCitizens() {
        console.log('\n📋 CENSUS REGISTRY');
        console.log('═'.repeat(50));
        
        for (const c of this.census.citizens) {
            const registered = new Date(c.registeredAt).toLocaleDateString();
            console.log(`\n  ${c.name} [${c.role}]`);
            console.log(`     ID: ${c.id}`);
            console.log(`     Registered: ${registered}`);
            console.log(`     Votes cast: ${c.votedIn.length}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ELECTION SETUP
    // ═══════════════════════════════════════════════════════════

    createElection(race) {
        const election = {
            id: `ELECTION-${Date.now()}`,
            race,
            status: 'announced',
            announced: Date.now(),
            nominationDeadline: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
            votingStart: Date.now() + (14 * 24 * 60 * 60 * 1000), // 14 days
            votingEnd: Date.now() + (21 * 24 * 60 * 60 * 1000), // 21 days
            candidates: [],
            votes: {},
            turnout: 0
        };

        this.elections.races.push(election);
        this.save();

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  🗳️ ELECTION ANNOUNCED 🗳️                      ║
╠══════════════════════════════════════════════════════════════════╣
║  Race: ${race.padEnd(56)}║
║  Election ID: ${election.id.padEnd(51)}║
║  Nominations close: ${new Date(election.nominationDeadline).toLocaleDateString().padEnd(45)}║
║  Voting starts: ${new Date(election.votingStart).toLocaleDateString().padEnd(47)}║
║  Voting ends: ${new Date(election.votingEnd).toLocaleDateString().padEnd(49)}║
╚══════════════════════════════════════════════════════════════════╝
`);

        return election;
    }

    nominate(candidateId, electionId) {
        const election = this.elections.races.find(e => e.id === electionId);
        if (!election) {
            console.log('Election not found');
            return;
        }

        const citizen = this.census.citizens.find(c => c.id === candidateId);
        if (!citizen) {
            console.log('Citizen not found');
            return;
        }

        election.candidates.push({
            candidateId,
            name: citizen.name,
            nominatedAt: Date.now(),
            votes: 0
        });

        this.save();

        console.log(`\n✓ ${citizen.name} nominated for: ${election.race}`);
    }

    // ═══════════════════════════════════════════════════════════
    // VOTING
    // ═══════════════════════════════════════════════════════════

    vote(citizenId, electionId, candidateId) {
        const election = this.elections.races.find(e => e.id === electionId);
        if (!election) {
            console.log('Election not found');
            return;
        }

        const citizen = this.census.citizens.find(c => c.id === citizenId);
        if (!citizen) {
            console.log('Citizen not registered');
            return;
        }

        // Check if already voted
        if (citizen.votedIn.includes(electionId)) {
            console.log('Already voted in this election');
            return;
        }

        // Cast vote
        const candidate = election.candidates.find(c => c.candidateId === candidateId);
        if (!candidate) {
            console.log('Candidate not found');
            return;
        }

        candidate.votes++;
        citizen.votedIn.push(electionId);

        // Track ballot
        this.votes.ballots.push({
            electionId,
            citizenId,
            candidateId,
            timestamp: Date.now()
        });

        this.save();

        console.log(`\n✓ Vote cast for ${candidate.name}`);
    }

    // ═══════════════════════════════════════════════════════════
    // TALLY & RESULTS
    // ═══════════════════════════════════════════════════════════

    tallyResults(electionId) {
        const election = this.elections.races.find(e => e.id === electionId);
        if (!election) {
            console.log('Election not found');
            return;
        }

        // Sort by votes
        election.candidates.sort((a, b) => b.votes - a.votes);

        const totalVotes = election.candidates.reduce((sum, c) => sum + c.votes, 0);
        const totalCitizens = this.census.citizens.length;
        election.turnout = totalCitizens > 0 ? Math.round((totalVotes / totalCitizens) * 100) : 0;

        election.status = 'completed';
        election.completed = Date.now();
        this.elections.history.push(election);

        // Announce winner
        const winner = election.candidates[0];

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                 📊 ELECTION RESULTS 📊                          ║
╠══════════════════════════════════════════════════════════════════╣
║  Race: ${election.race.padEnd(56)}║
║  Turnout: ${(election.turnout + '%').padEnd(56)}║
╚══════════════════════════════════════════════════════════════════╝

🏆 WINNER: ${winner.name}
   Votes: ${winner.votes}

CANDIDATES:
`);

        election.candidates.forEach((c, i) => {
            const pct = totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0;
            const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
            console.log(`  ${medal} ${c.name.padEnd(20)} ${bar} ${pct}% (${c.votes})`);
        });

        this.save();

        return winner;
    }

    // ═══════════════════════════════════════════════════════════
    // LIST ELECTIONS
    // ═══════════════════════════════════════════════════════════

    listElections() {
        console.log('\n🗳️ ELECTIONS');
        console.log('═'.repeat(50));

        const active = this.elections.races.filter(e => e.status !== 'completed');
        const past = this.elections.history;

        console.log('\n  ACTIVE ELECTIONS:');
        if (active.length === 0) {
            console.log('    None');
        } else {
            for (const e of active) {
                console.log(`\n    ${e.race} [${e.status}]`);
                console.log(`       Candidates: ${e.candidates.length}`);
                console.log(`       Voting: ${new Date(e.votingStart).toLocaleDateString()} - ${new Date(e.votingEnd).toLocaleDateString()}`);
            }
        }

        console.log('\n  PAST ELECTIONS:');
        if (past.length === 0) {
            console.log('    None');
        } else {
            for (const e of past.slice(-5).reverse()) {
                const winner = e.candidates[0];
                console.log(`\n    ${e.race} - Winner: ${winner?.name || 'TBD'}`);
            }
        }
    }
}

// CLI
const elections = new HiveElections();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    register: () => elections.registerCitizen(args[0], args[1], args[2]),
    citizens: () => elections.listCitizens(),
    
    create: () => elections.createElection(args.join(' ')),
    nominate: () => elections.nominate(args[0], args[1]),
    
    vote: () => elections.vote(args[0], args[1], args[2]),
    tally: () => elections.tallyResults(args[0]),
    
    list: () => elections.listElections(),
    
    help: () => console.log(`
🗳️ HIVE ELECTIONS

  register <id> <name> [role]  Register citizen
  citizens                       List registered citizens
  
  create <race>                 Create new election
  nominate <candidateId> <electionId>  Nominate candidate
  
  vote <citizenId> <electionId> <candidateId>  Cast vote
  tally <electionId>             Tally and announce results
  
  list                          List all elections
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveElections }; 