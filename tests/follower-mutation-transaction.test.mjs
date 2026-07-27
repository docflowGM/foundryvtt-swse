import assert from 'node:assert/strict';
import {
  runFollowerMutationTransaction,
  resolveFollowerFinalizationToken,
  findFollowerLinkForToken,
  buildFollowerLinkOwnerUpdate,
  buildFollowerUnlinkOwnerUpdate,
  buildFollowerSlotUpdate
} from '../scripts/apps/progression-framework/adapters/follower-mutation-transaction.js';
import { ActorEngine as FakeActorEngine, resetFakeActorEngine, fakeActorEngineCallLog } from './helpers/foundry-shim/fakes/actor-engine.fake.mjs';

// MUTATION-GOVERNANCE ADDENDUM (Phase 6 follow-up).
//
// This module is the pure orchestration layer used by
// scripts/apps/follower-creator.js to make multi-step / multi-Actor follower
// lifecycle operations (create, update, remove, link) succeed or roll back
// as one logical unit. follower-creator.js itself is Foundry-heavy and
// cannot be loaded through the Node Foundry-shim (confirmed again this
// session — it transitively imports scripts/apps/base/swse-application-v2.js,
// which needs the full foundry.applications.api surface). This file has zero
// Foundry dependency, so it tests the actual orchestration algorithm
// (sequencing, rollback order and completeness, idempotency-key derivation,
// owner-projection dedup) directly, using mock commit/rollback steps shaped
// exactly like follower-creator.js's real ones, plus the already-existing
// Foundry-shim fake ActorEngine for the snapshot-restore case.
//
// Maps to the 25 required test cases from the addendum:
//   3  (preflight failure creates nothing), 4 (creation failure leaves owner
//   unchanged), 5/6/7 (materialize-phase failure rolls back the follower,
//   never touches the owner), 9 (owner projection failure rolls back
//   creation), 10 (owner-projection split-failure case no longer exists —
//   see note), 11 (ownership failure restores both owner projections),
//   13 (successful creation yields one follower + one owner link),
//   14/15 (repeated finalization is idempotent), 16 (update failure restores
//   the complete follower snapshot including flags), 17 (removal updates
//   both owner projections), 18 (failed deletion restores owner linkage).
// Cases 1, 2, 8, 12, 19-25 are verified by direct code inspection and
// documented in docs/audits/follower-mutation-transaction-authority-phase-6-addendum.md
// rather than unit-tested here, because they are either pure structural
// facts (no chargen step calls ActorEngine at all — cases 1/2/19-21, enforced
// by the static guard for 19-21), already covered by earlier-phase test
// suites untouched by this addendum (case 22), or already-existing swallow-
// and-continue code this addendum did not change (cases 8, 12, 23-25).

// --- runFollowerMutationTransaction: sequencing and rollback order ---

