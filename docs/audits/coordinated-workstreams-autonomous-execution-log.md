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
| Q8 | Force V2 comparison-driven results (damage dice) | BLOCKED (FV2-DMG): damage application from the comparison needs FP-RD-016 and per-power damage types | FP-RD-016 limits scope |
| Q9 | Tracker OPEN findings reconciliation (evidence-supported only) | PARTIAL: F-ACT-006 set from existing evidence; remaining OPEN findings not individually re-verified in this pass | |
| Q10 | Held PR reconciliation, doc convergence | NOT STARTED (#1184 needs census regeneration; other held PRs unverified) | |

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

### Batch 4
- Dejarik: art/engine geometry mismatch measured (blocker DJ-ART); Sabacc smoke test triaged (blocker SAB-SMOKE); Dejarik half preserved as tests/dejarik-board-rules-smoke.test.mjs.
- Closeout written (PARTIAL CHECKPOINT). Next unfinished: Games landing page (GC-LIB-01..04), Pazaak drag/art, Sabacc dock, UI-06, tracker re-verification.

### Batch 5 (resumed after #1190 CI green; suite 896/896, ratchet OK)
- CI fix: pazaak-turn-loop-outcomes isolated per scenario (cb6b527ad).
- Games landing page (GC-LIB-01/02/03/04/07/08/12): library recomposed as 2x2 gallery + featured panel + activity shelf (`styles/system/games-library-launcher.css`, templates library/detail/rail); developer phase/build/guardrail/status copy removed from the player view; player-facing `blurb` per game in the registry; primary action first in the featured panel; per-game CSS motif (no external assets). Evidence: tests/games-library-launcher-contract.test.mjs plus a headless Chromium render of the REAL templates' structure with the REAL stylesheets at 1200x760 (tiles 297x253, shelf ends at 748/760) and 800x600 (single scrolling column, no overlap). The render used a hand-built HTML copy of the template output, not Foundry.
- NOT verified: Foundry's `.is-shell-compact` rules in app-responsive-games.css (many `!important`) and concept-parity styles may still override the launcher layout in a real shell window. Needs a Foundry check.
- Next unfinished: Pazaak card art/drag-drop, Sabacc dock/layout, UI-06 weapon readiness, tracker re-verification, GC-LIB-06 (live active-count mismatch).

### Batch 6 (suite 897/897, ratchet OK)
- GC-LIB-06: shelves show `(+N more)` when capped, so the header count and shelf can no longer silently disagree (live data check still needs Foundry).
- S-05 / HIN-12: Sabacc and Hintaro bet/raise inputs carry aria-labels with min/max. Hintaro view model is now affordability-aware (`buildBettingVm` exported): bet needs credits >= min; raise cost is toCall + raiseBy so max raise = credits - toCall; call needs credits >= toCall; the old suggestedRaise (toCall + minRaise) over-suggested and the raise input used the bet maximum. Evidence: tests/hintaro-betting-affordability.test.mjs; engine costs read from hintaro-engine applyBettingAction.
- Sabacc betting limits NOT reworked: engine cost rules for Sabacc not read in this pass.

### Batch 7 (suite 900/900)
- Sabacc raise input bounded by credits - toCall (engine cost toCall + raiseBy): tests/sabacc-raise-bound.test.mjs.
- UI-10 vehicle tabs: tablist/tab/tabpanel roles, aria-selected/controls/labelledby with per-sheet unique ids, roving tabindex, Arrow/Home/End/Enter/Space: `vehicle-tab-navigation.js`, tests/vehicle-tab-navigation.test.mjs (pure logic + fake-DOM glue; real focus behaviour needs Foundry).
- UI-13 (partial): subsystem detail lines in a real <ul>; arrow-glyph buttons named; resource bars have progressbar semantics: tests/vehicle-sheet-accessibility.test.mjs. Not done: contrast/zoom checks, inline tiny text, focus rings.
