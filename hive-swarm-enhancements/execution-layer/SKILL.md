---
name: hive-swarm-execution-layer
description: Native execution layer for the Hive Swarm — persistent goals, DAG-based task orchestration, agent matching, trace analysis, evolution (advisor mode), Hermes subagent delegation, dynamic tool forging. Ported from agnt.gg. Triggered when Duckets says "create a goal", "orchestrate this", "execute this", "analyze the traces", "what patterns do you see", "delegate to Hermes", "forge a tool", "evolve skill X", or asks for long-running autonomous work where agents work on agents.
trigger: "Duckets asks to create a long-running goal, orchestrate tasks, analyze execution traces, evolve skills, delegate to a subagent (Hermes), or forge a new tool — anything that goes beyond one-shot swarms into persistent multi-agent work"
last_updated: 2026-06-09
compatibility: ["openclaw", "hermes-agent"]
role: "Execution layer — persistent goals + orchestration + evolution"
agent_type: "execution-coordinator"
capabilities:
  - create_goals
  - orchestrate_dag_tasks
  - match_agents_to_tasks
  - execute_subagents
  - analyze_traces
  - extract_insights
  - suggest_skill_evolution
  - delegate_to_hermes
  - forge_tools
team_compatible: true
mesh_protocol: "ws://localhost:4000/ws"
---

# Hive Swarm — Execution Layer (Dual-Compliant)

