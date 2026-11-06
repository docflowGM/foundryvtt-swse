# Scavenger's Guide to Droids - rolling mechanical hydration (LOCAL ONLY)

**Status: IN PROGRESS.** Printed source-first-page selected-field review has reached 46/46, but **no source record has been mechanically certified**. No GitHub writes, V13 production data edits, or sourcebook-promotion actions are authorized. The universal schema remains a draft.

## Rolling progress (generated from evidence)

| Dimension | Current SGD | Overall publication project |
|---|---:|---:|
| Publication claims indexed into local working source ledger | **46/46 (100.0%)** | **46/234 (19.7%)** |
| First-page source entries with selected fields visually cross-checked | **46/46 (100.0%)** | **46/234 (19.7%)** |
| Independently mechanically certified publication claims | **0/46 (0.0%)** | **0/234 (0.0%)** |
| Sourcebooks mechanically completed | -- | **0/14** |

The two axes must never be conflated: PDF visual **selected-field** inspection is not all-fields certification, and source-text mechanical paraphrase is not runtime permission.

## Evidence checkpoint

- **46 distinct source identities** (`SGD-DROID-001` to `SGD-DROID-046`), retaining source publication-specific identities.
- **45 droid-actor statblocks and one vehicle-format record** (DP-2, `SGD-DROID-008`). The latter remains governed by Vehicle authority, with no duplicated HP, defense, movement, geometry, or weapon attack groups.
- Printed primary statblock pages: **68, 70, ..., 158**, plus respective secondary/protocol text on adjoining pages up to 159. PDF page index is printed page +1 (1-based).
- **811 separate visual field comparisons** in `data/audits/droids/sgd-field-evidence.json` (from selected visible first-page fields). All 46 now have concrete evidence pointers.
- Reviewed feat phrases **224** and talent phrases **65** are preserved as **source phrases**, *not canonical feat grants*. Skill expressions: **202**.
- Factory-model hero eligibility is recorded provisionally as **30 allowed** / **16 prohibited**; not a blanket chargen permission.
- PDF SHA-256: `bd72d74278b812dab95a6ee9d0aef730afec4feb9c37daef59bc733842489361`.
- Ledger SHA-256: `61a940fb5f1073c7220aacc9334e8d906591be6da19f26805c53f202ca851d2b`.
- Local semantic validator: **PASS**. **Full repository canonical JSON Schema and independent runtime verifier remain NOT RUN.**
- Unresolved source-text issue count: **1 structured contradiction** and 1 nonblocking OCR/source-warning flag(s).

## Source-specific rules and model authority cautions

1. **DP-2 Probe Droid (p82):** vehicle-format statblock is primary; actor-level combat ownership/geometry must not be duplicated. Preserve crew, cargo and vehicle guns in the vehicle subsystem after source identity is resolved.
2. **MK-Series Maintenance Droid (p118):** main statblock explicitly shows *2nd-degree*, protocol view shows *3rd-degree*. Retained as structured unresolved `SGD-026-CONFLICT-DEGREE`. No silent adjudication.
3. **Droideka Mark II (p84) and Annihilator (p74):** mutually exclusive walking/wheeled modes and swift-action transformations; multiple attack rows do not certify individual installed weapon mounts.
4. **H-1ME (p106), R8 (p128), V6 (p152):** vehicle repair, shields and condition-track rules depend on exact action/DC, recharge prerequisites and vehicle authority.
5. **HK-77 (p108):** blaster surge has power-pack consumption and cooling restrictions; dual-rifle attack choice is not a free unconditional attack.
6. **HKB-3 (p110):** coordinated tracking, special sensors and simultaneous-fire damage must obey their printed target/group and aid-another conditions.
7. **KM1 (p112) / Colicoid T4 (p144):** different kinds of shield ratings and area attacks require explicit component and damage-type reconciliation.
8. **SD-9 (p136), Shadow Droid (p142), X-1 (p154), YVH (p158):** defensive/weapon interactions and energy variants cannot be represented as an undifferentiated generic attack.
9. **MEV (p116):** bed deployment changes occupied geometry conditionally; do not encode it as permanently 1x2.
10. **TT-8L (p148):** printed speed `0` is an intentional zero, not an unknown field.
11. **Model hero eligibility:** 30 allowed/16 prohibited represent the printed factory model only; legal PC construction and stock/custom routes require separate rules review.

