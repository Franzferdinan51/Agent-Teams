# AgentTeam — Multi-Agent Coordination Skill

Use this skill when you need to coordinate multiple specialized agents working toward a shared goal.

## Triggers
- "Start a team session"
- "Spawn a researcher/coder/reviewer/writer"
- "Add a task to the queue"
- "Check team status"
- "Build a team for [project]"
- "Coordinate agents to work together"

## Team Members Available

| Role | What They Do | Best For |
|------|-------------|----------|
| **researcher** | Web search, summarize, gather | Research tasks, competitive analysis |
| **coder** | Write code, implement, test | Features, tools, scripts |
| **reviewer** | Code review, quality check | Reviewing work before shipping |
| **writer** | Documentation, reports | READMEs, guides, communications |

## Quick Commands

```bash
# Start session
./team-session.sh init "Project Name"

# Add task
./team-task.sh add "Task description" researcher

# Spawn agent (for parallel work)
./spawn-agent.sh researcher "Research X"

# Check status
./team-status.sh
```

## Workflow

1. **Start a team session** — establishes shared context
2. **Add tasks** — queue work for team members
3. **Spawn agents** — agents work in parallel on tasks
4. **Review results** — lead reviews and approves
5. **End session** — archive and clean up

## Example

```
User: I need to build a weather API wrapper

Lead (you):
1. Start session: ./team-session.sh init "Weather Wrapper"
2. Add tasks:
   - research: "Find 3 free weather APIs"
   - coder: "Build Python wrapper"
   - reviewer: "Review the code"
3. Spawn agents to work on tasks
4. Review and approve results
```

## Integration

Team workspace: `~/Desktop/AgentTeam/workspace/`
- Tasks: `workspace/tasks/queue.json`
- Memory: `workspace/memory/shared.md`
- Artifacts: `workspace/artifacts/`

## Notes

- All agents share the same workspace
- Tasks have IDs for tracking
- Memory persists between agents
- Artifacts are shared files

## Status
Built: 2026-04-18
