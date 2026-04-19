# Hive Nation Model Preferences

## Complete Model Stack

### 1. MiniMax M2.7 🏆 PRIMARY
**Provider**: MiniMax API
**Why Primary**: Best real-world agent performance + generous quota

```
export MINIMAX_API_KEY="sk-cp-..."
```

| Property | Value |
|----------|-------|
| **Best For** | General agents, research, orchestration |
| **SWE-bench** | 73.8% 🏆 |
| **MMLU** | 81.5% |
| **Speed** | ⚡⚡⚡⚡⚡ Fast API |
| **Quality** | 🧠🧠🧠🧠🧠 |
| **Cost** | 💰💰 Generous quota + credits |
| **Context** | 256K tokens |

**Use When**: General tasks, agents, research, coding, orchestration

---

### 2. Qwen 3.6 35B A3B
**Provider**: Local (Windows PC via LM Link)
**Why**: Terminal-Bench + GPQA leader, free local inference

```
export LM_LINK_URL="http://100.116.54.125:1234"
export LM_LINK_KEY="sk-lm-..."
```

| Property | Value |
|----------|-------|
| **Best For** | Terminal/CLI, graduate reasoning |
| **Terminal-Bench** | 61.6% 🏆 LEADER |
| **GPQA Diamond** | 90.4% 🏆 LEADER |
| **Speed** | ⚡⚡⚡⚡⚡ ~158 tok/s |
| **Cost** | 💰💰💰💰💰 Free (uses PC GPU) |

**Use When**: CLI tasks, local free inference, graduate-level reasoning

---

### 3. Google Gemma 4 26B A4B
**Provider**: Local (Mac via LM Studio)
**Why**: Native vision, Android tool-calling trained

```
export LM_STUDIO_URL="http://localhost:1234"
```

| Property | Value |
|----------|-------|
| **Best For** | Vision, Android dev, privacy tasks |
| **Vision** | Native multimodal |
| **Android** | Tool-calling trained 🏆 |
| **Speed** | ⚡⚡⚡ ~50 tok/s |
| **Cost** | 💰💰💰💰💰 Free (uses Mac RAM/GPU) |

**Use When**: Screenshots, Android automation, privacy-sensitive tasks

---

### 4. Kimi K2.5
**Provider**: Kimi/Moonshot API
**Why**: Top-tier vision + coding

```
export KIMI_API_KEY="sk-kimi-..."
```

| Property | Value |
|----------|-------|
| **Best For** | Vision analysis, screenshots, code |
| **HumanEval** | 99% 🏆 |
| **Speed** | ⚡⚡⚡⚡ |
| **Quality** | 🧠🧠🧠🧠🧠 |

**Use When**: Complex vision, high-quality code review

---

### 5. ChatGPT gpt-5.4
**Provider**: OpenAI OAuth (Duckets subscription)
**Why**: Best premium reasoning

| Property | Value |
|----------|-------|
| **Best For** | Complex reasoning, premium tasks |
| **Quality** | 🧠🧠🧠🧠🧠 Best reasoning |
| **Speed** | ⚡⚡⚡ |
| **Cost** | Included in subscription |

**Use When**: Maximum quality reasoning, complex decisions

---

## Model Routing

### By Task Type

| Task | Model | Provider |
|------|-------|---------|
| **General Agents** | MiniMax M2.7 🏆 | API |
| **Research** | MiniMax M2.7 | API |
| **Coding** | MiniMax M2.7 | API |
| **Vision/Screenshots** | Kimi K2.5 | API |
| **Complex Reasoning** | gpt-5.4 | OAuth |
| **Terminal/CLI** | Qwen 3.6 35B A3B | Local |
| **Graduate Reasoning** | Qwen 3.6 35B A3B | Local |
| **Android Control** | Gemma 4 26B A4B | Local |
| **Privacy Tasks** | Gemma 4 26B A4B | Local |

### By Complexity

| Level | Model | Why |
|-------|-------|-----|
| 1-3 (Simple) | Qwen 3.6 A3B | Fast + free |
| 4-6 (Medium) | MiniMax M2.7 | Best balance |
| 7-10 (Complex) | gpt-5.4 | Premium reasoning |

---

## Fallback Chain

```
MiniMax M2.7 (API) 🏆 PRIMARY
    ↓ fail
Qwen 3.6 35B A3B (Local Windows)
    ↓ fail
Gemma 4 26B A4B (Local Mac)
    ↓ fail
Kimi K2.5 (API)
    ↓ fail
gpt-5.4 (OAuth)
```

---

## Quick Commands

```bash
# Test MiniMax M2.7 (Primary)
curl -X POST https://api.minimax.io/v1/chat/completions \
  -H "Authorization: Bearer $MINIMAX_API_KEY" \
  -d '{"model": "MiniMax-M2.7", "messages": [{"role": "user", "content": "Hello"}]}'

# Check Windows Qwen (LM Link)
curl http://100.116.54.125:1234/v1/models

# Check Mac Gemma (LM Studio)
curl http://localhost:1234/v1/models
```

---

## Benchmarks

| Model | SWE-bench | Terminal | GPQA | Notes |
|-------|-----------|----------|------|-------|
| **MiniMax M2.7** | **73.8%** 🏆 | 47.2% | ~85% | Best real-world feel |
| Qwen 3.6 A3B | ~70-74% | **61.6%** 🏆 | **90.4%** 🏆 | CLI leader |
| Gemma 4 26B | ~65% | ~45% | ~70% | Android trained |

**Remember**: Benchmarks are synthetic. Real-world use matters more.

---

Updated: 2026-04-19
