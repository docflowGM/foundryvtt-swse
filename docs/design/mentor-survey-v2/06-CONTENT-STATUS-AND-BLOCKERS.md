# Content Status, Conflicts, Missing Artifacts and Blockers

Updated per phase. Evidence date 2026-11-15. "Approved" means the upstream documents record explicit owner approval of that wording; a drafting pass is never approval.

## 1. Content families and approval state

### Level 1 (source v0.19)

| Family | Count | Editorial status | Mechanical status |
|---|---:|---|---|
| Mentor stage intros (Q1–Q5 × 5 Mentors) | 25 | J0-N1 ×5 approved (earlier context; Q3 lines flagged for rewrite); other 20 draft | n/a |
| Q1 class-development answers | 30 (6/class) | Jedi ×6 **approved**; 24 draft | mappings uncertified |
| Q2 universal career answers | 97 | first 25 endorsed examples; 72 draft | n/a |
| Q2 class-specific career variants | 485 | draft | n/a |
| Q2 class anchors (20) | 20 | approved layout | IDs verified vs `data/archetypes.json` in tests |
| Q3 class situations / replies | 30 / 150 | draft | `editorialFocus` untrusted; P0 gate (blocked) |
| Q4 parent situations / child replies / method backfills | 97 / 200 / 485 | draft (architecture **locked**) | tags unassigned |
| Q5 long-term ambition | 25 | draft (Noble prototype liked) | tags unassigned |
| Player-response display contract | — | **approved** | — |

### Multiclass (source v0.11)

| Family | Count | Editorial status |
|---|---:|---|
| Mentor transition intros | 18 | draft ("owner-approved lines: none yet") |
| Q1 origin-keyed discovery answers | 100 (+ neutral) | draft |
| Q2 mechanical-bias × destination answers | 625 | draft |
| Q3 depth (`dip/dive/swim/undecided`) + detail rails | 4 | **approved** |
| Q4 scenarios | 250 (1,250 methods + 250 neutral) | architecture approved; text draft; 36 families mapped to all 100 Q1 routes |
| Q5 milestone templates | 500 proposed | **proposal only**, not approved |
| Q6 Pass A clause variants / Pass B corrections | 170 / library | draft (authoring complete) |

### Prestige (source v0.26 / Q2 v0.8 / Q3 v0.1 / Q4 / Q5 / Q6 handoff)

| Family | Count | Editorial status |
|---|---:|---|
| Q1 class-discovery libraries | 32 classes, 1,293 route IDs | draft; slate policy unapproved |
| Q2 synthesis | 32 classes | direction endorsed; prose not approved |
| Q3 scenarios / options | 160 / 800 | Ace Pilot approved; 31 classes draft |
| Q4 depth intros + 4 shared answers | 32 | shared 4-answer pattern **approved**; Ace Pilot/Mayu approved; 31 draft |
| Q5 purposes | 224 options, 64 intros, 32 secondary | architecture approved; Ace Pilot's 7 lines accepted; 31 classes draft |
| **Q6 prestige-specific dialogue** | 0 in Git | **Not in Git** (see §3); owner to supply, never reconstructed |

## 2. Spec conflicts and their disposition

| ID | Conflict | Disposition |
|---|---|---|
| C-01 | Directive labels L1 Q3/Q4 "First/Second Career Situation"; locked v0.18 defines Q3 = class situation (Q1-keyed), Q4 = parent-career situation (Q2-keyed) | Follow locked v0.18 (consistent with every behavioral invariant in the directive). Naming is not player-visible. Flagged for owner confirmation only |
| C-02 | Prestige v0.26 §39.1(2) says Q2 "teaches and validates newly available class abilities"; Q2 v0.8 + directive say Q2 synthesizes verified existing strengths and must not repeat Q1 class-feature education | **Resolved by the directive** (explicit owner instruction): Q2 = synthesis of verified existing strengths. §39.1(2) superseded |
| C-03 | Prestige §1–7 retrospective Q1 vs §8 class-discovery Q1 | Resolved by §8/§39.1 (documented owner direction) |
| C-04 | Multiclass Q2: "125 bias × class" vs earlier sizing proposals | Later "top-four existing-scores contract" + 625 library prevails |
| C-05 | Multiclass Q4 counts 36 → 150–250 | 250 prevails; the companion JSON is not committed (see §3) |

