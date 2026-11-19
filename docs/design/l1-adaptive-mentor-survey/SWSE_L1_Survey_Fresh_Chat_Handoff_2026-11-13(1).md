# SWSE Level 1 Adaptive Mentor Survey — Fresh-Chat Handoff

**Date:** 2026-11-13  
**Repository:** `docflowGM/foundryvtt-swse`  
**Platform:** Foundry VTT v13; ongoing V2-framework convergence  
**Scope:** **Level 1 (L1) Mentor survey only.** Do not redesign or implement multiclass surveys, prestige surveys, Talk to Mentor, or the developer analytics platform as part of this assignment.  
**Working posture:** Design and independently verify current code first; no production implementation or Git commits without new explicit permission.  
**Primary design source:** `SWSE_L1_Adaptive_Mentor_Survey_Rolling_Design.md` **v0.10**, attached separately, approximately 66 KB, 504 lines. This remains a **local-only, uncommitted** working design; its original author explicitly withheld Git permission.  
**Related architectural source (now committed):** `docs/design/SWSE_Multiclass_Prestige_Survey_Rolling_Design.md` v0.9, branch `docs/mentor-survey-rolling-design-v0-9-20261113`, commit `1d56ae4279c53fa2f1a7ead2c312b4ef73ec7e79`, at https://github.com/docflowGM/foundryvtt-swse/blob/docs/mentor-survey-rolling-design-v0-9-20261113/docs/design/SWSE_Multiclass_Prestige_Survey_Rolling_Design.md. Use its cross-system invariants as guardrails; do **not** infer authorization to work on those other survey systems.

---

## A. Mandate for the new assistant

Work *collaboratively* with the project owner to finish the design of the **organic Level 1 Mentor survey** before touching code. Read the L1 rolling design v0.10 in full, then independently re-audit the current repository and identify any conflicts between the documented design and the current V2 runtime. Present implementation options and actual player-visible question/answer text only as drafts pending review. Do not quietly promote proposals or illustrative data into approved decisions.

The Level 1 survey is an **optional, approximately five-question, KOTOR-style career-mentor interview** conducted during character creation after a starting foundation class is chosen. The core purpose is to let the player express what kind of character they want to **become**, using canonical archetypes and meaningful mechanics to improve relevant future suggestions. It is not an optimization quiz, morality test, class-placement exam, prestige survey, or gate on legal character options.

**All selectable player responses must be first-person statements spoken by the character.** The Mentor's authored lines use that specific class Mentor's distinctive voice. Scores, tag IDs, confidence bands, weighting, and other inference machinery are developer-facing only. Character intent, actual mechanics, inferred identity, prerequisites, and achieved classes remain separate facts.

## B. Current agreed L1 questionnaire sequence (from L1 v0.10)

| Question | Purpose | Inputs and outputs | Status |
| --- | --- | --- | --- |
| **Q1 — Class Direction** | Ask which aspects of the *selected starting foundation class* the character wishes to develop first. | Class-specific first-person answers referencing supported class directions and verified mechanics; capture declared immediate interest. | **Structure agreed**; exact writing, choices, and canonical mappings require review. |
| **Q2 — Career Calling** | Ask what kind of **career field / calling** the character wants to pursue. | Rank relevant **canonical parent archetypes** using chosen class, species, actual chargen attributes, and Q1 response. All parents remain browsable. Selecting one is an intentional aspiration. | **Structure agreed**; scoring/ranking coefficients, final option policy and full UX remain open. |
| **Q3 — Career Situation A** | Present one meaningful hypothetical situation related to Q2's selected parent/career. | First-person character approaches connected to verifiable current/future class mechanics, capabilities and tags. | **Shared scenario library approved in principle**; content and validation open. |
| **Q4 — Career Situation B** | Present a **different, nonredundant** situation drawing from the same selected career. | Choose Q3 and Q4 scenarios independently from Q3's answer; their selected responses may both add bounded evidence. | **Independence approved**; detailed bank and tie rules open. |
| **Q5 — Long-Term Build Intent** | Learn the character's sustained future development aspiration. | Preserve deliberate long-term ambition distinctly from immediate Q1 preferences and inferred/observed trajectory. | **Purpose agreed, exact prompt, answer choices, weighting, and persistence open.** |

**Important:** Do not apply the multiclass or prestige survey's finalized six-question format to L1. **A Q6 has not been approved for the L1 survey.** Q6 Mentor Reflection is shared between multiclass and prestige and available on demand in Talk to Mentor, but L1 currently has a five-question working design. Any proposed L1 reflection would require a separate decision.

### Q1 details

