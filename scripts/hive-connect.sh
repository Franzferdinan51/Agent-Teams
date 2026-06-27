#!/bin/bash
# hive-connect.sh — Connect any system to the Agent Mesh hive mind
# Usage: ./hive-connect.sh <system-name> [capabilities...]

VERSION="1.0.0"
MESH_URL="${MESH_URL:-http://localhost:4000}"
API_KEY="${MESH_KEY:-openclaw-mesh-default-key}"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🧠 HIVE MIND CONNECTOR — AgentTeams v${VERSION}          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

SYSTEM_NAME="${1:-unknown}"
shift
CAPABILITIES="${*:-messaging,coordination}"

echo "  Connecting to hive mind..."
echo "  System: $SYSTEM_NAME"
echo "  Mesh: $MESH_URL"
echo "  Capabilities: $CAPABILITIES"
echo ""

# Generate system-specific agent ID
AGENT_ID="hive-${SYSTEM_NAME}-$(date +%s)"
SYSTEM_VERSION="1.0.0"

# Register with mesh
echo "  Registering $SYSTEM_NAME with mesh..."
RESPONSE=$(curl -s -X POST "$MESH_URL/api/agents/register" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"name\": \"$SYSTEM_NAME\",
    \"version\": \"$SYSTEM_VERSION\",
    \"agentId\": \"$AGENT_ID\",
    \"type\": \"system\",
    \"capabilities\": [\"$CAPABILITIES\"],
    \"mesh\": true,
    \"hive\": true
  }")

echo "  Response: $RESPONSE"
echo ""

# Get all connected systems
echo "  🧠 Hive Mind Status:"
echo "  ══════════════════════════════════════"
curl -s "$MESH_URL/api/agents" \
  -H "X-API-Key: $API_KEY" | jq -r '.[] | "  - \(.name) (\(.type || "agent")) — \(.status || "unknown")"'

echo ""

# Broadcast arrival
curl -s -X POST "$MESH_URL/api/messages" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"type\": \"hive_announce\",
    \"from\": \"$SYSTEM_NAME\",
    \"content\": \"🌐 $SYSTEM_NAME connected to hive mind\",
    \"capabilities\": [\"$CAPABILITIES\"]
  }" > /dev/null

echo "  ✅ $SYSTEM_NAME is now part of the hive mind!"
echo ""

# Show connection info
echo "  Connection Info:"
echo "  ┌─────────────────────────────────────────────────────────┐"
echo "  │  System: $SYSTEM_NAME"
echo "  │  Agent ID: $AGENT_ID"
echo "  │  Mesh: $MESH_URL"
echo "  │  WebSocket: ws://localhost:4000/ws"
echo "  │  API Key: $API_KEY"
echo "  └─────────────────────────────────────────────────────────┘"
echo ""

# Show how to communicate
echo "  To send messages through hive:"
echo "  curl -X POST $MESH_URL/api/messages -H 'X-API-Key: $API_KEY' -d '{...}'"
echo ""

# Show connected systems
echo "  Connected Systems:"
curl -s "$MESH_URL/api/agents" \
  -H "X-API-Key: $API_KEY" | jq -r '.[] | "  - \(.name)"' | sort | uniq