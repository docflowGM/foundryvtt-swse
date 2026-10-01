# Phase 3G-3 — structured talent-prerequisite identity migration: dry-run

Status: **DRY_RUN_CERTIFIED** · **311 structured talent-to-talent leaves** on **300 records** · 945 field-level leaf mutations (311 leaves migrated [5 retargeted], 4 false conditions removed, 4 text lines restored) · 183 distinct targets. **No pack has been written.**

## Verification

- PASS 311 source-valid structured talent-to-talent leaves, 311 / 311 map to exactly one canonical UUID
- PASS 0 unresolved, 0 ambiguous, 0 dangling (every row has a unique derivation)
- PASS every target exists in the canonical 1,187-talent pack
- PASS every unique-candidate target is confirmed by the owner's certified prerequisite text, or the contradiction/absence is itemised below — 311 confirmed, 0 owners have no printed text, 0 contradict it
- PASS Find an Opening resolves specifically to Scum and Villainy|Outlaw|Seize the Moment (e19c06b6dfc7a703)
- PASS the five Phase 3D repairs are in the manifest and become runtime-effective
- PASS every migrated prerequisite works against embedded source-linked items (v13 and legacy link form) — {"rows":311,"embeddedSourceLinked":311,"embeddedLegacyLinkForm":311,"pending":311,"wrongSameNameChecked":13,"wrongSameNameRejected":13,"unlinkedLegacyFallbackMet":311,"unlinkedWrongTreeRejected":13,"unlinkedWrongTreeChecked":13,"viaUuidEmbedded":311,"viaUuidPending":311,"failures":[]}
- PASS every migrated prerequisite works against pending selections (carrying the threaded identity)
- PASS identity (not name) decides: all 311 embedded and all 311 pending resolutions are authoritative uuid matches with no fallback
- PASS same-name targets are disambiguated by identity: every wrong same-name copy (linked and unlinked) is rejected
- PASS only structured prerequisite data (and the four approved prerequisite-text lines) changes: benefit, description, summary, name, source, page, tree, tags, flags, effects are untouched
- PASS no other system.prerequisites text changes (exactly the 4 approved source corrections)
- PASS Fortune quartet structured sets are exactly {Knack, Lucky Shot}; no Fool's Luck
- PASS Stay in the Fight (Legacy) structured set is exactly {Stalwart Subordinates}; Rebellion Stay in the Fight untouched
- PASS 0 structured prerequisites on Assassin|Ruthless, Expert Pilot|Keep It Together, Knight's Armor|Armor Mastery, Outlaw|Seize the Moment (container dropped, repository standard shape)
- PASS the same-name Ruthless / Armor Mastery / Seize the Moment owners that DO carry the prerequisite keep it
- PASS Swift Power / Starship Raider / Sow Confusion / Force Haze printed prerequisite text restored
- PASS benefit, description, summary, source, page, treeId unchanged on every record
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

- UNIQUE_FLAG_ID: 300
- EXISTING_PRODUCTION_ID (Phase 3D repair): 5
- AMBIGUOUS_FLAG_ID_RESOLVED_BY_OWNER_TREE + OWNER_RULING: 1
- SOURCE_RULING_RETARGET: 5
- targets in same-name cross-tree groups: 13; target in the owner's own tree: 299
- certified prerequisite text names the target: 311; owner has no printed text: 0; text does not name the target: 0

## Runtime effectiveness (real `PrerequisiteChecker`, all migrated leaves)

| Scenario | Satisfied |
|---|---|
| embedded copy, `flags.core.sourceId` v13 | 311 / 311 |
| embedded copy, legacy link form | 311 / 311 |
| pending selection (threaded identity) | 311 / 311 |
| authoritative uuid match, embedded / pending (no fallback) | 311 / 311 |
| wrong same-name copy rejected (linked) | 13 / 13 |
| wrong same-name copy rejected (unlinked legacy, tree guard) | 13 / 13 |
| unlinked legacy correct-tree copy met via guarded name fallback | 311 (reported as fallback) |

## Owner source rulings applied

**4 false structured prerequisites removed** (printed talent has no prerequisite; not migrated; container dropped):

- Scum and Villainy|Assassin|Ruthless — removed `swse.talent.dirty_fighting`. Scum and Villainy p.29: Assassin | Ruthless has no prerequisite; Dirty Fighting belongs to FUCG Mercenary | Ruthless
- Saga Edition Core Rulebook|Expert Pilot|Keep It Together — removed `swse.talent.jury_rigger`. Core p.207: Expert Pilot | Keep It Together has no prerequisite
- Legacy Era Campaign Guide|Knight's Armor|Armor Mastery — removed `swse.talent.armored_defense`. Legacy p.45: Knight's Armor | Armor Mastery has no prerequisite; Core Armor Specialist | Armor Mastery requires Armored Defense
- Scum and Villainy|Outlaw|Seize the Moment — removed `swse.talent.distress_to_discord`. Scum and Villainy p.35: Outlaw | Seize the Moment has no prerequisite; Distress to Discord belongs to Legacy Provocateur | Seize the Moment

**5 leaves retargeted to the printed prerequisite:**

- Saga Edition Core Rulebook|Fortune|Ricochet Shot: `swse.talent.fools_luck` → Saga Edition Core Rulebook|Fortune|Lucky Shot
- Saga Edition Core Rulebook|Fortune|Dumb Luck: `swse.talent.fools_luck` → Saga Edition Core Rulebook|Fortune|Lucky Shot
- Saga Edition Core Rulebook|Fortune|Unlikely Shot: `swse.talent.fools_luck` → Saga Edition Core Rulebook|Fortune|Lucky Shot
- Legacy Era Campaign Guide|Fugitive Commander|Stay in the Fight: `swse.talent.recruit_enemy` → Legacy Era Campaign Guide|Fugitive Commander|Stalwart Subordinates
- Saga Edition Core Rulebook|Fortune|Uncanny Luck: `swse.talent.fools_luck` → Saga Edition Core Rulebook|Fortune|Lucky Shot

**4 printed prerequisite lines restored** (layered correction `data/audits/talent-phase-3g-source-corrections.json`; the certified Phase 2 artifact is not edited):

- Saga Edition Core Rulebook|Dark Side|Swift Power: "" → "Power of the Dark Side" (3G-SC-01)
- Saga Edition Core Rulebook|Spacer|Starship Raider: "" → "Spacehound" (3G-SC-02)
- Saga Edition Core Rulebook|Misfortune|Sow Confusion: "" → "Hesitate" (3G-SC-03)
- Saga Edition Core Rulebook|Jedi Sentinel|Force Haze: "" → "Clear Mind" (3G-SC-04)
