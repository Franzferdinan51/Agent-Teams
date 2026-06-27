#!/bin/bash
# hive-senate-pro.sh — Advanced Senate Features

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🏛️ HIVE SENATE PRO — Advanced Features v${VERSION}       ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$2" ]; then
    echo "📋 Commands:"
    echo ""
    echo "  📜 BILLS"
    echo "     $0 bill <title>              Introduce new bill"
    echo "     $0 bills                      List all bills"
    echo "     $0 advance <id> <step>         Advance bill"
    echo "     $0 cosponsor <id> <name>      Add cosponsor"
    echo "     $0 amend <id> <senator> <txt> Propose amendment"
    echo ""
    echo "  🔔 HEARINGS"
    echo "     $0 hearing <committee> <topic> [type]  Hold hearing"
    echo "     $0 testimony <id> <text>       Witness testimony"
    echo "     $0 question <id> <senator> <q> Senator questions"
    echo ""
    echo "  🏛️ FLOOR DEBATE"
    echo "     $0 session <topic>            Start floor session"
    echo "     $0 speak <id> <senator> <pro|con> <speech>  Speech"
    echo "     $0 close <id>                 Close session"
    echo ""
    echo "  👤 PROFILES"
    echo "     $0 profile <senator>          View senator profile"
    echo "     $0 leadership                 View party leadership"
    echo "     $0 constit <senator>           View constituency"
    echo ""
    echo "  ⚡ VETO"
    echo "     $0 veto <billId> <reason>     Presidential veto"
    echo "     $0 override <billId> <votes>   Override vote"
    echo ""
    echo "  🏛️ COMMITTEE"
    echo "     $0 committee <name> <topic> [type]  Committee hearing"
    echo ""
    exit 0
fi

CMD="$1"
shift

case "$CMD" in
    bill|bills)
        node scripts/hive-senate-pro.js "$CMD" "$@"
        ;;
    advance|cosponsor|amend)
        node scripts/hive-senate-pro.js "$CMD" "$@"
        ;;
    hearing|testimony|question)
        node scripts/hive-senate-pro.js "$CMD" "$@"
        ;;
    session|speak|close)
        node scripts/hive-senate-pro.js "$CMD" "$@"
        ;;
    profile|leadership|constit)
        node scripts/hive-senate-pro.js "$CMD" "$@"
        ;;
    veto|override)
        node scripts/hive-senate-pro.js "$CMD" "$@"
        ;;
    committee)
        node scripts/hive-senate-pro.js committee "$@"
        ;;
    *)
        node scripts/hive-senate-pro.js help
        ;;
esac
