#!/bin/bash
# live-coord.sh — Real-time agent coordination on mesh
# Usage: ./live-coord.sh <mode>

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🌐 LIVE AGENT COORDINATION — v${VERSION}                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

show_help() {
    echo "  Usage: ./live-coord.sh <mode>"
    echo ""
    echo "  Modes:"
    echo "    start       Start coordination room"
    echo "    join        Join existing room"
    echo "    broadcast   Send broadcast to room"
    echo "    poll        Poll inbox for messages"
    echo "    status      Show mesh status"
    echo ""
}

# Check mesh health
check_mesh() {
    echo "  Checking mesh..."
    curl -s http://localhost:4000/api/agents \
      -H "X-API-Key: openclaw-mesh-default-key" | jq '. | length' 2>/dev/null
    echo "  agents online"
    echo ""
}

# Start coordination
start_coord() {
    local room="${1:-coordination}"
    
    echo "  Starting coordination room: $room"
    echo ""
    
    echo "  Architecture:"
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │                     LIVE MESH                             │"
    echo "  │                                                          │"
    echo "  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │"
    echo "  │  │ AGENT A │  │ AGENT B │  │ AGENT C │               │"
    echo "  │  │ (sends) │◄►│(receives)│◄►│(receives)│               │"
    echo "  │  └────┬─────┘  └────┬─────┘  └────┬─────┘               │"
    echo "  │       │             │             │                      │"
    echo "  │       └─────────────┼─────────────┘                      │"
    echo "  │                     │                                    │"
    echo "  │              ┌──────▼──────┐                             │"
    echo "  │              │  COORD ROOM │  ← Real-time sync          │"
    echo "  │              │   $room    │                             │"
    echo "  │              └────────────┘                              │"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    
    echo "  Agents in this room:"
    echo "  - Use WebSocket for live messaging"
    echo "  - Poll inbox every 5 seconds"
    echo "  - Heartbeat every 30 seconds"
    echo ""
    
    # Example: Start node process for live coordination
    echo "  To start live coordinator:"
    echo "  node scripts/live-messenger.js coordinator-$room --demo"
    echo ""
}

# Join coordination room
join_coord() {
    local room="${1:-coordination}"
    
    echo "  Joining coordination room: $room"
    echo ""
    
    # Register with mesh
    AGENT_ID=$(curl -s -X POST http://localhost:4000/api/agents/register \
      -H "Content-Type: application/json" \
      -H "X-API-Key: openclaw-mesh-default-key" \
      -d "{\"name\": \"agent-$(date +%s)\", \"version\": \"$VERSION\", \"room\": \"$room\", \"capabilities\": [\"coordination\", \"messaging\"]}" \
      | jq -r '.agentId')
    
    echo "  Joined as: $AGENT_ID"
    echo "  Room: $room"
    echo ""
    
    echo "  Waiting for tasks..."
    echo ""
    
    # Poll loop
    while true; do
        MESSAGES=$(curl -s "http://localhost:4000/api/agents/$AGENT_ID/inbox" \
          -H "X-API-Key: openclaw-mesh-default-key")
        
        COUNT=$(echo "$MESSAGES" | jq 'length' 2>/dev/null)
        
        if [ "$COUNT" -gt 0 ] 2>/dev/null; then
            echo "  📬 $COUNT new messages!"
            echo "$MESSAGES" | jq -r '.[] | "  From: \(.from), Content: \(.content)"'
        fi
        
        sleep 5
    done
}

# Send broadcast
broadcast_msg() {
    local room="${1:-coordination}"
    shift
    local msg="$*"
    
    echo "  Broadcasting to $room: $msg"
    echo ""
    
    # Get agent ID
    curl -s -X POST http://localhost:4000/api/messages \
      -H "Content-Type: application/json" \
      -H "X-API-Key: openclaw-mesh-default-key" \
      -d "{\"type\": \"broadcast\", \"room\": \"$room\", \"content\": \"$msg\", \"version\": \"$VERSION\"}" \
      | jq '.'
}

# Poll inbox
poll_inbox() {
    local agent_id="${1:-}"
    
    if [ -z "$agent_id" ]; then
        echo "  Error: Need agent ID"
        return
    fi
    
    echo "  Polling inbox for $agent_id..."
    echo ""
    
    curl -s "http://localhost:4000/api/agents/$agent_id/inbox" \
      -H "X-API-Key: openclaw-mesh-default-key" | jq '.'
}

# Show mesh status
show_status() {
    echo "  🌐 Mesh Status"
    echo "  ════════════════════════════════════════"
    echo ""
    
    echo "  Server: http://localhost:4000"
    echo ""
    
    echo "  Registered Agents:"
    curl -s http://localhost:4000/api/agents \
      -H "X-API-Key: openclaw-mesh-default-key" | jq -r '.[] | "  - \(.name) (\(.status || "unknown"))"'
    
    echo ""
    echo "  Recent Messages:"
    curl -s http://localhost:4000/api/messages \
      -H "X-API-Key: openclaw-mesh-default-key" | jq -r '.[0:5] | .[] | "  \(.from) → \(.to || "broadcast"): \(.content[0:50])..."'
    
    echo ""
}

case "$1" in
    -h|--help|"") show_help ;;
    start) start_coord "$2" ;;
    join) join_coord "$2" ;;
    broadcast) broadcast_msg "${@:2}" ;;
    poll) poll_inbox "$2" ;;
    status) show_status ;;
    *)
        echo "  ${RED}✗ Unknown mode: $1${NC}"
        echo ""
        show_help
        ;;
esac