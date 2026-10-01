# Phase 3F-1 — Talent-tree identity census

Read-only. Generator: `node tools/census-talent-tree-identity.mjs` · data: `data/audits/talent-phase-3f-tree-identity-census.json`. Baseline: merged `main` `dfbddb9cf`.

**71 talents** carry a name-derived slug in `system.treeId` instead of the persistent tree `_id` (11 slug families); **12 tree documents** (72 talent instances) have a display name that differs from the canonical name. Membership is correct for all 71 stale talents (true); every stale slug resolves to its own tree (true).

## Stale `system.treeId` families

| Value | Talents | Tree |
|---|---|---|
| `armor-specialist` | 1 | Armor Specialist |
| `bando-gora-captain` | 4 | Bando Gora Captain |
| `beastwarden` | 5 | Beastwarden |
| `believer-disciple` | 5 | Believer Disciple |
| `dark-side-devotee` | 6 | Dark Side Devotee |
| `iron-knight` | 5 | Iron Knight |
| `jedi-guardian` | 16 | Jedi Guardian |
| `jedi-sentinel` | 2 | Jedi Sentinel |
| `lightsaber-combat` | 11 | Lightsaber Combat |
| `lightsaber-forms` | 12 | Lightsaber Forms |
| `order-of-shasa` | 4 | Order of Shasa |

## Display-name drift (each tree once)

| Tree `_id` | Current | Canonical | Runtime id before → after | Changes runtime id? | Members |
|---|---|---|---|---|---|
| `a212850887fe41da` | 1stdegree Droid | First-Degree Droid | `1stdegree_droid` → `first_degree_droid` | **YES** | 7 |
| `ad499981ddb8450e` | 2nddegree Droid | Second-Degree Droid | `2nddegree_droid` → `second_degree_droid` | **YES** | 7 |
| `af077700c1b8433f` | 3rddegree Droid | Third-Degree Droid | `3rddegree_droid` → `third_degree_droid` | **YES** | 7 |
| `73814706c00849c6` | 4thdegree Droid | Fourth-Degree Droid | `4thdegree_droid` → `fourth_degree_droid` | **YES** | 7 |
| `c4e48efaad1f49af` | 5thdegree Droid | Fifth-Degree Droid | `5thdegree_droid` → `fifth_degree_droid` | **YES** | 7 |
| `754907ded50d4f46` | Agent Of Ossus | Agent of Ossus | `agent_of_ossus` → `agent_of_ossus` | no (case only) | 4 |
| `f8e7edab5f234e27` | Aingtii Monk | Aing-Tii Monk | `aingtii_monk` → `aing_tii_monk` | **YES** | 5 |
| `d20682671d035cef` | Bothan Spynet | Bothan SpyNet | `bothan_spynet` → `bothan_spynet` | no (case only) | 6 |
| `4da769d7c5f44232` | Disciple Of Twilight | Disciple of Twilight | `disciple_of_twilight` → `disciple_of_twilight` | no (case only) | 5 |
| `c6eee4889411411b` | Ember Of Vahl | Ember of Vahl | `ember_of_vahl` → `ember_of_vahl` | no (case only) | 5 |
| `0ffc37dac946477d` | Master Of Intrigue | Master of Intrigue | `master_of_intrigue` → `master_of_intrigue` | no (case only) | 6 |
| `899038f739294c81` | Warden Of The Sky | Warden of the Sky | `warden_of_the_sky` → `warden_of_the_sky` | no (case only) | 6 |

Runtime-id collisions after the rename: none; every other tree keeps its runtime id: true.

## Readers of a talent's `system.treeId`

36 scripts/tools read it. STRICT_SOURCE_ID readers expect the persistent tree _id; RUNTIME_ID_ONLY (talent-normalizer) accepts only a TalentTreeDB runtime id and is hardened in 3F-2; TOLERANT readers compare it as one of several normalized candidate tokens.

