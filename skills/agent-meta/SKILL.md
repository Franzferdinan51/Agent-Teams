# Agent Meta — Meta-Agent Orchestration

## Overview

The Meta-Agent follows a **Plan → Execute → Critic → Heal → Learn** cycle for complex task orchestration.

## Meta-Agent Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                      META-AGENT CYCLE                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────┐     ┌─────────┐     ┌─────────┐              │
│   │ PLANNER │────▶│ EXECUTE │────▶│ CRITIC  │              │
│   └─────────┘     └─────────┘     └─────────┘              │
│        │                                  │                   │
│        │              ┌─────────┐         │                   │
│        └─────────────▶│ HEALER │◀────────┘                   │
│                       └─────────┘                              │
│                            │                                   │
│                       ┌─────────┐                              │
│                       │ LEARNER │                              │
│                       └─────────┘                              │
└──────────────────────────────────────────────────────────────┘
```

## Phases

### 1. Planner
- Analyze task complexity (1-10)
- Create execution plan with steps
- Identify required tools/agents
- Estimate time/resources
- Output: Structured plan

### 2. Execute
- Execute planned steps
- Spawn sub-agents as needed
- Coordinate parallel work
- Handle tool outputs
- Output: Raw results

### 3. Critic
- Evaluate execution results
- Check against original goal
- Identify gaps/issues
- Quality assessment
- Output: Evaluation

### 4. Healer
- Diagnose failures
- Retry with fixes
- Fallback to alternative approaches
- Recover gracefully
- Output: Fixed results

### 5. Learner
- Extract lessons from execution
- Log to memory for future reference
- Update patterns/best practices
- Share learnings with team
- Output: Learned insights

## Meta-Agent Task Routing

| Complexity | Route |
|------------|-------|
| 1-3 | Fast path (direct execution) |
| 4-6 | Best model + optional council |
| 7-10 | Full meta-agent cycle |

## CLI Commands

```bash
# Preview plan (no execution)
./scripts/meta-plan.sh "Build a REST API"

# Full execution with meta-agent
./scripts/meta-run.sh "Build a REST API"

# Show learnings
./scripts/meta-learnings.sh
```

## Team Integration

Add meta-agent to team workflow:

```bash
# Add meta task
./team-task.sh add "Complex build task" meta

# Spawn meta-agent
./scripts/spawn-meta.sh "Build weather API wrapper"
```

## Complexity Scoring

```javascript
{
  "simple": 1-3,      // Quick lookup, simple command
  "medium": 4-6,       // Multi-step, some coordination
  "complex": 7-10,     // Full meta-agent, council deliberation
}
```

## Meta-Agent Output Format

```json
{
  "task": "...",
  "complexity": 7,
  "plan": ["step 1", "step 2", ...],
  "execution": {
    "steps_completed": 5,
    "results": [...],
    "failures": []
  },
  "critique": {
    "passed": true,
    "issues": []
  },
  "learnings": [
    "Lesson 1",
    "Lesson 2"
  ]
}
```

## When to Use

- Complex multi-step tasks
- Tasks requiring multiple agents
- Uncertain approach (meta-agent figures it out)
- Tasks that failed before (healer phase)
- Learning opportunities for future

## Duck CLI Meta Commands

If using duck-cli:
```bash
./duck meta plan "task"   # Preview plan
./duck meta run "task"    # Full execution
./duck meta learnings     # Show lessons
```

## Status

Built: 2026-04-18
