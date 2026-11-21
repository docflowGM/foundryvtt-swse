# Phase 2 — long-tail classification of the 94 `NEEDS_OWNER_REVIEW` refs (issue #1166)

**Date:** 2026-11-21. **main:** `28b7797`. Method: per-file blob identity; per-file patch tests (`git apply --check` forward = change still missing in main, reverse = already present, neither = main diverged); manual review of every non-superseded candidate; cherry-pick + test for ported items. No branch is deleted.

| Category | Refs |
| --- | ---: |
| `MISSING_AND_WORTH_PORTING` | 4 |
| `ALREADY_FUNCTIONALLY_PRESENT` | 7 |
| `SUPERSEDED` | 70 |
| `NEEDS_SOURCE_ADJUDICATION` | 2 |
| `BLOCKED_CONFLICT` | 11 |
| **Total** | **94** |

## `MISSING_AND_WORTH_PORTING`

| Branch | Evidence |
| --- | --- |
| `audit/species-health-phase-0` | Its 2 files are part of the 13 recovered in PR #1172. |
| `audit/species-book-by-book-canonical` | 13 absent audit files recovered byte-identical: PR #1172. |
| `audit/class-canonicalization-phase-6a` | 2 missing reports recovered: PR #1173 (JSON ledgers already in main). |
| `claude/d4-typed-resistance-lckwoh` | Reproduced defect on main (grenade multi-tag flattening). Ported 2-line fix + smoke test: PR #1176. |

## `BLOCKED_CONFLICT`

| Branch | Evidence |
| --- | --- |
| `audit/talent-phase-3h-semantic-metadata` | Strict subset of archetype-11-2; same blocker (PR #1175). |
| `audit/archetype-phase-11-2-mechanical-ontology` | 7 docs recovered (PR #1174, historical). Remainder blocked: 3H test fails on current data; 57-tag vocabulary competes with frozen 190-tag ontology (draft PR #1175). |
| `claude/add-equipment-affinity-Czscz` | Chargen suggestion-scoring heuristics; SuggestionEngineCoordinator diverged on main; scoring weights are a design choice, not verified here. |
| `claude/holonet-message-contract-juTtb` | Bulletin CRUD forms; gm-datapad.js/holonet-init/system.json diverged on main. |
| `claude/swse-combat-display-parity-lcdapp` | Real feature (attack/defense sheet parity, Psychic Citadel/implant rows, derived materialization) but attacks.js, PanelContextBuilder.js, character-actor.js diverged on main; needs dedicated tranche + Foundry runtime check. |
| `feat/force-power-final-integration` | July Force power track; shared files diverged on main; overlaps Force V2 (#1165) authority. Reconcile only with the Class/Force/Force V2 tranche. |
| `feat/force-power-phase-5-healing-mitigation` | July Force power track; shared files diverged on main; overlaps Force V2 (#1165) authority. Reconcile only with the Class/Force/Force V2 tranche. |
| `feat/force-power-phase-6-direct-damage` | July Force power track; shared files diverged on main; overlaps Force V2 (#1165) authority. Reconcile only with the Class/Force/Force V2 tranche. |
| `feat/force-power-phase-3-critical-corrections` | July Force power track; shared files diverged on main; overlaps Force V2 (#1165) authority. Reconcile only with the Class/Force/Force V2 tranche. |
| `feat/force-power-phase-4-modifier-automation` | July Force power track; shared files diverged on main; overlaps Force V2 (#1165) authority. Reconcile only with the Class/Force/Force V2 tranche. |
| `fix/v14-system-data-model-manifest` | Targets Foundry v14 manifest/data models plus mixed Sabacc/chargen hotfixes; outside the v13 baseline; system.json and hotfix init diverged. |

## `NEEDS_SOURCE_ADJUDICATION`

| Branch | Evidence |
| --- | --- |
| `chatgpt/ae-condition-rules` | Condition-track mutation helpers; ConditionTrackRules.js diverged on main. Condition-track interactions need an owner ruling before any port. |
| `phase3/talent-production-canonicalization` | Only residual: JATM p.14 / KOTOR p.52 Illusion OCR corrections ("~"→"-10") in audit evidence JSON; needs printed-page check. Builder tooling superseded by Phase 12 finalization. |

## `ALREADY_FUNCTIONALLY_PRESENT`

`audit/feat-sourcebook-metadata-verification`, `audit/talent-sourcebook-metadata-verification`, `feat/force-power-phase-1-schema`, `feat/force-power-phase-2-reconciliation`, `feat/npc-force-and-bespoke-fallbacks`, `feat/wire-npc-bulk-damage`, `handoff/droid-v2-integration-2026-11-05`

## `SUPERSEDED` (70)

Full per-branch evidence is in `phase2-long-tail-classification-2026-11-21.json`. Two sub-groups: the 25-ref January family (stale fork histories; spot-checked leaves; nothing worth porting — notably chargen revival and `.bak`/autofix artifacts conflict with the retired-chargen policy), and single-purpose refs whose touched files `main` has since rewritten or removed.

Notable named supersessions: `audit/archetype-phase-12b-scout-semantic-curation` (conflicting authority), `audit/droid-two-books-kotor-gaw-2026-11-02` (main's record is newer and fuller), `claude/patch-swse-repo-IEh8F` (modularizes `chargen-main.js`, which main removed), `claude/mentor-goal-feature-NfkLj` (old mentor-chat dialog removed).

## Limits
Categorization is by file/hunk state against current `main`, not by live Foundry behavior. `SUPERSEDED` means main has rewritten or removed what the branch touched; a few single-commit docs branches (root-level plans/reports) were classed superseded because their subject systems were replaced, not because the text was diffed line by line.
