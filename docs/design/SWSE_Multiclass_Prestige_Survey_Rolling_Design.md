# SWSE Multiclass and Prestige Mentor Surveys — Rolling Design

**Project:** SWSE Foundry VTT v13 / V2 convergence (`docflowGM/foundryvtt-swse`)  
**Status:** Working conceptual record; not implementation approval  
**Created:** 2026-11-11  
**Revision:** 0.9 (adds the accepted current-identity / declared-future / eligibility / achievement separation and the linked Talk to Mentor career-exploration and on-demand Q6 contracts; all earlier sections retained; no implementation authorized)  
**Repository scope examined:** GitHub `main` read-only review through 2026-11-13; no live Foundry validation  
**Git policy:** Local only; do not commit/push without explicit authorization.

**LATEST DESIGN AUTHORITY (2026-11-13):** Sections 9–11 below contain the latest decisions and supersede older, explicitly provisional wording in Sections 1, 3, 4, 6, and 8 where inconsistent. Both multiclass and prestige now use five topic questions PLUS Q6 Mentor Reflection and conditional branches. All selectable answers, including checkbox follow-ups, are first-person character speech and never expose score, tags, percentages, or internal mechanics. Prestige is the earned culmination of a character concept, not presumptively a stepping stone. Sections 10–11 propose diagnostics, passive adoption telemetry, and observational choice/metadata prevalence reports; they are recommendations for design, **not authorized implementation**. Section 12 adds the **proposed** Talk to Mentor overhaul, including a read-only audit of current source code; this proposal has not yet been approved for implementation. **Section 13 supersedes Section 12 on the specifically owner-confirmed semantics of current identity versus declared future, career-exploration response effects, and on-demand Q6; all remaining technical implementation details remain proposals.**

## 1. Central design requirement — player-confirmed

**Dip / Dive / Swim is central to BOTH the ordinary multiclass (new foundation class) and prestige-class (PRC) mentor surveys.** It must not be an incidental scoring label or optional afterthought. A player's *intended investment depth* must be explicitly captured and used to inform relevant advancement advice. Exact survey positioning, weights, level horizons, and any auxiliary categories remain open for discussion.

**Conceptual working glossary (proposed, not yet approved numerical definitions):**

| Intent | Meaning | Suggestion emphasis |
|---|---|---|
| Dip | A limited investment to acquire focused tools or specific capabilities. | Near-term/high-value legal options; avoid assuming a permanent change of primary identity. |
| Dive | A meaningful secondary or transitional discipline with several intended levels. | Coherent middle-term development, synergy and combination with existing build. |
| Swim | A major, enduring identity or long-term commitment to the new class/path. | Deeper class development and a sustained pathway, without forcing it. |

Keep **stated intention**, **actual class levels invested**, and **declared career/build ambition** distinguishable. An intention is advisory, not a compulsory level-count lock. Bridge (a class used to reach a later destination) is a **route purpose**, not an investment-depth category in the recommended architecture; a character can Dip, Dive, or Swim along a bridge. The exact placement and interaction are still open for final approval.

## 2. Verified repository implementation (not necessarily design authority)

- `scripts/mentor/mentor-survey/base-class-survey-definitions.js` defines a five-question first-time NEW base class survey: (1) reason, (2) departure from an earlier base class, (3) relation to prior identity: reinforce/balance/pivot/splash, (4) new class shape, (5) short-term goal. It does **not** directly ask Dip / Dive / Swim. The `classSurveyMode` and `recommendationStyle: minimalInvestment` labels are authored, but dedicated downstream consumers were not found in repository search.
- `scripts/apps/progression-framework/steps/base-class-survey-step.js` activates for a first acquisition of a different base class, layers completed intentions on the original Level 1 signals, and stores per-class completed surveys, aggregate bias and intent data. It is optional/skippable.
- `scripts/mentor/mentor-survey/definition-builder.js` prestige question `commitmentDepth` already offers **Dip**, **Dive**, **Swim**, and **Bridge** with distinctive metadata such as `prestigeWeight`, `oldIdentityRetention`, prerequisite planning or completion focus.
- `scripts/apps/progression-framework/steps/prestige-survey-step.js` consumes prestige commitment metadata to form a blended preference model. It is aware of remaining levels, potential class completion by Level 20, and prior prestige transitions. It stores `prestigeSurvey.commitment` in merged bias.
- `scripts/engine/prestige/identity-engine.js` has an *observed* class investment classification based on class-level ratios, with early-game override. Its `computeClassBias()` has Dip/Dive/Swim branches, but its `#getClassBaselineBias()` currently returns empty biases, and `computeTotalBias()` does not directly add `computeClassBias()`; other chassis calculations do use similar pattern weights. Do not claim class-label classification itself is fully wired as a mechanical bias signal.
- `scripts/engine/suggestion/class-route-profile-engine.js` has a separate observed investment classification using number of levels and supporting evidence (`>=4` => swim, `>=2` => dive, otherwise dip). Its meaning is not identical to `IdentityEngine`'s ratio-based classification.
- `data/class-chassis-bias.json` explicitly notes that prestige chassis calculation **does not** apply Dip/Dive/Swim, whereas the prestige survey's declared commitment contributes to its own preference model. Do not collapse these mechanisms.

**Key mismatch to reconcile:** A *declared* Swim in the prestige questionnaire means an intended dominant career identity; the `IdentityEngine`'s *observed* Swim branch describes relatively even multi-class investment and can have lower weight (0.45) than its Dive branch (0.75). These are not presently a single unified semantic or calculation; any convergence must be designed and tested rather than assumed.

## 3. Proposed cross-survey architecture (NOT LOCKED)

1. When a new class or prestige class is selected, resolve the destination class and its OWN mentor/voice. Miraj remains Jedi-only. Use fixed, pre-authored mentor framing that does not need to remember the preceding answer; adaptive questions/answer banks operate beneath it.
2. Ask explicitly about investment depth **early enough** that the remaining interview can tailor the expected time horizon. This should be a first-class semantic field for both surveys; exact placement is not yet decided.
3. Ask why the new path matters, how it relates to the existing Level 1 career and long-term build intent, what potential new class mechanics the player wants to use, and whether the original plan is being reinforced, diversified, temporarily supplemented, or revised. Avoid forcing the player to negate their earlier class or aspiration.
4. Build suggestions from verified current class, feats, talents, skills, ability scores, completed survey intentions, class rules, prerequisites, and available levels. Present potential future capabilities honestly rather than pretending they are already owned.
5. Preserve the difference between (a) player-declared target investment, (b) actual invested levels, (c) current build trajectory and (d) eligibility. Revisit advisories when actual progress diverges from the plan. Never block legal classes or builds merely because of a preference classification.
6. Reuse a single canonical authority for metadata and scoring inputs. Any refactor must explicitly identify and retire competing or obsolete classification routes, rather than stack a new compatibility layer on the old ones.

## 4. Open decisions for discussion

- Does **Bridge** describe the purpose of the dip/dive/swim investment, or should it remain a fourth exclusive depth choice for prestige?
- Where should the depth question appear in each interview? Recommend near the beginning because later questions can adapt to its answer.
- Should the player select descriptive intent alone, or optionally indicate an approximate number of class levels / next milestone? Do not invent hard thresholds before agreement.
- How should an explicit late-level multiclass commitment interact with the existing age-decayed survey bias?
- How should ongoing class investment affect the relative influence of Level 1 ambition, later career pivots, and prestige commitments?
- How should the survey handle a character already owning three or more base classes, or multiple prestige classes?
- Which stage should ask whether the character's *long-term career field* is staying the same or intentionally changing?
- Exactly which current suggestion consumers need a committed depth signal, and which stored flags have no operational effect?

## 5. Ten improvements to scoring and prediction (v0.2 — RECOMMENDATIONS, NOT APPROVED IMPLEMENTATION)

**Purpose:** Improve the Mentor system's ability to predict what advice a player *wants*, recommend choices that *legally* support that intent, and explain *why* those choices matter. These improvements are scoped as a shared technical foundation for Level 1, multiclass, and prestige surveys; this document remains specifically focused on the multiclass/prestige consequences of that shared foundation. The proposals below are ordered approximately by dependency, **not** by their numerical importance. They do **not** authorize changing production rules, retraining models, new canonical tags, repository changes, or survey wording.

**Non-negotiable boundaries:** Existing canonical V2 fields, the 297-archetype / 97-parent / 200-specialization SSOT, the frozen 190-tag ontology, and the system's established acquisition/prerequisite authorities are sources to *reuse* and verify, not duplicate. Explicit player selections remain authoritative as player *goals*; legal mechanics remain authoritative as *facts*. No recommendation may confer an illegal option, turn a future capability into an already-owned feature, invent mechanical relationships, or make Dip/Dive/Swim a compulsory class-level commitment. A class/PRC mentor supplies its own fixed authored voice; the mechanical survey logic does not derive authority from that dialogue.

### 5.1 Canonical relationship index: make existing exact references useful at runtime

**Change:** Construct a read-only, indexed relationship view from canonical archetypes, classes, feat/talent/skill identities, typed mechanics, primary/supporting tags, and prerequisites. Represent relationships distinctly, e.g. `CAREER_HAS_SPECIALIZATION`, `MECHANIC_SUPPORTS_CAREER`, `OPTION_REQUIRES_OPTION`, `CLASS_GRANTS_ACCESS`, and `OPTION_SYNERGIZES_WITH_OPTION`. An edge should have an exact source ID, relationship type, provenance, and verification status; descriptive tag overlap is weaker evidence than an exact certified mechanical link.

**Why:** Most of the ingredient data exists, but there is a difference between an exact reference being present in JSON and that reference being resolvable and consumable by the live suggestion pipeline. Do not pretend the Phase 12A offline resolution of all identities proves every runtime lookup works; especially verify talent and talent-tree authority boundaries.

**Proof/acceptance:** Referential-integrity tests, no parent-to-child automatic tag inheritance, no new crosswalks or second registry authority, exhaustive coverage for the 297 canonical archetypes, and a clear `verified / unresolved` status for every edge. A graph *database* is unnecessary; indexes in memory are sufficient unless performance measurements prove otherwise.

**Expected effort:** Medium. **Priority:** Foundation / first.

### 5.2 Three-lane evidence model: stated intent, observed build, inferred preferences

**Change:** Normalize the information collected from all survey types into three distinct lanes:

- **Declared:** Selected parent career, optional child specialization, concrete long-term capability goal, chosen class/PRC purpose, stated Dip/Dive/Swim depth, and any explicitly revised goal.
- **Observed:** Actually acquired class levels, skills, feats, talents, abilities, equipment (when relevant), pending advancement choices, and legal access.
- **Inferred:** Fallible predictions from tags, synergies, attributes, patterns, and previous answers, with evidence provenance and uncertainty.

Each signal should include its source (`L1`, `multiclass`, `prestige`, `actor`, `pending session`), the choice/record that supplied it, and revision or level-event identity. An answer must not be treated as an already-owned mechanic, and multiple readers must not count the same selection twice.

**Why:** Current survey bias arrays and weighted maps blur explicit aspirations with mechanically inferred fit. A player can *want* an unconventional build despite a low mechanical affinity; prediction should explain the gap, not override the preference.

**Proof/acceptance:** Same input produces the same normalized signal record; one completed answer creates one evidence contribution; a draft contributes no committed preference; revising a declaration updates the intended target without rewriting actor history.

**Expected effort:** Medium–High. **Priority:** Foundation / second.

### 5.3 Evidence-aware scoring: exact mechanics outrank generic tags, and duplicates are capped

**Change:** Refactor the current single recommendation consumer to combine typed, source-verifiable evidence with deliberate weight tiers: canonical exact mechanic links first; primary tags second; supporting tags third; class-route/ability compatibility as context, not a substitute for player choice. Apply caps or normalization so five near-synonymous tags cannot defeat one explicit player choice. Reinforcement is appropriate for *independent* answers that express the same method; mere repeated display of an option is not additional evidence.

**Why:** Tags are numerous and useful, but correlated tags can inflate confidence. Older role/mechanical/attribute bias keys and newer canonical tags should not silently become competing scoring authorities. Calibrate actual weights only after an audit of existing scorers and fixture-based ranking tests; do not adopt new numerical values from illustrative examples.

**Proof/acceptance:** Deterministic ranking fixtures including uncommon careers, standalone parents, hybrid builds, ties, conflicting signals, repeated evidence, and changes to one input at a time. Score explanations expose contributions by verified evidence type, with no hidden duplicate lane.

**Expected effort:** High because of consumer cutover. **Priority:** Foundation / third.

### 5.4 Lightweight uncertainty-aware intent ranking (no trained ML required initially)

**Change:** Maintain a *distribution or normalized set of confidence scores* over plausible **unresolved preferences** (e.g. investigative vs. combat vs. protective methods), updated by actual answers. A Bayesian categorical model or simple probabilistic model is a candidate **after** the signal contract and evidence likelihoods are calibrated. Do not apply a model's posterior to erase the player's explicitly selected Q2 parent career or declared Q5 ambition. When sufficient calibration does not exist, display affinity rankings rather than fabricated probability percentages.

**Why:** An additive bias tells us which options have higher scores but not whether the model meaningfully distinguishes them. Uncertainty lets the survey ask useful questions where the player's intended *methods* are unclear, and avoid making overconfident recommendations from sparse early-game evidence.

**Proof/acceptance:** Cold-start tests, uncertainty monotonicity for genuinely diagnostic answers, calibration checks on independently authored intent profiles, and explicit handling for unknown/uncertain players. Compare against the existing simple weighted baseline; keep the simpler method if probability modeling doesn't improve decisions.

**Expected effort:** Medium for simple uncertainty, High for calibrated probabilistic inference. **Priority:** After canonical scoring baseline.

### 5.5 Information-gain scenario pairing: make Q3 and Q4 complementary

