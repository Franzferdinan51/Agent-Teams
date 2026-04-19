#!/bin/bash
# hive-senate.sh — Enhanced Senate System

VERSION="2.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🏛️ HIVE SENATE 2.0 — Enhanced AI Council v${VERSION}    ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$2" ]; then
    echo "📋 Commands:"
    echo ""
    echo "  👥 SENATOR MANAGEMENT"
    echo "     $0 roster                 Show all 45 senators"
    echo "     $0 election               Hold senator elections"
    echo ""
    echo "  🏛️ COMMITTEES"
    echo "     $0 committee <topic>      Form committee for topic"
    echo "     $0 committees             List active committees"
    echo ""
    echo "  🗳️ CAUCUSES"
    echo "     $0 caucus <name> <party> Form caucus"
    echo "     $0 caucuses              List active caucuses"
    echo "     $0 bipartisan            Form bipartisan coalition"
    echo ""
    echo "  🗣️ FILIBUSTER"
    echo "     $0 filibuster <topic>    Start filibuster"
    echo "     $0 speech <text>         Add speech"
    echo "     $0 cloture               Invoke cloture"
    echo ""
    echo "  🗳️ VOTING"
    echo "     $0 vote <topic>          Simple majority vote"
    echo "     $0 brainstorm <topic>   Ideas (no criticism)"
    echo "     $0 debate <proposal>     Red vs Blue team"
    echo "     $0 minority <topic>      Minority report"
    echo ""
    echo "  🏛️ SPECIAL"
    echo "     $0 joint <topic>        Joint session (all senators)"
    echo ""
    exit 0
fi

CMD="$1"
shift

case "$CMD" in
    roster|senators)
        node scripts/hive-senate.js roster
        ;;
    election|elections)
        node scripts/hive-senate.js election
        ;;
    committee)
        node scripts/hive-senate.js committee "$@"
        ;;
    committees)
        node scripts/hive-senate.js committees
        ;;
    caucus)
        node scripts/hive-senate.js caucus "$@"
        ;;
    caucuses)
        node scripts/hive-senate.js caucuses
        ;;
    bipartisan|bipartisan-coalition)
        node scripts/hive-senate.js bipartisan
        ;;
    filibuster)
        node scripts/hive-senate.js filibuster "$@"
        ;;
    speech)
        node scripts/hive-senate.js speech "$@"
        ;;
    cloture)
        node scripts/hive-senate.js cloture
        ;;
    vote)
        node scripts/hive-senate.js vote "$@"
        ;;
    brainstorm|brainstorming)
        node scripts/hive-senate.js brainstorm "$@"
        ;;
    debate|adversarial)
        node scripts/hive-senate.js debate "$@"
        ;;
    minority)
        node scripts/hive-senate.js minority "$@"
        ;;
    joint|joint-session)
        node scripts/hive-senate.js joint "$@"
        ;;
    *)
        echo "❓ Unknown: $CMD"
        ;;
esac