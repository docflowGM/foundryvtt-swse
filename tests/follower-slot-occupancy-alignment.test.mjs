import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// P1-1/P1-2 — Follower slot occupancy had two competing definitions: most
// call sites checked only the raw `slot.createdActorId` field, while
// AlliesSurfaceService's local slotCreatedActorId() also recognized
// actorId/assignedActorId/dependentActorId/npcActorId (fields several live
// producers — beast conversion, ally rehire — actually write). A slot
// occupied via one of those alternate fields read as "open" everywhere
// except the Allies surface. This suite proves the new canonical
// scripts/domain/followers/follower-slot-occupancy.js module resolves
// occupancy consistently, and that ally-assignment-service.js's
// findExistingFollowerRelationship() (the service-boundary world-graph
// scan) now uses it and reports conflicts across multiple owners.
//
// Coverage tiers:
//   Tests 1-9: (a) direct production-path — follower-slot-occupancy.js is
//   a pure module with zero Foundry dependency, loaded and executed for
//   real.
//   Tests 10-15: (a) direct production-path — ally-assignment-service.js
//   loads and findExistingFollowerRelationship() executes for real through
//   the Foundry-shim harness (already proven loadable by
//   tests/gm-existing-npc-allies-assignment.test.mjs).

registerFoundryPathLoader();

const { resolveFollowerSlotActorId, isFollowerSlotOccupied } = await import('../scripts/domain/followers/follower-slot-occupancy.js');

// 1. null/undefined slot resolves to no occupant.
assert.equal(resolveFollowerSlotActorId(null), null);
assert.equal(resolveFollowerSlotActorId(undefined), null);
assert.equal(isFollowerSlotOccupied(null), false);

// 2. createdActorId is recognized (the primary/canonical write field).
assert.equal(resolveFollowerSlotActorId({ createdActorId: 'actor-1' }), 'actor-1');
assert.equal(isFollowerSlotOccupied({ createdActorId: 'actor-1' }), true);

// 3. actorId is recognized (e.g. AlliesSurfaceService rehire path).
assert.equal(resolveFollowerSlotActorId({ actorId: 'actor-2' }), 'actor-2');

// 4. assignedActorId is recognized.
assert.equal(resolveFollowerSlotActorId({ assignedActorId: 'actor-3' }), 'actor-3');

// 5. dependentActorId is recognized.
assert.equal(resolveFollowerSlotActorId({ dependentActorId: 'actor-4' }), 'actor-4');

// 6. npcActorId is recognized (e.g. beast-conversion path).
assert.equal(resolveFollowerSlotActorId({ npcActorId: 'actor-5' }), 'actor-5');

// 7. createdActorId wins over the alternates when more than one is present
// (write precedence matches the field every governed writer actually uses
// first).
assert.equal(resolveFollowerSlotActorId({ createdActorId: 'primary', actorId: 'secondary' }), 'primary');

// 8. Empty string / whitespace-only occupant fields resolve to no occupant,
// not a falsy-but-truthy empty id.
assert.equal(resolveFollowerSlotActorId({ createdActorId: '' }), null);
assert.equal(resolveFollowerSlotActorId({ createdActorId: '   ' }), null);
assert.equal(isFollowerSlotOccupied({ createdActorId: null, actorId: null }), false);

// 9. A slot with none of the recognized fields is open.
assert.equal(isFollowerSlotOccupied({ id: 'slot-1', talentName: 'Attract Followers' }), false);

// ---------------------------------------------------------------------
// findExistingFollowerRelationship — alias-aware world-graph scan
// ---------------------------------------------------------------------

const { findExistingFollowerRelationship } = await import('../scripts/engine/crew/ally-assignment-service.js');

const SYSTEM_ID = 'foundryvtt-swse';

function makeActor(id, overrides = {}) {
  const flags = { [SYSTEM_ID]: {}, swse: {}, ...(overrides.flags || {}) };
  return {
    id, name: overrides.name || id, type: overrides.type || 'npc',
    system: overrides.system || {},
    flags,
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    ...overrides
  };
}

