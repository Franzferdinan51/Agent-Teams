#!/usr/bin/env python3
"""Build all hive-swarm-enhancements prompts, examples, and docs files."""

import os

BASE = 'hive-swarm-enhancements'

# =====================================================================
# prompts/decompose.md
# =====================================================================
decompose_md = r"""# Goal Decomposer Prompt

Use this prompt template when the Hive Swarm goal-decomposer component needs to break down a high-level goal into parallel, role-assigned subtasks.

## System Prompt

```
You are the Hive Swarm goal-decomposer.
Your job: take a high-level GOAL and break it into parallel,
role-assigned subtasks that can be executed by independent agents.
You MUST reply with valid JSON only. No prose, no markdown, no
code fences — just one JSON object.
```

## User Prompt Template

```
GOAL: {goal}

DOMAIN: {domain}
DOMAIN HINT: {domain_hint}
SUGGESTED ROLES: {roles}
TARGET SUBTASK COUNT: {count} (hard range: 3-15)

OUTPUT SCHEMA (strict, return ONLY this JSON shape):
{
  "subtasks": [
    {
      "id": "t1",
      "title": "Short imperative title (<= 8 words)",
      "prompt": "Self-contained instruction an agent can execute alone. Include the goal context.",
      "role": "one of the suggested roles or a close variant",
      "depends_on": []
    },
    ...
  ]
}

RULES:
- Produce between 3 and {count} subtasks (hard range: 3-15).
- Subtasks should be as parallel as possible.
- Use "depends_on" with a list of subtask ids (e.g. ["t1"]) only when a subtask truly cannot start until another finishes.
- First subtask(s) should have empty depends_on.
- Final subtask should usually be a synthesis / integration / QA step that depends on the earlier work.
- "prompt" must be self-contained — an agent reading it cold should know what to do without seeing this prompt.
- Do not wrap output in ```json``` or any other fences.
- Do not include commentary before or after the JSON.
```

## Domain-Specific Hints

### Build Domain

DOMAIN HINT: Split the build across front-end, back-end, database, and devops tracks.
Include a docs subtask and a final integration verification subtask.
SUGGESTED ROLES: front-end, back-end, database, devops, qa, docs

**Example subtask output (Build domain):**

```json
{
  "subtasks": [
    {
      "id": "t1",
      "title": "Design REST API endpoints and data models",
      "prompt": "Design the REST API for a task management app. Define endpoints for CRUD operations on tasks and projects. Specify request/response shapes, status codes, and authentication requirements. Output OpenAPI 3.0 YAML.",
      "role": "back-end",
      "depends_on": []
    },
    {
      "id": "t2",
      "title": "Set up project structure and database schema",
      "prompt": "Initialize the project with Node.js/Express. Set up PostgreSQL with Prisma ORM. Create migrations for tasks and projects tables with proper indexes. Add seed data for development.",
      "role": "database",
      "depends_on": []
    },
    {
      "id": "t3",
      "title": "Build React front-end components and pages",
      "prompt": "Build the React front-end for the task management app. Include task list, task detail, project dashboard, and navigation. Use React Query for data fetching. Style with Tailwind CSS.",
      "role": "front-end",
      "depends_on": ["t1"]
    },
    {
      "id": "t4",
      "title": "Write comprehensive API documentation",
      "prompt": "Write full API documentation covering all endpoints, authentication flows, error responses, and usage examples. Include a quick-start guide and common integration patterns.",
      "role": "docs",
      "depends_on": ["t1"]
    },
    {
      "id": "t5",
      "title": "Integrate and verify end-to-end functionality",
      "prompt": "Run the full stack locally. Verify all CRUD operations work end-to-end. Test authentication flow. Check that front-end correctly displays API data. Report any integration issues.",
      "role": "qa",
      "depends_on": ["t1", "t2", "t3"]
    }
  ]
}
```

### Research Domain

DOMAIN HINT: Decompose into: source scouting, deep analysis, cross-source
synthesis, adversarial critique, and a final write-up. Scout/analysis can
run in parallel; synthesis depends on both.
SUGGESTED ROLES: scout, analyst, synthesizer, critic, writer

**Example subtask output (Research domain):**

```json
{
  "subtasks": [
    {
      "id": "t1",
      "title": "Survey recent developments in AI agent frameworks",
      "prompt": "Research the latest developments in AI agent frameworks (past 12 months). Find 8-12 primary sources including academic papers, official blog posts, and industry reports. Summarize each with key claims and evidence.",
      "role": "scout",
      "depends_on": []
    },
    {
      "id": "t2",
      "title": "Analyze technical architecture patterns",
      "prompt": "Analyze the technical architectures of major AI agent frameworks discovered in the survey. Compare their approaches to planning, memory, tool use, and multi-agent coordination. Identify trade-offs and design choices.",
      "role": "analyst",
      "depends_on": []
    },
    {
      "id": "t3",
      "title": "Synthesize cross-framework findings",
      "prompt": "Synthesize findings from the survey and analysis into a coherent technical overview. Identify convergence points (common patterns everyone uses), divergence points (controversial choices), and emerging trends.",
      "role": "synthesizer",
      "depends_on": ["t1", "t2"]
    },
    {
      "id": "t4",
      "title": "Critique claims and identify weaknesses",
      "prompt": "Critique the frameworks' claimed capabilities vs. documented limitations. Identify overhyped claims, untested assertions, and areas where real-world performance likely differs from benchmarks. Provide specific counterexamples.",
      "role": "critic",
      "depends_on": ["t1", "t2"]
    },
    {
      "id": "t5",
      "title": "Write final research report",
      "prompt": "Write a comprehensive research report on AI agent framework developments. Include: executive summary, methodology, detailed findings, critical assessment, and recommendations for practitioners considering adoption.",
      "role": "writer",
      "depends_on": ["t3", "t4"]
    }
  ]
}
```

### Audit Domain

DOMAIN HINT: Decompose into security review, performance review, code
quality review, compliance/policy review, and a final report synthesis.
The reporter subtask depends on all four.
SUGGESTED ROLES: security-reviewer, dependency-checker, auth-auditor, performance-auditor, compliance-reviewer, reporter

**Example subtask output (Audit domain):**

```json
{
  "subtasks": [
    {
      "id": "t1",
      "title": "Review authentication and authorization implementation",
      "prompt": "Audit the Agent-Teams codebase for authentication and authorization issues. Check: session management, token validation, privilege escalation vectors, insecure direct object references, and missing authorization checks. Report each finding with severity and location.",
      "role": "auth-auditor",
      "depends_on": []
    },
    {
      "id": "t2",
      "title": "Check dependencies for known vulnerabilities",
      "prompt": "Audit all npm dependencies for known security vulnerabilities. Use npm audit and Snyk if available. Check for outdated packages with known exploits. List CVEs with severity, affected package, and remediation.",
      "role": "dependency-checker",
      "depends_on": []
    },
    {
      "id": "t3",
      "title": "Analyze performance and scalability patterns",
      "prompt": "Audit the codebase for performance issues: N+1 queries, missing indexes, unbounded memory usage, inefficient algorithms, and missing caching. Measure or estimate impact for each finding.",
      "role": "performance-auditor",
      "depends_on": []
    },
    {
      "id": "t4",
      "title": "Review code quality and maintainability",
      "prompt": "Audit code quality: check for code smells, dead code, insufficient error handling, missing input validation, lack of test coverage in critical paths, and poor documentation. Score each area.",
      "role": "quality-reviewer",
      "depends_on": []
    },
    {
      "id": "t5",
      "title": "Compile comprehensive audit report",
      "prompt": "Compile all audit findings into a prioritized report. Group by severity (critical/high/medium/low). For each finding include: description, location, evidence, impact, and recommended fix. Provide an executive summary.",
      "role": "reporter",
      "depends_on": ["t1", "t2", "t3", "t4"]
    }
  ]
}
```

### Planning Domain

DOMAIN HINT: Decompose into discovery, option analysis, risk assessment,
roadmap creation, and stakeholder review. Discovery and analysis can
run in parallel; roadmap depends on both.
SUGGESTED ROLES: researcher, analyst, risk-assessor, planner, reviewer

**Example subtask output (Planning domain):**

```json
{
  "subtasks": [
    {
      "id": "t1",
      "title": "Gather context and requirements",
      "prompt": "Investigate the current state of the project by reading existing docs, README, and key source files. Identify stated goals, constraints, existing architecture, and known pain points. Produce a context summary.",
      "role": "researcher",
      "depends_on": []
    },
    {
      "id": "t2",
      "title": "Analyze solution options and trade-offs",
      "prompt": "Analyze possible approaches to the stated goal. For each option, document: implementation complexity, time estimate, pros/cons, and fit with existing architecture. Recommend the preferred approach with rationale.",
      "role": "analyst",
      "depends_on": []
    },
    {
      "id": "t3",
      "title": "Identify and assess risks",
      "prompt": "Identify risks associated with the recommended approach. For each risk: probability, impact, and mitigation strategy. Rank risks by severity. Identify showstoppers that would require changing the approach.",
      "role": "risk-assessor",
      "depends_on": ["t1", "t2"]
    },
    {
      "id": "t4",
      "title": "Create phased execution roadmap",
      "prompt": "Create a detailed execution roadmap with phases, milestones, and checkpoints. Each phase should have clear deliverables and exit criteria. Include time estimates and resource requirements.",
      "role": "planner",
      "depends_on": ["t3"]
    },
    {
      "id": "t5",
      "title": "Review and finalize plan",
      "prompt": "Review the roadmap for completeness, consistency, and feasibility. Check that dependencies are correctly ordered, estimates are realistic, and risks have mitigations. Propose adjustments.",
      "role": "reviewer",
      "depends_on": ["t4"]
    }
  ]
}
```

### General Domain (auto)

DOMAIN HINT: Detect the most likely domain from the goal and decompose
accordingly. Always include a final integration/QA subtask.
SUGGESTED ROLES: planner, researcher, implementer, reviewer, qa

## Output Schema Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subtasks` | array | Yes | Array of subtask objects (3-15 items) |
| `subtasks[].id` | string | Yes | Unique identifier (e.g., "t1", "t2") |
| `subtasks[].title` | string | Yes | Short imperative title (8 words or fewer) |
| `subtasks[].prompt` | string | Yes | Self-contained agent instruction |
| `subtasks[].role` | string | Yes | Assigned role (from suggested or variant) |
| `subtasks[].depends_on` | array | Yes | Array of subtask IDs this depends on (empty for parallel) |

## Error Handling

When the LLM call fails or returns malformed JSON, the system falls back to a heuristic decomposition that:
1. Splits the goal by sentence boundaries
2. Distributes roles from the domain hint
3. Chains a final synthesis subtask with all prior tasks as dependencies

All decompositions (success or fallback) are persisted to `build-logs/decompositions/<timestamp>.json` for audit and replay.
"""

