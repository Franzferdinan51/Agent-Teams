# Hive Nation Model Preferences

## Optimized Local Models

### Qwen 3.6 35B A3B (Unsloth, via LM Link)
**Location**: Windows PC (RTX 5060 Ti, 128GB RAM)

```bash
# LM Link endpoint
export LM_LINK_URL="http://100.116.54.125:1234"
export LM_LINK_KEY="sk-lm-..."
```

**Best For**:
- Terminal/CLI tasks (Terminal-Bench leader — 61.6%)
- Graduate-level reasoning (GPQA Diamond — 90.4%)
- Agentic tool use (MCPMark — 48.2%)
- Fast local inference (~158 tok/s)
- Complex reasoning tasks

**Speed Tier**: ⚡⚡⚡⚡⚡ (fastest local)
**Quality Tier**: 🧠🧠🧠🧠 (excellent reasoning)
**Cost**: 💰💰💰💰💰 (free, uses PC GPU)

---

### Google Gemma 4 26B A4B (via LM Studio, Mac)
**Location**: Mac mini (Apple Silicon)

```bash
# LM Studio endpoint  
export LM_STUDIO_URL="http://localhost:1234"
```

**Best For**:
- Local vision tasks (native multimodal)
- Android development (Gemma trained for tool-calling)
- Privacy-sensitive tasks (runs locally)
- Medium-complexity coding
- Fast local Q&A

**Speed Tier**: ⚡⚡⚡ (moderate)
**Quality Tier**: 🧠🧠🧠🧠 (excellent for size)
**Cost**: 💰💰💰💰💰 (free, uses Mac RAM/GPU)

---

## Cloud Models (API)

### MiniMax M2.7 (Primary)
**Provider**: MiniMax API
**Best For**: General agents, research, complex orchestration
**Speed**: ⚡⚡⚡⚡⚡
**Quality**: 🧠🧠🧠🧠🧠
**Quota**: Generous + credits available

### Kimi K2.5 (Vision + Coding)
**Provider**: Kimi/Moonshot API
**Best For**: Vision analysis, screenshots, code review
**Speed**: ⚡⚡⚡⚡
**Quality**: 🧠🧠🧠🧠🧠
**Benchmark**: HumanEval 99%

### ChatGPT gpt-5.4 (Premium Reasoning)
**Provider**: OpenAI OAuth (Duckets subscription)
**Best For**: Complex reasoning, premium tasks
**Speed**: ⚡⚡⚡
**Quality**: 🧠🧠🧠🧠🧠 (best reasoning)

---

## Model Routing Rules

### By Task Type

| Task | Preferred Model | Provider |
|------|----------------|---------|
| **Vision / Screenshots** | Kimi K2.5 | API |
| **Research / Docs** | MiniMax M2.7 | API |
| **Coding** | MiniMax M2.7 or Gemma 4 26B | API or Local |
| **Complex Reasoning** | gpt-5.4 | OAuth |
| **Terminal / CLI** | Qwen 3.6 35B A3B | Local (Windows) |
| **Android Control** | Gemma 4 26B A4B | Local (Mac) |
| **Local Fast Q&A** | Qwen 3.6 35B A3B | Local (Windows) |
| **Privacy Tasks** | Gemma 4 26B A4B | Local (Mac) |
| **Gaming** | MiniMax M2.7 | API |

### By Complexity

| Complexity | Model | Why |
|-----------|-------|-----|
| 1-3 (Simple) | Qwen 3.6 35B A3B | Fast, free, local |
| 4-6 (Medium) | MiniMax M2.7 | Good balance |
| 7-10 (Complex) | gpt-5.4 | Best reasoning |

---

## Optimization Tips

### Qwen 3.6 35B A3B
- **Format**: Standard GGUF (Q4_K_M from Unsloth)
- **No TQ3**: TQ3 requires special CUDA kernels, no Metal on Mac
- **Through LM Link**: Use `sk-lm-...` key for local inference
- **Batch size**: Larger batches better throughput
- **Context**: 32K native, extendable to 128K

### Gemma 4 26B A4B
- **Format**: A4B (Apple optimized)
- **Via LM Studio**: Mac-native Metal acceleration
- **Vision**: Native multimodal, no extra vision encoder needed
- **Android tool-calling**: Gemma trained specifically for this
- **Memory**: Uses ~20GB RAM for 26B model

---

## Fallback Chain

```
Primary → MiniMax M2.7 (API)
    ↓ fail
Secondary → Qwen 3.6 35B A3B (Local Windows)
    ↓ fail
Tertiary → Gemma 4 26B A4B (Local Mac)
    ↓ fail
Emergency → Kimi K2.5 (API)
    ↓ fail
Final → gpt-5.4 (OAuth)
```

---

## Quick Reference

```bash
# Check LM Link (Windows Qwen)
curl http://100.116.54.125:1234/v1/models

# Check LM Studio (Mac Gemma)
curl http://localhost:1234/v1/models

# Test Qwen 3.6
curl -X POST http://100.116.54.125:1234/v1/chat/completions \
  -H "Authorization: Bearer sk-lm-..." \
  -d '{"model": "qwen3.6-35b-a3b", "messages": [{"role": "user", "content": "Hello"}]}'

# Test Gemma 4
curl -X POST http://localhost:1234/v1/chat/completions \
  -d '{"model": "gemma-4-26b-a4b", "messages": [{"role": "user", "content": "Hello"}]}'
```

---

## Model Benchmarks

| Model | SWE-bench | Terminal-Bench | GPQA | Speed |
|-------|------------|----------------|------|-------|
| Qwen 3.6 35B A3B | ~70-74% | **61.6% 🏆** | **90.4% 🏆** | 158 tok/s |
| Gemma 4 26B A4B | ~65% | ~45% | ~70% | ~50 tok/s |
| MiniMax M2.7 | **73.8%** | 47.2% | ~85% | 150 tok/s |

**Note**: Benchmarks are synthetic. Real-world use matters more — MiniMax M2.7 "feels smarter" than scores suggest.

---

Updated: 2026-04-19
