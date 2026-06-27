#!/usr/bin/env node
/**
 * Hive Security - Security & Access Control
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class HiveSecurity {
    constructor() {
        this.dataDir = '/tmp/hive-security';
        if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true });
        this.data = this.loadData();
    }

    loadData() {
        try {
            return JSON.parse(fs.readFileSync(path.join(this.dataDir, 'security-data.json'), 'utf-8'));
        } catch { 
            return { 
                keys: [], 
                auditLog: [], 
                accessControl: {},
                secrets: {} 
            }; 
        }
    }

    saveData() {
        fs.writeFileSync(path.join(this.dataDir, 'security-data.json'), JSON.stringify(this.data, null, 2));
    }

    // ═══════════════════════════════════════════════════════════
    // API KEY MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    generateKey(name, purpose = 'general') {
        const key = crypto.randomBytes(32).toString('hex');
        const entry = {
            id: `KEY-${Date.now()}`,
            name,
            purpose,
            key: `hive_${key}`,
            createdAt: Date.now(),
            lastUsed: null,
            useCount: 0
        };

        this.data.keys.push(entry);
        this.saveData();

        console.log(`\n🔑 Key generated: ${name}`);
        console.log(`  Key: ${entry.key}`);
        console.log(`  Purpose: ${purpose}`);
        console.log('  ⚠️ Save this - it won\'t be shown again');

        return entry;
    }

    listKeys() {
        console.log('\n🔑 API KEYS');
        console.log('═'.repeat(50));

        for (const k of this.data.keys) {
            const ago = k.lastUsed ? this.ageString(k.lastUsed) : 'never';
            console.log(`\n  ${k.name} [${k.purpose}]`);
            console.log(`     ID: ${k.id}`);
            console.log(`     Created: ${new Date(k.createdAt).toLocaleDateString()}`);
            console.log(`     Last used: ${ago}`);
            console.log(`     Uses: ${k.useCount}`);
        }
    }

    revokeKey(keyId) {
        const idx = this.data.keys.findIndex(k => k.id === keyId);
        if (idx !== -1) {
            const key = this.data.keys[idx];
            key.revokedAt = Date.now();
            key.active = false;
            this.saveData();
            console.log(`\n✓ Key revoked: ${key.name}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SECRET MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    storeSecret(name, value, encrypted = true) {
        const secret = {
            name,
            createdAt: Date.now(),
            encrypted,
            hash: encrypted ? crypto.createHash('sha256').update(value).digest('hex') : null
        };

        // Store encrypted value
        if (encrypted) {
            const cipher = crypto.createCipher('aes-256-cbc', this.getEncryptionKey());
            let encryptedValue = cipher.update(value, 'utf8', 'hex');
            encryptedValue += cipher.final('hex');
            secret.value = encryptedValue;
        } else {
            secret.value = value;
        }

        this.data.secrets[name] = secret;
        this.saveData();

        console.log(`\n✓ Secret stored: ${name}`);
        return secret;
    }

    getSecret(name) {
        const secret = this.data.secrets[name];
        if (!secret) return null;

        if (secret.encrypted) {
            const decipher = crypto.createDecipher('aes-256-cbc', this.getEncryptionKey());
            let decrypted = decipher.update(secret.value, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }

        return secret.value;
    }

    getEncryptionKey() {
        const envKey = process.env.HIVE_ENCRYPTION_KEY || 'default-hive-key-change-in-production';
        return crypto.createHash('sha256').update(envKey).digest();
    }

    // ═══════════════════════════════════════════════════════════
    // ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════

    setAccess(user, resource, permission) {
        const key = `${user}:${resource}`;
        this.data.accessControl[key] = {
            user,
            resource,
            permission,
            grantedAt: Date.now()
        };
        this.saveData();

        console.log(`\n✓ Access granted: ${user} → ${resource} (${permission})`);
    }

    checkAccess(user, resource) {
        const key = `${user}:${resource}`;
        const access = this.data.accessControl[key];
        return access?.permission === 'allow';
    }

    listAccess() {
        console.log('\n🔐 ACCESS CONTROL');
        console.log('═'.repeat(50));

        for (const [key, access] of Object.entries(this.data.accessControl)) {
            console.log(`\n  ${access.user} → ${access.resource}`);
            console.log(`     Permission: ${access.permission}`);
            console.log(`     Granted: ${new Date(access.grantedAt).toLocaleDateString()}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // AUDIT LOG
    // ═══════════════════════════════════════════════════════════

    audit(action, user, details = {}) {
        const entry = {
            id: `AUDIT-${Date.now()}`,
            action,
            user,
            details,
            timestamp: Date.now(),
            ip: details.ip || 'local'
        };

        this.data.auditLog.push(entry);
        this.saveData();

        console.log(`\n📋 Audit: ${action} by ${user}`);
        return entry;
    }

    listAuditLog(limit = 50) {
        const entries = this.data.auditLog.slice(-limit).reverse();
        
        console.log('\n📋 AUDIT LOG');
        console.log('═'.repeat(50));

        for (const e of entries) {
            const ago = this.ageString(e.timestamp);
            console.log(`\n[${ago}] ${e.action}`);
            console.log(`   User: ${e.user}`);
            if (e.details.resource) console.log(`   Resource: ${e.details.resource}`);
            if (e.details.result) console.log(`   Result: ${e.details.result}`);
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
    // SECURITY CHECKS
    // ═══════════════════════════════════════════════════════════

    runSecurityCheck() {
        console.log('\n🔒 SECURITY SCAN');
        console.log('═'.repeat(50));

        const results = [];

        // Check file permissions
        try {
            const perms = execSync('stat -c %a ~/.hive 2>/dev/null || echo "700"', { encoding: 'utf-8' }).trim();
            const isSecure = perms === '700' || perms === '600';
            results.push({
                check: 'Config permissions',
                status: isSecure ? 'pass' : 'fail',
                message: `Permissions: ${perms}`
            });
        } catch {
            results.push({ check: 'Config permissions', status: 'skip', message: 'No config found' });
        }

        // Check for exposed secrets
        const exposedSecrets = this.data.auditLog.filter(e => 
            e.action.includes('secret') && e.details.exposed
        );
        results.push({
            check: 'Secret exposure',
            status: exposedSecrets.length === 0 ? 'pass' : 'fail',
            message: `${exposedSecrets.length} exposures detected`
        });

        // Check audit log completeness
        results.push({
            check: 'Audit logging',
            status: this.data.auditLog.length > 0 ? 'pass' : 'warn',
            message: `${this.data.auditLog.length} entries`
        });

        // Output results
        console.log('\nResults:');
        for (const r of results) {
            const icon = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⚠️';
            console.log(`  ${icon} ${r.check}: ${r.message}`);
        }

        const passed = results.filter(r => r.status === 'pass').length;
        console.log(`\n  ${passed}/${results.length} checks passed`);

        return results;
    }

    // ═══════════════════════════════════════════════════════════
    // DASHBOARD
    // ═══════════════════════════════════════════════════════════

    dashboard() {
        console.log('\n' + '═'.repeat(50));
        console.log('🛡️ HIVE SECURITY DASHBOARD');
        console.log('═'.repeat(50));

        console.log('\n🔑 KEYS:');
        console.log(`   Total: ${this.data.keys.length}`);
        console.log(`   Active: ${this.data.keys.filter(k => !k.revokedAt).length}`);

        console.log('\n🔐 ACCESS CONTROL:');
        console.log(`   Entries: ${Object.keys(this.data.accessControl).length}`);

        console.log('\n📋 AUDIT LOG:');
        console.log(`   Entries: ${this.data.auditLog.length}`);
        const today = this.data.auditLog.filter(e => 
            e.timestamp > Date.now() - 86400000
        ).length;
        console.log(`   Today: ${today}`);

        console.log('\n🔒 SECURITY CHECK:');
        this.runSecurityCheck();
    }
}

// CLI
const security = new HiveSecurity();
const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
    genKey: () => security.generateKey(args[0], args[1]),
    listKeys: () => security.listKeys(),
    revokeKey: () => security.revokeKey(args[0]),
    
    storeSecret: () => security.storeSecret(args[0], args.slice(1).join(' ')),
    getSecret: () => {
        const val = security.getSecret(args[0]);
        if (val) console.log(val);
        else console.log('Secret not found');
    },
    
    access: () => security.setAccess(args[0], args[1], args[2]),
    checkAccess: () => console.log(security.checkAccess(args[0], args[1]) ? 'allowed' : 'denied'),
    listAccess: () => security.listAccess(),
    
    audit: () => security.audit(args[0], args[1], { resource: args[2] }),
    auditLog: () => security.listAuditLog(parseInt(args[0]) || 50),
    
    check: () => security.runSecurityCheck(),
    dashboard: () => security.dashboard(),
    
    help: () => console.log(`
HIVE SECURITY

  genKey <name> [purpose]    Generate API key
  listKeys                   List keys
  revokeKey <id>              Revoke key

  storeSecret <name> <value>  Store encrypted secret
  getSecret <name>            Get secret value

  access <user> <resource> <allow|deny>  Set access
  checkAccess <user> <resource>  Check access
  listAccess                  List access rules

  audit <action> <user> [resource]  Log audit entry
  auditLog [limit]            View audit log (default 50)

  check                       Run security scan
  dashboard                   Show security dashboard
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveSecurity };