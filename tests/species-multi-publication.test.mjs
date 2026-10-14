import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeActor, selectSpecies, computeDefenses } from './helpers/species-actor-sim.mjs';

// Multi-publication species hydrated as complete source snapshots (one per audited publication).
// Statuses are tracked separately: this file proves OFFLINE_TESTED behaviour of what is IMPLEMENTED; nothing here is FOUNDRY_TESTED.
// Rules questions stay deferred in docs/audits/swse-rules-decisions-pending.md (Carapace, Radiation Resistance, Evolved Intellect, ...).

const recs = Object.fromEntries(readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean)
  .map(l => JSON.parse(l)).map(r => [r.name, r.system]));
const sidecar = Object.fromEntries(JSON.parse(readFileSync(new URL('../data/species-traits-migrated.json', import.meta.url), 'utf8')).map(x => [x.name, x]));

// What each selection must materialize. `def` = species bonus to [fortitude, reflex, will] through the production pipeline.
const Z = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
const EXPECT = {
  'Chadra-Fan': {
    base: { racial: { dex: 2, wis: -2 }, langs: ['Basic', 'Chadra-Fan'], rerolls: ['perception'] },
    'chadra-fan-ur-2b-02': { src: 'UR-2B-02', racial: { dex: 2, wis: -2 }, langs: ['Basic', 'Chadra-Fan'], traits: ['heightened-awareness', 'tinkerer', 'darkvision'], rerolls: ['perception'] },
    'chadra-fan-leg-2c-12': { src: 'LEG-2C-12', racial: { wis: -2, cha: 2 }, langs: ['Basic', 'Chadra-Fan'], traits: ['darkvision', 'tinkerer'], rerolls: [] },
    'chadra-fan-alternate': { legacy: true, racial: { wis: -2, cha: 2 }, rerolls: ['perception'] },
  },
  Chiss: {
    base: { racial: { int: 2, cha: -2 }, langs: ['Cheunh', 'Basic'], rerolls: [] },
    'chiss-ur-2b-10': { src: 'UR-2B-10', racial: { int: 2 }, langs: ['Cheunh'], traits: ['bonus-trained-skill', 'low-light-vision'], rerolls: [], grants: ['bonus-trained-skill'] },
    'chiss-leg-2c-02': { src: 'LEG-2C-02', racial: { int: 2 }, langs: ['Cheunh'], traits: ['bonus-trained-skill', 'low-light-vision'], rerolls: [], grants: ['bonus-trained-skill'] },
    'chiss-tfu-2e-12': { src: 'TFU-2E-12', racial: { int: 2 }, langs: ['Cheunh'], traits: ['bonus-trained-skill', 'low-light-vision'], rerolls: [], grants: ['bonus-trained-skill'] },
  },
  Bith: {
    base: { racial: { con: -2, int: 2, cha: 2 }, langs: ['Basic', 'Bith'], rerolls: [] },
    'bith-goi-2g-01': { src: 'GOI-2G-01', racial: { con: -2, int: 2, cha: 2 }, langs: ['Basic', 'Bith'], traits: ['meditative-trance', 'scent', 'evolved-intellect'], rerolls: [] },
    'bith-tog-2k-01': { src: 'TOG-2K-01', racial: { con: -2, int: 2 }, langs: ['Bith'], traits: ['evolved-intellect', 'heightened-awareness', 'meditative-trance'], rerolls: ['perception'] },
    'bith-alternate': { legacy: true, racial: { con: -2, int: 2 }, rerolls: [] },
  },
  Chagrian: {
    base: { racial: { str: 2, dex: -2 }, langs: ['Basic', 'Chagri'], rerolls: [] },
    'chagrian-leg-2c-01': { src: 'LEG-2C-01', racial: { str: 2, dex: -2 }, langs: ['Basic', 'Chagri'], traits: ['breathe-underwater', 'low-light-vision', 'radiation-resistance'], rerolls: [] },
    'chagrian-cw-2h-11': { src: 'CW-2H-11', racial: { str: 2, dex: -2 }, langs: ['Basic', 'Chagri'], traits: ['breathe-underwater', 'radiation-resistance', 'low-light-vision'], rerolls: [] },
  },
  Neimoidian: {
    base: { racial: { str: -2, cha: 2 }, langs: ['Basic', 'Neimoidian'], rerolls: [] },
    'neimoidian-core-2a-20': { src: 'CORE-2A-20', racial: { str: -2, int: 2, wis: 2 }, langs: ['Basic', 'Neimoidian', 'Pak Pak'], traits: ['conditional-bonus-feat', 'skills'], rerolls: [], grants: ['conditional-bonus-feat'] },
    'neimoidian-goi-2g-08': { src: 'GOI-2G-08', racial: { str: -2, cha: 2 }, langs: ['Basic', 'Neimoidian'], traits: ['conditional-bonus-feats'], rerolls: [] },
    'neimoidian-alternate': { legacy: true, racial: { str: -2, int: 2, cha: 2 }, rerolls: [] },
  },
  'Yuuzhan Vong': {
    base: { racial: { str: 2, wis: -2 }, langs: ['Yuuzhan Vong'], rerolls: [] },
    'yuuzhan-vong-core-2a-21': { src: 'CORE-2A-21', racial: { str: 2, wis: -2 }, langs: ['Yuuzhan Vong'], traits: ['force-immunity', 'technophobic', 'weapon-familiarity'], rerolls: [] },
    'yuuzhan-vong-leg-2c-07': { src: 'LEG-2C-07', racial: { str: 2, wis: -2 }, langs: ['Yuuzhan Vong'], traits: ['force-immunity', 'technophobic', 'weapon-familiarity', 'primitive'], rerolls: [] },
    'yuuzhan-vong-alternate': { legacy: true, racial: { str: 2, wis: -2 }, rerolls: [] },
  },
  Krevaaki: {
    base: { racial: { wis: 2, cha: -2 }, langs: ['Basic', 'Kreva'], rerolls: [], legacyPassives: ['climb', 'grab-and-grapple'], def: [0, 1, 0] },
    'krevaaki-ur-2b-04': { src: 'UR-2B-04', racial: { wis: 2, cha: -2 }, langs: ['Basic', 'Dromnyr'], traits: ['conditional-bonus-feat', 'carapace', 'stoic', 'tentacles'], rerolls: [] },
    'krevaaki-jatm-2j-04': { src: 'JATM-2J-04', racial: { wis: 2, cha: -2 }, langs: ['Basic', 'Dromnyr'], traits: ['carapace', 'stoic', 'grasping-tentacles'], rerolls: [] },
    'krevaaki-alternate': { legacy: true, racial: { wis: 2, cha: -2 }, rerolls: [], legacyPassives: ['climb', 'grab-and-grapple'], def: [0, 1, 0] },
  },
};
const sameSet = (a, b) => assert.deepEqual([...a].sort(), [...b].sort());
const racialOf = a => Object.fromEntries(Object.entries(a.system.attributes).map(([k, v]) => [k, v.racial]).filter(([, v]) => v));
const rerollsOf = a => (a.flags.swse.speciesRerolls ?? []).map(r => r.target);
const passivesOf = a => Object.keys(a.flags.swse.speciesPassiveBonuses ?? {});

