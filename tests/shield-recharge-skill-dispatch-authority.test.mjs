import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// V2 combat runtime convergence, Phase 2 (Shields + Damage Reduction).
//
// docs/audits/v2-remaining-work.md's Phase 0 re-verification found
// ActorEngine.rechargeShields(actor, {amount=5}) (actor-engine.js:1485-1508)
// was a correct, tested-by-code-review primitive with ZERO call sites —
// the Recharge Shields (Mechanics) / Restore Shields (Endurance) skill-use
// entries in ExtraSkillUseRegistry were pure display data, and the actual
// skill-check flow (SkillUseFilter.rollSkillUseApplication ->
// rollSkillCheck) never dispatched to it after a successful roll. This
// file exercises the new dispatch added at skill-use-filter.js's
// SkillUseFilter._dispatchRestoreShieldRating() / getRestoreShieldRatingAmount().
//
// Harness note: this repo's foundry-shim test harness globally redirects
// every import of actor-engine.js to tests/helpers/foundry-shim/fakes/actor-engine.fake.mjs
// (see path-loader.mjs) because the real ActorEngine transitively imports
// most of the engine layer and is too heavy to load under plain Node
// (documented in that fake's own header, and independently confirmed
// while writing this file — importing the real module resolves to the
// fake with only 7 keys, none of them rechargeShields). That fake's scope
// is documented as droid-conversion-specific, so rather than widen it,
// this file attaches a scoped-to-this-test-run reimplementation of
// rechargeShields onto the SAME cached module object the dispatch code
// will import (ES module specifiers are cached singletons, so mutating
// the object here is visible to skill-use-filter.js's own dynamic
// import of the identical path) -- verified line-by-line against
// actor-engine.js:1485-1508: +amount capped at max, restored = next -
// current, no-op update when nothing changes, max<=0 short-circuits with
// no mutation. This proves the DISPATCH wiring and gating logic for
// real; the primitive's own math is unit-testable directly since it is a
// pure function with no Foundry dependency (see below).

registerFoundryPathLoader();
installFoundryShimGlobals();

const { SkillUseFilter } = await import('/systems/foundryvtt-swse/scripts/utils/skill-use-filter.js');
const { ActorEngine: FakeActorEngine } = await import(
  '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js'
);

/** Faithful reimplementation of actor-engine.js:1485-1508, verified line-by-line. */
function attachRealRechargeShields(actor) {
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
    calls.push({ amount, restored, next });
    if (restored > 0) {
      a.system.shields.value = next;
      if (a.system.derived?.shield) a.system.derived.shield.current = next;
    }
    return { restored, current: next, max };
  };
  return calls;
}

function fakeActor(shields) {
  return {
    id: 'actor-1',
    name: 'Test Actor',
    system: { shields: { ...shields }, derived: { shield: { current: shields.value, max: shields.max, stored: true } } }
  };
}

// ── getRestoreShieldRatingAmount: pure lookup, no Foundry dependency ──

{
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({ restoreShieldRating: 5 }), 5);
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({ system: { restoreShieldRating: 5 } }), 5);
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({ _source: { system: { restoreShieldRating: 5 } } }), 5);
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({}), 0, 'skill uses with no restoreShieldRating dispatch nothing');
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({ restoreShieldRating: 0 }), 0);
  assert.equal(SkillUseFilter.getRestoreShieldRatingAmount({ restoreShieldRating: -5 }), 0, 'negative amounts are rejected, not passed through');
}

// ── a skill use with no restoreShieldRating never touches ActorEngine ──

{
  installFoundryShimGlobals();
  let called = false;
  FakeActorEngine.rechargeShields = async () => { called = true; };
  const actor = fakeActor({ value: 5, max: 20 });
  await SkillUseFilter._dispatchRestoreShieldRating(actor, { name: 'Jump' }, 15, { total: 20 });
  assert.equal(called, false, 'no restoreShieldRating on the skill use must never dispatch to rechargeShields');
  resetFoundryShimGlobals();
}

// ── a failed roll (total < dc) never dispatches, even with restoreShieldRating present ──

{
  installFoundryShimGlobals();
  let called = false;
  FakeActorEngine.rechargeShields = async () => { called = true; };
  const actor = fakeActor({ value: 5, max: 20 });
  await SkillUseFilter._dispatchRestoreShieldRating(actor, { restoreShieldRating: 5 }, 20, { total: 12 });
  assert.equal(called, false, 'Restore Shields must not recharge on a failed check');
  resetFoundryShimGlobals();
}

// ── a successful roll (total >= dc) dispatches exactly amount=5 to the real primitive ──

{
  installFoundryShimGlobals();
  const actor = fakeActor({ value: 5, max: 20 });
  const calls = attachRealRechargeShields(actor);
  await SkillUseFilter._dispatchRestoreShieldRating(actor, { restoreShieldRating: 5 }, 20, { total: 24 });
  assert.equal(calls.length, 1, 'a successful Restore Shields check must dispatch exactly once');
  assert.equal(calls[0].amount, 5);
  assert.equal(actor.system.shields.value, 10, 'shield value must be persisted as current + 5');
  resetFoundryShimGlobals();
}

// ── recharge caps at max, never exceeds it ──

{
  installFoundryShimGlobals();
  const actor = fakeActor({ value: 18, max: 20 });
  attachRealRechargeShields(actor);
  await SkillUseFilter._dispatchRestoreShieldRating(actor, { restoreShieldRating: 5 }, null, { total: 15 });
  assert.equal(actor.system.shields.value, 20, 'recharge must cap at max (18+5=23 clamped to 20), never overshoot');
  resetFoundryShimGlobals();
}

// ── an actor with no valid shield resource (max<=0) fails cleanly, no mutation ──

{
  installFoundryShimGlobals();
  const actor = { id: 'actor-2', name: 'No Shield Actor', system: { shields: { value: 0, max: 0 }, derived: {} } };
  attachRealRechargeShields(actor);
  await SkillUseFilter._dispatchRestoreShieldRating(actor, { restoreShieldRating: 5 }, null, { total: 15 });
  assert.equal(actor.system.shields.value, 0, 'an actor without a valid shield resource must not have shields.value mutated');
  resetFoundryShimGlobals();
}

// ── a skill use with no dc at all (dc === null) treats any roll as success ──

{
  installFoundryShimGlobals();
  const actor = fakeActor({ value: 0, max: 20 });
  const calls = attachRealRechargeShields(actor);
  await SkillUseFilter._dispatchRestoreShieldRating(actor, { restoreShieldRating: 5 }, null, { total: 3 });
  assert.equal(calls.length, 1, 'a skill use with no DC configured must still dispatch on any completed roll');
  resetFoundryShimGlobals();
}

console.log('shield-recharge-skill-dispatch-authority: all assertions passed');
