/**
 * MoA Runtime — Mixture of Agents implementation
 * Reference models run in parallel, aggregator synthesizes their advice.
 * Based on Hermes Agent moa_loop.py design.
 */
const { ProviderManager } = require('../providers/provider-adapter.js');

// Initialize providers using the same setup as council-server.js
const providers = new ProviderManager();
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://100.68.208.113:1234';
const LM_STUDIO_KEY = process.env.LM_STUDIO_KEY || 'sk-lm-xWvfQHZF:L8P76SQakhEA95U8DDNf';
providers.registerProvider('lmstudio', {
  baseUrl: LM_STUDIO_URL + '/v1',
  apiKey: LM_STUDIO_KEY,
});

const MAX_WORKERS = 8;

function slotLabel(slot) {
  return `${(slot.provider || '').trim()}:${(slot.model || '').trim()}`;
}

function extractText(response) {
  try {
    // Provider adapter returns { status, content, usage } — extract from there
    if (typeof response === 'object' && response !== null) {
      if (response.status === 'error') return '';
      const text = (response.content || '').trim();
      if (text) return text;
      // Also check raw API response shape (choices[0].message.content)
      const raw = response.choices?.[0]?.message?.content || '';
      return (raw || '').trim();
    }
    return '';
  } catch { return ''; }
}

async function callModel(provider, model, messages, temperature = 0.7, maxTokens = 1024) {
  return providers.call(provider, messages, model, maxTokens);
}

function trimForReference(messages) {
  // Reference models get a sanitized view: user/assistant text only, no system, no tool messages
  const trimmed = [];
  for (const msg of messages) {
    const role = msg.role;
    if (role !== 'user' && role !== 'assistant') continue;
    const content = msg.content;
    if (!content) continue;
    if (role === 'assistant' && typeof content === 'string' && !content.trim()) continue;
    const text = typeof content === 'string' ? content : '';
    if (!text.trim()) continue;
    trimmed.push({ role, content: text });
  }
  if (!trimmed.length) {
    // Fallback: use the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user' && typeof msg.content === 'string') {
        return [{ role: 'user', content: msg.content }];
      }
    }
  }
  return trimmed;
}

async function runReference(slot, refMessages, temperature, maxTokens) {
  const label = slotLabel(slot);
  try {
    const result = await callModel(slot.provider, slot.model, refMessages, temperature, maxTokens);
    const text = result.status === 'success' ? extractText(result) || '(empty response)' : `[error: ${result.error || 'unknown'}]`;
    return [label, text];
  } catch (exc) {
    return [label, `[failed: ${exc.message}]`];
  }
}

async function runReferencesParallel(referenceModels, refMessages, temperature, maxTokens) {
  if (!referenceModels || !referenceModels.length) return [];
  const refs = referenceModels.slice(0, MAX_WORKERS);
  const futures = refs.map(slot => runReference(slot, refMessages, temperature, maxTokens));
  return Promise.all(futures);
}

function buildAggregatorPrompt(userPrompt, referenceOutputs, presetName, aggregatorLabel) {
  const joined = referenceOutputs
    .map(([label, text], i) => `Reference ${i + 1} — ${label}:\n${text}`)
    .join('\n\n');

  return `You are the aggregator in a Mixture of Agents process. The references below have analyzed the user's prompt and provided their perspectives. Synthesize their advice into a concise, actionable response. Focus on next steps, strategy, risks, and disagreements. Do not simply list what each reference said — synthesize into a unified recommendation.

Original user prompt:
${userPrompt}

Reference responses:
${joined}

Your synthesized response:`;
}

/**
 * Run MoA with a named preset and return the aggregator's text response.
 * @param {string} prompt - The user prompt
 * @param {string} presetName - Name of preset in moa/config.json
 * @param {Array} history - Conversation history (optional)
 * @returns {Promise<{response: string, references: Array, preset: string, aggregator: string}>}
 */
