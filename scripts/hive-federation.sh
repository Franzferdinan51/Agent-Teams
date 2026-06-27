#!/bin/bash
# hive-federation.sh — Connect to the AgentTeams Federation

VERSION="1.0.0"
PORT="${1:-4200}"
MODE="${2:-}"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🏠 HIVE FEDERATION — Cross-Federation Mesh v${VERSION}    ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

case "$MODE" in
    start|relay)
        FED_NAME="${3:-My Federation}"
        FED_DESC="${4:-}"
        echo "  🏠 Starting federation: $FED_NAME"
        echo "  Description: $FED_DESC"
        echo ""
        echo "  Port: $PORT"
        echo "  Federation ID will be displayed on start"
        echo ""
        node scripts/hive-federation.js start "$FED_NAME" "$FED_DESC"
        ;;
    
    info)
        echo "  📋 Federation info:"
        curl -s http://localhost:$PORT/federation/info 2>/dev/null | jq '.' || echo "  Federation not running on port $PORT"
        ;;
    
    discover)
        echo "  🔍 Discovering federations..."
        curl -s http://localhost:$PORT/federation/discover 2>/dev/null | jq '.' || echo "  Federation not running"
        ;;
    
    councilors)
        echo "  🏛️ Shared councilors:"
        curl -s http://localhost:$PORT/federation/councilors 2>/dev/null | jq '.' || echo "  Federation not running"
        ;;
    
    capabilities)
        echo "  📤 Shared capabilities:"
        curl -s http://localhost:$PORT/federation/capabilities 2>/dev/null | jq '.' || echo "  Federation not running"
        ;;
    
    peers)
        echo "  👥 Connected federations:"
        curl -s http://localhost:$PORT/federation/discover 2>/dev/null | jq '. | length' 2>/dev/null || echo "  0 federations"
        curl -s http://localhost:$PORT/federation/discover 2>/dev/null | jq '.[] | .federationName' 2>/dev/null
        ;;
    
    *)
        echo "Usage: $0 [port] [mode] [args...]"
        echo ""
        echo "Modes:"
        echo "  start [name] [desc]   Start federation (optionally named)"
        echo "  info                   Show federation info"
        echo "  discover               Find other federations"
        echo "  councilors             List shared councilors"
        echo "  capabilities           List shared capabilities"
        echo "  peers                  Show connected federations"
        echo ""
        echo "Examples:"
        echo "  $0 4200 start 'My AI Lab' 'Research focused'"
        echo "  $0 4200 discover"
        echo "  $0 4200 info"
        ;;
esac