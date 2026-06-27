#!/bin/bash
# hive-p2p.sh — Connect to the decentralized P2P mesh

VERSION="1.0.0"
PORT="${1:-4100}"
MODE="${2:-peer}"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🕸️ HIVE MESH P2P — Decentralized Mesh v${VERSION}      ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

case "$MODE" in
    relay)
        echo "  🛰️ Starting as RELAY node (helps other peers connect)"
        echo "  Port: $PORT"
        echo "  Relay Port: $((PORT + 1))"
        echo ""
        echo "  Other nodes can connect to this relay to join the mesh!"
        echo ""
        node scripts/hive-mesh-p2p.js relay $PORT
        ;;
    
    peer)
        echo "  🕸️ Starting as PEER node"
        echo "  Port: $PORT"
        echo ""
        echo "  Peer will:"
        echo "  - Discover other peers on the network"
        echo "  - Connect to relays for peer discovery"
        echo "  - Broadcast and receive messages"
        echo "  - Route messages through the mesh"
        echo ""
        node scripts/hive-mesh-p2p.js peer $PORT
        ;;
    
    status)
        echo "  📊 Checking mesh status..."
        curl -s http://localhost:$PORT/ping 2>/dev/null | jq '.' || echo "  Node not running on port $PORT"
        ;;
    
    peers)
        echo "  👥 Known peers:"
        curl -s http://localhost:$PORT/peer/discover 2>/dev/null | jq '.peers' || echo "  Node not running"
        ;;
    
    broadcast)
        shift
        shift
        shift
        MESSAGE="$*"
        if [ -z "$MESSAGE" ]; then
            echo "  Usage: ./hive-p2p.sh broadcast <message>"
            exit 1
        fi
        echo "  📢 Broadcasting: $MESSAGE"
        curl -s -X POST http://localhost:$PORT/message/broadcast \
          -H "Content-Type: application/json" \
          -d "{\"type\":\"broadcast\",\"content\":\"$MESSAGE\",\"ttl\":3}" | jq '.'
        ;;
    
    history)
        echo "  📜 Message history:"
        curl -s http://localhost:$PORT/message/history 2>/dev/null | jq '.' || echo "  Node not running"
        ;;
    
    *)
        echo "Usage: $0 [port] [mode] [command]"
        echo ""
        echo "Modes:"
        echo "  relay        Start as relay server (helps peers connect)"
        echo "  peer         Start as peer node (default)"
        echo ""
        echo "Commands:"
        echo "  status       Check node status"
        echo "  peers        List known peers"
        echo "  broadcast    Broadcast message to mesh"
        echo "  history      Show message history"
        echo ""
        echo "Examples:"
        echo "  $0 4100 relay        Start relay on port 4100"
        echo "  $0 4100 peer         Start peer on port 4100"
        echo "  $0 4100 broadcast 'Hello mesh!'  Broadcast message"
        echo "  $0 4100 status      Check status"
        ;;
esac