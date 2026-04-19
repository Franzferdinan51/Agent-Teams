# 🏛️ Hive Nation v2.0.1

[![Version](https://img.shields.io/badge/version-2.0.1-blue.svg)](https://github.com/Franzferdinan51/Agent-Teams)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

**The ultimate multi-agent government framework.** Spawn, coordinate, and orchestrate multiple specialized agents for complex tasks — with a three-branch AI Government, Senate Decrees, Agent Teams, and hive mind intelligence.

Built for [OpenClaw](https://github.com/openclaw/openclaw) and [Duck CLI](https://github.com/Franzferdinan51/duck-cli).

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/Franzferdinan51/Agent-Teams.git
cd Agent-Teams

# Start the WebUI
node webui/server.js
# Open: http://localhost:3131

# Or start all services
node webui/server.js &
node scripts/hive-automation-v2.js start &
```

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