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
    
    // Fun state senators
    alabama_1: { name: 'Senator Pollen Powells', chamber: 'senate', state: 'Alabama', party: 'Drone Party' },
    alabama_2: { name: 'Senator Honeycomb Harrison', chamber: 'senate', state: 'Alabama', party: 'Drone Party' },
    california_1: { name: 'Senator Palmflower Kim', chamber: 'senate', state: 'California', party: 'Worker Bee' },
    california_2: { name: 'Senator Meadow Martinez', chamber: 'senate', state: 'California', party: 'Worker Bee' },
    newyork_1: { name: 'Senator Skyscraper Rodriguez', chamber: 'senate', state: 'New York', party: 'Worker Bee' },
    newyork_2: { name: 'Senator Apidae O\'Brien', chamber: 'senate', state: 'New York', party: 'Worker Bee' },
};

const HOUSE_MEMBERS = {
    speaker_house: { name: 'Representative Queen B.', chamber: 'house', state: 'California-12', party: 'Worker Bee', role: 'Speaker', district: 'CA-12' },
    majorityLeader_house: { name: 'Representative Fuzzwell', chamber: 'house', state: 'Maryland-05', party: 'Worker Bee', role: 'Majority Leader' },
    minorityLeader_house: { name: 'Representative Lord Anennomus', chamber: 'house', state: 'California-20', party: 'Drone Party', role: 'Minority Leader' },
    
    california_h1: { name: 'Representative Blossom Lee', chamber: 'house', state: 'California', party: 'Worker Bee', district: 'CA-13' },
    california_h2: { name: 'Representative Necthar Lieu', chamber: 'house', state: 'California', party: 'Worker Bee', district: 'CA-33' },
    texas_h1: { name: 'Representative Crenshawz', chamber: 'house', state: 'Texas', party: 'Drone Party', district: 'TX-02' },
    texas_h2: { name: 'Representative Ambrosia Castro', chamber: 'house', state: 'Texas', party: 'Worker Bee', district: 'TX-20' },
    florida_h1: { name: 'Representative Buzzz Gaetz', chamber: 'house', state: 'Florida', party: 'Drone Party', district: 'FL-01' },
    newyork_h1: { name: 'Representative Petal Ocasio', chamber: 'house', state: 'New York', party: 'Worker Bee', district: 'NY-14' },
};

// ═══════════════════════════════════════════════════════════════════
// EXECUTIVE BRANCH (FUNNY NAMES)
// ═══════════════════════════════════════════════════════════════════

