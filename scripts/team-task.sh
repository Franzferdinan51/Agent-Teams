#!/bin/bash
# team-task.sh — Task queue management
# Usage: ./team-task.sh add|list|claim|complete|fail [args]

TEAM_DIR="$HOME/Desktop/AgentTeam"
WORKSPACE="$TEAM_DIR/workspace"
QUEUE_FILE="$WORKSPACE/tasks/queue.json"
DONE_FILE="$WORKSPACE/tasks/completed.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[TASK]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Ensure queue file exists
init_queue() {
    mkdir -p "$WORKSPACE/tasks"
    if [ ! -f "$QUEUE_FILE" ]; then
        echo '[]' > "$QUEUE_FILE"
    fi
    if [ ! -f "$DONE_FILE" ]; then
        echo '[]' > "$DONE_FILE"
    fi
}

# Generate unique ID
gen_id() {
    echo "$(date +%s)-$RANDOM"
}

# Add a task
add_task() {
    init_queue
    local task="$1"
    local role="$2"
    
    if [ -z "$task" ]; then
        error "Task description required"
        echo "Usage: $0 add <task-description> [role]"
        exit 1
    fi
    
    if [ -z "$role" ]; then
        role="any"
    fi
    
    local id=$(gen_id)
    local new_task=$(cat << EOF
{
    "id": "$id",
    "task": "$task",
    "role": "$role",
    "status": "pending",
    "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "assigned_to": null,
    "result": null
}
EOF
)
    
    # Add to queue
    local queue=$(cat "$QUEUE_FILE")
    local new_queue=$(echo "$queue" | python3 -c "
import sys, json
data = json.load(sys.stdin)
data.append(json.loads('''$new_task'''))
print(json.dumps(data, indent=2))
")
    echo "$new_queue" > "$QUEUE_FILE"
    
    success "Task added: $task"
    log "ID: $id | Role: $role"
}

# List tasks
list_tasks() {
    init_queue
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                     TASK QUEUE"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    local queue=$(cat "$QUEUE_FILE")
    local count=$(echo "$queue" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
    
    if [ "$count" = "0" ]; then
        echo "  No pending tasks"
    else
        echo "$queue" | python3 -c "
import sys, json
tasks = json.load(sys.stdin)
for i, t in enumerate(tasks, 1):
    status_color = {'pending': '\033[1;33m', 'in_progress': '\033[0;36m', 'done': '\033[0;32m', 'failed': '\033[0;31m'}.get(t['status'], '')
    reset = '\033[0m'
    assigned = t.get('assigned_to') or '—'
    print(f\"  {i}. [{status_color}{t['status']}{reset}] [{t['role']}] {t['task']}\")
    print(f\"     ID: {t['id']} | Assigned: {assigned}\")
    print()
"
    fi
    
    # Show completed
    if [ -f "$DONE_FILE" ]; then
        local done_count=$(cat "$DONE_FILE" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
        if [ "$done_count" != "0" ]; then
            echo "───────────────────────────────────────────────────────────────"
            echo "  Completed: $done_count tasks"
        fi
    fi
    echo ""
}

# Claim a task
claim_task() {
    init_queue
    local id="$1"
    local agent="$2"
    
    if [ -z "$id" ] || [ -z "$agent" ]; then
        error "Task ID and agent name required"
        echo "Usage: $0 claim <task-id> <agent-name>"
        exit 1
    fi
    
    local queue=$(cat "$QUEUE_FILE")
    local new_queue=$(echo "$queue" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data:
    if t['id'] == '$id':
        t['status'] = 'in_progress'
        t['assigned_to'] = '$agent'
        t['started'] = '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
data.sort(key=lambda x: {'pending': 0, 'in_progress': 1, 'done': 2, 'failed': 3}.get(x['status'], 9))
print(json.dumps(data, indent=2))
")
    echo "$new_queue" > "$QUEUE_FILE"
    
    success "Task $id claimed by $agent"
}

# Complete a task
complete_task() {
    init_queue
    local id="$1"
    local result="$2"
    
    if [ -z "$id" ]; then
        error "Task ID required"
        echo "Usage: $0 complete <task-id> [result]"
        exit 1
    fi
    
    local queue=$(cat "$QUEUE_FILE")
    
    # Find and move to completed
    local completed=$(cat "$DONE_FILE")
    local task_json=""
    
    local new_queue=$(echo "$queue" | python3 -c "
import sys, json
data = json.load(sys.stdin)
global task_json
for t in data:
    if t['id'] == '$id':
        t['status'] = 'done'
        t['completed'] = '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
        t['result'] = '''$result''' if '''$result''' else None
        task_json = json.dumps(t)
        data.remove(t)
print(json.dumps(data, indent=2))
")
    echo "$new_queue" > "$QUEUE_FILE"
    
    if [ -n "$task_json" ]; then
        local new_done=$(echo "$completed" | python3 -c "
import sys, json
data = json.load(sys.stdin)
data.append($task_json)
print(json.dumps(data, indent=2))
")
        echo "$new_done" > "$DONE_FILE"
        success "Task $id completed!"
    else
        error "Task $id not found"
    fi
}

# Fail a task
fail_task() {
    init_queue
    local id="$1"
    local reason="$2"
    
    if [ -z "$id" ]; then
        error "Task ID required"
        echo "Usage: $0 fail <task-id> [reason]"
        exit 1
    fi
    
    local queue=$(cat "$QUEUE_FILE")
    local new_queue=$(echo "$queue" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data:
    if t['id'] == '$id':
        t['status'] = 'failed'
        t['failed_reason'] = '''$reason''' if '''$reason''' else 'Unknown error'
data.sort(key=lambda x: {'pending': 0, 'in_progress': 1, 'done': 2, 'failed': 3}.get(x['status'], 9))
print(json.dumps(data, indent=2))
")
    echo "$new_queue" > "$QUEUE_FILE"
    
    warn "Task $id marked as failed: $reason"
}

# Get next pending task for role
get_next() {
    init_queue
    local role="$1"
    
    if [ -z "$role" ]; then
        role="any"
    fi
    
    local queue=$(cat "$QUEUE_FILE")
    echo "$queue" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for t in data:
    if t['status'] == 'pending':
        if '$role' == 'any' or t['role'] == '$role' or t['role'] == 'any':
            print(json.dumps(t))
            sys.exit(0)
print('null')
" 2>/dev/null
}

case "$1" in
    add)
        add_task "$2" "$3"
        ;;
    list)
        list_tasks
        ;;
    claim)
        claim_task "$2" "$3"
        ;;
    complete|done)
        complete_task "$2" "$3"
        ;;
    fail)
        fail_task "$2" "$3"
        ;;
    next)
        get_next "$2"
        ;;
    *)
        echo "Task Queue Manager"
        echo ""
        echo "Usage: $0 <command> [args]"
        echo ""
        echo "Commands:"
        echo "  add <task> [role]       — Add a task (role: researcher/coder/reviewer/writer/any)"
        echo "  list                     — List all tasks"
        echo "  claim <id> <agent>      — Claim a task"
        echo "  complete <id> [result]   — Mark task complete"
        echo "  fail <id> [reason]       — Mark task failed"
        echo "  next [role]              — Get next pending task"
        echo ""
        ;;
esac