## 3. Missing source artifacts

| Artifact | Needed for | Finding |
|---|---|---|
| Prestige Q6 dialogue package (32 Mentors; openings, closings, conditional branches, A–E, NOT/AM text) | PR-11 | Searched every remote branch: the package is **not in Git**. Only `SWSE_Prestige_Q6_Fresh_Chat_Handoff_2026-11-15.md` exists, and it lists Q6 as the next task. That shows the package is missing from the repository, not that it was never written. **Source-artifact integration dependency**: the owner must commit it; it is not reconstructed |
| `SWSE_Q4_250_Scenario_Library_LOCAL.json` | MC Q4 machine-readable catalog | Not committed anywhere. The 250 scenarios exist in the committed markdown (`SWSE_Multiclass_Survey_Rolling_Design.md`, lines 2178–5987); the build tool parses the markdown |
| `SWSE_L1_Q2_Class_Specific_Career_Responses_Combined_97x5_v0.4….json` | L1 Q2 | Not committed. The markdown companion is committed and parsed |
| `SWSE_Q6_Archetype_Identity_Index_LOCAL.tsv` | MC Q6 Pass A | Local-only; replaced at runtime by `ArchetypeRegistry` (the cited authority) |
| L1 Q3 certified response→tag map (P0) | L1 Q4 personalization | Does not exist; out of scope (tag boundary) |

## 4. Rules / design decisions required from the owner

Registered in `docs/audits/swse-rules-decisions-pending.md` under `MSV-RD-###`.

## 5. Phase B: canonical mechanical and Mentor certification (verified against `main` @ `8efa6808a`)

Printed-rule verification limit: `reference/sourcebooks/*.txt` are OCR exports, and the README makes the PDFs the final authority. The PDFs are not in the repository and the OCR for the relevant Charlatan page is unreadable, so printed tree access **could not be independently confirmed here**. Unverified mechanics fail closed.

| Review target | Finding on current `main` | Disposition |
|---|---|---|
| Kharjo missing from Mentor registry | **Confirmed.** `data/dialogue/mentor_registry.json` had 31 entries (ids `m01`…`m30`, `m32`; `m31` unused). `data/dialogue/mentors/kharjo/` exists | **Fixed**: `kharjo` / `m31` / "Blade Master Kharjo" added. Test: `mentor-survey-canonical-authority` |
| All 37 classes → Mentor | `MENTOR_PERSONALITIES[class].key` agrees with the owner roster for all 5 foundation + 32 prestige classes | **Verified**; routing table `data/mentor-survey/class-mentor-routes.json` is test-locked against registry and personalities. Lead (Scout, Pathfinder), Miraj (Jedi, Knight, Master), Delta (Infiltrator, Assassin), Breach (Soldier, Elite Trooper) are shared Mentors |
| Assassin GenoHaradan | **Confirmed defect.** `talent_trees` holds the display text `GenoHaradan`; `talentTreeSourceIds` holds the correct id `da7b731a3e434a7a` | **Not edited**: `packs/classes.db` is a frozen protected baseline (`tests/class-pack-protected-guard.test.mjs`, 37 records). Surveys read `talentTreeSourceIds` only. Owner of fix: protected-baseline process |
| Infiltrator Bothan SpyNet | **Confirmed defect.** Raw `Bothan SpyNet`; correct id `d20682671d035cef` | Same as above |
| Independent Droid tree identity | **Confirmed defect.** `talentTreeUuids[0]` uses a dashed uuid (`…9fe73a37-03fa-45fc-a628-fd43cae6bf7f`) that does not equal the tree `_id` (`9fe73a3703fa45fca628fd43cae6bf7f`, the only 32-hex tree id). Also: the pack lists three trees (Autonomy, Specialized Droid, Elite Droid) while `data/fixes/class-talent-tree-bindings.json` lists two | Id defect: same as above. Tree-set disagreement: **`MSV-RD-006`** (needs printed verification) |
| Charlatan Fortune-tree access | Pack and bindings list Disgrace + Trickery only; the `Fortune` tree exists (`cee9b9398682b7d0`) | Printed access unverifiable here: **`MSV-RD-006`**. Fortune-based Charlatan answers stay `unverified_mechanic` |
| Jedi Master / Sith Lord general Force trees | Pack/bindings list Duelist / Sith only | **`MSV-RD-006`**; general-Force-tree answers quarantined |
| Sith Dark Side Score | Already ruled by the project owner: house rule "Dark Side Score at least 1" (`docs/audits/class-phase-6f2-piracy-sith-adjudication.md`); ongoing class-feature suspension is open finding 6B-010 | Not re-decided. Surveys never narrate Sith eligibility or DSS thresholds |
| Gunslinger / Outlaw / martial-arts source identity (Teräs Käsi, Pistoleer titles, Fringer/Virus) | Design record marks them QUARANTINE (unreliable rule identity) | Content records referencing them are `unverified_mechanic`; never offered as mechanics-driven options |
| `scripts/engine/mentor/validate-mentor-dialogue.js` | Pre-existing: crashes on a wrong repo-root path and, if fixed, expects a flat per-mentor file layout the repo no longer uses | **Not touched** (stale legacy tool, unrelated to survey authorities) |

