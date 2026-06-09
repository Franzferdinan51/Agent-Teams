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

## 🎯 CodingHarness Integration

The `hermes-subagent-bridge.js` can delegate to **CodingHarness** (https://github.com/Franzferdinan51/Custom-Code-Harness) via its `ch mcp` server on port 3456 (JSON-RPC 2.0 over HTTP+SSE, 13 tools). This is the **preferred mode for code work** — CodingHarness already has:
- Multi-provider support (OpenAI, Anthropic, MiniMax, LM Studio, OpenRouter)
- Sub-agents, skills, memory, sessions, cron
- TUI, web UI, Electron desktop
- Goal mode, loop mode, agent mode

When a sub-task is code-heavy, the bridge auto-detects CodingHarness and uses `ch mcp` for delegation. Falls back to Hermes CLI / HTTP / file mode if unavailable.

## 🌙 Overnight Build

The `Hive Swarm Overnight Builder` cron (model: MiniMax-M2.7) runs **hourly 00:00-10:00 EST**, building features in parallel via sub-agents. See `PROGRESS.md` for the full build log.

## 📜 License

MIT — see repo root.

## 🐝 Built with

- [agnt.gg](https://github.com/agnt-gg/agnt) — inspired the execution layer (adapted, not forked)
- [CodingHarness](https://github.com/Franzferdinan51/Custom-Code-Harness) — preferred subagent for code work
- [OpenClaw](https://github.com/openclaw/openclaw) — original team-orchestrator format
- [Hermes Agent](https://hermes-agent.nousresearch.com/docs) — modern skill-discovery format
