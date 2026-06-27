#!/bin/bash
# mesh-chat.sh — Multi-round agent communication via mesh
# Usage: ./mesh-chat.sh <room> <agent_count>

MESH_URL="http://localhost:4000"
API_KEY="openclaw-mesh-default-key"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🌐 AGENT MESH — MULTI-ROUND COMMUNICATION               ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

show_help() {
    echo "  Usage: ./mesh-chat.sh <room> <agent_count>"
    echo ""
    echo "  Multi-round communication for long-running tasks."
    echo "  Agents maintain context across multiple message exchanges."
    echo ""
    echo "  Examples:"
    echo "    ./mesh-chat.sh research 3      # 3 agents in research room"
    echo "    ./mesh-chat.sh build 5        # 5 agents in build room"
    echo ""
}

# Start a multi-round chat room
start_room() {
    local room="$1"
    local count="${2:-3}"
    
    echo ""
    echo "  Starting room: $room with $count agents"
    echo ""
    
    echo "  Architecture:"
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │                     AGENT MESH                            │"
    echo "  │                                                          │"
    echo "  │   ┌─────────┐     ┌─────────┐     ┌─────────┐           │"
    echo "  │   │ AGENT 1 │◄────│  ROOM   │────►│ AGENT 2 │           │"
    echo "  │   │ (round) │     │  $room   │     │ (round) │           │"
    echo "  │   └────┬────►     └────┬────┘     └────┬────►           │"
    echo "  │        │               │               │                  │"
    echo "  │        └───────────────┼───────────────┘                  │"
    echo "  │                        │                                  │"
    echo "  │                   ┌────▼────┐                             │"
    echo "  │                   │ SHARED  │                             │"
    echo "  │                   │ CONTEXT │  ← Long-running memory     │"
    echo "  │                   └─────────┘                             │"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    
    echo "  Multi-round pattern:"
    echo "  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐"
    echo "  │ROUND 1 │───►│ROUND 2 │───►│ROUND 3 │───►│ROUND N │"
    echo "  └────────┘    └────────┘    └────────┘    └────────┘"
    echo "       │              │              │              │"
    echo "       ▼              ▼              ▼              ▼"
    echo "  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐"
    echo "  │Context  │    │Context  │    │Context  │    │Context  │"
    echo "  │ Grows   │    │ Grows   │    │ Grows   │    │ Complete│"
    echo "  └─────────┘    └─────────┘    └─────────┘    └─────────┘"
    echo ""
    
    echo "  Key benefits:"
    echo "  ✅ Context preserved across rounds"
    echo "  ✅ Agents build on each other's work"
    echo "  ✅ No token limits from context window"
    echo "  ✅ Failure recovery mid-task"
    echo ""
}

# Send message round
send_round() {
    local room="$1"
    local from="$2"
    local message="$3"
    
    echo "  [$from] → $room: $message"
    
    # In real implementation, this posts to mesh API
    # curl -X POST "$MESH_URL/api/messages" \
    #   -H "X-API-Key: $API_KEY" \
    #   -d "{\"room\": \"$room\", \"from\": \"$from\", \"message\": \"$message\"}"
}

# Poll for responses
poll_room() {
    local room="$1"
    
    echo "  Polling $room for responses..."
    # curl -s "$MESH_URL/api/rooms/$room/messages" \
    #   -H "X-API-Key: $API_KEY"
}

case "$1" in
    -h|--help|"") show_help ;;
    *)
        start_room "$1" "$2"
        ;;
esac