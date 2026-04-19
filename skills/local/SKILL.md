# 🏠 Hive Local — Unified Local AI Stack

## Overview

Hive Local provides **complete offline AI capabilities** using your local machine. No cloud required for most tasks.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HIVE LOCAL                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   🤖 LM STUDIO          🎤 VOICE              🌐 SEARCH             │
│   ├── Qwen 3.6          ├── Whisper (STT)     ├── DuckDuckGo        │
│   ├── Llama 3.3         └── macOS say (TTS)   ├── Brave Search      │
│   ├── Mistral           📷 VISION              └── GitHub CLI        │
│   ├── Gemma 4           ├── Qwen VL            💾 FILES              │
│   └── Custom models     ├── LLaVA              ├── Find files       │
│                          └── Local analysis    └── Grep search       │
│                                                                     │
│   100% LOCAL — NO API KEYS REQUIRED FOR BASIC TASKS                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Check LM Studio is running
./scripts/hive-local.sh lm-status

# Chat with local model
./scripts/hive-local.sh chat "Explain quantum computing"

# Transcribe audio
./scripts/hive-local.sh transcribe recording.mp3

# Web search
./scripts/hive-local.sh search "AI news today"

# GitHub search
./scripts/hive-local.sh gh-search "rust async web framework"
```

## LM Studio — Local Model Inference

### Setup
1. Download [LM Studio](https://lmstudio.ai/)
2. Download a model (Qwen 3.6, Llama 3.3, etc.)
3. Enable "AI Router" or "Local Server" mode
4. Models available at `http://localhost:1234`

### Supported Models

| Model | Context | Best For | Size |
|-------|---------|----------|------|
| Qwen 3.6 35B | 128K | Reasoning, coding | 20GB |
| Llama 3.3 70B | 128K | General | 40GB |
| Mistral 7B | 32K | Fast, efficient | 4GB |
| Gemma 4 27B | 32K | Android, vision | 16GB |
| Qwen2.5-Coder | 32K | Code-specific | 7GB |

### Environment Variables
```bash
export LMSTUDIO_URL="http://localhost:1234"
export LMSTUDIO_KEY="sk-lm-studio"  # Local key
```

### Usage
```bash
# Check status
./scripts/hive-local.sh lm-status

# Chat
./scripts/hive-local.sh chat "Write a Python function"

# Complete
./scripts/hive-local.sh complete "The meaning of life is"

# Embeddings
node -e "
const { HiveLocal } = require('./scripts/hive-local');
const local = new HiveLocal();
local.lmStudioEmbeddings('Hello world').then(console.log);
"
```

## Vision — Local Image Understanding

### Local Options

#### Qwen VL (via LM Studio)
```bash
# Load qwen2.5-vl in LM Studio
# Then analyze locally
./scripts/hive-local.sh analyze photo.jpg "What is this?"
```

#### LLaVA (via LM Studio)
```bash
# Load llava in LM Studio
# Local vision without cloud
```

### Cloud Fallback
If local vision fails, automatically falls back to:
- Kimi K2.5 (screenshots, code)
- GPT-5.4 (complex reasoning)
- MiniMax VL (fast)

## Voice — Speech Recognition & TTS

### Speech to Text (Whisper)

#### Install
```bash
# macOS
brew install whisper

# First run downloads model (~1GB)
```

#### Usage
```bash
# Basic transcription
./scripts/hive-local.sh transcribe recording.mp3

# With specific model
WHISPER_MODEL=medium ./scripts/hive-local.sh transcribe long-audio.m4a

# Timestamps
node -e "
const { HiveLocal } = require('./scripts/hive-local');
const local = new HiveLocal();
local.transcribeWithTimestamps('audio.wav').then(console.log);
"
```

### Text to Speech (macOS)

Uses built-in macOS `say` command — no internet required!

```bash
# Simple TTS
./scripts/hive-local.sh tts "Hello from Hive Local"

# Voice options (macOS voices)
say -v Samantha "Hello"  # US Female
say -v Alex "Hello"      # US Male
say -v Daniel "Hello"    # UK Male
```

## Web Search

### DuckDuckGo (Default)
```bash
./scripts/hive-local.sh search "latest AI developments"
```

