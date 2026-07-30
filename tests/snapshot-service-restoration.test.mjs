import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { resetFakeActorEngine } from './helpers/foundry-shim/fakes/actor-engine.fake.mjs';

// P1-7 — Exact, Failure-Aware Snapshot Restoration.
//
// Exercises the REAL production scripts/governance/snapshot/snapshot-service.js
// (only ActorEngine is faked — see fakes/actor-engine.fake.mjs's doc
// comment; this file's own `restoreFromSnapshot` fake is a separate,
// pre-existing, deliberately-simplified reimplementation left untouched
// for OTHER tests — this suite calls the granular
// createEmbeddedDocuments/updateEmbeddedDocuments/deleteEmbeddedDocuments/
// updateActor methods the real SnapshotService actually uses).
//
// Coverage tier: (a) direct production-path through the Foundry-shim
// harness — this is the actual trust/correctness boundary named by the
// review; source-regex tests alone would not prove any of this.

registerFoundryPathLoader();

function actorLike(overrides = {}) {
  return {
    id: 'actor-1',
    name: 'Test Actor',
    img: 'actor.png',
    system: { hp: { value: 10 } },
    flags: { swse: {} },
    ownership: { default: 0 },
    prototypeToken: { name: 'Test Actor' },
    items: [],
    effects: [],
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    ...overrides
  };
}

async function freshService() {
  installFoundryShimGlobals();
  resetFakeActorEngine();
  const { SnapshotService } = await import('/systems/foundryvtt-swse/scripts/governance/snapshot/snapshot-service.js');
  return SnapshotService;
}

function snapshotOf(actor, overrides = {}) {
  return {
    schemaVersion: 2,
    scope: 'full-actor',
    name: actor.name,
    img: actor.img,
    system: JSON.parse(JSON.stringify(actor.system)),
    flags: JSON.parse(JSON.stringify(actor.flags)),
    ownership: JSON.parse(JSON.stringify(actor.ownership)),
    prototypeToken: JSON.parse(JSON.stringify(actor.prototypeToken)),
    items: actor.items.map(i => JSON.parse(JSON.stringify(i))),
    effects: actor.effects.map(e => JSON.parse(JSON.stringify(e))),
    ...overrides
  };
}

// 1. Full root restoration succeeds.
{
  const SnapshotService = await freshService();
  const actor = actorLike();
  const snapshot = snapshotOf(actor);
  actor.system.hp.value = 999;
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.system.hp.value, 10);
}

// 2. System fields added after the snapshot are deleted.
{
  const SnapshotService = await freshService();
  const actor = actorLike();
  const snapshot = snapshotOf(actor);
  actor.system.newField = 'introduced-later';
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.system.newField, undefined);
}

// 3. System fields removed after the snapshot are restored.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ system: { hp: { value: 10 }, mp: { value: 5 } } });
  const snapshot = snapshotOf(actor);
  delete actor.system.mp;
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.system.mp.value, 5);
}

// 4. Flags added after the snapshot are deleted.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ flags: { swse: { a: 1 } } });
  const snapshot = snapshotOf(actor);
  actor.flags.swse.b = 2;
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.flags.swse.b, undefined);
  assert.equal(actor.flags.swse.a, 1);
}

// 5. Flags removed after the snapshot are restored.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ flags: { swse: { a: 1, b: 2 } } });
  const snapshot = snapshotOf(actor);
  delete actor.flags.swse.b;
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.flags.swse.b, 2);
}

// 6. Ownership values are restored.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ ownership: { default: 0, userA: 3 } });
  const snapshot = snapshotOf(actor);
  actor.ownership.userA = 1;
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.ownership.userA, 3);
}

// 7. Ownership keys introduced later are deleted, not set to NONE.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ ownership: { default: 0, userA: 3 } });
  const snapshot = snapshotOf(actor);
  actor.ownership.userB = 2;
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal('userB' in actor.ownership, false);
}

// 8. prototypeToken fields are restored.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ prototypeToken: { name: 'Original', sight: { range: 30 } } });
  const snapshot = snapshotOf(actor);
  actor.prototypeToken.name = 'Renamed';
  actor.prototypeToken.sight.range = 60;
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.prototypeToken.name, 'Original');
  assert.equal(actor.prototypeToken.sight.range, 30);
}

