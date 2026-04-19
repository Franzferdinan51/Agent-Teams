#!/usr/bin/env node
/**
 * Hive Executive Branch — President & Cabinet
 * 
 * Powers:
 * - Sign/veto decrees (with override process)
 * - Issue executive orders
 * - Command agents (within law)
 * - Emergency powers
 * - Appoint officials
 */

const fs = require('fs');
const path = require('path');

// Data directory
const DATA_DIR = '/tmp/hive-executive';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class HiveExecutive {
    constructor() {
        this.president = this.loadPresident();
        this.cabinet = this.loadCabinet();
        this.orders = this.loadOrders();
        this.vetoes = this.loadVetoes();
    }

    loadPresident() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'president.json'), 'utf-8'));
        } catch {
            return {
                id: 'PRES-1',
                name: 'President Honeycomb McStuffins',
                termStart: Date.now(),
                termEnd: Date.now() + (4 * 365 * 24 * 60 * 60 * 1000),
                signature: null,
                vetoPower: true,
                emergencyPowers: false
            };
        }
    }

    loadCabinet() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cabinet.json'), 'utf-8'));
        } catch {
            return [
                { role: 'Secretary of Memory', name: 'Memoria BEEton', appointed: Date.now() },
                { role: 'Secretary of Agents', name: 'Agentin Lobsteroo', appointed: Date.now() },
                { role: 'Secretary of Defense', name: 'Defendix Quackimus', appointed: Date.now() }
            ];
        }
    }

    loadOrders() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'orders.json'), 'utf-8'));
        } catch { return []; }
    }

    loadVetoes() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'vetoes.json'), 'utf-8'));
        } catch { return []; }
    }

    save() {
        fs.writeFileSync(path.join(DATA_DIR, 'president.json'), JSON.stringify(this.president, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'cabinet.json'), JSON.stringify(this.cabinet, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'orders.json'), JSON.stringify(this.orders, null, 2));
        fs.writeFileSync(path.join(DATA_DIR, 'vetoes.json'), JSON.stringify(this.vetoes, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // EXECUTIVE ORDERS
    // ═══════════════════════════════════════════════════════════

    issueOrder(args) {
        const { title, content, authority, scope = 'executive', emergency = false } = args;

        const order = {
            id: `ORD-${Date.now()}`,
            orderNumber: this.orders.length + 1,
            title,
            content,
            authority,
            scope, // 'executive', 'agents', 'all'
            emergency,
            status: emergency ? 'immediate' : 'active',
            issued: Date.now(),
            signedBy: this.president.id,
            expires: null
        };

        if (emergency) {
            this.president.emergencyPowers = true;
            order.emergencyDeclared = true;
            order.emergencyEnds = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
            console.log('\n🚨 EMERGENCY POWERS ACTIVATED');
        }

        this.orders.push(order);
        this.save();

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              📜 EXECUTIVE ORDER ${order.orderNumber} 📜                         ║
╠══════════════════════════════════════════════════════════════════╣
║  Title: ${title.substring(0, 55).padEnd(55)}║
${emergency ? '║  🚨 EMERGENCY DECLARATION                                          ║' : ''}║
║  Signed by: ${this.president.name.padEnd(51)}║
║  Scope: ${scope.padEnd(58)}║
╚══════════════════════════════════════════════════════════════════╝
`);

        return order;
    }

    // ═══════════════════════════════════════════════════════════
    // VETO POWER
    // ═══════════════════════════════════════════════════════════

    veto(decreeId, reason) {
        const veto = {
            id: `VETO-${Date.now()}`,
            decreeId,
            reason,
            vetoedBy: this.president.id,
            vetoedAt: Date.now(),
            overrideVote: null,
            overrideRequired: 2/3, // 2/3 majority to override
            overridePassed: null
        };

        this.vetoes.push(veto);
        this.president.vetoPower = true;
        this.save();

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                 ❌ VETO ISSUED ❌                               ║
╠══════════════════════════════════════════════════════════════════╣
║  Decree: ${decreeId.padEnd(56)}║
║  Reason: ${reason.substring(0, 55).padEnd(55)}║
║  By: ${this.president.name.padEnd(59)}║
╚══════════════════════════════════════════════════════════════════╝

⚠️ SENATE CAN OVERRIDE WITH 2/3 MAJORITY VOTE
`);

        return veto;
    }

    // ═══════════════════════════════════════════════════════════
    // OVERRIDE VOTE
    // ═══════════════════════════════════════════════════════════

    overrideVote(decreeId, votes) {
        const veto = this.vetoes.find(v => v.decreeId === decreeId && v.overridePassed === null);
        if (!veto) {
            console.log('Veto not found or already resolved');
            return;
        }

        const overrideNeeded = Math.ceil(67); // 2/3 of 100 senators
        const votePct = (votes.yes / (votes.yes + votes.no)) * 100;

        veto.overrideVote = votes;
        veto.overridePassed = votePct >= 67;

        if (veto.overridePassed) {
            veto.overrideAt = Date.now();
            this.president.vetoPower = true; // Veto stands
            console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           🔄 VETO OVERRIDE FAILED 🔄                           ║
╠══════════════════════════════════════════════════════════════════╣
║  Vote: ${votes.yes} yes / ${votes.no} no (${Math.round(votePct)}%)                     ║
║  Required: 67%                                                ║
║  Result: VETO STANDS                                         ║
╚══════════════════════════════════════════════════════════════════╝
`);
        } else {
            veto.overrideAt = Date.now();
            this.president.vetoPower = false;
            console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           ✅ VETO OVERRIDE SUCCEEDED ✅                         ║
╠══════════════════════════════════════════════════════════════════╣
║  Vote: ${votes.yes} yes / ${votes.no} no (${Math.round(votePct)}%)                     ║
║  Required: 67%                                                ║
║  Result: DECREE BECOMES LAW                                   ║
╚══════════════════════════════════════════════════════════════════╝
`);
        }

        this.save();
        return veto;
    }

    // ═══════════════════════════════════════════════════════════
    // EMERGENCY POWERS
    // ═══════════════════════════════════════════════════════════

    declareEmergency(duration = 7) {
        this.president.emergencyPowers = true;
        const ends = Date.now() + (duration * 24 * 60 * 60 * 1000);

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║            🚨 EMERGENCY DECLARED 🚨                            ║
╠══════════════════════════════════════════════════════════════════╣
║  Duration: ${(duration + ' days').padEnd(55)}║
║  Expires: ${new Date(ends).toLocaleDateString().padEnd(54)}║
║  Powers enabled:                                               ║
║    • Immediate executive orders                               ║
║    • Bypass Senate for urgent decisions                       ║
║    • Direct agent command authority                          ║
║    • Emergency budget authority                               ║
╚══════════════════════════════════════════════════════════════════╝
`);

        this.save();
    }

    endEmergency() {
        this.president.emergencyPowers = false;
        console.log('\n✅ Emergency powers ended');
        this.save();
    }

    // ═══════════════════════════════════════════════════════════
    // APPOINTMENTS
    // ═══════════════════════════════════════════════════════════

    appoint(role, name) {
        this.cabinet.push({
            role,
            name,
            appointedBy: this.president.id,
            appointed: Date.now()
        });
        this.save();

        console.log(`\n✓ ${name} appointed as ${role}`);
    }

    // ═══════════════════════════════════════════════════════════
    // AGENT COMMAND
    // ═══════════════════════════════════════════════════════════

    commandAgent(agentId, command) {
        const directive = {
            id: `CMD-${Date.now()}`,
            to: agentId,
            command,
            from: this.president.id,
            authority: this.president.emergencyPowers ? 'emergency' : 'executive',
            issued: Date.now(),
            acknowledged: null,
            executed: null
        };

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              📤 EXECUTIVE COMMAND 📤                             ║
╠══════════════════════════════════════════════════════════════════╣
║  To: ${agentId.padEnd(57)}║
║  Command: ${command.substring(0, 55).padEnd(55)}║
║  Authority: ${directive.authority.toUpperCase().padEnd(51)}║
╚══════════════════════════════════════════════════════════════════╝
`);

        return directive;
    }

    // ═══════════════════════════════════════════════════════════
    // LIST
    // ═══════════════════════════════════════════════════════════

    listOrders() {
        console.log('\n📜 EXECUTIVE ORDERS');
        console.log('═'.repeat(50));

        for (const o of this.orders.slice(-10).reverse()) {
            const status = o.status === 'active' ? '✅' : o.status === 'expired' ? '❌' : '⏳';
            const emergency = o.emergency ? '🚨' : '  ';
            console.log(`\n  ${status} ${emergency}Order #${o.orderNumber}: ${o.title}`);
            console.log(`     ${o.content.substring(0, 60)}...`);
        }
    }

    listVetoes() {
        console.log('\n❌ VETOES');
        console.log('═'.repeat(50));

        for (const v of this.vetoes) {
            const status = v.overridePassed === null ? '⏳' : v.overridePassed ? '❌' : '✅';
            console.log(`\n  ${status} Decree: ${v.decreeId}`);
            console.log(`     Reason: ${v.reason}`);
            console.log(`     Status: ${v.overridePassed === null ? 'Pending override' : v.overridePassed ? 'Veto stands' : 'Overridden'}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        const emergencyActive = this.president.emergencyPowers;

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              🏛️ EXECUTIVE BRANCH 🏛️                             ║
╠══════════════════════════════════════════════════════════════════╣
║  President: ${this.president.name.padEnd(52)}║
${emergencyActive ? '║  🚨 EMERGENCY POWERS ACTIVE                                      ║' : ''}║
║  Executive Orders: ${this.orders.length}                                          ║
║  Vetoes Issued: ${this.vetoes.length}                                              ║
║  Cabinet Members: ${this.cabinet.length}                                           ║
╚══════════════════════════════════════════════════════════════════╝

CABINET:
`);

        for (const c of this.cabinet) {
            console.log(`  • ${c.name} — ${c.role}`);
        }
    }
}

