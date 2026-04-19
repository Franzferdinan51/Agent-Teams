#!/bin/bash
# spawn-swarm.sh — Spawn Swarm Coding deliberation for complex builds
# Usage: ./spawn-swarm.sh <project-description>

COUNCIL_URL="${COUNCIL_URL:-http://localhost:3003}"

PROJECT="$1"

if [ -z "$PROJECT" ]; then
    echo "AI Council Swarm Coding Deliberation"
    echo ""
    echo "Usage: $0 <project-description>"
    echo ""
    echo "Example: $0 \"Build a REST API for a task manager\""
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "              🐝 SWARM CODING DELIBERATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Project: $PROJECT"
echo "  Mode:   swarm_coding"
echo ""

# Start swarm coding deliberation
PAYLOAD="{\"topic\": \"$PROJECT\", \"mode\": \"swarm_coding\"}"

echo "Starting swarm coding council..."
RESPONSE=$(curl -s -X POST "$COUNCIL_URL/api/session" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

SESSION_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id',''))" 2>/dev/null)

if [ -n "$SESSION_ID" ]; then
    echo ""
    echo "───────────────────────────────────────────────────────────────"
    echo "  Swarm Coding session: $SESSION_ID"
    echo ""
    echo "  The council will discuss:"
    echo "  - Architecture (Architect)"
    echo "  - Backend (Backend Dev)"
    echo "  - Frontend (Frontend Dev)"
    echo "  - DevOps (DevOps)"
    echo "  - Security (Security Expert)"
    echo "  - Testing (QA Engineer)"
    echo ""
    echo "  Poll for results:"
    echo "  curl $COUNCIL_URL/api/session/$SESSION_ID"
fi
echo ""
