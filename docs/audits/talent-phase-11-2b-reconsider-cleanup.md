# Phase 11-2B — certified RECONSIDER tag actions (Talents)

Status: **DRY_RUN_CERTIFIED**. **905 records** change (`system.tags` only): **2422** tag elements removed, **726** renamed (exact aliases), 39 duplicate canonical tags avoided. Raw tag strings **356 → 260**; instances 7763 → 5302; talents with an empty tag array 250 → 309.

Rules executed (27 exact normalizations, 73 removals incl. DELETE_DECOMPOSE and the three HOLD_NOISY_MAPPING role labels). Decomposition lists are guidance only and were not applied; `control` / `defense` / `leadership` were not bulk-added.

New raw strings created only by certified normalization: equipment, heavy_weapon, sniper, use_computer. BESPOKE tags touched: alias target grew — critical_success 1→2; removed by the explicit owner resolution — force_item 1→0.

## Verification

- PASS every authorized SAFE_NORMALIZE source string is gone from canonical talent tags
- PASS normalization targets hold exactly pre-members ∪ source-members (records already carrying both variants counted once)
- PASS every DELETE / DELETE_DECOMPOSE / HOLD_NOISY_MAPPING string is gone
- PASS HOLD_NOISY_MAPPING: controller / defender / leader removed and control / defense / leadership NOT bulk-added
- PASS every KEEP concept retains all pre-pass memberships (only exact alias targets may grow)
- PASS no BESPOKE tag was adjudicated: the only BESPOKE memberships that change are a certified alias target (critical_success) and the explicitly named force_item
- PASS no new semantic tag was invented: every tag that appears is a certified normalization target
- PASS no decomposition guidance was bulk-applied (no replacement concept gained a member except by exact alias normalization)
- PASS no RECONSIDER tag is left without a certified decision
- PASS 50 homebrew talents are byte-for-byte unchanged
- PASS only system.tags changed on canonical records (identity, uuids, source/page, tree, text, prerequisites, flags, abilityMeta/rules, effects untouched)
- PASS surviving tag order is deterministic (original order; renames in place; no duplicates)
- PASS 1,187 canonical talents, ids and names unchanged; emptied sets stay arrays
- PASS Phase 3E corpus/text, 3F tree identity and 3G prerequisite gates stay clean (reconciler: 0 blocking findings) — {"CLAIM_WITHOUT_RECORD":0,"RECORD_WITHOUT_CLAIM":0,"DUPLICATE_MAPPING":0,"DUPLICATE_RECORD_IN_TREE":0,"WRONG_TREE":0,"NAME_MISMATCH":0,"UNRESOLVED_SAME_NAME_AMBIGUITY":0,"CLAIM_COUNT_MISMATCH":0,"HOMEBREW_IN_DENOMINATOR":0,"TEXT_DRIFT":0,"WRONG_SOURCE_PAGE":0,"STALE_TREE_ID_SLUG":0,"TREE_DISPLAY_NAME_DRIFT":0}
- PASS Phase 3G invariant: every structured talent leaf is still a canonical uuid
- PASS executable-equivalence probes (droid gate, choice/execution resolver, item classification, combat-feature classifier, Force-talent counting, lightsaber-form lookup) identical for all 1,187 talents
- PASS second dry-run is a zero diff
- PASS serialization is surgical: only 905 lines of packs/talents.db change
- PASS manifest counts equal the projection

## Runtime consumers

Exact probes identical: **true**. Talents whose prerequisite tree credit changes: 101 (69 polluting credits removed, 45 credits that mirrored real tree membership removed, 0 added); Mystic Mastery estimate: 0. tree-credit / Mystic Mastery changes are the known tag-as-tree-identity and tag-regex readers (see Phase 3H audit): removing role/class/tree-label tags removes polluting credits. Not restored.
