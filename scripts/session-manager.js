#!/usr/bin/env node
/**
 * agent-teams v1.0.0 - Session Manager
 * Handles session lifecycle with memory context loading
 */

const fs = require('fs').promises;
const path = require('path');

const MEMORY_DIR = 'memory';

class SessionManager {
    constructor() {
        this.workspace = process.cwd();
        this.memoryDir = path.join(this.workspace, MEMORY_DIR);
        this.sessionId = this.generateSessionId();
        this.context = null;
    }

    generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    async start() {
        console.log(`\n[SessionManager v1.0.0] Starting session: ${this.sessionId}`);
        
        // Load all memory layers
        this.context = await this.loadContext();
        
        console.log(`[SessionManager] ✅ Loaded memory context`);
        console.log(`   Long-term: ${this.context.longTerm.length} entries`);
        console.log(`   Today: ${this.context.today.length} entries`);
        console.log(`   Yesterday: ${this.context.yesterday.length} entries`);
        console.log(`   Dreams: ${this.context.dreams.length} entries`);
        
        return this.context;
    }

    async loadContext() {
        const context = {
            longTerm: [],
            today: [],
            yesterday: [],
            dreams: [],
            sessionMeta: {
                sessionId: this.sessionId,
                startedAt: new Date().toISOString(),
                workspace: this.workspace
            }
        };

        // 1. Load MEMORY.md (long-term)
        const memoryFile = path.join(this.workspace, 'MEMORY.md');
        try {
            const memory = await fs.readFile(memoryFile, 'utf8');
            context.longTerm = this.parseMarkdown(memory);
        } catch {
            console.log(`[SessionManager] ⚠️  No MEMORY.md found (will create on first write)`);
        }

        // 2. Load today's notes
        const today = new Date().toISOString().split('T')[0];
        try {
            const todayFile = path.join(this.memoryDir, `${today}.md`);
            const todayNotes = await fs.readFile(todayFile, 'utf8');
            context.today = this.parseMarkdown(todayNotes);
        } catch { /* ignore */ }

        // 3. Load yesterday's notes
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        try {
            const yestFile = path.join(this.memoryDir, `${yesterday}.md`);
            const yestNotes = await fs.readFile(yestFile, 'utf8');
            context.yesterday = this.parseMarkdown(yestNotes);
        } catch { /* ignore */ }

        // 4. Load DREAMS.md
        const dreamsFile = path.join(this.workspace, 'DREAMS.md');
        try {
            const dreams = await fs.readFile(dreamsFile, 'utf8');
            context.dreams = this.parseMarkdown(dreams);
        } catch { /* ignore */ }

        return context;
    }

    parseMarkdown(content) {
        return content.split('\n').filter(line => {
            return line.trim() && !line.startsWith('#'); // Skip headers
        });
    }

    async writeMemory(type, content) {
        const timestamp = new Date().toISOString();
        const today = timestamp.split('T')[0];
        
        let filePath;
        let entry = `\n## ${timestamp}\n${content}\n`;

        switch (type) {
            case 'longTerm':
                filePath = path.join(this.workspace, 'MEMORY.md');
                break;
            case 'daily':
                filePath = path.join(this.memoryDir, `${today}.md`);
                break;
            case 'dream':
                filePath = path.join(this.workspace, 'DREAMS.md');
                break;
            default:
                throw new Error(`Unknown memory type: ${type}`);
        }

        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        // Append or create
        try {
            const existing = await fs.readFile(filePath, 'utf8');
            await fs.writeFile(filePath, existing + entry);
        } catch {
            await fs.writeFile(filePath, entry);
        }

        console.log(`[SessionManager] 💾 Wrote to ${type}: ${content.substring(0, 50)}...`);
    }

    getContext() {
        return this.context;
    }

    async end() {
        console.log(`\n[SessionManager] Ending session: ${this.sessionId}`);
        
        // Flush important context to memory
        // (In real implementation, would run auto-flush like OpenClaw)
        
        return {
            sessionId: this.sessionId,
            endedAt: new Date().toISOString(),
            duration: Date.now() - new Date(this.context.sessionMeta.startedAt).getTime()
        };
    }
}

// CLI usage
if (require.main === module) {
    const manager = new SessionManager();
    
    const command = process.argv[2];
    
    (async () => {
        switch (command) {
            case 'start':
                await manager.start();
                console.log('\n[SessionManager] Context loaded, ready for tasks');
                break;
            case 'write':
                await manager.start();
                const type = process.argv[3] || 'daily';
                const content = process.argv[4] || '';
                await manager.writeMemory(type, content);
                break;
            case 'end':
                await manager.end();
                break;
            default:
                console.log(`
SessionManager v1.0.0

Usage:
  node session-manager.js start        # Start session, load context
  node session-manager.js write <type> <content>  # Write to memory
  node session-manager.js end          # End session

Types:
  longTerm  - MEMORY.md (durable facts)
  daily     - memory/YYYY-MM-DD.md (today's notes)
  dream     - DREAMS.md (consolidation diary)
                `);
        }
    })();
}

module.exports = { SessionManager };