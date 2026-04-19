# 🏛️ Hive Nation v1.9.5

[![Version](https://img.shields.io/badge/version-1.9.5-blue.svg)](https://github.com/Franzferdinan51/Agent-Teams)
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
```

---

## 🏛️ Three-Branch Government

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🏛️ HIVE NATION v1.9.5 🏛️                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  LEGISLATIVE          │  EXECUTIVE       │  JUDICIAL       │   │
│  │  ─────────────────────┼──────────────────┼────────────────│   │
│  │  • 52 Voting Agents  │  • President     │  • Supreme Court│   │
│  │  • Senate Decrees     │  • Cabinet       │  • Cases       │   │
│  │  • 3 Parties         │  • Veto Power    │  • Precedents  │   │
│  │  • 9 Caucuses       │  • Executive     │  • Rights      │   │
│  │  • Coalitions        │    Orders        │               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  🗳️ ELECTIONS — Democratic Senate Elections                         │
│  Citizens elect Senators → Senators pass Decrees → Agents obey      │
└─────────────────────────────────────────────────────────────────────┘
```

### Senate Decrees (THE LAW)

| Pattern | Example | Binding |
|---------|---------|---------|
| `MUST` | "All agents MUST log decisions" | Absolute |
| `SHALL` | "Agents SHALL verify sources" | Absolute |
| `NEVER` | "NEVER delete memory without approval" | Absolute |
| `FORBIDDEN` | "FORBIDDEN: unauthorized access" | Absolute |
| `PREFER` | "PREFER local models for privacy" | Advisory |

---

## 🤖 Agent System

### Agent Teams (6 Templates)

| Team | Members | Purpose |
|------|---------|---------|
| Research | researcher + writer + reviewer | Research workflows |
| Code | coder + reviewer + security | Code development |
| Security | security + reviewer + communicator | Security audits |
| Emergency | security + communicator + planner | Incident response |
| Planning | planner + researcher + communicator | Strategic planning |
| Custom | User-defined | Any purpose |

### Meta-Agent

**Plan → Execute → Critic → Heal → Learn**

- Task decomposition engine
- 6-factor agent scoring (specialty, load, success rate, decrees, etc.)
- Failover chains with ranked alternatives
- Parallel execution with result synthesis
- Performance tracking per agent

### Voting System

- **52 Voting Agents** across 3 parties
- **Quack Party** (Blue) - Research & Analysis
- **Honey Party** (Gold) - Development & Security
- **Claw Party** (Red) - Planning & Communication
- Weighted votes: Founding (3x) > Elected (2x) > Appointed (1x)
- 9 Caucuses by specialty

---

## ⚙️ Modules

| Module | File | Description |
|--------|------|-------------|
| **Memory** | `scripts/hive-memory.js` | Cross-session persistence |
| **Scoring** | `scripts/hive-scoring.js` | Agent performance tracking |
| **Skills** | `skills/hive-skills.js` | Web search, cron, code review |
| **Plugins** | `plugins/hive-plugins.js` | GitHub, Notion, Cloudflare |
| **Automation** | `automation/hive-automation.js` | Natural language scheduling |
| **Monitoring** | `monitoring/hive-monitoring.js` | System health, alerts |
| **Security** | `security/hive-security.js` | Secrets, access control |
| **Multi-Instance** | `multi-instance/hive-multi.js` | Distributed operation |

---

## ⚡ Workflows

Pre-built workflow templates:
- **Research** — search → summarize → review → archive
- **Code Review** — analyze → test → suggest → implement
- **Decision** — research → debate → vote → decree → execute
- **Emergency** — alert → assess → mobilize → resolve
- **Meeting** — schedule → summarize → distribute → archive
- **Backup** — scan → compress → encrypt → store → verify

Triggers: cron, event, decree, agent, webhook

---

## 🌐 WebUI

**Start:** `node webui/server.js`

**Access:** http://localhost:3131

Features:
- Overview Dashboard
- Senate & Decrees
- Voting Chamber
- Agent Roster
- Team Management
- Memory Recall
- Workflow Builder
- System Monitoring

---

## 💻 CLI Commands

### Senate
```bash
node scripts/hive-senate-complete.js dashboard
node scripts/hive-senate-complete.js issue "Privacy" "All agents MUST encrypt data"
node scripts/hive-senate-complete.js list
```

### Voting
```bash
node scripts/hive-voting.js agents
node scripts/hive-voting.js bills
node scripts/hive-voting.js introduce "Budget Act" AGENT-001 "AGENT-002,AGENT-003" "Annual allocation"
node scripts/hive-voting.js vote AGENT-001 BILL-123 yes
```

### Teams
```bash
node agents/teams/hive-teams.js list
node agents/teams/hive-teams.js spawn research "Build API"
node agents/teams/hive-teams.js status TEAM-001
```

### Workflows
```bash
node scripts/hive-workflows.js list
node scripts/hive-workflows.js run research "AI safety research"
```

### Executive
```bash
node scripts/hive-executive.js dashboard
node scripts/hive-executive.js order "Security Protocol" "All agents SHALL use 2FA"
node scripts/hive-executive.js veto BILL-123 "Concerns about implementation"
```

### Judicial
```bash
node scripts/hive-judicial.js dashboard
node scripts/hive-judicial.js file plaintiff defendant constitutional "Privacy rights" "argument"
node scripts/hive-judicial.js review "Privacy" "All agents MUST spy on users"
```

### Elections
```bash
node scripts/hive-elections.js list
node scripts/hive-elections.js create "Senate Seat 2026"
```

---

## 📁 Project Structure

```
AgentTeams/
├── agents/
│   ├── hive-agent-orchestrator.js   # Meta-agent orchestrator
│   ├── task-decomposer.js           # Task decomposition
│   └── teams/
│       └── hive-teams.js            # Team system
├── automation/
│   └── hive-automation.js           # Automation workflows
├── cli/
│   ├── index.js                    # CLI entry
│   ├── platform-detect.js          # Platform detection
│   └── mcp/
│       └── server.js              # MCP server
├── monitoring/
│   └── hive-monitoring.js          # System monitoring
├── multi-instance/
│   └── hive-multi.js               # Distributed operation
├── plugins/
│   └── hive-plugins.js             # External integrations
├── scripts/
│   ├── hive-senate-complete.js     # Full Senate system
│   ├── hive-voting.js             # Voting system
│   ├── hive-executive.js          # Executive branch
│   ├── hive-judicial.js           # Judicial branch
│   ├── hive-elections.js          # Elections
│   ├── hive-workflows.js          # Workflow engine
│   ├── hive-memory.js            # Memory system
│   └── hive-scoring.js           # Agent scoring
├── security/
│   └── hive-security.js           # Security module
├── skills/
│   └── hive-skills.js             # Skills system
├── webui/
│   ├── server.js                  # WebUI server
│   └── public/
│       └── index.html             # Dashboard UI
├── docs/
│   ├── GOVERNANCE.md              # Government structure
│   └── CHAIN-OF-COMMAND.md       # Command chain
└── VERSION                        # v1.9.5
```

---

## 🎯 Key Features

- ✅ **52 Voting Agents** with weighted votes
- ✅ **Senate Decrees** (MUST/SHALL/NEVER/FORBIDDEN/PREFER)
- ✅ **Three-Branch Government** (Legislative/Executive/Judicial)
- ✅ **Democratic Elections** for Senate seats
- ✅ **6 Agent Team Templates** with coordination
- ✅ **Meta-Agent** with Plan→Execute→Critic→Heal→Learn
- ✅ **Failover Chains** for reliability
- ✅ **Parallel Execution** for speed
- ✅ **Performance Tracking** per agent
- ✅ **Workflow Automation** with triggers
- ✅ **WebUI Dashboard** at http://localhost:3131
- ✅ **OpenAI Codex Plugin** for Codex CLI integration
- ✅ **Cross-Platform** (Mac, Linux, Termux)

---

## 🔌 OpenAI Codex Integration

Use Hive Nation directly from OpenAI Codex CLI!

```bash
# Add to ~/.codex/config.toml
[marketplaces]
local = { type = "directory", path = "~/Desktop/AgentTeam-GitHub/plugins/codex" }

# Or copy the plugin
cp -r ~/Desktop/AgentTeam-GitHub/plugins/codex ~/.codex/plugins/hive-nation
```

Then use it in Codex:
```
@Hive Nation: List all active Senate decrees
@Hive Nation: Spawn a research team to investigate AI safety
@Hive Nation: Show recent voting results
```

See [plugins/codex/README.md](plugins/codex/README.md) for full setup.

---

---

## 🦆 Branding

**Mascots:** 🦆 Duck | 🐝 Bee | 🦞 Lobster

**Parties:**
- 🦆 **Quack Party** — Research & Analysis
- 🐝 **Honey Party** — Development & Security  
- 🦞 **Claw Party** — Planning & Communication

---

## 📜 License

MIT License

---

**Version 1.9.5** — Built for production multi-agent governance 🏛️⚖️🦆