// 9. Unchanged Item retains the same id.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1', name: 'Blaster', system: {} }] });
  const snapshot = snapshotOf(actor);
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.items.length, 1);
  assert.equal(actor.items[0]._id, 'item-1');
}

// 10. Modified Item is updated in place (same id).
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1', name: 'Blaster', system: { damage: '3d8' } }] });
  const snapshot = snapshotOf(actor);
  actor.items[0].system.damage = '1d4';
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.items.length, 1);
  assert.equal(actor.items[0]._id, 'item-1');
  assert.equal(actor.items[0].system.damage, '3d8');
}

// 11. Deleted snapshot Item is recreated with the original id.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1', name: 'Blaster' }] });
  const snapshot = snapshotOf(actor);
  actor.items = [];
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(result.exact, true);
  assert.equal(actor.items.length, 1);
  assert.equal(actor.items[0]._id, 'item-1', 'keepId must preserve the original Item id');
}

// 12. Newly added Item (not in snapshot) is deleted.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1', name: 'Blaster' }] });
  const snapshot = snapshotOf(actor);
  actor.items.push({ _id: 'item-2', id: 'item-2', name: 'New Item' });
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.items.length, 1);
  assert.equal(actor.items[0]._id, 'item-1');
}

// 13. Unchanged Active Effect retains the same id.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ effects: [{ _id: 'effect-1', id: 'effect-1', label: 'Buff' }] });
  const snapshot = snapshotOf(actor);
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.effects[0]._id, 'effect-1');
}

// 14. Modified Active Effect is updated in place.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ effects: [{ _id: 'effect-1', id: 'effect-1', label: 'Buff', changes: [{ value: 1 }] }] });
  const snapshot = snapshotOf(actor);
  actor.effects[0].changes = [{ value: 99 }];
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.effects[0]._id, 'effect-1');
  assert.deepEqual(actor.effects[0].changes, [{ value: 1 }]);
}

// 15. Missing snapshot Effect is recreated with the original id.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ effects: [{ _id: 'effect-1', id: 'effect-1', label: 'Buff' }] });
  const snapshot = snapshotOf(actor);
  actor.effects = [];
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.effects[0]._id, 'effect-1');
}

// 16. New Effect (not in snapshot) is deleted.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ effects: [{ _id: 'effect-1', id: 'effect-1', label: 'Buff' }] });
  const snapshot = snapshotOf(actor);
  actor.effects.push({ _id: 'effect-2', id: 'effect-2', label: 'Extra' });
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true);
  assert.equal(actor.effects.length, 1);
  assert.equal(actor.effects[0]._id, 'effect-1');
}

// 17. Item recreation actually verifies keepId — assert restoredItemIds
// matches the snapshot's own ids, not fresh ones.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1', name: 'Blaster' }] });
  const snapshot = snapshotOf(actor);
  actor.items = [];
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.deepEqual(result.restoredItemIds, ['item-1']);
  assert.equal(result.verification.itemsMatched, true);
}

// 18. Effect recreation verifies keepId the same way.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ effects: [{ _id: 'effect-1', id: 'effect-1', label: 'Buff' }] });
  const snapshot = snapshotOf(actor);
  actor.effects = [];
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.deepEqual(result.restoredEffectIds, ['effect-1']);
  assert.equal(result.verification.effectsMatched, true);
}

// 19. An id mismatch (Foundry "refuses" keepId, simulated by the fake's
// _forceIdConflict marker) returns exact: false rather than silently
// claiming identity was preserved.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1', name: 'Blaster' }] });
  const snapshot = snapshotOf(actor);
  snapshot.items[0]._forceIdConflict = true;
  actor.items = [];
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.equal(result.success, true, 'the underlying data restore still succeeds');
  assert.equal(result.exact, false, 'an id that could not be preserved must never be reported as exact');
  assert.ok(!actor.items.some(i => i._id === 'item-1'), 'the new id is NOT the original one');
}

// 20/21. Known-reference remapping is out of scope for this pass — a
// mismatch degrades exactness rather than silently fabricating a remap or
// throwing. idRemap is present (empty) as an honest placeholder, not
// populated with fabricated entries.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1', name: 'Blaster' }] });
  const snapshot = snapshotOf(actor);
  snapshot.items[0]._forceIdConflict = true;
  actor.items = [];
  const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
  assert.deepEqual(result.idRemap, {}, 'this pass does not attempt reference remapping — documented limitation, not fabricated');
}

