# Phase 2 — Recovering substantive unmerged work (issue #1166)

**Audit date:** 2026-11-21. **`main`:** `28b7797b54aa532534f7fa8d497e9a94c812b76c`. **Method:** full (unshallowed) history; `git rev-list --left-right --count`, `git cherry`, per-file blob comparison against `origin/main`, `git merge-tree` dry-run merges (nothing was merged, closed, rebased or deleted). Machine-readable data: `phase2-unmerged-recovery-data-2026-11-21.json`.

No game rules were decided or interpreted. Items that would need a rules ruling are flagged `NEEDS_SOURCE_ADJUDICATION` and are not entered in the decision register because no new rules question was discovered in this pass.

## 1. Headline

| Stream | Verdict |
| --- | --- |
| A. Class/Force chain (#1120–#1164) | Real, large, and **in direct conflict with Force V2 (#1165)**: 19 shared files, 9 hard textual conflicts, including Force Point authority. Do not merge; reconcile after #1165 acceptance. |
| B. Species / archetype / talent / class / droid source streams | **Species, talent-3h + archetype-11-2 vocabulary, Scout tranche and class-6a docs are genuinely absent from `main`** and are safe docs/tools recoveries. The droid branch is **superseded** (main is newer and richer). |
| C. 94 long-tail refs | Mostly stale. 7 are fully content-identical; 25 are one January fork family; the rest are single-purpose branches that need per-branch review. |
| D. Contained open PRs | **15** (not 14) open PRs add nothing to `main`; #1080 is content-identical though patch-ids differ. |

## 2. Stream A — Class/Force vs Force V2

Tip `fix/class-force-6ae-temptation-owner-choice-routing` (PR #1164): **142 ahead / 258 behind** `main`, 85 changed paths (37 scripts, 23 tests, 23 docs, 1 template, `index.js`). 0 of the 85 paths are identical in `main`. Against `main` alone the tip merges cleanly (no textual conflicts).

Force V2 `claude/keen-sagan-jvkazs` (PR #1165): 61 ahead (60 unique patches) / 50 behind, 131 changed paths.

**Overlap: 19 paths.** Merging Class/Force onto Force V2 yields **9 conflicts**:

`scripts/combat/rolls/force-point-transaction.js`, `scripts/engine/combat/reactions/reaction-engine.js`, `scripts/engine/combat/reactions/reaction-registry.js`, `scripts/engine/force/force-engine.js`, `scripts/engine/force/force-point-spend-coordinator.js`, `scripts/engine/roll/roll-core.js`, `scripts/governance/actor-engine/actor-engine.js`, `tests/force-point-transaction-integrity.test.mjs`, `tests/roll-expression-transform-authority.test.mjs`.

Auto-merged but semantically unverified (10): `swse-actor-base.js`, `progression-finalizer.js`, `attacks.js`, `full-attack-card-renderer.js`, `force-executor.js`, `swse-roll-engine.js`, `consular-talent-actions.js`, `sentinel-talent-actions.js`, `DarkSidePowers.js`, `chat-interaction-bridge.js`.

Chain is strictly linear (each PR's base is the previous PR's branch), so PRs #1120–#1164 are not independent merge units. Feature groups by phase letter, from PR titles:

| Phases | Feature | Conflict exposure with V2 |
| --- | --- | --- |
| 6J, 6K, 6O, 6Q–6S | Fallen Jedi gate; Fearless/Indomitable typed suppression and effect ingress | `actor-engine.js` (effect writers) |
| 6L, 6P(GM), 6U | Prophet vision finalization and GM review | progression finalizer |
| 6M | Jedi Master Serenity | roll/attack path |
| 6N, 6V, 6W, 6AB–6AE | Sith Lord Temptation (spend receipts, expiry, owner choice) | **Force Point transaction / spend coordinator** |
| 6O(attack), 6T, 6X, 6Y, 6Z, 6AA | FP receipts, paid reaction costs, reaction admission | **`reaction-engine`, `force-point-transaction`** |
| 6P(sheet) | Serenity/Temptation sheet controls | template only |

**Action:** keep as protected integration tranche. Order: (1) Force V2 accepted; (2) re-derive 6J–6M and 6P-sheet (low overlap) first; (3) port the Temptation/reaction receipt work onto V2's FP transaction authority. Never substitute old FP code for V2 authority. Behavioral claims were not runtime-tested here.

## 3. Stream B — gap matrix (source/canonical metadata)

Status vocabulary per CLAUDE.md. "Present in main" is by exact blob comparison. Nothing here is claimed `IMPLEMENTED`; these are audit/data/tool artifacts.

| Branch | Ahead | Paths | Absent from main | Identical in main | Differs | Action |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `audit/species-book-by-book-canonical` | 44 | 13 | 13 | 0 | 0 | `MISSING_AND_WORTH_PORTING` (docs + `data/audits/species-*.json`; no `main` file has these names). Source evidence, not a production species bug. Species `SOURCE_VERIFIED` status must be re-checked against current species data before any data change. |
| `audit/archetype-phase-11-2-mechanical-ontology` | 9 | 44 | 34 | 7 | 3 | The 7 JSON adjudication files are already in `main`; their 7 `docs/audits/archetype-phase-11-2-*.md` companions are **absent**. Plus Phase-11 canonical metadata + vocabulary, `data/canonical/semantic-tag-vocabulary.json`, and talent-3h tools/tests. |
| `audit/talent-phase-3h-semantic-metadata` | 3 | 30 | 27 | 0 | 3 | **Strict subset** of archetype-11-2 (3/3 commits contained; tree diff between the two is empty outside the 11-2 paths). Same lineage: take one, never both. |
| `audit/archetype-phase-12b-scout-semantic-curation` | 2 | 2 | 2 | 0 | 0 | Absent: `data/audits/archetype-phase-12b-scout-tranche-1.json` + md. `main` has 12a/12b docs under other names; compare content before porting. |
| `audit/class-canonicalization-phase-6a` | 4 | 4 | 2 | 2 | 0 | Two JSON ledgers already in `main`; the two `.md` reports (6A census, 6B prestige source audit) are absent. Docs-only recovery. |
| `audit/droid-two-books-kotor-gaw-2026-11-02` | 1 | 3 | 0 | 2 | 1 | `SUPERSEDED`. Branch commit is 2026-11-02 19:54; `main` later changed `gaw.json` (20:01, 19:58). The only diff **removes** source-backed systems records that `main` has. Do not port. |

**Hazards found (important):**
- Talent-3h/11-2 also modify `tools/apply-talent-phase-3g.mjs` and `tools/check-talent-phase-3c-ci.mjs`. `main` holds newer versions (e.g. `4f5c64a1a` "preserve talent freeze while allowing only approved class mechanics fields"); taking the branch versions would delete ~159 lines of CI guard. **Port only the added files, never these two modified ones.**
- `tools/apply-talent-phase-3h.mjs` is an apply script written against an older talent schema. Port it inert (docs/tests/tools only); do **not** run it against current `data/` without a fresh dry run.
- Branch bases are 1,364–1,584 commits behind `main`, so file-identity is the only reliable evidence.

Recommended small PRs, in order: (1) species audit docs/data (13 files, additive); (2) archetype-11-2 docs + Phase-11 vocabulary and the 3h census/tools/test, excluding the two modified tools; (3) Scout tranche-1; (4) class 6A/6B reports. Each is additive, no migrations. Needs a test run of `tests/talent-phase-3h-semantic.test.mjs` against current data before merge; not yet run.

## 4. Stream C — the 94 `NEEDS_OWNER_REVIEW` refs (first-pass partition)

| Bucket | Count | Basis |
| --- | ---: | --- |
| `ALREADY_FUNCTIONALLY_PRESENT` | 7 | every changed file is byte-identical in `main` (`audit/feat-sourcebook-metadata-verification`, `audit/talent-sourcebook-metadata-verification`, `feat/force-power-phase-1-schema`, `feat/force-power-phase-2-reconciliation`, `feat/npc-force-and-bespoke-fallbacks`, `feat/wire-npc-bulk-damage`, `handoff/droid-v2-integration-2026-11-05`) |
| `MISSING_AND_WORTH_PORTING` | 5 | `audit/species-book-by-book-canonical`, `audit/archetype-phase-11-2-mechanical-ontology`, `audit/talent-phase-3h-semantic-metadata` (same lineage as the previous), `audit/archetype-phase-12b-scout-semantic-curation`, `audit/class-canonicalization-phase-6a` (5 refs, 4 deliverables) |
| `SUPERSEDED` | 1 | `audit/droid-two-books-kotor-gaw-2026-11-02` |
| January fork family (merge base `1d0a0caa4`) | 25 | 21 carry 292–317 changed paths with 43 identical; 4 smaller. Same stale ancestry. Default `SUPERSEDED/ARCHIVE`; only `claude/fix-tree-talent-contract-loUAK` (+1) and `claude/refactor-talent-reading-YX9J8` (+10) are small enough to inspect for a distinct defect |
| Remaining single-purpose refs | 56 | each has its own merge base; **not yet classified per branch** |

**Honest limit:** per-feature missing-behavior evidence for the 56 single-purpose refs and the 25-ref family was not produced in this pass, so I am not assigning `MISSING_AND_WORTH_PORTING` / `NEEDS_SOURCE_ADJUDICATION` / `BLOCKED_CONFLICT` to them. Candidates most likely worth a closer look, from branch name and recent date: `feat/force-power-final-integration` and phases 3–6 (July 2026; 3 of 4–5 files already identical), `feat/app-responsive-contracts-phase2` (16 of 21 files identical), `claude/gm-datapad-recovery-nzh4gz` (8 of 13), `claude/swse-phase-1-audit-3c9fo8` (8 of 14), `claude/compendium-forensics-audit-exsbrb` (10 of 11), `fix/v14-system-data-model-manifest` (0 of 14), `claude/d4-typed-resistance-lckwoh`, `phase3/talent-production-canonicalization`. Rank by the share of files already in `main`: the high-share branches are likely `ALREADY_FUNCTIONALLY_PRESENT` after a per-file diff.

## 5. Stream D — open PRs vs current `main`

Of 51 open PRs (all drafts): **14 have 0 unique patches** — #1106, #1092, #1086, #1085, #1083, #1082, #1081, #1069, #1068, #1067, #1066, #1065, #1064, #1061. **#1080 also adds nothing** (3 of 3 files identical in `main`, patch-ids differ), making **15**. Proposed disposition: comment "already incorporated" and close; closing was not done.

Not class/Force, but **not contained and not stacked on it** — 11 small docs/audit PRs with files absent from `main`:

| PR | Unique | Files absent / total in main | Note |
| ---: | ---: | --- | --- |
| #1063 | 8 | 36/37 | TI-4A contract guards |
| #1062 | 4 | 10/10 | TI-4 Phase 0 design (base of #1063) |
| #1059 | 2 | 3 of 14 absent, 11 differ | TI-1 resource integrity |
| #1058 | 2 | 17/17 | TI-0 baseline |
| #1057 | 15 | 13 of 19 absent, 6 differ | D-005 T2 published-facts records |
| #1053 | 1 | 1/1 | D-005 host source reconciliation |
| #1050 | 1 | 1/1 | Q-033 fault-injection design |
| #1049 | 3 | 3/3 | errata vs equipment rules |
| #1047 | 4 | 2/2 | master questions/decisions |
| #1046 | 1 | 1/1 | Source Authority Protocol (proposal) |
| #984 | 9 | 2 of 8 absent, 6 differ | Phase 3C-1 certification fixes |

These were lumped into "stacked/blocked" in the issue summary; most are independent docs PRs. #1057 and #1049/#1047 may carry content that touches rules sources; they must be read for any ruling before merge.

## 6. Proposed order

1. Close the 15 contained PRs with evidence comments (needs owner go-ahead; not done).
2. Four additive docs/tools PRs from §3, with `tests/talent-phase-3h-semantic.test.mjs` run first.
3. Review the 11 docs PRs in §5; merge docs-only independent ones.
4. Per-branch pass over the 56 + 25 long-tail refs (§4 limit).
5. Class/Force tranche after Force V2 acceptance (§2).
6. Branch deletion roster only after 1–5; none proposed for deletion yet.

## 7. Not done / unverified

- No tests were run (no code changed). No Foundry runtime checks.
- Stream C is partially classified (§4). Class/Force behavior was compared at file/conflict level, not by behavior.
- Counts of "ahead" use `git cherry`; branches with patch-equivalent commits are counted as contained.
