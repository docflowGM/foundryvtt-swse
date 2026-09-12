/**
 * Defect A — "Add Feat" / "Add Talent" -> "Pick from Compendium" contract repair.
 *
 * DEAD/DUPLICATE PATH AUDIT (traced by live-path investigation before any fix):
 *
 *   LIVE      [data-action="add-feat"/"add-talent"] (talents-tab.hbs)
 *             -> character-like-sheet.js: SWSEV2CharacterLikeSheet._showAddAbilityDialog(itemType)
 *             -> "Pick from Compendium" button -> this.setSurface('progression', {
 *                  singleStep: true, singleStepDomain, targetStep: 'general-feat'|'general-talent',
 *                  mode: 'freeAdd', forceFreshAdapter: true, ... })
 *             -> ProgressionSurfaceAdapter (scripts/ui/shell/ProgressionSurfaceAdapter.js)
 *             -> LevelupShell single-step-filtered descriptor (GeneralFeatStep/GeneralTalentStep)
 *             -> FeatStep/TalentStep, backed by the canonical FeatRegistry/TalentRegistry
 *             -> ProgressionFinalizer.finalizeSingleStep() (progression-finalizer.js)
 *             -> ActorEngine.applyMutationPlan() (real governance mutation authority)
 *   DEAD      SWSEV2CharacterLikeSheet._showItemSelectionModal() (character-like-sheet.js) —
 *             zero callers anywhere in the codebase; the `#item-selection-modal` DOM it targets
 *             is real and wired (_activateModalUI binds its yes/no buttons) but nothing ever
 *             opens it or sets `this._currentItemType`, so it is permanently unreachable.
 *   DEAD      SWSEV2CharacterLikeSheet._addAbilityItemFromCompendium() (character-like-sheet.js) —
 *             only caller is _handleModalYes(), itself only reachable from the dead modal above.
 *             Uses the canonical FeatRegistry/TalentRegistry correctly, but is orphaned code —
 *             asserting this function's existence or its registry usage via source text (as an
 *             earlier, insufficient test did) proves nothing about what the live button does.
 *   DEAD      SWSEV2CharacterLikeSheet._handleModalYes()/_handleModalNo() — same orphaned modal.
 *   LIVE      "Add Custom Feat"/"Add Custom Talent" -> _createAndOpenBlankItem(itemType) —
 *             unrelated to the compendium-pick path, confirmed functional, unaffected by this fix.
 *
 * ROOT CAUSE of the alpha-tester defect: the live single-step route above IS fully wired and
 * reaches ActorEngine — it is not a stub. The break is in FeatStep._getRequiredFeatCount()
 * (scripts/apps/progression-framework/steps/feat-step.js): for `mode === 'levelup'` it derives
 * the required pick count from buildLevelUpEntitlementManifest(), which reports
 * generalFeat.count = 0 / required = false whenever there is no REAL pending level-up entitlement
 * — exactly the case for a sheet-launched free single-step add (there is no level being gained).
 * With requiredCount stuck at 0, getBlockingIssues() never blocks Confirm even with nothing
 * selected, so a player who doesn't first click a feat card and then clicks Confirm gets
 * ProgressionFinalizer.finalizeSingleStep()'s "Choose a new progression item before confirming."
 * error — which reads as "I clicked Pick from Compendium / Confirm and nothing happened."
 *
 * THE FIX: FeatStep._getRequiredFeatCount() now requires exactly 1 pick when
 * `shell._singleStepMode === true` and the level-up manifest reports no real entitlement,
 * instead of silently accepting 0. TalentStep already hardcoded requiredCount = 1 per step and
 * was not affected by this bug (verified below as a non-regression case).
 *
 * These tests drive the REAL production classes (FeatStep/GeneralFeatStep/GeneralTalentStep,
 * ProgressionFinalizer.finalizeSingleStep, the real FeatRegistry/TalentRegistry/
 * ProgressionContentAuthority resolution chain) under Node via the existing Foundry-shim harness
 * (tests/helpers/foundry-shim/*). Only two seams are stubbed: `game.packs` (a fake compendium
 * pack standing in for the real LevelDB-backed one) and `_getLevelupManifest` (the heavy,
 * unrelated level-up-context builder) — everything else, including the mutation-plan compiler,
 * the content authority, and ActorEngine.applyMutationPlan's add/createEmbedded handling, is real
 * production code. actor-engine.fake.mjs's applyMutationPlan() was extended (this phase) to
 * actually handle `plan.add.items` (it previously only implemented set/update/delete), mirroring
 * ActorEngine._applyAddOps()'s real collection-name-singularization + createEmbeddedDocuments()
 * delegation — without that, this harness could not exercise "an item was actually created" at
 * all for this path.
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

const { GeneralFeatStep } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/feat-step.js'
);
const { GeneralTalentStep } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/talent-step.js'
);

/** A minimal fake Foundry compendium pack: enough of `getDocuments`/`getDocument`/`getIndex`
 * for FeatRegistry/TalentRegistry's real bulk-load + single-document-fetch code paths. */
