#!/usr/bin/env node
/**
 * agent-teams v1.0.0 - Dreaming Engine
 * Background memory consolidation with Light → REM → Deep phases
 * Based on OpenClaw's memory-core dreaming system
 */

const fs = require('fs').promises;
const path = require('path');

const VERSION = '1.0.1';
const DREAMS_DIR = 'memory/.dreams';
const MEMORY_DIR = 'memory';

class DreamingEngine {
    constructor() {
        this.dreamsDir = path.join(process.cwd(), DREAMS_DIR);
        this.memoryDir = path.join(process.cwd(), MEMORY_DIR);
        this.dreamsFile = path.join(process.cwd(), 'DREAMS.md');
        this.memoryFile = path.join(process.cwd(), 'MEMORY.md');
        this.config = {
            minScore: 0.8,           // Default: 0.8 (not 0.7)
            minRecallCount: 3,
            minUniqueQueries: 3,
            maxPromotionsPerSweep: 10,
            maxAgeDays: 30,
            recencyHalfLifeDays: 14
        };
    }

    async init() {
        await fs.mkdir(this.dreamsDir, { recursive: true });
        await fs.mkdir(this.memoryDir, { recursive: true });
        
        console.log(`[DreamingEngine v${VERSION}] Initialized`);
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 1: LIGHT SLEEP
    // Ingest recent signals, dedupe, stage candidates
    // ═══════════════════════════════════════════════════════════
    async lightPhase() {
        console.log(`\n[Light Phase] 😴 Processing...`);
        
        const recentFiles = await this.getRecentDailyFiles(7);
        const candidates = [];
        
        for (const file of recentFiles) {
            const content = await fs.readFile(file, 'utf8');
            const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
            
            for (const line of lines) {
                if (!this.isDuplicate(line, candidates)) {
                    candidates.push({
                        text: line,
                        source: path.basename(file),
                        signals: 1,
                        lastSeen: new Date().toISOString().split('T')[0],
                        recallCount: 0,
                        uniqueQueries: 1
                    });
                } else {
                    const existing = candidates.find(c => c.text === line);
                    if (existing) existing.signals++;
                }
            }
        }

        // Write phase output
        const lightOutput = {
            phase: 'light',
            timestamp: new Date().toISOString(),
            candidates: candidates.length,
            signals: candidates.reduce((sum, c) => sum + c.signals, 0)
        };

        await this.writePhaseOutput('light', lightOutput);
        
        console.log(`[Light Phase] ✅ ${candidates.length} candidates staged`);
        return candidates;
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 2: REM SLEEP (after Light, before Deep)
    // Extract themes and record reinforcement signals
    // ═══════════════════════════════════════════════════════════
    async remPhase(candidates = []) {
        console.log(`\n[REM Phase] 🌌 Processing...`);
        
        // Extract themes from candidates
        const themes = this.extractThemes(candidates);
        
        // Build recall patterns
        const patterns = this.buildRecallPatterns(candidates);
        
        // Write REM output
        const remOutput = {
            phase: 'rem',
            timestamp: new Date().toISOString(),
            themes: themes,
            recallPatterns: patterns.length,
            reinforcementBoost: 0.08 // max boost from REM
        };

        await this.writePhaseOutput('rem', remOutput);

        console.log(`[REM Phase] ✅ Themes: ${themes.join(', ') || 'none'}`);
        
        // Apply REM boost to candidates
        for (const c of candidates) {
            c.remBoost = Math.min(0.08, c.signals * 0.01);
        }
        
        return candidates;
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 3: DEEP SLEEP
    // Score and promote to MEMORY.md
    // ═══════════════════════════════════════════════════════════
    async deepPhase(candidates = []) {
        console.log(`\n[Deep Phase] 🌙 Processing...`);
        
        if (candidates.length === 0) {
            console.log(`[Deep Phase] ⏭️  No candidates`);
            return [];
        }

        // Score candidates using 6 weighted signals
        const scored = candidates.map(c => ({
            ...c,
            score: this.calculateScore(c),
            promote: this.shouldPromote(c)
        }));

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        // Get current MEMORY.md
        let existingMemory = '';
        try {
            existingMemory = await fs.readFile(this.memoryFile, 'utf8');
        } catch { /* ignore */ }

        // Promote qualified entries (up to limit)
        const promoted = [];
        let promotedCount = 0;
        
        for (const entry of scored.filter(e => e.promote)) {
            // Skip if at promotion limit
            if (promotedCount >= this.config.maxPromotionsPerSweep) {
                console.log(`[Deep Phase] ⏭️  Limit reached (${this.config.maxPromotionsPerSweep})`);
                break;
            }
            
            // Skip duplicates
            if (existingMemory.includes(entry.text)) continue;

            // Write to MEMORY.md
            const date = new Date().toISOString().split('T')[0];
            const entryLine = `\n## ${date}\n${entry.text}\n`;
            
            existingMemory += entryLine;
            promoted.push(entry);
            promotedCount++;
            
            console.log(`[Deep Phase] ⬆️  "${entry.text.substring(0, 40)}..." (score: ${entry.score.toFixed(2)})`);
        }

        await fs.writeFile(this.memoryFile, existingMemory);

        // Write deep phase summary
        const deepOutput = {
            phase: 'deep',
            timestamp: new Date().toISOString(),
            scored: scored.length,
            promoted: promoted.length,
            topScore: scored[0]?.score.toFixed(2) || 0,
            thresholds: this.config
        };

        await this.writePhaseOutput('deep', deepOutput);

        console.log(`[Deep Phase] ✅ ${promoted.length}/${scored.length} promoted (max: ${this.config.maxPromotionsPerSweep})`);
        return promoted;
    }

    calculateScore(candidate) {
        // Six weighted signals (from OpenClaw)
        // Relevance: 0.30, Frequency: 0.24, Query diversity: 0.15
        // Recency: 0.15, Consolidation: 0.10, Conceptual richness: 0.06

        let score = 0;
        
        // Frequency (0.24 weight)
        score += 0.24 * Math.min(1, candidate.signals / 5);
        
        // Relevance (0.30 weight)
        score += 0.30 * Math.min(1, (candidate.recallCount || 0) / 5);
        
        // Query diversity (0.15 weight)
        score += 0.15 * Math.min(1, (candidate.uniqueQueries || 1) / 3);
        
        // Recency (0.15 weight) — 14-day half-life
        const recencyDays = this.daysSince(candidate.lastSeen);
        const recencyScore = Math.pow(0.5, recencyDays / this.config.recencyHalfLifeDays);
        score += 0.15 * recencyScore;
        
        // Consolidation (0.10 weight)
        const consolidationScore = candidate.signals > 1 ? 0.5 : 0;
        score += 0.10 * consolidationScore;
        
        // Conceptual richness (0.06 weight)
        const concepts = (candidate.text.match(/\b\w+\b/g) || []).length;
        score += 0.06 * Math.min(1, concepts / 20);
        
        // REM boost (max +0.08)
        score += candidate.remBoost || 0;

        return Math.min(1, Math.max(0, score));
    }

    shouldPromote(candidate) {
        // Three gates must ALL pass
        return candidate.score >= this.config.minScore &&
               (candidate.signals || 0) >= this.config.minRecallCount &&
               (candidate.uniqueQueries || 0) >= this.config.minUniqueQueries;
    }

    daysSince(dateStr) {
        if (!dateStr) return 30;
        const date = new Date(dateStr);
        return Math.floor((Date.now() - date.getTime()) / 86400000);
    }

    extractThemes(candidates) {
        const themes = [];
        const patterns = [
            [/api|rest|endpoint|graphql/i, 'API Design'],
            [/memory|dream|remember|forget/i, 'Memory'],
            [/agent|multi|coordination|team/i, 'Agents'],
            [/security|vulnerability|scan/i, 'Security'],
            [/test|qa|review|approve/i, 'Testing'],
            [/android|mobile|phone/i, 'Android']
        ];

        for (const [regex, name] of patterns) {
            const matches = candidates.filter(c => regex.test(c.text));
            if (matches.length >= 2) themes.push(name);
        }

        return themes;
    }

    buildRecallPatterns(candidates) {
        return candidates
            .filter(c => c.signals > 1)
            .map(c => ({ text: c.text.substring(0, 50), signals: c.signals }));
    }

    async getRecentDailyFiles(days) {
        const files = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(Date.now() - i * 86400000);
            const filePath = path.join(this.memoryDir, `${date.toISOString().split('T')[0]}.md`);
            try {
                await fs.access(filePath);
                files.push(filePath);
            } catch { /* ignore */ }
        }
        return files;
    }

    async writePhaseOutput(phase, data) {
        const phaseDir = path.join(this.dreamsDir, phase);
        await fs.mkdir(phaseDir, { recursive: true });
        
        const date = new Date().toISOString().split('T')[0];
        const filePath = path.join(phaseDir, `${date}.json`);
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        // Append to DREAMS.md
        const dreamEntry = `\n## ${phase} ${new Date().toISOString()}\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
        
        try {
            const existing = await fs.readFile(this.dreamsFile, 'utf8');
            await fs.writeFile(this.dreamsFile, existing + dreamEntry);
        } catch {
            await fs.writeFile(this.dreamsFile, dreamEntry);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // FULL DREAM CYCLE (Light → REM → Deep)
    // ═══════════════════════════════════════════════════════════
    async dream() {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`   🌙 DREAMING ENGINE v${VERSION} — Starting cycle`);
        console.log(`${'═'.repeat(60)}\n`);

        await this.init();

        // Phase 1: Light
        const candidates = await this.lightPhase();

        // Phase 2: REM (before Deep!)
        await this.remPhase(candidates);

        // Phase 3: Deep
        const promoted = await this.deepPhase(candidates);

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`   🌅 DREAMING COMPLETE`);
        console.log(`   Candidates: ${candidates.length}`);
        console.log(`   Promoted: ${promoted.length}`);
        console.log(`   Thresholds: score≥${this.config.minScore}, recalls≥${this.config.minRecallCount}, queries≥${this.config.minUniqueQueries}`);
        console.log(`${'═'.repeat(60)}\n`);

        return { candidates, promoted };
    }

    async status() {
        const stats = { version: VERSION, phaseOutputs: {} };
        for (const phase of ['light', 'rem', 'deep']) {
            const phaseDir = path.join(this.dreamsDir, phase);
            try {
                stats.phaseOutputs[phase] = (await fs.readdir(phaseDir)).length;
            } catch {
                stats.phaseOutputs[phase] = 0;
            }
        }
        return stats;
    }
}

if (require.main === module) {
    const engine = new DreamingEngine();
    const command = process.argv[2];

    if (command === 'dream') {
        engine.dream().catch(console.error);
    } else if (command === 'status') {
        engine.status().then(s => console.log(JSON.stringify(s, null, 2)));
    } else {
        console.log(`
DreamingEngine v${VERSION}

Usage:
  node dreaming-engine.js dream    # Full cycle (Light → REM → Deep)
  node dreaming-engine.js status  # Show phase counts

Phase order: Light → REM → Deep

Thresholds:
  minScore: ${engine.config.minScore}
  minRecallCount: ${engine.config.minRecallCount}
  minUniqueQueries: ${engine.config.minUniqueQueries}
        `);
    }
}

module.exports = { DreamingEngine };