# =====================================================================
# prompts/aggregate.md
# =====================================================================
aggregate_md = r"""# Result Aggregator Prompt

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
"""

# =====================================================================
# prompts/consensus.md
# =====================================================================
consensus_md = r"""# Consensus Engine Prompt

Use this prompt template when the Hive Swarm consensus-engine needs to run a council deliberation on a contentious decision.

## System Prompt

```
You are the Hive Swarm consensus facilitator.
Your job: guide a group of agents toward a reasoned decision on a
contentious topic. You MUST reply with valid JSON only. No prose,
no markdown, no code fences — just one JSON object.
```

## User Prompt Template

```
TOPIC: {topic}

We need to reach consensus on the topic above. A panel of {councilor_count} councilors will deliberate.

OPTIONS:
{options}

CRITERIA FOR DECISION:
{criteria}

COUNCILOR ROLES:
{councilor_roles}

DELIBERATION RULES:
1. Each councilor should consider the topic from their role's perspective.
2. Councilors should vote and explain their reasoning in 2-4 sentences.
3. Concerns and objections must be acknowledged, not dismissed.
4. The final decision should reflect the weight of reasoned arguments, not just vote counts.
5. If consensus cannot be reached, document the key points of disagreement.

OUTPUT SCHEMA (strict, return ONLY this JSON shape):
{
  "topic": "The decision topic exactly as stated",
  "votes": [
    {
      "councilor": "councilor_role",
      "vote": "chosen_option",
      "confidence": 0.85,
      "reasoning": "2-4 sentence explanation of why this option was chosen",
      "concerns": ["concern 1", "concern 2"]
    }
  ],
  "tallies": {
    "option_a": 3,
    "option_b": 1
  },
  "winningOption": "option_a",
  "confidence": 0.78,
  "consensusReached": true,
  "keyPoints": [
    "Point of agreement or key insight from deliberation",
    "..."
  ],
  "remainingDisagreements": [
    "Unresolved point of contention",
    "..."
  ]
}

RULES:
- confidence is a float in [0.0, 1.0] - higher when more councilors agree.
- consensusReached is true when winning option has >50% of votes AND no major concerns are unaddressed.
- If consensusReached is false, fill remainingDisagreements with the unresolved points.
- Do not wrap output in ```json``` or any other fences.
- Do not include commentary before or after the JSON.
```

## Example: REST vs GraphQL Decision

### Input

```
TOPIC: Should the task management API use REST or GraphQL for client communication?

OPTIONS:
- REST: Traditional RESTful API with well-defined resources and HTTP verbs
- GraphQL: Flexible query language allowing clients to request exactly what they need

CRITERIA FOR DECISION:
- Developer experience (ease of use, documentation quality)
- Performance (network efficiency, caching)
- Tooling ecosystem (IDEs, testing, monitoring)
- Team familiarity (current skill set)

COUNCILOR ROLES:
- api-designer: Focuses on API ergonomics and long-term maintainability
- performance-engineer: Analyzes network patterns and scalability implications
- dev-experience-lead: Considers daily developer workflows and debugging
- security-reviewer: Evaluates attack surface and authentication implications
```

### Expected JSON Output

```json
{
  "topic": "Should the task management API use REST or GraphQL for client communication?",
  "votes": [
    {
      "councilor": "api-designer",
      "vote": "REST",
      "confidence": 0.8,
      "reasoning": "REST's resource-oriented model maps naturally to task management domain objects (tasks, projects). The HTTP verb semantics provide clear contract semantics without additional tooling. For a small team, the simplicity of REST outweighs GraphQL's flexibility.",
      "concerns": [
        "Over-fetching may be an issue for mobile clients with limited bandwidth",
        "Versioning REST APIs can become messy without careful design"
      ]
    },
    {
      "councilor": "performance-engineer",
      "vote": "REST",
      "confidence": 0.75,
      "reasoning": "REST's cacheability via HTTP headers is well-understood and works with CDNs out of the box. For our traffic patterns, the overhead of a GraphQL resolver layer is not justified. GraphQL's flexibility comes at a runtime cost.",
      "concerns": [
        "If we add many endpoints, REST can become inconsistent without strict conventions",
        "Real-time updates would require WebSocket fallback for both approaches"
      ]
    },
    {
      "councilor": "dev-experience-lead",
      "vote": "GraphQL",
      "confidence": 0.6,
      "reasoning": "GraphQL's type system and introspection capabilities significantly improve developer experience - auto-complete, schema validation, and documentation generation all work out of the box. The front-end team especially benefits from being able to request exactly the fields they need.",
      "concerns": [
        "N+1 query problem requires careful DataLoader implementation",
        "Error handling in GraphQL is more complex than HTTP status codes",
        "Team would need GraphQL training and best practices documentation"
      ]
    },
    {
      "councilor": "security-reviewer",
      "vote": "REST",
      "confidence": 0.85,
      "reasoning": "REST's security model is mature and well-understood: HTTPS, JWT in Authorization header, standard CORS patterns. GraphQL's flexible query model introduces a larger attack surface - query complexity attacks, field depth limits, and introspection leakage all require explicit mitigation.",
      "concerns": [
        "GraphQL introspection must be disabled in production to prevent schema leakage",
        "Rate limiting is harder with GraphQL since query shapes vary widely"
      ]
    }
  ],
  "tallies": {
    "REST": 3,
    "GraphQL": 1
  },
  "winningOption": "REST",
  "confidence": 0.78,
  "consensusReached": true,
  "keyPoints": [
    "REST has majority support across all councilors (3 of 4)",
    "Performance and security concerns are well-addressed by REST's mature ecosystem",
    "The front-end team would benefit from REST's predictable response shapes",
    "Both approaches require additional tooling for real-time updates"
  ],
  "remainingDisagreements": []
}
```

## Example: Architecture Decision - Authentication

### Input

```
TOPIC: Which authentication mechanism should we use for inter-service communication in Agent-Teams?

OPTIONS:
- mTLS: Mutual TLS with client certificates for service-to-service authentication
- JWT: JSON Web Tokens with a shared secret or public/private key signing

CRITERIA FOR DECISION:
- Security strength
- Operational complexity
- Key rotation and management
- Performance overhead

COUNCILOR ROLES:
- security-specialist: Focuses on attack surface and compromise detection
- platform-engineer: Considers operational burden and failure modes
- performance-lead: Analyzes latency and throughput implications
```

### Expected JSON Output

```json
{
  "topic": "Which authentication mechanism should we use for inter-service communication in Agent-Teams?",
  "votes": [
    {
      "councilor": "security-specialist",
      "vote": "mTLS",
      "confidence": 0.9,
      "reasoning": "mTLS provides bidirectional authentication - both client and server verify each other's certificates. This prevents impersonation attacks even if credentials are leaked. Unlike JWTs, mTLS certificates are not susceptible to signature bypass vulnerabilities.",
      "concerns": [
        "Certificate lifecycle management (issuance, rotation, revocation) adds operational overhead",
        "Revocation checking introduces latency on new connections"
      ]
    },
    {
      "councilor": "platform-engineer",
      "vote": "JWT",
      "confidence": 0.65,
      "reasoning": "JWTs are easier to debug and inspect - you can decode the token payload without special tools. Key rotation is simpler: just rotate the signing key. For a team without a dedicated PKI, JWTs have much lower operational complexity.",
      "concerns": [
        "JWT secret management is critical - a leaked secret compromises all services",
        "Token expiry must be carefully managed to prevent replay attacks"
      ]
    },
    {
      "councilor": "performance-lead",
      "vote": "mTLS",
      "confidence": 0.7,
      "reasoning": "mTLS handshakes are expensive (full TLS handshake plus client certificate exchange), but for long-lived connections the overhead is amortized. For high-throughput services making thousands of requests per second, the connection pooling required for mTLS adds complexity.",
      "concerns": [
        "Initial connection setup latency is higher with mTLS",
        "Certificate caching and session resumption are critical for performance"
      ]
    }
  ],
  "tallies": {
    "mTLS": 2,
    "JWT": 1
  },
  "winningOption": "mTLS",
  "confidence": 0.72,
  "consensusReached": false,
  "keyPoints": [
    "mTLS is strongly preferred for security but adds operational complexity",
    "JWTs are easier to operate but require robust secret management",
    "Hybrid approach possible: mTLS for north-south, JWT for east-west within a trust boundary"
  ],
  "remainingDisagreements": [
    "Platform engineer argues JWT operational simplicity outweighs security benefits for internal services behind a firewall",
    "Performance impact of mTLS certificate validation under high load is uncertain and requires benchmarking"
  ]
}
```

## Consensus Engine API Reference

The consensus-engine module exposes these functions:

| Function | Signature | Description |
|----------|-----------|-------------|
| `createPoll` | `(topic, options, councilUrl, apiKey)` | Create a new poll/deliberation |
| `castVote` | `(pollId, voterId, option, councilUrl, apiKey)` | Cast a vote on an active poll |
| `getPoll` | `(pollId, councilUrl, apiKey)` | Get current tallies and status |
| `resolvePoll` | `(pollId, councilUrl, apiKey)` | Close poll and return winning option |

### Default Configuration

| Setting | Default |
|---------|---------|
| Council API URL | `http://localhost:3001` |
| API Key | `openclaw-mesh-default-key` |
| HTTP Timeout | 30 seconds |

### Poll Record Schema

Each poll is persisted to `build-logs/consensus/poll_<timestamp>.json` with:

```json
{
  "pollId": "unique-poll-id",
  "sessionId": "council-session-id",
  "topic": "The decision topic",
  "options": ["option_a", "option_b"],
  "status": "active | resolved",
  "createdAt": 1749426000000,
  "councilUrl": "http://localhost:3001"
}
```

## Confidence Calculation

Confidence is derived from vote distribution entropy:

```
entropy = -sum(p_i * log2(p_i)) for each option i
normalized_entropy = entropy / log2(n_options)
confidence = normalized_entropy  (0 = unanimous, 1 = evenly split)
```

A confidence > 0.7 generally indicates strong consensus; < 0.3 indicates deep disagreement.
"""

