# Level 1 Adaptive Mentor Survey — Implementation Specification

**Source authority:** L1 rolling design v0.19 (`ff7f605a3`), with the precedence order in `00-AUTHORITY-INDEX.md` §3. Requirement IDs `L1-nn`.

## 1. Purpose and boundaries (L1-01)

Optional, five-question, KOTOR-style career-mentor interview during character creation after the foundation class is chosen. It declares what the player wants to *become*. It is not an optimization quiz, morality test, placement exam, prestige survey, or gate on legal options. Skipping the survey, or any question, forfeits nothing. **Exactly five questions; no sixth question is authorized (L1-02).**

Starting classes and Mentors (L1-03, preserved from the registry): Jedi: Miraj · Noble: J0-N1 · Scoundrel: Ol' Salty · Scout: Lead · Soldier: Breach.

## 2. Context inputs (read from pending chargen session, not only the actor) (L1-04)

selected class, pending species (for exact `mechanics.species.required` legality), current attribute draft, prior survey answers. The survey must consume the progression session's pending selections.

## 3. Question sequence

| Q | Name | Keyed by | Options | Records on commit |
|---|---|---|---|---|
| Q1 | Class Development | starting class | 5 first-person directions + 1 neutral "not sure yet" (30 authored, 6/class) | `responseId` (declared immediate interest) |
| Q2 | Career Calling | canonical parent archetype | 5 first-person career aspirations per page (A–E) + F "other possibilities" (navigation only) | exact canonical `parentId` aspiration, only when an option is selected |
| Q3 | First Career Situation (class situation) | class + exact Q1 `responseId` | 1 scenario (30 authored: 5 routes + `undecided` per class), 5 first-person replies | `responseId` |
| Q4 | Second Career Situation (parent-career situation) | exact Q2 `parentId` only | 1 scenario (97 authored), 5 first-person replies per page; child-specialization replies = aspiration toward exact child ID; method replies record only the method response | `responseId` (+ exact child ID when a child reply is chosen) |
| Q5 | Long-Term Ambition | starting class | 5 first-person ambitions (25 authored) | `responseId` |

Mentor fixed stage introductions (25 authored; 5/Mentor) precede each question. They are static, do not react to prior answers, and are never replaced by generated dialogue (L1-05).

**Naming note (conflict C-01):** the directive labels Q3/Q4 "First/Second Career Situation". The locked v0.18 design defines Q3 as class-situation (Q1-keyed) and Q4 as parent-career-situation (Q2-keyed). The behavioral invariants of the directive (distinct challenges; Q3 never replaces Q2 or Q4) hold under v0.18 and are implemented. Display titles are not player-visible. The naming difference is recorded for owner confirmation; no behavior depends on it.

## 4. Q2 career paging (approved v0.12 §12) (L1-06 … L1-10)

* One deterministic ranked list of all 97 canonical parents; `seenParentIds` set and stable snapshot cursor per context revision.
* A/B: two class-relevant careers, preferentially from the class's four anchors (20 anchors, fixed by §12.1; IDs validated against `ArchetypeRegistry`: kind `parent`, class route present). C/D/E: next three remaining by rank. F: next five never-shown; no repeats on any page; last page may be short; never loops.
* Browsing, paging, reading and "none of these" create **zero** intent (L1-08). Only a selected option records a parent aspiration. Selecting nothing is a valid neutral outcome.
* Ranking coefficients are **not approved** (decision register `MSV-RD-001`). The implemented order is purely canonical and documented: class-anchor preference for A/B, then stable canonical ID order. It uses no invented weights and claims no relevance. When the owner approves a ranker, it replaces the ordering function only.

## 5. Q3/Q4 rules (L1-11 … L1-14)

* Q3 scenario: lookup by (class, Q1 `responseId`); Q1 `undecided` has its own authored route.
* Q4 scenario: lookup by exact Q2 `parentId`; **Q3's answer never changes the Q4 scenario or parent**. Changing Q2 invalidates Q4 (not silently replaced). If Q2 was skipped Q4 is skippable and invents no career.
* Q4 answer composition (v0.18 §Locked 3): zero applicable children → five tag-method replies; 1–4 → all children + method backfill to five; exactly 5 → five children; >5 → first five by **stable canonical ID order** (tag-based Q3-driven personalization is blocked, see MSV-RD-002), remainder on "Show me other approaches" pages, five at a time, no repeated IDs.
* Child applicability: only independently certified restriction `mechanics.species.required` vs pending species. Uncertified droid/cultural/faction/Force gates are NOT used to exclude anything.
* Recording: child reply → aspiration to that child ID; method reply → method `responseId` only, never an inferred child ID. No answer grants identity, permissions, feats, talents or prestige eligibility.

## 6. Lifecycle (L1-15)

Optional, skippable at any question, cancelable, back-navigable, revisitable; Q1/class/species change invalidates dependents without silent replacement; deterministic; duplicate-submit safe; commits only through the finalizer ledger.

## 7. Content status (see `06`) 

Wording status per family is tracked in the content packs and `06`. Items owner-approved at the time of writing: Jedi Q1 six answers; J0-N1's five intros; first 25 Q2 universal answers ("endorsed examples"); the player-response display contract. Everything else is `draft_text`. **P0 gate:** Q3 150-response certification against the 190-tag ontology is out of scope (tag-mapping boundary).
