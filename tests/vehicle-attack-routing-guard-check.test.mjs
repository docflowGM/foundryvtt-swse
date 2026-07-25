import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Smoke test for tools/check-vehicle-attack-routing-guard.mjs: report mode
// and --strict mode must both run cleanly (exit 0) given this Phase 4 pass
// routes vehicle attacks (named-gunner and abstract-crew) through
// attack-domain-router.js and the shared rollAttack() pipeline.
const scriptPath = fileURLToPath(new URL('../tools/check-vehicle-attack-routing-guard.mjs', import.meta.url));

const reportResult = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });
assert.equal(reportResult.status, 0, `check-vehicle-attack-routing-guard.mjs must exit 0 in report mode. stderr: ${reportResult.stderr}`);
assert.match(reportResult.stdout, /VEHICLE ATTACK ROUTING GUARD/);
assert.match(reportResult.stdout, /no vehicle-actor-BAB or gunner-ability-in-vehicle-formula violations found/);

const strictResult = spawnSync(process.execPath, [scriptPath, '--strict'], { encoding: 'utf8' });
assert.equal(strictResult.status, 0, `check-vehicle-attack-routing-guard.mjs --strict must currently pass. stderr: ${strictResult.stderr}`);

console.log('check-vehicle-attack-routing-guard.mjs smoke test passed.');