### Brave Search
```bash
# Set API key
export BRAVE_API_KEY="your-key-here"

./scripts/hive-local.sh search "weather forecast" --engine brave
```

### Local Index
```bash
# Search previously indexed pages
./scripts/hive-local.sh search "quantum" --engine local
```

## GitHub Integration

Requires `gh` CLI:
```bash
# Install
brew install gh

# Authenticate
gh auth login
```

### Search Repositories
```bash
./scripts/hive-local.sh gh-search "react typescript template"
```

### Search Code
```bash
./scripts/hive-local.sh gh-search "useState hook" --type code
```

### Repo Info
```javascript
const { HiveLocal } = require('./scripts/hive-local');
const local = new HiveLocal();

local.githubRepoInfo('facebook', 'react');
local.githubIssues('facebook', 'react', { state: 'open', limit: 20 });
```

## File Search

### Find Files
```bash
./scripts/hive-local.sh find ~/projects "*.js"
./scripts/hive-local.sh find /tmp "*.json"
```

### Grep Search
```bash
./scripts/hive-local.sh grep ~/projects "function"
./scripts/hive-local.sh grep . "TODO" --extension md
```

## Integration with Hive Vision

```javascript
// Vision with local fallback
const { HiveVision } = require('./scripts/hive-vision');
const { HiveLocal } = require('./scripts/hive-local');

const vision = new HiveVision();
const local = new HiveLocal();

// Try local first
const localResult = await local.analyzeImageLocal('photo.jpg', 'Describe this');

// Fall back to cloud if needed
if (localResult.provider === 'fallback') {
    const cloudResult = await vision.analyze('photo.jpg', 'Describe this');
}
```

## API Reference

```javascript
const { HiveLocal } = require('./scripts/hive-local');

// Initialize
const local = new HiveLocal({
    lmStudioUrl: 'http://localhost:1234',
    workspace: '/tmp/hive-local'
});

// LM Studio
await local.lmStudioStatus();
await local.lmStudioChat(messages);
await local.lmStudioComplete(prompt);
await local.lmStudioEmbeddings(text);

// Vision
await local.analyzeImageLocal(imagePath, prompt);

// Voice
await local.transcribe(audioPath);
await local.transcribeWithTimestamps(audioPath);
await local.tts(text);

// Search
await local.search(query, { engine: 'duckduckgo' });
await local.githubSearch(query);
await local.searchFiles(directory, pattern);
await local.grepSearch(directory, pattern);

// GitHub
await local.githubRepoInfo(owner, repo);
await local.githubIssues(owner, repo, options);
```

## Capabilities Matrix

| Feature | Local | Cloud Fallback | Notes |
|---------|-------|----------------|-------|
| Chat/Complete | ✅ LM Studio | ✅ API | Local preferred |
| Vision | ✅ Qwen VL | ✅ Kimi/GPT | Cloud for best |
| STT | ✅ Whisper | ✅ Cloud | Whisper is great |
| TTS | ✅ macOS say | ✅ MiniMax | Local is instant |
| Web Search | ✅ DuckDuckGo | ✅ Brave | Local scraping |
| GitHub | ✅ gh CLI | ❌ | Needs gh installed |
| File Search | ✅ find/grep | N/A | Always local |

## Requirements

### Optional (for full local)
- [LM Studio](https://lmstudio.ai/) — Local model inference
- [Whisper](https://github.com/openai/whisper) — Speech recognition
- [gh CLI](https://cli.github.com/) — GitHub CLI
- [ddgr](https://github.com/jarun/ddgr/) — DuckDuckGo CLI

### Always Available
- macOS `say` — Text to speech
- `find`/`grep` — File search
- Shell — Everything else

## Configuration

```bash
# LM Studio
export LMSTUDIO_URL="http://localhost:1234"
export LMSTUDIO_KEY="sk-lm-studio"

# Whisper
export WHISPER_MODEL="base"  # base, small, medium, large

# Brave Search (optional)
export BRAVE_API_KEY="your-key"

# TTS Voice
export VOICE="Samantha"  # macOS voice name
```

## Status

Added: 2026-04-19
Version: 1.0.0
Dependencies: LM Studio (optional), Whisper (optional), gh CLI (optional)
