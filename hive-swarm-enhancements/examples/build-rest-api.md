# Example: Build a REST API for a Task Management App

## Goal
"Build a REST API for a task management app with users, projects, and tasks"

## Swarm CLI Command

```bash
cd C:\Users\franz\Agent-Teams\hive-swarm-enhancements\core
node cli.js swarm "Build a REST API for a task management app with users, projects, and tasks" --count 5 --domain build
```

## Decomposed Subtasks (from goal-decomposer)

```json
{
  "goal": "Build a REST API for a task management app with users, projects, and tasks",
  "domain": "build",
  "subtasks": [
    {
      "id": "subtask-1",
      "description": "Design database schema: users, projects, tasks tables with relationships",
      "assignedRole": "database-architect",
      "estimatedDuration": "10-15 min",
      "deliverable": "schema.sql or ORM models"
    },
    {
      "id": "subtask-2",
      "description": "Implement user authentication: signup, login, JWT tokens, refresh",
      "assignedRole": "auth-engineer",
      "estimatedDuration": "20-30 min",
      "deliverable": "auth routes + middleware"
    },
    {
      "id": "subtask-3",
      "description": "Build project CRUD endpoints: create, read, update, delete, list",
      "assignedRole": "backend-engineer",
      "estimatedDuration": "15-20 min",
      "deliverable": "project routes + controller"
    },
    {
      "id": "subtask-4",
      "description": "Build task CRUD endpoints with project association and status tracking",
      "assignedRole": "backend-engineer",
      "estimatedDuration": "15-20 min",
      "deliverable": "task routes + controller"
    },
    {
      "id": "subtask-5",
      "description": "Write unit tests for core functionality and API integration tests",
      "assignedRole": "qa-engineer",
      "estimatedDuration": "20-25 min",
      "deliverable": "test suite with >80% coverage"
    }
  ]
}
```

## Aggregated Output

The swarm synthesizes the 5 worker outputs into:

- **Schema**: SQLite/Postgres-ready with foreign keys
- **Auth**: JWT-based with bcrypt password hashing
- **API Endpoints**:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/projects`
  - `POST /api/projects`
  - `GET /api/projects/:id`
  - `PUT /api/projects/:id`
  - `DELETE /api/projects/:id`
  - `GET /api/tasks?projectId=X`
  - `POST /api/tasks`
  - `PUT /api/tasks/:id`
  - `PATCH /api/tasks/:id/status`
  - `DELETE /api/tasks/:id`
- **Tests**: Jest test suite with supertest

## Example API Usage

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'
# Returns: { "token": "eyJhbGciOiJIUzI1NiIs..." }

# Create project
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"name":"My Startup","description":"Building something great"}'

# Create task
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"projectId":1,"title":"Design logo","status":"todo"}'
```

## Swarm Run Output (JSON mode)

```bash
node cli.js swarm "Build a REST API..." --count 5 --domain build --json
```

```json
{
  "swarmId": "swarm-2026-06-09T05-00-00-000Z",
  "goal": "Build a REST API for a task management app",
  "subtasks": 5,
  "dispatchId": "dispatch-xxx",
  "results": [...],
  "synthesis": "## Task Management REST API\n\n### What was built\n\n...",
  "scores": [
    {"subtaskId": "subtask-1", "score": 92, "reasoning": "Complete schema with indexes"},
    {"subtaskId": "subtask-2", "score": 88, "reasoning": "JWT + refresh token implemented"},
    ...
  ],
  "ranked": [...],
  "totalDuration": 142000
}
```
