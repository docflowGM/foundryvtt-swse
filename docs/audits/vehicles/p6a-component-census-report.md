# P6A - Canonical Starship Component Census and Mechanical Certification (checkpoint 1)

Generator: `node tools/audits/vehicles/build-p6a-component-census.mjs --write|--check` (inputs: SHA-pinned OCR of all 14 books, `data/audits/vehicles/p6a/census-sources.json`, the SotG table evidence, the catalog, `certification.json`, the effects module). Corrections: `tools/audits/vehicles/apply-p6a-corrections.mjs`. Test: `tests/vehicle-universal-phase4e-p15-component-census.test.mjs`.

**Evidence limit.** Only OCR text is in the repository; the printed PDFs are the final authority. Cells the OCR cannot settle are marked, never guessed, and collected in `pdf-review-worksheet.json` (91 items) for the project owner's PDF review - the same process that certified the movement/defense tables.

## Deliverables (machine-readable, `data/audits/vehicles/p6a/`)
| # | Deliverable | File |
|---|---|---|
| 1 | Canonical Component Registry (180 entries, by book) | `registry.json` |
| 2 | 187-Record Reconciliation (+ missing components) | `reconciliation.json` |
| 3 | Mechanical Certification Ledger (SOURCE_LISTED / SOURCE_VERIFIED / MECHANIC_SPECIFIED / OPERATIONALLY_INTEGRATED, alongside the unchanged production status) | `certification-ledger.json` |
| 4 | Discrepancy Report (original, corrected, citation) | `reconciliation.json` (`differences`) + `legacy.p6a` on each corrected catalog row |
| 5 | Unresolved Rules Register | `docs/audits/swse-rules-decisions-pending.md` (V-P6A-01..04) |
| 6 | Shipyard Readiness Manifest | `readiness-manifest.json` |
| - | PDF review worksheet | `pdf-review-worksheet.json` |

## Book census
| Book | Result |
|---|---|
| Starships of the Galaxy | Movement 27, defense 29, weapon 42 table rows (existing evidence); accessory table 35 rows (names, availability, cost aligned in the OCR; EP and size need the PDF); 9 prose entries (variants, capacity expansions, triple cannon alias, custom-modification procedure, built-in docking clamp) |
| Scum and Villainy | 24 Starship Systems headings legible; the chapter OCR is corrupted, every cell needs the PDF |
| Galaxy at War | Chaff gun, glowing defoliator launcher and shell (table prints damage, EP, cost - no availability); battlefield effects excluded (no modification) |
| Clone Wars Campaign Guide | Composite beam cannon, mass-driver cannon, proton grenade, rail cannon (stat table not in the OCR; mass-driver/rail size restriction stated in prose). Ion pulse cannon, energy bomblet generator, heavy ordnance launcher, microtractor-pressor appear only in vehicle statblocks |
| Legacy Era Campaign Guide | Gravity mine launcher, standard and magnetic mines (clean table) |
| Threats of the Galaxy | Discord missile launcher and missile (clean entry; Huge or larger) |
| Rebellion Era Campaign Guide | Anti-aircraft flak pod (values not in the OCR) |
| Core, KotOR, FUCG, GoI, JATM, SGtD, UR | No component tables; ship-specific equipment only (harpoon gun, baffled drive, sensor baffling etc.) |

## Reconciliation of the 187 records
| Disposition | Count |
|---|---|
| MATCHED_CANONICAL | 95 (all 56 movement/defense certified rows, 39 weapon rows) |
| UNRESOLVED_SOURCE | 82 (identity found; some or all cells need the PDF) |
| CORRECTION_REQUIRED | 3 (SotG accessory cost: cloaking device stygium, hangar bay, hangar bay concealed - OCR column disagrees with the catalog by x1000; PDF confirmation required, not applied) |
| NOT_FOUND_IN_SOURCE | 7 (6 statblock-only: harpoon gun, energy bomblet generator, heavy ordnance launcher, ion pulse cannon, microtractor-pressor, baffled drive; launch bay not located) |
| Missing from the catalog | 6 (armor-piercing concussion missile; launcher capacity expansions x4; detachable cargo pod) + triple cannon recorded as an alias of the double cannon |

## Corrections applied (19 fields, legacy value kept)
Table footnote (1) "Colossal or larger starships only": heavy concussion launcher and missile, heavy ion cannon, Hapan triple ion cannon, light/medium/heavy turbolaser, point-defense weapon, gravity well projector, heavy space mine launcher. Clone Wars Campaign Guide prose: mass-driver cannon (standard, heavy) and rail cannon "Gargantuan size or larger". Threats of the Galaxy: discord missile launcher "Huge size or larger". Galaxy at War prints no availability: chaff gun, defoliator launcher/shell availability now unknown (were Common/Illegal), chaff gun damage none (was Special). SotG weapon table: autoblaster prints no damage (was 3d8x2). None of these rows is certified; weapons remain uncertified and disabled.

