#!/usr/bin/env bash
# hive-swarm — convenience wrapper for the native swarm layer
# Usage:
#   hive-swarm "build a REST API" --count 5 --domain build
#   hive-swarm dashboard                    # open the web UI
#   hive-swarm status                      # show active swarms
#   hive-swarm preflight                   # check mesh + lmstudio
#   hive-swarm consensus "Q?" "A,B,C"      # create a poll
#
# Auto-uses: /c/Users/franz/Agent-Teams/hive-swarm-enhancements/
set -e

REPO="/c/Users/franz/Agent-Teams"
CORE="$REPO/hive-swarm-enhancements/core"
WEBUI="$REPO/hive-swarm-enhancements/webui"

cmd="${1:-help}"
shift || true

case "$cmd" in
  preflight)
    echo "🔍 Pre-flight check..."
    curl -s --max-time 3 http://localhost:4000/api/health >/dev/null && echo "✅ mesh up (4000)" || echo "❌ mesh DOWN — start with: cd $REPO && node mcp-server.js &"
    curl -s --max-time 3 http://localhost:1234/v1/models >/dev/null && echo "✅ lmstudio up (1234)" || echo "❌ lmstudio DOWN — switch to AI mode"
    exit 0
    ;;
  dashboard)
    echo "🌐 Starting dashboard on port 8787..."
    cd "$WEBUI"
    if [ ! -d node_modules ]; then
      echo "📦 Installing dependencies (first time)..."
      npm install
    fi
    PORT="${PORT:-8787}" npm start
    ;;
  status)
    curl -s --max-time 3 http://localhost:8787/api/swarms 2>/dev/null | jq . || echo "❌ dashboard not running — start with: hive-swarm dashboard"
    ;;
  swarm)
    cd "$REPO"
    node hive-swarm-enhancements/core/cli.js swarm "$@"
    ;;
  decompose)
    cd "$REPO"
    node hive-swarm-enhancements/core/cli.js decompose "$@"
    ;;
  consensus)
    cd "$REPO"
    node hive-swarm-enhancements/core/cli.js consensus "$@"
    ;;
  help|--help|-h|"")
    cat <<EOF
hive-swarm — native multi-agent swarm (no external deps)

Usage:
  hive-swarm preflight                   check mesh + lmstudio
  hive-swarm dashboard                   start the web UI (port 8787)
  hive-swarm status                      show active swarms
  hive-swarm "goal" --count N --domain X  run a swarm
  hive-swarm decompose "goal" --count N   just decompose, no execution
  hive-swarm consensus "Q?" "A,B,C"       create a consensus poll

Domains: build | game | research | audit | mobile | data | general

Examples:
  hive-swarm "build a weather API" --count 5 --domain build
  hive-swarm "research LLM fine-tuning tools" --count 4 --domain research
  hive-swarm "audit my codebase" --count 3 --domain audit --consensus

Repo: https://github.com/Franzferdinan51/Agent-Teams
EOF
    ;;
  *)
    # Pass-through to swarm by default
    cd "$REPO"
    node hive-swarm-enhancements/core/cli.js swarm "$cmd" "$@"
    ;;
esac
