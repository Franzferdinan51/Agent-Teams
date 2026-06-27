#!/usr/bin/env node
/**
 * team-cli.ts — Duck CLI integration for AgentTeam
 * Run with: npx ts-node src/team-cli.ts <command> [args]
 * 
 * Or compile with: npx tsc src/team-cli.ts
 */

import * as readline from 'readline';
import TeamOrchestrator, { Task, TeamMember, Session } from './orchestrator/TeamOrchestrator.js';

const TEAM_DIR = process.env.TEAM_DIR || `${process.env.HOME}/Desktop/AgentTeam`;
const orchestrator = new TeamOrchestrator({ workspace: `${TEAM_DIR}/workspace` });

// Colors
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(msg: string, color: keyof typeof colors = 'reset') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function error(msg: string) {
    log(`[ERROR] ${msg}`, 'red');
}

function success(msg: string) {
    log(`[OK] ${msg}`, 'green');
}

function info(msg: string) {
    log(`[INFO] ${msg}`, 'blue');
}

// CLI Commands
async function cmdInit(args: string[]) {
    const name = args.join(' ');
    if (!name) {
        error('Session name required');
        console.log('Usage: team-cli init <project-name>');
        process.exit(1);
    }
    
    const session = await orchestrator.initSession(name);
    success(`Session '${name}' initialized`);
    console.log(`ID: ${session.id}`);
    console.log(`Workspace: ${TEAM_DIR}/workspace`);
    console.log('');
    console.log('Ready! Commands:');
    console.log('  team-cli add <task> [role]   — Add task');
    console.log('  team-cli list                 — List tasks');
    console.log('  team-cli status               — Full status');
    console.log('  team-cli spawn <role> <task>  — Spawn agent');
}

async function cmdAdd(args: string[]) {
    // Parse role from args
    const validRoles = ['researcher', 'coder', 'reviewer', 'writer', 'any'];
    let role: Task['role'] = 'any';
    
    // Check if last arg is a role
    const lastArg = args[args.length - 1];
    if (validRoles.includes(lastArg as typeof validRoles[number])) {
        role = lastArg as Task['role'];
        args.pop();
    }
    
    const taskText = args.join(' ');
    if (!taskText) {
        error('Task description required');
        console.log('Usage: team-cli add <task-description> [role]');
        console.log('Roles: researcher, coder, reviewer, writer, any');
        process.exit(1);
    }
    
    const task = orchestrator.addTask(taskText, role);
    success(`Task added: ${taskText}`);
    console.log(`ID: ${task.id}`);
    console.log(`Role: ${task.role}`);
}

async function cmdList() {
    const status = orchestrator.getStatus();
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                     TASK QUEUE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    
    const queue = orchestrator.getTaskQueue();
    
    if (queue.length === 0) {
        console.log('  No pending tasks');
    } else {
        queue.forEach((task, i) => {
            const statusIcon = task.status === 'pending' ? '○' : 
                             task.status === 'in_progress' ? '◐' : 
                             task.status === 'failed' ? '✗' : '?';
            const statusColor = task.status === 'pending' ? 'yellow' :
                               task.status === 'in_progress' ? 'cyan' :
                               task.status === 'failed' ? 'red' : 'reset';
            
            console.log(`  ${i + 1}. [${statusIcon}] [${task.role}] ${task.task}`);
            console.log(`      ID: ${task.id}`);
            if (task.assignedTo) console.log(`      → ${task.assignedTo}`);
            console.log('');
        });
    }
    
    // Show completed count
    const doneFile = `${TEAM_DIR}/workspace/tasks/completed.json`;
    try {
        const completed = JSON.parse(require('fs').readFileSync(doneFile, 'utf-8'));
        if (completed.length > 0) {
            console.log('───────────────────────────────────────────────────────────────');
            console.log(`  Completed: ${completed.length} tasks`);
        }
    } catch {}
    
    console.log('');
}

async function cmdStatus() {
    const status = orchestrator.getStatus();
    
    if (!status.session) {
        error('No active session');
        console.log('Run: team-cli init <project-name>');
        process.exit(1);
    }
    
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                    🤖 AGENT TEAM STATUS                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝');
    console.log('');
    
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log(`│  Session: ${status.session.name}`);
    console.log(`│  Status:  ${status.session.status === 'active' ? colors.green : colors.red}${status.session.status}${colors.reset}`);
    console.log(`│  Started: ${status.session.started}`);
    console.log(`│  Lead:    ${status.session.lead}`);
    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log('');
    
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│  📋 TASK QUEUE');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log(`│  Pending:      ${status.tasks.pending}`);
    console.log(`│  In Progress:  ${status.tasks.inProgress}`);
    console.log(`│  Completed:    ${status.tasks.completed}`);
    console.log(`│  Failed:       ${status.tasks.failed}`);
    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log('');
    
    // Members
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│  👥 TEAM MEMBERS');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    status.members.forEach(m => {
        const statusColor = m.status === 'idle' ? colors.green : 
                           m.status === 'busy' ? colors.yellow : colors.red;
        const statusText = m.status === 'idle' ? '🟢 idle' : 
                         m.status === 'busy' ? '🟡 busy' : '🔴 done';
        console.log(`│  ${m.role.padEnd(12)} ${m.name.padEnd(15)} ${statusText}${colors.reset}`);
        if (m.currentTask) console.log(`│              Task: ${m.currentTask}`);
    });
    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log('');
    
    // Memory preview
    const memory = orchestrator.getMemory();
    if (memory) {
        console.log('┌─────────────────────────────────────────────────────────────────┐');
        console.log('│  🧠 SHARED MEMORY (preview)');
        console.log('├─────────────────────────────────────────────────────────────────┤');
        const preview = memory.split('\n').slice(0, 8).join('\n');
        console.log(`│  ${preview.replace(/\n/g, '\n│  ')}`);
        console.log('└─────────────────────────────────────────────────────────────────┘');
        console.log('');
    }
    
    // Quick commands
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│  ⚡ QUICK COMMANDS');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│  Add task:    team-cli add "<task>" [role]');
    console.log('│  List tasks:  team-cli list');
    console.log('│  Spawn agent: team-cli spawn <role> "<task>"');
    console.log('│  End session: team-cli end');
    console.log('└─────────────────────────────────────────────────────────────────┘');
    console.log('');
}

