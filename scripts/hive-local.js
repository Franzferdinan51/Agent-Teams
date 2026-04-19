#!/usr/bin/env node
/**
 * Hive Local — Unified Local AI Integration
 * LM Studio + Local Models + Voice + Audio + Search
 * 
 * All the power of cloud AI, running locally on YOUR machine
 * With automatic fallbacks to cloud when needed
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const CONFIG = {
    lmStudio: {
        url: process.env.LMSTUDIO_URL || 'http://localhost:1234',
        apiKey: process.env.LMSTUDIO_KEY || 'sk-lm-studio'
    },
    whisper: {
        modelPath: process.env.WHISPER_MODEL || '~/Models/whisper',
        model: 'base' // base, small, medium, large
    },
    tts: {
        voiceDir: '/tmp/hive-local/tts',
        format: 'mp3'
    },
    search: {
        // Local search using ripgrep + sqlite FTS
        indexPath: '/tmp/hive-local/search/index.db'
    }
};

class HiveLocal {
    constructor(options = {}) {
        this.lmStudioUrl = options.lmStudioUrl || CONFIG.lmStudio.url;
        this.lmStudioKey = options.lmStudioKey || CONFIG.lmStudio.apiKey;
        this.workspace = options.workspace || '/tmp/hive-local';
        
        // Ensure workspace exists
        if (!fs.existsSync(this.workspace)) {
            fs.mkdirSync(this.workspace, { recursive: true });
        }
        
        console.log('🏠 Hive Local initialized');
        console.log(`   LM Studio: ${this.lmStudioUrl}`);
    }

    // ═══════════════════════════════════════════════════════════
    // LM STUDIO — LOCAL MODEL INFERENCE
    // ═══════════════════════════════════════════════════════════

    async lmStudioStatus() {
        try {
            const response = await this.httpGet(`${this.lmStudioUrl}/api/v0/models`);
            const models = JSON.parse(response);
            console.log('\n🤖 LM Studio Models:');
            models.data?.forEach(m => console.log(`  • ${m.id}`)) || console.log('  No models loaded');
            return models;
        } catch (err) {
            console.log(`\n❌ LM Studio unavailable: ${err.message}`);
            console.log('   Make sure LM Studio is running with:\n');
            console.log('   1. Open LM Studio');
            console.log('   2. Load a model');
            console.log('   3. Enable "AI Router" or "Local Server"');
            return null;
        }
    }

    async lmStudioChat(messages, options = {}) {
        const model = options.model || 'local';
        const temperature = options.temperature ?? 0.7;
        const maxTokens = options.maxTokens || 2048;
        
        const body = {
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: false
        };
        
        try {
            const response = await this.httpPost(
                `${this.lmStudioUrl}/v1/chat/completions`,
                body,
                { 'Authorization': `Bearer ${this.lmStudioKey}` }
            );
            
            const data = JSON.parse(response);
            return data.choices?.[0]?.message?.content || '';
        } catch (err) {
            throw new Error(`LM Studio error: ${err.message}`);
        }
    }

    async lmStudioComplete(prompt, options = {}) {
        const model = options.model || 'local';
        const maxTokens = options.maxTokens || 500;
        
        const body = {
            model,
            prompt,
            max_tokens: maxTokens,
            temperature: options.temperature ?? 0.7,
            stream: false
        };
        
        try {
            const response = await this.httpPost(
                `${this.lmStudioUrl}/v1/completions`,
                body,
                { 'Authorization': `Bearer ${this.lmStudioKey}` }
            );
            
            const data = JSON.parse(response);
            return data.choices?.[0]?.text || '';
        } catch (err) {
            throw new Error(`LM Studio error: ${err.message}`);
        }
    }

    async lmStudioEmbeddings(text, options = {}) {
        const model = options.model || 'embedding-model';
        
        const body = {
            model,
            input: text
        };
        
        try {
            const response = await this.httpPost(
                `${this.lmStudioUrl}/v1/embeddings`,
                body,
                { 'Authorization': `Bearer ${this.lmStudioKey}` }
            );
            
            const data = JSON.parse(response);
            return data.data?.[0]?.embedding || [];
        } catch (err) {
            throw new Error(`Embedding error: ${err.message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // VISION — LOCAL IMAGE UNDERSTANDING
    // ═══════════════════════════════════════════════════════════

    async analyzeImageLocal(imagePath, prompt, options = {}) {
        // Use Qwen VL or llava via LM Studio
        const model = options.model || 'qwen2.5-vl-7b-instruct';
        
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image not found: ${imagePath}`);
        }
        
        const imageBase64 = fs.readFileSync(imagePath).toString('base64');
        const imageUrl = `data:image/png;base64,${imageBase64}`;
        
        // Try LM Studio Vision
        try {
            const messages = [
                {
                    role: 'user',
                    content: [
                        { type: 'image_url', image_url: { url: imageUrl } },
                        { type: 'text', text: prompt }
                    ]
                }
            ];
            
            const result = await this.lmStudioChat(messages, { model });
            return { model, result, provider: 'lmstudio' };
        } catch (err) {
            console.log(`   LM Studio vision failed, trying cloud fallback...`);
        }
        
        // Fallback: Save image info for cloud analysis
        return {
            model: 'none',
            result: 'Local vision unavailable — use hive-vision.js with cloud API',
            provider: 'fallback',
            imagePath
        };
    }

    // ═══════════════════════════════════════════════════════════
    // VOICE — SPEECH TO TEXT (WHISPER)
    // ═══════════════════════════════════════════════════════════

    async transcribe(audioPath, options = {}) {
        const model = options.model || CONFIG.whisper.model;
        const language = options.language || null;
        
        if (!fs.existsSync(audioPath)) {
            throw new Error(`Audio file not found: ${audioPath}`);
        }
        
        // Check if whisper is available
        const whisperPath = await this.findWhisper();
        
        if (!whisperPath) {
            throw new Error('Whisper not found. Install with: brew install whisper');
        }
        
        const args = ['-m', `${process.env.HOME}/.cache/whisper/${model}.pt`];
        
        if (language) {
            args.push('--language', language);
        }
        
        args.push(audioPath);
        
        try {
            const result = execSync(`whisper ${args.join(' ')}`, { encoding: 'utf-8' });
            return result.trim();
        } catch (err) {
            // Try with auto-detect
            try {
                const result = execSync(`whisper "${audioPath}"`, { encoding: 'utf-8' });
                return result.trim();
            } catch (err2) {
                throw new Error(`Transcription failed: ${err2.message}`);
            }
        }
    }

    async transcribeWithTimestamps(audioPath, options = {}) {
        const model = options.model || CONFIG.whisper.model;
        
        // Get timestamps using whisper with timestamps mode
        try {
            const result = execSync(
                `whisper "${audioPath}" --word_timestamps true`,
                { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
            );
            
            // Parse into structured format
            const lines = result.split('\n').filter(l => l.trim());
            const segments = [];
            
            for (const line of lines) {
                const match = line.match(/\[?(\d+:\d+:\d+\.\d+)\]?\s*(.+)/);
                if (match) {
                    segments.push({
                        time: match[1],
                        text: match[2].trim()
                    });
                }
            }
            
            return segments;
        } catch (err) {
            throw new Error(`Timestamped transcription failed: ${err.message}`);
        }
    }

    async findWhisper() {
        try {
            execSync('which whisper', { stdio: 'ignore' });
            return 'whisper';
        } catch (err) {
            try {
                execSync('which whisper-cli', { stdio: 'ignore' });
                return 'whisper-cli';
            } catch (err2) {
                return null;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // TTS — TEXT TO SPEECH (OFFLINE)
    // ═══════════════════════════════════════════════════════════

    async tts(text, options = {}) {
        const voice = options.voice || 'default';
        const outputPath = options.output || path.join(CONFIG.tts.voiceDir, `tts_${Date.now()}.mp3`);
        
        // Try native macOS say command (offline, free)
        try {
            const result = execSync(`say "${text.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' });
            
            // For file output, use afplay + record or say with file
            return {
                provider: 'macos-say',
                text,
                command: `say "${text.substring(0, 50)}..."`
            };
        } catch (err) {
            // Try with output file
            try {
                execSync(`say -o "${outputPath.replace('.mp3', '.aiff')}" "${text.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
                
                // Convert to MP3 if ffmpeg available
                if (this.commandExists('ffmpeg')) {
                    execSync(`ffmpeg -i "${outputPath.replace('.mp3', '.aiff')}" "${outputPath}" -y`, { stdio: 'ignore' });
                }
                
                return { provider: 'macos-say', output: outputPath };
            } catch (err2) {
                throw new Error('TTS unavailable. Install espeak or use macOS say.');
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // WEB SEARCH — LOCAL WITH FALLBACKS
    // ═══════════════════════════════════════════════════════════

    async search(query, options = {}) {
        const engine = options.engine || 'duckduckgo';
        const limit = options.limit || 10;
        
        switch (engine) {
            case 'duckduckgo':
                return this.searchDuckDuckGo(query, limit);
            case 'local':
                return this.searchLocalIndex(query, limit);
            case 'brave':
                return this.searchBrave(query, limit);
            default:
                return this.searchDuckDuckGo(query, limit);
        }
    }

    async searchDuckDuckGo(query, limit = 10) {
        try {
            // Use ddgr (CLI DuckDuckGo) if available
            const ddgrPath = await this.findCommand('ddgr');
            
            if (ddgrPath) {
                const result = execSync(`ddgr -n ${limit} "${query}"`, { encoding: 'utf-8' });
                return this.parseDDGResults(result);
            }
        } catch (err) {
            // Fall back to curl
        }
        
        // Basic curl fallback
        try {
            const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
            const response = await this.httpGet(url);
            // DuckDuckGo doesn't have simple JSON search, use HTML scrape
            return this.scrapeDDG(query);
        } catch (err) {
            return { error: 'Search unavailable', query };
        }
    }

    async scrapeDDG(query) {
        // Simple scraping fallback
        try {
            const response = await this.httpGet(
                `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
            );
            
            const results = [];
            const regex = /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
            let match;
            
            while ((match = regex.exec(response)) && results.length < 10) {
                results.push({
                    title: match[2].replace(/<[^>]+>/g, ''),
                    url: match[1]
                });
            }
            
            return { results, query };
        } catch (err) {
            return { error: 'Scraping failed', query };
        }
    }

    async searchLocalIndex(query, limit = 10) {
        // Search previously indexed pages
        const indexPath = CONFIG.search.indexPath;
        
        if (!fs.existsSync(indexPath)) {
            return { error: 'No local index. Use web search first.', query };
        }
        
        // Simple grep-based search
        const pages = fs.readdirSync('/tmp/hive-local/pages/').filter(f => f.endsWith('.txt'));
        const results = [];
        
        for (const page of pages) {
            const content = fs.readFileSync(`/tmp/hive-local/pages/${page}`, 'utf-8');
            if (content.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    title: page.replace('.txt', ''),
                    snippet: content.substring(0, 200)
                });
            }
            if (results.length >= limit) break;
        }
        
        return { results, query, type: 'local-index' };
    }

    async searchBrave(query, limit = 10) {
        const apiKey = process.env.BRAVE_API_KEY;
        
        if (!apiKey) {
            console.log('   BRAVE_API_KEY not set, using DuckDuckGo');
            return this.searchDuckDuckGo(query, limit);
        }
        
        try {
            const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`;
            const response = await this.httpGet(url, {
                'Accept': 'application/json',
                'X-Subscription-Token': apiKey
            });
            
            const data = JSON.parse(response);
            return {
                results: data.web?.results?.map(r => ({
                    title: r.title,
                    url: r.url,
                    snippet: r.description
                })) || [],
                query
            };
        } catch (err) {
            return this.searchDuckDuckGo(query, limit);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // GITHUB — LOCAL INTEGRATION
    // ═══════════════════════════════════════════════════════════

    async githubSearch(query, options = {}) {
        const type = options.type || 'repositories'; // repositories, code, issues
        const language = options.language || null;
        
        // Check for gh CLI
        const ghPath = await this.findCommand('gh');
        
        if (!ghPath) {
            return { error: 'GitHub CLI (gh) not installed', query };
        }
        
        try {
            let cmd = `gh search ${type} "${query}" --limit 10`;
            
            if (language) {
                cmd += ` --language ${language}`;
            }
            
            const result = execSync(cmd, { encoding: 'utf-8' });
            return this.parseGithubResults(result, type);
        } catch (err) {
            return { error: 'GitHub search failed', details: err.message };
        }
    }

    async githubRepoInfo(owner, repo) {
        try {
            const result = execSync(`gh repo view ${owner}/${repo}`, { encoding: 'utf-8' });
            return { raw: result };
        } catch (err) {
            return { error: 'Repo not found' };
        }
    }

    async githubIssues(owner, repo, options = {}) {
        const state = options.state || 'open'; // open, closed, all
        const limit = options.limit || 20;
        
        try {
            const result = execSync(
                `gh issue list --repo ${owner}/${repo} --state ${state} --limit ${limit}`,
                { encoding: 'utf-8' }
            );
            
            const lines = result.trim().split('\n');
            return lines.map(line => {
                const parts = line.split('\t');
                return {
                    number: parts[0],
                    title: parts[1],
                    labels: parts[2] || '',
                    assignee: parts[3] || ''
                };
            });
        } catch (err) {
            return { error: 'Failed to fetch issues' };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // FILE SEARCH — LOCAL FS SEARCH
    // ═══════════════════════════════════════════════════════════

    async searchFiles(directory, pattern, options = {}) {
        const recursive = options.recursive !== false;
        const includeHidden = options.includeHidden || false;
        
        const args = [directory, '-name', `*${pattern}*`];
        
        if (recursive) args.push('-r');
        if (!includeHidden) args.push('-not', '-path', '*/.*');
        
        args.push('-type', 'f');
        
        try {
            const result = execSync(`find ${args.join(' ')} 2>/dev/null | head -50`, { encoding: 'utf-8' });
            return result.trim().split('\n').filter(f => f.trim());
        } catch (err) {
            return { error: 'Search failed', directory, pattern };
        }
    }

    async grepSearch(directory, pattern, options = {}) {
        const extension = options.extension || null;
        const maxCount = options.maxCount || 100;
        
        let cmd = `grep -rn --include="*.${extension || '*'}" "${pattern}" "${directory}" 2>/dev/null | head ${maxCount}`;
        
        if (options.context) {
            cmd = `grep -rn --include="*.${extension || '*'}" -C ${options.context} "${pattern}" "${directory}" 2>/dev/null | head ${maxCount}`;
        }
        
        try {
            const result = execSync(cmd, { encoding: 'utf-8' });
            return result.trim().split('\n').filter(l => l.trim());
        } catch (err) {
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════

    commandExists(cmd) {
        try {
            execSync(`which ${cmd}`, { stdio: 'ignore' });
            return true;
        } catch (err) {
            return false;
        }
    }

    async findCommand(cmd) {
        if (this.commandExists(cmd)) return cmd;
        
        // Check common locations
        const paths = [
            `/usr/local/bin/${cmd}`,
            `/opt/homebrew/bin/${cmd}`,
            `${process.env.HOME}/.local/bin/${cmd}`,
            `${process.env.HOME}/bin/${cmd}`
        ];
        
        for (const p of paths) {
            if (fs.existsSync(p)) return p;
        }
        
        return null;
    }

    httpGet(url, headers = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers
            };
            
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });
            
            req.on('error', reject);
            req.end();
        });
    }

    httpPost(url, body, headers = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const client = urlObj.protocol === 'https:' ? https : http;
            
            const bodyStr = JSON.stringify(body);
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(bodyStr),
                    ...headers
                }
            };
            
            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });
            
            req.on('error', reject);
            req.write(bodyStr);
            req.end();
        });
    }

    parseDDGResults(text) {
        const results = [];
        const lines = text.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
            if (line.match(/^https?:\/\//)) {
                const parts = line.split('|||').map(p => p.trim());
                if (parts.length >= 2) {
                    results.push({ url: parts[0], title: parts[1], snippet: parts[2] || '' });
                }
            }
        }
        
        return { results, engine: 'duckduckgo' };
    }

    parseGithubResults(text, type) {
        const lines = text.trim().split('\n');
        
        if (type === 'repositories') {
            return lines.map(line => {
                const parts = line.split(/\s{2,}/);
                return {
                    name: parts[0] || '',
                    stars: parts[1] || '',
                    description: parts[2] || ''
                };
            });
        }
        
        return lines.map(line => ({ raw: line }));
    }

    // ═══════════════════════════════════════════════════════════
    // CLI
    // ═══════════════════════════════════════════════════════════

    static async CLI(args) {
        const hiveLocal = new HiveLocal();
        
        const command = args[2];
        
        switch (command) {
            case 'lm-status':
            case 'lm':
                await hiveLocal.lmStudioStatus();
                break;
                
            case 'chat':
                const messages = [{ role: 'user', content: args.slice(3).join(' ') }];
                const chatResult = await hiveLocal.lmStudioChat(messages);
                console.log('\n' + chatResult);
                break;
                
            case 'complete':
                const prompt = args.slice(3).join(' ');
                const compResult = await hiveLocal.lmStudioComplete(prompt);
                console.log('\n' + compResult);
                break;
                
            case 'transcribe':
            case 'stt':
                if (!args[3]) {
                    console.log('Usage: hive-local.js transcribe <audio-file>');
                    break;
                }
                const transcript = await hiveLocal.transcribe(args[3]);
                console.log('\n📝 Transcript:');
                console.log(transcript);
                break;
                
            case 'tts':
                const ttsText = args.slice(3).join(' ');
                const ttsResult = await hiveLocal.tts(ttsText);
                console.log('\n🔊 TTS:', ttsResult);
                break;
                
            case 'search':
                const searchQuery = args.slice(3).join(' ');
                const searchResults = await hiveLocal.search(searchQuery);
                console.log('\n🔍 Results:');
                console.log(JSON.stringify(searchResults, null, 2));
                break;
                
            case 'gh-search':
                const ghQuery = args.slice(3).join(' ');
                const ghResults = await hiveLocal.githubSearch(ghQuery);
                console.log('\n🐙 GitHub Results:');
                console.log(JSON.stringify(ghResults, null, 2));
                break;
                
            case 'grep':
                if (args.length < 5) {
                    console.log('Usage: hive-local.js grep <dir> <pattern>');
                    break;
                }
                const grepResults = await hiveLocal.grepSearch(args[3], args[4]);
                grepResults.forEach(r => console.log(r));
                break;
                
            case 'find':
                if (args.length < 5) {
                    console.log('Usage: hive-local.js find <dir> <pattern>');
                    break;
                }
                const findResults = await hiveLocal.searchFiles(args[3], args[4]);
                findResults.forEach(f => console.log(f));
                break;
                
            case 'analyze':
                if (!args[3]) {
                    console.log('Usage: hive-local.js analyze <image> [prompt]');
                    break;
                }
                const imagePrompt = args.slice(4).join(' ') || 'Describe this image';
                const visionResult = await hiveLocal.analyzeImageLocal(args[3], imagePrompt);
                console.log('\n👁️ Analysis:', visionResult.result);
                break;
                
            default:
                console.log(`
🏠 Hive Local — Unified Local AI Stack v1.0.0

USAGE:
  hive-local.js lm-status                    Check LM Studio status
  hive-local.js chat <prompt>               Chat with local model
  hive-local.js complete <prompt>           Text completion
  hive-local.js analyze <image> [prompt]     Local vision analysis
  
  hive-local.js transcribe <audio>           Speech to text (Whisper)
  hive-local.js tts <text>                  Text to speech
  
  hive-local.js search <query>               Web search (DuckDuckGo/Brave)
  hive-local.js gh-search <query>            GitHub search
  hive-local.js find <dir> <pattern>        File search
  hive-local.js grep <dir> <pattern>        Grep search

ENVIRONMENT:
  LMSTUDIO_URL      LM Studio URL (default: http://localhost:1234)
  LMSTUDIO_KEY      LM Studio API key
  BRAVE_API_KEY     Brave Search API key

LOCAL MODELS:
  • LM Studio (qwen, llama, mistral, etc.)
  • Whisper (speech recognition)
  • macOS say (TTS)

ALL RUN LOCALLY — NO CLOUD REQUIRED FOR BASIC TASKS
`);
        }
    }
}

module.exports = { HiveLocal };

if (require.main === module) {
    HiveLocal.CLI(process.argv);
}
