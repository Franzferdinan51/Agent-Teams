# Creative Agents — AgentTeams v1.0.1

## 🎨 ComfyUI — Full Diffusion Control

ComfyUI is the most powerful modular diffusion model GUI with a graph/nodes interface.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         COMFYUI                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   📸 IMAGES              🎬 VIDEO             🎵 AUDIO              │
│   ├── Flux              ├── SVD              ├── Stable Audio        │
│   ├── SDXL              ├── Mochi            └── ACE Step            │
│   ├── SD3               ├── LTX-Video                             │
│   ├── PixArt            ├── Hunyuan Video                         │
│   ├── HunyuanDiT        └── Wan 2.1                               │
│   ├── HiDream                                                       │
│   ├── Qwen Image                                                     │
│   └── Stable Cascade                                                │
│                                                                     │
│   🎮 3D                  🔧 TOOLS                                   │
│   └── Hunyuan3D 2.0      ├── ControlNet                            │
│                           ├── LoRA/embedding                        │
│                           ├── Inpainting                            │
│                           ├── Upscaling (ESRGAN, SwinIR)           │
│                           └── Custom workflows                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Quick Start

```bash
# 1. Start ComfyUI
# Download from https://github.com/comfyanonymous/ComfyUI/releases
# Or: pip install comfy-cli && comfy manager

# 2. Start ComfyUI server
python main.py --listen 0.0.0.0 --port 8188

# 3. Connect to Hive
./scripts/hive-connect.sh "comfyui" "image-generation,workflows"

# 4. Generate!
./scripts/hive-comfyui.sh flux "a beautiful sunset over mountains"
```

### CLI Usage

```bash
# Image Generation
./scripts/hive-comfyui.sh flux "cyberpunk city at night"
./scripts/hive-comfyui.sh sdxl "portrait of a warrior"
./scripts/hive-comfyui.sh sd3 "futuristic spacecraft"

# Image to Image
./scripts/hive-comfyui.sh img2img photo.jpg "make it snowy"

# Inpainting
./scripts/hive-comfyui.sh inpaint image.jpg mask.png "add flowers"

# Video Generation
./scripts/hive-comfyui.sh video portrait.jpg
./scripts/hive-comfyui.sh svd image.jpg
./scripts/hive-comfyui.sh wan "robot dancing"
./scripts/hive-comfyui.sh mochi "ocean waves crashing"

# 3D Generation
./scripts/hive-comfyui.sh 3d object.jpg

# Audio Generation
./scripts/hive-comfyui.sh audio "thunderstorm with rain"
./scripts/hive-comfyui.sh music "epic orchestral battle music"

# Upscaling
./scripts/hive-comfyui.sh upscale lowres.jpg
./scripts/hive-comfyui.sh hires image.jpg

# System
./scripts/hive-comfyui.sh status
./scripts/hive-comfyui.sh queue
./scripts/hive-comfyui.sh models
```

### JavaScript API

```javascript
const { HiveComfyUI } = require('./scripts/hive-comfyui');

const comfy = new HiveComfyUI({ url: 'http://localhost:8188' });

// Image Generation
const result = await comfy.generateFlux('a majestic dragon');
console.log(result.images); // ['http://...']

// Image to Image
const i2i = await comfy.img2img('photo.jpg', 'make it winter');
console.log(i2i.images);

// Video (from image)
const video = await comfy.generateVideo('portrait.jpg', {
    frames: 25,
    fps: 12
});
console.log(video.images);

// 3D
const model = await comfy.generate3D('object.jpg');
console.log(model);

// Audio
const audio = await comfy.generateAudio('rain on leaves');
console.log(audio);

// Custom workflow
const workflow = await comfy.loadWorkflow('my-workflow');
const custom = await comfy.queuePrompt(workflow);
```

### Supported Models

#### Images
| Model | Best For | Speed |
|-------|----------|-------|
| **Flux Schnell** | Fast, high quality | 1-4 steps |
| **Flux Dev** | Best quality | 20-25 steps |
| **SDXL** | Standard images | 20-30 steps |
| **SD3** | Latest improvements | 20-30 steps |
| **PixArt Sigma** | Fast, detailed | 20 steps |
| **HunyuanDiT** | Chinese aesthetics | 20 steps |
| **HiDream** | Dreamy, artistic | 20 steps |
| **Qwen Image** | Text understanding | 20 steps |
| **Stable Cascade** | High resolution | 20 steps |

