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
