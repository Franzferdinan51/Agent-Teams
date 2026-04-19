# 🤖 AgentTeams

**Multi-Agent Collaboration System** — spawn, coordinate, and orchestrate multiple specialized agents for complex tasks.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and Duck CLI.

## The Core Idea

> **The best AI systems don't use one big agent. They use teams of specialized agents working together.**

AgentTeams gives you:
- **5 Coordination Patterns** — Generator-Verifier, Orchestrator-Subagent, Agent Teams, Message Bus, Shared State
- **25+ Micro-Agents** — Tiny specialists for granular tasks
- **Team Agents** — Full roles (researcher, coder, reviewer, writer)
- **Meta-Agent** — Plans → Executes → Critiques → Heals → Learns
- **AI Council** — 45 councilors for adversarial deliberation
- **Swarm Coding** — Multiple agents building together

## Quick Start

```bash
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
chmod +x *.sh scripts/*.sh

# See all patterns and workflows
./patterns.sh list
./collab.sh list

# Try a workflow
./collab.sh research "AI agent frameworks"
./patterns.sh generator-verifier

# List micro-agents
./micro.sh list
```

## 📐 5 Coordination Patterns

Based on Claude's multi-agent research.

| Pattern | Use For | Example |
|---------|---------|---------|
| `generator-verifier` | Quality-critical with evaluation | Write code + test |
| `orchestrator-subagent` | Hierarchical decomposition | Build full app |
| `agent-teams` | Parallel independent tasks | Research 5 topics |
| `message-bus` | Event-driven pipelines | CI/CD pipeline |
| `shared-state` | Collaborative building | Research → expand |

### Pattern 1: Generator-Verifier 🔄
```
┌───────────┐     ┌───────────┐
│ GENERATOR │────▶│ VERIFIER  │
└───────────┘     └─────┬─────┘
     ▲                    │
     └─────────│  Loop │
               └─────────────┘
```
Write code → Verify → If failed, rewrite → Loop until verified

### Pattern 2: Orchestrator-Subagent 👔
```
           ┌─────────────┐
           │ ORCHESTRATOR│
           └──────┬──────┘
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│SUB-AG 1│ │SUB-AG 2│ │SUB-AG 3│
└────────┘ └────────┘ └────────┘
```
Lead agent plans → dispatches to specialists → synthesizes

### Pattern 3: Agent Teams 👥
```
┌────────┐ ┌────────┐ ┌────────┐
│AGENT 1 │ │AGENT 2 │ │AGENT 3 │  (parallel)
└────┬───┘ └────┬───┘ └────┬───┘
     └─────────┼─────────┘
               ▼
         ┌───────────┐
         │AGGREGATOR│
         └───────────┘
```
5 research agents → aggregate results

### Pattern 4: Message Bus 🚌
```
┌──────────────────────────────────────┐
│           MESSAGE BUS                  │
│   (Event queue, pub/sub)             │
└──────┬───────────────┬───────────────┬──┘
       ▼               ▼               ▼
   BUILD → TEST → DEPLOY → MONITOR
```
Event triggers → agents react → chain continues

### Pattern 5: Shared State 📊
```
┌──────────────────────────────────────┐
│         SHARED STATE                  │
│  - Task queue    - Results           │
└──────┬───────────────┬───────────────┬──┘
       ▼               ▼               ▼
   RESEARCHER A → RESEARCHER B → SYNTHESIZER
```
Agents read/write shared DB, build on each other

## 🤝 Pre-Built Workflows

```bash
# Research pipeline (5 agents in parallel)
./collab.sh research "AI agent frameworks"

# Build pipeline (design → code → test → review)
./collab.sh build "REST API"

# Write pipeline (outline → draft → review → edit)
./collab.sh write "technical documentation"

# Debug pipeline (reproduce → hunt → fix → test)
./collab.sh debug "null pointer error"

# Analyze pipeline (collect → analyze → compare → recommend)
./collab.sh analyze "the codebase"

# Ship pipeline (build → test → security → deploy)
./collab.sh ship "new feature"
```

## 🎯 Micro-Agents (25+ Tiny Specialists)

Single-purpose agents for granular tasks. Spawn many in parallel.

```bash
# Research 5 topics simultaneously
./micro.sh researcher "AI news" &
./micro.sh researcher "DB trends" &
./micro.sh researcher "Cloud options" &
./micro.sh researcher "DevOps tools" &
./micro.sh researcher "Security" &
wait
```

| Category | Agents |
|----------|--------|
| Research | `researcher`, `researcher-deep`, `comparer`, `summarizer`, `explainer` |
| Coding | `coder`, `debugger`, `bug-hunt`, `optimizer`, `security-scan`, `refactor` |
| Testing | `test-writer`, `code-review`, `review-summary` |
| API/DB | `api-designer`, `db-designer`, `query-writer` |
| Docs | `doc-writer`, `readme-writer`, `changelog-writer`, `comment-writer` |
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

## 🧠 Meta-Agent

Plan → Execute → Critic → Heal → Learn cycle for complex tasks.

```bash
./meta-plan.sh "Build a REST API"
./meta-run.sh "Build a REST API"
```

## 🤖 AI Council

Adversarial deliberation with 45 councilors.

```bash
./spawn-council.sh "REST vs GraphQL?" adversarial
./spawn-swarm.sh "Build a weather API wrapper"
```

## 📁 Scripts Reference

| Script | Purpose |
|--------|---------|
| `patterns.sh` | 5 coordination patterns |
| `collab.sh` | Pre-built multi-agent workflows |
| `micro.sh` | 25+ micro-agents |
| `team-*.sh` | Session and task management |
| `spawn-*.sh` | Agent spawning |
| `meta-*.sh` | Meta-agent orchestration |

## 🏗️ Architecture

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
│  PATTERNS     │          │  MICRO-AGENTS │          │  TEAM AGENTS  │
├───────────────┤          ├───────────────┤          ├───────────────┤
│ Generator-    │          │ 25+ tiny     │          │ researcher    │
│ Verifier      │          │ specialists  │          │ coder        │
│ Orchestrator- │          │ Parallel     │          │ reviewer     │
│ Subagent      │          │ spawning     │          │ writer       │
│ Agent Teams   │          │              │          │ council      │
│ Message Bus   │          │              │          │ meta         │
│ Shared State  │          │              │          │              │
└───────────────┘          └───────────────┘          └───────────────┘
```

## Duck CLI Integration

```javascript
// Spawn micro-agents in parallel
sessions_spawn({ task: "Research X", label: "micro-researcher" })
sessions_spawn({ task: "Research Y", label: "micro-researcher" })
sessions_spawn({ task: "Research Z", label: "micro-researcher" })

// Generator-Verifier
sessions_spawn({ task: "Write auth module", label: "generator" })
sessions_spawn({ task: "Verify auth module quality", label: "verifier" })

// Full meta-agent
sessions_spawn({ task: "Build complete API", runtime: "subagent", label: "meta" })
```

## Requirements

- Bash 4+
- Node.js 18+ (for TypeScript)
- AI Council Server (optional): `http://localhost:3003`

## Related Projects

- [Duck CLI](https://github.com/Franzferdinan51/duck-cli) — Desktop AI agent
- [AI Bot Council](https://github.com/Franzferdinan51/AI-Bot-Council-Concensus) — Deliberation
- [OpenClaw](https://github.com/openclaw/openclaw) — Agent framework

## License

MIT