## Certification / readiness
Source listed 180; source verified 56; mechanic specified 39; operationally integrated 37 (offline-tested; atmospheric thrusters are certified but conditional and not applied); combat-usable 0 (no catalog row grants executable weapon authority).

## Revalidation of the 56 / 39 / 17
The 56 movement/defense rows re-match their tables (27 + 29 MATCHED_CANONICAL). The 39 effects are unchanged (armor: Reflex only; jets: Dex-modifier delta to Reflex and Initiative; shields: hulls printed with SR 0; hyperdrive: hulls printed without one; atmospheric: conditional). The 17 SOURCE_VERIFIED rows remain without effects (V-P6-01..05).

## Not done in this checkpoint
- PDF values for 91 worksheet items (weapons, accessories, Scum and Villainy, Clone Wars/Rebellion Era tables).
- No missing component is added to production data until its printed values are certified.
- The per-book commits were combined into one checkpoint because the census sources are one file; each book has its own section and status.

---

# Checkpoint 2 - PDF source authority incorporated (2026-11-01)

Input: `data/audits/vehicles/p6a/print-verified-components-v2.json` (172 PDF-reviewed table rows in 7 tables, 91 worksheet dispositions, prose-only options) and its handoff. The generator reconciles identities itself (`suggestedCatalogId` is only checked for conflicts; none) and writes `pdf-reconciliation.json`; `apply-p6a-corrections.mjs` applies only `APPLY` corrections with legacy values and page citations.

| Result | Count |
|---|---|
| Printed rows mapped to catalog identities | 172 / 172 (0 unmapped) |
| MATCHED_CANONICAL (every printed cell equals the catalog) | 171 |
| UNRESOLVED_SOURCE (Clone Wars / Rebellion Era weapon prose without a purchase table: EP, availability, cost now unknown) | 7 |
| CORRECTION_REQUIRED, not applied (V-P6A-05, errata check) | 3 |
| NOT_FOUND_IN_SOURCE (statblock-only: harpoon gun, energy bomblet generator, heavy ordnance launcher, ion pulse cannon, microtractor-pressor; launch bay not located) | 6 |
| Worksheet items | 91 / 91 with a PDF disposition and reconciliation outcome |

**Corrections applied (37 field changes, legacy kept):** printed dash -> unknown EP (ion bomb, gravity mines standard/magnetic, defoliator shell; V-P6A-06); unsourced EP/availability/cost removed from the seven Clone Wars / Rebellion Era weapons; point-defense weapon and gravity mines print no damage; Scum and Villainy: reinforced keel (both) and plasma torch Gargantuan or larger, security bracing Gargantuan or larger and 2,000 base, holding cells 75% 4,000 base, cofferdam 3,000 flat, interrogation chamber 10,000 base; SotG: extended range 2 EP.

**Baffled drive:** reclassified - Scum and Villainy Table 2-10 p. 58 (1 EP, Military, Colossal or larger, 100,000 base); matched; not installable (no effect).

**Certification:** the production `certification.json` is unchanged. A separate overlay `data/vehicle-modifications/certification-p6a.json` marks 115 PDF-matched weapon/accessory/Scum/Galaxy at War/Legacy/Threats rows SOURCE_VERIFIED with book and printed page (never MECHANIC_SPECIFIED); `VehicleInstallationService.loadCatalog` merges it under `certification.json`. Ledger: source listed 181, source verified 171, mechanic specified 39, operationally integrated 37. Readiness: installable 39 (unchanged), combat-usable 0. Weapon rows remain refused by the planner (effect not implemented) and by the attack gate.

**Prose-only additions** (armor-piercing missiles, four capacity expansions, detachable cargo pod, triple cannon alias) remain outside production data: no separate EP or price is printed (V-P6A-01..03).

---

# Checkpoint 3 - Published errata layer and owner rulings (2026-11-01)

**Authority precedence (now encoded):** published source -> published errata -> explicit project-owner ruling -> implementation. An unofficial clarification is never promoted to published-rule authority. Every corrected field records its authority (`PUBLISHED_SOURCE`, `PUBLISHED_ERRATA`, `OWNER_RULING`) in `legacy.p6aHistory`; `legacy.p6a` keeps the original catalog value.

