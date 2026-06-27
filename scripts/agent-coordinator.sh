#!/bin/bash
# agent-coordinator.sh — Intelligent Sub-Agent Management

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🤖 AGENT COORDINATOR — Smart Sub-Agent Management     ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$2" ]; then
    echo "📋 Commands:"
    echo ""
    echo "  📊 STATUS & STATS"
    echo "     $0 status                Show coordinator status"
    echo "     $0 stats                  Show detailed statistics"
    echo "     $0 recs                  Get recommendations"
    echo ""
    echo "  🤖 AGENT MANAGEMENT"
    echo "     $0 spawn <type> <task>  Spawn single agent"
    echo "     $0 batch <count>         Spawn batchable tasks"
    echo "     $0 stress                 Stress test (20 rapid tasks)"
    echo ""
    echo "  📋 COORDINATION RULES"
    echo "     $0 rules                  Show task type rules"
    echo ""
    echo "⚙️  Configuration:"
    echo "    Max concurrent: ${MAX_CONCURRENT:-5}"
    echo "    Max per task: ${MAX_PER_TASK:-3}"
    echo "    Batch timeout: ${BATCH_TIMEOUT:-5000}ms"
    echo ""
    exit 0
fi

CMD="$1"
shift

case "$CMD" in
    status|stats)
        node scripts/agent-coordinator.js status
        ;;
    spawn)
        TYPE="$1"
        TASK="${@:2}"
        if [ -z "$TASK" ]; then
            echo "❌ Usage: $0 spawn <type> <task>"
            exit 1
        fi
        node scripts/agent-coordinator.js spawn "$TYPE" "$TASK"
        ;;
    batch)
        COUNT="${1:-5}"
        node scripts/agent-coordinator.js batch "$COUNT"
        ;;
    stress)
        node scripts/agent-coordinator.js stress
        ;;
    rules)
        node scripts/agent-coordinator.js rules
        ;;
    recs|recommendations)
        node scripts/agent-coordinator.js recs
        ;;
    *)
        echo "❓ Unknown: $CMD"
        ;;
esac
