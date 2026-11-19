# Branch consolidation inventory (issue #1166)

**Audit date:** 2026-11-19. **Main before:** `817844123e422c192c0db02651b822c1d8bc1166`. **Main after the tranche merges #1167, #1168, #1169:** `e3ba81a0f`; a fourth tranche (mentor fixes + this audit) follows. **Remote refs audited:** 1047 (full history; the first pass on a shallow clone gave wrong ahead counts and was discarded). The Force V2 playtest commit `eb7050bbdea16afb08e1cca86f3199c1ec44e3c4` is not in `main` and was not touched.

Method: `git rev-list --left-right --count origin/main...<ref>` for ahead/behind; `git cherry` for true unique patches (a branch whose commits are all patch-equivalent to commits already in `main` is contained even if it looks ahead); for the files a branch changed since its merge base, whether `main` holds the identical blob. Open PR bases come from the GitHub PR list. The machine-readable record of every ref is `branch-consolidation-inventory-2026-11-19.json`.

## Summary

| Disposition | Refs | Meaning |
| --- | ---: | --- |
| `ALREADY_CONTAINED` | 885 | every commit already in main (0 ahead or patch-equivalent); no action; cleanup candidates |
| `INTEGRATED` | 5 | merged into main during this consolidation |
| `DOCS_CONSOLIDATE` | 7 | current checkpoints imported byte-for-byte by PR #1169; branch kept |
| `SUPERSEDED` | 3 | newer equivalent already in main, or explicitly superseded by the authority index; not ported |
| `PLAYTEST_PINNED` | 3 | Force V2 playtest / acceptance; deliberately not merged |
| `BLOCKED` | 50 | open draft PR in a stacked chain or the class/Force lineage; needs a separate lineage-aware tranche |
| `NEEDS_OWNER_REVIEW` | 94 | unique patches, no open PR, mostly stale; owner decides keep / port / retire |

## Integrated into main

| Branch | Head | Last commit | Ahead / behind | Files (identical in main) | PR | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `feature/attribute-mentor-accordion` | 6c7c3d4f1 | 2026-11-15 | 0 / 82 | 0 (n/a) |  | merged into main by the mentor tranche PR (merge commit, one comment-only conflict resolved in progression-shell.js) (merge commit, ancestry preserved); its own stale test was updated to the final design |
| `feature/attribute-touch-dragdrop` | 3b92c2912 | 2026-11-15 | 0 / 98 | 0 (n/a) |  | merged into main by PR #1168 (merge commit, ancestry preserved) |
| `fix/mentor-picker-remove-vague-reasons` | 67a05eeac | 2026-11-16 | 6 / 101 | 2 (0%) |  | merged into main by the mentor tranche PR (merge commit, one comment-only conflict resolved in progression-shell.js) (merge commit, ancestry preserved) |
| `fix/mentor-atomic-utterances` | 0d7ab22c9 | 2026-11-16 | 7 / 101 | 3 (67%) |  | merged into main by the mentor tranche PR (merge commit, one comment-only conflict resolved in progression-shell.js) (merge commit, ancestry preserved) |
| `fix/progression-mentor-portrait-fit` | db6bcad6c | 2026-11-15 | 0 / 99 | 0 (n/a) |  | merged into main by PR #1168 (merge commit, ancestry preserved) |

## Design documents consolidated

| Branch | Head | Last commit | Ahead / behind | Files (identical in main) | PR | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `audit/prestige-cross-class-tree-access-20261115` | 76962662b | 2026-11-15 | 2 / 101 | 1 (100%) |  | current checkpoints imported byte-for-byte by PR #1169 (docs/design/SURVEY_DESIGN_SOURCE_INDEX.md); branch kept |
| `design/prestige-q1-crossbook-audit-v026` | 0f56de3a4 | 2026-11-14 | 1 / 101 | 1 (100%) |  | current checkpoints imported byte-for-byte by PR #1169 (docs/design/SURVEY_DESIGN_SOURCE_INDEX.md); branch kept |
| `design/multiclass-mentor-survey-q1-q6-v011` | eb531a6b0 | 2026-11-14 | 1 / 104 | 1 (100%) |  | current checkpoints imported byte-for-byte by PR #1169 (docs/design/SURVEY_DESIGN_SOURCE_INDEX.md); branch kept |
| `design/prestige-q2-character-synthesis-v08` | 228a7dc01 | 2026-11-15 | 6 / 101 | 6 (100%) |  | current checkpoints imported byte-for-byte by PR #1169 (docs/design/SURVEY_DESIGN_SOURCE_INDEX.md); branch kept |
| `docs/mentor-survey-rolling-design-v0-9-20261113` | 1d56ae427 | 2026-11-13 | 1 / 104 | 1 (100%) |  | current checkpoints imported byte-for-byte by PR #1169 (docs/design/SURVEY_DESIGN_SOURCE_INDEX.md); branch kept |
| `docs/l1-adaptive-mentor-survey-q1-q5-20261113` | ff7f605a3 | 2026-11-13 | 1 / 104 | 37 (46%) |  | current checkpoints imported byte-for-byte by PR #1169 (docs/design/SURVEY_DESIGN_SOURCE_INDEX.md); branch kept |
| `docs/survey-answer-tag-master-20261115` | 08561be4a | 2026-11-15 | 2 / 101 | 1 (100%) |  | current checkpoints imported byte-for-byte by PR #1169 (docs/design/SURVEY_DESIGN_SOURCE_INDEX.md); branch kept |

