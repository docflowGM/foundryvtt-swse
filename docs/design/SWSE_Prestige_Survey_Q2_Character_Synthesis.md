<!-- v0.8 editorial closeout: preserve entire v0.7 beneath this new banner and append six final classes, full scope QA, and interface contract. -->
> **Latest checkpoint: v0.8, 32/32 prestige classes, 1,293 Q1 routes structurally inventoried.** This is an editorial/design closeout, not a verified Foundry implementation or a claim that 1,293 personalized Q2 answer sets exist.

<!-- v0.7 rolling design: the v0.6 source is preserved verbatim below this banner, then sections 45-52 append the six new class audits. -->
> **Latest checkpoint: v0.7, 26/32 prestige classes structurally inventoried, 1,108 Q1 routes mapped.** Historical checkpoint banners remain part of the preserved material.

<!-- v0.4 rolling design continuation: retains v0.1-v0.3 in full and adds sections 25-30. -->
> **Latest checkpoint: v0.6, 20/32 prestige classes structurally audited, 934 Q1 routes inventoried.** Historical earlier v0.2/v0.3 headers below are preserved verbatim for continuity.

# SWSE Prestige Survey Q2 - The Achievement
## P1/P2 Reuse Audit and P3 Three-Class Editorial Stress Test (v0.2)

Date: 2026-11-14 (source baseline); continued design pass 2026-11-14/15
Status: OWNER-ENDORSED DIRECTION / WORKING CONTENT; not owner-approved, not production-implemented, not mechanically certified as a runtime system.
Repository: docflowGM/foundryvtt-swse
Scope: Prestige Q2 only. This document does not alter Q1, Q3-Q6, the 125-key vocabulary, the 190-tag ontology, archetype data, Foundry actors, or GitHub.

## 1. Design decision under review

Q1 (The Journey): The existing, extensively researched prestige class-discovery conversation. It helps the player select a future prestige capability, specialization, or vocational direction. Preserve it intact.

Q2 (The Achievement): Read the player's selected Q1 interest together with the current character's verified, accumulated build and earlier explicit player declarations. Ask which ESTABLISHED strength the player wishes to carry forward into their earned prestige identity. This is character synthesis, not a second talent-tree introduction, a mechanical choice, a generic personality quiz, or a claim of previous deeds.

Q3 (The Responsibility): Evaluate the player's hypothetical approach to a situation involving the new prestige identity. Do not pull Q3's scenario decision into Q2.

Q4 (The Commitment): Dip/Dive/Swim/Undecided concerning future investment. Bridge is a distinct purpose.

Q5 (The Future): Explore fulfillment, continuing refinement, service, or voluntarily choosing a new goal. Do not make Q2 an alternate future-goal or next-class commitment screen.

Q6 (The Mentor's Reflection): Reflect on all real evidence and invite the established A-E and conditional NOT/AM corrections, without altering owned mechanics or silently revoking old goals.

Proposed shared Q2 prompt: "Of everything you've learned to reach this point, which strength do you most want to bring into your role as a [Prestige Class]?"

Canonical information and talent selection remain with V2 advancement authorities and independent explanatory UI. Q2 selections express intent, not acquired benefits, prerequisites, or legal class-feature grants. This is a proposed replacement for the older Q2 detailed-mechanical-teaching specification; it requires explicit owner signoff.

## 2. P1 - Sources inspected and reuse audit

### 2.1 Pinned sources

- Prestige rolling design v0.26, commit `0f56de3a4d33c8a5c635d47e3c612e501797a0a4`, `docs/design/SWSE_Prestige_Survey_Rolling_Design.md`, especially sections 11, 12, 39.
- Multiclass rolling design v0.11, commit `eb531a6b0fc5482edd62eedfea4dfebd312946ee`, `docs/design/SWSE_Multiclass_Survey_Rolling_Design.md`, especially lines 1028-1390 and the five 125-row Q2 dialogue sections at lines 1389-2047.
- Cross-survey v0.9, commit `1d56ae4279c53fa2f1a7ead2c312b4ef73ec7e79`, section 9. Its prior prestige Q2 description is superseded only if the owner approves this new change.
- Current GitHub source: `data/bias-keys-canonical.json`, `scripts/engine/suggestion/BuildIntent.js`, `scripts/engine/suggestion/tag-signal-engine.js`, `scripts/engine/suggestion/SuggestionEngineCoordinator.js`, `scripts/engine/prestige/identity-engine.js`, `data/dialogue/mentors/mayu/mayu_dialogue.json`.

### 2.2 Verified inventories

- 625/625 authored multiclass Q2 candidate entries located: 125 each for Noble, Jedi, Scoundrel, Scout, Soldier.
- All five destination-class banks contain the exact same 125 mechanical-bias keys; zero missing keys in that comparison.
- Each of the 625 entries contains the `{{q1_focus}}` slot. Exact complete response strings do not duplicate across destination classes.
- Crucially, for each of the 125 keys, the FIRST SENTENCE is identical in all five destination banks. This yields 125 reusable present-strength stems and 500 class-conditioned follow-through examples, rather than 625 unrelated independent concepts.
- `data/bias-keys-canonical.json` enumerates exactly 125 mechanical-bias keys. These are NOT the 190 semantic-ontology tags. No implicit 125->190 mapping is approved.
- Prestige Q1 coverage is 32/32 class identities at first-pass editorial level, not complete source certification. Ace Pilot has 30 talent-tree focused answers + two identity/capstone options + one neutral = 33 Q1 response IDs across six legitimate talent-tree families.
- Multiclass Q2's A-D present strengths, E alternative, F neutral architecture is owner-clarified. This prestige adaptation is not yet owner-approved.

### 2.3 Reuse disposition

REUSE:
- All 125 mechanical-bias keys as an authoritative lookup vocabulary (not a scoring formula).
- The 125 common first-sentence concepts as editorial starting material, gated by actual actor evidence.
- The architecture of Q1-selected focus + four distinct present-build signals + alternative + neutral.
- Source-provenance rules, truthful first-person speech, existing Suggestion Engine, original prior-goal isolation.

ADAPT:
- The second clause of each response to the earned prestige identity, using the class's role and the exact selected Q1 direction rather than foundation-class language.
- The first clause where it incorrectly claims hands-on experience or ownership not borne out by the actor snapshot.
- Fixed Q2 Mentor introductions to each verified prestige Mentor; preserve established characterization.
- Special fallback for capstone/fulfillment Q1 and neutral Q1: neither is an ordinary future-capability choice.

DO NOT COPY:
- Generic 'new lessons/new class' language when it implies an inexperienced beginner.
- Foundation-class-specific moral judgments, class stereotypes, or unverified anecdotes.
- Literal 'pursuing {{q1_focus}}' suffixes that create awkward or redundant text.
- Unsupported claims such as owned ship, crew, squadron, rank, combat record, past mentor relationship, or an already granted talent.

## 3. P2 - Draft data/selection contract

### 3.1 Required distinct data lanes

A. `q1_selected`: exact response ID, prestige class ID, authoring version, future development focus, selection status (pending vs committed), neutral/capstone special meaning, source-certification status.
B. `actor_owned_snapshot`: finalized class levels, owned feat and talent identity IDs/tree references, trained skills, relevant equipped equipment, attributes/defenses and other validated features. It MUST NOT mix new pending selections into 'owned'.
C. `suggestion_observed_signals`: ranked supported mechanical-bias keys and exact contributing actor evidence; normalize aliases and remove redundant alternatives without a second scorer.
D. `historical_player_declarations`: Level 1/previous multiclass Q1-Q5 committed preferences, explicitly declared goals and any affirmed revision; retain independent provenance and date.
E. `interpretations`: current inferred archetype/identity and score outputs, explicitly not equal to player's words or mechanically owned abilities.
F. `q2_selected`: one completed first-person option, with stable ID, source key (if A-D), Q1 ID, snapshot version, response-template version and provenance. A completed Q2 answer is a new player declaration, not a mechanics grant.

### 3.2 Question rendering (proposed)

1. Resolve the actual pending/finalized prestige class and its exact Mentor; fail closed for unknown routes. Do not assert class acquisition if pending.
2. Freeze finalized pre-advancement actor snapshot and read the selected Q1 response ID. Derive a reviewed short focus phrase; do not re-score from Q1.
3. Read the existing engine's mechanical-bias evidence. Identify up to four highest-ranked, materially distinct, PRESENT-BUILD-ATTRIBUTABLE keys. Never derive these from a candidate's potential benefit, from uncommitted choices, or from Q1 itself.
4. Match each key to a reusable present-strength stem. Require evidence for the particular claim; if necessary, use a weaker but truthful conditional stem or omit it.
5. Join each verified stem to class/Q1-specific authored follow-through. Prefer natural complete sentences over concatenated fragments. A-D = up to four distinct current strengths.
6. E = an explicit alternative emphasis or desired new synthesis, not a declaration that prior training was wasted, not an automatic career change.
7. F = first-person undecided, no scored intent, no negative inference, no implied Dip.
8. If only 0-3 strong, distinct, trustworthy build signals exist, show fewer A-D or truthful expressly prospective variants; NEVER pad with fabricated experience. Preserve the alternative and neutral.
9. Re-select deterministically from same actor snapshot and Q1 ID. On Q1 change, invalidate Q2 option context; reconfirm when factual premises change.
10. On completed survey only, persist the selected declaration as its own attributable event. Browsing, viewing, ranking and unselected answers create zero declaration evidence. Preserve original Level 1 goal unless explicitly revised elsewhere.

### 3.3 Critical engine interface BLOCKER discovered during source inspection

- `BuildIntent.analyze(actor,pendingData)` returns themes, primaryThemes and signals, BUT `_buildActorState` merges `pendingData.selectedFeats` and `selectedTalents` into its owned-name sets. It also runs `_applyMentorBiases`. Its output is not by itself a pristine observed-only, per-125-key ranking.
- `IdentityEngine.computeTotalBias` returns `mechanicalBias` but combines NINE layers, including `SurveyBias`, inferred archetype/specialist, prestige bias and reinforcement, in addition to observed behavior, class chassis and equipment. Therefore its top four keys are not automatically the four strongest ESTABLISHED mechanical capabilities.
- `tag-signal-engine.js` exports `buildTagBiasMap`, which merges identity, mentor, archetype, theme, equipment and route signals into candidate tags. This is not an approved ready-made, provenance-backed top-four output in the 125 mechanical-bias vocabulary.
- `SuggestionEngineCoordinator` exposes `analyzeBuildIntent` and candidate suggestion domains but not an explicitly verified top-four OBSERVED mechanical-bias projection API.

Before implementation, trace the actual deployed V2 Suggestion Engine and expose a READ-ONLY, provenance-backed projection of its existing per-layer scores without inventing or duplicating a new scoring formula. If the engine cannot distinguish a key's observed-build support from survey-inferred affinity, Q2 must NOT claim that key as an owned strength. This is a gating technical research item, not solved by the editorial prototype.

### 3.4 How to use previous survey answers safely

- Use a prior selected response to phrase what the player wants, or to indicate an earlier explicit ambition, never as proof of skill training, prior missions, feature ownership, or a current mechanical top-four ranking.
- Q1's selected answer controls the new prestige aspiration even if a previous survey or archetype has different priorities. Present optional continuity or alternative emphasis honestly.
- A high Suggestions score can offer a possible interpretation; only the player's chosen Q2 statement explicitly endorses it. Never count a previous Q1 choice a second time simply because it influenced displayed Q2 options.
- Historical explicit goals, current inferred identity, observed abilities and selected future aspirations remain four distinct authorities.

## 4. Ace Pilot P1 class-specific focus routing

Ace Pilot Q1 has six established talent-tree groups and two special identity responses. Q2 should support ALL 33 Q1 IDs without authoring a 33 x 125 cross-product.

| Q1 family | Relevant Q1 IDs | Q2 focus concept (editorial, not a fixed runtime tag) | Candidate existing strength keys to consider ONLY when scored and evidenced |
|---|---|---|---|
| Expert Pilot | AP-Q1-EP01 ... EP07 | Pursuit, evasion, speed, positioning, vehicle specialization, reputation | pilotMastery, evasion, reactionDefense, initiative, tacticalAwareness |
| Gunner | AP-Q1-GN01 ... GN06 | Accurate/decisive vehicle fire, coordination, or systems disruption | vehicularDamage, accuracy, tacticalAwareness, allySupport |
| Spacer | AP-Q1-SP01 ... SP04 | Shipboard operation, zero-g, boarding, technical or movement competence | evasion, skillUtility, tacticalAwareness, engineeringMastery |
| Squadron Leader | AP-Q1-SL01 ... SL04 | Squadron coordination, teaching, defense and tactical leadership | formation, commandAuthority, allySupport, tacticalAwareness |
| Blockade Runner | AP-Q1-BR01 ... BR04 | Safe high-speed passage, escape, maneuvering around large craft | pilotMastery, evasion, initiative, tacticalAwareness |
| Wingman | AP-Q1-WM01 ... WM05 | Escort, nearby ally defense, joint fire and mutual protection | allySupport, reactionDefense, formation, pilotMastery |
| Cross-vehicle identity | AP-Q1-ID01 | Broad vehicle competence | pilotMastery, mechanicalMastery, skillUtility |
| Capstone fulfillment | AP-Q1-ID02 | Define mastery within Ace Pilot; no forced next title | All verified present strengths; do not infer a further class goal |
| Undecided | AP-Q1-NEUTRAL | No specific Q1 capability declared | Present strengths can be explored without claiming a Q1 specialization |

This table is a *semantic fit checklist*, NOT a permission list that overrides the existing top-four scores. A high-ranked certified current strength can be relevant across many Q1 families, including non-obvious integrations. Do not suppress an observed strength merely because it is absent from the illustrative list.

## 5. Ace Pilot Q2 player-facing prototype

### 5.1 Mentor Mayu, fixed introduction (DRAFT)

"All right, you've made it far enough to be in the running. Don't start thinking a new title makes your old tricks disappear. Some of them got you this far. Which ones are you taking with you?"

Acquisition note: "in the running" is safe while the prestige level is pending. An alternate actually-acquired version may say "You've earned the title" ONLY after the class is finalized. Mayu should be fast, assured and teasing without inventing previous encounters or a personal mentor history.

Shared prompt: "Of everything you've learned so far, which strength do you want to make part of the Ace Pilot you're becoming?"

### 5.2 Worked six-response set: AP-Q1-WM03 protective wingman focus

Selected Q1 is the actual Q1 library line AP-Q1-WM03: "I want to use my own flying to turn aside a shot headed for a nearby ally."

This fixture ASSUMES actor-verified owned evidence for four different strength keys: `pilotMastery`, `evasion`, `allySupport`, and `accuracy`. They are hypothetical scored results, NOT actual Suggestion Engine output, class-granted abilities or assertions about all pilots. Exact evidence must be individually confirmed in production. To preserve diversity, `evasion` and `pilotMastery` must NOT be collapsed automatically if their evidence/meaning is distinct; if they are redundant in a real snapshot, replace/omit one.

A. `pilotMastery` - "I've worked to become reliable at the controls when conditions are at their worst. I want that control to help the pilot beside me survive, not just get myself through."
B. `evasion` - "I've learned to get clear of danger rather than take the hit. I want to bring that instinct into the way I guard another vehicle."
C. `allySupport` - "I've built my approach around making others more effective. As an ace, I want my flying to give the people beside me a better chance to come home."
D. `accuracy` - "I've spent time making careful shots count. I want that precision to help me choose when covering an ally matters more than chasing my own target."
E. `alternate` - "The skills that brought me here matter, but I want to discover a different strength that makes me useful to the pilots beside me."
F. `undecided` - "I've learned a great deal to reach this point, but I haven't decided which part should define me as an ace."

Do NOT attach direct Run Interference ownership or a confirmed wingmate to these responses. Q1 is preference only. Actor facts are separate. Since the four A-D strengths are all conditional, this six-response set is NOT safe for an arbitrary Ace Pilot candidate.

### 5.3 Reuse/expansion matrix - Ace Pilot candidate strengths

| Existing key | Multiclass library shared anchor (candidate) | Prestige Ace Pilot application to AUTHOR/REVISE | Required factual gate |
|---|---|---|---|
| pilotMastery | "I have developed confidence operating vehicles under difficult conditions." | Competence and control as an established part of piloting identity | Verified piloting-related feat/talent/skill and credible mechanical score; trained Pilot alone is access, not proof of difficult missions |
| vehicularDamage | "I have concentrated on making vehicle-mounted attacks effective." | Existing vehicle attack capability serving a chosen piloting/gunnery purpose | Verified vehicle-weapon ability; do not assume gunner station or owned weapon |
| evasion | "I have learned to survive by moving out of danger rather than absorbing it." | Existing defensive positioning carried into an advanced vehicle role | Verified evasive/defensive mechanical contribution; not proof of actual survival incidents |
| reactionDefense | "I have invested in reacting quickly when danger comes without warning." | Defensive reaction discipline, distinct from movement evasion | Specific owned defensive/reactive support; don't infer the Wingman Run Interference talent |
| accuracy | "I have spent time making deliberate actions land where I intend." | Precision, measured shots and controlled timing | Existing accuracy-supporting choices; do not assume vehicle gunnery |
| tacticalAwareness | "I have trained myself to read a tense situation quickly." | Piloting decisions informed by tactical perception | Verified supporting ability; not a factual mission-history claim |
| formation | "I understand how much reliable positioning matters to a group." | Group positioning carried toward squadron or wingman aspirations | Actual supported tactics; no assumed command/rank/squadron |
| allySupport | "I have focused on making other people more effective." | Emphasis on facilitating or protecting others | Verified support capability; not necessarily a named group or known companions |
| commandAuthority | "I have become comfortable making decisions others depend on." | Existing coordination experience supporting squadron leadership aspirations | Requires substantive actor support; high score alone does not establish formal command |
| engineeringMastery | "I have spent time understanding how structures and systems fit together." | Technical systems knowledge informing piloting or shipboard judgment | Real owned technical evidence; not proof of a personal ship or ship modifications |
| initiative | "I value acting before an opponent can seize control of events." | Prioritized quick judgment and position | Existing initiative-focused build choices; avoid claiming actual victories |
| skillUtility | Shared anchor exists in Q2 library | Versatility/generalist expertise applied to a pilot or spacer role | Skill breadth must actually be present, not assumed from class |

Note: The 125 existing first sentences are reusable *editorial stems*, not automatic assertions that the actor did the described thing. For keys with no safe evidence, author a less specific first-person aspiration or omit.

### 5.4 Exceptional Q1 treatment

- AP-Q1-ID02, fulfilled career: Q2 asks which current strength defines the accomplished Ace Pilot. Do not rephrase this as preparing for another prestige class; preserve the player's possible capstone ambition without silently modifying any separately declared goal.
- AP-Q1-ID01, broad-vehicle identity: Q2 relates demonstrated breadth to a desired versatile Ace Pilot. Never turn this into an assertion that all vehicle proficiencies or talents are owned.
- AP-Q1-NEUTRAL: avoid inserting the literal no-direction Q1 response as a supposedly chosen specialization; Q2 can present evidenced present strengths and ask how they might matter, with an always-available neutral.
- Squadron Leader focus and commandAuthority: do not claim a squadron, organization, military rank, pilots under the character's command, or selected squadron talents unless independently verified.
- Spacer focus and Hyperdriven: do not imply the talent scales with Ace Pilot levels; the printed Spacer talent scales with Scoundrel class level.
- Wingman Q1 family: distinguish the Wingman talent tree from the distinct same-name Expert Pilot talent, using source/tree ID not display name.

## 6. Editorial fixture checks (NO Foundry execution)

Fixture A - Defensive wingman focus / rich build:
- Input: AP-Q1-WM03; verified pilotMastery/evasion/allySupport/accuracy; pending prestige selection.
- Expectation: A-D distinct strength-to-focus connections, E alternate, F neutral; no ownership of Run Interference or a named ally.
- Outcome: Authored example in 5.2, pending actual mechanical evidence testing and mentor approval.

Fixture B - Squadron Leader aspiration / no command experience:
- Input: AP-Q1-SL01; actor has weapon skill and awareness but no verified command evidence.
- Expectation: Do not offer "I have commanded squadrons" or use `commandAuthority` as an established fact. Valid alternatives may connect marksmanship/awareness to potential coordination, while clearly remaining aspirations.
- Outcome: Rule specified; authored complete six-line fixture outstanding.

Fixture C - Ace Pilot career as capstone:
- Input: AP-Q1-ID02; strong Pilot/technical build and explicit old goal recorded separately.
- Expectation: Q2 reinforces chosen existing strengths without promoting Jedi Master/another prestige goal, deleting L1 objective, or re-asking Q5.
- Outcome: Special-case routing contract written; full dialogue fixture outstanding.

Fixture D - Sparse or conflicting scores:
- Input: AP-Q1-NEUTRAL or explicit interest outside current strongest evidence; fewer than four independent observed keys.
- Expectation: fewer A-D or honestly prospective alternatives, preserve E/F, no invented skill history, no forced focus, no silent scoring loop.
- Outcome: Fallback contract written; runtime test outstanding.

## 7. Required editorial, mechanical, and technical QA

- Every A-D Q2 answer must pass: 1) present owned-evidence anchor, 2) exact chosen Q1 future-interest relation (or neutral-safe treatment), 3) genuinely distinct statement of what to carry forward.
- Each answer starts in natural first-person voice, is short enough for the survey, and is not a second rephrasing of Q1.
- A score/alias cannot create a second independent evidence source for the same previous choice. Survey opinions and observed feats/talents must remain separately typed.
- If a key's strongest support is a survey response, do not present it as past acquired mechanical strength.
- Present-state evidence must be gathered before the pending prestige grant is finalized or otherwise explicitly provenance-filtered. Do not confuse uncommitted class/talent options with owned mechanics.
- Test all 33 Ace Pilot Q1 routes, including 6 tree families, two identity choices and neutral; cover all 125 existing mechanical-bias keys that could be emitted, including sparse and contradictory snapshots.
- Validate enough class/mentor context to avoid incorrect cast, alien biological assumptions, criminal/pirate stereotyping, and invented history.
- Q1 source certification remains incomplete for some full banks, so do not promote editorial talent references to legal options.
- Preserve existing survey A-E Mentor Reflection and future-depth question numbering.

## 8. Next work after review

1. Confirm owner acceptance of Q2's purpose change from detailed mechanical instruction to evidence-grounded character synthesis.
2. Author one complete version of Mayu's six-answer sample for each of six Q1 families plus ID01, ID02 and neutral, adapting current top-four examples and safe fallbacks; compare for redundancy.
3. Verify precise V2 read APIs, observed-only ranking/provenance, emitted 125-key coverage, pending/finalized source separation, and no survey echo; actual live actor tests are necessary.
4. Apply the same approach to Jedi Knight/Miraj and Independent Droid/Seraphim, whose capabilities and character identities stress-test different assumptions.
5. Only then scale authored prestige-specific follow-through across the other 29 prestige classes, keeping the 125 reusable strength anchors and adding specialist exceptions where semantically required.
6. Obtain editorial/rules owner approval before any runtime edits, data model changes, GitHub commits or pushes.

## 9. What this completed pass DOES and DOES NOT establish

Completed now: P1 source inventory of 625 Q2 entries; 125 common candidate strength stems; identified reuse approach; P2 source-aware selection contract; discovered current-runtime provenance blockers; Ace Pilot one complete conditional six-answer worked dialogue example; class-family route table; exceptional-case and QA contracts.

Not done: all 33 Ace Pilot Q1 x varied-build dialogue QA; actor-level Suggestion Engine integration; mechanically certified top-four signal API; 32 prestige class Q2 libraries; mentor-voice approval; production code; repo commit/push. No runtime or actor state was modified.

## 10. Additional Ace Pilot cross-family editorial stress fixtures

The following are HAND-AUTHORED, CONDITIONAL player speech samples to evaluate Q1/Q2 differentiation, not universal text and not tested Foundry output. Every A-D key must be corroborated by actual pre-prestige build evidence if used in game. These samples span the six talent-tree families (Wingman is in section 5.2) plus capstone and neutral cases. This does not yet certify the 33 individual Q1 routes.

### 10.1 Expert Pilot / AP-Q1-EP04 (vehicle survival)

Q1 actual intent: "I want to keep a vehicle in one piece when a fight turns ugly, dodging the worst hits and holding together under fire."
Hypothetical observed top-four keys: `pilotMastery`, `tacticalAwareness`, `engineeringMastery`, `reactionDefense`.

A - pilotMastery: "I've worked at keeping a vehicle under control when things stop going according to plan. I want that steadiness to be the foundation of my flying."
B - tacticalAwareness: "I tend to notice the shape of a dangerous situation before I commit to it. I want that judgment to guide every defensive choice I make at the controls."
C - engineeringMastery: "I understand what machinery can take and what it can't. I want to use that knowledge to keep my vehicle functioning when the margin for error disappears."
D - reactionDefense: "I've built habits around responding when danger comes suddenly. I want those instincts to work with my piloting instead of depending on luck."
E - alternative: "I've relied on preparation to get this far, but I want to find out what I can do when there is no time to prepare."
F - neutral: "I'm not sure which part of my experience will matter most when I'm trying to keep a vehicle safe."

Editorial guard: No statement claims ownership of Vehicular Evasion, Juke, Keep It Together, or another Q1-referenced future talent.

### 10.2 Gunner / AP-Q1-GN03 (systems disruption)

Q1 actual intent: "I want to disable an enemy vehicle by wrecking the systems it needs to keep fighting, not just hammer away at its hull."
Hypothetical observed top-four keys: `accuracy`, `vehicularDamage`, `mechanicalMastery`, `tacticalAwareness`.

A - accuracy: "I've invested in making carefully chosen attacks count. I want that precision to matter more than simply firing the biggest weapon available."
B - vehicularDamage: "I've developed ways to make vehicle-mounted weapons effective. I want that firepower to be useful even when destroying the whole target isn't the best answer."
C - mechanicalMastery: "I know how machinery comes together, and I want that knowledge to guide where I aim when I need a vehicle to stop functioning."
D - tacticalAwareness: "I've learned to identify which threat matters most in a changing fight. I want to bring that same judgment to choosing the system worth disabling."
E - alternative: "I've built my fighting around hitting hard, but I want to learn whether careful restraint can be just as decisive."
F - neutral: "I know the direction that interests me, but I'm still deciding which of my existing strengths belongs at its center."

Editorial guard: `mechanicalMastery` is an actual 125-key bias identifier, but a score must be supported by real mechanical knowledge; no assumed System Hit, Crippling Hit, or vehicle-owned weapon. The Q1 desire to disable does not establish a nonlethal outcome.

### 10.3 Spacer / AP-Q1-SP02 (shipboard personal combat)

Q1 actual intent: "I want to be as capable in a ship's cramped corridors as I am at its controls when trouble comes aboard."
Hypothetical observed top-four keys: `evasion`, `stealth`, `engineeringMastery`, `reactionDefense`.

A - evasion: "I've learned to avoid being cornered when space is tight. I want that movement discipline to stay useful when the fight is aboard a ship instead of outside it."
B - stealth: "I've made a habit of approaching trouble without announcing myself. I want to keep that advantage when a ship's layout gives me few places to hide."
C - engineeringMastery: "I understand how structures fit together. I want that knowledge to help me use a ship's corridors and equipment intelligently rather than rely on brute force."
D - reactionDefense: "My first instinct is to respond quickly when an attack catches me off guard. I want to keep my bearings when there's hardly room to move."
E - alternative: "Most of my attention has gone to the controls. I want to make myself useful when flying is no longer the problem in front of me."
F - neutral: "I haven't decided which part of my old training will help me most when a fight moves aboard."

Editorial guard: The alternative E's reference to prior controls is appropriate only if the actor actually has a piloting-focused build; it MUST be replaced with a non-assertive alternative otherwise. No spaceship or prior boarding action is implied.

### 10.4 Squadron Leader / AP-Q1-SL01 (coordinated squadron attack)

Q1 actual intent: "I want to call the right target and bring a whole squadron in on a coordinated attack run."
Hypothetical observed top-four keys: `formation`, `allySupport`, `accuracy`, `initiative`. Assume no verified formal command or squadron affiliation.

A - formation: "I've learned the value of staying aware of where everyone is positioned. I want that understanding to shape how I coordinate pilots, if I get the chance."
B - allySupport: "I've put effort into helping other people do their jobs well. I want that habit to matter as much as my own flying when a group has to act together."
C - accuracy: "I've made precision part of my training. I want that discipline to help me recognize which target is worth a squadron's attention."
D - initiative: "I've learned to act when an opening appears. I want to carry that judgment into choosing when a group should move, not just when I should."
E - alternative: "I know how to look after my own actions. I want to find out whether I can become someone other pilots choose to follow."
F - neutral: "I want to understand coordinated flying better before I decide which of my strengths belongs in that role."

Editorial guard: No character has been assigned military rank, a squadron, or an actual leadership history by these lines. Intro should not call the player "commander" without evidence. Squadron Leader talents can have prerequisites and squad requirements; Q2 grants none.

### 10.5 Blockade Runner / AP-Q1-BR02 (fast escape)

Q1 actual intent: "I want to turn speed into protection, making it harder for pursuers to hit my vehicle as I race away."
Hypothetical observed top-four keys: `pilotMastery`, `initiative`, `evasion`, `engineeringMastery`.

A - pilotMastery: "I've learned to keep control as a vehicle approaches its limits. I want that control to give me choices other pilots would miss."
B - initiative: "I've built my approach around recognizing the moment to move. I want to use that timing to get clear before an escape becomes a fight."
C - evasion: "I prefer leaving danger behind to proving I can withstand it. I want that instinct to become part of how I fly under pressure."
D - engineeringMastery: "I understand what machines can endure when they're pushed. I want that knowledge to help me judge when speed will save us and when it could cost us everything."
E - alternative: "I've spent enough time thinking about how to win a confrontation. I want to learn when the better skill is leaving it behind." 
F - neutral: "I know I want speed to work for me, but I haven't decided which of my strengths matters most to getting away safely."

Editorial guard: E's past combat focus needs affirmative build or survey evidence. No outlaw or smuggler label is implied, and Q2 does not claim the character already has Outrun.

### 10.6 Identity fulfillment / AP-Q1-ID02 (Ace Pilot is the destination)

Q1 actual intent: "I could spend the rest of my career becoming a better Ace Pilot. I don't need another title to make that worthwhile."
Hypothetical observed top-four keys: `pilotMastery`, `engineeringMastery`, `allySupport`, `skillUtility`.

A - pilotMastery: "I've put real effort into becoming someone who can be trusted at the controls. I want to spend my career refining that craft."
B - engineeringMastery: "Understanding the machines I work with has become part of what makes me capable. I want that knowledge to remain central to my life as an ace."
C - allySupport: "I've learned that my skills are worth more when they help others succeed. I want to measure my growth by what I can do for the people beside me."
D - skillUtility: "I've become comfortable learning more than one way to solve a problem. I want to stay versatile while I deepen the work I've already chosen."
E - alternative: "I know what I'm good at, but I don't want mastery to mean repeating the same habits forever. I want to keep finding new dimensions of being an ace."
F - neutral: "I'm content making this my profession, even if I haven't decided which strength I most want to refine."

Editorial guard: "Ace Pilot is enough" is a possible self-reported capstone preference, NOT permission to erase any separately recorded long-term declaration. Do not force a later title, Bridge, or future class.

### 10.7 Neutral Q1 / AP-Q1-NEUTRAL

Q1 actual intent: "I want to understand what being an Ace Pilot makes possible before I decide where to focus."
Hypothetical observed top-four keys: `pilotMastery`, `accuracy`, `allySupport`, `tacticalAwareness`.

A - pilotMastery: "The control I've developed at the helm is something I value. I could see it becoming central to how I define myself as an ace."
B - accuracy: "I've spent time trying to make deliberate actions count. I may want that discipline to shape my next stage of training."
C - allySupport: "I've learned to make other people more effective. I might choose to place that strength at the center of my work as an ace."
D - tacticalAwareness: "I've learned to read complicated situations before acting. That judgment might be worth developing further here."
E - alternative: "I'm interested in finding a part of this new identity that isn't already familiar to me."
F - neutral: "I still want to explore the possibilities before choosing which part of my experience matters most."

Editorial guard: Do not infer a Q1 specialization from a neutral response. This Q2 answer is its own choice if committed; displaying A-D does not become a declaration. Strongly avoid score confirmation loops.

## 11. Cross-family fixture disposition

- Full six-answer prototype fixture coverage now includes: Expert Pilot (EP04), Gunner (GN03), Spacer (SP02), Squadron Leader (SL01), Blockade Runner (BR02), Wingman (WM03 in section 5.2), capstone (ID02), and Q1 neutral. Eight conditional response sets, 48 first-person statements, all draft.
- Still untested: exact outputs of live Suggestion Engine, all remaining Ace Pilot Q1 IDs, evidence sufficiency and factual gating for real actors, and whether A-D are genuinely distinct for typical 7th+ level characters.
- Further content additions should be driven by gaps found in those tests. Do not generate an exhaustive 33 x 125 manual matrix without evidence that it is needed.

---

# P3 CONTINUATION - Three-Class Editorial Stress Test, v0.2

**Editorial addendum.** Sections 1-10 are preserved verbatim from v0.1 apart from the version header/status. This continuation extends the design; it does **not** retroactively turn hypothetical response sets into observed Suggestion Engine output or certify every source claim. The owner positively endorsed the synthesis direction and authorized further work, not new runtime scoring or GitHub writes.

## 12. Updated evidence inventory and audit scope

