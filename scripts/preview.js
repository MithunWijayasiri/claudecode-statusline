// Renders one real statusline line (including the usage bar) so CI logs and the
// GitHub release show what you actually get in the Claude Code CLI.
//
// The usage bar normally needs a live session. Here we seed a fresh usage cache
// (+ a tokenless credentials file) in a throwaway HOME, so the real statusline.js
// renders the usage segment from cache without any network call.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'statusline.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-preview-'));
process.on('exit', () => fs.rmSync(TMP, { recursive: true, force: true }));

function render({ dir, model, remaining, usage, resetsInMin }) {
  const home = fs.mkdtempSync(path.join(TMP, 'home-'));
  const cacheDir = path.join(home, '.claude', 'cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', '.credentials.json'), '{}'); // no token -> no network
  fs.writeFileSync(path.join(cacheDir, 'usage-cache.json'), JSON.stringify({
    timestamp: Date.now(),                                  // fresh -> cache-first renders it
    data: { percentage: usage, resetsAt: new Date(Date.now() + resetsInMin * 60000).toISOString() }
  }));

  const env = { ...process.env, HOME: home, USERPROFILE: home };
  delete env.ANTHROPIC_API_KEY;                             // let the usage path run

  const res = spawnSync(process.execPath, [SCRIPT], {
    input: JSON.stringify({
      model: { display_name: model },
      workspace: { current_dir: dir },
      session_id: 'preview',
      context_window: { remaining_percentage: remaining }
    }),
    encoding: 'utf8',
    timeout: 5000,
    env
  });

  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`statusline.js exited with ${res.status}\n${res.stderr || ''}`);
  }
  const out = (res.stdout || '').trim();
  if (!out) throw new Error(`statusline.js produced no output\n${res.stderr || ''}`);
  return out;
}

console.log(render({
  dir: '/home/me/my-project',
  model: 'Opus 4.8 (1M context)',
  remaining: 100,   // context 0% used
  usage: 14,
  resetsInMin: 21   // renders ~(20m)
}));
