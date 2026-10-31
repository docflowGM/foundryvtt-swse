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
