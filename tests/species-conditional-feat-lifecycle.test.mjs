import assert from 'node:assert/strict';
import { makeActor, selectSpecies, setPath } from './helpers/species-actor-sim.mjs';

// Conditional species feats are granted, owned, retained and revoked through the species grant authority.
const { SpeciesConditionalGrantResolver } = await import('/systems/foundryvtt-swse/scripts/engine/species/SpeciesConditionalGrantResolver.js');
const { ProgressionContentAuthority } = await import('/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js');
const { buildPendingSpeciesContext } = await import('/systems/foundryvtt-swse/scripts/engine/progression/helpers/build-pending-species-context.js');
const quiet = async fn => { const l = console.log, w = console.warn; console.log = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.log = l; console.warn = w; } };

let nextId = 1, hookCalls = 0, failUpdateOnce = false;
const stub = { missing: new Set() };
ProgressionContentAuthority.initialize = async () => {};
ProgressionContentAuthority.getFeatDocument = async ({ name }) => (stub.missing.has(name) ? null : { toObject: () => ({ name, type: 'feat', system: {}, flags: {} }) });

// ActorEngine stand-in: embedded creation fires the createItem hook handler like Foundry does.
function engineFor(actor) {
  globalThis.SWSE = { ActorEngine: {
    async createEmbeddedDocuments(a, _t, data) {
      const created = data.map(d => ({ ...structuredClone(d), id: `f${nextId++}`, parent: a }));
      a.items.push(...created);
      for (const item of created) { hookCalls++; await SpeciesConditionalGrantResolver.onItemCreated(item); }
    },
    async updateActor(a, fields) {
      if (failUpdateOnce) { failUpdateOnce = false; throw new Error('simulated write failure'); }
      for (const [k, v] of Object.entries(fields)) setPath(a, k, v);
    },
    async deleteEmbeddedDocuments(a, _t, ids) { a.items = a.items.filter(i => !ids.includes(i.id)); },
  } };
}
const feats = (a, name) => a.items.filter(i => i.type === 'feat' && i.name === name);
const withDerived = (a, attrs, bab = 0) => { a.system.derived = { attributes: Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, { total: v }])), bab }; };
const apply = (a, name, variant = null) => quiet(() => selectSpecies(a, name, variant, { strict: true }));
const reconcile = a => quiet(() => SpeciesConditionalGrantResolver.reconcile(a));

// ---- Grant, ownership, revocation ----
{
  const a = makeActor(); a.items.forEach(i => (i.parent = a)); engineFor(a);
  await apply(a, 'Ebruchi');
  assert.equal(a.flags.swse.deferredSpeciesBonusFeats.length, 1, 'recorded against the species grant');
  assert.equal(a.flags.swse.deferredSpeciesBonusFeats[0].grantKey, a.flags.swse.speciesGrantManifest.grantKey);
  withDerived(a, { con: 12 });
  await reconcile(a);
  assert.equal(feats(a, 'Improved Damage Threshold').length, 0, 'not eligible at Con 12');
  withDerived(a, { con: 13 });
  await reconcile(a);
  const granted = feats(a, 'Improved Damage Threshold');
  assert.equal(granted.length, 1);
  assert.equal(granted[0].flags.swse.speciesGrantKey, a.flags.swse.speciesGrantManifest.grantKey, 'carries the grant key');
  assert.deepEqual(a.flags.swse.deferredSpeciesBonusFeats, []);

  // Reapplying the same species neither duplicates nor revokes it; a second pass is idempotent.
  await apply(a, 'Ebruchi'); await reconcile(a); await reconcile(a);
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1);

  // Switching to Human removes the species-owned feat; an independently acquired feat of the same name would survive.
  await apply(a, 'Human');
  assert.equal(feats(a, 'Improved Damage Threshold').length, 0, 'species-owned feat revoked');
  assert.deepEqual(a.flags.swse.deferredSpeciesBonusFeats ?? [], [], 'no deferred grant left attached to the new species');

  // A -> B -> A grants it again exactly once.
  await apply(a, 'Ebruchi'); await reconcile(a);
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1);
}
{ // independent ownership survives, and is never duplicated by the species grant
  const a = makeActor(); engineFor(a);
  a.items.push({ id: 'own', type: 'feat', name: 'Improved Damage Threshold', flags: { swse: {} }, system: {}, parent: a });
  await apply(a, 'Ebruchi'); withDerived(a, { con: 14 }); await reconcile(a);
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1, 'the independent copy satisfies it; no duplicate');
  assert.deepEqual(a.flags.swse.deferredSpeciesBonusFeats, []);
  await apply(a, 'Human');
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1, 'independent feat is not species-owned and survives');
  assert.equal(a.items.find(i => i.id === 'own').flags.swse.speciesGranted, undefined);
}
{ // a stale deferred entry from another species grant is dropped, never granted
  const a = makeActor(); engineFor(a);
  await apply(a, 'Ebruchi');
  a.flags.swse.deferredSpeciesBonusFeats.push({ name: 'Precise Shot', requirements: [{ type: 'skillTrained', skill: 'climb' }], grantKey: 'Gran|base', species: 'Gran' });
  a.system.skills.climb.trained = true; withDerived(a, { con: 10 });
  await reconcile(a);
  assert.equal(feats(a, 'Precise Shot').length, 0);
  assert.deepEqual(a.flags.swse.deferredSpeciesBonusFeats.map(g => g.name), ['Improved Damage Threshold']);
}