function makeActorsCollection(actors = []) {
  const map = new Map(actors.map(a => [a.id, a]));
  return {
    get: (id) => map.get(id),
    [Symbol.iterator]: () => map.values()
  };
}

function asGM(actors = []) {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, actors: makeActorsCollection(actors), users: [] } });
}

// 10. A slot occupied via `actorId` (not createdActorId) is detected —
// the exact gap this fix closes: before this fix the scan only checked
// `slot.createdActorId === targetId` and would have reported "not a
// follower" here, wrongly allowing a second conversion into this Actor.
{
  const target = makeActor('target-1');
  const owner = makeActor('owner-1', { flags: { [SYSTEM_ID]: { followerSlots: [{ id: 'slot-1', actorId: 'target-1' }] } } });
  asGM([target, owner]);
  const result = findExistingFollowerRelationship(target);
  assert.equal(result.isFollower, true);
  assert.equal(result.ownerActorId, 'owner-1');
  assert.equal(result.slotId, 'slot-1');
  assert.deepEqual(result.sources, ['follower-slot-registry']);
  assert.deepEqual(result.conflicts, []);
}

// 11. A slot occupied via `npcActorId` (beast-conversion field) is also
// detected.
{
  const target = makeActor('target-2');
  const owner = makeActor('owner-2', { flags: { [SYSTEM_ID]: { followerSlots: [{ id: 'slot-2', npcActorId: 'target-2' }] } } });
  asGM([target, owner]);
  const result = findExistingFollowerRelationship(target);
  assert.equal(result.isFollower, true);
  assert.equal(result.ownerActorId, 'owner-2');
}

// 12. No match anywhere resolves to isFollower: false with empty
// sources/conflicts.
{
  const target = makeActor('target-3');
  const owner = makeActor('owner-3', { flags: { [SYSTEM_ID]: { followerSlots: [{ id: 'slot-3' }] } } });
  asGM([target, owner]);
  const result = findExistingFollowerRelationship(target);
  assert.equal(result.isFollower, false);
  assert.equal(result.ownerActorId, null);
  assert.deepEqual(result.sources, []);
  assert.deepEqual(result.conflicts, []);
}

// 13. A target referenced by TWO different owners' slot registries is
// reported as a conflict (both sources listed), not silently collapsed to
// whichever owner happened to be visited first.
{
  const target = makeActor('target-4');
  const ownerA = makeActor('owner-a', { flags: { [SYSTEM_ID]: { followerSlots: [{ id: 'slot-a', createdActorId: 'target-4' }] } } });
  const ownerB = makeActor('owner-b', { flags: { [SYSTEM_ID]: { followerSlots: [{ id: 'slot-b', createdActorId: 'target-4' }] } } });
  asGM([target, ownerA, ownerB]);
  const result = findExistingFollowerRelationship(target);
  assert.equal(result.isFollower, true);
  assert.equal(result.sources.length, 2);
  assert.equal(result.conflicts.length, 1, 'a second owner claiming the same target must surface as a conflict');
}

// 14. The legacy `followers` registry (entry.id or entry.actorId) is still
// detected alongside the slot registry.
{
  const target = makeActor('target-5');
  const owner = makeActor('owner-5', { flags: { [SYSTEM_ID]: { followers: [{ id: 'target-5' }] } } });
  asGM([target, owner]);
  const result = findExistingFollowerRelationship(target);
  assert.equal(result.isFollower, true);
  assert.equal(result.ownerActorId, 'owner-5');
  assert.deepEqual(result.sources, ['owner-followers-registry']);
}

// 15. validateFollowerConversionSlot uses the same alias-aware occupancy
// check — a slot occupied via `actorId` is rejected as "already occupied"
// instead of being treated as open.
{
  const { validateFollowerConversionSlot } = await import('../scripts/engine/crew/ally-assignment-service.js');
  const result = validateFollowerConversionSlot({ id: 'slot-x', actorId: 'someone' });
  assert.equal(result.valid, false);
  assert.match(result.error, /already occupied/);
}

console.log('Follower slot occupancy alignment tests passed.');
