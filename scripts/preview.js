// Renders sample statuslines so CI logs show how it looks on each platform.
// Not a test and not published — just a visual sanity check across OSes.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'statusline.js');
const FAKE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-preview-'));

function render(input) {
  const res = spawnSync(process.execPath, [SCRIPT], {
    input,
    encoding: 'utf8',
    timeout: 5000,
    env: { ...process.env, ANTHROPIC_API_KEY: 'preview', HOME: FAKE_HOME, USERPROFILE: FAKE_HOME }
  });
  return res.stdout || '';
}

function fixture(remaining, dir, model) {
  return JSON.stringify({
    model: { display_name: model },
    workspace: { current_dir: dir },
    session_id: 'preview',
    context_window: { remaining_percentage: remaining }
  });
}

const scenarios = [
  ['green   (20% used)', fixture(80, '/home/me/api-server', 'Haiku 4.5')],
  ['yellow  (58% used)', fixture(42, '/home/me/web-app', 'Sonnet 4.6')],
  ['orange  (72% used)', fixture(28, '/home/me/data-pipeline', 'Opus 4.8')],
  ['red+skull (94% used)', fixture(6, '/home/me/big-refactor', 'Opus 4.8')],
  ['fallback (no/invalid stdin)', '']
];

console.log(`\nStatusline preview — ${os.platform()} ${os.arch()}, node ${process.version}`);
console.log('Note: the usage bar needs a live session and is not shown here.\n');
for (const [label, input] of scenarios) {
  console.log(`  ${label.padEnd(28)} ${render(input)}`);
}
console.log('');
