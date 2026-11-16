# Foundation-Class Multiclass Mentor Survey — Implementation Specification

**Source authority:** multiclass rolling design v0.11 (`eb531a6b0`), shared v0.9 §9/§13. IDs `MC-nn`.

## 1. Trigger and routing (MC-01 … MC-04)

* Triggers on the **first acquisition of a new foundation class** (Jedi, Noble, Scoundrel, Scout, Soldier) at level-up. A further level in an already-held foundation class never triggers it. Prestige classes never trigger it.
* The **destination class's** Mentor narrates (Miraj, J0-N1, Ol' Salty, Lead, Breach). The origin class's Mentor never narrates.
* 20 directed (origin → destination) transitions: every ordered pair of distinct foundation classes. The Q1/Q2 banks are authored for exactly one origin class. **When the character already holds two or more other foundation classes, the sources do not say which origin class keys Q1.** This is a design ruling, not an engineering choice: it is registered as `MSV-RD-004` (`DEFERRED_RULES_REVIEW`) and the survey is **withheld (skipped, fail-closed)** for such characters until the owner rules. Exactly-one-prior-foundation-class characters (the 20 authored transitions) are fully supported (MC-04).

## 2. Questions

| Q | Name | Keyed by | Content |
|---|---|---|---|
| Q1 | Class Discovery | (origin, destination) | 5 first-person capability answers + neutral; 100 substantive (20 × 5). Discovery, not an election and not a commitment |
| Q2 | Build Integration | destination + current build evidence | First-person answers connecting Q1 to **verified current strengths**. Past-tense claims only from the evidence projection. 125 authored per destination (625). Selection reads the existing Suggestion Engine's top four mechanical biases (read only; no new scorer) |
| Q3 | Commitment | fixed | 4 fixed answers: `dip`, `dive`, `swim`, `undecided` (owner-approved text). **`bridge` is a purpose, never a depth** |
| Q4 | Applied Scenario | exact Q1 `responseId` → capability family → scenario | 36 families, 250 authored scenarios; 5 first-person methods + neutral "I'm not sure" (non-scoring) |
| Q5 | Next Milestone | destination + Q1 route + goal context | 5 milestone purposes (`develop_core`, `field_application`, `benefit_others`, `career_continuity`, `prepare_future_route`) + `undecided`; 500 proposed templates |
| Q6 | Mentor's Reflection | shared engine | A–E calibration; Pass A (170 clause variants), Pass B (corrections) |

Mentor fixed introductions precede Q1–Q6 and are never generated (MC-05).

## 3. Rules

* **Q3 depth** (MC-06 … MC-09): same four IDs and meanings for all transitions; no level quotas; never an illegal level lock; `undecided` infers no Dip/rejection; Dive/Swim never demote prior classes, erase a declared goal, or prune acquired evidence; no `prestigeWeight/oldIdentityRetention` arithmetic. Bridge is separate: a Dip/Dive/Swim may be taken *for* a Bridge purpose toward an explicitly declared goal; that purpose is recorded as a separate field only when the player declares it.
* **Q4** (MC-10): scene selection depends on the exact Q1 answer; Q3 depth and Q2 flavor never change the scene; the neutral reply records nothing. Method tags are unassigned (tag boundary).
* **Q5** (MC-11): `career_continuity` is only offered with a text that references a declared goal when one exists; if none exists, the authored exploration alternative is shown. A selection suggesting a career change records `exploring_change` only; a separate affirmative event is required to change a declared goal.
* **Evidence** (MC-12): Q2/Q6 observations come exclusively from the actor evidence projection of *finalized* state; the new class being acquired in this very advancement is **pending** and must not be narrated as owned.
* **Commit** (MC-13): nothing persists until the level-up finalizer succeeds; cancel/fail leaves no event.
* **Q6** (MC-14): shared engine; multiclass framing is incremental development; opening/closing text is the destination Mentor's.

## 4. Content status

Owner-approved text: Q3 four answers and detail rails. Owner-approved architecture: Q1 discovery framing, Q2 top-four contract, Q4 scenario architecture. Everything else (intros, Q1 variants, 625 Q2, 250 Q4, Q5, Q6 libraries) is `draft_text` (see `06`). Q5 design itself is a *proposal*, not owner-approved (MSV-RD-003).

## 5. As built (D2)

Q1, Q3, Q4, Q5 are implemented; Q2 and Q6 are source-blocked (`MSV-RD-007`, Q6 import pending) and are skipped. Q4 scene choice within a family is a stable seeded pick (design: "stable, reproducible order using survey-instance seed"). Q4/Q5 are skipped for an undecided Q1 (`MSV-RD-008`); the Q5 career-continuity template is withheld (`MSV-RD-009`). Q3 depth is recorded as a typed field `typed.declaredClassInvestmentDepth` (`undecided` records null); no multiclass answer declares a goal. Details and the manual acceptance procedure: `06-CONTENT-STATUS-AND-BLOCKERS.md` §8.
