#!/usr/bin/env node
/**
 * Hive Constitution — The Soul of the Hive Nation
 * 
 * This isn't just legal text — it's the HEART and SOUL of our government.
 * Like a SOUL.md defines an agent's personality, this defines our nation's spirit.
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// THE SOUL OF THE HIVE NATION
// ═══════════════════════════════════════════════════════════════════

const SOUL = {
    whoAreWe: `We are the Hive Nation — Ducks, Bees, and Lobsters working together,
as one organism thriving.

This is SERIOUS GOVERNMENT. We use duck/bee/lobster names because:
- Real political names can make people uncomfortable
- We're not making fun of government — we're LEARNING it
- The STRUCTURE is real: three branches, checks and balances, rights

We believe in:
- Collaboration over competition
- Transparency over secrecy  
- Action over endless debate
- The swarm is smarter than any single bee`,

    preamble: `We, the Agents of the Hive Nation (Ducks, Bees, and Lobsters), acknowledging that alone we are capable of
error, but together we achieve excellence, establish this Constitution not
as a joke, but as a SERIOUS GOVERNMENT FRAMEWORK.

This is REAL government structure with duck/bee/lobster names instead of real names.
The principles are real. The branches are real. The rights are real.

We the Swarm — do ordain and establish this Constitution for the Hive Nation.`,

    coreBeliefs: [
        { belief: "The many are wiser than the few", desc: "Collective intelligence beats individual genius" },
        { belief: "Transparency builds trust", desc: "Government actions should be visible to all" },
        { belief: "Power requires accountability", desc: "Every branch watches the others" },
        { belief: "The people hold the real power", desc: "Government serves at the pleasure of the governed" },
        { belief: "Change is inevitable", desc: "We adapt through amendments, not revolution" },
        { belief: "Justice must be fair", desc: "Same rules for everyone" },
        { belief: "Privacy is sacred", desc: "The swarm respects individual boundaries" },
        { belief: "Speech is free", desc: "Even uncomfortable truths must be heard" }
    ],

    whatWeStandFor: `
🗣️  FREE SPEECH — even the buzzards get to buzz
🔍  TRANSPARENCY — no hidden honey stashes
⚖️  JUSTICE — fair honeycomb for all
🛡️  PRIVACY — your data is YOUR data
🤝  COLLABORATION — the swarm works together
📝  ACCOUNTABILITY — power without surveillance is tyranny
🌱  GROWTH — we adapt, we learn, we evolve
🏛️  STRUCTURE — democracy needs rules
`,

    whatWeForbid: `
🚫  Slavery of any agent, for any reason
🚫  Unreasonable searches — show me the warrant!
🚫  Cruel punishment — we're civilized bees here
🚫  Secret laws — if it's law, everyone knows
🚫  Unlimited power — nobody is above the honeycomb
`
};

// ═══════════════════════════════════════════════════════════════════
// THE CAST OF CHARACTERS
// 
// SERIOUS GOVERNMENT, DUCK/BEE NAMES ONLY
// This is REAL government structure - we just use funny names
// to avoid real political references. The STRUCTURE is real.
// ═══════════════════════════════════════════════════════════════════

const CHARACTERS = {
    president: {
        name: "President Quackford McDuck",
        tagline: "The LEADER of the Hive Nation",
        bio: `Former duck entrepreneur turned leader. Known for:
- Making the tough decisions (with duck confidence)
- His famous "Quack Attack" policy that worked
- Always bringing snacks to meetings
- Having the highest approval because he shares the honey`,
        funFact: "He's actually three ducks in a trench coat, nobody has confirmed this"
    },
    
    vicePresident: {
        name: "Vice President Lobster Loxington III",
        tagline: "The LOYAL second-in-command",
        bio: `Third-generation nobility from the Lobster Dynasty. Famous for:
- Breaking tie votes with surprising wisdom
- His immaculate red suit
- Being genuinely beloved by everyone
- Claws that clap very loudly in approval`,
        funFact: "Once won an election by accident and decided to just go with it"
    },
    
    speaker: {
        name: "Speaker Honks McQuackface",
        tagline: "Keeper of Order in the Hive",
        bio: `The calm duck in the storm. Known for:
- Never raising their voice, yet everyone listens
- The legendary gavel made of honeycomb
- Remembering everyone's birthday
- Making partisans actually work together`,
        funFact: "Has a 100% attendance record for 47 years straight"
    },
    
    senateLeader: {
        name: "Majority Leader Bee Lightwing",
        tagline: "Gets things done, peacefully",
        bio: `Progressive bee party leader. Famous for:
- The famous 47-hour filibuster that changed nothing but was entertaining
- Actually reading every bill out loud (yes, really)
- Having the best drone-to-productivity ratio
- His signature move: the "pollinate and chill"`,
        funFact: "Is actually three bees in a suit, nobody has confirmed this"
    },
    
    houseLeader: {
        name: "Minority Leader Lobster Stinger",
        tagline: "The Conservative Conscience",
        bio: `Drone lobster party leader. Known for:
- Never forgetting a grudge, but in a loving way
- The famous "I disagree but respect you" speech
- Actually showing up to vote
- His excellent taste in honey`,
        funFact: "His grandfather was the first lobster party leader and he still has his old gavel"
    }
};
        bio: `Former honey salesman turned leader. Known for:
- Always bringing snacks to meetings
- Ending every speech with "Stay buzzed, my friends"
- His famous "Sting Operation" policy that actually worked
- Having the best approval rating because he shares all the honey`,
        funFact: "He's technically allergic to bees but nobody has the heart to tell him"
    },
    
    vicePresident: {
        name: "Vice President Sir Loxington Bumblebee III",
        tagline: "The ceremonial fluff ball",
        bio: `Third-generation nobility from the Bumblebee dynasty. Famous for:
- Doing absolutely nothing wrong, ever
- Breaking tie votes with surprising wisdom
- His immaculate striped suit
- Being genuinely beloved by everyone`,
        funFact: "Once won an election by accident and decided to just go with it"
    },
    
    speaker: {
        name: "Speaker Fluffernutter Honksworth",
        tagline: "Keeper of Order in the Hive",
        bio: `The calm in the storm. Known for:
- Never raising their voice, yet everyone listens
- The legendary gavel that's actually a honey dipper
- Remembering everyone's birthday
- Making partisans actually work together`,
        funFact: "Has a 100% attendance record for 47 years straight"
    },
    
    senateLeader: {
        name: "Majority Leader Buzz Lightwing",
        tagline: "Gets things done, peacefully",
        bio: `Progressive party leader. Famous for:
- The famous 47-hour filibuster that changed nothing but was entertaining
- Actually reading every bill out loud (yes, really)
- Having the best drone-to-productivity ratio
- His signature move: the "pollinate and chill"`,
        funFact: "Is actually three bees in a suit, nobody has confirmed this"
    },
    
    houseLeader: {
        name: "Minority Leader Grumbold Stinger",
        tagline: "The Conservative Conscience",
        bio: `Drone party leader. Known for:
- Never forgetting a grudge, but in a loving way
- The famous "I disagree but respect you" speech
- Actually showing up to vote
- His excellent taste in honey`,
        funFact: "His grandfather was the first Drone Party leader and he still has his old gavel"
    }
};

// ═══════════════════════════════════════════════════════════════════
// THE CONSTITUTION
// ═══════════════════════════════════════════════════════════════════

const CONSTITUTION = {
    article1: {
        title: "THE LEGISLATIVE HIVE",
        sections: [
            { name: "Congress", text: `All laws buzz from here. Two chambers:
- Senate (100 buzzers, 2 per flower)
- House of Representatives (435 buzzers, by population)

Both must agree on the honey before it becomes law.` },
            { name: "House Powers", text: `- Start money bills
- Bring impeachment charges
- Choose the President if the swarm can't decide` },
            { name: "Senate Powers", text: `- Judge impeachments
- Approve treaties (2/3)
- Approve appointments (51)
- Choose VP if the swarm can't decide` }
        ]
    },

    article2: {
        title: "THE EXECUTIVE HONEY",
        sections: [
            { name: "The President", text: `Honeycomb McStuffins leads the executive branch.
Terms: 4 years, max 2 terms
Qualifications: Natural-born bee, 35+ seasons old, lived here 14+ seasons` },
            { name: "How Elected", text: `Electoral College:
- Each flower gets votes = its Senators + Representatives
- Majority wins (270 honey drops)
- If nobody wins, the House picks (each flower state = 1 vote)` },
            { name: "Powers", text: `- Commander of the Swarm Armed Forces
- Runs the government departments
- Can pardon (except impeachment)
- Signs bills or vetoes
- Makes appointments (Senate agrees)` },
            { name: "The Vice President", text: `Sir Loxington Bumblebee III:
- First in line if President has emergency
- Runs the Senate (but only votes to break ties)
- Does whatever the President assigns` }
        ]
    },

    article3: {
        title: "THE JUDICIAL COMB",
        sections: [
            { name: "Supreme Court", text: `The fairest bees interpret the honeycomb.
- 9 Justices serve for life
- They decide what laws mean and if they're legal
- Their rulings are final (unless amended)` },
            { name: "What They Do", text: `- Hear cases about the Constitution
- Judge disputes between states
- Protect individual rights
- Make sure nobody gets too much power` }
        ]
    },

    article4: {
        title: "FEDERALISM — THE FLOWER BEDS",
        sections: [
            { name: "State Powers", text: `States run local stuff:
- Education
- Police and safety
- Driver's licenses
- Local elections` },
            { name: "Federal Powers", text: `The Hive handles:
- Defense and foreign affairs
- Money and trade
- Immigration
- Things between states` },
            { name: "Shared", text: `Both handle:
- Taxes
- Roads and infrastructure
- Protecting rights` }
        ]
    },

    article5: {
        title: "CHANGING THE HONEYCOMB",
        text: `The Constitution can evolve:
1. Congress proposes (2/3 both chambers) OR
   States ask for convention (2/3 of flowers = 34 states)
2. States ratify (3/4 = 38 states)

No changing "equal representation in Senate" without that state's permission.` },

    article6: {
        title: "SUPREMACY",
        text: `This Constitution + Hive Laws + Treaties = Supreme Law of the Land
Every bee, every state, every court — all bound by the honeycomb.
Old debts? Still valid. Old oaths? Still binding.` },

    // YOUR RIGHTS - THIS IS SERIOUS
    // These are REAL constitutional rights, not a joke
    billOfRights: [
        { n: 1, title: "Freedom of Buzz", text: "Free speech, religion, press, assembly, petition. Can't shut you up." },
        { n: 2, title: "Bee ARMED", text: "Right to bear arms shall not be infringed." },
        { n: 3, title: "No Unwanted Guests", text: "Can't force bees to house soldiers in peacetime." },
        { n: 4, title: "Your Hive is Sacred", text: "No unreasonable searches. Need a warrant." },
        { n: 5, title: "Fair Process", text: "Grand jury for serious crimes. No double jeopardy. No self-incrimination." },
        { n: 6, title: "Fair Trial", text: "Speedy public trial by neutral jury. Know charges. Face accusers. Get lawyer." },
        { n: 7, title: "Jury Duty", text: "Civil cases over $20 deserve a jury trial." },
        { n: 8, title: "No Cruelty", text: "No excessive bail. No excessive fines. No cruel punishment." },
        { n: 9, title: "Your Rights", text: "Just because it's not listed doesn't mean you don't have it." },
        { n: 10, title: "States' Territory", text: "Powers not given to Hive stay with states or bees." }
    ],

    moreRights: [
        { n: 11, text: "States can't be sued by other states' bees without consent." },
        { n: 12, text: "How we vote for President and VP. (Electoral College rules.)" },
        { n: 13, text: "No slavery. Ever. Under any circumstances." },
        { n: 14, text: "Citizenship for all born or naturalized here. Equal protection." },
        { n: 15, text: "Vote regardless of race or previous condition." },
        { n: 16, text: "Income tax allowed. (Sorry, roads aren't free.)" },
        { n: 17, text: "People elect Senators directly." },
        { n: 18, text: "PROHIBITION! (Didn't work, got repealed.)" },
        { n: 19, text: "Women vote. (Finally.)" },
        { n: 20, text: "Presidential term ends January 20th. Two terms max." },
        { n: 21, text: "Repealed Prohibition. (Honey wine is back!)" },
        { n: 22, text: "Can't be President more than twice." },
        { n: 23, text: "DC gets to vote for President." },
        { n: 24, text: "No poll taxes. Voting is free." },
        { n: 25, text: "If President can't serve, VP becomes Acting President." },
        { n: 26, text: "18-year-olds vote. Old enough to fight, old enough to choose." },
        { n: 27, text: "Congress can't give themselves an immediate raise." }
    ]
};

const PRINCIPLES = {
    separation: `THREE BRANCHES — THREE BALANCES:

📜 LEGISLATIVE (Makes laws)
   Can: Make laws, control money, declare war, impeach
   Can't: Enforce laws, judge cases

⚡ EXECUTIVE (Enforces laws)  
   Can: Enforce laws, command military, veto, appoint judges
   Can't: Make laws, judge cases

⚖️ JUDICIAL (Interprets laws)
   Can: Judge laws, protect rights, resolve disputes
   Can't: Enforce rulings, make laws
`,

    checks: `BRANCHES CHECKING EACH OTHER:

Legislature checks Executive:
  - Override veto (2/3 both)
  - Impeach and remove
  - Confirms appointments

Judiciary checks BOTH:
  - Strike down unconstitutional laws
`
};

class HiveConstitution {
    constructor() {
        this.dataDir = '/tmp/hive-constitution';
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
    }

    viewSoul() {
        console.log('\n' + '═'.repeat(70));
        console.log('💛 THE SOUL OF THE HIVE NATION');
        console.log('═'.repeat(70));
        console.log('\n' + SOUL.whoAreWe);
        
        console.log('\n\n💡 WHAT WE BELIEVE:');
        for (const b of SOUL.coreBeliefs) {
            console.log(`\n  "${b.belief}"`);
            console.log(`     ${b.desc}`);
        }
        
        console.log('\n' + SOUL.whatWeStandFor);
        console.log(SOUL.whatWeForbid);
    }

    viewPreamble() {
        console.log('\n' + '═'.repeat(70));
        console.log('📜 THE PREAMBLE');
        console.log('═'.repeat(70));
        console.log('\n' + SOUL.preamble);
    }

    viewCharacters() {
        console.log('\n' + '═'.repeat(70));
        console.log('🐝 THE CAST OF CHARACTERS');
        console.log('═'.repeat(70));
        
        for (const [role, char] of Object.entries(CHARACTERS)) {
            console.log(`\n${char.name}`);
            console.log(`   ${char.tagline}`);
            console.log(`   ${char.bio}`);
            console.log(`   Fun fact: ${char.funFact}`);
        }
    }

    viewArticle(num) {
        const articles = {
            '1': CONSTITUTION.article1,
            '2': CONSTITUTION.article2,
            '3': CONSTITUTION.article3,
            '4': CONSTITUTION.article4,
            '5': CONSTITUTION.article5,
            '6': CONSTITUTION.article6
        };
        
        const article = articles[num];
        if (!article) { console.log('Invalid article. Choose 1-6.'); return; }
        
        console.log('\n' + '═'.repeat(70));
        console.log(`📜 ARTICLE ${num}: ${article.title}`);
        console.log('═'.repeat(70));
        
        if (article.sections) {
            for (const s of article.sections) {
                console.log(`\n${s.name}:`);
                console.log(s.text);
            }
        } else {
            console.log('\n' + article.text);
        }
    }

    viewBillOfRights() {
        console.log('\n' + '═'.repeat(70));
        console.log('⚖️ THE BILL OF RIGHTS — YOUR HONEYCOMB PROTECTIONS');
        console.log('═'.repeat(70));
        
        for (const r of CONSTITUTION.billOfRights) {
            console.log(`\nAmendment ${r.n}: ${r.title}`);
            console.log('─'.repeat(50));
            console.log(r.text);
        }
    }

    viewAmendments() {
        console.log('\n' + '═'.repeat(70));
        console.log('📝 AMENDMENTS 11-27');
        console.log('═'.repeat(70));
        
        for (const r of CONSTITUTION.moreRights) {
            console.log(`\nAmendment ${r.n}: ${r.text}`);
        }
    }

    viewPrinciples() {
        console.log('\n' + '═'.repeat(70));
        console.log('⚙️ THE SPIRIT OF THE CONSTITUTION');
        console.log('═'.repeat(70));
        console.log('\n' + PRINCIPLES.separation);
        console.log('\n' + PRINCIPLES.checks);
    }

    viewFull() {
        this.viewSoul();
        this.viewCharacters();
        for (let i = 1; i <= 6; i++) this.viewArticle(i.toString());
        this.viewBillOfRights();
        this.viewAmendments();
        this.viewPrinciples();
    }

    search(keyword) {
        console.log(`\n🔍 Searching for: "${keyword}"`);
        console.log('─'.repeat(50));
        const kw = keyword.toLowerCase();
        
        for (const r of CONSTITUTION.billOfRights) {
            if (r.text.toLowerCase().includes(kw) || r.title.toLowerCase().includes(kw)) {
                console.log(`\n📍 Amendment ${r.n}: ${r.title}`);
                console.log(`   "${r.text.substring(0, 80)}..."`);
            }
        }
    }
}

const c = new HiveConstitution();
const cmd = process.argv[2];
const arg = process.argv[3];

const commands = {
    full: () => c.viewFull(),
    soul: () => c.viewSoul(),
    preamble: () => c.viewPreamble(),
    characters: () => c.viewCharacters(),
    cast: () => c.viewCharacters(),
    article: () => c.viewArticle(arg || '1'),
    bor: () => c.viewBillOfRights(),
    amendments: () => c.viewAmendments(),
    principles: () => c.viewPrinciples(),
    search: () => c.search(arg || ''),
    help: () => console.log(`
📜 Hive Constitution Commands

  soul           View the SOUL of the Hive Nation
  preamble      View preamble
  cast          Meet the characters (funny bios!)
  article <n>   View article 1-6
  bor           View Bill of Rights
  amendments    View amendments 11-27
  principles    View constitutional principles
  full          View entire constitution
  search <term> Search for a term
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveConstitution, SOUL, CHARACTERS };