Q1 is now the **class-specific development** question. Earlier drafts numbered career calling Q1 and put class direction at Q4; those versions are superseded. The five starting foundation classes are **Jedi, Noble, Scoundrel, Scout, Soldier**. Each should use an accurate class-specific prompt and a set of first-person development choices. Do not use surface-level flavor only: answer choices should identify meaningful, verified directions for skills, talents, features, or capabilities, and distinguish **available now** versus **possible later**.

### Q2 details

Q2 is a **universal career-calling purpose**, with a shared underlying question and contextually ranked first-person **parent archetype** options. The initial suggestions should be relevant, but never restrict all other careers. The earlier design proposed five visible career choices plus **'Something else' / browse** to access the full registry. Browsing or reading a description is informational; **only actually selecting an aspiration records that choice**. The decision about rigid A/B slots versus fully context-ranked top choices remains open. Career aspiration does not imply ownership of a prestige class or of a mechanical skill/talent.

### Q3 and Q4 details

Use **one versioned, reusable, many-to-many scenario library**, not a separate five-question scripted survey for each career. Select two different situations suitable to the chosen Q2 parent and character context **without using the player's Q3 answer to select Q4**. Answers should be credible first-person statements showing *how* the character hopes to meet a challenge. Avoid repeated morality prompts and options that merely rephrase the same semantic tags. Players must have a genuine alternative if the menu does not represent their desired approach. Exact scenario counts are **not approved**.

### Q5 details

The objective is to capture a **forward-looking character-development goal**, not a second combat scenario or an automatic level-20 prestige plan. Distinguish a stable, explicitly declared aspiration from weaker transient interests. Work with the owner on precise Q5 wording and answer formats before implementing. Do not fabricate weight constants or exact number of years/levels of intent persistence.

## C. Mentor voice and presentation contract (latest L1 v0.10)

1. Use the chosen class's own Mentor. In the prior reviewed definitions: **Miraj — Jedi; J0-N1 — Noble; Ol' Salty — Scoundrel; Lead — Scout; Breach — Soldier**. Verify current mappings and loaded dialogue assets before writing or implementing.
2. Each class Mentor supplies a curated **fixed or pre-authored stage-framing line** for Q1–Q5. It **does not need** to react to the preceding answer. This was an explicit user simplification after an earlier, overcomplicated adaptive-dialogue proposal.
3. Below the Mentor's authored voice line, render the substantive question and first-person answers. Q2 answer ranking and Q3/Q4 scenario/answer selection *are* adaptive; Mentor narration is not.
4. Reuse confirmed existing Mentor dialogue assets before writing replacement lines. Do not create a universal Jedi/Miraj narrator.
5. Never assert that the character already possesses future skills/talents simply because an answer discusses them. Verify source, current legality, availability and selected class context.
6. No survey answer should reveal numerical tag scores, internal IDs, hidden confidence, or scoring/debug language to the player.
7. The player can decline or skip the optional survey without forfeiting legal character-build choices.

## D. Canonical archetype model (historically verified in L1 v0.10)

The L1 design's verified dataset was `data/archetypes.json` with **297 archetypes: 97 parent careers and 200 specializations**, including **27 standalone parents without children**. The recorded semantic ontology contained **190 curated tags**. These counts were independently documented when v0.10 was created; **re-check them against the target Git branch before relying on them as live-current**.

- **Starting class** supplies the mechanical context and strong initial relevance signals; it does **not** own the player's career identity.
- **Parent archetype** = broad career field or calling (organizational identity).
- **Specialization** = more specific style or occupation under a parent.
- **Canonical semantic tags and typed mechanical references** = distinct methods/capabilities; do not infer exact rules from tags alone.
- A **parent record is organizational only**; its tags are **not automatically inherited** by its children.
- A **prestige class** is a separate, mechanically acquired career route. A declared desire for Jedi Master does not make the character a Jedi Master.
- Unconventional class/career pairings remain browsable. Ranking is guidance, not eligibility or a lock.
- The independent `ArchetypeRegistry` SSOT accessors include `getParents()`, `getChildren(parentId)`, `getArchetype(id)`, `getByClassRoute(classId, tier)`; verify actual signatures in latest runtime.

Relevant baseline sources: `data/archetypes.json`, `schemas/archetype-ssot.schema.json`, `scripts/engine/archetype/archetype-registry.js`, `scripts/engine/archetype/archetype-ssot-contract.js`, the existing source audits for Phase 12A/12B, and the game's canonical rules books/TXT source corpus when certifying mechanics. The older class-owned archetype lane in `data/class-archetypes.json` is **not** interchangeable with the independent SSOT and must not silently become a second production identity authority.

## E. Present repository implementation — observed; NOT the target design

