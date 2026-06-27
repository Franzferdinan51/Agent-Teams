# Hermes Agent Integration — AgentTeams v1.0.0

From [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent).

## Core Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Closed learning loop** | Agent-curated memory, skill self-improvement | ✅ Add to AgentTeams |
| **FTS5 session search** | Cross-session recall with LLM summarization | ✅ Add to AgentTeams |
| **Subagent spawning** | Parallel isolated workstreams | ✅ Already in AgentTeams |
| **Natural language cron** | "Daily at 9 AM" scheduling | ✅ Add to AgentTeams |
| **Multi-platform delivery** | Telegram, Discord, Slack, WhatsApp | 🔜 Future |
| **Batch trajectories** | Research-ready trajectory generation | 🔜 Future |

## Key Patterns from Hermes

### 1. Agent-Curated Memory with Nudges

```javascript
// Hermes pattern: Periodic memory nudges
class MemoryNudge {
    async run() {
        const recent = await this.getRecentSessions();
        const insights = await this.analyzeSessionPatterns(recent);
        
        if (insights.length > 0) {
            await this.persistToMemory(insights);
            await this.nudgeUser(`I noticed: ${insights.join(', ')}`);
        }
    }
}
```

### 2. Skill Self-Improvement Loop

```javascript
// Hermes pattern: Skills improve during use
class SkillImprover {
    async improve(skillName, context) {
        const skill = await this.loadSkill(skillName);
        const performance = await this.measurePerformance(skill);
        
        if (performance < threshold) {
            const improved = await this.refineSkill(skill, context);
            await this.saveSkill(skillName, improved);
        }
    }
}
```

### 3. FTS5 Cross-Session Search

```javascript
// Hermes pattern: Search past conversations
async searchSessions(query) {
    // FTS5 full-text search
    const results = await this.db.query(`
        SELECT session_id, transcript, summary
        FROM sessions
        WHERE transcript MATCH ?
    `, [query]);
    
    // LLM summarization for context
    return await this.summarizeResults(results);
}
```

### 4. Subagent Parallelization

```javascript
// Hermes pattern: Spawn isolated subagents
async spawnSubagent(task, context) {
    return new Promise((resolve) => {
        const agent = spawnAgent({
            task,
            context,
            isolated: true,
            onComplete: (result) => resolve(result)
        });
    });
}

// Parallel execution
const results = await Promise.all([
    spawnSubagent('Research API', context),
    spawnSubagent('Build Schema', context),
    spawnSubagent('Write Tests', context)
]);
```

## Add to AgentTeams

### Copy Hermes Patterns

1. **Memory nudges** → Add to `subconscious.js`
2. **Skill self-improvement** → Add to `skill-creator.js`
3. **FTS5 search** → Add to `session-manager.js`
4. **Natural language cron** → Add to `scheduler.js`

### Hermes-compatible Scripts

```bash
# Run dreaming (Hermes-style memory consolidation)
node scripts/dreaming-engine.js dream

# Natural language scheduling
./schedule.sh "daily at 9am" "Run reports"

# Cross-session search
./search-sessions.sh "API design decisions"
```

## Resources

- Hermes Agent: https://github.com/NousResearch/hermes-agent
- Nous Portal: https://portal.nousresearch.com
- Docs: https://hermes-agent.nousresearch.com/docs/

## Version

Added: 2026-04-19
Source: NousResearch/hermes-agent