import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// SSOT Priority 3 (tests BEFORE any settlement change): failure-injection and idempotency for the progression finalization lifecycle
// (progression-actor-persistence.js). Pins WHAT IS KNOWN decides cleanup: a world actor this attempt created is discarded only when the outcome is a
// definite non-commit; a committed, indeterminate, partial, unverified-rollback or unknown (threw) outcome KEEPS it. Offline seams only: this verifies
// the decision matrix, not Foundry's persistence guarantees (FOUNDRY_ACCEPTANCE_PENDING; ordered writes + compensating recovery are not atomic).
for (const l of ['log', 'info', 'debug', 'warn', 'error']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
const { runFinalizationWithDraftLifecycle, canDiscardMaterializedActor, isTransientProgressionActor, discardMaterializedProgressionActor } =
  await import('../scripts/apps/progression-framework/shell/progression-actor-persistence.js');

const transient = () => ({ name: 'Draft', type: 'character', collection: null, toObject() { return { name: 'Draft', type: 'character' }; } });
let seq = 0;
const world = () => {
  const log = { created: [], deleted: [] };
  const seams = {
    createActor: async (data) => { const a = { id: `world-${++seq}`, ...data, delete: async () => {} }; log.created.push(a.id); return a; },
    deleteActor: async (doc) => { log.deleted.push(doc.id); },
  };
  return { log, seams };
};
const run = async (over = {}) => {
  const { log, seams } = world();
  const changed = [];
  const out = await runFinalizationWithDraftLifecycle({ actor: transient(), flush: async () => true, dispatch: async () => ({ success: true }), onActorChanged: (a) => changed.push(a), seams, ...over });
  return { out, log, changed };
};

// canDiscard decision matrix
for (const [result, expected, why] of [
  [null, false, 'unknown outcome'], [{ success: true }, false, 'success'], [{ success: false, committed: true }, false, 'committed despite success:false'],
  [{ success: false, indeterminate: true }, false, 'indeterminate'], [{ success: false, partialMutationPossible: true }, false, 'partial'],
  [{ success: false, rollbackOutcome: 'FAILED_UNVERIFIED' }, false, 'rollback attempted but not verified'], [{ success: false, rollbackOutcome: 'FAILED_COMPENSATED' }, true, 'verified compensated rollback'],
  [{ success: false }, true, 'definite non-commit'],
]) assert.equal(canDiscardMaterializedActor(result), expected, why);

// 1. materialization fails: nothing was created, nothing is discarded, the caller keeps the transient draft
{ const { out, log } = await run({ seams: { createActor: async () => { throw new Error('create failed'); }, deleteActor: async () => { throw new Error('must not delete'); } } });
  assert.equal(out.phase, 'materialize-failed'); assert.equal(out.created, false); assert.equal(out.discarded, false); assert.ok(isTransientProgressionActor(out.actor)); void log; }
// 2. flush fails / throws: finalizer never dispatched => the actor THIS attempt created is discarded and the caller is re-pointed at the draft
for (const flush of [async () => false, async () => { throw new Error('flush boom'); }]) {
  const { out, log, changed } = await run({ flush, dispatch: async () => { throw new Error('dispatch must not run'); } });
  assert.equal(out.phase, 'flush-failed'); assert.equal(log.created.length, 1); assert.deepEqual(log.deleted, log.created); assert.equal(out.discarded, true);
  assert.ok(isTransientProgressionActor(changed.at(-1)), 'the shell is re-pointed at the transient draft');
}
// 3. dispatched outcomes
for (const [result, kept] of [[{ success: true }, true], [{ success: false, committed: true }, true], [{ success: false, indeterminate: true, partialMutationPossible: true }, true],
  [{ success: false, rollbackOutcome: 'FAILED_UNVERIFIED' }, true], [{ success: false, error: 'plan rejected' }, false], [{ success: false, rollbackOutcome: 'FAILED_COMPENSATED' }, false]]) {
  const { out, log } = await run({ dispatch: async () => result });
  assert.equal(out.phase, 'dispatched'); assert.equal(log.created.length, 1);
  assert.equal(log.deleted.length, kept ? 0 : 1, JSON.stringify(result));
}
// 4. the finalizer THREW: the plan may have applied => the actor is kept (never deleted on an unknown outcome)
{ const { out, log } = await run({ dispatch: async () => { throw new Error('boom'); } });
  assert.equal(out.phase, 'dispatch-threw'); assert.equal(log.deleted.length, 0); assert.equal(out.error.message, 'boom'); }
// 5. cleanup failure is reported, never thrown, never claimed as discarded
{ const { out } = await run({ dispatch: async () => ({ success: false }), seams: { createActor: async (d) => ({ id: 'w', ...d }), deleteActor: async () => { throw new Error('delete refused'); } } });
  assert.equal(out.discarded, false); assert.equal(out.phase, 'dispatched'); }
assert.equal(await discardMaterializedProgressionActor({}), false);
// 6. IDEMPOTENCY: an already-persisted actor is never created or deleted again, whatever the outcome
{ const { log, seams } = world(); const persisted = { id: 'existing', name: 'P', type: 'character', collection: {}, parent: null };
  const out = await runFinalizationWithDraftLifecycle({ actor: persisted, flush: async () => true, dispatch: async () => ({ success: false }), seams });
  assert.equal(out.created, false); assert.equal(log.created.length, 0); assert.equal(log.deleted.length, 0, 'an actor this attempt did not create is never discarded'); }
// 7. RETRY after a definite failure creates exactly one new world actor and leaves no orphan from the first attempt
{ const { log, seams } = world();
  await runFinalizationWithDraftLifecycle({ actor: transient(), flush: async () => true, dispatch: async () => ({ success: false }), seams });
  const second = await runFinalizationWithDraftLifecycle({ actor: transient(), flush: async () => true, dispatch: async () => ({ success: true }), seams });
  assert.equal(log.created.length, 2); assert.equal(log.deleted.length, 1, 'only the failed attempt\'s actor was removed'); assert.equal(second.actor.id, log.created[1]);
  assert.notEqual(log.created[0], log.created[1]); }
process.stdout.write('progression-finalization-lifecycle-failure-injection: ok\n');
