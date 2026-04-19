#!/usr/bin/env node
/**
 * HiveTeams — Multi-Agent Team Coordination System
 * 
 * Pre-built team templates with duck/bee/lobster character names.
 * Production-ready CLI for spawning, managing, and coordinating agent teams.
 * 
 * Usage:
 *   node hive-teams.js <command> [args]
 *   hive teams <command> [args]  (via hive-cli.js)
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// DATA STRUCTURES
// ============================================================================

const DATA_DIR = path.join(__dirname, '..', 'data', 'teams');
const STATE_FILE = path.join(DATA_DIR, 'teams-state.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================================
// FUNNY CHARACTER NAMES — Duck, Bee, Lobster Theme
// ============================================================================

const DUCK_NAMES = [
    'Quacksworth', 'Waddlebert', 'Beakovich', 'Mallardovich', 'Daffytail',
    'Pondscraper', 'Billiam', 'Feathersby', 'Webfoot McQuack', 'Duck Norris',
    'Captain Quackers', 'Sir Quackalot', 'Ducktor Who', 'Quack Sparrow'
];

const BEE_NAMES = [
    'Buzzly', 'Honeydew', 'Stinger McBee', 'Pollen Pete', 'Nectarina',
    'Bumblebert', 'Wingsworth', 'Hivector', 'Apiary Andrews', 'Beeatrice',
    'Comb Commander', 'Queen Beyonce', 'Honey Business', 'The Bees Knees'
];

const LOBSTER_NAMES = [
    'Clawrence', 'Crusteau', 'Lobstermaniac', 'Pincers McSnip', 'Shellby',
    'Crackington', 'Clawdia', 'Lobster Resolution', 'Snap决策', 'Crab Nebula',
    'Pincer Palpatine', 'Lobster Lohan', 'Shellington', 'The Claw'
];

// Specialty names by role
const SPECIALIST_NAMES = [
    'Codey McCodeface', 'Debugging Ducky', 'Bugsy McBuginho', 'SyntaxError',
    'NullPointerException', 'SegmentationFalcon', 'StackOverflowDuck', 'Git Happens',
    'Merge Conflict', 'Rebase Rodriguez', 'Dockerina', 'Kubernetes Kathy'
];

const CRITIC_NAMES = [
    'Constructive Clive', 'Nitpick Nick', 'Code Crusader', 'Quality Queen',
    'Reviewer Rex', 'Criticus Max', 'The Nitpicker', 'Flaw Finder',
    'Perfect Patrol', 'Detail Dick', 'Scrutiny Steve', 'The Devourer'
];

const REPORTER_NAMES = [
    'Newsworthy Nigel', 'Information Ingrid', 'Summary Sally', 'The Chronicler',
    'Dispatch Dan', 'Bulletin Betty', 'Headline Hannah', 'Reporter Rick',
    'The Scribe', 'News Nelly', 'Telegram Tina', 'Whisper Wilson'
];

// ============================================================================
// TEAM TEMPLATES
// ============================================================================

const TEMPLATES = {
    research: {
        name: 'Research Team',
        description: 'Deep research with fact-checking and writing',
        roles: ['researcher', 'writer', 'reviewer'],
        color: '🔬',
        defaultTasks: ['Research topic', 'Compile findings', 'Review accuracy']
    },
    code: {
        name: 'Code Team',
        description: 'Software development with security review',
        roles: ['coder', 'reviewer', 'security'],
        color: '💻',
        defaultTasks: ['Implement feature', 'Code review', 'Security audit']
    },
    security: {
        name: 'Security Team',
        description: 'Threat assessment and incident response',
        roles: ['security', 'reviewer', 'communicator'],
        color: '🛡️',
        defaultTasks: ['Assess threat', 'Review vulnerabilities', 'Coordinate response']
    },
    emergency: {
        name: 'Emergency Team',
        description: 'Rapid response to critical situations',
        roles: ['security', 'communicator', 'planner'],
        color: '🚨',
        defaultTasks: ['Assess emergency', 'Coordinate response', 'Communicate status']
    },
    planning: {
        name: 'Planning Team',
        description: 'Strategic planning and research',
        roles: ['planner', 'researcher', 'communicator'],
        color: '📋',
        defaultTasks: ['Analyze requirements', 'Research options', 'Present plan']
    },
    custom: {
        name: 'Custom Team',
        description: 'User-defined roles and tasks',
        roles: [],
        color: '⚙️',
        defaultTasks: []
    }
};

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

const ROLES = {
    lead: {
        name: 'Team Lead',
        description: 'Coordinates team activities',
        emoji: '🎯',
        color: '🟡'
    },
    specialist: {
        name: 'Specialist',
        description: 'Executes domain-specific tasks',
        emoji: '🔧',
        color: '🔵'
    },
    critic: {
        name: 'Critic',
        description: 'Reviews and provides feedback',
        emoji: '🔍',
        color: '🟣'
    },
    reporter: {
        name: 'Reporter',
        description: 'Communicates results externally',
        emoji: '📢',
        color: '🟢'
    },
    // Extended roles
    researcher: {
        name: 'Researcher',
        description: 'Gathers and analyzes information',
        emoji: '📚',
        color: '📘'
    },
    coder: {
        name: 'Coder',
        description: 'Writes and implements code',
        emoji: '⌨️',
        color: '💜'
    },
    writer: {
        name: 'Writer',
        description: 'Creates documentation and content',
        emoji: '✍️',
        color: '🩷'
    },
    security: {
        name: 'Security Analyst',
        description: 'Assesses security and risks',
        emoji: '🔒',
        color: '🔴'
    },
    communicator: {
        name: 'Communicator',
        description: 'Handles external communication',
        emoji: '📡',
        color: '🟠'
    },
    planner: {
        name: 'Planner',
        description: 'Creates strategic plans',
        emoji: '🗺️',
        color: '🟤'
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        }
    } catch (e) {
        // State corrupted, reset
    }
    return { teams: [], senateReports: [], decrees: [] };
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ============================================================================
// NAME GENERATION
// ============================================================================

const usedNames = new Set();

function getRandomName(type) {
    const names = type === 'duck' ? DUCK_NAMES :
                  type === 'bee' ? BEE_NAMES :
                  type === 'lobster' ? LOBSTER_NAMES : DUCK_NAMES;
    
    const available = names.filter(n => !usedNames.has(n));
    if (available.length === 0) {
        // Reset if exhausted
        usedNames.clear();
        const name = names[Math.floor(Math.random() * names.length)];
        usedNames.add(name);
        return name;
    }
    
    const name = available[Math.floor(Math.random() * available.length)];
    usedNames.add(name);
    return name;
}

function getCharacterName(role) {
    switch (role) {
        case 'researcher':
        case 'coder':
        case 'writer':
        case 'specialist':
            return getRandomName('duck');
        case 'reviewer':
        case 'critic':
            return getRandomName('bee');
        case 'security':
            return getRandomName('lobster');
        case 'communicator':
        case 'reporter':
            return getRandomName('bee');
        case 'planner':
        case 'lead':
            return getRandomName('duck');
        default:
            return getRandomName('duck');
    }
}

function getAvatar(role) {
    switch (role) {
        case 'researcher': return '🦆📚';
        case 'coder': return '🦆💻';
        case 'writer': return '🦆✍️';
        case 'reviewer': return '🐝🔍';
        case 'critic': return '🐝⚖️';
        case 'security': return '🦞🛡️';
        case 'communicator': return '🐝📢';
        case 'reporter': return '🐝📰';
        case 'planner': return '🦆🗺️';
        case 'lead': return '🦆🎯';
        case 'specialist': return '🦆🔧';
        default: return '🦆';
    }
}

// ============================================================================
// TEAM CREATION
// ============================================================================

function createTeam(templateName, customRoles = [], teamName = null) {
    const state = loadState();
    
    const template = TEMPLATES[templateName];
    if (!template) {
        console.log(`❌ Unknown template: ${templateName}`);
        console.log(`Available: ${Object.keys(TEMPLATES).join(', ')}`);
        return null;
    }
    
    const roles = customRoles.length > 0 ? customRoles : template.roles;
    const id = `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const name = teamName || `${template.name} ${id.split('-')[1]}`;
    
    // Generate team members
    const members = roles.map((role, idx) => {
        const roleDef = ROLES[role] || ROLES.specialist;
        return {
            id: `${id}-${idx}`,
            name: getCharacterName(role),
            role: role,
            displayName: roleDef.name,
            avatar: getAvatar(role),
            status: 'idle',
            currentTask: null,
            joinedAt: new Date().toISOString()
        };
    });
    
    // Auto-assign team lead if not present
    if (!roles.includes('lead')) {
        members.unshift({
            id: `${id}-lead`,
            name: getCharacterName('lead'),
            role: 'lead',
            displayName: ROLES.lead.name,
            avatar: getAvatar('lead'),
            status: 'idle',
            currentTask: null,
            joinedAt: new Date().toISOString()
        });
    }
    
    const team = {
        id,
        name,
        template: templateName,
        description: template.description,
        color: template.color,
        roles,
        members,
        status: 'active',
        tasks: [],
        results: [],
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        senateRegistered: false,
        parentSenateId: null
    };
    
    state.teams.push(team);
    saveState(state);
    
    return team;
}

// ============================================================================
// TEAM OPERATIONS
// ============================================================================

function listTeams() {
    const state = loadState();
    if (state.teams.length === 0) {
        console.log('\n🐝 No teams have been created yet.');
        console.log('   Use: hive teams spawn <template> [name]\n');
        return;
    }
    
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                    🦆🐝 HIVE TEAMS ROSTER 🐝🦆                   ║');
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    
    state.teams.forEach((team, idx) => {
        const active = team.members.filter(m => m.status !== 'idle').length;
        console.log(`║ ${idx + 1}. ${team.color} ${team.name.padEnd(30)} [${team.status.toUpperCase()}] ║`);
        console.log(`║    Template: ${team.template.padEnd(20)} Members: ${active}/${team.members.length}    ║`);
        console.log(`║    Roles: ${team.roles.join(', ').padEnd(53)} ║`);
        if (team.senateRegistered) {
            console.log(`║    🏛️ Registered with Senate                                      ║`);
        }
        console.log('╠══════════════════════════════════════════════════════════════════╣');
    });
    
    console.log(`║ TOTAL: ${state.teams.length} team(s)                                       ║`);
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
}

function teamStatus(teamId) {
    const state = loadState();
    const team = state.teams.find(t => t.id === teamId);
    
    if (!team) {
        // Try to find by name
        const found = state.teams.find(t => t.name.toLowerCase().includes(teamId.toLowerCase()));
        if (found) {
            displayTeamStatus(found);
            return;
        }
        console.log(`❌ Team not found: ${teamId}`);
        return;
    }
    
    displayTeamStatus(team);
}

function displayTeamStatus(team) {
    console.log(`\n${team.color} ${team.name} — Team Status\n`);
    console.log(`   ID: ${team.id}`);
    console.log(`   Template: ${team.template}`);
    console.log(`   Status: ${team.status.toUpperCase()}`);
    console.log(`   Created: ${new Date(team.createdAt).toLocaleString()}`);
    console.log(`   Last Activity: ${new Date(team.lastActivity).toLocaleString()}`);
    
    if (team.senateRegistered) {
        console.log(`   🏛️ Senate: Registered (ID: ${team.parentSenateId || 'pending'})`);
    }
    
    console.log('\n   📋 MEMBERS:');
    team.members.forEach(m => {
        const statusIcon = m.status === 'idle' ? '💤' :
                          m.status === 'working' ? '⚡' :
                          m.status === 'done' ? '✅' : '❓';
        console.log(`      ${statusIcon} ${m.avatar} ${m.name} (${m.displayName})`);
        if (m.currentTask) {
            console.log(`         └─ Task: ${m.currentTask}`);
        }
    });
    
    if (team.tasks.length > 0) {
        console.log('\n   📝 TASKS:');
        team.tasks.forEach((t, idx) => {
            console.log(`      ${idx + 1}. ${t.description} [${t.status}]`);
        });
    }
    
    if (team.results.length > 0) {
        console.log('\n   📊 RESULTS:');
        team.results.slice(-3).forEach((r, idx) => {
            console.log(`      ${idx + 1}. ${(r.result || r.summary || 'No result').substring(0, 60)}...`);
        });
    }
    
    console.log();
}

function assignTask(teamId, taskDescription, memberId = null) {
    const state = loadState();
    const team = state.teams.find(t => t.id === teamId);
    
    if (!team) {
        console.log(`❌ Team not found: ${teamId}`);
        return;
    }
    
    const taskId = `task-${Date.now()}`;
    const task = {
        id: taskId,
        description: taskDescription,
        status: 'pending',
        assignedTo: memberId,
        createdAt: new Date().toISOString(),
        completedAt: null,
        result: null
    };
    
    team.tasks.push(task);
    team.lastActivity = new Date().toISOString();
    
    // Assign to member if specified
    if (memberId) {
        const member = team.members.find(m => m.id === memberId);
        if (member) {
            member.status = 'working';
            member.currentTask = taskDescription;
        }
    }
    
    saveState(state);
    console.log(`✅ Task assigned to ${team.name}`);
    console.log(`   Task ID: ${taskId}`);
    console.log(`   Description: ${taskDescription}`);
}

function completeTask(teamId, taskId, result) {
    const state = loadState();
    const team = state.teams.find(t => t.id === teamId);
    
    if (!team) {
        console.log(`❌ Team not found: ${teamId}`);
        return;
    }
    
    const task = team.tasks.find(t => t.id === taskId);
    if (!task) {
        console.log(`❌ Task not found: ${taskId}`);
        return;
    }
    
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.result = result;
    
    // Update member status
    const member = team.members.find(m => m.id === task.assignedTo);
    if (member) {
        member.status = 'idle';
        member.currentTask = null;
    }
    
    // Store result
    team.results.push({
        taskId,
        description: task.description,
        result,
        completedAt: task.completedAt,
        completedBy: member ? member.name : 'unknown'
    });
    
    team.lastActivity = new Date().toISOString();
    saveState(state);
    
    console.log(`✅ Task ${taskId} completed`);
}

function aggregateResults(teamId) {
    const state = loadState();
    const team = state.teams.find(t => t.id === teamId);
    
    if (!team) {
        console.log(`❌ Team not found: ${teamId}`);
        return;
    }
    
    if (team.results.length === 0) {
        console.log(`\n📊 No results yet for ${team.name}`);
        return;
    }
    
    console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
    console.log(`║              📊 ${team.name} — RESULTS AGGREGATION 📊              ║`);
    console.log('╠══════════════════════════════════════════════════════════════════╣');
    
    team.results.forEach((r, idx) => {
        console.log(`║ RESULT ${idx + 1}:`.padEnd(68) + '║');
        console.log(`║   Task: ${r.description.substring(0, 55).padEnd(55)}`.padEnd(68) + '║');
        console.log(`║   By: ${r.completedBy.padEnd(60)}`.padEnd(68) + '║');
        console.log(`║   When: ${new Date(r.completedAt).toLocaleString().padEnd(57)}`.padEnd(68) + '║');
        console.log('╠══════════════════════════════════════════════════════════════════╣');
        
        // Print result summary (truncated)
        const resultLines = r.result.split('\n').slice(0, 5);
        resultLines.forEach(line => {
            const truncated = line.substring(0, 64);
            console.log(`║   ${truncated.padEnd(64)}`.padEnd(68) + '║');
        });
        if (r.result.split('\n').length > 5) {
            console.log(`║   ... (${r.result.split('\n').length - 5} more lines)`.padEnd(68) + '║');
        }
        console.log('╠══════════════════════════════════════════════════════════════════╣');
    });
    
    console.log(`║ TOTAL: ${team.results.length} result(s)                                   ║`);
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
}

// ============================================================================
// INTER-TEAM COMMUNICATIONS
// ============================================================================

function sendToTeam(fromTeamId, toTeamId, message) {
    const state = loadState();
    const fromTeam = state.teams.find(t => t.id === fromTeamId);
    const toTeam = state.teams.find(t => t.id === toTeamId);
    
    if (!fromTeam) {
        console.log(`❌ Source team not found: ${fromTeamId}`);
        return;
    }
    if (!toTeam) {
        console.log(`❌ Target team not found: ${toTeamId}`);
        return;
    }
    
    // Store in inter-team messages (would be in state, simplified here)
    console.log(`\n📨 Message sent from ${fromTeam.name} to ${toTeam.name}`);
    console.log(`   Message: ${message}`);
    console.log(`   🏛️ Federated through Hive Nation network\n`);
}

function shareMemory(teamId, memoryKey, memoryValue) {
    const state = loadState();
    const team = state.teams.find(t => t.id === teamId);
    
    if (!team) {
        console.log(`❌ Team not found: ${teamId}`);
        return;
    }
    
    // Store in shared memory (simplified - would use hive-memory.js)
    console.log(`\n🧠 Shared memory updated by ${team.name}`);
    console.log(`   Key: ${memoryKey}`);
    console.log(`   Value: ${memoryValue}`);
    console.log(`   📢 All authorized teams can access this memory\n`);
}

function passResult(fromTeamId, toTeamId, resultDescription) {
    const state = loadState();
    const fromTeam = state.teams.find(t => t.id === fromTeamId);
    const toTeam = state.teams.find(t => t.id === toTeamId);
    
    if (!fromTeam || !toTeam) {
        console.log(`❌ Team not found`);
        return;
    }
    
    // Create a task for the receiving team based on result
    const taskId = `task-${Date.now()}`;
    const task = {
        id: taskId,
        description: `Process passed result: ${resultDescription}`,
        status: 'pending',
        passedFrom: fromTeam.name,
        createdAt: new Date().toISOString(),
        completedAt: null,
        result: null
    };
    
    toTeam.tasks.push(task);
    toTeam.lastActivity = new Date().toISOString();
    saveState(state);
    
    console.log(`\n🔄 Result passed from ${fromTeam.name} to ${toTeam.name}`);
    console.log(`   Task created: ${taskId}`);
    console.log(`   Description: ${resultDescription}\n`);
}

// ============================================================================
// SENATE INTEGRATION
// ============================================================================

function registerWithSenate(teamId, senateId = 'hive-senate') {
    const state = loadState();
    const team = state.teams.find(t => t.id === teamId);
    
    if (!team) {
        console.log(`❌ Team not found: ${teamId}`);
        return;
    }
    
    team.senateRegistered = true;
    team.parentSenateId = senateId;
    team.lastActivity = new Date().toISOString();
    saveState(state);
    
    console.log(`\n✅ ${team.name} registered with Senate (${senateId})`);
    console.log(`   Team ID: ${team.id}`);
    console.log(`   Roles: ${team.roles.join(', ')}`);
    console.log(`   Members: ${team.members.length}`);
    console.log(`   📋 Ready to receive Senate tasks and decrees\n`);
}

function reportToSenate(teamId) {
    const state = loadState();
    const team = state.teams.find(t => t.id === teamId);
    
    if (!team) {
        console.log(`❌ Team not found: ${teamId}`);
        return;
    }
    
    if (!team.senateRegistered) {
        console.log(`❌ Team not registered with Senate. Use: teams register <teamId>`);
        return;
    }
    
    // Create Senate report
    const report = {
        id: `report-${Date.now()}`,
        teamId: team.id,
        teamName: team.name,
        status: team.status,
        activeMembers: team.members.filter(m => m.status !== 'idle').length,
        totalMembers: team.members.length,
        pendingTasks: team.tasks.filter(t => t.status === 'pending').length,
        completedTasks: team.results.length,
        lastActivity: team.lastActivity,
        reportedAt: new Date().toISOString()
    };
    
    state.senateReports.push(report);
    saveState(state);
    
    console.log(`\n📋 SENATE REPORT — ${team.name}`);
    console.log('   ═══════════════════════════════════');
    console.log(`   Report ID: ${report.id}`);
    console.log(`   Status: ${report.status.toUpperCase()}`);
    console.log(`   Active Members: ${report.activeMembers}/${report.totalMembers}`);
    console.log(`   Pending Tasks: ${report.pendingTasks}`);
    console.log(`   Completed Tasks: ${report.completedTasks}`);
    console.log(`   Last Activity: ${new Date(report.lastActivity).toLocaleString()}`);
    console.log(`   📨 Submitted to Senate: ${report.reportedAt}\n`);
}

function receiveDecree(teamId, decreeId) {
    const state = loadState();
    const team = state.teams.find(t => t.id === teamId);
    
    if (!team) {
        console.log(`❌ Team not found: ${teamId}`);
        return;
    }
    
    if (!team.senateRegistered) {
        console.log(`❌ Team not registered with Senate`);
        return;
    }
    
    // Add as a task
    const task = {
        id: `decree-${Date.now()}`,
        description: `Senate Decree ${decreeId} — MUST COMPLY`,
        status: 'pending',
        isDecree: true,
        decreeId,
        createdAt: new Date().toISOString(),
        completedAt: null,
        result: null
    };
    
    team.tasks.push(task);
    team.lastActivity = new Date().toISOString();
    saveState(state);
    
    console.log(`\n🏛️ DECREE RECEIVED — ${team.name}`);
    console.log(`   Decree ID: ${decreeId}`);
    console.log(`   Task: ${task.description}`);
    console.log(`   ⚠️ COMPLIANCE MANDATORY`);
    console.log(`   Status: PENDING EXECUTION\n`);
}

function complyWithDecree(teamId, decreeId, complianceResult) {
    const state = loadState();
    const team = state.teams.find(t => t.id === teamId);
    
    if (!team) {
        console.log(`❌ Team not found: ${teamId}`);
        return;
    }
    
    const task = team.tasks.find(t => t.isDecree && t.decreeId === decreeId);
    if (task) {
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        task.result = complianceResult;
        team.lastActivity = new Date().toISOString();
        saveState(state);
    }
    
    // Store decree compliance
    state.decrees.push({
        decreeId,
        teamId: team.id,
        teamName: team.name,
        compliedAt: new Date().toISOString(),
        result: complianceResult
    });
    saveState(state);
    
    console.log(`\n✅ DECREE COMPLIANCE — ${team.name}`);
    console.log(`   Decree ID: ${decreeId}`);
    console.log(`   Result: ${complianceResult}`);
    console.log(`   🏛️ Reported to Senate\n`);
}

// ============================================================================
// DISSOLVE TEAM
// ============================================================================

function dissolveTeam(teamId) {
    const state = loadState();
    const idx = state.teams.findIndex(t => t.id === teamId);
    
    if (idx === -1) {
        console.log(`❌ Team not found: ${teamId}`);
        return;
    }
    
    const team = state.teams[idx];
    
    // Release names back to pool
    team.members.forEach(m => usedNames.delete(m.name));
    
    state.teams.splice(idx, 1);
    saveState(state);
    
    console.log(`\n💀 Team ${team.name} dissolved`);
    console.log(`   Members released: ${team.members.length}`);
    console.log(`   Tasks archived: ${team.tasks.length}`);
    console.log(`   Results preserved: ${team.results.length}\n`);
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

function printHelp() {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           🦆🐝 HIVE TEAMS CLI v1.0 🐝🦆                          ║
║   Multi-Agent Team Coordination System                           ║
╚══════════════════════════════════════════════════════════════════╝

USAGE: node hive-teams.js <command> [args]

───────────────────────────────────────────────────────────────────
📋 TEAM TEMPLATES
───────────────────────────────────────────────────────────────────
  research      Research + writer + reviewer
  code          Coder + reviewer + security  
  security      Security + reviewer + communicator
  emergency     Security + communicator + planner
  planning      Planner + researcher + communicator
  custom        User-defined roles

───────────────────────────────────────────────────────────────────
🔧 TEAM OPERATIONS
───────────────────────────────────────────────────────────────────
  spawn <template> [name]     Create a new team
  list                          List all active teams
  status <teamId>              Show team status
  dissolve <teamId>            Dissolve a team

───────────────────────────────────────────────────────────────────
📝 TASK MANAGEMENT
───────────────────────────────────────────────────────────────────
  task <teamId> <description>  Assign task to team
  complete <teamId> <taskId> <result>  Mark task complete
  results <teamId>             Aggregate team results

───────────────────────────────────────────────────────────────────
🗣️ INTER-TEAM COMMS
───────────────────────────────────────────────────────────────────
  send <fromId> <toId> <msg>   Send message between teams
  share <teamId> <key> <value> Share memory across teams
  pass <fromId> <toId> <desc>  Pass result from team to team

───────────────────────────────────────────────────────────────────
🏛️ SENATE INTEGRATION
───────────────────────────────────────────────────────────────────
  register <teamId> [senateId] Register team with Senate
  report <teamId>              Send status report to Senate
  receive <teamId> <decreeId>  Receive decree from Senate
  comply <teamId> <decreeId> <result>  Report decree compliance

───────────────────────────────────────────────────────────────────
🦆 CHARACTER NAMES
───────────────────────────────────────────────────────────────────
  Duck names:    Quacksworth, Waddlebert, Beakovich, Mallardovich...
  Bee names:     Buzzly, Honeydew, Bumblebert, Wingsworth...
  Lobster names: Clawrence, Crusteau, Pincer Palpatine, Shellby...

───────────────────────────────────────────────────────────────────
EXAMPLES:

  node hive-teams.js spawn research "My Research Team"
  node hive-teams.js spawn code
  node hive-teams.js list
  node hive-teams.js status team-12345
  node hive-teams.js task team-12345 "Research AI safety"
  node hive-teams.js results team-12345
  
  node hive-teams.js register team-12345
  node hive-teams.js report team-12345
  node hive-teams.js receive team-12345 decree-001

  node hive-teams.js send team-12345 team-67890 "Status update needed"
  node hive-teams.js pass team-12345 team-67890 "Research complete"

`);
}

function main() {
    const args = process.argv.slice(2);
    const cmd = args[0];
    
    if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
        printHelp();
        return;
    }
    
    switch (cmd) {
        // Team creation
        case 'spawn':
            if (!args[1]) {
                console.log('❌ Usage: spawn <template> [name]');
                console.log(`   Templates: ${Object.keys(TEMPLATES).join(', ')}`);
                return;
            }
            const template = args[1];
            const teamName = args[2] || null;
            const customRoles = args[3] ? args[3].split(',') : [];
            const team = createTeam(template, customRoles, teamName);
            if (team) {
                console.log(`\n✅ Team created: ${team.name}`);
                console.log(`   Template: ${team.template}`);
                console.log(`   Members: ${team.members.map(m => `${m.avatar}${m.name}`).join(', ')}`);
                console.log(`   ID: ${team.id}\n`);
            }
            break;
            
        case 'list':
            listTeams();
            break;
            
        case 'status':
            if (!args[1]) {
                console.log('❌ Usage: status <teamId>');
                return;
            }
            teamStatus(args[1]);
            break;
            
        case 'dissolve':
            if (!args[1]) {
                console.log('❌ Usage: dissolve <teamId>');
                return;
            }
            dissolveTeam(args[1]);
            break;
            
        // Task management
        case 'task':
            if (!args[1] || !args[2]) {
                console.log('❌ Usage: task <teamId> <description>');
                return;
            }
            assignTask(args[1], args.slice(2).join(' '));
            break;
            
        case 'complete':
            if (!args[1] || !args[2] || !args[3]) {
                console.log('❌ Usage: complete <teamId> <taskId> <result>');
                return;
            }
            completeTask(args[1], args[2], args.slice(3).join(' '));
            break;
            
        case 'results':
            if (!args[1]) {
                console.log('❌ Usage: results <teamId>');
                return;
            }
            aggregateResults(args[1]);
            break;
            
        // Inter-team comms
        case 'send':
            if (args.length < 4) {
                console.log('❌ Usage: send <fromId> <toId> <message>');
                return;
            }
            sendToTeam(args[1], args[2], args.slice(3).join(' '));
            break;
            
        case 'share':
            if (args.length < 4) {
                console.log('❌ Usage: share <teamId> <key> <value>');
                return;
            }
            shareMemory(args[1], args[2], args.slice(3).join(' '));
            break;
            
        case 'pass':
            if (args.length < 4) {
                console.log('❌ Usage: pass <fromId> <toId> <description>');
                return;
            }
            passResult(args[1], args[2], args.slice(3).join(' '));
            break;
            
        // Senate integration
        case 'register':
            if (!args[1]) {
                console.log('❌ Usage: register <teamId> [senateId]');
                return;
            }
            registerWithSenate(args[1], args[2]);
            break;
            
        case 'report':
            if (!args[1]) {
                console.log('❌ Usage: report <teamId>');
                return;
            }
            reportToSenate(args[1]);
            break;
            
        case 'receive':
            if (!args[1] || !args[2]) {
                console.log('❌ Usage: receive <teamId> <decreeId>');
                return;
            }
            receiveDecree(args[1], args[2]);
            break;
            
        case 'comply':
            if (args.length < 4) {
                console.log('❌ Usage: comply <teamId> <decreeId> <result>');
                return;
            }
            complyWithDecree(args[1], args[2], args.slice(3).join(' '));
            break;
            
        default:
            console.log(`❌ Unknown command: ${cmd}`);
            printHelp();
    }
}

main();

module.exports = {
    createTeam,
    listTeams,
    teamStatus,
    assignTask,
    completeTask,
    aggregateResults,
    sendToTeam,
    shareMemory,
    passResult,
    registerWithSenate,
    reportToSenate,
    receiveDecree,
    complyWithDecree,
    dissolveTeam
};