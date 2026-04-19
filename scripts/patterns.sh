#!/bin/bash
# patterns.sh — Multi-agent coordination patterns
# Usage: ./patterns.sh <pattern> [args]

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_help() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║        📐 MULTI-AGENT COORDINATION PATTERNS                  ║"
    echo "╠══════════════════════════════════════════════════════════════════╣"
    echo "║                                                              ║"
    echo "║  Based on Claude's 5 coordination patterns + research          ║"
    echo "║                                                              ║"
    echo "║  1. generator-verifier  │ Quality-critical with evaluation   ║"
    echo "║  2. orchestrator-subagent│ Hierarchical task decomposition   ║"
    echo "║  3. agent-teams        │ Parallel independent subtasks      ║"
    echo "║  4. message-bus        │ Event-driven pipelines            ║"
    echo "║  5. shared-state       │ Collaborative building             ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Usage: ./patterns.sh <pattern> [args]"
    echo ""
    echo "  Patterns:"
    echo "    ./patterns.sh generator-verifier <task>"
    echo "    ./patterns.sh orchestrator-subagent <task>"
    echo "    ./patterns.sh agent-teams <task1> <task2> ..."
    echo "    ./patterns.sh message-bus <task>"
    echo "    ./patterns.sh shared-state <task>"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# Pattern 1: Generator-Verifier
