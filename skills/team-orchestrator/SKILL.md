# Team Orchestrator — Multi-Agent Coordination System

## Overview

A persistent multi-agent team system where specialized agents collaborate under a team lead to accomplish shared goals. Built for Duck CLI / OpenClaw but portable to any agent framework.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Team Lead (You / Main Agent)             │
│  - Assigns tasks                                            │
│  - Coordinates team members                                 │
│  - Makes final decisions                                    │
│  - Reviews and approves work                                 │
└─────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │Researcher│  │  Coder   │  │ Reviewer │  │  Writer   │
    │          │  │          │  │          │  │           │
    │ Web fetch│  │ Code impl│  │ Quality  │  │ Docs/comm │
    │ Summarize│  │ Testing  │  │ Feedback │  │ Reports   │
    └──────────┘  └──────────┘  └──────────┘  └──────────┘
          │              │              │              │
          └──────────────┴──────────────┴──────────────┘
                              │
                    ┌─────────────────┐
                    │  Shared Context │
                    │  - Task Queue   │
                    │  - Team Memory  │
                    │  - Artifacts    │
                    └─────────────────┘
```

## Team Roles

### Researcher
- Web search, fetching, summarizing
- Competitive analysis
- Finding best practices
- Data gathering

### Coder
- Implements features
- Writes tests
- Refactors code
- Builds tools

### Reviewer  
- Code review
- Quality assessment
- Finding bugs/issues
- Proposing improvements

### Writer
- Documentation
- Reports
- Communications
- User guides

## How to Use

### Starting a Team Session

```bash
# Initialize a new team session
cd ~/Desktop/AgentTeam
./scripts/team-session.sh init "Project Name"
```

### Assigning Tasks

```bash
# Add a task to the queue
./scripts/team-task.sh add "Research API options" researcher
./scripts/team-task.sh add "Build the API endpoint" coder
./scripts/team-task.sh add "Review the code" reviewer
```

### Spawning Team Members

```bash
# Spawn a researcher agent
./scripts/spawn-agent.sh researcher "Find me info about X"

# Spawn a coder agent  
./scripts/spawn-agent.sh coder "Implement feature Y"
```

### Checking Status

```bash
# View team status
./scripts/team-status.sh

# View task queue
cat ~/Desktop/AgentTeam/workspace/tasks/queue.json
```

## Shared Context

Team members share state via `~/Desktop/AgentTeam/workspace/`:

- `tasks/queue.json` — Task queue with status
- `memory/shared.md` — Shared team memory
- `artifacts/` — Files created by team members
- `logs/` — Team activity logs

## Skill Files

| Skill | Purpose |
|-------|---------|
| `team-orchestrator` | Main coordination skill |
| `agent-researcher` | Researcher agent skill |
| `agent-coder` | Coder agent skill |
| `agent-reviewer` | Reviewer agent skill |
| `agent-writer` | Writer agent skill |

## Integration

To use with OpenClaw/duck-cli:
1. Copy `skills/` folder to your agent's skill directory
2. Copy `agents/` configuration files
3. Update paths in `config/team-config.json`

## Example Workflow

1. **Lead assigns**: "Team, we need to build a weather API wrapper"
2. **Researcher**: Gathers info on weather API options
3. **Coder**: Implements the wrapper based on research
4. **Reviewer**: Reviews code, suggests improvements
5. **Writer**: Documents the API
6. **Lead**: Reviews final result, approves

## Portability

This entire `AgentTeam/` folder is self-contained:
- Copy to any machine
- Update `config/team-config.json` with paths
- Works with any OpenClaw-compatible agent

## Commands Reference

```bash
# Session management
./scripts/team-session.sh init <name>    # Start new session
./scripts/team-session.sh status         # Check session
./scripts/team-session.sh end           # End session

# Task management  
./scripts/team-task.sh add <task> <role>     # Add task
./scripts/team-task.sh list                    # List tasks
./scripts/team-task.sh claim <id> <agent>    # Claim task
./scripts/team-task.sh complete <id>         # Mark done
./scripts/team-task.sh fail <id> <reason>    # Mark failed

# Agent spawning
./scripts/spawn-agent.sh <role> <task>       # Spawn agent

# Status
./scripts/team-status.sh                      # Full status
```

## Status

Built: 2026-04-18
Version: 1.0.0
