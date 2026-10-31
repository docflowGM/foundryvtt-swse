# Universal Vehicles — P5 Discrepancy Report (construction data and rules)

Each row: original value, corrected value, printed source, affected code path, regression test. Classification: **CORRECTED** (changed to the printed value), **VERIFIED** (checked, no change), **DEFERRED_RULES_REVIEW**, **LIVE_RUNTIME_PENDING**.

## A. Stock ship frames (`data/stock-ships.json`, retired legacy file; authority is `construction/stock-frames.json`)
Field-by-field comparison of all 12 frames against Tables 3-8 (p. 52) and 3-9 (p. 53): 194 fields already matched and 7 discrepancies were corrected (201 verified afterwards); 2 formerly OCR-noisy cells were confirmed from the PDF; 0 outstanding. Tool: `tools/audits/vehicles/audit-legacy-stock-ships.mjs`; corrections: `correct-legacy-stock-ships.mjs` (recorded per frame under `provenance.corrections`).

| Frame | Field | Original | Corrected | Source | Class |
|---|---|---|---|---|---|
| Heavy Freighter | Strength | 56 | 106 | Table 3-8, p. 52 | CORRECTED |
| Corvette | Strength | 58 | 110 | Table 3-8, p. 52 | CORRECTED |
| Frigate | Strength | 60 | 114 | Table 3-8, p. 52 | CORRECTED |
| Cruiser | Strength | 94 | 118 | Table 3-8, p. 52 | CORRECTED |
| Battlecruiser | Strength | 100 | 124 | Table 3-8, p. 52 | CORRECTED |
| Light Freighter | Unused EP | 10 (YT-series allowance) | 1 (general rule) | SotG p. 39 | CORRECTED |
| Corvette | Unused EP | 5 (Corellian Engineering Corporation allowance) | 1 (general rule) | SotG p. 39 | CORRECTED (found beyond the original list) |
| Battlecruiser | Damage Reduction | 20 (OCR-noisy) | 20 | Table 3-9, p. 53 (PDF) | VERIFIED |
| Light Fighter | Crew / stock EP | 1 / 2 (OCR-noisy) | 1 / 2 | Table 3-9, p. 53 (PDF) | VERIFIED |
| All frames | cost already scaled by size | n/a | not multiplied again | Stock Ships note | VERIFIED (`previewFrame`, test "frame cost is not multiplied") |
| All frames | printed table pages | 53-54 (table of contents) | 52 and 53 | PDF review | CORRECTED (`stock-frames.json`) |

Tests: `p6-modification-rules` ("stock-ships.json now matches...", "detects a regression of any corrected value"), `p7-custom-construction`.

## B. Catalog data (`data/vehicle-modifications/*.json`)
| Item | Original | Corrected | Source | Class |
|---|---|---|---|---|
| `armor-4` size restriction | Colossal (Frigate) or Larger | Colossal (Cruiser) or Larger | Table 3-4, p. 43 (PDF) | CORRECTED |
| `armor-1`, `shields-10/40/50/60/150`, `maneuvering-jets-2` | OCR-noisy cells | EP 2, 1 (no size restriction), 2, 3, 3, 7, 2 (equal to the catalog) | Tables 3-3 p. 41, 3-4 p. 43 (PDF) | VERIFIED |
| Atmospheric thrusters (basic/advanced) | "enter atmosphere" / "+2 Pilot" | +10% / +25% max velocity and character-scale fly speed; none at starship scale | SotG Movement Systems | CORRECTED |
| Combat thrusters | "+1 Pilot checks in combat" | treated as one size smaller vs capital-ship weapons; dogfighting and starfighter maneuvers; Reflex size modifier unchanged | SotG Movement Systems | CORRECTED |
| Maneuvering jets +2/+4/+6 | "+N Pilot checks" | +N equipment bonus to Dexterity score | SotG Movement Systems | CORRECTED |
| Navicomputer / advanced | "+2 Use Computer", "unlimited routes" | +5 / +10 astrogation; no training needed | SotG Navicomputer | CORRECTED |
| SubLight Accelerator Motor | "double speed 3 rounds, shields drop to 0" | +5 Pilot to increase speed (+10 all-out) | SotG SLAM | CORRECTED |
| Regenerating shields | "regenerate 5 SR per round" | recharge action restores 10 (normal 5) | SotG Regenerating Shields | CORRECTED |
| Jamming suite / array | "+2/+5 Pilot to avoid guided weapons" | Use Computer penalties by target type | SotG Jammers | CORRECTED |
| Cargo pods, sensor arrays, droid repair team, escape pods, hangar, medical suite, luxury, slave circuits, smuggler's compartments, transponders, cloaks, others | invented numbers | printed prose | SotG Accessories | CORRECTED |
| Point-defense, docking gun, droid jammer, gravity well projector, shieldbuster torpedo, tractor beam | invented effects | printed prose | SotG Weapon Systems | CORRECTED |
| 97 rows corrected / 90 `UNVERIFIED` | | | | `apply-printed-effects.mjs`; test "catalog effect text follows the printed prose" |
| Weapon-table size restrictions vs footnote (1) "Colossal or larger starships only" | Colossal (Frigate) or Larger / none | not changed (table not PDF-reviewed) | Weapon table | DEFERRED_RULES_REVIEW (PDF) |

## C. Rules and code
| Item | Original | Corrected | Code path | Test | Class |
|---|---|---|---|---|---|
| Nonstandard modification | legacy manager did not double EP | EP x2, cost x5 | `VehicleModificationManager.calculateEmplacementPoints` (deprecated, no consumers); certified engine `vehicle-modification-rules.js` | `p6`, `p8` | CORRECTED |
| Starfighter hyperdrive | not modelled | always nonstandard | `nonstandardAssessment` | `p6`, `p8` | CORRECTED |
| Insufficient EP | denied | allowed with +2 days / +5 DC / +20% per missing point; used ship; unknown EP still fails closed | `planVehicleInstallation`, `quoteInstallation` | `p6`, `p7`, `p8` | CORRECTED |
| Unused EP | one number per record for 6 hulls | per-vehicle table with basis | `unused-emplacement-points.json` | `p6` | CORRECTED |
| Installation / removal procedure | none | state machine and removal quote; resale not automatic | `vehicle-installation-job.js`, `quoteRemoval` | `p6`, `p8` | VERIFIED (pure); service wiring LIVE_RUNTIME_PENDING |
| Colossal subtypes' size modifier in vehicle Initiative | 0 | -10 | `SWSECombatDocument._getVehicleSizeModifier` | `p8` | CORRECTED |
| Printed Initiative + size modifier | size added again | not added when a printed Initiative is the base | `SWSECombatDocument._getInitiativeFormula` | `p8` | CORRECTED (owner direction) |
| New-ship statistics | legacy defaults (hp 50, 10+armor, ...) | published formulas + Crew Quality | `previewFrame` | `p7` | CORRECTED |
| Design certification | `certifiedPublishedRules: true` possible with an unresolved rule | previewable / rules-validated / approved tiers; approval needs system-verified authority | `validateDesign`, `verifyConstructionAuthority`, `buildConstructionRecord` | `p7` | CORRECTED |
| Effect application to effective statistics | not implemented | not implemented | n/a | n/a | DEFERRED (implementation backlog) |
| Installed weapons / arcs | blocked | blocked (V-P2-04) | attack gate | `p4d`, `p5-combat-chain` | DEFERRED_RULES_REVIEW |
| Rendering, persistence, Store/approval wiring, trusted authority in a live world | n/a | n/a | n/a | n/a | LIVE_RUNTIME_PENDING |