**Change:** Score candidate situations by how much they are expected to distinguish *still-uncertain methods* for the declared career, destination class, and investment goal. Pick Q3 and Q4 **together**, from one verified many-to-many scenario pool, optimizing both diagnostic value and contextual diversity. **Neither scenario's identity is selected as a reaction to the player's answer to the other** (preserve the agreed Level 1 sibling-question rule where applicable). The chosen answers can update the same intent profile independently after the player responds.

**Why:** Two near-identical situations waste a five-question interview. Better coverage comes from contrasting contexts and mechanics, not from contrived morality tests.

**Proof/acceptance:** Scenario selection is reproducible for an identical snapshot and seed/tie rule; each scenario's mechanical option references are canonically verified; pairing avoids duplicates; unusual class/career combinations retain viable scenarios; answer alternatives remain first-person, including a genuine exploration route when needed. Optional educational mechanics explanations do not themselves create preference votes.

**Expected effort:** Medium–High, with most effort in scenario quality/coverage. **Priority:** After the scenario pool and scoring model exist.

### 5.6 Dip/Dive/Swim as a forecast horizon, not a synonym for existing levels

**Change:** Treat declared `dip | dive | swim` as a first-class *planning-intent* dimension in both multiclass and prestige surveys. Keep a distinct *observed class-investment shape* calculated from real class levels, and a distinct *route purpose* (e.g. Bridge) if approved later. Suggested build horizons, class-feature emphasis, projected investment, and opportunity-cost warnings should vary by intent: immediate focused value (Dip), coherent complementary sequence (Dive), sustained specialization (Swim). Do not reuse observed Swim's current ratio-based meaning as if it were the prestige survey's stated Swim ambition.

**Why:** Today `IdentityEngine`, `ClassRouteProfileEngine`, and prestige `commitmentDepth` encode different concepts. Their thresholds and names cannot safely be combined by numeric averaging. A brand-new high-level Dip should also not be immediately weakened as if it were an ancient Level 1 preference because one generic survey-decay multiplier was applied.

**Proof/acceptance:** A player can declare Dip/Dive/Swim at any level; plans change accordingly without altering legality; tests distinguish stated intent from observed investment, first-class entry from repeat class levels, a Bridge-to-prestige trajectory from a permanent endpoint, and late-level surveys from old intentions. One canonical semantic contract is consumed by all interested scorers.

**Expected effort:** High. **Priority:** Central to multiclass/prestige cutover.

### 5.7 Prerequisite-aware lookahead with explicit level and opportunity budgets

**Change:** Given a chosen future capability or prestige aspiration, search a bounded graph of available advancement actions. Use established legality authority for *current* acquisitions and verified prerequisites to plan plausible *future* actions. Display `available now`, `requires X first`, `possible later`, and `not presently verifiable` distinctly. Account for available future levels, feat/talent choice entitlements, class feature progression, mutually competing investment opportunities, and the player's Dip/Dive/Swim horizon. Offer multiple legal, achievable paths rather than silently committing class levels.

**Why:** “Matches my tags” is weaker than “this choice helps achieve the capability I explicitly want in a realistic number of levels.” This is the highest-value advanced prediction feature, but rules-engine completeness and combinatorial planning make it a harder project.

**Proof/acceptance:** Independently checked builds and edge cases (prestige prerequisites, multiclass starting benefits, droid restrictions/exceptions, no remaining levels, impossible goal, pending choice changes). The engine never claims a future option is currently legal and never recommends impossible paths as guaranteed.

**Expected effort:** Very High. **Priority:** After canonical identity and legality integrations.

### 5.8 Rank for relevance **and** coverage: a diverse, player-controlled choice slate

**Change:** Rank Q2 career options and recommendation lists using evidence-aware relevance, but select the displayed shortlist to include plausible *different* methods, complementary routes, and a defensible unconventional option. An explicit **Something else / Explore all** path must preserve access to all **97 parent careers**; the shortlist never becomes a hard eligibility filter. For parent/child ranking, score each identity on its own certified evidence rather than assuming children inherit the parent's tags.

**Why:** Pure top-score selection can present five near-equivalent paths and make unusual ambitions effectively invisible. Diversity-aware ranking (such as a constrained re-ranking pass) increases discovery without introducing random or ungrounded options.

**Proof/acceptance:** All 97 parent identities remain findable; repeated output is stable for equal input; no canonical record is suppressed for merely being mechanically unusual; relevance and diversity can be measured separately; user-selected career is retained when Q1 changes, with fresh suggestions and explicit reconfirmation where required.

**Expected effort:** Medium. **Priority:** Level 1 implementation, also useful for multiclass/PRC recommendations.

### 5.9 Time-aware intent evolution and contradiction detection without automatic goal erasure

**Change:** Keep a compact record of when and where the player *declared* goals, when observed choices reinforced them, and when subsequent surveys explicitly revised them. Decay weaker *inferred* early-game signals as new evidence accumulates, but treat an explicitly stated long-term ambition as revisable—not automatically expired. If a character's actions materially diverge from declared Dip/Dive/Swim or their stated career goal, surface a neutral mentoring question: `Does this still reflect your plan?` Distinguish true contradiction from deliberate hybridization or temporary prerequisite acquisition.

**Why:** Characters evolve. An old survey should not permanently dominate a new decision, but fresh observed mechanics also should not secretly rewrite the player's expressed career dream. The current shared survey-decay calculation does not model those distinct update rules.

**Proof/acceptance:** Tests for late-career pivot, retained long-term goal, multi-prestige history, planned bridge, return to earlier class, back/forward edits, repeated selections, and evidence provenance. A mentor prompts for clarification instead of silently converting intention to observation or vice versa.

**Expected effort:** Medium–High. **Priority:** Shared intent engine and ongoing mentor support.

### 5.10 Shadow evaluation, calibrated explanations, and optional feedback before ML training

**Change:** Run proposed scorers against existing recommendations in a read-only shadow/evaluation harness. Build independently specified character-intent fixtures covering the full archetype registry, uncommon builds, and class/PRC transition types. Log (or locally collect when permitted) which options were *eligible*, *displayed*, and *selected*; exposure matters because selections are biased by what the UI shows. Only collect cross-player feedback with affirmative opt-in and a privacy/data-retention design. Compute ranking quality, coverage, correctness, diversity, calibration, latency, survey completion, and player-correction frequency. Surface short evidence-based explanations for recommended options, not unexplained numerical “compatibility” claims.

**Why:** Without an evaluation baseline, adding more complicated scoring can make the product less accurate or slower. Machine learning (e.g. learning-to-rank or contextual bandits) requires enough trustworthy, representative data to outperform transparent deterministic scoring; it is not the starting dependency.

**Proof/acceptance:** Golden fixtures plus counterexample tests; 100% current-option legality checks or explicit unresolved status, verified explanation provenance, measured UI latency, reproducible shadow-versus-baseline reports, and documented thresholds for promotion. Any trained model is advisory only; it never authors rules, eligibility, or canonical identity.

**Expected effort:** Medium for test harness, High–Very High for genuine trained learning. **Priority:** Evaluation begins early; ML deferred.

### 5.11 Recommended sequence and minimal viable improvement

| Order | Work package | Ship gate |
|---|---|---|
| 1 | **#1 Relationship index + #2 evidence contract** | Exact/canonical references and distinct declared/observed/inferred signals validated; no parallel authority. |
| 2 | **#3 evidence-aware scoring + #10 shadow tests** | Legacy and new scoring compared on independently specified fixtures, legal-option boundaries preserved. |
| 3 | **#8 diverse Q2 ranking + #5 scenario pairing** | All careers discoverable, nonredundant questions, measured scenario coverage and stable output. |
| 4 | **#6 Dip/Dive/Swim + #9 longitudinal intent** | Multiclass/prestige intent influences plans without erasing previous dreams or conflating actual class investment. |
| 5 | **#4 uncertainty inference** | Empirically improves diagnostic question selection or confidence calibration over deterministic baseline. |
| 6 | **#7 future lookahead** | Demonstrably legal and feasible milestone plans, bounded in runtime and decision horizon. |
| Later | **Optional learned ranking** | Meaningful opt-in data and proven advantage over deterministic scoring, with no mechanical authority. |

**Minimal viable intelligent version:** Reuse canonical mechanical links, collect explicit goals separately, apply capped/deterministic scores, expose diverse legal options, and explain recommendations. This does **not** require a new ontology, a graph database, an external AI service, or model training.

**Unresolved approval gates:** The precise score formula, calibration fixtures, confidence presentation, concrete Dip/Dive/Swim planning horizons, choice of Bridge dimension, survey-signal persistence contract, permitted telemetry, and the order of Level 1 versus multiclass/PRC production cutovers require explicit decisions. None is silently settled by this proposal.

## 6. Multiclass question structure — revised after player-feedback discussions (v0.4)

**Current direction accepted in discussion:** Keep five questions. Teach the new class while learning what the player intends; the destination class mentor provides fixed, class-specific dialogue while the question engine supplies contextual, canonical mechanics. Every player answer is first-person *as the character*. The old v0.3 Dip-first outline and example are superseded by this section.

### 6.1 Five-question order

| Q | Function | Player-facing question purpose | Independent metadata outputs |
|---|---|---|---|
| **Q1 — Class discovery** | Teach distinctive, verifiable destination-class capabilities before asking for commitment. | “What interests you most about [new foundation class]?” Answers are first-person character statements with concise mechanical education; distinguish accessible-now vs future potential. | Desired capability, verified skills/feats/talents/class features, exact IDs, roles, supporting semantic tags, response provenance. |
| **Q2 — Build integration** | Compare the new discipline with the **entire existing build**, previously declared career and L1 Q5 ambition, without implying departure from a single prior class. | “How would I use what this class offers alongside what I already know?” Answers describe reinforcement, complementary training, coverage of a weakness, or meaningful change. | Synergy/gap intent, prior career relation, new-route purpose, supporting canonical references, first-person narrative. |
| **Q3 — Investment depth** | Ask **Dip/Dive/Swim/Undecided** only after the player understands the class; avoid hard level locks. | “How deeply do I intend to pursue this new class?” The character speaks in first person. | Declared class investment depth, intended horizon/confidence; **never** observed level distribution. Bridge is a separate route purpose, not a fourth depth. |
| **Q4 — Applied scenario** | Test how the player wants to use the new capability in actual play; one nonredundant scenario for multiclass. | Mentor presents a class/build-relevant challenge; every response is a first-person mechanical approach with educational notes. | Preferred methods, practical role, distinct semantic and mechanical references, evidence reinforcement with deduplication. |
| **Q5 — Next milestone** | Connect desired training, investment depth and long-term ambition to a concrete future objective. | “What do I want my next steps to accomplish?” Answers describe plausible milestones and remain honest about requirements. | Chosen milestone, expected timeframe, exact target references, continuity or deliberate revision of stated aims; verification status. |

### 6.2 Requirements and hard boundaries

- **Two simultaneous objectives:** educate the player about the destination class and collect meaningful intended-build evidence. Do not optimize for scorer convenience at the expense of player understanding.
- **Every answer teaches and scores:** first-person response, player-facing mechanical explanation, and structured engine-only metadata; preserve exact canonical IDs where supported. Survey choices signal interests, not automatically possessed features or guaranteed eligibility.
- **Multiple classes:** consider all existing classes, actual selected feats/talents/skills, equipment where meaningful, explicit chosen career and L1 ambitions. Do not imply the most recently acquired prior class is being abandoned.
- **Separate dimensions:** Dip/Dive/Swim measures *depth*; Reinforce/Complement/Pivot/Bridge or similar measures *purpose*. A bridge may be a Dive. Undecided means weak information, not an implicit Dip.
- **No forced career replacement:** a Swim in a class does not automatically replace the explicit chosen canonical career or higher aspiration; a genuine career switch requires player confirmation.
- **Existing mentor voice:** fixed class-specific scripted dialogue stages remain independent of prior responses. The shared question/answer engine may dynamically select mechanically certified choices without manufacturing new mentor speech.
- **No hidden noncanonical grant:** all choices must distinguish already-owned capabilities, eligibility at the present level, future potential, and unresolved source verification using existing rules/eligibility authority.
- **Survey record integrity:** completed surveys contribute independent dated/leveled evidence; drafts contribute none to persistent recommendations. Subsequent modifications recompute from events, avoiding stale aggregate counts.

### 6.3 Worked multiclass example (illustrative, not certified rules text)

A Jedi pursuing a scholarly/archaeological long-term career enters Scout:

1. **Discovery:** “I want to notice hidden dangers before anyone gets hurt.” The detail rail explains relevant, actually verified Scout options without claiming the character has them.
2. **Integration:** “I want my new Scout training to make my expeditions safer, not replace the path I chose.”
3. **Commitment:** “I want a focused bit of Scout training to sharpen my existing strengths.” (**Dip**.)
4. **Applied method:** “I would investigate the hazards and find a safe passage before leading the group inside.”
5. **Milestone:** “I want the earliest legal exploration and awareness benefits that help me reach my larger goal.”

**Expected:** the player's chosen career remains explicit; the fresh Scout survey records independently decaying interests in verified awareness/exploration references, role and methods; the Mentor ranks legal, feasible near-term additions without scheduling mandatory Scout levels.

### 6.4 Items open before implementation

- Exact wording and specific answer banks for each destination class, with full printed/canonical mechanical verification.
- Specific number of answer options for Q1/Q2/Q5; whether an “other/explore” option captures a mechanically sound and useful preference.
- Concrete levels/horizons for Dip/Dive/Swim and evidence for whether a fourth *Undecided* option improves interpretation.
- How explicit career switches are confirmed, and whether Q2 or Q5 is the best choice for the prompt.
- Survey integration tests across all ordered first-foundation-class transitions and unusual later-level cases.

### 6.5 Acceptance conditions

- All 20 ordered transitions between distinct foundation classes can ask the five questions using only destination-appropriate choices, without parallel hardcoded archetype authority.
- A player learns about the new class from question/answer text while every selected answer yields attributable metadata and mechanically verifiable references.
- All player answer labels use first-person character voice; mentor dialogue remains distinct and class-authored.
- Independent survey identity/time-to-level records support separate decay; full old survey history is preserved.
- Multiple owned classes, a late-game Dip, a career Pivot, a Prestige Bridge aspiration, retakes and back-navigation all yield legal and explainable recommendations.