The pinned prestige Q1 source contains **154 distinct authored response IDs** in the three-class pilot: Ace Pilot 33, Jedi Knight 98, Independent Droid 23. The first two sets were individually inventoried against their exact committed Q1 sections (Ace section 11 and Jedi Knight section 19), including all unique IDs. Independent Droid's 23 are its seven Autonomy, seven Specialized Droid, four Elite Droid, two class-feature, and three identity/neutral choices. These are editorial Q1 ROUTES, not 154 legal currently acquired options.

| Pilot class | Class ID in `packs/classes.db` | Q1 editorial coverage | Key stresses for Q2 | Current progression evidence |
|---|---|---:|---|---|
| Ace Pilot | `9c9989c34714f920` | 33 | Vehicle roles, solo vs crew, noncombat spacer, capstone | Talent first prestige level; Vehicle Dodge begins **second** Ace Pilot level |
| Jedi Knight | `fb5c2644f988e6bf` | 98 | 14 talent trees, Force power vs talent vs later technique, role diversity, tradition/moral context | Talent first class level; Force Technique first at **second** Jedi Knight level |
| Independent Droid | `3b1ed5f1038d49fb` | 23 | Droid-only autonomy, technical/physical/social builds, exceptional entry level, nonbiological language | Sapience and talent first class level; Independent Spirit begins **second** Independent Droid level |

The progression observations come from a read of `packs/classes.db` at blob `78eda0673aae033e2f38414500e56d12c92c32ce`; printed sources and prerequisites still govern legal access. The Independent Droid source-tree ID anomaly remains unresolved. The class document identifies Jedi Knight Core Rulebook pp. 217-219, Independent Droid Force Unleashed pp. 46-48 and Scavenger's Guide to Droids expansions. Sourcebook details are reused from the previous Q1 audit, **not newly mechanically certified** in this P3 pass.

### 12.1 Actual engine limitations verified from source

1. `scripts/engine/prestige/identity-engine.js`, `computeTotalBias`, combines **nine** layers. `SurveyBias`, archetype/specialist, reinforcement and prestige-chassis layers are not purely observed feats/talents/skills. Its `mechanicalBias` result is not by itself a clean 'top four historical strengths' result.
2. `scripts/engine/suggestion/BuildIntent.js`, `_buildActorState`, merges pending selected feats/talents/skills into sets labelled `ownedFeats`, `ownedTalents` and `trainedSkills`. Calling the overall analysis with `pendingData` without provenance separation can misdescribe pending choices as history. That analysis also applies Mentor survey bias.
3. `scripts/engine/suggestion/tag-signal-engine.js` exports `buildTagBiasMap`, but this combines identity, Mentor, archetype, theme, equipment and route evidence and returns candidate-facing TAGS rather than a verified actor-observed top-four list of the existing 125 `mechanicalBias` keys.
4. `SuggestionEngineCoordinator` exposes `game.swse.suggestions.analyzeBuildIntent`, but the reviewed interface does not guarantee a **ranked 125-key observed-only evidence projection**. Do not fabricate a public API name or assume a stored scores field.
5. Several current consumers use item names and tree-name fallbacks. A mechanical narrative statement must require a typed owned-item/source identity where available; name matching alone is not sufficient when same-name talents exist.

**Implementation blocker P3-ENGINE-01:** The intended read-only projection must be specified/tested against the *existing* scorer/authorities, preserving source-specific contributions. It may separate mechanical contributions by source and present their existing values; it must **not** add a new ranking formula. Until that exists, all four-key examples below are explicit hypothetical FIXTURES.

## 13. Ace Pilot - all 33 Q1 routes accounted for

Each row supplies a **Q2 synthesis focus**, not another rules tutorial, and examples of plausible **pre-existing** bias keys to check against actual actor evidence. These are candidate keys, NOT required talents, automatic top ranks, approved weights or guaranteed player-visible options. If none is evidenced, route to the honest sparse-data fallback.

| Q1 route | Carry-forward question focus | Candidate present-build keys to evaluate | Special guardrail |
|---|---|---|---|
| `AP-Q1-EP01` | Pursuit and positioning | `pilotMastery`, `tacticalAwareness`, `initiative` | No claim of a completed dogfight |
| `AP-Q1-EP02` | Difficult-to-pin-down dogfighter | `evasion`, `reactionDefense`, `pilotMastery` | Do not claim Elusive Dogfighter or Blind Spot owned |
| `AP-Q1-EP03` | Fast but controlled flight | `pilotMastery`, `initiative`, `tacticalAwareness` | No blanket speed bonus |
| `AP-Q1-EP04` | Keep vehicle intact under attack | `pilotMastery`, `engineeringMastery`, `reactionDefense` | Do not import future Vehicle Dodge at level 1 |
| `AP-Q1-EP05` | Unusual attack approaches | `accuracy`, `pilotMastery`, `tacticalAwareness` | No assumed ramming or attack-run feat |
| `AP-Q1-EP06` | Expertise with one vehicle type | `pilotMastery`, `mechanicalMastery`, `skillUtility` | Do not assume specific vehicle ownership or focus |
| `AP-Q1-EP07` | Inspire fellow pilots by competence | `allySupport`, `formation`, `pilotMastery` | No assumed fame or squadron |
| `AP-Q1-GN01` | Make vehicle weapon fire count | `accuracy`, `vehicularDamage`, `tacticalAwareness` | Personal weapon accuracy is not vehicle gunnery ownership |
| `AP-Q1-GN02` | Gunnery in a dogfight | `vehicularDamage`, `reactionDefense`, `accuracy` | Gunner need not be the vehicle pilot |
| `AP-Q1-GN03` | Disable systems rather than hull | `accuracy`, `mechanicalMastery`, `vehicularDamage` | No automatic System Hit or Crippling Hit |
| `AP-Q1-GN04` | Act on brief firing opportunity | `initiative`, `accuracy`, `vehicularDamage` | No automatic reaction attack |
| `AP-Q1-GN05` | Coordinate fire with another gunner | `formation`, `allySupport`, `accuracy` | No established partner or Synchronized Fire talent |
| `AP-Q1-GN06` | Decisive charged vehicle attack | `firepower`, `vehicularDamage`, `tacticalAwareness` | No assumed overcharge-capable weapon |
| `AP-Q1-SP01` | Zero-gravity operation | `skillUtility`, `evasion`, `spacefarerMastery` | No prior EVA mission assumed |
| `AP-Q1-SP02` | Fight aboard a ship | `accuracy`, `skillUtility`, `reactionDefense` | Starship corridor combat != vehicle gunnery |
| `AP-Q1-SP03` | Escape shipboard danger | `evasion`, `initiative`, `stealth` | No boarding adventure assumed |
| `AP-Q1-SP04` | Raid/disrupt vessel and withdraw | `infiltration`, `tacticalAwareness`, `sabotageExpertise` | No piracy/criminal history assumed |
| `AP-Q1-SL01` | Coordinate a squadron attack | `tacticalAwareness`, `allySupport`, `initiative` | No prior rank or squad command |
| `AP-Q1-SL02` | Sustain allied vehicles | `engineeringMastery`, `allySupport`, `tacticalAwareness` | No owned squadron or repairs talent |
| `AP-Q1-SL03` | Teach useful maneuvers | `knowledgeMastery`, `allySupport`, `pilotMastery` | No proven instructor or special talent ownership |
| `AP-Q1-SL04` | Group maneuvering | `formation`, `tacticalAwareness`, `allySupport` | Must not equate ambition to command authority |
| `AP-Q1-BR01` | Fly through hostile blockade | `evasion`, `pilotMastery`, `tacticalAwareness` | No criminal or wartime biography assumed |
| `AP-Q1-BR02` | Escape through speed | `pilotMastery`, `evasion`, `initiative` | No passive Outrun benefit claimed |
| `AP-Q1-BR03` | Use larger vessel as cover | `tacticalAwareness`, `evasion`, `pilotMastery` | Must respect actual future vehicle-size conditions |
| `AP-Q1-BR04` | Avoid forced dogfight | `evasion`, `initiative`, `tacticalAwareness` | No dogfight immunity |
| `AP-Q1-WM01` | Maintain allied vehicle survival | `allySupport`, `pilotMastery`, `engineeringMastery` | No named wingmate or Escort Pilot ownership |
| `AP-Q1-WM02` | Help an ally escape pursuit | `evasion`, `formation`, `allySupport` | No established wingman team |
| `AP-Q1-WM03` | Shield an ally by piloting | `pilotMastery`, `reactionDefense`, `allySupport` | Do not claim Run Interference owned |
| `AP-Q1-WM04` | Set up ally's shot | `accuracy`, `allySupport`, `tacticalAwareness` | No shared attack grant |
| `AP-Q1-WM05` | Respond when ally is attacked | `reactionDefense`, `vehicularDamage`, `allySupport` | No Wingman Retribution owned |
| `AP-Q1-ID01` | Vehicle breadth as personal identity | `pilotMastery`, `skillUtility`, `mechanicalMastery` | No universal vehicle proficiency |
| `AP-Q1-ID02` | Ace Pilot as sufficient life vocation | `pilotMastery`, `skillUtility`, `allySupport` | Preserve previous goal unless separately revised; no mandated next class |
| `AP-Q1-NEUTRAL` | No declared class-specific specialization | Any present evidenced distinct keys; perhaps `pilotMastery` | Do not invent a Q1 focus; F stays neutral |

**Matrix audit:** 7 EP + 6 GN + 4 SP + 4 SL + 4 BR + 5 WM + 2 identity + 1 neutral = **33 distinct route IDs**. This is a manually reviewed Q1→Q2 editorial routing matrix, not 33 fully player-tested dialogue slates.

### 13.1 New complete Ace Pilot edge fixture - coordinated strike without existing command

**Q1:** `AP-Q1-SL01` (want to direct a coordinated squadron attack). **Hypothetical owned-evidence keys:** `accuracy`, `tacticalAwareness`, `initiative`, `allySupport`. **Absent:** no evidenced `commandAuthority`, rank, squadron, or prior command. All A-D still require individual actor evidence.

- A / `accuracy`: "I've worked to make precise decisions when a target is difficult to reach. I want that care to guide how I eventually coordinate a group of pilots."
- B / `tacticalAwareness`: "I've developed the habit of watching more than one threat at a time. I want to carry that awareness into the decisions I make for a coordinated flight."
- C / `initiative`: "I've learned to act when an opening appears. I want to recognize the moment that gives a whole formation its best chance."
- D / `allySupport`: "I've focused on making the people beside me more effective. I want that instinct to matter when I learn to coordinate pilots."
- E / alternative: "Most of my experience has been about my own performance. I want to explore the very different responsibility of working through a group."
- F / undecided: "I know what kind of coordination interests me, but I'm not sure which of my present strengths should shape it."

**Why this fixture matters:** Q1 interest in Squadron Leader mechanics does not turn Q2 into a false claim of existing squad leadership.

### 13.2 New complete Ace Pilot edge fixture - capstone identity

**Q1:** `AP-Q1-ID02` (Ace Pilot may be the final desired career). **Hypothetical existing keys:** `pilotMastery`, `engineeringMastery`, `skillUtility`, `reactionDefense`.

- A / `pilotMastery`: "The time I've devoted to flying has shaped my judgment. I want that competence to remain the heart of the ace I am choosing to be."
- B / `engineeringMastery`: "Understanding the machinery I depend on has become part of how I fly. I want to keep developing that knowledge throughout this career."
- C / `skillUtility`: "I've worked to become useful in more situations than a single role prepares me for. I want that breadth to remain part of my identity as an ace."
- D / `reactionDefense`: "I've built a habit of responding to sudden danger without losing control. I want that discipline to define the way I fly."
- E / alternative: "I've reached the role I wanted. I may still discover new sides of myself while making this work my own."
- F / undecided: "I know this is a role I want to keep. I'm still discovering which of my strengths matters most within it."

**Capstone boundary:** The player has expressed satisfaction with Ace Pilot as a vocation, not automatically revised an original career-goal record and not elected a final level distribution.

### 13.3 New sparse-data Ace Pilot fixture - deliberate short slate

**Q1:** `AP-Q1-NEUTRAL`; hypothetical existing evidence supports only `pilotMastery` and `tacticalAwareness`. Exactly **four** visible options are intentionally provided; A-D need not be artificially filled.

- A / `pilotMastery`: "I've built my training around handling a vehicle with care. That may be the strongest foundation I carry into this role."
- B / `tacticalAwareness`: "I've worked to notice what is happening before I act. I want that judgment to matter, whichever kind of ace I become."
- E / alternative: "I want to see whether a different part of my experience becomes more important as I develop in this role."
- F / undecided: "I'm not sure which part of my existing training I want to emphasize yet."

**Fallback boundary:** The player has not chosen a Q1 tree. Do not interpolate one, infer a Wingman preference from Vehicular Combat, or treat neutral as a weak commitment.

## 14. Jedi Knight - role diversity and Miraj voice

### 14.1 Q1 family-level synthesis routing

The committed Jedi Knight Q1 bank contains **14 talent-tree groups**, **7 later Force Technique focuses**, **2 identity choices**, and **one neutral**. The 14 tree-group response counts are Armor Specialist 6; Duelist 11; Lightsaber Combat 11; Lightsaber Forms 12; Jedi Battlemaster 5; Jedi Shadow 5; Jedi Watchman 5; Jedi Archivist 5; Jedi Healer 4; Jedi Artisan 5; Jedi Instructor 5; Jedi Investigator 5; Jedi Refugee 4; Jedi Weapon Master 5 = **88 talent-linked Q1 choices**. Thus 88 + 7 + 3 = **98**.

| Q1 group / family | Distinct Q2 synthesis question | Example existing-key candidates (not guaranteed) | Do not presume |
|---|---|---|---|
| `JK-AR01..06`, Armor Specialist | What learned defensive discipline comes into armor use? | `armorMastery`, `reactionDefense`, `damageReduction` | Armor proficiency, suit or shield ownership from class label |
| `JK-DU01..11`, Duelist | Which existing precision/defense techniques matter to a duel? | `accuracy`, `counterAttack`, `defensiveSwordsmanship` | Individual lightsaber form or feat actually owned |
| `JK-LC01..11`, Lightsaber Combat | Which learned defense, attack or restraint habits carry forward? | `reactionDefense`, `accuracy`, `allySupport` | Block/Deflect/Redirect Shot from intent alone |
| `JK-LF01..12`, Lightsaber Forms | How does actual martial discipline inform a desired form? | `formMastery`, `evasion`, `counterAttack` | Selected lightsaber form from its Q1 mention |
| `JK-BM01..05`, Battlemaster | Which existing supportive/tactical skills become a shared strength? | `allySupport`, `tacticalAwareness`, `moraleBonus` | Battle Meditation, prior command or saved allies |
| `JK-SH01..05`, Shadow | How do established discretion and judgment guide a difficult specialty? | `stealth`, `infiltration`, `tacticalAwareness` | Secret mission, dark-side action, moral judgment |
| `JK-WA01..05`, Watchman | How do vigilance and protective habits shape advanced service? | `tacticalAwareness`, `reactionDefense`, `allySupport` | Council appointment or official jurisdiction |
| `JK-AV01..05`, Archivist | How does prior study become a useful Knightly practice? | `knowledgeMastery`, `informationControl`, `skillUtility` | Any stored historical discovery or archive role |
| `JK-HE01..04`, Healer | Which verified care/support skills inform hoped-for Force healing? | `treatingInjury`, `healingMastery`, `allySupport` | Force Treatment or vital transfer automatically owned |
| `JK-AT01..05`, Artisan | How does established craft or precision serve construction? | `mechanicalMastery`, `engineeringMastery`, `accuracy` | A special saber modification already achieved |
| `JK-IN01..05`, Instructor | Which proven expertise would they eventually wish to share? | `knowledgeMastery`, `allySupport`, `formMastery` | Known Force Secret, apprentice or instructor position |
| `JK-IV01..05`, Investigator | How do scrutiny, knowledge and judgment carry forward? | `tacticalAwareness`, `knowledgeMastery`, `informationControl` | An actual investigation or special Force sense |
| `JK-RF01..04`, Refugee | Which existing resourcefulness and discretion support concealment? | `stealth`, `resourcefulness`, `allySupport` | Character is hunted, exiled, or has a clandestine network |
| `JK-WM01..05`, Weapon Master | Which existing martial strengths deserve advanced refinement? | `accuracy`, `weaponMastery`, `combatAdaptability` | Owning paired weapons, shoto or required talents |
| `JK-FT01..07`, future Force Technique | How does established Force discipline inform a future technique? | `forceRecovery`, `knowledgeMastery`, `tacticalAwareness` | Force Technique is granted on Jedi Knight level 1 |
| `JK-ID01`, Knightly service | Which established strength best supports this chosen vocation? | `allySupport`, `tacticalAwareness`, `knowledgeMastery` | Membership automatically entails certain missions |
| `JK-ID02`, capstone | Which accumulated strength defines sustained Knighthood? | Any evidence-backed distinct keys | Mandatory Jedi Master, apprentice or goal change |
| `JK-ID03`, neutral | Which past strength might matter without a declared route? | Any evidence-backed distinct keys | Q1 specialization or lack of ambition |

### 14.2 Miraj - new fixed Q2 Mentor introduction (draft)

> "You have not reached this threshold by learning a single lesson. Whatever discipline you choose to deepen, the strengths you have already cultivated remain yours. Which of them should shape your Knighthood?"

This line is safe before acquisition and does not imply that Miraj was the player's former Master. If a genuine previous Mentor relationship exists, separately authored, evidence-gated personalization may acknowledge it; this fixed line must not fabricate one. Miraj remains calm, reflective and respectful. No automatic master/apprentice arc.

**Shared Q2 prompt:** "Which strength you have already developed should most influence the Jedi Knight you wish to become?"

### 14.3 Jedi fixture - Watchman vigilance, no presumed appointment

**Q1:** `JK-WA01` (want to sense threats before allies are caught unprepared). **Hypothetical evidenced keys:** `tacticalAwareness`, `allySupport`, `reactionDefense`, `knowledgeMastery`.

- A / `tacticalAwareness`: "I've learned to look past an immediate threat and notice what might follow. I want that attentiveness to guide the way I protect others as a Knight."
- B / `allySupport`: "I've invested in helping others act with greater confidence. I want that habit to remain part of how I prepare them for danger."
- C / `reactionDefense`: "I've trained to respond without wasting a moment when danger appears. I want the discipline behind that response to serve others as well as myself."
- D / `knowledgeMastery`: "I've learned to ask what I do not yet understand. I want that habit of inquiry to sharpen my vigilance, not merely add to my knowledge."
- E / alternative: "I've relied on my own judgment for a long time. I want to learn how to make that judgment a quiet source of safety for others."
- F / undecided: "I know I want to be more vigilant, but I am still deciding which of my strengths should guide that responsibility."

**Guardrail:** No declaration that the character is already a Council-appointed Watchman or has taken Force Warning.

### 14.4 Jedi fixture - healer with prior medical training

**Q1:** `JK-HE03` (interest in applying Force to medical care). **Hypothetical verified present keys:** `treatingInjury`, `healingMastery`, `allySupport`, `knowledgeMastery`. The fixture assumes real medical-training evidence independent of the Q1 choice.

- A / `treatingInjury`: "I've learned what ordinary care can accomplish, and where it reaches its limits. I want that understanding to guide the way I eventually use the Force to help the injured."
- B / `healingMastery`: "I've devoted part of my training to restoring others when they are hurt. I want to bring that discipline into the healing methods I study as a Knight."
- C / `allySupport`: "I've learned to make others stronger through the help I can offer. I want that instinct for service to shape my healing as much as any technique."
- D / `knowledgeMastery`: "I've relied on study to answer difficult questions. I want the same patience when learning what the Force can and cannot safely heal."
- E / alternative: "My earlier training has mostly prepared me to face threats. I want caring for those harmed by them to become just as important."
- F / undecided: "I know I want to help heal others, but I have not decided which of my existing strengths will matter most in that work."

**Guardrail:** This is an intention to build on prior medical skills, not proof of already owning the Jedi Healer talent Force Treatment or having performed a specific healing event.

### 14.5 Jedi fixture - Soresu defensive lightsaber form

**Q1:** `JK-LF09` (wants reliable defense through sustained attacks). **Hypothetical evidenced keys:** `reactionDefense`, `evasion`, `formMastery`, `allySupport`.

- A / `reactionDefense`: "I've practiced responding to danger without letting a first strike decide the exchange. I want that readiness to steady my blade when pressure increases."
- B / `evasion`: "I've learned to survive through movement and careful positioning. I want that same judgment to guide when I turn a strike aside rather than meet it directly."
- C / `formMastery`: "I've worked to refine the technique behind each motion. I want that discipline, not the desire to overpower anyone, to define my defense."
- D / `allySupport`: "I've made protecting others part of how I approach danger. I want my defensive discipline to leave room for the people beside me."
- E / alternative: "I've often measured skill by how quickly I can end a fight. I want to see what I can learn by enduring without rushing to strike."
- F / undecided: "I am drawn to an enduring defense, but I am still discovering which part of my experience can best support it."

**Guardrail:** `formMastery` must not be presented as an evidenced current strength without verified existing form-related feat/talent evidence; Q1 interest in Soresu cannot produce that evidence.

### 14.6 Jedi fixture - Knighthood as final vocation

**Q1:** `JK-ID02` (Knighthood fulfills career aspiration). **Hypothetical existing keys:** `tacticalAwareness`, `knowledgeMastery`, `allySupport`, `accuracy`.

- A / `tacticalAwareness`: "I've learned that judgment matters as much as the ability to act. I want careful awareness to remain central to my life as a Knight."
- B / `knowledgeMastery`: "My studies have taught me how much I still have to learn. I want that humility to be a permanent part of my Knighthood."
- C / `allySupport`: "I've spent time developing ways to help others succeed. I want that habit of service to define this calling, wherever it takes me."
- D / `accuracy`: "I've worked to make my actions deliberate and precise. I want that care to shape my decisions, not only the way I wield a weapon."
- E / alternative: "I've reached the calling I chose. I want to discover parts of Knighthood my earlier training never asked me to consider."
- F / undecided: "I am content to grow as a Jedi Knight. I have not yet decided which strength I want to place at the center of that life."

**Guardrail:** Do not imply Master rank, Jedi Council appointment, prior apprenticeship under Miraj, a mandatory Padawan or a required future class. Q5, not Q2, handles what comes after this achievement.

## 15. Independent Droid - class-specific syntax and autonomy

### 15.1 Full 23-route Q1 synthesis map

The class's Q1 bank is comparatively small. Here each route gets an explicit intended context to avoid reducing every question to generic 'freedom vs obedience'. IDs `AU..`, `SD..`, `ED..`, `CF..`, `ID..` are **local editorial source IDs** and must be namespaced by class when stored; they are not global item IDs.

| Local Q1 ID | Future interest from committed Q1 | Present-build keys to consider (when evidenced) | Q2 boundary |
|---|---|---|---|
| `AU01` | Resist unwanted reprogramming | `hackingSkills`, `reactionDefense`, `mechanicalMastery` | No claim of prior coercion or existing Defensive Electronics |
| `AU02` | Resist ion disruption | `damageReduction`, `reactionDefense`, `mechanicalMastery` | No automatic ion resistance talent |
| `AU03` | Recover from selected shutdown conditions | `mechanicalMastery`, `selfProgram`, `reactionDefense` | No actual past shutdown asserted |
| `AU04` | Modify own systems | `mechanicalMastery`, `selfProgram`, `technicalInnovation` | No automatic modification permission or cost bypass |
| `AU05` | Enhance self-repair | `engineeringMastery`, `mechanicalMastery`, `skillUtility` | No actual damage history or Repair Self talent |
| `AU06` | Appear unremarkable to avoid detection | `stealth`, `deceptionMastery`, `identityShift` | No assumed former owner or covert mission |
| `AU07` | Rapid movement under threat | `evasion`, `initiative`, `rapidResponse` | No assumed movement system or Swift Droid talent |
| `SD01` | Temporary physical surge | `combatStamina`, `brutalForce`, `mechanicalMastery` | Not automatically immune to post-surge harm |
| `SD02` | Surge-enhanced mobility | `evasion`, `mechanicalMastery`, `skillUtility` | No hover equipment presumed |
| `SD03` | Communication and systems interfacing | `hackingSkills`, `persuasionMastery`, `informationControl` | Not a guaranteed social feat |
| `SD04` | Better computer-security performance | `hackingSkills`, `technicalMastery`, `tacticalAwareness` | No computer-master talent owned |
| `SD05` | Reliable precision and manipulation | `accuracy`, `mechanicalMastery`, `technicalMastery` | No universally humanlike hands assumed |
| `SD06` | Short processor overclock | `initiative`, `technicalMastery`, `adaptiveAI` | No Hotwired Processor ownership |
| `SD07` | Reconfigure trained routines | `skillUtility`, `technicalInnovation`, `adaptiveAI` | No skill retraining already occurred |
| `ED01` | Interrupt another droid's inhibitor | `hackingSkills`, `droidControl`, `technicalMastery` | No claim the other unit consented or was freed |
| `ED02` | Solve problems beyond established routines | `knowledgeMastery`, `skillUtility`, `adaptiveAI` | No Heuristic Mastery ownership |
| `ED03` | Prepare modular response routines | `initiative`, `tacticalAwareness`, `technicalMastery` | No Scripted Routines talent owned |
| `ED04` | Survive exceptional damage | `damageReduction`, `reactionDefense`, `mechanicalMastery` | No Ultra Resilient ownership |
| `CF01` | Elect beneficial mental influence | `allySupport`, `independence`, `tacticalAwareness` | Sapience class grant is pending/owned by status; no removal of all immunities |
| `CF02` | Bolster defense through independent choice | `reactionDefense`, `independence`, `adaptiveAI` | Independent Spirit begins class level 2 |
| `ID01` | Define role by autonomous decision | Any verified present keys, especially `skillUtility`, `adaptiveAI` | Do not treat prior function or manufacturer as destiny |
| `ID02` | Independence itself as capstone | Any verified present keys | No compelled new prestige path or overwritten goal |
| `NEUTRAL` | Uncommitted development focus | Any verified existing keys | No Q1 positive signal, no coerced binary freedom choice |

**23-route inventory:** 7 AU + 7 SD + 4 ED + 2 CF + 2 identity + 1 neutral = 23. Presence in an editorial matrix does not certify source-tree legal access; the Independent Droid class pack still has the suspect UUID-like tree ID.

### 15.2 Seraphim - fixed Q2 introduction (new draft)

> "<Analysis: New designation, existing capabilities.> Some routines are worth retaining. Even the boring ones. Which will you keep because you choose to?"

**Voice source:** `data/dialogue/mentors/seraphim/seraphim_dialogue.json`: clinical, sardonic, analytical, dry diagnostic tags; values autonomy and self-ownership. The line is **not** evidence that any particular character has experienced a memory wipe, maker abuse, forced service or recent awakening. Avoid automatically equating Independent Droid class with finished Sapience if the class is pending.

**Shared Q2 prompt:** "Which strength from your existing systems and training do you want to make part of the independent droid you choose to become?"

### 15.3 Droid fixture - Autonomy / resist unwanted reprogramming

**Q1:** `AU01` (Defensive Electronics aspiration). **Hypothetical evidenced keys:** `hackingSkills`, `mechanicalMastery`, `reactionDefense`, `skillUtility`.

- A / `hackingSkills`: "I've developed ways to understand computer systems from within. I want that knowledge to help me recognize attempts to change my own instructions."
- B / `mechanicalMastery`: "I've learned to assess the parts and systems on which I depend. I want the same precision when evaluating changes to my own chassis."
- C / `reactionDefense`: "I've prepared to respond when a threat arrives without warning. I want that readiness to apply when the threat is directed at my processors."
- D / `skillUtility`: "I've expanded the range of tasks I can handle. I want that flexibility to help me recognize when a new instruction conflicts with a choice I have made."
- E / alternative: "My systems were built to perform tasks. I want to explore ways of evaluating a command before I decide whether it deserves obedience."
- F / undecided: "I want to protect my autonomy, but I have not decided which established capability should support it first."

**Guardrail:** No assertion of an actual prior hack, owner mistreatment, memories of restraining bolts, or acquired Defensive Electronics. In line E, 'built to perform tasks' is a general droid premise, not a claim of specific origin.

### 15.4 Droid fixture - Specialized Droid / skill reconfiguration

**Q1:** `SD07` (Skill Conversion aspiration). **Hypothetical evidenced keys:** `skillUtility`, `technicalInnovation`, `mechanicalMastery`, `tacticalAwareness`.

- A / `skillUtility`: "I've developed several reliable procedures instead of depending on one. I want to preserve that breadth when deciding which routines to refine."
- B / `technicalInnovation`: "I've learned to solve technical problems in unexpected ways. I want that creativity to guide how I reorganize my own training."
- C / `mechanicalMastery`: "I've spent time understanding how systems work together. I want that insight to guide changes that keep my chassis effective."
- D / `tacticalAwareness`: "I've learned to identify the problem that matters most in a changing situation. I want that judgment to determine which capabilities I prioritize."
- E / alternative: "The tasks I've been built to perform are not the only ones I could choose to learn. I want to test a very different specialty."
- F / undecided: "I want more control over my training, but I have not decided which of my existing routines should be the starting point."

**Guardrail:** A desire for Skill Conversion is not proof that it has been selected, that trained skills can be swapped without published restrictions, or that the droid has already rebuilt its capabilities.

### 15.5 Droid fixture - Elite Droid / heuristic exploration

**Q1:** `ED02` (Heuristic Mastery aspiration). **Hypothetical evidenced keys:** `knowledgeMastery`, `hackingSkills`, `tacticalAwareness`, `engineeringMastery`.

- A / `knowledgeMastery`: "I've learned to recognize connections between subjects I was taught separately. I want that habit to help me reason beyond my formal training."
- B / `hackingSkills`: "I've developed skill at interpreting computer behavior. I want that experience to make unfamiliar systems easier to understand."
- C / `tacticalAwareness`: "I've become practiced at noticing a problem before the situation is fully understood. I want that judgment to help me act when the expected procedure is incomplete."
- D / `engineeringMastery`: "I've studied how parts of a system affect the whole. I want to use that perspective when confronting problems I was never built to solve."
- E / alternative: "My established expertise is useful. I want to learn when to set it aside and try a method my earlier routines never considered."
- F / undecided: "I want to think beyond established routines, but I have not chosen which of my present strengths should lead the way."

**Guardrail:** This is not proof of acquired Heuristic Mastery or an ability to ignore trained-skill restrictions.

### 15.6 Droid fixture - self-defined independence as capstone

**Q1:** `ID02` (independence is the desired final designation). **Hypothetical existing keys:** `mechanicalMastery`, `skillUtility`, `reactionDefense`, `hackingSkills`.

- A / `mechanicalMastery`: "I've learned to maintain and understand the systems that sustain me. I want that competence to remain part of how I define myself."
- B / `skillUtility`: "I've developed more than one way to be useful. I want the freedom to decide which of those capabilities deserves my attention."
- C / `reactionDefense`: "I've refined how I respond to unexpected danger. I want that readiness to protect decisions I have freely made."
- D / `hackingSkills`: "I've learned to recognize how computer systems direct behavior. I want that understanding to guide my decisions about my own programming."
- E / alternative: "I sought independence, not another designation. I want to discover what I value when I no longer define myself by a required function."
- F / undecided: "My independence is worth keeping. I am still deciding which of my established capabilities best expresses it."

**Capstone boundary:** No forced new class, biological developmental language, former-owner story, or altered original goal.

### 15.7 Sparse-data Droid fixture - not every actor has four trustworthy bias signals

**Q1:** `NEUTRAL`; hypothetical history supports only one observed key, `skillUtility`. Present **three** choices, not a fabricated six.

- A / `skillUtility`: "I have developed flexibility in the tasks I can perform. That may be the most useful foundation for defining my next choices."
- E / alternative: "I want to discover a capability that my existing routines do not yet emphasize."
- F / undecided: "I have not decided how my current capabilities should shape my independence."

**Fallback:** A high confidence in the droid's `independence` identity inferred from class selection or Q1 must not be presented as an already *observed* strength.

## 16. Cross-class negative tests and editorial acceptance results

These are **reasoning/authoring tests**, not executable Foundry tests. Each negative test specifies a concrete disallowed inference. Results below indicate whether the drafted material respects the constraint, not that a future UI does.

| Test | Input condition | Bad behavior to reject | Editorial result |
|---|---|---|---|
| `Q2-N01` | Ace Pilot first class level | "I've mastered Vehicle Dodge" | No such claim in new Q2 slates; PASS |
| `Q2-N02` | Jedi Knight first class level | "I've already learned my new Force Technique" | No such claim; PASS |
| `Q2-N03` | Independent Droid first class level | "Independent Spirit has saved me" | No such claim; PASS |
| `Q2-N04` | Jedi Knight Watchman interest | "The Council appointed me Watchman" | No such claim; PASS |
| `Q2-N05` | Ace Pilot Squadron Leader interest | "I've commanded my squadron" | No such claim; PASS |
| `Q2-N06` | Independent Droid autonomy interest | "My owner abused/reprogrammed me" | No such claim; PASS |
| `Q2-N07` | Uncommitted Q1 | Infer a specific specialization from score and present it as player-chosen | Neutral fixtures preserve ambiguity; PASS |
| `Q2-N08` | Existing old Level 1 career | Treat prestige capstone selection as deletion of old goal | Capstone fixtures guard against rewrite; PASS |
| `Q2-N09` | Only one trustworthy observed key | Invent three other A-D past strengths | Three-choice droid and four-choice Ace examples; PASS |
| `Q2-N10` | Q1 interest equals an unowned talent | Describe that named talent as already acquired | All examples distinguish aspiration from ownership; PASS |
| `Q2-N11` | Model ranks Force/biological mechanical key for droid | Force biological wording into generic Independent Droid speech | Proposed gate excludes unsuitable and unverified wording; DESIGN ONLY |
| `Q2-N12` | Same-name talents in multiple trees | Use text display name as unique entitlement ID | Explicit source-ID rule recorded; DESIGN ONLY |
| `Q2-N13` | Pending level-up contains feat or talent | Use `_buildActorState` aggregate `owned` set as proof of acquisition | Engine implementation BLOCKER recorded; NOT YET PASS |
| `Q2-N14` | Top four `IdentityEngine.computeTotalBias` includes old survey bias | Describe that interest as objectively demonstrated mechanics | Engine implementation BLOCKER recorded; NOT YET PASS |