#### Video
| Model | Best For | Input |
|-------|----------|-------|
| **Stable Video Diffusion** | Cinematic motion | Image |
| **Mochi** | Realistic motion | Text |
| **LTX-Video** | Long videos | Text/Image |
| **Hunyuan Video** | Chinese style | Text |
| **Wan 2.1** | General purpose | Text |

#### Audio
| Model | Best For |
|-------|----------|
| **Stable Audio** | Sound effects, ambient |
| **ACE Step** | Music generation |

#### 3D
| Model | Best For |
|-------|----------|
| **Hunyuan3D 2.0** | Text/Image to 3D mesh |

### Workflows

#### Text to Image
```javascript
{
    "CLIPTextEncode": { "text": "prompt" },
    "EmptyLatentImage": { "width": 1024, "height": 1024 },
    "KSampler": { "steps": 20 },
    "VAEDecode": {},
    "SaveImage": {}
}
```

#### Image to Image
```javascript
{
    "LoadImage": { "image": "input.jpg" },
    "VAEEncode": {},
    "KSampler": { "strength": 0.7 }, // Lower = closer to original
    "VAEDecode": {},
    "SaveImage": {}
}
```

#### Inpainting
```javascript
{
    "LoadImage": { "image": "base.jpg" },
    "LoadMask": { "mask": "mask.png" },
    "VAEEncodeForInpaint": {},
    "KSampler": {},
    "VAEDecode": {},
    "SaveImage": {}
}
```

#### ControlNet
```javascript
{
    "LoadImage": { "image": "pose.jpg" },
    "ControlNet": { "control_type": "pose" },
    "CheckpointLoader": {},
    "CLIPTextEncode": { "prompt": "..." },
    "KSampler": { "control_after_generation": "fixed" },
    "SaveImage": {}
}
```

### Node Types

| Node | Purpose |
|------|---------|
| `CheckpointLoaderSimple` | Load SD/Flux models |
| `CLIPTextEncode` | Encode text prompt |
| `EmptyLatentImage` | Create blank latent |
| `KSampler` | Sampling step |
| `VAEDecode` | Decode latent to image |
| `VAEEncode` | Encode image to latent |
| `SaveImage` | Save to output |
| `LoadImage` | Load image input |
| `ControlNetApply` | Apply ControlNet |
| `LoraLoader` | Apply LoRA weights |
| `UpscaleImage` | Upscaling models |
| `ImageScale` | Simple resize |
| `ImagePadForOutpainting` | Outpainting prep |

### Installation

```bash
# Option 1: Portable (Windows)
# Download from releases page

# Option 2: CLI
pip install comfy-cli
comfy install

# Option 3: Manual
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
pip install -r requirements.txt

# Download models
# Put in models/checkpoints/
# SDXL, Flux, etc.

# Run
python main.py --listen 0.0.0.0 --port 8188
```

### Environment

```bash
# ComfyUI URL
export COMFYUI_URL="http://localhost:8188"

# Custom output directory
export COMFYUI_OUTPUT="/path/to/output"
```

---

## 🎬 Video Generation

### MiniMax Video

```bash
# MiniMax CLI for video
~/.npm-global/bin/mmx video generate \
  --prompt "A beautiful sunset over mountains" \
  --duration 6 \
  --out /tmp/video.mp4
```

**Video Agent:**
```javascript
// video-agent.js
async function generateVideo(prompt, duration = 6) {
    execSync(`mmx video generate --prompt "${prompt}" --duration ${duration} --out /tmp/video.mp4`);
    return '/tmp/video.mp4';
}
```

### ComfyUI Video (AnimateDiff)

```bash
# Video workflows in ComfyUI
# Use AnimateDiff, SVD, etc.
```

---

## 🎵 Audio Generation

### MiniMax Audio

