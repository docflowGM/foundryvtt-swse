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

// Host `Hooks` stand-in: handlers registered through the production registration function fire asynchronously
// (after the creating call returns), like Foundry's post-operation hooks.
const handlers = { createItem: [], deleteItem: [] };
SpeciesConditionalGrantResolver.registerHooks({ on: (name, fn) => handlers[name].push(fn) });
const fire = (name, item) => handlers[name].forEach(fn => fn(item));
const settle = () => new Promise(r => setTimeout(r, 25));
let resolverCreates = 0;

function engineFor(actor) {
  globalThis.SWSE = { ActorEngine: {
    async createEmbeddedDocuments(a, _t, data) {
      const created = data.map(d => ({ ...structuredClone(d), id: `f${nextId++}`, parent: a }));
      a.items.push(...created);
      if (created.some(i => i.flags?.swse?.grantedViaReconciliation)) resolverCreates++;
      for (const item of created) { hookCalls++; fire('createItem', item); }
    },
    async updateActor(a, fields) {
      if (failUpdateOnce) { failUpdateOnce = false; throw new Error('simulated write failure'); }
      for (const [k, v] of Object.entries(fields)) setPath(a, k, v);
    },
    async deleteEmbeddedDocuments(a, _t, ids) {
      const gone = a.items.filter(i => ids.includes(i.id));
      a.items = a.items.filter(i => !ids.includes(i.id));
      for (const item of gone) fire('deleteItem', item);
    },
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
{ // independent ownership survives and the species entitlement stays tracked
  const a = makeActor(); engineFor(a);
  a.items.push({ id: 'own', type: 'feat', name: 'Improved Damage Threshold', flags: { swse: {} }, system: {}, parent: a });
  await apply(a, 'Ebruchi'); withDerived(a, { con: 14 }); await reconcile(a);
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1, 'the independent copy satisfies it; no duplicate');
  assert.equal(a.flags.swse.deferredSpeciesBonusFeats[0].satisfiedByIndependentFeat, true, 'entitlement is still tracked');
  await reconcile(a); await reconcile(a);
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1, 'stable');
  // The independent copy is removed later: the species grant supplies the feat it entitles.
  await globalThis.SWSE.ActorEngine.deleteEmbeddedDocuments(a, 'Item', ['own']);
  await settle();
  const supplied = feats(a, 'Improved Damage Threshold');
  assert.equal(supplied.length, 1, 'species entitlement not silently lost');
  assert.equal(supplied[0].flags.swse.speciesGrantKey, a.flags.swse.speciesGrantManifest.grantKey);
  assert.deepEqual(a.flags.swse.deferredSpeciesBonusFeats, []);
  await apply(a, 'Human');
  assert.equal(feats(a, 'Improved Damage Threshold').length, 0);
}
{ // an independent copy that outlives the species stays independent
  const a = makeActor(); engineFor(a);
  a.items.push({ id: 'own', type: 'feat', name: 'Improved Damage Threshold', flags: { swse: {} }, system: {}, parent: a });
  await apply(a, 'Ebruchi'); withDerived(a, { con: 14 }); await reconcile(a);
  await apply(a, 'Human');
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1);
  assert.equal(a.items.find(i => i.id === 'own').flags.swse.speciesGranted, undefined);
  assert.deepEqual(a.flags.swse.deferredSpeciesBonusFeats ?? [], [], 'no entitlement left attached to Human');
}
{ // grant-key authority: stale, legacy (unkeyed) and unestablished keys never execute
  const a = makeActor(); engineFor(a);
  await apply(a, 'Ebruchi');
  a.system.skills.climb.trained = true; withDerived(a, { con: 10 });
  a.flags.swse.deferredSpeciesBonusFeats.push({ name: 'Precise Shot', requirements: [{ type: 'skillTrained', skill: 'climb' }], grantKey: 'Gran|base', species: 'Gran' });
  await reconcile(a);
  assert.equal(feats(a, 'Precise Shot').length, 0, 'another species grant key: dropped');
  assert.deepEqual(a.flags.swse.deferredSpeciesBonusFeats.map(g => g.name), ['Improved Damage Threshold']);

  a.flags.swse.deferredSpeciesBonusFeats.push({ name: 'Precise Shot', requirements: [{ type: 'skillTrained', skill: 'climb' }], species: 'Ebruchi' });
  await reconcile(a);
  assert.equal(feats(a, 'Precise Shot').length, 0, 'legacy unkeyed entry cannot be attributed: not granted');
  assert.equal(a.flags.swse.deferredSpeciesBonusFeats.find(g => g.name === 'Precise Shot').pendingReason, 'LEGACY_UNKEYED_GRANT', 'kept with a diagnostic');

  // No current species grant key (actor never reconciled): even a keyed entry waits.
  const key = a.flags.swse.speciesGrantManifest.grantKey;
  delete a.flags.swse.speciesGrantManifest;
  withDerived(a, { con: 13 });
  await reconcile(a);
  assert.equal(feats(a, 'Improved Damage Threshold').length, 0, 'missing current key: fails closed');
  assert.equal(a.flags.swse.deferredSpeciesBonusFeats.find(g => g.name === 'Improved Damage Threshold').pendingReason, 'SPECIES_GRANT_KEY_UNESTABLISHED');
  a.flags.swse.speciesGrantManifest = { grantKey: key };
  await reconcile(a);
  assert.equal(feats(a, 'Improved Damage Threshold').length, 1, 'once the grant is established it proceeds');
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

// ---- Registered hooks: feat acquisition re-evaluates; rapid operations; no recursion; no invented revocation ----
{
  const a = makeActor(); engineFor(a);
  await apply(a, 'Gran'); withDerived(a, {});
  assert.equal(feats(a, 'Precise Shot').length, 0);
  hookCalls = 0; resolverCreates = 0;
  const E = globalThis.SWSE.ActorEngine;
  // Rapid consecutive operations without waiting for the hooks to settle.
  await E.createEmbeddedDocuments(a, 'Item', [{ name: 'Point Blank Shot', type: 'feat', system: {}, flags: { swse: {} } }]);
  await E.createEmbeddedDocuments(a, 'Item', [{ name: 'Weapon Finesse', type: 'feat', system: {}, flags: { swse: {} } }]);
  await E.createEmbeddedDocuments(a, 'Item', [{ name: 'Dodge', type: 'feat', system: {}, flags: { swse: {} } }]);
  await settle();
  assert.equal(feats(a, 'Precise Shot').length, 1, 'granted exactly once despite three rapid creations');
  assert.equal(resolverCreates, 1, 'one resolver create; its own item did not recurse');
  assert.equal(hookCalls, 4, 'three independent creations + the one resolver item');
  assert.equal(feats(a, 'Precise Shot')[0].flags.swse.speciesGrantKey, a.flags.swse.speciesGrantManifest.grantKey);
  // Losing the prerequisite: no revocation semantics are invented.
  await E.deleteEmbeddedDocuments(a, 'Item', [feats(a, 'Point Blank Shot')[0].id]);
  await settle();
  assert.equal(feats(a, 'Precise Shot').length, 1, 'printed text grants it; nothing says it is lost again');
  // Rapid delete + create (re-acquire) is stable.
  await E.createEmbeddedDocuments(a, 'Item', [{ name: 'Point Blank Shot', type: 'feat', system: {}, flags: { swse: {} } }]);
  await E.deleteEmbeddedDocuments(a, 'Item', [feats(a, 'Point Blank Shot')[0].id]);
  await settle();
  assert.equal(feats(a, 'Precise Shot').length, 1);
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
