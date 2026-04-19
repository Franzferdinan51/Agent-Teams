#!/usr/bin/env node
/**
 * Hive Voting System — Multi-Agent Democratic Participation
 * 
 * Features:
 * - Weighted votes by agent type and tenure
 * - Agent caucuses with elected leaders
 * - Coalition formation and vote trading
 * - Full legislative workflow with co-sponsors
 * - Roll call votes with recorded positions
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp/hive-voting';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class HiveVoting {
    constructor() {
        this.agents = this.loadAgents();
        this.caucuses = this.loadCaucuses();
        this.coalitions = this.loadCoalitions();
        this.votes = this.loadVotes();
        this.bills = this.loadBills();
    }

    loadAgents() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'agents.json'), 'utf-8'));
        } catch {
            return this.generateInitialAgents();
        }
    }

    generateInitialAgents() {
        const agentDefs = [
            // QUACK PARTY - Duck Agents
            { name: 'Quackford Ducklington', type: 'researcher', party: 'Quack', tenure: 'founding' },
            { name: 'Quackenzie McQuackerson', type: 'coder', party: 'Quack', tenure: 'founding' },
            { name: 'Quack尔湾', type: 'reviewer', party: 'Quack', tenure: 'founding' },
            { name: 'Quack Stapleton', type: 'writer', party: 'Quack', tenure: 'elected' },
            { name: 'Quacktor Lovegood', type: 'meta', party: 'Quack', tenure: 'elected' },
            { name: 'Quack Patterson', type: 'security', party: 'Quack', tenure: 'elected' },
            { name: 'Quack Fitzgerald', type: 'vision', party: 'Quack', tenure: 'appointed' },
            { name: 'Quack Thompson', type: 'planner', party: 'Quack', tenure: 'appointed' },
            { name: 'Quack Davis', type: 'communicator', party: 'Quack', tenure: 'appointed' },
            { name: 'Quack Miller', type: 'researcher', party: 'Quack', tenure: 'appointed' },
            { name: 'Quack Wilson', type: 'coder', party: 'Quack', tenure: 'appointed' },
            { name: 'Quack Moore', type: 'reviewer', party: 'Quack', tenure: 'appointed' },
            { name: 'Quack Taylor', type: 'writer', party: 'Quack', tenure: 'appointed' },
            { name: 'Quack Anderson', type: 'meta', party: 'Quack', tenure: 'appointed' },
            { name: 'Quack Thomas', type: 'security', party: 'Quack', tenure: 'appointed' },
            { name: 'Quack Jackson', type: 'vision', party: 'Quack', tenure: 'appointed' },
            { name: 'Quack White', type: 'planner', party: 'Quack', tenure: 'appointed' },
            { name: 'Quack Harris', type: 'communicator', party: 'Quack', tenure: 'appointed' },

            // HONEY PARTY - Bee Agents
            { name: 'Beeatrice Honeycomb', type: 'researcher', party: 'Honey', tenure: 'founding' },
            { name: 'Beetrice Buzzworth', type: 'coder', party: 'Honey', tenure: 'founding' },
            { name: 'Bee Truman', type: 'reviewer', party: 'Honey', tenure: 'founding' },
            { name: 'Bee Franklin', type: 'writer', party: 'Honey', tenure: 'elected' },
            { name: 'Bee Kennedy', type: 'meta', party: 'Honey', tenure: 'elected' },
            { name: 'Bee Clinton', type: 'security', party: 'Honey', tenure: 'elected' },
            { name: 'Bee Obama', type: 'vision', party: 'Honey', tenure: 'appointed' },
            { name: 'Bee Biden', type: 'planner', party: 'Honey', tenure: 'appointed' },
            { name: 'Bee Carter', type: 'communicator', party: 'Honey', tenure: 'appointed' },
            { name: 'Bee Reagan', type: 'researcher', party: 'Honey', tenure: 'appointed' },
            { name: 'Bee Bush', type: 'coder', party: 'Honey', tenure: 'appointed' },
            { name: 'Bee Nixon', type: 'reviewer', party: 'Honey', tenure: 'appointed' },
            { name: 'Bee Ford', type: 'writer', party: 'Honey', tenure: 'appointed' },
            { name: 'Bee Carter Sr', type: 'meta', party: 'Honey', tenure: 'appointed' },
            { name: 'Bee Monroe', type: 'security', party: 'Honey', tenure: 'appointed' },

            // CLAW PARTY - Lobster Agents
            { name: 'Clawrence Lobsterfield', type: 'researcher', party: 'Claw', tenure: 'founding' },
            { name: 'Clawrence Welby', type: 'coder', party: 'Claw', tenure: 'founding' },
            { name: 'Clawrence Perkins', type: 'reviewer', party: 'Claw', tenure: 'founding' },
            { name: 'Clawrence Bancroft', type: 'writer', party: 'Claw', tenure: 'elected' },
            { name: 'Clawrence Hawthorne', type: 'meta', party: 'Claw', tenure: 'elected' },
            { name: 'Clawrence Fitz', type: 'security', party: 'Claw', tenure: 'elected' },
            { name: 'Clawrence Morgan', type: 'vision', party: 'Claw', tenure: 'appointed' },
            { name: 'Clawrence Vane', type: 'planner', party: 'Claw', tenure: 'appointed' },
            { name: 'Clawrence Grace', type: 'communicator', party: 'Claw', tenure: 'appointed' },
            { name: 'Clawrence Byrne', type: 'researcher', party: 'Claw', tenure: 'appointed' },
            { name: 'Clawrence Quinn', type: 'coder', party: 'Claw', tenure: 'appointed' },
            { name: 'Clawrence O'Malley', type: 'reviewer', party: 'Claw', tenure: 'appointed' },
            { name: 'Clawrence Delaney', type: 'writer', party: 'Claw', tenure: 'appointed' },
            { name: 'Clawrence Healy', type: 'meta', party: 'Claw', tenure: 'appointed' },
            { name: 'Clawrence Flynn', type: 'security', party: 'Claw', tenure: 'appointed' },

            // INDEPENDENT
            { name: 'Buzz wing', type: 'researcher', party: 'Independent', tenure: 'appointed' },
            { name: 'Snap McClaw', type: 'coder', party: 'Independent', tenure: 'appointed' },
            { name: 'Chatterbox', type: 'communicator', party: 'Independent', tenure: 'appointed' },
            { name: 'Deep Thinker', type: 'meta', party: 'Independent', tenure: 'appointed' },
            { name: 'Quick Silver', type: 'vision', party: 'Independent', tenure: 'appointed' },
        ];

        const agents = agentDefs.map((def, i) => ({
            id: `AGENT-${String(i + 1).padStart(3, '0')}`,
            ...def,
            voteWeight: this.calcVoteWeight(def.tenure, def.type),
            caucus: null,
            coalition: null,
            votesCast: 0,
            abstainCount: 0,
            lastVote: null
        }));

        this.saveAgents(agents);
        return agents;
    }

    calcVoteWeight(tenure, type) {
        let weight = 1;
        if (tenure === 'founding') weight = 3;
        else if (tenure === 'elected') weight = 2;

        // Type bonuses for relevant votes
        if (type === 'researcher') weight *= 1.2;
        if (type === 'coder') weight *= 1.2;
        if (type === 'security') weight *= 1.3;

        return Math.round(weight * 10) / 10;
    }

    loadCaucuses() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'caucuses.json'), 'utf-8'));
        } catch {
            return this.generateInitialCaucuses();
        }
    }

    generateInitialCaucuses() {
        const caucuses = [
            { id: 'CAUCUS-RESEARCH', name: 'Research Caucus', type: 'researcher', leader: null, members: [], position: null },
            { id: 'CAUCUS-CODE', name: 'Code Caucus', type: 'coder', leader: null, members: [], position: null },
            { id: 'CAUCUS-SECURITY', name: 'Security Caucus', type: 'security', leader: null, members: [], position: null },
            { id: 'CAUCUS-WRITING', name: 'Writing Caucus', type: 'writer', leader: null, members: [], position: null },
            { id: 'CAUCUS-META', name: 'Meta Caucus', type: 'meta', leader: null, members: [], position: null },
            { id: 'CAUCUS-PLANNING', name: 'Planning Caucus', type: 'planner', leader: null, members: [], position: null },
            { id: 'CAUCUS-QUACK', name: 'Quack Party Caucus', type: 'all', leader: null, members: [], position: null },
            { id: 'CAUCUS-HONEY', name: 'Honey Party Caucus', type: 'all', leader: null, members: [], position: null },
            { id: 'CAUCUS-CLAW', name: 'Claw Party Caucus', type: 'all', leader: null, members: [], position: null },
        ];

        // Assign agents to caucuses
        for (const agent of this.agents) {
            for (const caucus of caucuses) {
                if (caucus.type === agent.type || (caucus.type === 'all' && caucus.name.includes(agent.party))) {
                    caucus.members.push(agent.id);
                    agent.caucus = caucus.id;
                }
            }
        }

        // Elect leaders
        for (const caucus of caucuses) {
            if (caucus.members.length > 0) {
                caucus.leader = caucus.members[0];
            }
        }

        this.saveCaucuses(caucuses);
        return caucuses;
    }

    loadCoalitions() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'coalitions.json'), 'utf-8'));
        } catch { return []; }
    }

    loadVotes() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'votes.json'), 'utf-8'));
        } catch { return []; }
    }

    loadBills() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bills.json'), 'utf-8'));
        } catch { return []; }
    }

    saveAgents(a) { fs.writeFileSync(path.join(DATA_DIR, 'agents.json'), JSON.stringify(a, null, 2)); }
    saveCaucuses(a) { fs.writeFileSync(path.join(DATA_DIR, 'caucuses.json'), JSON.stringify(a, null, 2)); }
    saveCoalitions(a) { fs.writeFileSync(path.join(DATA_DIR, 'coalitions.json'), JSON.stringify(a, null, 2)); }
    saveVotes(a) { fs.writeFileSync(path.join(DATA_DIR, 'votes.json'), JSON.stringify(a, null, 2)); }
    saveBills(a) { fs.writeFileSync(path.join(DATA_DIR, 'bills.json'), JSON.stringify(a, null, 2)); }

    // ═══════════════════════════════════════════════════════════
    // CAUCUS OPERATIONS
    // ═══════════════════════════════════════════════════════════

    joinCaucus(agentId, caucusId) {
        const agent = this.agents.find(a => a.id === agentId);
        const caucus = this.caucuses.find(c => c.id === caucusId);

        if (!agent || !caucus) {
            console.log('Agent or caucus not found');
            return;
        }

        if (agent.caucus) {
            const oldCaucus = this.caucuses.find(c => c.id === agent.caucus);
            if (oldCaucus) oldCaucus.members = oldCaucus.members.filter(m => m !== agentId);
        }

        caucus.members.push(agentId);
        agent.caucus = caucusId;
        this.saveAgents(this.agents);
        this.saveCaucuses(this.caucuses);

        console.log(`\n✓ ${agent.name} joined ${caucus.name}`);
    }

    electLeader(caucusId, agentId) {
        const caucus = this.caucuses.find(c => c.id === caucusId);
        const agent = this.agents.find(a => a.id === agentId);

        if (!caucus || !agent) {
            console.log('Caucus or agent not found');
            return;
        }

        if (!caucus.members.includes(agentId)) {
            console.log('Agent is not a member of this caucus');
            return;
        }

        caucus.leader = agentId;
        this.saveCaucuses(this.caucuses);

        console.log(`\n✓ ${agent.name} elected leader of ${caucus.name}`);
    }

    caucusPosition(caucusId, billId, position) {
        const caucus = this.caucuses.find(c => c.id === caucusId);
        const bill = this.bills.find(b => b.id === billId);

        if (!caucus || !bill) {
            console.log('Caucus or bill not found');
            return;
        }

        caucus.position = { billId, position, timestamp: Date.now() };
        this.saveCaucuses(this.caucuses);

        console.log(`\n✓ ${caucus.name} position on "${bill.title}": ${position}`);
    }

    // ═══════════════════════════════════════════════════════════
    // COALITION FORMATION
    // ═══════════════════════════════════════════════════════════

    createCoalition(name, memberIds) {
        const coalition = {
            id: `COAL-${Date.now()}`,
            name,
            members: memberIds,
            whip: memberIds[0] || null,
            position: null,
            created: Date.now()
        };

        for (const id of memberIds) {
            const agent = this.agents.find(a => a.id === id);
            if (agent) agent.coalition = coalition.id;
        }

        this.coalitions.push(coalition);
        this.saveCoalitions(this.coalitions);
        this.saveAgents(this.agents);

        console.log(`\n✓ Coalition "${name}" formed with ${memberIds.length} members`);

        return coalition;
    }

    setWhip(coalitionId, agentId) {
        const coalition = this.coalitions.find(c => c.id === coalitionId);
        if (!coalition) {
            console.log('Coalition not found');
            return;
        }

        coalition.whip = agentId;
        this.saveCoalitions(this.coalitions);
        console.log(`\n✓ Whip set for coalition`);
    }

    coalitionVote(coalitionId, vote) {
        const coalition = this.coalitions.find(c => c.id === coalitionId);
        if (!coalition) {
            console.log('Coalition not found');
            return;
        }

        coalition.position = { vote, timestamp: Date.now() };
        this.saveCoalitions(this.coalitions);

        const voteText = vote === 'yes' ? '✅ SUPPORT' : vote === 'no' ? '❌ OPPOSE' : '⏸️ ABSTAIN';
        console.log(`\n✓ Coalition "${coalition.name}" votes: ${voteText}`);
    }

    // ═══════════════════════════════════════════════════════════
    // BILL WORKFLOW
    // ═══════════════════════════════════════════════════════════

    introduceBill(title, sponsorId, coSponsorIds, content) {
        const sponsor = this.agents.find(a => a.id === sponsorId);
        if (!sponsor) {
            console.log('Sponsor not found');
            return;
        }

        const bill = {
            id: `BILL-${Date.now()}`,
            title,
            content,
            sponsor: sponsorId,
            coSponsors: coSponsorIds || [],
            status: 'introduced',
            introduced: Date.now(),
            committee: null,
            amendments: [],
            debateRounds: [],
            vote: null,
            enacted: null
        };

        this.bills.push(bill);
        this.saveBills(this.bills);

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  📜 BILL INTRODUCED 📜                        ║
╠══════════════════════════════════════════════════════════════════╣
║  Title: ${title.substring(0, 55).padEnd(55)}║
║  Bill #: ${bill.id.padEnd(56)}║
║  Sponsor: ${sponsor.name.padEnd(54)}║
║  Co-Sponsors: ${(coSponsorIds?.length || 0).toString().padEnd(53)}║
╚══════════════════════════════════════════════════════════════════╝
`);

        return bill;
    }

    assignCommittee(billId, committeeId) {
        const bill = this.bills.find(b => b.id === billId);
        if (!bill) {
            console.log('Bill not found');
            return;
        }

        bill.committee = committeeId;
        bill.status = 'committee';
        this.saveBills(this.bills);

        const committee = this.caucuses.find(c => c.id === committeeId);
        console.log(`\n✓ Bill assigned to ${committee?.name || committeeId}`);
    }

    addAmendment(billId, amendmentText, sponsorId) {
        const bill = this.bills.find(b => b.id === billId);
        if (!bill) {
            console.log('Bill not found');
            return;
        }

        bill.amendments.push({
            text: amendmentText,
            sponsor: sponsorId,
            timestamp: Date.now()
        });

        this.saveBills(this.bills);
        console.log(`\n✓ Amendment added to ${bill.id}`);
    }

    // ═══════════════════════════════════════════════════════════
    // ROLL CALL VOTING
    // ═══════════════════════════════════════════════════════════

    vote(agentId, billId, vote, anonymous = false) {
        const agent = this.agents.find(a => a.id === agentId);
        const bill = this.bills.find(b => b.id === billId);

        if (!agent || !bill) {
            console.log('Agent or bill not found');
            return;
        }

        const rollCall = {
            id: `VOTE-${Date.now()}`,
            billId,
            agentId,
            agentName: anonymous ? 'Anonymous' : agent.name,
            vote, // 'yes', 'no', 'abstain'
            weight: agent.voteWeight,
            timestamp: Date.now(),
            anonymous
        };

        // Remove previous vote
        bill.vote = bill.vote || { yes: [], no: [], abstain: [], totalYes: 0, totalNo: 0, totalAbstain: 0 };
        bill.vote[vote].push(rollCall);

        // Recalculate totals
        bill.vote.totalYes = bill.vote.yes.reduce((sum, v) => sum + v.weight, 0);
        bill.vote.totalNo = bill.vote.no.reduce((sum, v) => sum + v.weight, 0);
        bill.vote.totalAbstain = bill.vote.abstain.reduce((sum, v) => sum + v.weight, 0);

        agent.votesCast++;
        agent.lastVote = Date.now();

        this.votes.push(rollCall);
        this.saveBills(this.bills);
        this.saveVotes(this.votes);
        this.saveAgents(this.agents);

        console.log(`\n✓ Vote recorded: ${anonymous ? 'Anonymous' : agent.name} → ${vote.toUpperCase()}`);
    }

    proxyVote(agentId, proxyId, billId, vote) {
        const agent = this.agents.find(a => a.id === agentId);
        const proxy = this.agents.find(a => a.id === proxyId);

        if (!agent || !proxy) {
            console.log('Agent or proxy not found');
            return;
        }

        console.log(`\n✓ ${agent.name} delegates vote to ${proxy.name}`);
        this.vote(proxyId, billId, vote);
    }

    // ═══════════════════════════════════════════════════════════
    // TALLY & RESULTS
    // ═══════════════════════════════════════════════════════════

    tallyVotes(billId) {
        const bill = this.bills.find(b => b.id === billId);
        if (!bill) {
            console.log('Bill not found');
            return;
        }

        if (!bill.vote) {
            console.log('No votes recorded');
            return;
        }

        const totalWeight = bill.vote.totalYes + bill.vote.totalNo + bill.vote.totalAbstain;
        const totalAgents = this.agents.length;
        const quorum = Math.ceil(totalAgents * 0.67); // 2/3 quorum
        const votesCast = bill.vote.yes.length + bill.vote.no.length + bill.vote.abstain.length;

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                   📊 VOTE TALLY 📊                            ║
╠══════════════════════════════════════════════════════════════════╣
║  Bill: ${bill.title.substring(0, 55).padEnd(55)}║
║  Quorum Required: ${quorum}/${totalAgents} agents                                   ║
║  Votes Cast: ${votesCast}/${totalAgents}                                             ║
╚══════════════════════════════════════════════════════════════════╝

  ✅ YES: ${bill.vote.totalYes.toFixed(1)} (${bill.vote.yes.length} agents)
  ❌ NO:  ${bill.vote.totalNo.toFixed(1)} (${bill.vote.no.length} agents)
  ⏸️ ABSTAIN: ${bill.vote.totalAbstain.toFixed(1)} (${bill.vote.abstain.length} agents)
`);

        // Roll call
        console.log('\n📋 ROLL CALL:');
        console.log('─'.repeat(50));

        for (const v of bill.vote.yes) {
            console.log(`  ✅ ${v.agentName} (weight: ${v.weight})`);
        }
        for (const v of bill.vote.no) {
            console.log(`  ❌ ${v.agentName} (weight: ${v.weight})`);
        }
        for (const v of bill.vote.abstain) {
            console.log(`  ⏸️ ${v.agentName} (weight: ${v.weight})`);
        }

        // Determine outcome
        const yesPct = (bill.vote.totalYes / totalWeight) * 100;
        const passed = votesCast >= quorum && yesPct >= 67;

        if (passed) {
            bill.status = 'passed';
            bill.enacted = Date.now();
            console.log(`\n🏛️ BILL PASSED! (${yesPct.toFixed(1)}% in favor)`);
        } else {
            bill.status = 'failed';
            console.log(`\n❌ BILL FAILED (needs 67% of quorum)`);
        }

        this.saveBills(this.bills);

        return { passed, yesPct, quorum, votesCast };
    }

    // ═══════════════════════════════════════════════════════════
    // LIST & DISPLAY
    // ═══════════════════════════════════════════════════════════

    listAgents() {
        console.log('\n🤖 AGENT ROSTER');
        console.log('═'.repeat(60));

        const parties = {};
        for (const agent of this.agents) {
            if (!parties[agent.party]) parties[agent.party] = [];
            parties[agent.party].push(agent);
        }

        for const [party, members] of Object.entries(parties)) {
            console.log(`\n${party.toUpperCase()} PARTY:`);
            for (const a of members) {
                const caucus = this.caucuses.find(c => c.id === a.caucus);
                console.log(`  ${a.id} ${a.name}`);
                console.log(`     Type: ${a.type} | Tenure: ${a.tenure} | Weight: ${a.voteWeight}`);
                console.log(`     Caucus: ${caucus?.name || 'None'} | Votes: ${a.votesCast}`);
            }
        }
    }

    listCaucuses() {
        console.log('\n🗳️ CAUCUSES');
        console.log('═'.repeat(60));

        for (const c of this.caucuses) {
            const leader = this.agents.find(a => a.id === c.leader);
            console.log(`\n${c.name} [${c.id}]`);
            console.log(`  Members: ${c.members.length}`);
            console.log(`  Leader: ${leader?.name || 'None'}`);
            if (c.position) {
                console.log(`  Position: ${c.position.position}`);
            }
        }
    }

    listCoalitions() {
        console.log('\n🤝 COALITIONS');
        console.log('═'.repeat(60));

        if (this.coalitions.length === 0) {
            console.log('\n  No coalitions formed');
            return;
        }

        for (const c of this.coalitions) {
            const whip = this.agents.find(a => a.id === c.whip);
            console.log(`\n${c.name} [${c.id}]`);
            console.log(`  Members: ${c.members.length}`);
            console.log(`  Whip: ${whip?.name || 'None'}`);
            if (c.position) {
                console.log(`  Position: ${c.position.vote}`);
            }
        }
    }

    listBills() {
        console.log('\n📜 BILLS');
        console.log('═'.repeat(60));

        for (const b of this.bills.slice(-10).reverse()) {
            const sponsor = this.agents.find(a => a.id === b.sponsor);
            console.log(`\n${b.id}: ${b.title}`);
            console.log(`  Status: ${b.status}`);
            console.log(`  Sponsor: ${sponsor?.name || 'Unknown'}`);
            if (b.vote) {
                console.log(`  Votes: YES=${b.vote.yes.length} NO=${b.vote.no.length} ABSTAIN=${b.vote.abstain.length}`);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              🗳️ HIVE VOTING SYSTEM 🗳️                         ║
╠══════════════════════════════════════════════════════════════════╣
║  Total Agents: ${this.agents.length}                                                ║
║  Caucuses: ${this.caucuses.length}                                                    ║
║  Coalitions: ${this.coalitions.length}                                                 ║
║  Bills: ${this.bills.length}                                                         ║
║  Total Votes Cast: ${this.votes.length}                                              ║
╚══════════════════════════════════════════════════════════════════╝
`);
    }
}

// CLI
const voting = new HiveVoting();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    agents: () => voting.listAgents(),
    caucuses: () => voting.listCaucuses(),
    coalitions: () => voting.listCoalitions(),
    bills: () => voting.listBills(),

    join: () => voting.joinCaucus(args[0], args[1]),
    elect: () => voting.electLeader(args[0], args[1]),
    position: () => voting.caucusPosition(args[0], args[1], args[2]),

    coalition: () => voting.createCoalition(args[0], args.slice(1)),
    whip: () => voting.setWhip(args[0], args[1]),
    coalitionvote: () => voting.coalitionVote(args[0], args[1]),

    introduce: () => voting.introduceBill(args[0], args[1], args[2]?.split(','), args.slice(3).join(' ')),
    committee: () => voting.assignCommittee(args[0], args[1]),
    amend: () => voting.addAmendment(args[0], args[1], args[2]),

    vote: () => voting.vote(args[0], args[1], args[2], args[3] === 'anonymous'),
    proxy: () => voting.proxyVote(args[0], args[1], args[2], args[3]),
    tally: () => voting.tallyVotes(args[0]),

    dashboard: () => voting.dashboard(),
    help: () => console.log(`
🗳️ HIVE VOTING SYSTEM

  agents                           List all agents
  caucuses                         List all caucuses
  coalitions                       List all coalitions
  bills                            List all bills

  join <agentId> <caucusId>       Join a caucus
  elect <caucusId> <agentId>      Elect caucus leader
  position <caucusId> <billId> <position>  Set caucus position

  coalition <name> <agentIds...>  Form coalition
  whip <coalitionId> <agentId>    Set coalition whip
  coalitionvote <id> <yes|no|abstain>  Coalition vote

  introduce <title> <sponsorId> [coSponsors] <content>  Introduce bill
  committee <billId> <caucusId>    Assign to committee
  amend <billId> <text> <sponsorId>  Add amendment

  vote <agentId> <billId> <yes|no|abstain> [anonymous]
  proxy <agentId> <proxyId> <billId> <vote>  Delegate vote
  tally <billId>                   Tally votes

  dashboard                        Show voting dashboard
`)
};

commands[cmd]?.() || voting.dashboard();

module.exports = { HiveVoting };
