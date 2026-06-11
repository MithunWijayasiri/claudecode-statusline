// Render tests for statusline.js
// Spawns the real script and asserts on its stdin -> stdout contract.
// Fully self-contained: no network, no credentials, no API key required.

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'statusline.js');

// Empty fake HOME so the todos/credentials lookups find nothing -> deterministic.
const FAKE_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-test-'));

// Run statusline.js with the given stdin string. Returns { code, raw, clean }.
function run(input) {
  const res = spawnSync(process.execPath, [SCRIPT], {
    input,
    encoding: 'utf8',
    timeout: 5000,
    env: {
      ...process.env,
      ANTHROPIC_API_KEY: 'test',   // skip the usage fetch (existence is all the script checks)
      HOME: FAKE_HOME,             // *nix: no ~/.claude
      USERPROFILE: FAKE_HOME       // Windows: no ~/.claude
    }
  });
  const raw = res.stdout || '';
  const clean = raw.replace(/\x1b\[[0-9;]*m/g, ''); // strip ANSI for readable assertions
  return { code: res.status, raw, clean };
}

function fixture(remaining, dir = '/tmp/myproject', model = 'Opus 4.8') {
  return JSON.stringify({
    model: { display_name: model },
    workspace: { current_dir: dir },
    session_id: 'test-session',
    context_window: { remaining_percentage: remaining }
  });
}

// ANSI color codes the script emits (kept in sync with statusline.js `colors`).
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const ORANGE = '\x1b[38;5;208m';
const RED = '\x1b[31m';
const BLINK = '\x1b[5m';

test('line assembly: dir basename | model | context, separated by │', () => {
  const { code, clean } = run(fixture(40, '/home/me/cool-project', 'Sonnet 4.6'));
  assert.strictEqual(code, 0);
  const parts = clean.split(' │ ');
  assert.strictEqual(parts[0], 'cool-project');        // basename only
  assert.strictEqual(parts[1], 'Sonnet 4.6');          // model passes through
  assert.match(parts[2], /^context: /);
});

test('context bar shows used% = 100 - remaining', () => {
  const { clean } = run(fixture(65));
  assert.match(clean, /context: .* 35%/);              // remaining 65 -> used 35
});

test('threshold: used < 50 is green', () => {
  const { raw } = run(fixture(60));                    // used 40
  assert.ok(raw.includes(GREEN), 'expected green color code');
});

test('threshold: 50 <= used < 65 is yellow', () => {
  const { raw } = run(fixture(40));                    // used 60
  assert.ok(raw.includes(YELLOW), 'expected yellow color code');
});

test('threshold: 65 <= used < 80 is orange', () => {
  const { raw } = run(fixture(25));                    // used 75
  assert.ok(raw.includes(ORANGE), 'expected orange color code');
});

test('threshold: used >= 80 is blinking red with skull', () => {
  const { raw, clean } = run(fixture(10));             // used 90
  assert.ok(raw.includes(BLINK) && raw.includes(RED), 'expected blink + red');
  assert.ok(clean.includes('\u{1F480}'), 'expected skull emoji');
  assert.match(clean, / 90%/);
});

// The contract that must never break: always print, always exit 0.
test('empty stdin -> fallback line, exit 0', () => {
  const { code, clean } = run('');
  assert.strictEqual(code, 0);
  assert.ok(clean.includes('│'), 'expected a separator in fallback');
  assert.ok(clean.includes('context:'), 'expected context label in fallback');
});

test('malformed JSON -> fallback line, exit 0', () => {
  const { code, clean } = run('not json at all');
  assert.strictEqual(code, 0);
  assert.ok(clean.includes('context:'));
});

test('missing fields -> no crash, exit 0', () => {
  const { code, clean } = run('{}');
  assert.strictEqual(code, 0);
  assert.ok(clean.includes('Claude'));                 // default model name
  assert.ok(clean.includes('context:'));
});
