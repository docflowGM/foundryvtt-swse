# Source Recovery and Full-Question Completion Report

**Branch:** `refactor/mentor-surveys-v2-cutover` (never merged to `main`). **Date:** 2026-11-16.
**Foundry v13 certification: not claimed.** No live Foundry session was available; every result below is offline.

The earlier "source-blocked" labels for Multiclass Q2/Q6 and Prestige Q1/Q2/Q3 were too strong. Authored material existed in committed Markdown and an importer limitation was mistaken for absence. This milestone recovers everything that can be recovered safely and replaces each remaining blocker with precise evidence.

## 1. Imported counts (runtime packs in `data/mentor-survey/`)

| Survey | Question | Imported | Pack | Text status |
|---|---|---|---|---|
| Level 1 | Q1-Q5 | 1,375 selectable (Q1 30, Q2 485, Q3 150, Q4 685, Q5 25), 97 reference, 25 intros | `l1.json` | Jedi Q1 and J0-N1 intros approved; rest draft |
| Multiclass | Q1 | 20 banks, 120 answers, 20 intros | `multiclass.json` | draft |
| Multiclass | **Q2** | **625 templates (125 keys x 5 destinations)**, observed-only accessor audited | `multiclass-q2.json` | draft; `q1Focus` empty |
| Multiclass | Q3 | 4 depth answers | `multiclass.json` | approved |
| Multiclass | Q4 | 250 scenarios, 1,250 methods + 250 neutral | `multiclass.json` | draft |
| Multiclass | Q5 | 500 templates (100 goal-slot templates withheld) | `multiclass.json` | draft |
| Multiclass | **Q6** | **5 Mentor frames (45 lines), 170 Pass A clause variants, 10 Pass B claim kinds with 20 negative wordings, 297 identity rows, 18 free-standing AM statements, 5 A-E answers** | `multiclass-q6.json` | draft; answer B flagged (`MSV-RD-011`) |
| Prestige | **Q1** | **1,293 answers across 32 class banks; 44 opening and 35 question candidates** | `prestige-q1q3.json` | draft |
| Prestige | Q2 | audit only (section 4) | none | n/a |
| Prestige | **Q3** | **160 scenes, 800 first-person answers, 1,293 route assignments** | `prestige-q1q3.json` | draft |
| Prestige | Q4 | 4 depth answers, 32 x (2 intros, question, 4 rails) | `prestige.json` | depth approved; Ace Pilot approved; rest draft |
| Prestige | Q5 | 224 purposes, 32 second prompts, 32 declines | `prestige.json` | Ace Pilot approved; rest draft |
| Prestige | Q6 | **nothing** | none | package not in Git |

Per-class counts (Q1 answers, quarantined rows, candidates, scenes, answers, routes) for all 32 prestige classes: `10-PRESTIGE-Q1-Q3-IMPORT-REPORT.md`. Per answer-id traceability: every record carries `sourceRef {commit, file, line}`; the Prestige records also carry the exact authoritative `sourceId`.

## 2. Multiclass Q2 and Q6

- **Q2:** all 625 responses recovered. The accessor is audited and public: `IdentityEngine.computeObservedBehaviorBias(actor).mechanicalBias` is pure and observed-only; 39 of its 43 emitted keys are in the canonical 125 (4 ignored). A slate shows up to four distinct observed keys plus E and F; sparse evidence shows fewer and never pads. Still skipped in production because the owner has not supplied the certified `q1_focus` phrase per Q1 answer or the E/F text, and unverified claims stay disabled. No new scorer.
- **Q6:** Pass A and Pass B imported and connected to the shared reflection engine. The five Mentor personalities, A-E stages, B/C targeted corrections, mandatory NOT and AM stages for D/E, and the no-op A are covered by tests. Answer B is withheld until a first-person wording is approved.

## 3. Prestige Q1 and Q3 (together)

Tool: `tools/mentor-survey/build-prestige-q1q3-content.mjs` (parsers `prestige-q1-parse.mjs`, `prestige-q3-parse.mjs`). It handles five answer-row layouts, eight Q1 id formats and the Q3 bold-line, table and list answer layouts. It is deterministic and class-scoped.

