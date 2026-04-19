# 🤖 AgentTeams

A portable, self-contained multi-agent team coordination system with **Meta-Agent orchestration**, **AI Council deliberation**, and **Swarm Coding** for [OpenClaw](https://github.com/openclaw/openclaw) and Duck CLI.

## Features

- **Team Orchestration** — Coordinate specialized agents
- **Meta-Agent** — Plan → Execute → Critic → Heal → Learn cycle
- **AI Council Integration** — Adversarial deliberation with 45 councilors
- **Swarm Coding** — Complex builds with multiple specialists
- **Shared Context** — Tasks, memory, and artifacts shared across team
- **Portable** — Copy to any machine, self-contained
- **Duck CLI Integration** — Works with sessions_spawn

## Quick Start

```bash
# Clone
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams

# Install
npm install

# Build
npm run build

# Initialize session
node dist/TeamCLI.js init "My Project"
```

## Team Roles

| Role | Description |
|------|-------------|
| **researcher** | Web search, summarize, gather info |
| **coder** | Write code, implement features |
| **reviewer** | Code review, quality check |
| **writer** | Documentation, reports |
| **council** | AI deliberation, adversarial decision making |
| **meta** | Meta-agent orchestration for complex tasks |

## Meta-Agent Orchestration

The meta-agent follows a **Plan → Execute → Critic → Heal → Learn** cycle:

```bash
# Preview what meta-agent would do
./scripts/meta-plan.sh "Build a REST API"

# Full execution with meta-agent
./scripts/meta-run.sh "Build a REST API"

# Show past learnings
./scripts/meta-learnings.sh
```

### Meta-Agent Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                      META-AGENT CYCLE                         │
├──────────────────────────────────────────────────────────────┤
│   ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│   │ PLANNER │────▶│ EXECUTE │────▶│ CRITIC  │              │
│   └─────────┘     └─────────┘     └─────────┘              │
│        │                                  │                   │
│        │              ┌─────────┐         │                   │
│        └─────────────▶│ HEALER │◀────────┘                   │
│                       └─────────┘                              │
│                            │                                   │
│                       ┌─────────┐                              │
│                       │ LEARNER │                              │
│                       └─────────┘                              │
└──────────────────────────────────────────────────────────────┘
```

## AI Council Integration

Adversarial deliberation with 45 councilors:

```bash
# Start council deliberation
./scripts/spawn-council.sh "REST vs GraphQL?" adversarial

# Swarm coding for complex builds
./scripts/spawn-swarm.sh "Build a REST API for task manager"
```

### Deliberation Modes

| Mode | Use Case |
|------|----------|
| `standard` | General discussion |
| `socratic` | Deep questioning |
| `adversarial` | Conflict resolution |
| `consensus` | Agreement building |
| `swarm_coding` | Complex builds |

## Swarm Coding

Complex multi-agent builds with specialized roles:

```bash
./scripts/spawn-swarm.sh "Build a weather API wrapper"
```

Roles: Architect, Backend, Frontend, DevOps, Security, QA

## Architecture

```
Team Lead
    │
    ├──→ Researcher ─→ Web search, summarize
    ├──→ Coder ─→ Write code, implement
    ├──→ Reviewer ─→ Code review, quality
    ├──→ Writer ─→ Documentation
    ├──→ Council ─→ Adversarial deliberation
    │           ├──→ 45 Councilors
    │           ├──→ 11 Deliberation Modes
    │           └──→ Swarm Coding
    │
    └──→ Meta-Agent ─→ Plan → Execute → Critic → Heal → Learn
```

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `team-session.sh` | Start/end team sessions |
| `team-task.sh` | Task queue management |
| `team-status.sh` | View full team status |
| `spawn-agent.sh` | Spawn team member agents |
| `spawn-council.sh` | Spawn AI Council deliberation |
| `spawn-swarm.sh` | Spawn Swarm Coding session |
| `meta-plan.sh` | Preview meta-agent plan |
| `meta-run.sh` | Execute with meta-agent cycle |
| `meta-learnings.sh` | Show past learnings |
| `share-team.sh` | Package for sharing |

## Integration with Duck CLI

```javascript
// Spawn a researcher agent
sessions_spawn({
  task: "Research best weather APIs",
  model: "minimax/MiniMax-M2.7",
  label: "researcher-agent"
})

// Or spawn via CLI
./scripts/spawn-agent.sh researcher "Find best APIs"
./scripts/meta-run.sh "Build API wrapper"
```

## Folder Structure

```
├── src/
│   ├── TeamCLI.ts           # CLI interface
│   └── orchestrator/        # Core team logic
├── scripts/
│   ├── team-*.sh           # Session/task management
│   ├── spawn-*.sh         # Agent/council/swarm spawning
│   └── meta-*.sh          # Meta-agent orchestration
├── skills/                  # OpenClaw skills
│   ├── team-orchestrator/
│   ├── agent-researcher/
│   ├── agent-coder/
│   ├── agent-reviewer/
│   ├── agent-writer/
│   ├── agent-council/
│   └── agent-meta/
├── config/                 # Configuration
└── workspace/           # Team shared state (gitignored)
```

## Requirements

- Node.js 18+
- npm
- AI Council Server (optional): `http://localhost:3003`

## Related Projects

- [AI Bot Council](https://github.com/Franzferdinan51/AI-Bot-Council-Concensus) — Adversarial deliberation engine
- [Duck CLI](https://github.com/Franzferdinan51/duck-cli) — Meta-agent orchestration
- [OpenClaw](https://github.com/openclaw/openclaw) — Agent framework

## License

MIT
