import assert from 'node:assert/strict';
import { makeActor, selectSpecies, speciesFootprint, applyPlan } from './helpers/species-actor-sim.mjs';

const { reconcileSpeciesGrant, computeSpeciesGrantKey, MANIFEST_FLAG } =
  await import('/systems/foundryvtt-swse/scripts/species/species-grant-reconciliation.js');

const direct = async (name, variant = null) => { const a = makeActor(); await selectSpecies(a, name, variant); return speciesFootprint(a); };
const NEI_CORE = 'neimoidian-core-2a-20';

// ---- A -> B -> A returns to exactly the direct-A footprint (no residue from B) ----
for (const [a, b] of [['Human', 'Wookiee'], ['Wookiee', 'Human'], ['Trandoshan', 'Bothan'], ['Barabel', 'Human']]) {
  const actor = makeActor();
  await selectSpecies(actor, a);
  await selectSpecies(actor, b);
  assert.deepEqual(speciesFootprint(actor), await direct(b), `${a} -> ${b} must equal direct ${b}`);
  await selectSpecies(actor, a);
  assert.deepEqual(speciesFootprint(actor), await direct(a), `${a} -> ${b} -> ${a} must equal direct ${a}`);
}

// ---- Wookiee -> Human specifically clears racial modifiers and species items ----
{
  const actor = makeActor();
  await selectSpecies(actor, 'Wookiee');
  assert.equal(actor.system.attributes.str.racial, 4);
  assert.ok(actor.items.some(i => i.name === 'Rage'));
  await selectSpecies(actor, 'Human');
  assert.equal(actor.system.attributes.str.racial, 0);
  assert.equal(actor.system.attributes.con.racial, 0);
  assert.deepEqual(actor.items.filter(i => i.flags?.swse?.speciesGranted), []);
  assert.equal(actor.flags.swse.hasRage, false);
  assert.deepEqual(actor.flags.swse.speciesLanguages, []);
}

// ---- Unrelated actor content survives every switch ----
{
  const actor = makeActor();
  actor.items.push({ id: 'blaster', type: 'weapon', name: 'Blaster Pistol', flags: {} });
  actor.items.push({ id: 'talent', type: 'talent', name: 'Some Talent', flags: { swse: {} } });
  actor.items.push({ id: 'manual-claws', type: 'weapon', name: 'Claws', flags: { swse: { isNaturalWeapon: true } } }); // user-made, not species-granted
  actor.flags.swse.userNote = 'keep me';
  actor.system.skills.climb.trained = true; // trained by the player, not the species
  await selectSpecies(actor, 'Wookiee');
  await selectSpecies(actor, 'Human');
  await selectSpecies(actor, 'Trandoshan');
  for (const id of ['blaster', 'talent', 'manual-claws']) assert.ok(actor.items.some(i => i.id === id), id);
  assert.equal(actor.flags.swse.userNote, 'keep me');
  assert.equal(actor.system.skills.climb.trained, true);
}

// ---- Variant switching within one species, repeatedly ----
{
  const actor = makeActor();
  const baseFp = await direct('Neimoidian');
  const coreFp = await direct('Neimoidian', NEI_CORE);
  assert.notDeepEqual(baseFp.racial, coreFp.racial);
  for (let i = 0; i < 4; i++) {
    await selectSpecies(actor, 'Neimoidian', NEI_CORE);
    assert.deepEqual(speciesFootprint(actor), coreFp, `core pass ${i}`);
    await selectSpecies(actor, 'Neimoidian');
    assert.deepEqual(speciesFootprint(actor), baseFp, `base pass ${i}`);
  }
  assert.equal(coreFp.racial.int, 2);
  assert.equal(coreFp.racial.cha, 0);
  assert.equal(baseFp.racial.cha, 2);
  assert.equal(baseFp.racial.int, 0);
}

// ---- Finalizing / reopening twice is a no-op ----
for (const name of ['Wookiee', 'Barabel', 'Human']) {
  const actor = makeActor();
  await selectSpecies(actor, name);
  const first = speciesFootprint(actor);
  const itemIds = actor.items.map(i => i.id);
  const { res } = await selectSpecies(actor, name);
  assert.deepEqual(speciesFootprint(actor), first, `${name} reapply`);
  assert.deepEqual(actor.items.map(i => i.id), itemIds, `${name} reapply must not recreate items`);
  assert.equal(res.mutations.itemsToCreate, undefined);
  assert.equal(res.mutations.itemsToDelete, undefined);
  await selectSpecies(actor, name);
  assert.equal(actor.items.length, itemIds.length);
}

