# Integration Guide

> How to wire Hive Swarm into your existing Agent-Teams setup.

## Prerequisites

- Node.js 18+ (for async iteration, optional chaining)
- Agent-Teams repo at `C:\Users\franz\Agent-Teams`
- Agent Mesh running at `localhost:4000`
- Optional: council API at `localhost:3001`

## Environment Variables

Create or update `~/.openclaw/.env`:

```bash
# Required for LLM calls (goal decomposition, result synthesis)
MINIMAX_API_KEY=your_minimax_key_here

# Optional providers (fallback chain)
OPENROUTER_API_KEY=your_openrouter_key_here

# Optional: local LLM (zero cost)
LM_API_TOKEN=your_lm_studio_token
LMSTUDIO_MODEL=gemma-4-12b-it

# Provider selection (minimax | openrouter | lmstudio)
LLM_PROVIDER=minimax

# Mesh server (where agents run)
MESH_URL=http://localhost:4000
MESH_KEY=openclaw-mesh-default-key

# Council API (for consensus)
COUNCIL_API=http://localhost:3001
COUNCIL_KEY=openclaw-mesh-default-key

# WebUI (optional)
PORT=8787
MESH_WS_URL=ws://localhost:4000
HERMES_BRIDGE=false
```

## Integration with Hermes (daily cron)

To have Hermes consult the swarm on complex decisions, add the skill:

```javascript
// In your cron or skill, call the swarm:
const { runSwarm } = require('./hive-swarm-enhancements/core/planner');

async function myTask() {
  const result = await runSwarm(
    "Research the best database for a real-time analytics app",
    { count: 4, domain: 'research' }
  );
  
  console.log("Synthesis:", result.synthesis);
  console.log("Best approach:", result.ranked[0]);
}
```

Or via the CLI:

```bash
cd C:\Users\franz\Agent-Teams
node hive-swarm-enhancements/core/cli.js swarm "Research the best database for real-time analytics" --count 4 --domain research
```

## Integration with the Mesh Server

Hive Swarm uses the existing mesh WebSocket protocol. No additional setup needed.

```javascript
// Direct mesh usage from Hive Swarm:
const { WorkerDispatcher } = require('./hive-swarm-enhancements/core/worker-dispatcher');

const dispatcher = new WorkerDispatcher({
  dispatcherId: 'my-dispatcher',
  meshUrl: 'http://localhost:4000',
  meshKey: 'openclaw-mesh-default-key'
});

dispatcher.on('agent_completed', ({ subtaskId, result }) => {
  console.log(`Agent completed ${subtaskId}:`, result);
});

const { dispatchId, promises } = dispatcher.dispatch(subtasks);
await Promise.all(promises);
```

## Integration with the Council API

For consensus decisions:

```javascript
const { createPoll, castVote, getPoll, resolvePoll } = 
  require('./hive-swarm-enhancements/core/consensus-engine');

const { pollId } = await createPoll(
  "Should we use PostgreSQL or MongoDB?",
  ["PostgreSQL", "MongoDB"],
  "http://localhost:3001",
  "openclaw-mesh-default-key"
);

await castVote(pollId, "duckets", "PostgreSQL", "http://localhost:3001", "openclaw-mesh-default-key");
const poll = await getPoll(pollId, "http://localhost:3001", "openclaw-mesh-default-key");
const resolved = await resolvePoll(pollId, "http://localhost:3001", "openclaw-mesh-default-key");
```

## Starting the WebUI Dashboard

```bash
cd C:\Users\franz\Agent-Teams\hive-swarm-enhancements\webui
node server.js
# → Dashboard at http://localhost:8787
```

With custom port:

```bash
PORT=9000 node hive-swarm-enhancements/webui/server.js
```

With custom mesh:

```bash
MESH_URL=http://192.168.1.100:4000 MESH_WS_URL=ws://192.168.1.100:4000 node hive-swarm-enhancements/webui/server.js
```

## Using the CLI

### Swarm command

```bash
# Basic
node hive-swarm-enhancements/core/cli.js swarm "Build a task manager"

# With options
node hive-swarm-enhancements/core/cli.js swarm "Build a task manager" \
  --count 5 \
  --domain build \
  --timeout 300000 \
  --json

# Status
node hive-swarm-enhancements/core/cli.js status swarm-2026-06-09T05-00-00

# List
node hive-swarm-enhancements/core/cli.js list

# Stop
node hive-swarm-enhancements/core/cli.js stop swarm-2026-06-09T05-00-00
```

### Consensus commands

```bash
# Create poll
node hive-swarm-enhancements/core/cli.js poll "TypeScript or JavaScript?" \
  --options "TypeScript,JavaScript,Both"

# Vote
node hive-swarm-enhancements/core/cli.js vote <pollId> TypeScript

# Dashboard
node hive-swarm-enhancements/core/cli.js dashboard
```

## WebUI API Reference

### Swarm endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/swarms` | List all swarms |
| GET | `/api/swarms/:id` | Get swarm details |
| POST | `/api/swarms` | Create new swarm |
| DELETE | `/api/swarms/:id` | Kill swarm |
| GET | `/api/swarms/:id/status` | Live status |

### Agent endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Get agent details |
| POST | `/api/agents/spawn` | Spawn new agent |
| GET | `/api/agents/:id/messages` | Agent message history |

### Consensus endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/consensus/polls` | List polls |
| POST | `/api/consensus/polls` | Create poll |
| GET | `/api/consensus/polls/:id` | Get poll |
| POST | `/api/consensus/polls/:id/vote` | Cast vote |
| POST | `/api/consensus/polls/:id/resolve` | Close poll |

### Logs endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/logs` | Last N log lines |
| GET | `/api/logs/decompositions` | List decompositions |
| GET | `/api/logs/decompositions/:file` | Read decomposition |
| GET | `/api/logs/dispatches` | List dispatches |
| GET | `/api/logs/dispatches/:file` | Read dispatch |

## Troubleshooting

### "Cannot connect to mesh"
```bash
# Check mesh is running
curl http://localhost:4000/api/status
# Should return agent list
```

### "LLM call failed"
```bash
# Verify API key
echo $MINIMAX_API_KEY
# Should not be empty
```

### "Council API not responding"
```bash
# Check council
curl http://localhost:3001/api/health
# Should return {"status":"ok",...}
```

### WebUI shows "mesh: down"
```bash
# Restart mesh
cd C:\Users\franz\Agent-Teams
node scripts/live-messenger.js &
```
