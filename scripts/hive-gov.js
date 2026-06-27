#!/usr/bin/env node
/**
 * HiveGov — The Main Government Hub
 * 
 * Ties together all Hive Nation government components:
 * - Constitution
 * - Congress
 * - Courts
 * - Executive
 * - Law
 * 
 * Production-ready for real project decision-making.
 */

const { execSync } = require('child_process');

const SCRIPTS = {
    constitution: './scripts/hive-constitution.js',
    congress: './scripts/hive-congress.js',
    senate: './scripts/hive-senate-pro.js',
    law: './scripts/hive-law.js'
};

function printBanner() {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║           🏛️ HIVE NATION GOVERNMENT v1.4.0 🏛️                    ║
║                                                                  ║
║   Production-ready government framework for real projects.       ║
║   Duck/bee/lobster names for fun + non-political reasons.        ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   📜 CONSTITUTION        The founding document + SOUL            ║
║   🏛️ CONGRESS          Full government operations              ║
║   ⚖️ SENATE             Advanced congressional features           ║
║   ⚖️ SUPREME COURT      Judicial branch + case law             ║
║   ⚡ EXECUTIVE          Presidential powers + cabinet           ║
║   📖 LAW                Complete statutory code                 ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

function printHelp() {
    printBanner();
    console.log(`
USAGE: node hive-gov.js <command> [args]

COMMANDS:

  📜 CONSTITUTION
    constitution full      View entire constitution
    constitution soul     View the SOUL
    constitution preamble View preamble
    constitution cast     Meet the characters
    constitution article 1-6  View specific article
    constitution bor      View Bill of Rights
    constitution amendments  View amendments 11-27
    constitution principles  View principles
    constitution search <term>  Search constitution

  🏛️ CONGRESS (Government Operations)
    congress structure   View government structure
    congress bill <title> Introduce legislation
    congress vote <id> <ch> <aye> <nay>  Vote
    congress sign <id>   President signs
    congress veto <id> <reason>  Presidential veto
    congress override <id> <senate> <house>  Override veto
    congress eo <title>  Issue executive order
    congress case <name> Supreme Court case
    congress decision <id> <ruling>  Court decision
    congress cabinet <topic>  Cabinet meeting
    congress impeachment <who> <charges>  Impeachment

  ⚖️ SENATE (Advanced Features)
    senate bill <title> Introduce bill
    senate hearing <committee> <topic>  Hold hearing
    senate testimony <id> <text>  Witness testimony
    senate session <topic>  Floor debate session
    senate speak <id> <senator> <pro|con> <speech>  Speech
    senate profile <senator>  Senator profile
    senate leadership  Party leadership
    senate constit <senator>  Constituency info

  ⚖️ SUPREME COURT
    court case <name>   Accept case
    court decision <id> <ruling> <majority> <minority>  Decision
    court justice <n>   View justice profile

  ⚡ EXECUTIVE
    executive orders     List executive orders
    executive sign <bill>  Sign bill into law
    executive veto <bill>  Veto legislation
    executive pardon <name>  Grant pardon
    executive cabinet   Cabinet meeting

  📖 LAW (Statutory Code)
    law statutes       View all statutes
    law title <name>   View title (elections, rights, etc.)
    law section <n>    View section (1-1, 2-3, etc.)
    law research <q>  Research legal provisions
    law opinion <q>    Legal memorandum
    law cases          List registered cases
    law register <name> Register case
    law decide <id> <ruling> <citation>  Decide case

  🏛️ FULL GOVERNMENT
    government start    Start full government simulation
    government status   Current government status

EXAMPLES:

  node hive-gov.js constitution full
  node hive-gov.js congress structure
  node hive-gov.js congress bill "Privacy Protection Act"
  node hive-gov.js law research "freedom of speech"
  node hive-gov.js law opinion "Can Congress regulate AI?"

QUICK START:
  node hive-gov.js government start
`);
}

function run(script, args = []) {
    try {
        const cmd = `node ${script} ${args.join(' ')}`;
        const result = execSync(cmd, { encoding: 'utf-8', cwd: __dirname });
        console.log(result);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
}

function main() {
    const cmd = process.argv[2];
    const args = process.argv.slice(3);

    if (!cmd || cmd === 'help') {
        printHelp();
        return;
    }

    // Constitution commands
    if (cmd === 'constitution' || cmd === 'const') {
        run(SCRIPTS.constitution, args);
        return;
    }

    // Congress commands
    if (cmd === 'congress') {
        run(SCRIPTS.congress, args);
        return;
    }

    // Senate commands
    if (cmd === 'senate') {
        run(SCRIPTS.senate, args);
        return;
    }

    // Law commands
    if (cmd === 'law') {
        run(SCRIPTS.law, args);
        return;
    }

    // Government status
    if (cmd === 'government' && args[0] === 'status') {
        printBanner();
        console.log('\n📊 GOVERNMENT STATUS\n');
        console.log('Constitution: ACTIVE');
        console.log('Congress: OPERATIONAL');
        console.log('Executive: QUACKFORD McDUCK');
        console.log('Judiciary: ACTIVE');
        console.log('Law: READY FOR DECISIONS');
        return;
    }

    // Model preferences
    if (cmd === 'models' || (cmd === 'model' && args[0] === 'prefs')) {
        printBanner();
        console.log(`
📊 HIVE NATION MODEL PREFERENCES

`);
        console.log(`LOCAL MODELS (Free, uses local GPU/RAM):
`);
        console.log(`  Qwen 3.6 35B A3B (Windows PC)`);
        console.log(`    • Terminal/CLI tasks (Terminal-Bench leader: 61.6%)`);
        console.log(`    • Graduate reasoning (GPQA Diamond: 90.4%)`);
        console.log(`    • Fastest local (~158 tok/s)
`);
        console.log(`  Google Gemma 4 26B A4B (Mac)`);
        console.log(`    • Vision tasks (native multimodal)`);
        console.log(`    • Android development (tool-calling trained)`);
        console.log(`    • Privacy-sensitive tasks
`);
        console.log(`CLOUD MODELS (API):
`);
        console.log(`  MiniMax M2.7 — General agents, research`);
        console.log(`  Kimi K2.5 — Vision + coding`);
        console.log(`  gpt-5.4 — Premium reasoning
`);
        console.log(`See MODEL-PREFERENCES.md for full routing rules.`);
        return;
    }

    // Default help
    printHelp();
}

main();
