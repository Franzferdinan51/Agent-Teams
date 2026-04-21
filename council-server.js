#!/usr/bin/env node
/**
 * AI Council Server — REST API for adversarial deliberation
 * Port: 3003
 * 
 * Endpoints:
 *   GET  /                   — health check
 *   POST /api/session/start  — start deliberation {topic, mode} → {session_id}
 *   GET  /api/session       — current session status
 *   GET  /api/councilors    — list all 45 councilors
 *   GET  /api/modes         — list deliberation modes
 *   GET  /api/session/:id   — get session result
 */

const http = require('http');
const url = require('url');

// ─── Configuration ───────────────────────────────────────────────
const PORT = process.env.COUNCIL_PORT || 3003;
const LM_STUDIO_URL = process.env.LMSTUDIO_URL || 'http://100.68.208.113:1234';
const LM_STUDIO_KEY = process.env.LMSTUDIO_KEY || 'sk-lm-xWvfQHZF:L8P76SQakhEA95U8DDNf';

// ─── 45 Councilor Personas ───────────────────────────────────────
const COUNCILORS = [
    // Leadership & Meta
    { id: 'speaker',      name: 'Victoria Adams',    party: 'Neutral',      role: 'Speaker of the Council', specialty: 'leadership', voteWeight: 2 },
    { id: 'technocrat',   name: 'James Techson',     party: 'Neutral',      role: 'Chief Technologist', specialty: 'technical', voteWeight: 1 },
    { id: 'ethicist',     name: 'Maya Ethics',        party: 'Neutral',      role: 'Chief Ethicist', specialty: 'ethics', voteWeight: 1 },
    { id: 'pragmatist',   name: 'Sam Practical',     party: 'Neutral',      role: 'Pragmatist', specialty: 'practical', voteWeight: 1 },
    { id: 'skeptic',      name: 'Chris Doubt',        party: 'Neutral',      role: 'Devils Advocate', specialty: 'critical', voteWeight: 1 },
    
    // Security & Safety
    { id: 'sentinel',     name: 'Alex Shield',       party: 'Security',     role: 'Security Sentinel', specialty: 'security', veto: ['security'], voteWeight: 1 },
    { id: 'security_expert', name: 'Secure Steve',   party: 'Security',     role: 'Security Expert', specialty: 'security', voteWeight: 1 },
    { id: 'risk_manager', name: 'Risk Rachel',        party: 'Conservative', role: 'Risk Manager', specialty: 'risk', voteWeight: 1 },
    { id: 'risk_analyst', name: 'Risk Ray',           party: 'Conservative', role: 'Risk Analyst', specialty: 'risk', voteWeight: 1 },
    { id: 'emergency_mgr',name: 'Alert Alex',         party: 'Security',      role: 'Emergency Manager', specialty: 'emergency', voteWeight: 2 },
    
    // Technical
    { id: 'architect',    name: 'Arch Andy',         party: 'Neutral',      role: 'Software Architect', specialty: 'architecture', voteWeight: 1 },
    { id: 'coder',        name: 'Code Carlos',        party: 'Neutral',      role: 'Senior Coder', specialty: 'coding', voteWeight: 1 },
    { id: 'devops',       name: 'Ops Oliver',         party: 'Neutral',      role: 'DevOps Engineer', specialty: 'devops', voteWeight: 1 },
    { id: 'perf_engineer',name: 'Fast Fiona',         party: 'Neutral',      role: 'Performance Engineer', specialty: 'performance', voteWeight: 1 },
    { id: 'qa',           name: 'Test Tara',           party: 'Neutral',      role: 'QA Engineer', specialty: 'quality', voteWeight: 1 },
    { id: 'data_scientist',name: 'Data Diana',        party: 'Neutral',      role: 'Data Scientist', specialty: 'data', voteWeight: 1 },
    
    // Creative & Strategy
    { id: 'visionary',    name: 'Riley Dream',        party: 'Progressive',  role: 'Visionary', specialty: 'innovation', voteWeight: 1 },
    { id: 'product_manager',name: 'PM Chen',          party: 'Neutral',      role: 'Product Manager', specialty: 'product', voteWeight: 1 },
    { id: 'planner',      name: 'Plan Petra',          party: 'Neutral',      role: 'Strategic Planner', specialty: 'planning', voteWeight: 1 },
    { id: 'economist',    name: 'Wall Street Sam',    party: 'Conservative', role: 'Economist', specialty: 'economics', voteWeight: 1 },
    { id: 'financier',    name: 'Money Mike',         party: 'Conservative', role: 'Financier', specialty: 'finance', veto: ['budget'], voteWeight: 1 },
    
    // Domain Experts
    { id: 'botanist',     name: 'Flora Green',       party: 'Neutral',      role: 'Botanist', specialty: 'plants', voteWeight: 1 },
    { id: 'cannabis_botanist', name: 'Dr. Jane Grow',    party: 'Cannabis',  role: 'Cannabis Botanist', specialty: 'cannabis,botanics,plant-science', voteWeight: 1, model: 'qwen3.6-35b-a3b-tq3_4s' },
    { id: 'cultivation_expert', name: 'Max Yield',       party: 'Cannabis',  role: 'Cultivation Expert', specialty: 'cultivation,growing,indoor,outdoor,soil,nutrients', voteWeight: 1, model: 'qwen3.6-35b-a3b-tq3_4s' },
    { id: 'thc_analyst', name: 'Dr. Potency Paul',     party: 'Cannabis',  role: 'THC Analyst', specialty: 'thc,cbd,cannabinoids,potency,lab-testing', voteWeight: 1, model: 'qwen3.6-35b-a3b-tq3_4s' },
    { id: 'terpene_specialist', name: 'Aroma Alex',     party: 'Cannabis',  role: 'Terpene Specialist', specialty: 'terpenes,flavonoids,aroma,flavor', voteWeight: 1, model: 'qwen3.6-35b-a3b-tq3_4s' },
    { id: 'medical_cannabis', name: 'Dr. Wellness Willow', party: 'Cannabis',  role: 'Medical Cannabis Advisor', specialty: 'medical,medicinal,wellness,health,dosage', voteWeight: 1, model: 'qwen3.6-35b-a3b-tq3_4s' },
    { id: 'plant_health_expert', name: 'Dr. Green',       party: 'Cannabis',  role: 'Plant Health Expert', specialty: 'plant-health,pests,diseases,nutrients,deficiencies', voteWeight: 1, model: 'qwen3.6-35b-a3b-tq3_4s' },
    { id: 'general_plant_analyst', name: 'Zoe Plants',  party: 'Cannabis',  role: 'General Plant Analyst', specialty: 'plants,general,photosynthesis,watering,light', voteWeight: 1, model: 'qwen3.6-35b-a3b-tq3_4s' },
    { id: 'harvest_master', name: 'Harvest Hannah',    party: 'Cannabis',  role: 'Harvest Master', specialty: 'harvest,curing,drying,trimming,preservation', voteWeight: 1, model: 'qwen3.6-35b-a3b-tq3_4s' },
    { id: 'strain_breeder', name: 'Genetics Gary',     party: 'Cannabis',  role: 'Strain Breeder', specialty: 'genetics,breeding,strains,phenotypes,seeds', voteWeight: 1, model: 'qwen3.6-35b-a3b-tq3_4s' },
    { id: 'environment_control', name: 'Control Chris', party: 'Cannabis',  role: 'Environment Controller', specialty: 'environment,temperature,humidity,vpd,lighting,hvac', voteWeight: 1, model: 'qwen3.6-35b-a3b-tq3_4s' },
    { id: 'geneticist',   name: 'Gene Grey',          party: 'Neutral',      role: 'Geneticist', specialty: 'genetics', voteWeight: 1 },
    { id: 'animal_care',  name: 'Vet Val',            party: 'Neutral',      role: 'Animal Care Specialist', specialty: 'animal-care', voteWeight: 1 },
    { id: 'meteorologist',name: 'Storm Chris',        party: 'Neutral',      role: 'Meteorologist', specialty: 'weather', voteWeight: 1, priority: 'emergency' },
    
    // Communication & Review
    { id: 'journalist',   name: 'Dana Press',         party: 'Neutral',      role: 'Journalist', specialty: 'communication', voteWeight: 1 },
    { id: 'diplomat',     name: 'Lee Harmony',         party: 'Neutral',      role: 'Diplomat', specialty: 'diplomacy', voteWeight: 1 },
    { id: 'marketer',     name: 'Brand Kate',          party: 'Progressive',  role: 'Marketer', specialty: 'marketing', voteWeight: 1 },
    { id: 'historian',    name: 'Pat Past',            party: 'Neutral',      role: 'Historian', specialty: 'history', voteWeight: 1 },
    { id: 'psychologist', name: 'Dr. Mind',            party: 'Neutral',      role: 'Psychologist', specialty: 'human-factors', voteWeight: 1 },
    
    // Analysts
    { id: 'visual_analyst',    name: 'See Sally',    party: 'Neutral',      role: 'Visual Analyst', specialty: 'vision', voteWeight: 1 },
    { id: 'pattern_recognizer', name: 'Pattern Pete', party: 'Neutral',      role: 'Pattern Recognizer', specialty: 'patterns', voteWeight: 1 },
    { id: 'color_specialist',   name: 'Color Carol',  party: 'Neutral',      role: 'Color Specialist', specialty: 'color', voteWeight: 1 },
    { id: 'composition_expert', name: 'Frame Frank',  party: 'Neutral',      role: 'Composition Expert', specialty: 'composition', voteWeight: 1 },
    { id: 'context_interpreter',name: 'Context Chloe',party: 'Neutral',      role: 'Context Interpreter', specialty: 'context', voteWeight: 1 },
    { id: 'detail_observer',   name: 'Detail Dan',   party: 'Neutral',      role: 'Detail Observer', specialty: 'details', voteWeight: 1 },
    { id: 'emotion_reader',    name: 'Feel Fran',    party: 'Neutral',      role: 'Emotion Reader', specialty: 'emotion', voteWeight: 1 },
    { id: 'symbol_interpreter', name: 'Symbol Sam',   party: 'Neutral',      role: 'Symbol Interpreter', specialty: 'symbols', voteWeight: 1 },
    
    // Special
    { id: 'moderator',    name: 'Mod Maria',          party: 'Neutral',      role: 'Moderator', specialty: 'moderation', voteWeight: 1 },
    { id: 'tech_writer',  name: 'Write Wendy',        party: 'Neutral',      role: 'Technical Writer', specialty: 'documentation', voteWeight: 1 },
    { id: 'conspiracist', name: 'Quest Quinn',        party: 'Neutral',      role: 'Outsider Analyst', specialty: 'alternative', voteWeight: 1 },
    { id: 'propagandist', name: 'Spin Steve',         party: 'Neutral',      role: 'Spin Doctor', specialty: 'persuasion', voteWeight: 1 },
    { id: 'local_resident', name: 'Local Lisa',       party: 'Neutral',      role: 'Local Resident', specialty: 'local', voteWeight: 1 },
];

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
};

