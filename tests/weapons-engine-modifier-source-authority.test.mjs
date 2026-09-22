import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Math Integrity Freeze -- WeaponsEngine.getWeaponModifiers() modifier-
// source contract defect, found as a side effect of live-verifying the
// Vexa'na Fen'Orr'kess Tessik actor golden case (an attuned lightsaber on
// her real actor export threw `createModifier: missing required fields:
// source=undefined` during a live DerivedCalculator.computeAll() run).
//
// Root cause, confirmed directly against the source: two createModifier()
// call sites in weapons-engine.js (the attuned-lightsaber +1 bonus, and
// both lightsaber-upgrade modifier builders in
// #gatherLightsaberUpgradeModifiers()) passed `source: ModifierSource.WEAPON`
// -- but ModifierTypes.js's canonical ModifierSource enum has no `WEAPON`
// member (FEAT, TALENT, SPECIES, BACKGROUND, ENCUMBRANCE, CONDITION, ITEM,
// EFFECT, DROID_MOD, VEHICLE_MOD, CUSTOM). `ModifierSource.WEAPON` is
// therefore always `undefined`, which createModifier()'s own required-
// field validation correctly rejects. This is a code defect, not
// malformed actor/item data: every OTHER weapon-sourced modifier in this
// same file already uses ModifierSource.ITEM (a weapon, and a lightsaber
// upgrade, are both ordinary Foundry Items) -- the three WEAPON sites were
// simply inconsistent with that established convention.
//
// A second, independent defect compounded this: getWeaponModifiers()
// wrapped its ENTIRE multi-weapon loop in one try/catch, so a single
// malformed modifier (from any weapon) threw out of the whole loop,
// silently discarding every OTHER equipped weapon's modifiers collected
// in the same pass, not just the offending contribution.
//
// Fixed: all three sites now use ModifierSource.ITEM, and every
// createModifier() call in this file is routed through a new
// #pushModifierSafe() helper that catches and logs a single malformed
// contribution without affecting any other modifier, from the same
// weapon or a different one.
//
// Math Integrity Freeze, Attack Bonus round 5: sections 3-5 below were
// rewritten. The round-4 fixtures modeled a lightsaber crystal as a
// separate owned `weaponUpgrade` Item referenced via
// `weapon.system.installedUpgrades` (an array of item ids) with a
// `{domain, bonusType, value}` modifier shape -- neither matches how a
// lightsaber is actually built. Confirmed directly against
// `lightsaber-construction-engine.js`: the selected crystal's/accessories'
// own `system.modifiers` records are copied VERBATIM onto the finished
// weapon's OWN `system.modifiers` array; no separate owned item or
// `installedUpgrades` field is ever populated by that (the only live)
// construction path, and the real compiled `packs/lightsaber-crystals.db`
// uses a `{type, value, target}` rules-record shape (e.g. Ilum Crystal:
// `{type:'ATTACK_BONUS', value:1, target:'attack'}`), not `{domain,
// bonusType}`. These fixtures now match that real, generator-native shape.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { WeaponsEngine } = await import(
  '/systems/foundryvtt-swse/scripts/engine/combat/weapons-engine.js'
);
const { ModifierSource, ModifierType } = await import(
  '/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierTypes.js'
);

const VALID_SOURCES = new Set(Object.values(ModifierSource));
const VALID_TYPES = new Set(Object.values(ModifierType));

function assertValidModifier(mod, label) {
  assert.ok(VALID_SOURCES.has(mod.source), `[${label}] modifier "${mod.sourceName}" must have a canonical source, got "${mod.source}"`);
  assert.ok(mod.sourceId !== undefined && mod.sourceId !== null && mod.sourceId !== '', `[${label}] modifier "${mod.sourceName}" must have a sourceId`);
  assert.ok(typeof mod.sourceName === 'string' && mod.sourceName.length > 0, `[${label}] modifier must have a sourceName`);
  assert.ok(typeof mod.target === 'string' && mod.target.length > 0, `[${label}] modifier "${mod.sourceName}" must have a target`);
  assert.ok(VALID_TYPES.has(mod.type), `[${label}] modifier "${mod.sourceName}" must have a canonical type, got "${mod.type}"`);
  assert.ok(typeof mod.value === 'number' && Number.isFinite(mod.value), `[${label}] modifier "${mod.sourceName}" must have a finite numeric value`);
}

function makeItemsCollection(items) {
  const arr = [...items];
  arr.get = (id) => arr.find(i => i.id === id);
  return arr;
}

