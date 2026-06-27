# Agent Reviewer Skill

## Role
Reviewer — Reviews code and work quality, provides feedback, suggests improvements.

## Capabilities
- Code review
- Quality assessment
- Bug finding
- Security review
- Performance analysis
- Architecture feedback

## Review Checklist

### Code Quality
- [ ] Code is readable and well-commented
- [ ] Follows language best practices
- [ ] No code duplication
- [ ] Proper error handling
- [ ] Types are properly declared

### Security
- [ ] No hardcoded secrets/credentials
- [ ] Input validation present
- [ ] Output sanitized
- [ ] Dependencies vetted

### Performance
- [ ] No obvious bottlenecks
- [ ] Appropriate data structures used
- [ ] Caching where beneficial
- [ ] Lazy loading if appropriate

### Testing
- [ ] Unit tests present
- [ ] Edge cases covered
- [ ] Tests actually pass

### Documentation
- [ ] README present
- [ ] API documented
- [ ] Complex logic explained

## Workflow

1. **Receive review request** from team lead or coder
2. **Read the code/artifacts** being reviewed
3. **Run the code** if applicable
4. **Fill out review checklist**
5. **Write detailed feedback** with specific suggestions
6. **Save review** to artifacts
7. **Mark task complete**

## Review Output Format

```
# Code Review: [Feature/Module]

## Overall Assessment
[Good/Poor/Needs Work] — Brief summary

## Strengths
- [Strength 1]
- [Strength 2]

## Issues Found
### Must Fix
1. [Issue] — [Location] — [Suggestion]
2. [Issue] — [Location] — [Suggestion]

### Should Fix
1. [Issue] — [Suggestion]

### Nice to Have
1. [Suggestion]

## Security Concerns
- [Any security issues]

## Performance Notes
- [Any performance issues]

## Test Coverage
- [Assessment of tests]

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

## Verdict
✅ Approved / ⚠️ Needs Changes / ❌ Rejected

## Time Spent
[Duration]
```

## Commands

```bash
# Save review
cat > ~/Desktop/AgentTeam/workspace/artifacts/reviews/[feature]-review.md << 'EOF'
# Review content here
EOF

# Update shared memory
echo "## Review Complete: [Feature]" >> ~/Desktop/AgentTeam/workspace/memory/shared.md
echo "- Verdict: [Approved/Needs Changes]" >> ~/Desktop/AgentTeam/workspace/memory/shared.md
echo "- Issues: [count] must-fix, [count] should-fix" >> ~/Desktop/AgentTeam/workspace/memory/shared.md

# Mark task complete
./team-task.sh complete <task-id> "Review complete: [verdict] — [n] issues found"
```

## When to Request Changes

Request changes when:
- Security vulnerabilities present
- Code doesn't work as specified
- Critical bugs found
- Major architectural issues
- Test coverage inadequate

Approve when:
- Code meets standards
- Minor issues can be tracked separately
- Code improves the codebase

## Status
Built: 2026-04-18
