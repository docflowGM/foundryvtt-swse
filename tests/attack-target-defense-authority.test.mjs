import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- Batch 1, round 7: attack target-defense
// authority (docs/audits/v2-math-integrity-authority-ledger.md,
// "Certification-correction addendum 7"). Round 6 deferred this as
// out-of-scope for the Grapple domain; a seventh review correctly pointed
// out it is a confirmed authority violation affecting every normal attack
// in the game, not just Grapple, and should not stay deferred.
//
// attacks.js#getTargetReflex()/getTargetDefense() checked the legacy
// `system.defenses.<key>.total` field BEFORE `system.derived.defenses.
// <key>.total` -- backwards from SchemaAdapters.getDefenseTotal(), the V2
// canonical authority, which reads ONLY the derived path. A stale legacy
// value (e.g. surviving an import or a prior sheet edit -- V2's own
// DerivedCalculator never writes system.defenses.<key>.total at all) could
// therefore beat the real, current, derived defense for ANY attack against
// that target -- not a contrived edge case, the same category of stale-
// field problem this whole freeze exists to catch (see e.g. Gar'ee's old
// system.abilities fields from the ability-schema migration).
//
// Fixed: derived-first, exactly matching SchemaAdapters.getDefenseTotal()'s
// priority for a prepared V2 character actor. The legacy field remains a
// fallback ONLY when derived is absent/non-finite -- the genuinely-legacy
// actor-type case (e.g. a bare NPC/vehicle statblock that never runs the
// V2 derived pipeline).
//
// Also fixed: roll.swseAttackContext.defenseAdjustment previously hardcoded
// 0 even when targetContext.defenseAdjustment (the mechanism round 6 added
// for Grab/Grapple Resistance's contextual Reflex bonus) was actually
// applied -- an untruthful audit trail. resolveTargetContext() now returns
// the applied `adjustment` and the context object reports it for real.

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? {
  ApplicationV2: class {},
  HandlebarsApplicationMixin: (Base) => class extends Base {}
};
globalThis.foundry.applications.handlebars = globalThis.foundry.applications.handlebars ?? { renderTemplate: async () => '' };
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID = globalThis.foundry.utils.randomID ?? (() => `stub-id-${Math.random().toString(36).slice(2)}`);
globalThis.window = globalThis.window ?? globalThis;
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };

const { getTargetReflex, getTargetDefense, resolveTargetContext } = await import(
  '/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js'
);
const { SchemaAdapters } = await import(
  '/systems/foundryvtt-swse/scripts/utils/schema-adapters.js'
);

function actorWith({ derived, legacy } = {}) {
  const system = {};
  if (derived) system.derived = { defenses: derived };
  if (legacy) system.defenses = legacy;
  return { system };
}

// ─── 1. Derived-only (the ordinary, fully-prepared V2 PC shape) ───────────

{
  const actor = actorWith({ derived: { reflex: { total: 29 }, fortitude: { total: 22 }, will: { total: 18 } } });
  assert.equal(getTargetReflex(actor), 29, 'derived-only: Reflex must read the derived total');
  assert.equal(getTargetDefense(actor, 'reflex'), 29, 'derived-only: getTargetDefense(reflex) must agree with getTargetReflex');
  assert.equal(getTargetDefense(actor, 'fortitude'), 22, 'derived-only: Fortitude must read the derived total');
  assert.equal(getTargetDefense(actor, 'will'), 18, 'derived-only: Will must read the derived total');
  assert.equal(SchemaAdapters.getDefenseTotal(actor, 'reflex'), 29, 'parity: SchemaAdapters.getDefenseTotal(reflex) must agree');
  assert.equal(SchemaAdapters.getDefenseTotal(actor, 'fortitude'), 22, 'parity: SchemaAdapters.getDefenseTotal(fortitude) must agree');
  assert.equal(SchemaAdapters.getDefenseTotal(actor, 'will'), 18, 'parity: SchemaAdapters.getDefenseTotal(will) must agree');
}

console.log('  [1/5] derived-only actor: Reflex/Fortitude/Will all read the canonical derived total, in parity with SchemaAdapters.getDefenseTotal() OK');

// ─── 2. Stale legacy + correct derived: derived MUST win (the exact ────────
//        fail-before case requested: legacy 17/derived 29) ─────────────────

{
  const cases = [
    { key: 'reflex', legacyValue: 17, derivedValue: 29 },
    { key: 'fortitude', legacyValue: 13, derivedValue: 22 },
    { key: 'will', legacyValue: 9, derivedValue: 18 }
  ];
  for (const { key, legacyValue, derivedValue } of cases) {
    const actor = actorWith({
      derived: { [key]: { total: derivedValue } },
      legacy: { [key]: { total: legacyValue } }
    });
    const value = key === 'reflex' ? getTargetReflex(actor) : getTargetDefense(actor, key);
    assert.equal(value, derivedValue, `[${key}] a stale legacy total (${legacyValue}) must never beat the correct derived total (${derivedValue})`);
    assert.equal(SchemaAdapters.getDefenseTotal(actor, key), derivedValue, `[${key}] parity with SchemaAdapters.getDefenseTotal() under the same stale-legacy condition`);
  }
}

