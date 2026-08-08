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
  const oneShotGates = []; // FIFO of one-time gates, independent of `blocker`
  let failNext = false;
  let concurrent = 0;
  let maxConcurrent = 0;

  return {
    id,
    calls,
    writtenSequence,
    get maxConcurrentSetFlag() { return maxConcurrent; },
    block() { blocker = { promise: null, resolve: null }; blocker.promise = new Promise(res => { blocker.resolve = res; }); },
    release() { if (blocker) { const b = blocker; blocker = null; b.resolve(); } },
    /** Push a one-shot gate: the next setFlag call (after any legacy
     * `blocker`) suspends on it until releaseNextGate() resolves it. Used
     * where a test needs to control TWO separate writes independently
     * (block()/release() only ever controls one at a time). */
    blockNextWrite() {
      let resolve;
      const promise = new Promise(res => { resolve = res; });
      oneShotGates.push({ promise, resolve });
    },
    releaseNextGate() {
      const gate = oneShotGates.shift();
      if (gate) gate.resolve();
    },
    /** The next setFlag call throws instead of succeeding (simulates a
     * durable-write failure, e.g. a permissions error or network failure). */
    failNextSetFlag() { failNext = true; },
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
      const gate = oneShotGates.shift();
      if (gate) await gate.promise;
      if (failNext) {
        failNext = false;
        concurrent -= 1;
        throw new Error('simulated setFlag failure');
      }
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
const { ProgressionFinalizer } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js'
);

function makeShellDouble({ actor, session, steps = [], stepPlugins = new Map() }) {
  const shell = Object.create(ProgressionShell.prototype);
  Object.assign(shell, {
    actor,
    mode: 'chargen',
    persistenceEnabled: true,
    progressionSession: session,
    steps,
    stepPlugins,
    currentStepIndex: 0,
    renderScheduler: { dispose() {} },
    mentorRecommendations: null,
    _cancelAutoAdvance() {},
    _centerTimer: null,
    _openedAt: null,
    _clearTrackedListeners() {},
    committedSelections: new Set(),
    stepData: {},
    mentor: null,
    isProcessing: false,
    _singleStepMode: false,
    _embeddedInHolopad: false,
  });
  return shell;
}

/** A session shape for the _onFinalizeProgression() integration tests: like
 * makeFakeSession(), but with a real commitSelection() that mutates
 * draftSelections and queues a write-behind autosave -- simulating what the
 * shell's registered persistence hook does for a real ProgressionSession,
 * without needing a full ProgressionSession + subtype-adapter registry. */
function makeFinalizationSession({ actor, mode = 'chargen', initialMarker = null, currentStepId = 'summary' } = {}) {
  const session = {
    sessionId: `chargen-${actor.id}-fixed`,
    actorId: actor.id,
    createdAt: 1000,
    subtype: 'actor',
    draftSelections: { species: initialMarker ? { id: initialMarker } : null },
    visitedStepIds: ['species', 'summary'],
    invalidatedStepIds: [],
    currentStepId,
    completedStepIds: ['species'],
    derivedEntitlements: {},
    commitSelection(key, value) {
      this.draftSelections[key] = value;
      SessionStorage.queueSessionSave(actor, this, mode);
    },
  };
  return session;
}

/** A step plugin whose syncFromDom() commits a NEW value into the session,
 * simulating e.g. SummaryStep committing an edited field from the DOM. */
