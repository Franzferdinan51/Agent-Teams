#!/bin/bash
# spawn-council.sh — Spawn AI Council deliberation
# Usage: ./spawn-council.sh <topic> [mode] [councilors]

COUNCIL_URL="${COUNCIL_URL:-http://localhost:3003}"

TOPIC="$1"
MODE="${2:-standard}"
COUNCILORS="${3:-}"

if [ -z "$TOPIC" ]; then
    echo "AI Council Deliberation Spawner"
    echo ""
    echo "Usage: $0 <topic> [mode] [councilors]"
    echo ""
    echo "Modes: standard, socratic, adversarial, consensus, creative,"
    echo "       analytical, emergency, vision, swarm_coding, game_studio, strategic"
    echo ""
    echo "Example: $0 \"Should we use microservices?\" adversarial"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "              🤖 AI COUNCIL DELIBERATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Topic: $TOPIC"
echo "  Mode:  $MODE"
echo "  URL:   $COUNCIL_URL"
echo ""

# Build request payload
PAYLOAD="{\"topic\": \"$TOPIC\", \"mode\": \"$MODE\"}"
if [ -n "$COUNCILORS" ]; then
    PAYLOAD="{\"topic\": \"$TOPIC\", \"mode\": \"$MODE\", \"councilors\": [$COUNCILORS]}"
fi

# Start deliberation
echo "Starting deliberation..."
RESPONSE=$(curl -s -X POST "$COUNCIL_URL/api/session/start" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | head -30 || echo "$RESPONSE"

SESSION_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id',d.get('id','')))" 2>/dev/null)

if [ -n "$SESSION_ID" ]; then
    echo ""
    echo "───────────────────────────────────────────────────────────────"
    echo "  Session started successfully"
    echo ""
    echo "  Poll for status:"
    echo "  curl -s $COUNCIL_URL/api/session | jq"
    echo ""
    echo "  List councilors:"
    echo "  curl -s $COUNCIL_URL/api/councilors | jq"
    echo ""
    echo "  List modes:"
    echo "  curl -s $COUNCIL_URL/api/modes | jq"
else
    echo ""
    echo "⚠️  Council may not be running. Start with:"
    echo "  cd ~/.openclaw/workspace/ai-council-chamber"
    echo "  node api-server.cjs"
    echo ""
    echo "  Or check current session:"
    echo "  curl -s $COUNCIL_URL/api/session"
fi
echo ""