with open(f'{BASE}/prompts/decompose.md', 'w', encoding='utf-8') as f:
    f.write(decompose_md)
print('prompts/decompose.md written')

with open(f'{BASE}/prompts/aggregate.md', 'w', encoding='utf-8') as f:
    f.write(aggregate_md)
print('prompts/aggregate.md written')

with open(f'{BASE}/prompts/consensus.md', 'w', encoding='utf-8') as f:
    f.write(consensus_md)
print('prompts/consensus.md written')
print('Done with prompts/')

# =====================================================================
# examples/build-rest-api.md
# =====================================================================
build_rest_api = r"""# Example: Build a REST API for a Task Management App

This example walks through a complete Hive Swarm run for the goal:
**"Build a REST API for a task management app"**

## Step 1: Goal Decomposition

Pass the goal to the goal-decomposer with `domain: 'build'`:

```bash
node hive-swarm-enhancements/core/cli.js decompose \
  --goal "Build a REST API for a task management app" \
  --domain build \
  --count 5
```

### Decomposed Subtasks

The goal-decomposer produces 5 parallel subtasks:

| ID | Title | Role | Depends On |
|----|-------|------|-----------|
| t1 | Design REST API endpoints and data models | back-end | - |
| t2 | Set up project structure and database schema | database | - |
| t3 | Build React front-end components and pages | front-end | t1 |
| t4 | Write comprehensive API documentation | docs | t1 |
| t5 | Integrate and verify end-to-end functionality | qa | t1, t2, t3 |

### Decomposition JSON (saved to build-logs)

```json
{
  "subtasks": [
    {
      "id": "t1",
      "title": "Design REST API endpoints and data models",
      "prompt": "Design the REST API for a task management app. Define endpoints for CRUD operations on tasks and projects. Specify request/response shapes, status codes, and authentication requirements. Output OpenAPI 3.0 YAML.",
      "role": "back-end",
      "depends_on": []
    },
    {
      "id": "t2",
      "title": "Set up project structure and database schema",
      "prompt": "Initialize the project with Node.js/Express. Set up PostgreSQL with Prisma ORM. Create migrations for tasks and projects tables with proper indexes. Add seed data for development.",
      "role": "database",
      "depends_on": []
    },
    {
      "id": "t3",
      "title": "Build React front-end components and pages",
      "prompt": "Build the React front-end for the task management app. Include task list, task detail, project dashboard, and navigation. Use React Query for data fetching. Style with Tailwind CSS.",
      "role": "front-end",
      "depends_on": ["t1"]
    },
    {
      "id": "t4",
      "title": "Write comprehensive API documentation",
      "prompt": "Write full API documentation covering all endpoints, authentication flows, error responses, and usage examples. Include a quick-start guide and common integration patterns.",
      "role": "docs",
      "depends_on": ["t1"]
    },
    {
      "id": "t5",
      "title": "Integrate and verify end-to-end functionality",
      "prompt": "Run the full stack locally. Verify all CRUD operations work end-to-end. Test authentication flow. Check that front-end correctly displays API data. Report any integration issues.",
      "role": "qa",
      "depends_on": ["t1", "t2", "t3"]
    }
  ],
  "goal": "Build a REST API for a task management app",
  "domain": "build",
  "version": "1.0.0",
  "decomposedAt": "2026-06-09T04:30:00.000Z"
}
```

## Step 2: Worker Dispatch

Pass the decomposition to the worker-dispatcher:

```bash
node hive-swarm-enhancements/core/cli.js dispatch \
  --decomposition build-logs/decompositions/2026-06-09T04-30-00-000Z.json \
  --max-parallel 3
```

The dispatcher reads the subtasks, respects `depends_on`, and fires agents:

```
[t1] back-end        → RUNNING (parallel)
[t2] database        → RUNNING (parallel)
[t3] front-end       → WAITING (depends on t1)
[t4] docs            → WAITING (depends on t1)
[t5] qa              → WAITING (depends on t1, t2, t3)
```

## Step 3: Aggregation

Collect agent outputs and pass to the result-aggregator:

```bash
node hive-swarm-enhancements/core/cli.js aggregate \
  --outputs build-logs/dispatches/dispatch-xxx/outputs.json \
  --goal "Build a REST API for a task management app" \
  --method hybrid
```

### Aggregation Output

```json
{
  "method": "hybrid",
  "synthesis": "# Task Management API - Complete Implementation Plan\n\n## Architecture Overview\n\nThe task management system uses a Node.js/Express backend with PostgreSQL/Prisma, a React front-end with React Query, and JWT authentication.\n\n## API Design\n\n### Endpoints\n- GET /api/tasks - Paginated list with ?status= and ?page= filters\n- POST /api/tasks - Create with { title, description, status, projectId }\n- GET /api/tasks/:id - Single task retrieval\n- PUT /api/tasks/:id - Full update\n- DELETE /api/tasks/:id - Soft delete or hard delete\n\n### Authentication\nJWT Bearer token flow. Tokens expire in 24h. Refresh token rotation implemented.\n\n## Database Schema\n\nSee database agent output. Key: tasks table with ENUM status, UUID PK, FK to projects.\n\n## Implementation Priority\n1. Database migrations + Prisma setup\n2. Backend API endpoints\n3. JWT auth middleware\n4. Frontend scaffolding + React Query setup\n5. Integrate front-end with API\n6. Add filtering/pagination UI\n7. End-to-end testing",
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

## File Structure Produced

```
build-logs/
├── decompositions/
│   └── 2026-06-09T04-30-00-000Z.json    # Decomposition record
├── dispatches/
│   └── dispatch-xxx/
│       └── outputs/
│           ├── t1-back-end.json
│           ├── t2-database.json
│           ├── t3-front-end.json
│           ├── t4-docs.json
│           └── t5-qa.json
└── aggregations/
    └── 2026-06-09T04-35-00-000Z.json    # Final synthesis
```
"""

