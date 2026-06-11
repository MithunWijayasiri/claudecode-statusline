#!/usr/bin/env node
// Claude Code Enhanced Statusline
// Shows: directory | model | context usage | API usage (5-hour limit) | current task
// Auto-detects API key vs subscription usage
// https://github.com/MithunWijayasiri/claudecode-statusline

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { execSync } = require('child_process');

const IS_API_KEY = !!process.env.ANTHROPIC_API_KEY;

// Cache configuration
const CACHE_DIR = path.join(os.homedir(), '.claude', 'cache');
const USAGE_CACHE_FILE = path.join(CACHE_DIR, 'usage-cache.json');
const CACHE_TTL_MS = 30000; // Cache valid for 30 seconds

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  orange: '\x1b[38;5;208m',
  red: '\x1b[31m',
  blink: '\x1b[5m'
};

function getUsageColor(percentage) {
  if (percentage < 50) return colors.green;
  if (percentage < 75) return colors.yellow;
  if (percentage < 90) return colors.orange;
  return colors.red;
}

function getContextBar(remaining) {
  const effectiveRemaining = remaining ?? 100;
  const used = Math.max(0, Math.min(100, 100 - Math.round(effectiveRemaining)));

  const filled = Math.floor(used / 10);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);

  let coloredBar;
  if (used < 50) {
    coloredBar = `${colors.green}${bar} ${used}%${colors.reset}`;
  } else if (used < 65) {
    coloredBar = `${colors.yellow}${bar} ${used}%${colors.reset}`;
  } else if (used < 80) {
    coloredBar = `${colors.orange}${bar} ${used}%${colors.reset}`;
  } else {
    coloredBar = `${colors.blink}${colors.red}\u{1F480} ${bar} ${used}%${colors.reset}`;
  }

  return coloredBar;
}

// Read cached usage data
function getCachedUsage() {
  try {
    if (!fs.existsSync(USAGE_CACHE_FILE)) return null;

    const cache = JSON.parse(fs.readFileSync(USAGE_CACHE_FILE, 'utf8'));
    const age = Date.now() - cache.timestamp;

    // Return cached data if fresh enough
    if (age < CACHE_TTL_MS) {
      return cache.data;
    }

    return null;
  } catch (e) {
    return null;
  }
}

// Write usage data to cache (shared across all sessions)
function setCachedUsage(data) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    const cache = {
      timestamp: Date.now(),
      data: data
    };

    fs.writeFileSync(USAGE_CACHE_FILE, JSON.stringify(cache), 'utf8');
  } catch (e) {
    // Silently fail
  }
}

function getCredentials() {
  // Try file first (legacy / Linux / Windows)
  const credsPath = path.join(os.homedir(), '.claude', '.credentials.json');
  if (fs.existsSync(credsPath)) {
    try {
      return JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    } catch (e) {}
  }

  // Fallback: macOS keychain
  if (os.platform() === 'darwin') {
    try {
      const raw = execSync('security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null', { encoding: 'utf8', timeout: 1000 });
      return JSON.parse(raw.trim());
    } catch (e) {}
  }

  return null;
}

function getApiUsage(callback) {
  try {
    // Read credentials (file or macOS keychain)
    const creds = getCredentials();
    if (!creds) {
      return callback(null);
    }

    const accessToken = creds.claudeAiOauth?.accessToken;

    if (!accessToken) {
      return callback(null);
    }

    // Adaptive timeout: if cache exists, be faster (1200ms); if not, be patient (1500ms)
    // API typically takes ~850ms, so 1200ms gives reasonable headroom
    const hasCache = fs.existsSync(USAGE_CACHE_FILE);
    const timeout = hasCache ? 1200 : 1500;

    // Make API call with adaptive timeout
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/api/oauth/usage',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'anthropic-beta': 'oauth-2025-04-20'
      },
      timeout: timeout
    }, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const usage = JSON.parse(data);

          // Get 5-hour session usage
          if (usage.five_hour) {
            const percentage = Math.round(usage.five_hour.utilization);
            const resetsAt = usage.five_hour.resets_at;

            // Parse reset time
            let timeStr = '';
            if (resetsAt) {
              const resetDate = new Date(resetsAt);
              const now = new Date();
              const diffMs = resetDate - now;
              const diffMins = Math.floor(diffMs / 60000);
              const hours = Math.floor(diffMins / 60);
              const mins = diffMins % 60;

              if (hours > 0) {
                timeStr = `${hours}h${mins}m`;
              } else {
                timeStr = `${mins}m`;
              }
            }

            // Build bar
            const barWidth = 10;
            const filledWidth = Math.round((percentage / 100) * barWidth);
            const filled = '\u2588'.repeat(filledWidth);
            const empty = '\u2591'.repeat(barWidth - filledWidth);
            const color = getUsageColor(percentage);

            const bar = `${color}${filled}${empty} ${percentage}%${colors.reset}${colors.dim} (${timeStr})${colors.reset}`;

            // Cache the result for other sessions
            setCachedUsage(bar);

            callback(bar);
          } else {
            callback(null);
          }
        } catch (e) {
          callback(null);
        }
      });
    });

    req.on('error', () => callback(null));
    req.on('timeout', () => {
      req.destroy();
      callback(null);
    });

    req.end();
  } catch (e) {
    callback(null);
  }
}

