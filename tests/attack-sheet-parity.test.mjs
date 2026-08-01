import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 1 fix (combat display parity): mirrorAttacks() used to populate the
// sheet's displayed attackTotal straight from stored weapon-item fields
// (system.attackTotal / attackBonus / toHit), which could silently drift
// from what resolveAttackBonus() — the canonical resolver the actual roll
// uses — would produce. This suite proves the sheet's attackTotal/damage
// now come from the resolver, and that a stale stored field can no longer
// override it.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, combat: null } });

const { mirrorAttacks } = await import('../scripts/actors/v2/character-actor.js');
const { resolveAttackBonus, resolveDamageBonus } = await import('../scripts/engine/combat/combat-roll-math.js');

function weaponItem(overrides = {}) {
  return {
    id: 'w1', name: 'Vibrosword', type: 'weapon', img: '',
    system: {
      equipped: true,
      damage: '2d6',
      attackAttribute: 'str',
      proficient: true,
      // Stale/stored fields a legacy sheet write (or migration gap) could
      // have left behind — must NOT leak into the displayed total.
      attackTotal: 999,
      attackBonus: 999,
      toHit: 999,
      ...overrides.system
    },
    ...overrides
  };
}

function characterActor(items = [weaponItem()], overrides = {}) {
  return {
    id: 'pc-1', type: 'character', name: 'Test Character',
    items,
    flags: {},
    system: { bab: 3, abilities: { str: { mod: 2 }, dex: { mod: 1 } }, ...overrides.system },
    getFlag() { return undefined; },
    ...overrides
  };
}

// 1. The displayed total equals the canonical resolver's baseline total,
// not the stale stored fields on the weapon item.
{
  const actor = characterActor();
  const system = { derived: { attacks: {} } };
  mirrorAttacks(actor, system);

  const canonical = resolveAttackBonus(actor, actor.items[0], null, {});
  const entry = system.derived.attacks.list[0];
  assert.ok(entry, 'expected one mirrored attack entry');
  assert.equal(entry.attackTotal, canonical.total, 'sheet attackTotal must equal resolveAttackBonus() baseline total');
  assert.notEqual(entry.attackTotal, 999, 'stale system.attackTotal/attackBonus/toHit must not leak into the displayed total');
}

// 2. The displayed damage formula is base weapon dice + the canonical
// static damage bonus, not a stored/legacy field.
{
  const actor = characterActor();
  const system = { derived: { attacks: {} } };
  mirrorAttacks(actor, system);

  const canonicalDamage = resolveDamageBonus(actor, actor.items[0], {});
  const entry = system.derived.attacks.list[0];
  const expectedFormula = canonicalDamage.total === 0
    ? '2d6'
    : (canonicalDamage.total > 0 ? `2d6+${canonicalDamage.total}` : `2d6${canonicalDamage.total}`);
  assert.equal(entry.damageFormula, expectedFormula, 'sheet damage formula must be base dice + canonical static damage bonus');
}

// 3. The breakdown shown for "Details" is the resolver's own component
// ledger (label/value pairs), not an empty placeholder or a re-derivation.
{
  const actor = characterActor();
  const system = { derived: { attacks: {} } };
  mirrorAttacks(actor, system);

  const canonical = resolveAttackBonus(actor, actor.items[0], null, {});
  const entry = system.derived.attacks.list[0];
  assert.ok(Array.isArray(entry.breakdown.attack), 'attack breakdown must be an array of ledger entries');
  const sum = entry.breakdown.attack.reduce((s, e) => s + e.value, 0);
  assert.equal(sum, canonical.total, 'sum of displayed attack breakdown entries must equal the displayed total');
}

// 4. Weapons that are not equipped are not mirrored (unrelated to the fix,
// guards against a regression in the surrounding loop).
{
  const actor = characterActor([weaponItem({ system: { equipped: false, attackTotal: 999 } })]);
  const system = { derived: { attacks: {} } };
  mirrorAttacks(actor, system);
  assert.equal(system.derived.attacks.list.length, 0);
}

console.log('attack-sheet-parity.test.mjs OK');
