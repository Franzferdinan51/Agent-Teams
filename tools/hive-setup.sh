#!/bin/bash
# Hive Nation v2.0 - Complete Setup Script
# Run once to configure everything

echo "
╔══════════════════════════════════════════════════════════════════╗
║        🏛️ HIVE NATION v2.0 SETUP 🏛️                      ║
║                                                          ║
║  Agent Teams - Governance & Multi-Agent Coordination        ║
╚══════════════════════════════════════════════════════════════════╝
"

HIVE_DIR="$HOME/Desktop/AgentTeam-GitHub"
SKILL_DIR="$HOME/.openclaw/workspace/skills/agent-teams"

# Check if we have what we need
if [ ! -d "$HIVE_DIR" ]; then
    echo "❌ Hive Nation not found at $HIVE_DIR"
    echo "   Run: git clone https://github.com/Franzferdinan51/Agent-Teams.git"
    exit 1
fi

echo "✅ Hive Nation found"

# Create skill symlink
echo ""
echo "📦 Creating skill symlink..."
mkdir -p "$HOME/.openclaw/workspace/skills"
ln -sf "$HIVE_DIR/tools/hive-teams.sh" "$SKILL_DIR/hive-teams.sh" 2>/dev/null
mkdir -p "$SKILL_DIR"
cp "$HIVE_DIR/tools/hive-teams.sh" "$SKILL_DIR/" 2>/dev/null
echo "✅ Skill created at $SKILL_DIR"

# Update SOUL.md
echo ""
echo "📝 Updating SOUL.md..."
if ! grep -q "Hive Nation v2.0" "$HOME/.openclaw/workspace/SOUL.md"; then
    echo '
---

## 🏛️ Hive Nation v2.0 - Agent Teams Integration (2026-04-19)

**Use:** hive-teams.sh start | workflow | teams | status

Services: WebUI (3131), Council (3006), MCP (3456)
' >> "$HOME/.openclaw/workspace/SOUL.md"
    echo "✅ SOUL.md updated"
else
    echo "⏭️  SOUL.md already has Hive Nation"
fi

# Start services
echo ""
echo "🚀 Starting services..."

# Council
if ! curl -s http://localhost:3006/api/health > /dev/null 2>&1; then
    cd "$HOME/Desktop/AI-Bot-Council-Concensus" && node server.js > /tmp/council.log 2>&1 &
    sleep 2
    echo "✅ Council started (3006)"
else
    echo "⏭️  Council already running"
fi

# MCP Server
if ! curl -s http://localhost:3456/health > /dev/null 2>&1; then
    cd "$HIVE_DIR" && node mcp-server.js > /tmp/hive-mcp.log 2>&1 &
    sleep 2
    echo "✅ MCP Server started (3456)"
else
    echo "⏭️  MCP Server already running"
fi

# WebUI
if ! curl -s http://localhost:3131/api/health > /dev/null 2>&1; then
    cd "$HIVE_DIR" && node webui/server.js > /tmp/hive.log 2>&1 &
    sleep 3
    echo "✅ WebUI started (3131)"
else
    echo "⏭️  WebUI already running"
fi

# Verify all
echo ""
echo "📊 Final Status:"
~/.openclaw/workspace/skills/agent-teams/hive-teams.sh status

echo "
╔══════════════════════════════════════════════════════════════════╗
║                    ✅ SETUP COMPLETE ✅                        ║
╚══════════════════════════════════════════════════════════════════╝

🎯 Quick Commands:

   hive-teams.sh status     Check all services
   hive-teams.sh open      Open WebUI
   hive-teams.sh workflow pipeline \"Topic\"   Run governance
   
📍 URLs:
   WebUI:   http://localhost:3131
   Council: http://localhost:3006
   MCP:     http://localhost:3456

🔧 Skill: ~/.openclaw/workspace/skills/agent-teams/
"
