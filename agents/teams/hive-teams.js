#!/usr/bin/env node
/**
 * Hive Teams — Multi-Agent Team System
 * 
 * Pre-built team templates for common workflows:
 * - Research Team
 * - Code Team
 * - Security Team
 * - Emergency Team
 * - Planning Team
 * - Custom Teams
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = '/tmp/hive-teams';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class HiveTeams {
    constructor() {
        this.teams = this.loadTeams();
        this.agents = this.loadAgents();
    }

    loadTeams() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'teams.json'), 'utf-8'));
        } catch { return []; }
    }

    loadAgents() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'agents.json'), 'utf-8'));
        } catch {
            return this.generateTeamAgents();
        }
    }

    generateTeamAgents() {
        const agents = [
            // RESEARCH TEAM
            { id: 'RES-1', name: 'Quackvestigator', type: 'researcher', team: 'Research', role: 'lead' },
            { id: 'RES-2', name: 'Bee-searcher', type: 'researcher', team: 'Research', role: 'specialist' },
            { id: 'RES-3', name: 'Claw-terly', type: 'writer', team: 'Research', role: 'writer' },
            { id: 'RES-4', name: 'Quill McQuack', type: 'reviewer', team: 'Research', role: 'critic' },

            // CODE TEAM
            { id: 'CODE-1', name: 'Code Quackston', type: 'coder', team: 'Code', role: 'lead' },
            { id: 'CODE-2', name: 'Byte Beehler', type: 'coder', team: 'Code', role: 'specialist' },
            { id: 'CODE-3', name: 'Lobster Developer', type: 'reviewer', team: 'Code', role: 'critic' },
            { id: 'CODE-4', name: 'Secure Clawson', type: 'security', team: 'Code', role: 'security' },

            // SECURITY TEAM
            { id: 'SEC-1', name: 'Quack Shield', type: 'security', team: 'Security', role: 'lead' },
            { id: 'SEC-2', name: 'Bee Careful', type: 'security', team: 'Security', role: 'specialist' },
            { id: 'SEC-3', name: 'Claw Watcher', type: 'reviewer', team: 'Security', role: 'critic' },
            { id: 'SEC-4', name: 'Alert Lobster', type: 'communicator', team: 'Security', role: 'reporter' },

            // EMERGENCY TEAM
            { id: 'EMG-1', name: 'Quack Response', type: 'planner', team: 'Emergency', role: 'lead' },
            { id: 'EMG-2', name: 'Bee Ready', type: 'security', team: 'Emergency', role: 'specialist' },
            { id: 'EMG-3', name: 'Claw Alert', type: 'communicator', team: 'Emergency', role: 'reporter' },
            { id: 'EMG-4', name: 'Swift Lobster', type: 'planner', team: 'Emergency', role: 'coordinator' },

            // PLANNING TEAM
            { id: 'PLAN-1', name: 'Quack Strategist', type: 'planner', team: 'Planning', role: 'lead' },
            { id: 'PLAN-2', name: 'Bee Plannery', type: 'researcher', team: 'Planning', role: 'researcher' },
            { id: 'PLAN-3', name: 'Claw Schemer', type: 'communicator', team: 'Planning', role: 'reporter' },
            { id: 'PLAN-4', name: 'Tact Lobster', type: 'planner', team: 'Planning', role: 'specialist' },
        ];

        fs.writeFileSync(path.join(DATA_DIR, 'agents.json'), JSON.stringify(agents, null, 2));
        return agents;
    }

    saveTeams() {
        fs.writeFileSync(path.join(DATA_DIR, 'teams.json'), JSON.stringify(this.teams, null, 2));
    }

    saveAgents() {
        fs.writeFileSync(path.join(DATA_DIR, 'agents.json'), JSON.stringify(this.agents, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // TEAM TEMPLATES
    // ═══════════════════════════════════════════════════════════

    getTemplates() {
        return {
            research: {
                name: 'Research Team',
                description: 'Research, analyze, and report on topics',
                members: ['researcher', 'writer', 'reviewer'],
                roles: { lead: 'researcher', specialist: 'researcher', writer: 'writer', critic: 'reviewer' },
                color: '#4a90d9'
            },
            code: {
                name: 'Code Team',
                description: 'Develop, review, and ship code',
                members: ['coder', 'reviewer', 'security'],
                roles: { lead: 'coder', specialist: 'coder', critic: 'reviewer', security: 'security' },
                color: '#00aa00'
            },
            security: {
                name: 'Security Team',
                description: 'Audit, monitor, and protect systems',
                members: ['security', 'reviewer', 'communicator'],
                roles: { lead: 'security', specialist: 'security', critic: 'reviewer', reporter: 'communicator' },
                color: '#ff4444'
            },
            emergency: {
                name: 'Emergency Team',
                description: 'Respond to incidents and crises',
                members: ['security', 'communicator', 'planner'],
                roles: { lead: 'planner', specialist: 'security', reporter: 'communicator', coordinator: 'planner' },
                color: '#ffaa00'
            },
            planning: {
                name: 'Planning Team',
                description: 'Strategic planning and coordination',
                members: ['planner', 'researcher', 'communicator'],
                roles: { lead: 'planner', researcher: 'researcher', reporter: 'communicator', specialist: 'planner' },
                color: '#aa00ff'
            },
            custom: {
                name: 'Custom Team',
                description: 'User-defined team composition',
                members: [],
                roles: {},
                color: '#888888'
            }
        };
    }

    // ═══════════════════════════════════════════════════════════
    // TEAM OPERATIONS
    // ═══════════════════════════════════════════════════════════

    createTeam(template, name, customMembers = []) {
        const templates = this.getTemplates();
        const tmpl = templates[template];

        if (!tmpl) {
            console.log('Template not found');
            return;
        }

        const members = template === 'custom' ? customMembers : tmpl.members;

        const team = {
            id: `TEAM-${Date.now()}`,
            name: name || `${tmpl.name} ${this.teams.length + 1}`,
            template,
            members: [],
            status: 'assembled',
            created: Date.now(),
            tasks: [],
            completed: 0,
            failed: 0
        };

        // Assign agents to team
        for (const type of members) {
            const available = this.agents.find(a => a.type === type && !a.activeTeam);
            if (available) {
                available.activeTeam = team.id;
                team.members.push(available);
            }
        }

        this.teams.push(team);
        this.saveTeams();
        this.saveAgents();

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  👥 TEAM CREATED 👥                          ║
╠══════════════════════════════════════════════════════════════════╣
║  Team: ${team.name.padEnd(56)}║
║  ID: ${team.id.padEnd(59)}║
║  Template: ${tmpl.name.padEnd(54)}║
║  Members: ${team.members.length}                                                 ║
╚══════════════════════════════════════════════════════════════════╝
`);

        return team;
    }

    spawnTeam(template, task) {
        const team = this.createTeam(template, null);
        if (!team) return;

        // Assign initial task
        this.assignTask(team.id, task);

        console.log(`\n✓ Team spawned and task assigned`);

        return team;
    }

    assignTask(teamId, task) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) {
            console.log('Team not found');
            return;
        }

        const taskObj = {
            id: `TASK-${Date.now()}`,
            description: task,
            status: 'assigned',
            assigned: Date.now(),
            started: null,
            completed: null,
            results: [],
            subTasks: this.decomposeTask(task)
        };

        team.tasks.push(taskObj);
        team.status = 'working';
        this.saveTeams();

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  📋 TASK ASSIGNED 📋                         ║
╠══════════════════════════════════════════════════════════════════╣
║  Team: ${team.name.padEnd(56)}║
║  Task: ${task.substring(0, 55).padEnd(55)}║
║  Sub-tasks: ${taskObj.subTasks.length}                                               ║
╚══════════════════════════════════════════════════════════════════╝
`);

        // Simulate parallel execution
        this.executeTeamTasks(teamId, taskObj.id);

        return taskObj;
    }

    decomposeTask(task) {
        // Simple task decomposition
        const subtasks = [
            { id: 1, description: 'Research/Planning phase', assignedTo: null, status: 'pending' },
            { id: 2, description: 'Execution phase', assignedTo: null, status: 'pending' },
            { id: 3, description: 'Review/Critique phase', assignedTo: null, status: 'pending' },
            { id: 4, description: 'Finalize/Report phase', assignedTo: null, status: 'pending' }
        ];

        // Assign based on team member roles
        subtasks[0].assignedTo = 'researcher';
        subtasks[1].assignedTo = 'specialist';
        subtasks[2].assignedTo = 'critic';
        subtasks[3].assignedTo = 'reporter';

        return subtasks;
    }

    executeTeamTasks(teamId, taskId) {
        const team = this.teams.find(t => t.id === teamId);
        const task = team?.tasks.find(t => t.id === taskId);

        if (!team || !task) return;

        task.status = 'in_progress';
        task.started = Date.now();

        // Execute subtasks in parallel (simulated)
        let completed = 0;
        for (const sub of task.subTasks) {
            sub.status = 'completed';
            sub.completedAt = Date.now();

            task.results.push({
                phase: sub.description,
                output: `Completed by ${sub.assignedTo} role`,
                timestamp: Date.now()
            });

            completed++;
            task.progress = (completed / task.subTasks.length) * 100;
        }

        task.status = 'completed';
        task.completed = Date.now();
        team.completed++;
        team.status = 'idle';

        this.saveTeams();

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  ✅ TASK COMPLETED ✅                         ║
╠══════════════════════════════════════════════════════════════════╣
║  Team: ${team.name.padEnd(56)}║
║  Task: ${task.description.substring(0, 55).padEnd(55)}║
║  Duration: ${((task.completed - task.started) / 1000).toFixed(1)}s                                            ║
╚══════════════════════════════════════════════════════════════════╝
`);
    }

    // ═══════════════════════════════════════════════════════════
    // INTER-TEAM COMMUNICATION
    // ═══════════════════════════════════════════════════════════

    sendMessage(fromTeamId, toTeamId, message) {
        const from = this.teams.find(t => t.id === fromTeamId);
        const to = this.teams.find(t => t.id === toTeamId);

        if (!from || !to) {
            console.log('Team not found');
            return;
        }

        const msg = {
            id: `MSG-${Date.now()}`,
            from: from.name,
            to: to.name,
            message,
            timestamp: Date.now(),
            read: false
        };

        to.messages = to.messages || [];
        to.messages.push(msg);

        this.saveTeams();

        console.log(`\n✓ Message sent from ${from.name} to ${to.name}`);
    }

    // ═══════════════════════════════════════════════════════════
    // SENATE INTEGRATION
    // ═══════════════════════════════════════════════════════════

    reportToSenate(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) {
            console.log('Team not found');
            return;
        }

        const report = {
            teamId: team.id,
            teamName: team.name,
            status: team.status,
            tasksCompleted: team.completed,
            tasksFailed: team.failed,
            performance: team.completed > 0 ? (team.completed / (team.completed + team.failed) * 100).toFixed(1) + '%' : 'N/A',
            timestamp: Date.now()
        };

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║               📊 SENATE REPORT 📊                           ║
╠══════════════════════════════════════════════════════════════════╣
║  Team: ${team.name.padEnd(56)}║
║  Status: ${team.status.padEnd(55)}║
║  Completed: ${(team.completed + '').padEnd(54)}║
║  Failed: ${(team.failed + '').padEnd(56)}║
║  Performance: ${report.performance.padEnd(50)}║
╚══════════════════════════════════════════════════════════════════╝
`);

        return report;
    }

    receiveSenateDecree(decree) {
        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              📜 SENATE DECREE RECEIVED 📜                    ║
╠══════════════════════════════════════════════════════════════════╣
║  All teams MUST comply with:                                 ║
║  ${decree.substring(0, 63).padEnd(63)}║
╚══════════════════════════════════════════════════════════════════╝
`);

        // Apply decree to all teams
        for (const team of this.teams) {
            team.decrees = team.decrees || [];
            team.decrees.push({
                decree,
                received: Date.now(),
                acknowledged: true
            });
        }

        this.saveTeams();
    }

    // ═══════════════════════════════════════════════════════════
    // DISSOLVE TEAM
    // ═══════════════════════════════════════════════════════════

    dissolveTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) {
            console.log('Team not found');
            return;
        }

        // Release agents
        for (const member of team.members) {
            const agent = this.agents.find(a => a.id === member.id);
            if (agent) {
                agent.activeTeam = null;
            }
        }

        // Remove team
        this.teams = this.teams.filter(t => t.id !== teamId);
        this.saveTeams();
        this.saveAgents();

        console.log(`\n✓ Team ${team.name} dissolved`);
    }

    // ═══════════════════════════════════════════════════════════
    // LIST & DISPLAY
    // ═══════════════════════════════════════════════════════════

    listTeams() {
        console.log('\n👥 ACTIVE TEAMS');
        console.log('═'.repeat(60));

        if (this.teams.length === 0) {
            console.log('\n  No teams created yet');
            return;
        }

        for (const team of this.teams) {
            console.log(`\n${team.name} [${team.id}]`);
            console.log(`   Template: ${team.template}`);
            console.log(`   Status: ${team.status}`);
            console.log(`   Members: ${team.members.length}`);
            console.log(`   Tasks: ${team.completed} completed, ${team.failed} failed`);

            for (const member of team.members) {
                console.log(`     - ${member.name} (${member.role})`);
            }
        }
    }

    listAgents() {
        console.log('\n🤖 TEAM AGENTS');
        console.log('═'.repeat(60));

        const byTeam = {};
        for (const agent of this.agents) {
            if (!byTeam[agent.team]) byTeam[agent.team] = [];
            byTeam[agent.team].push(agent);
        }

        for (const [team, members] of Object.entries(byTeam)) {
            console.log(`\n${team}:`);
            for (const m of members) {
                const status = m.activeTeam ? '🟢' : '⚪';
                console.log(`  ${status} ${m.name} (${m.type}) - ${m.role}`);
            }
        }
    }

    listTemplates() {
        const templates = this.getTemplates();

        console.log('\n📋 TEAM TEMPLATES');
        console.log('═'.repeat(60));

        for (const [key, tmpl] of Object.entries(templates)) {
            console.log(`\n${tmpl.name} [${key}]`);
            console.log(`   ${tmpl.description}`);
            console.log(`   Members: ${tmpl.members.join(', ')}`);
        }
    }

    teamStatus(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) {
            console.log('Team not found');
            return;
        }

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              👥 TEAM STATUS: ${team.name.padEnd(36)}║
╠══════════════════════════════════════════════════════════════════╣
║  ID: ${team.id.padEnd(59)}║
║  Template: ${team.template.padEnd(55)}║
║  Status: ${team.status.padEnd(56)}║
║  Members: ${team.members.length}                                                 ║
║  Tasks Completed: ${(team.completed + '').padEnd(50)}║
║  Tasks Failed: ${(team.failed + '').padEnd(52)}║
╚══════════════════════════════════════════════════════════════════╝

MEMBERS:
`);

        for (const m of team.members) {
            console.log(`  ${m.name} - ${m.role} (${m.type})`);
        }

        if (team.tasks?.length > 0) {
            console.log('\nTASKS:');
            for (const t of team.tasks) {
                console.log(`  ${t.status === 'completed' ? '✅' : t.status === 'in_progress' ? '🔄' : '⏳'} ${t.description}`);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        const totalAgents = this.agents.length;
        const activeTeams = this.teams.length;
        const totalTasks = this.teams.reduce((sum, t) => sum + t.completed, 0);
        const templates = Object.keys(this.getTemplates()).length;

        console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              👥 HIVE TEAMS SYSTEM 👥                        ║
╠══════════════════════════════════════════════════════════════════╣
║  Total Agents: ${(totalAgents + '').padEnd(54)}║
║  Active Teams: ${(activeTeams + '').padEnd(53)}║
║  Templates: ${(templates + '').padEnd(56)}║
║  Total Tasks Completed: ${(totalTasks + '').padEnd(48)}║
╚══════════════════════════════════════════════════════════════════╝
`);
    }
}

// CLI
const teams = new HiveTeams();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    templates: () => teams.listTemplates(),
    agents: () => teams.listAgents(),

    create: () => teams.createTeam(args[0], args[1], args[2]?.split(',')),
    spawn: () => teams.spawnTeam(args[0], args.slice(1).join(' ')),
    assign: () => teams.assignTask(args[0], args.slice(1).join(' ')),

    list: () => teams.listTeams(),
    status: () => teams.teamStatus(args[0]),
    dissolve: () => teams.dissolveTeam(args[0]),

    message: () => teams.sendMessage(args[0], args[1], args.slice(2).join(' ')),

    report: () => teams.reportToSenate(args[0]),
    decree: () => teams.receiveSenateDecree(args.join(' ')),

    dashboard: () => teams.dashboard(),
    help: () => console.log(`
👥 HIVE TEAMS

  templates                    List available team templates
  agents                       List all team agents

  create <template> [name]     Create team from template
  spawn <template> <task>      Create team and assign task
  assign <teamId> <task>       Assign task to team

  list                         List all teams
  status <teamId>              Show team status
  dissolve <teamId>            Dissolve team

  message <from> <to> <msg>    Send message between teams

  report <teamId>              Report to Senate
  decree <text>                Receive Senate decree

  dashboard                    Show teams dashboard

Templates: research, code, security, emergency, planning, custom
`)
};

commands[cmd]?.() || teams.dashboard();

module.exports = { HiveTeams };
