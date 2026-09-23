import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// V2 combat runtime convergence, Phase 2 (Shields + Damage Reduction).
//
// docs/audits/v2-remaining-work.md's Phase 0 re-verification found
// ActorEngine.rechargeShields(actor, {amount=5}) (actor-engine.js:1485-1508)
// was a correct primitive with ZERO call sites -- the Recharge Shields
// (Mechanics) / Restore Shields (Endurance) skill-use entries in
// ExtraSkillUseRegistry were pure display data. This file exercises the
// dispatch added at skill-use-filter.js's SkillUseFilter, corrected after
// independent review of the first wiring pass found two real bugs:
//
//   Blocker 1 -- mechanics.recharge-shields had no `dc`, so the dispatcher's
//   "!Number.isFinite(dc) -> success" fallback (correct for a skill use with
//   genuinely no DC) incorrectly treated EVERY completed Mechanics roll as
//   successful. The Combat Skills Summary / Scavenger's Guide to Droids both
//   give Recharge Shields a DC 20, same as Restore Shields -- so that DC now
//   lives in the registry entry, not invented, sourced.
//
//   Blocker 2 -- the dispatch always recharged the ROLLER's own shields.
//   That's correct for Endurance/Restore Shields (a droid restores itself),
//   but wrong for Mechanics/Recharge Shields (an operator recharges a
//   vehicle or device they do NOT roll as). resolveShieldRechargeTarget()
//   now distinguishes the two via `selfTarget: true` on the registry entry
//   (Endurance) vs. an explicit vehicleActor/targetActor in options
//   (Mechanics) -- reusing crew-skill-router.js's own `vehicleActor` naming
//   convention (see rollAttack(actor, weapon, { vehicleActor, operator })
//   at crew-skill-router.js:222) rather than inventing a second target
//   selector. No vehicle/device resolved -> fail closed, operator untouched.
//
// Harness note: this repo's foundry-shim test harness globally redirects
// every import of actor-engine.js to tests/helpers/foundry-shim/fakes/actor-engine.fake.mjs
// (see path-loader.mjs) because the real ActorEngine transitively imports
// most of the engine layer and is too heavy to load under plain Node
// (confirmed while writing this file -- importing the real module resolves
// to the fake, with only 7 keys, none of them rechargeShields). That fake's
// scope is documented as droid-conversion-specific, so rather than widen
// it, this file attaches a scoped-to-this-test-run reimplementation of
// rechargeShields onto the SAME cached module object the dispatch code
// imports (ES module specifiers are cached singletons) -- verified
// line-by-line against actor-engine.js:1485-1508: +amount capped at max,
// restored = next - current, max<=0 short-circuits with no mutation. This
// proves the dispatch wiring, DC gating, and target resolution for real.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { SkillUseFilter } = await import('/systems/foundryvtt-swse/scripts/utils/skill-use-filter.js');
const { ActorEngine: FakeActorEngine } = await import(
  '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js'
);

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

function fakeActor(id, shields) {
  return {
    id,
    name: id,
    system: { shields: { ...shields }, derived: { shield: { current: shields.value, max: shields.max, stored: true } } }
  };
}

const ENDURANCE_RESTORE_SHIELDS = { id: 'endurance.restore-shields', name: 'Restore Shields', dc: 20, restoreShieldRating: 5, selfTarget: true };
const MECHANICS_RECHARGE_SHIELDS = { id: 'mechanics.recharge-shields', name: 'Recharge Shields', dc: 20, restoreShieldRating: 5 };

// ── getRestoreShieldRatingAmount: pure lookup, no Foundry dependency ──

{
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({ restoreShieldRating: 5 }), 5);
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({ system: { restoreShieldRating: 5 } }), 5);
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({ _source: { system: { restoreShieldRating: 5 } } }), 5);
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({}), 0, 'skill uses with no restoreShieldRating dispatch nothing');
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({ restoreShieldRating: 0 }), 0);
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({ restoreShieldRating: -5 }), 0, 'negative amounts are rejected, not passed through');
}

