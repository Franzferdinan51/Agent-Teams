# Duckets' Hermes Skills — Public, In-Repo, Dual-Compliant

A **versioned, public mirror** of Duckets' local Hermes skill stack — now living
inside the Agent-Teams repo at `hermes-skills/`. Skills are authored locally
under `C:\Users\franz\AppData\Local\hermes\skills\duckets-stack\` and mirrored
here so the broader Hermes community (and future Hermes installs) can
discover, audit, and reuse them.

> **Public repo.** Anything committed here is open-source. Do **not** commit
> secrets, tokens, or machine-specific absolute paths beyond the ones already
> documented inside the skill files themselves.

---

## 🤝 Dual Compliance: OpenClaw + Hermes Agent

The Agent-Teams repo is already **OpenClaw-compliant** (see `skills/agent-coder/`,
`skills/agent-researcher/`, etc. for the format). This `hermes-skills/` folder
extends that with **Hermes Agent** compliance so the same skills work in BOTH
runtime loaders.

| Loader | Format | Discovery |
|---|---|---|
| **OpenClaw** (team-orchestrator) | Plain markdown, sections: `## Role` / `## Capabilities` / `## Workflow` / `## Example` / `## Notes` | Scans `./skills/<name>/SKILL.md` |
| **Hermes Agent** (skill-discovery) | YAML frontmatter (`name`/`description`/`trigger`/`compatibility`) + same body | Scans `~/.hermes/skills/**/SKILL.md` OR `hermes-skills/skills/` |

Each skill in this folder is **deliberately structured to satisfy both**:
- ✅ YAML frontmatter at the top (Hermes parses first)
- ✅ `## Role` / `## Capabilities` / `## Workflow` / `## Example` / `## Notes` sections in the body (OpenClaw reads these)
- ✅ `references/` + `scripts/` subdirectories (both loaders support)
- ✅ Extended frontmatter fields: `compatibility`, `role`, `agent_type`, `capabilities`, `team_compatible`, `mesh_protocol`

See `skills/hive-swarm-agent-teams/SKILL.md` for the canonical dual-compliant example.

---

## Why in-repo (not a separate repo)?

We started with a separate `Franzferdinan51/Duckets-Hermes-Skills` repo, but
decided to fold it into Agent-Teams so:

1. **One source of truth** — skills + the agents/swarm they drive live together
2. **One CI / release pipeline** — versioned with Agent-Teams (currently v2.1.0)
3. **Easier discovery** — anyone browsing Agent-Teams finds the skills
4. **Auto-synced with cron** — the overnight Hive Swarm Builder updates both
   the swarm layer AND the skills in one commit
5. **Dual compliance for free** — Agent-Teams is already OpenClaw-compliant, this folder adds Hermes Agent

## What's in here

| Path | Purpose |
| --- | --- |
| `skills/<skill-name>/SKILL.md` | The canonical skill definition (frontmatter + body) |
| `skills/<skill-name>/references/` | Optional reference docs the skill links to |
| `skills/<skill-name>/scripts/` | Optional helper scripts the skill invokes |
| `SKILLS-INDEX.md` | Curated index of every skill currently shipped |
| `scripts/check-compliance.sh` | Verify all skills pass OpenClaw + Hermes checks |
| `scripts/sync-to-local.sh` | Mirror `hermes-skills/` → `~/.hermes/skills/duckets-stack/` |
| `LICENSE` | MIT — all skills in this repo are MIT-licensed unless noted |

## Skills shipped

See **[SKILLS-INDEX.md](./SKILLS-INDEX.md)** for the full list.

Currently shipped:

- `hive-swarm-agent-teams` — Native multi-agent swarm layer (decompose goals,
  dispatch parallel agents, run consensus, aggregate results). The flagship
  skill for the `hive-swarm-enhancements/` layer. **Dual-compliant**.

## Sync model

Skills are authored locally and mirrored here in three steps:

1. Edit the skill under
   `C:\Users\franz\AppData\Local\hermes\skills\duckets-stack\<skill-name>\`.
2. Copy the updated files into the matching path here:
   `hermes-skills/skills/<skill-name>\`.
3. `git add hermes-skills/ && git commit -m "skill(<name>): <change>"`
   (the `push-to-main.sh` auto-merger will handle the rest).

The overnight `Hive Swarm Overnight Builder` cron (model: MiniMax-M2.7) can
also bump skill versions as it ships swarm-layer features.

### Sync to local Hermes install (one-liner)

After committing, run:

```bash
bash hermes-skills/scripts/sync-to-local.sh
```

This copies every skill in `hermes-skills/skills/` to
`~/.hermes/skills/duckets-stack/` so your local Hermes picks them up
immediately.

## Compliance checking

```bash
bash hermes-skills/scripts/check-compliance.sh
```

This verifies that every `SKILL.md` in this folder:
- ✅ Has a YAML frontmatter block (Hermes requirement)
- ✅ Has `name`, `description`, `trigger` in frontmatter
- ✅ Has `## Role`, `## Capabilities`, `## Workflow` sections in body (OpenClaw requirement)
- ✅ Lists `compatibility: [openclaw, hermes-agent]` (dual-compliance declaration)

## Versioning

The repo follows standard **Semantic Versioning** for the skill-set as a
whole. Each skill's own frontmatter carries a `last_updated:` field so
consumers can tell how fresh a given skill is without reading git history.

## License

MIT — see [LICENSE](./LICENSE).
