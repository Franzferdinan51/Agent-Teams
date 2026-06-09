# Hive Swarm — Core Layer

The **native swarm intelligence** runtime for the Hive Nation. Lives in
`hive-swarm-enhancements/core/` and has **no external npm dependencies**
beyond what the rest of `Agent-Teams` already requires (`ws`, plus Node
builtins).

The core layer is intentionally small: one planner, one decomposer, one
dispatcher, one aggregator, one consensus engine, and one CLI that wires
them all together. Every file is CommonJS, JSDoc-typed, and unit-friendly
— you can `require` any of them in isolation.

---

## 📁 What's in this folder

| File | Purpose |
| --- | --- |
| `planner.js` | Top-level router. Decides **how** to attack a goal: `direct`, `swarm`, `consensus`, `swarm+consensus`, or `decompose-only`. |
| `goal-decomposer.js` | Breaks a goal into 3–7 parallel, role-assigned subtasks via the shared LLM provider. |
| `worker-dispatcher.js` | Sends subtasks to agents over the OpenClaw mesh WebSocket and tracks their state. |
| `result-aggregator.js` | Synthesizes N parallel outputs into one result. |
| `consensus-engine.js` | Runs a vote / agreement round over multiple answers. |
| `cli.js` | The MAIN entry point. `node cli.js ...` is what Hermes calls. |

The CLI uses the aggregator and consensus engine defensively — if those
modules aren't on disk yet, the CLI falls back to a minimal in-line
implementation so the rest of the pipeline keeps moving.

---

## ⚡ Quick start

```bash
# Check that mesh + LM Studio are reachable (ok if either is down — it'll tell you)
node cli.js preflight

# Just see what the planner would do
node cli.js plan "build a Discord bot"

# Decompose without executing (good for debugging prompts)
node cli.js decompose "design a Redis pipeline" --count 6

# Run a full swarm
node cli.js swarm "audit the auth module" --count 5 --domain audit --consensus

# Run a quick vote
node cli.js consensus "Which database?" "postgres,sqlite,mongo,duckdb"
```

Every command streams **NDJSON events** on stdout (one JSON object per
line). Human-readable progress goes to stderr.

Sample NDJSON tail from `node cli.js swarm "build a Discord bot"`:

```json
{"event":"swarm_start","goal":"build a Discord bot","options":{...}}
{"event":"planned","plan":{"approach":"swarm","reason":"...","params":{...},"source":"heuristic"}}
{"event":"decomposed","decomposition":{"subtasks":[...],"meta":{...}}}
{"event":"agents_ready","count":4,"agents":[...]}
{"event":"agent_started","dispatchId":"dispatch-...","subtaskId":"t1","agentId":"agent-1"}
{"event":"agent_progress","dispatchId":"...","subtaskId":"t1","progress":40}
{"event":"agent_completed","dispatchId":"...","subtaskId":"t1","result":{...}}
{"event":"aggregated","aggregation":{"items":[...],"summary":"...","method":"llm-merge"}}
{"event":"complete","ok":true,"durationMs":4732,"reportPath":".../swarm-1234.json"}
```

---

## 🔌 Public API

### `planner.js`

```js
const { plan, Planner, __version } = require('./planner');

const out = await plan('build a Discord bot', {
  count: 4,             // preferred agent count (2-15)
  domain: 'build',      // auto|build|game|research|audit|data|mobile|web|general
  model: null,          // override LLM (defaults to qwen3.6-35b-a3b)
  consensus: false,     // bias toward consensus
  force: null,          // force 'direct'|'swarm'|'consensus'|'swarm+consensus'|'decompose-only'
  useLlm: true,         // set false to skip the LLM call
});
// → { approach, reason, params:{count,domain,model,consensus}, estimatedAgents, estimatedDuration, source }
```

The planner is **never wrong** — it never throws. If the LLM is down or
returns garbage, it falls back to a deterministic keyword-based heuristic.

**Approach selection logic:**

| Signal | Picks |
| --- | --- |
| `audit`, `review`, `build`, `research`, `data`, `mobile`, `deploy`, … | `swarm` |
| `should we`, `decide`, `vote`, `pick`, `rank`, `best` | `consensus` |
| Both kinds of keywords | `swarm+consensus` |
| `fix`, `rename`, `add comment`, `typo`, `bump`, `tag` | `direct` |
| Long generic goal (≥6 words) | `swarm` |
| Short generic goal | `direct` |

The LLM prompt is in `buildPlanningPrompt()` (also exported for tests).
Override the model, force a specific approach, or set `useLlm: false` to
go straight to the heuristic.

The `Planner` class wraps `plan()` with a tiny in-memory history (capped
at 32 entries by default) — useful for the WebUI dashboard.

---

### `goal-decomposer.js`

```js
const { decompose, GoalDecomposer, DOMAIN_HINTS, __version } = require('./goal-decomposer');

const result = await decompose('build a Discord bot', {
  count: 5,            // preferred subtask count (3-15)
  domain: 'build',
  model: 'qwen3.6-35b-a3b',
});
// → { goal, subtasks:[{id,title,description,role,model,depends_on,payload}], meta:{...} }
```

- Always returns **at least 3** subtasks.
- Saves an audit JSON to `build-logs/decompositions/decomp-<timestamp>.json`.
- If the LLM fails or returns garbage → heuristic fallback (still logged).
- If `count` is higher than the LLM produces → heuristically pads.