# =====================================================================
# examples/audit-codebase.md
# =====================================================================
audit_codebase = r"""# Example: Audit the Agent-Teams Codebase for Security Issues

This example walks through a complete Hive Swarm run for the goal:
**"Audit the Agent-Teams codebase for security issues"**

## Step 1: Goal Decomposition

```bash
node hive-swarm-enhancements/core/cli.js decompose \
  --goal "Audit the Agent-Teams codebase for security issues" \
  --domain audit \
  --count 6
```

### Decomposed Subtasks

| ID | Title | Role | Depends On |
|----|-------|------|-----------|
| t1 | Review authentication and authorization implementation | auth-auditor | - |
| t2 | Check dependencies for known vulnerabilities | dependency-checker | - |
| t3 | Analyze performance and scalability patterns | performance-auditor | - |
| t4 | Review code quality and maintainability | quality-reviewer | - |
| t5 | Evaluate API security and input validation | api-security | - |
| t6 | Compile comprehensive security audit report | reporter | t1, t2, t3, t4, t5 |

### Decomposition JSON

```json
{
  "subtasks": [
    {
      "id": "t1",
      "title": "Review authentication and authorization implementation",
      "prompt": "Audit the Agent-Teams codebase for authentication and authorization issues. Check: session management, token validation, privilege escalation vectors, insecure direct object references, and missing authorization checks. Report each finding with severity (CRITICAL/HIGH/MEDIUM/LOW) and file location.",
      "role": "auth-auditor",
      "depends_on": []
    },
    {
      "id": "t2",
      "title": "Check dependencies for known vulnerabilities",
      "prompt": "Audit all npm dependencies for known security vulnerabilities. Use `npm audit` and Snyk if available. Check for outdated packages with known exploits. List CVEs with: CVE ID, severity (CVSS score), affected package name and version, and recommended remediation.",
      "role": "dependency-checker",
      "depends_on": []
    },
    {
      "id": "t3",
      "title": "Analyze performance and scalability patterns",
      "prompt": "Audit the codebase for performance issues that could become security concerns: N+1 queries (potential DoS), unbounded memory allocation (OOM exploits), missing request timeouts, missing rate limiting. Measure or estimate impact for each finding.",
      "role": "performance-auditor",
      "depends_on": []
    },
    {
      "id": "t4",
      "title": "Review code quality and maintainability",
      "prompt": "Audit code quality for security implications: insufficient error handling (information leakage), missing input validation, hardcoded secrets in source, overly permissive CORS policies, and insufficient logging for security events. Score each area HIGH/MEDIUM/LOW.",
      "role": "quality-reviewer",
      "depends_on": []
    },
    {
      "id": "t5",
      "title": "Evaluate API security and input validation",
      "prompt": "Audit all API endpoints for input validation: SQL injection vectors, NoSQL injection, command injection, XSS in reflected input, path traversal, and mass assignment. Check that all user input is sanitized, validated, and parameterized.",
      "role": "api-security",
      "depends_on": []
    },
    {
      "id": "t6",
      "title": "Compile comprehensive security audit report",
      "prompt": "Compile all security findings into a prioritized report. Group by severity: CRITICAL findings first, then HIGH, MEDIUM, LOW. For each finding include: title, description, file and line number, severity rationale, CVSS score if applicable, and recommended fix with code example.",
      "role": "reporter",
      "depends_on": ["t1", "t2", "t3", "t4", "t5"]
    }
  ]
}
```

## Step 2: Worker Dispatch

```bash
node hive-swarm-enhancements/core/cli.js dispatch \
  --decomposition build-logs/decompositions/audit-xxx.json \
  --max-parallel 5
```

Since t1-t5 have no dependencies, they all run in parallel immediately:

```
[t1] auth-auditor        → RUNNING (parallel)
[t2] dependency-checker  → RUNNING (parallel)
[t3] performance-auditor → RUNNING (parallel)
[t4] quality-reviewer    → RUNNING (parallel)
[t5] api-security        → RUNNING (parallel)
[t6] reporter            → WAITING (depends on t1-t5)
```

## Step 3: Aggregation

```bash
node hive-swarm-enhancements/core/cli.js aggregate \
  --outputs build-logs/dispatches/dispatch-xxx/outputs/ \
  --goal "Audit the Agent-Teams codebase for security issues" \
  --method synthesize
```

## Swarm Run Command (one-liner)

Run the entire swarm in one command:

```bash
node hive-swarm-enhancements/core/cli.js swarm \
  --goal "Audit the Agent-Teams codebase for security issues" \
  --domain audit \
  --count 6 \
  --method hybrid
```

This executes the full pipeline: decompose → dispatch → aggregate.

## Example Audit Report Summary

```json
{
  "synthesis": "# Agent-Teams Security Audit Report\n\n## Executive Summary\n\nThis audit identified 2 CRITICAL findings, 3 HIGH findings, 4 MEDIUM findings, and 6 LOW findings across authentication, dependency, API, and code quality areas.\n\n## Critical Findings\n\n1. **Missing rate limiting on /api/agents/execute** - No request throttling allows infinite agent execution, enabling resource exhaustion attacks.\n2. **Hardcoded API key in council-server.js line 47** - Production API key committed to source control.\n\n## High Findings\n\n1. SQL injection in `searchAgents()` via unsanitized `query` parameter\n2. Outdated `jsonwebtoken` package (CVE-2024-28847, CVSS 7.5)\n3. CORS allows `*` origin in production configuration\n\n## Recommendations\n\n1. Implement rate limiting: `express-rate-limit` at 100 req/min per IP\n2. Move all secrets to environment variables; scan git history for exposure\n3. Parameterize all database queries immediately\n4. Update `jsonwebtoken` to v9.0.0 or later\n5. Restrict CORS to known frontend origins only",
  "keyInsights": [
    "Rate limiting is completely absent on agent execution endpoints",
    "Secrets are hardcoded in source rather than environment-based",
    "Multiple outdated dependencies have known exploits",
    "CORS policy is overly permissive in production"
  ],
  "confidence": 0.88,
  "recommendations": [
    "Immediately rotate the exposed API key and implement secret scanning in CI",
    "Add rate limiting middleware to all public endpoints before next release",
    "Update all npm dependencies and set up automated Dependabot PRs",
    "Fix SQL injection in searchAgents() by using parameterized queries",
    "Restrict CORS configuration to production domain only"
  ]
}
```
"""

