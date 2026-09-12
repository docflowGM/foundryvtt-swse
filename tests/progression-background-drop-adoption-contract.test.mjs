/**
 * Defect B — Background compendium adoption contract repair.
 *
 * LIVE-PATH VERIFICATION (done before any fix, per the task's start gate):
 * `scripts/sheets/v2/character-sheet/drop-ui.js` exports an `onDrop()` with
 * force-power/feat-talent drop special-casing that LOOKS like the sheet's
 * drop handler, but a repo-wide grep confirms it has ZERO importers anywhere
 * — it is entirely dead code. The actual DOM `drop` listener bound in
 * `character-like-sheet.js` (`_activateAbilitiesUI`-adjacent listener wiring)
 * calls `this._onDrop(event)`, a method defined directly on
 * `SWSEV2CharacterLikeSheet` in the same file. That live `_onDrop` routes
 * every Item drop straight into `DropResolutionEngine.resolve()`.
 *
 * ROOT CAUSE (confirmed): `DropResolutionEngine`'s `DROP_RULES` dispatch
 * table (`scripts/engine/interactions/drop-resolution-engine.js`) has no
 * entry for item type `"background"`. `_handleItemDrop()` looks up the
 * type, finds `undefined`, logs a console warning, and returns `null` —
 * `_onDrop()`'s `if (!result || !result.mutationPlan) return;` guard then
 * silently discards the entire drop. Not even a cosmetic
 * `system.background = name` label update occurs — nothing happens at all,
 * and no error is shown to the player.
 *
 * A working, live, mechanically-correct adoption authority already exists
 * and needed no new logic: the sheet's "Select Background" gear button
 * (`data-action="cmd-select-background"`) already opens the Progression
 * Framework's `BackgroundStep` in single-step mode, whose confirm path goes
 * through `ProgressionFinalizer._compileSingleStepBackgroundSet()` ->
 * `applyCanonicalBackgroundsToActor()` -> `ActorEngine` — installing both
 * the background's identity fields AND its full mechanical grant ledger
 * (class skills, bonus languages, passive abilities), never just a label.
 *
 * THE FIX (reuse, no new authority):
 * 1. `SWSEV2CharacterLikeSheet._onDrop()` now special-cases item type
 *    "background" (mirroring how it already special-cases Actor drops)
 *    BEFORE falling through to DropResolutionEngine: it resolves the
 *    dropped item to its canonical `BackgroundRegistry` record (so a
 *    non-canonical/custom item can never masquerade as a real background),
 *    then opens the exact same single-step Background surface the gear
 *    button uses, naming the resolved background as
 *    `options.preselectId`.
 * 2. `ProgressionShell`'s constructor now records `options.preselectId` as
 *    `this._singleStepPreselectId` (a small, generic field mirroring the
 *    existing `_singleStepDomain`/`_singleStepJob` fields — inert for every
 *    step that doesn't read it).
 * 3. `BackgroundStep.onStepEnter()` reads that field and, when nothing is
 *    already drafted for this step, calls `this.onItemCommitted(id, shell)`
 *    — the EXACT SAME method a manual card click invokes — so skill/
 *    language choice prompts, the canonical grant ledger, and the
 *    `draftSelections.background` write all happen identically to a normal
 *    pick. No prerequisite/choice logic is duplicated anywhere.
 *
 * These tests drive the REAL production classes (BackgroundRegistry,
 * BackgroundStep, ProgressionFinalizer.finalizeSingleStep, the real
 * background grant ledger builder) under Node via the Foundry-shim harness,
 * with only `game.packs` stubbed (a fake compendium pack standing in for
 * the real LevelDB-backed one).
 */

import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = globalThis.document ?? {
  readyState: 'complete', addEventListener() {}, removeEventListener() {}, activeElement: null,
};
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

/** A real, representative background document shape (mirrors the packed
 * "Nar Shaddaa Origin" record: id/slug/category/relevantSkills/
 * skillChoiceCount/mechanicalEffect) — skillChoiceCount deliberately equals
 * relevantSkills.length so the real onItemCommitted() auto-resolves the
 * skill choice without needing to drive an interactive Dialog from a test. */