| Check | Result |
|---|---|
| Q1 rows parsed | 1,293 (1,238 distinct ids) |
| Q3 scenes / answers / route assignments | 160 / 800 / 1,293 (five answers per scene, A-E) |
| Route assignments joined by exact class-scoped id | **1,293 / 1,293** |
| Unmatched route ids | 0 |
| Duplicate or conflicting rows inside a class | 0 / 0 |
| Orphan Q1 rows (no route reaches them) | 0 |
| Route used by two scenes in one class | 0 |
| Declared route counts equal parsed counts | all 160 |
| Per-class counts equal the Q3 roster table | 32 / 32 |
| Ids reused across classes (class-scoped, not merged) | **23** (listed individually in the import report) |
| Marker-quarantined Q1 rows (never offered, even in preview) | **35** |
| Not first person / unparseable | 0 / 0 |

Authoritative ids are preserved exactly in `sourceId`. Runtime ids are lowercase and class-namespaced because the source reuses ids across classes (the first pass of the importer wrongly merged them). Q3 answer ids are derived (`<sceneId>-<letter>`): the committed source has none.

Not imported by design: candidate bias keys, ontology topics, developer interpretations and printed-development notes (answer-to-tag material). The tag boundary stays inert.

Runtime behavior: Q1 browses all offerable answers in source order, eight per page, with no ranking or relevance claim and no slate (`MSV-RD-005`, `-013`). Q3 shows the one scene whose exact route list contains the chosen Q1 answer; skipping Q1 leaves Q3 unaskable; changing Q1 invalidates Q3 without silent replacement. Q3 grants nothing. No Q1 opening or question candidate is chosen for players (`MSV-RD-012`); the GM-only preview shows the first candidate in source order.

## 4. Prestige Q2 audit (`11-PRESTIGE-Q2-AUDIT.md`)

The source is a contract plus Mentor introductions, questions, route inventories and 110 hypothetical six-answer fixtures (595 A-F rows, 75 distinct canonical keys). It says it is not 1,293 personalized answer sets and that production readiness cannot be declared. **No class has complete usable material; every class has a Mentor introduction and question to build from, and every class needs editorial answer content.** Nothing was invented or padded. The source's "P0 public observed-strength interface" blocker is answered in code. Authoring path and sign-off: `MSV-RD-014`.

## 5. Prestige Q6

The 32-class package is not in Git. It was not reconstructed and no generic dialogue replaced established Mentor personalities. The shared reflection engine is ready and tested for it.

## 6. Release gate (unchanged and tested)

- Every scope remains `withheld`; all new text is `draft_text`; players see nothing.
- Auto-skipped questions do not complete a survey: the finalizer-written completion event now carries `coverage {complete, questions, unavailable}`. A prestige run that skips Q2 and Q6 commits as `complete: false` with both listed (test `PR-16`).
- Preview events stay marked and excluded from every reader; quarantined or `presentsMechanic` rows are never offered; no status was raised without approval evidence.

## 7. Clean-break consumer audit

`12-CLEAN-BREAK-CONSUMER-REPORT.md`: all reads of `mentorBuildIntentBiases`, `surveyResponses` and the legacy `survey` intent shapes deleted (10 files); one unreferenced hard-coded helper removed with its survey-driven branch; the active meanings of the `survey` draft key classified; a producer-less `mentorBiases` channel classified and deferred.

## 8. Tests

| Check | Result |
|---|---|
| Survey suites | **194 tests in 17 files, all passing** (new: `prestige-q1q3` 12, `clean-break` 4; updated `step` and `prestige`) |
| Full repository suite (`node --test tests/*.test.mjs`) | **2,337 tests = 2,324 pass + 5 fail + 8 skipped; 0 cancelled, 0 todo** |
| The 5 failures | `force-power-final-integration`, `phase3-force-power-corrections`, `phase4-force-modifier-automation`, `phase5-force-healing-mitigation`, `phase6-force-direct-damage`: identical on a clean `origin/main`, not caused by this branch |
| 8 skips | declared by existing tests, none in the survey suites |
| Validators | `system.json` valid; partial validator passes; data validator passes; progression-integrity findings 47 |

## 9. Blockers by category

See `06-CONTENT-STATUS-AND-BLOCKERS.md` section 11 (missing source / source exists but not imported / approval pending / mechanical certification pending / runtime integration pending). New register entries: `MSV-RD-011` to `MSV-RD-014`.

## 10. Not done, and why

- No survey is player-visible; nothing was run in Foundry v13.
- Multiclass Q2 stays skipped (owner phrases and E/F); Prestige Q2 and Q6 stay skipped (editorial content and a missing package).
- Per-route quarantine flags kept only in an uncommitted JSON cannot be detected.
- Producer-less `mentorBiases` channel not deleted (scoring-module change).
