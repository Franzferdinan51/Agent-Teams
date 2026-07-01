/**
 * MoA Runtime — Mixture of Agents implementation
 * Reference models run in parallel, aggregator synthesizes their advice.
 * Based on Hermes Agent moa_loop.py design.
 *
 * Hermes alignment (v0.18.0):
 *  - Hermes-style reference message shaping (tool_calls → inline text, tool results folded)
 *  - Must end on user turn (advisory instruction appended if trailing assistant)
 *  - Hermes-style aggregator prompt framing + MoA context block wrapping
 *  - KV-cache optimization: MoA guidance appended at END, not prepended as system message
 */
const { ProviderManager } = require('../providers/provider-adapter.js');

// Initialize providers using the same setup as council-server.js
const providers = new ProviderManager();
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://127.0.0.1:1234';
const LM_STUDIO_KEY = process.env.LM_STUDIO_KEY || 'sk-lm-xWvfQHZF:L8P76SQakhEA95U8DDNf';
providers.registerProvider('lmstudio', {
  baseUrl: LM_STUDIO_URL + '/v1',
  apiKey: LM_STUDIO_KEY,
});

const MAX_WORKERS = 8;
const REFERENCE_TOOL_RESULT_BUDGET = 1200;

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

// ─── Hermes-style reference message shaping ───────────────────────────────────

/**
 * Head+tail preview of a tool result for the advisory view.
 * Keeps first and last halves with an omitted marker so references see
 * both how the result started and how it ended.
 */
function _truncateToolResult(text, budget = REFERENCE_TOOL_RESULT_BUDGET) {
  if (!text || text.length <= budget) return text;
  const half = Math.floor(budget / 2);
  const omitted = text.length - 2 * half;
  return `${text.slice(0, half)}\n[... ${omitted} chars omitted ...]\n${text.slice(-half)}`;
}

/**
 * Render an assistant turn's tool_calls as readable inline text.
 * Strict providers (Mistral, Fireworks) reject tool_calls the reference
 * never produced — flatten to text so they don't 400.
 */
function _renderToolCalls(toolCalls) {
  if (!toolCalls || !toolCalls.length) return '';
  const lines = [];
  for (const tc of toolCalls) {
    let name, argsText;
    if (typeof tc === 'object') {
      const fn = tc.function || {};
      name = fn.name || tc.name || 'tool';
      const args = fn.arguments || tc.arguments;
      if (typeof args === 'string') {
        argsText = args;
      } else if (args != null) {
        try { argsText = JSON.stringify(args); } catch { argsText = String(args); }
      } else {
        argsText = '';
      }
    } else {
      name = String(tc);
      argsText = '';
    }
    lines.push(argsText ? `[called tool: ${name}(${argsText})]` : `[called tool: ${name}]`);
  }
  return lines.join('\n');
}

/**
 * Build an advisory view of the conversation for reference models.
 *
 * Key rules (Hermes pattern):
 *  - Zero tool-role messages — folded into the preceding assistant turn
 *  - Zero tool_calls arrays — rendered as [called tool: name(args)] inline
 *  - Must END on a user turn — if last is assistant, append synthetic advisory
 *    instruction (Anthropic rejects trailing assistant turns as "assistant prefill")
 *  - Strict providers that reject orphan tool messages don't 400
 *
 * The aggregator always receives the full, untrimmed transcript;
 * this function only shapes the disposable advisory copy.
 */
