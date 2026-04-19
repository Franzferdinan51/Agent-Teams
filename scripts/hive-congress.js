#!/usr/bin/env node
/**
 * Hive Congress — Full Government Operations
 * 
 * A fully functional government for the Hive Nation.
 * NOT a simulation — actual operations between branches.
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// CONGRESSIONAL MEMBERS (FUNNY HIVE NAMES)
// ═══════════════════════════════════════════════════════════════════

const SENATORS = {
    speaker: { name: 'Senator Honks McQuackface', chamber: 'senate', state: 'Hive-Nation', party: 'Neutral', role: 'Speaker' },
    majorityLeader: { name: 'Senator Buzz Thornhill', chamber: 'senate', state: 'California', party: 'Worker Bee', role: 'Majority Leader' },
    minorityLeader: { name: 'Senator Wingnut R. Badwing', chamber: 'senate', state: 'Texas', party: 'Drone Party', role: 'Minority Leader' },
    whip_prog: { name: 'Senator Flutterwing', chamber: 'senate', state: 'Georgia', party: 'Worker Bee', role: 'Majority Whip' },
    whip_con: { name: 'Senator Stinger McAngry', chamber: 'senate', state: 'Florida', party: 'Drone Party', role: 'Minority Whip' },
};

const HOUSE_MEMBERS = {
    speaker_house: { name: 'Representative Queen B.', chamber: 'house', state: 'California-12', party: 'Worker Bee', role: 'Speaker' },
    majorityLeader_house: { name: 'Representative Fuzzwell', chamber: 'house', state: 'Maryland-05', party: 'Worker Bee', role: 'Majority Leader' },
    minorityLeader_house: { name: 'Representative Lord Anennomus', chamber: 'house', state: 'California-20', party: 'Drone Party', role: 'Minority Leader' },
};

// ═══════════════════════════════════════════════════════════════════
// EXECUTIVE BRANCH (FUNNY NAMES)
// ═══════════════════════════════════════════════════════════════════

const EXECUTIVE = {
    president: { 
        name: 'President Quackford McDuck', 
        role: 'President', 
        party: 'Independent',
        cabinet: true,
        powers: ['veto', 'pardon', 'commander', 'treaties', 'appointments'],
        approval: 72,
        tagline: 'The LEADER of the Hive Nation'
    },
    vicePresident: { 
        name: 'Vice President Lobster Loxington III', 
        role: 'Vice President', 
        party: 'Independent',
        cabinet: true,
        powers: ['tiebreaker', 'ceremonial'],
        approval: 78,
        tagline: 'The LOYAL second-in-command'
    },
    
    secretary_state: { name: 'Secretary of State Fluttershy Blinken', role: 'Secretary of State', cabinet: true },
    secretary_treasury: { name: 'Secretary of Treasury Goldenseal Yellen', role: 'Secretary of Treasury', cabinet: true },
    secretary_defense: { name: 'Secretary of Defense Armorwing Austin', role: 'Secretary of Defense', cabinet: true },
    secretary_justice: { name: 'Attorney General Stingray Garland', role: 'Attorney General', cabinet: true },
    secretary_energy: { name: 'Secretary of Energy Solarpollen Granholm', role: 'Secretary of Energy', cabinet: true },
    secretary_agriculture: { name: 'Secretary of Agriculture Farmer Vilsack', role: 'Secretary of Agriculture', cabinet: true },
    secretary_commerce: { name: 'Secretary of Commerce Hivelight Raimondo', role: 'Secretary of Commerce', cabinet: true },
    secretary_labor: { name: 'Secretary of Labor Buzzards Walsh', role: 'Secretary of Labor', cabinet: true },
    secretary_hhs: { name: 'Secretary of HHS Wingdoc Becerra', role: 'Secretary of HHS', cabinet: true },
    secretary_hud: { name: 'Secretary of HUD Comby Fudge', role: 'Secretary of HUD', cabinet: true },
    secretary_transportation: { name: 'Secretary of Transportation Propeller Pete', role: 'Secretary of Transportation', cabinet: true },
    secretary_education: { name: 'Secretary of Education Learnbee Cardona', role: 'Secretary of Education', cabinet: true },
    secretary_veterans: { name: 'Secretary of Veterans Affairs Wingman McDonough', role: 'Secretary of Veterans Affairs', cabinet: true },
    secretary_homeland: { name: 'Secretary of Homeland Security Hiveguardian Mayorkas', role: 'Secretary of Homeland Security', cabinet: true },
};

// ═══════════════════════════════════════════════════════════════════
// JUDICIAL BRANCH
// ═══════════════════════════════════════════════════════════════════

const JUDICIARY = {
    chiefJustice: { name: 'Chief Justice Hexagon Roberts III', court: 'Supreme Court', ideology: 'Centrist' },
    justice_1: { name: 'Justice Oldbeak Thomas', court: 'Supreme Court', ideology: 'Conservative' },
    justice_2: { name: 'Justice Flowerpot Alito', court: 'Supreme Court', ideology: 'Conservative' },
    justice_3: { name: 'Justice Blossom Sotomayor', court: 'Supreme Court', ideology: 'Liberal' },
    justice_4: { name: 'Justice Petalmaster Kagan', court: 'Supreme Court', ideology: 'Liberal' },
    justice_5: { name: 'Justice Buzzkill Gorsuch', court: 'Supreme Court', ideology: 'Conservative' },
    justice_6: { name: 'Justice Stinger Kavanaugh', court: 'Supreme Court', ideology: 'Conservative' },
    justice_7: { name: 'Justice Honeycomb Barrett', court: 'Supreme Court', ideology: 'Conservative' },
    justice_8: { name: 'Justice Dandelion Jackson', court: 'Supreme Court', ideology: 'Liberal' },
};

// ═══════════════════════════════════════════════════════════════════
// GOVERNMENT OPERATIONS
// ═══════════════════════════════════════════════════════════════════

class HiveCongress {
    constructor() {
        this.dataDir = '/tmp/hive-congress';
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
        
        this.bills = this.loadData('bills');
        this.executiveOrders = this.loadData('orders');
        this.courtCases = this.loadData('cases');
        
        console.log('Hive Congress initialized');
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

    viewStructure() {
        console.log('\nHIVE NATION GOVERNMENT\n');
        console.log('='.repeat(60));
        console.log('LEGISLATIVE BRANCH');
        console.log('='.repeat(60));
        
        console.log('\n  SENATE (Upper House)');
        console.log('  - Speaker: Honks McQuackface (Neutral)');
        console.log('  - Majority Leader: Buzz Thornhill (Worker Bee)');
        console.log('  - Minority Leader: Wingnut R. Badwing (Drone)');
        console.log('  - 100 seats (2 per state)');
        
        console.log('\n  HOUSE OF REPRESENTATIVES (Lower House)');
        console.log('  - Speaker: Queen B. (Worker Bee)');
        console.log('  - 435 seats');
        
        console.log('\n' + '='.repeat(60));
        console.log('EXECUTIVE BRANCH');
        console.log('='.repeat(60));
        
        console.log('\n  President & VP:');
        console.log('    * President Quackford McDuck - Approval: 72%');
        console.log('      "The LEADER of the Hive Nation"');
        console.log('    * Vice President Lobster Loxington III - Approval: 78%');
        console.log('      "The LOYAL second-in-command"');
        
        console.log('\n  Cabinet:');
        console.log('    * State: Fluttershy Blinken');
        console.log('    * Treasury: Goldenseal Yellen');
        console.log('    * Defense: Armorwing Austin');
        console.log('    * Justice: Stingray Garland');
        console.log('    * [Plus 11 more...]');
        
        console.log('\n' + '='.repeat(60));
        console.log('JUDICIAL BRANCH');
        console.log('='.repeat(60));
        
        console.log('\n  SUPREME COURT (9 Justices)');
        console.log('    Conservative (5):              Liberal (4):');
        console.log('    * Hexagon Roberts III (CJ)     * Blossom Sotomayor');
        console.log('    * Oldbeak Thomas               * Petalmaster Kagan');
        console.log('    * Flowerpot Alito              * Dandelion Jackson');
        console.log('    * Buzzkill Gorsuch');
        console.log('    * Stinger Kavanaugh');
        console.log('    * Honeycomb Barrett');
    }

    introduceBill(title, sponsor, chamber = 'senate') {
        const id = `${chamber === 'senate' ? 'S' : 'H'}.${Date.now()}`;
        
        const bill = {
            id, title, sponsor, chamber,
            introduced: Date.now(),
            status: 'introduced',
            passedSenate: false,
            passedHouse: false,
            signedByPresident: false,
            vetoed: false,
            law: false,
            votes: []
        };
        
        this.bills[id] = bill;
        this.saveData('bills', this.bills);
        
        console.log(`\nBILL INTRODUCED: ${id}`);
        console.log(`   Title: ${title}`);
        console.log(`   Sponsor: ${sponsor}`);
        console.log(`   Chamber: ${chamber}`);
        
        return bill;
    }

    voteBill(billId, chamber, aye, nay, threshold = 51) {
        const bill = this.bills[billId];
        if (!bill) { console.log('Bill not found'); return; }
        
        const result = aye >= threshold ? 'PASSED' : 'FAILED';
        
        if (chamber === 'senate') bill.passedSenate = result === 'PASSED';
        else bill.passedHouse = result === 'PASSED';
        
        bill.votes.push({ chamber, aye, nay, threshold, result, time: Date.now() });
        bill.status = result === 'PASSED' ? `${chamber}_passed` : `${chamber}_failed`;
        this.saveData('bills', this.bills);
        
        console.log(`\n${chamber.toUpperCase()} VOTE: ${billId}`);
        console.log(`   Aye: ${aye} | Nay: ${nay} | Needed: ${threshold}`);
        console.log(`   Result: ${result}`);
    }

    presidentialAction(billId, action, reason = '') {
        const bill = this.bills[billId];
        if (!bill) return;
        
        if (action === 'sign') {
            bill.signedByPresident = true;
            bill.law = true;
            bill.status = 'signed';
            console.log(`\nPRESIDENT HONEYCOMB MCSTUFFINS SIGNS: ${billId}`);
            console.log(`   STATUS: IS NOW LAW!`);
        } else if (action === 'veto') {
            bill.vetoed = true;
            bill.status = 'vetoed';
            console.log(`\nPRESIDENTIAL VETO by Quackford McDuck: ${billId}`);
            console.log(`   Reason: ${reason || 'Policy concerns'}`);
            console.log(`   Override requires: 2/3 both chambers`);
        }
        
        this.saveData('bills', this.bills);
    }

    vetoOverride(billId, senateVotes, houseVotes) {
        const bill = this.bills[billId];
        if (!bill) return;
        
        const so = senateVotes >= 67;
        const ho = houseVotes >= 290;
        
        console.log(`\nVETO OVERRIDE VOTE`);
        console.log(`   Senate: ${senateVotes}/67 - ${so ? 'SUCCEEDS' : 'FAILS'}`);
        console.log(`   House: ${houseVotes}/290 - ${ho ? 'SUCCEEDS' : 'FAILS'}`);
        
        if (so && ho) {
            bill.law = true;
            bill.status = 'law_overridden';
            console.log(`   OVERRIDE SUCCEEDS - ${billId} IS NOW LAW!`);
        } else {
            bill.status = 'dead';
            console.log(`   OVERRIDE FAILS - Bill is dead`);
        }
        
        this.saveData('bills', this.bills);
    }

    issueExecutiveOrder(title, content) {
        const id = `EO-${Date.now()}`;
        const order = { id, title, content, issued: Date.now(), status: 'active' };
        this.executiveOrders[id] = order;
        this.saveData('orders', this.executiveOrders);
        
        console.log(`\nEXECUTIVE ORDER ISSUED: ${id}`);
        console.log(`   Title: ${title}`);
        console.log(`   President: Quackford McDuck`);
        console.log(`   Status: Active`);
    }

    hearCase(caseName, appellant, appellee) {
        const id = `SCOTUS-${Date.now()}`;
        const courtCase = { id, caseName, appellant, appellee, status: 'pending' };
        this.courtCases[id] = courtCase;
        this.saveData('cases', this.courtCases);
        
        console.log(`\nSUPREME COURT: ${caseName}`);
        console.log(`   Appellant: ${appellant}`);
        console.log(`   Appellee: ${appellee}`);
        console.log(`   Status: Pending decision`);
        
        return courtCase;
    }

    courtDecision(caseId, decision, majority, minority) {
        const courtCase = this.courtCases[caseId];
        if (!courtCase) return;
        
        courtCase.decision = decision;
        courtCase.votes = { majority, minority };
        courtCase.status = 'decided';
        
        console.log(`\nDECISION: ${courtCase.caseName}`);
        console.log(`   Decision: ${decision}`);
        console.log(`   Vote: ${majority}-${minority}`);
        console.log(`   ${decision === 'Upheld' ? 'Law stands' : 'Law struck down'}`);
        
        this.saveData('cases', this.courtCases);
    }

    cabinetMeeting(topic) {
        console.log(`\nCABINET MEETING: ${topic}`);
        console.log(`   President: Quackford McDuck (Chair)`);
        console.log(`   Vice President: Lobster Loxington III`);
        console.log(`   All 15 Cabinet Secretaries present`);
    }

    impeachmentProcess(target, charges) {
        console.log(`\nIMPEACHMENT: ${target}`);
        console.log(`   Charges: ${charges}`);
        console.log(`   Step 1: House vote (simple majority = 218)`);
        console.log(`   Step 2: Senate trial (2/3 = 67 for conviction)`);
    }
}

const congress = new HiveCongress();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    structure: () => congress.viewStructure(),
    bill: () => congress.introduceBill(args.join(' ') || 'New Legislation', 'Honks McQuackface', 'senate'),
    vote: () => congress.voteBill(args[0], args[1] || 'senate', parseInt(args[2]) || 60, parseInt(args[3]) || 40),
    sign: () => congress.presidentialAction(args[0], 'sign'),
    veto: () => congress.presidentialAction(args[0], 'veto', args.slice(1).join(' ')),
    override: () => congress.vetoOverride(args[0], parseInt(args[1]) || 60, parseInt(args[2]) || 250),
    eo: () => congress.issueExecutiveOrder(args.join(' ') || 'Executive Order', 'Content here'),
    case: () => congress.hearCase(args[0] || 'Hive v. Drone', 'Appellant', 'Appellee'),
    decision: () => congress.courtDecision(args[0], args[1] || 'Upheld', 6, 3),
    cabinet: () => congress.cabinetMeeting(args.join(' ') || 'National Priority'),
    impeachment: () => congress.impeachmentProcess(args[0] || 'Official', args.slice(1).join(' ') || 'Charges'),
    help: () => console.log(`
Hive Congress Commands

  structure          View government structure
  bill <title>      Introduce bill
  vote <id> <ch> <aye> <nay>  Vote
  sign <id>         President signs
  veto <id> <reason>  Presidential veto
  override <id> <sen> <hou>  Veto override
  eo <title>        Executive order
  case <name>       Supreme Court case
  decision <id> <r> <maj> <min>  Court decision
  cabinet <topic>   Cabinet meeting
  impeachment <who> <charges>  Impeachment
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveCongress, SENATORS, HOUSE_MEMBERS, EXECUTIVE, JUDICIARY };
