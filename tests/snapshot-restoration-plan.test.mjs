import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';

// P1-7 — Exact, Failure-Aware Snapshot Restoration.
// Pure production-path tests for the deletion-aware patch/plan builders
// snapshot-service.js relies on. Zero Foundry dependency at runtime, but
// snapshot-restoration-plan.js imports its sibling module via an absolute
// "/systems/foundryvtt-swse/..." specifier, so the path loader must be
// registered first.
registerFoundryPathLoader();

const { flattenWithPaths, buildDeletionAwarePatch } = await import('../scripts/governance/snapshot/deletion-aware-patch.js');
const {
  buildActorRootRestorationPatch,
  buildEmbeddedDocumentRestorePlan,
  SNAPSHOT_RESTORATION_SCOPE
} = await import('../scripts/governance/snapshot/snapshot-restoration-plan.js');

// --- flattenWithPaths ---

{
  assert.deepEqual(flattenWithPaths({ a: { b: 1, c: 2 } }), { 'a.b': 1, 'a.c': 2 });
  assert.deepEqual(flattenWithPaths({ a: [1, 2] }), { a: [1, 2] }, 'arrays are atomic leaves');
  assert.deepEqual(flattenWithPaths({}), { '': {} }, 'empty object is its own leaf at the given prefix');
  assert.deepEqual(flattenWithPaths(null), { '': null });
}

// --- buildDeletionAwarePatch ---

// 1. Every previous value is restored.
{
  const patch = buildDeletionAwarePatch({ previous: { hp: { value: 5 } }, current: {}, rootPath: 'system' });
  assert.equal(patch['system.hp.value'], 5);
}

// 2. A key introduced since the snapshot is deleted via -=.
{
  const patch = buildDeletionAwarePatch({ previous: { a: 1 }, current: { a: 1, b: 2 }, rootPath: 'system' });
  assert.equal(patch['system.-=b'], null);
  assert.equal(patch['system.a'], 1);
}

// 3. Deletion at a nested parent path uses the correct -=leafKey placement.
{
  const patch = buildDeletionAwarePatch({ previous: { hp: {} }, current: { hp: { value: 5 } }, rootPath: 'system' });
  assert.equal(patch['system.hp.-=value'], null);
}

// 4. excludePaths protects a subtree from both restoration and deletion.
{
  const patch = buildDeletionAwarePatch({
    previous: { 'foundryvtt-swse': { snapshots: ['old'] }, swse: { thing: 1 } },
    current: { 'foundryvtt-swse': { snapshots: ['current'] }, swse: { thing: 2, extra: 3 } },
    rootPath: 'flags',
    excludePaths: ['foundryvtt-swse.snapshots']
  });
  assert.ok(!('flags.foundryvtt-swse.snapshots' in patch), 'excluded path must not be restored');
  assert.equal(patch['flags.swse.thing'], 1);
  assert.equal(patch['flags.swse.-=extra'], null);
}

// 5. Root-level patch (rootPath = '') restores/deletes at the top level.
{
  const patch = buildDeletionAwarePatch({ previous: { name: 'A' }, current: { name: 'A', extra: 1 }, rootPath: '' });
  assert.equal(patch.name, 'A');
  assert.equal(patch['-=extra'], null);
}

// --- buildActorRootRestorationPatch ---

// 6. Full-actor scope restores name/img/system/flags/ownership/prototypeToken.
{
  const patch = buildActorRootRestorationPatch({
    snapshotActor: {
      name: 'Old Name', img: 'old.png',
      system: { hp: { value: 10 } },
      flags: { swse: { a: 1 } },
      ownership: { default: 0, userA: 3 },
      prototypeToken: { name: 'Old Token' }
    },
    currentActor: {
      name: 'New Name', img: 'new.png',
      system: { hp: { value: 3 }, newField: true },
      flags: { swse: { a: 1, b: 2 } },
      ownership: { default: 2, userA: 3, userB: 2 },
      prototypeToken: { name: 'New Token' }
    },
    scope: SNAPSHOT_RESTORATION_SCOPE.FULL_ACTOR
  });
  assert.equal(patch.name, 'Old Name');
  assert.equal(patch.img, 'old.png');
  assert.equal(patch['system.hp.value'], 10);
  assert.equal(patch['system.-=newField'], null);
  assert.equal(patch['flags.swse.a'], 1);
  assert.equal(patch['flags.swse.-=b'], null);
  assert.equal(patch['ownership.default'], 0);
  assert.equal(patch['ownership.userA'], 3);
  assert.equal(patch['ownership.-=userB'], null, 'a key introduced after the snapshot must be deleted, not set to NONE');
  assert.equal(patch['prototypeToken.name'], 'Old Token');
}

