#!/bin/bash
# hive-constitution.sh — The Founding Document
# 
# SERIOUS GOVERNMENT STRUCTURE with duck/bee names.
# Real constitution. Real structure. Just funny names.

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        📜 HIVE CONSTITUTION — The Founding Document v${VERSION}   ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║  SERIOUS GOVERNMENT STRUCTURE with duck/bee names              ║"
echo "║  Real constitution. Real structure. Just funny names.           ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$2" ]; then
    echo "📋 Commands:"
    echo ""
    echo "  📜 VIEW"
    echo "     $0 full                View entire constitution"
    echo "     $0 preamble           View preamble"
    echo "     $0 article <n>        View article 1-7"
    echo "     $0 bor                View Bill of Rights (1-10)"
    echo "     $0 amendments         View amendments 11-27"
    echo "     $0 amendment <n>      View amendment 1-27"
    echo "     $0 principles         View constitutional principles"
    echo ""
    echo "  🔍 SEARCH"
    echo "     $0 search <term>      Search constitution"
    echo ""
    exit 0
fi

CMD="$1"
shift

case "$CMD" in
    full|preamble|bor|bill|rights|amendments|principles)
        node scripts/hive-constitution.js "$CMD"
        ;;
    article|amendment)
        node scripts/hive-constitution.js "$CMD" "$1"
        ;;
    search)
        node scripts/hive-constitution.js search "$1"
        ;;
    *)
        node scripts/hive-constitution.js help
        ;;
esac