**Repository baseline reviewed:** `main` as of 2026-11-13. A branch named `docs/l1-adaptive-mentor-survey-design` also exists; the new assistant must check branch/head and diff before assuming what has been committed or merged. The new v0.9 multiclass/prestige design is committed on a different documentation branch; its presence is **not** evidence that the L1 design has been pushed.

Primary files to inspect in this order:

1. `scripts/apps/progression-framework/chargen-shell.js` — organic chargen step sequence. Documented order: **Species → Attributes → Class → L1 Survey → Background → Skills → Feats → Talents …**; verify with actual code. Critically, the L1 survey must consume **pending/session** class/species/attribute data, not only the persisted Actor.
2. `scripts/apps/progression-framework/steps/l1-survey-step.js` — live survey step, state, optional navigation, draft restore, class-change resets, question rendering, mentor stage narration, finalization and stored result.
3. `scripts/mentor/mentor-survey/definitions/L1_Jedi_Survey.js`, `L1_Noble_Survey.js`, `L1_Scoundrel_Survey.js`, `L1_Scout_Survey.js`, `L1_Soldier_Survey.js` — current class-specific fixed survey banks; these are **not** the newly approved Q1–Q5 design.
4. `scripts/mentor/mentor-survey/definitions/index.js`, `registry.js`, `definition-builder.js`, `engine.js` and `scripts/apps/mentor/mentor-survey.js` — definitions, active selection, derived questions, bias/intent aggregation, and dialog entry points.
5. `scripts/engine/prestige/identity-engine.js`, `scripts/engine/suggestion/BuildIntent.js`, `scripts/engine/suggestion/SuggestionService.js`, `scripts/engine/suggestion/SuggestionEngineCoordinator.js` — existing downstream consumers and impact of L1 survey choices. Prove the concrete paths rather than assuming every bias field is used.
6. `scripts/engine/archetype/archetype-registry.js`, `data/archetypes.json`, `scripts/engine/archetype/archetype-ssot-contract.js` — approved identity and tag authority. Validate exact mechanic refs in their own registries.
7. Mentor dialogue/persona loader files and applicable source-specific test suites — confirm the five Mentor identities and that staged framing reads the intended sources.

Current L1 step, from a read of `main`:

- `L1SurveyStep.onStepEnter()` resolves the selected class from the active shell, reads a class-linked survey definition, detects class changes, restores prior drafts if available, and runs build analysis.
- `onDataReady()` uses the delegated action bridge and starts nonblocking visual translation as a sidecar rather than holding the progression render lock.
- `onStepExit()` saves drafts. If leaving backward or the survey is incomplete/not explicitly finished, it does **not** finalize bias. Once complete and explicitly finalized, it accumulates mechanical/role/attribute bias and intent-tag maps, injects identity bias, records survey answers in actor/session state, and clears the draft.
- `engine.js` uses additive `convertSurveyAnswersToBias()` and `extractSurveyIntentTags()` across selected options. It also has a stand-alone legacy dialog API. Audit whether these create duplicated evidence or different persistence semantics in V2; do not assume a compatible answer bank from their field names.
- `ArchetypeRegistry` currently exposes both an older class-owned lane and a newer independent SSOT lane. The survey needs a **direct canonical cutover**, not a third identity table, crosswalk, compatibility shim, or silent fallback.

**Important nonclaim:** These code inspections are *not* a successful Foundry runtime test. Avoid claiming all choices, lifecycles, consumers, and persistence have been verified without tests or live reproduction.

## F. Cross-system invariants from the v0.9 committed rolling design

The owner has now explicitly established this four-way separation:

> **Intent is not identity. Identity is not eligibility. Eligibility is not achievement.**

Apply this to the Level 1 survey while remaining strictly in L1 scope:

- **Declared intent:** What the player hopes to become, especially the Q2 career calling and Q5 lasting aspiration.
- **Current/observed identity:** What actual class, abilities and subsequent acquisitions support. At initial chargen, observed evidence is sparse and must not be overclaimed.
- **Mechanical eligibility:** What SWSE's printed rules allow now or later. An aspiration never grants or overrides a prerequisite.
- **Achievement:** Classes, talents, feats and other capabilities the character has actually acquired, not a class they merely discuss.

Further owner-approved guardrails:

- Merely showing, teaching, or browsing a choice must **not** add a positive preference vote.
- Declining or not selecting a possible path does **not** reject all tags associated with it or imply negative preferences. Only **affirmative declared intention** should influence career-path scores in that exploration context.
- The player's explicitly selected career direction must not be silently discarded merely because later observed actions differ. Temporal evidence weighting and per-tag reinforcement need deliberate math, provenance, caps, and tests; current constants are not approved.
- Player statements and the Mentor's narration are first-person and in-character, respectively; hidden engine mechanics must not leak into the visible survey.
- Do not use a declared Jedi Master ambition to infer current Jedi Master status, eligibility, or achievement.
- Detailed developer diagnostics, recommendation-adoption metrics and Talk to Mentor/Q6 remain **separate projects**. Do not broaden the L1 assignment into their implementation.