> Native port of patterns from **agnt.gg** (https://github.com/agnt-gg/agnt). **Adapted, not forked.** Persistent goals → task DAG → sub-agents → traces → insights → evolution (advisor mode). Plus a Hermes subagent bridge for cross-stack delegation.

## Role

**Execution Coordinator** — Owns the long-running work. Takes a goal, persists it, breaks it into a task DAG, runs subagents in parallel with retries, captures every execution trace, and feeds those traces back into the evolution engine for continuous improvement. Bridges to Hermes Agent for heavyweight subagent work.

## Capabilities

- **goal_creation** — AI-assisted goal analysis, success-criteria extraction, task breakdown
- **persistent_storage** — JSON-backed goal/task/run/trace store with atomic writes
- **dag_orchestration** — Dependency-aware scheduling, parallel execution window, exponential-backoff retries
- **agent_matching** — 4-signal weighted scoring (role 40% / capability 30% / load 20% / recent success 10%)
- **subagent_execution** — Single-task runner with LLM call + tool invocation + trace capture
- **trace_analysis** — Aggregate stats, anomaly detection, success/failure patterns
- **insight_extraction** — LLM judges "what worked / what failed" across batches of traces
- **skill_evolution** — Generates improvement suggestions (ADVISOR MODE — human must approve)
- **hermes_delegation** — Native port of agnt's hermes-subagent pattern (CLI / HTTP / file modes)
- **tool_forging** — Agents can mint new tools at runtime (JSON spec + handler ref)

## When to use this skill

**Load when Duckets says:**
- "create a goal to ..."
- "orchestrate this work"
- "run the tasks in parallel"
- "what does the trace say"
- "analyze last 10 runs"
- "what patterns are you seeing"
- "how can we improve skill X"
- "delegate this to Hermes"
- "spawn a sub-agent to ..."
- "forge a tool for ..."

**Do NOT use for:**
- One-shot swarms (use core/ instead — the execution layer is for persistent, multi-step work)
- Direct LLM calls (use providers/provider-adapter.js)
- Real-time WebSocket coordination (use the mesh + worker-dispatcher)

## Workflow

### 1. Receive goal
- Trigger phrase OR explicit call to `GoalProcessor.processGoal(text)`

### 2. Analyze (LLM)
- LLM extracts: title, description, priority, success criteria, task breakdown
- Heuristic fallback: split by sentence/`and`/comma, distribute roles

### 3. Persist
- `GoalStore.createGoal(data)` → JSON file in `storage/goals/<id>.json`
- Index updated in memory + on disk

### 4. Orchestrate
- `TaskOrchestrator.orchestrate(goalId)` builds a DAG from task dependencies
- Schedules ready tasks (default 5 in parallel)
- For each task: `AgentTaskMatcher.match()` → `SubagentRunner.run()`

### 5. Execute
- SubagentRunner calls LLM with task prompt + agent system prompt
- Captures: output, tokens, duration, errors
- Persists trace to `storage/traces/<id>.json`
- On failure: retry with exponential backoff (default 3x)

### 6. Aggregate
- When all tasks done, `GoalEvaluator.evaluate(goalId)` judges success
- Triggers trace analysis on the goal's traces

### 7. Extract insights
- `InsightEngine.analyzeTraces()` — LLM + heuristic, finds patterns
- Writes insights to `storage/insights/<id>.json`

### 8. Suggest evolution (ADVISOR MODE)
- `SkillEvolver.suggestEvolution(skillName, insights)` writes a suggestion
- Human reviews → calls `approveEvolution()` then `applyEvolution()`
- Every action audit-logged

### 9. Report
- Goal completion + evaluation result → Duckets via Telegram
- Insights + suggestions included

## Dual Compliance

This skill is **dual-compliant** (OpenClaw + Hermes Agent):

- ✅ YAML frontmatter at top (Hermes format)
- ✅ `## Role` / `## Capabilities` / `## Workflow` / `## Example` / `## Notes` sections (OpenClaw format)
- ✅ `compatibility: [openclaw, hermes-agent]`
- ✅ `references/` + `scripts/` subdirectories

## Example

```
User: "Create a goal to build a Discord bot with slash commands, then orchestrate it"

Skill:
1. processGoal("build a Discord bot with slash commands")
   → goalId: "goal-1717950000-a3f2"
   → 5 tasks: architect, backend-dev, devops, security, QA
   → 3 success criteria
2. orchestrate(goalId)
   → DAG resolved, 3 tasks scheduled in parallel
   → task-1 (architect) → agent matched: "system-architect" (score: 0.98)
   → task-1 done in 12s, trace saved
   → tasks 2,3,4 unblocked, scheduled
   → ... (5/5 tasks done in ~3 min)
3. evaluate(goalId)
   → success: true, score: 0.85
   → 2/3 success criteria met
4. analyzeTraces([trace1...trace5])
   → 2 patterns found: "all tasks used Qwen 35B", "tasks with longer system prompts were faster"
5. suggestEvolution("hive-swarm-agent-teams", insights)
   → pending-evolutions/ev-001.json (awaits human approval)
```

## Quick reference

| Service | Port | File | Status |
|---|---|---|---|
| **Mesh** | 4000 | `mcp-server.js` | Existing |
| **LM Studio** | 1234 | (provider-adapter) | Existing |
| **Storage** | — | `execution-layer/storage/*.json` | Auto-created |
| **Hermes bridge** | 8765 (default) | `hermes-subagent-bridge.js` | Auto-detect mode |

## Integration

- **Builds on:** `core/goal-decomposer.js`, `core/worker-dispatcher.js`, `core/result-aggregator.js`
- **Stores to:** `execution-layer/storage/` (JSON files)
- **Triggers via:** `hermes-subagent-bridge.js` (CLI / HTTP / file)
- **Evolves via:** `evolution/skill-evolver.js` (advisor mode)

## Notes

- **Inspired by agnt.gg** — see `docs/PORTED-FROM-AGNT.md` for what was adapted
- **ADVISOR MODE** for skill evolution — no auto-mutation, human approval required
- **JSON storage** in v1 — easy to swap to SQLite later if scale demands
- **Native Hermes bridge** — no Python venv, no extra deps
- **All operations audit-logged** to `storage/pending-evolutions/audit-log.jsonl`
- **Hermes Agent + cron can maintain it** — patterns are clean enough

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | This file |
| `README.md` | Architecture overview |
| `docs/PORTED-FROM-AGNT.md` | What was adapted from agnt |
| `goal-system/*.js` | Goal creation, storage, evaluation |
| `subagent-orchestrator/*.js` | DAG, matching, single-task execution |
| `evolution/*.js` | Trace analysis, insights, skill suggestions |
| `integration/hermes-subagent-bridge.js` | Delegate to Hermes |
| `integration/tool-forge.js` | Mint new tools at runtime |
| `storage/` | JSON-backed persistent store |

## When this skill was last updated

- **2026-06-09 14:15 EST** — Initial port from agnt.gg during overnight build
- **2026-06-09 14:30 EST** — Added hermes bridge + tool forge + dual-compliant SKILL.md
