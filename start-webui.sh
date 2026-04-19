#!/bin/bash
# Start Hive Nation WebUI

cd "$(dirname "$0")"

echo "🏛️  Starting Hive Nation WebUI..."

# Check if port 3131 is in use
if lsof -Pi :3131 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port 3131 is already in use"
    echo "   Try: lsof -i :3131"
    exit 1
fi

# Start the server
node webui/server.js &
WEBUI_PID=$!

echo "✅ WebUI started!"
echo "   PID: $WEBUI_PID"
echo "   URL: http://localhost:3131"
echo ""
echo "Press Ctrl+C to stop"

# Wait for the process
wait $WEBUI_PID
