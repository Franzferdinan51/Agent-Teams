# Active Memory System — AgentTeams v1.0.0

Based on OpenClaw's memory architecture.

## Memory Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMORY HIERARCHY                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 1: SESSION CONTEXT                           │   │
│  │  - Current conversation                             │   │
│  │  - Active task state                                │   │
│  │  - TTL: Until session ends                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 2: DAILY NOTES (memory/YYYY-MM-DD.md)        │   │
│  │  - Today's + yesterday's auto-loaded               │   │
│  │  - Running observations                             │   │
│  │  - TTL: 48 hours then archived                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 3: LONG-TERM (MEMORY.md)                    │   │
│  │  - Durable facts, preferences, decisions          │   │
│  │  - Loaded at every session start                   │   │
│  │  - TTL: Permanent until overwritten                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LAYER 4: DREAM DIARY (DREAMS.md)                  │   │
│  │  - Memory consolidation summaries                  │   │
│  │  - Human review entries                            │   │
│  │  - TTL: Review weekly                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Memory Files

| File | Purpose | Auto-Loaded |
|------|---------|-------------|
| `MEMORY.md` | Long-term durable facts | ✅ At session start |
| `memory/YYYY-MM-DD.md` | Daily running notes | ✅ Today + Yesterday |
| `DREAMS.md` | Dream consolidation diary | ❌ Manual review |
| `memory/.dreams/` | Short-term dreaming store | Internal |

## How It Works

### Session Start
```
Agent boots → Load MEMORY.md → Load today's notes → Load yesterday's notes
                                         ↓
                              Agent has context from past
```

### During Session
```
Important fact → Write to daily notes (memory/YYYY-MM-DD.md)
```

### Before Compaction (Auto-Flush)
```
OpenClaw runs silent turn → Prompts agent to save context → Memory files updated
```

### Dreaming (Background Consolidation)
```
Every 30 min → Subconscious reads session transcripts → LLM extracts insights
     ↓
Scores candidates → Promotes qualified to MEMORY.md → Writes DREAMS.md summary
```

## Memory Tools

```bash
# Search memory (semantic)
memory_search "what does user prefer for API design"

# Read specific memory
memory_get path="MEMORY.md" from=1 lines=50

# Search with filters
memory_search corpus=all maxResults=5 minScore=0.7 query="..."
```

## Integration with Agent Mesh

```
Agent execution → Memory flush to mesh
                       ↓
              All agents share same memory
                       ↓
              Next agent reads context
```

## 3-Layer Memory Pattern

From OpenClaw community:

```
Layer 1: Session memory (current task)
Layer 2: Short-term (48hr daily notes)  
Layer 3: Long-term (MEMORY.md + DREAMS.md)
```

## Subconscious Cron (Every 30 min)

```javascript
// Automatic memory consolidation
{
  schedule: "*/30 * * * *",  // Every 30 minutes
  action: "read_session_transcripts",
  llm: "extract_insights",
  output: [
    "memory/YYYY-MM-DD.md",  // Daily notes
    "DREAMS.md",              // Review diary
    "MEMORY.md"               // Long-term (if qualified)
  ]
}
```

## OpenClaw Memory Wiki (Optional)

For more structured knowledge:

```
memory-wiki plugin adds:
- Deterministic page structure
- Structured claims + evidence
- Contradiction tracking
- Freshness tracking
- Generated dashboards
```

## Implementation Checklist

- [ ] Create `memory/` directory for daily notes
- [ ] Create `MEMORY.md` for long-term facts
- [ ] Create `DREAMS.md` for consolidation diary
- [ ] Add memory_search tool to agents
- [ ] Add memory_get tool to agents
- [ ] Implement auto-flush before compaction
- [ ] Set up subconscious cron every 30 min
- [ ] Add dreaming threshold (score, recall, diversity)

## Example Memory Entry

```markdown
# MEMORY.md

## User Preferences
- Prefers TypeScript over JavaScript
- Likes detailed code comments
- Uses dark mode always

## Agent Behavior
- Always use parallel sub-agents for research
- Include version numbers in all API calls
- QA loop required before deployment

## Past Decisions
- Chose PostgreSQL over MongoDB (2026-04-15)
- Rejected microservices for simpler architecture
```

## Version

Added: 2026-04-19
Based on: OpenClaw memory architecture
Version: 1.0.0