**Editorial acceptance:** The architecture demonstrates separate Q1 *aspiration* and Q2 *historical-strength choice* for three divergent classes. We have not proven live per-actor ranking, absent-history phrasing, performance, or every possible 125-key combination. Those remain gates.

## 17. Status and next execution order

### Completed in this P3 continuation

- Verified first-pass Q1 structural inventories for Ace Pilot (33), Jedi Knight (98), and Independent Droid (23) with the committed prestige design.
- Re-read three exact class progression records, two new Mentor source files (Miraj and Seraphim), and related source-validation ledgers.
- Extended Ace Pilot route-level Q2 mapping to all 33 Q1 IDs, and added full conditional Squadron Leader, capstone, and sparse-data slates.
- Extended Jedi Knight Q2 to all 14 talent families, future Force Techniques, two identity and one neutral route, with four distinct complete conditional slates.
- Extended Independent Droid to all 23 Q1 route IDs, with five new conditional slates including sparse-data.
- Added explicit negative tests and isolated the observed-only top-four engine interface as the remaining technical blocker.

### Still required before expanding to all remaining 29 classes

1. **Engine extraction:** Prove or introduce the minimal *read-only* current-strength projection from existing scored outputs, with per-source provenance and no new scoring weights. Account for whether it returns 125 mechanical-bias keys or 190 semantic tags; never silently convert vocabularies.
2. **Observed fixture proof:** Run in Foundry VTT v13 with representative saved actors and pending prestige class upgrades; inspect existing engine output for ranks, provenance and stability. No actual actor data was available for this authoring pass.
3. **Class semantic coverage:** For Jedi Knight, individually bind 98 Q1 routes to concise reviewed focus phrases before any template interpolation. For Independent Droid, certify source tree IDs (including UUID anomaly). Ace Pilot has 33 route focus descriptions but still needs per-route rendered text QA.
4. **Mentor approval:** Review Mayu, Miraj, Seraphim intros and multiple voice variants against the approved characterization. Do not treat an established Mentor's guidance as a historical personal relationship with the actor.
5. **Content scale-up:** Use existing 125 strength stems and 500 foundation-class follow-through examples as **editorial inputs**, then author prestige-specific follow-through where each class's identity changes the meaning. Scale in class clusters; avoid a blind 125 x 32 prose matrix.
6. **Owner review:** Confirm the new Q2 Character Synthesis purpose and response presentation rules as final design. Approval to explore/author is not approval to replace V2 runtime, to write new persisted survey schema, or to commit/push.

**No GitHub changes, commits, PRs, Foundry runtime changes, actor writes or automated background work were made in this P3 continuation.**

---

## 18. P4 continuation — Elite Trooper, Medic, Sith Lord (2026-11-14/15)

**Scope and status:** This is a continued *documentation-only* Q2 design pass. All statements about the printed rules below are taken from the existing, pinned Q1 source review and class pack; this pass did **not** independently recertify every printed talent against its PDF page. New Q2 speeches, bindings, and test fixtures are editorial proposals; none are approved actor options or executable Foundry tests.

### 18.1 Pinned evidence and structural counts

| Prestige class | Class record ID | Mentor | Q1 draft IDs checked | Exact route coverage | Important limitation |
|---|---|---|---:|---|---|
| Elite Trooper | `c4dbedcf989cb6b2` | Breach | **62** | 59 tree-linked + 2 identity + 1 neutral | Four Master of Teräs Käsi Q1 options are **quarantined** for Elite Trooper class access. Ten repo trees, but the prestige presentation profile omits the published Squad Leader tree. |
| Medic | `06f4d9029debf827` | Kyber | **22** | 4 Survivor + 8 Advanced Medicine + 7 Medical Secret interests + 2 identity + 1 neutral | All seven Medical Secret entries are future aspirations: first Medical Secret choice at **Medic level 2**, not level 1. |
| Sith Lord | `2f7cfdc115c640a5` | Darth Miedo | **89** | 12 Sith + 15 Force Secret + 15 Alter + 12 Control + 12 Sense + 10 Dark Side + 5 Guardian Spirit + 3 tradition + 2 class feature + 2 identity + 1 neutral | **Two quarantined Q1 answers**; conditional tradition trees; printed general Force-tree access missing from class pack; Dark Side Score RAW/house-rule conflict. |
| **Three-class subtotal** | | | **173** | All 173 draft Q1 IDs accounted for in this classification | Structural coverage is not legal eligibility or dialog approval. |

For the six prestige classes examined across this rolling document (Ace Pilot 33, Jedi Knight 98, Independent Droid 23, Elite Trooper 62, Medic 22, Sith Lord 89), the source Q1 inventory covers **327** first-pass response IDs. This is **6/32 prestige-class identities**, not 327 rendered Q2 answers or 327 mechanically certified grants.

**Verified current `packs/classes.db` cadence:** Elite Trooper level 1 grants Delay Damage and a talent choice; its Damage Reduction progression starts level 2. Medic has a talent choice at odd class levels and Medical Secrets at even levels (2/4/6/8/10). Sith Lord is a five-level class: level 1 Fearless, Temptation, and a talent choice; levels 2–5 Force Secrets; level 3 and 5 additional talents. The prestige Q2 interview cannot grant or substitute for any of these selections.

**Mentor source files re-read:** `data/dialogue/mentors/breach/breach_dialogues.json`, `data/dialogue/mentors/kyber/kyber_dialogue.json`, `data/dialogue/mentors/darth_miedo/darth_miedo_dialogue.json`. All three have character-specific dialogue, but existing generic level greetings sometimes claim missions, prior mentorship or a Rule of Two relationship not established for the actor. Do not import those claims.

## 19. Elite Trooper — Breach, existing strength versus earned combat expertise

### 19.1 All 62 Q1 routes — reuse / Q2 translation groups

| Q1 route IDs from pinned library | Count | Distinct selected Q1 aspiration | Potential existing-strength keys for editorial matching only | Q2 disallow |
|---|---:|---|---|---|
| `ET-CM01`–`ET-CM07` | 7 | Stealth, covert approach, hidden positions, ambush | `stealth`, `infiltration`, `initiative`, `tacticalAwareness` | Do not assert past infiltration operations or previously owned Camouflage talents. |
| `ET-CO01`–`ET-CO08` | 8 | Commando analysis, suppressive coordination, demolition, resilience, protection | `tacticalAwareness`, `allySupport`, `damageReduction`, `firepower` | Do not infer personal unit leadership, explosives inventory, or past combat deeds. |
| `ET-WM01`–`ET-WM09` | 9 | Weapon accuracy, specialization, penetrating and multiple attacks | `accuracy`, `firepower`, `weaponMastery`, `combatStamina` | An existing general accuracy signal is not proof of the specific future Weapon Master talent. |
| `ET-TK01`–`ET-TK04` | 4 | Master of Teräs Käsi unarmed techniques | **QUARANTINE** pending Elite Trooper legal tree-access certification | No class-granted Teräs Käsi promise, auto-mapping, or mechanics-driven recommendations. |
| `ET-MW01`–`ET-MW04` | 4 | Mandalorian Warrior armor, movement, attacks | `armorMastery`, `initiative`, `combatStamina`, `meleeDamage` | Do not declare player Mandalorian merely because Breach is. |
| `ET-CR01`–`ET-CR06` | 6 | Critical attacks and immediate tactical exploitation | `accuracy`, `critRange`, `critDamage`, `initiative` | Do not treat future critical-range changes as already acquired. |
| `ET-ME01`–`ET-ME05` | 5 | Close combat and melee specialist tactics | `meleeDamage`, `weaponMastery`, `grappling`, `reactionDefense` | Require actual current evidence rather than using melee specialization as a past fact. |
| `ET-RC01`–`ET-RC05` | 5 | Republic Commando mechanics, ambush, reloading, mutual protection | `tacticalAwareness`, `formation`, `explosiveMastery`, `allySupport` | Do not infer the actor serves the Republic or has a commando squad. |
| `ET-PR01`–`ET-PR06` | 6 | Direct physical protection of others | `armorMastery`, `reactionDefense`, `allySupport`, `damageReduction` | Delay Damage is a future/current class feature contingent on finalization, not a previously used defense. |
| `ET-SL01`–`ET-SL05` | 5 | On-foot squad positioning and command | `formation`, `unitCoordination`, `commandAuthority`, `tacticalAwareness` | Squad Leader talent access requires individual conditions; no presumed command, affiliation or actual squad. |
| `ET-ID01` | 1 | Multi-method adaptable fighter | Distinct proven keys across contrasting domains | No fabricated proficiency in every tree. |
| `ET-ID02` | 1 | Elite Trooper as a possible final achievement | Any current verified core strength; past ambition only if recorded | No mandatory next class, no hidden earlier-goal deletion. |
| `ET-NEUTRAL` | 1 | No Q1 specialization selected | Diverse existing, demonstrable strengths without asserted prestige focus | No manufactured chosen Q1 specialty. |

**Route map audit:** 7+8+9+4+4+6+5+5+6+5+1+1+1 = **62**, matching exactly the 62 unique authored Q1 response IDs in section 15 of the pinned prestige design. The four `ET-TK` rows are **research-only**, not valid evidence that the class can select those talents.

### 19.2 Breach fixed Q2 introduction (new editorial draft)

> "You've put in the work to get this far. Good. But nobody fights with just a title. Think about what you've already got going for you, and what you want to keep sharp when the stakes go up. Which strength are you counting on?"

**Shared Q2 prompt:** "Which strength from your existing training do you want to carry into your development as an Elite Trooper?"

**Voice gate:** direct, practical, approachable, an earned-milestone acknowledgement; no shouting/drill-sergeant parody, actual war record, past joint mission, Mandalorian heritage, or familiarity with Lead unless independently recorded. Use "qualify for elite training" rather than "you're already an Elite Trooper" when acquisition remains pending.

### 19.3 Fixture ET-PR02 — protection after existing combat training (full six)

**Selected Q1:** `ET-PR02`, desire to step into incoming fire for an ally; this is *prospective* interest in a Protection-tree direction, not ownership of Bodyguard's Sacrifice. **Hypothetical observed keys:** `armorMastery`, `reactionDefense`, `tacticalAwareness`, `allySupport`. Every A–D statement is permitted only when supported by verified, finalized actor evidence. No companion is presumed to exist.

- A / `armorMastery`: "I've made protection part of how I fight. I want that defensive training to give me better judgment when someone else is in danger."
- B / `reactionDefense`: "I've worked on responding quickly when a situation turns ugly. I want those reactions to serve more than my own survival."
- C / `tacticalAwareness`: "I've trained myself to read where the danger is coming from. I want to use that awareness to make the right protective decision before it's too late."
- D / `allySupport`: "I've chosen abilities that make other people more effective. I want that focus on others to remain part of the fighter I'm becoming."
- E / alternative: "I've spent a lot of time learning to win fights. I want to find out whether guarding someone else can become just as important to me."
- F / neutral: "I've earned the chance to develop further, but I don't know yet which part of my previous training should define me."

**Distinctness test:** Q1 = *desired protective prestige capability*; Q2 = whether existing armor, reactions, tactical awareness, or ally-support development should be the player's chosen foundation. Q3 will later ask what the character **does in a scenario**; this fixture does not make that tactical choice.

### 19.4 Fixture ET-CM04 — covert expertise from a demonstrably different prior build (full six)

**Q1:** `ET-CM04`, future interest in escaping notice. **Hypothetical observed:** `stealth`, `initiative`, `resourcefulness`, `accuracy`. None automatically proves a recorded covert mission.

- A / `stealth`: "I've put effort into remaining unnoticed. I want that practiced care to remain central to how I handle dangerous assignments."
- B / `initiative`: "I've learned to value acting before a threat can set the terms. I want to carry that timing into a more deliberate kind of combat training."
- C / `resourcefulness`: "I've developed ways to work with what I have. I want that adaptability to count when the obvious approach isn't safe."
- D / `accuracy`: "I've focused on being precise when an opening appears. I want that discipline to matter more than how much noise I can make."
- E / alternative: "Most of my experience has been direct. I want to discover whether restraint and patience deserve a larger place in my approach."
- F / neutral: "I know there are several ways to use elite training. I'm not certain which strength I've already built belongs at the center."

### 19.5 Fixture ET-SL02 — squad leadership without granting command status (full six)

**Q1:** `ET-SL02`, future interest in group positioning. **Hypothetical current keys:** `formation`, `tacticalAwareness`, `allySupport`, `moraleBonus`.

- A / `formation`: "I've invested in working from a sound position. I want that discipline to help people operate together instead of getting in one another's way."
- B / `tacticalAwareness`: "I've learned to watch the whole fight, not just what's directly in front of me. I want that judgment to guide how I support a group."
- C / `allySupport`: "I've been developing ways to improve other people's chances. I want coordinated action to grow from that habit."
- D / `moraleBonus`: "I've chosen ways to steady the people beside me. I want that kind of support to matter even when the situation stops going to plan."
- E / alternative: "I don't need to be the one giving orders to care about how a group works. I want to explore what I can contribute."
- F / neutral: "I've learned different ways to fight, but I'm not ready to choose which one matters most to a team."

**Eligibility and biography:** The published Squad Leader route may be aspirational, but no option confers authority over NPCs or assumes the character holds a rank or a defined squad. On-foot squad and ability prerequisites remain a separate mechanics gate.

### 19.6 Elite Trooper exception: unverified Teräs Käsi access

If an editorial or draft Q1 state selects `ET-TK01`–`ET-TK04`, the Q2 composer must not turn that into a mechanically supported "new Elite Trooper unarmed talent" relationship. Either resolve the exact printed legal class grant first or show non-specific, truthful current-strength synthesis without citing the uncertain Elite Trooper specialization. A logged `QUARANTINE_Q1_ROUTE` diagnostic must not become a negative player preference. Do not silently repoint it at Martial Arts Master.

## 20. Medic — Kyber, medical expertise as an earned discipline

### 20.1 All 22 Q1 routes — complete group map

| Draft Q1 IDs | Count | Direction selected in Q1 | Potential *observed* keys, never default grants | Boundary |
|---|---:|---|---|---|
| `SV01`–`SV04` | 4 | Survival, mobility and access to injured people | `survivalism`, `evasion`, `initiative`, `tacticalAwareness` | An interest in reaching patients is not a past patient rescue. |
| `AM01`–`AM08` | 8 | Natural substitutes, first aid, resuscitation, team care and medical checks | `treatingInjury`, `medicalKnowledge`, `healingMastery`, `tacticalSupport` | Trained Treat Injury as entry prerequisite does not prove every special procedure was performed. |
| `CF01`–`CF07` | 7 | Specific future Medical Secret enhancements | `surgicalMastery`, `treatmentExpertise`, `resourceControl`, `medicalKnowledge` | First Secret choice is at **Medic level 2**; no level-1 Secret is implied. |
| `ID01` | 1 | Reach and preserve patients beyond established facilities | `survivalism`, `resourcefulness`, `healingMastery` | No invented location, clinic, patient or previous rescue. |
| `ID02` | 1 | Medic as a possible fulfilled lifelong vocation | Any credible recorded medical/field strength | No forced higher title or automatic alteration of older goal. |
| `NEUTRAL` | 1 | No specialty determined | Established strengths without inferred specialty | Zero Q1 focus evidence; no defaulted direction. |

**Route map audit:** 4+8+7+1+1+1 = **22** distinct Q1 IDs. Preserve **Bring Them Back** (Advanced Medicine; extended revivification window) versus **Improved Revivify** (later Medical Secret; different action economy) as separate future capabilities rather than merging names or mechanics.

### 20.2 Kyber fixed Q2 Mentor introduction (new editorial draft)

> "You don't reach this kind of training without learning a few useful things first. Some of them have nothing to do with a medkit. That's fine. When the situation gets ugly, you use what you've got. Which part of your experience do you want to keep relying on?"

**Shared Q2 prompt:** "Which strength you've already developed do you want to bring into your work as a Medic?"

**Voice and role guardrail:** pragmatic, dry, compassionate without assuming that this player's character shares Kyber's pacifism. A Medic can work for many kinds of organizations or pursue non-altruistic motives. Don't claim the actor has saved a life, treated particular people, or been a surgeon merely because they met entry requirements.

### 20.3 Fixture AM03 — emergency first aid without claiming prior miracles (full six)

**Q1:** `AM03`, wants faster first aid under pressure. **Hypothetical observed:** `treatingInjury`, `reactionDefense`, `tacticalAwareness`, `allySupport`.

- A / `treatingInjury`: "I've invested in the skills needed to treat injuries. I want that training to remain the foundation of how I help when every moment counts."
- B / `reactionDefense`: "I've worked on staying responsive when danger arrives suddenly. I want that readiness to help me keep my judgment when a patient needs attention."
- C / `tacticalAwareness`: "I've trained to see how a dangerous situation is developing. I want that awareness to guide when and where I can safely provide treatment."
- D / `allySupport`: "I've built capabilities around helping others function effectively. I want practical care to become an extension of that same strength."
- E / alternative: "I've spent much of my training preparing for trouble. I want to learn to define success by what I can preserve afterward."
- F / neutral: "I know what I'm interested in learning, but I haven't decided which of my existing strengths will matter most in medical work."

**No duplicate teaching:** Q1 = future Battlefield Medic improvement, Q2 = existing treatment/reactions/awareness/support the player chooses to carry forward. No claim to own Battlefield Medic, have treated casualties, or have performed a rescue.

### 20.4 Fixture CF04 — future Medical Secret, already developed technical judgment (full six)

**Q1:** `CF04`, Improved Perform Surgery interest. **Hypothetical observed:** `surgicalMastery`, `medicalKnowledge`, `resourceControl`, `skillUtility`. Only use the surgical-specific assertion if an actually acquired feature grounds `surgicalMastery`; mere entry qualification does not mean the character has performed advanced surgery.

- A / `surgicalMastery`: "I've chosen to refine precise surgical work. I want that care and accuracy to remain central as my medical training advances."
- B / `medicalKnowledge`: "I've invested in understanding why a treatment works. I want that knowledge to guide decisions as procedures become more demanding."
- C / `resourceControl`: "I've developed a habit of planning around limited resources. I want the same discipline to shape how I prepare for difficult treatment."
- D / `skillUtility`: "I've learned to bring several different skills to a problem. I want that flexibility when a medical challenge refuses to fit a familiar procedure."
- E / alternative: "I'm interested in moving beyond what I already know. I want to discover whether a different kind of medical responsibility fits me better."
- F / neutral: "I'm interested in this part of medicine, but I haven't chosen which earlier strength should lead me there."

**Cadence warning:** `CF04` is a possible future choice at an appropriate even Medic level; this is not a free Medic-level-1 selection.

### 20.5 Fixture ID02 — fulfilled medical vocation without a future-class assumption (full six)

**Q1:** `ID02`, profession as an achieved career. **Hypothetical observed:** `healingMastery`, `treatingInjury`, `medicalKnowledge`, `survivalism`. Each requires source-backed current evidence.

- A / `healingMastery`: "I've developed my ability to restore others. I want that work to remain the measure of my craft, not another title."
- B / `treatingInjury`: "I've concentrated on practical treatment skills. I want the methods I've learned to be worth relying on for the rest of my career."
- C / `medicalKnowledge`: "I've invested in understanding the body and its limits. I want the knowledge behind the work to matter as much as the work itself."
- D / `survivalism`: "I've trained to endure difficult environments. I want that preparation to remain useful wherever I choose to practice medicine."
- E / alternative: "I've reached the vocation I wanted. I still want room to discover a different kind of responsibility within it."
- F / neutral: "Medicine can be enough of a career for me. I haven't decided which strength should define my work."

**Do not infer actual charitable motive or rewrite previous L1 ambition** from the Q1 capstone statement; any declared-goal revision requires separate affirmative action.

### 20.6 Medic sparse-data negative example

If the actor's only well-grounded current strength is trained Treat Injury (`treatingInjury`) and there are no three other distinct observed keys, offer an evidence-backed A plus E and F. Do not invent a surgery history, treatment outcomes, battlefield service, or previously earned Medical Secrets. Verify that the scorer itself considers a single skill training a *strength* rather than only an entry prerequisite; if not, even A should be phrased more modestly ("My training includes treating injuries...").

## 21. Sith Lord — Darth Miedo, apex synthesis without invented subordination

### 21.1 All 89 Q1 routes — full group map

| Q1 IDs | Count | Future aspiration | Existing-strength keys for editorial matching, only if genuinely observed | Hard mechanical / identity gate |
|---|---:|---|---|---|
| `SL-SI01`–`SL-SI12` | 12 | Sith talent directions | `darkSideAffinity`, `forceDC`, `forceRecovery`, `formMastery` | `SL-SI12` Stolen Form is **QUARANTINE**. Same-name Sith Alchemy collision: do not join by text. |
| `SL-FS01`–`SL-FS15` | 15 | Force Secrets, which are **future** level 2–5 choices | `forceDC`, `forceRecovery`, `knowledgeMastery`, `tacticalAwareness` | `SL-FS12` Pure Power **QUARANTINE**, `SL-FS15` Mentor conditional on prior apprentice training history. |
| `SL-AL01`–`SL-AL15` | 15 | Alter / deception / telekinesis / influence | `deceptionMastery`, `socialManipulation`, `tacticalAwareness`, `forceDC` | Class-independent eligible Force-tree access in print is missing from repo; never claim current selectable access without reconciliation. |
| `SL-CT01`–`SL-CT12` | 12 | Control / resilience / recovered powers | `forceRecovery`, `damageReduction`, `reactionDefense`, `combatStamina` | Verify actual Force talent prereqs and source ID, not just class title. |
| `SL-SE01`–`SL-SE12` | 12 | Sense / perception / foresight | `tacticalAwareness`, `knowledgeMastery`, `initiative`, `forceRecovery` | No unlimited precognition or claimed past visions. |
| `SL-DS01`–`SL-DS10` | 10 | Dark Side talent directions | `darkSideAffinity`, `forceDC`, `burstDamage`, `conditionTrack` | Dark Side Score and Force costs remain controlled by the chosen campaign rule. |
| `SL-GS01`–`SL-GS05` | 5 | Guardian Spirit directions | `knowledgeMastery`, `forceBond`, `forceRecovery`, `tacticalAwareness` | No guardian spirit granted or established relationship invented. |
| `SL-TR01`–`SL-TR03` | 3 | Limited, tradition-qualified Force training | Legitimate documented prior tradition and supporting build strength | **CONDITIONAL**; require genuine affiliation/training, not just player curiosity. |
| `SL-CF01`–`SL-CF02` | 2 | Fearless / Temptation class-feature interests | `reactionDefense`, `intimidation`, `socialManipulation`, `tacticalAwareness` | These are class level 1 features only after finalization; no prior use asserted. |
| `SL-ID01`–`SL-ID02` | 2 | Lasting authority / Sith Lord as the achieved ambition | Evidence-backed current strengths of any domain | No compulsory empire, subordinates, apprentice, or future title. |
| `SL-ID03` | 1 | Undecided future specialty | Diverse verified current strengths, no invented Q1 focus | Zero chosen specialization evidence. |

**Route map arithmetic:** 12+15+15+12+12+10+5+3+2+2+1 = **89** unique original Q1 IDs. From the pinned source: 2 quarantined candidate answers and 3 conditional tradition responses (plus specific other prerequisites). This is **source/Q1 inventory**, not legal character-option coverage.

### 21.2 Darth Miedo fixed Q2 Mentor introduction (new editorial draft)

> "You have assembled the means to reach this station. That is evidence of power, not proof of purpose. Consider what you already command within yourself. Which strength will you make the foundation of your authority?"

**Shared Q2 prompt:** "Which part of your established training do you want to define your power as a Sith Lord?"

**Voice gate:** quiet, measured, absolute, calculating, no boastful shouting. The source character follows the Rule of Two, but the player's Sith Lord is not automatically Miedo's apprentice or subject, and the campaign is not assumed to be a Rule of Two era. Do not assume an established empire, own apprentice, office, entourage, military command, or former Sith Master relationship.

### 21.3 Fixture SL-AL07 — illusion interest from existing manipulative/strategic strength (full six)

**Q1:** `SL-AL07`, interest in future illusions (general Alter tree). **Hypothetical observed:** `deceptionMastery`, `socialManipulation`, `tacticalAwareness`, `forceDC`. The class pack currently does not list general Alter access, so this fixture is **EDITORIAL ONLY / BLOCKED FOR MECHANICS-DRIVEN PRODUCTION** until the printed tree grant, class authority, and prerequisites reconcile.

- A / `deceptionMastery`: "I've cultivated ways to make others believe what suits my purpose. I want that understanding of belief to remain central to my command of the Force."
- B / `socialManipulation`: "I've developed ways to influence decisions without direct force. I want that discipline to guide the power I use to shape appearances."
- C / `tacticalAwareness`: "I've learned to consider what an opponent expects to see. I want that judgment to matter as much as the illusion itself."
- D / `forceDC`: "I've focused on making my Force abilities more difficult to resist. I want that precision to support more controlled forms of influence."
- E / alternative: "I have relied on visible power. I want to learn whether subtlety could become the more enduring form of control."
- F / neutral: "I can see several ways to apply what I've learned. I have not decided which one should define my power."

**No illicit assumption:** A class-entry requirement such as trained Use the Force is not independently proof that the character already knows the Illusion power or has any particular victim, follower, or political influence.

### 21.4 Fixture SL-FS14 — holocron legacy aspiration with future feature timing (full six)

**Q1:** `SL-FS14`, desire to preserve Force knowledge; this is a **future Force Secret** possibility, not a current first-level grant. **Hypothetical observed:** `knowledgeMastery`, `informationControl`, `forceRecovery`, `itemEnchantment` (the latter requires exact current feature evidence).

- A / `knowledgeMastery`: "I've invested in gathering and understanding difficult knowledge. I want that discipline to shape what I preserve of my power."
- B / `informationControl`: "I've learned that knowing what others do not can change an outcome. I want to make the control of knowledge a lasting part of my influence."
- C / `forceRecovery`: "I've trained to preserve my connection to the Force through demanding use. I want that patience and endurance reflected in the knowledge I leave behind."
- D / `itemEnchantment`: "I've developed techniques for investing power in objects. I want that craft to support the knowledge I intend to preserve."
- E / alternative: "My earlier training was aimed at immediate results. I want to discover what it would mean to build something that remains useful after me."
- F / neutral: "I can pursue lasting knowledge in more than one way. I have not chosen which of my existing strengths should guide it."

**Hard stop:** Q2 does not create or give a holocron, authorize `Holocron Loremaster`, establish the actor possesses any Force Secret, or imply a specific apprentice. Exact special prerequisites remain in V2 progression.

### 21.5 Fixture SL-ID02 — Sith Lord as the character's destination (full six)

**Q1:** `SL-ID02`, player views attaining Sith Lord as the achievement. **Hypothetical observed:** `forceDC`, `commandAuthority`, `formMastery`, `knowledgeMastery`.

- A / `forceDC`: "I've invested in making my powers reliable against resistance. I want that mastery to remain the measure of what I have achieved."
- B / `commandAuthority`: "I've developed the judgment to direct others when a decision is needed. I want that certainty to define my authority, not another station above it."
- C / `formMastery`: "I've spent time refining my martial discipline. I want the strength of that training to remain part of who I am at this rank."
- D / `knowledgeMastery`: "I've sought knowledge others overlook. I want understanding, not another title, to mark the extent of my achievement."
- E / alternative: "I reached the title I sought. I want to discover what kind of legacy I can build within it."
- F / neutral: "The station is an achievement in itself. I have not decided which part of my earlier training should best express it."

**No forced succession:** This does not require future Sith advancement, ordering another NPC, betraying a mentor, building an empire, or replacing an old explicit career goal. If an older goal conflicts with `SL-ID02`, Q5 or a separate explicit revision conversation must resolve it; Q2 itself cannot erase it.

### 21.6 Restricted Sith routes: fail-closed rules

- `SL-SI12` (Stolen Form) and `SL-FS12` (Pure Power) remain **QUARANTINE** in the pinned design. Do not offer legal-rules-dependent Q2 responses based on those promised class options; preserve the Q1 authored text for audit and flag conflict rather than fabricate certainty.
- `SL-TR01`–`SL-TR03` are **CONDITIONAL** on documented Force tradition membership/training and exact individual prerequisites. A Q1 *interest* does not create such membership.
- Sith Lord entry is Core **DSS = Wisdom** versus a repository **DSS ≥ 1 house rule**. This project has not chosen between them in this design pass. Do not secretly enforce one in survey authoring; the existing V2 legal authority/campaign rule selection controls legality once reconciled.
- The printed Sith Lord class can access **eligible general Force talent trees** in addition to Sith. Current repo only lists the Sith tree. Repair the class/tree authority first; Q2 must not compensate by granting talents or telling the player they possess them.
- Guard the separate identities of Sith-tree *Sith Alchemy* and other same-name Sith Alchemy titles. For all classes, join source/tree/record IDs, not display names.

## 22. Existing Suggestion Engine — deeper read-only implementation audit

### 22.1 What the code actually exposes (read-only inspection)

| Source | Existing operation | Verified limitation for Q2 |
|---|---|---|
| `scripts/engine/prestige/identity-engine.js` | `computeTotalBias(actor, options)` builds one `mechanicalBias/roleBias/attributeBias` result from **nine** component layers. | Includes `computeSurveyBias`, inferred archetype and specialist contributions, reinforcement, prestige and class chassis. The total's top four keys are **not** automatically four actor-owned competencies. |
| Same file | `computeObservedBehaviorBias(actor)` processes `actor.items[*].system.rules` primitives, ability scores, trained skills, and Skill Focus. | This is a **useful source-limited existing calculation**, but returns an aggregate bias map without a per-key proof list. It requires initialized primitive registries. Current code processes rules on actor items broadly, so verify activation and owned/finalized status for each source. |
| Same file | `computeClassChassisBias(actor)`, `computeEquipmentAffinityBias(actor, options)`. | Can supply independent structural/equipment evidence when already calculated; neither should be confused with player intent or original self-reported goals. |
| `scripts/engine/suggestion/BuildIntent.js` | `analyze(actor, pendingData)` generates themes/signals and applies mentor survey biases. | `_buildActorState` merges **pending feat/talent/skill selections** into the sets it calls `owned`. No clean observed-only ranked 125-key API exposed by this method alone. |
| `scripts/engine/suggestion/tag-signal-engine.js` | `buildTagBiasMap(buildIntent, identityBias, options)` projects identity/mentor/archetype/themes/equipment/route evidence into candidate tags. | This is candidate tag alignment; it is **not** a 125-key actor-observed-strength accessor. Do not silently join a tag to the 625 mechanical-bias dialogue bank. |
| `scripts/engine/suggestion/SuggestionEngineCoordinator.js` | `game.swse.suggestions.analyzeBuildIntent(actor,pendingData)` and suggestion-domain APIs. | No verified public `getTopObservedMechanicalBiases` accessor. New work should expose a **read-only projection of the existing calculation**, not duplicate or change weights. |

The precise dependency is more nuanced than "the Suggestion Engine already knows the top four": the underlying calculated layers **exist**, but the required **observed-only, mechanically attributable and correctly keyed** ranking interface is not yet available as a verified public API.

### 22.2 Proposed future read-only projection (contract, NOT code implemented)

Input: frozen pre-advancement `actorSnapshot`, verified finalized item identities, selected Q1 `responseId`, source policy (allow owned primitives, trained skills, finalized class chassis, legitimate equipped gear; **exclude** survey, intended/aspirational goals, candidate-only recommendations, prospective prestige grant, uncommitted pending selections).

Output candidate fields:

| Field | Interpretation |
|---|---|
| `mechanicalBiasKey` | **Existing** key from the 125-key registry; do not invent a new label or map from 190 tags without an explicitly reviewed authority. |
| `existingRankValue` | Reuse an **existing** scoring layer's value; never apply bespoke Q2 weights. It is an ordinal ranking indicator, not probability of personality. |
| `contributionDomains` | Which existing authorized layer(s) actually contributed: owned primitive, trained skill, finalized class feature/chassis, legitimate gear, etc. |
| `evidenceIds` | Stable owned item/skill/feature identities; sufficient for each strong assertion in the selected response. Source names and IDs must be checked against the actor snapshot, not guessed from the bias key. |
| `snapshotRef` | Frozen actor revision / finalized-prestige state to make deterministic regeneration and cancellation possible. |
| `confidenceCaveat` | Access-only, class-chassis-only, provisional mapping, or contradictory evidence; can force weaker prose or omit a candidate. |

