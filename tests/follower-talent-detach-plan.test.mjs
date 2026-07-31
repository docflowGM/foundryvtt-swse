import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';

// R4-1 — follower-talent-detach-plan.js: pure data builders extracted from
// follower-hooks.js's auto-detach transaction so the DATA side of that
// operation (which items to delete, what the owner-registry before/after
// patches look like, what the slot-removal before/after patches look like)
// is production-path tested under plain Node, independent of
// follower-hooks.js itself (which cannot load in the Foundry-shim harness).
//
// Coverage tier: (a) direct production-path — zero Foundry dependency,
// loaded and executed for real.

registerFoundryPathLoader();

const {
  computeGrantedItemIdsForTalent,
  buildOwnerRegistryDetachPatch,
  buildSlotRemovalPatch
} = await import('../scripts/domain/followers/follower-talent-detach-plan.js');

function makeItem(id, talentItemId, scope = 'foundryvtt-swse') {
  const flags = { [scope]: { grantedByTalent: { talentItemId } } };
  return {
    id,
    flags,
    getFlag(s, key) { return this.flags?.[s]?.[key]; }
  };
}

// 1. Only items granted by the exact talent item id are selected.
{
  const items = [makeItem('i1', 'talent-a'), makeItem('i2', 'talent-b'), makeItem('i3', 'talent-a')];
  const ids = computeGrantedItemIdsForTalent(items, 'talent-a');
  assert.deepEqual(ids, ['i1', 'i3']);
}

// 2. No matching items -> empty array, not throwing.
{
  const items = [makeItem('i1', 'talent-b')];
  assert.deepEqual(computeGrantedItemIdsForTalent(items, 'talent-a'), []);
}

// 3. Legacy 'swse' scope flags are still recognized (getSwseFlag's
// canonical-first/legacy-fallback contract).
{
  const items = [makeItem('i1', 'talent-a', 'swse')];
  assert.deepEqual(computeGrantedItemIdsForTalent(items, 'talent-a'), ['i1']);
}

// 4. Empty/undefined items array is safe.
{
  assert.deepEqual(computeGrantedItemIdsForTalent([], 'talent-a'), []);
  assert.deepEqual(computeGrantedItemIdsForTalent(undefined, 'talent-a'), []);
}

// 5. buildOwnerRegistryDetachPatch: commitPatch removes the target from all
// three registries; rollbackPatch restores the EXACT pre-mutation arrays
// (not a recompute).
{
  const ownedActors = [{ id: 'f1' }, { id: 'other' }];
  const followers = [{ id: 'f1' }, { id: 'other' }];
  const minions = [{ id: 'f1' }];
  const { commitPatch, rollbackPatch } = buildOwnerRegistryDetachPatch({
    ownedActors, followers, minions, followerActorId: 'f1'
  });
  assert.deepEqual(commitPatch['system.ownedActors'], [{ id: 'other' }]);
  assert.deepEqual(commitPatch['flags.foundryvtt-swse.followers'], [{ id: 'other' }]);
  assert.deepEqual(commitPatch['flags.foundryvtt-swse.minions'], []);
  assert.deepEqual(rollbackPatch['system.ownedActors'], ownedActors);
  assert.deepEqual(rollbackPatch['flags.foundryvtt-swse.followers'], followers);
  assert.deepEqual(rollbackPatch['flags.foundryvtt-swse.minions'], minions);
}

// 6. buildOwnerRegistryDetachPatch tolerates missing/undefined arrays.
{
  const { commitPatch, rollbackPatch } = buildOwnerRegistryDetachPatch({ followerActorId: 'f1' });
  assert.deepEqual(commitPatch['system.ownedActors'], []);
  assert.deepEqual(rollbackPatch['system.ownedActors'], []);
}

// 7. buildSlotRemovalPatch: remainingSlots excludes the target slot id;
// rollbackSlots is the exact original array (identity-safe for a caller
// that persists it as-is on rollback).
{
  const slots = [{ id: 's1' }, { id: 's2' }];
  const { remainingSlots, rollbackSlots } = buildSlotRemovalPatch(slots, 's1');
  assert.deepEqual(remainingSlots, [{ id: 's2' }]);
  assert.equal(rollbackSlots, slots);
}

// 8. buildSlotRemovalPatch is pure — does not mutate the input.
{
  const slots = [{ id: 's1' }, { id: 's2' }];
  const before = JSON.parse(JSON.stringify(slots));
  buildSlotRemovalPatch(slots, 's1');
  assert.deepEqual(slots, before);
}

console.log('follower-talent-detach-plan.js production-path tests passed.');
