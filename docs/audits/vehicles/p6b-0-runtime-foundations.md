# P6B-0 - Runtime Foundations (offline complete; LIVE_RUNTIME_PENDING)

## A. Manual restoration verification
`verifyManualRestoreState` (`vehicle-errata-migration.js`) now checks, on the persisted Actor, before `restore()` reports success: the restored source record and recordDigest (and that the digest is valid), shield rating and maximum, the current shield value as kept or clamped, the printed-groups mirror, removal of the active migration record, persistence of the restoration audit, and a valid canonical classification. Refused, partial or altered writes return `ok:false` with the failing checks. Earlier safeguards (backup, GM confirmation, preview fingerprint, lock, gameplay preservation) unchanged. Tests: p16 (14).

## B. Vehicle Pilot check authority
Rule: Core Rulebook, Vehicles - "The pilot adds the vehicle's size modifier and Dexterity modifier on all Initiative and Pilot checks" (size modifiers Table 10-1).
- `vehiclePilotCheck(vehicle, { pilotActor })` (`vehicle-operating-context.js`): with a crew Actor, the vehicle contributes its Table 10-1 size modifier plus its EFFECTIVE Dexterity modifier (published Dex + certified installed effects); the generic crew quality is not added. Without a crew Actor, the published statblock Pilot modifier (which already includes crew quality, size and Dex) plus only the certified Dex-modifier change. Unknown size/Dex/printed Pilot are reported, never 0.
- `VehicleOperatingContextService.rollPilotCheck` uses the canonical skill roll (`scripts/rolls/skills.js` `rollSkill`, vehicle modifier passed as `customModifier`); the generic crew uses `RollCore.executeFormula`. No second dice engine.
- The legacy `SWSEVehicleCore.rollCrewSkill` called a non-existent `SWSERoll.rollSkillCheck`; it now routes Pilot through the authority and other crew skills through `rollSkill`.
- One Table 10-1 size table: combat Initiative's `_getVehicleSizeModifier` now uses `vehicleSizeModifier` (same values).
- Use Computer and other crew skills: no vehicle-side modifier is added (the Core rule names Initiative and Pilot only).

## C. Atmospheric-state authority
`flags.swse.vehicleEnvironment` = `atmosphere` | `space` (anything else reads `unknown`), set only by a GM (`VehicleOperatingContextService.setEnvironment`, audit history of the last 20 changes; `guardVehicleEnvironment` refuses non-GM writes). Never inferred from scenes, names or categories. The two atmospheric thrusters apply to derived character-scale fly speed only when the environment is `atmosphere`; unknown and space do not. The V2 sheet shows the environment, the generic-crew Pilot and the vehicle modifier for a crew pilot, a Pilot check button and GM environment buttons.

## D. Effective statistics
One authority (`getEffectiveVehicleDerived` + `computeEffectiveStatistics`) feeds derived Reflex, combat Initiative, the sheet defenses panel, the schema panel, the Pilot check, the live shield pool and now movement. Installation and removal recompute all of them (p17).

## Counts
Operationally integrated (offline) 37 -> 39: `atmospheric-thrusters`, `atmospheric-thrusters-advanced`. All other baseline counts unchanged (174 / 39 specified / 39 installable / 0 combat-authorized).

## Live V13 checks (pending)
1. GM sets a vehicle to atmosphere/space/unknown from the sheet; a player's attempt is refused. 2. ARC-170 with atmospheric thrusters: speed changes only in atmosphere. 3. Pilot check button with a pilot assigned rolls the pilot's Pilot skill plus the vehicle modifier shown on the sheet; without a pilot, the generic crew roll posts to chat. 4. Manual errata restore reports success only when every field persisted.

## Outstanding rule blockers (unchanged)
V-P6-01..06, V-P6A-01..04, V-P6A-07, V-P2-04 (see the register blocker table).

---

# Independent-review corrections (before P6B-1)

Three defects found in review of `f30e24d`; fixed with regression tests in `tests/vehicle-universal-phase4e-p17-operating-context.test.mjs` (now 10 tests).

1. **Environment guard update shapes.** `guardVehicleEnvironment` only recognized two shapes. It now uses `updateTouchesVehicleEnvironment`, a recursive, fail-closed walk of the update: dotted keys at any depth; nested objects; parent-object updates (`flags.swse: { vehicleEnvironment: ... }`); deletion `-=` and replacement `==` markers on any segment (`flags.-=swse`, `flags: { '==swse': ... }`, `-=flags`); the audit `history`; and a parent overwritten by a non-object (`flags: null`). A plain parent object merges, so it counts only when it carries the environment key. An unresolvable user is denied. Tested through the registered `preUpdateActor` hook chain: 16 touching shapes are denied for a player and for an unknown user and pass the environment guard for a GM; 8 unrelated shapes (including `vehicleEnvironmentX`, other scopes) are untouched; non-vehicle Actors are not governed. Broad GM parent deletions are still stopped by the provenance and ledger guards.
2. **Unresolved assigned pilot.** `assignedPilotEntry` separates "nobody assigned" from "assigned but unresolvable" and `decidePilotRoller` decides who rolls: an assignment must resolve (the service resolves the UUID itself) to a character-type Actor that is not the vehicle and that the user may roll for (GM or owner); otherwise `ASSIGNED_PILOT_UNAVAILABLE` or `PILOT_ROLL_NOT_AUTHORIZED` and **no roll is made and no generic-crew modifier is computed**. Legacy entries without a UUID fail the same way. The generic crew is used only when nobody is assigned, and only for the vehicle's owner or a GM (`GENERIC_CREW_ROLL_NOT_AUTHORIZED`). The sheet's null-returning `resolvePilot` was removed; `rollCrewSkill` passes its already-resolved crew Actor through the same validation. The canonical Pilot modifier calculations are unchanged.
3. **Atmospheric speed presentation.** The effective-statistics row now receives the same explicit environment as the derived data. In atmosphere the row shows the boosted speed marked active; in space or unknown it shows the unmodified speed, marks the effect inactive and shows what it would grant separately ("available in atmosphere"). Sheet row and `derived.speed.total` are asserted equal in every environment; removal drops the row and restores the printed speed; the published baseline is untouched.

**Counts:** unchanged (187 catalog; 174 source-verified; 39 specified; 39 offline-integrated; 39 installable; 0 combat-authorized; 429 identities). **Live V13:** still LIVE_RUNTIME_PENDING; add to the checklist: a player's update to `flags.swse` containing `vehicleEnvironment` is refused; a pilot station pointing to a deleted Actor produces the ASSIGNED_PILOT_UNAVAILABLE warning and no chat roll; the speed row changes only with the GM-set environment.