### Independent tree-access audit (ingested 2026-11-16)

Branch `audit/prestige-cross-class-tree-access-20261115` @ `76962662b` verifies the three tree-access findings above against the printed books (Charlatan Fortune omission; Jedi Master/Sith Lord/Force Disciple Force-tree alternatives; Independent Droid Elite Droid and positional id misalignment; Assassin/Infiltrator raw strings). Recorded as a progress note on `MSV-RD-006`. It is documentation for the protected class-pack owner; nothing here edits `packs/classes.db`, and prestige content that depends on those trees stays `unverified_mechanic`. Note for the class authority: the survey reads class trees through no field at all, so the Independent Droid positional misalignment cannot affect it.

## 6. Phase C: shared infrastructure (landed, not yet wired to the progression shell)

New pure modules in `scripts/mentor/mentor-survey-v2/` (renamed over the legacy directory at the D-phase cutover): `contract`, `content-store`, `survey-session`, `intent-ledger`, `actor-evidence`, `reflection`, `tag-boundary`. 56 offline tests (`tests/mentor-survey-*.test.mjs`). These prove engine behavior only; none is a Foundry runtime test.

## 7. Phase D1: Level 1 cutover

**Code status: wired and offline-tested. Not Foundry-tested. Not player-visible** (every L1 scope is `withheld`, and all L1 text except a few lines is `draft_text`).

Content inventory (corrected labeling): **1,375 selectable answers** (Q1 30, Q2 485, Q3 150, Q4 200 child + 485 method, Q5 25), **97 Q2 universal reference texts** (never offered), **2 navigation controls**, 25 Mentor intros, 30 Q3 and 97 Q4 situations. Validated separately; all 1,375 selectable records pass the first-person and no-leak validators.

Wiring: `MentorSurveyStep` registered for `l1-survey` (chargen shell and node mapper); node `selectionKey` is `mentorSurvey`; `ProgressionSession` carries the single `mentorSurvey` draft key; `ProgressionFinalizer` writes the survey ledger inside its atomic `set` map (`buildSurveyLedgerPatch`), with the transaction id taken from the session and the level from the chargen starting level. Draft and staged-commit records live only in the session. The legacy L1 step, the five `L1_*` definitions and the legacy `injectSurveyBias`/`clearSurveyBias` are removed.

What is **still reachable (legacy)**: the multiclass `BaseClassSurveyStep` (now extending `LegacyClassSurveyStepBase`, the former L1 step file, kept only for it), the legacy prestige step and its definitions, and these legacy readers/writers of retired stores: `system.swse.surveyResponses`, `classSurveyIntentBiases`, `prestigeSurveyResponses`, `mentorBuildIntentBiases` (finalizer legacy blocks; Suggestion Engine readers that default to `{}`). They go with the multiclass and prestige cutovers. Also untouched: the template-build path (`template-adapter`) that pre-fills the overloaded `survey` selection, and `galactic-profile-step`/`summary-step`, which legitimately store `startingLevel` in that same `survey` key.

Deterministic ordering notice (MSV-RD-001/002): where tag-driven ranking is unfinished, Q2 pages use anchor order then canonical ID order, and Q4 uses canonical child ID order then authored method order. This is **neutral presentation, not personalization, relevance or optimization**, and is not described to players as such.

