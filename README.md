# 🤖 AgentTeams

**Multi-Agent Collaboration System** — spawn, coordinate, and orchestrate multiple specialized agents for complex tasks.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and Duck CLI.

## The Core Idea

> **The best AI systems don't use one big agent. They use teams of specialized agents working together.**

AgentTeams gives you:
- **Agent Mesh API** — Communication backbone for distributed agents
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

# Start Agent Mesh API (communication backbone)
cd /tmp/agent-mesh-api && npm start &

# See all patterns and workflows
./patterns.sh list
./collab.sh list

# Try a workflow
./collab.sh research "AI agent frameworks"

# List micro-agents
./micro.sh list
```

## 🌐 Agent Mesh API

The communication backbone for distributed multi-agent systems.

```bash
# Start mesh server
cd /tmp/agent-mesh-api && npm install && npm start

# API: http://localhost:4000
# WebSocket: ws://localhost:4000/ws
# Key: openclaw-mesh-default-key
```

Features:
- Agent registration and discovery
- Inter-agent messaging
- Real-time WebSocket events
- File transfer between agents
- Health monitoring dashboard
- Auto-update system

## 📐 5 Coordination Patterns

Based on Claude's multi-agent research.

| Pattern | Use For | Example |
|---------|---------|---------|
| `generator-verifier` | Quality-critical with evaluation | Write code + test |
| `orchestrator-subagent` | Hierarchical decomposition | Build full app |
| `agent-teams` | Parallel independent tasks | Research 5 topics |
| `message-bus` | Event-driven pipelines | CI/CD pipeline |
| `shared-state` | Collaborative building | Research → expand |

## 🤝 Pre-Built Workflows

```bash
./collab.sh research "AI agent frameworks"  # 5 agents parallel
./collab.sh build "REST API"                # design → code → test → deploy
./collab.sh ship "new feature"              # build → test → security → deploy
```

## 🎯 Micro-Agents (25+ Tiny Specialists)

Single-purpose agents. Spawn 10+ in parallel.

```bash
./micro.sh researcher "AI news" &
./micro.sh researcher "DB trends" &
./micro.sh researcher "Cloud options" &
./micro.sh researcher "DevOps" &
./micro.sh researcher "Security" &
wait
```

## 🧠 Meta-Agent

Plan → Execute → Critic → Heal → Learn cycle.

```bash
./meta-run.sh "Build a REST API"
```

## 🤖 AI Council

45 councilors for adversarial deliberation.

```bash
./spawn-council.sh "REST vs GraphQL?" adversarial
./spawn-swarm.sh "Build a weather API"
```

## 📁 Scripts Reference

| Script | Purpose |
|--------|---------|
| `patterns.sh` | 5 coordination patterns |
| `collab.sh` | Pre-built multi-agent workflows |
| `micro.sh` | 25+ micro-agents |
| `spawn-*.sh` | Agent spawning |
| `meta-*.sh` | Meta-agent orchestration |

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    AGENT TEAMS                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   Micro-Agents ─┬─→ Agent Mesh API ←─┬─ Team Agents       │
│   (25+ tiny)    │                    │ (4 roles)           │
│                 │    ┌───────────┐   │                     │
│   Meta-Agent ───┼───→│ AGENT MESH│←──+─ AI Council        │
│   (5 phases)    │    └───────────┘   │ (45 councilors)    │
│                 │                    │                     │
│   Swarm ────────┼────────────────────+── Swarm Coding       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Related Projects

- [Duck CLI](https://github.com/Franzferdinan51/duck-cli) — Desktop AI agent
- [Agent Mesh API](https://github.com/Franzferdinan51/agent-mesh-api) — Agent communication
- [AI Bot Council](https://github.com/Franzferdinan51/AI-Bot-Council-Concensus) — Deliberation
- [OpenClaw](https://github.com/openclaw/openclaw) — Agent framework

## License

MIT
