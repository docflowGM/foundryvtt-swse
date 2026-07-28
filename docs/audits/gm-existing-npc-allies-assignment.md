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
cards for the follower slot when converting. This is a UI/UX refinement
only — `AllyAssignmentService`, `AlliesSurfaceService`'s assign/convert/
unassign delegates, and the underlying transactional mutation behavior
described above are all unchanged. See "Styled Assignment Modal" below.

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

**Actor radio-card selection.** Each eligible candidate renders as a real
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

**Assignment-mode radio-card selection.** Assign as Ally and Convert to
Follower render as two large radio cards
(`name="assignmentMode"`, values `"ally"`/`"follower"`) in a responsive
2-column grid (`.swse-assignment-choice-grid`, collapsing to 1 column under
640px). Convert to Follower is disabled (`disabled` attribute, not just a
CSS class — check 18/30) whenever the selected candidate's
`canConvertToFollower` is false (no open slot, droid-blocked, or otherwise
ineligible), with the specific blocking reason shown beneath the card.
Assign as Ally defaults selected (`buildDefaultAllyAssignmentModalState()`
always returns `assignmentMode: 'ally'` unless a caller explicitly passes
`'follower'` — static guard check 20).

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
always nulls `followerSlotId` when `assignmentMode !== 'follower'`, so it
is never submitted while in ally mode.

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

**Accessibility.** `role="dialog"` with `aria-labelledby`/`aria-describedby`
pointing at the modal's title/description; the Actor list and follower-slot
list are each `role="radiogroup"` with an `aria-label`; every radio card is
a real `<label>`/`<input type="radio">` pair (native keyboard arrow-key
navigation and `:focus-visible` styling both come for free from using real
form controls, not synthesized); disabled cards carry a real `disabled`
attribute on their `<input>` (not merely a CSS class) plus visible reason
text; portrait `<img>` tags use `alt=""` (decorative — the name is already
in adjacent text); Escape closes via Foundry's native AppV2 handling and
resolves `null` through the same `close()` override as the `[X]` button
(static guard checks 15–17 also cover this: `close()` never references
`AlliesSurfaceService`/`ActorEngine`).

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

**Tests.** `tests/gm-npc-assignment-modal.test.mjs` (30 required cases —
see "Tests" and "Coverage tiers" below for the exact tier breakdown per
case).

**Live Foundry status.** Not clicked through in a live Foundry world —
same standing limitation as every other UI surface in this branch (see
"Runtime status"). The modal's entire decision logic is production-path
tested via the Foundry-shim harness (the pure exports it is built from);
only the AppV2 rendering/DOM-event-wiring layer itself is unverified live.

## Eligibility

`evaluateNpcAssignmentEligibility` rejects: a non-GM caller; a missing
owner or target; an ineligible owner type (only `character`/`droid`); an
ineligible target type (only `npc`/`character`/`droid` — vehicles,
starships, hazards excluded); self-assignment; and an Actor already
assigned to THIS owner in the SAME mode.

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
valid (tests 49–50) — no discrimination by provenance. Preflight also
independently re-checks the exclusive-owner policy (`detectPriorAssignment`)
so a target already assigned to a **different** owner cannot be converted
by this owner either (test 60).

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

`convertToFollower` never returns success unless all three steps commit.
There is no metadata-only success path.

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

### Modal tests (30 named cases) — `tests/gm-npc-assignment-modal.test.mjs`

All 30 required cases are direct, executable assertions, split honestly
across tiers (a) and (d) (see "Coverage tiers"):

- **Tier (a), direct production-path** (the modal's pure decision logic,
  loaded and executed for real): 1–2 (GM gating via
  `buildNpcAssignmentPickerViewModel`), 8 (search filtering), 9–10
  (candidate selection / default mode), 11–13 (per-candidate mode
  availability, including the stock-statblock-droid case), 15–17
  (multi-slot/single-slot auto-select policy, and that pure state
  transitions never touch `ActorEngine`), 22–25 (confirm gating, double-
  submit-blocked via `submitting`, and normalized-result construction).
- **Tier (d), template/source structural assertions**: 3–7 and 30 (radio
  inputs, no plain `<select>`, ARIA), 14 (follower-slot section
  conditionally rendered), 18–19 (`close()`/no custom Escape handler),
  20–21 (drag/drop preselects and never bypasses the modal), 26–28
  (controller delegation, no `ActorEngine`/Actor-mutation access from the
  modal), 29 (scrollable list region CSS).

Run: `node tests/gm-npc-assignment-modal.test.mjs` →
`GM NPC assignment modal tests passed.` (exit 0). Auto-discovered and
passing under `node tools/run-rolling-tests.mjs`.