**Ranking selection:** existing engine rank first, then filter out irrelevant, unsupported, or synonymous answers; do not re-score. A tag's **presence** is not proof that its example sentence's specific prior experience occurred. A trained skill is evidence of training, not an actual past mission. If the engine cannot isolate a key's observed contribution from its survey component, use only truthful actor-attested strengths or show E/F until that view exists.

**Minimal future wiring recommendation:** instrument the present authorized calculation boundaries to expose intermediate contributions and provenance while preserving production scoring, rather than querying `computeTotalBias` and subtracting old survey scores heuristically. Source-layer bookkeeping must avoid repeated counting of one item via primitives, its class chassis, and a derived theme. This remains a design requirement requiring separate implementation approval, tests and Foundry v13 execution.

### 22.3 Targeted technical failure tests for implementation

| Test | Setup | Required pass condition |
|---|---|---|
| `Q2-ENG-01` | Actor with strong old L1/MC survey preference but no matching owned ability | No A–D response asserts that preference as past training. |
| `Q2-ENG-02` | Pending feat/talent in level-up, absent from finalized actor | Q2 never narrates it as already acquired. |
| `Q2-ENG-03` | Single trained prerequisite skill plus class chassis only | Do not fill four slots with false specializations. |
| `Q2-ENG-04` | One item contributes to three synonymous mechanical keys | Avoid three near-identical A–D responses or triple independent endorsement. |
| `Q2-ENG-05` | Changing Q1 from an offense to protection interest | Recompute Q2 wording; preserve current fact evidence; invalidate incompatible prior Q2 selection. |
| `Q2-ENG-06` | Change Q1 to neutral | No invented specialty phrase; neutral Q2 remains neutral. |
| `Q2-ENG-07` | Invalid/quarantined Elite/Sith talent route | Do not turn source-invalid Q1 content into legal advice or mechanics-grant wording. |
| `Q2-ENG-08` | Sith general Force-tree option missing in `packs/classes.db` | No silent fallback to Sith Apprentice tree or acceptance based on display-name similarity. |
| `Q2-ENG-09` | Mentors not proven acquainted with player | Dialogue introduces correct fixed Mentor without invented personal relationship. |
| `Q2-ENG-10` | Q2 displayed but declined, changed, or canceled | No durable survey evidence until completed and no negative inference from unselected alternatives. |

**Execution status:** tests above are *written acceptance scenarios*, **not run**. The current environment does not include a validated Foundry v13 actor runtime or actor snapshot for execution. The code review does not certify deployed behavior.

## 23. Cross-class editorial QA and expansion rule

### 23.1 New conditional fixture inventory

- Elite Trooper: **3** six-response A–F prototypes: Protection, Camouflage, Squad Leader; plus quarantined Teräs Käsi fail-closed design.
- Medic: **3** six-response prototypes: emergency care, later Medical Secret, and career-capstone fulfillment; plus sparse-signal fallback.
- Sith Lord: **3** six-response prototypes: Alter/illusion, future Force Secret, and apex fulfillment; plus restricted-source fail-closed handling.
- New complete prototypes: **9** (54 authored first-person candidate responses), in addition to the v0.2 preserved fixtures. They are **hypothetical editorial tests**, not automatically displayable alternatives for arbitrary actors.

### 23.2 What the six-class stress test establishes

1. **Broad Q1 and Q2 separation:** class-specific future ability aspiration (Q1) versus which earlier demonstrable ability the player now chooses to carry forward (Q2).
2. **Distinct prestige structures:** a 10-level combat class with multiple tree access quirks; a clinical/support class with even-level optional features; and a five-level Force apex with conditional legal trees and campaign rule conflict.
3. **Capstone validity:** Ace Pilot, Jedi Knight, Independent Droid, Medic and Sith Lord examples do not require a subsequent title. Elite Trooper's fulfillment route is mapped as well.
4. **Mentor fidelity:** Breach's practical warmth, Kyber's dry clinical pragmatism, and Miedo's quiet certainty differ substantially; exact lines remain drafts.
5. **No invisible rules repair:** a survey cannot fix Elite Trooper Teräs Käsi source access, Sith Lord general Force-tree omissions, Sith dark-side RAW/house-rule conflict, or Medic future Secret timing.
6. **No double counting:** previous Q1 and older survey preferences inform Q2 option *composition* only, not observed proof. Q2 becomes a new declaration only if selected and the survey successfully completes.

### 23.3 New targeted editorial negative tests

| Test | Invalid result ruled out by drafted responses | Status |
|---|---|---|
| `Q2-N15` | Elite Trooper automatically has DR 1 or has already used Delay Damage before finalization | PASS in authored prototypes; runtime UNTESTED |
| `Q2-N16` | Elite Trooper automatically belonged to a Republic/Mandalorian unit | PASS editorial; runtime UNTESTED |
| `Q2-N17` | `ET-TK` unverified tree treated as certified grant | BLOCKED explicitly; source issue unresolved |
| `Q2-N18` | Medic gets Medical Secret at level 1, or `CF04` indicates actual surgery performed | PASS editorial; runtime UNTESTED |
| `Q2-N19` | Kyber assumes the character personally saved patients or shares her pacifism | PASS editorial; runtime UNTESTED |
| `Q2-N20` | Sith Lord is Miedo's apprentice or operates in the Rule-of-Two era | PASS editorial; runtime UNTESTED |
| `Q2-N21` | General Alter/Control/Sense future direction equated with current tree availability in class pack | BLOCKED pending V2 authority reconciliation |
| `Q2-N22` | Sith Lord level 1 has Force Secret, or `SL-FS14` implies a holocron already owned | PASS editorial; runtime UNTESTED |
| `Q2-N23` | `SL-FS12` or `SL-SI12` made enabled by Q2 | BLOCKED pending source qualification |
| `Q2-N24` | Sith Lord chosen capstone automatically cancels an old explicit career destination | PASS editorial; persistence UNTESTED |

## 24. Work remaining and release boundary (v0.3)

**Structural Q1 coverage assessed:** **327 source response IDs across 6 prestige classes**, of the repository's 32 prestige classes. **Q2 rendered option coverage: illustrative fixtures only; not all 327 Q1-by-actor combinations.** We have not created a working six-question prestige runtime or certified the 190-tag ontology-to-125-key relationship.

**Suggested next design tranche:** Audit **Bounty Hunter**, **Officer**, **Jedi Master** and **Force Disciple** before bulk expansion. This tests target tracking, command/organizational authority, and other five-level apex structures while reusing the same 125 observed-strength stems. It is more informative than filling another 26 class templates blindly.

**Hard blockers before implementation:** (1) observed-only ranked 125-key accessor with evidence IDs; (2) mixed observed/inferred source separation; (3) source corrections for quarantined/conditional Q1 and class-tree access; (4) actor-level cross-class test fixtures; (5) approval of new Q2 purpose, fixed Mentor lines, answer-count/fallback policy and stable history semantics. Q1 remains untouched; Q3–Q6 remain untouched.

**Publication policy:** no GitHub commits, pushes, class/talent pack edits, runtime changes, actor writes, or automatic legal-option grants in this pass. An owner-approved implementation and source-certification phase must follow separately.


---

## 25. P5 continuation — Bounty Hunter, Officer, Jedi Master and Force Disciple (v0.4; 2026-11-14/15)

**Status: WORKING EDITORIAL DESIGN, NOT OWNER-APPROVED FOR PRODUCTION.** This addendum extends the preserved v0.3 document without modifying earlier answers, authorizing a GitHub write, changing a Foundry actor, or changing an approved Q1 candidate. It tests whether the owner-endorsed **Q2 Character Synthesis** contract works across professional pursuit, organizational command, Jedi mastery and independent Force mastery.

### 25.1 Source baseline and verified inventory

Read-only inspected the pinned `docs/design/SWSE_Prestige_Survey_Rolling_Design.md` at `0f56de3a4d33c8a5c635d47e3c612e501797a0a4`: Bounty Hunter §13; Force Disciple §17; Jedi Master §20; Officer §21; final Q1/Q2 boundary §39. The current GitHub `packs/classes.db` and dedicated Mentor dialogue JSON files were also consulted. The 125-key mechanical-bias registry and existing multiclass response stems remain the reuse sources inherited from v0.3.

| Prestige class | Mentor | Existing Q1 IDs | Q1 source bank | Distinctive technical condition |
|---|---|---:|---|---|
| Bounty Hunter | Kex Varon | **43** | Awareness 6; Bounty Hunter 18; Misfortune 6; Gand Findsman 4; Force Hunter 6; identity/neutral 3 | Familiar Foe starts at prestige level 2; culturally gated Findsman and source-conditional Force Hunter paths. |
| Officer | Admiral Korr | **62** | Commando 14; Leadership 11; Military Tactics 16; Naval Officer 5; Fugitive Commander 6; Rebel Recruiter 5; features 2; identity/neutral 3 | Share Talent is even-level and restricted to an *already acquired* talent from specified trees; no automatic command or fleet. |
| Jedi Master | Miraj | **77** | Force Secrets 15; Duelist 11; Alter 10; Control 9; Sense 10; Light 4; Dark 5; Guardian Spirit 5; traditions 3; features 2; identity/neutral 3 | Five-level apex; Fearless and Serenity at level 1; Force Secrets only at levels 2–5; repository Duelist-only tree record is incomplete. |
| Force Disciple | Riquis | **52** | Force Secrets 15; Force Adept 6; Alter 5; Control 4; Sense 5; Dark 3; Light 3; Guardian Spirit 3; traditions 3; features 2; identity/neutral 3 | Five-level apex; Indomitable and Prophet at level 1; Force Secrets only at levels 2–5; repository Force-Adept-only tree record is incomplete. |
| **New total** | | **234** | | Counts refer to authored Q1 candidates, not individually certified legal choices or 234 ready-to-display Q2 answers. |

**Cumulative structural coverage:** prior six-class Q1 inventory **327** + this tranche **234** = **561 authored Q1 routes inventoried over 10/32 prestige classes**. The larger coverage figure is a source-index/translation audit, **not** 561 independently tested actor builds or a completed class-specific Q2 dialogue bank.

### 25.2 Reuse decisions applied consistently

1. Begin with the actual selected Q1 response ID and its intended advanced *future* focus. Do **not** teach the talent tree over again in Q2.
2. Read only **finalized, actor-supported** prior build evidence for A–D. The engine's overall identity bias includes survey and archetype contributions; it is not proof of specific owned training. Use the inherited v0.3 observed-source projection contract, not a new scoring formula.
3. Prefer four distinct supported prior strengths when they genuinely exist; show fewer when the evidence is thin. Each complete illustrative fixture below deliberately assumes a hypothetical actor with four verified, distinct strengths. Those assumptions are **not universal class requirements**.
4. E provides an alternative relationship between prior development and Q1, without automatically replacing a declared career. F is neutral and contributes no positive/negative specialization evidence.
5. A–F are player-first-person answers. Mentor introduction remains a fixed, pre-authored class-specific voice line; runtime narrative substitutions must never fabricate accomplishments, organizations, personal meetings, affiliations or owned mechanics.
6. Capstone/fulfilled Q1 selections describe an achieved profession, not an undeclared future class. A previously stated goal remains a separate historical declaration until the player explicitly revises it.
7. Maintain the exact canonical **125 mechanical-bias keys** as the only proposed lookup vocabulary. The separate **190-tag ontology** is not interchangeable. An observed-strength line requires actor evidence plus a reviewed mechanical-key/source relationship; a shared 125-stem is *editorial inspiration*, not automatically display-safe text.

### 25.3 Audit boundary of this tranche

All Q1 IDs below are accounted for by existing published editorial banks and mapped to an intended **Q2 synthesis family**. For the four classes, this document writes **twelve full six-response conditional fixtures** (72 first-person answers), not an independently authored A–D text set for each Q1 × every mechanically possible character. The remaining source IDs are handled by the explicit, class-specific route map, existing response-stem adaptation, and documented exceptions. A future implementation requires generated candidate QA on actual frozen actor snapshots.

## 26. Bounty Hunter — Kex Varon: the habits behind a professional pursuit

### 26.1 Complete Q1 ID-to-Q2 route inventory (43)

| Existing Q1 family (exact ID coverage) | Count | Q2 synthesis question | Required separation / restrictions |
|---|---:|---|---|
| Awareness `AW01–AW06` | 6 | Which already developed perception, field survival, speed of reaction, or careful attack skill should guide the way you find and confront a target? | Existing Survival training does not prove an actual completed hunt; a Q1 aspiration to improve initiative does not imply the relevant talent is owned. |
| Bounty Hunter `BH01–BH18` | 18 | Which real investigative, negotiation, aiming, equipment, deception, or threat-assessment strength should define the method of your work? | Do not invent bounties collected, targets captured, guild reputation, credits earned, signed contracts or already-owned `Familiar Foe`. |
| Misfortune `MF01–MF06` | 6 | Which previously demonstrated ambush, mobility, disruption or tactical strength should inform how you approach an encounter? | Do not equate the class label with assassinations or license to kill; all talent prerequisites remain individual. |
| Gand Findsman `GF01–GF04` | 4 | If actually eligible, which established awareness, ritual training or Force-related practice would the character bring to a Findsman aspiration? | A Q1 expressed interest cannot establish Gand species, tradition membership, Force Sensitivity, actual ceremonies or already received visions. Conditional source/character gating required. |
| Force Hunter `FH01–FH06` | 6 | Which previously acquired resilience, timing, investigative knowledge or defensive practice would underpin an interest in hunting Force-sensitive threats? | Not automatically a Jedi hunter, immune to the Force or a character who has previously fought a Jedi. |
| `BH-Q1-ID01`, `BH-Q1-ID02`, `BH-Q1-NEUTRAL` | 3 | Live capture / professional capstone / open direction: which prior practical strength, if any, does the player want to retain? | ID01 is a desired method, ID02 is career fulfillment, NEUTRAL carries no directional Q1 focus. |
| **Complete** | **43** | | |

**Priority future conditional cases:** `BH15`/`BH16` point to later Familiar Foe prerequisites, so Q2 must not speak of an owned class feature at first Bounty Hunter entry. `BH13` has a trained Use Computer prerequisite; `BH17` needs separate equipment and Quick Draw prerequisites; Q2 does not assert either just because it reads a Q1 interest. `GF01–GF04` must not be presented as evidence of membership or direct tradition access. The current Q1 source inventory withheld the unverified `Temporal Awareness` name; Q2 must not resurrect it through a bias-key alias.

### 26.2 Kex Varon — fixed Q2 Mentor introduction (DRAFT)

> "The title tells me you've met the standard. Your preparation tells me how you intend to work. Consider what your training already proves. Which strength will you rely on when the hunt turns difficult?"

**Question:** "Which part of your established training do you want to carry into the Bounty Hunter you're becoming?"

Voice: calm, methodical, controlled, no theatrical boasting and no assumed old bounties, contracts or personal Kex relationship. Actor-specific present-tense assertions stay in evidence-gated **player answers**, never this fixed intro.

### 26.3 Fixture BH12 — investigation without a fabricated capture (six answers)

**Hypothetical verified actor facts:** trained Survival, trained Gather Information where the actor skill schema/source supports it, one separately evidenced technical/information skill, and a demonstrated tactical or perception mechanic. These are illustrative; the actual four scored mechanical-bias keys may differ. **Q1 `BH12`** asks about surveillance, interviews and research to locate missing people. Do not infer that any missing person has been found.

A. **`trackingMastery`** — "I've trained to follow evidence through difficult ground. I want that persistence to carry over when the trail leads through people and records instead."

B. **`informationControl`** — "I've developed ways to gather and compare information. I want careful research, not a lucky tip, to be the foundation of my work."

C. **`hackingSkills`** — "I've learned to work through secured computer records. I want that knowledge to support a hunt when a physical trail disappears."

D. **`tacticalAwareness`** — "I've learned to weigh a situation before moving into it. I want that judgment to keep an investigation from becoming an unnecessary confrontation."

E. **Alternative** — "I have useful skills, but I want the patience to understand people to become more important than the techniques I already rely on."

F. **Neutral** — "I'm not sure which of my skills should define how I investigate. I want to find that out before choosing."

**Specificity check:** A requires owned tracking evidence; B needs actual information-gathering evidence; C requires actual computer-related training, **not** just Q1's research interest; D requires an evidenced situational-awareness route. None claims a solved case or completed capture.

### 26.4 Fixture FH05 — resist mental manipulation without invented Force immunity (six answers)

**Hypothetical verified actor facts:** an actually recorded resilience/defense investment, current trained Perception or equivalent relevant signal, tactical preparation, and knowledge-related training. **Q1 `FH05`** seeks greater resolve against Force-user mental manipulation, not automatic immunity.

A. **`reactionDefense`** — "I've strengthened the way I respond when a threat comes without warning. I want the same readiness when the danger is an attack on my judgment."

B. **`tacticalAwareness`** — "I've learned to study a situation before committing to it. I want preparation to matter when an enemy can influence what I think I see."

C. **`knowledgeMastery`** — "I've invested in understanding unfamiliar threats. I want to approach Force-sensitive adversaries with knowledge rather than superstition."

D. **`survivalism`** — "I've built habits that keep me functioning under pressure. I want that endurance to help me hold to my decisions when fear would make them easier to change."

E. **Alternative** — "My training has mostly prepared me for visible threats. I want to explore how to face dangers that aren't answered by a blaster or a better position."

F. **Neutral** — "I know what I want to resist. I haven't decided which of my previous strengths will help me do it."

**Guard:** Q1 does not establish that the actor has resisted a Force power, seen a Jedi, or acquired `Strong-Willed`; the A–D *present* roots must come from owned records.

### 26.5 Fixture BH-Q1-ID02 — a professional career can be the endpoint (six answers)

**Hypothetical verified actor facts:** investigation, careful targeting, negotiation, and technical preparation are evidenced independently. **Q1 `BH-Q1-ID02`** is profession-as-capstone, not a future talent-tree focus.

A. **`trackingMastery`** — "I've learned to stay with a trail when it gets difficult. I want that persistence to remain the foundation of my work as a hunter."

B. **`accuracy`** — "I've practiced making a deliberate shot count. I want that care to stay with me, whether a contract calls for confrontation or restraint."

C. **`persuasionMastery`** — "I've learned that words can resolve problems before weapons do. I want negotiation to be part of the professional I become."

D. **`hackingSkills`** — "I've developed ways to recover information from systems others overlook. I want that skill to stay useful in the career I've chosen."

E. **Alternative** — "I've reached the profession I wanted, but I don't have to be defined by the methods that brought me here."

F. **Neutral** — "I know this is the work I want to pursue. I haven't chosen which of my existing strengths should define it."

**Goal isolation:** If an earlier explicitly declared destination differs, Q2 records interest in professional fulfillment but does not delete the earlier goal. Address deliberate revision separately.

## 27. Officer — Admiral Korr: command as a synthesis of earned competence

### 27.1 Complete Q1 ID-to-Q2 route inventory (62)

| Exact existing Q1 family | Count | Q2 synthesis relationship | Guard |
|---|---:|---|---|
| Commando `OF-CO01–OF-CO14` | 14 | Prior combat discipline, field observation, protection and operational preparation becoming useful to others. | Officer does not automatically gain a combat history or soldier-only feats; classify owned mechanisms precisely. |
| Leadership `OF-LE01–OF-LE11` | 11 | Actual support, coordination, interpersonal skill and protective habits becoming a chosen leadership style. | A title does not establish subordinates or prior battlefield commands. |
| Military Tactics `OF-MT01–OF-MT16` | 16 | Prior logistics, positioning, initiative and knowledge converted into unit-level decisions. | `OF-MT16` (`Turn the Tide` / missing `Command Decision` prerequisite) is **QUARANTINED** for the stated rules interpretation. |
| Naval Officer `OF-NO01–OF-NO05` | 5 | Prior piloting, vehicle gunnery, coordination, logistics or tactical knowledge informing *possible* fleet leadership. | Do not assert ship ownership, fleet command, `Born Leader`, required ability scores, or an existing naval rank. |
| Fugitive Commander `OF-FC01–OF-FC06` | 6 | Earlier stealth, surveillance, defensive solidarity and withdrawal planning used under pressure. | Do not assert the character was a fugitive, led a resistance cell or currently commands a unit. |
| Rebel Recruiter `OF-RR01–OF-RR05` | 5 | Prior diplomacy, persuasion, restraint and battlefield judgment informing a potential change-of-allegiance approach. | No default Rebel affiliation, conversion of a prior enemy, or automatically owned `Recruit Enemy`. |
| Class features `OF-CF01–OF-CF02` | 2 | Prior defense/coordination and acquired eligible talents as possible groundwork for later officer features. | **Command Cover and Share Talent begin at Officer 2**, not Officer 1. Share Talent's source trees are narrowly restricted. |
| Identity/capstone/neutral `OF-ID01–OF-ID03` | 3 | Prior judgment/discipline, settled vocation, or no declared direction. | No forced higher rank, organization, or presumed troop losses. |
| **Complete** | **62** | | |

### 27.2 Admiral Korr — fixed Q2 Mentor introduction (DRAFT)

> "Authority is only as useful as the judgment behind it. Your earlier training does not disappear when you take on this responsibility. Which of those strengths will determine how you lead?"

**Question:** "Which strength from your existing training should most influence the Officer you intend to become?"

Voice: restrained, sober, respectful of service without implying personal command accomplishments or prior military attachment to Korr. The actual class entry requires organizational membership; membership alone is **not** evidence of fleet ownership or operational command history.

### 27.3 Fixture OF-MT04 — formation and deployment, distinct from personal combat (six answers)

**Hypothetical evidenced actor:** trained Knowledge (tactics) and four distinct, separately supported strengths in combat observation, formation, defensive positioning and coordinated support. **Q1 `OF-MT04`** seeks unit deployment that exploits flanking while reducing exposure. Do not assert the character has commanded a unit.

A. **`tacticalAwareness`** — "I've learned to read a fight before choosing my next move. I want that judgment to improve the positions other people can take."

B. **`formation`** — "I've practiced staying aware of where allies are positioned. I want that sense of spacing to help a group act together."

C. **`reactionDefense`** — "I've invested in reacting when an attack comes suddenly. I want to plan positions that leave fewer people needing that last-second defense."

D. **`allySupport`** — "I've focused on helping others perform under pressure. I want that instinct to guide how I organize an operation."

E. **Alternative** — "My experience has mostly been about what I can do myself. I want to learn how to make the whole group more capable instead."

F. **Neutral** — "I understand the kind of deployment I want to learn. I haven't decided which of my earlier skills will guide me there."

### 27.4 Fixture OF-NO03 — future fleet coordination without a phantom flagship (six answers)

**Hypothetical evidenced actor:** verified vehicle-operation experience, separate tactical preparation, technical understanding and team coordination. **Q1 `OF-NO03`** is an interest in Fleet Deployment. It does not indicate current rank, ship, fleet, legal talent eligibility or prior mass battle.

A. **`pilotMastery`** — "I've developed confidence operating a vehicle under difficult conditions. I want that understanding of movement to inform how I coordinate several vessels."

B. **`tacticalAwareness`** — "I've learned to see how a fight changes with position and timing. I want that habit to guide larger movements rather than one course alone."

C. **`engineeringMastery`** — "I've learned how complicated systems depend on one another. I want that knowledge to shape decisions that involve several ships."

D. **`formation`** — "I've developed discipline about how allied positions fit together. I want that coordination to remain central if I ever direct a fleet."

E. **Alternative** — "My current strengths are useful, but I may need to become a different kind of thinker to direct more than one vessel."

F. **Neutral** — "I want to learn fleet coordination. I don't yet know which of my present strengths will matter most to it."

**Conditional tense:** E and F do not promise any fleet. A–D need item/skill proof for *present* clauses. The Q1 desire to command several ships does not satisfy Charisma, Talent, or LOS prerequisites.

### 27.5 Fixture OF-RR03 — turning a victory into an offer, not assumed political membership (six answers)

**Hypothetical evidenced actor:** actual persuasion training, battlefield precision, controlled response, and support-oriented mechanics. **Q1 `OF-RR03`** concerns a *possible* `Recruit Enemy` choice on qualified targets; does not prove Rebel affiliation or a previous conversion.

A. **`persuasionMastery`** — "I've worked to make my words matter under pressure. I want to know when an opponent might listen before another life is lost."

B. **`accuracy`** — "I've practiced precise attacks rather than relying only on volume of fire. I want that control to leave room for a different outcome."

C. **`tacticalAwareness`** — "I've learned to recognize when a situation changes. I want that judgment to tell me when an enemy might become an ally."

D. **`allySupport`** — "I've focused on helping people act together. I want to apply that strength to cooperation that didn't seem possible at first."

E. **Alternative** — "The tactics that brought me here don't answer every conflict. I want to explore persuasion as a way to change an encounter."

F. **Neutral** — "I'm interested in offering an opponent another choice. I haven't decided which of my existing abilities should support it."

**No forced morality or faction:** This Q1 branch describes a possible method. It does not assert that the player currently serves the Rebellion or has previously recruited anyone.

### 27.6 Officer source-identity exceptions

- `OF-MT16` must remain source-quarantined. If selected from an old design preview, Q2 may record the player's *conceptual* tactical interest without presenting `Turn the Tide` as legally obtainable. Source/permission verification is separate.
- `OF-FC04` and `OF-RR05` are different `Stay in the Fight` talents from different books/trees. Never join to the bare display name. Likewise, `Out of Harm's Way`, `Commanding Presence` and `Turn the Tide` contain cross-tree naming collisions.
- `OF-CF02` must not say the character already has `Share Talent`, or that Officer can share any talent. The ability starts at level 2 and shares only already-acquired talents from **Influence, Inspiration, Commando, or Military Tactics**, subject to printed use/recipient rules.
- `OF-CF01` does not grant entry-level Command Cover and never assumes a fixed squad size or adjacent ally.

## 28. Jedi Master — Miraj: earned judgment without fabricated Council standing

### 28.1 Complete Q1 ID-to-Q2 route inventory (77)

| Exact Q1 family | Count | Q2 integration emphasis | Required restriction |
|---|---:|---|---|
| Force Secrets `JM-FS01–JM-FS15` | 15 | Which owned Force use, disciplined control, knowledge, or support practice is meant to inform a later secret choice? | Force Secrets start at **Jedi Master 2**, not 1; a class or Q1 answer is not ownership. |
| Duelist `JM-DU01–JM-DU11` | 11 | Previously practiced lightsaber work, precision, protective reactions, and resolve carried into Mastery. | Do not assume a particular lightsaber form or prior subclass talent because a Jedi Master has class access. |
| Alter `JM-AL01–JM-AL10` | 10 | Existing Force application, telekinesis, diplomacy or tactical discipline carried into a new Force technique. | General eligible Force talent access is printed but missing from repo class trees. |
| Control `JM-CT01–JM-CT09` | 9 | Owned endurance, recovery, discipline and other already recorded Force choices. | Do not silently award Control talents or equate Fearless with broad mind-affecting immunity. |
| Sense `JM-SE01–JM-SE10` | 10 | Already demonstrated perception, scholarship, investigative or awareness practice carried into new perception abilities. | A desire for Psychometry does not mean the character has read an object's past. |
| Light Side `JM-LS01–JM-LS04` | 4 | Prior protection, healing, and self-restraint as a basis for future light-side development. | DSS 0 and exact prerequisites apply; Q1 cannot change alignment. |
| Dark Side `JM-DS01–JM-DS05` | 5 | Owned dark-side or morally fraught development, if independently evidenced; the choice is not Miraj's approval. | DSS 1+, Jedi Code/campaign implications; do not force dark-side speech into standard Miraj encouragement. |
| Guardian Spirit `JM-GS01–JM-GS05` | 5 | Existing reflection, wisdom and support as a basis for possible spirit-related talent aspirations. | No spirit exists or appeared until actually authorized/acquired. |
| Restricted traditions `JM-TR01–JM-TR03` | 3 | Actual documented tradition training informs a chosen synthesis. | Never invent Jensaarai/Dathomiri affiliation or tradition entitlement. |
| Features `JM-CF01–JM-CF02` | 2 | Established courage, focused judgment, meditation or Force discipline carried into Master identity. | **Fearless is fear immunity; Serenity has defined actions and limits.** No automatic prior feature ownership while pending. |
| Identity/capstone/neutral `JM-ID01–JM-ID03` | 3 | Chosen style of service, Master as end-state, or undecided. | No Council, Padawan completion, new rank or new class assumed. |
| **Complete** | **77** | | |

### 28.2 Miraj — fixed Q2 Mentor introduction (DRAFT)

> "Mastery does not erase the choices that brought you here. Some lessons remain with us because we have learned to trust them; others because we still question them. Which part of your training will you carry into the responsibility you now choose?"

**Question:** "Which established strength do you want to carry into your service as a Jedi Master?"

Same Miraj as Jedi Knight, with a respectful rank-peer tone. No fabricated prior apprenticeship, old friendship, completed Padawan training, Council appointment, or promise of an automatic future Force Secret.

### 28.3 Fixture JM-SE06 — reading an object's past, without pretending the character already did (six answers)

**Hypothetical evidenced actor:** owned relevant knowledge skill, trained Use the Force, another verified investigation/perception investment, and trained or mechanically supported careful judgment. **Q1 `JM-SE06`** expresses interest in Psychometry and historical understanding; the ability is not presumed owned.

A. **`knowledgeMastery`** — "I've learned to compare what I know against what I can verify. I want that discipline to guide me when the Force offers a glimpse of the past."

B. **`tacticalAwareness`** — "I've learned to notice details that change the meaning of a situation. I want that care to keep a vision from becoming a hasty conclusion."

C. **`skillUtility`** — "I've developed several ways to investigate a difficult question. I want to use them alongside the Force rather than abandon them for it."

D. **`forceRecovery`** — "I've invested in sustaining my connection through demanding Force use. I want to approach deeper perception without neglecting the limits of my strength."

E. **Alternative** — "My previous training has taught me to act on what I can see. I want to learn to question what an object might reveal beyond its surface."

F. **Neutral** — "I know what kind of understanding I want to pursue. I haven't decided which part of my training will guide it."

**Precision:** `forceRecovery` may appear only when actually evidenced by acquired mechanics; `Use the Force` training alone does not establish a specialized recovery focus.

### 28.4 Fixture JM-FS14 — future holocron expertise, no invented artifact (six answers)

**Hypothetical evidenced actor:** trained knowledge-related skill, actual support/advice mechanics, previously selected Force-related training, and separate technical/information training. **Q1 `JM-FS14`** is interest in later Holocron Loremaster, not a currently owned holocron or Force Secret.

A. **`knowledgeMastery`** — "I've spent time gathering reliable knowledge. I want that habit to guide what I seek and preserve through the Force."

B. **`allySupport`** — "I've practiced helping others learn and make difficult choices. I want any wisdom I uncover to remain useful to people besides me."

C. **`forceRecovery`** — "I've learned to manage the limits of my Force abilities. I want that discipline to guide my search for techniques I do not yet know."

D. **`informationControl`** — "I've learned to preserve and organize information. I want that care to shape how I might one day pass on knowledge."

E. **Alternative** — "The abilities I have relied on may not be the ones that matter most here. I want learning itself to become my central discipline."

F. **Neutral** — "I want to preserve what can be learned. I don't yet know which of my existing strengths will help me do that."

**No fabricated possession:** No holocron, gatekeeper, library, apprentice, or future Force Secret is a present fact unless the actor/context separately proves it. The eventual Force Secret selection occurs only from Jedi Master level 2 onward and requires printed legality.

### 28.5 Fixture JM-ID02 — Jedi Master as the completed vocation (six answers)

**Hypothetical evidenced actor:** mechanical support/leadership, actual defensive technique, trained Force usage, and trained knowledge/insight. **Q1 `JM-ID02`** is explicitly the Jedi Master calling as capstone, not an unexpressed further prestige ambition.

A. **`allySupport`** — "I've learned to make others more capable in difficult moments. I want that service to remain central to my life as a Master."

B. **`reactionDefense`** — "I've practiced responding to danger without leaving others exposed. I want that discipline to be one of the ways I serve."

C. **`forceRecovery`** — "I've trained to sustain myself through demanding use of the Force. I want patience and balance to remain part of my Mastery."

D. **`knowledgeMastery`** — "I've learned to question what I think I know. I want that humility to matter more than the title I now carry."

E. **Alternative** — "I've earned this calling, but I don't need my old strengths to define every part of how I practice it."

F. **Neutral** — "I know this is the work I intend to continue. I haven't decided which part of my training will best express it."

**Interpretation rule:** Fulfillment is a positive current aspiration and is neither automatic retirement nor an instruction to pursue Jedi Master levels to the cap; no permanent goal rewrite is triggered by Q2.

### 28.6 Jedi Master restricted-source rules

- Printed Master talent access includes Duelist **and eligible class-independent Force trees**. The class record presently lists only Duelist. Q2 cannot use the Q1 interest to grant a missing tree; V2 class authority must be corrected independently.
- `JM-LS` and `JM-DS` require separate morality checks and may create narrative tension with Jedi affiliations. Such interest is never automatic alignment mutation; Miraj's fixed Q2 line must not endorse a restricted route.
- `JM-TR` requires actor-confirmed tradition training; `JM-GS` does not spawn a spirit.
- `JM-FS` represents future Secrets at levels 2/3/4/5. At class level 1 the automatic features are Fearless and Serenity, with a talent choice. No holocron or apprentice is presumed.

## 29. Force Disciple — Riquis: carry forward what was learned without imposing a new doctrine

### 29.1 Complete Q1 ID-to-Q2 route inventory (52)

