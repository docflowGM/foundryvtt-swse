# SGD Mechanical Certification Sprint 001–015 — M2 Checkpoint
**Date:** 2026-11-02  
**Repository:** `docflowGM/foundryvtt-swse`  
**Branch:** `audit/droid-publication-census-2026-10-29`  
**Primary mechanical hydration commit:** `da251245a694d12323aef5c166393494a4863e0f`  
**Audit sprint manifest commit:** `a3b11b85d2b80ad792e9ccd482a21d9e0b22465e`

## Work performed

A batch of the first **15** publication identities, `SGD-DROID-001` through `SGD-DROID-015`, was checked against the supplied scanned PDF at printed pages **68–97** (30 pages, including statblocks, protocols, sidebars and continuation pages). The previously checked primary numerical field evidence was retained without assuming it conferred whole-record mechanical certification.

Across **14 droid actor** claims, this pass populated **120 source-identified component instances**, structured source-published classes/levels, independently identified physical appendage locations, movement mode records, limited printed language lists and **23 possession-entry types** (with printed quantities). The **15th identity**, DP-2, remains a **vehicle-primary** claim with no independent droid-actor HP, attacks, movement, equipment or chassis implementation.

The new `systems.installed` fields describe **printed statblock installed systems**, not the existing live `system.installedSystems` world-actor ledger. Neither does a printed weapon or natural-attack row grant executable combat authority. No part was set `isActiveByDefault=true`, and no `certified-executable` attack was created.

## Sprint outcome

| Measure | SGD book | Whole project |
|---|---:|---:|
| Frozen identities | 46/46 | 234/234 |
| Selected-field PDF comparisons from prior review | 811 | 3,615 |
| Structured mechanical hydration newly reviewed in this sprint | 15/46 | 15/234 |
| Source-mechanically certified | **0/46** | **0/234** |
| Mechanically complete sourcebooks | 0/1 | 0/14 |
| Foundry V13 runtime verified | **0** | **0** |

**Certification interpretation:** 15 were **structurally advanced**, not certified. Completing a source-statblock skeleton, or verifying all selected printed numerical fields, does not prove weapon/mount ownership, canonical feat/talent identities, conditional rule action economy, or player-character construction. Runtime validation is separate, deferred until code is committed and merged, and **is not a prerequisite** to independent source-mechanical certification.

## Per-droid evidence matrix

| ID | Source identity | Component instances | Movement modes | Possession entry types | Status |
|---|---|---:|---:|---:|---|
| 001 | 8D Smelter Droid | 9 | 1 | 0 | Partial |
| 002 | A9G-Series Archive Droid | 6 | 1 | 2 | Partial |
| 003 | AD-Series Weapons Maintenance Droid | 8 | 2 | 0 | Partial |
| 004 | Annihilator Droid | 9 | 2 | 1 | Partial |
| 005 | BLX Labor Droid | 8 | 1 | 0 | Partial |
| 006 | Colicoid Infiltrator-Series Droid | 12 | 2 | 6 | Partial |
| 007 | CZ-Series Secretary Droid | 7 | 1 | 0 | Partial |
| 008 | DP-2 Probe Droid | 0 | 0 | 0 | Vehicle-first / partial |
| 009 | Droideka Mark II | 8 | 2 | 2 | Partial |
| 010 | DT-16 "Destructor" Battle Droid | 9 | 1 | 2 | Partial |
| 011 | Duelist Elite Training Droid | 6 | 1 | 1 | Partial |
| 012 | E522 Assassin Droid | 11 | 1 | 4 | Partial |
| 013 | EI-9 Network Security Droid | 13 | 1 | 1 | Partial |
| 014 | EV-Series Supervisor Droid | 6 | 1 | 0 | Partial |
| 015 | FLTCH-Series Battle Droid | 8 | 2 | 4 | Partial |

*Possession entries are printed types, not expanded individual item documents. For example, a single entry with printed quantity 2 is not two approved attack actions.*

## Key outstanding mechanical decisions

- **001 – 8D Smelter:** Printed heat-resistance and conditional Fortitude 24 preserved without stacking the +10 shell defense twice. The suggested labor-chassis PC route is separated from the printed nonheroic statblock. Canonical armor/feat/PC construction reconciliation still required.
- **002 – A9G Archive:** First-degree printed model and suggested third-degree protocol PC chassis remain distinct. The Archive Processor action-cost conflict (full-round prose versus two swift actions in protocol) is recorded as **unresolved**. No source-action permission is certified.
- **004 – Annihilator / 009 – Droideka Mark II:** Explicit exclusive wheeled/walking modes; swift-action transformation is scoped. Multiple weapon-row alternatives and energy variants require individual authoritative mount and action-choice evidence.
- **006 – Colicoid Infiltrator:** Four tool appendages are physical locations; six printed possession types have separate quantities. Climbing speed does not prove an extra locomotion component or free appendage actions.
- **008 – DP-2 Probe:** Vehicle-primary source only. Before any mechanical certificate, reconcile against canonical vehicle-source key, vehicle weapons/crew and special launch/beacon authority. **Do not create duplicate vehicle or droid actor stats.**
- **010 – DT-16 / 012 – E522 / 015 – FLTCH:** Separately recorded concealed rifles, grenade payloads, missile payloads, needler toxin and built-in versus carried weapons; do not collapse into a universal attack or grant additional actions. FLTCH's flying mode depends on its demountable jetpack.
- **013 – EI-9 / 014 – EV Supervisor:** Computer-security, communication and command effects must preserve printed target selection, action economy and scope, not standing bonuses.

**Outside this sprint:** `SGD-DROID-026` maintains its separate unresolved primary/protocol degree conflict; it was not modified or counted as part of 001–015.

## Verification actually performed

- Exact GitHub branch/head checked before the mutation.
- Exact 46-ID frozen publication census parity checked before mutation; identities and mechanical-certification states unchanged.
- All 15 primary printed pages rendered and visually inspected as three montages; second-page content searched/inspected in the supplied PDF. PDF serves as final source, OCR only as an index.
- A custom schema-property/type/enum/$ref structural walk over the **15 affected records passed with zero issues**. This is **not** an upstream Draft 2020-12 JSON Schema run.
- Independent census/backlog names and pages: **15/15**.
- No executable source attacks, preserved Constitution-null and uniquely keyed source component instances: **15/15**.
- Negative semantic fixtures: **4/4** (untrusted attack, wrong actor authority, null-as-zero and invented default activation).
- Committed GitHub ledger and audit manifest both read back with exact content matches.

**Not yet run:** repository `jsonschema` Draft 2020-12 validator, whole repository mechanical suite, full canonical feat/talent reconciliation, Foundry V13 runtime. No claims of passing these gates.

## Git and source boundaries

**Changed audit-only files:** `data/canonical/droids/source-books/sgd.json`, `data/audits/droids/sgd-mechanical-sprint-001-015.json`, and this checkpoint document.

**Unchanged:** production/registered droid compendiums; combat/equipment/vehicle/progression engines; source census and its 234 stable publication identities; `main`. No merge or live deploy.

## Next 15-record sprint

**SGD-DROID-016 through SGD-DROID-030**, printed pp.98–127. Continue the same source-first mechanical hydration and certification checks. For every previously hydrated and newly worked droid, pursue **independent, complete mechanical certification** only after canonical feats/talents, stock-equipment ownership, action predicates and source-side discrepancies have been settled. A blocked source conflict stays blocked rather than guessing to raise counts.
