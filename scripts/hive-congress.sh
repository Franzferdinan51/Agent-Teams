#!/bin/bash
# hive-congress.sh — Full Government Simulation

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🏛️ HIVE CONGRESS — Full Government v${VERSION}          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$2" ]; then
    echo "📋 Commands:"
    echo ""
    echo "  🏛️ GOVERNMENT STRUCTURE"
    echo "     $0 structure              View full government"
    echo ""
    echo "  📜 LEGISLATION"
    echo "     $0 bill <title>         Introduce bill (Senate)"
    echo "     $0 vote <id> <ch> <aye> <nay> <need>  Vote"
    echo "     $0 present <id>          Send to President"
    echo "     $0 sign <id>             President signs"
    echo "     $0 veto <id> <reason>    Presidential veto"
    echo "     $0 override <id> <sen> <hou>  Override vote"
    echo ""
    echo "  ⚡ EXECUTIVE"
    echo "     $0 eo <title>            Issue executive order"
    echo "     $0 cabinet <topic>       Cabinet meeting"
    echo ""
    echo "  ⚖️ JUDICIAL"
    echo "     $0 case <name>            Accept Supreme Court case"
    echo "     $0 decision <id> <ruling> <maj> <min>  Decision"
    echo ""
    echo "  ⚖️ OTHER"
    echo "     $0 impeachment <who> <charges>  Impeachment"
    echo "     $0 treaty <name> <votes>  Treaty process"
    echo "     $0 appointment <name> <pos> <votes>  Confirmation"
    echo ""
    exit 0
fi

CMD="$1"
shift

case "$CMD" in
    structure)
        node scripts/hive-congress.js structure
        ;;
    bill|bills)
        node scripts/hive-congress.js bill "$@"
        ;;
    vote)
        node scripts/hive-congress.js vote "$@"
        ;;
    present)
        node scripts/hive-congress.js present "$@"
        ;;
    sign)
        node scripts/hive-congress.js sign "$@"
        ;;
    veto)
        node scripts/hive-congress.js veto "$@"
        ;;
    override)
        node scripts/hive-congress.js override "$@"
        ;;
    eo|executive)
        node scripts/hive-congress.js eo "$@"
        ;;
    case|court)
        node scripts/hive-congress.js case "$@"
        ;;
    decision)
        node scripts/hive-congress.js decision "$@"
        ;;
    cabinet)
        node scripts/hive-congress.js cabinet "$@"
        ;;
    impeachment)
        node scripts/hive-congress.js impeachment "$@"
        ;;
    treaty)
        node scripts/hive-congress.js treaty "$@"
        ;;
    appointment)
        node scripts/hive-congress.js appointment "$@"
        ;;
    *)
        node scripts/hive-congress.js help
        ;;
esac
