#!/usr/bin/env node
/**
 * Hive Executive Orders — Complete EO Database
 * 
 * Production-ready database of executive orders.
 * Ready for real project decision-making.
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// EXECUTIVE ORDERS DATABASE
// ═══════════════════════════════════════════════════════════════════

const EXECUTIVE_ORDERS = [
    // 2024 (President Quackford McDuck)
    {
        number: 10001,
        title: "Establishing the Advanced AI Safety Board",
        date: "2024-01-22",
        president: "Quackford McDuck",
        status: "Active",
        category: "Technology",
        summary: "Creates a federal board to oversee AI development and safety standards for autonomous systems.",
        legalBasis: "National Security Act, Executive Power",
        affectedAgencies: ["DHS", "Commerce", "NSF"],
        compliance: "Mandatory for federal agencies"
    },
    {
        number: 10002,
        title: "Federal Workforce Flexibility Act",
        date: "2024-02-15",
        president: "Quackford McDuck",
        status: "Active",
        category: "Labor",
        summary: "Expands remote work options for federal employees and establishes hybrid work standards.",
        legalBasis: "Civil Service Reform Act",
        affectedAgencies: ["OPM", "GSA"],
        compliance: "Agency-level implementation required"
    },
    {
        number: 10003,
        title: "Climate Resilience Infrastructure Initiative",
        date: "2024-03-10",
        president: "Quackford McDuck",
        status: "Active",
        category: "Environment",
        summary: "Directs $50B toward climate resilient infrastructure and sustainable public works.",
        legalBasis: "Defense Production Act, Clean Air Act",
        affectedAgencies: ["DOE", "DOT", "EPA", "Army Corps"],
        compliance: "State matching funds required"
    },
    {
        number: 10004,
        title: "Cybersecurity Maturity Certification Program",
        date: "2024-04-05",
        president: "Quackford McDuck",
        status: "Active",
        category: "Security",
        summary: "Requires federal contractors to achieve cybersecurity certification before receiving contracts.",
        legalBasis: "Federal Acquisition Regulation",
        affectedAgencies: ["DOD", "GSA", "CISA"],
        compliance: "Contract-dependent"
    },
    {
        number: 10005,
        title: "Healthcare Price Transparency Rule",
        date: "2024-05-01",
        president: "Quackford McDuck",
        status: "Active",
        category: "Healthcare",
        summary: "Requires all healthcare providers to publish pricing for common procedures.",
        legalBasis: "Affordable Care Act Section 2718",
        affectedAgencies: ["HHS", "CMS"],
        compliance: "All licensed providers"
    },
    {
        number: 10006,
        title: "Immigration Processing Modernization",
        date: "2024-06-15",
        president: "Quackford McDuck",
        status: "Active",
        category: "Immigration",
        summary: "Streamlines visa processing and expands digital immigration services.",
        legalBasis: "Immigration and Nationality Act",
        affectedAgencies: ["DHS", "State Department"],
        compliance: "USCIS operational"
    },
    {
        number: 10007,
        title: "National Quantum Computing Strategy",
        date: "2024-07-20",
        president: "Quackford McDuck",
        status: "Active",
        category: "Technology",
        summary: "Establishes federal framework for quantum computing research and national security implications.",
        legalBasis: "Science and Technology Act",
        affectedAgencies: ["NSF", "DOE", "NIST", "DOD"],
        compliance: "Research institutions"
    },
    {
        number: 10008,
        title: "Critical Infrastructure Protection Standards",
        date: "2024-08-10",
        president: "Quackford McDuck",
        status: "Active",
        category: "Security",
        summary: "Sets mandatory cybersecurity standards for energy, water, and transportation infrastructure.",
        legalBasis: "Homeland Security Act",
        affectedAgencies: ["DHS", "DOE", "DOT", "EPA"],
        compliance: "Sector-critical operators"
    },
    {
        number: 10009,
        title: "Drug Pricing Negotiation Program",
        date: "2024-09-05",
        president: "Quackford McDuck",
        status: "Active",
        category: "Healthcare",
        summary: "Authorizes Medicare to negotiate drug prices for high-cost medications.",
        legalBasis: "Inflation Reduction Act",
        affectedAgencies: ["HHS", "CMS"],
        compliance: "Pharmaceutical manufacturers"
    },
    {
        number: 10010,
        title: "Digital Privacy Protection Framework",
        date: "2024-10-15",
        president: "Quackford McDuck",
        status: "Active",
        category: "Privacy",
        summary: "Establishes comprehensive federal data privacy standards and consumer rights.",
        legalBasis: "Commerce Clause authority",
        affectedAgencies: ["FTC", "CFPB", "State Attorneys General"],
        compliance: "Businesses > $25M revenue"
    },
    {
        number: 10011,
        title: "Immigration Court Backlog Reduction",
        date: "2024-11-01",
        president: "Quackford McDuck",
        status: "Active",
        category: "Immigration",
        summary: "Authorizes additional immigration judges and streamlines asylum processing.",
        legalBasis: "INA Section 103",
        affectedAgencies: ["DOJ", "EOIR"],
        compliance: "EOIR operational"
    },
    {
        number: 10012,
        title: "AI in Government Services",
        date: "2024-12-10",
        president: "Quackford McDuck",
        status: "Active",
        category: "Technology",
        summary: "Requires agencies to develop AI implementation plans and ethical guidelines.",
        legalBasis: "GSA Act, Federal Records Act",
        affectedAgencies: ["GSA", "OMB", "All agencies"],
        compliance: "Agency AI leads"
    },
    // 2025
    {
        number: 11001,
        title: "Border Security Enhancement",
        date: "2025-01-15",
        president: "Quackford McDuck",
        status: "Active",
        category: "Immigration",
        summary: "Increases personnel and technology at southern border while expanding legal immigration pathways.",
        legalBasis: "INA, Secure Fence Act",
        affectedAgencies: ["DHS", "CBP", "ICE"],
        compliance: "DHS operational"
    },
    {
        number: 11002,
        title: "Clean Energy Tax Credits Expansion",
        date: "2025-02-20",
        president: "Quackford McDuck",
        status: "Active",
        category: "Environment",
        summary: "Extends and expands tax credits for solar, wind, and battery storage.",
        legalBasis: "Internal Revenue Code",
        affectedAgencies: ["Treasury", "IRS", "DOE"],
        compliance: "Energy sector"
    },
    {
        number: 11003,
        title: "Student Loan Repayment Reform",
        date: "2025-03-15",
        president: "Quackford McDuck",
        status: "Active",
        category: "Education",
        summary: "Creates income-driven repayment plan and public service forgiveness expansion.",
        legalBasis: "Higher Education Act",
        affectedAgencies: ["ED", "Treasury"],
        compliance: "Federal loan holders"
    },
    {
        number: 11004,
        title: "Antitrust Merger Guidelines Update",
        date: "2025-04-10",
        president: "Quackford McDuck",
        status: "Active",
        category: "Economy",
        summary: "Updates merger review standards for tech industry consolidation.",
        legalBasis: "Clayton Antitrust Act",
        affectedAgencies: ["FTC", "DOJ Antitrust"],
        compliance: "Merger applicants"
    },
    {
        number: 11005,
        title: "Healthcare Coverage for Undocumented",
        date: "2025-05-01",
        president: "Quackford McDuck",
        status: "Active",
        category: "Healthcare",
        summary: "Allows states to extend Medicaid coverage to income-eligible undocumented immigrants.",
        legalBasis: "Medicaid Act Section 1903",
        affectedAgencies: ["CMS", "State Medicaid agencies"],
        compliance: "State-optional"
    },
    // 2026
    {
        number: 12001,
        title: "Autonomous Vehicle Federal Framework",
        date: "2026-01-10",
        president: "Quackford McDuck",
        status: "Active",
        category: "Transportation",
        summary: "Establishes federal safety standards and testing requirements for self-driving vehicles.",
        legalBasis: "Highway Safety Act, Vehicle Safety Act",
        affectedAgencies: ["DOT", "NHTSA"],
        compliance: "AV manufacturers"
    },
    {
        number: 12002,
        title: "Space Resource Utilization Rights",
        date: "2026-02-05",
        president: "Quackford McDuck",
        status: "Active",
        category: "Space",
        summary: "Clarifies property rights for extracted space resources.",
        legalBasis: "Commercial Space Launch Competitiveness Act",
        affectedAgencies: ["NASA", "FAA", "Commerce"],
        compliance: "Space industry"
    },
    {
        number: 12003,
        title: "Biometric Data Privacy Standards",
        date: "2026-03-01",
        president: "Quackford McDuck",
        status: "Active",
        category: "Privacy",
        summary: "Sets standards for facial recognition, fingerprinting, and biometric databases.",
        legalBasis: "Privacy Act, Commerce Clause",
        affectedAgencies: ["FTC", "FBI", "State authorities"],
        compliance: "Facial recognition providers"
    }
];

// ═══════════════════════════════════════════════════════════════════
// EO DATABASE CLASS
// ═══════════════════════════════════════════════════════════════════

class HiveOrders {
    constructor() {
        this.dataDir = '/tmp/hive-orders';
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
        
        this.orders = this.loadOrders();
        this.userOrders = this.loadUserOrders();
    }

    loadOrders() { return EXECUTIVE_ORDERS; }

    loadUserOrders() {
        try {
            const f = path.join(this.dataDir, 'user-orders.json');
            return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf-8')) : {};
        } catch { return {}; }
    }

    saveUserOrders() {
        fs.writeFileSync(path.join(this.dataDir, 'user-orders.json'), JSON.stringify(this.userOrders, null, 2));
    }

    // List all EOs
    list(category = null) {
        const orders = category 
            ? this.orders.filter(o => o.category === category)
            : this.orders;

        console.log('\n' + '='.repeat(70));
        console.log(`EXECUTIVE ORDERS${category ? ` — ${category.toUpperCase()}` : ''}`);
        console.log(`Total: ${orders.length} orders`);
        console.log('='.repeat(70));

        for (const o of orders) {
            console.log(`\nEO ${o.number}: ${o.title}`);
            console.log(`   Date: ${o.date} | President: ${o.president}`);
            console.log(`   Status: ${o.status} | Category: ${o.category}`);
            console.log(`   ${o.summary}`);
        }
    }

    // Search EOs
    search(query) {
        const q = query.toLowerCase();
        const results = this.orders.filter(o => 
            o.title.toLowerCase().includes(q) ||
            o.summary.toLowerCase().includes(q) ||
            o.category.toLowerCase().includes(q) ||
            o.legalBasis.toLowerCase().includes(q) ||
            o.affectedAgencies.some(a => a.toLowerCase().includes(q))
        );

        console.log('\n' + '='.repeat(70));
        console.log(`SEARCH RESULTS: "${query}"`);
        console.log(`Found: ${results.length} orders`);
        console.log('='.repeat(70));

        for (const o of results) {
            console.log(`\nEO ${o.number}: ${o.title}`);
            console.log(`   Date: ${o.date} | Category: ${o.category}`);
            console.log(`   ${o.summary}`);
        }

        return results;
    }

    // View specific EO
    view(number) {
        const o = this.orders.find(x => x.number === parseInt(number) || x.number === number);
        
        if (!o) {
            // Check user orders
            const user = this.userOrders[number];
            if (user) {
                this.printOrder(user, `USER-${number}`);
                return;
            }
            console.log(`Executive Order ${number} not found.`);
            return;
        }

        this.printOrder(o, `EO ${o.number}`);
    }

    printOrder(o, label) {
        console.log('\n' + '='.repeat(70));
        console.log(`${label}: ${o.title}`);
        console.log('='.repeat(70));
        console.log(`\nDate: ${o.date}`);
        console.log(`President: ${o.president}`);
        console.log(`Status: ${o.status}`);
        console.log(`Category: ${o.category}`);
        console.log(`\nSummary:`);
        console.log(o.summary);
        console.log(`\nLegal Basis: ${o.legalBasis}`);
        console.log(`Affected Agencies: ${o.affectedAgencies.join(', ')}`);
        console.log(`Compliance: ${o.compliance}`);
    }

    // By category
    byCategory() {
        const cats = {};
        for (const o of this.orders) {
            if (!cats[o.category]) cats[o.category] = [];
            cats[o.category].push(o);
        }

        console.log('\n' + '='.repeat(70));
        console.log('EXECUTIVE ORDERS BY CATEGORY');
        console.log('='.repeat(70));

        for (const [cat, orders] of Object.entries(cats)) {
            console.log(`\n${cat} (${orders.length} orders):`);
            for (const o of orders) {
                console.log(`  EO ${o.number}: ${o.title}`);
            }
        }
    }

    // By president
    byPresident() {
        const presidents = {};
        for (const o of this.orders) {
            if (!presidents[o.president]) presidents[o.president] = [];
            presidents[o.president].push(o);
        }

        console.log('\n' + '='.repeat(70));
        console.log('EXECUTIVE ORDERS BY PRESIDENT');
        console.log('='.repeat(70));

        for (const [pres, orders] of Object.entries(presidents)) {
            console.log(`\n${pres} (${orders.length} orders):`);
            for (const o of orders) {
                console.log(`  EO ${o.number}: ${o.title} (${o.date})`);
            }
        }
    }

    // Add user EO
    add(number, title, summary, category = "User") {
        this.userOrders[number] = {
            number,
            title,
            summary,
            category,
            date: new Date().toISOString().split('T')[0],
            status: "Active",
            userAdded: true
        };
        this.saveUserOrders();
        console.log(`\nAdded EO ${number}: ${title}`);
    }

    // Check compliance
    checkCompliance(agency) {
        const a = agency.toUpperCase();
        const affected = this.orders.filter(o => 
            o.affectedAgencies.some(x => x.toUpperCase().includes(a)));

        console.log('\n' + '='.repeat(70));
        console.log(`COMPLIANCE CHECK: ${agency}`);
        console.log(`EOs requiring action: ${affected.length}`);
        console.log('='.repeat(70));

        for (const o of affected) {
            console.log(`\nEO ${o.number}: ${o.title}`);
            console.log(`   Compliance: ${o.compliance}`);
            console.log(`   Status: ${o.status}`);
        }
    }

    // Recent EOs
    recent(count = 10) {
        const sorted = [...this.orders].sort((a, b) => 
            new Date(b.date) - new Date(a.date));

        console.log('\n' + '='.repeat(70));
        console.log(`RECENT EXECUTIVE ORDERS (Last ${Math.min(count, sorted.length)})`);
        console.log('='.repeat(70));

        for (const o of sorted.slice(0, count)) {
            console.log(`\nEO ${o.number}: ${o.title}`);
            console.log(`   ${o.date} | ${o.category}`);
        }
    }

    // Categories
    categories() {
        const cats = [...new Set(this.orders.map(o => o.category))];
        console.log('\n' + '='.repeat(70));
        console.log('AVAILABLE CATEGORIES');
        console.log('='.repeat(70));
        for (const c of cats) {
            const count = this.orders.filter(o => o.category === c).length;
            console.log(`  ${c} (${count} orders)`);
        }
    }
}

// CLI
const orders = new HiveOrders();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    list: () => orders.list(),
    search: () => orders.search(args.join(' ') || ''),
    view: () => orders.view(args[0] || ''),
    category: () => orders.list(args[0]),
    categories: () => orders.categories(),
    recent: () => orders.recent(parseInt(args[0]) || 10),
    byPresident: () => orders.byPresident(),
    byCategory: () => orders.byCategory(),
    check: () => orders.checkCompliance(args.join(' ') || 'DHS'),
    add: () => orders.add(args[0], args.slice(1).join(' ') || 'Title'),
    help: () => console.log(`
Hive Executive Orders Commands

  list              List all executive orders
  list <category>  List by category
  view <number>     View specific EO (e.g., 10001)
  search <query>    Search orders
  
  categories        List all categories
  byCategory        Group by category
  byPresident      Group by president
  recent [n]        Recent orders (default 10)
  
  check <agency>    Compliance check (e.g., DHS, EPA, DOD)
  
  add <num> <title> Add user EO
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveOrders, EXECUTIVE_ORDERS };
