# Autonomous backlog completion: execution journal

Branch `refactor/coordinated-backlog-completion` (base `main` 25052d6c5). Statuses: IMPLEMENTED / OFFLINE_TESTED / BLOCKED / DEFERRED. Nothing is FOUNDRY_TESTED.
Resume rule: read this file, take the first `QUEUED` row in the queue below, do not redo `DONE` rows.

## Queue (priority = player-blocking > data integrity/mechanics > architecture > UX)
| # | Task | Status | Evidence / note |
| --- | --- | --- | --- |
| Q1 | GC-LIB-05 Recent Results excludes terminal sessions (query fix) | DONE (OFFLINE_TESTED) | tests/games-recent-results-shelf.test.mjs |
| Q2 | HIN-04/05/06 Hintaro seat avatar class + positioned seats + action dock layout (static CSS/HBS) | DONE static layout (OFFLINE_TESTED; Foundry sizing pending) | needs Foundry measurement for final sizing |
| Q3 | PZ-11 Pazaak turn-loop tests (bust repair, 20, full board, set/match end) | DONE (OFFLINE_TESTED) | |
| Q4 | S-03/S-04 Sabacc disabled-credit reason + practice vs campaign labels | DONE (OFFLINE_TESTED): reasons + practice/campaign labels; tests/games-rules-modes.test.mjs | |
| Q5 | VC-05 System Operator role; VC-07 per-actor action budget; VC-09 unknown crew quality fail-closed | PARTIAL: VC-07 (per-actor spend for printed standard actions, shared across roles) + VC-09 (unknown quality fails closed) DONE; VC-05 System Operator role mapping BLOCKED (design decision, see blockers) | |
| Q6 | VC-06 crew action catalog (VM), UI-04/06 | PARTIAL: catalog + honest button categories/costs/effects (UI-04) DONE; UI-06 weapon readiness projection not started | depends Q5 |
| Q7 | Force V2 status matrix generator (212 definitions) | DONE (OFFLINE_TESTED): data/force-v2/coverage-matrix.json + docs/audits/force-v2/force-v2-mechanical-coverage-matrix.md (212 rows; generator tools/build-force-v2-status-matrix.mjs) | |
| Q8 | Force V2 comparison-driven results (damage dice) | QUEUED | FP-RD-016 limits scope |
| Q9 | Tracker OPEN findings reconciliation (evidence-supported only) | QUEUED | |
| Q10 | Held PR reconciliation, doc convergence | QUEUED | |

## Log

### Batch 1 (suite 891/891)
- Q1 `game-session-shelf.js` + GamesSurfaceService: Recent Results from terminal-inclusive listing; filter-then-cap so invites are not hidden (GC-LIB-05/06 partially: live count mismatch still needs a Foundry session set).
- Q2 `styles/system/games-hintaro-table.css` (registered in system.json), avatar class, rules/ranks/callout moved into a drawer; `tests/hintaro-layout-contract.test.mjs`. Hintaro dock/feld sizing numbers are unverified until measured in Foundry.
- Q3 `tests/pazaak-turn-loop-outcomes.test.mjs`: auto-20, bust, one side card, Stand after side card, mandatory draw; Pazaak tests stub the AI think delay.

### Batch 2 (suite 893/893, ratchet OK)
- Q4 `game-rules-modes.js`: disabled Credit Buy-In now explains why (settings gates), Sabacc/Hintaro 'Practice Table' wording, economy line on tables (campaign vs practice chips). Engine ids/gates unchanged.
- Q5/Q6 `vehicle-crew-action-catalog.js`: each crew button classified Core action vs roll helper with printed cost + page; named crew are charged their own standard action for Aid Pilot (refused -> no roll; failed roll -> rollback); roll helpers never charged; Recharge Shields (3 swift across turns) not tracked yet; unknown crew quality no longer defaults to 'normal'.

### Batch 3 (suite 894/894)
- Q7 coverage matrix: derived from engine evidence, excluding display-only name lists (summaries/categories), which had inflated a first pass (58 of 65 powers 'referenced'; true count 28 handler + 28 resolver-only + 7 maintained + 2 registry-only). Techniques 56/58, secrets 15/15, overlays 11/11, lightsaber forms 24/24, maneuvers 27/27 have NO per-definition runtime logic. These are the Force V2 implementation gap, not just a documentation gap.
