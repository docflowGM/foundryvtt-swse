# SWSE Level 1 Adaptive Mentor Survey — Rolling Design Document

**Project:** SWSE Foundry VTT v13 / V2 convergence (`docflowGM/foundryvtt-swse`)  
**Document status:** Working design record; **not** an implementation directive or finalized questionnaire  
**Created:** 2026-11-10  
**Revision:** 0.16 (complete inline Q1/Q2/Q3 content consolidation; Q4 parent-career authoring handoff; no production changes)  
**Storage:** Local conversation workspace only. **Do not commit, push, or upload to GitHub without explicit authorization.**  
**Scope:** **Level 1 character generation only.** Multiclass/new-base-class and prestige interviews require separate designs and are out of scope here.

> **Maintenance convention:** This is a *rolling* document. Amend decisions in place as design discussions continue; record substantive changes in the changelog. Distinguish **agreed design**, **verified repository facts**, **illustrative examples**, and **open decisions**. Do not label examples as implemented behavior.

---

## CURRENT AUTHORITATIVE CHECKPOINT — v0.16 (2026-11-13)

**Read this first; overrides status phrases in historical sections below.** This remains a **local-only design document**, not an implementation order. The owner-approved design now divides the five questions into **Q1 class development, Q2 parent career aspiration, Q3 Q1-routed class situation, Q4 Q2-routed parent-career situation, Q5 long-term ambition**. The earlier claim that Q3 and Q4 are two career situations is **superseded**.

**Content included directly in this file:** 25 fixed Mentor-introduction lines; 30 Q1 player statements; 97 Q2 universal statements + 485 class-specific variations; and 30 Q3 situations + 150 Q3 first-person answers. This is **787 authored utterances** (25 + 30 + 97 + 485 + 150), **plus 30 situational narratives**. It does **not** mean 787 approved/implemented records: original Mentor lines and dialogue remain drafts unless individually signed off, and all canonical mappings need validation. The 97 universal Q2 lines are fallbacks/editorial bases; normal Q2 display is class-specific.

**Owner-approved Q2 selection architecture:** Four preferred anchors per class (20 total); A/B as best two class-relevant matches with anchors preferred but displaceable by strong Q1 evidence; C/D/E as the next three highest-ranked **unseen** parents; F reveals five **more, never-repeated** careers and yields no preference; players may select no career. No new tags or identity registry. Actual scoring weights, tie-breaks, state plumbing, and implementation remain open.

**Q3:** A situation is chosen from **foundation class + chosen Q1 direction**, including a class-specific undecided fallback. Every narrative ends with **“What would you do?”** and five distinct first-person choices. Q3 is **not** chosen from the parent career, and Q3 text/methods are drafted but not mechanically certified. Several older Q3 fixed mentor intros refer to a career and need targeted reapproval to fit the newer class framing.

**Q4:** **Not yet drafted.** It follows the explicit Q2 parent career, not Q3's answer. If Q2 is blank, do not manufacture a career. Recommended Q4 behavior is a neutral skip, pending confirmation. The Q4 authoring plan and acceptance criteria appear in §16. Content banks are reproduced in the Appendix Master Bank at the end of the document.

**Status authority:** user-approved design constraints > draft text > editorial metadata. `DRAFTED` ≠ `OWNER-APPROVED` ≠ `CANONICALLY CERTIFIED` ≠ `IMPLEMENTED` ≠ `RUNTIME TESTED`. No code or GitHub changes authorized.

---

## PREVIOUS Q3 EDITORIAL CHECKPOINT — v0.15 (2026-11-13; supersedes older Q3 content-status statements)

**Newly drafted, not yet approved/certified or implemented:** The Q3 class-specific scenario bank now has **30 scenarios and 150 first-person player response options** — exactly five responses per scenario. Five directed scenarios and one neutral `Undecided` fallback exist for each of Jedi, Noble, Scoundrel, Scout and Soldier. The 30 underlying situation descriptions and standard **“What would you do?”** prompt remain unchanged from v0.2.

**Reference:** `SWSE_L1_Q3_Class_Specific_Situation_Answer_Bank_v0.3_2026-11-13.md`; a structured version is `SWSE_L1_Q3_Class_Specific_Situation_Answer_Bank_v0.3_2026-11-13.json`.

**Presentation:** A class Mentor gives the existing fixed Q3 stage introduction; one scenario is selected **only from starting class + Q1 answer**, followed by **“What would you do?”** and the five quoted first-person options. Scenario IDs, Q1 names, development labels, editorial method lenses and mechanical tags are **not player-visible**.

**Evidence:** The varied answers describe how the player would act in that scenario, and may **reinforce or diverge from Q1**. Only an answer the player actually selects counts as Q3 intent. Q1 `Undecided` adds no Q1 specialization preference. Skipping or merely viewing an option adds no Q3 intent. The working `editorialFocus` labels in the JSON are human review notes **not** approved tags, scoring weights, or a second ontology; mapping to the certified 190-tag ontology, exact class skills/feats/talents and available/future rules remains a separate mechanical certification gate.

**Not changed:** Q2's approved 20 anchors and A/B/C/D/E/F repeat-free selection; Q4's parent-career-based situation selection, independent of Q3 response; Q5 work; the five previously recorded Q3 mentor stage introductions (some may need a separate rewrite to avoid career language or redundant questions). **No software, repository, or Git changes.**

---

## HISTORICAL DESIGN CHECKPOINT — 2026-11-13 (v0.13; status superseded by v0.16)

**Scope and approval:** This is a **local design document**, not a claim of live Foundry implementation, finished source certification, or a GitHub authorization. Older sections and earlier changelog entries are retained as design history; **the statuses in this checkpoint take precedence when they conflict with older language**. **Newer v0.13 decision override:** Q3 is now explicitly a **class situation selected from Q1**, and Q4 is a **parent-career situation selected from Q2**; all older text treating Q3/Q4 as one interchangeable parent-situation pair is superseded. The goal is five substantive questions, not an extra Q6.