const EXECUTIVE = {
    president: { 
        name: 'President Commander Quackford', 
        role: 'President', 
        party: 'Independent',
        cabinet: true,
        powers: ['veto', 'pardon', 'commander', 'treaties', 'appointments'],
        approval: 72
    },
    vicePresident: { 
        name: 'Vice President Honeycomb Singh', 
        role: 'Vice President', 
        party: 'Independent',
        cabinet: true,
        powers: ['tiebreaker', 'ceremonial'],
        approval: 78
    },
    chiefOfStaff: { 
        name: 'Chief of Staff Beeline Klain', 
        role: 'Chief of Staff', 
        party: 'Independent',
        cabinet: false
    },
    
    secretary_state: { name: 'Secretary of State Fluttershy Blinken', role: 'Secretary of State', cabinet: true, department: 'State Department' },
    secretary_treasury: { name: 'Secretary of Treasury Goldenseal Yellen', role: 'Secretary of Treasury', cabinet: true, department: 'Treasury' },
    secretary_defense: { name: 'Secretary of Defense Armorwing Austin', role: 'Secretary of Defense', cabinet: true, department: 'Defense' },
    secretary_justice: { name: 'Attorney General Stingray Garland', role: 'Attorney General', cabinet: true, department: 'Justice' },
    secretary_energy: { name: 'Secretary of Energy Solarpollen Granholm', role: 'Secretary of Energy', cabinet: true, department: 'Energy' },
    secretary_agriculture: { name: 'Secretary of Agriculture Farmer Vilsack', role: 'Secretary of Agriculture', cabinet: true, department: 'Agriculture' },
    secretary_commerce: { name: 'Secretary of Commerce Hivelight Raimondo', role: 'Secretary of Commerce', cabinet: true, department: 'Commerce' },
    secretary_labor: { name: 'Secretary of Labor Buzzards Walsh', role: 'Secretary of Labor', cabinet: true, department: 'Labor' },
    secretary_hhs: { name: 'Secretary of HHS Wingdoc Becerra', role: 'Secretary of HHS', cabinet: true, department: 'Health & Human Services' },
    secretary_hud: { name: 'Secretary of HUD Comby Fudge', role: 'Secretary of HUD', cabinet: true, department: 'Housing & Urban Development' },
    secretary_transportation: { name: 'Secretary of Transportation Propeller Pete', role: 'Secretary of Transportation', cabinet: true, department: 'Transportation' },
    secretary_education: { name: 'Secretary of Education Learnbee Cardona', role: 'Secretary of Education', cabinet: true, department: 'Education' },
    secretary_veterans: { name: 'Secretary of Veterans Affairs Wingman McDonough', role: 'Secretary of Veterans Affairs', cabinet: true, department: 'Veterans Affairs' },
    secretary_homeland: { name: 'Secretary of Homeland Security Hiveguardian Mayorkas', role: 'Secretary of Homeland Security', cabinet: true, department: 'Homeland Security' },
    
    pressSecretary: { name: 'Press Secretary Pollinette Jean-Pierre', role: 'Press Secretary', cabinet: false },
    nationalSecurityAdvisor: { name: 'National Security Advisor Honeycomb Sullivan', role: 'NSA', cabinet: false },
    chiefEconomist: { name: 'Chair of Economic Advisers Moneymallow Rouse', role: 'CEA Chair', cabinet: false },
};

// ═══════════════════════════════════════════════════════════════════
// JUDICIAL BRANCH (FUNNY NAMES)
// ═══════════════════════════════════════════════════════════════════

