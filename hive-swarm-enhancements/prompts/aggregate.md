# Result Aggregator Prompt

Use this prompt template when the Hive Swarm result-aggregator component needs to synthesize multiple agent outputs into a single coherent response.

## System Prompt

```
You are the Hive Swarm result-aggregator.
You synthesize multiple agent outputs into a single coherent, well-structured
response. You MUST reply with valid JSON only. No prose, no markdown,
no code fences — just one JSON object.
```

## User Prompt Template

```
ORIGINAL GOAL: {goal}

You have received {count} outputs from parallel agents who worked on the goal above.
Your job is to synthesize these into a single best response.

AGENT OUTPUTS:

{numbered_outputs}

OUTPUT SCHEMA (strict, return ONLY this JSON shape):
{
  "synthesis": "Full coherent answer in markdown format. Combine the best elements from all outputs into a unified response.",
  "keyInsights": [
    "Insight 1 extracted from the outputs",
    "Insight 2 extracted from the outputs",
    "..."
  ],
  "confidence": 0.85,
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "..."
  ]
}

RULES:
- synthesis should be comprehensive, combining the strongest elements from each output.
- keyInsights should distill the 3-5 most important findings across all outputs.
- confidence is a float in [0.0, 1.0] representing how confident you are in the synthesis.
- recommendations should be concrete, actionable next steps based on the findings.
- Do not wrap output in ```json``` or any other fences.
- Do not include commentary before or after the JSON.
- If outputs conflict, acknowledge the disagreement and explain which view you find more credible and why.
```

## Example: Building a REST API

### Original Goal
"Build a REST API for a task management app"

### Numbered Outputs Input

```
1. OUTPUT (back-end agent):
# Task Management API Design

## Endpoints
- GET /api/tasks - List all tasks (paginated)
- POST /api/tasks - Create a new task
- GET /api/tasks/:id - Get a specific task
- PUT /api/tasks/:id - Update a task
- DELETE /api/tasks/:id - Delete a task

## Data Model
Task: { id, title, description, status, projectId, createdAt, updatedAt }

## Authentication
JWT Bearer token in Authorization header.

## Status Codes
201 Created, 200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Server Error

## Query Parameters
?status=pending|in_progress|completed&page=1&limit=20
```

```
2. OUTPUT (database agent):
# Database Schema for Task Management API

## Tables

tasks:
- id: UUID PRIMARY KEY
- title: VARCHAR(255) NOT NULL
- description: TEXT
- status: ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending'
- project_id: UUID REFERENCES projects(id)
- created_at: TIMESTAMP DEFAULT NOW()
- updated_at: TIMESTAMP DEFAULT NOW()

projects:
- id: UUID PRIMARY KEY
- name: VARCHAR(255) NOT NULL
- created_at: TIMESTAMP DEFAULT NOW()

## Indexes
- tasks(project_id) for fast lookups
- tasks(status) for filtering
- tasks(created_at) for sorting

## Migrations
Use Prisma migrations for version-controlled schema changes.
```

```
3. OUTPUT (front-end agent):
# React Frontend Design

## Pages
- /tasks - Task list with filtering by status
- /tasks/:id - Task detail/edit view
- /projects - Project dashboard

## Components
TaskCard, TaskList, TaskForm, StatusBadge, Pagination

## State Management
- React Query for server state
- Context for UI state (modals, filters)

## Styling
- Tailwind CSS with consistent spacing
- Responsive design with mobile-first approach
```

### Expected JSON Output

```json
{
  "synthesis": "# Task Management API - Complete Implementation Plan\n\n## Architecture Overview\n\nThe task management system uses a Node.js/Express backend with PostgreSQL/Prisma, a React front-end with React Query, and JWT authentication.\n\n## API Design\n\n### Endpoints\nAll REST endpoints follow standard patterns:\n- GET /api/tasks - Paginated list with ?status= and ?page= filters\n- POST /api/tasks - Create with { title, description, status, projectId }\n- GET /api/tasks/:id - Single task retrieval\n- PUT /api/tasks/:id - Full update\n- DELETE /api/tasks/:id - Soft delete or hard delete\n\n### Authentication\nJWT Bearer token flow. Tokens expire in 24h. Refresh token rotation implemented.\n\n## Database Schema\n\nSee database agent output. Key: tasks table with ENUM status, UUID PK, FK to projects. Indexes on status, project_id, created_at.\n\n## Frontend Architecture\n\n- React + Vite project\n- React Query for all server data (caching, refetching, optimistic updates)\n- Tailwind CSS for styling\n- Pages: /tasks (list), /tasks/:id (detail), /projects (dashboard)\n\n## Implementation Priority\n1. Database migrations + Prisma setup\n2. Backend API endpoints\n3. JWT auth middleware\n4. Frontend scaffolding + React Query setup\n5. Integrate front-end with API\n6. Add filtering/pagination UI\n7. End-to-end testing",
  "keyInsights": [
    "PostgreSQL with Prisma provides type-safe database access and migration management",
    "React Query is the recommended state management approach for server data",
    "JWT authentication with 24h expiry and refresh token rotation is the auth strategy",
    "Task status should be an ENUM ('pending', 'in_progress', 'completed') with proper indexes",
    "The front-end and back-end can be developed in parallel after API contract is agreed"
  ],
  "confidence": 0.9,
  "recommendations": [
    "Initialize the project with `npm init` and install dependencies: express, prisma, jsonwebtoken, bcrypt",
    "Run `prisma init` and define the schema from the database agent output before writing any API code",
    "Agree on the exact request/response shapes for each endpoint before parallel front-end/back-end development",
    "Add `createdAt` and `updatedAt` timestamps to the Task model for audit purposes",
    "Set up GitHub Actions CI to run tests on every push before merging"
  ]
}
```

## Aggregation Methods

The result-aggregator supports three methods:

| Method | Description |
|--------|-------------|
| `pick-best` | Score every output, return the highest-scoring one |
| `synthesize` | Ask the LLM to merge top-K into a single coherent response |
| `hybrid` | Score everything, pick the best, AND synthesize top-3 |

### Scoring Criteria (0-10 each)

- **relevance** (30%) - How directly does this address the original goal?
- **completeness** (30%) - Does it cover all important aspects?
- **accuracy** (25%) - Are the facts and claims correct?
- **clarity** (10%) - Is it well-organized and easy to understand?
- **conciseness** (5%) - Does it avoid unnecessary verbosity?

### Heuristic Fallback Scoring

When LLM scoring is unavailable, the aggregator falls back to heuristics:

| Factor | Weight | What it measures |
|--------|--------|-----------------|
| Structure | 25% | Presence of headings, lists, code blocks, tables |
| Word count | 15% | Optimal range 10-1500 words |
| Keyword overlap | 35% | Shared terms with the original goal |
| Coherence | 15% | Average pairwise sentence similarity |
| Specificity | 10% | Numeric/URL/code identifier density |

## Output Schema Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `synthesis` | string | Yes | Full markdown synthesis of all outputs |
| `keyInsights` | array | Yes | 3-5 most important findings (strings) |
| `confidence` | float | Yes | Confidence score [0.0, 1.0] |
| `recommendations` | array | Yes | Actionable next steps (strings) |
| `method` | string | No | Which aggregation method was used |
| `scores` | object | No | Per-output scores when LLM scoring was used |
| `topOutputId` | string | No | ID of the highest-scoring individual output |

## Persistence

All aggregations (including the inputs, method used, scores, and synthesis) are persisted to `build-logs/aggregations/<timestamp>.json` for replay and audit.
