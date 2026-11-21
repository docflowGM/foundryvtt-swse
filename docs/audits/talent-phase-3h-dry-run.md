# Phase 3H-4 — talent semantic-tag migration: dry-run

Status: **DRY_RUN_CERTIFIED**. **1168 records** change, exactly one leaf each (`system.tags`); 10644 tag-element mutations (2321 added, 8292 removed, 31 aliases normalized). **No pack has been written.**

## Verification

- PASS 1,187 canonical talents considered exactly once
- PASS 50 homebrew talents excluded and unchanged
- PASS 0 unknown tags outside the Phase 11 vocabulary
- PASS 0 deprecated aliases or legacy tags remain in canonical talents
- PASS 0 duplicate tags within a talent; deterministic (sorted) tag order
- PASS every proposed tag has recorded rule evidence; evidence never cites an archetype or a legacy tag (no circular authority)
- PASS identity, names, benefit, description, summary, prerequisite text, structured prerequisites (uuid), source, page, tree ids, flags, effects, abilityMeta/rules: every field outside system.tags is unchanged on every talent
- PASS only system.tags changes, and only on manifest records
- PASS the projection reads and writes only packs/talents.db: tree pack/membership, registries, classes, actors and homebrew are not inputs of it (their blob shas are recorded below for the apply-time check)
- PASS Phase 3E corpus/text, Phase 3F tree identity and Phase 3G structured-prerequisite gates stay clean (reconciler: 0 blocking findings) — {"CLAIM_WITHOUT_RECORD":0,"RECORD_WITHOUT_CLAIM":0,"DUPLICATE_MAPPING":0,"DUPLICATE_RECORD_IN_TREE":0,"WRONG_TREE":0,"NAME_MISMATCH":0,"UNRESOLVED_SAME_NAME_AMBIGUITY":0,"CLAIM_COUNT_MISMATCH":0,"HOMEBREW_IN_DENOMINATOR":0,"TEXT_DRIFT":0,"WRONG_SOURCE_PAGE":0,"STALE_TREE_ID_SLUG":0,"TREE_DISPLAY_NAME_DRIFT":0}
- PASS Phase 3G invariant: every structured talent leaf is still a canonical uuid
- PASS executable-equivalence probes (droid gate, choice/execution resolver, item classification, combat-feature classifier, Force-talent counting, lightsaber-form lookup) are identical for all 1,187 talents
- PASS second run is a zero diff
- PASS serialization is surgical: only 1168 lines of packs/talents.db change
- PASS archetype cross-check ran one-way: all 1,144 exact talent references resolve; no talent tag was edited for agreement

## Numbers

- vocabulary 57 tags (57 used by at least one talent); 430 unique legacy tags today; 250 talents untagged today; 65 have no vocabulary concept in their rule text.
- removed by disposition: {"NON_SEMANTIC_RUNTIME_METADATA":1270,"UNSUPPORTED":3035,"LEGACY_ARCHETYPE_SCORING":2374,"REMOVE_OBSOLETE":1613}; evidence confidence: {"MEDIUM":1735,"PINNED":150,"HIGH":1584}.

## Executable consumers that read `system.tags` (owner decision needed before --apply)

Probes that must be identical (droid gate, choice/execution resolver, item classification, combat-feature classifier, Force-talent counting, lightsaber-form lookup): **identical for all 1,187 talents**.

1. **Prerequisite tree credit by tag** — 449 talents change tree credit: 254 polluting credits disappear, 69 credits that mirror real multi-tree membership disappear, 5 membership credits and 222 tag-collision credits appear. prerequisite-checker.getCanonicalTalentTreeIds() turns every tag token into tree-identity evidence, so a tag spelled like a tree credits a talent to that tree for "N talents from tree X" prerequisites (tag/tree collisions such as light-side, control, dark_side, mystic). Removing legacy tags removes polluting credits; credits that mirror genuine multi-tree membership are lost unless the checker reads the tree membership authority.
2. **Mystic Mastery Force-talent estimate** — 43 talents start matching, 3 stop matching. force-adept-talent-actions.announceMysticMastery estimates Force talents with /force|mystic|telepath|adept|jedi|sith/ over category, tree and tags (a chat-card estimate; not combat).

## Archetype cross-check (one-way)

1144 exact references: 567 strong, 140 supported, 90 neutral, 327 suspicious, 20 contradictions (see docs/audits/talent-phase-3h-archetype-crosscheck.md).
