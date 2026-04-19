#!/usr/bin/env node
/**
 * Hive CLI - Unified Command Line Interface
 * Works on Mac, Linux, Termux (Android)
 * 
 * Usage:
 *   hive <command> [args]
 *   node cli/index.js <command> [args]
 */

const fs = require('fs');
const path = require('path');

// Load platform detection
const { Platform, platform } = require('./platform-detect.js');

// Get base directory
const baseDir = path.dirname(__dirname);
const scriptsDir = path.join(baseDir, 'scripts');

// ═══════════════════════════════════════════════════════════
// PLATFORM HELPERS
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
        console.error(`Error running ${scriptName}: ${e.message}`);
    }
}

function runCommand(cmd, args = []) {
    const { execSync } = require('child_process');
    try {
        const result = execSync(cmd, { 
            encoding: 'utf-8',
            stdio: 'pipe'
        });
        return result;
    } catch (e) {
        return e.message;
    }
}

// ═══════════════════════════════════════════════════════════
// TERMUX API WRAPPERS
// ═══════════════════════════════════════════════════════════

function termuxCommand(cmd, args = []) {
    if (!platform.canUseTermuxAPI()) {
        return { error: 'Termux:API not available' };
    }
    return runCommand(cmd, args);
}

// ═══════════════════════════════════════════════════════════
// HELP TEXT
// ═══════════════════════════════════════════════════════════

const helpText = `
╔══════════════════════════════════════════════════════════════════╗
║           🏛️ HIVE NATION CLI 🏛️                                  ║
║           Multi-Agent Government Framework                       ║
╠══════════════════════════════════════════════════════════════════╣
║  Platform: ${(platform.platform + ' ').padEnd(50)}║
╚══════════════════════════════════════════════════════════════════╝

USAGE:
  hive <command> [args]

COMMANDS:

  🏛️ GOVERNMENT
    gov          Government hub
    senate       Senate operations
    congress     Congress operations
    constitution View constitution
    law          Legal code
    orders       Executive orders
    official     Government officials

  🧠 PRODUCTION
    scoring <cmd>    Agent evaluation
    memory <cmd>     Memory persistence
    trace <cmd>      Execution tracing
    budget <cmd>     Resource management

  📱 TERMUX (Android)
    camera [n]       Take photo
    location         Get GPS
    clipboard [text] Get/set clipboard
    notify <title> <msg>  Show notification
    speak <text>     Text-to-speech
    sms <num> <msg>  Send SMS

  💻 SYSTEM
    platform        Show platform info
    status          System status
    mcp             Start MCP server
    install         Install Hive CLI

  📖 HELP
    help            Show this help
    docs            Open documentation

EXAMPLES:

  hive gov
  hive scoring score researcher "code" 8 9 8 9
  hive memory remember general "Remember this"
  hive platform

  # Termux-specific
  hive camera 0
  hive notify "Alert" "Something happened"
  hive speak "Hello from Termux"

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
    // Government
    gov: () => runScript('hive-gov.js'),
    senate: () => runScript('hive-senate.js'),
    congress: () => runScript('hive-congress.js'),
    constitution: () => runScript('hive-constitution.js'),
    law: () => runScript('hive-law.js'),
    orders: () => runScript('hive-orders.js'),
    official: () => runScript('hive-official.js'),
    news: () => runScript('hive-news.js'),

    // Production
    scoring: (args) => runScript('hive-scoring.js', args),
    memory: (args) => runScript('hive-memory.js', args),
    trace: (args) => runScript('hive-trace.js', args),
    budget: (args) => runScript('hive-budget.js', args),
    'model-config': () => runScript('hive-model-config.js'),

    // Termux commands
    camera: (args) => {
        if (!platform.canUseTermuxAPI()) {
            console.log('Termux:API not available');
            return;
        }
        const cameraId = args[0] || '0';
        const outputPath = args[1] || '/sdcard/hive-photo.jpg';
        runCommand(`termux-camera-photo -c ${cameraId} ${outputPath}`);
        console.log(`Photo saved: ${outputPath}`);
    },
    location: () => {
        if (!platform.canUseTermuxAPI()) {
            console.log('Termux:API not available');
            return;
        }
        const result = runCommand('termux-location');
        console.log(result);
    },
    clipboard: (args) => {
        if (!platform.canUseTermuxAPI()) {
            console.log('Termux:API not available');
            return;
        }
        if (args.length > 0) {
            runCommand(`termux-clipboard-set "${args.join(' ')}"`);
            console.log('Clipboard set');
        } else {
            const result = runCommand('termux-clipboard-get');
            console.log(result);
        }
    },
    notify: (args) => {
        if (!platform.canUseTermuxAPI()) {
            console.log('Termux:API not available');
            return;
        }
        if (args.length < 1) {
            console.log('Usage: hive notify <title> [message]');
            return;
        }
        const title = args[0];
        const message = args.slice(1).join(' ') || '';
        runCommand(`termux-notification --title "${title}" --content "${message}"`);
        console.log('Notification sent');
    },
    speak: (args) => {
        if (!platform.canUseTermuxAPI()) {
            console.log('Termux:API not available');
            return;
        }
        if (args.length < 1) {
            console.log('Usage: hive speak <text>');
            return;
        }
        runCommand(`termux-tts-speak "${args.join(' ')}"`);
        console.log('Speaking...');
    },
    sms: (args) => {
        if (!platform.canUseTermuxAPI()) {
            console.log('Termux:API not available');
            return;
        }
        if (args.length < 2) {
            console.log('Usage: hive sms <number> <message>');
            return;
        }
        const number = args[0];
        const message = args.slice(1).join(' ');
        runCommand(`termux-sms-send -n "${number}" "${message}"`);
        console.log('SMS sent');
    },
    vibrate: (args) => {
        if (!platform.canUseTermuxAPI()) {
            console.log('Termux:API not available');
            return;
        }
        const duration = args[0] || '500';
        runCommand(`termux-vibrate -d ${duration}`);
    },
    flashlight: (args) => {
        if (!platform.canUseTermuxAPI()) {
            console.log('Termux:API not available');
            return;
        }
        const action = args[0] || 'on';
        runCommand(`termux-torch ${action}`);
    },

    // System
    platform: () => platform.print(),
    status: () => {
        console.log('\n📊 Hive Status');
        platform.print();
        console.log('\n💾 Storage: /tmp/hive-*');
    },
    mcp: () => {
        console.log('Starting Hive MCP Server...');
        console.log('Use with Claude CLI: claude --mcp /path/to/hive mcp');
    },
    install: () => {
        console.log('\n📦 Hive Installation');
        if (platform.isTermux) {
            console.log('Termux detected - use: npm install -g hive-nation');
        } else {
            console.log('Run: npm install -g hive-nation');
        }
    },
    docs: () => {
        console.log('\n📖 Documentation at: docs/');
        console.log('  - START-HERE.md');
        console.log('  - SETUP-YOUR-MODELS.md');
        console.log('  - CROSS-PLATFORM-PLAN.md');
    },
    help: () => console.log(helpText + termuxHelp),
    '--help': () => console.log(helpText + termuxHelp),
    '-h': () => console.log(helpText + termuxHelp),

    // Version
    version: () => console.log('Hive Nation v1.6.1'),
    '--version': () => console.log('Hive Nation v1.6.1')
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