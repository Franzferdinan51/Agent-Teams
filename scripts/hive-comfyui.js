#!/usr/bin/env node
/**
 * Hive ComfyUI — Full ComfyUI Integration
 * The most powerful diffusion model interface
 * 
 * ComfyUI supports:
 * - Images: SDXL, Flux, SD3, PixArt, HunyuanDiT, Qwen Image, HiDream
 * - Video: SVD, Mochi, LTX-Video, Hunyuan Video, Wan 2.1
 * - Audio: Stable Audio, ACE Step
 * - 3D: Hunyuan3D 2.0
 * - Editing: Inpainting, ControlNet, LoRA, upscaling
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    comfyUI: {
        url: process.env.COMFYUI_URL || 'http://localhost:8188',
        outputDir: process.env.COMFYUI_OUTPUT || 'output',
        workflowsDir: path.join(__dirname, '..', 'workflows', 'comfyui')
    }
};

class HiveComfyUI {
    constructor(options = {}) {
        this.url = options.url || CONFIG.comfyUI.url;
        this.outputDir = options.outputDir || CONFIG.comfyUI.outputDir;
        this.workflowsDir = options.workflowsDir || CONFIG.comfyUI.workflowsDir;
        
        // Ensure workflows directory exists
        if (!fs.existsSync(this.workflowsDir)) {
            fs.mkdirSync(this.workflowsDir, { recursive: true });
        }
        
        console.log('🎨 Hive ComfyUI initialized');
        console.log(`   URL: ${this.url}`);
    }

    // ═══════════════════════════════════════════════════════════
    // SYSTEM STATUS
    // ═══════════════════════════════════════════════════════════

    async getSystemStats() {
        try {
            const response = await this.fetch(`${this.url}/system_stats`);
            return JSON.parse(response);
        } catch (err) {
            return { error: 'ComfyUI not running', hint: 'Start ComfyUI first' };
        }
    }

    async getQueue() {
        try {
            const response = await this.fetch(`${this.url}/queue`);
            return JSON.parse(response);
        } catch (err) {
            return { error: 'Failed to get queue' };
        }
    }

    async getHistory(promptId = null) {
        try {
            const url = promptId ? `${this.url}/history/${promptId}` : `${this.url}/history`;
            const response = await this.fetch(url);
            return JSON.parse(response);
        } catch (err) {
            return { error: 'Failed to get history' };
        }
    }

    async getModels() {
        try {
            const response = await this.fetch(`${this.url}/object_info`);
            return JSON.parse(response);
        } catch (err) {
            return { error: 'Failed to get models' };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // IMAGE GENERATION
    // ═══════════════════════════════════════════════════════════

    async generateImage(prompt, options = {}) {
        const model = options.model || 'flux-schnell'; // Default to fastest
        const width = options.width || 1024;
        const height = options.height || 1024;
        const steps = options.steps || 20;
        const cfg = options.cfg || 1.0;
        const seed = options.seed || Math.floor(Math.random() * 999999999);
        
        // Build workflow based on model
        const workflow = this.buildTextToImageWorkflow({
            prompt,
            model,
            width,
            height,
            steps,
            cfg,
            seed
        });
        
        return this.queuePrompt(workflow);
    }

    async generateFlux(prompt, options = {}) {
        // Flux models (flux-schnell, flux-dev, flux-svd)
        const model = options.model || 'flux-schnell';
        const width = options.width || 1024;
        const height = options.height || 1024;
        const steps = options.steps || model.includes('schnell') ? 4 : 25;
        const seed = options.seed || Math.floor(Math.random() * 999999999);
        
        const workflow = {
            "3": {
                "inputs": {
                    "text": prompt,
                    "clip": ["4", 0]
                },
                "class_type": "CLIPTextEncode"
            },
            "4": {
                "inputs": {
                    "guidance": options.cfg || 3.5,
                    "output_type": "linear",
                    "model": ["5", 0],
                    "clip": ["6", 0],
                    "vae": ["6", 1],
                    "prompt": ["3", 0]
                },
                "class_type": "FluxGuidance"
            },
            "5": {
                "inputs": { "model_name": model },
                "class_type": "CheckpointLoaderSimple"
            },
            "6": {
                "inputs": { "model_name": model },
                "class_type": "UNETLoader"
            },
            "7": {
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "8": {
                "inputs": {
                    "samples": ["4", 0],
                    "vae": ["6", 1]
                },
                "class_type": "VAEDecode"
            },
            "9": {
                "inputs": {
                    "filename_prefix": "flux",
                    "images": ["8", 0]
                },
                "class_type": "SaveImage"
            }
        };
        
        return this.queuePrompt(workflow);
    }

    async generateSDXL(prompt, options = {}) {
        // Stable Diffusion XL
        const width = options.width || 1024;
        const height = options.height || 1024;
        const steps = options.steps || 30;
        const seed = options.seed || Math.floor(Math.random() * 999999999);
        
        const workflow = {
            "1": {
                "inputs": {
                    "model_name": "sdxl" // You specify actual model
                },
                "class_type": "CheckpointLoaderSimple"
            },
            "2": {
                "inputs": {
                    "text": prompt,
                    "clip": ["1", 1]
                },
                "class_type": "CLIPTextEncode"
            },
            "3": {
                "inputs": {
                    "text": prompt,
                    "clip": ["1", 2]
                },
                "class_type": "CLIPTextEncode"
            },
            "4": {
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "5": {
                "inputs": {
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0],
                    "steps": steps,
                    "seed": seed,
                    "cfg": options.cfg || 8,
                    "sampler_name": options.sampler || "euler"
                },
                "class_type": "KSampler"
            },
            "6": {
                "inputs": {
                    "samples": ["5", 0],
                    "vae": ["1", 2]
                },
                "class_type": "VAEDecode"
            },
            "7": {
                "inputs": {
                    "filename_prefix": "sdxl",
                    "images": ["6", 0]
                },
                "class_type": "SaveImage"
            }
        };
        
        return this.queuePrompt(workflow);
    }

    // ═══════════════════════════════════════════════════════════
    // IMAGE TO IMAGE
    // ═══════════════════════════════════════════════════════════

    async img2img(inputImage, prompt, options = {}) {
        // Load input image and process with diffusion
        const strength = options.strength || 0.7;
        
        // VAE Encode for img2img
        const workflow = {
            "LoadImage": {
                "inputs": { "image": inputImage },
                "class_type": "LoadImage"
            },
            "VAEEncode": {
                "inputs": {
                    "pixels": ["LoadImage", 0],
                    "vae": ["CheckpointLoader", 2]
                },
                "class_type": "VAEEncode"
            },
            "KSampler": {
                "inputs": {
                    "model": ["CheckpointLoader", 0],
                    "positive": ["CLIPTextEncode", 0],
                    "negative": ["CLIPTextEncode", 1],
                    "latent_image": ["VAEEncode", 0],
                    "steps": options.steps || 20,
                    "cfg": options.cfg || 7,
                    "strength": strength
                },
                "class_type": "KSampler"
            },
            "VAEDecode": {
                "inputs": {
                    "samples": ["KSampler", 0],
                    "vae": ["CheckpointLoader", 2]
                },
                "class_type": "VAEDecode"
            },
            "SaveImage": {
                "inputs": {
                    "filename_prefix": "img2img",
                    "images": ["VAEDecode", 0]
                },
                "class_type": "SaveImage"
            }
        };
        
        return this.queuePrompt(workflow);
    }

    // ═══════════════════════════════════════════════════════════
    // INPAINTING
    // ═══════════════════════════════════════════════════════════

    async inpaint(inputImage, mask, prompt, options = {}) {
        // Inpaint using mask
        const workflow = {
            "LoadImage": {
                "inputs": { "image": inputImage },
                "class_type": "LoadImage"
            },
            "LoadMask": {
                "inputs": { "mask": mask },
                "class_type": "LoadImage"
            },
            "VAEEncodeForInpaint": {
                "inputs": {
                    "pixels": ["LoadImage", 0],
                    "mask": ["LoadMask", 0],
                    "vae": ["CheckpointLoader", 2]
                },
                "class_type": "VAEEncodeForInpaint"
            },
            "KSampler": {
                "inputs": {
                    "model": ["CheckpointLoader", 0],
                    "positive": ["CLIPTextEncode", 0],
                    "negative": ["CLIPTextEncode", 1],
                    "latent_image": ["VAEEncodeForInpaint", 0],
                    "steps": options.steps || 20,
                    "cfg": options.cfg || 7
                },
                "class_type": "KSampler"
            },
            "VAEDecode": {
                "inputs": {
                    "samples": ["KSampler", 0],
                    "vae": ["CheckpointLoader", 2]
                },
                "class_type": "VAEDecode"
            },
            "SaveImage": {
                "inputs": {
                    "filename_prefix": "inpaint",
                    "images": ["VAEDecode", 0]
                },
                "class_type": "SaveImage"
            }
        };
        
        return this.queuePrompt(workflow);
    }

    // ═══════════════════════════════════════════════════════════
    // UPSCALING
    // ═══════════════════════════════════════════════════════════

    async upscale(inputImage, options = {}) {
        const scale = options.scale || 2;
        const method = options.method || 'hires'; // hires, esrgan, etc.
        
        const workflow = {
            "LoadImage": {
                "inputs": { "image": inputImage },
                "class_type": "LoadImage"
            },
            "UpscaleModel": {
                "inputs": { "model_name": options.model || 'RealESRGAN_x2' },
                "class_type": options.method || 'UpscaleImage'
            },
            "SaveImage": {
                "inputs": {
                    "filename_prefix": "upscaled",
                    "images": ["UpscaleModel", 0]
                },
                "class_type": "SaveImage"
            }
        };
        
        return this.queuePrompt(workflow);
    }

    // ═══════════════════════════════════════════════════════════
    // CONTROLNET
    // ═══════════════════════════════════════════════════════════

    async controlNet(inputImage, prompt, controlType, options = {}) {
        // controlType: canny, depth, pose, normal, etc.
        const workflow = {
            "LoadImage": {
                "inputs": { "image": inputImage },
                "class_type": "LoadImage"
            },
            "ControlNet": {
                "inputs": {
                    "control_image": ["LoadImage", 0],
                    "control_type": controlType,
                    "model": ["ControlNetLoader", 0]
                },
                "class_type": "ControlNetApply"
            },
            "KSampler": {
                "inputs": {
                    "model": ["CheckpointLoader", 0],
                    "positive": ["CLIPTextEncode", 0],
                    "negative": ["CLIPTextEncode", 1],
                    "control": ["ControlNet", 0]
                },
                "class_type": "KSampler"
            },
            "SaveImage": {
                "inputs": {
                    "filename_prefix": "controlnet",
                    "images": ["VAEDecode", 0]
                },
                "class_type": "SaveImage"
            }
        };
        
        return this.queuePrompt(workflow);
    }

    // ═══════════════════════════════════════════════════════════
    // VIDEO GENERATION
    // ═══════════════════════════════════════════════════════════

    async generateVideo(inputImage, options = {}) {
        // Stable Video Diffusion
        const frames = options.frames || 25;
        const fps = options.fps || 12;
        const motionScale = options.motionScale || 1.0;
        
        const workflow = {
            "LoadImage": {
                "inputs": { "image": inputImage },
                "class_type": "LoadImage"
            },
            "SVD": {
                "inputs": {
                    "input_image": ["LoadImage", 0],
                    "video_frames": frames,
                    "fps": fps,
                    "motion_bucket_id": Math.floor(motionScale * 127)
                },
                "class_type": "SVDImg2VidPipeline"
            },
            "SaveAnimatedWEBP": {
                "inputs": {
                    "filename_prefix": "video",
                    "images": ["SVD", 0]
                },
                "class_type": "SaveAnimatedWEBP"
            }
        };
        
        return this.queuePrompt(workflow);
    }

    async generateHunyuanVideo(prompt, options = {}) {
        // Hunyuan Video
        const workflow = {
            "HunyuanDiT": {
                "inputs": {
                    "prompt": prompt,
                    "video_frames": options.frames || 49,
                    "fps": options.fps || 24
                },
                "class_type": "HunyuanDiT"
            },
            "SaveVideo": {
                "inputs": {
                    "filename_prefix": "hunyuan",
                    "video": ["HunyuanDiT", 0]
                },
                "class_type": "SaveVideo"
            }
        };
        
        return this.queuePrompt(workflow);
    }

    async generateWanVideo(prompt, options = {}) {
        // Wan 2.1 Video
        const workflow = {
            "Wan21": {
                "inputs": {
                    "prompt": prompt,
                    "num_frames": options.frames || 81,
                    "resolution": options.resolution || 848
                },
                "class_type": "Wan21Video"
            },
            "SaveVideo": {
                "inputs": {
                    "filename_prefix": "wan",
                    "video": ["Wan21", 0]
                },
                "class_type": "SaveVideo"
            }
        };
        
        return this.queuePrompt(workflow);
    }

    // ═══════════════════════════════════════════════════════════
    // 3D GENERATION
    // ═══════════════════════════════════════════════════════════

    async generate3D(inputImage, options = {}) {
        // Hunyuan3D 2.0
        const workflow = {
            "LoadImage": {
                "inputs": { "image": inputImage },
                "class_type": "LoadImage"
            },
            "Hunyuan3D": {
                "inputs": {
                    "input_image": ["LoadImage", 0],
                    "geometry_precision": options.precision || "fp16"
                },
                "class_type": "Hunyuan3D"
            },
            "SaveGeometry": {
                "inputs": {
                    "filename_prefix": "3d",
                    "geometry": ["Hunyuan3D", 0]
                },
                "class_type": "SaveGeometry"
            }
        };
        
        return this.queuePrompt(workflow);
    }

    // ═══════════════════════════════════════════════════════════
    // AUDIO GENERATION
    // ═══════════════════════════════════════════════════════════

    async generateAudio(prompt, options = {}) {
        // Stable Audio
        const duration = options.duration || 10;
        
        const workflow = {
            "StableAudio": {
                "inputs": {
                    "prompt": prompt,
                    "duration": duration,
                    "sample_rate": options.sampleRate || 44100
                },
                "class_type": "StableAudio"
            },
            "SaveAudio": {
                "inputs": {
                    "filename_prefix": "audio",
                    "audio": ["StableAudio", 0]
                },
                "class_type": "SaveAudio"
            }
        };
        
        return this.queuePrompt(workflow);
    }

    // ═══════════════════════════════════════════════════════════
    // LORA MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    async applyLora(model, loraName, strength = 1.0) {
        // Apply LoRA to model
        return {
            "model": model,
            "lora_name": loraName,
            "strength": strength
        };
    }

    async listLoras() {
        try {
            const response = await this.fetch(`${this.url}/utilities/lora/list`);
            return JSON.parse(response);
        } catch (err) {
            return { error: 'Failed to list Loras' };
        }
    }

    // ═══════════════════════════════════════════════════════════
    // WORKFLOW MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    async loadWorkflow(name) {
        const workflowPath = path.join(this.workflowsDir, `${name}.json`);
        
        if (!fs.existsSync(workflowPath)) {
            throw new Error(`Workflow not found: ${name}`);
        }
        
        const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
        return workflow;
    }

    async saveWorkflow(name, workflow) {
        const workflowPath = path.join(this.workflowsDir, `${name}.json`);
        fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
        console.log(`💾 Workflow saved: ${workflowPath}`);
        return workflowPath;
    }

    // ═══════════════════════════════════════════════════════════
    // CORE API
    // ═══════════════════════════════════════════════════════════

    async queuePrompt(workflow) {
        try {
            const response = await this.fetch(`${this.url}/prompt`, {
                method: 'POST',
                body: JSON.stringify({ prompt: workflow })
            });
            
            const result = JSON.parse(response);
            console.log(`✅ Prompt queued: ${result.prompt_id}`);
            
            // Wait for completion
            const imagePaths = await this.waitForCompletion(result.prompt_id);
            
            return {
                prompt_id: result.prompt_id,
                images: imagePaths,
                status: 'completed'
            };
        } catch (err) {
            throw new Error(`Failed to queue prompt: ${err.message}`);
        }
    }

    async waitForCompletion(promptId, timeoutMs = 300000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            const history = await this.getHistory(promptId);
            
            if (history[promptId]) {
                const outputs = history[promptId].outputs;
                const imagePaths = [];
                
                for (const [nodeId, nodeOutput] of Object.entries(outputs)) {
                    if (nodeOutput.images) {
                        for (const image of nodeOutput.images) {
                            imagePaths.push(`${this.url}/view?filename=${image.filename}&subfolder=${image.subfolder}`);
                        }
                    }
                }
                
                return imagePaths;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('Timeout waiting for completion');
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════

    buildTextToImageWorkflow(options) {
        const { prompt, model, width, height, steps, cfg, seed } = options;
        
        return {
            "3": {
                "inputs": { "text": prompt },
                "class_type": "CLIPTextEncode"
            },
            "4": {
                "inputs": {
                    "width": width,
                    "height": height,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage"
            },
            "5": {
                "inputs": {
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "positive": ["3", 0],
                    "negative": ["6", 0],
                    "latent_image": ["4", 0]
                },
                "class_type": "KSampler"
            },
            "6": {
                "inputs": { "text": "" },
                "class_type": "CLIPTextEncode"
            },
            "7": {
                "inputs": {
                    "samples": ["5", 0]
                },
                "class_type": "VAEDecode"
            },
            "8": {
                "inputs": {
                    "filename_prefix": "hive",
                    "images": ["7", 0]
                },
                "class_type": "SaveImage"
            }
        };
    }

    fetch(url, options = {}) {
        return new Promise((resolve, reject) => {
            const http = require('http');
            const urlObj = new URL(url);
            
            const reqOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || 8188,
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET'
            };
            
            const req = http.request(reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            });
            
            req.on('error', reject);
            
            if (options.body) {
                req.write(options.body);
            }
            
            req.end();
        });
    }

    // ═══════════════════════════════════════════════════════════
    // CLI
    // ═══════════════════════════════════════════════════════════

    static async CLI(args) {
        const comfy = new HiveComfyUI();
        
        const command = args[2];
        
        switch (command) {
            case 'status':
            case 'stats':
                const stats = await comfy.getSystemStats();
                console.log('\n📊 ComfyUI System Stats:');
                console.log(JSON.stringify(stats, null, 2));
                break;
                
            case 'queue':
                const queue = await comfy.getQueue();
                console.log('\n📋 Queue:');
                console.log(JSON.stringify(queue, null, 2));
                break;
                
            case 'models':
                const models = await comfy.getModels();
                console.log('\n🤖 Available Models:');
                if (models.CheckpointLoaderSimple) {
                    console.log('  Checkpoints:', Object.keys(models.CheckpointLoaderSimple?.input?.required?.model_name?.[0] || {}));
                }
                break;
                
            case 'generate':
            case 'gen':
                const prompt = args.slice(3).join(' ');
                if (!prompt) {
                    console.log('Usage: hive-comfyui.js generate <prompt>');
                    break;
                }
                console.log(`🎨 Generating: "${prompt}"`);
                const result = await comfy.generateFlux(prompt);
                console.log('\n✅ Result:');
                console.log(`   Prompt ID: ${result.prompt_id}`);
                console.log(`   Images: ${result.images.length}`);
                result.images.forEach(img => console.log(`   - ${img}`));
                break;
                
            case 'flux':
                const fluxPrompt = args.slice(3).join(' ');
                console.log(`🎨 Generating Flux: "${fluxPrompt}"`);
                const fluxResult = await comfy.generateFlux(fluxPrompt);
                console.log('\n✅ Result:', fluxResult.images);
                break;
                
            case 'sdxl':
                const sdxlPrompt = args.slice(3).join(' ');
                console.log(`🎨 Generating SDXL: "${sdxlPrompt}"`);
                const sdxlResult = await comfy.generateSDXL(sdxlPrompt);
                console.log('\n✅ Result:', sdxlResult.images);
                break;
                
            case 'img2img':
            case 'i2i':
                if (args.length < 4) {
                    console.log('Usage: hive-comfyui.js img2img <image> <prompt>');
                    break;
                }
                const imgPath = args[3];
                const imgPrompt = args.slice(4).join(' ');
                console.log(`🎨 img2img: "${imgPrompt}"`);
                const i2iResult = await comfy.img2img(imgPath, imgPrompt);
                console.log('\n✅ Result:', i2iResult.images);
                break;
                
            case 'video':
            case 'vid':
                if (args.length < 4) {
                    console.log('Usage: hive-comfyui.js video <image>');
                    break;
                }
                const vidImage = args[3];
                console.log(`🎬 Generating video from: ${vidImage}`);
                const vidResult = await comfy.generateVideo(vidImage);
                console.log('\n✅ Result:', vidResult.images);
                break;
                
            case '3d':
                if (args.length < 4) {
                    console.log('Usage: hive-comfyui.js 3d <image>');
                    break;
                }
                const img3d = args[3];
                console.log(`🎮 Generating 3D from: ${img3d}`);
                const d3Result = await comfy.generate3D(img3d);
                console.log('\n✅ Result:', d3Result);
                break;
                
            case 'audio':
                const audioPrompt = args.slice(3).join(' ');
                console.log(`🎵 Generating audio: "${audioPrompt}"`);
                const audioResult = await comfy.generateAudio(audioPrompt);
                console.log('\n✅ Result:', audioResult);
                break;
                
            case 'workflow':
                const wfName = args[3];
                if (!wfName) {
                    console.log('Usage: hive-comfyui.js workflow <name>');
                    break;
                }
                const workflow = await comfy.loadWorkflow(wfName);
                console.log('\n📋 Workflow:', JSON.stringify(workflow, null, 2));
                break;
                
            default:
                console.log(`
🎨 Hive ComfyUI — Full Diffusion Model Control v1.0.0

Usage:
  hive-comfyui.js status                        System stats
  hive-comfyui.js queue                         Current queue
  hive-comfyui.js models                        List available models
  
  hive-comfyui.js generate <prompt>             Quick generate
  hive-comfyui.js flux <prompt>                 Flux generation
  hive-comfyui.js sdxl <prompt>                SDXL generation
  
  hive-comfyui.js img2img <image> <prompt>     Image to image
  hive-comfyui.js video <image>                 Generate video (SVD)
  hive-comfyui.js 3d <image>                    Generate 3D (Hunyuan3D)
  hive-comfyui.js audio <prompt>               Generate audio
  
  hive-comfyui.js workflow <name>               Load workflow

ComfyUI must be running at: ${CONFIG.comfyUI.url}

ENVIRONMENT:
  COMFYUI_URL=http://localhost:8188

MODELS SUPPORTED:
  Images: Flux, SDXL, SD3, PixArt, HunyuanDiT, Qwen Image, HiDream
  Video: SVD, Mochi, LTX-Video, Hunyuan Video, Wan 2.1
  Audio: Stable Audio, ACE Step
  3D: Hunyuan3D 2.0
`);
        }
    }
}

module.exports = { HiveComfyUI };

if (require.main === module) {
    HiveComfyUI.CLI(process.argv);
}
