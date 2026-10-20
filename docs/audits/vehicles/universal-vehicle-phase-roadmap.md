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
- **1-C Clone Wars Campaign Guide — COMPLETE:** 67 publication entries (41 inherited spacecraft; 26 additional air/ground/water vehicles). Distinct cases include SPHA configurable armaments counted once, two separately printed Tsmeu-6 wheel bikes, Manta water vehicle, DC0052 airspeeder on p138, and Kashyyyk vehicles pp219–220. Ledger: `swse-universal-phase1c-clone-wars.json`.
- **1-D Knights of the Old Republic Campaign Guide — COMPLETE:** 39 publication entries (32 inherited spacecraft; seven added vehicles). Six civilian speeders/airspeeders on printed pp92–95; Basilisk War Droid on printed p203, classified as an air vehicle (droid) with spaceflight. Ledger: `swse-universal-phase1d-knights-of-the-old-republic.json`.
- **1-E Force Unleashed Campaign Guide — COMPLETE:** 34 publication entries (19 inherited spacecraft and 15 new vehicles). Main vehicle chapter pp110–113: seven; adventure Prisoner Convoy p142: two; Imperial vehicles pp200–203: six. Ledger: `swse-universal-phase1e-force-unleashed.json`.
- **1-F Scum and Villainy — COMPLETE:** 13 publication records (11 inherited spacecraft, one previously approved Hornet-class Interceptor amendment, and one newly found StarForge Station CL 20 statblock on printed p130). No new ground/air vehicle statblocks found in full PDF sweep. Ledger: `swse-universal-phase1f-scum-and-villainy.json`.
- **1-G Galaxy at War — COMPLETE:** 11 publication entries (five inherited spacecraft; six additional full vehicle statblocks on printed pp62–64, 179 and 216). Includes Drop Pod air vehicle and two adventure-only vehicles. Ledger: `swse-universal-phase1g-galaxy-at-war.json`.
- **1-H Galaxy of Intrigue — COMPLETE:** 8 publication records (six inherited spacecraft, plus Corona Limited Luxury Groundspeeder CL4 and SoroSuub JG-8 Luxury Landspeeder CL2, both printed p71). Ledger: `swse-universal-phase1h-galaxy-of-intrigue.json`.
- **1-I Jedi Academy Training Manual — COMPLETE:** One inherited spacecraft, Chu'unthor (printed p151), and no additional independently printed vehicle statblocks in a full 161-page PDF survey. Ledger: `swse-universal-phase1i-jedi-academy-training-manual.json`.
- **1-J Legacy Era Campaign Guide — COMPLETE:** 49 source publication records (39 inherited spacecraft + ten independently statted vehicles: three speeder bikes, two airspeeders, two ground walkers, and three space stations including The Wheel). Ledger: `swse-universal-phase1j-legacy-era-campaign-guide.json`.
- **1-K Rebellion Era Campaign Guide — COMPLETE:** 53 publication identities (35 inherited spacecraft + 18 independent nonspacecraft, including five civilian speeders/cloud cars, six Rebel vehicles, five Imperial ground/air vehicles, and two Zann Consortium vehicles). Ledger: `swse-universal-phase1k-rebellion-era-campaign-guide.json`.
- **1-L Threats of the Galaxy — COMPLETE:** Five records (one inherited CEC freighter + Hound's Tooth, Bloodfin, modified R-2000 Raptor and Nebulon-Q Swoop); ledger `swse-universal-phase1l-threats-of-the-galaxy.json`.
- **1-M Unknown Regions — COMPLETE:** 26 publication identities (12 inherited ships + the approved Deep-X supplemental claim already counted in the 318 baseline + 13 ground/air vehicles including late Wind Skiff p189 and Eeook Protector VI p214). Ledger: `swse-universal-phase1m-unknown-regions.json`.
- **1-N Scavenger's Guide to Droids — COMPLETE:** One independently printed DP-2 Probe Droid hybrid starfighter/ground vehicle (printed p82). All 14 books surveyed; full frozen census closeout is NEXT.
- Current known provisional publication total across all books: **429** (318 amended spacecraft baseline + seven Core nonship entries + one SotG Escape Pod + 26 Clone Wars other vehicles + seven KOTOR vehicles + 15 Force Unleashed vehicles + one Scum and Villainy space station + six Galaxy at War nonship vehicles + two Galaxy of Intrigue groundspeeders + ten Legacy Era nonship vehicles + 18 Rebellion Era nonship vehicles + four Threats of the Galaxy vehicles including Hound's Tooth + 13 Unknown Regions nonspacecraft + one Scavenger's Guide DP-2 hybrid). This is not final exhaustiveness and **not** the number of generated compendium Actors.
- 1-A through 1-N do not modify ship JSON, existing generated .db files, the native packs or gameplay systems.

## Phase 1 — Enumeration + provenance only

Each subphase owns one book. Search the TXT across the **whole book**, cross-check every vehicle entry (including page breaks, sidebars and nonship subsections) against printed PDF pages, and emit a compact per-book ledger. Required fields: exact printed vehicle name, stable publication source key, exact book, printed statblock-start page, physical PDF page(s), printed type line, normalized primary category, mobility domains, provenance hash, source-review state, and status of any legacy ship match.

Do NOT copy mechanical statistics yet. Record ambiguous identity/type, not speculative replacements.

| Subphase | Sourcebook | Reviewed historical ships | Other vehicles |
|---|---|---:|---|
| 1-A | Core Rulebook | 10 | Inventory 7 ground/air entries on pp 175–177 |
| 1-B | Starships of the Galaxy | 104 | 1 new independently printed Escape Pod statblock on p50; ledger complete |
| 1-C | Clone Wars Campaign Guide | 41 | 26 newly located ground, air and water vehicle statblocks; ledger complete |
| 1-D | Knights of the Old Republic Campaign Guide | 32 | 7 vehicles verified on pp92–95, 203; ledger complete |
| 1-E | Force Unleashed Campaign Guide | 19 | 15 additional ground, repulsorlift, wheeled, tracked and walker statblocks; ledger complete |
| 1-F | Scum and Villainy | 11 + Hornet amendment | 1 newly discovered StarForge Station statblock, printed p130; ledger complete |
| 1-G | Galaxy at War | 5 | Six independently printed new statblocks; ledger complete |
| 1-H | Galaxy of Intrigue | 6 | Two printed groundspeeders on p71; ledger complete |
| 1-I | Jedi Academy Training Manual | 1 | No new vehicles; 161-page book surveyed; ledger complete |
| 1-J | Legacy Era Campaign Guide | 39 | Ten nonship records (three stations, three bikes, two airspeeders, two walkers); ledger complete |
| 1-K | Rebellion Era Campaign Guide | 35 | 18 additional ground/air vehicles; ledger complete |
| 1-L | Threats of the Galaxy | 1 | Four additional NPC/personal-vehicle statblocks; ledger complete |
| 1-M | Unknown Regions | 12 + Deep-X amendment | 13 ground/air/wheeled/tracked vehicles; ledger complete |
| 1-N | Scavenger's Guide to Droids | 0 | One DP-2 Probe Droid CL6 hybrid starfighter/ground vehicle on p82; ledger complete |

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
