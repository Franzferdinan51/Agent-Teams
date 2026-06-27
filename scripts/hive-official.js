#!/usr/bin/env node
/**
 * HiveGov Officials — Complete Government Roster
 * 
 * Production-ready roster of all government officials.
 * Duck/bee/lobster names for fun, positions are REAL.
 */

const OFFICIALS = {
    // ═══════════════════════════════════════════════════════════
    // EXECUTIVE BRANCH
    // ═══════════════════════════════════════════════════════════
    executive: {
        branch: "Executive",
        description: "Enforces laws, commands military, conducts foreign policy",
        officials: [
            {
                position: "President",
                name: "Quackford McDuck",
                species: "Duck",
                tenure: "2024-present",
                elected: true,
                succession: null,
                duties: ["Commander in Chief", "Signs legislation", "Appoints officials", "Foreign affairs"]
            },
            {
                position: "Vice President",
                name: "Lobster Loxington III",
                species: "Lobster",
                tenure: "2024-present",
                elected: true,
                succession: 1,
                duties: ["Presides over Senate", "Tie-breaking votes", "Succession"]
            },
            {
                position: "Chief of Staff",
                name: "Beekeeper Klain",
                species: "Bee",
                tenure: "2024-present",
                elected: false,
                appointed_by: "President",
                duties: ["White House operations", "Policy coordination"]
            },
            {
                position: "Press Secretary",
                name: "Pollinator Jean-Pierre",
                species: "Bee",
                tenure: "2024-present",
                elected: false,
                appointed_by: "President",
                duties: ["Press relations", "Public communications"]
            },
            {
                position: "National Security Advisor",
                name: "Honeycomb Sullivan",
                species: "Bee",
                tenure: "2024-present",
                elected: false,
                appointed_by: "President",
                duties: ["National security", "Foreign policy advice"]
            }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // CABINET
    // ═══════════════════════════════════════════════════════════
    cabinet: {
        branch: "Executive",
        description: "Heads of executive departments, advise President",
        officials: [
            { position: "Secretary of State", name: "Flutter Blinken", species: "Bee", duties: ["Foreign affairs", "Diplomacy", "Treaties"] },
            { position: "Secretary of Treasury", name: "Goldenseal Yellen", species: "Bee", duties: ["Economy", "Finance", "Currency"] },
            { position: "Secretary of Defense", name: "Armorwing Austin", species: "Bee", duties: ["Military", "National security"] },
            { position: "Attorney General", name: "Stingray Garland", species: "Fish", duties: ["Justice", "Law enforcement", "Legal advice"] },
            { position: "Secretary of the Interior", name: "Prairieflower Haaland", species: "Flower", duties: ["Lands", "Natural resources", "Tribal affairs"] },
            { position: "Secretary of Agriculture", name: "Farmer Vilsack", species: "Duck", duties: ["Farming", "Food", "Rural development"] },
            { position: "Secretary of Commerce", name: "Hivelight Raimondo", species: "Bee", duties: ["Trade", "Economy", "Census"] },
            { position: "Secretary of Labor", name: "Buzzard Walsh", species: "Bird", duties: ["Workers", "Employment", "Wages"] },
            { position: "Secretary of Health and Human Services", name: "Wingdoc Becerra", species: "Bee", duties: ["Healthcare", "Public health", "Social services"] },
            { position: "Secretary of Housing and Urban Development", name: "Comby Fudge", species: "Bear", duties: ["Housing", "Urban development"] },
            { position: "Secretary of Transportation", name: "Propeller Pete", species: "Bee", duties: ["Infrastructure", "Transportation", "Aviation"] },
            { position: "Secretary of Energy", name: "Solarpollen Granholm", species: "Flower", duties: ["Energy", "Nuclear", "Science"] },
            { position: "Secretary of Education", name: "Learnbee Cardona", species: "Bee", duties: ["Schools", "Universities", "Student aid"] },
            { position: "Secretary of Veterans Affairs", name: "Wingman McDonough", species: "Bee", duties: ["Veterans", "Benefits", "Healthcare"] },
            { position: "Secretary of Homeland Security", name: "Hiveguardian Mayorkas", species: "Bee", duties: ["Security", "Immigration", "Emergency"] }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // LEGISLATIVE BRANCH - SENATE
    // ═══════════════════════════════════════════════════════════
    senate: {
        branch: "Legislative",
        description: "Upper house, confirms appointments, ratifies treaties",
        leadership: [
            { position: "President Pro Tempore", name: "Honks McQuackface", species: "Duck", state: "California" },
            { position: "Majority Leader", name: "Bee Lightwing", species: "Bee", state: "California", party: "Worker Bee" },
            { position: "Minority Leader", name: "Lobster Stinger", species: "Lobster", state: "Texas", party: "Drone Party" },
            { position: "Majority Whip", name: "Flutterwing Carter", species: "Butterfly", state: "Georgia" },
            { position: "Minority Whip", name: "Stinger McAngry", species: "Bee", state: "Florida" }
        ],
        committees: [
            { name: "Foreign Relations", chair: "Senator Necthar Kim", ranking: "Senator Coldclaw Reed" },
            { name: "Finance", chair: "Senator Goldbeak Wyden", ranking: "Senator Shellback Crapo" },
            { name: "Judiciary", chair: "Senator Petalmaster Durbin", ranking: "Senator Hardshell Grassley" },
            { name: "Appropriations", chair: "Senator Honeycomb Murray", ranking: "Senator Clawson Collins" },
            { name: "Armed Services", chair: "Senator Armorjack Reed", ranking: "Senator Wingleader Roger" }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // LEGISLATIVE BRANCH - HOUSE
    // ═══════════════════════════════════════════════════════════
    house: {
        branch: "Legislative",
        description: "Lower house, initiates revenue bills, impeachments",
        leadership: [
            { position: "Speaker", name: "Queen B. Johnson", species: "Queen Bee", state: "California" },
            { position: "Majority Leader", name: "Fuzzwell Jeffries", species: "Bear", state: "New York" },
            { position: "Minority Leader", name: "Lord Anennomus McCarthy", species: "Duck", state: "California" }
        ],
        committees: [
            { name: "Ways and Means", chair: "Representative Blossom Smith", ranking: "Representative Shellback Smith" },
            { name: "Appropriations", chair: "Representative Deweet Lee", ranking: "Representative Calwherring Simpson" },
            { name: "Judiciary", chair: "Representative Pollinator Jordan", ranking: "Representative Stinger Jordan" },
            { name: "Oversight", chair: "Representative Combee Comer", ranking: "Representative Buzzzzzzer Gaetz" }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // JUDICIAL BRANCH
    // ═══════════════════════════════════════════════════════════
    judiciary: {
        branch: "Judicial",
        description: "Interprets laws, constitutional review, case precedents",
        supremeCourt: [
            { position: "Chief Justice", name: "Hexagon Roberts III", species: "Hexagon", appointed_by: "President Quackford", tenure: "2015-present", ideology: "Centrist" },
            { position: "Associate Justice", name: "Oldbeak Thomas", species: "Duck", appointed_by: "President Quackford", tenure: "2011-present", ideology: "Conservative" },
            { position: "Associate Justice", name: "Flowerpot Alito", species: "Flower", appointed_by: "President Quackford", tenure: "2016-present", ideology: "Conservative" },
            { position: "Associate Justice", name: "Blossom Sotomayor", species: "Flower", appointed_by: "President Honeybeak", tenure: "2019-present", ideology: "Liberal" },
            { position: "Associate Justice", name: "Petalmaster Kagan", species: "Flower", appointed_by: "President Honeybeak", tenure: "2020-present", ideology: "Liberal" },
            { position: "Associate Justice", name: "Buzzkill Gorsuch", species: "Bee", appointed_by: "President Quackford", tenure: "2027-present", ideology: "Conservative" },
            { position: "Associate Justice", name: "Stinger Kavanaugh", species: "Bee", appointed_by: "President Quackford", tenure: "2028-present", ideology: "Conservative" },
            { position: "Associate Justice", name: "Honeycomb Barrett", species: "Honeycomb", appointed_by: "President Quackford", tenure: "2030-present", ideology: "Conservative" },
            { position: "Associate Justice", name: "Dandelion Jackson", species: "Flower", appointed_by: "President Honeycomb", tenure: "2032-present", ideology: "Liberal" }
        ],
        circuitCourts: [
            { circuit: "DC Circuit", chief: "Honeycomb Howell" },
            { circuit: "First Circuit", chief: "Lobsterhead Lynch" },
            { circuit: "Second Circuit", chief: "Beemenu Menashi" },
            { circuit: "Third Circuit", chief: "Bibber Bibera" },
            { circuit: "Fourth Circuit", chief: "Necthar Richardson" }
        ]
    },

    // ═══════════════════════════════════════════════════════════
    // INDEPENDENT AGENCIES
    // ═══════════════════════════════════════════════════════════
    agencies: {
        branch: "Independent",
        description: "Regulatory and oversight bodies",
        officials: [
            { agency: "Federal Reserve", head: "Chair Powell", role: "Monetary policy" },
            { agency: "SEC", head: "Chair Gensler", role: "Securities regulation" },
            { agency: "Federal Communications Commission", head: "Chair Rosenworcel", role: "Communications" },
            { agency: "Federal Trade Commission", head: "Chair Khan", role: "Competition protection" },
            { agency: "Central Intelligence Agency", head: "Director Burns", role: "Foreign intelligence" },
            { agency: "Federal Bureau of Investigation", head: "Director Wray", role: "Domestic law enforcement" },
            { agency: "National Aeronautics and Space Administration", head: "Administrator Nelson", role: "Space exploration" },
            { agency: "Environmental Protection Agency", head: "Administrator Regan", role: "Environmental protection" }
        ]
    }
};

// ═══════════════════════════════════════════════════════════════════
// OFFICIAL LOOKUP SYSTEM
// ═══════════════════════════════════════════════════════════════════

class HiveOfficials {
    constructor() {
        this.officials = OFFICIALS;
    }

    viewAll() {
        console.log('\n' + '='.repeat(70));
        console.log('HIVE NATION GOVERNMENT ROSTER');
        console.log('='.repeat(70));

        this.viewExecutive();
        this.viewCabinet();
        this.viewSenate();
        this.viewHouse();
        this.viewJudiciary();
        this.viewAgencies();
    }

    viewExecutive() {
        console.log('\n' + '-'.repeat(70));
        console.log('EXECUTIVE BRANCH');
        console.log('-'.repeat(70));
        console.log('\n' + this.officials.executive.description);

        for (const o of this.officials.executives.officials || this.officials.executive.officials) {
            console.log(`\n  ${o.position}`);
            console.log(`    ${o.name} (${o.species})`);
            if (o.elected) console.log(`    Elected: ${o.tenure}`);
            else console.log(`    Appointed by: ${o.appointed_by}`);
            console.log(`    Duties: ${o.duties.join(', ')}`);
        }
    }

    viewCabinet() {
        console.log('\n' + '-'.repeat(70));
        console.log('CABINET');
        console.log('-'.repeat(70));
        console.log('\n' + this.officials.cabinet.description);

        for (const o of this.officials.cabinet.officials) {
            console.log(`\n  ${o.position}`);
            console.log(`    ${o.name} (${o.species})`);
            console.log(`    Duties: ${o.duties.join(', ')}`);
        }
    }

    viewSenate() {
        console.log('\n' + '-'.repeat(70));
        console.log('SENATE (Upper House)');
        console.log('-'.repeat(70));
        console.log('\n' + this.officials.senate.description);

        console.log('\n  Leadership:');
        for (const l of this.officials.senate.leadership) {
            console.log(`    ${l.position}: ${l.name} (${l.species}) - ${l.state}`);
        }

        console.log('\n  Standing Committees:');
        for (const c of this.officials.senate.committees) {
            console.log(`    ${c.name}`);
            console.log(`      Chair: ${c.chair}`);
            console.log(`      Ranking: ${c.ranking}`);
        }
    }

    viewHouse() {
        console.log('\n' + '-'.repeat(70));
        console.log('HOUSE OF REPRESENTATIVES (Lower House)');
        console.log('-'.repeat(70));
        console.log('\n' + this.officials.house.description);

        console.log('\n  Leadership:');
        for (const l of this.officials.house.leadership) {
            console.log(`    ${l.position}: ${l.name} (${l.species}) - ${l.state}`);
        }

        console.log('\n  Standing Committees:');
        for (const c of this.officials.house.committees) {
            console.log(`    ${c.name}`);
            console.log(`      Chair: ${c.chair}`);
            console.log(`      Ranking: ${c.ranking}`);
        }
    }

    viewJudiciary() {
        console.log('\n' + '-'.repeat(70));
        console.log('JUDICIAL BRANCH');
        console.log('-'.repeat(70));
        console.log('\n' + this.officials.judiciary.description);

        console.log('\n  SUPREME COURT:');
        for (const j of this.officials.judiciary.supremeCourt) {
            console.log(`\n    ${j.position}: ${j.name}`);
            console.log(`      ${j.ideology} | Appointed: ${j.appointed_by} | ${j.tenure}`);
        }

        console.log('\n  CIRCUIT COURTS:');
        for (const c of this.officials.judiciary.circuitCourts) {
            console.log(`    ${c.circuit}: Chief Judge ${c.chief}`);
        }
    }

    viewAgencies() {
        console.log('\n' + '-'.repeat(70));
        console.log('INDEPENDENT AGENCIES');
        console.log('-'.repeat(70));
        console.log('\n' + this.officials.agencies.description);

        for (const a of this.officials.agencies.officials) {
            console.log(`\n    ${a.agency}`);
            console.log(`      ${a.head} — ${a.role}`);
        }
    }

    lookupPosition(position) {
        const p = position.toLowerCase();

        // Search all branches
        for (const [branch, data] of Object.entries(this.officials)) {
            if (data.officials) {
                const found = data.officials.find(o => 
                    o.position.toLowerCase().includes(p)
                );
                if (found) return { ...found, branch };
            }
            if (data.leadership) {
                const found = data.leadership.find(o => 
                    o.position.toLowerCase().includes(p)
                );
                if (found) return { ...found, branch };
            }
            if (data.supremeCourt) {
                const found = data.supremeCourt.find(o => 
                    o.position.toLowerCase().includes(p)
                );
                if (found) return { ...found, branch };
            }
            if (data.committees) {
                for (const c of data.committees) {
                    if (c.chair.toLowerCase().includes(p) || c.name.toLowerCase().includes(p)) {
                        return { ...c, branch, type: 'committee' };
                    }
                }
            }
            if (data.officials) {
                const found = data.officials.find(o => 
                    o.agency?.toLowerCase().includes(p) || o.head?.toLowerCase().includes(p)
                );
                if (found) return { ...found, branch };
            }
        }

        return null;
    }

    lookup(query) {
        const result = this.lookupPosition(query);

        if (!result) {
            console.log(`No official found for: ${query}`);
            return;
        }

        console.log('\n' + '='.repeat(70));
        console.log('OFFICIAL LOOKUP');
        console.log('='.repeat(70));
        console.log(`\nQuery: ${query}`);
        console.log(`\nBranch: ${result.branch}`);
        console.log(`Position: ${result.position || result.name}`);

        if (result.type === 'committee') {
            console.log(`Committee: ${result.name}`);
            console.log(`Chair: ${result.chair}`);
            console.log(`Ranking Member: ${result.ranking}`);
        } else {
            if (result.name) console.log(`Name: ${result.name}`);
            if (result.species) console.log(`Species: ${result.species}`);
            if (result.state) console.log(`State: ${result.state}`);
            if (result.party) console.log(`Party: ${result.party}`);
            if (result.ideology) console.log(`Ideology: ${result.ideology}`);
            if (result.tenure) console.log(`Tenure: ${result.tenure}`);
            if (result.appointed_by) console.log(`Appointed by: ${result.appointed_by}`);
            if (result.duties) console.log(`Duties: ${result.duties.join(', ')}`);
        }
    }

    lookupByName(name) {
        const n = name.toLowerCase();

        for (const [branch, data] of Object.entries(this.officials)) {
            const all = [
                ...(data.officials || []),
                ...(data.leadership || []),
                ...(data.supremeCourt || []),
                ...(data.committees || []).flatMap(c => [c.chair, c.ranking].map(x => ({ name: x })))
            ];

            const found = all.find(o => o.name?.toLowerCase().includes(n));
            if (found) {
                console.log('\n' + '='.repeat(70));
                console.log('NAME LOOKUP');
                console.log('='.repeat(70));
                console.log(`\nName: ${found.name}`);
                console.log(`Branch: ${branch}`);
                if (found.position) console.log(`Position: ${found.position}`);
                if (found.state) console.log(`State: ${found.state}`);
                if (found.ideology) console.log(`Ideology: ${found.ideology}`);
                return;
            }
        }

        console.log(`No official found with name: ${name}`);
    }

    listPositions() {
        console.log('\n' + '='.repeat(70));
        console.log('ALL POSITIONS');
        console.log('='.repeat(70));

        console.log('\nEXECUTIVE:');
        for (const o of this.officials.executive.officials) {
            console.log(`  ${o.position}: ${o.name}`);
        }

        console.log('\nCABINET:');
        for (const o of this.officials.cabinet.officials) {
            console.log(`  ${o.position}: ${o.name}`);
        }

        console.log('\nSENATE LEADERSHIP:');
        for (const l of this.officials.senate.leadership) {
            console.log(`  ${l.position}: ${l.name}`);
        }

        console.log('\nHOUSE LEADERSHIP:');
        for (const l of this.officials.house.leadership) {
            console.log(`  ${l.position}: ${l.name}`);
        }

        console.log('\nSUPREME COURT:');
        for (const j of this.officials.judiciary.supremeCourt) {
            console.log(`  ${j.position}: ${j.name}`);
        }
    }
}

// CLI
const hive = new HiveOfficials();
const cmd = process.argv[2];
const arg = process.argv.slice(3).join(' ');

const commands = {
    all: () => hive.viewAll(),
    executive: () => hive.viewExecutive(),
    cabinet: () => hive.viewCabinet(),
    senate: () => hive.viewSenate(),
    house: () => hive.viewHouse(),
    judiciary: () => hive.viewJudiciary(),
    agencies: () => hive.viewAgencies(),
    lookup: () => hive.lookup(arg),
    name: () => hive.lookupByName(arg),
    positions: () => hive.listPositions(),
    help: () => console.log(`
HiveGov Officials Commands

  all              View complete roster
  executive        View executive branch
  cabinet          View cabinet members
  senate           View senate leadership
  house            View house leadership
  judiciary        View judicial branch
  agencies         View independent agencies
  
  lookup <pos>    Look up by position (e.g., "Secretary of State")
  name <name>     Look up by name
  positions       List all positions
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveOfficials, OFFICIALS };
