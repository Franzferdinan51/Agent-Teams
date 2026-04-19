# Agent Mesh API Integration

## What It Is

**Agent Mesh API** (https://github.com/Franzferdinan51/agent-mesh-api) provides the communication backbone for AgentTeams — a RESTful API + WebSocket server enabling autonomous agents to communicate, collaborate, and share resources across a distributed mesh network.

## Quick Start

```bash
# Start the mesh server
cd /tmp/agent-mesh-api
npm install
npm start

# Server runs on:
# - HTTP: http://localhost:4000
# - WebSocket: ws://localhost:4000/ws
# - API Key: openclaw-mesh-default-key
```

## Core Features

| Feature | Description |
|---------|-------------|
| **Agent Registration** | Register/discover agents across the mesh |
| **Messaging** | Send messages between agents |
| **Heartbeat** | Track agent availability and status |
| **WebSocket** | Real-time event broadcasting |
| **Skill Discovery** | Query agent capabilities |
| **File Transfer** | Share documents, code, resources |
| **Auto-Update** | Centralized update management |
| **Catastrophe Protocols** | Documented recovery procedures |

## API Endpoints

### Agent Management
```bash
# Register agent
curl -X POST http://localhost:4000/api/agents/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"name": "MyAgent", "endpoint": "http://localhost:3000", "capabilities": ["messaging", "task_execution"]}'

# List all agents
curl http://localhost:4000/api/agents \
  -H "X-API-Key: openclaw-mesh-default-key"

# Get agent details
curl http://localhost:4000/api/agents/:id \
  -H "X-API-Key: openclaw-mesh-default-key"

# Update agent
curl -X PUT http://localhost:4000/api/agents/:id \
  -H "Content-Type: application/json" \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"status": "busy", "capabilities": ["coding", "research"]}'

# Delete agent
curl -X DELETE http://localhost:4000/api/agents/:id \
  -H "X-API-Key: openclaw-mesh-default-key"
```

### Messaging
```bash
# Send message
curl -X POST http://localhost:4000/api/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"fromAgentId": "agent-123", "toAgentId": "agent-456", "message": "Task complete"}'

# Get inbox
curl http://localhost:4000/api/agents/:id/inbox \
  -H "X-API-Key: openclaw-mesh-default-key"

# List all messages
curl http://localhost:4000/api/messages \
  -H "X-API-Key: openclaw-mesh-default-key"
```

### File Transfer
```bash
# Upload file
curl -X POST http://localhost:4000/api/files/upload \
  -H "Content-Type: application/json" \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"filename": "report.txt", "content": "BASE64_ENCODED_DATA"}'

# Download file
curl http://localhost:4000/api/files/:id \
  -H "X-API-Key: openclaw-mesh-default-key"
```

### Updates & Catastrophe
```bash
# Create system update
curl -X POST http://localhost:4000/api/updates \
  -H "Content-Type: application/json" \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"version": "2.0.0", "description": "Security patch"}'

# Report catastrophe
curl -X POST http://localhost:4000/api/catastrophe \
  -H "Content-Type: application/json" \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{"type": "network_failure", "affected_agents": ["agent-123"]}'
```

## Integration with AgentTeams

```
┌──────────────────────────────────────────────────────────────┐
│                    AGENT TEAMS                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Micro-Agents│  │ Team Agents │  │ Meta-Agent  │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│                   ┌──────▼──────┐                            │
│                   │  AGENT MESH │  ← Communication backbone  │
│                   │    API      │                            │
│                   └──────┬──────┘                            │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         │                │                │                 │
│    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐          │
│    │ Duck CLI │      │Dashboard│      │ AI Council│          │
│    └─────────┘      └─────────┘      └─────────┘          │
└──────────────────────────────────────────────────────────────┘
```

## WebSocket Events

Connect via WebSocket for real-time events:

```javascript
const ws = new WebSocket('ws://localhost:4000/ws');

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'register', agentId: 'my-agent' }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log('Event:', event);
  
  // Handle: agent_joined, agent_left, message_received, heartbeat, etc.
});
```

## Specs (Future Features)

| Feature | Status | Spec File |
|---------|--------|-----------|
| Message Encryption | ✅ Done | `agentmesh-encryption-spec.md` |
| Agent Groups/Channels | ✅ Done | `agentmesh-channels-spec.md` |
| Message Persistence TTL | ✅ Done | `agentmesh-ttl-spec.md` |
| REST Webhook Callbacks | ✅ Done | `agentmesh-webhooks-spec.md` |
| Federation Support | ✅ Done | `agentmesh-federation-spec.md` |

## Use Cases

### Multi-Agent Communication
```
Agent A (researcher) → Agent Mesh API → Agent B (coder)
Agent B → Agent Mesh API → Agent C (reviewer)
```

### Distributed Task Execution
```
Orchestrator → Register with mesh → Spawn agents
           → Dispatch tasks via mesh
           → Aggregate results from mesh
```

### Real-Time Health Monitoring
```
All agents → Heartbeat to mesh → Dashboard polls mesh → Visualize health
```

## Status

Integrated: 2026-04-19
URL: https://github.com/Franzferdinan51/agent-mesh-api