# SotG CP23-A — Deterministic pack reconciliation and native-pack provenance probe

**Checkpoint:** CP23-A is an evidence and verification stage; it does not rebuild/release packs, issue mechanical certificates, or authorize attacks. Branch: `audit/sotg-strict-certification-cp17`.

## Verified input and reconciliation status

CP22 exposes exactly 15 owner-approved book source identities. The repository has **13 observed legacy pack tuple candidates**, which are NOT source-authenticated; **2 book records lack a legacy tuple** (Marauder Corvette and Mon Calamari Star Defender). The existing JSONL pack files have no sourcebook/page/stockSourceEntryKey for these 13 observed rows. Attacks remain deny-by-default.

| Measure | CP23-A |
|---|---:|
| Approved CP21 identities assessed | 15 |
| Legacy pack candidates located | 13 |
| Missing legacy candidates | 2 |
| Canonical source-pack bindings authenticated | 0 |
| Physical mount groups certified | 0 |
| Runtime trusted stock attacks added | 0 |
| Pack documents rewritten | 0 |
| Live Foundry V13 world imports performed | 0 |

## Exact source-to-legacy comparison

*An attack-group count is not a physical weapon count. Matching counts are never taken as a match of gunner stations, firing arcs, installed weapon identity or weapon grouping.*

| Queue | Publication ship | Observed legacy pack tuple | Approved Initiative | Legacy Initiative | Source attack rows | Legacy installed rows | Blocker |
|---:|---|---|---:|---|---:|---:|---|
| 1 | Advanced V-19 Torrent Starfighter | `vehicles-starfighters` / `0320533019f46bf9` | 12 | +5 | 2 | 0 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 2 | Recusant-class Light Destroyer | `vehicles-capital-ships` / `4a12db341764d71c` | -2 | +1 | 5 | 5 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 3 | Kuat Drive Yards Pellaeon-class Star Destroyer | `vehicles-capital-ships` / `9d7f42e1fb7dcda9` | -2 | +0 | 5 | 5 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 4 | Immobilizer 418 Interdictor-class Heavy Cruiser | `vehicles-capital-ships` / `c1728af79988eab9` | -2 | +0 | 2 | 0 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 5 | Junker TYE-wing | `vehicles-starfighters` / `6b2f0741da3cdda3` | 2 | +5 | 1 | 0 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 6 | Koensayr Manufacturing BTL-58 K-wing | `vehicles-starfighters` / `e757ca9a96c28a41` | 6 | +5 | 5 | 0 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 7 | Sienar Technologies Marauder Corvette | No source pack candidate | -3 | — | 2 | — | NO_LEGACY_PACK_CANDIDATE |
| 8 | Mon Calamari Star Defender | No source pack candidate | -3 | — | 6 | — | NO_LEGACY_PACK_CANDIDATE |
| 9 | Eclipse | `vehicles-capital-ships` / `bd0c972f8a5599ab` | -4 | +0 | 6 | 6 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 10 | Theta-class Shuttle | `vehicles-space-transports` / `fa1f202bc57c3636` | 5 | +4 | 2 | 0 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 11 | Sienar Fleet Systems TIE Bomber | `vehicles-starfighters` / `2ec63b561379cc09` | 4 | +4 | 2 | 0 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 12 | Incom T-65XJ3 X-wing Starfighter | `vehicles-starfighters` / `622924c83d0c90be` | 9 | +5 | 2 | 0 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 13 | Incom/Subpro ARC-170 Starfighter | `vehicles-starfighters` / `a9b019928bcb59bc` | 5 | +5 | 3 | 0 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 14 | Alliance A-wing Starfighter | `vehicles-starfighters` / `9a8e2af942c66079` | 12 | +5 | 3 | 0 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |
| 15 | Baudo-class Star Yacht | `vehicles-space-transports` / `fd61d4e5c62bc61e` | -3 | +3 | 1 | 0 | REQUIRES_AUTHENTICATED_SOURCE_REBUILD |

The comparison ledger separately assesses effective Reflex and flat-footed Reflex, retaining original types, source provenance, and the full CP21 ruling. It compares scalars for diagnosis only; **it does not copy those scalars onto an existing Actor**, overwrite a printed fact, convert a source attack group into a mount, or assume a matching legacy group is certified.

## Committed verification controls

- `data/audits/vehicles/swse-sotg-cp23-source-pack-reconciliation.json`: individual source records, pack document identifiers, comparison outcomes, and hard blockers.
- `tools/audits/vehicles/build_sotg_cp23_reconciliation.mjs`: deterministic ledger generator with pinned Git blob checks for the CP22 source catalogue and all three historical JSONL pack files.
- `scripts/domain/vehicles/vehicle-cp23-pack-provenance-probe.js`: run-time **diagnostic** of the actual native pack read and actual world Actor reference, requiring exact pack/document identity, replace-mode import, and unchanged legacy snapshot. An observed result explicitly has `canonicalSourceBindingGranted:false` and `stockAttackAuthorityGranted:false`.
- `scripts/apps/vehicle-import-wizard.js`: calls the diagnostic after the existing CP9C inspection; does not block normal imports, alter actors, write trust flags or promote a stock attack. CP22 visual warning remains in preview and confirmation.
- `tests/phase2c_cp23_pack_reconciliation.test.mjs`: regression and negative tests (all 15 identities, no forged/merge pack, altered stored snapshot, real global world context, pinned input drift, existing stock denial).
- `.github/workflows/sotg-strict-certification-cp17.yml`: exact-push gate includes CP20–CP23 and CP9A/CP9C tests.

## Critical source/authentication distinction

A real `game.packs.get(...).getDocument(...)` returning the exact expected live document proves that a legacy compendium document was genuinely read. It does **not** prove that the book's canonical stats are present, that a world Actor is a durable unmodified clone, that a weapon corresponds to a certified physical mount, or that the import was legally recorded by the authoritative transaction service. CP23-A intentionally leaves those separate gates **DENIED**.

The user approved each CP21 effective source ruling, but that approval never certified the legacy pack serialization. Even the Pellaeon (flat-footed 14) or TIE Bomber (Initiative +4) numerical matches are insufficient evidence of a complete stock source reconstruction.

## Next CP23-B requirements

1. Produce a separate, non-deployed canonical source-package proposal per audited identity from the one CP22 effective read path, resolving only owner-approved fields. A printed weapon attack group must remain evidence until its hardware, arc, station, battery and configuration semantics are separately certified.
2. Verify source-to-pack document IDs and native-v13 LevelDB round-trip parity through the existing pinned official Foundry CLI. Preserve all unrelated pack Actors and installed physical weapons.
3. Introduce durable provenance for a successfully authenticated pack-to-world-Actor import, through ActorEngine governance. The actor's own editable source key is not sufficient.
4. Invalidate installed weapon provenance on mutation, item replacement, source version change, reordering and Pure/Modified configuration changes. Do not infer independent firing permission from payload or gunner counts.
5. Run live Foundry V13 in-world Actor creation/replace and post-mutation tests before changing the zero-entry trusted stock attack registry or release packaging.

**No production compendium records, release ZIP builder, Actor mutation pathways, or Pure/Modified architectural implementation changed in CP23-A.**
