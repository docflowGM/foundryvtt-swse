# Phase 2 final report — recovering substantive unmerged work (issue #1166)

**Date:** 2026-11-21. **main before:** `28b7797b54aa532534f7fa8d497e9a94c812b76c`. **main after:** `9a4d08312ed622b02d878f02d50459fd26e1cfda`. No game rule was decided or interpreted; no remote branch was deleted. Companion files: `phase2-unmerged-recovery-gap-matrix-2026-11-21.md`, `phase2-long-tail-classification-2026-11-21.{md,json}`, `phase2-branch-cleanup-roster-proposal-2026-11-21.json`.

## 1. Merged into main (5 PRs, merge commits)

| PR | Content | Merge SHA | CI head SHA |
| --- | --- | --- | --- |
| #1173 | Class 6A/6B reports (2 files, byte-identical; JSON ledgers already in main) | `9581c0edf` | `f0582f633` |
| #1174 | 7 archetype 11-2 adjudication docs (historical; companions already in main) | `2b44498d5` | `4008ff9cf` |
| #1176 | `flatMap` fix in `weapon-damage-packet-builder.js` + 11-check smoke test + resolver helper | `498be9590` | `d22caead3` |
| #1177 | 7 audit docs from #1047/#1049/#1050/#1053 + provenance (historical snapshot, not a source-of-truth override) | `869309767` | `bee1f8ac2` |
| #1172 | 13 species audit files, byte-identical, + provenance; classification manifest gained exactly 4 `HISTORICAL_AUDIT_EVIDENCE` entries | `9a4d08312` | `79bd45dd8` |

Every PR was merged only after its current head's Rolling System Validation succeeded. #1172's first run failed (`phase-5c-canonical-production-negative`: four new `data/audits` files unclassified); root cause fixed with the repo's own generator, not by weakening a test. `packs/species.db`, `SpeciesRegistry` and all runtime code other than the 2-line builder fix are untouched.

## 2. Closed (15 PRs, branches kept)

#1106, #1092, #1086, #1085, #1083, #1082, #1081, #1080, #1069, #1068, #1067, #1066, #1065, #1064, #1061. Each has an evidence comment. 14 heads are ancestors of main (0 unique patches by `git cherry`, 0 files differ from merge base) via merges `842c33b9e`, `32503cecb`, `0a7017c9a`, `5cd778726`, `882643a9d`. #1080 is not patch-equivalent (3 unique patch-ids, head not an ancestor); its 3 files are blob-identical in main.

## 3. Mechanics

- **Implemented from established authority:** #1176 only — tag/rider flattening in the damage packet builder (technical defect reproduced on main; the branch's smoke test is the established expectation; no rule value changed). Status: `IMPLEMENTED`, `OFFLINE_TESTED`; **not** `FOUNDRY_TESTED`.
- **Deferred for rules review:** none newly discovered; nothing added to `swse-rules-decisions-pending.md`. Species audit findings (e.g. Geonosian source conflict, 17 fan-attributed profiles) are recorded as snapshot evidence only.
- **Species recovery certification:** `SOURCE_VERIFIED`-pending (2026-10-13 snapshot, not re-validated); not `DATA_RECONCILED`/`IMPLEMENTED`.

## 4. Not merged, with blockers

| Item | State | Exact blocker |
| --- | --- | --- |
| Archetype 11-2 / talent 3H remainder (#1175, draft) | Blocked, failed CI | `tests/talent-phase-3h-semantic.test.mjs` fails on current data ("pre-migration pack required"); main applied Phase 12 on 2026-10-02; 57-tag `semantic-tag-vocabulary.json` would compete with the frozen 190-tag authority; new `data/audits` files also unclassified in the Phase-5C manifest |
| Scout tranche (12B tranche-1) | Not ported | Differs on all 10 shared ids from main's `OWNER_CERTIFIED` 297/297 curation (conflicting authority) |
| Droid GAW residual | Not ported | Branch older than main's fuller `gaw.json`; its diff removes records |
| Class/Force chain #1120–#1164 | Untouched | 142 commits / 85 paths; vs Force V2 #1165 19 shared files, 9 conflicts (`force-point-transaction.js`, `reaction-engine.js`, `reaction-registry.js`, `force-engine.js`, `force-point-spend-coordinator.js`, `roll-core.js`, `actor-engine.js` + 2 tests) |
| Combat display parity (`claude/swse-combat-display-parity-lcdapp`) | Needs own tranche | `attacks.js`, `PanelContextBuilder.js`, `character-actor.js` diverged on main |
| Not yet recovered open PRs | Open | TI chain #1058/#1062/#1063 (#1063 depends on #1062), #1057, #1059 (older equipment lineage), #984; #1046 is a proposal (owner call) |

## 5. Questions requiring the project owner's decision

1. **Condition-track helpers** (`chatgpt/ae-condition-rules`, `ConditionTrackRules.js` diverged): port, retire, or define the intended interaction? (`NEEDS_SOURCE_ADJUDICATION`)
2. **Illusion OCR corrections** (`phase3/talent-production-canonicalization`): JATM p.14 and KOTOR p.52 "~" → "-10" in audit evidence JSON. Needs a printed-page check before any change. (`NEEDS_SOURCE_ADJUDICATION`)
3. Adopt the Source Authority Protocol proposal (#1046)?
4. Treat talent 3H as `SUPERSEDED` by Phase 12, with only labelled historical docs ever recovered?

## 6. Long-tail classification (94 refs)

70 `SUPERSEDED`, 11 `BLOCKED_CONFLICT`, 7 `ALREADY_FUNCTIONALLY_PRESENT`, 4 `MISSING_AND_WORTH_PORTING` (all now recovered or ported), 2 `NEEDS_SOURCE_ADJUDICATION`. The 25-branch January family: leaves spot-checked; residual "missing" files are `.bak` files, autofix artifacts, a Python helper and old dialogs/templates. Per-branch evidence in the classification JSON. Limit: classification is by file/hunk state against main, not live Foundry behavior.

## 7. Tests executed

- On main `9a4d083` after all merges: `phase-5c-canonical-production-negative` ok; `tools/weapon-damage-packet-smoke-test.mjs` 11/11; `node tools/validate-data.js` 0 errors; `system.json` valid; all recovered files present (species 13/13, archetype 11-2 docs, builder `flatMap` x2).
- Per PR: Rolling System Validation (CI) success on each merged head; byte-identity checks against source SHAs; `node --check` on changed JS.
- Before #1176: smoke test failed 9/10 on unpatched main, 11/11 with fix; 12 related damage-packet tests identical before/after. Locally `rolling-ci-support-check` failed both before and after (environment-specific; green in CI).
- Not done: any live Foundry v13 test; `tests/talent-phase-3h-semantic.test.mjs` passes nowhere (fails by design on current data).

## 8. Proposed branch cleanup roster (PROPOSAL ONLY — nothing deleted)

See `phase2-branch-cleanup-roster-proposal-2026-11-21.json`. Tiers: T1 (876 already-contained + 15 heads of closed contained PRs + 7 content-identical) ≈ 898 delete candidates; T2 (70 superseded) after owner review; T3 keep (≈ 79: blocked, open-PR branches, Force V2 pins, design-doc branches, and the 10 recovery source branches until the owner confirms provenance). Branches behind open PRs #1046, #1057–#1063, #984 and the Class/Force chain must stay until those are resolved.

## 9. Outstanding technical blockers

Class/Force vs Force V2 reconciliation (isolated acceptance branch, after #1165); TI/#1057/#1059/#984 tranche; combat display parity tranche; Foundry v13 runtime verification of #1176.