## G. Open decisions that the owner must make collaboratively

1. **Q1:** Exact class-specific prompts, count and wording of first-person answers, and source-verified class mechanics for all five foundation classes.
2. **Q2:** Ranking algorithm (how class, species, abilities and Q1 matter), candidate diversity, canonical parent ID provenance, tie-breaking, how to browse the full parent collection, and what option is the real vote.
3. **Q3/Q4:** Shared many-to-many scenario bank taxonomy, deterministic pairing independent of Q3's answer, how to make responses genuinely distinct, availability/legality checks and the 'something else' route.
4. **Q5:** Exact future-aspiration prompt, whether aspirations concern broad career, specialization, skillset or milestone, and what should persist across later level-ups.
5. **Scoring:** Evidence events, per-tag caps, repeated answer reinforcement, confidence, intentional long-term preference persistence versus decay of weaker inferred signals, and preference-versus-mechanics ordering.
6. **State and UX:** Draft recovery, backtracking, class-change invalidation, repeated submission idempotence, optional skip, editing earlier answers without stale downstream effects, and eventual user-visible explanation text.
7. **Tests:** Same-class divergence, different starting classes, unusual career route, 27 standalone parents, exact tags and mechanic references, two independent Q3/Q4 situations, pending-context timing, different foundation Mentor voices, no debug leakage, valid skip, duplicate prevention, and consistent downstream suggestion ranking.

No fixed numerical weights, scenario-count targets, entire question banks, or feature-selection formulas are approved merely by appearing in the rolling docs as proposals or examples.

## H. Recommended sequence for the new chat — L1 ONLY

1. **Read both provided files**, but treat the attached L1 v0.10 document as the primary L1-specific design authority. Read sections 1–10 and its changelog, noting supersession rules.
2. **Verify GitHub state**: branch + commit IDs; check live L1 source versus previous read-only notes. Report what is currently implemented vs proposed and what is actually in production.
3. **Audit the actual dependency flow** (selected class/species/attributes → Question 1 → Question 2 parent ranking → Questions 3/4 scenario selection → Question 5 intent → finalized survey evidence → SuggestionService/IdentityEngine consumers), especially the proposed direct SSOT cutover.
4. **Work through Q1 with the user first**: evaluate whether the five class-specific development choices truly reflect canonical mechanics and distinct character desires. Use core Saga Edition and other relevant certified sourcebooks for mechanics verification. Obtain user approval before moving to Q2 content.
5. **Then Q2**: design the canonical parent-archetype browser and dynamic ranker, with non-restrictive access to unusual careers. Compare independent human-facing rationale and hidden metadata.
6. **Then Q3 and Q4 together**: propose a minimal representative scenario set and tests; maintain independence and informative variation.
7. **Then Q5**: settle future intention and persistence contract, separating aspirations from achievement.
8. **Finally**: offer a narrow, staged implementation plan and measurable acceptance criteria. **Do not make code changes or Git commits without authorization.**

### Suggested first reply from the new assistant

"I've reviewed the Level 1 adaptive-survey design v0.10 and the current repository. I'll focus only on the organic Level 1 Mentor interview. I'll first verify the existing L1 question flow and how it consumes pending chargen data and the canonical parent/specialization registry. Then we can decide whether the five class-specific Q1 choices are correct before moving to the Q2 career selector. I won't treat existing code, example wording, or provisional weight coefficients as approved design." 

## I. Supporting materials to attach/provide

1. **This handoff:** `SWSE_L1_Survey_Fresh_Chat_Handoff_2026-11-13.md`.
2. **Primary L1 design:** `SWSE_L1_Adaptive_Mentor_Survey_Rolling_Design.md` **v0.10** (local file; deliberately *not* pushed by this task).
3. **Cross-system reference on GitHub:** `SWSE_Multiclass_Prestige_Survey_Rolling_Design.md` **v0.9**, branch/commit linked above. Read only the sections establishing shared evidence/intent authority, particularly Sections 9, 11, and 13; do not shift work to other surveys.
4. **Original rules authority:** Uploaded *Star Wars Saga Edition* core and supplement PDFs/TXT searchable copies already supplied to the SWSE Project. Verify actual RAW mechanically before proposing selectable abilities/feats/talents.

**Scope reminder:** The fresh chat must not investigate or redesign the Multiclass or Prestige surveys, Q6, Talk to Mentor, store, droids, ships, or the broad diagnostic platform as separate work items. Those are outside the assignment, even when they share infrastructure.