---

### `worker-dispatcher.js`

```js
const WorkerDispatcher = require('./worker-dispatcher');

const d = new WorkerDispatcher({ persist: true, autoConnect: true });
await d.ready();   // optional: wait for WS open

const { dispatchId, promises, all } = d.dispatch(subtasks, agents, { goal });

d.on('agent_started',   (e) => log('started', e));
d.on('agent_progress',  (e) => log('progress', e));
d.on('agent_completed', (e) => log('done', e));
d.on('agent_failed',    (e) => log('failed', e));

const result = await all;   // resolves when every subtask settles
```

- WebSocket mesh transport. Auto-reconnects every 5 s if the mesh drops.
- Persists dispatch state to `build-logs/dispatches/dispatch-<id>.json`.
- `kill(dispatchId)` cancels every still-running subtask.
- Emits `dispatch_complete` when the whole batch settles.

---

### `cli.js` — the MAIN entry point

```bash
node cli.js swarm        "<GOAL>"  [--count N] [--domain X] [--model M] [--consensus] [--dry-run]
node cli.js decompose    "<GOAL>"  [--count N] [--domain X]
node cli.js consensus    "<QUESTION>" "<choice1,choice2,...>"  [--timeout 60000]
node cli.js plan         "<GOAL>"
node cli.js preflight
node cli.js --help
node cli.js --version
```

**Flags**

| Flag | Default | Notes |
| --- | --- | --- |
| `--count N` | 4 | Number of agents (2–15). |
| `--domain X` | `auto` | One of `auto`, `build`, `game`, `research`, `audit`, `data`, `mobile`, `web`, `general`. |
| `--model M` | `qwen3.6-35b-a3b` | LLM model for the planning call. |
| `--consensus` | off | Force a consensus layer on top of the swarm. |
| `--dry-run` | off | Stop after plan + decompose (no dispatch). |
| `--no-llm` | off | Skip the LLM call and use heuristic routing. |
| `--force A` | none | Force a specific approach. |
| `--quiet` | off | Suppress human-readable log lines (NDJSON only). |
| `--output DIR` | `./build-logs/swarm` | Where to write the final report. |
| `--timeout MS` | 60000 | Consensus timeout. |

**Exit codes**

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | User error (bad input, unknown subcommand) |
| `2` | Infrastructure error (mesh down, LLM unreachable after fallback) |
| `130` | SIGINT (Ctrl-C) — partial results are at `--output` |

**SIGINT handling** — when you hit Ctrl-C, the CLI emits a final
`{"event":"interrupted"}` event and prints
`interrupted — partial results: <path>`. Dispatchers are closed
gracefully so any persisted state stays consistent.

**Environment variables**

| Var | Default | Used for |
| --- | --- | --- |
| `MESH_URL` | `http://localhost:4000` | Mesh HTTP base. |
| `MESH_KEY` | `openclaw-mesh-default-key` | Mesh auth header. |
| `LMSTUDIO_URL` | `http://localhost:1234` | LM Studio OpenAI-compatible base. |
| `LMSTUDIO_KEY` | (empty) | Optional bearer token. |
| `NO_COLOR` | unset | Set to any value to disable ANSI colors. |

**Programmatic use**

```js
const cli = require('./cli');
const { Planner } = require('./planner');

const p = new Planner();
const plan = await p.plan('build a Discord bot');
console.log(plan.approach);
```

---

## 🧪 Smoke tests

```bash
# Syntax check (must be clean)
node -c planner.js
node -c cli.js

# Behavior smoke tests
node cli.js --help
node cli.js preflight
node cli.js plan "build a Discord bot"
node cli.js decompose "build a Discord bot" --count 5
node cli.js consensus "Best color?" "red,green,blue"
```

All three smoke tests are wired into the overnight cron.

---

## 🛠️ Architecture in one diagram

```
                            ┌────────────┐
   "build a Discord bot" →  │  planner   │  approach: 'swarm'
                            └─────┬──────┘
                                  │
                                  ▼
                            ┌────────────┐
                            │ decomposer │  3-7 subtasks
                            └─────┬──────┘
                                  │
                                  ▼
                            ┌────────────┐
                            │ dispatcher │  WebSocket → mesh → agents
                            └─────┬──────┘
                                  │
                                  ▼
                            ┌────────────┐
                            │ aggregator │  synthesize N results
                            └─────┬──────┘
                                  │
                                  ▼  (optional)
                            ┌────────────┐
                            │ consensus  │  vote / merge
                            └─────┬──────┘
                                  │
                                  ▼
                              final result
```

Each box is its own file in this folder. Each box is independently
testable. Each box has a soft-fallback so the next box always gets
*something* to work with.

---

## 📜 Versioning

Each file exports its own `__version`. The current versions are:

| Module | Version |
| --- | --- |
| `planner.js` | `1.0.0` |
| `goal-decomposer.js` | `1.0.0` |
| `worker-dispatcher.js` | `1.0.0` |
| `result-aggregator.js` | (sub-agent B) |
| `consensus-engine.js` | (sub-agent B) |
| `cli.js` | `1.0.0` |

The CLI prints all of these on `--help` and `--version`.