## 7. Survey mathematics and evidence authority — consolidated decisions (v0.4)

### 7.1 Agreed architecture versus provisional numbers

**Agreed design decisions:**

1. **Separate events:** L1, each foundation-class multiclass survey, and each prestige-class entry survey is its **own** immutable completed survey event (modifiable by an explicit retake/replacement), with a completion **character level** and original first-person answers; never aggregate raw answers into one shared decay age.
2. **Three decay families:** L1 preferences decay **slowest**, each multiclass survey **faster**, and each prestige survey **faster than multiclass**. Every survey starts its own clock when completed, even if another survey already exists.
3. **Raw per-tag evidence:** each independently selected answer contributes to verified **canonical** semantic tags and/or typed references. Preserve answer provenance and supporting mechanical IDs; do not assume `diplomat` is an exact ontology tag merely because it is a useful example career label.
4. **Repeated-answer reinforcement:** repeated independent selections supporting the same tag should raise its evidence with diminishing returns. Count each question at most once per given tag and never multiply by both the repeat count and a repeat-derived reinforcement factor.
5. **Survey-level weight applies to each tag contribution**, rather than aging an undifferentiated lump of combined L1/multiclass/PRC bias.
6. **Observed actions dominate later intent:** actual chosen feats, talents, trained skills, relevant class investment and other deliberate mechanical choices are stronger evidence than survey guesses after L1. Automatically granted features are capability evidence but weaker evidence of deliberate player preference.
7. **Declared goals are not decaying guesses:** explicit parent career and confirmed long-term ambition persist until explicitly revised. They are distinct from decaying tactical/developmental preferences; inferred identity never silently rewrites them.
8. **Context matters:** a survey relevant to the class/choice under consideration can be weighted for relevance. Context cannot bypass legality or restore historical survey strength to 100% by fiat.
9. **Only completed survey answers count:** drafts can be checkpointed, but do not influence persisted scoring. No false acquisition, no illegal ability, no implicit new archetype authority.
10. **Normalize recommendation affinities to 0–1, and optionally display as 0–100%**, while keeping **raw evidence values distinct**. A normalized affinity score is **not** a statistically calibrated probability of a player's intentions.

**Provisional, not yet approved/calibrated:** starting strengths, half-lives, repetition increments/caps, saturation constant, survey-channel caps, cross-channel allocation, contextual relevance coefficients, and any absolute Dip/Dive/Swim level cutoffs. These require golden build fixtures, comparison with current recommendation rankings, and calibration.

### 7.2 Independent decay formula

For a survey event `s` completed at level `L_s`, at current level `L >= L_s`:

\[
D_s(L)=2^{-(L-L_s)/H_{\mathrm{type}(s)}}
\]

\[
W_s(L)=A_{\mathrm{type}(s)}\cdot D_s(L)
\]

`A` is survey-type initial authority, `H` is half-life measured in **character levels**. Never age by real-world dates. Never set an old event's age equal to the character's total level. The actual selected feats/talents/skills do not decay simply because a survey ages.

| Survey | Example `A` | Example `H` (levels) | Design status |
|---|---:|---:|---|
| L1 | 1.00 | 8 | Candidate values only |
| Multiclass (each event) | 0.95 | 4 | Candidate values only |
| Prestige (each event) | 0.90 | 3 | Candidate values only |

Illustration: L1 Jedi at level 1; Scout at level 2; Scoundrel at level 5; Jedi Knight at level 12 (if eligible). At **level 5**, respective survey strengths are approximately `0.707`, `0.565`, and `0.950`; at **level 12**, before including newly completed Jedi Knight, they are `0.386`, `0.168`, and `0.282`, while Jedi Knight begins at `0.900`. This creates a fresh Scoundrel preference at L5 without erasing L1 and a fresh prestige preference at L12.

### 7.3 Per-answer evidence, reinforcement, and per-event tag contribution

For verified semantic tag `t` in survey `s`, let `E_s(t)` be the normalized **base quality** of the evidence supported by the chosen answers (question strength/canonical alignment, not simply count), and let `n_s(t)` count the number of independent questions selecting answers that support `t` (maximum one count per question). Proposed bounded reinforcement:

\[
R(n)=1+0.15\min(n-1,3), \qquad n\ge1
\]

Then:

\[
C_s(t,L)=E_s(t)\cdot R(n_s(t))\cdot A_{\mathrm{type}(s)}\cdot D_s(L)
\]

For example: if an L1 conceptually supports diplomatic behavior in 3 of 5 selected answers, set illustrative `E=1`, `R(3)=1.30`, and level-5 L1 decay `D=0.707`; its effective survey event evidence is `1 × 1.30 × 1.00 × 0.707 ≈ 0.919`. Do **not** count the three selections again after applying `R(3)`. In production, map the behavior to exact canonical ontology tags and typed references rather than inventing a tag named `diplomat`.

Cross-survey tag raw evidence:

\[
E_{\mathrm{survey}}(t,L)=\sum_{s\in\mathrm{completedSurveys}} C_s(t,L)
\]

This **preserves event identity**: a same-tag preference in a newer Scoundrel survey can reinforce a decayed L1 preference without resetting the L1 decay clock. A bounded survey-channel policy is still needed so that many multiclass surveys do not overwhelm observed feats/talents by volume.

### 7.4 Bounded affinity for recommendation ranking

Proposed smooth saturation of accumulated nonnegative evidence:

\[
F(E)=1-e^{-E/k},\quad k>0
\]

This maps raw evidence `E >= 0` to normalized affinity `[0,1)`, approaching but not reaching `1` for finite `E`. `k=1` was used only as a conceptual example (e.g., `E=0.919 => F≈0.601`; `E=1.869 => F≈0.846`). Display-only percentages are `100F(E)`; they are **not** confidence intervals or probabilities of a player's choice. Keep explicit goals and observed mechanical evidence on separate channels; avoid normalizing them all into one unexplained number.

### 7.5 Current production gaps confirmed by read-only GitHub review

- `scripts/engine/prestige/identity-engine.js` currently **adds L1 and aggregated multiclass bias** and applies one base-level decay `max(0.175, 1 - totalBaseClassLevel/20)`. This immediately ages a brand-new multiclass declaration and cannot implement event-specific rates.
- `scripts/apps/progression-framework/shell/progression-finalizer.js` aggregates completed class-survey bias and intent weights into `classSurveyBias` / `classSurveyIntentBiases`, thereby losing per-event separation at the active aggregation layer even where per-class answers are preserved.
- `scripts/mentor/mentor-survey/engine.js` increments some typed intent-weight maps by `1` per answer; it does not implement the proposed canonical semantic-tag evidence normalization or per-event time decay.
- `scripts/engine/suggestion/tag-signal-engine.js` currently merges several tag-bias sources largely by **maximum weight per tag** and computes a tag alignment score as `min(1, sum(matchingTagWeights)/5)`. This is **clamped linear normalization**, not the proposed smooth asymptotic transformation; a revised design must deliberately replace or integrate the authority rather than silently layer another scorer.
- `scripts/engine/suggestion/SuggestionScorer.js` describes raw identity bias as additive and potentially >1, with final normalized recommendation scores in `0–1`; `scripts/engine/suggestion/SuggestionV2Contract.js` also uses `0–1` for recommendation reason weight/confidence. Some separate equipment scoring uses `0–100`. Do not conflate scales.

**Migration policy:** this is a new V2 scoring contract/cutover proposal, not approval for a shim, duplicate scorer, hidden raw-to-percent crosswalk, or arbitrary production schema edit. Conduct an integration/consumer audit and run acceptance tests before implementation.

## 8. Prestige survey — superseded early redesign (retained for decision history)

### 8.1 Why the old survey must change

The **existing** prestige survey is **four questions**, keyed `prestigeMeaning`, `commitmentDepth`, `specialization`, `profileReading`. Its implementation blends/prunes old intent through `oldMultiplier = max(0.1,(1-pruneWeight)*pruningResistance*preservationMultiplier)` and adds prestige/talent weights through a `newMultiplier`; therefore it is **neither a pure multiplier nor a pure new-evidence event**. The prior multiplier-centered idea belongs to a previous, much smaller ontology and is **not** a constraint to preserve. Do not reproduce old heavy profile pruning in the new architecture.

The current `analyzeProfileReading()` infers combat/noncombat identity partly from **name substrings in class/items and trained skills**, which can incorrectly represent a mature character. The survey's old profile confirmation/rejection question mechanically prunes presumed previous identity; in a model that preserves completed answers and decays them independently, this is both error-prone and unnecessary. A player may correct the Mentor's interpretation through an explicit user-controlled confirmation flow without automatically mutating or discarding historical survey evidence.

**Preserve what's valuable:** class-specific Mentor voice; currently authored prestige specialization and tree-focused hints subject to verification; first-prestige/return/PRC-to-PRC and higher ascension/bridge context; remaining-level and class completion feasibility. The `prestige-survey-profiles.js` class/tree descriptions are a *presentation aid*, not the canonical talent-tree/ability authority.

### 8.2 Earlier five-question structure (superseded by Section 9)

| Q | Purpose | Example first-person character intent | Metadata |
|---|---|---|---|
| **Q1 — Discover advanced mastery** | Teach what makes this *prestige* class distinct and ask which major advanced capability family appeals. | “I want to develop the techniques that let me protect others against extraordinary threats.” | Prestige class feature / advanced technique family, exact certified IDs where available, relevant class tree routes, semantic preferences, provenance. |
| **Q2 — Choose specialization** | Teach meaningful **specific** prestige talent trees, feature choices and linked development routes, distinguishing now versus later. | “I want my advanced training to sharpen my chosen form and its supporting talents.” | Preferred exact tree/talent/feature IDs, planned prerequisites, specialization affinity and confidence; not automatically owned abilities. |
| **Q3 — Depth of commitment** | Ask Dip/Dive/Swim/Undecided after the player has seen class features and specializations. | “I intend to devote years of training to becoming exceptional in this discipline.” | Explicit `swim` (or other) intended investment and time horizon, separately from actual class levels; **Bridge is route-purpose, not a fourth depth**. |
| **Q4 — Demonstrate mastery** | Present a prestige-specific challenge with mechanically distinct first-person methods, showcasing advanced class identity. | “I would use my awareness and defensive training to protect the team while we secure the objective.” | Intended tactical/application method, situational role, relevant semantic and typed references; reinforce without duplicates. |
| **Q5 — Define the next ambition** | Learn whether prestige training culminates, strengthens, evolves, redirects, or bridges toward a future explicitly chosen career/goal. | “I want this mastery to bring me closer to the calling I chose years ago.” | Long-term goal linkage, bridge purpose, future milestone, deliberate career-change request (requires explicit confirmation). |

**Prestige versus multiclass:** the sequence has some shared interview structure by design, but prestige answers must teach *advanced class-specific abilities*, their deeper specialization, prerequisite and level-budget tradeoffs, and what new mastery means for an already developed build. The engine should select different options for first PRC entry, follow-on prestige, and verified ascension transitions without replacing character-first-person response labels with abstract metagame categories.

### 8.3 Scoring and behavioral policy

- Prestige answers are **new evidence events** with a dedicated faster-decaying prestige curve (candidate `A=0.90`, `H=3`, not a locked setting), not merely multipliers applied to earlier tags.
- The score contribution is attached to every canonically supported tag/typed mechanical interest chosen in the prestige survey, with its own answer provenance and cross-question bounded reinforcement.
- Older L1/multiclass/prestige preferences retain their own history and decay; **no automatic bulk pruning or destructive multiplier of earlier evidence**.
- Actual selected feats, talents, trained skills, class investments and explicit career ambitions take precedence over ordinary survey inference. A prestige survey may **propose** a career pivot but may not silently replace an explicit goal.
- Dip/Dive/Swim adjusts planning horizon and context, not legality. A player can Swim into a prestige class while maintaining the chosen canonical parent career; a Bridge can be an intentional route at any depth.
- The class's own mentor voices remain pre-authored/fixed by survey stage; adaptive choices and scenarios are generated from certified mechanics and current character context.
- Every answer is first-person character speech. The detail rail explains the relevant canonical mechanics and actual present/future eligibility where possible.
- Explicit reclassification of a career identity, if requested, occurs in a dedicated confirmed decision and never through raw score arithmetic alone.

### 8.4 Before calling prestige structure finalized

1. Verify each prestige class's currently exposed class features, exact eligible talent trees, specialization metadata, and prerequisite relationships against canonical V2 authority; investigate any mismatches in mirrored `prestige-survey-profiles.js`.
2. Decide whether Q1 and Q2 are educationally distinct enough for all prestige classes; avoid two redundant “choose a tree” questions when a class has a small specialization menu.
3. Validate the ability to construct useful scenarios and future milestones for unusual/droid/Force prestige classes, bridge plans, apex classes, and characters near level 20.
4. Confirm whether to include a non-scoring *profile confirmation* before or after Q1, as a Mentor reflection that does **not** automatically prune historical evidence.
5. Lock per-class answer banks, option-level provenance, independent-decay math calibration and integration tests before any production implementation.

**Historical status:** The initial five-question prestige sequence below was superseded by the accepted achievement-and-legacy six-question design and conditional Q6 recalibration in Section 9. The architectural premise remains: multiplier-only / bulk-pruning prestige concepts are obsolete given the larger canonical metadata system.

## 9. Accepted multiclass and prestige survey structure and Mentor Reflection (v0.5)

### 9.1 Scope, purpose, and prestige interpretation — PLAYER-APPROVED

These are **structural design decisions**, not completed question/answer banks or implementation approval.

