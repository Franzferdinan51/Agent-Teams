# 🤖 AgentTeams v1.0.0

**Multi-Agent Collaboration System** — spawn, coordinate, and orchestrate multiple specialized agents for complex tasks.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and [Duck CLI](https://github.com/Franzferdinan51/duck-cli).

## Version Info

| Component | Version |
|-----------|---------|
| **AgentTeams Core** | 1.0.0 |
| **Agent Mesh API** | 1.0.0 |
| **Meta-Agent (duck-cli)** | v3 |
| **Node Engine** | 18+ |

## The Core Idea

> **The best AI systems use teams of specialized agents, not one big agent.**

AgentTeams v1.0.0 gives you:
- **Agent Mesh API** — Communication backbone (auto-registers on boot)
- **5 Coordination Patterns** — Generator-Verifier, Orchestrator-Subagent, Agent Teams, Message Bus, Shared State
- **25+ Micro-Agents** — Tiny specialists for granular tasks
- **Meta-Agent** — Plan → Execute → Critic → Heal → Learn (from duck-cli)
- **QA Verification Loops** — Multi-round verification until pass
- **Multi-Round Communication** — Long-running tasks without context loss

## Quick Start

```bash
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
chmod +x *.sh scripts/*.sh

# Start Agent Mesh API (auto-registers agents)
cd /tmp/agent-mesh-api && npm start &

# Register an agent
node scripts/mesh-register.js my-agent coding research

# Run a task with QA loop
./qa-loop.sh task-1 ./my-feature
```

## 🌐 Agent Mesh API v1.0.0

**Auto-registers all agents on boot.**

```bash
# Mesh server (port 4000)
curl http://localhost:4000/api/agents \
  -H "X-API-Key: openclaw-mesh-default-key"
```

### Auto-Registration
```bash
# Agent auto-registers on start
node scripts/mesh-register.js <agent-name> <capabilities>

# Register with room
AGENT_ROOM=build node scripts/mesh-register.js coder-1 coding
```

### Key Endpoints
```bash
POST /api/agents/register     # Auto-register
GET  /api/agents              # List agents
GET  /api/agents/:id          # Agent details
POST /api/messages            # Send message
GET  /api/agents/:id/inbox    # Get inbox
POST /api/rooms/join         # Join room
```

## 📐 5 Coordination Patterns

| Pattern | Use For | Version |
|---------|---------|---------|
| `generator-verifier` | Quality-critical with evaluation | 1.0.0 |
| `orchestrator-subagent` | Hierarchical decomposition | 1.0.0 |
| `agent-teams` | Parallel independent tasks | 1.0.0 |
| `message-bus` | Event-driven pipelines | 1.0.0 |
| `shared-state` | Collaborative building | 1.0.0 |

## 🔍 QA Verification Loop v1.0.0

Every task goes through QA verification:

```
Task → Implement → QA Check → If Fail → Fix → QA Check → If Pass → Done
                         ↑                                    │
                         └────────────────────────────────────┘
```

### QA Agents
```bash
qa-test-writer     # Tests written before implementation
qa-code-review     # Code follows best practices
qa-security-scan   # No security vulnerabilities
qa-performance     # Performance meets targets
qa-documentation   # Docs complete
```

### Run QA Loop
```bash
./qa-loop.sh <task-id> <feature-path>
```

### Multi-Round QA
```
Round 1: Implement feature
Round 2: QA check (if fail → fix → re-check)
Round 3: If pass → done
```

## 🧠 Meta-Agent (from duck-cli v3)

```bash
./meta-plan.sh "Build REST API"
./meta-run.sh "Build REST API"
```

**Cycle:** Plan → Execute → Critic → Heal → Learn

Uses same Meta-Agent from [duck-cli](https://github.com/Franzferdinan51/duck-cli).

## 🎯 25+ Micro-Agents

```bash
./micro.sh researcher "AI news" &
./micro.sh coder "Build API" &
./micro.sh qa-test-writer "Write tests" &
wait
```

## 🤝 Multi-Round Communication

Long-running tasks via mesh:

```
Round 1: Research → posts to mesh
Round 2: Designer reads → posts design to mesh
Round 3: Coder reads → posts code to mesh
Round 4: QA reads → posts results to mesh
... continues until task complete
```

## 📁 Scripts Reference

| Script | Version | Purpose |
|--------|---------|---------|
| `mesh-register.js` | 1.0.0 | Auto-register with mesh |
| `qa-loop.sh` | 1.0.0 | QA verification loop |
| `patterns.sh` | 1.0.0 | 5 coordination patterns |
| `collab.sh` | 1.0.0 | Pre-built workflows |
| `micro.sh` | 1.0.0 | 25+ micro-agents |
| `meta-*.sh` | 1.0.0 | Meta-agent orchestration |
| `spawn-*.sh` | 1.0.0 | Agent spawning |
| `mesh-chat.sh` | 1.0.0 | Multi-round chat via mesh |

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    AGENTTEAMS v1.0.0                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Micro-Agents ──┐                                              │
│   (25+ tiny)     │                                              │
│                   │    ┌──────────────────────────────────────┐ │
│   Meta-Agent ────┼───→│        AGENT MESH API                │ │
│   (Plan→Exec→    │    │   http://localhost:4000              │ │
│    Critic→       │    │   Auto-registers all agents           │ │
│    Heal→Learn)   │    │   Version: 1.0.0                      │ │
│                   │    └──────────────────────────────────────┘ │
│   QA Loop ───────┼───→│                                       │
│   (verify until  │    │   Rooms: research, build, review, qa  │
│    pass)         │    │                                       │
│                   │    │                                       │
│   Team Agents ───┤    │                                       │
│   (4 roles)      │    │                                       │
│                   │    │                                       │
└───────────────────┴────┴───────────────────────────────────────┘
```

## Related Projects

| Project | Version | URL |
|---------|---------|-----|
| **Duck CLI** | v3 | https://github.com/Franzferdinan51/duck-cli |
| **Agent Mesh API** | 1.0.0 | https://github.com/Franzferdinan51/agent-mesh-api |
| **AI Bot Council** | — | https://github.com/Franzferdinan51/AI-Bot-Council-Concensus |
| **OpenClaw** | — | https://github.com/openclaw/openclaw |

## Agent Guidance

All agents MUST follow `AGENTS.md`:
- Auto-register on boot
- Use mesh for all communication
- Include version in all API calls
- Follow QA verification loop
- Multi-round coordination for long tasks

## Changelog

### v1.0.0 (2026-04-19)
- Initial release
- Agent Mesh API integration
- 5 coordination patterns
- 25+ micro-agents
- Meta-Agent (from duck-cli)
- QA verification loops
- Multi-round communication
- Auto-registration on boot
- Semantic versioning

## License

MIT