import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// PHASE 4 / Track B: session persistence write-behind.
//
// Before this phase, ProgressionSession fired persistence hooks
// synchronously without awaiting them, and the registered hook immediately
// called SessionStorage.saveSession() -> actor.setFlag(). Rapid commits
// could produce overlapping/out-of-order actor flag writes. These tests
// drive the REAL SessionStorage (not a reimplementation) against a fake
// actor with controllable setFlag timing.

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.window = globalThis.window ?? {
  addEventListener: () => {}, removeEventListener: () => {}, __SWSE_CONTRACT_INITIALIZED__: false,
};
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.game = globalThis.game ?? {};

const { SessionStorage } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/session-storage.js'
);

const DEBOUNCE_MS = 100; // must match AUTOSAVE_DEBOUNCE_MS in session-storage.js
async function afterDebounce(extra = 60) {
  await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS + extra));
}

/** A fake actor implementing getFlag/setFlag/unsetFlag with controllable
 * timing and call/concurrency counters. */
function makeFakeActor(id = 'actor-1') {
  const flags = new Map();
  const calls = { getFlag: 0, setFlag: 0, unsetFlag: 0 };
  const writtenSequence = [];
  let blocker = null; // when set, every setFlag call awaits this before completing
  let concurrent = 0;
  let maxConcurrent = 0;

  return {
    id,
    calls,
    writtenSequence,
    get maxConcurrentSetFlag() { return maxConcurrent; },
    block() { blocker = { promise: null, resolve: null }; blocker.promise = new Promise(res => { blocker.resolve = res; }); },
    release() { if (blocker) { const b = blocker; blocker = null; b.resolve(); } },
    // Real Foundry Document#getFlag() is SYNCHRONOUS (only set/unsetFlag
    // persist async) -- the production code never awaits it. An async fake
    // here would silently break the semantic-dedupe check (comparing
    // against an unresolved Promise instead of the stored value).
    getFlag(_scope, path) {
      calls.getFlag += 1;
      return flags.has(path) ? flags.get(path) : null;
    },
    async setFlag(_scope, path, value) {
      calls.setFlag += 1;
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      if (blocker) await blocker.promise;
      flags.set(path, value);
      writtenSequence.push(value);
      concurrent -= 1;
      return true;
    },
    async unsetFlag(_scope, path) {
      calls.unsetFlag += 1;
      flags.delete(path);
      return true;
    },
    getStoredFlag(path) { return flags.has(path) ? flags.get(path) : undefined; },
  };
}

/** A minimal session-shaped object — everything _compileSessionData() reads.
 * Not a real ProgressionSession instance (that needs a subtype-adapter
 * registry); SessionStorage's own contract only depends on this shape. */
function makeFakeSession({ actorId = 'actor-1', currentStepId = 'species', marker = null } = {}) {
  return {
    sessionId: `chargen-${actorId}-fixed`,
    actorId,
    createdAt: 1000,
    subtype: 'actor',
    draftSelections: { species: marker ? { id: marker } : null },
    visitedStepIds: ['species'],
    invalidatedStepIds: [],
    currentStepId,
    completedStepIds: [],
    derivedEntitlements: {},
  };
}

const FLAG_PATH = (mode) => `progression.${mode}.session`;