```bash
# Full MiniMax suite
~/.npm-global/bin/mmx --help

# Available:
mmx speech synthesize   # TTS
mmx music generate     # Music generation  
mmx video generate     # Video generation
mmx image generate     # Image generation
mmx chat              # Chat
```

### ComfyUI Audio

```bash
# Stable Audio via ComfyUI
./scripts/hive-comfyui.sh audio "thunderstorm"
./scripts/hive-comfyui.sh music "epic orchestra"
```

---

## 🎮 3D Generation

### ComfyUI 3D

```bash
# Hunyuan3D 2.0
./scripts/hive-comfyui.sh 3d object.jpg
```

### Blender Integration

```bash
# Blender headless mode
blender --background --python-script.py

# Or use bpy in embedded python
blender -b -P generate.py
```

**3D Agent:**
```javascript
// blender-agent.js
async function generate3D(prompt, format = 'glb') {
    // Use Blender Python API
    // Generate from prompt or use Text to 3D
    
    execSync(`blender -b -P generate_mesh.py -- "${prompt}" --output /tmp/model.${format}`);
    return `/tmp/model.${format}`;
}
```

### 3D Workflows

| Task | Tool | Command |
|------|------|---------|
| Text to 3D mesh | Blender + add-on | `bpy.ops.mesh.primitive_cube_add()` |
| GLTF export | Blender | `bpy.ops.export_scene.gltf()` |
| USD export | Blender | `bpy.ops.wm.usd_export()` |
| Render | Cycles/Eevee | `bpy.ops.render.render()` |

---

## 🤖 Creative Agents

| Agent | Purpose | Tools |
|-------|---------|-------|
| `image-generator` | Create images from text | ComfyUI, MiniMax |
| `video-generator` | Create videos | MiniMax, ComfyUI |
| `3d-modeler` | Create 3D models | ComfyUI Hunyuan3D, Blender |
| `music-generator` | Create music | MiniMax, ComfyUI Stable Audio |
| `speech-agent` | TTS, voice | MiniMax |
| `animation-agent` | Animate sequences | ComfyUI |
| `render-agent` | Render 3D scenes | Blender |
| `texture-artist` | Generate textures | ComfyUI SD |

---

## 🕸️ Hive Integration

All creative agents connect to hive:

```bash
# Connect creative agents
./scripts/hive-connect.sh "comfyui" "image-generation,workflows,video,audio,3d"
./scripts/hive-connect.sh "minimax-creative" "speech,music,video,image"
./scripts/hive-connect.sh "blender" "3d-modeling,rendering"
./scripts/hive-connect.sh "3d-generator" "mesh-creation,texturing"
```

### Creative Workflow Example

```
User: "Create a video of a 3D robot walking"

1. Hive broadcasts: "Creative task: 3D robot video"
       ↓
2. 3d-modeler → Creates robot mesh (Hunyuan3D or Blender)
       ↓
3. animation-agent → Creates walk cycle
       ↓
4. render-agent → Renders animation
       ↓
5. video-generator → Creates final video
       ↓
6. Upload/share result
```

---

## 📊 Capability Matrix

| Capability | ComfyUI | MiniMax | Local |
|------------|---------|---------|-------|
| **Image** | ✅ Flux, SDXL, SD3 | ✅ MiniMax | ✅ |
| **Video** | ✅ SVD, Mochi, Wan | ✅ MiniMax | ❌ |
| **Audio** | ✅ Stable Audio | ✅ MiniMax | ❌ |
| **3D** | ✅ Hunyuan3D | ❌ | ❌ |
| **Speed** | Fast (GPU) | Fast (API) | Varies |
| **Quality** | Excellent | Excellent | Good |
| **Offline** | ✅ (local models) | ❌ | ✅ |

---

## Resources

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- [ComfyUI Templates](https://comfyanonymous.github.io/ComfyUI_examples/)
- [Comfy Workflows](https://comfyanonymous.github.io/ComfyUI_examples/)
- [MiniMax CLI](https://github.com/MiniMax-AI/cli)
- [Blender Python API](https://docs.blender.org/api/current/)

## Status

Updated: 2026-04-19
Version: 1.0.1
Purpose: Full creative AI suite — images, video, audio, 3D
