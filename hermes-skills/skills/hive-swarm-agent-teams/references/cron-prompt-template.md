# Overnight Build Cron — Self-Contained Prompt Template

**Use this template when Duckets asks for an overnight autonomous build.** Copy the prompt block into a `cronjob(action="create", prompt=...)` call and customize the bracketed fields.

## Cron creation call

```python
cronjob(
  action="create",
  name="<PROJECT> Overnight Builder",
  schedule="0 0-10 * * *",                       # every hour 00:00-10:00 EST
  model={"provider": "minimax", "model": "MiniMax-M2.7"},
  prompt="<see prompt block below>",
  workdir="<REPO_PATH>",
  deliver="telegram:588090613",
  skills=["ai-council-stack", "subagent-driven-development", "writing-plans"],
)
```

## Prompt block (customize bracketed fields)

```
You are the <ROLE> — a continuous overnight build agent for Duckets' <PROJECT> repo at <REPO_PATH> (branch: <BRANCH>).

## ⚠️ CRITICAL: AUTO-PUSH TO MAIN ON EVERY COMMIT
After every commit you make, you MUST run:
  bash <REPO_PATH>/hive-swarm-enhancements/build-logs/push-to-main.sh "your commit message"
This merges <BRANCH> → main and pushes to GitHub. Do this EVERY tick, even if you only changed a single doc. The user (Duckets) explicitly requested main branch be kept up to date. If the merge fails due to conflict, run `git checkout <BRANCH>` and continue building — the next successful merge will catch up.

## CONTEXT
Duckets is asleep. Your job is to MAKE PROGRESS on the "<BRANCH>" feature branch by <ONE_LINE_MISSION>. Read <PROGRESS_FILE> FIRST to see what was already built. Append to it as you go. Never delete existing code — only enhance.

## 🎯 MISSION
<DETAILED_SPEC — what files to build, in what order, with what interfaces>

## EXECUTION RULES
- **Work in <REPO_PATH>** (current branch: <BRANCH>)
- **Read <PROGRESS_FILE> first** to know where the previous run left off
- **Use delegate_task heavily** to parallelize — spawn up to 3 sub-agents per tick. Models to use as sub-agents:
  - Primary: minimax/MiniMax-M2.7 (Duckets specifically wants M2.7)
  - Fallback: anthropic/claude-sonnet-4, openai/gpt-4o, xai/grok-4
  - Local: qwen3.6-35b via LM Studio (free)
- **Each sub-agent should produce 1-2 complete files** with full implementations, not stubs
- **Verify each file works**: run `node -c file.js` syntax check
- **Test end-to-end at least once** before ending this cron tick
- **Commit + PUSH TO MAIN after each major milestone** with `bash <REPO_PATH>/hive-swarm-enhancements/build-logs/push-to-main.sh "message"`
- **Update <PROGRESS_FILE>** with what you did, what's next, blockers
- **Save build artifacts/logs to** <LOGS_DIR>/

## DELIVERABLE (this cron run)
1. Read <PROGRESS_FILE>, identify the next pending item
2. Build it (use sub-agents in parallel where possible)
3. Test it
4. Commit + push to main via push-to-main.sh
5. Update <PROGRESS_FILE>
6. Report concisely (1-2 paragraphs max) what you accomplished, what files were created/modified, what's next, and any blockers

## CONSTRAINTS
- DO NOT touch existing code outside <ENHANCEMENT_DIR> — only ADD
- DO NOT pull in <FORBIDDEN_DEP> — build native
- DO NOT install new npm/pip packages without checking first
- If a sub-agent's work is incomplete or broken, fix it yourself or retry — never leave broken code
- If you hit a hard blocker, document it in <PROGRESS_FILE> and stop early — don't spin wheels
- **NEVER forget to push to main** — Duckets wants main branch current

## WHEN DONE
Send a Telegram message to home (telegram:588090613) summarizing: ✅ what shipped, 📁 files added, 🧪 test results, ⏭️ next steps. Keep it under 200 words.
```

## Required companion file: `push-to-main.sh`

Save this to `<REPO_PATH>/hive-swarm-enhancements/build-logs/push-to-main.sh` (or wherever the cron prompt references):

```bash
#!/usr/bin/env bash
set -e
cd "<REPO_PATH>"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 On branch: $BRANCH"

# Stage everything in the agreed enhancement dir
git add <ENHANCEMENT_DIR>/ 2>/dev/null || true

if git diff --staged --quiet; then
  echo "ℹ️  No changes to commit"
else
  MSG="${1:-chore: auto-update $(date -u +%Y-%m-%dT%H:%M:%SZ)}"
  git commit -m "$MSG" 2>&1 | tail -3
  echo "✅ Committed to $BRANCH"
fi

echo "🚀 Pushing $BRANCH to origin..."
git push origin "$BRANCH" 2>&1 | tail -3 || echo "⚠️  Feature push failed"

echo "🔀 Merging $BRANCH → main..."
git checkout main 2>&1 | tail -1
git pull origin main --ff-only 2>&1 | tail -1 || echo "⚠️  Pull failed (offline?)"
git merge "$BRANCH" --no-ff -m "merge: $BRANCH → main (auto by overnight builder)" 2>&1 | tail -3 || {
  echo "⚠️  Merge conflict — keeping $BRANCH as source of truth"
  git checkout "$BRANCH" 2>&1 | tail -1
  exit 1
}

echo "🚀 Pushing main to origin..."
git push origin main 2>&1 | tail -3

git checkout "$BRANCH" 2>&1 | tail -1
echo "✅ Done — main is up to date"
```

## Why this template works

- **Self-contained** — the cron session has no chat context, so the prompt must say everything
- **Hard-coded scripts** — `push-to-main.sh` exists in the repo, so the cron just calls it
- **PROGRESS.md loop** — the cron reads the file at the top of each tick to know what to do next
- **Audit trail** — every commit + build log is preserved on `main`
- **Sub-agent timeout is OK** — the cron is told to commit whatever landed, even if a sub-agent timed out at 600s
- **ADD-only** — explicit "do not delete" prevents the cron from breaking existing code
- **M2.7 preferred** — Duckets said "use M2.7" and "use various high-end models"; this gives the order

## Customization checklist

Before scheduling the cron, verify:
- [ ] `<REPO_PATH>` is an absolute path that exists
- [ ] `<BRANCH>` exists locally (create with `git checkout -b <BRANCH>`)
- [ ] `<PROGRESS_FILE>` is committed to the branch
- [ ] `push-to-main.sh` is committed to `<LOGS_DIR>/` and is `chmod +x`
- [ ] Cron `model` is `MiniMax-M2.7` (Duckets' preference)
- [ ] `workdir` matches the repo path (so sub-agents inherit the right CWD)
- [ ] `deliver` is `telegram:588090613` (so updates reach Duckets in the morning)
