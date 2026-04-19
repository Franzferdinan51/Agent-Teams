# 🏛️ Hive Nation — Quick Reference

**Version:** 1.9.5  
**WebUI:** http://localhost:3131

---

## 🚀 Quick Start

```bash
# Start WebUI
cd ~/Desktop/AgentTeam-GitHub
node webui/server.js

# CLI Help
node cli/index.js help
```

---

## 🏛️ Senate Commands

```bash
# Dashboard
node scripts/hive-senate-complete.js dashboard

# Issue Decree
node scripts/hive-senate-complete.js decree "Privacy" "All agents MUST encrypt data"

# List Decrees
node scripts/hive-senate-complete.js decrees

# Full Senate Vote
node scripts/hive-senate-complete.js senate-vote BILL-001
```

---

## 🗳️ Voting Commands

```bash
# List Agents
node scripts/hive-voting.js agents

# List Bills
node scripts/hive-voting.js bills

# Introduce Bill
node scripts/hive-voting.js introduce "Budget Act" AGENT-001 "AGENT-002,AGENT-003" "Annual budget"

# Vote
node scripts/hive-voting.js vote AGENT-001 BILL-123 yes

# Tally
node scripts/hive-voting.js tally BILL-123
```

---

## 👥 Team Commands

```bash
# List Teams
node agents/teams/hive-teams.js list

# List Templates
node agents/teams/hive-teams.js templates

# Spawn Team
node agents/teams/hive-teams.js spawn research "Build API"

# Team Status
node agents/teams/hive-teams.js status TEAM-001

# Dissolve Team
node agents/teams/hive-teams.js dissolve TEAM-001
```

---

## ⚙️ Workflow Commands

```bash
# List Workflows
node scripts/hive-workflows.js list

# Run Workflow
node scripts/hive-workflows.js run research "AI safety"

# Create Workflow
node scripts/hive-workflows.js create "My Workflow" "Step 1" "Step 2" "Step 3"
```

---

## 🏛️ Executive Commands

```bash
# Dashboard
node scripts/hive-executive.js dashboard

# Issue Order
node scripts/hive-executive.js order "Security" "All agents SHALL use 2FA"

# Veto
node scripts/hive-executive.js veto BILL-123 "Concerns about implementation"

# Emergency
node scripts/hive-executive.js emergency 7
```

---

## ⚖️ Judicial Commands

```bash
# Dashboard
node scripts/hive-judicial.js dashboard

# File Case
node scripts/hive-judicial.js file plaintiff defendant constitutional "Privacy" "argument"

# Review Decree
node scripts/hive-judicial.js review "Privacy" "All agents MUST spy on users"

# Check Rights
node scripts/hive-judicial.js rights AGENT-001 "instant ban"
```

---

## 🗳️ Election Commands

```bash
# List Elections
node scripts/hive-elections.js list

# Create Election
node scripts/hive-elections.js create "Senate Seat 2026"

# Register Citizen
node scripts/hive-elections.js register citizen-1 "John Doe" citizen

# Vote
node scripts/hive-elections.js vote citizen-1 ELECTION-001 candidate-1

# Tally
node scripts/hive-elections.js tally ELECTION-001
```

---

## 🤖 Orchestrator Commands

```bash
# Dashboard
node agents/hive-agent-orchestrator.js dashboard

# Decompose Task
node agents/hive-agent-orchestrator.js decompose "Build a REST API with auth"

# Select Agent
node agents/hive-agent-orchestrator.js select "Build API"

# Plan Execution
node agents/hive-agent-orchestrator.js plan "Build API"
```

---

## 📊 Memory Commands

```bash
# Dashboard
node scripts/hive-memory.js dashboard

# Store Memory
node scripts/hive-memory.js store "Decision: Use local models" decision "ai,models"

# Recall
node scripts/hive-memory.js recall "models"

# Stats
node scripts/hive-memory.js stats
```

---

## 📈 Scoring Commands

```bash
# Dashboard
node scripts/hive-scoring.js dashboard

# Scores
node scripts/hive-scoring.js scores

# Agent Score
node scripts/hive-scoring.js agent AGENT-001
```

---

## 🌐 MCP Server

```bash
# Start MCP Server
node cli/mcp/server.js

# MCP runs on port 3850
```

---

## 🎛️ WebUI Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard HTML |
| `GET /api/dashboard` | Dashboard data |
| `GET /api/health` | Health check |
| `GET /api/memory` | Memory list |
| `GET /api/scoring` | Agent scores |

---

## 📁 File Structure

```
AgentTeams/
├── agents/
│   ├── hive-agent-orchestrator.js
│   ├── task-decomposer.js
│   └── teams/hive-teams.js
├── automation/hive-automation.js
├── cli/
│   ├── index.js
│   └── mcp/server.js
├── monitoring/hive-monitoring.js
├── multi-instance/hive-multi.js
├── plugins/hive-plugins.js
├── scripts/
│   ├── hive-senate-complete.js
│   ├── hive-voting.js
│   ├── hive-executive.js
│   ├── hive-judicial.js
│   ├── hive-elections.js
│   ├── hive-workflows.js
│   ├── hive-memory.js
│   └── hive-scoring.js
├── security/hive-security.js
├── skills/hive-skills.js
├── webui/
│   ├── server.js
│   └── public/index.html
└── start-webui.sh
```

---

## 🦆 Party System

| Party | Mascot | Focus |
|-------|--------|-------|
| Quack | 🦆 | Research & Analysis |
| Honey | 🐝 | Development & Security |
| Claw | 🦞 | Planning & Communication |

---

## 🔑 Voting Weights

| Tenure | Weight |
|--------|--------|
| Founding | 3x |
| Elected | 2x |
| Appointed | 1x |

---

## 📜 Decree Patterns

| Pattern | Example | Binding |
|---------|---------|---------|
| `MUST` | "All agents MUST log" | Absolute |
| `SHALL` | "Agents SHALL verify" | Absolute |
| `NEVER` | "NEVER delete memory" | Absolute |
| `FORBIDDEN` | "FORBIDDEN: unauthorized" | Absolute |
| `PREFER` | "PREFER local models" | Advisory |

---

**Built with 🦆 🐝 🦞 for OpenClaw & Duck CLI**
