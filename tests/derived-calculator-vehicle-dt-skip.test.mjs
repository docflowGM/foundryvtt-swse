import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 2 — actor data-model authority normalization: the critical half of
// the vehicle damage-threshold authority fix. scripts/actors/v2/
// vehicle-derived-builder.js's buildVehicleDerived() runs synchronously and
// sets system.derived.damageThreshold to the vehicle's own stored value —
// but SWSEV2BaseActor._computeDerivedAsync() then merges whatever
// DerivedCalculator.computeAll() returns into system.derived.* wherever the
// values differ, which (before this fix) included an unconditional,
// character-scale damage-threshold recomputation (Fortitude total + generic
// size bonus — a formula never designed for ships) that ran for every actor
// type including vehicles, silently overwriting the correct vehicle-specific
// value moments after the sync pass set it. The fix in derived-calculator.js
// skips that block entirely for vehicle actors. This test runs the REAL
// DerivedCalculator.computeAll() (via this repo's existing Foundry-shim
// harness) and confirms its return value no longer contains a
// system.derived.damageThreshold key for a vehicle actor — proving the async
// merge has nothing to clobber the sync-phase value with — while confirming
// character actors are completely unaffected.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { DerivedCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js'
);

function baseSystem(overrides = {}) {
  return {
    attributes: {},
    level: 1,
    size: 'medium',
    hp: { max: 10, value: 10 },
    progression: {},
    ...overrides
  };
}

// ── vehicle actors: DerivedCalculator must not emit a damageThreshold update (Test 1) ──

{
  const actor = {
    id: 'veh-dt-test',
    type: 'vehicle',
    _stats: { modifiedTime: 1 },
    system: baseSystem({
      damageThreshold: 42,
      size: 'huge',
      hp: { max: 100, value: 100 },
      // A high Fortitude total here would produce a very different DT if the
      // generic character-scale block ran -- proving it's genuinely skipped,
      // not just coincidentally matching.
      derived: { defenses: { fortitude: { total: 25 } } }
    }),
    items: [],
    effects: []
  };

  const updates = await DerivedCalculator.computeAll(actor);
  assert.equal(
    Object.prototype.hasOwnProperty.call(updates, 'system.derived.damageThreshold'),
    false,
    'DerivedCalculator.computeAll() must not include system.derived.damageThreshold for a vehicle actor'
  );
}

// ── character actors: the DT block must still run normally, unaffected (Test 2) ──

{
  const actor = {
    id: 'char-dt-test',
    type: 'character',
    _stats: { modifiedTime: 1 },
    system: baseSystem(),
    items: [],
    effects: []
  };

  const updates = await DerivedCalculator.computeAll(actor);
  assert.equal(
    Object.prototype.hasOwnProperty.call(updates, 'system.derived.damageThreshold'),
    true,
    'the DT block must still run for character actors'
  );
  assert.equal(typeof updates['system.derived.damageThreshold'], 'number');
}

// ── npc and droid actors: also unaffected — only 'vehicle' is skipped (Test 3) ──

{
  for (const type of ['npc', 'droid']) {
    const actor = {
      id: `${type}-dt-test`,
      type,
      _stats: { modifiedTime: 1 },
      system: baseSystem(),
      items: [],
      effects: []
    };
    const updates = await DerivedCalculator.computeAll(actor);
    assert.equal(
      Object.prototype.hasOwnProperty.call(updates, 'system.derived.damageThreshold'),
      true,
      `the DT block must still run for ${type} actors`
    );
  }
}

console.log('derived-calculator-vehicle-dt-skip.test.mjs: all assertions passed');
