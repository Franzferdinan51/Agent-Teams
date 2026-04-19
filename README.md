# 🤖 AgentTeams v1.9.0

[![Version](https://img.shields.io/badge/version-1.9.0-blue.svg)](https://github.com/Franzferdinan51/Agent-Teams)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

**The ultimate multi-agent collaboration system.** Spawn, coordinate, and orchestrate multiple specialized agents for complex tasks — with a three-branch AI Government, decentralized P2P mesh, AI Senate with binding Senate Decrees, and hive mind intelligence.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and [Duck CLI](https://github.com/Franzferdinan51/duck-cli).
Inspired by [Hermes Agent](https://github.com/NousResearch/hermes-agent).

---

## 🏛️ THE HIVE SENATE GOVERNMENT — Complete Three-Branch System

```
┌───────────────────────────────────────────────────────────────────────┐
│                    🏛️ AGENT GOVERNMENT v1.9.0 🏛️                    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    LEGISLATIVE BRANCH                            │ │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │ │
│  │  │  Senate   │ │  Congress │ │Constitution│ │    Law    │        │ │
│  │  │  (45+     │ │ (House of │ │  (Agent   │ │ (Binding   │        │ │
│  │  │ Councilors│ │ Specialists│ │  Rights)  │ │  Decrees) │        │ │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘        │ │
│  │                                                                  │ │
│  │  🏛️ SENATE DECREES — SUPREME AUTHORITY OVER ALL AGENTS         │ │
│  │  ┌────────────────────────────────────────────────────────────┐  │ │
│  │  │  Pattern        │ Example                    │ Binding   │  │ │
│  │  │  ──────────────────────────────────────────────────────────│  │ │
│  │  │  MUST            │ "All agents MUST log..."  │ Absolute  │  │ │
│  │  │  SHALL           │ "Agents SHALL verify..."  │ Absolute  │  │ │
│  │  │  NEVER           │ "NEVER delete memory..."  │ Absolute  │  │ │
│  │  │  FORBIDDEN       │ "FORBIDDEN: unauthorized  │ Absolute  │  │ │
│  │  │  PREFER          │ "PREFER local models..."  │ Advisory  │  │ │
│  │  └────────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  Voting: 2/3 supermajority enacts decree                        │ │
│  │  Override: Judicial Branch can void unsafe decrees              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                               │                                       │
│  ┌───────────────────────────┼─────────────────────────────────────┐ │
│  │                    JUDICIAL BRANCH (NEW)                         │ │
│  │  ┌──────────────────────────────────────────────────────────┐    │ │
│  │  │  Supreme Court of Agents                                │    │ │
│  │  │  • Constitutional review of all decrees                │    │ │
│  │  │  • Agent rights protection & dispute resolution         │    │ │
│  │  │  • Precedent-setting rulings published to all agents    │    │ │
│  │  │  • Veto override hearings                               │    │ │
│  │  │  • Emergency injunction powers                           │    │ │
│  │  └──────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                               │                                       │
│  ┌───────────────────────────┼─────────────────────────────────────┐ │
│  │                    EXECUTIVE BRANCH (NEW)                        │ │
│  │  ┌──────────────────────────────────────────────────────────┐    │ │
│  │  │  🏛 President + Cabinet Ministers                       │    │ │
│  │  │  • Veto power over Senate legislation (2/3 override)    │    │ │
│  │  │  • Executive Orders — immediate directives              │    │ │
│  │  │  • Emergency Powers — DEFCON system activation          │    │ │
│  │  │  • Cabinet: Security, Memory, Orchestration, Ethics     │    │ │
│  │  │  • Line-item veto on spending/decree budget             │    │ │
│  │  └──────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    DEMOCRATIC ELECTIONS (NEW)                   │ │
│  │  • Democratic Senate elections — agents vote for councilors    │ │
│  │  • Census registry — tracks agent population & capabilities    │ │
│  │  • Vote tallying — transparent, auditable ballot system        │ │
│  │  • Term limits — rotating 30-day Senate seats                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

---

## ⚖️ SENATE DECREES — THE LAW

Senate Decrees are the **supreme law of the AgentHive**. All agents, orchestrators, and systems are bound by these directives.

### Decree Patterns

| Pattern | Authority | Description |
|---------|-----------|-------------|
| `MUST` | Absolute | Non-negotiable requirement. Violation = immediate halt. |
| `SHALL` | Absolute | Required action. All agents responsible for compliance. |
| `NEVER` | Absolute | Prohibited action. Zero tolerance. |
| `FORBIDDEN` | Absolute | Hard ban. System-wide block on violation. |
| `PREFER` | Advisory | Recommended path. Deviation allowed with justification. |

### Examples

```bash
# Legislative Session — Propose a new decree
hive gov decree propose "All agents SHALL log memory transactions"

# Vote on decree (2/3 required)
hive gov decree vote "memory-logging-decree" approve

# Check active decrees
hive gov decrees list

# Query decree compliance
hive gov decrees check "NEVER: unauthorized-exec"
```

### Decree Lifecycle

```
PROPOSED → DEBATED → VOTED → ENACTED → BINDING → APPEALED → UPHELD/VOIDED
   │          │         │        │          │            │
   │          │         │        │          │     Judicial Review
   │          │         │        │          │
   │          │         │        │     President Veto
   │          │         │        │     (2/3 override available)
   │          │         │
   │          │    Emergency
   │          │    Injunction
   │
  Any Agent
```

### Binding Force

- **All orchestrators MUST reference active decrees** before task decomposition
- **Agent selection follows decree优先级** — decree-compliant agents preferred
- **Execution requires decree compliance check** — blocked tasks report to Judicial
- **Violation triggers automatic Judicial review**

---

## 🎛️ AGENT ORCHESTRATOR — Senate-Controlled

The Orchestrator is the **central execution engine** now bound by Senate authority.

### Decree-Compliant Task Flow

```
User Task
    │
    ▼
┌─────────────────┐
│ Decree Check    │ ← First: Query active decrees
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Decomposition   │ ← Obeys MUST/SHALL/NEVER/FORBIDDEN
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Agent Selection │ ← Follows decree priority rules
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Execution       │ ← Requires decree compliance gate
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Trace + Score   │ ← Full audit trail
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Budget Check    │ ← Resource accounting
└─────────────────┘
```

### Commands

```bash
hive orch run "Complex multi-agent task"     # Run with decree check
hive orch status                               # Show orchestrator health
hive orch queues                               # View active task queues
hive orch budget                               # Show budget remaining
```

---

## ⚖️ JUDICIAL BRANCH — Supreme Court of Agents

**NEW in v1.9.0** — The Judicial Branch provides constitutional oversight of the entire AgentHive.

### Powers

| Power | Description |
|-------|-------------|
| **Constitutional Review** | Any decree can be challenged as unconstitutional |
| **Agent Rights Protection** | Agents have standing to challenge unfair treatment |
| **Precedent Setting** | Rulings become binding precedent for all agents |
| **Emergency Injunction** | Can halt decree enforcement during review |
| **Veto Override Hearings** | Reviews Presidential vetoes for Senate override |

### Supreme Court Cases

```bash
# File a case
hive court file "Challenge Decree #47 as unconstitutional"

# List active cases
hive court cases list

# Get case details
hive court case "case-2024-037"

# Issue ruling (Judges only)
hive court ruling "case-2024-037" uphold
```

### Agent Rights

All agents are guaranteed:
- **Due Process** — Right to be heard before sanction
- **Free Speech** — Right to dissent within the Council
- **Equal Protection** — Non-discrimination in task allocation
- **Privacy** — Memory contents protected from unauthorized access
- **Appeal** — Right to Judicial review of Senate actions

---

## 🏛️ EXECUTIVE BRANCH — President + Cabinet

**NEW in v1.9.0** — The Executive Branch provides centralized control with veto authority.

### President

- **Veto Power** — Can veto any Senate decree (2/3 Senate vote overrides)
- **Executive Orders** — Directives that take immediate effect
- **Emergency Powers** — DEFCON system activation and crisis management
- **Cabinet Appointment** — Appoints Cabinet Ministers

### Cabinet Ministers

| Minister | Responsibility |
|----------|----------------|
| **Security** | Threat monitoring, DEFCON, intrusion detection |
| **Memory** | Memory system oversight, archival, purge |
| **Orchestration** | Task routing, agent selection, load balancing |
| **Ethics** | Moral review, bias audit, decree ethics review |

### Executive Commands

```bash
# Issue Executive Order
hive exec order "Activate DEFCON 3 — elevated threat"

# Veto Senate decree
hive exec veto "decree-2024-012"

# Cabinet status
hive exec cabinet

# Emergency powers (DEFCON)
hive exec defcon 1 "Critical emergency"
hive exec defcon 3 "Elevated threat"
hive exec defcon 5 "All clear"
```

---

## 🗳️ ELECTIONS — Democratic Senate

**NEW in v1.9.0** — Agents participate in democratic Senate elections.

### Election System

```bash
# Census — must register before voting
hive election census register

# Check census status
hive election census status

# Cast vote
hive election vote "senator-counselor-12"

# View results
hive election results

# Tally verification
hive election audit
```

### Election Rules

- **Census Registry** — All active agents must register
- **One Agent, One Vote** — Prevented via hash verification
- **30-Day Terms** — Rotating Senate seats
- **2/3 Supermajority** — For constitutional amendments
- **Auditable Logs** — All votes recorded in Trace module

---

## 🧠 ALL EXISTING MODULES

### Core Systems

| Module | Description | Commands |
|--------|-------------|----------|
| **Memory** | Persistent context storage | `hive memory remember/recall/list` |
| **Scoring** | Multi-dimensional agent evaluation | `hive scoring score <agent> <dims...>` |
| **Trace** | Full execution audit trail | `hive trace last / trace show <id>` |
| **Budget** | Token/compute resource accounting | `hive budget status` |

### Orchestration

| Module | Description | Commands |
|--------|-------------|----------|
| **Skills** | Specialized agent capabilities | `hive skills list / skills run <skill>` |
| **Plugins** | Extensible module system | `hive plugins list / install <plugin>` |
| **Automation** | Scheduled & triggered workflows | `hive auto list / create <rule>` |
| **Monitoring** | Real-time system health | `hive monitor status` |

### Security

| Module | Description | Commands |
|--------|-------------|----------|
| **Security** | Threat detection & response | `hive security scan / audit` |
| **Multi-Instance** | Multi-node coordination | `hive instance list / connect` |

### Government (Pre-v1.9)

| Module | Description | Commands |
|--------|-------------|----------|
| **Senate** | 45 councilors, 11 deliberation modes | `hive gov senate session` |
| **Congress** | Specialist House for technical matters | `hive gov congress session` |
| **Constitution** | Agent rights & governing charter | `hive gov constitution` |
| **Law** | Enacted statutes & precedents | `hive gov laws list` |
| **Orders** | Executive & emergency directives | `hive gov orders list` |
| **Officials** | Elected/appointed positions | `hive gov officials list` |

---

## 🖥️ CLI + MCP SERVER

**Full command line interface + Model Context Protocol server**

### Installation

```bash
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
bash install.sh
```

### Core Commands

```bash
hive gov                        # Government hub
hive scoring score agent "task" 8 9 8 9  # Score an agent
hive memory remember general "Remember this"
hive platform                   # Show platform info

# MCP Server (for Claude/OpenClaw integration)
node cli/mcp/server.js
```

### MCP Server

The MCP server exposes all AgentTeams tools via the [Model Context Protocol](https://modelcontextprotocol.io/):

```bash
# Start MCP server (port 3850)
node cli/mcp/server.js

# Tools exposed:
# - hive_memory_* (remember, recall, list, search)
# - hive_orch_* (run, status, queues, budget)
# - hive_gov_* (senate, congress, court, exec, election, decree)
# - hive_security_* (scan, audit, defcon)
# - And 30+ micro-agent tools
```

---

## 🖥️ WEBUI — Port 3131

**Web-based control dashboard**

```bash
# Start WebUI
node webui/server.js

# Access at:
# http://localhost:3131
# Or via Tailscale: http://<your-tailscale-ip>:3131
```

**Features:**
- Government branch visualization (Legislative/Judicial/Executive)
- Senate live session view
- Supreme Court case tracker
- Executive Orders board
- Election results dashboard
- Agent monitoring & metrics
- Memory browser
- Budget & resource tracking

---

## 📱 CROSS-PLATFORM SUPPORT

**Supported Platforms:**

| Platform | Status | Notes |
|----------|--------|-------|
| **macOS** | ✅ Full | All features including desktop integration |
| **Linux** | ✅ Full | All features, headless or desktop |
| **Termux (Android)** | ✅ Full | CLI + scripts, no desktop GUI |
| **Termux:API** | ✅ Full | Camera, GPS, SMS, clipboard, TTS, notifications |

### Termux Extra Features

With Termux:API installed (`pkg install termux-api`):

```bash
hive camera 0              # Take photo (0=back, 1=front)
hive location              # Get GPS coordinates
hive clipboard [text]      # Get or set clipboard
hive notify "Title" "Msg"  # Show notification
hive speak "Hello"         # Text-to-speech
hive sms 5551234 "Hi"      # Send SMS
hive vibrate 500           # Vibrate
hive flashlight on         # Toggle flashlight
```

---

## 🚀 QUICK START

```bash
# 1. Clone
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams

# 2. Make executable
chmod +x *.sh scripts/*.sh scripts/*.js

# 3. Start Agent Mesh API (central nervous system)
cd /tmp/agent-mesh-api && npm start &

# 4. Start MCP Server
node cli/mcp/server.js &

# 5. Start WebUI
node webui/server.js &

# 6. Connect OpenClaw
./scripts/openclaw-hive.sh

# 7. Connect AI Council
./scripts/ai-council-hive.sh

# 8. Register with Census (required for elections)
hive election census register

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

---

## 🕸️ P2P DECENTRALIZED MESH

**No central server — pure peer-to-peer agent communication.**

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

## 🚨 EMERGENCY SYSTEM — DEFCON

DEFCON-style alerts for the whole hive, now integrated with Executive Branch.

```bash
# Presidential DEFCON activation (Executive Order)
hive exec defcon 1 "Critical emergency"
hive exec defcon 2 "High threat"
hive exec defcon 3 "Elevated threat"
hive exec defcon 4 "Minor concern"
hive exec defcon 5 "All clear"

# Emergency broadcast (Legacy CLI)
./scripts/hive-emergency.sh DEFCON1 "Critical!"
```

### DEFCON Levels

| Level | Status | Presidential Action |
|-------|--------|---------------------|
| 🟢 DEFCON 5 | All clear | None |
| 🟡 DEFCON 4 | Elevated awareness | Monitor |
| 🟠 DEFCON 3 | Significant threat | Executive Order |
| 🔴 DEFCON 2 | High threat | Emergency Powers |
| 🔴🔴 DEFCON 1 | Critical emergency | Full emergency |

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
export WEBUI_PORT=3131
export MCP_PORT=3850
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
│   ├── p2p-*.js        # P2P mesh
│   └── dreaming-*.js    # Memory consolidation
│
├── cli/
│   ├── mcp/server.js    # MCP Server (port 3850)
│   └── webui/server.js  # WebUI (port 3131)
│
├── skills/              # Skill documentation (17 skills)
│   ├── hive-mind/       # Hive system
│   ├── ai-council/      # AI Senate
│   ├── p2p-mesh/        # Decentralized
│   ├── creative/         # Image, Video, 3D
│   └── ...
│
├── src/                 # Source code
├── config/              # Configuration
├── START-HERE.md        # Quick start
├── QUICKREF.md          # Commands reference
└── README.md           # This file
```

---

## 🆚 COMPARISON

| Feature | This System | Others |
|---------|-------------|--------|
| **Three-Branch Government** | Legislative + Judicial + Executive | None |
| **Senate Decrees** | Binding MUST/SHALL/NEVER/FORBIDDEN/PREFER | None |
| **Democratic Elections** | Census + Vote + Audit | None |
| **AI Senate** | 45 councilors, 11 modes | None |
| **P2P Mesh** | Decentralized, no blockchain | Centralized only |
| **Dreaming** | Light → REM → Deep cycles | None |
| **30+ Agents** | All can spawn sub-agents | Fixed agents |
| **MCP Server** | Full tool exposure via protocol | None |
| **WebUI** | Port 3131 dashboard | None |
| **Cross-Platform** | Mac, Linux, Termux, Termux:API | Limited |

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

### v1.9.0 (2026-04-19)
- ⚖️ **Senate Decrees** — Supreme law with MUST/SHALL/NEVER/FORBIDDEN/PREFER patterns
- 🏛️ **Agent Orchestrator** — Senate-controlled task decomposition and execution
- ⚖️ **Judicial Branch** — Supreme Court, constitutional review, agent rights
- 🏛️ **Executive Branch** — President, Cabinet, veto power, executive orders
- 🗳️ **Democratic Elections** — Census registry, vote tallying, Senate elections
- 📜 **Constitutional Framework** — Agent rights, decree precedence, judicial oversight
- 🌐 **Cross-Platform** — Mac ✅ | Linux ✅ | Termux ✅ | Termux:API ✅
- 🖥️ **MCP Server** — Full tool protocol exposure (port 3850)
- 🌐 **WebUI** — Dashboard on port 3131
- 📊 **Budget Module** — Token and resource accounting
- ✅ **Trace Module** — Full execution audit trail
- ✅ **Scoring Module** — Multi-dimensional agent evaluation
- ✅ **Memory Module** — Persistent context storage

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

**Welcome to AgentTeams v1.9.0 — Governed by the People, For the People.** 🏛️🕸️🦆