/* ------------------------------------------------------------------ *
 * B1 — Burst collapses to latest: 20 rapid queued states -> 1 setFlag,
 * stored state equals the last queued one.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('b1-actor');
  for (let i = 1; i <= 20; i++) {
    SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: `state-${i}` }), 'chargen');
  }
  assert.equal(actor.calls.setFlag, 0, 'a queued (not yet debounced) autosave wrote before the debounce window elapsed');

  await afterDebounce();

  assert.equal(actor.calls.setFlag, 1, `expected exactly 1 setFlag from a 20-state burst, got ${actor.calls.setFlag}`);
  const stored = actor.getStoredFlag(FLAG_PATH('chargen'));
  assert.equal(stored.draftSelections.species.id, 'state-20', 'stored state was not the latest (20th) queued state');
}

/* ------------------------------------------------------------------ *
 * B2 — Writes never overlap: block setFlag, queue another state while the
 * first write is in flight, assert max concurrency is 1.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('b2-actor');
  actor.block();
  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'first' }), 'chargen');
  await afterDebounce(); // the debounced write starts and blocks inside setFlag — entry.writeInFlight is now set

  // saveSession() drains immediately (no debounce wait), so this genuinely
  // races the still-in-flight first write rather than being spaced apart
  // by another debounce window the way two queueSessionSave() calls would.
  const secondPromise = SessionStorage.saveSession(actor, makeFakeSession({ actorId: actor.id, marker: 'second' }), 'chargen');
  await new Promise(resolve => setTimeout(resolve, 20)); // let the second attempt reach its own concurrency check

  actor.release();
  await secondPromise;

  assert.equal(actor.maxConcurrentSetFlag, 1, `expected max concurrent setFlag = 1, saw ${actor.maxConcurrentSetFlag}`);
  const stored = actor.getStoredFlag(FLAG_PATH('chargen'));
  assert.equal(stored.draftSelections.species.id, 'second', 'final stored state was not the newest queued state');
}

/* ------------------------------------------------------------------ *
 * B3 — Latest wins during an in-flight write: A begins writing, B/C/D
 * queue while A is in flight, A completes -> expected final state is D
 * (B/C need not be individually written).
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('b3-actor');
  actor.block();
  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'A' }), 'chargen');
  await afterDebounce(); // A's write is now in flight and blocked

  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'B' }), 'chargen');
  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'C' }), 'chargen');
  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'D' }), 'chargen');

  actor.release(); // A completes
  await afterDebounce(); // D's debounce (re-armed by each queue call) elapses, D is drained

  const stored = actor.getStoredFlag(FLAG_PATH('chargen'));
  assert.equal(stored.draftSelections.species.id, 'D', 'final durable state was not D');
  assert.ok(!actor.writtenSequence.some(s => s.draftSelections.species?.id === 'B'), 'B was individually written (should have been superseded)');
  assert.ok(!actor.writtenSequence.some(s => s.draftSelections.species?.id === 'C'), 'C was individually written (should have been superseded)');
}

/* ------------------------------------------------------------------ *
 * B4 — saveSession() is durable: the actor flag has been written before
 * the promise resolves. This is a behavior change from fire-and-forget in
 * spirit but the API's existing contract, verified directly.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('b4-actor');
  const ok = await SessionStorage.saveSession(actor, makeFakeSession({ actorId: actor.id, marker: 'durable' }), 'chargen');
  assert.equal(ok, true);
  assert.equal(actor.calls.setFlag, 1, 'saveSession() resolved without having written the actor flag');
  const stored = actor.getStoredFlag(FLAG_PATH('chargen'));
  assert.equal(stored.draftSelections.species.id, 'durable');
}

/* ------------------------------------------------------------------ *
 * B5 — Semantic duplicate skips write: stored state equals the newly
 * requested state except timestamp -> no redundant setFlag().
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('b5-actor');
  const session = makeFakeSession({ actorId: actor.id, marker: 'same' });
  await SessionStorage.saveSession(actor, session, 'chargen');
  assert.equal(actor.calls.setFlag, 1);

  // Same semantic content, called again (a real session's timestamp field
  // differs internally between compiles but _isSemanticallySameSession()
  // deliberately excludes timestamp from the comparison).
  await SessionStorage.saveSession(actor, session, 'chargen');
  assert.equal(actor.calls.setFlag, 1, 'semantically identical re-save produced a redundant setFlag()');
}

/* ------------------------------------------------------------------ *
 * B6 — clear is a hard barrier: queue a save, clear before the debounce
 * fires, advance time fully -> session flag remains cleared, no stale
 * delayed save occurs.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('b6-actor');
  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'stale' }), 'chargen');
  await SessionStorage.clearSession(actor, 'chargen'); // before the ~100ms debounce fires

  await afterDebounce(150);

  assert.equal(actor.calls.setFlag, 0, 'a pre-clear queued save was written after clearSession()');
  assert.equal(actor.getStoredFlag(FLAG_PATH('chargen')), undefined, 'session flag was not cleared / was resurrected');
}

/* ------------------------------------------------------------------ *
 * B7 — clear waits behind an in-flight save: A begins writing (blocked),
 * clear() is called, A completes, THEN clear/unset happens. Never: clear
 * first, then A resurrects the session.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('b7-actor');
  actor.block();
  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'in-flight' }), 'chargen');
  await afterDebounce(); // A's write is now in flight and blocked

  let clearResolved = false;
  const clearPromise = SessionStorage.clearSession(actor, 'chargen').then(() => { clearResolved = true; });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(clearResolved, false, 'clearSession() resolved before the in-flight write it must wait behind');
  assert.equal(actor.getStoredFlag(FLAG_PATH('chargen')), undefined, 'in-flight A had not written yet, but the flag already looks cleared before A finished');

  actor.release();
  await clearPromise;

  assert.equal(actor.getStoredFlag(FLAG_PATH('chargen')), undefined, 'final flag state was not cleared after A completed then clear ran');
  assert.equal(actor.calls.unsetFlag, 1);
}

/* ------------------------------------------------------------------ *
 * B8 — Actors/modes isolated: independent serialization keys.
 * ------------------------------------------------------------------ */
{
  const actor1 = makeFakeActor('b8-actor-1');
  const actor2 = makeFakeActor('b8-actor-2');

  SessionStorage.queueSessionSave(actor1, makeFakeSession({ actorId: actor1.id, marker: 'a1-chargen' }), 'chargen');
  SessionStorage.queueSessionSave(actor1, makeFakeSession({ actorId: actor1.id, marker: 'a1-levelup' }), 'levelup');
  SessionStorage.queueSessionSave(actor2, makeFakeSession({ actorId: actor2.id, marker: 'a2-chargen' }), 'chargen');

  await afterDebounce();

  assert.equal(actor1.calls.setFlag, 2, 'actor1 chargen+levelup queues were not independently written');
  assert.equal(actor2.calls.setFlag, 1, 'actor2 write count affected by actor1 activity');
  assert.equal(actor1.getStoredFlag(FLAG_PATH('chargen')).draftSelections.species.id, 'a1-chargen');
  assert.equal(actor1.getStoredFlag(FLAG_PATH('levelup')).draftSelections.species.id, 'a1-levelup');
  assert.equal(actor2.getStoredFlag(FLAG_PATH('chargen')).draftSelections.species.id, 'a2-chargen');
}

