#!/bin/bash
# hive-official.sh — Complete Government Roster
# 
# Production-ready roster of all government officials.
# Duck/bee/lobster names for fun, positions are REAL.

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║       🏛️ HIVE NATION OFFICIALS ROSTER v${VERSION}           ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║  Production-ready government roster for real projects          ║"
echo "║  Duck/bee/lobster names for fun + non-political reasons   ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$2" ]; then
    echo "Commands:"
    echo ""
    echo "  all              View complete government roster"
    echo "  executive        Executive branch"
    echo "  cabinet          Cabinet members"
    echo "  senate           Senate leadership"
    echo "  house            House leadership"
    echo "  judiciary        Judicial branch"
    echo "  agencies         Independent agencies"
    echo ""
    echo "  lookup <pos>     Look up position (e.g., 'Secretary of State')"
    echo "  name <name>      Look up by name"
    echo "  positions       List all positions"
    echo ""
    exit 0
fi

node scripts/hive-official.js "$@"
