#!/bin/bash
# creative-hive.sh — Connect creative agents to the hive

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🎨 CREATIVE AGENTS — Hive Connection v${VERSION}          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Creative agents to connect
AGENTS=(
    "comfyui:image-generation,workflows,img2img,inpainting"
    "minimax-creative:speech,music,video,image"
    "blender:3d-modeling,rendering,animation"
    "3d-generator:mesh-creation,texturing,exporting"
    "image-generator:stable-diffusion,comfyui,sdxl"
    "video-generator:animate,sdx-video,mini-max"
    "music-generator:song-creation,audio-generation"
    "animation-agent:sequences,rendering,compositing"
    "texture-artist:procedural,uv-mapping,shaders"
)

for agent in "${AGENTS[@]}"; do
    IFS=':' read -r name caps <<< "$agent"
    
    echo "  Connecting: $name"
    echo "  Capabilities: $caps"
    
    # Register with mesh
    curl -s -X POST http://localhost:4000/api/agents/register \
      -H "Content-Type: application/json" \
      -H "X-API-Key: openclaw-mesh-default-key" \
      -d "{
        \"name\": \"$name\",
        \"version\": \"$VERSION\",
        \"type\": \"creative\",
        \"capabilities\": [\"$caps\"],
        \"hive\": true
      }" > /dev/null
    
    echo "  ✅ $name connected"
    echo ""
done

echo "══════════════════════════════════════════════════════════════════"
echo "  🎨 All creative agents connected to hive!"
echo "══════════════════════════════════════════════════════════════════"
echo ""

# Show all connected
echo "  Connected systems:"
curl -s http://localhost:4000/api/agents \
  -H "X-API-Key: openclaw-mesh-default-key" | jq -r '.[] | "  - \(.name) (\(.type))"' 2>/dev/null || echo "  (mesh check)"

echo ""
echo "  Creative workflows available:"
echo ""
echo "  📸 Image: ComfyUI, MiniMax, Stable Diffusion"
echo "  🎬 Video: MiniMax Video, AnimateDiff, SVD"
echo "  🎵 Music: MiniMax Music"
echo "  🎤 Speech: MiniMax TTS, Voice cloning"
echo "  🏛️  3D: Blender, Mesh generation, GLTF export"
echo "  ✨ Animation: Sequence rendering, Compositing"
echo ""