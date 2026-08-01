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

const { mirrorAttacks, normalizeAttackEntry } = await import('../scripts/actors/v2/character-actor.js');
const { resolveAttackBonus, resolveDamageBonus } = await import('../scripts/engine/combat/combat-roll-math.js');

function weaponItem(overrides = {}) {
  const { system: systemOverrides, ...rest } = overrides;
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
      ...systemOverrides
    },
    ...rest
  };
}

function characterActor(items = [weaponItem()], overrides = {}) {
  const { system: systemOverrides, ...rest } = overrides;
  return {
    id: 'pc-1', type: 'character', name: 'Test Character',
    items,
    flags: {},
    system: { bab: 3, abilities: { str: { mod: 2 }, dex: { mod: 1 } }, ...systemOverrides },
    getFlag() { return undefined; },
    ...rest
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

// 5. A negative static damage bonus is displayed as "2d6-1", never
// "2d6+-1" — cheap but easy to get wrong when concatenating a signed number.
{
  const actor = characterActor([weaponItem({ system: {
    // No STR/proficiency bonus and a negative ability mod, so
    // resolveDamageBonus() nets negative from the ability contribution alone.
    attackAttribute: 'str', damage: '2d6'
  } })], { system: { bab: 3, abilities: { str: { mod: -3 }, dex: { mod: 1 } } } });
  const system = { derived: { attacks: {} } };
  mirrorAttacks(actor, system);

  const canonicalDamage = resolveDamageBonus(actor, actor.items[0], {});
  assert.ok(canonicalDamage.total < 0, 'test fixture must actually exercise a negative damage bonus');
  const entry = system.derived.attacks.list[0];
  assert.equal(entry.damageFormula, `2d6${canonicalDamage.total}`);
  assert.ok(!entry.damageFormula.includes('+-'), 'negative bonus must never render as "+-N"');
}

// 6. Stock-statblock droid weapons: the sheet must show the droid's
// PUBLISHED damage formula (from stockDroidAttack.publishedDamage, which the
// importer also mirrors onto system.damage — see
// stock-droid-importer-engine.js) rather than reapplying half-level/ability/
// enhancement composition on top of it a second time.
{
  const droidActor = {
    id: 'droid-1', type: 'droid', name: 'Test Droid',
    items: [],
    flags: {},
    system: { droidCalculationMode: 'stock-statblock' },
    getFlag() { return undefined; },
  };
  const stockWeapon = {
    id: 'w-stock', name: 'Integrated Blaster', type: 'weapon', img: '',
    system: { equipped: true, integrated: true, damage: '2d6+3', attackBonus: 9 },
    flags: { swse: { stockDroidAttack: { publishedAttackTotal: 9, publishedDamage: '2d6+3', mode: 'ranged', sourceStatblock: true } } }
  };
  droidActor.items = [stockWeapon];

  const system = { derived: { attacks: {} } };
  mirrorAttacks(droidActor, system);

  const canonicalDamage = resolveDamageBonus(droidActor, stockWeapon, {});
  assert.equal(canonicalDamage.total, 0, 'no situational modifiers active, so the stock contract contributes nothing extra at baseline');
  const entry = system.derived.attacks.list[0];
  assert.ok(entry, 'integrated stock-droid weapon must be mirrored (auto-equipped)');
  assert.equal(entry.damageFormula, '2d6+3', 'sheet must show the published formula unchanged — half-level/ability/enhancement must not be re-added');

  const canonicalAttack = resolveAttackBonus(droidActor, stockWeapon, null, {});
  assert.equal(canonicalAttack.total, 9, 'stock attack total must be the published total, not BAB+ability+enhancement layered on top');
  assert.equal(entry.attackTotal, 9);
}

// 7. Regression: a resolver failure must never present as a confident "+0".
// Before this fix, mirrorAttacks()'s catch block substituted
// { total: 0, components: {} } — indistinguishable on the sheet from a real
// weapon that genuinely has a +0 baseline. It must now be flagged
// unavailable so the template can show "—" instead of a fabricated number.
//
// isAttackItem() short-circuits on item.type === 'weapon' without touching
// `system` at all, and isItemEquipped()/mirrorAttacks's own pre-resolver
// reads only need system.equipped/system.damage — so a weapon whose
// system.attackAttribute getter throws passes both filters normally and
// only fails once resolveAttackBonus() (via getWeaponAttackAbility) reads
// that specific field deep inside the resolver, isolating "equipped check
// passes but resolver fails" without needing to duplicate or guess at
// character-actor.js's own filter internals.
{
  const throwingWeapon = weaponItem();
  Object.defineProperty(throwingWeapon.system, 'attackAttribute', {
    get() { throw new Error('simulated resolver-time failure'); },
    configurable: true
  });

  const actor = characterActor([throwingWeapon]);
  const system = { derived: { attacks: {} } };
  assert.doesNotThrow(() => mirrorAttacks(actor, system), 'a single malformed weapon item must not crash actor data preparation for the whole actor');

  const entry = system.derived.attacks.list[0];
  assert.ok(entry, 'the weapon is still mirrored (equipped/type checks never touched the broken field)');
  assert.equal(entry.attackUnavailable, true, 'a resolver failure must be flagged unavailable, not silently shown as a number');
  assert.notEqual(entry.attackTotal, undefined, 'a numeric fallback must still exist for any code that expects a number');
}

// 8. Direct contract test: normalizeAttackEntry() must pass the
// unavailable flags through unchanged rather than losing them in its own
// field-normalization fallback chains (attackTotal ?? attackBonus ?? ...).
{
  const entry = normalizeAttackEntry({
    id: 'w1', name: 'Test', attackTotal: 0, attackUnavailable: true, damageUnavailable: false
  });
  assert.equal(entry.attackUnavailable, true);
  assert.equal(entry.damageUnavailable, false);
}

console.log('attack-sheet-parity.test.mjs OK');
