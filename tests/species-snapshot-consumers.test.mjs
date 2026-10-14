import assert from 'node:assert/strict';
import { makeActor, selectSpecies } from './helpers/species-actor-sim.mjs';

// A snapshot-resolved actor must not read name-keyed base-species data
// (species-traits.json sidecar, embedded base species item).

const { actorUsesResolvedSnapshot } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');
const { SpeciesTraitPassiveAdapter } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/passive/species-trait-passive-adapter.js');
const { PassiveAdapter } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/passive/passive-adapter.js');
const { DefenseCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js');
const { mirrorRacialAbilities } = await import('/systems/foundryvtt-swse/scripts/actors/v2/character-actor.js');

// Predicate: both persisted locations count; plain variants and no variant do not.
assert.equal(actorUsesResolvedSnapshot({ system: { speciesVariant: { completeSnapshot: true } } }), true);
assert.equal(actorUsesResolvedSnapshot({ flags: { swse: { speciesVariant: { completeSnapshot: true } } } }), true);
assert.equal(actorUsesResolvedSnapshot({ system: { speciesVariant: { id: 'legacy' } } }), false);
assert.equal(actorUsesResolvedSnapshot({}), false);
assert.equal(actorUsesResolvedSnapshot(null), false);

// The materialized actor really carries the flag (so the consumers can see it).
{
  const actor = makeActor();
  await selectSpecies(actor, 'Neimoidian', 'neimoidian-core-2a-20');
  assert.equal(actorUsesResolvedSnapshot(actor), true);
  const plain = makeActor();
  await selectSpecies(plain, 'Neimoidian');
  assert.equal(actorUsesResolvedSnapshot(plain), false);
}

// 1. Passive adapter: sidecar passives registered for a plain actor, none for a snapshot actor.
{
  const registered = [];
  const original = PassiveAdapter.register;
  PassiveAdapter.register = (_actor, ability) => { registered.push(ability); };
  try {
    const advozse = { system: { race: 'Advozse' }, flags: { swse: {} } };           // Natural Armor sidecar passive
    SpeciesTraitPassiveAdapter.registerFromActor(advozse, {});
    assert.ok(registered.length > 0, 'control: sidecar passives register for a plain actor');
    registered.length = 0;
    const snap = { system: { race: 'Advozse', speciesVariant: { completeSnapshot: true } }, flags: { swse: {} } };
    SpeciesTraitPassiveAdapter.registerFromActor(snap, {});
    assert.equal(registered.length, 0, 'snapshot actor must not register base sidecar passives');
  } finally { PassiveAdapter.register = original; }
}

// 2. Defense calculator: embedded base species item ignored for snapshot actors; resolved flags still apply.
{
  const speciesItem = { type: 'species', name: 'X', system: { canonicalTraits: [{ rules: [{ type: 'defenseModifier', defense: 'reflex', value: 1 }] }] } };
  const plain = { items: [speciesItem], system: {}, flags: { swse: {} } };
  assert.equal(DefenseCalculator._collectSpeciesDefenseBonus(plain, 'reflex'), 1, 'control');
  const snap = { items: [speciesItem], system: { speciesVariant: { completeSnapshot: true } }, flags: { swse: {} } };
  assert.equal(DefenseCalculator._collectSpeciesDefenseBonus(snap, 'reflex'), 0);
  const prose = { type: 'species', name: 'X', system: { description: 'Takes a -2 species penalty to Will Defense' } };
  assert.equal(DefenseCalculator._collectSpeciesDefenseBonus({ items: [prose], system: { speciesVariant: { completeSnapshot: true } }, flags: { swse: {} } }, 'will'), 0);
  const withFlags = { items: [speciesItem], system: { speciesVariant: { completeSnapshot: true } }, flags: { swse: { speciesPassiveBonuses: { reflex: [{ value: 2 }] } } } };
  assert.equal(DefenseCalculator._collectSpeciesDefenseBonus(withFlags, 'reflex'), 2);
}

// 3. Derived racialAbilities: base sidecar list for plain actors, the resolved trait list for snapshot actors.
{
  const plainSystem = { species: 'Neimoidian', derived: {} };
  mirrorRacialAbilities(plainSystem, { flags: { swse: {} } });
  const baseNames = plainSystem.derived.racialAbilities.map(a => a.name);
  const actor = makeActor();
  await selectSpecies(actor, 'Neimoidian', 'neimoidian-core-2a-20');
  const snapSystem = { species: 'Neimoidian', speciesVariant: actor.system.speciesVariant, derived: {} };
  mirrorRacialAbilities(snapSystem, actor);
  const snapNames = snapSystem.derived.racialAbilities.map(a => a.name);
  assert.deepEqual(snapNames.sort(), ['Conditional Bonus Feat', 'Skills']);
  for (const n of baseNames) if (!snapNames.includes(n)) assert.ok(!snapNames.includes(n), `base trait ${n} leaked`);
}

console.log('PASS: species snapshot consumers');
