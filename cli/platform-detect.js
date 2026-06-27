#!/usr/bin/env node
/**
 * Hive Platform Detection
 * Detects OS, environment, and capabilities
 */

const fs = require('fs');
const { execSync } = require('child_process');

class Platform {
    constructor() {
        this.detect();
    }

    detect() {
        this.platform = process.platform;
        this.arch = process.arch;
        this.env = process.env;
        
        // Detect Termux
        this.isTermux = this.detectTermux();
        
        // Detect Android
        this.isAndroid = this.detectAndroid();
        
        // Detect Termux:API
        this.hasTermuxAPI = this.detectTermuxAPI();
        
        // Detect installed tools
        this.tools = this.detectTools();
        
        // Platform info
        this.info = this.getPlatformInfo();
    }

    detectTermux() {
        // Check multiple indicators of Termux
        return (
            this.env.TERMUX === 'true' ||
            fs.existsSync('/data/data/com.termux/files') ||
            fs.existsSync('/apex/com.android.runtime') ||
            (this.platform === 'linux' && fs.existsSync('/system/bin/sh'))
        );
    }

    detectAndroid() {
        if (!this.isTermux) return false;
        
        try {
            // Check for Android-specific paths
            if (fs.existsSync('/system/build.prop')) {
                const content = fs.readFileSync('/system/build.prop', 'utf-8');
                return content.includes('ro.build.version.sdk');
            }
            return fs.existsSync('/system/bin/am');
        } catch {
            return false;
        }
    }

    detectTermuxAPI() {
        if (!this.isTermux) return false;
        
        try {
            // Check if termux-api package is installed
            execSync('termux-camera-photo', { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    detectTools() {
        const tools = {
            node: this.checkCommand('node'),
            npm: this.checkCommand('npm'),
            git: this.checkCommand('git'),
            curl: this.checkCommand('curl'),
            jq: this.checkCommand('jq')
        };

        // Termux specific
        if (this.isTermux) {
            tools.termuxCamera = this.checkCommand('termux-camera-photo');
            tools.termuxLocation = this.checkCommand('termux-location');
            tools.termuxClipboard = this.checkCommand('termux-clipboard-get');
            tools.termuxNotification = this.checkCommand('termux-notification');
            tools.termuxSpeech = this.checkCommand('termux-tts-speak');
            tools.termuxSMS = this.checkCommand('termux-sms-send');
            tools.termuxFingerprint = this.checkCommand('termux-fingerprint');
            tools.termuxVibrate = this.checkCommand('termux-vibrate');
            tools.termuxWifi = this.checkCommand('termux-wifi');
        }

        return tools;
    }

    checkCommand(cmd) {
        try {
            execSync(`which ${cmd}`, { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    getPlatformInfo() {
        const info = {
            os: this.platform,
            arch: this.arch,
            termux: this.isTermux,
            android: this.isAndroid,
            termuxAPI: this.hasTermuxAPI,
            termuxVersion: this.getTermuxVersion()
        };

        // Add Android version if available
        if (this.isAndroid && fs.existsSync('/system/build.prop')) {
            try {
                const build = fs.readFileSync('/system/build.prop', 'utf-8');
                const versionMatch = build.match(/ro.build.version.release=([0-9.]+)/);
                if (versionMatch) {
                    info.androidVersion = versionMatch[1];
                }
            } catch {}
        }

        return info;
    }

    getTermuxVersion() {
        try {
            if (fs.existsSync('/data/data/com.termux/files/usr/bin/bash')) {
                const version = execSync('pkg version termux 2>/dev/null || echo unknown', {
                    encoding: 'utf-8'
                }).trim();
                return version;
            }
        } catch {}
        return null;
    }

    // ═══════════════════════════════════════════════════════════
    // CAPABILITY CHECKS
    // ═══════════════════════════════════════════════════════════

    canRunShell() {
        return this.platform === 'win32' || 
               this.platform === 'darwin' || 
               this.platform === 'linux';
    }

    canUseTermuxAPI() {
        return this.isTermux && this.hasTermuxAPI;
    }

    getAvailableCapabilities() {
        const caps = {
            cli: true,
            mcp: true,
            shell: this.canRunShell(),
            termuxAPI: this.canUseTermuxAPI(),
            camera: this.tools.termuxCamera || false,
            location: this.tools.termuxLocation || false,
            clipboard: this.tools.termuxClipboard || false,
            notification: this.tools.termuxNotification || false,
            speech: this.tools.termuxSpeech || false,
            sms: this.tools.termuxSMS || false,
            fingerprint: this.tools.termuxFingerprint || false,
            vibration: this.tools.termuxVibrate || false,
            wifi: this.tools.termuxWifi || false
        };

        return caps;
    }

    // ═══════════════════════════════════════════════════════════
    // OUTPUT
    // ═══════════════════════════════════════════════════════════

    print() {
        console.log('\n' + '='.repeat(60));
        console.log('🏝️ HIVE PLATFORM DETECTION');
        console.log('='.repeat(60));

        console.log('\n📋 SYSTEM:');
        console.log(`   OS: ${this.platform} (${this.arch})`);
        console.log(`   Termux: ${this.isTermux ? '✅ Yes' : '❌ No'}`);
        console.log(`   Android: ${this.isAndroid ? '✅ Yes' : '❌ No'}`);
        console.log(`   Termux:API: ${this.hasTermuxAPI ? '✅ Installed' : '❌ Not installed'}`);

        if (this.isTermux) {
            console.log('\n📱 TERMUX DETAILS:');
            console.log(`   Version: ${this.info.termuxVersion || 'unknown'}`);
            if (this.info.androidVersion) {
                console.log(`   Android: ${this.info.androidVersion}`);
            }
        }

        console.log('\n🔧 AVAILABLE TOOLS:');
        for (const [tool, available] of Object.entries(this.tools)) {
            const icon = available ? '✅' : '❌';
            console.log(`   ${icon} ${tool}`);
        }

        console.log('\n🚀 CAPABILITIES:');
        const caps = this.getAvailableCapabilities();
        for (const [cap, available] of Object.entries(caps)) {
            const icon = available ? '✅' : '❌';
            console.log(`   ${icon} ${cap}`);
        }

        return this;
    }

    // Export for use in other scripts
    toJSON() {
        return {
            platform: this.platform,
            arch: this.arch,
            isTermux: this.isTermux,
            isAndroid: this.isAndroid,
            hasTermuxAPI: this.hasTermuxAPI,
            tools: this.tools,
            info: this.info,
            capabilities: this.getAvailableCapabilities()
        };
    }
}

// CLI
const platform = new Platform();
const cmd = process.argv[2];

if (cmd === 'json') {
    console.log(JSON.stringify(platform.toJSON(), null, 2));
} else if (cmd === 'capabilities') {
    console.log(JSON.stringify(platform.getAvailableCapabilities(), null, 2));
} else if (cmd === 'info') {
    console.log(JSON.stringify(platform.info, null, 2));
} else {
    platform.print();
}

module.exports = { Platform, platform: new Platform() };