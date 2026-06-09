# Goal Decomposer Prompt

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
