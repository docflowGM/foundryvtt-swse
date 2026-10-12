import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 5D-I-D-E -- talent <-> weapon relations by canonical talent identity.
//  1. every talent identity the weapon corpus references is a real, name-unique entry of the canonical talent corpus
//  2. owned talents resolve by stamp > unique name; an unrelated talent / feat never impersonates one
//  3. Siang Lance Mastery +1 attack reaches the REAL resolveAttackBonus (any proficiency route) as ABSOLUTE totals: exactly one +1 with
//     the talent alone / with Weapon Focus (rifles) in the legacy and the data-driven feat form / with an unrelated Weapon Focus
//  4. Distant Discblade Throw: the discblade uses the PISTOL band squares when the talent is owned (Core Rulebook p.129 Table 8-5:
//     thrown 0-6/7-8/9-10/11-12, pistol 0-20/21-40/41-60/61-80), through the range authority, chips and a stated distance
//  5. Siang Lance Mastery's prerequisite equivalence is tracked separately and never reaches attack math

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

  // Weapon Focus in BOTH feat representations: the legacy bare item and the real data-driven pack record. Exactly one +1, never 0 or +2.
  const wfReal = JSON.parse(fs.readFileSync('packs/feats.db', 'utf8').split('\n').find((l) => l.includes('"name":"Weapon Focus"')));
  const wfLegacy = (c) => ({ id: 'wfl', type: 'feat', name: 'Weapon Focus', system: { selectedChoice: c } });
  const wfData = (c) => ({ id: 'wfd', type: 'feat', name: 'Weapon Focus', flags: wfReal.flags, system: { ...structuredClone(wfReal.system), selectedChoice: c } });
  const ABS = 5 + 4 + 1; // BAB 5 + DEX 4 + the talent's single +1 (proficient through the talent's own route)
  for (const [label, feats] of [
    ['talent alone', [RIFLES]],
    ['+ legacy Weapon Focus (rifles)', [RIFLES, wfLegacy('Rifles')]],
    ['+ data-driven Weapon Focus (rifles)', [RIFLES, wfData('Rifles')]],
    ['+ legacy Weapon Focus (pistols)', [RIFLES, wfLegacy('Pistols')]],
    ['+ data-driven Weapon Focus (pistols)', [RIFLES, wfData('Pistols')]],
  ]) {
    const r = atk(makeActor({ feats, talents: ['Siang Lance Mastery'] }), lance, { profileId: 'ranged' });
    assert.equal(r.total, ABS, `${label}: absolute total ${ABS}`);
    assert.equal(r.components['Siang Lance Mastery'], 1, `${label}: exactly one +1 from the talent`);
    const wfLike = Object.keys(r.components).filter((k) => /weapon focus/i.test(k));
    assert.deepEqual(wfLike, [], `${label}: no second (+2) Weapon Focus contribution`);
  }
  ok('Siang Lance Mastery: exactly one +1 (absolute total) alone, with Weapon Focus rifles / pistols, legacy and data-driven');

  // tripwire for the nonstacking text: the feat authority must keep NOT applying a rifles choice to the exotic-group Siang Lance
  // on its own (if it ever does, the talent would double count and this fails)
  const rifleWfOnly = atk(makeActor({ feats: [EXOTIC, wfData('Rifles')] }), lance, { profileId: 'ranged' });
  assert.equal(rifleWfOnly.total, 5 + 4, 'Weapon Focus (rifles) alone adds nothing to the exotic-group Siang Lance today');
  // Weapon Focus naming the Siang Lance itself IS an applicable, separate (untyped) +1 -- the book's nonstack clause is for rifles only
  const wfLance = atk(makeActor({ feats: [EXOTIC, wfData('Siang Lance')], talents: ['Siang Lance Mastery'] }), lance, { profileId: 'ranged' });
  assert.equal(wfLance.total, 5 + 4 + 2, 'Weapon Focus (Siang Lance) + the talent: two separate untyped +1 (Core p.241), nothing in the text prevents it');
  ok('Weapon Focus authority tripwire; Weapon Focus (Siang Lance) is a separate untyped +1');

  // prerequisite equivalence: tracked, never an attack bonus
  const eq = rt.TALENT_PREREQUISITE_EQUIVALENTS[SIANG];
  assert.equal(eq.length, 1); assert.equal(eq[0].purpose, 'prerequisites-only'); assert.equal(eq[0].countsAs, 'weapon-focus');
  const combatMath = fs.readFileSync('scripts/engine/combat/combat-roll-math.js', 'utf8');
  assert.ok(!/TALENT_PREREQUISITE_EQUIVALENTS/.test(combatMath), 'attack math never reads the prerequisite equivalence');
  ok('Weapon Focus (Siang Lance) prerequisite equivalence is tracked separately and never an attack bonus');
}

