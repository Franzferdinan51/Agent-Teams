#!/bin/bash
# collab.sh — Spawn a collaborative multi-agent workflow
# Usage: ./collab.sh <type>

TEAM_DIR="$HOME/Desktop/AgentTeam"
WORKSPACE="$TEAM_DIR/workspace"
mkdir -p "$WORKSPACE"/{collab,artifacts}

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🤝 COLLABORATIVE MULTI-AGENT WORKFLOWS                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

show_workflows() {
    echo "  Available Workflows:"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  🔍 RESEARCH PIPELINE                                   │"
    echo "  │  Parallel research → Aggregate → Synthesize            │"
    echo "  │  ./collab.sh research                                  │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  🏗️  BUILD PIPELINE                                      │"
    echo "  │  Design → Code → Test → Review → Deploy                 │"
    echo "  │  ./collab.sh build                                     │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  📝 WRITE PIPELINE                                       │"
    echo "  │  Outline → Draft → Review → Edit → Publish              │"
    echo "  │  ./collab.sh write                                      │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  🔧 DEBUG PIPELINE                                      │"
    echo "  │  Reproduce → Hunt → Fix → Test → Verify                 │"
    echo "  │  ./collab.sh debug                                      │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  📊 ANALYZE PIPELINE                                   │"
    echo "  │  Collect → Analyze → Compare → Recommend                │"
    echo "  │  ./collab.sh analyze                                    │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  🚀 SHIP PIPELINE                                       │"
    echo "  │  Build → Test → Security Scan → Deploy → Monitor        │"
    echo "  │  ./collab.sh ship                                       │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
}

workflow_research() {
    echo ""
    echo "  ═══════════════════════════════════════════════════════════"
    echo "     🔍 RESEARCH PIPELINE"
    echo "  ═══════════════════════════════════════════════════════════"
    echo ""
    echo "  Pattern: Agent Teams + Shared State"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  PHASE 1: Parallel Research (5 agents)                   │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    
    local topic="${1:-AI agent frameworks}"
    
    echo "  Topic: $topic"
    echo ""
    echo "  Spawning 5 research micro-agents in parallel..."
    echo ""
    
    echo "  1. ${CYAN}researcher${NC} — General overview"
    echo "  2. ${CYAN}researcher-deep${NC} — Deep dive"
    echo "  3. ${CYAN}comparer${NC} — Compare alternatives"
    echo "  4. ${CYAN}summarizer${NC} — Key findings"
    echo "  5. ${CYAN}explainer${NC} — Explain concepts"
    echo ""
    
    echo "  Commands:"
    echo "  ./micro.sh researcher '$topic'"
    echo "  ./micro.sh researcher-deep '$topic'"
    echo "  ./micro.sh comparer '$topic vs alternatives'"
    echo "  ./micro.sh summarizer '$topic summary'"
    echo "  ./micro.sh explainer '$topic explained simply'"
    echo ""
    
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  PHASE 2: Aggregate Results                            │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  After agents complete, aggregate findings to:"
    echo "  $WORKSPACE/collab/research-$(date +%s).md"
    echo ""
}

workflow_build() {
    echo ""
    echo "  ═══════════════════════════════════════════════════════════"
    echo "     🏗️  BUILD PIPELINE"
    echo "  ═══════════════════════════════════════════════════════════"
    echo ""
    echo "  Pattern: Orchestrator-Subagent + Generator-Verifier"
    echo ""
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  PHASE 1: Design                                       │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    
    local project="${1:-REST API}"
    
    echo "  Project: $project"
    echo ""
    echo "  1. ./micro.sh architect 'Design $project architecture'"
    echo "  2. ./micro.sh api-designer 'Design API for $project'"
    echo "  3. ./micro.sh db-designer 'Design DB schema for $project'"
    echo ""
    
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  PHASE 2: Implement (Parallel)                         │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  4. ./spawn-agent.sh coder 'Build backend for $project'"
    echo "  5. ./spawn-agent.sh coder 'Build frontend for $project'"
    echo ""
    
    echo "  ┌─────────────────────────────────────────────────────────┐"
    echo "  │  PHASE 3: Test & Review                              │"
    echo "  └─────────────────────────────────────────────────────────┘"
    echo ""
    echo "  6. ./micro.sh test-writer 'Write tests for $project'"
    echo "  7. ./micro.sh code-review 'Review $project code'"
    echo "  8. ./micro.sh security-scan 'Security review of $project'"
    echo ""
}

