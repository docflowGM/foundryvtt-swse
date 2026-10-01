# Phase 3G-3 — structured talent-prerequisite identity migration: dry-run

Status: **DRY_RUN_CERTIFIED** · **315 structured talent-to-talent leaves** on **300 records** · 945 field-level leaf mutations (each leaf: `id` removed, `uuid` and `name` added) · 181 distinct targets. **No pack has been written.**

## Verification

- PASS 315 / 315 structured talent-to-talent leaves map to exactly one canonical UUID
- PASS 0 unresolved, 0 ambiguous, 0 dangling (every row has a unique derivation)
- PASS every target exists in the canonical 1,187-talent pack
- PASS every unique-candidate target is confirmed by the owner's certified prerequisite text, or the contradiction/absence is itemised below — 302 confirmed, 8 owners have no printed text, 5 contradict it
- PASS Find an Opening resolves specifically to Scum and Villainy|Outlaw|Seize the Moment (e19c06b6dfc7a703)
- PASS the five Phase 3D repairs are in the manifest and become runtime-effective
- PASS every migrated prerequisite works against embedded source-linked items (v13 and legacy link form) — {"rows":315,"embeddedSourceLinked":315,"embeddedLegacyLinkForm":315,"pending":315,"wrongSameNameChecked":13,"wrongSameNameRejected":13,"unlinkedLegacyFallbackMet":315,"unlinkedWrongTreeRejected":13,"unlinkedWrongTreeChecked":13,"viaUuidEmbedded":315,"viaUuidPending":315,"failures":[]}
- PASS every migrated prerequisite works against pending selections (carrying the threaded identity)
- PASS identity (not name) decides: all 315 embedded and all 315 pending resolutions are authoritative uuid matches with no fallback
- PASS same-name targets are disambiguated by identity: every wrong same-name copy (linked and unlinked) is rejected
- PASS only the structured talent leaves change: prerequisites, benefit, description, summary, name, source, page, tree, tags, flags, effects are untouched
- PASS zero changes outside the owning records
- PASS the unmigrated structured conditions (skill/attribute/bab) and the group wrapper are untouched
- PASS the migrated pack contains no structured talent leaf without a canonical uuid
- PASS Phase 3E corpus + 3F tree-identity invariants stay clean (reconciler: 0 blocking incl. TEXT_DRIFT, STALE_TREE_ID_SLUG, TREE_DISPLAY_NAME_DRIFT) — {"CLAIM_WITHOUT_RECORD":0,"RECORD_WITHOUT_CLAIM":0,"DUPLICATE_MAPPING":0,"DUPLICATE_RECORD_IN_TREE":0,"WRONG_TREE":0,"NAME_MISMATCH":0,"UNRESOLVED_SAME_NAME_AMBIGUITY":0,"CLAIM_COUNT_MISMATCH":0,"HOMEBREW_IN_DENOMINATOR":0,"TEXT_DRIFT":0,"WRONG_SOURCE_PAGE":0,"STALE_TREE_ID_SLUG":0,"TREE_DISPLAY_NAME_DRIFT":0}
- PASS second run is a zero diff
- PASS serialization is surgical: only 300 lines of packs/talents.db change

## Migrated schema

`{ "type": "talent", "uuid": "Compendium.foundryvtt-swse.talents.Item.<_id>", "name": "<target name>" }`

- `uuid` is the authoritative identity (canonical v13 compendium UUID).
- `name` is kept as a label for UI/diagnostics and for the guarded legacy fallback; never authoritative.
- `id` is **removed**: it was either a `flags.swse.id` (not total, not unique) or a compendium `_id` that readers mistook for actor identity. The checker still honours `id` leaves on unmigrated/homebrew data.

## Derivation basis

- UNIQUE_FLAG_ID: 309
- EXISTING_PRODUCTION_ID (Phase 3D repair): 5
- AMBIGUOUS_FLAG_ID_RESOLVED_BY_OWNER_TREE + OWNER_RULING: 1
- targets in same-name cross-tree groups: 13; target in the owner's own tree: 298
- certified prerequisite text names the target: 302; owner has no printed text: 8; text does not name the target: 5

## Runtime effectiveness (real `PrerequisiteChecker`, all 315 leaves)

| Scenario | Satisfied |
|---|---|
| embedded copy, `flags.core.sourceId` v13 | 315 / 315 |
| embedded copy, legacy link form | 315 / 315 |
| pending selection (threaded identity) | 315 / 315 |
| authoritative uuid match, embedded / pending (no fallback) | 315 / 315 |
| wrong same-name copy rejected (linked) | 13 / 13 |
| wrong same-name copy rejected (unlinked legacy, tree guard) | 13 / 13 |
| unlinked legacy correct-tree copy met via guarded name fallback | 315 (reported as fallback) |

## Findings for the owner (not changed by 3G)

**8 owners have no printed prerequisite text but carry a structured talent prerequisite** (so the structured leaf is their only runtime gate):

- Saga Edition Core Rulebook|Dark Side|Swift Power → Saga Edition Core Rulebook|Dark Side|Power of the Dark Side
- Saga Edition Core Rulebook|Spacer|Starship Raider → Saga Edition Core Rulebook|Spacer|Spacehound
- Saga Edition Core Rulebook|Misfortune|Sow Confusion → Saga Edition Core Rulebook|Misfortune|Hesitate
- Scum and Villainy|Assassin|Ruthless → Force Unleashed Campaign Guide|Mercenary|Dirty Fighting (target in a different tree)
- Saga Edition Core Rulebook|Expert Pilot|Keep It Together → Saga Edition Core Rulebook|Fringer|Jury-Rigger (target in a different tree)
- Legacy Era Campaign Guide|Knight's Armor|Armor Mastery → Saga Edition Core Rulebook|Armor Specialist|Armored Defense (target in a different tree)
- Scum and Villainy|Outlaw|Seize the Moment → Legacy Era Campaign Guide|Provocateur|Distress to Discord (target in a different tree)
- Saga Edition Core Rulebook|Jedi Sentinel|Force Haze → Saga Edition Core Rulebook|Jedi Sentinel|Clear Mind

**5 structured leaves are not named by the owner's printed text:**

- Saga Edition Core Rulebook|Fortune|Ricochet Shot: printed "Knack, Lucky Shot" but structured also requires Saga Edition Core Rulebook|Fortune|Fool's Luck
- Saga Edition Core Rulebook|Fortune|Dumb Luck: printed "Knack, Lucky Shot" but structured also requires Saga Edition Core Rulebook|Fortune|Fool's Luck
- Saga Edition Core Rulebook|Fortune|Unlikely Shot: printed "Knack, Lucky Shot" but structured also requires Saga Edition Core Rulebook|Fortune|Fool's Luck
- Legacy Era Campaign Guide|Fugitive Commander|Stay in the Fight: printed "Stalwart Subordinates" but structured also requires Rebellion Era Campaign Guide|Rebel Recruiter|Recruit Enemy
- Saga Edition Core Rulebook|Fortune|Uncanny Luck: printed "Knack, Lucky Shot" but structured also requires Saga Edition Core Rulebook|Fortune|Fool's Luck
