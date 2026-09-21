import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze, Batch 2A correction — armor-hydration-defense-hotfix.js
// no longer reconstructs Reflex/Fortitude after DefenseCalculator.calculate()
// already produced the canonical answer.
//
// FAIL-BEFORE (all three confirmed live, against the real hotfix, before this
// fix -- reproduced here as documentation; the assertions below prove the
// CORRECTED behavior, since the buggy reconstruction no longer exists to
// register a "before" value against):
//
//   A. Gar'ee-shaped flat-footed: normal Reflex 29 (base 24 + Dex +4 + a +1
//      Martial-Arts-style dodge bonus), certified flat-footed = 24 (both the
//      Dex bonus AND the dodge bonus stripped). The hotfix's own
//      `result.flatFooted.total = result.reflex.total - Math.max(0, abilityMod)`
//      stripped ONLY the Dex bonus, giving 29 - 4 = 25 -- silently
//      resurrecting the dodge bonus flat-footed must remove, regressing a
//      defect this freeze already certified fixed in DefenseCalculator
//      itself (flat-footed-dodge-bonus-authority.test.mjs).
//   B. Active nonproficient Energy Shield (denies the positive Dex bonus to
//      Reflex) + flat-footed: DefenseCalculator's canonical reflex.total
//      already has the shield's Dex denial baked in once. The hotfix's
//      reconstruction subtracted `Math.max(0, abilityMod)` a SECOND time
//      using the pre-denial abilityMod, double-removing the same bonus.
//   C. Pinned + body armor: DefenseCalculator's canonical reflex.total
//      already has Pin's positive-Dex-bonus removal
//      (reflex.pinnedDexReduction) baked in. The hotfix's reconstruction
//      read reflex.abilityMod (the UNDENIED value DefenseCalculator reports
//      for provenance) and rebuilt the total from raw component fields,
//      never consulting pinnedDexReduction at all -- silently restoring the
//      Dex bonus Pin had just removed.
//
// Root architectural cause: the hotfix was a second, independently-
// maintained Reflex/Fortitude formula, not a consumer of the canonical one.
// Fixed by removing that reconstruction entirely -- the hotfix now only
// normalizes armor/shield equipped-state (an input-side, in-memory-only
// correction for legacy alternate equip-flag shapes) before calling the
// real, untouched DefenseCalculator.calculate(). This suite proves the
// invariant that matters: registering the hotfix must never change
// DefenseCalculator's output for an actor whose armor is already correctly
// flagged (every fixture below), across every domain this freeze has
// certified (ordinary armor, Armored Defense/IAD, flat-footed + dodge, Pin,
// active proficient/nonproficient shields, body armor + shield together) --
// and must correctly RECOGNIZE armor that previously would have been
// invisible to the canonical calculator due to a legacy equip-flag shape.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const { DefenseCalculator } = await import(
  '/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js'
);

function martialArtsDodge(value = 1) {
  return {
    type: 'feat', name: 'Martial Arts I',
    system: { executionModel: 'PASSIVE', subType: 'STATE', abilityMeta: { modifiers: [{ target: 'defense.reflex', value, type: 'dodge', bonusType: 'dodge' }] } }
  };
}

function shieldItem(overrides = {}) {
  return {
    id: 'shield-1', name: 'Energy Shield', type: 'armor',
    system: { equipped: true, armorType: 'shield', armorProficiencyRequired: 'heavy', maxDexBonus: 4, armorCheckPenalty: -2, activated: true, shieldRating: 10, currentSR: 10, ...overrides }
  };
}

function bodyArmor(maxDexBonus, overrides = {}) {
  return {
    id: 'armor-1', name: 'Body Armor', type: 'armor',
    system: { equipped: true, armorType: 'light', maxDexBonus, armorCheckPenalty: 0, reflexBonus: 0, fortitudeBonus: 0, ...overrides }
  };
}

function proficiencyFeat(type) {
  return { id: `feat-${type}`, name: `Armor Proficiency (${type})`, type: 'feat', system: {} };
}

function actorWith(items, dexBase, { miscExtra = 0, pinned = false } = {}) {
  return {
    type: 'character', items,
    effects: pinned ? [{ flags: { swse: { grappleState: { state: 'pinned', sourceId: 'attacker-1' } } } }] : [],
    system: {
      attributes: { dex: { base: dexBase, racial: 0, enhancement: 0, temp: 0 } },
      abilities: {},
      defenses: { reflex: { misc: { user: { extra: miscExtra } } } },
      conditionTrack: { current: 0 }
    }
  };
}

