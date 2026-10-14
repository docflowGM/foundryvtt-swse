import assert from 'node:assert/strict';
import { makeActor, selectSpecies, SpeciesRegistry } from './helpers/species-actor-sim.mjs';

// Within-profile ability choices are validated by the shared species authority (buildPendingSpeciesContext), not only
// by the V2 step, so drag-and-drop, templates and followers cannot bypass them.
const { buildPendingSpeciesContext } = await import('/systems/foundryvtt-swse/scripts/engine/progression/helpers/build-pending-species-context.js');
const { buildSpeciesReplacementPlan } = await import('/systems/foundryvtt-swse/scripts/species/species-plan-transaction.js');
const { applyCanonicalSpeciesToActor } = await import('/systems/foundryvtt-swse/scripts/engine/progression/helpers/apply-canonical-species-to-actor.js');
const { resolveAbilityChoice, getAbilityChoiceOptions } = await import('/systems/foundryvtt-swse/scripts/species/species-ability-choice.js');
const quiet = async fn => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };

const { applySpeciesVariantProfile } = await import('/systems/foundryvtt-swse/scripts/species/species-variant-profile.js');
const dev = SpeciesRegistry.getByName('Devaronian');
const ark = SpeciesRegistry.getByName('Arkanian Offshoot');
const sole = e => e.variants.find(v => v.completeSnapshot);
const devApplied = applySpeciesVariantProfile(dev, sole(dev));
const arkApplied = applySpeciesVariantProfile(ark, sole(ark));
const ctx = (species, choice, source = 'progression', actor = makeActor()) =>
  quiet(() => buildPendingSpeciesContext(actor, choice === undefined ? species : { ...species, selectedAbilityChoice: choice }, { source }));
const racial = a => Object.fromEntries(Object.entries(a.system.attributes).map(([k, v]) => [k, v.racial || 0]).filter(([, v]) => v));

// ---- Pure resolution ----
assert.deepEqual(getAbilityChoiceOptions(devApplied).map(o => o.id), ['male', 'female']);
assert.equal(resolveAbilityChoice(devApplied, null).code, 'MISSING_CHOICE');
assert.equal(resolveAbilityChoice(devApplied, { id: 'nope' }).code, 'UNKNOWN_CHOICE');
assert.equal(resolveAbilityChoice(devApplied, { id: 'male', mods: { str: 2 } }).code, 'MODIFIER_MISMATCH');
assert.equal(resolveAbilityChoice(devApplied, { id: 'male', mods: { dex: 2, wis: -2, cha: -2 } }).ok, true);
assert.equal(resolveAbilityChoice(SpeciesRegistry.getByName('Human'), null).required, false, 'species with no published choice are unaffected');

// ---- New character / any assignment path (chargen, template, follower, drag-drop all call the builder) ----
for (const source of ['progression', 'template', 'drag-drop', 'chargen']) {
  assert.equal(await ctx(dev, undefined, source), null, `${source}: missing choice rejected`);
  assert.equal(await ctx(dev, { id: 'other' }, source), null, `${source}: unknown id rejected`);
  assert.equal(await ctx(dev, { id: 'male', mods: { str: 4 } }, source), null, `${source}: forged modifiers rejected`);
  assert.equal(await ctx(dev, { id: getAbilityChoiceOptions(arkApplied)[0].id, mods: { str: 2 } }, source), null, `${source}: another species' choice rejected`);
}
// Never defaulted: nothing applies without a valid choice.
{
  const actor = makeActor();
  await assert.rejects(() => quiet(() => selectSpecies(actor, 'Devaronian', null, { strict: true })), /no context/);
  assert.deepEqual(racial(actor), {}, 'actor untouched');
}
// The PUBLISHED option supplies the modifiers, whatever the payload carried.
{
  const actor = makeActor();
  await quiet(() => selectSpecies(actor, 'Devaronian', null, { strict: true, abilityChoice: { id: 'female' } }));
  assert.deepEqual(racial(actor), { dex: -2, int: 2, wis: 2 });
  assert.deepEqual(actor.flags.swse.speciesAbilityChoice, { id: 'female', label: 'Female' });
  // Switching replaces (no stacking), and the recorded choice follows.
  await quiet(() => selectSpecies(actor, 'Devaronian', null, { strict: true, abilityChoice: { id: 'male' } }));
  assert.deepEqual(racial(actor), { dex: 2, wis: -2, cha: -2 });
  assert.equal(actor.flags.swse.speciesAbilityChoice.id, 'male');
  // Replacing the species clears the recorded choice.
  await quiet(() => selectSpecies(actor, 'Human'));
  assert.equal(actor.flags.swse.speciesAbilityChoice ?? null, null);
}
// Arkanian Offshoot uses the same authority; a Devaronian option id is not valid for it.
assert.equal(await ctx(ark, { id: 'male' }), null);
assert.ok(await ctx(ark, { id: getAbilityChoiceOptions(arkApplied)[0].id }), 'a published Arkanian option builds');

// ---- Legitimate existing-actor restoration ----
{
  const actor = makeActor();
  await quiet(() => selectSpecies(actor, 'Devaronian', null, { strict: true, abilityChoice: { id: 'female' } }));
  const restored = await quiet(() => buildPendingSpeciesContext(actor, dev.id, { source: 'progression' }));
  assert.ok(restored, 'recorded species + recorded choice restore without re-asking');
  assert.equal(restored.identity.abilityChoice.id, 'female');
  // A different actor (no record) is a new selection and is rejected.
  assert.equal(await quiet(() => buildPendingSpeciesContext(makeActor(), dev.id, { source: 'progression' })), null);
  // Recorded species but a legacy actor with no recorded choice: the option is never inferred, so nothing is
  // rematerialized (its stored racial modifiers are preserved) — see species-conditional-feat-lifecycle.test.mjs.
  const legacy = makeActor();
  legacy.system.species = { name: 'Devaronian' };
  assert.equal(await quiet(() => buildPendingSpeciesContext(legacy, dev.id, { source: 'progression' })), null);
}
// ---- Drag-and-drop plan building rejects before any mutation ----
{
  const actor = makeActor();
  const before = JSON.stringify(actor);
  await assert.rejects(() => quiet(() => buildSpeciesReplacementPlan(actor, 'Devaronian', { buildContext: buildPendingSpeciesContext, applyCanonical: applyCanonicalSpeciesToActor, source: 'drag-drop' })), /could not be resolved/);
  assert.equal(JSON.stringify(actor), before);
  const plan = await quiet(() => buildSpeciesReplacementPlan(actor, 'Devaronian', { buildContext: buildPendingSpeciesContext, applyCanonical: applyCanonicalSpeciesToActor, source: 'drag-drop', identity: { ...dev, selectedAbilityChoice: { id: 'male' } } }));
  assert.ok(plan.mutations);
}
console.log('PASS: species ability-choice validation');
