# Phase 3D-3 — Dry-Run Applicator

Tool: `tools/apply-talent-phase-3d.mjs` · Report: `data/audits/talent-phase-3d-dry-run-report.json` ·
Tests: `tests/talent-phase-3d-applicator.test.mjs` (17) · Input: `data/audits/talent-phase-3d-dispositions.json` (92 adjudicated, `REVIEW_REQUIRED` = 0).

**Dry-run only. No production pack, registry or `system.json` was written.** `--apply` is refused (exit 2); `--report` writes only the report file.
It reuses the Phase 3C machinery (state detection, tree-edit helpers, pack serialization, the registry generator) rather than adding a second migration system.

## Result: `DRY_RUN_CERTIFIED` (28 simulated invariants, all passing)

| | Before | After |
|---|---|---|
| Canonical talent pack | 1,272 | **1,187** |
| Homebrew talent pack (new, noncanonical) | — | **50** |
| Total preserved talent records | 1,272 | **1,237** |
| Canonical tree pack | 196 | **177** |
| Homebrew tree pack | — | **19** |
| Class records | 37 | 37 (unchanged) |
| Registry entries | — | 185 |

`1,272 − 19 merges − 16 removals − 50 moves = 1,187` canonical; `+ 50 = 1,237` preserved.

## What is simulated

| Operation | Count |
|---|---|
| MERGE_DUPLICATE (remove duplicate, repoint to survivor) | 19 |
| REMOVE_CONTAMINATION | 16 |
| MOVE_HOMEBREW_PACK (id + all metadata preserved) | 50 |
| KEEP_CANONICAL_ADDITIONAL_PUBLICATION (no change) | 6 |
| CORRECT_IDENTITY (Ranged Disarm: Warrior → Gunslinger, only `system.treeId` and membership change) | 1 |
| Embedded actor-item repoints (`flags.core.sourceId`) | 34 (32 Notorious, 2 Teräs Käsi) |
| Trees moving with their records to the homebrew pack (same `_id`) | 19 |
| Canonical trees losing members | 38 |
| Class-access entries removed | 0 (no class references any homebrew tree, by id, name, slug or uuid) |
| `data/*/talents.fixed.json` mirror entries dropped (no runtime/tool consumer found) | 46 (23 + 23) |

The 50 homebrew records sit in 29 trees: 19 trees are exclusively homebrew (37 records; the tree documents move with them) and 10 canonical trees lose a member
(13 records). Those 13 keep `system.treeId` pointing at their canonical tree; the homebrew pack has no tree document for them, so nothing new is invented.

## Hard prerequisite: actor repoints before removal

1. The 34 embedded actor items are repointed **first**, from a plan built from the manifest; any embedded item that references a record leaving the canonical pack without a planned repoint aborts the run.
2. After repointing, the whole of every actor, every class and **every other pack** is scanned for the leaving ids; any residual live reference aborts the run (`BLOCKED: unresolved live references…`).
3. Only then are records removed from the canonical pack. A repointed item may change nothing except `flags.core.sourceId` (verified field-for-field), and every repoint target must exist.

Repoint targets: 20 Notorious → `09744041cdcc9e22` (Crime Lord/Lord actors), 12 → `c67cbd59abd1cc53` (Hunter actors), 2 Teräs Käsi → `67bddb17ae2770f3`.

## Refusals and idempotence

A second projection over the projected state refuses cleanly as **already applied** (`POST_3D`); a partly applied state refuses (`PARTIAL_3D`); the Phase 3C certified post-state is required; an invalid manifest,
an unplanned or unlisted reference, or a tree that would be emptied with nothing moving all abort.

## Deliberately not simulated (Phase 3D-4 follow-ups, also listed in the report)

- Writing `packs/talents-homebrew.db` / `packs/talent-trees-homebrew.db` and the two `system.json` pack entries (specified in the report).
- Refreshing the stale snapshot **text** of the 34 repointed actor items (only `sourceId` is repointed here).
- Updating tests that pin removed ids, retiring the membership-audit review-extra exemption and the legacy `fix-compendium-issues.js` / `verify-compendium-fixes.js` entries.
- The Phase 3C POST_STATE gates compare pack blob SHAs and will read `UNKNOWN_STATE` once 3D is applied; a 3D post-state gate is needed.
- Adding the six KEEP records and the Ranged Disarm correction to the canonical corpus through the Phase 2 → canonical → manifest chain.
