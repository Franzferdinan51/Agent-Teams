#!/usr/bin/env node
/**
 * agent-teams v1.0.0 - Subconscious Memory Consolidation
 * Runs every 30 minutes to consolidate session data into memory layers
 */

const fs = require('fs').promises;
const path = require('path');

const MEMORY_DIR = path.join(process.cwd(), 'memory');
const DREAMS_FILE = path.join(process.cwd(), 'DREAMS.md');
const MEMORY_FILE = path.join(process.cwd(), 'MEMORY.md');

class Subconscious {
    constructor() {
        this.memoryDir = process.env.MEMORY_DIR || MEMORY_DIR;
        this.dreamsFile = DREAMS_FILE;
        this.memoryFile = MEMORY_FILE;
    }

    async init() {
        // Ensure memory directory exists
        await fs.mkdir(this.memoryDir, { recursive: true });
        console.log(`[Subconscious v1.0.0] Initialized`);
        console.log(`   Memory dir: ${this.memoryDir}`);
        console.log(`   Dreams file: ${this.dreamsFile}`);
        console.log(`   Memory file: ${this.memoryFile}`);
    }

    async runConsolidation(sessionData) {
        console.log(`\n[Subconscious] 🔄 Running consolidation cycle...`);
        
        const timestamp = new Date().toISOString();
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Write to daily notes
        await this.writeDailyNotes(today, sessionData);
        
        // 2. Score and promote to long-term memory
        await this.dreamingPhase(sessionData);
        
        console.log(`[Subconscious] ✅ Consolidation complete`);
    }

    async writeDailyNotes(date, data) {
        const dailyFile = path.join(this.memoryDir, `${date}.md`);
        
        let existing = '';
        try {
            existing = await fs.readFile(dailyFile, 'utf8');
        } catch {
            // File doesn't exist, start fresh
        }

        const entry = `
## ${new Date().toLocaleTimeString()}
${data.summary || 'Session activity recorded'}
${data.agents ? `\n### Agents Active\n${data.agents.join('\n')}` : ''}
${data.decisions ? `\n### Decisions\n${data.decisions.join('\n')}` : ''}
${data.errors ? `\n### Errors\n${data.errors.join('\n')}` : ''}
`;
        
        await fs.writeFile(dailyFile, existing + entry);
        console.log(`[Subconscious] 📝 Wrote to ${path.basename(dailyFile)}`);
    }

    async dreamingPhase(data) {
        console.log(`[Subconscious] 💭 Dreaming phase...`);
        
        // Score candidates for promotion
        const candidates = this.scoreCandidates(data);
        
        if (candidates.length === 0) {
            console.log(`[Subconscious] 💤 No candidates for promotion`);
            return;
        }

        // Write dream diary
        const dreamEntry = `
## Dream ${new Date().toISOString()}

### Candidates Scored
${candidates.map(c => `- ${c.text} (score: ${c.score})`).join('\n')}

### Promoted to Long-Term
${candidates.filter(c => c.promote).map(c => `- ${c.text}`).join('\n')}

`;
        
        // Append to dreams file
        try {
            const existing = await fs.readFile(this.dreamsFile, 'utf8');
            await fs.writeFile(this.dreamsFile, existing + dreamEntry);
        } catch {
            await fs.writeFile(this.dreamsFile, dreamEntry);
        }

        // Promote qualified to MEMORY.md
        for (const candidate of candidates.filter(c => c.promote)) {
            await this.promoteToMemory(candidate.text);
        }

        console.log(`[Subconscious] 🌙 Dream diary updated`);
    }

    scoreCandidates(data) {
        const candidates = [];
        
        if (data.decisions) {
            for (const decision of data.decisions) {
                candidates.push({
                    text: decision,
                    score: this.calculateScore(decision, data),
                    promote: this.shouldPromote(decision, data)
                });
            }
        }

        return candidates;
    }

    calculateScore(text, data) {
        let score = 0.5; // Base score
        
        // High-value patterns increase score
        if (text.includes('decision') || text.includes('chose')) score += 0.2;
        if (text.includes('permanent') || text.includes('always')) score += 0.2;
        if (text.includes('error') || text.includes('fix')) score -= 0.3;
        
        return Math.min(1, Math.max(0, score));
    }

    shouldPromote(text, data) {
        const score = this.calculateScore(text, data);
        return score >= 0.7; // Threshold
    }

    async promoteToMemory(text) {
        try {
            let existing = await fs.readFile(this.memoryFile, 'utf8');
            
            // Check for duplicates
            if (existing.includes(text)) {
                console.log(`[Subconscious] ⏭️  Skipped duplicate: ${text.substring(0, 50)}...`);
                return;
            }
            
            // Append to MEMORY.md
            const entry = `\n## ${new Date().toISOString().split('T')[0]}\n${text}\n`;
            await fs.writeFile(this.memoryFile, existing + entry);
            console.log(`[Subconscious] ⬆️  Promoted: ${text.substring(0, 50)}...`);
        } catch {
            // MEMORY.md doesn't exist, create it
            const header = `# MEMORY.md\n\nLong-term memory for AgentTeams.\n\n`;
            await fs.writeFile(this.memoryFile, header + text);
        }
    }

    async loadContext() {
        console.log(`[Subconscious] 📖 Loading context...`);
        
        const context = {
            longTerm: [],
            today: [],
            yesterday: [],
            dreams: []
        };

        // Load MEMORY.md
        try {
            const memory = await fs.readFile(this.memoryFile, 'utf8');
            context.longTerm = memory.split('\n').filter(l => l.trim());
        } catch { /* ignore */ }

        // Load today's notes
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        try {
            const todayNotes = await fs.readFile(path.join(this.memoryDir, `${today}.md`), 'utf8');
            context.today = todayNotes.split('\n');
        } catch { /* ignore */ }

        try {
            const yestNotes = await fs.readFile(path.join(this.memoryDir, `${yesterday}.md`), 'utf8');
            context.yesterday = yestNotes.split('\n');
        } catch { /* ignore */ }

        // Load dreams
        try {
            const dreams = await fs.readFile(this.dreamsFile, 'utf8');
            context.dreams = dreams.split('\n').filter(l => l.startsWith('##'));
        } catch { /* ignore */ }

        console.log(`[Subconscious] ✅ Loaded ${context.longTerm.length} long-term, ${context.today.length} today, ${context.dreams.length} dreams`);
        
        return context;
    }

    async runCron() {
        await this.init();
        
        const sessionData = {
            summary: 'Cron consolidation run',
            agents: ['subconscious-cron'],
            decisions: [],
            errors: []
        };

        await this.runConsolidation(sessionData);
    }
}

// Run if called directly
if (require.main === module) {
    const subconscious = new Subconscious();
    subconscious.runCron().catch(console.error);
}

module.exports = { Subconscious };