// Capture every canonical (pre-hotfix) result FIRST, before registering the
// hotfix anywhere in this process -- DefenseCalculator.calculate is a
// module-level singleton the hotfix monkey-patches irreversibly for the
// rest of this test file's process, matching the real runtime's own
// registration-is-permanent behavior.

const scenarios = {
  gareeFlatFooted: () => actorWith([martialArtsDodge(1)], 18, { miscExtra: 14 }), // base 24 + Dex +4 + dodge +1 = 29; flat-footed = 24
  ordinaryArmor: () => actorWith([bodyArmor(5), proficiencyFeat('light')], 14),
  armoredDefense: () => actorWith([bodyArmor(3, { reflexBonus: 6 }), proficiencyFeat('light'), { id: 'talent-ad', type: 'talent', name: 'Armored Defense', system: {} }], 14),
  pinnedWithArmor: () => actorWith([bodyArmor(99)], 20, { pinned: true }),
  activeProficientShield: () => actorWith([shieldItem({ armorProficiencyRequired: 'light' }), proficiencyFeat('light')], 20),
  activeNonproficientShield: () => actorWith([shieldItem()], 20), // requires heavy, actor has no proficiency feats
  bodyArmorPlusShieldFlatFooted: () => actorWith([bodyArmor(6), shieldItem(), proficiencyFeat('light'), martialArtsDodge(1)], 20)
};

const canonicalResults = {};
for (const [name, build] of Object.entries(scenarios)) {
  canonicalResults[name] = await DefenseCalculator.calculate(build(), [], {}, {});
}

// Sanity: the Gar'ee-shaped fixture reproduces the user-supplied example
// exactly (normal 29, flat-footed 24) before any hotfix involvement.
assert.equal(canonicalResults.gareeFlatFooted.reflex.total, 29, 'sanity: Gar\'ee-shaped fixture normal Reflex must be 29 (24 base + Dex +4 + dodge +1)');
assert.equal(canonicalResults.gareeFlatFooted.flatFooted.total, 24, 'sanity: certified flat-footed Reflex must be 24 (both Dex and dodge stripped)');

console.log('  [1/4] sanity fixtures reproduce the certified pre-hotfix values (Gar\'ee-shaped 29/24) OK');

// ─── Register the hotfix, exactly as the real runtime does ────────────────

const { registerArmorHydrationDefenseHotfix } = await import(
  '/systems/foundryvtt-swse/scripts/patches/armor-hydration-defense-hotfix.js'
);
registerArmorHydrationDefenseHotfix();

// ─── Required invariant: registering the hotfix must not change ───────────
//     DefenseCalculator's output, across every certified domain.

for (const [name, build] of Object.entries(scenarios)) {
  const withHotfix = await DefenseCalculator.calculate(build(), [], {}, {});
  assert.equal(withHotfix.reflex.total, canonicalResults[name].reflex.total, `[${name}] reflex.total must be identical with the hotfix registered`);
  assert.equal(withHotfix.reflex.abilityMod, canonicalResults[name].reflex.abilityMod, `[${name}] reflex.abilityMod must be identical with the hotfix registered`);
  assert.equal(withHotfix.flatFooted.total, canonicalResults[name].flatFooted.total, `[${name}] flatFooted.total must be identical with the hotfix registered`);
  assert.equal(withHotfix.fortitude.total, canonicalResults[name].fortitude.total, `[${name}] fortitude.total must be identical with the hotfix registered`);
}

console.log('  [2/4] invariant held across every certified domain (ordinary armor, Armored Defense, flat-footed+dodge, Pin, active proficient/nonproficient shield, body armor + shield): registering the hotfix changes NOTHING OK');

// ─── Fail-before A/B/C, explicitly, against the exact scenarios described ──

{
  const withHotfix = await DefenseCalculator.calculate(scenarios.gareeFlatFooted(), [], {}, {});
  assert.equal(withHotfix.reflex.total, 29, '[A] Gar\'ee-shaped normal Reflex must remain 29 with the hotfix registered');
  assert.equal(withHotfix.flatFooted.total, 24, '[A] Gar\'ee-shaped flat-footed Reflex must be 24 with the hotfix registered -- NOT 25 (the confirmed pre-fix value that silently kept the dodge bonus)');
}

