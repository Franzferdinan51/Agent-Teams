---
name: hive-swarm-agent-teams
description: Use Duckets' native Hive Swarm layer in Franzferdinan51/Agent-Teams — run multi-agent swarms, open the master dashboard, dispatch parallel agents, decompose goals, run consensus votes, aggregate results. Triggered when Duckets says "swarm", "agent team", "dispatch agents", "run a team on", "use the hive", "open the dashboard", "decompose this", "consensus on", "aggregate results", or asks to coordinate multiple agents in parallel.
trigger: "Duckets asks to run a swarm, coordinate multiple agents, use Agent-Teams/Hive, open the swarm dashboard, decompose a goal, run consensus, aggregate agent outputs, dispatch agents in parallel, or mentions hikarioyama/swarm-agent (gently redirect to native)"
last_updated: 2026-06-08
compatibility: ["openclaw", "hermes-agent"]
# OpenClaw-specific (used by OpenClaw loader; ignored by Hermes)
role: "Multi-agent swarm coordinator"
agent_type: "swarm-orchestrator"
capabilities:
  - decompose_goals
  - dispatch_parallel_agents
  - aggregate_results
  - run_consensus_votes
  - open_dashboard
  - plan_execution_strategy
team_compatible: true
mesh_protocol: "ws://localhost:4000/ws"
---

# Hive Swarm — Native Multi-Agent Layer

