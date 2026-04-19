#!/usr/bin/env node
/**
 * Hive Budget — Agent Constraints & Resource Management
 * 
 * Features:
 * - Limit agent spawning
 * - Time budgeting
 * - Token budgeting
 * - Cost controls
 * - Concurrency limits
 */

const fs = require('fs');
const path = require('path');

class HiveBudget {
    constructor() {
        this.budgetDir = '/tmp/hive-budget';
        if (!fs.existsSync(this.budgetDir)) fs.mkdirSync(this.budgetDir, { recursive: true });
        
        this.config = this.loadConfig();
        this.usage = this.loadUsage();
        this.limits = this.loadLimits();
    }

    loadConfig() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.budgetDir, 'config.json'), 'utf-8');
        } catch {
            return {
                maxAgents: 10,
                maxConcurrent: 5,
                maxTokensPerDay: 1000000,
                maxTokensPerTask: 50000,
                maxTimePerTask: 300000, // 5 min
                maxTotalTime: 3600000, // 1 hour
                costLimitPerDay: 100, // $100
                enableLimits: true
            };
        }
    }

    loadUsage() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.budgetDir, 'usage.json'), 'utf-8'));
        } catch {
            return {
                agentsSpawned: 0,
                tasksCompleted: 0,
                totalTokens: 0,
                totalTime: 0,
                totalCost: 0,
                activeAgents: [],
                tasks: [],
                dailyTokens: {},
                dailyCost: {}
            };
        }
    }

    loadLimits() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.budgetDir, 'limits.json'), 'utf-8'));
        } catch {
            return {
                agentLimits: {},
                taskLimits: {},
                globalLimits: {}
            };
        }
    }

    saveConfig() {
        fs.writeFileSync(path.join(this.budgetDir, 'config.json'), JSON.stringify(this.config, null, 2));
    }

    saveUsage() {
        fs.writeFileSync(path.join(this.budgetDir, 'usage.json'), JSON.stringify(this.usage, null, 2));
    }

    saveLimits() {
        fs.writeFileSync(path.join(this.budgetDir, 'limits.json'), JSON.stringify(this.limits, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // SET LIMITS
    // ═══════════════════════════════════════════════════════════

    setLimit(type, key, value) {
        switch (type) {
            case 'agent':
                this.config[`maxAgents`] = value;
                break;
            case 'concurrent':
                this.config[`maxConcurrent`] = value;
                break;
            case 'tokens':
                this.config[`maxTokensPerTask`] = value;
                break;
            case 'time':
                this.config[`maxTimePerTask`] = value;
                break;
            case 'cost':
                this.config[`costLimitPerDay`] = value;
                break;
            default:
                this.limits[type] = this.limits[type] || {};
                this.limits[type][key] = value;
                this.saveLimits();
                return;
        }
        this.saveConfig();
        console.log(`\n✓ Set ${type} limit to ${value}`);
    }

    setAgentLimit(agentType, maxCount) {
        this.limits.agentLimits[agentType] = { max: maxCount, current: 0 };
        this.saveLimits();
        console.log(`\n✓ Set ${agentType} limit to ${maxCount}`);
    }

    setTaskLimit(taskType, maxTokens, maxTime) {
        this.limits.taskLimits[taskType] = { maxTokens, maxTime, currentTokens: 0, currentTime: 0 };
        this.saveLimits();
        console.log(`\n✓ Set task limit for ${taskType}: ${maxTokens} tokens, ${maxTime}ms`);
    }

    // ═══════════════════════════════════════════════════════════
    // CHECK BEFORE SPAWN
    // ═══════════════════════════════════════════════════════════

    canSpawn(agentType = 'default') {
        const result = {
            canSpawn: true,
            reasons: [],
            warnings: []
        };

        // Check if limits enabled
        if (!this.config.enableLimits) {
            return result;
        }

        // Check concurrent limit
        if (this.usage.activeAgents.length >= this.config.maxConcurrent) {
            result.canSpawn = false;
            result.reasons.push(`Concurrent limit reached (${this.config.maxConcurrent})`);
        }

        // Check total agent limit
        if (this.usage.agentsSpawned >= this.config.maxAgents) {
            result.canSpawn = false;
            result.reasons.push(`Total agent limit reached (${this.config.maxAgents})`);
        }

        // Check agent-type limit
        if (this.limits.agentLimits[agentType]) {
            const limit = this.limits.agentLimits[agentType];
            if (limit.current >= limit.max) {
                result.canSpawn = false;
                result.reasons.push(`${agentType} limit reached (${limit.max})`);
            }
        }

        // Check token budget
        const today = new Date().toDateString();
        const dailyTokens = this.usage.dailyTokens[today] || 0;
        if (dailyTokens >= this.config.maxTokensPerDay) {
            result.canSpawn = false;
            result.reasons.push(`Daily token limit reached (${this.config.maxTokensPerDay})`);
        }

        // Warnings
        if (this.usage.activeAgents.length >= this.config.maxConcurrent - 2) {
            result.warnings.push(`Approaching concurrent limit (${this.usage.activeAgents.length}/${this.config.maxConcurrent})`);
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════
    // SPAWN TRACKING
    // ═══════════════════════════════════════════════════════════

    trackSpawn(agentId, agentType = 'default') {
        const today = new Date().toDateString();
        
        this.usage.agentsSpawned++;
        this.usage.activeAgents.push({ id: agentId, type: agentType, startTime: Date.now() });
        
        // Update agent-type counts
        if (this.limits.agentLimits[agentType]) {
            this.limits.agentLimits[agentType].current++;
        }

        this.saveUsage();
        this.saveLimits();

        console.log(`\n✓ Tracked spawn: ${agentId} (${agentType})`);
        console.log(`   Active: ${this.usage.activeAgents.length}/${this.config.maxConcurrent}`);
    }

    trackComplete(agentId, tokens = 0, time = 0, cost = 0) {
        const today = new Date().toDateString();
        
        // Remove from active
        const idx = this.usage.activeAgents.findIndex(a => a.id === agentId);
        if (idx !== -1) {
            const agent = this.usage.activeAgents.splice(idx, 1)[0];
            
            // Update agent-type counts
            if (this.limits.agentLimits[agent.type]) {
                this.limits.agentLimits[agent.type].current--;
            }
        }

        // Update stats
        this.usage.tasksCompleted++;
        this.usage.totalTokens += tokens;
        this.usage.totalTime += time;
        this.usage.totalCost += cost;
        
        this.usage.dailyTokens[today] = (this.usage.dailyTokens[today] || 0) + tokens;
        this.usage.dailyCost[today] = (this.usage.dailyCost[today] || 0) + cost;

        // Clean old daily data (keep 7 days)
        this.cleanOldData();

        this.saveUsage();
        this.saveLimits();

        console.log(`\n✓ Tracked completion: ${agentId}`);
        console.log(`   Tokens: ${tokens} | Time: ${time}ms | Cost: $${cost.toFixed(2)}`);
        console.log(`   Active: ${this.usage.activeAgents.length}/${this.config.maxConcurrent}`);
    }

    trackFail(agentId, reason) {
        const agent = this.usage.activeAgents.find(a => a.id === agentId);
        if (agent && this.limits.agentLimits[agent.type]) {
            this.limits.agentLimits[agent.type].current--;
        }
        
        const idx = this.usage.activeAgents.findIndex(a => a.id === agentId);
        if (idx !== -1) {
            this.usage.activeAgents.splice(idx, 1);
        }
        
        this.saveUsage();
        this.saveLimits();
        
        console.log(`\n✗ Tracked failure: ${agentId}`);
        console.log(`   Reason: ${reason}`);
    }

    // ═══════════════════════════════════════════════════════════
    // TASK BUDGET
    // ═══════════════════════════════════════════════════════════

    checkTaskBudget(taskType, estimatedTokens = 0, estimatedTime = 0) {
        const result = {
            canProceed: true,
            reasons: [],
            warnings: []
        };

        if (!this.config.enableLimits) {
            return result;
        }

        // Check task-type limits
        if (this.limits.taskLimits[taskType]) {
            const limit = this.limits.taskLimits[taskType];
            
            if (estimatedTokens > limit.maxTokens) {
                result.canProceed = false;
                result.reasons.push(`Task exceeds token limit (${estimatedTokens} > ${limit.maxTokens})`);
            }
            
            if (estimatedTime > limit.maxTime) {
                result.canProceed = false;
                result.reasons.push(`Task exceeds time limit (${estimatedTime}ms > ${limit.maxTime}ms)`);
            }
        }

        // Check global limits
        if (estimatedTokens > this.config.maxTokensPerTask) {
            result.warnings.push(`Task approaching token limit (${estimatedTokens}/${this.config.maxTokensPerTask})`);
        }

        if (estimatedTime > this.config.maxTimePerTask) {
            result.warnings.push(`Task approaching time limit (${estimatedTime}ms/${this.config.maxTimePerTask}ms)`);
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════

    cleanOldData() {
        const sevenDaysAgo = Date.now() - (7 * 86400000);
        const dates = Object.keys(this.usage.dailyTokens);
        
        for (const date of dates) {
            const timestamp = new Date(date).getTime();
            if (timestamp < sevenDaysAgo) {
                delete this.usage.dailyTokens[date];
                delete this.usage.dailyCost[date];
            }
        }
    }

    resetDaily() {
        const today = new Date().toDateString();
        this.usage.dailyTokens[today] = 0;
        this.usage.dailyCost[today] = 0;
        this.saveUsage();
        console.log('\n✓ Reset daily counters');
    }

    resetAll() {
        this.usage = {
            agentsSpawned: 0,
            tasksCompleted: 0,
            totalTokens: 0,
            totalTime: 0,
            totalCost: 0,
            activeAgents: [],
            tasks: [],
            dailyTokens: {},
            dailyCost: {}
        };
        this.saveUsage();
        console.log('\n✓ Reset all usage data');
    }

    // ═══════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════

    status() {
        const today = new Date().toDateString();
        
        console.log('\n' + '='.repeat(60));
        console.log('🐝 HIVE BUDGET STATUS');
        console.log('='.repeat(60));

        console.log('\n📊 LIMITS:');
        console.log(`   Max Agents: ${this.config.maxAgents}`);
        console.log(`   Max Concurrent: ${this.config.maxConcurrent}`);
        console.log(`   Max Tokens/Task: ${this.config.maxTokensPerTask.toLocaleString()}`);
        console.log(`   Max Time/Task: ${Math.round(this.config.maxTimePerTask / 1000)}s`);
        console.log(`   Daily Token Limit: ${this.config.maxTokensPerDay.toLocaleString()}`);
        console.log(`   Daily Cost Limit: $${this.config.costLimitPerDay}`);
        console.log(`   Limits Enabled: ${this.config.enableLimits ? '✅' : '❌'}`);

        console.log('\n📈 CURRENT USAGE:');
        console.log(`   Active Agents: ${this.usage.activeAgents.length}/${this.config.maxConcurrent}`);
        console.log(`   Total Spawned: ${this.usage.agentsSpawned}`);
        console.log(`   Tasks Completed: ${this.usage.tasksCompleted}`);
        console.log(`   Total Tokens: ${this.usage.totalTokens.toLocaleString()}`);
        console.log(`   Total Time: ${Math.round(this.usage.totalTime / 1000)}s`);
        console.log(`   Total Cost: $${this.usage.totalCost.toFixed(2)}`);

        console.log('\n📅 TODAY:');
        console.log(`   Tokens: ${(this.usage.dailyTokens[today] || 0).toLocaleString()} / ${this.config.maxTokensPerDay.toLocaleString()}`);
        console.log(`   Cost: $${(this.usage.dailyCost[today] || 0).toFixed(2)} / $${this.config.costLimitPerDay}`);

        if (this.usage.activeAgents.length > 0) {
            console.log('\n🔵 ACTIVE AGENTS:');
            for (const a of this.usage.activeAgents) {
                const dur = Date.now() - a.startTime;
                console.log(`   ${a.id} (${a.type}) - ${Math.round(dur / 1000)}s`);
            }
        }

        if (Object.keys(this.limits.agentLimits).length > 0) {
            console.log('\n🤖 AGENT LIMITS:');
            for (const [type, limit] of Object.entries(this.limits.agentLimits)) {
                console.log(`   ${type}: ${limit.current}/${limit.max}`);
            }
        }

        if (Object.keys(this.limits.taskLimits).length > 0) {
            console.log('\n📋 TASK LIMITS:');
            for (const [type, limit] of Object.entries(this.limits.taskLimits)) {
                console.log(`   ${type}: ${limit.maxTokens} tokens, ${limit.maxTime}ms`);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ENFORCE
    // ═══════════════════════════════════════════════════════════

    enforce(agentType = 'default') {
        const canSpawn = this.canSpawn(agentType);
        
        if (!canSpawn.canSpawn) {
            console.log('\n🚫 CANNOT SPAWN:');
            for (const r of canSpawn.reasons) {
                console.log(`   • ${r}`);
            }
            return false;
        }

        if (canSpawn.warnings.length > 0) {
            console.log('\n⚠️ WARNINGS:');
            for (const w of canSpawn.warnings) {
                console.log(`   • ${w}`);
            }
        }

        console.log('\n✅ CAN SPAWN');
        return true;
    }
}

// CLI
const budget = new HiveBudget();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    status: () => budget.status(),
    
    set: () => budget.setLimit(args[0], args[1], parseInt(args[2]) || parseFloat(args[2])),
    
    agentLimit: () => budget.setAgentLimit(args[0], parseInt(args[1])),
    taskLimit: () => budget.setTaskLimit(args[0], parseInt(args[1]), parseInt(args[2]) || 300000),
    
    canSpawn: () => {
        const result = budget.canSpawn(args[0] || 'default');
        console.log(result.canSpawn ? '\n✅ CAN SPAWN' : '\n🚫 CANNOT SPAWN');
        for (const r of result.reasons) console.log(`   ${r}`);
        for (const w of result.warnings) console.log(`   ⚠️ ${w}`);
    },
    
    checkTask: () => {
        const result = budget.checkTaskBudget(args[0], parseInt(args[1]) || 0, parseInt(args[2]) || 0);
        console.log(result.canProceed ? '\n✅ CAN PROCEED' : '\n🚫 CANNOT PROCEED');
        for (const r of result.reasons) console.log(`   ${r}`);
        for (const w of result.warnings) console.log(`   ⚠️ ${w}`);
    },
    
    spawn: () => budget.trackSpawn(args[0] || `A-${Date.now()}`, args[1] || 'default'),
    complete: () => budget.trackComplete(args[0], parseInt(args[1]) || 0, parseInt(args[2]) || 0, parseFloat(args[3]) || 0),
    fail: () => budget.trackFail(args[0], args.slice(1).join(' ')),
    
    resetDaily: () => budget.resetDaily(),
    resetAll: () => budget.resetAll(),
    
    enable: () => {
        budget.config.enableLimits = true;
        budget.saveConfig();
        console.log('\n✅ Limits enabled');
    },
    
    disable: () => {
        budget.config.enableLimits = false;
        budget.saveConfig();
        console.log('\n❌ Limits disabled');
    },
    
    enforce: () => budget.enforce(args[0] || 'default'),
    
    help: () => console.log(`
Hive Budget Commands

  status                  View current status
  
  set <type> <value>     Set global limit
    Types: agent, concurrent, tokens, time, cost
  
  agentLimit <type> <n>  Set per-agent-type limit
  taskLimit <type> <tokens> [time]  Set per-task-type limit
  
  canSpawn [type]         Check if can spawn agent
  enforce [type]          Enforce limits (exit 1 if can't)
  
  checkTask <type> [tokens] [time]  Check task budget
  
  spawn <id> [type]       Track spawn
  complete <id> [tokens] [time] [cost]  Track completion
  fail <id> [reason]     Track failure
  
  resetDaily              Reset daily counters
  resetAll                Reset all usage data
  
  enable                  Enable limits
  disable                 Disable limits
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveBudget };
