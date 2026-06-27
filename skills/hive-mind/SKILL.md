# 🧠 Hive Mind — Multi-System Coordination

## The Vision

```
┌──────────────────────────────────────────────────────────────────┐
│                     THE HIVE MIND                                 │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │  Duck CLI   │  │  Dashboard  │  │  AI Council  │            │
│   │  (Mac mini) │  │  (Port 3001)│  │  (Port 3003)│            │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│          │                │                │                     │
│          └────────────────┼────────────────┘                     │
│                         ▼                                        │
│              ┌────────────────────────┐                          │
│              │     AGENT MESH API     │                         │
│              │   (localhost:4000)     │                         │
│              │  WebSocket: ws://.../ws │                        │
│              └────────────────────────┘                          │
│                         │                                        │
│          ┌─────────────┼─────────────┐                          │
│          │             │             │                          │
│          ▼             ▼             ▼                          │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│   │ CannaAI  │  │ Agent    │  │  Any    │                     │
│   │ Grow App │  │ Teams    │  │ System  │                     │
│   └──────────┘  └──────────┘  └──────────┘                     │
│                                                                  │
│   EVERY SYSTEM CAN:                                             │
│   ✅ Talk to each other via mesh                                │
│   ✅ Share context and memory                                   │
│   ✅ Coordinate complex multi-system tasks                      │
│   ✅ Broadcast to all systems at once                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Connect Any System

### Duck CLI → Hive Mind

```bash
./scripts/hive-connect.sh "duck-cli" "coding,research,messaging"
```

### Dashboard → Hive Mind

```bash
./scripts/hive-connect.sh "dashboard" "status,metrics,control"
```

### AI Council → Hive Mind

```bash
./scripts/hive-connect.sh "ai-council" "deliberation,analysis"
```

### CannaAI (Grow App) → Hive Mind

```bash
./scripts/hive-connect.sh "cannaai" "plant-analysis,vision"
```

### DuckBot Go (Phone) → Hive Mind

```bash
./scripts/hive-connect.sh "duckbot-go" "android,phone"
```

## Architecture

### Core Components

| Component | Description |
|-----------|-------------|
| **Agent Mesh API** | Central communication hub (port 4000) |
| **Hive Mind Connector** | Script to register any system |
| **Hive Mind Orchestrator** | Coordinates multi-system tasks |
| **WebSocket Gateway** | Live real-time messaging |

### Connection Flow

```
System boots → Register with mesh → Get agent ID
                                    ↓
                        Subscribe to hive channel
                                    ↓
                        Receive/send messages
                                    ↓
                        Coordinate with other systems
```

## Multi-System Coordination

### Coordinate Task Across Systems

```javascript
const { HiveMind } = require('./scripts/hive-mind');

const hive = new HiveMind();
await hive.connect('orchestrator');

// Register systems
await hive.registerSystem('duck-cli', 'agent', ['coding']);
await hive.registerSystem('ai-council', 'council', ['analysis']);
await hive.registerSystem('cannaai', 'grow-app', ['vision']);

// Assign tasks to systems
await hive.coordinateTask({
    id: 'task-123',
    description: 'Analyze grow data and make recommendations',
    steps: [
        'Capture plant photos',
        'Analyze with CannaAI',
        'Deliberate with AI Council',
        'Generate recommendations via Duck CLI'
    ]
}, ['cannaai', 'ai-council', 'duck-cli']);

// Collect and synthesize results
const results = await hive.aggregateResults('task-123');
```

### Broadcast to All Systems

```javascript
// All connected systems receive this
hive.broadcast('⚠️ Weather alert — storm in 2 hours!');
```

### System-to-System Direct Message

```javascript
// CannaAI → AI Council
hive.sendTo('ai-council', 'Plant health analysis complete. Need recommendations.');
```

## System Types

| Type | Example Systems |
|------|----------------|
| **agent** | Duck CLI, AgentTeams, DuckBot Go |
| **dashboard** | Dashboard, CannaAI dashboard |
| **council** | AI Council, deliberation engine |
| **grow-app** | CannaAI, grow monitoring |
| **mesh** | Agent Mesh API itself |
| **external** | Any external system via API |

## Message Protocol

### Hive Announce
```json
{
  "type": "hive_announce",
  "from": "duck-cli",
  "content": "Duck CLI connected to hive mind",
  "capabilities": ["coding", "research"]
}
```

### Task Assignment
```json
{
  "type": "task_assignment",
  "from": "orchestrator",
  "to": "cannaai",
  "task": { "description": "...", "priority": "high" }
}
```

### Task Result
```json
{
  "type": "task_result",
  "from": "cannaai",
  "taskId": "task-123",
  "content": { "findings": "...", "confidence": 0.95 }
}
```

## Benefits

| Benefit | Description |
|---------|-------------|
| **Unified Coordination** | All systems coordinate via single mesh |
| **Live Communication** | Real-time WebSocket messaging |
| **Shared Memory** | All systems access same MEMORY.md via mesh |
| **Distributed Processing** | Task spans multiple systems seamlessly |
| **Fault Tolerance** | If one system fails, others continue |
| **Scalability** | Add new systems by registering with mesh |

## Scripts

| Script | Purpose |
|--------|---------|
| `hive-connect.sh` | Connect system to hive (Bash) |
| `hive-mind.js` | Orchestrator for multi-system coordination |
| `mesh-register.js` | Register agent with mesh |

## Example: Weather Alert Flow

```
1. NWS alert detected (Duck CLI)
       ↓
2. Broadcast to hive: "⚠️ Storm warning"
       ↓
3. CannaAI → "Check plant tent humidity"
4. AI Council → "Assess risk level"
5. Dashboard → "Update DEFCON status"
6. All systems coordinate response
```

## Status

Added: 2026-04-19
Purpose: Connect multiple systems into unified hive mind