// 22. Root-step failure returns structured failure.
{
  const SnapshotService = await freshService();
  const actor = actorLike();
  const snapshot = snapshotOf(actor);
  actor.system.hp.value = 1;
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const original = ActorEngine.updateActor;
  ActorEngine.updateActor = async () => { throw new Error('simulated root update failure'); };
  try {
    const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
    assert.equal(result.success, false);
    assert.equal(result.failedStep, 'root');
    assert.equal(result.code, 'SNAPSHOT_ROOT_RESTORE_FAILED');
  } finally {
    ActorEngine.updateActor = original;
  }
}

// 23. Item-delete failure returns structured failure.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1' }] });
  const snapshot = snapshotOf(actor, { items: [] });
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const original = ActorEngine.deleteEmbeddedDocuments;
  ActorEngine.deleteEmbeddedDocuments = async () => { throw new Error('simulated delete failure'); };
  try {
    const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
    assert.equal(result.success, false);
    assert.equal(result.failedStep, 'items');
    assert.equal(result.code, 'SNAPSHOT_ITEM_RESTORE_FAILED');
  } finally {
    ActorEngine.deleteEmbeddedDocuments = original;
  }
}

// 24. Item-update failure returns structured failure.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1', name: 'A' }] });
  const snapshot = snapshotOf(actor);
  actor.items[0].name = 'B';
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const original = ActorEngine.updateEmbeddedDocuments;
  ActorEngine.updateEmbeddedDocuments = async () => { throw new Error('simulated update failure'); };
  try {
    const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
    assert.equal(result.success, false);
    assert.equal(result.failedStep, 'items');
  } finally {
    ActorEngine.updateEmbeddedDocuments = original;
  }
}

// 25. Item-create failure returns structured failure.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1' }] });
  const snapshot = snapshotOf(actor);
  actor.items = [];
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const original = ActorEngine.createEmbeddedDocuments;
  ActorEngine.createEmbeddedDocuments = async () => { throw new Error('simulated create failure'); };
  try {
    const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
    assert.equal(result.success, false);
    assert.equal(result.failedStep, 'items');
  } finally {
    ActorEngine.createEmbeddedDocuments = original;
  }
}

// 26. Effect-step failure returns structured failure with its own code.
{
  const SnapshotService = await freshService();
  const actor = actorLike();
  const snapshot = snapshotOf(actor, { effects: [{ _id: 'effect-1', id: 'effect-1' }] });
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const original = ActorEngine.createEmbeddedDocuments;
  ActorEngine.createEmbeddedDocuments = async (a, embeddedName, ...rest) => {
    if (embeddedName === 'ActiveEffect') throw new Error('simulated effect create failure');
    return original(a, embeddedName, ...rest);
  };
  try {
    const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
    assert.equal(result.success, false);
    assert.equal(result.failedStep, 'effects');
    assert.equal(result.code, 'SNAPSHOT_EFFECT_RESTORE_FAILED');
  } finally {
    ActorEngine.createEmbeddedDocuments = original;
  }
}

// 27-31. Compensation: a failure partway through attempts a bounded
// compensation restore from the in-memory pre-restore safety snapshot,
// reports whether it succeeded, and never recurses (compensation runs
// with _isCompensation, which itself never captures another safety
// snapshot or attempts a second compensation).
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1', name: 'Original' }] });
  const snapshot = snapshotOf(actor);
  actor.items[0].name = 'Changed';
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const originalCreate = ActorEngine.createEmbeddedDocuments;
  // Force a failure on the EFFECTS step (after items already restored),
  // so compensation has something concrete to prove it undid.
  ActorEngine.createEmbeddedDocuments = async (a, embeddedName, ...rest) => {
    if (embeddedName === 'ActiveEffect') throw new Error('simulated late failure');
    return originalCreate(a, embeddedName, ...rest);
  };
  const snapshotWithEffect = snapshotOf(actor, { effects: [{ _id: 'effect-1', id: 'effect-1' }] });
  try {
    const result = await SnapshotService.restoreFromSnapshot(actor, snapshotWithEffect);
    assert.equal(result.success, false);
    assert.equal(result.compensationAttempted, true);
    assert.equal(result.compensationSucceeded, true);
    // Compensation restored the item back to its PRE-RESTORE ("Changed") state.
    assert.equal(actor.items[0].name, 'Changed');
  } finally {
    ActorEngine.createEmbeddedDocuments = originalCreate;
  }
}

