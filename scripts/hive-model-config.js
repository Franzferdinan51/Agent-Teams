#!/usr/bin/env node
/**
 * Hive Model Config Loader
 * 
 * Loads model configuration and provides easy access to:
 * - Model endpoints
 * - API keys (from environment)
 * - Routing rules
 * 
 * Usage:
 *   const { getModel, getEndpoint, getConfig } = require('./hive-model-config.js');
 *   getModel('PRIMARY')  // Returns primary model config
 */

const fs = require('fs');
const path = require('path');

// Load config (user's config takes priority)
function loadConfig() {
    const configPaths = [
        path.join(__dirname, 'config', 'models.json'),
        path.join(__dirname, 'config', 'local-models.json'),
        path.join(process.env.HOME, '.hive-models.json')
    ];
    
    for (const configPath of configPaths) {
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                console.log(`✓ Loaded config from: ${configPath}`);
                return config;
            }
        } catch (e) {
            // Try next path
        }
    }
    
    console.log('⚠ No config found, using defaults');
    return getDefaults();
}

function getDefaults() {
    return {
        models: {
            PRIMARY: {
                name: 'GPT-4o',
                provider: 'openai',
                model: 'gpt-4o',
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: process.env.OPENAI_API_KEY || '',
                enabled: true,
                context: 128000,
                speed: 'fast',
                cost: 'medium',
                bestFor: ['general', 'agents', 'research']
            },
            FAST_LOCAL: {
                name: 'Local Model',
                provider: 'lmstudio',
                model: 'qwen3.5-9b',
                endpoint: 'http://localhost:1234/v1',
                apiKey: 'lm-studio',
                enabled: true,
                context: 32000,
                speed: 'very-fast',
                cost: 'free',
                bestFor: ['quick-tasks', 'local-inference']
            },
            VISION: {
                name: 'Vision Model',
                provider: 'openai',
                model: 'gpt-4o',
                endpoint: 'https://api.openai.com/v1/chat/completions',
                apiKey: process.env.OPENAI_API_KEY || '',
                enabled: true,
                context: 128000,
                speed: 'fast',
                cost: 'medium',
                bestFor: ['screenshots', 'images']
            }
        },
        routing: {
            default: 'PRIMARY',
            fallbackChain: ['PRIMARY', 'FAST_LOCAL']
        }
    };
}

const config = loadConfig();

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get a specific model config
 */
function getModel(modelId) {
    const model = config.models?.[modelId];
    if (!model) {
        console.log(`⚠ Model ${modelId} not found`);
        return null;
    }
    
    // Resolve API key from env
    const resolvedModel = { ...model };
    if (resolvedModel.apiKey?.startsWith('$')) {
        const envKey = resolvedModel.apiKey.slice(1);
        resolvedModel.apiKey = process.env[envKey] || '';
    }
    
    return resolvedModel;
}

/**
 * Get endpoint for a model
 */
function getEndpoint(modelId) {
    const model = getModel(modelId);
    return model?.endpoint || 'https://api.openai.com/v1/chat/completions';
}

/**
 * Get all enabled models
 */
function getEnabledModels() {
    const enabled = [];
    for (const [id, model] of Object.entries(config.models || {})) {
        if (model.enabled !== false) {
            enabled.push({ id, ...model });
        }
    }
    return enabled;
}

/**
 * Get model for task type
 */
function getModelForTask(taskType) {
    const routing = config.routing?.byTask || {};
    const modelId = routing[taskType] || config.routing?.default || 'PRIMARY';
    return getModel(modelId);
}

/**
 * Get fallback chain
 */
function getFallbackChain() {
    return config.routing?.fallbackChain || ['PRIMARY', 'FAST_LOCAL'];
}

/**
 * Get routing config
 */
function getConfig() {
    return config;
}

/**
 * List all models (for CLI)
 */
function listModels() {
    console.log('\n' + '='.repeat(60));
    console.log('HIVE MODEL CONFIGURATION');
    console.log('='.repeat(60));
    
    for (const [id, model] of Object.entries(config.models || {})) {
        const status = model.enabled === false ? '❌ DISABLED' : '✅ ENABLED';
        console.log(`\n[${id}] ${model.name} ${status}`);
        console.log(`   Provider: ${model.provider}`);
        console.log(`   Model: ${model.model}`);
        console.log(`   Endpoint: ${model.endpoint}`);
        console.log(`   Speed: ${model.speed} | Cost: ${model.cost}`);
        console.log(`   Best for: ${model.bestFor?.join(', ') || 'general'}`);
    }
    
    console.log('\n' + '-'.repeat(60));
    console.log(`Default: ${config.routing?.default}`);
    console.log(`Fallback: ${getFallbackChain().join(' → ')}`);
}

// CLI
const cmd = process.argv[2];

if (cmd === 'list') {
    listModels();
} else if (cmd === 'get') {
    const model = getModel(process.argv[3]);
    console.log(model);
} else if (cmd === 'task') {
    const model = getModelForTask(process.argv[3]);
    console.log(model);
} else if (cmd === 'endpoints') {
    console.log('\n📡 AVAILABLE ENDPOINTS:');
    for (const [name, url] of Object.entries(config.endpoints || {})) {
        console.log(`   ${name}: ${url}`);
    }
} else {
    console.log(`
Hive Model Config Loader

  list              Show all configured models
  get <modelId>     Get specific model config
  task <type>       Get model for task type
  endpoints         Show available endpoints

Usage in code:
  const { getModel, getEndpoint } = require('./hive-model-config');
  const model = getModel('PRIMARY');
  const endpoint = getEndpoint('VISION');
`);
}

module.exports = {
    getModel,
    getEndpoint,
    getEnabledModels,
    getModelForTask,
    getFallbackChain,
    getConfig,
    listModels
};