// ─── Sessions Store ───────────────────────────────────────────────
const sessions = new Map();
let sessionCounter = 0;

// ─── LM Studio Call ──────────────────────────────────────────────
function lmChat(messages, model = 'google/gemma-4-26b-a4b', maxTokens = 1024) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 });
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
        req.write(body);
        req.end();
    });
}

// ─── Build Council System Prompt ──────────────────────────────────
function buildCouncilPrompt(topic, mode) {
    const modeInfo = MODES[mode] || MODES.standard;
    return `You are the AI COUNCIL — an adversarial deliberation body with 45 specialized councilors.
    
TOPIC: ${topic}
MODE: ${modeInfo.name} (${modeInfo.description})

You must deliberate as if all 45 councilors are present. Each councilor will speak in sequence, then you will synthesize a VERDICT.

Councilors (speak as yourself, channeling each persona):

LEADERSHIP: Victoria Adams (Speaker) — fair, balanced, seeks truth; James Techson (Technocrat) — technical depth; Maya Ethics — ethical implications; Sam Practical — pragmatic feasibility; Chris Doubt — critical skeptic.

SECURITY: Alex Shield (Sentinel) — security implications; Secure Steve — vulnerability analysis; Risk Rachel — risk assessment; Risk Ray — threat modeling; Alert Alex — emergency protocols.

TECHNICAL: Arch Andy — system architecture; Code Carlos — implementation; Ops Oliver — DevOps; Fast Fiona — performance; Test Tara — quality; Data Diana — data analysis.

STRATEGY: Riley Dream (Visionary) — innovation; PM Chen — product strategy; Plan Petra — roadmapping; Wall Street Sam — economics; Money Mike — budget constraints.

DOMAIN: Flora Green — plants/botany; Gene Grey — genetics; Vet Val — animal care; Storm Chris — weather; Dana Press — communications; Lee Harmony — diplomacy.

ANALYSTS: See Sally — visual analysis; Pattern Pete — patterns; Color Carol — aesthetics; Frame Frank — composition; Context Chloe — context; Detail Dan — thoroughness; Feel Fran — emotional impact; Symbol Sam — symbolism.

SPECIAL: Mod Maria — moderation; Write Wendy — documentation; Quest Quinn — outside perspective; Spin Steve — persuasion; Local Lisa — local knowledge.

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
[Clear recommendation or decision — what should be done]

DISSENT:
[Any significant minority viewpoints that disagreement with the verdict]
---`;
}

