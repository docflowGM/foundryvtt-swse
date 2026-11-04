# Combat authority map (vehicles are adapters, not a second combat system)

One owner per mechanic. Guarded by `tests/architecture-combat-authority.test.mjs`.

| Mechanic | Authority (owner) | Vehicle adapter (thin) | Disposition |
|---|---|---|---|
| Attack options, feats (Burst Fire) | `CombatOptionResolver` | `burstFireOptionOf` in `vehicle-fire-mode-service.js` asks it; `vehicle-fire-mode.js` only gates capability/scale/operator | converged (feat-name lookup removed) |
| Autofire penalty | `engine/combat/autofire-rules.js` (`AUTOFIRE_ATTACK_PENALTY`) | imported by `enhanced-rolls.js` and `vehicle-fire-mode.js` | converged (two literals -> one) |
| Firing-mode state | `FireStateStore` owns CANONICAL weapon readiness/reset on the owned Item; vehicle weapons are non-canonical managed Items and pass through it | `VehicleFireModeService` keeps ONE flag (`flags.swse.vehicleFireMode`) because stock Items are digest-managed and cannot be edited | genuinely distinct (different weapons, no shared state) |
| Action economy | `ActionEconomyConsumption` | fire-mode switch, battery aid call `spend()` | shared |
| Grapple / control state | `weapon-control-effects.js` + `GrappleStateEngine` | `vehicle-tractor-beam.js` (declaration, call after a hit, range test) | adapter; two narrow extensions to the engine (`controllerGrapple`, `rangeCheck`, end reason `out-of-range`) |
| Printed vehicle grapple | `SWSEGrappling._rollGrappleBonus` | `publishedVehicleGrappleBonus` | adapter |
| Damage, shields, DR, HP, thresholds, condition | `DamageMitigationManager`, `DamageResolutionEngine`, `ActorEngine.applyDamage` | vehicle weapons only supply `ruleData` flags (`halfDamageOnMiss`, `noDamage`, `shieldbuster`) | shared; shieldbuster = SR -10 in `ShieldMitigationResolver` + hull halving stage |
| Damage disposition (miss rules) | `resolveDamageDisposition` | `ruleData`, `isAutofire`/`isBurstFire` tags | shared |
| Range bands and penalties | `RangeEngine`, `getRangePenalty` | `vehicle-attack-range.js` measures squares and picks the Table 10-2 row | adapter |
| Personal ammunition | `AmmoSystem` | none: vehicle weapons carry no ammunition pool, so it never spends for them | distinct resource |
| Vehicle launcher ammunition | `VehicleAmmunitionService` (stock ledger on the managed Item; aftermarket ledger on the vehicle, guarded flag) | one ledger per launcher; spend/refund idempotent per attack id | genuinely distinct (capacities, payload evidence) |
| Credits, purchases | `TransactionEngine` | Shipyard, ammunition purchase | shared |
| Equipment / installation | sealed Shipyard ledger via `VehicleInstallationService` | | vehicle-specific |

## Persistent state: one writer each

| State | Writer |
|---|---|
| HP, shields, condition track | `ActorEngine` damage resolution |
| Grapple / control | `GrappleStateEngine` (through `weapon-control-effects`) |
| Action economy | `ActionEconomyConsumption` |
| Weapon firing mode (vehicle) | `VehicleFireModeService` |
| Launcher ammunition | `VehicleAmmunitionService` |
| Installed equipment, EP, jobs | `VehicleInstallationService` (guarded flags) |
| Credits | `TransactionEngine` |

Known remaining items (bucketed): `FireStateStore` and the vehicle mode flag could share a reset policy if vehicle weapons are ever made canonical; guided-projectile follow-up records are written by `VehicleAmmunitionService` only.
