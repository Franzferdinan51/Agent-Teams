#!/bin/bash
# hive-law.sh — Complete Legal Code for Hive Nation
# 
# Production-ready statutory law for real decision-making.
# Duck/bee/lobster names for fun, law is REAL.

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║          ⚖️ HIVE LAW — Complete Legal Code v${VERSION}         ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║  Production-ready statutory law for real projects              ║"
echo "║  Duck/bee/lobster names for fun + non-political reasons      ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$2" ]; then
    echo "Commands:"
    echo ""
    echo "  📜 LEGAL RESEARCH"
    echo "     $0 statutes              View all statutory law"
    echo "     $0 title <name>          View specific title"
    echo "     $0 section <n>          View specific section"
    echo "     $0 research <query>      Search for provisions"
    echo ""
    echo "  ⚖️ LEGAL OPINIONS"
    echo "     $0 opinion <question>    Generate legal memorandum"
    echo ""
    echo "  📋 CASE TRACKER"
    echo "     $0 case <name> <p1 v p2> <issue>  Register case"
    echo "     $0 cases                List all cases"
    echo "     $0 decide <id> <decision> <reasoning> <citation>  Decide"
    echo "     $0 view <id>            View case details"
    echo ""
    exit 0
fi

CMD="$1"
shift

case "$CMD" in
    statutes|title|section|research|opinion|case|cases|decide|view)
        node scripts/hive-law.js "$CMD" "$@"
        ;;
    *)
        node scripts/hive-law.js help
        ;;
esac