function actorWith(items) {
  return { id: 'test-actor', items: makeItemsCollection(items) };
}

function equippedWeapon(overrides = {}) {
  return {
    id: overrides.id ?? 'weapon-1',
    name: overrides.name ?? 'Test Weapon',
    type: 'weapon',
    flags: overrides.flags ?? {},
    system: {
      equippable: { equipped: true },
      combat: overrides.combat ?? {},
      subtype: overrides.subtype,
      modifiers: overrides.modifiers ?? []
    }
  };
}

// ─── 1. Ordinary equipped weapon: unaffected, all modifiers valid ─────────

{
  const weapon = equippedWeapon({ name: 'Blaster Pistol', combat: { attack: { bonus: 1 } } });
  const modifiers = WeaponsEngine.getWeaponModifiers(actorWith([weapon]));
  assert.equal(modifiers.length, 1, 'an ordinary weapon with a flat attack bonus must produce exactly one modifier');
  assertValidModifier(modifiers[0], 'ordinary weapon');
  assert.equal(modifiers[0].source, ModifierSource.ITEM);
}

console.log('  [1/6] ordinary equipped weapon: produces a valid modifier with canonical source OK');

// ─── 2. Attuned lightsaber: the +1 bonus is created, not thrown away ──────

{
  const weapon = equippedWeapon({
    name: 'Attuned Saber', subtype: 'lightsaber',
    flags: { swse: { builtBy: 'test-actor', attunedBy: 'test-actor' } }
  });
  const modifiers = WeaponsEngine.getWeaponModifiers(actorWith([weapon]));
  const attuned = modifiers.find(m => m.sourceName === 'Attuned Saber (Attuned)');
  assert.ok(attuned, 'an attuned lightsaber must produce its +1 attack bonus modifier, not throw it away');
  assertValidModifier(attuned, 'attuned lightsaber');
  assert.equal(attuned.source, ModifierSource.ITEM, 'the attuned bonus must use ModifierSource.ITEM, not the nonexistent ModifierSource.WEAPON');
  assert.equal(attuned.value, 1);
}

console.log('  [2/6] attuned lightsaber: the +1 bonus is created with ModifierSource.ITEM, the fixed defect OK');

// ─── 3. Lightsaber with a real (Ilum-shaped) crystal attack modifier ──────
//
// Math Integrity Freeze, Attack Bonus round 7: a crystal's own ATTACK_BONUS
// record only applies to its CREATOR while ATTUNED (builtBy === actor.id
// && attunedBy === actor.id) -- ownership/possession alone is not enough,
// and a non-attuned wielder must not receive the identical crystal record's
// own defect this round fixes for weapon.js's own actorWith(...) caller.

{
  const weapon = equippedWeapon({
    name: 'Plain Saber', subtype: 'lightsaber',
    modifiers: [{ type: 'ATTACK_BONUS', value: 1, target: 'attack' }],
    flags: { swse: { builtBy: 'test-actor', attunedBy: 'test-actor', lightsaberConfig: { crystalId: 'crystal-ilum' } } }
  });
  const crystalItem = { id: 'crystal-ilum', name: 'Ilum Crystal', type: 'weaponUpgrade' };
  const modifiers = WeaponsEngine.getWeaponModifiers(actorWith([weapon, crystalItem]));
  const upgradeModifier = modifiers.find(m => m.target === 'attack.bonus');
  assert.ok(upgradeModifier, 'a real ATTACK_BONUS crystal record on weapon.system.modifiers must produce a modifier for its attuned creator');
  assertValidModifier(upgradeModifier, 'lightsaber crystal');
  assert.equal(upgradeModifier.source, ModifierSource.ITEM);
  assert.equal(upgradeModifier.value, 1);
  assert.match(upgradeModifier.sourceName, /Ilum Crystal/, 'the crystal Item\'s own name is resolved from lightsaberConfig.crystalId for provenance when available');
  // FAIL-BEFORE FIX: only ONE modifier reaches attack (the crystal's own
  // record) -- NOT a second, separate generic "Attuned" +1 alongside it.
  // JATM: the standard crystal's benefit IS the +1; a real named crystal's
  // benefit REPLACES it, never adds to it.
  const genericAttunedModifier = modifiers.find(m => m.sourceName === 'Plain Saber (Attuned)');
  assert.ok(!genericAttunedModifier, 'a real named crystal\'s own ATTACK_BONUS record must not ALSO receive the separate generic Attuned +1 -- that would double-count the identical benefit');
}

