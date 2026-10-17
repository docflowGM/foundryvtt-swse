# SWSE Vehicle Phase 2C — CP8 Stock Remediation and Crew Evidence Checkpoint

**Status:** Compendium pack hydration completed for the first four source-certified ships; **operational stock weapon certification remains BLOCKED** until trusted stock-to-actor clone bindings and Foundry V13 end-to-end tests. This document records actual pushed code/data, not approval to start the separate vehicle/droid modification refactor.

## Authority and decisions preserved

- Repository: `docflowGM/foundryvtt-swse`; branch: `audit/vehicle-phase-0-1-canonical-foundation`.
- Input (CP7) HEAD: `ead923ffe2fcb8b5e563eda10bfd369962b0e8b5`.
- Printed authority: `data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json`, Git blob `d08ca75b0b30e8b44896588edf3c5ce1cd335557`. Four strict publication claims; historical overall Phase 2C scope remains 318 claims.
- Preserved approvals: **D01, D02, D03 approved; D04 staged deployment DENIED**, so unmapped stock attacks still refuse BEFORE spending ammunition, action costs, or rolling dice.
- Pure/Modified (D-005) remains future architecture only. The current per-weapon stock-vs-shipyard provenance classifier does not become a modification legality engine.

## Actual source-corrected pack records

| Printed ship | Source page | Exact pack ID | Core stock fixes | Stock weapon status |
|---|---:|---|---|---|
| CEC Action VI Bulk Transport | 58 | `vehicles-space-transports.db:97c5c070d93b7a0a` | 600 HP, 8 normal crew, 90,000 tons, Colossal (frigate), x3 hyperdrive, source-backed defense and price | Explicitly unarmed |
| CEC CR70 Corvette | 75 | `vehicles-capital-ships.db:18cd29422b66693d` | INT 18, 18–150 normal crew with typical 30, CL source preserved in ledger, 800 HP, 5,000 tons, licensed pricing | Explicitly unarmed |
| Ghtroc Class 720 Freighter | 88–89 | `vehicles-space-transports.db:4d5b3422047f5eb8` | DEX 14, INT 13, Colossal, 110 HP, 135 tons and correct power/price/crew fields | One source-certified physical gun **hydrated**, runtime binding **not issued** |
| CEC Consular-class Cruiser | 126 | `vehicles-space-transports.db:28f748f51896aa1b` | 960 HP, 8 skilled crew, Colossal (frigate), 1,000 tons, shield/price/movement fields | Explicitly unarmed |

The approved exact-ID source proposal included **217 field edits** (`data/audits/vehicles/swse-phase2c-cp8-stock-pack-remediation-manifest.json`). An additional **99 derived/provenance corrections** were reconciled using the *existing* store grouping semantics (`data/audits/vehicles/swse-phase2c-cp8b-derived-metadata-remediation.json`). Total: **316 proposed corrections applied**, plus exact published source claim pointers and one physical Ghtroc stock weapon row. The old non-source-correct cache groups/tags and stale Fandom-primary provenance were not retained as canonical data.

Exact installed physical group (Ghtroc):
- `4d5b3422047f5eb8-weapon-1`, **one double-laser emplacement**, fixed-forward, **gunner station**; physical station corroborated by the published p.89 deck plan.
- Damage **4d10×2**. Printed ranged **+1**, autofire **−4**. Normal crew BAB **+0** plus vehicle INT 13 (**+1**) reconciles the +1; autofire incurs −5 relative to it.
- The weapon row stores the published total in `printedAttackTotal`, **not** in `attackBonus` or `bonus`. No fake second mount, implied turret, or additive +1 enhancement.
- `stockSourceEntryKey`, `sourceWeaponGroupKey`, and the row ID are source/identity evidence **within the pack**, not proof by themselves that an arbitrary world Actor is an unchanged published clone. They never grant firing permission.

## Independent GitHub data readback

- `packs/vehicles-space-transports.db`: original `ea5e48bc2aaba4369f29cfa4ff35a49f7d998c5d`, new `07364d6650ca945303915430b1ed1f321c1c0cf6`; **3** of **108** document lines changed.
- `packs/vehicles-capital-ships.db`: original `9bd523944a37d86454adc3981b4553b7924ae3f4`, new `aefe115dd0b7c3b669882b12a4c8519fdd296460`; **1** of **63** document lines changed.
- Readback verified original and new JSONL rows in position: **4 intended records changed**, **167 other records identical byte-for-byte**, preserved document IDs. All four certified printed facts pass an independent source-versus-current-pack value check.
- New post-write verifier: `tools/audits/vehicles/verify_phase2c_cp8_post_hydration.mjs`. It pins the NEW pack Git hashes and source ledger and validates selected source-critical statblocks, source pointers and Ghtroc's one weapon topology. **This is not Foundry runtime certification or a full schema-field audit.**