| Component | Content state | Architecture / implementation state | What remains |
|---|---|---|---|
| **Mentor dialogue (all five classes, Q1-Q5)** | **25 fixed stage introductions authored** (Miraj/Jedi, J0-N1/Noble, Ol' Salty/Scoundrel, Lead/Scout, Breach/Soldier); J0-N1 explicitly approved; other lines recorded as working selections | Not integrated into new live survey flow | Reconfirm any unapproved lines and wire into correct mentor authority |
| **Player response presentation** | **Owner-approved**: only quoted first-person player statements, with no visible parent/archetype labels, headings, scores or tag IDs | Existing UI still requires cutover | Ensure buttons/choices show only player utterance; internally preserve exact IDs |
| **Q1 — Class Development** | **All five class-specific sets drafted/reviewed**; six replies per class (five development directions + undecided), **30 total**; Jedi and other individual choices reviewed during design | Q1-to-ontology/exact-mechanics mappings and runtime integration not completed | Source-certify mappings; undecided adds zero specialization intent |
| **Q2 — Career Calling** | **97 universal first-person responses authored**, plus **485 class-specific responses (97 parents x 5 classes)**, complete in local versioned banks; line-by-line editorial approval still open | A/B 20-career class-anchor set and repeat-free F paging **owner-approved**; ranking, paging UI and state cutover **not implemented** | Display A/B as two class-relevant selections, C/D/E as three highest remaining ranked parents; F advances to five **new unseen** careers; allow no Q2 selection |
| **Q3 — Career Situation A** | Question purpose and shared-pool architecture agreed; fixed mentor introduction drafted | No certified scenario/answer bank or selection engine | Build reusable scenarios, first-person methods and mechanical evidence |
| **Q4 — Career Situation B** | Distinct second challenge agreed; fixed mentor introduction drafted | No certified scenario/answer bank or selection engine | Choose independently of Q3 response, avoid repeated context, record selected method |
| **Q5 — Long-Term Ambition** | Goal and five fixed mentor introductions drafted | Substantive question/options, intent mapping and persistence still open | Design choices and long-horizon signal contract |
| **Existing data integration** | Canonical parent tags and typed refs **already exist**; class, species and ability evidence are already represented in existing systems | No proven end-to-end pending-session Q2 consumer or successful Foundry runtime test | Wire existing authorities; do **not** author a duplicate semantic taxonomy |

**Count checkpoint:** 97 unique canonical parent career IDs; 97 universal base responses; 485 distinct, nonempty class variants (Jedi, Noble, Scoundrel, Scout, Soldier), **580 Q2 dialogue statements including universal bases**. These are **editorial assets**, not 580 new archetype identities. Verified directly from `SWSE_L1_Q2_Class_Specific_Career_Responses_Combined_97x5_v0.4_2026-11-13.json`; this check alone does not certify literary quality or all feat/talent legality.

**Status guardrail:** `DRAFTED` != `OWNER-APPROVED` != `CANONICALLY CERTIFIED` != `IMPLEMENTED` != `RUNTIME TESTED`.

---

## 1. Design vision

The **selected class's own mentor** should conduct a **KOTOR-style character-defining conversation**, not ask every member of a class the same fixed five questions. **Miraj is the Jedi mentor only. Every other class, and each prestige class (PRC), has its own mentor and distinct voice.** The visible dialogue should feel like the character is declaring aspirations and responding in their own voice. Behind the scenes, a deterministic adaptive system uses the canonical archetype registry and the existing semantic tag ontology to select answer options and recommend a direction.

**Working principle:**

> **The starting class and current character mechanics establish context. Q1 reveals the player's desired development direction within that class. Q2 lets the player choose a career field, using Q1 plus available canonical character evidence to rank—not restrict—options. Q3 and Q4 explore how they want to use that class and career in varied situations. Q5 should identify the player's longer-term build trajectory, but its question and answer design remain under discussion.**

The questionnaire should remain compact (working target: approximately five substantive questions). There is **one shared career-calling question purpose at Question 2** (formerly labeled Q1), not hundreds of separately written career prompts. The mentor can supply a fixed, class-specific framing line before the shared substantive question. The question itself remains mechanically and semantically consistent across mentors. **Q1 is now a class-specific development question**, with one version for each starting foundation class. The variable content is principally the answer banks, adaptive parent-menu options, and selection of two independent career-relevant situations.

### 1.0 Mentor ownership and dialogue authority (clarified v0.8)

- **Miraj is exclusive to Jedi classes** and speaks in the Jedi mentor's authored voice. She is **not** the narrator for all Level 1 classes.
- **Each other foundation class and each prestige class (PRC) has its own mentor and its own distinct voice.** Do not replace them with Miraj, even when the underlying question purpose or scenario metadata is reusable.
- **Shared engine, distinct persona:** Canonical archetypes, mechanic references, scenario eligibility, deterministic scoring, and survey state may be shared infrastructure. Dialogue framing, speaker identity, and presentation language belong to the mentor for the currently selected class or PRC.
- **Scope:** This rolling document defines the Level 1 foundation-class interview. PRC mentor ownership is an architectural constraint and does **not** authorize redesigning prestige surveys here.

### 1.1 Career-field analogy

- **Parent archetype = career field:** the broad vocation, calling, or kind of contribution the character wants to make.
- **Specialization = job:** the narrower kind of specialist within that career field.
- **Semantic tags = methods, competencies, and emphases:** what differentiates otherwise similar careers, jobs, and playstyles.
- **Foundation class = strong starting-route evidence, not identity ownership.** Class matters heavily in the initial filtering; the archetype registry remains class-independent.
- **Prestige class = a later mechanical progression route, not automatically a parent or specialization identity.** A Level 1 character may express future aspirations without being assigned a prestige class.

A parent is **organizational**, not a source of automatically inherited mechanics or tags.


### 1.2 The class-specific mentor as career guide, not merely a survey administrator (2026-11-10 discussion; corrected v0.8)

**User-supplied conceptual framing:** A career mentor helps a person identify goals, recognize strengths, develop capabilities, navigate transitions, and make informed long-term career decisions. A mentor advises; the person being mentored retains control of decisions. Mentoring is ongoing and experience-informed, distinct from an assessment or one-time placement exercise.

**Proposed SWSE interpretation (design direction; not yet a finalized feature contract):**

| Career-mentor responsibility | Corresponding role for the selected class mentor | Level 1 relevance |
|---|---|---|
| Career planning | Help the player articulate a preferred parent career field and potential specialization, then understand routes that could support it. | **Core to the Level 1 intake.** Q1 discovers class-development preference; Q2 discovers career aspiration; Q3/Q4 assess methods; Q5 is intended to capture a longer-term build direction. |
| Skills and professional development | Identify relevant class skills, feats, talents, attributes, and training opportunities, subject to canonical legality checks. | **Guidance during Q2–Q4 and after the survey**, not permission to add illegal skills, feats, or talents. Brief source-grounded explanations can teach the class's skills, class features, and talent options without steering the character away from expressed intent. |
| Recognizing strengths and gaps | Compare actual species/ability/class evidence with declared ambition without assuming the player must optimize for current strengths. | **Core to Q2 ranking and explanation.** Strong fit influences visibility; unconventional goals remain selectable. |
| Long-term roadmap | Explain a plausible build direction and milestones across levels without assigning later prestige choices during initial chargen. | **Optional outcome framing.** L1 surveys should not become premature prestige interviews. |
| Career transitions | Revisit the player's direction when a new base class or prestige class is chosen, preserving previous intentions as historical evidence. | **Out of scope for L1 design.** Distinct multiclass/prestige surveys own those moments. |
| Networking, organizational navigation, and relationships | If appropriate, discuss factions, allies, patrons, affiliations, politics, or narrative opportunities, distinguished from mechanics and eligibility. | **Narrative-only unless a canonical authority supplies an actual mechanical rule.** |
| Accountability and progress review | Reassess whether the build still supports the player's stated direction at appropriate milestones; recognize intentional changes. | **Later mentor behavior**, not required for completing the initial five-question survey. |
| Confidence and decision-making | Explain choices, strengths, tradeoffs, and feasible alternatives; do not make build decisions for the player. | **Always applicable.** Recommendations require reasons and player control. |

**Boundary to preserve:** The **Level 1 adaptive survey is the selected foundation class mentor's intake interview, not the entirety of that mentor's role**. The project can later use the resulting preference profile to support ongoing build guidance. This document still scopes questionnaire engineering to Level 1 and does not authorize changes to multiclass/prestige surveys or the larger suggestion engine.

**Mentor principle:** *A class mentor does not assign a career. The mentor helps the player recognize available paths, articulate an ambition, understand their present strengths, and choose how to pursue that ambition.*

**Implementation implications (proposals, not yet agreed):** Preserve separately (a) measured mechanics, (b) the player's expressed career preference, and (c) potential future development goals. Provide explanations for ranking and tradeoffs; allow the player to change direction intentionally. Do not infer that the mentor possesses literal personal work history, and do not fabricate canonical rules to create a mentoring persona.

---

### 1.3 Existing mentor dialogue reuse - repository discovery (v0.9; PROPOSAL, not approved implementation)

**User direction:** There is already extensive authored mentor dialogue; inspect and reuse it before writing a new script. Preserve each class/PRC mentor's identity and the agreed first-person *player* answers.

**Repository evidence reviewed against the default branch (2026-11-10):**

- `data/mentor-dialogues.json` is the declared source for `scripts/engine/mentor/mentor-dialogues.data.js` (auto-generated). It contains **37 class-keyed entries**, including five foundation classes and numerous prestige classes; this is *not* a claim of 37 distinct speaking personas. The five foundation mentors are Jedi=Miraj, Scout=Lead, Soldier=Breach, Scoundrel=Ol' Salty, Noble=J0-N1. Its `surveyGuidance`, `classGuidance`, `skillGuidance`, `talentGuidance`, `featGuidance`, `summaryGuidance`, and `levelGreetings` offer relevant starting material.
- `data/dialogue/mentor_registry.json` lists **31 registered mentor keys** with nested `dialogue_path` values. The five authored nested JSONs were sampled: `data/dialogue/mentors/miraj/Miraj_dialogues.json`, `breach/breach_dialogues.json`, `lead/Lead_dialogues.json`, `ol_salty/ol_salty_dialogues.json`, `j0_n1/j0_n1_dialogues.json`. They include `voiceStyle`, `philosophy`, guidance, class-path greetings/confirmations and sometimes workshop or story content. These are a *different data shape* from the generated class-keyed source.
- `scripts/apps/progression-framework/steps/mentor-step-integration.js` explicitly distinguishes dialogue authority from mechanical suggestion authority. `scripts/apps/progression-framework/steps/l1-survey-step.js` presently uses mentor guidance and has its own hardcoded `voiceSurveyClarification` prefixes/suffixes. This is a candidate for consolidating survey-specific dialogue lookup, **after a consumer-by-consumer reachability check**.
- A separate `data/dialogue/mentor-suggestions/mentor-suggestion-dialogues.json` has phase-indexed `observation`, `suggestion`, and `respectClause` templates. Reuse voice structure, but do not allow old/uncertified mechanical claims to decide recommendations.
- **Integration hazard to investigate, not a proven runtime failure:** `scripts/mentor/mentor-dialogue-registry.js` constructs `data/dialogue/mentors/${resolved}.json`, even though `mentor_registry.json` points to nested dialogue paths. Fetching `data/dialogue/mentors/miraj.json` returned not found. Audit this registry's actual reachability/consumers before using it as a survey authority. Do not add a shim to conceal mismatches.
- **Editorial QA is required:** The class-keyed `surveyGuidance` for Soldier/Breach, Scoundrel/Ol' Salty, and Noble/J0-N1 currently shares a generic, clinical input-reporting line, which does not preserve every persona's distinct voice. Some preexisting `classPaths` use *older class archetype labels*; these are not authorized substitutes for the 97-parent/200-child canonical registry.

**Reusable material identified (initial proposal; presentation simplified and partially superseded by the agreed v0.10 rule below):**

| Survey moment | Existing dialogue to reuse or adapt | What still needs to be authored |
|---|---|---|
| Q1: class direction | Intro/level-1/`surveyGuidance` and `classGuidance` from selected mentor | Exact class-specific question, approved alternative answers and canonical preference links |
| Q2: career calling | Persona/style and appropriate career-commentary lines | Ranked canonical parent career statements and short acknowledgments; never use legacy `classPaths` as canonical IDs |
| Q3: situation A | Persona-specific operational/scholarly/social style, skill and talent guidance | Mechanically certified scenario and first-person choices with relevant skill/feature/talent pathways |
| Q4: situation B | Same mentor's style in a distinct scenario; other approved skill/talent cues | Independently selected situation and certified choice-to-mechanics mapping |
| Q5: future build intent | Existing future-development, level-up and `summaryGuidance` tone | Explicit long-term goal answers, their typed intent semantics and persistence behavior |
| Stage framing (Q1–Q5) | **Mentor-specific pre-authored line independent of previous answers** | Only author missing lines; do **not** require choice-specific acknowledgments or prior-answer reactions (superseded by v0.10) |

**Separation-of-concerns requirement:** An authoritative, deterministic selector determines *which* question/answer/verified mechanics to show. Dialogue files determine *how that class's mentor says it*. The first-person answer belongs to the player, not to the mentor. A line that is displayed does not generate build-intent weight; only a deliberate answer does. The UI must distinguish existing character abilities from potential future capabilities.

**Proposed implementation order:** (1) census and provenance of currently active dialogue sources, (2) check every class/mentor mapping and reachable loader, (3) catalog reusable lines by interview function (opening, asking, acknowledgement, teaching, transition, closing), (4) source-ground mechanic review and canonical archetype reconciliation, (5) small gap-writing pass only where missing, (6) test all five foundation voices against the same semantic scenario and test that prestige mentor definitions remain unaffected. **No GitHub changes; research/design only.**

### 1.4 Agreed simplified survey presentation: mentor-specific static dialogue + generic question (v0.10)

**User-confirmed direction:** Each class mentor has a **curated set of authored dialogue lines** for the five interview stages. A mentor's line can be shown **regardless of what the player answered in the previous stage**. Miraj, for example, does not need to recognize, reference, or dynamically react to the previous answer. The shared substantive question, its choices, and the canonical mechanics sit behind that voice line.

**Presentation contract:**

1. Identify the actual foundation-class mentor (Miraj, Lead, Breach, Ol' Salty, J0-N1 at Level 1), then select that mentor's approved **stage line** for Q1 through Q5. A small pre-authored variant pool per mentor/stage is permissible, but variation **must not depend on previous survey answers**, predicted career, inferred specialization, or morality.
2. Display the **underlying question** separately. Q1 is class-development-specific; Q2 is the shared career-calling prompt with dynamically ranked canonical parent answers; Q3/Q4 display two appropriate situational prompts from the shared pool; Q5 presents long-term build-intent choices. A generic question is **shared in function and wording when appropriate**, not a requirement that the situational details be identical for unrelated careers.
3. Dynamic intelligence belongs exclusively to **question/scenario selection, answer selection, canonical metadata lookup, and score accumulation**, **not** the mentor's spoken reaction. Q2 still uses Q1 + class/species/attributes; Q3/Q4 still use Q2's chosen parent to establish credible contexts and are independent of each other's responses; Q5 may use the full survey profile to choose future-oriented answer options.
4. **No per-answer mentor acknowledgment, branching transition, or personalized reaction is required.** Existing such lines can be inventoried but are not a dependency of the refactor. Avoid scripted statements that falsely assert what the player chose (for example, "I see you have chosen defense") when a mentor line is shown unconditionally.
5. The player's choices are first-person narrative statements accompanied by **validated typed mechanic metadata**. Curated mentor dialogue does not produce intent scores; a player's actual selection does. Class skills, features, and possible future talents remain grounded in authoritative rules, not invented by decorative dialogue.
6. Preserve each mentor's distinctive voice, and **reuse verified existing lines before authoring any missing stage line**. Do not install a universal Miraj voice or make PRC mentor lines available during a foundation-class interview.

**Illustrative Q3 presentation (not a required exact script):** The Jedi mentor might say a fixed reflective line about facing challenges. The question beneath it is a career-appropriate situation (perhaps examining a dangerous relic), followed by five first-person approaches. If the previous answer concerned lightsaber mastery rather than Force scholarship, **Miraj still delivers the same introductory line**; only the survey's evidence and eligible dynamic content determine which scenario and options are displayed.

**Why this supersedes part of v0.9:** The previously suggested "after each answer" personalized reaction and six-function dialogue adapter were overcomplicated for the desired experience. Their reaction/acknowledgment logic is **not an agreed feature**. A much smaller mentor/stage dialogue lookup plus the existing shared survey-question renderer is the preferred design. This is an agreed presentation principle, not authorization to change repository code.

---

## 2. Verified archetype architecture and evidence

The current canonical production data reviewed for this discussion are in `data/archetypes.json` (repository `docflowGM/foundryvtt-swse`; reviewed from the then-current main branch, with file blob SHA `76b1ee3aa06dcb29a88ff4ca69bbc8b96cebc3fe`).

| Registry fact | Verified result |
|---|---:|
| Canonical archetype records | **297** |
| Parent records | **97** |
| Specialization records | **200** |
| Parents with one or more specializations | **70** |
| Parents without specializations | **27** |
| Specializations with more than one parent | **0** |
| Orphan specializations | **0** |
| Curated semantic-tag ontology | **190 tags** |

A specialization has a **single** `parentId`. There is no multiple-parent mechanism in the current SSOT. Parents with no children (e.g., Gunslinger, Sniper, Survivalist, Droidsmith, Sith Assassin) are still valid final identities; the questionnaire must not invent children for them.

### 2.1 How the hierarchy was created

The parent/specialization hierarchy was **authored narratively before** the final tag curation. The dataset references `SWSE_Archetype_Narrative_Authority.md` as an earlier narrative authority. Phase 11 enriched archetypes with mechanical fields; Phase 12A promoted the class-independent 297-record artifact to the runtime SSOT; Phase 12B curated `metadata.tags.primary` and `metadata.tags.supporting` against the final ontology for all 297 records.

Therefore the 97 parents were **not generated by clustering the final tags**. The original narrative-authority file has **not** been directly inspected during this conversation, so the editorial rationale for every individual parent assignment is not independently verified here.

### 2.2 Relevant canonical sources

- `data/archetypes.json` — current class-independent archetype SSOT, `kind`, `parentId`, typed mechanical priorities, canonical tags, and routes.
- `schemas/archetype-ssot.schema.json` — structural contract; class is a route, not archetype identity.
- `scripts/engine/archetype/archetype-ssot-contract.js` — registry invariants; exact identity > primary tags > supporting tags > class/access context > narrative taxonomy; no automatic parent-tag inheritance.
- `docs/audits/archetype-phase-12a-convergence-audit.md` — historical rationale, Phase 11 normalization, authority order.
- `docs/audits/archetype-phase-12a-runtime-ssot.md` — Phase 12A SSOT promotion and registry API.
- `docs/audits/archetype-phase-12b-closeout.md` — Phase 12B tag-curation completion.
- `scripts/apps/progression-framework/chargen-shell.js` — documented organic chargen sequence, including species, attributes, class, then L1 survey.
- `scripts/apps/progression-framework/steps/l1-survey-step.js` and `scripts/mentor/mentor-survey/definitions/L1_*_Survey.js` — existing class-specific survey implementation to replace/refactor after design signoff.

**Data caution:** Some underlying archetype mechanical audit fields remain marked `draft`. Curated tag certification is **not** blanket certification of every derived legal build choice; separate canonical rules/legality authorities must validate selectable feats, skills, talents, and class progression.

### 2.3 The initial filter has enough information

For organic chargen the documented sequence is:

`Species -> Attributes -> Class -> L1 Survey -> Background -> Skills -> Feats -> Talents ...`

Thus a Level 1 survey can read species, attributes and class **provided it reads the current progression session / pending choices**, not just already-persisted Actor fields. Later background, feats, and talents may not yet exist.

Droid chargen has a different step route and requires separate evidence handling, while preserving the Level 1 survey's overarching intent if applicable.

---

## 3. Agreed working Level 1 survey sequence (v0.7)

**Design change:** The previously discussed Q4 class-specific development question has moved to **Q1**. The former career-calling Q1 is now **Q2**, and the two independent situation questions are now **Q3 and Q4**. Do **not** retain legacy question-number assumptions in implementation documents. Q5 is a newly framed longer-term build-intent question, **not yet approved at the level of exact wording, answers, or weights**.

| Order | Working purpose | Primary selection authority | Intent contributed |
|---|---|---|---|
| **Q1 — Class Direction** | What part of my chosen foundation class do I want to develop **now**? | **Selected starting class**; five class-specific question/answer banks, subject to content review | Player-declared class development emphasis (e.g., martial, Force, defense, support, reconnaissance) |
| **Q2 — Career Calling** | What do I want to **do** with that class direction? | **Class + species mechanics + current ability scores + actual Q1 answer**, against 97 canonical parent careers | Explicit chosen canonical parent/career aspiration |
| **Q3 — Career Situation A** | How would I use class/career capabilities in one relevant context? | Q2 parent career + available class/species/attribute evidence | Skills, class methods, mechanics, tactical/role preferences |
| **Q4 — Career Situation B** | How would I respond in a **different** relevant context? | Same authority as Q3, **not the Q3 answer** | Independent additive evidence: different or repeated preferences |
| **Q5 — Long-term Build Intent** | What sort of build am I trying to grow into across later levels? | To be designed; prior choices may inform answer relevance **without predetermining the player's intent** | Intended growth direction across skills, feats, talents, capabilities, potential later routes |

### Q1 — class-specific development direction

One question and a curated first-person answer bank **per foundation class** (Jedi, Noble, Scout, Scoundrel, Soldier). The question invites the player to describe which aspects of their **already selected class** they want to improve, not which class they wish they had selected. Illustrative examples: Jedi lightsaber mastery vs Force mastery, Scout reconnaissance vs survival, Soldier defense vs tactics, Noble leadership vs persuasion, Scoundrel stealth vs improvisation.

- Q1 is a **direct player-intent signal** independent of class-derived aptitude. It must not impose an optimization constraint on Q2.
- Q1's exact dialogue and canonical answer-to-tag mappings are **not yet certified**. The earlier suggestion of five starting responses is provisional; provide access to legitimate alternatives as needed.
- Q1 is answered **before any parent career is chosen**. Class/species/attribute evidence is already available from current chargen choices, including pending session values rather than only persisted Actor fields.

### Priority 1 — connect canonical metadata before building the selector

**First engineering priority (user-requested): Wire the canonical SSOT and already available character metadata into the new survey's ranking, answer selection, and existing intent/suggestion channels.** Do this before hand-authoring an independent scoring taxonomy or proliferating question variants.

The existing `data/archetypes.json` / `ArchetypeRegistry` provides 97 parents and 200 children with curated primary/supporting/all tags. **Phase 12B did not connect that curated authority to the live Mentor/suggestion paths** in the repository state previously inspected. Implementation should verify the current branch again, then connect these authorities **without shims, parallel archetype maps, or made-up tags**.

Priority sequence:

1. Read **live pending** selected class, actual species mechanical traits/availability, and ability scores from the chargen session.
2. Encode each Q1 first-person choice using a certified mapping to existing ontology tags, class mechanics, and existing survey-intent fields (where legitimately supported).
3. Score/rank the **97 canonical parent identities** for Q2 deterministically. Class is a strong relevance prior; Q1 is a strong **declared intent** signal; species/attributes are supporting mechanical evidence. Tune weights using test fixtures rather than inventing values now.
4. Generate **five distinct career-aspiration statements plus a no-bias “Something else” exploration control**; every statement maps to an actual parent ID. Preserve full parent discoverability and unconventional builds.
5. Feed only **actual chosen answers** into existing additive survey intent channels and downstream suggestion engines. **Do not score a career as player preference merely because the algorithm displayed it.** Keep scoring from overlapping paths from counting one choice twice.
6. Recompute the Q2 ranking when Q1 changes, cheaply and locally; invalidate or ask to reconfirm a now-stale Q2 draft choice rather than silently overwriting a career the player already committed to.

**Cost distinction:** Comparing 97 parents with relevant tags is computationally trivial in principle; the actual engineering effort is mapping the canonical registry, pending chargen state, Q1 answer interpretation, legal skill/talent/feature references, and live suggestion consumers. Runtime performance should nevertheless be measured before promising latency.

### Q2 — universal career-calling prompt; dynamically personalized answers

**The selected class mentor asks (Jedi/Miraj example):**

> **“Of the many paths before you, which one calls to you?”**

This is an illustrative Jedi-mentor line, **not a universal script** to be spoken by Noble, Scout, Scoundrel, Soldier, or prestige-class mentors. Every mentor has its own authored voice even where survey purpose, mechanics, or canonical answer IDs are shared.

This was called **Q1 in revisions 0.1–0.6**. Answer options are KOTOR-style first-person **career ambitions**, not direct mechanic or prestige-class labels. The ranked **parent** choices incorporate Q1's explicit preferred class-development emphasis **as well as** chosen class, species mechanics, and ability scores.

**Proposed initial answer presentation, carried forward from the earlier career-Q1 design:**

| Slot | Source | Function |
|---|---|---|
| **A** | Class-relevant | An important career field rooted in the starting class. |
| **B** | Class-relevant | Another significantly different class-relevant career. |
| **C** | Class + Q1 + personal mechanics | A high-relevance individualized parent. |
| **D** | Current canonical parent ranking | Another meaningful parent ambition. |
| **E** | Current canonical parent ranking | Another distinct meaningful parent ambition. |
| **F** | **“Show me other possibilities”** | Advance to the next five highest-ranked **unseen** careers; never reuse a parent on a later page and record **no preference** for navigation. |

**Owner-approved v0.12 resolution:** A and B prioritize two **class-specific selections** informed by a vetted four-parent anchor set for each class (20 total); these are **preferred anchors, not a restrictive whitelist**. Q1 evidence may elevate a stronger class-compatible canonical parent above a default anchor. The five visible career options are distinct: C, D and E are the **three strongest remaining ranked parents** after reserving A and B. Do not prefer a lower-ranked C/D/E merely to manufacture diversity. Do not assign extra player-preference weight because an option occupied a specific slot. The **F option is navigation, not a parent career**: it replaces the five displayed responses with the next **five highest-ranked, previously unseen** parent careers, with no repetitions across pages. Q2b/Q2c are pages within **Q2**, not new substantive questions. If fewer than five unused careers remain, display only the remainder; after exhaustion, no repeat-loop. Player may leave Q2 without selecting any parent; this creates no declared career intent. All 97 parents remain reachable through repeated F paging.

**Career authority:** The Q2 choice is the player's **declared career intent**, higher authority than Miraj's mechanical prediction. Choosing Galactic Archaeologist while starting Jedi remains legitimate even if Q1 selected lightsaber mastery. Do not force prestige classes (e.g., Jedi Knight) into the parent-archetype category.

### Q3 and Q4 — independent contextual views of the chosen career

Use **one shared many-to-many situational scenario bank**, with **no fixed authored question count**. A scenario can fit multiple parent archetypes, and a parent can have many relevant situations. Choose two **distinct and complementary career contexts** based on Q2 and existing character evidence, rather than making Q4 branch from Q3's answer.

- **Q3 and Q4 have independent scenario selection; Q4 does not depend on the player's Q3 answer.** The same curated scenario can appear at Q3 for one character and Q4 for another.
- Q2's chosen **career context** is the main authority; class provides legal/relevant response possibilities. A Jedi archaeological career should receive an archaeology-related challenge, not automatic Jedi combat scenarios.
- Each scenario offers meaningful KOTOR-style **first-person methods**: initial design is five substantive answers plus **“Something else”** access to other meaningful responses. Answer-bank size is driven by quality and coverage, **not a quota**.
- **Repeated independent preferences reinforce one another** through the existing additive survey signal paths; a defensive solution in Q3 and another defensive solution in Q4 should strengthen defensive intent, not be discounted.
- Scenarios collect **mechanical and playstyle metadata**, not morality or alignment scores. Different situations can legitimately elicit diplomacy in one and offense in another without contradiction.
- No mandatory specialty selection; a parent with no child archetypes must still yield useful playstyle evidence.

### Q2–Q4 — teach and nudge through mechanically meaningful answers (revised D14, v0.8)

**User-specified design requirement:** Q2, Q3, and Q4 should not be passive data collection only. **The selectable answers themselves should represent potential ways to develop and use the selected class: class skills, talent directions, and class features that could support the desired career or response.** Wording and optional explanatory notes can teach how those mechanics work. This is mentorship and informed choice, not covert steering or automatic build selection.

- At **Q2 (career choice)**, briefly explain how a chosen class might support several careers and where tradeoffs exist; show routes the class can plausibly pursue without treating current aptitude as a prohibition.
- At **Q3/Q4 (situational choices)**, **make each substantive answer a plausible mechanical development direction** for the actual selected class, using certified class skills, class features, and talent paths. The narrative statement communicates what the player would choose to cultivate or employ; its typed metadata references the verified mechanics supporting that approach. Do not rely on optional tooltips as the sole connection to mechanics. Include short, source-grounded explanations when useful.
- **No answer may claim the character already owns an unselected talent, trained skill, feat, Force power, or feature.** Distinguish current chassis abilities from possible later selections and conditional prerequisites. Validate everything against legal canonical authorities; do not assert that a choice is selectable at Level 1 simply because it fits an archetype tag.
- **Nudges inform, not bias evidence.** An explanation, feature preview, or displayed option is not a positive intent vote; only the player's deliberate selected response is. Offer alternate answers without penalizing unconventional builds.
- Avoid long tutorial passages inside a five-question interview; prefer optional short “why this fits / how this works” explanations and deeper links on demand. Narrative first-person answers remain readable without the explanation.
- Tie teaching to the **actual selected class** and **current progression state**. Q2's career identity may be unconventional; the applicable class mentor can explain a legal or future route rather than falsely declaring that the selected career is unavailable. **The mentor voice is chosen by class/PRC, independently of the canonical scoring/answer mechanics.**

### Q5 — build-intent horizon (concept under discussion)

**User's framing (recorded, not yet transformed into a fixed questionnaire):** Q1 is what the player wants **now**; Q2 is what they want to **do** with their chosen class direction; Q3/Q4 reveal **how** they will use that class and career **in play**; **Q5 is how they want to keep building**, aiming at the strongest available indication of longer-term **build intent**.

Q5 should yield an **explicit forward-looking intent signal** that later skill, feat, talent, and legal class-route suggestions can use. It should not merely repeat Q1's current class-development preference, ask for equipment ownership, become a morality test, or silently preselect a prestige class. Whether Q5 asks for a **desired future mechanical outcome**, a **specialization direction**, an **advancement tradeoff**, or a combination is **still open**. Likewise, precise prompt, number of answers, tailoring/branching, weighting, confidence and persistence across later levels remain undecided.

### Survey output and persistence boundaries

Use the existing additive survey-intent architecture as the starting implementation authority, with canonical archetype identities/tags and real rules mechanics. Preserve distinct (a) **measured current capabilities**, (b) **declared Q1 class development**, (c) **committed Q2 career**, (d) **Q3/Q4 contextual methods**, and eventually (e) **Q5 future-build priorities**. Suggestions remain advisory and legality-gated. Do not implement L1 decisions as automatic prestige commitments; later multiclass/prestige surveys are separate.

## 4. First-person answer-writing principle (KOTOR style)

The **player's statement** and the **engine's canonical interpretation** are separate pieces of data.

| Player-facing first-person statement | Distinction expressed | Canonical interpretation notes |
|---|---|---|
| “I want to protect the innocent, no matter the cost.” | Protection, duty, self-sacrifice | Elevates appropriate protective archetypes; candidate Jedi Guardian where supported. |
| “I want to master the art of the blade.” | Martial mastery | Elevates lightsaber/melee-oriented candidates; may point to particular martial specializations. |
| “I want to become a Jedi Knight.” | Institutional Jedi ambition / advancement | **Jedi Knight is a prestige class**, so store as a *future aspiration*, not a canonical parent ID or instant prestige selection. |
| “I want to seek out hidden threats and bring them into the light.” | Investigation and vigilance | Elevates Jedi Sentinel / investigator/watchman-style archetypes when relevant. |
| “I want to understand the Force and use its wisdom to bring peace.” | Force, knowledge, support/diplomacy | Elevates Jedi Consular and compatible specializations. |
| “I want to uncover the secrets of civilizations long forgotten.” | Archaeology and exploration | Elevates Galactic Archaeologist-related options. |
| “I want to make my living tracking down those who think they can't be found.” | Hunting and pursuit | Elevates Bounty Hunter-related options; a follow-up may distinguish from Sector Ranger. |
| “I want to become one of the finest pilots in the galaxy.” | Piloting mastery | Elevates Pilot-related options. |

**Canonical-name safeguard:** “Jedi Protector” and “Jedi Duelist” were discussed as **player-facing concepts**, not confirmed exact IDs in the 297-record registry. Do not invent those as canonical archetypes. Use exact existing IDs and, where warranted, distinct narrative intents. “Jedi Knight” remains a distinct prestige-class route.

**Important correction to a previous design assumption:** Five Jedi-flavored, even martial-flavored options are not inherently redundant. “Protect others,” “master the blade,” “serve the Order,” “hunt hidden threats,” and “master the Force” can identify genuinely different career aspirations. Diversity is about **semantic distinctions in the character's ambition**, not forcing one option from each mechanical domain.

---

## 5. Illustrative characters and personalization expectations

### 5.1 Jedi 1 vs. Jedi 2

*This originally illustrated the career prompt as Q1; in v0.7 that career prompt is Q2, after the new class-specific Q1.*

**Jedi 1:** Twi'lek; STR +0, CON +0, INT +0, WIS +1, CHA +5, DEX -1. A Force/social-oriented opening is mechanically plausible, but martial options remain available.

**Jedi 2:** Kel Dor; STR +1, CON +1, DEX +1; comparatively weaker INT/WIS/CHA (exact other modifiers were not specified). A martial/physical opening is more plausible, but Force/social options remain available.

**Expected career-menu behavior at new Q2 (originally Q1):**

- Both receive their **Jedi-specific Q1 class-development question** first, and later the **same universal Q2 career-calling prompt**.
- Both may see **shared Jedi career aspirations** from A/B in Q2, worded as first-person dialogue.
- C/D/E at Q2 may differ based on the initial character ranking **and the player's Q1 class-direction answer**.
- The first Jedi may see more Force mastery, diplomacy, teaching, or investigation options.
- The second may see more blade mastery, defense, martial protection, or pursuit options.
- Neither is barred from selecting an atypical career; Q2 option F unlocks more paths.
- A strong Charisma modifier is relevant to Use the Force checks; Wisdom has a separate relevance to Force Training. Do not treat all Force-related mechanics as interchangeable.

### 5.2 Indiana Jones vs. Lara Croft

These are **illustrative fictional character concepts**, not literal named build targets.

- Both could start as **Scouts** and initially receive a strongly overlapping set of exploration, archaeology, investigation, survival, and relic-recovery career options.
- A relatively Intelligence-oriented character may see more scholarship/investigation options in the **Q2 career menu**.
- A relatively Strength/Dexterity-oriented character may see more athletic fieldwork, movement, and dangerous-expedition options in the **Q2 career menu**.
- They might select **the same parent field at Q2** but diverge through Q1 class emphasis, Q3/Q4 situational methods, and eventual Q5 growth direction.

**Actual registry example:** `galactic_archaeologist` (parent) has children:

- `relic_hunter`
- `academic_archaeologist`
- `xenoarchaeologist`
- `archaeological_expedition_leader`

An adaptive follow-up might ask what the character would personally do upon finding an ancient temple: physical artifact recovery, historical research, investigation of alien technology, or directing an expedition. **These are illustrative answer concepts, not certified final wording or weighting.** (This example now refers to the situation questions at **Q3/Q4**, not the old Q2 numbering.)

### 5.3 Genuine divergence vs mechanical optimization

If the agile relic hunter chooses scholarly ambitions, or the Charisma-oriented Jedi chooses martial mastery, the engine should accept the stated **intent**, preserve the distinction from current **aptitude**, and recommend a viable development path. It must not silently override the player or claim an illegal choice is available.

---

## 6. Scoring and semantic interpretation requirements

### 6.1 Distinct evidence channels

1. **Mechanical evidence:** class, ability modifiers, species traits, actual canonical mechanics and legal access.
2. **Player-declared intent:** chosen career statement, methods, role, playstyle, intended direction.
3. **Legality / build planning:** actual rules authorities for what can be selected at Level 1 and what may be reachable later.

These channels must not be conflated. High DEX may cause an athletic question to be *shown*, but **being shown** that question must not itself earn an athletic player-preference bonus. The preference signal comes from the player's **answer**. Likewise a Q2–Q4 mentoring explanation or preview must not generate inferred preference weight just because it was displayed.

### 6.2 Evidence and hierarchy

- Use **exact canonical IDs** for parent/specialization candidates and for genuine mechanical references.
- Only use validated **ontology tags** for canonical semantic-tag fields; do not introduce improvised synonyms.
- Keep **primary vs. supporting** tag distinctions; parent tags are **not inherited** by children.
- Foundation-class compatibility is a strong selection prior, not class ownership or a permanent identity assignment.
- Preserve purposeful narrative intents separately if they lack an exact tag (e.g., bounty contract vs public-service motivation). Do not force that nuance into an inaccurate ontology tag.
- Centralize scoring rather than keeping independent, manually authored numeric archetype bias maps per class survey.
- Maintain inspectable explanations (“You chose X; your mechanics support Y; these are the relevant canonical archetypes”).

### 6.3 Why follow-ups are still necessary

A direct review found **27 groups of archetypes with exactly the same primary-tag sets** (61 records in those groups). Examples:

- Bounty Hunter and Sector Ranger: `investigation`, `perception`, `pursuit`, `survival`, `tracking`.
- Free Trader and Diplomat: `knowledge`, `persuasion`, `social`.
- Con Artist and Propagandist: `deception`, `manipulation`, `persuasion`, `social`.
- Explorer and Prospector: `exploration`, `perception`, `survival`.

These are **not automatically errors**. Some identities differ by purpose, supporting tags, narrative, species/context, or exact mechanics. The adaptive question bank must distinguish such ties using supported evidence instead of fabricating new mechanical tags.

### 6.4 Question bank and selection

Prefer a **small curated collection of reusable question prompts** and a **data-driven bank of first-person answers**, rather than hundreds of fixed class-survey question scripts. Author unique statements where the archetypes genuinely require different meanings, not merely for variety.

For Q3/Q4, choose two **different** credible contextual challenges for the Q2 parent. Prefer useful discrimination among player methods and potential child directions, while avoiding selection of Q4 based on the Q3 response. If aptitude conflicts with declared ambition, mentoring text can explain legal development routes; do not turn that into a forced question branch.

---

## 7. Relationship to existing code and refactor boundary

The currently reviewed Level 1 survey is a class-dependent fixed-question implementation with manually authored `detailTags`, `archetypeHint`, `mechanicalBias`, `roleBias`, `attributeBias`, and related intent dictionaries. The newer 297-record SSOT is available through `ArchetypeRegistry` APIs such as `getParents()`, `getChildren(parentId)`, `getArchetype(id)`, and `getByClassRoute(classId, tier)`.

**Desired eventual cutover:** one canonical archetype registry + one answer bank keyed to exact identities and canonical tags + one adaptive Q2 parent-ranker and Q3/Q4 pair-selector + one centralized intent-weighting interpreter, with class/PRC-specific mentor dialogue layers. Do not maintain a competing archetype identity table or invent shim/crosswalk logic just to preserve the old survey mappings.

No code has been modified for this proposal. A concrete implementation plan, source read, tests, and explicit approval are needed before altering production survey flows. Existing multiclass and prestige surveys remain separate.

---

## 8. Questions still open — do not silently treat as settled

**v0.11 status correction:** The five class Q1 banks and all 97 universal / 485 class-specific Q2 answer strings are now **authored**. Earlier entries here describing these as not yet written are historical; **editorial approval, mechanical evidence mappings, ranker design, and integration remain open**. The following list should be read as implementation/content-certification questions, not an instruction to rewrite the completed banks from scratch.

1. **Q1 mechanical provenance and approval:** Five class-specific banks and the five-directions-plus-undecided structure are already drafted/reviewed. Confirm any outstanding individual editorial choices and finish canonical Q1 option-to-tag/typed-mechanic mappings, class legality and zero-bias undecided semantics.
2. **Q2 slot policy:** Strictly fixed A/B for each class or highest-ranking class-rooted options **after Q1**; C/D/E diversity; exploration and browse/return UX.
3. **Q2 ranking calibration:** Exact class, species, attribute and **Q1 direct-intent** weightings; parent-vs-child treatment; tie resolution; deterministic restoration; how to represent confidence.
4. **Metadata cutover execution:** Verify the current repository branch and precisely connect `data/archetypes.json`, selected chargen state, legal mechanics, Q1 answer bank, Q2 selector, and existing survey/mentor consumers **without a parallel authority or shims**.
5. **Canonical answer authority:** Versioned local Q2 Markdown/JSON now exists for 97 parents x five classes. Validate its loader/schema and exact parent-ID match at runtime, while retaining `data/archetypes.json` as identity and mechanical authority. Q3/Q4 metadata bank design remains open. Do not duplicate canonical meaning authority.
6. **Species and class legality:** Distinguish current features and legal skills/talents/feats from possible future options. Build class-specific teaching from validated sources, not inferred tag semantics alone.
7. **Scenario pool:** Q3 and Q4 share one **many-to-many** bank and are selected as distinct contexts independent of each other's answer; no fixed target count. Author coverage for 97 parents and useful distinctions among 200 children.
8. **Scenario answer UX:** Five initial methods plus "Something else" and optional explanations; size, certification, accessibility and narrative tone of alternate answers.
9. **Mentoring nudges:** Exact Q2–Q4 instructional microcopy/expandable explanations, mechanic authority, and avoiding prompted self-fulfilling preference reinforcement.
10. **Q5 design:** Ask for long-term mechanical end state vs future specialization vs advancement priority/tradeoff; determine answer personalization, strength of declared intention, and persistence alongside subsequent observed behavior.
11. **State and navigation:** Confirm pending class/species/attributes fields, draft invalidation/reconfirmation when Q1 is edited after Q2, and no double-injection when completed answers are edited.
12. **Testing:** Five foundation classes; divergent same-class characters; unconventional chosen careers; identical-tag ties; standalone parents; 297-identity reachability; droid route; Q2 pages; Q3/Q4 scenario independence; repeated choice reinforcement; accuracy of class-feature/skill/talent explanations.
13. **Scope boundary:** Later multiclass and prestige interviews and ongoing Mentor guidance remain distinct; no development branch, commit plan, or implementation authorization in this design conversation.

## 8A. Verified current survey scoring and weight reuse (2026-11-10)

**Finding:** We have already implemented additive, repeated-answer intent reinforcement. No new per-question reinforcement engine is justified by this design. What remains is connecting the new adaptive answer bank and 297-archetype canonical identities/tags to the established scoring boundaries, avoiding duplicate sources of authority.

### 8A.1 What Level 1 survey answers do today

Source: `scripts/mentor/mentor-survey/engine.js`.

- `convertSurveyAnswersToBias(answers)` adds selected answers' `biasLayers.mechanicalBias`, `roleBias`, and `attributeBias` numerically, key by key. If three answers express the same independent preference, their corresponding weights accumulate; the survey layer does **not** apply diminishing returns per repeated answer.
- `extractSurveyIntentTags(answers)` builds numerical `skillBiasWeights`, `featBiasWeights`, `talentBiasWeights`, `prestigeClassWeights`, `backgroundBiasWeights`, and `attributeBiasWeights`. For skill/feat/talent/prestige/background arrays, each occurrence contributes `+1`, and multiple selections accumulate. The sorted string lists (`skillBias`, etc.) are derived from the numerical maps. `detailTags` are deduplicated for display, so they do not independently count repeated appearances.
- `buildArchetypeScores(definition, answers)` gives each selected `archetypeHint` `+3`; for locally defined class archetypes it adds dot products of chosen mechanical, role and attribute biases with archetype vectors; then returns the top three. This is the **legacy five-archetype class-specific scoring**, **not** scoring of the 297 canonical SSOT records.
- No negative effect or arbitrary repeated-answer penalty exists in this survey aggregation. Do not confuse a repeated *independent* choice with accidentally applying a single answer twice through overlapping downstream bias lanes.

### 8A.2 How identity uses those scores

Source: `scripts/engine/prestige/identity-engine.js`.

- `IdentityEngine.injectSurveyBias()` **replaces** the existing `system.swse.surveyBias`, avoiding accumulation when editing/re-finalizing the same survey. Survey signal is then combined additively with class chassis, observed feats/talents/attributes/skills, equipment, base archetype, specialist, prestige, and reinforcement layers in `computeTotalBias()`.
- `computeSurveyBias()` adds the L1 survey and completed base-class survey biases, then scales the combined survey layer by `max(0.175, 1 - baseClassLevel / 20)`; at base-class level 1 the multiplier is `0.95`. This is **progression-time decay**, not punishment for agreeing with yourself across questions.
- The method named `computeReinforcement()` is specifically for **prestige-class deepening** of an archetype; it is **not** how L1 answer repetition is reinforced.
- `scripts/apps/progression-framework/steps/l1-survey-step.js` injects and stores survey-derived weights only after the questionnaire is completed and explicitly finalized. A partially answered survey remains a draft. The step preserves the selected answers and weighted intent alongside the session selection.

### 8A.3 How recommendations consume evidence

- `scripts/engine/suggestion/Level1SkillSuggestionEngine.js`: an intended skill receives `min(2.5, surveyWeight * 0.9)` points, in addition to class skill, attribute, species, background and other signals. Therefore repeated answers strengthen a skill preference, but a **downstream skill-score cap** can prevent unbounded dominance.
- `scripts/engine/suggestion/BackgroundSuggestionEngine.js`: matching survey-intended skills contribute `1.8 * sum(matching skillBiasWeights)` to the background score; other sources of relevance remain distinct.
- `scripts/engine/suggestion/SuggestionScorer.js`: three-horizon final candidate score begins with `0.60 * immediate + 0.25 * shortTerm + 0.15 * identity`, plus eligible bonuses, capped at 1.0. Within immediate scoring, tag alignment is one weighted metric (0.20 when active), alongside route confidence, ability alignment, loadout, and other relevant metrics; this is **candidate recommendation** scoring, not the Level 1 Q1 parent-selection formula.
- `scripts/engine/suggestion/tag-signal-engine.js`: identity, mentor, archetype, themes, equipment and route signals are merged via `max` per tag (with source factors); matching candidate tag weights sum, and alignment is capped by `min(1, total / 5)`. This prevents summing multiple *source lanes* for the same tag while preserving accumulated preference strengths inside a lane.
- `scripts/mentor/mentor-suggestion-bias.js`: separately uses mentor memory/committed paths to apply soft multiplicative bonuses, distinct from the survey's additive answer weighting. The suggestion scorer caps the boosted final score at 1.0. Do not mistake this older committed-path helper for a 297-SSOT implementation.

### 8A.4 Architectural boundary and approved interpretation

- **Established behavior:** Repetition across independently selected answers increases numerical intent weights; mixed answers preserve multiple interests. Final recommendation engines apply their own bounded scoring policies. This is broadly consistent with the player's requested Q1-Q5 reinforcement behavior.
- **Not yet established:** A unified Level 1 Q1-Q5 adaptive selector using 297 canonical archetype IDs and Phase 12B certified tags. Phase 12B closeout explicitly confirms that it made **no changes** to BuildIntent, SuggestionScorer, Mentor, UI or live ranking; `class-archetypes.json` remains a legacy consumer dependency in the prior audited runtime. We must verify the eventual cutover against current branch state before implementation.
- **Design requirement:** Reuse existing additive survey intent and downstream score-capping principles. Replace outdated local archetype identifiers and uncontrolled ad hoc bias aliases with exact canonical archetype IDs/tags and typed mechanical evidence. Keep career intent, player-selected technique, and mechanical capability distinguishable. Do not duplicate the same answer's contribution across newly overlapping lanes.
- **Testing:** Repeated independent defense choices should increase intent strength; conflicting preferences should coexist; changed/replayed answers should replace rather than stack old weights; a `Something else` Q1 navigation action should not count as intent; parent and specialization scoring must remain meaningful even without children; downstream caps and ranking need regression checks.

**Status:** Repository-code findings are verified from read-only GitHub inspection. No scoring code was edited; numeric choices for the new Q2 parent ranking and canonical-SSOT scoring remain open, but the accumulation/reinforcement policy itself does **not** need to be recreated.

---

## 8B. Shared situational-question pool for new Q3 and Q4 (renumbered v0.7)

**Agreed concept:** There is **one shared pool of authored situations**, usable for **either new Q3 or new Q4** (previously called Q2/Q3). A number like “100 questions” was an **illustration of pool reuse, not an agreed count or quota**. The former 16-family / 16-Q2 / ~160-answer estimate is **not** an active target; pool size is determined by coverage and quality.

**Scenario reuse:** Each scenario can suit multiple canonical parents (many-to-many) and may distinguish related children. Jedi Consular and a mystic-oriented archetype may receive the **same Force-related situation**; overlap is expected, not an error. Answers record preferred methods and mechanical interests, not moral alignment.

**Question selection:**

1. Use the **Q2 declared career parent** and actual starting character mechanics to choose **two different plausible situations** from the same pool.
2. Select the pair without conditioning **Q4 on the answer to Q3**; different contexts should elicit independent preferences. This does not prohibit a preference being repeated and reinforced.
3. An individual scenario may be Q3 for one character and Q4 for another. Position indicates interview order, not scenario ownership.
4. Use first-person KOTOR dialogue with **five substantive initial answers plus “Something else”** to reveal more legitimate methods. The number of candidate answers per scenario remains undecided.
5. Use exact parent IDs, verified ontology tags, and validated skills/class-feature/talent relationships. Record only deliberate chosen answers as survey intent, additively, without extra credit for which options the class mentor displayed.
6. Permit nonstandard class/career combinations and all 27 standalone parents; do not invent children just to create differentiated answers.

### Illustrative reusable scenario families — not an approved fixed count

Protection, melee, ranged combat, exploration, investigation, diplomacy, leadership, technology, medicine, piloting, espionage, survival, Force practice, commerce, scholarship, underworld. These are **editorial retrieval groupings**, not canonical ontology tags.

### Content planning and verification

- First build a **scenario-to-parent coverage matrix** for all 97 parents and review discriminating evidence for 200 specializations.
- Require two distinct credible contexts per parent, with opportunities for both repeat-consistent and complementary player methods.
- Include shared contexts across related careers; author specialized situations only when truly needed.
- **Build class-relevant mechanics into answer options themselves**, with short optional explanations where useful: the chosen approach corresponds to certified class skills, class features, or legal future talent/feat directions. Distinguish current features, class-skill access, and possible future selections.
- Define counts only after coverage and class explanation reviews; no fixed numeric authoring target.

**Status:** Shared-pool design and Q3/Q4 independence are agreed. Actual question inventory, response mappings, selection formula, teaching microcopy, and Q5 form are unimplemented and remain to be approved.

## 9. Decisions and provenance status

| Topic | Status | Record |
|---|---|---|
| Level 1 only; no forced prestige/multiclass decisions | **Agreed** | Distinct future interview design. |
| **New Q1 class-specific development question** | **30 Q1 answers drafted/reviewed** | Five class banks with six answers each. Some wording explicitly approved; exact canon tag/mechanic evidence mappings and implementation pending. |
| **Q2 universal career-calling prompt** | **97 universal + 485 class-specific responses drafted** | Former Q1; exact parent aspiration chosen using class + species + attributes **and Q1 answer**. Ranking logic not implemented. |
| **Canonical metadata connection is Priority 1** | **Agreed** | Wire existing SSOT tags/typed mechanics + pending chargen state to ranking and survey/suggestion consumers before designing new scoring authority. |
| **Q2 five-career menu with repeat-free F pagination** | **Owner-approved (v0.12)** | A/B: two strongest class-relevant selections, using approved four-career class anchor pools as preferred candidates, not an absolute whitelist. C/D/E: next three highest-ranked unused careers. F: next five ranked unseen careers, no repeat on any page. Q2 is optional; F records no intent. |
| First-person KOTOR-style dialogue | **Agreed** | Player voice distinct from typed canonical intent data. |
| Parent career / specialization child | **Verified/Agreed** | 97/200/27 standalone; no inherited child tags. |
| Relevance ranking not eligibility | **Agreed** | Class/ability/species/Q1 influence visibility; player Q2 choice takes precedence. |
| **New Q3 and Q4 shared situation bank** | **Agreed** | Two different contexts for Q2 parent; selected independently of one another's answers; count open. |
| Repeated preferences reinforce independently | **Verified existing behavior / preserve** | Existing survey intent additive; avoid double counting one answer by two pathways. |
| **Q2–Q4 class-mechanics answer choices (D14)** | **Agreed correction, v0.8** | Answers themselves embody potential class skills, talent directions, and class features for the selected class; explanations are supplemental. Never imply ownership or legality without checking. |
| **Class/PRC-specific mentor ownership and voice** | **Agreed correction, v0.8** | Miraj is Jedi-only. Every foundation class and every prestige class has its own mentor persona and distinct dialogue voice. Share underlying scenario/metadata authority, not a universal narrator. |
| **Static mentor stage dialogue with shared underlying questions** | **25 intro lines authored (J0-N1 explicitly approved)** | Five mentor-specific fixed stage lines (Q1-Q5). Adaptive selection/scoring is separate; not yet integrated. |
| Q5 long-term build-intent purpose | **Agreed as goal; exact design open** | Identify what the player wants to keep building toward; not another morality, equipment, or reactive situation question. |
| Exact Q1 tag mapping, ranking weights, Q3/Q4 content, Q5 answers | **Not finalized** | Existing Q1/Q2 dialogue wording is drafted. Source/legality validation and design review remain. |
| Git/repository modifications | **None authorized** | Local rolling document only; no commit/push. |

## 10. Next recommended work (when authorized; current v0.12 priorities)

1. **Freeze content inventory, not editorial acceptance:** Retain the five Q1 draft banks, 25 mentor-intro lines, 97 universal Q2 career statements and 485 class-specific variants. Review/edit them incrementally; do not restart authoring. Keep exact `parentId` + foundation class ID as the dialogue lookup key.
2. **Certify Q1 intent metadata:** Tie each deliberately selected Q1 development direction to existing frozen-ontology tags and exact mechanics only where source-proven. 'Undecided' must produce no positive/negative preference vote. Passive features/grants must not masquerade as player intent.
3. **Audit pending chargen evidence:** Establish the exact selected class, effective species variant/grant ledger, and final current attributes from the active progression session. Use numeric ability scores, not fabricated attribute semantic tags.
4. **Build the deterministic, testable Q2 ranker:** Read all 97 SSOT parents; score class-route fit and Q1 explicit intent strongly, species/attribute compatibility supportively; produce two class-relevant A/B choices using the owner-approved 20-anchor preferred pools, followed by C/D/E as the three highest-ranked remaining parents. Weights and exact ranking tie-breaks still require calibration.
5. **Wire class-specific Q2 dialogue and repeat-free paging:** Display only first-person class-specific variants. F loads the next five highest-ranked unseen parents; after 97 are exhausted, show no repeated candidates. Every career can be reached through repeated pages. Allow leaving Q2 with no career selected; store only an explicitly chosen **canonical parent ID**, never navigation history as intent. An optional direct search/browser is not part of this approved F behavior and would require separate design approval.
6. **Define Q3/Q4 scenario system and author content:** One reusable, many-to-many scenario library. Select two distinct challenges using the chosen parent and available capabilities; **Q4 may not depend on Q3's answer**. Responses need source-accurate current-vs-future skills/talents/features where referenced.
7. **Settle Q5:** Define long-horizon ambition responses, evidence provenance, and persistence without treating career goals as acquired classes, feats, talents or abilities.
8. **Regression and performance gates:** Test all five classes, all 97 parent IDs/485 display variants, species/ability edge cases, Q1 changes, prior Q2 reconfirmation, skip behavior, cumulative but nonduplicated intent, deterministic ties, and current vs future mechanical explanations. No guessed runtime performance guarantees.
9. **Require explicit implementation/Git permission:** The authoring and plan remain local. No repository code changes, commits, PRs, or pushes are authorized by this checkpoint.

## 11. Canonical metadata reuse and evidence boundary (2026-11-13)

### 11.1 What the repository already has — do not duplicate

| Domain | Existing authority and data | How to use it for Q2 | Important limitation |
|---|---|---|---|
| **Parent archetypes** | `data/archetypes.json`, read by `ArchetypeRegistry.getParents()` / `getArchetype(id)`; 97 parents, 200 specializations (297 total) | `metadata.tags.primary`, `.supporting`, `.all`; `mechanics.classes.foundation`; typed `mechanics.skills`, feats, talents, talent trees, force powers, species and ability priorities where populated | Curated metadata is evidence, **not** a direct legality/entitlement grant; parent tags do not automatically flow to children |
| **Semantic ontology** | `data/audits/talent-feat-phase3-final-ontology.json`; frozen **190-tag** vocabulary; Phase 12B archetype curation | Reuse **existing** tags; compare class/Q1 mechanisms via verified canonical references | No new Q2-specific tag namespace, ad hoc class-career tables, or synonymous string matching |
| **Class** | Chargen class selection and canonical class data; parent foundation-class routes in archetype records | Class-route relevance, class skills/features that are actually supported and known at this point | A class is **not** a career identity and passive starting features don't prove personal interest; class data is not necessarily itself tagged with the same ontology |
| **Species** | `SpeciesRegistry` entries and chosen variant; canonical species traits, ability modifiers, skill bonuses, `tags`, pending species grant/effective context | Mechanically verified capabilities/aptitudes, variant-adjusted evidence, exact species links where applicable | Species' generic `tags` are **not guaranteed** to be members of the archetype's frozen ontology. Match typed mechanics rather than directly comparing incompatible tag vocabularies |
| **Attributes** | Actual six numeric ability scores selected during chargen, including species adjustments/effective choices as exposed by the pending session | Compare effective ability values with documented archetype ability preferences | Numbers are **not ontology tags**. No invented `ability_str` etc. semantic tokens; these shorthand tags were explicitly retired from Phase 12A's semantic lane |
| **Q1 response** | Authored class-specific first-person option chosen deliberately | Add verified ontology tags and typed mechanics **once**, with selected-answer provenance | Q1->canonical metadata mappings **not yet certified/implemented**; no vote for an undecided answer |

**Observed implementation boundary (read-only main source review, not runtime proof):** `scripts/apps/progression-framework/chargen-shell.js` places `l1-survey` after class; `scripts/apps/progression-framework/steps/l1-survey-step.js` still resolves a class-owned fixed survey definition, and `scripts/mentor/mentor-survey/engine.js` still aggregates legacy answer bias fields. `scripts/engine/archetype/archetype-registry.js` currently exposes both class-owned legacy and independent SSOT lanes, kept separate. **The new Q2 path should consume the SSOT directly** and replace its obsolete survey path; no shim or second identity authority.

**Authority order preserved from `archetype-ssot-contract.js`:** exact canonical identity > primary semantic tags > supporting semantic tags > class/access route context > narrative taxonomy. This is **evidence precedence**, not an approved numeric weighting table. A class route is still a strong practical relevance input for initial menu construction; its presence must never restrict an explicitly chosen parent.

**Preference vs capability:** Q1 and committed Q2 express user intent. A character's class, species and effective attributes support an evaluation of *capability and relevance*, not a conclusion that the player wants those things. Automatic starting feats, grants and defaults must not yield preference votes. An option being shown or browsed also yields none.

### 11.2 Proposed Q2 selection contract (design pending calibration)

1. Retrieve exactly the current **parent** records (`getParents()`), not child specializations or legacy class-owned identities.
2. Build a snapshot of actual pending class, selected/effective species, ability scores, and selected Q1 option ID with provenance; fail clearly on missing required context rather than silently inferring from a half-built Actor.
3. Rank each parent deterministically from available canonical evidence. Track an explanation/audit trace for each component; do not fabricate feature ownership from a tag.
4. Select (A) and (B) as **two class-relevant options**, preferring the owner-approved four-career class anchors while permitting a stronger Q1-matched canonical class-compatible career to displace an anchor. Fill (C), (D), and (E) with the **three highest-scored remaining parent IDs** from the global ranking. Never duplicate parent IDs within a page or across subsequent pages; neither slot order nor mere exposure counts as player intent. Numeric ranking weights and deterministic tie breaks remain to be calibrated.
5. Render the appropriate class-specific Q2 first-person text using `variants[classId]` keyed by exact `parentId` in the local bank. Internal mapping hidden from players. Neutral **F** advances to the **next five highest-ranked unseen** parents from the full 97-parent list (not a direct browser/search); keep the ranked candidate ordering stable for the current Q2 session. F is navigation **within Q2**, not a sixth substantive question, and creates no preference evidence.
6. Record only the **explicitly selected** `parentId` as career aspiration. **No selection is valid**: finishing/leaving Q2 without a selected career records `null` / no Q2 career-intent evidence, not a default or inferred parent. Preserve a committed parent choice on Q1 reranking (ask for reconfirmation when needed); do not silently overwrite it or add votes due to display order, class fit or species affinity.
7. Feed only deliberate choices into existing downstream intent/suggestion pathways; ensure replacement on edit, no duplicate counting across overlapping lanes, and no claim that parent intent grants mechanics or prestige status. **Open downstream design:** If the player skips Q2, Q3/Q4 must have a safe class/Q1-based scenario path or be skippable; they cannot fabricate a career choice.

### 11.3 Authored local artifacts and approval state

| Artifact | Role | Design state |
|---|---|---|
| `SWSE_L1_Mentor_Dialogue_Working_Draft_v0.3_2026-11-13.md` | 25 fixed Mentor stage-intro lines | Draft bank; J0-N1 five lines explicitly approved; other mentor text is current working selection |
| `SWSE_L1_Player_Response_Display_Contract_2026-11-13.md` | First-person-only player response UI rule | **Owner-approved** |
| `SWSE_L1_Q1_Jedi_Approved_Working_Design_v0.3_2026-11-13.md` | Jedi Q1 six-choice bank | Wording **owner-approved**; semantic/mechanic mappings unapproved |
| `SWSE_L1_Q1_{Noble,Scoundrel,Scout,Soldier}_Review_Draft_v0.1_2026-11-13.md` | Other Q1 development-choice banks | Authored/reviewed in conversation, final individual sign-off/mapping not assumed |
| `SWSE_L1_Q2_Canonical_Parent_Answer_Bank_97_v0.4_2026-11-13.md` | 97 universal first-person career aspirations | Full editorial working bank; first 25 endorsed examples |
| `SWSE_L1_Q2_Class_Specific_Career_Responses_Combined_97x5_v0.4_2026-11-13.json` | 97 canonical IDs + 485 first-person class variants + universal base response | Full editorial bank; machine-checkable text coverage, not sourcebook/mechanics certification |
| `SWSE_L1_Q2_Class_Specific_Career_Responses_Combined_97x5_v0.4_2026-11-13.md` | Human-readable complete class-specific Q2 bank | Local draft companion to JSON |

**Q1 development themes at a glance:** Jedi — Guardian, Sentinel, Consular, Watchman, Duelist, Undecided. Noble — Officer/Leader, Diplomat, Tactician, Mastermind, Public Figure/Patron, Undecided. Scoundrel — Pirate/Spacer, Trickster/Gambler, Gunslinger, Con Artist, Slicer/Saboteur, Undecided. Scout — Skirmisher, Explorer/Survivalist, Recon Marksman, Ranger/Tracker, Pilot/Outrider, Undecided. Soldier — Heavy Weapons, Armored Defender, Rifle Marksman, Brawler, Squad Leader, Undecided. **These labels are developer-only**; the player's UI must show only the authored first-person statements.

**Remaining authoring:** Q3/Q4 scenario bank and method-response library; Q5 substantive question/response bank. **Remaining integration:** Q1 canonical tag/typed-mechanic mappings; Q2 ranker and browse; pending-session context; lifecycle, intent provenance, selection persistence; five Mentor lines wired into proper speaker/UI slots; runtime and regression testing. All require separate explicit authorization before code changes.

## 12. Owner-approved Q2 class anchors and repeat-free career paging (2026-11-13; v0.12)

**Decision status: APPROVED DESIGN — NOT CODE, NOT RUNTIME TESTED.** Applies to the **Level 1** career-calling question only. Supersedes earlier speculative fixed-vs-dynamic A/B and F-as-browser descriptions. The parent IDs are actual canonical records already checked against the repository's `data/archetypes.json` snapshot; this is not a new class-owned archetype registry or a separate tag vocabulary.

### 12.1 Twenty preferred class anchors (four per foundation class)

| Foundation class / mentor | Preferred parent career | Canonical `parentId` | Distinct emphasis |
|---|---|---|---|
| Jedi / Miraj | Jedi Guardian | `jedi_guardian` | Lightsaber defense/protection |
| Jedi / Miraj | Jedi Consular | `jedi_consular` | Force knowledge, diplomacy, support |
| Jedi / Miraj | Jedi Sentinel | `jedi_sentinel` | Investigation, technology, hidden threats |
| Jedi / Miraj | Force Exile | `force_exile` | Independent Force path, survival |
| Noble / J0-N1 | Diplomat | `diplomat` | Negotiation and political relationships |
| Noble / J0-N1 | Merchant Prince | `merchant_prince` | Trade, wealth, organizational influence |
| Noble / J0-N1 | Spymaster | `spymaster` | Intelligence networks, strategic manipulation |
| Noble / J0-N1 | Community Leader | `community_leader` | Advocacy, practical leadership and support |
| Scoundrel / Ol' Salty | Smuggler | `smuggler` | Spacefaring, deception and improvisation |
| Scoundrel / Ol' Salty | Con Artist | `con_artist` | Social engineering and deception |
| Scoundrel / Ol' Salty | Gunslinger | `gunslinger` | Fast, precise ranged fighting |
| Scoundrel / Ol' Salty | Slicer | `slicer` | Computer systems and technical infiltration |
| Scout / Lead | Explorer | `explorer` | Discovery, fieldcraft and unfamiliar environments |
| Scout / Lead | Bounty Hunter | `bounty_hunter` | Tracking, pursuit and investigation |
| Scout / Lead | Sniper | `sniper` | Reconnaissance and precision marksmanship |
| Scout / Lead | Pilot | `pilot` | Vehicles and spaceflight |
| Soldier / Breach | Mercenary | `mercenary` | Frontline combat, endurance |
| Soldier / Breach | Bodyguard | `bodyguard` | Defensive protection of others |
| Soldier / Breach | Commando | `commando` | Small-team infiltration and operations |
| Soldier / Breach | Field Commander | `field_commander` | Squad command and tactics |

All 20 have an explicit foundation-class route matching the listed class in the checked canonical snapshot. **Preferred does not mean exclusive:** for example, a Soldier's Heavy Weapons Q1 preference can raise `starship_gunner` or another relevant class-compatible parent; a Jedi is not blocked from the other 93 careers. No class, species or build gates are applied to selecting narrative career aspirations.

### 12.2 Initial Q2 page (approved layout)

1. Compute one deterministic, provenance-aware ranking of all 97 parents from current class + Q1 choice + actual species mechanics + current effective attributes. Keep mechanical fit distinct from player-declared preference.
2. Select **A and B** as two meaningfully distinct class-relevant candidates, **preferentially** from the listed class's four anchors. Q1 relevance can elevate other strongly matched, class-compatible parents. A/B are not mandatory static IDs; neither selection nor anchor membership alone proves a player preference.
3. Remove chosen A/B parent IDs from the global ranked candidate list. Fill **C, D, E** in descending rank order with the **three highest-scoring remaining** parents, irrespective of their starting-class route. Do not sacrifice the strongest remaining rank to enforce an arbitrary thematic mix.
4. Present **five first-person class-specific response strings** for A–E, no parent names, labels, ranking evidence, or IDs in the player UI. The six-choice display also has **F**, a first-person navigation utterance such as 'I want to hear about some other possibilities.' Its exact text is open for editorial approval.

### 12.3 F: next five unseen parents, never re-roll duplicates

- F is a **navigation action**, not a selected career and not an additional substantive survey question.
- On the first F, display the **next five highest-ranked parent IDs not previously displayed**. On another F, display the next five again; continue until all 97 have been exposed. The first-page A/B/C/D/E IDs count as already seen.
- Do **not** repeat parent choices already shown on any earlier page of this Q2 visit. Keep a `seenParentIds` set and a stable ranked snapshot/cursor. If fewer than five unseen IDs remain, display only the remainder (e.g. the last page can have two). On exhaustion, F must not loop back to previously shown careers.
- Recalculating because the player changes Q1, class, species or attributes is a **new context revision**; a new ordered snapshot and paging state may be deliberately rebuilt. Never silently erase a parent the player has already explicitly selected; request reconfirmation when appropriate. Back/forward page navigation, if added, does not create new intent.
- The approved F interaction is **paged discovery**, not the direct searchable 97-parent browser described in older proposals. All careers remain discoverable through repeated F paging. Search would be a separate, later UI decision.

### 12.4 Opt-out / no career selected

- **Player may decide none of the offered careers is right**, including after any number of F pages. They can proceed without selecting a Q2 career. This is a valid, neutral outcome, not a failure to complete character generation.
- Record **no `parentId` career declaration** and **zero Q2 career-preference evidence**. A recommendation being shown, skipped, revisited or paged over does not count as intent. Do not quietly choose a default or infer the career from their class.
- Q3/Q4 scenario handling for a skipped Q2 remains an **explicit design follow-up**: use an appropriate class/Q1-only neutral scenario strategy or permit those questions to be skipped, but never invent a selected career to drive them.
- The optionality applies even when player has selected Q1; Q1 intent remains independently valid. The same general no-coercion principle applies to skipping the optional interview entirely.

### 12.5 Implementation acceptance tests (pending permission)

1. All 20 preferred anchors exist as canonical `kind: parent` records with the exact corresponding foundation class route; malformed IDs fail validation.
2. A/B are distinct class-relevant choices; a stronger Q1-aligned non-anchor can displace an anchor without promoting an ineligible/illegitimate current ability.
3. C/D/E are exactly the **three top-ranked unselected parent IDs** following A/B removal (stable tie-breaks); no duplicates on the opening page.
4. F yields the **next five highest-ranked never-before-shown** candidates on each page (no repeats across any Q2 pages), and handles a final page shorter than five.
5. F and page navigation generate **zero player preference weight**. Picking a career commits the exact parent ID; leaving without selecting commits no career intent.
6. Q1/context edits cannot silently preserve stale ranking/page state or overwrite a deliberate career selection.
7. Results remain deterministic for a fixed context; all 97 parent careers are discoverable, including unconventional pairs and standalone parents.

**Remaining decisions:** precise numerical rank weights and tie-breaks, optional direct browse/search UI (not included in F), approved first-person F wording, and Q3/Q4 no-career fallback design. Nothing in this section authorizes repository changes or implementation.

## 13. Q3 class situations / Q4 parent situations — v0.13 design update

**Owner-approved structural decision:** Q3 and Q4 are no longer a symmetric pair of career situations. **Q3 is class-specific and keyed to the chosen Q1 development answer; Q4 is parent-career-specific and keyed to the chosen Q2 canonical parent.** Q4 selection must not depend on the Q3 answer. This section supersedes earlier shared-pool Q3/Q4 language, including the v0.7 and v0.12 tables and previous §8B, where inconsistent.

| Stage | Question authority | Optionality / no-answer behavior | Content status |
|---|---|---|---|
| **Q3 — Class Situation** | Starting class + exact Q1 choice; class-owned scenarios. | Every one of six Q1 choices per class has a route, including a neutral `undecided` route; no Q2 career is required. | **30 first-pass questions drafted; not approved yet.** |
| **Q4 — Parent Career Situation** | Explicit selected Q2 canonical parent ID + actual class/mechanics. Does **not** branch from the Q3 answer. | When Q2 has no selected parent, Q4 must allow a neutral no-career path or skip. Do not infer a parent; precise UX pending. | **Not yet authored**; shared many-to-many *parent-career* scenarios remain appropriate for Q4. |

**Q3 scenario bank:** `SWSE_L1_Q3_Class_Specific_Situation_Question_Bank_v0.1_2026-11-13.md` — local design-only Markdown with 25 directed scenarios (one per substantive Q1 answer across Jedi, Noble, Scoundrel, Scout, Soldier) plus five neutral fallback scenarios for the five `I'm not sure yet` responses. Each entry contains a scenario and one situational question. This is an editorial proposal, not approved or implemented.

**Q3 response authoring remains open.** One Q3 scenario is selected based on Q1, but the eventual first-person answers must meaningfully distinguish how the character would act; they must not all merely reinforce the original Q1 interest. Responses need valid, class-aware intent metadata using existing canonical ontology/typed mechanics, with current and possible future capabilities kept distinct. No new tag taxonomy, ranking shim, or automatic career inference is authorized. Neutral Q1 cannot itself become preference evidence.

**Mentor-stage dialogue editorial dependency:** The five previously accepted Q3 Mentor introductory lines may imply a chosen career. Their persona and fixed-stage presentation contract remain authoritative; **review and revise the Q3 stage-specific wording for class scenarios as a separate approval task**. The Q4 intros should instead precede the selected parent-career situation. No change to mentor dialogue has been approved here.

**Implementation boundary:** New Q3/Q4 content is local-only. No commits, pushes, live survey changes, or revision of character progression state. The existing prior sections are preserved for provenance, with this v0.13 section controlling their current interpretation.

---

## 14. Q3 standard question wording — v0.14 editorial update

**Current working Q3 presentation:** The selected class Mentor gives its existing fixed Q3 introduction. The engine presents **one narrative situation determined by the exact Q1 class-development selection**. Every class and every one of the 30 scenarios then uses the same short follow-up question:

> **What would you do?**

This replaces the 30 custom situational interrogatives, which occasionally steered players toward protection, investigation, leadership, or other preselected responses. The situation should provide the stakes, constraints, and relevant facts; the generic question preserves room for freely choosing a method. Then show first-person answer options, whose selection alone produces verified intent evidence. Do not change scenario identity, Q1 routing, or the Q4 parent-career contract. This short question is not an extra survey question.

**Scenario reference:** `SWSE_L1_Q3_Class_Specific_Situation_Question_Bank_v0.2_2026-11-13.md` has all 30 unchanged narrative situations and one standardized prompt. The older v0.1 file remains historical reference only. The player should not see the developer-only Q1 labels or IDs.

**Editorial follow-up:** Some previously approved Mentor Q3 introductions already end in an instruction to describe an action. Keep their voice/approval intact now, and inspect whether the separate standard prompt creates redundant phrasing before implementation; any targeted Mentor dialogue changes require separate review. The 150 first-person Q3 response options (five per scenario) and their certified canonical evidence remain to be authored.

---

## 15. Q3 first-person response bank — v0.15 editorial update

**Authoring checkpoint:** 30 class-specific Q1-routed Q3 scenarios × five first-person reply options = **150 new option texts**. The previously authored 30 narrative situations and uniform “What would you do?” question are preserved exactly. See Q3 bank v0.3 in both Markdown and JSON. This section updates the Q3 status in older §§3, 13 and 14; their old “responses uncreated/pending” wording is now historical only.

**User-facing response surface:** The five replies appear as first-person quotes only, without Q1 direction labels, editorial focus, ontology keys or other developer-facing fields. The chosen character class determines which scenario pool can be used; the exact Q1 answer selects one of the six class routes. Parent career selection is **never** a Q3 input. The `Undecided` route exists for each class and never converts an undecided Q1 answer into a preference.

**Preference treatment:** Five options per scenario explore distinct methods instead of merely affirming the Q1 specialty. One explicit Q3 selection may contribute distinct class-development intent even if it differs from Q1; never assign weight for the displayed-but-unselected choices, passive class/species grants, equipment fiction or a skipped question. Avoid duplicate counting across Q1/Q3 evidence lanes; exact weights remain a separate decision.

**Editorial-focus metadata:** The v0.3 JSON contains noncanonical, developer-only `editorialFocus` descriptions to aid review. They are **not approved ontology tags or mechanical authority**. Before implementation, map these authored replies to the existing frozen 190-tag ontology and exactly identified, verified rules/mechanics. An authorial phrase such as “precision shooting” does not certify a particular talent, feat, skill rank, weapon proficiency or capability. Failure to establish a canonical correspondence is an unresolved QA issue, not permission to invent a bridge.

**Required next work:** (1) Owner editorial review of 150 response phrasings; (2) certify Q1/Q3 answer IDs and intentional semantic/mechanical mappings; (3) revise five Q3 fixed mentor introductions separately to suit **class** rather than **career** situations and avoid duplicating “What would you do?”; (4) design Q4 parent-specific scenario bank independently; (5) implement/test only after explicit authorization. No GitHub changes approved.

## 16. Q4 — Parent Career Situation: ready-to-author handoff (v0.16)

**Status: DESIGN SCOPE AGREED; Q4 NARRATIVE NOT YET AUTHORED OR IMPLEMENTED.** This section is a specification for the next editorial pass, not a claim that any Q4 scenario/answer is approved.

### 16.1 Current five-question contract

| Stage | Source of adaptive question | What is deliberately recorded | Content checkpoint |
|---|---|---|---|
| **Q1 — Class Development** | Selected foundation class | One preferred development direction, or neutral | Six first-person answers per class, **30** total; draft/reviewed, Jedi owner-approved |
| **Q2 — Career Calling** | 97 parent archetypes ranked from class, verified species/attributes, and Q1 intent | An exact chosen `parentId`, or no career choice | **97 universal + 485 class-specific** statements; 20 class-anchor candidates and repeat-free paging approved |
| **Q3 — Class Situation** | Selected starting class **and Q1 answer** | One independently selected class/problem-solving approach, or none | **30 scenarios + 150 responses** drafted; full text embedded below |
| **Q4 — Parent Career Situation** | **Exact Q2 parent ID** (and known class mechanics for response relevance) | One independently selected professional method, or none | **Not yet authored.** Next work item |
| **Q5 — Long-Term Ambition** | Player's possible long-horizon build goals | Explicit future intent, not qualification/achievement | Fixed mentor intros authored; player choices pending |

### 16.2 Locked boundaries carried into Q4

1. **Q4 belongs to the Q2-selected parent profession, not the Q1 class route.** The same canonical parent may be selected by Jedi, Noble, Scoundrel, Scout, or Soldier; the situation must represent that career accurately regardless of class. A class may inform the *method choices* but must not replace or rename the career.
2. **Do not use the Q3 answer to select or rewrite Q4.** Situation selection may use the already-known Q2 parent, starting class and other pre-Q3 chargen facts, but not the player's Q3 response. Q3 and Q4 can both contribute deliberate preferences, independently and without double-counting.
3. **Q2 has a valid no-career outcome.** If Q2 was skipped/left unselected, Q4 must **not invent a parent** or treat a top recommendation as declared intent. Proposed default for owner review: Q4 is skipped/optional in that case, while Q3 remains fully available. This fallback requires explicit acceptance at Q4 signoff.
4. **Keep Q4 optional.** No response selection is valid. An unchosen scenario, passively displayed method, or automatic class/species grant produces no preference evidence.
5. **Keep the authored Mentor voice and player voice separate.** A fixed per-class Mentor Q4 introduction precedes an adaptive career situation followed by the uniform, neutral prompt **“What would you do?”** (proposed for Q4 to match Q3; exact owner approval pending). Player choices are first-person quoted statements only, with no visible labels, parent IDs, weights, or tags.
6. **Intent is not identity; identity is not eligibility; eligibility is not achievement.** Do not imply the L1 character already holds a later career title, owns equipment, has a trained skill, wields a Force power or satisfies prestige prerequisites merely because of a hypothetical response.
7. **Use existing canonical authorities.** Exact parent IDs, primary/supporting ontology tags, skills, feat/talent paths, class routes and verified species mechanics come from the existing registries. No new tag ontology, career authority, crosswalk/shim, or inferred entitlement.

### 16.3 Proposed reusable Q4 content schema (not implementation-approved)

A situation may be reusable across multiple **explicit** parent IDs when the narrative actually fits their profession. Each of the 97 parents needs at least one meaningful covered situation, but that does **not** imply writing 97 entirely distinct questions. Author and QA a **97-parent coverage matrix** with distinct situation and method IDs.

```json
{
  "scenarioId": "q4-example-negotiation-standoff",
  "parentIds": ["diplomat"],
  "situation": "A treaty negotiation stalls after one delegation accuses the other of hiding crucial information.",
  "prompt": "What would you do?",
  "responses": [
    {"optionId": "q4-example-a", "text": "I'd ask each side what evidence would restore their confidence in the talks."}
  ],
  "reviewStatus": "illustrative-not-approved",
  "canonicalEvidenceStatus": "not-mapped"
}
```

The sample is **not** a completed five-answer scenario and must not be treated as a production-ready record. The Q4 content package should ultimately provide a meaningful set of first-person options for each presented scenario. Maintain option identities separately from dialogue strings and connect each selected option to **verified** semantic/mechanical references as a separate QA gate.

### 16.4 Suggested Q4 editorial sequence

1. **Coverage inventory:** Enumerate all 97 `kind: parent` records from `data/archetypes.json` and record their dominant canonical career role, verified primary/supporting tags, relevant class routes, and a proposed Q4 situational theme. Do not generate brand-new identities.
2. **Scenario families:** Group compatible parents by *real* professional dilemmas (e.g., responsibility under pressure, a contract complication, discovery with uncertain evidence, repair/recovery under resource constraints, institutional conflict, pursuit or rescue, Force tradition and competing obligations). Category/family names are editorial only, not semantic tags or scoring weights.
3. **Small pilot:** Draft and review a few contrasting parents before scaling, ideally Diplomat, Bounty Hunter, Droidsmith, Jedi Guardian, and Smuggler; check that each challenge genuinely concerns the chosen profession rather than relabeling a Q3 class situation.
4. **Full coverage:** Create all remaining scenarios using shared situations when appropriate, while keeping the selected parent's perspective explicit and preserving access for unconventional class+parent combinations.
5. **Answer development:** Draft **five differentiated first-person method choices** per scenario as a working target (as with Q3). They should probe professional judgment, information gathering, problem-solving, support, technical skill, tactical action, or relevant Force methods only when the situation warrants them; do not require the player's prior Q1/Q3 answer.
6. **Mechanical certification:** Map each method response to the frozen 190-tag ontology, exact applicable skills/talents/feats/Force abilities where supported, and distinguish current capabilities from later development. Uncertified matches remain unresolved rather than inferred.
7. **State and QA:** Verify every parent can reach a valid Q4 question, Q2 nonselection is harmless, Q4 never depends on the Q3 response, no accidental repeated counting, and no change to canon identity/eligibility. The whole survey remains optional.

### 16.5 Q4 open decisions for owner review

- Whether Q4 uses the same short neutral prompt **“What would you do?”** as Q3 (recommended, not yet approved).
- Whether Q4 should **skip automatically** if Q2 was left blank, or offer an explicitly career-neutral situation without implying a parent (recommend skipping to preserve Q4's parent-only role).
- Whether the parent-coverage library should contain **one minimum scenario per parent** plus reuse (recommended) or a larger curated scenario pool to vary repeated playthroughs.
- How much class influence Q4 answer choices should receive without making each parent's professional dilemma class-owned.
- Exact response-to-ontology references, numeric weights, and persisted Q4 preference shape remain undecided and require certification.

### 16.6 Required implementation gates (not permission to implement)

- Q4 content QA and author signoff; unapproved wording remains draft.
- Runtime class/species/attribute snapshot and Q1/Q2/Q3 pending state tested in the V2 progression shell.
- Deterministic Q4 scenario selection from exact Q2 parent identity; independent from Q3 selected option.
- First-person-only UI; no hidden career autoassignment or default choice; no automatically inferred preference evidence.
- Regression proof that no question grants mechanics, overrides legality or creates a new archetype authority.
- **Local design only.** No code, Git commit, push, PR, or migration has been authorized.

---

## APPENDIX MASTER BANK — Q1/Q2/Q3 FULL TEXT (v0.16)

This compendium is included **in this same rolling Markdown** so that the design can be reviewed without locating companion files. It reproduces source-authored wording; metadata and career IDs are **developer-only**. Preserve the JSON files as structured QA/reference inputs, not as new mechanical authorities.

### A. Mentor stage-introduction bank — 25 authored lines

**Editorial caution:** These five fixed lines per mentor were authored before the Q3/Q4 division. Some Q3 lines refer explicitly to a *career* even though Q3 now tests the *class*; they remain quoted faithfully here and require a targeted rewrite and approval. J0-N1's original five lines were expressly approved in their earlier context; this does not imply automatic approval of revised Q3 lines.

#### Jedi — Miraj

- **Q1 fixed introduction:** “Before we begin, tell me what you'd like to learn. Not what you believe you're supposed to be good at, but what you genuinely wish to understand.”
- **Q2 fixed introduction:** “Now, answer honestly. I'm not looking for the answer you think I want to hear. What sort of life would you choose for yourself?”
- **Q3 fixed introduction:** “Let us imagine you've begun following that path. Something happens that requires a decision, and the choice is yours to make. How would you respond?”
- **Q4 fixed introduction:** “Very well. Now consider something different. What served you before may not serve you here, so tell me what you would do.”
- **Q5 fixed introduction:** “You needn't know every step of your journey today. Even the most certain among us can find ourselves somewhere unexpected. But tell me, who do you hope to become?”

#### Noble — J0-N1

- **Q1 fixed introduction:** “Inquiry: Master, which of your abilities would you most like to cultivate? I can assess your aptitudes with considerable accuracy. Your personal interests, however, require your input.”
- **Q2 fixed introduction:** “Observation: The most efficient career is not necessarily the most fulfilling one, Master. I would be interested to know which profession you would choose for yourself.”
- **Q3 fixed introduction:** “Hypothetical Scenario: Let us assume you have successfully entered your chosen profession, Master. An unexpected complication has arisen. How would you prefer to resolve it?”
- **Q4 fixed introduction:** “Cautionary Observation: A different set of circumstances now requires your attention, Master. I advise against assuming that a familiar approach is always the correct one. How would you proceed?”
- **Q5 fixed introduction:** “Personal Admission: I can calculate the probability of your success, Master. I find myself rather more concerned with whether that success would make you happy. Who do you hope to become?”

#### Scoundrel — Ol' Salty

- **Q1 fixed introduction:** “Arr! Pick yer path wisely, matey! The right tricks make the difference between a chest o' credits and a long walk out a short airlock.”
- **Q2 fixed introduction:** “Every spacer's chasin' somethin', matey. Credits, glory, freedom, maybe a ship worth callin' yer own. So tell ol' Salty, what sort o' life are ye chartin' a course for?”
- **Q3 fixed introduction:** “A fancy ship won't save ye if ye can't lie, sneak, or think fast! Now, every good job's got a way o' turnin' sour. Let's see how ye'd handle a little trouble.”
- **Q4 fixed introduction:** “Yar! But there ain't just one kind o' trouble in this galaxy, matey. Let's throw another scrape yer way and see if ye've got the wits to sail through it!”
- **Q5 fixed introduction:** “Credits come and go, but reputation sticks, matey. One day they'll be tellin' stories about ye in cantinas from here to the Outer Rim. What d'ye want those stories to say?”

#### Scout — Lead

- **Q1 fixed introduction:** “You can't be good at everything. Anyone who tells you otherwise is either lying or about to become a casualty. So, where do you want to put your effort?”
- **Q2 fixed introduction:** “Training gives you options. It doesn't give you a reason to use them. What sort of work are you actually interested in?”
- **Q3 fixed introduction:** “All right. Let's put you in that line of work for a moment. Tell me what you'd actually do in this situation, not what you think I want to hear.”
- **Q4 fixed introduction:** “Different terrain. Different problem. What changes in your approach?”
- **Q5 fixed introduction:** “People can spend years getting very good at a job they never intended to do. It happens. Where do you actually want to end up?”

#### Soldier — Breach

- **Q1 fixed introduction:** “Pick what feels right in your hands. Doesn't have to be a cannon, though I recommend one! So, what do you want to get good at?”
- **Q2 fixed introduction:** “Everybody's got their work. What do you want yours to be?”
- **Q3 fixed introduction:** “All right, say you've got that job, and already something's gone wrong. What do you do?”
- **Q4 fixed introduction:** “Now here's a different mess. Bigger guns won't fix every problem, much to my disappointment. What would you try?”
- **Q5 fixed introduction:** “I know what I want. Keep my people safe, make sure they've got something worth living for. What about you? What do you want to make of yourself?”

### B. Q1 class-development answer bank — 30 first-person choices

Q1 is keyed by the selected starting class. Five substantive options and one **neutral/undecided** option per class. Developer route names shown below **must not** appear as labels beside the answers in the player UI. Exact strings come from the latest per-class source drafts (Jedi owner-approved, remaining class banks reviewed/drafted). Route IDs and ontology mappings still require certification.

#### Jedi — Q1 first-person choices

**Authored Q1 question:** What kind of Jedi would you most like to develop into?

1. **Developer route: Jedi Guardian** — “I want to become a Jedi Guardian, developing the strength and courage to face danger and protect others.”
2. **Developer route: Jedi Sentinel** — “I want to become a Jedi Sentinel, combining my skills, awareness, and knowledge of the Force to overcome challenges.”
3. **Developer route: Jedi Consular** — “I want to become a Jedi Consular, deepening my understanding of the Force and learning to guide others through wisdom and diplomacy.”
4. **Developer route: Jedi Watchman — specialist** — “I want to become a Jedi Watchman, investigating hidden dangers and uncovering threats before they can harm others.”
5. **Developer route: Jedi Duelist — specialist** — “I want to become a Jedi Duelist, dedicating myself to mastering the lightsaber and refining my combat technique.”
6. **Developer route: I'm not sure yet** — “I'm not sure yet. I would like to explore what the Force and my training have to offer before choosing a path.”

#### Noble — Q1 first-person choices

**Authored Q1 question:** Which aspect of your Noble training would you most like to develop first?

1. **Developer route: Officer / Leader** — “I want to learn how to lead others, make decisions under pressure, and bring a team through difficult situations.”
2. **Developer route: Diplomat** — “I want to become a skilled negotiator, influencing outcomes through conversation, judgment, and understanding.”
3. **Developer route: Tactician** — “I want to anticipate problems, coordinate the right response, and give my allies an advantage through preparation.”
4. **Developer route: Mastermind** — “I want to understand the people and systems around me so I can shape events without relying on force.”
5. **Developer route: Public Figure / Patron (existing label: Celebrity)** — “I want to build a network of connections and resources, and learn to use my position to open doors for myself and others.”
6. **Developer route: I'm not sure yet** — “I'm not sure yet. I'd like to discover what my abilities can offer before deciding where to concentrate my efforts.”

#### Scoundrel — Q1 first-person choices

**Authored Q1 question:** Which part of being a Scoundrel do you want to get good at first?

1. **Developer route: Pirate / Spacer** — “I want to master life among the stars—piloting, improvising, and knowing how to get myself and my crew out of trouble.”
2. **Developer route: Trickster / Gambler** — “I want to outwit my enemies, take calculated risks, and turn bad odds in my favor.”
3. **Developer route: Gunslinger** — “I want to become fast and accurate with a blaster, making every shot count when trouble starts.”
4. **Developer route: Con Artist** — “I want to learn how to read people, talk my way past obstacles, and make the right deal at the right time.”
5. **Developer route: Slicer / Saboteur** — “I want to master computers and machinery, bypass security, and make complicated systems work for me—or fail for my enemies.”
6. **Developer route: I'm not sure yet** — “I'm not sure yet. I want to see what I'm capable of before deciding what to specialize in.”

#### Scout — Q1 first-person choices

**Authored Q1 question:** Which part of your Scout training do you most want to develop first?

1. **Developer route: Skirmisher** — “I want to stay mobile, react quickly, and learn how to keep enemies from pinning me down.”
2. **Developer route: Explorer / Survivalist** — “I want to explore unfamiliar places, find a path where others can't, and keep myself and my companions alive far from help.”
3. **Developer route: Sniper / Recon Marksman** — “I want to become a patient observer and accurate marksman, knowing when and where a single shot will matter most.”
4. **Developer route: Ranger / Tracker** — “I want to learn to read tracks, follow targets, and find what others have lost or tried to hide.”
5. **Developer route: Pilot / Outrider** — “I want to master piloting and travel, getting my crew into difficult places and bringing them safely back out.”
6. **Developer route: I'm not sure yet** — “I'm not sure yet. I want to learn what I'm capable of before I decide where to concentrate my training.”

#### Soldier — Q1 first-person choices

**Authored Q1 question:** Which part of your Soldier training do you most want to develop first?

1. **Developer route: Heavy Weapons** — “I want to master heavy weapons and learn how to put overwhelming firepower where it matters most.”
2. **Developer route: Tank / Armored Defender** — “I want to get good at fighting in armor, holding my ground, and protecting the people beside me.”
3. **Developer route: Infantry / Rifle Marksman** — “I want to become a reliable marksman. Give me a rifle and a clear target, and I'll make the shot count.”
4. **Developer route: Brawler / Close Quarters** — “I want to get in close and win the fight with my own strength, whether I'm armed or not.”
5. **Developer route: Sergeant / Squad Leader** — “I want to learn to read the battlefield, keep my squad working together, and bring everyone home.”
6. **Developer route: Undecided (neutral)** — “I'm not sure yet. I'd rather see what training suits me before choosing a specialty.”

### C. Q2 complete canonical career dialogue bank — 97 universal + 485 class-specific

Career entries below contain one universal base statement and **five** independently authored class-specific utterances. Only one class-specific utterance for the chosen candidate is shown to the player. Identity remains the exact `parentId`. Full parent access follows approved five-at-a-time, never-repeat A/B/C/D/E plus F navigation, with optional no-selection. The 20 class anchors and ranking contract are recorded in §§12 and 11; the scoring algorithm is **not yet implemented**.

#### C01. Diplomat — `diplomat`

- **Universal base:** “I want to broker peace between worlds, finding agreements where others see only enemies.”
- **Jedi:** “I want to help rival worlds negotiate a peace, listening carefully and finding common ground before violence begins.”
- **Noble:** “I want to represent worlds at the negotiating table, building alliances and finding agreements others thought impossible.”
- **Scoundrel:** “I want to talk opposing sides into a deal, reading the room well enough to keep a dispute from becoming a fight.”
- **Scout:** “I want to travel between distant communities, understand what each side needs, and help them reach an agreement.”
- **Soldier:** “I want to prevent wars before they start, using what I know about conflict to help enemies negotiate instead of fight.”

#### C02. Field Commander — `field_commander`

- **Universal base:** “I want to lead people through battle and make the decisions that bring them home.”
- **Jedi:** “I want to lead people through battle with a clear head, keeping them focused and bringing as many home as I can.”
- **Noble:** “I want to command people in the field, coordinating their efforts and accepting responsibility for difficult decisions.”
- **Scoundrel:** “I want to lead a fighting crew through trouble, thinking faster than our enemies and getting everyone back alive.”
- **Scout:** “I want to direct fighters across difficult ground, keeping them moving together when the situation changes.”
- **Soldier:** “I want to command troops under fire, making the calls that help my people accomplish the mission and survive.”

#### C03. Spy — `spy`

- **Universal base:** “I want to work undercover, uncovering secrets without anyone realizing I was there.”
- **Jedi:** “I want to work undercover, using patience and careful observation to uncover threats without revealing who I am.”
- **Noble:** “I want to move among powerful people under an assumed identity, learning their secrets without exposing my mission.”
- **Scoundrel:** “I want to pass as whoever the job requires, getting close enough to learn secrets without anyone catching on.”
- **Scout:** “I want to slip into places unnoticed, observe what is happening, and carry what I learn back to the people who need it.”
- **Soldier:** “I want to infiltrate hostile organizations, gather useful intelligence, and get out before anyone knows I was there.”

#### C04. Merchant Prince — `merchant_prince`

- **Universal base:** “I want to build a trading empire, using negotiation and connections to turn opportunity into influence.”
- **Jedi:** “I want to build a trading network across worlds, using careful negotiation and trusted partnerships to make it thrive.”
- **Noble:** “I want to grow a trading empire, using commerce, connections, and strategy to establish lasting influence.”
- **Scoundrel:** “I want to turn small deals and risky opportunities into a trading empire that answers to me.”
- **Scout:** “I want to discover overlooked trade routes and new markets, building an enterprise that connects faraway worlds.”
- **Soldier:** “I want to build a trading empire with dependable supply lines and partners who know I can deliver on my agreements.”

#### C05. Galactic Archaeologist — `galactic_archaeologist`

- **Universal base:** “I want to uncover the histories of forgotten civilizations and bring their secrets back to light.”
- **Jedi:** “I want to explore ancient sites and learn what lost civilizations can teach us about the galaxy and the Force.”
- **Noble:** “I want to study forgotten civilizations, organizing expeditions and preserving the histories their ruins reveal.”
- **Scoundrel:** “I want to chase the trail of lost civilizations through archives and ruins, uncovering histories everyone else forgot.”
- **Scout:** “I want to find ruins beyond the charts and piece together the lives of the people who vanished from them.”
- **Soldier:** “I want to explore dangerous archaeological sites, helping an expedition recover the stories buried there.”

#### C06. Planetary Governor — `planetary_governor`

- **Universal base:** “I want to govern a world, balancing competing interests and making life better for its people.”
- **Jedi:** “I want to govern a world thoughtfully, weighing each difficult decision against the lives it will affect.”
- **Noble:** “I want to govern a planet, balancing its institutions and competing interests while improving life for its people.”
- **Scoundrel:** “I want to take charge of a world and work its rival factions into a government that can actually get things done.”
- **Scout:** “I want to govern a frontier world, making sure distant settlements are heard instead of forgotten.”
- **Soldier:** “I want to govern a world, keeping it stable without losing sight of the people who live there.”

#### C07. Community Leader — `community_leader`

- **Universal base:** “I want to become someone my community trusts to organize help and stand up for its needs.”
- **Jedi:** “I want to serve a community, listen to its concerns, and help its people find the strength to face them together.”
- **Noble:** “I want to organize my community, bringing people and resources together so their needs are taken seriously.”
- **Scoundrel:** “I want to be the person my neighborhood calls when it needs a favor, a voice, or someone willing to stand up for it.”
- **Scout:** “I want to earn the trust of a remote community and help its people prepare for the challenges around them.”
- **Soldier:** “I want to bring a community together, so its people can look after one another when trouble comes.”

#### C08. Information Broker — `information_broker`

- **Universal base:** “I want to learn what powerful people are hiding and make a living knowing who needs that information.”
- **Jedi:** “I want to build a network of informants and understand what they uncover, making a living from knowledge others miss.”
- **Noble:** “I want to trade in reliable intelligence, using my contacts to learn what influential people would rather keep hidden.”
- **Scoundrel:** “I want to know everyone who knows something and make my living connecting valuable secrets with the right buyers.”
- **Scout:** “I want to gather reports from distant places, turning scattered observations into information people will pay to have.”
- **Soldier:** “I want to collect and trade useful intelligence, recognizing which details matter before anyone else acts on them.”

#### C09. Corporate Operator — `corporate_operator`

- **Universal base:** “I want to rise through the corporate world, mastering its politics and shaping the decisions that matter.”
- **Jedi:** “I want to work within a major corporation, understanding its competing interests and helping direct its decisions.”
- **Noble:** “I want to rise through a corporation, building alliances and shaping the policies that determine its future.”
- **Scoundrel:** “I want to master corporate politics, spotting openings and using them to gain influence inside the company.”
- **Scout:** “I want to oversee corporate operations on distant worlds, making complicated plans work beyond the boardroom.”
- **Soldier:** “I want to direct corporate teams and operations, turning decisions made at the top into work that actually gets done.”

#### C10. Courtier — `courtier`

- **Universal base:** “I want to move through the halls of power, earning trust and influencing the conversations that decide everything.”
- **Jedi:** “I want to serve at a powerful court, offering careful counsel and learning how its decisions are made.”
- **Noble:** “I want to earn the confidence of a powerful court, mastering its customs and influencing decisions from within.”
- **Scoundrel:** “I want to find my place among courtiers, reading every conversation and knowing when a quiet word will change things.”
- **Scout:** “I want to serve at a distant court, learning its people and customs well enough to become a trusted adviser.”
- **Soldier:** “I want to advise leaders at court, bringing practical judgment to decisions that can affect entire worlds.”

#### C11. Aristocrat — `aristocrat`

- **Universal base:** “I want to establish myself among the galaxy's influential families and use that standing to open doors.”
- **Jedi:** “I want to establish a respected place among the galaxy's great houses and learn to use that standing responsibly.”
- **Noble:** “I want to cultivate a respected position among influential families, understanding the obligations and opportunities it brings.”
- **Scoundrel:** “I want to earn a place among the galaxy's elite, learning their rules well enough to make my own connections.”
- **Scout:** “I want to represent an influential house in distant territories, earning its standing through what I accomplish.”
- **Soldier:** “I want to establish standing among the galaxy's great houses, earning respect through service as much as pedigree.”

#### C12. Bureaucrat — `bureaucrat`

- **Universal base:** “I want to understand how institutions actually work and use that knowledge to get things done.”
- **Jedi:** “I want to learn how governments function and patiently work through their rules to make needed decisions possible.”
- **Noble:** “I want to understand government administration from top to bottom and make its institutions work effectively.”
- **Scoundrel:** “I want to know the regulations and the people enforcing them well enough to get things done when others hit a wall.”
- **Scout:** “I want to manage the records, permits, and services that keep far-flung settlements functioning.”
- **Soldier:** “I want to administer public systems so that orders and policies become useful services rather than forgotten paperwork.”

#### C13. Investigator — `investigator`

- **Universal base:** “I want to follow clues others overlook and uncover the truth when no one can agree on what happened.”
- **Jedi:** “I want to investigate mysteries with patience and care, following the evidence even when the answers are uncomfortable.”
- **Noble:** “I want to investigate difficult cases, using interviews, records, and careful reasoning to discover what really happened.”
- **Scoundrel:** “I want to find the truths people hide, following every lead until their stories stop adding up.”
- **Scout:** “I want to examine the scene, follow the trail, and find the clue everyone else passed by.”
- **Soldier:** “I want to investigate crimes and incidents thoroughly, following the evidence before deciding who is responsible.”

#### C14. Fixer — `fixer`

- **Universal base:** “I want to connect people with what they need and become the one they call when a problem has no obvious solution.”
- **Jedi:** “I want to become someone people trust to untangle difficult problems and connect them with the help they need.”
- **Noble:** “I want to build a network of capable people and match each problem with the contacts and resources to solve it.”
- **Scoundrel:** “I want to know who needs a favor and who can deliver one, making a living putting the right people together.”
- **Scout:** “I want to solve problems beyond the usual supply routes, finding the right parts, passage, or people when plans fall apart.”
- **Soldier:** “I want to be the person who finds a solution when an operation stalls, securing the resources and people to move it forward.”

#### C15. Resistance Leader — `resistance_leader`

- **Universal base:** “I want to bring people together to resist oppression and give them the means to fight for a better future.”
- **Jedi:** “I want to bring people together against oppression, helping a resistance stay united through hard choices.”
- **Noble:** “I want to organize a resistance, building alliances and gathering the support needed to challenge those in power.”
- **Scoundrel:** “I want to pull together people who refuse to bow to an occupying power and keep them one step ahead of it.”
- **Scout:** “I want to lead resistance groups through difficult territory, keeping our people connected and ready to act.”
- **Soldier:** “I want to lead a resistance against an occupying force, giving its fighters and civilians a plan they can trust.”

#### C16. Free Trader — `free_trader`

- **Universal base:** “I want to trade freely between worlds, building relationships and turning each voyage into a new opportunity.”
- **Jedi:** “I want to trade independently between worlds, building lasting agreements and relationships wherever I travel.”
- **Noble:** “I want to run my own trade routes, negotiating deals and growing a business beyond any single world's reach.”
- **Scoundrel:** “I want to buy where goods are plentiful, sell where they're needed, and keep my routes free of anyone else's orders.”
- **Scout:** “I want to find new markets along distant routes and make my living carrying goods between them.”
- **Soldier:** “I want to trade between systems on my own terms, keeping my shipments moving and my partners reliable.”

#### C17. Ship Captain — `ship_captain`

- **Universal base:** “I want to captain a starship, choose our course, and take responsibility for everyone aboard.”
- **Jedi:** “I want to captain a ship, choosing our course carefully and taking responsibility for everyone aboard.”
- **Noble:** “I want to command a starship, balancing the needs of its crew, passengers, and mission as we chart our course.”
- **Scoundrel:** “I want a ship and crew of my own, with the freedom to choose our jobs and make the call when things go sideways.”
- **Scout:** “I want to captain a ship into unfamiliar space, guiding my crew safely through hazards and discoveries.”
- **Soldier:** “I want to command a starship and earn the trust of the crew who depend on my decisions.”

#### C18. Scientist — `scientist`

- **Universal base:** “I want to devote my life to research, asking questions no one has answered and testing what others take for granted.”
- **Jedi:** “I want to study how the galaxy works, testing new ideas rather than accepting tradition as the final answer.”
- **Noble:** “I want to pursue scientific research, asking difficult questions and building the expertise to test them.”
- **Scoundrel:** “I want to experiment, challenge accepted theories, and discover useful things nobody thought to look for.”
- **Scout:** “I want to study unfamiliar worlds firsthand, gathering evidence that changes what we know about them.”
- **Soldier:** “I want to conduct research that stands up to real-world testing, turning experiments into dependable knowledge.”

#### C19. Doctor — `doctor`

- **Universal base:** “I want to heal people, especially in places where proper medical care is hard to find.”
- **Jedi:** “I want to study medicine so I can heal people through knowledge, patience, and skill.”
- **Noble:** “I want to practice medicine, diagnosing illness and giving patients the care they need.”
- **Scoundrel:** “I want to become the kind of doctor who can care for patients wherever they turn up, from clinics to cargo holds.”
- **Scout:** “I want to treat patients far from major hospitals, using whatever medical supplies I can carry.”
- **Soldier:** “I want to become a doctor who can treat illness and injuries even when conditions make proper care difficult.”

#### C20. Educator — `educator`

- **Universal base:** “I want to teach others, helping them develop knowledge and abilities they can carry throughout their lives.”
- **Jedi:** “I want to teach others what I've learned, helping them question, understand, and grow on their own terms.”
- **Noble:** “I want to make a career of teaching, giving students the knowledge and guidance to shape their own futures.”
- **Scoundrel:** “I want to teach practical skills to people who never had a fair chance to learn them.”
- **Scout:** “I want to teach others how to read unfamiliar places, solve problems, and find their own way.”
- **Soldier:** “I want to educate others, passing on lessons that help them make sound decisions when I'm not there.”

#### C21. Journalist — `journalist`

- **Universal base:** “I want to uncover important stories and tell the truth to people who deserve to know.”
- **Jedi:** “I want to investigate the stories shaping the galaxy and tell them responsibly, even when the truth is inconvenient.”
- **Noble:** “I want to report on events that matter, questioning influential people and giving the public reliable information.”
- **Scoundrel:** “I want to chase stories powerful people want buried and put the facts where everyone can see them.”
- **Scout:** “I want to travel to places news crews overlook and report what life is actually like there.”
- **Soldier:** “I want to report what happens in conflict and beyond, so people hear more than the official version.”

#### C22. First-Contact Specialist — `first_contact_specialist`

- **Universal base:** “I want to be among the first to meet unfamiliar peoples, building understanding before fear becomes conflict.”
- **Jedi:** “I want to meet unfamiliar peoples with curiosity and restraint, finding common understanding before suspicion takes hold.”
- **Noble:** “I want to represent my people in first-contact missions, learning new customs and opening the way to peaceful relations.”
- **Scoundrel:** “I want to be among the first outsiders a new people meets, learning how to communicate without starting a feud.”
- **Scout:** “I want to venture into uncharted space and make first contact with peoples no one from my world has met.”
- **Soldier:** “I want to make first contact safely, showing restraint so a misunderstanding never becomes a fight.”

#### C23. Crime Boss — `crime_boss`

- **Universal base:** “I want to build an underworld organization, gathering the right people and resources to make my own rules.”
- **Jedi:** “I want to build an underworld network, understand its loyalties, and direct the people who make it run.”
- **Noble:** “I want to run a criminal organization, using influence and planning to keep its operations profitable.”
- **Scoundrel:** “I want to stop taking jobs from crime bosses and become the one handing them out.”
- **Scout:** “I want to control underworld routes and crews across frontier space, keeping the business in my hands.”
- **Soldier:** “I want to run an underworld organization with clear orders and dependable people, holding it together when rivals move in.”

#### C24. Spymaster — `spymaster`

- **Universal base:** “I want to coordinate intelligence networks, connecting scattered secrets into a picture others can't see.”
- **Jedi:** “I want to oversee intelligence agents and interpret what they learn, using judgment to find the threat behind the rumors.”
- **Noble:** “I want to build an intelligence network, directing agents and assembling information before anyone sees the pattern.”
- **Scoundrel:** “I want to run the people who find secrets, making sure the right whispers reach me before anyone else hears them.”
- **Scout:** “I want to manage observers and field agents across distant worlds, putting their reports together into a clear picture.”
- **Soldier:** “I want to coordinate intelligence operations, protecting my agents and giving decision-makers information they can trust.”

#### C25. Spiritual Leader — `spiritual_leader`

- **Universal base:** “I want to guide people through uncertainty, offering them purpose and a reason to keep going.”
- **Jedi:** “I want to guide people seeking meaning in the Force or their own traditions, offering counsel without choosing their path for them.”
- **Noble:** “I want to lead a spiritual community, caring for its members and keeping its traditions meaningful in their lives.”
- **Scoundrel:** “I want to bring people together around a belief they share, earning their trust and helping them through hard times.”
- **Scout:** “I want to guide people whose faith sustains them far from home, keeping their community connected.”
- **Soldier:** “I want to serve as a spiritual leader, offering people purpose and steadiness when fear and uncertainty take hold.”

#### C26. Smuggler — `smuggler`

- **Universal base:** “I want to carry valuable cargo between worlds, finding a way past inspections and restrictions when the job demands it.”
- **Jedi:** “I want to carry cargo past closed borders, relying on a steady nerve and good judgment to get each shipment through.”
- **Noble:** “I want to move restricted goods between worlds, negotiating discreet arrangements whenever officials make the route difficult.”
- **Scoundrel:** “I want to run cargo nobody's supposed to carry, slipping past patrols and delivering it before anyone asks questions.”
- **Scout:** “I want to find the routes inspectors don't watch and guide valuable cargo safely through them.”
- **Soldier:** “I want to escort illicit shipments through dangerous territory, keeping my cargo secure when patrols and rivals close in.”

#### C27. Fringer — `fringer`

- **Universal base:** “I want to make a life on the edge of settled space, where resourcefulness matters more than rank or connections.”
- **Jedi:** “I want to find a life on the galactic fringe, learning to rely on myself far from the expectations of established worlds.”
- **Noble:** “I want to settle on the fringe and build a future through practical work, not titles or invitations to the right circles.”
- **Scoundrel:** “I want to make my way on the Outer Rim, scraping together what I need and owing as little as possible to anyone.”
- **Scout:** “I want to live beyond the busy trade routes, reading the land and making do with whatever the frontier gives me.”
- **Soldier:** “I want to build a life at the edge of civilization, where I can depend on my own preparation when help is days away.”

#### C28. Pirate — `pirate`

- **Universal base:** “I want to roam the stars with a crew of my own, taking risks and claiming prizes from those who think they rule the spacelanes.”
- **Jedi:** “I want to take command of a raiding crew, intercept rich shipments, and make our living taking prizes along the spacelanes.”
- **Noble:** “I want to build a pirate fleet, choosing valuable targets and dividing the spoils so my crews remain loyal.”
- **Scoundrel:** “I want to fly under my own flag, board fat freighters, and split the take with a crew that knows how to live free.”
- **Scout:** “I want to stalk shipping routes from hidden ports, striking where patrols can't catch us and disappearing with the prize.”
- **Soldier:** “I want to lead a pirate crew in hard boarding actions, taking prizes through discipline rather than luck alone.”

#### C29. Gambler — `gambler`

- **Universal base:** “I want to make my fortune at the tables, reading people and knowing when the odds are worth the risk.”
- **Jedi:** “I want to play the high-stakes tables, learning to judge my opponents and risk only what I can bear to lose.”
- **Noble:** “I want to master the gambling circuits, reading powerful opponents and turning bold wagers into a fortune.”
- **Scoundrel:** “I want to live off the cards and dice, knowing when to bluff, when to walk, and when to bet everything.”
- **Scout:** “I want to travel from one gambling hall to the next, reading unfamiliar players and finding the odds everyone else misses.”
- **Soldier:** “I want to make my living at the tables, keeping my nerve when a wager turns dangerous and everyone is watching.”

#### C30. Con Artist — `con_artist`

- **Universal base:** “I want to talk my way into opportunities, fool the people who underestimate me, and turn their confidence to my advantage.”
- **Jedi:** “I want to make a career of convincing people I'm someone I'm not, finding openings in the stories they want to believe.”
- **Noble:** “I want to become a practiced confidence artist, passing among the influential and turning their assumptions into opportunities.”
- **Scoundrel:** “I want to sell a convincing story, win a mark's trust, and be gone with the credits before they see the trick.”
- **Scout:** “I want to work a convincing disguise in unfamiliar settlements, learning enough about the locals to make each deception stick.”
- **Soldier:** “I want to run convincing cons, reading a target's habits and carrying out the plan without losing my nerve.”

#### C31. Gunslinger — `gunslinger`

- **Universal base:** “I want to be known for a quick draw and a steady hand, ending a fight before my opponent can take a second shot.”
- **Jedi:** “I want to become deadly accurate with a pistol, learning the control and timing that make one shot count.”
- **Noble:** “I want to be a practiced gunslinger, able to defend myself in a duel with skill rather than an entourage.”
- **Scoundrel:** “I want the fastest draw in the room and the aim to back it up when somebody decides to test me.”
- **Scout:** “I want to spot trouble early, draw quickly, and land the precise shot before an opponent can react.”
- **Soldier:** “I want to specialize in pistol fighting, training until my draw is fast and my aim stays true under pressure.”

#### C32. Bounty Hunter — `bounty_hunter`

- **Universal base:** “I want to track fugitives across the galaxy and make my living bringing in people who don't want to be found.”
- **Jedi:** “I want to hunt fugitives for a living, tracking them patiently and bringing them in for the bounty on their heads.”
- **Noble:** “I want to take bounty contracts, use my contacts to locate fugitives, and bring them in for the agreed reward.”
- **Scoundrel:** “I want to chase down marks with prices on their heads, collect the bounty, and move on to the next job.”
- **Scout:** “I want to follow a target across worlds and wilderness, picking up their trail when everybody else has lost it.”
- **Soldier:** “I want to bring in wanted targets for pay, preparing each capture carefully so the contract gets finished.”

#### C33. Frontier Marshal — `frontier_marshal`

- **Universal base:** “I want to keep the peace in distant settlements, where help is scarce and someone has to stand up for the locals.”
- **Jedi:** “I want to serve as a marshal on the frontier, settling disputes fairly when distant authorities cannot reach us.”
- **Noble:** “I want to uphold order in remote communities, listening to their concerns and earning the authority to resolve disputes.”
- **Scoundrel:** “I want to wear a marshal's badge out on the fringe, knowing the locals well enough to tell a real threat from a loudmouth.”
- **Scout:** “I want to patrol scattered settlements, follow trouble into the badlands, and keep the peace where backup is scarce.”
- **Soldier:** “I want to serve as a frontier marshal, standing firm when outlaws threaten towns too small to defend themselves.”

#### C34. Slicer — `slicer`

- **Universal base:** “I want to get inside secured computer systems, uncover what they hide, and find a way through almost any digital lock.”
- **Jedi:** “I want to learn to slice secure computer systems, finding the information hidden behind locks and restricted access.”
- **Noble:** “I want to specialize in slicing, entering protected databases and uncovering the records that institutions keep private.”
- **Scoundrel:** “I want to slice my way past security, crack locked networks, and leave before anyone notices I was inside.”
- **Scout:** “I want to access unfamiliar systems in the field, recovering information from networks other people can't get into.”
- **Soldier:** “I want to get good at breaking into secure networks, extracting what matters while staying ahead of their defenses.”

#### C35. Bodyguard — `bodyguard`

- **Universal base:** “I want to stand between danger and the person I'm protecting, making sure they get home even when things turn ugly.”
- **Jedi:** “I want to guard someone whose safety depends on me, learning to notice danger and put myself between them and harm.”
- **Noble:** “I want to become a trusted bodyguard, anticipating threats and protecting my charge without disrupting their life.”
- **Scoundrel:** “I want to protect a client through the worst parts of town, spotting trouble before it gets close enough to hurt them.”
- **Scout:** “I want to escort people through unfamiliar territory, reading threats and keeping them safe along the route.”
- **Soldier:** “I want to serve as a bodyguard, staying alert and putting myself in the way when a threat reaches my charge.”

#### C36. Mercenary — `mercenary`

- **Universal base:** “I want to hire out my fighting skills, choosing contracts that pay well and missions I can live with.”
- **Jedi:** “I want to earn my living taking combat contracts, choosing missions where my abilities are worth the risk.”
- **Noble:** “I want to become a mercenary, negotiating worthwhile contracts and building a reputation for delivering results.”
- **Scoundrel:** “I want to take paid fighting jobs, pick my employers carefully, and collect what I'm owed when the shooting stops.”
- **Scout:** “I want to sell my skills to crews that need someone capable in a fight and in rough territory.”
- **Soldier:** “I want to fight as a mercenary, taking contracts on my own terms and proving I can complete the mission.”

#### C37. Commando — `commando`

- **Universal base:** “I want to train for dangerous missions behind enemy lines, working with a small team that can get in and out unseen.”
- **Jedi:** “I want to train for covert missions with a small team, reaching dangerous objectives without drawing attention.”
- **Noble:** “I want to join an elite commando team, learning to coordinate difficult operations where mistakes can cost lives.”
- **Scoundrel:** “I want to run commando missions, slipping into guarded places with a tight crew and getting out before alarms spread.”
- **Scout:** “I want to scout enemy approaches for a commando unit, helping us reach the objective without being detected.”
- **Soldier:** “I want to serve in a commando team, training for precise operations behind enemy lines and trusting my squad to finish them.”

#### C38. Naval Officer — `naval_officer`

- **Universal base:** “I want to serve aboard a warship, directing its crew and defending the people who depend on us.”
- **Jedi:** “I want to serve as an officer aboard a military vessel, making careful decisions that protect its crew and fulfill its mission.”
- **Noble:** “I want to rise through the naval ranks, commanding a warship and directing its crew during major operations.”
- **Scoundrel:** “I want to become a naval officer, learning to run a warship's bridge instead of taking orders from its captain.”
- **Scout:** “I want to serve as a naval officer on long deployments, managing a warship through unfamiliar systems and hazards.”
- **Soldier:** “I want to command aboard a warship, making clear decisions under fire and keeping the crew ready to fight.”

#### C39. Quartermaster — `quartermaster`

- **Universal base:** “I want to keep a crew supplied and ready, making sure the right equipment reaches the right people before trouble starts.”
- **Jedi:** “I want to keep people supplied on difficult journeys, making sure a lack of medicine or equipment never ends the mission.”
- **Noble:** “I want to manage supplies and procurement, building dependable networks that keep an organization functioning.”
- **Scoundrel:** “I want to be the one who can find parts, food, and fuel when the official supply chain runs dry.”
- **Scout:** “I want to plan field supplies for long expeditions, keeping crews equipped when the nearest port is far away.”
- **Soldier:** “I want to become a quartermaster, making sure my unit gets the right gear before anyone has to fight without it.”

#### C40. Pilot — `pilot`

- **Universal base:** “I want to make my living at the controls, mastering the craft I fly and getting passengers or cargo where they need to go.”
- **Jedi:** “I want to make a career of flying ships, mastering navigation and control so I can take people where they need to go.”
- **Noble:** “I want to become a professional pilot, earning trust through smooth flights and sound decisions at the controls.”
- **Scoundrel:** “I want to live behind a cockpit canopy, flying any job that puts credits in my pocket and stars ahead of me.”
- **Scout:** “I want to pilot ships through difficult approaches and unfamiliar routes, getting us safely to the destination.”
- **Soldier:** “I want to train as a pilot, keeping my craft steady under pressure and delivering whoever depends on the flight.”

#### C41. Racer — `racer`

- **Universal base:** “I want to push engines and my reflexes to their limits, proving I can outrun the best pilots in the galaxy.”
- **Jedi:** “I want to compete as a racer, developing the focus and reflexes to handle every turn at full speed.”
- **Noble:** “I want to race professionally, studying every course and earning a reputation against the best competitors.”
- **Scoundrel:** “I want to win races with daring moves and a faster machine, then hear the crowd shout my name at the finish.”
- **Scout:** “I want to race across dangerous tracks and terrain, reading each turn before my rivals know it's coming.”
- **Soldier:** “I want to race for a living, training until I can stay precise and fearless when the engines reach their limits.”

#### C42. Mechanic — `mechanic`

- **Universal base:** “I want to keep ships and machines running, especially when everyone else has given up on repairing them.”
- **Jedi:** “I want to learn to repair the machines people depend on, finding the real fault instead of throwing parts at it.”
- **Noble:** “I want to become a skilled mechanic, understanding complex systems well enough to keep entire operations running.”
- **Scoundrel:** “I want to fix broken ships and machinery, especially the jobs everyone else says aren't worth the trouble.”
- **Scout:** “I want to keep equipment working in the field, repairing failures with the tools and materials I can find.”
- **Soldier:** “I want to become a dependable mechanic, restoring damaged vehicles and equipment before the next mission needs them.”

#### C43. Droidsmith — `droidsmith`

- **Universal base:** “I want to build, program, and repair droids, turning spare parts into capable partners with purposes of their own.”
- **Jedi:** “I want to learn to build and program droids, creating capable partners whose actions I can understand and maintain.”
- **Noble:** “I want to design and maintain droids for complex duties, developing the programming and craftsmanship they require.”
- **Scoundrel:** “I want to put together droids from parts and clever code, making useful companions that can handle rough jobs.”
- **Scout:** “I want to build reliable droids for distant expeditions, giving them the tools and programming to work far from a workshop.”
- **Soldier:** “I want to develop droids that can assist in dangerous operations, building and programming them to work beside a team.”

#### C44. Inventor — `inventor`

- **Universal base:** “I want to design devices no one has made before and find practical answers to problems everyone else accepts.”
- **Jedi:** “I want to create inventions that solve problems no one has answered, testing each idea until it can truly help.”
- **Noble:** “I want to become an inventor, turning research and ambitious designs into technology people can actually use.”
- **Scoundrel:** “I want to invent gadgets nobody else has thought of, making prototypes that work even when they look impossible.”
- **Scout:** “I want to invent tools for challenges no one planned for, testing them where ordinary equipment fails.”
- **Soldier:** “I want to design new devices that work under real pressure, improving them until they can survive more than a demonstration.”

#### C45. Cyberneticist — `cyberneticist`

- **Universal base:** “I want to advance cybernetics, helping living beings recover or extend their abilities through technology.”
- **Jedi:** “I want to study cybernetics, learning how implants can restore or expand what living bodies are able to do.”
- **Noble:** “I want to advance cybernetic medicine, developing implants that can improve lives and meet a patient's needs.”
- **Scoundrel:** “I want to become a cyberneticist, fitting and improving implants for people who need more than ordinary treatment.”
- **Scout:** “I want to work with cybernetics in remote communities, learning to fit and maintain implants far from major clinics.”
- **Soldier:** “I want to develop cybernetic implants for people recovering from serious injuries, helping them regain useful abilities.”

#### C46. Explorer — `explorer`

- **Universal base:** “I want to travel beyond the known charts and set foot on worlds few people have ever seen.”
- **Jedi:** “I want to seek worlds beyond the charts, learning from the places and people we haven't encountered yet.”
- **Noble:** “I want to lead expeditions beyond settled space, bringing people and resources together to explore unknown worlds.”
- **Scoundrel:** “I want to go where the charts run out, discovering new places before anyone else can claim the opportunity.”
- **Scout:** “I want to set foot on uncharted worlds, mapping new ground and finding routes through places no one knows.”
- **Soldier:** “I want to join expeditions into unknown space, helping the team reach new worlds and return with what we discover.”

#### C47. Naturalist — `naturalist`

- **Universal base:** “I want to study unfamiliar ecosystems and discover how the creatures and environments of each world fit together.”
- **Jedi:** “I want to study the living systems of unfamiliar worlds, understanding how their creatures and habitats depend on one another.”
- **Noble:** “I want to become a naturalist, researching ecosystems and helping others understand the worlds they inhabit.”
- **Scoundrel:** “I want to travel from world to world studying strange wildlife, following discoveries wherever they take me.”
- **Scout:** “I want to observe plants and creatures in their own habitats, learning the patterns that make each ecosystem work.”
- **Soldier:** “I want to study life in dangerous environments, learning how different species survive and shape the places around them.”

#### C48. Activist — `activist`

- **Universal base:** “I want to bring people together around a cause and make powerful institutions listen when they would rather ignore us.”
- **Jedi:** “I want to organize people around a cause, helping their concerns reach those with the power to act.”
- **Noble:** “I want to campaign for change, persuading institutions to listen to people they have ignored for too long.”
- **Scoundrel:** “I want to make noise for people the powerful keep brushing aside, building a movement they can't ignore.”
- **Scout:** “I want to organize communities across distant settlements, carrying their concerns to the people who make the rules.”
- **Soldier:** “I want to advocate for people who aren't being heard, building support until leaders have to answer them.”

#### C49. Celebrity — `celebrity`

- **Universal base:** “I want to become someone the galaxy recognizes and use that reputation to create opportunities for myself and others.”
- **Jedi:** “I want to become widely known for what I accomplish, using that recognition to gain opportunities throughout the galaxy.”
- **Noble:** “I want to cultivate a public reputation that opens doors, becoming a recognized figure in influential circles.”
- **Scoundrel:** “I want my name known from Core to Rim, turning fame into invitations, contacts, and the next big opportunity.”
- **Scout:** “I want to become famous for extraordinary journeys and discoveries, building a name that people recognize wherever I travel.”
- **Soldier:** “I want to earn public recognition for what I do, becoming known well beyond the people I've served beside.”

#### C50. Entertainer — `entertainer`

- **Universal base:** “I want to perform for others, making a living with stories, music, or spectacle wherever an audience will gather.”
- **Jedi:** “I want to perform for audiences across the galaxy, learning how music and stories can hold a room's attention.”
- **Noble:** “I want to make a career of performance, bringing polished shows to audiences from grand theaters to small gatherings.”
- **Scoundrel:** “I want to live from gig to gig, winning over crowds with stories, music, and whatever keeps them wanting more.”
- **Scout:** “I want to travel between worlds as a performer, sharing stories and songs with audiences I meet along the way.”
- **Soldier:** “I want to become an entertainer, giving people a chance to forget their worries through stories, music, or spectacle.”

#### C51. Scavenger — `scavenger`

- **Universal base:** “I want to search wrecks and abandoned places, finding useful treasures in what everyone else leaves behind.”
- **Jedi:** “I want to recover useful things from wrecks and forgotten places, making careful use of what others discard.”
- **Noble:** “I want to turn abandoned equipment and old wrecks into a salvage operation that supports the people depending on it.”
- **Scoundrel:** “I want to pick through derelicts and junk heaps, finding the parts everyone else overlooked before another crew gets there.”
- **Scout:** “I want to explore old wrecks and deserted outposts, spotting what can be saved without getting myself buried alongside it.”
- **Soldier:** “I want to salvage equipment from dangerous wreck sites and get it working again for people who need it.”

#### C52. Courier — `courier`

- **Universal base:** “I want to carry important messages and cargo through dangerous routes, reaching places others cannot.”
- **Jedi:** “I want to carry messages and supplies to people who need them, even when the journey is dangerous or uncertain.”
- **Noble:** “I want to be trusted with urgent deliveries, arranging dependable routes and making sure important cargo arrives on time.”
- **Scoundrel:** “I want to make a living delivering the things people cannot afford to lose, moving fast and keeping my word.”
- **Scout:** “I want to find a way through bad terrain and unfamiliar routes so urgent deliveries reach their destinations.”
- **Soldier:** “I want to deliver critical orders and supplies through dangerous territory, getting them there no matter how rough the road becomes.”

#### C53. Sector Ranger — `sector_ranger`

- **Universal base:** “I want to pursue criminals across worlds and sectors, following a trail wherever it leads until justice catches up.”
- **Jedi:** “I want to investigate dangerous fugitives across whole sectors and learn how to bring them to justice without losing my judgment.”
- **Noble:** “I want to serve as a sector ranger, working across jurisdictions to find criminals who think a border will protect them.”
- **Scoundrel:** “I want to track criminals from one system to the next and bring them in, even when they have friends in high places.”
- **Scout:** “I want to follow fugitive trails across distant worlds, reading signs that local patrols might miss.”
- **Soldier:** “I want to become a sector ranger, pursuing dangerous offenders wherever they run and bringing them back to face the law.”

#### C54. Security Specialist — `security_specialist`

- **Universal base:** “I want to anticipate threats and build defenses that keep people and important places safe before trouble begins.”
- **Jedi:** “I want to understand how threats get through defenses and learn to keep vulnerable places and people secure.”
- **Noble:** “I want to design security arrangements that protect people, balancing good judgment with the resources available.”
- **Scoundrel:** “I want to learn how to spot weak points in a security system and close them before someone less honest finds them.”
- **Scout:** “I want to survey sites for hidden approaches and make sure no threat slips through because a route was overlooked.”
- **Soldier:** “I want to develop reliable security plans, positioning people and equipment so trouble is stopped before it reaches anyone.”

#### C55. Force Hunter — `force_hunter`

- **Universal base:** “I want to track dangerous Force-users and learn how to face abilities most people don't understand.”
- **Jedi:** “I want to track Force-users who pose a danger, learning to counter their methods without underestimating them.”
- **Noble:** “I want to investigate dangerous Force-users and coordinate the people and resources needed to confront them.”
- **Scoundrel:** “I want to follow the trail of dangerous Force-users and learn the tricks that keep a hunter alive around them.”
- **Scout:** “I want to track Force-users through unfamiliar terrain and learn to recognize the signs they leave behind.”
- **Soldier:** “I want to train to face dangerous Force-users, preparing for threats that ordinary weapons drills do not cover.”

#### C56. Veteran — `veteran`

- **Universal base:** “I want to become someone others can rely on after years of hard service, using experience and composure to help the next generation survive.”
- **Jedi:** “I want to earn the kind of experience that makes others trust my judgment when a hard choice must be made.”
- **Noble:** “I want to spend years in meaningful service, becoming someone who can guide others through trouble with steady judgment.”
- **Scoundrel:** “I want to survive enough hard jobs to know what matters, then put that experience to use for the next crew.”
- **Scout:** “I want to become a seasoned hand who can read danger early and teach less experienced travelers how to survive it.”
- **Soldier:** “I want to become a veteran others can count on, passing down what I have learned so fewer people make fatal mistakes.”

#### C57. Warrior — `warrior`

- **Universal base:** “I want to live by a warrior's code, honing my strength and skill until I can meet any challenge without fear.”
- **Jedi:** “I want to live by a warrior code, training myself to meet violence with courage and restraint.”
- **Noble:** “I want to earn respect as a warrior, showing through discipline and conduct what my commitments mean.”
- **Scoundrel:** “I want to make my name as a warrior who can stand his ground when every clever escape has failed.”
- **Scout:** “I want to become a warrior who knows the land, chooses the right moment, and does not waste a fight.”
- **Soldier:** “I want to hone my strength and fighting discipline until I can meet an enemy face to face and hold my ground.”

#### C58. Sniper — `sniper`

- **Universal base:** “I want to master patience, concealment, and long-range marksmanship, knowing exactly when a single shot will matter.”
- **Jedi:** “I want to become a patient long-range marksman, learning when one precise shot is truly necessary.”
- **Noble:** “I want to learn to observe the whole field and put an accurate shot where it can change the outcome.”
- **Scoundrel:** “I want to master the long shot, picking the right position and making a single clean hit when it counts.”
- **Scout:** “I want to scout ahead, find a concealed firing position, and make every careful shot count.”
- **Soldier:** “I want to train as a sniper, holding steady under pressure and hitting the target that matters from far away.”

#### C59. Combat Medic — `combat_medic`

- **Universal base:** “I want to keep people alive under fire, treating the wounded when there's no safe place to stop.”
- **Jedi:** “I want to learn to treat the wounded under fire, helping people survive long enough to reach safety.”
- **Noble:** “I want to become a combat medic, organizing care when casualties mount and supplies are running low.”
- **Scoundrel:** “I want to keep people breathing in the middle of a firefight, using whatever supplies I can carry.”
- **Scout:** “I want to reach the wounded in dangerous ground and learn to stabilize them before help can arrive.”
- **Soldier:** “I want to serve as a combat medic, moving toward the injured when everyone else has to find cover.”

#### C60. Combat Engineer — `combat_engineer`

- **Universal base:** “I want to solve technical problems in the middle of a fight, repairing what breaks and overcoming obstacles others can't pass.”
- **Jedi:** “I want to learn the practical engineering needed to keep a team moving when the battlefield breaks its equipment.”
- **Noble:** “I want to coordinate engineering support in the field, ensuring crews have the tools to overcome obstacles and keep operating.”
- **Scoundrel:** “I want to fix damaged gear and improvise a way through obstacles before a mission goes completely sideways.”
- **Scout:** “I want to solve engineering problems in rough terrain, building what a team needs out of what we can carry.”
- **Soldier:** “I want to become a combat engineer, clearing obstacles, repairing equipment, and keeping my unit moving under fire.”

#### C61. Saboteur — `saboteur`

- **Universal base:** “I want to disable an enemy's equipment and infrastructure, making their plans unravel before the fighting even starts.”
- **Jedi:** “I want to learn how a hostile system works so I can disable it precisely and stop a threat before it spreads.”
- **Noble:** “I want to disrupt an enemy operation by finding the right point of failure and organizing a careful strike against it.”
- **Scoundrel:** “I want to slip into places I should not be and leave their machinery useless before anyone knows I was there.”
- **Scout:** “I want to reach hidden infrastructure, learn its weak points, and shut it down without being detected.”
- **Soldier:** “I want to specialize in disabling enemy equipment and supply routes, making sure their plans fall apart before they attack.”

#### C62. Fleet Strategist — `fleet_strategist`

- **Universal base:** “I want to plan campaigns across the stars, positioning entire fleets so the right battle is won before the first shot is fired.”
- **Jedi:** “I want to understand battles on a larger scale, learning how fleet movements can prevent needless losses.”
- **Noble:** “I want to plan the movements of entire fleets, turning intelligence and logistics into a decisive advantage.”
- **Scoundrel:** “I want to become the strategist who spots the gap in an enemy fleet and gives our ships the opening they need.”
- **Scout:** “I want to chart routes and positions for fleets, using what the terrain of space can tell us about the coming fight.”
- **Soldier:** “I want to plan fleet engagements, placing ships where they can support each other and bring their crews home.”

#### C63. Starship Gunner — `starship_gunner`

- **Universal base:** “I want to become an expert with starship weapons, protecting my crew by landing the shots that matter in battle.”
- **Jedi:** “I want to master starship weapons, keeping a clear mind when the crew depends on my aim.”
- **Noble:** “I want to become a trusted starship gunner, learning to coordinate my fire with the captain and the rest of the crew.”
- **Scoundrel:** “I want to run a shipboard gun, picking my shots fast and keeping trouble off our hull.”
- **Scout:** “I want to learn to read a ship battle from the gunner station and hit targets as they cross my sights.”
- **Soldier:** “I want to master shipboard gunnery, protecting my crew with accurate fire even when the deck is shaking.”

#### C64. Partisan — `partisan`

- **Universal base:** “I want to fight for a cause with whatever people and resources we can gather, striking where a stronger enemy least expects us.”
- **Jedi:** “I want to help a resistance survive against stronger forces, using patience and local knowledge to make every effort count.”
- **Noble:** “I want to organize a partisan movement, bringing scattered people and supplies together for a cause worth defending.”
- **Scoundrel:** “I want to fight from the shadows with people who know their own streets, hitting an occupying force where it hurts.”
- **Scout:** “I want to join a partisan band that knows the terrain, striking from concealment and disappearing before the enemy responds.”
- **Soldier:** “I want to fight as a partisan, using small-unit tactics and local support against an enemy with more troops than we have.”

#### C65. Astrogator — `astrogator`

- **Universal base:** “I want to chart hyperspace routes others wouldn't risk, guiding ships safely through unfamiliar stretches of the galaxy.”
- **Jedi:** “I want to learn the hidden patterns of hyperspace and guide travelers safely between distant worlds.”
- **Noble:** “I want to become an astrogator whose precise routes keep expeditions and commercial voyages on course.”
- **Scoundrel:** “I want to plot jumps that other navigators would never try, getting a ship through when the usual route is closed.”
- **Scout:** “I want to chart unfamiliar hyperspace passages, checking every calculation before we risk the jump.”
- **Soldier:** “I want to plan dependable hyperspace routes, making sure the ships carrying my people reach their destination.”

#### C66. Outlaw Tech — `outlaw_tech`

- **Universal base:** “I want to push machines beyond their intended limits, modifying and repairing equipment when official methods aren't enough.”
- **Jedi:** “I want to learn to repair and modify machines that official workshops refuse to touch, using my knowledge responsibly.”
- **Noble:** “I want to establish a discreet workshop where unusual equipment can be repaired or adapted when ordinary suppliers say no.”
- **Scoundrel:** “I want to tinker with forbidden modifications and odd parts, getting machines to do things their makers never intended.”
- **Scout:** “I want to keep battered frontier equipment alive with inventive repairs, even when the proper parts are nowhere nearby.”
- **Soldier:** “I want to adapt nonstandard gear for difficult missions and make repairs long after the manuals stop being useful.”

#### C67. Armorer — `armorer`

- **Universal base:** “I want to build and maintain weapons and armor that people can trust when their lives depend on them.”
- **Jedi:** “I want to learn the craft of making protective equipment that can save lives when words are no longer enough.”
- **Noble:** “I want to oversee the making and maintenance of dependable armor, ensuring people have protection suited to their duties.”
- **Scoundrel:** “I want to make custom armor and gear that fits the wearer and survives whatever trouble they get into.”
- **Scout:** “I want to design armor that holds up on long expeditions, where a broken plate can be the end of the road.”
- **Soldier:** “I want to build and maintain armor people can trust in combat, fitting it to the job rather than just making it heavier.”

#### C68. Electronic Warfare Specialist — `electronic_warfare_specialist`

- **Universal base:** “I want to control the flow of a battle through sensors, signals, and computer systems, keeping our side connected while the enemy goes blind.”
- **Jedi:** “I want to learn to disrupt hostile communications and sensors so people can act without being exposed.”
- **Noble:** “I want to coordinate electronic warfare, managing signals and information so an entire operation gains the advantage.”
- **Scoundrel:** “I want to jam enemy channels and fool their sensors, turning their expensive electronics against them.”
- **Scout:** “I want to read the electronic terrain, finding blind spots in sensors and communications that let us move unseen.”
- **Soldier:** “I want to control the information battle, keeping friendly systems working while enemy sensors and communications fail.”

#### C69. Shipwright — `shipwright`

- **Universal base:** “I want to design and construct starships, turning plans and raw materials into vessels capable of crossing the galaxy.”
- **Jedi:** “I want to understand how starships are built, helping turn careful designs into vessels people can safely trust.”
- **Noble:** “I want to oversee the construction of starships, bringing together skilled crews, materials, and sound designs.”
- **Scoundrel:** “I want to build ships that can take a beating and still fly, improving the design every time something breaks.”
- **Scout:** “I want to design vessels that can survive rough routes and long journeys beyond the repair yards.”
- **Soldier:** “I want to help construct durable starships, making sure their systems and hulls can stand up to real danger.”

#### C70. Disaster Responder — `disaster_responder`

- **Universal base:** “I want to reach people when catastrophe strikes, organizing relief and helping communities recover from the worst.”
- **Jedi:** “I want to reach people in the aftermath of catastrophe, bringing calm and practical help when everything seems lost.”
- **Noble:** “I want to organize disaster relief, making sure supplies and help reach those who need them most.”
- **Scoundrel:** “I want to work disaster zones, finding whatever tools and transport can get people out before things get worse.”
- **Scout:** “I want to reach isolated survivors after a disaster, finding safe routes and guiding rescue crews through.”
- **Soldier:** “I want to become a disaster responder, securing dangerous areas and helping people get to safety.”

#### C71. Pathfinder — `pathfinder`

- **Universal base:** “I want to find safe routes through hostile and unexplored terrain, guiding others beyond the last familiar trail.”
- **Jedi:** “I want to find safe ways through unknown places, learning to read danger before others step into it.”
- **Noble:** “I want to establish routes into unsettled regions, opening reliable paths for communities and expeditions.”
- **Scoundrel:** “I want to find shortcuts through dangerous country that no official guide would ever put on a map.”
- **Scout:** “I want to become a pathfinder, reading the terrain and leading people through places few travelers understand.”
- **Soldier:** “I want to scout routes ahead of a team, finding safe approaches before anyone walks into danger.”

#### C72. Jedi Guardian — `jedi_guardian`

- **Universal base:** “I want to walk the path of a Jedi Guardian, standing against danger when others need someone to defend them.”
- **Jedi:** “I want to follow the Guardian path, studying both the blade and the discipline it takes to shield others.”
- **Noble:** “I want to earn the training to become a Jedi Guardian, bringing my instinct to lead into service of those in danger.”
- **Scoundrel:** “I want to seek Jedi Guardian training and learn to stand between trouble and the people who cannot escape it.”
- **Scout:** “I want to pursue Jedi Guardian training, sharpening my awareness and learning to protect people far from safety.”
- **Soldier:** “I want to train as a Jedi Guardian, learning to bring courage and control to the front line when people need defending.”

#### C73. Jedi Consular — `jedi_consular`

- **Universal base:** “I want to follow the path of a Jedi Consular, using insight and the Force to help others find understanding before conflict begins.”
- **Jedi:** “I want to develop as a Jedi Consular, learning to guide difficult decisions with patience and knowledge of the Force.”
- **Noble:** “I want to pursue the Jedi Consular path, combining diplomacy with the understanding of the Force I hope to gain.”
- **Scoundrel:** “I want to learn the ways of a Jedi Consular, using careful words and a growing knowledge of the Force to settle trouble without a fight.”
- **Scout:** “I want to study as a Jedi Consular, traveling between communities and finding ways to resolve disputes before they spread.”
- **Soldier:** “I want to become a Jedi Consular, helping rival sides find peace before another battle becomes inevitable.”

#### C74. Jedi Sentinel — `jedi_sentinel`

- **Universal base:** “I want to become a Jedi Sentinel, investigating hidden threats and using both practical skills and the Force to confront them.”
- **Jedi:** “I want to walk the Sentinel path, learning to uncover threats and apply both practical skills and the Force to stop them.”
- **Noble:** “I want to pursue the Jedi Sentinel path, using investigation and judgment to find threats hidden behind respectable appearances.”
- **Scoundrel:** “I want to seek Sentinel training, learning to investigate secrets and face danger with more than a clever lie.”
- **Scout:** “I want to become a Jedi Sentinel, following subtle clues into places where ordinary searches come up empty.”
- **Soldier:** “I want to train as a Jedi Sentinel, tracking hidden enemies and dealing with dangers that a straightforward assault will not solve.”

#### C75. Sith Warrior — `sith_warrior`

- **Universal base:** “I want to pursue the path of a Sith Warrior, mastering combat and the Force until I can overcome any rival.”
- **Jedi:** “I want to pursue the Sith Warrior path, sharpening my combat skills and drawing ever greater power from the dark side.”
- **Noble:** “I want to become a Sith Warrior, turning my ambition into martial power and commanding respect through victory.”
- **Scoundrel:** “I want to train as a Sith Warrior, trading tricks and quick escapes for the power to face rivals head-on.”
- **Scout:** “I want to seek the Sith Warrior path, pursuing hard training and the dark side until I can overcome any foe.”
- **Soldier:** “I want to become a Sith Warrior, mastering weapons and the dark side to defeat those who stand against me.”

#### C76. Enforcer — `enforcer`

- **Universal base:** “I want to enforce the rules of the people I work for, finding those who cross them and making sure they answer for it.”
- **Jedi:** “I want to bring dangerous offenders to account, using patience and restraint when enforcing the rules I have sworn to uphold.”
- **Noble:** “I want to enforce the authority of an institution, knowing its rules well enough to make even powerful people answer for breaking them.”
- **Scoundrel:** “I want to track down people who cross the wrong organization, making sure they understand the cost of ignoring its rules.”
- **Scout:** “I want to pursue rulebreakers beyond the easy patrol routes and bring them back to answer for what they have done.”
- **Soldier:** “I want to enforce the rules under my command, confronting violators directly and keeping order when warnings fail.”

#### C77. Cantina Proprietor — `cantina_proprietor`

- **Universal base:** “I want to run a cantina where travelers can find a drink, a listening ear, and the sort of information they can't get anywhere else.”
- **Jedi:** “I want to keep a cantina where travelers can put aside old feuds, share stories, and find a little peace between journeys.”
- **Noble:** “I want to own a cantina that brings people together, building a reputation for hospitality and knowing the local community.”
- **Scoundrel:** “I want to run the kind of cantina where everyone knows my face, the drinks keep flowing, and useful rumors find their way to my counter.”
- **Scout:** “I want to open a cantina on a busy frontier route, giving weary travelers a place to rest and trade news from the road.”
- **Soldier:** “I want to run a cantina where crews can unwind safely, old comrades can meet, and trouble is dealt with before it spreads.”

#### C78. Assassin — `assassin`

- **Universal base:** “I want to take on contracts that demand stealth and precision, reaching a target unseen and finishing the job without a spectacle.”
- **Jedi:** “I want to pursue the assassin's trade, learning to approach a target unseen and end a deadly assignment with precision rather than spectacle.”
- **Noble:** “I want to take on assignments that require a discreet assassin, planning every detail so one precise act achieves the objective.”
- **Scoundrel:** “I want to make a living as an assassin, slipping past guards and leaving before anyone knows a contract has been completed.”
- **Scout:** “I want to track a target patiently, find an unseen approach, and learn to strike with the precision an assassin needs.”
- **Soldier:** “I want to become an assassin who can carry out a precise operation against a designated target without turning it into a firefight.”

#### C79. Survivalist — `survivalist`

- **Universal base:** “I want to rely on my own fieldcraft and endurance, surviving whatever the wilds throw at me when there's no one coming to help.”
- **Jedi:** “I want to learn to survive far from civilization, keeping my mind steady and making careful use of whatever the wilderness provides.”
- **Noble:** “I want to become self-reliant in the wilds, learning to live without the comforts or resources I might usually depend on.”
- **Scoundrel:** “I want to survive with whatever I can scrounge, trusting my wits when the ship is gone and nobody is coming to help.”
- **Scout:** “I want to master fieldcraft and endurance until bad weather, scarce supplies, and unfamiliar terrain no longer frighten me.”
- **Soldier:** “I want to stay alive when a mission leaves me isolated, learning to make shelter, find supplies, and outlast the conditions.”

#### C80. Search-and-Rescue Specialist — `search_and_rescue_specialist`

- **Universal base:** “I want to find people who are lost or trapped and bring them home, even when the terrain and the odds are against us.”
- **Jedi:** “I want to find people who are missing or trapped, learning to sense danger and reach them before hope runs out.”
- **Noble:** “I want to organize searches and rescues, bringing people, information, and resources together to get the lost home.”
- **Scoundrel:** “I want to go after people everyone else has written off, using every shortcut and trick I know to bring them back alive.”
- **Scout:** “I want to follow faint trails through dangerous terrain and find the lost before exposure or injury takes them.”
- **Soldier:** “I want to lead rescues into places others hesitate to enter, keeping the team moving until the people inside are safe.”

#### C81. Prospector — `prospector`

- **Universal base:** “I want to search remote worlds for valuable deposits and overlooked resources, risking the unknown for the chance at a discovery.”
- **Jedi:** “I want to search distant worlds for valuable natural deposits, learning to recognize what the land hides without destroying what surrounds it.”
- **Noble:** “I want to finance and direct prospecting expeditions, identifying valuable resources and turning discoveries into lasting enterprises.”
- **Scoundrel:** “I want to hunt for a rich strike on some forgotten moon, trusting my instincts to find what the big mining outfits missed.”
- **Scout:** “I want to survey uncharted ground for minerals and resources, reading the terrain before anyone else realizes what lies beneath it.”
- **Soldier:** “I want to prospect in dangerous territory, protecting my claim and my crew while we search for something worth digging up.”

#### C82. Colony Pioneer — `colony_pioneer`

- **Universal base:** “I want to help build a new settlement from the ground up, turning an unforgiving frontier into a place people can call home.”
- **Jedi:** “I want to help found a settlement where people can live safely, using patience and cooperation to turn unfamiliar ground into a home.”
- **Noble:** “I want to establish a new colony, organizing settlers, supplies, and institutions so the community can endure.”
- **Scoundrel:** “I want to help build a colony from spare parts and stubbornness, making a fresh start where nobody tells us how to live.”
- **Scout:** “I want to scout a place for a new settlement, learn its hazards, and help its first inhabitants survive the frontier.”
- **Soldier:** “I want to help establish a colony, securing its perimeter and teaching settlers how to protect the home we build together.”

#### C83. Beast Hunter — `beast_hunter`

- **Universal base:** “I want to track dangerous creatures into their own territory and learn how to survive the hunt.”
- **Jedi:** “I want to learn the ways of dangerous beasts, tracking them with care and confronting them only when the hunt demands it.”
- **Noble:** “I want to organize expeditions to hunt formidable creatures, studying their habits before anyone risks entering their territory.”
- **Scoundrel:** “I want to make a name hunting beasts that scare other people away, finding the trail and getting out with my prize.”
- **Scout:** “I want to track dangerous creatures through their own territory, learning their habits well enough to survive every encounter.”
- **Soldier:** “I want to hunt powerful beasts, preparing for their strength and meeting them with discipline instead of panic.”

#### C84. Beast Handler — `beast_handler`

- **Universal base:** “I want to understand and care for creatures others fear, earning their trust and learning to work alongside them.”
- **Jedi:** “I want to understand creatures that others fear, earning their trust through patience rather than forcing them to obey.”
- **Noble:** “I want to care for and train animals, learning how to manage their needs and work with them responsibly.”
- **Scoundrel:** “I want to get along with creatures that would bite anyone else, learning what makes them tick and how to earn their cooperation.”
- **Scout:** “I want to read an animal's behavior and care for it in the field, building trust even far from familiar surroundings.”
- **Soldier:** “I want to learn to handle and care for working beasts, keeping them calm and reliable when the situation turns dangerous.”

#### C85. Beast Rider — `beast_rider`

- **Universal base:** “I want to form a bond with a mount and learn to travel and fight as though we were one.”
- **Jedi:** “I want to train alongside a mount until we trust one another completely, learning to move through danger as partners.”
- **Noble:** “I want to master riding and care for a mount, learning the confidence and control needed to travel with it anywhere.”
- **Scoundrel:** “I want to ride a beast that can take me where engines cannot, building enough trust that we can get out of trouble together.”
- **Scout:** “I want to bond with a riding beast and cross difficult country together, learning its pace, instincts, and limits.”
- **Soldier:** “I want to train with a war mount, learning to maneuver and fight as a team without putting the animal at needless risk.”

#### C86. Propagandist — `propagandist`

- **Universal base:** “I want to shape the stories people believe, using words and images to rally support for the causes I serve.”
- **Jedi:** “I want to shape public understanding through speeches and stories, persuading people to support a cause I believe in.”
- **Noble:** “I want to direct campaigns of public messaging, choosing the words and images that can move opinion toward my cause.”
- **Scoundrel:** “I want to know how to sell a story to a crowd, turning a clever message into the support my cause needs.”
- **Scout:** “I want to bring firsthand accounts from distant places to the wider galaxy, using them to rally people behind a cause.”
- **Soldier:** “I want to craft messages that keep people committed to a cause, making sure the public understands why the struggle matters.”

#### C87. Revolutionary Statesman — `revolutionary_statesman`

- **Universal base:** “I want to help overthrow an unjust order, then build a government that won't repeat its mistakes.”
- **Jedi:** “I want to help replace an oppressive government, then work with others to build a fairer order that lasts beyond the rebellion.”
- **Noble:** “I want to lead political change, bringing down unjust institutions and helping write the laws that replace them.”
- **Scoundrel:** “I want to outmaneuver a corrupt regime and help build a new government that cannot be bought as easily as the old one.”
- **Scout:** “I want to carry a revolution beyond the capital, listening to distant communities and giving them a voice in what comes next.”
- **Soldier:** “I want to fight to end an unjust regime, then help create a government worthy of the sacrifices people made.”

#### C88. Warrior-Priest — `warrior_priest`

- **Universal base:** “I want to unite my beliefs with martial discipline, defending what I hold sacred through counsel or force when needed.”
- **Jedi:** “I want to join a sacred martial tradition, deepening my beliefs while learning when to offer counsel and when to defend them.”
- **Noble:** “I want to serve as a warrior-priest, guiding a community through faith and standing beside it when violence threatens.”
- **Scoundrel:** “I want to find a cause sacred enough to live by and learn the fighting skills to defend it when words fail.”
- **Scout:** “I want to follow a spiritual warrior tradition, carrying its teachings across distant places and protecting those who share them.”
- **Soldier:** “I want to bind my combat training to a sacred duty, serving as both a defender and a spiritual guide.”

#### C89. Sith Assassin — `sith_assassin`

- **Universal base:** “I want to wield the dark side from the shadows, slipping past defenses and striking before an enemy knows I'm there.”
- **Jedi:** “I want to follow the path of a Sith Assassin, learning to hide my approach and draw upon the dark side to defeat a target unseen.”
- **Noble:** “I want to pursue Sith Assassin training, using secrecy and the dark side to remove obstacles without announcing my intentions.”
- **Scoundrel:** “I want to become a Sith Assassin, combining a silent approach with forbidden Force training to strike before anyone is ready.”
- **Scout:** “I want to learn the Sith Assassin's methods, tracking a target through shadows and seeking the dark-side skills to close in unseen.”
- **Soldier:** “I want to train as a Sith Assassin, adding infiltration and dark-side techniques to the discipline of a precise strike.”

#### C90. Sith Sorcerer — `sith_sorcerer`

- **Universal base:** “I want to delve into forbidden Force lore and alchemy, mastering powers that others are too fearful to study.”
- **Jedi:** “I want to become a Sith Sorcerer, studying dark-side lore and alchemy until I can wield powers few dare to seek.”
- **Noble:** “I want to gather forbidden knowledge and pursue Sith sorcery, learning how its rituals and alchemy are practiced.”
- **Scoundrel:** “I want to seek out the secrets of Sith sorcery, following dangerous leads until I learn the dark arts others avoid.”
- **Scout:** “I want to travel to forgotten sites to study Sith sorcery, uncovering the lore and rituals hidden beyond known space.”
- **Soldier:** “I want to study Sith sorcery and alchemy, pursuing a kind of power that battlefield training alone cannot provide.”

#### C91. Sith Manipulator — `sith_manipulator`

- **Universal base:** “I want to use the dark side to bend hearts and decisions, gaining influence without needing to draw a blade.”
- **Jedi:** “I want to master Sith manipulation, studying how the dark side can influence minds and turn decisions in my favor.”
- **Noble:** “I want to become a Sith Manipulator, using influence and dark-side study to control decisions from behind the scenes.”
- **Scoundrel:** “I want to learn the Sith Manipulator's arts, mixing deceit with dark-side power until people choose what I want them to choose.”
- **Scout:** “I want to follow the hidden workings of Sith influence, learning how to manipulate rivals without openly confronting them.”
- **Soldier:** “I want to pursue Sith manipulation, gaining the influence to turn adversaries against one another before a battle begins.”

#### C92. Dark-Side Cultist — `dark_side_cultist`

- **Universal base:** “I want to devote myself to a secret dark-side tradition, learning its rituals and preserving the power it promises.”
- **Jedi:** “I want to join a dark-side tradition outside the familiar orders, learning its rites and understanding the power its members seek.”
- **Noble:** “I want to belong to a secret dark-side cult, studying its teachings and helping preserve its rituals across generations.”
- **Scoundrel:** “I want to find a hidden dark-side order and learn the rituals its members keep from the rest of the galaxy.”
- **Scout:** “I want to seek out an isolated dark-side tradition, traveling to its hidden sanctuaries to learn its practices.”
- **Soldier:** “I want to enter a dark-side cult and train within its rites, learning what its teachings demand of those who follow them.”

#### C93. Force Exile — `force_exile`

- **Universal base:** “I want to live beyond the reach of the Jedi and Sith, discovering what the Force means to me on my own terms.”
- **Jedi:** “I want to leave the Jedi and Sith behind, seeking a life where I can understand the Force without obeying either order.”
- **Noble:** “I want to live beyond the influence of Jedi and Sith institutions, seeking my own understanding of the Force and my place in the galaxy.”
- **Scoundrel:** “I want to stay clear of Jedi and Sith alike, chasing my own answers about the Force without letting either side claim me.”
- **Scout:** “I want to travel far from the great Force orders, exploring unfamiliar traditions and deciding for myself what the Force means.”
- **Soldier:** “I want to find an independent path with the Force, keeping my freedom instead of taking orders from Jedi or Sith.”

#### C94. Force Mystic — `force_mystic`

- **Universal base:** “I want to seek a deeper connection with the Force through meditation, tradition, and experiences beyond ordinary understanding.”
- **Jedi:** “I want to explore the Force through meditation and reflection, learning what quieter experiences can reveal beyond combat training.”
- **Noble:** “I want to seek instruction in the Force's mysteries, studying traditions that value contemplation and inner understanding.”
- **Scoundrel:** “I want to discover what the Force really means, following strange traditions and learning to be still long enough to listen.”
- **Scout:** “I want to explore remote traditions of the Force, finding places and teachers that deepen my understanding of its mysteries.”
- **Soldier:** “I want to pursue the Force through study and meditation, learning a discipline that goes beyond the drills I already know.”

#### C95. Force Seer — `force_seer`

- **Universal base:** “I want to learn to read visions and warnings in the Force, guiding my choices by what I sense may come.”
- **Jedi:** “I want to study visions of the Force, learning to recognize warnings without letting fear of the future decide everything.”
- **Noble:** “I want to seek the gift of foresight through the Force, learning to interpret signs that might help me guide others.”
- **Scoundrel:** “I want to learn how to read glimpses of the future through the Force, knowing when to trust a warning and when to question it.”
- **Scout:** “I want to follow signs and visions in the Force, learning to recognize dangers before anyone else can see them.”
- **Soldier:** “I want to study Force visions and foresight, learning how an early warning might keep people alive when plans fail.”

#### C96. Force Warrior — `force_warrior`

- **Universal base:** “I want to bring the Force into battle, sharpening my instincts and strength until my fighting becomes an extension of it.”
- **Jedi:** “I want to train as a Force Warrior, joining disciplined combat with the Force until each strengthens the other.”
- **Noble:** “I want to seek Force Warrior training, learning to combine martial skill with Force techniques rather than relying on status alone.”
- **Scoundrel:** “I want to become a Force Warrior, adding hard-earned Force training to the fighting instincts that keep me moving.”
- **Scout:** “I want to pursue the Force Warrior's path, blending field instincts and mobility with the Force in a fight.”
- **Soldier:** “I want to develop as a Force Warrior, bringing the Force into combat without forgetting discipline and teamwork.”

#### C97. Force Witch — `force_witch`

- **Universal base:** “I want to practice the Force through ancient rites and the natural world, learning the mysteries preserved by those who came before me.”
- **Jedi:** “I want to learn the ways of a Force Witch, studying ancient rites and the bond between the Force and the living world.”
- **Noble:** “I want to seek a Force Witch tradition, learning its rituals and helping preserve the knowledge passed through its practitioners.”
- **Scoundrel:** “I want to follow the Force Witch's old practices, finding the teachers and secrets others dismiss as superstition.”
- **Scout:** “I want to study Force Witch traditions among wild places and distant peoples, learning how they work with the living world.”
- **Soldier:** “I want to pursue Force Witch training, learning the rites and field wisdom of a tradition far from ordinary military life.”

### D. Q3 complete class situation and first-person reply bank — 30 scenarios + 150 responses

Each Q3 situation is selected by **starting class + actual Q1 answer**, not Q2 career and not Q4. The developer routing key shown is an editorial label and is not a certified canonical Q1 ID. All prompts are exactly **“What would you do?”**; first-person choice statements appear in the UI without their internal option IDs or `editorialFocus` annotations. Neutral fallback is selected only for an explicitly undecided Q1 response.

#### Jedi — Miraj

##### J01 — Q1 route: Jedi Guardian

**Situation:** An evacuation is underway when hostile raiders break through a station's security doors. Several civilians are trapped in an exposed corridor, and the people covering their escape are beginning to fall back. You are close enough to intervene, but you cannot be everywhere at once.

**Prompt:** What would you do?

1. **`J01-A1`** “I would hold the corridor and give the civilians time to escape.”
2. **`J01-A2`** “I would draw the raiders away from the trapped people and keep them focused on me.”
3. **`J01-A3`** “I would try to convince the raiders to stop, even if it only buys us a moment.”
4. **`J01-A4`** “I would look for another route and help the civilians through it before confronting anyone.”
5. **`J01-A5`** “I would organize the retreat so the defenders and civilians can move together.”

##### J02 — Q1 route: Jedi Sentinel

**Situation:** A remote outpost's emergency beacon has stopped broadcasting just as its security systems begin behaving unpredictably. The technicians suspect sabotage, while the frightened residents insist something stranger is happening. You have limited time before the next transport arrives.

**Prompt:** What would you do?

1. **`J02-A1`** “I would examine the security controls and trace where the failures began.”
2. **`J02-A2`** “I would question the technicians and residents separately to find what their stories have in common.”
3. **`J02-A3`** “I would secure the most dangerous systems first so no one gets hurt while we investigate.”
4. **`J02-A4`** “I would quietly search for signs that someone deliberately interfered with the outpost.”
5. **`J02-A5`** “I would bring the frightened residents together and help them organize a response.”

##### J03 — Q1 route: Jedi Consular

**Situation:** Two groups sheltering in a storm-damaged enclave both claim the only functioning medical station. Their representatives are arguing, injured people are waiting, and no one trusts the other side to distribute care fairly.

**Prompt:** What would you do?

1. **`J03-A1`** “I would bring the two groups together and work toward a fair arrangement for treating the injured.”
2. **`J03-A2`** “I would help the most critically injured people first and let the argument wait.”
3. **`J03-A3`** “I would ask what each group fears losing, then look for a compromise they can trust.”
4. **`J03-A4`** “I would organize a clear treatment schedule and ask both groups to help enforce it.”
5. **`J03-A5`** “I would investigate whether another space or set of supplies could serve as a second care station.”

##### J04 — Q1 route: Jedi Watchman

**Situation:** Small objects have vanished from a frontier settlement, and a young resident has now gone missing. The local authorities blame an outsider, but the few witnesses contradict one another and someone has tampered with the security logs.

**Prompt:** What would you do?

1. **`J04-A1`** “I would retrace the missing resident’s last movements and examine the places they visited.”
2. **`J04-A2`** “I would question the witnesses calmly and compare the details they remember.”
3. **`J04-A3`** “I would study the altered security logs and look for whoever had access to them.”
4. **`J04-A4`** “I would keep watch near the likely next target and wait to see who appears.”
5. **`J04-A5`** “I would protect the accused outsider while gathering enough evidence to challenge the accusation.”

##### J05 — Q1 route: Jedi Duelist

**Situation:** During a confrontation in a crowded hangar, an armed opponent challenges you at close range. Cargo, machinery, and fleeing workers limit your movement, and a reckless attack could put others in danger.

**Prompt:** What would you do?

1. **`J05-A1`** “I would keep my movements controlled and use the space around us to defend against each strike.”
2. **`J05-A2`** “I would maneuver the opponent away from the workers before committing to the fight.”
3. **`J05-A3`** “I would try to end the confrontation through words before either of us swings.”
4. **`J05-A4`** “I would look for a chance to disarm the opponent rather than injure them.”
5. **`J05-A5`** “I would guide the workers toward safety and let my allies create room for us to act.”

##### J06 — Q1 route: Undecided (neutral fallback)

**Situation:** During your first assignment away from familiar surroundings, a settlement reports a disturbance near its power station. The equipment is malfunctioning, residents are frightened, and a security patrol is demanding immediate action. No one agrees on what caused the problem.

**Prompt:** What would you do?

1. **`J06-A1`** “I would inspect the failing equipment and work out what is actually wrong.”
2. **`J06-A2`** “I would speak with the residents and compare what each person saw.”
3. **`J06-A3`** “I would keep people clear of the power station until we know whether it is safe.”
4. **`J06-A4`** “I would ask the security patrol to coordinate with the technicians instead of acting blindly.”
5. **`J06-A5`** “I would quietly observe the area for anything that does not belong there.”

#### Noble — J0-N1

##### N01 — Q1 route: Officer / Leader

**Situation:** You are asked to organize a small group evacuating a damaged transit hub. Two volunteers disagree over who should lead, one exit is blocked, and frightened passengers are beginning to scatter.

**Prompt:** What would you do?

1. **`N01-A1`** “I would assign people clear tasks and get the evacuation moving before the disagreement spreads.”
2. **`N01-A2`** “I would hear both volunteers out and win their cooperation before choosing a plan.”
3. **`N01-A3`** “I would check the blocked exit and identify the safest available route.”
4. **`N01-A4`** “I would work with the frightened passengers directly and keep them moving in small groups.”
5. **`N01-A5`** “I would ask the volunteers to lead separate jobs so both can contribute without fighting for control.”

##### N02 — Q1 route: Diplomat / Negotiator

**Situation:** A patrol has halted your group's passage through a checkpoint after a misunderstanding over travel authorization. The officer is suspicious, one companion is growing angry, and a crowd is forming behind you.

**Prompt:** What would you do?

1. **`N02-A1`** “I would calmly explain the misunderstanding and ask what proof would satisfy the officer.”
2. **`N02-A2`** “I would stop my companion from escalating matters and make sure we present one clear account.”
3. **`N02-A3`** “I would review our documents and look for a legitimate authorization the officer overlooked.”
4. **`N02-A4`** “I would find out what the officer is concerned about and offer a practical way to address it.”
5. **`N02-A5`** “I would ask for a supervisor or neutral official before the crowd makes the situation worse.”

##### N03 — Q1 route: Tactician / Planner

**Situation:** A supply convoy has two possible routes to a cut-off community. The faster route is exposed to raiders; the safer road may be blocked by a recent landslide. You have incomplete maps and only enough fuel to commit to one route.

**Prompt:** What would you do?

1. **`N03-A1`** “I would compare the routes, estimate the risks, and choose the one most likely to get us through.”
2. **`N03-A2`** “I would send a small reconnaissance team to confirm whether the supposedly safer road is open.”
3. **`N03-A3`** “I would talk with local guides and drivers before trusting the incomplete maps.”
4. **`N03-A4`** “I would organize the convoy to handle an ambush if we have to take the exposed route.”
5. **`N03-A5`** “I would look for a way to reduce our load or conserve fuel so we have more than one option.”

##### N04 — Q1 route: Mastermind / Influence

**Situation:** Essential supplies keep disappearing from a relief depot, yet every inventory report claims the shipments are complete. The depot supervisor is unusually defensive, several workers know more than they admit, and openly accusing anyone could shut down cooperation.

**Prompt:** What would you do?

1. **`N04-A1`** “I would examine the shipment records and follow the inconsistencies until they point somewhere.”
2. **`N04-A2`** “I would speak privately with the workers and earn enough trust to learn what they know.”
3. **`N04-A3`** “I would put a new inventory process in place and see when the losses stop.”
4. **`N04-A4`** “I would quietly observe the depot during deliveries to catch the theft as it happens.”
5. **`N04-A5`** “I would bring in a trusted outside reviewer so no one can dismiss the findings as a personal accusation.”

##### N05 — Q1 route: Public Figure / Patron

**Situation:** A small community needs replacement parts for its failing water system. Several potential supporters are willing to help, but each wants a different public commitment in return, and residents disagree over whose offer to accept.

**Prompt:** What would you do?

1. **`N05-A1`** “I would negotiate support without promising the community something it cannot accept.”
2. **`N05-A2`** “I would invite residents to decide which commitments they are willing to make.”
3. **`N05-A3`** “I would approach more supporters so no one donor can dictate the terms.”
4. **`N05-A4`** “I would examine the actual repair needs and ask for only the resources that matter most.”
5. **`N05-A5`** “I would publicly explain every offer so the community can judge the tradeoffs.”

##### N06 — Q1 route: Undecided (neutral fallback)

**Situation:** At a community meeting, residents demand help after a transport accident. Officials blame one another, the affected families want answers, and resources are limited. You are invited to help move the discussion forward.

**Prompt:** What would you do?

1. **`N06-A1`** “I would give the families a chance to speak and make sure their concerns shape the response.”
2. **`N06-A2`** “I would identify the resources available and organize immediate help for those affected.”
3. **`N06-A3`** “I would ask the officials to state what they know, what they do not, and who will investigate.”
4. **`N06-A4`** “I would work out a short list of decisions the group can make right now.”
5. **`N06-A5`** “I would speak privately with the people arguing and look for common ground.”

#### Scoundrel — Ol' Salty

##### SC01 — Q1 route: Pirate / Spacer

**Situation:** The freighter you're traveling on drops out of hyperspace farther from its destination than expected. A patrol vessel is approaching, the navigation readings are inconsistent, and the crew is arguing over whether to run, hide, or make contact.

**Prompt:** What would you do?

1. **`SC01-A1`** “I would check the ship’s instruments and find out whether the navigation error is getting worse.”
2. **`SC01-A2`** “I would take the controls and look for a route that keeps us out of the patrol’s path.”
3. **`SC01-A3`** “I would contact the patrol and talk us through the encounter without revealing more than necessary.”
4. **`SC01-A4`** “I would have the crew prepare a convincing explanation while I work out what the patrol wants.”
5. **`SC01-A5`** “I would get everyone working together on our position, fuel, and escape options before making a move.”

##### SC02 — Q1 route: Trickster / Gambler

**Situation:** A routine exchange at a crowded gaming hall suddenly turns against you when your contact changes the terms and quietly signals two associates to block the exits. You have seconds to decide whether the situation can be turned around or abandoned.

**Prompt:** What would you do?

1. **`SC02-A1`** “I would keep talking, act confident, and see whether I can make the contact doubt their own advantage.”
2. **`SC02-A2`** “I would look for a distraction and slip toward an exit before the trap closes.”
3. **`SC02-A3`** “I would study the associates and work out which one is least committed to the plan.”
4. **`SC02-A4`** “I would turn the deal into a new bargain that gives the contact a reason to let me go.”
5. **`SC02-A5`** “I would signal my companions to cover the exits while I keep the contact occupied.”

##### SC03 — Q1 route: Gunslinger

**Situation:** Blaster fire erupts inside a busy maintenance bay. The attackers are using machinery for cover, a companion is pinned down, and workers are trying to escape across your line of sight.

**Prompt:** What would you do?

1. **`SC03-A1`** “I would take careful shots at the attackers when the workers are clear of my line of fire.”
2. **`SC03-A2`** “I would move around the machinery and force the attackers to watch more than one angle.”
3. **`SC03-A3`** “I would lay down covering fire so my companion can get out of danger.”
4. **`SC03-A4`** “I would look for a way to shut down the machinery or lights and disrupt the attackers’ advantage.”
5. **`SC03-A5`** “I would call out a route for the workers and coordinate our escape instead of staying to trade shots.”

##### SC04 — Q1 route: Con Artist / Social Operator

**Situation:** A suspicious docking official demands paperwork your group cannot immediately produce. A companion is about to offer an obviously contradictory explanation, and the official's hand is moving toward a security alarm.

**Prompt:** What would you do?

1. **`SC04-A1`** “I would take over the conversation and give the official a story they can accept.”
2. **`SC04-A2`** “I would ask what authorization we need and try to negotiate a legitimate way through.”
3. **`SC04-A3`** “I would interrupt my companion before the contradictions give us away.”
4. **`SC04-A4`** “I would distract the official long enough for someone else to find the missing paperwork.”
5. **`SC04-A5`** “I would look for a reason to withdraw politely and return when we are better prepared.”

##### SC05 — Q1 route: Slicer / Saboteur

**Situation:** A warehouse security lockdown seals the door to your group's escape route. The control terminal still has power, but its access permissions have been changed; nearby machinery might provide another way through if you can work quickly.

**Prompt:** What would you do?

1. **`SC05-A1`** “I would work through the terminal and try to restore the access permissions.”
2. **`SC05-A2`** “I would inspect the nearby machinery for a mechanical way around the locked door.”
3. **`SC05-A3`** “I would search for a maintenance route instead of fighting the security system.”
4. **`SC05-A4`** “I would find the sensor or alarm causing the lockdown and work out how to isolate it.”
5. **`SC05-A5`** “I would organize the group to keep watch and clear a path while I tackle the problem.”

##### SC06 — Q1 route: Undecided (neutral fallback)

**Situation:** A simple delivery job falls apart when the intended recipient vanishes, the promised payment is missing, and someone begins asking questions about your cargo. You have a few minutes to decide what to do next.

**Prompt:** What would you do?

1. **`SC06-A1`** “I would find out who last saw the recipient and follow the trail before it goes cold.”
2. **`SC06-A2`** “I would keep the cargo out of sight until I know who is asking about it.”
3. **`SC06-A3`** “I would contact whoever hired me and negotiate a new arrangement before taking another risk.”
4. **`SC06-A4`** “I would check the cargo for anything that explains why everyone suddenly cares about it.”
5. **`SC06-A5`** “I would gather my companions, compare what we know, and decide whether to leave immediately.”

#### Scout — Lead

##### ST01 — Q1 route: Skirmisher / Mobility

**Situation:** Your group is ambushed while crossing a narrow ravine. The attackers control the main trail, the nearest cover is scattered along the slope, and staying where you are leaves everyone exposed.

**Prompt:** What would you do?

1. **`ST01-A1`** “I would move from cover to cover and find an angle the attackers have not secured.”
2. **`ST01-A2`** “I would study the ravine and identify a safe route for everyone to retreat.”
3. **`ST01-A3`** “I would use careful return fire to keep the attackers occupied while the group moves.”
4. **`ST01-A4`** “I would climb toward a better observation point and find out how many attackers there are.”
5. **`ST01-A5`** “I would coordinate a quick push to the nearest defensible position instead of scattering.”

##### ST02 — Q1 route: Explorer / Survivalist

**Situation:** A sudden storm destroys your group's navigation equipment in unfamiliar wilderness. Night is approaching, drinking water is running low, and the most obvious route back crosses unstable ground.

**Prompt:** What would you do?

1. **`ST02-A1`** “I would find shelter and secure clean water before attempting a dangerous route in the dark.”
2. **`ST02-A2`** “I would study the terrain and weather for a safer path back.”
3. **`ST02-A3`** “I would inventory our gear and make the supplies last until conditions improve.”
4. **`ST02-A4`** “I would scout ahead for a landmark or a place to signal for help.”
5. **`ST02-A5`** “I would organize the group so no one becomes exhausted or separated while we move.”

##### ST03 — Q1 route: Sniper / Recon Marksman

**Situation:** From an observation point, you spot an enemy lookout signaling toward a nearby camp. Your position gives you a partial view, but distance, cover, and moving figures make an immediate shot uncertain.

**Prompt:** What would you do?

1. **`ST03-A1`** “I would wait for a clear line of sight and take a shot only if I can identify the target.”
2. **`ST03-A2`** “I would keep observing to learn who the lookout is signaling and what the camp is preparing.”
3. **`ST03-A3`** “I would change position quietly to improve my view without exposing the group.”
4. **`ST03-A4`** “I would alert my companions and plan a coordinated response before anyone acts.”
5. **`ST03-A5`** “I would look for a way to bypass the lookout entirely and avoid starting a fight.”

##### ST04 — Q1 route: Ranger / Tracker

**Situation:** A search party has failed to return from the foothills. You find two sets of tracks leading away from their last camp, but heavy rain is erasing the signs and one trail approaches dangerous cliffs.

**Prompt:** What would you do?

1. **`ST04-A1`** “I would examine both trails for signs that show which searchers went where.”
2. **`ST04-A2`** “I would check the cliff route first from a safe vantage point in case someone is trapped there.”
3. **`ST04-A3`** “I would speak with anyone who saw the party leave and compare their account with the tracks.”
4. **`ST04-A4`** “I would divide the search into clear responsibilities so we can cover ground without losing anyone.”
5. **`ST04-A5`** “I would establish a safe route back before chasing either trail deeper into the hills.”

##### ST05 — Q1 route: Pilot / Outrider

**Situation:** You are helping bring a shuttle down near a remote landing site when a dust storm reduces visibility. One approach is shorter but crosses rough terrain; the other is longer, and the ship's fuel reserve is shrinking.

**Prompt:** What would you do?

1. **`ST05-A1`** “I would rely on the instruments and make the approach that gives us the most reliable readings.”
2. **`ST05-A2`** “I would circle to study the storm and find a safer opening before descending.”
3. **`ST05-A3`** “I would assess the shuttle’s fuel and decide how much time we can afford to spend searching.”
4. **`ST05-A4`** “I would ask the crew to help track terrain and hazards while I manage the approach.”
5. **`ST05-A5`** “I would look for another landing site rather than force the shuttle into a dangerous descent.”

##### ST06 — Q1 route: Undecided (neutral fallback)

**Situation:** Your group reaches an unmarked crossing and discovers the route ahead has been damaged by a flood. Supplies are limited, an unfamiliar signal is coming from beyond the crossing, and the group needs a way forward.

**Prompt:** What would you do?

1. **`ST06-A1`** “I would inspect the damaged crossing and decide whether any part of it is still safe to use.”
2. **`ST06-A2`** “I would follow the unfamiliar signal far enough to learn whether it means help or danger.”
3. **`ST06-A3`** “I would scout along the floodplain for another place to cross.”
4. **`ST06-A4`** “I would organize a temporary camp and conserve supplies while we assess our options.”
5. **`ST06-A5`** “I would ask everyone what they have noticed before committing the group to a route.”

#### Soldier — Breach

##### SO01 — Q1 route: Heavy Weapons

**Situation:** A hostile armored vehicle is covering an approach to an evacuation corridor. A mounted heavy weapon is available nearby, but its firing lane is narrow, ammunition is limited, and civilians are still moving through the area.

**Prompt:** What would you do?

1. **`SO01-A1`** “I would use controlled bursts to force the vehicle back while the civilians clear the lane.”
2. **`SO01-A2`** “I would hold fire until I have a shot that does not put the evacuees at risk.”
3. **`SO01-A3`** “I would organize the evacuation so the civilians are out of the firing lane before we engage.”
4. **`SO01-A4`** “I would look for a weak point in the vehicle’s position instead of spending ammunition blindly.”
5. **`SO01-A5`** “I would work with the other defenders to distract the vehicle and move the civilians through another route.”

##### SO02 — Q1 route: Tank / Armored Defender

**Situation:** Your team is retreating through a damaged checkpoint when enemy fire cuts off the rear group. An injured teammate cannot move quickly, and the only solid cover is too far away to protect everyone at once.

**Prompt:** What would you do?

1. **`SO02-A1`** “I would move to protect the injured teammate and buy them time to reach cover.”
2. **`SO02-A2`** “I would cover the rear group while the others organize a safer withdrawal.”
3. **`SO02-A3`** “I would identify the safest route and direct each teammate toward it in turn.”
4. **`SO02-A4`** “I would move around the attackers and draw their attention away from the wounded.”
5. **`SO02-A5`** “I would check what cover or equipment we can reposition to shield the retreat.”

##### SO03 — Q1 route: Infantry / Rifle Marksman

**Situation:** Enemy fighters are firing from several windows overlooking a narrow street. Your squad must cross, but only brief glimpses reveal where the hostile fire is coming from, and ammunition is running low.

**Prompt:** What would you do?

1. **`SO03-A1`** “I would watch the windows and wait for clear shots instead of wasting ammunition.”
2. **`SO03-A2`** “I would coordinate covering fire so the squad can cross in stages.”
3. **`SO03-A3`** “I would move to another angle and force the attackers to abandon their positions.”
4. **`SO03-A4`** “I would identify which window is controlling the street and concentrate our attention there.”
5. **`SO03-A5`** “I would look for a protected route around the street rather than fight on the enemy’s terms.”

##### SO04 — Q1 route: Brawler / Close Quarters

**Situation:** A hostile boarder blocks the only accessible passage off a damaged ship compartment. The corridor is cramped, a ruptured fuel line makes stray blaster fire hazardous, and an ally needs you to clear a path.

**Prompt:** What would you do?

1. **`SO04-A1`** “I would close the distance carefully and force the boarder away from the passage.”
2. **`SO04-A2`** “I would hold the boarder’s attention while my ally finds a way past.”
3. **`SO04-A3`** “I would use the cramped space to pin the opponent long enough to clear the corridor.”
4. **`SO04-A4`** “I would search for a hatch or maintenance route that lets us avoid the confrontation.”
5. **`SO04-A5`** “I would coordinate with my ally to create an opening instead of facing the boarder alone.”

##### SO05 — Q1 route: Sergeant / Squad Leader

**Situation:** Two members of your squad disagree about how to withdraw from a compromised position. Communications with command are down, the extraction window is closing, and the rest of the team is waiting for direction.

**Prompt:** What would you do?

1. **`SO05-A1`** “I would make the call, give everyone a clear role, and start the withdrawal immediately.”
2. **`SO05-A2`** “I would hear both plans quickly and choose the one that protects the most teammates.”
3. **`SO05-A3`** “I would scout the escape route before risking the whole squad on it.”
4. **`SO05-A4`** “I would organize covering positions so everyone can move without being left behind.”
5. **`SO05-A5`** “I would focus first on anyone injured or cut off, then build the withdrawal around getting them out.”

##### SO06 — Q1 route: Undecided (neutral fallback)

**Situation:** A remote outpost has taken damage during a surprise attack. One person is wounded, a defense system has failed, and scouts report that the attackers may return soon. The available team can only address one immediate problem at a time.

**Prompt:** What would you do?

1. **`SO06-A1`** “I would get the wounded person to safety and arrange immediate care.”
2. **`SO06-A2`** “I would restore or defend the broken security system before another attack.”
3. **`SO06-A3`** “I would organize everyone into a clear plan with jobs they can carry out.”
4. **`SO06-A4`** “I would scout the surrounding area to learn how close the attackers really are.”
5. **`SO06-A5`** “I would reposition the defenders and prepare the outpost for another assault.”


---

## Changelog

- **2026-11-13 — v0.16 (complete inline consolidation and Q4 handoff):** Embedded all 25 fixed Mentor-stage lines, all 30 Q1 player statements, all 97 universal Q2 lines plus 485 class-specific Q2 variants, and all 30 Q3 situations with 150 player replies directly in the rolling Markdown. Verified exact source counts and separated older Q3/Q4 career-situation instructions from the current Q3 class/Q4 parent decision. Added a dedicated parent-career Q4 authoring/QA plan and skip-behavior question. All narrative assets remain editorial until approved and all mechanical references must be certified. Local-only; no repository changes.

- **2026-11-13 — v0.15 (Q3 answer bank drafted):** Drafted 150 unique first-person response choices across all 30 Q1-keyed class situations (five each), preserved scenario/prompt text, and documented neutral fallback, independent Q4 authority, player-only quoted display, and unverified editorial-method notes. Canonical mechanics/tags are **not certified**; options and Mentor introduction rewording remain subject to review. Local-only documentation, no code/Git changes.

- **2026-11-13 — v0.14 (Q3 prompt standardized):** Per owner editorial direction, retained 30 Q1-driven class situations and replaced their bespoke open-ended closing questions with the single neutral phrase “What would you do?”. Five first-person response options per scenario remain uncreated. The Q3 fixed Mentor intros and Q4 parent-career scenario authority are unchanged; Mentor Q3 intro redundancy should be reviewed separately. No implementation or GitHub changes.

- **2026-11-13 — v0.13 (Q3/Q4 differentiated; Q3 scenarios drafted):** User approved Q3 as a starting-class situation and Q4 as the selected parent-career situation. Authored 25 distinct class-direction Q3 challenges keyed one-to-one to substantive Q1 answers plus five undecided neutral fallback challenges, 30 total. First-pass scenario/question wording is proposed for review, not yet accepted. Q3 response options, Q4 situations, mechanics/tags and Q3 Mentor-intro updates remain open. Older interchangeable parent-situation-pair rules are superseded. No GitHub/code changes.

- **2026-11-13 — v0.12 (owner-approved 20 class anchors; Q2 repeat-free paging and opt-out):** Approved four preferred canonical parent-career anchors for each of Jedi, Noble, Scoundrel, Scout and Soldier (20 total). A/B are strongest distinct class-relevant selections, normally from preferred anchors but not exclusively; C/D/E are the next three highest-ranked remaining parents. F generates a new set of five highest-ranked unseen careers with no repeated parent across pages, reaching all 97 without a separate sixth question. No Q2 career selection is an explicitly valid neutral outcome. Ranking weights, F text, skip-aware Q3/Q4 handling, and live code remain open. **Design record only; no repository modifications.**

- **2026-11-13 — v0.11 (content checkpoint and ontology reuse):** Recorded all five fixed Mentor voice banks (25 lines, class-owned), owner-approved first-person-only choice display, all five drafted/reviewed Q1 class banks (30 utterances), full 97-parent Q2 universal bank and 485 class-specific variants. Direct JSON QA confirms 97 unique IDs, 485 nonempty distinct variants. Clarified that the parent archetype's frozen 190-tag ontology/typed mechanics is reused, while species uses separate tags/traits and attributes are numeric, not invented ontology tokens. Added proposed A/B/C/D/E selection contract and corrected current implemented-vs-drafted statuses. Q1 evidence mappings, Q2 ranker, Q3/Q4 bank and Q5 content remain open. No GitHub/code changes.

- **2026-11-10 — v0.10 (dialogue presentation simplified):** User agreed mentors should deliver a curated, fixed stage line before a generic/shared substantive question, with **no need to recognize or react to the previous answer**. Dynamic logic still controls relevance, canonical answers and ranking behind the presentation. Corrected v0.9 overreach: personalized post-answer acknowledgments/branching are not required. Reuse existing persona-authored dialogue; no GitHub changes.

- **2026-11-10 — v0.9 (dialogue reuse discovery):** Inspected active generated mentor data, nested authored dialogue profiles, suggestion dialogue templates, and Level 1 progression integration. Recorded potential reuse for Q1-Q5 and after-answer reactions; distinguished class persona from canonical mechanics. Flagged dialogue-source/loader divergence and generic voice leakage for verification. This is a proposed integration and audit plan, not an approved implementation; no GitHub changes.
- **2026-11-10 — v0.8 (mentor ownership and D14):** User clarified that **Miraj exclusively mentors Jedi**; each other foundation class and every prestige class has its own named mentor and distinct voice. Refactor must separate mentor narration/presentation from shared canonical question, scenario, and scoring authority. Revised decision **D14**: Q2–Q4 **answers themselves should offer potential class skills, talent directions, and class features that could be developed or used**; supplemental mechanics explanations alone are insufficient. Keep current abilities separate from future choices, follow verified legality, and do not count display of an option as player intent. No GitHub changes.

- **2026-11-10 — v0.7 (reorder, metadata-first, class mentorship, Q5 framing):** Recorded the new five-question sequence: Q1 class-specific immediate development direction; Q2 dynamically ranked parent career aspiration from class/species/attributes plus Q1; Q3/Q4 two independent contextual situations from the shared library; Q5 intended long-term build intent, exact form open. Established **first engineering priority: connect canonical archetype/typed mechanic metadata and current chargen state to survey ranking and existing suggestion consumers**. Added explicit user requirement that **Q2, Q3, Q4 can teach/nudge** with accurate class features, skills and talents while preserving autonomy and not treating exposure as positive intent evidence. Updated old Q1/Q2/Q3 references in active design, retaining prior revisions only as provenance. No GitHub changes.

- **2026-11-10 — v0.6 (shared Q2/Q3 scenario pool):** Recorded that “100 questions” was illustrative, not a requested quota. Replaced the old Q2-only numeric plan with one reusable scenario library indexed many-to-many by careers and usable in either question position. Q2 and Q3 are independent situational angles of Q1; Q3 selection does not depend on the Q2 answer. Both contribute mechanical/playstyle metadata, not morality scoring. Q4–Q5 remain open. No GitHub changes.

- **2026-11-10 — v0.5 (scope correction):** Clarified that the approved discussion is **Q2 only**. Replaced premature Q2/Q3 combined budget (32 scenarios / ~320 responses) with a **provisional Q2-only** budget of 16 scenario families, 16 Q2 prompts, and ~160 candidate response entries. Marked Q3–Q5 undecided and not budgeted. No GitHub changes.
- **2026-11-10 — v0.4 (superseded by v0.5):** Originally recorded an overbroad Q2/Q3 scenario budget; the user clarified Q3 had not yet been discussed. Retained here only as change history, **not** as an active design decision.
- **2026-11-10 - v0.3:** Verified existing additive survey-answer accumulation, identity layering/decay, Level 1 skill and background scoring, three-horizon candidate scoring, tag-source max aggregation, and distinction between prestige reinforcement and repeated-answer reinforcement. No GitHub changes.
- **2026-11-10 — v0.2:** Added user-provided career-mentor framing, the distinction between a Level 1 intake interview and long-term Mentor support, the player-autonomy principle, and related open design decisions. No repository changes.
- **2026-11-10 — v0.1:** Initial rolling document assembled from the Level 1 adaptive survey design discussion and direct GitHub review of the 297-record SSOT. No repository changes.