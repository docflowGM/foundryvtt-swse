# SWSE Universal Vehicles — Phase 3 final source acceptance

**Decision:** ACCEPTED FOR PHASE 4A SOURCE-ONLY CANONICAL ASSEMBLY (not for runtime migration or live cutover).

## Accepted coverage

- **429/429** publication-specific source vehicle records across 14 SWSE books; source keys remain stable.
- **48/48** final-seven-book newly staged vehicle PDF-field QA records independently verified; the initial seven books' 63 newly found source vehicles were PDF-backed in Phase 2.
- **10/10** named Phase 3 high-risk source cases inspected. Printed contradictory values and alternate equipment choices remain explicit. Unknown physical mounts/arcs are *not* promoted to executable attacks.
- **One Core Vulture provenance discrepancy** resolved through the PDF SHA-anchored immutable amendment `data/audits/vehicles/swse-universal-phase3-vulture-provenance-amendment.json`. The original 316-ship authority and frozen Phase 1 census remain untouched audit evidence; the **effective Phase 4A input** correctly reports the original Core printed heading **“Vulture” Droid Starfighter**, printed p.181 and physical PDF p.182.
- Separate original Core and SotG Vulture publication identities retained, with one dual-flight/walking-mode source record per book.

## Required authoritative source resolver

`tools/lib/universal-vehicle-source-provenance.mjs` is a fail-closed, nonmutating reconciliation of original Core Phase 1 ledger/census, Phase 2 staging, and legacy ship authority. It verifies the **old values + exact source key + original Core PDF SHA** before applying only the published title/page correction. All other 428 global source claims pass through unchanged.

Run `node tools/build-universal-vehicle-phase3-source-preview.mjs --check` to validate and summarize all 429 effective source records; `--emit-ndjson` emits a read-only Phase 4A input proposal to stdout. **This is not yet `data/canonical/vehicles/vehicles.json`, a registered native pack, or a Foundry Actor migration.** No source projection may discard the amendment or merge publication variants.

## Mechanical and runtime restrictions remain independent

Source acceptance certifies published source evidence and documented ambiguities, **not** strict physical mount count, arcs, station-to-weapon operator grants, firing group executable attacks, alternate weapon-installation state, or live V2 behavior. All new source groups remain unbound. Historical ship-specific stronger certificates are preserved, never generalized.

The source-to-runtime translation blocker **CP23-C4C** remains open: legacy `normalizeVehicleImportData` silently loses numeric Initiative and synthesizes unknown fields. The existing fail-closed importer restriction must remain until a new explicitly tested, provenance-preserving translator passes source-to-world readback. Native pack registration, world Actor imports, release and cutover remain NOT APPROVED.

This Phase 3 acceptance should be a distinct review gate from the later Phase 4A canonical SSOT build and the eventual compendium cutover. The next session should decide how the unified 429-source SSOT projects to new category compendiums, when old vehicle packs become read-only/retired, and how GM world Actors are preserved during controlled migration.