## Remaining acceptance gates

- Review **secondary page narratives and protocol presentations** for every entry and reconcile unusual rules and printed conflicts; the 46/46 figure tracks *selected first-page fields*, not this entire step.
- Reconcile scoped feat/talent names to independently certified canonical registry identities. Parenthesized multiple scopes remain grouped source phrases until verified.
- Audit installed systems, possession distinctions, manipulation, capacity, weapon mounts and actor/vehicle delegation. Never infer mounting permissions from weapon attack strings.
- Resolve DP-2 against vehicle SSOT; no duplicate actor or independent vehicle attacks.
- Validate against upstream full JSON Schema 2020-12, including source-citation/ref semantics; then run independent mechanical certification and V13 runtime verification. Zero promotion until all gates pass.
- Keep every file local. **No GitHub writes until explicit user authorization.**

## Full publication source register

| Listing | Printed model | Printed page | CL | Hero availability (source-only) | Selected first-page checks | Mechanical cert |
|---|---|---:|---:|---|---:|---|
| SGD-DROID-001 | 8D Smelter Droid | 68 | 0 | allowed | 18 | partial |
| SGD-DROID-002 | A9G-Series Archive Droid | 70 | 0 | allowed | 18 | partial |
| SGD-DROID-003 | AD-Series Weapons Maintenance Droid | 72 | 1 | allowed | 18 | partial |
| SGD-DROID-004 | Annihilator Droid | 74 | 12 | prohibited | 18 | partial |
| SGD-DROID-005 | BLX Labor Droid | 76 | 0 | allowed | 18 | partial |
| SGD-DROID-006 | Colicoid Infiltrator-Series Droid | 78 | 4 | prohibited | 18 | partial |
| SGD-DROID-007 | CZ-Series Secretary Droid | 80 | 0 | allowed | 18 | partial |
| SGD-DROID-008 | DP-2 Probe Droid | 82 | 6 | prohibited | 8 | partial |
| SGD-DROID-009 | Droideka Mark II | 84 | 8 | prohibited | 18 | partial |
| SGD-DROID-010 | DT-16 "Destructor" Battle Droid | 86 | 2 | prohibited | 18 | partial |
| SGD-DROID-011 | Duelist Elite Training Droid | 88 | 1 | allowed | 18 | partial |
| SGD-DROID-012 | E522 Assassin Droid | 90 | 7 | prohibited | 18 | partial |
| SGD-DROID-013 | EI-9 Network Security Droid | 92 | 8 | allowed | 11 | partial |
| SGD-DROID-014 | EV-Series Supervisor Droid | 94 | 3 | allowed | 18 | partial |
| SGD-DROID-015 | FLTCH-Series Battle Droid | 96 | 5 | prohibited | 18 | partial |
| SGD-DROID-016 | G2 Repair Droid | 98 | 0 | allowed | 18 | partial |
| SGD-DROID-017 | GD16-Series Pilot Droid | 100 | 5 | allowed | 18 | partial |
| SGD-DROID-018 | GX1-Series Battle Droid | 102 | 6 | prohibited | 18 | partial |
| SGD-DROID-019 | GY-I Information Analysis Droid | 104 | 1 | allowed | 18 | partial |
| SGD-DROID-020 | H-1ME Battle Mechanic Droid | 106 | 1 | allowed | 18 | partial |
| SGD-DROID-021 | HK-77 Assassin Droid | 108 | 4 | prohibited | 18 | partial |
| SGD-DROID-022 | HKB-3 Hunter-Killer Droid | 110 | 6 | allowed | 18 | partial |
| SGD-DROID-023 | KM1 Mining Droid | 112 | 2 | prohibited | 18 | partial |
| SGD-DROID-024 | M38 Explorer Droid | 114 | 2 | allowed | 18 | partial |
| SGD-DROID-025 | MEV-Series Medical Evacuation Droid | 116 | 1 | allowed | 18 | partial |
| SGD-DROID-026 | MK-Series Maintenance Droid | 118 | 1 | allowed | 18 | partial |
| SGD-DROID-027 | Model 88-Series Administration Droid | 120 | 5 | allowed | 18 | partial |
| SGD-DROID-028 | PG-5 Gunnery Droid | 122 | 0 | allowed | 18 | partial |
| SGD-DROID-029 | PLNK-Series Power Droid | 124 | 1 | prohibited | 18 | partial |
| SGD-DROID-030 | RO-D-Series Droid | 126 | 3 | allowed | 18 | partial |
| SGD-DROID-031 | R8-Series Astromech Droid | 128 | 0 | allowed | 18 | partial |
| SGD-DROID-032 | RWW-Series Protocol Droid | 130 | 0 | allowed | 18 | partial |
| SGD-DROID-033 | RX-Series Pilot Droid | 132 | 1 | allowed | 18 | partial |
| SGD-DROID-034 | S19 Astromech Droid | 134 | 0 | allowed | 18 | partial |
| SGD-DROID-035 | SD-9-Series Battle Droid | 136 | 16 | prohibited | 18 | partial |
| SGD-DROID-036 | SD-X-Series Stealth Battle Droid | 138 | 9 | allowed | 18 | partial |
| SGD-DROID-037 | LEP-Series Service Droid | 140 | 0 | allowed | 18 | partial |
| SGD-DROID-038 | Shadow Droid | 142 | 9 | prohibited | 18 | partial |
| SGD-DROID-039 | Colicoid T4 Turret Droid | 144 | 3 | prohibited | 18 | partial |
| SGD-DROID-040 | TC-SC Infiltration Droid | 146 | 1 | allowed | 18 | partial |
| SGD-DROID-041 | TT-8L Gatekeeper Droid | 148 | 0 | prohibited | 18 | partial |
| SGD-DROID-042 | V2-Series Commando Droid | 150 | 1 | allowed | 18 | partial |
| SGD-DROID-043 | V6-Series Pilot Droid | 152 | 0 | allowed | 18 | partial |
| SGD-DROID-044 | X-1 Viper Droid | 154 | 8 | prohibited | 18 | partial |
| SGD-DROID-045 | XLT-014 Labor Droid | 156 | 0 | allowed | 18 | partial |
| SGD-DROID-046 | YVH-Series Battle Droid | 158 | 9 | allowed | 18 | partial |

## Local working files

- `data/canonical/droids/source-books/sgd.json`: source records and draft mechanics, **uncertified**.
- `data/audits/droids/sgd-field-evidence.json`: primary-page statblock text plus verified field pointer/value evidence.
- `data/audits/droids/sgd-visual-field-review.json`: 46 source reviews / counted field checks.
- `data/audits/droids/sgd-review-backlog.json`: completed first-page inspection queue and pending deeper checks per source identity.
- `data/audits/droids/droid-progress-counter.local.json`: rolling current-book/overall counters used in user updates.
- `docs/audits/droids/sgd-local-state.json`: machine-readable checkpoint.
- `docs/audits/droids/sgd-local-validation.json`: explicit local semantic validation receipts, not canonical schema approval.
- `tools/extend_sgd_visual_review.py`, `tools/extend_sgd_visual_final_batch.py`, `tools/reconcile_sgd_first_seven.py`: cumulative, page-anchored review passes.

**Never overwrite source-ledger manual changes with the original text hydration generator.** The legacy 16-page writer rejects running against newer evidence. Rerun local validation and negative tests after any modification.
