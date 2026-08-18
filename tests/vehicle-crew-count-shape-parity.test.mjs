import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 2 — actor data-model authority normalization. system.crew is
// confirmed to exist in at least four live shapes in this codebase (see
// docs/audits/v2-phase-2-actor-authority-normalization.md, "Vehicle source
// authority map — crew"): an Array (template.json schema default), a String
// (compendium imports, e.g. "2 (Normal Crew Quality )"), a Number
// (shipyard-built starships via vehicle-factory.js/data/stock-ships.json),
// and an Object ({occupied,total,quality,passenger}, from
// vehicle-import-normalizer.js's normalizeCrew()). Before this fix,
// resolveVehicleCrewStations()'s internal numberOrNull(vehicle.crew) used a
// bare Number(value), which silently returned null for the String and
// Object shapes — the two MOST COMMON real-world shapes — degrading
// facts.largeCrew/multiCrew to an incorrect "small crew" reading for any
// compendium-imported or properly import-normalized vehicle. These tests
// exercise the real production function (via this repo's existing
// Foundry-shim harness) against all four shapes and confirm the crew-size
// facts are now shape-independent.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { resolveVehicleCrewStations } = await import(
  '/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/crew-resolver.js'
);

function factsFor(crew) {
  return resolveVehicleCrewStations({ system: { crew } }).facts;
}

// ── Number shape (shipyard-built starships) — already worked before the fix (Test 1) ──

{
  const facts = factsFor(4);
  assert.equal(facts.largeCrew, true, 'crew: 4 must read as a large crew (> 2)');
  assert.equal(facts.multiCrew, true, 'crew: 4 must read as a multi-crew (> 1)');
}

// ── String shape (compendium imports) — was silently broken (Test 2) ───────

{
  const facts = factsFor('2 (Normal Crew Quality )');
  assert.equal(facts.multiCrew, true, "crew: '2 (Normal Crew Quality )' must still read as multi-crew (> 1) after parsing the leading number");
  assert.equal(facts.largeCrew, false, "crew of 2 is not > 2, must not read as a large crew");
}

{
  const facts = factsFor('5000');
  assert.equal(facts.largeCrew, true, "a bare numeric string must still parse correctly");
}

// ── Object shape (import-normalized vehicles) — was silently broken (Test 3) ──

{
  const facts = factsFor({ occupied: 3, total: 4, quality: 'skilled', passenger: 0 });
  assert.equal(facts.largeCrew, true, 'an object shape with total: 4 must read as a large crew (> 2)');
  assert.equal(facts.multiCrew, true);
}

{
  // occupied-only object (no `total`) — the resolver should still find a number.
  const facts = factsFor({ occupied: 2 });
  assert.equal(facts.multiCrew, true, 'an object with only `occupied` must still resolve a crew count');
}

// ── Array shape (schema default for a freshly-created vehicle) — legitimate zero (Test 4) ──

{
  const facts = factsFor([]);
  assert.equal(facts.largeCrew, false);
  assert.equal(facts.multiCrew, false, 'an empty array (fresh vehicle, no crew configured yet) must read as zero crew, not throw or misparse');
}

// ── Absent/null crew — must not throw (Test 5) ──────────────────────────────

{
  assert.doesNotThrow(() => factsFor(undefined));
  assert.doesNotThrow(() => factsFor(null));
  const facts = factsFor(null);
  assert.equal(facts.largeCrew, false);
  assert.equal(facts.multiCrew, false);
}

// ── Malformed string shape must not throw, degrades to null/zero cleanly (Test 6) ──

{
  assert.doesNotThrow(() => factsFor('no numbers here at all'));
  const facts = factsFor('no numbers here at all');
  assert.equal(facts.largeCrew, false);
  assert.equal(facts.multiCrew, false);
}

console.log('vehicle-crew-count-shape-parity.test.mjs: all assertions passed');