// Get usage with cache fallback
function getUsageWithCache(callback) {
  // First, try to get fresh data from API
  getApiUsage((freshData) => {
    if (freshData) {
      // Got fresh data, use it
      callback(freshData);
    } else {
      // API failed or timed out, try cache
      const cachedData = getCachedUsage();
      callback(cachedData);
    }
  });
}

function getCurrentTask(sessionId) {
  if (!sessionId) return '';

  const homeDir = os.homedir();
  const todosDir = path.join(homeDir, '.claude', 'todos');

  if (!fs.existsSync(todosDir)) return '';

  try {
    const files = fs.readdirSync(todosDir)
      .filter(f => f.startsWith(sessionId) && f.includes('-agent-') && f.endsWith('.json'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > 0) {
      const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
      const inProgress = todos.find(t => t.status === 'in_progress');
      if (inProgress) return inProgress.activeForm || '';
    }
  } catch (e) {}

  return '';
}

// Main
function outputStatus(data, usageBar) {
  try {
    const model = data?.model?.display_name || 'Claude';
    const dir = data?.workspace?.current_dir || process.cwd();
    const dirname = path.basename(dir);
    const sessionId = data?.session_id || '';
    const remaining = data?.context_window?.remaining_percentage;

    const contextBar = getContextBar(remaining);
    const task = getCurrentTask(sessionId);
    const parts = [];
    parts.push(dirname);
    parts.push(model);
    parts.push(`context: ${contextBar}`);

    if (usageBar) {
      parts.push(`usage: ${usageBar}`);
    }

    if (task) parts.push(`${colors.dim}${task}${colors.reset}`);
    process.stdout.write(parts.join(' \u2502 '));
  } catch (e) {
    process.stdout.write('Status unavailable');
  }
}

function outputFallback(usageBar) {
  const contextBar = getContextBar(undefined);
  const parts = ['~', 'Claude', `context: ${contextBar}`];
  if (usageBar) parts.push(`usage: ${usageBar}`);
  process.stdout.write(parts.join(' \u2502 '));
}

// Wrapper that skips usage fetch for API key users
function getUsage(callback) {
  if (IS_API_KEY) {
    callback(null);
  } else {
    getUsageWithCache(callback);
  }
}

// Process with timeout
if (process.stdin.isTTY) {
  getUsage((usageBar) => {
    outputFallback(usageBar);
    process.exit(0);
  });
} else {
  let input = '';
  let timeoutReached = false;

  const overallTimeout = IS_API_KEY ? 500 : (fs.existsSync(USAGE_CACHE_FILE) ? 1300 : 1600);

  const timeout = setTimeout(() => {
    timeoutReached = true;
    getUsage((usageBar) => {
      if (input.length > 0) {
        try {
          const data = JSON.parse(input);
          outputStatus(data, usageBar);
        } catch (e) {
          outputFallback(usageBar);
        }
      } else {
        outputFallback(usageBar);
      }
      process.exit(0);
    });
  }, overallTimeout);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => input += chunk);
  process.stdin.on('end', () => {
    if (timeoutReached) return;
    clearTimeout(timeout);

    getUsage((usageBar) => {
      try {
        const data = JSON.parse(input);
        outputStatus(data, usageBar);
      } catch (e) {
        outputFallback(usageBar);
      }
      process.exit(0);
    });
  });
}
