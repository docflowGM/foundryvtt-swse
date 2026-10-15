import assert from 'node:assert/strict';
import { makeActor, selectSpecies, speciesFootprint } from './helpers/species-actor-sim.mjs';

const { reconcileSpeciesGrant, hasMaterializerSignature } =
  await import('/systems/foundryvtt-swse/scripts/species/species-grant-reconciliation.js');

const claws = (id, extra = {}) => ({ id, type: 'weapon', name: 'Claws', system: { source: 'species-natural-weapon' },
  flags: { swse: { isNaturalWeapon: true, speciesGranted: true, sourceSpecies: 'X', ...extra } } });
const bite = id => ({ ...claws(id), name: 'Bite' });
const planItem = name => ({ type: 'weapon', name, system: { source: 'species-natural-weapon' }, flags: { swse: { isNaturalWeapon: true, sourceSpecies: 'X' } } });
const run = (items, planned, speciesName = 'X') => reconcileSpeciesGrant({
  grantKey: 'species-x|v2', plan: { itemsToCreate: planned.map(planItem) }, manifest: null, speciesName, items, actorState: {},
});

// Signature: only what the materializers create.
assert.equal(hasMaterializerSignature(claws('a')), true);
assert.equal(hasMaterializerSignature({ ...claws('a'), flags: { swse: { speciesGranted: true } } }), false);
assert.equal(hasMaterializerSignature({ ...claws('a'), flags: { swse: { isNaturalWeapon: true } } }), false, 'user-made natural weapon');
assert.equal(hasMaterializerSignature({ id: 'm', type: 'combat-action', name: 'Rage', system: { executionModel: 'species-activated-ability' },
  flags: { swse: { speciesGranted: true, isSpeciesAbility: true, speciesAbilityId: 'rage' } } }), true);

// Same species, variant switch: legacy Bite is stale (new profile has no Bite); legacy Claws is kept, not duplicated.
{
  const r = run([claws('c1'), bite('b1')], ['Claws']);
  assert.deepEqual(r.itemsToDelete, ['b1']);
  assert.deepEqual(r.itemsToCreate, [], 'matching legacy Claws is not recreated');
  assert.deepEqual(r.ambiguousItemIds, []);
}

// New profile adds a weapon: only the new one is created.
{
  const r = run([claws('c1')], ['Claws', 'Bite']);
  assert.deepEqual(r.itemsToDelete, []);
  assert.deepEqual(r.itemsToCreate.map(i => i.name), ['Bite']);
  assert.equal(r.itemsToCreate[0].flags.swse.speciesGrantKey, 'species-x|v2');
}

// User-made items and weak-signature items are never auto-deleted.
{
  const userClaws = { id: 'u1', type: 'weapon', name: 'Bite', flags: { swse: { isNaturalWeapon: true } }, system: {} };
  const userNoFlags = { id: 'u2', type: 'weapon', name: 'Bite', flags: {}, system: {} };
  const weak = { id: 'w1', type: 'weapon', name: 'Bite', flags: { swse: { speciesGranted: true, sourceSpecies: 'X' } }, system: {} };
  const weakOtherSpecies = { id: 'w2', type: 'weapon', name: 'Bite', flags: { swse: { speciesGranted: true, sourceSpecies: 'Y' } }, system: {} };
  const r = run([userClaws, userNoFlags, weak, weakOtherSpecies], ['Claws']);
  assert.deepEqual(r.itemsToDelete, []);
  assert.deepEqual(r.ambiguousItemIds.sort(), ['w1', 'w2']);
}

// Different species, legacy item with a full signature: deleted (unambiguous).
assert.deepEqual(run([{ ...claws('c1'), flags: { swse: { ...claws('c1').flags.swse, sourceSpecies: 'Y' } } }], ['Claws']).itemsToDelete, ['c1']);

// Keyed items follow the key, not the name.
{
  const keyed = { ...claws('k1'), flags: { swse: { ...claws('k1').flags.swse, speciesGrantKey: 'species-x|v1' } } };
  const same = { ...claws('k2'), flags: { swse: { ...claws('k2').flags.swse, speciesGrantKey: 'species-x|v2' } } };
  const r = run([keyed, same], ['Claws']);
  assert.deepEqual(r.itemsToDelete, ['k1']);
  assert.deepEqual(r.itemsToCreate, []);
}

// ---- Integration: a pre-manifest actor reapplying its own species churns nothing ----
{
  const actor = makeActor();
  await selectSpecies(actor, 'Barabel');
  const ids = actor.items.map(i => i.id);
  delete actor.flags.swse.speciesGrantManifest;
  actor.items.forEach(i => { delete i.flags.swse.speciesGrantKey; });   // simulate legacy items
  const { res } = await selectSpecies(actor, 'Barabel');
  assert.deepEqual(actor.items.map(i => i.id), ids, 'legacy items kept by identity');
  assert.equal(res.mutations.itemsToDelete, undefined);
  assert.equal(res.mutations.itemsToCreate, undefined);

  // and a later switch away deletes exactly the species items, never user items
  actor.items.push({ id: 'mine', type: 'weapon', name: 'Bite', flags: {}, system: {} });
  await selectSpecies(actor, 'Human');
  assert.deepEqual(actor.items.map(i => i.id), ['mine']);
}

console.log('PASS: species legacy item migration');
