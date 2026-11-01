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
