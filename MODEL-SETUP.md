# Model Configuration Template

**EDIT THIS FILE TO CONFIGURE YOUR MODELS**

Copy this to your own config and update with your API keys and model names.

---

## Quick Start

1. Copy this file as `config/my-models.json`
2. Edit with your providers/API keys
3. Point your scripts to use it

---

## Model Slots

| Slot | Purpose | Notes |
|------|---------|-------|
| **MODEL_1** | Primary agent | Your main model |
| **MODEL_2** | Local/fast | Free inference |
| **MODEL_3** | Vision | Screenshots/images |
| **MODEL_4** | Reasoning | Complex analysis |
| **MODEL_5** | Coding | Code-focused tasks |

---

## Environment Setup

Create `.env` file with your API keys:

```bash
# Required - at least one
PRIMARY_API_KEY=sk-your-key-here

# Optional - based on your models
VISION_API_KEY=sk-your-key-here
REASONING_API_KEY=sk-your-key-here

# Local models
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_KEY=sk-local-key
LM_LINK_URL=http://localhost:1234
LM_LINK_KEY=sk-local-key

# Windows LM Link (example IP)
WINDOWS_LM_LINK=http://192.168.1.100:1234
```

---

## Model Configuration

Edit `config/models.json`:

```json
{
  "models": [
    {
      "id": "MODEL_1",
      "name": "Your Primary Model",
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "$PRIMARY_API_KEY",
      "endpoint": "https://api.openai.com/v1/chat/completions",
      "enabled": true,
      "bestFor": ["general", "agents"],
      "context": 128000
    }
  ]
}
```

---

## Provider Setup

### OpenAI
```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "endpoint": "https://api.openai.com/v1/chat/completions"
}
```

### Anthropic
```json
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet",
  "endpoint": "https://api.anthropic.com/v1/messages",
  "apiKey": "$ANTHROPIC_API_KEY"
}
```

### Local (LM Studio)
```json
{
  "provider": "lmstudio",
  "model": "qwen3.5-9b",
  "endpoint": "http://localhost:1234/v1",
  "apiKey": "lm-studio"
}
```

### Local (LM Link - Windows)
```json
{
  "provider": "lmlink",
  "model": "qwen3.6-35b",
  "endpoint": "http://192.168.1.100:1234/v1",
  "apiKey": "lm-link-key"
}
```

### MiniMax
```json
{
  "provider": "minimax",
  "model": "MiniMax-M2.7",
  "endpoint": "https://api.minimax.io/v1/chat/completions",
  "apiKey": "$MINIMAX_API_KEY"
}
```

### Kimi/Moonshot
```json
{
  "provider": "kimi",
  "model": "moonshot-v1-8k",
  "endpoint": "https://api.moonshot.cn/v1/chat/completions",
  "apiKey": "$KIMI_API_KEY"
}
```

---

## Model Compatibility

| Model | Provider | Best For | Notes |
|-------|----------|----------|-------|
| GPT-4o | OpenAI | Everything | Strong all-rounder |
| Claude 3.5 | Anthropic | Reasoning | Best for analysis |
| Gemini 1.5 | Google | Vision | Good multimodal |
| Llama 3 | Local | Free inference | Need enough RAM |
| Qwen 3 | Local | CLI/Terminal | Fast, good reasoning |
| Mistral | Local | Balanced | Good for local |

---

## Testing Your Setup

```bash
# Test primary model
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $PRIMARY_API_KEY" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "test"}]}'

# Test LM Studio
curl http://localhost:1234/v1/models

# Test local model chat
curl -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen3.5-9b", "messages": [{"role": "user", "content": "test"}]}'
```

---

Updated: 2026-04-19