// ── resolveShieldRechargeTarget: pure resolution, no Foundry dependency ──

{
  const roller = { id: 'roller' };
  const vehicle = { id: 'vehicle' };
  assert.equal(
    SkillUseFilter.resolveShieldRechargeTarget({ roller, skillUse: ENDURANCE_RESTORE_SHIELDS, options: {} }),
    roller,
    'Endurance (selfTarget) must resolve to the roller'
  );
  assert.equal(
    SkillUseFilter.resolveShieldRechargeTarget({ roller, skillUse: MECHANICS_RECHARGE_SHIELDS, options: { vehicleActor: vehicle } }),
    vehicle,
    'Mechanics must resolve to the explicit vehicleActor, not the roller'
  );
  assert.equal(
    SkillUseFilter.resolveShieldRechargeTarget({ roller, skillUse: MECHANICS_RECHARGE_SHIELDS, options: { targetActor: vehicle } }),
    vehicle,
    'Mechanics accepts the generic targetActor fallback too'
  );
  assert.equal(
    SkillUseFilter.resolveShieldRechargeTarget({ roller, skillUse: MECHANICS_RECHARGE_SHIELDS, options: {} }),
    null,
    'Mechanics with no vehicle/device supplied must fail closed (null), never fall back to the roller'
  );
}

// ── a skill use with no restoreShieldRating never touches ActorEngine ──

{
  installFoundryShimGlobals();
  let called = false;
  FakeActorEngine.rechargeShields = async () => { called = true; };
  const actor = fakeActor('roller', { value: 5, max: 20 });
  await SkillUseFilter._dispatchRestoreShieldRating(actor, { name: 'Jump' }, 15, { total: 20 }, {});
  assert.equal(called, false, 'no restoreShieldRating on the skill use must never dispatch to rechargeShields');
  resetFoundryShimGlobals();
}

// ── 1. Endurance Restore Shields: droid rolls 20+ -> droid itself receives +5 ──

{
  installFoundryShimGlobals();
  const droid = fakeActor('droid-1', { value: 5, max: 20 });
  const calls = attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(droid, ENDURANCE_RESTORE_SHIELDS, 20, { total: 24 }, {});
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, 'droid-1', 'Endurance must recharge the roller itself');
  assert.equal(droid.system.shields.value, 10);
  resetFoundryShimGlobals();
}

// ── 2. Endurance failure: 19 vs DC 20 -> no recharge ──

{
  installFoundryShimGlobals();
  const droid = fakeActor('droid-2', { value: 5, max: 20 });
  const calls = attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(droid, ENDURANCE_RESTORE_SHIELDS, 20, { total: 19 }, {});
  assert.equal(calls.length, 0);
  assert.equal(droid.system.shields.value, 5, 'a failed Endurance check must not recharge the droid');
  resetFoundryShimGlobals();
}

// ── 3. Mechanics Recharge Shields: operator rolls 20+ -> vehicle receives +5, operator untouched ──

{
  installFoundryShimGlobals();
  const operator = fakeActor('operator-1', { value: 5, max: 20 });
  const vehicle = fakeActor('vehicle-1', { value: 5, max: 20 });
  const calls = attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(operator, MECHANICS_RECHARGE_SHIELDS, 20, { total: 20 }, { vehicleActor: vehicle });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, 'vehicle-1', 'Mechanics must recharge the vehicle, not the operator');
  assert.equal(vehicle.system.shields.value, 10, 'the vehicle receives the +5');
  assert.equal(operator.system.shields.value, 5, 'the operator\'s own shields must be completely untouched');
  resetFoundryShimGlobals();
}

// ── DC regression required by review: Mechanics 19/20/25 ──

{
  installFoundryShimGlobals();
  const vehicleFail = fakeActor('vehicle-fail', { value: 5, max: 20 });
  attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(fakeActor('op-a', {}), MECHANICS_RECHARGE_SHIELDS, 20, { total: 19 }, { vehicleActor: vehicleFail });
  assert.equal(vehicleFail.system.shields.value, 5, 'Mechanics total 19 vs DC 20 must not recharge');
  resetFoundryShimGlobals();
}

