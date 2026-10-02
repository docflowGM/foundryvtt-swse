# Phase 12 — Force-talent consumer correction

Phase 12 semantic data is unchanged. This pass corrects three runtime consumers that treated the semantic `force` tag (or a loose regex) as "is a Force talent".

## Ruling

`system.tags` are semantic/mechanical metadata ("this talent's mechanic materially involves the Force"). RAW **Force talent** identity is structural: the talent belongs to a Force talent tree — not class-limited, requiring Force Sensitivity: the generic Force trees (Alter, Control, Dark Side, Light Side, Sense, Guardian Spirit) and the published Force-tradition trees. Class talents (for example Jedi class talents) are not Force talents. The two concepts overlap but are not interchangeable, and tags are never tree-identity evidence (Phase 11-2C ruling).

## Old consumer behavior (retired)

| Consumer | Old rule |
|---|---|
| `scripts/data/prerequisite-checker.js` (`checkTalents`, `forceTalentsOnly`) | `system.isForce || system.tags.includes('force')` |
| `scripts/engine/progression/prerequisites/prerequisite-evaluator.js` (`evalForceTalentCount`) | same tag test |
| `scripts/engine/talent/force-adept-talent-actions.js` (`announceMysticMastery`) | `/force|mystic|telepath|adept|jedi|sith/i` over category / tree / tags |

## Census (all 1,187 canonical talents, Phase 12 pack state)

RAW Force talents by tree authority: **173** across **31** Force talent trees; unresolved identities: **0**.

| | semantic `force` | no semantic `force` |
|---|---:|---:|
| RAW Force talent | 138 | 35 |
| not a Force talent | 151 | 863 |

| Old method | Total | False positives | False negatives |
|---|---:|---:|---:|
| semantic-tag counter (checker / evaluator) | 289 | 151 | 35 |
| Mystic Mastery regex | 383 | 240 | 30 |

The Mystic regex figures were 382 total / 239 false positives when this correction was committed; the final owner adjudication then certified Done It All with `force_point_spend`, which the retired regex matches (+1 false positive), and the committed census was regenerated. The structural count (173) and the tag counter (289 / 151 / 35) are unchanged.

Exact id lists: `data/audits/talent-phase-12-force-talent-census.json` (regenerate/check with `node tools/census-talent-force-classification.mjs [--check]`). The old counts are diagnostics only; the structural definition is the target. This is also the permanent explanation for why the Phase 12 tag cleanup changed apparent counts: the old tag counter was already wrong (it counted class and mechanic-only talents and missed Force-tree talents whose mechanics never name the Force).

## Corrected authority

`scripts/engine/progression/talents/tree-authority.js` (existing structural Force-tree authority; no new registry) now also exports `getCanonicalForceTalentTreeIds`, `isCanonicalForceTalentTree`, `classifyForceTalent`, `isForceTalent`, `countForceTalents`. The Force tree set is derived from the existing `FORCE_GENERIC_TREE_KEYS` and `FORCE_TRADITION_TREE_RULES`; membership comes from `TalentTreeDB.getTreeIdsForTalentId` (certified, multi-tree: any Force tree qualifies); identity comes from `talent-source-identity.js` (compendium record, source-linked clone, pending selection). A talent without canonical identity or certified membership is reported `resolved: false` and is **never** counted (no tag, name, category or description fallback). The tree-id set is cached by the `TalentTreeDB.trees` map identity and size, so a rebuild invalidates it.

## Consumers changed

- `prerequisite-checker.js`, `prerequisite-evaluator.js`, `force-adept-talent-actions.js` all call `countForceTalents`: one definition, one answer (Force Adept qualification and Mystic Mastery agree).
- `tools/talent-tag-probes.mjs`: the retired tag/regex guards are replaced by guards that fail if any of the three consumers stops using the classifier or reintroduces a heuristic; the probe signature is now the structural `forceTalent`, which must be identical for any tag array. (`apply-talent-phase-11-2a/2b/2c` exact-probe lists renamed accordingly.)

## Regression coverage

`tests/talent-force-talent-structural-authority.test.mjs`: tree set; generic Force trees (tags irrelevant); Force-tradition trees; Jedi class talents; Sith/class-limited talents; semantic `force` on a non-Force-tree talent; tag deletion on a real Force talent across all identity shapes; multi-tree identity; checker == evaluator == Mystic Mastery parity; probe tag-independence over all 1,187 talents; committed census.

## Phase 12 data

`packs/talents.db` and all Phase 12 authority files are untouched: no `force` tag restored or added, QA5 and the 184-tag vocabulary unchanged, Quick Study and Done It All untouched. The Phase 12-1 / 12-2 dry-run reports are historical records and still describe the Force-count probe deltas observed before this correction.