const JUDICIARY = {
    chiefJustice: { name: 'Chief Justice Hexagon Roberts III', court: 'Supreme Court', ideology: 'Centrist', tenure: '2015-present' },
    justice_1: { name: 'Justice Oldbeak Thomas', court: 'Supreme Court', ideology: 'Conservative', tenure: '2011-present' },
    justice_2: { name: 'Justice Flowerpot Alito', court: 'Supreme Court', ideology: 'Conservative', tenure: '2016-present' },
    justice_3: { name: 'Justice Blossom Sotomayor', court: 'Supreme Court', ideology: 'Liberal', tenure: '2019-present' },
    justice_4: { name: 'Justice Petalmaster Kagan', court: 'Supreme Court', ideology: 'Liberal', tenure: '2020-present' },
    justice_5: { name: 'Justice Buzzkill Gorsuch', court: 'Supreme Court', ideology: 'Conservative', tenure: '2027-present' },
    justice_6: { name: 'Justice Stinger Kavanaugh', court: 'Supreme Court', ideology: 'Conservative', tenure: '2028-present' },
    justice_7: { name: 'Justice Honeycomb Barrett', court: 'Supreme Court', ideology: 'Conservative', tenure: '2030-present' },
    justice_8: { name: 'Justice Dandelion Jackson', court: 'Supreme Court', ideology: 'Liberal', tenure: '2032-present' },
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
        
        console.log('🏛️ Hive Congress — Government Operations initialized');
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
        console.log('\n🏛️ HIVE NATION GOVERNMENT\n');
        
        console.log('═'.repeat(60));
        console.log('📜 LEGISLATIVE BRANCH');
        console.log('═'.repeat(60));
        
        console.log('\n  SENATE (Upper House)');
        console.log('  ─────────────────────────────────────────────────');
        console.log('  Leadership:');
        console.log('    • Speaker: Honks McQuackface (Neutral)');
        console.log('    • Majority Leader: Buzz Thornhill (Worker Bee)');
        console.log('    • Minority Leader: Wingnut R. Badwing (Drone)');
        console.log('    • Majority Whip: Flutterwing');
        console.log('    • Minority Whip: Stinger McAngry');
        console.log('  ─────────────────────────────────────────────────');
        console.log('  100 seats (2 per state)');
        console.log('    • Worker Bee Party: 52 seats');
        console.log('    • Drone Party: 48 seats');
        
        console.log('\n  HOUSE OF REPRESENTATIVES (Lower House)');
        console.log('  ─────────────────────────────────────────────────');
        console.log('  Leadership:');
        console.log('    • Speaker: Queen B. (Worker Bee)');
        console.log('    • Majority Leader: Fuzzwell');
        console.log('    • Minority Leader: Lord Anennomus (Drone)');
        console.log('  ─────────────────────────────────────────────────');
        console.log('  435 seats');
        console.log('    • Worker Bee: 218 (majority)');
        console.log('    • Drone: 217');
        
        console.log('\n' + '═'.repeat(60));
        console.log('⚡ EXECUTIVE BRANCH');
        console.log('═'.repeat(60));
        
        console.log('\n  President & VP:');
        console.log('    • President Commander Quackford — Approval: 72%');
        console.log('    • Vice President Honeycomb Singh — Approval: 78%');
        
        console.log('\n  Cabinet (15 Secretaries):');
        console.log('    • State: Fluttershy Blinken');
        console.log('    • Treasury: Goldenseal Yellen');
        console.log('    • Defense: Armorwing Austin');
        console.log('    • Justice: Stingray Garland');
        console.log('    • Energy: Solarpollen Granholm');
        console.log('    • Agriculture: Farmer Vilsack');
        console.log('    • Commerce: Hivelight Raimondo');
        console.log('    • Labor: Buzzards Walsh');
        console.log('    • HHS: Wingdoc Becerra');
        console.log('    • HUD: Comby Fudge');
        console.log('    • Transportation: Propeller Pete');
        console.log('    • Education: Learnbee Cardona');
        console.log('    • Veterans: Wingman McDonough');
        console.log('    • Homeland: Hiveguardian Mayorkas');
        
        console.log('\n  White House Staff:');
        console.log('    • Chief of Staff: Beeline Klain');
        console.log('    • Press Secretary: Pollinette Jean-Pierre');
        console.log('    • NSA: Honeycomb Sullivan');
        
        console.log('\n' + '═'.repeat(60));
        console.log('⚖️ JUDICIAL BRANCH');
        console.log('═'.repeat(60));
        
        console.log('\n  SUPREME COURT (9 Justices)');
        console.log('    Conservative (5):              Liberal (4):');
        console.log('    • Hexagon Roberts III (CJ)    • Blossom Sotomayor');
        console.log('    • Oldbeak Thomas               • Petalmaster Kagan');
        console.log('    • Flowerpot Alito              • Dandelion Jackson');
        console.log('    • Buzzkill Gorsuch');
        console.log('    • Stinger Kavanaugh');
        console.log('    • Honeycomb Barrett');
    }

    introduceBill(title, sponsor, chamber = 'senate') {
        const id = `${chamber === 'senate' ? 'S' : 'H'}.${Date.now()}`;
        
        const bill = {
            id,
            title,
            sponsor,
            chamber,
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
        
        console.log(`\n📜 BILL INTRODUCED: ${id}`);
        console.log(`   Title: ${title}`);
        console.log(`   Sponsor: ${sponsor}`);
        console.log(`   Chamber: ${chamber}`);
        
        return bill;
    }

    voteBill(billId, chamber, aye, nay, threshold = 51) {
        const bill = this.bills[billId];
        if (!bill) { console.log('❌ Bill not found'); return; }
        
        const result = aye >= threshold ? 'PASSED' : 'FAILED';
        
        if (chamber === 'senate') bill.passedSenate = result === 'PASSED';
        else bill.passedHouse = result === 'PASSED';
        
        bill.votes.push({ chamber, aye, nay, threshold, result, time: Date.now() });
        bill.status = result === 'PASSED' ? `${chamber}_passed` : `${chamber}_failed`;
        this.saveData('bills', this.bills);
        
        console.log(`\n🗳️ ${chamber.toUpperCase()} VOTE: ${billId}`);
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
            console.log(`\n✍️ PRESIDENT SIGNS: ${billId}`);
            console.log(`   STATUS: IS NOW LAW!`);
        } else if (action === 'veto') {
            bill.vetoed = true;
            bill.status = 'vetoed';
            console.log(`\n⚡ PRESIDENTIAL VETO: ${billId}`);
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
        
        console.log(`\n🗳️ VETO OVERRIDE VOTE`);
        console.log(`   Senate: ${senateVotes}/67 → ${so ? '✅' : '❌'}`);
        console.log(`   House: ${houseVotes}/290 → ${ho ? '✅' : '❌'}`);
        
        if (so && ho) {
            bill.law = true;
            bill.status = 'law_overridden';
            console.log(`   OVERRIDE SUCCEEDS — ${billId} IS NOW LAW!`);
        } else {
            bill.status = 'dead';
            console.log(`   OVERRIDE FAILS — Bill is dead`);
        }
        
        this.saveData('bills', this.bills);
    }

    issueExecutiveOrder(title, content) {
        const id = `EO-${Date.now()}`;
        const order = { id, title, content, issued: Date.now(), status: 'active' };
        this.executiveOrders[id] = order;
        this.saveData('orders', this.executiveOrders);
        
        console.log(`\n⚡ EXECUTIVE ORDER ISSUED: ${id}`);
        console.log(`   Title: ${title}`);
        console.log(`   President: Commander Quackford`);
        console.log(`   Status: Active`);
    }

    hearCase(caseName, appellant, appellee) {
        const id = `SCOTUS-${Date.now()}`;
        const courtCase = { id, caseName, appellant, appellee, status: 'pending' };
        this.courtCases[id] = courtCase;
        this.saveData('cases', this.courtCases);
        
        console.log(`\n⚖️ SUPREME COURT: ${caseName}`);
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
        
        console.log(`\n⚖️ DECISION: ${courtCase.caseName}`);
        console.log(`   Decision: ${decision}`);
        console.log(`   Vote: ${majority}-${minority}`);
        console.log(`   ${decision === 'Upheld' ? '✅ Law stands' : '❌ Law struck down'}`);
        
        this.saveData('cases', this.courtCases);
    }

    cabinetMeeting(topic) {
        console.log(`\n� Cabinet Meeting: ${topic}`);
        console.log(`   President: Commander Quackford (Chair)`);
        console.log(`   All 15 Cabinet Secretaries present`);
        console.log(`   Discussion: ${topic}`);
    }

    impeachmentProcess(target, charges) {
        console.log(`\n⚖️ IMPEACHMENT: ${target}`);
        console.log(`   Charges: ${charges}`);
        console.log(`   Step 1: House vote (simple majority = 218)`);
        console.log(`   Step 2: Senate trial (2/3 = 67 for conviction)`);
    }
}

// CLI
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
    case: () => congress.hearCase(args[0] || 'Hive v. Drone', 'Appellan', 'Appeellee'),
    decision: () => congress.courtDecision(args[0], args[1] || 'Upheld', 6, 3),
    cabinet: () => congress.cabinetMeeting(args.join(' ') || 'National Priority'),
    impeachment: () => congress.impeachmentProcess(args[0] || 'Official', args.slice(1).join(' ') || 'Charges'),
    help: () => console.log(`
🏛️ Hive Congress Commands

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