## Superseded (not ported)

| Branch | Head | Last commit | Ahead / behind | Files (identical in main) | PR | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `claude/actor-sheet-shell-and-progression-css-fixes` | 65301babc | 2026-09-09 | 3 / 1966 | 14 (79%) |  | main already carries the rail resizer and the newer ui/shell/shell-responsive-observer.js; 11 of 14 changed files are identical in main; the rest are stale CSS hunks that need a live visual check, not a port |
| `docs/l1-adaptive-mentor-survey-design` | 17fd6820b | 2026-11-11 | 1 / 159 | 1 (0%) |  | L1 v0.10 superseded by v0.19 (mentor-survey-v2 authority index); not imported |
| `fix/progression-responsive-layout` | 181ca644c | 2026-07-10 | 12 / 2697 | 5 (0%) |  | main already carries the rail resizer and the newer ui/shell/shell-responsive-observer.js; 0 of 5 changed files are identical in main; the rest are stale CSS hunks that need a live visual check, not a port |

## Pinned for the Force V2 playtest

| Branch | Head | Last commit | Ahead / behind | Files (identical in main) | PR | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `audit/force-v2-seven-book-packages-v2-9-20261117` | 1a61f8fbb | 2026-11-18 | 11 / 40 | 33 (0%) |  | Force V2 playtest/acceptance (issue #1166 constraint); not merged for cleanup |
| `claude/keen-sagan-jvkazs` | 046f7389c | 2026-11-18 | 61 / 33 | 131 (0%) | 1165 | Force V2 playtest/acceptance (issue #1166 constraint); not merged for cleanup |
| `fix/force-v2-03b-authorization-20261118` | 694420d37 | 2026-11-18 | 42 / 40 | 47 (0%) |  | Force V2 playtest/acceptance (issue #1166 constraint); not merged for cleanup |

## Blocked: stacked PR chains and the class/Force lineage

These are nested PRs (each PR's base is the previous PR's branch). They are not independent merge units: merging them out of order double-applies ancestors. The class/Force chain #1120–#1164 is about 142 commits ahead of and 208 behind `main`, touches attack/reaction, effect, progression and Force Point authority that Force V2 (#1165) also rewrites, and so must be reconciled against #1165 after it is accepted. Equipment/modification (#1081–#1086), transaction-integrity TI-0…TI-4 (#1058–#1069), droid (#1106) and universal-vehicle (#1092) drafts are likewise stacked and need lineage review.

| Branch | Head | Last commit | Ahead / behind | Files (identical in main) | PR | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `feat/class-phase-6f10-quick-sabotage` | d4f2cb239 | 2026-11-04 | 4 / 963 | 4 (25%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6f6-gunslinger-trusty-sidearm` | 2613b3b82 | 2026-11-02 | 7 / 963 | 4 (75%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6f11-saboteur-convergence` | 829501f30 | 2026-11-05 | 21 / 956 | 13 (92%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6f5-elite-trooper-dr` | a10d7175f | 2026-11-02 | 4 / 963 | 4 (100%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6f3-force-disciple-prophet` | f9ea6b177 | 2026-11-02 | 5 / 963 | 4 (0%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6f2-privateer-piracy` | 857dc309a | 2026-11-02 | 19 / 963 | 12 (67%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6f4-saboteur-destructive` | 2ac535d51 | 2026-11-02 | 4 / 963 | 4 (50%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6h-jedi-master-sith-lord-source` | ad37d1661 | 2026-11-05 | 9 / 963 | 6 (100%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6g0-saboteur-quick-sabotage` | ca33bedc5 | 2026-11-04 | 7 / 963 | 5 (0%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6f9-shaper-lore` | 56fb9a16e | 2026-11-04 | 10 / 963 | 7 (43%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6f8-master-saboteur-reroll` | d49947ff3 | 2026-11-03 | 5 / 963 | 4 (50%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6i-force-prestige-convergence` | a4fa2f714 | 2026-11-05 | 20 / 963 | 8 (62%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `feat/class-phase-6f7-infiltrator-unarmed-stun` | 872b32f5f | 2026-11-05 | 13 / 956 | 8 (38%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `fix/class-phase-6f1-runtime-hardening` | 6c01188a7 | 2026-11-02 | 62 / 963 | 24 (92%) |  | class phase 6 lineage; belongs to the same class/Force reconciliation tranche |
| `audit/talent-phase-3c-certification-fixes` | e89f33bb2 | 2026-09-29 | 9 / 1639 | 8 (0%) | 984 | open draft PR #984 in a stacked/nested chain (base main); not an independent merge unit |
| `process/source-authority-protocol` | f44413227 | 2026-10-15 | 1 / 1215 | 1 (0%) | 1046 | open draft PR #1046 in a stacked/nested chain (base main); not an independent merge unit |
| `audit/master-questions` | 5438a9f3d | 2026-10-15 | 4 / 1215 | 2 (0%) | 1047 | open draft PR #1047 in a stacked/nested chain (base main); not an independent merge unit |
| `audit/swse-errata-primary-source-followup` | 051a8760d | 2026-10-15 | 3 / 1211 | 3 (0%) | 1049 | open draft PR #1049 in a stacked/nested chain (base main); not an independent merge unit |
| `audit/modification-q033-atomicity-design` | c46bf6c87 | 2026-10-15 | 1 / 1211 | 1 (0%) | 1050 | open draft PR #1050 in a stacked/nested chain (base main); not an independent merge unit |
| `audit/modification-d005-universal-host-source` | 202ea421f | 2026-10-15 | 1 / 1211 | 1 (0%) | 1053 | open draft PR #1053 in a stacked/nested chain (base main); not an independent merge unit |
| `audit/d-005-t2-host-published-facts` | d191d60d9 | 2026-10-19 | 15 / 1193 | 19 (0%) | 1057 | open draft PR #1057 in a stacked/nested chain (base main); not an independent merge unit |
| `audit/transaction-integrity-ti0` | 169060a38 | 2026-10-19 | 2 / 1193 | 17 (0%) | 1058 | open draft PR #1058 in a stacked/nested chain (base main); not an independent merge unit |
| `audit/ti1-resource-integrity` | abb81d919 | 2026-10-20 | 2 / 1155 | 14 (0%) | 1059 | open draft PR #1059 in a stacked/nested chain (base audit/equipment-ecosystem-e0-e1); not an independent merge unit |
| `audit/ti4-transaction-contract` | d7b9d84e0 | 2026-10-20 | 4 / 1193 | 10 (0%) | 1062 | open draft PR #1062 in a stacked/nested chain (base main); not an independent merge unit |
| `audit/ti4a-contract-guards` | 3dc3ac221 | 2026-10-20 | 8 / 1193 | 37 (0%) | 1063 | open draft PR #1063 in a stacked/nested chain (base audit/ti4-transaction-contract); not an independent merge unit |
| `audit/wp3b-gate1-identity-probe` | 0d53b37de | 2026-10-27 | 3 / 1124 | 3 (100%) | 1080 | open draft PR #1080 in a stacked/nested chain (base main); not an independent merge unit |
| `feat/class-force-6j-fallen-jedi-execution-gate` | 4b7a4c609 | 2026-11-07 | 6 / 241 | 4 (0%) | 1120 | stacked class/Force PR #1120 (base main); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `feat/class-force-6k-unified-fearless-indomitable-policy` | 96f8de47e | 2026-11-07 | 8 / 241 | 6 (0%) | 1122 | stacked class/Force PR #1122 (base feat/class-force-6j-fallen-jedi-execution-gate); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `feat/class-force-6l-prophet-vision-finalization` | 46f14a92b | 2026-11-07 | 13 / 241 | 10 (0%) | 1123 | stacked class/Force PR #1123 (base feat/class-force-6k-unified-fearless-indomitable-policy); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `feat/class-force-6m-serenity-temporal-roll` | ba1c52256 | 2026-11-07 | 23 / 241 | 18 (0%) | 1124 | stacked class/Force PR #1124 (base feat/class-force-6l-prophet-vision-finalization); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `feat/class-force-6n-sith-lord-temptation` | 4c6803c23 | 2026-11-07 | 42 / 241 | 29 (0%) | 1125 | stacked class/Force PR #1125 (base feat/class-force-6m-serenity-temporal-roll); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `feat/class-force-6o-typed-effect-ingress` | 619791da0 | 2026-11-07 | 44 / 241 | 31 (0%) | 1126 | stacked class/Force PR #1126 (base feat/class-force-6n-sith-lord-temptation); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `feat/class-force-6p-prophet-gm-vision-review` | d26da3543 | 2026-11-07 | 50 / 241 | 36 (0%) | 1127 | stacked class/Force PR #1127 (base feat/class-force-6o-typed-effect-ingress); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6o-attack-fp-receipt-finalization` | b0ab274c3 | 2026-11-07 | 44 / 241 | 32 (0%) | 1128 | stacked class/Force PR #1128 (base feat/class-force-6n-sith-lord-temptation); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `feat/class-force-6p-sheet-action-controls` | 8f97c3be0 | 2026-11-07 | 48 / 241 | 36 (0%) | 1129 | stacked class/Force PR #1129 (base fix/class-force-6o-attack-fp-receipt-finalization); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6q-indomitable-talent-consumers` | 21f433fd3 | 2026-11-07 | 52 / 241 | 40 (0%) | 1130 | stacked class/Force PR #1130 (base feat/class-force-6p-sheet-action-controls); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6r-typed-activeeffect-admission` | 9804cf60c | 2026-11-07 | 56 / 241 | 43 (0%) | 1131 | stacked class/Force PR #1131 (base fix/class-force-6q-indomitable-talent-consumers); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6s-indomitable-species-effects` | 50efce740 | 2026-11-07 | 62 / 241 | 47 (0%) | 1132 | stacked class/Force PR #1132 (base fix/class-force-6r-typed-activeeffect-admission); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6t-normal-fp-spend-authority` | afcb83c39 | 2026-11-07 | 69 / 241 | 50 (0%) | 1133 | stacked class/Force PR #1133 (base fix/class-force-6s-indomitable-species-effects); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6u-divergent-closure` | 52548a38d | 2026-11-07 | 83 / 241 | 55 (0%) | 1134 | stacked class/Force PR #1134 (base fix/class-force-6t-normal-fp-spend-authority); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6v-temptation-turn-authority` | 6e4d7576b | 2026-11-15 | 86 / 241 | 56 (0%) | 1149 | stacked class/Force PR #1149 (base fix/class-force-6u-divergent-closure); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6w-temptation-receipt-serialization` | f2bdc9168 | 2026-11-15 | 90 / 241 | 59 (0%) | 1150 | stacked class/Force PR #1150 (base fix/class-force-6v-temptation-turn-authority); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6x-darkside-talent-paid-fp` | 1be23e63b | 2026-11-17 | 95 / 241 | 63 (0%) | 1154 | stacked class/Force PR #1154 (base fix/class-force-6w-temptation-receipt-serialization); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6y-reaction-paid-spend` | c6b23feb2 | 2026-11-17 | 103 / 241 | 67 (0%) | 1156 | stacked class/Force PR #1156 (base fix/class-force-6x-darkside-talent-paid-fp); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6z-reaction-execution-admission` | 662632c64 | 2026-11-17 | 120 / 241 | 74 (0%) | 1159 | stacked class/Force PR #1159 (base fix/class-force-6y-reaction-paid-spend); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6aa-reaction-full-payment` | b543c7eb9 | 2026-11-17 | 124 / 241 | 76 (0%) | 1160 | stacked class/Force PR #1160 (base fix/class-force-6z-reaction-execution-admission); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6ab-temptation-expiry-race` | 4f867ee1c | 2026-11-17 | 130 / 241 | 78 (0%) | 1161 | stacked class/Force PR #1161 (base fix/class-force-6aa-reaction-full-payment); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6ac-temptation-target-mark-serialization` | 90bcbfbfa | 2026-11-17 | 133 / 241 | 80 (0%) | 1162 | stacked class/Force PR #1162 (base fix/class-force-6ab-temptation-expiry-race); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6ad-temptation-turn-snapshot` | d27136dc9 | 2026-11-17 | 138 / 241 | 82 (0%) | 1163 | stacked class/Force PR #1163 (base fix/class-force-6ac-temptation-target-mark-serialization); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |
| `fix/class-force-6ae-temptation-owner-choice-routing` | 454e7c47a | 2026-11-17 | 142 / 241 | 85 (0%) | 1164 | stacked class/Force PR #1164 (base fix/class-force-6ad-temptation-turn-snapshot); reconcile the whole chain as one tranche against the Force V2 authority (source-verify vs #1165) |

## Needs owner review (94 branches)

Unique patches not in `main`, no open PR. 55 of them have no commit since June 2026; most are old `claude/*` scratch branches whose changed files `main` has since rewritten. Nothing here is recommended for merge; the roster is for the owner's keep / port / retire decision. Newest first:

| Branch | Head | Last commit | Ahead / behind | Files (identical in main) | PR | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `handoff/droid-v2-integration-2026-11-05` | 0e4d102e5 | 2026-11-05 | 1 / 848 | 1 (100%) |  | unique patches not in main: 1 ahead / 848 behind, 1 files (100% identical in main), last commit 2026-11-05 |
| `audit/droid-two-books-kotor-gaw-2026-11-02` | 9d35bd2db | 2026-11-02 | 1 / 990 | 3 (67%) |  | unique patches not in main: 1 ahead / 990 behind, 3 files (67% identical in main), last commit 2026-11-02 |
| `audit/species-book-by-book-canonical` | 958738408 | 2026-10-13 | 44 / 1347 | 13 (0%) |  | unique patches not in main: 44 ahead / 1347 behind, 13 files (0% identical in main), last commit 2026-10-13 |
| `audit/species-health-phase-0` | ca6521998 | 2026-10-12 | 2 / 1347 | 2 (0%) |  | unique patches not in main: 2 ahead / 1347 behind, 2 files (0% identical in main), last commit 2026-10-12 |
| `audit/class-canonicalization-phase-6a` | 8673f5cae | 2026-10-08 | 4 / 1401 | 4 (50%) |  | unique patches not in main: 4 ahead / 1401 behind, 4 files (50% identical in main), last commit 2026-10-08 |
| `audit/archetype-phase-12b-scout-semantic-curation` | d3d5fe885 | 2026-10-04 | 2 / 1494 | 2 (0%) |  | unique patches not in main: 2 ahead / 1494 behind, 2 files (0% identical in main), last commit 2026-10-04 |
| `audit/talent-phase-3h-semantic-metadata` | d72573514 | 2026-10-01 | 3 / 1567 | 30 (0%) |  | unique patches not in main: 3 ahead / 1567 behind, 30 files (0% identical in main), last commit 2026-10-01 |
| `audit/archetype-phase-11-2-mechanical-ontology` | c81cd8b8d | 2026-10-01 | 9 / 1567 | 44 (16%) |  | unique patches not in main: 9 ahead / 1567 behind, 44 files (16% identical in main), last commit 2026-10-01 |
| `phase3/talent-production-canonicalization` | ca8c56391 | 2026-09-27 | 1 / 1758 | 6 (0%) |  | unique patches not in main: 1 ahead / 1758 behind, 6 files (0% identical in main), last commit 2026-09-27 |
| `audit/feat-sourcebook-metadata-verification` | 10f256b4e | 2026-09-26 | 18 / 1838 | 1 (100%) |  | unique patches not in main: 18 ahead / 1838 behind, 1 files (100% identical in main), last commit 2026-09-26 |
| `audit/talent-sourcebook-metadata-verification` | 10f256b4e | 2026-09-26 | 18 / 1838 | 1 (100%) |  | unique patches not in main: 18 ahead / 1838 behind, 1 files (100% identical in main), last commit 2026-09-26 |
| `claude/gm-datapad-recovery-nzh4gz` | 1473ce3ba | 2026-08-29 | 9 / 2168 | 13 (69%) |  | unique patches not in main: 9 ahead / 2168 behind, 13 files (69% identical in main), last commit 2026-08-29 |
| `claude/d4-typed-resistance-lckwoh` | 8ffe7748e | 2026-08-25 | 1 / 2177 | 7 (0%) |  | unique patches not in main: 1 ahead / 2177 behind, 7 files (0% identical in main), last commit 2026-08-25 |
| `claude/swse-phase-1-audit-3c9fo8` | 0fbbd951f | 2026-08-18 | 2 / 2191 | 14 (57%) |  | unique patches not in main: 2 ahead / 2191 behind, 14 files (57% identical in main), last commit 2026-08-18 |
| `claude/compendium-forensics-audit-exsbrb` | c965fb934 | 2026-08-11 | 2 / 2194 | 11 (91%) |  | unique patches not in main: 2 ahead / 2194 behind, 11 files (91% identical in main), last commit 2026-08-11 |
| `claude/swse-combat-display-parity-lcdapp` | c8994e1de | 2026-08-01 | 3 / 2264 | 15 (0%) |  | unique patches not in main: 3 ahead / 2264 behind, 15 files (0% identical in main), last commit 2026-08-01 |
| `claude/droid-static-audit-00hajx` | 37b6bbcbd | 2026-07-26 | 1 / 2316 | 1 (0%) |  | unique patches not in main: 1 ahead / 2316 behind, 1 files (0% identical in main), last commit 2026-07-26 |
| `fix/complete-leveldb-migration` | 70c2ec514 | 2026-07-20 | 1 / 2347 | 1 (0%) |  | unique patches not in main: 1 ahead / 2347 behind, 1 files (0% identical in main), last commit 2026-07-20 |
| `fix/v14-system-data-model-manifest` | 0a804c305 | 2026-07-20 | 18 / 2344 | 14 (0%) |  | unique patches not in main: 18 ahead / 2344 behind, 14 files (0% identical in main), last commit 2026-07-20 |
| `feat/force-power-final-integration` | 47b1d9749 | 2026-07-19 | 4 / 2403 | 4 (75%) |  | unique patches not in main: 4 ahead / 2403 behind, 4 files (75% identical in main), last commit 2026-07-19 |
| `feat/force-power-phase-1-schema` | e123d959a | 2026-07-19 | 5 / 2409 | 5 (100%) |  | unique patches not in main: 5 ahead / 2409 behind, 5 files (100% identical in main), last commit 2026-07-19 |
| `feat/force-power-resolution-schema` | 2f256efd8 | 2026-07-19 | 1 / 2410 | 1 (0%) |  | unique patches not in main: 1 ahead / 2410 behind, 1 files (0% identical in main), last commit 2026-07-19 |
| `feat/force-power-phase-5-healing-mitigation` | 4158d1ae3 | 2026-07-19 | 5 / 2405 | 5 (60%) |  | unique patches not in main: 5 ahead / 2405 behind, 5 files (60% identical in main), last commit 2026-07-19 |
| `feat/force-power-phase-6-direct-damage` | 241eb5b52 | 2026-07-19 | 4 / 2404 | 4 (50%) |  | unique patches not in main: 4 ahead / 2404 behind, 4 files (50% identical in main), last commit 2026-07-19 |
| `feat/force-power-phase-2-reconciliation` | 6229a8e46 | 2026-07-19 | 4 / 2408 | 4 (100%) |  | unique patches not in main: 4 ahead / 2408 behind, 4 files (100% identical in main), last commit 2026-07-19 |
| `feat/force-power-phase-3-critical-corrections` | 46ce0e010 | 2026-07-19 | 5 / 2407 | 5 (80%) |  | unique patches not in main: 5 ahead / 2407 behind, 5 files (80% identical in main), last commit 2026-07-19 |
| `feat/force-power-phase-4-modifier-automation` | c1fe94813 | 2026-07-19 | 4 / 2406 | 4 (75%) |  | unique patches not in main: 4 ahead / 2406 behind, 4 files (75% identical in main), last commit 2026-07-19 |
| `feat/npc-exact-item-fallback` | 63551c0eb | 2026-07-19 | 4 / 2413 | 2 (50%) |  | unique patches not in main: 4 ahead / 2413 behind, 2 files (50% identical in main), last commit 2026-07-19 |
| `feat/npc-force-and-bespoke-fallbacks` | cad461eab | 2026-07-19 | 4 / 2412 | 2 (100%) |  | unique patches not in main: 4 ahead / 2412 behind, 2 files (100% identical in main), last commit 2026-07-19 |
| `fix/startup-bootstrap-regressions` | 5306e59e8 | 2026-07-19 | 4 / 2402 | 4 (50%) |  | unique patches not in main: 4 ahead / 2402 behind, 4 files (50% identical in main), last commit 2026-07-19 |
| `feat/npc-world-damage-hydration` | a870d9b3c | 2026-07-18 | 4 / 2414 | 2 (0%) |  | unique patches not in main: 4 ahead / 2414 behind, 2 files (0% identical in main), last commit 2026-07-18 |
| `feat/wire-npc-bulk-damage` | b93db45ee | 2026-07-18 | 3 / 2415 | 2 (100%) |  | unique patches not in main: 3 ahead / 2415 behind, 2 files (100% identical in main), last commit 2026-07-18 |
| `fix/defer-derived-until-class-registry-ready` | fe348bc3f | 2026-07-18 | 2 / 2418 | 2 (50%) |  | unique patches not in main: 2 ahead / 2418 behind, 2 files (50% identical in main), last commit 2026-07-18 |
| `fix/register-recent-styles` | 7ec1ac768 | 2026-07-18 | 3 / 2416 | 1 (0%) |  | unique patches not in main: 3 ahead / 2416 behind, 1 files (0% identical in main), last commit 2026-07-18 |
| `fix/restore-system-manifest-packs` | 741560bc6 | 2026-07-18 | 7 / 2419 | 5 (60%) |  | unique patches not in main: 7 ahead / 2419 behind, 5 files (60% identical in main), last commit 2026-07-18 |
| `chatgpt/ae-condition-rules` | 6e1d37fce | 2026-07-11 | 1 / 2655 | 1 (0%) |  | unique patches not in main: 1 ahead / 2655 behind, 1 files (0% identical in main), last commit 2026-07-11 |
| `audit/progression-runtime-integrity` | e1829406b | 2026-07-10 | 3 / 2697 | 3 (0%) |  | unique patches not in main: 3 ahead / 2697 behind, 3 files (0% identical in main), last commit 2026-07-10 |
| `feat/app-responsive-contracts-phase2` | 517598137 | 2026-07-10 | 61 / 2690 | 21 (86%) |  | unique patches not in main: 61 ahead / 2690 behind, 21 files (86% identical in main), last commit 2026-07-10 |
| `feat/shell-responsive-contract` | 224d93081 | 2026-07-10 | 7 / 2697 | 4 (50%) |  | unique patches not in main: 7 ahead / 2697 behind, 4 files (50% identical in main), last commit 2026-07-10 |
| `claude/actor-sheet-retirement` | 7411fbc48 | 2026-06-29 | 1 / 3273 | 2 (50%) |  | unique patches not in main: 1 ahead / 3273 behind, 2 files (50% identical in main), last commit 2026-06-29 |
| `claude/foundry-v13-load-species-rules-iWHOl` | 4e553e4d8 | 2026-05-23 | 6 / 3623 | 3 (33%) |  | unique patches not in main: 6 ahead / 3623 behind, 3 files (33% identical in main), last commit 2026-05-23 |
| `claude/audit-swse-dead-code-6hib5` | 5356c6bc0 | 2026-05-05 | 7 / 3890 | 161 (84%) |  | unique patches not in main: 7 ahead / 3890 behind, 161 files (84% identical in main), last commit 2026-05-05 |
| `claude/holonet-message-contract-juTtb` | 5caf8c0ed | 2026-04-28 | 4 / 3903 | 6 (0%) |  | unique patches not in main: 4 ahead / 3903 behind, 6 files (0% identical in main), last commit 2026-04-28 |
| `claude/patch-swse-repo-IEh8F` | 2032922f2 | 2026-04-20 | 1 / 4023 | 7 (0%) |  | unique patches not in main: 1 ahead / 4023 behind, 7 files (0% identical in main), last commit 2026-04-20 |
| `claude/droid-sheet-phase-1-uJI3L` | 0ccdd07bc | 2026-04-18 | 2 / 4105 | 7 (29%) |  | unique patches not in main: 2 ahead / 4105 behind, 7 files (29% identical in main), last commit 2026-04-18 |
| `claude/add-equipment-affinity-Czscz` | 0794b42a6 | 2026-03-12 | 2 / 4902 | 2 (0%) |  | unique patches not in main: 2 ahead / 4902 behind, 2 files (0% identical in main), last commit 2026-03-12 |
| `claude/fix-mentor-engine-404-n5FDO` | 91ba383cb | 2026-03-01 | 1 / 5344 | 562 (0%) |  | unique patches not in main: 1 ahead / 5344 behind, 562 files (0% identical in main), last commit 2026-03-01 |
| `claude/species-registry-enumeration-ags8n` | 72f7aea2a | 2026-02-26 | 1 / 5472 | 15 (0%) |  | unique patches not in main: 1 ahead / 5472 behind, 15 files (0% identical in main), last commit 2026-02-26 |
| `claude/rebuild-architecture-D9A99` | 4ecd19abf | 2026-02-25 | 4 / 5489 | 8 (0%) |  | unique patches not in main: 4 ahead / 5489 behind, 8 files (0% identical in main), last commit 2026-02-25 |
| `claude/enforce-progression-mutations-BJ3ee` | 5da1a739c | 2026-02-24 | 1 / 5607 | 3 (0%) |  | unique patches not in main: 1 ahead / 5607 behind, 3 files (0% identical in main), last commit 2026-02-24 |
| `claude/fix-welcomedialog-null-error-DjNQ9` | 30e6b0002 | 2026-02-18 | 1 / 5865 | 1 (0%) |  | unique patches not in main: 1 ahead / 5865 behind, 1 files (0% identical in main), last commit 2026-02-18 |
| `claude/audit-swse-mechanics-H4EDN` | a34097b0d | 2026-02-14 | 1 / 6006 | 1 (0%) |  | unique patches not in main: 1 ahead / 6006 behind, 1 files (0% identical in main), last commit 2026-02-14 |
| `claude/disable-phase-3-enforcement-uVZVc` | 26376e30a | 2026-02-13 | 2 / 6086 | 2 (0%) |  | unique patches not in main: 2 ahead / 6086 behind, 2 files (0% identical in main), last commit 2026-02-13 |
| `claude/fix-sheet-getter-shadowing-QAyWV` | 1c3eca8fa | 2026-02-13 | 1 / 6083 | 1 (0%) |  | unique patches not in main: 1 ahead / 6083 behind, 1 files (0% identical in main), last commit 2026-02-13 |
| `claude/swsev2-base-actor-class-pWteK` | 1371e6596 | 2026-02-13 | 1 / 6081 | 1 (0%) |  | unique patches not in main: 1 ahead / 6081 behind, 1 files (0% identical in main), last commit 2026-02-13 |
| `claude/fix-swse-actor-script-STBw2` | f7b733c56 | 2026-02-10 | 1 / 6209 | 1 (0%) |  | unique patches not in main: 1 ahead / 6209 behind, 1 files (0% identical in main), last commit 2026-02-10 |
| `claude/solve-error-minimal-5WLBc` | 81dcfcacd | 2026-02-08 | 1 / 6384 | 1 (0%) |  | unique patches not in main: 1 ahead / 6384 behind, 1 files (0% identical in main), last commit 2026-02-08 |
| `claude/fix-foundry-config-EKnOG` | 086436908 | 2026-02-05 | 1 / 6398 | 1 (0%) |  | unique patches not in main: 1 ahead / 6398 behind, 1 files (0% identical in main), last commit 2026-02-05 |
| `claude/fix-swse-icon-key-9HqI2` | 1ec85ab4c | 2026-02-04 | 1 / 6403 | 1 (0%) |  | unique patches not in main: 1 ahead / 6403 behind, 1 files (0% identical in main), last commit 2026-02-04 |
| `claude/update-mentor-dialogue-59t3o` | c21c9cf7a | 2026-02-01 | 1 / 6542 | 1 (0%) |  | unique patches not in main: 1 ahead / 6542 behind, 1 files (0% identical in main), last commit 2026-02-01 |
| `claude/mentor-goal-feature-NfkLj` | 470370c40 | 2026-01-31 | 1 / 6563 | 3 (0%) |  | unique patches not in main: 1 ahead / 6563 behind, 3 files (0% identical in main), last commit 2026-01-31 |
| `claude/debug-chargen-getdata-UXgfr` | 6d5991357 | 2026-01-28 | 147 / 6614 | 317 (24%) |  | unique patches not in main: 147 ahead / 6614 behind, 317 files (24% identical in main), last commit 2026-01-28 |
| `claude/fix-chargen-syntax-error-Dw54o` | 037796a87 | 2026-01-28 | 102 / 6614 | 293 (26%) |  | unique patches not in main: 102 ahead / 6614 behind, 293 files (26% identical in main), last commit 2026-01-28 |
| `claude/fix-chargen-species-selection-r1oQI` | 176bd8619 | 2026-01-28 | 138 / 6614 | 316 (24%) |  | unique patches not in main: 138 ahead / 6614 behind, 316 files (24% identical in main), last commit 2026-01-28 |
| `claude/fix-compendium-item-validation-G1SEu` | fa7024c82 | 2026-01-28 | 123 / 6614 | 306 (25%) |  | unique patches not in main: 123 ahead / 6614 behind, 306 files (25% identical in main), last commit 2026-01-28 |
| `claude/fix-foundry-error-OTgnY` | 8766a0761 | 2026-01-28 | 104 / 6614 | 293 (26%) |  | unique patches not in main: 104 ahead / 6614 behind, 293 files (26% identical in main), last commit 2026-01-28 |
| `claude/fix-runtime-errors-2vUVn` | 7bd8090f4 | 2026-01-28 | 99 / 6614 | 292 (26%) |  | unique patches not in main: 99 ahead / 6614 behind, 292 files (26% identical in main), last commit 2026-01-28 |
| `claude/fix-species-selection-xC5eC` | 8811abf7d | 2026-01-28 | 149 / 6614 | 317 (24%) |  | unique patches not in main: 149 ahead / 6614 behind, 317 files (24% identical in main), last commit 2026-01-28 |
| `claude/fix-swse-sheet-error-WI6tc` | 3e75f9c0e | 2026-01-28 | 139 / 6614 | 315 (24%) |  | unique patches not in main: 139 ahead / 6614 behind, 315 files (24% identical in main), last commit 2026-01-28 |
| `claude/fix-talent-pack-loading-KwTGD` | d4a067f2b | 2026-01-28 | 108 / 6614 | 298 (26%) |  | unique patches not in main: 108 ahead / 6614 behind, 298 files (26% identical in main), last commit 2026-01-28 |
| `claude/fix-v1-app-deprecation-GHQgu` | 36afc4fcd | 2026-01-28 | 131 / 6614 | 309 (25%) |  | unique patches not in main: 131 ahead / 6614 behind, 309 files (25% identical in main), last commit 2026-01-28 |
| `claude/fix-vehicle-sheet-errors-tjyhk` | e3baa6886 | 2026-01-28 | 132 / 6614 | 314 (25%) |  | unique patches not in main: 132 ahead / 6614 behind, 314 files (25% identical in main), last commit 2026-01-28 |
| `claude/investigate-foundry-tokens-LCznz` | 1c8b5ea14 | 2026-01-28 | 128 / 6614 | 308 (25%) |  | unique patches not in main: 128 ahead / 6614 behind, 308 files (25% identical in main), last commit 2026-01-28 |
| `claude/investigate-header-design-pSGkX` | 10aaa92e0 | 2026-01-28 | 134 / 6614 | 314 (25%) |  | unique patches not in main: 134 ahead / 6614 behind, 314 files (25% identical in main), last commit 2026-01-28 |
| `claude/fix-bugs-from-log-nVs7m` | f427b41ce | 2026-01-26 | 86 / 6614 | 105 (17%) |  | unique patches not in main: 86 ahead / 6614 behind, 105 files (17% identical in main), last commit 2026-01-26 |
| `claude/disable-hbs-loading-hljTO` | f53f88b91 | 2026-01-25 | 46 / 6614 | 59 (12%) |  | unique patches not in main: 46 ahead / 6614 behind, 59 files (12% identical in main), last commit 2026-01-25 |
| `claude/fix-character-sheet-window-FA6Wo` | a4452087d | 2026-01-25 | 53 / 6614 | 62 (11%) |  | unique patches not in main: 53 ahead / 6614 behind, 62 files (11% identical in main), last commit 2026-01-25 |
| `claude/fix-droid-sheet-error-AfrSG` | 3fcdd1992 | 2026-01-25 | 24 / 6614 | 41 (15%) |  | unique patches not in main: 24 ahead / 6614 behind, 41 files (15% identical in main), last commit 2026-01-25 |
| `claude/fix-droid-diagnostic-partial-qjs59` | 5ce111b13 | 2026-01-25 | 28 / 6614 | 44 (14%) |  | unique patches not in main: 28 ahead / 6614 behind, 44 files (14% identical in main), last commit 2026-01-25 |
| `claude/fix-droid-diagnostic-partial-pzLbh` | b83ab2508 | 2026-01-25 | 34 / 6614 | 45 (13%) |  | unique patches not in main: 34 ahead / 6614 behind, 45 files (13% identical in main), last commit 2026-01-25 |
| `claude/fix-droid-template-wb92Q` | 9d8082bfd | 2026-01-25 | 22 / 6614 | 41 (15%) |  | unique patches not in main: 22 ahead / 6614 behind, 41 files (15% identical in main), last commit 2026-01-25 |
| `claude/fix-log-bugs-FbUlA` | 13e9368c9 | 2026-01-25 | 55 / 6614 | 65 (11%) |  | unique patches not in main: 55 ahead / 6614 behind, 65 files (11% identical in main), last commit 2026-01-25 |
| `claude/fix-token-usage-sjGwm` | 5687026a9 | 2026-01-25 | 19 / 6614 | 39 (15%) |  | unique patches not in main: 19 ahead / 6614 behind, 39 files (15% identical in main), last commit 2026-01-25 |
| `claude/fix-tree-talent-contract-loUAK` | f6c25f4a7 | 2026-01-25 | 1 / 6614 | 3 (0%) |  | unique patches not in main: 1 ahead / 6614 behind, 3 files (0% identical in main), last commit 2026-01-25 |
| `claude/fix-vehicle-sheet-partials-yHfR9` | b26ed810c | 2026-01-25 | 48 / 6614 | 59 (12%) |  | unique patches not in main: 48 ahead / 6614 behind, 59 files (12% identical in main), last commit 2026-01-25 |
| `claude/refactor-talent-reading-YX9J8` | d0682ba6b | 2026-01-25 | 10 / 6614 | 23 (13%) |  | unique patches not in main: 10 ahead / 6614 behind, 23 files (13% identical in main), last commit 2026-01-25 |
| `claude/fix-defense-calculation-iMo0v` | b6b95e39c | 2026-01-18 | 2 / 6920 | 2 (0%) |  | unique patches not in main: 2 ahead / 6920 behind, 2 files (0% identical in main), last commit 2026-01-18 |
| `claude/attach-species-images-50fL0` | 3158b907b | 2026-01-09 | 1 / 7127 | 1 (0%) |  | unique patches not in main: 1 ahead / 7127 behind, 1 files (0% identical in main), last commit 2026-01-09 |
| `claude/link-species-art-hp2ga` | 02a624970 | 2026-01-09 | 1 / 7129 | 2 (0%) |  | unique patches not in main: 1 ahead / 7129 behind, 2 files (0% identical in main), last commit 2026-01-09 |
| `claude/update-guides-systems-gligV` | 1f0d04d30 | 2026-01-03 | 1 / 7295 | 2 (0%) |  | unique patches not in main: 1 ahead / 7295 behind, 2 files (0% identical in main), last commit 2026-01-03 |
| `claude/compare-character-generation-Fq7Fo` | f2772c3de | 2025-12-31 | 1 / 7432 | 1 (0%) |  | unique patches not in main: 1 ahead / 7432 behind, 1 files (0% identical in main), last commit 2025-12-31 |
| `claude/static-activation-checklist-c0XIZ` | f5990400c | 2025-12-20 | 1 / 7611 | 2 (0%) |  | unique patches not in main: 1 ahead / 7611 behind, 2 files (0% identical in main), last commit 2025-12-20 |
| `claude/debug-progression-compendium-01MfSWRFC4NxzvX5uw5JUBfh` | 9d58cf3cf | 2025-12-12 | 1 / 7749 | 3 (0%) |  | unique patches not in main: 1 ahead / 7749 behind, 3 files (0% identical in main), last commit 2025-12-12 |
| `docflowGM-patch-1` | 2bce9dba4 | 2025-12-05 | 4 / 7888 | 4 (0%) |  | unique patches not in main: 4 ahead / 7888 behind, 4 files (0% identical in main), last commit 2025-12-05 |

## Branch cleanup roster (for owner approval; nothing was deleted)

`ALREADY_CONTAINED` refs (885) are fully in `main` and safe to delete after approval; the list is in the JSON (`disposition == "ALREADY_CONTAINED"`). Do not delete the `INTEGRATED`, `DOCS_CONSOLIDATE`, `BLOCKED`, `PLAYTEST_PINNED` or `NEEDS_OWNER_REVIEW` refs: they hold the only copy of work or provenance the index files cite.
