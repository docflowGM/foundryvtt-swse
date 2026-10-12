import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-D-E -- talent <-> weapon relations by canonical talent identity.
//  1. every talent identity the weapon corpus references is a real, name-unique entry of the canonical talent corpus
//  2. owned talents resolve by stamp > unique name; an unrelated talent / feat never impersonates one
//  3. Siang Lance Mastery +1 attack reaches the REAL resolveAttackBonus (any proficiency route), is suppressed by an overlapping
//     Weapon Focus (rifles), is absent for the bayonet-less non-owner and for a different weapon
//  4. Distant Discblade Throw: the discblade thrown band penalties equal the pistol table (arithmetic already identical)

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

const { resolveAttackBonus } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');
const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry, registryData } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);

let step = 0;
const ok = (label) => { step += 1; console.log(`  [${step}] ${label} OK`); };

// ---- 1: the table is the corpus ---------------------------------------------------------------------------------------------
const corpus = JSON.parse(fs.readFileSync('data/canonical/talents.json', 'utf8')).records;
for (const [name, identity] of Object.entries(rt.WEAPON_TALENT_IDENTITIES)) {
  const rows = corpus.filter((r) => r.name === name);
  assert.equal(rows.length, 1, `${name}: the corpus name is unique (so the unstamped-name join is unambiguous)`);
  assert.equal(rows[0].canonicalIdentity, identity, `${name}: identity matches the corpus`);
}
// every deferred-relation talent the registry names resolves
const named = new Set();
const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (typeof o.ability === 'string') named.add(o.ability); Object.values(o).forEach(walk); } };
for (const w of Object.values(registryData.identities ?? registryData)) { if (w?.abilityInteractions) walk(w.abilityInteractions); if (w?.proficiency) walk(w.proficiency); }
for (const n of ['Siang Lance Mastery', 'Discblade Arc', 'Distant Discblade Throw', 'Recall Discblade']) {
  assert.ok(named.has(n), `${n} is referenced by the weapon corpus`);
  assert.ok(rt.talentIdentityOfReference(n), `${n} resolves to a canonical identity`);
}
ok('4 referenced talents resolve to unique canonical corpus identities');

// ---- 2: owned-item identity -------------------------------------------------------------------------------------------------
const SIANG = rt.WEAPON_TALENT_IDENTITIES['Siang Lance Mastery'];
assert.equal(rt.canonicalTalentIdentityOf({ type: 'talent', name: 'Siang Lance Mastery' }), SIANG, 'unique name joins');
assert.equal(rt.canonicalTalentIdentityOf({ type: 'talent', name: 'Renamed', flags: { swse: { canonicalTalent: { identityKey: SIANG } } } }), SIANG, 'the stamp decides, whatever the title');
assert.equal(rt.canonicalTalentIdentityOf({ type: 'feat', name: 'Siang Lance Mastery' }), null, 'a feat never impersonates the talent');
assert.equal(rt.canonicalTalentIdentityOf({ type: 'talent', name: 'Siang Lance Mastery Deluxe' }), null);
assert.equal(rt.canonicalTalentIdentityOf({ type: 'talent', name: 'Other', flags: { swse: { id: 'swse.talent.other' } } }), null, 'another stable id is not guessed into a weapon talent');
ok('talent identity: stamp > unique name; feat / near-name / other id never match');

// ---- 3: Siang Lance Mastery +1 through the real attack path ---------------------------------------------------------------
const abilityBlock = (mod) => ({ base: 10 + mod * 2, racial: 0, enhancement: 0, temp: 0 });
const items = (list) => { const a = [...list]; a.get = (id) => a.find((i) => i.id === id); return a; };
function makeActor({ feats = [], talents = [] } = {}) {
  const all = [
    ...feats.map((f, i) => (typeof f === 'string' ? { id: `f${i}`, type: 'feat', name: f, system: {} } : { id: `f${i}`, type: 'feat', system: {}, ...f })),
    ...talents.map((t, i) => (typeof t === 'string' ? { id: `t${i}`, type: 'talent', name: t, system: {} } : { id: `t${i}`, type: 'talent', system: {}, ...t })),
  ];
  return {
    id: 'a1', type: 'character', flags: {},
    system: { bab: 5, species: '', weaponProficiencies: [], attributes: { str: abilityBlock(2), dex: abilityBlock(4), con: abilityBlock(0), int: abilityBlock(0), wis: abilityBlock(0), cha: abilityBlock(0) } },
    items: items(all), effects: [], getFlag() { return undefined; },
  };
}
const canon = (identityKey) => ({ id: `w-${identityKey}`, name: 'Renamed Thing', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey } } }, system: {} });
const atk = (actor, weapon, ctx = {}) => resolveAttackBonus(actor, weapon, null, ctx);
const lance = canon('weapon-siang-lance');
const RIFLES = 'Weapon Proficiency (Rifles)';
const EXOTIC = 'Exotic Weapon Proficiency (Siang Lance)';

