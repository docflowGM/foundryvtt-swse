# Phase 3H-0 — the archetype / suggestion side of the seam

Inventory only. Nothing here is migrated by Phase 3H and no replacement runtime is created.

**Shape of the gap.** `data/class-archetypes.json` holds 141 class-bound archetypes in 31 classes (tagBias / roleBias / mechanicalBias / attributeBias, playstyle, tier, exact talent/feat names). Archetype Phase 11 holds 297 class-independent archetypes (97 parents, 200 children) with exact tree-aware references, 57 shared semantic tags (primary/supporting), class routes and a narrative taxonomy. Only 20 legacy archetype display names (8 ids) appear in Phase 11: the two are **not** a 1:1 projection of each other.

| Component | What it consumes | Classification |
|---|---|---|
| `data/class-archetypes.json` | itself | **current runtime authority**, **superseded semantic authority**; **must migrate later**. Reducible to a *compatibility projection* only after a deliberate 141→297 bridge (class routes come from Phase 11 `metadata.routes`) — not by identity today |
| `ArchetypeLoader`, `ArchetypeDefinitions` | the file (and `data/archetypes/*.json`, 6 per-archetype files) | runtime consumer; transitional compatibility layer |
| `archetype-registry.js` (733 lines) | tagBias / roleBias / mechanicalBias / attributeBias | runtime consumer of the superseded vocabulary; **must migrate later** |
| `validateClassArchetypes.js` | schema of the legacy file | runtime consumer; **safe to retire later** with the file |
| `ArchetypeAffinityEngine` | roleBias / mechanicalBias / attributeBias | runtime consumer; must migrate later |
| `mentor-archetype-paths.js`, `mentor-adapter.js`, `mentor-chat-dialog.js` | legacy archetype ids + biases | runtime consumers; must migrate later (ids need the 141→297 bridge) |
| `prestige-layer-registry.js`, `bias-tag-projection.js` | bias keys (`bias-keys-canonical.json`, `attribute-bias-mapping.json`, `class-chassis-bias.json`) | runtime consumer of superseded concepts; must migrate later |
| `SuggestionEngine` (playstyle/tier handling), `SuggestionScorer` (mechanical/role bias), `tag-signal-engine` (tagBias) | legacy bias words matched against talent tags | **runtime consumer only**; scoring policy to be centralized; after Talents speak Phase 11 these see a new vocabulary — expected, staged |
| `TalentTreeTagRegistry` + `data/talent-tree-tags.json` | tree-level tags inherited by talents in scoring | **second semantic vocabulary**; must migrate later |
| `data/metadata-assignments.json` | nothing found in scripts/tools/tests (named only in `TAG_INHERITANCE_GUIDE.md`) | superseded, transitional; **safe to retire later** (owner confirmation) |
| legacy `playstyle` / `tier` | `SuggestionEngine` and the per-class metadata files | compatibility-only per Phase 11; safe to retire later with the scoring migration |

**Expected effect of 3H on this side:** none by code. Suggestion consumers that match legacy bias words against talent tags (`striker`, `controller`, `defender`, …) will stop matching once the migrated tags land; that is the intended convergence but must be sequenced with the suggestion integration phase.