async function observe(name, variant, actor = makeActor()) {
  const { ctx } = await selectSpecies(actor, name, variant);
  const d = await computeDefenses(actor);
  return {
    actor, ctx, racial: racialOf(actor), size: actor.system.size, speed: actor.system.speed, langs: ctx.ledger.languages.automatic,
    traits: actor.flags.swse.speciesTraitIds, rerolls: rerollsOf(actor), passives: passivesOf(actor),
    def: ['fortitude', 'reflex', 'will'].map(k => d[k].flagBonus + d[k].modifierBonus),
    grants: ctx.traits.filter(t => t.classification === 'grant').map(t => t.id),
  };
}

for (const [name, byVariant] of Object.entries(EXPECT)) {
  const sys = recs[name];

  // ---- data: every audited publication is a complete snapshot with its own source profile; legacy variants untouched ----
  for (const [id, want] of Object.entries(byVariant)) {
    if (id === 'base') continue;
    const v = sys.variants.find(x => x.id === id);
    assert.ok(v, `${name}: variant ${id} exists`);
    if (want.legacy) { assert.notEqual(v.completeSnapshot, true, `${id} stays a legacy variant`); continue; }
    assert.equal(v.completeSnapshot, true, id);
    assert.equal(v.sourceProfileId, want.src, id);
    assert.deepEqual(v.naturalWeapons, [], `${id} has no natural weapons`);
  }
  // No unprinted flat skill bonuses remain on the base record.
  assert.deepEqual(sys.skillBonuses ?? [], [], `${name} base skillBonuses`);

  // ---- every selection materializes exactly its own grants, with no defense bonus unless a legacy record already had one ----
  for (const [id, want] of Object.entries(byVariant)) {
    const o = await observe(name, id === 'base' ? null : id);
    assert.deepEqual(o.racial, want.racial, `${name}/${id} racial`);
    if (want.langs) assert.deepEqual(o.langs, want.langs, `${name}/${id} languages`);
    if (want.traits) assert.deepEqual(o.traits, want.traits, `${name}/${id} traits`);
    assert.deepEqual(o.rerolls, want.rerolls, `${name}/${id} rerolls`);
    assert.deepEqual(o.def, want.def ?? [0, 0, 0], `${name}/${id} defense species bonus`);
    sameSet(o.passives, want.legacyPassives ?? []);
    if (want.grants) assert.deepEqual(o.grants, want.grants, `${name}/${id} grants`);
  }

  // ---- switching across EVERY ordered pair, then reapplying: result equals selecting directly (no residue, idempotent) ----
  const ids = Object.keys(byVariant);
  const direct = {};
  for (const id of ids) { const o = await observe(name, id === 'base' ? null : id); direct[id] = { racial: o.racial, langs: o.langs, traits: o.traits, rerolls: o.rerolls, passives: o.passives, def: o.def }; }
  for (const from of ids) for (const to of ids) {
    if (from === to) continue;
    const actor = makeActor();
    await selectSpecies(actor, name, from === 'base' ? null : from);
    const o = await observe(name, to === 'base' ? null : to, actor);
    assert.deepEqual({ racial: o.racial, langs: o.langs, traits: o.traits, rerolls: o.rerolls, passives: o.passives, def: o.def }, direct[to], `${name}: ${from} -> ${to} equals direct ${to}`);
    const again = await observe(name, to === 'base' ? null : to, actor);          // finalize twice
    assert.deepEqual({ racial: again.racial, traits: again.traits, rerolls: again.rerolls, passives: again.passives, def: again.def },
      { racial: direct[to].racial, traits: direct[to].traits, rerolls: direct[to].rerolls, passives: direct[to].passives, def: direct[to].def }, `${name}: ${to} reapplied`);
  }
}

