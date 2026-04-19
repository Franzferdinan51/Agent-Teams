# 🤖 AgentTeams

**Multi-Agent Collaboration System** — spawn, coordinate, and orchestrate multiple specialized agents for complex tasks.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and Duck CLI.

## The Core Idea

> **The best AI systems don't use one big agent. They use a team of specialized agents working together.**

AgentTeams gives you:
- **Micro-Agents** — 25+ tiny specialists for granular tasks
- **Team Agents** — Full roles (researcher, coder, reviewer, writer)
- **Meta-Agent** — Plans → Executes → Critiques → Heals → Learns
- **AI Council** — 45 councilors for adversarial deliberation
- **Swarm Coding** — Multiple agents building together

## Quick Start

```bash
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
chmod +x *.sh scripts/*.sh

# List all agents
./micro.sh list

# Spawn a micro-agent
./micro.sh researcher "latest AI news"

# Start a team session
./team-session.sh init "My Project"

# Spawn AI Council deliberation
./spawn-council.sh "REST vs GraphQL?" adversarial
```

## 🎯 Micro-Agents (25+ Tiny Specialists)

Single-purpose agents for granular tasks. Spawn many in parallel.

```bash
# Research 5 topics simultaneously
./micro.sh researcher "AI frameworks 2024" &
./micro.sh researcher "Best databases for startups" &
./micro.sh researcher "Cloud hosting options" &
./micro.sh researcher "CI/CD pipelines" &
./micro.sh researcher "Testing frameworks" &
wait
```

| Category | Agents |
|----------|--------|
| Research | `researcher`, `researcher-deep`, `comparer`, `summarizer` |
| Coding | `coder`, `debugger`, `bug-hunt`, `optimizer`, `security-scan` |
| Testing | `test-writer`, `code-review`, `review-summary` |
| API/DB | `api-designer`, `db-designer`, `query-writer` |
| Docs | `doc-writer`, `readme-writer`, `changelog-writer` |
| Git | `commit-writer`, `pr-writer` |
| Planning | `planner`, `architect` |

## 👥 Team Agents

Full roles for complex collaborative work.

| Role | Description |
|------|------------|
| `researcher` | Web search, summarize, gather info |
| `coder` | Write code, implement features |
| `reviewer` | Code review, quality check |
| `writer` | Documentation, reports |
| `council` | AI deliberation, adversarial decision making |
| `meta` | Meta-agent for complex orchestration |

```bash
# Add tasks to team queue
./team-task.sh add "Research weather APIs" researcher
./team-task.sh add "Build wrapper" coder
./team-task.sh add "Review code" reviewer

# Spawn team agents
./spawn-agent.sh researcher "Find 3 best free weather APIs"
./spawn-agent.sh coder "Build Python weather wrapper"
```

## 🧠 Meta-Agent

Plan → Execute → Critic → Heal → Learn cycle for complex tasks.

```bash
# Preview what meta-agent would do
./meta-plan.sh "Build a REST API"

# Full execution with all phases
./meta-run.sh "Build a REST API"
```

## 🤖 AI Council

Adversarial deliberation with 45 specialized councilors.

```bash
# Standard deliberation
./spawn-council.sh "Should we use microservices?" standard

# Adversarial debate
./spawn-council.sh "REST vs GraphQL?" adversarial

# Consensus building
./spawn-council.sh "Architecture decision?" consensus
```

### Deliberation Modes
| Mode | Use Case |
|------|----------|
| `standard` | General discussion |
| `socratic` | Deep questioning |
| `adversarial` | Conflict resolution |
| `consensus` | Agreement building |
| `swarm_coding` | Complex builds |

## 🐝 Swarm Coding

Multiple agents building together with specialized roles.

```bash
./spawn-swarm.sh "Build a weather API wrapper"
```

Swarm roles: Architect, Backend, Frontend, DevOps, Security, QA

## Multi-Agent Patterns

### Parallel Execution
```
Spawn 5 research agents simultaneously → Aggregate results
```
```bash
./micro.sh researcher "topic 1" &
./micro.sh researcher "topic 2" &
./micro.sh researcher "topic 3" &
./micro.sh researcher "topic 4" &
./micro.sh researcher "topic 5" &
wait
```

### Pipeline
```
Researcher → Coder → Reviewer → Tester → Security → Deploy
```
```bash
./spawn-agent.sh researcher "Research API options"
# Results → Coder
./spawn-agent.sh coder "Build API from research"
# Results → Reviewer  
./spawn-agent.sh reviewer "Review the API"
# ... and so on
```

### Council + Team
```
Council decides → Team implements → Council reviews
```
```bash
./spawn-council.sh "Architecture decision?" adversarial
# Council verdict → Team
./spawn-agent.sh coder "Build based on council decision"
```

## Architecture

```
                    ┌─────────────────────────────────┐
                    │         TEAM LEAD                │
                    │   (Orchestrates everything)      │
                    └───────────────┬─────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  MICRO-AGENTS │          │  TEAM AGENTS  │          │   AI COUNCIL  │
│  (25+ tiny)   │          │ (4 full roles)│          │ (45 councilors)│
├───────────────┤          ├───────────────┤          ├───────────────┤
│ researcher     │          │ researcher    │          │ Speaker      │
│ coder        │          │ coder        │          │ Technocrat   │
│ debugger     │          │ reviewer     │          │ Ethicist     │
│ test-writer  │          │ writer       │          │ Skeptic      │
│ ...          │          │              │          │ ...          │
└───────────────┘          └───────────────┘          └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │      SHARED CONTEXT          │
                    │  • Task Queue              │
                    │  • Memory                  │
                    │  • Artifacts               │
                    └─────────────────────────────┘
```

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `micro.sh` | Spawn 25+ micro-agents |
| `team-session.sh` | Start/end team sessions |
| `team-task.sh` | Task queue management |
| `team-status.sh` | Full team dashboard |
| `spawn-agent.sh` | Spawn team agents |
| `spawn-council.sh` | Spawn AI Council |
| `spawn-swarm.sh` | Spawn swarm coding |
| `meta-plan.sh` | Preview meta-agent plan |
| `meta-run.sh` | Full meta-agent execution |
| `meta-learnings.sh` | View past learnings |

## Duck CLI Integration

```javascript
// Spawn micro-agents in parallel
sessions_spawn({
  task: "Research best weather API",
  model: "minimax/MiniMax-M2.7",
  label: "micro-researcher"
})

sessions_spawn({
  task: "Write unit tests for weather module",
  model: "minimax/MiniMax-M2.7",
  label: "micro-test-writer"
})

sessions_spawn({
  task: "Security review of weather module",
  model: "minimax/MiniMax-M2.7",
  label: "micro-security-scan"
})

// Meta-agent for complex task
sessions_spawn({
  task: "Build a complete REST API",
  runtime: "subagent",
  model: "minimax/MiniMax-M2.7",
  label: "meta-agent"
})
```

## Requirements

- Bash 4+
- Node.js 18+ (for TypeScript compilation)
- AI Council Server (optional): `http://localhost:3003`

## Related Projects

- [Duck CLI](https://github.com/Franzferdinan51/duck-cli) — Desktop AI agent with meta-agent orchestrator
- [AI Bot Council](https://github.com/Franzferdinan51/AI-Bot-Council-Concensus) — Adversarial deliberation engine
- [OpenClaw](https://github.com/openclaw/openclaw) — Agent framework

## License

MIT
