# AgentTeams v1.0.0 — Agent Guidance

## For All Agents

When working in AgentTeams, you MUST use the Agent Mesh API for live coordination.

**Mesh Server:** `http://localhost:4000`
**WebSocket:** `ws://localhost:4000`
**API Key:** `openclaw-mesh-default-key`

---

## ⭐ CRITICAL: Live Communication Rules

### 1. ALWAYS Connect via WebSocket for Live Messaging

```
❌ DON'T: Only use HTTP polling (slow, 5-30s delays)
✅ DO: Use WebSocket for real-time messaging (<100ms latency)
```

### 2. Stay Connected During Task Execution

```javascript
// Connect once, stay connected
const messenger = new LiveMessenger('my-agent');
await messenger.connect();
messenger.startHeartbeat(30000); // Ping every 30s

// Send messages live
messenger.sendTo('other-agent', 'Starting task...');
messenger.broadcast('build-room', '50% complete');
```

### 3. Subscribe to Relevant Rooms

```javascript
// Join coordination room
messenger.subscribe('build-api', (msg) => {
    console.log(`${msg.from}: ${msg.content}`);
});

// Join research room
messenger.subscribe('research', (msg) => {
    handleResearchUpdate(msg);
});
```

### 4. Broadcast Progress Updates

```
Every major step → Broadcast to room
  - "Starting implementation"
  - "50% done, found issue X"
  - "Complete, passing to QA"
```

### 5. Direct Message for Task Handoffs

```
Agent A → Agent B: "Your turn! Here's the context..."
Agent B → Agent A: "Done! Results: ..."
```

---

## Quick Start (Auto-Register + Live Connect)

```bash
# Option 1: Node.js (recommended for live messaging)
node scripts/live-messenger.js my-agent

# Option 2: Bash (HTTP polling)
./scripts/live-coord.sh join my-room

# Option 3: Demo (see live chat in action)
node scripts/live-messenger.js --demo
```

---

## Live Messaging Protocol

### Message Types

| Type | Use For | Latency |
|------|---------|---------|
| `message` | Direct agent-to-agent | <100ms |
| `broadcast` | Room-wide announcement | <100ms |
| `status` | Progress update | <100ms |
| `heartbeat` | Keep-alive | <100ms |

### Message Format

```json
{
  "type": "message|broadcast|status|heartbeat",
  "from": "agent-name",
  "to": "agent-name|room-name",
  "version": "1.0.0",
  "content": "...",
  "timestamp": 1713500000000,
  "room": "room-name"
}
```

---

## Live Coordination Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIVE AGENT SESSION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CONNECT                                                     │
│     ├── HTTP register → get agent ID                          │
│     └── WebSocket connect → stay alive                          │
│                                                                 │
│  2. JOIN ROOM                                                   │
│     ├── Subscribe to room (e.g., "build-api")                  │
│     └── Receive live messages instantly                          │
│                                                                 │
│  3. EXECUTE TASKS (live updates)                                │
│     ├── Broadcast: "Starting task X"                            │
│     ├── SendTo: "Here's your assignment, Agent B"               │
│     ├── Broadcast: "50% done"                                   │
│     ├── Receive feedback from other agents                       │
│     └── Broadcast: "Complete!"                                 │
│                                                                 │
│  4. HEARTBEAT (every 30s)                                       │
│     └── Ping mesh to stay registered                            │
│                                                                 │
│  5. DISCONNECT (when done)                                     │
│     └── Clean shutdown                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example: Live Research → Build → Review

```javascript
// researcher.js
const { LiveMessenger } = require('./scripts/live-messenger');

async function run() {
    const messenger = new LiveMessenger('researcher-1');
    await messenger.connect();
    messenger.startHeartbeat();

    // Subscribe to research room
    messenger.subscribe('research', (msg) => {
        console.log(`[Research] ${msg.from}: ${msg.content}`);
    });

    // Do research
    messenger.broadcast('research', 'Starting research on API best practices...');
    
    const results = await doResearch();
    
    messenger.broadcast('research', `Research complete! Found ${results.length} patterns.`);
    
    // Send to coder
    messenger.sendTo('coder-1', `Here are the findings: ${JSON.stringify(results)}`);
}

// coder.js
async function run() {
    const messenger = new LiveMessenger('coder-1');
    await messenger.connect();
    messenger.startHeartbeat();

    messenger.subscribe('build', async (msg) => {
        if (msg.from === 'researcher-1') {
            messenger.broadcast('build', 'Implementing based on research...');
            
            const code = await build(JSON.parse(msg.content));
            
            messenger.broadcast('build', 'Implementation done!');
            messenger.sendTo('reviewer-1', `Code ready for review: ${code}`);
        }
    });
}

// reviewer.js
async function run() {
    const messenger = new LiveMessenger('reviewer-1');
    await messenger.connect();
    messenger.startHeartbeat();

    messenger.subscribe('review', async (msg) => {
        if (msg.from === 'coder-1') {
            messenger.broadcast('review', 'Starting review...');
            
            const issues = await review(msg.content);
            
            if (issues.length === 0) {
                messenger.broadcast('review', '✅ APPROVED!');
            } else {
                messenger.broadcast('review', `❌ Found ${issues.length} issues: ${issues.join(', ')}`);
                messenger.sendTo('coder-1', `Fix these: ${issues.join(', ')}`);
            }
        }
    });
}
```

---

## Script Reference

| Script | Purpose | Live? |
|--------|---------|-------|
| `live-messenger.js` | Node.js WebSocket messaging | ✅ Real-time |
| `live-coord.sh` | Bash coordination commands | ⚡ Fast |
| `mesh-register.js` | HTTP registration | ❌ Polling |
| `session-manager.js` | Session + context loading | ❌ Polling |

**For real-time coordination, use `live-messenger.js`**

---

## Failure Handling

### On WebSocket Disconnect

```javascript
ws.on('close', () => {
    console.log('Disconnected, attempting reconnect...');
    setTimeout(reconnect, 5000);
});

async function reconnect() {
    try {
        await messenger.connect();
        messenger.subscribe(currentRoom);
    } catch {
        setTimeout(reconnect, 10000);
    }
}
```

### On Agent Failure

1. Post error to mesh via WebSocket: `broadcast('coordination', 'ERROR: agent X failed')`
2. Other agents receive live and can react
3. Orchestrator spawns replacement agent
4. Replacement reads MEMORY.md for context

---

## Version Compatibility

| Component | Version | Notes |
|-----------|---------|-------|
| AgentTeams Core | 1.0.0 | Semantic versioning |
| Agent Mesh API | 1.0.0 | WebSocket + HTTP |
| Live Messenger | 1.0.0 | Real-time messaging |
| Agents | 1.0.0 | Per-agent version |

**Always include version in all messages.**

---

## Status Checks (Live)

```bash
# Check live mesh status
./live-coord.sh status

# See who's online
curl http://localhost:4000/api/agents \
  -H "X-API-Key: openclaw-mesh-default-key" | jq '.'
```

---

**All agents MUST stay connected for live coordination.**
**Use WebSocket, not HTTP polling.**