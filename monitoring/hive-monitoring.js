#!/usr/bin/env node
/**
 * Hive Monitoring - System & Performance Monitoring
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

class HiveMonitoring {
    constructor() {
        this.dataDir = '/tmp/hive-monitoring';
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
        this.data = this.loadData();
    }

    loadData() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.dataDir, 'monitor-data.json'), 'utf-8'));
        } catch { return { metrics: [], alerts: [], history: [] }; }
    }

    saveData() {
        fs.writeFileSync(path.join(this.dataDir, 'monitor-data.json'), JSON.stringify(this.data, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // SYSTEM METRICS
    // ═══════════════════════════════════════════════════════════

    getSystemMetrics() {
        const metrics = {
            cpu: {
                usage: os.loadavg(),
                cores: os.cpus().length,
                model: os.cpus()[0]?.model || 'unknown'
            },
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem(),
                usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
            },
            uptime: os.uptime(),
            platform: os.platform(),
            hostname: os.hostname()
        };

        // Store metric
        this.data.metrics.push({
            ...metrics,
            timestamp: Date.now()
        });

        // Keep only last 1000 metrics
        if (this.data.metrics.length > 1000) {
            this.data.metrics = this.data.metrics.slice(-1000);
        }

        this.saveData();
        return metrics;
    }

    getProcessMetrics() {
        const mem = process.memoryUsage();
        const cpu = process.cpuUsage();

        return {
            memory: {
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                rss: Math.round(mem.rss / 1024 / 1024),
                external: Math.round(mem.external / 1024 / 1024)
            },
            cpu: {
                user: cpu.user,
                system: cpu.system
            },
            uptime: process.uptime(),
            pid: process.pid
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ALERTS
    // ═══════════════════════════════════════════════════════════

    checkAlerts() {
        const alerts = [];
        const metrics = this.getSystemMetrics();

        // Memory alert
        if (metrics.memory.usagePercent > 90) {
            alerts.push({
                level: 'critical',
                source: 'memory',
                message: `Memory usage at ${metrics.memory.usagePercent}%`,
                threshold: 90
            });
        } else if (metrics.memory.usagePercent > 75) {
            alerts.push({
                level: 'warning',
                source: 'memory',
                message: `Memory usage at ${metrics.memory.usagePercent}%`,
                threshold: 75
            });
        }

        // CPU alert
        const load15 = metrics.cpu.usage[1];
        if (load15 > metrics.cpu.cores * 2) {
            alerts.push({
                level: 'warning',
                source: 'cpu',
                message: `High CPU load: ${load15.toFixed(2)}`,
                threshold: metrics.cpu.cores * 2
            });
        }

        // Store alerts
        this.data.alerts.push(...alerts.map(a => ({ ...a, timestamp: Date.now() })));
        this.saveData();

        return alerts;
    }

    listAlerts() {
        const recent = this.data.alerts.slice(-20);
        
        console.log('\n🚨 RECENT ALERTS');
        console.log('═'.repeat(50));

        for (const a of recent.reverse()) {
            const icon = a.level === 'critical' ? '🔴' : a.level === 'warning' ? '🟡' : '🔵';
            const ago = this.ageString(a.timestamp);
            console.log(`\n${icon} [${a.level}] ${ago}`);
            console.log(`   ${a.source}: ${a.message}`);
        }
    }

    ageString(ts) {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
    }

    // ═══════════════════════════════════════════════════════════
    // SERVICE MONITORING
    // ═══════════════════════════════════════════════════════════

    monitorServices(services = []) {
        console.log('\n📊 SERVICE STATUS');
        console.log('═'.repeat(50));

        const status = {};
        for (const svc of services) {
            try {
                const pids = execSync(`pgrep -f "${svc}" 2>/dev/null || echo ""`, { encoding: 'utf-8' }).trim();
                status[svc] = {
                    running: !!pids,
                    pids: pids ? pids.split('\n') : []
                };
            } catch {
                status[svc] = { running: false, pids: [] };
            }

            const icon = status[svc].running ? '✅' : '❌';
            console.log(`\n${icon} ${svc}`);
            console.log(`   Status: ${status[svc].running ? 'Running' : 'Stopped'}`);
            if (status[svc].pids.length) {
                console.log(`   PIDs: ${status[svc].pids.join(', ')}`);
            }
        }

        return status;
    }

    // ═══════════════════════════════════════════════════════════
    // HISTORY & TRENDS
    // ═══════════════════════════════════════════════════════════

    getHistory(hours = 24) {
        const cutoff = Date.now() - (hours * 3600000);
        const history = this.data.metrics.filter(m => m.timestamp > cutoff);

        console.log(`\n📈 METRICS HISTORY (${hours}h)`);
        console.log('═'.repeat(50));

        if (history.length > 0) {
            const avgMem = Math.round(history.reduce((a, m) => a + m.memory.usagePercent, 0) / history.length);
            const maxMem = Math.max(...history.map(m => m.memory.usagePercent));
            const minMem = Math.min(...history.map(m => m.memory.usagePercent));
            const avgLoad = (history.reduce((a, m) => a + m.cpu.usage[0], 0) / history.length).toFixed(2);

            console.log(`\n  Memory: avg ${avgMem}%, max ${maxMem}%, min ${minMem}%`);
            console.log(`  Load: avg ${avgLoad}`);
            console.log(`  Data points: ${history.length}`);
        }

        return history;
    }

    // ═══════════════════════════════════════════════════════════
    // REAL-TIME DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        console.log('\n' + '═'.repeat(50));
        console.log('📊 HIVE MONITORING DASHBOARD');
        console.log('═'.repeat(50));

        const sys = this.getSystemMetrics();
        const proc = this.getProcessMetrics();

        console.log('\n🖥️ SYSTEM:');
        console.log(`   Platform: ${sys.platform}`);
        console.log(`   Hostname: ${sys.hostname}`);
        console.log(`   Uptime: ${Math.round(sys.uptime / 60)} min`);

        console.log('\n💻 CPU:');
        console.log(`   Cores: ${sys.cpu.cores}`);
        console.log(`   Load: ${sys.cpu.usage.map(l => l.toFixed(2)).join(', ')}`);
        console.log(`   Model: ${sys.cpu.model}`);

        console.log('\n💾 MEMORY:');
        const memPct = sys.memory.usagePercent;
        const memBar = '█'.repeat(Math.floor(memPct / 5)) + '░'.repeat(20 - Math.floor(memPct / 5));
        console.log(`   [${memBar}] ${memPct}%`);
        console.log(`   Used: ${Math.round(sys.memory.used / 1024 / 1024 / 1024)}GB / ${Math.round(sys.memory.total / 1024 / 1024 / 1024)}GB`);

        console.log('\n⚙️ PROCESS:');
        console.log(`   PID: ${proc.pid}`);
        console.log(`   Uptime: ${Math.round(proc.uptime)}s`);
        console.log(`   Memory: ${proc.memory.rss}MB RSS, ${proc.memory.heapUsed}MB heap`);

        console.log('\n🚨 ALERTS:');
        const alerts = this.checkAlerts();
        if (alerts.length === 0) {
            console.log('   ✅ No active alerts');
        } else {
            alerts.forEach(a => {
                const icon = a.level === 'critical' ? '🔴' : '🟡';
                console.log(`   ${icon} ${a.message}`);
            });
        }

        console.log('\n📈 HISTORY:');
        this.getHistory(1);
    }

    // ═══════════════════════════════════════════════════════════
    // EXPORT FOR WEBUI
    // ═══════════════════════════════════════════════════════════

    export() {
        return {
            system: this.getSystemMetrics(),
            process: this.getProcessMetrics(),
            alerts: this.data.alerts.slice(-20),
            history: this.data.metrics.slice(-100)
        };
    }
}

// CLI
const monitor = new HiveMonitoring();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    metrics: () => console.log(JSON.stringify(monitor.getSystemMetrics(), null, 2)),
    process: () => console.log(JSON.stringify(monitor.getProcessMetrics(), null, 2)),
    alerts: () => monitor.listAlerts(),
    services: () => monitor.monitorServices(args.length ? args : ['node', 'nginx', 'openclaw']),
    history: () => monitor.getHistory(parseInt(args[0]) || 24),
    dashboard: () => monitor.dashboard(),
    export: () => console.log(JSON.stringify(monitor.export(), null, 2)),
    help: () => console.log(`
HIVE MONITORING

  metrics              System metrics (JSON)
  process              Process metrics (JSON)
  alerts               List recent alerts
  services [names]     Monitor services
  history [hours]       Metrics history (default 24h)
  dashboard             Real-time dashboard
  export               Export all data (JSON)
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveMonitoring };