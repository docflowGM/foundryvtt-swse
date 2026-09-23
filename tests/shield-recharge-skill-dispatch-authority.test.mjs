import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// V2 combat runtime convergence, Phase 2 (Shields + Damage Reduction).
//
// This is the SECOND correction round. The first pass (docs/audits/
// v2-remaining-work.md) built and tested this dispatch against
// scripts/engine/skills/extra-skill-use-registry.js -- which turned out to
// have exactly one importer (an unrelated feat-eligibility resolver) and
// is NEVER what the character sheet's skill-use roll actually consumes.
// The real registry is scripts/utils/extra-skill-use-registry.js, loading
// packs/extraskilluses.db (falling back to data/extraskilluses.json). That
// registry's real "Recharge shields (trained)" record had a real DC 20 all
// along; what it never had was a `restoreShieldRating` field, a
// `selfTarget`/`requiresDroid` distinction, or a matching droid Endurance
// record at all (confirmed by grepping the entire live compendium).
//
// This file proves the dispatch against the REAL normalized shape: every
// skillUse fixture below is produced by running the REAL
// ExtraSkillUseRegistry._normalize() over REAL compendium doc bytes read
// from packs/extraskilluses.db (not hand-built stand-ins), so a future
// change to that normalization function that breaks these fields would
// fail here too.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { SkillUseFilter } = await import('/systems/foundryvtt-swse/scripts/utils/skill-use-filter.js');
const { ExtraSkillUseRegistry } = await import('/systems/foundryvtt-swse/scripts/utils/extra-skill-use-registry.js');
const { ActorEngine: FakeActorEngine } = await import(
  '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js'
);

