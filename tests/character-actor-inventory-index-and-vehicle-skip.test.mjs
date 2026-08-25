import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 3 — derived-data + performance optimization, Fixes #4 and #5.
//
// Fix #4: mirrorInventory() used to independently re-scan actor.items with
// its own single-pass switch, even though computeCharacterDerived() had
// already built a shared per-cycle itemIndex (buildActorItemIndex) for
// mirrorFeats/mirrorTalents/mirrorStarshipManeuvers. mirrorInventory() now
// reuses that same index for the four single-source-type groups
// (weapons/armor/equipment/consumables); the "misc" group merges two source
// types (ammo, misc) and still uses a single filtered actor.items pass to
// guarantee the original actor.items document order is preserved across
// that merge (byType bucket concatenation would not have preserved it).
//
// Fix #5: mirrorAttacks()/mirrorActions() compute real per-item work
// (attack-entry construction / a ~50-entry combat-actions list) that is
// dead for Vehicle actors -- the templates that would read
// system.derived.attacks/actions are never registered/rendered for
// vehicles (the vehicle sheet takes its own early-return before reaching
// the generic panel code), so computeCharacterDerived() now skips both
// calls when actor.type === 'vehicle', mirroring the pre-existing
// `if (this.type !== 'vehicle')` pattern already used for computeXpDerived
// in base-actor.js. Character/NPC/Droid actors are unaffected.

registerFoundryPathLoader();
installFoundryShimGlobals();

const { computeCharacterDerived } = await import(
  '/systems/foundryvtt-swse/scripts/actors/v2/character-actor.js'
);

function baseCharacterSystem(overrides = {}) {
  return {
    attributes: {
      str: { value: 10 }, dex: { value: 10 }, con: { value: 10 },
      int: { value: 10 }, wis: { value: 10 }, cha: { value: 10 }
    },
    skills: {},
    level: 1,
    ...overrides
  };
}

// ── mirrorInventory groups items by type identically to the pre-fix single-pass scan (Test 1) ──

{
  const weapon1 = { id: 'w1', type: 'weapon', name: 'Blaster', system: { equipped: true, damage: '3d6' } };
  const ammo1 = { id: 'am1', type: 'ammo', name: 'Power Cell', system: { quantity: 5 } };
  const armor1 = { id: 'a1', type: 'armor', name: 'Vest', system: { quantity: 1 } };
  const misc1 = { id: 'mi1', type: 'misc', name: 'Rope', system: { quantity: 1 } };
  const equip1 = { id: 'e1', type: 'equipment', name: 'Comlink', system: { quantity: 1 } };
  const cons1 = { id: 'c1', type: 'consumable', name: 'Medpac', system: { quantity: 2 } };
  const nonGear = { id: 'f1', type: 'feat', name: 'Weapon Focus', system: {} };

  const actor = {
    id: 'char-inventory-1',
    type: 'character',
    name: 'Inventory Test Character',
    // Deliberately interleaved: ammo before armor, misc before equipment --
    // exercises both the itemIndex path (weapons/armor/equipment/consumables)
    // and the merged-type "misc" group's order-preservation guarantee.
    items: [weapon1, ammo1, nonGear, armor1, misc1, equip1, cons1],
    system: baseCharacterSystem()
  };

  computeCharacterDerived(actor, actor.system);
  const inv = actor.system.derived.inventory;

  assert.deepEqual(inv.weapons.map(i => i.id), ['w1']);
  assert.deepEqual(inv.armor.map(i => i.id), ['a1']);
  assert.deepEqual(inv.equipment.map(i => i.id), ['e1']);
  assert.deepEqual(inv.consumables.map(i => i.id), ['c1']);
  // "misc" merges ammo + misc types; document order (am1 before mi1) must survive the merge.
  assert.deepEqual(inv.misc.map(i => i.id), ['am1', 'mi1'], 'misc group must preserve actor.items document order across the ammo+misc merge');

  const entry = inv.weapons[0];
  assert.equal(entry.name, 'Blaster');
  assert.equal(entry.equipped, true);
  assert.equal(entry.quantity, 1);

  // Non-gear item types (feat) must not leak into any inventory group.
  const allIds = [...inv.weapons, ...inv.armor, ...inv.equipment, ...inv.consumables, ...inv.misc].map(i => i.id);
  assert.ok(!allIds.includes('f1'), 'non-gear item types must be excluded from every inventory group');
}

// ── zero-item actor produces empty groups without throwing (Test 2) ──

{
  const actor = {
    id: 'char-inventory-empty',
    type: 'character',
    name: 'Empty Inventory',
    items: [],
    system: baseCharacterSystem()
  };
  computeCharacterDerived(actor, actor.system);
  const inv = actor.system.derived.inventory;
  for (const key of ['weapons', 'armor', 'equipment', 'consumables', 'misc']) {
    assert.deepEqual(inv[key], []);
  }
}

// ── vehicle actors: attacks/actions stay uncomputed (Test 3) ──

{
  const weapon1 = { id: 'w1', type: 'weapon', name: 'Turbolaser', system: { equipped: true, damage: '9d10' } };
  const actor = {
    id: 'veh-skip-1',
    type: 'vehicle',
    name: 'Test Vehicle',
    items: [weapon1],
    system: baseCharacterSystem()
  };
  computeCharacterDerived(actor, actor.system);
  assert.deepEqual(
    actor.system.derived.attacks,
    {},
    'vehicle actors must not have system.derived.attacks populated (mirrorAttacks is skipped)'
  );
  assert.deepEqual(
    actor.system.derived.actions,
    {},
    'vehicle actors must not have system.derived.actions populated (mirrorActions is skipped)'
  );
  // Inventory is still vehicle-relevant (cargo/equipment) and must not be skipped.
  assert.deepEqual(actor.system.derived.inventory.weapons.map(i => i.id), ['w1']);
}

// ── character actors: attacks/actions are still computed normally (unaffected by the vehicle skip) (Test 4) ──

{
  const weapon1 = { id: 'w1', type: 'weapon', name: 'Blaster', system: { equipped: true, damage: '3d6' } };
  const actor = {
    id: 'char-skip-check',
    type: 'character',
    name: 'Attack Check Character',
    items: [weapon1],
    system: baseCharacterSystem()
  };
  computeCharacterDerived(actor, actor.system);
  assert.equal(actor.system.derived.attacks.list.length, 1, 'character actors must still compute mirrored attacks');
  assert.ok(actor.system.derived.actions.list.length > 0, 'character actors must still compute mirrored actions');
}

// ── npc and droid actors: also unaffected by the vehicle-only skip (Test 5) ──

{
  for (const type of ['npc', 'droid']) {
    const weapon1 = { id: 'w1', type: 'weapon', name: 'Blaster', system: { equipped: true, damage: '3d6' } };
    const actor = {
      id: `${type}-skip-check`,
      type,
      name: `${type} Attack Check`,
      items: [weapon1],
      system: baseCharacterSystem()
    };
    computeCharacterDerived(actor, actor.system);
    assert.equal(actor.system.derived.attacks.list.length, 1, `${type} actors must still compute mirrored attacks`);
    assert.ok(actor.system.derived.actions.list.length > 0, `${type} actors must still compute mirrored actions`);
  }
}

console.log('character-actor-inventory-index-and-vehicle-skip.test.mjs: all assertions passed');
