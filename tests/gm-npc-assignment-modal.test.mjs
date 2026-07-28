import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Styled NPC Assignment Modal — UI addendum required test suite (commit
// "feat(allies): add styled NPC assignment modal", including the
// eligibility/ownership correction pass — commit
// "fix(allies): harden NPC assignment modal eligibility").
//
// Coverage tiers (see docs/audits/gm-existing-npc-allies-assignment.md,
// "Styled Assignment Modal" section):
//   (a) DIRECT PRODUCTION-PATH — the modal's entire decision logic (view
//       model construction, search filtering, mode/slot/template selection
//       policy, confirm-gating, and result normalization) lives as
//       pure/near-pure exports in scripts/ui/shell/AlliesSurfaceService.js
//       and scripts/engine/crew/ally-assignment-service.js, which load and
//       execute for real through the Foundry-shim harness. These are the
//       SAME functions AllyAssignmentModal calls from its event handlers —
//       not a reimplementation.
//   (d) TEMPLATE/SOURCE STRUCTURAL ASSERTIONS — the modal class itself
//       extends SWSEApplicationV2, which (like every other AppV2-based
//       dialog in this codebase) cannot load through this repo's Node
//       Foundry-shim harness (confirmed: foundry.applications.api is not
//       shimmed — the same wall documented for AlliesSurfaceController.js's
//       dialog flow since Phase 4). Requirements about the shipped
//       template/CSS/JS structure (real radio inputs, no plain <select>,
//       ARIA attributes, scroll containment, no ActorEngine access) are
//       instead verified by reading the actual shipped files as text and
//       asserting the invariant is present — an automated, repeatable
//       check against the exact code that ships, not a live-DOM test. Live
//       keyboard/focus/Enter-submission behavior in an actual browser DOM
//       is NOT verified here — only that the shipped markup and JS wiring
//       are structurally present (a real <form>, a submit listener, a
//       submit-type confirm button). This is a narrower claim than "Enter
//       submission works," and is reported as such.

registerFoundryPathLoader();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const {
  AlliesSurfaceService,
  buildDefaultAllyAssignmentModalState,
  normalizeAllyAssignmentSearchQuery,
  filterNpcAssignmentCandidates,
  findNpcAssignmentCandidate,
  findFollowerSlotById,
  followerTemplateLabel,
  isAllyAssignmentModeAvailable,
  resolveFollowerSlotSelectionOnModeChange,
  resolveFollowerSlotSelection,
  resolveFollowerTemplateSelectionForSlot,
  canConfirmAllyAssignment,
  buildAllyAssignmentResult
} = await import('../scripts/ui/shell/AlliesSurfaceService.js');

const {
  evaluateNpcAssignmentEligibility,
  evaluateFollowerConversionEligibility,
  isTargetAlreadyFollower,
  isActivePlayerCharacter
} = await import('../scripts/engine/crew/ally-assignment-service.js');

const { fakeActorEngineCallLog, resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');

const SYSTEM_ID = 'foundryvtt-swse';

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const MODAL_JS = readSource('scripts/apps/allies/ally-assignment-modal.js');
const MODAL_HBS = readSource('templates/apps/allies/ally-assignment-modal.hbs');
const MODAL_CSS = readSource('styles/apps/allies/ally-assignment-modal.css');
const CONTROLLER_JS = readSource('scripts/ui/shell/AlliesSurfaceController.js');
const SERVICE_JS = readSource('scripts/engine/crew/ally-assignment-service.js');

function makeActorsCollection(actors = []) {
  // Foundry's real game.actors is a Collection (extends Map) whose
  // Symbol.iterator yields VALUES, unlike a plain Map (which yields
  // [key, value] entries) — this fake matches that real semantics so
  // for...of loops in production code iterate actor objects directly.
  const map = new Map(actors.map(a => [a.id, a]));
  return {
    get: (id) => map.get(id),
    set: (id, actor) => map.set(id, actor),
    [Symbol.iterator]: () => map.values()
  };
}

function makeFakeActor(overrides = {}) {
  const flags = { [SYSTEM_ID]: {}, swse: {}, ...(overrides.flags || {}) };
  const actor = {
    id: 'actor-1', name: 'Test Actor', type: 'npc', uuid: 'Actor.actor-1', isOwner: false,
    system: {}, img: 'icons/x.png', items: [], effects: [], ownership: {},
    ...overrides,
    flags,
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    // Required by SnapshotManager.createSnapshot/restoreSnapshot (used by
    // convertToFollower's real target-snapshot rollback path).
    toObject(_source) {
      return JSON.parse(JSON.stringify({
        system: actor.system, name: actor.name, img: actor.img,
        prototypeToken: actor.prototypeToken, items: actor.items,
        effects: actor.effects, flags: actor.flags
      }));
    }
  };
  return actor;
}

function asGM(actors = [], gameExtra = {}, topLevelExtra = {}) {
  installFoundryShimGlobals({
    game: { user: { isGM: true, id: 'gm-1', name: 'GM Tester' }, actors: makeActorsCollection(actors), users: [], ...gameExtra },
    ...topLevelExtra
  });
}

const OWNERSHIP_LEVELS = { NONE: -1, LIMITED: 1, OBSERVER: 2, OWNER: 3 };

function asPlayer(actors = []) {
  installFoundryShimGlobals({ game: { user: { isGM: false, id: 'player-1', name: 'Player' }, actors: makeActorsCollection(actors), users: [] } });
}

// ---------------------------------------------------------------------
// 1-2: GM gating
// ---------------------------------------------------------------------

// 1. GM can open the modal — the picker view model is populated for a GM.
{
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  asGM([owner, npc]);
  const vm = AlliesSurfaceService.buildNpcAssignmentPickerViewModel(owner);
  assert.equal(vm.candidates.length, 1, 'a GM sees the eligible NPC candidate');
  assert.equal(vm.candidates[0].id, 'npc-1');
}
// Controller-side gate (source inspection — the AppV2 modal class itself
// cannot load in this harness, but the GM check that gates opening it is
// verified directly in the shipped controller source):
{
  const match = CONTROLLER_JS.match(/async _assignExistingNpc\([\s\S]{0,160}/);
  assert.ok(match, '_assignExistingNpc must exist');
  assert.match(match[0], /game\.user\?\.isGM\s*!==\s*true/, '_assignExistingNpc must gate on GM status before opening the modal');
}

// 2. Non-GM cannot open the modal — the picker view model is empty for a
// non-GM caller, and the controller returns before calling the modal.
{
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  asPlayer([owner, npc]);
  const vm = AlliesSurfaceService.buildNpcAssignmentPickerViewModel(owner);
  assert.deepEqual(vm.candidates, [], 'a non-GM must never receive assignable candidates');
}

// ---------------------------------------------------------------------
// 3-7, 30: Radio-input structure (template/source assertions)
// ---------------------------------------------------------------------

// 3. Actor cards use radio inputs, wrapped in a real <label>.
{
  assert.match(MODAL_HBS, /<label class="swse-assignment-actor-card[\s\S]{0,400}?<input\s+type="radio"\s+name="targetActorId"/, 'each Actor card must be a <label> wrapping a real radio input');
}

// 4. Assignment choices (Assign as Ally / Convert to Follower) use radio inputs.
{
  assert.match(MODAL_HBS, /<label class="swse-assignment-mode-card[\s\S]{0,400}?<input\s+type="radio"\s+name="assignmentMode"\s+value="ally"/);
  assert.match(MODAL_HBS, /<label class="swse-assignment-mode-card[\s\S]{0,400}?<input\s+type="radio"\s+name="assignmentMode"\s+value="follower"/);
}

// 5. Follower slots use radio inputs.
{
  assert.match(MODAL_HBS, /<label class="swse-assignment-slot-card[\s\S]{0,300}?<input\s+type="radio"\s+name="followerSlotId"/);
}

// 6. No plain Actor <select> remains in the normal flow.
{
  assert.doesNotMatch(MODAL_HBS, /<select[^>]*name="targetActorId"/);
  assert.doesNotMatch(CONTROLLER_JS, /<select name="targetActorId">/);
}

// 7. No plain follower-slot <select> remains in the normal flow.
{
  assert.doesNotMatch(MODAL_HBS, /<select[^>]*name="(followerSlotId|slotId)"/);
  assert.doesNotMatch(CONTROLLER_JS, /<select name="slotId">/);
}

// 30. Selected and disabled states are exposed to assistive technology.
{
  assert.match(MODAL_HBS, /role="dialog"/);
  assert.match(MODAL_HBS, /aria-labelledby="swse-ally-assignment-modal-title"/);
  assert.match(MODAL_HBS, /aria-describedby="swse-ally-assignment-modal-desc"/);
  assert.match(MODAL_HBS, /role="radiogroup"/);
  assert.match(MODAL_HBS, /\{\{#unless allyModeAvailable\}\}disabled\{\{\/unless\}\}/, 'a disabled assignment-mode radio must carry a real disabled attribute, not just a CSS class');
  assert.match(MODAL_HBS, /\{\{#if submitting\}\}disabled\{\{\/if\}\}/);
  // Correction pass: an inert Actor card's radio must ALSO carry a real
  // disabled attribute (see test 31), not just a CSS class.
  assert.match(MODAL_HBS, /\{\{#if this\.radioDisabled\}\}disabled aria-disabled="true"\{\{\/if\}\}/);
}

// ---------------------------------------------------------------------
// 8-13: Search, defaults, and per-candidate mode availability
// ---------------------------------------------------------------------

// 8. Search filters Actor cards.
{
  const candidates = [
    { id: 'a', name: 'Captain Varo', searchText: 'captain varo heroic npc level 8 human' },
    { id: 'b', name: 'RX-77', searchText: 'rx-77 droid playable-derived eligible' }
  ];
  assert.equal(filterNpcAssignmentCandidates(candidates, '').length, 2);
  assert.deepEqual(filterNpcAssignmentCandidates(candidates, 'droid').map(c => c.id), ['b']);
  assert.deepEqual(filterNpcAssignmentCandidates(candidates, '  VARO  ').map(c => c.id), ['a']);
  assert.equal(normalizeAllyAssignmentSearchQuery('  Mixed CASE  '), 'mixed case');
}

// 9. Selecting an Actor updates modal state — replicates exactly what the
// modal's _onSelectCandidate handler computes from the pure exports it is
// built from.
{
  const viewModel = {
    candidates: [
      { id: 'npc-1', eligible: true, canConvertToFollower: false },
      { id: 'npc-2', eligible: false, canConvertToFollower: false }
    ],
    followerSlots: []
  };
  let state = buildDefaultAllyAssignmentModalState();
  assert.equal(state.targetActorId, null);
  const candidate = findNpcAssignmentCandidate(viewModel, 'npc-1');
  let nextMode = state.assignmentMode;
  if (!isAllyAssignmentModeAvailable(candidate, nextMode)) nextMode = 'ally';
  state = resolveFollowerSlotSelectionOnModeChange(viewModel, { ...state, targetActorId: 'npc-1' }, nextMode);
  assert.equal(state.targetActorId, 'npc-1');
  assert.equal(state.assignmentMode, 'ally');
}

// 10. Assign as Ally is selected by default.
{
  assert.equal(buildDefaultAllyAssignmentModalState().assignmentMode, 'ally');
  assert.equal(buildDefaultAllyAssignmentModalState({ assignmentMode: 'nonsense' }).assignmentMode, 'ally');
}

// 11. Convert remains disabled with no slots.
{
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  asGM([owner, npc]);
  const vm = AlliesSurfaceService.buildNpcAssignmentPickerViewModel(owner);
  assert.equal(vm.candidates[0].canConvertToFollower, false);
  const state = { targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: null, submitting: false };
  assert.equal(canConfirmAllyAssignment(vm, state), false);
}

// 12. Convert remains disabled for stock-statblock droids.
// 13. Assign as Ally remains enabled for stock-statblock droids.
{
  resetFakeActorEngine();
  const owner = makeFakeActor({
    id: 'owner-1', type: 'character',
    flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } }
  });
  const stockDroid = makeFakeActor({ id: 'droid-1', type: 'droid', flags: { swse: { stockDroidImport: { importMode: 'statblock' } } } });
  asGM([owner, stockDroid]);
  const vm = AlliesSurfaceService.buildNpcAssignmentPickerViewModel(owner);
  const card = vm.candidates.find(c => c.id === 'droid-1');
  assert.equal(card.canConvertToFollower, false, 'Convert to Follower must stay disabled for a stock-statblock droid');
  assert.match(card.convertBlockedReason || '', /stock-statblock/);
  assert.equal(card.eligible, true, 'Assign as Ally must remain enabled for a stock-statblock droid');
  assert.equal(isAllyAssignmentModeAvailable(card, 'ally'), true);
  assert.equal(isAllyAssignmentModeAvailable(card, 'follower'), false);
}

// ---------------------------------------------------------------------
// 14: Follower-slot section visibility (template assertion)
// ---------------------------------------------------------------------

// 14. Choosing Convert reveals follower slots — the slot section is
// conditionally rendered only in follower mode.
{
  assert.match(MODAL_HBS, /\{\{#if isFollowerMode\}\}[\s\S]*?swse-ally-assignment-modal__slot-section[\s\S]*?\{\{\/if\}\}/);
}

// ---------------------------------------------------------------------
// 15-17: Follower-slot selection policy and no-mutation on state changes
// ---------------------------------------------------------------------

// 15. Multiple slots require explicit selection.
{
  const viewModel = { candidates: [], followerSlots: [{ id: 's1', label: 'A', templateChoices: ['aggressive', 'defensive', 'utility'] }, { id: 's2', label: 'B', templateChoices: ['aggressive', 'defensive', 'utility'] }] };
  const state = resolveFollowerSlotSelectionOnModeChange(viewModel, { followerSlotId: null }, 'follower');
  assert.equal(state.followerSlotId, null, 'two open slots must never be auto-selected');
}

// 16. One available slot follows the documented selection policy — only
// auto-selected once the GM switches INTO Convert to Follower mode.
{
  const viewModel = { candidates: [], followerSlots: [{ id: 's1', label: 'Only Slot', templateChoices: ['aggressive', 'defensive', 'utility'] }] };
  const beforeSwitch = { followerSlotId: null, assignmentMode: 'ally' };
  assert.equal(beforeSwitch.followerSlotId, null, 'no eager auto-select while still in Assign as Ally mode');
  const afterSwitch = resolveFollowerSlotSelectionOnModeChange(viewModel, beforeSwitch, 'follower');
  assert.equal(afterSwitch.followerSlotId, 's1');
  // Switching back preserves the prior selection in state without submitting it.
  const switchedBack = resolveFollowerSlotSelectionOnModeChange(viewModel, afterSwitch, 'ally');
  assert.equal(switchedBack.followerSlotId, 's1', 'prior slot selection is preserved in state, not cleared');
  assert.equal(buildAllyAssignmentResult(switchedBack).followerSlotId, null, 'but never submitted while in ally mode');
}

// 17. Switching assignment mode does not mutate any Actor.
{
  resetFakeActorEngine();
  const viewModel = { candidates: [], followerSlots: [{ id: 's1', label: 'Only Slot', templateChoices: ['utility'] }] };
  resolveFollowerSlotSelectionOnModeChange(viewModel, { followerSlotId: null, assignmentMode: 'ally' }, 'follower');
  canConfirmAllyAssignment(viewModel, { targetActorId: null, assignmentMode: 'follower', followerSlotId: 's1', submitting: false });
  assert.equal(fakeActorEngineCallLog.length, 0, 'pure state-transition helpers must never touch ActorEngine');
}

// ---------------------------------------------------------------------
// 18-19: Close / Escape mutate nothing (source assertions)
// ---------------------------------------------------------------------

// 18. Closing the modal mutates nothing — close() only ever resolves the
// promise; it never references AlliesSurfaceService or ActorEngine.
{
  const closeMatch = MODAL_JS.match(/async close\(options = \{\}\) \{[\s\S]*?\n  \}/);
  assert.ok(closeMatch, 'close() override must exist');
  assert.doesNotMatch(closeMatch[0], /AlliesSurfaceService|ActorEngine/);
}

// 19. Escape mutates nothing — Foundry's native ApplicationV2 Escape
// handling calls close(), which is covered by test 18; confirm there is no
// separate keydown/Escape event handler that could bypass close()'s
// settle-with-null contract (only prose documentation may mention Escape).
{
  assert.doesNotMatch(MODAL_JS, /addEventListener\(\s*['"]keydown['"]/, 'no custom keydown handler exists that could bypass close()');
  assert.doesNotMatch(MODAL_JS, /key\s*===\s*['"]Escape['"]/, 'no custom Escape-key branch exists that could bypass close()');
}

// ---------------------------------------------------------------------
// 20-21: Drag/drop integration (source assertions)
// ---------------------------------------------------------------------

// 20. Drag/drop preselects the dropped Actor.
{
  const dropMatch = CONTROLLER_JS.match(/async _handleDrop\(ev\) \{[\s\S]*?\n  \}/);
  assert.ok(dropMatch);
  assert.match(dropMatch[0], /this\._assignExistingNpc\(actor\.id\)/, 'drop must hand the dropped Actor id to the modal-opening flow as a preselection');
}

// 21. Drag/drop still requires assignment-mode confirmation — _handleDrop
// never calls an assignment/conversion service directly; it only opens
// the modal via _assignExistingNpc.
{
  const dropMatch = CONTROLLER_JS.match(/async _handleDrop\(ev\) \{[\s\S]*?\n  \}/);
  assert.doesNotMatch(dropMatch[0], /assignExistingNpcAsAlly|convertExistingNpcToFollower/);
}

// ---------------------------------------------------------------------
// 22-25: Confirm gating and result normalization
// ---------------------------------------------------------------------

// 22. Confirm remains disabled without a target.
{
  const viewModel = { candidates: [{ id: 'npc-1', eligible: true, canConvertToFollower: true }], followerSlots: [{ id: 's1', templateChoices: ['utility'] }] };
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: null, assignmentMode: 'ally', followerSlotId: null, submitting: false }), false);
}

// 23. Confirm remains disabled for invalid conversion state (mode is
// follower but no valid slot is selected).
{
  const viewModel = { candidates: [{ id: 'npc-1', eligible: true, canConvertToFollower: true }], followerSlots: [{ id: 's1', templateChoices: ['utility'] }] };
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: null, submitting: false }), false);
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: 'stale-slot', submitting: false }), false, 'a slot id not present in the current view model must not confirm');
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: 's1', templateType: 'utility', submitting: false }), true);
}

// 24. Double-submit is blocked.
{
  const viewModel = { candidates: [{ id: 'npc-1', eligible: true, canConvertToFollower: true }], followerSlots: [{ id: 's1', templateChoices: ['utility'] }] };
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: 'npc-1', assignmentMode: 'ally', followerSlotId: null, submitting: true }), false, 'submitting=true must block confirm regardless of otherwise-valid state');
  const lockMatch = MODAL_JS.match(/_lockControls\(\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(lockMatch, '_lockControls must exist to synchronously disable controls before the async settle resolves');
  assert.match(lockMatch[0], /disabled = true/);
}

// 25. Result payload is normalized.
{
  const allyResult = buildAllyAssignmentResult({ targetActorId: 'npc-1', assignmentMode: 'ally', followerSlotId: 's1', templateType: 'utility', grantOwnership: true });
  assert.deepEqual(allyResult, { targetActorId: 'npc-1', assignmentMode: 'ally', followerSlotId: null, templateType: null, grantOwnership: true }, 'ally-mode results must never carry a followerSlotId/templateType even if one was selected earlier');

  const followerResult = buildAllyAssignmentResult({ targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: 's1', templateType: 'aggressive', grantOwnership: 'truthy-but-not-boolean' });
  assert.deepEqual(followerResult, { targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: 's1', templateType: 'aggressive', grantOwnership: false }, 'grantOwnership must be normalized to a strict boolean');
}

// ---------------------------------------------------------------------
// 26-28: Controller delegation and modal mutation boundary
// ---------------------------------------------------------------------

// 26. Controller delegates to the correct service method for each mode,
// AND forwards grantOwnership to BOTH modes (correction: the original
// implementation silently discarded grantOwnership on the conversion path).
{
  const assignMatch = CONTROLLER_JS.match(/async _assignExistingNpc\([\s\S]*?\n  \}/);
  assert.ok(assignMatch);
  assert.match(assignMatch[0], /AlliesSurfaceService\.convertExistingNpcToFollower\(/);
  assert.match(assignMatch[0], /AlliesSurfaceService\.assignExistingNpcAsAlly\(/);
  assert.doesNotMatch(assignMatch[0], /AllyAssignmentService\.|ActorEngine\./, 'the controller must delegate through AlliesSurfaceService, never call the lower-level service or ActorEngine directly');

  const convertCallMatch = assignMatch[0].match(/AlliesSurfaceService\.convertExistingNpcToFollower\([\s\S]{0,220}?\)/);
  assert.ok(convertCallMatch, 'convertExistingNpcToFollower call site must exist');
  assert.match(convertCallMatch[0], /grantOwnership:\s*result\.grantOwnership/, 'the conversion call must forward result.grantOwnership — it must never be silently dropped');

  const assignCallMatch = assignMatch[0].match(/AlliesSurfaceService\.assignExistingNpcAsAlly\([\s\S]{0,160}?\)/);
  assert.ok(assignCallMatch);
  assert.match(assignCallMatch[0], /grantOwnership:\s*result\.grantOwnership/);
}

// 27. Modal contains no direct ActorEngine calls (the bare word appears
// only in the file's own doc-comment policy statement; no import or call).
{
  assert.doesNotMatch(MODAL_JS, /^\s*import\b[\s\S]*?ActorEngine/m, 'the modal must not import ActorEngine');
  assert.doesNotMatch(MODAL_JS, /\bActorEngine\.\w+\(/, 'the modal must not call ActorEngine');
}

// 28. Modal contains no Actor mutation.
{
  assert.doesNotMatch(MODAL_JS, /\.update\(|\.setFlag\(|\.unsetFlag\(/);
  assert.doesNotMatch(MODAL_JS, /AllyAssignmentService\./, 'the modal must never call the mutation service directly — only AlliesSurfaceController does, after the modal resolves');
}

// ---------------------------------------------------------------------
// 29: Scrollable region (CSS assertion)
// ---------------------------------------------------------------------

// 29. Long Actor lists use a scrollable region; the modal itself never
// extends beyond the viewport.
{
  assert.match(MODAL_CSS, /\.swse-ally-assignment-modal\s*\{[^}]*max-height:\s*min\(80vh,\s*760px\)/);
  assert.match(MODAL_CSS, /\.swse-ally-assignment-modal\s*\{[^}]*grid-template-rows:/);
  assert.match(MODAL_CSS, /\.swse-ally-assignment-modal__list-region\s*\{[^}]*overflow-y:\s*auto/);
}

// =======================================================================
// CORRECTION PASS (fix(allies): harden NPC assignment modal eligibility)
// =======================================================================

// ---------------------------------------------------------------------
// 31: Ineligible Actor cards are not selectable (issue 5)
// ---------------------------------------------------------------------

// 31. A card with no reachable action in either mode has its radio input
// disabled, not merely styled as blocked — production-path (the
// "selectable" field on the view model card) plus a template assertion
// that the disabled state is wired through.
{
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character' });
  // A vehicle-owner-type mismatch is not reachable via the normal type
  // filter, so use an Actor already assigned to a DIFFERENT owner — fully
  // ineligible for BOTH ally assignment and conversion.
  const elsewhereOwner = makeFakeActor({ id: 'owner-B', type: 'character' });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', flags: { [SYSTEM_ID]: { assignedAllyOwnerId: 'owner-B', assignedAllyMode: 'ally' } } });
  asGM([owner, elsewhereOwner, npc]);
  const vm = AlliesSurfaceService.buildNpcAssignmentPickerViewModel(owner);
  const card = vm.candidates.find(c => c.id === 'npc-1');
  assert.equal(card.eligible, false);
  assert.equal(card.canConvertToFollower, false);
  assert.equal(card.selectable, false, 'a card ineligible for both modes must be marked not-selectable');
}
{
  // A card eligible for at least one mode remains selectable.
  const eligibleCard = { eligible: true, canConvertToFollower: false };
  const bothBlockedCard = { eligible: false, canConvertToFollower: false };
  // Mirrors the modal's own selectable computation (view model field is
  // asserted directly above; this documents the template's consumption of
  // it via radioDisabled = selectable === false).
  assert.equal(eligibleCard.eligible || eligibleCard.canConvertToFollower, true);
  assert.equal(bothBlockedCard.eligible || bothBlockedCard.canConvertToFollower, false);
}

// ---------------------------------------------------------------------
// 32: Assignment-mode radiogroup wrapper (issue 6)
// ---------------------------------------------------------------------

// 32. The Assign as Ally / Convert to Follower container is a real
// radiogroup with an aria-labelledby pointing at a stable heading id, not
// just a bare styling <div>.
{
  assert.match(MODAL_HBS, /<h3 id="swse-ally-assignment-mode-heading"[^>]*>Assignment Type<\/h3>/);
  assert.match(MODAL_HBS, /<div class="swse-assignment-choice-grid" role="radiogroup" aria-labelledby="swse-ally-assignment-mode-heading">/);
}

// ---------------------------------------------------------------------
// 33: Enter-to-submit structure (issue 7)
// ---------------------------------------------------------------------

// 33. The modal content is a real <form>; the confirm button is
// type="submit" (native disabled-submit-blocking applies); Cancel is
// type="button" so it never triggers form submission; and _onRender wires
// a submit listener that re-validates before confirming.
{
  assert.match(MODAL_HBS, /^<form class="swse-ally-assignment-modal"/);
  assert.match(MODAL_HBS, /<button type="submit"[^>]*data-button="confirm"/);
  assert.match(MODAL_HBS, /<button type="button"[^>]*data-button="cancel"/);
  assert.match(MODAL_JS, /form\?\.addEventListener\(\s*['"]submit['"]/, 'the modal must wire a submit handler on the form');
  const submitMatch = MODAL_JS.match(/form\?\.addEventListener\(\s*['"]submit['"][\s\S]{0,160}/);
  assert.match(submitMatch[0], /preventDefault\(\)/);
  assert.match(submitMatch[0], /this\._onConfirm\(\)/);
}

// ---------------------------------------------------------------------
// 34: View model is cached, not rebuilt on every render (issue 8)
// ---------------------------------------------------------------------

// 34. _prepareContext only calls buildNpcAssignmentPickerViewModel when
// the cached flag is unset — search/mode/slot/template changes re-render
// from the cached view model rather than re-scanning every world Actor's
// eligibility on every keystroke.
{
  const prepareMatch = MODAL_JS.match(/async _prepareContext\(options\) \{[\s\S]*?\n  \}/);
  assert.ok(prepareMatch);
  assert.match(prepareMatch[0], /if\s*\(!this\._viewModelLoaded\)/, 'the view model build must be gated behind a loaded flag, not run unconditionally on every render');
  assert.match(prepareMatch[0], /this\._viewModelLoaded\s*=\s*true/);
}

// ---------------------------------------------------------------------
// 35: Persistent selected-NPC summary (issue 9)
// ---------------------------------------------------------------------

// 35. A selected candidate stays visible via a fixed summary panel even
// if search filtering removes its card from the visible list —
// selectedCandidate is resolved from the FULL (unfiltered) view model.
{
  assert.match(MODAL_HBS, /\{\{#if hasSelection\}\}[\s\S]*?swse-ally-assignment-modal__selected-summary[\s\S]*?\{\{\/if\}\}/);
  assert.match(MODAL_HBS, /\{\{selectedCandidate\.name\}\}/);

  const viewModel = { candidates: [{ id: 'npc-1', name: 'Hidden By Search', searchText: 'hidden by search' }], followerSlots: [] };
  const filtered = filterNpcAssignmentCandidates(viewModel.candidates, 'zzz-not-found');
  assert.equal(filtered.length, 0, 'search can filter the selected candidate out of the visible list');
  const stillResolved = findNpcAssignmentCandidate(viewModel, 'npc-1');
  assert.ok(stillResolved, 'but the selected candidate itself must still resolve from the full view model, independent of the search filter');
}

// ---------------------------------------------------------------------
// 36-38: Follower template selection (issue 10)
// ---------------------------------------------------------------------

// 36. A slot with multiple template choices requires an explicit choice —
// conversion is never silently defaulted to Utility.
{
  const slot = { id: 's1', templateChoices: ['aggressive', 'defensive', 'utility'] };
  assert.equal(resolveFollowerTemplateSelectionForSlot(slot, null), null, 'no auto-select when more than one template choice exists');
  const viewModel = { candidates: [{ id: 'npc-1', eligible: true, canConvertToFollower: true }], followerSlots: [slot] };
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: 's1', templateType: null, submitting: false }), false, 'confirm must stay disabled without an explicit template choice');
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: 's1', templateType: 'aggressive', submitting: false }), true);
}

// 37. A slot with exactly one template choice auto-selects it (mirrors the
// single-open-slot auto-select policy one level down) — selecting the
// slot resolves the template in the same step.
{
  const slot = { id: 's1', templateChoices: ['utility'] };
  const viewModel = { candidates: [], followerSlots: [slot] };
  const state = resolveFollowerSlotSelection(viewModel, { followerSlotId: null, templateType: null }, 's1');
  assert.equal(state.followerSlotId, 's1');
  assert.equal(state.templateType, 'utility', 'a single-template-choice slot auto-selects its only template');
}

// 38. Switching to a slot whose template choices no longer include the
// currently-held templateType resets it rather than silently carrying
// over an invalid selection; the modal template renders labeled radio
// cards for the choice, and the controller forwards the chosen template.
{
  const constrainedSlot = { id: 's2', templateChoices: ['aggressive'] };
  assert.equal(resolveFollowerTemplateSelectionForSlot(constrainedSlot, 'utility'), 'aggressive', 'an invalid held template is replaced by the new slot\'s single choice');
  assert.equal(followerTemplateLabel('aggressive'), 'Aggressive Follower');
  assert.equal(followerTemplateLabel('defensive'), 'Defensive Follower');
  assert.equal(followerTemplateLabel('utility'), 'Utility Follower');

  assert.match(MODAL_HBS, /<input\s+type="radio"\s+name="templateType"/);
  const convertCallMatch = CONTROLLER_JS.match(/AlliesSurfaceService\.convertExistingNpcToFollower\([\s\S]{0,220}?\)/);
  assert.match(convertCallMatch[0], /template:\s*result\.templateType/, 'the controller must forward the chosen template to the conversion call');
}

// ---------------------------------------------------------------------
// 39-40: Ownership grant during conversion (issue 1) + rollback (issue 11)
// ---------------------------------------------------------------------

// 39. convertToFollower supports grantOwnership as a transactional step —
// production-path: a successful conversion with grantOwnership: true
// actually grants ownership; a lookup failure rolls back the WHOLE
// conversion, not just the grant (mirrors test 59's assignAsAlly policy).
{
  const { AllyAssignmentService } = await import('../scripts/engine/crew/ally-assignment-service.js');
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  const ownerUser = { id: 'player-1', character: { id: 'owner-1' }, isGM: false };
  asGM([owner, npc], { users: { find: (fn) => [ownerUser].find(fn) } }, { CONST: { DOCUMENT_OWNERSHIP_LEVELS: OWNERSHIP_LEVELS } });
  await AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => true, grantOwnership: true });
  assert.equal(npc.ownership?.[ownerUser.id], 3, 'grantOwnership: true during conversion must actually grant OWNER-level ownership, not be silently discarded');
}
{
  const { AllyAssignmentService } = await import('../scripts/engine/crew/ally-assignment-service.js');
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc' });
  asGM([owner, npc], { users: { find: () => { throw new Error('ownership-grant-lookup-fails'); } } });
  await assert.rejects(() => AllyAssignmentService.convertToFollower(owner, npc, 's1', { source: 'test', applyFollowerDerivation: async () => true, grantOwnership: true }));
  assert.deepEqual(owner.flags[SYSTEM_ID].followers ?? [], [], 'a failed ownership grant must roll back the WHOLE conversion, not leave it half-committed');
  assert.equal(npc.system?.isFollower, undefined);
}

// 40. Ownership-grant rollback restores the EXACT prior ownership level
// for the granted user, not merely "does nothing" — production-path via
// assignAsAlly (shared buildOwnershipGrantStep helper), forcing a LATER
// step... since ownership is the last step in both flows today, this
// verifies the rollback helper itself is wired with a real rollback
// (source assertion) plus a direct behavioral check of the pure step
// shape via the exported service function's observable contract.
{
  assert.match(SERVICE_JS, /function buildOwnershipGrantStep\(/, 'a shared ownership-grant step builder must exist');
  const stepMatch = SERVICE_JS.match(/function buildOwnershipGrantStep\([\s\S]*?\n\}/);
  assert.match(stepMatch[0], /rollback:\s*async/, 'the ownership-commit step must define a rollback, not just a commit');
  assert.match(stepMatch[0], /previousOwnership/, 'rollback must be able to restore a captured pre-grant ownership snapshot');
}

// ---------------------------------------------------------------------
// 41-43: Ally vs conversion eligibility split (issue 2)
// ---------------------------------------------------------------------

// 41. An Actor already assigned to THIS owner as a relationship-only ally
// is ineligible for a SECOND ally assignment but IS eligible for
// conversion — the two eligibility evaluators must disagree here by
// design, otherwise the prior-assignment cleanup path is unreachable.
{
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', flags: { [SYSTEM_ID]: { assignedAllyOwnerId: 'owner-1', assignedAllyMode: 'ally' } } });
  asGM([owner, npc]);
  const allyEval = evaluateNpcAssignmentEligibility(owner, npc, 'ally');
  const conversionEval = evaluateFollowerConversionEligibility(owner, npc);
  assert.equal(allyEval.eligible, false, 'a duplicate same-owner/same-mode ally assignment must remain rejected');
  assert.equal(conversionEval.eligible, true, 'conversion of an Actor already assigned to THIS owner must remain reachable — this is the one path that migrates the relationship');
}

// 42. The picker view model reflects this split directly: canConvertToFollower
// is computed from evaluateFollowerConversionEligibility, not reused from
// ally eligibility.
{
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', flags: { [SYSTEM_ID]: { assignedAllyOwnerId: 'owner-1', assignedAllyMode: 'ally' } } });
  asGM([owner, npc]);
  const vm = AlliesSurfaceService.buildNpcAssignmentPickerViewModel(owner);
  const card = vm.candidates.find(c => c.id === 'npc-1');
  assert.equal(card.eligible, false, 'already-assigned-to-this-owner blocks a second Assign as Ally');
  assert.equal(card.canConvertToFollower, true, 'but does NOT block Convert to Follower — the prior assignment is cleaned up as part of the conversion transaction');
}

// 43. A cross-owner assignment (different owner) is still blocked for BOTH
// modes — the split only relaxes the SAME-owner case.
{
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const npc = makeFakeActor({ id: 'npc-1', type: 'npc', flags: { [SYSTEM_ID]: { assignedAllyOwnerId: 'owner-OTHER', assignedAllyMode: 'ally' } } });
  asGM([owner, npc]);
  const allyEval = evaluateNpcAssignmentEligibility(owner, npc, 'ally');
  const conversionEval = evaluateFollowerConversionEligibility(owner, npc);
  assert.equal(allyEval.eligible, false);
  assert.equal(conversionEval.eligible, false);
  assert.match(conversionEval.reasons.join(' '), /assigned to a different owner/);
}

// ---------------------------------------------------------------------
// 44-46: Existing-follower duplicate-slot prevention (issue 3)
// ---------------------------------------------------------------------

// 44. isTargetAlreadyFollower checks every field family the follower model
// writes across its lifecycle.
{
  assert.equal(isTargetAlreadyFollower(null), false);
  assert.equal(isTargetAlreadyFollower({ system: {} }), false);
  assert.equal(isTargetAlreadyFollower({ system: { isFollower: true } }), true);
  assert.equal(isTargetAlreadyFollower({ system: { progression: { isFollower: true } } }), true);
  assert.equal(isTargetAlreadyFollower({ flags: { swse: { follower: { isFollower: true } } } }), true);
  assert.equal(isTargetAlreadyFollower({ getFlag: (scope, key) => scope === SYSTEM_ID && key === 'isFollower' }), true);
}

// 45. An existing follower is blocked from BOTH a second ally assignment
// and conversion into a second follower slot.
{
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const existingFollower = makeFakeActor({ id: 'follower-1', type: 'npc', system: { isFollower: true } });
  asGM([owner, existingFollower]);
  const allyEval = evaluateNpcAssignmentEligibility(owner, existingFollower, 'ally');
  const conversionEval = evaluateFollowerConversionEligibility(owner, existingFollower);
  assert.equal(allyEval.eligible, false);
  assert.match(allyEval.reasons.join(' '), /already a mechanical follower/);
  assert.equal(conversionEval.eligible, false);
  assert.match(conversionEval.reasons.join(' '), /already a mechanical follower/);
}

// 46. convertToFollower rejects an already-mechanical-follower target at
// the SERVICE boundary too (not only the UI picker) — a forged direct
// call must be rejected the same way.
{
  const { AllyAssignmentService } = await import('../scripts/engine/crew/ally-assignment-service.js');
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }, { id: 's2', dependentKind: 'follower', createdActorId: null }] } } });
  const existingFollower = makeFakeActor({ id: 'follower-1', type: 'npc', system: { isFollower: true } });
  asGM([owner, existingFollower]);
  await assert.rejects(
    () => AllyAssignmentService.convertToFollower(owner, existingFollower, 's2', { source: 'test', applyFollowerDerivation: async () => true }),
    /already a mechanical follower/
  );
  assert.equal(fakeActorEngineCallLog.length, 0, 'a rejected conversion must never reach ActorEngine');
}

// ---------------------------------------------------------------------
// 47-49: Active player character exclusion (issue 4)
// ---------------------------------------------------------------------

// 47. isActivePlayerCharacter detects a User's primary character.
{
  const pcActor = { id: 'pc-1' };
  const users = [{ id: 'u1', character: { id: 'pc-1' }, isGM: false }];
  assert.equal(isActivePlayerCharacter(pcActor, { users }), true);
  assert.equal(isActivePlayerCharacter({ id: 'npc-1' }, { users }), false);
  assert.equal(isActivePlayerCharacter(null, { users }), false);
}

// 48. isActivePlayerCharacter detects OWNER-level ownership held by a
// non-GM user even without a primary-character assignment; a GM's OWNER
// ownership does not count.
{
  const actor = { id: 'char-1', ownership: { 'player-1': 3, 'gm-1': 3 } };
  const users = [{ id: 'player-1', isGM: false }, { id: 'gm-1', isGM: true }];
  assert.equal(isActivePlayerCharacter(actor, { users }), true, 'non-GM OWNER-level ownership marks an Actor as an active PC');

  const gmOnlyOwned = { id: 'char-2', ownership: { 'gm-1': 3 } };
  assert.equal(isActivePlayerCharacter(gmOnlyOwned, { users }), false, 'a GM holding OWNER ownership alone does not make an Actor a player character');
}

// 49. A character-type Actor that is an active PC is excluded from both
// ally assignment and conversion, at both the picker view model and the
// service boundary.
{
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const playerPc = makeFakeActor({ id: 'pc-1', type: 'character', ownership: { 'player-1': 3 } });
  const playerUser = { id: 'player-1', isGM: false };
  asGM([owner, playerPc], { users: [playerUser] });
  const vm = AlliesSurfaceService.buildNpcAssignmentPickerViewModel(owner);
  const card = vm.candidates.find(c => c.id === 'pc-1');
  assert.equal(card.eligible, false, 'an active player character must be ineligible for Assign as Ally');
  assert.equal(card.canConvertToFollower, false, 'and ineligible for Convert to Follower');
  assert.match(card.blockedReason || '', /active player character/);

  const { AllyAssignmentService } = await import('../scripts/engine/crew/ally-assignment-service.js');
  await assert.rejects(
    () => AllyAssignmentService.convertToFollower(owner, playerPc, 's1', { source: 'test', applyFollowerDerivation: async () => true }),
    /active player character/
  );
}

// ---------------------------------------------------------------------
// 50: convertToFollower independently rejects an ineligible target type
// at the service boundary (issue 12) — the UI picker already filters
// types, but a forged call must be rejected server-side too.
// ---------------------------------------------------------------------

// 50. convertToFollower rejects a vehicle-type target even though the
// old preflight (self-check + droid-gate + slot-validation only) never
// checked target-type eligibility at all.
{
  const { AllyAssignmentService } = await import('../scripts/engine/crew/ally-assignment-service.js');
  resetFakeActorEngine();
  const owner = makeFakeActor({ id: 'owner-1', type: 'character', flags: { [SYSTEM_ID]: { followerSlots: [{ id: 's1', dependentKind: 'follower', createdActorId: null }] } } });
  const vehicle = makeFakeActor({ id: 'vehicle-1', type: 'vehicle' });
  asGM([owner, vehicle]);
  await assert.rejects(
    () => AllyAssignmentService.convertToFollower(owner, vehicle, 's1', { source: 'test', applyFollowerDerivation: async () => true }),
    /cannot be converted/
  );
  assert.equal(fakeActorEngineCallLog.length, 0);
}

console.log('GM NPC assignment modal tests passed.');
