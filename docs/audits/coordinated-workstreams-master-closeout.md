# Coordinated workstreams — master closeout (2026-11-28)

Machine-readable register: `data/audits/coordinated-workstreams-task-register.json`. Nothing here is `FOUNDRY_TESTED`.

## 1. Merge history
Integration branch `integration/consolidation-20261128` = tip of `feature/vehicle-crew-rules` (`ea699f3af`). `main` (`f734b4d33`) had not moved, so the whole stack is a clean linear 232 commits ahead of it; no conflicts, no cherry-picks.

| Order | Source | Disposition |
| --- | --- | --- |
| 1 | PR #1185 audit/census (`b6b7923ad`) | included by ancestry |
| 2 | PR #1186 V2 realignment (`018262b6e`) | included by ancestry; **tracker findings are not closed by merging** |
| 3 | Games restoration (`7d643bd96`, `bcac3ba5f`) | included |
| 4 | Vehicle crew/sheet (`1b6cded54`, `f66b6791b`, `64b14750e`) | included |
| 4b | Commits pushed to the Vehicle branch by other sessions: Home Comm Feed (`9ab163ff4`, `c682a7b7e`), Galactic Profiles (`fe556c71e`), merge `ea699f3af` | included |
| 5 | PR #1187 Home Comm Feed (`3bcd5beef`, `e082e90ae`) | `git cherry` shows both patch-equivalent to 4b: **superseded by identical patches**, no duplicate applied |
| – | worktree branch `prg-mannequin-stage-abc` | all 3 commits patch-equivalent to realignment (nothing unique) |
| – | `claude/force-v2-mechanics` | local only, no commits beyond `main`; nothing to merge |
| – | PR #1184 docs deletion | **not merged**: census registry still references the deleted paths |
| – | PRs #1183, #1175 | proposal-only / BLOCKED: not merged |
| – | #1171, class-force stack #1122–#1164, TI/audit PRs #1046–#1063 | inventoried, not verified, not merged (see register `HELD-LIST`) |

Validation of the integrated tree: rolling suite 885/885, architecture ratchet OK, validate-partials OK, validate-data OK, system.json valid.

## 2. Completed (offline-tested, runtime pending)
Dejarik draft dispatch; Pazaak turn lifecycle/controls; VC-01/03/04; vehicle sheet UI-01/02/07/08/09; Home task delivery/lifecycle; Galactic Profile gallery; all realignment checkpoints in `implementation-progress.md`.

## 3. Unfinished
See register. Headlines: realignment tracker 173 OPEN / 23 PARTIAL_BLOCKED / 11 OWNER_DECISION; Games layouts for all four games, landing page, Sabacc/Hintaro dock + animations, Dejarik board art; Vehicle VC-05..14 and UI-03..18; Holocom UX; Force V2 runtime registry/resolver; Galactic Profile/chargen survey follow-ups.

## 4. Owner decisions
Realignment register (`docs/audits/swse-rules-decisions-pending.md`: TPS-RD-001, WEALTH-Q1, DC-A02/A03/A05, PRG-RD-001, PRQ-SRC-001..005, AUD-RQ-01..31); Pazaak duplicate-card/variant policy (PZ-08); vehicle `system.hull` vs `system.hp` storage authority; adoption of the source-authority protocol (#1183/#1046); #1175 semantic lineage.

## 5. Foundry runtime acceptance pending
Every item above marked OFFLINE_TESTED, plus Home notification dedup/navigation, vehicle sheet save/reload, crew assignment drag/drop, Pazaak/Dejarik DOM wiring. See `docs/audits/architecture-census/post-merge-foundry-runtime-acceptance-plan.md`.

## 6. Recommended order
1. Games player-blocking layout/dock work (Hintaro/Sabacc/Pazaak P0 CSS; needs Foundry computed-style measurement).
2. Vehicle VC-05/VC-07 (System Operator, shared action budget) then action catalog.
3. Force V2 registry/resolver (new branch from merged main).
4. Realignment remaining findings by dependency chain ActorEngine → TransactionEngine → DerivedCalculator → Prerequisite → Progression.
5. Holocom UX, landing page, polish, doc cleanup (#1184 after census regeneration).

## 7. Deferred / blocked
Preserved, not failures: items in §4 and register statuses `BLOCKED_*`.

## 8. Repository status
Recorded in the PR that carries this document. Source branches are retained.
