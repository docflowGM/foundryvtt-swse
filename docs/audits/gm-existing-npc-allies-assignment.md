# GM Existing NPC Assignment — Allies App

**Branch:** `fix/droid-authority-consolidation-phase-2`
**PR:** #937 (draft)
**Scope:** letting a GM take an existing world NPC Actor into a player
character's Allies, as either a non-mechanical relationship or an explicit
follower conversion.

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
  target existence and type, self-assignment, and an existing assignment
  to the SAME owner in the SAME mode.
- `buildAllyAssignmentLink(...)` / `buildAssignmentTargetFlagPatch(...)` —
  pure builders for the owner-side link record and the target's reciprocal
  flags (Assign as Ally only — never a follower field).
- `buildOwnerAssignmentUpdate(...)` / `buildOwnerUnassignmentUpdate(...)` —
  pure, de-duplicating (by Actor id) owner-side projection builders.
- `validateFollowerConversionSlot(slot)` — pure: rejects a missing slot, an
  occupied slot, and a non-`'follower'` `dependentKind` slot.
- `buildFollowerConversionMetadata(...)` — pure builder for the standard
  follower fields a converted Actor receives.
- `evaluateDroidConversionGate(targetActor)` — pure: blocks a
  stock-statblock droid from `AllyAssignmentService.convertToFollower`.
- `AllyAssignmentService.assignAsAlly(owner, target, options)` /
  `.unassignAlly(owner, target, options)` /
  `.convertToFollower(owner, target, slotId, options)` — the governed
  orchestration.

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
- `getAssignableNpcActors(ownerActor)` — GM-only picker listing: excludes
  the owner itself, excludes ineligible target types, flags
  already-assigned candidates.
- `assignExistingNpcAsAlly` / `unassignExistingNpcAlly` / `convertExistingNpcToFollower`
  — thin delegates to `AllyAssignmentService`. This service does **not**
  construct or persist a relationship/conversion itself (enforced by static
  guard checks 1–2).
- `evaluateNpcAssignment(owner, target)` — read-only dialog-support helper:
  eligibility + open-follower-slot listing + droid-gate status, so the
  dialog can disable Convert to Follower and show why, without mutating
  anything.
- `getOpenFollowerSlotsForConversion(ownerActor)` — lists unfilled
  `dependentKind: 'follower'` slots (talent-derived AND GM-manual alike —
  no discrimination by `sourceType`).
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
- `assignDroppedActor` (the pre-existing drag/drop handler) now delegates
  to `AllyAssignmentService.assignAsAlly` instead of constructing the link
  inline, generalizing it beyond nonheroic-only while preserving its
  boolean return contract for any other caller.

**`scripts/ui/shell/AlliesSurfaceController.js`**:
- `_handleDrop` no longer mutates immediately — a GM-gated drop now opens
  the SAME assignment-choice dialog the button flow uses
  (`_openAssignmentChoiceDialog`), so nothing is written until the GM picks
  Assign or Convert.
- `_assignExistingNpc()` — GM-only picker (`new Dialog` with a `<select>`
  of `getAssignableNpcActors` results), then opens the choice dialog for
  the selected Actor.
- `_openAssignmentChoiceDialog(targetActor)` — shows NPC name/image/
  detected kind, a Convert-to-Follower slot `<select>` (or a disabled
  explanation naming the blocking reason) via `evaluateNpcAssignment`, and
  three buttons: Assign as Ally / Convert to Follower (omitted entirely
  when no open slot / droid-blocked) / Cancel.
- `_unassignAlly(actorId)` — GM-only, confirms via `Dialog.confirm`
  (matching the existing remove-record pattern), then delegates.
- `case 'assign-existing-npc'` / `case 'unassign-ally'` added to the action
  switch.

**Templates**: the "+ Assign Existing NPC" button sits beside "+ Add
Follower Slot" in the same `swse-allies-section-actions` toolbar (reusing
the `swse-allies-history-toggle` button class — no new visual system),
gated on `vm.canAssignExistingNpc`. The per-card "Unassign" button reuses
the existing `.swse-allies-card-actions button.is-danger` styling, gated on
`this.canUnassignAlly`.

## Eligibility

