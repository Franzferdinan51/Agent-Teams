# SKILLS-INDEX

Curated index of every skill shipped in `hermes-skills/skills/`. All skills in
this repo are **dual-compliant** (work in BOTH OpenClaw and Hermes Agent
loaders) unless noted otherwise.

## Shipped

### `hive-swarm-agent-teams`

| Field | Value |
|---|---|
| **Path** | `skills/hive-swarm-agent-teams/` |
| **Status** | ✅ Shipped |
| **Compatibility** | openclaw, hermes-agent |
| **Role** | Swarm orchestrator |
| **Last updated** | 2026-06-08 |
| **Companion files** | `SKILL.md`, `references/setup-checklist.md`, `references/cron-prompt-template.md`, `scripts/preflight.sh` |
| **Description** | Native multi-agent swarm — decompose goals, dispatch parallel agents, run consensus, aggregate results. Drives the `hive-swarm-enhancements/` layer. |
| **Trigger phrases** | "swarm build/research/audit", "run a team of N agents", "decompose this", "consensus on", "aggregate the results", "open the swarm dashboard" |

## Planned (backlog)

- `consensus-only` — Run a consensus vote without the full swarm (lighter weight)
- `web-dashboard-control` — Drive the web UI programmatically via REST
- `pearl-mining-swarm` — Swarm specialized for mining analysis (replaces/extends prl-mining skill)
- `claude-code-bridge` — Spawn Claude Code workers in parallel via the mesh
- `ai-council-cron` — Run a scheduled AI Council deliberation on a topic

## Adding a new skill

1. Create `skills/<name>/SKILL.md` with YAML frontmatter + body
2. Add `references/` and `scripts/` as needed
3. Add an entry above (under "Shipped" or "Planned")
4. Run `bash hermes-skills/scripts/verify-compliance.sh` to verify dual-compliance
5. Commit + push (auto-merges to main via `push-to-main.sh`)
6. Run `bash hermes-skills/scripts/sync-to-local.sh` to deploy to your local Hermes

## Removing a skill

Move it from "Shipped" to a "Removed" section here (don't git-delete — keeps history clean).
