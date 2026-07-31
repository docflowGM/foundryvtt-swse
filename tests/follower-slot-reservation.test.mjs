import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// P2-3 — Persistent follower-slot conversion reservations.
//
// Coverage tiers:
//   (a) DIRECT PRODUCTION-PATH — scripts/domain/followers/follower-slot-occupancy.js's
//       reservation helpers and scripts/engine/crew/follower-slot-service.js's
//       reserveFollowerSlot()/releaseFollowerSlotReservation() load and
//       execute for real through the Foundry-shim harness (ActorEngine is
//       the shim's documented fake, everything else is shipped code).
//   (b) PURE — the reservation-shape builders/predicates and
//       finalizeReservedFollowerSlot() are plain data functions, tested
//       directly with no Foundry surface at all.

registerFoundryPathLoader();

const {
  resolveFollowerSlotReservation,
  isFollowerSlotReservationExpired,
  isFollowerSlotReserved,
  buildFollowerSlotReservation,
  clearFollowerSlotReservation,
  finalizeReservedFollowerSlot,
  resolveTargetConversionReservation,
  isTargetConversionReservationExpired,
  isTargetConversionReserved,
  buildTargetConversionReservation,
  TARGET_CONVERSION_RESERVATION_FLAG_PATH,
  FOLLOWER_CONVERSION_RESERVATION_TTL_MS
} = await import('../scripts/domain/followers/follower-slot-occupancy.js');

