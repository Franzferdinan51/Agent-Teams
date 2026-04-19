# 🤖 AgentTeams v1.0.0

**Multi-Agent Collaboration System** — spawn, coordinate, and orchestrate multiple specialized agents for complex tasks.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and [Duck CLI](https://github.com/Franzferdinan51/duck-cli).

## 🧠 THE HIVE MIND — All Systems Connected

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THE HIVE MIND                                │
│                                                                     │
│   EVERYTHING CONNECTED:                                            │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      OPENCLAW 🦞                           │   │
│   │  Gateway · Memory · Skills · Channels · MCP · ACP           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│   ┌─────────────────────────┼─────────────────────────────────┐   │
│   │              AGENT MESH API                               │   │
│   │           (Central Nervous System)                        │   │
│   └─────────────────────────┼─────────────────────────────────┘   │
│                             │                                   │
│   ┌─────────────────────────┼─────────────────────────────────┐   │
│   │          Duck CLI │ AI Council │ Dashboard │ Creative       │   │
│   │          30+ Micro │ Meta-Agent │ Android  │               │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## ✅ ALL ENHANCEMENTS COMPLETE

| Enhancement | Status | Script |
|-------------|--------|--------|
| **Task Router** | ✅ | `hive-router.js` |
| **Consensus Engine** | ✅ | `hive-consensus.js` |
| **Shared Memory** | ✅ | `hive-memory.js` |
| **Cross-Agent Learning** | ✅ | `hive-learning.js` |
| **Task Queue** | ✅ | `hive-queue.js` |
| **Emergency Broadcast** | ✅ | `hive-emergency.sh` |
| **Watchdog** | ✅ | `hive-watchdog.js` |
| **Capability Discovery** | ✅ | `hive-discovery.js` |

## 🚀 Quick Start

```bash
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
chmod +x *.sh scripts/*.sh

# Start mesh
cd /tmp/agent-mesh-api && npm start &

# Connect systems
./scripts/openclaw-hive.sh
./scripts/hive-connect.sh duck-cli
./scripts/creative-hive.sh
```

## 🧠 Hive Mind Scripts

### Task Router
```bash
# Routes task to best-fit agent
node scripts/hive-router.js "generate an image of a cat"
```

### Consensus Engine
```bash
# Hive-wide voting
node scripts/hive-consensus.js poll "REST or GraphQL?" "REST,GraphQL"
node scripts/hive-consensus.js vote poll-123 REST duck-cli
```

### Shared Memory
```bash
# Context sharing across agents
node scripts/hive-memory.js set current-task "Build API"
node scripts/hive-memory.js get current-task
node scripts/hive-memory.js search task
```

### Cross-Agent Learning
```bash
# Agents learn from each other
node scripts/hive-learning.js learn duck-cli "Use shorter explanations"
node scripts/hive-learning.js learn-from dashboard ai-council "plant analysis"
```

### Task Queue
```bash
# Distributed priority queue
node scripts/hive-queue.js critical "Fix production bug"
node scripts/hive-queue.js dequeue worker1
node scripts/hive-queue.js complete task-123
```

### Emergency Broadcast
```bash
# Alert all systems instantly
./scripts/hive-emergency.sh DEFCON1 "Production system down!"
./scripts/hive-emergency.sh WARNING "Storm alert in 2 hours"
```

### Watchdog
```bash
# Monitor all systems, auto-restart failed agents
node scripts/hive-watchdog.js
```

### Capability Discovery
```bash
# Find who can do what
node scripts/hive-discovery.js discover
node scripts/hive-discovery.js tree
node scripts/hive-discovery.js find image-generation
```

## All Systems

| System | Type | Capabilities |
|--------|------|-------------|
| 🦞 **OpenClaw** | Framework | Gateway, Memory, Skills, Channels, MCP, ACP |
| 🦆 **Duck CLI** | Agent | Coding, Research, Meta-agent |
| 🏛️ **AI Council** | Council | Deliberation, Analysis, Consensus |
| 📊 **Dashboard** | UI | Status, Metrics, Control |
| 🎨 **Creative** | Creative | Image, Video, 3D, Music |
| 📱 **Android** | Device | ADB, Screens, Input |
| 🤖 **30+ Micro** | Specialists | Single-purpose agents |

## Related Projects

| Project | Purpose |
|---------|---------|
| [OpenClaw](https://github.com/openclaw/openclaw) | 🦞 Agent framework |
| [Duck CLI](https://github.com/Franzferdinan51/duck-cli) | 🦆 Desktop AI |
| [Agent Mesh API](https://github.com/Franzferdinan51/agent-mesh-api) | 🔗 Hive communication |

## Changelog

### v1.0.0 (2026-04-19)
- ✅ **Task Router** — Auto-route to best agent
- ✅ **Consensus Engine** — Hive-wide voting
- ✅ **Shared Memory** — Context sharing
- ✅ **Cross-Agent Learning** — Agents learn from each other
- ✅ **Task Queue** — Distributed priority queue
- ✅ **Emergency Broadcast** — Alert all systems
- ✅ **Watchdog** — Monitor + auto-restart
- ✅ **Capability Discovery** — Find who can do what
- 🦞 OpenClaw integration
- 🎨 Creative agents (image, video, 3D, music)
- 30+ Micro-agents

## License

MIT