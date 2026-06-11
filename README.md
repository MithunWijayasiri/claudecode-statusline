# Claude Code Enhanced Statusline

![preview](preview.png)

A real-time statusline for [Claude Code](https://github.com/anthropics/claude-code) that shows your current directory, model, context window usage, and session token limits at a glance. The usage bar pulls directly from Anthropic's API, the same data you get from `/usage`, so it's always accurate. One script, zero config. Auto-detects subscription vs API key.

## Why This Statusline

Two metrics have the biggest impact on a Claude Code session: **context window usage** and **remaining session usage**. Model output quality tends to degrade as the context window fills (often called "context rot"), so keeping an eye on it helps you compact or reset at the right time. Session usage tells you how much of your current limit remains, so you can plan work before hitting a reset. This statusline surfaces both at a glance, letting you stay focused on the task rather than guessing where you stand.

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

## Uninstall

### Quick Uninstall (Recommended)

```bash
npx claudecode-statusline uninstall
```

This removes the `statusLine` entry from `~/.claude/settings.json` (backing the file up first, and leaving any other settings intact), deletes `~/.claude/hooks/statusline.js`, and clears the cached usage data. Restart Claude Code afterward. If `settings.json` points to a different statusline, it's left untouched.

### Manual Uninstall

The installer only does two things: it copies `statusline.js` into `~/.claude/hooks/` and adds a `statusLine` block to `~/.claude/settings.json`. To fully remove it, undo both.

1. **Remove the `statusLine` block from `~/.claude/settings.json`.**

   Open the file and delete this section:

   ```json
   "statusLine": {
     "type": "command",
     "command": "node ~/.claude/hooks/statusline.js"
   }
   ```

   (The installer saved a timestamped backup, e.g. `settings.json.backup.<number>`, if you'd rather restore that.)

2. **Delete the script (and optional cache):**

   ```bash
   # macOS / Linux
   rm ~/.claude/hooks/statusline.js
   rm -f ~/.claude/cache/usage-cache.json   # optional: clears cached usage data
   ```

   ```powershell
   # Windows (PowerShell)
   Remove-Item "$env:USERPROFILE\.claude\hooks\statusline.js"
   Remove-Item "$env:USERPROFILE\.claude\cache\usage-cache.json" -ErrorAction SilentlyContinue
   ```

3. **Restart Claude Code** or start a new session. The statusline is gone.

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

- Usage data is cached in `~/.claude/cache/usage-cache.json`, shared across all sessions
- **Cache-first**: within 30 seconds the cache is used directly and the API call is skipped (faster renders, fewer calls)
- **Stale fallback**: if a live API call fails or times out, the last known usage (up to 10 minutes old) is shown instead of disappearing
- The reset countdown is recomputed on every render, so it keeps ticking even when shown from cache

### API Usage

- Fetches from `https://api.anthropic.com/api/oauth/usage`
- Tracks 5-hour session limits
- Shows percentage used + time until reset
- Fails gracefully (no statusline breakage)

## License

MIT

## Credits

Originally created by [@TahaSabir0](https://github.com/TahaSabir0).

Built for the [Claude Code](https://github.com/anthropics/claude-code) community.

---