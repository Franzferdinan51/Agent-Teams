# Hive CLI + MCP - Cross-Platform Architecture

## Platforms Supported

| Platform | Status | CLI | MCP | Termux API |
|----------|--------|-----|-----|------------|
| macOS | ✅ Ready | ✅ | ✅ | N/A |
| Linux | ✅ Ready | ✅ | ✅ | N/A |
| Termux (Android) | 🔄 In Progress | ✅ | ✅ | ✅ |
| Termux:API | 🔄 In Progress | ✅ | ✅ | ✅ |

## Termux API Integration

### Available Termux:API Commands

| Category | Commands | Use Case |
|----------|----------|----------|
| **Camera** | `termux-camera-photo`, `termux-camera-info` | Plant photos, documents |
| **Contact** | `termux-contact-list` | Contact lookup |
| **GPS/Location** | `termux-location` | Location services |
| **SMS** | `termux-sms-send`, `termux-sms-list` | Messaging |
| **Telephony** | `termux-telephony-cellinfo`, `termux-telephony-deviceinfo` | Phone status |
| **Clipboard** | `termux-clipboard-get`, `termux-clipboard-set` | Copy/paste |
| **Fingerprint** | `termux-fingerprint` | Auth |
| **Media** | `termux-media-player`, `termux-media-scan` | Audio/video |
| **Microphone** | `termux-microphone-record` | Voice input |
| **Notification** | `termux-notification`, `termux-notification-remove` | Alerts |
| **Speech** | `termux-tts-engines`, `termux-tts-speak` | Text-to-speech |
| **Speech-to-text** | `termux-speech-to-text` | Voice input |
| **Torch** | `termux-torch` | Flashlight |
| **USB** | `termux-usb` | USB debugging |
| **Vibrate** | `termux-vibrate` | Haptic feedback |
| **Volume** | `termux-volume` | Audio control |
| **WiFi** | `termux-wifi-connectioninfo`, `termux-wifi-scaninfo` | Network |

## Architecture Plan

```
hive-cli/
├── cli/
│   ├── index.js           # Unified CLI entry point
│   ├── platform-detect.js # Detect OS/environment
│   ├── commands/          # Platform-specific commands
│   │   ├── macos.js
│   │   ├── linux.js
│   │   └── termux.js      # Android/Termux specific
│   └── completions/       # Shell completions
├── mcp/
│   ├── server.js          # MCP server (stdio)
│   ├── tools/             # Tool definitions
│   │   ├── filesystem.js
│   │   ├── process.js
│   │   ├── network.js
│   │   └── termux.js      # Termux API tools
│   └── resources/         # Resources (not tools)
├── lib/
│   ├── config.js          # Config loader
│   ├── models.js          # Model configuration
│   └── storage.js         # Cross-platform storage
└── scripts/
    ├── hive              # Main CLI symlink
    └── setup.sh          # Cross-platform installer
```

## MCP Server Implementation

### Protocol
- **Transport**: stdio (for Claude CLI) + HTTP (for remote)
- **Protocol**: @modelcontextprotocol/sdk
- **Tools**: All Hive scripts exposed as MCP tools

### Tool Categories
1. **Government** - Senate, Congress, Constitution, Law, Orders
2. **Production** - Scoring, Memory, Trace, Budget
3. **Platform** - Camera, SMS, Location, etc. (Termux only)

## Cross-Platform Detection

```javascript
// Platform detection
const platform = {
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  isTermux: process.env.TERMUX === 'true' || 
            fs.existsSync('/data/data/com.termux/files'),
  isAndroid: fs.existsSync('/system/build.prop'),
  hasTermuxAPI: execSync('which termux-camera-photo').success
};
```

## Install Scripts

### Termux (Android)
```bash
# Install termux-api package
pkg install termux-api

# Then use Hive
hive <command>
```

## Implementation Priority

1. ✅ Cross-platform CLI foundation
2. ✅ MCP server (stdio transport)
3. 🔄 Termux API integration
4. 🔄 Platform detection
5. 🔄 Shell completions
6. 🔄 Auto-install for each platform

**Created: 2026-04-19**