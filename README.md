# Claude Code Statusline

![Claude Code Statusline](preview.svg)

A single-file, zero-config statusline for [Claude Code](https://github.com/anthropics/claude-code). It shows your directory, model, **context window usage**, and **both Claude usage limits** — your **current 5-hour session** and your **weekly** allowance — at a glance. The usage bars read the same data as `/usage`, straight from Anthropic's API. Auto-detects subscription vs API key.

An easy way to keep an eye on your usage at a glance.

## Install

```bash
npx ctxline-claude     # or: bunx ctxline-claude
```

Then restart Claude Code or start a new session. That's it.

<details>
<summary>Other install methods</summary>

**Clone & run the installer:**

```bash
git clone https://github.com/MithunWijayasiri/claudecode-statusline.git
cd claudecode-statusline
./install.sh      # macOS / Linux
./install.ps1     # Windows (PowerShell)
```

**Manual:** download the script, then point `~/.claude/settings.json` at it.

```bash
curl -o ~/.claude/hooks/statusline.js https://raw.githubusercontent.com/MithunWijayasiri/claudecode-statusline/main/statusline.js
chmod +x ~/.claude/hooks/statusline.js
```

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/hooks/statusline.js"
  }
}
```

</details>

## Uninstall

```bash
npx ctxline-claude uninstall
```

Removes the `statusLine` entry from `settings.json` (backed up first, other settings untouched), deletes the hook script, and clears the usage cache. If `settings.json` points at a different statusline, it's left alone.

<details>
<summary>Manual uninstall</summary>

Undo the two things the installer did — remove the `statusLine` block from `~/.claude/settings.json` (a timestamped `settings.json.backup.<n>` exists if you'd rather restore), then delete the script:

```bash
# macOS / Linux
rm ~/.claude/hooks/statusline.js
rm -f ~/.claude/cache/usage-cache.json   # optional: clears cached usage
```

```powershell
# Windows (PowerShell)
Remove-Item "$env:USERPROFILE\.claude\hooks\statusline.js"
Remove-Item "$env:USERPROFILE\.claude\cache\usage-cache.json" -ErrorAction SilentlyContinue
```

</details>

## What it shows

| Segment | Detail |
|---|---|
| **Directory** | Current working directory |
| **Model** | Active Claude model (Opus / Sonnet / Haiku) |
| **Context** | Visual bar of context-window usage |
| **Current** | Live 5-hour session limit + reset countdown (subscription users) |
| **Weekly** | Weekly usage allowance + time until the weekly reset (subscription users) |
| **Task** | The in-progress todo, when there is one |

**Color bands:** 🟢 `<50%` · 🟡 `50–75%` · 🟠 `75–90%` · 🔴 `>90%` (blinking)

## How it works

- **Source** — context comes from Claude Code's session data; both usage bars are fetched from `https://api.anthropic.com/api/oauth/usage` (the `/usage` data — 5-hour and weekly limits). API-key users skip the usage fetch.
- **Adaptive timing** — 1.5s timeout on the first prompt (cold start), 1.2s after (connection reused).
- **Caching** — usage is cached at `~/.claude/cache/usage-cache.json`, shared across sessions. Within 30s the cache renders directly (the API call is skipped); if a live call fails, the last value (up to 10 min old) is shown so the bar never vanishes. The reset countdown recomputes every render.
- **Never breaks** — every failure path falls back silently; the statusline always prints.

## License

MIT

## Credits

Thanks to [@TahaSabir0](https://github.com/TahaSabir0) for the base config. Built for the [Claude Code](https://github.com/anthropics/claude-code) community.
