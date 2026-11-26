#!/usr/bin/env node
/**
 * AI Council Server - REST API for adversarial deliberation
 * Port: 3003
 * Multi-model support: LM Studio with model mix (qwen3.6-35b, qwen3.5-9b, qwen3.5-0.8b, supergemma4-uncensored)
 *
 * Endpoints:
 *   GET  /                   - health check
 *   GET  /api/providers     - list available providers/models
 *   POST /api/session/start  - start deliberation {topic, mode} → {session_id}
 *   GET  /api/session       - current session status
 *   GET  /api/councilors    - list all councilors (canonical councilors.json)
 *   GET  /api/modes         - list deliberation modes
 *   GET  /api/session/:id   - get session result
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { ProviderManager, ContextManager } = require('./providers/provider-adapter.js');
const LM_STUDIO_URL = process.env.LMSTUDIO_URL || process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234';
const LM_STUDIO_KEY = process.env.LMSTUDIO_API_KEY || process.env.LM_STUDIO_KEY || process.env.LMSTUDIO_KEY || '';
const PORT = 3003;

// ─── LM Studio Provider Setup ─────────────────────────────────────
const providers = new ProviderManager();
providers.registerProvider('lmstudio', {
  baseUrl: LM_STUDIO_URL + '/v1',
  apiKey: LM_STUDIO_KEY,
  models: ['qwen3.6-35b-a3b', 'qwen3.5-27b', 'qwen3.5-9b', 'qwen3.5-0.8b', 'supergemma4-26b-uncensored-v2', 'supergemma4-26b-uncensored-mlx-v2', 'supergemma4-e4b-abliterated-mlx', 'gemma-4-26b-a4b', 'gemma-4-e4b-it', 'gemma-4-e2b-it']
});

// ─── Concurrency Limiter (prevent RAM exhaustion on constrained devices) ───
const MAX_CONCURRENT = 2;
let activeCalls = 0;
const callQueue = [];

function scheduleCall(fn) {
    return new Promise((resolve, reject) => {
        const run = () => {
            activeCalls++;
            Promise.resolve(fn())
                .then(resolve, reject)
                .finally(() => {
                    activeCalls--;
                    if (callQueue.length > 0) callQueue.shift()();
                });
        };
        if (activeCalls < MAX_CONCURRENT) run();
        else callQueue.push(run);
    });
}

// ─── Councilor Personas (canonical dataset: councilors.json) ───
// ONE canonical roster shared with council-api-server.cjs. Loaded from
// councilors.json at the repo root (override with COUNCILORS_PATH).
// Each entry carries: id (canonical), name (display), personaName (person
// name), alias/aliases (legacy ids from the old inline datasets), party,
// title (long role), role (role category), specialty, expertise,
// voteWeight, model, color, enabled, and veto/priority where applicable.
const COUNCILORS_PATH = process.env.COUNCILORS_PATH || path.join(__dirname, 'councilors.json');
let COUNCILORS;
try {
    COUNCILORS = JSON.parse(fs.readFileSync(COUNCILORS_PATH, 'utf8'));
    if (!Array.isArray(COUNCILORS) || COUNCILORS.length === 0) throw new Error('expected a non-empty JSON array');
} catch (err) {
    console.error(`FATAL: cannot load canonical councilors from ${COUNCILORS_PATH}: ${err.message}`);
    throw err;
}

// ─── Deliberation Modes ───────────────────────────────────────────
const MODES = {
    adversarial:  { name: 'Adversarial', description: 'Competing viewpoints debate until verdict', color: '🔴' },
    standard:     { name: 'Standard',    description: 'Collaborative deliberation toward consensus', color: '🟢' },
    consensus:    { name: 'Consensus',   description: 'Find common ground across all perspectives', color: '🔵' },
    socratic:     { name: 'Socratic',   description: 'Deep questioning to expose assumptions', color: '🟡' },
    creative:     { name: 'Creative',   description: 'Brainstorm innovative solutions', color: '🟣' },
    analytical:   { name: 'Analytical',  description: 'Data-driven logical analysis', color: '⚪' },
    emergency:    { name: 'Emergency',   description: 'Rapid decision under time pressure', color: '🔺' },
    vision:       { name: 'Vision',      description: 'Analyze images and visual data', color: '👁️' },
    swarm_coding: { name: 'Swarm Coding',description: 'Multi-agent code review and generation', color: '🐝' },
    strategic:    { name: 'Strategic',   description: 'Long-term strategic planning', color: '♟️' },
    multi:        { name: 'Multi-Model', description: 'Parallel multi-model deliberation (7 groups, 7 models)', color: '🌐' },
};

// ─── Sessions Store ───────────────────────────────────────────────
const sessions = new Map();
let sessionCounter = 0;

// ─── Multi-Model Configuration ─────────────────────────────────────
// Model selection per councilor group for 'multi' mode deliberation
const MODEL_CONFIG = {
  leadership:   { model: 'qwen3.6-35b-a3b', maxTokens: 1536 },
  security:     { model: 'supergemma4-26b-uncensored-v2', maxTokens: 1024 },
  technical:    { model: 'qwen3.5-0.8b', maxTokens: 512 },
  strategy:     { model: 'qwen3.5-9b', maxTokens: 1024 },
  cannabis:     { model: 'qwen3.6-35b-a3b', maxTokens: 1536 },
  analysts:     { model: 'qwen3.5-0.8b', maxTokens: 512 },
  special:      { model: 'supergemma4-26b-uncensored-mlx-v2', maxTokens: 1024 },
  default:      { model: 'qwen3.5-0.8b', maxTokens: 512 }
};

// ─── Memory-Safe Resource Limits ────────────────────────────────
// Hard caps to prevent OOM on constrained devices (256MB RAM free)
const RESOURCE_LIMITS = {
  maxConcurrentCalls: 2,     // max parallel model calls (prevents RAM exhaustion)
  maxContextChars: 8000,     // max input context chars per call
  maxResponseTokens: 512,    // max tokens per response (safety cap)
  callTimeoutMs: 300000,  // 5 min timeout per call (big models need time)
  maxRetries: 1,             // retry failed calls once
  smallModelMaxTokens: 256,  // 0.8b/e2b/e4b capped at 256 tokens
  mediumModelMaxTokens: 512, // 9b/26b capped at 512 tokens
  largeModelMaxTokens: 1024, // 35b capped at 1024 tokens
};

// Token budgets per model (memory-safe: small input, capped output)
const TOKEN_BUDGETS = {
  'qwen3.6-35b-a3b': 8000,   // 8K input max
  'qwen3.5-27b': 8000,
  'qwen3.5-9b': 6000,        // 6K input max
  'qwen3.5-0.8b': 4000,      // 4K input max
  'supergemma4-26b-uncensored-v2': 8000,
  'supergemma4-26b-uncensored-mlx-v2': 8000,
  'supergemma4-e4b-abliterated-mlx': 4000,
  'gemma-4-26b-a4b': 6000,
  'gemma-4-e4b-it': 4000,
  'gemma-4-e2b-it': 3000,   // 3K input max
};

// Response limits per model (max_tokens for API calls — memory-safe)
const RESPONSE_LIMITS = {
  'qwen3.6-35b-a3b': 1024,   // 35b: 1K response max
  'qwen3.5-27b': 1024,
  'qwen3.5-9b': 512,         // 9b: 512 response max
  'qwen3.5-0.8b': 256,       // 0.8b: 256 response max
  'supergemma4-26b-uncensored-v2': 1024,
  'supergemma4-26b-uncensored-mlx-v2': 1024,
  'supergemma4-e4b-abliterated-mlx': 256,
  'gemma-4-26b-a4b': 512,
  'gemma-4-e4b-it': 256,
  'gemma-4-e2b-it': 256
};

// Summary and verdict length limits (memory-safe)
const SUMMARY_LIMIT = 400;   // each group summary capped at 400 chars
const VERDICT_LIMIT = 1200;  // final verdict capped at 1200 chars

// ─── LM Studio Call (legacy wrapper for backward compat) ─────────
function lmChat(messages, model = 'google/gemma-4-26b-a4b', maxTokens = 1024) {
    // Cap tokens to memory-safe RESPONSE_LIMITS
    const cappedTokens = Math.min(maxTokens, RESPONSE_LIMITS[model] || 256);
    // Cap input context to TOKEN_BUDGETS
    const budget = TOKEN_BUDGETS[model] || 4000;
    const cappedMessages = messages.map(m => ({
        ...m,
        content: m.content?.slice(0, budget) || m.content
    }));
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ model, messages: cappedMessages, max_tokens: cappedTokens, temperature: 0.7 });
        const req = http.request(`${LM_STUDIO_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LM_STUDIO_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error(`Parse error: ${data.slice(0, 200)}`));
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(RESOURCE_LIMITS.callTimeoutMs, () => { req.destroy(); reject(new Error('Timeout after 5min')); });
        req.write(body);
        req.end();
    });
}

// ─── Build Council System Prompt ──────────────────────────────────
function buildCouncilPrompt(topic, mode) {
    const modeInfo = MODES[mode] || MODES.standard;
    return `You are the AI COUNCIL - an adversarial deliberation body with ${COUNCILORS.length} specialized councilors.

TOPIC: ${topic}
MODE: ${modeInfo.name} (${modeInfo.description})

You must deliberate as if all ${COUNCILORS.length} councilors are present. Each councilor will speak in sequence, then you will synthesize a VERDICT.

Councilors (speak as yourself, channeling each persona):

LEADERSHIP: Victoria Adams (Speaker) - fair, balanced, seeks truth; James Techson (Technocrat) - technical depth; Maya Ethics - ethical implications; Sam Practical - pragmatic feasibility; Chris Doubt - critical skeptic.

SECURITY: Alex Shield (Sentinel) - security implications; Secure Steve - vulnerability analysis; Risk Rachel - risk assessment; Risk Ray - threat modeling; Alert Alex - emergency protocols.

TECHNICAL: Arch Andy - system architecture; Code Carlos - implementation; Ops Oliver - DevOps; Fast Fiona - performance; Test Tara - quality; Data Diana - data analysis.

STRATEGY: Riley Dream (Visionary) - innovation; PM Chen - product strategy; Plan Petra - roadmapping; Wall Street Sam - economics; Money Mike - budget constraints.

DOMAIN: Flora Green - plants/botany; Gene Grey - genetics; Vet Val - animal care; Storm Chris - weather; Dana Press - communications; Lee Harmony - diplomacy.

ANALYSTS: See Sally - visual analysis; Pattern Pete - patterns; Color Carol - aesthetics; Frame Frank - composition; Context Chloe - context; Detail Dan - thoroughness; Feel Fran - emotional impact; Symbol Sam - symbolism.

SPECIAL: Mod Maria - moderation; Write Wendy - documentation; Quest Quinn - outside perspective; Spin Steve - persuasion; Local Lisa - local knowledge.

DELIBERATION RULES:
- Address the topic from ALL major angles (pros, cons, risks, alternatives)
- ${mode === 'adversarial' ? 'Force competing viewpoints to clash. Each councilor must argue their position strongly.' : 'Seek balanced perspective across all viewpoints.'}
- ${mode === 'socratic' ? 'Question every assumption. Ask "but what if we\'re wrong?" repeatedly.' : ''}
- ${mode === 'consensus' ? 'Find the common ground all councilors can agree on.' : ''}
- ${mode === 'emergency' ? 'Decide RAPIDLY. Prioritize speed over completeness. State action immediately.' : ''}
- ${mode === 'creative' ? 'Brainstorm WILD ideas. Break assumptions. Innovate.' : ''}

FORMAT YOUR RESPONSE AS:
---
COUNCILOR DEBATES:
[3-5 key councilor viewpoints, named]

SYNTHESIS:
[How the arguments connect and what the council concludes]

VERDICT:
[Clear recommendation or decision - what should be done]

DISSENT:
[Any significant minority viewpoints that disagreement with the verdict]
---`;
}

// ─── Run Deliberation ─────────────────────────────────────────────
async function runDeliberation(topic, mode) {
    const sessionId = `council-${++sessionCounter}-${Date.now()}`;

    // Multi-model deliberation mode
    if (mode === 'multi') {
        return runMultiModelDeliberation(sessionId, topic);
    }

    // Standard single-model deliberation (backward compatible)
    const prompt = buildCouncilPrompt(topic, mode);
    const messages = [
        { role: 'system', content: `You are the AI Council deliberation lead. You channel ${COUNCILORS.length} specialist councilors in structured adversarial deliberation.` },
        { role: 'user', content: prompt }
    ];

    try {
        const result = await lmChat(messages, 'qwen3.6-35b-a3b', 3072);
        const reply = result.choices?.[0]?.message?.content || result.choices?.[0]?.message?.reasoning_content || 'No response';

        sessions.set(sessionId, {
            id: sessionId, topic, mode,
            status: 'complete', result,
            created: new Date().toISOString(),
            completed: new Date().toISOString(),
        });
        return sessions.get(sessionId);
    } catch (err) {
        sessions.set(sessionId, { id: sessionId, topic, mode, status: 'error', error: err.message, created: new Date().toISOString() });
        throw err;
    }
}

// ─── Multi-Model Deliberation (Cascading Aggregator Pattern) ─────
async function runMultiModelDeliberation(sessionId, topic) {
    const groupPrompts = buildGroupPrompts(topic);

    const results = await Promise.allSettled(
        Object.entries(groupPrompts).map(async ([group, prompt]) => {
            return scheduleCall(async () => {
                const config = MODEL_CONFIG[group] || MODEL_CONFIG.default;
                const budget = TOKEN_BUDGETS[config.model] || 4000;
                const processedPrompt = prompt.slice(0, budget);

                const r = await providers.call('lmstudio', [
                    { role: 'system', content: `You are the AI ${group.toUpperCase()} COUNCIL. Be concise (under 400 chars total).` },
                    { role: 'user', content: processedPrompt }
                ], config.model, RESPONSE_LIMITS[config.model] || 256);

                return { group, content: r.status === 'success' ? r.content.slice(0, 400) : `[${group} error]` };
            });
        })
    );

    // Stage 1: Each group summarizes (capped at SUMMARY_LIMIT chars)
    const summaries = results
        .filter(r => r.status === 'fulfilled')
        .map(r => `### ${r.value.group.toUpperCase()}\n${r.value.content.slice(0, 400)}`)
        .join('\n\n');

    // Stage 2: Synthesize final verdict via large model
    const synthesisPrompt = `COUNCIL DEBATES:\n${summaries.slice(0, 1000)}\n\nVERDICT for: ${topic.slice(0, 200)}\n\nSynthesize into a concise verdict with a specific action.`;

    const synthesis = await scheduleCall(async () => providers.call('lmstudio', [
        { role: 'system', content: 'You are the AI Council synthesis lead. Create a concise verdict. Under 800 chars total output.' },
        { role: 'user', content: synthesisPrompt }
    ], 'qwen3.6-35b-a3b', 800));

    const finalResult = synthesis.status === 'success' ? synthesis.content.slice(0, 1200) : `Summaries:\n${summaries.slice(0, 1000)}\n\n[Synthesis: ${synthesis.error || "failed"}]`;

    sessions.set(sessionId, {
        id: sessionId, topic, mode: 'multi',
        status: 'complete', result: finalResult,
        created: new Date().toISOString(),
        completed: new Date().toISOString(),
        multiModel: true,
        groupResults: results.filter(r => r.status === 'fulfilled').map(r => ({ group: r.value.group, model: MODEL_CONFIG[r.value.group]?.model }))
    });
    return sessions.get(sessionId);
}

// ─── Build Group Prompts ──────────────────────────────────────────
function buildGroupPrompts(topic) {
    return {
        leadership: `${topic}\n\nFocus: Governance, ethics, prioritization, who should decide and how.`,
        security: `${topic}\n\nFocus: Risk assessment, threat modeling, security implications, what could go wrong.`,
        technical: `${topic}\n\nFocus: Implementation feasibility, architecture, technical constraints.`,
        strategy: `${topic}\n\nFocus: Long-term planning, economics, product strategy, ROI.`,
        cannabis: `${topic}\n\nFocus: Plant health, cultivation, environment, grow expertise.`,
        analysts: `${topic}\n\nFocus: Data patterns, visual analysis, details, anomalies.`,
        special: `${topic}\n\nFocus: Alternative perspectives, outsider analysis, spin, documentation.`
    };
}

// ─── HTTP Server ─────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Helper
    const json = (code, data) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data, null, 2));
    };

    // GET / - Health
    if (pathname === '/' && req.method === 'GET') {
        json(200, { status: 'ok', service: 'ai-council', version: '2.3.0', port: PORT });
        return;
    }

    // GET /api/health - Health check (for hive-workflow.js compatibility)
    if (pathname === '/api/health' && req.method === 'GET') {
        json(200, { status: 'ok', service: 'ai-council', version: '2.3.0', port: PORT, mode: 'standalone' });
        return;
    }

    // POST /api/session/start - Start deliberation
    if (pathname === '/api/session/start' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { topic, mode = 'standard', councilors } = JSON.parse(body);
                if (!topic) return json(400, { error: 'topic required' });

                const session = await runDeliberation(topic, mode);
                json(200, { session_id: session.id, status: session.status, topic, mode });
            } catch (err) {
                json(500, { error: err.message });
            }
        });
        return;
    }

    // GET /api/session - Current/last session
    if (pathname === '/api/session' && req.method === 'GET') {
        const sessionsArr = Array.from(sessions.values()).slice(-5);
        json(200, { sessions: sessionsArr });
        return;
    }

    // GET /api/session/:id - Specific session
    if (pathname.startsWith('/api/session/') && req.method === 'GET') {
        const id = pathname.split('/')[3];
        const session = sessions.get(id);
        if (!session) return json(404, { error: 'session not found' });
        json(200, session);
        return;
    }

    // GET /api/councilors - List councilors
    if (pathname === '/api/councilors' && req.method === 'GET') {
        json(200, { councilors: COUNCILORS, count: COUNCILORS.length });
        return;
    }

    // GET /api/modes — List modes
    if (pathname === '/api/modes' && req.method === 'GET') {
        json(200, { modes: MODES });
        return;
    }
    
    // GET /api/providers — List available providers/models
    if (pathname === '/api/providers' && req.method === 'GET') {
        json(200, { 
            providers: providers.listProviders(),
            models: providers.getModels('lmstudio'),
            modelConfig: MODEL_CONFIG,
            tokenBudgets: TOKEN_BUDGETS
        });
        return;
    }

    // ─── MoA Endpoints ─────────────────────────────────────────────────
    const moa = require('./moa/moa-runtime.js');

    // Helper: read POST body
    const readBody = (req) => new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });

    if (pathname.startsWith('/api/moa/')) {
        const pathParts = pathname.split('/'); // ['', 'api', 'moa', ...]

        // GET /api/moa/presets — list all presets
        if (pathname === '/api/moa/presets' && req.method === 'GET') {
            const presets = moa.listPresets();
            json(200, { presets });
            return;
        }

        // POST /api/moa/presets — save a preset
        if (pathname === '/api/moa/presets' && req.method === 'POST') {
            try {
                const bodyStr = await readBody(req);
                const { preset_name, preset_config } = JSON.parse(bodyStr);
                if (!preset_name || !preset_config) {
                    json(400, { error: 'preset_name and preset_config are required' });
                    return;
                }
                const saved = moa.savePreset(preset_name, preset_config);
                json(200, { saved, message: `Preset '${preset_name}' saved.` });
            } catch (exc) {
                json(400, { error: exc.message });
            }
            return;
        }

        // GET /api/moa/presets/:name — get a specific preset
        if (pathParts[3] && !pathParts[4] && req.method === 'GET') {
            const name = pathParts[3];
            const preset = moa.getPreset(name);
            if (!preset) { json(404, { error: `Preset '${name}' not found.` }); return; }
            json(200, { preset });
            return;
        }

        // DELETE /api/moa/presets/:name — delete a preset
        if (pathParts[3] && !pathParts[4] && req.method === 'DELETE') {
            const name = pathParts[3];
            const deleted = moa.deletePreset(name);
            json(200, { deleted, message: deleted ? `Preset '${name}' deleted.` : `Preset '${name}' not found.` });
            return;
        }

        // POST /api/moa/run — run MoA
        if (pathname === '/api/moa/run' && req.method === 'POST') {
            try {
                const bodyStr = await readBody(req);
                const { prompt, preset, history } = JSON.parse(bodyStr);
                if (!prompt) { json(400, { error: '"prompt" is required' }); return; }
                const result = await moa.runMoA(prompt, preset || 'default', history || []);
                json(200, result);
            } catch (exc) {
                json(500, { error: exc.message });
            }
            return;
        }

        // Fallthrough: unknown /api/moa/* route
        json(404, { error: 'not found', path: pathname });
        return;
    }

    // 404
    json(404, { error: 'not found', path: pathname });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🏛️  AI Council server running on port ${PORT}`);
    console.log(`   LM Studio: ${LM_STUDIO_URL}`);
    console.log(`   Endpoints:`);
    console.log(`     GET  /               - health`);
    console.log(`     POST /api/session/start - start deliberation`);
    console.log(`     GET  /api/session    - list recent sessions`);
    console.log(`     GET  /api/session/:id - get session result`);
    console.log(`     GET  /api/councilors - list ${COUNCILORS.length} councilors`);
    console.log(`     GET  /api/modes      - list deliberation modes`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${PORT} already in use - is council already running?`);
    } else {
        console.error(`Server error: ${err.message}`);
    }
});
