# 👁️ Hive Vision — Multi-Model Vision System

## Overview

Hive Vision provides comprehensive vision capabilities using the best vision models. Analyze screenshots, documents, plants, charts, and more with automatic model selection.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HIVE VISION                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   📸 IMAGE ──► 🎯 PROMPT ──► 🧠 VISION MODEL ──► 💬 ANALYSIS      │
│                                                                     │
│   Models:                                                           │
│   ├── Kimi K2.5 (256K ctx, best coding/screenshots)                 │
│   ├── GPT-5.4 Vision (128K, premium reasoning)                      │
│   ├── MiniMax VL (100K, fast, generous)                             │
│   ├── Qwen2.5-VL (32K, local, free)                                │
│   └── Gemini 2.0 (1M ctx, fast multimodal)                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Capture and analyze screen
./scripts/hive-vision.sh screen-analyze "What windows are open?"

# Analyze an image
./scripts/hive-vision.sh analyze /path/to/image.jpg "Describe this"

# Plant/grow analysis (specialized)
./scripts/hive-vision.sh growth /path/to/plant.jpg

# Chart analysis
./scripts/hive-vision.sh chart /path/to/chart.png

# Compare two images
./scripts/hive-vision.sh compare image1.jpg image2.jpg
```

## Vision Models

| Model | Context | Best For | Cost |
|-------|---------|----------|------|
| **Kimi K2.5** | 256K | Screenshots, code, documents | Pay-per-use |
| **GPT-5.4 Vision** | 128K | Complex reasoning, charts, medical | Subscription |
| **MiniMax VL** | 100K | Fast general analysis | Generous |
| **Qwen2.5-VL** | 32K | Local, privacy, free | Free |
| **Gemini 2.0** | 1M | Long documents, fast | Free tier |

## Preset Analyses

### 🌿 Plant/Grow Analysis
```bash
./scripts/hive-vision.sh growth /path/to/plant.jpg
```
Analyzes:
- Plant health (color, vigor, stress)
- Environmental conditions
- Growth stage
- Issues (pests, deficiencies)
- Recommendations

### 📊 Chart/Graph Analysis
```bash
./scripts/hive-vision.sh chart /path/to/chart.png
```
Extracts:
- Chart type and data
- Key trends and patterns
- Notable data points
- Specific numbers

### 📄 Document Analysis
```bash
./scripts/hive-vision.sh document /path/to/doc.pdf
```
Extracts:
- Document type
- Key information
- Important details
- Full text content

### 🧾 Receipt Extraction
```bash
./scripts/hive-vision.sh receipt /path/to/receipt.jpg
```
Extracts:
- Vendor name
- Date/time
- Items with prices
- Total amount

### 💻 Code Screenshot Analysis
```bash
./scripts/hive-vision.sh analyze screenshot.png "What bugs do you see?"
```
Analyzes:
- Programming language
- Code functionality
- Potential issues
- Improvement suggestions

### 🏠 Room Analysis
```bash
./scripts/hive-vision.sh analyze room.jpg "Describe the layout"
```
Describes:
- Room type and features
- Layout and lighting
- Notable objects
- Overall assessment

## API Integration

```javascript
const { HiveVision } = require('./scripts/hive-vision');

// Initialize
const vision = new HiveVision();

// Analyze any image
const { result } = await vision.analyze('/path/to/image.jpg', 'Describe this');

// Capture and analyze screen
const { result } = await vision.analyzeScreen('What is this app?');

// Specialized analysis
const { result } = await vision.analyzeGrowth('/path/to/plant.jpg');
const { result } = await vision.analyzeChart('/path/to/graph.png');

// Batch analyze
const results = await vision.analyzeBatch(['img1.jpg', 'img2.jpg'], 'Describe each');

// Compare images
const { result } = await vision.compare('before.jpg', 'after.jpg', 'What changed?');
```

## Environment Variables

```bash
# Recommended (best quality)
export KIMI_API_KEY="sk-kimi-..."

# Optional alternatives
export OPENAI_API_KEY="sk-..."
export MINIMAX_API_KEY="sk-..."
export GEMINI_API_KEY="..."
export LMSTUDIO_KEY="sk-lm-..."  # For local Qwen VL
```

## Auto-Model Selection

Hive Vision automatically selects the best model based on your prompt:

| Prompt Contains | Model Selected |
|----------------|----------------|
| screenshot, screen, ui | Kimi K2.5 |
| document, pdf, receipt | Kimi K2.5 |
| chart, graph, data | GPT-5.4 |
| medical, xray | GPT-5.4 |
| plant, leaf, grow | Kimi K2.5 |
| local, privacy, offline | Qwen VL |
| fast, quick | Gemini 2.0 |

## Screenshot Directory

All captures saved to: `/tmp/hive-vision/`
- `screen_TIMESTAMP.png` — Screen captures
- `webcam_TIMESTAMP.jpg` — Webcam captures
- `results/analysis_TIMESTAMP.json` — Analysis results

## Batch Processing

```bash
# Analyze multiple images
./scripts/hive-vision.sh batch img1.jpg img2.jpg img3.jpg "Describe each"

# Compare before/after
./scripts/hive-vision.sh compare before.jpg after.jpg "What improved?"
```

## Vision in Hive Mind

Vision integrates with the Hive Mind for coordinated analysis:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HIVE MIND + VISION                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   📸 Screenshot ──► 👁️ Hive Vision ──► 🏛️ AI Council          │
│                                                                     │
│   Use Case:                                                        │
│   1. Capture screen showing bug                                     │
│   2. Vision analyzes and identifies issue                          │
│   3. Council debates best fix                                      │
│   4. Coder agent implements solution                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Capabilities

| Capability | Description |
|------------|-------------|
| **Screen Capture** | macOS screencapture, imagesnap |
| **Webcam Capture** | imagesnap with camera selection |
| **Image Analysis** | Multi-model vision analysis |
| **Batch Processing** | Analyze multiple images |
| **Image Comparison** | Side-by-side comparison |
| **Preset Analyses** | Growth, chart, document, receipt |
| **Auto-Model Select** | Best model for task |
| **Local Model** | Qwen VL via LM Studio |

## Status

Added: 2026-04-19
Version: 1.0.0
Models: Kimi K2.5, GPT-5.4, MiniMax VL, Qwen VL, Gemini 2.0