| Existing Q1 group | Count | Q2 synthesis relationship | Gating |
|---|---:|---|---|
| Force Secrets `FD-FS01–FD-FS15` | 15 | Which actually acquired Force application, judgment, protection, recovery, or knowledge matters most for later Secret development? | Force Secrets are levels **2–5**, not level 1; later individual restrictions apply. |
| Force Adept `FD-FA01–FD-FA06` | 6 | Prior actual Force training, resilience, technical practice or situational awareness integrated into Disciple identity. | Entry does **not** require Force Adept class levels. |
| Alter `FD-AL01–FD-AL05` | 5 | Prior telekinetic, interpersonal or tactical disciplines incorporated into Force study. | Class-independent Force tree access must be correctly represented by V2. |
| Control `FD-CT01–FD-CT04` | 4 | Existing resilience, self-control, recovery and related abilities informing later Control interests. | No invented owned talent or blanket mind immunity from class choice. |
| Sense `FD-SE01–FD-SE05` | 5 | Earlier investigation, prediction, observation or judgment informing future Force perception. | A wish to sense or foresee does not prove a past vision. |
| Dark Side `FD-DS01–FD-DS03` | 3 | Earlier verified morally specific use of Force, if any, informing a potential dark-side path. | DSS 1+ and any other prerequisites; not automatically Riquis's viewpoint. |
| Light Side `FD-LS01–FD-LS03` | 3 | Earlier healing, restraint or defensive strengths informing possible light-side talent choices. | DSS 0 and other prerequisites; not assumed for all Force Disciples. |
| Guardian Spirit `FD-GS01–FD-GS03` | 3 | Previously learned guidance, insight and Force methods potentially informing spirit-related aspiration. | No fictional spirit, rites or advice without actual history. |
| Traditions `FD-TR01–FD-TR03` | 3 | Documented tradition-specific training carried into independent advanced discipline. | No imposed Sith/Jedi/Jensaarai/Dathomiri identification; require evidence of actual qualifying tradition. |
| Class features `FD-CF01–FD-CF02` | 2 | Previously developed mental discipline, perception or destiny-related intent informing newly available Indomitable/Prophet. | Indomitable covers mind-affecting effects only; Prophet's optional visions and destiny changes are GM-mediated, not known future events. |
| Identity/capstone/neutral `FD-ID01`, `FD-ID02`, `FD-UN00` | 3 | Independent vocation, fulfilled calling, or open exploration. | No need for Force Adept, Jedi/Sith destination or further prestige title. |
| **Complete** | **52** | | |

### 29.2 Riquis — fixed Q2 Mentor introduction (DRAFT)

> "Mm. A new door, yes. But the hand that opens it was shaped by older lessons. Which of those lessons will you carry through, even if the room beyond changes what they mean?"

**Question:** "Which strength you've already cultivated do you want to carry into your life as a Force Disciple?"

Riquis is cryptic and ancient-minded, not a universal doctrinal authority. The player responses stay clear, concrete and first-person; no riddle required in the selectable answer text.

### 29.3 Fixture FD-CF02 — Prophet's possible vision without an invented vision (six answers)

**Hypothetical evidenced actor:** genuine existing Use the Force training; separately evidenced investigation/knowledge, danger detection, mental discipline and support. **Q1 `FD-CF02`** expresses interest in understanding what a *possible* prophetic vision might demand. No vision, Destiny Point expenditure, changed destiny or revelation is assumed.

A. **`knowledgeMastery`** — "I've learned to weigh uncertain information carefully. I want that discipline to guide me if the Force ever shows me something I don't understand."

B. **`tacticalAwareness`** — "I've practiced noticing danger before it becomes obvious. I want that attentiveness to keep me from mistaking a warning for certainty."

C. **`forceRecovery`** — "I've learned to husband my strength when using the Force is demanding. I want that patience to remain with me if a vision asks something difficult."

D. **`allySupport`** — "I've learned to help others through difficult choices. I want that concern to shape what I do with knowledge that might affect them."

E. **Alternative** — "My earlier training has taught me how to use power. I want to explore what it means to act on knowledge I can't fully test."

F. **Neutral** — "I want to understand what a vision might mean. I haven't decided which older lesson would guide my response."

**Prophet limit:** GM selects the content of any vision and controls eligible destiny changes; Q2 must not promise a prophecy or let its answer alter the Destiny system.

### 29.4 Fixture FD-FA03 — future Fortified Body and previously developed survival habits (six answers)

**Hypothetical evidenced actor:** resilience, conditioning or other verified endurance investments, actual force control, documented survival training, and verified defensive timing. **Q1 `FD-FA03`** concerns a possible Fortified Body talent, which has the Equilibrium prerequisite; no immunity is assumed already acquired.

A. **`damageReduction`** — "I've practiced enduring harm that would overwhelm a less prepared body. I want that resilience to support deeper control of my health."

B. **`forceRecovery`** — "I've developed habits for sustaining myself when Force use is demanding. I want that discipline to guide how I strengthen my body's defenses."

C. **`survivalism`** — "I've trained to function when conditions are difficult. I want that preparation to remain useful as I learn what the Force can protect me from."

D. **`reactionDefense`** — "I've learned to respond before a hazard can become a crisis. I want that awareness to complement any deeper resistance I develop."

E. **Alternative** — "I've relied on resisting the dangers around me. I want to explore whether mastering my own body can change the risks I must face."

F. **Neutral** — "I want to explore a more resilient connection between my body and the Force. I don't know which existing strength should lead me there."

**Status warning:** `Fortified Body` is only a future Q1 interest until separately owned and legally granted. `damageReduction` in A is valid only if the actor really has an appropriate current defensive mechanic; Force Disciple's `Indomitable` does not itself justify that statement.

### 29.5 Fixture FD-ID02 — deep Force study as an end, not a route to another title (six answers)

**Hypothetical evidenced actor:** verified Force practice, documented knowledge training, demonstrated support, and a separate resilience or concentration mechanic. **Q1 `FD-ID02`** is a current fulfillment statement, not a generic talent wishlist.

A. **`knowledgeMastery`** — "I've spent time learning to distinguish useful understanding from comfortable answers. I want that curiosity to remain central to this calling."

B. **`forceRecovery`** — "I've developed ways to sustain my use of the Force. I want that discipline to support the learning I still choose to pursue."

C. **`allySupport`** — "I've learned to help others when their strength or judgment is strained. I want that practice to remain part of the path I've chosen."

D. **`reactionDefense`** — "I've worked to recognize danger in time to respond. I want awareness, not another rank, to remain part of how I grow."

E. **Alternative** — "I've reached the calling I sought, but it may ask me to learn in ways my earlier training never prepared me for."

F. **Neutral** — "I know I intend to continue as a Force Disciple. I haven't decided which lesson from my earlier training matters most."

**Guard:** No automatic Light/Dark Side identity, prophecy, visions, spirits, cultural rite, priesthood, or further prestige ambition. If the actor came through a non-Force-Adept legal route, do not assign them Force Adept levels by implication.

### 29.6 Force Disciple restricted-source rules

- The printed class permits Force Adept **or eligible general Force talent trees**. The repo class record currently lists only Force Adept; Q2 cannot make the class's missing tree entitlements legal by itself.
- `FD-FA03` is Fortified Body (talent), not a class-granted body immunity; its Equilibrium prerequisite must be checked through V2 legality at actual talent selection.
- `FD-CF01` Indomitable confers mind-affecting immunity at first Disciple class level; it does **not** mean every Will Defense attack is ineffective, and does not exist while prestige acquisition is merely pending.
- `FD-CF02` Prophet includes GM-controlled visions and optional destiny changes. Q2 describes interest in what a possible future vision might ask, not a completed event.
- `FD-TR` and `FD-LS`/`FD-DS` branches have documented tradition/morality restrictions; Guardian Spirit cannot be assumed personally known. Secrets are future opportunities at levels 2–5.

## 30. Expanded cross-class validation — 10 prestige classes

### 30.1 New fixture coverage and verification levels

| Audit metric | v0.3 baseline | v0.4 additional | Combined structural/editorial status |
|---|---:|---:|---|
| Prestige class identities examined | 6 | 4 | **10 of 32** |
| Distinct pinned Q1 response IDs inventoried | 327 | 234 | **561** |
| New complete A–F fixture sets in this tranche | — | 12 | **72 newly authored first-person options** |
| Class-specific Mentor Q2 introductions in this tranche | — | 4 | Kex, Korr, Miraj (Master), Riquis; DRAFT |
| Q2 production class-by-actor banks | none | none | **NOT IMPLEMENTED** |
| Live Foundry v13 actor tests | none | none | **NOT RUN** |

The additional 234 Q1 IDs have a one-to-one **family route assignment** above, not 234 Q2 response records. All 12 prototypes use hypothetical verified actor fixtures. The template library remains substantially smaller than all possible combinations and intentionally reuses existing 125 common first-sentence concepts.

### 30.2 Guardrail test matrix — editorial checks (not runtime execution)

| Test ID | Potential failure | Required disposition |
|---|---|---|
| `Q2-N25` | A Bounty Hunter is declared to have caught someone simply because their class was selected. | **BLOCK** invented biography; all examples remain hypothetical/conditional. |
| `Q2-N26` | A `GF` Q1 interest establishes Findsman membership or Force Sensitivity. | **BLOCK** source/actor unsupported claims. |
| `Q2-N27` | `BH15` or `BH16` implies Familiar Foe already exists at prestige level 1. | **BLOCK**; source timing begins level 2. |
| `Q2-N28` | Officer Q2 claims an owned fleet, squad or Admiral Korr mentorship. | **BLOCK**; qualified organizational membership is not command history. |
| `Q2-N29` | Officer level 1 automatically grants Share Talent or Command Cover. | **BLOCK**; available from level 2 onward. |
| `Q2-N30` | `OF-MT16` or duplicate-name `Stay in the Fight` maps to the wrong rules identity. | **BLOCK**; quarantine/specific tree+source IDs. |
| `Q2-N31` | Jedi Master Q2 claims a holocron, trained apprentice, Council seat or old friendship with Miraj. | **BLOCK**; requires separate actor/GM evidence. |
| `Q2-N32` | Jedi Master Duelist-only repo list is treated as exhaustive printed Force-tree access. | **BLOCK**; V2 authority reconciliation required. |
| `Q2-N33` | Jedi Master Fearless is equated to Force Disciple's Indomitable. | **BLOCK**; fear immunity vs mind-affecting immunity. |
| `Q2-N34` | Force Disciple actor is treated as having Force Adept levels. | **BLOCK**; printed entry can qualify via other routes. |
| `Q2-N35` | Riquis assigns guaranteed vision/destiny from Prophet or prior Guardian Spirit contact. | **BLOCK**; GM-mediated/conditional. |
| `Q2-N36` | Any of these apex classes receives Force Secret at class level 1. | **BLOCK**; class-level 2–5 Secrets only. |
| `Q2-N37` | Long-standing old survey bias is narrated as a currently owned strength. | **BLOCK**; direct evidence IDs required. |
| `Q2-N38` | An E alternative becomes an automatic career overwrite or implicit rejection of A–D. | **BLOCK**; explicit goal revisions separate. |
| `Q2-N39` | Neutral Q1 causes a guessed new specialization. | **BLOCK**; neutral no new directional signal. |
| `Q2-N40` | Repeat render, unselected answer or uncommitted Q2 sets preference. | **BLOCK**; only committed selection supplies new intent. |

These are **authored acceptance requirements** and editorial checks against the candidate text, not proof that tests passed in Foundry. No simulated actor scoring or deployed data source was available here.

### 30.3 Updated blocker ledger and next action

**Still unresolved after the ten-class stress test:**

1. **Read-only observed-source top-four projection.** `computeTotalBias` mixes survey, class, observed, inferred archetype and reinforcement layers. `computeObservedBehaviorBias` plus owned-item/skill/class/equipment source extraction is a useful foundation, but the ranked 125-key output lacks reliable per-key `evidenceIds`. A new read-only projection must reuse existing scores and distinguish survey-only, access-only, class-chassis-only and actually acquired sources. No second scorer or ad-hoc 125-to-190 mapping.
2. **Source/campaign gating.** Bounty Hunter Findsman, Officer `OF-MT16`, Officer same-name talents, Force general-tree omission for Jedi Master/Force Disciple, morality-specific Force talents, tradition affiliations and future class-feature timing must be corrected/validated through existing V2 rules authority—**not** hidden by Q2 narrative.
3. **Mentor source routing.** Korr is `data/dialogue/mentors/korr/korr_dialogue.json`, not a guessed `admiral_korr/` directory. Force Disciple Riquis may be referred to as `anchorite` in registry. Must resolve actual canon identity and only use established personalities.
4. **Accepted design decisions still pending.** Owner endorsement of Q2 synthesis is not an unconditional approval of six-option fixed slates, exact Mentor lines, selection weights, custom bias projection, or production event schema. Q1 and Q3–Q6 remain unchanged; no decisions implemented here.
5. **Actor-fixture test coverage.** Before class-wide implementation, run evidence-gated tests on actor snapshots for every class Q1 family, neutral and capstone handling, legitimate 0–3-signal short slates, conflicting old survey intent, changed Q1, multi-prestige characters and repeated completed survey events.

**Next content tranche recommendation:** Finish the remaining first 12 Core classes by auditing **Crime Lord, Force Adept, Gunslinger and Sith Apprentice** (or continue complete book order, explicitly distinguishing their conditional cross-book tree access). Then move through the supplement-specific prestige identities in manageable multi-class passes. Prioritize the read-only scorer projection for technical architecture review in parallel, under separate authorization if source code changes would be required.

**Publication state:** Documentation-only artifact v0.4; no GitHub branch/commit/push, live Foundry edit, source schema change, actor mutation, or granting of any new feat/talent/Secret. Status remains editorial working design.

---

## 31. Q2 Character Synthesis expansion — v0.5 (5 new classes)

**Working editorial continuation.** This section preserves all prior Q2 sections without rewriting Q1. Source Q1: pinned `docs/design/SWSE_Prestige_Survey_Rolling_Design.md` at GitHub commit `0f56de3a4d33c8a5c635d47e3c612e501797a0a4`. Current read-only `packs/classes.db` and the individual Mentor dialogue JSONs were checked. This is **not** a production rules certification, feature grant, runtime-tested adaptive slate, GitHub commit or authorization to change an actor.

### 31.1 Architecture preserved

**Q1 identifies the player's advanced-class interest; Q2 asks which actually demonstrated earlier strengths they want to carry into it.** Read existing survey responses as *stated past intent* and current character records as *actual build evidence*. A–D use four distinct evidence-backed mechanical-bias keys from the existing 125-key vocabulary; E is an alternative direction; F is a genuine undecided response. Never fabricate a fourth demonstrated strength where the actor only supports two or three. No new weighting, ontology keys, talent grants or automatic goal changes are approved. The response banks below test language, not an implemented choice-count policy.

**Source-Q1 namespace rule:** ids such as `ID02`, `CF01`, `AW01` and `NEUTRAL` recur across classes. Lookup and stored events must carry the exact class identity and original Q1 ID together. The editorial `GD`, `MD`, `EN`, `IN`, `MP`, and earlier `CA` codes are document notation, not new canonical class identifiers.

### 31.2 Inventory

| Prestige class | Mentor | Exact Q1 candidate count | Primary publication |
|---|---|---:|---|
| Crime Lord | Tío the Hutt | 34 | Core Rulebook pp. 209–210 |
| Force Adept | Seeker Vera | 40 | Core Rulebook pp. 212–214; later Force Adept expansions |
| Gunslinger | Rajma | 55 | Core Rulebook pp. 216–217; later Pistoleer and Carbineer grants |
| Sith Apprentice | Darth Malbada | 58 | Core Rulebook pp. 222–224; KOTOR, JATM and Legacy expansions |
| Corporate Agent | Marl Skindar | 29 | Knights of the Old Republic Campaign Guide pp. 41–43 |
| **New tranche** |  | **216** |  |

**Cumulative coverage:** **15/32 prestige identities**; **777** Q1 candidate routes inventoried. This counts mapped editorial source IDs, not fully proven actor-specific Q2 lines.

## 32. Crime Lord — Tío the Hutt Q2 synthesis

**Q1 source:** prestige Q1 §14; **count:** 34.

### Full Q1 family-to-Q2 route coverage

| Q1 source family (original IDs) | Count | Q2 synthesis meaning |
|---|---:|---|
| **Infamy** — `CL-IF01–CL-IF09` | 9 | Reputation, intimidation, leverage; prioritize established Persuasion, Deception or existing social abilities, not presumed subjects. |
| **Influence** — `CL-IN01–CL-IN06` | 6 | Presence and persuasive disruption; differentiate demonstrated social capability from hoped-for talents. |
| **Mastermind** — `CL-MM01–CL-MM16` | 16 | Coordination, minion support, tactical contingency; never assume minions actually exist. |
| **Identity / capstone / neutral** — `CL-ID01`, `CL-ID02`, `CL-NEUTRAL` | 3 | Resistance/community protection; achieved vocation; unspecified aim. |
| **Total exact Q1 IDs** | **34** | Source Q1 IDs remain unchanged; prefixing with class identity avoids collisions. |

### Mentor Q2 introduction (draft)

> "Ah, a reputation can open doors. It cannot tell you what to do once you are inside. Think about the skills that brought you to this table. Which of them do you intend to build your influence upon?"

**Q2 player question:** Which established strength should shape how you exercise your influence?

### Three complete conditional six-answer fixtures

#### Fixture CL-1: `CL-MM15` — contingency-minded mastermind

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `tacticalAwareness` | I have practiced spotting when a plan is about to break. I want that judgment to guide the contingencies I prepare. |
| B | `informationControl` | I have invested in learning what others do not know. I want that information to help me choose my next move. |
| C | `resourceControl` | I have learned to keep useful resources in reserve. I want those reserves to matter when influence fails. |
| D | `allySupport` | I have developed ways to help others succeed. I want that cooperation to keep my plans from depending on me alone. |
| E — alternative | Different direction | I have relied on careful planning. I want to discover whether a more personal form of influence serves this role better. |
| F — undecided | No directional bias | I know I want room to change plans. I am not sure which older skill should shape that habit. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture CL-2: `CL-IN03` — persuasive influence

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `persuasionMastery` | I have practiced getting people to listen. I want that skill to carry more weight than a threat. |
| B | `deceptionMastery` | I have learned to choose what to reveal and what to withhold. I want that judgment to shape how I negotiate. |
| C | `tacticalAwareness` | I have trained myself to notice when a conversation is turning dangerous. I want to use that awareness before matters become violent. |
| D | `networkInfluence` | I have developed ways to work through other people. I want those relationships to matter more than a title. |
| E — alternative | Different direction | My past methods got me heard. I want to consider a different kind of influence from the one I have relied on. |
| F — undecided | No directional bias | I am interested in influence, but I do not know which part of my training should guide it. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture CL-3: `CL-ID02` — crime-lord capstone

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `resourceControl` | I have learned to manage limited resources. I want to keep refining that skill within the position I have sought. |
| B | `allySupport` | I have practiced supporting those who work beside me. I want that to remain central to this calling. |
| C | `persuasionMastery` | I have developed ways to settle disagreements through conversation. I want to keep that ability sharp. |
| D | `tacticalAwareness` | I have learned to recognize costly mistakes before they happen. I want sound judgment to define my work more than another title. |
| E — alternative | Different direction | Reaching this position has been the goal. I am open to changing how I use my earlier abilities within it. |
| F — undecided | No directional bias | I intend to keep growing as a Crime Lord, but I have not decided what should carry over most strongly. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

### Source and narrative guardrails

1. Crime Lord receives a talent at *each* class level, not merely odd ones; Command Cover starts at level 2 and is not a Q2-acquired feature.
2. Fortune, Lineage and Misfortune are entry-prerequisite sources rather than selectable Crime Lord talent trees.
3. The character may pursue unlawful exploitation or aid an underground resistance; do not predetermine motive, allegiance or morality.

## 33. Force Adept — Seeker Vera Q2 synthesis

**Q1 source:** prestige Q1 §16; **count:** 40.

### Full Q1 family-to-Q2 route coverage

| Q1 source family (original IDs) | Count | Q2 synthesis meaning |
|---|---:|---|
| **Dark Side Devotee** — `FA-DS01–FA-DS05` | 5 | Force-focused aggression and risk, with real dark-side implications; never infer actual use of dark talents. |
| **Force Adept** — `FA-FA01–FA-FA06` | 6 | Force understanding, resilience and esoteric studies grounded in actual Force use and skills. |
| **Force Item** — `FA-FI01–FA-FI06` | 6 | Craft, tool mastery, rituals; do not invent fabricated talismans. |
| **Imperial Inquisitor — RESTRICTED** — `FA-II01–FA-II04` | 4 | Restricted to verified Inquisitorius affiliation and appropriate Dark Side Score; no generic display. |
| **Beastwarden** — `FA-BW01–FA-BW05` | 5 | Animal-related experience only if evidenced, otherwise aspirational without a fabricated bond. |
| **Mystic** — `FA-MY01–FA-MY05` | 5 | Insight, mental discipline, resilience, not forced Jedi/Sith status. |
| **Telepath** — `FA-TP01–FA-TP05` | 5 | Actual communication/mental disciplines versus mere interest in telepathy. |
| **Feature / identity / neutral** — `FA-FT01`, `FA-ID01`, `FA-ID02`, `FA-NEUTRAL` | 4 | Later Force Technique, independent calling, fulfillment, undecided. |
| **Total exact Q1 IDs** | **40** | Source Q1 IDs remain unchanged; prefixing with class identity avoids collisions. |

### Mentor Q2 introduction (draft)

> "The Force rarely asks us to leave all earlier learning behind. Whatever path has brought you this far, some part of it may still deserve your trust. Which part would you carry into this deeper study?"

**Q2 player question:** Which discipline already present in your life do you want to bring into your Force Adept calling?

### Three complete conditional six-answer fixtures

#### Fixture FA-1: `FA-FI03` — protective talisman craft

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `itemEnchantment` | I have explored how the Force can be focused through objects. I want that study to inform the protection I seek to create. |
| B | `engineeringMastery` | I have spent time learning how devices work. I want that care and precision to shape my approach to Force-attuned craft. |
| C | `knowledgeMastery` | I have built up knowledge through patient study. I want to apply that patience to an unfamiliar form of protection. |
| D | `forceRecovery` | I have learned how demanding sustained Force use can be. I want that discipline to guide how I prepare a lasting defense. |
| E — alternative | Different direction | I have relied on understanding how things are made. I want to see whether my strength lies elsewhere in this deeper craft. |
| F — undecided | No directional bias | I am drawn to talismans but have not decided which existing discipline should guide me. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture FA-2: `FA-TP02` — telepathic communication

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `persuasionMastery` | I have learned to make my meaning clear to others. I want that clarity to remain important if words are no longer enough. |
| B | `knowledgeMastery` | I have spent time understanding different minds and ideas. I want that curiosity to guide how I communicate. |
| C | `forceBond` | I have developed a documented Force connection with another being. I want to handle any deeper communication with care. |
| D | `reactionDefense` | I have trained to notice when another person is distressed or threatened. I want that sensitivity to inform how I reach them. |
| E — alternative | Different direction | I have relied on familiar ways of communicating. I want to decide whether this path calls for a different habit. |
| F — undecided | No directional bias | I want to explore telepathic communication; I do not yet know which earlier strength should shape it. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture FA-3: `FA-ID02` — Force Adept as terminal calling

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `knowledgeMastery` | I have devoted effort to understanding unfamiliar ideas. I want that curiosity to keep guiding my calling. |
| B | `forceRecovery` | I have learned to sustain my connection to the Force when it costs me effort. I want to refine that discipline here. |
| C | `survivalism` | I have learned to function with limited support. I want that independence to remain valuable. |
| D | `allySupport` | I have practiced using my abilities to help others. I want that purpose to endure without needing another rank. |
| E — alternative | Different direction | I have reached the calling I sought, but that need not mean every older habit belongs in it. |
| F — undecided | No directional bias | I want to remain a Force Adept; I am still considering which earlier strength matters most. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

### Source and narrative guardrails

1. The Imperial Inquisitor tree is gated by Inquisitorius membership and Dark Side Score 1+; do not pretend Q1 interest satisfies either.
2. Force Techniques begin at Force Adept level 2 and continue at even levels, not entry.
3. Seeker Vera has alias inconsistencies (`venn`/`Venn`/Vera) and does not impose a Jedi/Sith identity.

## 34. Gunslinger — Rajma Q2 synthesis

**Q1 source:** prestige Q1 §18; **count:** 55.

### Full Q1 family-to-Q2 route coverage

| Q1 source family (original IDs) | Count | Q2 synthesis meaning |
|---|---:|---|
| **Awareness** — `GL-AW01–GL-AW08` | 8 | Reading threats, initiative, target awareness; training and reaction require individual build evidence. |
| **Fortune** — `GL-FT01–GL-FT13` | 13 | Luck-tinged resilience and improvisation; do not claim luck talents solely from class entry. |
| **Gunslinger** — `GL-GS01–GL-GS17` | 17 | Pistol tactics, aim, disabling and shot timing; do not substitute generic ranged attacks for pistol-specific expertise. |
| **Pistoleer VERIFIED** — `GL-PT01` | 1 | Dash and Blast: future dual-pistol mobility interest; individual prerequisites mandatory. |
| **Pistoleer UNVERIFIED** — `GL-PTQ01–GL-PTQ04` | 4 | Quarantine four repository-only titles; never display as certified options. |
| **Carbineer** — `GL-CB01–GL-CB08` | 8 | Carbine/rifle route supported by later printed grant; verify weapon-specific talent interactions. |
| **Feature / identity / neutral** — `GL-CF01`, `GL-ID01`, `GL-ID02`, `GL-NEUTRAL` | 4 | Trusty Sidearm later, protection, capstone, undecided. |
| **Total exact Q1 IDs** | **55** | Source Q1 IDs remain unchanged; prefixing with class identity avoids collisions. |

### Mentor Q2 introduction (draft)

> "You did not get this far with a pretty holster alone. Go on, tell me what you actually rely on. Good aim? Fast thinking? A little luck that you have learned not to waste? Which one comes with you?"

**Q2 player question:** What strength from your earlier training should define the Gunslinger you become?

### Three complete conditional six-answer fixtures

#### Fixture GL-1: `GL-GS08` — nonlethal ranged disarm

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `accuracy` | I have practiced landing difficult shots. I want that control to matter when stopping someone is better than hurting them. |
| B | `reactionDefense` | I have developed the habit of responding quickly to danger. I want to use that timing without relying only on damage. |
| C | `tacticalAwareness` | I have learned to read the moment an opponent becomes vulnerable. I want judgment, not just speed, to guide my shot. |
| D | `allySupport` | I have learned how to create openings for allies. I want that cooperation to remain part of my pistol work. |
| E — alternative | Different direction | I have relied on decisive attacks. I want to explore a different use for the skills I have gained. |
| F — undecided | No directional bias | Disarming opponents interests me, but I have not decided which earlier skill should define that approach. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture GL-2: `GL-CB06` — future carbine specialization

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `accuracy` | I have spent time making my shots dependable. I want to carry that precision into a different kind of firearm. |
| B | `firepower` | I have learned to handle heavier attacks responsibly. I want that control to inform how I use a carbine. |
| C | `tacticalAwareness` | I have trained to choose firing positions carefully. I want that habit to shape how I approach rifle engagements. |
| D | `weaponVersatility` | I have built skill with more than one weapon type. I want that adaptability to remain part of my identity. |
| E — alternative | Different direction | My earlier experience has been more pistol-focused. I want to consider what changes when my range and equipment change. |
| F — undecided | No directional bias | I am interested in carbines, but I do not yet know what earlier training will matter most. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture GL-3: `GL-ID02` — Gunslinger as lifelong identity

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `quickDraw` | I have practiced responding rapidly when a weapon is needed. I want that discipline to remain a craft in its own right. |
| B | `accuracy` | I have worked to make deliberate shots reliable. I want to keep refining that without seeking another title. |
| C | `evasion` | I have learned to avoid taking a hit when position or timing can save me. I want that survival instinct to endure. |
| D | `allySupport` | I have developed ways to protect the people beside me. I want my shooting to serve them as much as myself. |
| E — alternative | Different direction | I have reached the role I wanted. I can still change which habits define the way I practice it. |
| F — undecided | No directional bias | I know I want to remain a Gunslinger; I have not decided which earlier strength should lead my development. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

### Source and narrative guardrails

1. `GL-PTQ01–04` are quarantined repository names, not mechanically certified Gunslinger options.
2. Trusty Sidearm begins at level 2; Old Faithful changes rifle/carbine scope conditionally, not by mere interest.
3. Rajma does not presume a past duel, prior relationship or character gender.

## 35. Sith Apprentice — Darth Malbada Q2 synthesis

**Q1 source:** prestige Q1 §22; **count:** 58.

### Full Q1 family-to-Q2 route coverage

| Q1 source family (original IDs) | Count | Q2 synthesis meaning |
|---|---:|---|
| **Armor Specialist** — `SA-AR01–SA-AR06` | 6 | Actual defensive/armor training, not assumed equipment or named talents. |
| **Duelist** — `SA-DU01–SA-DU11` | 11 | Weapon precision and single-combat methods, source/weapon identity needed. |
| **Lightsaber Combat** — `SA-LC01–SA-LC11` | 11 | Blade defense, counterattack and mobility; no automatic ownership of Block/Deflect. |
| **Sith** — `SA-SI01–SA-SI12` | 12 | Dark Force disciplines; `SA-SI12` Stolen Form quarantined. |
| **Sith Alchemy** — `SA-AL01–SA-AL04` | 4 | Actual craft/ritual experience distinguished from unowned Sith alchemical equipment and prerequisites. |
| **Sith Commander** — `SA-CM01–SA-CM04` | 4 | Group influence and leadership without invented troops or dark-side sacrifices. |
| **Future Force Technique** — `SA-FT01–SA-FT07` | 7 | Even-level later technique interest; no auto-grant at level 1. |
| **Identity / capstone / neutral** — `SA-ID01`, `SA-ID02`, `SA-ID03` | 3 | Personal agency, stable vocation, undecided. |
| **Total exact Q1 IDs** | **58** | Source Q1 IDs remain unchanged; prefixing with class identity avoids collisions. |

### Mentor Q2 introduction (draft)

> "You carry habits that kept you alive. Some made you strong. Others made you predictable. Decide which strength you intend to sharpen. Do not confuse an old weakness with an obligation to remain weak."

**Q2 player question:** Which strength you already possess will you make central to your Sith training?

### Three complete conditional six-answer fixtures

#### Fixture SA-1: `SA-AL02` — Sith Alchemy interest

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `sithAlchemy` | I have already studied documented Sith alchemical methods. I want to deepen that difficult craft, not merely collect its results. |
| B | `engineeringMastery` | I have learned to build complex things carefully. I want that precision to inform work whose risks are greater. |
| C | `ritualMastery` | I have practiced a documented ritual discipline. I want that preparation to matter more than impatience. |
| D | `resourceControl` | I have learned to plan around scarce supplies. I want that discipline to carry into costly experimentation. |
| E — alternative | Different direction | My experience has been practical rather than ritual. I want to see what I must change before this power can be mine. |
| F — undecided | No directional bias | I want to explore Sith alchemy, but have not yet decided which of my established strengths should shape it. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture SA-2: `SA-CM03` — rallying dark followers

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `commandAuthority` | I have practiced making decisions that others depend upon. I want that decisiveness to shape my command. |
| B | `intimidation` | I have learned how fear changes a confrontation. I want to decide deliberately when to make use of that effect. |
| C | `allySupport` | I have developed ways to strengthen the people fighting beside me. I want to adapt that experience without losing control. |
| D | `tacticalAwareness` | I have learned to see when an attack is losing momentum. I want that awareness to guide any orders I give. |
| E — alternative | Different direction | I have depended on individual power. I want to explore what it means to direct others instead. |
| F — undecided | No directional bias | I am drawn to command, but have not settled on which past strength should inform it. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture SA-3: `SA-ID02` — Apprentice as capstone

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `formMastery` | I have dedicated practice to a martial form. I want to refine it without treating this calling as temporary. |
| B | `forceRecovery` | I have worked to recover from demanding Force use. I want that discipline to remain mine. |
| C | `reactionDefense` | I have trained to respond when an opponent tests my defenses. I want to carry those instincts forward. |
| D | `knowledgeMastery` | I have spent time studying teachings others disregard. I want continued understanding, not a compulsory new title. |
| E — alternative | Different direction | I have reached the discipline I intended. I can still decide which old habits belong in it. |
| F — undecided | No directional bias | I intend to remain on this path, but I have not chosen which earlier strength will define it. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

### Source and narrative guardrails

1. Core printed Dark Side Score equal to Wisdom differs from labeled repository house rule DSS≥1; do not choose silently.
2. `SA-SI12` Stolen Form remains quarantined. Sith Alchemy in different talent trees has same-name identity collisions; source and tree IDs are mandatory.
3. Sith Apprentice Force Techniques begin at level 2; an actor may choose it as their terminal prestige calling, not necessarily Sith Lord.

## 36. Corporate Agent — Marl Skindar Q2 synthesis

**Q1 source:** prestige Q1 §25; **count:** 29.

### Full Q1 family-to-Q2 route coverage