# ═══════════════════════════════════════════════════════════════════════
pattern_generator_verifier() {
    local task="$1"
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║        🔄 GENERATOR-VERIFIER PATTERN                        ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  ${CYAN}Task:${NC} $task"
    echo ""
    echo "  How it works:"
    echo "  ┌───────────┐     ┌───────────┐"
    echo "  │ GENERATOR │────▶│ VERIFIER  │"
    echo "  └───────────┘     └─────┬─────┘"
    echo "       ▲                    │"
    echo "       │         ┌─────────▼─────────┐"
    echo "       └─────────│  Feedback Loop   │"
    echo "                 └───────────────────┘"
    echo ""
    echo "  Steps:"
    echo "  1. Generator creates initial output"
    echo "  2. Verifier evaluates against criteria"
    echo "  3. If failed → feedback to generator"
    echo "  4. Loop until verified or max iterations"
    echo ""
    
    # Log pattern
    echo "[$(date)] PATTERN: generator-verifier | Task: $task" >> "$HOME/Desktop/AgentTeam/workspace/memory/patterns.log"
    
    echo "  Spawning agents..."
    echo ""
    
    # Generator agent
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  GENERATOR AGENT                                       │"
    echo "  │  Spawning...                                          │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  Task: $task"
    echo ""
    echo "  System prompt: You are a generator agent. Create the best initial"
    echo "  output for the task. Be thorough and high-quality."
    echo ""
    
    # Verifier agent
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  VERIFIER AGENT                                        │"
    echo "  │  Waiting for generator output...                       │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  System prompt: You are a verifier agent. Evaluate the output"
    echo "  against explicit criteria. Be critical. Accept only if perfect."
    echo ""
    echo "  Verification criteria to check:"
    echo "  - Quality standards met?"
    echo "  - All requirements satisfied?"
    echo "  - Any errors or issues?"
    echo "  - Ready to deliver?"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# Pattern 2: Orchestrator-Subagent
# ═══════════════════════════════════════════════════════════════════════
pattern_orchestrator_subagent() {
    local task="$1"
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║        👔 ORCHESTRATOR-SUBAGENT PATTERN                   ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  ${CYAN}Task:${NC} $task"
    echo ""
    echo "  How it works:"
    echo "           ┌─────────────┐"
    echo "           │ ORCHESTRATOR│"
    echo "           │  (Team Lead) │"
    echo "           └──────┬──────┘"
    echo "      ┌──────────┼──────────┐"
    echo "      ▼          ▼          ▼"
    echo "  ┌────────┐ ┌────────┐ ┌────────┐"
    echo "  │SUB-    │ │SUB-    │ │SUB-    │"
    echo "  │AGENT A │ │AGENT B │ │AGENT C │"
    echo "  └────────┘ └────────┘ └────────┘"
    echo ""
    echo "  Orchestrator:"
    echo "  - Plans the work"
    echo "  - Decomposes into subtasks"
    echo "  - Delegates to subagents"
    echo "  - Synthesizes results"
    echo ""
    
    echo "  Spawning orchestrator..."
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  ORCHESTRATOR AGENT                                    │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  System prompt: You are an orchestrator. Break down the task,"
    echo "  dispatch subtasks to specialists, collect results, synthesize."
    echo ""
    echo "  Subagent roles available:"
    echo "  - researcher, coder, reviewer, writer"
    echo "  - 25+ micro-agents (./micro.sh list)"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# Pattern 3: Agent Teams
# ═══════════════════════════════════════════════════════════════════════
pattern_agent_teams() {
    shift
    local tasks=("$@")
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║        👥 AGENT TEAMS PATTERN                              ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    
    local count=0
    for task in "${tasks[@]}"; do
        count=$((count + 1))
        echo "  Task $count: $task"
    done
    echo ""
    echo "  How it works:"
    echo "  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐"
    echo "  │AGENT 1 │ │AGENT 2 │ │AGENT 3 │ │AGENT N │"
    echo "  │(subtask)│ │(subtask)│ │(subtask)│ │(subtask)│"
    echo "  └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘"
    echo "       │         │         │         │"
    echo "       └─────────┼─────────┼─────────┘"
    echo "                 ▼"
    echo "           ┌───────────┐"
    echo "           │ RESULTS   │"
    echo "           │AGGREGATOR│"
    echo "           └───────────┘"
    echo ""
    echo "  Parallel spawning $count agents..."
    echo ""
    
    local i=1
    for task in "${tasks[@]}"; do
        echo "  ┌─────────────────────────────────────────────────────────┐"
        echo "  │  AGENT $i                                                 │"
        echo "  │  Task: $task"
        echo "  └─────────────────────────────────────────────────────────┘"
        echo ""
        i=$((i + 1))
    done
    
    echo "  Wait for all to complete, then aggregate results."
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# Pattern 4: Message Bus
# ═══════════════════════════════════════════════════════════════════════
pattern_message_bus() {
    local task="$1"
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║        🚌 MESSAGE BUS PATTERN                               ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  ${CYAN}Task:${NC} $task"
    echo ""
    echo "  How it works:"
    echo "  ┌──────────────────────────────────────────────┐"
    echo "  │              MESSAGE BUS                     │"
    echo "  │  (Shared queue, events, pub/sub)            │"
    echo "  └──────┬───────────────┬───────────────┬──────┘"
    echo "         │               │               │"
    echo "    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐"
    echo "    │ AGENT A │    │ AGENT B │    │ AGENT C │"
    echo "    │Producer │    │Consumer │    │Consumer │"
    echo "    └─────────┘    └─────────┘    └─────────┘"
    echo ""
    echo "  For event-driven pipelines:"
    echo "  1. Agent publishes event (task complete)"
    echo "  2. Bus routes to subscribed agents"
    echo "  3. Downstream agents react and process"
    echo "  4. Chain continues until pipeline done"
    echo ""
    
    echo "  Use cases:"
    echo "  - CI/CD pipelines (build → test → deploy)"
    echo "  - Data processing pipelines"
    echo "  - Notification systems"
    echo "  - Async task queues"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# Pattern 5: Shared State
# ═════════════════════════════════════════════════════════════════════════
pattern_shared_state() {
    local task="$1"
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║        📊 SHARED-STATE PATTERN                             ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  ${CYAN}Task:${NC} $task"
    echo ""
    echo "  How it works:"
    echo "  ┌──────────────────────────────────────────────┐"
    echo "  │         SHARED STATE (DB/Redis/etc)        │"
    echo "  │  - Task queue    - Results               │"
    echo "  │  - Progress      - Conflicts              │"
    echo "  └──────┬───────────────┬───────────────┬──────┘"
    echo "         │               │               │"
    echo "    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐"
    echo "    │ AGENT A │    │ AGENT B │    │ AGENT C │"
    echo "    │ Read/   │    │ Read/   │    │ Read/   │"
    echo "    │ Write   │    │ Write   │    │ Write   │"
    echo "    └─────────┘    └─────────┘    └─────────┘"
    echo ""
    echo "  Agents collaborate by reading/writing shared state."
    echo "  Each agent builds on others' findings."
    echo ""
    echo "  Best for:"
    echo "  - Research tasks (one agent finds X, others expand)"
    echo "  - Collaborative writing (one drafts, others refine)"
    echo "  - Code generation (backend → frontend → integration)"
    echo ""
    
    echo "  Shared workspace: ~/Desktop/AgentTeam/workspace/"
    echo "  - shared.md      — Shared memory"
    echo "  - queue.json      — Task queue"
    echo "  - artifacts/     — Shared files"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════

case "$1" in
    -h|--help|"") show_help ;;
    generator-verifier)
        pattern_generator_verifier "$2"
        ;;
    orchestrator-subagent)
        pattern_orchestrator_subagent "$2"
        ;;
    agent-teams)
        shift
        pattern_agent_teams "$@"
        ;;
    message-bus|message_bus)
        pattern_message_bus "$2"
        ;;
    shared-state|shared_state)
        pattern_shared_state "$2"
        ;;
    list)
        echo ""
        echo "  Available patterns:"
        echo "    generator-verifier    — Quality-critical with evaluation"
        echo "    orchestrator-subagent — Hierarchical task decomposition"
        echo "    agent-teams          — Parallel independent subtasks"
        echo "    message-bus          — Event-driven pipelines"
        echo "    shared-state         — Collaborative building"
        echo ""
        ;;
    *)
        echo ""
        echo "  ${RED}✗ Unknown pattern: $1${NC}"
        echo ""
        show_help
        ;;
esac
