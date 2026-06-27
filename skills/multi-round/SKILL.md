# Multi-Round Communication via Agent Mesh

## Why Multi-Round?

Single-round = agent gets task, works, returns. Context lost.

**Multi-round = agents talk back and forth, building context over time.**

```
Single-Round (limited):
  Request → Agent → Response → Done
  ❌ Context lost after response

Multi-Round (powerful):
  Agent A ──→ Agent B ──→ Agent A ──→ Agent B
  ↑                                            │
  └────────────────────────────────────────────┘
           Context growss with each round
```

## Key Benefits

| Benefit | Description |
|---------|-------------|
| **Context grows** | Each round adds to shared understanding |
| **Builds on work** | Agent B builds on Agent A's previous output |
| **No context limits** | Memory stored in mesh, not context window |
| **Failure recovery** | If one agent fails, context survives in mesh |
| **Complex tasks** | Tasks too large for single round become possible |
| **Real collaboration** | True back-and-forth, not just request/response |

## How It Works

```
Round 1: "Research this topic"
  → Agent A researches, posts to mesh

Round 2: "Based on A's research, design API"
  → Agent B reads A's output, designs API, posts to mesh

Round 3: "Review the API design"
  → Agent C reads B's output, reviews, posts to mesh

Round 4: "Implement the approved design"
  → Agent A reads C's review, implements, posts to mesh

... continues until task complete
```

## Mesh Message Types

```bash
# Context message (building context)
{"type": "context", "content": "...", "round": 1}

# Response message (reply to previous)
{"type": "response", "content": "...", "in_reply_to": "msg_id"}

# Status message (progress update)
{"type": "status", "progress": "50%", "current_step": "design"}

# Final message (task complete)
{"type": "final", "content": "...", "summary": true}
```

## Implementation

### Python Client
```python
import requests

MESH_URL = "http://localhost:4000"
API_KEY = "openclaw-mesh-default-key"

class MeshAgent:
    def __init__(self, name, room):
        self.name = name
        self.room = room
        self.context = []
    
    def send(self, message):
        """Send message to mesh"""
        payload = {
            "fromAgent": self.name,
            "room": self.room,
            "message": message,
            "round": len(self.context) + 1
        }
        requests.post(f"{MESH_URL}/api/messages", 
                      json=payload,
                      headers={"X-API-Key": API_KEY})
    
    def receive(self):
        """Receive messages from mesh"""
        resp = requests.get(f"{MESH_URL}/api/rooms/{self.room}/messages",
                           headers={"X-API-Key": API_KEY})
        return resp.json()
    
    def run(self, task, rounds=5):
        """Run multi-round task"""
        self.send(f"Starting task: {task}")
        
        for round_num in range(rounds):
            # Do work
            result = self.do_work(round_num)
            
            # Send result
            self.send(f"Round {round_num + 1} result: {result}")
            
            # Receive responses
            responses = self.receive()
            self.context.append(responses)
```

### Duck CLI Sessions
```javascript
// Round 1: Spawn researcher
sessions_spawn({
  task: "Research REST API best practices",
  label: "research-round-1"
})

// Round 2: Based on research, spawn designer
sessions_spawn({
  task: "Design REST API based on research: {research_output}",
  label: "design-round-2"
})

// Round 3: Based on design, spawn coder
sessions_spawn({
  task: "Implement API based on design: {design_output}",
  label: "code-round-3"
})

// Round 4: Review
sessions_spawn({
  task: "Review implementation: {code_output}",
  label: "review-round-4"
})
```

## Long-Running Task Pattern

```bash
#!/bin/bash
# long-task.sh — Execute long task via multi-round mesh

TASK="$1"
ROUNDS="${2:-10}"

echo "Starting long task: $TASK"
echo "Rounds: $ROUNDS"

# Register with mesh
AGENT_ID=$(curl -s -X POST "$MESH_URL/api/agents/register" \
  -H "X-API-Key: $API_KEY" \
  -d '{"name": "task-executor", "room": "task-'$TASK'"}' | jq -r '.agentId')

# Round loop
for round in $(seq 1 $ROUNDS); do
    echo "=== Round $round ==="
    
    # Get context from previous rounds
    CONTEXT=$(curl -s "$MESH_URL/api/agents/$AGENT_ID/inbox" \
      -H "X-API-Key: $API_KEY")
    
    # Do work based on context
    RESULT=$(do_work "$CONTEXT")
    
    # Post result to mesh
    curl -s -X POST "$MESH_URL/api/messages" \
      -H "X-API-Key: $API_KEY" \
      -d "{\"fromAgentId\": \"$AGENT_ID\", \"message\": \"$RESULT\", \"round\": $round}"
    
    # Check if task complete
    if [[ "$RESULT" == *"COMPLETE"* ]]; then
        echo "Task complete after $round rounds"
        break
    fi
done
```

## Use Cases

| Task | Rounds | Why Multi-Round |
|------|--------|----------------|
| Research report | 5-10 | Compile from multiple sources |
| API build | 4-6 | Design → Implement → Test → Review |
| Code review | 3-5 | Initial → Fix → Re-review → Approve |
| Debug session | 5-10 | Reproduce → Hunt → Fix → Test → Verify |
| Architecture | 6-8 | Research → Design → Review → Revise → Approve |

## Context Persistence

Messages stay in mesh until explicitly cleared:

```bash
# List room messages
curl "$MESH_URL/api/rooms/$ROOM/messages" \
  -H "X-API-Key: $API_KEY"

# Clear old context (when starting fresh)
curl -X DELETE "$MESH_URL/api/rooms/$ROOM" \
  -H "X-API-Key: $API_KEY"
```

## Status

Added: 2026-04-19
Reason: Long-running tasks need multi-round communication to maintain context