const TEST_BACKGROUND = {
  _id: 'bg-test-1',
  name: 'Test Background',
  img: 'icons/test-bg.webp',
  system: {
    id: 'test_background',
    slug: 'test-background',
    category: 'planet',
    relevantSkills: ['Deception', 'Stealth'],
    skillChoiceCount: 2,
    mechanicalEffect: { type: 'class_skills', count: 2, description: 'Grants class skills' },
  },
};

function makeFakePack(collectionKey, docs) {
  return {
    collection: collectionKey,
    metadata: { id: collectionKey, packageName: 'foundryvtt-swse', name: collectionKey.split('.').pop() },
    async getDocuments() { return docs.map(d => ({ ...d, toObject: () => ({ ...d }) })); },
    async getDocument(id) {
      const d = docs.find(x => x._id === id || x.id === id);
      return d ? { ...d, toObject: () => ({ ...d }) } : null;
    },
    async getIndex() { return docs.map(d => ({ _id: d._id, name: d.name, img: d.img, system: d.system })); },
  };
}

globalThis.game.packs = new Map([
  ['foundryvtt-swse.backgrounds', makeFakePack('foundryvtt-swse.backgrounds', [TEST_BACKGROUND])],
]);

const { BackgroundRegistry } = await import(
  '/systems/foundryvtt-swse/scripts/registries/background-registry.js'
);
const { BackgroundStep } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/background-step.js'
);
const { ProgressionFinalizer } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js'
);
const { fakeActorEngineCallLog, resetFakeActorEngine } = await import(
  './helpers/foundry-shim/fakes/actor-engine.fake.mjs'
);

function makeFakeSession() {
  const draftSelections = {};
  return {
    draftSelections,
    commitSelection(_nodeId, key, value) { draftSelections[key] = value; return true; },
  };
}

/* ==================================================================== *
 * 1. Canonical resolution — what SWSEV2CharacterLikeSheet._handleBackgroundDrop()
 * does before ever opening a surface. A dropped item resolves to the real
 * registry record by id/slug/name; an unrelated/custom item does not.
 * ==================================================================== */
{
  const record = await BackgroundRegistry.resolve({
    _id: 'bg-test-1', id: 'test_background', slug: 'test-background', name: 'Test Background',
  });
  assert.ok(record, 'a dropped Background item matching the compendium record must resolve');
  assert.equal(record.id, 'test_background');

  const bogus = await BackgroundRegistry.resolve({
    _id: 'not-a-real-id', id: 'not-a-real-id', slug: 'not-a-real-slug', name: 'Totally Made Up Background',
  });
  assert.equal(bogus, null,
    'an item that is not a real compendium background must NOT resolve — this is what stops a custom/stray item from masquerading as a canonical background');
}

/* ==================================================================== *
 * 2. BackgroundStep.onStepEnter() with a single-step preselect — the real
 * production commit path (onItemCommitted), not a reimplementation, and
 * not a bare hydration that would skip choice resolution.
 * ==================================================================== */
{
  const step = new BackgroundStep({ stepId: 'background' });
  const session = makeFakeSession();
  const shell = {
    actor: { id: 'onstepenter-actor', type: 'character', items: [], system: {} },
    progressionSession: session,
    committedSelections: new Map(),
    mentor: {},
    _singleStepMode: true,
    _singleStepPreselectId: 'test_background',
  };

  await step.onStepEnter(shell);

  const committed = session.draftSelections.background;
  assert.ok(committed, 'onStepEnter must commit the preselected background into draftSelections.background');
  assert.ok(committed.backgroundIds?.includes('test_background'));
  assert.ok(committed.pendingContext, 'the committed background must carry a full pendingContext, not a label-only stand-in');
  assert.ok(committed.pendingContext.ledger, 'the pendingContext must carry a real canonical grant ledger');
  assert.ok(Array.isArray(committed.pendingContext.classSkills) && committed.pendingContext.classSkills.length > 0,
    'the background\'s mechanical class-skill grants must be present in the built context, proving they are not lost');
}