- **Level 1:** The character establishes aspirations, long-lived declared career identity, and what they hope to become. L1 aspiration/goal declarations are not silently erased by survey decay.
- **Multiclass:** The Mentor teaches the capabilities of a newly acquired base class and asks how that training fits the character's developing career. Five substantive questions use the agreed **Discovery → Integration → Commitment → Demonstration → Planning** order; Q6 adds the shared Mentor Reflection and optional recalibration branch.
- **Prestige:** A prestige class is commonly **the earned capstone/realization of an already-developed character concept**, frequently entered after approximately 6–10 levels of preparation. The character has *arrived*: earning Jedi Knight, Officer, etc. is itself an accomplishment. No assumption that Jedi Knight must lead to Jedi Master, Officer to another prestige path, or that every campaign reaches level 20. Prestige class acquisition is a persistent observed fact/identity milestone; prestige survey preferences are separately decayed. Some players later acquire multiple prestige classes, which creates a new independently tracked achievement event, not automatic erasure of an earlier one.
- **Level 20 awareness:** Retain the existing ability to inspect levels remaining, prestige level caps, prerequisites, attainable milestones, and first-prestige/PRC-to-PRC/ascension transitions. Use these as feasibility/context, **not as an assumption that every character wants to finish a prestige-class progression or reach level 20**. Immediate recommendations should prioritize the next ~1–3 levels; longer-horizon planning is optional.
- **Existing design's obsolete behavior:** Do not use a prestige survey as a pure multiplier of old tags, do not bulk prune earlier survey evidence, and do not infer a new career solely from the presence of a prestige class. Prestige Q1–Q5 add fresh, provenance-tracked intent evidence using its own decay curve. Q6 acts as a distinct player calibration signal, not a sixth ordinary preference tag source.

**Final agreed prestige six-question framework:**

| Q | Name | Player/mentor purpose | Main information collected |
|---|---|---|---|
| 1 | **The Journey** | Mentor recognizes how the character's past choices earned the title and what experiences mattered. | Established motivations, continuity with original ambition, observed-versus-intended emphasis. |
| 2 | **The Achievement** | Teach distinctive advanced class features and *verified* talent-tree/specialization possibilities; ask what part of that achievement most matters. | Exact canonical feature/tree/option aspirations and supported semantic affinities. |
| 3 | **The Responsibility** | Present a prestige-specific scenario about using the character's new standing and capabilities. | Practical methods, role, tactics, noncombat application, independent signals from Q2. |
| 4 | **The Commitment** | Ask Dip/Dive/Swim/Undecided **about further advancement**, not whether the character has earned the prestige identity. | Intended investment horizon, separate from actual levels/ownership and remaining-level feasibility. |
| 5 | **The Future** | Having achieved the title, what follows: fulfillment, refinement, another ambition, service, or a deliberate future route? | Explicit current goal, long-term ambition, potential new target or bridge, continuity/change. |
| 6 | **The Mentor's Reflection** | Mentor summarizes the character as currently understood, then the player rates accuracy; conditional correction follows B/C/D/E. | Overall alignment feedback and selected positive/negative corrections; **not a normal decayable tag-question**. |

The second and third prestige questions must be **mechanically educational but non-redundant**: Q2 concerns which advanced capabilities matter, Q3 what the character would *do* with their achievement. Question/answer banks remain future work requiring canonical V2 verification and distinct mentor voices.

### 9.2 Strict player-facing first-person contract — PLAYER-APPROVED

**Every selectable answer, across all surveys and all conditional branches, must be spoken in first person by the player's character.** This includes radio answers, checkboxes, correction choices and any positive/negative follow-up. Mentor prompts are spoken in that specific class's established Mentor voice. Players should experience a personal conversation, not a software diagnostic.

The player **must never** see semantic tag IDs, internal archetype keys, decimal weights, response accuracy bands, confidence factors, raw score calculations, internal `mechanicalBias`/`roleBias` maps, prune/multiplier language, or behind-the-curtain implementation text. These belong only in GM/developer diagnostics. Educational detail rails may explain actual SWSE mechanics, legal prerequisites, currently owned capabilities versus future possibilities, and trade-offs in natural language. Never falsely assert an unowned ability has already been acquired.

**Examples of acceptable response labels:** “My military experience has taught me to lead others through preparation”; “My lightsaber training has served me well, but it no longer defines what I hope to become.” **Unacceptable:** “Reduce combat tag by 40%”; “Choose roleBias: support”; a naked checkbox labeled “leadership”. The UI can explain multi-selection counts without revealing their weights or inference machinery.

### 9.3 Q6 main question — PLAYER-APPROVED

At the end of the five substantive questions, the Mentor presents a short, **evidence-grounded character interpretation**, synthesizing the original ambition, completed surveys with independent decay, acquired class levels/feats/talents/trained skills, canonical archetype/tag relationships, explicit goals and the current survey. Preserve a snapshot of the exact reading so any disagreement refers to a known statement. Avoid unjustified certainty with sparse L2 data.

The same A–E response semantics are shared by multiclass and prestige; **their narration differs**. Multiclass asks essentially *“Do I understand the path you are building?”* Prestige asks *“Do I understand the person you've become?”* Player-facing labels are first-person and contain no percentage information.

| Answer | First-person player-visible example | Hidden agreement band | Hidden representative midpoint | Branch |
|---|---|---|---|---|
| **A** | “Yes. That is the path I have followed.” | 80–100% | 0.90 | No follow-up; acknowledge/confirm reading. |
| **B** | “Much of what you see is true, though some of it is not quite right.” | 60–80% | 0.70 | Minor targeted nudge follow-up. |
| **C** | “I am uncertain whether that truly describes who I am becoming.” | 40–60% | 0.50 | Soft realignment: identify 1–3 inaccurate interpretations. |
| **D** | “That may have been my path once, but I believe I have changed.” | 20–40% | 0.30 | Moderate, **two-part** realignment. |
| **E** | “No. That is not who I am, nor who I intend to become.” | 0–20% | 0.10 | Comprehensive, **two-part** realignment. |

The percentage bands are deliberately coarse **self-reported agreement**, not calibrated statistical probabilities, and midpoints are practical coding values, **not verified measurement**. Store category, band, midpoint, survey instance, current character level and reading snapshot ID. Do not use A's agreement as unlimited accumulating independent evidence; calibration should not repeatedly multiply itself every recompute.

### 9.4 Conditional Q6 follow-ups — PLAYER-APPROVED structure

The follow-up is **one dynamic branch within Q6**, not an extra numbered survey question. Branches should always use the Mentor's own voice and character-first-person selectable statements.

| Response | Follow-up mechanics | Intended effect |
|---|---|---|
| **A** | No follow-up. | Acknowledge alignment; avoid double-counting. |
| **B** | Review displayed readings and identify a small number of inaccuracies (nominally 1–2). | Minor targeted nudge to interpretations, not verified mechanics. |
| **C** | Select **1–3** inaccurate displayed readings. | Soft realignment; lower inferred confidence in only disputed areas. |
| **D** | **Part I:** choose **3–5** readings that are inaccurate/outdated or no longer describe intended identity. **Part II:** choose affirmative character statements describing **who the character actually is/wants to be**. | Moderate realignment: negative plus positive explicit player-intent corrections. |
| **E** | **Part I:** choose **5–7** incorrect readings. **Part II:** choose affirmative character statements describing **who the character actually is/wants to be**. | Comprehensive realignment of inferred *intended identity*, preserving mechanics and earlier survey history. |

**Critical clarification from the player:** D and E are **not** merely “select what is NOT me.” Both must offer distinct **what I am NOT** and **what I AM** selection steps. The player selects exactly what they believe describes their current/desired character. Affirmative choices need not match the number of rejected choices; never force invented preferences to fill a count. Source options from validated canonical archetypes, semantic tags, exact class/talent/feat/skill relationships, and plausible alternate careers—not a newly invented tag vocabulary. Internally resolve each first-person label to exact canonical references/provenance.

If character evidence cannot support the nominal selection counts (particularly L2 multiclass), present fewer meaningful choices and allow a valid smaller set. No padded or fabricated readings. The interface should not allow contradictory negative and positive choices for the same interpretation without asking the player to reconcile them. **Branch E must meaningfully reorient current *inference*, not delete character mechanics or historical facts.** D can indicate aspirations have changed; C can simply mean Mentor uncertainty/misinterpretation. Explicit foundational career-goal changes require explicit player confirmation, not a hidden side effect of a checkbox.

### 9.5 Calibration math: agreed constraints, provisional coefficients

Calibration targets **inferred player-intent interpretations** and selection ranking, not raw SWSE legality, item acquisition, canonically observed build, historical survey answers, or factual character capability. The main A–E midpoint summarizes general reading agreement; branch-specific selected interpretations provide more precise target corrections. Positive selections indicate desired future identity, including aspirations for mechanics *not yet acquired*; negative selections indicate that previously inferred intent should have less authority. Store both separately, with provenance, at the survey-event level.

An illustrative correction operation on an inferred identity channel is:

`inferredAdjusted(t) = inferredUncalibrated(t) * negativeFactor(branch,t) + positiveIntentEvidence(branch,t)`

This is a **proposal**, not fixed production math. Illustrative per-selected negative multipliers previously discussed: B ~0.90; C ~0.70; D ~0.40; E should trigger reinterpretation based on explicit corrections rather than wholesale factor-zero. Coefficients, positive evidence size, duration/supersession, floor policy, and effective cap need benchmarking. The agreed survey architecture still applies: each L1/multiclass/prestige survey event decays **independently at tag level**, with bounded reinforcement; normalized affinity approaches `1.0` without claiming literal probability. Acquired mechanics do **not** decay as survey preferences. Q6 correction should not inherit the prestige three-level preference half-life; retain it as a separately scoped player interpretation/correction until explicitly revised or superseded by a newer relevant calibration event. Repeated agreements from later surveys must not compound the same bias blindly.

### 9.6 Multiclass-specific guardrails

Multiclass now has **five educational/developmental questions plus Q6**. The same Q6 A–E and B/C/D/E follow-ups apply, with *developmental* language rather than earned-prestige language. At Level 2, acknowledge thin evidence, show fewer readings when warranted, and avoid interpreting a new Scout dip as a silent abandonment of an L1 Jedi ambition. A correction can suggest a changing career but must not mutate a declared long-term goal without the player's explicit choice. At later multiclass entries, store each survey and calibration as its own event for independent recency and audit history.

### 9.7 Finalization acceptance checks (design, not implementation)

- Exactly six top-level questions for multiclass and prestige, with conditional follow-up inside Q6 only; no forced separate ten-reading quiz for everyone.
- Five first-person A–E choices and correct hidden 20-point agreement bands; no mathematical leakage in player UI or Mentor dialogue.
- D/E each require BOTH negative and affirmative selection capabilities; B/C provide appropriately scoped corrections.
- Evidence-backed personalized readings including actual owned items and declared goals; avoid abstract naked tags.
- No old-data bulk pruning, shadow canonical tags, automatic career pivot, repeated correction multipliers or overwriting historical responses.
- Retake/new survey events and pre-correction reading snapshots remain distinguishable; multiplayer/GM access and export privacy specified before implementation.

## 10. Proposed GM/developer survey + suggestion diagnostic report (DESIGN ONLY)

### 10.1 Goal and existing verified components

The user asked for a **Developer Tools** report containing *all* survey result responses and enough recommendation metadata to enable maintainers to improve question wording, canonical tag assignment, score weighting, calibration, and suggestion output. This is a **proposed new diagnostic capability**, not an existing unified report and not authorized code work.

Read-only GitHub `main` review (2026-11-13) found reusable but partial infrastructure:

- `scripts/apps/progression-framework/rollout/rollout-settings.js` registers GM-facing `progression-enable-debug-tools` (default false).
- `scripts/apps/progression-framework/ux/progression-diagnostics-panel.js` has existing session diagnostics and a Copy JSON Report control.
- `scripts/engine/suggestion/SuggestionEngineCoordinator.js` coordinates multiple recommendation engines; `SuggestionV2Contract.js` defines structured candidate scores/reason signals.
- `scripts/engine/mentor/mentor-decision-logger.js` creates serializable reason/decision records but does not persist them by itself.
- `scripts/governance/sentinel/sentinel-debug-api.js` provides a GM-only JSON export pattern.
- `scripts/engine/suggestion/SelectionRecorder.js`, `PlayerHistoryTracker.js`, `PlayerAnalytics.js`, `SuggestionEngineHooks.js` contain an older suggestion-outcome stream described in Section 11.

**Recommended location:** Existing GM/Developer Tools or Progression Diagnostics section, under **“Mentor Intelligence Diagnostics”**; do not create another competing suggestion scorer or duplicate character SSOT. Required report export controls: Survey History, Evidence/Tag Scoring, Q6 Calibration, Suggestion Trace, Recommendation Adoption, and Complete Diagnostic JSON. GM/developer-only. The player must never see this panel or raw IDs/weights.

### 10.2 Complete report content and provenance

1. **Report metadata:** schema version, system build/commit if available, timestamp, scoring configuration/formula version, canonical ontology/archetype version, diagnostic capture mode, selection context, anonymized actor/session reference and character level.
2. **Every survey response event:** survey type, class, encounter/completion level, question IDs, exact player-facing first-person selected answer IDs/text, all associated typed/exact semantic metadata, source canonical IDs, declared investment depth, future-goal declarations, response time/completion status, and retake/supersession history. Never fabricate a missing prior event from current aggregate fields.
3. **Per-event tag/evidence breakdown:** question/source ID, independent tag counts, base evidence, distinct-question reinforcement, survey starting authority, half-life, age, effective weight at capture level, cross-survey accumulation, negative/positive calibration, asymptotically normalized affinity, and contribution to recommendation-scoring channels. Explicitly note which constants were provisional in the design and which are active in runtime.
4. **Q6 reflection audit:** exact synthesized reading snapshot and evidence used, A–E response, hidden agreement band/midpoint, branch triggered, selected negative and affirmative interpretation IDs, old/new intended-identity reading, change/supersession version, no unowned mechanics claimed as acquired.
5. **Build/legality evidence:** owned class levels and selected feats/talents/trained skills with exact IDs; typed mechanical support vs semantic suggestion; available and unavailable candidates and detailed prerequisite exclusion reasons; remaining feasible levels and future planning. Record capability versus intention as separate fields.
6. **Suggestions:** per decision opportunity, generated legal candidate slate, displayed ordering, rank, tier, horizon components, score and confidence, reason signals, matching canonical tags/relationships, alternatives and filters, which survey evidence contributed, scoring configuration, Mentor narration and the action eventually taken. Trace **pre-selection** scores: do not recompute later and pretend they were historical outputs.
7. **Quality flags:** unknown/missing canonical IDs, unverified tags, duplicate response evidence, overweighted tags, contradictory intent, stale survey/reading versions, impossible/illegal suggestions, missing capture, low confidence and possible over-concentration of recommendations.
8. **Aggregate measures:** Q6 band frequencies by survey and level, tag-level correction rates, contradictions, suggestion score calibration, recommendation adoption funnel and cohort breakdowns, per-class/error trends and how often the player proceeds independently of recommendations.

