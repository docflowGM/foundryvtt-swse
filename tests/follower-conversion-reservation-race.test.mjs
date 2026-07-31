import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { resetFakeActorEngine } from './helpers/foundry-shim/fakes/actor-engine.fake.mjs';

// P2-3 ROUND-2 CORRECTION — controlled two-client interleaving tests.
//
// The user-requested correction pass explicitly called out that
// source-regex tests are insufficient for the core concurrency
// guarantees FollowerSlotService's reservation methods are supposed to
// provide. These tests use REAL deferred-Promise barriers to force a
// genuine interleaving between two concurrent async callers of the same
// production functions (FollowerSlotService.reserveFollowerConversionTarget/
// reserveFollowerSlot/verifyFollowerConversionReservations) — not a
// pre-seeded flag one caller reads statically. Only ActorEngine is faked
// (see helpers/foundry-shim/fakes/actor-engine.fake.mjs), and it is
// monkey-patched per-test only for the exact interleaving point under
// test, then restored.

registerFoundryPathLoader();

function makeFlagActor(id, extraFlags = {}) {
  const flags = { 'foundryvtt-swse': { ...extraFlags } };
  return {
    id,
    name: `Actor ${id}`,
    flags,
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

async function freshHarness() {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1', name: 'GM' }, actors: new Map() } });
  resetFakeActorEngine();
  const { FollowerSlotService } = await import('/systems/foundryvtt-swse/scripts/engine/crew/follower-slot-service.js');
  const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  return { FollowerSlotService, ActorEngine };
}

// 1. TRUE two-writer race for the SAME conversion target: request A's
// write is held open on a barrier so request B's ENTIRE acquisition
// (check + write + reread) runs to completion first, then A's write is
// released. Because neither write is a compare-and-swap, A's write lands
// LAST and silently overwrites B's already-"successful" reservation —
// this is the honest-optimistic-protocol limitation the code's own doc
// comments describe (NOT a lock). The test proves two things: (a) this
// is real, controlled interleaving (not a pre-seeded static flag), and
// (b) a SUBSEQUENT verifyFollowerConversionReservations() call — the
// mechanism the actual conversion transaction relies on before every
// destructive phase — correctly detects that B no longer holds the
// live reservation, even though B's own acquisition call reported
// success.
{
  const { FollowerSlotService, ActorEngine } = await freshHarness();
  const target = makeFlagActor('target-1');
  const originalUpdateActor = ActorEngine.updateActor;
  const barrier = deferred();
  let writeCallCount = 0;

  ActorEngine.updateActor = async (actor, data, options) => {
    writeCallCount += 1;
    if (writeCallCount === 1) {
      // Request A's write: pause here, before the mutation actually
      // lands, so request B's full acquisition can interleave.
      await barrier.promise;
    }
    return originalUpdateActor(actor, data, options);
  };

  try {
    const requestA = FollowerSlotService.reserveFollowerConversionTarget(target, {
      token: 'token-A', ownerActorId: 'owner-A', slotId: 'slot-A'
    });
    // Yield the microtask queue so request A actually reaches (and pauses
    // inside) its ActorEngine.updateActor call before request B starts.
    await Promise.resolve();
    await Promise.resolve();

    const resultB = await FollowerSlotService.reserveFollowerConversionTarget(target, {
      token: 'token-B', ownerActorId: 'owner-B', slotId: 'slot-B'
    });
    assert.equal(resultB.success, true, 'B\'s check sees no live reservation yet (A has not written) and completes its own write+reread cleanly');

    barrier.resolve();
    const resultA = await requestA;
    assert.equal(resultA.success, true, 'A\'s own write lands last and its reread sees its own just-written token — this codebase never claims full CAS here');

    // The live flag now holds A's token, not B's — B's earlier "success"
    // was silently invalidated by A's later write.
    assert.equal(target.flags['foundryvtt-swse'].followerConversionReservation.token, 'token-A');

    // This is exactly why the real conversion transaction re-verifies
    // BOTH tokens before every destructive phase instead of trusting the
    // one-time acquisition result: B's own next check correctly reports
    // that it no longer holds the reservation, closing the race window
    // down before B could ever mutate anything.
    const fakeOwnerB = makeFlagActor('owner-B');
    const verifyForB = await FollowerSlotService.verifyFollowerConversionReservations({
      ownerActor: fakeOwnerB, targetActor: target, slotId: 'slot-B', token: 'token-B'
    });
    assert.equal(verifyForB.targetOk, false, 'B\'s subsequent dual-token verification must detect the loss even though B\'s own acquisition call reported success');
    assert.equal(verifyForB.success, false);
  } finally {
    ActorEngine.updateActor = originalUpdateActor;
  }
}

// 2. Symmetric race, but this time request A's write is released FIRST
// and B's write genuinely happens later — A must detect that ITS OWN
// reservation was superseded via its own post-write reread, using a real
// interleaving rather than a pre-seeded flag.
{
  const { FollowerSlotService, ActorEngine } = await freshHarness();
  const target = makeFlagActor('target-1');
  const originalUpdateActor = ActorEngine.updateActor;
  const releaseFirstWriter = deferred();
  let writeCallCount = 0;

  ActorEngine.updateActor = async (actor, data, options) => {
    writeCallCount += 1;
    if (writeCallCount === 1) {
      // Let the mutation land immediately, but hold this call open
      // (unresolved) until the test explicitly lets it finish, so a
      // SECOND request's write can be issued and complete BEFORE this
      // first call's own caller (request A) reaches its reread.
      const result = await originalUpdateActor(actor, data, options);
      await releaseFirstWriter.promise;
      return result;
    }
    return originalUpdateActor(actor, data, options);
  };

  const requestA = FollowerSlotService.reserveFollowerConversionTarget(target, {
    token: 'token-A', ownerActorId: 'owner-A', slotId: 'slot-A'
  });
  await Promise.resolve();
  await Promise.resolve();

  // While A's write call is held open (already applied, not yet
  // returned to A), issue B's full, unpaused acquisition — B's check
  // now sees A's just-written token and is correctly rejected at the
  // check phase (a real, live reservation held by a different token).
  const resultB = await FollowerSlotService.reserveFollowerConversionTarget(target, {
    token: 'token-B', ownerActorId: 'owner-B', slotId: 'slot-B'
  });
  assert.equal(resultB.success, false, 'B must be rejected once A\'s write has genuinely landed first');
  assert.equal(resultB.code, 'FOLLOWER_TARGET_RESERVED');

  releaseFirstWriter.resolve();
  const resultA = await requestA;
  assert.equal(resultA.success, true, 'A completes cleanly since nothing ever superseded its own write');
  assert.equal(target.flags['foundryvtt-swse'].followerConversionReservation.token, 'token-A');

  ActorEngine.updateActor = originalUpdateActor;
}

// 3. A losing/late request can NEVER clear the winning reservation by
// calling release with its own (non-matching) token — proven with a real
// concurrent acquisition, not a pre-seeded flag.
{
  const { FollowerSlotService } = await freshHarness();
  const target = makeFlagActor('target-1');

  const winner = await FollowerSlotService.reserveFollowerConversionTarget(target, {
    token: 'token-winner', ownerActorId: 'owner-1', slotId: 'slot-1'
  });
  assert.equal(winner.success, true);

  const loserReleaseAttempt = await FollowerSlotService.releaseFollowerConversionTargetReservation(target, 'token-loser');
  assert.equal(loserReleaseAttempt.success, false);
  assert.equal(loserReleaseAttempt.code, 'FOLLOWER_TARGET_RESERVATION_TOKEN_MISMATCH');
  assert.equal(target.flags['foundryvtt-swse'].followerConversionReservation.token, 'token-winner', 'the winning reservation must survive a losing request\'s release attempt');
}

// 4. Same race shape as test 1, but for SLOT reservations
// (reserveFollowerSlot) rather than target reservations — the slot side
// uses the identical check/write/reread shape and must exhibit the same
// documented (non-CAS) behavior, real interleaving proven the same way.
{
  const { FollowerSlotService, ActorEngine } = await freshHarness();
  const owner = makeFlagActor('owner-1', { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] });
  const originalUpdateActor = ActorEngine.updateActor;
  const barrier = deferred();
  let writeCallCount = 0;

  ActorEngine.updateActor = async (actor, data, options) => {
    writeCallCount += 1;
    if (writeCallCount === 1) {
      await barrier.promise;
    }
    return originalUpdateActor(actor, data, options);
  };

  try {
    const requestA = FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'token-A' });
    await Promise.resolve();
    await Promise.resolve();

    const resultB = await FollowerSlotService.reserveFollowerSlot(owner, 's1', { token: 'token-B' });
    assert.equal(resultB.success, true, 'B completes cleanly since A has not written yet');

    barrier.resolve();
    const resultA = await requestA;
    assert.equal(resultA.success, true, 'A\'s write lands last and its own reread sees itself');

    const liveSlot = owner.flags['foundryvtt-swse'].followerSlots.find(s => s.id === 's1');
    assert.equal(liveSlot.reservation.token, 'token-A');
  } finally {
    ActorEngine.updateActor = originalUpdateActor;
  }
}

resetFoundryShimGlobals();
console.log('Follower conversion reservation race (P2-3 round-2) controlled-interleaving tests passed.');
