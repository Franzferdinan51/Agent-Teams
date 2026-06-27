#!/bin/bash
# hive-orders.sh — Executive Orders Database
# 
# Production-ready EO database for real decision-making.

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║       ⚡ HIVE EXECUTIVE ORDERS DATABASE v${VERSION}            ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║  Production-ready EO database for real projects             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

if [ -z "$2" ]; then
    echo "Commands:"
    echo ""
    echo "  list              List all EOs"
    echo "  list <category>  List by category"
    echo "  view <number>    View specific EO"
    echo "  search <query>  Search EOs"
    echo ""
    echo "  categories       List categories"
    echo "  byCategory      Group by category"
    echo "  byPresident     Group by president"
    echo "  recent [n]       Recent orders"
    echo ""
    echo "  check <agency>   Compliance check"
    echo "  add <num> <title> Add user EO"
    echo ""
    exit 0
fi

node scripts/hive-orders.js "$@"