**Errata source:** *Starships of the Galaxy Errata 1.0* (2008-01-29), transcribed by the project owner into `data/audits/vehicles/errata/sotg-errata-1.0.json`. **The errata text could not be checked in this session** (the hosting sites are blocked by the session's network policy); the file records `sessionVerification: NOT_VERIFIED_IN_SESSION`. The generators also check that each errata "printed" value equals the value the PDF/OCR shows before correcting it.

| Errata | Before | After | Records |
|---|---|---|---|
| Table 3-5 footnote (1) | Colossal or larger (P6A checkpoint 1, from the printed footnote) | Colossal (frigate) or larger | 10 weapons; this **reverses** the checkpoint-1 change and restores the original catalog value |
| Extended range EP | 2 (checkpoint 2, from the printed table) | 1 | 1 accessory; also a reversal |
| Stock-frame Strength | 106 / 110 / 114 / 118 / 124 | 56 / 58 / 60 / 94 / 100 | heavy freighter, corvette, frigate, cruiser, battlecruiser (`stock-frames.json`); legacy `data/stock-ships.json` returns to its original values (the P2/P5 printed-table change is reversed in its provenance) |

**Stock-frame Strength consumers checked:** `previewFrame` (Fortitude = 10 + Str modifier; Damage Threshold = Fortitude + size modifier) and `buildCustomVehicleActorData` (attributes) via `stock-frames.json`; the retired `VehicleFactory` stock-ship path and the GM approvals editor via `data/stock-ships.json`. Effect on new designs: heavy freighter Fort 58 -> 33, DT 158 -> 133; corvette 60 -> 34 / 160 -> 134; frigate 62 -> 35 / 162 -> 135; cruiser 64 -> 52 / 264 -> 252; battlecruiser 67 -> 55 / 267 -> 255. **Existing custom Actors and funded construction projects are not migrated:** their sealed records keep the statistics derived at approval (no world migration). A GM should re-check any custom ship built from these five frames before this checkpoint.

**Owner rulings:** V-P6A-05 adopts the printed SotG prices (stygium cloaking device 100,000,000; hangar bay 10; concealed hangar bay 1,000 credits base). V-P6A-06 marks dash-EP ammunition (ion bomb, gravity mines standard/magnetic, glowing defoliator shell) as `installationKind: consumable-ammunition` with EP unknown; the planner refuses to install it (`CONSUMABLE_AMMUNITION_NOT_AN_INSTALLATION`). Launcher compatibility, quantity, loading and firing stay gated.

**Reviewed, not changed:** the owner reports errata on the gravity well projector area and Y-wing shield ratings, but their wording is not in the repository. Current data: gravity well projector 4x4-square area, attack vs Reflex 10 (SotG prose); Y-wing records Core Rulebook p. 178 SR 25, Clone Wars Campaign Guide p. 173 BTL-S1 SR 10, SotG p. 158 BTL-S3 SR 10. The 429 published vehicle records are untouched; both items are listed as `REVIEW_PENDING_WORDING` in the errata file.

**Errata for the other books:** not searched. The errata sources are outside the session's network allowance; the registry is not declared authoritative for errata until they are reviewed.

**Result:** 187 records: 174 matched (source + errata + rulings), 7 unresolved (Clone Wars / Rebellion Era weapon prose without purchase tables), 6 not found as installable options, 0 corrections pending. Installable 39 and combat-usable 0 unchanged.

---

# Checkpoint 4 - Errata source confirmation (2026-11-01)

- **Provenance:** `sotg-errata-1.0.json` now has `provenance.status: INDEPENDENTLY_VERIFIED` with a preserved `verificationHistory` (Claude session: not verifiable from the session network; project owner: verified against the published 2008-01-29 errata). Generated stock frames carry `verification: INDEPENDENTLY_VERIFIED`.
- **Confirmed and already applied:** Table 3-5 footnote (10 weapons), Extended Range 1 EP, five stock-frame Strength scores.
- **SOTG-E1-GRAVITY-WELL-AREA:** source-confirmed. The Interdictor cruiser record (`sotg-immobilizer-418-interdictor-class-heavy-cruiser`, p. 100) already records the conflict (statblock 4x4 vs rules callout 3x3); the errata resolves it to 3x3. Proposed, not applied to the sealed record. Whether the generic component (p. 45, 4x4) changes too is V-P6A-07; the catalog row keeps its printed 4x4.
- **SOTG-E1-Y-WING-SHIELDS:** source-confirmed for the three SotG models on pp. 158-159 - `sotg-koensayr-btl-s3-y-wing` (p. 158), `sotg-koensayr-btl-s3-courier` and `sotg-koensayr-btl-a4-lp-longprobe` (p. 159): SR 10 -> 25. Proposed, not applied. Core Rulebook Y-wing (SR 25) and Clone Wars BTL-S1 (SR 10) are explicitly out of scope.
- **Proposals file:** `data/audits/vehicles/errata/sotg-errata-1.0-publication-proposals.json` (identities, fields, current and proposed values, gameplay impact). A regression test pins the current values; applying them to the sealed 429 records needs your approval (the shield change also affects the live shield pool, the creation/runtime mirrors and existing world Actors).
- **Errata inventory:** `data/audits/vehicles/errata/errata-inventory.json` lists all 14 books. Only SotG is `OFFICIAL_PUBLISHED_VERIFIED`; the other 13 are `NOT_INVENTORIED` - I did not assert from memory which official errata exist, and the errata hosts remain outside this session's network allowance.
