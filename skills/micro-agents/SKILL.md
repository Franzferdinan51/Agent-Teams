# Micro-Agents — Intelligent Coordinated Agents

## Concept

Micro-agents are **tiny, single-purpose specialists** that do ONE thing really well. Unlike full agents with broad capabilities, micro-agents are laser-focused — a debugger only debugs, a test-writer only writes tests.

**Key Enhancement:** All micro-agents are coordinated by the Agent Coordinator to prevent spam and maximize efficiency.

## Anti-Spam Coordination Rules

```
┌─────────────────────────────────────────────────────────────────────┐
│                    🤖 AGENT COORDINATOR                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   BEFORE: Without Coordination                                     │
│   ────────────────────────────────────────────────                 │
│   User: "Research 10 topics"                                       │
│   ❌ Spawns 10 agents = 10 API calls, 10x cost                     │
│   ❌ Agents don't know what others are doing                       │
│   ❌ Overwhelms system                                             │
│                                                                     │
│   AFTER: With Agent Coordinator                                    │
│   ────────────────────────────────────────────────                  │
│   User: "Research 10 topics"                                       │
│   ✅ Coordinator batches → Single agent handles all 10             │
│   ✅ Agent knows context of all tasks                              │
│   ✅ 1/10th the cost, better results                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Coordination Rules by Task Type

| Task Type | Max Concurrent | Batch Similar | Check Cache | Strategy |
|-----------|---------------|---------------|-------------|----------|
| **research** | 3 | ✅ Yes | ✅ Yes | Delegate to mesh |
| **coding** | 2 | ❌ No | ❌ No | Spawn fresh |
| **review** | 2 | ✅ Yes | ✅ Yes | Local only |
| **test** | 3 | ✅ Yes | ❌ No | Spawn fresh |
| **default** | 2 | ✅ Yes | ❌ No | Batch |

## Batching Logic

### When We Batch
- Multiple similar tasks (same type) arrive within 5 seconds
- System is at capacity (5+ concurrent agents)
- Tasks are independently batchable (research, read, analyze)

### When We DON'T Batch
- Complex coding tasks (need full context)
- Time-critical tasks (marked priority)
- Tasks requiring different models/expertise

### Example: Research Batching
```
Input:
  1. "Research AI news"
  2. "Research Python trends"
  3. "Research Rust performance"

Without coordinator:
  → 3 separate agents = 3x latency, 3x cost

With coordinator:
  → Single agent: "Research these 3 topics" 
  → 1x latency, 1x cost, better context
```

## Max Agent Limits

### Per Task Type
- Research: 3 max (can batch up to 10)
- Coding: 2 max (complex, don't batch)
- Review: 2 max (can batch up to 5)
- Test: 3 max (can batch up to 10)
- Default: 2 max

### System Wide
- Max concurrent: 5 agents total
- Queue overflow: Tasks wait instead of spawning
- Batch timeout: 5 seconds to collect similar tasks

## Mesh Coordination

Before spawning, agents check the mesh for:
1. **Existing agents** with matching capabilities
2. **Recent results** in shared memory
3. **Active task types** to avoid duplication

```
Agent: "Should I spawn for 'debug auth bug'?"
         │
         ▼
┌─────────────────────────────────┐
│ 1. Check mesh for active agents │
│    Found: 2 agents (coding)     │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. Check shared memory         │
│    Found: "auth bug" fixed 2h  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. Decision: REUSE existing   │
│    or DELEGATE to mesh agent   │
└─────────────────────────────────┘
```

## Anti-Spam Patterns

### Pattern 1: Batch Similar Items
```javascript
// DON'T: Spawn agent per item
for (const topic of topics) {
    spawnAgent({ task: `Research ${topic}` });
}

// DO: Batch into single task
const batch = topics.map(t => `Research: ${t}`).join('\n');
spawnAgent({ task: batch, type: 'research' });
```

### Pattern 2: Coordinate Before Spawn
```javascript
// DON'T: Spawn blindly
spawnAgent({ task: 'fix bug' });

// DO: Check mesh first
const meshStatus = await checkMesh();
if (meshStatus.hasCapability('debugger')) {
    delegateToMesh('fix bug');
} else {
    spawnAgent({ task: 'fix bug' });
}
```

### Pattern 3: Queue When Busy
```javascript
// DON'T: Spawn regardless of load
spawnAgent({ task: 'heavy task' });

