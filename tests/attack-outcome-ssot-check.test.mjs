import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Smoke test for tools/check-attack-outcome-ssot.mjs: report mode must run
// cleanly (exit 0) regardless of findings — it is a visibility tool, not a
// hard gate, matching tools/check-combat-math-ssot.mjs's convention.
const scriptPath = fileURLToPath(new URL('../tools/check-attack-outcome-ssot.mjs', import.meta.url));
const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });

assert.equal(result.status, 0, `check-attack-outcome-ssot.mjs must exit 0 in report mode. stderr: ${result.stderr}`);
assert.match(result.stdout, /ATTACK OUTCOME SSOT CHECK/);

console.log('check-attack-outcome-ssot.mjs report-mode smoke test passed.');