// ---- Fail closed on an unresolved canonical feat; retry; idempotence ----
{
  const a = makeActor(); engineFor(a);
  await apply(a, 'Ebruchi'); withDerived(a, { con: 13 });
  stub.missing.add('Improved Damage Threshold');
  await reconcile(a);
  assert.equal(a.items.filter(i => i.type === 'feat').length, 0, 'no minimal substitute item is created');
  assert.equal(a.flags.swse.deferredSpeciesBonusFeats[0].pendingReason, 'FEAT_DOCUMENT_UNRESOLVED', 'stays pending with a reason');
  await reconcile(a);
  assert.equal(a.items.filter(i => i.type === 'feat').length, 0);
  stub.missing.delete('Improved Damage Threshold');
  await reconcile(a);                       // retry succeeds
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1);
  await reconcile(a);
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1, 'idempotent');
  assert.deepEqual(a.flags.swse.deferredSpeciesBonusFeats, []);
}
// ---- A failed write after creation leaves no duplicate or orphan on retry ----
{
  const a = makeActor(); engineFor(a);
  await apply(a, 'Ebruchi'); withDerived(a, { con: 13 });
  failUpdateOnce = true;
  await assert.rejects(() => reconcile(a), /simulated/);
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1, 'created, keyed to the species grant (revocable)');
  assert.equal(a.flags.swse.deferredSpeciesBonusFeats.length, 1, 'still listed because the write failed');
  await reconcile(a);
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1, 'no duplicate on retry');
  assert.deepEqual(a.flags.swse.deferredSpeciesBonusFeats, []);
  await apply(a, 'Human');
  assert.equal(feats(a, 'Improved Damage Threshold').length, 0, 'the keyed item is revoked with its species grant');
}

// ---- Feat acquisition (the embedded-item path) re-evaluates; no recursion; no invented revocation ----
{
  const a = makeActor(); engineFor(a);
  await apply(a, 'Gran'); withDerived(a, {});
  assert.equal(feats(a, 'Precise Shot').length, 0);
  hookCalls = 0;
  await quiet(() => globalThis.SWSE.ActorEngine.createEmbeddedDocuments(a, 'Item', [{ name: 'Point Blank Shot', type: 'feat', system: {}, flags: { swse: {} } }]));
  assert.equal(feats(a, 'Precise Shot').length, 1, 'Point Blank Shot acquired through the embedded-item path grants Precise Shot');
  assert.equal(hookCalls, 2, 'one independent create + the resolver\'s own create (which did not recurse)');
  assert.equal(feats(a, 'Precise Shot')[0].flags.swse.speciesGrantKey, a.flags.swse.speciesGrantManifest.grantKey);
  // Losing the prerequisite: no revocation semantics are invented.
  await globalThis.SWSE.ActorEngine.deleteEmbeddedDocuments(a, 'Item', [feats(a, 'Point Blank Shot')[0].id]);
  await reconcile(a);
  assert.equal(feats(a, 'Precise Shot').length, 1, 'printed text grants it; nothing says it is lost again');
  await apply(a, 'Human');
  assert.equal(feats(a, 'Precise Shot').length, 0, 'but it does leave with the species grant');
}

// ---- Existing Devaronian actor with no recorded Male/Female choice keeps its stored modifiers ----
{
  const a = makeActor(); engineFor(a);
  a.system.species = { name: 'Devaronian' };
  a.system.attributes.dex.racial = 2; a.system.attributes.wis.racial = -2; a.system.attributes.cha.racial = -2;
  const before = structuredClone(a.system.attributes);
  const ctx = await quiet(() => buildPendingSpeciesContext(a, 'species-devaronian', { source: 'progression' }));
  assert.equal(ctx, null, 'rematerialization is deferred: the unrecorded option is never inferred');
  assert.deepEqual(a.system.attributes, before, 'stored racial modifiers untouched');
  a.flags.swse.speciesAbilityChoice = { id: 'male' };
  a.system.speciesVariant = { id: 'devaronian-leg-2c-13' };
  const ok = await quiet(() => buildPendingSpeciesContext(a, 'species-devaronian', { source: 'progression' }));
  assert.equal(ok.identity.abilityChoice.id, 'male', 'with a recorded choice the exact configuration is restorable');
}
console.log('PASS: species conditional feat lifecycle');