const packDocs = readFileSync(new URL('../packs/extraskilluses.db', import.meta.url), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const mechanicsDoc = packDocs.find((doc) => doc._id === '40d3cef8b9d24639');
const enduranceDoc = packDocs.find((doc) => doc._id === 'aba9c6329f20406a');
assert.ok(mechanicsDoc, 'the real Mechanics Recharge Shields record must exist at its stable compendium id');
assert.ok(enduranceDoc, 'the real Endurance Restore Shields (Droid) record must exist at its stable compendium id');

const MECHANICS_RECHARGE_SHIELDS = ExtraSkillUseRegistry._normalize(mechanicsDoc);
const ENDURANCE_RESTORE_SHIELDS = ExtraSkillUseRegistry._normalize(enduranceDoc);

// Sanity-check the real data before testing dispatch logic against it --
// if these ever drift, the failure should point here, not at a confusing
// dispatch-test failure three layers down.
assert.equal(MECHANICS_RECHARGE_SHIELDS.skillKey, 'mechanics');
assert.equal(MECHANICS_RECHARGE_SHIELDS.dc, 20);
assert.equal(MECHANICS_RECHARGE_SHIELDS.trainedOnly, true);
assert.equal(SkillUseFilter.getRestoreShieldRatingAmount(MECHANICS_RECHARGE_SHIELDS), 5);
assert.equal(SkillUseFilter._readSkillUseField(MECHANICS_RECHARGE_SHIELDS, 'selfTarget'), undefined);

assert.equal(ENDURANCE_RESTORE_SHIELDS.skillKey, 'endurance');
assert.equal(ENDURANCE_RESTORE_SHIELDS.dc, 20);
assert.equal(ENDURANCE_RESTORE_SHIELDS.trainedOnly, false, 'the droid Endurance check is not trained-only per RAW, unlike its Mechanics sibling');
assert.equal(SkillUseFilter.getRestoreShieldRatingAmount(ENDURANCE_RESTORE_SHIELDS), 5);
assert.equal(SkillUseFilter._readSkillUseField(ENDURANCE_RESTORE_SHIELDS, 'selfTarget'), true);
assert.equal(SkillUseFilter._readSkillUseField(ENDURANCE_RESTORE_SHIELDS, 'requiresDroid'), true);

/** Faithful reimplementation of actor-engine.js:1485-1508, verified line-by-line. */
function attachRealRechargeShields() {
  const calls = [];
  FakeActorEngine.rechargeShields = async (a, { amount = 5 } = {}) => {
    if (!a) throw new Error('rechargeShields() requires actor');
    const shields = a.system?.shields || {};
    const max = Math.max(
      Number(shields.max ?? shields.rating ?? 0) || 0,
      Number(a.system?.shieldRating ?? 0) || 0,
      Number(a.system?.derived?.shield?.max ?? 0) || 0
    );
    if (max <= 0) return { restored: 0, current: Number(shields.value ?? 0) || 0, max: 0 };
    const current = Number(a.system?.derived?.shield?.current ?? shields.value ?? 0) || 0;
    const next = Math.min(max, current + (Number(amount) || 0));
    const restored = Math.max(0, next - current);
    calls.push({ target: a.id, amount, restored, next });
    if (restored > 0) {
      a.system.shields.value = next;
      if (a.system.derived?.shield) a.system.derived.shield.current = next;
    }
    return { restored, current: next, max };
  };
  return calls;
}

function fakeActor(id, shields, type = 'character') {
  return {
    id,
    name: id,
    type,
    system: { shields: { ...shields }, derived: { shield: { current: shields.value, max: shields.max, stored: true } } }
  };
}

// ── resolveShieldRechargeTarget: pure resolution against real records ──

{
  const droid = fakeActor('droid-1', { value: 5, max: 20 }, 'droid');
  const organic = fakeActor('char-1', { value: 5, max: 20 }, 'character');
  const vehicle = fakeActor('vehicle-1', { value: 5, max: 20 }, 'vehicle');

  assert.equal(
    SkillUseFilter.resolveShieldRechargeTarget({ roller: droid, skillUse: ENDURANCE_RESTORE_SHIELDS, options: {} }),
    droid,
    'a droid roller resolves to itself for the Endurance self-target record'
  );
  assert.equal(
    SkillUseFilter.resolveShieldRechargeTarget({ roller: organic, skillUse: ENDURANCE_RESTORE_SHIELDS, options: {} }),
    null,
    'a non-droid roller must fail closed on the requiresDroid Endurance record, never treated as eligible'
  );
  assert.equal(
    SkillUseFilter.resolveShieldRechargeTarget({ roller: organic, skillUse: MECHANICS_RECHARGE_SHIELDS, options: { vehicleActor: vehicle } }),
    vehicle,
    'Mechanics resolves to the explicit vehicleActor'
  );
  assert.equal(
    SkillUseFilter.resolveShieldRechargeTarget({ roller: organic, skillUse: MECHANICS_RECHARGE_SHIELDS, options: { targetActor: vehicle } }),
    vehicle,
    'Mechanics accepts the generic targetActor fallback too'
  );
  assert.equal(
    SkillUseFilter.resolveShieldRechargeTarget({ roller: organic, skillUse: MECHANICS_RECHARGE_SHIELDS, options: {} }),
    null,
    'Mechanics with no vehicle/device supplied fails closed'
  );
  // Invariant 1, added after review: a non-self-target record can never
  // resolve to the roller, even if a future caller mistakenly passes
  // targetActor: actor -- this is the original defect, closed at the
  // resolver so it cannot be silently reintroduced.
  assert.equal(
    SkillUseFilter.resolveShieldRechargeTarget({ roller: organic, skillUse: MECHANICS_RECHARGE_SHIELDS, options: { targetActor: organic } }),
    null,
    'Mechanics must reject a target that aliases the roller, even if explicitly passed'
  );
  assert.equal(
    SkillUseFilter.resolveShieldRechargeTarget({ roller: organic, skillUse: MECHANICS_RECHARGE_SHIELDS, options: { vehicleActor: organic } }),
    null,
    'the roller-alias rejection applies to vehicleActor too, not just targetActor'
  );
}

// ── findShieldRechargeUse: locates the right record by shape, not label text ──

{
  const uses = [MECHANICS_RECHARGE_SHIELDS, ENDURANCE_RESTORE_SHIELDS];
  assert.equal(SkillUseFilter.findShieldRechargeUse(uses, { selfTarget: false }), MECHANICS_RECHARGE_SHIELDS);
  assert.equal(SkillUseFilter.findShieldRechargeUse(uses, { selfTarget: true }), ENDURANCE_RESTORE_SHIELDS);
  assert.equal(SkillUseFilter.findShieldRechargeUse([], { selfTarget: false }), null);
}

// ── 1/2. Endurance Restore Shields: droid rolls 20+ restores itself; 19 fails ──

{
  installFoundryShimGlobals();
  const droid = fakeActor('droid-2', { value: 5, max: 20 }, 'droid');
  const calls = attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(droid, ENDURANCE_RESTORE_SHIELDS, 20, { total: 24 }, {});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, 'droid-2');
  assert.equal(droid.system.shields.value, 10);
  resetFoundryShimGlobals();
}