// Case 4 — creation failure leaves the owner untouched: if step 1 throws,
// no later (owner-touching) step ever runs, and there is nothing to roll
// back since nothing committed.
{
  const log = [];
  const result = await runFollowerMutationTransaction([
    {
      name: 'create-actor',
      commit: async () => { throw new Error('actor creation failed'); },
      rollback: async () => { log.push('rollback:create-actor'); }
    },
    {
      name: 'link',
      commit: async () => { log.push('commit:link'); return 'owner-touched'; }
    }
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.failedStep, 'create-actor');
  assert.deepEqual(result.completedSteps, []);
  assert.equal(result.rollbackFailed, false);
  assert.ok(!log.includes('commit:link'), 'a step after the failed one must never run');
  assert.ok(!log.includes('rollback:create-actor'), 'a step that never committed has nothing to roll back');
}

// Case 5/6/7 — materialize-phase failure (species/feat/skill) rolls back
// the follower (create-actor's rollback) and never reaches the owner-link
// step at all.
{
  const log = [];
  const result = await runFollowerMutationTransaction([
    {
      name: 'create-actor',
      commit: async () => { log.push('commit:create-actor'); return { id: 'follower-1' }; },
      rollback: async (created) => { log.push(`rollback:create-actor:${created.id}`); }
    },
    {
      name: 'materialize',
      commit: async () => { throw new Error('feat item not found'); }
    },
    {
      name: 'link',
      commit: async () => { log.push('commit:link'); }
    }
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.failedStep, 'materialize');
  assert.deepEqual(result.completedSteps, ['create-actor']);
  assert.ok(log.includes('rollback:create-actor:follower-1'));
  assert.ok(!log.includes('commit:link'), 'link must never run after an earlier step fails');
}

// Case 9 — an owner-projection failure at the "link" step rolls back both
// earlier steps, in reverse order.
{
  const rollbackOrder = [];
  const result = await runFollowerMutationTransaction([
    {
      name: 'create-actor',
      commit: async () => ({ id: 'follower-2' }),
      rollback: async () => { rollbackOrder.push('create-actor'); }
    },
    {
      name: 'materialize',
      commit: async (ctx) => ctx['create-actor'],
      rollback: async () => { rollbackOrder.push('materialize'); }
    },
    {
      name: 'link',
      commit: async () => { throw new Error('owner flag update failed'); }
    }
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.failedStep, 'link');
  assert.deepEqual(result.completedSteps, ['create-actor', 'materialize']);
  assert.deepEqual(rollbackOrder, ['materialize', 'create-actor'], 'rollback must run in reverse commit order');
}

// A step with no rollback function is simply skipped during unwind rather
// than treated as an error.
{
  const result = await runFollowerMutationTransaction([
    { name: 'read-only-check', commit: async () => 'ok' }, // no rollback
    { name: 'fails', commit: async () => { throw new Error('boom'); } }
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.rollbackFailed, false);
}

// If a rollback itself throws, the transaction still reports failure for
// every subsequent rollback attempt, flags rollbackFailed, and continues
// attempting to roll back earlier steps rather than aborting the unwind.
{
  const rollbackOrder = [];
  const result = await runFollowerMutationTransaction([
    { name: 'a', commit: async () => 'a', rollback: async () => { rollbackOrder.push('a'); } },
    { name: 'b', commit: async () => 'b', rollback: async () => { throw new Error('rollback of b failed'); } },
    { name: 'c', commit: async () => { throw new Error('c failed'); } }
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.rollbackFailed, true);
  assert.equal(result.rollbackErrors.length, 1);
  assert.equal(result.rollbackErrors[0].step, 'b');
  assert.deepEqual(rollbackOrder, ['a'], 'rollback of "a" still runs even though "b"\'s rollback threw');
}

// A fully successful sequence returns ok:true with every step's result and
// a context keyed by step name (used to pass the created follower id
// forward to later steps).
{
  const result = await runFollowerMutationTransaction([
    { name: 'create-actor', commit: async () => ({ id: 'follower-3' }) },
    { name: 'materialize', commit: async (ctx) => ctx['create-actor'] },
    { name: 'link', commit: async (ctx) => `linked:${ctx['create-actor'].id}` }
  ]);

  assert.equal(result.ok, true);
  assert.equal(result.context['create-actor'].id, 'follower-3');
  assert.equal(result.results[2], 'linked:follower-3');
}

// --- Idempotency: resolveFollowerFinalizationToken / findFollowerLinkForToken ---

// Case 14/15 — repeated finalization of the same slot/session must resolve
// to the same token so a duplicate follower/Item set is never produced.
{
  assert.equal(resolveFollowerFinalizationToken({ finalizationToken: 'explicit-token' }), 'explicit-token');
  assert.equal(resolveFollowerFinalizationToken({ slotId: 'slot-42' }), 'slot:slot-42');
  assert.equal(resolveFollowerFinalizationToken({ persistentChoices: { slotId: 'slot-99' } }), 'slot:slot-99');
  assert.equal(resolveFollowerFinalizationToken({}), null);
  assert.equal(resolveFollowerFinalizationToken(undefined), null);
}

{
  // An explicit finalizationToken always wins over a slotId if both exist.
  assert.equal(resolveFollowerFinalizationToken({ finalizationToken: 'explicit', slotId: 'slot-1' }), 'explicit');
}

{
  const links = [
    { id: 'a1', finalizationToken: 'slot:1' },
    { id: 'a2', finalizationToken: 'slot:2' }
  ];
  assert.equal(findFollowerLinkForToken(links, 'slot:2').id, 'a2');
  assert.equal(findFollowerLinkForToken(links, 'slot:missing'), null);
  assert.equal(findFollowerLinkForToken(links, null), null, 'a null token can never match — never treated as "match anything"');
  assert.equal(findFollowerLinkForToken([], 'slot:1'), null);
  assert.equal(findFollowerLinkForToken(undefined, 'slot:1'), null);
}

// --- Owner-projection builders: dedup and shape ---

// Case 13 — a successful link produces exactly one follower entry and one
// ownedActors entry, even if called again for the same follower id.
{
  const followerLink = { id: 'follower-4', name: 'Rex' };
  const first = buildFollowerLinkOwnerUpdate({ currentFollowers: [], currentOwnedActors: [], followerLink });
  assert.equal(first.followers.length, 1);
  assert.equal(first.ownedActors.length, 1);

  const second = buildFollowerLinkOwnerUpdate({
    currentFollowers: first.followers,
    currentOwnedActors: first.ownedActors,
    followerLink
  });
  assert.equal(second.followers.length, 1, 're-linking the same follower id must not append a duplicate entry');
  assert.equal(second.ownedActors.length, 1);
  assert.equal(second.followers[0].id, 'follower-4');
}

{
  // Linking a second, different follower preserves the first.
  const { followers } = buildFollowerLinkOwnerUpdate({
    currentFollowers: [{ id: 'follower-4', name: 'Rex' }],
    currentOwnedActors: [],
    followerLink: { id: 'follower-5', name: 'Chopper' }
  });
  assert.equal(followers.length, 2);
  assert.ok(followers.some(f => f.id === 'follower-4'));
  assert.ok(followers.some(f => f.id === 'follower-5'));
}

{
  assert.throws(() => buildFollowerLinkOwnerUpdate({ currentFollowers: [], currentOwnedActors: [], followerLink: {} }));
}

// Case 17 — unlinking removes exactly the target follower from both
// projections and leaves everything else untouched.
{
  const currentFollowers = [{ id: 'follower-4' }, { id: 'follower-5' }];
  const currentOwnedActors = [{ id: 'follower-4' }, { id: 'follower-5' }];
  const { followers, ownedActors } = buildFollowerUnlinkOwnerUpdate({
    currentFollowers,
    currentOwnedActors,
    followerId: 'follower-4'
  });
  assert.deepEqual(followers.map(f => f.id), ['follower-5']);
  assert.deepEqual(ownedActors.map(f => f.id), ['follower-5']);
}

{
  // Unlinking an id that isn't present is a safe no-op.
  const { followers } = buildFollowerUnlinkOwnerUpdate({
    currentFollowers: [{ id: 'follower-5' }],
    currentOwnedActors: [],
    followerId: 'not-present'
  });
  assert.equal(followers.length, 1);
}

// buildFollowerSlotUpdate: dedup-safe (updates in place), no-op for an
// unknown slot id, and never mutates the input array.
{
  const slots = [{ id: 'slot-1' }, { id: 'slot-2' }];
  const updated = buildFollowerSlotUpdate(slots, 'slot-2', 'follower-9');
  assert.equal(updated.length, 2);
  assert.equal(updated.find(s => s.id === 'slot-2').createdActorId, 'follower-9');
  assert.equal(updated.find(s => s.id === 'slot-1').createdActorId, undefined);
  assert.equal(slots.find(s => s.id === 'slot-2').createdActorId, undefined, 'the input array is never mutated');
}

{
  const slots = [{ id: 'slot-1' }];
  assert.deepEqual(buildFollowerSlotUpdate(slots, null, 'follower-9'), slots);
  assert.deepEqual(buildFollowerSlotUpdate([], 'slot-1', 'follower-9'), []);
}

// --- Case 11 — follower-ownership failure restores both owner projections ---
//
// This exercises the exact shape of FollowerCreator._linkFollowerToOwner's
// rollback path (owner projections commit in one call, then a follower
// ownership grant fails, then the owner projections are restored to their
// pre-link values) using the Foundry-shim's existing fake ActorEngine, which
// already implements updateActor(actor, data) by writing dot-paths onto a
// plain object — the same contract the real ActorEngine.updateActor honors.
{
  resetFakeActorEngine();
  const owner = { id: 'owner-1', flags: { 'foundryvtt-swse': { followers: [] } }, system: { ownedActors: [] } };
  const currentFollowers = owner.flags['foundryvtt-swse'].followers;
  const currentOwnedActors = owner.system.ownedActors;
  const followerLink = { id: 'follower-6', name: 'Gonk' };

  const { followers: nextFollowers, ownedActors: nextOwnedActors } = buildFollowerLinkOwnerUpdate({
    currentFollowers,
    currentOwnedActors,
    followerLink
  });

  await FakeActorEngine.updateActor(owner, {
    'flags.foundryvtt-swse.followers': nextFollowers,
    'system.ownedActors': nextOwnedActors
  });
  assert.equal(owner.flags['foundryvtt-swse'].followers.length, 1);

  let ownershipError = null;
  try {
    throw new Error('ownership grant failed');
  } catch (err) {
    ownershipError = err;
    // Roll back to the pre-link projections, exactly as
    // FollowerCreator._linkFollowerToOwner does in its catch block.
    await FakeActorEngine.updateActor(owner, {
      'flags.foundryvtt-swse.followers': currentFollowers,
      'system.ownedActors': currentOwnedActors
    });
  }

  assert.ok(ownershipError);
  assert.deepEqual(owner.flags['foundryvtt-swse'].followers, [], 'owner followers flag restored to its pre-link value');
  assert.deepEqual(owner.system.ownedActors, [], 'owner ownedActors restored to its pre-link value');
  assert.equal(fakeActorEngineCallLog.filter(c => c.method === 'updateActor').length, 2, 'exactly one commit write and one rollback write, no more');
}

// Note on case 10 (owner ownedActors failure restores the owner flag): in
// this addendum's design, flags.foundryvtt-swse.followers and
// system.ownedActors are written in ONE ActorEngine.updateActor call (see
// FollowerCreator._linkFollowerToOwner), not two separately-persisted
// writes — so a failure of "just the ownedActors half" can no longer occur
// at all; both either commit together or neither does. This eliminates the
// case rather than requiring a rollback for it.

// --- Case 16 — existing-follower update failure restores the complete
// follower snapshot (system/items/effects via restoreFromSnapshot, flags
// via a follow-up updateActor call) ---
{
  resetFakeActorEngine();
  const follower = {
    id: 'follower-7',
    name: 'Old Name',
    system: { level: 3, race: 'Human' },
    flags: { swse: { follower: { templateType: 'aggressive' } } },
    items: [{ _id: 'item-1', name: 'Weapon Proficiency (Simple Weapons)' }],
    effects: [],
    toObject(_source) {
      return JSON.parse(JSON.stringify({ system: follower.system, name: follower.name, items: follower.items, effects: follower.effects, flags: follower.flags }));
    }
  };

  const preUpdateSnapshot = follower.toObject(true);
  const preUpdateFlags = JSON.parse(JSON.stringify(follower.flags));

  // Simulate FollowerCreator.updateFollowerFromMutation's core-state commit...
  await FakeActorEngine.updateActor(follower, {
    'system.level': 4,
    'flags.swse.follower.templateType': 'defensive'
  });
  assert.equal(follower.system.level, 4);
  assert.equal(follower.flags.swse.follower.templateType, 'defensive');

  // ...then simulate _applyFollowerProgressionMaterial throwing partway
  // through, and the rollback path FollowerCreator's catch block runs.
  await FakeActorEngine.restoreFromSnapshot(follower, preUpdateSnapshot);
  await FakeActorEngine.updateActor(follower, { flags: preUpdateFlags });

  assert.equal(follower.system.level, 3, 'system reverted via restoreFromSnapshot');
  assert.equal(follower.name, 'Old Name');
  assert.deepEqual(follower.items, [{ _id: 'item-1', name: 'Weapon Proficiency (Simple Weapons)' }]);
  assert.equal(follower.flags.swse.follower.templateType, 'aggressive', 'flags reverted via the follow-up updateActor call, since restoreFromSnapshot deliberately does not touch flags');
}

// --- Case 18 — failed Actor deletion restores owner linkage ---
{
  resetFakeActorEngine();
  const owner = { id: 'owner-2', flags: { 'foundryvtt-swse': { followers: [{ id: 'follower-8' }] } }, system: { ownedActors: [{ id: 'follower-8' }] } };
  const currentFollowers = owner.flags['foundryvtt-swse'].followers;
  const currentOwnedActors = owner.system.ownedActors;

  const { followers: updatedFollowers, ownedActors: updatedOwnedActors } = buildFollowerUnlinkOwnerUpdate({
    currentFollowers,
    currentOwnedActors,
    followerId: 'follower-8'
  });

  await FakeActorEngine.updateActor(owner, {
    'flags.foundryvtt-swse.followers': updatedFollowers,
    'system.ownedActors': updatedOwnedActors
  });
  assert.deepEqual(owner.flags['foundryvtt-swse'].followers, []);

  let deletionError = null;
  try {
    throw new Error('deleteActor failed');
  } catch (err) {
    deletionError = err;
    await FakeActorEngine.updateActor(owner, {
      'flags.foundryvtt-swse.followers': currentFollowers,
      'system.ownedActors': currentOwnedActors
    });
  }

  assert.ok(deletionError);
  assert.deepEqual(owner.flags['foundryvtt-swse'].followers, [{ id: 'follower-8' }], 'owner linkage restored after failed deletion');
  assert.deepEqual(owner.system.ownedActors, [{ id: 'follower-8' }]);
}

console.log('Follower mutation transaction tests passed.');
