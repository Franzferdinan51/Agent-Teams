#!/bin/bash
# team-session.sh — Team session management
# Usage: ./team-session.sh init|status|end [args]

TEAM_DIR="$HOME/Desktop/AgentTeam"
WORKSPACE="$TEAM_DIR/workspace"
mkdir -p "$WORKSPACE"/{tasks,memory,artifacts,logs}

SESSION_FILE="$WORKSPACE/session.json"
TEAM_CONFIG="$TEAM_DIR/config/team-config.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[TEAM]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

init_session() {
    local name="$1"
    if [ -z "$name" ]; then
        error "Session name required"
        echo "Usage: $0 init <project-name>"
        exit 1
    fi
    
    mkdir -p "$WORKSPACE/tasks" "$WORKSPACE/memory" "$WORKSPACE/artifacts" "$WORKSPACE/logs"
    
    cat > "$SESSION_FILE" << EOF
{
    "name": "$name",
    "started": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "active",
    "lead": "main-agent",
    "members": [],
    "tasks_total": 0,
    "tasks_completed": 0
}
EOF
    
    # Create empty task queue
    echo '[]' > "$WORKSPACE/tasks/queue.json"
    echo '[]' > "$WORKSPACE/tasks/completed.json"
    
    # Create shared memory
    echo "# Team Memory — $name" > "$WORKSPACE/memory/shared.md"
    echo "Started: $(date)" >> "$WORKSPACE/memory/shared.md"
    echo "" >> "$WORKSPACE/memory/shared.md"
    echo "## Team Members" >> "$WORKSPACE/memory/shared.md"
    echo "- Lead: Main Agent" >> "$WORKSPACE/memory/shared.md"
    
    success "Session '$name' initialized"
    echo ""
    echo "Workspace: $WORKSPACE"
    echo "Config: $SESSION_FILE"
    echo ""
    echo "Ready! Use these commands:"
    echo "  $0 status      — Check session"
    echo "  ./team-task.sh add <task> <role>  — Add task"
    echo "  ./spawn-agent.sh <role> <task>    — Spawn agent"
}

status_session() {
    if [ ! -f "$SESSION_FILE" ]; then
        warn "No active session"
        echo "Run: $0 init <project-name>"
        exit 0
    fi
    
    echo ""
    echo "═══════════════════════════════════════"
    cat "$SESSION_FILE" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"  Project: ${d['name']}\")
print(f\"  Status:  ${d['status']}\")
print(f\"  Started: ${d['started']}\")
print(f\"  Lead:    ${d['lead']}\")
"
    echo "═══════════════════════════════════════"
    echo ""
    
    # Show tasks
    local tasks=$(cat "$WORKSPACE/tasks/queue.json" 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    local completed=$(cat "$WORKSPACE/tasks/completed.json" 2>/dev/null | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    
    echo "  Tasks: $tasks pending, $completed completed"
    echo ""
    
    # Show recent log
    if [ -f "$WORKSPACE/logs/team.log" ]; then
        echo "  Recent activity:"
        tail -3 "$WORKSPACE/logs/team.log" 2>/dev/null | sed 's/^/    /'
    fi
    echo ""
}

end_session() {
    if [ ! -f "$SESSION_FILE" ]; then
        warn "No active session to end"
        exit 0
    fi
    
    local name=$(cat "$SESSION_FILE" | python3 -c "import sys,json; print(json.load(sys.stdin)['name'])" 2>/dev/null)
    
    # Archive session
    local archive="$WORKSPACE/logs/session-$(date +%Y%m%d-%H%M%S).json"
    cp "$SESSION_FILE" "$archive"
    
    # Mark inactive
    cat > "$SESSION_FILE" << EOF
{
    "name": "$name",
    "ended": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "ended",
    "archived": "$archive"
}
EOF
    
    success "Session '$name' ended and archived"
}

log_activity() {
    local msg="$1"
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $msg" >> "$WORKSPACE/logs/team.log" 2>/dev/null
}

case "$1" in
    init)
        init_session "$2"
        ;;
    status)
        status_session
        ;;
    end)
        end_session
        ;;
    log)
        log_activity "$2"
        ;;
    *)
        echo "Team Session Manager"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  init <name>   — Start new session"
        echo "  status        — Check session status"
        echo "  end           — End current session"
        echo ""
        ;;
esac
