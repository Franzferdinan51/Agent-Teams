# Why Native > hikarioyama/swarm-agent

> A frank comparison and the case for building our own.

## The External Dependency Problem

`hikarioyama/swarm-agent` is a perfectly fine library — but it comes with baggage:

### 1. Dependency Lock-in

```json
// package.json (hikarioyama/swarm-agent)
{
  "dependencies": {
    "swarm-agent": "^1.2.0",  // May break on Node upgrades
    "openai": "^4.0.0",        // Overrides our OpenAI version
    "langchain": "^0.1.0"      // 2MB+ overhead we don't need
  }
}
```

Our native implementation:
```json
// Our package.json — Agent-Teams only
{
  "dependencies": {
    "ws": "^8.16.0"  // Already installed for the mesh
  }
}
```

### 2. Protocol Mismatch

`swarm-agent` uses its own agent protocol. We have the **Agent Mesh** — a battle-tested WebSocket protocol that our whole bot squad already speaks.

```
swarm-agent protocol:
  Agent A ──→ swarm-agent ──→ Agent B
               (mediator)

Our protocol (Agent Mesh):
  Any Agent ──→ Mesh Server (:4000) ──→ Any Agent
                (already running)
```

Integrating swarm-agent means running *two* agent coordination systems. That's two points of failure, two sets of logs, two places to debug.

### 3. Council Integration

`swarm-agent` has no concept of an "AI council." Our consensus-engine directly wires to the council API (port 3001) that Duckets already uses for CannaAI deliberations.

```javascript
// swarm-agent: no council support
const result = await swarm.run("Should we refactor?");

// Ours: full council deliberation
const { pollId } = await createPoll(
  "Should we refactor the auth system?",
  ["Yes, now", "Wait 2 weeks", "No"]
);
await councilDeliberate(pollId, councilors);  // 8 personas weigh in
```

### 4. Write-Through State

swarm-agent is in-memory by default. Our swarm writes every step to disk:

```
build-logs/
├── decompositions/   ← every goal → subtasks
├── dispatches/       ← every dispatch event
├── aggregations/     ← every synthesis
├── swarm-runs/       ← complete run records
└── consensus/        ← every poll + votes
```

Crash mid-swarm? Resume from disk. Audit a decision from 3 weeks ago? It's there.

### 5. Customization Cost

When swarm-agent doesn't do exactly what we need (and it won't — Duckets' setup is non-standard):

```
swarm-agent path:          Our path:
1. File issue             1. Edit the file
2. Wait for maintainer    2. Commit immediately
3. Hope it's fixed        3. Test + deploy same tick
4. Update dependency      4. Done
```

## Feature Comparison

| Feature | swarm-agent | Ours |
|---------|-------------|------|
| Native to Agent-Teams | ❌ | ✅ |
| Uses existing mesh | ❌ | ✅ |
| Council integration | ❌ | ✅ |
| Write-through state | ❌ | ✅ |
| Dark theme WebUI | ❌ | ✅ |
| No extra deps | ❌ | ✅ |
| Tailscale-friendly (0.0.0.0) | ❌ | ✅ |
| Hermes skill wiring | ❌ | ✅ |
| Customizable prompts | Via config | Direct file edit |
| Debugging | External lib | Print statements |

## Code Size Comparison

```bash
# swarm-agent (full install)
du -sh node_modules/swarm-agent/
# → ~45MB (langchain + openai + swarm-agent)

# Our implementation
du -sh hive-swarm-enhancements/
# → ~2MB (our code only)
```

## Real Cost: Integration Time

swarm-agent would need:
- Adapter layer to translate to mesh protocol (~200 lines)
- Council bridge to call our existing API (~100 lines)
- State persistence shim (~150 lines)
- Custom prompt engineering for our domains (~100 lines)
- **Total: ~550 lines of glue code we'd have to maintain anyway**

That's not saving work. That's adding a dependency *and* writing glue code.

## The Final Case

Duckets' setup:
- Agent Mesh at port 4000 (WebSocket, real-time)
- Council API at port 3001 (HTTP, 8 personas)
- Hermes (daily cron, Telegram delivery)
- Local LM Studio (zero cost)

The native Hive Swarm layer:
- Speaks mesh natively — workers are real agents
- Wires to council directly — consensus is first-class
- Hermes can call it via skill — `swarm "..."` in any cron
- WebUI ties it all together — real-time visibility

`swarm-agent` would sit *alongside* all this, not *in* it. Every swarm run would be: `swarm-agent → mesh adapter → mesh → workers`. That's two hops and a protocol translation for every message.

Ours: `planner → mesh → workers`. One hop. Native.

**Bottom line: The cleanest integration is no integration layer at all.**
