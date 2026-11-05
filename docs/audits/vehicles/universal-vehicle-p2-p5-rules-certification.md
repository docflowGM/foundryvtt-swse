# Universal Vehicles — P2/P5 Rules Certification (primary-source review)

Updated 2026-10-30 after the project owner's PDF review. Branch `audit/universal-vehicles-phase1`.
Companion files: `data/audits/vehicles/swse-p2-sotg-modification-evidence.json` (generated; `tools/audits/vehicles/build-sotg-modification-evidence.mjs --check`), `data/audits/vehicles/swse-p2-pdf-review.json` (the owner's PDF readings), `data/vehicle-modifications/certification.json`, `data/canonical/vehicles/construction/stock-frames.json`, `data/canonical/vehicles/construction/unused-emplacement-points.json`, and the discrepancy report `universal-vehicle-p5-discrepancy-report.md`.

## Method and evidence tiers
Searched the committed OCR texts in `reference/sourcebooks/` (all 14 books). The OCR is the fast layer and **the PDF is final authority** (`reference/sourcebooks/README.md`). Evidence tiers used in the data:

| Tier | Meaning |
|---|---|
| `OCR_TEXT` / `SOURCE_VERIFIED_TEXT` | every cell of the row read cleanly from the OCR and equals the catalog |
| `PDF_REVIEWED` / `PDF_CONFIRMED` | cells the OCR could not read were read from the scanned PDF by the project owner (`swse-p2-pdf-review.json`) |
| `UNVERIFIED` | no readable source; never certified |

Table pages are now exact where the PDF review gave them: Table 3-2 p. 39, Table 3-3 p. 41, Table 3-4 p. 43, Table 3-8 p. 52, Table 3-9 p. 53 (the earlier "pp. 53-54" for the stock tables came from the table of contents and was wrong); Crew Quality is Core Rulebook p. 174. Weapon and accessory tables have no reviewed page yet.

## 1. Rules the books establish (and where the code uses them)

| Rule | Source | Implemented in |
|---|---|---|
| Size cost modifiers: Huge x1, Gargantuan x2, Colossal x5, frigate x50, cruiser x500, station x5,000 | SotG Table 3-1, p. 38 | `vehicle-modification-rules.js` (book example 5,000 base = 25,000 / 2,500,000 is a test) |
| A "base" cost is multiplied by the modifier; a plain credit cost is not | SotG p. 40 | `systemCost` |
| Lacking EP: install anyway; per missing point +2 days, +5 DC, +20% cost; ship becomes *used*; system damaged beyond repair if the ship is disabled; the GM may rule a modification impossible | SotG p. 38 | `quoteInstallation`; **allowed by default** (owner direction 2026-10-30). Unknown EP is not insufficient EP and still fails closed |
| Gaining EP: remove systems (half install time, free, resale 1/4 only if in good condition and a buyer exists); give up cargo tons = cost modifier per point; remove escape pods | SotG p. 38 | `quoteRemoval`, `cargoTonsForEmplacementPoints` |
| Unused EP: standard design generally 1; Corellian Engineering Corporation designs 5 unless specified; Table 3-2 (J-Type transports 2); YT-series 10; Rebellion Era ships that state theirs | SotG pp. 39, 154; Rebellion Era Campaign Guide | `unused-emplacement-points.json` + `makeUnusedEmplacementResolver` |
| Nonstandard modification: EP doubled, cost x5, GM is final arbiter; hyperdrives are always nonstandard for starfighters; the Starship Designer feat never treats work as nonstandard | SotG p. 39 and Hyperdrives text | `nonstandardAssessment` (objective cases only; otherwise `NONSTANDARD_DETERMINATION_REQUIRED`) |
| Work force: Gargantuan or smaller 1; Colossal 5; frigate 10; cruiser 20; station 50; maximum 10x; time = EP x cost modifier / workers | SotG p. 39 | `MIN_WORK_FORCE`, `quoteInstallation` |
| Installation check: Mechanics DC 20 + EP; fail by < 10 = partial (retry at half time and money, +5); fail by 10+ = total failure (all wasted, start over) | SotG p. 40 | `installationCheckOutcome`, `vehicle-installation-job.js` (state machine) |
| Starship Designer feat: 30 days, DC 25, +1 per additional 100,000 credits; never nonstandard | SotG New Feats | `designTime`, `validateDesign` |
| Designing from scratch: start from a stock frame, add systems with the modification rules; lone character needs the feat and normally a shipyard; the frame price already includes the size multiplier and excludes hyperdrive, cargo, weapons, shields | SotG Stock Ships (Tables 3-8, 3-9) | `stock-frames.json`, `custom-vehicle-construction.js` |
| Reflex = 10 + vehicle Dex modifier + size modifier + armor bonus; Fortitude = 10 + Str modifier; damage threshold = Fortitude + size modifier | Core Rulebook, Vehicle Combat Statistics | `previewFrame` (reproduces the X-wing; fits 94-98% of published vehicles) |
| Crew Quality: untrained / normal / skilled / expert / ace = attack -5/+0/+2/+5/+10, check +0/+5/+6/+8/+12, CL -1/+0/+1/+2/+4; crew modifiers are already in published statblocks | Core Rulebook p. 174 (PDF) | `CREW_QUALITY`; Initiative = Dex modifier + size modifier + crew check modifier (fits 343 of 375 published vehicles); Perception = crew check; base attack = crew attack bonus |
| Vehicle size modifier (Reflex, Initiative, Pilot): Huge -2, Gargantuan -5, Colossal -10 **and each Colossal subtype -10** | Core Rulebook Table 10-1 | `REFLEX_SIZE_MODIFIER`; combat table fixed for the subtypes |

## 2. Catalog certification (187 rows)

| Result | Rows | Meaning |
|---|---|---|
| Certified in `certification.json` (`SOURCE_VERIFIED`) | 56 | 48 clean OCR rows + 8 PDF-reviewed rows of the movement/defense tables (Table 3-3 p. 41, Table 3-4 p. 43) |
| PDF-reviewed | 8 | `armor-1`, `armor-4` (catalog corrected), `shields-10`, `shields-40`, `shields-50`, `shields-60`, `shields-150`, `maneuvering-jets-2` |
| Weapon table: transcribed and machine-checked, **not certified** | 40 rows | The table has not been PDF-reviewed. 10 rows differ from the catalog (all size restrictions against footnote (1) "Colossal or larger starships only", plus `autoblaster` damage); 9 have a garbled cell |
| Accessories (and other weapon rows) | 84 | Table not parseable; **not certified** |
| Scum and Villainy entries | 4 | OCR unreadable; `reinforced-keel-boarding` not found |

A certified row is still **not installable**: `MECHANIC_SPECIFIED` requires its effect to be implemented, and the planner returns `MODIFICATION_EFFECT_NOT_IMPLEMENTED`.

**Effect text.** 97 rows had effect text that did not match the printed prose (e.g. atmospheric thrusters, combat thrusters, maneuvering jets, regenerating shields, navicomputers, SLAM, cargo pods, sensor arrays, droid repair team, smuggler's compartments, transponders, gravity well projector, shieldbuster torpedoes). Their `effect`/`description` now paraphrase the printed text (`effectVerification: PRINTED_PROSE`, original kept under `legacy`); the other 90 rows are `UNVERIFIED`. See the discrepancy report.

## 3. Decision register status

| ID | Status after this review |
|---|---|
| V-P2-01 | Largely answered. Formula and table are published; the book's general rule (1) is retained and exceptions are encoded. Shortfall installs allowed (owner direction). **Open:** the three KotOR statblock "Emplacement Points" lines (4, 3, 2) are not known to mean *unused* points and stay unknown; Table 3-2 names (Blockade runner, J-Type transports, Republic cruiser) that cannot be mapped to one record |
| V-P2-02 | 56 rows certified; weapon/accessory tables awaiting PDF review. Bare "Colossal" in a size restriction: the book's own Table 3-1 treats plain Colossal as a separate size from its subtypes |
| V-P2-03 | Procedure answered and implemented (time, DC, work force, failure outcomes, removal). **Open policy:** resale is conditional on a buyer, so it is not credited automatically; effect application is an implementation backlog |
| V-P2-04 | No published firing-arc rule for installed weapons exists in any searched book, so the arc requirement is project policy. **Open** |
| V-P4-01 | Resolved in direction: a published statblock Initiative already includes the size and crew modifiers (Initiative = Dex modifier + size modifier + crew check modifier; 343/375), and the owner directed that crew and size are not double-applied. Source-backed vehicles now roll their printed value without the extra size modifier; vehicles without a printed Initiative still get the size modifier, now -10 for the Colossal subtypes |
| V-P5-01 | A new frame's spendable pool is the **unused** EP of a standard design (general rule, 1), distinct from the frame's printed stock EP allocation (owner direction). Worsening a category to gain EP (SotG, Stock Ships) is not implemented (its rounding is not stated) |
| V-P5-02 | **Open:** "every additional 100,000 credits" (floor or ceil). A rules-legal design is not rules-validated while this is unresolved |
| V-P5-03 | **Open:** no published modification or construction rules for non-starship vehicles |
| V-P5-04 | **Closed:** the Crew Quality sidebar was read from the PDF |

## 4. Questions that remain for the project owner
1. Do the three KotOR statblock "Emplacement Points: N" lines (4, 3, 2) mean unused points? Which records do the Table 3-2 names Blockade runner, J-Type transports and Republic cruiser denote?
2. Resale on removal: automatic 25%, none, or a GM-entered amount (the book says "if you can find a buyer")?
3. Should the Shipyard enforce the installation job procedure (time and Mechanics check, partial/total failure) in play, or does the table adjudicate it? (The state machine exists and is tested.)
4. Firing arcs for installed weapons: drop the requirement, or keep arcs as a GM-set house rule?
5. Design time rounding ("every additional 100,000"): full increments (floor) or started increments (ceil)?
6. Non-starship vehicles: GM homebrew only, or unsupported?
7. Weapon and accessory tables: they need PDF review of the exact rows before they can be certified (including the footnote (1) size restriction wording).

Source gaps that are not decisions: the grapple formula and fighting-space values for a new ship (the grapple fit is 325/375 published vehicles; the formula text is not in the OCR); Challenge Level has no formula in the book (compare with comparable ships; the crew-quality CL modifier is known).
