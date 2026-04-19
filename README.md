# 🤖 AgentTeams v1.0.0

**Multi-Agent Collaboration System** — spawn, coordinate, and orchestrate multiple specialized agents for complex tasks.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and [Duck CLI](https://github.com/Franzferdinan51/duck-cli).
Inspired by [Hermes Agent](https://github.com/NousResearch/hermes-agent).

## The Core Idea

> **The best AI systems use teams of specialized agents, not one big agent.**

AgentTeams v1.0.0 gives you:
- **🧠 Hive Mind** — Connect multiple systems into unified coordination
- **Agent Mesh API** — Live real-time agent communication
- **Dreaming Engine** — Background memory consolidation (Light → REM → Deep)
- **5 Coordination Patterns** — Generator-Verifier, Orchestrator-Subagent, Agent Teams, Message Bus, Shared State
- **25+ Micro-Agents** — Tiny specialists for granular tasks
- **Meta-Agent** — Plan → Execute → Critic → Heal → Learn
- **Hermes Integration** — Closed learning loop, FTS5 search, skill self-improvement
- **Android Control** — Agent controls Android devices via ADB
- **QA Verification Loops** — Multi-round verification until pass

## 🧠 Hive Mind — Multi-System Coordination

Connect ANY system to the hive:

```bash
# Connect Duck CLI
./scripts/hive-connect.sh "duck-cli"

# Connect Dashboard
./scripts/hive-connect.sh "dashboard" "status,metrics"

# Connect AI Council
./scripts/hive-connect.sh "ai-council" "analysis,deliberation"

# Connect CannaAI (grow app)
./scripts/hive-connect.sh "cannaai" "vision,plant-analysis"
```

```
┌──────────────────────────────────────────────────────────────────┐
│                     THE HIVE MIND                                 │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │  Duck CLI   │  │  Dashboard  │  │  AI Council  │            │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│          └────────────────┼────────────────┘                     │
│                         ▼                                        │
│              ┌────────────────────────┐                          │
│              │     AGENT MESH API     │                         │
│              │   (localhost:4000)     │                         │
│              └────────────────────────┘                          │
│                         │                                        │
│          ┌─────────────┼─────────────┐                          │
│          ▼             ▼             ▼                          │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│   │ CannaAI  │  │ Agent    │  │  Any    │                     │
│   │ Grow App │  │ Teams    │  │ System  │                     │
│   └──────────┘  └──────────┘  └──────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

Every system can:
- ✅ Talk to each other via mesh
- ✅ Share context and memory
- ✅ Coordinate complex multi-system tasks
- ✅ Broadcast to all systems at once

## Quick Start

```bash
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
chmod +x *.sh scripts/*.sh

# Start Agent Mesh API
cd /tmp/agent-mesh-api && npm start &

# Connect to hive
./scripts/hive-connect.sh my-system

# Run dreaming (memory consolidation)
node scripts/dreaming-engine.js dream

# Run live coordination
node scripts/live-messenger.js --demo
```

## 🌐 Live Agent Communication

```javascript
const { LiveMessenger } = require('./scripts/live-messenger');

const messenger = new LiveMessenger('researcher-1');
await messenger.connect();
messenger.broadcast('hive', 'Starting research...');
```

## 🌙 Dreaming Engine (Background Memory)

```bash
node scripts/dreaming-engine.js dream
# Phase order: Light → REM → Deep
# Scoring: 6 weighted signals, thresholds: score≥0.8, recalls≥3, queries≥3
```

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
│    Critic→       │    │   Live real-time communication     │ │
│    Heal→Learn)   │    └──────────────────────────────────────┘ │
│                   │                                              │
│   Dreaming ──────┼───→│                                       │
│   (Light→REM→    │    │   HIVE MIND                          │
│    Deep)         │    │   Every system connected              │
│                   │    │                                       │
│   Hermes ────────┼───→│                                       │
│   (Learning loop)│    │                                       │
│                   │    │                                       │
│   Android ──────┼───→│                                       │
│   (ADB control)  │    │                                       │
│                   │    │                                       │
└───────────────────┴────┴───────────────────────────────────────┘
```

## Scripts Reference

### Hive Mind
| Script | Purpose |
|--------|---------|
| `hive-connect.sh` | Connect any system to hive |
| `hive-mind.js` | Orchestrate multi-system tasks |

### Live Communication
| Script | Purpose |
|--------|---------|
| `live-messenger.js` | WebSocket real-time chat |
| `live-coord.sh` | Live coordination commands |
| `mesh-register.js` | Auto-register with mesh |

### Memory & Dreaming
| Script | Purpose |
|--------|---------|
| `dreaming-engine.js` | Light→REM→Deep cycles |
| `subconscious.js` | 30-min cron consolidation |
| `session-manager.js` | Session + context loading |

## Related Projects

| Project | Purpose |
|---------|---------|
| [Duck CLI](https://github.com/Franzferdinan51/duck-cli) | Desktop AI agent |
| [Agent Mesh API](https://github.com/Franzferdinan51/agent-mesh-api) | Agent communication |
| [Hermes Agent](https://github.com/NousResearch/hermes-agent) | Closed learning loop |
| [OpenClaw](https://github.com/openclaw/openclaw) | Agent framework |

## Changelog

### v1.0.0 (2026-04-19)
- Hive Mind — multi-system coordination
- Agent Mesh API (live WebSocket messaging)
- Dreaming Engine (Light → REM → Deep)
- Hermes Agent patterns
- Android agent control (ADB + reflection)
- 5 coordination patterns
- 25+ micro-agents
- Meta-Agent (Plan→Execute→Critic→Heal→Learn)
- QA verification loops
- Active memory (MEMORY.md + daily notes)

## License

MIT