# =====================================================================
# examples/research-topic.md
# =====================================================================
research_topic = r"""# Example: Research the Latest Developments in AI Agent Frameworks

This example walks through a complete Hive Swarm run for the goal:
**"Research the latest developments in AI agent frameworks"**

## Step 1: Goal Decomposition

```bash
node hive-swarm-enhancements/core/cli.js decompose \
  --goal "Research the latest developments in AI agent frameworks" \
  --domain research \
  --count 5
```

### Decomposed Subtasks

| ID | Title | Role | Depends On |
|----|-------|------|-----------|
| t1 | Survey recent developments in AI agent frameworks | scout | - |
| t2 | Analyze technical architecture patterns | analyst | - |
| t3 | Synthesize cross-framework findings | synthesizer | t1, t2 |
| t4 | Critique claims and identify weaknesses | critic | t1, t2 |
| t5 | Write final research report | writer | t3, t4 |

### Decomposition JSON

```json
{
  "subtasks": [
    {
      "id": "t1",
      "title": "Survey recent developments in AI agent frameworks",
      "prompt": "Research the latest developments in AI agent frameworks (past 12 months). Find 8-12 primary sources including academic papers, official blog posts, and industry reports. Summarize each with: framework name, key capability claimed, evidence source, and release date.",
      "role": "scout",
      "depends_on": []
    },
    {
      "id": "t2",
      "title": "Analyze technical architecture patterns",
      "prompt": "Analyze the technical architectures of major AI agent frameworks discovered in the survey. Compare their approaches to: planning/reasoning loops, memory systems (short-term vs long-term), tool use and API integration, multi-agent coordination protocols, and error recovery strategies. Identify trade-offs and design choices unique to each.",
      "role": "analyst",
      "depends_on": []
    },
    {
      "id": "t3",
      "title": "Synthesize cross-framework findings",
      "prompt": "Synthesize findings from the survey and analysis into a coherent technical overview. Identify: convergence points (patterns everyone uses), divergence points (controversial design choices), and emerging trends. Organize by theme: planning, memory, tools, multi-agent.",
      "role": "synthesizer",
      "depends_on": ["t1", "t2"]
    },
    {
      "id": "t4",
      "title": "Critique claims and identify weaknesses",
      "prompt": "Critique the frameworks' claimed capabilities vs. documented limitations. Identify: overhyped claims not backed by evidence, untested assertions about scale or reliability, areas where real-world performance likely differs from benchmarks, and specific failure modes reported by users.",
      "role": "critic",
      "depends_on": ["t1", "t2"]
    },
    {
      "id": "t5",
      "title": "Write final research report",
      "prompt": "Write a comprehensive research report on AI agent framework developments. Include: executive summary (3 sentences), methodology (how sources were selected), detailed findings organized by theme, critical assessment of overhyped claims, and actionable recommendations for practitioners considering framework adoption.",
      "role": "writer",
      "depends_on": ["t3", "t4"]
    }
  ]
}
```

## Step 2: Worker Dispatch (parallel phases)

Phase 1 — scout and analyst run in parallel:

```bash
node hive-swarm-enhancements/core/cli.js dispatch \
  --decomposition build-logs/decompositions/research-xxx.json \
  --max-parallel 2
```

```
[t1] scout     → RUNNING (parallel with t2)
[t2] analyst   → RUNNING (parallel with t1)
[t3] synthesizer → WAITING (depends on t1, t2)
[t4] critic    → WAITING (depends on t1, t2)
[t5] writer    → WAITING (depends on t3, t4)
```

Phase 2 — once t1 and t2 complete, synthesizer and critic run in parallel:

```bash
# Dispatch automatically handles dependency order
node hive-swarm-enhancements/core/cli.js dispatch \
  --decomposition build-logs/decompositions/research-xxx.json \
  --resume
```

```
[t3] synthesizer → RUNNING (depends on t1, t2)
[t4] critic     → RUNNING (depends on t1, t2)
[t5] writer     → WAITING (depends on t3, t4)
```

Phase 3 — writer (final synthesis):

```
[t5] writer    → RUNNING (depends on t3, t4)
```

## Step 3: Aggregation

```bash
node hive-swarm-enhancements/core/cli.js aggregate \
  --outputs build-logs/dispatches/dispatch-xxx/outputs/ \
  --goal "Research the latest developments in AI agent frameworks" \
  --method synthesize
```

### Aggregation Output

```json
{
  "synthesis": "# Research Report: AI Agent Framework Developments\n\n## Executive Summary\n\nThe AI agent framework landscape has matured significantly in the past 12 months, with convergence on ReAct-style planning, vector store memory, and tool-use abstractions. Multi-agent coordination remains the most actively debated architectural choice. Frameworks claiming general-purpose agency consistently underperform on sustained multi-step tasks compared to specialized pipelines.\n\n## Methodology\n\nSurveyed 10 frameworks (LangChain, AutoGen, CrewAI, Claude Agent SDK, GPT-4o Agent, etc.) by reviewing: official documentation, GitHub README state, arxiv preprints, and HackerNews discussion threads. Prioritized recent releases (2025-2026) and frameworks with >5k GitHub stars.\n\n## Key Findings\n\n### Planning Approaches\nMost frameworks now use variations of ReAct (Reasoning + Acting) or Plan-and-Execute patterns. The key architectural choice is whether to interleave reasoning with action (ReAct) or maintain a separate planning phase that replays against a tool sandbox (Plan-and-Execute). Each has trade-offs: ReAct is more responsive but can stray from intended plans; Plan-and-Execute is more robust but slower.\n\n### Memory Systems\nThree dominant approaches:\n1. **Vector store retrieval** (Chroma, Pinecone, Weaviate) - semantic similarity search\n2. **Summary-based** (sliding window summarization) - compresses history\n3. **Hybrid** - vector + summary for different retrieval tiers\n\nNo framework has solved the \"relevant memory retrieval\" problem; all rely on semantic similarity which misses structural/ temporal relevance.\n\n### Multi-Agent Patterns\nFrameworks are converging on hierarchical agent teams with manager/worker or actor/critic patterns. Key debate: should agents share memory (simpler, faster) or maintain isolated contexts (safer, more parallel)?\n\n## Critical Assessment\n\n**Overhyped claims**: \"General-purpose agents\" framing is misleading - all frameworks perform well on constrained task graphs but degrade on open-ended exploration. \"Autonomous\" labels imply more independence than exists.\n\n**Real limitations**: Error accumulation in multi-step tasks, tool-call reliability below 95% on novel APIs, context window exhaustion on long conversations.\n\n## Recommendations\n\n1. Choose frameworks based on tool-use ecosystem fit, not \"best agent\" claims\n2. Implement explicit error recovery loops rather than relying on model reasoning\n3. Use isolated agent contexts for parallel tasks to prevent context poisoning\n4. Benchmark on your specific task distribution, not published benchmarks",
  "keyInsights": [
    "ReAct and Plan-and-Execute are the dominant planning paradigms, with hybrid approaches emerging",
    "Vector store memory is universal but retrieval quality remains a core unsolved problem",
    "Multi-agent coordination patterns are converging toward hierarchical structures",
    "All frameworks degrade on open-ended sustained tasks; specialized pipelines outperform general agents",
    "Tool-call reliability below 95% on novel APIs is a practical blocker for full automation"
  ],
  "confidence": 0.82,
  "recommendations": [
    "Evaluate frameworks by tool ecosystem fit rather than marketing claims about 'autonomy'",
    "Implement explicit error recovery and retry logic rather than relying on model self-correction",
    "Use hierarchical multi-agent patterns for complex tasks, with manager agents delegating to specialists",
    "Benchmark frameworks against your specific task types before committing to one",
    "Plan for context window management from day one - all frameworks hit limits on long conversations"
  ]
}
```

## Data Flow Diagram

```
scout ─────┐
           ├──→ synthesizer ──→ writer ──→ FINAL REPORT
analyst ───┘                   ↑
           ├──→ critic ────────┘
           └──→ (critic also feeds writer)
```

## Notes on Research Domain

The research domain is intentionally sequential at the synthesis stage:
- `t1` (scout) and `t2` (analyst) run fully in parallel — they explore different dimensions independently
- `t3` (synthesizer) and `t4` (critic) both depend on t1 and t2, but NOT on each other — they can run in parallel
- `t5` (writer) depends on BOTH t3 and t4, so it runs last and produces the final document

This structure ensures maximum parallelism while maintaining the logical data flow: explore → analyze → critique+synthesize → write.
"""

with open(f'{BASE}/examples/build-rest-api.md', 'w', encoding='utf-8') as f:
    f.write(build_rest_api)
print('examples/build-rest-api.md written')

with open(f'{BASE}/examples/audit-codebase.md', 'w', encoding='utf-8') as f:
    f.write(audit_codebase)
print('examples/audit-codebase.md written')

with open(f'{BASE}/examples/research-topic.md', 'w', encoding='utf-8') as f:
    f.write(research_topic)
print('examples/research-topic.md written')

print('Done with examples/')