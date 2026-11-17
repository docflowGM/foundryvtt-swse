# Mentor Survey V2: Total Cutover Report

> **Superseded in part (2026-11-16).** The source-recovery milestone recovered Multiclass Q2/Q6 and Prestige Q1/Q3 and corrected the "source-blocked" labels below. Current counts, statuses and blockers: `13-SOURCE-RECOVERY-COMPLETION-REPORT.md` and `06-CONTENT-STATUS-AND-BLOCKERS.md` section 11. Sections 1 and 5 below describe the state at the first cutover.

**Branch:** `refactor/mentor-surveys-v2-cutover` (never merged to `main`; merge needs owner approval)
**Report date:** 2026-11-16
**Scope:** Level 1 (Q1-Q5), Foundation-Class Multiclass (Q1-Q6), Prestige (Q1-Q6), shared infrastructure, survey influence, legacy removal.

## 1. Bottom line

All three legacy surveys are **gone from the codebase** and replaced by one V2 architecture (single controller, single session key, single finalizer-written event ledger, single influence calculator). The V2 surveys are wired into the Foundry progression shell and pass their offline tests.

**None of them is operational for players yet, and none has been run in Foundry v13.** Three independent reasons:

1. **Release gate.** Every scope (5 L1 classes, 5 multiclass destinations, 32 prestige classes) is `withheld`, and nearly all dialogue is `draft_text`. Players see "not available, optional". A GM can opt into a default-off editorial preview to review drafts.
2. **Source content is missing or unapproved** for several questions (section 5). Multiclass and Prestige are **not** the full six-question designs: they run only the questions whose source exists.
3. **No live Foundry session was available.** Offline tests prove the pure logic and the file wiring, not rendering or the real finalizer. Manual acceptance procedures are written (`06-CONTENT-STATUS-AND-BLOCKERS.md` sections 7-9) and unperformed.

| Survey | Questions that run | Source-blocked (skipped, never invented) | Legacy removed | Player-visible | Foundry-tested |
|---|---|---|---|---|---|
| Level 1 | Q1-Q5 (all five) | none | yes | no (withheld; draft text) | no |
| Multiclass | Q1, Q3, Q4, Q5 | Q2, Q6; Q4/Q5 for an undecided Q1; Q5 career-continuity option | yes | no | no |
| Prestige | Q4, Q5 (incl. optional second purpose) | Q1, Q2, Q3, Q6 | yes | no | no |

## 2. What was built

**Phase A: authority.** `00-AUTHORITY-INDEX` (branch HEADs, supersession), `01-SHARED-ARCHITECTURE-CONTRACT`, per-survey specs `02/03/04`, `05-TRACEABILITY-MATRIX` (machine-checked against test titles), `06` blockers ledger, register `MSV-RD-001..010`.

**Phase B: canonical authorities.** Kharjo added to the Mentor registry; class to Mentor routing for 5 foundation + 32 prestige classes locked by test; protected class pack defects documented, not edited.

**Phase C: shared infrastructure** (`scripts/mentor/mentor-survey-v2/`, pure and Foundry-independent): `contract`, `content-store` (allow-list view builder, release gate), `survey-session` (deterministic draft state machine), `intent-ledger` (append-only, idempotent, supersession), `actor-evidence` (read-only finalized-state projection), `reflection` (shared Q6 engine), `tag-boundary` (inert), `survey-controller` (generic lifecycle) with L1 / multiclass / prestige adapters and resolvers, `finalization`, `content-loader`.

**Phase C2: survey influence.** One typed config (`l1` A 0.65 / H 8, `multiclass` 0.90 / 4, `prestige` 1.20 / 3: provisional), per-event decay `D=2^-(L-Ls)/H`, bounded reinforcement `R(n)=1+0.15*min(n-1,3)` applied once per distinct question, a survey-channel cap, saturation `F(E)=1-e^(-E/k)`. Only certified, ontology-registered tag evidence counts, so the channel is empty today. Declared goals never decay; Q6 calibration is a separate authority with unset coefficients. Events with a missing or invalid level contribute nothing. Legacy shared-decay `computeSurveyBias` (0.175 floor) removed; the channel reaches the Suggestion Engine only as `identityBias.surveyTagAffinity` under a hard ceiling. Calibration report: `07`.

