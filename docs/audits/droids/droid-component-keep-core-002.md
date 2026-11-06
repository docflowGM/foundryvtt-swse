# Droid KEEP-002 — Core hardened systems, shields and Basic Processor

**Date:** 2026-11-02. Source: Core Rulebook printed pp.187, 190, 193-195 and 197 (original PDF visually inspected). Machine facts: `data/audits/droids/component-keep-source-facts-core-002.json`. Nine individual rule/variant rows; not nine newly distinct published identities.

The **critical** cost-factor cross-application discrepancy is separately documented at `docs/audits/droids/droid-component-core-cost-factor-audit.md`: seven of nine Garage factors disagree with Table 11-2, while the progression factors match for seven supported sizes. No production changes authorized.

## Core source tables

| Component | Credits | Weight | Availability / min size |
|---|---:|---:|---|
| Basic Processor | No separate Table 11-5 item | Not separately listed | Core baseline |
| Hardened Systems x2 | 1000 × cost factor | 100 × cost factor kg | Military; Large+ |
| Hardened Systems x3 | 2500 × cost factor | 250 × cost factor kg | Military; Large+ |
| Hardened Systems x4 | 4000 × cost factor | 400 × cost factor kg | Military; Large+ |
| Hardened Systems x5 | 6250 × cost factor | 650 × cost factor kg | Military; Large+ |
| Shield Generator, SR 5 | 2500 × cost factor | 10 × cost factor kg | Military; SR5 floor not explicitly listed |
| Shield Generator, SR 10 | 5000 × cost factor | 20 × cost factor kg | Military; small |
| Shield Generator, SR 15 | 7500 × cost factor | 30 × cost factor kg | Military; medium |
| Shield Generator, SR 20 | 10000 × cost factor | 40 × cost factor kg | Military; large |

## Source/implementation divergence

**Hardened Systems:** The multiplier scales the chassis size-based **extra hit points and damage-threshold bonus** (Core Table 11-2). Current RAW_OVERLAY stores fixed Large-size bonuses for all sizes: x2 has +20 HP/+10 threshold, which matches Large but not Huge (+40/+20), Gargantuan (+100/+40), or Colossal (+200/+100). Do not double-count base size bonuses. All four raw definitions say 'NOT available at chargen', but the cited source establishes Large+ and Military without a universal printed PC prohibition; custom PC size restrictions may independently apply.

**Shields:** SR5/10/15/20 are genuinely distinct printed ratings. Minimum sizes expressly given by Core p.197: SR10 Small+, SR15 Medium+, SR20 Large+. No separate SR5 minimum is stated there, so the existing Tiny min needs further proof. Damage reduces by **current SR**; if incoming damage equals/exceeds the rating, reduce it by 5. Three swift actions (same/consecutive rounds) plus a DC20 Endurance check restore 5 points to the normal cap. This is mutable state; costs and descriptions alone do not certify damage engine behavior.

**Basic Processor:** No separate printed price or weight row. The raw definition's 0-credit/5kg fields are not sourced standalone item values. Core p.187 explicitly allows the *stock-model PC* to use Basic or Heuristic where Remote is prohibited; raw 'PC droids cannot use this' wrongly merges distinct stock-model and custom-heroic chargen cases.

## Verification status

Nine source entries have printed facts reviewed; **0** complete mechanical certifications, **0** registry migrations, **0** cross-app quote tests, **0** Foundry runtime certifications. Authoring-time structural assertions checked nine unique IDs, four armor tiers, four SR ratings and printed-page mapping.

Reproduce using `node tools/audits/droids/verify_component_keep_source_facts_core_002.mjs`. CI, full Node suite, Garage, Store, PC/follower and Foundry UI tests have not been run.

Next: expand to locomotion/appendage rows with cost factor and exact physical mount capacity tests, keeping the source census distinct from production implementation.
