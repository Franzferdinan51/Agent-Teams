#!/bin/bash
# BrowserOS MCP helper for Hive Nation
# Usage: ./browseros-mcp.sh <command> [args...]

BROWSEROS_URL="http://localhost:9003/mcp"
MCP="mcporter call --allow-http --http-url $BROWSEROS_URL"

case "$1" in
    open|nav)
        $MCP new_page url="$2" 2>/dev/null
        ;;
    pages|list)
        $MCP list_pages 2>/dev/null
        ;;
    active)
        $MCP get_active_page 2>/dev/null
        ;;
    snapshot)
        $MCP take_snapshot page="${2:-1}" 2>/dev/null
        ;;
    screenshot)
        $MCP take_screenshot page="${2:-1}" format="png" 2>/dev/null
        ;;
    content)
        $MCP get_page_content page="${2:-1}" viewportOnly=true 2>/dev/null
        ;;
    close)
        $MCP close_page page="$2" 2>/dev/null
        ;;
    hive)
        echo "🌐 Opening Hive Nation WebUI..."
        $MCP new_page url="http://localhost:3131" 2>/dev/null
        ;;
    council)
        echo "🌐 Opening Council Server..."
        $MCP new_page url="http://localhost:3006" 2>/dev/null
        ;;
    *)
        echo "BrowserOS MCP for Hive Nation"
        echo "Usage: $0 {open|nav|pages|active|snapshot|screenshot|content|close|hive|council}"
        echo ""
        echo "Commands:"
        echo "  open <url>    Open URL in new page"
        echo "  pages         List all open pages"
        echo "  active        Show active page"
        echo "  snapshot <n>  Get page elements"
        echo "  screenshot <n>  Take screenshot"
        echo "  content <n>   Get page text"
        echo "  close <n>     Close page"
        echo "  hive          Open Hive WebUI"
        echo "  council       Open Council Server"
        ;;
esac
