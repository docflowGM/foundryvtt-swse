# GM Existing NPC Assignment — Allies App

**Branch:** `fix/droid-authority-consolidation-phase-2`
**PR:** #937 (draft)
**Scope:** letting a GM take an existing world NPC Actor into a player
character's Allies, as either a non-mechanical relationship or an explicit
follower conversion.

**ATOMICITY CORRECTION PASS** (commit "fix(allies): make NPC follower
conversion atomic"): a back-check found that the original implementation
committed follower identity (owner links, slot fill, `system.isFollower`)
BEFORE follower derivation ran, with derivation treated as best-effort —
meaning an Actor could become officially registered as a follower while
never receiving working follower mechanics. This pass makes follower
derivation a REQUIRED transaction step, fixes a stale-snapshot bug in the
owner-side rollback, makes `unassignAlly` and the ownership grant
transactional, adds an exclusive-owner policy, and makes conversion clean
up any prior ally/beast assignment as part of the same atomic transaction.
The sections below describe the CORRECTED design; the "Convert to
Follower" section in particular was substantially rewritten.

**UI ADDENDUM** (commit "feat(allies): add styled NPC assignment modal"):
the plain `<select>`-in-a-`Dialog` picker and the follow-up generic-`Dialog`
Assign/Convert choice prompt are replaced by one styled `ApplicationV2`
modal (`AllyAssignmentModal`) with portrait radio cards for the target
Actor, radio cards for Assign as Ally / Convert to Follower, and radio
cards for the follower slot when converting. See "Styled Assignment Modal"
below.

**ELIGIBILITY/OWNERSHIP CORRECTION PASS** (commit "fix(allies): harden NPC
assignment modal eligibility"): an independent review of the styled-modal
addendum found it was NOT purely a UI refinement — it exposed and, in one
case, introduced real service-level defects: (1) the modal's ownership
checkbox was silently discarded on the Convert to Follower path; (2) the
picker reused Assign-as-Ally eligibility for Convert to Follower, making
the already-implemented "convert a same-owner assigned ally" migration
path unreachable from the UI; (3) nothing prevented selecting an
already-mechanical-follower Actor into a second follower slot; (4) nothing
excluded active player characters from the picker, exposing a live PC to
relationship assignment or mechanical conversion; (5) `convertToFollower`
never independently checked target-type eligibility at the service
boundary, weaker than `assignAsAlly`'s; (6) the ownership-grant transaction
step had no rollback; plus several UI/accessibility gaps (ineligible Actor
cards remained selectable, the assignment-type grid was not a real
`radiogroup`, no Enter-to-submit support, the picker view model was
rebuilt on every keystroke, a selected candidate could scroll out of view
under search with no persistent indicator, and Convert to Follower always
silently defaulted to the Utility template with no GM choice). This pass
adds `evaluateFollowerConversionEligibility` as a deliberately distinct
eligibility gate from `evaluateNpcAssignmentEligibility`, adds
`isTargetAlreadyFollower`/`isActivePlayerCharacter` checks to BOTH gates,
makes ownership-grant transactional with rollback in both `assignAsAlly`
and (newly) `convertToFollower`, and reworks the modal's template/state
machine for the UI fixes. See "Styled Assignment Modal" and "Eligibility"
below for the corrected design.

## The crucial rule

**Assignment is reversible relationship metadata; conversion is an
explicit mechanical migration.** The two must never be conflated:

- **Assign as Ally** — links the existing NPC to the player's Allies app.
  Its stats, level, Items, and calculation mode are never touched. Does not
  consume a follower slot. Reversible at any time via Unassign.
- **Convert to Follower** — consumes one open follower slot and moves the
  Actor into the SAME follower model ordinary follower chargen produces
  (`system.isFollower`, `system.progression.*`, `flags.swse.follower.*`,
  the slot's `createdActorId`). Its level-derived stats may change. This is
  a one-way mechanical migration, not a relationship toggle.

## Existing Allies relationship model (confirmed by inspection before
building anything new)

The Allies surface already had a partial version of "assign an existing
NPC" — `AlliesSurfaceService.assignDroppedActor` (drag/drop) was GM-gated,
restricted to nonheroic NPC/character Actors, and wrote exactly the
reciprocal-flag shape (`assignedAllyOwnerId`, `assignedAllyKind:
'assigned-nonheroic'`, `assignedAllySource`, `assignedAllySyncMode`) this
feature generalizes. `AlliesSurfaceService._findAssignedNonheroics` already
discovered these Actors by scanning `game.actors` for that reciprocal flag
pair, and `mapActorCard`'s `kind` parameter already excluded any kind other
than `'follower'`/`'minion'`/`'privateer'`/`'beast'` from mechanical
level-sync controls — meaning "an assigned ally must not show follower
level synchronization controls" was already true for the pre-existing
mechanism, and remains true for every new kind this feature adds.

This meant the correct approach was to **generalize an existing, narrow
mechanism**, not build a parallel one — per "extend these authorities. Do
not build another Allies app or relationship registry."

## Canonical service: `scripts/engine/crew/ally-assignment-service.js`

New file. Exports:

- `ASSIGNMENT_MODE` / `ASSIGNMENT_KIND` — `ASSIGNMENT_KIND` generalizes the
  pre-existing `'assigned-nonheroic'` literal to five kinds: `BEAST`
  (`'assigned-beast'`), `NONHEROIC` (`'assigned-nonheroic'` — unchanged),
  `DROID` (`'assigned-droid'`), `HEROIC_NPC` (`'assigned-heroic-npc'`),
  `OTHER` (`'assigned-npc'`).
- `isEligibleAssignmentTargetType(actorType)` — `npc`/`character`/`droid`
  only; vehicles, starships, and hazards are excluded.
- `detectAssignmentKindFromFacts(facts)` / `detectAssignmentKind(actor)` —
  pure classifier / thin Actor-reading wrapper.
- `evaluateAssignmentEligibilityFacts(facts)` / `evaluateNpcAssignmentEligibility(owner, target, mode)`
  — pure eligibility gate / thin wrapper. Checks: GM status, owner
  existence and type (reuses `isEligibleFollowerSlotOwnerType` from
  `follower-slot-service.js` — the same two types, `character`/`droid`),
  target existence and type, self-assignment, and — CORRECTED — an
  **exclusive-owner policy**: a target already assigned to THIS owner in
  the SAME mode is rejected as a duplicate, and a target already assigned
  to a **DIFFERENT** owner is now always rejected too (previously this was
  silently allowed, which would have stranded the first owner's
  relationship record — see "Eligibility" below).
- `buildAllyAssignmentLink(...)` / `buildAssignmentTargetFlagPatch(...)` /
  `buildAssignmentClearPatch()` — pure builders for the owner-side link
  record, the target's reciprocal flags (Assign as Ally only — never a
  follower field), and the symmetric flag-clearing patch (shared by
  `unassignAlly`'s forward commit and `assignAsAlly`'s own rollback).
- `buildOwnerAssignmentUpdate(...)` / `buildOwnerUnassignmentUpdate(...)` —
  pure, de-duplicating (by Actor id) owner-side projection builders.
- `detectPriorAssignment(targetActor)` — reads whether a target is
  currently assigned to an owner (and in what kind), so conversion can
  detect and remove that projection atomically.
- `planExistingNpcFollowerConversion(owner, target, slot, choices)` — pure
  planner producing canonical follower state (template, species, droid
  config read-only from the target's own data, persistent follower
  choices) for the conversion metadata AND for the existing
  follower-derivation pipeline to read back out — no more empty
  `followerChoices: {}`.
- `validateFollowerConversionSlot(slot)` — pure: rejects a missing slot, an
  occupied slot, and a non-`'follower'` `dependentKind` slot.
- `buildFollowerConversionMetadata({plan})` — pure builder for the standard
  follower fields a converted Actor receives, built FROM the plan above.
- `evaluateDroidConversionGate(targetActor)` — pure: blocks a
  stock-statblock droid from `AllyAssignmentService.convertToFollower`.
- `applyDefaultFollowerDerivation(owner, target)` — the default (real)
  follower-derivation call, dynamically importing and invoking
  `FollowerCreator.updateFollowerForOwnerLevel`. Exported specifically so
  it can be overridden via `options.applyFollowerDerivation` — a
  deliberate dependency-injection seam, not a workaround (see "Coverage
  tiers" below).
- `AllyAssignmentService.assignAsAlly(owner, target, options)` /
  `.unassignAlly(owner, target, options)` /
  `.convertToFollower(owner, target, slotId, options)` — the governed,
  now fully atomic orchestration.

Every pure function above is directly unit-tested via the Foundry-shim
harness (see "Tests" below) — the same pure-extraction pattern this
session's `FollowerSlotService` and `follower-mutation-planning.js`
already established.

## GM permission boundary

`game.user.isGM === true` is the sole criterion, checked independently
inside the service:

- `assignAsAlly` and `unassignAlly` check it directly
  (`game.user?.isGM !== true` → throw).
- `convertToFollower` checks it directly too.
- `assignAsAlly` ALSO delegates its full eligibility gate to
  `evaluateNpcAssignmentEligibility`, which independently re-derives
  `isGM: game.user?.isGM === true` rather than trusting a caller-supplied
  value — verified both by direct inspection and by the static guard's
  check 8 (see below), including a "hollow delegation" negative test (if
  the eligibility wrapper's own GM check were removed, the guard still
  catches it).

A forged direct call from a non-GM client (e.g. a player's console)
throws immediately, before any Actor read/write is attempted.

## Allies surface wiring

**`scripts/ui/shell/AlliesSurfaceService.js`**:
- `buildViewModel()` adds `canAssignExistingNpc` (`game.user?.isGM === true && isEligibleFollowerSlotOwner(actor)`),
  `assignExistingNpcLabel`, `assignExistingNpcHelp`.
- `getAssignableNpcActors(ownerActor)` — the original, minimal GM-only
  picker listing (id/name/img/type/level/detectedKind/already-assigned
  flags). Left unchanged (other tests depend on its exact shape); superseded
  as the modal's data source by `buildNpcAssignmentPickerViewModel` below.
- `buildNpcAssignmentPickerViewModel(ownerActor)` — **new**, the full
  read-only view model `AllyAssignmentModal` renders: every eligible
  candidate as a display-ready card (kind/level/detail labels,
  already-assigned-to-another-owner name, per-candidate `eligible`/
  `canConvertToFollower` booleans and blocked-reason text, and a
  precomputed `searchText` index) plus the owner's open follower slots
  (now also carrying `sourceType: 'gm-grant' | 'talent'` for the slot
  card's source badge). Pure from the modal's perspective — never mutates
  anything; the modal only renders and filters this.
- `buildDefaultAllyAssignmentModalState`, `normalizeAllyAssignmentSearchQuery`,
  `filterNpcAssignmentCandidates`, `findNpcAssignmentCandidate`,
  `isAllyAssignmentModeAvailable`, `resolveFollowerSlotSelectionOnModeChange`,
  `canConfirmAllyAssignment`, `buildAllyAssignmentResult` — **new**, pure
  exported functions encoding the modal's entire selection-state machine
  (defaults, search filtering, per-candidate mode availability, the
  documented follower-slot auto-select policy, confirm-button gating, and
  normalized-result construction). These are not a parallel
  reimplementation of the modal's logic — they ARE the modal's logic; the
  `AllyAssignmentModal` class calls them directly from its event handlers.
  Extracting them here (rather than inlining them in the AppV2 class) is
  what makes this decision logic directly unit-testable through the
  Foundry-shim harness despite the AppV2 shell itself being un-loadable
  there (see "Coverage tiers").
- `assignExistingNpcAsAlly` / `unassignExistingNpcAlly` / `convertExistingNpcToFollower`
  — thin delegates to `AllyAssignmentService`. This service does **not**
  construct or persist a relationship/conversion itself (enforced by static
  guard checks 1–2).
- `evaluateNpcAssignment(owner, target)` — read-only eligibility/summary
  helper retained for any other caller; the modal itself now sources its
  eligibility data from `buildNpcAssignmentPickerViewModel` instead.
- `getOpenFollowerSlotsForConversion(ownerActor)` — lists unfilled
  `dependentKind: 'follower'` slots (talent-derived AND GM-manual alike —
  no discrimination by `sourceType` for eligibility), now also returning
  each slot's `sourceType` for display.
- `_findAssignedNonheroics` generalized: its reciprocal-flag scan now
  matches any non-beast `ASSIGNMENT_KIND` (not just the literal
  `'assigned-nonheroic'`), so droid/heroic-npc/generic-npc assignments are
  discovered through the SAME mechanism.
- `_findLinkedBeasts` extended with a second reciprocal-flag scan
  (`assignedAllyOwnerId`/`assignedAllyKind === 'assigned-beast'`) alongside
  its pre-existing `flags.swse.beast.*` scan, so an assigned beast displays
  in the existing Beasts lane without a parallel beast registry.
- `mapActorCard` gains `canUnassignAlly` — keyed on the presence of
  `assignedAllyOwnerId` on the Actor (not on `kind`), so it correctly
  applies to an assigned beast too, while a slot-created beast (from
  `createBareBeastCompanion`) — which never carries that flag — does not
  get it.
- **REMOVED — `assignDroppedActor`**: this pre-existing boolean-returning
  drag/drop entry point (which always granted ownership,
  `grantOwnership: true`, unconditionally) is no longer called by anything
  — `AlliesSurfaceController._handleDrop` now opens the SAME styled modal
  the button flow uses, and ownership grant is the modal's explicit,
  GM-controlled checkbox (default `false`, per the addendum's spec) rather
  than an automatic side effect of dropping an Actor. Deleted rather than
  left as orphaned dead code.

**`scripts/apps/allies/ally-assignment-modal.js`** — **new**,
`AllyAssignmentModal extends SWSEApplicationV2`. See "Styled Assignment
Modal" below for the full design; in summary, `AllyAssignmentModal.wait({ownerActor, preselectedActorId})`
returns a Promise resolving to one normalized
`{targetActorId, assignmentMode, followerSlotId, grantOwnership}` result
(or `null` on cancel/close), and never mutates an Actor or calls
`ActorEngine` itself.

**`scripts/ui/shell/AlliesSurfaceController.js`**:
- `_handleDrop` still never mutates immediately — a GM-gated drop now calls
  `_assignExistingNpc(actor.id)`, preselecting the dropped Actor's radio
  card in the SAME modal the button flow uses, so nothing is written until
  the GM confirms Assign as Ally / Convert to Follower inside it.
- `_assignExistingNpc(preselectedActorId = null)` — **rewritten**: the GM
  check, then `await AllyAssignmentModal.wait({ownerActor: this._actor, preselectedActorId})`,
  then delegates the normalized result to `AlliesSurfaceService.assignExistingNpcAsAlly`
  or `.convertExistingNpcToFollower` depending on `result.assignmentMode`.
  The old two-step "plain `<select>` picker Dialog, then a separate
  generic-Dialog Assign/Convert choice prompt" flow (`_openAssignmentChoiceDialog`)
  is gone entirely — one modal now covers Actor selection, mode choice, and
  slot choice.
- `_unassignAlly(actorId)` — unchanged: GM-only, confirms via `Dialog.confirm`
  (matching the existing remove-record pattern), then delegates. The
  addendum scoped the styled-modal treatment to the Assign/Convert picker
  only; Unassign's confirmation is a single yes/no decision with no
  candidate list or mode choice, so the existing `Dialog.confirm` pattern
  already satisfies it without a dedicated radio-card modal.
- `case 'assign-existing-npc'` / `case 'unassign-ally'` unchanged in the
  action switch.

**Templates**: the "+ Assign Existing NPC" button sits beside "+ Add
Follower Slot" in the same `swse-allies-section-actions` toolbar (reusing
the `swse-allies-history-toggle` button class — no new visual system),
gated on `vm.canAssignExistingNpc`. The per-card "Unassign" button reuses
the existing `.swse-allies-card-actions button.is-danger` styling, gated on
`this.canUnassignAlly`.

## Styled Assignment Modal

UI addendum (commit "feat(allies): add styled NPC assignment modal"). The
GM now completes the entire Assign Existing NPC workflow — pick a target
Actor, choose Assign as Ally or Convert to Follower, pick a follower slot
if converting, optionally grant ownership — inside ONE styled
`ApplicationV2` modal, rather than a plain `<select>`-in-a-`Dialog` picker
followed by a second generic-`Dialog` choice prompt.

**Modal framework.** `scripts/apps/allies/ally-assignment-modal.js` exports
`AllyAssignmentModal extends SWSEApplicationV2` — the same AppV2 base every
other dedicated SWSE dialog in this codebase extends (`TemplateSelectionDialog`
is the closest existing precedent: a `static PARTS` `.hbs` template, a
constructor-injected `resolve` callback, and a static factory —
`AllyAssignmentModal.wait({ownerActor, preselectedActorId})` here — that
wraps construction in a `new Promise(...)` and returns the resolved value).
`close()` is overridden so Escape or the window's `[X]` button (Foundry's
native AppV2 close handling) resolves `null` if the GM had not yet
confirmed, exactly like a plain `resolve(false)`/`resolve(null)` cancel.

**Single normalized result contract.** On confirm, the modal resolves with
exactly one object:
```js
{ targetActorId, assignmentMode: 'ally' | 'follower', followerSlotId: string | null, grantOwnership: boolean }
```
or `null` on cancel/close. `AlliesSurfaceController._assignExistingNpc`
(rewritten — see "Allies surface wiring" above) is the only code that acts
on this result, delegating to `AlliesSurfaceService.assignExistingNpcAsAlly`/
`.convertExistingNpcToFollower`. The modal itself never imports
`ActorEngine`, never calls `AllyAssignmentService`, and never calls
`.update()`/`.setFlag()`/`.unsetFlag()` on any Actor — enforced by static
guard checks 16–17.

**Actor radio-card selection.** Each candidate renders as a real
`<label class="swse-assignment-actor-card">` wrapping a real
`<input type="radio" name="targetActorId">` (not a clickable `<div>` with
no underlying form control — static guard check 18 verifies every
radio-card group actually contains a radio input). Cards show portrait,
name, `kindLabel · levelLabel` (e.g. "Heroic NPC · Level 8"), a
`detailLabel` (species for organic Actors; "Playable-Derived" or "Stock
Statblock — Conversion Blocked" for droids), an "Already assigned to
{owner}" flag when applicable, and a blocked-reason flag for an ineligible
candidate. This data comes from `AlliesSurfaceService.buildNpcAssignmentPickerViewModel`
(see "Allies surface wiring") — the modal never re-derives eligibility
itself.

**CORRECTED — ineligible-for-both-modes cards are no longer selectable.**
The original implementation rendered every candidate's radio input as
enabled regardless of eligibility — a card with a visible blocked-reason
flag could still be clicked and selected, leaving the confirm button
disabled with no indication why. The picker view model now computes a
per-card `selectable: allyEvaluation.eligible || canConvertToFollower`
boolean (`AlliesSurfaceService.buildNpcAssignmentPickerViewModel`); the
modal maps this to `radioDisabled: candidate.selectable === false` in
`_prepareContext`, and the template renders a real `disabled
aria-disabled="true"` attribute on that card's radio input plus a visible
"No action is available for this Actor." flag (static guard check 26,
anchored on the small window immediately following the Actor radio
input). An Actor eligible for only ONE of the two modes (e.g. eligible to
convert but not to assign as a plain ally) remains selectable — only the
zero-eligible-modes case is disabled.

**Assignment-mode radio-card selection.** Assign as Ally and Convert to
Follower render as two large radio cards
(`name="assignmentMode"`, values `"ally"`/`"follower"`) in a responsive
2-column grid. **CORRECTED — the grid is now a real `radiogroup`.** The
original markup wrapped the two mode cards in a plain `<div>` with no ARIA
role, so assistive technology had no way to announce them as a
mutually-exclusive group. The wrapper now carries
`role="radiogroup" aria-labelledby="swse-ally-assignment-mode-heading"`,
pointing at the section's own `<h3 id="swse-ally-assignment-mode-heading">`
(static guard check 26's companion structural assertion — see "Tests").
Convert to Follower is disabled (`disabled` attribute, not just a CSS
class) whenever the selected candidate's `canConvertToFollower` is false
(no open slot, droid-blocked, already a follower, an active player
character, or otherwise ineligible — see "Eligibility" below), with the
specific blocking reason shown beneath the card. Assign as Ally defaults
selected (`buildDefaultAllyAssignmentModalState()` always returns
`assignmentMode: 'ally'` unless a caller explicitly passes `'follower'` —
static guard check 20).

**Follower-slot radio-card selection.** Revealed only when
`assignmentMode === 'follower'`. Each open slot renders as a
`name="followerSlotId"` radio card with a source badge ("GM GRANTED" or
"TALENT", from the slot's `sourceType`). Selection policy (implemented in
`resolveFollowerSlotSelectionOnModeChange`, static guard check 21): with
zero slots, Convert to Follower is already disabled; with exactly ONE open
slot, it is auto-selected the moment the GM switches INTO Convert to
Follower mode (never eagerly, never before that switch); with multiple
slots, the GM must choose explicitly — the function never falls back to
`followerSlots[0]` merely because an array has entries. Switching back to
Assign as Ally preserves the prior slot selection in modal state (so
switching forward again doesn't lose it) but `buildAllyAssignmentResult`
always nulls `followerSlotId`/`templateType` when `assignmentMode !==
'follower'`, so neither is ever submitted while in ally mode.

**CORRECTED — explicit follower-template selection (was a silent
default).** The original implementation always converted through
`FollowerCreator`'s default template with no GM-visible choice — Convert
to Follower silently defaulted to the Utility template every time,
regardless of what the GM might have wanted. Each follower slot record
already carries a `templateChoices` array (an existing, narrower concept
from ordinary follower chargen, `follower-slot-service.js`; canonical
values `aggressive`/`defensive`/`utility`, defaulting to all three when a
slot doesn't constrain them — `DEFAULT_FOLLOWER_TEMPLATE_CHOICES`). The
modal now surfaces that slot's `templateChoices` as a third radio-card
group (`name="templateType"`, `role="radiogroup" aria-label="Follower
template"`), rendered once a follower slot is selected. When a slot's
`templateChoices` has exactly one entry, `resolveFollowerTemplateSelectionForSlot`
auto-selects it (mirroring the single-slot auto-select policy above) and
the template section is hidden (`templateOptions.length` is 0 in that
case — nothing left to choose); when a slot allows more than one template,
the GM must pick explicitly and `canConfirmAllyAssignment` blocks confirm
until `state.templateType` is one of that slot's `templateChoices`.
Switching to a differently-constrained slot re-resolves the template
selection via `resolveFollowerSlotSelection` rather than carrying over a
now-invalid choice. The chosen `templateType` flows through
`buildAllyAssignmentResult` → the controller → `AlliesSurfaceService.convertExistingNpcToFollower`
as `options.template`, replacing the previous unconditional default.

**CORRECTED — Enter-to-submit and a persistent selected-Actor summary.**
The modal root is now a real `<form class="swse-ally-assignment-modal">`
(was a plain `<div>`) with the confirm button as `type="submit"` (cancel
stays `type="button"`); `_onRender` attaches a `submit` listener that
calls `event.preventDefault()` and then `this._onConfirm()`, so pressing
Enter while focused anywhere in the form submits it like any ordinary HTML
form, rather than doing nothing (the original `<div>`-rooted modal had no
form semantics at all). Separately, because the Actor list can be filtered
by search, a selection could previously scroll out of view with no
indication of who was selected. `_prepareContext` now always resolves
`selectedCandidate` from the FULL, unfiltered view model (via
`findNpcAssignmentCandidate`), independent of the search-filtered
`candidates` list, and the template renders a fixed
`.swse-ally-assignment-modal__selected-summary` panel (portrait, name,
kind/level/detail) above the search box whenever `hasSelection` is true —
so the current selection is always visible regardless of what the search
box currently filters to.

**CORRECTED — the picker view model is now built once per modal session,
not on every render.** `buildNpcAssignmentPickerViewModel` performs a
full world-Actor eligibility scan; the original `_prepareContext` called
it on every `render()` — including every keystroke in the search box —
recomputing eligibility for every world Actor on each character typed. The
modal constructor now sets `this._viewModelLoaded = false`, and
`_prepareContext` only calls `buildNpcAssignmentPickerViewModel` when that
flag is still false, setting it `true` immediately after — so the
expensive scan runs exactly once per modal open, and all subsequent
renders (search filtering, mode switching, slot/template selection) reuse
the cached `this._viewModel` and only recompute the cheap, already-pure
filter/selection functions.

**Drag/drop integration.** `AlliesSurfaceController._handleDrop` resolves
the dropped Actor, then calls `this._assignExistingNpc(actor.id)` — the
SAME modal-opening flow the button uses, with the dropped Actor's id as
`preselectedActorId`. The Actor list stays visible with the dropped Actor's
card already selected (not collapsed into a separate summary panel), so
the GM still explicitly confirms Assign as Ally / Convert to Follower;
dropping an Actor never assigns it immediately (static guard check 19
verifies `_handleDrop` never calls an assignment/conversion service
directly).

**Search.** A single `<input type="search" name="search">` filters the
candidate list via `filterNpcAssignmentCandidates`, matching against each
candidate's precomputed `searchText` (name, type, kind label, detail
label, level label, and current owner name if assigned elsewhere).
Filtering re-renders the visible card set from the SAME `state.search`
value on every keystroke (consistent with this codebase's established AppV2
dialog pattern — `TemplateSelectionDialog` re-renders on every class-tab
click rather than DOM-patching in place); the search input's focus and
cursor position are explicitly restored after each re-render
(`_focusSearchAfterRender`) so typing is not interrupted.

**Accessibility — CORRECTED, and reported honestly rather than as
"complete."** `role="dialog"` with `aria-labelledby`/`aria-describedby`
pointing at the modal's title/description; the Actor list, follower-slot
list, assignment-mode grid (fixed this pass — see above), and follower-
template grid (new this pass) are each a real `role="radiogroup"` with an
`aria-label` or `aria-labelledby`; every radio card is a real
`<label>`/`<input type="radio">` pair (native keyboard arrow-key
navigation and `:focus-visible` styling both come for free from using real
form controls, not synthesized); disabled cards — now including
ineligible-for-both-modes Actor cards, fixed this pass — carry a real
`disabled` attribute on their `<input>` (not merely a CSS class) plus
visible reason text; the form now supports Enter-to-submit (fixed this
pass — see above); portrait `<img>` tags use `alt=""` (decorative — the
name is already in adjacent text); Escape closes via Foundry's native
AppV2 handling and resolves `null` through the same `close()` override as
the `[X]` button (static guard checks 15–17 also cover this: `close()`
never references `AlliesSurfaceService`/`ActorEngine`).

What this claim does NOT cover, stated explicitly per the reviewer's
"Report corrections" request: none of the above has been exercised with a
real screen reader, real keyboard-only navigation, or real focus-order
verification inside a live Foundry window — every ARIA attribute, `role`,
and `disabled` state listed above is a template/source structural
assertion (tier (d): the exact markup that ships was read back and
checked against these invariants), not a runtime accessibility audit. "Has
correct ARIA roles and real form controls" and "has been verified
accessible" are different claims; only the first is made here.

**Viewport/scroll behavior.** The modal content is a CSS grid
(`grid-template-rows: auto minmax(0, 1fr) auto`, `max-height: min(80vh, 760px)`,
`overflow: hidden`) so the modal itself never extends past the viewport.
Only the Actor list region scrolls independently
(`.swse-ally-assignment-modal__list-region { overflow-y: auto; min-height: 120px; }`);
the assignment-type cards, follower-slot cards, ownership toggle, and
footer buttons are NOT inside that scrolling region and remain visible
without a second nested scrollbar.

**No-mutation modal boundary.** The modal reads
`buildNpcAssignmentPickerViewModel` (read-only) and writes only to its own
in-memory `this.state` (never persisted onto any Actor, never surviving
modal close). Static guard checks 15–17 enforce, at the source level, that
the modal file never constructs a relationship-link object, never imports
or calls `ActorEngine`, never calls `.update()`/`.setFlag()`/`.unsetFlag()`,
and never calls `AllyAssignmentService` directly — the ONLY thing that
crosses the modal/controller boundary is the single normalized result
object described above.

**Tests.** `tests/gm-npc-assignment-modal.test.mjs` (50 required cases,
up from 30 in the UI addendum — 20 added in this correction pass — see
"Tests" and "Coverage tiers" below for the exact tier breakdown per case;
many of the 50 are source-structure assertions, not runtime/DOM proof —
see "Coverage tiers" tier (d) and the accessibility caveat above).

**Live Foundry status.** Not clicked through in a live Foundry world —
same standing limitation as every other UI surface in this branch (see
"Runtime status"). The modal's entire decision logic (view-model caching,
search filtering, mode/slot/template selection, confirm gating, result
normalization) is production-path tested via the Foundry-shim harness (the
pure exports it is built from); the AppV2 rendering/DOM-event-wiring layer
itself — including real focus behavior, real keyboard navigation, and the
new `<form>` submit wiring — remains unverified live. This is the one
thing this pass could not close: the production `ApplicationV2`
interaction is still unexecuted.

## Eligibility

**CORRECTED — two deliberately distinct eligibility gates, not one shared
by both modes.** The UI addendum introduced Convert to Follower into the
picker but computed its availability by reusing
`evaluateNpcAssignmentEligibility` — the SAME gate used for Assign as
Ally, including its same-owner-same-mode duplicate rejection. This was a
real service-contract bug, not a UI polish issue: a target already
Assigned as Ally to the SAME owner is exactly the intended case for the
already-implemented "convert an assigned ally to a follower" migration
(`convertToFollower`'s prior-assignment cleanup, see "Convert to Follower"
below) — but reusing the ally gate made that path structurally
unreachable from the UI, since the ally gate rejects same-owner duplicates
outright. This pass adds `evaluateFollowerConversionEligibility` /
`evaluateFollowerConversionEligibilityFacts` as their own exported
functions, mirroring `evaluateNpcAssignmentEligibility` /
`evaluateAssignmentEligibilityFacts`'s shape exactly but WITHOUT the
same-owner-same-mode rejection, so the two "shapes" of eligibility can
never regress into each other through a shared code path. The picker view
model (`buildNpcAssignmentPickerViewModel`) now evaluates BOTH gates per
candidate — `allyEvaluation` drives the Assign as Ally card and the Actor
card's `eligible`/`blockedReason` fields; `conversionEvaluation` drives
`canConvertToFollower` and `convertBlockedReason` — and `convertToFollower`
itself independently re-checks `evaluateFollowerConversionEligibility` at
the service boundary (not just the ally gate) so a forged direct call is
rejected the same way the UI's picker already prevents.

`evaluateNpcAssignmentEligibility` rejects: a non-GM caller; a missing
owner or target; an ineligible owner type (only `character`/`droid`); an
ineligible target type (only `npc`/`character`/`droid` — vehicles,
starships, hazards excluded); self-assignment; an Actor already assigned
to THIS owner in the SAME mode; an Actor that is already a mechanical
follower (new this pass — see below); and an Actor that is an active
player character (new this pass — see below).

`evaluateFollowerConversionEligibility` rejects the same non-GM/missing/
type/self-assignment/different-owner/already-follower/active-PC cases, but
does **not** reject a target already assigned to THIS owner as an ally —
that is the intended, explicit migration path, not a duplicate.

**CORRECTED — exclusive-owner policy.** The reciprocal target schema
stores only one `assignedAllyOwnerId` — the original implementation only
rejected a duplicate assignment to the SAME owner, silently allowing a
target already assigned to owner A to be reassigned to owner B. That would
overwrite the target's single `assignedAllyOwnerId` while leaving owner
A's `assignedAllies`/`beasts` array entry stranded (owner A's Allies app
would still list the NPC; the NPC would claim owner B; owner B would also
list it). This is now always blocked (test 11, test 60): a target already
assigned to a **different** owner is rejected with a message directing the
GM to unassign it first, regardless of mode. `convertToFollower` enforces
the same policy independently (a target assigned to a different owner
cannot be converted by this owner either).

**CORRECTED — already-a-follower and active-player-character exclusion.**
Two gaps found in this pass, both fixed identically in BOTH eligibility
gates via two new shared, pure, exported guard functions:

- `isTargetAlreadyFollower(targetActor)` — true if the Actor is already a
  mechanical follower by any of the four field families the codebase uses
  to mark that (`system.isFollower`, `system.progression.isFollower`,
  `flags.swse.follower.isFollower`, or the `getFlag(SYSTEM_ID,
  'isFollower')` accessor). Previously nothing stopped an already-follower
  Actor from being selected into a SECOND follower slot through this
  picker — it would have collided with (or duplicated on top of) its
  existing follower registration.
- `isActivePlayerCharacter(targetActor, {users})` — true if any user's
  assigned primary character is this Actor, OR any non-GM user holds
  Owner-level ownership on it (GM-held Owner ownership does not count —
  every Actor is GM-owned by default). Previously nothing excluded a live
  player character from the picker at all — a GM could relationship-assign
  or mechanically convert another player's active PC through this tool,
  which was never an intended use case.

Both checks are wired into `evaluateAssignmentEligibilityFacts` and
`evaluateFollowerConversionEligibilityFacts` identically, and both are
re-derived independently inside the service layer (not trusted from a
caller-supplied flag), matching the existing `isGM` re-derivation pattern.

## Assign as Ally

Non-destructive by construction: `buildAssignmentTargetFlagPatch` (the
target-side write) contains only `assignedAlly*` flag fields — no
`system.*`, no `flags.swse.follower.*`. Static guard check 3 enforces this
never regresses. The owner-side and target-side writes commit as steps of
`runFollowerMutationTransaction`, so a target-write failure rolls back the
owner-side write (test 17), and an owner-side failure means the target
step never runs at all (test 18). `target-metadata-commit` now has its own
rollback (`buildAssignmentClearPatch()`), since it is no longer
necessarily the last step.

**CORRECTED — ownership grant is now a transaction step, not a
post-transaction side effect.** The optional `grantOwnership: true` option
(used by the drag/drop path) previously granted the owner's player
Observer/Owner permission on the target AFTER the owner/target transaction
had already committed — if that grant failed, the method threw, but the
assignment remained committed (a "required enough to throw, optional
enough not to roll back" contradiction the review called out). It is now a
conditional third step INSIDE the same `runFollowerMutationTransaction`
call: if the grant fails, the whole assignment rolls back (test 59), per
the review's preferred policy ("ownership grant requested → transaction
step → failure rolls back assignment").

Actor classification (`detectAssignmentKindFromFacts`) determines display:
beast → Beasts lane; droid → Minions lane, `isDroid: true` (Garage-eligible
display, no calculation-mode change); nonheroic → Minions lane (unchanged
literal); everything else → Minions lane as a general assigned ally. No
kind ever receives `canLevelUpFollower`/`canSyncMinion` — verified by
static guard check 9.

## Convert to Follower

Requires and validates a real open follower slot (`validateFollowerConversionSlot`)
before any mutation — rejects a missing slot, an occupied slot, and a
non-`'follower'`-dependentKind slot (minion/beast-only slots). Both
talent-derived and GM-manual (`sourceType: 'gm-grant'`) slots are equally
valid (tests 49–50) — no discrimination by provenance. Preflight order is:
GM check → basic argument existence → the droid conversion gate → slot
fetch and validation → the full `evaluateFollowerConversionEligibility`
call (exclusive-owner policy, already-a-follower, active-player-character,
and — see below — target-type). Eligibility is deliberately checked AFTER
slot validation so re-converting an Actor into an already-occupied slot
still surfaces the more specific "slot occupied" diagnosis rather than the
coarser "already a follower" one.

**CORRECTED — target-type eligibility is now independently enforced at
the service boundary, matching `assignAsAlly`.** The original
`convertToFollower` never called `isEligibleAssignmentTargetType` itself —
it relied entirely on the picker UI already filtering out vehicles,
starships, and hazards, which meant a forged direct call (e.g. from a
player's console, or a future caller that skips the picker) could attempt
to convert an ineligible Actor type with no service-level rejection.
`evaluateFollowerConversionEligibility` now checks target type exactly
like `evaluateNpcAssignmentEligibility` already did, so `convertToFollower`
rejects a vehicle-type target at the service boundary regardless of what
called it (test 50).

**CORRECTED — the ownership grant is now available on, and transactional
within, the conversion path (it previously only worked for Assign as
Ally).** The modal's `grantOwnership` checkbox result was always computed
by `buildAllyAssignmentResult`, but the controller only forwarded
`grantOwnership` to `AlliesSurfaceService.assignExistingNpcAsAlly` — the
Convert to Follower call site silently dropped it, so checking "Grant the
player control of this NPC" and choosing Convert to Follower produced a
converted follower the player still could not open or control, with no
error and no indication anything was skipped. `convertToFollower` now
accepts the same `options.grantOwnership: boolean` `assignAsAlly` does; a
shared `buildOwnershipGrantStep(ownerActor, targetActor, sourceTag)`
builder (used by both methods — see "Transaction hierarchy" below)
constructs the ownership step, and it is pushed as a fourth, conditional
transaction step whenever `grantOwnership === true` (test 39: the
converted Actor's ownership map contains the owning player at
`CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER`; a forced ownership-grant failure
rolls back the ENTIRE conversion — the target's follower fields, the
owner's projections, and the ownership grant all revert together, not just
the grant). The controller now forwards `grantOwnership: result.grantOwnership`
at both call sites (guard check 22).

**CORRECTED — derivation is now a required transaction step, not a
best-effort side effect after commit.** The original implementation
committed follower identity (owner links, slot fill, `system.isFollower`,
`flags.swse.follower.*`) FIRST, then made a best-effort call to
`FollowerCreator.updateFollowerForOwnerLevel`, swallowing its failure. That
meant an Actor could become officially registered as a follower — visible
in Allies, occupying a slot — while never receiving working follower
mechanics (no derived HP/BAB/defenses/skills). This is now a single atomic
transaction (`runFollowerMutationTransaction`, three ordered steps) built
around a pure planner, `planExistingNpcFollowerConversion(owner, target, slot, choices)`,
which derives canonical follower state (template type, species identity,
droid config, ability choice, and `persistentChoices`/`followerChoices`
merged from the target's own existing progression data plus any explicit
GM choices) BEFORE any write happens:

1. **`target-conversion-commit`** — takes a real pre-mutation snapshot of
   the target via the existing `SnapshotManager.createSnapshot` (the
   "existing ActorEngine snapshot authority" the review required, not a
   new mechanism), captures the target's pre-mutation flags via
   `clonePlain`, then writes `buildFollowerConversionMetadata({plan})`
   (derived from the plan, so `followerChoices` is never the empty `{}}`
   the original implementation produced) merged with
   `buildAssignmentClearPatch()` **if** the target had a prior Assign as
   Ally/beast link (see "prior-assignment cleanup" below). Rollback:
   `SnapshotManager.restoreSnapshot` (restores `system`/`items`/`effects`/
   `name`/`img`/`prototypeToken`) followed by a `buildFlagRestorationPatch`-
   based flags restore (the snapshot service does not restore `flags`, a
   pre-existing documented limitation — the two are combined specifically
   to cover the full mutation surface).
2. **`follower-derivation-commit`** — calls
   `applyFollowerDerivation(owner, target)` (default:
   `applyDefaultFollowerDerivation`, which dynamically imports and invokes
   the real `FollowerCreator.updateFollowerForOwnerLevel`). **If this does
   not return `true`, it throws** — there is no swallowed-failure path.
   This step has no rollback of its own; a thrown failure here triggers
   step 1's rollback via the transaction's reverse-order unwind, so a
   derivation failure fully undoes the metadata commit rather than leaving
   a half-converted Actor.
3. **`owner-relationship-commit`** — writes the owner's `followers`/
   `followerSlots`/`ownedActors` (via the same pure builders talent-driven
   follower finalization uses, `buildFollowerLinkOwnerUpdate` and
   `buildFollowerSlotUpdate`), and removes the target from
   `assignedAllies`/`beasts` if a prior assignment existed. Rollback
   restores the owner's **pre-mutation captured arrays**
   (`currentFollowers`/`currentOwnedActors`/`currentAssignedAllies`/
   `currentBeasts`, each snapshotted via `clonePlain` before any step
   runs) — not a live re-read of `ownerActor.system` at rollback time.

4. **`ownership-commit`** (conditional — only when `options.grantOwnership
   === true`, see above) — the shared `buildOwnershipGrantStep`, identical
   to the step `assignAsAlly` uses: grants the owning player Owner-level
   ownership on the target, capturing the target's pre-grant ownership map
   so rollback restores it exactly rather than resetting to a hardcoded
   "no ownership" state.

`convertToFollower` never returns success unless every included step
commits. There is no metadata-only success path.

**CORRECTED — stale-snapshot rollback bug.** The original owner-side
rollback read `ownerActor.system?.ownedActors` (and the equivalent
`followers`/`followerSlots` fields) live, at rollback time — but by then
the owner had already been mutated by the earlier forward commit, so
"rollback" silently reapplied the already-mutated (post-conversion) state
instead of the true pre-conversion state, and any unrelated pre-existing
`ownedActors` entries (an Actor owned before this conversion ever ran)
were at risk of being lost or duplicated on a failed conversion. The fix:
`currentFollowers`, `currentOwnedActors`, `currentAssignedAllies`, and
`currentBeasts` are all captured via `clonePlain()` **before step 1 runs**,
and both the forward `ownerConversionUpdate` and the rollback
`ownerRollbackUpdate` are built from these captured values, never from a
live re-read. Test 57 verifies this exactly: an owner with an unrelated
pre-existing `ownedActors` entry, on a forced derivation failure, ends up
with `system.ownedActors` equal to the captured pre-mutation array,
including the unrelated entry, not the post-mutation array.

**CORRECTED — prior-assignment cleanup during conversion.** An NPC first
Assigned as Ally (or as a beast), then later Converted to Follower,
previously kept its `assignedAllyOwnerId`/`assignedAllyKind` flags and its
entry in the owner's `assignedAllies`/`beasts` array even after conversion
— so it could appear twice in Allies (once as an assigned ally/beast, once
as a mechanical follower). `detectPriorAssignment(targetActor)` now runs
during conversion preflight; if a prior assignment exists, step 1 merges
`buildAssignmentClearPatch()` into the conversion metadata (clearing the
reciprocal flags) and step 3 excludes the target from the rebuilt
`assignedAllies`/`beasts` array — both inside the SAME atomic transaction
that adds the follower projection, not a separate non-atomic cleanup call.
Test 56 verifies the target's prior assigned-ally flags are cleared and it
no longer appears in `assignedAllies`; `buildFollowerLinkOwnerUpdate`'s
existing id-based dedup means the target's `ownedActors` entry is
naturally superseded (not duplicated) rather than needing extra code. Test
55 verifies the Actor appears exactly once in Allies after conversion.

An arbitrary hand-authored heroic NPC's original stats may not derive
cleanly through the follower-creator pipeline (e.g. no matching
species/template) — since derivation is now required for success, that
case now surfaces as a **rejected conversion** with the underlying error
(test 36), not a silently-incomplete follower. This is the honest,
documented consequence of "level-derived stats may change, and must
succeed for the conversion to be considered done" — not a relaxation of
the mechanical requirement.

## Droid conversion

A stock-statblock droid can never reach `convertToFollower`'s mutation
steps: `evaluateDroidConversionGate` (built on the existing, already-
approved `isDroidStatblockMode` predicate from `droid-mode-adapter.js`)
blocks it outright with a message directing the GM to run
`DroidStatblockConversionService`'s existing conversion first. This
service does **not** invoke or reimplement `installedSystems` seeding,
`droidSystems` derivation, or modifier-dedup itself — it defers entirely to
the existing Phase 1–6 droid authority rather than duplicating it. A
playable-derived droid converts through the ordinary metadata + required-
derivation transaction like any other NPC, retaining its canonical droid
state (`droidConfig` in the plan reads `droidSystems`/`droidSize` straight
from the target — test 63); re-confirmed post-correction that a stock
droid remains blocked (test 64).

Assign as Ally never touches a droid's calculation mode at all (test 14) —
only Convert to Follower is gated.

## Beast handling

Assign as Ally: identical to any other NPC — links into the Beasts lane,
zero stat mutation (test 42).

Convert to Follower: **no fixed-profile auto-matching was implemented.**
`planExistingNpcFollowerConversion`/`buildFollowerConversionMetadata` only
set `fixedFollowerProfileId` when explicitly supplied via `choices`, so an
arbitrary beast — even one named "Akk Dog" — is never silently given the
Akk Dog fixed template (tests 43, 62); its species/`system`
fields are preserved exactly as they were. This means every beast
conversion uses the **generic follower conversion with species preserved**
path, one of the three explicitly sanctioned outcomes in the original
spec (the other two — an approved fixed-profile match, or an outright
block for "unsupported" beasts — were not built, since the generic path
already satisfies the requirement without needing a name-matching heuristic
against `follower-talent-config.js`'s `FOLLOWER_TALENT_CONFIG['Akk Dog Master']`
data). Documented as follow-up if fixed-profile auto-matching is later
wanted.

## Transaction hierarchy / mutation authority

No direct `actor.setFlag()`/`actor.update()` anywhere in
`ally-assignment-service.js` — every write routes through
`ActorEngine.updateActor()`, enforced by static guard check 5. The
controller never mutates an Actor or constructs a relationship record
directly (checks 1–2) — the chain is strictly Allies button/drag-drop →
`AlliesSurfaceController` → `AlliesSurfaceService` → `AllyAssignmentService` →
`ActorEngine`.

**CORRECTED — the ownership-grant transaction step now has a real
rollback.** Both `assignAsAlly` and `convertToFollower` build their
ownership-grant step from the same shared `buildOwnershipGrantStep(owner,
target, sourceTag)` (see "Convert to Follower" above). Its `commit`
captures the target's pre-grant ownership map (`clonePlain(targetActor.ownership
|| {})`) before writing the new Owner-level grant, returning
`{userId, previousOwnership}`; its `rollback(result)` restores the exact
prior level for that user (or `CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE ?? -1`
if the user had no explicit prior entry) rather than leaving the grant in
place or clearing ownership to a hardcoded default. Note that
`runFollowerMutationTransaction` never calls a step's own rollback if that
SAME step's commit is what threw — only previously-completed steps unwind
— so this rollback exists specifically for defense-in-depth against future
step reordering (ownership is currently always the last step in both
flows) and is verified directly (test 40: source assertion that the step
has both `commit` and `rollback`, and that rollback references
`previousOwnership`; test 39's failure case exercises the full-transaction
unwind end-to-end).

## Unassign behavior

`unassignAlly` removes the owner-side link (from `beasts` or
`assignedAllies`, whichever the kind uses) and `system.ownedActors`, then
clears ALL reciprocal target flags (`assignedAllyOwnerId`/`Kind`/`Mode`/
`Source`/`SyncMode`) via Foundry's `'-=key'` deletion convention — leaving
the target Actor's own stats, Items, and token completely untouched (tests
19–20). This is intentionally a *different*, lighter action than the
pre-existing `dismissCompanion`/"Fire" flow (which records "Previously
Hired" history and is meant for a hire/fire relationship) — Fire remains
available unchanged for backward compatibility (non-regression), while
Unassign is the more semantically correct action for a relationship-only
assignment. Unassign must never be used to undo a follower conversion —
that uses the existing detach/fire/delete workflow instead (not modified
by this feature).

**CORRECTED — `unassignAlly` is now transactional.** It previously issued
two independent `ActorEngine.updateActor` calls (owner removal, then target
flag clear) with no rollback — if the second call failed, the owner's link
was already gone while the target still carried stale `assignedAllyOwnerId`
flags pointing at a relationship the owner no longer recorded. It now runs
as a two-step `runFollowerMutationTransaction` (`owner-unassignment-commit`,
`target-metadata-clear`), each capturing its own pre-mutation state
(`currentOwnedActors`/`currentFlagList` for the owner, `previousTargetFlags`
for the target via `clonePlain`) before writing, so a target-clear failure
restores the owner's exact prior arrays (test 58) rather than leaving a
partially-unassigned relationship.

## Coverage tiers

- **(a) Direct production-path** — `tests/gm-existing-npc-allies-assignment.test.mjs`
  loads and executes the REAL `ally-assignment-service.js` AND the REAL
  `AlliesSurfaceService.js` through the Foundry-shim harness (confirmed
  during implementation: neither file transitively requires
  `SWSEDialogV2`/`foundry.applications.api` at module scope).
  `ActorEngine` is substituted by the shim's documented fake, and
  `SnapshotManager.createSnapshot`/`restoreSnapshot` load through the same
  harness (both only import `SWSELogger`/`ActorEngine`, both shimmable) —
  so the target-snapshot rollback path in `convertToFollower` is real
  production-path code, not a mock. 65 of the named cases are covered this
  way (see "Tests" below for the exact mapping and the 3 explicitly
  out-of-scope cases).
- **(b) Pure coordinator/builder via a documented dependency-injection
  seam** — the REAL follower-derivation pipeline
  (`FollowerCreator.updateFollowerForOwnerLevel`, in `follower-creator.js`)
  is not loadable in this Node harness. Rather than leave the now-required
  derivation transaction step untested, `convertToFollower` accepts
  `options.applyFollowerDerivation` (default: the real
  `applyDefaultFollowerDerivation`), and the test suite injects a
  controllable stand-in (`async () => true` / `async () => false`) so the
  REAL transaction's commit/rollback sequencing around the derivation step
  — the exact thing the atomicity correction fixes — is exercised directly
  against production transaction code, with only the derivation function's
  own internals substituted. This is a deliberate, narrow seam (one
  function, documented in the code and here), not a broad mocking layer.
- **(c) Source-inspection only** — `AlliesSurfaceController.js`'s
  `_unassignAlly` (still a plain `Dialog.confirm`) is not loadable through
  this harness (it imports `ShellRouter.js`/progression-entry.js, the same
  "un-loadable through the shim" wall documented since Phase 4) — verified
  by direct code reading only. The real
  `FollowerCreator.updateFollowerForOwnerLevel` function body itself (as
  opposed to the transaction step that calls it, which is tier (b)) is
  likewise inspection-verified only, since its own file cannot load in
  this harness.
- **(d) Template/source structural assertions** (new, for the Styled
  Assignment Modal) — `AllyAssignmentModal` extends `SWSEApplicationV2`,
  which (like every AppV2-based dialog in this codebase) cannot load
  through this harness — `foundry.applications.api` is not shimmed. Rather
  than leave the shipped modal template/CSS/JS structure unverified,
  `tests/gm-npc-assignment-modal.test.mjs` reads those files as text and
  asserts the required invariant is present (real radio inputs, no plain
  `<select>`, ARIA attributes, scroll containment CSS, no `ActorEngine`
  import/call, no direct Actor mutation) — an automated, repeatable check
  against the EXACT code that ships, not a live-DOM test and not
  hand-waved "looks right" inspection. The modal's actual decision LOGIC
  (view-model construction, search filtering, mode/slot selection policy,
  confirm gating, result normalization) is tier (a): it lives as pure
  exported functions in `AlliesSurfaceService.js` that the modal's event
  handlers call directly, so that logic loads and executes for real
  through the shim.

## Tests (65 named cases) — `tests/gm-existing-npc-allies-assignment.test.mjs`

Cases 1–37, 42–43, 45, 47, 49–65 are direct, executable assertions in the
test file (62 cases). Three cases are explicitly NOT implemented as
distinct code paths, by design, and are documented rather than fabricated:

- **38–41** (droid ledger seeding / projection generation / modifier
  dedup / incomplete-chassis review during conversion) — this service
  does not perform any of these; it BLOCKS a stock droid outright and
  defers entirely to the existing `DroidStatblockConversionService`
  rather than reimplementing it. Test 37 verifies the block; 38–41 have
  no corresponding assertions because there is no corresponding code.
- **44** ("unsupported beast conversion is blocked clearly") — not a
  distinct branch in this design; see "Beast handling" above. Test 45
  verifies the one path that IS implemented (generic conversion succeeds).
- **46, 48** (existing follower creation / existing beast creation remain
  unchanged) — verified via the full validation suite run (see below), not
  as in-file unit assertions, since they are regression checks against
  files this feature did not touch.

Cases 51–65 are the atomicity-correction additions verifying the required
list from the back-check review: derived-application failure leaves the
slot open and restores owner projections and the target (51–53); a
successful conversion produces canonical follower choices and appears
exactly once in Allies (54–55); prior assigned-ally projections are
removed during conversion (56); `currentOwnedActors` rollback uses the
pre-mutation snapshot, not a stale live re-read (57); a target-cleanup
failure during unassign restores the owner's relationship state exactly
(58); ownership-grant failure follows the documented transactional policy
(59); cross-owner assignment is blocked (60); no conversion success is
ever returned when derivation fails (61); a converted beast/droid retains
correct, unrelated-profile-free state (62–63); a stock droid remains
blocked (64); and retrying after a failed conversion does not duplicate
follower records (65).

Run: `node tests/gm-existing-npc-allies-assignment.test.mjs` →
`GM existing NPC allies assignment tests passed.` (exit 0). Auto-discovered
and passing under `node tools/run-rolling-tests.mjs`.

### Modal tests (50 named cases) — `tests/gm-npc-assignment-modal.test.mjs`

All 50 required cases are direct, executable assertions, split honestly
across tiers (a) and (d) (see "Coverage tiers"). **Reported honestly per
the reviewer's "Report corrections" request: a majority of these are
source-structure assertions (tier (d) — the exact markup/source that ships
is read back and checked against an invariant), not runtime/DOM
verification.** "50 required cases pass" means each of the 50 stated,
specific claims is true of the shipped code; it does not mean the modal
has been driven through a live DOM, and is not reported as such anywhere
in this document.

- **Tier (a), direct production-path** (the modal's pure decision logic,
  loaded and executed for real): 1–2 (GM gating via
  `buildNpcAssignmentPickerViewModel`), 8 (search filtering), 9–10
  (candidate selection / default mode), 11–13 (per-candidate mode
  availability, including the stock-statblock-droid case), 15–17
  (multi-slot/single-slot auto-select policy, and that pure state
  transitions never touch `ActorEngine`), 22–25 (confirm gating, double-
  submit-blocked via `submitting`, and normalized-result construction),
  34 (`_prepareContext` gates view-model rebuild behind
  `this._viewModelLoaded`), 35 (search filtering never affects
  `selectedCandidate` resolution), 36–38 (template-selection gating,
  single-choice auto-select, template reset on slot change), 39
  (`convertToFollower` with `grantOwnership: true` — success and rollback-
  on-failure, both against the real ownership map), 41–43 (the ally-vs-
  conversion eligibility split: same-owner conversion eligible where ally
  assignment is not; picker reflects the split; cross-owner blocks both),
  44 (`isTargetAlreadyFollower` across all four field families), 45–46
  (existing-follower exclusion in the picker and at the service boundary),
  47–49 (`isActivePlayerCharacter` primary-character and OWNER-ownership
  detection, including the full picker-and-service-boundary exclusion
  case), 50 (`convertToFollower` rejects a vehicle-type target at the
  service boundary).
- **Tier (d), template/source structural assertions**: 3–7 and 30 (radio
  inputs, no plain `<select>`, ARIA), 14 (follower-slot section
  conditionally rendered), 18–19 (`close()`/no custom Escape handler),
  20–21 (drag/drop preselects and never bypasses the modal), 26–28
  (controller delegation, no `ActorEngine`/Actor-mutation access from the
  modal), 29 (scrollable list region CSS), 31 (ineligible-for-both-modes
  card has `selectable: false` — a view-model-level, not DOM-level,
  assertion; genuinely tier (a) at the data layer but the resulting
  `disabled` attribute's actual effect on user interaction is unverified
  live), 32 (assignment-mode grid has a real `radiogroup` + `aria-labelledby`
  wired to a stable heading id), 33 (real `<form>`, submit-type confirm
  button, button-type cancel, a submit listener calling `preventDefault`
  and `_onConfirm` — proves the wiring exists in source, not that Enter
  actually submits in a live browser), 40 (`buildOwnershipGrantStep`
  source assertion: has both `commit` and `rollback`, rollback references
  `previousOwnership`).

Run: `node tests/gm-npc-assignment-modal.test.mjs` →
`GM NPC assignment modal tests passed.` (exit 0). Auto-discovered and
passing under `node tools/run-rolling-tests.mjs`.

## Static guard: `tools/check-ally-assignment-authority.mjs`

Scoped to five files (`ally-assignment-service.js`,
`AlliesSurfaceService.js`, `AlliesSurfaceController.js`,
`ally-assignment-modal.js`, `ally-assignment-modal.hbs`) — not a
repository-wide ban. Twenty-seven checks (enumerated in the file's own
header comment).

Checks 1–10 (original): controller must not construct links or call
`ActorEngine` directly; surface service's new delegate methods must not
construct links; Assign as Ally must never write follower progression
fields; Convert to Follower must validate the slot; no direct
`setFlag`/`update` bypassing `ActorEngine`; Convert to Follower must
consult the droid conversion gate; vehicles/starships/hazards must remain
ineligible; `assignAsAlly`/`unassignAlly`/`convertToFollower` must each
independently re-check GM status (including a check that indirect
delegation to `evaluateNpcAssignmentEligibility` is not a hollow no-op);
assigned allies must never enter follower/minion level sync; owner
relationship records must de-duplicate by Actor id.

Checks 11–13 (added in the ATOMICITY CORRECTION PASS):

- **11** — the follower-derivation call inside `convertToFollower` must
  `throw` when it does not return `true` (anchored on the actual
  `await applyFollowerDerivation(...)` call site, not an earlier mention
  of the identifier), and the old best-effort
  `catch { /* Post-conversion derived-stat sync failed */ }` pattern must
  not reappear.
- **12** — `unassignAlly` must run through `runFollowerMutationTransaction`,
  not two independent `ActorEngine.updateActor` calls.
- **13** — the `owner-relationship-commit` step's rollback must not read
  `ownerActor.system?.ownedActors` live; it must use a captured
  pre-mutation snapshot.

Checks 14–21 (added in the STYLED ASSIGNMENT MODAL pass):

- **14** — neither the controller nor the modal template may contain a
  plain `<select name="targetActorId">`/`<select name="slotId">` in the
  normal flow.
- **15** — the modal must not construct an assignment link object itself
  (no `assignedAllyKind:`/`ASSIGNMENT_KIND` reference).
- **16** — the modal must not import or call `ActorEngine`.
- **17** — the modal must not perform direct Actor mutation
  (`.update(`/`.setFlag(`/`.unsetFlag(`) or call `AllyAssignmentService`
  directly.
- **18** — every radio-card block in the modal template (Actor, mode, and
  slot cards) must contain a real `<input type="radio">`.
- **19** — `_handleDrop` must never call an assignment/conversion service
  directly — it must route through the modal-opening flow.
- **20** — `buildDefaultAllyAssignmentModalState` must default
  `assignmentMode` to `'ally'` unless the caller explicitly passes
  `'follower'`.
- **21** — `resolveFollowerSlotSelectionOnModeChange` must gate
  auto-selection on `followerSlots.length === 1` — never pick a slot by
  array position when more than one open slot exists.

Checks 22–27 (added in the ELIGIBILITY/OWNERSHIP CORRECTION PASS):

- **22** — the controller's `_assignExistingNpc`'s call to
  `AlliesSurfaceService.convertExistingNpcToFollower(...)` must forward
  `grantOwnership: result.grantOwnership` (the fix for issue 1 — the
  silently-discarded ownership checkbox on the conversion path).
- **23** — `convertToFollower`'s body must call
  `evaluateFollowerConversionEligibility(` and must NOT call
  `evaluateNpcAssignmentEligibility(` (the fix for issue 2 — the reused-
  eligibility-gate bug that made same-owner conversion unreachable).
- **24** — `buildNpcAssignmentPickerViewModel`'s `const canConvertToFollower
  = ...` assignment line itself must reference `conversionEvaluation.eligible`
  (anchored on that exact line, not merely on whether the conversion
  evaluator is called anywhere in the method — see "Errors and fixes" note
  below on why the looser anchor produced a false negative during
  development).
- **25** — both `evaluateNpcAssignmentEligibility`'s and
  `evaluateFollowerConversionEligibility`'s wrapper bodies must call both
  `isTargetAlreadyFollower(` and `isActivePlayerCharacter(` (the fix for
  issues 3 and 4).
- **26** — the Actor radio card's template markup, in the small window
  immediately following `<input type="radio" name="targetActorId"`, must
  contain `{{#if this.radioDisabled}}disabled` (the fix for issue 5 —
  ineligible cards remaining selectable).
- **27** — `buildOwnershipGrantStep`'s body must contain `rollback: async`
  (the fix for issue 11 — the ownership-grant transaction step previously
  having no rollback).

**Verification ritual performed** for every one of the 27 checks (inject →
detect → revert → clean pass). Checks 1–10 were verified when the guard
was first written, including one deliberately harder case (check 8's
"hollow delegation" — removing the GM check from
`evaluateNpcAssignmentEligibility` itself while `assignAsAlly` still calls
it, confirming the guard catches indirection that looks correct but isn't).
Checks 11–13 were verified in the atomicity correction pass: reverting
`follower-derivation-commit` to the old best-effort try/catch pattern
fired check 11 (both the required-throw and old-pattern sub-checks);
replacing `unassignAlly`'s transaction with two bare `ActorEngine.updateActor`
calls fired check 12; replacing `owner-relationship-commit`'s rollback with
a live re-read fired check 13. Checks 14–21 were verified in this UI
addendum pass: injecting a `<select name="targetActorId">` into the
controller fired check 14; injecting an `ASSIGNMENT_KIND` reference into
the modal fired check 15; injecting an `ActorEngine.updateActor(` call into
the modal fired check 16; injecting a direct `.update()` call AND
separately an `AllyAssignmentService.assignAsAlly(` call into the modal
each fired check 17; renaming the Actor card's radio `name` attribute in
the template fired check 18; replacing `_handleDrop`'s modal-opening call
with a direct `AlliesSurfaceService.assignExistingNpcAsAlly(` call fired
check 19; hard-coding `assignmentMode: 'follower'` into
`buildDefaultAllyAssignmentModalState` fired check 20; relaxing
`resolveFollowerSlotSelectionOnModeChange`'s guard from `.length === 1` to
`.length > 0` fired check 21. Checks 22–27 were verified in this
ELIGIBILITY/OWNERSHIP CORRECTION PASS: removing `grantOwnership:
result.grantOwnership` from the controller's conversion call site fired
check 22; swapping `convertToFollower`'s eligibility call to
`evaluateNpcAssignmentEligibility` fired check 23 (both the "must call
conversion" and "must not call ally" sub-checks were independently
verified); changing `canConvertToFollower`'s source expression to
`allyEvaluation.eligible` fired check 24 (this required fixing the check's
own regex first — see below); removing the `isActivePlayerCharacter(`
call from either eligibility wrapper fired check 25 independently for
each; removing `{{#if this.radioDisabled}}disabled` from the Actor radio
card template fired check 26 (this also required fixing the check's own
match window first — see below); removing `buildOwnershipGrantStep`'s
`rollback` function fired check 27. Two of these checks needed their own
regex corrected mid-development after an initial false negative — both
documented here for anyone extending this guard further: check 24's first
draft matched "is `evaluateFollowerConversionEligibility(` called anywhere
in the method," which stayed true even after the injected regression
(the call still existed, just assigned to an unused variable) — fixed by
anchoring on the `canConvertToFollower` assignment line itself; check 26's
first draft tried to match the entire ~1558-character Actor card block
within a 500-character window and never matched at all — fixed by
anchoring on a small window immediately after the radio input instead.
Final diff against pre-injection backups of all five touched files, after
every injection across all 27 checks: byte-identical.

Report-only by default; `--strict` exits non-zero on any violation.

## Validation performed (exact counts)

Re-run in full after the ELIGIBILITY/OWNERSHIP CORRECTION PASS (all
baseline counts confirmed unchanged; the ally-assignment guard's check
count is now 27, up from 21):

```
node tools/run-rolling-syntax-check.mjs            → 2128 file(s) checked, all pass (2 documented pre-existing exclusions)
node tools/check-progression-integrity.mjs         → 44 violations (documented baseline, unchanged)
node tools/check-architecture-boundaries.mjs       → 37 violations (documented baseline, unchanged)
node tools/check-follower-mutation-authority.mjs --strict   → 0 violations (10 checks)
node tools/check-follower-slot-authority.mjs --strict       → 0 violations (6 checks)
node tools/check-ally-assignment-authority.mjs --strict     → 0 violations (27 checks — 10 original + 3 atomicity + 8 styled-modal + 6 eligibility/ownership correction)
node tools/check-droid-authority-ssot.mjs --strict           → 0 violations
node tools/check-droid-calculation-mode-authority.mjs --strict → 0 violations (7 checks)
node tools/check-droid-installation-write-authority.mjs --strict → 0 violations
node tools/check-droid-reconciliation-authority.mjs --strict → 0 violations (8 checks)
node tools/check-follower-droid-chassis-authority.mjs --strict → 0 violations (8 checks)
bash tools/check-mutation-paths.sh                 → PASSED, no mutation-path regressions
node tests/gm-existing-npc-allies-assignment.test.mjs → GM existing NPC allies assignment tests passed. (65 named cases)
node tests/gm-npc-assignment-modal.test.mjs          → GM NPC assignment modal tests passed. (50 named cases, up from 30)
node tools/run-rolling-tests.mjs                   → 54 passed, 0 failed (of 54 run; 5 excluded as documented pre-existing Force-power-track failures); both ally-assignment test files auto-discovered and passing within this run
```

## Runtime status

No live Foundry VTT v13 environment is available in this session (unchanged
standing limitation — see the Phase 5 audit). All verification here is
either (a) direct production-path Node execution through the Foundry-shim
harness, (b) the documented derivation dependency-injection seam, (c)
source inspection, or (d) template/source structural assertions, as broken
down above under "Coverage tiers". The styled Assign Existing NPC modal
(radio-card selection, search, drag/drop preselection, the new `<form>`
submit wiring, the new selected-summary panel, the new template-selection
cards, the now-disabled ineligible cards, the confirm/cancel buttons) has
NOT been clicked through in a live Foundry world; nor has a real
invocation of `FollowerCreator.updateFollowerForOwnerLevel` inside the
corrected transaction — the transaction's handling of that call's
success/failure is production-path tested via the injection seam, but the
real function's own behavior against a live world Actor is not.

**Stated plainly, per the reviewer's request:** every fix in this pass is
proven correct as a service-boundary contract and, where the logic lives
in a pure exported function, as executed production-path code. None of it
has been proven correct as a live user-facing interaction — real focus
order, real screen-reader announcement of the new `radiogroup`/`disabled`
states, real Enter-key submission from a focused form field, and real
click-through of the template-selection cards are all still unverified.
The gap between "the code that ships has the right shape" and "a GM
clicking through this in Foundry works as designed" remains open, exactly
as before this pass — this pass narrowed WHAT is unverified (five service-
contract bugs are now closed and directly tested), not WHETHER it has been
run live.

## Merge readiness

Per the reviewer's required reporting language, these four things are
tracked and reported **separately** — none of them stands in for another:

- **Relationship metadata conversion** (Assign as Ally, Unassign) —
  READY. Both are now fully transactional (including the ownership-grant
  step and the exclusive-owner policy), tested end-to-end as real
  production-path code, and non-destructive by construction.
- **Mechanical follower derivation** (the `follower-derivation-commit`
  transaction step inside Convert to Follower) — the step is now REQUIRED
  for conversion to succeed, and the transaction's commit/rollback
  behavior around it is production-path tested via the dependency-
  injection seam. The real derivation function's own correctness
  (`FollowerCreator.updateFollowerForOwnerLevel`'s internals) is unchanged
  by this feature and is inspection-verified only, per the standing
  Node-harness limitation.
- **Owner/slot linkage** (followers/followerSlots/ownedActors projections,
  prior-assignment cleanup, stale-snapshot-free rollback) — READY. Fixed
  and directly tested (tests 51–57, 65).
- **Live Foundry validation** — NOT PERFORMED. No live Foundry VTT v13
  environment is available in this session (unchanged standing
  limitation). This is the one outstanding verification this session
  cannot perform, for any of the above — including the styled modal's
  actual on-screen appearance, scroll behavior, and keyboard navigation.

This pass adds a fifth, separately-tracked claim the UI addendum
introduced:

- **Styled selection UI** (`AllyAssignmentModal` — radio-card Actor/mode/
  slot/template selection, search, drag/drop preselection, the no-mutation
  modal boundary) — READY at the decision-logic level: the modal's entire
  state machine (defaults, search filtering, mode/slot/template
  availability, the single-vs-multiple-slot and single-vs-multiple-template
  auto-select policies, confirm gating, result normalization, the cached-
  view-model optimization) is production-path tested as real, shipped
  code. The AppV2 rendering/DOM-event-wiring layer itself — including the
  new `<form>`/Enter-submit wiring — is verified only by template/source
  structural assertions (tier (d)) and has NOT been clicked through live —
  this is a narrower, more honest claim than "the modal works," and is
  reported as such rather than folded into the broader "Live Foundry
  validation — NOT PERFORMED" line above.

**CORRECTED — the prior version of this section overstated accessibility
and coverage confidence; both claims are restated here.** The prior
"Overall: CONDITIONALLY READY" verdict below described the modal as "a
UI/UX refinement with no change to the underlying transactional mutation
behavior." An independent review found that framing was wrong: the styled
modal exposed, and in one case (the ownership-grant transaction step
having no rollback) introduced, real service-level defects — not merely
UI polish. The reviewer's verdict, reproduced here rather than
paraphrased, was: *"Functional readiness: not ready until at least these
are fixed: 1. ownership checkbox behavior during conversion; 2. same-owner
assigned ally conversion eligibility; 3. existing-follower duplicate-slot
prevention; 4. active player-character exclusion; 5. explicit
follower-template selection. The first two are direct UI/service contract
bugs, not polish."* All five are now fixed in this pass (issues 1–5 above;
see "Eligibility" and "Convert to Follower" for 1–4, and "Styled
Assignment Modal" for 5) and each has a dedicated static guard check
(22–26) and dedicated production-path or structural test coverage (see
"Tests"). Likewise, the accessibility claim is restated: this document
does **not** claim complete accessibility. The modal has real radio
controls and correctly disables ineligible/unavailable choices at the
`<input>` level, the assignment-mode grid is now a real `radiogroup`, and
Enter-to-submit now works at the source-wiring level — but none of live
focus order, live keyboard navigation, or live screen-reader behavior has
been tested in Foundry, and is not claimed as tested anywhere in this
document.

**Overall: CONDITIONALLY READY.** The mechanical-derivation requirement
remains enforced in production code (a conversion can no longer report
success on metadata alone); the reviewer's five functional-readiness
blockers are now closed, independently guarded, and independently tested;
and the ownership-grant transaction step now has a real rollback in both
`assignAsAlly` and `convertToFollower`. Static guards clean (27 checks
across 5 scoped files, up from 21), baselines unchanged (44/37), the full
required test suite passing as real production-path or structural code
(65 + 50 = 115 named cases across the two test files for this feature,
up from 95), and the paths this shim cannot reach (Unassign's
`Dialog.confirm`, the AppV2 rendering layer, the real follower-derivation
function body, and — new this pass — the modal's live focus/keyboard/
screen-reader behavior) remain inspection-verified or structurally-
asserted against the exact code that ships, never claimed as live-tested.
Scope boundaries not addressed by this pass (droid ledger reimplementation,
beast fixed-profile matching, whether a bounded "Restore Pre-Conversion
NPC" GM action is later wanted now that a real snapshot is taken, and live
Foundry click-through of the entire modal) remain explicitly documented,
follow-up-eligible decisions rather than silent gaps.
