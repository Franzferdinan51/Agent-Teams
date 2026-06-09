# Hive Swarm — Multi-Agent Coordination Skill (Hermes)

**Use this skill whenever Duckets wants to coordinate multiple AI agents, run a swarm, or use the Agent-Teams web dashboard from chat.**

This skill wraps the native swarm layer in `hive-swarm-enhancements/` and the Agent-Teams web dashboard so Hermes can use it daily without manual setup.

---

## 🎯 When to Load This Skill

**Trigger phrases (any of these):**
- "swarm build a REST API"
- "swarm research X"
- "swarm audit Y"
- "run a swarm of N agents on Z"
- "show me the agent dashboard"
- "open the swarm UI"
- "start a hive session"
- "spawn agents to do X"
- "consensus on question Y"
- "decompose this into subtasks"
- "dispatch agents in parallel"
- "aggregate results from N workers"
- "what's the hive doing"
- "kill swarm <id>"
- "vote on X"
- "use Agent-Teams for this"

**When NOT to load:**
- Simple single-step tasks ("write a hello world")
- Tasks with no parallelism value
- Pure research/recall (no execution needed)

---

## 🏗️ What's Available

| Component | File | What it does |
|---|---|---|
| **Goal decomposer** | `hive-swarm-enhancements/core/goal-decomposer.js` | Big task → 3-7 parallel subtasks (LLM-driven, 7 domains, heuristic fallback) |
| **Worker dispatcher** | `hive-swarm-enhancements/core/worker-dispatcher.js` | Parallel agent dispatch over mesh WS (auto-reconnect, write-through state, full event lifecycle) |
| **Result aggregator** | `hive-swarm-enhancements/core/result-aggregator.js` | Score N outputs + synthesize best (LLM scoring, similarity detection) |
| **Consensus engine** | `hive-swarm-enhancements/core/consensus-engine.js` | Wrap existing `scripts/hive-consensus.js` for swarm use |
| **Planner** | `hive-swarm-enhancements/core/planner.js` | Top-level router: "swarm? consensus? both? direct?" |
| **CLI** | `hive-swarm-enhancements/core/cli.js` | `node cli.js swarm "task" --count 5 --domain build` |
| **Web dashboard** | `hive-swarm-enhancements/webui/` | Real-time UI at `http://localhost:8787` (Tailscale-friendly) |

---

## ⚡ Quick Commands

### 1. Run a Swarm
```bash
cd C:\Users\franz\Agent-Teams
node hive-swarm-enhancements/core/cli.js swarm "build a task management REST API" --count 5 --domain build
```

**Available domains:** `build`, `game`, `research`, `audit`, `mobile`, `data`, `general` (auto-detect if omitted)

**Options:**
- `--count N` (1-15, default 5)
- `--domain <name>` (force domain, default auto)
- `--model <name>` (LLM for decomposition, default qwen3.6-35b-a3b)
- `--consensus` (after swarm completes, vote on best output)
- `--no-aggregate` (skip synthesis, just return all outputs)

### 2. Open the Web Dashboard
```bash
cd C:\Users\franz\Agent-Teams\hive-swarm-enhancements\webui
npm install  # first time only
npm start
```
Then open: `http://localhost:8787` (or Tailscale IP)

### 3. Use the Planner (Decide Approach)
```bash
cd C:\Users\franz\Agent-Teams
node hive-swarm-enhancements/core/planner.js "audit my codebase for security issues"
# Returns: { approach: "swarm", reason: "complex, multi-faceted" }
#          OR { approach: "consensus", reason: "needs agreement" }
#          OR { approach: "direct", reason: "simple single-step" }
#          OR { approach: "swarm+consensus", reason: "complex + needs agreement" }
```

### 4. Direct API (from Hermes)
```javascript
const { decompose, GoalDecomposer } = require('./hive-swarm-enhancements/core/goal-decomposer');
const WorkerDispatcher = require('./hive-swarm-enhancements/core/worker-dispatcher');

const decomposer = new GoalDecomposer();
const dispatcher = new WorkerDispatcher();

const { subtasks } = await decomposer.decompose('build a weather API', { count: 5, domain: 'build' });
const { dispatchId, all } = await dispatcher.dispatch(subtasks, agents);
const results = await all; // Promise.allSettled
```

---

## 🛠️ Daily Workflow Examples

### Example 1: "swarm build a Discord bot"
```bash
cd C:\Users\franz\Agent-Teams
node hive-swarm-enhancements/core/cli.js swarm "build a Discord bot with slash commands" --count 5 --domain build --consensus
```
**What happens:**
1. Decomposer breaks into 5 subtasks (architect, backend-dev, devops, security, QA)
2. Dispatcher sends each to a specialist agent over mesh
3. Agents work in parallel, broadcasting progress
4. Aggregator scores outputs
5. Consensus engine (if --consensus) votes on best

### Example 2: "swarm research the best LLM fine-tuning tools"
```bash
node hive-swarm-enhancements/core/cli.js swarm "research LLM fine-tuning tools 2026" --count 4 --domain research
```

