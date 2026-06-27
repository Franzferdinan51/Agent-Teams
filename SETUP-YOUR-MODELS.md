# Hive Nation — Your Models Setup

**Follow this guide to configure YOUR models, not ours.**

---

## Quick Setup (5 minutes)

### 1. Copy the template

```bash
cp config/models.json config/my-models.json
```

### 2. Edit your models

```bash
nano config/my-models.json
```

Fill in:
- Your API keys (from env or directly)
- Your model names
- Your endpoints
- Set `enabled: true` for models you have

### 3. Test your setup

```bash
node scripts/hive-model-config.js list
```

You should see YOUR models, not ours.

---

## Configuration Options

### API Keys

**Option A: Environment variables (recommended)**

```json
"apiKey": "$OPENAI_API_KEY"
```

Set in your shell:
```bash
export OPENAI_API_KEY=sk-your-key-here
```

**Option B: Direct in config**

```json
"apiKey": "sk-your-key-here"
```

**Option C: Local models (no API key)**

```json
"apiKey": "lm-studio"
```

---

### Providers

| Provider | Endpoint | Notes |
|----------|----------|-------|
| `openai` | `https://api.openai.com/v1/chat/completions` | GPT-4o, etc |
| `anthropic` | `https://api.anthropic.com/v1/messages` | Claude |
| `minimax` | `https://api.minimax.io/v1/chat/completions` | MiniMax models |
| `kimi` | `https://api.moonshot.cn/v1/chat/completions` | Moonshot/Kimi |
| `lmstudio` | `http://localhost:1234/v1` | LM Studio local |
| `lmlink` | `http://192.168.1.x:1234/v1` | LM Link (Windows/remote) |

---

## Model Slots

### PRIMARY
Your main agent model for most tasks.

**Requirements**: Good all-rounder, fast, supports tool use.

**Examples**:
- `gpt-4o` (OpenAI)
- `claude-3-5-sonnet` (Anthropic)
- `MiniMax-M2.7` (MiniMax)
- `moonshot-v1-8k` (Kimi)

### FAST_LOCAL
Free local model for quick tasks.

**Requirements**: Runs on your machine, fast, low RAM usage.

**Examples**:
- `qwen3.5-9b` (Qwen, ~6GB RAM)
- `llama-3-8b` (Meta, ~5GB RAM)
- `mistral-7b` (Mistral, ~4GB RAM)

### VISION
For screenshots and image analysis.

**Requirements**: Native vision support.

**Examples**:
- `gpt-4o` (OpenAI)
- `claude-3-5-sonnet` (Anthropic)
- `gemini-1.5-flash` (Google)

### REASONING
Complex reasoning and analysis.

**Requirements**: Strong reasoning capabilities, large context.

**Examples**:
- `claude-3-5-sonnet` (Anthropic)
- `gpt-4o` (OpenAI)
- `gemini-1.5-pro` (Google)

### CODER
Code-focused tasks.

**Requirements**: Good at code, fast iteration.

**Examples**:
- `gpt-4o` (OpenAI)
- `claude-3-5-sonnet` (Anthropic)
- `claude-3-opus` (Anthropic, for complex refactoring)

---

## Local Model Setup

### LM Studio (Mac/Linux/Windows)

1. Download [LM Studio](https://lmstudio.ai/)
2. Download your model (e.g., Qwen 3.5 9B)
3. Start server (click "Start Server" button)
4. Default endpoint: `http://localhost:1234/v1`

Config:
```json
{
  "provider": "lmstudio",
  "model": "qwen3.5-9b",
  "endpoint": "http://localhost:1234/v1",
  "apiKey": "lm-studio"
}
```

### LM Link (Remote Windows PC)

1. Download [LM Studio](https://lmstudio.ai/) on Windows
2. Start server
3. Find Windows PC's IP address (e.g., `192.168.1.100`)
4. Update firewall to allow port 1234

Config:
```json
{
  "provider": "lmlink",
  "model": "qwen3.6-35b",
  "endpoint": "http://192.168.1.100:1234/v1",
  "apiKey": "lm-link",
  "enabled": true
}
```

---

## Testing

### Test API connectivity

```bash
# OpenAI
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "test"}]}'

# Anthropic
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -d '{"model": "claude-3-5-sonnet", "messages": [{"role": "user", "content": "test"}]}'

# LM Studio
curl http://localhost:1234/v1/models
```

### Test in Hive

```bash
node scripts/hive-model-config.js list
```

Should show your configured models.

---

## Troubleshooting

### "Model not found"
- Check API key is set
- Check endpoint is correct
- Check model name is exact (case-sensitive)

### "Connection refused" for local models
- Is LM Studio running?
- Is server started?
- Is port correct (default 1234)?
- Firewall allow incoming?

### "Invalid API key"
- Check key is correct
- Check env variable name matches ($YOUR_VAR)
- No extra spaces in key

---

## Example: Full Config

```json
{
  "models": {
    "PRIMARY": {
      "name": "GPT-4o",
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "$OPENAI_API_KEY",
      "endpoint": "https://api.openai.com/v1/chat/completions",
      "enabled": true,
      "context": 128000,
      "speed": "fast",
      "cost": "medium",
      "bestFor": ["general", "agents"]
    },
    "FAST_LOCAL": {
      "name": "Qwen 3.5 9B",
      "provider": "lmstudio",
      "model": "qwen3.5-9b",
      "apiKey": "lm-studio",
      "endpoint": "http://localhost:1234/v1",
      "enabled": true,
      "context": 32000,
      "speed": "very-fast",
      "cost": "free",
      "bestFor": ["quick-tasks", "local"]
    },
    "VISION": {
      "name": "Claude Vision",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet",
      "apiKey": "$ANTHROPIC_API_KEY",
      "endpoint": "https://api.anthropic.com/v1/messages",
      "enabled": true,
      "context": 200000,
      "speed": "fast",
      "cost": "high",
      "bestFor": ["screenshots", "images"]
    }
  },
  "routing": {
    "default": "PRIMARY",
    "byTask": {
      "vision": "VISION",
      "screenshot": "VISION",
      "quick": "FAST_LOCAL"
    }
  }
}
```

---

Updated: 2026-04-19