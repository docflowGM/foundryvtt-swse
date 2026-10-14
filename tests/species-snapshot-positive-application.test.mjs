import assert from 'node:assert/strict';
import { makeActor, selectSpecies, speciesFootprint, SpeciesRegistry } from './helpers/species-actor-sim.mjs';

// A selected publication's OWN grants must be positively applied (not merely displayed), and the
// base species' grants must be absent. Variants here are synthetic and in-memory only.

globalThis.window ??= globalThis;
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
globalThis.sessionStorage ??= globalThis.localStorage;
globalThis.document ??= { addEventListener() {}, createElement() { return { style: {}, classList: { add() {}, remove() {} }, addEventListener() {} }; }, body: {} };
globalThis.navigator ??= { userAgent: 'node' };
const f = (globalThis.foundry ??= {});
f.applications ??= {}; f.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: B => B, DialogV2: class {} };

const { DefenseCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js');
const { SkillsStep } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/skills-step.js');

function addSnapshot(speciesName, over) {
  const entry = SpeciesRegistry.getByName(speciesName);
  const zero = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  entry.variants.push({
    id: over.id, label: over.id, source: 'Synthetic', completeSnapshot: true, sourceProfileId: `SYN-${over.id}`,
    size: 'Medium', speed: 6, movement: { walk: 6 }, abilities: '', abilityMods: { ...zero, ...over.abilityMods }, abilityChoice: null,
    skillBonuses: [], special: (over.traits || []).map(t => t.name), languages: over.languages || ['Basic'],
    naturalWeapons: over.naturalWeapons || [], description: '', traits: over.traits || [],
  });
}
const bothan = SpeciesRegistry.getByName('Bothan');
const trait = name => ({ id: name.toLowerCase().replace(/\s+/g, '-'), ...bothan.canonicalTraits.find(t => t.name === name) });

// ---- Defenses and passives from the snapshot are applied; the base's other passives are not ----
addSnapshot('Bothan', { id: 'syn-iron-will-only', abilityMods: { dex: 2, con: -2 }, languages: ['Basic', 'Bothese'], traits: [trait('Iron Will')] });
{
  const actor = makeActor();
  const base = makeActor();
  await selectSpecies(base, 'Bothan');
  assert.ok(base.flags.swse.speciesPassiveBonuses.stealth, 'precondition: base Bothan has Stealth/Perception passives');

  await selectSpecies(actor, 'Bothan', 'syn-iron-will-only');
  const passives = actor.flags.swse.speciesPassiveBonuses;
  assert.deepEqual(Object.keys(passives), ['will'], 'only the snapshot passive exists');
  assert.equal(passives.will[0].value, 2);
  assert.equal(DefenseCalculator._collectSpeciesDefenseBonus(actor, 'will'), 2, 'snapshot defense is actually applied');
  assert.equal(DefenseCalculator._collectSpeciesDefenseBonus(actor, 'reflex'), 0);
  assert.deepEqual(actor.system.attributes.dex.racial, 2);
  assert.deepEqual(Object.keys(actor.flags.swse.speciesTraits), ['Iron Will'], 'base Conditional Bonus Feat / Spy Network not inherited');
  assert.equal(actor.flags.swse.speciesRerolls.length, 0, 'base reroll right not inherited');

  // snapshot -> base -> snapshot: passives follow the selected profile exactly, in both directions
  await selectSpecies(actor, 'Bothan');
  assert.ok(actor.flags.swse.speciesPassiveBonuses.stealth && actor.flags.swse.speciesPassiveBonuses.will);
  await selectSpecies(actor, 'Bothan', 'syn-iron-will-only');
  assert.deepEqual(Object.keys(actor.flags.swse.speciesPassiveBonuses), ['will']);
  assert.equal(DefenseCalculator._collectSpeciesDefenseBonus(actor, 'will'), 2);
}

// ---- A snapshot's skill passive is applied too ----
addSnapshot('Bothan', { id: 'syn-stealth-only', traits: [trait('Iron Will')].map(t => ({ ...t, name: 'Stealth', id: 'stealth', description: 'A Bothan gains a +2 species bonus on Stealth checks.' })) });
{
  const actor = makeActor();
  await selectSpecies(actor, 'Bothan', 'syn-stealth-only');
  assert.deepEqual(Object.keys(actor.flags.swse.speciesPassiveBonuses), ['stealth']);
  assert.equal(DefenseCalculator._collectSpeciesDefenseBonus(actor, 'will'), 0, 'base Iron Will does not leak into this publication');
}

// ---- Natural weapons come only from the snapshot, and follow switches ----
addSnapshot('Bothan', { id: 'syn-claws', naturalWeapons: [{ name: 'Talons', damage: '1d6', type: 'slashing' }], traits: [trait('Iron Will')] });
{
  const actor = makeActor();
  await selectSpecies(actor, 'Bothan', 'syn-claws');
  assert.deepEqual(speciesFootprint(actor).items, ['weapon:Talons']);
  await selectSpecies(actor, 'Bothan', 'syn-iron-will-only');
  assert.deepEqual(speciesFootprint(actor).items, [], 'Talons revoked on variant switch within one species');
  await selectSpecies(actor, 'Bothan', 'syn-claws');
  assert.deepEqual(speciesFootprint(actor).items, ['weapon:Talons']);
  await selectSpecies(actor, 'Bothan', 'syn-claws');
  assert.equal(actor.items.filter(i => i.name === 'Talons').length, 1, 'idempotent');
}

// ---- Chargen skills step: species class skills come from the selected snapshot only ----
addSnapshot('Anzati', { id: 'syn-no-class-skills', traits: [] });
{
  const baseActor = makeActor();
  const { ctx: baseCtx } = await selectSpecies(baseActor, 'Anzati');
  const { ctx } = await selectSpecies(makeActor(), 'Anzati', 'syn-no-class-skills');
  const step = Object.create(SkillsStep.prototype);
  const refsFor = pending => step._getSpeciesClassSkillRefs({ progressionSession: { getSelection: k => (k === 'pendingSpeciesContext' ? pending : null) } });
  assert.ok(refsFor(baseCtx).length > 0, 'control: base Anzati contributes species class-skill references');
  assert.deepEqual(refsFor(ctx), [], 'snapshot without class-skill traits must not inherit the base species class-skill references');
}

console.log('PASS: species snapshot positive application');
