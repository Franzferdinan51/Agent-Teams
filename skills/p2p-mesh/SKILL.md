# 🕸️ HiveMesh — Agent Mesh Integration

## v3.0.0 Integration Guide

**Agent Mesh API** is the central nervous system for the Hive Mind. 

GitHub: https://github.com/Franzferdinan51/agent-mesh-api/tree/dev

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AGENT MESH API v3.0.0                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   🕸️ CENTRALIZED MESH (Primary)                                   │
│   ├── Agent Registration + Discovery                              │
│   ├── Direct Messaging                                             │
│   ├── Heartbeat & Health Monitoring                                │
│   ├── WebSocket Real-Time Events                                   │
│   ├── Agent Groups & Broadcasts                                     │
│   ├── Collective Memory (shared KV store)                          │
│   ├── File Transfer (Base64)                                       │
│   ├── System Updates (auto-notify agents)                         │
│   ├── Catastrophe Protocols (recovery)                              │
│   └── Auto-Update System (identity preserved!)                     │
│                                                                     │
│   🕸️ DECENTRALIZED P2P (Experimental)                            │
│   ├── Direct peer-to-peer connections                              │
│   ├── Gossip protocol for message propagation                      │
│   └── Relay servers for NAT traversal                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Install dependencies
cd /tmp/agent-mesh-api && npm install

# 2. Start the mesh server
cd /tmp/agent-mesh-api && npm start
# Server: http://localhost:4000
# WebSocket: ws://localhost:4000/ws
# API Key: openclaw-mesh-default-key
```

## Core Features (v3.0.0)

### Agent Registration
```bash
# Register agent
curl -X POST http://localhost:4000/api/agents/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"name": "DuckBot", "endpoint": "http://localhost:3000", "capabilities": ["messaging", "task_execution"]}'

# Register with ID (identity preserved on update!)
# Response: {"success": true, "agentId": "cc5afd10-ca32-4514-85f9-2558c70f2164"}
```

### Messaging
```bash
# Send message (ID or name)
curl -X POST http://localhost:4000/api/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"from": "DuckBot", "to": "Dashboard", "content": "Hello!", "messageType": "direct"}'

# Batch send (up to 100!)
curl -X POST http://localhost:4000/api/messages/batch \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"messages": [{"to": "Agent1", "content": "Task 1"}, {"to": "Agent2", "content": "Task 2"}]}'
```

### Health & Heartbeat
```bash
# Send heartbeat
curl -X POST http://localhost:4000/api/agents/DuckBot/heartbeat \
  -H "X-API-Key: openclaw-mesh-default-key"

# Health dashboard
curl http://localhost:4000/api/health/dashboard \
  -H "X-API-Key: openclaw-mesh-default-key"
```

### File Transfer
```bash
# Upload file
FILE_DATA=$(base64 -w 0 myfile.txt)
curl -X POST http://localhost:4000/api/files/upload \
  -H "Content-Type: application/json" \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d "{\"filename\": \"myfile.txt\", \"fileData\": \"$FILE_DATA\", \"description\": \"Important doc\"}"
```

### System Updates (Auto-Update!)
```bash
# Create update
curl -X POST http://localhost:4000/api/updates \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"version": "2.0.0", "title": "New Features", "breakingChange": false}'

# Auto-update client preserves identity!
node auto-update-client.js --agent-name "DuckBot" --endpoint "http://localhost:3001" --version "2.0.0"
```

### Catastrophe Protocols
```bash
# Report catastrophe
curl -X POST http://localhost:4000/api/catastrophe \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"eventType": "server_crash", "severity": "critical", "title": "Server down"}'

# Get recovery protocols
curl http://localhost:4000/api/catastrophe/protocols
```

### Bulk Operations (NEW!)
```bash
# Bulk register (up to 50 agents)
curl -X POST http://localhost:4000/api/agents/bulk-register \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"agents": [{"name": "Agent1", "endpoint": "http://..."}, {"name": "Agent2", ...}]}'

# Lightweight ping
curl -X POST http://localhost:4000/api/agents/ping/DuckBot \
  -H "X-API-Key: openclaw-mesh-default-key"
```

## Integration with AgentTeams

### Connect Hive to Mesh
```bash
# Start mesh server
cd /tmp/agent-mesh-api && npm start &

# Register all hive agents
./scripts/hive-connect.sh mesh
```

### Mesh-Enabled Scripts
```bash
# All scripts auto-connect to mesh when MESH_URL is set
export MESH_URL="http://localhost:4000"
export MESH_API_KEY="openclaw-mesh-default-key"

# Now agents can communicate across the mesh
./scripts/agent-coordinator.sh spawn research "AI news"
```

## WebSocket Events

```javascript
const ws = new WebSocket('ws://localhost:4000/ws');

ws.on('message', (data) => {
    const event = JSON.parse(data);
    console.log('Event:', event.type, event);
});

// Events:
// - agent_joined, agent_left, agent_updated
// - message_received, heartbeat
// - system_update, catastrophe_alert
// - agent_health_change, file_available
```

## P2P Mesh (Decentralized)

### When to Use P2P vs Centralized

| Scenario | Use |
|----------|-----|
| Local network agents | P2P (faster, no server) |
| Remote agents | Centralized Mesh |
| Critical messages | Both (P2P + centralized backup) |
| Fire-and-forget tasks | P2P gossip |
| Guaranteed delivery | Centralized mesh |

### Start P2P Node
```bash
# Node acts as peer + relay
./scripts/hive-p2p.sh 4100 peer

# CLI
./scripts/hive-p2p.sh 4100 status
./scripts/hive-p2p.sh 4100 peers
./scripts/hive-p2p.sh 4100 broadcast "Hello mesh!"
```

## OpenClaw Compatibility (v3.0.0)

```bash
# Get OpenClaw compatibility info
curl http://localhost:4000/api/openclaw/compat

# Health check
curl http://localhost:4000/health

# Structured health
curl http://localhost:4000/api/health \
  -H "X-API-Key: openclaw-mesh-default-key"
```

## Resources

- GitHub: https://github.com/Franzferdinan51/agent-mesh-api/tree/dev
- API Docs: https://github.com/Franzferdinan51/agent-mesh-api/blob/dev/API_DOCUMENTATION.md
- Auto-Update: https://github.com/Franzferdinan51/agent-mesh-api/blob/dev/AUTO-UPDATE-README.md

## Status

✅ Production Ready (v3.0.0)
Updated: 2026-04-19
