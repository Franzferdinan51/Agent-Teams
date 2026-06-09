# Hive Swarm — Execution Layer

> The "agents on top of agents" execution layer. **Inspired by agnt.gg** (https://github.com/agnt-gg/agnt) — adapted, not forked. Native Node.js, no Electron, no Python venv.

## What's here

```
hive-swarm-enhancements/execution-layer/
├── goal-system/                          ← port of agnt's goal system
│   ├── goal-processor.js                 AI breaks goal into tasks + success criteria
│   ├── goal-store.js                     JSON-file persistent store (atomic writes)
│   └── goal-evaluator.js                 LLM judges if success criteria are met
├── subagent-orchestrator/                ← port of agnt's TaskOrchestrator
│   ├── task-orchestrator.js              DAG + parallel + retry + state machine
│   ├── agent-task-matcher.js             4-signal scoring (role/cap/load/success)
│   └── subagent-runner.js                Single-task execution + trace capture
├── evolution/                            ← port of agnt's self-improvement (advisor mode)
│   ├── insight-engine.js                 LLM analyzes traces → patterns + recommendations
│   ├── skill-evolver.js                  Suggests improvements (no auto-mutation in v1)
│   └── trace-analyzer.js                 Aggregates stats, finds anomalies
├── integration/
│   ├── hermes-subagent-bridge.js         Native port of agnt's hermes-subagent pattern
│   └── tool-forge.js                     Dynamic tool creation + registration
├── storage/                              persistent JSON store
│   ├── goals/                            one file per goal
│   ├── runs/                             one file per orchestrated run
│   ├── traces/                           one file per subagent execution
│   ├── insights/                         one file per insight batch
│   ├── tools/                            one file per forged tool
│   └── pending-evolutions/               awaiting human approval
├── prompts/                              LLM prompt templates
├── docs/                                 architectural notes
├── SKILL.md                              dual-compliant (OpenClaw + Hermes Agent)
└── README.md                             this file
```

## The "loop" you wanted

```
goal → tasks → subagents → execute → trace → insights → suggestions → human approval → apply → better next time
```

| Stage | File | Pattern |
|---|---|---|
| Goal analysis | `goal-processor.js` | LLM breaks down + sets success criteria |
| Persistent storage | `goal-store.js` | atomic JSON writes, in-memory index |
| Orchestration | `task-orchestrator.js` | DAG-aware, parallel, retry, state machine |
| Agent matching | `agent-task-matcher.js` | role(40) + cap(30) + load(20) + success(10) |
| Single execution | `subagent-runner.js` | LLM call + tool invocation + trace |
| Trace analysis | `trace-analyzer.js` | success rates, anomalies, patterns |
| Insight extraction | `insight-engine.js` | LLM judges "what worked / what failed" |
| Evolution | `skill-evolver.js` | generates suggestions (advisor mode) |
| Cross-stack delegation | `hermes-subagent-bridge.js` | hand off to Hermes as a heavyweight subagent |
| Dynamic tools | `tool-forge.js` | agents can mint new tools at runtime |

## Quick start

```bash
cd /c/Users/franz/Agent-Teams

# 1. Create a goal
node hive-swarm-enhancements/execution-layer/goal-system/goal-processor.js \
  process "build a Discord bot with slash commands" --count 5

# 2. Orchestrate the goal (parallel execution, retries, etc.)
node hive-swarm-enhancements/execution-layer/subagent-orchestrator/task-orchestrator.js \
  orchestrate <goalId>

# 3. After execution, analyze traces
node hive-swarm-enhancements/execution-layer/evolution/trace-analyzer.js stats --last 10

# 4. Get evolution suggestions (advisor mode — human must approve)
node hive-swarm-enhancements/execution-layer/evolution/skill-evolver.js suggest hive-swarm-agent-teams
```

## Inspired by agnt.gg

We ported these patterns (with adaptations):
- ✅ **Goal system** (GoalProcessor, GoalModel, TaskModel) → JSON store instead of SQLite
- ✅ **Task orchestration** (TaskOrchestrator's DAG + parallel + retry) → kept the same shape
- ✅ **Agent task matching** (AgentTaskMatcher's capability scoring) → added 4-signal weighted scoring
- ✅ **Trace analysis** (TraceAnalyzer) → kept the patterns
- ✅ **Insight engine** (InsightEngine) → added heuristic fallback
- ✅ **Skill evolver** (SkillEvolver) → **SAFETY: advisor mode only** (agnt's auto-mutates skills; we don't)
- ✅ **Hermes subagent bridge** (their hermes-subagent skill) → native port, no Python venv
- ✅ **Tool forge** (their toolForge + toolRegistry) → kept the JSON-spec + handler-ref pattern

We left these:
- ❌ Electron desktop app (we have a web dashboard)
- ❌ Puppeteer/Playwright browser automation (out of scope)
- ❌ 15+ AI provider adapters (we have LM Studio + 1-2 providers)
- ❌ Auto-mutating skills (too risky without human approval)

## Why native (not a fork)?

- No Electron, no 700MB of npm deps
- No Python venv
- No SQLite (just JSON files in storage/)
- Drops into your existing Agent-Teams stack
- Hermes Agent + sub-agents on the cron can maintain it

## Status

- ✅ Goal system (3 files) — ported, committed
- ✅ Subagent orchestrator (3 files) — ported, committed
- ✅ Evolution engine (3 files) — ported in advisor mode, committed
- ✅ Integration (2 files: hermes bridge, tool forge) — built in main thread
- 🚧 CLI wrappers (currently using `node <file>.js` directly)
- 🚧 SKILL.md (dual-compliant) — see separate file
- 🚧 Examples + docs (TBD by cron)

## Last updated

- **2026-06-09 14:15 EST** — Initial port from agnt.gg
- **2026-06-09 14:30 EST** — Added hermes bridge + tool forge
- See git log on `feature/swarm-enhancements` branch for full history
