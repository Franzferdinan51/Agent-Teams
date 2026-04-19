#!/bin/bash
# hive-comfyui.sh — Full ComfyUI Diffusion Control

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🎨 HIVE COMFYUI — Full Diffusion Control v${VERSION}     ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# ComfyUI URL
COMFYUI_URL="${COMFYUI_URL:-http://localhost:8188}"

if [ -z "$2" ]; then
    echo "📋 Commands:"
    echo ""
    echo "  🎨 IMAGE GENERATION"
    echo "     $0 generate <prompt>                Quick generate (Flux)"
    echo "     $0 flux <prompt>                    Flux model"
    echo "     $0 sdxl <prompt>                   Stable Diffusion XL"
    echo "     $0 sd3 <prompt>                    SD3 model"
    echo "     $0 pixart <prompt>                 PixArt model"
    echo ""
    echo "  🔄 IMAGE TO IMAGE"
    echo "     $0 img2img <image> <prompt>        Transform image"
    echo "     $0 inpaint <image> <mask> <prompt> Inpainting"
    echo ""
    echo "  🎬 VIDEO GENERATION"
    echo "     $0 video <image>                   Stable Video Diffusion"
    echo "     $0 svd <image>                    SVD model"
    echo "     $0 mochi <prompt>                 Mochi video"
    echo "     $0 wan <prompt>                   Wan 2.1 video"
    echo "     $0 hunyuan-video <prompt>         Hunyuan Video"
    echo ""
    echo "  🎮 3D GENERATION"
    echo "     $0 3d <image>                     Hunyuan3D 2.0"
    echo ""
    echo "  🎵 AUDIO GENERATION"
    echo "     $0 audio <prompt>                  Stable Audio"
    echo "     $0 music <prompt>                  Music generation"
    echo ""
    echo "  ⬆️  UPSCALING"
    echo "     $0 upscale <image>                 Upscale image"
    echo "     $0 hires <image>                  Hi-res fix"
    echo ""
    echo "  🔧 SYSTEM"
    echo "     $0 status                          System stats"
    echo "     $0 queue                           Current queue"
    echo "     $0 models                         Available models"
    echo "     $0 history                        Generation history"
    echo ""
    echo "  📁 WORKFLOWS"
    echo "     $0 load <name>                     Load workflow"
    echo "     $0 save <name>                     Save workflow"
    echo "     $0 list                            List saved workflows"
    echo ""
    echo "⚙️  ComfyUI URL: $COMFYUI_URL"
    echo ""
    exit 0
fi

COMMAND="$1"
shift

