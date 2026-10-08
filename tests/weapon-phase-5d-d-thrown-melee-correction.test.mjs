import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Post-certification DATA_DEFECT correction (Phase 5D-D): Darkstick and Static Pike are MELEE weapons whose THROWN attack profile is
// a RANGED attack. Source: Galaxy at War p.36 (Darkstick can be thrown), Galaxy at War p.36 table / p.37 text (Static Pike balanced
// to be thrown like a spear); Core Rulebook: throwing is a ranged attack (DEX attack), thrown damage uses STR.
// Weapon-level group/proficiency do NOT change. Frozen audits are not rewritten: the correction is a controlled canonical amendment.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {} };
globalThis.window = globalThis.window ?? globalThis;
globalThis.ui = globalThis.ui ?? { notifications: { warn: () => {}, info: () => {}, error: () => {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const { resolveAttackBonus, resolveDamageComposition, buildDamageFormula } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const { computeFinalAttackComposition } = await import('/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry, resolver } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };
const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
const actor = (feats = []) => ({
  id: 'a1', name: 'Tester', type: 'character', flags: { swse: {} }, effects: [], getFlag() { return undefined; }, getRollData() { return {}; },
  items: col(feats.map((f, i) => (typeof f === 'string' ? { id: `f${i}`, type: 'feat', name: f, system: {} } : { id: `f${i}`, type: 'feat', system: {}, ...f }))),
  system: { bab: 5, level: 6, attributes: { str: ab(3), dex: ab(5), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 } },
});
// production-like items: weapon-level MELEE classification, projected attackAttribute 'str'
const item = (k, proficiency) => ({ id: `w-${k}`, name: 'Renamed', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { weaponCategory: 'melee', proficiency, attackAttribute: 'str', damage: '9d9', damageType: 'sonic' } });
const DARK = 'unmapped::Darkstick', PIKE = 'unmapped::Static Pike';
const darkItem = () => item(DARK, 'exotic'), pikeItem = () => item(PIKE, 'advanced-melee');
const exoticFeat = (k) => ({ name: 'Weapon Proficiency', flags: { swse: { choices: { weaponProficiency: { group: 'exotic', weaponIdentity: k } } } } });
const darkActor = () => actor([exoticFeat(DARK)]);
const pikeActor = () => actor(['Weapon Proficiency (Advanced Melee Weapons)']);
const corpus = JSON.parse(fs.readFileSync(new URL('../data/canonical/weapons.json', import.meta.url), 'utf8'));
const rec = (k) => corpus.identities.find((i) => i.identityKey === k);
const prof = (k, id) => rec(k).canonicalStats.attackProfiles.find((p) => p.id === id);

// 1-4: branch per profile; weapon-level identity unchanged -------------------------------------------------------------------------
for (const [k, group, family] of [[DARK, 'Exotic Weapon', 'exotic'], [PIKE, 'Advanced Melee Weapon', 'advanced-melee']]) {
  assert.equal(prof(k, 'melee').schemaFamily.branch, 'melee'); assert.equal(prof(k, 'melee').range.mode, 'melee');
  assert.equal(prof(k, 'thrown').schemaFamily.branch, 'ranged'); assert.equal(prof(k, 'thrown').range.mode, 'ranged');
  assert.equal(rec(k).weaponGroup, group, 'weapon-level group stays'); assert.equal(rec(k).schemaFamily.branch, 'melee', 'weapon-level family stays melee');
  assert.equal(rec(k).schemaFamily.proficiency, family);
  const rw = resolver.resolveIdentity(k);
  assert.deepEqual(rw.profiles.map((p) => [p.id, p.branch]), [['melee', 'melee'], ['thrown', 'ranged']]);
}
ok('Darkstick + Static Pike: melee profile melee, thrown profile ranged; weapon-level group/family (Exotic / Advanced Melee, melee) unchanged');

// 12 (data side): proficiency groups and damage/range of the thrown profile unchanged ---------------------------------------------------
assert.equal(prof(DARK, 'thrown').schemaFamily.proficiency, 'exotic'); assert.equal(prof(DARK, 'thrown').schemaFamily.exoticWeaponIdentity, 'Darkstick');
assert.equal(prof(PIKE, 'thrown').schemaFamily.proficiency, 'advanced-melee');
assert.equal(prof(DARK, 'thrown').damage.formula, '1d6'); assert.deepEqual(prof(DARK, 'thrown').damageType.types, ['slashing']);
assert.equal(prof(PIKE, 'thrown').damage.formula, '2d6'); assert.deepEqual([prof(PIKE, 'thrown').damageType.mode, ...prof(PIKE, 'thrown').damageType.types], ['and', 'energy', 'piercing']);
for (const k of [DARK, PIKE]) assert.equal(prof(k, 'thrown').range.profileId, 'thrown-weapons');
assert.equal(prof(PIKE, 'thrown').damage.formula, prof(PIKE, 'melee').damage.formula);
ok('thrown profiles keep proficiency group, damage (1d6 slashing / 2d6 energy AND piercing) and the thrown-weapons range profile');

// 5-6: thrown attack uses DEX; melee profile still STR ---------------------------------------------------------------------------------
for (const [k, it, a] of [[DARK, darkItem(), darkActor()], [PIKE, pikeItem(), pikeActor()]]) {
  const t = resolveAttackBonus(a, it, null, { profileId: 'thrown' });
  assert.ok('Ability (DEX)' in t.components, `${k} thrown attack uses DEX despite the projected STR`); assert.equal(t.components['Ability (DEX)'], 5);
  assert.equal(t.weaponRuntime.branch, 'ranged');
  const m = resolveAttackBonus(a, it, null, { profileId: 'melee' });
  assert.ok('Ability (STR)' in m.components); assert.equal(m.weaponRuntime.branch, 'melee');
}
ok('Darkstick / Static Pike thrown attacks use DEX (projected STR does not freeze it); melee profiles still STR (13: melee unaffected)');

// 7-8: thrown damage still uses STR; base from the thrown profile --------------------------------------------------------------------------
for (const [k, it, a, dice] of [[DARK, darkItem(), darkActor(), '1d6'], [PIKE, pikeItem(), pikeActor(), '2d6']]) {
  const ctx = { weaponForm: { identityKey: k, profileId: 'thrown' } };
  const c = resolveDamageComposition(a, it, ctx);
  assert.equal(c.bonus.components['Ability'], 3, `${k} thrown damage adds STR (existing rule: thrown melee weapons use STR)`);
  assert.equal(c.dice.base, dice);
  assert.match(buildDamageFormula(c), new RegExp(`^${dice}`));
  assert.deepEqual(c.canonicalDamage.damageTypes, k === DARK ? ['slashing'] : ['energy', 'piercing']);
}
ok('thrown damage still uses STR and the canonical base (1d6 slashing / 2d6 energy AND piercing as one damage event)');

// 9-11: canonical thrown-weapons range; offered by the selector; not refused ------------------------------------------------------------
for (const [k, it] of [[DARK, darkItem()], [PIKE, pikeItem()]]) {
  const r = rt.resolveAttackWeaponRuntime(it, { profileId: 'thrown' });
  assert.equal(r.range.status, 'banded'); assert.equal(r.range.family, 'thrown-weapons');
  assert.deepEqual(r.range.bandSquares.pointBlank, [0, 6]); assert.deepEqual(r.range.basePenalties, { pointBlank: 0, short: -2, medium: -5, long: -10 });
  const forms = rt.buildAttackForms(it).forms;
  assert.deepEqual(forms.filter((f) => f.branch === 'ranged').map((f) => f.profileId), ['thrown'], `${k} selector offers the thrown (ranged) form`);
  assert.ok(forms.filter((f) => f.branch === 'melee').every((f) => f.profileId === 'melee') && forms.some((f) => f.branch === 'melee'), `${k} melee forms stay melee (Static Pike: lethal/stun modes)`);
  assert.doesNotThrow(() => rt.resolveCanonicalRange(resolver.resolveIdentity(k), resolver.resolveIdentity(k).profiles.find((p) => p.id === 'thrown')), 'not refused by the branch/range consistency guard');
  const comp = await computeFinalAttackComposition(k === DARK ? darkActor() : pikeActor(), it, { profileId: 'thrown', rangeBand: 'medium' });
  assert.equal(comp.ok, true); assert.equal(comp.attackBonusResolution.components['Range Penalty'], -5, 'thrown-weapons range behavior');
}
ok('both thrown profiles use the canonical thrown-weapons range, are offered by the 5D-B selector, and pass the 5D-D consistency guard');

// 12: proficiency requirements unchanged -------------------------------------------------------------------------------------------------
{
  const d = darkItem(), p = pikeItem();
  assert.equal(resolveAttackBonus(actor(), d, null, { profileId: 'thrown' }).components['Proficiency'], -5);
  assert.equal(resolveAttackBonus(darkActor(), d, null, { profileId: 'thrown' }).components['Proficiency'], undefined);
  assert.equal(resolveAttackBonus(actor([exoticFeat('weapon-bowcaster')]), d, null, { profileId: 'thrown' }).components['Proficiency'], -5, 'wrong exotic stays -5');
  assert.equal(resolveAttackBonus(actor(), p, null, { profileId: 'thrown' }).components['Proficiency'], -5);
  assert.equal(resolveAttackBonus(pikeActor(), p, null, { profileId: 'thrown' }).components['Proficiency'], undefined, 'Advanced Melee proficiency still covers the ranged thrown attack');
  assert.equal(resolveAttackBonus(actor(['Weapon Proficiency (Pistols)']), p, null, { profileId: 'thrown' }).components['Proficiency'], -5);
  assert.equal(resolveAttackBonus(pikeActor(), p, null, { profileId: 'melee' }).weaponRuntime.proficiency.route.kind, 'normal-group');
  ok('proficiency requirements unchanged (Darkstick exotic identity; Static Pike Advanced Melee) for thrown and melee profiles');
}

// 14: legacy/homebrew unaffected ---------------------------------------------------------------------------------------------------------
{
  const home = { id: 'hb', name: 'Homebrew Spear', type: 'weapon', system: { weaponCategory: 'melee', proficiency: 'simple', attackAttribute: 'dex', damage: '1d8' } };
  const r = resolveAttackBonus(actor(['Weapon Proficiency (Simple Weapons)']), home, null, {});
  assert.equal(r.weaponRuntime.source, 'legacy'); assert.ok('Ability (DEX)' in r.components, 'legacy: stored attackAttribute explicit');
  ok('legacy/homebrew behavior unaffected');
}

// census of other thrown-melee inconsistencies; controlled amendment provenance ------------------------------------------------------------
{
  const contradictory = [], thrownQualityNoThrownProfile = [];
  for (const i of corpus.identities) {
    const ids = i.canonicalStats.attackProfiles.map((p) => p.id);
    for (const p of i.canonicalStats.attackProfiles) {
      if (p.range?.mode === 'ranged' && p.schemaFamily.branch === 'melee') contradictory.push(`${i.identityKey}/${p.id}`);
      if (p.range?.mode === 'melee' && p.schemaFamily.branch === 'ranged') contradictory.push(`${i.identityKey}/${p.id}`);
      if (p.qualities?.thrown === true && p.range?.mode === 'melee' && !ids.some((x) => /thrown/.test(x))) thrownQualityNoThrownProfile.push(`${i.identityKey}/${p.id}`);
    }
  }
  assert.deepEqual(contradictory, [], 'no canonical profile contradicts its own range mode after the correction');
  console.log('     melee profiles carrying the thrown quality but NO thrown profile (completeness observation, NOT changed):', thrownQualityNoThrownProfile.join(', '));
  const log = corpus.postCertificationAmendments.filter((a) => a.phase === '5D-D');
  assert.deepEqual(log.map((a) => [a.id, a.identityKey, a.classification, a.field, a.from, a.to]), [
    ['5D-D-thrown-profile-ranged-branch', DARK, 'DATA_DEFECT', 'canonicalStats.attackProfiles[id=thrown].schemaFamily.branch', 'melee', 'ranged'],
    ['5D-D-thrown-profile-ranged-branch', PIKE, 'DATA_DEFECT', 'canonicalStats.attackProfiles[id=thrown].schemaFamily.branch', 'melee', 'ranged'],
  ]);
  assert.match(log[0].source.page, /36/); assert.match(log[1].source.page, /36.*37/);
  assert.deepEqual(rec(DARK).provenance.postCertificationAmendments, ['5D-D-thrown-profile-ranged-branch']);
  // only these two records carry the amendment
  assert.equal(corpus.identities.filter((i) => i.provenance.postCertificationAmendments?.includes('5D-D-thrown-profile-ranged-branch')).length, 2);
  ok('census: no remaining branch/range contradictions; the amendment is logged with source/page/field/from/to and stamped only on the two records');
}

console.log(`Phase 5D-D Darkstick/Static Pike correction: ${step} checks passed.`);