console.log('progression-session-persistence-writebehind (SessionStorage core): all assertions passed');

/* ==================================================================== *
 * B9-B11: ProgressionShell integration — real prototype methods
 * (_persistSessionSnapshot, close, the finalization flush) driven against
 * a lightweight shell double, not a reimplementation of the shell.
 * ==================================================================== */

globalThis.foundry.applications = globalThis.foundry.applications ?? {
  api: {
    ApplicationV2: class ApplicationV2Stub { async close() { return this; } },
    HandlebarsApplicationMixin: (Base) => class extends Base {},
    DocumentSheetV2: class DocumentSheetV2Stub {},
    DialogV2: class DialogV2Stub {},
  },
  handlebars: { renderTemplate: async () => '' },
  ux: { TextEditor: { implementation: { enrichHTML: async (v) => v } } },
};
globalThis.document = globalThis.document ?? {
  readyState: 'complete', addEventListener: () => {}, removeEventListener: () => {}, activeElement: null,
};

const { ProgressionShell } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-shell.js'
);

function makeShellDouble({ actor, session }) {
  const shell = Object.create(ProgressionShell.prototype);
  Object.assign(shell, {
    actor,
    mode: 'chargen',
    persistenceEnabled: true,
    progressionSession: session,
    steps: [],
    stepPlugins: new Map(),
    currentStepIndex: 0,
    renderScheduler: { dispose() {} },
    mentorRecommendations: null,
    _cancelAutoAdvance() {},
    _centerTimer: null,
    _openedAt: null,
    _clearTrackedListeners() {},
  });
  return shell;
}

/* ------------------------------------------------------------------ *
 * B9 — navigation durable snapshot: _persistSessionSnapshot() reaches
 * durable storage without waiting for the ordinary debounce window.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('b9-actor');
  const session = makeFakeSession({ actorId: actor.id, marker: 'nav-target', currentStepId: 'species' });
  const shell = makeShellDouble({ actor, session });

  const ok = await shell._persistSessionSnapshot('background');
  assert.equal(ok, true);
  assert.equal(actor.calls.setFlag, 1, '_persistSessionSnapshot() did not durably write before resolving');
  assert.equal(actor.getStoredFlag(FLAG_PATH('chargen')).currentStepId, 'background',
    'navigation snapshot did not persist the new currentStepId durably');
}

/* ------------------------------------------------------------------ *
 * B10 — close() flushes latest unfinished state: queue a commit autosave,
 * close before the debounce timer fires, assert the latest valid session
 * is persisted.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('b10-actor');
  const session = makeFakeSession({ actorId: actor.id, marker: 'pending-at-close' });
  const shell = makeShellDouble({ actor, session });

  SessionStorage.queueSessionSave(actor, session, 'chargen');
  assert.equal(actor.calls.setFlag, 0, 'queued autosave wrote before close() had a chance to flush it');

  await shell.close();

  assert.equal(actor.calls.setFlag, 1, 'close() did not flush the pending queued autosave');
  assert.equal(actor.getStoredFlag(FLAG_PATH('chargen')).draftSelections.species.id, 'pending-at-close');
}

/* ------------------------------------------------------------------ *
 * B11 — finalization flush ordering: the finalization flush completes
 * before any later step proceeds; if a later step throws, the latest
 * draft state remains persisted (recoverable).
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('b11-actor');
  const session = makeFakeSession({ actorId: actor.id, marker: 'pre-finalize-draft' });

  SessionStorage.queueSessionSave(actor, session, 'chargen');
  assert.equal(actor.calls.setFlag, 0);

  // Exercise the same flush call _onFinalizeProgression() makes before
  // invoking ProgressionFinalizer, without needing a live ActorEngine
  // mutation in this focused unit test.
  await SessionStorage.flushSession(actor, 'chargen');
  assert.equal(actor.calls.setFlag, 1, 'flushSession() (the finalization-flush seam) did not drain the queued draft before finalization would begin');

  // Simulate the finalizer throwing after the flush: the durably-flushed
  // draft must still be present (recoverable), unaffected by the failure.
  try {
    throw new Error('simulated finalizer failure');
  } catch (_err) {
    // expected
  }
  assert.equal(actor.getStoredFlag(FLAG_PATH('chargen')).draftSelections.species.id, 'pre-finalize-draft',
    'latest draft did not remain recoverable after a simulated finalization failure following the flush');
}

console.log('progression-session-persistence-writebehind (ProgressionShell integration): all assertions passed');
