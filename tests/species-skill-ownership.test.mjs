import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeActor, selectSpecies, setPath } from './helpers/species-actor-sim.mjs';

const { claimIndependentSkills, reconcileSpeciesGrant, MANIFEST_FLAG } =
  await import('/systems/foundryvtt-swse/scripts/species/species-grant-reconciliation.js');

// Mirrors what ActorEngine.updateActor does with the payload before it is applied.
function engineUpdate(actor, payload) {
  const extra = claimIndependentSkills(actor.flags.swse.speciesGrantManifest, payload);
  for (const [k, v] of Object.entries({ ...payload, ...(extra || {}) })) setPath(actor, k, v);
}

// ---- Contract: the real ActorEngine.updateActor routes payloads through the claim rule ----
{
  const src = readFileSync(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('async updateActor(actor, updateData, options = {}) {'));
  assert.ok(fn.slice(0, 1800).includes('claimIndependentSkills(actor?.flags?.swse?.speciesGrantManifest, updateData)'));
}

// ---- Unit: claim rule ----
const manifest = { grantKey: 'a|base', written: {}, trainedSkills: ['climb', 'stealth'], classSkills: ['survival'], conBaseBefore: null };
assert.deepEqual(claimIndependentSkills(manifest, { 'system.skills.climb.trained': true }), { [`${MANIFEST_FLAG}.trainedSkills`]: ['stealth'] });
assert.deepEqual(claimIndependentSkills(manifest, { system: { skills: { survival: { classSkill: true } } } }), { [`${MANIFEST_FLAG}.classSkills`]: [] });
assert.deepEqual(claimIndependentSkills(manifest, { 'system.skills.climb.trained': true, 'system.skills.stealth.trained': true }), { [`${MANIFEST_FLAG}.trainedSkills`]: [] });
assert.equal(claimIndependentSkills(manifest, { 'system.skills.climb.trained': false }), null, 'untraining is not a claim');
assert.equal(claimIndependentSkills(manifest, { 'system.skills.acrobatics.trained': true }), null, 'unrelated skill');
assert.equal(claimIndependentSkills(manifest, { 'system.skills.climb.trained': true, [MANIFEST_FLAG]: {} }), null, 'species payloads are not independent');
assert.equal(claimIndependentSkills(null, { 'system.skills.climb.trained': true }), null);

// ---- Integration on real grants: Anzati grants class-skill access to Stealth and Survival ----
{
  const actor = makeActor();
  await selectSpecies(actor, 'Anzati');
  assert.deepEqual(actor.flags.swse.speciesGrantManifest.classSkills.sort(), ['stealth', 'survival']);
  assert.equal(actor.system.skills.stealth.classSkill, true);

  // The player later independently gains Stealth class-skill access (e.g. via a class or feat).
  engineUpdate(actor, { 'system.skills.stealth.classSkill': true });
  assert.deepEqual(actor.flags.swse.speciesGrantManifest.classSkills, ['survival']);

  await selectSpecies(actor, 'Human');
  assert.equal(actor.system.skills.stealth.classSkill, true, 'independently acquired access survives the switch');
  assert.equal(actor.system.skills.survival.classSkill, false, 'species-only access is revoked');

  // A -> B -> A again: ownership is not re-claimed by the species for an already-true flag.
  await selectSpecies(actor, 'Anzati');
  await selectSpecies(actor, 'Human');
  assert.equal(actor.system.skills.stealth.classSkill, true);
  assert.equal(actor.system.skills.survival.classSkill, false);
}

// ---- Independent acquisition after a chained switch (Shistavanen -> Anzati) ----
{
  const actor = makeActor();
  await selectSpecies(actor, 'Shistavanen');                 // survival
  await selectSpecies(actor, 'Anzati');                      // stealth + survival (survival already true)
  assert.deepEqual(actor.flags.swse.speciesGrantManifest.classSkills.sort(), ['stealth', 'survival']);
  engineUpdate(actor, { 'system.skills.survival.classSkill': true });
  await selectSpecies(actor, 'Human');
  assert.equal(actor.system.skills.survival.classSkill, true);
  assert.equal(actor.system.skills.stealth.classSkill, false);
}

// ---- Trained skills: player training claimed after the grant survives ----
{
  const plan = { 'system.skills.stealth.trained': true };
  const first = reconcileSpeciesGrant({ grantKey: 'a|base', plan, manifest: null, speciesName: 'A', items: [], actorState: { skills: { stealth: { trained: false } } } });
  assert.deepEqual(first.manifest.trainedSkills, ['stealth']);
  const claimed = { ...first.manifest, trainedSkills: claimIndependentSkills(first.manifest, { 'system.skills.stealth.trained': true })[`${MANIFEST_FLAG}.trainedSkills`] };
  const after = reconcileSpeciesGrant({ grantKey: 'b|base', plan: {}, manifest: claimed, speciesName: 'B', items: [], actorState: { skills: { stealth: { trained: true } } } });
  assert.equal('system.skills.stealth.trained' in after.resets, false, 'independently trained skill must not be untrained');
}

console.log('PASS: species skill ownership');