case "$COMMAND" in
    # Image Generation
    generate|gen)
        PROMPT="$@"
        echo "🎨 Generating: \"$PROMPT\""
        node scripts/hive-comfyui.js generate "$PROMPT"
        ;;
    flux)
        PROMPT="$@"
        echo "🎨 Flux: \"$PROMPT\""
        node scripts/hive-comfyui.js flux "$PROMPT"
        ;;
    sdxl)
        PROMPT="$@"
        echo "🎨 SDXL: \"$PROMPT\""
        node scripts/hive-comfyui.js sdxl "$PROMPT"
        ;;
    sd3)
        PROMPT="$@"
        echo "🎨 SD3: \"$PROMPT\""
        node scripts/hive-comfyui.js generate "$PROMPT" --model sd3
        ;;
    pixart)
        PROMPT="$@"
        echo "🎨 PixArt: \"$PROMPT\""
        node scripts/hive-comfyui.js generate "$PROMPT" --model pixart
        ;;
        
    # Image to Image
    img2img|i2i)
        IMAGE="$1"
        PROMPT="${@:2}"
        if [ -z "$IMAGE" ] || [ -z "$PROMPT" ]; then
            echo "❌ Usage: $0 img2img <image> <prompt>"
            exit 1
        fi
        echo "🔄 img2img: \"$PROMPT\""
        node scripts/hive-comfyui.js img2img "$IMAGE" "$PROMPT"
        ;;
    inpaint)
        IMAGE="$1"
        MASK="$2"
        PROMPT="${@:3}"
        if [ -z "$IMAGE" ] || [ -z "$MASK" ] || [ -z "$PROMPT" ]; then
            echo "❌ Usage: $0 inpaint <image> <mask> <prompt>"
            exit 1
        fi
        echo "🎨 Inpainting: \"$PROMPT\""
        node scripts/hive-comfyui.js inpaint "$IMAGE" "$MASK" "$PROMPT"
        ;;
        
    # Video
    video|vid)
        IMAGE="$1"
        if [ -z "$IMAGE" ]; then
            echo "❌ Usage: $0 video <image>"
            exit 1
        fi
        echo "🎬 Generating video..."
        node scripts/hive-comfyui.js video "$IMAGE"
        ;;
    svd)
        IMAGE="$1"
        if [ -z "$IMAGE" ]; then
            echo "❌ Usage: $0 svd <image>"
            exit 1
        fi
        echo "🎬 SVD: \"$IMAGE\""
        node scripts/hive-comfyui.js video "$IMAGE"
        ;;
    mochi)
        PROMPT="$@"
        echo "🎬 Mochi: \"$PROMPT\""
        node scripts/hive-comfyui.js generate "$PROMPT" --type video --model mochi
        ;;
    wan)
        PROMPT="$@"
        echo "🎬 Wan 2.1: \"$PROMPT\""
        node scripts/hive-comfyui.js generate "$PROMPT" --type video --model wan21
        ;;
    hunyuan-video)
        PROMPT="$@"
        echo "🎬 Hunyuan Video: \"$PROMPT\""
        node scripts/hive-comfyui.js generate "$PROMPT" --type video --model hunyuan-video
        ;;
        
    # 3D
    3d|3dgen)
        IMAGE="$1"
        if [ -z "$IMAGE" ]; then
            echo "❌ Usage: $0 3d <image>"
            exit 1
        fi
        echo "🎮 Generating 3D..."
        node scripts/hive-comfyui.js 3d "$IMAGE"
        ;;
        
    # Audio
    audio)
        PROMPT="$@"
        echo "🎵 Audio: \"$PROMPT\""
        node scripts/hive-comfyui.js audio "$PROMPT"
        ;;
    music)
        PROMPT="$@"
        echo "🎵 Music: \"$PROMPT\""
        node scripts/hive-comfyui.js audio "$PROMPT" --type music
        ;;
        
    # Upscaling
    upscale|upscale-image)
        IMAGE="$1"
        if [ -z "$IMAGE" ]; then
            echo "❌ Usage: $0 upscale <image>"
            exit 1
        fi
        echo "⬆️ Upscaling..."
        node scripts/hive-comfyui.js upscale "$IMAGE"
        ;;
    hires|highres)
        IMAGE="$1"
        if [ -z "$IMAGE" ]; then
            echo "❌ Usage: $0 hires <image>"
            exit 1
        fi
        echo "⬆️ Hi-res fix..."
        node scripts/hive-comfyui.js upscale "$IMAGE" --method hires
        ;;
        
    # System
    status|stats|system)
        echo "📊 System stats..."
        node scripts/hive-comfyui.js status
        ;;
    queue)
        echo "📋 Current queue..."
        node scripts/hive-comfyui.js queue
        ;;
    models)
        echo "🤖 Available models..."
        node scripts/hive-comfyui.js models
        ;;
    history)
        echo "📜 Generation history..."
        node scripts/hive-comfyui.js history
        ;;
        
    # Workflows
    load)
        NAME="$1"
        if [ -z "$NAME" ]; then
            echo "❌ Usage: $0 load <workflow-name>"
            exit 1
        fi
        echo "📂 Loading workflow: $NAME"
        node scripts/hive-comfyui.js workflow "$NAME"
        ;;
    save)
        NAME="$1"
        if [ -z "$NAME" ]; then
            echo "❌ Usage: $0 save <workflow-name>"
            exit 1
        fi
        echo "💾 Saving workflow: $NAME"
        node scripts/hive-comfyui.js save "$NAME"
        ;;
    list)
        echo "📁 Saved workflows:"
        ls -la workflows/comfyui/*.json 2>/dev/null || echo "  (none)"
        ;;
        
    *)
        echo "❓ Unknown command: $COMMAND"
        echo "   Run '$0' without arguments for usage"
        ;;
esac