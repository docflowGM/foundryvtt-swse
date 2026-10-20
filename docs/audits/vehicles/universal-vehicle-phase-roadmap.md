# SWSE Universal Vehicle Migration — authoritative execution roadmap

Branch: `audit/universal-vehicles-phase1`. Parent: `feat/vehicle-canonical-census-cutover` (head `25472be`). Do not merge directly into main until Phase 4 acceptance.

## Mission and scope

Build one unified publication-specific census and one production vehicle SSOT for every independent vehicle statblock in all **14** supplied SWSE sourcebooks. This includes starfighters, transports, capital ships, walker vehicles, speeders and speeder bikes, airspeeders and atmospheric gunships, tracked/wheeled vehicles, repulsorlift tanks, watercraft, installations when encoded as vehicle Actors, and hybrid space/ground vehicles.

Include only actual published vehicle statblocks. Narrative-only mentions, vehicle customization equipment, weapon parts and other nonvehicle entities do not become vehicle records; list questionable cases for a single identity decision. Published variants and different books remain separate *publication claims*. Identical hulls across books can share a family key later; never silently deduplicate claims. A hybrid starfighter/walker has one publication identity and multiple mobility tags, not two entries.

### Baseline

- The first ship-only Phase 1 census had 316 publication claims, all close-reviewed in the older project.
- The approved, append-only supplemental ship census in `swse-phase2c-cp3-318-census-overlay.json` makes 318 existing reviewed spacecraft claims, including **Hornet** (`Scum and Villainy`) and **Deep-X** (`Unknown Regions`).
- The current `data/canonical/vehicles/ships.json` and native ship pack contain **316** records. Do not count the two approved supplemental claims as already present in that pack.
- The first ship census expressly excluded ground/air vehicle universal coverage and was not an independently exhaustive discovery of the whole book. Reuse verified ship provenance, but independently sweep every book for remaining vehicle types and overlooked craft.
- Retain the current ship source and native pack unchanged until the Phase 4 replacement/cutover. No rewrites of stock ship mechanics during Phase 1.

## Current Phase 1 status (book checkpoints)

- **1-A Core Rulebook — COMPLETE:** 17 publication entries (10 inherited spacecraft; seven new ground/air vehicles). Provenance ledger: `swse-universal-phase1a-core-rulebook.json`.
- **1-B Starships of the Galaxy — COMPLETE:** 105 publication entries (104 inherited spacecraft; new `Escape Pod`, printed p50/PDF p51). Four printed station-class vessels and one starfighter/walker hybrid remain single identities. Provenance ledger: `swse-universal-phase1b-starships-of-the-galaxy.json`.
- **1-C Clone Wars Campaign Guide — NEXT.**
- Current known provisional publication total across all books: **326** (318 amended spacecraft baseline + seven Core nonship entries + one SotG Escape Pod). This is not final exhaustiveness and **not** the number of generated compendium Actors.
- 1-A and 1-B do not modify ship JSON, existing generated .db files, the native packs or gameplay systems.

## Phase 1 — Enumeration + provenance only

Each subphase owns one book. Search the TXT across the **whole book**, cross-check every vehicle entry (including page breaks, sidebars and nonship subsections) against printed PDF pages, and emit a compact per-book ledger. Required fields: exact printed vehicle name, stable publication source key, exact book, printed statblock-start page, physical PDF page(s), printed type line, normalized primary category, mobility domains, provenance hash, source-review state, and status of any legacy ship match.

Do NOT copy mechanical statistics yet. Record ambiguous identity/type, not speculative replacements.

