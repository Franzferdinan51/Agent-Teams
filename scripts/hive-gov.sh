#!/bin/bash
# hive-gov.sh — Main Government Hub
# 
# Production-ready government framework.
# Duck/bee/lobster names for fun + non-political reasons.

VERSION="1.4.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║           🏛️ HIVE NATION GOVERNMENT v${VERSION} 🏛️               ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║   Production-ready government framework for real projects      ║"
echo "║   Duck/bee/lobster names for fun + non-political reasons    ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$2" ]; then
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Main hubs:"
    echo "  constitution  View constitution"
    echo "  congress      Government operations"
    echo "  senate        Congressional features"
    echo "  law           Statutory code"
    echo "  government    Government status"
    echo ""
    echo "Examples:"
    echo "  $0 constitution full"
    echo "  $0 congress structure"
    echo "  $0 law research \"freedom of speech\""
    echo ""
    echo "For full help:"
    echo "  node scripts/hive-gov.js help"
    exit 0
fi

node scripts/hive-gov.js "$@"
