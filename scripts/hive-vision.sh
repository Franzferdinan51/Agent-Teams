#!/bin/bash
# hive-vision.sh — Multi-Model Vision Analysis

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        👁️ HIVE VISION — Multi-Model Vision Analysis v${VERSION}   ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check for image argument
if [ -z "$2" ]; then
    echo "📸 Usage:"
    echo "   $0 screen                          Capture screenshot"
    echo "   $0 webcam                          Capture webcam"
    echo "   $0 analyze <image> [prompt]       Analyze image"
    echo "   $0 screen-analyze [prompt]         Screen + analyze"
    echo "   $0 growth <image>                  Plant/grow analysis"
    echo "   $0 chart <image>                    Chart/graph analysis"
    echo "   $0 document <image>                Document analysis"
    echo "   $0 receipt <image>                 Receipt extraction"
    echo "   $0 compare <img1> <img2>          Compare images"
    echo "   $0 models                          List vision models"
    echo ""
    echo "📁 Screenshots saved to: /tmp/hive-vision/"
    echo ""
    exit 0
fi

COMMAND="$1"
shift

case "$COMMAND" in
    screen)
        echo "📸 Capturing screenshot..."
        node scripts/hive-vision.js screen
        ;;
    webcam)
        echo "📷 Capturing webcam..."
        node scripts/hive-vision.js webcam
        ;;
    analyze)
        IMAGE="$1"
        PROMPT="${2:-Describe this image in detail.}"
        echo "👁️ Analyzing: $IMAGE"
        echo "📝 Prompt: $PROMPT"
        echo ""
        node scripts/hive-vision.js analyze "$IMAGE" "$PROMPT"
        ;;
    screen-analyze)
        PROMPT="${1:-Describe what you see on screen.}"
        echo "👁️ Capturing and analyzing screen..."
        echo "📝 Prompt: $PROMPT"
        echo ""
        node scripts/hive-vision.js screen-analyze "$PROMPT"
        ;;
    growth)
        IMAGE="$1"
        echo "🌿 Analyzing plant/grow: $IMAGE"
        echo ""
        node scripts/hive-vision.js growth "$IMAGE"
        ;;
    chart)
        IMAGE="$1"
        echo "📊 Analyzing chart: $IMAGE"
        echo ""
        node scripts/hive-vision.js chart "$IMAGE"
        ;;
    document)
        IMAGE="$1"
        echo "📄 Analyzing document: $IMAGE"
        echo ""
        node scripts/hive-vision.js document "$IMAGE"
        ;;
    receipt)
        IMAGE="$1"
        echo "🧾 Extracting receipt data: $IMAGE"
        echo ""
        node scripts/hive-vision.js receipt "$IMAGE"
        ;;
    compare)
        IMG1="$1"
        IMG2="$2"
        PROMPT="${3:-Compare these images.}"
        echo "🔍 Comparing: $IMG1 vs $IMG2"
        echo ""
        node scripts/hive-vision.js compare "$IMG1" "$IMG2" "$PROMPT"
        ;;
    models)
        echo "📋 Available vision models:"
        echo ""
        node scripts/hive-vision.js models
        ;;
    *)
        echo "❓ Unknown command: $COMMAND"
        echo "   Run '$0' without arguments for usage"
        ;;
esac