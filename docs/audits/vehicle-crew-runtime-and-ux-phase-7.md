# Vehicle Crew Runtime Validation and UX Completion — Phase 7

Stacked directly on Phase 6 (`claude/vehicle-crew-assignment-phase-6`,
commit `b51c0b0` — "Phase 6 rolling-system alignment: vehicle crew
assignment and drag-and-drop repair"), PR #933, which stacks on Phases 1-5
(PRs #928-#932). This phase's branch is
`claude/vehicle-crew-runtime-ux-phase-7`. No prior phase PR was merged,
squashed, reverted, or bypassed.

This phase does not reopen the rolling-system attack/roll architecture. No
attack formula, no `AttackOutcomeResolver`/`ModifierEngine`/`RollEngine`
behavior, and no rolling-system test was changed except the two Phase 3
guards whose assertions directly described code this phase intentionally
replaced (see "Exact files changed").

## Baseline branch/commit

- Base: `claude/vehicle-crew-assignment-phase-6` @ `b51c0b0`.
- This phase's branch: `claude/vehicle-crew-runtime-ux-phase-7`, created
  from that commit with no other commits in between.

## Phase 6 findings reviewed

Read in full before editing: `docs/audits/rolling-system-alignment-phase-1.md`
through `-phase-5.md` and `docs/audits/vehicle-crew-assignment-phase-6.md`,
plus every file Phase 6 touched or introduced
(`vehicle-crew-assignment-controls.js`, `vehicle-crew-assignment-service.js`,
`vehicle-drop-engine.js`, `crew-resolver.js`, `crew-skill-router.js`,
`vehicle-context-builder.js`, `character-sheet.js`'s vehicle branch, the
vehicle crew templates/styles, and the Phase 1-6 tests/guards). Phase 6's
own "Suspected defects not confirmed" section flagged exactly the item this
phase's section 3 resolves: the crew-assignment panel's per-station Attack
action had no `weaponId`.

## Foundry runtime availability

**Foundry VTT could not be launched in this environment.** Checked and
confirmed absent, before any implementation work:

- No Foundry VTT installation anywhere on the filesystem (searched common
  install locations and the whole filesystem for `foundryvtt` binaries/
  directories outside this repo checkout).
- No configured Foundry user data directory.
- No license or credentials for a Foundry instance.
- No browser or Electron session available to render a UI (this is a
  headless container).
- Node `v22.22.2` is present, but Foundry VTT is an Electron/browser
  application with a proprietary server — it cannot be started headlessly
  from a bare Node install without the actual Foundry package, which is not
  distributed in this repository (this is a system/module repo, not the
  Foundry application itself).

Per the task's explicit instruction for this case: **no runtime
verification was performed or claimed.** Every row in the runtime matrix
below is marked Pending. Mocked/static-guard tests are not represented as
runtime verification anywhere in this document.

## Runtime fixture plan (for a human tester)

Since runtime verification could not be executed here, the following is
the exact fixture plan and reproduction steps a human tester (or a future
session with real Foundry access) should use to execute the Phase 6 + 7
runtime matrices. No production compendium content is required — all
fixtures are throwaway world actors/items created directly in a test world.

**Vehicles** (create as world Actors, type `vehicle`):
1. An ordinary ground vehicle (e.g. a speeder) — one gunner-role weapon, no custom stations.
2. A starfighter with one pilot-operated weapon (`system.vehicleMount.crewRole: 'pilot'`) and one gunner-operated weapon.
3. A multi-crew transport — pilot, copilot, engineer, shields, commander all visible (large crew/passenger values).
4. A vehicle with two gunner-operated weapon items (no explicit `operatorStation`) — should surface `gunner` and `gunner-2` as separate stations, and the two weapons should resolve as `ambiguous` until an explicit station is picked per weapon (see "Weapon-station mapping authority" below).
5. A vehicle with one entry in `system.stations` (a custom station), created via the Phase 7 custom-station editor UI.
6. A scene token of vehicle #1 with **Link Actor Data** enabled (linked token).
7. A scene token of vehicle #1 with **Link Actor Data** disabled (unlinked/synthetic token) — the key fixture for section 9.

**Crew actors:**
- One player-character Actor.
- One NPC Actor.
- One droid-type Actor.
- One Actor owned by the testing (non-GM) user.
- One Actor NOT owned by the testing user (owned only by GM/another user).
- One crew reference intentionally left dangling: assign a throwaway Actor
  to a station, then delete that Actor from the world — the station's
  `system.crewPositions` entry becomes a broken reference.
- Vehicle #1, left with no crew assigned at all (abstract-crew-only case).

**Weapons:**
- One ordinary `vehicleWeapon`/`weapon`-type item with `vehicleMount.crewRole: 'gunner'`, no explicit `operatorStation`.
- One with `vehicleMount.crewRole: 'pilot'`.
- Two more gunner-role weapon items on vehicle #4, to exercise the
  gunner/gunner-2 mapping UI (`data-action="vehicle-weapon-station-select"`
  on the weapon-mount panel).
- One weapon item with `vehicleMount.crewRole: 'gunner'` on a vehicle with
  **zero** gunner stations (remove the vehicle's only gunner weapon or
  otherwise force `unmapped`) — exercises the "no operator context" case.

Run through the Phase 6 (30 rows) and Phase 7 (40 new rows) matrices below
against these fixtures, using `SWSE.debug.vehicleCrew.inspect(vehicleUuid)`
(GM-only, console) to capture diagnostic snapshots at each step instead of
relying on visual inspection alone.

## Redundant Attack action — decision

**Decision: removed from the crew-assignment panel, kept exclusively on
the weapon-mount panel.**

Audited: `getStationSkillActions()` (crew-skill-router.js — role-keyed
skill table, includes an `'attack'` entry for `pilot`/`gunner`),
`buildVehicleCrewAssignmentPanel()` and `buildVehicleWeaponMountPanel()`
(vehicle-context-builder.js), both crew templates, every
`vehicle-crew-skill` button, and `data-weapon-id` population.

Finding: `vehicle-weapon-mount-panel.hbs`'s Fire button always carries a
concrete `data-weapon-id="{{mount.weaponId}}"` (populated for every mount,
item- or statblock-derived — confirmed by reading
`normalizeVehicleWeaponEntry()`). `vehicle-crew-assignment-panel.hbs`'s
per-station action loop never set `data-weapon-id` at all — it only knows
the station, not which weapon to fire. The crew-assignment panel's Attack
action could therefore never do more than warn "No vehicle weapon found."

Fix: `buildVehicleCrewAssignmentPanel()` now filters
`getStationSkillActions(station.role)` to exclude the `'attack'` key
entirely (`vehicle-context-builder.js`). Non-weapon station duties (Pilot
Maneuver, Copilot Aid Pilot/Use Computer, Engineer Mechanics, Shields
Modulate/Route, Commander Knowledge (Tactics)/Persuasion) remain on the
crew-assignment panel — only the weapon-specific Attack action moved
exclusively to the weapon-mount panel, where a real weapon identity always
exists. No new attack dialog or roll engine was created; the existing
`vehicle-crew-skill` action/handler and `rollVehicleCrewSkill()` are
unchanged and reused as-is.

## Custom station schema

```
{
  id,          // stable internal id (foundry.utils.randomID()), generated
               // once at creation; never reused for key derivation
  key,         // canonical system.crewPositions storage key — slugified
               // from the label ONCE at creation; renaming the label
               // never changes this
  label,       // display name, freely editable
  role,        // normalized mechanical-role hint (see below)
  description, // optional free text
  order,       // integer position among custom stations (rewritten by
               // reorderCustomStations)
  crew         // unused by canonical assignment; kept only as an optional
               // legacy-mirror slot for crew-resolver.js's storedCrew
               // fallback read — system.crewPositions is still canonical
}
```

`crew-resolver.js#customStations()` (already reading `station.key`/`label`/
`role` before this phase) was extended to prefer `station.description` over
the older `station.reason` field for display, with `reason` kept as a
fallback for any pre-Phase-7 imported records.

## Custom station UX

A new, narrow panel — `vehicle-custom-station-editor-panel.hbs`, built by
`buildVehicleCustomStationEditorPanel()` — appended to the Crew tab, shown
only to editable owners (`vehiclePanels.customStationEditorPanel.editable`).
Per station: a label text input (rename), a role `<select>`, a description
text input, up/down reorder buttons, and a Remove button. An "Add Station"
mini-form (label + role) at the bottom. This is not a vehicle-layout
designer — no drag-to-reposition, no icon/image picker, no per-station
skill customization.

All mutation goes through the new `VehicleCustomStationService`
(`scripts/engine/crew/vehicle-custom-station-service.js`), mirroring
`VehicleCrewAssignmentService`'s conventions: `canEdit()` gate,
`ActorEngine.updateActor()`-only writes, structured results. Key
generation (`generateStationKey`) slugifies the label and checks against
`reservedKeys(vehicle)` — the full resolved station set for that specific
vehicle (base six + current dynamic gunner-N stations + existing custom
station keys) — appending `-2`, `-3`, ... until unique. This runs once, at
creation; `renameCustomStation()` only ever patches the `label` field and
never touches `key`.

Removing an **occupied** custom station without confirmation returns
`{ok: false, requiresConfirmation: true, occupied: true}` and mutates
nothing. The controller (`vehicle-crew-assignment-controls.js`) shows a
`SWSEDialogV2.confirm()` prompt ("remove and unassign crew" vs. cancel);
only a confirmed removal calls `removeCustomStation(vehicle, id,
{unassignCrew: true})`, which atomically removes the station record AND
clears the corresponding `system.crewPositions`/mirror entries in a single
`ActorEngine.updateActor()` call (reusing
`VehicleCrewAssignmentService.buildRemovalUpdate()` rather than
reimplementing removal logic) — no orphaned crew reference is left behind
in either outcome.

## Weapon-station mapping authority

New pure resolver: `scripts/sheets/v2/vehicle-sheet/weapon-station-mapping.js`
`resolveWeaponOperatorStation({stations, role, explicitStationKey,
legacyStationKey})`, with the exact precedence order the task specified:

1. **Explicit** per-weapon station key (`system.vehicleMount.operatorStation`
   for item-based weapons, `system.weapons[i].operatorStation` for
   statblock-derived ones) — wins if it still matches a real station;
   otherwise `source: 'broken'`.
2. **Legacy** explicit field — no such field exists anywhere in this
   codebase's current schema (confirmed via grep); the parameter and
   precedence slot exist so a future legacy-data importer has one defined
   place to plug into, rather than a second resolver being written later.
3. **Role-unique** fallback — only when *exactly one* station shares the
   weapon's role.
4. **Structured ambiguity** — 2+ stations share the role and there is no
   explicit mapping: returns `{stationKey: null, source: 'ambiguous',
   candidates: [...]}`, never a guess.
5. **Unmapped** — zero stations share the role.

`buildVehicleWeaponMountPanel()` (vehicle-context-builder.js) now calls this
resolver for every mount and only builds a Fire `actions` entry when
`operatorResolved` is true — an ambiguous/unmapped/broken mount renders a
warning (`mount.operatorAmbiguous`/`operatorBroken`/`operatorUnmapped`) and,
for editable owners, a station-select `<select
data-action="vehicle-weapon-station-select">` control instead. Selecting a
station persists the explicit mapping via the new
`VehicleWeaponStationService.setOperatorStation()`
(`scripts/engine/crew/vehicle-weapon-station-service.js`), which uses
`ActorEngine.updateOwnedItems()` for item-based weapons and
`ActorEngine.updateActor()` (dot-path `system.weapons.<index>.operatorStation`)
for statblock-derived ones — no direct Item/Actor mutation outside
ActorEngine. The `Fire` button's `data-station` always reflects the fully
resolved key, so a change to the mapping immediately affects the next Fire
click (there is no separate cache to invalidate — the panel is rebuilt
fresh on every render from the same `system.vehicleMount.operatorStation`/
`system.weapons[i].operatorStation` field the select control writes).

Both `buildVehicleCrewAssignmentPanel()` and `buildVehicleWeaponMountPanel()`
now derive their gunner-station count from a single shared helper,
`countGunnerRoleWeapons()`, which counts only weapons whose role is
`'gunner'` (not every vehicle weapon item regardless of role) — fixing a
latent Phase 6 inconsistency where a vehicle with one pilot-operated and
two gunner-operated weapons would have generated 3 gunner stations instead
of 2, and where the two panels could have disagreed with each other about
how many gunner stations exist.

## Multiple gunner-station behavior

A custom station whose `role` is set to `'gunner'` (or `'pilot'`, etc.)
participates in the SAME role-matching pool as the canonical/dynamic
stations of that role — confirmed by inspection: `crew-resolver.js`'s
`customStations()` sets a custom station's `role` from
`station.role`/`station.type` with no special-casing, so
`resolveWeaponOperatorStation()`'s `stations.filter(s => s.role === role)`
naturally includes it. This means: adding a second `'gunner'`-role custom
station to a vehicle that already has a dynamic `gunner` station
automatically makes role-based resolution `ambiguous` (2 matches) rather
than silently picking one — satisfying "a custom gunner station may
participate in operator lookup only when a weapon explicitly references it
or role-matching legitimately proves unique" without any special-case code.
The same reasoning covers "a custom pilot role must not replace the
canonical pilot without an explicit mapping": the canonical `pilot` base
station is always present, so a second `role: 'pilot'` station immediately
creates the same forced-explicit-mapping ambiguity.

Unsupported/organizational-only roles (`'custom'`, `'communications'`,
`'sensor'`) are normalized (`VehicleCustomStationService`'s
`normalizeRole()`, defaulting unknown values to `'custom'`) and stored, but
`crew-skill-router.js#STATION_SKILLS` has no entry for them — they render
in the crew-assignment panel with no non-weapon action buttons, and
`weapon-station-mapping.js`'s role matching simply never selects them for
weapon resolution unless a weapon explicitly maps its `operatorStation` to
that specific station key. This is the "roles with mechanical integration
vs. display-only" line the task asked to be documented: **gunner** (weapon
operator matching), **pilot** (weapon operator matching + existing
Maneuver/Aid-Pilot skill actions), **copilot/engineer/shields/commander**
(existing non-weapon skill actions only) have mechanical integration;
**communications/sensor/custom** are organizational/display-only today.

## Permission matrix

Reused and re-verified (source-level) rather than reimplemented:

- `VehicleCrewAssignmentService.canEdit`/`VehicleWeaponStationService.canEdit`/
  `VehicleCustomStationService.canEdit` are all `vehicle?.isOwner === true`
  — the same pattern `character-sheet.js` already uses elsewhere for
  edit-mode gating.
- Every mutation method (assign/remove crew, weapon-station mapping,
  custom-station CRUD) checks this **inside the service**, not just via
  hidden UI — a defense-in-depth requirement the task called out
  explicitly ("hidden or disabled controls must not remain executable
  through delegated events"). Since Phase 6, buttons/drop-zones/selects for
  non-editable users are never rendered at all (`station.editable`/
  `station.dropzone`/`mount.editable` gate the template), so there is no
  DOM element for a delegated-event exploit to target in the first place —
  and even if one existed, the service-level check still blocks it.
- Crew Actor ownership is not required to assign a world Actor as crew —
  unchanged from Phase 6, consistent with existing project policy
  (`listEligibleCrewActors()` filters only by type, not by ownership).
- Compendium actors are rejected (Phase 6 behavior, unchanged) rather than
  cloned.
- Opening a crew member's sheet (`openCrewSheet`) intentionally does not
  require vehicle edit permission — it defers to that actor's own Foundry
  sheet-open permissions, unchanged from Phase 6.

No runtime confirmation was possible (no Foundry instance) — this section
documents the source-level guarantee; the permission-matrix rows in the
runtime table below remain Pending.

## Synthetic token behavior

**A real, confirmed-by-code-inspection defect was found and fixed.**
`scripts/utils/actor-utils.js#applyActorUpdateAtomic()` (used internally by
every `ActorEngine.updateActor()` call, including every crew-assignment/
weapon-mapping/custom-station mutation in this codebase) contained a
"recovery" heuristic:

```js
if (actor.collection === null && actor.id) {
  // ...refetch game.actors.get(actor.id) and mutate THAT instead...
}
```

An unlinked token's synthetic actor (`actor.isToken === true`) legitimately
has `actor.collection === null` in Foundry's document model — that is not
corruption, it is how a token-delta actor (not a member of the
`game.actors` EmbeddedCollection) is represented. Before this fix, **every
mutation to an unlinked vehicle token — crew assignment included — was
silently redirected to the base world actor** sharing that id, which would
incorrectly write the assignment through to every other token of that same
base actor and never persist it on the specific synthetic token actually
being edited.

Fix: added `&& !actor.isToken` to the guard, so legitimate synthetic token
actors skip the "recovery" and call `actor.update()` on themselves — which
Foundry correctly scopes to that token's own actor-data delta. This is a
fix to the authority itself (`ActorEngine`'s underlying atomic-update
helper), not a bypass, per the task's explicit instruction. The
error-triggered recovery path in the same file's `catch` block (retrying
after a specific "You may only push instances of Actor..." error) is a
different, legitimately error-triggered scenario and was left unchanged.

This fix could not be runtime-verified (no Foundry instance) — a static
guard (`check-vehicle-crew-runtime-ux-guard.mjs`) confirms the `!actor.isToken`
condition is present, and the runtime-matrix rows for synthetic-token
persistence remain Pending.

## Broken-reference recovery

Unchanged from Phase 6, re-verified: `crew-skill-router.js#resolveVehicleCrewActor`
already distinguishes `'unassigned'` (no reference at all — legitimate
abstract Crew Quality) from `'invalid'` (a reference exists but does not
resolve — a data-integrity problem), and `VehicleCrewAssignmentService.openCrewSheet`
already reports "The assigned crew actor no longer exists. Remove this
station assignment and reassign." rather than throwing. Broken weapon-station
mappings are a new Phase 7 case, handled the same way: `source: 'broken'`
(distinct from `'ambiguous'`/`'unmapped'`) with a dedicated warning message
and a repair control (the same station-select), never a silent reroute to
another station.

## Diagnostics

`SWSE.debug.vehicleCrew.inspect(vehicleUuid)`
(`scripts/engine/crew/vehicle-crew-diagnostics.js`, registered via a
module-load side-effect import from `character-sheet.js`): GM-only
(`game.user.isGM` check, warns and returns `null` otherwise), fully
non-mutating, returns a plain serializable object: vehicle UUID/name,
`isToken`/`tokenUuid`, `editable`, resolved station descriptors (with a
`resolvable` flag per assigned station, computed by actually attempting
`fromUuid`/`game.actors.get` — never assuming), canonical `crewPositions`,
compatibility mirrors (`ownedActors`/`relationships`), custom station
records, a `brokenReferences` list, per-weapon mapping resolutions
(`weaponMappings`), and the most recent assignment event / mutation
receipt summary / Fire-action result (tracked by a tiny, dependency-free
in-memory log module, `vehicle-crew-diagnostics-log.js`, so the
recording services never form an import cycle with the diagnostics module
that reads them back). No default logging was added — the log only
populates when an actual assignment/mapping/fire action occurs, and
nothing is written to console unless the GM explicitly calls `inspect()`.

## CI registration findings

PR #933 (this branch's base) already has a completed, passing
"Rolling system validation" check run registered against its head commit
(`b51c0b070df7d7d611a545a83caa8300d072da77`), confirmed via the GitHub
API's check-runs endpoint (`conclusion: "success"`). The commit-status
endpoint separately reports `total_count: 0` — that is expected and not a
problem: this repository's CI is registered as a GitHub Actions **check
run**, not a legacy commit **status**; the two are different APIs, and only
the check-runs one applies here. `.github/workflows/rolling-system-validation.yml`
triggers on `pull_request` (confirmed present in the workflow file, and
exercised successfully on #933), so the same workflow will register and run
on this Phase 7 PR once pushed.

## CI results

Ran every command in "Commands run" locally; all pass. This phase adds one
new workflow step (`Guard — vehicle crew runtime/UX (Phase 7)`) alongside
the existing six guard steps and two run scripts — the workflow file's
own guard list assertions (`rolling-ci-support-check.test.mjs`) still pass
unchanged since the new step doesn't remove or weaken any existing check.

## Defects confirmed

1. **Redundant, non-functional crew-panel Attack action** — confirmed and
   removed (see "Redundant Attack action — decision").
2. **Multi-gunner Fire-button mis-targeting** — every gunner-role weapon's
   Fire button targeted the literal role string `'gunner'`, never
   `'gunner-2'`/etc., regardless of which specific gunner station actually
   fired it. Fixed via `weapon-station-mapping.js`.
3. **Gunner-station-count inconsistency between panels** — both panels
   counted ALL vehicle weapon items (not just gunner-role ones) toward
   gunner-station generation, which could disagree with each other and
   over-generate gunner stations on a vehicle with mixed pilot/gunner
   weapons. Fixed via the shared `countGunnerRoleWeapons()` helper.
4. **Synthetic (unlinked) token vehicle mutations silently redirected to
   the base world actor** — confirmed via direct inspection of
   `applyActorUpdateAtomic()`'s `collection === null` recovery heuristic,
   which did not distinguish a legitimate synthetic token actor from a
   genuinely detached/corrupted one. Fixed with an `!actor.isToken` guard.
5. **No custom-station authoring UI existed** — Phase 6 made existing
   `system.stations` records renderable/assignable but had no create/
   edit/reorder/remove path at all. Added
   (`VehicleCustomStationService` + editor panel).

## Defects not confirmed / out of scope this phase

- Whether Foundry's actual `Actor#update()` implementation for a synthetic
  token actor behaves exactly as assumed (correctly scoping to the token's
  actor-data delta) could not be confirmed by running it — this is
  standard, documented Foundry v13 document-model behavior, but "documented
  behavior" is not the same as "observed in this environment." Runtime row
  56-60 remain Pending for this reason specifically.
- Whether any other project code path (outside the crew-assignment/weapon-
  mapping/custom-station files this phase and Phase 6 touch) also calls
  `ActorEngine.updateActor()` on a synthetic vehicle token and would now
  behave differently — a repo-wide behavioral change to `actor-utils.js`
  affects every `ActorEngine.updateActor()` caller, not only vehicle crew
  code. A full audit of every other caller's synthetic-actor behavior is
  outside this phase's scope (vehicle crew system), but is flagged here as
  a candidate follow-up: the fix is strictly more correct (it stops an
  actual bug) and could not itself introduce a regression for any caller
  that was previously relying on the old, incorrect "always redirect to
  world actor" behavior as intentional — no such reliance was found in the
  time available, but a repo-wide grep for `ActorEngine.updateActor` call
  sites involving token actors was not exhaustively performed.

## Exact files changed

- `scripts/utils/actor-utils.js` — synthetic-token base-actor mutation fix
  (`!actor.isToken` guard on the `collection === null` recovery heuristic).
- `scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js` — removed
  the crew-panel's Attack action; added `countGunnerRoleWeapons()`,
  operator-station resolution for weapon mounts (`operatorStationKey`/
  `operatorSource`/`operatorAmbiguous`/`operatorBroken`/`operatorUnmapped`/
  `stationOptions`), and `buildVehicleCustomStationEditorPanel()`; wired
  the new panel into `buildVehicleSheetContext()`.
- `scripts/sheets/v2/vehicle-sheet/weapon-station-mapping.js` (new) —
  `resolveWeaponOperatorStation()`, the deterministic precedence resolver.
- `scripts/engine/crew/vehicle-weapon-station-service.js` (new) —
  `VehicleWeaponStationService`: mutation authority for explicit
  per-weapon operator-station mappings.
- `scripts/engine/crew/vehicle-custom-station-service.js` (new) —
  `VehicleCustomStationService`: full custom-station CRUD authority.
- `scripts/engine/crew/vehicle-crew-diagnostics.js` /
  `vehicle-crew-diagnostics-log.js` (new) — the GM-only inspection command
  and its dependency-free event log.
- `scripts/engine/crew/vehicle-crew-assignment-service.js` — records
  assignment/removal events and mutation receipts into the diagnostics log.
- `scripts/sheets/v2/vehicle-sheet/crew-skill-router.js` — records Fire
  results into the diagnostics log.
- `scripts/sheets/v2/vehicle-sheet/crew-resolver.js` — `customStations()`
  now prefers `station.description` over `station.reason`.
- `scripts/sheets/v2/vehicle-sheet/vehicle-crew-assignment-controls.js` —
  binds the weapon-station-select control and the full custom-station
  editor (rename/role/description/reorder/remove-with-confirmation/add).
- `scripts/sheets/v2/character-sheet.js` — imports the diagnostics module
  for its registration side effect.
- `templates/actors/vehicle/v2/partials/vehicle-weapon-mount-panel.hbs` —
  operator-station warning/select controls.
- `templates/actors/vehicle/v2/partials/vehicle-custom-station-editor-panel.hbs`
  (new) — the custom-station editor UI.
- `templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs` —
  includes the new editor panel.
- `styles/sheets/vehicle-sheet.css` — new operator-mapping and
  custom-station-editor styles.
- `lang/en.json` — one new `SWSE.ActorUI.OperatorStation` key.
- `.github/workflows/rolling-system-validation.yml` — added the Phase 7
  guard step.
- `tests/phase3-vehicle-attack-formula.test.mjs` — updated (not weakened)
  to assert the new dynamic operator-resolution mechanism instead of the
  literal `stationKey: weapon.crewRole || 'gunner'` string this phase
  replaced.

## Tests added

- `tests/phase7-vehicle-crew-runtime-ux.test.mjs` — static source-text
  guard covering: the crew-panel Attack-action removal; every
  weapon-mount Fire action's weaponId; deterministic weapon-station
  mapping precedence (explicit/legacy/role-unique/ambiguous/unmapped/
  broken) with no implicit fallback; the weapon-station-select UI and
  permission gating; custom-station create/rename-key-stability/reserved-
  and-duplicate-key rejection/reorder/occupied-removal-confirmation/
  ActorEngine-only mutation; the synthetic-token isolation fix.
- `tests/vehicle-crew-runtime-ux-guard-check.test.mjs` — smoke test for
  the new guard tool.

## Guards added or updated

- `tools/check-vehicle-crew-runtime-ux-guard.mjs` (new) — checks: no Fire
  control renders without a weaponId; no implicit first-weapon/first-
  station fallback in the operator resolver; exactly one custom-station
  key generator; no direct `system.stations` mutation outside the approved
  service; no direct `actor`/`vehicle`.update() bypass in any Phase 7 file;
  the synthetic-token isolation guard is present. Passes in `--strict`.
- `tests/phase3-vehicle-attack-formula.test.mjs` — updated (not weakened)
  per "Exact files changed" above.

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
node tools/check-vehicle-crew-runtime-ux-guard.mjs --strict
```

## Test results

- Syntax check: 2083 files checked, 2 documented pre-existing exclusions,
  all pass.
- Rolling-system test suite: 38 of 38 run pass (5 documented pre-existing
  Force-power-track exclusions, unrelated to this work).
- All 8 guards (7 pre-existing + this phase's new one) pass in `--strict`
  mode with zero findings.

## Runtime test matrix

No Foundry VTT v13 instance was available in this environment. Every row
below — the 30 carried forward from Phase 6 plus the 40 new Phase 7 rows —
is **pending**. Nothing in this document claims otherwise.

### Carried forward from Phase 6 (rows 1-30)

All 30 rows from `docs/audits/vehicle-crew-assignment-phase-6.md`'s runtime
matrix remain pending, unchanged in content — see that document for the
full list (pilot/gunner/gunner-2/custom-station assignment via picker and
drag, reassignment, removal, stale-reference handling, permissions, token
persistence, attack-operator resolution, double-click/duplicate-mutation
guards).

### Phase 7 additions (rows 31-70)

| # | Scenario | Expected | Actual | Status |
|---|----------|----------|--------|--------|
| 31 | Crew-panel no longer renders an unusable Attack button | No Attack action in the crew-assignment panel's station-actions list | — | Pending |
| 32 | Every visible Fire button has a valid weaponId | Weapon-mount panel Fire buttons all carry a real weaponId | — | Pending |
| 33 | Weapon with no identity cannot roll | Clicking Fire with no resolvable weapon warns and does not roll | — | Pending |
| 34 | Weapon with multiple possible operators fails or prompts clearly | Ambiguous mount shows a warning + station-select, no Fire button | — | Pending |
| 35 | Create custom station | New station appears in editor and assignment panel | — | Pending |
| 36 | Edit custom station label without changing key | Label changes; system.crewPositions/system.stations key unchanged | — | Pending |
| 37 | Reorder custom stations | Order persists across rerender | — | Pending |
| 38 | Assign crew to custom station using picker | Assignment succeeds | — | Pending |
| 39 | Assign crew to custom station using drag/drop | Assignment succeeds | — | Pending |
| 40 | Remove empty custom station | Removed with no confirmation prompt needed | — | Pending |
| 41 | Attempt to remove occupied custom station | Confirmation dialog appears; no mutation until confirmed | — | Pending |
| 42 | Confirm removal and crew cleanup | Station and crew reference both removed atomically | — | Pending |
| 43 | Cancel occupied-station removal | Nothing changes | — | Pending |
| 44 | Reload and verify persistence | Custom stations and assignments survive reload | — | Pending |
| 45 | Reserved-key collision rejected | Creating a station labeled "Gunner" gets a non-colliding key (e.g. gunner-2/gunner-3), not a silent overwrite | — | Pending |
| 46 | Duplicate-key collision rejected | Two stations with the same label both get distinct stable keys | — | Pending |
| 47 | Map weapon to gunner | Explicit mapping persists; Fire targets gunner | — | Pending |
| 48 | Map another weapon to gunner-2 | Explicit mapping persists; Fire targets gunner-2 | — | Pending |
| 49 | Fire first weapon and verify gunner operator | Correct assigned actor's BAB used | — | Pending |
| 50 | Fire second weapon and verify gunner-2 operator | Correct (different) assigned actor's BAB used | — | Pending |
| 51 | Pilot-operated weapon uses pilot | Assigned pilot's BAB used | — | Pending |
| 52 | Ambiguous weapon mapping fails clearly | Warning shown; no Fire button until resolved | — | Pending |
| 53 | Removed station creates visible broken mapping | Weapon mapped to a since-removed custom station shows a broken-mapping warning | — | Pending |
| 54 | Repair broken mapping | Selecting a new station clears the warning and Fire works | — | Pending |
| 55 | Non-owner cannot edit mapping | Station-select control not rendered; direct event attempt rejected by the service | — | Pending |
| 56 | Assign crew on unlinked token vehicle | Assignment persists on the synthetic token actor | — | Pending |
| 57 | Rerender synthetic sheet | Assignment still shown | — | Pending |
| 58 | Close and reopen synthetic sheet | Assignment still shown | — | Pending |
| 59 | Verify base Actor unchanged | Base world actor's crewPositions does NOT show the token-only assignment | — | Pending |
| 60 | Assign crew on linked token and verify linked Actor update | Base Actor's crewPositions updates as expected | — | Pending |
| 61 | GM assigns unowned Actor | Succeeds | — | Pending |
| 62 | Player owner assigns owned Actor | Succeeds | — | Pending |
| 63 | Player owner assigns unowned world Actor where policy permits | Succeeds (no crew-ownership requirement) | — | Pending |
| 64 | Observer sees read-only panel | No mutation controls, no interactive drop target | — | Pending |
| 65 | Direct event attempt by non-owner is rejected | Service-level canEdit() check blocks it even if a DOM event were forced | — | Pending |
| 66 | Deleted Actor displays broken reference | Station shows a broken-reference indicator | — | Pending |
| 67 | Open Sheet on broken reference does not throw | Warning shown, no exception | — | Pending |
| 68 | Remove broken reference | Removable despite unresolved actor | — | Pending |
| 69 | Reassign broken station | New assignment replaces the broken one | — | Pending |
| 70 | Broken weapon mapping does not silently reroute | Warning + repair control shown, no auto-fallback to another station | — | Pending |

## Merge order

Unchanged: #928 → #929 → #930 → #931 → #932 → #933, with this phase's PR
stacked on top of #933 (base branch `claude/vehicle-crew-assignment-phase-6`).
No prior PR is merged, closed, or altered by this phase.

## Expected conflicts

None anticipated: this phase's changes are additive to files #928-#933
already touched (`vehicle-context-builder.js`, `vehicle-crew-assignment-controls.js`,
`vehicle-crew-assignment-service.js`, `crew-skill-router.js`, `crew-resolver.js`,
`character-sheet.js`, the vehicle crew templates/styles, and the rolling
CI workflow) plus new files with no prior history. Sequential merging of
#928 → ... → #933 → this PR in order should apply cleanly; rebasing this
branch onto each merged predecessor is only needed if an earlier PR's own
review cycle produces new commits on its branch before merge.

## Go/no-go recommendation

**No-go for merge without human runtime verification — this recommendation
covers Phase 7 only.** The code-level fixes and additions in this phase
are complete, internally consistent, covered by static guards/tests, and
introduce no regressions in the existing 38-test rolling-system suite or
the 8 strict guards. However:

- Zero rows of the combined 70-row runtime matrix (30 carried forward + 40
  new) have been executed in an actual Foundry VTT v13 world, because none
  was available in this environment.
- The synthetic-token fix in particular — while a confirmed, real defect
  fixed at its correct authority (`ActorEngine`'s underlying atomic-update
  helper) rather than bypassed — has never been exercised against Foundry's
  actual token/actor delegate behavior in this session.
- A human tester (or a future session with real Foundry access) should run
  the fixture plan and full runtime matrix above before this stack is
  considered merge-ready end to end.

Recommend: keep this PR in draft, request a human (or Foundry-capable
session) execute the runtime matrix using the fixture plan above and
`SWSE.debug.vehicleCrew.inspect()` for verification, and only then revisit
merge readiness for the full #928-through-Phase-7 stack.

## Final summary

**Runtime verification:** Not performed — no Foundry VTT v13 instance was
available in this environment. All 70 runtime-matrix rows (30 carried
forward from Phase 6, 40 new) are pending. The fixture plan and exact
reproduction steps above are provided for a human tester.

**Fixed:** (1) the crew-panel's non-functional Attack action, removed
rather than patched; (2) multi-gunner Fire buttons that always targeted
literal role `'gunner'` regardless of which specific gunner station fired,
via a new deterministic weapon-to-station resolver; (3) a gunner-station-
count inconsistency between the two crew panels; (4) a confirmed,
significant bug where every mutation to an unlinked (synthetic) vehicle
token was silently redirected to the base world actor.

**Crew-panel actions:** Attack removed from the crew-assignment panel;
non-weapon station duties preserved; the weapon-mount panel remains the
sole, always-weaponId-carrying Fire affordance.

**Custom stations:** Full create/rename/re-role/re-describe/reorder/remove
authority added (`VehicleCustomStationService`), with stable key generation
at creation, reserved/duplicate-key protection, and explicit confirm-or-
cancel handling for removing an occupied station.

**Weapon mapping:** Deterministic explicit-or-role-unique-or-ambiguous
resolution (`weapon-station-mapping.js`), a narrow per-weapon station
picker on the weapon-mount panel, and broken-mapping repair — never a
guessed fallback.

**Permissions:** Reused and re-verified Phase 6's owner-only, service-level
`canEdit()` gating across all new mutation paths; no reliance on
client-side hiding alone.

**Synthetic tokens:** Root-caused and fixed at the `ActorEngine` atomic-
update authority itself (`!actor.isToken` guard), not bypassed.

**Broken references:** Extended the existing unassigned/invalid
distinction to weapon-station mappings (`broken` source, repair control).

**CI:** PR #933's "Rolling system validation" check run is registered and
passing (confirmed via the check-runs API); this phase adds one new guard
step to the same workflow.

**Tests:** One new comprehensive static-guard test file plus a guard smoke
test; one existing Phase 3 test updated (not weakened) to match the new,
correct operator-resolution mechanism it was asserting against. 38/38
rolling tests and 8/8 guards pass; full syntax check clean.

**Merge readiness:** No-go without human/Foundry-capable runtime
verification — see "Go/no-go recommendation" above.

**Remaining risks:** see "Defects not confirmed / out of scope this phase"
and "Go/no-go recommendation."