{
  installFoundryShimGlobals();
  const vehicleExact = fakeActor('vehicle-exact', { value: 5, max: 20 });
  attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(fakeActor('op-b', {}), MECHANICS_RECHARGE_SHIELDS, 20, { total: 20 }, { vehicleActor: vehicleExact });
  assert.equal(vehicleExact.system.shields.value, 10, 'Mechanics total 20 (meets DC exactly) must recharge +5');
  resetFoundryShimGlobals();
}

{
  installFoundryShimGlobals();
  const vehicleBeat = fakeActor('vehicle-beat', { value: 5, max: 20 });
  attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(fakeActor('op-c', {}), MECHANICS_RECHARGE_SHIELDS, 20, { total: 25 }, { vehicleActor: vehicleBeat });
  assert.equal(vehicleBeat.system.shields.value, 10, 'Mechanics total 25 (beats DC) must recharge +5');
  resetFoundryShimGlobals();
}

// ── 4. Mechanics failure: 19 -> neither operator nor vehicle changes ──

{
  installFoundryShimGlobals();
  const operator = fakeActor('operator-2', { value: 5, max: 20 });
  const vehicle = fakeActor('vehicle-2', { value: 5, max: 20 });
  attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(operator, MECHANICS_RECHARGE_SHIELDS, 20, { total: 19 }, { vehicleActor: vehicle });
  assert.equal(operator.system.shields.value, 5);
  assert.equal(vehicle.system.shields.value, 5);
  resetFoundryShimGlobals();
}

// ── 5. Mechanics with no resolvable vehicle/device -> fail closed, operator untouched ──

{
  installFoundryShimGlobals();
  const operator = fakeActor('operator-3', { value: 5, max: 20 });
  let called = false;
  FakeActorEngine.rechargeShields = async () => { called = true; };
  await SkillUseFilter._dispatchRestoreShieldRating(operator, MECHANICS_RECHARGE_SHIELDS, 20, { total: 25 }, {});
  assert.equal(called, false, 'with no vehicle/device resolvable, ActorEngine.rechargeShields must never be called');
  assert.equal(operator.system.shields.value, 5, 'the operator must never be recharged as a fallback');
  resetFoundryShimGlobals();
}

// ── 6. Vehicle already at max: successful check produces 0 restored, max preserved ──

{
  installFoundryShimGlobals();
  const operator = fakeActor('operator-4', { value: 0, max: 0 });
  const vehicle = fakeActor('vehicle-3', { value: 20, max: 20 });
  const calls = attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(operator, MECHANICS_RECHARGE_SHIELDS, 20, { total: 25 }, { vehicleActor: vehicle });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].restored, 0, 'a vehicle already at max SR must restore 0');
  assert.equal(vehicle.system.shields.value, 20, 'max must be preserved, never exceeded');
  resetFoundryShimGlobals();
}

// ── 7. Target vehicle/device has no shield resource: clean warning, no mutation ──

{
  installFoundryShimGlobals();
  const operator = fakeActor('operator-5', { value: 5, max: 20 });
  const vehicleNoShield = fakeActor('vehicle-noshield', { value: 0, max: 0 });
  attachRealRechargeShields();
  await SkillUseFilter._dispatchRestoreShieldRating(operator, MECHANICS_RECHARGE_SHIELDS, 20, { total: 25 }, { vehicleActor: vehicleNoShield });
  assert.equal(vehicleNoShield.system.shields.value, 0, 'a vehicle with no shield resource must not be mutated');
  assert.equal(operator.system.shields.value, 5, 'and the operator must not be recharged instead');
  resetFoundryShimGlobals();
}

// ── 8. all mutation routes exclusively through ActorEngine.rechargeShields ──
// (implicit in every case above: the only path to a shields.value write in
// this file is through attachRealRechargeShields()'s faithful
// reimplementation of the real primitive; no test mutates system.shields
// directly to fake success)

console.log('shield-recharge-skill-dispatch-authority: all assertions passed');
