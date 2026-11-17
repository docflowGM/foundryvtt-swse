import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('the committed certification matrix and the generated data files are current (drift guard)', () => {
  for (const args of [['tools/report-galactic-profile-status.mjs', '--check'], ['tools/build-galactic-profiles.mjs', '--check']]) {
    const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, `${args[0]}: ${r.stderr || r.stdout}`);
  }
});
