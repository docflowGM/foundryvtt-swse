# Vehicle Crew Assignment and Drag-and-Drop Repair — Phase 6

Stacked directly on Phase 5 (`claude/rolling-system-alignment-phase-5`,
commit `c1afd8c`), which stacks on Phases 1-4 (PRs #928-#931) and is itself
PR #932. This phase's branch is `claude/vehicle-crew-assignment-phase-6`.
No prior phase PR was merged, squashed, reverted, or bypassed.

Scope is deliberately narrow: the vehicle-sheet crew-management UI and its
station-assignment contract. No rolling-system refactor, no changes to
attack formulas, no changes to unrelated vehicle sheet UI.

## Baseline branch/commit

- Base: `claude/rolling-system-alignment-phase-5` @ `c1afd8c` ("Phase 5
  rolling-system alignment: interactive full-attack reroll, CI, integration
  hardening").
- This phase's branch: `claude/vehicle-crew-assignment-phase-6`, created
  from that commit with no other commits in between.

## Reported defect (as given)

- Vehicle crew stations could not be assigned.
- Assign Crew controls did not work.
- Dragging an Actor onto a crew station did not work.
- Crew station state could not be configured reliably (multi-gunner,
  custom stations).

## Vehicle sheet class / lifecycle trace

There is only one registered sheet class for all four actor types
(character/npc/droid/vehicle): `SWSEV2CharacterSheet`
(`scripts/sheets/v2/character-sheet.js`), registered once per type via
`Actors.registerSheet("swse", SWSEV2CharacterSheet, {types:[type],
makeDefault:true})` in `index.js`. It extends
`ShellHostMixin(HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2))`
— genuine ApplicationV2, not a legacy sheet, and not a native `dragDrop`
config (`static dragDrop` does not exist anywhere in this codebase — all
drag/drop is manual `addEventListener` wiring).

**Root cause, confirmed by direct read of `_onRender()`
(`character-sheet.js`, around line 2509):**

```js
if (this.document?.type === 'vehicle') {
  this._wireVehicleActorModeEvents(root, signal);
  ...
  this._wireShellEvents(root, signal);
  return;
}

// Wire listeners to the sheet root
this.activateListeners(root, { signal });
```

For `document.type === 'vehicle'`, `_onRender()` calls
`_wireVehicleActorModeEvents()` and then **returns before
`activateListeners()` runs**. `activateListeners()` /
`_activateListenersInternal()` / `_activateCombatUI()` — where the generic
`dragover`/`drop` root listeners and Phase 3's `vehicle-crew-skill` button
binding lived — are **never reached for vehicle-type actors**.
`_onDrop(event)` (the sheet's own drop handler, fully implemented for
Item/Actor drops via `DropResolutionEngine`) is likewise unreachable, since
nothing on the vehicle path ever calls it.

This is the true root cause, and it is bigger than the reported symptom:
it also meant the Phase-3-delivered "Fire weapon" button
(`vehicle-crew-skill`, bound in the unreachable `_activateCombatUI`) was
dead code too, not just the newer assign/open/remove/drop actions. Phase 3
added a correct listener in a location vehicles never render through.

The actual reachable listener path for vehicles is
`_wireVehicleActorModeEvents(root, signal)`, called directly from the
vehicle branch above. Before this phase, it bound `sheet-tab`,
condition-track controls, `open-owned`/`remove-owned`, `roll-weapon`/
`roll-weapon-attack` (dead — no vehicle template uses this data-action;
the live per-weapon Fire button is `vehicle-crew-skill`, see below),
`repair-subsystem`, `shield-focus`/`shield-equalize`, `power-adjust`,
`set-maneuver`, `set-order`, `advance-phase`/`reset-turn`, `save-vehicle`,
`customize-vehicle` — and **zero drag/drop binding of any kind**.

## Button-action / drop call graph (confirmed orphaned handlers)

Confirmed via repo-wide grep, before this phase's changes:

- `vehicle-assign-crew` / `vehicle-open-crew` / `vehicle-remove-crew`:
  rendered by `vehicle-crew-assignment-panel.hbs`, zero listeners anywhere.
- `data-drop-zone="crew-station"` rows: rendered, zero drop listeners
  anywhere. (A guard already existed in the unreachable generic drop path —
  `if (event.target?.closest?.('[data-drop-zone="crew-station"]...'))
  return;` — proving the architecture was designed to let a station-level
  handler take priority, but that handler was never built.)
- `vehicle-crew-skill`: rendered by both `vehicle-crew-assignment-panel.hbs`
  (per-station skill actions) and `vehicle-weapon-mount-panel.hbs` (the
  actual per-weapon Fire button, carrying `data-weapon-id`); bound only in
  the unreachable `_activateCombatUI`.
- `VehicleCrewAssignmentService` (`scripts/engine/crew/`): fully
  implemented (drop decode, picker, assign, remove, open-sheet) but not
  imported by any live listener code.
- `VehicleDropEngine` (`scripts/engine/interactions/`): a pure, sovereign
  drop-classification resolver with correct weapon/cargo/crew routing —
  confirmed via grep to have **zero callers outside its own definition
  file**.
- `crew-resolver.js#resolveVehicleCrewStations`: a well-built dynamic
  station resolver (multi-gunner, custom stations) — confirmed to have
  exactly two importers, itself and the dead `vehicle-sheet/context.js`,
  which itself has zero external importers. Orphaned in practice.
- The LIVE panel builder, `vehicle-context-builder.js#buildVehicleCrewAssignmentPanel`,
  used its own independent hard-coded
  `['pilot','copilot','gunner','engineer','shields','commander']` array —
  completely disconnected from `crew-resolver.js`'s dynamic model.

## Station model — before and after

**Before:** three independent, inconsistent station representations:

1. `crew-resolver.js` (dynamic: base 5 roles + `weaponStations()` +
   `customStations()`) — orphaned, never reached the live sheet.
2. `vehicle-context-builder.js#buildVehicleCrewAssignmentPanel` — its own
   hard-coded 6-key array, the one actually rendered.
3. `VehicleCrewAssignmentService` — its own hard-coded `CREW_STATIONS`
   6-key array, plus `normalizeKey(value, fallback='pilot')`, which
   silently returned `fallback` for **any** unrecognized key — the exact
   silent-coercion-to-pilot bug reported (`gunner-2` or any custom slug
   would have silently written to `pilot` or the first empty station).

A real bug was also found and fixed in `crew-resolver.js#weaponStations()`:
`key` used `gunner-2` (hyphenated) while `sourceKey` used `gunner2`
(not hyphenated) — an inconsistency that would have made storage lookups
check the wrong key for every gunner past the first, even if the resolver
had been wired up as-is.

**After:** one authoritative source, `crew-resolver.js#resolveVehicleCrewStations`.
Each station descriptor now carries
`{key, storageKey, role, label, reason, source, custom, required,
assignable, removable, assigned, empty, occupant, crew, skills,
skillSummary, fallback}`. `storageKey` is the literal
`system.crewPositions` key (today always identical to `key` — no separate
storage-indirection layer exists — but callers reference `storageKey`
explicitly per the spec's descriptor shape). `source` distinguishes
`'base'` / `'weapon'` (dynamic gunner stations) / `'custom'`
(`system.stations`).

- `vehicle-context-builder.js#buildVehicleCrewAssignmentPanel` now calls
  `resolveVehicleCrewStations({system, weapons: {count}})` directly instead
  of its own array — the live panel now renders whatever stations the
  vehicle actually has (multiple gunners, custom stations).
- `VehicleCrewAssignmentService.resolveStations(vehicle)` calls the same
  resolver. `canonicalStationKey(vehicle, value)` matches the requested key
  against the vehicle's real station set (direct match first, then a small
  legacy-word alias table for `co-pilot`/`co_pilot`/etc. — not a
  fallback table). **An unrecognized key returns `null` — never `'pilot'`,
  never a first-empty-station default.** `assignCrew`/`removeCrew`/
  `openCrewPicker`/`openCrewSheet`/`buildAssignmentUpdate`/
  `buildRemovalUpdate` all resolve through `canonicalStationKey` and fail
  clearly (structured `{ok:false, error}` + a user notification) on an
  unknown station, rather than silently redirecting.
- `crew-resolver.js`'s `shouldShowStation()` conditional-visibility logic
  (copilot/engineer/shields/commander only shown when "needed") is kept
  defined but **intentionally not applied** — the previously-live hardcoded
  panel always rendered all six base stations, and this phase does not
  introduce new station-hiding behavior; it only unifies the station *set*
  (adds multi-gunner/custom, fixes the key bug). All base/weapon/custom
  stations are always included.
- `VehicleCrewAssignmentService.stationKeys` (a getter returning the fixed
  six) is retained only for callers that want the base-role list; it is
  documented as not authoritative for a specific vehicle's dynamic set.

## Canonical crew storage decision

`system.crewPositions` (keyed directly by station key, e.g. `pilot`,
`gunner-2`, a custom slug) is canonical — it is the **only** field
`crew-skill-router.js#resolveVehicleCrewActor`/`getCrewEntry` reads for
attack-operator resolution, and reading it directly (not through a second
lookup) is what makes "assignment data read by attack routing is the same
data written by the assignment service" true by construction: the
assignment service's `canonicalStationKey()`-resolved `targetStation` is
written to `system.crewPositions.<targetStation>`, and the skill router
reads `system.crewPositions[stationKey]` for the exact key passed in from
the same rendered station row's `data-station` attribute.

`system.ownedActors` / `system.relationships` remain write-through
compatibility mirrors (still written atomically alongside the canonical
field by `buildAssignmentUpdate`/`buildRemovalUpdate`, since
`vehicle-context-builder.js`'s legacy occupant-scan fallback and other
display code may still read them) but are not required for combat
correctness. `crew-resolver.js#stationCrew()` now also has a read-only
legacy fallback to `ownedActors` for stations with no `crewPositions`
entry, for pre-Phase-6 save compatibility, without writing anything back
through that path. `system.stations` (custom-station definitions) remains
schema-undeclared, read-only input from world data — no live writer is
added or expected in this phase.

## Mutation authority

`VehicleCrewAssignmentService.assignCrew`/`removeCrew` previously fell back
to a **direct `vehicle.update()`** call when `ActorEngine.updateActor`
threw. That fallback wrote `system.crewPositions` only, silently dropping
the `ownedActors`/`relationships` mirror writes out of sync with a
successful write — a confirmed drift bug. The fallback has been removed
entirely. `ActorEngine.updateActor` is now the sole mutation path; a
failure is caught, logged via `SWSELogger.error`, and surfaced through both
a `ui.notifications.error` call and a structured result — no partial
writes, no silent success.

`assignCrew`/`removeCrew` now return
`{ok, station, crewActorUuid, mutationReceipt, warnings, error}` instead of
a bare boolean. `mutationReceipt` is `ActorEngine.updateActor`'s own return
value (the atomic-update result). `openCrewPicker` checks `result.ok`
before treating the picker's outcome as a successful assignment.

## Permissions behavior

`VehicleCrewAssignmentService.canEdit(vehicle)` is `vehicle?.isOwner ===
true` (the same `actor.isOwner` pattern already used elsewhere in
`character-sheet.js` for edit-mode gating). `assignCrew`/`removeCrew`/
`openCrewPicker` all check it first and reject with a clear notification
before doing any other work. `openCrewSheet` does **not** require vehicle
edit permission — opening a crew member's own sheet is governed by that
actor's own Foundry permissions, not the vehicle's, per spec.

Compendium-derived actors (`isCompendiumActor()`: has a `.pack`, a
`.compendium` getter, or is absent from `game.actors`) are rejected with an
explicit message asking the user to import them first — they are never
cloned into the world.

`buildVehicleCrewAssignmentPanel` now computes `editable = actor.isOwner`
and threads it into each station (`station.editable`, `station.dropzone`).
`vehicle-crew-assignment-panel.hbs` only renders the
Assign/Reassign/Open/Remove controls and the `data-drop-zone="crew-station"`
attribute (making the row an interactive drop target at all) when
`station.editable` is true; a non-editable, occupied station still shows a
read-only "Open Sheet" button (Foundry's own sheet-open permission still
applies there). Non-owners therefore see a read-only panel with no
interactive drop target, not just a rejected click.

## Picker reliability

`openCrewPicker()`'s `SWSEDialogV2.prompt()` usage was audited against the
actual dialog implementation (`scripts/apps/dialogs/swse-dialog-v2.js` +
`scripts/utils/dom-query-shim.js`), not assumed:

- `SWSEDialogV2.wait()`'s `_handleAction()` passes `domQuery(root)` to the
  button callback — a small jQuery-like `DomQueryList` wrapper that
  genuinely implements `.find()`/`.val()`. `openCrewPicker`'s callback,
  `html?.find?.('[name="crewUuid"]')?.val?.()`, is therefore correct
  against the real v13 shape used by this codebase — not a bug.
  `html?.[0]?.querySelector?.(...)?.value` is a harmless secondary
  fallback (`DomQueryList` also exposes indexed access to its underlying
  elements).
- The Cancel button's callback returns `null` explicitly, and `wait()`
  resolves the outer promise with that `null` — confirmed, so
  `openCrewPicker`'s `if (!chosenUuid) return null;` correctly performs
  **no mutation** on cancel.
- Lists only `character`/`npc`/`droid` actors (`listEligibleCrewActors`),
  excludes the vehicle itself by id, shows type in the option label,
  pre-selects the current occupant by uuid.
- Assigning an actor already in another station **moves** them
  (`buildAssignmentUpdate` clears any other station holding that same
  actor) rather than duplicating the assignment or asking for confirmation
  — this matches the pre-existing intended rule in the code (unchanged
  behavior, now correctly reachable).

No changes were made to `SWSEDialogV2` itself — its contract was already
correct; the defect was entirely in reachability, not the dialog.

## Drag-and-drop behavior

New module: `scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js`,
exporting `bindVehicleCrewAssignmentControls(sheet, root, {signal})`,
called once from `_wireVehicleActorModeEvents` (the reachable vehicle
listener path). It binds:

1. **Assign/Open/Remove buttons** — delegate directly to
   `VehicleCrewAssignmentService`. Each button is disabled while its async
   handler runs and re-enabled in a `finally` block (prevents double
   execution / duplicate dialogs on rapid double-click).
2. **`vehicle-crew-skill` buttons** — relocated here from the dead
   `_activateCombatUI` copy (which has been deleted, not duplicated) and
   still call `rollVehicleCrewSkill(vehicle, station, skill, {weaponId})`
   unchanged. This is what actually restores the weapon-mount panel's Fire
   button, which is the live per-weapon firing path (`roll-weapon`/
   `roll-weapon-attack`, also bound in `_wireVehicleActorModeEvents`, is
   confirmed dead — no vehicle template uses that data-action; it calls
   `_runCanonicalAttack()` with `this.actor` — the vehicle itself — as the
   attacker with no operator/vehicleActor context, which is NOT the
   correct path and is left as pre-existing, unused dead code, out of this
   phase's scope to remove).
3. **Station-level drag-and-drop** — `dragenter`/`dragover`/`dragleave`/
   `drop` bound per `[data-drop-zone="crew-station"][data-crew-station]`
   row (only rendered at all when the station is editable). `dragover`
   calls `preventDefault()` (required for `drop` to fire). Hover state uses
   the existing, previously-unused `swse-vehicle-station-row--drop-hover`
   CSS class already defined in `styles/sheets/v2-vehicle-sheet.css` — the
   drop-hover styling had been designed but never wired to any JS. `drop`
   decodes the payload via
   `VehicleCrewAssignmentService.getDropDataFromEvent`/
   `resolveCrewActorFromDropData` (existing, reused, not reimplemented),
   assigns to the **exact** station the row represents (`row.dataset.crewStation`,
   never a first-empty fallback), stops propagation so the generic
   sheet-level handler never double-processes the same drop, and calls
   `assignCrew` exactly once. An unresolvable drop (Item, JournalEntry,
   Scene, vehicle Actor, wrong actor type, self) is rejected with a
   specific reason via the new `describeDropRejection()` helper (shares its
   document-resolution step with the happy-path resolver — one lookup
   implementation, not two).
4. **Generic (non-station) drop routing** — `VehicleDropEngine` gets its
   first live caller. Weapon/cargo Item drops and vehicle-to-vehicle/
   self/unsupported-actor rejections route through its existing, unchanged
   classification logic; the resulting mutation plan is applied via
   `ActorEngine.apply()` (the correct universal mutation-plan acceptor,
   confirmed by reading its contract — not `ActorEngine.updateActor`
   directly, since `VehicleDropEngine`'s plans use `createEmbedded`/
   `updateEmbedded`/`update` shapes). An Actor dropped anywhere that is
   **not** a specific station row is rejected with an explicit
   "drop onto a station row" notification —
   `VehicleDropEngine._handleActorDrop` was changed to require a non-null
   `station` and reject (rather than silently defaulting to pilot/
   first-empty) when none is given, closing the one remaining silent-
   fallback path the spec called out.

One drop event produces at most one mutation: station rows call
`stopPropagation()`/`stopImmediatePropagation()` on success, and the
generic handler explicitly skips any drop whose target is inside a station
row (`event.target?.closest?.(STATION_ROW_SELECTOR)`), mirroring the
pre-existing passthrough-guard idiom already present (unreachable) in the
character-mode drop handler.

## Multi-gunner / custom-station behavior

Because the station model is now unified, `gunner-2`/`gunner-3`/... and any
`system.stations` custom entry:

- Render as real rows in the live panel (`buildVehicleCrewAssignmentPanel`
  now derives its station list from the same resolver that already
  generated them).
- Are individually assignable via both the picker and drag-and-drop
  (`canonicalStationKey` matches them directly against the vehicle's
  resolved station set).
- Persist independently: `buildRemovalUpdate` only ever writes
  `system.crewPositions.<exact targetStation>`; removing `gunner-2` cannot
  clear `gunner`, and removing a custom station cannot clear `pilot`.
- Are read correctly by attack routing: `crew-skill-router.js` already
  accepted arbitrary string station keys (it was never hard-coded to the
  fixed six) — it was the assignment/write side that couldn't reach those
  keys before this phase.

## Attack integration re-verification

No attack formula, no `AttackOutcomeResolver` behavior, and no
`vehicle-attack-math.js` code was touched this phase. What changed is that
`system.crewPositions` can now actually receive `gunner-2`/custom-station
keys from the UI. Verified (source-level, see
`tests/phase6-vehicle-crew-assignment.test.mjs`):

- `crew-skill-router.js#getCrewEntry` reads
  `system.crewPositions[stationKey]` directly for whatever key the click
  handler passes (`button.dataset.station`, which is the exact
  `station.key` the panel/mount-panel rendered) — the same field/keying the
  assignment service now correctly writes to for dynamic stations.
- Removing an assigned gunner returns that station to `resolveVehicleCrewActor`'s
  existing `'unassigned'` (abstract Crew Quality) result — unchanged Phase 3/4
  behavior, now actually reachable.
- A broken/stale crew reference still resolves to the existing `'invalid'`
  source and the existing "assignment could not be resolved" warning path —
  not silently treated as unassigned.
- No second, independent crew-lookup implementation was added for attack
  routing — the static guard added this phase (`check-vehicle-crew-assignment-guard.mjs`)
  asserts `crew-skill-router.js` reads `system.crewPositions` directly.

## Defects confirmed

1. **Root cause (bigger than reported):** `_onRender()` returns early for
   vehicle-type documents before `activateListeners()` runs, so the entire
   character-mode listener/drop-wiring path — including Phase 3's
   `vehicle-crew-skill` binding — was unreachable for vehicles.
2. Assign/Open/Remove crew buttons: rendered, zero listener anywhere.
3. Crew-station drop zones: rendered, zero drop listener anywhere.
4. `VehicleDropEngine`: zero live callers anywhere in the repo.
5. Station-model mismatch: three independent, inconsistent station
   representations (dynamic resolver, live panel's hard-coded 6-array,
   assignment service's hard-coded 6-array + silent-fallback normalizer).
6. `crew-resolver.js#weaponStations()`: `key`/`sourceKey` hyphenation
   mismatch (`gunner-2` vs `gunner2`) that would have broken storage
   lookups for every gunner past the first even if wired up as-is.
7. `VehicleCrewAssignmentService.assignCrew`/`removeCrew`'s direct
   `vehicle.update()` fallback wrote `crewPositions` only, silently
   dropping the `ownedActors`/`relationships` mirrors out of sync with a
   successful write.
8. No permission checks anywhere in the assignment service before this
   phase.
9. `styles/sheets/v2-vehicle-sheet.css`'s `--drop-hover` station style was
   defined but never applied by any JS (now used).

## Suspected defects not confirmed / out of scope this phase

- The weapon-mount panel's per-station "Attack" quick-action (rendered by
  `crew-skill-router.js#getStationSkillActions`'s `attack` entry inside the
  crew-assignment panel specifically, as opposed to the weapon-mount
  panel's own per-weapon button) has no `weaponId` in its template markup
  (`vehicle-crew-assignment-panel.hbs` never sets `data-weapon-id`), so
  clicking it will correctly warn "No vehicle weapon found for this gunner
  action" rather than firing anything. This is a pre-existing template gap
  in a secondary/redundant affordance (the weapon-mount panel's own Fire
  button, which does carry `data-weapon-id`, is the real per-weapon firing
  UI and works correctly once wired this phase). Not fixed — out of the
  "vehicle crew assignment UI and drag-and-drop" scope; flagged for a
  future pass if the redundant crew-panel Attack action is meant to be kept.
- `roll-weapon`/`roll-weapon-attack` bindings in `_wireVehicleActorModeEvents`
  are confirmed dead (no vehicle template renders that data-action) and
  would, if ever wired to a template, roll with the vehicle itself as
  attacker (no operator resolution) — left untouched as pre-existing,
  currently-inert code; removing dead bindings unrelated to crew assignment
  was judged out of scope.
- Whether a character-type sheet can ever host vehicle crew-station markup
  via the shell-surface system (`_wireShellEvents`/`ShellRouter`) — the
  existing passthrough guard comment in the (unreachable-for-vehicles)
  generic drop handler suggested this might be possible. Investigated:
  `document.type` is fixed per sheet instance and template selection keys
  off it; the shipyard/customization "surface" edits the vehicle's own
  sheet in-place (`targetActorId` is the vehicle's own id), not a
  character's. No live path found where a character-type document renders
  vehicle crew-panel templates. Documented here rather than silently
  assumed away.

## Exact files changed

- `scripts/sheets/v2/vehicle-sheet/crew-resolver.js` — fixed `sourceKey`
  bug; added `storageKey`/`source`/`assignable`/`removable` fields; added
  `ownedActors` legacy read-fallback; removed the previously-dead
  visibility-filtering step (documented, not deleted — kept available).
- `scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js` —
  `buildVehicleCrewAssignmentPanel` now derives its station set from
  `resolveVehicleCrewStations` instead of a hard-coded array; added
  `editable`/`dropzone` fields for permission-gated rendering.
- `scripts/engine/crew/vehicle-crew-assignment-service.js` — station
  validation reworked around the dynamic resolver (`canonicalStationKey`,
  no fallback-to-pilot/first-empty); removed the direct `vehicle.update()`
  fallback; `assignCrew`/`removeCrew` return structured results; added
  `canEdit`/permission checks; added compendium-actor rejection; added
  `describeDropRejection`/shared `_resolveDropCandidates`.
- `scripts/engine/interactions/vehicle-drop-engine.js` —
  `_handleActorDrop` now rejects (rather than silently assigning) an Actor
  dropped with no station target.
- `scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js`
  (new) — `bindVehicleCrewAssignmentControls`: button clicks, station
  drag-and-drop, `vehicle-crew-skill` binding, generic drop routing.
- `scripts/sheets/v2/character-sheet.js` — calls
  `bindVehicleCrewAssignmentControls` from `_wireVehicleActorModeEvents`;
  removed the dead `vehicle-crew-skill` binding (and its now-unused
  `rollVehicleCrewSkill` import) from the unreachable-for-vehicles
  `_activateCombatUI`.
- `templates/actors/vehicle/v2/partials/vehicle-crew-assignment-panel.hbs`
  — gates the drop-zone attribute and mutation controls on
  `station.editable`/`station.dropzone`; still shows a read-only Open Sheet
  button for a non-editable, occupied station.
- `.github/workflows/rolling-system-validation.yml` — added the Phase 6
  guard step.
- `tests/phase3-vehicle-operator-resolution.test.mjs` — updated to point
  at the new (actually reachable) binding location instead of the old
  dead one in `character-sheet.js` directly.

## Tests added

- `tests/phase6-vehicle-crew-assignment.test.mjs` — static source-text
  guard covering: controller reachability and single-binding; button
  wiring and pending-state guards; station drag-and-drop (preventDefault,
  exact-station targeting, rejection messaging, single-mutation,
  no-fall-through); generic drop routing and VehicleDropEngine's first live
  caller; station-model unification (sourceKey fix, storageKey field,
  live panel using the dynamic resolver, service validating against it);
  no-fallback-to-pilot/first-empty; removal touching exactly one station;
  reassignment clearing only the prior station; ActorEngine-only mutation
  (no `vehicle.update()`/`actor.update()` fallback); structured result
  shape; permission checks (owner-only, compendium-actor rejection,
  editable-gated template rendering); picker cancel-performs-no-mutation
  ordering; stale-reference open-sheet messaging; attack-routing reading
  the same `crewPositions` field the service writes; no duplicate
  hard-coded station list outside the documented legacy getter.
- `tests/vehicle-crew-assignment-guard-check.test.mjs` — smoke test for
  the new guard tool (report mode and `--strict` both exit 0).

## Guards added or updated

- `tools/check-vehicle-crew-assignment-guard.mjs` (new) — checks: every
  rendered crew-action `data-action` has a live handler; every crew-station
  drop zone has a live drop binder; no direct `actor`/`vehicle`/
  `crewActor`/`droppedActor`.update() call inside the crew-assignment
  engine files; no second independent hard-coded 6-station array outside
  the documented legacy getter; station-key resolution never falls back to
  `'pilot'` or a first-empty default; the attack-operator lookup reads the
  same `system.crewPositions` field the assignment service writes. Passes
  in `--strict` mode.
- `tests/phase3-vehicle-operator-resolution.test.mjs` — updated (not
  weakened) to assert the listener now lives in
  `vehicle-crew-assignment-controls.js`, reachable from
  `_wireVehicleActorModeEvents`, instead of the old dead location.

## Commands run

```
node tools/run-rolling-syntax-check.mjs
node tools/run-rolling-tests.mjs
node tools/check-combat-math-ssot.mjs --strict
node tools/check-attack-outcome-ssot.mjs --strict
node tools/check-critical-confirmation-guard.mjs --strict
node tools/check-reroll-supersession-guard.mjs --strict
node tools/check-vehicle-attack-routing-guard.mjs --strict
node tools/check-full-attack-reroll-guard.mjs --strict
node tools/check-vehicle-crew-assignment-guard.mjs --strict
```

## Test results

- Syntax check: 2075 files checked, 2 documented pre-existing exclusions,
  all pass.
- Rolling-system test suite: 36 of 36 run pass (5 documented pre-existing
  Force-power-track exclusions, unrelated to this work).
- All 7 guards (6 pre-existing + this phase's new one) pass in `--strict`
  mode with zero findings.

## Runtime test matrix

Foundry VTT v13 was not launched in this environment — no runtime
verification was performed. Every row below is **pending**; only static
source-code correctness (reachability, exact-station targeting, mutation
authority, permission checks) has been verified. Anything not covered by
the static guards/tests above (actual dice-roll output, actual DOM click/
drag events, actual chat rendering, actual document persistence across a
real reload) remains unverified.

| # | Scenario | Expected | Actual | Status |
|---|----------|----------|--------|--------|
| 1 | GM assigns pilot via picker | Pilot station shows assigned actor | — | Pending |
| 2 | GM assigns pilot via drag | Pilot station shows assigned actor | — | Pending |
| 3 | GM assigns gunner via picker | Gunner station shows assigned actor | — | Pending |
| 4 | GM assigns gunner via drag | Gunner station shows assigned actor | — | Pending |
| 5 | GM assigns gunner-2 (multi-weapon vehicle) | gunner-2 independently assigned | — | Pending |
| 6 | GM assigns a custom station (system.stations) | Custom station assignable and persists | — | Pending |
| 7 | Reassign an occupied station | Prior occupant replaced, button reads Reassign | — | Pending |
| 8 | Move an actor from gunner to gunner-2 | gunner cleared, gunner-2 set, no duplicate occupancy | — | Pending |
| 9 | Remove assigned crew | Station cleared, mirrors updated | — | Pending |
| 10 | Remove a stale/broken crew reference | Removable even though actor no longer resolves | — | Pending |
| 11 | Open assigned crew's sheet | Crew actor's sheet opens | — | Pending |
| 12 | Drag a character onto a station | Assigned | — | Pending |
| 13 | Drag an NPC onto a station | Assigned | — | Pending |
| 14 | Drag a droid onto a station | Assigned | — | Pending |
| 15 | Drag a vehicle actor onto a station | Rejected with reason, no assignment | — | Pending |
| 16 | Drag an Item onto a station | Rejected with reason; cargo/weapon drop elsewhere still works | — | Pending |
| 17 | Drop an actor outside any station | Rejected with "drop onto a station row" instruction | — | Pending |
| 18 | Player who owns the vehicle assigns crew | Succeeds | — | Pending |
| 19 | Observer (no update permission) attempts assignment | Panel is read-only; no drop target; no controls | — | Pending |
| 20 | Close and reopen the vehicle sheet | Assignments persist | — | Pending |
| 21 | Reload the browser | Assignments persist | — | Pending |
| 22 | Linked vehicle token | Assignments persist and are visible via token sheet | — | Pending |
| 23 | Unlinked (synthetic) vehicle token | Assignments persist on the synthetic actor | — | Pending |
| 24 | Assigned gunner fires a weapon | Attack uses gunner's BAB + vehicle INT (Phase 3 formula) | — | Pending |
| 25 | Assigned pilot fires a pilot-operated weapon | Attack uses pilot's BAB + vehicle INT | — | Pending |
| 26 | Remove an assigned gunner, fire again | Falls back to abstract Crew Quality formula | — | Pending |
| 27 | Multi-weapon vehicle, gunner vs gunner-2 both assigned | Each weapon resolves its own station's operator | — | Pending |
| 28 | Double-click Assign Crew rapidly | Only one picker dialog opens | — | Pending |
| 29 | Drop the same actor on a station twice quickly | Exactly one mutation, no duplicate notification | — | Pending |
| 30 | Full session (assign, drag, remove, fire) | No console errors | — | Pending |

## Merge order

Unchanged from Phase 5: #928 → #929 → #930 → #931 → #932, with this
phase's PR stacked on top of #932 (base branch
`claude/rolling-system-alignment-phase-5`). No prior PR is merged, closed,
or altered by this phase.

## Remaining risks

- The runtime matrix above is entirely unverified without a live Foundry
  v13 world — the static guards check reachability and exact-targeting
  logic, not actual browser drag-event behavior or actual chat/dice output.
- The crew-assignment panel's own "Attack" quick-action still lacks a
  `weaponId` (documented above as a pre-existing, out-of-scope gap) — a
  user could click it and get a harmless "no weapon found" warning; the
  weapon-mount panel's own Fire button is the correct, now-working
  affordance for actually firing a weapon.
- `system.stations` (custom station definitions) has no live writer
  anywhere in this codebase — custom stations are only assignable if some
  other system (GM macro, module, manual data edit) populates
  `system.stations` first. This phase makes them assignable once present;
  it does not add UI to create them.

## Final summary

**Root cause:** `_onRender()` returns early for vehicle-type actors before
`activateListeners()` runs, so the entire character-mode listener/drop
path — including Phase 3's `vehicle-crew-skill` binding — was unreachable.
This is bigger than the reported symptom: it also silently broke the
weapon-mount panel's Fire button, not just crew assignment.

**Fixed:** Assign/Open/Remove crew buttons, station-level Actor
drag-and-drop, generic weapon/cargo drop routing (via `VehicleDropEngine`'s
first live caller), and the `vehicle-crew-skill` Fire button are all now
bound from `_wireVehicleActorModeEvents` — the listener path vehicles
actually use — via a new focused module,
`vehicle-crew-assignment-controls.js`.

**Drag and drop:** Station rows are functional Actor drop targets with
hover feedback (an existing, previously-unused CSS class), specific
rejection messaging for invalid drops, and no double-processing against
the generic sheet-level drop handler. An Actor dropped outside a station
is rejected with instructions rather than silently assigned.

**Station model:** Unified on `crew-resolver.js#resolveVehicleCrewStations`
as the single authoritative source (fixing a real `sourceKey` hyphenation
bug along the way). The live panel and the assignment service both defer
to it; multi-gunner (`gunner-2`, `gunner-3`, ...) and custom
(`system.stations`) stations are now rendered and independently
assignable. Unknown station keys fail clearly — never coerced to `pilot`
or a first-empty default.

**Permissions:** Only vehicle owners can assign/remove crew; non-owners see
a read-only panel with no interactive drop target. Opening a crew member's
sheet follows that actor's own permissions. Compendium actors are rejected
rather than cloned.

**Mutation safety:** The direct `vehicle.update()` fallback (which
silently dropped compatibility-mirror writes on ActorEngine failure) is
removed. `ActorEngine.updateActor` is the sole mutation path;
`assignCrew`/`removeCrew` return a structured `{ok, station, crewActorUuid,
mutationReceipt, warnings, error}` result instead of a boolean.

**Attack integration:** No formula changed. Verified that attack routing
(`crew-skill-router.js`) reads the exact `system.crewPositions` field/key
the assignment service now correctly writes for dynamic stations — no
second crew-lookup implementation.

**Tests:** One new comprehensive static-guard test file
(`phase6-vehicle-crew-assignment.test.mjs`) plus a guard smoke test; one
existing Phase 3 test updated to point at the new (actually reachable)
binding location. All 36 rolling-system tests and all 7 guards
(`--strict`) pass; full syntax check passes.

**Runtime results:** Not verified — Foundry VTT v13 was not launched in
this environment. All 30 runtime-matrix rows are pending; nothing in this
summary claims otherwise.

**Remaining risks:** See "Remaining risks" above — runtime behavior is
unverified, the crew-panel's own Attack quick-action still lacks a
weaponId (pre-existing, documented, out of scope), and custom stations
have no UI to create them (only to assign once they exist).
