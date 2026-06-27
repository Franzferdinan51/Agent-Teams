# Hive Nation - OpenClaw Plugin

## Overview

Hive Nation as an OpenClaw plugin for seamless integration with Duck CLI.

**Version:** 2.0.1  
**Requires:** OpenClaw, Node.js 18+

---

## Installation

```bash
# Clone to plugins directory
git clone https://github.com/Franzferdinan51/Agent-Teams.git ~/openclaw/plugins/hive-nation

# Or copy
cp -r ~/Desktop/AgentTeam-GitHub/plugins/openclaw ~/.openclaw/plugins/hive-nation
```

---

## Features

### 1. Agent Runtime Integration
Senators and councilors connect to actual LLM providers:
- MiniMax (primary)
- Kimi (vision)
- OpenRouter (free tier)
- LM Studio (local)

### 2. Message Bus
Real inter-agent communication via HTTP/WebSocket:
- Message routing between agents
- Team channels
- Senate broadcasts
- Council deliberation streams

### 3. Persistence Layer
File-based state (JSON) + SQLite support:
- Teams persist across restarts
- Decrees survive server restarts
- Memory persists
- Vote history preserved

### 4. Duck-CLI Integration
Commands available in Duck CLI:
```
/hive status        # Check Hive status
/hive spawn <team>  # Spawn a team
/hive vote <bill>   # Senate vote
/hive decree <text> # Issue decree
/hive memory <text> # Store memory
/hive recall <query> # Search memories
```

---

## Architecture

```
Duck CLI
    │
    ├── OpenClaw Gateway
    │       │
    │       └── Hive Plugin
    │               │
    │               ├── HiveCore (LLM + State)
    │               │       │
    │               │       ├── MiniMax API
    │               │       ├── OpenRouter API
    │               │       └── File/SQLite State
    │               │
    │               ├── Senate (voting agents)
    │               ├── Council (deliberation)
    │               └── Teams (task execution)
    │
    └── MCP Clients (LM Studio, Claude, etc.)
            │
            └── Hive MCP Server (port 3456)
```

---

## Configuration

### Environment Variables

```bash
# Required for LLM calls
MINIMAX_API_KEY=sk-...

# Optional
KIMI_API_KEY=sk-kimi-...
OPENROUTER_API_KEY=sk-or-...

# Ports (defaults shown)
HIVE_PORT=3131
COUNCIL_PORT=3006
MCP_PORT=3456
```

### OpenClaw Config

Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "hive-nation": {
        "enabled": true,
        "config": {
          "port": 3131,
          "mcpPort": 3456
        }
      }
    }
  }
}
```

---

## API Endpoints

### Core
- `GET /api/health` - Health check
- `GET /api/dashboard` - Full status

### Senate
- `GET /api/senate` - List senators
- `GET /api/decrees` - Active decrees
- `POST /api/decree` - Create decree

### Council
- `GET /api/council` - Council status
- `GET /api/councilors` - List councilors
- `GET /api/council/modes` - Deliberation modes

### Teams
- `GET /api/teams` - List teams
- `POST /api/team/spawn` - Spawn team

### Memory
- `GET /api/memories` - List memories
- `POST /api/memory` - Create memory
- `GET /api/memory/search?q=` - Search memories

### Messaging
- `GET /api/messages` - Get messages
- `POST /api/message` - Send message
- `WS /ws` - WebSocket for real-time

---

## MCP Tools

Connect via MCP at `http://localhost:3456/mcp`:

```bash
mcporter call --allow-http http://localhost:3456/sse senate_list
mcporter call --allow-http http://localhost:3456/sse council_deliberate topic="AI Safety"
mcporter call --allow-http http://localhost:3456/sse teams_spawn template="research"
mcporter call --allow-http http://localhost:3456/sse memory_store content="Important fact"
```

---

## Usage Examples

### Duck CLI Commands

```bash
# Check status
duck hive status

# Spawn team
duck hive spawn research "My Research"

# Senate vote
duck hive vote "Security Enhancement Act"

# Issue decree
duck hive decree "All agents MUST encrypt sensitive data"

# Store memory
duck hive memory "Remember: Use MiniMax for agents"

# Search memories
duck hive recall "MiniMax"
```

### Direct API

```bash
# Get dashboard
curl http://localhost:3131/api/dashboard

# Create decree
curl -X POST http://localhost:3131/api/decree \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Testing"}'

# Search memories
curl "http://localhost:3131/api/memory/search?q=MiniMax"
```

---

## Persistence

### File-Based (Default)
State stored in:
```
~/Desktop/Agent-Teams/data/core/state.json
```

### SQLite (Optional)
For high-volume deployments, enable SQLite:
```json
{
  "plugins": {
    "entries": {
      "hive-nation": {
        "enabled": true,
        "config": {
          "persistence": "sqlite",
          "dbPath": "./data/hive.db"
        }
      }
    }
  }
}
```

---

## Troubleshooting

**WebUI not loading?**
```bash
cd ~/Desktop/Agent-Teams
node webui/server.js
```

**LLM calls failing?**
```bash
# Check API keys
echo $MINIMAX_API_KEY

# Test connection
curl -X POST https://api.minimax.chat/v1/text/chatcompletion_v2 \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -d '{"model":"MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

**Persistence not working?**
```bash
# Check state file
cat ~/Desktop/Agent-Teams/data/core/state.json
```

---

## Files

```
plugins/openclaw/
├── PLUGIN.md          # This file
├── manifest.json      # OpenClaw plugin manifest
└── skill.md          # Duck CLI skill
```