{
  // rifle proficiency alone does not make the exotic Siang Lance proficient (-5); the talent supplies the route AND the +1
  const base = atk(makeActor({ feats: [RIFLES] }), lance, { profileId: 'ranged' });
  assert.equal(base.components['Proficiency'], -5);
  const withTalent = atk(makeActor({ feats: [RIFLES], talents: ['Siang Lance Mastery'] }), lance, { profileId: 'ranged' });
  assert.equal(withTalent.total, 5 + 4 + 1, 'BAB 5 + DEX 4, proficient through the talent, +1 from the talent');
  assert.equal(withTalent.total - base.total, 5 + 1, 'removes the -5 and adds the +1');
  assert.equal(withTalent.components['Siang Lance Mastery'], 1);
  assert.equal(withTalent.weaponRuntime.proficiency.route.kind, 'ability-override');
  ok('Siang Lance Mastery: +1 on the rifle-proficiency route, shown as its own component');

  // the SAME talent with Exotic Weapon Proficiency (normal route wins): the +1 is the talent's, not the route's
  const exotic = atk(makeActor({ feats: [EXOTIC], talents: ['Siang Lance Mastery'] }), lance, { profileId: 'ranged' });
  const exoticBase = atk(makeActor({ feats: [EXOTIC] }), lance, { profileId: 'ranged' });
  assert.equal(exotic.total - exoticBase.total, 1, 'the +1 does not depend on which proficiency route applied');
  ok('Siang Lance Mastery: +1 also with Exotic Weapon Proficiency');

  // by stamp, whatever the item title
  const stamped = atk(makeActor({ feats: [RIFLES], talents: [{ name: 'Lance Thing', flags: { swse: { canonicalTalent: { identityKey: SIANG } } } }] }), lance, { profileId: 'ranged' });
  assert.equal(stamped.total, withTalent.total, 'the stamp gives the same result as the name');
  const feat = atk(makeActor({ feats: [RIFLES, 'Siang Lance Mastery'] }), lance, { profileId: 'ranged' });
  assert.equal(feat.total, base.total, 'a same-named FEAT is not the talent (still nonproficient)');
  const other = atk(makeActor({ feats: [RIFLES], talents: ['Siang Lance Mastery'] }), canon('weapon-blaster-rifle'), {});
  assert.equal(other.components['Siang Lance Mastery'], undefined, 'only the Siang Lance');
  ok('identity-driven: stamp applies, a feat does not, another weapon is unaffected');

  // Weapon Focus (rifles) overlap: does not stack
  const wf = (choice) => ({ name: 'Weapon Focus', flags: { swse: { id: 'swse.feat.weapon_focus' } }, system: { selectedChoice: choice } });
  const overlap = atk(makeActor({ feats: [RIFLES, wf('Rifles')], talents: ['Siang Lance Mastery'] }), lance, { profileId: 'ranged' });
  // baseline: the same actor made proficient WITHOUT the talent (Exotic Weapon Proficiency), same Weapon Focus
  const overlapBase = atk(makeActor({ feats: [EXOTIC, wf('Rifles')] }), lance, { profileId: 'ranged' });
  assert.equal(overlap.total, overlapBase.total, 'Weapon Focus (rifles) already covers it: the talent adds 0');
  assert.equal(overlap.components['Siang Lance Mastery'], undefined);
  const unrelatedWf = atk(makeActor({ feats: [RIFLES, wf('Pistols')], talents: ['Siang Lance Mastery'] }), lance, { profileId: 'ranged' });
  const unrelatedBase = atk(makeActor({ feats: [EXOTIC, wf('Pistols')] }), lance, { profileId: 'ranged' });
  assert.equal(unrelatedWf.total - unrelatedBase.total, 1, 'Weapon Focus (pistols) does not suppress it');
  ok('Weapon Focus (rifles) suppresses the +1 (no stacking); Weapon Focus (pistols) does not');
}

// ---- 4: Distant Discblade Throw changes no penalty -------------------------------------------------------------------------
{
  const r = rt.getSharedWeaponAuthorityRegistry();
  const all = Object.values(registryData.identities ?? registryData);
  const disc = all.find((w) => w.identityKey === 'weapon-discblade');
  const thrown = disc.canonicalStats.attackProfiles.find((p) => p.id === 'thrown');
  const pistol = all.find((w) => w.identityKey === 'weapon-blaster-pistol').canonicalStats.attackProfiles[0];
  assert.deepEqual(thrown.range.basePenalties, pistol.range.basePenalties, 'the penalty table is the pistol table');
  assert.ok(r, 'registry loaded');
  ok('Distant Discblade Throw: discblade thrown band penalties == pistol band penalties');
}

console.log(`weapon-phase-5d-i-d-e-talent-relations: ${step} checks passed`);