### Manual Foundry v13 acceptance procedure (not yet performed)

1. World setting "Mentor Surveys: Editorial Preview (GM only)" exists, is off by default, and is editable only by a GM.
2. As a player with it off: create a character through the class step. The survey step shows the "not available / optional" message and Next works. No old questionnaire appears.
3. As a GM, turn the setting on. Each of the five classes shows five questions with the correct Mentor line and the "EDITORIAL PREVIEW" label; options are first person and show no ids, tags or scores.
4. Q2: "other possibilities" pages through all 97 careers without repeats; paging alone does not enable Finish.
5. Skip a question, skip the interview, go Previous, change an earlier answer (dependent answers show the stale notice and are not auto-replaced), double-click an option (one answer only), Start over.
6. Finish the interview, then **cancel** character creation: confirm the actor has no `flags.foundryvtt-swse.mentorSurvey`.
7. Finish creation: confirm `flags.foundryvtt-swse.mentorSurvey.events` has one `survey_completed` event (`provenance.preview: true`, `actorLevel: 1`) plus goal events for the selected career, and that suggestions are unchanged.
8. Repeat with the setting off: with no preview and withheld content no event can be created.
9. Re-run level-up and a retake path only after multiclass is cut over.

## 8. Phase D2: Multiclass cutover

**Code status: wired and offline-tested; legacy removed. Not Foundry-tested. Not player-visible** (all five destinations are `withheld`; all text except the four Q3 depth answers is `draft_text`).

Built: one generic `SurveyController` with per-survey adapters (L1 and multiclass), `resolvers/multiclass.js` (trigger, 20 directed transitions, Q1/Q3/Q4/Q5), `MulticlassSurveyStep` registered for `base-class-survey`, activation in `ActiveStepComputer` driven by the same trigger (finalized class levels, first acquisition only, exactly one prior foundation class, released-or-GM-preview), and one session key (`mentorSurvey`). Content imported verbatim: 20 Q1 banks (120 answers), 20 Q1 transition intros, 15 fixed Q3-Q5 intros, 4 approved Q3 depth answers with detail rails, 250 Q4 scenarios (1,250 methods + 250 neutral) with the 100-route family map, 500 Q5 templates (each cross-checked against its Q1 answer).

**Blocked at the source (skipped, never invented):**
- **Q2** (`MSV-RD-007`): no certified `q1_focus` phrases, no authored E/F answers, unverified top-four scores accessor.
- **Q6**: the Q6 libraries are not imported and no verified identity-claim source exists. The shared reflection engine is built and tested but not connected.
- **Q4/Q5 for an undecided Q1** (`MSV-RD-008`).
- **Q5 career-continuity template** (`MSV-RD-009`).
- **Two or more prior foundation classes** (`MSV-RD-004`): withheld.
So the V2 multiclass survey currently offers Q1, Q3, Q4 and Q5 only; it is **not** the full six-question design and must not be released until Q2/Q6 are supplied.

Removed: `BaseClassSurveyStep`, `LegacyClassSurveyStepBase` (the former L1 step), `base-class-survey-definitions.js`, the `classSurveys`/`classSurveyDrafts` session keys, the finalizer's `classSurveyResponses`/`classSurveyBias`/`classSurveyIntentBiases` writes, and their readers in the suggestion context builder, forecast adapter and signals normalizer.

### Manual Foundry v13 acceptance procedure for multiclass (not yet performed)

1. As a GM with the preview setting on, level a Noble to a first Soldier level: the "New Class Survey" step appears; Breach narrates (not J0-N1); Q1 shows six first-person answers keyed to Noble -> Soldier.
2. Repeat for several of the 20 transitions. Q2 and Q6 never appear.
3. Q3 shows exactly four depth answers. Choose each and confirm nothing about class levels changes.
4. Q4 shows a scene for the chosen Q1 route; go back, change Q1, and confirm the Q4 answer is flagged stale rather than replaced.
5. Choose "I'm not sure yet" in Q1: Q4 and Q5 are skipped.
6. Take a further level in an already held class: no survey step appears. With two other foundation classes held: no step appears.
7. Finish, then cancel the level-up: no `mentorSurvey` flag on the actor. Finish the level-up: one `survey_completed` event with `scopeId` = destination, `typed.declaredClassInvestmentDepth`, `actorLevel` = the new level, `provenance.preview: true`.
8. With preview off: no step appears for any transition.

