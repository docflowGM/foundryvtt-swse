# Universal Vehicles - Shipyard Completion Checkpoint

Authorization (project owner): follow the published SWSE rules by default; let the GM override procedure explicitly.

## Milestones and where they live
| Milestone | Code | Tests |
|---|---|---|
| Installation jobs (persistent, sealed, write-guarded) | `scripts/domain/vehicles/vehicle-installation-jobs.js`, `VehicleInstallationService.startJob/logWorkDays/recordCheck/retryJob/gmCompleteJob/gmInstantInstall` | `p9-installation-jobs` |
| Certified effects (39 rows) | `scripts/domain/vehicles/vehicle-modification-effects.js`, generator `tools/audits/vehicles/build-sotg-modification-evidence.mjs` | `p10-modification-effects` |
| Player-visible installation work | `vehicle-schema-panel.hbs`, `vehicle-shipyard-actions.js` | `p11-shipyard-ui` |
| Custom ship construction + GM approval | `custom-vehicle-construction-service.js`, `construction-designer-ui.js` | `p12-construction-service`, `p13-designer-ui` |

## Money and procedure (SotG pp. 38-40)
- Every attempt is charged when it begins. A failed Mechanics check is a game outcome: money and time stay spent. Rollback applies only to a failed database operation.
- Partial failure: retry costs half the original time and money, +5 on the check. Total failure: everything is lost; starting again is a new, fully charged job.
- A pending job RESERVES its EP (`reservedEpFromJobs`), tracked apart from installed EP; the planner subtracts it so a conflicting purchase cannot take it. Nothing is added to the ledger and no benefit is granted until a check succeeds or a GM adjudicates.
- Players never type a Mechanics total: the service rolls 1d20 + the installer's Mechanics total (+5 on retries). Only a GM may enter a total (a roll made at the table). Work time is logged by the GM (`logWorkDays`); a player check is refused until it is complete.
- GM override (`gmInstantInstall`, `gmCompleteJob`): requires `game.user.isGM` and a reason; recorded on the job and on the sealed ledger entry (`completion`). Cost, EP, ownership and certification are unchanged; a weapon entry still has `executable:false`.
- Instant installation is no longer the default: `install()` is a deprecated alias of the GM override.

## Effects (MECHANIC_SPECIFIED only when implemented, source-supported, tested)
Armor x4 (equipment bonus to Reflex), shields x19 (hulls printed with SR 0), maneuvering jets x3 (Dex-modifier delta to Reflex and Initiative), hyperdrives x11 (hulls printed without one), atmospheric thrusters x2. Baseline is never rewritten; effective values are recomputed from baseline + sealed ledger, so removal restores the original. 17 rows remain SOURCE_VERIFIED: bulkheads (V-P6-01), sublight drives (V-P6-02), jammers/regenerating shields/combat thrusters/navicomputers/SLAM (V-P6-05). Stacking of same-kind systems (V-P6-03) and the pilot-level armor clause (V-P6-04) are deferred; the planner denies rather than guesses.

## Runtime completion addendum (2026-10-31)
1. **Operational effects.** `getEffectiveVehicleDerived()` (`vehicle-published-derived.js`) is the one effective-statistics authority: verified published record + certified sealed-ledger effects, recomputed every time (removal restores; the record is never rewritten). Consumers:
   - derived Reflex Defense (`vehicle-derived-builder.js` -> what attacks target), the sheet defenses panel (effective, printed shown alongside);
   - Initiative (`SWSEInitiative`, `swse-combat` -> `getEffectiveVehicleInitiative`);
   - live shield pool: `system.derived.shield` {current, max, stored:true} for source-backed vehicles with a known positive effective SR (printed or installed) -> `ShieldMitigationResolver` and `ActorEngine` depletion/recharge. The stored `system.shields.max` stays the printed mirror; the runtime classifier accepts a current pool up to the effective maximum. An installed shield starts at 0 until recharged (no published rule fills it on installation). Note: this also gives published shielded vehicles their printed SR in damage mitigation, which previously had no vehicle projection.
   - hyperdrive availability on the sheet.
   Exposed, not auto-applied (no consumer exists, or the condition is not modelled): Dexterity-modifier delta for Pilot checks (`derived.vehicleModifications.pilotDexModifierDelta`; there is no vehicle Pilot roller), atmospheric speed (conditional on being in an atmosphere). Flat-Footed Defense and Fortitude are unchanged by these effects.
2. **Construction approval vs completion.** Projects (sealed, write-guarded on the designer): PENDING_APPROVAL -> UNDERWAY (GM approval funds it: one charge) -> COMPLETED. The published Starship Designer work (design days logged by the GM, then the design Mechanics check against the design DC) must finish before the vehicle Actor is delivered; a GM may complete immediately with a recorded reason. A failed design check stops automation (V-P6-06). Homebrew completes only by GM adjudication. No build-time formula beyond the published design time.
3. **Installation checks.** No caller - GM included - can record a normal installation check before the work time is logged; the waiver is `gmCompleteJob` (GM + reason, recorded).

## Known limits / follow-up
- Pilot-check consumer and atmosphere state do not exist; their effect values are exposed only.
- Charging the design total at GM approval follows the owner's direction (2026-10-31); approval does not complete construction.
- Design time needs no rounding ruling when floor and ceil agree (cost within the first 100,000 or an exact multiple); otherwise `DESIGN_TIME_ROUNDING_UNRULED` still blocks rules-legal designs.
- Weapon/accessory tables remain uncertified; weapons stay disabled.
- Custom-built ships have no Shipyard installation panel yet (only the ones chosen at design time).
- `LIVE_RUNTIME_PENDING`: all dialogs and sheet buttons (Foundry V13 DialogV2, hooks, hbs rendering in the client).
