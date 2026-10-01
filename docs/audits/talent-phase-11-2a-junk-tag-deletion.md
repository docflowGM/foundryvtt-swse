# Phase 11-2A — certified junk-tag deletion (Talents)

Status: **DRY_RUN_CERTIFIED**. Authority: `data/audits/archetype-phase-11-2/tag-pruning-pass-1.json` (owner design pass; DELETE bucket = 74 tags). **669 records** change (`system.tags` only); **1681 tag elements** removed. Raw tag strings **430 → 356**; tag instances 9444 → 7763; canonical talents with an empty tag array 248 → 250 (2 have no `tags` field, unchanged).

## Verification

- PASS exactly the 74 DELETE-bucket strings are absent from all canonical talent tags
- PASS no KEEP / RECONSIDER / BESPOKE tag lost a single occurrence
- PASS no new tag was added; surviving tags keep their original order
- PASS 50 homebrew talents are byte-for-byte unchanged
- PASS only system.tags changed on canonical records (every other field, incl. identity, text, prerequisites/uuids, source/page, treeId, flags, effects, abilityMeta/rules)
- PASS 1,187 canonical talents, identities unchanged
- PASS tree identity/membership unchanged (tree pack is not an input; treeId untouched on every talent)
- PASS records with an emptied tag set keep the normal empty-array representation
- PASS Phase 3E corpus/text, 3F tree identity and 3G prerequisite gates stay clean (reconciler: 0 blocking findings) — {"CLAIM_WITHOUT_RECORD":0,"RECORD_WITHOUT_CLAIM":0,"DUPLICATE_MAPPING":0,"DUPLICATE_RECORD_IN_TREE":0,"WRONG_TREE":0,"NAME_MISMATCH":0,"UNRESOLVED_SAME_NAME_AMBIGUITY":0,"CLAIM_COUNT_MISMATCH":0,"HOMEBREW_IN_DENOMINATOR":0,"TEXT_DRIFT":0,"WRONG_SOURCE_PAGE":0,"STALE_TREE_ID_SLUG":0,"TREE_DISPLAY_NAME_DRIFT":0}
- PASS Phase 3G invariant: every structured talent leaf is still a canonical uuid
- PASS executable-equivalence probes (droid gate, choice/execution resolver, item classification, combat-feature classifier, Force-talent counting, lightsaber-form lookup) identical for all 1,187 talents
- PASS second deletion dry-run is a zero diff
- PASS serialization is surgical: only 669 lines of packs/talents.db change
- PASS every literal mention of a deleted tag is triaged (none is an unreviewed executable dependency)
- PASS manifest counts equal the projection (records and tag elements removed)

## Runtime consumers of the deleted tags

Exact probes identical: **true**; prerequisite tree-credit changes: 0; Mystic Mastery estimate changes: 0. no executable consumer behaves differently without the deleted tags.

Pattern readers that touch a deleted family (behaviour proven unchanged by the probes):
- `scripts/items/talent-data-resolver.js` reads choice_required | immediate_choice (regex over system.tags)
- `scripts/engine/progression/droids/droid-progression-guards.js` reads tree_<id> tag tokens as droid-only tree keys

Literal mentions of a deleted tag in tag-reading scripts: 11.
- `combat_action` @ scripts/apps/customization/item-customization-workbench.js:129 — item-customization workbench (non-talent items); unaffected
- `contextual` @ scripts/apps/progression-framework/steps/galactic-profile-step.js:363 — galactic profile (non-talent); unaffected
- `contextual` @ scripts/dialogs/entity-dialog/effect-intent-engine.js:132 — effect-intent dialog heuristics over effect descriptors (non-talent tags); unaffected
- `contextual` @ scripts/dialogs/entity-dialog/effect-intent-engine.js:133 — effect-intent dialog heuristics over effect descriptors (non-talent tags); unaffected
- `contextual` @ scripts/dialogs/entity-dialog/effect-intent-engine.js:134 — effect-intent dialog heuristics over effect descriptors (non-talent tags); unaffected
- `contextual` @ scripts/dialogs/entity-dialog/effect-intent-engine.js:136 — effect-intent dialog heuristics over effect descriptors (non-talent tags); unaffected
- `contextual` @ scripts/dialogs/entity-dialog/effect-intent-engine.js:137 — effect-intent dialog heuristics over effect descriptors (non-talent tags); unaffected
- `feat_chain` @ scripts/engine/mentor/mentor-choice-line-composer.js:445 — not a tag read: matches a REASON key string in mentor text; unaffected
- `forecast_value` @ scripts/engine/suggestion/SuggestionReasonEngine.js:491 — suggestion explanation only: the "grows_in_value" forecast reason no longer fires for the tagged talents; no rules effect
- `feat-chain` @ scripts/engine/suggestion/SuggestionScorer.js:942 — SUGGESTION SCORING DEFECT: _isFeatChainContinuation() grants a chain-continuation bonus only to candidates tagged feat-chain/talent-chain (bookkeeping tags). After deletion no talent earns it. Not restored; the continuation signal should come from exact prerequisite identity (3G UUIDs) in the suggestion integration phase.
- `talent-chain` @ scripts/engine/suggestion/SuggestionScorer.js:942 — same defect as feat-chain (same function)

Surviving singleton `tree_*` and other BESPOKE tags, all RECONSIDER tags, and every KEEP tag are untouched by design.
