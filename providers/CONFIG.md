/**
 * @file CONFIG.md
 * @description Configuration documentation for the AI Council Server providers.
 */

# Provider Configuration

This file documents the required environment variables and configuration settings for the `ProviderManager` in `provider-adapter.js`.

## Environment Variables

The `ProviderManager` looks for these variables if they are not explicitly passed via a config object.

### LM Studio (Local)

| Variable | Description | Default/Example |
|----------|-------------|----------------|
| `LM_STUDIO_BASE_URL` | The base URL for the LM Studio API. | `http://100.68.208.113:1234/v1` |
| `LM_STUDIO_API_KEY` | Bearer token for authentication. | `sk-lm-xWvfQHZF:L8P76SQakhEA95U8DDNf` |

### Model Token Budgets (Enforced via Adapter)

To prevent context overflow during multi-stage council deliberation, the adapter automatically applies these character/token limits:

| Model Profile | Max Character Budget (Proxy for Tokens) |
|----------------|-----------------------------------------|
| `qwen3.6-3el-35b-a3b` | 100,000 chars |
| `qwen3.5-27b`, `gemma-4-26b-a4b`, etc. | 24,000 chars |
| `qwen3.5-0.8b` | 6,000 chars |

## Usage Example (Node.js)

```javascript
const { ProviderManager } = require('./provider-adapter');

const manager = new ProviderManager();
manager.registerProvider('lmstudio', {
  baseUrl: process.env.LM_STUDION_BASE_URL,
  apiKey: process.env.LM_STUDIO_API_KEY,
  models: ['qwen3.6-35b-a3b', 'gwen3.5-0.8b']
});

const result = await manager.call('lmstudio', [{role: 'user', content: 'hi'}], 'qwen3.6-35b-a3b');
console.log(result.content);
```