Keep raw player-facing text and engine-debug trace separately keyed, linked by stable IDs and versioned schemas. Tag/candidate IDs must be canonical, with structured source-of-evidence records. Use **snapshot-on-event** diagnostic capture and deterministic, read-only export: an export must not rerun a newer scoring version and misattribute results to a prior interaction. Retain exact record provenance without turning diagnostics into a second gameplay authority.

**Privacy and safety:** The export can reveal detailed build preferences, character names, world/user IDs and potentially sensitive free text. Make collection **GM/developer-enabled only**, disclose its purpose, offer player opt-in where relevant, export by default with pseudonymous actor/session IDs and without account/world names, chats, hidden GM information, or unrelated records. Provide an explicit privileged full-detail choice when needed. Prefer narrow retention and opt-in testing rather than blanket telemetry or automatic remote transmission. No export data is sent to developers or external services automatically.

### 10.3 Diagnostic architecture guidance

- **Capture at boundary:** completed survey, rendered/sent recommendation slate, focused option, draft choice, committed ActorEngine mutation, confirmed Q6 branch, legal candidate exclusion. Reuse actual event identities rather than matching display names. Record only **true display** after UI arbitration/visibility, not candidate generation or suppressed guidance.
- **Append-only analysis records:** bounded/retention-configurable per-world diagnostics separate from gameplay survey authority. Retakes create new survey event IDs and linked supersession markers; exported history is complete only for the configured retention window. Do not silently overwrite earlier event records keyed only by class ID.
- **Report versions and trace correlation:** snapshot the item candidate, exact canonical ID, engine/score version, session/level/step, and finalized transaction ID at the time they occur. Capture draft cancellations/undo so they do not count as acquisition.
- **Developer tests:** schema validation, exhaustive survey answers, cross-survey decay math, idempotent calibration, accurate shown/draft/commit matching, proper denominator calculations, null/unknown handling, privacy scrubbing, GM permission gate and replay determinism.

## 11. Recommendation adoption: use, measurement, and limitations (v0.5)

### 11.1 Player-approved analysis goal

**Track how often suggestions are actually used** and study recommendation acceptance alongside survey calibration. This is a developer diagnostic, *not a target the Mentor should maximize regardless of player agency*. The player may deliberately make a legal, valid choice different from the top recommendation; that is not automatically a system failure.

Recommended event funnel and precise meanings:

1. `GENERATED`: engine considered/scored a candidate; **not proof the player saw it**.
2. `DISPLAYED`: candidate was genuinely shown to the player in that context (post-suppression, post-render arbitration). This is the denominator for exposure/adoption rates.
3. `INSPECTED`: player opened the candidate or its explanatory details; not acceptance.
4. `DRAFT_SELECTED`: player chose the candidate tentatively; can be undone or invalidated.
5. `COMMITTED_ACQUIRED`: canonical ActorEngine/progression finalization successfully granted the matching feat/talent/class/skill/etc., or committed another supported selection. **Primary strict-use event.** Track if the acquired item was a recommendation displayed earlier in the same eligible decision opportunity.
6. `DECLINED` / `UNDONE` / `NOT_SELECTED` / `CANCELLED` / `UNKNOWN`: distinguish explicit rejection, reversible actions, viable alternative, cancelled progression and missing telemetry. Never force the unexplored into the 'ignored' category.

**Primary metric:** `committed adopted displayed opportunities / distinct eligible displayed recommendation opportunities` within a defined advancement session/selection slot. Supplement with `sessions using at least one recommendation / sessions with eligible displayed suggestions`, and `committed picks matching any displayed recommendation / total committed eligible picks` to avoid conflating per-card and per-session denominators. Report exact counts, eligibility coverage, time window and sample sizes. Treat a manually selected candidate as adoption if it truly was displayed as a recommendation in the same relevant decision scope. Count repeat display exposures without falsely inflating denominator; dedupe by `(session,step,selectionSlot,canonicalCandidate)` and preserve raw exposures separately. Track follow-on acquisitions in later sessions as a **separate delayed-adoption** measure rather than immediate acceptance.

**Study cohorts:** L1 versus multiclass versus prestige, specific target class, level ranges, top ranked versus other recommended candidates, suggestion type (class/feat/talent/skill/attribute/Force option), canonical tag/route families, scoring band, confidence, survey age/decay, Q6 agreement band and correction branch, candidate legality and whether the player followed a divergent but coherent build.

**Example diagnostic questions:**

- High Mentor agreement + low adoption: did we rank legal but unhelpful options, recommend too far ahead, duplicate owned mechanics, or neglect a declared near-term goal?
- Low agreement + high adoption: does the Mentor misunderstand narrative intent while recommending mechanically valuable options?
- High-ranked options routinely ignored versus lower-ranked options adopted: are scoring coefficients or explanations misleading?
- Entire categories never displayed, or missing/invalid identifiers: is the problem availability/coverage rather than player preference?
- Adoption after D/E realignment: did targeted corrections improve later suggestion fit, without erasing earlier character history?

**Interpretation safeguards:** Correlation is not causation. A selected recommendation may already have been the player's plan. Availability, prerequisites, number of displayed options, rank position, encounter context, display salience, and session completion all affect the rates. Preserve non-adoption/alternative choice evidence. Don't train the Mentor to make only safe/obvious suggestions just to maximize adoption. A useful future companion measure is *player-reported helpfulness*, but that is a separate optional study and **not part of the agreed six-question surveys**.

### 11.2 Current code versus a reliable adoption ledger

Read-only GitHub `main` review confirmed:

- `scripts/engine/suggestion/SelectionRecorder.js` records shown, accepted, explicitly ignored and passively ignored outcomes, with actor flag persistence, **but keeps only the most recent 15 entries**.
- `scripts/engine/suggestion/PlayerHistoryTracker.js` is a facade and `PlayerAnalytics.js` computes acceptance and ignored-theme rates using that short history.
- `scripts/engine/suggestion/SuggestionEngineHooks.js` attempts to mark feat/talent selection as acceptance by finding a history entry with matching `itemId`; this is not sufficient to prove a unique recommendation instance was displayed and later *committed* by a successful progression transaction. A dialog-close callback treats outstanding suggestions as passively ignored, which should not become an unconditional negative preference signal.
- Existing diagnostics (`ProgressionDiagnosticsPanel`) can copy JSON but do **not** presently provide a unified verified exposure→committed-acquisition ledger across all suggestion domains.

**Recommended fix:** a new **event-correlation/analysis contract** built on real displayed-slate and finalized-transaction events (not a parallel progression authority). Capture displayed recommendation IDs with `decisionContextId`, `canonicalItemId`, `rank`, `scoreSnapshotId`; attach committed acquisitions to the same scope only when the existing canonical ActorEngine confirms the mutation. Keep explicit accept/decline/draft events for funnel analysis, and preserve the old 15-entry recorder only as historical/background infrastructure until audited for retirement/reuse. Do not declare legacy acceptance rates to be verified committed adoption. Any implementation requires an owner-approved consumer audit and tests; this document itself changes no production behavior.


### 11.3 Passive inline recommendations are mandatory evidence (v0.6 decision)

**Owner clarification (2026-11-13):** Adoption diagnostics MUST include passive, automatically displayed build suggestions, not only options presented after an explicit "Ask Mentor" request. Do **not** prompt players to explain why they did not choose recommendations; experienced users may intentionally ignore suggestion cards or have planned a build already. No additional player-facing survey question is needed. This is observational, GM/developer-facing analysis only.

**Verified runtime entry points from read-only GitHub `main`:**

- `scripts/apps/progression-framework/steps/feat-step.js` sets `TOP_SUGGESTIONS = 4`, calls `SuggestionService.getSuggestions(..., { domain: 'feats', ... })`, retains the top four positive-tier ranked feats, creates a `suggested` category, and expands it by default on step entry. The player's verbal example was "about five"; current source-code limit is **four**. This is a top-N slot, not a permanently fixed denominator if later UI rules change.
- `scripts/apps/progression-framework/steps/talent-step.js` uses a **two-stage** UI. It begins with lightweight suggested **talent trees** (`_getFastSuggestedTrees`) to avoid expensive all-tree scoring; full per-talent `SuggestionService` evaluation is lazy and tied to the selected tree. Track *tree presentation/opening* separately from *individual talent presentation/acquisition*. The fact that a tree was suggested does not prove a particular talent was displayed.
- Existing selection/mentor-reaction handling is useful for UI seams, but older `SelectionRecorder`/`SuggestionEngineHooks` outcomes are not authoritative proof of successful final acquisition, and their `passiveIgnored` state is **not** a negative intent signal.

**Recommended domain-neutral exposure types (do not hardcode only Feat/Talent):**

- `INLINE_PASSIVE`: auto-populated suggested sections/cards/orbs/trees on normal progression steps (feats, talents, class, skills, Force powers, attributes, etc. where that UI actually exists).
- `ON_DEMAND_MENTOR`: user explicitly opens or requests Mentor recommendations.
- `FOCUSED_EXPLANATION`: a suggested candidate was focused/inspected; this is extra evidence of interaction, not a prerequisite for counting passive presentation.
- `GENERATED_NOT_PRESENTED`: scored by an engine but never genuinely rendered as a recommendation; excluded from the displayed-adoption denominator.

**Precise event semantics and performance constraints:**

1. Generate a unique `decisionContextId` for the completed advancement opportunity and `selectionSlotId` where multiple picks are possible. Attach `recommendationSlateId`, `sourceSurface`, `sourceType`, `presentedAt`, `stepId`, candidate's canonical identity, actual rank/position, tier, score/confidence snapshot, availability/legality at presentation, and compact reason/tag evidence. Keep the scoring snapshot as it was **then**, not recalculated against today's actor.
2. Count a passive presentation only after the relevant UI slate is rendered and actually available to the player, not when `SuggestionService` returns an array. Do not equate appearance in a result cache with display. If true viewport visibility is not observed, call it `PRESENTED` or `RENDERED_AVAILABLE`, not `VIEWED`; a scrolling or unfocused player may never read it. Detailed viewport/intersection tracking is optional and must not degrade performance.
3. Deduplicate repeated renders, rehydration, sorting and same-slot reopening by `(decisionContextId, selectionSlotId, canonicalCandidateId, sourceSurface)` for opportunity-based metrics, while optionally retaining individual distinct exposure changes. A second fresh advancement slot is a distinct opportunity. Record recommendation refresh/re-ranking only when the presented slate changes materially; avoid writes on every reactive render.
4. Observe focus/inspection only if the existing UI event already exposes it; absence of focus is not proof of non-viewing. Log draft selections/undo separately. Confirm **committed acquisition** against the authoritative completed progression/ActorEngine output, not a click or an item-name match. Support repeatable feats, multiple simultaneous picks, talent-tree versus talent-item identity, and deferred picks by correct canonical ID/domain/slot mapping.
5. A non-adopted recommendation is `NOT_SELECTED` for that opportunity, not `REJECTED`, `WRONG`, or a negative tag. Do not silently decrement survey or canonical affinity weights based on passive non-use. Explicit Q6 correction answers remain the player's intentional feedback channel.
6. Export only captured facts; include `captureCoverage`, `unobserved`, `notInstrumented`, and `sessionCancelled` states instead of invented zero rates. Use the existing opt-in diagnostic mode and GM permission boundary, with restricted retention and redacted exports. No telemetry transport or collection outside Foundry without a separate decision.

**The two complementary headline metrics must not be conflated:**

- **Recommended-pick hit rate:** `committed picks contained in a genuinely presented eligible top-N slate / all completed picks with a genuinely presented eligible slate`. For one choice out of a presented top four, choosing any of the four = **100% hit rate for that pick**, independent of whether it was the first or fourth suggestion. Report *top-1*, *top-3*, and *top-N* hit rates where possible, with number of opportunities and source type.
- **Per-card adoption rate:** `distinct presented eligible recommendation candidates acquired in that decision opportunity / distinct presented eligible recommendation candidates in that opportunity`. In the same one-of-four example, one acquired recommended feat = **25% per-card adoption**; that is not contradictory, because each slot permits only one feat. Report candidate count, available selection slots, position, domain, and rank to avoid interpreting the smaller figure as failure.

Other useful breakdowns: passive vs explicit Mentor, Feat vs Talent, talent-tree suggestion -> tree-open rate -> legal individual talent -> committed talent, top-ranked versus lower-ranked, chosen non-suggested alternative, recommendation score/confidence, entry character level, pre/post-survey Q6 calibration state, and legal-selection coverage. Track time-to-selection and subsequent/future-level acquisitions separately from immediate results. Because a player may already have decided on an option before seeing it, **adoption is association, not proof of causal Mentor influence**.

**Diagnostic presentation recommendation:** Add a dedicated **Passive Suggestions** lane and a **Recommendation Usage** funnel to Mentor Intelligence Diagnostics, with a selectable feat/talent step trace. Display an exact historical top-N slate side by side with the finalized selection, reason evidence, and indication of `passive` vs `onDemand` presentation. Do not expose any of these internals or numbers in the player-facing Mentor survey UI.


### 11.4 Longitudinal player-choice and semantic-metadata prevalence (v0.7 decision)

