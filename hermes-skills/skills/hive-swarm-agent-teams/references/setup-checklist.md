# First-Time Setup Checklist — Hive Swarm

**Before running any swarm, do these 5 things once.** Each step has a "verify it worked" check.

## 1. Install npm deps at the Agent-Teams repo root

The `worker-dispatcher.js` requires `ws` (WebSocket client). It's a CommonJS dep, not a dev dep, so the cron can't skip it.

```bash
cd /c/Users/franz/Agent-Teams
npm install ws --save
```

**Verify:** `node -e "require('ws')"` exits with no error.

**If you skip this:** Every swarm run throws `Cannot find module 'ws'` when it tries to load `worker-dispatcher.js`. The decomposer works alone, but the dispatcher does not.

## 2. Start the mesh server (port 4000)

The mesh is the WebSocket hub that the dispatcher uses to reach the agents.

```bash
cd /c/Users/franz/Agent-Teams
node mcp-server.js &
```

**Verify:** `curl -s http://localhost:4000/api/health` returns a JSON status. Or run `bash scripts/preflight.sh`.

**If you skip this:** The dispatcher will spin forever in auto-reconnect mode. Output looks like `[WorkerDispatcher] ⚠️ WS error:` on a loop. The swarm does not actually start.

## 3. Verify LM Studio is in AI mode (not mining)

Duckets' GPU is mutex (1 GPU, 16GB). If it's set to "mining", LM Studio is paused.

```bash
curl -s --max-time 3 http://localhost:1234/v1/models >/dev/null && echo "✅ AI mode" || echo "❌ AI mode OFF — switch with: cd /c/Users/franz/Desktop/SkillsBackup && python mode.py ai"
```

**Verify:** `bash scripts/preflight.sh` shows `✅ lmstudio up`.

**If you skip this:** The decomposer's heuristic fallback kicks in and you get generic subtask plans (e.g. "t1 | front-end | Build a Discord bot with slash commands"). Works, but quality drops significantly. Not a hard fail.

## 4. Install webui deps (only if using the dashboard)

The dashboard is a separate npm project under `hive-swarm-enhancements/webui/`.

```bash
cd /c/Users/franz/Agent-Teams/hive-swarm-enhancements/webui
npm install   # installs express + ws only
```

**Verify:** `ls node_modules/express/package.json` exists.

**If you skip this:** `npm start` fails with `Cannot find module 'express'`. The CLI swarm runs still work fine without the dashboard.

## 5. Add `hive-swarm` to PATH (optional but recommended)

```bash
cp /c/Users/franz/Agent-Teams/skills/hive-swarm/hive-swarm.sh ~/bin/hive-swarm
chmod +x ~/bin/hive-swarm
```

**Verify:** `which hive-swarm` returns a path. Then `hive-swarm help` shows the help text.

**If you skip this:** You have to use the long `cd /c/Users/franz/Agent-Teams && node hive-swarm-enhancements/core/cli.js ...` form every time. Not broken, just annoying.

---

## Quick verification (run all 5 at once)

```bash
bash scripts/preflight.sh
```

Should print:
```
✅ mesh up (4000)
✅ lmstudio up (1234)
✅ ws installed at repo root
✅ webui deps installed (optional)
```

If any are missing, re-run the relevant step above.

---

## Troubleshooting

### "Mesh unreachable"
Start the mesh: `cd /c/Users/franz/Agent-Teams && node mcp-server.js &`. If the script isn't there, check the repo for `mcp-server.cjs` or `scripts/` for similar.

### "LM Studio timeout"
Check GPU mode with `mode.py status` (see `desktop-control-lobster` skill). If mining, switch to AI: `mode.py ai`. Wait 3-5 min for LM Studio to come up.

### "Decomposition returns fallback"
`meta.fallback: true` in the output means the LLM call failed. Check LM Studio is up, then retry. If it keeps falling back, the goal might be too vague — make it specific.

### "WebUI port 8787 in use"
`lsof -i :8787` (or `netstat -ano | grep 8787` on Windows). Kill the conflicting PID, or use a different port: `PORT=8888 npm start`.

### "Sub-agent hangs >5 min"
Default timeout is 5 min. Check dispatcher state: `GET http://localhost:8787/api/swarms/<id>` (when dashboard is running). Or look at the audit file: `cat hive-swarm-enhancements/build-logs/dispatches/<id>.json | jq .`.

### "ws module not found"
First-time setup. Run: `cd /c/Users/franz/Agent-Teams && npm install ws --save`.

### "Permission denied on push-to-main.sh"
`chmod +x hive-swarm-enhancements/build-logs/push-to-main.sh` and re-run.

### "Git merge conflict during auto-push"
The cron continues building on the feature branch. Next tick, the merge catches up. If the conflict persists, run `git checkout main && git pull` and resolve manually.

### "Tailscale IP doesn't resolve"
Duckets' LM Studio is at `100.116.54.125:1234` (per memory 2026-06-03). If the IP changed, run `tailscale status` on the local machine to find the new one, then set `LM_STUDIO_BASE_URL` in the cron environment.

### "OneDrive path in error message"
OneDrive is dead (per memory 2026-06-05). Never write to `~/OneDrive/...`. Use `C:\Users\franz\Agent-Teams\` or `C:\Users\franz\Desktop\` instead.

---

## Recovery patterns (when something goes really wrong)

### "I need to start over"
```bash
cd /c/Users/franz/Agent-Teams
git checkout main
git pull origin main
git checkout -b feature/swarm-enhancements
```

### "My cron produced broken code"
```bash
cd /c/Users/franz/Agent-Teams
git log --oneline -20  # find the bad commit
git revert <commit-hash>  # undo it
git push origin feature/swarm-enhancements
bash hive-swarm-enhancements/build-logs/push-to-main.sh  # propagate the revert
```

### "I want to pause the cron"
```python
cronjob(action="list")  # find job_id
cronjob(action="pause", job_id="...")
```

### "Sub-agent produced incomplete code, can I finish manually?"
Yes — but first **commit what landed**:
```bash
cd /c/Users/franz/Agent-Teams
git status           # see what's untracked
git add hive-swarm-enhancements/
git commit -m "wip: partial sub-agent output"
bash hive-swarm-enhancements/build-logs/push-to-main.sh
```
Then continue manually in the next session.
