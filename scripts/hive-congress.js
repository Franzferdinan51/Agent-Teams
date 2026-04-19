#!/usr/bin/env node
/**
 * Hive Congress — Full Government Simulation
 * 
 * THREE BRANCHES:
 * - Legislative (Senate + House)
 * - Executive (President, VP, Cabinet)
 * - Judicial (Supreme Court)
 * 
 * Interactions between branches:
 * - Bills must pass both houses
 * - President can veto
 * - Courts can strike down
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// CONGRESSIONAL MEMBERS
// ═══════════════════════════════════════════════════════════════════

const SENATORS = {
    speaker: { name: 'Victoria Adams', chamber: 'senate', state: 'National', party: 'Independent', role: 'Speaker', rank: 1 },
    majorityLeader: { name: 'Marcus Hope', chamber: 'senate', state: 'California', party: 'Progressive', role: 'Majority Leader', rank: 2 },
    minorityLeader: { name: 'Thomas Reed', chamber: 'senate', state: 'Texas', party: 'Conservative', role: 'Minority Leader', rank: 2 },
    whip_senate: { name: 'Unity Carter', chamber: 'senate', state: 'Georgia', party: 'Progressive', role: 'Majority Whip', rank: 3 },
    whip_senate_con: { name: 'Sarah Steel', chamber: 'senate', state: 'Florida', party: 'Conservative', role: 'Minority Whip', rank: 3 },
    
    // Senate seats by state (2 per state = 100)
    alabama_1: { name: 'Robert Bentley', chamber: 'senate', state: 'Alabama', party: 'Conservative', seat: 1 },
    alabama_2: { name: 'Katie Boyd', chamber: 'senate', state: 'Alabama', party: 'Conservative', seat: 2 },
    california_1: { name: 'Alexandra Kim', chamber: 'senate', state: 'California', party: 'Progressive', seat: 1 },
    california_2: { name: 'Diego Martinez', chamber: 'senate', state: 'California', party: 'Progressive', seat: 2 },
    texas_1: { name: 'Jennifer Walsh', chamber: 'senate', state: 'Texas', party: 'Conservative', seat: 1 },
    texas_2: { name: 'Michael Chen', chamber: 'senate', state: 'Texas', party: 'Conservative', seat: 2 },
    newyork_1: { name: 'Emily Rodriguez', chamber: 'senate', state: 'New York', party: 'Progressive', seat: 1 },
    newyork_2: { name: 'James O\'Brien', chamber: 'senate', state: 'New York', party: 'Progressive', seat: 2 },
};

const HOUSE_MEMBERS = {
    speaker_house: { name: 'Nancy Powers', chamber: 'house', state: 'California-12', party: 'Progressive', role: 'Speaker', rank: 1, district: 'CA-12' },
    majorityLeader_house: { name: 'Steny Hoyer II', chamber: 'house', state: 'Maryland-05', party: 'Progressive', role: 'Majority Leader', rank: 2 },
    minorityLeader_house: { name: 'Kevin McCarthy Jr.', chamber: 'house', state: 'California-20', party: 'Conservative', role: 'Minority Leader', rank: 2 },
    
    // House seats by state delegation
    california_h1: { name: 'Barbara Lee', chamber: 'house', state: 'California', party: 'Progressive', district: 'CA-13', committee: ['Appropriations', 'Budget'] },
    california_h2: { name: 'Ted Lieu', chamber: 'house', state: 'California', party: 'Progressive', district: 'CA-33', committee: ['Judiciary', 'Foreign Affairs'] },
    texas_h1: { name: 'Dan Crenshaw', chamber: 'house', state: 'Texas', party: 'Conservative', district: 'TX-02', committee: ['Veterans Affairs', 'Budget'] },
    texas_h2: { name: 'Julián Castro', chamber: 'house', state: 'Texas', party: 'Progressive', district: 'TX-20', committee: ['Transportation', 'Housing'] },
    florida_h1: { name: 'Matt Gaetz', chamber: 'house', state: 'Florida', party: 'Conservative', district: 'FL-01', committee: ['Judiciary', 'Armed Services'] },
    newyork_h1: { name: 'Alexandria Ocasio', chamber: 'house', state: 'New York', party: 'Progressive', district: 'NY-14', committee: ['Oversight', 'Financial Services'] },
};

// ═══════════════════════════════════════════════════════════════════
// EXECUTIVE BRANCH
// ═══════════════════════════════════════════════════════════════════

const EXECUTIVE = {
    president: { 
        name: 'President James Biden Jr.', 
        role: 'President', 
        party: 'Democratic',
        cabinet: true,
        powers: ['veto', 'pardon', 'commander', 'treaties', 'appointments'],
        approval: 52
    },
    vicePresident: { 
        name: 'Vice President Kamala Singh', 
        role: 'Vice President', 
        party: 'Democratic',
        cabinet: true,
        powers: ['tiebreaker', 'ceremonial'],
        approval: 58
    },
    chiefOfStaff: { 
        name: 'Ron Klain II', 
        role: 'Chief of Staff', 
        party: 'Democratic',
        cabinet: false,
        department: 'White House'
    },
    
    // Cabinet Secretaries
    secretary_state: { 
        name: 'Antony Blinken II', 
        role: 'Secretary of State', 
        party: 'Independent',
        cabinet: true,
        department: 'State Department',
        powers: ['foreign_policy', 'diplomacy', 'treaties']
    },
    secretary_treasury: { 
        name: 'Janet Yellen Jr.', 
        role: 'Secretary of Treasury', 
        party: 'Independent',
        cabinet: true,
        department: 'Treasury',
        powers: ['budget', 'taxes', 'currency']
    },
    secretary_defense: { 
        name: 'Lloyd Austin III', 
        role: 'Secretary of Defense', 
        party: 'Independent',
        cabinet: true,
        department: 'Defense',
        powers: ['military', 'national_security']
    },
    attorney_general: { 
        name: 'Merrick Garland Jr.', 
        role: 'Attorney General', 
        party: 'Independent',
        cabinet: true,
        department: 'Justice',
        powers: ['law_enforcement', 'prosecution']
    },
    secretary_energy: { 
        name: 'Jennifer Granholm Jr.', 
        role: 'Secretary of Energy', 
        party: 'Democratic',
        cabinet: true,
        department: 'Energy',
        powers: ['energy_policy', 'nuclear']
    },
    secretary_agriculture: { 
        name: 'Tom Vilsack II', 
        role: 'Secretary of Agriculture', 
        party: 'Democratic',
        cabinet: true,
        department: 'Agriculture',
        powers: ['farm_policy', 'nutrition']
    },
    secretary_commerce: { 
        name: 'Gina Raimondo', 
        role: 'Secretary of Commerce', 
        party: 'Democratic',
        cabinet: true,
        department: 'Commerce',
        powers: ['trade', 'census', 'weather']
    },
    secretary_labor: { 
        name: 'Marty Walsh Jr.', 
        role: 'Secretary of Labor', 
        party: 'Democratic',
        cabinet: true,
        department: 'Labor',
        powers: ['workers_rights', 'unemployment']
    },
    secretary_hhs: { 
        name: 'Xavier Becerra', 
        role: 'Secretary of HHS', 
        party: 'Democratic',
        cabinet: true,
        department: 'Health & Human Services',
        powers: ['healthcare', 'medicare', 'public_health']
    },
    secretary_hud: { 
        name: 'Marcia Fudge', 
        role: 'Secretary of HUD', 
        party: 'Democratic',
        cabinet: true,
        department: 'Housing & Urban Development',
        powers: ['housing', 'urban_policy']
    },
    secretary_transportation: { 
        name: 'Pete Buttigieg', 
        role: 'Secretary of Transportation', 
        party: 'Democratic',
        cabinet: true,
        department: 'Transportation',
        powers: ['infrastructure', 'aviation', 'transit']
    },
    secretary_education: { 
        name: 'Miguel Cardona', 
        role: 'Secretary of Education', 
        party: 'Democratic',
        cabinet: true,
        department: 'Education',
        powers: ['education_policy', 'student_loans']
    },
    secretary_veterans: { 
        name: 'Denis McDonough', 
        role: 'Secretary of Veterans Affairs', 
        party: 'Democratic',
        cabinet: true,
        department: 'Veterans Affairs',
        powers: ['veterans_care', 'benefits']
    },
    secretary_homeland: { 
        name: 'Alejandro Mayorkas', 
        role: 'Secretary of Homeland Security', 
        party: 'Democratic',
        cabinet: true,
        department: 'Homeland Security',
        powers: ['security', 'immigration', 'emergency']
    },
    
    // White House Staff
    pressSecretary: { 
        name: 'Karine Jean-Pierre II', 
        role: 'Press Secretary', 
        party: 'Democratic',
        cabinet: false,
        department: 'White House Communications'
    },
    nationalSecurityAdvisor: { 
        name: 'Jake Sullivan Jr.', 
        role: 'National Security Advisor', 
        party: 'Independent',
        cabinet: false,
        department: 'NSC'
    },
    chiefEconomist: { 
        name: 'Cecilia Rouse II', 
        role: 'Chair, Council of Economic Advisers', 
        party: 'Independent',
        cabinet: false,
        department: 'CEA'
    },
};

// ═══════════════════════════════════════════════════════════════════
// JUDICIAL BRANCH
// ═══════════════════════════════════════════════════════════════════

const JUDICIARY = {
    chiefJustice: { 
        name: 'Chief Justice John Roberts III', 
        role: 'Chief Justice', 
        court: 'Supreme Court',
        appointed_by: 'Bush',
        tenure: '2005-present',
        ideology: 'Conservative',
        rulings: { conservative: 62, liberal: 38 }
    },
    justice_1: { 
        name: 'Justice Clarence Thomas', 
        role: 'Associate Justice', 
        court: 'Supreme Court',
        appointed_by: 'Bush',
        tenure: '1991-present',
        ideology: 'Conservative',
        rulings: { conservative: 71, liberal: 29 }
    },
    justice_2: { 
        name: 'Justice Samuel Alito', 
        role: 'Associate Justice', 
        court: 'Supreme Court',
        appointed_by: 'Bush',
        tenure: '2006-present',
        ideology: 'Conservative',
        rulings: { conservative: 68, liberal: 32 }
    },
    justice_3: { 
        name: 'Justice Sonia Sotomayor', 
        role: 'Associate Justice', 
        court: 'Supreme Court',
        appointed_by: 'Obama',
        tenure: '2009-present',
        ideology: 'Liberal',
        rulings: { conservative: 28, liberal: 72 }
    },
    justice_4: { 
        name: 'Justice Elena Kagan', 
        role: 'Associate Justice', 
        court: 'Supreme Court',
        appointed_by: 'Obama',
        tenure: '2010-present',
        ideology: 'Liberal',
        rulings: { conservative: 35, liberal: 65 }
    },
    justice_5: { 
        name: 'Justice Neil Gorsuch', 
        role: 'Associate Justice', 
        court: 'Supreme Court',
        appointed_by: 'Trump',
        tenure: '2017-present',
        ideology: 'Conservative',
        rulings: { conservative: 64, liberal: 36 }
    },
    justice_6: { 
        name: 'Justice Brett Kavanaugh', 
        role: 'Associate Justice', 
        court: 'Supreme Court',
        appointed_by: 'Trump',
        tenure: '2018-present',
        ideology: 'Conservative',
        rulings: { conservative: 59, liberal: 41 }
    },
    justice_7: { 
        name: 'Justice Amy Coney Barrett', 
        role: 'Associate Justice', 
        court: 'Supreme Court',
        appointed_by: 'Trump',
        tenure: '2020-present',
        ideology: 'Conservative',
        rulings: { conservative: 61, liberal: 39 }
    },
    justice_8: { 
        name: 'Justice Ketanji Brown Jackson', 
        role: 'Associate Justice', 
        court: 'Supreme Court',
        appointed_by: 'Biden',
        tenure: '2022-present',
        ideology: 'Liberal',
        rulings: { conservative: 22, liberal: 78 }
    },
};

// ═══════════════════════════════════════════════════════════════════
// LEGISLATION
// ═══════════════════════════════════════════════════════════════════

class HiveCongress {
    constructor() {
        this.dataDir = '/tmp/hive-congress';
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
        
        this.bills = this.loadData('bills');
        this.executiveOrders = this.loadData('orders');
        this.courtCases = this.loadData('cases');
        
        console.log('🏛️ Hive Congress initialized');
        console.log(`   Branches: Legislative, Executive, Judicial`);
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
    // VIEW GOVERNMENT STRUCTURE
    // ═══════════════════════════════════════════════════════════

    viewStructure() {
        console.log('\n🏛️ THE GOVERNMENT\n');
        
        console.log('═'.repeat(60));
        console.log('📜 LEGISLATIVE BRANCH');
        console.log('═'.repeat(60));
        
        console.log('\n  SENATE (Upper House)');
        console.log('  ─────────────────────────────────────────────────');
        console.log('  Leadership:');
        console.log('    • Speaker: Victoria Adams (Independent)');
        console.log('    • Majority Leader: Marcus Hope (Progressive)');
        console.log('    • Minority Leader: Thomas Reed (Conservative)');
        console.log('    • Majority Whip: Unity Carter');
        console.log('    • Minority Whip: Sarah Steel');
        console.log('  ─────────────────────────────────────────────────');
        console.log('  Seats by state (2 per state = 100 total)');
        console.log('    • California: 2 Progressive');
        console.log('    • Texas: 2 Conservative');
        console.log('    • New York: 2 Progressive');
        console.log('    • Alabama: 2 Conservative');
        console.log('    • [48 more states...]');
        
        console.log('\n  HOUSE OF REPRESENTATIVES (Lower House)');
        console.log('  ─────────────────────────────────────────────────');
        console.log('  Leadership:');
        console.log('    • Speaker: Nancy Powers (Progressive)');
        console.log('    • Majority Leader: Steny Hoyer II');
        console.log('    • Minority Leader: Kevin McCarthy Jr.');
        console.log('  ─────────────────────────────────────────────────');
        console.log('  Seats: 435 total');
        console.log('    • Progressive: 218 (majority)');
        console.log('    • Conservative: 217');
        console.log('    • Independent: 0');
        
        console.log('\n  PROCESS: Bill → Senate vote → House vote → President → Law');
        
        console.log('\n' + '═'.repeat(60));
        console.log('⚡ EXECUTIVE BRANCH');
        console.log('═'.repeat(60));
        
        console.log('\n  President & VP:');
        console.log('    • President James Biden Jr. (Democratic) - Approval: 52%');
        console.log('    • Vice President Kamala Singh - Approval: 58%');
        
        console.log('\n  Cabinet (15 Secretaries):');
        console.log('    • State: Antony Blinken II (Foreign Policy)');
        console.log('    • Treasury: Janet Yellen Jr. (Economics)');
        console.log('    • Defense: Lloyd Austin III (Military)');
        console.log('    • Justice: Merrick Garland Jr. (Law)');
        console.log('    • Energy: Jennifer Granholm Jr. (Energy)');
        console.log('    • Agriculture: Tom Vilsack II (Farming)');
        console.log('    • Commerce: Gina Raimondo (Trade)');
        console.log('    • Labor: Marty Walsh Jr. (Workers)');
        console.log('    • HHS: Xavier Becerra (Healthcare)');
        console.log('    • HUD: Marcia Fudge (Housing)');
        console.log('    • Transportation: Pete Buttigieg (Infra)');
        console.log('    • Education: Miguel Cardona (Schools)');
        console.log('    • Veterans: Denis McDonough (Vets)');
        console.log('    • Homeland: Alejandro Mayorkas (Security)');
        
        console.log('\n  White House Staff:');
        console.log('    • Chief of Staff: Ron Klain II');
        console.log('    • Press Secretary: Karine Jean-Pierre II');
        console.log('    • NSA: Jake Sullivan Jr.');
        
        console.log('\n  POWERS: Veto, Pardon, Appointments, treaties, Commander-in-Chief');
        
        console.log('\n' + '═'.repeat(60));
        console.log('⚖️ JUDICIAL BRANCH');
        console.log('═'.repeat(60));
        
        console.log('\n  SUPREME COURT (9 Justices)');
        console.log('    Conservative (6):              Liberal (3):');
        console.log('    • Roberts (Chief)              • Sotomayor');
        console.log('    • Thomas                       • Kagan');
        console.log('    • Alito                        • Jackson');
        console.log('    • Gorsuch');
        console.log('    • Kavanaugh');
        console.log('    • Barrett');
        
        console.log('\n  POWERS: Judicial Review, Constitutional Interpretation');
        console.log('  CASES: ~100-150 per term, landmark decisions bind law');
    }

    // ═══════════════════════════════════════════════════════════
    // BILL LIFECYCLE
    // ═══════════════════════════════════════════════════════════

    introduceBill(title, sponsor, chamber = 'senate') {
        const id = `${chamber === 'senate' ? 'S' : 'H'}.${Date.now()}`;
        
        const bill = {
            id,
            title,
            sponsor,
            chamber, // 'senate' or 'house'
            introduced: Date.now(),
            status: 'introduced',
            passedSenate: false,
            passedHouse: false,
            signedByPresident: false,
            vetoed: false,
            overridden: false,
            struckDown: false,
            law: false,
            steps: [
                { name: 'Introduced', chamber, complete: true },
                { name: 'Senate Vote', chamber: 'senate', complete: false },
                { name: 'House Vote', chamber: 'house', complete: false },
                { name: 'President', chamber: 'executive', complete: false },
            ],
            votes: [],
            amendments: []
        };
        
        this.bills[id] = bill;
        this.saveData('bills', this.bills);
        
        console.log(`\n📜 BILL INTRODUCED: ${id}`);
        console.log(`   Title: ${title}`);
        console.log(`   Sponsor: ${sponsor} (${chamber})`);
        console.log(`   Next: Senate vote`);
        
        return bill;
    }

    voteBill(billId, chamber, votes, threshold) {
        const bill = this.bills[billId];
        if (!bill) { console.log('❌ Bill not found'); return; }
        
        const ayes = votes.aye || 0;
        const nays = votes.nay || 0;
        const result = ayes >= threshold ? 'PASSED' : 'FAILED';
        
        if (chamber === 'senate') {
            bill.passedSenate = result === 'PASSED';
        } else {
            bill.passedHouse = result === 'PASSED';
        }
        
        bill.votes.push({
            chamber,
            ayes,
            nays,
            threshold,
            result,
            time: Date.now()
        });
        
        bill.status = result === 'PASSED' ? `${chamber}_passed` : `${chamber}_failed`;
        this.saveData('bills', this.bills);
        
        console.log(`\n🗳️ ${chamber.toUpperCase()} VOTE: ${id}`);
        console.log(`   Aye: ${ayes} | Nay: ${nays}`);
        console.log(`   Threshold: ${threshold}`);
        console.log(`   Result: ${result}`);
        
        if (result === 'PASSED') {
            if (chamber === 'senate' && !bill.passedHouse) {
                console.log(`   Next: House vote`);
            } else if (chamber === 'house' && !bill.passedSenate) {
                console.log(`   Next: Senate vote`);
            } else {
                console.log(`   Next: President (10 days to sign or veto)`);
            }
        }
    }

    presentToPresident(billId) {
        const bill = this.bills[billId];
        if (!bill) return;
        
        bill.status = 'presidential_review';
        this.saveData('bills', this.bills);
        
        console.log(`\n⚡ BILL SENT TO PRESIDENT: ${billId}`);
        console.log(`   President has 10 days to:`);
        console.log(`   • Sign → Becomes law`);
        console.log(`   • Veto → Returns to Congress`);
        console.log(`   • Pocket veto → After Congress adjourns`);
    }

    presidentialAction(billId, action, reason = '') {
        const bill = this.bills[billId];
        if (!bill) return;
        
        switch (action) {
            case 'sign':
                bill.signedByPresident = true;
                bill.law = true;
                bill.status = 'signed';
                console.log(`\n✍️ PRESIDENT SIGNS: ${billId}`);
                console.log(`   STATUS: IS NOW LAW!`);
                break;
                
            case 'veto':
                bill.vetoed = true;
                bill.status = 'vetoed';
                console.log(`\n⚡ PRESIDENTIAL VETO: ${billId}`);
                console.log(`   Reason: ${reason || 'Policy concerns'}`);
                console.log(`   Override requires: 2/3 in BOTH chambers (67 Senate, 290 House)`);
                break;
                
            case 'pocket':
                bill.vetoed = true;
                bill.pocketVeto = true;
                bill.status = 'pocket_veto';
                console.log(`\n⚡ POCKET VETO: ${billId}`);
                console.log(`   Congress adjourned - veto sticks`);
                break;
        }
        
        this.saveData('bills', this.bills);
    }

    vetoOverride(billId, senateVotes, houseVotes) {
        const bill = this.bills[billId];
        if (!bill) return;
        
        const senateOverride = senateVotes >= 67;
        const houseOverride = houseVotes >= 290;
        
        console.log(`\n🗳️ VETO OVERRIDE VOTE`);
        console.log(`   Senate: ${senateVotes}/67 needed → ${senateOverride ? '✅' : '❌'}`);
        console.log(`   House: ${houseVotes}/290 needed → ${houseOverride ? '✅' : '❌'}`);
        
        if (senateOverride && houseOverride) {
            bill.overridden = true;
            bill.law = true;
            bill.status = 'law_overridden';
            console.log(`   OVERRIDE SUCCEEDS — ${billId} IS NOW LAW!`);
        } else {
            console.log(`   OVERRIDE FAILS — Bill is dead`);
            bill.status = 'dead';
        }
        
        this.saveData('bills', this.bills);
    }

    // ═══════════════════════════════════════════════════════════
    // EXECUTIVE ORDERS
    // ═══════════════════════════════════════════════════════════

    issueExecutiveOrder(title, president, content) {
        const id = `EO-${Date.now()}`;
        
        const order = {
            id,
            title,
            issuedBy: president,
            content,
            issued: Date.now(),
            status: 'active',
            challenged: false,
            struckDown: false
        };
        
        this.executiveOrders[id] = order;
        this.saveData('orders', this.executiveOrders);
        
        console.log(`\n⚡ EXECUTIVE ORDER ISSUED: ${id}`);
        console.log(`   Title: ${title}`);
        console.log(`   President: ${president}`);
        console.log(`   Status: Active`);
        console.log(`   Note: Can be challenged in court`);
        
        return order;
    }

    // ═══════════════════════════════════════════════════════════
    // SUPREME COURT CASES
    // ═══════════════════════════════════════════════════════════

    hearCase(caseName, appellant, appellee, issue) {
        const id = `SCOTUS-${Date.now()}`;
        
        const courtCase = {
            id,
            caseName,
            appellant,
            appellee,
            issue,
            argued: Date.now(),
            decision: null,
            votes: null,
            status: 'pending'
        };
        
        this.courtCases[id] = courtCase;
        this.saveData('cases', this.courtCases);
        
        console.log(`\n⚖️ SUPREME COURT CASE ACCEPTED: ${id}`);
        console.log(`   Case: ${caseName}`);
        console.log(`   Appellant: ${appellant}`);
        console.log(`   Appellee: ${appellee}`);
        console.log(`   Issue: ${issue}`);
        
        return courtCase;
    }

    courtDecision(caseId, decision, majority, minority) {
        const courtCase = this.courtCases[caseId];
        if (!courtCase) return;
        
        courtCase.decision = decision;
        courtCase.votes = { majority, minority };
        courtCase.status = 'decided';
        
        console.log(`\n⚖️ SUPREME COURT DECISION: ${caseId}`);
        console.log(`   Decision: ${decision}`);
        console.log(`   Vote: ${majority}-${minority}`);
        console.log(`   Precedent: ${decision === 'Upheld' ? 'Law/Order stands' : 'Law/Order struck down'}`);
        
        // If struck down, update the related bill
        if (decision === 'Struck Down') {
            console.log(`   ⚠️ AFFECTED LAW MUST BE ADDRESSED BY CONGRESS`);
        }
        
        this.saveData('cases', this.courtCases);
    }

    // ═══════════════════════════════════════════════════════════
    // CABINET MEETINGS
    // ═══════════════════════════════════════════════════════════

    cabinetMeeting(topic, attendees) {
        console.log(`\n�Cabinet Meeting: ${topic}`);
        console.log(`   President: James Biden Jr. (Chair)`);
        console.log(`   Attendees:`);
        
        const present = attendees || Object.keys(EXECUTIVE).filter(k => EXECUTIVE[k].cabinet);
        present.forEach(k => {
            const member = EXECUTIVE[k];
            console.log(`   • ${member.name} (${member.role})`);
        });
        
        console.log(`\n   Discussion points:`);
        console.log(`   • ${topic}`);
        console.log(`   • Related policy implications`);
        console.log(`   • Recommendation to President`);
    }

    // ═══════════════════════════════════════════════════════════
    // IMPEACHMENT
    // ═══════════════════════════════════════════════════════════

    impeachmentProcess(target, charges, chamber = 'house') {
        console.log(`\n⚖️ IMPEACHMENT PROCESS INITIATED`);
        console.log(`   Target: ${target}`);
        console.log(`   Charges: ${charges}`);
        
        console.log(`\n   STEP 1: House vote (simple majority = 218)`);
        console.log(`   STEP 2: Senate trial (2/3 = 67 votes for conviction)`);
        console.log(`   STEP 3: Removal if convicted`);
    }

    // ═══════════════════════════════════════════════════════════
    // TREATIES & APPOINTMENTS
    // ═══════════════════════════════════════════════════════════

    treatyProcess(treatyName, senatorVotes) {
        console.log(`\n📜 TREATY PROCESS: ${treatyName}`);
        console.log(`   Senate advise and consent required`);
        console.log(`   Threshold: 2/3 (67 votes)`);
        console.log(`   Current support: ${senatorVotes}/67`);
        console.log(`   ${senatorVotes >= 67 ? '✅ WOULD PASS' : '❌ WOULD FAIL'}`);
    }

    appointmentProcess(nominee, position, senateVotes) {
        console.log(`\n👤 APPOINTMENT: ${nominee}`);
        console.log(`   Position: ${position}`);
        console.log(`   Senate confirmation required`);
        console.log(`   Threshold: Simple majority (51 votes)`);
        console.log(`   Current support: ${senatorVotes}/51`);
        console.log(`   ${senatorVotes >= 51 ? '✅ WOULD BE CONFIRMED' : '❌ WOULD BE REJECTED'}`);
    }
}

// CLI
const congress = new HiveCongress();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    structure: () => congress.viewStructure(),
    
    // Bills
    bill: () => congress.introduceBill(args.join(' ') || 'New Legislation', 'Speaker', 'senate'),
    bills: () => { console.log('\n📜 BILLS:', JSON.stringify(congress.bills, null, 2)); },
    vote: () => congress.voteBill(args[0], args[1] || 'senate', { aye: parseInt(args[2]) || 60, nay: parseInt(args[3]) || 40 }, parseInt(args[4]) || 51 }),
    present: () => congress.presentToPresident(args[0]),
    sign: () => congress.presidentialAction(args[0], 'sign'),
    veto: () => congress.presidentialAction(args[0], 'veto', args.slice(1).join(' ')),
    override: () => congress.vetoOverride(args[0], parseInt(args[1]) || 60, parseInt(args[2]) || 250),
    
    // Executive
    eo: () => congress.issueExecutiveOrder(args.join(' ') || 'Executive Order', 'President James Biden Jr.', 'Content here'),
    
    // Court
    case: () => congress.hearCase(args[0] || 'Marbury v. Madison', 'Appellant', 'Appellee', 'Constitutional Issue'),
    decision: () => congress.courtDecision(args[0], args[1] || 'Upheld', parseInt(args[2]) || 6, parseInt(args[3]) || 3),
    
    // Cabinet
    cabinet: () => congress.cabinetMeeting(args.join(' ') || 'National Priority'),
    
    // Other
    impeachment: () => congress.impeachmentProcess(args[0] || 'Official', args.slice(1).join(' ') || 'High crimes'),
    treaty: () => congress.treatyProcess(args.join(' ') || 'Trade Agreement', parseInt(args[0]) || 55),
    appointment: () => congress.appointmentProcess(args[0] || 'Nominee', args[1] || 'Secretary', parseInt(args[2]) || 55),
    
    help: () => console.log(`
🏛️ Hive Congress Commands

STRUCTURE:
  structure              View full government structure

BILLS:
  bill <title>           Introduce bill (Senate)
  vote <id> <chamber> <aye> <nay> <threshold>  Vote on bill
  present <id>            Send to President
  sign <id>               President signs
  veto <id> <reason>      Presidential veto
  override <id> <senate> <house>  Veto override

EXECUTIVE:
  eo <title>              Issue executive order

COURT:
  case <name>             Accept Supreme Court case
  decision <id> <ruling> <majority> <minority>  Court decision

CABINET:
  cabinet <topic>         Hold cabinet meeting

OTHER:
  impeachment <official> <charges>  Impeachment
  treaty <name> <votes>  Treaty process
  appointment <name> <pos> <votes>  Appointment confirmation
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveCongress, SENATORS, HOUSE_MEMBERS, EXECUTIVE, JUDICIARY };