**Owner direction (2026-11-13):** The developer report must record what players ACTUALLY CHOOSE across progression (even when no Mentor suggestion was shown or selected), plus the most commonly produced semantic tags, the archetype **parents** and **specializations** that recur, base and prestige class choices, and other observable build metadata. Primary purpose: **long-term, observational development of surveys, canonical metadata, and suggestion ranking**; no need for players to answer additional questions. Capturing a decision is not consent to automatic model updates; outputs remain GM/developer-only and should not change gameplay mechanically.

#### Report lanes and event provenance

1. **Committed choice ledger (observed):** At each successfully completed and read-back-verified chargen/level-up transaction, record a compact choice event for selected class and class-level increment, feat (including repeatable count and selection source), talent and *verified* talent-tree identity, trained skills, ability-score increases, Force power/secret/technique, background, species, equipment and relevant other steps **where the canonical authoritative step provides that information**. Record step/domain, canonical record ID, type, book/source if already authoritative, character level, slot/transaction identity, timestamp, user-initiated versus rule-granted/automatic, chosen from a suggestion or not, and the item's actual canonical tags at the time. Don't fabricate tags from display names or parse a loose description to claim canonical membership. Default to a sparse event when a domain lacks instrumented evidence, and label its capture status honestly.
2. **Survey-declared preferences:** Preserve each completed L1, multiclass and prestige answer's first-person visible response plus the canonical tags/intent references encoded in that answer, survey type/instance, completion level, Q6 rating and any NOT-me/IS-me corrections. These are *declared* goals, **not** purchased feats or achieved specialties. Track frequency of occurrences, distinct question coverage (avoid double-counting aliases on one answer), reinforcement, original weight and current decayed contribution separately.
3. **Engine-derived interpretations:** Preserve each inferred parent archetype, specialization, semantic tag, role/theme and score with its canonical source, confidence/affinity, engine version, derivation method and upstream provenance. A high-scoring inferred archetype is not a player-selected archetype. Map specializations to their actual canonical parent relationships from the existing `data/archetypes.json` / `ArchetypeRegistry`; do **not** create new category registries or assume every character has a directly selected parent/child. Label exact versus inferred assignments distinctly.
4. **Recommendation exposure and outcome:** Link the already specified active/passive top-N presentation slates and finalized acquisitions to these same canonical choices. Preserve `GENERATED_NOT_PRESENTED`, `PRESENTED`, `FOCUSED`, `DRAFT_SELECTED`, `COMMITTED`, `NOT_SELECTED` distinctions. Not selected is not rejected and never automatically yields a negative tag weight. A choice can be analyzed as **not recommended but committed** if its suggestion slate was observed and contained no match; if telemetry is incomplete, status is `UNKNOWN`, not an inferred non-recommendation.

#### Required longitudinal aggregation views

| Developer report | Counts and comparative questions | Attribution rule |
|---|---|---|
| **Canonical tag frequency** | Most frequent semantic tags in committed mechanical choices, survey declarations, and inferred profiles; distribution by level, class, domain, and survey type; repeated tag co-occurrences; positive/negative Q6 correction counts. | **Separate all three evidence sources**. Show raw event counts, distinct-character counts, unique-selection counts, mean/median decayed survey score, and current normalized affinity where appropriate. Don't combine without an explicitly labeled composite. |
| **Archetype parent trends** | Which existing parent career archetypes recur as top inferred matches, declared goals, or actual recorded user selections (only if the UI offers an explicit selection). | Count a parent once per character/snapshot for prevalence; parent membership is relational context, **not** an extra user action or automatic inherited mechanical evidence. |
| **Specialization trends** | Which canonical child specializations most often score highly, are explicitly targeted, or align with the final build; whether the preferred specialization changes with level. | Each child carries its verified parent ID; count exact targeted/selected versus inferred separately and retain scoring version. |
| **Class pathways** | Starting classes, multiclass entry frequency and timing, prestige first entry, common class sequences, observed Dip/Dive/Swim *class-level investment* versus separately declared survey intent, levels in each class. | Use authoritative completed class levels; do not mistake an inferred aspiration or prospective prestige target for a class acquired. |
| **Feat/talent/skill patterns** | Most frequently selected feat/talent IDs, talents by verified talent-tree ID, trained skill choices, repeat feat selection, prerequisites needed and popular combinations. | Count explicit discretionary selections separately from free/class/species grants and prerequisites that were automatically obtained. |
| **Survey signal quality** | Frequent answers/tags, rarely chosen answer options, repeated themes, Q6 A–E distribution, rejected/affirmed tags, predicted archetype before versus after correction. | Include survey question version and *available option set*, plus denominator of characters actually shown each question; corrected intent does not erase historical survey answers. |
| **Suggested-vs-chosen** | Top-N hit rate by rank/domain, passive vs on-demand exposure, committed selected/not-selected outcome, high-scoring recommendations unused, non-recommended choices preferred, popular builds not being suggested. | Compare against **actual presented and eligible slates**, not all candidates generated. Missing exposure is unknown. Adoption is association, not proof the recommendation caused the choice. |
| **Build/cohort distributions** | Distinct sampled characters, levels reached, common combinations of feats/talents/classes/tags and how they vary by base class and career goal. | Display cohort size and sample-size caveats; high-level cohorts are survivor-biased and may represent fewer games. No extrapolation from a small dev/test sample to all SWSE players. |

**Suggested top-level export structure (design schema, not an existing runtime contract):**

```json
{
  "reportSchemaVersion": "0.1-proposed",
  "engineVersion": null,
  "captureStatus": { "complete": false, "unobservedDomains": [] },
  "scope": { "kind": "one-character-or-consented-test-cohort", "anonymized": true },
  "choiceEvents": [],
  "surveyEvents": [],
  "recommendationSlateEvents": [],
  "recommendationOutcomeEvents": [],
  "inferenceSnapshots": [],
  "aggregates": {
    "tagsByEvidenceSource": {},
    "archetypeParents": {},
    "archetypeSpecializations": {},
    "classPathways": {},
    "committedChoicesByDomain": {},
    "surveyResponseDistribution": {},
    "q6CalibrationDistribution": {},
    "passiveVsOnDemandRecommendationAdoption": {}
  }
}
```

**Counting and coverage rules:** Give each `choiceEvent` a stable idempotency key based on authoritative finalization receipt/actor/transaction/domain/selection slot/canonical content identity, so re-renders, duplicate hooks, aborted drafts and step reopenings never inflate prevalence. Distinguish per-occurrence count (e.g. the same feat selected multiple times) from distinct-character prevalence (once per character); report both. For an inferred top-five archetype list, report rank-specific and top-five frequency separately. Never count a `NULL` score as zero, or a domain missing instrumentation as zero use. Per-level and per-step denominators should use only characters/opportunities with coverage.

**Source/version comparability:** Capture survey-definition revision, canonical tag ontology version/hash, archetype dataset version/hash, suggestion/scoring algorithm version, and system commit/version where available. Historical snapshots must not be silently recomputed under new code. The developer report may optionally provide a **labeled simulation / re-score** comparison on a copied snapshot, but that is distinct from the archived actual result.

**Development-use policies:** Treat this as local, GM/developer-enabled observational diagnostics; user-facing Mentor questions must NEVER display internal tags, ID keys, scores or telemetry. Export anonymized by default, no unrequested remote collection; allow explicit user/GM consent and review for sharing individual or cohort exports. Include no chat logs or identifying character/player/world data by default. Keep verbose events bounded and exportable, and aggregate locally for long-term study; do not bolt heavy database queries or per-render writes onto progression steps. No automatic alteration to the live suggestion weights from observed popularity or adoption: popular picks can be explained by game balance, archetype prevalence, GM style, player experience, or option position, not necessarily recommendation accuracy.

**Implementation posture:** Use a **single append-only, versioned diagnostic event layer** attached to existing canonical progression finalization and suggestion presentation seams. Do not build a parallel character-state authority, duplicate `ArchetypeRegistry`, or mutate the actor's canonical acquired items. The report is read-only on top of existing facts and should be tested for accuracy, low overhead, deduplication, and safe redaction before release. Complete historical capture begins only after instrumentation exists; older events cannot be reconstructed exactly from a later character state.

## 12. Talk to Mentor — KOTOR-style ongoing conversation audit and redesign proposal (v0.8)

**Status and authority:** Proposed design for owner review, **not yet an approved survey specification or implementation instruction**. Source inspection: GitHub `main`, read-only, 2026-11-13; no Foundry runtime execution, no code changes, no commit/push. The goal is a repeatable, optional, immersive **Talk to Mentor** conversation, distinct from the milestone L1, multiclass, and prestige surveys. The conversation should feel like a *Knights of the Old Republic*-style dialogue tree, not an exposed preference questionnaire. Reuse the approved player-facing contract from §9.2: **every selectable player response, including each conditional follow-up, is first-person character speech**; the Mentor speaks in their established personality; tags, numerical scores, weights, thresholds, IDs, provenance and diagnostic instrumentation remain hidden from players.

### 12.1 Position in the four-part Mentor ecosystem

| Experience | Identity/purpose | Typical availability | Authoritative evidence effect |
|---|---|---|---|
| Level 1 — **The Dream** | Discover the character the player hopes to become. | Initial character path. | Completed optional milestone survey, declared aspiration and decaying preferences. |
| Multiclass — **The Development** | Understand new class training in relation to the existing journey. | When a new base class is acquired. | New class-context survey with independent decay and Q6 calibration. |
| Prestige — **The Achievement** | Recognize arrival at the earned capstone of a concept, and decide what follows. | When a prestige class is acquired. | New prestige-context survey with independent decay and Q6 calibration. |
| Talk to Mentor — **The Ongoing Conversation** | Ask for advice, question interpretations, explore alternatives, or deliberately declare/change goals. | Any time a suitable Mentor is available; always voluntary. | **Read-only by default**. Only explicit statements of intent, commitment, or corrections generate durable metadata. |

**Key principle:** A player can ask about a build or path without desiring it. Curiosity, research, speculative questions, reading suggestions, viewing a Mentor story, or asking about the dark side are **not** implicit commitments or tag-weight evidence. Conversely, when the player explicitly says *"I intend to..."*, their choice may record new intentional-development evidence. The system must not confuse these two modes.

### 12.2 Existing implementation observed on `main` (read-only audit)

**Current components / entry points**

- `scripts/ui/shell/MentorSurfaceService.js`: provides the character sheet Mentor surface view model; mentor portraits/roster, accent colors, nine advisory/story topics and an additional embedded `l1_survey` topic. It also contains a hardcoded, five-question miniature survey independent of the newer Level 1 progression survey.
- `templates/shell/partials/surface-mentor.hbs` and `styles/system/mentor-surface.css`: KOTOR-like visual presentation (Mentor roster, portrait, nameplate, topic picker, typewriter-style text, choice list, path options and survey progress).
- `scripts/sheets/v2/actor-sheet-base.js`, `_wireMentorSurfaceEvents()`: active sheet wiring for mentor selection, topic selection and path commitment; the inspected function has **no handlers** for the `data-mentor-survey-answer`/`data-mentor-survey-retake` buttons and several `data-mentor-ui-action` navigation buttons rendered by the template. Treat these gaps as **source-level findings requiring live confirmation**, not a verified runtime failure.
- `scripts/mentor/mentor-chat-dialog.js`: legacy/parallel ApplicationV2 Mentor dialog; resolves unlocked mentors from class history and exposes nine topics, some with level gates. It calls `SuggestionEngineCoordinator.analyzeBuildIntent`, `BuildAnalysisEngine`, `MentorDialogueV2Integration`, `MentorVoiceFilterV2`, and `MentorStoryResolver`.
- `scripts/mentor/mentor-adapter.js`: maps engine outputs into Mentor context, but its archetype/path lookups still import `data/class-archetypes.json`, whose `_meta` describes it as a stub/backfill dataset. The class lookup is exact-string-based, including a potential combined-class-name mismatch. Replace this path with **verified current canonical archetype authority** after a consumer audit rather than creating a second mapping or assuming the old dataset is authoritative.
- `scripts/engine/mentor/mentor-memory.js`: stores per-Mentor trust, inferred role, soft path commitment, target class, and some philosophy axes; `setCommittedPath()` currently sets a commitment strength of `1.0`, and older decay routines exist. These old coefficients must **not** be treated as the approved cross-survey weighting/decay architecture.
- `scripts/mentor/mentor-dialogue-responses.js`: voice-response registry has definitions for `what_lies_ahead`, `how_would_you_play`, and `mentor_story`; the other surfaced topics can fall back to generic copy. `MentorVoiceFilterV2` provides opening/analysis/closing wrapping, but it needs a single verified canonical response pipeline.

**Topic coverage as exposed by the newer sheet surface**

| Current topic | Intended content | Proposed retention |
|---|---|---|
| "Who am I becoming?" | Identity reflection/current inferred archetype. | Keep; allow the player to request the **shared Q6-style** Mentor Reading and optional correction. |
| "What paths are open to me?" | Archetype/career alternatives and path commitment. | Keep; show canonical, prerequisite-aware options; commitment must be an explicit first-person choice. |
| "What am I doing well?" | Strengths/synergy. | Keep as read-only build analysis with specific evidence. |
| "What should I correct?" | Gaps/conflicts. | Keep as read-only analysis of real choices and legal alternatives. |
| "How should I fight?" | Current combat doctrine. | Keep; derive from actual owned mechanics, not generic combat-style assertions. |
| "What should I be careful about?" | Build vulnerabilities and tradeoffs. | Keep; distinguish verified rules from heuristic recommendations. |
| "What lies ahead?" | Prestige and long-range planning. | Keep; show real remaining-level and prerequisite feasibility; prestige need not be a stepping stone. |
| "How would you play this character?" | Mentor personality and style. | Keep as Mentor *opinion*, not player preference evidence. |
| "Tell me about yourself." | Mentor story/backstory. | Preserve as narrative/relationship content without involuntary build-bias changes. |
| "Help me find my path." | Separate hardcoded miniature L1 survey. | **Retire/converge** with the canonical L1 survey; never maintain two competing L1 preference authorities. |

**Specific deficiencies to verify/fix in implementation planning**