// ---- Legacy actor (no manifest, stale species data) is repaired by the next apply ----
{
  const actor = makeActor();
  await selectSpecies(actor, 'Wookiee');
  delete actor.flags.swse.speciesGrantManifest;                          // simulate pre-manifest actor
  actor.items.forEach(i => { delete i.flags.swse.speciesGrantKey; });    // and pre-key items
  await selectSpecies(actor, 'Human');
  assert.deepEqual(speciesFootprint(actor).racial, { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
  assert.deepEqual(actor.items.filter(i => i.flags?.swse?.speciesGranted), []);
}

// ---- Unit: skills flipped by a grant are revoked; skills the player already had are not ----
{
  const plan = { 'system.skills.stealth.trained': true, 'system.skills.climb.classSkill': true };
  const first = reconcileSpeciesGrant({
    grantKey: 'a|base', plan, manifest: null, speciesName: 'A', items: [],
    actorState: { skills: { stealth: { trained: false }, climb: { classSkill: false } } },
  });
  assert.deepEqual(first.manifest.trainedSkills, ['stealth']);
  assert.deepEqual(first.manifest.classSkills, ['climb']);
  const switched = reconcileSpeciesGrant({
    grantKey: 'b|base', plan: {}, manifest: first.manifest, speciesName: 'B', items: [],
    actorState: { skills: { stealth: { trained: true }, climb: { classSkill: true } } },
  });
  assert.equal(switched.resets['system.skills.stealth.trained'], false);
  assert.equal(switched.resets['system.skills.climb.classSkill'], false);
  // Player already trained it: the grant never flipped it, so it is never revoked.
  const owned = reconcileSpeciesGrant({
    grantKey: 'a|base', plan, manifest: null, speciesName: 'A', items: [],
    actorState: { skills: { stealth: { trained: true }, climb: { classSkill: false } } },
  });
  assert.deepEqual(owned.manifest.trainedSkills, []);
  const afterOwned = reconcileSpeciesGrant({ grantKey: 'b|base', plan: {}, manifest: owned.manifest, speciesName: 'B', items: [], actorState: { skills: { stealth: { trained: true } } } });
  assert.equal('system.skills.stealth.trained' in afterOwned.resets, false);
  // Same skill granted by consecutive species stays revocable by the chain.
  const chained = reconcileSpeciesGrant({ grantKey: 'b|base', plan, manifest: first.manifest, speciesName: 'B', items: [], actorState: { skills: { stealth: { trained: true }, climb: { classSkill: true } } } });
  assert.deepEqual(chained.manifest.trainedSkills, ['stealth']);
  assert.equal('system.skills.stealth.trained' in chained.resets, false);
  // Reapplying the same grant keeps ownership even though the skill is now already true.
  const again = reconcileSpeciesGrant({ grantKey: 'a|base', plan, manifest: first.manifest, speciesName: 'A', items: [], actorState: { skills: { stealth: { trained: true }, climb: { classSkill: true } } } });
  assert.deepEqual(again.manifest.trainedSkills, ['stealth']);
}

// ---- Unit: no-Constitution base is restored when leaving the species ----
{
  const droidish = reconcileSpeciesGrant({ grantKey: 'd|base', plan: { 'system.attributes.con.base': 0 }, manifest: null, speciesName: 'D', items: [], actorState: { conBase: 14 } });
  assert.equal(droidish.manifest.conBaseBefore, 14);
  const reapply = reconcileSpeciesGrant({ grantKey: 'd|base', plan: { 'system.attributes.con.base': 0 }, manifest: droidish.manifest, speciesName: 'D', items: [], actorState: { conBase: 0 } });
  assert.equal(reapply.manifest.conBaseBefore, 14);
  const leaving = reconcileSpeciesGrant({ grantKey: 'h|base', plan: {}, manifest: droidish.manifest, speciesName: 'H', items: [], actorState: { conBase: 0 } });
  assert.equal(leaving.resets['system.attributes.con.base'], 14);
}

// ---- Unit: shared flags not written by this grant are never reset ----
{
  const r = reconcileSpeciesGrant({ grantKey: 'h|base', plan: {}, manifest: { grantKey: 'x|base', written: { 'flags.swse.speciesLanguages': 'array' } }, speciesName: 'H', items: [], actorState: {} });
  assert.equal('flags.swse.hasRage' in r.resets, false, 'hasRage is manifest-owned only');
}

assert.equal(computeSpeciesGrantKey({ id: 'species-x', variant: { id: 'v' } }), 'species-x|v');
assert.equal(computeSpeciesGrantKey({ id: 'species-x' }), 'species-x|base');
assert.equal(MANIFEST_FLAG, 'flags.swse.speciesGrantManifest');
console.log('PASS: species grant reconciliation');