console.log('  [2/5] stale legacy system.defenses.<key>.total is correctly ignored in favor of system.derived.defenses.<key>.total, for Reflex/Fortitude/Will OK');

// ─── 3. Legacy-only actor type (no derived data at all): the genuine ───────
//        fallback case -- a bare NPC/vehicle statblock that never runs the
//        V2 derived pipeline must still resolve a usable target defense.

{
  const cases = [
    { key: 'reflex', legacyValue: 22 },
    { key: 'fortitude', legacyValue: 19 },
    { key: 'will', legacyValue: 14 }
  ];
  for (const { key, legacyValue } of cases) {
    const actor = actorWith({ legacy: { [key]: { total: legacyValue } } });
    const value = key === 'reflex' ? getTargetReflex(actor) : getTargetDefense(actor, key);
    assert.equal(value, legacyValue, `[${key}] with no derived data at all, the legacy field must still be honored as a fallback`);
  }
}

console.log('  [3/5] legacy-only actor type (no system.derived.defenses at all) correctly falls back to the legacy field OK');

// ─── 4. resolveTargetContext() reports the real applied adjustment ────────

{
  const target = actorWith({ derived: { reflex: { total: 29 } } });
  const resolved = resolveTargetContext({ targetContext: { defenseType: 'reflex', defenseAdjustment: 5 } }, target);
  assert.equal(resolved.defenseValue, 34, 'resolveTargetContext must add the contextual adjustment to the canonical base');
  assert.equal(resolved.adjustment, 5, 'resolveTargetContext must report the adjustment it actually applied, not a hardcoded 0');

  const unaffected = resolveTargetContext({}, target);
  assert.equal(unaffected.adjustment, 0, 'a caller that never passes targetContext.defenseAdjustment must see adjustment 0 (zero behavior change)');
  assert.equal(unaffected.defenseValue, 29, 'a caller that never passes targetContext.defenseAdjustment must see the unmodified canonical defense');
}

console.log('  [4/5] resolveTargetContext() truthfully reports the applied defenseAdjustment (not a hardcoded 0) OK');

// ─── 5. Live end-to-end proof: the same contextual adjustment SWSEGrappling
//        .attemptGrab() (round 6) applies is truthfully reported on the
//        real Roll object's swseAttackContext, not silently reset to 0. ───

{
  const { SWSEGrappling } = await import(
    '/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js'
  );
  const { RollEngine } = await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js');
  const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');

  const originalPostRoll = SWSEChat.postRoll;
  SWSEChat.postRoll = async () => ({ id: 'stub-message' });
  const originalSafeRoll = RollEngine.safeRoll;
  RollEngine.safeRoll = async () => ({ total: 40, dice: [{ results: [{ result: 15 }] }] });

  function makeActor(name, { derivedReflex, items = [] } = {}) {
    const system = {
      level: 8, size: 'medium', skills: {}, progression: { classLevels: [] },
      attributes: {
        str: { base: 14, racial: 0, enhancement: 0, temp: 0 },
        dex: { base: 10, racial: 0, enhancement: 0, temp: 0 }
      },
      derived: { bab: 7 },
      hp: { max: 50, value: 50 }
    };
    if (derivedReflex !== undefined) system.derived.defenses = { reflex: { total: derivedReflex } };
    return { id: name.toLowerCase(), name, type: 'character', items, system, flags: { swse: {} }, getRollData: () => ({}) };
  }

  const grappleResistanceFeat = {
    type: 'feat', name: 'Grapple Resistance',
    system: { disabled: false, abilityMeta: { grappleRules: [
      { type: 'GRAB_GRAPPLE_RESISTANCE', reflexBonus: 5, opposedGrappleBonus: 5, source: 'Grapple Resistance' }
    ] } }
  };

  try {
    const attacker = makeActor('Attacker');
    const target = makeActor('Target', { derivedReflex: 29, items: [grappleResistanceFeat] });
    const result = await SWSEGrappling.attemptGrab(attacker, target, { skipLegalityConfirm: true });
    assert.equal(result.grappleResistance, 5, 'sanity: Grapple Resistance must still contribute its +5 Reflex bonus (round 6, unaffected)');
    assert.equal(result.roll?.swseAttackContext?.defenseAdjustment, 5, 'roll.swseAttackContext.defenseAdjustment must truthfully report the +5 Grab/Grapple Resistance adjustment that was actually applied, not a hardcoded 0');
    assert.equal(result.roll?.swseAttackContext?.targetDefenseValue, 34, 'roll.swseAttackContext.targetDefenseValue must be the base derived Reflex (29) plus the applied adjustment (5)');
  } finally {
    RollEngine.safeRoll = originalSafeRoll;
    SWSEChat.postRoll = originalPostRoll;
  }
}

console.log('  [5/5] live end-to-end: roll.swseAttackContext.defenseAdjustment truthfully reports the real applied Grab/Grapple Resistance adjustment OK');

console.log('attack-target-defense-authority.test.mjs: all assertions passed');
