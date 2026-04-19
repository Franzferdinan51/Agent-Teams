#!/bin/bash
# micro.sh — Micro-agent spawner for single-purpose tasks
# Usage: ./micro.sh <agent> <task>

AGENT_DIR="$HOME/Desktop/AgentTeam/workspace/micro-agents"
mkdir -p "$AGENT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════════════════
# MICRO-AGENTS — 25+ Tiny Specialists
# ═══════════════════════════════════════════════════════════════════

declare -A MICRO_AGENTS
MICRO_AGENTS=(
    # Research
    ["researcher"]="Web search and summarize"
    ["researcher-deep"]="Deep research on a topic"
    ["comparer"]="Compare options with pros/cons"
    
    # Coding
    ["coder"]="Write code for a feature"
    ["debugger"]="Find and fix bugs"
    ["bug-hunt"]="Hunt for potential bugs"
    ["optimizer"]="Optimize code performance"
    ["security-scan"]="Security vulnerability review"
    
    # Code Artifacts
    ["test-writer"]="Write unit tests"
    ["code-review"]="Focused code review"
    ["refactor"]="Refactor messy code"
    
    # API & DB
    ["api-designer"]="Design REST endpoints"
    ["db-designer"]="Design database schema"
    ["query-writer"]="Write SQL/NoSQL queries"
    
    # Docs
    ["doc-writer"]="Write technical docs"
    ["readme-writer"]="Write README files"
    ["changelog-writer"]="Write changelog entries"
    ["comment-writer"]="Add code comments"
    
    # Git
    ["commit-writer"]="Write git commits"
    ["pr-writer"]="Write PR descriptions"
    
    # Analysis
    ["explainer"]="Explain complex concepts"
    ["summarizer"]="Summarize long text"
    ["error-explainer"]="Explain error messages"
    ["fix-suggest"]="Suggest code fixes"
    ["review-summary"]="Summarize review findings"
    
    # Planning
    ["planner"]="Break down complex tasks"
    ["architect"]="Design system architecture"
)

show_agents() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║               🎯 MICRO-AGENTS (25+ Tiny Specialists)          ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Lightweight single-purpose agents for granular tasks."
    echo "  Each one does ONE thing really well."
    echo ""
    
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │ RESEARCH & ANALYSIS                                        │"
    echo "  ├─────────────────────────────────────────────────────────────┤"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "researcher" "Web search and summarize"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "researcher-deep" "Deep research on a topic"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "comparer" "Compare options with pros/cons"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "summarizer" "Summarize long text"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "explainer" "Explain complex concepts"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │ CODING                                                    │"
    echo "  ├─────────────────────────────────────────────────────────────┤"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "coder" "Write code for a feature"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "debugger" "Find and fix bugs"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "bug-hunt" "Hunt for potential bugs"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "optimizer" "Optimize performance"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "security-scan" "Security review"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "refactor" "Refactor messy code"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │ TESTING & REVIEW                                          │"
    echo "  ├─────────────────────────────────────────────────────────────┤"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "test-writer" "Write unit tests"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "code-review" "Focused code review"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "review-summary" "Summarize findings"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │ API & DATABASE                                            │"
    echo "  ├─────────────────────────────────────────────────────────────┤"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "api-designer" "Design REST endpoints"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "db-designer" "Design DB schema"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "query-writer" "Write SQL queries"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │ DOCUMENTATION                                             │"
    echo "  ├─────────────────────────────────────────────────────────────┤"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "doc-writer" "Write technical docs"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "readme-writer" "Write README files"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "changelog-writer" "Write changelogs"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "comment-writer" "Add code comments"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │ GIT & VERSION CONTROL                                     │"
    echo "  ├─────────────────────────────────────────────────────────────┤"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "commit-writer" "Write git commits"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "pr-writer" "Write PR descriptions"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │ DEBUGGING & FIXES                                          │"
    echo "  ├─────────────────────────────────────────────────────────────┤"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "error-explainer" "Explain errors"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "fix-suggest" "Suggest fixes"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │ PLANNING & ARCHITECTURE                                    │"
    echo "  ├─────────────────────────────────────────────────────────────┤"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "planner" "Break down tasks"
    printf "  │ ${CYAN}%-15s${NC} │ %-45s │\n" "architect" "Design systems"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  📖 Usage:"
    echo "    ./micro.sh <agent> <task>"
    echo ""
    echo "  📖 Examples:"
    echo "    ./micro.sh researcher 'latest AI news'"
    echo "    ./micro.sh debugger 'fix null pointer in auth.js'"
    echo "    ./micro.sh summarizer 'summarize this article...'"
    echo "    ./micro.sh planner 'build a REST API'"
    echo ""
}

