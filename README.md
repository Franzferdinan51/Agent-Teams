# 🤖 AgentTeams

A portable, self-contained multi-agent team coordination system for [OpenClaw](https://github.com/openclaw/openclaw) and Duck CLI.

## Features

- **Team Orchestration** — Coordinate specialized agents (researcher, coder, reviewer, writer, council)
- **AI Council Integration** — Adversarial deliberation with 45 councilors
- **Shared Context** — Tasks, memory, and artifacts shared across team members
- **Portable** — Copy to any machine, self-contained, no external dependencies
- **Duck CLI Integration** — Works with sessions_spawn for parallel agent execution
- **TypeScript** — Full type safety

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

# Add tasks
node dist/TeamCLI.js add "Research APIs" researcher
node dist/TeamCLI.js add "Build wrapper" coder

# List tasks
node dist/TeamCLI.js list

# Check status
node dist/TeamCLI.js status
```

## Team Roles

| Role | Description |
|------|-------------|
| **researcher** | Web search, summarize, gather info |
| **coder** | Write code, implement features |
| **reviewer** | Code review, quality check |
| **writer** | Documentation, reports |
| **council** | AI deliberation, adversarial decision making |

## AI Council Integration

The council provides adversarial deliberation for complex decisions:

```bash
# Start council deliberation
./scripts/spawn-council.sh "Should we use microservices?" adversarial

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
| `creative` | Brainstorming |
| `swarm_coding` | Complex builds |

### Councilor Categories

- **councilor** — Speaker, Technocrat, Ethicist, Pragmatist, Skeptic
- **vision** — Visual Analyst, Pattern Recognizer, Color Specialist
- **coding** — Architect, Backend, Frontend, DevOps, Security, QA
- **specialist** — Risk Analyst, Legal Expert, Finance Expert
- **emergency** — Meteorologist, Emergency Manager

## Architecture

```
Team Lead
    │
    ├──→ Researcher ─→ Web search, summarize
    ├──→ Coder ─→ Write code, implement
    ├──→ Reviewer ─→ Code review, quality
    ├──→ Writer ─→ Documentation
    └──→ Council ─→ Adversarial deliberation
              │
              ├──→ 45 Councilors
              ├──→ 11 Modes
              └──→ Swarm Coding
```

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
./scripts/spawn-council.sh "Complex decision?" adversarial
```

## Folder Structure

```
├── src/
│   ├── TeamCLI.ts           # CLI interface
│   └── orchestrator/        # Core team logic
├── scripts/
│   ├── team-session.sh      # Session management
│   ├── team-task.sh         # Task queue
│   ├── team-status.sh       # Status dashboard
│   ├── spawn-agent.sh       # Spawn agents
│   ├── spawn-council.sh     # Spawn council deliberation
│   └── spawn-swarm.sh       # Swarm coding
├── skills/                  # OpenClaw skills
│   ├── team-orchestrator/  # Main coordination
│   ├── agent-researcher/   # Researcher role
│   ├── agent-coder/        # Coder role
│   ├── agent-reviewer/     # Reviewer role
│   ├── agent-writer/       # Writer role
│   └── agent-council/     # Council integration
├── config/                 # Configuration
└── workspace/             # Team shared state (gitignored)
```

## Requirements

- Node.js 18+
- npm
- AI Council Server (optional): `http://localhost:3003`

## Related Projects

- [AI Bot Council](https://github.com/Franzferdinan51/AI-Bot-Council-Concensus) — Adversarial deliberation engine
- [OpenClaw](https://github.com/openclaw/openclaw) — Agent framework

## License

MIT