// DO: Queue when at capacity
if (activeAgents >= MAX_CONCURRENT) {
    queueTask({ task: 'heavy task', priority: 5 });
} else {
    spawnAgent({ task: 'heavy task' });
}
```

### Pattern 4: Prioritize Critical Tasks
```javascript
// Mark as priority for immediate handling
spawnAgent({ 
    task: 'critical fix', 
    priority: 1,  // High priority
    type: 'critical'
});
```

## Available Micro-Agents

### Research & Analysis
| Agent | Type | Batchable | Max |
|-------|------|-----------|-----|
| `researcher` | research | ✅ | 3 |
| `researcher-deep` | research | ✅ | 2 |
| `comparer` | research | ✅ | 3 |
| `summarizer` | research | ✅ | 5 |
| `explainer` | research | ✅ | 5 |

### Coding
| Agent | Type | Batchable | Max |
|-------|------|-----------|-----|
| `coder` | coding | ❌ | 2 |
| `debugger` | coding | ❌ | 2 |
| `bug-hunt` | coding | ❌ | 2 |
| `optimizer` | coding | ❌ | 2 |
| `security-scan` | review | ✅ | 2 |
| `refactor` | coding | ❌ | 2 |

### Testing & Review
| Agent | Type | Batchable | Max |
|-------|------|-----------|-----|
| `test-writer` | test | ✅ | 3 |
| `code-review` | review | ✅ | 2 |
| `review-summary` | review | ✅ | 2 |

### API & Database
| Agent | Type | Batchable | Max |
|-------|------|-----------|-----|
| `api-designer` | coding | ❌ | 2 |
| `db-designer` | coding | ❌ | 2 |
| `query-writer` | coding | ✅ | 3 |

### Documentation
| Agent | Type | Batchable | Max |
|-------|------|-----------|-----|
| `doc-writer` | write | ✅ | 3 |
| `readme-writer` | write | ✅ | 3 |
| `changelog-writer` | write | ✅ | 5 |
| `comment-writer` | write | ✅ | 5 |

### Planning & Architecture
| Agent | Type | Batchable | Max |
|-------|------|-----------|-----|
| `planner` | coding | ❌ | 1 |
| `architect` | coding | ❌ | 1 |

## Usage

### Coordinator CLI
```bash
# Check coordinator status
./scripts/agent-coordinator.sh status

# Spawn with coordination
./scripts/agent-coordinator.sh spawn research "latest AI news"

# Batch test
./scripts/agent-coordinator.sh batch 10

# View rules
./scripts/agent-coordinator.sh rules

# Get recommendations
./scripts/agent-coordinator.sh recs
```

### Micro-Agent Spawning
```bash
# List all micro-agents
./micro.sh list

# Spawn a micro-agent (auto-coordinated)
./micro.sh researcher "latest AI developments"
./micro.sh coder "add authentication to API"

# Spawn multiple (will be batched)
./micro.sh research "topic1" &
./micro.sh research "topic2" &
./micro.sh research "topic3" &
# Wait for batch flush
```

### Via JavaScript API
```javascript
const { AgentCoordinator } = require('./scripts/agent-coordinator');

// Initialize coordinator
const coordinator = new AgentCoordinator({
    maxConcurrent: 5,
    maxPerTask: 3,
    batchTimeout: 5000
});

// Spawn with automatic coordination
await coordinator.spawn({
    type: 'research',
    command: 'research latest AI developments',
    description: 'Research AI news'
});

// Batch multiple
for (const topic of topics) {
    coordinator.spawn({
        type: 'research',
        command: `Research: ${topic}`
    });
}

// Check status
coordinator.status();
```

## Efficiency Metrics

The coordinator tracks:
- **Total spawned**: Agents actually spawned
- **Total batched**: Tasks combined into batches
- **Batch rate**: % of tasks that were batched
- **Avg efficiency**: ms per task (lower is better)

```
Example Stats:
  Total spawned: 15
  Total batched: 45 (3x efficiency!)
  Batch rate: 75%
  Avg efficiency: 1200ms/task
```

## Mesh Integration

Agents coordinate via mesh:

```javascript
// Before spawning
const mesh = await coordinator.checkMesh();
console.log(`Active agents: ${mesh.activeAgents}`);

// Broadcast coordination
await coordinator.broadcastCoordination({
    type: 'research',
    spawning: 'Python trends',
    capability: 'researcher'
});
```

## Best Practices

1. **Batch similar tasks** — Don't spawn per item
2. **Use priorities** — Mark time-critical tasks
3. **Check mesh first** — Avoid duplicating work
4. **Queue when busy** — Don't overwhelm system
5. **Monitor stats** — Watch for efficiency drops

## Status

Updated: 2026-04-19
Version: 2.0 (with coordination)
Features: Batching, Queue, Mesh, Rules Engine, Anti-Spam