const { FollowerSlotService } = await import('../scripts/engine/crew/follower-slot-service.js');
const { fakeActorEngineCallLog, resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');

const SYSTEM_ID = 'foundryvtt-swse';

function makeFakeOwner(overrides = {}) {
  const flags = { [SYSTEM_ID]: {}, ...(overrides.flags || {}) };
  return {
    id: overrides.id || 'owner-1',
    name: overrides.name || 'Test Owner',
    type: overrides.type || 'character',
    ...overrides,
    flags,
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
}

function asGM() {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1', name: 'GM Tester' }, actors: new Map(), users: [] } });
}

function asPlayer() {
  installFoundryShimGlobals({ game: { user: { isGM: false, id: 'player-1', name: 'Player' }, actors: new Map(), users: [] } });
}

// ---------------------------------------------------------------------
// Pure helpers — slot-side reservation (1-11)
// ---------------------------------------------------------------------

// 1. resolveFollowerSlotReservation: null when the slot has no reservation.
{
  assert.equal(resolveFollowerSlotReservation({ id: 's1', createdActorId: null }), null);
  assert.equal(resolveFollowerSlotReservation(null), null);
  assert.equal(resolveFollowerSlotReservation(undefined), null);
}

// 2. resolveFollowerSlotReservation: returns the reservation object when present.
{
  const reservation = { token: 't1', operation: 'x', slotId: 's1', createdAt: 1, expiresAt: 2 };
  assert.deepEqual(resolveFollowerSlotReservation({ id: 's1', reservation }), reservation);
}

// 3. isFollowerSlotReservationExpired: false when there is no reservation at all.
{
  assert.equal(isFollowerSlotReservationExpired({ id: 's1' }, 1000), false);
}

// 4. isFollowerSlotReservationExpired: false when still within TTL.
{
  const slot = { id: 's1', reservation: { token: 't1', expiresAt: 2000 } };
  assert.equal(isFollowerSlotReservationExpired(slot, 1000), false);
}

// 5. isFollowerSlotReservationExpired: true once past expiresAt.
{
  const slot = { id: 's1', reservation: { token: 't1', expiresAt: 500 } };
  assert.equal(isFollowerSlotReservationExpired(slot, 1000), true);
  // Also true at the exact boundary.
  assert.equal(isFollowerSlotReservationExpired({ id: 's1', reservation: { token: 't1', expiresAt: 1000 } }, 1000), true);
}

// 6. isFollowerSlotReserved: false when no reservation.
{
  assert.equal(isFollowerSlotReserved({ id: 's1' }, 1000), false);
}

// 7. isFollowerSlotReserved: true for a live (unexpired) reservation.
{
  const slot = { id: 's1', reservation: { token: 't1', expiresAt: 2000 } };
  assert.equal(isFollowerSlotReserved(slot, 1000), true);
}

// 8. isFollowerSlotReserved: false once the reservation has expired.
{
  const slot = { id: 's1', reservation: { token: 't1', expiresAt: 500 } };
  assert.equal(isFollowerSlotReserved(slot, 1000), false);
}

// 9. buildFollowerSlotReservation: correct shape and default TTL.
{
  const reservation = buildFollowerSlotReservation({
    token: 'tok-1', operation: 'existing-npc-follower-conversion', userId: 'gm-1',
    ownerActorId: 'owner-1', targetActorId: 'npc-1', slotId: 's1', now: 1000
  });
  assert.equal(reservation.token, 'tok-1');
  assert.equal(reservation.operation, 'existing-npc-follower-conversion');
  assert.equal(reservation.userId, 'gm-1');
  assert.equal(reservation.ownerActorId, 'owner-1');
  assert.equal(reservation.targetActorId, 'npc-1');
  assert.equal(reservation.slotId, 's1');
  assert.equal(reservation.createdAt, 1000);
  assert.equal(reservation.expiresAt, 1000 + FOLLOWER_CONVERSION_RESERVATION_TTL_MS);
}

// 10. clearFollowerSlotReservation: removes the reservation, preserves other fields.
{
  const slot = { id: 's1', createdActorId: null, templateChoices: ['utility'], reservation: { token: 't1', expiresAt: 2000 } };
  const cleared = clearFollowerSlotReservation(slot);
  assert.equal(cleared.reservation, undefined);
  assert.equal(cleared.templateChoices[0], 'utility');
  assert.equal(cleared.id, 's1');
  // Original input must not be mutated.
  assert.ok(slot.reservation, 'input slot must not be mutated');
}

// 11. clearFollowerSlotReservation: no-op (same object) for a slot with no reservation.
{
  const slot = { id: 's1', createdActorId: null };
  assert.equal(clearFollowerSlotReservation(slot), slot);
}

// ---------------------------------------------------------------------
// Pure helpers — finalizeReservedFollowerSlot (12-16)
// ---------------------------------------------------------------------

// 12. finalizeReservedFollowerSlot: matching token sets createdActorId and clears reservation.
{
  const slots = [{ id: 's1', createdActorId: null, templateChoices: ['utility'], reservation: { token: 'tok-1', expiresAt: 9999999999999 } }];
  const { slots: nextSlots, success } = finalizeReservedFollowerSlot(slots, { slotId: 's1', token: 'tok-1', followerActorId: 'npc-1' });
  assert.equal(success, true);
  assert.equal(nextSlots[0].createdActorId, 'npc-1');
  assert.equal(nextSlots[0].reservation, undefined);
  assert.equal(nextSlots[0].templateChoices[0], 'utility', 'unrelated slot metadata must survive finalization');
}

// 13. finalizeReservedFollowerSlot: mismatched token is rejected, slot left untouched.
{
  const slots = [{ id: 's1', createdActorId: null, reservation: { token: 'tok-1', expiresAt: 9999999999999 } }];
  const { slots: nextSlots, success } = finalizeReservedFollowerSlot(slots, { slotId: 's1', token: 'tok-2', followerActorId: 'npc-1' });
  assert.equal(success, false);
  assert.equal(nextSlots[0].createdActorId, null);
  assert.ok(nextSlots[0].reservation, 'a losing token must never clear the winning reservation');
}

// 14. finalizeReservedFollowerSlot: no reservation at all also rejects (nothing to finalize).
{
  const slots = [{ id: 's1', createdActorId: null }];
  const { success } = finalizeReservedFollowerSlot(slots, { slotId: 's1', token: 'tok-1', followerActorId: 'npc-1' });
  assert.equal(success, false);
}

// 15. finalizeReservedFollowerSlot: clears legacy occupant-alias fields on success.
{
  const slots = [{ id: 's1', actorId: 'stale-1', assignedActorId: 'stale-2', reservation: { token: 'tok-1', expiresAt: 9999999999999 } }];
  const { slots: nextSlots, success } = finalizeReservedFollowerSlot(slots, { slotId: 's1', token: 'tok-1', followerActorId: 'npc-1' });
  assert.equal(success, true);
  assert.equal(nextSlots[0].actorId, undefined);
  assert.equal(nextSlots[0].assignedActorId, undefined);
  assert.equal(nextSlots[0].createdActorId, 'npc-1');
}

// 16. finalizeReservedFollowerSlot: never mutates its input array/objects.
{
  const original = [{ id: 's1', createdActorId: null, reservation: { token: 'tok-1', expiresAt: 9999999999999 } }];
  const originalReservation = original[0].reservation;
  finalizeReservedFollowerSlot(original, { slotId: 's1', token: 'tok-1', followerActorId: 'npc-1' });
  assert.equal(original[0].createdActorId, null, 'input array must not be mutated');
  assert.equal(original[0].reservation, originalReservation);
}

// ---------------------------------------------------------------------
// Pure helpers — target-side reservation (17-20)
// ---------------------------------------------------------------------

// 17. resolveTargetConversionReservation: null/present.
{
  assert.equal(resolveTargetConversionReservation({ flags: {} }), null);
  const reservation = { token: 't1', ownerActorId: 'owner-1', slotId: 's1', userId: 'gm-1', createdAt: 1, expiresAt: 2 };
  assert.deepEqual(resolveTargetConversionReservation({ flags: { [SYSTEM_ID]: { followerConversionReservation: reservation } } }), reservation);
}

// 18. isTargetConversionReservationExpired / isTargetConversionReserved.
{
  const live = { flags: { [SYSTEM_ID]: { followerConversionReservation: { token: 't1', expiresAt: 2000 } } } };
  const expired = { flags: { [SYSTEM_ID]: { followerConversionReservation: { token: 't1', expiresAt: 500 } } } };
  assert.equal(isTargetConversionReservationExpired(live, 1000), false);
  assert.equal(isTargetConversionReservationExpired(expired, 1000), true);
  assert.equal(isTargetConversionReserved(live, 1000), true);
  assert.equal(isTargetConversionReserved(expired, 1000), false);
}

// 19. buildTargetConversionReservation: correct shape and default TTL.
{
  const reservation = buildTargetConversionReservation({ token: 'tok-1', ownerActorId: 'owner-1', slotId: 's1', userId: 'gm-1', now: 1000 });
  assert.equal(reservation.token, 'tok-1');
  assert.equal(reservation.ownerActorId, 'owner-1');
  assert.equal(reservation.slotId, 's1');
  assert.equal(reservation.userId, 'gm-1');
  assert.equal(reservation.createdAt, 1000);
  assert.equal(reservation.expiresAt, 1000 + FOLLOWER_CONVERSION_RESERVATION_TTL_MS);
}

// 20. TARGET_CONVERSION_RESERVATION_FLAG_PATH matches the documented flag path.
{
  assert.equal(TARGET_CONVERSION_RESERVATION_FLAG_PATH, `flags.${SYSTEM_ID}.followerConversionReservation`);
}

// ---------------------------------------------------------------------
// Production-path — FollowerSlotService.reserveFollowerSlot (21-30)
// ---------------------------------------------------------------------

// 21. reserveFollowerSlot: rejects a non-GM caller.
{
  resetFakeActorEngine();
  asPlayer();
  const owner = makeFakeOwner({ flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', createdActorId: null }] } } });
  const result = await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'tok-1' });
  assert.equal(result.success, false);
  assert.equal(result.code, 'FOLLOWER_SLOT_RESERVATION_FORBIDDEN');
}

// 22. reserveFollowerSlot: rejects a missing slot.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeOwner({ flags: { [SYSTEM_ID]: { followerSlots: [] } } });
  const result = await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'tok-1' });
  assert.equal(result.success, false);
  assert.equal(result.code, 'FOLLOWER_SLOT_NOT_FOUND');
}

