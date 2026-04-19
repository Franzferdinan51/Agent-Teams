#!/bin/bash
# openclaw-hive.sh — Connect OpenClaw to the AgentTeams hive mind
# Usage: ./openclaw-hive.sh [openclaw-url]

VERSION="1.0.0"
OPENCLAW_URL="${1:-http://localhost:18789}"
MESH_URL="${MESH_URL:-http://localhost:4000}"
API_KEY="${MESH_KEY:-openclaw-mesh-default-key}"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🦞 OPENCLAW HIVE CONNECTOR — v${VERSION}                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

echo "  🦞 Connecting OpenClaw to AgentTeams Hive Mind..."
echo "  OpenClaw URL: $OPENCLAW_URL"
echo "  Mesh URL: $MESH_URL"
echo ""

# Check OpenClaw is running
if curl -s -f "$OPENCLAW_URL" > /dev/null 2>&1; then
    echo "  ✅ OpenClaw is running at $OPENCLAW_URL"
else
    echo "  ⚠️  OpenClaw not responding at $OPENCLAW_URL"
    echo "     Make sure OpenClaw is running first!"
    echo ""
fi

# Register OpenClaw with mesh
echo "  Registering OpenClaw with mesh..."
RESPONSE=$(curl -s -X POST "$MESH_URL/api/agents/register" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "openclaw",
    "version": "2026.4.19",
    "type": "framework",
    "agentId": "openclaw-gateway",
    "capabilities": ["agent-framework", "memory", "skills", "channels", "mcp", "acp"],
    "endpoint": "'"$OPENCLAW_URL"'",
    "hive": true,
    "mesh": true
  }')

echo "  Response: $RESPONSE"
echo ""

# Register OpenClaw sub-components
COMPONENTS=(
    "openclaw-gateway:Gateway,orchestration,agent-management"
    "openclaw-memory:Memory-system,MEMORY.md,daily-notes,dreaming"
    "openclaw-skills:Skill-system,auto-loading,clawhub"
    "openclaw-channels:Multi-channel,Telegram,Discord,WhatsApp"
    "openclaw-mcp:MCP-server,tools,protocol"
    "openclaw-acp:ACP-server,agent-protocol"
)

echo "  Registering OpenClaw components..."
for component in "${COMPONENTS[@]}"; do
    IFS=':' read -r name caps <<< "$component"
    
    curl -s -X POST "$MESH_URL/api/agents/register" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"name\": \"$name\",
        \"version\": \"$VERSION\",
        \"type\": \"openclaw-component\",
        \"capabilities\": [\"$caps\"],
        \"hive\": true
      }" > /dev/null
    
    echo "    ✅ $name"
done

echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "  🦞 OpenClaw is now part of the Hive Mind!"
echo "══════════════════════════════════════════════════════════════════"
echo ""

# Show all connected
echo "  Connected to hive:"
curl -s "$MESH_URL/api/agents" \
  -H "X-API-Key: $API_KEY" | jq -r '.[] | "  - " + .name + " (" + (.type // "agent") + ")"' 2>/dev/null

echo ""
echo "  OpenClaw can now:"
echo "  ✅ Coordinate with Duck CLI via mesh"
echo "  ✅ Share memory with AI Council"
echo "  ✅ Send status to Dashboard"
echo "  ✅ Use AgentTeams skills and micro-agents"
echo "  ✅ Broadcast to all hive systems"
echo ""