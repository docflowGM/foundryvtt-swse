import assert from 'node:assert/strict';
import { makeActor, selectSpecies, computeDefenses, SpeciesRegistry } from './helpers/species-actor-sim.mjs';

// Final defense totals through the production pipeline (ability registration + DerivedCalculator.computeAll).
// A species defense contribution reaches the total by exactly ONE of two paths:
//   flagBonus     - ledger flags (flags.swse.speciesPassiveBonuses) read by DefenseCalculator
//   modifierBonus - the passive adapter's ModifierEngine adjustment
// Never both, and never a bonus the Core Species Traits do not print.

const DEFENSES = ['fortitude', 'reflex', 'will'];
const CORE = ['Human', 'Bothan', 'Cerean', 'Duros', 'Ewok', 'Gamorrean', 'Gungan', 'Ithorian', 'Kel Dor', 'Mon Calamari', 'Quarren', 'Rodian',
  'Sullustan', 'Trandoshan', "Twi'lek", 'Wookiee', 'Zabrak', 'Aqualish', 'Hutt', 'Neimoidian', 'Yuuzhan Vong'];

// Printed unconditional species defense bonuses (Core Species Traits, audited profiles CORE-2A-xx).
const PRINTED = {
  Bothan: { will: 2 },          // Iron Will
  Gamorrean: { fortitude: 2 },  // Great Fortitude
  Gungan: { reflex: 2 },        // Lightning Reflexes
  Ithorian: { will: 2 },        // Iron Will
  "Twi'lek": { fortitude: 2 },  // Great Fortitude
  Trandoshan: { reflex: 1 },    // Natural Armor
  Zabrak: { fortitude: 1, reflex: 1, will: 1 }, // Superior Defenses
};
// Size is a separate rule applied by DefenseCalculator (Small +1, Large -1 Reflex), not a species grant.
const SIZE_REFLEX = { Ewok: 1, Hutt: -1 };

const split = d => Object.fromEntries(DEFENSES.map(k => [k, { flag: d[k].flagBonus, mod: d[k].modifierBonus, ability: d[k].abilityMod, total: d[k].total }]));
const speciesBonus = s => Object.fromEntries(DEFENSES.map(k => [k, s[k].flag + s[k].mod]));

async function defensesFor(name, variant = null, actor = makeActor()) {
  await selectSpecies(actor, name, variant);
  return split(await computeDefenses(actor));
}

// ---- Every Core species: exactly the printed bonus, applied once, total consistent ----
for (const name of CORE) {
  const s = await defensesFor(name);
  const want = PRINTED[name] ?? {};
  for (const k of DEFENSES) {
    const bonus = want[k] ?? 0;
    assert.equal(s[k].flag + s[k].mod, bonus, `${name} ${k} species bonus`);
    assert.ok(!(s[k].flag > 0 && s[k].mod > 0), `${name} ${k} must not be applied by both paths`);
    const size = k === 'reflex' ? (SIZE_REFLEX[name] ?? 0) : 0;
    assert.equal(s[k].total, 10 + s[k].ability + size + bonus, `${name} ${k} final total`);
  }
}

// ---- Conditional stays conditional: Hutt Force Resistance (+5 Will only against Use the Force) adds nothing to Will ----
{
  const s = await defensesFor('Hutt');
  assert.equal(s.will.flag + s.will.mod, 0);
}

// ---- Switching and reapplication: the previous species' bonus disappears, the new one applies once ----
{
  const direct = {};
  for (const n of ['Zabrak', 'Gamorrean', 'Human', 'Twi\'lek']) direct[n] = speciesBonus(await defensesFor(n));
  const actor = makeActor();
  const sequence = ['Zabrak', 'Gamorrean', 'Human', "Twi'lek", 'Zabrak', 'Zabrak', 'Gamorrean'];
  for (const name of sequence) {
    await selectSpecies(actor, name);
    const s = split(await computeDefenses(actor));
    assert.deepEqual(speciesBonus(s), direct[name], `after switching to ${name}`);
    await selectSpecies(actor, name);                         // reapply / finalize again: no accumulation
    assert.deepEqual(speciesBonus(split(await computeDefenses(actor))), direct[name], `reapplying ${name}`);
  }
}

