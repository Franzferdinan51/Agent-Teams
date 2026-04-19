# 🏛️ Hive Nation v2.1.0

[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](https://github.com/Franzferdinan51/Agent-Teams)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

**The ultimate multi-agent government framework.** Spawn, coordinate, and orchestrate multiple specialized agents for complex tasks — with a three-branch AI Government, Senate Decrees, Agent Teams, and hive mind intelligence.

**Now with built-in LLM-powered Council deliberation!** No separate servers or repos needed.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and [Duck CLI](https://github.com/Franzferdinan51/duck-cli).

---

## 📋 Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | 18+ | [Download](https://nodejs.org/) |
| **npm** | 9+ | Comes with Node.js |
| **Git** | Any recent | For cloning |

### Optional (for LLM-powered deliberation)

| Provider | Required | Notes |
|----------|----------|-------|
| **MiniMax API Key** | Recommended | [Get from platform.minimax.io](https://platform.minimax.io/) |
| **LM Studio** | Alternative | [Download](https://lmstudio.ai/) - Local, free |
| **OpenRouter API Key** | Alternative | [Get from openrouter.ai](https://openrouter.ai/) - Free tier |

---

## 🚀 Setup (5 Minutes)

### Step 1: Clone the Repo

```bash
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web server
- `cors` - Cross-origin support
- `ws` - WebSocket support

### Step 3: Configure LLM (Optional but Recommended)

**Option A: MiniMax (Recommended - Best Quality)**

```bash
# Get your API key from: https://platform.minimax.io/
export MINIMAX_API_KEY=sk-your-key-here
```

**Option B: LM Studio (Free - Local)**

1. Download [LM Studio](https://lmstudio.ai/)
2. Download a model (e.g., Gemma-4, Qwen-3)
3. Start LM Studio and enable "Local Server" (port 1234)

```bash
export LMSTUDIO_URL=http://127.0.0.1:1234/v1
export LMSTUDIO_KEY=sk-lm-any-key
```

**Option C: OpenRouter (Free Tier)**

```bash
# Get key from: https://openrouter.ai/keys
export OPENROUTER_API_KEY=sk-or-your-key
```

### Step 4: Start Services

```bash
# Start everything at once
./start-all.sh
```

Or start individually:

```bash
# Council API (port 3007)
npm run start:council

# WebUI (port 3131)
npm run start:webui
```

### Step 5: Open in Browser

**WebUI:** http://localhost:3131

**Council API:** http://localhost:3007/api/health

---

## 🎯 What's Built-In

| Component | Description | Port |
|-----------|-------------|------|
| **Council Server** | LLM-powered deliberation with 46 councilors | 3007 |
| **WebUI** | Live dashboard with real-time updates | 3131 |
| **46 Councilors** | Diverse AI perspectives (Technocrat, Ethicist, etc.) | - |
| **Multi-Provider LLM** | MiniMax, LM Studio (local), OpenRouter | - |
| **Senate (94)** | Binding decrees from Council recommendations | - |
| **Agent Teams** | Spawn specialized agents for tasks | - |
| **Hive Mesh** | P2P agent communication | 4000 |

---

## 🏛️ Architecture (v2.1.0)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🏛️ HIVE NATION v2.1.0 🏛️                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  COUNCIL SERVER (Built-in, port 3007)                       │   │
│  │  - 46 diverse councilors with LLM integration              │   │
│  │  - Real AI-generated debate (MiniMax, LM Studio, etc.)     │   │
│  │  - 9 deliberation modes (adversarial, consensus, swarm...)  │   │
│  │  - Live SSE streaming to WebUI                              │   │
│  │  - Auto-voting based on deliberation content               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  SENATE (94 senators, 3 parties)                            │   │
│  │  - Convert Council recommendations into binding DECREES    │   │
│  │  - MUST/SHALL/NEVER enforcement language                   │   │
│  │  - Democratic elections, weighted voting                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  EXECUTIVE (Meta-Agent)                                     │   │
│  │  - Execute Council/Senate decisions                         │   │
│  │  - Spawn agent teams for implementation                    │   │
│  │  - Monitor and report results                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### LLM Providers

| Provider | Type | Config |
|----------|------|--------|
| **MiniMax** | API (primary) | `MINIMAX_API_KEY` env var |
| **LM Studio** | Local (free) | `LMSTUDIO_KEY`, `LMSTUDIO_URL` |
| **OpenRouter** | API (free tier) | `OPENROUTER_API_KEY` env var |

### Key Files

| File | Purpose |
|------|---------|
| `council-server.js` | LLM-powered deliberation server |
| `councilors.json` | 46 councilor definitions |
| `webui/server.js` | Web dashboard |
| `webui/public/index.html` | WebUI frontend |
| `scripts/hive-*.js` | 80+ Hive scripts |
| `start-all.sh` | Start everything |

---

## 🎮 Usage

### Start a Deliberation

```bash
# Via API
curl -X POST http://localhost:3007/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"topic":"Should AI have rights?","mode":"proposal"}'

# Watch in WebUI
open http://localhost:3131
```

### Switch LLM Provider

```bash
# Use LM Studio (local)
curl -X POST http://localhost:3007/api/llm/provider \
  -H "Content-Type: application/json" \
  -d '{"provider":"lmstudio"}'

# Check status
curl http://localhost:3007/api/llm/status
```

### CLI Commands

```bash
npm run start:council    # Start Council only
npm run start:webui      # Start WebUI only  
npm run start:all        # Start both
npm run hive:status      # Check Hive status
```

---

## 📦 Files

```
Agent-Teams/
├── council-server.js    # LLM-powered Council (NEW!)
├── councilors.json      # 46 councilor definitions (NEW!)
├── start-all.sh         # Start all services (NEW!)
├── webui/               # Web dashboard
├── scripts/             # 80+ Hive scripts
├── agents/              # Agent definitions
├── skills/              # Agent skills
└── docs/                # Documentation
```

---

## 🌐 WebUI Features

- **📡 Live View** - Watch deliberations in real-time
- **⚖️ Council Tab** - See all 46 councilors
- **📊 Stats** - Messages, votes, elapsed time
- **🔄 Auto-refresh** - Updates every 2 seconds
- **🎨 Dark Theme** - Premium command center design

---

## ⚡ Quick Commands

```bash
# Start everything
./start-all.sh

# Check services
curl http://localhost:3007/api/health
curl http://localhost:3131/api/health

# Test LLM
curl -X POST http://localhost:3007/api/llm/test

# List providers
curl http://localhost:3007/api/llm/providers | jq .
```

---

## 📚 Documentation

- [START-HERE.md](START-HERE.md) - Getting started
- [docs/](docs/) - Full documentation
- [scripts/](scripts/) - Hive scripts reference

---

## 🧪 Testing

```bash
# Test Council
curl http://localhost:3007/api/councilors | jq '.councilors | length'

# Test LLM
curl -X POST http://localhost:3007/api/llm/test | jq '.content'

# Test deliberation
curl -X POST http://localhost:3007/api/session/start \
  -H "Content-Type: application/json" \
  -d '{"topic":"Test","mode":"proposal"}'

sleep 20
curl http://localhost:3007/api/session | jq '{phase, stats}'
```

---

## 🔧 Configuration

Set environment variables:

```bash
# LLM Providers
export MINIMAX_API_KEY=your_key
export LMSTUDIO_KEY=your_key
export LMSTUDIO_URL=http://127.0.0.1:1234
export OPENROUTER_API_KEY=your_key

# Ports
export PORT=3131
```

---

## 📝 Changelog

### v2.1.0 (2026-04-19)
- **Merged** AI Council into Agent-Teams (no more separate repo)
- **Added** Multi-provider LLM support (MiniMax, LM Studio, OpenRouter)
- **Added** Real LLM-generated deliberations (no more fake votes)
- **Added** `start-all.sh` for one-command startup
- **Updated** 46 integrated councilors with descriptions
- **Fixed** Qwen reasoning_content parsing issue
- **Updated** WebUI to connect to local council

### v2.0.0 (Previous)
- Initial release with Senate and Agent Teams

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🏛️ HIVE NATION v2.0.1 🏛️                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  COUNCIL (46 diverse councilors)                            │   │
│  │  - 9 deliberation modes (adversarial, consensus, swarm...)  │   │
│  │  - Real LLM calls (MiniMax, OpenRouter)                    │   │
│  │  - Prevents "Yes-Man Syndrome"                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  SENATE (94 senators, 3 parties)                            │   │
│  │  - Convert Council recommendations into binding DECREES     │   │
│  │  - MUST/SHALL/NEVER enforcement language                   │   │
│  │  - Democratic elections, weighted voting                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  TEAMS (8 templates, parallel execution)                    │   │
│  │  - Research, Code, Security, Emergency, Planning, etc.      │   │
│  │  - Execute per Senate decree                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Government Loop

```
1. PROBLEM identified
       ↓
2. COUNCIL debates (46 diverse voices)
       ↓
3. Council reaches consensus
       ↓
4. SENATE passes decree (THE LAW - binding)
       ↓
5. TEAMS execute per decree
```

---

## ⚡ Services

| Service | Port | URL | Status |
|---------|------|-----|--------|
| **Hive WebUI** | 3131 | http://localhost:3131 | ✅ Live |
| **Council** | 3006 | http://localhost:3006 | ✅ 46 councilors |
| **MCP Server** | 3456 | http://localhost:3456 | ✅ 23 tools |
| **Automation** | 3457 | http://localhost:3457 | ⏳ Start manually |

---

## 🌐 WebUI Dashboard

**Access:** http://localhost:3131

### Tabs

| Tab | Features |
|-----|----------|
| 📊 **Overview** | Live stats, quick actions, decrees, votes, agents |
| 🏛️ **Senate** | Issue decrees, senator roster |
| 🗳️ **Voting** | Historical votes, statistics |
| 🤖 **Agents** | Rankings, scoring |
| 👥 **Teams** | Spawn teams (8 templates), templates reference |
| 🧠 **Memory** | Store/search memories |
| 🧠 **Council** | Councilors, modes, deliberations |
| ⚡ **Automation** | Job management |
| 📈 **System** | Health, services |

### WebUI Commands

```bash
# Restart WebUI
pkill -f "node.*webui/server" && cd ~/Desktop/AgentTeam-GitHub && node webui/server.js &

# Check logs
tail -f /tmp/hive.log
```

---

## 🤖 Agent Teams

### 8 Templates

| Template | Roles | Best For |
|----------|-------|----------|
| 🔬 **Research** | researcher + writer + reviewer | Research workflows |
| 💻 **Code** | coder + reviewer + security | Code development |
| 🛡️ **Security** | security + reviewer + communicator | Security audits |
| 🚨 **Emergency** | security + communicator + planner | Incident response |
| 📋 **Planning** | planner + researcher + communicator | Strategic planning |
| 📊 **Analysis** | researcher + analyst + writer | Data analysis |
| 🚀 **DevOps** | coder + security + communicator | Deployment |
| 🐝 **Swarm** | multiple specialists | Parallel tasks |

### Spawn a Team

```bash
# Via CLI
node agents/teams/hive-teams.js spawn research "Build REST API"

# Via WebUI → Teams tab → Spawn Team button
```

---

## 🏛️ Senate Decrees

**THE LAW** — Binding enforcement language:

| Pattern | Enforcement | Example |
|---------|-------------|---------|
| `MUST` | Absolute | "All agents MUST encrypt data" |
| `SHALL` | Absolute | "Agents SHALL verify sources" |
| `NEVER` | Absolute | "NEVER delete memory without approval" |
| `FORBIDDEN` | Absolute | "FORBIDDEN: unauthorized access" |
| `PREFER` | Advisory | "PREFER local models for privacy" |

### Issue a Decree

```bash
# Via CLI
node scripts/hive-senate-complete.js issue "Privacy" "All agents MUST encrypt sensitive data"

# Via WebUI → Senate tab → New Decree button
```

---

## 🧠 AI Council

**46 diverse councilors** with adversarial deliberation:

### Deliberation Modes

| Mode | Purpose |
|------|---------|
| `balanced` | Neutral analysis |
| `adversarial` | Devil's advocate |
| `consensus` | Find agreement |
| `brainstorm` | Creative solutions |
| `swarm` | Parallel thinking |
| `legislature` | Formal debate |
| `prediction` | Future forecasting |
| `inspector` | Critical review |
| `devil-advocate` | Challenge assumptions |

### Council Workflow

```bash
# Run deliberation
node scripts/hive-workflow.js council "Should we adopt microservices?"

# Check council status
curl http://localhost:3006/status
```

---

## ⚡ Automation Engine v2

**Persistent task runner with triggers:**

```bash
# Start automation
node scripts/hive-automation-v2.js start

# Add jobs
node scripts/hive-automation-v2.js add cron "0 2 * * *" "Backup" backup
node scripts/hive-automation-v2.js add webhook "security-alert" "Alert" alert
node scripts/hive-automation-v2.js add decree "privacy" "Enforce Privacy" privacy

# List jobs
node scripts/hive-automation-v2.js list

# Stats
node scripts/hive-automation-v2.js stats
```

### Trigger Types

| Type | Trigger |
|------|---------|
| **cron** | Schedule (e.g., `0 2 * * *` = 2 AM daily) |
| **webhook** | HTTP POST to `/webhook/:id` |
| **event** | Job completes/fails/starts |
| **decree** | Senate passes matching decree |

---

## 🔌 MCP Server

**23 tools** exposed via JSON-RPC:

```bash
# Start MCP
node mcp-server.js

# Endpoints
# - http://localhost:3456/mcp   (JSON-RPC)
# - http://localhost:3456/sse    (SSE)
# - http://localhost:3456/health
```

### Tool Categories

| Category | Tools |
|----------|-------|
| **Senate** | senate_list, senate_decrees, senate_create_decree |
| **Council** | council_status, council_councilors, council_modes, council_session |
| **Teams** | teams_list, teams_spawn, teams_templates, teams_add_task |
| **Memory** | memory_list, memory_create, memory_recall |
| **Scoring** | scoring_list, scoring_agent |
| **Dashboard** | dashboard_status, system_health |
| **Governance** | governance_status, governance_run |

---

## 💻 CLI Commands

### Quick Reference

```bash
# Senate
node scripts/hive-senate-complete.js dashboard
node scripts/hive-senate-complete.js issue "Title" "Content"

# Council
node scripts/hive-workflow.js council "Question"

# Teams
node agents/teams/hive-teams.js list
node agents/teams/hive-teams.js spawn research "Task"

# Automation
node scripts/hive-automation-v2.js start
node scripts/hive-automation-v2.js list

# Execute (full pipeline demo)
node scripts/hive-execute.js
```

---

## 📁 Project Structure

```
AgentTeams/
├── webui/
│   ├── server.js              # WebUI server (Express)
│   └── public/
│       └── index.html         # Dashboard UI (v2.0.1 overhaul)
├── scripts/
│   ├── hive-core.js           # Core (LLM + persistence)
│   ├── hive-workflow.js       # Governance pipeline
│   ├── hive-execute.js        # Full system demo
│   ├── hive-automation-v2.js  # Automation engine v2
│   ├── hive-senate-complete.js
│   ├── hive-voting.js
│   └── hive-memory.js
├── mcp-server.js              # MCP server (23 tools)
├── agents/teams/
│   └── hive-teams.js          # Team system
├── plugins/
│   └── openclaw/              # OpenClaw integration
└── data/
    ├── core/state.json        # Persistent state
    └── automation/
        ├── jobs.json          # Automation jobs
        └── triggers.json     # Trigger configs
```

---

## 🎯 Key Features

- ✅ **46 Councilors** with adversarial deliberation
- ✅ **94 Senators** (3 parties, weighted voting)
- ✅ **Senate Decrees** (MUST/SHALL/NEVER enforcement)
- ✅ **8 Team Templates** with parallel execution
- ✅ **Automation Engine v2** (cron/webhook/event/decree)
- ✅ **Persistent State** (JSON survives restarts)
- ✅ **Real LLM Calls** (MiniMax, OpenRouter)
- ✅ **MCP Server** (23 tools)
- ✅ **WebUI Dashboard** (9 tabs, fully functional)
- ✅ **OpenClaw Plugin** (Duck CLI integration)

---

## 🔧 v2.0.1 Fixes (2026-04-19)

### What's Fixed

| Issue | Fix |
|-------|-----|
| Cold-Start Bug | State always initialized |
| Live LLM Integration | Real API calls (MiniMax, OpenRouter) |
| Persistent State | JSON files survive restarts |
| Inter-Agent Messaging | Real message passing with routing |
| WebUI Broken Tabs | Complete overhaul - all tabs working |
| Duplicate Navigation | Restructured 9 proper tabs |
| Missing Animations | Added bg gradients, hover effects, glow |

### WebUI Enhancements

- **Animated background** with floating gradients
- **Quick actions panel** on overview
- **Glowing brand icon** with pulse
- **Card hover effects** with border glow
- **Toast notifications** (success/error/info)
- **8 team templates** (was 5)
- **Memory search** functionality
- **Automation tab** (job management)

---

## 🧪 Testing

```bash
# Run all tests
node scripts/hive-execute.js

# Test API endpoints
curl http://localhost:3131/api/dashboard
curl http://localhost:3131/api/decrees
curl http://localhost:3131/api/teams

# Verify persistence
# Restart server, data should survive
```

---

## 🦆 Branding

**Mascots:** 🦆 Duck | 🐝 Bee | 🦞 Lobster

**Parties:**
- 🦆 **Quack Party** — Research & Analysis (blue)
- 🐝 **Honey Party** — Development & Security (gold)
- 🦞 **Claw Party** — Planning & Communication (red)

---

## 📜 License

MIT License

---

**Version 2.0.1** — Built for production multi-agent governance 🏛️⚖️🦆
---

## 📁 Complete File Structure

```
Agent-Teams/
├── 📦 Core Council (v2.1.0)
│   ├── council-server.js      # LLM-powered deliberation API
│   ├── councilors.json        # 46 councilor definitions
│   ├── council-app.tsx        # React frontend for Council
│   └── council-mcp-server.js  # MCP tool server
│
├── 📦 Agent System
│   └── agent-api-server/      # Agent API server
│       ├── api_server.py      # Main API
│       └── package.json
│
├── 🌐 WebUI
│   ├── webui/server.js       # Web dashboard server
│   └── webui/public/         # Frontend files
│
├── 🧠 Hive Scripts (80+)
│   ├── hive-council.js       # Council integration
│   ├── hive-senate.js        # Senate system
│   └── scripts/hive-*.js     # All hive scripts
│
└── 📚 Documentation
    ├── docs/                 # Full documentation
    └── README.md
```

---

## 🧪 Testing the Full System

### 1. Test Council API
```bash
npm run council:status
npm run council:test
npm run council:providers
```

### 2. Start Full Council App
```bash
npm run start:council-app
# Opens React UI on port 3002
```

### 3. Start Agent API
```bash
npm run start:agent-api
```

### 4. Start MCP Server (for tools)
```bash
npm run start:mcp
```

### 5. Start Deliberation
```bash
npm run council:deliberate
```

---

## 🔧 Full Setup for All Features

```bash
# 1. Clone and install
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams
npm install

# 2. Set environment variables
export MINIMAX_API_KEY=your_key
export LMSTUDIO_KEY=sk-lm-any-key

# 3. Start everything
./start-all.sh

# 4. Optionally start additional services
npm run start:council-app   # React UI (port 3002)
npm run start:agent-api      # Agent API
npm run start:mcp            # MCP tools
```

---

## 📊 All Available Ports

| Service | Port | Description |
|---------|------|-------------|
| Council API | 3007 | LLM deliberation |
| Council App | 3002 | React frontend |
| WebUI | 3131 | Hive dashboard |
| Agent API | 8080 | Agent server |
| MCP Server | 3850 | Tool protocol |
| Mesh API | 4000 | P2P mesh |