// ---- Publication identity: one book never inherits another's features ----
{
  const ur = await observe('Chadra-Fan', 'chadra-fan-ur-2b-02');
  const leg = await observe('Chadra-Fan', 'chadra-fan-leg-2c-12');
  assert.ok(ur.traits.includes('heightened-awareness') && !leg.traits.includes('heightened-awareness'));
  assert.ok(!ur.racial.cha && leg.racial.cha === 2 && !leg.racial.dex);
  const goi = await observe('Bith', 'bith-goi-2g-01');
  const tog = await observe('Bith', 'bith-tog-2k-01');
  assert.ok(goi.traits.includes('scent') && !tog.traits.includes('scent'));
  assert.ok(tog.rerolls.includes('perception') && !goi.rerolls.includes('perception'));
  assert.ok(!tog.racial.cha && goi.racial.cha === 2);
}

// ---- Nothing is automated from prose: deferred mechanics stay text-only (see rules register RD-003/004/005/010) ----
{
  const cw = await observe('Chagrian', 'chagrian-cw-2h-11');
  assert.deepEqual(cw.def, [0, 0, 0], 'conditional Radiation Resistance must not become an unconditional Fortitude bonus');
  const kr = await observe('Krevaaki', 'krevaaki-ur-2b-04');
  assert.deepEqual(kr.def, [0, 0, 0], 'Carapace is deferred (RD-003), not automated');
  assert.deepEqual(kr.passives, []);
  const bith = await observe('Bith', 'bith-goi-2g-01');
  assert.deepEqual(bith.passives, []);
}

// ---- Base-record cleanups: only grants that NO audited publication prints were removed ----
const sc = (n, key) => [...(sidecar[n].structuralTraits || []), ...(sidecar[n].conditionalTraits || []), ...(sidecar[n].activatedAbilities || [])].map(t => t.id);
assert.ok(!sc('Chiss').includes('darkvision') && !sc('Chiss').includes('tactical-training'));
assert.ok(!sc('Bith').includes('musical-savant') && !sc('Bith').includes('fragile'));
assert.ok(!recs.Chagrian.canonicalTraits.some(t => /Codru-Ji/i.test(t.name)), 'foreign-species sentence removed from Chagrian');
assert.ok(!recs.Chagrian.special.some(s => /Codru-Ji/i.test(s)));

// ---- Barabel: both publications are verified snapshots with natural attacks (see species-profile-invariants) ----
assert.equal(recs.Barabel.variants.filter(v => v.completeSnapshot).length, 2, 'Barabel has both audited publications');

console.log('PASS: species multi-publication');
