# SWSE Universal Vehicles — Phase 4B replacement pack checkpoint

**Branch:** `audit/universal-vehicles-phase1`
**Strategy:** owner-authorized clean-break development replacement; no player vehicles, no old-world Actor migration.
**Scope:** 429 distinct publication claims; 14 printed books. Phase 0–3 source audits remain closed.
**Checkpoint status:** Phase 4B generator and native compiler **committed**; real CI/native LevelDB and V2 Foundry smoke results must be read before declaring certification.

## Production authority
- `data/canonical/vehicles/vehicles.json`: the sole 429-source-claim SSOT (NDJSON serialized into historical .json path).
- `data/canonical/vehicles/vehicles.manifest.json`: content checksum and input acceptance counts.
- `tools/build-universal-vehicle-pack-sources.mjs`: 429 -> 11 disjoint Foundry Actor source streams; does not create Actors or register packs.
- `tools/build-universal-vehicle-native-packs.mjs`: compiles those generated Actor sources via pinned official CLI to Foundry V13 native LevelDB; compares every key and every record after LevelDB readback.
- `tools/release/package*.json`, `tools/release/pack-sources.mjs`: the same pinned native build contract used by the mainline release tool (copied into this vehicle branch).
- `tests/vehicle-universal-phase4b-native-sources.test.mjs`: count, category, exact source, stable ID and no-untrusted-attack assertions.
- `.github/workflows/vehicle-universal-phase1.yml`: tests and separate native-build/readback job uploading a compiled-pack artifact.

## Exact source partition

| New pack | Source identities |
| --- | ---: |
| vehicles-starfighters | 132 |
| vehicles-space-transports | 101 |
| vehicles-capital-ships | 84 |
| vehicles-speeders | 41 |
| vehicles-airspeeders | 20 |
| vehicles-walkers | 15 |
| vehicles-tracked | 10 |
| vehicles-wheeled | 9 |
| vehicles-stations | 8 |
| vehicles-ground-armor | 7 |
| vehicles-hybrids | 2 |
| **Total** | **429** |

Every publication identity appears **once**. The source categories (31 primary category values) are mapped explicitly: unknown categories cause a hard failure, not a catchall pack or fuzzy classifier.

## Source-only projection and protection

Every compiled proposal is a `type:vehicle` Foundry Actor source with a stable 16-character hash ID, numeric published Initiative, known HP/defenses, source movement modes, source classification, and read-only publication flags.

`flags.swse.universalVehicleSource.source` contains the full original accepted source claim, preserving source uncertainty, contradictions, conditional loadouts, the Vulture provenance amendment, and printed attack-row information. `flags.swse.canonicalPublication.foundryStockAttackTrusted = false`. `system.weapons = []`, `items = []`, and `effects = []`. Printed attack rows are display-only.

The source corpus contains **143** missing/null shield ratings, **5** known zero ratings, and **281** positive ratings. The projection emits a shield value only for a known printed number; missing/null source data never becomes fabricated SR 0. The former legacy normalizer must not be applied to these Actors because it destroys numeric Initiative and synthesizes unknowns.

**Separate gates:** Source identity certification does not prove Foundry runtime compatibility, V2 sheet behavior, physical mount assignment, weapon attack execution, or production deployment.

## Commands

```bash
node tools/build-universal-vehicle-canonical.mjs --check
node --test tests/vehicle-universal-phase4b-native-sources.test.mjs
node tools/build-universal-vehicle-pack-sources.mjs --check
node tools/build-universal-vehicle-pack-sources.mjs --write
npm ci --prefix tools/release
node tools/build-universal-vehicle-native-packs.mjs --out build/vehicle-phase4b/native
```

The native compiler writes 11 LevelDB directories at `build/vehicle-phase4b/native/packs/<name>`, and a `vehicle-phase4b-native-receipt.json`. Its exact readback is mandatory. The workflow uploads this output as the `swse-universal-vehicles-phase4b-native` artifact upon CI success.

## Remaining cutover work

1. Check exact-head CI and native build/readback receipt. A GitHub Actions result is **not** deemed passed merely because an Actions workflow file exists.
2. Integrate the 11 packs into the actual release assembly/install path, and replace all legacy vehicle **Actor** pack registrations (including the duplicate all-vehicles pack and 316-ship pack) as one coherent change. Do not remove non-Actor vehicle-weapon Item packs. The existing browser loader's list must match the new pack set; never keep an active old-catalog fallback.
3. Route compendium Actor import through a source-aware path that does NOT call the legacy normalizer. Preserve source-known numbers and source-unknown provenance. Reject executable stock attacks.
4. Perform a controlled Foundry V13 smoke run: native pack opens, 429 count, two cross-book Vultures separate, hybrid one Actor, V2 sheet opens, numeric Initiative survives creation/import.
5. Finish mechanics after the clean cutover on the new sole V2 authority. No world-Actor migration, existing-player continuity, or obsolete-system compatibility gate is required.