CP7's historical read-only input pins and the CP8A **pre-mutation** checker remain intentionally pinned to the old packs: they are archival preconditions and should **not** be run as live post-mutation checks. CP8A unit fixtures now reconstruct that previous state without claiming to reproduce original full blobs. Use the CP8C post-write checker for the updated checkout.

## Runtime work actually changed

1. `vehicle-import-normalizer.js` now preserves existing weapon row IDs, source keys, count and mount topology, arcs, printed totals and gunner station data while still filtering corrupt placeholder rows.
2. It now parses published cargo strings such as `90,000 tons`, preserves the CR70's variable **18–150** crew alongside **typical 30**, and uses existing `vehicleFamily` classification so a space transport isn't accidentally imported as a planetary vehicle.
3. `scripts/engine/crew/vehicle-crew-actor-authority.js` holds the actor/unassigned/invalid crew assignment resolution previously private to the crew-sheet router; the sheet re-exports this same engine, preventing parallel crew evaluators.
4. `scripts/domain/vehicles/vehicle-crew-station-evidence.js` checks the persisted installed weapon and exact real assigned gunner (or explicitly unassigned abstract crew), rejects a mismatched caller station, stale crew references, unowned Item or made-up weapon row.
5. `scripts/combat/rolls/attacks.js` no longer hardcodes `crewStationResolved: false`; stock candidates now obtain a real pre-cost station-evidence result. Shipyard modification classification remains separate and is not reclassified as certified stock.

**Still fail-closed:** `scripts/domain/vehicles/vehicle-stock-attack-authority.js` currently returns `null` for every stock group, and its trusted count remains **0**. Even the correctly hydrated Ghtroc cannot pass stock-provenance preflight without the future independent installed-instance binding. A printed group ID, source key or crew-station success **must not** bypass the gate.

## Required checks for the full checkout

```sh
node --test tests/phase2c_cp8_remediation_manifest.test.mjs
node --test tests/phase2c_cp8_vehicle_weapon_import_roundtrip.test.mjs
node --test tests/phase2c_cp8_vehicle_import_source_fields.test.mjs
node --test tests/phase2c_cp8_post_hydration.test.mjs
node --test tests/phase2c_cp8_crew_station_evidence.test.mjs
node --test tests/phase2c_cp7_stock_binding_audit.test.mjs
node tests/phase3-vehicle-operator-resolution.test.mjs
node --test tests/phase2c-vehicle-stock-vs-custom-gate.test.mjs
node --test tests/phase2c-vehicle-live-roll-guard.test.mjs
node tools/audits/vehicles/verify_phase2c_cp8_post_hydration.mjs --repo-root .
```

These commands are **required to execute in an actual full repository checkout**; isolated source/pack checks and live GitHub readback were performed here, but local Node test execution and live Foundry V13 integration were **not available**. Do not label them passed until executed.

## Outstanding CP8 runtime certification gates

1. Establish a trusted *published pack record → actual world Actor clone → currently installed group* provenance binding that survives fresh Foundry V13 imports and cannot be certified solely through editable Actor fields, name, flags or caller options.
2. Validate the production Ghtroc station path, target geometry, physical fixed-forward mount, arc refusal and operator BAB plus vehicle INT formula with both named and abstract crew in Foundry.
3. Run pre-cost and rollback regressions under actual weapon usage (including shipyard weapons and untouched stock weapons on modified ships), no source provenance bypass, no duplicate roll modifiers or phantom mount.
4. Independently validate remaining source-critical fields, crew/consumables/cargo derived consumers and published exceptions before promoting the first trusted attack.
5. Resolve the **Action VI taxonomy** issue separately: the printed ship type is a capital ship, but its pre-existing document lives in the space-transports pack. CP8 intentionally preserved the exact existing document/pack ID, **not** a hidden reclassification or duplicate record. The CR70's family tactical-fire description is likewise **not** permission to invent an armed CR70.
6. Full live Foundry V13 Actor cloning and sheet/combat tests must precede any claim that CP8 is mechanically/operationally complete. The vehicle/droid modification refactor is still out of scope.

**Checkpoint truth:** four stock compendium records source-corrected; one physical Ghtroc weapon group hydrated; actual crew-station logic wired; **zero trusted operational stock weapon groups**; no Pure/Modified implementation.