{
  installFoundryShimGlobals();
  const droid = fakeActor('droid-3', { value: 5, max: 20 }, 'droid');
  const calls = attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(droid, ENDURANCE_RESTORE_SHIELDS, 20, { total: 19 }, {});
  assert.equal(calls.length, 0);
  assert.equal(droid.system.shields.value, 5);
  resetFoundryShimGlobals();
}

// ── 8. Non-droid attempting Endurance Restore Shields fails closed, even on a successful roll ──

{
  installFoundryShimGlobals();
  const organic = fakeActor('char-2', { value: 5, max: 20 }, 'character');
  let called = false;
  FakeActorEngine.rechargeShields = async () => { called = true; };
  await SkillUseFilter._dispatchRestoreShieldRating(organic, ENDURANCE_RESTORE_SHIELDS, 20, { total: 25 }, {});
  assert.equal(called, false, 'a non-droid must never recharge via the droid-only Endurance record');
  assert.equal(organic.system.shields.value, 5);
  resetFoundryShimGlobals();
}

// ── 3/4. Mechanics Recharge Shields: DC 19/20/25 boundary, vehicle mutated, operator untouched ──

for (const [total, shouldRecharge] of [[19, false], [20, true], [25, true]]) {
  installFoundryShimGlobals();
  const operator = fakeActor('operator-1', { value: 5, max: 20 }, 'character');
  const vehicle = fakeActor('vehicle-2', { value: 5, max: 20 }, 'vehicle');
  const calls = attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(operator, MECHANICS_RECHARGE_SHIELDS, 20, { total }, { vehicleActor: vehicle });
  if (shouldRecharge) {
    assert.equal(calls.length, 1, `total ${total} vs DC 20 must recharge`);
    assert.equal(calls[0].target, 'vehicle-2');
    assert.equal(vehicle.system.shields.value, 10);
  } else {
    assert.equal(calls.length, 0, `total ${total} vs DC 20 must not recharge`);
    assert.equal(vehicle.system.shields.value, 5);
  }
  assert.equal(operator.system.shields.value, 5, 'the operator\'s own shields must never change');
  resetFoundryShimGlobals();
}

// ── 5. Mechanics with no resolvable vehicle/device: fail closed, operator untouched ──

{
  installFoundryShimGlobals();
  const operator = fakeActor('operator-2', { value: 5, max: 20 }, 'character');
  let called = false;
  FakeActorEngine.rechargeShields = async () => { called = true; };
  await SkillUseFilter._dispatchRestoreShieldRating(operator, MECHANICS_RECHARGE_SHIELDS, 20, { total: 25 }, {});
  assert.equal(called, false);
  assert.equal(operator.system.shields.value, 5);
  resetFoundryShimGlobals();
}

// ── 9. Vehicle already at max SR: successful check, 0 restored, max preserved ──

{
  installFoundryShimGlobals();
  const operator = fakeActor('operator-3', { value: 0, max: 0 }, 'character');
  const vehicle = fakeActor('vehicle-3', { value: 20, max: 20 }, 'vehicle');
  const calls = attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(operator, MECHANICS_RECHARGE_SHIELDS, 20, { total: 25 }, { vehicleActor: vehicle });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].restored, 0);
  assert.equal(vehicle.system.shields.value, 20);
  resetFoundryShimGlobals();
}

// ── 10. Target vehicle/device has no shield resource: clean warning, no mutation ──

{
  installFoundryShimGlobals();
  const operator = fakeActor('operator-4', { value: 5, max: 20 }, 'character');
  const vehicleNoShield = fakeActor('vehicle-4', { value: 0, max: 0 }, 'vehicle');
  attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(operator, MECHANICS_RECHARGE_SHIELDS, 20, { total: 25 }, { vehicleActor: vehicleNoShield });
  assert.equal(vehicleNoShield.system.shields.value, 0);
  assert.equal(operator.system.shields.value, 5);
  resetFoundryShimGlobals();
}

console.log('shield-recharge-skill-dispatch-authority: all assertions passed');
