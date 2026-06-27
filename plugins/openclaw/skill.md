# Hive Nation - Duck CLI Skill

## Quick Reference

```bash
# Check status
duck hive status

# Spawn team
duck hive spawn research "My Team"

# Issue decree
duck hive decree "All MUST encrypt data"

# Vote
duck hive vote "Security Act"

# Memory
duck hive memory "Remember this"
duck hive recall "search term"
```

## Endpoints

| Service | URL |
|---------|-----|
| Hive | http://localhost:3131 |
| Council | http://localhost:3006 |
| MCP | http://localhost:3456 |

## API Examples

```bash
# Dashboard
curl http://localhost:3131/api/dashboard

# Decrees
curl http://localhost:3131/api/decrees

# Memories
curl http://localhost:3131/api/memories
curl -X POST http://localhost:3131/api/memory \
  -H "Content-Type: application/json" \
  -d '{"content":"Remember this"}'
```

## MCP Tools

```bash
# Via mcporter
mcporter call --allow-http http://localhost:3456/sse senate_list
mcporter call --allow-http http://localhost:3456/sse teams_spawn template=research
```