| Q1 source family (original IDs) | Count | Q2 synthesis meaning |
|---|---:|---|
| **Leadership** — `LE01–LE11` | 11 | Actual coordination and leadership capability; no assumed staff or direct reports. |
| **Lineage** — `LI01–LI07` | 7 | Contacts, resources, knowledge and engineering; class entry does not grant particular acquaintances. |
| **Corporate Power** — `CP01–CP07` | 7 | Negotiation, resolve, organizational leverage; skill evidence is distinct from corporate employment. |
| **Feature / identity / neutral** — `CF01`, `ID01`, `ID02`, `NEUTRAL` | 4 | Executive Leadership later, protective corporate ethic, capstone, undecided. |
| **Total exact Q1 IDs** | **29** | Source Q1 IDs remain unchanged; prefixing with class identity avoids collisions. |

### Mentor Q2 introduction (draft)

> "Corporate credentials. Lovely. They tell me who signed a form, not whether you know how to get anything done. What do you actually bring to the position? Try answering without a slogan."

**Q2 player question:** Which capability from your existing experience should guide how you exercise corporate authority?

### Three complete conditional six-answer fixtures

#### Fixture CA-1: `CP03` — corporate bargaining and leverage

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `persuasionMastery` | I have developed ways to make an agreement attractive. I want that skill to inform how I use corporate influence. |
| B | `knowledgeMastery` | I have learned how complex organizations work. I want that understanding to guide the leverage I develop. |
| C | `informationControl` | I have practiced collecting useful information. I want facts to matter more than empty authority. |
| D | `resourceControl` | I have become careful about allocating limited resources. I want that judgment to shape what I ask others to risk. |
| E — alternative | Different direction | I have relied on formal procedures. I want to consider whether a different kind of leverage matters more now. |
| F — undecided | No directional bias | I want to develop corporate influence, but I am not yet sure which older ability should lead it. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture CA-2: `LI07` — corporate network and resource access

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `networkInfluence` | I have worked to maintain real contacts. I want those relationships to support my responsibilities, not just my status. |
| B | `businessAcumen` | I have learned to recognize what a transaction will really cost. I want that judgment to guide any network I build. |
| C | `knowledgeMastery` | I have studied unfamiliar institutions and systems. I want that understanding to help me find the right people. |
| D | `informationControl` | I have learned to keep track of valuable information. I want that discipline to determine which connections I trust. |
| E — alternative | Different direction | I have relied on knowing the right people. I want to explore what I can accomplish without that advantage. |
| F — undecided | No directional bias | I want to build useful connections, but do not yet know which existing strength should guide me. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture CA-3: `ID02` — Corporate Agent as career endpoint

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `allySupport` | I have learned to help colleagues succeed. I want that habit to remain part of my professional identity. |
| B | `corporateInfluence` | I have actual experience influencing organizational decisions. I want to refine that responsibility within this role. |
| C | `tacticalAwareness` | I have practiced identifying the consequences of a poor decision. I want that care to outlast any title. |
| D | `engineeringMastery` | I have built practical technical knowledge. I want that expertise to remain useful even as my responsibilities change. |
| E — alternative | Different direction | This role may be my destination, but I am willing to rethink how my previous experience serves it. |
| F — undecided | No directional bias | I want to grow in this career; I have not yet chosen which established strength should define it. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

### Source and narrative guardrails

1. Corporate Agent requires qualifying corporate employment; the printed Employment Required condition restricts further levels if the employment ends.
2. Executive Leadership starts at class level 2, not at level 1.
3. Marl Skindar is a covert operative but the character need not be a spy, Republic agent, or personally acquainted with him.
4. Short IDs like `LE01` and `ID01` are author-scoped; store `(class=Corporate Agent, q1Id)` rather than a bare globally ambiguous identifier.

## 37. v0.5 validation and unresolved implementation authority

- **Structural checks:** every inventoried source Q1 ID in the five class route maps is distinct *within its class* and has exactly one family assignment; **216** candidate IDs are represented. The authoring pass contains **15 complete A–F fixtures** = **90 first-person example responses**, including 4 evidence-dependent substantive statements in each.
- **Actual actor tests:** none in Foundry v13. No fixture should be presented verbatim without a validated current actor snapshot and true mechanical provenance for each A–D key. In particular, some fixtures intentionally posit rare existing strengths (e.g., `sithAlchemy`, `forceBond`, `dualistMastery`, `corporateInfluence`) and are valid only when confirmed.
- **Selection state:** Q1 finalized selection and validated actor snapshot must be frozen for Q2; back-navigation invalidates/recomputes candidate evidence deterministically; only committed Q2 answer creates new player-intent evidence.
- **Source-of-truth:** existing V2 mechanical rules and owned-item IDs govern the current build; the printed books constrain legal meaning. Do not use Q1 talent anchors to grant or retroactively claim an ability.
- **Quarantine and access discrepancies:** remain upstream canonical authority work. Q2 must surface intent honestly without functioning as a new eligibility engine or hiding a broken class/talent access list behind invented fallbacks.
- **Q1–Q6 separation:** Q2 does not reteach class talents (Q1), test hypothetical behavior (Q3), dictate Dip/Dive/Swim (Q4), decide next careers (Q5), or perform Mentor identity correction (Q6).
- **Approval state:** Mentor lines, player answers, exact score-to-evidence projection, A–F presentation and canonical ontology mappings remain **draft**; no GitHub commit or push.

---

## 38. Q2 Character Synthesis expansion — v0.6 (5 new classes)

**Working editorial continuation.** This section preserves all prior Q2 sections without rewriting Q1. Source Q1: pinned `docs/design/SWSE_Prestige_Survey_Rolling_Design.md` at GitHub commit `0f56de3a4d33c8a5c635d47e3c612e501797a0a4`. Current read-only `packs/classes.db` and the individual Mentor dialogue JSONs were checked. This is **not** a production rules certification, feature grant, runtime-tested adaptive slate, GitHub commit or authorization to change an actor.

### 38.1 Architecture preserved

**Q1 identifies the player's advanced-class interest; Q2 asks which actually demonstrated earlier strengths they want to carry into it.** Read existing survey responses as *stated past intent* and current character records as *actual build evidence*. A–D use four distinct evidence-backed mechanical-bias keys from the existing 125-key vocabulary; E is an alternative direction; F is a genuine undecided response. Never fabricate a fourth demonstrated strength where the actor only supports two or three. No new weighting, ontology keys, talent grants or automatic goal changes are approved. The response banks below test language, not an implemented choice-count policy.

**Source-Q1 namespace rule:** ids such as `ID02`, `CF01`, `AW01` and `NEUTRAL` recur across classes. Lookup and stored events must carry the exact class identity and original Q1 ID together. The editorial `GD`, `MD`, `EN`, `IN`, `MP`, and earlier `CA` codes are document notation, not new canonical class identifiers.

### 38.2 Inventory

| Prestige class | Mentor | Exact Q1 candidate count | Primary publication |
|---|---|---:|---|
| Gladiator | Pegar | 26 | Knights of the Old Republic Campaign Guide pp. 43–45 |
| Melee Duelist | Blade Master Kharjo | 44 | Knights of the Old Republic Campaign Guide pp. 46–47 |
| Enforcer | Krag the Immovable | 16 | The Force Unleashed Campaign Guide pp. 43–45 |
| Infiltrator | Delta | 32 | The Force Unleashed Campaign Guide pp. 48–50 |
| Master Privateer | The Captain | 39 | The Force Unleashed Campaign Guide pp. 51–52; Scum and Villainy expansions |
| **New tranche** |  | **157** |  |

**Cumulative coverage:** **20/32 prestige identities**; **934** Q1 candidate routes inventoried. This counts mapped editorial source IDs, not fully proven actor-specific Q2 lines.

## 39. Gladiator — Pegar Q2 synthesis

**Q1 source:** prestige Q1 §25; **count:** 26.

### Full Q1 family-to-Q2 route coverage

| Q1 source family (original IDs) | Count | Q2 synthesis meaning |
|---|---:|---|
| **Armor Specialist** — `AR01–AR06` | 6 | Armored endurance, defensive mobility, protection; assume armor only if evidenced. |
| **Awareness** — `AW01–AW08` | 8 | Read an opponent, react, identify weakness; not fabricated actual arena duels. |
| **Gladiatorial Combat** — `GC01–GC08` | 8 | Control, momentum, endurance, improvised/exotic weapons; avoid presumed audience or kill history. |
| **Feature / identity / neutral** — `CF01`, `ID01`, `ID02`, `NEUTRAL` | 4 | Unflinching later, showmanship with possible nonlethal matches, career capstone, undecided. |
| **Total exact Q1 IDs** | **26** | Source Q1 IDs remain unchanged; prefixing with class identity avoids collisions. |

### Mentor Q2 introduction (draft)

> "I have watched a thousand fighters arrive with a new title. What matters is what they bring with them when the crowd goes quiet. Your old strengths have not vanished. Which one should guide your next contest?"

**Q2 player question:** Which experience already developed should define your fighting style as a Gladiator?

### Three complete conditional six-answer fixtures

#### Fixture GD-1: `GC07` — drawing a rival away from allies

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `allySupport` | I have practiced helping allies survive dangerous moments. I want that protection to matter when I draw an opponent toward me. |
| B | `intimidation` | I have learned how a display of confidence can change an encounter. I want to use that experience carefully when facing a challenger. |
| C | `reactionDefense` | I have trained to respond quickly to an attack. I want that timing to let me take pressure off someone else. |
| D | `tacticalAwareness` | I have learned to read where a dangerous opponent will move next. I want that awareness to guide my challenge. |
| E — alternative | Different direction | I have relied on fighting alone. I want to consider whether this craft can make me a better protector. |
| F — undecided | No directional bias | I want to control an opponent’s attention, but do not know which old strength should shape it. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture GD-2: `GC04` — adapting to exotic arena weapons

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `weaponVersatility` | I have practiced working with different weapons. I want that adaptability to remain central when the equipment changes. |
| B | `improvisation` | I have learned to make use of what is at hand. I want that ingenuity to support unfamiliar weapons. |
| C | `accuracy` | I have worked on placing attacks with precision. I want that care to survive the transition to strange equipment. |
| D | `tacticalAwareness` | I have trained to identify an opponent’s reach and weaknesses. I want that observation to guide how I test an unfamiliar weapon. |
| E — alternative | Different direction | I have depended on one familiar weapon. I want to learn what changes when I stop relying on it. |
| F — undecided | No directional bias | I am interested in handling unusual weapons, but have not yet chosen the older skill that will help most. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture GD-3: `ID02` — gladiatorial capstone

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `combatStamina` | I have trained to endure when the contest becomes demanding. I want that resilience to define the fighter I remain. |
| B | `accuracy` | I have practiced making each strike count. I want to keep honing that craft for its own sake. |
| C | `evasion` | I have learned to avoid risks that can be escaped through timing. I want that judgment to remain part of my style. |
| D | `combatFlow` | I have practiced maintaining rhythm in a fight. I want that awareness to grow without needing another title. |
| E — alternative | Different direction | I have reached the discipline I sought, but I can still reconsider which habits deserve to last. |
| F — undecided | No directional bias | I want to continue as a Gladiator; I have not yet decided which earlier skill should define my mastery. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

### Source and narrative guardrails

1. Unflinching begins at Gladiator level 2, not entry.
2. The sourcebook Crowd Response mechanic depends on actual arena circumstances and audience response; it is not a universal acquired class bonus.
3. Pegar’s ancient experience is his biography, not evidence that the player has won a match or killed an opponent.
4. Generic ID `AR01` etc. must be scoped to Gladiator, not treated as unique across prestige Q1 classes.

## 40. Melee Duelist — Blade Master Kharjo Q2 synthesis

**Q1 source:** prestige Q1 §25; **count:** 44.

### Full Q1 family-to-Q2 route coverage

| Q1 source family (original IDs) | Count | Q2 synthesis meaning |
|---|---:|---|
| **Brawler** — `BR01–BR22` | 22 | Grappling, strikes, improvisation, melee counters; only claim practiced techniques with owned evidence. |
| **Weapon Specialist** — `WS01–WS09` | 9 | Weapon focus and attack precision; ranged-tree entries require actual build/weapon context and should not be presented as universal melee identity. |
| **Melee Duelist** — `MD01–MD09` | 9 | Feinting, mobility, dual or single weapon; do not assume a secondary weapon is equipped. |
| **Feature / identity / neutral** — `CF01`, `ID01`, `ID02`, `NEUTRAL` | 4 | Master of Movement later, restrained single-combat identity, capstone, undecided. |
| **Total exact Q1 IDs** | **44** | Source Q1 IDs remain unchanged; prefixing with class identity avoids collisions. |

### Mentor Q2 introduction (draft)

> "Before you perfect a technique, consider what remains reliable when its first attempt fails. Your stance, timing, and judgment began somewhere. Which established strength will you refine into your discipline?"

**Q2 player question:** Which previously developed skill should become the foundation of your dueling discipline?

### Three complete conditional six-answer fixtures

#### Fixture MD-1: `MD02` — feinting and deceptive timing

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `deceptionMastery` | I have learned how to misdirect an opponent. I want that judgment to guide how I use a feint. |
| B | `accuracy` | I have practiced precise strikes. I want that control to matter when deception creates only a brief opening. |
| C | `reactionDefense` | I have trained to respond quickly to an enemy’s commitment. I want that timing to help me choose when to mislead them. |
| D | `tacticalAwareness` | I have learned to observe an opponent’s habits. I want to turn that attention into a deliberate close-combat discipline. |
| E — alternative | Different direction | I have relied on direct attacks. I want to learn whether controlling expectations can become a better way to fight. |
| F — undecided | No directional bias | I want to explore feints but have not chosen which old skill will support them. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture MD-2: `MD08` — single-weapon mobile exchanges

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `weaponMastery` | I have practiced with a chosen weapon until its handling is dependable. I want that familiarity to support greater mobility. |
| B | `evasion` | I have learned to stay difficult to catch while moving. I want that instinct to remain part of my dueling style. |
| C | `accuracy` | I have trained to land a deliberate strike even under pressure. I want that precision to survive a faster exchange. |
| D | `combatFlow` | I have practiced maintaining my rhythm during repeated attacks. I want that composure to guide my footwork. |
| E — alternative | Different direction | I have built strength by holding my position. I want to see what changes if movement becomes central instead. |
| F — undecided | No directional bias | I want a more mobile duel, but do not yet know which earlier strength should carry me there. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture MD-3: `ID02` — Melee Duelist as ultimate craft

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `dualistMastery` | I have dedicated myself to a close-combat discipline. I want to keep refining it without chasing another name. |
| B | `counterMastery` | I have practiced answering an opponent’s mistake. I want that patience to remain my teacher. |
| C | `tacticalAwareness` | I have developed the habit of watching before I act. I want that care to remain central to my duels. |
| D | `adaptability` | I have learned to adjust when an opponent refuses to fight as expected. I want that flexibility to keep growing. |
| E — alternative | Different direction | I have reached the practice I sought, but that does not require my old methods to stay unchanged. |
| F — undecided | No directional bias | I know I want to pursue mastery of the duel, but not which earlier discipline should lead. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

### Source and narrative guardrails

1. Published Weapon Focus entry requirement is specifically an exotic melee weapon or advanced melee weapons.
2. Master of Movement begins at Melee Duelist class level 2; do not imply it is granted at entry.
3. Melee Duelist is not inherently Jedi, Sith, or a lightsaber specialist.
4. Kharjo has a dedicated dialogue file but was absent from the Mentor registry in the pinned Q1 audit; do not silently substitute a fallback Mentor.

## 41. Enforcer — Krag the Immovable Q2 synthesis

**Q1 source:** prestige Q1 §26; **count:** 16.

### Full Q1 family-to-Q2 route coverage

| Q1 source family (original IDs) | Count | Q2 synthesis meaning |
|---|---:|---|
| **Survivor** — `SV01–SV04` | 4 | Survival, endurance and mobility; verify printed Survivor/Survival terminology. |
| **Enforcement** — `EN01–EN07` | 7 | Nonlethal restraint, pursuit, intimidation and tactical use of force. |
| **Feature / identity / neutral** — `CF01`, `CF02`, `ID01`, `ID02`, `NEUTRAL` | 5 | Resources at entry; Targeted Suspect begins at level 2; public-safety approach, capstone or undecided. |
| **Total exact Q1 IDs** | **16** | Source Q1 IDs remain unchanged; prefixing with class identity avoids collisions. |

### Mentor Q2 introduction (draft)

> "The uniform or the badge is not the point. When an arrest goes wrong, you fall back on what you can actually do. Which strength will you trust when someone refuses to cooperate?"

**Q2 player question:** Which part of your existing training should guide how you enforce your decisions?

### Three complete conditional six-answer fixtures

#### Fixture EN-1: `EN03` — nonlethal apprehension

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `lawEnforcement` | I have practiced lawful or authorized methods of controlling an encounter. I want that discipline to guide a capture. |
| B | `accuracy` | I have learned to place my attacks deliberately. I want that precision to serve restraint when circumstances permit. |
| C | `grappling` | I have trained to control an opponent at close range. I want that ability to help end confrontations without needless injury. |
| D | `reactionDefense` | I have developed a quick response to danger. I want that timing to protect bystanders while I bring someone under control. |
| E — alternative | Different direction | I have relied on force to end threats. I want to reconsider how much force a successful capture really requires. |
| F — undecided | No directional bias | I want to bring people in alive, but have not decided which part of my training will guide that work. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture EN-2: `EN02` — vehicle or foot pursuit

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `trackingMastery` | I have trained to stay with a trail when it gets difficult. I want that persistence to guide an active pursuit. |
| B | `pilotMastery` | I have demonstrated skill operating vehicles under pressure. I want that control to help me avoid reckless chases. |
| C | `initiative` | I have practiced acting before an opportunity closes. I want that readiness to matter when a suspect flees. |
| D | `tacticalAwareness` | I have learned to recognize routes and obstacles early. I want that awareness to decide when chasing is worth the risk. |
| E — alternative | Different direction | My previous strengths have been more defensive. I want to explore whether pursuit demands a different approach. |
| F — undecided | No directional bias | I want to become better at pursuit, but do not yet know what experience should define it. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture EN-3: `ID02` — Enforcer career fulfillment

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `allySupport` | I have learned to back up others in dangerous situations. I want to keep that responsibility within the work I have chosen. |
| B | `tacticalAwareness` | I have practiced judging when a confrontation is about to worsen. I want that restraint to remain important. |
| C | `persuasionMastery` | I have developed ways to resolve disputes through words. I want to keep using that skill instead of relying only on strength. |
| D | `reactionDefense` | I have trained to endure sudden threats. I want that preparedness to keep shaping my decisions. |
| E — alternative | Different direction | I have reached the profession I sought, but I can still change the methods I rely on. |
| F — undecided | No directional bias | I intend to grow within this role; I have not decided which earlier strength matters most. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

### Source and narrative guardrails

1. The printed entry paragraph uses Survival while accessible tree names use Survivor; retain provenance issue.
2. Resources is organizational equipment access, NOT free cash or unlimited personally owned gear.
3. Targeted Suspect starts at level 2 and requires observing a suspect in combat; no automatic suspect previously investigated.
4. Krag serves Tío the Hutt in his own story, but the player may belong to other lawful or security organizations; do not inherit Krag’s employer or morality.

## 42. Infiltrator — Delta Q2 synthesis

**Q1 source:** prestige Q1 §26; **count:** 32.

### Full Q1 family-to-Q2 route coverage

| Q1 source family (original IDs) | Count | Q2 synthesis meaning |
|---|---:|---|
| **Camouflage** — `CA01–CA10` | 10 | Stealth and survival; no presumed previous infiltration job or mission. |
| **Bothan SpyNet** — `BS01–BS06` | 6 | Spynet Agent requires Bothan species OR two Infiltration talents; do not impose blanket species exclusion. |
| **Infiltration** — `IT01–IT05` | 5 | Timed stealth, entry and quiet takedowns; actual capability must be evidenced. |
| **Spy** — `SY01–SY06` | 6 | Disguise, surveillance, sabotage and research; not an automatic criminal or intelligence affiliation. |
| **Feature / identity / neutral** — `CF01`, `CF02`, `ID01`, `ID02`, `NEUTRAL` | 5 | Unarmed Stun level 2, Lead Infiltrator level 4, nonviolent aim, capstone, neutral. |
| **Total exact Q1 IDs** | **32** | Source Q1 IDs remain unchanged; prefixing with class identity avoids collisions. |

### Mentor Q2 introduction (draft)

> "Everybody loves a clever entrance. Getting out without a mess is usually harder. Your skills brought you this far. Which one do you want to trust when the plan gets ugly?"

**Q2 player question:** Which earlier skill do you want to remain central to your work as an Infiltrator?

### Three complete conditional six-answer fixtures

#### Fixture IN-1: `CA09` — moving through guarded positions

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `stealth` | I have practiced moving without drawing attention. I want that quiet discipline to guide how I cross guarded ground. |
| B | `tacticalAwareness` | I have learned to spot a sentry’s blind spots. I want that observation to matter more than speed alone. |
| C | `deceptionMastery` | I have developed ways to appear unremarkable. I want that skill to support an approach that avoids open confrontation. |
| D | `evasion` | I have learned to leave danger before it closes around me. I want that instinct to shape both entry and escape. |
| E — alternative | Different direction | I have relied on hiding. I want to discover whether there are times when a convincing presence serves me better. |
| F — undecided | No directional bias | I want to move through guarded positions, but have not chosen which earlier strength should guide me. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture IN-2: `BS02` — Spynet information contacts

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `informationControl` | I have learned to organize information others overlook. I want that discipline to make any intelligence network useful. |
| B | `networkInfluence` | I have documented relationships I can draw upon. I want to learn how to use those connections responsibly. |
| C | `knowledgeMastery` | I have spent time learning how institutions and people behave. I want that understanding to help me evaluate reports. |
| D | `deceptionMastery` | I have practiced keeping sensitive intentions private. I want that judgment to shape how I work with informants. |
| E — alternative | Different direction | I have mostly relied on what I could learn alone. I want to see how a network changes my methods. |
| F — undecided | No directional bias | I am interested in intelligence contacts, but do not know which earlier ability should shape the work. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture IN-3: `ID02` — Infiltrator as enduring vocation

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `stealth` | I have trained to move unseen. I want to refine that discipline within the calling I have chosen. |
| B | `informationControl` | I have learned to collect facts before taking action. I want that caution to endure as I grow. |
| C | `reactionDefense` | I have practiced reacting to threats without panic. I want that composure to stay with me. |
| D | `skillUtility` | I have developed more than one practical skill. I want adaptability to remain part of my craft without needing another title. |
| E — alternative | Different direction | I have reached this profession, but that does not mean every earlier method must remain unchanged. |
| F — undecided | No directional bias | I know I want to remain an Infiltrator. I am still considering which established strength to carry forward. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

### Source and narrative guardrails

1. The existing class record literally includes `"Bothan SpyNet"` as a talent-tree ID next to UUIDs; normalize through V2 authority.
2. Spynet Agent eligibility is Bothan species OR the required two Infiltration talents; source/campaign gates still apply.
3. Unarmed Stun starts at class level 2 and Lead Infiltrator at 4; neither is an entry-level talent.
4. Delta’s voice can be cocky and teasing, but she must not declare the actor an assassin, past killer, or member of her own squad.

## 43. Master Privateer — The Captain Q2 synthesis

**Q1 source:** prestige Q1 §26; **count:** 39.

### Full Q1 family-to-Q2 route coverage

| Q1 source family (original IDs) | Count | Q2 synthesis meaning |
|---|---:|---|
| **Infamy** — `IF01–IF11` | 11 | Reputation and leverage, with no asserted actual reputation or crew. |
| **Spacer** — `SP01–SP07` | 7 | Shipboard operation, escape, close quarters; do not assume a personal vessel, shipboard crew or Hyperdriven scaling. |
| **Privateer** — `PV01–PV09` | 9 | Boarding, non-destructive captures, lieutenant, mixed weapons; Attract Privateer nonheroic-lieutenant conditions. |
| **Piracy** — `PY01–PY07` | 7 | Raiding and ship handling; source expansions and morality/commission context remain distinct. |
| **Feature / identity / neutral** — `CF01`, `CF02`, `ID01`, `ID02`, `NEUTRAL` | 5 | Piracy as restriction at entry; Veteran Privateer begins at level 2; career capstone or neutral. |
| **Total exact Q1 IDs** | **39** | Source Q1 IDs remain unchanged; prefixing with class identity avoids collisions. |

### Mentor Q2 introduction (draft)

> "A fine ship cannot replace judgment, and a fine reputation cannot steer you clear of trouble. You have experience that brought you to this threshold. Which part deserves a place at the helm of your next decision?"

**Q2 player question:** Which strength from your earlier career will you bring into your privateering identity?

### Three complete conditional six-answer fixtures

#### Fixture MP-1: `PV07` — taking prizes without destroying vessels

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `accuracy` | I have practiced placing attacks where they matter. I want that control to help preserve a vessel worth taking. |
| B | `pilotMastery` | I have learned to maneuver a vehicle under pressure. I want that judgment to support a careful capture. |
| C | `tacticalAwareness` | I have trained to recognize when an enemy can no longer resist effectively. I want that awareness to guide restraint. |
| D | `allySupport` | I have learned to coordinate efforts with others. I want that cooperation to matter when an objective must be preserved. |
| E — alternative | Different direction | I have relied on destroying threats quickly. I want to learn whether a more selective approach serves this role better. |
| F — undecided | No directional bias | I want to preserve valuable prizes, but have not decided which earlier strength will lead me there. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture MP-2: `IF11` — building favors across ports

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `networkInfluence` | I have developed real connections in different places. I want those relationships to remain useful when circumstances change. |
| B | `persuasionMastery` | I have practiced finding terms people can accept. I want that skill to matter beyond a single negotiation. |
| C | `resourceControl` | I have learned to manage supplies and obligations. I want that judgment to help me honor the favors I ask for. |
| D | `informationControl` | I have trained to recognize what information is valuable. I want that care to shape how I use contacts. |
| E — alternative | Different direction | I have preferred working through my own skills. I want to test whether other people can become part of my strength. |
| F — undecided | No directional bias | I want connections in many ports, but have not chosen which earlier discipline should shape them. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

#### Fixture MP-3: `ID02` — privateer career as destination

**Actor fixture:** hypothetical character with *separately verified* sources for each A–D mechanical key. No Q1 statement, class eligibility or Mentor prose serves as proof of ownership. These are conditional editorial examples, not an unconditional six-option UI slate.

| Slot | Evidence key (internal) | First-person player response |
|---|---|---|
| A | `spacefarerMastery` | I have developed practical experience working in space. I want that knowledge to remain central to the life I have chosen. |
| B | `pilotMastery` | I have practiced handling vehicles under pressure. I want to keep refining that control within this calling. |
| C | `allySupport` | I have learned to help the people beside me succeed. I want that cooperation to remain important, whatever our future brings. |
| D | `resourceControl` | I have practiced working within limited supplies. I want that discipline to guide me without chasing another title. |
| E — alternative | Different direction | I have reached the career I wanted, but I can still rethink which old habits deserve a place in it. |
| F — undecided | No directional bias | I want to remain a privateer. I have not decided which earlier strength should define how I do the work. |

**Acceptance check:** Every A–D line is suppressed or rewritten if its observed build evidence is absent; E does not silently revise an earlier career goal, and F adds no newly inferred preference.

### Source and narrative guardrails

1. Printed `Piracy` class feature is a *restriction* on further class levels if lost to the dark side, not a mechanical reward of loot.
2. `Veteran Privateer` begins at class level 2; no guaranteed earlier engagements or commission from class choice.
3. `Attract Privateer` does not supply a free heroic PC companion; printed nonheroic lieutenant and XP-sharing rules apply.
4. The original source requirement cites Spacehound, while later class registry descriptions may say Spacer. Check exact printed entry.
5. The Captain’s colorful privateering voice is not proof of the player owning a ship, a crew, a letter of marque or prior prizes.

## 44. v0.6 validation and unresolved implementation authority

- **Structural checks:** every inventoried source Q1 ID in the five class route maps is distinct *within its class* and has exactly one family assignment; **157** candidate IDs are represented. The authoring pass contains **15 complete A–F fixtures** = **90 first-person example responses**, including 4 evidence-dependent substantive statements in each.
- **Actual actor tests:** none in Foundry v13. No fixture should be presented verbatim without a validated current actor snapshot and true mechanical provenance for each A–D key. In particular, some fixtures intentionally posit rare existing strengths (e.g., `sithAlchemy`, `forceBond`, `dualistMastery`, `corporateInfluence`) and are valid only when confirmed.
- **Selection state:** Q1 finalized selection and validated actor snapshot must be frozen for Q2; back-navigation invalidates/recomputes candidate evidence deterministically; only committed Q2 answer creates new player-intent evidence.
- **Source-of-truth:** existing V2 mechanical rules and owned-item IDs govern the current build; the printed books constrain legal meaning. Do not use Q1 talent anchors to grant or retroactively claim an ability.
- **Quarantine and access discrepancies:** remain upstream canonical authority work. Q2 must surface intent honestly without functioning as a new eligibility engine or hiding a broken class/talent access list behind invented fallbacks.
- **Q1–Q6 separation:** Q2 does not reteach class talents (Q1), test hypothetical behavior (Q3), dictate Dip/Dive/Swim (Q4), decide next careers (Q5), or perform Mentor identity correction (Q6).
- **Approval state:** Mentor lines, player answers, exact score-to-evidence projection, A–F presentation and canonical ontology mappings remain **draft**; no GitHub commit or push.

---

## 45. Prestige Q2 -- six-class editorial expansion (v0.7)

**Scope:** Saboteur, Outlaw, Droid Commander, Military Engineer, Vanguard, Martial Arts Master. This addendum preserves all preceding v0.6 material, Q1 candidate IDs and the existing 125-key mechanical-bias vocabulary. It does not change the current Foundry system, create scores, confer class talents, certify quarantined source records, or approve the response-count/presentation policy.

**Review basis:** Pinned prestige Q1 rolling design (`docs/design/SWSE_Prestige_Survey_Rolling_Design.md`, GitHub ref `0f56de3a4d33c8a5c635d47e3c612e501797a0a4`), class level-progressions in `packs/classes.db`, and dedicated Mentor JSONs. Printed-source statements below are inherited from the earlier Q1 source audits, not a new complete page-by-page certification.

**Q2 contract:** The selected Q1 answer tells the system what future prestige capability interests the character; Q2 identifies what part of the character's *actually owned and demonstrated mechanical build* the player wishes to carry into that capability. A-D are four distinct, evidence-supported possibilities, E is an alternative emphasis, F is undecided. When fewer than four strengths are supported, show fewer evidence-backed choices or approved truthful rephrasings; never fabricate prior training. Class eligibility is not proof of experience. Previous survey declarations remain explicit historical intent and are not automatically transformed into owned feats, talents or achievements.

### 45.1 Source inventory and scope

| Class | Mentor | Q1 routes | Q1 book |
|---|---|---:|---|
| Saboteur | Spark | 43 | The Force Unleashed Campaign Guide, pp. 55-57 |
| Outlaw | Rogue | 32 | Scum and Villainy, pp. 34-35 |
| Droid Commander | General Axiom | 30 | Clone Wars Campaign Guide, pp. 42-44 |
| Military Engineer | Chief Engineer Rax | 18 | Clone Wars Campaign Guide, pp. 44-46; Starships of the Galaxy Outlaw Tech |
| Vanguard | Shield Captain Theron | 24 | Clone Wars Campaign Guide, pp. 46-47 |
| Martial Arts Master | Master Zhen | 27 | Galaxy at War, pp. 32-33 |
| **New tranche** | **6 Mentors** | **174** | Six separate prestige identities |

The original Q1 IDs are **class-scoped editorial identifiers**, not canonical talent IDs. For example `MF01`, `ID02`, and `CF01` may also appear under another prestige class. Preserve the class identifier plus exact Q1 editorial ID together. A Q1 route may be known historically while its corresponding talent remains source-quarantined; the route table does not grant entitlement.

## 46. Saboteur -- Spark Q2 synthesis

**Q1 authority:** pinned prestige Q1 section 26 / 6. **Candidate Q1 routes:** 43. **Source:** The Force Unleashed Campaign Guide, pp. 55-57. **Status:** Editorial only.

### Full Q1 family-to-Q2 route coverage

| Original Q1 family and exact ID range | Number | Q2 editorial synthesis purpose |
|---|---:|---|
| **Misfortune** -- `MF01` - `MF17` (all consecutive IDs) | 17 | Exploit openings and disrupt opponents; do not infer a prior successful ambush or social manipulation. |
| **Slicer** -- `SL01` - `SL07` (all consecutive IDs) | 7 | Computers, access and electronic disruption; require observed Use Computer or real owned technical rules. |
| **Sabotage** -- `SB01` - `SB06` (all consecutive IDs) | 6 | Devices, controlled explosives and jamming; actual demonstrated engineering is separate from desired new talents. |
| **Turret** -- `TU01` - `TU06` (all consecutive IDs) | 6 | Automated/emplaced technical effects; no presumption of an installed turret or its prerequisites. |
| **Features and identity** -- `CF01`, `CF02`, `CF03`, `CF04`, `ID01`, `ID02`, `NEUTRAL` | 7 | Unexpected Results at level 1; later Destructive/Quick Sabotage/Master Saboteur interests, character mission, career capstone and neutral. |
| **Total source Q1 IDs** | 43 | All source Q1 candidate IDs accounted for exactly once. |

### Proposed Mentor Q2 introduction

> Oh, this part is fun. You have got training, habits, and a few ways of solving problems already. Good sabotage is knowing exactly which one to use before you touch the system. Which strength are you bringing to the workbench?

