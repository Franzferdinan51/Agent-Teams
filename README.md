# 🤖 AgentTeams v1.0.0

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Franzferdinan51/Agent-Teams)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

**The ultimate multi-agent collaboration system.** Spawn, coordinate, and orchestrate multiple specialized agents for complex tasks — with a giant AI Senate, decentralized P2P mesh, and hive mind intelligence.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and [Duck CLI](https://github.com/Franzferdinan51/duck-cli).
Inspired by [Hermes Agent](https://github.com/NousResearch/hermes-agent).

---

## 🕸️ THE HIVE SENATE — Complete System

```
┌─────────────────────────────────────────────────────────────────────┐
│                     🏛️ THE HIVE SENATE 🏛️                          │
│                                                                     │
│   Every system connected, every agent coordinated                    │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │ 🦞 OpenClaw  │ 🦆 Duck CLI  │ 🏛️ AI Council │ 📊 Dashboard │ │
│   │ Gateway      │  Coding      │ 45 Senators   │ Status       │ │
│   │ Memory       │  Research     │ 11 Modes      │ Metrics      │ │
│   │ Skills       │  Meta-Agent  │ Deliberate    │ Control      │ │
│   └───────────────────────────────────────────────────────────┘   │
│                              │                                       │
│   ┌─────────────────────────┼────────────────────────────────┐   │
│   │              🕸️ P2P MESH │ 🤖 MICRO-AGENTS │ ✅ QA LOOP      │   │
│   │           Decentralized   │ 30+ Specialists │ Verification  │   │
│   │              No Server   │ Spawn Sub-Agents │ Auto-Fix      │   │
│   └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────┐   │
│   │              🌙 DREAMING SYSTEM                            │   │
│   │       Light → REM → Deep Memory Consolidation              │   │
│   └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ CLI + MCP (Cross-Platform)

**Full command line interface + Model Context Protocol**

```bash
# Install
bash install.sh

# Use CLI
hive gov                        # Government hub
hive scoring score agent "task" 8 9 8 9  # Score an agent
hive memory remember general "Remember this"
hive platform                   # Show platform info

# MCP Server (for Claude integration)
node cli/mcp/server.js
```

**Supported:** Mac ✅ | Linux ✅ | Termux (Android) ✅ | Termux:API ✅

## 📱 Termux (Android) Extra Features

With Termux:API installed (`pkg install termux-api`):

```bash
hive camera 0         # Take photo (0=back, 1=front)
hive location         # Get GPS coordinates
hive clipboard [text]  # Get or set clipboard
hive notify "Title" "Message"  # Show notification
hive speak "Hello"    # Text-to-speech
hive sms 5551234 "Hi" # Send SMS
hive vibrate 500      # Vibrate
hive flashlight on    # Toggle flashlight
```

---

## 🚀 GET STARTED (5 Minutes)

```bash
# Clone
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams

# Make executable
chmod +x *.sh scripts/*.sh scripts/*.js

# Start mesh (central nervous system)
cd /tmp/agent-mesh-api && npm start &

# Connect OpenClaw
./scripts/openclaw-hive.sh

# Connect AI Council
./scripts/ai-council-hive.sh

# Done! Explore below 👇
```

**Then read `START-HERE.md` for everything, or `QUICKREF.md` for commands.**

---

## 🤖 30+ MICRO-AGENTS

Spawn with `./scripts/micro.sh <agent> <task>`

### Research
| Agent | What It Does |
|-------|-------------|
| `researcher` | Web search and summarize |
| `researcher-deep` | Deep research on a topic |
| `comparer` | Compare options with pros/cons |
| `summarizer` | Summarize long text |

### Coding
| Agent | What It Does |
|-------|-------------|
| `coder` | Write code for a feature |
| `debugger` | Find and fix bugs |
| `bug-hunt` | Hunt for potential bugs |
| `security-scan` | Security vulnerability review |
| `refactor` | Refactor messy code |
| `optimizer` | Optimize code performance |

### Creative
| Agent | What It Does | Tools |
|-------|-------------|-------|
| `image-generator` | Text-to-image | ComfyUI, MiniMax |
| `video-generator` | Create videos | MiniMax, AnimateDiff |
| `3d-modeler` | Create 3D models | Blender |
| `music-generator` | Generate music | MiniMax |
| `speech-agent` | Text-to-speech | MiniMax |

### QA & Docs
| Agent | What It Does |
|-------|-------------|
| `test-writer` | Write unit tests |
| `code-review` | Focused code review |
| `doc-writer` | Write technical docs |
| `readme-writer` | Write README files |

**All micro-agents can spawn sub-agents as needed.**

---

## 🏛️ THE AI SENATE — 45 Councilors

The AI Council Chamber is a **parliamentary system** where decisions are debated by competing expert archetypes.

### Councilors by Category

| Category | Senators | Key Roles |
|----------|---------|-----------|
| **Core** | 15 | Speaker, Technocrat, Ethicist, Pragmatist, Skeptic, Sentinel... |
| **Business** | 5 | Economist, Product Manager, Marketing, Finance, Risk |
| **Technical** | 7 | DevOps, Security, Data Scientist, Performance, QA... |
| **Emergency** | 5 | Meteorologist, Emergency Manager, Risk Analyst... |
| **Plant Science** | 2 | 🌿 Botanist, 🧬 Geneticist |
| **Vision** | 8 | Visual Analyst, Pattern Recognizer, Color Specialist... |

**Total: 45 specialized senators**

### 11 Deliberation Modes

| Mode | Best For |
|------|----------|
| ⚖️ Legislative | Debate + vote on proposals |
| 🧠 Deep Research | Multi-round investigation |
| 🐝 Swarm Hive | Dynamic task decomposition |
| 💻 Swarm Coding | Software engineering |
| 🌪️ Emergency Response | Crisis decisions |
| 📊 Risk Assessment | Risk analysis |
| 🤝 Consensus Building | Find common ground |
| 👁️ Vision Council | Image analysis |

### When to Use

| Scenario | Council |
|----------|---------|
| Major architectural decision | Legislative vote |
| Plant health diagnosis | 🌿 Botanist + 🧬 Geneticist |
| Severe weather incoming | Meteorologist + Emergency Manager |
| Security vulnerability | Security Expert + Sentinel |
| Complex code review | Coder + QA + Security Expert |
| Image analysis | Vision Council (8 specialists) |

---

## 🕸️ P2P DECENTRALIZED MESH

**No central server — pure peer-to-peer agent communication.**

Inspired by [BitChat](https://github.com/permissionlesstech/bitchat).

```
      🕸️ Agent A ◄──────► 🕸️ Agent B
         │    \            /    │
         │     \          /     │
         │      \        /      │
         │    ┌──────┴──────┐   │
         │    │  🛰️ Relay   │   │ (optional)
         │    └──────┬──────┘   │
         │           │           │
         ▼           ▼           ▼
      🕸️ Agent C ◄──────► 🕸️ Agent D
```

- **Gossip protocol** — messages spread node-to-node
- **TTL limits** — prevents infinite loops
- **Optional relays** — helps nodes behind NAT
- **No blockchain** — pure P2P networking

```bash
# Start relay (optional)
./scripts/hive-p2p.sh 4100 relay

# Start peer
./scripts/hive-p2p.sh 4101 peer

# Works over Tailscale VPN too!
```

---

## 🧠 HIVE MIND — Core Scripts

| Script | Purpose |
|--------|---------|
| `hive-router.js` | Route task to best agent |
| `hive-consensus.js` | Hive-wide voting |
| `hive-memory.js` | Shared context |
| `hive-learning.js` | Cross-agent learning |
| `hive-queue.js` | Distributed task queue |
| `hive-emergency.sh` | Emergency broadcasts |
| `hive-watchdog.js` | Monitor + restart |
| `hive-discovery.js` | Find capabilities |

---

## 🌙 DREAMING SYSTEM

Background memory consolidation while you sleep.

```bash
node scripts/dreaming-engine.js dream

# Phase: Light → REM → Deep
# 6 scoring signals
# 3 gates to long-term memory
```

---

## 🚨 EMERGENCY SYSTEM

DEFCON-style alerts for the whole hive.

```bash
./scripts/hive-emergency.sh DEFCON1 "Critical!"
./scripts/hive-emergency.sh DEFCON3 "Warning"
./scripts/hive-emergency.sh DEFCON5 "All clear"
```

---

## 📁 DOCUMENTATION

| File | What It Is |
|------|-----------|
| `START-HERE.md` | **START HERE** — Quick start guide |
| `QUICKREF.md` | All scripts at a glance |
| `AGENTS.md` | For AI agents (what to do) |
| `skills/*/SKILL.md` | Detailed skill docs |

---

## 🔧 DEPENDENCIES

```bash
# Node.js (for JS scripts)
node --version  # Need v18+

# Agent Mesh API (for centralized coordination)
git clone https://github.com/Franzferdinan51/agent-mesh-api.git /tmp/agent-mesh-api
cd /tmp/agent-mesh-api && npm install && npm start
```

---

## ⚙️ ENVIRONMENT

```bash
# Default values
export MESH_URL=http://localhost:4000
export MESH_KEY=openclaw-mesh-default-key
export OPENCLAW_URL=http://localhost:18789
export COUNCIL_URL=http://localhost:3003
```

---

## 🏗️ ARCHITECTURE

```
AgentTeams/
├── scripts/              # All executable scripts
│   ├── hive-*.js       # Hive Mind (9 scripts)
│   ├── hive-*.sh       # Hive shell wrappers
│   ├── micro.sh        # 30+ micro-agents
│   ├── meta-*.sh       # Meta-Agent cycle
│   ├── p2p-*.js       # P2P mesh
│   └── dreaming-*.js  # Memory consolidation
│
├── skills/              # Skill documentation (17 skills)
│   ├── hive-mind/      # Hive system
│   ├── ai-council/     # AI Senate
│   ├── p2p-mesh/      # Decentralized
│   ├── creative/       # Image, Video, 3D
│   └── ...
│
├── src/                 # Source code
├── config/             # Configuration
├── START-HERE.md        # Quick start
├── QUICKREF.md          # Commands reference
└── README.md           # This file
```

---

## 🆚 COMPARISON

| Feature | This System | Others |
|---------|-------------|--------|
| **AI Senate** | 45 councilors, 11 modes | None |
| **P2P Mesh** | Decentralized, no blockchain | Centralized only |
| **Dreaming** | Light → REM → Deep cycles | None |
| **30+ Agents** | All can spawn sub-agents | Fixed agents |
| **Multi-System** | OpenClaw, Duck CLI, Council | Single system |

---

## 📖 LEARN MORE

- **Quick Start:** `START-HERE.md`
- **All Commands:** `QUICKREF.md`
- **For Agents:** `AGENTS.md`
- **Skills:** `skills/*/SKILL.md`

---

## 🤝 RELATED PROJECTS

| Project | Purpose |
|---------|---------|
| [OpenClaw](https://github.com/openclaw/openclaw) | 🦞 Agent framework |
| [Duck CLI](https://github.com/Franzferdinan51/duck-cli) | 🦆 Desktop AI |
| [Agent Mesh API](https://github.com/Franzferdinan51/agent-mesh-api) | 🕸️ Mesh communication |
| [AI Council](https://github.com/Franzferdinan51/AI-Bot-Council-Concensus) | 🏛️ 45 councilors |
| [BitChat](https://github.com/permissionlesstech/bitchat) | 🕸️ P2P inspiration |

---

## 📋 CHANGELOG

### v1.0.0 (2026-04-19)
- 🕸️ **P2P Decentralized Mesh** — no blockchain, pure peer-to-peer
- 🏛️ **AI Senate** — 45 councilors + 11 deliberation modes
- 🧠 **Hive Mind** — Router, Queue, Memory, Learning, Consensus
- 🌙 **Dreaming System** — Light → REM → Deep memory
- 🤖 **30+ Micro-Agents** — All can spawn sub-agents
- ✅ **Complete Documentation** — START-HERE, QUICKREF, AGENTS

---

## 📜 LICENSE

MIT

---

**Welcome to the Hive Senate.** 🏛️🕸️🦆
