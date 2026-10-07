import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { STATES, CLASSES, classifyOperationKey } from '../tools/lib/weapon-phase-5b-rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const map = read('data/audits/weapon-phase-5b-consumption-map.json');
const census = read('data/audits/weapon-phase-5b-schema-field-census.json');
const mech = read('data/audits/weapon-phase-5b-special-mechanic-consumption.json');

execFileSync('node', ['tools/build-weapon-phase-5b-consumption.mjs', '--check'], { cwd: ROOT });
assert.equal(census.identities, 203);
assert.equal(map.entries.length, census.fields.length, 'every census path has exactly one map entry');
assert.deepEqual(map.invariants, { unclassifiedCertifiedFields: 0, unmappedCertifiedFields: 0, unexplainedCertifiedFields: 0, adapterExposureGaps: 0 });
const seen = new Set();
for (const e of map.entries) {
  assert.ok(!seen.has(e.path), `duplicate ${e.path}`); seen.add(e.path);
  assert.ok(e.classification.length >= 1 && e.classification.every((c) => CLASSES.includes(c)), e.path);
  assert.ok(e.consumers.length >= 1, `${e.path} has a declared consumer or disposition`);
  assert.ok(STATES.includes(e.implementationState), e.path);
  assert.ok(!/TODO|future|maybe/i.test(e.implementationState));
  if (e.runtimeCarried) { assert.ok(e.registryField && e.resolvedProperty, `${e.path} carried by registry and exposed by ResolvedWeapon`); }
  else assert.ok(['VALIDATION_ONLY', 'LEGACY_COMPATIBILITY_ONLY'].includes(e.implementationState), e.path);
}
for (const f of census.fields) assert.ok(seen.has(`${f.namespace}:${f.fieldPath}`), `census path ${f.fieldPath} mapped`);
// every operation.* key resolves to a mechanic family
assert.equal(classifyOperationKey('definitelyNotARealKey'), null, 'unknown operation keys are rejected (fail closed)');
for (const f of census.fields.filter((x) => x.namespace === '3B' && /^operation\.[^.[]+$/.test(x.fieldPath))) assert.ok(classifyOperationKey(f.fieldPath.slice(10)), f.fieldPath);
// special-mechanic families name identities, current support, future consumer, phase
for (const f of mech.families) assert.ok(f.identityCount >= 0 && f.futureConsumer.length && f.migrationPhase && f.currentRuntimeSupport, f.mechanic);
assert.ok(mech.families.length >= 30);
// semantic tags are never an EXECUTION path
for (const e of map.entries.filter((x) => /^4H:(semantic|categories)/.test(x.path))) assert.ok(!e.classification.includes('EXECUTION'), `${e.path} must not be EXECUTION`);
console.log('weapon-runtime-consumption-map: ok');