function trimForReference(messages) {
  const ADVISORY_INSTRUCTION = (
    '[The conversation above is the current state of the task. Give your most intelligent '
    + 'judgement: what is going on, what should happen next, what risks or mistakes you see, '
    + 'and how the acting agent should proceed.]'
  );

  const rendered = [];
  let lastUserContent = null;

  for (const msg of messages) {
    const role = msg.role;
    const content = msg.content;
    const text = typeof content === 'string' ? content : '';

    if (role === 'system') {
      // System is Hermes boilerplate — drop it for reference models
      continue;
    }

    if (role === 'user') {
      if (text.trim()) lastUserContent = text;
      rendered.push({ role: 'user', content: text });
      continue;
    }

    if (role === 'assistant') {
      const parts = [];
      if (text.trim()) parts.push(text.trim());
      const callsText = _renderToolCalls(msg.tool_calls);
      if (callsText) parts.push(callsText);
      // Empty assistant turns (no text, no calls) carry nothing advisory
      if (parts.length) {
        rendered.push({ role: 'assistant', content: parts.join('\n') });
      }
      continue;
    }

    if (role === 'tool') {
      // Fold tool result into the preceding assistant turn as text
      const resultText = _truncateToolResult(text);
      const block = `[tool result: ${resultText}]`;
      if (rendered.length && rendered[rendered.length - 1].role === 'assistant') {
        rendered[rendered.length - 1].content += '\n' + block;
      } else {
        // No assistant turn to attach to — keep as advisory assistant line
        rendered.push({ role: 'assistant', content: block });
      }
      continue;
    }
    // Any other role — skip
  }

  // Must end on a user turn. If last is assistant, append synthetic advisory.
  // If already user (fresh prompt, no agent action yet), leave it.
  if (rendered.length && rendered[rendered.length - 1].role === 'assistant') {
    rendered.push({ role: 'user', content: ADVISORY_INSTRUCTION });
  }

  if (!rendered.length) {
    // Degenerate: nothing rendered. Fall back to the latest user turn.
    if (lastUserContent !== null) {
      return [{ role: 'user', content: lastUserContent }];
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user' && typeof msg.content === 'string') {
        return [{ role: 'user', content: msg.content }];
      }
    }
  }

  return rendered;
}

// ─── Reference execution ───────────────────────────────────────────────────────

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

// ─── Aggregator prompt (Hermes framing) ──────────────────────────────────────

/**
 * Hermes-style aggregator prompt.
 * "Synthesize... for the main agent. Do not answer the user directly."
 */
function buildAggregatorPrompt(userPrompt, referenceOutputs, presetName, aggregatorLabel) {
  const joined = referenceOutputs
    .map(([label, text], i) => `Reference ${i + 1} — ${label}:\n${text}`)
    .join('\n\n');

  return `You are the aggregator in a Mixture of Agents process. Synthesize the reference responses into concise, actionable guidance for the main agent. Focus on next steps, tool-use strategy, risks, and any disagreements. Do not answer the user directly unless that is all that is needed; produce context the main agent should use in its normal loop.

Original user prompt:
${userPrompt}

Reference responses:
${joined}`;
}

/**
 * Hermes-style MoA context block wrapping.
 * The aggregator's output is wrapped so the main agent loop knows it's private
 * guidance — it may call tools, continue reasoning, or finish normally.
 */
function wrapAggregatorOutput(synthesis, aggregatorLabel, referenceModels) {
  if (!synthesis || !synthesis.trim()) return '';
  return (
    '[Mixture of Agents context — use this as private guidance for the normal agent loop. '
    + 'You may call tools, continue reasoning, or finish normally.]\n'
    + `Aggregator: ${aggregatorLabel}\n`
    + `References: ${referenceModels.map(slotLabel).join(', ')}\n\n`
    + synthesis.trim()
  );
}

/**
 * KV-cache optimization: append MoA guidance to the END of aggregator messages,
 * not as a system message at the beginning.
 *
 * Keeping [system][task][tool-history] stable means the KV cache is reusable
 * across every tool iteration — only the appended block re-prefills.
 * Hermes pattern: merge into the last message only when it's a trailing user turn.
 */
function attachReferenceGuidance(messages, guidance) {
  if (!messages || !messages.length || !guidance) return;
  const last = messages[messages.length - 1];
  if (last.role === 'user' && typeof last.content === 'string') {
    last.content = last.content + '\n\n' + guidance;
  } else {
    messages.push({ role: 'user', content: guidance });
  }
}

