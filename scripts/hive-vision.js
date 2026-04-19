#!/usr/bin/env node
/**
 * Hive Vision — Multi-Model Vision Analysis System
 * Uses the best vision models for any task
 * 
 * Supported models:
 * - Kimi K2.5 (256K context, top-tier coding+vision)
 * - GPT-5.4 Vision (Premium reasoning)
 * - MiniMax M2.7 (Fast, generous quota)
 * - Qwen2.5-VL (Local, free via LM Studio)
 * - Gemini 2.0 (Strong multimodal)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Vision models configuration
const VISION_MODELS = {
    'kimi-k2.5': {
        provider: 'kimi',
        endpoint: 'https://api.moonshot.cn/v1/chat/completions',
        model: 'moonshot-vl-32k',
        apiKeyEnv: 'KIMI_API_KEY',
        strength: ['coding', 'documents', 'charts', 'screenshots'],
        context: '256K',
        cost: 'pay-per-use'
    },
    'gpt-5.4': {
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o',
        apiKeyEnv: 'OPENAI_API_KEY',
        strength: ['reasoning', 'complex', 'academic'],
        context: '128K',
        cost: 'subscription'
    },
    'minimax-m2.7': {
        provider: 'minimax',
        endpoint: 'https://api.minimax.chat/v1/chat/completions',
        model: 'MiniMax-VL-01',
        apiKeyEnv: 'MINIMAX_API_KEY',
        strength: ['fast', 'general', 'agents'],
        context: '100K',
        cost: 'generous'
    },
    'qwen-vl': {
        provider: 'lmstudio',
        endpoint: 'http://localhost:1234/v1/chat/completions',
        model: 'qwen2.5-vl-7b',
        apiKeyEnv: 'LMSTUDIO_KEY',
        strength: ['local', 'free', 'privacy'],
        context: '32K',
        cost: 'free'
    },
    'gemini-2.0': {
        provider: 'gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-vision:generateContent',
        apiKeyEnv: 'GEMINI_API_KEY',
        strength: ['fast', 'multimodal', 'reasoning'],
        context: '1M',
        cost: 'free-tier'
    }
};

class HiveVision {
    constructor(options = {}) {
        this.defaultModel = options.defaultModel || 'kimi-k2.5';
        this.visionDir = options.visionDir || '/tmp/hive-vision';
        this.resultsDir = path.join(this.visionDir, 'results');
        
        // Ensure directories exist
        if (!fs.existsSync(this.visionDir)) {
            fs.mkdirSync(this.visionDir, { recursive: true });
        }
        if (!fs.existsSync(this.resultsDir)) {
            fs.mkdirSync(this.resultsDir, { recursive: true });
        }
        
        console.log('👁️ Hive Vision initialized');
        this.listModels();
    }

    // ═══════════════════════════════════════════════════════════
    // MODEL MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    listModels() {
        console.log('\n📸 Available Vision Models:\n');
        
        for (const [name, config] of Object.entries(VISION_MODELS)) {
            const hasKey = !!process.env[config.apiKeyEnv];
            const status = hasKey ? '✅' : '❌';
            
            console.log(`  ${status} ${name.toUpperCase()}`);
            console.log(`     Provider: ${config.provider}`);
            console.log(`     Context: ${config.context}`);
            console.log(`     Strengths: ${config.strength.join(', ')}`);
            console.log('');
        }
    }

    selectBestModel(task) {
        const taskLower = task.toLowerCase();
        
        // Task-based routing
        if (taskLower.includes('screenshot') || taskLower.includes('screen') || taskLower.includes('ui')) {
            return 'kimi-k2.5'; // Best for coding screenshots
        }
        if (taskLower.includes('document') || taskLower.includes('pdf') || taskLower.includes('receipt')) {
            return 'kimi-k2.5';
        }
        if (taskLower.includes('chart') || taskLower.includes('graph') || taskLower.includes('data')) {
            return 'gpt-5.4'; // Best reasoning for data
        }
        if (taskLower.includes('medical') || taskLower.includes('xray') || taskLower.includes('diagnosis')) {
            return 'gpt-5.4'; // Complex reasoning
        }
        if (taskLower.includes('plant') || taskLower.includes('leaf') || taskLower.includes('grow')) {
            return 'kimi-k2.5'; // Good for nature/plants
        }
        if (taskLower.includes('local') || taskLower.includes('privacy') || taskLower.includes('offline')) {
            return 'qwen-vl';
        }
        if (taskLower.includes('fast') || taskLower.includes('quick')) {
            return 'gemini-2.0';
        }
        
        // Default to best available
        return this.defaultModel;
    }

    // ═══════════════════════════════════════════════════════════
    // IMAGE PROCESSING
    // ═══════════════════════════════════════════════════════════

    async captureScreen(outputPath) {
        const defaultPath = path.join(this.visionDir, `screen_${Date.now()}.png`);
        const savePath = outputPath || defaultPath;
        
        try {
            // Try macOS screencapture first
            execSync(`screencapture -x "${savePath}"`, { stdio: 'ignore' });
            console.log(`📸 Screen captured: ${savePath}`);
            return savePath;
        } catch (err) {
            // Try imagesnap
            try {
                execSync(`imagesnap -w 1 "${savePath}"`, { stdio: 'ignore' });
                console.log(`📸 Image captured: ${savePath}`);
                return savePath;
            } catch (err2) {
                throw new Error('No screen capture tool available');
            }
        }
    }

    async captureWebcam(outputPath) {
        const defaultPath = path.join(this.visionDir, `webcam_${Date.now()}.jpg`);
        const savePath = outputPath || defaultPath;
        
        try {
            // Try imagesnap with default camera
            execSync(`imagesnap -w 2 "${savePath}"`, { stdio: 'ignore' });
            console.log(`📸 Webcam captured: ${savePath}`);
            return savePath;
        } catch (err) {
            throw new Error('Webcam capture failed');
        }
    }

    encodeImage(imagePath) {
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image not found: ${imagePath}`);
        }
        
        const imageBuffer = fs.readFileSync(imagePath);
        return imageBuffer.toString('base64');
    }

    // ═══════════════════════════════════════════════════════════
    // VISION ANALYSIS
    // ═══════════════════════════════════════════════════════════

    async analyze(imagePath, prompt, options = {}) {
        const model = options.model || this.selectBestModel(prompt);
        const config = VISION_MODELS[model];
        
        if (!config) {
            throw new Error(`Unknown model: ${model}`);
        }
        
        if (!process.env[config.apiKeyEnv]) {
            throw new Error(`API key not set: ${config.apiKeyEnv}`);
        }
        
        const imageData = this.encodeImage(imagePath);
        const base64Image = `data:image/png;base64,${imageData}`;
        
        console.log(`\n👁️ Analyzing with ${model}...`);
        
        const result = await this.callAPI(config, prompt, base64Image);
        
        // Save result
        const resultPath = path.join(this.resultsDir, `analysis_${Date.now()}.json`);
        fs.writeFileSync(resultPath, JSON.stringify({
            model,
            prompt,
            imagePath,
            result,
            timestamp: new Date().toISOString()
        }, null, 2));
        
        return { model, result, resultPath };
    }

    async analyzeBatch(imagePaths, prompt, options = {}) {
        console.log(`\n👁️ Analyzing ${imagePaths.length} images...`);
        
        const results = [];
        for (const imagePath of imagePaths) {
            try {
                const result = await this.analyze(imagePath, prompt, options);
                results.push(result);
            } catch (err) {
                console.log(`❌ Failed: ${imagePath} — ${err.message}`);
            }
        }
        
        return results;
    }

    async compare(imagePath1, imagePath2, prompt) {
        console.log('\n👁️ Comparing two images...');
        
        const image1 = this.encodeImage(imagePath1);
        const image2 = this.encodeImage(imagePath2);
        
        const promptWithComparison = `Compare these two images. ${prompt || 'What are the similarities and differences?'}`;
        
        const model = this.defaultModel;
        const config = VISION_MODELS[model];
        
        if (!process.env[config.apiKeyEnv]) {
            throw new Error(`API key not set: ${config.apiKeyEnv}`);
        }
        
        const result = await this.callAPI(config, promptWithComparison, [
            `data:image/png;base64,${image1}`,
            `data:image/png;base64,${image2}`
        ]);
        
        return { model, result };
    }

    // ═══════════════════════════════════════════════════════════
    // API CALLS
    // ═══════════════════════════════════════════════════════════

    async callAPI(config, prompt, imageData) {
        if (config.provider === 'gemini') {
            return this.callGemini(config, prompt, imageData);
        }
        
        return this.callOpenAICompat(config, prompt, imageData);
    }

    async callGemini(config, prompt, imageData) {
        const url = `${config.endpoint}?key=${process.env[config.apiKeyEnv]}`;
        
        const body = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'image/png', data: imageData.split(',')[1] } }
                ]
            }]
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    }

    async callOpenAICompat(config, prompt, imageData) {
        const messages = {
            'kimi-k2.5': [
                { role: 'user', content: [
                    { type: 'image_url', image_url: { url: imageData } },
                    { type: 'text', text: prompt }
                ]}
            ],
            'default': [
                { role: 'user', content: [
                    { type: 'image_url', image_url: { url: imageData, detail: 'high' } },
                    { type: 'text', text: prompt }
                ]}
            ]
        };
        
        const body = {
            model: config.model,
            messages: messages[config.provider] || messages['default'],
            temperature: 0.7
        };
        
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env[config.apiKeyEnv]}`
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`${config.provider} API error: ${response.status} — ${error}`);
        }
        
        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'No response';
    }

    // ═══════════════════════════════════════════════════════════
    // PRESET ANALYSES
    // ═══════════════════════════════════════════════════════════

    async analyzeScreen(prompt, options = {}) {
        const screenshot = await this.captureScreen();
        return this.analyze(screenshot, prompt, options);
    }

    async analyzeGrowth(imagePath) {
        const prompt = `Analyze this plant/grow operation:
        1. Plant health assessment (color, vigor, stress signs)
        2. Environmental conditions visible (light quality, humidity indicators)
        3. Growth stage identification
        4. Any issues or concerns (pests, deficiencies, overwatering)
        5. Recommendations for improvement
        
        Be specific and actionable in your assessment.`;
        
        return this.analyze(imagePath, prompt, { model: 'kimi-k2.5' });
    }

    async analyzeChart(imagePath) {
        const prompt = `Analyze this chart/graph/data visualization:
        1. What type of chart is this?
        2. What data is being shown?
        3. Key trends and patterns
        4. Notable data points (highs, lows, anomalies)
        5. Summary of insights
        
        Extract specific numbers where possible.`;
        
        return this.analyze(imagePath, prompt, { model: 'gpt-5.4' });
    }

    async analyzeDocument(imagePath) {
        const prompt = `Analyze this document:
        1. What type of document is this?
        2. Key information and data points
        3. Important details to note
        4. Summary
        
        Extract all relevant text and information.`;
        
        return this.analyze(imagePath, prompt, { model: 'kimi-k2.5' });
    }

    async analyzeReceipt(imagePath) {
        const prompt = `Extract information from this receipt:
        1. Vendor/Store name
        2. Date and time
        3. Items purchased (with prices if visible)
        4. Total amount
        5. Any other relevant details
        
        Format as structured data.`;
        
        return this.analyze(imagePath, prompt, { model: 'kimi-k2.5' });
    }

    async analyzeMedical(imagePath) {
        const prompt = `Analyze this medical/health image:
        1. What type of image is this (X-ray, scan, photo, etc.)?
        2. What is shown?
        3. Any notable observations
        4. Important areas of concern
        
        NOTE: This is for informational purposes only. Consult a healthcare professional for medical advice.`;
        
        return this.analyze(imagePath, prompt, { model: 'gpt-5.4' });
    }

    async analyzeRoom(imagePath) {
        const prompt = `Analyze this room/space:
        1. What type of room is this?
        2. Layout and key features
        3. Lighting conditions
        4. Any notable objects or items
        5. Overall assessment
        
        Be descriptive but concise.`;
        
        return this.analyze(imagePath, prompt, { model: 'kimi-k2.5' });
    }

    async analyzeFace(imagePath) {
        const prompt = `Analyze this face/image:
        1. General description
        2. Any notable features
        3. Expression/emotion
        4. Any other observations
        
        Be respectful and professional.`;
        
        return this.analyze(imagePath, prompt, { model: 'kimi-k2.5' });
    }

    async analyzeCode(imagePath) {
        const prompt = `Analyze this code screenshot:
        1. What programming language?
        2. What is the code doing?
        3. Any issues or bugs visible?
        4. Suggestions for improvement
        5. Is it well-structured?
        
        Focus on code quality and potential problems.`;
        
        return this.analyze(imagePath, prompt, { model: 'kimi-k2.5' });
    }

    // ═══════════════════════════════════════════════════════════
    // CLI
    // ═══════════════════════════════════════════════════════════

    static async CLI(args) {
        const hiveVision = new HiveVision();
        
        const command = args[2];
        
        switch (command) {
            case 'screen':
            case 'screenshot':
                await hiveVision.captureScreen();
                break;
                
            case 'webcam':
                await hiveVision.captureWebcam();
                break;
                
            case 'analyze':
                const imagePath = args[3];
                const prompt = args[4] || 'Describe this image in detail.';
                if (!imagePath) {
                    console.log('Usage: hive-vision.js analyze <image-path> [prompt]');
                    break;
                }
                const result = await hiveVision.analyze(imagePath, prompt);
                console.log('\n📋 Result:');
                console.log(result.result);
                break;
                
            case 'screen-analyze':
                const screenPrompt = args[3] || 'Describe what you see on screen.';
                const screenResult = await hiveVision.analyzeScreen(screenPrompt);
                console.log('\n📋 Result:');
                console.log(screenResult.result);
                break;
                
            case 'growth':
                if (!args[3]) {
                    console.log('Usage: hive-vision.js growth <image-path>');
                    break;
                }
                const growthResult = await hiveVision.analyzeGrowth(args[3]);
                console.log('\n🌿 Growth Analysis:');
                console.log(growthResult.result);
                break;
                
            case 'chart':
                if (!args[3]) {
                    console.log('Usage: hive-vision.js chart <image-path>');
                    break;
                }
                const chartResult = await hiveVision.analyzeChart(args[3]);
                console.log('\n📊 Chart Analysis:');
                console.log(chartResult.result);
                break;
                
            case 'document':
                if (!args[3]) {
                    console.log('Usage: hive-vision.js document <image-path>');
                    break;
                }
                const docResult = await hiveVision.analyzeDocument(args[3]);
                console.log('\n📄 Document Analysis:');
                console.log(docResult.result);
                break;
                
            case 'receipt':
                if (!args[3]) {
                    console.log('Usage: hive-vision.js receipt <image-path>');
                    break;
                }
                const receiptResult = await hiveVision.analyzeReceipt(args[3]);
                console.log('\n🧾 Receipt Analysis:');
                console.log(receiptResult.result);
                break;
                
            case 'compare':
                if (!args[3] || !args[4]) {
                    console.log('Usage: hive-vision.js compare <image1> <image2> [prompt]');
                    break;
                }
                const compareResult = await hiveVision.compare(args[3], args[4], args[5]);
                console.log('\n🔍 Comparison:');
                console.log(compareResult.result);
                break;
                
            case 'models':
                hiveVision.listModels();
                break;
                
            case 'batch':
                const images = args.slice(3, -1);
                const batchPrompt = args[args.length - 1] || 'Describe this image.';
                const batchResult = await hiveVision.analyzeBatch(images, batchPrompt);
                batchResult.forEach(r => console.log(`\n📋 ${r.resultPath}: ${r.result}`));
                break;
                
            default:
                console.log(`
👁️ Hive Vision — Multi-Model Vision Analysis v1.0.0

Usage:
  hive-vision.js screen                           Capture screenshot
  hive-vision.js webcam                           Capture webcam image
  hive-vision.js analyze <image> [prompt]        Analyze image
  hive-vision.js screen-analyze [prompt]          Capture + analyze screen
  hive-vision.js growth <image>                   Analyze plant/grow
  hive-vision.js chart <image>                    Analyze chart/graph
  hive-vision.js document <image>                 Analyze document
  hive-vision.js receipt <image>                  Extract receipt data
  hive-vision.js compare <img1> <img2> [prompt]   Compare two images
  hive-vision.js models                           List available models
  hive-vision.js batch <img1> <img2>... [prompt] Batch analyze

Presets (use specific model for best results):
  - growth: Plant health, grow operations
  - chart: Data visualizations, graphs
  - document: PDFs, receipts, forms
  - receipt: Extract receipt data

Environment Variables:
  KIMI_API_KEY      Kimi/Moonshot (recommended)
  OPENAI_API_KEY    GPT-5.4 Vision
  MINIMAX_API_KEY   MiniMax VL
  GEMINI_API_KEY    Gemini Vision
  LMSTUDIO_KEY      Local Qwen VL (http://localhost:1234)
`);
        }
    }
}

// Export
module.exports = { HiveVision, VISION_MODELS };

// CLI
if (require.main === module) {
    HiveVision.CLI(process.argv);
}
