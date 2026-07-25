import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Smoke test for tools/check-vehicle-crew-runtime-ux-guard.mjs: report mode
// and --strict mode must both run cleanly (exit 0) given this Phase 7 pass
// resolves the redundant crew-panel Attack action, adds deterministic
// weapon-to-station mapping with no implicit fallback, adds the
// ActorEngine-only custom-station service, and fixes the synthetic-token
// base-actor mutation bug.
const scriptPath = fileURLToPath(new URL('../tools/check-vehicle-crew-runtime-ux-guard.mjs', import.meta.url));

const reportResult = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
assert.equal(reportResult.status, 0, `check-vehicle-crew-runtime-ux-guard.mjs must exit 0 in report mode. stderr: ${reportResult.stderr}`);
assert.match(reportResult.stdout, /VEHICLE CREW RUNTIME\/UX GUARD/);
assert.match(reportResult.stdout, /synthetic-token isolation guard present/);

const strictResult = spawnSync(process.execPath, [scriptPath, '--strict'], { encoding: 'utf8' });
assert.equal(strictResult.status, 0, `check-vehicle-crew-runtime-ux-guard.mjs --strict must currently pass. stderr: ${strictResult.stderr}`);

console.log('check-vehicle-crew-runtime-ux-guard.mjs smoke test passed.');