// 7. The snapshot-history ledger is never touched by a flags restore.
{
  const patch = buildActorRootRestorationPatch({
    snapshotActor: { flags: { 'foundryvtt-swse': { snapshots: ['stale'] } } },
    currentActor: { flags: { 'foundryvtt-swse': { snapshots: ['live-history'] } } },
    scope: SNAPSHOT_RESTORATION_SCOPE.FULL_ACTOR
  });
  const touchesHistory = Object.keys(patch).some(k => k.includes('snapshots'));
  assert.equal(touchesHistory, false);
}

// 8. system-and-flags scope never touches ownership/prototypeToken/name/img.
{
  const patch = buildActorRootRestorationPatch({
    snapshotActor: { name: 'Old', system: { a: 1 }, flags: { x: 1 }, ownership: { default: 0 }, prototypeToken: { name: 'T' } },
    currentActor: { name: 'New', system: {}, flags: {}, ownership: {}, prototypeToken: {} },
    scope: SNAPSHOT_RESTORATION_SCOPE.SYSTEM_AND_FLAGS
  });
  assert.ok(!('name' in patch));
  assert.ok(!Object.keys(patch).some(k => k.startsWith('ownership')));
  assert.ok(!Object.keys(patch).some(k => k.startsWith('prototypeToken')));
  assert.equal(patch['system.a'], 1);
  assert.equal(patch['flags.x'], 1);
}

// 9. embedded-items scope produces an empty root patch (no root fields touched).
{
  const patch = buildActorRootRestorationPatch({
    snapshotActor: { name: 'Old', system: { a: 1 } },
    currentActor: { name: 'New', system: {} },
    scope: SNAPSHOT_RESTORATION_SCOPE.EMBEDDED_ITEMS
  });
  assert.deepEqual(patch, {});
}

// --- buildEmbeddedDocumentRestorePlan ---

// 10. Unchanged item retains the same id and is neither updated nor deleted.
{
  const doc = { _id: 'item-1', name: 'Blaster', system: { damage: '3d8' } };
  const plan = buildEmbeddedDocumentRestorePlan({ snapshotDocuments: [doc], currentDocuments: [{ ...doc }] });
  assert.deepEqual(plan.update, []);
  assert.deepEqual(plan.deleteIds, []);
  assert.deepEqual(plan.create, []);
  assert.deepEqual(plan.expectedIds, ['item-1']);
}

// 11. Modified item is updated in place (same id, deletion-aware patch).
{
  const snapshotDoc = { _id: 'item-1', name: 'Blaster', system: { damage: '3d8' } };
  const currentDoc = { _id: 'item-1', name: 'Blaster', system: { damage: '1d6', extra: true } };
  const plan = buildEmbeddedDocumentRestorePlan({ snapshotDocuments: [snapshotDoc], currentDocuments: [currentDoc] });
  assert.equal(plan.update.length, 1);
  assert.equal(plan.update[0]._id, 'item-1');
  assert.equal(plan.update[0]['system.damage'], '3d8');
  assert.equal(plan.update[0]['system.-=extra'], null);
  assert.deepEqual(plan.deleteIds, []);
}

// 12. A snapshot item missing from current is recreated with its original id.
{
  const snapshotDoc = { _id: 'item-1', name: 'Blaster' };
  const plan = buildEmbeddedDocumentRestorePlan({ snapshotDocuments: [snapshotDoc], currentDocuments: [] });
  assert.equal(plan.create.length, 1);
  assert.equal(plan.create[0]._id, 'item-1');
  assert.equal(plan.deleteIds.length, 0);
}

// 13. A current item absent from the snapshot is deleted.
{
  const currentDoc = { _id: 'item-2', name: 'New Item' };
  const plan = buildEmbeddedDocumentRestorePlan({ snapshotDocuments: [], currentDocuments: [currentDoc] });
  assert.deepEqual(plan.deleteIds, ['item-2']);
  assert.deepEqual(plan.create, []);
}

// 14. Mixed scenario: one unchanged, one modified, one missing, one extra.
{
  const snapshotDocuments = [
    { _id: 'unchanged', v: 1 },
    { _id: 'modified', v: 1 },
    { _id: 'missing', v: 1 }
  ];
  const currentDocuments = [
    { _id: 'unchanged', v: 1 },
    { _id: 'modified', v: 2 },
    { _id: 'extra', v: 1 }
  ];
  const plan = buildEmbeddedDocumentRestorePlan({ snapshotDocuments, currentDocuments });
  assert.equal(plan.update.length, 1);
  assert.equal(plan.update[0]._id, 'modified');
  assert.deepEqual(plan.deleteIds, ['extra']);
  assert.equal(plan.create.length, 1);
  assert.equal(plan.create[0]._id, 'missing');
  assert.deepEqual(plan.expectedIds.sort(), ['missing', 'modified', 'unchanged']);
}

console.log('Snapshot restoration plan builders (P1-7) pure tests passed.');