## 9. Phase D3: Prestige cutover

**Code status: wired and offline-tested; legacy removed. Not Foundry-tested. Not player-visible** (all 32 prestige scopes are `withheld`; all text is `draft_text` except the shared Q4 depth answers, Ace Pilot's Q4 wording and Ace Pilot's seven Q5 purpose statements).

Built: `resolvers/prestige.js` (trigger: newly acquired prestige class; Q4 depth; Q5 primary purpose and optional second purpose as an inner stage `q5b`), `prestige-controller.js`, `PrestigeSurveyStep` registered for `prestige-survey`, activation in `ActiveStepComputer`, the shared single `mentorSurvey` session key and finalizer path. Content imported verbatim for all 32 classes: 4 shared Q4 depth answers, 32 x (pending and finalized Q4 intro, question, four rails), 32 x (pending and finalized Q5 intro, question, seven purposes, second-purpose prompt, decline line). The level-up survey uses the PENDING introductions (the class is not yet finalized); finalized ones are kept for a later reflection.

**Blocked at the source (skipped, never invented):**
- **Q1** class discovery: banks not imported (varied source formats; the slate policy is unapproved, `MSV-RD-005`).
- **Q2** synthesis: actor-evidence templates not imported; needs approved wording.
- **Q3** scenes: keyed to Q1 route ids, so unavailable without Q1.
- **Q6**: the 32-class Q6 package is **not in Git**; owner to supply, never reconstructed. The shared reflection engine is built and tested but not connected.
- **Another career** (`MSV-RD-010`): records a purpose only; no prestige answer declares a goal.
So the V2 prestige survey currently offers Q4 and Q5 only; it is **not** the six-question design and must not be released until Q1, Q2, Q3 and Q6 are supplied, the slate policy is approved and the owner signs off (rolling design 39.5).

Removed: the legacy `scripts/mentor/mentor-survey/` directory (engine, registry, definition builder, prestige profiles, 38 `PrC_*` definitions, index), the two re-export shims, `PrestigeSurveyStep` (legacy), the legacy L1 work-surface and details templates, the `prestigeSurvey` session key and alias, the finalizer's `prestigeSurveyResponses`/`mentorBuildIntentBiases` writes, and their forecast readers. The weighted-pruning arithmetic (`mergePrestigeBias`, `pruneWeight`, `prestigeWeight`, `oldIdentityRetention`) no longer exists anywhere under `scripts/` (asserted by a test).

### Manual Foundry v13 acceptance procedure for prestige (not yet performed)

1. As a GM with preview on, level a character into Ace Pilot: the "Prestige Survey" step appears; Mayu narrates with the pending-acquisition wording.
2. Q4 shows four first-person depth answers with the class rails; no level quota is mentioned. Q5 shows seven first-person statements with no category titles; after choosing one, an optional second-purpose step appears (not for "undecided"), and declining is offered.
3. Q1, Q2, Q3 and Q6 never appear.
4. Finish, cancel the level-up: no `mentorSurvey` flag on the actor. Finish the level-up: one `survey_completed` event with `scopeId` = the class, `typed` depth and purposes, `provenance.preview: true`, and no goal events.
5. Acquire a second prestige class later: a separate event; the first is untouched. With preview off, no step appears.

## 10. Legacy reads (resolved) and the inert channel that remains

Resolved in the source-recovery milestone (details and tests: `12-CLEAN-BREAK-CONSUMER-REPORT.md`): every read of the retired `system.swse.mentorBuildIntentBiases` field, of `actor.system.swse.surveyResponses`, and of the legacy `survey.intentTags` / `mergedBias` / `prestigeClassTarget` shapes is deleted; the survey-driven prestige branch and its private helper in `ForceOptionSuggestionEngine` are gone.

Still present and classified (not removed here): a **producer-less** input channel, `characterData.mentorBiases` / `pendingData.mentorBiases` / `buildIntent.mentorBiases`, consumed by `attribute-planner`, `BackgroundSuggestionEngine`, `Level1SkillSuggestionEngine`, `AttributeIncreaseScorer`, `tag-signal-engine.getBiasTagsFromMentor`, `prestige-path-signals`, `SuggestionEngine` and the suggestion-context builder. Nothing writes it any more, so it is always empty. Deleting it edits scoring modules (including a 1.1 tag multiplier), so it needs its own focused, separately tested suggestion-engine change. The `survey` draft key itself stays: it carries the character name and starting level (galactic profile and summary steps) and template advisory signals.

