# Phase 3H-0 — talent semantic metadata: architecture audit

Direction of authority (the rule this phase protects): `published SWSE rule → canonical talent identity/content → derived certified semantic facts → archetype / suggestion consumption`. Archetypes supply the vocabulary (Phase 11, 57 tags, promoted verbatim to `data/canonical/semantic-tag-vocabulary.json`); the books decide what each talent means. Archetype recommendations are never evidence for a talent tag (the cross-check runs afterwards and cannot write back).

## The eight questions

1. **Canonical production location of talent semantic tags:** `system.tags` of the 1,187 canonical talents in `packs/talents.db` (the only tag field on talents; ~110 scripts read `system.tags`).
2. **Is `system.tags` already the right SSOT?** Yes as a *location*; no as a *vocabulary*. Today it mixes semantic words, role/class bias, tree labels, audit markers and automation descriptors.
3. **Shapes:** always an array of strings (937 talents), an empty array (248), or absent (2). No objects or mixed shapes. `abilityMeta.tags` also exists on 6 talents (read only by `utils/item-classification.js`).
4. **Consumers expecting old tag names:** the suggestion engine (`SuggestionEngine` bias-tag matching, `tag-signal-engine`, `TalentCandidateEnricher`, `TalentTreeTagRegistry` + `data/talent-tree-tags.json`) and mentor surfaces match legacy role/bias words. They are scoring/presentation, not rules; they will consume the Phase 11 vocabulary when the suggestion integration phase retires `class-archetypes.json`.
5. **Aliases of Phase 11 tags:** 9 pure spelling variants (`dark-side`, `use-the-force`, `use-computer`, `heavy-weapons`, `heavy_weapons`, `ally-support`, `force-power`, `piloting`, `sniping`); 32 legacy tags are already exact vocabulary members.
6. **Not semantic at all:** audit markers (`phase-t27-reviewed`, `rules-text-verified`, …), bookkeeping (`feat-chain`, `talent-chain`, `uncategorized_talent`), automation/choice/action descriptors (`choice_required`, `swift_action`, `no_static_runtime_bonus`, …), `tree_<id>` / `category_<x>` aliases, redundant tree/organization labels, and class/role bias (`striker`, `controller`, `defender`, `scout`, `jedi`, …).
7. **Do tags drive executable behaviour?** Yes, in four narrow places (below). None drives combat resolution; one drives prerequisite tree counting.
8. **Normalizable without changing rules behaviour:** every tag except the executable readers below. Executable-equivalence probes (real runtime functions) prove identical behaviour for the droid-acquisition gate, the choice/execution resolver, item classification, the combat-feature classifier, Force-talent counting and the lightsaber-form lookup across all 1,187 talents. Two consumers change and need a decision.

## Executable consumers of `system.tags` (probe results in the dry-run report)

| Consumer | Reads | Dry-run result |
|---|---|---|
| `prerequisite-checker` / `prerequisite-evaluator` Force-talent count | `tags.includes('force')` | **pinned**: `force` membership held at today's set (227 talents disagree with their rule text → Phase 3I defect candidates) |
| `droid-progression-guards` acquisition gate | tag tokens (`tree_*`, `category_*`) | identical |
| `talent-data-resolver` choice/execution metadata | `choice_required` / `immediate_choice` | identical (the same talents carry `choiceMeta`/`abilityMeta` flags) |
| `utils/item-classification`, `combat-feature-classifier` | tag text | identical |
| `getCanonicalTalentTreeIds()` (tree-count prerequisites) | **every tag token as tree identity** | **changes** — owner decision |
| `force-adept-talent-actions.announceMysticMastery` | regex over category/tree/tags | **changes** (chat-card estimate) — owner decision |

**Decision needed (tree credit):** a tag spelled like a tree credits the talent to that tree. Three vocabulary tags collide with tree names (`control` → Control, `leadership` → Leadership, `dark_side` → Dark Side), so rule-evidenced tagging would create ~222 new false credits while removing ~254 polluting legacy credits and ~69 credits that mirror genuine multi-tree membership. The compatibility fix that makes the migration behaviour-correct is small: `getCanonicalTalentTreeIds` should stop reading tags and (to keep the 69) read tree membership. It is **not** applied here; see the dry-run report.

## Legacy architectures

| System | Status | Disposition |
|---|---|---|
| `data/class-archetypes.json` (tagBias/roleBias/mechanicalBias/attributeBias, playstyle, tier) | still loaded by archetype/suggestion/mentor runtime (`ArchetypeLoader`, `archetype-registry`, `prestige-layer-registry`, mentor modules) | **superseded by Phase 11, still runtime-required** → separate migration (suggestion integration phase) |
| `data/metadata-assignments.json` (per-class talent/feat playstyle + tier) | no runtime loader found; named only in `TAG_INHERITANCE_GUIDE.md` | **superseded, transitional, safe-to-remove candidate** after owner confirmation |
| `data/talent-tree-tags.json` + `TalentTreeTagRegistry` (tree-level tags inherited by talents in scoring) | runtime (suggestion) | **second semantic vocabulary, requires separate migration** |
| `bias-keys-canonical`, `attribute-bias-mapping`, `class-chassis-bias`, `skill-bias-mapping`, `primitive-bias-mapping` | runtime (archetype/prestige/attribute planner) | superseded by Phase 11 in design; requires separate migration |

No legacy system is preserved as a parallel authority by Phase 3H: the migrated talents carry only Phase 11 tags; the legacy files are untouched and listed for the integration phase.

## What Phase 3H did and did not do

Did: promoted the vocabulary; censused 1,187 talents; classified all 430 legacy tags; derived rule-evidenced tags with provenance; cross-checked one-way against 297 archetypes; built a certified dry-run. Did **not**: apply anything, change any script, rewrite executable metadata (`abilityMeta`, effects, rules), or add numeric weights or archetype-specific tags.