1. **Calculated character-specific analysis is dropped:** `MentorChatDialog._generateTopicResponse()` constructs `canonicalAnalysis` via individual topic functions, but the final `MentorVoiceFilterV2.applyVoice(mentorName, topic.key, analysisData)` call does not pass that calculated string. This can cause generic response fallback and discards otherwise useful engine evidence. `MentorDialogueV2Integration.wrapAnalysisWithVoice()` already defines an integration shape that can accept canonical analysis; assess it as the possible unified route.
2. **Two partially independent surfaces:** the older dialog has level-gated topic definitions; the newer Mentor surface has its own un-gated topic list. Topic/voice/rendered-option sources should be unified instead of adding compatibility shims.
3. **Embedded miniature survey differs from modern surveys:** five fixed questions with `force`, `aggression`, `leadership`, `conviction`, `independence`, and pseudo-archetype labels (`Force Adept`, `Striker`, `Commander`, `Guardian`, `Operative`). These are **not a substitute** for canonical archetype IDs, parents/specializations, and the frozen semantic ontology.
4. **Unverified persistence:** the embedded survey's completion UI says bias is saved and shows score chips, but source review located a read path (`system.swse.mentorSurfaceSurvey`) without a corresponding writer in the examined code and found no answer-button listeners in the sheet Mentor wiring. Confirm the real runtime behavior; do not claim functional persistence or downstream recommendation influence without an end-to-end test.
5. **Player-facing leakage:** rendered numeric scores, raw reason chips and internal-style pseudo-categories contravene the §9.2 first-person/hidden-metadata contract. Explanations can remain human-readable and character-relevant, without exposing the scoring internals.
6. **Fallback/voice coverage:** most topic names exist in presentation but not in `MentorDialogueResponses.TOPIC_RESPONSES`; content and behavior coverage need audited mentor/topic matrices, not only generic fallback text.
7. **State freshness:** an older dialog instance caches `buildIntent`, `mentorContext`, and `buildAnalysis`; confirm invalidation after advancement, equipment changes, survey completions and recalibrations before using a previous reading as current truth.

### 12.3 Proposed KOTOR-style conversation model

**Conversation progression (branching, not a mandated fixed number of questions):**

1. **Enter the Mentor roster:** show only Mentor identities genuinely unlocked by the character's canonical class history; all Mentors share one character-evidence authority but keep their own voice, advice emphasis, backstory and relationship tone.
2. **Choose a topic in the character's own words:** e.g. *"I want to understand what my training says about me."*, *"I want to know which paths are open to me."*, or *"Tell me about the lessons you've learned."* Avoid player-visible options framed as debug commands or metadata edits.
3. **Hear an evidence-grounded Mentor response:** assemble a canonical, serializable analytical record first (abilities/feats/talents/skills/declared goals/prerequisites and actionable options), then have the selected Mentor deliver it in their own narrative voice. Don't invent acquired abilities or present forecasted options as currently legal.
4. **Present meaningful first-person replies:** at least where suitable, offer a read-only follow-up, an alternative/hypothetical line, an explicit declaration/commitment, a request for Mentor reinterpretation, and a natural topic-exit or mentor-switch option. Only show options supported by the live context; avoid meaningless choices.
5. **Conditionally branch and, when applicable, record intent:** responses should alter subsequent dialogue appropriately. Preserve an explicit choice event and its scope; exploratory answers remain side-effect-free. End/reopen without forcing completion or repeat survey spam.

**Illustrative dialogue; not approved copy or certified mechanical advice:** A Noble/Soldier's Mentor says, *"You began with diplomacy, and your service has taught you what command costs. I believe you're preparing to lead others. Is that what you want?"* First-person replies might include:

- *"I want to become an Officer. My training has been preparing me for that responsibility."* → **explicit** future career declaration (canonical identity/path resolution and legal prerequisite checking, not automatic acquisition).
- *"Command has its uses, but diplomacy remains the purpose behind my training."* → explicit diplomatic development intent, while retaining observed military training.
- *"I haven't decided where this should lead. I want to keep my options open."* → uncertainty/open direction; no invented career commitment.
- *"I want to know what my experience has made possible."* → **read-only** exploration; no tag reinforcement or career reclassification.

**Tone rule:** Mentor and player must feel like participants in the *Star Wars* world; the **player's selectable words** must always be *in-character first person*. An internal field such as `careerGoalId`, `biasWeight` or `calibrationScore` may be stored but is never shown as a response label. Any plain-language recommendation explanation must not leak raw math, tag keys, confidence numbers or developer instrumentation into the conversation.

### 12.4 Read-only advice, active declarations, and Q6 reuse

| Conversation action | Scoring/persistence rule (proposed) |
|---|---|
| Ask about identity, strengths, gaps, combat, risks, or future possibilities | Calculate advice and log topic/suggestion exposure as developer telemetry when enabled; **no preference change** merely for asking. |
| Explore a hypothetical build, class, or dark-side direction | Evaluate feasibility without treating curiosity as intent. |
| Hear Mentor personal story or their doctrine | Narrative relationship content; **no automatic player tag evidence**. |
| Explicitly say "I intend to..." / choose a verified path | Record one scoped, source-labeled **declared-intent** event with canonical target and context; preserve explicit L1 career authority unless consciously replaced. |
| Explicitly state a career/aspiration change | Update/replace the *current declared ambition* through an authoritative event, preserving prior event history, owned mechanics and prior survey provenance. |
| Ask "What do you think I've become?" and evaluate the reading | Invoke **the same** Q6 Mentor Reflection/Calibration engine used by multiclass/prestige, not a competing implementation. |

The **shared Q6 contract** remains: Mentor presents a single evidence-backed reading; player selects A–E with hidden coarse agreement bands (A: 80–100; B: 60–80; C: 40–60; D: 20–40; E: 0–20). B/C show scoped corrective follow-ups; D/E show a **two-part** first-person conversation: *what no longer represents me* **and** *what actually represents me*. D/E record positive and negative selections as separate, canonical, provenance-backed intention corrections. A has no follow-up. Never multiply down actual abilities, suppress legal selections, overwrite acquired items, or erase historical aspirations. Full calibration behavior is defined in §9; Talk to Mentor must **reuse**, not fork, it.

**Repeated conversations:** Reading the same advice, selecting the same topic repeatedly, or stating the same preference to multiple Mentors must **not** accrue unlimited evidence. Use an authoritative current goal/intent record with event provenance, deduplication and explicit supersession where appropriate. Do not settle a Mentor-conversation half-life or reinforcement amount here: the mathematics are **open**, and any new conversation-evidence channel must be calibrated against existing survey decay, the hard priority of observed mechanics, and Q6 corrections (§7 and §9). Explicit long-term declared goals are persistent until revised; temporary developmental intentions can be independently aged, provided repeated visits cannot reset unrelated older evidence.

### 12.5 One authoritative data and dialogue pipeline

**Recommended read path:** Canonical actor state + finalized progression evidence + completed survey events + explicit declared goals + existing Q6 feedback + canonical archetype/tag ontology → shared BuildIntent/identity/recommendation analysis → stable, **inspectable explanation record** → Mentor voice adapter → KOTOR dialogue interface. Mentor-specific personality changes **presentation and opinion**, not the underlying identity facts. Exact mechanical legality is always resolved by existing canonical prerequisite authorities; a Mentor opinion never overrides it.

**Recommended write path:** first-person player choice → classify `read_only` versus `explicit_goal` versus `recalibration` versus `relationship_story` → one authorized persistence/event seam if (and only if) required → shared scoring state recomputed from the current sources. There should be **no shadow archetype registry**, implicit tag creation, stale class-name heuristics as authority, parallel L1 survey, compatibility-only fork, or hidden automatic career change.

**State model proposals:** active Mentor ID, dialogue topic, current node/branch, conversation snapshot/revision ID, eligible offered replies, chosen response ID, whether the response is hypothetical or declarative, and a safe return/exit state. Keep ephemeral navigation separate from durable identity events. Reading snapshots must be tied to the exact state under evaluation; invalidate/recompute when meaningful actor/survey evidence changes. A mentor's individual trust/story memory can remain separate from global character identity.

### 12.6 Developer diagnostics and long-term evaluation (ties to §§10–11)

Record the following **only in enabled GM/developer diagnostic capture**, with privacy/anonymization safeguards and no new question burden for players:

- Each Mentor conversation/session: pseudonymous actor, character level/class composition, Mentor identity, topic, node/branch, dialogue-definition version, analysis snapshot hash, completion/exit status and duration where available.
- Offered and selected **first-person response identities**, distinguishing explicit declared commitments, exploratory questions, hypothetical requests, Mentor biography, calibration feedback and topic navigation. Capture text-version identifiers (and opt-in text only if needed) so developers can associate an answer with its metadata without leaking private dialogue by default.
- Canonical tags, archetype parent/specialization references and declared-intent deltas **only when a player's explicit selection creates them**; log their evidence source, independent recency, and expected/actual effect on the identity channel, not as an implied consequence of asking for information.
- Read-only suggestions returned and **actually displayed** within conversations, their ranking/reason/provenance, and subsequent real committed acquisition. Count Mentor dialogue recommendations separately from passive inline Feat/Talent and other progression suggestions (§11), and do not interpret non-adoption as rejection.
- Shared Q6 branch choice, preserved Mentor reading, targeted NOT/IS corrections and resulting interpretation movement; report how Mentor feedback predicts later adoption without automatically training or silently retuning scores.
- Diagnostics coverage: which topics/mentors have genuine engine-grounded content; blank, fallback, stale, missing-context or broken-binding responses; how often players encounter them. Count rendering/interaction and storage failures distinctly from player disinterest.

No automatic remote telemetry or player prompts asking why they ignored advice. Player-facing conversations stay immersive. Older sessions cannot be reconstructed exactly without new instrumentation; historical findings should be marked incomplete rather than filled with simulated values.

### 12.7 Proposed implementation sequence — no authorization implied

| Stage | Target | Explicit acceptance criteria |
|---|---|---|
| **T1 — Runtime and event wiring** | Inventory Mentor entrypoints; verify template actions, topic navigation, survey answer/retake behavior, path selection; reconnect topic-specific analytical content to dialogue; consolidate old/new surfaces. | Tested navigation and response coverage; no dead buttons; every response has its intended analysis or clear, honest unavailable state. |
| **T2 — Canonical V2 convergence** | Remove competing embedded mini-L1 scoring and old `class-archetypes.json` authority from active inference; resolve through canonical archetypes, ontology, build intent, skills/talents/feats and prerequisite authorities. | No invented tags/archetype IDs, no duplicate survey state or score leaks; explicit goal remains distinct from observed capability. |
| **T3 — Branching conversations** | Author topic → voiced answer → conditional first-person choices → follow-up nodes for class/level/evidence context; preserve Mentor-specific characterization. | Player responses always first person; topic choices offer real conversational affordances, no exposed diagnostics or fake mechanical promises. |
| **T4 — Intent, persistence and Q6** | Implement read-only default and explicit-intent write boundary; share the Q6 calibration engine and preserve per-Mentor narrative memory without competing global identity state. | Exploring topics causes no bias; explicit choices persist once with provenance; D/E two-part alignment works; repeated talks do not inflate weights. |
| **T5 — Telemetry and tests** | Capture mentor-topic exposure, explicit declarations, recalibration, suggestion adoption, archetype/tag prevalence and failure coverage; add GM-only anonymized JSON export. | Stable event IDs, no duplicate counts from renders, coherent historical snapshots, low overhead, hidden player metadata, test coverage and no unsolicited transmission. |

**Decision needed before implementation:** Approve/revise the branching dialogue behavior and the exact policy for which conversations are allowed to make durable declarations. **Do not treat the example dialogue or staged technical proposals as approved player-facing copy.** No production code, runtime state, migration, repository branch or Git commit changed as part of this conceptual review.

---

## 13. Talk to Mentor career development: current identity, declared future, eligibility and achievement (v0.9 — OWNER-CONFIRMED CONTRACTS)

**Scope/authority.** This section records the owner's accepted conceptual decisions from the continuing Talk to Mentor design discussion. It extends §12 and supersedes §12's generic discussion of declarations wherever more precise below. These rules apply across Talk to Mentor, Level 1, multiclass, prestige, the shared Q6 reflection/recalibration system, recommendation scoring, and developer diagnostics. They do **not** authorize code edits, new weights, or a Git commit.

### 13.1 Foundational invariant: intent is not identity; identity is not eligibility; eligibility is not achievement

The system must distinguish **four independent meanings** rather than equating similarly named archetypes and canonical prestige classes.

| Lane | Exact question | Authority and examples | What it must **not** imply |
|---|---|---|---|
| **Current interpreted identity** | *What path does the character's demonstrated development currently suggest?* | Evidence-grounded parent archetype / specialization inferred from acquired class levels, feats, talents, skills, abilities and other valid character-state observations. Example: Jim's current build resembles a **Jedi Guardian** archetype. The reading is an **interpretation**, not ownership of a prestige class. | A stated future goal alone cannot establish present identity; current identity is not a canonical class grant. |
| **Declared future intent** | *What does the player explicitly want to pursue?* | The player's first-person, affirmative statement (survey or Mentor career conversation) with a canonical target when available. Example: Jim says, *"I want to work toward becoming a Jedi Master."* | Saying it does **not** mean Jim already is a Jedi Master, meets the prerequisites, or has gained its features. |
| **Mechanical eligibility** | *What can the character legally select at this specific moment?* | Verified canonical SWSE prerequisites and current character state, independently checked against the rules authority. Jim might not yet qualify for Jedi Master. | Neither the inferred identity nor a declared ambition may override a missing prerequisite; eligibility does not equal acquisition. |
| **Actual achievement / ownership** | *What has the character verifiably acquired?* | Finalized, persisted classes, levels, feats, talents and other acquisitions. Jim is a Jedi Master only after legally acquiring that class, not when declaring or becoming eligible for it. | Past aspirations or projected builds are not completed achievements. |