> **Duckets' native swarm layer lives in `C:\Users\franz\Agent-Teams\hive-swarm-enhancements\`.** Built 2026-06-08 overnight. Auto-updates to `main` every cron tick.
>
> **Dual-compliant:** This skill works in BOTH **OpenClaw** (legacy/team-orchestrator format) AND **Hermes Agent** (modern skill-discovery format). See "Dual Compliance" section below.
>
> **DO NOT pull in hikarioyama/swarm-agent** — it only works with Step-3.7-Flash (Chinese model, not on Duckets' rig), 17 commits, "held together with tape" per author. The native layer does the same job using models Duckets actually runs (Qwen 35B, GLM-5, his fine-tunes).

---

## When to use this skill

**Load when Duckets says:**
- "swarm build a REST API" / "swarm research X" / "swarm audit Y"
- "run a team of N agents on Z"
- "decompose this task" / "break this into subtasks"
- "dispatch agents in parallel"
- "consensus on [question]"
- "aggregate the results"
- "open the swarm dashboard" / "show me the hive"
- "what's the hive doing"
- "kill swarm <id>"
- "use Agent-Teams for this"
- "use the hive for this"
- "ask the hive"

**Do NOT use for:**
- Single-step tasks ("write hello world")
- Pure recall/research with no execution
- Tasks with no parallelism value

---

## 🏛️ Dual Compliance: OpenClaw + Hermes Agent

This skill is designed to be **discovered and used by both** runtime loaders:

### OpenClaw Compliance
- ✅ `SKILL.md` at skill root (no nesting)
- ✅ Plain markdown body with sections: `## Role`, `## Capabilities`, `## Workflow`, `## Example`, `## Notes` (the OpenClaw team-orchestrator format used in `skills/agent-coder/`, `skills/agent-researcher/`, etc.)
- ✅ Self-contained in a single folder: `skills/<name>/{SKILL.md, references/, scripts/}`
- ✅ No required external services beyond what's documented
- ✅ `scripts/` contains executable bash helpers (OpenClaw convention)
- ✅ `references/` contains deep-dive docs loaded on-demand

### Hermes Agent Compliance
- ✅ YAML frontmatter at top with `name`, `description`, `trigger`, `last_updated`
- ✅ Extended frontmatter: `compatibility`, `role`, `agent_type`, `capabilities`, `team_compatible`, `mesh_protocol`
- ✅ "When to load" trigger phrases section right after frontmatter
- ✅ "When NOT to load" anti-triggers (saves LLM tokens)
- ✅ References to `references/` and `scripts/` in body
- ✅ Self-contained, no required env vars (all optional with defaults)

### How each loader finds this skill

**OpenClaw loader:**
```python
# Scans ./skills/<skill-name>/SKILL.md
# Reads markdown body, looks for ## Role / ## Capabilities / ## Workflow
# Adds skill to team member registry
```

**Hermes Agent loader:**
```python
# Scans ~/.hermes/skills/**/SKILL.md  OR  repo-relative hermes-skills/skills/
# Reads YAML frontmatter first (name + description for discovery)
# Reads trigger phrases to decide when to auto-load
# Loads the body for procedural knowledge
```

---

## Role

**Swarm Orchestrator** — Coordinates multiple AI agents to work on a single goal in parallel. Owns the full pipeline: goal decomposition → agent dispatch → result aggregation → optional consensus vote. Acts as the bridge between Duckets' intent and the multi-agent mesh.

## Capabilities

- **goal_decomposition** — break a large task into 3-7 parallel subtasks with assigned roles
- **parallel_dispatch** — fan out subtasks to specialist agents over the mesh WebSocket
- **result_aggregation** — score N outputs, pick best, synthesize a unified answer
- **consensus_voting** — run multi-agent polls for decisions that need agreement
- **planning** — decide approach (direct / swarm / consensus / hybrid) before execution
- **dashboard** — open the real-time web UI at `http://localhost:8787`
- **model_routing** — pick the right LLM per subtask (Qwen 35B, GLM-5, your fine-tunes)
- **offline_fallback** — heuristic decomposition + offline aggregator when mesh/LM Studio down

## Workflow

### 1. Receive goal
- Listen for trigger phrases (see frontmatter + "When to use" above)

### 2. Pre-flight (15s)
- Check mesh (port 4000) + LM Studio (port 1234)
- Tell Duckets if either is down BEFORE running

### 3. Plan
- LLM call: "should this be parallel? does it need agreement?"
- Heuristic fallback based on goal keywords
- Returns: `{ approach, count, domain, model, consensus }`

### 4. Decompose (if swarm)
- LLM breaks goal into 3-7 subtasks
- Each subtask has: `id`, `title`, `prompt`, `role`, `depends_on`
- Robust JSON parser handles markdown fences + malformed LLM output
- Heuristic fallback: split by sentence/`and`/comma, distribute roles

### 5. Dispatch
- Send each subtask to mesh WebSocket
- Track state: `pending → running → completed | failed | killed`
- Write-through to `build-logs/dispatches/<id>.json`
- Per-subtask timeout: 5 min default, configurable

### 6. Aggregate
- Score each output (LLM 0-10 per criterion OR heuristic)
- Pick winner + synthesize top-3 into unified answer
- Save to `build-logs/aggregations/<ts>.json`

### 7. Consensus (if requested)
- Create poll with question + choices
- Agents vote via mesh
- After timeout OR `force-resolve`, return winner + confidence
- Save to `build-logs/consensus/<pollId>.json`

### 8. Report
- 1-2 paragraph summary to Duckets via Telegram
- Include: subtasks, agents, decision, file paths
- If dashboard was opened, include URL

## Example

```
User: swarm build a Discord bot with slash commands

Skill:
1. preflight → mesh:up, lmstudio:up
2. plan → approach: swarm, domain: build, count: 5
3. decompose → architect | backend-dev | devops | security | QA
4. dispatch → 5 agents in parallel over mesh
5. aggregate → scored outputs, picked best, synthesized
6. report → "5 agents finished. Top output: 'Use discord.js + slash command builder...'"
```

## Quick reference (Duckets' machine)

| Service | Port | File | Status |
|---|---|---|---|
| **Mesh** | 4000 | `C:\Users\franz\Agent-Teams\mcp-server.js` | Start with `node mcp-server.js` if down |
| **LM Studio** | 1234 | Tailscale 100.116.54.125:1234 | Token valid per memory |
| **Swarm core** | — | `hive-swarm-enhancements/core/*.js` | Native, ready |
| **Web dashboard** | 8787 | `hive-swarm-enhancements/webui/server.js` | `npm start` in webui/ |

## How to actually run a swarm (Hermes recipe)

### Step 1: Pre-flight (15 seconds)
```bash
curl -s --max-time 3 http://localhost:4000/api/health && echo "✅ mesh up" || echo "❌ mesh DOWN"
curl -s --max-time 3 http://localhost:1234/v1/models >/dev/null && echo "✅ lmstudio up" || echo "❌ lmstudio DOWN"
```

### Step 2: Run the swarm
```bash
cd /c/Users/franz/Agent-Teams
node hive-swarm-enhancements/core/cli.js swarm "<GOAL>" --count <N> --domain <DOMAIN> [--consensus]
```

**Domains:** `build`, `game`, `research`, `audit`, `mobile`, `data`, `general` (auto-detect if omitted)

### Step 3: For long runs (>30s), stream progress
```bash
curl -s http://localhost:8787/api/swarms/<id> | jq .
```

If Duckets wants the dashboard, start it:
```bash
cd /c/Users/franz/Agent-Teams/hive-swarm-enhancements/webui
npm install  # first time
PORT=8787 npm start  # background
```

Then send him: `http://localhost:8787` (or Tailscale IP).

### Step 4: Summarize (1-2 paragraphs to Telegram)
Include: subtasks, agents, decision, files saved.

## Notes

- **No external deps:** unlike hikarioyama/swarm-agent (Step-3.7-Flash only), this works with any model in LM Studio
- **Offline-first:** every layer has heuristic fallback, won't crash if mesh/LM Studio is down
- **Auto-push to main:** the `push-to-main.sh` helper merges feature branch → main after every commit
- **Tailscale-friendly:** web dashboard binds `0.0.0.0:8787`
- **GPU mutex:** if Duckets is mining, LM Studio is paused, swarm falls back to offline mode (still useful)
- **M2.7 + sub-agents:** cron uses M2.7 as primary, can spawn sub-agents on Claude/GPT/Grok/GLM/Qwen

## Integration

- **Mesh protocol:** Uses the same WS frame format as `AGENTS.md` (`{type, from, to, version, content, timestamp, room}`)
- **Provider adapter:** Uses `providers/provider-adapter.js` for all LLM calls
- **Live messenger:** Compatible with `scripts/live-messenger.js` (existing)
- **Consensus:** Wraps `scripts/hive-consensus.js` (existing) with local-fallback
- **Council:** Can be combined with `ai-council-stack` for richer deliberation

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | This file |
| `references/setup-checklist.md` | How to install + run |
| `references/cron-prompt-template.md` | Template for the overnight builder cron |
| `scripts/preflight.sh` | Quick mesh + lmstudio health check |

## When this skill was last updated

- **2026-06-08 23:55 EST**: Initial version, written alongside the overnight build
- **2026-06-09 00:25 EST**: Made dual-compliant (OpenClaw + Hermes Agent)
- Decomp + Dispatcher + WebUI + Aggregator + Consensus + Planner + CLI all shipped