// ---- 4: Distant Discblade Throw -- pistol range for the discblade ---------------------------------------------------------
{
  const disc = canon('weapon-discblade');
  const THROWN = { pointBlank: [0, 6], short: [7, 8], medium: [9, 10], long: [11, 12] };
  const PISTOL = { pointBlank: [0, 20], short: [21, 40], medium: [41, 60], long: [61, 80] };
  const rangeOf = (runtime, actor) => rt.resolveActorRange(runtime, actor);
  const runtime = rt.resolveAttackWeaponRuntime(disc, { profileId: 'thrown' });
  assert.deepEqual(runtime.range.bandSquares, THROWN, 'the discblade thrown table is the thrown-weapon table (Core p.129)');
  const without = makeActor({ feats: ['Exotic Weapon Proficiency (Discblade)'] });
  const withTalent = makeActor({ feats: ['Exotic Weapon Proficiency (Discblade)'], talents: ['Distant Discblade Throw'] });
  assert.deepEqual(rangeOf(runtime, without).bandSquares, THROWN, 'without the talent: thrown squares');
  assert.deepEqual(rangeOf(runtime, withTalent).bandSquares, PISTOL, 'with the talent: pistol squares (from the global band table in the registry)');
  assert.equal(rangeOf(runtime, withTalent).treatedAs, 'pistols');
  assert.equal(rangeOf(runtime, withTalent).grantedBy, rt.WEAPON_TALENT_IDENTITIES['Distant Discblade Throw']);
  // the same table the global range data ships
  const globalPistols = JSON.parse(fs.readFileSync('data/actor-weapon-ranges.json', 'utf8')).find((p) => p.id === 'pistols').bands;
  for (const [band, g] of [['pointBlank', globalPistols.pb], ['short', globalPistols.short], ['medium', globalPistols.medium], ['long', globalPistols.long]]) {
    assert.deepEqual(PISTOL[band], [g.min, g.max], `${band} matches data/actor-weapon-ranges.json pistols`);
  }
  ok('range authority: thrown squares without the talent, pistol squares (== global pistols table) with it');

  // a stated distance names the band; the band penalty then flows through the existing arithmetic
  const at = (actor, squares) => atk(actor, disc, { profileId: 'thrown', distanceSquares: squares });
  const none10 = at(without, 10), talent10 = at(withTalent, 10);
  assert.equal(none10.components['Range Penalty'], -5, '10 squares: Medium for a thrown weapon');
  assert.equal(talent10.components['Range Penalty'], undefined, '10 squares: Point Blank with pistol range -> no range penalty');
  assert.equal(talent10.total - none10.total, 5);
  assert.equal(at(without, 12).components['Range Penalty'], -10, '12 squares: Long when thrown');
  assert.equal(at(withTalent, 12).components['Range Penalty'], undefined, '12 squares: Point Blank with the talent');
  assert.equal(at(withTalent, 30).components['Range Penalty'], -2, '30 squares: Short with the talent');
  assert.equal(at(withTalent, 50).components['Range Penalty'], -5, '50 squares: Medium with the talent');
  assert.equal(at(withTalent, 70).components['Range Penalty'], -10, '70 squares: Long with the talent');
  assert.equal(at(without, 30).components['Range Penalty'], undefined, '30 squares is beyond every thrown band: no band is invented');
  // an explicit band always wins over a distance
  const explicit = atk(withTalent, disc, { profileId: 'thrown', distanceSquares: 10, rangeBand: 'long' });
  assert.equal(explicit.components['Range Penalty'], -10);
  // a different weapon is never affected by the talent
  assert.equal(rt.resolveActorRange(rt.resolveAttackWeaponRuntime(canon('weapon-blaster-pistol'), {}), withTalent).bandSquares.pointBlank[1], 20);
  assert.equal(rt.resolveActorRange(rt.resolveAttackWeaponRuntime(lance, { profileId: 'ranged' }), withTalent).grantedBy, undefined);
  ok('stated distance -> band: 10 squares Medium (-5) thrown vs Point Blank (0) with the talent; explicit band wins; other weapons unaffected');

  // the attack-dialog chips carry the same squares (the player reads them to name a band)
  const { buildAttackForms } = rt;
  const chipWith = buildAttackForms(disc, {}, { actor: withTalent }).forms.find((f) => f.profileId === 'thrown');
  const chipWithout = buildAttackForms(disc, {}, { actor: without }).forms.find((f) => f.profileId === 'thrown');
  assert.deepEqual(chipWith.range.bandSquares, PISTOL);
  assert.deepEqual(chipWithout.range.bandSquares, THROWN);
  ok('attack-form chips: pistol squares with the talent, thrown squares without');

  // band penalties are the one global table either way
  const thrownP = registryData.identities.find((w) => w.identityKey === 'weapon-discblade').canonicalStats.attackProfiles.find((p) => p.id === 'thrown').range.basePenalties;
  const pistolP = registryData.identities.find((w) => w.identityKey === 'weapon-blaster-pistol').canonicalStats.attackProfiles[0].range.basePenalties;
  assert.deepEqual(thrownP, pistolP);
  ok('band penalties unchanged (0/-2/-5/-10 in both tables)');
}

console.log(`weapon-phase-5d-i-d-e-talent-relations: ${step} checks passed`);