workflow_write() {
    echo ""
    echo "  ═══════════════════════════════════════════════════════════"
    echo "     📝 WRITE PIPELINE"
    echo "  ═══════════════════════════════════════════════════════════"
    echo ""
    echo "  Pattern: Pipeline + Shared State"
    echo ""
    
    local topic="${1:-technical documentation}"
    
    echo "  Topic: $topic"
    echo ""
    echo "  1. ./micro.sh planner 'Outline $topic'"
    echo "  2. ./micro.sh readme-writer 'Write $topic README'"
    echo "  3. ./micro.sh doc-writer 'Write $topic docs'"
    echo "  4. ./micro.sh reviewer 'Review $topic for clarity'"
    echo "  5. ./micro.sh summarizer 'Create $topic quick reference'"
    echo ""
}

workflow_debug() {
    echo ""
    echo "  ═══════════════════════════════════════════════════════════"
    echo "     🔧 DEBUG PIPELINE"
    echo "  ═══════════════════════════════════════════════════════════"
    echo ""
    echo "  Pattern: Generator-Verifier + Message Bus"
    echo ""
    
    local bug="${1:-the null pointer error}"
    
    echo "  Bug: $bug"
    echo ""
    echo "  1. ./micro.sh debugger 'Reproduce and fix: $bug'"
    echo "  2. ./micro.sh bug-hunt 'Find similar bugs in codebase'"
    echo "  3. ./micro.sh error-explainer 'Explain why $bug happened'"
    echo "  4. ./micro.sh test-writer 'Write regression tests for $bug'"
    echo "  5. ./micro.sh fix-suggest 'Prevent $bug in future'"
    echo ""
}

workflow_analyze() {
    echo ""
    echo "  ═══════════════════════════════════════════════════════════"
    echo "     📊 ANALYZE PIPELINE"
    echo "  ═══════════════════════════════════════════════════════════"
    echo ""
    echo "  Pattern: Agent Teams + Shared State"
    echo ""
    
    local subject="${1:-the codebase}"
    
    echo "  Subject: $subject"
    echo ""
    echo "  1. ./micro.sh researcher 'Research $subject architecture'"
    echo "  2. ./micro.sh researcher 'Research $subject tech stack'"
    echo "  3. ./micro.sh comparer 'Compare $subject to alternatives'"
    echo "  4. ./micro.sh security-scan 'Security analysis of $subject'"
    echo "  5. ./micro.sh optimizer 'Performance analysis of $subject'"
    echo ""
    echo "  Then aggregate all findings into analysis report."
    echo ""
}

workflow_ship() {
    echo ""
    echo "  ═══════════════════════════════════════════════════════════"
    echo "     🚀 SHIP PIPELINE"
    echo "  ═══════════════════════════════════════════════════════════"
    echo ""
    echo "  Pattern: Full Pipeline + All Patterns"
    echo ""
    
    local project="${1:-the feature}"
    
    echo "  Project: $project"
    echo ""
    echo "  1. ./spawn-swarm.sh 'Build $project with swarm coding'"
    echo ""
    echo "  2. ./micro.sh test-writer 'Write comprehensive tests'"
    echo "  3. ./micro.sh security-scan 'Full security audit'"
    echo "  4. ./micro.sh optimizer 'Performance optimization check'"
    echo ""
    echo "  5. ./spawn-council.sh 'Review $project for release?' adversarial"
    echo ""
    echo "  6. If council approves:"
    echo "     ./spawn-agent.sh coder 'Deploy $project to production'"
    echo ""
}

case "$1" in
    -h|--help|"") show_workflows ;;
    research) workflow_research "$2" ;;
    build) workflow_build "$2" ;;
    write) workflow_write "$2" ;;
    debug) workflow_debug "$2" ;;
    analyze) workflow_analyze "$2" ;;
    ship) workflow_ship "$2" ;;
    list) show_workflows ;;
    *)
        echo "  ${RED}✗ Unknown workflow: $1${NC}"
        echo ""
        show_workflows
        ;;
esac