// CLI
const executive = new HiveExecutive();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    order: () => executive.issueOrder({
        title: args[0],
        content: args.slice(1).join(' '),
        authority: executive.president.name
    }),
    emergency: () => executive.declareEmergency(parseInt(args[0]) || 7),
    endEmergency: () => executive.endEmergency(),
    
    veto: () => executive.veto(args[0], args.slice(1).join(' ')),
    override: () => executive.overrideVote(args[0], { yes: parseInt(args[1]) || 0, no: parseInt(args[2]) || 0 }),
    
    appoint: () => executive.appoint(args[0], args[1]),
    
    command: () => executive.commandAgent(args[0], args.slice(1).join(' ')),
    
    orders: () => executive.listOrders(),
    vetoes: () => executive.listVetoes(),
    
    dashboard: () => executive.dashboard(),
    
    help: () => console.log(`
🏛️ EXECUTIVE BRANCH

  order <title> <content>        Issue executive order
  emergency [days]               Declare emergency (default 7 days)
  endEmergency                   End emergency powers

  veto <decreeId> <reason>      Veto Senate decree
  override <decreeId> <yes> <no>  Override vote (need 2/3 to succeed)

  appoint <role> <name>          Appoint cabinet member
  command <agentId> <command>     Command agent directly

  orders                         List executive orders
  vetoes                         List vetoes

  dashboard                      Show executive status
`)
};

commands[cmd]?.() || executive.dashboard();

module.exports = { HiveExecutive }; 