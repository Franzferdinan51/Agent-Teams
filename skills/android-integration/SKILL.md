# Android Agent Integration — AgentTeams v1.0.0

## AI Agent Android Control

### Best Frameworks

| Framework | Description | Best For |
|-----------|-------------|---------|
| **Mobile-use** | General GUI automation for Android | Universal |
| **Android-World** | Benchmark for autonomous tasks | Research |
| **ADB** | Android Debug Bridge | Command access |
| **Appium** | Cross-platform mobile testing | Testing |

### Model Choices for Android

| Model | Why | Provider |
|-------|-----|----------|
| **Gemma 4 31B** | Vision + tool-calling, specifically trained for Android | LM Studio |
| **Gemma 4 e4b-it** | Lightweight, mobile-optimized | LM Studio |
| **kimi-k2.5** | Top-tier vision + coding | API |
| **MiniMax-M2.7** | General agentic tasks | API |

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  ANDROID AGENT CONTROL                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐    │
│  │  Agent     │────▶│   ADB       │────▶│  Android   │    │
│  │  (Gemma4)  │     │  Bridge     │     │  Device    │    │
│  └─────────────┘     └─────────────┘     └─────────────┘    │
│                                                             │
│  Vision: Capture screen → Analyze → Determine action       │
│  Action: Tap, swipe, type, launch app                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Tools

```bash
# ADB Commands (via shell agent)
adb shell "input tap 500 500"     # Tap
adb shell "input swipe 300 500 600 500"  # Swipe
adb shell "input text 'hello'"    # Type
adb shell "am start -n com.app/.Main"  # Launch app
adb shell "screencap -p /sdcard/screen.png"  # Screenshot

# Pull screen to analyze
adb pull /sdcard/screen.png /tmp/phone-screen.png
```

### Screen Analysis Loop

```
1. Capture screen
2. Analyze with vision model (Gemma 4)
3. Determine action (tap, swipe, type)
4. Execute via ADB
5. Repeat until task complete
```

### Android Control Script

```javascript
// android-control.js — Agent controls Android via ADB
const { execSync } = require('child_process');

class AndroidAgent {
    constructor(model = 'gemma-4-31b') {
        this.model = model;
    }

    async capture() {
        execSync('adb shell screencap -p /sdcard/screen.png');
        execSync('adb pull /sdcard/screen.png /tmp/phone-screen.png');
        return '/tmp/phone-screen.png';
    }

    async analyze(screenPath) {
        // Send to vision model
        const vision = await this.visionModel.analyze(screenPath, {
            task: 'What should I tap next to accomplish the goal?'
        });
        return vision.action; // { tap: [x, y], type: 'text', etc. }
    }

    async execute(action) {
        if (action.tap) {
            execSync(`adb shell input tap ${action.tap[0]} ${action.tap[1]}`);
        } else if (action.swipe) {
            execSync(`adb shell input swipe ${action.swipe.join(' ')}`);
        } else if (action.type) {
            execSync(`adb shell input text "${action.type}"`);
        }
    }

    async run(task) {
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts) {
            const screen = await this.capture();
            const action = await this.analyze(screen);
            
            if (action.complete) break;
            
            await this.execute(action);
            await sleep(1000);
            attempts++;
        }
    }
}
```

### Task Examples

| Task | Approach |
|------|----------|
| Take photo | Launch camera → Tap capture |
| Send message | Launch app → Navigate → Type → Send |
| Check notifications | Open notification panel → Read |
| Install app | Open Play Store → Search → Install |
| Run Termux command | Open Termux → Type command |

### AgentTeams Android Integration

Add to `AGENTS.md`:

```bash
# Android control agent
./spawn-agent.sh android "Take a photo and send it to user"

# Multi-agent with Android
./spawn-agent.sh researcher "Find product info on phone"
./spawn-agent.sh android-executor "Screenshot product, extract details"
./spawn-agent.sh writer "Compile findings into report"
```

### Tools for Android Agents

```bash
# Screen capture
adb exec-out screencap -p > screen.png

# Input
adb shell input tap X Y
adb shell input swipe X1 Y1 X2 Y2
adb shell input text "TEXT"

# App management
adb shell am start -n package/activity
adb shell am force-stop package
adb shell pm list packages

# File transfer
adb push local.txt /sdcard/
adb pull /sdcard/screen.png ./
```

## Resources

- Mobile-use: https://github.com/Mobile-Agent-Team/Mobile-Agent
- Android-World: https://androidworld.ai
- ADB Docs: https://developer.android.com/tools/adb

## Version

Added: 2026-04-19
Purpose: Android device control for multi-agent system