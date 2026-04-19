#!/bin/bash
# start-all.sh - Start all Agent-Teams services

set -a && source ~/.openclaw/workspace/.env && set +a

echo "🚀 Starting Agent-Teams v2.1.0"
echo "================================"

# Start Council (port 3007)
echo -e "\n📋 Starting Council Server (port 3007)..."
cd ~/Desktop/AgentTeam-GitHub
MINIMAX_API_KEY="$MINIMAX_API_KEY" \
LMSTUDIO_KEY="$LMSTUDIO_KEY" \
LMSTUDIO_URL="$LMSTUDIO_URL" \
OPENROUTER_API_KEY="$OPENROUTER_API_KEY" \
node council-server.js > /tmp/council-merged.log 2>&1 &

sleep 2

# Start WebUI (port 3131)
echo -e "\n🌐 Starting WebUI Server (port 3131)..."
node webui/server.js > /tmp/webui-merged.log 2>&1 &

sleep 3

echo -e "\n✅ All Services Started!"
echo "========================"
echo "   Council: http://localhost:3007"
echo "   WebUI:   http://localhost:3131"
echo ""
echo "📊 Check status:"
echo "   npm run start:council -- status"
echo "   npm run start:webui -- status"
echo ""
echo "📝 Logs:"
echo "   tail -f /tmp/council-merged.log"
echo "   tail -f /tmp/webui-merged.log"