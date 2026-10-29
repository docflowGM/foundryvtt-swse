# SWSE Universal Vehicles — Phase 4C runtime cutover checkpoint

**Branch:** `audit/universal-vehicles-phase1`
**Date:** 2026-10-29
**Owner scope decision:** development clean break; no existing players/vehicles require migration. No main/release deployment claim.

## Implemented on branch

**Single runtime/build taxonomy**
`scripts/domain/vehicles/universal-vehicle-pack-registry.js` is the pure authority for 11 Actor packs and 31 published primary category labels. The Phase 4B generator, browser, store, source category registry and tests consume this one set of pack names. Source-claim boundaries remain distinct even where books publish the same hull.

**Manifest replacement**
`system.json` now declares exactly the 11 canonical vehicle Actor packs, including `vehicles-ground-armor` and `vehicles-hybrids`; the old `vehicles-canonical-ships` (316), `vehicles` aggregate and `vehicles-weapon-emplacements` Actor registrations are removed. Non-Actor vehicle weapons/actions Item packs remain unchanged. Old physical `packs/*.db` data is retired historical input and never read as a vehicle pack source in the release build.

**Native packaging**
`tools/release/build-packs.mjs` now compiles all declared canonical vehicle Actor packs *from* `buildUniversalVehiclePackSources(root)` and uses historical NeDB `.db` sources only for nonvehicle packs. The pinned official Foundry CLI and independent LevelDB key/document readback remain required. `node tools/release/build-packs.mjs --out build/release/foundryvtt-swse --only vehicles-hybrids` is now a CI release-path probe. The separate Phase 4B native pipeline builds all 11 packs and archives its output.

**Browser/import**
`VehiclePackDataLoader` refuses a missing/wrong-type pack, wrong category, duplicated publication ID, missing provenance identity, or any result count other than 429. There is no fallback to old packs and no silent 250-row cap. It loads only Actors with the expected source-key + pack pairing and resolves Foundry documents from these packs.

`VehicleImportWizard` previews original source-backed values, shows *Unknown* for genuinely unstated SR, removes obsolete merge/preserve UI, and skips legacy observation/provenance probes for new publications. `VehicleImportEngine` now *only* accepts properly marked canonical source Actors, replaces entire statblocks, preserves numeric published Initiative and absent shield fields, and does not call `normalizeVehicleImportData` at all. CP23-C4C reserved staging documents remain explicitly denied before source import. Unrecognized legacy documents now fail closed; this intentionally replaces the old expectation of legacy fallback.

**Store**
`STORE_PACKS.VEHICLE_PACKS` comes from the shared registry. The store loader no longer reads a fallback `foundryvtt-swse.vehicles` aggregate pack. Its vehicle navigation derives the same 11 pack categories instead of maintaining a parallel inventory list.

**V2 sheet/projection**
The canonical source Actor projection includes published numeric Initiative, HP/defenses, known SR, ability scores, explicit movement modes and formatted scale/speed labels, crew/passenger/cargo/consumables, equipped hyperdrive multipliers, priced availability, and printed source book/page, but does not fill source-unknown values with invented defaults. Original fully structured source material is retained under `flags.swse.universalVehicleSource.source`; source attack-group references are display-only and `system.weapons=[]`.

The V2 context and header expose printed source/page, SR provenance, and the no-executable-attacks notice; the resource strip now renders *Unknown* rather than zero for source-silent shields even if a runtime model adds a zero placeholder.

## Sanity validation recorded

A direct pure-function pass over the 429 Phase 2 staged publication records plus approved Core Vulture effective title/page amendment produced **429/429 Actor proposals with 0 exceptions**, exactly once across the 11 packs:
- Starfighters 132; space transports/escape craft 101; capital ships 84; speeders 41; airspeeders 20; walkers 15; tracked 10; wheeled 9; stations 8; ground armor 7; hybrids 2.
- Source SR: unknown 143, explicit 0 = 5, positive 281.
- Printed new-price entries with numeric values: 271.
- All generated `system.weapons` arrays empty; numeric Initiative matches the printed source.

Automated Node contract tests have been added for source generator, manifest, browser index mocks, V2 source presentation, import fail-closed paths, and the retired legacy normalizer expectations. **Do not claim full suite/CI/native LevelDB/live Foundry passed unless those executions are observed.**

## Must complete before gameplay/release acceptance

1. Obtain exact-head GitHub Actions results for the universal vehicle workflow, including pinned dependency install, eleven native LevelDB compilations, every-key document readback, and a release-path compiled-pack probe.
2. Stage/install the compiled LevelDB directories in a real Foundry V13 test system; check all 429 publication Actors open, V2 sheets render, class/category filters work, the source-unknown fields display correctly, and two Core/SotG Vulture claims do not collapse.
3. Exercise the production ActorEngine write/readback path. Confirm the V2 data model does not silently reintroduce source defaults; flags remain authoritative for unknown provenance. Ensure weapon attacks stay disabled without physical-mount/crew certification.
4. Examine the remaining broader vehicle runtime (V2 derived state, crew stations, movement actions and vehicle combat) against newly populated source shapes; patch gaps against the one new authority. No legacy-world migration or old pack fallback is in scope.
5. After smoke tests, update release packaging/docs and independently approve main integration. The registration change on this audit branch is a development cutover, **not** evidence that a user installation has been modified.

## Commands

```sh
node tools/build-universal-vehicle-canonical.mjs --check
node tools/build-universal-vehicle-pack-sources.mjs --check
node --test tests/vehicle-universal-phase*.test.mjs
npm ci --prefix tools/release
node tools/build-universal-vehicle-native-packs.mjs --out build/vehicle-phase4b/native
node tools/release/build-packs.mjs --out build/vehicle-phase4c/release --only vehicles-hybrids
```