**Question:** Which established skill will give your sabotage its particular precision?

### Three conditional A-F editorial dialogue fixtures

#### SB-1: Q1 `SB02` -- shaping an explosion to limit collateral damage

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `explosiveMastery` | I have practiced measuring the effects of a charge. I want that precision to govern where a blast goes. |
| B | `engineeringMastery` | I have learned where machines are most vulnerable. I want that understanding to help me disable exactly what matters. |
| C | `tacticalAwareness` | I have trained to recognize the cost of an attack beyond its target. I want that judgment to set the limits of my sabotage. |
| D | `allySupport` | I have developed ways to work around other people safely. I want that habit to keep allies out of the damage I cause. |
| E -- alternative | New emphasis; not claimed as owned | I want to learn restraint in demolition even if it has not been one of my established strengths. |
| F -- undecided | No new directional inference | I want to control the direction of a blast, but I have not chosen which existing strength should lead that work. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### SB-2: Q1 `TU04` -- stun turret rather than lethal fire

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `technicalInnovation` | I have built solutions for unusual technical problems. I want that inventiveness to support nonlethal defenses. |
| B | `hackingSkills` | I have practiced directing computerized systems. I want that control to make automated protection more selective. |
| C | `tacticalSupport` | I have trained to give allies a safer position to act from. I want a defensive turret to serve that same goal. |
| D | `mechanicalMastery` | I have learned to keep machinery performing under stress. I want that reliability to matter in temporary deployments. |
| E -- alternative | New emphasis; not claimed as owned | I want to explore automated restraint rather than rely only on destructive devices. |
| F -- undecided | No new directional inference | I am interested in a nonlethal turret, but I have not chosen which existing skill should define its use. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### SB-3: Q1 `ID02` -- sabotage as a completed career goal

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `sabotageExpertise` | I have developed methods for disabling systems. I want to keep refining that craft without needing another title. |
| B | `technicalMastery` | I have learned how equipment responds to intervention. I want that knowledge to remain central to my work. |
| C | `improvisation` | I have practiced creating a solution with imperfect resources. I want to remain adaptable within the career I chose. |
| D | `resourcefulness` | I have learned to get results without ideal tools. I want that judgment to define the specialist I keep becoming. |
| E -- alternative | New emphasis; not claimed as owned | I want this to remain my profession while changing some of the habits that brought me into it. |
| F -- undecided | No new directional inference | I see sabotage as my calling, but I have not chosen which earlier strength should define my continued growth. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

### Publication and identity guardrails

1. Unexpected Results begins at Saboteur 1; Destructive at 2, Quick Sabotage at 4/6/8, Master Saboteur at 10. Never recast later features as already held.
2. Turret upgrade lines have actual Blaster Turret chains, encounter limits, and range requirements; do not invent owned machines or fabricate deployed assets.
3. Droid Jammer has the printed restraining-bolt-immunity exception. Equipment/droid/vehicle targeting must use canonical V2 mechanical data; the survey is not an effect engine.
4. Spark is precise, excitable, and concerned with selective impact, not indiscriminate destruction. Repeated short words and overexcited cruelty should not displace technical care.

## 47. Outlaw -- Rogue Q2 synthesis

**Q1 authority:** pinned prestige Q1 section 27.2. **Candidate Q1 routes:** 32. **Source:** Scum and Villainy, pp. 34-35. **Status:** Editorial only.

### Full Q1 family-to-Q2 route coverage

| Original Q1 family and exact ID range | Number | Q2 editorial synthesis purpose |
|---|---:|---|
| **Outlaw** -- `OL-OL01` - `OL-OL08` (all consecutive IDs) | 8 | Reactive movement, team openings and escape; class talent interest, not a narrated capture or escape. |
| **Fringer** -- `OL-FR01` - `OL-FR09` (all consecutive IDs) | 9 | Four source-supported Fringer directions; five repo-only/mis-tree entries quarantined. |
| **Survivor** -- `OL-SV01` - `OL-SV04` (all consecutive IDs) | 4 | Resilience, terrain and running; distinguish owned talents from plain character speed. |
| **Slicer** -- `OL-SL01` - `OL-SL07` (all consecutive IDs) | 7 | Six source-supported digital options; Virus remains quarantined. |
| **Feature and identity** -- `OL-CF01`, `OL-ID01`, `OL-ID02`, `OL-NEUTRAL` | 4 | Fugitive begins at level 2; non-criminalized resistance intentions, settled vocation or indecision. |
| **Total source Q1 IDs** | 32 | All source Q1 candidate IDs accounted for exactly once. |

### Proposed Mentor Q2 introduction

> A wanted notice tells you what the authorities think. Boring reading. Your actual skills tell me how you might stay free. Which part of what you already know are you going to trust when the exits start disappearing?

**Question:** Which strength you have already developed should shape how you keep your freedom?

### Three conditional A-F editorial dialogue fixtures

#### OL-1: Q1 `OL-OL06` -- using openings created by allies

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `allySupport` | I have practiced coordinating my efforts with other people. I want that cooperation to matter when a narrow opening appears. |
| B | `accuracy` | I have developed a careful approach to attacks. I want to make a brief opening count without wasting a shot. |
| C | `tacticalAwareness` | I have learned to read the moment a target becomes exposed. I want that judgment to guide my response. |
| D | `reactionDefense` | I have practiced responding quickly to unexpected threats. I want to use that readiness when an ally creates a chance. |
| E -- alternative | New emphasis; not claimed as owned | I want to experiment with cooperative fighting even if my earlier work emphasized independence. |
| F -- undecided | No new directional inference | I like the idea of taking advantage of an ally-created opening, but I have not settled on the strength I would draw from. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### OL-2: Q1 `OL-SL02` -- forged electronic credentials

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `hackingSkills` | I have practiced working with protected computer systems. I want those skills to make the identity I present harder to question. |
| B | `deceptionMastery` | I have learned how to maintain a believable account. I want that care to extend to the records others inspect. |
| C | `identityShift` | I have developed methods of adopting different outward identities. I want digital evidence to support that work when appropriate. |
| D | `informationControl` | I have learned which details in a record draw attention. I want to choose what a security check can actually reveal. |
| E -- alternative | New emphasis; not claimed as owned | I want to develop digital misdirection even if it is a new departure from the skills I used before. |
| F -- undecided | No new directional inference | I want forged credentials to be an option, but I have not decided which previous ability should support them. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### OL-3: Q1 `OL-ID02` -- staying free as the chosen career

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `survivalism` | I have learned to make it through harsh conditions. I want those habits to sustain the freedom I chose. |
| B | `resourcefulness` | I have practiced getting by without ideal supplies. I want that independence to remain part of my life. |
| C | `evasion` | I have trained to leave dangerous positions before they close. I want that control to matter more than any future title. |
| D | `freedomPursuit` | I have worked to make independent choices. I want that conviction to define this calling rather than a new rank. |
| E -- alternative | New emphasis; not claimed as owned | I intend to live on my terms, but I can still change the methods I use to stay free. |
| F -- undecided | No new directional inference | I know freedom is the destination. I am still deciding what earlier strength best expresses it. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

### Publication and identity guardrails

1. Quarantine OL-FR05 through OL-FR09 and OL-SL07. Do not count six uncertain tree names as certified mechanics or use them as source-supported Q2 evidence.
2. Printed entry requires wanted status in at least one star system, but no specific offense, prison escape, bounty size, or moral motive follows.
3. Disgrace/Misfortune are qualifying entry trees, not newly selectable Outlaw trees. Fugitive starts at Outlaw 2 and expands withdrawal movement, not base speed.
4. Rogue values defiance, autonomy, freedom and an amused challenge to authority without assuming a previously established personal relationship.

## 48. Droid Commander -- General Axiom Q2 synthesis

**Q1 authority:** pinned prestige Q1 section 28.2. **Candidate Q1 routes:** 30. **Source:** Clone Wars Campaign Guide, pp. 42-44. **Status:** Editorial only.

### Full Q1 family-to-Q2 route coverage

| Original Q1 family and exact ID range | Number | Q2 editorial synthesis purpose |
|---|---:|---|
| **Droid Commander** -- `DC-DCT01` - `DC-DCT08` (all consecutive IDs) | 8 | Network support and droid tactics; requires appropriate owned build evidence, not automatically existing troops. |
| **Inspiration** -- `DC-INS01` - `DC-INS07` (all consecutive IDs) | 7 | Rallying, coordination and support; existing talents are different from future prestige picks. |
| **Leadership** -- `DC-LEA01` - `DC-LEA11` (all consecutive IDs) | 11 | Team timing and command patterns; never fabricate droid subordinates, faction or battle record. |
| **Feature and identity** -- `DC-CF01`, `DC-ID01`, `DC-ID02`, `DC-NEUTRAL` | 4 | Networked Mind begins at level 2; independent allegiance, lifelong command, neutral. |
| **Total source Q1 IDs** | 30 | All source Q1 candidate IDs accounted for exactly once. |

### Proposed Mentor Q2 introduction

> <Assessment: Class eligibility observed.> Qualification describes permitted advancement, not command competence. Existing routines and training provide better evidence. Identify the capability you intend to retain as your command protocols advance.

**Question:** Which verified operational strength should underpin your droid command?

### Three conditional A-F editorial dialogue fixtures

#### DC-1: Q1 `DC-DCT01` -- sharing threat reports between droid allies

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `droidControl` | I have practiced coordinating droid systems. I want that technical understanding to help their observations become shared action. |
| B | `informationControl` | I have learned to turn multiple reports into useful priorities. I want that discipline to guide what the unit responds to. |
| C | `tacticalAwareness` | I have trained to recognize dangers before they reach the formation. I want that assessment to inform every warning. |
| D | `allySupport` | I have developed ways to improve other units performance. I want that support to remain central to my command method. |
| E -- alternative | New emphasis; not claimed as owned | I want my command methods to emphasize information sharing even if earlier strengths lay elsewhere. |
| F -- undecided | No new directional inference | I see the value in shared reports, but I have not selected the prior capability that should guide the network. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### DC-2: Q1 `DC-DCT07` -- moving networked droid units at the right moment

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `unitCoordination` | I have practiced aligning the actions of several allies. I want that timing to guide when a droid unit changes position. |
| B | `formation` | I have learned how positions reinforce one another. I want to preserve that coordination when the unit moves. |
| C | `commandAuthority` | I have developed ways to issue clear, useful direction. I want that clarity to matter when time is limited. |
| D | `rapidResponse` | I have trained to react before an opening disappears. I want that urgency to guide the units next move. |
| E -- alternative | New emphasis; not claimed as owned | I want to develop rapid unit movement even if my earlier capabilities were built for a different purpose. |
| F -- undecided | No new directional inference | I want to control the units timing, but I am undecided which established strength should inform my decisions. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### DC-3: Q1 `DC-ID02` -- droid command as an achieved calling

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `droidControl` | I have learned to work with droid systems. I want to keep refining that competence within the role I chose. |
| B | `allySupport` | I have developed ways to support others performance. I want that responsibility to matter more than accumulating titles. |
| C | `knowledgeMastery` | I have practiced studying the conditions behind a failed plan. I want that analysis to improve my future decisions. |
| D | `resourceControl` | I have learned to make limited assets serve a clear purpose. I want that discipline to remain central to command. |
| E -- alternative | New emphasis; not claimed as owned | I want droid command to remain my profession while reconsidering the methods I will emphasize. |
| F -- undecided | No new directional inference | I want to keep refining this calling, but I have not chosen which established strength should define it. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

### Publication and identity guardrails

1. The player character must be a droid and meet the printed trained Knowledge (tactics), Use Computer, and Leadership/Commando qualification. Prerequisite talent sources do not become selectable class trees.
2. Networked Mind begins at class level 2 and requires selected droid allies/communications; it is not a level-1 grant, universal always-on mind-affecting bypass, or free squad.
3. Automated Strike depends on relevant Double Attack; Droid Mettle, Overclocked Troops and Reinforced Commands require Droid Defense; additional chain restrictions apply.
4. General Axiom speaks as a cold tactical assessor. Do not confuse this Mentor with Seraphim: unit efficiency is not the same characterization as personal droid self-ownership.

## 49. Military Engineer -- Chief Engineer Rax Q2 synthesis

**Q1 authority:** pinned prestige Q1 section 28.3. **Candidate Q1 routes:** 18. **Source:** Clone Wars Campaign Guide, pp. 44-46; Starships of the Galaxy Outlaw Tech. **Status:** Editorial only.

### Full Q1 family-to-Q2 route coverage

| Original Q1 family and exact ID range | Number | Q2 editorial synthesis purpose |
|---|---:|---|
| **Military Engineer** -- `ME-ENG01` - `ME-ENG10` (all consecutive IDs) | 10 | Rapid repair, controlled breaching, droid support and temporary technical effects. |
| **Outlaw Tech** -- `ME-OT01` - `ME-OT04` (all consecutive IDs) | 4 | Modification, electronic access and improvised repair; actual past equipment must be established. |
| **Feature and identity** -- `ME-CF01`, `ME-ID01`, `ME-ID02`, `ME-NEUTRAL` | 4 | Field-Created Weapon starts at 2; repair vocation, terminal career and undecided. |
| **Total source Q1 IDs** | 18 | All source Q1 candidate IDs accounted for exactly once. |

### Proposed Mentor Q2 introduction

> A machine has a failure point. So does an operation. Your record indicates several possible responses, but an engineer must know which methods can be trusted. Which of your established skills belongs at the center of this work?

**Question:** Which existing technical strength should define your battlefield engineering?

### Three conditional A-F editorial dialogue fixtures

#### ME-1: Q1 `ME-ENG01` -- repairing systems during a battle

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `engineeringMastery` | I have practiced diagnosing mechanical failure. I want that judgment to shape the repairs that cannot wait. |
| B | `mechanicalMastery` | I have trained to work with stressed machinery. I want to keep a critical system working long enough to matter. |
| C | `droidControl` | I have learned how droid systems respond to intervention. I want that understanding to support urgent field repairs. |
| D | `tacticalSupport` | I have developed ways to keep others operational. I want rapid repair to serve that same responsibility. |
| E -- alternative | New emphasis; not claimed as owned | I want to become a field repair specialist even if most of my earlier training served other needs. |
| F -- undecided | No new directional inference | I want to make urgent repairs, but I have not chosen which earlier skill should guide the work. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### ME-2: Q1 `ME-ENG04` -- placing charges to change terrain

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `explosiveMastery` | I have practiced controlling explosive effects. I want to use that precision to change a route rather than just cause damage. |
| B | `tacticalAwareness` | I have trained to anticipate what a changed battlefield will do to movement. I want that judgment to govern placement. |
| C | `fortifications` | I have learned how cover and barriers shape a position. I want to understand how to open or close those routes deliberately. |
| D | `technicalInnovation` | I have built devices for unusual constraints. I want that inventiveness to make each charge serve a precise purpose. |
| E -- alternative | New emphasis; not claimed as owned | I want to learn controlled breaching even if demolition has not been my established specialty. |
| F -- undecided | No new directional inference | I am interested in reshaping terrain, but unsure which existing strength should drive the plan. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### ME-3: Q1 `ME-ID02` -- field engineering as a permanent career

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `engineeringMastery` | I have invested in solving technical problems. I want to keep advancing that craft rather than chase a different title. |
| B | `resourcefulness` | I have learned to adapt when supplies are limited. I want that judgment to remain useful throughout this vocation. |
| C | `allySupport` | I have developed habits that help others stay effective. I want my engineering to preserve that advantage. |
| D | `knowledgeMastery` | I have practiced studying how systems fail. I want that habit of learning to stay with me. |
| E -- alternative | New emphasis; not claimed as owned | I have chosen this profession, but I am willing to replace older methods that no longer work. |
| F -- undecided | No new directional inference | I intend to remain a field engineer. I have not selected the existing strength that should define my approach. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

### Publication and identity guardrails

1. Published entry is BAB +7 plus trained Mechanics and Use Computer; not merely a generic level 7 gate or mandatory army affiliation.
2. Field-Created Weapon begins at level 2; the improvised item has use, proficiency, equipment/value and encounter-end restrictions, not permanent inventory ownership.
3. Quick Modifications requires Repairs on the Fly and Tech Specialist. Droid Expert requires Repairs on the Fly. Tech Savant has Knowledge (technology) training gating.
4. Rax is clinical, mathematical and preparatory. He is distinct from Spark, whose enthusiasm for precision sabotage is part of the established personality.

## 50. Vanguard -- Shield Captain Theron Q2 synthesis

**Q1 authority:** pinned prestige Q1 section 28.4. **Candidate Q1 routes:** 24. **Source:** Clone Wars Campaign Guide, pp. 46-47. **Status:** Editorial only.

### Full Q1 family-to-Q2 route coverage

| Original Q1 family and exact ID range | Number | Q2 editorial synthesis purpose |
|---|---:|---|
| **Vanguard** -- `VG-VGT01` - `VG-VGT08` (all consecutive IDs) | 8 | Advance warning, concealment, target marking, support and precision; distinguish protection from stationary tanking. |
| **Awareness** -- `VG-AW01` - `VG-AW08` (all consecutive IDs) | 8 | Detect threats early, track and react; require real training or owned mechanical evidence. |
| **Survivor** -- `VG-SV01` - `VG-SV04` (all consecutive IDs) | 4 | Traversal, defense, speed and terrain; do not invent past wilderness missions. |
| **Feature and identity** -- `VG-CF01`, `VG-ID01`, `VG-ID02`, `VG-NEUTRAL` | 4 | Surprise Attack begins at 2; service, long-term recon vocation and neutral. |
| **Total source Q1 IDs** | 24 | All source Q1 candidate IDs accounted for exactly once. |

### Proposed Mentor Q2 introduction

> The warning that reaches home matters more than the brave stand nobody hears about. You have earned a place forward of the line. Which strength from your earlier training will help you see the danger, survive it, and report it?

**Question:** Which strength from your established training should guide your forward reconnaissance?

### Three conditional A-F editorial dialogue fixtures

#### VG-1: Q1 `VG-VGT05` -- detecting concealed enemies before danger reaches the unit

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `trackingMastery` | I have practiced reading signs others miss. I want that observation to guide my forward reconnaissance. |
| B | `stealth` | I have learned to stay unnoticed when moving through dangerous areas. I want that discipline to help me observe without exposing others. |
| C | `tacticalAwareness` | I have trained to see how a threat might develop. I want that anticipation to turn observation into useful warning. |
| D | `allySupport` | I have developed ways to help other people prepare. I want my reports to make their decisions safer. |
| E -- alternative | New emphasis; not claimed as owned | I want to make reconnaissance central even if my earlier strengths were built for direct confrontation. |
| F -- undecided | No new directional inference | I want to detect threats sooner, but I am still deciding which established discipline should guide me. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### VG-2: Q1 `VG-VGT02` -- opening a protected enemy for an ally

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `accuracy` | I have practiced careful ranged attacks. I want that precision to help an ally exploit the right moment. |
| B | `tacticalSupport` | I have trained to create useful openings for others. I want that cooperation to shape my first strike. |
| C | `infiltration` | I have learned to approach targets without drawing attention. I want that positioning to improve what follows. |
| D | `formation` | I have practiced keeping allied positions coordinated. I want that awareness to matter when the unit attacks together. |
| E -- alternative | New emphasis; not claimed as owned | I want to focus on setting up allied attacks rather than measuring success only by my own damage. |
| F -- undecided | No new directional inference | I want my attacks to help allies, but I have not chosen which existing strength should support that role. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### VG-3: Q1 `VG-ID02` -- reconnaissance as a lasting vocation

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `survivalSkills` | I have learned how to travel and survive in uncertain conditions. I want that knowledge to remain central to my work. |
| B | `reactionDefense` | I have practiced reacting to danger before it escalates. I want that readiness to keep me able to report back. |
| C | `trackingMastery` | I have trained to follow subtle signs. I want to keep refining that skill without seeking another title. |
| D | `allySupport` | I have learned to prepare others for trouble. I want that contribution to define my service. |
| E -- alternative | New emphasis; not claimed as owned | I want to remain a Vanguard, but I may need to rethink the habits that brought me here. |
| F -- undecided | No new directional inference | I want reconnaissance to be my career. I am not sure which of my earlier strengths should define it. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

### Publication and identity guardrails

1. Published Camouflage/Commando talent requirements qualify entry; they are not Vanguard selectable class trees. Those are Vanguard/Awareness/Survivor.
2. Surprise Attack begins at class level 2 and modifies the first qualifying attack roll of each round against appropriate unaware/flat-footed targets, not damage or all attacks.
3. Theron is a steadfast protector but the source Vanguard class is a forward scout and intelligence role. Do not turn every Q2 into holding a defensive wall.
4. Neither entering Vanguard nor Theron narration demonstrates the character commands scouts, has survived missions, or holds any particular faction rank.

## 51. Martial Arts Master -- Master Zhen Q2 synthesis

**Q1 authority:** pinned prestige Q1 section 29. **Candidate Q1 routes:** 27. **Source:** Galaxy at War, pp. 32-33. **Status:** Editorial only.

### Full Q1 family-to-Q2 route coverage

| Original Q1 family and exact ID range | Number | Q2 editorial synthesis purpose |
|---|---:|---|
| **Awareness** -- `MAM-AW01` - `MAM-AW08` (all consecutive IDs) | 8 | Observation, initiative and danger sense; source by actor features, not inferred completed training. |
| **Martial Arts Forms** -- `MAM-MF01` - `MAM-MF07` (all consecutive IDs) | 7 | Named expertise in unarmed schools, distinct from assumed cultural tradition/feats. |
| **Unarmed Mastery** -- `MAM-UM01`, `MAM-UM02`, `MAM-UM03` | 3 | Repeated unarmed blows and precision; no automatically held technique. |
| **Master of Teras Kasi - RULES QUARANTINE** -- `MAM-TK01` - `MAM-TK05` (all consecutive IDs) | 5 | Class entitlement is published, but all five individual talent effects lack fully verified printed rules. Keep editorial/Q1 historical route, no certified effect. |
| **Feature and identity** -- `MAM-CF01`, `MAM-ID01`, `MAM-ID02`, `MAM-NEUTRAL` | 4 | Tough as Durasteel begins at 2; self-reliant unarmed vocation, capstone or neutral. |
| **Total source Q1 IDs** | 27 | All source Q1 candidate IDs accounted for exactly once. |

### Proposed Mentor Q2 introduction

> A student may learn a form. A master must also learn which part of the self gives that form meaning. Look to the discipline you have already earned. Which strength will you allow to guide the hand when there is no weapon in it?

**Question:** Which proven discipline should shape your mastery of the empty hand?

### Three conditional A-F editorial dialogue fixtures

#### MAM-1: Q1 `MAM-MF03` -- disarming through an unarmed form

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `grappling` | I have practiced controlling an opponent at close range. I want that care to make a disarm deliberate rather than desperate. |
| B | `reactionDefense` | I have trained to respond when a strike comes toward me. I want that timing to keep my hands free and useful. |
| C | `unarmeddMastery` | I have developed discipline with unarmed strikes. I want to apply that control when taking away a weapon. |
| D | `tacticalAwareness` | I have learned to recognize the moment a weapon becomes exposed. I want that perception to govern when I act. |
| E -- alternative | New emphasis; not claimed as owned | I want to learn a disarming discipline even if my earlier training emphasized another kind of defense. |
| F -- undecided | No new directional inference | I want to learn to disarm an armed opponent, but I have not decided which existing strength should guide the form. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### MAM-2: Q1 `MAM-UM02` -- wearing down protection with repeated unarmed strikes

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `meleeDamage` | I have practiced making close-range strikes count. I want that strength to serve a disciplined unarmed approach. |
| B | `combatStamina` | I have trained to maintain my effort through extended exchanges. I want that endurance to inform every strike. |
| C | `accuracy` | I have developed care in placing attacks. I want repeated unarmed blows to remain measured instead of careless. |
| D | `combatAdaptability` | I have learned to adjust when the first attack fails. I want that adaptability to guide repeated attempts. |
| E -- alternative | New emphasis; not claimed as owned | I want to develop endurance against protected foes even if that has not been a strength of my current training. |
| F -- undecided | No new directional inference | I want to make unarmed strikes effective against protection, but have not chosen which proven discipline should lead. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

#### MAM-3: Q1 `MAM-ID02` -- the empty hand as the completed vocation

**Hypothetical actor:** four separately verified and distinct owned-build signal sources are assumed solely for this stress test. Actual presentation must omit or truthfully rewrite any A-D choice without evidence. Neither class entry, this Q1 aspiration, nor past survey intent verifies these strengths.

| Slot | Existing mechanical-bias key (developer-only) | First-person player answer |
|---|---|---|
| A | `unarmeddMastery` | I have trained to rely on unarmed techniques. I want to keep refining that discipline without chasing another title. |
| B | `combatFlow` | I have practiced moving from one action into the next without losing balance. I want that continuity to remain part of my art. |
| C | `reactionDefense` | I have developed defensive timing under pressure. I want that restraint to stay with me as I grow. |
| D | `combatAdaptability` | I have learned to adjust my methods when an opponent changes. I want that openness to remain central to this calling. |
| E -- alternative | New emphasis; not claimed as owned | I want my long-term vocation to remain the empty hand, though the methods I use may change. |
| F -- undecided | No new directional inference | I intend to keep learning this discipline. I have not decided which earlier strength should define it. |

**Acceptance:** A-D are conditional on real actor evidence; E expresses a new perspective but does not automatically revoke a prior declared goal; F contributes no inferred positive or negative bias. Selecting any line records player intent only.

### Publication and identity guardrails

1. Martial Arts Master printed entry requires BAB +7; Martial Arts I/II and Melee Defense; one of eight named martial-arts Training feats; one Brawler/Survivor talent. No universal style grant from Q1.
2. The printed class grants the Master of Teras Kasi tree, but the full mechanical text for five indexed talents remains uncertified. Do not claim source-proven effects or import Elite Trooper tree access from this.
3. Tough as Durasteel begins at class level 2; it conditionally grants bonus HP after suitable unarmed damage in light/no armor. It is not automatic damage reduction.
4. Zhen is patient and contemplative; he is not Kharjo, whose unadorned technical swordsmanship has a different Mentor voice.

## 52. Validation, observed limits and next-source continuation

### Structural audit

- **Six new prestige classes:** Saboteur (43) + Outlaw (32) + Droid Commander (30) + Military Engineer (18) + Vanguard (24) + Martial Arts Master (27) = **174** source Q1 candidates. All are represented in the family-to-Q2 tables, with no duplicates within a class.
- **Eighteen conditional fixtures** = 18 x 6 first-person player responses = **108** responses; every fixture has four distinct developer-only mechanical-bias keys from the unchanged **125-key registry vocabulary**, plus E and F.
- **Cumulative editorial coverage:** previous checkpoint 20 classes / 934 Q1 routes + this tranche 6 classes / 174 Q1 routes = **26/32 classes and 1,108 Q1 routes**. Remaining 6 classes: Imperial Knight, Shaper, Assassin, Charlatan, Improviser, Pathfinder. These counts describe drafted routes, **not** certified rules options or implemented dialogue.
- **Source limitations:** Outlaw has 6 quarantined options (`OL-FR05` through `OL-FR09`, `OL-SL07`), and Martial Arts Master has 5 Teras Kasi talent descriptions not fully primary-source certified. They remain in the Q1 historical inventory but must not be presented as mechanically verified opportunities. Other conditional rules and prerequisites still apply.
- **Pending character-state interface:** The existing identity engine mixes observed mechanics and inferred intent. A valid Q2 read-only evidence layer must expose **owned feat/talent/skill/rule IDs and statuses**, filter pending selections and currently unavailable or superseded records, deduplicate closely related signals, and label the actor snapshot. This is a proposed interface requirement, not an implemented or newly scored authority.

### Required future live-actor fixtures

1. **Evidence scarcity:** One or two meaningful verified strengths produce one or two meaningful A-D responses, not invented third/fourth achievements; E and F remain.
2. **Pending prestige level:** Q1 interest is available before the new class level is finalized; Q2 does not phrase future level-2+ features as currently owned.
3. **Back-navigation:** Editing Q1 must invalidate and deterministically rebuild Q2 suggestions without changing owned build data or rewriting previous goals.
4. **Prestige + foundation history:** For a character with earlier base and prestige classes, actual owned talents remain valid regardless of how they were acquired, but class-specific future choices remain gated.
5. **Cross-domain testing:** A stealth-heavy Engineer, scholarly Outlaw, pacifist Saboteur, non-Separatist Droid Commander, nonmilitary Vanguard and non-Teras-Kasi martial artist all receive honest, class-specific options.
6. **Mentor separation:** Spark != Rax; Axiom != Seraphim; Theron is a reconnaissance protector rather than an immovable tank; Zhen != Kharjo. Keep Mentor characterizations source-grounded.
7. **Source quarantine:** A selected historically drafted Q1 route with uncertified talent provenance must not be used as evidence that the character owns the talent; published class eligibility, runtime owned state and Q1 interest remain separate.
8. **Neither Q2 nor Q5 forces a subsequent prestige class** if the current path is the character's chosen life ambition.
9. **Do not conflate unrelated concepts:** `unarmeddMastery` is a literal existing mechanical-bias key with that spelling, not an invitation to create a corrected alias or new ontology key during Q2 editorial work.

### Implementation blockers left open

- No validated read-only observed-strength evidence projection or A-D deduplication implementation was created. Current `IdentityEngine.computeObservedBehaviorBias()` returns aggregate biases, not the per-answer provenance needed to justify past-tense skill statements.
- Existing class-tree and source-certification gaps remain upstream V2 issues. No survey-local compatibility shims, fallback talent entitlements, feature grants, new weights or actor migration are proposed.
- The earlier written prestige Q2 mechanical-instruction specification has not been edited in GitHub; this synthesis replacement still needs explicit design-document signoff.
- Mentor wording, six-option example format, historical-survey precedence and ontology impact are editorial candidates. **No live Foundry test, GitHub commit or push has been performed.**

---

## 53. Final six prestige classes: editorial Q2 synthesis (v0.8)

**Scope:** Six final class-specific editorial expansions, followed by a whole-survey handoff and cross-class acceptance checklist. The v0.7 content above is preserved verbatim. No Q1 responses, Q3-Q6 decisions, source files, Suggestion Engine weights, archetypes, tags, Foundry actors or repository records are changed. Existing source status and unresolved mechanical issues retain precedence.

**Pinned Q1 source:** `docs/design/SWSE_Prestige_Survey_Rolling_Design.md` at commit `0f56de3a4d33c8a5c635d47e3c612e501797a0a4` (sections 30-31 and 33-37). **Read-only live metadata:** `packs/classes.db`, Mentor registry, and the six dedicated Mentor JSONs. The detailed canonical source audit was performed during the pinned Q1 pass; this Q2 continuation is not a new full rule-text certification.

| Class | Mentor | Q1 routes | Three A-F fixtures | Source issue emphasis |
|---|---|---:|---:|---|
| Imperial Knight | Dezmin | 48 | 3 | Dark-side-rejection voice, distinct Armor Mastery identities, even-level Force Technique |
| Shaper | Shaper Urza | 23 | 3 | Yuuzhan Vong-only, implant costs, no Force Points, later Shaper Hand |
| Assassin | Delta | 39 | 3 | GenoHaradan raw tree reference, poison/faction assumptions, Mark level 2 |
| Charlatan | Silvertongue Sela | 30 | 3 | Missing Fortune talent tree, Score/Swindle later features |
| Improviser | Lucky Jack | 19 | 3 | Temporary devices and Contraband timing |
| Pathfinder | Lead | 26 | 3 | Entry-tree versus class-tree separation, Create Cover level 2 |
| **TOTAL** | | **185** | **18** | Editor-only fixture coverage |

**Interpretation:** Each `A-D` slot below is a hypothetical response that can ONLY be shown if the pre-advancement actor snapshot provides evidence for its particular past-tense claim. Do not hardcode all four. `E` is a new priority not asserted as owned; `F` is undecided and supplies no directional inference. The displayed source Q1 interests are future-oriented whether or not their associated feature will eventually be legally selectable.

## 54. Imperial Knight -- Dezmin Q2 synthesis

**Q1 authority:** pinned section 30; **source:** Legacy Era Campaign Guide, printed pp. 43-45. **Draft Q1 candidate routes:** 48. **Repository class ID (read-only):** `ec505163e5647cc6`. **Status:** editorial, not a class-grant screen or verified actor-ready dialogue bank.

### Full Q1 family-to-Q2 route coverage

| Source Q1 family / exact answer IDs | Count | Q2 synthesis purpose / constraint |
|---|---:|---|
| **Armor Specialist** -- `IK-AR01` - `IK-AR06` (consecutive) | 6 | Armor use, resilience and defensive mobility; require real actor armor-related skill/talent/equipment evidence. |
| **Duelist** -- `IK-DU01` - `IK-DU11` (consecutive) | 11 | Measured lightsaber technique, precision, counters and restraint; do not assert unowned talents. |
| **Lightsaber Combat** -- `IK-LC01` - `IK-LC11` (consecutive) | 11 | Guarding, deflecting, accuracy and defensive reactions grounded in owned build. |
| **Knight's Armor** -- `IK-KA01` - `IK-KA05` (consecutive) | 5 | Armor/Force integration; separate same-name Armor Mastery source identity. |
| **Knight's Resolve** -- `IK-KR01` - `IK-KR05` (consecutive) | 5 | Loyalty expressed as defense of others; do not invent fellow Knights or personal missions. |
| **Future Force Techniques** -- `IK-FT01` - `IK-FT07` (consecutive) | 7 | An aspiration for an even-class-level future technique; not current ownership. |
| **Career identity, capstone, neutral** -- `IK-ID01`, `IK-ID02`, `IK-NEUTRAL` | 3 | Protective service; legitimate lifelong vocation; neutral direction. |
| **All Q1 IDs for Imperial Knight** | **48** | Each Q1 ID assigned exactly one editorial family; not one unique Q2 dialogue set per Q1 answer. |

