# Micro-Agents — Tiny Specialized Bots

## Concept

Micro-agents are **tiny, single-purpose specialists** that do ONE thing really well. Unlike full agents with broad capabilities, micro-agents are laser-focused — a debugger only debugs, a test-writer only writes tests.

## Why Micro-Agents?

- **Fast** — No overhead, just the task
- **Reliable** — Focused scope = consistent results  
- **Composable** — Chain multiple micro-agents together
- **Parallel** — Spawn 10 micro-agents at once for parallel work
- **Disposable** — No state, no memory, just task → result

## Available Micro-Agents

### Research & Analysis
| Agent | What It Does |
|-------|--------------|
| `researcher` | Web search and summarize |
| `researcher-deep` | Deep research on a topic |
| `comparer` | Compare options with pros/cons |
| `summarizer` | Summarize long text |
| `explainer` | Explain complex concepts |

### Coding
| Agent | What It Does |
|-------|--------------|
| `coder` | Write code for a feature |
| `debugger` | Find and fix bugs |
| `bug-hunt` | Hunt for potential bugs |
| `optimizer` | Optimize performance |
| `security-scan` | Security vulnerability review |
| `refactor` | Refactor messy code |

### Testing & Review
| Agent | What It Does |
|-------|--------------|
| `test-writer` | Write unit tests |
| `code-review` | Focused code review |
| `review-summary` | Summarize findings |

### API & Database
| Agent | What It Does |
|-------|--------------|
| `api-designer` | Design REST endpoints |
| `db-designer` | Design database schema |
| `query-writer` | Write SQL/NoSQL queries |

### Documentation
| Agent | What It Does |
|-------|--------------|
| `doc-writer` | Write technical docs |
| `readme-writer` | Write README files |
| `changelog-writer` | Write changelog entries |
| `comment-writer` | Add code comments |

### Git & Version Control
| Agent | What It Does |
|-------|--------------|
| `commit-writer` | Write git commits |
| `pr-writer` | Write PR descriptions |

### Debugging & Fixes
| Agent | What It Does |
|-------|--------------|
| `error-explainer` | Explain error messages |
| `fix-suggest` | Suggest code fixes |

### Planning & Architecture
| Agent | What It Does |
|-------|--------------|
| `planner` | Break down complex tasks |
| `architect` | Design system architecture |

## Usage

```bash
# List all micro-agents
./micro.sh list

# Spawn a micro-agent
./micro.sh debugger "fix null pointer in auth.js"
./micro.sh researcher "latest AI developments"
./micro.sh planner "build a REST API for task manager"
```

## Spawn via Duck CLI

```javascript
// Spawn multiple micro-agents in parallel
sessions_spawn({
  task: "Debug this code: null pointer at line 42",
  model: "minimax/MiniMax-M2.7",
  label: "micro-debugger"
})

sessions_spawn({
  task: "Write tests for the auth module",
  model: "minimax/MiniMax-M2.7", 
  label: "micro-test-writer"
})

sessions_spawn({
  task: "Review the auth module for security issues",
  model: "minimax/MiniMax-M2.7",
  label: "micro-security-scan"
})
```

## Micro-Agent Chains

Chain micro-agents for complex workflows:

```
Task → Researcher → Coder → Code-Review → Test-Writer → Security-Scan → Done
```

```bash
# Example chain
./micro.sh researcher "API authentication best practices"
# → Results passed to...
./micro.sh api-designer "Design auth API based on research"
# → Results passed to...
./micro.sh coder "Build auth API from design"
# → Results passed to...
./micro.sh test-writer "Write tests for auth API"
```

## Parallel Micro-Agents

Spawn 5 micro-agents simultaneously:

```bash
./micro.sh researcher "best frontend framework 2024" &
./micro.sh researcher "best backend framework 2024" &
./micro.sh researcher "best database for startups" &
./micro.sh researcher "best hosting platform" &
./micro.sh researcher "best CI/CD pipeline" &
wait
echo "All research complete!"
```

## Multi-Agent Collaboration Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    TASK ASSIGNER                          │
│  Breaks work into micro-tasks, spawns micro-agents         │
└────────────────┬──────────────────────────────────────────┘
                 │
    ┌───────────┼───────────┬───────────┬───────────┐
    ▼           ▼           ▼           ▼           ▼
┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐
│ MICRO │  │ MICRO │  │ MICRO │  │ MICRO │  │ MICRO │
│  A    │  │  B    │  │  C    │  │  D    │  │  E    │
│Debug- │  │ Test- │  │ Doc-  │  │ Sec-  │  │ Optim-│
│  ger  │  │ Writer│  │ Writer│  │ Scan  │  │  ize  │
└───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘
    │           │           │           │           │
    └───────────┴───────────┴───────────┴───────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   RESULT AGGREGATOR │
              │  Combines outputs   │
              └─────────────────────┘
```

## Anti-Patterns

❌ DON'T use micro-agents for:
- Complex multi-step tasks (use meta-agent)
- Tasks requiring context (use team agent)
- Ambiguous tasks (clarify first)

✅ DO use micro-agents for:
- Single, well-defined tasks
- Parallel work items
- Specialized focused work
- Disposable one-off tasks

## Status

Built: 2026-04-18
