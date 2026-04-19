# 🤖 AgentTeams

A portable, self-contained multi-agent team coordination system for [OpenClaw](https://github.com/openclaw/openclaw) and Duck CLI.

## Features

- **Team Orchestration** — Coordinate specialized agents (researcher, coder, reviewer, writer)
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

## Architecture

```
Team Lead
    │
    ├──→ Researcher ─→ Web search, summarize
    ├──→ Coder ─→ Write code, implement
    ├──→ Reviewer ─→ Code review, quality
    └──→ Writer ─→ Documentation
```

## Integration with Duck CLI

```javascript
// Spawn a researcher agent
sessions_spawn({
  task: "Research best weather APIs",
  model: "minimax/MiniMax-M2.7",
  label: "researcher-agent"
})
```

## Folder Structure

```
├── src/
│   ├── TeamCLI.ts           # CLI interface
│   └── orchestrator/        # Core team logic
├── scripts/                 # Bash scripts
├── skills/                 # OpenClaw skills
├── config/                 # Configuration
└── workspace/             # Team shared state (gitignored)
```

## Requirements

- Node.js 18+
- npm

## License

MIT
