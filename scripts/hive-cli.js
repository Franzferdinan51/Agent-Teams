#!/usr/bin/env node
/**
 * Hive CLI — Unified Command Line Interface
 * 
 * Usage:
 *   hive <command> [args]
 *   node hive-cli.js <command> [args]
 */

const fs = require('fs');
const path = require('path');

// Load all Hive modules
const HiveScoring = require('./hive-scoring.js');
const HiveMemory = require('./hive-memory.js');
const HiveTrace = require('./hive-trace.js');
const HiveBudget = require('./hive-budget.js');

// Initialize
const scoring = new HiveScoring();
const memory = new HiveMemory();
const trace = new HiveTrace();
const budget = new HiveBudget();

// Parse command
const cmd = process.argv[2];
const args = process.argv.slice(3);

// Help text
const help = `
╔══════════════════════════════════════════════════════════════════╗
║           🏛️ HIVE NATION CLI v1.0 🏛️                           ║
╠══════════════════════════════════════════════════════════════════╣
║   Multi-Agent Government Framework + Production Tools            ║
╚══════════════════════════════════════════════════════════════════╝

COMMANDS:

  🏛️ GOVERNMENT
    hive gov          Government hub
    hive senate       Senate operations
    hive congress     Congress operations
    hive constitution View constitution
    hive law          Legal code
    hive orders       Executive orders
    hive official     Government officials

  🧠 PRODUCTION TOOLS
    hive scoring <cmd>    Agent evaluation & rankings
    hive memory <cmd>     Memory persistence
    hive trace <cmd>      Execution visualization
    hive budget <cmd>     Resource management

  🚀 QUICK START
    hive start <task>     Start task with full tracking
    hive status           System status
    hive agents           Active agents

EXAMPLES:

  hive scoring score researcher "code review" 8 9 8 9
  hive scoring rankings
  hive scoring dashboard

  hive memory remember general "Important fact to remember"
  hive memory recall "search term"
  hive memory dashboard

  hive trace start T1 "Build feature X"
  hive trace step researcher "analyzing" 500
  hive trace decision researcher "use approach A" "faster"
  hive trace end

  hive budget status
  hive budget canSpawn researcher
  hive budget spawn A1 researcher

  hive start "build new feature"

DOCS:
  SETUP-YOUR-MODELS.md  — Configure your models
  START-HERE.md         — Getting started guide
  README.md             — Full documentation

`;

const commands = {
    // Government
    gov: () => runScript('hive-gov.js'),
    senate: () => runScript('hive-senate.js'),
    congress: () => runScript('hive-congress.js'),
    constitution: () => runScript('hive-constitution.js'),
    law: () => runScript('hive-law.js'),
    orders: () => runScript('hive-orders.js'),
    official: () => runScript('hive-official.js'),
    news: () => runScript('hive-news.js'),

    // Scoring
    scoring: () => scoring.run(args),
    score: () => scoring.run(args),

    // Memory
    memory: () => memory.run(args),
    remember: () => memory.run(['remember', ...args]),
    recall: () => memory.run(['recall', ...args]),

    // Trace
    trace: () => trace.run(args),
    start: () => trace.run(['start', ...args]),
    step: () => trace.run(['step', ...args]),

    // Budget
    budget: () => budget.run(args),
    spawn: () => budget.run(['spawn', ...args]),
    status: () => {
        console.log('\n📊 HIVE SYSTEM STATUS\n');
        budget.status();
        console.log('\n');
        scoring.dashboard();
    },

    // Agents
    agents: () => {
        console.log('\n🔵 ACTIVE AGENTS:');
        console.log(budget.usage.activeAgents);
    },

    // Version
    version: () => {
        console.log('Hive Nation v1.6.1');
    },

    // Help
    help: () => console.log(help),
    '--help': () => console.log(help),
    '-h': () => console.log(help)
};

function runScript(scriptName) {
    try {
        require(`./${scriptName}`);
    } catch (e) {
        console.log(`Script ${scriptName} not found`);
    }
}

// Run
if (commands[cmd]) {
    commands[cmd]();
} else if (!cmd) {
    console.log(help);
} else {
    console.log(`Unknown command: ${cmd}`);
    console.log(help);
}

module.exports = { commands };