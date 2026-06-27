#!/bin/bash
# hive-local.sh — Unified Local AI Stack

VERSION="1.0.0"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        🏠 HIVE LOCAL — Local AI Stack v${VERSION}               ║"
echo "║                                                                  ║"
echo "║        LM Studio • Whisper • TTS • Search • GitHub             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check for command argument
if [ -z "$2" ]; then
    echo "📋 Commands:"
    echo ""
    echo "  🤖 LM STUDIO (Local Models)"
    echo "     $0 lm-status                    Check LM Studio status"
    echo "     $0 chat <prompt>               Chat with local model"
    echo "     $0 complete <prompt>          Text completion"
    echo "     $0 models                      List available models"
    echo ""
    echo "  👁️  VISION"
    echo "     $0 analyze <image> [prompt]    Local vision analysis"
    echo ""
    echo "  🎤 VOICE"
    echo "     $0 transcribe <audio>         Speech → text (Whisper)"
    echo "     $0 tts <text>                 Text → speech (macOS)"
    echo ""
    echo "  🌐 SEARCH"
    echo "     $0 search <query>             Web search"
    echo "     $0 gh-search <query>          GitHub search"
    echo "     $0 find <dir> <pattern>       Find files"
    echo "     $0 grep <dir> <pattern>       Grep in files"
    echo ""
    echo "  📊 EXAMPLES"
    echo "     $0 chat \"Hello, how are you?\""
    echo "     $0 transcribe recording.mp3"
    echo "     $0 search \"latest AI news\""
    echo "     $0 analyze screenshot.png \"What is shown?\""
    echo ""
    echo "⚙️  Configuration:"
    echo "    LM Studio: ${LMSTUDIO_URL:-http://localhost:1234}"
    echo "    TTS Voice: ${VOICE:-default (macOS say)}"
    echo ""
    exit 0
fi

COMMAND="$1"
shift

case "$COMMAND" in
    # LM Studio
    lm-status|lm)
        echo "🤖 Checking LM Studio status..."
        node scripts/hive-local.js lm-status
        ;;
    chat)
        echo "💬 Chatting with local model..."
        node scripts/hive-local.js chat "$@"
        ;;
    complete)
        echo "📝 Generating completion..."
        node scripts/hive-local.js complete "$@"
        ;;
    models)
        echo "📋 Available models..."
        node scripts/hive-local.js lm-status
        ;;
        
    # Vision
    analyze|vision)
        IMAGE="$1"
        PROMPT="${2:-Describe this image in detail.}"
        echo "👁️ Analyzing: $IMAGE"
        node scripts/hive-local.js analyze "$IMAGE" "$PROMPT"
        ;;
        
    # Voice
    transcribe|stt)
        AUDIO="$1"
        if [ -z "$AUDIO" ]; then
            echo "❌ Usage: $0 transcribe <audio-file>"
            exit 1
        fi
        echo "🎤 Transcribing: $AUDIO"
        node scripts/hive-local.js transcribe "$AUDIO"
        ;;
    tts|speak)
        TEXT="$@"
        if [ -z "$TEXT" ]; then
            echo "❌ Usage: $0 tts <text>"
            exit 1
        fi
        echo "🔊 Converting to speech..."
        node scripts/hive-local.js tts "$TEXT"
        ;;
        
    # Search
    search|web)
        QUERY="$@"
        if [ -z "$QUERY" ]; then
            echo "❌ Usage: $0 search <query>"
            exit 1
        fi
        echo "🔍 Searching for: $QUERY"
        node scripts/hive-local.js search "$QUERY"
        ;;
    gh|gh-search|github)
        QUERY="$@"
        if [ -z "$QUERY" ]; then
            echo "❌ Usage: $0 gh-search <query>"
            exit 1
        fi
        echo "🐙 GitHub search: $QUERY"
        node scripts/hive-local.js gh-search "$QUERY"
        ;;
    find|files)
        DIR="$1"
        PATTERN="$2"
        if [ -z "$DIR" ] || [ -z "$PATTERN" ]; then
            echo "❌ Usage: $0 find <directory> <pattern>"
            exit 1
        fi
        echo "📁 Finding: $PATTERN in $DIR"
        node scripts/hive-local.js find "$DIR" "$PATTERN"
        ;;
    grep|ag)
        DIR="$1"
        PATTERN="$2"
        if [ -z "$DIR" ] || [ -z "$PATTERN" ]; then
            echo "❌ Usage: $0 grep <directory> <pattern>"
            exit 1
        fi
        echo "🔎 Grepping: $PATTERN in $DIR"
        node scripts/hive-local.js grep "$DIR" "$PATTERN"
        ;;
        
    *)
        echo "❓ Unknown command: $COMMAND"
        echo "   Run '$0' without arguments for usage"
        ;;
esac