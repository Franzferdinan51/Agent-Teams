# Agent Memory Systems

## Top Tier Solutions

| System | Best For | Stars | License | Architecture |
|--------|----------|-------|---------|--------------|
| **Mem0** | Best overall | ~48K | Apache 2.0 | Vector + Graph hybrid |
| **Zep/Graphiti** | Temporal/conversational | ~24K | Apache 2.0 | Temporal knowledge graph |
| **Letta** | OS-style tiered memory | ~21K | Apache 2.0 | Tiered (short/long) |

## Quick Start

### Mem0 (Recommended)
```python
from mem0 import Memory

client = Memory()
client.add("User prefers dark mode", user_id="user123")

# Query
results = client.search("What are user preferences?", user_id="user123")
```

### Zep
```python
from zep_cloud import ZepMemory

memory = ZepMemory(user_id="user123")
memory.add("Session summary...", metadata={"topic": "coding"})
results = memory.search("What did we discuss?")
```

### Letta
```python
from letta import Letta

client = Letta()
client.create_agent_memory(agent_id="agent1", memory_blocks=[...])
```

## Key Patterns

**Personalization memory** (user preferences) ≠ **Institutional memory** (org knowledge)

Context windows (even 1M tokens) don't solve memory — you need structured retrieval.

## Integration with AgentTeams

```
Agent execution → Memory store (Mem0/Zep/Letta)
                       ↓
              Query relevant context
                       ↓
              Next agent execution
```

## Resources

- Mem0: https://docs.mem0.ai/platform/quickstart
- Zep: https://www.getzep.com/
- Letta: https://letta.com/
- Cognee (local-first): https://cognee.ai/

## Status

Added: 2026-04-19
From: 5-agent parallel research session