# Multi-Agent Coordination Patterns

## The 5 Patterns

Based on Claude's multi-agent coordination research.

### 1. Generator-Verifier 🔄

**Use when:** Quality-critical output with explicit evaluation criteria.

```
┌───────────┐     ┌───────────┐
│ GENERATOR │────▶│ VERIFIER  │
└───────────┘     └─────┬─────┘
     ▲                    │
     └─────────│  Feedback Loop │
               └─────────────┘
```

**Best for:**
- Code generation (write + test)
- Email responses (draft + review)
- Compliance verification
- Fact-checking

**Example:**
```bash
# Write code
./micro.sh coder "Generate auth module"
# Verify it
./micro.sh code-review "Verify auth module quality"
```

### 2. Orchestrator-Subagent 👔

**Use when:** Clear task decomposition with bounded subtasks.

```
           ┌─────────────┐
           │ ORCHESTRATOR│
           └──────┬──────┘
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│SUB-AG 1│ │SUB-AG 2│ │SUB-AG 3│
└────────┘ └────────┘ └────────┘
```

**Best for:**
- Code review (security + style + tests + architecture)
- Complex builds (design → code → test → deploy)
- Research reports (gather + analyze + write)

**Example:**
```bash
./spawn-agent.sh orchestrator "Build a REST API"
# Orchestrator dispatches to coder, reviewer, tester
```

### 3. Agent Teams 👥

**Use when:** Parallel independent subtasks.

```
┌────────┐ ┌────────┐ ┌────────┐
│AGENT 1 │ │AGENT 2 │ │AGENT 3 │
│(task A)│ │(task B)│ │(task C)│
└────┬───┘ └────┬───┘ └────┬───┘
     └─────────┼─────────┘
               ▼
         ┌───────────┐
         │AGGREGATOR│
         └───────────┘
```

**Best for:**
- Research multiple topics simultaneously
- Build multiple features in parallel
- Process multiple data sources

**Example:**
```bash
# Research 5 topics in parallel
./micro.sh researcher "AI news" &
./micro.sh researcher "DB trends" &
./micro.sh researcher "Cloud options" &
./micro.sh researcher "DevOps tools" &
./micro.sh researcher "Security trends" &
wait
```

### 4. Message Bus 🚌

**Use when:** Event-driven pipelines.

```
┌──────────────────────────────────────┐
│           MESSAGE BUS                  │
│   (Shared queue, events, pub/sub)     │
└──────┬───────────────┬───────────────┬──┘
       │               │               │
  ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
  │PRODUCER │    │CONSUMER │    │CONSUMER │
  └─────────┘    └─────────┘    └─────────┘
```

**Best for:**
- CI/CD pipelines (build → test → deploy)
- Data processing pipelines
- Notification systems
- Async task queues

**Example:**
```bash
# Event: code pushed
# Agent A builds → Agent B tests → Agent C deploys
```

### 5. Shared State 📊

**Use when:** Collaborative building where agents build on each other.

```
┌──────────────────────────────────────┐
│         SHARED STATE (DB/Redis)       │
│  - Task queue    - Results           │
│  - Progress      - Conflicts         │
└──────┬───────────────┬───────────────┬──┘
       │               │               │
  ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
  │ AGENT A │    │ AGENT B │    │ AGENT C │
  │ Read/   │    │ Read/   │    │ Read/   │
  │ Write   │    │ Write   │    │ Write   │
  └─────────┘    └─────────┘    └─────────┘
```

**Best for:**
- Research (one finds X, others expand)
- Collaborative writing
- Code generation (backend → frontend → integration)

## Choosing a Pattern

| Pattern | Task Type | Complexity | Example |
|---------|-----------|------------|---------|
| Generator-Verifier | Quality-critical | Medium | Write code + test |
| Orchestrator-Subagent | Decomposable | High | Build full app |
| Agent Teams | Independent | Low-Medium | Research 5 topics |
| Message Bus | Pipeline | Medium | CI/CD pipeline |
| Shared State | Collaborative | Medium | Write book |

## Workflow Templates

### Research Pipeline (Agent Teams)
1. Spawn 5 research agents in parallel
2. Each covers different angle
3. Aggregate to shared state
4. Synthesize final report

### Build Pipeline (Orchestrator-Subagent)
1. Orchestrator plans
2. Dispatches to specialists
3. Collects results
4. Synthesizes output

### Debug Pipeline (Generator-Verifier)
1. Generator attempts fix
2. Verifier checks
3. If fails → feedback loop
4. Until verified or max iterations

## Shared Workspace

All patterns use: `~/Desktop/AgentTeam/workspace/`
- `shared.md` — Shared memory
- `queue.json` — Task queue
- `artifacts/` — Shared files

## Scripts

```bash
./patterns.sh list                    # List all patterns
./patterns.sh generator-verifier    # Show pattern
./patterns.sh orchestrator-subagent # Show pattern
./patterns.sh agent-teams          # Show pattern
./patterns.sh message-bus          # Show pattern
./patterns.sh shared-state        # Show pattern

./collab.sh list                   # List workflows
./collab.sh research               # Research pipeline
./collab.sh build                 # Build pipeline
./collab.sh write                 # Write pipeline
./collab.sh debug                 # Debug pipeline
./collab.sh analyze               # Analyze pipeline
./collab.sh ship                  # Ship pipeline
```

## Status

Built: 2026-04-18
Researched from: Claude, Galileo, Collabnix, arxiv
