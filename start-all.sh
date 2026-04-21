#!/bin/bash
# start-all.sh - Start ALL Agent-Teams v2.1.0 services
# Usage: ./start-all.sh

set -a && source ~/.openclaw/workspace/.env 2>/dev/null; set +a

echo "🚀 Starting Agent-Teams v2.1.0 (Full Stack)"
echo "============================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd ~/Desktop/AgentTeam-GitHub

# Kill existing services
echo -e "\n${YELLOW}Stopping existing services...${NC}"
pkill -f "council-server|webui/server|agent-api|agent-mesh-api|server.js" 2>/dev/null
sleep 2

# Set environment
export MINIMAX_API_KEY="${MINIMAX_API_KEY:-}"
export LMSTUDIO_KEY="${LMSTUDIO_KEY:-sk-lm-xWvfQHZF:L8P76SQakhEA95U8DDNf}"
export LMSTUDIO_URL="${LMSTUDIO_URL:-http://127.0.0.1:1234}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"

echo -e "\n${GREEN}Starting Council Server (port 3007)...${NC}"
MINIMAX_API_KEY="$MINIMAX_API_KEY" \
LMSTUDIO_KEY="$LMSTUDIO_KEY" \
LMSTUDIO_URL="$LMSTUDIO_URL" \
OPENROUTER_API_KEY="$OPENROUTER_API_KEY" \
node council-server.js > /tmp/council.log 2>&1 &
COUNCIL_PID=$!
echo "   Council PID: $COUNCIL_PID"

sleep 3

echo -e "\n${GREEN}Starting Agent Mesh API (port 4000)...${NC}"
cd ~/Desktop/AgentTeam-GitHub/agent-mesh-api
AGENT_MESH_API_KEY="${AGENT_MESH_API_KEY:-openclaw-mesh-default-key}" \
PORT=4000 \
node server.js > /tmp/mesh-api.log 2>&1 &
MESH_PID=$!
echo "   Mesh API PID: $MESH_PID"
sleep 3

cd ~/Desktop/AgentTeam-GitHub

echo -e "\n${GREEN}Starting Hive WebUI (port 3131)...${NC}"
node webui/server.js > /tmp/webui.log 2>&1 &
WEBUI_PID=$!
echo "   WebUI PID: $WEBUI_PID"

sleep 2

echo -e "\n${GREEN}Starting Full Council API + MCP (port 3001)...${NC}"
node council-api-server.cjs > /tmp/council-api.log 2>&1 &
API_PID=$!
echo "   API PID: $API_PID"

sleep 2

echo -e "\n"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║              ✅ Agent-Teams v2.1.0 Started!                ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Service              Port   PID    URL                     ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
printf "║  Council Server       3007   %-5s  localhost:3007           ║\n" "$COUNCIL_PID"
printf "║  Agent Mesh API       4000   %-5s  localhost:4000           ║\n" "$MESH_PID"
printf "║  Hive WebUI           3131   %-5s  localhost:3131          ║\n" "$WEBUI_PID"
printf "║  Council API+MCP      3001   %-5s  localhost:3001           ║\n" "$API_PID"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  MCP Tools:           /mcp   (JSON-RPC)                     ║"
echo "║  CLI:                 ./council-cli.js                      ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  WebUI:               http://localhost:3131                 ║"
echo "║  Mesh API:            http://localhost:4000                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Logs: /tmp/council.log, /tmp/mesh-api.log, /tmp/webui.log, /tmp/council-api.log"
echo ""
echo "Quick Commands:"
echo "  npm run council:status    # Check Council"
echo "  npm run council:test      # Test LLM"
echo "  npm run council:mcp-tools # List MCP tools"
echo "  node council-cli.js       # CLI interface"
echo ""
echo "Stop: pkill -f 'council-server|webui/server|agent-api|agent-mesh-api|server.js'"

# Save PIDs
echo "$COUNCIL_PID $MESH_PID $WEBUI_PID $API_PID" > /tmp/agent-teams.pids
