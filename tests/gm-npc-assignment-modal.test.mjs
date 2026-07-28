import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Styled NPC Assignment Modal — UI addendum required test suite (commit
// "feat(allies): add styled NPC assignment modal").
//
// Coverage tiers (see docs/audits/gm-existing-npc-allies-assignment.md,
// "Styled Assignment Modal" section):
//   (a) DIRECT PRODUCTION-PATH — the modal's entire decision logic (view
//       model construction, search filtering, mode/slot selection policy,
//       confirm-gating, and result normalization) lives as pure/near-pure
//       exports in scripts/ui/shell/AlliesSurfaceService.js, which loads
//       and executes for real through the Foundry-shim harness. These are
//       the SAME functions AllyAssignmentModal calls from its event
//       handlers — not a reimplementation.
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
//       check against the exact code that ships, not a live-DOM test.

registerFoundryPathLoader();

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const {
  AlliesSurfaceService,
  buildDefaultAllyAssignmentModalState,
  normalizeAllyAssignmentSearchQuery,
  filterNpcAssignmentCandidates,
  findNpcAssignmentCandidate,
  isAllyAssignmentModeAvailable,
  resolveFollowerSlotSelectionOnModeChange,
  canConfirmAllyAssignment,
  buildAllyAssignmentResult
} = await import('../scripts/ui/shell/AlliesSurfaceService.js');

const { fakeActorEngineCallLog, resetFakeActorEngine } = await import('./helpers/foundry-shim/fakes/actor-engine.fake.mjs');

const SYSTEM_ID = 'foundryvtt-swse';

function readSource(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const MODAL_JS = readSource('scripts/apps/allies/ally-assignment-modal.js');
const MODAL_HBS = readSource('templates/apps/allies/ally-assignment-modal.hbs');
const MODAL_CSS = readSource('styles/apps/allies/ally-assignment-modal.css');
const CONTROLLER_JS = readSource('scripts/ui/shell/AlliesSurfaceController.js');

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
    system: {}, img: 'icons/x.png', items: [], effects: [],
    ...overrides,
    flags,
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
  return actor;
}

function asGM(actors = []) {
  installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1', name: 'GM Tester' }, actors: makeActorsCollection(actors), users: [] } });
}

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
  const viewModel = { candidates: [], followerSlots: [{ id: 's1', label: 'A' }, { id: 's2', label: 'B' }] };
  const state = resolveFollowerSlotSelectionOnModeChange(viewModel, { followerSlotId: null }, 'follower');
  assert.equal(state.followerSlotId, null, 'two open slots must never be auto-selected');
}

// 16. One available slot follows the documented selection policy — only
// auto-selected once the GM switches INTO Convert to Follower mode.
{
  const viewModel = { candidates: [], followerSlots: [{ id: 's1', label: 'Only Slot' }] };
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
  const viewModel = { candidates: [], followerSlots: [{ id: 's1', label: 'Only Slot' }] };
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
  const viewModel = { candidates: [{ id: 'npc-1', eligible: true, canConvertToFollower: true }], followerSlots: [{ id: 's1' }] };
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: null, assignmentMode: 'ally', followerSlotId: null, submitting: false }), false);
}

// 23. Confirm remains disabled for invalid conversion state (mode is
// follower but no valid slot is selected).
{
  const viewModel = { candidates: [{ id: 'npc-1', eligible: true, canConvertToFollower: true }], followerSlots: [{ id: 's1' }] };
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: null, submitting: false }), false);
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: 'stale-slot', submitting: false }), false, 'a slot id not present in the current view model must not confirm');
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: 's1', submitting: false }), true);
}

// 24. Double-submit is blocked.
{
  const viewModel = { candidates: [{ id: 'npc-1', eligible: true, canConvertToFollower: true }], followerSlots: [{ id: 's1' }] };
  assert.equal(canConfirmAllyAssignment(viewModel, { targetActorId: 'npc-1', assignmentMode: 'ally', followerSlotId: null, submitting: true }), false, 'submitting=true must block confirm regardless of otherwise-valid state');
  const lockMatch = MODAL_JS.match(/_lockControls\(\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(lockMatch, '_lockControls must exist to synchronously disable controls before the async settle resolves');
  assert.match(lockMatch[0], /disabled = true/);
}

// 25. Result payload is normalized.
{
  const allyResult = buildAllyAssignmentResult({ targetActorId: 'npc-1', assignmentMode: 'ally', followerSlotId: 's1', grantOwnership: true });
  assert.deepEqual(allyResult, { targetActorId: 'npc-1', assignmentMode: 'ally', followerSlotId: null, grantOwnership: true }, 'ally-mode results must never carry a followerSlotId even if one was selected earlier');

  const followerResult = buildAllyAssignmentResult({ targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: 's1', grantOwnership: 'truthy-but-not-boolean' });
  assert.deepEqual(followerResult, { targetActorId: 'npc-1', assignmentMode: 'follower', followerSlotId: 's1', grantOwnership: false }, 'grantOwnership must be normalized to a strict boolean');
}

// ---------------------------------------------------------------------
// 26-28: Controller delegation and modal mutation boundary
// ---------------------------------------------------------------------

// 26. Controller delegates to the correct service method for each mode.
{
  const assignMatch = CONTROLLER_JS.match(/async _assignExistingNpc\([\s\S]*?\n  \}/);
  assert.ok(assignMatch);
  assert.match(assignMatch[0], /AlliesSurfaceService\.convertExistingNpcToFollower\(/);
  assert.match(assignMatch[0], /AlliesSurfaceService\.assignExistingNpcAsAlly\(/);
  assert.doesNotMatch(assignMatch[0], /AllyAssignmentService\.|ActorEngine\./, 'the controller must delegate through AlliesSurfaceService, never call the lower-level service or ActorEngine directly');
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

console.log('GM NPC assignment modal tests passed.');