// 23. reserveFollowerSlot: rejects an already-occupied slot.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeOwner({ flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', createdActorId: 'existing-follower' }] } } });
  const result = await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'tok-1' });
  assert.equal(result.success, false);
  assert.equal(result.code, 'FOLLOWER_SLOT_OCCUPIED');
}

// 24. reserveFollowerSlot: succeeds on an open, unreserved slot and writes the reservation.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeOwner({ flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', createdActorId: null }] } } });
  const result = await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'tok-1', targetActorId: 'npc-1' });
  assert.equal(result.success, true);
  const slot = owner.flags[SYSTEM_ID].followerSlots.find(s => s.id === 's1');
  assert.equal(slot.reservation.token, 'tok-1');
  assert.equal(slot.reservation.targetActorId, 'npc-1');
}

// 25. reserveFollowerSlot: a second request with a DIFFERENT token is rejected while the
// first reservation is live — this is the concurrency guarantee itself.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeOwner({ flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', createdActorId: null }] } } });
  const first = await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'tok-1' });
  assert.equal(first.success, true);
  const second = await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'tok-2' });
  assert.equal(second.success, false);
  assert.equal(second.code, 'FOLLOWER_SLOT_RESERVED');
  assert.equal(second.reservedByAnotherRequest, true);
}

