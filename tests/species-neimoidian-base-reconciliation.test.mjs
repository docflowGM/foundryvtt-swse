import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeActor, selectSpecies, speciesFootprint } from './helpers/species-actor-sim.mjs';

// Base Neimoidian must equal its published Galaxy of Intrigue p.18 profile:
// -2 Str, +2 Cha; Basic, Neimoidian; one feature (two conditional Skill Focus grants).
// "Cowardly" (-2 Will), "Mercantile Training" (+5 Persuasion) and the language
// token "speak" appear in no audited publication and were sidecar/parse contamination.

const read = p => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const rec = readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).find(r => r._id === 'species-neimoidian').system;

assert.deepEqual(rec.languages, ['Basic', 'Neimoidian']);
assert.deepEqual(rec.canonicalStats.languages, ['Basic', 'Neimoidian']);
assert.deepEqual(rec.abilityMods, { str: -2, dex: 0, con: 0, int: 0, wis: 0, cha: 2 });

for (const file of ['../data/species-traits.json', '../data/species-traits-migrated.json']) {
  const n = read(file).find(x => x.name === 'Neimoidian');
  assert.deepEqual(n.structuralTraits, [], `${file}: no unsupported structural traits`);
  assert.ok(!JSON.stringify(n).includes('Cowardly') || JSON.stringify(n.variants).includes('Cowardly'), file);
}

// Existing alternate preserved, byte-for-byte meaningful content, until its provenance is certified.
const alt = rec.variants.find(v => v.id === 'neimoidian-alternate');
assert.ok(alt);
assert.deepEqual(alt.languages, ['speak', 'Basic', 'Neimoidian', 'Pak Pak']);
assert.equal(alt.abilities, '+2 Int, +2 Cha, -2 Str');
assert.deepEqual(alt.special, ['Conditional Bonus Feats', 'Deceptive']);

// Materialized base actor: exactly the published grants, no Will penalty, no business Persuasion bonus.
const actor = makeActor();
await selectSpecies(actor, 'Neimoidian');
const fp = speciesFootprint(actor);
assert.deepEqual(fp.racial, { str: -2, dex: 0, con: 0, int: 0, wis: 0, cha: 2 });
assert.deepEqual(Object.keys(actor.flags.swse.speciesTraits), ['Conditional Bonus Feats']);
assert.deepEqual(actor.flags.swse.speciesLanguages ?? [], []);
assert.deepEqual(fp.flags.speciesPassiveBonuses ?? {}, {});

const { DefenseCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js');
const { SpeciesTraitPassiveAdapter } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/passive/species-trait-passive-adapter.js');
const { PassiveAdapter } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-adapter.js');
const registered = [];
const original = PassiveAdapter.register;
PassiveAdapter.register = (_a, ability) => registered.push(ability);
try {
  SpeciesTraitPassiveAdapter.registerFromActor({ system: { race: 'Neimoidian' }, flags: { swse: {} } }, {});
  assert.deepEqual(registered, [], 'no sidecar-derived Neimoidian passives');
} finally { PassiveAdapter.register = original; }
assert.equal(DefenseCalculator._collectSpeciesDefenseBonus({ items: [], system: {}, flags: actor.flags }, 'will'), 0);

console.log('PASS: neimoidian base reconciliation');