function makeFakePack(collectionKey, docs) {
  return {
    collection: collectionKey,
    metadata: { id: collectionKey, packageName: 'foundryvtt-swse', name: collectionKey.split('.').pop() },
    async getDocuments() { return docs.map(d => ({ ...d, toObject: () => ({ ...d }) })); },
    async getDocument(id) {
      const d = docs.find(x => x._id === id || x.id === id);
      return d ? { ...d, toObject: () => ({ ...d }) } : null;
    },
    async getIndex() { return docs.map(d => ({ _id: d._id, name: d.name, type: d.type, img: d.img })); },
  };
}

/* ==================================================================== *
 * 1. FeatStep._getRequiredFeatCount() — the confirmed bug and its fix.
 * ==================================================================== */
{
  const step = new GeneralFeatStep({ stepId: 'general-feat' });
  // Stub the heavy, unrelated level-up-context builder: simulate exactly what
  // it returns for a sheet free-add (no real pending level -> no entitlement).
  step._getLevelupManifest = () => ({ generalFeat: { required: false, count: 0 } });

  const singleStepShell = { mode: 'levelup', _singleStepMode: true, actor: {}, progressionSession: { draftSelections: {} } };
  const required = step._getRequiredFeatCount(singleStepShell);
  assert.equal(required, 1,
    'a sheet-launched free single-step "Add Feat" (no real level-up entitlement) must still require exactly 1 pick, not 0');

  step._requiredFeatCount = required;
  step._selectedFeatIds = [];
  const blockingEmpty = step.getBlockingIssues();
  assert.ok(blockingEmpty.length > 0,
    'Confirm must be blocked when a single-step free-add feat step has 0 selections (the exact defect: Confirm silently "succeeded" with nothing picked)');

  step._selectedFeatIds = ['some-feat-id'];
  const blockingOne = step.getBlockingIssues();
  assert.equal(blockingOne.length, 0, 'Confirm must be unblocked once exactly 1 feat has been picked in single-step mode');
}

/* ------------------------------------------------------------------ *
 * 1b. Non-regression: an ordinary (non-single-step) level-up general
 * feat slot with no real entitlement correctly still requires 0 — a
 * player is not forced to spend a feat pick they were never granted.
 * Only the free-add ("Pick from Compendium") launch is special-cased.
 * ------------------------------------------------------------------ */
{
  const step = new GeneralFeatStep({ stepId: 'general-feat' });
  step._getLevelupManifest = () => ({ generalFeat: { required: false, count: 0 } });
  const realLevelupShell = { mode: 'levelup', _singleStepMode: false, actor: {}, progressionSession: { draftSelections: {} } };
  assert.equal(step._getRequiredFeatCount(realLevelupShell), 0,
    'a real (non-single-step) level-up general-feat slot with no manifest entitlement must remain 0 — this fix must not force an unwanted feat pick during ordinary level-up');
}

/* ------------------------------------------------------------------ *
 * 1c. Non-regression: GeneralTalentStep gates Confirm directly off
 * `_selectedTalentId` (never off a mode-dependent manifest count), so it
 * was never exposed to this bug. Confirmed directly against the real
 * class's getBlockingIssues()/getSelection(), not assumed.
 * ------------------------------------------------------------------ */
{
  const step = new GeneralTalentStep({ stepId: 'general-talent' });
  assert.ok(step.getBlockingIssues().length > 0, 'GeneralTalentStep must block Confirm with nothing selected, in any mode');
  assert.equal(step.getSelection().count, 0);

  step._selectedTalentId = 'some-talent-id';
  assert.equal(step.getBlockingIssues().length, 0, 'GeneralTalentStep must unblock Confirm once a talent is selected');
  assert.equal(step.getSelection().count, 1);
}

/* ==================================================================== *
 * 2. ProgressionFinalizer.finalizeSingleStep() — real end-to-end
 * acquisition through the canonical registries and ActorEngine.
 *
 * ProgressionContentAuthority.initialize() (and each registry it drives)
 * is a one-shot module-level guard — it hydrates once per process and
 * every later call is a no-op, regardless of what `game.packs` looks like
 * by then. So both fake packs are registered up front, before the FIRST
 * finalizeSingleStep() call of any kind (including the empty-selection
 * case below, which still triggers that one-time initialization even
 * though it never needs pack data itself).
 * ==================================================================== */
const { ProgressionFinalizer } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js'
);
const { fakeActorEngineCallLog, resetFakeActorEngine } = await import(
  './helpers/foundry-shim/fakes/actor-engine.fake.mjs'
);

const TEST_FEAT = {
  _id: 'feat-test-1', id: 'feat-test-1', name: 'Test Feat', type: 'feat',
  img: 'icons/test-feat.webp', system: { canonicalMarker: 'from-compendium' }, effects: [], flags: {},
};
const TEST_TALENT = {
  _id: 'talent-test-1', id: 'talent-test-1', name: 'Test Talent', type: 'talent',
  img: 'icons/test-talent.webp', system: { canonicalMarker: 'from-compendium' }, effects: [], flags: {},
};
globalThis.game.packs = new Map([
  ['foundryvtt-swse.feats', makeFakePack('foundryvtt-swse.feats', [TEST_FEAT])],
  ['foundryvtt-swse.talents', makeFakePack('foundryvtt-swse.talents', [TEST_TALENT])],
]);