### Example 3: "consensus on whether to ship feature X today"
```javascript
const ConsensusEngine = require('./hive-swarm-enhancements/core/consensus-engine');
const consensus = new ConsensusEngine();
const poll = await consensus.createPoll('Should we ship feature X today?', ['yes', 'no', 'wait'], { timeout: 60000 });
console.log('Poll ID:', poll.pollId);
// Agents vote; after timeout, call consensus.resolvePoll(poll.pollId)
```

### Example 4: "show me the dashboard"
```bash
cd C:\Users\franz\Agent-Teams\hive-swarm-enhancements\webui
npm start
# Returns: "Dashboard running at http://localhost:8787"
```
Then Hermes sends the URL to the user.

---

## 🧠 Integration with Hermes

When Duckets says something that matches a trigger phrase, Hermes should:

1. **Confirm the intent** (terse: "Swarm or consensus?")
2. **Run the appropriate command** (use `terminal` tool)
3. **Stream progress** back (use `send_message` to Telegram periodically if long-running)
4. **Summarize the result** (1-2 paragraphs max)

**For web dashboard requests:**
1. Start the server in the background (`terminal` with `background=true`)
2. Verify it boots (`curl http://localhost:8787/api/health`)
3. Send Duckets the URL (local + Tailscale)

**For swarm runs:**
1. Run CLI command
2. If it takes >30s, poll progress via `curl http://localhost:8787/api/swarms/<id>`
3. Send final result to Telegram

---

## 📊 Required Services

| Service | Port | Purpose | Auto-start? |
|---|---|---|---|
| **Mesh server** | 4000 | WebSocket coordination | No (start with `cd Agent-Teams && node mcp-server.js` or check existing) |
| **LM Studio** | 1234 | LLM inference (qwen3.6-35b default) | No (start manually) |
| **Web dashboard** | 8787 | UI | No (start with `npm start` in webui/) |

**Pre-flight check (run before any swarm):**
```bash
curl -s http://localhost:4000/api/health && echo "mesh OK" || echo "mesh DOWN"
curl -s http://localhost:1234/v1/models && echo "lmstudio OK" || echo "lmstudio DOWN"
```

If either is down, tell Duckets before running.

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| "Mesh unreachable" | Start mesh: `cd Agent-Teams && node mcp-server.js &` |
| "LM Studio timeout" | Check GPU mode: Duckets' `mode.py` may have miner running |
| "Decomposition returns fallback" | LLM unreachable OR prompt unparseable — check LM Studio, then retry |
| "WebUI port 8787 in use" | `lsof -i :8787` and kill, or use `PORT=8888 npm start` |
| "Sub-agent hangs >5min" | Default timeout; check dispatcher state: `GET /api/swarms/<id>` |
| "ws module not found" | `cd Agent-Teams/hive-swarm-enhancements/webui && npm install` |

---

## 📂 File Locations (Duckets' Machine)

```
C:\Users\franz\Agent-Teams\
├── hive-swarm-enhancements\        ← the native swarm layer
│   ├── core\                        ← decomposer, dispatcher, aggregator, consensus, planner, cli
│   ├── webui\                       ← master dashboard
│   ├── prompts\                     ← LLM prompt templates
│   ├── examples\                    ← worked examples
│   ├── docs\                        ← architecture + integration docs
│   ├── build-logs\                  ← audit trail of every swarm run
│   └── PROGRESS.md                  ← overnight build log
├── agents\                          ← existing agent definitions
├── providers\                       ← LLM provider adapters
├── scripts\                         ← existing scripts (live-messenger, hive-consensus, etc.)
├── mcp-server.js                    ← mesh coordinator (port 4000)
└── skills\                          ← this file lives here
```

---

## 🎓 Learning from Past Runs

Every swarm run writes to `hive-swarm-enhancements/build-logs/`:
- `decompositions/<timestamp>.json` — what subtasks were created
- `dispatches/<dispatchId>.json` — full state of every agent
- `aggregations/<timestamp>.json` — scoring + synthesis decisions
- `consensus/<pollId>.json` — votes + final decision

**Use this data to:**
- Debug failures (`cat dispatches/<id>.json | jq .`)
- Improve prompts (look for low-scoring outputs)
- Tune the system (compare different decompositions of the same goal)

---

## 🔗 Related Skills

- `prl-mining` — Pearl (PRL) mining updates (uses cron, not swarm)
- `multi-bot-conductor` — orchestrate the bot squad
- `ai-council-stack` — multi-model deliberation (different from swarm)
- `hermes-integration` — how this all plugs into Hermes

---

**Built:** 2026-06-08 (overnight Tick 0.5)
**Repo:** https://github.com/Franzferdinan51/Agent-Teams
**Branch:** `feature/swarm-enhancements` (auto-merged to `main`)
**Maintained by:** Hive Swarm Overnight Builder (cron) + Hermes (daily)
