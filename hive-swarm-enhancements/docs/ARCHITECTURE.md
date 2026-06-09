# Hive Swarm Architecture

> How the native swarm intelligence layer fits together.

## Overview

Hive Swarm is a **native multi-agent orchestrator** built into Agent-Teams. It decomposes high-level goals into subtasks, dispatches them to workers in parallel via the Agent Mesh, aggregates results, and optionally runs a council consensus round.

**No external dependencies** — no hikarioyama/swarm-agent, no LangChain agents. Just the Agent Mesh (WebSocket, port 4000) + the council API (HTTP, port 3001) + optional LLM providers.

## Component Diagram

```
                    ┌──────────────────────────────────────────────────────────┐
                    │                    Hive Swarm CLI                       │
                    │                  (hive-swarm-enhancements/core/cli.js)   │
                    └──────────────────────┬───────────────────────────────────┘
                                           │
                    ┌──────────────────────▼───────────────────────────────────┐
                    │                     Planner                               │
                    │            core/planner.js — orchestrates                 │
                    │         decompose → dispatch → aggregate                  │
                    └───────┬──────────────────────┬───────────────────────────┘
                            │                      │
          ┌─────────────────▼──────┐   ┌───────────▼──────────────────────────┐
          │    Goal Decomposer     │   │      Worker Dispatcher              │
          │  core/goal-decomposer  │   │   core/worker-dispatcher.js         │
          │  LLM → 3-7 subtasks   │   │   Parallel fan-out via Mesh WS     │
          │  + heuristic fallback  │   │   + reconnect + event emission      │
          └───────────┬────────────┘   └───────────┬──────────────────────────┘
                      │                            │
          ┌───────────▼────────────────────────────▼──────────────────────────┐
          │                      Agent Mesh (WebSocket :4000)                   │
          │              scripts/live-messenger.js protocol                    │
          └───────────┬─────────────────────────────────────┬──────────────────┘
                      │         N workers                    │
          ┌───────────▼──────┐   ┌──────────▼─────────┐   ┌──▼────────────────┐
          │  Worker Agent A  │   │  Worker Agent B   │   │  Worker Agent N   │
          │  (mesh/agent-1)  │   │  (mesh/agent-2)  │   │  (mesh/agent-N)  │
          └──────────────────┘   └────────────────────┘   └───────────────────┘
                                          │
                              ┌───────────▼──────────────────────────┐
                              │         Result Aggregator            │
                              │   core/result-aggregator.js          │
                              │   Score → Rank → LLM Synthesize     │
                              └───────────┬──────────────────────────┘
                                          │
          ┌───────────────────────────────▼──────────────────────────┐
          │              Consensus Engine (optional)                   │
          │          core/consensus-engine.js                         │
          │   Councils: /api/council-api-server.cjs (:3001)          │
          └───────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Goal Decomposition

```
User input: "Build a REST API for task management"
         │
         ▼
GoalDecomposer.decompose(goal, {domain: 'build'})
         │
         ├── Prompt: "Break down into 3-7 subtasks with roles..."
         ├── LLM call via ProviderManager
         └── JSON: [{id, description, assignedRole, estimatedDuration}, ...]
```

**Decomposition saved to**: `build-logs/decompositions/<timestamp>.json`

### 2. Worker Dispatch

```
Subtasks[]
         │
         ▼