async function cmdSpawn(args: string[]) {
    if (args.length < 2) {
        error('Role and task required');
        console.log('Usage: team-cli spawn <role> <task>');
        console.log('Roles: researcher, coder, reviewer, writer');
        process.exit(1);
    }
    
    const role = args[0] as Task['role'];
    const task = args.slice(1).join(' ');
    
    if (!['researcher', 'coder', 'reviewer', 'writer'].includes(role)) {
        error(`Invalid role: ${role}`);
        console.log('Roles: researcher, coder, reviewer, writer');
        process.exit(1);
    }
    
    // Add task to queue
    const taskObj = orchestrator.addTask(task, role);
    success(`Task added: ${task}`);
    console.log(`Task ID: ${taskObj.id}`);
    console.log('');
    
    // Generate spawn command for duck-cli
    info('To spawn this agent, run in duck-cli:');
    console.log('');
    console.log(`  sessions_spawn({`);
    console.log(`    task: "${task}",`);
    console.log(`    model: "minimax/MiniMax-M2.7",`);
    console.log(`    label: "${role}-agent"`);
    console.log(`  })`);
    console.log('');
    
    // For OpenClaw ACP runtime:
    info('Or via ACP:');
    console.log('');
    console.log(`  sessions_spawn({`);
    console.log(`    task: "${task}",`);
    console.log(`    runtime: "acp",`);
    console.log(`    agentId: "${role}"`);
    console.log(`  })`);
    console.log('');
}

async function cmdClaim(args: string[]) {
    if (args.length < 2) {
        error('Task ID and member required');
        console.log('Usage: team-cli claim <task-id> <member-id>');
        process.exit(1);
    }
    
    const [taskId, memberId] = args;
    const task = orchestrator.claimTask(taskId, memberId);
    
    if (task) {
        success(`Task ${taskId} claimed by ${memberId}`);
    } else {
        error(`Task ${taskId} not found`);
    }
}

async function cmdComplete(args: string[]) {
    const taskId = args[0];
    const result = args.slice(1).join(' ');
    
    if (!taskId) {
        error('Task ID required');
        console.log('Usage: team-cli complete <task-id> [result]');
        process.exit(1);
    }
    
    const task = orchestrator.completeTask(taskId, result);
    
    if (task) {
        success(`Task ${taskId} completed!`);
        if (result) console.log(`Result: ${result}`);
    } else {
        error(`Task ${taskId} not found`);
    }
}

async function cmdEnd() {
    const status = orchestrator.getStatus();
    if (!status.session) {
        error('No active session');
        process.exit(1);
    }
    
    status.session.status = 'ended';
    success(`Session '${status.session.name}' ended`);
    
    // Archive
    const archiveFile = `${TEAM_DIR}/workspace/logs/session-${Date.now()}.json`;
    require('fs').writeFileSync(archiveFile, JSON.stringify(status.session, null, 2));
    console.log(`Archived to: ${archiveFile}`);
}

// Main CLI router
async function main() {
    const [command, ...args] = process.argv.slice(2);
    
    // Load existing session for most commands
    if (command && !['init', 'help', '--help', '-h'].includes(command)) {
        orchestrator.loadSession();
    }
    
    switch (command) {
        case 'init':
            await cmdInit(args);
            break;
        case 'add':
            await cmdAdd(args);
            break;
        case 'list':
            await cmdList();
            break;
        case 'status':
            await cmdStatus();
            break;
        case 'spawn':
            await cmdSpawn(args);
            break;
        case 'claim':
            await cmdClaim(args);
            break;
        case 'complete':
        case 'done':
            await cmdComplete(args);
            break;
        case 'end':
            await cmdEnd();
            break;
        case 'help':
        case '--help':
        case '-h':
        default:
            console.log('');
            console.log('🤖 AgentTeam CLI');
            console.log('');
            console.log('Usage: team-cli <command> [args]');
            console.log('');
            console.log('Commands:');
            console.log('  init <name>           Start new session');
            console.log('  add <task> [role]    Add task (role: researcher/coder/reviewer/writer/any)');
            console.log('  list                  List pending tasks');
            console.log('  status                Full team status');
            console.log('  spawn <role> <task>  Show spawn command');
            console.log('  claim <id> <member>  Claim a task');
            console.log('  complete <id> [msg]   Mark task complete');
            console.log('  end                   End session');
            console.log('');
            break;
    }
}

main().catch(console.error);
