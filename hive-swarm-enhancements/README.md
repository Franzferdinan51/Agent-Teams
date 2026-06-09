# 🐝 Hive Swarm Enhancements — Multi-Agent Layer for Agent-Teams

> A **native multi-agent swarm** that lives inside the Agent-Teams repo. Decompose goals, dispatch parallel agents, run consensus votes, aggregate results, persist traces, extract insights, and evolve over time. **Dual-compliant with OpenClaw + Hermes Agent.**

## 🎯 What it does

| You say | It does |
|---|---|
| `node cli.js goal "build a Discord bot"` | Goal → tasks → agents → traces → evaluation → insights |
| `node cli.js swarm "research X"` | Quick: decompose → dispatch → aggregate (one shot) |
| `node cli.js consensus "ship today?"` | Multi-agent vote on a question |
| `node cli.js plan "audit codebase"` | Just print the routing plan (no execution) |
| `node cli.js preflight` | Check mesh + LM Studio health |
| `node cli.js goal-list` | List all persistent goals |
| `node cli.js goal-eval <id>` | Re-evaluate a goal's success criteria |
| `node cli.js goal-insights <id>` | Extract insights from a goal's traces |

## 🏗️ Architecture

```
hive-swarm-enhancements/
├── core/                         ← quick swarms (decompose → dispatch → aggregate)
│   ├── goal-decomposer.js        LLM → 3-7 subtasks
│   ├── worker-dispatcher.js      parallel dispatch over mesh WS
│   ├── result-aggregator.js      score N outputs + synthesize
│   ├── consensus-engine.js       multi-agent voting
│   ├── planner.js                router: direct / swarm / consensus / hybrid
│   ├── README.md
│   └── cli.js                    `swarm / decompose / consensus / plan / preflight`
│
├── execution-layer/              ← persistent goals + evolution (ported from agnt.gg)
│   ├── goal-system/              GoalProcessor + GoalStore + GoalEvaluator
│   ├── subagent-orchestrator/    TaskOrchestrator (DAG) + AgentTaskMatcher + SubagentRunner
│   ├── evolution/                TraceAnalyzer + InsightEngine + SkillEvolver (advisor mode)
│   ├── integration/
│   │   ├── hermes-subagent-bridge.js   delegate to Hermes / CodingHarness (4 modes)
│   │   └── tool-forge.js              dynamic tool creation
│   ├── glue.js                   pipeline runner that wires core + execution-layer
│   ├── SKILL.md                  dual-compliant (OpenClaw + Hermes Agent)
│   ├── README.md
│   └── docs/PORTED-FROM-AGNT.md
│
├── webui/                        ← master dashboard (port 8787)
│   ├── server.js                 Express + WS
│   ├── api/                      REST: swarm, agents, consensus, logs, store
│   ├── public/                   dark-theme SPA (no build step)
│   ├── ws/relay.js               browser ↔ mesh ↔ Hermes bridge
│   └── README.md
│
├── cli.js                        ← top-level CLI: `goal / swarm / goal-list / ...`
├── tests/e2e/loop.test.js        ← full pipeline test (9/9 pass in 83ms)
├── PROGRESS.md                   ← overnight build log
└── build-logs/                   ← audit trail
```

## 🧪 Test

```bash
node --test hive-swarm-enhancements/tests/e2e/loop.test.js
# ✔ 9/9 in 83ms
```

The E2E test exercises the **full loop**: create goal → match agents → simulate execution → save traces → analyze → extract insights → suggest skill evolution → evaluate.

## 🤝 Dual-Compliant

The skill at `execution-layer/SKILL.md` works in **both**:
- **OpenClaw** (team-orchestrator format — `## Role` / `## Capabilities` / `## Workflow`)
- **Hermes Agent** (YAML frontmatter + trigger phrases)

Verified by `hermes-skills/scripts/verify-compliance.sh` ✅

## 🛠️ Code Harnesses — Pluggable

The `hermes-subagent-bridge.js` (v2.0.0) delegates to **any code harness** via `hive-swarm-enhancements/integration/harness-registry.json`. To add a new harness, drop an entry — no code changes needed.

| Harness | Binary | When to use |
|---|---|---|
| **CodingHarness** | `ch` | Default. Multi-provider, sub-agents, goal/loop modes. Mature. |
| **Claude Code** | `claude` | Deep reasoning, large refactors, codebase Q&A. |
| **OpenCode** | `opencode` | Model flexibility (Vertex AI, Ollama, DeepSeek, Kimi, etc.). |
| **Codex** | `codex` | OpenAI-optimized, GPT-5.1, sandboxed. |
| **Grok Build** | `grok` | Fast xAI iteration, grok-code-fast-1. |
| **(your custom)** | `<bin>` | Add an entry to `harness-registry.json`. |

Selection is **capability-first**:
- `task.kind` → `task_routing` table → preferred harness
- `task.capabilities` → capability intersection → highest-score harness
- fallback chain in registry

```js
const { delegate, status } = require('./hive-swarm-enhancements/execution-layer/integration/hermes-subagent-bridge.js');

// Doctor
const s = await status();
// → { runtime: 'openclaw', harness: {id:'opencode', ...}, installed_harnesses: [...] }

// Delegate — picks the best installed harness for the kind
const r = await delegate({
  prompt: 'Refactor the auth module to use JWT',
  kind: 'code_edit_multi_file',
  model: 'minimax/MiniMax-M2.7',
});
// → { output, sessionId, durationMs, runtime, harness, mode, meta }
```

## 🌐 Dual-Runtime — OpenClaw + Hermes

The bridge also auto-detects **which agent runtime is hosting it** and adapts the envelope. Same code, two environments:

| Runtime | Gateway | Auth | MCP proxy | Skill dir |
|---|---|---|---|---|
| **OpenClaw** (🦞) | `:18789` | `X-API-Key` | `/v1/mcp/tools/call` | `~/.openclaw/skills` |
| **Hermes Agent** (⚕️) | `:8765` | `Authorization: Bearer` | `/api/mcp/call` | `~/AppData/Local/hermes/skills` |
| **(standalone)** | — | — | direct stdio | n/a |

Configured in `hive-swarm-enhancements/integration/runtime-registry.json`. The bridge probes both, picks the first healthy one, and templates the right envelope per call. Traces record `runtime` + `harness` + `mode` for every delegation.

**Verified by** `npm run test:harness-bridge` → 15/15 pass.

## 🌙 Overnight Build

The `Hive Swarm Overnight Builder` cron (model: MiniMax-M2.7) runs **hourly 00:00-10:00 EST**, building features in parallel via sub-agents. See `PROGRESS.md` for the full build log.

## 📜 License

MIT — see repo root.

## 🐝 Built with

- [agnt.gg](https://github.com/agnt-gg/agnt) — inspired the execution layer (adapted, not forked)
- [CodingHarness](https://github.com/Franzferdinan51/Custom-Code-Harness) — preferred subagent for code work
- [OpenClaw](https://github.com/openclaw/openclaw) — original team-orchestrator format
- [Hermes Agent](https://hermes-agent.nousresearch.com/docs) — modern skill-discovery format
