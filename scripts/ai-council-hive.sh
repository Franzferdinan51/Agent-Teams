#!/bin/bash
# ai-council-hive.sh — Connect AI Council to the Hive Mind
# Usage: ./ai-council-hive.sh [council-url]

VERSION="1.0.0"
COUNCIL_URL="${1:-http://localhost:3003}"
MESH_URL="${MESH_URL:-http://localhost:4000}"
API_KEY="${MESH_KEY:-openclaw-mesh-default-key}"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🏛️ AI COUNCIL HIVE CONNECTOR — v${VERSION}                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

echo "  🏛️ Connecting AI Council to Hive Mind..."
echo "  AI Council URL: $COUNCIL_URL"
echo "  Mesh URL: $MESH_URL"
echo ""

# Check AI Council is running
if curl -s -f "$COUNCIL_URL" > /dev/null 2>&1; then
    echo "  ✅ AI Council is running at $COUNCIL_URL"
else
    echo "  ⚠️  AI Council not responding at $COUNCIL_URL"
    echo "     Make sure AI Council is running first!"
    echo ""
fi

# Register AI Council with mesh
echo "  Registering AI Council with mesh..."
RESPONSE=$(curl -s -X POST "$MESH_URL/api/agents/register" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "ai-council",
    "version": "3.1.0",
    "type": "council",
    "agentId": "ai-council-chamber",
    "capabilities": ["deliberation", "decision-making", "adversarial", "vision", "swarm-coding", "45-councilors"],
    "endpoint": "'"$COUNCIL_URL"'",
    "hive": true,
    "mesh": true
  }')

echo "  Response: $RESPONSE"
echo ""

# Register AI Council components
COMPONENTS=(
    "ai-council-core:Core deliberation engine"
    "ai-council-45:45 specialized councilors"
    "ai-council-mcp:MCP server for tools"
    "ai-council-vision:Vision council for images"
    "ai-council-swarm:Swarm coding workflow"
)

echo "  Registering AI Council components..."
for component in "${COMPONENTS[@]}"; do
    IFS=':' read -r name caps <<< "$component"
    
    curl -s -X POST "$MESH_URL/api/agents/register" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"name\": \"$name\",
        \"version\": \"$VERSION\",
        \"type\": \"council-component\",
        \"capabilities\": [\"$caps\"],
        \"hive\": true
      }" > /dev/null
    
    echo "    ✅ $name"
done

echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "  🏛️ AI Council is now part of the Hive Mind!"
echo "══════════════════════════════════════════════════════════════════"
echo ""

# Show all connected
echo "  Connected to hive:"
curl -s "$MESH_URL/api/agents" \
  -H "X-API-Key: $API_KEY" | jq -r '.[] | "  - " + .name + " (" + (.type // "agent") + ")"' 2>/dev/null

echo ""
echo "  🏛️ AI Council can now:"
echo "  ✅ Deliberate with Duck CLI tasks"
echo "  ✅ Provide vision analysis to CannaAI"
echo "  ✅ Swarm code with AgentTeams"
echo "  ✅ Vote on consensus via Consensus Engine"
echo "  ✅ Use 45 councilors for complex decisions"
echo ""