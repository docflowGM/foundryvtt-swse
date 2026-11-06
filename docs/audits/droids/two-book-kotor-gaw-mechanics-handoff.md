# Two-Book Droid Audit — KOTOR and Galaxy at War handoff

**Date:** 2026-11-02  
**Branch:** `audit/droid-publication-census-2026-10-29`  
**Source PDFs:** *Knights of the Old Republic Campaign Guide* and *Galaxy at War*, with indexed TXT as discovery aid.

## Completed in this pass

| Evidence | KOTOR | Galaxy at War | Total |
|---|---:|---:|---:|
| Publication source identities | 24 | 22 | **46** |
| Model-specific mechanical boundary reviews | 24 | 22 | **46** |
| New cited source-only constraints | 48 | 44 | **92** |
| Individual-droid System/Possessions inventories | 23 | 20 | **43** |
| Raw grouped System source labels | 133 | 147 | **280** |
| Distinct Possessions labels | 61 | 29 | **90** |
| Strict mechanical certificates | 0 | 0 | **0** |

All records retain existing primary publication IDs and `mechanicalStatus: partial`. A source System label such as *two claw appendages* counts as ONE **raw printed label**, not two proven physical mount slots, and its item identity is not certified. Vehicle and squad sources are deliberately not represented as individual droid factory systems.

## Mechanical boundaries preserved

**KOTOR:** HK-24/HK-50 factory models differ from Independent HK-Series GM-conditional heroic profile and named HK-47. Factory GO-TO differs from Dark Wars GO-TO; T3-Series differs from T3-M4. The Basilisk is vehicle-primary (vehicle HP70, DR5, passenger, mounted weapon/payload permissions). Krath understands but does not speak Basic; Rakatan integrated armaments are source Possessions, not yet independently certified mounts.

**Galaxy at War:** Three-member B1 squad p217 differs from Clone Wars four-member squad; p220 is not verified as another B1 squad. The GAT p216 is vehicle-primary (HP175, DR10); automated sentry factory Reflex15 p98 vs cover-adjusted 20 p175 is contextual. Sniper Droideka, encounter Droideka, Tactical Droid, Air Assault B2 and other models retain unique variants and bounded equipment. Tactical Droid source price 14,005.

## Exact continuation required

The preceding three books (SGD, Clone Wars, Threats) had **fuller statblock/feat/talent/action source-mechanical second-pass capture**. KOTOR and Galaxy at War **have NOT yet met that same full-field pass depth**. The concrete tasks left are:

1. Verify complete Feats, Talents, Skills, class progressions, attack alternatives and source page splits for every identity. Treat PDF columns as authority over indexed TXT and avoid copying neighboring statblocks.
2. Resolve physical mount and component identity from grouped System tokens, and separate carried weapons from installed devices. Keep factory, optional modifications, and named-character gear distinct.
3. Hydrate Basilisk and GAT as vehicles and GAW B1 as a squad, without actor-class assumption.
4. Audit all source contradiction/action-economy and ammunition/power/Force Point resources. Do not promote any claimed action to runtime until source rule permission is proven.
5. Run universal Draft202012 schema and source validators, then strict mechanical certificates. Foundry v13 runtime remains untested.

**No production, chargen, Store, Garage, combat resolver or component-refactor changes were made.** All work is an audit-only GitHub checkpoint.

### Updated artifact paths

- `data/canonical/droids/source-books/kotor.json`
- `data/canonical/droids/source-books/gaw.json`
- `data/audits/droids/kotor-model-mechanics-boundary-review.json`
- `data/audits/droids/gaw-model-mechanics-boundary-review.json`
- `data/audits/droids/kotor-systems-possessions-source-review.json`
- `data/audits/droids/gaw-systems-possessions-source-review.json`