### Proposed Mentor Q2 introduction

> An oath sets the direction of your service. It does not tell me which discipline you have relied upon to reach it. Consider what your training has actually taught you. What will you carry into the duties of an Imperial Knight?

**Question:** Which established strength do you want to bring into your service as an Imperial Knight?

### Three conditional A-F editorial fixtures

#### IK-1: Q1 `IK-KR02` -- protect an adjacent ally with lightsaber defense

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `reactionDefense` | I have trained to respond when an attack turns toward me. I want that timing to help protect someone at my side. |
| B | `allySupport` | I have developed ways to support allies when the pressure rises. I want that instinct to guide whom I defend. |
| C | `formMastery` | I have practiced disciplined control of my combat form. I want that precision to matter when guarding another person. |
| D | `armorMastery` | I have learned to make effective use of armor. I want that protection to keep me able to stand beside someone in danger. |
| E -- alternative | New direction, not owned | I want my next discipline to be protecting others, even if my previous training was mostly directed toward protecting myself. |
| F -- undecided | No new directional inference | I want to protect others, but I have not decided which of my established strengths should guide that duty. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### IK-2: Q1 `IK-KA03` -- channel Force discipline through armor in future training

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `armorMastery` | I have practiced moving and fighting in armor. I want that familiarity to be the foundation for deeper protection. |
| B | `damageReduction` | I have developed methods for enduring harmful blows. I want to carry that resilience into my armored defense. |
| C | `forceRecovery` | I have trained to recover and conserve my connection to the Force. I want that discipline to steady my defensive choices. |
| D | `tacticalAwareness` | I have learned to anticipate where danger will fall. I want to use that judgment before armor has to absorb the blow. |
| E -- alternative | New direction, not owned | I want to explore Force-guided armor even if my earlier strengths have little to do with equipment. |
| F -- undecided | No new directional inference | I am interested in improving armored protection, but I do not yet know which prior discipline should lead. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### IK-3: Q1 `IK-ID02` -- remain devoted to Imperial Knight service as the chosen career

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `formMastery` | I have invested in disciplined combat technique. I want to keep refining that craft in the service I chose. |
| B | `reactionDefense` | I have practiced protecting myself under pressure. I want that readiness to remain part of my responsibilities. |
| C | `allySupport` | I have learned ways to help those beside me. I want that support to be a lasting part of my vocation. |
| D | `tacticalAwareness` | I have trained to notice when an action creates unnecessary risk. I want that judgment to keep guiding my service. |
| E -- alternative | New direction, not owned | I want this oath and vocation to remain my destination, while allowing my methods to evolve beyond the strengths that got me here. |
| F -- undecided | No new directional inference | I intend to remain an Imperial Knight. I have not chosen which part of my past training should define that service. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

### Publication and identity guardrails

1. Printed Imperial Knight entry requires a specific sworn duty to Emperor Roan Fel. Do not infer a personal audience, assignment, mission, or an unrestricted generic Empire allegiance.
2. The source tradition rejects the dark side. Dezmin retains his measured honor-bound voice, but legacy gray-path dialogue is not canonical class instruction.
3. Armor Mastery in Armor Specialist and Knight's Armor has distinct rules/source identity; no name-based join.
4. Force Techniques are even-level feature choices, never automatically owned at level 1. Q1/Q2 aspiration does not confer armor, Force powers, or talent eligibility.

## 55. Shaper -- Shaper Urza Q2 synthesis

**Q1 authority:** pinned section 31; **source:** Legacy Era Campaign Guide, printed pp. 46-47. **Draft Q1 candidate routes:** 23. **Repository class ID (read-only):** `557e1a5ec72166fd`. **Status:** editorial, not a class-grant screen or verified actor-ready dialogue bank.

### Full Q1 family-to-Q2 route coverage

| Source Q1 family / exact answer IDs | Count | Q2 synthesis purpose / constraint |
|---|---:|---|
| **Advanced Medicine** -- `SH-AM01` - `SH-AM08` (consecutive) | 8 | Medical knowledge, treatment, healing and triage; distinguish living patients from devices. |
| **Implant** -- `SH-IM01` - `SH-IM05` (consecutive) | 5 | Optional temporary biotech enhancement with consent and a substantial persistent post-encounter cost. **[CONDITIONAL]** |
| **Shaper** -- `SH-SH01` - `SH-SH05` (consecutive) | 5 | Design, living-device repair, surgical technique and biotech mastery. |
| **Class features and career identity** -- `SH-CF01`, `SH-CF02`, `SH-ID01`, `SH-ID02`, `SH-NEUTRAL` | 5 | Shaper Lore at even levels, Shaper Hand at level 6, responsible craft, fulfillment, neutral direction. |
| **All Q1 IDs for Shaper** | **23** | Each Q1 ID assigned exactly one editorial family; not one unique Q2 dialogue set per Q1 answer. |

### Proposed Mentor Q2 introduction

> Every living design begins with what its maker already understands. Sometimes that knowledge comes from healing. Sometimes from a failed repair. Which part of your actual training will shape the work you do now?

**Question:** Which established discipline do you want to bring into your work with living technology?

### Three conditional A-F editorial fixtures

#### SH-1: Q1 `SH-SH01` -- stabilize damaged living technology

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `mechanicalMastery` | I have practiced diagnosing damaged equipment. I want that careful troubleshooting to guide repairs of living devices. |
| B | `healingMastery` | I have trained to treat injured living beings. I want that attention to fragile systems to inform how I mend biotechnology. |
| C | `knowledgeMastery` | I have studied complex systems before acting on them. I want that habit of learning first to shape every repair. |
| D | `resourcefulness` | I have learned to work with limited supplies. I want to bring that adaptability to living technology when ideal materials are unavailable. |
| E -- alternative | New direction, not owned | I want to become a specialist in living-device repair even if my previous strengths came from an entirely different field. |
| F -- undecided | No new directional inference | I want to repair living technology, but I am not yet sure what earlier skill should guide my approach. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### SH-2: Q1 `SH-IM02` -- offer a temporary precision implant to a willing subject

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `surgicalMastery` | I have trained to work carefully during delicate treatment. I want that discipline to inform any implant procedure. |
| B | `healingMastery` | I have learned to consider what happens to a patient after treatment. I want that judgment to matter before I offer an enhancement. |
| C | `allySupport` | I have developed ways to help others contribute under pressure. I want an enhancement to serve their needs, not my pride. |
| D | `technicalInnovation` | I have practiced adapting tools to a specific purpose. I want that precision to guide how I approach living implants. |
| E -- alternative | New direction, not owned | I want to explore implants as a new specialty, but only with a willing subject and full attention to the aftereffects. |
| F -- undecided | No new directional inference | I am interested in implant design, though I have not settled on which prior skill should inform the risks I accept. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### SH-3: Q1 `SH-ID02` -- make shaping the lifelong vocation

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `biologicalControl` | I have studied how biological systems respond to intervention. I want that understanding to define my craft. |
| B | `knowledgeMastery` | I have built my work around learning how complex things function. I want that curiosity to remain central. |
| C | `surgicalMastery` | I have practiced careful procedures where small mistakes matter. I want that precision to be a lasting standard. |
| D | `resourcefulness` | I have learned to make use of limited materials and opportunities. I want that ingenuity to stay with me as a shaper. |
| E -- alternative | New direction, not owned | I want shaping to remain my career, even if the methods that brought me here are not the methods I keep. |
| F -- undecided | No new directional inference | I have chosen this vocation. I am still deciding which established strength I want it to express. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

### Publication and identity guardrails

1. Printed Shaper entry is Yuuzhan Vong only, with Biotech Specialist and required trained skills. Do not make this a universal species-neutral option.
2. Shapers do not gain Force Points under the printed class exception. Never narrate Force-pool training as class-granted shaper capability.
3. Implants require willing adjacent living subjects and have a persistent -3 condition-track consequence afterward, with defined recovery; no cost-free boost.
4. Shaper Hand is a later level-6 physical/cultural option; Shaper Lore begins at level 2. No Q1/Q2 grant or assumed prior body modification.

## 56. Assassin -- Delta Q2 synthesis

**Q1 authority:** pinned section 34; **source:** Scum and Villainy, printed pp. 28-30; Malkite Poisoner in Threats of the Galaxy p. 13. **Draft Q1 candidate routes:** 39. **Repository class ID (read-only):** `74fa04f5afb5f6e1`. **Status:** editorial, not a class-grant screen or verified actor-ready dialogue bank.

### Full Q1 family-to-Q2 route coverage

| Source Q1 family / exact answer IDs | Count | Q2 synthesis purpose / constraint |
|---|---:|---|
| **Misfortune** -- `ASN-MI01` - `ASN-MI17` (consecutive) | 17 | Misdirection, movement, exposed targets and disruption without invented previous kills. |
| **Malkite Poisoner** -- `ASN-MP01` - `ASN-MP05` (consecutive) | 5 | Poison-themed talents; class tree grant is not faction membership, material possession, or permission to deploy a toxin. **[CONDITIONAL]** |
| **Assassin** -- `ASN-AS01` - `ASN-AS09` (consecutive) | 9 | Close-range sniping, movement, marked-target ambitions; Mark starts at class level 2. |
| **GenoHaradan** -- `ASN-GH01` - `ASN-GH04` (consecutive) | 4 | Manipulation and covert control; raw repo tree field has an unresolved literal ID. **[SOURCE_REFERENCE_BLOCKED]** |
| **Feature, vocation, neutral** -- `ASN-CF01`, `ASN-ID01`, `ASN-ID02`, `ASN-NEUTRAL` | 4 | Future Mark, precision/controlled-force ethic, capstone, or genuinely undecided. |
| **All Q1 IDs for Assassin** | **39** | Each Q1 ID assigned exactly one editorial family; not one unique Q2 dialogue set per Q1 answer. |

### Proposed Mentor Q2 introduction

> Yeah, the title sounds impressive. It also tells me almost nothing about how you work. So forget the reputation for a second. Which of the skills you actually brought here is the one you're counting on?

**Question:** Which strength from your existing training should guide your work as an Assassin?

### Three conditional A-F editorial fixtures

#### ASN-1: Q1 `ASN-AS04` -- take more deliberate precision shots

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `accuracy` | I have practiced placing a shot carefully. I want that discipline to remain the basis of my precision work. |
| B | `stealth` | I have trained to avoid drawing attention to my position. I want that restraint to shape when I take a shot. |
| C | `tacticalAwareness` | I have learned to watch how a situation changes before committing. I want that judgment to govern my timing. |
| D | `deadlyPrecision` | I have developed techniques for making openings count. I want that measured skill to inform my new specialization. |
| E -- alternative | New direction, not owned | I want careful long-range targeting to become my focus even if my previous training emphasized another approach. |
| F -- undecided | No new directional inference | I am interested in precision, but I have not decided which part of my existing training should support it. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### ASN-2: Q1 `ASN-MP03` -- learn specialized handling of fictional Malkite poisons

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `knowledgeMastery` | I have learned to study unfamiliar materials before using them. I want that habit to govern this specialized discipline. |
| B | `skillUtility` | I have trained to apply technical skills with care. I want that consistency when undertaking unfamiliar preparations. |
| C | `stealth` | I have practiced avoiding unnecessary attention. I want the same discipline in how I approach subtle methods. |
| D | `tacticalAwareness` | I have learned to consider the cost of a plan before acting. I want that judgment to shape whether I use this specialty at all. |
| E -- alternative | New direction, not owned | I want to explore this specialized branch of the trade without claiming that I already possess its training or materials. |
| F -- undecided | No new directional inference | I am interested in this specialization, but I do not yet know what part of my past experience should guide it. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### ASN-3: Q1 `ASN-ID02` -- assassination as a completed career milestone

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `infiltration` | I have practiced approaching difficult places without being noticed. I want to keep refining that method within this career. |
| B | `reactionDefense` | I have learned to react when a dangerous encounter turns against me. I want those instincts to remain central. |
| C | `tacticalAwareness` | I have trained to assess when action creates more danger than it solves. I want that judgment to define my professionalism. |
| D | `accuracy` | I have worked at making individual attacks count. I want that discipline to remain part of my craft. |
| E -- alternative | New direction, not owned | I have reached the work I intended to pursue. I want room to reconsider my methods without being pushed toward another title. |
| F -- undecided | No new directional inference | I want to remain in this career, but I have not chosen which earlier strength should define my approach. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

### Publication and identity guardrails

1. The published class tree GenoHaradan is valid as a source family, but raw `Assassin.system.talent_trees` contains the string `GenoHaradan` instead of the canonical source ID. Fix V2 reference authority before implementation.
2. Malkite Poisoner talent interest grants neither faction membership nor poisons, recipes, tools, targets, or existing application history.
3. Mark begins at Assassin level 2; Q1 `ASN-CF01` is a future ambition, not owned Mark or an acquired kill record.
4. Delta is sharp, streetwise, skeptical and darkly amused. A Q2 answer must not invent prior missions, contracts, kills, or mentorship with Delta.

## 57. Charlatan -- Silvertongue Sela Q2 synthesis

**Q1 authority:** pinned section 35; **source:** Scum and Villainy, printed pp. 30-32. **Draft Q1 candidate routes:** 30. **Repository class ID (read-only):** `8da58194b3d58041`. **Status:** editorial, not a class-grant screen or verified actor-ready dialogue bank.

### Full Q1 family-to-Q2 route coverage

| Source Q1 family / exact answer IDs | Count | Q2 synthesis purpose / constraint |
|---|---:|---|
| **Disgrace** -- `CHA-DG01` - `CHA-DG06` (consecutive) | 6 | Managing appearances, social disruption, plausible intent; distinguish entry sources and class access. |
| **Trickery** -- `CHA-TR01` - `CHA-TR06` (consecutive) | 6 | Distraction, feints, protected movement and false assumptions. |
| **Fortune** -- `CHA-FT01` - `CHA-FT13` (consecutive) | 13 | Luck, rerolls, unusual opportunity; PRINTED tree allowed but repo class-tree grant omitted. **[CANONICAL_ACCESS_BLOCKED]** |
| **Features and identity** -- `CHA-CF01`, `CHA-CF02`, `CHA-ID01`, `CHA-ID02`, `CHA-NEUTRAL` | 5 | Score begins at level 2; Swindle level 4; social ingenuity, lifelong con artistry and undecided. |
| **All Q1 IDs for Charlatan** | **30** | Each Q1 ID assigned exactly one editorial family; not one unique Q2 dialogue set per Q1 answer. |

### Proposed Mentor Q2 introduction

> Oh, I know what you'd like people to believe about you. That's the easy part. I'm more interested in which of your old skills you trust when the smile stops working. What are you taking with you?

**Question:** Which strength you have already developed should shape your work as a Charlatan?

### Three conditional A-F editorial fixtures

#### CHA-1: Q1 `CHA-TR04` -- turn deception into an opening for allies

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `deceptionMastery` | I have practiced controlling what others believe. I want that skill to help allies recognize the right opening. |
| B | `persuasionMastery` | I have developed ways to influence a conversation. I want that control to matter before a confrontation escalates. |
| C | `allySupport` | I have trained to improve other people's chances of success. I want my misdirection to serve them as well as me. |
| D | `socialManipulation` | I have learned to recognize what an opponent expects to hear. I want to use that insight to create a useful distraction. |
| E -- alternative | New direction, not owned | I want to build a new approach around social misdirection even if my earlier strengths were not conversational. |
| F -- undecided | No new directional inference | I want to distract opponents for others, but I have not decided which of my current strengths should support it. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### CHA-2: Q1 `CHA-FT08` -- seek a second chance at a difficult skill check

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `skillUtility` | I have practiced relying on a broad set of skills. I want that flexibility to matter when my first approach fails. |
| B | `resourcefulness` | I have trained to look for another option when a plan breaks. I want that habit to guide a second attempt. |
| C | `adaptability` | I have learned to change my approach without losing the goal. I want that flexibility to define how I handle failure. |
| D | `tacticalAwareness` | I have practiced spotting the moment to change tactics. I want that judgment before I press my luck again. |
| E -- alternative | New direction, not owned | I want to develop a luck-driven style even if my earlier successes came from careful preparation instead. |
| F -- undecided | No new directional inference | I am interested in luck, but I am not yet sure which established habit should guide when I rely on it. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### CHA-3: Q1 `CHA-ID02` -- make social ingenuity a complete career

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `conArtistry` | I have practiced making an apparent disadvantage work in my favor. I want that skill to stay central to my craft. |
| B | `networkInfluence` | I have developed relationships that help me navigate difficult situations. I want to rely on that social understanding. |
| C | `resourcefulness` | I have learned to find a way forward when the obvious route closes. I want that ingenuity to define my career. |
| D | `socialManipulation` | I have practiced reading the expectations of others. I want that awareness to remain part of how I operate. |
| E -- alternative | New direction, not owned | I want this trade to be my destination, but that does not mean I must keep relying on the same tricks forever. |
| F -- undecided | No new directional inference | I want to pursue this craft for its own sake. I have not chosen which part of my training should define it. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

### Publication and identity guardrails

1. Printed Charlatan talent access is Trickery, Disgrace AND Fortune. The repo class record omits Fortune; do not equate current broken tree access with printed source entitlement.
2. Disgrace, Influence and Lineage can qualify entry, but that does not make all three Charlatan selectable talent trees.
3. Score begins at level 2 and Swindle at level 4. Selecting an interest grants no credits, favors, free purchases, or skill rerolls.
4. Sela is warm, nimble and playful, not a confession that this actor has run any previous con, cheated someone, or been personally coached by her.

## 58. Improviser -- Lucky Jack Q2 synthesis

**Q1 authority:** pinned section 36; **source:** Rebellion Era Campaign Guide, printed pp. 41-43. **Draft Q1 candidate routes:** 19. **Repository class ID (read-only):** `db019dfbb271cdf6`. **Status:** editorial, not a class-grant screen or verified actor-ready dialogue bank.

### Full Q1 family-to-Q2 route coverage

| Source Q1 family / exact answer IDs | Count | Q2 synthesis purpose / constraint |
|---|---:|---|
| **Outlaw Tech** -- `IMP-OT01` - `IMP-OT04` (consecutive) | 4 | Adjusting, repairing and bypassing equipment; no presumed free tools. |
| **Procurement** -- `IMP-PR01` - `IMP-PR05` (consecutive) | 5 | Obtaining useful gear and supporting others; no assumed black-market connections. |
| **Improviser** -- `IMP-IM01` - `IMP-IM05` (consecutive) | 5 | Temporary devices, field repairs and situational adaptation; do not create lasting items. |
| **Features, identity and neutral** -- `IMP-CF01`, `IMP-CF02`, `IMP-ID01`, `IMP-ID02`, `IMP-NEUTRAL` | 5 | No Tools Required at level 1; Contraband later; craft as career, undecided. |
| **All Q1 IDs for Improviser** | **19** | Each Q1 ID assigned exactly one editorial family; not one unique Q2 dialogue set per Q1 answer. |

### Proposed Mentor Q2 introduction

> All right, look at what you've already got. That is the good stuff: the habits you rely on when the parts are wrong and the clock is worse. Which one are you bringing into this new line of work?

**Question:** Which existing skill should guide how you solve problems as an Improviser?

### Three conditional A-F editorial fixtures

#### IMP-1: Q1 `IMP-IM02` -- assemble a temporary device from available materials

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `mechanicalMastery` | I have practiced understanding how broken mechanisms fit together. I want that knowledge to guide improvised devices. |
| B | `improvisation` | I have learned to make the best of whatever materials are nearby. I want that adaptability to become a deliberate craft. |
| C | `technicalInnovation` | I have trained to solve problems in unconventional ways. I want that creativity to shape what I build. |
| D | `resourcefulness` | I have developed a habit of using limited supplies carefully. I want that discipline to keep my solutions practical. |
| E -- alternative | New direction, not owned | I want building temporary devices to be my new specialty even if my earlier skills were mostly nontechnical. |
| F -- undecided | No new directional inference | I want to assemble devices in the field, but I have not chosen which prior strength should guide the work. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### IMP-2: Q1 `IMP-PR05` -- help an ally tackle a specialized task with appropriate gear

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `tacticalSupport` | I have learned to prepare others for difficult tasks. I want that support to guide which equipment I find for them. |
| B | `knowledgeMastery` | I have practiced learning what a task actually requires. I want that research to prevent wasted effort. |
| C | `resourceControl` | I have trained to account for limited supplies. I want the right tool to arrive where it makes the most difference. |
| D | `engineeringMastery` | I have learned to evaluate what equipment can and cannot do. I want that judgment to inform how I equip the team. |
| E -- alternative | New direction, not owned | I want making other people more capable to become my specialty, even if I used to focus on my own equipment. |
| F -- undecided | No new directional inference | I want to help others get the right gear, but I have not settled on the strength I should bring to that role. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### IMP-3: Q1 `IMP-ID02` -- make adaptable problem-solving a lifelong career

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `mechanicalMastery` | I have practiced keeping equipment working when it matters. I want that reliability to stay central to my work. |
| B | `improvisation` | I have learned to respond when the plan stops matching reality. I want to keep improving that skill for its own sake. |
| C | `resourcefulness` | I have trained to get results without ideal resources. I want that habit to remain part of who I am as a professional. |
| D | `allySupport` | I have learned ways to make life easier for others under pressure. I want to keep doing that without seeking another title. |
| E -- alternative | New direction, not owned | I chose this craft as my career. I am willing to grow beyond the habits that first brought me here. |
| F -- undecided | No new directional inference | I want to remain an Improviser, but I am still deciding which part of my experience to make central. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

### Publication and identity guardrails

1. No Tools Required is a level-1 class feature, but Q2 displayed before finalization must not speak as if it has already been granted.
2. Contraband starts at class level 2, is subject to printed allotments/availability and is not unlimited starting cash or free permanent inventory.
3. Improvised Device and Capture Droid have temporary outcomes, with encounter-end cleanup. No survey text creates persistent machines or droid allies.
4. Jack is fast and playful, distinct from Spark's careful sabotage and Rax's severe technical planning. No invented prior successful field repairs.

## 59. Pathfinder -- Lead Q2 synthesis

**Q1 authority:** pinned section 37; **source:** Rebellion Era Campaign Guide, printed pp. 43-45. **Draft Q1 candidate routes:** 26. **Repository class ID (read-only):** `4ee81a6708a516cd`. **Status:** editorial, not a class-grant screen or verified actor-ready dialogue bank.

### Full Q1 family-to-Q2 route coverage

| Source Q1 family / exact answer IDs | Count | Q2 synthesis purpose / constraint |
|---|---:|---|
| **Awareness** -- `PTH-AW01` - `PTH-AW08` (consecutive) | 8 | Observing and anticipating terrain or danger; no assumed war history. |
| **Survivor** -- `PTH-SV01` - `PTH-SV04` (consecutive) | 4 | Movement and endurance in difficult terrain; do not assume an actual successful expedition. |
| **Pathfinder** -- `PTH-PF01` - `PTH-PF10` (consecutive) | 10 | Safe zones, route movement, positioning and protection; Create Cover is separate later class feature. |
| **Feature, identity, neutral** -- `PTH-CF01`, `PTH-ID01`, `PTH-ID02`, `PTH-NEUTRAL` | 4 | Create Cover at class level 2; safety-oriented career, capstone or undecided. |
| **All Q1 IDs for Pathfinder** | **26** | Each Q1 ID assigned exactly one editorial family; not one unique Q2 dialogue set per Q1 answer. |

### Proposed Mentor Q2 introduction

> I've seen people mistake confidence for knowing the ground. The useful part is what your training actually lets you notice and do. Which of those strengths are you going to rely on when others need a safe way through?

**Question:** Which established strength should shape the routes and safe positions you create as a Pathfinder?

### Three conditional A-F editorial fixtures

#### PTH-1: Q1 `PTH-PF04` -- establish a safe and defensible zone

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `survivalSkills` | I have trained to judge whether ground is safe to cross or occupy. I want that knowledge to guide where we stop. |
| B | `tacticalAwareness` | I have practiced recognizing the risks in a position. I want that judgment to shape our defenses. |
| C | `fortifications` | I have learned to improve protection where it is needed. I want that preparation to help others hold a position. |
| D | `allySupport` | I have developed ways to help others stay effective. I want a safe position to serve the whole group, not only me. |
| E -- alternative | New direction, not owned | I want finding defensible ground to define my work even if my earlier skills were mainly about traveling quickly. |
| F -- undecided | No new directional inference | I am interested in establishing safe positions, but I have not chosen which part of my earlier training should lead. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### PTH-2: Q1 `PTH-PF06` -- relocate allies from one position to another

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `explorationMastery` | I have practiced discovering workable routes through uncertain terrain. I want that experience to guide our relocation. |
| B | `formation` | I have learned to keep others coordinated while moving. I want that discipline to prevent anyone being left exposed. |
| C | `reactionDefense` | I have trained to respond quickly when a position becomes unsafe. I want that readiness to shape when we leave. |
| D | `trackingMastery` | I have learned to read signs in the terrain. I want that observation to guide the next route rather than move blindly. |
| E -- alternative | New direction, not owned | I want to specialize in protecting a moving group, even if my past strengths were centered on holding ground. |
| F -- undecided | No new directional inference | I want to learn when and how to relocate a group, but I have not decided what earlier strength should guide it. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

#### PTH-3: Q1 `PTH-ID02` -- stay a Pathfinder as the chosen career

**Hypothetical actor:** The four A-D strength sources below are independent *assumptions for editorial testing*, not real claims about an actual character. Production generation must verify owned/finalized skill, talent, feat, item/rule or authorized class evidence for each statement, dedupe related sources, and never derive a past achievement from Q1 or older inferred intent.

| Slot | Existing 125-key mechanical bias (developer only) | First-person candidate answer |
|---|---|---|
| A | `wildernessLore` | I have learned to understand unfamiliar terrain. I want to keep strengthening that knowledge for those who rely on me. |
| B | `survivalism` | I have trained to stay effective in demanding conditions. I want that endurance to be part of my ongoing work. |
| C | `allySupport` | I have practiced helping others through difficult situations. I want to make that responsibility central to my career. |
| D | `adaptability` | I have learned to adjust when a route or plan changes. I want that flexibility to remain part of this calling. |
| E -- alternative | New direction, not owned | I reached the goal of this work. I want to keep improving it even if my methods change over time. |
| F -- undecided | No new directional inference | I want to spend my career as a Pathfinder, but I have not chosen which established strength should define it. |

**Acceptance:** A-D require evidence for their literal experience claim, E is a newly expressed interest rather than automatic career replacement, F is neutral, and no selection changes the owned actor state.

### Publication and identity guardrails

1. Printed entry accepts two qualifying talents from Awareness/Camouflage/Survivor. Camouflage is not thereby a Pathfinder selectable tree; these are Pathfinder/Awareness/Survivor.
2. Create Cover is a later class feature beginning at Pathfinder level 2; Safe Zone is a separate talent with prerequisites.
3. Pathfinder is not automatically an Alliance post or military assignment. Lead lacks a dedicated Pathfinder classPath greeting; use verified Scout personality, no invented history.
4. Lead is skeptical and observant, distinct from Vanguard mentor Theron. Do not turn Pathfinder into a generic frontal-defense soldier.

## 60. Final cross-class editorial closure: 32/32

### 60.1 Count and coverage disposition

- **Previous rolling checkpoint:** 26 distinct prestige classes and 1,108 Q1 answer routes inventoried in v0.7.
- **Final tranche:** 6 distinct classes, 185 additional distinct Q1 answer IDs, 18 A-F dialogue fixtures, 108 new first-person candidate responses.
- **Cumulative:** **32 distinct prestige classes**, **1,293 Q1 candidate answer routes** mapped by class/family, and complete editorial coverage for each class Mentor plus multiple Q2 test routes. This is **not** 1,293 fully authored personalized Q2 answer sets or a complete production rules-certification.
- **Six-class structural validation:** expected counts 48+23+39+30+19+26=185; no duplicate route IDs; all fixture Q1 references exist in the new class route inventory; three complete A-F sets per new class.
- **Q2 reuse base:** the 625 prior multiclass Q2 response candidates contain 125 shared mechanical-bias stems across five foundation classes. The prestige fixture sets are selectively adapted to that vocabulary. The 190-tag ontology and 297-archetype registry remain unchanged.

### 60.2 Binding contract that must remain intact

1. **Q1 is class discovery, not acquisition.** Never rewrite or shrink Q1's existing class-specific educational answer banks to make Q2 work.
2. **Q2 is synthesis, not another detailed abilities lecture.** Its signal is which *real prior strength* the player wants to carry into the chosen prestige direction.
3. **The pre-advancement actor snapshot is the sole proof of owned abilities.** Prior surveys identify earlier expressed intent, not actual mechanical training. An actor's class entry prerequisites and archetype/rank signals do not by themselves verify a specific past skill feat or deed.
4. **Existing scoring only.** Reuse the present 125-key and Suggestion Engine authority, including real observed source contributions. Never introduce new weights, infer possession by subtracting survey scores, or silently equate a 190-tag candidate with a 125-key observed ability.
5. **A-D are evidence-gated and deduplicated.** Render up to four meaningful, different past strengths. If none are supported, render E/F or a truthful reduced slate; never pad.
6. **E means an alternative emphasis.** It does not negate previous training or overwrite a career goal. **F means no new directional inference.** Undisplayed and unselected answers are not negative evidence.
7. **Future grants and legality are V2 progression authority.** A Q1 aspiration, Q2 selection or Mentor statement cannot confer a feat, talent, secret, technique, ship, organization, minion, item, Force Point or social deed.
8. **Q3-Q6 remain separate.** Q3 responsibility/application; Q4 Dip/Dive/Swim/Undecided (Bridge distinct); Q5 future or continued fulfillment; Q6 shared Mentor Reflection and two-stage interpretation correction.
9. **Historic source-status labels remain live.** QUARANTINE and conditional restrictions from Q1 are not erased by mapping them to a Q2 family.
10. **No legacy path in parallel.** When implementation is separately authorized, perform an intentional V2 clean cutover; do not install weighted prune/merge shims around the old four-question prestige survey.

### 60.3 Exact V2 observed-strength read contract (design only)

```text
input: finalizedActorSnapshot, candidatePrestigeClassId, selectedQ1AnswerId,
       priorSurveyEvents[declared-not-owned], authorizedSourcePolicy
output: [{mechanicalBiasKey, existingRankValue, contributionDomains,
          evidenceIds, snapshotRef, confidenceCaveat}, ...]
invariant: evidenceIds must justify every past-tense statement displayed.
invariant: no pending talent/feat/feature, Q1 interest, or previous survey bias
           is ever promoted to an owned/practiced claim.
invariant: selecting an option records intent only, atomically on completion.
```

The engine currently exposes aggregate observed/identity calculations, but no verified production public API with sufficient per-key, per-source evidence proof and snapshot isolation. **That read-only view is an implementation dependency, not an implemented feature.**

### 60.4 Outstanding blockers before player-ready certification

| Priority | Blocker | Required resolution |
|---|---|---|
| P0 | No stable evidence-backed observed-strength top-four public interface | Expose existing contributions/owned IDs and test actor snapshots; no second scorer. |
| P0 | Q2 new purpose conflicts with older published design doc describing another mechanical teaching stage | Owner approve wording; update the authoritative design contract intentionally when authorized. |
| P0 | Canonical class-tree access gaps | Fix missing Charlatan Fortune and general Force talent-tree access in Jedi Master, Force Disciple and Sith Lord V2 authorities. |
| P0 | Tree IDs and mentor routing | Resolve Assassin `GenoHaradan`, Infiltrator `Bothan SpyNet`, Independent Droid tree identifiers, Kharjo registration, relevant Mentor aliases. |
| P0 | Unresolved published-versus-house-rule conditions | Explicit rule choice for Sith dark-side threshold; preserve Imperial Knight rejection of dark side and all species/tradition/organization conditions. |
| P1 | Individual talent identity source quarantines | Resolve Gunslinger Pistoleer, Outlaw Fringer/Virus, Teras Kasi, `Stolen Form`, Officer `Turn the Tide`, etc. through source evidence; remain disabled while uncertain. |
| P1 | Temporary, prospective and sensitive class features | Validate future-level timing, Shaper implants and Force Point exception, Assassin Mark, Improviser Contraband, Pathfinder Create Cover, droid-only Networked Mind, and more. |
| P1 | Full prose QA and actor simulations | Test real multi-class builds, sparse signal slates, Q1 edits, prestige capstones, class restrictions, neutral responses and Mentor identity across all 32 classes. |

### 60.5 Release gate for Q2 content / runtime

**Editorial completeness** can be declared for this design pass: 32/32 classes have Q1 family-to-Q2 synthesis coverage, a Mentor introduction, and meaningful stress-test dialogues. **Production readiness cannot be declared.** Before implementation, require owner approval of actual Mentor text, Q2 sentence templates, answer selection/count/browsing policy, event persistence and Q1 historical references; full source certification; evidence-backed scoring projection; actor tests; no legacy survey interference.

**No runtime or repository write occurred in this editorial pass.** Neither the rolling Markdown artifact nor its source-backed route manifest is a rules database or a new V2 scoring authority.
