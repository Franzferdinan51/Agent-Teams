#!/bin/bash
# meta-learnings.sh — Show meta-agent learnings
# Usage: ./meta-learnings.sh

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "              🧠 META-AGENT LEARNINGS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

MEMORY_DIR="$HOME/Desktop/AgentTeam/workspace/memory"

if [ ! -d "$MEMORY_DIR" ]; then
    echo "  No memory directory found."
    echo "  Run some tasks first with meta-run.sh"
    exit 0
fi

echo "  📚 Past Learnings:"
echo ""

# Find all meta plan files
LEARNINGS=$(find "$MEMORY_DIR" -name "meta-plan-*.md" 2>/dev/null | sort -r | head -10)

if [ -z "$LEARNINGS" ]; then
    echo "  No learnings yet. Run ./meta-run.sh to complete tasks."
else
    count=0
    for file in $LEARNINGS; do
        if [ -f "$file" ]; then
            count=$((count + 1))
            echo "  ─────────────────────────────────"
            echo "  📄 $(basename "$file")"
            echo ""
            grep -E "^(## |Task:|Duration:|Result:)" "$file" 2>/dev/null | head -5
            echo ""
        fi
    done
    echo "  ═════════════════════════════════════"
    echo "  Total learnings: $count"
fi

echo ""
echo "  💡 To clear learnings:"
echo "     rm $MEMORY_DIR/meta-plan-*.md"
echo ""