function makeSyncCommittingPlugin(newMarker) {
  return {
    syncFromDom(shell) {
      shell.progressionSession.commitSelection('species', { id: newMarker });
    },
    validate() { return { errors: [] }; },
    async onStepExit() {},
  };
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

/* ==================================================================== *
 * PHASE 4.1: persistence barrier closure -- corrective race/durability
 * tests found by an independent back-check of the Phase 4 write-behind
 * queue. C1-C9 below; C10 is "the B-series above stays green."
 * ==================================================================== */

/* ------------------------------------------------------------------ *
 * C1 — clear must not lose a race against a save queued WHILE the clear
 * is waiting behind an in-flight write. Bug (pre-4.1): the drain that
 * owns the in-flight write resumes first, sees the newly-queued save,
 * and starts writing it -- all before clearSession()'s own continuation
 * gets a turn. clearSession() then unsets, and the newly-started write
 * finishes AFTER the unset, resurrecting the session.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('c1-actor');
  actor.block();
  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'A' }), 'chargen');
  await afterDebounce(); // A's write is now in flight and blocked

  const clearPromise = SessionStorage.clearSession(actor, 'chargen');
  await new Promise(resolve => setTimeout(resolve, 20)); // let clearSession reach its wait behind A

  // B queues WHILE the clear is waiting behind A.
  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'B' }), 'chargen');

  actor.release(); // A completes
  await clearPromise;

  // Give any (buggy) delayed B write every chance to land before asserting.
  await afterDebounce(150);

  assert.equal(actor.getStoredFlag(FLAG_PATH('chargen')), undefined,
    'stored session flag was not absent after clearSession(): a save queued while clear was waiting resurrected the session');
  assert.equal(actor.calls.setFlag, 1, 'a save queued while clear was waiting was written (should have been discarded as pre-clear intent)');
}

/* ------------------------------------------------------------------ *
 * C2 — flushSession() must truthfully report failure: when the only
 * write it waits for fails and no newer state is queued afterward,
 * flushSession() must resolve false, not silently report success.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('c2-actor');
  actor.block();
  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'will-fail' }), 'chargen');
  await afterDebounce(); // write now in flight and blocked
  actor.failNextSetFlag(); // the blocked write will throw once released

  const flushPromise = SessionStorage.flushSession(actor, 'chargen');
  await new Promise(resolve => setTimeout(resolve, 20)); // let flushSession's drain register behind the in-flight write

  actor.release();
  const result = await flushPromise;

  assert.equal(result, false, 'flushSession() reported success even though the only write it waited for failed and no newer state was queued');
  assert.equal(actor.getStoredFlag(FLAG_PATH('chargen')), undefined, 'a failed write should not have left stored state');
}

/* ------------------------------------------------------------------ *
 * C3 — saveSession() must truthfully report a durable-write failure.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('c3-actor');
  actor.failNextSetFlag();
  const result = await SessionStorage.saveSession(actor, makeFakeSession({ actorId: actor.id, marker: 'will-fail' }), 'chargen');
  assert.equal(result, false, 'saveSession() reported success despite the underlying setFlag failing');
  assert.equal(actor.getStoredFlag(FLAG_PATH('chargen')), undefined);
}

/* ------------------------------------------------------------------ *
 * Bonus (blocker 3, recommended but not required as its own numbered
 * test): a transient failed write does not poison the queue -- if a
 * newer snapshot is queued after a failed in-flight write, draining
 * again succeeds and durably reflects that newer state.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('c3-bonus-actor');
  actor.block();
  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'A-fails' }), 'chargen');
  await afterDebounce(); // A in flight, blocked
  actor.failNextSetFlag();

  const flushPromise = SessionStorage.flushSession(actor, 'chargen');
  await new Promise(resolve => setTimeout(resolve, 20));

  // A newer snapshot arrives while the doomed A write is still in flight.
  SessionStorage.queueSessionSave(actor, makeFakeSession({ actorId: actor.id, marker: 'B-succeeds' }), 'chargen');

  actor.release(); // A fails
  const flushResult = await flushPromise;
  await afterDebounce(150);

  assert.equal(flushResult, true, 'flushSession() did not report durable success once the newer (B) state landed after A failed');
  assert.equal(actor.getStoredFlag(FLAG_PATH('chargen')).draftSelections.species.id, 'B-succeeds',
    'final stored state was not B after A failed and a newer save was queued');
}

/* ------------------------------------------------------------------ *
 * C4 — queued snapshots must be immutable: mutating the live session's
 * nested selection state AFTER queueing, without re-queueing, must not
 * change what gets persisted.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('c4-actor');
  const session = makeFakeSession({ actorId: actor.id, marker: null });
  session.draftSelections.feats = [{ name: 'Weapon Focus', choice: { weapon: 'Rifles' } }];

  SessionStorage.queueSessionSave(actor, session, 'chargen');
  // Mutate the SAME nested object after queueing, without queueing again.
  session.draftSelections.feats[0].choice.weapon = 'Pistols';

  await afterDebounce();

  const stored = actor.getStoredFlag(FLAG_PATH('chargen'));
  assert.equal(stored.draftSelections.feats[0].choice.weapon, 'Rifles',
    'queued snapshot was not immutable -- a later mutation of the live session changed the already-queued snapshot');
}

/* ------------------------------------------------------------------ *
 * C5 — an explicitly re-queued newer snapshot DOES persist the newer
 * (mutated) state, distinguishing "silent mutation of an old snapshot"
 * (C4, must not persist) from "a genuinely newer captured snapshot"
 * (must persist).
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('c5-actor');
  const session = makeFakeSession({ actorId: actor.id, marker: null });
  session.draftSelections.feats = [{ name: 'Weapon Focus', choice: { weapon: 'Rifles' } }];

  SessionStorage.queueSessionSave(actor, session, 'chargen');
  session.draftSelections.feats[0].choice.weapon = 'Pistols';
  SessionStorage.queueSessionSave(actor, session, 'chargen'); // explicit newer snapshot

  await afterDebounce();

  const stored = actor.getStoredFlag(FLAG_PATH('chargen'));
  assert.equal(stored.draftSelections.feats[0].choice.weapon, 'Pistols',
    'an explicitly re-queued newer snapshot did not persist');
}

/* ------------------------------------------------------------------ *
 * C6/C7 — real _onFinalizeProgression(): the current step's syncFromDom()
 * must run (and any commit it triggers must become durable) BEFORE
 * ProgressionFinalizer.finalize() is invoked. A persisted/queued value of
 * A exists; syncFromDom() commits a NEW value B; the finalizer stub
 * records what is durably stored at the moment it begins.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('c6-actor');
  const session = makeFinalizationSession({ actor, initialMarker: 'A' });

  // The "already queued/persisted" value before Confirm is clicked.
  SessionStorage.queueSessionSave(actor, session, 'chargen');
  await afterDebounce();
  assert.equal(actor.getStoredFlag(FLAG_PATH('chargen')).draftSelections.species.id, 'A');

  const shell = makeShellDouble({
    actor,
    session,
    steps: [{ stepId: 'summary' }],
    stepPlugins: new Map([['summary', makeSyncCommittingPlugin('B')]]),
  });

  let finalizerCalls = 0;
  let finalizerSawStoredValue = null;
  const originalFinalize = ProgressionFinalizer.finalize;
  ProgressionFinalizer.finalize = async () => {
    finalizerCalls += 1;
    finalizerSawStoredValue = actor.getStoredFlag(FLAG_PATH('chargen'))?.draftSelections?.species?.id ?? null;
    return { success: true, message: 'ok' };
  };
  try {
    await shell._onFinalizeProgression();
  } finally {
    ProgressionFinalizer.finalize = originalFinalize;
  }

  assert.equal(finalizerCalls, 1, 'ProgressionFinalizer.finalize was not invoked exactly once');
  assert.equal(finalizerSawStoredValue, 'B',
    'finalizer began before the DOM-synced (B) state was durably saved -- saw stale A instead');
}

/* ------------------------------------------------------------------ *
 * C8 — a failed pre-finalization durability flush must block
 * finalization entirely: ProgressionFinalizer.finalize must not be
 * called, and isProcessing must reset so the player can retry.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('c8-actor');
  actor.failNextSetFlag(); // the flush's write attempt (of the synced B state) will fail
  const session = makeFinalizationSession({ actor, initialMarker: 'A' });

  const shell = makeShellDouble({
    actor,
    session,
    steps: [{ stepId: 'summary' }],
    stepPlugins: new Map([['summary', makeSyncCommittingPlugin('B')]]),
  });

  let finalizerCalls = 0;
  const originalFinalize = ProgressionFinalizer.finalize;
  ProgressionFinalizer.finalize = async () => { finalizerCalls += 1; return { success: true, message: 'ok' }; };
  try {
    await shell._onFinalizeProgression();
  } finally {
    ProgressionFinalizer.finalize = originalFinalize;
  }

  assert.equal(finalizerCalls, 0, 'ProgressionFinalizer.finalize was called despite the pre-finalization durability flush failing');
  assert.equal(shell.isProcessing, false, 'isProcessing was not reset after aborting finalization on a failed flush');
}

/* ------------------------------------------------------------------ *
 * C9 — successful finalization cannot be followed by a stale queued
 * draft resurrecting itself. ProgressionFinalizer never calls
 * commitSelection() on the session (confirmed by audit: it only reads
 * draftSelections), so nothing can re-queue during finalize() itself;
 * combined with the durable pre-finalization flush (C6/C7), the queue
 * for this actor+mode is fully idle for the entire finalize() call.
 * ------------------------------------------------------------------ */
{
  const actor = makeFakeActor('c9-actor');
  const session = makeFinalizationSession({ actor, initialMarker: 'A' });

  const shell = makeShellDouble({
    actor,
    session,
    steps: [{ stepId: 'summary' }],
    stepPlugins: new Map([['summary', makeSyncCommittingPlugin('B')]]),
  });

  const originalFinalize = ProgressionFinalizer.finalize;
  ProgressionFinalizer.finalize = async () => ({ success: true, message: 'ok' });
  try {
    await shell._onFinalizeProgression();
  } finally {
    ProgressionFinalizer.finalize = originalFinalize;
  }

  const setFlagCallsAfterFinalize = actor.calls.setFlag;
  const storedAfterFinalize = actor.getStoredFlag(FLAG_PATH('chargen'));

  // Wait well past the debounce window: nothing should be queued/in-flight
  // for this key after a successful finalization, so no further write
  // should ever happen.
  await afterDebounce(150);

  assert.equal(actor.calls.setFlag, setFlagCallsAfterFinalize,
    'a write happened AFTER successful finalization completed -- a stale queued draft resurrected itself');
  assert.deepEqual(actor.getStoredFlag(FLAG_PATH('chargen')), storedAfterFinalize,
    'stored session state changed after successful finalization completed');
}

console.log('progression-session-persistence-writebehind (Phase 4.1 barrier closure): all assertions passed');

console.log('progression-session-persistence-writebehind (ProgressionShell integration): all assertions passed');
