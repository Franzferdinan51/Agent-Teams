# Example: Audit the Agent-Teams Codebase for Security Issues

## Goal
"Audit the Agent-Teams codebase for security issues: authentication flaws, injection vectors, dependency vulnerabilities, and secret exposure"

## Swarm CLI Command

```bash
cd C:\Users\franz\Agent-Teams\hive-swarm-enhancements\core
node cli.js swarm "Audit the Agent-Teams codebase for security issues" --count 5 --domain audit
```

## Decomposed Subtasks (from goal-decomposer)

```json
{
  "goal": "Audit the Agent-Teams codebase for security issues",
  "domain": "audit",
  "subtasks": [
    {
      "id": "subtask-1",
      "description": "Scan for hardcoded secrets: API keys, tokens, passwords in source files",
      "assignedRole": "secret-scanner",
      "estimatedDuration": "5-10 min",
      "deliverable": "secrets-found.json with locations"
    },
    {
      "id": "subtask-2",
      "description": "Check injection vulnerabilities: SQL, command, eval, innerHTML usage",
      "assignedRole": "security-reviewer",
      "estimatedDuration": "15-20 min",
      "deliverable": "injection-report.md"
    },
    {
      "id": "subtask-3",
      "description": "Review authentication and authorization: token handling, permission checks",
      "assignedRole": "auth-auditor",
      "estimatedDuration": "15-20 min",
      "deliverable": "auth-audit.md"
    },
    {
      "id": "subtask-4",
      "description": "Audit dependencies for known CVEs and outdated packages",
      "assignedRole": "dependency-checker",
      "estimatedDuration": "10-15 min",
      "deliverable": "vulnerability-report.json"
    },
    {
      "id": "subtask-5",
      "description": "Review API endpoints for rate limiting, input validation, CORS policy",
      "assignedRole": "api-security-reviewer",
      "estimatedDuration": "10-15 min",
      "deliverable": "api-security-report.md"
    }
  ]
}
```

## Worker Outputs (aggregated synthesis)

### Secret Scanner Findings
```
⚠️ Found 3 potential secrets:
  - Line 42 in scripts/setup.sh: $OPENAI_API_KEY exposed in git history
  - Line 88 in council-api-server.cjs: fallback token in comments
  - Line 12 in .env.example: example token format matching real pattern
```

### Injection Vectors
```
✅ No SQL injection: using parameterized queries throughout
⚠️ 2 Command injection risks: child_process.exec with user input in:
    - scripts/deploy.js (line 67)
    - scripts/mesh-start.sh (line 23)
✅ No eval() usage found
⚠️ 1 innerHTML usage in webui/public/js/dashboard.js (line 156) - XSS risk
```

### Auth Audit
```
✅ JWT tokens signed with HS256, verified on every request
✅ Passwords hashed with bcrypt (cost factor 12)
⚠️ No rate limiting on /api/auth/login - brute force possible
⚠️ Refresh tokens don't expire - long-lived token theft risk
✅ CORS restricted to known origins
```

### Dependency Audit
```
Critical: npm audit found 0 critical, 2 high, 5 medium vulnerabilities
High:
  - ws@<8.17.0: DoS via large WebSocket frames
  - express@<4.19.0: Path traversal in static file serving
Action: Run 'npm audit fix' and update package.json
```

## Aggregated Report

```markdown
## Security Audit: Agent-Teams

### Critical Issues (fix immediately)
1. **Command Injection Risk** - `scripts/deploy.js` uses `exec()` with user-controlled input
2. **No Login Rate Limiting** - Brute force attack possible on `/api/auth/login`

### High Priority
3. **Outdated ws package** - DoS vulnerability, update to >=8.17.0
4. **Outdated express package** - Path traversal, update to >=4.19.0
5. **XSS via innerHTML** - `dashboard.js` line 156 should use `textContent`

### Medium Priority
6. Refresh tokens don't expire
7. CORS origins not validated against allowlist
8. No input sanitization on `/api/agents/spawn` (model field)

### Recommendations
- Move all secrets to environment variables, never in source
- Add `express-rate-limit` middleware
- Replace `child_process.exec` with `execFile` or `spawn`
- Run `npm audit fix` in CI pipeline
- Add Content-Security-Policy headers

### Risk Score: 6.2/10 (Medium-High)
```

## Running the Audit via CLI

```bash
# Full audit with JSON output
node cli.js swarm "Audit the Agent-Teams codebase" --count 5 --domain audit --json > audit-report.json

# Check specific area only
node cli.js swarm "Check for hardcoded secrets in the codebase" --count 2 --domain audit

# Re-audit after fixes
node cli.js swarm "Verify security fixes were applied correctly" --count 3 --domain audit
```
