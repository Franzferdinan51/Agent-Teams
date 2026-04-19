# 🤖 AgentTeams v1.0.0

**Multi-Agent Collaboration System** — spawn, coordinate, and orchestrate multiple specialized agents for complex tasks.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and [Duck CLI](https://github.com/Franzferdinan51/duck-cli).
Inspired by [Hermes Agent](https://github.com/NousResearch/hermes-agent).

## 🧠 THE HIVE MIND — All Systems Connected

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THE HIVE MIND                                │
│                                                                     │
│   EVERYTHING IS CONNECTED:                                          │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      OPENCLAW 🦞                           │   │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │   │
│   │  │Gateway  │ │Memory   │ │Skills   │ │Channels│          │   │
│   │  │Port 18789│ │MEMORY.md│ │clawhub  │ │Telegram│          │   │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│   ┌─────────────────────────┼─────────────────────────────────┐   │
│   │                         ▼                                 │   │
│   │              ┌────────────────────────┐                   │   │
│   │              │     AGENT MESH API     │                   │   │
│   │              │   (Central Nervous)    │                   │   │
│   │              │    localhost:4000      │                   │   │
│   │              └────────────────────────┘                   │   │
│   │                         │                                │   │
│   └─────────────────────────┼─────────────────────────────────┘   │
│                             │                                   │
│   ┌─────────────────────────┼─────────────────────────────────┐   │
│   │                         ▼                                 │   │
│   │  ┌───────────┐  ┌───────────┐  ┌───────────┐           │   │
│   │  │  Duck CLI │  │AI Council │  │ Dashboard │           │   │
│   │  │ (Coding) │  │(Deliberate)│  │ (Status)  │           │   │
│   │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘           │   │
│   │        │              │              │                  │   │
│   │  ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐            │   │
│   │  │Creative  │  │ 30+      │  │ Android  │            │   │
│   │  │Agents    │  │Micro     │  │ Control  │            │   │
│   │  │(Image/3D)│  │Agents   │  │ (ADB)    │            │   │
│   │  └──────────┘  └──────────┘  └──────────┘            │   │
│   └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Every system coordinates via the mesh!**

## Connect OpenClaw

```bash
# Connect OpenClaw gateway to hive
./scripts/openclaw-hive.sh

# OpenClaw registers:
# - openclaw-gateway (orchestration)
# - openclaw-memory (dreaming, MEMORY.md)
# - openclaw-skills (clawhub skills)
# - openclaw-channels (Telegram, Discord, etc.)
# - openclaw-mcp (MCP server)
# - openclaw-acp (ACP server)
```

## Quick Start

```bash
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
chmod +x *.sh scripts/*.sh

# Start mesh (hive nervous system)
cd /tmp/agent-mesh-api && npm start &

# Connect OpenClaw first
./scripts/openclaw-hive.sh

# Then connect other systems
./scripts/hive-connect.sh "duck-cli"
./scripts/hive-connect.sh "ai-council"
./scripts/hive-connect.sh "dashboard"

# Connect creative tools
./scripts/creative-hive.sh

# Run tasks
./scripts/micro.sh list
./scripts/micro.sh image-generator "futuristic city"
```

## All Connected Systems

| System | Type | Capabilities |
|--------|------|-------------|
| **OpenClaw** 🦞 | Framework | Gateway, Memory, Skills, Channels, MCP, ACP |
| **Duck CLI** | Agent | Coding, Research, Meta-agent |
| **AI Council** | Council | Deliberation, Analysis, Consensus |
| **Dashboard** | UI | Status, Metrics, Control |
| **30+ Micro-Agents** | Specialists | Each does ONE thing well |
| **Creative Agents** | Creative | Image, Video, 3D, Music |
| **Android Control** | Device | ADB, Screens, Input |

## Core Features

- **🧠 Hive Mind** — All systems connected and coordinating
- **🦞 OpenClaw** — Gateway + memory + skills + channels
- **🎨 Creative Agents** — Image, Video, 3D, Music
- **🌐 Live Communication** — Real-time WebSocket
- **🌙 Dreaming** — Light→REM→Deep memory
- **🤖 30+ Micro-Agents** — All can spawn sub-agents
- **🧠 Meta-Agent** — Plan→Execute→Critic→Heal→Learn

## Hive Scripts

| Script | Purpose |
|--------|---------|
| `openclaw-hive.sh` | Connect OpenClaw to hive |
| `hive-connect.sh` | Connect any system |
| `hive-mind.js` | Orchestrate multi-system |
| `creative-hive.sh` | Connect creative tools |

## Related Projects

| Project | Purpose |
|---------|---------|
| [OpenClaw](https://github.com/openclaw/openclaw) | 🦞 Agent framework |
| [Duck CLI](https://github.com/Franzferdinan51/duck-cli) | 💻 Desktop AI |
| [Agent Mesh API](https://github.com/Franzferdinan51/agent-mesh-api) | 🔗 Hive communication |

## Changelog

### v1.0.0 (2026-04-19)
- 🦞 **OpenClaw** integration — Gateway + components
- 🧠 **Hive Mind** — Unified coordination
- 🎨 **Creative Agents** — Image, Video, 3D, Music
- 30+ Micro-Agents (all can spawn sub-agents)
- Meta-Agent with sub-agent support

## License

MIT