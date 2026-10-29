import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { sha256Utf8, digestUniversalVehicleSource } from '../scripts/domain/vehicles/vehicle-source-digest.js';
import { classifyVehicleActorSource } from '../scripts/domain/vehicles/vehicle-runtime-contract.js';

const records = [...buildUniversalVehiclePackSources().output.values()].flat();
const expected = s => createHash('sha256').update(s, 'utf8').digest('hex');

test('portable synchronous SHA256 matches Node crypto for known vectors and unicode', () => {
  for (const value of ['', 'abc', 'The quick brown fox jumps over the lazy dog',
    'ëc😎 🚀 仮', '{"a":1,"name":"X-wing"}']) {
    assert.equal(sha256Utf8(value), expected(value));
  }
});

test('all 429 published vehicle source records match exact 4B SHA256 evidence', () => {
  assert.equal(records.length, 429);
  for (const actor of records) {
    const claim = actor.flags.swse.universalVehicleSource;
    assert.equal(digestUniversalVehicleSource(claim.source),
      claim.recordDigest, actor.system.vehicleSourceEntryKey);
    assert.equal(classifyVehicleActorSource(actor).kind, 'canonical',
      actor.system.vehicleSourceEntryKey);
  }
});

test('source-only evidence cannot be mutated behind an unchanged digest', () => {
  const original = records[0];
  for (const mutate of [
    r => { r.crew = { ...r.crew, crewCount: 999 }; },
    r => { r.capacity = { ...r.capacity, passengerCount: 999 }; },
    r => { r.economics = { ...r.economics, priceNew: { status: 'priced', amountCredits: 1 } }; },
    r => { r.movement = { ...r.movement, raw: '99 squares' }; },
    r => { r.armament = { ...r.armament, firingGroups: [] }; },
    r => { r.classification = { ...r.classification, printedSize: 'Diminutive' }; }
  ]) {
    const bad = structuredClone(original);
    mutate(bad.flags.swse.universalVehicleSource.source);
    const result = classifyVehicleActorSource(bad);
    assert.equal(result.kind, 'invalid-canonical', result.errors.join(','));
    assert.ok(result.errors.includes('SOURCE_RECORD_DIGEST_DRIFT'), result.errors.join(','));
  }
});