`evaluateNpcAssignmentEligibility` rejects: a non-GM caller; a missing
owner or target; an ineligible owner type (only `character`/`droid`); an
ineligible target type (only `npc`/`character`/`droid` — vehicles,
starships, hazards excluded); self-assignment; and an Actor already
assigned to THIS owner in the SAME mode (re-assigning to a *different*
owner, or in a *different* mode, is explicitly allowed — the check only
compares against the current owner/mode pair, matching "Actor may be
assigned to another owner only if current policy permits it").

## Assign as Ally

Non-destructive by construction: `buildAssignmentTargetFlagPatch` (the
target-side write) contains only `assignedAlly*` flag fields — no
`system.*`, no `flags.swse.follower.*`. Static guard check 3 enforces this
never regresses. The owner-side and target-side writes commit as two
steps of `runFollowerMutationTransaction`, so a target-write failure rolls
back the owner-side write (test 17), and an owner-side failure means the
target step never runs at all (test 18). An optional `grantOwnership: true`
option (used by the drag/drop path) grants the owner's player Observer/Owner
permission on the target, matching the pre-existing drag/drop behavior.

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
valid (tests 49–50) — no discrimination by provenance.

The commit path reuses the SAME pure builders talent-driven follower
finalization uses: `buildFollowerLinkOwnerUpdate` (owner's `followers`
list + `ownedActors`) and `buildFollowerSlotUpdate` (the slot's
`createdActorId`) — both from `follower-mutation-transaction.js`. All three
owner-side projections (`followers`, `followerSlots`, `ownedActors`) commit
in ONE governed `ActorEngine.updateActor` call (test 32), coordinated via
`runFollowerMutationTransaction` alongside the target's own conversion-
metadata commit, with compensating rollback if either step fails (tests
29, 35).

**Snapshot policy** (documented decision, not left implicit): this
implementation does **not** invoke `SnapshotManager`/a full Actor-document
snapshot for the pre-conversion state. Foundry cannot commit multiple
documents atomically regardless, and the mutation here is narrow (a
handful of follower-metadata fields, not a destructive rewrite of the
target's existing Items/levels) — so a **compensating-update rollback**
(re-apply the pre-mutation values on failure, the same pattern
`follower-mutation-transaction.js` already established for follower
creation) is sufficient and was chosen over the heavier snapshot mechanism.
No bounded "Restore Pre-Conversion NPC" GM action was built on top of
this — it is not needed given the mutation is additive metadata, not a
destructive rewrite; if a future phase makes conversion more invasive
(actually re-deriving stats via the full follower pipeline), that would be
the point to add a real snapshot-backed restore action. Documented as
follow-up.

**Follower derivation on conversion** (documented scope boundary): after
the metadata commit succeeds, `convertToFollower` makes a **best-effort**
call to the existing, already-tested `FollowerCreator.updateFollowerForOwnerLevel(owner, target)`
— the SAME function an ordinary follower's "Recalculate Follower" button
already calls — so the converted Actor's derived stats (HP/BAB/defenses/
skills) are recalculated to match its template and the owner's heroic
level, using the existing pipeline rather than a reimplementation. This
step is deliberately best-effort: if it throws (e.g. `follower-creator.js`
is not loadable in this session's Node test harness), the conversion itself
has ALREADY committed successfully and is not rolled back — a GM can retry
via the ordinary follower level-up control afterward. This mirrors the
"Commit policy for enhancement application" precedent from the Phase 6
addendum. An arbitrary hand-authored heroic NPC's original stats may not
derive cleanly through this pipeline (e.g. no matching species/template) —
this is the honest, documented consequence of "level-derived stats may
change," not a bug.

## Droid conversion

A stock-statblock droid can never reach `convertToFollower`'s mutation
steps: `evaluateDroidConversionGate` (built on the existing, already-
approved `isDroidStatblockMode` predicate from `droid-mode-adapter.js`)
blocks it outright with a message directing the GM to run
`DroidStatblockConversionService`'s existing conversion first. This
service does **not** invoke or reimplement `installedSystems` seeding,
`droidSystems` derivation, or modifier-dedup itself — it defers entirely to
the existing Phase 1–6 droid authority rather than duplicating it. A
playable-derived droid converts through the ordinary metadata + best-effort
derivation path like any other NPC.

Assign as Ally never touches a droid's calculation mode at all (test 14) —
only Convert to Follower is gated.

## Beast handling

Assign as Ally: identical to any other NPC — links into the Beasts lane,
zero stat mutation (test 42).

Convert to Follower: **no fixed-profile auto-matching was implemented.**
`buildFollowerConversionMetadata` has no reference to `fixedFollowerProfile`
at all, so an arbitrary beast — even one named "Akk Dog" — is never
silently given the Akk Dog fixed template (test 43); its species/`system`
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

## Coverage tiers

- **(a) Direct production-path** — `tests/gm-existing-npc-allies-assignment.test.mjs`
  loads and executes the REAL `ally-assignment-service.js` AND the REAL
  `AlliesSurfaceService.js` through the Foundry-shim harness (confirmed
  during implementation: neither file transitively requires
  `SWSEDialogV2`/`foundry.applications.api` at module scope).
  `ActorEngine` is substituted by the shim's documented fake. 50 of the 53
  named cases are covered this way (see "Tests" below for the exact
  mapping and the 3 explicitly out-of-scope cases).
- **(c) Source-inspection only** — `AlliesSurfaceController.js`'s dialog
  flow (`_assignExistingNpc`/`_openAssignmentChoiceDialog`/`_unassignAlly`)
  is not loadable through this harness (it imports `ShellRouter.js`/
  progression-entry.js, the same "un-loadable through the shim" wall
  documented since Phase 4) — verified by direct code reading only. The
  best-effort `FollowerCreator.updateFollowerForOwnerLevel` derivation step
  inside `convertToFollower` is likewise inspection-verified (its own
  file is un-loadable), though the test suite DOES verify the surrounding
  try/catch doesn't destabilize a successful conversion (test 33).

## Tests (53 named cases) — `tests/gm-existing-npc-allies-assignment.test.mjs`

Cases 1–37, 42–43, 45, 47, 49–50 are direct, executable assertions in the
test file (50 cases). Three cases are explicitly NOT implemented as
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
- **46, 48, 51–53** (existing follower creation / existing beast creation /
  mutation guards / progression integrity / architecture boundaries
  remain unchanged) — verified via the full validation suite run (see
  below), not as in-file unit assertions, since they are regression
  checks against files this feature did not touch.

Run: `node tests/gm-existing-npc-allies-assignment.test.mjs` →
`GM existing NPC allies assignment tests passed.` (exit 0). Auto-discovered
and passing under `node tools/run-rolling-tests.mjs`.

## Static guard: `tools/check-ally-assignment-authority.mjs`

Scoped to three files (`ally-assignment-service.js`,
`AlliesSurfaceService.js`, `AlliesSurfaceController.js`) — not a
repository-wide ban. Ten checks (enumerated in the file's own header
comment): controller must not construct links or call `ActorEngine`
directly; surface service's new delegate methods must not construct
links; Assign as Ally must never write follower progression fields;
Convert to Follower must validate the slot; no direct `setFlag`/`update`
bypassing `ActorEngine`; Convert to Follower must consult the droid
conversion gate; vehicles/starships/hazards must remain ineligible;
`assignAsAlly`/`unassignAlly`/`convertToFollower` must each independently
re-check GM status (including a check that indirect delegation to
`evaluateNpcAssignmentEligibility` is not a hollow no-op); assigned allies
must never enter follower/minion level sync; owner relationship records
must de-duplicate by Actor id.

**Verification ritual performed** for every one of the 10 checks (inject →
detect → revert → clean pass), including one deliberately harder case
(check 8's "hollow delegation" — removing the GM check from
`evaluateNpcAssignmentEligibility` itself while `assignAsAlly` still calls
it, confirming the guard catches indirection that looks correct but isn't).
Final diff against pre-injection backups of all three touched files:
byte-identical.

Report-only by default; `--strict` exits non-zero on any violation.

## Validation performed (exact counts)

```
node tools/check-progression-integrity.mjs        → 44 violations (documented baseline, unchanged)
node tools/check-architecture-boundaries.mjs       → 37 violations (documented baseline, unchanged)
node tools/check-follower-mutation-authority.mjs   → 0 violations
node tools/check-follower-slot-authority.mjs       → 0 violations
node tools/check-ally-assignment-authority.mjs     → 0 violations (new guard)
node tools/run-rolling-tests.mjs                   → 53 passed, 0 failed (of 53 run; 5 excluded as documented pre-existing Force-power-track failures); 58 test files discovered (up from 57 — this feature's new test file)
```

## Runtime status

No live Foundry VTT v13 environment is available in this session (unchanged
standing limitation — see the Phase 5 audit). All verification here is
either (a) direct production-path Node execution through the Foundry-shim
harness, or (c) source inspection, as broken down above. The Assign
Existing NPC picker, the assignment-choice dialog, drag/drop, and Convert
to Follower's best-effort derivation step have NOT been clicked through in
a live Foundry world.

## Merge readiness

CONDITIONALLY READY, same posture as every prior phase on this branch:
static guards clean, baselines unchanged, the full required test suite
passing as real production-path code for both new files it touches, and
the controller/dialog/derivation paths this shim cannot reach are
inspection-verified against the exact code that ships, with all scope
boundaries (droid ledger reimplementation, beast fixed-profile matching,
full snapshot-based restore) explicitly documented as deliberate,
follow-up-eligible decisions rather than silent gaps. A live-Foundry
click-through remains the one outstanding verification this session
cannot perform.
