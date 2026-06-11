# Claude Code Enhanced Statusline

![preview](preview.png)

A real-time statusline for [Claude Code](https://github.com/anthropics/claude-code) that shows your current directory, model, context window usage, and session token limits at a glance. The usage bar pulls directly from Anthropic's API, the same data you get from `/usage`, so it's always accurate. One script, zero config. Auto-detects subscription vs API key.

## Why This Statusline

There are only two things that really matter when vibe-coding: **Context Window** and **Usage** left in your session. Context matters because models have been shown to perform worse as context grows (context rot), and usage matters so you can squeeze every last token out of your session instead of leaving value on the table. This statusline keeps both front and center so you can focus on building.

## Requirements

- [Claude Code](https://github.com/anthropics/claude-code) installed
- Node.js (comes with Claude Code)
- Authenticated Claude account (for usage tracking on subscription plans)

## Installation

### Quick Install (Recommended)

```bash
npx claudecode-statusline
```

Or with bun:

```bash
bunx claudecode-statusline
```

Restart Claude Code or start a new session.

### Clone & Install

```bash
git clone https://github.com/MithunWijayasiri/claudecode-statusline.git
cd claudecode-statusline

# macOS / Linux
./install.sh

# Windows (PowerShell)
./install.ps1
```

### Manual Install

1. **Download the script:**

   ```bash
   curl -o ~/.claude/hooks/statusline.js https://raw.githubusercontent.com/MithunWijayasiri/claudecode-statusline/main/statusline.js
   ```

2. **Make it executable:**

   ```bash
   chmod +x ~/.claude/hooks/statusline.js
   ```

3. **Update Claude Code settings:**

   Edit `~/.claude/settings.json` and add/modify the `statusLine` section:

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node ~/.claude/hooks/statusline.js"
     }
   }
   ```

4. **Restart Claude Code** or start a new session.

## Features

- **Context Usage**: Visual bar showing token usage (green → yellow → orange → red)
- **API Usage**: Real-time 5-hour session limit tracking with countdown timer (subscription users)
- **Current Directory**: Shows your working directory
- **Model Name**: Displays which Claude model you're using (Opus, Sonnet, Haiku)
- **Auto-Detection**: Detects API key vs subscription and adapts automatically
- **Adaptive Performance**: Fast after first prompt (1.2s vs 1.5s)
- **Smart Caching**: Shares usage data across sessions, fallback on API timeout

**Color Coding:**

- 🟢 Green: < 50% usage
- 🟡 Yellow: 50-75% usage
- 🟠 Orange: 75-90% usage
- 🔴 Red (blinking): > 90% usage

## How It Works

### Adaptive Timing

- **First prompt**: Uses 1500ms timeout (cold start, OAuth validation)
- **Subsequent prompts**: Uses 1200ms timeout (faster, connection reused)
- **Result**: Smooth experience after initial setup

### Caching System

- Usage data is cached for 30 seconds in `~/.claude/cache/usage-cache.json`
- All sessions share the same cache
- If API call times out, shows cached data (no lag)

### API Usage

- Fetches from `https://api.anthropic.com/api/oauth/usage`
- Tracks 5-hour session limits
- Shows percentage used + time until reset
- Fails gracefully (no statusline breakage)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

Created by [@MithunWijayasiri](https://github.com/MithunWijayasiri)

Built for the [Claude Code](https://github.com/anthropics/claude-code) community.

---

**Star ⭐ this repo if you find it useful!**