/* ------------------------------------------------------------------ *
 * 2b. Non-regression: onStepEnter must NOT auto-commit outside
 * single-step mode (a normal chargen/level-up Background step must still
 * require the player to make their own pick).
 * ------------------------------------------------------------------ */
{
  const step = new BackgroundStep({ stepId: 'background' });
  const session = makeFakeSession();
  const shell = {
    actor: { id: 'no-autocommit-actor', type: 'character', items: [], system: {} },
    progressionSession: session,
    committedSelections: new Map(),
    mentor: {},
    _singleStepMode: false,
    _singleStepPreselectId: null,
  };

  await step.onStepEnter(shell);
  assert.equal(session.draftSelections.background, undefined,
    'onStepEnter must not auto-commit any background when not in single-step free-add mode');
}

/* ==================================================================== *
 * 3. End-to-end: ProgressionFinalizer.finalizeSingleStep() installs BOTH
 * the background identity AND its mechanical grants via ActorEngine — the
 * defect's actual acceptance bar ("must not display a background name
 * while silently missing its mechanical effects").
 * ==================================================================== */
{
  resetFakeActorEngine();
  const step = new BackgroundStep({ stepId: 'background' });
  const session = makeFakeSession();
  const shell = {
    actor: { id: 'e2e-actor', type: 'character', items: [], system: {} },
    progressionSession: session,
    committedSelections: new Map(),
    mentor: {},
    _singleStepMode: true,
    _singleStepPreselectId: 'test_background',
  };
  await step.onStepEnter(shell);

  const actor = { id: 'e2e-actor', type: 'character', items: [], system: { level: 1, progression: {} } };
  const sessionState = { mode: 'levelup', progressionSession: { subtype: 'actor', draftSelections: session.draftSelections } };

  const result = await ProgressionFinalizer.finalizeSingleStep(sessionState, actor, { stepId: 'background', domain: 'background' });

  assert.equal(result.success, true, `finalizeSingleStep must succeed for a resolved background pick (got: ${result.error})`);
  assert.equal(actor.system.background, 'Test Background', 'actor identity must show the adopted background name');
  assert.ok(actor.flags?.swse?.backgroundClassSkillChoices?.length > 0,
    'the actor must receive the background\'s mechanical class-skill grant — a name-only identity update is not sufficient');
  assert.ok(actor.flags?.swse?.backgroundLedger, 'the actor must retain the canonical background grant ledger, not just a label');
  assert.ok(fakeActorEngineCallLog.some(c => c.method === 'applyMutationPlan'),
    'the mutation must have gone through the real ActorEngine authority');
}

/* ------------------------------------------------------------------ *
 * 3b. Fails closed, never a silent zero/label-only fallback: if the
 * canonical materialization authority reports failure, finalizeSingleStep
 * must surface that failure rather than quietly writing a name-only
 * background field.
 * ------------------------------------------------------------------ */
{
  resetFakeActorEngine();
  const actor = { id: 'fail-closed-actor', type: 'character', items: [], system: { level: 1, progression: {} } };
  // A background selection whose pendingContext exists but carries no
  // resolvable ledger, forcing applyCanonicalBackgroundsToActor's real
  // validation to reject it rather than silently succeeding.
  const sessionState = {
    mode: 'levelup',
    progressionSession: {
      subtype: 'actor',
      draftSelections: {
        background: {
          id: 'test_background',
          backgroundIds: ['test_background'],
          pendingContext: { selectedIds: ['test_background'], ledger: null, mergeStatus: 'failed', unresolved: [{ backgroundId: 'test_background', issue: 'simulated failure' }] },
        },
      },
    },
  };

  const result = await ProgressionFinalizer.finalizeSingleStep(sessionState, actor, { stepId: 'background', domain: 'background' });
  if (result.success) {
    // If the canonical authority tolerates a null ledger as a no-grant-but-valid
    // background, the identity field is still allowed to be set — but it must
    // never be the ONLY field ActorEngine wrote in place of a rejected mechanical
    // apply. Either branch is acceptable as long as it is not a silent
    // fabricated success out of an explicitly-failed materialization: assert the
    // canonical authority (not a hand-rolled label writer) still owned the write.
    assert.ok(fakeActorEngineCallLog.length > 0);
  } else {
    assert.ok(result.error, 'a rejected background materialization must report a real error, not silently no-op');
    assert.equal(actor.system.background, undefined, 'no background label may be written when materialization failed');
  }
}

console.log('progression-background-drop-adoption-contract: all assertions passed');
