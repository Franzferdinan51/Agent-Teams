#!/bin/bash
# start-council.sh — Launch AI Council server(s)
# Usage: ./start-council.sh [3003|3006|all]
# Defaults to 3003 if no argument

cd /data/data/com.termux/files/home/.openclaw/workspace/Agent-Teams

start_on_port() {
    local PORT=$1
    local PIDFILE="/tmp/council-$PORT.pid"
    
    if curl -s "http://localhost:$PORT/" | grep -q "ai-council"; then
        echo "✅ Council already running on port $PORT"
        return 0
    fi
    
    echo "Starting council on port $PORT..."
    COUNCIL_PORT=$PORT node council-server.js &
    echo $! > "$PIDFILE"
    sleep 1
    
    if curl -s "http://localhost:$PORT/" | grep -q "ai-council"; then
        echo "✅ Council running on port $PORT (PID: $(cat $PIDFILE))"
    else
        echo "❌ Failed to start council on port $PORT"
        rm -f "$PIDFILE"
    fi
}

case "$1" in
    3003) start_on_port 3003 ;;
    3006) start_on_port 3006 ;;
    all)  start_on_port 3003; start_on_port 3006 ;;
    "")   start_on_port 3003 ;;
    *)
        echo "Usage: $0 [3003|3006|all]"
        echo "  3003 — main council (AI deliberation)"
        echo "  3006 — workflow council (for hive-workflow.js)"
        echo "  all  — both ports"
        echo "  (no args) — 3003 only"
        ;;
esac
