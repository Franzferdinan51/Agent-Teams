#!/usr/bin/env bash
# Hive Swarm pre-flight check
# Run this BEFORE any swarm to verify mesh + LM Studio + deps are ready.
# Exit code: 0 = all green, 1 = at least one issue
set -u

REPO="/c/Users/franz/Agent-Teams"
WEBUI="$REPO/hive-swarm-enhancements/webui"

ok=0
fail=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "✅ $name"
    ok=$((ok+1))
  else
    echo "❌ $name"
    fail=$((fail+1))
  fi
}

echo "🔍 Hive Swarm pre-flight"
echo "─────────────────────────"

# Mesh
check "mesh up (4000)" \
  "curl -s --max-time 3 http://localhost:4000/api/health"

# LM Studio
check "lmstudio up (1234)" \
  "curl -s --max-time 3 http://localhost:1234/v1/models"

# ws dep at repo root
check "ws installed at repo root" \
  "[ -d '$REPO/node_modules/ws' ]"

# webui deps (optional — only matters if using dashboard)
check "webui deps installed (optional, only for dashboard)" \
  "[ -d '$WEBUI/node_modules/express' ]"

# push-to-main.sh present
check "push-to-main.sh present" \
  "[ -x '$REPO/hive-swarm-enhancements/build-logs/push-to-main.sh' ]"

# Goal decomposer loadable
check "goal-decomposer loadable" \
  "node -e \"require('$REPO/hive-swarm-enhancements/core/goal-decomposer')\""

# Worker dispatcher loadable (requires ws)
check "worker-dispatcher loadable" \
  "node -e \"require('$REPO/hive-swarm-enhancements/core/worker-dispatcher')\""

echo "─────────────────────────"
echo "✅ $ok passed, ❌ $fail failed"

if [ "$fail" -gt 0 ]; then
  echo ""
  echo "Fix the failures above, then re-run. See references/setup-checklist.md for details."
  exit 1
fi
echo "🟢 All clear — ready to swarm"
exit 0
