import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Weapon three-gate Gate C: the 20-case mathematical fidelity matrix (audit M-01..M-20). This file adds the real-path cases that had no direct
// executing proof (M-05, M-06, M-08, M-09, M-10, M-17); `data/audits/weapon-v2-3gate-math-matrix.json` anchors every case to the exact test that
// proves it, and the last test fails if an anchor rots. Chain per case: printed rule -> canonical field -> production consumer -> expected -> actual.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { resolveDamageComposition, buildDamageFormula } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { buildDamagePacket } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js');
const { DamageMitigationManager } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-mitigation-manager.js');

const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (l) => { const a = [...l]; a.get = (id) => a.find((i) => i.id === id); return a; };
const hero = (items = [], str = 3) => ({ id: 'a', name: 'H', type: 'character', flags: { swse: {} }, effects: [], getFlag() {}, getRollData() { return {}; }, items: col(items),
  system: { bab: 5, level: 5, size: 'medium', attributes: { str: ab(str), dex: ab(4), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 } } });
const item = (k, system = {}) => ({ id: `w-${k}`, name: 'Renamed', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '9d9', equipped: true, ...system } });
const compose = (A, w, profileId, ctx = {}) => resolveDamageComposition(A, w, { weaponForm: { identityKey: w.flags.swse.canonicalWeapon.identityKey, profileId }, ...ctx });
const formula = (A, w, profileId, ctx, opts) => buildDamageFormula(compose(A, w, profileId, ctx), opts).replace(/\s/g, '');
/** every NdM becomes 10 so the staged arithmetic is exact and order-sensitive: (10+3)*2 = 26, never 10*2+3 = 23 */
const withTens = (f) => Number(Function(`return ${f.replace(/\d*d\d+(rr[<=\d]*)?/gi, '10')}`)());
let ufid = 0;
const feat = (name, flags, system = {}) => ({ id: `f${++ufid}`, type: 'feat', name, flags, system });
const spec = (choice) => feat('Zxq Spec', { swse: { canonicalFeat: { identityKey: 'feat::saga-edition-core-rulebook::p91::weapon-specialization' } } }, { selectedChoice: choice });

test('M-05 thrown melee: the canonical thrown profile adds half level + Strength to damage', () => {
  for (const [k, pid] of [['weapon-gungan-electropole', 'thrown'], ['weapon-discblade', 'thrown']]) {
    const c = compose(hero(), item(k, { weaponCategory: 'melee' }), pid);
    assert.deepEqual([c.bonus.components['½ Level'], c.bonus.components.Ability], [2, 3], k);
  }
});
test('M-06 bow / sling: the published Strength damage applies exactly once; an ordinary ranged weapon adds none', () => {
  for (const k of ['weapon-bow', 'weapon-sling']) assert.equal(compose(hero(), item(k, { weaponCategory: 'ranged' }), 'primary').bonus.total, 5, `${k}: half level 2 + STR 3, once`);
  assert.equal(compose(hero(), item('weapon-blaster-pistol', { weaponCategory: 'ranged' }), 'primary').bonus.total, 2);
});
test('M-08 alternative attack mode: damage dice follow the selected profile (Variable Blaster low / medium / high)', () => {
  const A = hero(); const w = item('weapon-variable-blaster', { weaponCategory: 'ranged' });
  assert.deepEqual(['low', 'medium', 'high'].map((p) => formula(A, w, p)), ['3d4+2', '3d6+2', '3d8+2']);
});
test('M-09 +1 weapon and Weapon Specialization stack once each: half level 2 + flat +1 + specialization +2', () => {
  const w = item('weapon-blaster-pistol', { weaponCategory: 'ranged', flatDamageBonus: 1 });
  const base = compose(hero(), item('weapon-blaster-pistol', { weaponCategory: 'ranged' }), 'primary').bonus.total;
  assert.equal(base, 2);
  assert.equal(compose(hero(), w, 'primary').bonus.total, 3, '+1 weapon alone');
  assert.equal(compose(hero([spec('pistols')]), item('weapon-blaster-pistol', { weaponCategory: 'ranged' }), 'primary').bonus.total, 4, 'specialization alone');
  assert.equal(formula(hero([spec('pistols')]), w, 'primary'), '3d6+5', 'both, each counted exactly once');
});
test('M-10 weapon multiplier and critical stack in stage order: (4d10 + 2) x 2 = 24 -> critical x2 = 48 (never 10x2+2)', () => {
  const w = item('weapon-light-concussion-missile-launcher', { weaponCategory: 'ranged' });
  const plain = formula(hero(), w, 'light-concussion-missile');
  assert.equal(withTens(plain), 24, plain);
  const crit = formula(hero(), w, 'light-concussion-missile', { isCritical: true, critMultiplier: 2 });
  assert.equal(withTens(crit), 48, crit);
});
test('M-17 low result on a confirmed weapon hit: effective damage 1 BEFORE mitigation, then Damage Reduction takes HP loss to 0 (raw total disclosed)', () => {
  const w = item('weapon-blaster-pistol', { weaponCategory: 'ranged', damageType: 'energy' });
  const target = (dr) => ({ id: 't', name: 'T', type: 'character', items: col([]), system: { hp: { value: 30, max: 30 }, derived: { damageReduction: { highestValue: dr, all: dr } } } });
  const packet = buildDamagePacket({ attacker: hero(), target: target(5), weapon: w, amount: -4, workflowContext: { damage: { hit: true } }, options: { hit: true } });
  assert.equal(packet.amount, 1, 'floor applied at the packet seam, before any mitigation'); assert.equal(packet.flags.rolledTotal, -4);
  const noDR = DamageMitigationManager.resolve({ damage: packet.amount, actor: target(0), damageType: 'energy', weapon: w, options: { damagePacket: packet } });
  assert.equal(noDR.hpDamage, 1, 'no reduction: the minimum point lands');
  const withDR = DamageMitigationManager.resolve({ damage: packet.amount, actor: target(5), damageType: 'energy', weapon: w, options: { damagePacket: packet } });
  assert.equal(withDR.hpDamage, 0, 'DR 5 absorbs it: mitigation, not the floor, takes it to 0');
  assert.equal(withDR.damageReduction.applied, 1);
});

test('matrix anchors: all 20 cases map to a real test whose named case still exists', () => {
  const m = JSON.parse(fs.readFileSync('data/audits/weapon-v2-3gate-math-matrix.json', 'utf8'));
  assert.deepEqual(m.cases.map((c) => c.id), Array.from({ length: 20 }, (_, i) => `M-${String(i + 1).padStart(2, '0')}`));
  for (const c of m.cases) {
    assert.ok(['NEW', 'EXISTING'].includes(c.provenance), c.id);
    assert.ok(c.rule && c.field && c.consumer && c.expected, `${c.id}: rule/field/consumer/expected`);
    assert.ok(Array.isArray(c.tests) && c.tests.length, `${c.id}: needs at least one anchored test`);
    for (const t of c.tests) { assert.ok(fs.existsSync(t.file), `${c.id}: ${t.file}`); assert.ok(fs.readFileSync(t.file, 'utf8').includes(t.needle), `${c.id}: "${t.needle}" not found in ${t.file}`); }
  }
});
