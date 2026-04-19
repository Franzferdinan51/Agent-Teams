#!/usr/bin/env node
/**
 * HiveTeams v2.0 — Enhanced Multi-Agent Team Coordination System
 * 
 * Features:
 * - 15+ team templates
 * - Multi-team coordination (team-of-teams)
 * - Team hierarchies and chains of command
 * - Inter-team communication and task passing
 * - Resource sharing between teams
 * - Team alliances and rivalries
 * - Live team dashboards
 * - Senate integration with decree compliance
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// DATA STRUCTURES
// ═══════════════════════════════════════════════════════════════════

const DATA_DIR = path.join(__dirname, '..', 'data', 'teams');
const STATE_FILE = path.join(DATA_DIR, 'teams-state.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load or initialize state
let state = { teams: [], alliances: [], history: [] };
if (fs.existsSync(STATE_FILE)) {
    try {
        state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    } catch (e) {}
}

function saveState() {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ═══════════════════════════════════════════════════════════════════
// CHARACTER NAMES
// ═══════════════════════════════════════════════════════════════════

const NAMES = {
    duck: ['Quacksworth', 'Waddlebert', 'Beakovich', 'Mallardovich', 'Daffytail', 'Pondscraper', 'Billiam', 'Feathersby', 'Duck Norris', 'Captain Quackers', 'Sir Quackalot', 'Quack Sparrow', 'Webfoot McQuack', 'Ducksworth'],
    bee: ['Buzzly', 'Honeydew', 'Stinger McBee', 'Pollen Pete', 'Nectarina', 'Bumblebert', 'Wingsworth', 'Hivector', 'Apiary Andrews', 'Beeatrice', 'Comb Commander', 'Queen Beyonce', 'Honey Business', 'The Bees Knees'],
    lobster: ['Clawrence', 'Crusteau', 'Lobstermaniac', 'Pincers McSnip', 'Shellby', 'Crackington', 'Clawdia', 'Lobster Lohan', 'Pincer Palpatine', 'Shellington', 'The Claw', 'Clawsome'],
    specialist: ['Codey McCodeface', 'Debugging Ducky', 'Bugsy McBuginho', 'SyntaxError', 'NullPointerException', 'StackOverflowDuck', 'Git Happens', 'Merge Conflict', 'Rebase Rodriguez', 'Dockerina'],
    critic: ['Constructive Clive', 'Nitpick Nick', 'Code Crusader', 'Quality Queen', 'Reviewer Rex', 'Criticus Max', 'The Nitpicker', 'Flaw Finder', 'Perfect Patrol', 'Detail Dick'],
    reporter: ['Newsworthy Nigel', 'Information Ingrid', 'Summary Sally', 'The Chronicler', 'Dispatch Dan', 'Bulletin Betty', 'Headline Hannah', 'Reporter Rick', 'The Scribe', 'Telegram Tina'],
    planner: ['Strategic Steve', 'Plan Master', 'Blueprint Betty', 'Schematic Sam', 'Tactical Tom', 'Roadmap Rachel', 'Architect Alice', 'Design Dan'],
    communicator: ['Chatterbox Charlie', 'Message Mike', 'Liaison Lisa', 'Diplomat Dave', 'Envoy Emily', 'Ambassador Andy', 'Courier Carol', 'Herald Harry']
};

function getName(type) {
    const list = NAMES[type] || NAMES.duck;
    return list[Math.floor(Math.random() * list.length)];
}

// ═══════════════════════════════════════════════════════════════════
// TEAM TEMPLATES (15+)
// ═══════════════════════════════════════════════════════════════════

const TEMPLATES = {
    // Research Teams
    research: {
        name: 'Research Team', description: 'Deep research with fact-checking',
        roles: ['researcher', 'writer', 'reviewer'], color: '🔬', icon: '🔬'
    },
    analysis: {
        name: 'Analysis Team', description: 'Data analysis and insights',
        roles: ['researcher', 'planner', 'reporter'], color: '📊', icon: '📊'
    },
    
    // Development Teams
    code: {
        name: 'Code Team', description: 'Software development',
        roles: ['coder', 'reviewer', 'security'], color: '💻', icon: '💻'
    },
    frontend: {
        name: 'Frontend Team', description: 'UI/UX development',
        roles: ['coder', 'reporter', 'reviewer'], color: '🎨', icon: '🎨'
    },
    backend: {
        name: 'Backend Team', description: 'Server and API development',
        roles: ['coder', 'security', 'planner'], color: '⚙️', icon: '⚙️'
    },
    devops: {
        name: 'DevOps Team', description: 'Deployment and infrastructure',
        roles: ['coder', 'security', 'communicator'], color: '🚀', icon: '🚀'
    },
    
    // Security Teams
    security: {
        name: 'Security Team', description: 'Threat assessment and protection',
        roles: ['security', 'reviewer', 'communicator'], color: '🛡️', icon: '🛡️'
    },
    audit: {
        name: 'Audit Team', description: 'Compliance and security audits',
        roles: ['security', 'critic', 'reporter'], color: '🔍', icon: '🔍'
    },
    
    // Planning Teams
    planning: {
        name: 'Planning Team', description: 'Strategic planning',
        roles: ['planner', 'researcher', 'communicator'], color: '📋', icon: '📋'
    },
    architecture: {
        name: 'Architecture Team', description: 'System design and architecture',
        roles: ['planner', 'coder', 'researcher'], color: '🏗️', icon: '🏗️'
    },
    
    // Communication Teams
    communications: {
        name: 'Communications Team', description: 'External and internal comms',
        roles: ['communicator', 'reporter', 'planner'], color: '📢', icon: '📢'
    },
    marketing: {
        name: 'Marketing Team', description: 'Promotion and outreach',
        roles: ['communicator', 'researcher', 'reporter'], color: '📣', icon: '📣'
    },
    
    // Emergency Teams
    emergency: {
        name: 'Emergency Team', description: 'Rapid incident response',
        roles: ['security', 'communicator', 'planner'], color: '🚨', icon: '🚨'
    },
    
    // Quality Teams
    qa: {
        name: 'QA Team', description: 'Quality assurance and testing',
        roles: ['critic', 'coder', 'reporter'], color: '✅', icon: '✅'
    },
    
    // Swarm Teams (Multi-agent)
    swarm: {
        name: 'Swarm Team', description: 'Massive parallel processing',
        roles: ['researcher', 'coder', 'critic', 'planner', 'communicator', 'reporter'], color: '🐝', icon: '🐝'
    },
    
    // Meta Teams (Teams-of-Teams)
    coalition: {
        name: 'Coalition Team', description: 'Alliance of multiple teams',
        roles: ['communicator', 'planner', 'researcher'], color: '🤝', icon: '🤝', isCoalition: true
    }
};

// ═══════════════════════════════════════════════════════════════════
// TEAM MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

class Team {
    constructor(template, name, options = {}) {
        this.id = 'team-' + Date.now();
        this.template = template;
        this.name = name || `${TEMPLATES[template]?.name || 'Team'}-${Date.now() % 1000}`;
        this.color = TEMPLATES[template]?.color || '👥';
        this.icon = TEMPLATES[template]?.icon || '👥';
        this.description = TEMPLATES[template]?.description || '';
        this.roles = [...(TEMPLATES[template]?.roles || [])];
        this.isCoalition = TEMPLATES[template]?.isCoalition || false;
        
        this.members = [];
        this.tasks = [];
        this.resources = {};
        this.alliances = [];
        this.parentTeam = options.parentTeam || null;
        this.subTeams = [];
        this.status = 'active';
        this.created = new Date().toISOString();
        this.lastActive = new Date().toISOString();
        
        // Spawn members
        this.spawnMembers();
    }
    
    spawnMembers() {
        const usedNames = new Set();
        for (const role of this.roles) {
            const type = this.getRoleType(role);
            let name;
            do {
                name = getName(type);
            } while (usedNames.has(name));
            usedNames.add(name);
            
            this.members.push({
                id: `${this.id}-${role}-${this.members.length}`,
                name,
                role,
                type,
                status: 'active',
                tasksCompleted: 0,
                score: 7 + Math.random() * 3
            });
        }
    }
    
    getRoleType(role) {
        if (['researcher', 'coder', 'planner'].includes(role)) return 'duck';
        if (['security', 'critic'].includes(role)) return 'lobster';
        if (['communicator', 'reporter'].includes(role)) return 'bee';
        return 'duck';
    }
    
    addTask(description, priority = 'normal') {
        const task = {
            id: `task-${Date.now()}`,
            description,
            priority,
            status: 'pending',
            assignee: null,
            created: new Date().toISOString(),
            completed: null,
            result: null
        };
        this.tasks.push(task);
        this.lastActive = new Date().toISOString();
        return task;
    }
    
    completeTask(taskId, result) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'completed';
            task.completed = new Date().toISOString();
            task.result = result;
            this.lastActive = new Date().toISOString();
            
            if (task.assignee) {
                const member = this.members.find(m => m.id === task.assignee);
                if (member) {
                    member.tasksCompleted++;
                    member.score = Math.min(10, member.score + 0.1);
                }
            }
        }
    }
    
    assignTask(taskId, memberId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.assignee = memberId;
            task.status = 'in_progress';
        }
    }
    
    addSubTeam(teamId) {
        this.subTeams.push(teamId);
    }
    
    addAlliance(teamId) {
        if (!this.alliances.includes(teamId)) {
            this.alliances.push(teamId);
        }
    }
    
    shareResource(teamId, resource, amount) {
        const targetTeam = state.teams.find(t => t.id === teamId);
        if (targetTeam) {
            targetTeam.resources[resource] = (targetTeam.resources[resource] || 0) + amount;
            this.resources[resource] = (this.resources[resource] || 0) - amount;
            return true;
        }
        return false;
    }
    
    getReport() {
        const completed = this.tasks.filter(t => t.status === 'completed').length;
        const pending = this.tasks.filter(t => t.status === 'pending').length;
        const inProgress = this.tasks.filter(t => t.status === 'in_progress').length;
        
        return {
            id: this.id,
            name: this.name,
            icon: this.icon,
            status: this.status,
            members: this.members.length,
            tasks: { total: this.tasks.length, completed, pending, inProgress },
            alliances: this.alliances.length,
            subTeams: this.subTeams.length,
            resources: this.resources,
            created: this.created,
            lastActive: this.lastActive
        };
    }
}

// ═══════════════════════════════════════════════════════════════════
// TEAM OPERATIONS
// ═══════════════════════════════════════════════════════════════════

function spawnTeam(template, name, options = {}) {
    const team = new Team(template, name, options);
    state.teams.push(team);
    saveState();
    return team;
}

function listTeams(filter = {}) {
    let teams = [...state.teams];
    
    if (filter.status) {
        teams = teams.filter(t => t.status === filter.status);
    }
    if (filter.template) {
        teams = teams.filter(t => t.template === filter.template);
    }
    if (filter.hasAlliance) {
        teams = teams.filter(t => t.alliances.length > 0);
    }
    
    return teams;
}

function getTeam(teamId) {
    return state.teams.find(t => t.id === teamId);
}

function dissolveTeam(teamId) {
    const team = getTeam(teamId);
    if (team) {
        team.status = 'dissolved';
        team.lastActive = new Date().toISOString();
        
        // Remove from alliances
        state.teams.forEach(t => {
            t.alliances = t.alliances.filter(id => id !== teamId);
        });
        
        saveState();
        return true;
    }
    return false;
}

// Coalition (team-of-teams)
function createCoalition(name, teamIds) {
    const coalition = spawnTeam('coalition', name);
    coalition.subTeams = teamIds;
    coalition.parentTeam = null;
    
    // Link sub-teams to coalition
    teamIds.forEach(teamId => {
        const team = getTeam(teamId);
        if (team) {
            team.parentTeam = coalition.id;
        }
    });
    
    return coalition;
}

function formAlliance(teamId1, teamId2) {
    const t1 = getTeam(teamId1);
    const t2 = getTeam(teamId2);
    
    if (t1 && t2) {
        t1.addAlliance(teamId2);
        t2.addAlliance(teamId1);
        saveState();
        return true;
    }
    return false;
}

// Task passing between teams
function passTask(fromTeamId, toTeamId, taskDescription) {
    const from = getTeam(fromTeamId);
    const to = getTeam(toTeamId);
    
    if (from && to) {
        const task = to.addTask(`[From ${from.name}] ${taskDescription}`, 'transferred');
        from.addTask(`[Passed to ${to.name}] ${taskDescription}`, 'transferred');
        saveState();
        return task;
    }
    return null;
}

// Resource sharing
function shareResource(fromId, toId, resource, amount) {
    const from = getTeam(fromId);
    if (from) {
        const result = from.shareResource(toId, resource, amount);
        if (result) saveState();
        return result;
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════

function printBanner() {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           🐝 HIVE TEAMS v2.0 🐝                                ║
║   Enhanced Multi-Agent Team Coordination                        ║
╠══════════════════════════════════════════════════════════════════╣
║  ${state.teams.length} Active Teams | ${state.alliances.length} Alliances                    ║
╚══════════════════════════════════════════════════════════════════╝`);
}

function printTeams(teams) {
    if (teams.length === 0) {
        console.log('\n❌ No teams found\n');
        return;
    }
    
    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    teams.forEach((team, i) => {
        const r = team.getReport();
        console.log(`│ ${team.icon} ${team.name.padEnd(20)} │ ${r.members} members │ ${r.tasks.completed}/${r.tasks.total} tasks │ ${r.alliances} allies │ ${r.status.padEnd(8)}│`);
        if (i < teams.length - 1) console.log('├─────────────────────────────────────────────────────────────────┤');
    });
    console.log('└─────────────────────────────────────────────────────────────────┘\n');
}

function printTeamDetail(team) {
    const r = team.getReport();
    console.log(`
${team.icon} ${team.name} (${team.id})
${'─'.repeat(50)}
Status:     ${team.status}
Template:   ${team.template}
Members:    ${team.members.length}
Tasks:      ${r.tasks.completed} completed | ${r.tasks.pending} pending | ${r.tasks.inProgress} in progress
Alliances:  ${team.alliances.length} teams
Sub-teams:  ${team.subTeams.length} teams
Coalition:  ${team.isCoalition ? 'Yes (Team-of-Teams)' : 'No'}
Created:    ${team.created}
Last Active: ${team.lastActive}

MEMBERS:
${team.members.map(m => `  • ${m.name} (${m.role}) - Score: ${m.score.toFixed(1)}`).join('\n')}

${team.tasks.length > 0 ? `TASKS:\n${team.tasks.map(t => `  [${t.status}] ${t.description}`).join('\n')}` : ''}
`);
}

const args = process.argv.slice(2);
const cmd = args[0];

// ═══════════════════════════════════════════════════════════════════
// COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════

if (cmd === 'spawn' || cmd === 'create') {
    const template = args[1] || 'code';
    const name = args.slice(2).join(' ') || null;
    
    if (!TEMPLATES[template]) {
        console.log('\n❌ Unknown template. Available:\n');
        Object.entries(TEMPLATES).forEach(([k, v]) => {
            console.log(`  ${v.icon} ${k.padEnd(15)} - ${v.description}`);
        });
        process.exit(1);
    }
    
    const team = spawnTeam(template, name);
    console.log(`\n✅ Spawned ${team.icon} ${team.name} (${template}) with ${team.members.length} members\n`);
}

else if (cmd === 'list' || cmd === 'ls') {
    printBanner();
    const teams = listTeams();
    printTeams(teams);
}

else if (cmd === 'status' || cmd === 'info') {
    const teamId = args[1];
    if (!teamId) {
        console.log('\n❌ Usage: hive-teams status <team-id>\n');
        process.exit(1);
    }
    
    const team = getTeam(teamId);
    if (team) {
        printTeamDetail(team);
    } else {
        console.log(`\n❌ Team ${teamId} not found\n`);
    }
}

else if (cmd === 'dissolve' || cmd === 'delete') {
    const teamId = args[1];
    if (!teamId) {
        console.log('\n❌ Usage: hive-teams dissolve <team-id>\n');
        process.exit(1);
    }
    
    if (dissolveTeam(teamId)) {
        console.log(`\n✅ Team ${teamId} dissolved\n`);
    } else {
        console.log(`\n❌ Team ${teamId} not found\n`);
    }
}

else if (cmd === 'task' || cmd === 'add-task') {
    const teamId = args[1];
    const description = args.slice(2).join(' ');
    
    if (!teamId || !description) {
        console.log('\n❌ Usage: hive-teams task <team-id> <description>\n');
        process.exit(1);
    }
    
    const team = getTeam(teamId);
    if (team) {
        const task = team.addTask(description);
        saveState();
        console.log(`\n✅ Added task ${task.id} to ${team.name}\n`);
    } else {
        console.log(`\n❌ Team ${teamId} not found\n`);
    }
}

else if (cmd === 'complete') {
    const teamId = args[1];
    const taskId = args[2];
    const result = args.slice(3).join(' ') || 'Completed';
    
    if (!teamId || !taskId) {
        console.log('\n❌ Usage: hive-teams complete <team-id> <task-id> [result]\n');
        process.exit(1);
    }
    
    const team = getTeam(teamId);
    if (team) {
        team.completeTask(taskId, result);
        saveState();
        console.log(`\n✅ Task ${taskId} marked complete\n`);
    } else {
        console.log(`\n❌ Team ${teamId} not found\n`);
    }
}

else if (cmd === 'alliance' || cmd === 'ally') {
    const teamId1 = args[1];
    const teamId2 = args[2];
    
    if (!teamId1 || !teamId2) {
        console.log('\n❌ Usage: hive-teams alliance <team-id-1> <team-id-2>\n');
        process.exit(1);
    }
    
    if (formAlliance(teamId1, teamId2)) {
        const t1 = getTeam(teamId1);
        const t2 = getTeam(teamId2);
        console.log(`\n✅ ${t1.icon} ${t1.name} & ${t2.icon} ${t2.name} are now allies!\n`);
    } else {
        console.log(`\n❌ Could not form alliance\n`);
    }
}

else if (cmd === 'coalition' || cmd === 'team-of-teams') {
    const name = args[1] || 'Coalition';
    const teamIds = args.slice(2);
    
    if (teamIds.length < 2) {
        console.log('\n❌ Usage: hive-teams coalition <name> <team-id-1> <team-id-2> [...]\n');
        process.exit(1);
    }
    
    const coalition = createCoalition(name, teamIds);
    console.log(`\n✅ Created Coalition: ${coalition.icon} ${coalition.name} with ${teamIds.length} sub-teams\n`);
}

else if (cmd === 'pass' || cmd === 'handoff') {
    const fromId = args[1];
    const toId = args[2];
    const description = args.slice(3).join(' ');
    
    if (!fromId || !toId || !description) {
        console.log('\n❌ Usage: hive-teams pass <from-team-id> <to-team-id> <description>\n');
        process.exit(1);
    }
    
    const task = passTask(fromId, toId, description);
    if (task) {
        console.log(`\n✅ Task passed from ${fromId} to ${toId}\n`);
    } else {
        console.log(`\n❌ Could not pass task\n`);
    }
}

else if (cmd === 'templates') {
    console.log('\n📋 AVAILABLE TEAM TEMPLATES:\n');
    Object.entries(TEMPLATES).forEach(([key, template]) => {
        console.log(`  ${template.icon} ${key.padEnd(15)} - ${template.description}`);
        console.log(`     Roles: ${template.roles.join(', ')}\n`);
    });
}

else if (cmd === 'dashboard') {
    printBanner();
    
    // Summary stats
    const active = state.teams.filter(t => t.status === 'active');
    const totalMembers = active.reduce((sum, t) => sum + t.members.length, 0);
    const totalTasks = active.reduce((sum, t) => sum + t.tasks.length, 0);
    const completedTasks = active.reduce((sum, t) => sum + t.tasks.filter(task => task.status === 'completed').length, 0);
    
    console.log(`📊 OVERVIEW:`);
    console.log(`   Active Teams: ${active.length}`);
    console.log(`   Total Members: ${totalMembers}`);
    console.log(`   Tasks: ${completedTasks}/${totalTasks} completed`);
    console.log(`   Alliances: ${state.alliances.length}`);
    
    console.log(`\n📋 ALL TEAMS:`);
    printTeams(active);
    
    console.log(`🔗 ALLIANCES:`);
    const alliedTeams = active.filter(t => t.alliances.length > 0);
    alliedTeams.forEach(t => {
        const allies = t.alliances.map(id => getTeam(id)?.name || id).join(', ');
        console.log(`   ${t.icon} ${t.name} ↔ ${allies}`);
    });
    console.log('');
}

else if (cmd === 'save' || cmd === 'export') {
    const output = args[1] || 'teams-export.json';
    fs.writeFileSync(output, JSON.stringify(state, null, 2));
    console.log(`\n✅ Exported to ${output}\n`);
}

else if (cmd === 'load' || cmd === 'import') {
    const input = args[1];
    if (!input) {
        console.log('\n❌ Usage: hive-teams load <file>\n');
        process.exit(1);
    }
    try {
        const imported = JSON.parse(fs.readFileSync(input, 'utf-8'));
        state = imported;
        saveState();
        console.log(`\n✅ Imported ${state.teams.length} teams from ${input}\n`);
    } catch (e) {
        console.log(`\n❌ Error importing: ${e.message}\n`);
    }
}

else {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              🐝 HIVE TEAMS v2.0 🐝                               ║
║   Enhanced Multi-Agent Team Coordination                          ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  SPAWN & MANAGE:                                                ║
║    spawn <template> [name]  Create new team                    ║
║    list                       List all teams                     ║
║    status <team-id>           Show team details                  ║
║    dissolve <team-id>         Dissolve team                     ║
║                                                                  ║
║  TASKS:                                                         ║
║    task <team-id> <desc>      Add task to team                  ║
║    complete <team-id> <task-id> [result]  Mark task complete   ║
║                                                                  ║
║  TEAMWORK:                                                      ║
║    alliance <team-1> <team-2>  Form alliance                   ║
║    coalition <name> <team-ids...>  Create team-of-teams         ║
║    pass <from> <to> <desc>    Pass task between teams          ║
║                                                                  ║
║  INFO:                                                          ║
║    templates                 Show all team templates             ║
║    dashboard                 Full system overview               ║
║    save [file]               Export teams to JSON               ║
║    load <file>               Import teams from JSON            ║
║                                                                  ║
║  TEMPLATES (16):                                                ║
║    🔬 research    📊 analysis    💻 code       🎨 frontend     ║
║    ⚙️ backend    🚀 devops      🛡️ security  🔍 audit        ║
║    📋 planning   🏗️ architecture 📢 comms     📣 marketing    ║
║    🚨 emergency  ✅ qa           🐝 swarm     🤝 coalition      ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

// Export for use as module
module.exports = {
    Team,
    spawnTeam,
    listTeams,
    getTeam,
    dissolveTeam,
    createCoalition,
    formAlliance,
    passTask,
    shareResource,
    state
};