{
  // Dex +5, body armor Max Dex +6 (non-restricting), active nonproficient
  // shield (requires heavy; actor only has Light proficiency) Max Dex +4,
  // plus a +1 dodge bonus. Hand-computed: reflexAbilityMod capped to +4 by
  // the shield; reflexTotalBeforePin = 10 + 4 + 1(dodge) - 5(nonproficiency)
  // = 10; reflex.total = 10 - 4(shield Dex denial) = 6; flatFooted.total =
  // reflexTotalBeforePin(10) - 4(Dex) - 1(dodge) = 5 -- computed from the
  // PRE-denial baseline, so it can never double-subtract the shield's own
  // denial. The hotfix's old reconstruction instead derived flatFooted from
  // the ALREADY-denied reflex.total (6) minus abilityMod (4) again = 2,
  // wrong by 3.
  const withHotfix = await DefenseCalculator.calculate(scenarios.bodyArmorPlusShieldFlatFooted(), [], {}, {});
  assert.equal(withHotfix.reflex.total, 6, '[B] sanity: normal Reflex with the active nonproficient shield\'s Dex denial applied once');
  assert.equal(withHotfix.flatFooted.total, 5, '[B] flat-footed must not double-subtract the positive Dex bonus the active nonproficient shield already denied');
  assert.equal(withHotfix.flatFooted.total, canonicalResults.bodyArmorPlusShieldFlatFooted.flatFooted.total, '[B] flat-footed total with the hotfix registered must match the canonical (pre-hotfix) value exactly');
}

{
  const withHotfix = await DefenseCalculator.calculate(scenarios.pinnedWithArmor(), [], {}, {});
  assert.equal(withHotfix.reflex.pinnedDexReduction, canonicalResults.pinnedWithArmor.reflex.pinnedDexReduction, '[C] Pin\'s positive-Dex-bonus removal must survive with the hotfix registered');
  assert.equal(withHotfix.reflex.total, canonicalResults.pinnedWithArmor.reflex.total, '[C] a Pinned, armored actor\'s Reflex total must be identical with the hotfix registered -- the hotfix must never resurrect the Dex bonus Pin removed');
}

console.log('  [3/4] fail-before A (Gar\'ee flat-footed dodge), B (shield-denial + flat-footed double-subtraction), C (Pin + body armor) all confirmed fixed OK');

// ─── The hotfix's real remaining job: recognize a legacy alternate ─────────
//     equip-flag shape DefenseCalculator's own narrow lookup would otherwise
//     miss entirely (system.equippable.equipped, not system.equipped).

{
  const legacyShapeArmor = {
    id: 'armor-legacy', name: 'Legacy-Flagged Armor', type: 'armor',
    system: { equippable: { equipped: true }, armorType: 'light', maxDexBonus: 3, armorCheckPenalty: 0, reflexBonus: 4, fortitudeBonus: 0 }
  };
  const actor = { type: 'character', items: [legacyShapeArmor], effects: [], system: { attributes: { dex: { base: 20, racial: 0, enhancement: 0, temp: 0 } }, abilities: {}, defenses: {}, conditionTrack: { current: 0 } } };
  const result = await DefenseCalculator.calculate(actor, [], {}, {});
  assert.equal(result.reflex.armorBonus, 4, 'armor equipped only via system.equippable.equipped must still be recognized by the canonical calculator once the hotfix normalizes its equip-state');
  assert.equal(result.reflex.abilityMod, 3, 'that armor\'s own Max Dex (+3) must still apply, proving the FULL armor record was picked up, not just a bare equipped flag');
  assert.equal(legacyShapeArmor.system.equipped, true, 'the normalization must set the canonical system.equipped field the rest of the codebase (ModifierEngine, armor-usage-resolver.js) also reads');
}

console.log('  [4/4] the hotfix\'s real remaining job -- normalizing a legacy alternate equip-flag shape so the canonical calculator (and every other consumer reading system.equipped) recognizes it -- still works OK');

console.log('armor-hydration-hotfix-shadow-authority-removal.test.mjs: all assertions passed');