// ─── Main entry points ────────────────────────────────────────────────────────

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

  const inputMessages = history.length
    ? [...history, { role: 'user', content: prompt }]
    : [{ role: 'user', content: prompt }];
  const refMessages = trimForReference(inputMessages);
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
    response: synthesis || referenceOutputs.map(([l, t]) => `[${l}]: ${t}`).join('\n'),
    references: referenceOutputs.map(([label, text]) => ({ label, text })),
    preset: presetName,
    aggregator: slotLabel(preset.aggregator)
  };
}

/**
 * Run MoA where the aggregator can call tools (agentic mode).
 * KV-cache optimized: MoA guidance appended at END, not prepended as system.
 * @param {string} prompt
 * @param {string} presetName
 * @param {Array} tools - tool definitions
 * @param {Function} toolsFn - function(presetName, messages, tools) => Promise<{text, toolCalls}>
 * @param {Array} history
 */
async function runMoAWithTools(prompt, presetName, tools, toolsFn, history = []) {
  const config = loadConfig();
  const moaCfg = config.moa || {};
  const presets = moaCfg.presets || {};
  const defaultPreset = moaCfg.default_preset || 'default';
  const preset = presets[presetName] || presets[defaultPreset] || presets.default;
  if (!preset) {
    throw new Error(`No MoA preset found for '${presetName}' and no default preset configured.`);
  }

  const inputMessages = history ? [...history, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }];

  // Run references with Hermes-style trimming
  const refMessages = trimForReference(inputMessages);
  const refTemp = preset.reference_temperature || 0.6;
  const maxTokens = preset.reference_max_tokens || 1024;

  const referenceOutputs = await runReferencesParallel(
    preset.reference_models || [],
    refMessages,
    refTemp,
    maxTokens
  );

  // Hermes-style aggregator prompt
  const synthPrompt = buildAggregatorPrompt(prompt, referenceOutputs, presetName, slotLabel(preset.aggregator));
  const aggResult = await callModel(
    preset.aggregator.provider, preset.aggregator.model,
    [{ role: 'user', content: synthPrompt }],
    preset.aggregator_temperature || 0.4,
    maxTokens * 2
  );
  const synthesis = aggResult.status === 'success' ? extractText(aggResult) : `[aggregator error: ${aggResult.error}]`;

  // Wrap with Hermes-style MoA context block
  const wrappedGuidance = wrapAggregatorOutput(synthesis, slotLabel(preset.aggregator), preset.reference_models || []);

  // Build tool-use history with MoA guidance at the END (KV-cache optimization)
  // Not prepended as a system message — that would diverge the prompt prefix
  // on every tool iteration and destroy cache reuse.
  const toolHistoryMessages = inputMessages.filter(m => m.role !== 'system');
  if (wrappedGuidance) attachReferenceGuidance(toolHistoryMessages, wrappedGuidance);

  if (tools && toolsFn) {
    const toolResult = await toolsFn(presetName, toolHistoryMessages, tools);
    return {
      response: synthesis || referenceOutputs.map(([l, t]) => `[${l}]: ${t}`).join('\n'),
      references: referenceOutputs.map(([label, text]) => ({ label, text })),
      preset: presetName,
      aggregator: slotLabel(preset.aggregator),
      toolResult
    };
  }
  return {
    response: synthesis || referenceOutputs.map(([l, t]) => `[${l}]: ${t}`).join('\n'),
    references: referenceOutputs.map(([label, text]) => ({ label, text })),
    preset: presetName,
    aggregator: slotLabel(preset.aggregator)
  };
}

// ─── Config management ────────────────────────────────────────────────────────

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

module.exports = {
  runMoA, runMoAWithTools,
  listPresets, getPreset, savePreset, deletePreset,
  trimForReference,     // exported for testing
  wrapAggregatorOutput, // exported for testing
};
