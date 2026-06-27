#!/bin/bash
# meta-plan.sh — Preview meta-agent execution plan
# Usage: ./meta-plan.sh <task>

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "              🧠 META-AGENT PLANNER"
echo "═══════════════════════════════════════════════════════════════"
echo ""

TASK="$1"

if [ -z "$TASK" ]; then
    echo "Usage: $0 <task>"
    echo ""
    echo "Preview what the meta-agent would do for a complex task."
    echo "Shows: complexity score, plan steps, estimated approach."
    echo ""
    exit 1
fi

echo "  Task: $TASK"
echo ""
echo "  Analyzing complexity..."
echo ""

# Simple complexity estimation
COMPLEXITY=5
case ${#TASK} in
    0) COMPLEXITY=1 ;;
    [1-50]) COMPLEXITY=2 ;;
    [51-100]) COMPLEXITY=3 ;;
    [101-200]) COMPLEXITY=4 ;;
    *) COMPLEXITY=6 ;;
esac

# Keywords that increase complexity
echo "$TASK" | grep -qiE "build|create|design|implement|complex|multiple" && COMPLEXITY=$((COMPLEXITY + 1))
echo "$TASK" | grep -qiE "api|database|system|architecture" && COMPLEXITY=$((COMPLEXITY + 1))
echo "$TASK" | grep -qiE "research|analyze|compare" && COMPLEXITY=$((COMPLEXITY + 1))

# Cap at 10
if [ $COMPLEXITY -gt 10 ]; then COMPLEXITY=10; fi

echo "  📊 Complexity Score: $COMPLEXITY/10"
echo ""

case $COMPLEXITY in
    1|2|3)
        echo "  🎯 Route: Fast Path"
        echo "     Direct execution, no planning needed"
        ;;
    4|5|6)
        echo "  🎯 Route: Multi-Step"
        echo "     Execute with best model"
        echo "     Optional AI Council deliberation"
        ;;
    7|8|9|10)
        echo "  🎯 Route: Full Meta-Agent Cycle"
        echo "     Plan → Execute → Critic → Heal → Learn"
        ;;
esac

echo ""
echo "  📋 ESTIMATED PLAN:"
echo ""

# Generate plan based on task
echo "     1. Understand requirements"
echo "     2. Research / gather context"
echo "     3. Design approach"
echo "     4. Implement solution"
echo "     5. Test and verify"
echo "     6. Review and refine"

if [ $COMPLEXITY -ge 7 ]; then
    echo "     7. Critique execution"
    echo "     8. Heal any failures"
    echo "     9. Learn from execution"
fi

echo ""
echo "  ⏱️  Estimated Time: $((COMPLEXITY * 2)) minutes"
echo ""
echo "  🛠️  Tools Needed:"
echo "     - Web search (research)"
echo "     - Code execution (build)"
echo "     - File I/O (save results)"

if [ $COMPLEXITY -ge 7 ]; then
    echo "     - AI Council (deliberation)"
    echo "     - Sub-agents (parallel work)"
fi

echo ""
echo "───────────────────────────────────────────────────────────────"
echo ""

if [ $COMPLEXITY -ge 7 ]; then
    echo "  ⚡ Recommend running full meta-agent: ./meta-run.sh \"$TASK\""
else
    echo "  ⚡ Recommend running directly: ./team-task.sh add \"$TASK\" coder"
fi

echo ""
