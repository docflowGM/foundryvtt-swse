import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Smoke test for tools/check-full-attack-reroll-guard.mjs: report mode and
// --strict mode must both run cleanly (exit 0) given this Phase 5 pass
// routes all combined-card attack-state writes through
// full-attack-message-state.js, never re-spends shared costs from the
// reroll handler, and never computes attack math in the renderer.
const scriptPath = fileURLToPath(new URL('../tools/check-full-attack-reroll-guard.mjs', import.meta.url));

const reportResult = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
assert.equal(reportResult.status, 0, `check-full-attack-reroll-guard.mjs must exit 0 in report mode. stderr: ${reportResult.stderr}`);
assert.match(reportResult.stdout, /FULL-ATTACK REROLL GUARD/);
assert.match(reportResult.stdout, /Only the state service writes combined-card attack state/);

const strictResult = spawnSync(process.execPath, [scriptPath, '--strict'], { encoding: 'utf8' });
assert.equal(strictResult.status, 0, `check-full-attack-reroll-guard.mjs --strict must currently pass. stderr: ${strictResult.stderr}`);

console.log('check-full-attack-reroll-guard.mjs smoke test passed.');
