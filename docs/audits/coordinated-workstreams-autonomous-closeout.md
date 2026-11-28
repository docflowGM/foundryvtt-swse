# Autonomous backlog completion: closeout (PARTIAL CHECKPOINT)

Branch `refactor/coordinated-backlog-completion` from `main` 25052d6c5. **This is a partial checkpoint, not a complete closeout:** the backlog (274 tracker findings plus the Games, Vehicle, Force V2, Holocom and chargen work orders) is far larger than one session can finish. Nothing here is FOUNDRY_TESTED. Resume from `coordinated-workstreams-autonomous-execution-log.md`.

## Completed in this pass (offline-tested)
| Area | Work | Evidence |
| --- | --- | --- |
| Games | Recent Results from a terminal-inclusive listing; shelves filter before capping (GC-LIB-05) | tests/games-recent-results-shelf.test.mjs |
| Games | Hintaro layout contract: dedicated scoped stylesheet, constrained avatar, rules/ranks drawer (HIN-01..07) | tests/hintaro-layout-contract.test.mjs |
| Games | Pazaak turn-loop outcome tests (auto-20, bust, one side card, Stand, draw gate) | tests/pazaak-turn-loop-outcomes.test.mjs |
| Games | Credit buy-in disabled reason; practice chips vs campaign credits labelling (S-03/S-04) | tests/games-rules-modes.test.mjs |
| Games | Dejarik board rules smoke preserved as a passing test (stale fixture fixed) | tests/dejarik-board-rules-smoke.test.mjs |
| Vehicle | Crew action catalog: Core action vs roll helper, printed costs/pages; per-actor charging (shared across roles); unknown Crew Quality fails closed (VC-06/07/09) | tests/vehicle-crew-action-catalog.test.mjs |
| Force V2 | 212-definition coverage matrix derived from engine evidence | tests/force-v2-coverage-matrix.test.mjs |
| Games | Landing page recomposed: 2x2 gallery + featured panel + activity shelf, developer copy removed, per-game blurbs and CSS identity, shelf overflow shown (GC-LIB-01..04, 06, 07, 08, 12) | tests/games-library-launcher-contract.test.mjs + headless render check (1200x760, 800x600) |
| Games | Hintaro betting limits follow engine costs; Sabacc raise bound fixed; bet/raise inputs labelled (HIN-12, S-05) | tests/hintaro-betting-affordability.test.mjs, tests/sabacc-raise-bound.test.mjs |
| Vehicle sheet | Tab semantics + keyboard navigation (UI-10); a11y fixes (UI-13 partial); systems-browser failures visible (UI-17); stations staffed vs crew complement (UI-03) | tests/vehicle-tab-navigation, vehicle-sheet-accessibility, vehicle-systems-browser-error-visibility, vehicle-crew-summary-concepts |
| CI | Fixed a flaky Pazaak test (scenarios shared one match) that failed CI on 03a308d78 | cb6b527ad |
| Tracker | F-ACT-006 set OFFLINE_TESTED with its original commit | tracker.json |

## Key finding
Force V2 per-definition runtime logic is missing for 56/58 techniques, 15/15 secrets, 11/11 overlays, 24/24 lightsaber forms and 27/27 starship maneuvers (28 powers have handler references, 28 only the generic check resolver, 7 maintenance contracts). A first pass of the matrix over-counted until display-only name lists were excluded.

## Blocked / deferred (details: coordinated-workstreams-autonomous-blockers.md)
VC-05 System Operator model; Recharge/Reroute multi-turn swift tracking; DJ-ART (board art geometry 12x3 vs engine 8x4); SAB-SMOKE (retired 76-card deck); FV2-DMG and FP-RD-016; HULL-HP; PZ-08; the realignment owner-decision set.

## Not started
Sabacc/Hintaro/Pazaak visual redesigns beyond the items above, dice animation and drag-and-drop; UI-05/06 (action budget display, weapon readiness), UI-11/12/14/15/16/18; Holocom UX; chargen/Galactic Profile follow-ups; store/droid/ship/NPC/skills follow-ups; the 173 OPEN tracker findings (mostly dead-module and doc items needing per-item evidence); held-PR reconciliation (#1184 needs census regeneration).

## Foundry acceptance
Pending for everything above. Layout work (Hintaro, launcher) additionally needs computed-style measurement in a live window; Foundry's `.is-shell-compact` `!important` overrides could defeat the launcher grid and were not testable offline.
