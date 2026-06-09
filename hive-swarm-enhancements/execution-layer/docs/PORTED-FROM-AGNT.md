# Ported from agnt.gg — What, Why, and What's Left

> Source: https://github.com/agnt-gg/agnt (v0.5.17, MIT-style "AGNT Community Core License")
> Adapted for Agent-Teams / Hive Swarm, not forked.

## What we ported

| Pattern | Source file (agnt) | Target file (Agent-Teams) | Lines | Adaptation |
|---|---|---|---|---|
| Goal processing | `backend/src/services/goal/GoalProcessor.js` | `execution-layer/goal-system/goal-processor.js` | 402 → ~400 | JSON store instead of SQLite |
| Goal evaluation | `backend/src/services/goal/GoalEvaluator.js` | `execution-layer/goal-system/goal-evaluator.js` | 470 → ~370 | LLM judge + heuristic fallback |
| Agent-task matching | `backend/src/services/goal/AgentTaskMatcher.js` | `execution-layer/subagent-orchestrator/agent-task-matcher.js` | 246 → 245 | Added 4-signal weighted scoring |
| Task orchestration | `backend/src/services/goal/TaskOrchestrator.js` | `execution-layer/subagent-orchestrator/task-orchestrator.js` | 1307 → 576 | Trimmed to essentials; reuse our worker-dispatcher |
| Single-task execution | (implied in orchestrator) | `execution-layer/subagent-orchestrator/subagent-runner.js` | new | LLM call + tool invocation + trace |
| Trace analysis | `backend/src/services/goal/TraceAnalyzer.js` | `execution-layer/evolution/trace-analyzer.js` | 446 → ~370 | Same patterns, smaller surface |
| Insight engine | `backend/src/services/evolution/InsightEngine.js` | `execution-layer/evolution/insight-engine.js` | (didn't count) → ~390 | LLM judge + heuristic stats |
| Skill evolver | `backend/src/services/goal/SkillEvolver.js` | `execution-layer/evolution/skill-evolver.js` | 712 → ~430 | **ADVISOR MODE** — no auto-mutation |
| Hermes subagent | `backend/skills/hermes-subagent/SKILL.md` | `execution-layer/integration/hermes-subagent-bridge.js` | (doc) → ~280 | Native Node, no Python venv |
| Tool forge | `backend/src/services/orchestrator/toolForgeTools.js` + `toolRegistry.js` | `execution-layer/integration/tool-forge.js` | (didn't count) → ~190 | JSON-spec tools, handler-ref pattern |

## What we left (and why)

| Pattern | Why left |
|---|---|
| **Electron desktop app** | You have a web dashboard (`hive-swarm-enhancements/webui/`) |
| **Puppeteer/Playwright browser automation** | Out of scope for the swarm layer (could add later if needed) |
| **15+ AI provider adapters** | We have LM Studio + 1-2 providers in `providers/provider-adapter.js`. agnt has 15 — overkill for our use case |
| **SQLite for goals** | JSON files are simpler, easier to grep, easy to upgrade later. v1 is JSON; can swap to SQLite if scale demands it |
| **Auto-mutating skills** | agnt's `SkillEvolver` creates, A/B-tests, deletes, and promotes skill files with NO human in the loop. **Way too risky.** We do analysis + suggestions + require human approval |
| **Vue.js frontend** | We have vanilla HTML/JS dashboard (no build step, fast iteration) |
| **Custom CLI flags** | agnt has 50+ CLI flags. We have 6: `swarm`, `decompose`, `consensus`, `plan`, `preflight`, `--help` |
| **Database migrations** | JSON files don't need them |
| **Plugin system** | Could add later — for now, all features are in-tree |

## Key adaptations

### 1. Storage: JSON instead of SQLite

agnt uses Sequelize + SQLite for goals/tasks/traces. We use JSON files in `execution-layer/storage/` with atomic writes (tmp + rename) and an in-memory index.

**Why:** JSON is:
- Easier to inspect (`cat storage/goals/<id>.json`)
- Easier to version-control
- Easier to migrate later if we hit perf issues
- Trivial to backup (just rsync the dir)

**Trade-off:** Won't scale past ~10K goals in one dir. When we hit that, we swap to SQLite. Not a v1 concern.

### 2. Evolution: advisor mode (not auto-mutate)

agnt's `SkillEvolver.js` will:
1. Generate a new skill variant
2. A/B test it
3. If better, promote it
4. If worse, delete it

**We don't do that.** Our `SkillEvolver.suggestEvolution()`:
1. Analyzes traces
2. Generates a suggestion
3. Writes a `pending-evolutions/<id>.json` file
4. **Human must explicitly call `approveEvolution()` then `applyEvolution()`**
5. Every action is audit-logged to `pending-evolutions/audit-log.jsonl`

**Why:** Auto-mutating skills in a 24/7 running system is one bad cycle away from bricking the whole stack. The human-in-the-loop is non-negotiable for v1.

### 3. Hermes subagent: native (no Python venv)

agnt's `hermes-subagent` skill spawns Hermes in a Python venv at `C:\Users\Studio\AppData\Roaming\AGNT\hermes-sandbox\`. We use the same Hermes but spawn it natively:

- **CLI mode:** `hermes run "task" --output json --model X`
- **HTTP mode:** `POST http://localhost:8765/v1/agent/run`
- **File mode:** write prompt to `~/.hermes/inbox/`, poll `~/.hermes/outbox/`

**Why:** We don't have a Python venv set up. Native = no extra deps. The HTTP path is the future-proof one — Hermes Agent has a gateway.

### 4. Provider layer: keep our adapter

agnt has 15+ providers. We have `providers/provider-adapter.js` with LM Studio + 1-2 fallbacks. Rather than replace, our execution layer **uses our adapter** for all LLM calls.

This means: less code, no provider-config drift, easy to extend.

## What we kept 1:1

These patterns ported cleanly with no adaptation needed:

- **State machine:** `pending → scheduled → running → completed | failed | killed | retried`
- **DAG dependency resolution:** tasks wait for their `depends_on` to complete
- **Parallel execution window:** N tasks at a time, configurable
- **Retry with exponential backoff:** failed tasks retry up to 3x
- **Per-task timeout:** 10 min default
- **Event emission:** orchestrator emits events for each state transition
- **JSON persistence per run:** one file per orchestrated run

## Inspiration, not replacement

This isn't a fork. We don't sync from upstream. If agnt ships a new pattern, we read it, evaluate it, and **adapt the parts that fit** — not pull the whole thing.

**Maintainer contract:** when adapting agnt patterns, add a row to the "What we ported" table above. Keep this doc honest.

## Last reviewed

- **2026-06-09 14:15 EST** — initial port during overnight build
