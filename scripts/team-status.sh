#!/bin/bash
# team-status.sh — Full team status dashboard

TEAM_DIR="$HOME/Desktop/AgentTeam"
WORKSPACE="$TEAM_DIR/workspace"
SESSION_FILE="$WORKSPACE/session.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Check session
if [ ! -f "$SESSION_FILE" ]; then
    echo ""
    echo -e "${RED}[ERROR]${NC} No active team session"
    echo ""
    echo "Run: ./team-session.sh init <project-name>"
    exit 1
fi

# Get session info
SESSION_NAME=$(cat "$SESSION_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])" 2>/dev/null)
SESSION_STATUS=$(cat "$SESSION_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
SESSION_STARTED=$(cat "$SESSION_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin)['started'])" 2>/dev/null)

# Get task stats
QUEUE_FILE="$WORKSPACE/tasks/queue.json"
DONE_FILE="$WORKSPACE/tasks/completed.json"

TASKS_PENDING=$(cat "$QUEUE_FILE" 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
TASKS_DONE=$(cat "$DONE_FILE" 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
TASKS_IN_PROGRESS=$(cat "$QUEUE_FILE" 2>/dev/null | python3 -c "import sys,json; print(len([t for t in json.load(sys.stdin) if t['status']=='in_progress']))" 2>/dev/null || echo "0")

# Status color
status_color() {
    case "$1" in
        active) echo "$GREEN" ;;
        ended) echo "$RED" ;;
        *) echo "$YELLOW" ;;
    esac
}

# Print header
echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    🤖 AGENT TEAM STATUS                          ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Session info
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│  Session: $SESSION_NAME"
echo "│  Status:  $(status_color $SESSION_STATUS)$SESSION_STATUS${NC}"
echo "│  Started: $SESSION_STARTED"
echo "└─────────────────────────────────────────────────────────────────┘"
echo ""

# Task stats
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│  📋 TASK QUEUE"
echo "├─────────────────────────────────────────────────────────────────┤"
echo "│  Pending:      $TASKS_PENDING"
echo "│  In Progress:  $TASKS_IN_PROGRESS"
echo "│  Completed:    $TASKS_DONE"
echo "└─────────────────────────────────────────────────────────────────┘"
echo ""

# Pending tasks
if [ "$TASKS_PENDING" != "0" ]; then
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│  ⏳ PENDING TASKS"
    echo "├─────────────────────────────────────────────────────────────────┤"
    cat "$QUEUE_FILE" 2>/dev/null | python3 -c "
import sys, json
tasks = json.load(sys.stdin)
pending = [t for t in tasks if t['status'] in ['pending', 'in_progress']]
for t in pending:
    status_icon = {'pending': '○', 'in_progress': '◐'}.get(t['status'], '?')
    print(f\"│  {status_icon} [{t['role']}] {t['task'][:50]}...\")
    if t.get('assigned_to'):
        print(f\"│      → {t['assigned_to']}\")
" 2>/dev/null
    echo "└─────────────────────────────────────────────────────────────────┘"
    echo ""
fi

# Recent completed
if [ -f "$DONE_FILE" ] && [ "$(cat "$DONE_FILE" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))' 2>/dev/null)" != "0" ]; then
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│  ✅ RECENTLY COMPLETED"
    echo "├─────────────────────────────────────────────────────────────────┤"
    cat "$DONE_FILE" 2>/dev/null | python3 -c "
import sys, json
tasks = json.load(sys.stdin)
for t in tasks[-3:]:
    print(f\"│  ✓ [{t['role']}] {t['task'][:50]}...\")
" 2>/dev/null
    echo "└─────────────────────────────────────────────────────────────────┘"
    echo ""
fi

# Team memory preview
if [ -f "$WORKSPACE/memory/shared.md" ]; then
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│  🧠 SHARED MEMORY (preview)"
    echo "├─────────────────────────────────────────────────────────────────┤"
    head -10 "$WORKSPACE/memory/shared.md" 2>/dev/null | sed 's/^/  /'
    echo "└─────────────────────────────────────────────────────────────────┘"
    echo ""
fi

# Agents
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│  👥 AVAILABLE AGENTS"
echo "├─────────────────────────────────────────────────────────────────┤"
echo "│  researcher  — Web search, summarize, gather info"
echo "│  coder      — Write code, implement features"
echo "│  reviewer   — Code review, quality check"
echo "│  writer     — Documentation, reports"
echo "└─────────────────────────────────────────────────────────────────┘"
echo ""

# Quick commands
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│  ⚡ QUICK COMMANDS"
echo "├─────────────────────────────────────────────────────────────────┤"
echo "│  Add task:     ./team-task.sh add '<task>' <role>"
echo "│  Spawn agent:  ./spawn-agent.sh <role> '<task>'"
echo "│  End session:  ./team-session.sh end"
echo "└─────────────────────────────────────────────────────────────────┘"
echo ""