| File | Kind |
|---|---|
| `scripts/actors/derived/defense-calculator.js` | STRICT_SOURCE_ID |
| `scripts/apps/progression-framework/steps/talent-step.js` | TOLERANT |
| `scripts/data/prerequisite-checker.js` | TOLERANT |
| `scripts/data/talent-normalizer.js` | RUNTIME_ID_ONLY |
| `scripts/engine/crew/follower-talent-config.js` | TOLERANT |
| `scripts/engine/effects/modifiers/ModifierEngine.js` | TOLERANT |
| `scripts/engine/progression/droids/droid-progression-guards.js` | TOLERANT |
| `scripts/engine/progression/feats/feat-choice-resolver.js` | TOLERANT |
| `scripts/engine/progression/prerequisites/actor-prerequisite-snapshot.js` | TOLERANT |
| `scripts/engine/progression/talents/talent-tree-membership-authority.js` | STRICT_SOURCE_ID |
| `scripts/engine/suggestion/BuildCoherenceAnalyzer.js` | TOLERANT |
| `scripts/engine/suggestion/BuildIntent.js` | TOLERANT |
| `scripts/engine/suggestion/ClassSuggestionEngine.js` | TOLERANT |
| `scripts/engine/suggestion/OpportunityCostAnalyzer.js` | TOLERANT |
| `scripts/engine/suggestion/SuggestionEngine.js` | TOLERANT |
| `scripts/engine/suggestion/SynergyEvaluator.js` | TOLERANT |
| `scripts/engine/suggestion/equipment/scoring/armor-benefit-simulator.js` | STRICT_SOURCE_ID |
| `scripts/engine/talent/sith-talent-actions.js` | TOLERANT |
| `scripts/infrastructure/hooks/follower-hooks.js` | TOLERANT |
| `scripts/items/talent-data-resolver.js` | TOLERANT |
| `scripts/maintenance/migrate-compendium-to-v2-ids.js` | TOOLING |
| `scripts/maintenance/migrate-ndjson-to-v2-ids.js` | TOOLING |
| `scripts/maintenance/migrations/migrate-orphaned-talents.js` | TOOLING |
| `scripts/patches/follower-repeatable-entitlement-hotfix.js` | TOLERANT |
| `scripts/patches/runtime-bugfix-hotfixes.js` | TOLERANT |
| `scripts/registries/talent-registry.js` | TOLERANT |
| `tools/apply-talent-phase-3c.mjs` | TOOLING |
| `tools/audit-talent-homebrew-pack.mjs` | TOOLING |
| `tools/audit-talent-phase-3c-independent.mjs` | TOOLING |
| `tools/audit-talent-tree-membership.mjs` | TOOLING |
| `tools/build-talent-phase-3b-manifest.mjs` | TOOLING |
| `tools/build-talent-phase-3d-census.mjs` | TOOLING |
| `tools/check-talent-phase-3b-global-closeout.mjs` | TOOLING |
| `tools/check-talent-phase-3e-additions.mjs` | TOOLING |
| `tools/fix-compendium-issues.js` | TOOLING |
| `tools/verify-compendium-fixes.js` | TOOLING |

## Consumers of the affected trees

