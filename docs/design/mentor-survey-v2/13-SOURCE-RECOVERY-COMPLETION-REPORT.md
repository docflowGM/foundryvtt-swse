# Source Recovery and Full-Question Completion Report

**Branch:** `refactor/mentor-surveys-v2-cutover` (never merged to `main`; draft PR #1151). **Date:** 2026-11-16.
**Foundry v13 certification is not claimed.** No live Foundry session was available; every result is offline. Nothing is player-visible: every scope is `withheld` and all new text is `draft_text`.

## 1. Current state by survey and question

| Survey | Q | State | Notes |
|---|---|---|---|
| Level 1 | Q1-Q5 | implemented, 1,375 selectable answers | draft except Jedi Q1 and J0-N1 intros |
| Multiclass | Q0 (origin lens) | implemented | only when two or more foundation classes are owned (MSV-RD-004) |
| Multiclass | Q1 | 20 banks, 120 answers | draft |
| Multiclass | Q2 | 625 templates, 100 drafted `q1_focus` phrases, approved neutral focus and E/F | A-D need actor provenance; zero evidence still offers E/F |
| Multiclass | Q3 | 4 approved depth answers | approved |
| Multiclass | Q4 | 250 scenarios (1,250 methods + 250 neutral); curated neutral families with presumption scan | draft; neutral families pending editorial review |
| Multiclass | Q5 | 500 templates + 25 undecided-Q1 responses + 5 no-goal replacements + 1 reviewed goal-reference alternative | draft |
| Multiclass | Q6 | shared Mentor's Reflection, five Mentor frames, 170 Pass A variants, Pass B corrections | answer B owner-approved |
| Prestige | Q1 | 1,293 answers, 32 banks; 48 opening and 32 question candidates; provisional defaults | six substantive per page plus neutral; quarantined rows never offered |
| Prestige | Q2 | shared stems + 32 reviewed connective sentences + E/F + Q1 quote lens | all draft |
| Prestige | Q3 | 160 scenes, 800 answers, 1,293 routes validated | draft |
| Prestige | Q4, Q5 | 4 depth answers, 224 purposes | Ace Pilot approved |
| Prestige | **Q6** | **the same shared Mentor's Reflection as Multiclass Q6**, with the milestone line and a neutral, unattributed frame | class-specific Mentor dialogue is an optional enhancement (not in Git) |

## 2. One Q6

Multiclass Q6 and Prestige Q6 are one component (`resolvers/reflection-q6.js`, `reflection.js`, `reflection-q6.json`): one reading, one A-E contract, one B/C targeted correction, one D/E NOT then AM system, one 297-archetype authority, one ledger. They differ only in `surveyKind`, class, Mentor and milestone. Prestige uses a neutral frame in `reflection-q6.json` (`neutral`), attributed to no established Mentor; the authored 32-class dialogue, when committed, goes in the reserved `prestigeMentors[classId]` slot and takes precedence per class. Nothing was reconstructed. The same component is what an on-demand "ask a Mentor to reassess me" conversation would call; only the trigger and presentation would change. Tests: `tests/mentor-survey-shared-q6.test.mjs` (identical evidence gives identical reading and routing in both surveys).

## 3. Imported counts and traceability

| Pack | Content |
|---|---|
| `l1.json` | 1,375 selectable, 97 reference, 2 navigation |
| `multiclass.json` | Q1 120, Q3 4, Q4 1,500, Q5 500 + 25 + 5 + 1, 5 curated neutral Q4 families, origin lens |
| `multiclass-q2.json` | 625 templates, 100 `q1_focus` drafts, neutral focus, E/F |
| `reflection-q6.json` | shared Q6 libraries (170 clauses, 20 negatives, 297 identities, 18 free statements, 5 A-E) + neutral frame |
| `prestige.json` | Q4 4 + 128 rails, Q5 224 + 32 + 32 |
| `prestige-q1q3.json` | Q1 1,293, Q3 800 in 160 scenes |
| `prestige-q2.json` | 125 shared stems, 32 class records |

Every record carries `sourceRef`. Per-class Prestige counts: `10-PRESTIGE-Q1-Q3-IMPORT-REPORT.md`. Answer-ID ledger against the master tag mapping: `15-ANSWER-ID-LEDGER.md` (all 4,894 master rows for Multiclass and Prestige match a V2 id by deterministic transform and exact text; no tag adopted). Opening selection review: `14-*`. Prestige Q2 audit: `11-*`. Clean-break consumers: `12-*`.

## 4. Post-ruling hardening (2026-11-16)

- Actor-evidence provenance fails closed (exact item and skill ids; always-active specific rules only; no default mapping, conditional, disabled or ability-only claims; snapshot reference). A pre-existing `const` reassignment in `IdentityEngine #processPrimitive` that made the observed accessor throw for any actor with a conditional rule was fixed.
- Multiclass Q5 shows a typed goal display (canonical label or the player's exact words, lane priority, superseded and preview goals excluded) in one reviewed alternative, else the authored no-goal replacement.
- Prestige Q2 now carries the player's Q1 words as a quoted lens and is invalidated when Q1 changes; its 32 connectives were rewritten as prospective ways of working.
- Six neutral Prestige Q1 ids approved (classification only).
- Q1 browse has a previous-page control.

## 5. Tests

See the final verification block in the commit message of the last commit; the 5 failing force-power tests fail identically on a clean `main`.

## 6. Blockers by category

`06-CONTENT-STATUS-AND-BLOCKERS.md` section 11.

## 7. History (first milestone, superseded where it conflicts with the above)

The first recovery milestone imported Multiclass Q2 and Q6 and Prestige Q1 and Q3, audited Prestige Q2, and removed the legacy consumers. At that point Prestige Q2 and Q6 were skipped as source-blocked and Multiclass Q2 offered no answers for lack of `q1_focus` phrases. The owner rulings and hardening above replaced those states.
