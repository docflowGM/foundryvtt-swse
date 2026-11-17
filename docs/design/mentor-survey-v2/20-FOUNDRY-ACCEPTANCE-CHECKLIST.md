# Foundry v13 Acceptance Checklist (GM editorial preview)

**Status: NOT PERFORMED.** No Foundry session was available during implementation; every result so far is offline. This is the procedure for the first live pass. All scopes stay `withheld`; run everything through the GM-only, default-off editorial preview setting (`mentorSurveyEditorialPreview`). Record each result as PASS, FAIL or NOT RUN with a note; do not mark a survey certified until every section passes.

## 0. Setup
1. v13 world with the system loaded from this branch (draft PR #1151). Console open; note any template, registry or fetch errors on load (content packs, release manifest, primitive-bias registries).
2. Enable the preview setting as GM. Confirm a non-GM player sees "not available, optional" for every survey.
3. Test actors: (a) a fresh level-1 character; (b) a Noble with one Soldier level; (c) a character with two foundation classes; (d) a character able to take a prestige class (e.g. Ace Pilot, Jedi Knight); (e) an actor with at least two certified talents/feats and a trained skill that map to the same method key (for Q2/Q6 evidence); (f) an actor with items that have no canonical id.

## 1. Level 1 (Q1 to Q5)
Each class (Jedi, Noble, Scoundrel, Scout, Soldier): questions render, Q2/Q4 "other possibilities" paging works, back/skip/skip-survey/cancel behave, no tag, id or percentage is visible, finish stages a commit but writes nothing to the actor until the progression finalizer runs, then one `mentorSurvey.events` flag entry set exists (preview-marked).

## 2. Multiclass
1. Single prior class: Q1 bank for that origin; Q2 shows only evidence-backed A-D plus E and F (actor (e) shows strengths, actor (b) only E and F); Q3 depth; Q4 scene by Q1 (an undecided Q1 uses the neutral family); Q5 career-continuity option shows the no-goal replacement, or the goal-reference sentence when a goal is declared; Q6 is the shared reflection with the destination Mentor.
2. Two prior classes: the origin lens appears first, is not numbered, and changes the Q1 bank; changing it invalidates Q1.
3. Q6: A is a no-op; B and C correct; D and E show NOT then AM; AM cannot precede NOT.

## 3. Prestige
1. Q1: six answers plus the neutral answer per page; "Show more answers" and "Show earlier answers" work; a quarantined row never appears; the chosen answer drives the Q3 scene.
2. Q2: the player's Q1 words are quoted; neutral or skipped Q1 gives no quote; E and F always present; changing Q1 invalidates Q2.
3. Q3 scene matches the Q1 route; Q4 depth; Q5 purposes and optional second purpose.
4. Q6 uses the neutral frame: header reads "Reflection", **no Mentor name, portrait or scan overlay, no Mentor-keyed Aurebesh text**; Q1 to Q5 keep the normal Mentor presentation.
5. Two different prestige classes at different levels keep separate drafts.

## 4. Persistence and transactions
- Cancel or leave the progression without finalizing: no event on the actor.
- Finalize: one completion event set with `coverage.complete` true only when every question was asked or legitimately not applicable; preview events are marked and ignored by recommendation readers.
- Replay or retake: no duplicate events; a retake supersedes. A rejected method claim does not reappear on unchanged evidence, and an unrelated new feat does not bring it back.
- Rendering: long single-select pages scroll, the multi-select NOT/AM stage toggles and submits, the "About: <phrase>" detail shows under method corrections.

## 5. Evidence checks
Confirm the printed Q6 reading only names owned facts; the method line appears only with two independent certified sources; actor (f) never produces a method line.

## 6. Record
List defects with the survey, question id, actor and console output. Anything that affects wording goes to the editorial register, not the code.