| File | Kind | Keyed on | Effect of the normalization | Action |
|---|---|---|---|---|
| `data/canonical/talents.json` | CERTIFIED_AUTHORITY | canonicalTreeKey (already the normalized name); legacy `tree` label keeps the old spelling | immutable certified artifact (3B builders byte-compare it); identity uses canonicalTreeKey | LEAVE |
| `data/feat-choice-options.json` | NAME_KEYED_ALREADY_CANONICAL | canonical spelling (First/Second/Third-Degree Droid) | already uses the normalized names; the pack names are the outliers, so the rename aligns them | IMPROVES |
| `data/fixes/class-talent-tree-bindings.json` | STATIC_DATA | slug (bothan-spynet: unchanged by a case-only rename) | unaffected | LEAVE |
| `data/fixes/talent-trees.registry.json` | DERIVED_REGISTRY | sourceId + name-derived slug id + displayName | rebuilt by tools/build-talent-tree-registry.mjs from the tree pack | REGENERATE |
| `data/fixes/talents.fixed.json` | STALE_DERIVED_MIRROR | older-schema talent rows | no runtime or tool consumer (3D record); already differs from production for every row | LEAVE |
| `data/generated/talent-trees.registry.json` | DERIVED_REGISTRY | sourceId + name-derived slug id + displayName | rebuilt by tools/build-talent-tree-registry.mjs from the tree pack | REGENERATE |
| `data/generated/talents.fixed.json` | STALE_DERIVED_MIRROR | older-schema talent rows | no runtime or tool consumer (3D record); already differs from production for every row | LEAVE |
| `data/languages.json` | UNRELATED_SAME_WORDS | language names ("Ember of Vahl" language entry) | not a tree reference | LEAVE |
| `data/nonheroic/nonheroic_templates.json` | NAME_KEYED_ALREADY_CANONICAL | canonical spelling (Bothan SpyNet) | already canonical; the rename aligns the pack | IMPROVES |
| `data/nonheroic/nonheroic_units.json` | NAME_KEYED_ALREADY_CANONICAL | canonical spellings (Bothan SpyNet, Aing-Tii Monk, Agent of Ossus) | already canonical; the rename aligns the pack | IMPROVES |
| `data/species-canonical-descriptions.json` | UNRELATED_SAME_WORDS | the Aing-Tii species name | not a tree reference | LEAVE |
| `data/species-traits-migrated.json` | UNRELATED_SAME_WORDS | the Aing-Tii species name | not a tree reference | LEAVE |
| `data/species-traits.json` | UNRELATED_SAME_WORDS | the Aing-Tii species name | not a tree reference | LEAVE |
| `data/talent-tree-descriptions.json` | NAME_KEYED_ALREADY_CANONICAL | canonical spelling (Bothan SpyNet, Master of Intrigue) | already canonical; today the pack name "Bothan Spynet" differs in case | IMPROVES |
| `data/talent-tree-tags.json` | STATIC_DATA | slug (bothan-spynet: unchanged by a case-only rename) | read by TalentTreeTagRegistry from data/metadata; slug unaffected | LEAVE |
| `data/talent_tree_access_rules.json` | STATIC_DATA | lowercase hyphen slugs of the case-only trees (agent-of-ossus, ember-of-vahl, ...) | unaffected: a case change does not change the slug | LEAVE |
| `data/talent_tree_class_map.json` | STATIC_DATA | tree display name (case-only difference: Bothan Spynet) | no script reads this file | LEAVE |
| `docs/talent-core-force-traditions-cleanup-phase-t22.json` | HISTORICAL_DOC | names in a past cleanup report | documentation | LEAVE |
| `docs/talent-hunter-pursuit-fear-cleanup-phase-t26.json` | HISTORICAL_DOC | names in a past cleanup report | documentation | LEAVE |
| `packs/classes.db` | CLASS_PACK | talentTreeSourceIds (pack _id) + runtime talentTreeIds + names | Infiltrator references Bothan SpyNet by sourceId and runtime id bothan_spynet; both unchanged | LEAVE |
| `packs/heroic.db` | ACTOR_SNAPSHOT | embedded talent snapshots (tree names as text) | independent snapshots; not modified (3E policy) | LEAVE |
| `packs/languages.db` | UNRELATED_SAME_WORDS | language names | not a tree reference | LEAVE |
| `packs/npc.db` | ACTOR_SNAPSHOT | embedded talent snapshots (tree names as text) | independent snapshots; not modified (3E policy) | LEAVE |
| `packs/species.db` | UNRELATED_SAME_WORDS | the Aing-Tii species name | not a tree reference | LEAVE |
| `scripts/apps/droid-builder-app.js` | NAME_KEYED_ALREADY_CANONICAL | canonical spelling (First/Second/Third-Degree Droid) | already canonical; the rename aligns the pack | IMPROVES |
| `scripts/apps/force-tradition/force-tradition-picker.js` | RUNTIME_CONSUMER | lowercase name compare (ember of vahl) | case-insensitive; unaffected | LEAVE |
| `scripts/apps/progression-framework/steps/talent-tree-mentor-commentary.js` | NAME_KEYED_ALREADY_CANONICAL | canonical spelling (Master of Intrigue, Bothan SpyNet) | already canonical; the rename aligns the pack | IMPROVES |
| `scripts/engine/progression/droids/droid-progression-guards.js` | RUNTIME_CONSUMER | normalized tree names in BOTH old (1stdegree) and printed (first degree) spellings + pack source ids | already tolerant of the normalized names; no change needed | LEAVE |
| `scripts/engine/progression/talents/tree-authority.js` | RUNTIME_CONSUMER | normalizeAccessKey(id|sourceId|key|name) vs FORCE_TRADITION_TREE_RULES keys | the rule key 'aing-tii-monk' does not match today's 'Aingtii Monk' (-> 'aingtii-monk'); the normalized name 'Aing-Tii Monk' matches it, so the rename repairs that lookup | IMPROVES |
| `scripts/mentor/mentor-survey/prestige-survey-profiles.js` | RUNTIME_CONSUMER | runtime id bothan_spynet | a case-only rename leaves the runtime id unchanged | LEAVE |
| `scripts/sheets/v2/character-sheet/concept-context.js` | NAME_KEYED_ALREADY_CANONICAL | canonical spelling (Aing-Tii Monk) | already canonical; today's pack name "Aingtii Monk" does not match it | IMPROVES |
| `tools/add-class-to-talents.js` | LEGACY_TOOL | canonical spelling (Bothan SpyNet) | one-off class-to-talent tool; already canonical | LEAVE |
| `tools/manual_phase8_remaining_talents_curation.py` | LEGACY_TOOL | tree _ids | one-off Python curation script; ids unchanged | LEAVE |
