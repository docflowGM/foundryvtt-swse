import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Smoke test for tools/check-reroll-supersession-guard.mjs: report mode and
// --strict mode must both run cleanly (exit 0) given this pass wired the
// supersession check into every damage-action handler.
const scriptPath = fileURLToPath(new URL('../tools/check-reroll-supersession-guard.mjs', import.meta.url));

const reportResult = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
assert.equal(reportResult.status, 0, `check-reroll-supersession-guard.mjs must exit 0 in report mode. stderr: ${reportResult.stderr}`);
assert.match(reportResult.stdout, /REROLL \/ DAMAGE SUPERSESSION GUARD/);
assert.match(reportResult.stdout, /All damage-action handlers check supersession/);

const strictResult = spawnSync(process.execPath, [scriptPath, '--strict'], { encoding: 'utf8' });
assert.equal(strictResult.status, 0, `check-reroll-supersession-guard.mjs --strict must currently pass. stderr: ${strictResult.stderr}`);

console.log('check-reroll-supersession-guard.mjs smoke test passed.');
