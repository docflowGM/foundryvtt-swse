import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// P1-8 — Ownership/assignment rollback exactness (correction pass,
// "fix(governance): make snapshot and ownership rollback exact").
//
// Two related defects in scripts/engine/crew/ally-assignment-service.js:
//   1. buildOwnershipGrantStep's rollback restored "no prior entry" by
//      writing an explicit NONE/0 ownership value for that user, which is
//      NOT equivalent to the user never having had a per-user ownership
//      override — an explicit NONE entry shadows `ownership.default` and
//      can be MORE restrictive than the user's actual prior access. The
//      fix deletes the key (Foundry's `-=key` convention) instead.
//   2. assignAsAlly's owner-projection rollback recomputed "current minus
//      target" from the live ownerActor object at rollback time instead of
//      restoring the exact pre-commit array snapshot (the pattern already
//      used by unassignAlly and convertToFollower in the same file).
//
// Coverage tier: (a) direct production-path — AllyAssignmentService loads
// and executes for real through the Foundry-shim harness (already proven
// by tests/gm-existing-npc-allies-assignment.test.mjs). Rollback is
// exercised by forcing a later transaction step to fail via a local,
// test-file-scoped monkey-patch of the fake ActorEngine's updateActor
// method (restored after each use) — no shared test infrastructure is
// modified.

registerFoundryPathLoader();

const {
  AllyAssignmentService,
  buildOwnershipGrantStep
} = await import('../scripts/engine/crew/ally-assignment-service.js');

const { fakeActorEngineCallLog, resetFakeActorEngine, ActorEngine: FakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');

const SYSTEM_ID = 'foundryvtt-swse';

function makeFakeActor(overrides = {}) {
  const flags = { [SYSTEM_ID]: {}, swse: {}, ...(overrides.flags || {}) };
  const actor = {
    id: 'actor-1', name: 'Test Actor', type: 'npc', uuid: 'Actor.actor-1', isOwner: false,
    system: {}, img: 'icons/x.png', items: [], effects: [], ownership: {},
    ...overrides,
    flags,
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    toObject() {
      return JSON.parse(JSON.stringify({
        system: actor.system, name: actor.name, img: actor.img,
        prototypeToken: actor.prototypeToken, items: actor.items,
        effects: actor.effects, flags: actor.flags
      }));
    }
  };
  return actor;
}

function asGM(users = []) {
  installFoundryShimGlobals({
    game: { user: { isGM: true, id: 'gm-1' }, actors: new Map(), users },
    CONST: { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 } }
  });
}

// ---------------------------------------------------------------------
// Ownership rollback: exact key deletion vs NONE overwrite
// ---------------------------------------------------------------------

// buildOwnershipGrantStep's own rollback can never fire through either
// convertToFollower() or assignAsAlly()'s public transaction, because in
// both call sites it is unconditionally the LAST step pushed — there is no
// later step whose failure could trigger ITS rollback (only a step's own
// prior, already-completed siblings roll back on a later failure). It is
// therefore exercised directly here (still the real, shipped commit/
// rollback functions — not a reimplementation) rather than through a
// forced-failure transaction run, which cannot reach it.

// 1. A target with NO prior ownership entry for the granted user: after
// commit-then-rollback, the rollback write must be a `-=userId` deletion
// key (never an explicit NONE/0 value for that key).
{
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const target = makeFakeActor({ id: 'target-1', type: 'npc', ownership: {} });
  asGM([{ id: 'user-1', character: { id: 'owner-1' } }]);

  const step = buildOwnershipGrantStep(owner, target, 'test-source');
  const commitResult = await step.commit();
  assert.equal(target.ownership['user-1'], 3, 'commit must have granted OWNER (3)');

  await step.rollback(commitResult);

  const rollbackCall = fakeActorEngineCallLog[fakeActorEngineCallLog.length - 1];
  assert.equal(rollbackCall.method, 'updateActor');
  assert.ok(
    Object.keys(rollbackCall.data).some(k => k === 'ownership.-=user-1'),
    'ownership rollback must use a -=userId deletion key when there was no prior entry'
  );
  assert.equal(rollbackCall.data['ownership.-=user-1'], null);
  assert.equal(rollbackCall.data.ownership, undefined, 'rollback must not write an explicit ownership.{userId} value for a user with no prior entry');
  assert.equal(target.ownership['user-1'], undefined, 'the key must be gone entirely after rollback, not present with NONE/0');
}

// 2. A target WITH a prior (non-NONE) ownership entry for the granted
// user: after commit-then-rollback, the exact prior value is restored
// (not deleted, not overwritten with NONE).
{
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-2', type: 'character' });
  const target = makeFakeActor({ id: 'target-2', type: 'npc', ownership: { 'user-1': 2 } });
  asGM([{ id: 'user-1', character: { id: 'owner-2' } }]);

  const step = buildOwnershipGrantStep(owner, target, 'test-source');
  const commitResult = await step.commit();
  assert.equal(target.ownership['user-1'], 3);

  await step.rollback(commitResult);

  assert.equal(target.ownership['user-1'], 2, 'the exact prior ownership level must be restored, not NONE');
  const rollbackCall = fakeActorEngineCallLog[fakeActorEngineCallLog.length - 1];
  assert.equal(rollbackCall.data.ownership?.['user-1'], 2);
}

// ---------------------------------------------------------------------
// assignAsAlly owner-array rollback: exact captured snapshot, not
// recomputed-from-live-state
// ---------------------------------------------------------------------

// 3. An owner with a PRE-EXISTING, unrelated ownedActors entry: if the
// owner's live ownedActors array is tampered with (simulating an
// out-of-band change) by the failing step BEFORE it throws, rollback must
// still restore the ORIGINAL pre-commit snapshot — proving the rollback
// uses a captured array, not a "current state minus target" recompute
// against whatever ownerActor.system.ownedActors holds at rollback time.
{
  resetFakeActorEngine();
  const preExisting = { id: 'unrelated-actor', name: 'Unrelated' };
  const owner = makeFakeActor({ id: 'owner-3', type: 'character', system: { ownedActors: [preExisting] } });
  const target = makeFakeActor({ id: 'target-3', type: 'npc' });
  asGM([]);

  const original = FakeActorEngine.updateActor;
  FakeActorEngine.updateActor = async (actor, data, options) => {
    if (actor?.id === 'target-3') {
      // Simulate a concurrent, out-of-band mutation of the owner's live
      // object happening between the owner-projection commit and the
      // (about to fail) target-metadata commit.
      owner.system.ownedActors = [];
      throw new Error('forced failure for rollback test');
    }
    return original.call(FakeActorEngine, actor, data, options);
  };

  try {
    await assert.rejects(() => AllyAssignmentService.assignAsAlly(owner, target, {}));
  } finally {
    FakeActorEngine.updateActor = original;
  }

  assert.deepEqual(
    owner.system.ownedActors,
    [preExisting],
    'rollback must restore the exact pre-commit ownedActors snapshot, not recompute from the (tampered) live state'
  );
}

console.log('Ally assignment rollback exactness tests passed.');