// 30. Compensation failure is reported honestly. The forward restore
// deletes an existing Item (snapshot has none) and then fails on the
// Effects step — undoing that deletion during compensation requires
// recreating the Item, which fails too (both forward and compensation
// creates are forced to throw), so compensation itself genuinely fails
// rather than trivially succeeding because nothing needed undoing.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1', name: 'Original' }] });
  const snapshot = snapshotOf(actor, { items: [], effects: [{ _id: 'effect-1', id: 'effect-1' }] });
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const original = ActorEngine.createEmbeddedDocuments;
  ActorEngine.createEmbeddedDocuments = async () => { throw new Error('everything fails'); };
  try {
    const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
    assert.equal(result.success, false);
    assert.equal(result.compensationAttempted, true);
    assert.equal(result.compensationSucceeded, false);
    assert.ok(result.compensationErrors.length > 0);
  } finally {
    ActorEngine.createEmbeddedDocuments = original;
  }
}

// 31. Compensation does not recurse: a compensation call (_isCompensation)
// that itself fails reports failure directly, without attempting a
// second, nested compensation.
{
  const SnapshotService = await freshService();
  const actor = actorLike();
  const snapshot = snapshotOf(actor);
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const original = ActorEngine.updateActor;
  ActorEngine.updateActor = async () => { throw new Error('always fails'); };
  try {
    const result = await SnapshotService.restoreFromSnapshot(actor, snapshot, { _isCompensation: true });
    assert.equal(result.success, false);
    assert.equal(result.compensationAttempted, false, 'a compensation attempt must never itself trigger another compensation');
    assert.equal(result.code, 'SNAPSHOT_COMPENSATION_FAILED');
  } finally {
    ActorEngine.updateActor = original;
  }
}

// 32. Verification mismatch (an id silently vanished with no thrown
// error) is still detected and downgrades exact to false.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ items: [{ _id: 'item-1', id: 'item-1' }] });
  const snapshot = snapshotOf(actor);
  actor.items = [];
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  const original = ActorEngine.createEmbeddedDocuments;
  ActorEngine.createEmbeddedDocuments = async (a, embeddedName) => {
    // Simulate a create that "succeeds" but silently produces nothing.
    return [];
  };
  try {
    const result = await SnapshotService.restoreFromSnapshot(actor, snapshot);
    assert.equal(result.success, true);
    assert.equal(result.exact, false);
    assert.deepEqual(result.verification.missingItemIds, ['item-1']);
  } finally {
    ActorEngine.createEmbeddedDocuments = original;
  }
}

// 33. Legacy snapshot (no schemaVersion) loads without destructive
// over-restoration — only fields actually present are restored (flags
// absent from the legacy snapshot are left completely untouched) — and
// reports exact: false unconditionally.
{
  const SnapshotService = await freshService();
  const actor = actorLike({ flags: { swse: { livePreserved: true } } });
  const legacySnapshot = { system: JSON.parse(JSON.stringify(actor.system)), name: actor.name, img: actor.img, items: [], effects: [] };
  actor.system.hp.value = 999;
  const result = await SnapshotService.restoreFromSnapshot(actor, legacySnapshot);
  assert.equal(result.success, true);
  assert.equal(actor.system.hp.value, 10, 'system is still restored from a legacy snapshot');
  assert.equal(actor.flags.swse.livePreserved, true, 'flags absent from a legacy snapshot must never be touched');
  assert.equal(result.exact, false, 'a legacy snapshot must never claim exact restoration');
}

// 34. Wrong/missing Actor is rejected.
{
  const SnapshotService = await freshService();
  const result = await SnapshotService.restoreFromSnapshot(null, {});
  assert.equal(result.success, false);
  assert.equal(result.code, 'SNAPSHOT_ACTOR_MISMATCH');
}

// 35. Missing snapshot is rejected.
{
  const SnapshotService = await freshService();
  const actor = actorLike();
  const result = await SnapshotService.restoreFromSnapshot(actor, null);
  assert.equal(result.success, false);
  assert.equal(result.code, 'SNAPSHOT_NOT_FOUND');
}

resetFoundryShimGlobals();
console.log('SnapshotService exact restoration (P1-7) production-path tests passed.');