WorkerDispatcher.dispatch(subtasks, {timeout: 5min})
         │
         ├── Connect to mesh WebSocket (ws://localhost:4000)
         ├── Send one message per subtask to a suitable worker
         ├── Track: pending → running → completed | failed | killed
         └── Emit: agent_started, agent_progress, agent_completed, agent_failed
```

**Dispatch state saved to**: `build-logs/dispatches/<dispatchId>.json`

### 3. Result Aggregation

```
[{subtaskId, agentId, status, output, error, duration}, ...]
         │
         ▼
aggregateResults(results, {goal, domain})
         │
         ├── scoreResult() — 0-100 per subtask
         ├── rankResults() — sort by score
         ├── LLM synthesis (via ProviderManager)
         └── Return: {scores, ranked, synthesis}
```

**Aggregation saved to**: `build-logs/aggregations/<timestamp>.json`

### 4. Consensus (Optional)

```
When poll created:
         │
         ▼
createPoll(topic, options)
         │
         ├── HTTP POST to council API (:3001)
         ├── 8 councilors deliberate
         └── Poll result with confidence

When vote cast:
         │
         ▼
castVote(pollId, voterId, option)
         │
         └── HTTP POST to council API
```

## State Persistence

| Data | Location | Format |
|------|----------|--------|
| Decompositions | `build-logs/decompositions/` | JSON per decomposition |
| Dispatches | `build-logs/dispatches/` | JSON per dispatch |
| Aggregations | `build-logs/aggregations/` | JSON per aggregation |
| Swarm runs | `build-logs/swarm-runs/` | Complete run + results |
| Consensus polls | `build-logs/consensus/` | Poll + votes + result |
| Dashboard logs | `build-logs/dashboard.log` | Rolling log file |
| Swarm state | `build-logs/swarms.json` | Active swarms (WebUI) |

## Provider Abstraction

All LLM calls go through `providers/provider-adapter.js`:

```
ProviderManager
    ├── minimax (MINIMAX_API_KEY, api.minimax.io)
    ├── openrouter (OPENROUTER_API_KEY)
    └── lmstudio (LM_API_TOKEN, localhost:1234)
```

Set `LLM_PROVIDER` env var to pick. Falls back automatically on failure.

## WebUI Architecture

```
Browser (0.0.0.0:8787)
    │
    ├── HTTP REST (Express)
    │     GET/POST /api/swarms → swarms in memory
    │     GET/POST /api/agents → proxies to mesh
    │     GET/POST /api/consensus/polls → proxies to council
    │     GET /api/logs → reads build-logs/
    │
    └── WebSocket /ws
          │
          └── relay.js (ws/relay.js)
                │
                ├──→ Browser clients (browser WS)
                ├──→ Mesh server (localhost:4000)
                └──→ Hermes (optional, unix socket)
```

## Event System

WorkerDispatcher emits events for real-time monitoring:

| Event | Payload |
|-------|---------|
| `agent_started` | `{dispatchId, subtaskId, agentId, room, subtask}` |
| `agent_progress` | `{dispatchId, subtaskId, agentId, progress, note}` |
| `agent_completed` | `{dispatchId, subtaskId, agentId, result}` |
| `agent_failed` | `{dispatchId, subtaskId, agentId, error}` |
| `dispatch_complete` | `{dispatchId, summary}` |
| `swarm_update` | `{swarmId, status}` (WebUI) |
| `poll_update` | `{pollId, status}` (WebUI) |

## File Map

```
hive-swarm-enhancements/
├── core/
│   ├── goal-decomposer.js    — LLM → subtasks
│   ├── worker-dispatcher.js  — mesh fan-out
│   ├── result-aggregator.js — score + synthesize
│   ├── consensus-engine.js  — council API adapter
│   ├── planner.js           — top-level orchestrator
│   └── cli.js               — CLI interface
├── prompts/
│   ├── decompose.md         — decomposition prompt template
│   ├── aggregate.md         — synthesis prompt template
│   └── consensus.md         — council deliberation prompt
├── examples/
│   ├── build-rest-api.md
│   ├── audit-codebase.md
│   └── research-topic.md
├── webui/
│   ├── server.js            — Express + WS
│   ├── public/
│   │   ├── index.html       — SPA shell
│   │   ├── css/main.css     — dark theme
│   │   └── js/
│   │       ├── dashboard.js     — WS client + state
│   │       ├── swarm-controller.js
│   │       ├── agent-cards.js
│   │       ├── consensus-panel.js
│   │       └── hermes-chat.js
│   ├── api/
│   │   ├── swarm.js         — swarm CRUD
│   │   ├── agents.js        — mesh proxy
│   │   ├── consensus.js     — council proxy
│   │   └── logs.js          — build-logs reader
│   └── ws/
│       └── relay.js         — browser ↔ mesh bridge
└── build-logs/              — all persisted state
```

## Key Design Decisions

### 1. Native over External
No hikarioyama/swarm-agent. We own the code, can debug it, and it integrates natively with our mesh + council stack.

### 2. Write-Through State
Every step saves to disk immediately. If the process crashes, state survives. Enables replay and audit.

### 3. Heuristic Fallback
If the LLM is unavailable, goal-decomposer falls back to keyword-based heuristics. The swarm keeps working.

### 4. Event-Driven
WorkerDispatcher is an EventEmitter. The WebUI subscribes to events over WebSocket for real-time updates without polling.

### 5. CommonJS
Everything uses `module.exports` / `require()` — no ESM complexity, works everywhere Node.js works.
