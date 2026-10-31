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

## Known limits / follow-up
- Effective statistics are DISPLAYED; live pools (`system.hp.max`, `system.shields.max`) still follow the published-mirror guard, so an installed shield does not yet create a live shield pool and bulkheads are not applied. Making the guard accept `published + certified effects` is the next engineering step.
- Charging the design total at GM approval (when the Actor is created) is an engineering choice, not a published rule.
- Design time needs no rounding ruling when floor and ceil agree (cost within the first 100,000 or an exact multiple); otherwise `DESIGN_TIME_ROUNDING_UNRULED` still blocks rules-legal designs.
- Weapon/accessory tables remain uncertified; weapons stay disabled.
- Custom-built ships have no Shipyard installation panel yet (only the ones chosen at design time).
- `LIVE_RUNTIME_PENDING`: all dialogs and sheet buttons (Foundry V13 DialogV2, hooks, hbs rendering in the client).
