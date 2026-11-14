# SWSE Level 1 Adaptive Mentor Survey — Rolling Design Document

**Project:** SWSE Foundry VTT v13 / V2 convergence (`docflowGM/foundryvtt-swse`)  
**Document status:** Working design record; **not** an implementation directive or finalized questionnaire  
**Created:** 2026-11-10  
**Revision:** 0.14 (2026-11-13 Q3 prompt simplified to fixed “What would you do?”; 30 situations retained; Q4 parent-specific; implementation pending)  
**Storage:** Local conversation workspace only. **Do not commit, push, or upload to GitHub without explicit authorization.**  
**Scope:** **Level 1 character generation only.** Multiclass/new-base-class and prestige interviews require separate designs and are out of scope here.

> **Maintenance convention:** This is a *rolling* document. Amend decisions in place as design discussions continue; record substantive changes in the changelog. Distinguish **agreed design**, **verified repository facts**, **illustrative examples**, and **open decisions**. Do not label examples as implemented behavior.

---

## CURRENT DESIGN CHECKPOINT — 2026-11-13 (v0.13; read this first)

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

## Changelog

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