| Subphase | Sourcebook | Reviewed historical ships | Other vehicles |
|---|---|---:|---|
| 1-A | Core Rulebook | 10 | Inventory 7 ground/air entries on pp 175–177 |
| 1-B | Starships of the Galaxy | 104 | 1 new independently printed Escape Pod statblock on p50; ledger complete |
| 1-C | Clone Wars Campaign Guide | 41 | Independent nonship search |
| 1-D | Knights of the Old Republic Campaign Guide | 32 | Independent nonship search |
| 1-E | Force Unleashed Campaign Guide | 19 | Independent nonship search |
| 1-F | Scum and Villainy | 11 + Hornet amendment | Independent nonship search |
| 1-G | Galaxy at War | 5 | Independent nonship search |
| 1-H | Galaxy of Intrigue | 6 | Independent nonship search |
| 1-I | Jedi Academy Training Manual | 1 | Independent nonship search |
| 1-J | Legacy Era Campaign Guide | 39 | Independent nonship search |
| 1-K | Rebellion Era Campaign Guide | 35 | Independent nonship search |
| 1-L | Threats of the Galaxy | 1 | Independent nonship search |
| 1-M | Unknown Regions | 12 + Deep-X amendment | Independent nonship search |
| 1-N | Scavenger's Guide to Droids | 0 | Search independently, do not assume empty |

**Gate per book:** deduplicated by publication key, every known vehicle located and typed, all printed/PDF provenance confirmed, unknowns clearly marked; commit and push book immediately. Phase 1 closure produces a frozen universal publication-claim census, **not** a verified mechanical runtime dataset.

## Phase 2 — Populate the EXISTING schema

Subphases 2-A through 2-N follow the same book sequence. Map each vehicle's exact source values to the **already existing vehicle schema**, using prior phase-0b semantic definitions as needed; do not restart schema-design deliberations. Preserve raw printed text where ambiguous and distinguish printed zero, explicitly none, unpublished/unknown and contradictory. Transcribe defenses, HP/DR/SR/threshold, Initiative, ability scores, speeds by scale, crew and roles, passengers, cargo, hyperdrive/navigation, consumables, cost and availability, published attack groups, and printed special mechanics.

Source-confirmed Attack Groups are **not** physical weapon mounts; unresolved mount geometry or battery composition must remain uninstalled/untrusted. Use prior approved SotG overrides without overwriting original print. The two approved supplemental spacecraft enter production only after equivalent structured hydration.

**Gate per book:** one complete source-backed schema record per census key, a machine-readable list of gaps/contradictions, and no invented defaults. Commit and push each finished book.

## Phase 3 — QA and reconciliation

Subphases 3-A through 3-N perform **independent primary-PDF** sample/field checks, with complete coverage of high-risk contradictions, page/variant identity, physical weapon operator and arc where they can be published, spellings, domain/classification, and canonical record counts. Validate no duplicated keys, no dropped vehicles, no silent cross-book merges, no prose-as-number coercion, and no migration of uncertain mechanics into playable authority.

**Gate per book:** tests and discrepancy log show no unresolved critical/provenance errors. Nonblocking printed source silence can be recorded and left informational. No new proliferating certificate/checkpoint formats.

## Phase 4 — Build, commit, and cut over

- **4-A Freeze unified SSOT:** `data/canonical/vehicles/vehicles.json`, **one complete vehicle object per line** (NDJSON, matching the requested `.json` convention). Produce category projections from the master, not separately edited competing authorities. Account for all 318 inherited ship claims plus every newly enumerated nonship vehicle claim.
- **4-B Build:** regenerate `.db` source compendiums and official Foundry V13 native LevelDB directories deterministically. Validate extract/readback count and exact source identity, with unknown mechanics remaining untrusted.
- **4-C Wire:** update `system.json`, V2 vehicle browser, import wizard, store and other consumers to read canonical category packs. Retire duplicate legacy vehicle sources only when all intended consumers use the SSOT. The old ship-specific JSON/pack becomes generated or retired, never another writable truth.
- **4-D Live Foundry QA:** open compendiums, import/create Actors, inspect V2 sheet, run movement, defensives and **only** source-authorized weapon actions; check world Actor preservation and no inadvertent world migration.
- **4-E Release:** commit and push generated packs, pass CI, review diff, merge in the controlled release workflow. Record final counts and changes; no cutover from Phase 1 artifacts alone.

### Book workflow

For each subphase: use TXT to find candidate statblocks -> check PDF pages visually -> write provenance ledger -> run compact identity/coverage checks -> commit/push. Move to the next book. This intentionally avoids waiting for speculative perfect mount certificates before shipping reference vehicle records.
