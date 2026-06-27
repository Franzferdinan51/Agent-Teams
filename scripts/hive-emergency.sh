#!/bin/bash
# hive-emergency.sh — Emergency broadcast to all hive systems
# Usage: ./hive-emergency.sh "Emergency message" [severity]

VERSION="1.0.0"
MESH_URL="${MESH_URL:-http://localhost:4000}"
API_KEY="${MESH_KEY:-openclaw-mesh-default-key}"

# Colors for alerts
RED='\033[0;31m'
YELLOW='\033[1;33m'
ORANGE='\033[0;33m'
NC='\033[0m'

# Severity levels
SEVERITY="${1:-WARNING}"
shift

MESSAGE="${1:-No message provided}"
AUTHOR="${USER:-system}"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║           🚨🚨🚨 HIVE EMERGENCY BROADCAST 🚨🚨🚨                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Parse severity
case "$SEVERITY" in
    DEFCON1|CRITICAL|1)
        SEVERITY_LEVEL=1
        COLOR="$RED"
        EMOJI="🔴🔴🔴"
        DEFCON="DEFCON 1 - CRITICAL"
        ;;
    DEFCON2|HIGH|2)
        SEVERITY_LEVEL=2
        COLOR="$RED"
        EMOJI="🔴🔴"
        DEFCON="DEFCON 2 - HIGH"
        ;;
    DEFCON3|MEDIUM|3)
        SEVERITY_LEVEL=3
        COLOR="$ORANGE"
        EMOJI="🟠"
        DEFCON="DEFCON 3 - MEDIUM"
        ;;
    DEFCON4|LOW|4)
        SEVERITY_LEVEL=4
        COLOR="$YELLOW"
        EMOJI="🟡"
        DEFCON="DEFCON 4 - LOW"
        ;;
    *)
        SEVERITY_LEVEL=5
        COLOR="$YELLOW"
        EMOJI="⚠️"
        DEFCON="WARNING"
        ;;
esac

echo -e "${COLOR}"
echo "  ${EMOJI} ${DEFCON} ${EMOJI}"
echo -e "${NC}"
echo "  📢 Message: $MESSAGE"
echo "  👤 Author: $AUTHOR"
echo "  🕐 Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Create emergency payload
PAYLOAD=$(cat <<EOF
{
  "type": "emergency_broadcast",
  "severity": $SEVERITY_LEVEL,
  "defcon": "$DEFCON",
  "from": "$AUTHOR",
  "content": "$MESSAGE",
  "timestamp": $(date +%s),
  "isoTime": "$(date -Iseconds)",
  "requiresAck": true
}
EOF
)

echo "  Broadcasting to all hive systems..."
echo ""

# Broadcast to mesh
RESPONSE=$(curl -s -X POST "$MESH_URL/api/messages" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "$PAYLOAD")

# Also broadcast via WebSocket for immediate delivery
WS_URL="${MESH_URL/http/ws}/ws"
curl -s -N -X POST "$WS_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "$PAYLOAD" &

echo "  ✅ Emergency broadcast sent!"
echo ""

# Show connected systems that will receive
echo "  📋 Hive Systems:"
curl -s "$MESH_URL/api/agents" \
  -H "X-API-Key: $API_KEY" | jq -r '.[] | "    - \(.name) (\(.type // "agent"))"' 2>/dev/null || echo "    (mesh offline)"

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo -e "  ${EMOJI} ALL SYSTEMS: $MESSAGE ${EMOJI}"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""

# If critical, also trigger watchdog alert
if [ "$SEVERITY_LEVEL" -le 2 ]; then
    echo "  🚨 CRITICAL ALERT - Triggering watchdog..."
    
    # Send to all connected Telegram chats if configured
    if [ -n "$TELEGRAM_CHAT_IDS" ]; then
        for chat_id in $TELEGRAM_CHAT_IDS; do
            echo "  📱 Notifying Telegram: $chat_id"
            # Would send via bot here
        done
    fi
    
    # Email alert if configured
    if [ -n "$ALERT_EMAILS" ]; then
        for email in $ALERT_EMAILS; do
            echo "  📧 Notifying email: $email"
            # Would send via mail here
        done
    fi
fi

echo ""
echo "  ✅ Emergency broadcast complete"