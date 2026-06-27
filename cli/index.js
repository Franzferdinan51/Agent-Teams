#!/usr/bin/env node
/**
 * Hive CLI - Complete Command Line Interface
 * 
 * All Hive modules unified under Senate control:
 * - Senate Decrees (THE LAW)
 * - Agent Orchestrator (Senate-controlled)
 * - Memory & Decisions
 * - Skills, Plugins, Automation
 * - Monitoring, Security, Multi-Instance
 */

const fs = require('fs');
const path = require('path');

// Load platform detection
const { Platform, platform } = require('./platform-detect.js');

// Get base directory
const baseDir = path.dirname(__dirname);
const scriptsDir = path.join(baseDir, 'scripts');

// ═══════════════════════════════════════════════════════════
// RUN SCRIPT
// ═══════════════════════════════════════════════════════════

function runScript(scriptName, args = []) {
    try {
        const scriptPath = path.join(scriptsDir, scriptName);
        if (!fs.existsSync(scriptPath)) {
            console.log(`Script not found: ${scriptName}`);
            return;
        }
        const child = require(scriptPath);
        if (typeof child.run === 'function') {
            child.run(args);
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

function runModule(modulePath, args = []) {
    try {
        const mod = require(modulePath);
        const cmd = args[0];
        const modArgs = args.slice(1);
        
        // Try CLI-style command
        if (mod.commands && mod.commands[cmd]) {
            mod.commands[cmd](modArgs);
        }
        // Try direct function
        else if (typeof mod === 'function') {
            const instance = new mod();
            if (instance[cmd]) {
                instance[cmd](...modArgs);
            }
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }
}

// ═══════════════════════════════════════════════════════════
// HELP
// ═══════════════════════════════════════════════════════════

const helpText = `
╔══════════════════════════════════════════════════════════════════╗
║               🏛️ HIVE NATION CLI 🏛️                            ║
║           Complete Multi-Agent Government Framework             ║
╠══════════════════════════════════════════════════════════════════╣
║  Platform: ${(platform.platform + ' ').padEnd(50)}║
╚══════════════════════════════════════════════════════════════════╝

USAGE:
  hive <command> [args]

═══════════════════════════════════════════════════════════════════
🏛️  SENATE — THE LAW OF THE HIVE
═══════════════════════════════════════════════════════════════════

  senate issue <title> <content>     Issue binding decree
  senate list [status]                 List decrees
  senate check <action>                Check decree compliance
  senate vote <#> <senator> <vote>    Vote on decree
  senate revoke <#>                    Revoke decree
  senate dashboard                     Show Senate command center

═══════════════════════════════════════════════════════════════════
🤖 AGENTS — SENATE-CONTROLLED
═══════════════════════════════════════════════════════════════════

  agent execute <task>                 Execute task (Senate-approved)
  agent decompose <task>               Show task breakdown
  agent select <task>                  Show agent selection
  agent parallel <task1|task2|...>     Parallel execution
  agent failover <agent> <task>        Show failover chain
  agent perf [agent]                   View performance

═══════════════════════════════════════════════════════════════════
🧠 MEMORY & DECISIONS
═══════════════════════════════════════════════════════════════════

  remember <cat> <content>            Save memory
  recall <query>                      Search memories
  decision <ctx> <decision> [reason]  Log decision
  pastDecisions <query>               Search past decisions
  learn <topic> <content>             Store learning
  quick <type> <content>              Quick save (todo|learn|note)

═══════════════════════════════════════════════════════════════════
📊 PRODUCTION TOOLS
═══════════════════════════════════════════════════════════════════

  scoring <cmd>     Agent evaluation & rankings
  memory <cmd>      Memory & decision logs
  trace <cmd>       Execution visualization
  budget <cmd>      Resource management
  skills <cmd>      Web search, cron, code review, etc
  plugins <cmd>     Notion, GitHub, Claude, Ollama
  automation <cmd>  Schedules, webhooks, workflows
  monitoring <cmd>  System metrics & alerts
  security <cmd>    API keys, secrets, audit
  multi <cmd>       Distributed setup

═══════════════════════════════════════════════════════════════════
🏛️ GOVERNMENT
═══════════════════════════════════════════════════════════════════

  gov              Government hub
  senate           Senate operations
  congress         Congress operations
  constitution     View constitution
  law              Legal code
  orders           Executive orders
  official         Government officials

═══════════════════════════════════════════════════════════════════
📱 TERMUX (Android)
═══════════════════════════════════════════════════════════════════

  camera [n]       Take photo
  location          Get GPS
  clipboard [text]  Get/set clipboard
  notify <title> <msg>  Show notification
  speak <text>      Text-to-speech
  sms <num> <msg>  Send SMS

═══════════════════════════════════════════════════════════════════
💻 SYSTEM
═══════════════════════════════════════════════════════════════════

  platform         Show platform info
  status           System status
  mcp              Start MCP server
  dashboard        Full dashboard
  install          Install Hive CLI

═══════════════════════════════════════════════════════════════════

EXAMPLES:

  hive senate issue "Model Priority" "All agents MUST use MiniMax M2.7"
  hive senate check "use gpt-4 for everything"
  
  hive agent execute "build a REST API"
  hive agent parallel "research X|research Y|research Z"
  
  hive remember work "Use MiniMax for all agents"
  hive recall "model preferences"
  hive decision "Use MiniMax" "Best performance" "Benchmarks show"

`;

const termuxHelp = platform.canUseTermuxAPI() ? `

  📱 TERMUX:API AVAILABLE ✅
     camera, location, clipboard, notification, speech, sms

` : `

  📱 TERMUX:API NOT INSTALLED ❌
     Install with: pkg install termux-api

`;

// ═══════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════

const commands = {
    // SENATE
    senate: (args) => {
        runModule('../scripts/hive-senate-decrees.js', args);
    },

    // AGENTS
    agent: (args) => {
        runModule('../agents/hive-agent-orchestrator.js', args);
    },

    // Government
    gov: () => runScript('hive-gov.js'),
    congress: () => runScript('hive-congress.js'),
    constitution: () => runScript('hive-constitution.js'),
    law: () => runScript('hive-law.js'),
    orders: () => runScript('hive-orders.js'),
    official: () => runScript('hive-official.js'),

    // Memory
    remember: (args) => runModule('../scripts/hive-memory.js', ['remember', ...args]),
    recall: (args) => runModule('../scripts/hive-memory.js', ['recall', ...args]),
    decision: (args) => runModule('../scripts/hive-memory.js', ['decision', ...args]),
    pastDecisions: (args) => runModule('../scripts/hive-memory.js', ['pastDecisions', ...args]),
    learn: (args) => runModule('../scripts/hive-memory.js', ['learn', ...args]),
    quick: (args) => runModule('../scripts/hive-memory.js', ['quick', ...args]),

    // Production Tools
    scoring: (args) => runScript('hive-scoring.js', args),
    memory: (args) => runScript('hive-memory.js', args),
    trace: (args) => runScript('hive-trace.js', args),
    budget: (args) => runScript('hive-budget.js', args),

    // Extended Modules
    skills: (args) => runModule('../skills/hive-skills.js', args),
    plugins: (args) => runModule('../plugins/hive-plugins.js', args),
    automation: (args) => runModule('../automation/hive-automation.js', args),
    monitoring: (args) => runModule('../monitoring/hive-monitoring.js', args),
    security: (args) => runModule('../security/hive-security.js', args),
    multi: (args) => runModule('../multi-instance/hive-multi.js', args),

    // Termux commands
    camera: (args) => {
        if (!platform.canUseTermuxAPI()) { console.log('Termux:API not available'); return; }
        const { execSync } = require('child_process');
        execSync(`termux-camera-photo -c ${args[0] || 0} /sdcard/hive-photo.jpg`);
        console.log('Photo saved: /sdcard/hive-photo.jpg');
    },
    location: () => {
        if (!platform.canUseTermuxAPI()) { console.log('Termux:API not available'); return; }
        const { execSync } = require('child_process');
        console.log(execSync('termux-location', { encoding: 'utf-8' }));
    },
    clipboard: (args) => {
        if (!platform.canUseTermuxAPI()) { console.log('Termux:API not available'); return; }
        const { execSync } = require('child_process');
        if (args.length > 0) {
            execSync(`termux-clipboard-set "${args.join(' ')}"`);
            console.log('Clipboard set');
        } else {
            console.log(execSync('termux-clipboard-get', { encoding: 'utf-8' }));
        }
    },
    notify: (args) => {
        if (!platform.canUseTermuxAPI()) { console.log('Termux:API not available'); return; }
        const { execSync } = require('child_process');
        execSync(`termux-notification --title "${args[0]}" --content "${args.slice(1).join(' ')}"`);
    },
    speak: (args) => {
        if (!platform.canUseTermuxAPI()) { console.log('Termux:API not available'); return; }
        const { execSync } = require('child_process');
        execSync(`termux-tts-speak "${args.join(' ')}"`);
    },
    sms: (args) => {
        if (!platform.canUseTermuxAPI()) { console.log('Termux:API not available'); return; }
        const { execSync } = require('child_process');
        execSync(`termux-sms-send -n "${args[0]}" "${args.slice(1).join(' ')}"`);
    },

    // System
    platform: () => platform.print(),
    status: () => {
        console.log('\n📊 Hive Status');
        platform.print();
    },
    mcp: () => console.log('Start MCP: node cli/mcp/server.js'),
    dashboard: () => {
        console.log('\n🎛️ FULL DASHBOARD');
        // Import and run all dashboards
        try {
            const SenateRegistry = require('../scripts/hive-senate-decrees.js');
            const senate = new SenateRegistry();
            senate.dashboard();
        } catch (e) { console.log('Senate not loaded'); }
        try {
            const AgentOrchestrator = require('../agents/hive-agent-orchestrator.js');
            const orchestrator = new AgentOrchestrator();
            orchestrator.dashboard();
        } catch (e) { console.log('Orchestrator not loaded'); }
    },
    install: () => console.log('Run: bash install.sh'),
    version: () => console.log('Hive Nation v1.8.0'),
    help: () => console.log(helpText + termuxHelp),
    '--help': () => console.log(helpText + termuxHelp),
    '-h': () => console.log(helpText + termuxHelp)
};

// ═══════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════

const cmd = process.argv[2];
const args = process.argv.slice(3).map(a => a.trim()).filter(a => a);

if (!cmd) {
    console.log(helpText + termuxHelp);
} else if (commands[cmd]) {
    commands[cmd](args);
} else {
    console.log(`Unknown command: ${cmd}`);
    console.log('Run "hive help" for available commands');
}

module.exports = { commands, platform }; 