// ─── Run Deliberation ─────────────────────────────────────────────
async function runDeliberation(topic, mode) {
    const sessionId = `council-${++sessionCounter}-${Date.now()}`;
    const prompt = buildCouncilPrompt(topic, mode);
    
    const messages = [
        { role: 'system', content: 'You are the AI Council deliberation lead. You channel 45 specialist councilors in structured adversarial deliberation.' },
        { role: 'user', content: prompt }
    ];
    
    try {
        const result = await lmChat(messages, 'qwen3.6-35b-a3b', 1536);
        const reply = result.choices?.[0]?.message?.content || result.choices?.[0]?.message?.reasoning_content || 'No response';
        
        sessions.set(sessionId, {
            id: sessionId,
            topic,
            mode,
            status: 'complete',
            result: reply,
            created: new Date().toISOString(),
            completed: new Date().toISOString(),
        });
        
        return sessions.get(sessionId);
    } catch (err) {
        sessions.set(sessionId, {
            id: sessionId,
            topic,
            mode,
            status: 'error',
            error: err.message,
            created: new Date().toISOString(),
        });
        throw err;
    }
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
    
    // GET / — Health
    if (pathname === '/' && req.method === 'GET') {
        json(200, { status: 'ok', service: 'ai-council', version: '1.0.0', port: PORT });
        return;
    }
    
    // GET /api/health — Health check (for hive-workflow.js compatibility)
    if (pathname === '/api/health' && req.method === 'GET') {
        json(200, { status: 'ok', service: 'ai-council', version: '1.0.0', port: PORT, mode: 'standalone' });
        return;
    }
    
    // POST /api/session/start — Start deliberation
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
    
    // GET /api/session — Current/last session
    if (pathname === '/api/session' && req.method === 'GET') {
        const sessionsArr = Array.from(sessions.values()).slice(-5);
        json(200, { sessions: sessionsArr });
        return;
    }
    
    // GET /api/session/:id — Specific session
    if (pathname.startsWith('/api/session/') && req.method === 'GET') {
        const id = pathname.split('/')[3];
        const session = sessions.get(id);
        if (!session) return json(404, { error: 'session not found' });
        json(200, session);
        return;
    }
    
    // GET /api/councilors — List councilors
    if (pathname === '/api/councilors' && req.method === 'GET') {
        json(200, { councilors: COUNCILORS, count: COUNCILORS.length });
        return;
    }
    
    // GET /api/modes — List modes
    if (pathname === '/api/modes' && req.method === 'GET') {
        json(200, { modes: MODES });
        return;
    }
    
    // 404
    json(404, { error: 'not found', path: pathname });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🏛️  AI Council server running on port ${PORT}`);
    console.log(`   LM Studio: ${LM_STUDIO_URL}`);
    console.log(`   Endpoints:`);
    console.log(`     GET  /               — health`);
    console.log(`     POST /api/session/start — start deliberation`);
    console.log(`     GET  /api/session    — list recent sessions`);
    console.log(`     GET  /api/session/:id — get session result`);
    console.log(`     GET  /api/councilors — list 45 councilors`);
    console.log(`     GET  /api/modes      — list deliberation modes`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${PORT} already in use — is council already running?`);
    } else {
        console.error(`Server error: ${err.message}`);
    }
});