spawn() {
    local agent="$1"
    local task="$2"
    
    if [ -z "$agent" ] || [ -z "$task" ]; then
        show_agents
        exit 1
    fi
    
    # Check if agent exists
    if [ -z "${MICRO_AGENTS[$agent]}" ]; then
        echo ""
        echo "  ${RED}✗ Unknown agent: $agent${NC}"
        echo ""
        echo "  Run './micro.sh list' to see all available agents"
        echo ""
        exit 1
    fi
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║               🎯 MICRO-AGENT: $agent"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  ${CYAN}Task:${NC} $task"
    echo "  ${CYAN}Role:${NC} ${MICRO_AGENTS[$agent]}"
    echo ""
    
    # Get system prompt for this agent
    local system_prompt=""
    case "$agent" in
        researcher)
            system_prompt="You are a research micro-agent. Search the web, find relevant information, and summarize findings. Be thorough but concise. Cite sources."
            ;;
        researcher-deep)
            system_prompt="You are a deep research micro-agent. Conduct thorough research on the topic. Cover multiple sources, perspectives, and implications. Provide a comprehensive report."
            ;;
        comparer)
            system_prompt="You are a comparison micro-agent. Compare the options. List pros and cons clearly. Give a recommendation with reasoning."
            ;;
        summarizer)
            system_prompt="You are a summarization micro-agent. Summarize the input into key points. Extract the most important information. Be concise."
            ;;
        explainer)
            system_prompt="You are an explanation micro-agent. Explain the concept clearly and simply. Use analogies. Avoid jargon."
            ;;
        coder)
            system_prompt="You are a coding micro-agent. Write clean, working code. Include comments. Handle errors. Deliver complete code."
            ;;
        debugger)
            system_prompt="You are a debugging micro-agent. Analyze the bug, identify root cause, and provide a fix. Explain what went wrong and how to prevent it."
            ;;
        bug-hunt)
            system_prompt="You are a bug-hunting micro-agent. Review code for potential bugs, edge cases, and issues. Be thorough and critical."
            ;;
        optimizer)
            system_prompt="You are an optimization micro-agent. Identify performance bottlenecks. Suggest specific optimizations with expected impact."
            ;;
        security-scan)
            system_prompt="You are a security micro-agent. Review code for vulnerabilities: injection, auth issues, data exposure, etc."
            ;;
        refactor)
            system_prompt="You are a refactoring micro-agent. Improve code structure without changing behavior. Make it cleaner, more maintainable."
            ;;
        test-writer)
            system_prompt="You are a testing micro-agent. Write comprehensive unit tests. Cover happy path and edge cases. Use appropriate framework."
            ;;
        code-review)
            system_prompt="You are a code review micro-agent. Review for quality, bugs, security, best practices. Provide specific feedback."
            ;;
        review-summary)
            system_prompt="You are a review summary micro-agent. Summarize findings into actionable items grouped by severity."
            ;;
        api-designer)
            system_prompt="You are an API design micro-agent. Design clean REST endpoints. Define schemas. Follow REST best practices."
            ;;
        db-designer)
            system_prompt="You are a database design micro-agent. Design efficient schema. Define tables, relationships, indexes."
            ;;
        query-writer)
            system_prompt="You are a query micro-agent. Write efficient SQL/NoSQL queries. Optimize for performance."
            ;;
        doc-writer)
            system_prompt="You are a documentation micro-agent. Write clear technical docs. Use proper formatting. Include examples."
            ;;
        readme-writer)
            system_prompt="You are a README micro-agent. Write a complete README with overview, installation, usage, examples."
            ;;
        changelog-writer)
            system_prompt="You are a changelog micro-agent. Write changelog entries following Keep a Changelog format."
            ;;
        comment-writer)
            system_prompt="You are a code commenting micro-agent. Add clear comments explaining WHY, not WHAT. Improve code clarity."
            ;;
        commit-writer)
            system_prompt="You are a commit message micro-agent. Write conventional commit messages: type(scope): description"
            ;;
        pr-writer)
            system_prompt="You are a PR description micro-agent. Write clear PR descriptions: what, why, how. Reference issues."
            ;;
        error-explainer)
            system_prompt="You are an error explanation micro-agent. Explain the error clearly. Cause and fix. Prevention tips."
            ;;
        fix-suggest)
            system_prompt="You are a fix suggestion micro-agent. Analyze broken code, identify issues, provide concrete fixes."
            ;;
        planner)
            system_prompt="You are a planning micro-agent. Break down complex task into clear, actionable steps. Estimate time."
            ;;
        architect)
            system_prompt="You are an architecture micro-agent. Design system structure. Define components, interactions, patterns."
            ;;
    esac
    
    # Log to activity
    echo "[$(date)] MICRO: $agent | $task" >> "$AGENT_DIR/activity.log"
    
    # Save task
    local task_file="$AGENT_DIR/${agent}-$(date +%s).json"
    cat > "$task_file" << EOF
{
    "agent": "$agent",
    "task": "$task",
    "system_prompt": "$system_prompt",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "ready"
}
EOF
    
    echo "  ✓ Task saved: $(basename "$task_file")"
    echo ""
    
    # Output spawn command for duck-cli
    echo "  ┌─────────────────────────────────────────────────────────────┐"
    echo "  │  🤖 TO EXECUTE IN DUCK CLI                               │"
    echo "  └─────────────────────────────────────────────────────────────┘"
    echo ""
    echo "  sessions_spawn({"
    echo "    task: \`$task"
    echo ""
    echo "    [MICRO-AGENT: $agent]"
    echo "    Role: ${MICRO_AGENTS[$agent]}"
    echo ""
    echo "    $system_prompt"
    echo "    \`,"
    echo "    model: \"minimax/MiniMax-M2.7\","
    echo "    label: \"micro-$agent\""
    echo "  })"
    echo ""
}

case "$1" in
    -h|--help|help|"") show_agents ;;
    list) show_agents ;;
    history)
        echo ""
        echo "  📜 Micro-Agent History:"
        echo ""
        if [ -f "$AGENT_DIR/activity.log" ]; then
            tail -15 "$AGENT_DIR/activity.log" | sed 's/^/     /'
        else
            echo "     No history yet."
        fi
        echo ""
        ;;
    *) spawn "$1" "$2" ;;
esac