`MentorSurfaceService` has its own unrelated chat-surface survey (`mentorSurveyCompleted`); it was not part of these surveys and was not touched.

## 11. Blocker ledger by category (updated 2026-11-16, owner rulings milestone)

Five categories: **MS** missing source (not in Git) | **SI** source exists but not imported | **AP** approval pending | **MC** mechanical certification pending | **RI** runtime integration pending.

| Item | Category | Precise evidence |
|---|---|---|
| Prestige Q6 (32 classes, 160 A-E responses) | **MS** | Only `SWSE_Prestige_Q6_Fresh_Chat_Handoff_2026-11-15.md` is committed. The authored package is in five files that are not in Git: `SWSE_Prestige_Q6_Mayu_Prototype_v01.md`, `..._Batch_02_Classes_02-11_v01.md`, `..._Batch_03_Classes_12-21_v01.md`, `..._Final_Batch_Classes_22-32_v01.md`, `..._Complete_32_Class_Editorial_v01.md`. The owner's `SWSE_Prestige_Q1-Q6_Final_Editorial_Review_v01(1).md` verifies 32/32 coverage but is a review, not the dialogue. Never reconstructed. Shared engine ready; Mayu's approved prototype to be kept distinct on import. |
| Prestige Q1/Q3 per-route quarantine flags | **MS** (partly recoverable) | The Q3 library says flagged routes are "preserved in the JSON"; that JSON is not in Git. 35 rows are detected from in-row markers; the reconciliation table in `10-PRESTIGE-Q1-Q3-IMPORT-REPORT.md` lists what would settle each group from the tree audits. |
| Q3 explicit answer ids and unscored controls | **MS** (low impact) | Derived `<sceneId>-<letter>`; the two controls are described, not authored per scene. |
| Multiclass Q4/Q5 undecided-Q1 content | resolved | Imported (25 Q5 responses, 5 no-goal replacements) and curated neutral Q4 families (`MSV-RD-015`). |
| Multiclass `q1_focus` phrases (100), neutral focus, E/F | **AP** | Drafted under owner authorization; neutral focus and E/F approved; the 100 phrases are `draft_text`. |
| Multiclass Q2 evidence provenance | **MC** | A-D need an owned item or trained-skill contribution (`computeObservedBehaviorBiasProvenance`); engine exposes item names but only layer-level skill provenance; four emitted keys outside the 125 are ignored. |
| Prestige Q2 (32 classes) | **AP** | Implemented: shared stems + class connective + E/F, all `draft_text` (`MSV-RD-014`, `-015`). Not 1,293 bespoke banks by design. |
| Prestige Q1 openings and questions | **AP** | Provisional defaults chosen by rule (`14-PRESTIGE-Q1-OPENING-SELECTION-REVIEW.md`); wording approval pending. |
| Prestige Q1 per-class neutral ids | **AP** | Six classes curated (`MSV-RD-015`). |
| All L1, multiclass and prestige dialogue | **AP** | Line approval; every scope `withheld`. |
| Prestige another-career Discover/Explore/Affirm | **AP** | Rule settled (`MSV-RD-010`); conversation text authored only for Ace Pilot; no goal is declared until a conversation exists. |
| Gunslinger Pistoleer, Outlaw Fringer/Slicer, Teras Kasi, Stolen Form, Officer prerequisite collisions, Charlatan Fortune, JM/SL/Force Disciple tree alternatives | **MC** | `MSV-RD-006` and the independent tree audit. |
| Answer-to-tag mappings and influence coefficients | **MC** | Tag boundary inert; coefficients provisional (`07`). |
| Live Foundry rendering, real finalizer transaction, settings UI, template compilation | **RI** | No Foundry runtime in this environment; manual procedures in sections 7-9. |
| Real Suggestion Engine ranking with certified tags | **RI** | Channel is empty until tags are certified. |
| Producer-less `mentorBiases` channel deletion | **RI** (cleanup) | Section 10. |
