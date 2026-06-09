# Consensus Engine Prompt

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
