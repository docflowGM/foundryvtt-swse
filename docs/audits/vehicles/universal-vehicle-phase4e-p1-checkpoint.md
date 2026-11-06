# Universal Vehicles — Phase 4E P1 Checkpoint (V2 vehicle sheet)

Branch `audit/universal-vehicles-phase1`. PR #1092 stays draft/unmerged.

## Implemented
- `scripts/sheets/v2/vehicle-sheet/vehicle-publication-view-model.js` (new, pure): display model built **only** from `getVehicleRuntimeProjection()`. Separates printed model vs call sign, book/page, category/size, initiative, HP max vs current, printed defenses, shield state (unknown / conditional / conflicting / explicit zero / known), every published movement mode and scale, crew complement, passengers, cargo, consumables, hyperdrive, price status, and read-only printed attack groups.
- `vehicle-context-builder.js`: canonical Actors use that model for defenses, hull, crew summary, SR strip and type flags (category only; printed type line, tags and legacy hyperdrive mirrors are not consulted). Removed the unconditional "starships support shields" rule; removed the default crew complement of 6; cargo capacity is parsed from the published string only (unknown stays unknown).
- `vehicle-actor-sheet.js`: removed the invented 500 cargo capacity; unknown capacity yields cargo state `unknown`.
- Templates: new `vehicle-publication-panel.hbs` (Stats tab) and `vehicle-attack-reference-panel.hbs` (Operations tab, no buttons). Edit tab for canonical Actors exposes only current HP, current SR (when printed SR > 0) and notes; call sign is edited in the header. Matches the P0 submit allow-list, which is unchanged.

## Not changed / out of scope
- P0 gates (precreate hook, submit allow-list, digest) untouched.
- Asset Bay already resolves vehicle Actors by id and opens their sheet; ownership placement of purchased vehicles is a P3 concern.
- Non-canonical (scratch/custom) vehicles keep the legacy panels, minus the 500/6/starship-shield defaults.

## Tests
`tests/vehicle-universal-phase4e-p1-sheet-view-model.test.mjs` (15): representative matrix (X-wing, two Vultures, YT, walker, Star Destroyer, stations, hybrid vehicle-droid, SR zero/unknown, priced/not-for-sale), all-429 invariants, static guards for the removed defaults and the read-only armament reference.

## LIVE_RUNTIME_PENDING
No Foundry V13 world was available. Operator checklist: open a canonical X-wing sheet (Stats tab shows Published Statistics; Edit tab shows only HP/SR/notes); reduce HP, close and reopen — value persists via ActorEngine and max stays 120; open the Core Vulture (SR "not stated") and Core TIE Fighter (SR 0 printed); confirm no Fire button and no Items on any canonical sheet; open a vehicle from a character's Asset Bay.
