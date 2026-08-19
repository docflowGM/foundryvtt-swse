import assert from 'node:assert/strict';
import { coerceVehicleHp, buildVehicleDerived } from '../scripts/actors/v2/vehicle-derived-builder.js';

// Phase 2 — actor data-model authority normalization: vehicle HP/hull and
// damage-threshold authority fixes. See
// docs/audits/v2-phase-2-actor-authority-normalization.md, "Vehicle HP/hull"
// and "Damage Threshold" sections for the full evidence trail.

// ── coerceVehicleHp: system.hp is now the authority when both hp and hull
// are present, since ActorEngine.applyDamage() only ever writes system.hp —
// a legacy system.hull mirror goes stale the moment a vehicle takes damage
// (Test 1) ───────────────────────────────────────────────────────────────

{
  // Simulates a legacy-imported vehicle that has taken damage since import:
  // hp reflects the real current state, hull is the stale import-time snapshot.
  const system = {
    hp: { value: 40, max: 100, temp: 0 },
    hull: { value: 100, max: 100, temp: 0 }
  };
  const result = coerceVehicleHp(system);
  assert.equal(result.value, 40, 'must read the live, damage-tracked system.hp.value, not the stale system.hull.value');
  assert.equal(result.max, 100);
}

// ── coerceVehicleHp: hull remains the fallback when hp is entirely absent (Test 2) ──

{
  const system = { hull: { value: 55, max: 80, temp: 5 } };
  const result = coerceVehicleHp(system);
  assert.deepEqual(result, { value: 55, max: 80, temp: 5 }, 'hull must still be read when hp is not present at all');
}

// ── coerceVehicleHp: freshly-created vehicle (schema default hp, no hull) reads hp (Test 3) ──

{
  const system = { hp: { value: 100, max: 100, temp: 0 } };
  const result = coerceVehicleHp(system);
  assert.deepEqual(result, { value: 100, max: 100, temp: 0 });
}

// ── coerceVehicleHp: at import time hp and hull are identical (vehicle-import-
// normalizer.js writes both with the same values) — both priority orders agree
// here, confirming the fix changes nothing for a freshly-imported, undamaged
// vehicle (Test 4) ──────────────────────────────────────────────────────────

{
  const system = {
    hp: { value: 100, max: 100, temp: 0 },
    hull: { value: 100, max: 100, temp: 0 }
  };
  const result = coerceVehicleHp(system);
  assert.deepEqual(result, { value: 100, max: 100, temp: 0 });
}

// ── coerceVehicleHp: max always stays finite and > 0 even with garbage input (Test 5) ──

{
  assert.equal(coerceVehicleHp({}).max, 1);
  assert.equal(coerceVehicleHp({ hp: { max: 0 } }).max, 1);
  assert.equal(coerceVehicleHp({ hp: { max: -5 } }).max, 1);
}

// ── buildVehicleDerived: damage threshold is written to BOTH the nested
// (system.derived.damage.threshold) and flat (system.derived.damageThreshold)
// paths with the identical vehicle-specific value, so combat-facing readers
// of the flat field (ThresholdEngine, rolls/defenses.js) see the same number
// the vehicle sheet displays (Test 6) ───────────────────────────────────────

{
  const system = { damageThreshold: 42, derived: {} };
  buildVehicleDerived({ id: 'veh1', type: 'vehicle', system }, system);
  assert.equal(system.derived.damage.threshold, 42);
  assert.equal(system.derived.damageThreshold, 42, 'the flat field must mirror the same vehicle-specific value as the nested field');
}

{
  // Falls back to system.threshold, then the hardcoded default, identically on both paths.
  const system = { threshold: 17, derived: {} };
  buildVehicleDerived({ id: 'veh2', type: 'vehicle', system }, system);
  assert.equal(system.derived.damage.threshold, 17);
  assert.equal(system.derived.damageThreshold, 17);
}

{
  const system = { derived: {} };
  buildVehicleDerived({ id: 'veh3', type: 'vehicle', system }, system);
  assert.equal(system.derived.damage.threshold, 10, 'default DT of 10 when nothing is stored');
  assert.equal(system.derived.damageThreshold, 10);
}

console.log('vehicle-hp-hull-dt-authority.test.mjs: all assertions passed');