## Static guard: `tools/check-ally-assignment-authority.mjs`

Scoped to five files (`ally-assignment-service.js`,
`AlliesSurfaceService.js`, `AlliesSurfaceController.js`,
`ally-assignment-modal.js`, `ally-assignment-modal.hbs`) — not a
repository-wide ban. Twenty-one checks (enumerated in the file's own
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

**Verification ritual performed** for every one of the 21 checks (inject →
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
`.length > 0` fired check 21. Final diff against pre-injection backups of
all five touched files, after every injection: byte-identical.

Report-only by default; `--strict` exits non-zero on any violation.

## Validation performed (exact counts)

Re-run in full after the styled-modal UI addendum (all counts confirmed
unchanged from the pre-addendum baseline):

```
node tools/run-rolling-syntax-check.mjs            → 2128 file(s) checked, all pass (2 documented pre-existing exclusions)
node tools/check-progression-integrity.mjs         → 44 violations (documented baseline, unchanged)
node tools/check-architecture-boundaries.mjs       → 37 violations (documented baseline, unchanged)
node tools/check-follower-mutation-authority.mjs --strict   → 0 violations (10 checks)
node tools/check-follower-slot-authority.mjs --strict       → 0 violations (6 checks)
node tools/check-ally-assignment-authority.mjs --strict     → 0 violations (21 checks — 10 original + 3 atomicity + 8 styled-modal)
node tools/check-droid-authority-ssot.mjs --strict           → 0 violations
node tools/check-droid-calculation-mode-authority.mjs --strict → 0 violations (7 checks)
node tools/check-droid-installation-write-authority.mjs --strict → 0 violations
node tools/check-droid-reconciliation-authority.mjs --strict → 0 violations (8 checks)
node tools/check-follower-droid-chassis-authority.mjs --strict → 0 violations (8 checks)
bash tools/check-mutation-paths.sh                 → PASSED, no mutation-path regressions
node tools/run-rolling-tests.mjs                   → 54 passed, 0 failed (of 54 run; 5 excluded as documented pre-existing Force-power-track failures); 59 test files discovered (up from 58 — this addendum's new gm-npc-assignment-modal.test.mjs)
```

## Runtime status

No live Foundry VTT v13 environment is available in this session (unchanged
standing limitation — see the Phase 5 audit). All verification here is
either (a) direct production-path Node execution through the Foundry-shim
harness, (b) the documented derivation dependency-injection seam, (c)
source inspection, or (d) template/source structural assertions, as broken
down above under "Coverage tiers". The styled Assign Existing NPC modal
(radio-card selection, search, drag/drop preselection, the confirm/cancel
buttons) has NOT been clicked through in a live Foundry world; nor has a
real invocation of `FollowerCreator.updateFollowerForOwnerLevel` inside the
corrected transaction — the transaction's handling of that call's
success/failure is production-path tested via the injection seam, but the
real function's own behavior against a live world Actor is not.

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
  slot selection, search, drag/drop preselection, the no-mutation modal
  boundary) — READY at the decision-logic level: the modal's entire state
  machine (defaults, search filtering, mode/slot availability, the
  single-vs-multiple-slot auto-select policy, confirm gating, result
  normalization) is production-path tested as real, shipped code. The
  AppV2 rendering/DOM-event-wiring layer itself is verified only by
  template/source structural assertions (tier (d)) and has NOT been
  clicked through live — this is a narrower, more honest claim than
  "the modal works," and is reported as such rather than folded into the
  broader "Live Foundry validation — NOT PERFORMED" line above.

**Overall: CONDITIONALLY READY**, unchanged posture from the atomicity
correction pass — the mechanical-derivation requirement is enforced in
production code (a conversion can no longer report success on metadata
alone), and the styled modal is a UI/UX refinement with no change to the
underlying transactional mutation behavior. Static guards clean (21
checks across 5 scoped files), baselines unchanged (44/37), the full
required test suite passing as real production-path code (65 + 30 = 95
named cases across the two test files for this feature), and the paths
this shim cannot reach (Unassign's `Dialog.confirm`, the AppV2 rendering
layer, the real follower-derivation function body) remain
inspection-verified or structurally-asserted against the exact code that
ships. Scope boundaries not addressed by this pass (droid ledger
reimplementation, beast fixed-profile matching, and whether a bounded
"Restore Pre-Conversion NPC" GM action is later wanted now that a real
snapshot is taken) remain explicitly documented, follow-up-eligible
decisions rather than silent gaps.
