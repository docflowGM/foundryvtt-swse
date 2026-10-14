import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeActor, selectSpecies } from './helpers/species-actor-sim.mjs';

// Core Rulebook species reconciled against the audited printed Species Traits
// (Phase 3-A source profiles CORE-2A-xx). Each row pins what the shipped data must
// NOT grant (unprinted) and what it must still grant (printed + automated today).
// Source rule text is intentionally not reproduced here.

const recs = Object.fromEntries(readFileSync(new URL('../packs/species.db', import.meta.url), 'utf8').split('\n').filter(Boolean)
  .map(l => JSON.parse(l)).map(r => [r.name, r.system]));
const sidecar = f => Object.fromEntries(JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8')).map(x => [x.name, x]));
const sidecars = [sidecar('../data/species-traits.json'), sidecar('../data/species-traits-migrated.json')];
const ids = list => (list || []).map(t => t.id);

const CORE = {
  // Wookiee (CORE-2A-16): printed traits are Extraordinary Recuperation, Rage, Weapon Familiarity (bowcaster), Skills.
  // The Core text states Wookiees never use climbing claws in combat: no natural attack, no flat skill bonuses.
  Wookiee: {
    traits: ['expert-climber', 'extraordinary-recuperation', 'intimidating-presence', 'rage', 'weapon-familiarity'],
    skillBonuses: [], naturalWeapons: [], items: ['combat-action:Rage'], passives: [],
    sidecarAbsent: ['mighty', 'endurance', 'rage'],
    textExcludes: [['weapon-familiarity', /ryyk/i]],
    textIncludes: [['weapon-familiarity', /bowcaster/i], ['weapon-familiarity', /rifles?/i]],
  },
  // Gamorrean (CORE-2A-06): printed traits are Primitive, Great Fortitude, Bonus Feat (Improved Damage Threshold).
  // No Arg'garok familiarity, no Will Defense penalty and no charge damage bonus are printed.
  Gamorrean: {
    traits: ['bonus-feat', 'great-fortitude', 'primitive'],
    skillBonuses: [], naturalWeapons: [], items: [], passives: [],
    sidecarAbsent: ['low-cunning', 'brutal-charge', 'weapon-familiarity-arg-garok'],
    primitive: true,
  },
  // Hutt (CORE-2A-19): printed traits are Force Resistance, Supreme Stability (no trips / not knocked prone), Skills
  // (reroll Persuasion, keep better). Speed 2 lives in movement data; there is no Fortitude bonus.
  Hutt: {
    traits: ['force-resistance', 'supreme-stability', 'silver-tongued'],
    skillBonuses: [], naturalWeapons: [], items: [], passives: [],
    sidecarAbsent: ['immense-bulk', 'slow'],
    textIncludes: [['supreme-stability', /tripped/i], ['supreme-stability', /prone/i], ['force-resistance', /\+5/]],
  },
  // Trandoshan (CORE-2A-14): printed traits are Darkvision, Limb Regeneration, Natural Armor, Bonus Feat.
  // Clawed hands are narrative only; there is no natural attack or flat skill bonus, and no hit-point regeneration.
  Trandoshan: {
    traits: ['bonus-feat', 'darkvision', 'limb-regeneration', 'natural-armor'],
    skillBonuses: [], naturalWeapons: [], items: [], passives: [],
    sidecarAbsent: ['claws', 'regeneration'],
  },
};

for (const [name, want] of Object.entries(CORE)) {
  const sys = recs[name];
  assert.deepEqual(ids(sys.canonicalTraits), want.traits, `${name} canonicalTraits`);
  assert.deepEqual(sys.special, sys.canonicalTraits.map(t => t.name), `${name} special mirrors canonicalTraits`);
  assert.deepEqual(ids(sys.canonicalStats.traits), want.traits, `${name} canonicalStats.traits`);
  assert.deepEqual(sys.skillBonuses ?? [], want.skillBonuses, `${name} skillBonuses`);
  assert.deepEqual(sys.naturalWeapons ?? [], want.naturalWeapons, `${name} naturalWeapons`);
  for (const [traitId, re] of want.textExcludes ?? []) assert.ok(!re.test(sys.canonicalTraits.find(t => t.id === traitId).description), `${name}/${traitId} excludes ${re}`);
  for (const [traitId, re] of want.textIncludes ?? []) assert.ok(re.test(sys.canonicalTraits.find(t => t.id === traitId).description), `${name}/${traitId} includes ${re}`);
  for (const sc of sidecars) {
    const entry = sc[name];
    const present = [...ids(entry.structuralTraits), ...ids(entry.conditionalTraits), ...ids(entry.activatedAbilities)];
    for (const absent of want.sidecarAbsent) assert.ok(!present.includes(absent), `${name} sidecar must not carry ${absent}`);
    assert.deepEqual(ids(entry.canonicalTraits), want.traits, `${name} sidecar canonicalTraits mirror the pack`);
  }

  const actor = makeActor();
  await selectSpecies(actor, name);
  assert.deepEqual(actor.items.map(i => `${i.type}:${i.name}`).sort(), want.items, `${name} materialized items`);
  assert.deepEqual(Object.keys(actor.flags.swse.speciesPassiveBonuses ?? {}), want.passives, `${name} materialized passives`);
  assert.equal(!!actor.flags.swse.primitiveSpecies, !!want.primitive, `${name} primitive`);
}

console.log('PASS: core species reconciliation');
