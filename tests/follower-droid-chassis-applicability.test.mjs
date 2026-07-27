import assert from 'node:assert/strict';
import {
  isFollowerDroidChassisApplicable,
  getApplicableFollowerDroidChassisOptions
} from '../scripts/apps/progression-framework/steps/follower-droid-chassis-applicability.js';

// PHASE 6 — Consolidate Follower Droid Chargen into One Chassis Step.
//
// Pure extraction of DroidBuilderStep's real, working per-item filtering
// (_systemAllowedBySpeciesConstraints / _applySpeciesDroidConstraintsToPresentation).
// This IS the one applicability engine — investigation confirmed no
// separate/duplicate filtering mechanism exists anywhere else in the
// codebase, and this phase does not introduce a second one (enforced by
// tools/check-follower-droid-chassis-authority.mjs).

// The real follower constraint, copied verbatim from
// FollowerDroidBuilderStep#_getFollowerConstraint so these tests exercise
// the actual production rule shape, not an invented one.
const FOLLOWER_CONSTRAINT = {
  allowedCategories: ['appendage', 'accessory', 'communication', 'compartment', 'sensor', 'translator'],
  allowedAccessorySubcategories: ['communication', 'compartment', 'sensor', 'translator'],
  notes: 'Follower droids use starting credits as a chassis budget. Spend only on appendages, communication systems, compartments, sensors, and translators; unspent credits are lost.'
};

// Test 6: an applicable chassis option is selectable.
{
  assert.equal(isFollowerDroidChassisApplicable(FOLLOWER_CONSTRAINT, { category: 'appendage', id: 'claw-appendage' }), true);
  assert.equal(isFollowerDroidChassisApplicable(FOLLOWER_CONSTRAINT, { category: 'accessory', id: 'darkvision', subcategory: 'sensor' }), true);
}

// Test 7: an inapplicable chassis option is disabled/omitted — follower
// droids may not purchase a different processor or locomotion system
// (only the fixed base chassis + the six allowed categories), confirmed
// against the real constraint's allowedCategories, which excludes both.
{
  assert.equal(isFollowerDroidChassisApplicable(FOLLOWER_CONSTRAINT, { category: 'processor', id: 'military-processor' }), false);
  assert.equal(isFollowerDroidChassisApplicable(FOLLOWER_CONSTRAINT, { category: 'locomotion', id: 'tracked' }), false);
}

// Test 8: an accessory outside the allowed subcategories is rejected even
// though 'accessory' itself is an allowed top-level category — this is
// the actual decision DroidBuilderStep#purchaseSystem consults before
// allowing a direct purchase call to proceed, so a direct (non-UI)
// invocation attempting an inapplicable accessory is rejected the same way.
{
  assert.equal(isFollowerDroidChassisApplicable(FOLLOWER_CONSTRAINT, { category: 'accessory', id: 'grapple-launcher', subcategory: 'weapon' }), false);
}

{
  // An explicit allowedAccessoryIds allowlist further narrows within an
  // allowed subcategory.
  const narrowed = { ...FOLLOWER_CONSTRAINT, allowedAccessoryIds: ['darkvision'] };
  assert.equal(isFollowerDroidChassisApplicable(narrowed, { category: 'accessory', id: 'darkvision', subcategory: 'sensor' }), true);
  assert.equal(isFollowerDroidChassisApplicable(narrowed, { category: 'accessory', id: 'sensor-booster', subcategory: 'sensor' }), false);
}

// Test 9: applicability uses explicit context — no constraint object
// (e.g. ordinary PC droid chargen, which is not a follower at all) means
// unrestricted; passing null must never be conflated with "restrict
// everything".
{
  assert.equal(isFollowerDroidChassisApplicable(null, { category: 'processor', id: 'anything' }), true);
  assert.equal(isFollowerDroidChassisApplicable(undefined, { category: 'locomotion', id: 'anything' }), true);
}

// Tests 11-13: no level/size/role-based restriction exists in current
// follower-constraint data — confirmed by reading _getFollowerConstraint(),
// which returns a fixed object regardless of follower level, size, or
// template. These tests lock in that applicability is unaffected by
// fields the constraint object simply doesn't carry, rather than
// inventing a restriction unsupported by current rules/data.
{
  const sameConstraintRegardlessOfContext = FOLLOWER_CONSTRAINT; // constraint construction never varies by level/size/role
  assert.equal(isFollowerDroidChassisApplicable(sameConstraintRegardlessOfContext, { category: 'appendage', id: 'tool-appendage' }), true);
}

// getApplicableFollowerDroidChassisOptions — presentation-level filtering.

const AVAILABLE = {
  locomotion: [{ id: 'walking' }, { id: 'tracked' }],
  processors: [{ id: 'heuristic' }, { id: 'military' }],
  appendages: [{ id: 'claw-appendage' }],
  accessories: {
    sensor: [{ id: 'darkvision' }, { id: 'sensor-booster' }],
    weapon: [{ id: 'grapple-launcher' }],
    communication: [{ id: 'internal-comlink' }]
  },
  locomotionEnhancements: [{ id: 'speed-boost' }],
  appendageEnhancements: [{ id: 'reinforced-claw' }]
};

{
  const filtered = getApplicableFollowerDroidChassisOptions(AVAILABLE, FOLLOWER_CONSTRAINT);
  assert.deepEqual(filtered.locomotion, [], 'locomotion is not a purchasable category for follower droids');
  assert.deepEqual(filtered.processors, [], 'processor is not a purchasable category for follower droids');
  assert.equal(filtered.appendages.length, 1);
  assert.ok(filtered.accessories.sensor, 'allowed accessory subcategory survives');
  assert.equal(filtered.accessories.weapon, undefined, 'disallowed accessory subcategory is omitted entirely, not just emptied');
  assert.equal(filtered.constraintNote, FOLLOWER_CONSTRAINT.notes);
}

{
  // No constraint (PC chargen path): everything passes through unfiltered.
  const unfiltered = getApplicableFollowerDroidChassisOptions(AVAILABLE, null);
  assert.equal(unfiltered.locomotion, AVAILABLE.locomotion);
  assert.equal(unfiltered.processors, AVAILABLE.processors);
  assert.ok(unfiltered.accessories.weapon, 'unconstrained callers see every accessory subcategory');
}

// Test 20 (array-order auto-selection): filtering returns every applicable
// option, not a single "first" pick — confirms the applicability engine
// never collapses a category down to one auto-selected entry.
{
  const filtered = getApplicableFollowerDroidChassisOptions(AVAILABLE, FOLLOWER_CONSTRAINT);
  assert.equal(filtered.accessories.sensor.length, 2, 'both applicable sensor options remain offered, not just the first');
}

// enhanceFn is applied to whatever survives filtering, in both branches.
{
  const tag = (systems) => systems.map(s => ({ ...s, enhanced: true }));
  const filtered = getApplicableFollowerDroidChassisOptions(AVAILABLE, FOLLOWER_CONSTRAINT, tag);
  assert.ok(filtered.accessories.sensor.every(s => s.enhanced === true));
  const unfiltered = getApplicableFollowerDroidChassisOptions(AVAILABLE, null, tag);
  assert.ok(unfiltered.accessories.weapon.every(s => s.enhanced === true));
}

console.log('Follower droid chassis applicability tests passed.');