// 26. reserveFollowerSlot: a same-token retry is idempotent (refreshes, does not reject itself).
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeOwner({ flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', createdActorId: null }] } } });
  const first = await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'tok-1' });
  assert.equal(first.success, true);
  const retry = await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'tok-1' });
  assert.equal(retry.success, true);
}

// 27. reserveFollowerSlot: an EXPIRED reservation held by another token no longer blocks a new request.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeOwner({
    flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', createdActorId: null, reservation: { token: 'stale-tok', expiresAt: Date.now() - 1000 } }] } }
  });
  const result = await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'tok-1' });
  assert.equal(result.success, true);
}

// 28. releaseFollowerSlotReservation: token-conditional — a mismatched token cannot clear it.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeOwner({ flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', createdActorId: null }] } } });
  await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'tok-1' });
  const releaseResult = await FollowerSlotService.releaseFollowerSlotReservation(owner, 's1', 'tok-2');
  assert.equal(releaseResult.success, false);
  assert.equal(releaseResult.code, 'FOLLOWER_SLOT_RESERVATION_TOKEN_MISMATCH');
  const slot = owner.flags[SYSTEM_ID].followerSlots.find(s => s.id === 's1');
  assert.ok(slot.reservation, 'a losing request must not clear the winning request\'s reservation');
}

// 29. releaseFollowerSlotReservation: the matching token clears it.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeOwner({ flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', createdActorId: null }] } } });
  await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'tok-1' });
  const releaseResult = await FollowerSlotService.releaseFollowerSlotReservation(owner, 's1', 'tok-1');
  assert.equal(releaseResult.success, true);
  const slot = owner.flags[SYSTEM_ID].followerSlots.find(s => s.id === 's1');
  assert.equal(slot.reservation, undefined);
}

// 30. releaseFollowerSlotReservation: releasing an already-clear reservation is a harmless no-op.
{
  resetFakeActorEngine();
  asGM();
  const owner = makeFakeOwner({ flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', createdActorId: null }] } } });
  const releaseResult = await FollowerSlotService.releaseFollowerSlotReservation(owner, 's1', 'tok-1');
  assert.equal(releaseResult.success, true);
  assert.equal(releaseResult.alreadyCleared, true);
}

console.log('Follower slot reservation (P2-3) tests passed.');
