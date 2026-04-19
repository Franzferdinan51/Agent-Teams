# Creative Agents — AgentTeams v1.0.0

## Image Generation

### ComfyUI Integration

```bash
# Connect ComfyUI to hive
./scripts/hive-connect.sh "comfyui" "image-generation,workflows"

# ComfyUI endpoints
COMFYUI_URL="http://localhost:8188"
```

**Workflows:**
- Text-to-image (SDXL, SD 1.5, SD 3)
- Image-to-image (img2img)
- Inpainting/outpainting
- ControlNet workflows
- LoRA/embedding workflows

**API:**
```bash
# Queue prompt
curl -X POST http://localhost:8188/prompt \
  -d '{"prompt": {"3": {"inputs": {"text": "masterpiece, best quality"}}}'

# Get history
curl http://localhost:8188/history
```

### ComfyUI Agent

```javascript
// comfyui-agent.js — Agent controls ComfyUI
async function generateImage(prompt, workflow = 'txt2img') {
    // Queue workflow
    await fetch(`${COMFYUI_URL}/prompt`, {
        method: 'POST',
        body: JSON.stringify({
            prompt: workflows[workflow](prompt)
        })
    });
    
    // Poll for completion
    const jobId = response.prompt_id;
    
    // Download result
    const image = await getImage(jobId);
    return image;
}
```

---

## Video Generation

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

## MiniMax CLI Integration

```bash
# Full MiniMax suite
~/.npm-global/bin/mmx --help

# Available:
mmx speech synthesize   # TTS
mmx music generate     # Music generation  
mmx video generate     # Video generation
mmx image generate    # Image generation
mmx chat              # Chat
```

**Hive Connection:**
```bash
./scripts/hive-connect.sh "minimax-cli" "speech,music,video,image"
```

---

## Blender + 3D Creation

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

### 3D Model Generation

```python
# generate_3d.py — Blender script for 3D generation
import bpy
import random

def create_mesh_from_prompt(prompt):
    # Parse prompt for shape/type
    # Generate procedural mesh
    # Apply materials
    # Export
    
    # Basic shapes
    if 'cube' in prompt.lower():
        bpy.ops.mesh.primitive_cube_add()
    elif 'sphere' in prompt.lower():
        bpy.ops.mesh.primitive_uv_sphere_add()
    elif 'cylinder' in prompt.lower():
        bpy.ops.mesh.primitive_cylinder_add()
    
    # Material
    mat = bpy.data.materials.new(name="Generated")
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs[0].default_value = (random.random(), random.random(), random.random(), 1)
    
    obj = bpy.context.active_object
    obj.data.materials.append(mat)
    
    return obj
```

---

## Creative Agents

| Agent | Purpose | Tools |
|-------|---------|-------|
| `image-generator` | Create images from text | ComfyUI, MiniMax |
| `video-generator` | Create videos | MiniMax, ComfyUI |
| `3d-modeler` | Create 3D models | Blender |
| `music-generator` | Create music | MiniMax |
| `speech-agent` | TTS, voice | MiniMax |
| `animation-agent` | Animate sequences | ComfyUI |
| `render-agent` | Render 3D scenes | Blender |
| `texture-artist` | Generate textures | Stable Diffusion |

---

## Hive Integration

All creative agents connect to hive:

```bash
# Connect creative agents
./scripts/hive-connect.sh "comfyui" "image-generation,workflows"
./scripts/hive-connect.sh "minimax-creative" "speech,music,video"
./scripts/hive-connect.sh "blender" "3d-modeling,rendering"
./scripts/hive-connect.sh "3d-generator" "mesh-creation,texturing"
```

### Creative Workflow Example

```
User: "Create a video of a 3D robot walking"

1. Hive broadcasts: "Creative task: 3D robot video"
       ↓
2. 3d-modeler → Creates robot mesh
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

## Resources

- [MiniMax CLI](https://github.com/MiniMax-AI/cli)
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
- [Blender Python API](https://docs.blender.org/api/current/)
- [Stable Diffusion](https://github.com/CompVis/stable-diffusion)
- [AnimateDiff](https://github.com/guoyww/animatediff)

## Status

Added: 2026-04-19
Purpose: Creative AI agents for image, video, 3D, music generation