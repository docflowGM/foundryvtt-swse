import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Smoke test for tools/check-vehicle-crew-assignment-guard.mjs: report mode
// and --strict mode must both run cleanly (exit 0) given this Phase 6 pass
// wires every crew-action button and station drop zone to a live handler,
// removes the direct vehicle.update() fallback, unifies the station model,
// and keeps attack-operator resolution reading the same crewPositions field
// the assignment service writes.
const scriptPath = fileURLToPath(new URL('../tools/check-vehicle-crew-assignment-guard.mjs', import.meta.url));

const reportResult = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
assert.equal(reportResult.status, 0, `check-vehicle-crew-assignment-guard.mjs must exit 0 in report mode. stderr: ${reportResult.stderr}`);
assert.match(reportResult.stdout, /VEHICLE CREW ASSIGNMENT GUARD/);
assert.match(reportResult.stdout, /no direct actor\/vehicle\.update\(\) mutation/);

const strictResult = spawnSync(process.execPath, [scriptPath, '--strict'], { encoding: 'utf8' });
assert.equal(strictResult.status, 0, `check-vehicle-crew-assignment-guard.mjs --strict must currently pass. stderr: ${strictResult.stderr}`);

console.log('check-vehicle-crew-assignment-guard.mjs smoke test passed.');