async function runMoA(prompt, presetName = 'default', history = []) {
  const config = loadConfig();
  const moaCfg = config.moa || {};
  const presets = moaCfg.presets || {};
  const defaultPreset = moaCfg.default_preset || 'default';
  const preset = presets[presetName] || presets[defaultPreset] || presets.default;
  if (!preset) {
    throw new Error(`No MoA preset found for '${presetName}' and no default preset configured.`);
  }

  if (preset.enabled === false) {
    // Disabled: run aggregator directly
    const aggResult = await callModel(
      preset.aggregator.provider, preset.aggregator.model,
      [...history, { role: 'user', content: prompt }],
      preset.aggregator_temperature || 0.4,
      preset.reference_max_tokens || 1024
    );
    return {
      response: aggResult.status === 'success' ? extractText(aggResult) : `[error: ${aggResult.error}]`,
      references: [],
      preset: presetName,
      aggregator: slotLabel(preset.aggregator)
    };
  }

  const refMessages = trimForReference(history.length ? [...history, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }]);
  const refTemp = preset.reference_temperature || 0.6;
  const maxTokens = preset.reference_max_tokens || 1024;

  const referenceOutputs = await runReferencesParallel(
    preset.reference_models || [],
    refMessages,
    refTemp,
    maxTokens
  );

  const synthPrompt = buildAggregatorPrompt(prompt, referenceOutputs, presetName, slotLabel(preset.aggregator));
  const aggResult = await callModel(
    preset.aggregator.provider, preset.aggregator.model,
    [{ role: 'user', content: synthPrompt }],
    preset.aggregator_temperature || 0.4,
    maxTokens * 2
  );

  const synthesis = aggResult.status === 'success' ? extractText(aggResult) : `[aggregator error: ${aggResult.error}]`;
  return {
    response: synthesis || referenceOutputs.map(([l,t]) => `[${l}]: ${t}`).join('\n'),
    references: referenceOutputs.map(([label, text]) => ({ label, text })),
    preset: presetName,
    aggregator: slotLabel(preset.aggregator)
  };
}

/**
 * Run MoA where the aggregator can call tools (agentic mode).
 * toolsFn is a function(model, messages) => Promise<{text, toolCalls}>
 */
async function runMoAWithTools(prompt, presetName, tools, toolsFn, history = []) {
  const result = await runMoA(prompt, presetName, history);
  // Inject reference context into conversation for tool-calling
  const refCtx = result.references.map((r, i) => `Reference ${i+1} — ${r.label}:\n${r.text}`).join('\n\n');
  const contextMsg = { role: 'system', content: `[MoA Reference Context]\n${refCtx}` };
  const fullHistory = [...history.filter(m => m.role !== 'system'), contextMsg, ...history.filter(m => m.role === 'system'), { role: 'user', content: prompt }];
  
  if (tools && toolsFn) {
    const toolResult = await toolsFn(presetName, fullHistory, tools);
    return { ...result, toolResult };
  }
  return result;
}

let _cachedConfig = null;
function loadConfig() {
  if (_cachedConfig) return _cachedConfig;
  const fs = require('fs');
  const path = require('path');
  try {
    const configPath = path.join(__dirname, 'config.json');
    const raw = fs.readFileSync(configPath, 'utf-8');
    _cachedConfig = JSON.parse(raw);
  } catch {
    _cachedConfig = { moa: { default_preset: 'default', presets: {} } };
  }
  return _cachedConfig;
}

function listPresets() {
  const config = loadConfig();
  const moaCfg = config.moa || {};
  const presets = moaCfg.presets || {};
  return Object.entries(presets).map(([name, p]) => ({
    name,
    enabled: p.enabled !== false,
    ref_count: (p.reference_models || []).length,
    aggregator: slotLabel(p.aggregator || {}),
    reference_temperature: p.reference_temperature || 0.6,
    aggregator_temperature: p.aggregator_temperature || 0.4
  }));
}

function getPreset(name) {
  const config = loadConfig();
  const moaCfg = config.moa || {};
  return moaCfg.presets?.[name] || null;
}

function savePreset(name, presetConfig) {
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, 'config.json');
  let config;
  try {
    config = loadConfig();
  } catch {
    config = { moa: { presets: {} } };
  }
  if (!config.moa) config.moa = { presets: {} };
  config.moa.presets[name] = presetConfig;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  _cachedConfig = null;
  return config.moa.presets[name];
}

function deletePreset(name) {
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, 'config.json');
  const config = loadConfig();
  if (config.moa?.presets?.[name]) {
    delete config.moa.presets[name];
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    _cachedConfig = null;
    return true;
  }
  return false;
}

module.exports = { runMoA, runMoAWithTools, listPresets, getPreset, savePreset, deletePreset };