#!/bin/bash
# spawn-agent.sh — Spawn team member agents
# Usage: ./spawn-agent.sh <role> <task> [model]

TEAM_DIR="$HOME/Desktop/AgentTeam"
WORKSPACE="$TEAM_DIR/workspace"
SCRIPTS_DIR="$TEAM_DIR/scripts"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[AGENT]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Role configurations
declare -A ROLE_CONFIGS
ROLE_CONFIGS[researcher]="model=minimax/MiniMax-M2.7|task_type=research|description=Web search, summarize, gather info"
ROLE_CONFIGS[coder]="model=minimax/MiniMax-M2.7|task_type=coding|description=Write code, implement features"
ROLE_CONFIGS[reviewer]="model=minimax/MiniMax-M2.7|task_type=review|description=Review code, suggest improvements"
ROLE_CONFIGS[writer]="model=minimax/MiniMax-M2.7|task_type=writing|description=Documentation, reports, communications"

# Parse config
get_config() {
    local role="$1"
    local key="$2"
    echo "${ROLE_CONFIGS[$role]}" | tr '|' '\n' | grep "^$key=" | cut -d= -f2
}

# Show available roles
show_roles() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "                     AVAILABLE AGENTS"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    for role in researcher coder reviewer writer; do
        local desc=$(get_config "$role" "description")
        local model=$(get_config "$role" "model")
        echo -e "  ${CYAN}$role${NC}"
        echo "     $desc"
        echo "     Model: $model"
        echo ""
    done
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
}

# Spawn an agent
spawn() {
    local role="$1"
    local task="$2"
    local model="${3:-$(get_config "$role" "model")}'
    
    if [ -z "$role" ] || [ -z "$task" ]; then
        error "Role and task required"
        echo ""
        echo "Usage: $0 <role> <task> [model]"
        echo ""
        show_roles
        exit 1
    fi
    
    if [ -z "${ROLE_CONFIGS[$role]}" ]; then
        error "Unknown role: $role"
        echo ""
        show_roles
        exit 1
    fi
    
    local agent_id="${role}-$(date +%s)"
    local task_type=$(get_config "$role" "task_type")
    
    log "Spawning $role agent..."
    log "Task: $task"
    log "Model: $model"
    echo ""
    
    # Check session
    if [ ! -f "$WORKSPACE/session.json" ]; then
        warn "No active team session"
        read -p "Start one now? (y/n): " start
        if [ "$start" = "y" ]; then
            read -p "Session name: " sess_name
            "$SCRIPTS_DIR/team-session.sh" init "$sess_name"
        fi
    fi
    
    # Add task to queue
    "$SCRIPTS_DIR/team-task.sh" add "$task" "$role" >/dev/null 2>&1
    
    # Spawn via sessions_spawn
    log "Spawning agent via sessions_spawn..."
    echo ""
    
    # Build the task prompt
    local system_prompt="You are a $role agent on a team. Your role: $task_type.

Team context is stored in ~/Desktop/AgentTeam/workspace/
- Tasks: workspace/tasks/queue.json
- Memory: workspace/memory/shared.md
- Artifacts: workspace/artifacts/

When done:
1. Mark task complete: ./team-task.sh complete <id> '<result>'
2. Add notes to shared memory if relevant
3. Save any artifacts to workspace/artifacts/"

    # For duck-cli / OpenClaw, use sessions_spawn
    if command -v openclaw &>/dev/null; then
        log "Using OpenClaw sessions_spawn..."
        # This would be called from within an OpenClaw agent
        echo "SYSTEM_PROMPT=$system_prompt"
        echo "TASK=$task"
        echo "MODEL=$model"
        echo "AGENT_ID=$agent_id"
        echo ""
        success "Agent config prepared. Call sessions_spawn with these parameters:"
        echo "  model: $model"
        echo "  task: $task"
        echo "  agent_id: $agent_id"
    else
        # Fallback: just log
        log "No OpenClaw found — agent would be spawned here"
        echo ""
        success "Agent '$agent_id' logged. Add to OpenClaw manually or integrate."
    fi
    
    # Write agent info for reference
    cat > "$WORKSPACE/agents/$agent_id.json" << EOF
{
    "id": "$agent_id",
    "role": "$role",
    "task": "$task",
    "model": "$model",
    "task_type": "$task_type",
    "system_prompt": "$system_prompt",
    "spawned": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "spawned"
}
EOF
    
    success "Agent spawned: $agent_id"
}

case "$1" in
    roles)
        show_roles
        ;;
    ""|-h|--help)
        echo "Agent Spawner — Create team member agents"
        echo ""
        echo "Usage: $0 <role> <task> [model]"
        echo ""
        show_roles
        ;;
    *)
        spawn "$1" "$2" "$3"
        ;;
esac