**Phases D1-D3: cutovers.** `MentorSurveyStep` / `MulticlassSurveyStep` / `PrestigeSurveyStep` (thin Foundry wrappers), `ActiveStepComputer` activation driven by the same triggers (finalized class levels, first acquisition only, released-or-GM-preview, fails closed if the manifest has not loaded), `ProgressionSession` single `mentorSurvey` draft key, `ProgressionFinalizer` writing the ledger inside its atomic update, GM-only default-off preview setting, release manifest.

## 3. Content imported (verbatim, with approval flags)

| Pack | Selectable answers | Other | Owner-approved text |
|---|---|---|---|
| `l1.json` | 1,375 (Q1 30, Q2 485, Q3 150, Q4 685, Q5 25) | 97 Q2 reference texts (never offered), 2 navigation controls, 25 intros, 30 Q3 + 97 Q4 situations | Jedi Q1 (6), J0-N1 intros except Q3 |
| `multiclass.json` | 2,125 (Q1 120, Q3 4, Q4 1,500 = 1,250 methods + 250 neutral, Q5 500 incl. 100 withheld goal-slot templates, + 1 neutral) | 20 Q1 intros, 15 fixed intros, 250 scenarios, 100-route family map | Q3 depth answers (4) |
| `prestige.json` | 260 (Q4 depth 4, Q5 purposes 224, 32 second-purpose decline lines) | 32 x (2 Q4 intros, 2 Q5 intros, question, 4 rails, second-purpose prompt) | shared Q4 depth (4), Ace Pilot Q4 wording, Ace Pilot Q5 seven statements |

Master answer-ID reconciliation (L1): all 1,472 master rows map one-to-one to V2 ids; no tag data imported (`08-ANSWER-ID-RECONCILIATION.md`).

## 4. Legacy removed (no migrations, shims, dual authorities or fallbacks)

Deleted: `scripts/mentor/mentor-survey/` (engine, registry, definition builder, prestige profiles, 38 `PrC_*` and 5 `L1_*` definitions), both `mentor-survey.js` re-export shims, the legacy L1, base-class and prestige steps, the L1 work-surface and details templates, two dead L1 contract JSONs. Removed from live code: `IdentityEngine.computeSurveyBias`/`injectSurveyBias`/`clearSurveyBias`, `BuildIntent._applyMentorBiases`, the `classSurveys`/`classSurveyDrafts`/`prestigeSurvey` session keys and alias, the finalizer's `classSurvey*`/`prestigeSurvey*`/`mentorBuildIntentBiases` writes, and their forecast and suggestion-context readers. The weighted-pruning arithmetic (`mergePrestigeBias`, `pruneWeight`, `prestigeWeight`, `oldIdentityRetention`) no longer exists anywhere under `scripts/` (asserted by a test). 53 files deleted, 55 added versus `main`.

**Still present (inert, listed in `06` section 10):** dead reads of the retired `mentorBuildIntentBiases` field in nine suggestion modules; the template-build path that pre-fills the overloaded `survey` key; the unrelated mentor-surface chat survey.

## 5. Blocked at the source (what the owner must supply or decide)

| Item | What is missing | Register |
|---|---|---|
| Multiclass Q2 | certified `q1_focus` phrase for each Q1 answer, authored E/F answers, a verified top-four scores accessor | `MSV-RD-007` |
| Multiclass Q6 / Prestige Q6 | Q6 libraries import; **the 32-class Prestige Q6 package is not in Git** (not proven unwritten; owner to commit it; never reconstructed) | 06 |
| Q4/Q5 for an undecided multiclass Q1 | which scenario is "low-assumption"; the Q5 fallback banks (only in an uncommitted JSON) | `MSV-RD-008` |
| Multiclass Q5 career continuity | a goal-phrase source and the no-goal alternative text | `MSV-RD-009` |
| Multiclass with 2+ prior foundation classes | which origin keys Q1 | `MSV-RD-004` |
| Prestige Q1 / Q2 / Q3 | Q1 banks import (varied formats), slate policy, Q2 wording; Q3 needs Q1 | `MSV-RD-005` |
| Prestige "another career" | the Discover/Explore/Affirm conversation for all classes | `MSV-RD-010` |
| L1 Q2/Q4 ranking | ranking coefficients; Q3-tag-driven Q4 personalization (needs certified mapping) | `MSV-RD-001/002` |
| Class tree access | Charlatan Fortune, Force-tree alternatives, Independent Droid, raw-id defects (independent audit ingested) | `MSV-RD-006` |
| Release | line-by-line approval of draft text, then flipping `withheld` to `released` per scope | manifest |

