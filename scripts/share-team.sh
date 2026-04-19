#!/bin/bash
# share-team.sh — Package AgentTeam for sharing with other agents
# Usage: ./share-team.sh [destination]

TEAM_DIR="$HOME/Desktop/AgentTeam"
ARCHIVE="$HOME/Desktop/AgentTeam.zip"

echo "Packaging AgentTeam..."
cd "$HOME/Desktop"

# Remove test session artifacts
rm -rf "$TEAM_DIR/workspace/tasks" 2>/dev/null
rm -rf "$TEAM_DIR/workspace/memory" 2>/dev/null
rm -rf "$TEAM_DIR/workspace/artifacts" 2>/dev/null
rm -rf "$TEAM_DIR/workspace/logs" 2>/dev/null
rm -rf "$TEAM_DIR/workspace/agents" 2>/dev/null
rm -f "$TEAM_DIR/workspace/session.json" 2>/dev/null

# Recreate clean workspace
mkdir -p "$TEAM_DIR/workspace"/{tasks,memory,artifacts,logs,agents}
echo '[]' > "$TEAM_DIR/workspace/tasks/queue.json"
echo '[]' > "$TEAM_DIR/workspace/tasks/completed.json"

# Zip it up
zip -r "$ARCHIVE" AgentTeam/ -x "*.DS_Store" 2>/dev/null

echo ""
echo "✅ AgentTeam packaged!"
echo ""
echo "📦 Archive: $ARCHIVE"
echo "   Size: $(du -sh "$ARCHIVE" | cut -f1)"
echo ""
echo "To share with another agent:"
echo "  1. Send them AgentTeam.zip"
echo "  2. They unzip: unzip AgentTeam.zip -d ~/Desktop/"
echo "  3. Done! They can start using it"
echo ""
