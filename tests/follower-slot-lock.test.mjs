import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withFollowerSlotLock } from '../scripts/domain/followers/follower-slot-lock.js';

// F-NPC-001: followerSlots read-modify-write reactions (createItem, deleteItem, progression reconcile, repeatable repair, orphan transfer) are serialized per owner.
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

test('without the lock two interleaved read-modify-writes lose an update (the defect)', async () => {
  let store = [];
  const add = async (x) => { const snap = [...store]; await tick(5); snap.push(x); store = snap; };
  await Promise.all([add('a'), add('b')]);
  assert.equal(store.length, 1);
});
test('with the lock the same two writes both land, in call order', async () => {
  let store = [];
  const add = (x) => withFollowerSlotLock('owner1', async () => { const snap = [...store]; await tick(5); snap.push(x); store = snap; });
  await Promise.all([add('a'), add('b'), add('c')]);
  assert.deepEqual(store, ['a', 'b', 'c']);
});
test('different owners do not block each other', async () => {
  const order = [];
  const slow = withFollowerSlotLock('o1', async () => { await tick(30); order.push('o1'); });
  const fast = withFollowerSlotLock('o2', async () => { order.push('o2'); });
  await Promise.all([slow, fast]);
  assert.deepEqual(order, ['o2', 'o1']);
});
test('a rejection reaches its caller but never blocks later work', async () => {
  const bad = withFollowerSlotLock('o3', async () => { throw new Error('boom'); });
  await assert.rejects(bad, /boom/);
  assert.equal(await withFollowerSlotLock('o3', async () => 'ok'), 'ok');
});
test('every followerSlots read-modify-write reaction goes through the lock', () => {
  const hooks = fs.readFileSync('scripts/infrastructure/hooks/follower-hooks.js', 'utf8');
  assert.match(hooks, /withFollowerSlotLock\(actor\.id, \(\) => _reconcileFollowerSlotsLocked\(actor\)\)/);
  assert.match(hooks, /await withFollowerSlotLock\(actor\.id, async \(\) => \{\s*const slots = _getSlots\(actor\);/);
  assert.match(hooks, /emptySlotRemoved = await withFollowerSlotLock/);
  assert.match(fs.readFileSync('scripts/patches/follower-repeatable-entitlement-hotfix.js', 'utf8'), /withFollowerSlotLock\(actor\.id, \(\) => repairRepeatableFollowerEntitlementsLocked/);
  const orphan = fs.readFileSync('scripts/patches/follower-orphan-transfer-hotfix.js', 'utf8');
  assert.match(orphan, /withFollowerSlotLock\(owner\.id, \(\) => clearOwnerRegistriesLocked/);
  assert.match(orphan, /withFollowerSlotLock\(owner\.id, \(\) => setOwnerLinkLocked/);
});
