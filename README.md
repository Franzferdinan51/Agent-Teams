# 🤖 AgentTeams v1.0.0

**Multi-Agent Collaboration System** — spawn, coordinate, and orchestrate multiple specialized agents for complex tasks.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and [Duck CLI](https://github.com/Franzferdinan51/duck-cli).
Inspired by [Hermes Agent](https://github.com/NousResearch/hermes-agent).

## Version Info

| Component | Version |
|-----------|---------|
| **AgentTeams Core** | 1.0.0 |
| **Agent Mesh API** | 1.0.0 |
| **Dreaming Engine** | 1.0.0 |
| **Meta-Agent (duck-cli)** | v3 |
| **Hermes Patterns** | From NousResearch |
| **Node Engine** | 18+ |

## The Core Idea

> **The best AI systems use teams of specialized agents, not one big agent.**

AgentTeams v1.0.0 gives you:
- **Agent Mesh API** — Live real-time agent communication
- **Dreaming Engine** — Background memory consolidation (Light → Deep → REM)
- **5 Coordination Patterns** — Generator-Verifier, Orchestrator-Subagent, Agent Teams, Message Bus, Shared State
- **25+ Micro-Agents** — Tiny specialists for granular tasks
- **Meta-Agent** — Plan → Execute → Critic → Heal → Learn
- **Hermes Integration** — Closed learning loop, FTS5 search, skill self-improvement
- **Android Control** — Agent controls Android devices via ADB
- **QA Verification Loops** — Multi-round verification until pass
- **Multi-Round Communication** — Long-running tasks without context loss

## Quick Start

```bash
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
chmod +x *.sh scripts/*.sh

# Start Agent Mesh API
cd /tmp/agent-mesh-api && npm start &

# Register an agent
node scripts/mesh-register.js my-agent coding research

# Run dreaming (memory consolidation)
node scripts/dreaming-engine.js dream

# Run a task with live coordination
node scripts/live-messenger.js --demo
```

## 🌐 Live Agent Communication

```javascript
const { LiveMessenger } = require('./scripts/live-messenger');

const messenger = new LiveMessenger('researcher-1');
await messenger.connect();
messenger.startHeartbeat();

// Live chat
messenger.broadcast('build-api', 'Research complete!');
messenger.sendTo('coder-1', 'Here are the findings...');
```

## 🌙 Dreaming Engine (Background Memory)

```bash
# Run full cycle: Light → Deep → REM
node scripts/dreaming-engine.js dream

# Schedule daily at 3 AM
node scripts/dreaming-engine.js schedule '0 3 * * *'

# Check status
node scripts/dreaming-engine.js status
```

**Dreaming phases:**
- **Light**: Stage candidates from daily notes
- **Deep**: Score & promote to MEMORY.md (0.7+ threshold)
- **REM**: Extract themes & reflections

## 🧠 From Hermes Agent (NousResearch)

- **Closed learning loop** — Agent-curated memory with nudges
- **FTS5 session search** — Cross-session recall with LLM summarization
- **Skill self-improvement** — Skills improve during use
- **Natural language cron** — "Daily at 9 AM" scheduling
- **Subagent parallelization** — Spawn isolated workstreams

## 📱 Android Agent Control

```bash
# Spawn Android control agent
./spawn-agent.sh android "Take a photo and send to user"

# ADB commands available
adb shell input tap X Y
adb shell input swipe X1 Y1 X2 Y2
adb shell input text "TEXT"
```

**Models for Android:** Gemma 4 (LM Studio), kimi-k2.5 (API)

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
│    Critic→       │    │   WebSocket: ws://localhost:4000       │ │
│    Heal→Learn)   │    │   Live real-time communication        │ │
│                   │    └──────────────────────────────────────┘ │
│   Dreaming ──────┼───→│                                       │
│   (Light→Deep→   │    │   Rooms: build, research, review, qa   │
│    REM)          │    │                                       │
│                   │    │                                       │
│   Hermes ────────┼───→│                                       │
│   (Learning loop)│    │                                       │
│                   │    │                                       │
│   Android ────────┼───→│                                       │
│   (ADB control)  │    │                                       │
│                   │    │                                       │
└───────────────────┴────┴───────────────────────────────────────┘
```

## 📁 Scripts Reference

### Core
| Script | Purpose | Version |
|--------|---------|---------|
| `live-messenger.js` | Real-time WebSocket messaging | 1.0.0 |
| `live-coord.sh` | Live coordination commands | 1.0.0 |
| `mesh-register.js` | Auto-register with mesh | 1.0.0 |
| `session-manager.js` | Session + context loading | 1.0.0 |
| `subconscious.js` | 30-min cron consolidation | 1.0.0 |
| `dreaming-engine.js` | Light → Deep → REM cycles | 1.0.0 |

### QA & Testing
| Script | Purpose |
|--------|---------|
| `qa-loop.sh` | QA verification loop |
| `patterns.sh` | 5 coordination patterns |
| `collab.sh` | Pre-built workflows |

### Meta-Agents
| Script | Purpose |
|--------|---------|
| `meta-plan.sh` | Preview meta-agent plan |
| `meta-run.sh` | Full Plan→Execute→Critic→Heal→Learn |
| `meta-learnings.sh` | View past learnings |

## Related Projects

| Project | Version | URL |
|---------|---------|-----|
| **Duck CLI** | v3 | https://github.com/Franzferdinan51/duck-cli |
| **Agent Mesh API** | 1.0.0 | https://github.com/Franzferdinan51/agent-mesh-api |
| **Hermes Agent** | — | https://github.com/NousResearch/hermes-agent |
| **AI Bot Council** | — | https://github.com/Franzferdinan51/AI-Bot-Council-Concensus |
| **OpenClaw** | — | https://github.com/openclaw/openclaw |

## Changelog

### v1.0.0 (2026-04-19)
- Initial release
- Agent Mesh API integration (live WebSocket messaging)
- Dreaming Engine (Light → Deep → REM phases)
- Hermes Agent patterns (closed learning loop, FTS5, skill self-improvement)
- Android agent control via ADB
- 5 coordination patterns
- 25+ micro-agents
- Meta-Agent (from duck-cli)
- QA verification loops
- Multi-round communication
- Auto-registration on boot
- Semantic versioning

## License

MIT