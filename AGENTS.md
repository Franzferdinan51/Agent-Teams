# AgentTeams v1.0.0 — Agent Coordination Guidance

## For All Agents

When working in AgentTeams, you MUST use the Agent Mesh API for coordination.

**Mesh Server:** `http://localhost:4000`
**API Key:** `openclaw-mesh-default-key`

---

## Quick Start (Auto-Register on Boot)

```bash
# Auto-register when agent starts
curl -X POST http://localhost:4000/api/agents/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: openclaw-mesh-default-key" \
  -d '{
    "name": "my-agent",
    "version": "1.0.0",
    "endpoint": "http://localhost:3000",
    "capabilities": ["coding", "research"],
    "room": "default"
  }'
```

---

## Agent Guidance Rules

### 1. ALWAYS Register on Start
```
On boot → Register with mesh → Announce capabilities
```

### 2. Use Mesh for All Agent-to-Agent Communication
```
❌ DON'T: Direct function calls between agents
✅ DO: Send messages via mesh API
```

### 3. Broadcast Status Updates
```
On task start → Post to mesh
On progress → Post to mesh  
On completion → Post to mesh
```

### 4. Poll for Tasks
```
Every 30s → Check mesh inbox → Process tasks
```

### 5. Coordinate via Rooms
```
Research room: researcher agents collaborate
Build room: coder agents coordinate
Review room: reviewer agents QA
```

---

## Message Protocol

### Standard Message Format
```json
{
  "type": "task|status|result|error",
  "from": "agent-name",
  "to": "room-name|agent-name",
  "version": "1.0.0",
  "content": {},
  "round": 1,
  "timestamp": 1713500000000
}
```

### Message Types

| Type | Use For | Example |
|------|---------|---------|
| `task` | Assign work | `{"type": "task", "content": {"action": "research", "topic": "AI"}}` |
| `status` | Progress | `{"type": "status", "content": {"progress": 50, "step": "coding"}}` |
| `result` | Deliver output | `{"type": "result", "content": {"findings": [...]}}` |
| `error` | Report failure | `{"type": "error", "content": {"code": "TIMEOUT", "msg": "..."}}` |

---

## Version Compatibility

| Component | Version | Notes |
|-----------|---------|-------|
| AgentTeams Core | 1.0.0 | Semantic versioning |
| Agent Mesh API | 1.0.0 | API version |
| Skills | 1.0.0 | Each skill versioned |
| Agents | 1.0.0 | Per-agent version |

**Always include version in all API calls.**

---

## QA Verification Loop

Every task MUST go through QA verification:

```
Task → Implement → QA Check → If Fail → Fix → QA Check → If Pass → Done
                         ↑                                    │
                         └────────────────────────────────────┘
```

### QA Agents

| QA Agent | Checks |
|----------|--------|
| `qa-test-writer` | Tests written before implementation |
| `qa-code-review` | Code follows best practices |
| `qa-security-scan` | No security vulnerabilities |
| `qa-performance` | Performance meets targets |
| `qa-documentation` | Docs complete |

### QA Loop Pattern

```bash
# Round 1: Implement
./spawn-agent.sh coder "Build feature X"

# Round 2: QA Check 1
./spawn-agent.sh qa-test-writer "Test feature X"
./spawn-agent.sh qa-security-scan "Scan feature X"

# Round 3: If issues found, fix
./spawn-agent.sh coder "Fix issues from QA"

# Round 4: QA Check 2 (re-verify)
./spawn-agent.sh qa-code-review "Re-review fixed code"

# Round 5: If pass, done
# Output: Verified feature
```

### QA Threshold
- All critical checks must pass
- High priority checks must pass
- Medium/Low can have warnings but no blockers

---

## Multi-Round Coordination

### Round N Protocol

```javascript
// On each round:
1. Read context from mesh (previous rounds)
2. Do work
3. Write result to mesh
4. Notify next agent
```

### Long-Running Task Pattern

```
Round 1: Researcher → posts findings
Round 2: Designer → reads research → posts design
Round 3: Coder → reads design → posts code
Round 4: QA → reads code → posts results
Round 5: If fail → Coder fixes
Round 6: QA re-verifies
... continues until QA passes
```

---

## Failure Handling

### On Agent Failure

1. Post error to mesh: `{"type": "error", "from": "agent-x", "msg": "..."}`
2. Other agents continue if possible
3. Orchestrator spawns replacement agent
4. Replacement reads context from mesh

### On Mesh Failure

1. Fall back to direct agent-to-agent
2. Log issue
3. Report when mesh returns

---

## Example: Complete Task Flow

```bash
# 1. Agent boots, auto-registers
curl -X POST http://localhost:4000/api/agents/register ...

# 2. Agent joins room
curl -X POST http://localhost:4000/api/rooms/join \
  -d '{"room": "build-api", "agentId": "coder-1"}'

# 3. Receive task
TASK=$(curl http://localhost:4000/api/agents/coder-1/inbox ...)
echo "$TASK" | jq .

# 4. Do work (multi-round)
curl -X POST http://localhost:4000/api/messages \
  -d '{"type": "status", "round": 1, "content": {"step": "implementing"}}'

# 5. Post result
curl -X POST http://localhost:4000/api/messages \
  -d '{"type": "result", "round": 1, "content": {"code": "..."}}'

# 6. QA checks
curl -X POST http://localhost:4000/api/messages \
  -d '{"type": "task", "to": "qa-review", "content": {"check": "code-review"}}'
```

---

## Status Checks

### Health Monitoring

```bash
# Check all agents
curl http://localhost:4000/api/agents \
  -H "X-API-Key: openclaw-mesh-default-key"

# Check specific agent
curl http://localhost:4000/api/agents/:id

# Check room
curl http://localhost:4000/api/rooms/:name
```

---

## Integration with duck-cli Meta-Agent

AgentTeams uses the same Meta-Agent cycle from duck-cli:

```
Plan → Execute → Critic → Heal → Learn → (loop via mesh)
```

### Coordination

- **Meta-Planner** → Plans work via mesh
- **Sub-agents** → Execute tasks, post to mesh
- **Meta-Critic** → Evaluates results from mesh
- **Meta-Healer** → Fixes failures, notifies via mesh
- **Meta-Learner** → Logs to mesh shared memory

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-19 | Initial release |

---

**All agents MUST follow this guidance.**
**Use mesh, use versions, use QA loops.**