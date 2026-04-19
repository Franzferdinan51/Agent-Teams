#!/usr/bin/env node
/**
 * agent-teams v1.0.0 - Dreaming Engine
 * Background memory consolidation with Light → Deep → REM phases
 * Based on OpenClaw's memory-core dreaming system
 */

const fs = require('fs').promises;
const path = require('path');

const VERSION = '1.0.0';
const DREAMS_DIR = 'memory/.dreams';
const MEMORY_DIR = 'memory';

class DreamingEngine {
    constructor() {
        this.dreamsDir = path.join(process.cwd(), DREAMS_DIR);
        this.memoryDir = path.join(process.cwd(), MEMORY_DIR);
        this.dreamsFile = path.join(process.cwd(), 'DREAMS.md');
        this.memoryFile = path.join(process.cwd(), 'MEMORY.md');
    }

    async init() {
        await fs.mkdir(this.dreamsDir, { recursive: true });
        await fs.mkdir(this.memoryDir, { recursive: true });
        
        console.log(`[DreamingEngine v${VERSION}] Initialized`);
        console.log(`   Dreams dir: ${this.dreamsDir}`);
        console.log(`   Memory dir: ${this.memoryDir}`);
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 1: LIGHT SLEEP
    // Ingest recent signals, dedupe, stage candidates
    // ═══════════════════════════════════════════════════════════
    async lightPhase() {
        console.log(`\n[Light Phase] 😴 Processing...`);
        
        // Read recent daily notes
        const today = new Date().toISOString().split('T')[0];
        const recentFiles = await this.getRecentDailyFiles(7);
        
        const candidates = [];
        
        for (const file of recentFiles) {
            const content = await fs.readFile(file, 'utf8');
            const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
            
            for (const line of lines) {
                // Score for novelty
                if (!this.isDuplicate(line, candidates)) {
                    candidates.push({
                        text: line,
                        source: path.basename(file),
                        signals: 1,
                        lastSeen: today
                    });
                } else {
                    // Increment signal
                    const existing = candidates.find(c => c.text === line);
                    if (existing) existing.signals++;
                }
            }
        }

        // Write light phase output
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
    // PHASE 2: DEEP SLEEP
    // Score and promote to MEMORY.md
    // ═══════════════════════════════════════════════════════════
    async deepPhase(candidates = []) {
        console.log(`\n[Deep Phase] 🌙 Processing...`);
        
        if (candidates.length === 0) {
            console.log(`[Deep Phase] ⏭️  No candidates from light phase`);
            return [];
        }

        // Score candidates using weighted signals
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

        // Promote qualified entries
        const promoted = [];
        
        for (const entry of scored.filter(e => e.promote)) {
            // Skip duplicates
            if (existingMemory.includes(entry.text)) {
                console.log(`[Deep Phase] ⏭️  Duplicate: ${entry.text.substring(0, 50)}...`);
                continue;
            }

            // Write to MEMORY.md
            const date = new Date().toISOString().split('T')[0];
            const entryLine = `\n## ${date}\n${entry.text}\n`;
            
            existingMemory += entryLine;
            promoted.push(entry);
            
            console.log(`[Deep Phase] ⬆️  Promoted: ${entry.text.substring(0, 50)}... (score: ${entry.score.toFixed(2)})`);
        }

        // Save MEMORY.md
        await fs.writeFile(this.memoryFile, existingMemory);

        // Write deep phase summary
        const deepOutput = {
            phase: 'deep',
            timestamp: new Date().toISOString(),
            scored: scored.length,
            promoted: promoted.length,
            topScore: scored[0]?.score || 0
        };

        await this.writePhaseOutput('deep', deepOutput);

        console.log(`[Deep Phase] ✅ ${promoted.length}/${scored.length} promoted`);
        return promoted;
    }

    calculateScore(candidate) {
        // Weighted scoring from OpenClaw:
        // Frequency: 0.24, Relevance: 0.30, Query diversity: 0.15
        // Recency: 0.15, Consolidation: 0.10, Conceptual richness: 0.06

        const signals = candidate.signals || 1;
        const recencyDays = this.daysSince(candidate.lastSeen);
        
        // Normalize to 0-1
        let score = 0;
        
        // Frequency (0.24 weight) — how many signals
        score += 0.24 * Math.min(1, signals / 5);
        
        // Relevance (0.30 weight) — conceptual density
        score += 0.30 * Math.min(1, candidate.text.length / 100);
        
        // Recency (0.15 weight) — time decay
        score += 0.15 * Math.max(0, 1 - (recencyDays / 30));
        
        // Consolidation (0.10 weight) — multi-day persistence
        score += 0.10 * (candidate.lastSeen ? 0.5 : 0);
        
        // Conceptual richness (0.06 weight) — concept density
        const concepts = (candidate.text.match(/\b\w+\b/g) || []).length;
        score += 0.06 * Math.min(1, concepts / 20);
        
        // Query diversity bonus
        score += 0.00; // Placeholder for query diversity

        return Math.min(1, Math.max(0, score));
    }

    shouldPromote(candidate) {
        // Thresholds from OpenClaw:
        const minScore = 0.7;
        const minSignals = 2;
        const minRecallDiversity = 1;

        return candidate.score >= minScore &&
               candidate.signals >= minSignals;
    }

    daysSince(dateStr) {
        if (!dateStr) return 30;
        const date = new Date(dateStr);
        return Math.floor((Date.now() - date.getTime()) / 86400000);
    }

    // ═══════════════════════════════════════════════════════════
    // PHASE 3: REM SLEEP
    // Theme extraction and reflection
    // ═══════════════════════════════════════════════════════════
    async remPhase() {
        console.log(`\n[REM Phase] 🌌 Processing...`);
        
        // Read recent dreams and memories
        const recentMemories = await this.getRecentPromotions(14);
        const existingDreams = await this.getExistingDreams();
        
        // Extract themes
        const themes = this.extractThemes(recentMemories);
        
        // Write REM summary
        const remOutput = {
            phase: 'rem',
            timestamp: new Date().toISOString(),
            themes: themes.length,
            reflection: `Recent themes: ${themes.join(', ')}`
        };

        await this.writePhaseOutput('rem', remOutput);

        console.log(`[REM Phase] ✅ Themes: ${themes.join(', ')}`);
        return themes;
    }

    extractThemes(memories) {
        // Simple theme extraction
        const themes = [];
        const patterns = [
            /api|rest|endpoint|graphql/i,
            /memory|dream|remember|forget/i,
            /agent|multi|coordination|team/i,
            /security|vulnerability|scan/i,
            /test|qa|review|approve/i
        ];

        const patternNames = ['API Design', 'Memory', 'Agents', 'Security', 'Testing'];

        for (let i = 0; i < patterns.length; i++) {
            const matches = memories.filter(m => patterns[i].test(m.text));
            if (matches.length >= 2) {
                themes.push(patternNames[i]);
            }
        }

        return themes;
    }

    async getRecentPromotions(days) {
        try {
            const memory = await fs.readFile(this.memoryFile, 'utf8');
            return memory.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        } catch {
            return [];
        }
    }

    async getExistingDreams() {
        try {
            return await fs.readFile(this.dreamsFile, 'utf8');
        } catch {
            return '';
        }
    }

    async getRecentDailyFiles(days) {
        const files = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(Date.now() - i * 86400000);
            const dateStr = date.toISOString().split('T')[0];
            const filePath = path.join(this.memoryDir, `${dateStr}.md`);
            
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
        
        // Also append to DREAMS.md
        const dreamEntry = `\n## ${phase} ${new Date().toISOString()}\n${JSON.stringify(data, null, 2)}\n`;
        
        try {
            const existing = await fs.readFile(this.dreamsFile, 'utf8');
            await fs.writeFile(this.dreamsFile, existing + dreamEntry);
        } catch {
            await fs.writeFile(this.dreamsFile, dreamEntry);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // FULL DREAM CYCLE
    // ═══════════════════════════════════════════════════════════
    async dream() {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`   🌙 DREAMING ENGINE v${VERSION} — Starting cycle`);
        console.log(`${'═'.repeat(60)}\n`);

        await this.init();

        // Phase 1: Light
        const candidates = await this.lightPhase();

        // Phase 2: Deep
        const promoted = await this.deepPhase(candidates);

        // Phase 3: REM
        const themes = await this.remPhase();

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`   🌅 DREAMING COMPLETE`);
        console.log(`   Candidates: ${candidates.length}`);
        console.log(`   Promoted: ${promoted.length}`);
        console.log(`   Themes: ${themes.join(', ') || 'none'}`);
        console.log(`${'═'.repeat(60)}\n`);

        return { candidates, promoted, themes };
    }

    // ═══════════════════════════════════════════════════════════
    // SCHEDULE (cron-style)
    // ═══════════════════════════════════════════════════════════
    schedule(frequencyCron = '0 3 * * *') {
        // Default: 3 AM daily
        console.log(`[DreamingEngine] 📅 Scheduled: ${frequencyCron}`);
        
        // Parse cron (simplified)
        const [minute, hour] = frequencyCron.split(' ');
        
        const runAt = () => {
            const now = new Date();
            if (now.getMinutes() === parseInt(minute) && now.getHours() === parseInt(hour)) {
                console.log(`[DreamingEngine] ⏰ Triggering scheduled dream...`);
                this.dream().catch(console.error);
            }
        };

        // Check every minute
        setInterval(runAt, 60000);
        
        console.log(`[DreamingEngine] 🕐 Running at ${hour}:${minute.padStart(2, '0')} daily`);
    }

    // Check dreaming status
    async status() {
        const stats = {
            version: VERSION,
            dreamsDir: this.dreamsDir,
            phaseOutputs: {}
        };

        for (const phase of ['light', 'deep', 'rem']) {
            const phaseDir = path.join(this.dreamsDir, phase);
            try {
                const files = await fs.readdir(phaseDir);
                stats.phaseOutputs[phase] = files.length;
            } catch {
                stats.phaseOutputs[phase] = 0;
            }
        }

        return stats;
    }
}

// CLI
if (require.main === module) {
    const engine = new DreamingEngine();
    const command = process.argv[2];

    (async () => {
        switch (command) {
            case 'dream':
                await engine.dream();
                break;
            case 'status':
                console.log(await engine.status());
                break;
            case 'schedule':
                engine.schedule(process.argv[3] || '0 3 * * *');
                console.log('Dreaming scheduled. Press Ctrl+C to stop.');
                break;
            default:
                console.log(`
DreamingEngine v${VERSION}

Usage:
  node dreaming-engine.js dream      # Run full cycle
  node dreaming-engine.js status    # Show status
  node dreaming-engine.js schedule  # Run daily at 3 AM

Phases:
  Light → Deep → REM
  - Light: Stage candidates from daily notes
  - Deep: Score & promote to MEMORY.md
  - REM: Extract themes & reflections
                `);
        }
    })();
}

module.exports = { DreamingEngine };