**Non-negotiable invariant:** `declared_goal != inferred_current_identity != legal_eligibility != finalized_acquisition`. Keep distinct typed/canonical references, sources, timestamps, and snapshot/progression revisions. Do not silently collapse a parent archetype, specialization, base class, and prestige class into one unlabeled identity field. A class's canonical name and an archetype's descriptive label may overlap in natural language, but not in typed internal identity.

### 13.2 Two independent trajectories: the road being traveled and the destination chosen

The Mentor may compare **observed development** (the character's current mechanically grounded pattern, qualified by explicit Q6 corrections) with **declared ambition** (the player's selected future career/archetype parent/specialization). Both are meaningful, but they answer different questions and must not overwrite each other.

**Example — Jim the Jedi (illustrative, no inferred RAW eligibility):**

- Jim acquires lightsaber-oriented feats/talents. The current identity interpreter reads this as a combat/Guardian-style path, with reasons supported by *actually owned* mechanics.
- Jim says in a career conversation, *"I want to work toward becoming a Jedi Master."* This writes a **positive future-intent** record for the specific Jedi Master path; it does **not** make his current build a Jedi Master or guarantee that prerequisites are met.
- Later, Jim asks, *"What path am I currently following?"* The Mentor reports the present **evidence-based identity** first, remembers Jedi Master as an **aspiration** second, and may compare how his currently acquired options support that ambition. It never pretends the intention is already achieved.
- When Jim later acquires Force-oriented abilities, the next observed-identity snapshot may legitimately change. Becoming mechanically eligible for Jedi Master is its own event; acquiring the first Jedi Master level is a separate achievement event.

**Recommended player-facing phrasing (illustrative, not locked dialogue):**

> **Mentor:** "From what I've seen of your training, you're following the path of a Jedi Guardian. Your lightsaber discipline and the defensive talents you've developed have shaped how you meet danger. You also told me that you hope to become a Jedi Master. That remains a destination you're working toward, not a title you've yet earned. Have I understood the path you're following?"

The X/Y/Z evidence clauses must be generated from *verified actual evidence* and omit unsupported claims. A Mentor should not invent past missions or claim the character used features they do not own. If the signal is weak or ambiguous, say so rather than assert a definitive archetype.

### 13.3 Career conversation sequence: discover -> explore -> explicitly affirm (or decline without penalty)

**Owner-confirmed sequence:**

1. **Discover** — first-person player request such as *"What paths are open to me?"* The Mentor offers contextually relevant canonical **prestige classes, archetype parents, and/or specializations**, distinguishing current legality from possible long-term destinations.
2. **Explore** — *"Tell me more about becoming an Officer."* The Mentor describes the path's identity, mechanical opportunities, requirements and tradeoffs in its own voice. **Viewing and asking do not create preference weights**.
3. **Respond** — *"I would like to work toward becoming an Officer."* creates **positive, target-scoped future-intent evidence**. *"I don't think that's a path I want to pursue"*, *"I'm not ready to decide"*, or *"I'd like to hear about another path"* create **no scoring penalty** and no implied tag rejection. The decline can be recorded as an observational dialogue outcome for GM-only analytics, but should not secretly suppress future options or decay unrelated interests.

**The specific negative-case rule is deliberate:** Jim's disinterest in a hypothetical *Force Relic Hunter* career does not mean he rejects investigation, Force knowledge, exploration, or every other tag associated with that career. A refusal to choose *a destination* is **not** a rejection of its ingredients. Do not fan out negative weights to related archetypes, skills, feats, talents, or tags; do not classify non-adoption as dislike.

**Positive declarations are also scoped.** Interest in Officer should favor the *intended path* using the canonical relationship/prerequisite graph, not automatically increase every tag tied to Officer. A single affirmative statement is not proof of acquiring that path, and repeated talk with the same or different Mentors must not stack unlimited reinforcements. Explicit future goals persist as goals until the player deliberately changes them; any proposed weight/cap remains unapproved and must be tested independently.

### 13.4 On-demand current-path reflection is shared Q6, not a second identity engine

**Owner-confirmed Talk to Mentor option:** *"What path am I currently following?"* (or equivalent natural first-person wording). It replaces/enhances the current *"Who am I becoming?"* topic, not by adding an unrelated new survey.

The response should contain:

1. **Current identity reading:** "Based on what I have observed, you appear to be following the path of [canonical parent / specialization] ..." — explanation based on roughly three *available*, grounded observations (X/Y/Z), without manufacturing evidence to meet an exact count.
2. **Separate future ambition:** "You have also told me you want to pursue [declared target]." Only state a future intention when it was truly declared. If absent, acknowledge that the Mentor does not know the character's chosen destination; do not infer a declaration from exploration or recommendations.
3. **Relationship, if useful:** explain whether current owned development appears to prepare for, complement, or diverge from the stated ambition. Avoid equating optimization efficiency with identity, or framing divergence as an error.
4. **Same Q6 A–E response set:** ask the player whether the **current identity reading** is accurate, using the approved first-person A–E branches in §9. No separate Talk to Mentor correction rules or divergent numerical scoring.

**Q6 scope:** A means the player affirms the *reading*. B/C correct bounded inferred interpretations. D/E must use their established mandatory **two-part** *"what no longer describes me" AND "what does describe me"* follow-up. Q6 corrects mutable Mentor interpretation; it must **not** delete owned talents/feats/class history, silently remove a previously declared ambition, or change mechanical eligibility. The fact the Mentor *mentioned* a goal in the same answer does **not** convert the Q6 vote into a vote about that goal. If a response implies that the explicit goal itself has changed, offer a **separate affirmative first-person goal-revision conversation**; do not silently rewrite it.

**No feedback loop:** A previously declared Jedi Master ambition must never itself inflate the evidence that Jim is *currently* a Jedi Master, nor may recommendation output be fed back as observed achievement. The identity reading uses qualified actual build evidence (and properly scoped identity corrections); the future-goal lane influences guidance toward possible future steps but not historical facts. Repeating the reflection without new evidence cannot amplify the same conclusion.

### 13.5 Clear examples of permitted and prohibited conclusions

| What happens | Permitted update | Prohibited inference |
|---|---|---|
| Jim asks about Jedi Master | Record that the destination was explored (opt-in developer diagnostics). | Record Jedi Master as his desired path. |
| Jim explicitly says he wants to become Jedi Master | Store/refresh **declared future goal** for Jedi Master, with provenance. | Report him as already a Jedi Master or automatically raise confidence that the observed build is Jedi Master. |
| Jim says "I don't want to work toward Force Relic Hunter" | No scoring effect; optionally log that this path was not pursued in that conversation. | Penalize investigation, Force, exploration or related tags. |
| Jim gains a lightsaber talent | Update **observed mechanical development**; refresh identity reading from actual actor data. | Assume he has abandoned Jedi Master as his goal. |
| Jim qualifies for Jedi Master | Update **eligibility** based on authoritative printed prerequisites. | Mark the class as owned or make it a compulsory recommendation. |
| Jim acquires Jedi Master class level | Record **achievement** from the successful finalized acquisition. | Rewrite his previous history as if he had always been one. |
| Jim answers Q6 E about a Guardian reading | Correct the **inferred present identity** through scoped two-part realignment. | Erase his distinct Jedi Master ambition or remove acquired Guardian-style abilities. |

### 13.6 Developer-report implications (extends §§10–11)

Every relevant event should have an explicit **lane** and **source of authority**, so long-term analytics can separately compare what the player says they want, what they build, what the engine sees, what the rules permit, and what they actually attain. Proposed records/aggregations:

- `career_path_presented` / `career_path_explored`: canonical typed target (`prestige_class`, `archetype_parent`, `specialization`), Mentor ID, branch/node, relevant actor snapshot and whether mechanically eligible *now*. **Exposure, not preference.**
- `career_goal_declared` / `career_goal_revised`: a player-selected **affirmative first-person statement**, target canonical ID, provenance, date/character level and supersession link for a replaced ambition; no duplicate reinforcement for repeating the same active goal.
- `current_identity_reading`: inferred parent/specialization identifiers, explanation-source facts and tags, identity model/ontology versions, uncertainty and snapshot/revision hash. Preserve which evidence was **observed**, **declared**, or **inferred**.
- `q6_calibration`: the **present-identity** snapshot that was judged; A–E response; B/C or D/E targeted corrections with mandatory dual D/E structure. Record the actual changed interpretation, not a fictitious change to build ownership or to future goals.
- `eligibility_evaluated` and `acquisition_finalized`: independent events tied to canonical prerequisites and the authoritative progression transaction. The record of acquiring a class must be drawn from finalized state, never inferred from a narrative response or an unfinished draft.
- Separate longitudinal reports for *most common declared destinations*, *most common observed current archetype parents/specializations*, *most frequent eligibility milestones*, *most common actual prestige/class acquisitions*, *current-goal versus observed-path divergence*, and *Q6 agreement by inferred archetype*. Report raw sample counts and missing coverage, not only percentages.

All capture remains the existing proposed **opt-in GM/developer diagnostics**, anonymized by default, never automatic external telemetry. Player-facing choices and Mentor dialogue remain narrative and **first-person for the player**; internal IDs, thresholds, weights and diagnostic schemas are never exposed.

### 13.7 Acceptance tests / implementation guardrails (proposal only)

- **Temporal separation:** Declaring a prestige ambition does not affect historical ownership or retroactively change an earlier current-identity snapshot.
- **Evidence authority:** A new class/feat/talent acquisition updates observed development only after authoritative completion; the presence of a suggestion or uncommitted selection never qualifies.
- **No-negative-exploration:** Browse, explore, defer and decline a career path -> **zero preference/tag penalty**. The specific path can still be discussed later.
- **Target-scoped positive evidence:** "I would work toward this" records one positive target declaration, not blanket downstream tag reinforcement. Repeated dialogue doesn't magnify identical intent.
- **Q6 integrity:** The reflection judges current inferred identity; D/E retain mandatory NOT/IS parts; existing explicit future goal remains unchanged unless separately and affirmatively revised.
- **Prerequisite integrity:** Goals and identity narratives do not unlock illegal choices. Passing prerequisites does not confer class levels; only finalized legal acquisitions do.
- **Analytics integrity:** Report exposures, commitments, identity snapshots, eligibility checks and final acquisitions in distinct types; never backfill missing historic events with guesswork.

**Implementation status:** Design agreement only. No numeric coefficients or runtime changes approved or performed in this update. Section 12's remaining unverified historical wiring findings still require independent runtime testing before a production cutover.

---

## Changelog

- **2026-11-13 — v0.9:** Added Section 13 with owner-confirmed four-way separation of **current identity, declared future intent, mechanical eligibility, and actual achievement**; independent observed-versus-intended trajectories; Talk to Mentor **Discover -> Explore -> Affirm** career flow (declines/exploration carry no negative tags); on-demand current-path reflection using the existing shared Q6; prohibitions on aspiration-as-achievement feedback loops; and distinct longitudinal diagnostic events. All v0.8 and earlier material preserved. Design documentation only; no implementation or Git changes.

- **2026-11-13 — v0.8:** Added Section 12 on **Talk to Mentor**: source-grounded audit of the existing KOTOR-style Mentor surface and older chat dialog; topic coverage and unverified UI/persistence gaps; proposal for repeatable first-person branching conversations; read-only curiosity versus explicit declared ambition; shared Q6 A–E calibration; canonical data/voice pipeline; event-based diagnostics and a five-stage implementation plan. Owner review needed; no implementation or Git changes.

- **2026-11-13 — v0.7:** Added longitudinal actual-player-choice analytics: event-level, authoritative committed selections beyond Mentor recommendations; separated chosen, survey-declared and inferred canonical-tag evidence; archetype parent/specialization frequency and class pathway trends; data versioning, cross-domain coverage, stable deduplication, cohort denominators and GM-only anonymized JSON aggregation. Passive/adoption v0.6 rules retained. Design only; no production code or Git changes.

- **2026-11-13 — v0.6:** Added owner-approved observational analytics for **passively presented** recommendations (especially inline Feat and Talent steps), verified current feat top-four and talent-tree-first/lazy-talent behavior, separate passive/on-demand sources, strict presented-versus-generated distinction, authoritative finalized acquisition matching, top-N recommendation hit rate versus per-card adoption, and a no-player-interrogation/no-negative-inference rule for non-selection. Design only; no production code or Git changes.

- **2026-11-13 — v0.5:** Locked six-question developmental and prestige architectures, prestige-as-earned-capstone interpretation, first-person-only player responses, shared Mentor Reflection with A–E coarse agreement, B/C targeted follow-ups, and mandatory two-part NOT-me/IS-me D/E realignment. Added proposal for GM-only complete survey/suggestion JSON diagnostics and a recommendation exposure-to-committed-acquisition adoption study; audited existing partial history recorder (15 recent), analytics and debug tools. Coefficients/retention/persistence and code implementation remain pending. No Git push or production changes.

- **2026-11-13 — v0.4:** Updated multiclass sequence to class education/integration before Dip-Dive-Swim, first-person answers with metadata from every question; consolidated independently decaying event weights, per-tag reinforcement, bounded 0–1 affinity, observed-mechanics priority, and explicit-goal persistence. Appended a proposed five-question prestige redesign superseding the historical multiplier-only/pruning premise. Numeric coefficients remain provisional; prestige questions not finalized; no production/Git changes.

- **2026-11-12 — v0.3:** Proposed reordering and rewriting the existing five multiclass questions around Dip/Dive/Swim, desired class mechanics, relation to existing career, practical application, and next milestone. Separates investment depth from route purpose; includes illustrative example and open decisions. No Git changes or implementation authorized.

- **2026-11-11 — v0.2:** Appended ten concrete proposals to improve canonical scoring, player-intent prediction, adaptive scenario selection, Dip/Dive/Swim forecasting, future progression planning, and evaluation. All are recommendations; no production code, GitHub commits, or ML training authorized.
- **2026-11-11 — v0.1:** User established Dip/Dive/Swim as central to both multiclass and prestige surveys. Audited existing definitions and several scoring consumers, flagged declared-vs-observed semantic mismatch, recorded proposed integration principles and open questions. No code or GitHub changes.