## 6. Tests and validation

- **Survey suite:** 150 tests in 13 files, all passing (`tests/mentor-survey-*.test.mjs`), plus the matrix traceability check.
- **Full repository suite:** see the accounting appended in section 9 (the numbers are verified, not estimated).
- **Pre-existing failures:** the 5 force-power tests (`force-power-final-integration`, `phase3/4/5/6-*`) fail identically on a clean `main`.
- **Other validators:** `system.json` valid; template partial validator passes; data validator passes; progression-integrity findings 47 (main: 48).
- **Governance artifacts regenerated by their own tools:** the weapon three-gate consumer ledger (listed two deleted survey files). The frozen tree-identity census was left untouched and still passes `--check`.
- **Not tested:** anything requiring Foundry (rendering, the real finalizer transaction, actor persistence, the settings UI, template compilation), real Suggestion Engine ranking with certified tags, and any live preview-permission behavior.

## 7. Rules and authority compliance

- No answer-to-tag mapping was imported or activated; the boundary is typed and inert. No new weights, tags or scoring. Q6 correction coefficients unset.
- Four authority lanes stay separate: surveys write only declared-goal and inferred-identity events; acquisitions and eligibility are read-only to them.
- No rules were decided by the implementation: every ambiguity became a register entry (`MSV-RD-001..010`) with a fail-closed behavior (withheld, skipped, or neutral ordering that makes no relevance claim).
- Draft content never reaches players; unapproved or `unverified_mechanic` records are never offered; preview events are marked and excluded from every reader.

## 8. Recommended order of operations

1. Owner reviews and approves L1 text; flips L1 classes to `released` one at a time. Run the L1 Foundry acceptance procedure first.
2. Supply the Prestige Q6 package and the multiclass Q2 artifacts (`q1_focus`, E/F, scores accessor); rule on `MSV-RD-004`, `-008`, `-009`.
3. Import Prestige Q1/Q3 once the slate policy (`MSV-RD-005`) is approved; connect Q6 for both surveys through the shared reflection engine.
4. Fix the protected class pack through its own baseline process (`MSV-RD-006`).
5. Delete the inert `mentorBuildIntentBiases` readers in a focused, retested suggestion-engine change.
6. Only then run the separate answer-to-tag certification project against the V2 ids (crosswalk in `08-l1-id-crosswalk.json`), and calibrate the influence coefficients against real Suggestion Engine ranking in Foundry.

## 9. Full-suite accounting

Final run of `node --test tests/*.test.mjs` on the branch head: **2,293 tests = 2,280 pass + 5 fail + 8 skipped; 0 cancelled, 0 todo, 0 suites.**

- The 5 failures are `force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation` and `phase6-force-direct-damage`. Each fails identically on a clean `origin/main` worktree, so none was introduced here.
- The 8 skipped tests are skips declared by existing tests; none belongs to the survey suites.
- Earlier runs on this branch surfaced two regressions caused by the cutover (a governance classification scan and the weapon consumer ledger, both reacting to new or deleted files). Both were fixed by relocating a design crosswalk out of `data/audits/` and regenerating the ledger with its own tool; the final run is clean apart from the 5 pre-existing failures.
- Survey suite: 150 tests in 13 files (L1 30, multiclass 20, prestige 15, reflection 17, influence 15 + 4, ledger 10, session 10, contract 8, canonical authority 8, step 7, id reconciliation 3, traceability 3).
