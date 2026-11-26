#!/bin/bash
# start-all.sh - Start ALL Agent-Teams v2.2.0 services
# Usage:
#   ./start-all.sh        Start all services (stops this script's prior PIDs first)
#   ./start-all.sh stop   Stop only the PIDs recorded in ./.agent-teams.pids
#
# Configuration comes from the environment only — no literal API keys live in
# this script. Copy .env.example to .env and fill in your keys; ./.env (if
# present, in this repo's directory) is sourced automatically.
# NOTE: The agent-mesh-api service is NOT started here anymore — it lives in a
# separate repo and is not part of this repository.

set -u
cd "$(dirname "$0")"

PID_FILE="./.agent-teams.pids"

# Load local env file if present (repo-local only; never ~/.openclaw)
if [ -f ./.env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
fi

# Pass-through defaults (environment only, no secrets)
export LM_STUDIO_URL="${LM_STUDIO_URL:-${LMSTUDIO_URL:-http://127.0.0.1:1234}}"
export LMSTUDIO_URL="${LMSTUDIO_URL:-$LM_STUDIO_URL}"
export LM_STUDIO_KEY="${LM_STUDIO_KEY:-${LMSTUDIO_API_KEY:-}}"
export MINIMAX_API_KEY="${MINIMAX_API_KEY:-}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"
export AGENT_MESH_API_KEY="${AGENT_MESH_API_KEY:-}"

stop_services() {
    if [ -f "$PID_FILE" ]; then
        echo "Stopping services recorded in $PID_FILE..."
        # PID file format: one "name pid" pair per line
        while read -r _name _pid; do
            if [ -n "${_pid:-}" ] && kill -0 "$_pid" 2>/dev/null; then
                kill "$_pid" 2>/dev/null && echo "  stopped $_name (PID $_pid)"
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    else
        echo "No PID file ($PID_FILE) — nothing to stop."
    fi
}

if [ "${1:-}" = "stop" ]; then
    stop_services
    exit 0
fi

echo "🚀 Starting Agent-Teams v2.2.0 (Full Stack)"
echo "============================================"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Stop only our own previously-started services (PID-file managed; no pkill)
echo -e "\n${YELLOW}Stopping existing Agent-Teams services (own PIDs only)...${NC}"
stop_services
sleep 1

: > "$PID_FILE"

echo -e "\n${GREEN}Starting Council Server (port 3003)...${NC}"
node council-server.js > /tmp/council.log 2>&1 &
COUNCIL_PID=$!
echo "council-server $COUNCIL_PID" >> "$PID_FILE"
echo "   Council PID: $COUNCIL_PID"
sleep 3

echo -e "\n${GREEN}Starting Full Council API + MCP (port 3001)...${NC}"
PORT=3001 node council-api-server.cjs > /tmp/council-api.log 2>&1 &
API_PID=$!
echo "council-api $API_PID" >> "$PID_FILE"
echo "   API PID: $API_PID"
sleep 2

echo -e "\n${GREEN}Starting Hive WebUI (port 3131)...${NC}"
PORT=3131 COUNCIL_PORT=3001 node webui/server.js > /tmp/webui.log 2>&1 &
WEBUI_PID=$!
echo "webui $WEBUI_PID" >> "$PID_FILE"
echo "   WebUI PID: $WEBUI_PID"
sleep 2

echo -e "\n"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              ✅ Agent-Teams v2.2.0 Started!                   ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Service              Port   PID    URL                       ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
printf "║  Council Server       3003   %-5s  localhost:3003            ║\n" "$COUNCIL_PID"
printf "║  Council API+MCP      3001   %-5s  localhost:3001            ║\n" "$API_PID"
printf "║  Hive WebUI           3131   %-5s  localhost:3131            ║\n" "$WEBUI_PID"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  MCP Tools:           /mcp   (JSON-RPC, on port 3001)       ║"
echo "║  CLI:                 ./council-cli.js                      ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  WebUI:               http://localhost:3131                 ║"
echo "║  Council UI:          http://localhost:3131/council         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Logs: /tmp/council.log, /tmp/council-api.log, /tmp/webui.log"
echo "📝 PIDs: $PID_FILE"
echo ""
echo "Quick Commands:"
echo "  npm run council:status    # Check Council"
echo "  npm run council:test      # Test LLM"
echo "  npm run council:mcp-tools # List MCP tools"
echo "  node council-cli.js       # CLI interface"
echo ""
echo "Stop: ./start-all.sh stop   # kills only PIDs in $PID_FILE"
