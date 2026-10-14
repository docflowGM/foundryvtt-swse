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
  // Yuuzhan Vong (CORE-2A-21): printed traits are Force Immunity, Technophobic (-5 with mechanical tools),
  // Weapon Familiarity (amphistaff with simple-weapon proficiency). Not Primitive: the Legacy Era book prints a
  // different Technophobic (starting-proficiency suppression) and lives in its own snapshot variant.
  'Yuuzhan Vong': {
    traits: ['force-immunity', 'technophobic', 'weapon-familiarity'],
    skillBonuses: [], naturalWeapons: [], items: [], passives: [],
    sidecarAbsent: ['living-technology', 'primitive', 'biotech-proficiency'],
    textIncludes: [['technophobic', /-5/], ['weapon-familiarity', /simple weapons/i], ['force-immunity', /Will Defense/]],
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

// ---- Yuuzhan Vong: Core base and Legacy Era snapshot never mix ----
{
  const sys = recs['Yuuzhan Vong'];
  assert.ok(sys.variants.some(v => v.id === 'yuuzhan-vong-alternate'), 'existing alternate variant preserved');
  const legacy = sys.variants.find(v => v.sourceProfileId === 'LEG-2C-07');
  assert.equal(legacy.completeSnapshot, true);
  assert.deepEqual(legacy.special, ['Force Immunity', 'Technophobic', 'Weapon Familiarity']);
  assert.equal(legacy.primitive, true);
  assert.deepEqual(legacy.suppressedClassProficiencies, ['Weapon Proficiency (Heavy Weapons)', 'Weapon Proficiency (Pistols)', 'Weapon Proficiency (Rifles)']);

  const actor = makeActor();
  await selectSpecies(actor, 'Yuuzhan Vong', legacy.id);
  assert.equal(actor.flags.swse.primitiveSpecies, true);
  assert.deepEqual(actor.flags.swse.suppressedClassProficiencies, legacy.suppressedClassProficiencies);
  assert.equal(actor.system.speciesVariant.sourceProfileId, 'LEG-2C-07');
  // 'primitive' is the materializer's own marker for starting-proficiency suppression (used by prerequisites).
  assert.deepEqual(actor.flags.swse.speciesTraitIds, ['force-immunity', 'technophobic', 'weapon-familiarity', 'primitive']);
  assert.ok(!JSON.stringify(actor.flags.swse.speciesTraits).includes('Biotech'));

  await selectSpecies(actor, 'Yuuzhan Vong');                 // Legacy -> Core: suppression must be revoked
  assert.ok(!actor.flags.swse.primitiveSpecies);
  assert.deepEqual(actor.flags.swse.suppressedClassProficiencies, []);
  assert.deepEqual(actor.flags.swse.speciesTraitIds, ['force-immunity', 'technophobic', 'weapon-familiarity'], 'Legacy primitive marker revoked');
  assert.ok(!('Primitive' in actor.flags.swse.speciesTraits), 'Legacy Primitive trait metadata revoked');
  assert.equal(actor.system.speciesVariant ?? null, null);
  await selectSpecies(actor, 'Yuuzhan Vong', legacy.id);      // and back
  assert.equal(actor.flags.swse.primitiveSpecies, true);
}

console.log('PASS: core species reconciliation');