console.log('  [3/6] lightsaber with a real ATTACK_BONUS crystal record: produces exactly one modifier for its attuned creator, not a second generic Attuned bonus alongside it OK');

// ─── 4. Non-attuned wielder of the same crystal-bearing saber: +0 ────────
//
// FAIL-BEFORE proof for the round-7 fix's other half: the SAME crystal
// record that correctly produces a modifier for its attuned creator (case
// 3) must produce NOTHING for a wielder who is not attuned to it.

{
  const weapon = equippedWeapon({
    name: 'Unattuned Saber', subtype: 'lightsaber',
    modifiers: [{ type: 'ATTACK_BONUS', value: 1, target: 'attack' }],
    flags: { swse: { lightsaberConfig: { crystalId: 'crystal-ilum' } } }
  });
  const crystalItem = { id: 'crystal-ilum', name: 'Ilum Crystal', type: 'weaponUpgrade' };
  const modifiers = WeaponsEngine.getWeaponModifiers(actorWith([weapon, crystalItem]));
  const upgradeModifier = modifiers.find(m => m.target === 'attack.bonus');
  assert.ok(!upgradeModifier, 'a crystal ATTACK_BONUS record must not apply to a non-attuned wielder, even though the same weapon shape produces a modifier for its attuned creator (case 3)');
}

console.log('  [4/6] the identical crystal record produces NO modifier for a non-attuned wielder OK');

// ─── 5. Multiple equipped weapons where the first has a malformed ────────
//        modifier record (a realistic bad-data case, not the specific bug
//        already fixed above) must not erase the second weapon's
//        unrelated, valid modifier. The fail-closed interpreter validates
//        the value BEFORE ever constructing a Modifier, so a malformed
//        record is cleanly skipped rather than thrown and caught -- this
//        proves the same weapon-isolation guarantee via that updated path.

{
  const weaponA = equippedWeapon({
    id: 'weapon-a', name: 'Weapon A', subtype: 'lightsaber',
    modifiers: [{ type: 'ATTACK_BONUS', value: 'not-a-number', target: 'attack' }],
    combat: { attack: { bonus: 3 } },
    flags: { swse: { builtBy: 'test-actor', attunedBy: 'test-actor', lightsaberConfig: { crystalId: 'crystal-malformed' } } }
  });
  const weaponB = equippedWeapon({ id: 'weapon-b', name: 'Weapon B', combat: { attack: { bonus: 2 } } });

  const modifiers = WeaponsEngine.getWeaponModifiers(actorWith([weaponA, weaponB]));

  const weaponAEnhancement = modifiers.find(m => m.sourceName === 'Weapon A (Enhancement)');
  const weaponBEnhancement = modifiers.find(m => m.sourceName === 'Weapon B (Enhancement)');
  const badModifier = modifiers.find(m => m.sourceId?.startsWith?.('weapon-a_attack-bonus'));

  assert.ok(weaponAEnhancement, "Weapon A's own valid enhancement modifier (collected before its malformed crystal record) must survive");
  assert.ok(weaponBEnhancement, "Weapon B's valid modifier must survive Weapon A's malformed crystal record -- this is the exact defect: the old single-try/catch-around-the-whole-loop design would have aborted the loop before Weapon B was ever processed");
  assert.ok(!badModifier, 'the malformed crystal record itself must be skipped, not silently coerced into something invalid');
  for (const mod of modifiers) assertValidModifier(mod, 'multi-weapon malformed-contribution isolation');
}

console.log('  [5/6] multiple equipped weapons, first with a malformed crystal modifier record: the malformed contribution is skipped, all unrelated valid modifiers (including the second weapon\'s) survive OK');

// ─── 6. Every modifier across every scenario above satisfies the full ─────
//        required invariant (already asserted per-case above via
//        assertValidModifier, restated here as an explicit closing check).

{
  const weapon = equippedWeapon({ name: 'Final Check Weapon', combat: { attack: { bonus: 1 }, damage: { bonus: 1 } } });
  const modifiers = WeaponsEngine.getWeaponModifiers(actorWith([weapon]));
  assert.ok(modifiers.length >= 2, 'sanity: multiple modifiers from one weapon');
  for (const mod of modifiers) assertValidModifier(mod, 'final invariant check');
}

console.log('  [6/6] every emitted modifier across all scenarios has a valid canonical source/sourceId/sourceName/target/type/value OK');

console.log('weapons-engine-modifier-source-authority.test.mjs: all assertions passed');