/* ------------------------------------------------------------------ *
 * 2a. Empty selection fails closed (the defect's actual failure mode:
 * Confirm clicked with nothing picked). No item created, no
 * ActorEngine call, and a clear error is returned (not a silent no-op).
 * ------------------------------------------------------------------ */
{
  resetFakeActorEngine();
  const actor = { id: 'no-pick-actor', type: 'character', items: [], system: { level: 1, progression: {} } };
  const sessionState = { mode: 'levelup', progressionSession: { subtype: 'actor', draftSelections: { feats: [] } } };

  const result = await ProgressionFinalizer.finalizeSingleStep(sessionState, actor, { stepId: 'general-feat', domain: 'feats' });

  assert.equal(result.success, false, 'finalizeSingleStep must fail closed when confirmed with an empty feat selection');
  assert.match(result.error || '', /Choose a new progression item/, 'the failure must explain that a pick is required');
  assert.equal(actor.items.length, 0, 'no feat may be created when the selection was empty');
  assert.equal(fakeActorEngineCallLog.filter(c => c.method === 'applyMutationPlan').length, 0,
    'ActorEngine must never be invoked for an empty single-step selection');
}

/* ------------------------------------------------------------------ *
 * 2b. FEAT — a legal pick, once selected, produces exactly one owned
 * feat via ActorEngine.applyMutationPlan, and the canonical (compendium)
 * feat document is what gets embedded, not a label-only stand-in.
 * ------------------------------------------------------------------ */
{
  resetFakeActorEngine();
  const actor = { id: 'feat-pick-actor', type: 'character', items: [], system: { level: 1, progression: {} } };
  const sessionState = {
    mode: 'levelup',
    progressionSession: { subtype: 'actor', draftSelections: { feats: [{ id: 'feat-test-1', name: 'Test Feat', type: 'feat' }] } },
  };

  const result = await ProgressionFinalizer.finalizeSingleStep(sessionState, actor, { stepId: 'general-feat', domain: 'feats' });

  assert.equal(result.success, true, `finalizeSingleStep must succeed for a legal feat pick (got: ${result.error})`);
  assert.equal(actor.items.length, 1, 'exactly one feat item must be created on the actor');
  assert.equal(actor.items[0].name, 'Test Feat');
  assert.equal(actor.items[0].type, 'feat');
  assert.equal(actor.items[0].system?.canonicalMarker, 'from-compendium',
    'the embedded item must carry the canonical compendium document data, not a label-only stand-in');
  const applyCalls = fakeActorEngineCallLog.filter(c => c.method === 'applyMutationPlan' || c.method === 'createEmbeddedDocuments');
  assert.ok(applyCalls.length > 0, 'the real ActorEngine mutation authority must have been invoked to embed the feat');
}

/* ------------------------------------------------------------------ *
 * 2c. TALENT — same contract, repeated for the talent domain.
 * ------------------------------------------------------------------ */
{
  resetFakeActorEngine();
  const actor = { id: 'talent-pick-actor', type: 'character', items: [], system: { level: 1, progression: {} } };
  const sessionState = {
    mode: 'levelup',
    progressionSession: { subtype: 'actor', draftSelections: { talents: [{ id: 'talent-test-1', name: 'Test Talent', type: 'talent' }] } },
  };

  const result = await ProgressionFinalizer.finalizeSingleStep(sessionState, actor, { stepId: 'general-talent', domain: 'talents' });

  assert.equal(result.success, true, `finalizeSingleStep must succeed for a legal talent pick (got: ${result.error})`);
  assert.equal(actor.items.length, 1, 'exactly one talent item must be created on the actor');
  assert.equal(actor.items[0].name, 'Test Talent');
  assert.equal(actor.items[0].type, 'talent');
  assert.equal(actor.items[0].system?.canonicalMarker, 'from-compendium',
    'the embedded talent must carry the canonical compendium document data, not a label-only stand-in');

  // Empty talent selection also fails closed (parity with feats — 2a).
  resetFakeActorEngine();
  const actor2 = { id: 'talent-no-pick-actor', type: 'character', items: [], system: { level: 1, progression: {} } };
  const sessionState2 = { mode: 'levelup', progressionSession: { subtype: 'actor', draftSelections: { talents: [] } } };
  const result2 = await ProgressionFinalizer.finalizeSingleStep(sessionState2, actor2, { stepId: 'general-talent', domain: 'talents' });
  assert.equal(result2.success, false, 'finalizeSingleStep must fail closed for an empty talent selection too');
  assert.equal(actor2.items.length, 0);
}

console.log('progression-sheet-free-add-single-step-contract: all assertions passed');