// ---- Snapshot variants: the selected publication's defenses apply exactly once, the base's never leak ----
{
  // Twi'lek's base Great Fortitude is delivered by the passive adapter. A snapshot suppresses the adapter and
  // must deliver its own Great Fortitude through the ledger flags instead: still exactly +2, from one path.
  const twilek = SpeciesRegistry.getByName("Twi'lek");
  const zero = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const snap = (id, traits) => twilek.variants.push({
    id, label: id, source: 'Synthetic', completeSnapshot: true, sourceProfileId: `SYN-${id}`, size: 'Medium', speed: 6, movement: { walk: 6 },
    abilities: '', abilityMods: { ...zero }, abilityChoice: null, skillBonuses: [], special: traits.map(t => t.name), languages: ['Basic'],
    naturalWeapons: [], description: '', traits,
  });
  snap('syn-with-gf', [{ id: 'great-fortitude', name: 'Great Fortitude', description: "Twi'leks gain a +2 Species bonus to their Fortitude Defense.",
    rules: [{ type: 'defenseModifier', defense: 'fortitude', value: 2, bonusType: 'species', when: { type: 'always' }, id: 'great-fortitude-rule-0' }] }]);
  snap('syn-without-gf', [{ id: 'low-light-vision', name: 'Low-Light Vision', description: 'Twileks ignore concealment (but not total concealment) from darkness.' }]);

  const base = await defensesFor("Twi'lek");
  assert.equal(base.fortitude.mod, 2); assert.equal(base.fortitude.flag, 0);

  const withGf = await defensesFor("Twi'lek", 'syn-with-gf');
  assert.equal(withGf.fortitude.flag, 2, 'snapshot delivers its own Great Fortitude via flags');
  assert.equal(withGf.fortitude.mod, 0, 'adapter suppressed for snapshot actors: no double count');

  const withoutGf = await defensesFor("Twi'lek", 'syn-without-gf');
  assert.equal(withoutGf.fortitude.flag + withoutGf.fortitude.mod, 0, "base Twi'lek Great Fortitude must not leak into a publication that lacks it");

  // And back: base -> snapshot -> base on one actor.
  const actor = makeActor();
  await selectSpecies(actor, "Twi'lek");
  await selectSpecies(actor, "Twi'lek", 'syn-with-gf');
  assert.deepEqual(speciesBonus(split(await computeDefenses(actor))), { fortitude: 2, reflex: 0, will: 0 });
  await selectSpecies(actor, "Twi'lek", 'syn-without-gf');
  assert.deepEqual(speciesBonus(split(await computeDefenses(actor))), { fortitude: 0, reflex: 0, will: 0 });
  await selectSpecies(actor, "Twi'lek");
  const back = split(await computeDefenses(actor));
  assert.equal(back.fortitude.mod, 2); assert.equal(back.fortitude.flag, 0);
}

// ---- The ability-registration cache key must change with the selected publication ----
{
  const { AbilityExecutionCoordinator } = await import('/systems/foundryvtt-swse/scripts/engine/abilities/ability-execution-coordinator.js');
  const sig = system => AbilityExecutionCoordinator._actorAbilityRegistrationSignature({ id: 'a', type: 'character', items: [], system, flags: { swse: {} } });
  const plain = sig({ race: "Twi'lek", species: "Twi'lek" });
  const snapshot = sig({ race: "Twi'lek", species: "Twi'lek", speciesVariant: { id: 'v1', completeSnapshot: true } });
  const other = sig({ race: "Twi'lek", species: "Twi'lek", speciesVariant: { id: 'v2', completeSnapshot: true } });
  assert.notEqual(plain, snapshot, 'base vs snapshot must not share a cached registration');
  assert.notEqual(snapshot, other, 'different snapshots must not share a cached registration');
  assert.equal(plain, sig({ race: "Twi'lek", species: "Twi'lek" }), 'stable for an unchanged actor');
}

console.log('PASS: core species defense totals');
