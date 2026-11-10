import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Weapon three-gate follow-up: whether Strength reaches DAMAGE is decided by the SELECTED canonical attack profile's branch (melee vs ranged /
// thrown), never by incomplete or contradictory Item-level metadata (weaponCategory / meleeOrRanged, which is schema-defaulted to "melee").
// Printed rule (Core Rulebook, Combat Statistics > Damage): melee and thrown weapons add the Strength modifier; ordinary ranged weapons do not.
// Real canonical records, production resolveDamageComposition; the Item projection is deliberately missing or WRONG in every case.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { resolveDamageComposition } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { getDamageAbilityContribution } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js');

const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (l) => { const a = [...l]; a.get = (id) => a.find((i) => i.id === id); return a; };
const actor = (str = 3) => ({ id: 'a', name: 'H', type: 'character', flags: { swse: {} }, effects: [], getFlag() {}, getRollData() { return {}; }, items: col([]),
  system: { bab: 5, level: 5, size: 'medium', attributes: { str: ab(str), dex: ab(4), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 } } });
const item = (k, system = {}) => ({ id: `w-${k}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '9d9', ...system } });
const strInDamage = (k, profileId, system, { str = 3 } = {}) => {
  const w = item(k, system); const A = actor(str);
  return resolveDamageComposition(A, w, { weaponForm: { identityKey: k, profileId } }).bonus.components.Ability ?? 0;
};
const WRONG = [{}, { weaponCategory: 'melee', meleeOrRanged: 'melee' }, { weaponCategory: 'ranged', meleeOrRanged: 'ranged' }];

test('ordinary ranged weapons (pistol, rifle) never add Strength to damage, whatever the Item metadata says', () => {
  for (const sys of WRONG) {
    assert.equal(strInDamage('weapon-blaster-pistol', 'primary', sys), 0, `pistol ${JSON.stringify(sys)}`);
    assert.equal(strInDamage('weapon-blaster-rifle', 'primary', sys), 0, `rifle ${JSON.stringify(sys)}`);
  }
});
test('an ordinary melee weapon adds Strength whatever the Item metadata says', () => {
  for (const sys of WRONG) assert.equal(strInDamage('weapon-vibrosword', 'melee', sys), 3, `vibrosword ${JSON.stringify(sys)}`);
});
test('multi-profile weapons follow the SELECTED profile: Electropole melee and thrown both add Strength; Siang Lance ranged does not, bayonet does', () => {
  for (const sys of WRONG) {
    assert.equal(strInDamage('weapon-gungan-electropole', 'melee', sys), 3, 'electropole melee');
    assert.equal(strInDamage('weapon-gungan-electropole', 'thrown', sys), 3, 'electropole thrown (thrown weapons add Strength)');
    assert.equal(strInDamage('weapon-siang-lance', 'ranged', sys), 0, 'lance ranged shot');
    assert.equal(strInDamage('weapon-siang-lance', 'bayonet-aao', sys), 3, 'lance bayonet');
    assert.equal(strInDamage('weapon-discblade', 'thrown', sys), 3, 'discblade thrown');
  }
});
test('the bow / sling special Strength rule is unaffected', () => {
  for (const sys of WRONG) { assert.equal(strInDamage('weapon-bow', 'primary', sys), 3, 'bow'); assert.equal(strInDamage('weapon-sling', 'primary', sys), 3, 'sling'); }
});
test('legacy two-handed fallback: positive Strength doubles for a non-light weapon, never 1.5x; a penalty is not doubled; light weapons do not double', () => {
  const legacy = (system) => ({ id: 'l', name: 'Homebrew Maul', type: 'weapon', flags: {}, system: { damage: '2d6', weaponCategory: 'melee', twoHanded: true, ...system } });
  const A3 = actor(3), Am2 = actor(-2);
  assert.equal(getDamageAbilityContribution(A3, legacy({})), 6, 'STR +3 two-handed non-light: x2 (was floor(3*1.5)=4)');
  assert.equal(getDamageAbilityContribution(actor(2), legacy({})), 4, 'STR +2: x2 (was 3)');
  assert.equal(getDamageAbilityContribution(Am2, legacy({})), -2, 'a Strength penalty is not doubled');
  assert.equal(getDamageAbilityContribution(A3, legacy({ light: true })), 3, 'light weapons never double Strength');
  assert.equal(getDamageAbilityContribution(A3, legacy({ twoHanded: false })), 3, 'one-handed: single Strength');
});

test('attack side (already correct, locked): the attack ability follows the selected profile branch regardless of Item metadata', async () => {
  const { resolveAttackBonus } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
  const A = actor(3); A.system.attributes.dex = ab(-1); A.system.weaponProficiencies = ['pistols', 'advanced-melee', 'rifles', 'simple'];
  const abilityOf = (k, profileId, sys) => Object.entries(resolveAttackBonus(A, item(k, sys), null, { profileId }).components).find(([l]) => /^Ability/.test(l))?.[0];
  for (const sys of WRONG) {
    assert.equal(abilityOf('weapon-blaster-pistol', 'primary', sys), 'Ability (DEX)');
    assert.equal(abilityOf('weapon-vibrosword', 'melee', sys), 'Ability (STR)');
    assert.equal(abilityOf('weapon-siang-lance', 'ranged', sys), 'Ability (DEX)');
    assert.equal(abilityOf('weapon-siang-lance', 'bayonet-aao', sys), 'Ability (STR)');
    assert.equal(abilityOf('weapon-gungan-electropole', 'thrown', sys), 'Ability (DEX)', 'a thrown weapon is a ranged attack');
    assert.equal(abilityOf('weapon-gungan-electropole', 'melee', sys), 'Ability (STR)');
  }
});
