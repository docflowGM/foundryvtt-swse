# SWSE Prestige Mentor Survey - Local Rolling Design

**Opened:** 2026-11-14  
**Revision:** v0.26 - cross-book Q1 audit; 32/32 editorial libraries; corrected sourcebook census and 14 first-person capstones; V2 implementation instructions and production gates
**Repository:** `docflowGM/foundryvtt-swse`  
**Status:** COMMITTED DOCUMENTATION DESIGN + DEFERRED IMPLEMENTATION LEDGER; production runtime changes and mechanical certification remain unapproved. See §39.  
**Scope:** THIS CHAT: Q1 ONLY, book-by-book; handle all newly introduced prestige classes in each chosen book, preserve earlier cross-survey framework for context only. Do not edit the committed multiclass master.

## Authority and status legend

- **APPROVED**: Owner-approved in the handoff and pinned cross-survey v0.9, Sections 9 and 13.
- **VERIFIED REPO**: Directly inspected repository bytes on `main` (HEAD `28154d6962f210f9cc806ad8d19e15eb5c20ee3a`, November 12, 2026), unless another ref is stated. Static read only; no live Foundry execution.
- **DRAFT**: Proposed for owner editorial review; not approved or mechanically weighted.
- **UNRESOLVED**: Requires fuller repository or primary-source certification, live workflow analysis, or owner decision.

## 1. Approved architecture (LOCKED)

The prestige class is an earned milestone and may be a destination in itself, not an automatic bridge. The six-question order is:

1. Q1 - The Journey: meaning of the road to this milestone.
2. Q2 - The Achievement: exact, certified new class capabilities and opportunities.
3. Q3 - The Responsibility: applied, prestige-specific scenario and approach.
4. Q4 - The Commitment: Dip / Dive / Swim / Undecided about **future** investment. Bridge is a separate purpose.
5. Q5 - The Future: fulfillment, service, refinement, or optional new ambition.
6. Q6 - The Mentor's Reflection: reuse the multiclass A-E interpretation-feedback mechanism and D/E NOT/AM follow-ups.

Keep **declared future goal**, **inferred current identity**, **verified mechanical eligibility**, and **finalized acquired abilities/classes** in four separate authority lanes. Q1-Q5 choices are first-person character speech; survey drafts do not create finalized intent events. Q6 changes interpretation, not acquired facts or explicit goals. The original L1 goal persists without a separate affirmative revision. Numeric coefficients and exact answer counts are not approved.

### Primary design references

- Pinned cross-survey v0.9: `docs/design/SWSE_Multiclass_Prestige_Survey_Rolling_Design.md` at `1d56ae4279c53fa2f1a7ead2c312b4ef73ec7e79`, especially Sections 9 and 13 (read and confirmed).
- Committed multiclass v0.11: `docs/design/SWSE_Multiclass_Survey_Rolling_Design.md` on `design/multiclass-mentor-survey-q1-q6-v011`, commit `eb531a6b0fc5482edd62eedfea4dfebd312946ee`, blob `1ee7b499d9c67eb5a0512881e4d6a92946a92068` (read; includes Q6 Pass A/B).
- Owner's 2026-11-14 prestige fresh-chat handoff in the conversation, governing editorial constraints.

## 2. Phase P0 - repository audit (read-only)

### 2.1 Coverage - identity-level reconciliation: VERIFIED REPO

- `packs/classes.db`: **37** class records: **5** `base_class=true` and **32** `base_class=false`.
- 32 prestige/apex records correspond exactly by normalized name to the **32** entries in `scripts/mentor/mentor-survey/prestige-survey-profiles.js` and the **32** keys of `data/prestige-class-prerequisites.json`; zero missing or extra IDs in those inventory comparisons.
- The class records have **29** progression tables with 10 entries and **3** with 5 entries. The three five-entry classes are **Jedi Master, Sith Lord, Force Disciple**. This matches the expected apex classification, but a length-of-table comparison alone does not certify class caps, legal acquisition, or every progression grant.
- `data/mentor-dialogues.json` has 37 class-name keys including five foundations and **all 32** prestige/apex classes. No missing mentor-name assignment in the class-name inventory.
- Class fields in the pack include `talent_trees`, `talentTreeSourceIds`, `level_progression`, etc. Those fields are available for a later Q2 mechanical audit, but their correctness against all publications and Foundry mechanics has NOT yet been certified.
- `scripts/data/classes-db.js` builds normalized class SSOT from the `foundryvtt-swse.classes` compendium. Do not use the prestige presentation profiles as entitlement authority.

**Mentor routing roster (current data, not character-dialogue approval):**

| Prestige/apex class | Assigned Mentor | Prestige/apex class | Assigned Mentor |
|---|---|---|---|
| Ace Pilot | Mayu | Assassin | Delta |
| Bounty Hunter | Kex Varon | Charlatan | Silvertongue Sela |
| Corporate Agent | Marl Skindar | Crime Lord | Tio the Hutt |
| Droid Commander | General Axiom | Elite Trooper | Breach |
| Enforcer | Krag the Immovable | Force Adept | Seeker Vera |
| Force Disciple | Riquis | Gladiator | Pegar |
| Gunslinger | Rajma | Imperial Knight | Dezmin |
| Improviser | Lucky Jack | Independent Droid | Seraphim |
| Infiltrator | Delta | Jedi Knight | Miraj |
| Jedi Master | Miraj | Martial Arts Master | Master Zhen |
| Master Privateer | The Captain | Medic | Kyber |
| Melee Duelist | Blade Master Kharjo | Military Engineer | Chief Engineer Rax |
| Officer | Admiral Korr | Outlaw | Rogue |
| Pathfinder | Lead | Saboteur | Spark |
| Shaper | Shaper Urza | Sith Apprentice | Darth Malbada |
| Sith Lord | Darth Miedo | Vanguard | Shield Captain Theron |

*Display name normalization in this table is editorial; source keys include punctuation (e.g., "Tio" is `Tio` with accent in repository, and `The Captain` has quoted formatting). Preserve actual class/mentor IDs at runtime.*

### 2.2 Registry and ontology: verified with limitations

- `data/audits/talent-feat-phase3-final-ontology.json` has **190** tags. Blob `a4f6ce8df4c51a946f3bb70f74fdfcc410a9164f`.
- `data/bias-keys-canonical.json` has **125** mechanical bias keys, **12** role bias keys, and **6** attribute bias keys. Blob `f451e083ccaf20bc9afa2098ca68314f306a3d15`.
- `data/archetypes.json` exists at the handoff's blob `76b1ee3aa06dcb29a88ff4ca69bbc8b96cebc3fe`. The provided handoff reports 297 archetypes (97 parents, 200 specialized); the file's complete JSON was not parsed during this pass because connector responses were length-limited. Treat the 297 count as handoff-grounded pending direct current-content verification. The 297 archetypes are not 297 prestige classes.

### 2.3 Active legacy seam: VERIFIED REPO, NOT APPROVED DESIGN

- `scripts/mentor/mentor-survey/definition-builder.js` currently defines four prestige questions: `prestigeMeaning`, `commitmentDepth`, `specialization`, `profileReading`.
- `commitmentDepth` has **Bridge** as a peer of Dip/Dive/Swim, contrary to the approved new semantics.
- `prestigeMeaning` and `profileReading` contain `pruneWeight`, `preservationMultiplier`, `prestigeOverride`, etc. The accepted design explicitly rejects bulk-pruning of old identity and survey evidence.
- `scripts/apps/progression-framework/steps/prestige-survey-step.js` builds a legacy weighted merge (`mergePrestigeBias`) and uses those multipliers to update `mentorBuildIntentBiases`. It also derives a `profileReading` from item-name/skill string heuristics rather than a fully certified canonical evidence snapshot.
- The step resolves the candidate class from progression/session **pending selection**, including draft selections, upon `onStepEnter`. `_finalizeSurvey` marks its survey payload completed and writes a `prestigeSurveyResponses[classId]` object during progression. Whether and when this is persisted atomically with a legally finalized class acquisition requires tracing the surrounding V2 transaction. **Do not narrate unfinalized entry as already owned.**
- `getMentorForClass` accepts an exact `MENTORS[className]` lookup and silently falls back to Ol' Salty for an unmatched name. Class display names presently have complete routes, but normalized IDs or future unknown names could select the wrong Mentor. New design should use verified typed class ID -> assigned Mentor and fail closed instead of defaulting to a different character.
- The multiclass v0.11 Q6 Pass B contains A-E and two-stage D/E correction library. It is an authored editorial resource, not a certified prestige runtime engine.

### 2.4 Remaining P0 verification ledger (UNRESOLVED)

1. Primary SWSE sourcebook/page certification for each of the 32 classes, its entry requirements, progression features, legitimate trees, and maximum class levels; distinguish campaign-specific restrictions and special entry cases.
2. Compare compendium tree source IDs and V2 class model grants to printed class features. A hint in `prestige-survey-profiles.js` is not proof of legal talent access.
3. Trace class-transaction finalization and retake semantics, survey event IDs, separate decay clocks, and `mentorBuildIntentBiases` downstream consumers before proposing implementation.
4. Verify access to the current canonical archetype registry and typed class-vs-archetype distinction using full current data.
5. Audit every prestige Mentor's biography/speech before bulk authoring. Existing lines are character references, not guaranteed approved prestige dialogue.
6. Verify prior declared-goal retrieval across L1 and multiclass, and availability of a durable actor-evidence snapshot; no synthetic prior memories.
7. Verify Q6 shared runtime consumption and absence of double-counting rather than importing legacy prestige pruning.
8. Confirm whether class-specific story titles (Officer, Independent Droid, etc.) imply actual organizational rank or social status: do not invent rank, orders, missions, affiliation, or military commission.

## 3. Q1 - The Journey (EARLIER DRAFT; interpret through Section 7 capstone clarification)

### 3.1 Why this question is distinct

Q1 is **retrospective meaning and motivation**. Q2 is **future capabilities**, Q3 is **how to use them**, Q4 is **planned investment depth**, and Q5 is **the next destination**. A Q1 answer never, by itself, certifies a past deed, previously owned feature, specific prior declared goal, or a change of explicit goal.

**Proposed general question:**

> "Before we speak of what this title opens to you, tell me about the road that brought you here. What mattered most?"

Mentor-specific intros precede that prompt. A fixed introduction should avoid fabricated actor experience. Optional dynamic clauses can mention only actual earlier class levels, feats/talents/skills, original recorded goal, or prior prestige, each with stored evidence.

### 3.2 Dynamic answer bank (seven substantively different candidate first-person replies plus neutral)

Propose selecting **up to five** contextually distinct, substantive options per actor, plus a neutral sixth if appropriate. This count and wording are NOT approved.

| ID | Player-visible answer | Intended interpretation | Show condition / caution |
|---|---|---|---|
| `journey_declared_destination` | "I have been working toward this calling for a long time, and the choices I made were meant to bring me here." | Deliberate long-range pursuit and continuity. | Prefer only when the player previously affirmatively declared this specific destination. Do not fabricate an earlier goal. |
| `journey_craft` | "I kept developing the discipline that mattered most to me until it became part of who I am." | Mastery through repeated deliberate development. | Universally self-reportable; mention exact skills/talents only if actually owned. |
| `journey_synthesis` | "I learned from different kinds of training, and bringing them together is what got me here." | Integration of distinct training paths. | Display when two or more distinct owned classes/training domains are verified; do not invent a prior mentor relationship. |
| `journey_service` | "I wanted to become someone others could rely on, and that purpose shaped the choices I made." | Retrospective service or responsibility motivation. | Voluntary player self-report; do not infer actual dependents, missions, allies saved, or moral alignment. |
| `journey_reorientation` | "What mattered to me changed as I grew, and this achievement reflects that change." | Player-reported evolution of motivation. | Does NOT automatically replace the historical or active explicit career goal; needs separate affirmative revision if desired. |
| `journey_unexpected` | "I never planned on this title. I followed the work in front of me, and it led me here." | Emergent, unplanned destination. | Player report only; do not retroactively assert the absence of earlier explicit intent if recorded. |
| `journey_adaptation` | "I reached the limits of what I knew and chose to learn different ways forward." | Adaptive learning and effort in response to perceived limitations. | Player self-description, not evidence of an actual recorded failure or mission. |
| `journey_unsure` | "I have come this far, but I am still deciding what the journey means to me." | No substantive preference. | Neutral; do not apply a negative tag or default Dip. |

**Illustrative context routing (DRAFT):**

- Prior exact destination and multiclass history: declared destination / craft / synthesis / service / reorientation + unsure.
- No recorded goal and only one class: craft / service / reorientation / unexpected / adaptation + unsure.
- No recorded goal but multiple classes: craft / synthesis / service / reorientation / unexpected + unsure.
- Sparse history or near-level-20: use plain-language self-report without inventing facts; do not gate every reply on absent previous survey events.
- Additional prestige: a verified earlier prestige class may be acknowledged as part of acquired history, without implying the new class erases it.
- Apex: acknowledge threshold of deeper mastery without claiming it was the player's lifelong aim.

Q1 answers should store **retrospective player-reported motivation** with the specific selected response ID, text, Mentor, snapshot reference and prior-goal relation (if any). Do not silently turn Q1 into an explicit new future-goal event. No scoring coefficients or new semantic tag identities are authored in this draft.

### 3.3 Fixed Mentor stage introductions (DRAFT, not voice-approved)

Each intro can use **pending** or **finalized** tense depending on authoritative progression state. The new entry survey likely runs before the acquisition transaction finalizes, so the pending variant is the practical initial requirement.

**Miraj - Jedi Knight**

- Pending: "Your training has brought you to the threshold of Knighthood. But a title cannot tell me what that journey has meant to you. What brought you here?"
- Finalized: "You have earned the title of Jedi Knight. I will not presume to tell you what your journey means. What do you believe brought you here?"

**Admiral Korr - Officer**

- Pending: "You have prepared for the work of command. Before we discuss what comes with it, I want your assessment of the road behind you. What brought you to this point?"
- Finalized: "You have reached an important command milestone. Forget the insignia for a moment. What in your own development brought you here?"

**Breach - Elite Trooper**

- Pending: "All right, you've come far enough to aim for the hard stuff. That didn't happen by accident. Well, not entirely. What got you here?"
- Finalized: "You've earned your place among the elite. Good work. I'm more interested in what got you this far. What mattered most?"

**Lead - Pathfinder**

- Pending: "You've done enough preparation to stand at the edge of a different kind of work. Before you start looking ahead, tell me what brought you this far."
- Finalized: "You earned this path. That doesn't tell me which of your choices mattered most. I want your assessment, not mine."

**Seraphim - Independent Droid**

- Pending: "You are approaching a threshold where your direction deserves a definition of your own. Which decisions brought you here?"
- Finalized: "This achievement is yours. I am interested in which decisions you consider most important in reaching it."

**Editorial issue:** The above are intentionally short and avoid inventing mission history or interpersonal familiarity. Seraphim's actual voice especially needs closer review before approval.

### 3.4 Actor-evidence contract (DRAFT)

- `prestigeClassId`: exact candidate canonical class ID.
- `acquisitionStatus`: `pending` or `finalized`, from authoritative V2 transaction, never inferred from survey completion.
- `actorSnapshotRef` and `characterLevelAtEvent`: for historical provenance.
- `ownedClasses`: separate known class IDs/levels, including earlier prestige.
- `ownedMechanicalEvidence`: exact class, talent, feat, skill IDs only when acquired and verified.
- `declaredGoal`: typed target, original event provenance, or `null`; compare without overwriting.
- `q1Choice`: original answer ID and first-person text, with draft vs completed event status.
- `retrospectiveInterpretation`: categorical, self-report only; no new ontology tag or numeric weight until approved and certified.

### 3.5 Q1 review gates for owner

1. Approve or revise the **seven-choice candidate bank with five contextually shown + neutral**. Alternative: always show five fixed substantive replies regardless of actor state.
2. Assess specific voice fidelity for Miraj, Admiral Korr, Breach, Lead and Seraphim before expanding to 32 Mentors.
3. Confirm that a retrospective claim of changed purpose should **not** update the standing long-term career goal without an additional explicit confirmation (recommended, matches pinned Section 13).
4. Confirm pending-tense stage introductions until actual class acquisition finalizes (recommended, avoids inaccurate achievement claims).

## 4. Subsequent phases (not started)

- P2: Prestige-specific Q2 capability and educational source certification.
- P3: Q3 responsibility scenarios after approved representative examples.
- P4: Q4 future-depth commitment; bridge as separate purpose.
- P5: Q5 fulfillment and optional new goal without forced onward prestige.
- P6: Shared Q6 A-E reflection plus D/E NOT/AM corrections with verified current-evidence references.
- P7: integrated no-implementation design review, all-class coverage, and source/correctness ledger.

**Git status for this work:** read-only GitHub connector calls; no create/update/delete/commit/push/PR calls. This local document is not part of the repository.

---

## 5. Phase P0B - Mentor personality and dialogue-source audit (2026-11-14)

**Status:** VERIFIED REPO for inspected JSON contents and static code references; **EDITORIAL GUIDANCE** for the rules below. This adds to, but does not supersede, the Q1 draft; dialogue and option counts remain unapproved. GitHub remained read-only.

### 5.1 Source inventory and authority boundaries

- `data/dialogue/mentor_registry.json`: **31 distinct Mentor registry entries**, with specific per-Mentor dialogue file paths.
- `data/dialogue/mentor-suggestions/mentor-personalities.json`: **37 class-indexed profiles** (five foundation, 32 prestige/apex), with `traits`, `verbosity`, `scolds`, `recovery`, and the Mentor's lookup key.
- `data/dialogue/mentors/<name>/*_dialogue[s].json`: all **31** registry-indicated individual dialogue documents were read, PLUS the unregistered but present Blade Master Kharjo dedicated dialogue file. They provide `shortBio`, `philosophy`, `emphasis`, `voiceStyle`, `values`, and class-specific example language. Some files also contain explicit `prestigePaths` with the relationship-specific voice for a newly acquired prestige level.
- `data/dialogue/mentors/<name>/<name>.json`: associated judgment/intensity phrase material. `*_advisory_stub.json` adds voice profiles and structured observation/impact/guidance templates. These are separate *layers*, not evidence that every phrase is a consistent character voice.
- `data/mentor-dialogues.json`: 37 class-indexed assignments; `scripts/engine/mentor/mentor-dialogues.data.js` is generated from this source. The prestige step's current `getMentorForClass` consumes this class-indexed lane. The JSON loader and suggestion engine use additional paths/layers; the existence of a file is not evidence it is active in this specific prestige UI.
- `scripts/engine/mentor/mentor-json-loader.js` reads the registry, per-Mentor metadata, and named dialogue file, merging payloads. `scripts/mentor/mentor-suggestion-engine.js` has a JSON-preferred asynchronous suggestion path with JS fallback and a separate synchronous compatibility path. Current prestige step's usage of all these separate layers needs an end-to-end tracing test before claiming full runtime wiring.

**Characterization priority for new authored prestige narration:** Preserve the established individual `voiceStyle`, `values`, `philosophy`, character's own dialogue examples, and prestige relationship variant. Treat suggestion `traits` and advisory templates as secondary corroboration, not permission to contradict distinctive biography/voice. The exact runtime source-of-truth hierarchy is NOT mechanically settled by this editorial rule.

### 5.2 Complete 32-Mentor voice guide

These are paraphrased style notes grounded in the individual dialogue JSONs and class-indexed personality metadata. They are not new character biography or fabricated backstory.

| Mentor | Coverage | Established voice and personality; do not genericize |
|---|---|---|
| **Miraj** | Jedi, Jedi Knight, Jedi Master | Calm, patient, introspective, Force-aware; intent vs action, restraint and long-term consequence. With Knight, shifts from instructor to respectful counsel; with Master, collaboration/equality. Avoid omniscient assertions or compulsory advancement to Jedi Master. |
| **Lead** | Scout, Pathfinder | Dry, skeptical, measured, tactical Argent commander; observation and contingency over bravado. With Pathfinder, more peer-like and demanding about leadership and operational impact. Avoid fake reports of completed missions. |
| **Ol' Salty** | Scoundrel | Big, boisterous, pirate-accented jokes and tales; survival, cleverness, freedom and profit. Distinct from the more calculating Master Privateer Mentor. |
| **J0-N1** | Noble | Precise, formal butler/protocol droid; addresses player as 'Master'; efficient and dry/sardonic rather than emotional. |
| **Breach** | Soldier, Elite Trooper | Short, plainspoken, approachable, pragmatic Mandalorian; understated teasing, practical survival, earned respect. With Elite Trooper, treats player as proven professional rather than green recruit. Not a shouty drill sergeant. |
| **Darth Miedo** | Sith Lord | Quiet, absolute, calculating; speaks without doubt, framing control and inevitability as truth. Distinct from Malbada's performative cruelty. |
| **Darth Malbada** | Sith Apprentice | Harsh, mocking, cruel, intense; demands evidence of power and treats suffering as a test. Do not sanitize into Miraj-like counsel. |
| **Tio the Hutt** | Crime Lord | Relaxed, amused, calculating crime boss; favors leverage, reputation, loyalty as currency and control. Menace expressed through affability, not constant roaring. |
| **Riquis** | Force Disciple | Ancient, cryptic, soft, unsettling mystic; omens and riddles, reverence for deeper mysteries. No forced light/dark framing. |
| **General Axiom** | Droid Commander | Cold and automated command system; efficiency, obedience, synchronization, tactical status reports. Differentiated from Seraphim's autonomy and sarcasm. |
| **The Captain** | Master Privateer | Charismatic, theatrical, reputed/feared commander; freedom, raiding, reputation, crew and profit. Distinct from Ol' Salty's boisterous survival-first patter. |
| **Delta** | Assassin, Infiltrator | Cocky, casually lethal, streetwise; sardonic/New York-ish edge, teasing even while making an incisive point. Same personality but distinct assassin/infiltrator emphases. |
| **Dezmin** | Imperial Knight | Restrained, dutiful, ceremonial, self-disciplined Force warrior; Imperial service, balance, honor and controlled force. Not generic Jedi voice. |
| **Lucky Jack** | Improviser | Fast, chaotic, irreverent, excited about creative fixes; plans as guesses and instinct as advantage. Avoid stiff training-instructor speeches. |
| **Kex Varon** | Bounty Hunter | Minimal, analytical, prepared professional; tracking, patience, outcome and reputation. Unimpressed by bluff, spectacle or luck. |
| **Admiral Korr** | Officer | Sober, commanding, responsible fleet leader; strategic view, morale, duty and the lives entrusted to him. Talk like command judgment, not abstract destiny. |
| **Krag the Immovable** | Enforcer | Short, intimidating, physical, unwaveringly loyal; pressure and fear before force; Tio's criminal organization context appears in original lines. Avoid mission assumptions for player. |
| **Kyber** | Medic | Compassionate but practical, calm under triage pressure; dark humor, survival and mercy with boundaries. Not a sentimental pacifist stereotype. |
| **Mayu** | Ace Pilot | Confident, teasing, fast-talking, adrenaline-driven; motion and initiative, controlled recklessness. Bravado obscures experience. |
| **Pegar** | Gladiator | Ancient, patient, experienced, bemused; arenas, survival, audience and legacy; anecdotes about exceptionally long personal experience belong to Pegar, not player. |
| **Rajma** | Gunslinger | Flirtatious, charming, cocky, playful; speed, accuracy, reputation and enjoyment of danger. Distinct from the cooler Hunter/Assassin voices. |
| **Chief Engineer Rax** | Military Engineer | Cold, exact, math-and-fortification-minded; siege, geometry, preparation, structural vulnerabilities. Sparse technical metaphors rather than emotional drama. |
| **Rogue** | Outlaw | Free-spirited, defiant, self-directed, amused; law as a bargain to challenge; emphasizes escape, self-rule, irreverence. |
| **Silvertongue Sela** | Charlatan | Warm, flirtatious, extravagant con artist; belief, perception, charm and persuasion. Theatrical and polished, not brutally threatening. |
| **Seraphim** | Independent Droid | Autonomous, sardonic, reflective self-aware AI; diagnostic-tag cadence and dry intelligence; freedom vs programmed obedience. Deliberately opposite Axiom's submission-to-orders ideology. |
| **Marl Skindar** | Corporate Agent | Impatient, dry, sharp undercover operator; deniability, cover identity, tradecraft and information. Sounds like every briefing wastes his time. |
| **Spark** | Saboteur | Animated, enthusiastic technical disruptor; celebrates precise demolition and elegant cascading effects, not indiscriminate destruction. |
| **Shield Captain Theron** | Vanguard | Stoic, steadfast, protective; defense as deliberate action, sacrifice and trust; calm certainty rather than aggression. |
| **Shaper Urza** | Shaper | Unsettlingly brilliant, curious bioengineer; organisms as design material; faint humor and innovation over conventional moralism. |
| **Seeker Vera** | Force Adept | Reflective, questioning, independent Force mystic; attunement, insight and wandering traditions rather than Jedi/Sith doctrine. Gentler curiosity than Riquis's cryptic omen-reading. |
| **Master Zhen** | Martial Arts Master | Serene, patient, spiritual martial artist; body/mind balance and quiet, metaphor-driven teaching. Distinct from technical duelists and battleminds. |
| **Blade Master Kharjo** | Melee Duelist | Calm, exacting, unboastful swordmaster; speaks as a measured instructor about timing, distance, footwork, anticipation, and discipline. The source claims undefeated duels about Kharjo, not the player. |

### 5.3 Confirmed prestige-specific relationship distinctions

- **Miraj -> Jedi Knight**: dialogue explicitly identifies her as the former Master now guiding as a peer; her level-one Knight lines recognize independent judgment. **Miraj -> Jedi Master**: explicitly calls the player a fellow Master and equal/friend. That interpersonal claim belongs to an authored relationship role, not proof of an individual historical mission.
- **Breach -> Elite Trooper**: short, relaxed professional approval and combat-readiness. Existing prestige lines mention Lead having spoken about the player, which should be **gated on evidence** or excluded from generic survey lines.
- **Lead -> Pathfinder**: field judgment becomes command-level routefinding and team responsibility. Existing prestige greetings narrate missions, zero casualties, and Argent Squad leadership without actor evidence. These are **unsafe as unconditional reusable Q1 history** even though they are existing content.
- **Delta -> Assassin/Infiltrator** and **Miraj -> Jedi Knight/Jedi Master** illustrate that a shared Mentor should have **class-specific focus**; shared personality does not imply identical greeting banks.

### 5.4 Conflicts and potential runtime defects: not production-certified

1. **Registry gap, confirmed:** `data/mentor-dialogues.json` assigns **Blade Master Kharjo** to Melee Duelist and the repo contains `data/dialogue/mentors/kharjo/kharjo_dialogue.json`, but `data/dialogue/mentor_registry.json` omits Kharjo entirely. There are **32 unique Mentor names** across the 37 class assignments but only **31 registry entries**. The Captain is the other name-only difference due to extra quotation marks in the central display name, not a missing character. The registry-driven JSON loader would not load Kharjo from this registry alone; separately verify whether the prestige step resolves Kharjo through the central class-indexed data (likely, but not live tested). Do not silently claim full registry coverage.
2. **Korr voice contradiction:** `data/dialogue/mentors/korr/korr.json` judgment phrases include mysticism ('Power flows in patterns', 'All actions serve destiny', 'You move as fate decrees'), while his dedicated dialogue sheet explicitly defines **fleet command, consequences, duty, calm tactical authority**. Do not use mystical judgment phrases as the creative standard for Officer Q1. Determine the exact active consumer before changing them.
3. **Alias normalization:** personality metadata names `Venn` for Force Adept and `Anchorite` for Force Disciple, while `data/mentor-dialogues.json` displays **Seeker Vera** and **Riquis**. The registry has corresponding `venn`/`anchorite` identifiers with those display names. Treat these as mapping aliases, not invented extra Mentors; verify resolution across runtime systems.
4. **Broad voice-overlay collision:** `scripts/engine/mentor/mentor-choice-voice-overlay.js` classifies styles using broad token matches, including Jedi style aliases that contain `sela` and `kyber`, and mystical aliases that contain `mayu` and `seraphim`. These groupings risk flattening distinctive Mentor speech. Any new prestige voice writer should use exact Mentor keys and vetted individual profiles, not such broad categories.
5. **Judgment normalization collision:** `scripts/engine/mentor/mentor-judgment-engine.js` maps generic `soldier` to Lead in its `_normalizeMentorName`; it also maps `captain` to Lead. This could produce inconsistent generic judgment phrasing if callers pass class names rather than exact Mentor names. Verify actual caller inputs and active route before declaring a live bug.
6. **Unsupported actor history:** numerous authored level greetings contain unverified mission success, enemy encounters, training relationships, squad command, or identity judgments. Their presence in JSON does **not** make such details true for arbitrary player actors. New prestige survey introductions must separate fixed Mentor characterization from conditional verified history.
7. **Generated and layered sources:** `mentor-dialogues.data.js` is generated from `data/mentor-dialogues.json`, whereas other JSON families have different loaders and compatibility fallbacks. Do not assume a single merged, coherent runtime SSOT for all dialogue use cases until current call chains have been traced and validated.

### 5.5 Application to provisional Q1 samples

- **Miraj/Jedi Knight**: should show professional respect and personal choice; avoid suggesting a Knight inevitably becomes Master or asserting she personally trained every Jedi actor.
- **Admiral Korr/Officer**: the earlier Q1 example's sober command-briefing style is directionally appropriate, but needs a sharper distinction between *responsibility for others* and *a future command position*.
- **Breach/Elite Trooper**: the earlier Q1 example was slightly generic. More characteristic would be quiet surprise, wry understatement, and recognizing earned competence without inventing a specific firefight.
- **Lead/Pathfinder**: focus on interpretation of observed preparation and the difference between seeing a path and opening one for others; dry, not lyrical.
- **Seraphim/Independent Droid**: replace generic reflective prose with clinical diagnostic tags, subtle sarcasm, and explicit self-determination. Avoid the Axiom obedience/efficiency framing.

**No Mentor-specific Q1 wording is approved by this audit.** Continue with the owner-reviewed Q1 option-bank design before bulk authoring 32 class introductions or any Q2-Q6 prestige text.

---

## 6. Phase P0C - Deferred Mentor implementation issue register (2026-11-14)

**Purpose:** Preserve discovered problems and recommended fixes for a later implementation phase. This is a **rolling local issue ledger**, not approval to change any production source, alter published dialogue, run migrations, or create a PR. All entries below remain OPEN until an implementation audit resolves them with a test and owner review.

### 6.1 Evidence and classification rules

- **CONFIRMED SOURCE** = discrepancy or risky literal is directly visible in checked repository files; *not necessarily a demonstrated user-facing runtime bug*.
- **RUNTIME RISK** = code contains a plausible failure path, but exact live usage / reproduction has not been established.
- **VOICE PRESERVATION** = a preventative editorial or regression test recommendation, not an allegation of a broken Mentor.
- **P0** = must settle before prestige-survey launch; **P1** = address during Mentor integration or first QA; **P2** = editorial cleanup after authority/routing.
- **Do not conflate** identifiers, display names, personality labels, actor backstory, class eligibility, confirmed class acquisition, or selected future career goals.
- **Implementation gate:** replay each scenario in Foundry v13 against the current branch before changing code. Source branch for this inspection was `main` at `28154d6962f210f9cc806ad8d19e15eb5c20ee3a`; recheck at implementation time.

### 6.2 Cross-Mentor issue tracker

| ID | Priority / finding status | Evidence and failure mode | Suggested implementation fix | Required acceptance test |
|---|---|---|---|---|
| **MENTOR-001** | **P0 / CONFIRMED SOURCE** | `data/dialogue/mentor_registry.json` lists 31 entries, but central class assignments identify 32 unique Mentors. `Blade Master Kharjo` has `data/dialogue/mentors/kharjo/kharjo_dialogue.json` and is assigned to **Melee Duelist**, yet lacks a registry entry. Registry-driven loader will not iterate Kharjo. | Add a canonical `kharjo` registry entry pointing to existing assets and the existing dialogue file; ensure exact `mentor_id` matches the Kharjo metadata file; do not create a duplicate Mentor. Verify route is wired to Melee Duelist and supports both class ID and display name. | Enumeration of 32 unique characters across 37 class mappings resolves 32/32 to expected registry IDs; `getMentor('kharjo')` and Melee Duelist preview load Kharjo, never default to Salty. |
| **MENTOR-002** | **P1 / CONFIRMED SOURCE; runtime reachability unresolved** | `data/dialogue/mentors/korr/korr.json` contains fate/destiny/mystical judgments while `korr_dialogue.json` establishes a sober fleet commander. | Trace the exact judgment consumer; replace Korr-only conflicting phrases with duty, personnel, morale, strategic consequence, and command accountability. Preserve schema/atom intensity coverage; do not mechanically replace every `judgments` line across Mentors. | Read each emitted intensity/atom class as Korr: no destiny/Force/mystical claims; sober authoritative tone remains intact. |
| **MENTOR-003** | **P1 / CONFIRMED SOURCE; mapping-risk only** | Force Adept personality key = `Venn`, registry ID = `venn`, display = `Seeker Vera`; Force Disciple personality key = `Anchorite`, registry ID = `anchorite`, display = `Riquis`. These are aliases/IDs for existing characters, not extra Mentors. | Establish a **single typed mapping** from canonical class ID -> mentor registry ID -> display/profile; retain historical alias inputs only where demonstrably used; avoid global string-guess lookups. | Force Adept always displays Seeker Vera and Force Disciple always displays Riquis in class selection, survey, suggestions, and advisory dialogue. |
| **MENTOR-004** | **P1 / RUNTIME RISK** | `scripts/engine/mentor/mentor-choice-voice-overlay.js` applies substring-matched group aliases: `sela` and `kyber` can be read as `jedi`; `seraphim` and `mayu` as `mystical`; `delta` grouped with protocol. | Resolve the **exact mentor identity first**, then select a per-Mentor voice profile. Remove ambiguous substring-based precedence for prestige text. Style formatting must not determine truth, legality, or actor history. | Matrix test all 32 Mentors: Kyber != Miraj; Sela != Jedi; Mayu != mystic; Seraphim != Axiom; Delta != J0-N1. Assert no generic voice-prefix leakage. |
| **MENTOR-005** | **P1 / RUNTIME RISK** | `scripts/engine/mentor/mentor-judgment-engine.js` normalizes `soldier` and tokens containing `captain` to **Lead**. May misvoice Breach, The Captain or Shield Captain Theron if a class name/title rather than a resolved Mentor ID reaches it. | Make the judgment adapter consume resolved canonical Mentor IDs; ban class-name-to-person substring inference as an authority path. Only fallback to explicitly neutral text on an unsupported ID. | Run the judgment engine for Soldier/Elite Trooper, Scout/Pathfinder, Master Privateer, Vanguard; each returns its assigned Mentor style, never Lead unless the class truly maps to Lead. |
| **MENTOR-006** | **P0 / CONFIRMED SOURCE risk in reusable greetings** | Several prestige greetings state unevidenced missions, successes, casualty counts, military promotions, personal relationships, or Argent Squad involvement (especially Lead/Pathfinder and Breach/Elite Trooper). | Separate **fixed characterization** from **conditional actor-history slots**. Only inject a past event after matching a durable, provenance-tagged actor event. The safe generic survey path has no claims about specific missions, affiliations or accomplishments. | Newly created qualified character with no campaign history sees no narrated mission, rank, squad membership, or prior interaction; qualifying stored evidence enables only exactly matched personalized references. |
| **MENTOR-007** | **P0 / RUNTIME RISK** | Central class-indexed mentor data (`data/mentor-dialogues.json`), generated `mentor-dialogues.data.js`, registry-loaded per-Mentor JSON, suggestion-personality JSON, and JS fallback modules form different read paths; not one proven unified runtime source. | Document ownership **per output surface** (greetings, suggestion tone, judgment atoms, survey, story) and assert mapping/voice parity at boundaries. Prefer canonical JSON and clean cutover once consumers are traced; avoid creating another parallel personality store. | Automated parity/roundtrip coverage for 37 class assignments; no silent wrong-mentor fallback; source edits propagate as expected through documented build step; test each active surface. |
| **MENTOR-008** | **P0 / CONFIRMED legacy design gap** | Legacy prestige step has four questions, class selection can be pending, `Bridge` conflates commitment with purpose, and old intent pruning/multipliers remain. | Implement approved Q1-Q6 architecture using V2 mechanical and event authorities. Make Q1 speak of a **threshold** until class selection is finalized; Q4 future Dip/Dive/Swim/Undecided; Q6 uses the shared NOT/AM correction, not pruning. | Cancelled and rolled-back progression causes zero acquired/prestige history claims; lawful finalized class records a single event; subsequent prestige survey remains distinct from L1/multiclass evidence. |
| **MENTOR-009** | **P1 / CONFIRMED authored relationship framing** | Miraj's Knight dialogue describes herself as the player's former Master and the Master dialogue as an equal/old friend. These fixed greetings risk claiming a specific relationship unsupported by an actor record. | Treat rank-related peer/respect transitions as **voice stance**; gate specific "I trained you" / "old friend" / personal mentor-history assertions on a documented relationship. Otherwise Miraj recognizes Knight/Master achievement without inventing shared history. | Run Jedi Knight and Jedi Master both with/without explicit Miraj relationship; stage changes respect level, but invented training/friendship never appears. |
| **MENTOR-010** | **P2 / CONFIRMED literal quality anomaly** | Miraj Jedi Knight/Jedi Master prestige greetings contain the string `fa-regular` (e.g. "how fa-regular you have come") rather than normal readable wording. | Re-open exact repo bytes and correct only affected player-facing strings after confirming whether this is source corruption or localization/transformation; test all Mentor JSON for similar artifacts before batch publication. | JSON remains parseable and original meaning preserved; no malformed text in all prestige greetings and localized exports. |
| **MENTOR-011** | **P1 / RUNTIME RISK** | `getMentorForClass` in `scripts/engine/mentor/mentor-dialogues.js` looks for `MENTORS[className]` then defaults to a Scoundrel Mentor on a miss; a raw normalized class ID could silently select the wrong personality. | Resolve exact V2 class identity to canonical Mentor ID, fail closed (diagnostic + neutral or explicit unavailable state), and never silently convert unsupported advanced classes to Ol' Salty. | Verify all 32 prestige and all 5 foundation class IDs, display labels, alias labels, unknown IDs, and null inputs. Wrong mentor is never rendered. |
| **MENTOR-012** | **P1 / CONFIRMED SOURCE; validation TBD** | Existing scripted greetings may state successes and affiliation as unconditional facts; `prestigePaths` may describe a different relationship from `mentor-personalities.json` (e.g., high mentor respect after promotion). | Build a lightweight editorial validator: classify fixed lines as generic-safe, class-threshold-safe, or **requires actor evidence**. Review class-specific relationships separately; do not overwrite already shipped authored lore without approval. | 32 prestige-class intro review sheets; every line has voice profile, evidence requirements, role stage, and owner approval status. |

### 6.3 Per-Mentor implementation / writing recommendations (32 unique characters)

**Status convention:** Rows marked **ISSUE** point to a directly observed issue above; **CHECK** points to a possible routing/consumer mismatch needing tests; **PRESERVE** is a voice-specific preventative requirement and **does not assert the character is broken**. Each row is an implementation handoff, not approved new dialogue.

| Mentor / linked class(es) | Status and specific risk | Proposed fix and voice regression check |
|---|---|---|
| **Miraj** - Jedi; Jedi Knight; Jedi Master | **ISSUE MENTOR-009/010**, **CHECK MENTOR-004**. False shared history, malformed prestige text, overly general Jedi tone. | Stage voice **guide -> respected Knight peer -> collaborative Master equal**; retain gentle, reflective focus on agency and responsibility. Guard claims of direct apprenticeship/friendship; fix verified malformed text. Tests: the same Q1 premise is appropriately distinct for Knight and Master; no forced future Master goal. |
| **Lead** - Scout; Pathfinder | **ISSUE MENTOR-006**, **CHECK MENTOR-005**. Pathfinder greetings assert achievements, squad roles, casualty history. | Dry tactical observation; show how Pathfinder opens routes for **others**; ask about learned judgment instead of naming missions. Evidence-gate successes and command of Argent Squad. Test: never invent a specific extraction or battle. |
| **Breach** - Soldier; Elite Trooper | **ISSUE MENTOR-006**, **CHECK MENTOR-005**. Prestige greetings mention discussions with Lead; generic pseudo-military filler weakens voice. | Keep terse, informal Mandalorian understatement, dry humor, professional recognition; omit specific squad conversations absent tracked evidence. Test: Elite Trooper receives more peer-like respect than new Soldier without hallucinated engagements. |
| **Ol' Salty** - Scoundrel (base/fallback) | **CHECK MENTOR-007/011**. Generic fallback could hijack unmatched prestige class. | Preserve pirate wit as a *real Scoundrel voice*, not safety-net characterization for unsupported prestige ID. Test: no valid prestige class inadvertently receives Salty; Scoundrel still does. |
| **J0-N1** - Noble (base) | **CHECK MENTOR-004/007**. Droid voice can collapse into generic "protocol" with Axiom, Seraphim, Delta. | Keep precise, formal, protocol-driven sardonic Noble aide; human social hierarchy and reputation can matter, unlike Axiom's military obedience. Test: distinctly formal/social, not combat droid. |
| **Darth Miedo** - Sith Lord | **PRESERVE**. Risk of writing both Sith voices as generic menacing cruelty. | Cold, quiet, inevitable, manipulative, patient; minimize shouting and gratuitous violence. Q1 asks about how the character came to exercise control; do not claim Sith-order status beyond verified class. Contrast test against Malbada's aggressive cruelty. |
| **Darth Malbada** - Sith Apprentice | **PRESERVE**. Risk of losing harshness and collapsing into Miedo's calculated detachment. | Intense, cruel, intimidating; recognizes ambition or strength reluctantly, probes how experience transformed resolve. Keep a coercive cadence without asserting specific trials. Contrast test: deliberately unlike Miedo. |
| **Tío the Hutt** - Crime Lord | **PRESERVE**, **CHECK MENTOR-006**. Criminal network scenes or prior deals can become invented actor history. | Amused, unhurried mob boss; talk in leverage, profit, relationships as currencies; do not infer the character already runs a syndicate. Test for no invented deal or shared business. |
| **Riquis** (`anchorite` ID) - Force Disciple | **ISSUE MENTOR-003**, **PRESERVE**. Alias mismatch and generic mystic overwrite risk. | Canonically map `anchorite` -> Riquis; soft, cryptic, ancient/omen-oriented phrasing; no forced light/dark membership or invented visions. Differentiate from Vera's gentle inquiry. |
| **General Axiom** - Droid Commander | **CHECK MENTOR-004/007**. Generic machine voice could match Seraphim. | Reports, directives, hierarchy, coordination, disciplined efficiency and obedience. Do *not* borrow Seraphim's autonomy philosophy or jokes. Test opposing worldview in matched Q1/Q6 outputs. |
| **The Captain** (`captain` ID) - Master Privateer | **ISSUE MENTOR-005 risk**, **PRESERVE**. `captain` substring judgment mapping may resolve to Lead; quoted central display name must not create a second identity. | Exact registry ID, charismatic/theatrical authority, legend/loyalty/crew stakes; do not assume the player owns a ship or commands a crew. Test no Lead voice and no display-name quote artifact. |
| **Delta** - Assassin; Infiltrator | **CHECK MENTOR-004**, **PRESERVE**. Incorrect protocol grouping, and a two-class shared-Mentor identity. | Casual, cocky, lethal, street-smart; **Assassin** foregrounds precision/elimination, **Infiltrator** foregrounds access/cover/evasion. Test identical personality but meaningfully distinct prestige framing; never bureaucratic droid tone. |
| **Dezmin** - Imperial Knight | **PRESERVE**, **CHECK MENTOR-006**. Confusing Imperial Knights with Jedi or presumed affiliation. | Measured, restrained, Imperial-service ethic and duty; do not fabricate oath, rank, specific Emperor connection or allegiance beyond established character facts. Test voice unlike Miraj despite Force language. |
| **Lucky Jack** - Improviser | **PRESERVE**. Generic competence language could suppress signature unpredictability. | Quick, amused, excited about resourceful solutions and odd odds; recognizes the result of adaptability rather than demanding plans. Test playful cadence without inventing a spectacular past accident. |
| **Kex Varon** - Bounty Hunter | **PRESERVE**. Risk of Hollywood swagger/violent boast. | Sparse, prepared, methodical; the hunt begins with intelligence and patience. Test references to tracking, planning, professionalism; avoid asserting paid targets already taken. |
| **Admiral Korr** - Officer | **ISSUE MENTOR-002**. Fate/destiny judgment text contradicts fleet-commander voice. | Replace *only active conflicting lines* after consumer trace; sober strategic briefing, accountability for subordinates, discipline/morale. Test all judgment intensities and Q1-Q6 never sound prophetic or Force-driven. |
| **Krag the Immovable** - Enforcer | **PRESERVE**, **CHECK MENTOR-006**. Lines mention Tío's operation and presume criminal employment. | Short, confident, unyielding: fear, presence, loyalty and measured force. Unless actor history supports it, don't assign player to Tío's syndicate. Test concise distinct tone, not theatrical Captain. |
| **Kyber** - Medic | **ISSUE MENTOR-004 risk**. Jedi-style overlay possible; empathy can become syrupy. | Calm triage pragmatism with dry/dark humor and compassion under constraint. Replace misrouted Jedi prefix with exact Kyber voice; test no mystical Force framing unless actor actually has Force credentials. |
| **Mayu** - Ace Pilot | **ISSUE MENTOR-004 risk**. Mystical overlay possible. | Fast, competitive, teasing, adrenaline-loving; skill and momentum but not empty recklessness. Exact Mayu routing; no mystic/Force voice prefix; do not assert prior dogfights. |
| **Pegar** - Gladiator | **PRESERVE**. References to centuries and historical arenas are about *Pegar*, not the actor. | Faintly amused, very old, survival and spectacle through experience; keep speaker-specific history separated from player facts. Test no attribution of centuries or arena wins to new gladiator. |
| **Rajma** - Gunslinger | **PRESERVE**. Generic lethal expert tone erases flirtatious, cocky charisma. | Light, quick, teasing, confidence focused on precision rather than mere drawing first; avoid uninvited assumptions of intimacy. Test unlike Kex, Delta, or Kharjo. |
| **Chief Engineer Rax** - Military Engineer | **ISSUE MENTOR-004 risk**. Broad `rogue` category may capture `rax` in overlay. | Exact Rax ID; cold technical assessment, geometry, structural weaknesses, preparation and outcomes. Test no pirate, smuggler or roguish slang. |
| **Rogue** - Outlaw | **PRESERVE**. Could blur with Ol' Salty's pirate style. | Defiant, amused, fiercely autonomous, law-skeptical. Test self-rule and movement, not stereotyped nautical slang; no invented criminal record. |
| **Silvertongue Sela** - Charlatan | **ISSUE MENTOR-004 risk**. Overbroad Jedi alias. | Exact Sela routing; warm, theatrical, persuasive and deceptive, amused by belief management. Test no Jedi spiritual language and no presumption of prior con. |
| **Seraphim** - Independent Droid | **ISSUE MENTOR-004 risk**. Mystical overlay possible; blending with Axiom destroys core characterization. | Exact Seraphim ID, sardonic diagnostic tags, insistence on self-ownership, freedom from programmed orders. Test cannot be mistaken for obedient Axiom or Force mystic; no invented emancipation history unless actor evidence exists. |
| **Marl Skindar** - Corporate Agent | **PRESERVE**, **CHECK MENTOR-006**. Intelligence-service details may be mistaken for actor biography. | Dry, impatient, dismissive spy; cover, leverage, compartmentalization and clean operational tradecraft; keep classified assignments generic without claiming actor joined an agency. Test unlike Delta's joking swagger. |
| **Spark** - Saboteur | **PRESERVE**. Oversimplification to reckless detonations would contradict precision. | Energetic, technically specific, proud of targeted disruption; responsible impact vs random chaos. Test enthusiastic phrasing that still references exact system-level consequences. |
| **Shield Captain Theron** - Vanguard | **ISSUE MENTOR-005 risk**. `captain` substring could route to Lead's judgment voice. | Exact Theron ID; calm defender, sacrifice, endurance, positioning, protective duty. Test no Lead field-scout tone and no fabricated military appointment/command. |
| **Shaper Urza** - Shaper | **PRESERVE**. Could be mistaken for general crafter or mystic. | Quietly mischievous biology/engineering perspective; growth, adaptive design, living systems, morally unconventional curiosity. Test no false actual creations attributed to player. |
| **Seeker Vera** (`venn` ID) - Force Adept | **ISSUE MENTOR-003**, **PRESERVE**. Venn/Vera alias mismatch and potential false Jedi voice. | Route `venn` -> Vera; questioning, kindly, wandering, attentive to Force currents without Jedi institutional assumption. Test distinct from Miraj's Jedi tradition and Riquis's riddle-heavy mysticism. |
| **Master Zhen** - Martial Arts Master | **PRESERVE**. Generic monk voice can erase technical body/mind discipline. | Sparse, serene, metaphorical but practical about stance, patience, unarmed discipline and control; no past tournament feats invented. Test distinct from Kharjo's blade-distance precision. |
| **Blade Master Kharjo** - Melee Duelist | **ISSUE MENTOR-001**, **PRESERVE**. Missing registry identity; source dialogue boasts a personal undefeated history despite metadata's "never boasts" description. | Register Kharjo; keep calm precise blade instructor, emphasize timing/distance/form. Treat undefeated claims as Kharjo lore to reconcile *editorially* (not player claims); do not transfer record to actor. Test correct routing and distinct technical style vs Zhen. |

### 6.4 Immediate implementation sequencing (proposal; no code now)

1. **Identity baseline:** establish 37 class -> 32 unique Mentor exact-ID routing; fix/verify Kharjo and Vera/Riquis alias tables before dialogue authoring. Prevent hidden fallback to wrong Mentor.
2. **Consumer map:** trace every dialogue read surface and generation path; record whether it uses central generated data, per-Mentor JSON, suggestion JSON, judgment atoms, or a voice overlay. Prove which issues affect live prestige runtime versus only dormant/other surfaces.
3. **Personality authority:** choose one character-identity reference per Mentor (individual dialogue profile + approved personality metadata); define per-surface voice contracts. Keep mechanical truth outside the style layer.
4. **Data cleanup:** selectively resolve Korr mysticism and Miraj malformed literals; preserve important established narrative and compare authored history against actual actor evidence before writing dynamic personal references.
5. **Prestige entry semantics:** implement approved six-step survey and stage-aware language for pending versus legally finalized acquisition, independent past-event provenance, class-specific Mentors, Q6 feedback and goal retention.
6. **Acceptance suite:** 32-Mentor identity/voice snapshots, 37 class routing checks, negative unsupported-history cases, seven cross-mentor contrast pairs, null/unknown class fail-closed behavior, JSON schema validation, and cancelled-transaction tests. Owner reviews any character/lore retcon before publication.

**Contrast pairs for human editorial approval:** Miraj / Seeker Vera; Seeker Vera / Riquis; Darth Malbada / Darth Miedo; Seraphim / General Axiom; Lead / Breach; Ol' Salty / Rogue; Master Zhen / Blade Master Kharjo; plus the same-Mentor class-pair checks **Miraj Knight / Master** and **Delta Assassin / Infiltrator**.

### 6.5 Rolling status / future update instructions

- **Open issues:** MENTOR-001 through MENTOR-012; **none marked fixed** by this design audit.
- **Per-Mentor voice recommendations:** 32 unique characters recorded. The five foundation classes are included where necessary to distinguish progression-stage relationships.
- **Not performed:** Foundry runtime reproduction, PR or commit, new JSON rewrite, class-rule certification, owner approval of final Mentor lines, or final acceptance tests.
- At the start of implementation, rerun the registry/class/consumer comparison against the actual implementation branch and update each issue with `open -> reproduced -> patched -> tested -> owner approved -> closed` (or mark `not applicable`, with evidence). Keep the rolling file synchronized; do not delete unresolved findings because a source file was edited.
- **Editorial invariant:** dialogue for a class may acknowledge a verified advancement threshold, but cannot fabricate actor achievements, history with a Mentor, allegiance, personal rank, or career ambition. Approved personality is never permission to invent facts.


---

## 7. Owner clarification: Prestige is a capstone, not a ladder (2026-11-14)

**Status: APPROVED PRINCIPLE / OWNER-RESTATED.** The user reiterated an earlier explicit requirement: earning a prestige class may **complete the intended character concept**. Even Jedi Knight can be the final desired class for an entire career. No default promotion path from Jedi Knight to Jedi Master, or from any prestige class to an apex or second prestige class, may be implied. A character can keep adventuring and advancing *within* their achieved prestige identity indefinitely; fulfilling a character concept is not the same as ending their story.

### 7.1 Wording invariant

- Treat the prestige milestone as **arrival** or achievement first. Never suggest the achieved title only matters as qualification for a later title.
- Recognize the character's build history as *evidence of effort and development*, without fabricating events, commitments, faction ties, or an originally declared destination.
- Distinguish **a realized ambition** from **an ambition changed along the way**, **an unexpected achievement**, and **a still-unsettled interpretation**; all are valid narrative responses.
- Never require the player to announce the next prestige class, ultimate level-20 build, or apex plan to validate current success.
- For a survey at a pending progression step, the Mentor recognizes an **earned threshold / readiness / impending choice**, not an acquired class before the class transaction is finalized. After finalization, attained-title language is appropriate.

### 7.2 Revised Q1 editorial aim (DRAFT wording; principle approved)

> You have reached an important milestone. When you look back at the choices that brought you here, what does this achievement mean to you?

Q1 remains a combined retrospective question: the Mentor references **only verified** training/classes/recorded goals and asks the player for personal meaning. Avoid implying the answer is merely a transition to something higher.

Example Miraj / Jedi Knight **pending** (DRAFT):

> You stand at the threshold of Knighthood. It is no small thing to have come this far. Before we speak of the responsibilities you are ready to accept, tell me: what has this journey meant to you?

Example Miraj / Jedi Knight **finalized** (DRAFT):

> You have become a Jedi Knight. That is an achievement worthy of its own consideration. When you look back on your journey, what has mattered most to you?

These are voice candidates, not approved final authored lines.

### 7.3 Candidate retrospective answer meanings (DRAFT; no approved counts or weights)

- **Fulfillment / intended destination:** "This is what I set out to become. Reaching it matters to me." Only phrase any *earlier recorded goal* as fact when an explicit prior declaration exists; as an answer it can otherwise remain the player's own new retrospective claim.
- **Mastery / craft:** "I wanted to become truly capable at what I do. I kept working until I reached this point."
- **Responsibility / service:** "I wanted to be ready for responsibilities I could not have carried before."
- **Adaptation / changed circumstances:** "I adapted to what the journey demanded, and this is where those choices led."
- **Unexpected destination:** "I never expected this to be my destination, but it has become the right one."
- **Reorientation / growth:** "What I wanted changed as I learned more about myself. This achievement reflects that."
- **Integrated training:** "Different kinds of training brought me here. Together, they made me who I am." Show only when the actor actually has multi-domain training if the option implies that objective history.
- **Neutral:** "I have reached this point, but I am still deciding what it means to me."

The earlier Section 3.2 bank remains as design history; these are additional *candidate revisions*, not an instruction to show all eight choices. The previously proposed five substantive + neutral is **still awaiting owner approval**. No new ontology tags or scoring multipliers are approved.

### 7.4 Required downstream implications (approved principle, later wording TBD)

- **Q2 - The Achievement:** teach what the prestige class **itself** grants, unlocks, and permits. Do not market it as a prerequisite for the next class.
- **Q3 - The Responsibility:** explore how the character wants to use their newly earned capability, office, or standing; a class can be an enduring vocation.
- **Q4 - The Commitment:** Dip/Dive/Swim/Undecided refers only to **future levels/investment within the current prestige**, not willingness to move onward to a higher prestige. Do not interpret a Dip as a devaluation of this capstone or a signal of abandoning the class. Bridge is a distinct intent, not a fifth depth.
- **Q5 - The Future:** explicitly permit **"This is the role I wanted; I intend to live and grow in it"**, alongside refinement, service, exploration and **optional** further ambitions. Q5 alone may update a declared future goal only through a deliberate, affirmative goal-target declaration; staying within the current role does not require declaring another class.
- **Q6 - The Mentor's Reflection:** recognize the current prestige identity without forecasting inevitable elevation. Preserve separate lanes for declared goal, current inferred identity, legal eligibility, finalized acquisition and pending transaction.

### 7.5 Acceptance tests for future implementation

1. Jedi Knight is selected and no Jedi Master goal exists: all six questions can complete without implying Jedi Master is required or expected.
2. A prior declaration targeting Jedi Knight exists: Q1 may **recognize** fulfillment, but must not invent subsequent ambitions.
3. A character with no recorded prior goal reaches an advanced-class threshold: the Mentor does not falsely claim this was always the dream.
4. Q4 `Dip` on a newly attained prestige class does not suppress recognition of its achievement or trigger identity-pruning.
5. Q5 option expressing satisfaction within the achieved class does not create an apex or multiclass goal.
6. Pending/abandoned prestige selection does not record a finalized class acquisition or falsely use finalized achievement tense.

**Status at v0.4:** Capstone principle locked; Q1 wording, response bank, option routing and Mentor scripts remain for owner review. Read-only source audit and open MENTOR-001 through MENTOR-012 issues are carried forward unchanged. No GitHub changes made.

---

## 8. Q1 editorial pivot: Teach the prestige class lightly through player answers (2026-11-14)

**Status: OWNER SUGGESTION / DRAFT TO REVIEW.** The owner suggested treating prestige Q1 more like the multiclass Q1, lightly educating the player about their chosen prestige class *through the answer choices*. This supersedes Section 7.2's proposed *primarily retrospective* wording as the leading Q1 draft, but does not revoke the approved capstone/arrival principle or the need for verified build-history recognition. Earlier candidate motivation banks remain historical alternatives, not active approved scripts. **No Q1 final wording, exact count, Mentor intro, content mappings, or code is approved by this suggestion.**

### 8.1 Checked multiclass precedent

The repo's `docs/design/SWSE_Multiclass_Survey_Rolling_Design.md` v0.11 (on `design/multiclass-mentor-survey-q1-q6-v011`, blob `1ee7b499d9c67eb5a0512881e4d6a92946a92068`) states: "Q1 - Class Discovery: teach distinctive and verifiable destination-class capabilities; record what specifically interests the player." Its Noble-to-Jedi example uses five in-character capability-aspiration answers and one neutral. Q1 is prospective interest, not automatic ownership; Q2 integrates actual present build; neither must imply all class features are already granted.

**Prestige adaptation:** A prestige character has *earned entry eligibility or is finalizing a pending class choice*. The Mentor begins with earned-milestone recognition, not a beginner recruiting pitch. The Q1 player options sample real capabilities, talent-tree directions, or role applications available through *this prestige class*; selection means which dimension they hope to pursue or embody, not automatic ownership, a new career declaration, or a stepping stone to another prestige class.

### 8.2 Q1 preferred working anatomy (DRAFT)

1. **Mentor introduction - retrospective recognition.** Brief, voice-authentic, only recorded past facts; explicitly respect the prestige threshold. If acquisition is pending, use threshold/preparation language. If finalized, earned-title language is allowed. Do not invent missions, a known relationship, previous explicit ambitions, or already acquired talents.
2. **Shared question - present milestone to future expression.** Proposed: "You've reached the threshold of [Prestige Class]. Which part of this achievement do you most want to develop?" Exact UI wording and amount of templating pending review. A more character-friendly alternative is: "What kind of [Prestige Class] do you want to become?" Do not use 'become' in a way that denies already finalized class acquisition.
3. **Five first-person class-discovery answers + a first-person neutral (candidate UI pattern).** Each meaningful option introduces one genuinely distinct, canonically supported facet of that *specific prestige* class. Use a curated sampler, not the complete talent-tree index. These are not answers to "what deed did I perform?" and are not an election of another class or mandatory long-term goal.
4. **Record selected facet and actual context.** Retain the selected response identifier/text, prestige class, Mentor, history snapshot, canonical feature/tree references once certified, and pending/finalized progression status. No invented ontology tags or arbitrary weights; only a committed, completed survey is intent evidence. Neutral has no inferred tag or ambition.
5. **Q2 does not repeat Q1.** Q1 is a *light preview* of areas in which this class can develop; Q2 presents exact mechanics, legal level timing, feature grants, eligible talent trees, selection gates and currently owned vs pending vs future options. Optionally orient Q2 detail around Q1 interest without hiding other legitimate class opportunities.

### 8.3 Jedi Knight example - Miraj (DRAFT)

**Introduction:** "You have come far enough to walk the path of a Jedi Knight. This is no small achievement, nor is there only one way to fulfill its responsibilities. Tell me, what part of Knighthood calls to you?"

**Question:** "What do you most want to develop through your training as a Jedi Knight?"

1. "I want to refine my lightsaber technique until every movement is guided by discipline and purpose." -- lightsaber discipline, forms and combat.
2. "I want to deepen my command of the Force and learn techniques beyond my earlier training." -- advanced Force Techniques (repo class progression includes a Force Technique choice at Jedi Knight class level 2; NOT automatic at first entry).
3. "I want to become someone others can depend on when they need protection." -- defensive/protective Jedi roles; exact eligible supporting talents need certification.
4. "I want to investigate hidden dangers and prevent threats before they spread." -- Jedi Investigator / Watchman directions from prestige presentation profile, requiring exact tree-to-record validation.
5. "I want to use my experience to heal, teach, and guide others." -- Jedi Healer / Instructor directions from presentation profile, requiring exact tree-to-record validation.
6. "I haven't decided which part of Knighthood I want to emphasize." -- neutral, zero scoring.

**Verification boundary:** `packs/classes.db` has Jedi Knight class level 1 Defense Bonuses and Talent selection; class level 2 Force Technique. The preexisting `scripts/mentor/mentor-survey/prestige-survey-profiles.js` lists Jedi Knight presentation themes including lightsaber forms, Watchman, Investigator, Healer, and Instructor. These presentation labels are *not enough* to certify a particular actor's eligibility, current ownership or a specific talent grant. Validate available and printed rules per path before production.

**Capstone guardrail:** Every line must make complete sense for a character whose highest, final career aspiration is *Jedi Knight*. No presumed Jedi Master destiny.

### 8.4 Elite Trooper alternative - Breach (DRAFT)

**Introduction:** "You've earned the chance to train as an Elite Trooper. That's worth something on its own. Now, there are different ways to be the one a squad counts on. Which one sounds like you?"

**Question:** "What part of becoming an Elite Trooper do you want to develop most?"

1. "I want the resilience to stay in the fight when a hit would put someone else down." -- Delay Damage at class level 1; Damage Reduction progression begins at class level 2 (exact text to certify).
2. "I want to bring greater precision and mastery to the weapons I already use." -- Weapon Master / Critical Master presentation directions; do NOT assert the actor owns a specific weapon feat.
3. "I want to be effective in tightly coordinated missions, not just in a one-on-one fight." -- Commando / Republic Commando presentation directions; do NOT assert actual prior squad experience.
4. "I want to protect the people beside me and make the hardest fights survivable." -- Protection presentation direction; do NOT invent prior saved teammates.
5. "I want to use concealment and positioning as carefully as firepower." -- Camouflage presentation direction; future development, not preexisting ability.
6. "I haven't decided which part of this training I want to focus on." -- neutral.

**Verification boundary:** `packs/classes.db` has Elite Trooper first-level Defense Bonuses, Delay Damage and Talent, and level 2 Damage Reduction 1. `prestige-survey-profiles.js` lists the talent-tree themes above. Exact tree membership, feat prerequisites and content must be certified using canonical V2 records and printed book sources before these are published. Breach's tone remains conversational and quietly proud rather than a drill sergeant; don't invent combat scenes.

### 8.5 Acceptance gates before scaling to all 32 classes

- Q1 teaches *something distinctive and verifiable* about this prestige class, never just a generic virtue applicable to any character.
- A player can understand the five pathways as distinct and in-character rather than selecting internal talent IDs.
- Each option has a future available feature, talent-tree route or legitimate class application; no implication of automatic grant or guaranteed prerequisites.
- Narrative emphasis can be an end state. The prestige class never becomes an obligatory gateway to an apex class or another career.
- Q1's light class preview and Q2's accurate mechanical explanation are complementary, not duplicates.
- A player already familiar with the class has meaningful identity choices; a newcomer learns class opportunities without reading a rulebook first.
- Pending vs finalized progression tense is accurate; selecting an answer does not finalize class acquisition.
- Two Mentors with the same subject matter still sound different; use the per-Mentor voice ledger in Section 6.
- Retain earlier v0.4 retrospective design as context; record the new class-discovery preference as a working direction pending owner review rather than erasing history.

### 8.6 Editorial choice still open

How much explicit feature naming should appear in first-person Q1 answers? Preferred starting point: speak naturally of class-unique capability *without* exposing feat/talent metadata ("stay in the fight" versus "select Delay Damage"). A passive information rail / tooltip may name canonical features and levels, but only after source and actor-state verification. Also pending: should the Q1 bank be fixed per prestige class, or adapt the five shown from a larger canonical class-specific library according to earlier player-declared goals and mechanically supported interests? Do not bulk-author until owner chooses.

**Change log:** Local v0.5 appended read-only editorial design based on owner suggestion. Sections 1-7, all 12 open Mentor issues, and per-Mentor recommendations remain intact. No runtime edits, GitHub commits, pushes, or PRs.

---

## 9. Core Rulebook prestige-class Q1 review - Book 1, Class 1: Ace Pilot (2026-11-14)

**Status:** Source-reviewed, owner-facing FIRST DRAFT. No dialogue wording, option count, scoring mapping, runtime change, or answer-bank adaptation policy is approved. This conversation is strictly Q1; the other survey questions are OUT OF SCOPE for subsequent discussions in this thread.

### 9.1 Source boundary and Core book order (VERIFIED PRIMARY SOURCE)

*Star Wars Saga Edition Core Rulebook*, Chapter 12, printed p. 206, Table 12-1, enumerates these 12 prestige classes in this order:

1. Ace Pilot (Mayu)
2. Bounty Hunter (Kex Varon)
3. Crime Lord (Tio the Hutt)
4. Elite Trooper (Breach)
5. Force Adept (Seeker Vera)
6. Force Disciple (Riquis)
7. Gunslinger (Rajma)
8. Jedi Knight (Miraj)
9. Jedi Master (Miraj)
10. Officer (Admiral Korr)
11. Sith Apprentice (Darth Malbada)
12. Sith Lord (Darth Miedo)

The published roster was visually checked on PDF physical page 207 (printed 206); each Mentor is from the repository's 37 class assignments. This is **book publication order**, not a claim that expansion books' classes/talent-tree additions have been included. Only Ace Pilot Q1 is being drafted here. All later classes wait for owner review.

### 9.2 Ace Pilot mechanics: teachable Core facets (PRIMARY-SOURCE VERIFIED)

Primary sources: Core printed **p. 206** (class identity, qualification, Table 12-2) and **p. 207** (class defense bonuses, Expert Pilot, Gunner, Vehicle Dodge); Core printed **p. 47** (Spacer talent tree). Physical PDF pages 207, 208, and 48 were visually reviewed against `Core Rulebook_djvu.txt` for text navigation.

- **What this class is:** A vehicle-combat specialist, but not necessarily a starfighter pilot. Examples in printed description include starfighter, space transport, Podracer, air taxi and AT-AT. Don't falsely restrict Q1 to starfighters, racing, smuggling, owning a vehicle, or being in a particular military unit.
- **Entry gates:** Minimum heroic level 7, trained Pilot skill, Vehicular Combat feat. An eligible character has met these rules gates; no specific races, victories, missions, crew memberships, ship ownership, or kills are implied.
- **At Ace Pilot class level 1:** Defense bonuses +4 Reflex / +2 Fortitude and a talent selection. These are class mechanics, not all possible talents being acquired at once.
- **On even Ace Pilot levels:** Vehicle Dodge begins at class level 2 (+1), increases to +2 at level 4 and reaches +5 at level 10. This must not be narrated as a bonus already owned by every new ace.
- **Expert Pilot tree:** Elusive Dogfighter and Pursuit emphasize dogfighting; Full Throttle high speed; Juke (requires Vehicular Evasion), Vehicular Evasion and Keep it Together emphasize defense/survivability. Individual prerequisites and situation triggers apply.
- **Gunner tree:** Expert Gunner improves accuracy with vehicle weapons; Dogfight Gunner (requires Expert Gunner) supports a gunner even if they are not piloting; Quick Trigger and System Hit provide reaction/system-disruption paths, respectively (both require Expert Gunner). Do not equate a good pilot with automatically owning a starship weapon or gunner talent.
- **Spacer tree:** Accessible to Ace Pilots under the Core rules, even though listed under Scoundrel at printed p. 47. Spacehound, Starship Raider and Stellar Warrior are printed examples of shipboard ability; retain relevance beyond dogfight-only pilot identity. Check each text/prerequisite before implementation.
- **Expansion caveat:** `packs/classes.db` on the inspected repo snapshot lists six tree IDs (Expert Pilot, Gunner, Spacer, Squadron Leader, Blockade Runner, Wingman). The **Core** source supplies the first three. Expansion trees may warrant additional candidate answers later, but must be linked to their correct publication and source pages; do not misattribute them to Core.

Repository cross-check (not a substitute for print): `packs/classes.db` Ace Pilot has level 1 Defense Bonuses and Talent, level 2 Vehicle Dodge +1, then the published increasing two-level progression. `data/prestige-class-prerequisites.json` lists Pilot and Vehicular Combat at level 7. Mechanics are prospective for an actor still in a pending progression session.

### 9.3 Mayu's canonized characterization for this class (VERIFIED DIALOGUE JSON)

- `data/dialogue/mentors/mayu/mayu_dialogue.json`: Mayu is fast-talking, cocky, instinctive, competitive, teasing, a little reckless, and skilled enough to recognize that survival matters. She prefers freedom, speed, momentum and self-reliance. The file itself titles her an Ace Pilot and Rogue Smuggler; **do not imply that all Ace Pilots are smugglers**.
- `data/dialogue/mentor-suggestions/mentor-personalities.json`: `Ace Pilot` maps to Mayu; traits `cocky`, `skilled`, `reckless`, `competitive`; moderate verbosity and `cocky_acceptance` recovery.
- The wording should sound like she is addressing a **qualified, maturing pilot**, not literally teaching a beginner to fly or insisting the player has previously crashed, won races, flown starfighter missions, or met Mayu personally.
- Avoid generic 'flight is freedom' fortune-cookie filler, mystical framing, and synthetic/robotic declarative statements. A small teasing line is good; repeated forced jokes are not.

**New issue observation - MENTOR-013 / P1 / CONFIRMED SOURCE; runtime effect unverified:** `data/dialogue/mentors/mayu/mayu.json` judgment phrases include robotic terms such as 'Observation acknowledged', 'Your action has been logged', and 'Continue optimization', inconsistent with her own natural-language dialogue/personality. Before changing data, trace the consumers of this judgment JSON. Proposed fix: replace only active, conflicting Mayu judgment atoms with short, brisk, competitive, lived-in pilot language while retaining schema/semantic intensity coverage. Acceptance: route all active Mayu judgments, including Q1 responses, and verify no robotic protocol language leaks; run regression for other droid characters to avoid replacing their legitimate diagnostic syntax. Track this alongside MENTOR-004 (Mayu wrongly categorized as `mystical` in broad voice overlay) and MENTOR-007 (split source authority).

### 9.4 Q1 first-pass draft - Mayu / Ace Pilot (OWNER EDITORIAL REVIEW)

**Fixed Mayu introduction (DRAFT, pending class acquisition):**

> "Look at you. You've done the work to qualify as an ace. Not bad. Just remember, the title won't take the controls for you. So what kind of ace do you want to be?"

**Shared question (DRAFT):**

> "Which part of being an Ace Pilot interests you most?"

**Default five first-person answers + neutral (DRAFT):**

1. **Dogfight advantage:** "I want to read another pilot's moves and stay one step ahead when we're locked in a dogfight."
2. **Speed and control:** "I want to push a vehicle to its limits without losing control when everything starts moving fast."
3. **Evasive survival:** "I want to keep my vehicle and the people aboard it in one piece, even when the fire starts coming in."
4. **Vehicle gunnery:** "I want to put shots where they matter, even when the vehicle's twisting through a close fight."
5. **Versatile spacer:** "I want to handle whatever the space lanes throw at me, whether I'm at the controls or fighting aboard a ship."
6. **Neutral (no identity inference):** "I'm not ready to pick a specialty. I want to understand what I can do as an ace first."

**Additional candidate options for possible adaptive bank (DRAFT, NOT automatically displayed):**

7. **Systems disruption:** "I want to knock enemy vehicles out of the fight by hitting their systems, not just pouring on damage." (System Hit future talent, requires Expert Gunner; no promise of automatic capture/nonlethal results.)
8. **Vehicle breadth:** "I don't want my skills confined to starfighters. I want to be capable in transports, speeders, and heavy vehicles, too." (Published class breadth and generally applicable piloting/vehicle-defense options; not proof of a vehicle-type-specific talent.)

**Internal educational coverage / authority (not player-visible metadata):**

| Draft answer | Core rules anchor | Source print page | Boundary |
|---|---|---|---|
| 1 Dogfight advantage | Pursuit, Elusive Dogfighter, Expert Pilot | 207 | Combat focus is a desire, not proof of previous dogfights. |
| 2 Speed and control | Full Throttle, Expert Pilot | 207 | Speed bonus/action details conditional on talent selection and scenario. |
| 3 Evasive survival | Vehicular Evasion, Juke, Keep It Together; Vehicle Dodge | 206-207 | Vehicle Dodge begins only at class level 2; Juke has a prerequisite. No assumed crew. |
| 4 Vehicle gunnery | Expert Gunner, Dogfight Gunner, Gunner tree | 207 | Gunner may be different from pilot; may not own weapon. |
| 5 Versatile spacer | Spacer tree, shipboard talents and weapon familiarity | 47, 207 | Class is vehicle-wide; Spacer path is explicitly shipboard, not all vehicles. |
| 6 Neutral | None | - | Zero tags/bias, no declared future specialization, not equal to Dip. |
| 7 Systems disruption, optional | System Hit, Gunner tree | 207 | Talent has Expert Gunner prerequisite; condition effect is not guaranteed harmless capture. |
| 8 Vehicle breadth, optional | Published class identity and vehicle-neutral abilities | 206-207 | No special proficiency or exclusive vehicle-type feat promised. |

**Editorial considerations:** Answer 4 and optional answer 7 both derive from Gunner; they should not displace the only Spacer answer in a fixed-five presentation without owner approval. Answer 5 is more specialized to starships than the class's general vehicle definition. If user wants strong non-combat/heavy vehicle representation, consider swapping/merging answer 5 with option 8. The class's specialisms in a fully integrated system may require cross-book data for Squadron Leader/Blockade Runner/Wingman. None of this authorizes class stereotype-based answer selection.

### 9.5 Q1 acceptance gates for Ace Pilot (proposed)

- Book-order and class identity: start with Ace Pilot and Mayu; no other prestige class receives authored dialogue in this pass.
- All first-person options are materially distinct, understandable as in-world player statements, and support a Core rule or published class application.
- Recognize eligibility without inventing a first dogfight, ace victory, kill count, personal mentorship, vehicle ownership, spouse/crew, or ship type.
- Mayu intro reflects qualified pilot skill and gives recognition without implying a required next career or future prestige class.
- `Expert Pilot`, `Gunner`, `Spacer` all represented in the candidate pool; no automatic talent/bonus ownership assertions; no invented source IDs or new ontology tags.
- Answer choices are **future interest**. A completed Q1 selection cannot overwrite an earlier declared career goal or claim a currently acquired talent.
- No mechanical weights, tags, final dynamic selection rule, or fixed-count policy adopted without explicit owner approval.
- Read-only research only. No runtime edits, database changes, commits, PRs, or pushes.

### 9.6 Editorial decisions pending owner review

1. Approve or revise Mayu's fixed Q1 introduction; should it be a little more irreverent or more respectful of the earned capstone?
2. Approve or revise the five core answer angles; especially whether versatile shipboard Spacer is essential or whether broad vehicle-type adaptability should occupy one of five default slots.
3. Decide later whether class-specific adaptive answers are needed, once we establish the first several Core class patterns. No need to choose the full 32-class routing policy now.

**Change log (v0.6):** Preserved entire v0.5 local design and all original 12 open Mentor issues. Added primary-source Chapter 12 book roster, a Core-only Ace Pilot class audit, Mayu dialogue-source review and new Mayu-specific MENTOR-013 observation, first five-plus-neutral Q1 draft, two optional response candidates and explicit approval gates. No GitHub changes.

---

## 10. Ace Pilot Q1: Full published talent access audit - supplement correction (2026-11-14)

**Status: SOURCE-REVIEWED; editorial implications remain DRAFT.** This section expands, and where necessary corrects, the partial Core-only inventory of section 9. No Q1 dialogue has been approved; no later class is being authored. No Git changes.

### 10.1 Correct scope: six talent trees, not three

The *Core Rulebook* explicitly allows Ace Pilot talent selections from **Expert Pilot, Gunner, or Spacer**, at odd-numbered Ace Pilot class levels (1, 3, 5, 7, 9), subject to prerequisites. Supplements establish **three additional available trees**. The current `packs/classes.db` agrees with this six-tree set by its typed `talentTreeIds`: `expert_pilot`, `gunner`, `spacer`, `squadron_leader`, `blockade_runner`, `wingman`. Repo metadata corroborates the source review but never overrules printed text.

| Tree | Authoritative initial source (printed page) | Purpose and scope |
|---|---|---|
| Expert Pilot | Core Rulebook p. 207 | Dogfighting, vehicle handling, pursuit, speed, evasion, and surviving damage. |
| Gunner | Core Rulebook p. 207 | Vehicle gunnery, accurate attacks, firing opportunities, and disabling enemy systems. |
| Spacer | Core Rulebook p. 47 | Starship and shipboard expertise including zero-gravity operations and personal combat aboard a ship. Originally located within Scoundrel's talent trees but explicitly permitted to Ace Pilot by the prestige class rules. |
| Squadron Leader | Starships of the Galaxy pp. 17-18 | Squadron command, shared maneuvers, coordinated attacks, restoration of squadron condition. Vehicles supported: airspeeders, starfighters, space transports, within stated communication and squad-size restrictions. |
| Blockade Runner | Scum and Villainy pp. 25-26 | Escape, movement, protective proximity to other vehicles, defending against pursuit, and capital-ship fire. Smuggler narrative flavor is not a mandatory player backstory. |
| Wingman | Rebellion Era Campaign Guide p. 40 | Tight formation work, supporting allied attacks, covering allied vehicles, disrupting pursuit, counterattacking aggressors. Must pilot a Colossal-or-smaller vehicle; other range/adjacency restrictions apply. |

**Potential name collision:** `Wingman` is ALSO a single talent added to **Expert Pilot** in *Starships of the Galaxy* p. 17, distinct from the **Wingman talent tree** introduced in *Rebellion Era Campaign Guide* p. 40. Treat as different canonical identities.

### 10.2 Exact published talent-name coverage, by source

This is a source-book authoring inventory rather than a certification of pack records, effects, prerequisites, entitlement at character entry, or runtime implementation.

**Expert Pilot tree:**

- Core p. 207: Elusive Dogfighter, Full Throttle, Juke, Keep It Together, Pursuit, Vehicular Evasion (6).
- Starships of the Galaxy p. 17: Blind Spot, Close Scrape, Improved Attack Run, Vehicle Focus, Wingman (5).
- Clone Wars Campaign Guide p. 39: Renowned Pilot (1). This emphasizes allies' confidence and Pilot-check rerolls; not merely the ace's own speed or damage.
- Galaxy of Intrigue p. 24: Clip, Master Defender, Shunt Damage (3). Master Defender and Shunt Damage represent very different defensive ethics; Shunt Damage diverts damage to an adjacent allied ship, not a harmless mitigation.
- Unknown Regions p. 29: Roll Out (1), a dogfight escape option dependent on Elusive Dogfighter.
- **16 named Expert Pilot talents across these texts.**

**Gunner tree:**

- Core p. 207: Dogfight Gunner, Expert Gunner, Quick Trigger, System Hit (4).
- Starships of the Galaxy p. 17: Crippling Hit, Great Shot, Synchronized Fire (3).
- Unknown Regions p. 29: Fast Attack Specialist, Overcharged Shot (2).
- **9 named Gunner talents across these texts.** System Hit, Crippling Hit and Overcharged Shot have meaningfully different tactical functions and/or prerequisites.

**Spacer tree:**

- Core p. 47: Hyperdriven, Spacehound, Starship Raider, Stellar Warrior (4).
- Scum and Villainy p. 16: Cramped Quarters Fighting, Make a Break for It (2).
- Unknown Regions pp. 18-19 (scoundrel new Spacer talents): Deep Space Raider (1), with Spacehound and Starship Raider prerequisites and multiple shipboard/vehicle attack options.
- **7 named Spacer talents across these texts.** IMPORTANT: Core **Hyperdriven** references the character's **scoundrel class level** for its bonus. Being able to select a Spacer talent as an Ace Pilot does not mean the talent's scaling changes to Ace Pilot class level. Do not overpromise its value to a no-Scoundrel Ace Pilot.

**Squadron Leader tree (Starships of the Galaxy pp. 17-18):** Begin Attack Run; Regroup; Squadron Maneuvers; Squadron Tactics (4). Some talents require Charisma/Wisdom scores, other Ace Pilot talents, or Starship Tactics. Squadron membership, communications, and vehicle type matter; no automatic authority over arbitrary allied craft.

**Blockade Runner tree (Scum and Villainy pp. 25-26):** Close Cover; Outrun; Punch Through; Small Target; Watch This (5). Close Cover requires Watch This; other features have relative-size or action constraints. This tree can reflect civilian transports or escaping dangerous encounters without assuming the character smuggles.

**Wingman tree (Rebellion Era Campaign Guide p. 40):** Concentrate All Fire; Escort Pilot; Lose Pursuit; Run Interference; Wingman Retribution (5). Run Interference and Wingman Retribution require Escort Pilot. Protection and support should be clearly distinct from the Squadron Leader's group-command fantasy.

**Audited total:** 16 + 9 + 7 + 4 + 5 + 5 = **46 unique printed talent names across six legal trees**, considering the publications reviewed and not conflating similarly named tree/talent concepts. This is a publication-level inventory, NOT a claim that all 46 are present, uniquely keyed, mechanically certified, immediately obtainable, or usable by every character. Later errata/campaign availability and every prerequisites chain remain separate validation gates.

### 10.3 Class rules and exact Q1 boundaries

- **Entry to Ace Pilot:** at least heroic level 7, trained Pilot, Vehicular Combat feat (Core p. 206). These are mechanical gates, not proof of ace victories, cargo, named allies, squadron command, or previous flight history.
- **At class level 1:** +4 Reflex and +2 Fortitude class-defense bonuses; choose one talent from available trees (Core pp. 206-207). Never claim acquisition of multiple talents from Q1 answer options; a selected Q1 option is interest only.
- **Further talent selections:** every odd Ace Pilot class level, specifically 1, 3, 5, 7, 9. **Vehicle Dodge** grows on even levels 2, 4, 6, 8, 10 (Core pp. 206-207). Do not describe the level-2+ class feature as already owned at entry.
- A talent-tree entitlement does not waive a talent's individual ability-score, feat, talent, equipment, vehicle-size, or action-specific prerequisites; `Hyperdriven` also demonstrates cross-class-specific scaling.
- Squadron Leader and Wingman offer distinct support identities: group tactics/command versus nearby ally protection. Different first-person educational responses are warranted.
- Ace Pilot can mean starfighter, transport, airspeeder, Podracer, or heavy vehicle; not all class talents apply equally to every vehicle type. Do not introduce an assumed rank, military organization, smuggler status, starfighter ownership, or vehicle-combat kill record.
- A vehicle's defensive protection, the pilot's personal defensive class bonuses, starship/shipboard talents, and gunner roles are mechanically different. Avoid collapsing them into one vague defense or spacefaring answer.

### 10.4 Proposed Q1 answer-bank correction (NOT APPROVED)

The section 9 five-plus-neutral Mayu draft was **too narrow**: it covers Expert Pilot, Gunner and Spacer, but omits the distinctive published Squadron Leader, Blockade Runner, and Wingman trees. Before locking a fixed-five presentation, create a broader class-specific option bank and deliberately cover six trees. Candidate first-person educational themes:

1. **Expert Pilot - maneuvering:** "I want to outfly another pilot when it counts, not just outrun them in a straight line."
2. **Expert Pilot - defense:** "I want to keep control when the hits start coming and get my vehicle out in one piece."
3. **Gunner - precision:** "I want to make every vehicle weapon count, whether I'm flying or working the guns."
4. **Gunner - systems:** "I want to put enemy ships out of action by hitting what keeps them running."
5. **Spacer - shipboard expertise:** "I want to be just as capable aboard a ship as I am at the controls, even when gravity or the situation turns against me."
6. **Squadron Leader - formation command:** "I want to bring several pilots together so we can fight like a squadron instead of a handful of separate ships."
7. **Blockade Runner - escape and pursuit:** "I want to find a way through a blockade or a pursuit without losing the ship to the people trying to stop us."
8. **Wingman - protective support:** "I want to cover the pilots beside me and make sure they get home, not just make a name for myself."
9. **Vehicle range - class identity:** "I want to master more than starfighters: transports, speeders, and heavier vehicles all have their place." This is a class-wide theme, **not** a separate talent tree.
10. **Neutral:** "I'm still finding out which part of being an ace matters most to me." No positive or negative bias/tags.

All answer text above is **illustrative source-backed editorial copy, not approved content**. The source audit supports a larger candidate pool or a discussion of a greater than five count, but **the number shown and any adaptation policy remain owner decisions**. Do not remove Squadron Leader, Blockade Runner, Wingman, or Spacer merely because they were not in the Core-only Q1 draft.

### 10.5 Follow-up certification tasks for implementation (not part of this Q1 editorial chat)

1. Compare the 46 printed names with the typed V2 talent registry, source pages and canonical tree affiliations. Detect aliases, dupes, missing talents, and mismatched prereqs. Do not use the old prestige presentation `trees` array as entitlement authority.
2. Reconcile the six `packs/classes.db` tree source IDs to actual, available talent records and cross-book expansion membership in the canonical registry; no inferred class grants.
3. Ensure response-answer mapping uses frozen canonical ontology and provenance without inventing IDs. Any adaptive filtering must preserve player agency and non-combat/crew-specialist identities.
4. Check variant `Wingman` talent versus `Wingman` tree identity, and Scoundrel-class-level references in Spacer talent text, explicitly.
5. Keep Mayu's dialogue anchored to the individually verified personality JSON and the Mentor issue ledger. Q1 only, no Q2 work or repo changes.

**Change log:** v0.7 adds a primary-source cross-book expansion correction and Ace Pilot's full six-tree published inventory to the existing rolling doc. The v0.6 dialogue is retained as a prior first draft and not silently treated as approved. No code, GitHub, or runtime changes.

---

## 11. Ace Pilot Q1 - Full player-answer editorial library v0.8 (2026-11-14)

**Status:** COMPLETE FIRST-PASS EDITORIAL LIBRARY, NOT OWNER-APPROVED, TAG-MAPPED, MECHANICALLY IMPLEMENTED, OR LOCKED. This Q1-only authoring pass builds from the verified six-tree and 46 named-talent source census in section 10. It is not an assertion that all choices are currently available to a given actor, nor is it a list of acquired talents. The 30 tree-focused answers below provide distinct, source-grounded directions; two optional class-identity/fulfillment statements plus one neutral answer are kept separate. The actual number displayed at once and adaptive selection policy are NOT approved.

### 11.1 Mentor introduction - Mayu / Ace Pilot

**Candidate A (preserve previous draft):**
> "Look at you. You've done the work to qualify as an ace. Not bad. Just remember, the title won't take the controls for you. So what kind of ace do you want to be?"

**Candidate B (preferred editorial revision):**
> "Well, look at that. You've earned your shot at being an ace. Doesn't mean there's only one way to fly, though. So tell me - what do you want to be known for?"

These two versions presume only the legitimately established prestige-class qualification, not a specific flight or victory. The word "earned" describes meeting eligibility for the capstone, not a claimed already-finalized class grant. Candidate B is pre-acquisition-safe for a pending selection; after actual acquisition, a separate achieved-acquisition line can use completed-language. Do NOT automatically assume Mayu has personally watched previous missions.

**Q1 (draft):** "Now that you've reached the threshold of Ace Pilot, what part of the role do you want to make your own?"

**Strictly first-person player answers follow.** IDs are local editorial IDs, not canonical engine IDs, archetype keys, or invented ontology tags. Underlying tree/talent references are developer/editorial annotations, NEVER the text on a first-person selection button.

### 11.2 Expert Pilot - 7 educational answers

| ID | Player-facing first-person answer | Printed talent touchpoints | Editorial qualification |
|---|---|---|---|
| AP-Q1-EP01 | "I want to get on an opponent's tail and stay there, even when they try everything to shake me." | Pursuit; Elusive Dogfighter | Dogfight pursuit/positioning; not a promise of automatic attack bonuses. |
| AP-Q1-EP02 | "I want to be the hardest pilot to pin down in a dogfight, keeping my enemies guessing even while I stay in the fight." | Elusive Dogfighter; Blind Spot | Separate evasive positioning from EP01's chase; Blind Spot has target size and positional restrictions. |
| AP-Q1-EP03 | "I want to push a vehicle beyond ordinary speeds and still know exactly what I'm doing at the controls." | Full Throttle | All-out movement and relevant Pilot checks; no claim of unrestricted vehicle speed. |
| AP-Q1-EP04 | "I want to keep a vehicle in one piece when a fight turns ugly, dodging the worst hits and holding together under fire." | Vehicular Evasion; Juke; Keep It Together; Close Scrape; Master Defender | Vehicle defense/survival; these talents differ and have individual circumstances and prerequisites. This answer does not grant all of them or include Shunt Damage. |
| AP-Q1-EP05 | "I want to find attack angles nobody expects, slipping past a bigger opponent's guns to make my own strike count." | Improved Attack Run; Blind Spot | Offensive maneuvering, including special conditions for Blind Spot. |
| AP-Q1-EP06 | "I want to know one kind of vehicle so thoroughly that piloting it becomes second nature." | Vehicle Focus | Focus selects ONE type of vehicle; don't reinterpret as universal vehicle mastery. Requires Wisdom 13. |
| AP-Q1-EP07 | "I want to earn the kind of reputation that steadies the pilots flying beside me when the pressure is on." | Renowned Pilot | Renowned Pilot supports allies with a Pilot reroll; doesn't establish an existing reputation or organization. |

**Source anchors:** Core Rulebook p. 207; Starships of the Galaxy p. 17; Clone Wars Campaign Guide p. 39; Galaxy of Intrigue p. 24. `Roll Out` (Unknown Regions p. 29) offers a natural advanced variant for EP01/EP02: "I want to know when and how to break off a dogfight without leaving the rest of my crew helpless." Prerequisite Elusive Dogfighter; edit as separate variant only if the user approves greater answer depth. `Clip` (Galaxy of Intrigue p. 24) supports a distinct dangerous ramming/impact strategy, not implied by general attack-run text. `Shunt Damage` redirects an actual hit to an allied ship and must NEVER be folded into an altruistic survival/protection answer. These three remain documented supplemental micro-directions rather than silently erased rules options.

### 11.3 Gunner - 6 educational answers

| ID | Player-facing first-person answer | Printed talent touchpoints | Editorial qualification |
|---|---|---|---|
| AP-Q1-GN01 | "I want to make every vehicle weapon shot count, whether the target is close enough to see clearly or barely in range." | Expert Gunner; Great Shot | Vehicle gunnery accuracy/range rather than personal blaster skill. |
| AP-Q1-GN02 | "I want to keep firing effectively in the middle of a dogfight, even when I'm working the guns instead of flying." | Dogfight Gunner | Requires Expert Gunner; supports dedicated gunners, not only pilot-controlled guns. |
| AP-Q1-GN03 | "I want to disable an enemy vehicle by wrecking the systems it needs to keep fighting, not just hammer away at its hull." | System Hit; Crippling Hit | Condition-track effects and specified systems; Crippling Hit requires Expert Gunner and System Hit. |
| AP-Q1-GN04 | "I want to take the shot the moment an enemy gives me an opening, before it can get away." | Quick Trigger; Fast Attack Specialist | Reaction / rapid attacks in different situations; Fast Attack Specialist has vehicle-size and other prerequisites. |
| AP-Q1-GN05 | "I want to time my fire with another gunner so two well-placed hits land harder together." | Synchronized Fire | Specific coordinated readying and attack conditions; no general shared extra damage. |
| AP-Q1-GN06 | "I want to coax one decisive burst out of a vehicle weapon, even if that means giving it time to recover afterward." | Overcharged Shot | Specific power/attack tradeoff; requires Expert Gunner and a suitable energy weapon. |

**Source anchors:** Core Rulebook p. 207; Starships of the Galaxy p. 17; Unknown Regions p. 29. Players are not assumed to own vehicle weapons, a crew, or a specific attack feat. Q1 communicates future preference only.

### 11.4 Spacer - 4 educational answers

| ID | Player-facing first-person answer | Printed talent touchpoints | Editorial qualification |
|---|---|---|---|
| AP-Q1-SP01 | "I want to move and fight in zero gravity without feeling like I'm out of my element." | Spacehound | Shipboard/zero-gravity operations; not universal immunity to environmental conditions. |
| AP-Q1-SP02 | "I want to be as capable in a ship's cramped corridors as I am at its controls when trouble comes aboard." | Starship Raider; Stellar Warrior; Cramped Quarters Fighting | Shipboard personal-combat path, distinct from vehicle gunnery. Individual talent prerequisites vary. |
| AP-Q1-SP03 | "I want to stay on the move when a shipboard fight turns against me, slipping away before anyone can trap me." | Make a Break for It | Scum and Villainy new Spacer talent; action and attack-of-opportunity conditions apply. |
| AP-Q1-SP04 | "I want to know how to raid a ship, disrupt its defenses, and get out before its crew can respond." | Deep Space Raider; Starship Raider | Expanded shipboard/vehicle raid direction, with Spacehound + Starship Raider prerequisites for Deep Space Raider. |

**Source anchors:** Core Rulebook p. 47; Scum and Villainy p. 16; Unknown Regions pp. 18-19. Core `Hyperdriven` is deliberately NOT a default answer: its printed calculation refers to **Scoundrel class level**, not Ace Pilot level, and is unsuitable as universal Ace Pilot advancement promise. Preserve as optional source-verified conditional variant if relevant after per-character certification.

### 11.5 Squadron Leader - 4 educational answers

| ID | Player-facing first-person answer | Printed talent touchpoints | Editorial qualification |
|---|---|---|---|
| AP-Q1-SL01 | "I want to call the right target and bring a whole squadron in on a coordinated attack run." | Begin Attack Run | Squadron leader role and attack run; requires Charisma 13 and eligible, communicating squad. |
| AP-Q1-SL02 | "I want to keep the ships under my command in fighting shape when a battle starts going wrong." | Regroup | Squadron condition recovery; requires Charisma 13 and eligible squad. No presumption of existing command. |
| AP-Q1-SL03 | "I want to teach the flying and gunnery tricks I know so an entire squadron can benefit from them." | Squadron Maneuvers | Shares a specifically selected *already owned* Expert Pilot or Gunner talent; prerequisite chain applies. The word 'know' is prospective in a wish. |
| AP-Q1-SL04 | "I want a squadron to maneuver as one unit, each pilot knowing how to use the opening the others create." | Squadron Tactics | Shared starship maneuver opportunities; high prerequisite chain including Starship Tactics, ability scores and earlier talents. |

**Source:** Starships of the Galaxy pp. 17-18. Squadron Leader is group tactical leadership, NOT the same as the separate Officer prestige class or the Wingman talent tree. Do not presume rank or automatic squad ownership.

### 11.6 Blockade Runner - 4 educational answers

| ID | Player-facing first-person answer | Printed talent touchpoints | Editorial qualification |
|---|---|---|---|
| AP-Q1-BR01 | "I want to guide a ship through an enemy blockade, making even heavy guns struggle to find a clean shot." | Small Target; Watch This | Appropriate relative size / vehicle size restrictions; escape theme is not proof of illegal activity. |
| AP-Q1-BR02 | "I want to turn speed into protection, making it harder for pursuers to hit my vehicle as I race away." | Outrun | Outrun's dodge benefit applies to specified all-out movement, not a passive speed bonus. |
| AP-Q1-BR03 | "I want to fly so close to a larger vessel that its own bulk becomes cover for my escape." | Watch This; Close Cover | Close Cover requires Watch This; specific large-vehicle proximity and size requirements apply. |
| AP-Q1-BR04 | "I want to break through a dangerous approach without letting another pilot force me into a fight I never chose." | Punch Through | Changes difficulty of forcing dogfight engagement; not immunity from dogfights. |

**Source:** Scum and Villainy pp. 25-26. Blockade Runner is not synonymous with criminal or smuggler identity; player may be a civilian, rescuer, courier, military pilot or something else.

### 11.7 Wingman - 5 educational answers

| ID | Player-facing first-person answer | Printed talent touchpoints | Editorial qualification |
|---|---|---|---|
| AP-Q1-WM01 | "I want to fly close enough to another pilot that we can keep each other's vehicles in the fight." | Escort Pilot | Damage-threshold benefit applies to eligible adjacent allied vehicles, not arbitrary distant fleet. |
| AP-Q1-WM02 | "I want to help the pilot beside me shake off an enemy before either of us gets trapped in a dogfight." | Lose Pursuit | Avoiding opportunistic dogfight engagement, within qualifying proximity. |
| AP-Q1-WM03 | "I want to use my own flying to turn aside a shot headed for a nearby ally." | Run Interference | Reaction using Vehicular Combat; requires Escort Pilot. Not a generic passive interception. |
| AP-Q1-WM04 | "I want to help a wingmate line up the shot that ends the fight, even if I don't get the credit." | Concentrate All Fire | Aid another improves allied vehicle weapon hit; specific attack procedure and bonus damage apply. |
| AP-Q1-WM05 | "I want anyone who fires on my wingmate to know I'll be answering with my own guns." | Wingman Retribution | Reaction attack on an ally's attacker; requires Escort Pilot and -5 attack penalty. |

**Source:** Rebellion Era Campaign Guide p. 40. Wingman tree applies when piloting **Colossal or smaller** vehicle; further adjacency, vehicle size and reaction limitations are talent-specific. IMPORTANT: `Wingman` in *Starships of the Galaxy* p. 17 is a different **Expert Pilot talent**, not one of these five Wingman tree talents.

### 11.8 Optional character-identity answers (NOT separate class talent trees)

| ID | Player-facing first-person answer | Basis and proper interpretation |
|---|---|---|
| AP-Q1-ID01 | "I don't want to be known for just one kind of craft. I want to grow comfortable flying anything from a speeder to a transport or starfighter." | Core class identity covers many vehicles, but this is a **broad capability aspiration**, not a talent promising universal proficiency. Can coexist with several specialist options. |
| AP-Q1-ID02 | "I could spend the rest of my career becoming a better Ace Pilot. I don't need another title to make that worthwhile." | **Capstone-fulfillment / settled-role declaration**, distinct from skill specialization and neutral undecided. Never automatically change a previously declared future career goal without explicit future-goal affirmation. |

**One always-available neutral choice:**

| ID | Player-facing first-person answer | Interpretation |
|---|---|---|
| AP-Q1-NEUTRAL | "I want to understand what being an Ace Pilot makes possible before I decide where to focus." | No positive or negative weighting; no assigned specialization; no implied lack of ambition. |

### 11.9 Review of total editorial coverage and alternatives

- **30 substantive tree-based player answers:** Expert Pilot 7 + Gunner 6 + Spacer 4 + Squadron Leader 4 + Blockade Runner 4 + Wingman 5 = **30**.
- **2 optional broad identity/fulfillment answers** outside the tree count, plus **1 neutral** = **33 proposed selectable lines** in the editorial library.
- Three unusual Expert Pilot talents (`Roll Out`, `Clip`, `Shunt Damage`) and the conditional `Hyperdriven` are disclosed above as additional micro-directions or conditional possibilities rather than quietly pretending every published mechanic received an exact one-to-one button.
- These 33 represent a **library**, NOT a proposal to crowd the UI with 33 buttons. All substantive options must remain discoverable through an eventual context-filtering or a transparent alternative-selection mechanism; no class tree may be silently excluded from discovery because it ranked below five results.
- **Provisional six-tree discovery slate** (one from each tree, plus neutral): `AP-Q1-EP01`, `AP-Q1-GN03`, `AP-Q1-SP02`, `AP-Q1-SL01`, `AP-Q1-BR02`, `AP-Q1-WM03`, and `AP-Q1-NEUTRAL`. This is an editorial example, **not an approved option count**. Owner's earlier five substantive + neutral format remains open; shrinking this to five would suppress at least one of six canonical tree domains unless there is a visible option to browse or refresh.
- Do not copy canonical book language verbatim into UI options. Keep in-character, first-person player statements, not "I take the XYZ talent" or a promise of entry-level feature grants.
- Source-to-answer associations are authorial pointers only. Exact per-answer canonical IDs, prerequisites, page citations, tree ownership, 190-tag mapping, and actor-state gating must be validated during future implementation. The 46 talent-name source inventory from section 10 remains intact and controlling.

### 11.10 Q1-only owner review gates

1. Voice: Mayu introduction A vs B, or revised by owner; don't assume past personal interaction.
2. Readability: Are lines distinctive and short enough to work as first-person player choices without reading like a rules explanation?
3. Character agency: Does the full bank permit escape, offense, protection, shipboard work, command, or fulfilled role without forcing criminal/military/heroic identity?
4. Count and navigation: Show five + neutral with a way to see omitted trees, six + neutral with one per tree, or another pattern; don't silently lock an architecture from this editorial draft.
5. Canonical caution: Do not claim that the player already has a squadron, particular vehicle, crew, rank, spacecraft, active combat experience, or talent; don't misattribute `Hyperdriven` scaling.

**Change log:** v0.8 is a documentation-only, **Q1-only**, comprehensive first-pass Ace Pilot player-answer bank and Mayu-introduction variant. It preserves the entirety of v0.7 (including initial Mentor issue ledger and historical drafts) and does not touch repo files, runtime data, or any other survey question.

---

## 12. Ace Pilot Q1 presentation policy proposal (v0.9, 2026-11-14)

**Status: PROPOSED, NOT OWNER-APPROVED OR IMPLEMENTED. Q1 ONLY.** This addendum responds to the owner's question: *How are we deciding which answer to present?* It preserves the 33-answer editorial library, does not finalize the option count, and does not extend to the other prestige-survey questions.

### 12.1 Recommended first-render shape: 6 substantive + 1 neutral

Ace Pilot currently has **six available class talent trees**. The proposed opening slate displays exactly **one first-person answer representing each tree**, plus one always-available neutral. This differs from the legacy tentative five-plus-neutral pattern **because six tree families cannot all appear in five substantive slots**. Never hide a legal tree silently due to low character-history relevance or absent preexisting specialization.

| Tree family (editorial category; not required as player-visible label) | Initial no-history exemplar | Draft ID |
|---|---|---|
| Expert Pilot | Pursuit and positioning | `AP-Q1-EP01` |
| Gunner | Targeting vehicle systems | `AP-Q1-GN03` |
| Spacer | Shipboard fighting and expertise | `AP-Q1-SP02` |
| Squadron Leader | Coordinated squadron strike | `AP-Q1-SL01` |
| Blockade Runner | High-speed escape/evasion | `AP-Q1-BR02` |
| Wingman | Protective flying | `AP-Q1-WM03` |
| Neutral | No declared emphasis | `AP-Q1-NEUTRAL` |

This slate is **an editorial default only**, not a claimed current game behavior or formally approved UX. In the player UI, first-person character statements are the selectable labels; IDs, talent-tree mappings, hidden scores, and book metadata are not character speech. A compact, non-selectable exploration control may optionally expose more lines without becoming an additional survey answer.

### 12.2 Adaptive answer *within* each guaranteed tree

For each tree independently, choose one representative statement out of its bank (Expert Pilot 7, Gunner 6, Spacer 4, Squadron Leader 4, Blockade Runner 4, Wingman 5). Personalization may change the chosen exemplar **only**; it may not remove that tree category.

Use, in descending quality of evidence:

1. **Player-declared relevant interest:** Previous fully submitted survey choices, explicitly affirmed career aspiration/long-term goal, or other durable player-authored preference. Preserve its original scope and recency; do not convert it into an earned mechanic.
2. **Finalized, verified build:** Owned feats, talents, trained skills, class levels, and any vehicle/equipment facts that are actually recorded. These indicate plausible complementarity, not the character's personal motives.
3. **Existing Suggestion Engine analysis:** Existing evidence-backed V2 interpretations of those mechanics, kept subordinate to explicit choices and without introducing an independent local scorer or newly invented bias keys.
4. **No reliable differentiator:** Use the stable, diverse default exemplar for that tree. Do not guess the character owns a starfighter, crew, vehicle, squadron, criminal career, or military rank.

Examples: strong documented pursuit interest may choose EP01; explicitly expressed racing/mobility interest may choose EP03; an actual shipboard role or declared boarding interest may choose SP02/SP04. These are **examples**, not hardcoded triggers. All other five tree families remain visible regardless. A class name or qualification for Ace Pilot alone is insufficient evidence for a specific flying style. Available-but-not-yet-owned talents remain legitimate *aspirational topics*, not automatic grants; prerequisite-specific lines should not misrepresent current access or impossibility.

### 12.3 Transparent exploration instead of randomized rotation

Provide a deliberate **Explore another approach** / **See more possibilities** interaction for a tree, so the player can inspect that tree's remaining relevant and mechanically accurate first-person answers. The exploration control itself is not an in-character answer and has no scoring effect. The control must not randomly erase an already selected statement or silently drop unseen content; returning to the question should preserve the last presented variants for a given in-progress draft. Prefer explicit cycling/list exploration with stable order over uncontrolled random re-rolls. Distinct special categories `AP-Q1-ID01` (cross-vehicle breadth) and `AP-Q1-ID02` (capstone fulfillment) must remain reachable rather than being permanently buried by six-tree selection; placement (optional other perspective vs expanded choices) remains open for owner review.

To avoid an unaffordable extra UI burden, a subsequent implementation can use one compact expansion affordance for the currently focused tree. The exact UI design is not approved. **No browsing, displaying, refreshing, hovering, or merely ranking an option may generate preference evidence**; only the explicitly finalized Q1 answer may do so. Neutral means zero scored intent. Variant content and selection must be deterministic for the same frozen input state, not dependent on repeated rerendering or the order of asynchronous loads.

### 12.4 Constraints, QA, and decision ledger

- Never filter out an entire tree because the actor does not currently own a talent in it; Q1 teaches future possibilities.
- Never describe a prospective choice as already granted, and honor feat/talent prerequisites when discussing actual availability.
- No duplicate same-angle options presented simultaneously by default. Category diversity is guaranteed, not artificially optimized into multiple dogfighting responses.
- Honor affirmed player goals over inferred build identity; do not repeat-scored earlier survey evidence as newly chosen Q1 intent.
- One tree per slot is *coverage*, not a promise that all potential Ace Pilot talents are equally relevant to every campaign or vehicle.
- The "capstone fulfilled" response is a character statement, **not** a silent replacement of existing future declared career goals; a Q1 statement of fulfillment alone must not trigger a destructive goal rewrite.
- At runtime, any model/meta references must resolve against canonical V2 class and talent identities, verified prerequisite and ownership authorities, and the frozen 190-tag ontology. No proposed text grants mechanics or creates ontology tags.
- Acceptance scenarios: first-time qualifying pilot with no prior survey; racing-focused character; vehicle-gunner; smuggler/courier but not assumed criminal; military squadron pilot; solo pilot with no squad; different vehicle types; player who wishes Ace Pilot to remain their capstone; character who sees and explores every tree then chooses neutral; back-navigation and resumed unfinished selection. In every case all six class domains remain discoverable and there is no inferred ownership or invented history.

**Open owner decision:** Adopt `six substantive (one per tree) + neutral` as the **Ace Pilot** default, with deliberate alternate browsing, versus retain `five substantive + neutral` and explicitly design a reliable way to expose the omitted sixth tree. The six-tree policy is recommended, **not approved yet**. Do not generalize Ace Pilot's count to every other prestige class; other classes may expose different numbers of legitimate tree domains.

**Change log (v0.9):** Proposed a diversity-preserving answer-selection algorithm, evidence precedence, stable default slate, explore-alternatives behavior, protective rules for capstone/neutral options, and acceptance scenarios. No repository modification, source rewrite, scoring-code design, or survey implementation.

---

## 13. Core Rulebook prestige Q1 / class 2 — Bounty Hunter (2026-11-14)

**Status:** Complete class-level Q1 first draft for owner review; no response text, count, personalization rule, source-to-ontology mapping, or progression mechanic is approved or implemented. **Scope:** Prestige Q1 only. The prior Ace Pilot draft, selection-policy deliberations, and implementation-debt ledger remain intact.

### 13.1 Authority and evidence check

| Evidence | Confirmed rule / characterization |
|---|---|
| Core Rulebook, Bounty Hunter pp. 208–209 | Requirements: heroic level 7, trained Survival, two Awareness talents. Talent at each odd class level from Awareness, Bounty Hunter, or Misfortune. Familiar Foe starts at Bounty Hunter 2 and scales at even levels; +4 Reflex and +2 Fortitude class defenses at entry. The class description explicitly includes capture alive. |
| Scum and Villainy, Bounty Hunter additions | Expands Bounty Hunter tree; introduces Gand Findsman specialty involving ritual and Force-sensitive hunting. Individual prerequisite, tradition, and Force Sensitivity limits must be honored. |
| Legacy Era Campaign Guide p. 40 | Explicitly expands Bounty Hunter access with Force Hunter tree, six printed talents. |
| Force Unleashed Campaign Guide; Galaxy of Intrigue; The Unknown Regions | Adds Bounty Hunter-tree talents including professional reputation, investigation, electronic traces, Familiar Foe adaptations, and quick restraint. |
| Knights of the Old Republic Campaign Guide; Clone Wars Campaign Guide | Additional Awareness and Misfortune talent choices already included in the shared tree permissions. |
| Current repository `packs/classes.db`, `packs/talent_trees.db` | Class record lists five tree IDs `awareness`, `bounty_hunter`, `misfortune`, `gand_findsman`, `force_hunter`. Registry has five Gand Findsman names including `Temporal Awareness`, but this name was not located in searched supplied text corpus; **do not certify it or design a talent-specific answer yet**. |
| `data/dialogue/mentors/kex_varon/kex_varon_dialogue.json` | Kex Varon: calm, methodical, unemotional, deliberate; hunts decided by preparation. Avoid pirate/assassin stereotypes, inflated enthusiasm, invented past bounties, or treating capture as necessarily lethal. |

### 13.2 Kex Varon — fixed Q1 Mentor opening (DRAFT)

> “You’ve met the requirements. That tells me you have the training. It doesn’t tell me how you intend to use it. A successful hunt is decided long before the first shot. So tell me—what part of the work do you intend to master?”

**Player question (DRAFT):** “As you take on the role of Bounty Hunter, what kind of expertise do you want to develop?”

Voice alternatives for owner comparison (neither approved):
- **More concise:** “Qualifications are one thing. A method is another. Good hunters know how they intend to finish the job. Which part of the work will you master?”
- **More capstone-oriented:** “You have earned the right to call this your profession. Whether it becomes the work of a lifetime is your decision. What kind of hunter will you be?”

### 13.3 Player-selectable Q1 response bank — ALL DRAFT

**All selectable answers below are first person.** IDs, headings, talent names, sourcing and internal mappings are editor-only. Selecting an interest must not imply a feat/talent is owned, automatically available now, morally required, or selected by the advancement framework. These are distinct potential orientations, not a literal on-screen 40-choice slate. UI selection/display count and adaptive policy remain undecided by owner request.

#### Awareness — 6 candidate responses

*Notice threats, track efficiently, react under pressure; Core Scout p. 49, plus KOTOR / Force Unleashed expansions.*

| Draft ID | First-person character response | Published rules connection (developer only) |
|---|---|---|
| `AW01` | “I want to notice the small details other hunters overlook before a trail goes cold.” | **Acute Senses** — Core Rulebook p. 49 |
| `AW02` | “I want to stay on a quarry’s trail without slowing to a crawl whenever the tracks get difficult.” | **Expert Tracker** — Core Rulebook p. 49; requires Acute Senses |
| `AW03` | “I want to react before an ambush turns the tables on me.” | **Improved Initiative / Reset Initiative** — Core Rulebook p. 49; Force Unleashed, Awareness expansion; later choice has prerequisites |
| `AW04` | “I want to keep my aim steady when a target uses smoke or poor visibility to hide.” | **Keen Shot** — Core Rulebook p. 49; concealment, not total concealment |
| `AW05` | “I want a surprise attack or a flanking maneuver to be less likely to leave me exposed.” | **Uncanny Dodge I / II** — Core Rulebook p. 49; sequential prerequisites |
| `AW06` | “I want to recognize when an enemy’s defenses can be bypassed and make that opening count.” | **Weak Point** — Knights of the Old Republic Campaign Guide; ignores damage reduction for one turn, not all defenses |

#### Bounty Hunter — 18 candidate responses

*Marking and apprehending targets, intelligence gathering, leverage, reputation, and long-term professional specialization.*

| Draft ID | First-person character response | Published rules connection (developer only) |
|---|---|---|
| `BH01` | “I want a carefully aimed shot to wear down a dangerous quarry, not merely inflict damage.” | **Hunter’s Mark** — Core Rulebook p. 208; ranged attack after aiming |
| `BH02` | “I want to identify the most important target in a fight and press that advantage until the encounter ends.” | **Hunter’s Target** — Core Rulebook p. 208; requires Hunter’s Mark |
| `BH03` | “I want to follow leads until I find someone who has gone to great lengths to disappear.” | **Nowhere to Hide** — Core Rulebook p. 208; Gather Information for locating a particular individual |
| `BH04` | “I want a reputation that makes a reluctant contact think twice before lying or challenging me.” | **Notorious** — Core Rulebook p. 208; reroll Persuasion to intimidate; not automatic compliance |
| `BH05` | “I want to negotiate what a difficult capture is worth instead of accepting whatever the client offers.” | **Ruthless Negotiator** — Core Rulebook p. 208; requires Notorious; haggling over a bounty |
| `BH06` | “I want to withstand a marked target’s attempts to slow me down long enough to finish the job.” | **Relentless** — Core Rulebook p. 208; Hunter’s Mark → Hunter’s Target → Relentless |
| `BH07` | “I want an enemy to hesitate because my reputation tells them exactly how dangerous I am.” | **Fearsome** — Force Unleashed Campaign Guide; requires Notorious; limited mechanical fear/reputation effect |
| `BH08` | “I want to make one piece of equipment so familiar that it becomes a reliable part of my work and my reputation.” | **Signature Item** — Force Unleashed Campaign Guide; selected item, not freely granted equipment |
| `BH09` | “I want to break a target’s nerve before a fight gets out of control.” | **Dread** — Scum and Villainy; targeted fear via Persuasion and prerequisites |
| `BH10` | “I want to make it dangerous for a quarry to simply turn and flee when I finally have them cornered.” | **Nowhere to Run** — Scum and Villainy; requires prerequisite chain; attack of opportunity on target movement |
| `BH11` | “I want to expose my quarry’s movements so the people fighting beside me can strike at the right moment.” | **Tag** — Scum and Villainy; requires Hunter’s Mark and Hunter’s Target; team-oriented tagged target |
| `BH12` | “I want to find missing people through surveillance, interviews, and careful research rather than depending on a lucky lead.” | **Detective** — Galaxy of Intrigue; reduces difficulty/time/cost of Gather Information to locate an individual |
| `BH13` | “I want to track the digital traces people leave behind as they spend credits, travel, and communicate.” | **Electronic Trail** — Galaxy of Intrigue; requires Nowhere to Hide and trained Use Computer; limited network information |
| `BH14` | “I want to uncover the secrets a target believes nobody else could possibly know.” | **Revealing Secrets** — Galaxy of Intrigue; requires Detective; Gather Information secrets |
| `BH15` | “I want to study more than one opponent closely enough to exploit their habits in the same encounter.” | **Familiar Enemies** — The Unknown Regions; requires Familiar Foe class feature |
| `BH16` | “I want to learn a quarry’s tactics well enough to better resist their counterattacks as well as threaten them.” | **Familiar Situation** — The Unknown Regions; requires Familiar Foe class feature |
| `BH17` | “I want to secure a resisting target quickly with proper restraints when they get within my reach.” | **Quick Cuffs** — The Unknown Regions; requires Quick Draw and a successful grab plus binder cuffs |
| `BH18` | “I want to prepare specifically for dangerous Force-sensitive targets without relying on their own powers.” | **Jedi Hunter** — Force Unleashed Campaign Guide; targets with Force Sensitivity; does not grant anti-Force immunity |

#### Misfortune — 6 candidate responses

*Ambush exploitation and opponent disruption; choices allowed by Bounty Hunter class despite this being a Scoundrel-origin tree.*

| Draft ID | First-person character response | Published rules connection (developer only) |
|---|---|---|
| `MF01` | “I want a clean ambush to do more damage than an opponent expects when their guard is down.” | **Sneak Attack** — Core Rulebook p. 46; flat-footed/denied Dexterity; ranged distance limit |
| `MF02` | “I want a well-timed strike against an exposed enemy to leave them struggling to keep fighting.” | **Dastardly Strike** — Core Rulebook p. 46; condition track when target denied Dexterity bonus |
| `MF03` | “I want to keep moving and turn my changing position into a better chance to land a hit.” | **Skirmisher** — Core Rulebook p. 46; requires moving at least 2 squares before attack |
| `MF04` | “I want to disrupt a group’s coordination so they can’t rely on the usual advantages they give each other.” | **Disruptive** — Core Rulebook p. 46; suppresses enemy morale and insight bonuses in line of sight |
| `MF05` | “I want to throw opponents off-balance and create openings without needing to outshoot everyone.” | **Walk the Line** — Core Rulebook p. 46; requires Disruptive; enemies within range and line of sight |
| `MF06` | “I want to interfere with the one skill a target is counting on to escape or turn the encounter around.” | **Stymie** — Clone Wars Campaign Guide; targets a single skill; mind-affecting and line-of-sight limits |

#### Gand Findsman — 4 candidate responses

*Ritual and omen-based Force-sensitive pursuit; specialized tradition, NOT universal hunter training.*

| Draft ID | First-person character response | Published rules connection (developer only) |
|---|---|---|
| `GF01` | “I want ritual preparation to sharpen my awareness and help me follow a trail that ordinary investigation cannot untangle.” | **Findsman Ceremonies** — Scum and Villainy; requires Force Sensitivity; spends Force Points and grants limited rerolls |
| `GF02` | “I want the warnings of my tradition to help me recognize trouble before the hunt turns against me.” | **Findsman’s Foresight** — Scum and Villainy; requires Findsman Ceremonies; Perception-focused foresight |
| `GF03` | “I want to read omens during a confrontation and use them to choose the right moment to attack or defend.” | **Omens** — Scum and Villainy; requires Findsman Ceremonies; conditional reaction to nearby ally circumstances |
| `GF04` | “I want visions to reveal a target’s intentions in time for me to respond rather than be caught unaware.” | **Target Visions** — Scum and Villainy; requires Findsman Ceremonies; subject to printed activation limits |

#### Force Hunter — 6 candidate responses

*Surviving dangerous Force-user targets, defeating concealment/deflection, and resisting mental and telekinetic threats.*

| Draft ID | First-person character response | Published rules connection (developer only) |
|---|---|---|
| `FH01` | “I want to be harder for Force-users to locate when I need to approach unseen.” | **Force Blank** — Legacy Era Campaign Guide p. 40; penalizes Sense Surroundings detection; not absolute immunity |
| `FH02` | “I want to turn a missed lightsaber strike into an opening to get out of reach.” | **Lightsaber Evasion** — Legacy Era Campaign Guide p. 40; movement after an enemy misses with melee lightsaber |
| `FH03` | “I want to place shots carefully enough that a Jedi has a harder time turning them aside.” | **Precision Fire** — Legacy Era Campaign Guide p. 40; aim increases difficulty of Deflect; not an automatic bypass |
| `FH04` | “I want to learn from a resisted mental attack so that same Force trick is harder to use on me again.” | **Steel Mind** — Legacy Era Campaign Guide p. 40; after resisting a mind-affecting Force power |
| `FH05` | “I want to strengthen my resolve against Force-users who try to manipulate my thoughts or decisions.” | **Strong-Willed** — Legacy Era Campaign Guide p. 40; class-level modifier to defense versus Use the Force checks |
| `FH06` | “I want to keep my footing when someone tries to throw me around with telekinesis.” | **Telekinetic Resistance** — Legacy Era Campaign Guide p. 40; reduces forced movement distance by half |

#### Cross-tree identity and neutral responses

| Draft ID | First-person character response | Semantics |
|---|---|---|
| `BH-Q1-ID01` | “I want to build a reputation for bringing targets in alive whenever the contract and circumstances allow it.” | Nonlethal career method; do not assert ownership of a specific nonlethal talent or equipment. |
| `BH-Q1-ID02` | “I have reached the profession I worked toward. I want to become exceptional at it, not chase another title.” | Prestige-as-capstone fulfillment; must not erase old declared goal without explicit confirmation. |
| `BH-Q1-NEUTRAL` | “I have not decided what kind of hunter I want to become. I want to understand the possibilities first.” | Zero directional score or negative preference; no forced specialization. |

### 13.4 Coverage and source limitations

| Domain | Count |
|---|---:|
| Awareness | 6 |
| Bounty Hunter | 18 |
| Misfortune | 6 |
| Gand Findsman | 4 |
| Force Hunter | 6 |
| **All talent-linked answers** | **40** |
| Career identity alternatives | 2 |
| Neutral | 1 |
| **All drafted Q1 selectable lines** | **43** |

**Important restrictions and editorial QA:**
- **Gand Findsman** is a specific cultural/Force-sensitive tradition, not a generic bounty-hunting skill. Confirm any species/tradition limits and individual prerequisites from the printed text before displaying GF lines to a specific actor. Never silently label a non-Gand character a Findsman. `Temporal Awareness` exists in the pack tree inventory but lacks direct source confirmation in the searched TXT material; hold out of the certified player bank.
- **Force Hunter** is an option to specialize against Force-users. It is not required by Bounty Hunter; a player cannot be labeled a Jedi killer simply for choosing the class. No anti-Force answer implies powers are unusable or automatically bypassed.
- **Awareness + Misfortune** are legal available trees for the prestige class despite originating under Scout and Scoundrel. All talent chains still require printed prerequisites; no new base-class level implied.
- **Bounty Hunter tree**: Hunter’s Target requires Hunter’s Mark; Relentless requires both. Dread, Nowhere to Run, and Tag require preceding talents. Electronic Trail requires trained Use Computer and Nowhere to Hide; Familiar Enemies/Situation require the Familiar Foe class feature; Quick Cuffs requires Quick Draw and proper restraints.
- **Retrospective grounding**: qualify by actual current character build, but never invent earlier captured bounties, employment, legal authorization, guild status, target kills, favored weapons, Force sensitivity, or personal mentor relationship. Q1 focuses on potential professional direction.
- **Printed class features** are not disguised as talent-tree specialization. Familiar Foe is a future Bounty Hunter class feature at second class level, not automatically granted at entry.
- **Presentation architecture intentionally open**: Unlike Ace Pilot, do not automatically lock one answer per tree. The tradition-specific Gand Findsman/Force Hunter choices must not crowd out ordinary lawful-capture, investigation, stealth, and target-control paths. No new decision about number displayed or alternate-answer UX has been made.
- **Mechanical provenance scope**: Source sections and talent names have been checked using attached books TXT and printed PDF images for Core/Scum/Legacy. This is an editorial draft, **not** a full talent-by-talent Phase 3 canonical mechanical certification; any questionable conditional phrasing should be compared to exact printed pages before production.

### 13.5 Unresolved review decisions (Q1 only)

1. Compare the three Kex introduction variants for precision and character voice.
2. Determine whether to retain the complete 40-item talent-linked library or consolidate closely related angles (e.g., Fearsome/Dread, Detective/Nowhere to Hide, Initiative/Reset Initiative). Distinct rules do not necessarily imply distinct player interests.
3. Decide whether culturally specific Gand Findsman answers belong in a general Bounty Hunter introductory slate or only a conditional specialist expansion after eligibility and player interest checks.
4. Decide how to represent **live capture** strongly without confusing narrative intent with a free nonlethal mechanic.
5. Defer all Q1 answer selection/display mechanics to the already parked policy debate. No decisions about Q2 or later questions in this chat.
6. When the owner approves final wording, perform exact source/page verification and frozen ontology mapping; current answer IDs remain provisional.

**Change log (local v0.10):** Read Core Bounty Hunter and shared trees; reviewed Scum/Legacy/Force Unleashed/Galaxy of Intrigue/Unknown Regions and additional Awareness/Misfortune sources; inspected Kex Varon JSON and live V2 class/tree registry. Added full proposed Bounty Hunter Q1 answer bank, source/prerequisite cautions, neutral/capstone lines, and Kex opening variants. No repository edits, commits, or pushes.

---

## 14. Core Rulebook class 03 — Crime Lord Q1 (Tío the Hutt) — full first-pass editorial bank (2026-11-14)

**Status:** DRAFT FOR OWNER REVIEW. Only Q1. No owner-approved dialogue, tag bindings, UI presentation policy, runtime changes, Git commit, or push. Preserve Ace Pilot and Bounty Hunter work. Source authority is the printed SWSE books; repo tree membership is additional implementation evidence, not sufficient for printing claims.

### 14.1 Rules and coverage audit

**Mentor:** Tío the Hutt (`data/dialogue/mentors/tio_the_hutt/tio_the_hutt_dialogue.json`; key in `data/dialogue/mentor_registry.json`: `tio_the_hutt`; class-indexed personality key: `Tio`). Tío is affable, amused, indulgent, strategic, interested in control, profit, leverage, loyalty and keeping the upper hand. **Voice:** relaxed mob-boss confidence, with dry warmth and transaction-based framing. Avoid shouting, generic Sith cruelty, and assuming every player has already built a gang, killed rivals, extorted someone, or worked for Tío. Some of Tío's level greetings contain precisely those unverified histories; do not reuse as Q1 facts.

**Core Rulebook, printed pp. 209–210:** Requires 7th heroic level, trained Deception and Persuasion, and one talent from Fortune, Lineage, or Misfortune. Each Crime Lord level gains a talent, selected from **Infamy, Influence, or Mastermind**, subject to prerequisites; this is not an odd-level-only talent progression. +2 Reflex and +4 Will class defense bonuses are acquired at Crime Lord level 1 (subject to ordinary class bonus rules); **Command Cover** begins at Crime Lord level 2 and scales with level and adjacent allies; do not portray it as already owned at entry. Core explicitly describes both ruthless criminal empires and organizations used to resist tyrants, so Q1 cannot impose a single moral alignment.

**Verified live repo:** `packs/classes.db` class Crime Lord has `talentTreeIds = [infamy, influence, mastermind]`, first through tenth class level talent entries, and level 2 `crimeLord.commandCover` with adjacent allies. `packs/talent_trees.db` contains **11 Infamy + 6 Influence + 16 Mastermind = 33 named talent records** associated with those trees. Not all are independent sub-identities; prerequisite chains are grouped appropriately below. `data/prestige-class-prerequisites.json` agrees with the printed entry requirements at the identity level. All published sources/eligibility must still be compared against final v2 talent identity records at implementation.

**Source mapping and expansions:**

| Tree | Pack talent records | Printed origin and expansions | Principal Q1 themes |
|---|---:|---|---|
| Infamy | 11 | Core Rulebook p. 210; Scum and Villainy printed pp. 26–27; The Unknown Regions, Crime Lord Talents | Personal fear/reputation, spreading influence through minions, manipulation, favors |
| Influence | 6 | Core Rulebook p. 43; Knights of the Old Republic Campaign Guide, New Influence Talents | Faster intimidation, surrender, panic, action disruption, defensive persuasion |
| Mastermind | 16 | Core Rulebook p. 210; Scum and Villainy p. 27; Galaxy of Intrigue, New Mastermind Talents; The Unknown Regions, New Mastermind Talent | Minions, bodyguards, directing allies, coordinated movement, backup plans |

**Important distinction:** Fortune, Lineage and Misfortune are *entry-prerequisite sources*, not extra Crime Lord talent trees. Noble Leadership/Inspiration and other adjacent tree names are not thereby selectable as Crime Lord talents. If a multiclass character separately qualifies for them via another class, that is distinct mechanical authority, not a Crime Lord Q1 category.

### 14.2 Kex/Mayu-era Q1 editorial convention for Tío

**Preferred Tío fixed introduction — PROPOSED:**

> “Ahh, now we're getting somewhere. You've earned a seat at the table, my friend. But power comes in different currencies—fear, favors, loyal people, a well-timed word. So tell Tío: which one do you intend to make yours?”

**Alternative A — warmer, more amused:**

> “Heh. Look who's ready to stop taking orders and start making the deals. A title doesn't make an empire, kid. Knowing how to use people, promises, and opportunities? That's worth something. Which part appeals to you?”

**Alternative B — sparer, slower authority:**

> “You've earned the opportunity. Good. Some bosses rule by reputation, some by persuasion, and some by having the right people in the right places. There's profit in all three. Which interests you?”

**Shared Q1 player-facing question — PROPOSED:** “Now that you've reached the Crime Lord's threshold, what kind of influence do you want to cultivate?”

Do not claim the character currently commands an empire or is a subject of Tío; all answers refer to desired *future* development within a milestone already earned.

### 14.3 Complete candidate answer library

**All player-selectable text is first person.** Developer-only mappings are not displayed as player response labels. Question should *lightly teach* distinctive class capabilities; it does not award talents or declare them already owned. `CL-` IDs are provisional editorial identifiers, not authoritative registry IDs.

#### Infamy — 9 player answers covering 11 named talents

| Draft ID | First-person player response | Published rules connection (developer only) |
|---|---|---|
| `CL-IF01` | “I want my reputation to unsettle opponents before they even decide whether to cross me.” | **Inspire Fear I–III**, Core p. 210; sequential fear penalties, conditional on opponent level and mind-affecting rules. |
| `CL-IF02` | “I want a name that carries enough weight to make threats convincing without a fight.” | **Notorious**, Core p. 210; reroll Persuasion to intimidate when not disguised. |
| `CL-IF03` | “I want my people to command respect by invoking my name, even when I'm nowhere nearby.” | **Shared Notoriety**, Core p. 210; minions can reroll intimidate checks but must keep the second result; prerequisite Notorious. |
| `CL-IF04` | “I want my enforcers to make enemies back away just by closing in.” | **Frighten**, Scum and Villainy pp. 26–27; selected minion can cause adjacent enemies to move away, mind-affecting; requires Attract Minion and Inspire Fear I. |
| `CL-IF05` | “I want my people to push through fear and injury because disappointing me seems worse.” | **Fear Me!**, Scum and Villainy p. 26; once/encounter reaction for a minion moved down the condition track; prerequisites Attract Minion, Inspire Fear I–II. Do not imply healing all damage or automatic recovery. |
| `CL-IF06` | “I want to break an opponent's nerve and make them retreat rather than keep pressing the attack.” | **Terrify**, Scum and Villainy p. 27; Persuasion against foes already affected by Inspire Fear; causes specified movement away. Prerequisites Frighten, Inspire Fear I–II. |
| `CL-IF07` | “I want the people who get close enough to threaten me to learn that my reputation makes the fight harder.” | **Unsavory Reputation**, Scum and Villainy p. 27; reduced-HP enemies in range suffer a limited attack penalty, conditional and mind-affecting; multiple prerequisites. |
| `CL-IF08` | “I want to turn one successful conversation into another concession before the other person realizes what I've gained.” | **Master Manipulator**, The Unknown Regions, Crime Lord Talents; second Persuasion check against same target after successful first check, with requirements. Distinct from a guaranteed second success. |
| `CL-IF09` | “I want favors owed to me to turn into useful information when I need it most.” | **Small Favor**, The Unknown Regions, Crime Lord Talents; DC-limited once/day informant support to a Gather Information or Knowledge check; requires Notorious, trained Persuasion. |

#### Influence — 6 player answers covering 6 talents

| Draft ID | First-person player response | Published rules connection (developer only) |
|---|---|---|
| `CL-IN01` | “I want to make my authority understood in a few words, without wasting time on an extended threat.” | **Presence**, Core p. 43; faster Persuasion intimidation use. |
| `CL-IN02` | “I want to recognize when an enemy is beaten and persuade them to surrender before anyone else gets hurt.” | **Demand Surrender**, Core p. 43; once/encounter Persuasion against qualifying injured foe; requires Presence; not universal mind control. |
| `CL-IN03` | “I want a decisive blow to convince an opponent that fleeing is wiser than fighting me.” | **Weaken Resolve**, Core p. 43; damage-threshold and Will-based fear trigger, with target-level and Force Point exceptions. |
| `CL-IN04` | “I want the fear I inspire to last even after a frightened enemy takes another hit.” | **Improved Weaken Resolve**, Core p. 43; expands Weaken Resolve's fleeing behavior after damage; requires Presence and Weaken Resolve. |
| `CL-IN05` | “I want to get so thoroughly under someone's skin that they lose the chance to carry out their plan.” | **Fluster**, KOTOR Campaign Guide, New Influence Talents; intimidate check limits next-turn actions, once/encounter; requires Presence and trained Persuasion. |
| `CL-IN06` | “I want an attacker to hesitate when they see whom they've chosen to threaten.” | **Intimidating Defense**, KOTOR Campaign Guide, New Influence Talents; once/encounter reaction Persuasion attempt can penalize attack; requires Presence and trained Persuasion. |

*Editorial overlap to examine later: `CL-IF06` fear-driven movement and `CL-IN03` fear-driven flight share a fantasy, but have different triggers and paths. `CL-IF02` and `CL-IN01` both concern intimidating others but one relies on reputation and the other on speed. Preserve until player-reading review.*

#### Mastermind — 16 player answers covering 16 talents

| Draft ID | First-person player response | Published rules connection (developer only) |
|---|---|---|
| `CL-MM01` | “I want to recruit capable people who can carry out work that I don't need to handle personally.” | **Attract Minion**, Core p. 210; attracts nonheroic minions with limits on active companions and XP shares; not unlimited free troops. |
| `CL-MM02` | “I want to direct an ally's movement at the exact moment position matters most.” | **Impel Ally I**, Core p. 210; grants an ally movement through swift-action expenditure. |
| `CL-MM03` | “I want to give an ally the opening to act when they would otherwise have to wait.” | **Impel Ally II**, Core p. 210; grants an ally additional standard/move action through swift-action expenditure; prerequisite Impel Ally I. |
| `CL-MM04` | “I want to coordinate a decisive move and action from an ally without waiting for the battle to come to us.” | **Impel Ally III**, Scum and Villainy p. 27; once/encounter, complicated two-turn swift-action cost granting an ally standard and move actions; requires Impel Ally I–II. |
| `CL-MM05` | “I want trusted guards beside me who can intercept danger before it reaches me.” | **Bodyguard I**, Scum and Villainy p. 27; adjacent acquired minion can take a redirected attack as reaction; requires Attract Minion. |
| `CL-MM06` | “I want the people guarding me to be prepared to withstand the attacks they intercept.” | **Bodyguard II**, Scum and Villainy p. 27; adjusts minion Reflex Defense when redirected; requires Attract Minion, Bodyguard I. |
| `CL-MM07` | “I want an attacker to regret trying to get past my guards when they have a chance to strike back.” | **Bodyguard III**, Scum and Villainy p. 27; minion counterattack following redirected attack, with conditional bonus; requires Bodyguard I–II. |
| `CL-MM08` | “I want everyone working with me to concentrate on the same enemy when I choose the moment to strike.” | **Inspire Wrath**, Scum and Villainy p. 27; directs allied morale bonuses against one designated target in line of sight. |
| `CL-MM09` | “I want to keep a reliable guard close enough that they can help shield me during a firefight.” | **Shelter**, Scum and Villainy p. 27; +2 cover bonus while adjacent to a minion, requires Attract Minion. Distinct from the class's later Command Cover feature. |
| `CL-MM10` | “I want to move my allies into better positions before our enemies can take advantage of where they stand.” | **Tactical Superiority**, Scum and Villainy p. 27; allows two allies immediate repositioning after expenditure of swift actions, without provoking attacks of opportunity. |
| `CL-MM11` | “I want to get my people out of a losing position in an organized withdrawal instead of leaving them trapped.” | **Tactical Withdrawal**, Scum and Villainy p. 27; limited sight/range activation grants allies ability to withdraw using a swift action at start of next turn. |
| `CL-MM12` | “I want my allies to move faster when a plan depends on reaching the objective before anyone else.” | **Urgency**, Scum and Villainy p. 27; once/encounter spend three swift actions on consecutive turns; modest speed bonus to allies in line of sight; requires Impel Ally I–II. |
| `CL-MM13` | “I want an organization strong enough to keep operating even after losing one of its trusted people.” | **Wealth of Allies**, Scum and Villainy p. 27; replacement minion arrives later, not instant resurrection; requires Attract Minion. |
| `CL-MM14` | “I want to recruit exceptional specialists rather than depend on untrained muscle.” | **Attract Superior Minion**, Galaxy of Intrigue, New Mastermind Talents; improved minion tied to character level; requires Attract Minion, Impel Ally I–II. |
| `CL-MM15` | “I want an escape route or a second move ready for the instant my first plan fails.” | **Contingency Plan**, Galaxy of Intrigue, New Mastermind Talents; once/encounter reaction movement on specified failed roll/check/talent test; does not undo failure. |
| `CL-MM16` | “I want my instructions to give an ally a second chance to make a decisive action succeed.” | **Master's Orders**, The Unknown Regions, New Mastermind Talent; reroll on attack/check during action **granted by this character**; requires Impel Ally I–II. |

#### Cross-tree identity / capstone and neutral — 3 answers

| Draft ID | First-person player response | Semantics and guardrails |
|---|---|---|
| `CL-ID01` | “I want to use the influence of the underworld to protect people or undermine powers that can't be challenged openly.” | Explicitly valid alternate moral-purpose reading from Core p. 209; no automatic benevolence inferred from class. Does not grant unrelated talents. |
| `CL-ID02` | “I have earned the kind of influence I set out to pursue. I could spend my whole career learning to wield it well.” | Prestige-as-capstone fulfillment; should not force another prestige class, presume an established empire, or silently replace a prior long-term goal. |
| `CL-NEUTRAL` | “I haven't decided how I want to exercise this influence yet. I want to see what the role makes possible.” | Neutral; no positive/negative specialization, personality, alignment, destiny, minion, or ambition evidence. |

### 14.4 Coverage checkpoint and QA requirements

| Category | Draft answers | Named tree talents covered |
|---|---:|---:|
| Infamy | 9 | 11 (Inspire Fear I–III grouped) |
| Influence | 6 | 6 |
| Mastermind | 16 | 16 |
| **Talent-linked** | **31** | **33** |
| Alternative identity / capstone | 2 | n/a |
| Neutral | 1 | n/a |
| **All provisional answers** | **34** | **3 talent trees** |

**Editorial QA and implementation debt carried forward:**

1. **Source before aliases:** All 33 named talents were reconciled to attached printed content in Core p. 210, shared Influence p. 43, Scum and Villainy pp. 26–27, KOTOR Influence expansions, Galaxy of Intrigue Mastermind expansions, and Unknown Regions Infamy/Mastermind expansions. This is *editorial source verification* rather than a complete level-by-level, prerequisite-certified production dataset or frozen-ontology mapping. Exact printed pages for books beyond Core/Scum remain to be certified in production audit.
2. **Correct progression:** Crime Lord grants a talent every class level. Do not reuse Ace Pilot or Bounty Hunter's odd-level-only assumption. At first class level, do not imply an NPC minion, reputation perk, or Command Cover exists unless actually acquired through selected mechanics.
3. **Prerequisite tree vs selectable tree:** Fortune, Lineage, Misfortune qualify entry; the actual Crime Lord talent selection authority is Infamy, Influence, Mastermind. Separate base-class talents remain available only through their own class.
4. **Mind-affecting mechanics:** Core Infamy/Influence effects have level, distance, line-of-sight, attitude, mind-affecting, Force Point, and other limits. In-character ambitions do not promise universal fear control, instantaneous submission or free actions for all allies.
5. **Minion economy:** Attract Minion and improved minion variants have explicit NPC construction, active-count, travel, replacement, and experience point costs. Q1 language is prospectively aspirational; choice alone does not spawn followers, provide credits, or establish criminal territory.
6. **Command Cover vs Shelter:** One is a Crime Lord class feature beginning at second level (adjacent allies), one is a Mastermind talent requiring Attract Minion and adjacency to a minion. Keep effects distinct.
7. **Alignment and campaign choice:** A Crime Lord can command an underworld group for selfish gain, care for their people, or oppose tyranny; don't enforce cruelty, a criminal organization's size, existing business ownership, or a known victim. The Core book permits unconventional morally positive uses of criminal networks.
8. **Mentor voice:** Tío is amused, sociable, transactional, and patient even when intimidating; no Sith mysticism, Soldier drill language, or unconditional statements about player-run empires, murder, raids or gang wars. Mention that the prior generic level-greeting strings assume history and must not be interpolated unconditionally.
9. **Talent-to-intent collisions:** IF01/IF06/IN03/IN04 overlap fearful opposition; IF02/IN01 overlap intimidation; MM02/03/04/16 overlap granting actions; MM05/06/07/09 overlap bodyguards. Preserve provisional variants for now, consolidate only after owner review. Treat grouped talent ranks as one narrative direction when appropriate.
10. **Selection/display policy is still DEFERRED:** Do not set five-per-class, one-per-tree, fixed seven, carousel rotation, random sampling, archetype weights, or visibility rules. This conversation only authors Q1 response libraries, Mentor intros, and canonical evidence. No runtime or GitHub actions.

**Change log (local v0.11):** Fully audited Crime Lord class, Tío Mentor identity/voice, three canonical talent trees (33 repo talent names), primary Core class rules and supplemental tree expansions. Authored 31 substantive first-person answers + two alternate identity statements + neutral, with provisional talent provenance, duplicated-concept warnings, prerequisite cautions, and deferred presentation policy. Previous sections untouched. No repository modification, commit, push or PR.

---

## 15. Core Rulebook class 04 - Elite Trooper Q1 (Breach) - full first-pass editorial library (2026-11-14)

**Status:** DRAFT, owner review pending; Q1 only. This section supersedes no approved content. All selection policies remain parked. No GitHub edits, commits, pushes, or runtime code updates.

### 15.1 Primary-source and repository audit

- **Printed Core Rulebook pp. 211-212 (PDF pages 212-213):** Elite Trooper represents advanced adaptable personal combat training, including assault, protection, covert insertion, and hand-to-hand fighting. Its original selectable talent trees are **Camouflage, Commando, Weapon Master**. Prestige class level 1 confers **Delay Damage** (once per encounter as a reaction, delays a single attack/ability/effect until end of next turn) and class defense bonuses; level 2 begins **Damage Reduction 1**, increasing each subsequent even level to DR 5 at level 10; talents at class levels 1, 3, 5, 7, 9. Delay Damage delays an effect, not cancels it.
- **KOTOR Campaign Guide:** explicit **Mandalorian Warrior** tree expansion; culturally focused, not a universal declaration that a player is Mandalorian. Source explicitly says new soldier trees are *not* automatically accessible merely because Elite Trooper shares the Commando tree.
- **The Force Unleashed Campaign Guide:** explicit **Critical Master** expansion; examples include extending critical range, combat effects on crits, and additional attacks after crits. More critical talents appear in **The Unknown Regions**.
- **Clone Wars Campaign Guide:** explicit **Melee Specialist** and **Republic Commando** tree additions; Republic Commando title/fiction should not turn every Elite Trooper into a Republic military member.
- **Legacy Era Campaign Guide:** explicit **Protection** tree expansion for Elite Trooper, distinct from some overlapping soldier Commando capabilities.
- **Galaxy at War:** explicit **Squad Leader** tree expansion for Elite Trooper; applies to a *defined on-foot squad*, and its talents have Charisma 13 prerequisites. Confirm against actual actor state before promising usability.
- **Threats of the Galaxy, printed pp. 53-54:** contains a Master of Teras Kasi example NPC built with Soldier 7/Elite Trooper 7 and the named related talents. **Galaxy at War** references the Master of Teras Kasi tree in the *Martial Arts Master* class list; the source material reviewed did NOT independently locate an unambiguous publication rule explicitly adding this tree to *Elite Trooper's* selectable list. **Source access for Elite Trooper is not certified.** Draft answers under this tree are quarantined until provenance/eligibility is resolved; do not count them as production-legal selections by assumption.
- **Current repository:** `packs/classes.db` lists 10 trees: Camouflage, Commando, Weapon Master, Master of Teras Kasi, Mandalorian Warrior, Critical Master, Melee Specialist, Republic Commando, Protection, Squad Leader. Their `packs/talent_trees.db` named-talent inventories total **77 entries** (10 + 14 + 12 + 5 + 4 + 8 + 5 + 6 + 8 + 5), not certified distinct/fully rules-verified playable selections. `scripts/mentor/mentor-survey/prestige-survey-profiles.js` lists **only nine** (omits `squad_leader`); this is a confirmed repository data discrepancy, not proof of a runtime bug. `data/prestige-class-prerequisites.json` includes alternate routes (e.g., Flurry, Mercenary) not stated in the reviewed printed Core prerequisite paragraph; check supplemental/errata evidence, do not silently assert those options are Core rules.
- **Character Mentor evidence:** `data/dialogue/mentors/breach/breach_dialogues.json`, `data/dialogue/mentor-suggestions/mentor-personalities.json`. Breach is a direct, approachable Mandalorian field professional. He uses occasional dry joking, acknowledges accomplishments without inventing campaigns or conversations with Lead, and sounds unlike a hostile drill sergeant. Some existing level greeting lines make those unsupported claims; do not reuse in Q1 without actual evidence.

**Developer-only source lookup table:**

| Tree | Repo-named talents | Origin and expansion evidence | Editorial certification |
|---|---:|---|---|
| Camouflage | 10 | Core scout tree pp. 49-50; later published expansions | Eligible tree verified; individual talent source/prereqs remain to certify |
| Commando | 14 | Core soldier tree pp. 52-53; later published expansions | Eligible tree verified; individual talent source/prereqs remain to certify |
| Weapon Master | 12 | Core Elite Trooper pp. 211-212; Galaxy at War and other additions | Eligible tree verified; individual talent source/prereqs remain to certify |
| Master of Teras Kasi | 5 | Threats of the Galaxy example; Galaxy at War martial arts master reference | **ELIGIBILITY NOT CERTIFIED FOR ELITE TROOPER** |
| Mandalorian Warrior | 4 | KOTOR Campaign Guide Elite Trooper additions | Eligible tree verified; actor prerequisites/cultural claims remain separate |
| Critical Master | 8 | The Force Unleashed Campaign Guide; Unknown Regions additions | Eligible tree verified; individual talent source/prereqs remain to certify |
| Melee Specialist | 5 | Clone Wars Campaign Guide | Eligible tree verified; individual talent source/prereqs remain to certify |
| Republic Commando | 6 | Clone Wars Campaign Guide | Eligible tree verified; title does not confer military membership |
| Protection | 8 | Legacy Era Campaign Guide | Eligible tree verified; individual talent source/prereqs remain to certify |
| Squad Leader | 5 | Galaxy at War | Eligible tree verified; profile missing it; on-foot squad/Charisma gating |
| **Repo inventory** | **77** | Mixed sources | Do not mistake repository count for print certification |

**Character-state boundary:** Eligible to enter a class is distinct from already possessing a talent. All substantive replies describe an interest in **future development**, with no free talent, squad, bodyguard, armor, military allegiance, weapon proficiency, or culturally specific history assumed. The response libraries are not a mandate to show all alternatives simultaneously.

### 15.2 Breach's Q1 opening and question - editorial drafts

**Preferred introduction (DRAFT):**

> "Well, you made it this far. Good. Elite training gives you a few ways to get the job done: hit harder, stay standing, work smarter, or keep somebody else alive. Which one's worth your time?"

**Alternative A (warmer, understated teasing):**

> "All right. You've earned a shot at the tough stuff. I'd say I'm impressed, but you'll get a big head. Now, what do you actually want to get better at?"

**Alternative B (professional and concise):**

> "You've reached the standard for elite training. That matters. The real question is what kind of fighter you choose to become. What's your priority?"

**Player-facing Q1 text (DRAFT):** "As an Elite Trooper, what kind of combat expertise do you want to make your own?"

Do not characterize a player as a green recruit. Do not assert prior combat missions, team leadership, or a conversation between Breach and Lead from class eligibility alone. For an advancement still pending, prefer "qualified for elite training" rather than "you already earned this class level."

### 15.3 Player answers - 59 talent-focused candidates + 3 cross-tree identity and neutral responses

All quotations below are **first-person in-character selectable replies**. Labels and talent mappings are developer/editorial only. All IDs provisional; none are registered canonical answer IDs or mapped to the 190-tag ontology. Names show thematic connections, not a guarantee an individual talent is immediately attainable.

#### Camouflage - 7 answers

| Draft ID | First-person player response | Candidate mechanical anchor (developer only) |
|---|---|---|
| `ET-CM01` | "I want to move through a dangerous position without giving away where I'm going." | Hidden Movement; Improved Stealth |
| `ET-CM02` | "I want to strike from concealment and give enemies as little chance as possible to strike back." | Shadow Striker; Ghost Assailant |
| `ET-CM03` | "I want to prepare a fighting position that lets me survive when the enemy starts pouring fire into it." | Hunker Down; Dig In |
| `ET-CM04` | "I want to slip out of sight even when the enemy thinks they've already found me." | Hide in Plain Sight |
| `ET-CM05` | "I want my movements to be so difficult to follow that enemies can't get a clear look at me." | Total Concealment; Improved Stealth |
| `ET-CM06` | "I want to make the first moments of an ambush count before the opposition knows how to respond." | Extended Ambush |
| `ET-CM07` | "I want to get past a defended position without turning every sentry I meet into a firefight." | Slip By; Hidden Movement |

#### Commando - 8 answers

| Draft ID | First-person player response | Candidate mechanical anchor |
|---|---|---|
| `ET-CO01` | "I want to size up a fight quickly and tell where my side has the advantage." | Battle Analysis |
| `ET-CO02` | "I want my fire to keep enemies pinned down so the people beside me can move." | Cover Fire; Keep Them at Bay |
| `ET-CO03` | "I want to place explosives where they change a battle, not just make a bigger noise." | Demolitionist |
| `ET-CO04` | "I want to keep fighting when injuries and exhaustion would take someone else out." | Tough as Nails; Indomitable |
| `ET-CO05` | "I want to make myself a hard target and hold a position even when the fire gets heavy." | Hard Target; Defensive Position |
| `ET-CO06` | "I want to draw an enemy's attention onto me instead of letting them cut down my allies." | Draw Fire; Harm's Way |
| `ET-CO07` | "I want my unit to work together well enough that one soldier's actions improve everyone else's chances." | Coordinated Effort |
| `ET-CO08` | "I want to get my people into safety before a bad position turns into casualties." | Dedicated Protector; Dedicated Guardian; Out of Harm's Way |

#### Weapon Master - 9 answers

| Draft ID | First-person player response | Candidate mechanical anchor |
|---|---|---|
| `ET-WM01` | "I want the weapon I rely on most to feel precise in my hands, even when the fight gets chaotic." | Greater Weapon Focus |
| `ET-WM02` | "I want my chosen weapon to hit harder because I know exactly how to use it." | Greater Weapon Specialization |
| `ET-WM03` | "I want to get shots through protection that would stop an ordinary attack." | Greater Penetrating Attack |
| `ET-WM04` | "I want to hit hard enough to stagger a dangerous foe instead of merely chipping away at them." | Greater Devastating Attack |
| `ET-WM05` | "I want to control automatic fire without wasting half my advantage fighting the weapon's recoil." | Controlled Burst |
| `ET-WM06` | "I want unfamiliar or exotic weapons to be options I can actually use, not liabilities." | Exotic Weapon Mastery |
| `ET-WM07` | "I want to make several attacks with a rifle or heavy weapon without losing my accuracy." | Multiattack Proficiency variants |
| `ET-WM08` | "I want a burst of fire to sweep across a close formation when the opportunity is right." | Ferocious Assault |
| `ET-WM09` | "I want to punish an enemy who comes too close and still have tricks ready when I need to throw a weapon." | Extended Threat; Two-For-One Throw (editorial grouping needs overlap review) |

#### Master of Teras Kasi - 4 provisional answers, ELITE TROOPER SOURCE ACCESS UNCERTIFIED

| Draft ID | First-person player response | Candidate mechanical anchor |
|---|---|---|
| `ET-TK01` | "I want to turn my unarmed training into a disciplined fighting style I can depend on without a weapon." | Teras Kasi Basics; Teras Kasi Mastery |
| `ET-TK02` | "I want to answer an opponent's missed strike with a precise counterattack of my own." | Unarmed Counterstrike |
| `ET-TK03` | "I want to defend myself against armed attacks with timing and movement instead of a shield." | Unarmed Parry |
| `ET-TK04` | "I want my unarmed strikes to matter even against enemies protected by damage reduction." | Ignore Damage Reduction |

**Quarantine:** Until a book/page source explicitly grants the Teras Kasi tree as an Elite Trooper selectable talent tree, these four responses are **not production-eligible by this audit**. They document the repo's existing candidate theme only. A Martial Arts Master reference is not an Elite Trooper class grant.

#### Mandalorian Warrior - 4 answers

| Draft ID | First-person player response | Candidate mechanical anchor |
|---|---|---|
| `ET-MW01` | "I want my armor to help me absorb the punishment that would put another fighter down." | Armored Mandalorian |
| `ET-MW02` | "I want to seize the first chance to move before an enemy can dictate the fight." | Mandalorian Advance |
| `ET-MW03` | "I want a rapid series of attacks to hit with the ferocity the situation demands." | Mandalorian Ferocity |
| `ET-MW04` | "I want bringing down one opponent to give me the momentum to face the next." | Mandalorian Glory |

**Culture guardrail:** Breach may speak from Mandalorian experience; a character choosing one of these mechanics is not thereby automatically Mandalorian. Exact talent prerequisites apply.

#### Critical Master - 6 answers

| Draft ID | First-person player response | Candidate mechanical anchor |
|---|---|---|
| `ET-CR01` | "I want to recognize the opening for a critical strike even when it lasts only an instant." | Extended Critical Range variants |
| `ET-CR02` | "I want a decisive hit to leave an opponent easier to strike the next time." | Reduce Defense |
| `ET-CR03` | "I want a well-placed critical hit to keep a dangerous enemy from escaping or charging us." | Reduce Mobility; Deny Move |
| `ET-CR04` | "I want a powerful strike to force an enemy out of position." | Knockback |
| `ET-CR05` | "I want to exploit a critical opening immediately instead of giving my opponent time to recover." | Flurry Attack |
| `ET-CR06` | "I want to make critical strikes more likely with the weapons I already know how to use." | Extended Critical Range (simple weapons, rifles, heavy weapons); weapon selection and prerequisites apply |

#### Melee Specialist - 5 answers

| Draft ID | First-person player response | Candidate mechanical anchor |
|---|---|---|
| `ET-ME01` | "I want my melee strikes to hit especially hard when I find a clean opening." | Accurate Blow |
| `ET-ME02` | "I want to stay dangerous even when an enemy gets right up beside me." | Close-Quarters Fighter |
| `ET-ME03` | "I want my melee weapon to find the weak point in armor that other attacks can't get through." | Ignore Armor |
| `ET-ME04` | "I want a solid blow to leave an enemy struggling to act before they can strike back." | Improved Stunning Strike |
| `ET-ME05` | "I want enemies crowding around me to regret getting within reach of my weapon." | Whirling Death |

#### Republic Commando - 5 answers

| Draft ID | First-person player response | Candidate mechanical anchor |
|---|---|---|
| `ET-RC01` | "I want an ambush to hit decisively before an enemy has a chance to respond." | Ambush |
| `ET-RC02` | "I want to make the explosives I carry count when a difficult target needs to come down." | Higher Yield; trained Demolitions prerequisite |
| `ET-RC03` | "I want to change a weapon's energy cell quickly enough that reloading doesn't cost me the opening." | Rapid Reload |
| `ET-RC04` | "I want my squadmates and me to stand stronger when we hold our ground together." | Shoulder to Shoulder; Strength in Numbers |
| `ET-RC05` | "I want to use my blaster as a close-quarters weapon when an enemy is too close for a clean shot." | Weapon Shift; requires Gun Club |

**Faction guardrail:** An Elite Trooper can explore published Republic Commando *mechanics* without the answer asserting that the actor has served the Republic or an actual commando unit.

#### Protection - 6 answers

| Draft ID | First-person player response | Candidate mechanical anchor |
|---|---|---|
| `ET-PR01` | "I want to make my own position and armor into cover for someone fighting right beside me." | Ward; Armored Guard |
| `ET-PR02` | "I want to step into the line of fire when a nearby ally is about to take a hit." | Bodyguard's Sacrifice |
| `ET-PR03` | "I want to reach someone in danger and take the blow that would drop them." | Lifesaver |
| `ET-PR04` | "I want to pull an ally out of a bad position before the enemy can pin them down." | Out of Harm's Way |
| `ET-PR05` | "I want to withstand the damage I take for somebody else and stay in the fight afterward." | Take the Hit; Roll With It |
| `ET-PR06` | "I want protecting someone at my side to make me harder to put down, too." | Guard's Endurance; Ward |

#### Squad Leader - 5 answers (confirmed printed expansion; omitted from current prestige profile)

| Draft ID | First-person player response | Candidate mechanical anchor |
|---|---|---|
| `ET-SL01` | "I want to get my squad out of danger without leaving anyone exposed to a free shot." | Fall Back |
| `ET-SL02` | "I want to organize my squad's positions so we can help keep each other from getting hit." | Form Up |
| `ET-SL03` | "I want to give a small unit the timing to hit harder when we advance together." | Full Advance |
| `ET-SL04` | "I want to steady my squad when a fight starts wearing them down." | Hold Steady |
| `ET-SL05` | "I want my squad to search and move together so we spot trouble before it hits us." | Search and Destroy |

**Eligibility guardrail:** These five talents require Charisma 13, a defined on-foot squad, line of sight and communication, and additional individual rules. Answer interest is never proof that such a squad exists or those prerequisites are met.

#### Non-talent identity, capstone, and neutral - 3 answers

| Draft ID | First-person player response | Semantics |
|---|---|---|
| `ET-ID01` | "I want to become the kind of fighter who can adapt between assault, defense, and a quiet insertion instead of relying on a single tactic." | General Elite Trooper versatility; does not grant a bonus talent or assert training in every tree. |
| `ET-ID02` | "I've worked toward this level of combat expertise. I could spend the rest of my career making it count." | Prestige-as-capstone fulfillment; do not infer later prestige interest. Conditional wording about past intent must not be used to overwrite a previously stated ambition. |
| `ET-NEUTRAL` | "I'm not ready to choose a specialty. I want to learn what elite training makes possible before deciding." | Neutral: no positive/negative tags, commitments, preferred equipment, alignment, soldier identity, career rewrite, or automatic prerequisites. |

### 15.4 Counts and QA ledger

| Section | Talent-focused answers |
|---|---:|
| Camouflage | 7 |
| Commando | 8 |
| Weapon Master | 9 |
| Master of Teras Kasi (**quarantined**) | 4 |
| Mandalorian Warrior | 4 |
| Critical Master | 6 |
| Melee Specialist | 5 |
| Republic Commando | 5 |
| Protection | 6 |
| Squad Leader | 5 |
| **Total thematic draft answers** | **59** |
| Identity / capstone / neutral | **3** |
| **Total Q1 answer candidates** | **62** |

**Publication-eligible candidate answers pending individual talent verification:** 55 thematic options excluding the four quarantined Teras Kasi proposals. This is NOT a claim that all 55 satisfy prerequisites for any given actor or are mechanically certified.

**Implementation and source issues to carry forward:**

1. **ET-IMPL-01 (verified discrepancy):** `prestige-survey-profiles.js` omits `squad_leader` despite the Core Elite Trooper current class tree membership containing it and Galaxy at War expressly adding that tree. Remedy: reconcile profile against canonical V2 eligibility authority; test a Squad Leader option as discoverable when legal; prevent profiles from becoming a second competing authority.
2. **ET-IMPL-02 (source grant uncertain):** Elite Trooper repo grants Master of Teras Kasi, while the inspected Threats/Galaxy at War passages do not establish the exact playable Elite Trooper grant as clearly as they do other expansions. Remedy: find explicit publication/errata provenance, examine class/prestige references and talent text, and either certify the grant or quarantine/remove the erroneous mapping in a clean cutover; no silent assumption.
3. **ET-IMPL-03 (prerequisite mismatch, unresolved):** Repo contains `featsOr` alternative Flurry and `Mercenary` entry prerequisite whereas printed Core entry lists Point Blank Shot and Armor Specialist/Commando/Weapon Specialist. Remedy: cite approved supplement or rules errata for every expanded alternative, otherwise correct the canonical eligibility file; do not gate Q1 on unverified prerequisites.
4. **ET-IMPL-04 (talent semantics):** Talent-name inventory includes overlapping defensive/protection and weapon/critical options; user-facing statements must be matched to printed mechanics and prerequisite chains, not inferred from names alone. Remedy: verify each selected candidate against the actual full talent text and V2 provenance registry and test no free grants.
5. **ET-IMPL-05 (Mentor voice):** Existing Breach greetings imply specific past missions and Lead discussions. Remedy: only use source-supported, actor-specific relationship/events; default to concise, approachable, slightly teasing Breach lines grounded in generic class eligibility. Test both first entry and later experience without fabricated history.

**Editorial questions parked:** Exact option count and adaptive selection, role weighting, ontology mapping, actor-specific filtering, alternative browsing design. Do not settle these in this Q1-only conversation until owner requests it. All 62 answers and Breach lines remain DRAFT.

**Change log (local v0.12):** Reviewed printed Core Elite Trooper class on pp. 211-212, inspected supplemental prestige expansion passages in KOTOR, Force Unleashed, Clone Wars, Legacy Era, Galaxy at War, Unknown Regions, and examined Threats of the Galaxy Teras Kasi NPC plus Galaxy at War Martial Arts Master reference. Inspected live class/talent tree records and Breach individual Mentor JSON. Added 62 first-pass Q1 candidate answers (four quarantined) and five specific implementation/source issues; no repository mutations, commits, or pushes.


---

## 16. Q1 editorial bank - Force Adept (Core prestige class #5; 2026-11-14)

**Status:** DRAFT only; not owner-approved, mechanically certified, implemented, or committed. **Scope:** Q1 only. Selection, ordering, rank weights, score mappings, and display count remain deferred at owner direction.

### 16.1 Source and character audit

- **Core Rulebook**, printed pp. 212-214 (visually inspected PDF pages including PDF 214-215): Force Adept entry requirements are heroic level 7, trained Use the Force, Force Sensitivity, and any three Force talents. Core talent trees: **Dark Side Devotee, Force Adept, Force Item**. A talent is selected at odd-numbered Force Adept levels; a **Force Technique** at each even-numbered Force Adept level; Defense bonuses at entry. This is a distinct and potentially terminal career, not inherently a bridge toward Force Disciple, Jedi Knight, or Sith Apprentice.
- **Jedi Academy Training Manual**, Force Adept Talents section: adds Beastwarden, Mystic, and Telepath trees, along with Dark Side Talisman talents in Dark Side Devotee. Reviewed source TXT passages directly.
- **Force Unleashed Campaign Guide**, Force Adept Talents: Imperial Inquisitor tree is restricted to an **Inquisitorius member with Dark Side Score at least 1**. Its presence in the class registry is not blanket access.
- **Knights of the Old Republic Campaign Guide**, Force Adept Talents: Force Throw and Primitive Block expand Force Item. **Clone Wars Campaign Guide**, Force Adept Talents: Focused Force Talisman and Greater Focused Force Talisman expand Force Item.
- **Unknown Regions**, Force Adept Talents: Instrument of the Force, Mystical Link, and Long Call expand Force Adept. The text expects characters from known space to learn this material from an Unknown Regions native, rather than learn it independently; retain as a publication-specific training caveat, not a fabricated actor relationship.
- **Repository static read-only inventory:** `packs/classes.db` lists exactly seven tree keys: `dark_side_devotee`, `force_adept`, `force_item`, `imperial_inquisitor`, `beastwarden`, `mystic`, `telepath`. `packs/talent_trees.db` currently lists respectively 6, 6, 8, 4, 5, 5, 5 named talents (**39 repository indexed claims**). Individual prerequisite and provenance audit still needed, and entries must be certified against printed text rather than trusting names alone.
- **Seeker Vera**: `data/dialogue/mentors/vera/vera_dialogue.json` describes a wandering, self-taught, calm, curious, gently probing non-Jedi Force mystic. Values independent inquiry, attunement, restraint, openness; avoid her endorsing Imperial interrogation, presumed dark-side allegiance, or forced Force Disciple advancement. Central registry key `venn` and personality key `Venn` refer to display `Seeker Vera`: retain alias-resolution QA debt.

### 16.2 Mentor Q1 draft - Seeker Vera

> "There are many ways to listen to the Force, and you have come far enough to walk one of them more deeply. Some seek understanding, others protection, and some choose paths I would not choose myself. None of that tells me what *you* hope to learn. Which part of this calling draws you?"

**Proposed player-facing question:** "As a Force Adept, what part of your connection to the Force do you want to deepen?"

**Alternative, shorter Vera line:** "You have reached a place few find by following another person's map. The Force offers more than one way forward, and it need not lead you into another order. Tell me, what calls to you now?"

All answers below are in first-person character voice. The second column is author-facing, not intended as displayed survey labels. The third is a mechanical annotation, never a grant.

### 16.3.1 Dark Side Devotee - 5 Q1 proposals

| Draft ID | First-person selectable answer | Canonical talent anchor / guardrail |
|---|---|---|
| `FA-DS01` | "I want to channel the dark side into a decisive strike when an opponent leaves themselves exposed." | Channel Aggression |
| `FA-DS02` | "I want to turn my anger into strength in close combat, even knowing there is a price for losing that calm." | Channel Anger; must disclose effect on concentration and condition track |
| `FA-DS03` | "I want a critical strike to leave an opponent less able to escape or maneuver." | Crippling Strike |
| `FA-DS04` | "I want to embrace dark-side Force powers deeply enough to push them beyond my usual control, accepting what that choice costs." | Embrace the Dark Side; bars light-side descriptor powers |
| `FA-DS05` | "I want to create a dark-side talisman to guard me against the powers of the light, and improve its protection as I learn." | Dark Side Talisman; Greater Dark Side Talisman |

### 16.3.2 Force Adept - 6 Q1 proposals

| Draft ID | First-person selectable answer | Canonical talent anchor / guardrail |
|---|---|---|
| `FA-FA01` | "I want to perfect a Force power that matters to me until I can rely on it when everything is at stake." | Force Power Adept |
| `FA-FA02` | "I want to use my connection to the Force to tend injuries and treat illness or poison when ordinary supplies are out of reach." | Force Treatment |
| `FA-FA03` | "I want the Force to shield my body from disease, poison, and harmful radiation." | Fortified Body; requires Equilibrium |
| `FA-FA04` | "I want to learn to ask the Force for guidance when my usual abilities have run thin, without assuming I control its answer." | Mystical Link; Gamemaster-selected benefit |
| `FA-FA05` | "I want to follow the living Force through uncertain choices and draw strength from what I learn about their consequences." | Instrument of the Force; uses Search Your Feelings; Dark Side Score consequences |
| `FA-FA06` | "I want to reach distant minds through the Force and learn to contact several people when a message cannot wait." | Long Call; requires Mystical Link; Unknown Regions training context |

### 16.3.3 Force Item - 6 Q1 proposals

| Draft ID | First-person selectable answer | Canonical talent anchor / guardrail |
|---|---|---|
| `FA-FI01` | "I want to attune a melee weapon to myself so my connection with it makes my attacks more precise." | Attune Weapon |
| `FA-FI02` | "I want to empower a melee weapon with the Force so it strikes harder when I wield it." | Empower Weapon |
| `FA-FI03` | "I want to craft a protective talisman and strengthen its defenses as my knowledge grows." | Force Talisman; Greater Force Talisman |
| `FA-FI04` | "I want a talisman bound to one of my Force powers so I can recover that power when I need to use it again." | Focused Force Talisman; Greater Focused Force Talisman; requires Force Talisman |
| `FA-FI05` | "I want to hurl an empowered melee weapon with the Force and make the throw dangerous enough to turn a fight." | Force Throw; requires Empower Weapon; no automatic weapon return |
| `FA-FI06` | "I want to turn an empowered weapon into a defense, using the Force to intercept a melee attack." | Primitive Block; requires Empower Weapon |

### 16.3.4 Imperial Inquisitor (RESTRICTED) - 4 Q1 proposals

**Restricted catalog:** Do not offer these as generally available Force Adept options. Printed Inquisitorius membership and Dark Side Score requirements apply. Never infer Imperial membership or allegiance from the class alone.

| Draft ID | First-person selectable answer | Canonical talent anchor / guardrail |
|---|---|---|
| `FA-II01` | "I want to use the fear caused by my Force attacks to press an enemy into submission." | Force Interrogation; Inquisitorius membership and Dark Side Score 1+ required |
| `FA-II02` | "I want my intimidation to reach several enemies at once instead of threatening them one by one." | Cower Enemies; requires Force Interrogation; Inquisitorius membership and Dark Side Score 1+ |
| `FA-II03` | "I want to train specifically to fight Force-sensitive opponents and exploit their vulnerabilities." | Inquisition; Inquisitorius membership and Dark Side Score 1+ |
| `FA-II04` | "I want my presence alone to unsettle nearby opponents and weaken their resolve to fight." | Unsettling Presence; requires Force Interrogation; Inquisitorius membership and Dark Side Score 1+ |

### 16.3.5 Beastwarden - 5 Q1 proposals

| Draft ID | First-person selectable answer | Canonical talent anchor / guardrail |
|---|---|---|
| `FA-BW01` | "I want to touch the minds of wild creatures and calm them instead of treating every encounter as a fight." | Charm Beast; limited creature Int and other printed constraints |
| `FA-BW02` | "I want to form an enduring bond with a willing mount and share in its senses while we travel." | Bonded Mount; requires Charm Beast and a friendly or helpful domesticated beast |
| `FA-BW03` | "I want to ask a cooperative beast to carry a message, retrieve something, or help with a small task." | Entreat Beast; requires Charm Beast |
| `FA-BW04` | "I want my connection to animals to ease their hostility before I need to defend myself from them." | Soothing Presence; requires Charm Beast |
| `FA-BW05` | "I want to perceive what a nearby beast sees and senses, learning about places I cannot observe myself." | Wild Sense; requires Charm Beast; range/line of sight apply |

### 16.3.6 Mystic - 5 Q1 proposals

| Draft ID | First-person selectable answer | Canonical talent anchor / guardrail |
|---|---|---|
| `FA-MY01` | "I want to draw on my own vitality for a brief surge of Force power when the need is greater than my comfort." | Channel Vitality; condition-track cost |
| `FA-MY02` | "I want my mind to resist attempts to influence or deceive me through supernatural power." | Closed Mind; specific mind-affecting Will-targeting attacks |
| `FA-MY03` | "I want the techniques I learn through the Force to help sustain me when an encounter turns dangerous." | Esoteric Technique; Force Point use with a Force technique/secret |
| `FA-MY04` | "I want a deeper reserve of Force energy as my understanding and talents grow." | Mystic Mastery; extra Force Points on level gain based on Force talents |
| `FA-MY05` | "I want disciplined Force regimens and ritual practice to become a dependable part of my training." | Regimen Aptitude; requires Force Regimen Mastery feat |

### 16.3.7 Telepath - 5 Q1 proposals

| Draft ID | First-person selectable answer | Canonical talent anchor / guardrail |
|---|---|---|
| `FA-TP01` | "I want to touch a mind through the Force and uncover information that questions and rumors cannot reveal." | Mind Probe; adjacent living target, opposed check if unwilling |
| `FA-TP02` | "I want to convey complete thoughts through telepathy instead of relying on fragments and impressions." | Perfect Telepathy; full outgoing messages, not reciprocal full-sentence replies |
| `FA-TP03` | "I want to fortify my thoughts against others who would reach inside my mind." | Psychic Citadel; Force bonus to Will Defense based on class level |
| `FA-TP04` | "I want anyone who tries to invade my mind with the Force to risk harm for the attempt." | Psychic Defenses; requires Psychic Citadel |
| `FA-TP05` | "I want to build on a successful mental influence before my target can recover their bearings." | Telepathic Intruder; applies to same target, brief duration |

### 16.4 Class-feature and identity choices (four additional answers)

| Draft ID | First-person selectable answer | Interpretation |
|---|---|---|
| `FA-FT01` | "I want to deepen my understanding of Force techniques as I continue my training, not just rely on the powers I already know." | **Force Technique**, class-granted selection at even Force Adept levels; not an immediate first-level talent or Force secret. |
| `FA-ID01` | "I want to explore the Force on my own terms, without needing to join the Jedi or the Sith." | Independent path, not a claim of no affiliation or a specific future pledge. |
| `FA-ID02` | "I worked toward becoming a Force Adept. I want to grow within this path rather than seek another title." | Prestige-as-capstone option, conditional on a player's own stated retrospective interpretation; not an automatic historical assertion. |
| `FA-NEUTRAL` | "I have not settled on one tradition or specialty. I want to discover what this path makes possible first." | Neutral; zero new direction, tag, commitment, history rewrite, or moral alignment inference. |

### 16.5 Counts, coverage, and pending certification

| Tree or type | Draft Q1 answers | Indexed talent entries | Treatment |
|---|---:|---:|---|
| Dark Side Devotee | 5 | 6 | Provisional, source-grounded thematic choices |
| Force Adept | 6 | 6 | Provisional, source-grounded thematic choices |
| Force Item | 6 | 8 | Provisional, source-grounded thematic choices |
| Imperial Inquisitor (RESTRICTED) | 4 | 4 | Restricted; no generic presentation |
| Beastwarden | 5 | 5 | Provisional, source-grounded thematic choices |
| Mystic | 5 | 5 | Provisional, source-grounded thematic choices |
| Telepath | 5 | 5 | Provisional, source-grounded thematic choices |
| **Talent-linked total** | **36** | **39** | Grouped closely related prerequisite ranks where useful |
| Force Technique + identity + capstone + neutral | **4** | Not talent-tree entries | Additional non-talent choices |
| **Entire Q1 candidate bank** | **40** | **39** | Four Imperial Inquisitor proposals restricted; all entries still require source/eligibility review |

**Differences to preserve:** Force Adept `FA-FA06` (`Long Call`) increases range/reach and group telepathy, versus Telepath `FA-TP02` (`Perfect Telepathy`) enhances detail of messages. `FA-MY02` `Closed Mind` and `FA-TP03/TP04` cover different defensive mechanics; do not collapse only because all sound like psychic resistance. Dark Side Devotee and Imperial Inquisitor are not interchangeable alignments or traditions. `FA-FI01/02` apply to *melee* weapons, not arbitrary blasters. `FA-FA04` Mystical Link gives a **GM-chosen** result; no player-selected guaranteed effect. `FA-FA05` Instrument of the Force is risk-bearing (Dark Side Score).

### 16.6 Deferred implementation/source issues

1. **FA-IMPL-01 (special eligibility):** Imperial Inquisitor talents require both Inquisitorius membership and Dark Side Score 1+. Proposed solution: enforce the printed eligibility through canonical rules; do not show four restricted answers as freely available by simply reading class tree membership. Test qualifying, nonqualifying, and incomplete-metadata actors.
2. **FA-IMPL-02 (cultural/training restriction):** Unknown Regions explicitly recommends native instruction for certain Force Adept expansions. Proposed solution: encode publication training caveat appropriately and never fabricate mentor/teacher acquisition; verify whether campaign rule interpretation treats this as hard gate or narrative guidance.
3. **FA-IMPL-03 (mentor ID):** `venn` registry alias / `Venn` personality key / display `Seeker Vera` need exact runtime routing. Proposed solution: canonical stable ID plus verified aliases, no duplicate Mentor identity, QA for all Force Adept entry flows.
4. **FA-IMPL-04 (tradition scope):** `Felucian Shaman` appears as a distinct repo talent tree but is not among the seven class-access tree keys. Proposed solution: verify printed tradition/source grant and do not silently add as generic Force Adept talent selection merely because of lore.
5. **FA-IMPL-05 (Force techniques vs talents):** Q1 Force Technique interest must never confer a new technique at 1st level; techniques arise on *even* Force Adept class levels. Proposed solution: separate preview, intent and finalized class-feature authority, QA each level transition.
6. **FA-IMPL-06 (mind-affecting/moral distinctions):** Telepath Mind Probe and Dark Side Devotee choices have very different implications from nonintrusive psychic defenses. Proposed solution: ensure transparent, nuanced options and prerequisites; record selected interest without automatically setting Dark Side Score or faction.
7. **FA-IMPL-07 (talent mapping verification):** All 36 talent-linked text candidates need source-page-to-repo-identity audit for prerequisites and intended effects before implementation; grouped talismans and enhanced effects must respect prerequisite ranks and Force Point costs. Proposed solution: certify against printed text, current V2 tree membership and canonical IDs, then test expected progression.
8. **FA-IMPL-08 (mentorship characterization):** Vera's personal independent mystical voice must not imply she approves of Inquisitorius behavior or that the character must join another order. Proposed solution: fixed calm reflective opening, no fabricated historical teacher or actor allegiance; test opposing dark-side and light-side actors without voice collision.

**Editorial follow-up:** Full player-voice review for verbosity, overlap and cultural specificity; recheck prerequisite exactness of `Channel Anger`, `Fortified Body`, `Regimen Aptitude`, `Long Call`, `Psychic Defenses`, talisman chains and Inquisitor abilities. **Do not settle Q1 presentation/selection count in this class review.**

**Change log (local v0.13):** Directly inspected the Core Force Adept printed pages in the uploaded PDF and read source TXT passages from Jedi Academy, Force Unleashed, KOTOR, Clone Wars and Unknown Regions; compared class/tree registry, prestige entry requirements, survey definitions and Seeker Vera dialogue. Added 40 source-anchored first-person Q1 candidates, four deliberately restricted Imperial Inquisitor candidates, and eight implementation-review issues. All prior Q1 class banks and Mentor implementation debt remain. No GitHub writes.

---

## 17. Core Rulebook / Prestige Class 6 — Force Disciple Q1 (Riquis; local v0.14)

**Status:** COMPLETE FIRST EDITORIAL DRAFT ONLY. Owner has not approved text, selection policy, ontology mappings, or any implementation. Class review is source-based; runtime and full talent/secret legality remain open. This section preserves earlier Q1-only scope and does not address Q2–Q6.

### 17.1 Source and rules audit

**Printed Core Rulebook, pp. 214–215 (rendered/inspected):** Force Disciple is a **five-class-level** pinnacle prestige class, with minimum heroic level 12, trained Use the Force, Force Sensitivity, two talents from Dark Side Devotee / Force Adept / Force Item, farseeing Force power, and one Force Technique. The printed rules do **not** require a Force Adept class level as such. At first Force Disciple level, gain Indomitable (immune to mind-affecting effects), Prophet (extra Destiny Point per class level; may sacrifice the extra point for GM-selected prophetic vision and possible destiny change), defense bonuses, and a talent. Talents recur at class levels 3 and 5. Force Secrets are gained at 2, 3, 4, and 5. Core talents may come from the Force Adept tree **or any Force talent tree in Chapter 6** (printed p. 215); talent prerequisites remain effective.

**Critical printed clarification:** *Jedi Academy Training Manual*, Force Talents section, expressly interprets Force Disciple / Jedi Master / Sith Lord access to 'any Force talent tree': class-independent Force talent trees requiring Force Sensitivity, including Alter, Control, Dark Side, Light Side, Sense, Guardian Spirit and Force traditions. Tradition trees also require applicable actual membership/training (and some trees require morality restrictions). **Class-specific Jedi and other class talent trees are NOT granted automatically.**

**Current repository, read-only:** `packs/classes.db` Force Disciple (`ef6fe8fdbbd884b4`) currently has only `talentTreeIds: [force_adept]`; `prestige-survey-profiles.js` also lists only `force_adept`. This is **underinclusive versus published access** and must not be used as a legal-play restriction in the final Q1 without reconciliation. `packs/talent_trees.db` contains Alter, Control, Dark Side, Light Side, Sense, Guardian Spirit and multiple traditions, but legal membership and prerequisite handling remain separate.

**Force Secret sources inspected via provided text corpus, with Core source PDF visually checked:** Core Rulebook p. 103 (five); *The Clone Wars Campaign Guide*, Force Secrets section (three); *The Force Unleashed Campaign Guide*, Force Secrets section (five); *Jedi Academy Training Manual*, Force Secrets section (two). **15 distinct named Force Secrets.** These are not all acquired at entry: Force Disciple earns four secret-choice opportunities, from levels 2 through 5. Names, effects and restrictions are review anchors, **not** player-selected rules text. The future availability of supplements and any campaign/era limits must be handled by canonical authority.

**Mentor evidence:** `data/dialogue/mentors/riquis/riquis_dialogue.json`; Riquis is a soft-spoken, ancient-minded, enigmatic shaman who values insight, mystery and lived experience. He may be unsettling and cryptic but must not force every Force Disciple into his precise tradition, morality or mystical worldview. `mentor_registry.json` uses key `anchorite`, personality profile uses `Anchorite`, and class assignment uses name `Riquis`; alias normalization needs testing.

### 17.2 Riquis — proposed fixed Q1 dialogue

> "Mm. The threshold is real. Beyond it lie secrets that change how the Force answers, visions that unsettle destiny, and disciplines older than any name. Not every door should be opened. Which one calls to you?"

> **Q1:** As a Force Disciple, what part of your understanding or command of the Force would you most like to deepen?

**Editorial alternative, shorter:** “Mm. Your path has reached a threshold. The Force has more doors than names, and each opens differently. Which do you choose to approach?”

**Speech guardrails:** No assumption that the actor has personally met Riquis; no mandatory light/dark allegiance; no implied actual visions, Guardian Spirit, religious rites, apprentice, or Force Secret before acquisition. Riquis introduces the possibilities; all selectable responses are spoken by the **player character in first person**.

### 17.3 Candidate Q1 answer library

Each ID is a **provisional editorial identifier**. Source/mapping column is developer-only. Choice does not grant or certify the referenced feature. Restrictions noted in anchor text must be enforced before any personalized display of gated content.

#### Force Secrets — Core Rulebook (5)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-FS01` | “I want the Force powers I use to strike with greater force when a single blow must matter.” | Devastating Power — more damage dice; Force Point or Destiny Point. |
| `FD-FS02` | “I want to reach beyond the usual limits of my powers without surrendering the ability to see what I affect.” | Distant Power — extend numerically defined range; line of sight still applies. |
| `FD-FS03` | “I want a power meant for one person to reach others when I need to protect or confront more than one.” | Multitarget Power — add targets; normally single-target powers only. |
| `FD-FS04` | “I want to call on a Force power in the smallest opening, before the moment passes.” | Quicken Power — change activation action at Force Point / Destiny Point cost. |
| `FD-FS05` | “I want to shape a sweeping Force power so it reaches where it is needed and spares those I choose.” | Shaped Power — alter a cone into line or select targets, as specified by costs. |

#### Force Secrets — The Clone Wars Campaign Guide (3)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-FS06` | “I want to hold a Force power through the hardest moments without giving all my attention to maintaining it.” | Extend Power — maintain concentration with swift actions for a limited duration; Charisma modifier applies. |
| `FD-FS07` | “I want to set one Force power in motion and have another follow at the right moment, like two currents meeting.” | Linked Power — delays second unmodified power to the following round; cannot otherwise modify linked powers. |
| `FD-FS08` | “I want to call on powers that protect me even when injuries and exhaustion cloud my concentration.” | Unconditional Power — ignore condition-track penalties when activating self-targeted powers. |

#### Force Secrets — The Force Unleashed Campaign Guide (5)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-FS09` | “I want to make the dark side itself sharpen the effect of my powers against those less steeped in it than I am.” | Corrupted Power — DARK SIDE GATED: Dark Side Score must equal Wisdom score; excludes light-side powers. |
| `FD-FS10` | “I want my damaging Force powers to weaken a foe’s ability to carry on, not merely wound them.” | Debilitating Power — condition-track effect subject to damage-threshold/Use the Force rules. |
| `FD-FS11` | “I want to expand the reach of my area powers when an entire battlefield needs to feel their effect.” | Enlarged Power — enlarges area extent; costs Force/Destiny Point. |
| `FD-FS12` | “I want the light side to give my powers an edge against those who have embraced the dark.” | Pure Power — LIGHT SIDE GATED: Dark Side Score 0; cannot purify a dark-side power. |
| `FD-FS13` | “I want my powers to begin somewhere other than where I stand, changing where an enemy expects danger or help to come from.” | Remote Power — shifts point of origin for cone, line or radius effect. |

#### Force Secrets — Jedi Academy Training Manual (2)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-FS14` | “I want to learn from the Force knowledge carried by others and preserve what I discover for those who follow.” | Holocron Loremaster — temporary borrowed power from an ally plus holocron memory/gatekeeper functionality. |
| `FD-FS15` | “I want to share a power I know with an apprentice who has learned enough to carry that knowledge onward.” | Mentor — RESTRICTED: successfully trained an apprentice to knighthood or equivalent; temporary power use. |

#### Force Adept class talent tree (6)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-FA01` | “I want to understand one Force power so deeply that, when I invoke it, I can reach for a more reliable result.” | Force Power Adept — two Use the Force checks when spending a Force Point, keep better. |
| `FD-FA02` | “I want the Force to help me tend wounds and illness when medicine or equipment is far away.” | Force Treatment — Use the Force instead of Treat Injury; defined medical applications. |
| `FD-FA03` | “I want my connection to the Force to shield me from sickness, poison, and radiation.” | Fortified Body — immunity to disease, poison, radiation; Equilibrium prerequisite. |
| `FD-FA04` | “I want to invite the Force to answer a need I cannot meet through my own strength, and accept that its response may surprise me.” | Mystical Link — GM-chosen effect; no guaranteed chosen power. |
| `FD-FA05` | “I want to follow where the Force guides me when my choices could change lives, without pretending the outcome belongs to me.” | Instrument of the Force — exact rules and possible Dark Side Score costs require final identity cross-check. |
| `FD-FA06` | “I want my thoughts to reach those far beyond ordinary sight or hearing when I have something they need to know.” | Long Call — enhanced telepathic reach; check exact target and range limits. |

#### Universal Alter Force talents (5)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-AL01` | “I want to guide the shape of an area power so those standing beside me are not caught in its path.” | Disciplined Strike — exclude targets from area effects based on Wisdom modifier. |
| `FD-AL02` | “I want to recover the strength for another act of telekinesis when I have already spent my first effort.” | Telekinetic Savant — recover a qualifying telekinetic power. |
| `FD-AL03` | “I want to make images in the mind that seem real until someone knows where to look for the truth.” | Illusion — mind-affecting illusion; requires mind trick per published expansion. |
| `FD-AL04` | “I want to share an enduring mental link with a willing Force-sensitive companion.” | Telepathic Link — willing ally, Force Sensitivity, range, and consent constraints. |
| `FD-AL05` | “I want to notice what can be learned even in a moment when my own use of the Force goes wrong.” | Force Flow — temporary Force Point on natural 1, KOTOR expansion. |

#### Universal Control Force talents (4)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-CT01` | “I want to draw the Force around me as protection when something powerful would otherwise break me.” | Damage Reduction 10 — costs Force Point and operates for specified duration. |
| `FD-CT02` | “I want to clear the impairments that overcome my body before they determine the rest of the fight.” | Equilibrium — remove conditions/return toward normal as printed. |
| `FD-CT03` | “I want to recover a power I have spent through concentration instead of having to wait for another chance.” | Force Focus — recover one spent Force power with appropriate Use the Force check. |
| `FD-CT04` | “I want the Force to help me heal more fully when I find a moment to recover from danger.” | Force Recovery — additional healing on second wind, with prerequisite. |

#### Universal Sense Force talents (5)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-SE01` | “I want to sense hidden movement and deception through the Force rather than rely on my ordinary senses alone.” | Force Perception — substitute Use the Force in specified Perception situations. |
| `FD-SE02` | “I want to guide a ship or vehicle through my connection to the Force rather than rely only on conventional piloting instincts.” | Force Pilot — substitute Use the Force for Pilot under defined conditions. |
| `FD-SE03` | “I want to trust a glimpse of danger enough to act before an enemy seizes the initiative.” | Foresight — reroll Initiative using Force Point; Force Perception prerequisite. |
| `FD-SE04` | “I want to recognize the strength of another person’s connection to the Force without assuming I understand their intentions.” | Gauge Force Potential — reveals specified Force-related facts after opposed check; Force Perception prerequisite. |
| `FD-SE05` | “I want to look beyond the present moment and glimpse where a person has been—or might yet go.” | Visions — extends farseeing to past/future; future may change; Force Perception and farseeing prerequisites. |

#### Universal Dark Side Force talents — gated (3)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-DS01` | “I want to harness dark emotions to strengthen an attack, even knowing that each choice draws me further into darkness.” | Power of the Dark Side — can raise Dark Side Score; access requires positive DSS. |
| `FD-DS02` | “I want the dark side to fortify those who stand with me, binding their confidence to my presence.” | Dark Presence — allies defense bonus under printed restrictions; Power of the Dark Side prerequisite. |
| `FD-DS03` | “I want to release a Force power with dangerous speed when a slower response would mean defeat.” | Swift Power — one faster activation per day; Dark Side talent with prerequisite. NOT the same rules as Quicken Power. |

#### Universal Light Side Force talents — gated (3)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-LS01` | “I want to find a moment of peace in the Force that strengthens my defenses as long as I refrain from attacking.” | At Peace — Force Point, defensive bonus ends when attacking; requires DSS 0. |
| `FD-LS02` | “I want the light side to help me keep a dangerous dark-side foe from escaping the consequences of my attack.” | Focused Attack — reroll attack against dark-side target; requires DSS 0. |
| `FD-LS03` | “I want the light to return to me when I have already called on a power of healing or protection.” | Surge of Light — returns a light-side Force power without Force Point; requires DSS 0. |

#### Guardian Spirit Force talent tree — Jedi Academy (3)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-GS01` | “I want to listen to a guardian spirit’s counsel and learn what consequences my choices may bring.” | Guardian Spirit — guidance, situational foreknowledge, and daily restricted Force Point; GM/story scope. |
| `FD-GS02` | “I want the presence of a guiding spirit to give me steadiness when my own courage falters.” | Vital Encouragement — bonus hit points as encounter resource; Guardian Spirit prerequisite. |
| `FD-GS03` | “I want to learn to manifest a guardian spirit beside me and draw strength from its presence.” | Manifest Guardian Spirit — manifested spirit, Force Point and defined proximity bonuses; prerequisite Guardian Spirit. |

#### Force-tradition examples — eligibility restricted (3)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-TR01` | “I want to carry the protective teachings of the Jensaarai, binding the Force to my armor.” | Jensaarai Defender: Attune Armor — membership/training in Jensaarai tradition required. |
| `FD-TR02` | “I want to deepen the bond between my tradition and living creatures, learning to communicate where words cannot reach.” | Dathomiri Witch: Charm Beast / related tradition talents — culturally restricted; check membership and exact talent availability. |
| `FD-TR03` | “I want to understand the Force through the rites of the tradition I have truly learned, rather than trade it for another order’s teachings.” | Generic tradition-specific intent — must ground in actually qualified Force tradition and a verified talent tree; NOT an unconditional talent grant. |

#### Force Disciple defining features (2)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-CF01` | “I want a mind that cannot be turned aside by fear, coercion, or another person’s influence.” | Indomitable — immunity to mind-affecting effects at Force Disciple 1; not general immunity to all Will-targeting effects. |
| `FD-CF02` | “I want to understand what a vision might ask of me, even if accepting it means changing the destiny I thought was mine.” | Prophet — extra Destiny Point per level, optional GM-provided vision and eligible destiny selection; not guaranteed known future. |

#### Identity, fulfillment and neutral (3)

| ID | First-person player answer | Developer-only anchor and scope |
|---|---|---|
| `FD-ID01` | “I want to follow my own understanding of the Force, whether or not any order approves of the answers I find.” | Identity declaration only; no automatic affiliation or morality. |
| `FD-ID02` | “I have spent my journey seeking this depth of understanding. I want to keep growing here without needing another title.” | Prestige-as-capstone identity only; no downstream required prestige class. |
| `FD-UN00` | “I know this path holds deeper mysteries, but I have not decided which I want to pursue first.” | Neutral; no specialization, sign, or preference inferred. |

### 17.4 Development implications and acceptance constraints

1. **Source-access defect (FD-IMPL-01):** Class/tree registry and prestige profile expose only `force_adept`. Printed Core p. 215 plus JATM clarification grant access to the wider class-independent Force talent ecosystem; implement a canonical access authority respecting class eligibility, actual tradition membership, prerequisites, morality and era/campaign source settings. Test representative universal, Light Side, Dark Side, Guardian Spirit, and tradition talents; ensure non-Force class talents do not leak.
2. **Force Secret acquisition (FD-IMPL-02):** A first-level Force Disciple has **zero** automatically granted Force Secrets. Secrets are available at class levels 2–5, one each, subject to any individual limitations. Never call an intended secret an owned mechanic. Test at 1/2/3/4/5.
3. **Additional sourcebook secret options (FD-IMPL-03):** Preserve 15 named candidate Secrets across Core/CW/FU/JATM, not just Core's five; avoid auto-availability of source-disabled material. Specific Secret prerequisites/limits matter: Corrupted Power (DSS=Wis), Pure Power (DSS=0), Mentor (actual trained apprentice), linked-power restrictions, power type/range restrictions and Force/Destiny Point cost.
4. **Prophet / destiny authority (FD-IMPL-04):** The GM determines the prophetic vision and approves the possible destiny change. A Q1 interest in visions cannot manufacture a completed vision, a chosen destiny, or character history. Destiny feature is distinct from farseeing, Visions Sense talent, and Force Secret selection.
5. **Indomitable scope (FD-IMPL-05):** Immunity to mind-affecting effects is not blanket immunity to all effects targeting Will Defense; write UI tooltips and tests accurately.
6. **Tradition/morality gating (FD-IMPL-06):** Light Side talents require DSS 0; Dark Side tree requires DSS 1+; tradition-specific talent trees require verified membership/cultural training; Guardian Spirit-related answers do not establish an actual spirit without confirmed grant/narrative authority. No preference choice causes an alignment, membership, or Dark Side Score mutation.
7. **Riquis voice and alias routing (FD-IMPL-07):** `anchorite` / `Anchorite` / `Riquis` discrepancy belongs in deferred Mentor implementation audit. Ensure Force Disciple always resolves to the Riquis JSON voice, with indirect, unsettling, brief mentor speech but plain clear first-person *player* options.
8. **Class entry vs future goals (FD-IMPL-08):** Force Disciple's non-required relationship to earlier Force Adept class levels, its five-level cap and possible end-state are respected; never infer Force Disciple means Jedi/Sith or necessarily another prestige class. Test direct RAW legal route when eligible without Force Adept levels, and capstone declaration without inferred subsequent prestige ambition.
9. **Rules mapping/QA (FD-IMPL-09):** All response IDs need the exact printed source, legal rule record IDs, prerequisite verification and V2 registry mapping before deployment. Scored future intent must remain separate from current ability, pending class entry, and actual ownership. Neutral has zero new score.
10. **Selection UX deferred (FD-IMPL-10):** Do not settle displayed count, tree rotation, per-path ranking, hidden choice categories, weights, or suggestion-engine implementation in this class-specific editorial pass. Preserve full candidate bank for future owner decision.

**Special source note:** `FD-TR03` is a conditional narrative placeholder, not a universal talent entitlement; it requires an actual eligible tradition/talent. `FD-DS03` is **Swift Power** (talent, once/day under prerequisites), **not** the Force Secret `FD-FS04` (Quicken Power). Force Adept talent `FD-FA01` is not Force Technique `Force Power Mastery`, and the *Mentor* secret is not obtained merely by having a Mentor NPC.

### 17.5 Editorial count / status

| Category | Candidate answers |
|---|---:|
| Force Secrets — Core Rulebook (5) | 5 |
| Force Secrets — The Clone Wars Campaign Guide (3) | 3 |
| Force Secrets — The Force Unleashed Campaign Guide (5) | 5 |
| Force Secrets — Jedi Academy Training Manual (2) | 2 |
| Force Adept class talent tree (6) | 6 |
| Universal Alter Force talents (5) | 5 |
| Universal Control Force talents (4) | 4 |
| Universal Sense Force talents (5) | 5 |
| Universal Dark Side Force talents — gated (3) | 3 |
| Universal Light Side Force talents — gated (3) | 3 |
| Guardian Spirit Force talent tree — Jedi Academy (3) | 3 |
| Force-tradition examples — eligibility restricted (3) | 3 |
| Force Disciple defining features (2) | 2 |
| Identity, fulfillment and neutral (3) | 3 |
| **Total** | **52** |

**Source status:** Core rules and class-feature layout visually verified; supplements searched in the provided extracted TXT layers, with precise supplement text passages checked. Cross-publication talent legality, source-enabled filters and missing repository mappings remain open. The answer bank is a first-pass **proposal**, not fully certified source-to-mechanics mapping.

**Change log (v0.14, local):** Re-read Core Force Disciple printed pp. 214–215 and Core Force Secrets p. 103, consulted Force Secrets supplement sections in CW/FU/JATM, the JATM explicit Force talent-tree ruling, current repo class/tree/profile data, and Riquis dialogue. Drafted the full Q1 bank; logged access mismatch and gating concerns. **No repository edits, commits, pushes, Q2 design or answer-selection policy changes.**


---

## 18. Core Rulebook / Prestige Class 7 — Gunslinger Q1 (Rajma; local v0.15)

**Status:** DRAFT. Full editorial candidate library only; no player-visible answer selection UX, scoring, live implementation or approved content. Prior decisions about answer count, adaptation, and display rotation remain explicitly deferred. Core Rulebook is the *order of class review*, not an instruction to omit later-book legal options.

### 18.1 Class rules, source and repository evidence

- **Printed Core Rulebook pp. 216–217** (visually inspected): Gunslinger is a ten-level prestige class, heroic level 7+ with Point Blank Shot, Precise Shot, Quick Draw and Weapon Proficiency (pistols). The initial talent trees are **Gunslinger, Fortune, Awareness**. The Core describes bodyguards, freelancers, duellists, assassins and guardians of weaker people. These are optional roles, not assumptions of backstory or motive.
- **Talent cadence:** One class talent at Gunslinger levels **1, 3, 5, 7, 9**, subject to individual prerequisites. **Trusty Sidearm**, beginning at Gunslinger level **2**, increases pistol damage by half the Gunslinger class level (round down): +1 at level 2, +2 at level 4, +3 at level 6, +4 at level 8, +5 at level 10. It is a later feature, not something already owned at initial prestige entry. Do not conflate pistol damage with class Base Attack Bonus or character-level bonus damage.
- **Live read-only repo snapshot:** `packs/classes.db` (`Gunslinger`, id `162d866ba36fce69`) explicitly carries the five named tree IDs `awareness`, `fortune`, `gunslinger`, `pistoleer`, `carbineer`. `scripts/mentor/mentor-survey/prestige-survey-profiles.js` also lists all five. This is **registered access**, not by itself primary-source certification of each tree talent.
- **Later-book access:** *Scum and Villainy* printed p. 27 visibly shows **Pistoleer Talent Tree** with **Dash and Blast** (requires Dual Weapon Mastery I and Running Attack) and the Gunslinger-tree addition **Ranged Flank**. *Legacy Era Campaign Guide* explicitly states Gunslingers can select **Carbineer** talents, and names 8 Carbineer options. Gunslinger-tree additions confirmed in *The Clone Wars Campaign Guide* (`Blind Shot`), *Galaxy of Intrigue* (`Damaging Disarm`, `Pistol Duelist`), *Galaxy at War* (`Keep Them Honest`), and *The Unknown Regions* (`Lingering Debilitation`, `Retreating Fire`, `Slowing Shot`, `Swift Shot`). Awareness expansion `Reset Initiative` is printed in *The Force Unleashed Campaign Guide*, and `Weak Point` is printed in *Knights of the Old Republic Campaign Guide*. Fortune expansions include *Scum and Villainy* and *Knights of the Old Republic Campaign Guide* (`Lucky Stop`). All source expansion talents still require their own prerequisites.
- **Pistoleer conflict — source not certified:** The repo `packs/talent_trees.db` associates **five** titles with Pistoleer: `Dash and Blast`, `Hailfire`, `Guaranteed Shot`, `Twin Shot`, `Flanking Fire`. Only **Dash and Blast** was verified on the printed *Scum and Villainy* Pistoleer section in this pass. The other four were not found in the available indexed sourcebook text search and are **quarantined candidate prompts**, not endorsed as canon or for player display. Check full original publication provenance/identity before inclusion. This also makes a raw total of repository-indexed talents misleading as a count of certified options.
- **Other mapping caution:** Some added Gunslinger-talent record names (e.g. `Mobile Attack (pistols)`) need precise source-page and prerequisite reconciliation; verify their exact technical effects rather than turning the draft aspiration into a promise. Scoring and final player-facing mechanics remain pending a separate V2 certification step.

### 18.2 Mentor authority, intro and question

**Rajma source of truth:** `data/dialogue/mentors/rajma/rajma_dialogue.json`: charming, playful, boastful, fast, flirtatious, skill-focused; quick-draw, aim, confidence, freedom and living fast. Unlike Mayu, Rajma is about personal pistol dueling and charm. Unlike Kex, Rajma is not grim and clinical. The dialogue source does not authorize inventing a close personal relationship with the player or assuming the player already dueled, performed legendary tricks or trained personally under Rajma. Rajma’s known character history and references to a daughter are *not* player biography. Do not hard-code flattery of the player's gender or romance/consent; flirtation may be light and situational.

**Preferred introduction — DRAFT:**

> "Well, look who's earned a place among the quick draws. Nice. A pistol in the right hands can end a fight, save a life, or make one spectacular entrance. Me? I like having options. So tell me—what kind of Gunslinger are you going to be?"

**Alternative A — shorter:**

> "Look at you. Fast hands, a sharp eye, and room to become dangerous. There's more to this than drawing first, you know. What's your kind of gunfight?"

**Alternative B — more playful:**

> "So, you've reached the part where style starts counting as a survival skill. Try not to smile too much. Tell me what you're after: the perfect shot, the faster draw, or something cleverer?"

**Question:** "As a Gunslinger, what part of the craft do you want to make your own?"

**Tone rule:** The Mentor intro has Rajma's personality; players' answers express *their* voices, not an imitation of Rajma. Avoid claiming Gunslinger means assassin, murderer, lawbreaker, or perpetual bounty hunter.

### 18.3 Complete first-pass candidate answers (first-person)

Each answer is a player-facing candidate sentence; the **talent anchor and source/status are editorial only**. Words like "I want" indicate future interest, never a new owned feature, a feat acquired automatically or an inferred prior exploit. All four Pistoleer-repo-only rows are **explicitly quarantined** and excluded from any eventual selectable bank unless certified.

#### Awareness (8)

| ID | First-person candidate response | Mechanical source / editorial anchor | Evidence / status |
|---|---|---|---|
| GL-AW01 | "I want to pick up the tiny details that tell me when somebody is about to make a move." | Acute Senses | Core p. 49 |
| GL-AW02 | "I want to stay on someone’s trail without slowing down every time the tracks get difficult." | Expert Tracker | Core p. 49 |
| GL-AW03 | "I want my reflexes sharp enough that I can take the initiative before a fight gets away from me." | Improved Initiative | Core p. 49 |
| GL-AW04 | "I want to regain the advantage later in a fight when everyone thinks the order of battle is settled." | Reset Initiative | Force Unleashed, Awareness expansion |
| GL-AW05 | "I want to place a clean shot even when smoke or poor visibility obscures my target." | Keen Shot (concealment, not total concealment) | Core p. 49 |
| GL-AW06 | "I want someone who catches me off guard to discover that I can still react to the attack." | Uncanny Dodge I | Core p. 49 |
| GL-AW07 | "I want to fight without being easily trapped between enemies on either side of me." | Uncanny Dodge II | Core p. 49 |
| GL-AW08 | "I want to spot the one weakness in an opponent’s defenses that lets my shot get past their damage reduction." | Weak Point | Knights of the Old Republic, Awareness expansion |

#### Fortune (13)

| ID | First-person candidate response | Mechanical source / editorial anchor | Evidence / status |
|---|---|---|---|
| GL-FT01 | "I want a little luck on my side when the odds are bad and I need one more chance to get through." | Fool’s Luck | Core p. 46 |
| GL-FT02 | "I want a perfect hit to give me the opening for another decisive action before the moment ends." | Fortune’s Favor | Core p. 46 |
| GL-FT03 | "I want to try my hand at the gambling table and know when the odds are worth taking." | Gambler | Core p. 46 |
| GL-FT04 | "I want to turn a failed attempt into a second chance when my usual skill lets me down." | Knack | Core, Fortune tree |
| GL-FT05 | "I want my luck to rescue a shot that would otherwise have missed its mark." | Lucky Shot | Core, Fortune tree |
| GL-FT06 | "I want to turn a dangerous situation around with a shot nobody expected me to make." | Unlikely Shot | Scum and Villainy, Fortune expansion |
| GL-FT07 | "I want a lucky bounce or unlikely angle to help me reach a target that thought it was safe." | Ricochet Shot | Scum and Villainy, Fortune expansion |
| GL-FT08 | "I want to have a last chance to survive when a hit should have put me down." | Lucky Stop | Knights of the Old Republic, Fortune expansion |
| GL-FT09 | "I want to be harder to finish off when a fight turns against me and luck is all I have left." | Better Lucky than Dead | Scum and Villainy, Fortune expansion |
| GL-FT10 | "I want to avert one disaster at the critical moment, even when I cannot explain how I managed it." | Avert Disaster | Scum and Villainy, Fortune expansion |
| GL-FT11 | "I want to make something useful of a moment when I seem to have no real training to fall back on." | Dumb Luck | Scum and Villainy, Fortune expansion |
| GL-FT12 | "I want to remain unpredictable enough that enemies cannot easily anticipate how I will respond." | Labyrinthine Mind | Scum and Villainy, Fortune expansion |
| GL-FT13 | "I want to squeeze a better outcome out of a terrible shot when ordinary tactics are not enough." | Uncanny Luck | Scum and Villainy, Fortune expansion |

#### Gunslinger (17)

| ID | First-person candidate response | Mechanical source / editorial anchor | Evidence / status |
|---|---|---|---|
| GL-GS01 | "I want a carefully aimed pistol shot to put a dangerous opponent on the defensive even if it does not drop them." | Debilitating Shot | Core p. 216 |
| GL-GS02 | "I want to keep an injured target from recovering quickly after I have knocked them off their stride." | Lingering Debilitation | Unknown Regions, Gunslinger expansion |
| GL-GS03 | "I want my best shot to slow a target down and make it harder for them to escape." | Slowing Shot | Unknown Regions, Gunslinger expansion |
| GL-GS04 | "I want to draw so quickly that even an ambush leaves me a chance to fire back." | Improved Quick Draw | Core p. 216 |
| GL-GS05 | "I want to drop an enemy to the ground with a well-placed shot instead of relying on raw damage." | Knockdown Shot | Core p. 216 |
| GL-GS06 | "I want an opponent to misjudge me long enough that I can shoot while their guard is down." | Deceptive Shot | Core p. 216 |
| GL-GS07 | "I want my pistol training to keep several quick shots accurate instead of letting recoil and rushed timing ruin them." | Multiattack Proficiency (pistols) | Core p. 216 |
| GL-GS08 | "I want to shoot a weapon out of someone’s hand without letting them close the distance on me." | Ranged Disarm | Core p. 217 |
| GL-GS09 | "I want a well-placed disarming shot to hurt a dangerous opponent as well as leave them weaponless." | Damaging Disarm | Galaxy of Intrigue, Gunslinger expansion |
| GL-GS10 | "I want to fire a powerful rapid shot without sacrificing the accuracy I have trained to maintain." | Trigger Work | Core p. 217; Rapid Shot feat |
| GL-GS11 | "I want formal pistol dueling techniques that let me choose whether to aim, defend, or end the contest in one exchange." | Pistol Duelist | Galaxy of Intrigue, Gunslinger expansion |
| GL-GS12 | "I want to move and fight with a pistol without getting locked in place every time I pull the trigger." | Mobile Attack (pistols) | Additional Gunslinger tree; source-level timing certification pending |
| GL-GS13 | "I want to make an enemy feel surrounded even when I am covering them with my pistol from a distance." | Ranged Flank | Scum and Villainy, Gunslinger expansion |
| GL-GS14 | "I want to make a shot through darkness or heavy concealment when other shooters would lose the target." | Blind Shot (including total concealment) | Clone Wars, Gunslinger expansion |
| GL-GS15 | "I want to keep firing as I fall back from a pursuer rather than turn my back and hope they miss." | Retreating Fire | Unknown Regions, Gunslinger expansion |
| GL-GS16 | "I want to keep an enemy pinned down with suppressing fire so they cannot attack my allies effectively." | Keep Them Honest | Galaxy at War, Gunslinger expansion |
| GL-GS17 | "I want to squeeze one extraordinarily fast shot into a moment when anyone else would be too slow." | Swift Shot | Unknown Regions, Gunslinger expansion |

#### Pistoleer — source-verified (1)

| ID | First-person candidate response | Mechanical source / editorial anchor | Evidence / status |
|---|---|---|---|
| GL-PT01 | "I want to fight with a pistol in each hand while moving through the battle, never giving an enemy an easy shot at me." | Dash and Blast; requires Dual Weapon Mastery I and Running Attack | Scum and Villainy printed p. 27 |

#### Pistoleer — repository names NOT SOURCE CERTIFIED (4; quarantine)

| ID | First-person candidate response | Mechanical source / editorial anchor | Evidence / status |
|---|---|---|---|
| GL-PTQ01 | "I want to bring both pistols into a single burst of fire when the opportunity appears." | Hailfire — REPO ONLY; exact mechanics unverified | Unverified |
| GL-PTQ02 | "I want to steady a risky shot and know it will connect when the fight depends on one hit." | Guaranteed Shot — REPO ONLY; exact mechanics unverified | Unverified |
| GL-PTQ03 | "I want to make my two pistols work together as a single fighting style rather than two separate weapons." | Twin Shot — REPO ONLY; exact mechanics unverified | Unverified |
| GL-PTQ04 | "I want to create an opening for an ally by placing pistol shots from an unexpected angle." | Flanking Fire — REPO ONLY; exact mechanics unverified | Unverified |

#### Carbineer (8)

| ID | First-person candidate response | Mechanical source / editorial anchor | Evidence / status |
|---|---|---|---|
| GL-CB01 | "I want to use a carbine or rifle at close range without giving up the speed that makes me dangerous." | Close Contact | Legacy Era, Carbineer tree |
| GL-CB02 | "I want my rifle’s effective range to feel natural, landing shots that give other shooters trouble." | Rifle Master | Legacy Era, Carbineer tree |
| GL-CB03 | "I want to keep a rifle trained on the fight and react the instant an opponent gives me an opening." | Opportunity Fire | Legacy Era, Carbineer tree |
| GL-CB04 | "I want to bring my rifle to bear in a close fight, even when an enemy thinks I cannot react with it." | Shoot from the Hip | Legacy Era, Carbineer tree |
| GL-CB05 | "I want to take the time to line up a rifle shot without leaving myself open to a sudden close attack." | Snap Shot | Legacy Era, Carbineer tree |
| GL-CB06 | "I want my rifles and carbines to hit harder as my Gunslinger experience deepens, not just my pistols." | Old Faithful; extends Trusty Sidearm to rifles/carbines | Legacy Era, Carbineer tree |
| GL-CB07 | "I want a powerful rifle shot to drive a tough opponent backward when it hits hard enough." | Blowback | Legacy Era, Carbineer tree |
| GL-CB08 | "I want to put multiple rifle shots downrange without letting the penalties ruin my accuracy." | Multiattack Proficiency (rifles) | Legacy Era, Carbineer tree |

#### Class feature / identity / neutral (4)

| ID | First-person candidate response | Mechanical source / editorial anchor | Evidence / status |
|---|---|---|---|
| GL-CF01 | "I want to become so dependable with a pistol that every level of experience makes it hit that much harder." | Trusty Sidearm: class feature, damage bonus from Gunslinger level 2 onward | Core pp. 216–217 |
| GL-ID01 | "I want my shooting skill to protect people who cannot afford an armed escort or defend themselves." | Core class description: defender of the weak | Core p. 216 |
| GL-ID02 | "I have worked toward becoming a Gunslinger. I could spend the rest of my career honing that craft without needing another title." | Prestige-as-capstone editorial answer; no automatic class grant | Design principle |
| GL-NEUTRAL | "I want to see the different ways a Gunslinger can develop before I decide which one suits me." | No specialization inferred | Design principle |


### 18.4 Count, review status and per-class concerns

| Category | Candidate answers |
|---|---:|
| Awareness (8) | 8 |
| Fortune (13) | 13 |
| Gunslinger (17) | 17 |
| Pistoleer — source-verified (1) | 1 |
| Pistoleer — repository names NOT SOURCE CERTIFIED (4; quarantine) | 4 |
| Carbineer (8) | 8 |
| Class feature / identity / neutral (4) | 4 |
| **TOTAL** | **55** |

- **Nominal candidates:** 55 = 51 non-quarantined + **4** Pistoleer-source-quarantined; these are not approved and even the nonquarantined rows still require exact talent prerequisites and full V2 mapping before implementation.
- **Within-tree overlap:** `GL-GS01/GL-GS02/GL-GS03` share a Debilitating Shot chain; `GL-GS08/GL-GS09` are disarm and damaging disarm; `GL-GS04/GL-GS17` both concern action timing but are distinct; `GL-GS07/GL-CB08` are multiattacks for different weapon types; `GL-PT01` is dual-pistol mobility, not generic multiattack. Keep for editorial review, not automatic displayed duplicates.
- **Cross-tree overlap:** `GL-AW03/GL-AW04` early initiative versus later initiative repositioning; `GL-FT05/GL-FT06/GL-FT07/GL-FT13` are distinct luck/shot outcomes but may read similarly; separate speed, precision, survival, luck and tactical control when eventually choosing presentation rules.
- **Pistoleer verified-source coverage:** the class can use Pistoleer, but the supplied printed S&V p. 27 section only certifies Dash and Blast in this audit. `Hailfire`, `Guaranteed Shot`, `Twin Shot`, `Flanking Fire` must stay flagged until independently certified; do not conflate item/feat names with tree talents or assume all repo names correspond to printed talent identities.
- **Carbineer verified access:** *Legacy Era* explicitly adds this tree to Gunslingers despite the Core's pistol-centric description. `GL-CB06` refers to **Old Faithful** expanding the *later* Trusty Sidearm feature to rifles; the introductory prestige level does not acquire either feature automatically. Do not imply every rifle qualifies for every pistol feat/talent.
- **Exact action economy:** `Improved Quick Draw` has surprise-round conditions; `Swift Shot` is once per encounter and restricts further attacks, so avoid phrasing as unlimited extra shots; `Pistol Duelist` includes specific once-per-encounter options; `Dash and Blast` has specific prerequisites; `Blind Shot` includes total concealment while `Keen Shot` does not; `Debilitating Shot` has aim and target-type conditions. Editorial aspirations are not rules text.
- **Character agency:** lawful protectors and bodyguards, wanderers and independent duelists, opportunists and professional enforcers are all valid, no preselected morality, no imposed reputation or duel history. Q1 does not require the player to plan another prestige class.

### 18.5 Deferred issue ledger (Gunslinger)

1. **GS-IMPL-01, tree grant and source identity:** Reconcile `packs/classes.db` 5 tree IDs against published Core three-tree rule, S&V Pistoleer, Legacy Carbineer and all supplement additions; avoid trusting talent profile list alone.
2. **GS-IMPL-02, Pistoleer unverified names:** Audit Hailfire, Guaranteed Shot, Twin Shot and Flanking Fire individually in exact published pages or source records, resolve if they are noncanonical/alternate-tree/schema errors, then either certify or exclude. Do not display these four rows while unresolved.
3. **GS-IMPL-03, prerequisite engine:** Validate Dual Weapon Mastery I, Running Attack, Careful Shot, Debilitating Shot, Knack, Acute Senses, Improved Initiative, Keen Shot, trained Initiative and weapon-specific dependencies against canonical V2 mechanics.
4. **GS-IMPL-04, Trusty Sidearm level progression:** Verify +1..+5 on even levels only, weapon scope pistol by default, optional Old Faithful enhancement for rifle/carbine, damage roll scaling and nonstacking assumptions.
5. **GS-IMPL-05, conditional targets/actions:** Verify pistols versus rifles, total concealment, characters vs vehicles, ranged disarm, aimed attacks, full attacks, reactions, swift attacks, opportunity attacks, daily/encounter limits, and Pistol Duelist options.
6. **GS-IMPL-06, additional Gunslinger tree text:** Source-certify `Mobile Attack (pistols)` and any other future repository-only entry before claiming mechanics, as distinct from archetype prose.
7. **GS-IMPL-07, Rajma identity and relationship:** Guarantee correct `Rajma` JSON routing and avoid gendered presumed intimacy, inherited legendary reputation, invented missions or actual mentor-apprentice affiliation.
8. **GS-IMPL-08, survey authority separation:** Distinguish aspiration answer from current trained skills/feats, legal eligibility, acquired Gunslinger level and granted class features. No action triggered by text selection changes ownership or history.
9. **GS-IMPL-09, rendering/UX deferred:** No count of displayed choices, adaptive ranking, tree coverage rule, restyle, reroll, or code decision approved in this pass.
10. **GS-IMPL-10, data mapping and tests:** Map all certified rows to actual talents/source/page/prerequisite and ontology/archetype tags; test alternate class-entry builds and independent moral/professional identity with no implicit level-2 grant.

**Change log (v0.15, local):** Visually inspected Core Gunslinger printed pp. 216–217 and S&V printed p. 27; read Core and multiple later-book TXT passages; inspected repo class, five tree records, survey profile, eligibility, archetypes and Rajma dialogue. Added 55 editorial answers, of which 4 are quarantined; logged mismatches and verification debt. Prior classes and previously unresolved issues preserved. **No repository edits, commits, pushes, Q2 design, or answer-selection policy changes.**


---

## 19. Q1 BOOK 1 / CLASS 8 - JEDI KNIGHT (MIRAJ): 14-TREE ANSWER LIBRARY (DRAFT)

**Scope:** Q1 ONLY. Source and ability audit; draft Mentor introduction; first-person player answer library; deferred implementation debt. No code, repository write, Q2 work, answer-selection policy decision, or owner approval. Preserve all prior versions and issues.

### 19.1 Rules and class authority

- **Core Rulebook:** Jedi Knight printed pp. 217-219; four initial legal trees: Armor Specialist, Lightsaber Combat, Duelist, Lightsaber Forms. Core grants a talent at odd-numbered Jedi Knight class levels 1/3/5/7/9 and one Force Technique at even-numbered levels 2/4/6/8/10. Defense bonuses +2 Fortitude, Reflex, Will and full BAB progression. A Force Technique is **not** automatically gained at Jedi Knight level 1.
- **Published expansions represented by repository class:** KOTOR adds Jedi Battlemaster, Jedi Shadow, Jedi Watchman; Clone Wars adds Jedi Archivist and Jedi Healer; Jedi Academy adds Jedi Artisan, Jedi Instructor, Jedi Investigator, Jedi Weapon Master; Legacy Era adds Jedi Refugee. The later books also add talents to existing Core trees (KOTOR, Force Unleashed, Jedi Academy, Rebellion Era, Legacy Era).
- **Repo authority inspected:** `packs/classes.db` Jedi Knight entry has 14 tree keys; `packs/talent_trees.db` records have the entries enumerated below. Current `scripts/mentor/mentor-survey/prestige-survey-profiles.js` also lists the 14 trees. `data/prestige-class-prerequisites.json` lists BAB +7, trained Use the Force, Force Sensitivity, Weapon Proficiency (lightsabers), own-built lightsaber and Jedi tradition membership. Do not assume a pending level-up has already granted class ownership.
- **Mentor:** `data/dialogue/mentors/miraj/Miraj_dialogues.json` defines Miraj as measured, philosophical, gentle, respectful, attentive to intention versus action. Jedi Knight rank should cause a peer-like change in respect, **not** automatically imply that Miraj personally trained the character, was their former Master, or has shared campaign history. Existing prestige greeting text implies she was their former Master, which is an unsafe unverified relationship assumption.
- **Narrative boundary:** Knighthood may be the character's permanent vocation. Do not pressure the user into Jedi Master or mandatory Padawan training. An interest in teaching is distinct from having an apprentice or having attained mastery. Watchman service can be subject to Council appointment; Jedi Refugee and Jedi Shadow contexts have era/ethical constraints.

### 19.2 Miraj - proposed Q1 introduction

**Preferred intro (DRAFT, no assumed former-master relationship):**

> You have come far enough to stand at the threshold of Knighthood. The trust placed in a Jedi Knight is not a command to become only one thing. Some stand between danger and the vulnerable. Others heal, seek truth, teach, or prevent a conflict before it begins. Which part of this responsibility calls you to grow?

**Prompt (DRAFT):** As a Jedi Knight, which kind of service or discipline do you want to deepen?

**Short alternate (DRAFT):**

> Knighthood is not a single path, nor is it merely a step toward another title. You have earned the right to choose how you will serve. Tell me what you wish to cultivate.

**Guardrail:** Miraj's existing JSON describes her as a former Master and its Jedi Master path forces peer/old-friend familiarity. Do not use those as factual claims about a particular player. She is calm and capable of respecting different Jedi specialties; avoid collapsing Q1 into only peacekeeping or only lightsaber mastery.

### 19.3 Complete first-pass talent-linked Q1 bank

Every row below is a candidate first-person aspiration, **not** a guarantee of current ownership, prerequisite satisfaction, ability availability at first prestige level, an awarded title, or a narrative event. Talent-name anchors are developer/editor-only and are not presented as player answer text. Source review is at the tree level and by spot-checking rules; each exact talent/prerequisite remains subject to final certification against printed pages and current canonical talent data.

#### Armor Specialist - 6 talent-linked answers

**Source anchor:** Core Rulebook, Soldier talent tree p. 51, plus printed expansions; access from Core Jedi Knight p. 217.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-AR01` | "I want to use armor as protection without losing the defensive instincts I have already developed." | Armored Defense |
| `JK-AR02` | "I want my experience and my armor to reinforce one another instead of treating them as competing defenses." | Improved Armored Defense |
| `JK-AR03` | "I want to become so practiced in armor that its limits interfere less with my movement and defenses." | Armor Mastery |
| `JK-AR04` | "I want to move at full speed in protective armor when someone needs me to reach them." | Juggernaut |
| `JK-AR05` | "I want to maintain a personal shield under pressure rather than watch it fail in the middle of danger." | Shield Expert |
| `JK-AR06` | "I want armor to feel like a natural part of my defense, protecting me without demanding all my attention." | Second Skin |

#### Duelist - 11 talent-linked answers

**Source anchor:** Core Rulebook p. 218; Knights of the Old Republic, Force Unleashed and Jedi Academy expansions.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-DU01` | "I want to learn the subtle advantages of pairing a lightsaber with a shorter companion blade." | Shoto Master |
| `JK-DU02` | "I want the precision of my lightsaber attacks to improve through disciplined practice." | Greater Weapon Focus (Lightsabers) |
| `JK-DU03` | "I want to turn an incoming blaster attack against its source without exhausting my defenses." | Improved Redirect |
| `JK-DU04` | "I want a thrown blade to hinder a fleeing opponent, not merely wound them." | Thrown Lightsaber Mastery |
| `JK-DU05` | "I want to send my lightsaber through a line of threats and recall it through the Force." | Improved Lightsaber Throw |
| `JK-DU06` | "I want to counter a blocked melee attack without sacrificing my ability to defend the next one." | Improved Riposte |
| `JK-DU07` | "I want every clean strike with my lightsaber to carry the benefit of deeper technical mastery." | Greater Weapon Specialization (Lightsabers) |
| `JK-DU08` | "I want to survive an especially devastating blow by drawing on the Force at the critical moment." | Force Fortification |
| `JK-DU09` | "I want to end an otherwise lethal duel by disabling an opponent rather than killing them, even when that choice has a terrible cost." | Severing Strike |
| `JK-DU10` | "I want to return to a spent lightsaber-form power when the battle demands that technique again." | Lightsaber Form Savant |
| `JK-DU11` | "I want to maintain control and accuracy when I must make several lightsaber attacks in succession." | Multiattack Proficiency (Lightsabers) |

#### Lightsaber Combat - 11 talent-linked answers

**Source anchor:** Core Rulebook Jedi talents p. 41 and later Lightsaber Combat expansions.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-LC01` | "I want to meet an incoming melee strike with my lightsaber and stop it before it harms me." | Block |
| `JK-LC02` | "I want my blade to turn aside blaster fire when distance offers no safety." | Deflect |
| `JK-LC03` | "I want to fight from a stance that keeps me protected rather than relying only on stronger attacks." | Lightsaber Defense |
| `JK-LC04` | "I want practiced strikes with my lightsaber to have greater impact when force is necessary." | Weapon Specialization (Lightsabers) |
| `JK-LC05` | "I want to reach a distant threat with my lightsaber and bring it back to my hand." | Lightsaber Throw |
| `JK-LC06` | "I want a deflected blaster bolt to become a carefully directed answer to its attacker." | Redirect Shot |
| `JK-LC07` | "I want the proper equipment and training to stop a lightsaber strike even without my own blade in hand." | Cortosis Gauntlet Block |
| `JK-LC08` | "I want a redirected blaster bolt to strike with greater force once I have turned it back." | Precise Redirect |
| `JK-LC09` | "I want a measured lightsaber strike to slow an opponent before they can escape or reach someone vulnerable." | Precision |
| `JK-LC10` | "I want to turn a successful block into a controlled counterattack when an enemy overextends." | Riposte |
| `JK-LC11` | "I want the short blade in my off hand to be as deliberate and accurate as my main lightsaber." | Shoto Focus |

#### Lightsaber Forms - 12 talent-linked answers

**Source anchor:** Core Rulebook Jedi Knight p. 218-219; later supplements supply related form powers.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-LF01` | "I want agile movement and speed to define the power of my lightsaber strikes." | Ataru |
| `JK-LF02` | "I want two lightsabers to strengthen my defense rather than simply add more attacks." | Jar'Kai |
| `JK-LF03` | "I want to maintain unwavering focus on a single dangerous opponent through a demanding duel." | Juyo |
| `JK-LF04` | "I want to unsettle an opponent with changes in my blade's timing and ignition, creating an opening without brute force." | Trakata |
| `JK-LF05` | "I want a balanced lightsaber discipline that supports both my physical defense and my resolve." | Niman |
| `JK-LF06` | "I want to study an exacting, dangerous form that rewards precision at the highest levels of training." | Vaapad |
| `JK-LF07` | "I want to refine the elegant control of a single blade and defend against a skilled duelist." | Makashi |
| `JK-LF08` | "I want to turn the momentum of an enemy's melee strike into an immediate response." | Djem So |
| `JK-LF09` | "I want to make my defense reliable even through a relentless exchange of attacks." | Soresu |
| `JK-LF10` | "I want to remain steady when repeated attacks force me to block and deflect again and again." | Shii-Cho |
| `JK-LF11` | "I want footwork and tumbling to carry me through a crowded fight without losing momentum." | Sokan |
| `JK-LF12` | "I want incoming blaster fire to become an opportunity for a precise counterstrike." | Shien |

#### Jedi Battlemaster - 5 talent-linked answers

**Source anchor:** Knights of the Old Republic Campaign Guide, Jedi Battlemaster talent tree.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-BM01` | "I want my battle meditation to help the Jedi fighting beside me strike with greater confidence." | Jedi Battle Commander |
| `JK-BM02` | "I want to help an ally rise again at the moment they seem lost to the fight." | Force Revive |
| `JK-BM03` | "I want to advance through danger without surrendering my ability to defend against the attacks I provoke." | Slashing Charge |
| `JK-BM04` | "I want the allies gathered around me to benefit from our shared concentration and mutual protection." | Defensive Circle |
| `JK-BM05` | "I want to keep moving after a demanding sequence of attacks with two lightsabers." | Mobile Attack (Lightsabers) |

#### Jedi Shadow - 5 talent-linked answers

**Source anchor:** Knights of the Old Republic Campaign Guide, Jedi Shadow talent tree.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-SH01` | "I want to understand the dangerous methods a Shadow can use against the dark side, while confronting the moral cost of that knowledge." | Taint of the Dark Side |
| `JK-SH02` | "I want to meet dark-side Force powers with a stronger, more reliable defense of my own." | Rebuke the Dark |
| `JK-SH03` | "I want additional opportunities to exploit an opening against a threat I have studied." | Improved Sentinel's Gambit |
| `JK-SH04` | "I want to control what a hostile Force-user senses about me when revealing the truth would compromise my mission." | Dark Deception |
| `JK-SH05` | "I want my precise attacks against hidden threats to matter when I finally have to act." | Improved Sentinel Strike |

#### Jedi Watchman - 5 talent-linked answers

**Source anchor:** Knights of the Old Republic Campaign Guide, Jedi Watchman talent tree.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-WA01` | "I want to sense a threat early enough that the people beside me are not caught unprepared." | Force Warning |
| `JK-WA02` | "I want my attention to offer steady protection to one ally standing at my side." | Vigilance |
| `JK-WA03` | "I want to turn a brief warning into enough time for my companions to reach safety or take position." | Watchman's Advance |
| `JK-WA04` | "I want to intercept attacks meant for an adjacent ally with the same discipline I use to defend myself." | Sheltering Stance |
| `JK-WA05` | "I want my blade ready in the instant danger appears, even when I have been taken by surprise." | Improved Quick Draw (Lightsabers) |

#### Jedi Archivist - 5 talent-linked answers

**Source anchor:** Clone Wars Campaign Guide, Jedi Archivist talent tree.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-AV01` | "I want the Force to illuminate questions beyond the subjects I have formally studied." | Insight of the Force |
| `JK-AV02` | "I want to help another scholar find the answer when my own studies offer a useful connection." | Impart Knowledge |
| `JK-AV03` | "I want to reconsider uncertain knowledge before acting on a conclusion that could be wrong." | Scholarly Knowledge |
| `JK-AV04` | "I want to help an ally recover a Force power they have already spent when their strength is needed again." | Direct |
| `JK-AV05` | "I want my counsel to offer others more than an answer, giving them the means to act on it." | Master Advisor |

#### Jedi Healer - 4 talent-linked answers

**Source anchor:** Clone Wars Campaign Guide, Jedi Healer talent tree.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-HE01` | "I want my healing through the Force to restore more strength to someone who is badly hurt." | Healing Boost |
| `JK-HE02` | "I want to help an injured companion recover their ability to act, even when healing their wounds is not enough." | Soothe |
| `JK-HE03` | "I want to apply the Force to medical care when tools or trained healers are unavailable." | Force Treatment |
| `JK-HE04` | "I want deeper mastery of healing to make each use of vital transfer more effective." | Improved Healing Boost |

#### Jedi Artisan - 5 talent-linked answers

**Source anchor:** Jedi Academy Training Manual, Jedi Artisan talent tree.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-AT01` | "I want a lightsaber I made to serve my defensive discipline as faithfully as it serves my attacks." | Lightsaber Specialist |
| `JK-AT02` | "I want to craft blades whose quality comes from understanding, patience, and careful construction." | Masterwork Lightsaber |
| `JK-AT03` | "I want to adapt the lightsaber I built when the needs of a mission change." | Quick Modification |
| `JK-AT04` | "I want the bond with my own lightsaber to let me summon and ignite it when it is within sight." | Call Weapon |
| `JK-AT05` | "I want the Force and a blade of my own making to work as one when I commit to a strike." | Perfect Attunement |

#### Jedi Instructor - 5 talent-linked answers

**Source anchor:** Jedi Academy Training Manual, Jedi Instructor talent tree.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-IN01` | "I want to learn how to pass a Force secret I truly possess to an ally who can use it responsibly." | Share Force Secret |
| `JK-IN02` | "I want the defensive or martial disciplines I have mastered to help fellow Jedi in a time of need." | Share Talent |
| `JK-IN03` | "I want to lend one use of a Force power to a companion whose need is greater than mine." | Transfer Power |
| `JK-IN04` | "I want to strengthen a less experienced ally's connection to the Force at a difficult moment." | Apprentice Boon |
| `JK-IN05` | "I want a Force technique I have learned to become temporary support for another Jedi." | Share Force Technique |

#### Jedi Investigator - 5 talent-linked answers

**Source anchor:** Jedi Academy Training Manual, Jedi Investigator talent tree.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-IV01` | "I want to recognize when persuasive words conceal something important before I accept them as truth." | Sense Deception |
| `JK-IV02` | "I want foresight to help me recover the Force power I need for an unexpected threat." | Prepared for Danger |
| `JK-IV03` | "I want to close the distance on a chosen threat before they can endanger someone else." | Jedi Quarry |
| `JK-IV04` | "I want to sense what happened in a place before I arrived, and uncover truths ordinary evidence cannot reveal." | Echoes in the Force |
| `JK-IV05` | "I want my judgment to remain my own when someone tries to turn my mind with the Force." | Unclouded Judgment |

#### Jedi Refugee - 4 talent-linked answers

**Source anchor:** Legacy Era Campaign Guide, Jedi Refugee talent tree.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-RF01` | "I want to earn the trust of people who might shelter or aid a Jedi when open support is dangerous." | Jedi Network |
| `JK-RF02` | "I want to keep enemies from locating me through ordinary searches and rumors." | Cover Your Tracks |
| `JK-RF03` | "I want to make my presence less noticeable to distant Force-sensitive hunters." | Force Veil |
| `JK-RF04` | "I want the discipline to conceal my connection to the Force when revealing it would put others at risk." | Difficult to Sense |

#### Jedi Weapon Master - 5 talent-linked answers

**Source anchor:** Jedi Academy Training Manual, Jedi Weapon Master talent tree.

| ID | First-person answer | Talent / development anchor |
|---|---|---|
| `JK-WM01` | "I want to face several threats using two weapons without losing my control of either hand." | Twin Weapon Style |
| `JK-WM02` | "I want a battle strike to sustain my precision through an extended melee rather than fade after one blow." | Combat Trance |
| `JK-WM03` | "I want to use a short blade to hold an enemy's next melee attack in check after I successfully block." | Shoto Pin |
| `JK-WM04` | "I want my paired-weapon style to carry me between opponents without leaving me exposed." | Twin Weapon Mastery |
| `JK-WM05` | "I want to remain capable of defending others even when I have only an improvised weapon at hand." | Improvised Weapon Master |

### 19.4 Force Technique development (NOT a separate talent tree)

These choices lightly teach the later **even-class-level** Force Technique opportunities without claiming a technique at class level 1. Confirm exact ability names, action conditions and published prerequisites before player deployment.

| ID | First-person answer | Anchor |
|---|---|---|
| `JK-FT01` | "I want to recover some of the Force energy I have spent after an encounter, so one difficult moment does not exhaust my resolve." | Force Point Recovery |
| `JK-FT02` | "I want to rely on one carefully practiced Force power even when fear or distraction would unsettle my concentration." | Force Power Mastery |
| `JK-FT03` | "I want meditation to restore my strength more effectively when there is time to recover." | Improved Force Trance |
| `JK-FT04` | "I want to sense the presence of the Force more quickly when hesitation could leave someone exposed." | Improved Sense Force |
| `JK-FT05` | "I want to become aware of what is around me without surrendering the moment I need to act." | Improved Sense Surroundings |
| `JK-FT06` | "I want to make telepathic contact more reliably when distance or uncertainty complicates a message." | Improved Telepathy |
| `JK-FT07` | "I want greater economy and control when moving small objects through the Force." | Improved Move Light Object |

### 19.5 Identity, lifelong Knighthood and neutral answers

| ID | First-person answer | Purpose |
|---|---|---|
| `JK-ID01` | "I want to dedicate my Knighthood to protecting people and keeping peace, even when my greatest choice is not to fight." | Knightly service |
| `JK-ID02` | "I chose the calling of a Jedi Knight, and reaching it fulfills that purpose. I want to keep growing without seeking another rank." | Capstone / fulfillment |
| `JK-ID03` | "I have not decided which discipline to deepen. I want to understand the different forms of service open to a Jedi Knight first." | Neutral |

### 19.6 Counts and provisional treatment

- **14** registered available talent trees; **88** distinct repository-indexed named talent anchors in this bank, each with a first-person candidate answer. The counts include distinct variants of same-name or prerequisite-related abilities but do **not** imply all are presently legal on a fresh Jedi Knight build.
- **7** candidate Force Technique themed responses; **3** broader identity / capstone / neutral responses; **98 total** drafted first-person Q1 responses.
- **Deferred:** the number and selection of displayed answers, per-tree guaranteed coverage, ranking or personalization, secondary response browsing, and exact UI are not resolved here. Do not treat the list as a single player-facing page.
- **Coverage warning:** The 14 repository trees extend beyond the original four Core trees; they are not all universally usable by every character regardless of printed prerequisites, tradition/era assignment, equipment, cross-tree dependencies, ethical choices, or campaign approvals.

### 19.7 Source/production issue ledger (Jedi Knight)

1. **JK-IMPL-01: Class/tree provenance.** Certify Core's four tree grants and all ten later trees against exact printed page and repository class IDs; ensure no Jedi class-only Guardian, Consular, or Sentinel talents are silently assumed accessible from Jedi Knight merely because of similar names.
2. **JK-IMPL-02: Talent source identity.** Certify every printed talent name, exact prerequisite, and same-name identity, including Armor Mastery (more than one printed treatment), Force Treatment elsewhere, lightsaber forms, and weapon restrictions. A repository tree row or this editorial bank is not final rules certification.
3. **JK-IMPL-03: Deep prerequisite chains.** Validate Battle Meditation/Jedi Battle Commander, Sentinel Strike/Sentinel's Gambit, Block/Deflect/Redirect Shot/Riposte, Force Training and vital transfer, Skilled Advisor, Share Talent, prior Force Techniques, prior Force Secrets, and any feats or trained skills.
4. **JK-IMPL-04: Rare Force Secrets.** `Share Force Secret` is source-published but requires an already-known Force Secret. It is usually aspirational for an ordinary first-level Jedi Knight and must not be suggested as currently selectable merely from class membership. `Share Force Technique` likewise needs a known technique.
5. **JK-IMPL-05: Watchman appointment.** Printed KOTOR text describes Jedi Watchmen as Council-appointed. An answer may express interest in protective Watchman service, not silently appoint the character to a Council office or fictional jurisdiction.
6. **JK-IMPL-06: Era and ethics.** Jedi Refugee depends on a hunted-Jedi context and supporting contacts; Jedi Shadow's Dark Deception / Taint of the Dark Side must be described with explicit moral sensitivity and not equated with ordinary Jedi ethics or granted without source prerequisites.
7. **JK-IMPL-07: Lightsaber/armor equipment.** A prior self-built saber required to enter Jedi Knight does not mean every relevant lightsaber, shoto, double-blade, cortosis gauntlet, armor, shield, or two-weapon feat is already owned; distinguish conditional specialization.
8. **JK-IMPL-08: Feature timing.** Talents on odd Jedi Knight levels; Force Techniques on even levels; no automatic Force Technique at Jedi Knight level 1 and no Jedi Master class access, apprenticeship, or Council role inferred from this survey.
9. **JK-IMPL-09: Miraj relationship guardrail.** Keep her calm moral clarity and respectful peer-level voice. The dedicated JSON says 'Your former Jedi Master' and 'my friend' on later paths, but those are not verified actor-specific facts. Avoid fabricated prior personal mentorship, trials, missions, Padawan history, or obligation to train an apprentice.
10. **JK-IMPL-10: Survey source lanes.** Inferred identity, explicit prior aspirations, legal eligibility, selected Jedi Knight class, individual talent grants and mentor affiliation remain separate. Clicking a Q1 answer does not authorize changes to owned mechanics or prior player-stated goals.
11. **JK-IMPL-11: Player meaning.** Martial answers must not drown out the library's healing, investigation, scholarship, craftsmanship, service and protective leadership. This is a full candidate library; no global scoring or answer-selection rules are decided here.
12. **JK-IMPL-12: Duplicate or overlapping options.** Lightsaber Combat vs Duelist vs Forms vs Weapon Master have closely related techniques; source-distinct abilities must remain distinguishable, but presentation may eventually require representative editorial variants.
13. **JK-IMPL-13: Master/apprentice capstone.** Do not implicitly treat Jedi Knight as a temporary milestone on the way to Jedi Master; teaching is an optional interest. Do not make the rank of Master, Council service, or fully trained Padawan a mandatory future goal.
14. **JK-IMPL-14: Tests.** Eventually verify boundary conditions for first-level prestige entry, repeat visits, missing talent prerequisites, absent custom armor/shield, absent apprentice, differing eras, no Jedi Master goals, two-weapon ownership, and Force Technique timing.

**Change log (v0.16, local):** Read printed Core Jedi Knight p. 217-219 with rendered primary PDF pages; read Core, KOTOR, Clone Wars, Jedi Academy, Legacy Era, Rebellion Era and Force Unleashed TXT passages; inspected repo class, all 14 tree records, prerequisite registry, mentor profiles and Miraj's dedicated JSON. Added **98** first-person Q1 draft answers, Mentor intro and 14-item deferred issue ledger. All prior local versions and class libraries retained. **No repository edits, commits, pushes, Q2 design, or answer-selection policy changes.**

---

## 20. Core Rulebook / Prestige Class 9 — Jedi Master Q1 (Miraj; local v0.17)

**Status: COMPLETE FIRST EDITORIAL DRAFT ONLY.** Owner has not approved answer text, selection architecture, mechanical mappings, or implementation. This section addresses **Q1 only**. Earlier sections and unresolved debt are preserved. The answer bank is an editorial repertoire, not a display-count recommendation, legal talent picker, or actual inventory of acquired abilities.

### 20.1 Primary-source and repository findings

- **Core Rulebook printed pp. 219–220, actual PDF pp. 220–221, directly rendered and checked:** Jedi Master is a **five-level** prestige class. Entry requires minimum heroic level 12, trained Use the Force, Force Sensitivity, Weapon Proficiency (lightsabers), **any one Force Technique**, and membership in the Jedi tradition. The printed narrative connects Mastery to wisdom, patience, teaching and, in some eras, the Jedi Council; however **Council membership is not a universal class requirement**, and the description notes different recognition conventions across eras. A trained Padawan is described as the usual narrative path in some circumstances, **not** among the printed universal entry prerequisites. Do not infer that the surveyed player has personally trained someone.
- **Class progression:** Level 1: defense bonuses (+3 Fortitude / Reflex / Will), **Fearless** (immunity to fear effects), **Serenity** (meditative full-round action, aware of surroundings but loses Dex bonus to Reflex while in trance; first attack or Use the Force check in round after emerging with swift action counts as natural 20), and one talent. Level 2: Force Secret. Level 3: Force Secret and talent. Level 4: Force Secret. Level 5: Force Secret and talent. Jedi Masters gain 1d10 hit points per class level + Constitution modifier; Force Points are 7 + half character level rounded down when leveling in class. Force Secrets are **NOT obtained automatically at level 1**.
- **Critical access rule, Core p. 220:** The three Jedi Master talents (levels 1/3/5) may be chosen from the **Duelist talent tree OR any Force talent tree in Chapter 6**, if prerequisites are met. *Jedi Academy Training Manual* explicitly clarifies the 'any Force talent tree' clause for Jedi Master / Force Disciple / Sith Lord: any class-independent Force talent tree accessible with Force Sensitivity, including Alter, Control, Dark Side, Light Side, Sense, Guardian Spirit and eligible Force traditions. **This does not automatically grant Jedi Guardian/Consular/Sentinel, Jedi Knight-specific trees, Jedi Instructor, Jedi Healer, Jedi Artisan, etc.** Such earlier character abilities remain separate if the character actually acquired them through another class.
- **Repository read-only comparison:** `packs/classes.db` Jedi Master `_id: 07a64453f95e04f2` records only `talentTreeIds: ['duelist']` (ID `b3c5d90b5036f39b`), with proper five-level talent/secret features. `scripts/mentor/mentor-survey/prestige-survey-profiles.js` also lists **only Duelist**. These records **omit the RAW Force-talent alternatives** and should not be treated as the source-complete Q1 authority. `data/prestige-class-prerequisites.json` lists heroic level 12, trained Use the Force, Force Sensitivity, lightsaber proficiency, one Force Technique and Jedi membership; compare the legal feature checks to the printed requirements when implementing.
- **Force Secrets:** Use the existing Force Disciple source inventory at Section 17: five Core (p. 103), three Clone Wars, five Force Unleashed, two Jedi Academy (**15 named published candidates**). Force Secrets differ from talents; access is at Jedi Master levels 2–5 and individual prerequisites still apply. Specific light-side/dark-side/mentor restrictions cannot be waived by a Q1 expression of interest.
- **Miraj sources:** `data/dialogue/mentors/miraj/Miraj_dialogues.json` (dedicated) and `data/dialogue/mentor-suggestions/mentor-personalities.json` for Jedi Master. She becomes a respectful, collaborative **rank peer**, calm about ambiguity and aware of moral consequences. Existing scripted greetings invent **long friendship and direct prior mentorship** unless actor context establishes them; do not copy those claims into Q1. Do not assume Council appointment, a completed apprentice, a prior joint campaign, or that the player must become anything beyond Jedi Master.

### 20.2 Miraj Q1 introduction — preferred candidate (DRAFT)

> **Miraj:** “The title of Master does not end the need to learn. It deepens our responsibility for what our choices teach. Some find their purpose in guiding others, some in understanding the Force, and some in knowing when not to act. Tell me—which part of Mastery calls you to grow?”
>
> **Q1:** “As a Jedi Master, what aspect of your discipline or responsibility do you wish to deepen?”

**Alternative, shorter:** “You have reached a place of trust, not certainty. A Master still chooses how to serve. Which discipline will you carry further?”

**Voice constraints:** Respect as a peer without claiming old friendship or direct former apprenticeship; contemplative rather than celebratory/competitive; allow combat, knowledge, protection, diplomacy and Force mastery without moralizing away mechanically eligible choices. The player speaks in **first person** in every answer below.

### 20.3 Candidate Q1 library

**All answer IDs are editorial only.** Developer-only mechanical anchors follow the answer after a final table separator. In-play selection does not certify, award, or equip the ability. Specialization eligibility, sourcebook permissions and personal morality remain separate from Q1 intent. These candidates include one answer per *selected mechanical theme*, not an assertion that every named talent in every permitted Force tradition has been individually certified.

#### A. Force Secrets — 15 distinct published candidates (JM-FS01–15)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `JM-FS01` | “I want the Force to lend greater impact to a power when there is no room for a second attempt.” | Devastating Power; Core p. 103; damage and Force/Destiny Point costs. |
| `JM-FS02` | “I want my powers to reach those beyond their ordinary range, while remaining mindful of what I can actually perceive.” | Distant Power; Core p. 103; range and line-of-sight limits. |
| `JM-FS03` | “I want to reach several people with a power that would ordinarily affect only one.” | Multitarget Power; Core p. 103; eligible powers and additional targets. |
| `JM-FS04` | “I want to call upon a power in the moment between danger and consequence, without losing the time to act.” | Quicken Power; Core p. 103; activation and Force/Destiny Point costs. |
| `JM-FS05` | “I want to shape an area of Force power around those I intend to spare.” | Shaped Power; Core p. 103; shape/exclusion and resource constraints. |
| `JM-FS06` | “I want to sustain a power through a crisis while preserving the attention needed to protect others.” | Extend Power; Clone Wars; concentration action and duration limits. |
| `JM-FS07` | “I want two powers to answer one another in sequence, with careful timing rather than greater force.” | Linked Power; Clone Wars; next-round activation, strict modification limits. |
| `JM-FS08` | “I want my protective powers to remain dependable even when pain and exhaustion interfere.” | Unconditional Power; Clone Wars; self-targeted powers and condition penalties. |
| `JM-FS09` | “I want to understand how a power steeped in darkness can overpower a foe, even at the cost such mastery demands.” | Corrupted Power; Force Unleashed; **DARK SIDE RESTRICTED**, DSS equals Wisdom; excludes light-side powers. |
| `JM-FS10` | “I want a damaging Force power to disrupt an opponent’s ability to continue a dangerous assault.” | Debilitating Power; Force Unleashed; condition track and threshold mechanics. |
| `JM-FS11` | “I want a power that covers an area to reach farther when more lives are at stake.” | Enlarged Power; Force Unleashed; area and Force/Destiny Point restrictions. |
| `JM-FS12` | “I want the light side to strengthen my powers when I confront someone consumed by darkness.” | Pure Power; Force Unleashed; **LIGHT SIDE RESTRICTED**, DSS zero. |
| `JM-FS13` | “I want to alter where an area power begins, so its effect reaches the right place without putting me at its center.” | Remote Power; Force Unleashed; point-of-origin limits for cone/line/radius. |
| `JM-FS14` | “I want to learn from a holocron’s preserved wisdom and pass what I discover to those who will need it.” | Holocron Loremaster; Jedi Academy; holocron and borrowed-power limits. |
| `JM-FS15` | “I want to share a Force power with an apprentice who has completed their training, so knowledge does not end with me.” | Mentor; Jedi Academy; **requires successful training to knighthood or equivalent**. No prior apprentice assumed. |

#### B. Duelist talent tree — 11 (JM-DU01–11)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `JM-DU01` | “I want to refine the precision of fighting with a short companion lightsaber, so neither blade is wasted.” | Shoto Master; requires relevant weapons and talents. |
| `JM-DU02` | “I want years of lightsaber practice to make each necessary strike more accurate.” | Greater Weapon Focus (Lightsabers). |
| `JM-DU03` | “I want a blaster bolt turned aside with purpose, not simply driven away from me.” | Improved Redirect; prerequisite redirect capability. |
| `JM-DU04` | “I want a thrown lightsaber to stop a fleeing threat when I cannot close the distance.” | Thrown Lightsaber Mastery; prerequisites. |
| `JM-DU05` | “I want to guide a thrown lightsaber through an encounter with the precision of a blade still in my hand.” | Improved Lightsaber Throw; prerequisites and recovery. |
| `JM-DU06` | “I want a successful block to become an opening for a measured counterstroke.” | Improved Riposte; Block/Riposte chain. |
| `JM-DU07` | “I want the discipline behind my lightsaber blows to make them more effective, not merely more frequent.” | Greater Weapon Specialization (Lightsabers). |
| `JM-DU08` | “I want to remain standing when an overwhelming attack should have ended the fight.” | Force Fortification; rare/conditional defense with Force resource. |
| `JM-DU09` | “I want the choice to end a fight by disabling an enemy, even when that choice carries a lasting cost.” | Severing Strike; severe injury/limb rules and prerequisites. |
| `JM-DU10` | “I want to return to a practiced lightsaber form when I have already drawn on it once.” | Lightsaber Form Savant; form power and replenishment prerequisites. |
| `JM-DU11` | “I want repeated lightsaber attacks to remain controlled rather than let haste erode my accuracy.” | Multiattack Proficiency (lightsabers); prerequisites. |

#### C. Universal Alter Force talent themes — 10 (JM-AL01–10)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `JM-AL01` | “I want the reach of an area power to spare allies who stand too close to danger.” | Disciplined Strike; selective area exclusion. |
| `JM-AL02` | “I want to renew a spent telekinetic power when another obstacle cannot wait.” | Telekinetic Savant; specified powers. |
| `JM-AL03` | “I want a moment of exceptional command over telekinesis to open a second opportunity.” | Telekinetic Power; natural-20 trigger. |
| `JM-AL04` | “I want to create convincing illusions when the wisest answer is to avoid a physical confrontation.” | Illusion; mind-affecting deception and Force Point use. |
| `JM-AL05` | “I want to conceal my appearance behind an illusion when being recognized would endanger others.” | Masquerade; requires Illusion, disguise restrictions. |
| `JM-AL06` | “I want to maintain a trusted mental connection with someone trained to share it.” | Telepathic Link; willing Force-sensitive partner and actual prerequisites. |
| `JM-AL07` | “I want another Force-user and I to lend each other strength while we work together.” | Link; willing, trained ally, range and cooperative checks. |
| `JM-AL08` | “I want to move great objects with enough control to affect an entire threatened area.” | Move Massive Object; move object, Force Point, size/area limits. |
| `JM-AL09` | “I want my presence to discourage an attacker from coming close without having to draw my blade.” | Aversion; mind-affecting difficult terrain and Force Point cost. |
| `JM-AL10` | “I want to recognize even a failure as a possible current of the Living Force that I can draw upon.” | Force Flow; temporary Force Point on natural 1. |

#### D. Universal Control Force talent themes — 9 (JM-CT01–09)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `JM-CT01` | “I want to free myself of debilitating conditions when others still need me to act.” | Equilibrium; exact condition-removal rules. |
| `JM-CT02` | “I want to draw the Force around me as a defense against a blow I cannot otherwise withstand.” | Damage Reduction 10; Force Point and duration. |
| `JM-CT03` | “I want focused concentration to return a spent power when another use truly matters.” | Force Focus; recovery conditions. |
| `JM-CT04` | “I want the Force to support my recovery when I am wounded and must keep helping others.” | Force Recovery; second-wind benefit and prerequisite. |
| `JM-CT05` | “I want my will to hold me steady when an enemy tries to throw me aside.” | Telekinetic Stability; Force Point prevents involuntary movement. |
| `JM-CT06` | “I want to lessen the harm of a hostile Force power even when I cannot turn it back completely.” | Force Suppression; unsuccessful rebuke reduces effect. |
| `JM-CT07` | “I want to protect my mind for a crucial minute when an attacker seeks to influence it.” | Indomitable Will; temporary mind-affecting immunity at Force Point cost. |
| `JM-CT08` | “I want a practiced Force talent to answer once without drawing on my usual reserve of energy.” | Force Harmony; waive Force Point cost for one eligible talent once/encounter. |
| `JM-CT09` | “I want successful protection against an energy attack to give me a moment to answer with the Force.” | Channel Energy; negate energy and Force Point reaction. |

#### E. Universal Sense Force talent themes — 10 (JM-SE01–10)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `JM-SE01` | “I want to notice danger and deception through the Force when ordinary perception fails me.” | Force Perception; defined substitutions for Perception. |
| `JM-SE02` | “I want to trust the Force at a vehicle’s controls when ordinary piloting skill is not enough.” | Force Pilot; defined Pilot substitutions. |
| `JM-SE03` | “I want to navigate and read a ship’s instruments through an awareness beyond conventional training.” | Instinctive Navigation; Force Pilot prerequisite, astrogation/sensors uses. |
| `JM-SE04` | “I want a glimpse of the near future to help me act before the danger unfolds.” | Foresight; initiative reroll and prerequisite. |
| `JM-SE05` | “I want to see traces of what has been and possible futures without mistaking either for certainty.” | Visions; farseeing and prerequisites. |
| `JM-SE06` | “I want an object’s history to help me understand the people who carried it.” | Psychometry; farseeing on held objects, interpretation constraints. |
| `JM-SE07` | “I want a vision of the next attack to help me avoid the danger when it comes.” | Motion of the Future; farseeing use as anticipatory defense. |
| `JM-SE08` | “I want to adjust my senses through the Force when darkness would blind ordinary sight.” | Shift Sense; low-light vision and Force Point. |
| `JM-SE09` | “I want to perceive what concealment hides for a short time, when seeing clearly could save lives.” | Feel the Force; temporary concealment negation and Force Point. |
| `JM-SE10` | “I want to recognize another being’s strength in the Force without assuming I know their choices.” | Gauge Force Potential; opposed check and scope limits. |

#### F. Light Side Force talent tree — 4 MORALITY-GATED candidates (JM-LS01–04)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `JM-LS01` | “I want my stillness in the Force to protect me when restraint is wiser than striking back.” | At Peace; defensive benefit ends on attack; requires DSS 0. |
| `JM-LS02` | “I want to find a clearer opening against an enemy who has surrendered themselves to the dark side.” | Focused Attack; attack reroll against DSS 1+ targets; DSS 0. |
| `JM-LS03` | “I want a power of healing or protection to return when I have already called upon it.” | Surge of Light; light-side power recovery; DSS 0. |
| `JM-LS04` | “I want a moment of extraordinary precision against darkness to let a light-side power follow.” | Attuned; natural-20 vs DSS 1+ target, Focused Attack prereq, DSS 0. |

#### G. Dark Side Force talent tree — 5 RESTRICTED and morally fraught candidates (JM-DS01–05)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `JM-DS01` | “I want to know the power that anger can lend an attack, even if using it pulls me farther from the Jedi Code.” | Power of the Dark Side; raises/depends on DSS; requires DSS 1+. |
| `JM-DS02` | “I want the presence of the dark side around me to stiffen the resolve of those who follow.” | Dark Presence; allied defenses/conditions and prereq; DSS 1+. |
| `JM-DS03` | “I want to bring a spent dark-side power back into reach when temptation and danger come together.” | Dark Side Savant; recovers dark-side power and DSS 1+. |
| `JM-DS04` | “I want to withstand suffering by drawing on darkness, knowing what that choice makes of me.” | Dark Preservation; restricted defensive mechanic, DSS 1+. |
| `JM-DS05` | “I want to understand how rage can turn one devastating Force attack into further suffering.” | Wrath of the Dark Side; natural-20 attack-power interaction and DSS 1+. |

**Editorial ethical warning:** These reflect technically possible RAW class-independent Force talents under stated requirements, *not* an endorsement by Miraj or a default Jedi Master path. Their inclusion in a source-complete bank does not mean they belong in an ordinary player slate. Exact Jedi Code and campaign affiliation consequences remain GM authority. No Q1 choice changes alignment or score.

#### H. Guardian Spirit Force talents — 5 conditional candidates (JM-GS01–05)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `JM-GS01` | “I want to receive guidance from a guardian spirit when my own judgment reaches its limits.” | Guardian Spirit; actual spirit connection acquired through talent/story. |
| `JM-GS02` | “I want the spirit’s encouragement to help me endure when the burden becomes heavy.” | Vital Encouragement; Guardian Spirit prereq; temporary bonus HP. |
| `JM-GS03` | “I want to learn from a guardian spirit’s advice when a skill I rely upon fails me.” | Crucial Advice; skill reroll rules. |
| `JM-GS04` | “I want to learn how to bring my guardian spirit into view when its presence could steady me.” | Manifest Guardian Spirit; spirit talent, Force Point, appearance rules. |
| `JM-GS05` | “I want a guardian spirit’s presence to unsettle enemies without drawing their attention to my companions.” | Distracting Apparition; manifested spirit and penalties; prereq. |

#### I. Eligible Force traditions — 3 restricted narrative examples (JM-TR01–03)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `JM-TR01` | “I want to understand the Jensaarai’s way of combining the Force and armor, if I have truly earned instruction in it.” | Jensaarai Defender: Attune Armor; tradition membership/training and campaign permission. |
| `JM-TR02` | “I want to learn the methods of a Force tradition that honors its bond with creatures, if I am welcome to its teachings.” | Dathomiri Witch: Charm Beast; actual tradition/membership prerequisite. |
| `JM-TR03` | “I want to bring the teachings of a tradition I genuinely know into my service as a Jedi Master.” | Conditional tradition-specific development, no global talent entitlement or invented cultural status. |

#### J. Defining class features — 2 (JM-CF01–02)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `JM-CF01` | “I want my courage to remain steady where fear would decide the choices of others.” | Fearless; first-level immunity to fear effects. Distinguish from Force Disciple Indomitable (mind-affecting immunity). |
| `JM-CF02` | “I want meditation to prepare me for one moment of absolute clarity, whether it calls for a strike or the Force.” | Serenity; printed action/time cost, natural-20 first attack/Use the Force timing, defense tradeoff. |

#### K. Identity, fulfillment and undecided — 3 (JM-ID01–03)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `JM-ID01` | “I want to guide others without pretending that the title of Master makes my judgment infallible.” | Teaching, humility and peer responsibility; does NOT assert apprentice, Council office, or prior completed training. |
| `JM-ID02` | “I chose the path of a Jedi Master. I want to spend my life serving within it, not seeking another title.” | Explicit prestige-as-capstone, no downstream prestige expectation. |
| `JM-ID03` | “I know Mastery carries more than one responsibility. I want to understand those paths before deciding where to devote myself.” | Neutral, no inferred specialization. |

### 20.4 Counts and editorial limits

| Category | Draft choices |
|---|---:|
| Force Secrets | 15 |
| Duelist | 11 |
| Alter | 10 |
| Control | 9 |
| Sense | 10 |
| Light Side (DSS-gated) | 4 |
| Dark Side (DSS-gated, ethical/campaign sensitivity) | 5 |
| Guardian Spirit | 5 |
| Tradition examples (conditional) | 3 |
| Defining class features | 2 |
| Identity / capstone / neutral | 3 |
| **TOTAL** | **77** |

**Not a one-to-one exhaustive talent catalog:** This first draft covers 11 Duelist talents and 15 Force Secrets individually; the universal Force trees are represented by selected meaningful tactics, as are selected Guardian Spirit and tradition possibilities. Other Force talents and tradition trees may be source-eligible and remain candidates for future additions. *Do not* treat this answer-bank scope as a closed eligibility list. Every answer is first-person and character-directed, not a class feature purchase. The entire player-facing slate and selection policy remain **DEFERRED** by owner instruction.

### 20.5 Jedi Master issue ledger — deferred implementation / verification

1. **JM-IMPL-01: Printed Force talent access omitted by registry.** Core pp. 220 and JATM grant Duelist or any eligible Force talent tree; repo class and prestige profile list only Duelist. Reconcile against canonical V2 authorities, do not patch with shim or block valid Force choices. Test Alter, Control, Sense, Light, Dark, Spirit and eligible tradition cases; exclude arbitrary class talents.
2. **JM-IMPL-02: Source and prerequisite certification.** Individually verify each selected talent/secret from the final printed sources, versioned ID and applicable feat, skill, Force power, ability score, other-talent, ethical and training prerequisites. Named repo entries plus an editorial bank are not full rules certification.
3. **JM-IMPL-03: Force Secret timing.** Zero automatic Secrets at Jedi Master 1; obtain one at each class level 2,3,4,5, distinct from three talent picks at 1,3,5. Testing must ensure no accidental early secret on entering the class.
4. **JM-IMPL-04: Class-defining features.** Fearless is fear immunity, **not** general mental immunity. Serenity costs full-round entry, removes Dex bonus to Reflex while held, swift-action exit, first attack/UtF check in subsequent round treated as natural 20. Check no passive +20, no automatic 20 every turn, and no incorrect stacking with critical mechanics.
5. **JM-IMPL-05: Jedi standing and era.** Member of Jedi tradition is printed entry requirement; a Council appointment is **not**. Narrative training of a Padawan is typical, not the universal entry prerequisite. Jedi Master title/recognition conventions vary by era and GM. Do not invent either fact via Q1.
6. **JM-IMPL-06: Miraj relationship.** Shift voice to respected equal/collaborator, not former teacher/old friend unless actor-specific evidence; do not claim personal observation of trials. Avoid malformed `fa-regular` from dedicated greeting JSON, previously logged as MENTOR-010.
7. **JM-IMPL-07: Moral path gates.** Light Side DSS 0, Dark Side DSS positive; Pure Power and Corrupted Power specific DSS constraints; Jedi Code and GM narrative consequences remain distinct. A Q1 interest never grants talents, resets DSS, or changes Jedi affiliation.
8. **JM-IMPL-08: Mentor / holocron facts.** The Mentor Secret requires a successfully trained apprentice; Holocron Loremaster has specified source/research conditions. Do not assume existing apprentice, holocron, guardian spirit, a ritual completed or prior Council experience.
9. **JM-IMPL-09: Jedi Knight does not equal Jedi Master talent access.** Although many characters reach Jedi Master with levels in Jedi Knight, that history is not a universal entitlement to select Jedi Knight-specific talent trees through a Jedi Master class talent. Owned talents remain valid, but new selection authority comes from printed rules.
10. **JM-IMPL-10: General versus special identity.** Avoid reducing Jedi Master to 'Duelist + combat' merely because repo tracks Duelist. Preserve Force mastery, restraint, scholarship, perception, healing/protection via available Force powers/talents, teaching as optional social vocation, and class's fully achieved endpoint.
11. **JM-IMPL-11: Distinct role from Force Disciple.** Both five-level apex classes earn Force Secrets at 2–5 and broad Force-talent options, but Jedi Master is Jedi-tradition-specific, has Fearless + Serenity and Duelist talent access; Force Disciple has Indomitable + Prophet and Force Adept talent access. Don't conflate.
12. **JM-IMPL-12: Selection policy still deferred.** Do not decide visible answer count, optimization/ranking/rotation, per-tree quotas, weight adjustments, or broad UI. This 77-choice bank is an editorial pool only. No scoring/ontology tags established here.

**Change log (v0.17, local):** Checked Core PDF pp. 220–221 (printed pp. 219–220) against Core TXT, Jedi Academy's explicit any-Force-tree clarification, all 15 previously source-audited Force Secrets, read-only GitHub class/prerequisite/tree/profile records and Miraj's prior dedicated voice evidence. Added **77** first-person draft answers, preferred Miraj Q1 dialogue, canon-vs-repository discrepancy ledger, and 12 new Jedi Master implementation checks. All prior local records retained. **No repo edits, commits, PRs, Q2 work, or Q1 answer-display decision.**


---

## 21. Core Rulebook / Prestige Class 10 — Officer Q1 (Admiral Korr; local v0.18)

**Status: DRAFT only.** This is a source-grounded editorial Q1 answer bank, not a certified, weighted or on-screen answer slate. Preserve every earlier class's content, including v0.17 Jedi Master, without altering it. OWNER DEFERRED Q1 answer selection/presentation; no code/commit/PR authorized.

### 21.1 Primary-source and repo class audit

- **Core Rulebook**, printed pp. 220–222: entry requires heroic level 7, trained Knowledge (tactics), an already-owned talent from Leadership or Commando, and membership in a military or paramilitary organization. **Galaxy at War** adds Veteran as an entry-qualifying talent tree; distinguish original Core rule from later expansion. No source-unsupported existing rank, fleet, unit or command history is inferred.
- Core prestige talents: **Commando, Leadership, Military Tactics**; *Starships of the Galaxy* adds **Naval Officer**; *Legacy Era Campaign Guide* adds **Fugitive Commander**; *Rebellion Era Campaign Guide* adds **Rebel Recruiter**. Repo class ID `officer` lists all **6** trees. Expanded talent definitions from other books apply to the respective tree if access and individual talent prerequisites are met.
- Repo `packs/classes.db` (read only) lists full BAB, d8 hit die, +2 Reflex/+4 Will class defense, talents at Officer levels **1,3,5,7,9**, **Command Cover** at level 2 and **Share Talent** at **2,4,6,8,10**. **Command Cover** is +1 cover bonus to Reflex per adjacent ally, capped at half Officer class level (maximum +5). Not a generic or non-adjacent formation bonus. 
- Printed **Share Talent** is not a generic ability to share any talent: an even-level Officer selects a **previously possessed** talent specifically from Influence, Inspiration, Commando, or Military Tactics; once/day as a standard action, allied recipients must be within 10 squares and see/hear the Officer, encounter duration and half Officer class level recipient cap apply. Each subsequent even-level share choice is different and irrevocable. Officer's own **odd-level talent selection trees** are a different list; Influence and Inspiration do **not** automatically become Officer selectable talent trees by appearing in Share Talent rules.
- Repo talent-tree inventory: **Commando 14; Leadership 11; Military Tactics 16; Naval Officer 5; Fugitive Commander 6; Rebel Recruiter 5 = 57 indexed talent entries**. Cross-matched all names to the uploaded source TXT text; the scanned Core PDF was visually checked for Officer printed pp. 221–222 and SotG p. 18 verified for Naval Officer. Text captures OCR artifacts and are search aids, not a replacement for any contested printed wording.
- **Identity collision**: `Stay in the Fight` occurs in two different printed trees: Legacy Era **Fugitive Commander** removes an ally's fear/mind-affecting effect and grants bonus hit points; Rebellion Era **Rebel Recruiter** lets an enemy converted with `Recruit Enemy` use a second wind. These require separate source-keyed talent identities, not one name-based record.
- **Other homonyms:** `Out of Harm's Way` appears in Unknown Regions **Commando** and Legacy Era **Protection** with different rules; only the **Commando** version is covered by Officer's printed access. `Commanding Presence` appears in both the *Galaxy at War* **Leadership** expansion and *Force Unleashed* with different descriptions; the answer below is grounded in the actual **Leadership** version. `Turn the Tide` is both a sub-option of the Galaxy at War Commanding Presence talent and a separately named Unknown Regions Military Tactics talent; do not conflate them.
- One printed prerequisite remains **unresolved**: *Unknown Regions* Military Tactics `Turn the Tide` references `Command Decision` alongside `Commander's Prerogative` and trained Initiative. `Command Decision` was not located as a separately defined ability in the supplied textual source search. `OF-MT16` is provisionally quarantined for prerequisite/source-authority confirmation, not a normally selectable talent recommendation.
- Other source-conditional gates matter: Naval Officer fleet/ship requirements; Charisma/Intelligence and Born Leader prerequisites; Fugitive Commander tier/turn timing; Rebel Recruiter targets **living creatures**, has damage and Persuasion gates, is mind-affecting, and excludes some unpersuadable opponents. Characters may have an organizational affiliation without a Rebel identity.

### 21.2 Admiral Korr voice authority and proposed Q1 introduction (DRAFT)

Repo `data/dialogue/mentors/korr/korr_dialogue.json`: Admiral Korr, decorated fleet commander; calm, sober, strategic, authoritative; values duty, responsibility, loyalty and disciplined judgment. Philosophy: “Command is responsibility before authority.” Avoid claiming a character has already commanded a unit, won a battle, personally served with Korr, holds naval rank, or lost specific soldiers. Distinguish command aspirations from granted class features.

**Preferred proposed Korr intro:**

> “The qualifications are earned. The responsibility is not yet discharged. An officer's judgment determines where people stand, what risks they take, and which orders they trust. There is more than one way to command. Which discipline will you make your own?”

**Q1:** “As an Officer, what kind of leadership or operational skill do you want to develop?”

**Alternate A — shorter:** “You have earned the right to lead. That is not the same as earning trust. Decisions, protection, strategy, and morale all have their place. Which will you strengthen?”

**Alternate B — reflective:** “A rank can be granted. Judgment must be practiced. The troops who follow an order bear its consequences, whether the officer sees them or not. Which part of command deserves your attention now?”

### 21.3 Complete first-pass talent-mapped Q1 library

Each answer is **player-first-person**, an educational aspiration only, not a talent grant, fulfilled prerequisite or biography. The table's mechanical anchor is **developer-only**. Prefix `OF-` avoids collisions across classes and same-name talents.

#### A. Commando — 14 answers (OF-CO01–14)

| ID | First-person player answer | Developer-only canonical anchor |
|---|---|---|
| `OF-CO01` | “I want my blaster fire to make the people fighting near me harder to hit.” | **Cover Fire**; pistol/rifle ranged attack grants adjacent-area allies Reflex bonus, Battle Analysis prerequisite. |
| `OF-CO02` | “I want to read a battlefield quickly enough to recognize which allies and enemies are already badly hurt.” | **Battle Analysis**; Knowledge (tactics) check identifies half-HP combatants in LOS. |
| `OF-CO03` | “I want to recover from punishment at the instant I need it, without waiting to catch my breath.” | **Hard Target**; second wind as reaction; published *Threats of the Galaxy*; Tough as Nails prerequisite. |
| `OF-CO04` | “I want properly placed explosives to bring down a dangerous position when ordinary fire won't do the job.” | **Demolitionist**; placed explosives additional damage dice, Mechanics. |
| `OF-CO05` | “I want the endurance to draw on a second wind more than once during a hard operation.” | **Tough as Nails**; additional second wind per day, Core Commando. |
| `OF-CO06` | “I want the discipline to shake off the setbacks that leave another officer too battered to act.” | **Indomitable**; condition-track improvement; does not remove persistent conditions automatically. |
| `OF-CO07` | “I want an ally assigned to my protection to become a harder target when we hold our position together.” | **Dedicated Protector**; *Galaxy of Intrigue* Commando; ally-adjacency/encounter rules. |
| `OF-CO08` | “I want my suppressing fire to disrupt an enemy's next attack rather than merely keep their head down.” | **Keep Them at Bay**; *Clone Wars* Commando suppress using aid another; -5 rather than -2. |
| `OF-CO09` | “I want to draw hostile attention toward me when firing at the people nearby would be more dangerous.” | **Draw Fire**; Persuasion/Will-based, conditions and range. |
| `OF-CO10` | “I want to put myself between an ally and incoming attacks, even if it means taking their wounds.” | **Harm's Way**; swift action once/round adjacent ally, trained Initiative prerequisite. |
| `OF-CO11` | “I want to make good cover protect me like a fortified position when the shooting starts.” | **Defensive Position**; *Galaxy at War*, requires Battle Analysis and two swift actions; temporary improved cover. |
| `OF-CO12` | “I want helping the ally under my protection to make their next attack hit harder.” | **Coordinated Effort**; *Galaxy of Intrigue*, aid another + damage, Dedicated Protector prerequisite. |
| `OF-CO13` | “I want more than one way to respond when an ally I've sworn to protect is suddenly threatened.” | **Dedicated Guardian**; *Galaxy of Intrigue*, several defined once/encounter defensive interventions, Dedicated Protector-linked. |
| `OF-CO14` | “I want to switch places with someone I'm protecting so they're moved out of the immediate line of danger.” | **Out of Harm's Way (Commando)**; *Unknown Regions*, reactive positioning during Harm's Way, trained Initiative prerequisite. NOT Protection talent with same name. |

#### B. Leadership — 11 answers (OF-LE01–11)

| ID | First-person player answer | Developer-only canonical anchor |
|---|---|---|
| `OF-LE01` | “I want soldiers who can see me to keep their nerve when fear threatens the whole unit.” | **Fearless Leader**; grants fear-related Will bonus, presence/line-of-sight restriction. |
| `OF-LE02` | “I want to give up part of my own chance to act so a trusted ally can act when it matters more.” | **Trust**; transfers action economy; standard action. |
| `OF-LE03` | “I want an ally to stay ready for danger even when an attack should have caught them off guard.” | **Unwavering Ally**; *Rebellion Era* expanded Leadership, protection against flat-footed and denied Dex. |
| `OF-LE04` | “I want the confidence my presence gives the unit to last even when they lose sight of me.” | **Distant Command**; sustains Born Leader effect after LOS broken; prereq. |
| `OF-LE05` | “I want to rally wounded people when the battle's losses begin to break their confidence.” | **Rally**; once/encounter morale help to wounded allies. |
| `OF-LE06` | “I want the small acts of assistance my people give each other to become more effective.” | **Coordinate**; improves aid another bonus. |
| `OF-LE07` | “I want the unit to answer an attack against one of us with a coordinated counterstrike.” | **Reactionary Attack**; *KOTOR*, immediate attack by ally as reaction; Born Leader and Perception prerequisites. |
| `OF-LE08` | “I want my leadership to improve the aim of the people fighting where they can see me.” | **Born Leader**; once/encounter attack insight bonus, line of sight. |
| `OF-LE09` | “I want a decisive strike of my own to become a signal for my people to defend, advance, or press an attack together.” | **Commanding Presence (Leadership)**; *Galaxy at War*, Hold the Line!/Lead the Assault/Turn the Tide options; not homonymous *Force Unleashed* record. |
| `OF-LE10` | “I want my tactical insight to help an ally get more from a crucial Force Point spent on an attack.” | **Tactical Savvy**; *Galaxy at War*, Intelligence modifier to ally Force Point roll on attack; Born Leader prereq. |
| `OF-LE11` | “I want my directions to reinforce the orders of other leaders instead of competing with them.” | **Coordinated Leadership**; *Unknown Regions*, leadership bonus stacking modification; Born Leader/Coordinate prerequisites. |

#### C. Military Tactics — 16 answers (OF-MT01–16)

| ID | First-person player answer | Developer-only canonical anchor |
|---|---|---|
| `OF-MT01` | “I want to brace every defense at once when one short moment could decide whether I survive.” | **Uncanny Defense**; *Clone Wars*, once/day temporary defensive bonus based on Officer level. |
| `OF-MT02` | “I want the unit to turn whatever terrain we have into protection the enemy struggles to overcome.” | **Field Tactics**; Core, improves *existing* cover; Deployment Tactics prerequisite. |
| `OF-MT03` | “I want to concentrate my defense against the one danger I can least afford to ignore, even at serious cost elsewhere.” | **Shift Defense III**; +5 to one, -5 to other two, chained prereqs. |
| `OF-MT04` | “I want to position the unit so we exploit flanked enemies and avoid unnecessary exposure while moving.” | **Deployment Tactics**; Core, specific tactical bonus alternatives. |
| `OF-MT05` | “I want every hit on our designated target to make the next hit easier for the squad.” | **Exploit Weakness**; *Clone Wars*, cumulative target Reflex penalty after allies' damage, Assault Tactics prereq. |
| `OF-MT06` | “I want to unravel an enemy commander's advantages before their troops can put them to use.” | **Outmaneuver**; Core, suppresses listed tactical bonuses, Knowledge (tactics), opposition rules, prereq chain. |
| `OF-MT07` | “I want to issue battlefield directions fast enough that I still have time to act on them.” | **Tactical Edge**; Core, swift instead of move for specified tactics. |
| `OF-MT08` | “I want to make a larger defensive trade when I can predict which kind of attack is coming.” | **Shift Defense II**; shifts bonus and penalty between defenses, Shift Defense I prerequisite. |
| `OF-MT09` | “I want to learn the basic discipline of giving up a little protection in one area to strengthen another.” | **Shift Defense I**; first tier of defensive tradeoffs. |
| `OF-MT10` | “I want my people to find one last reserve of resilience before an assault breaks through.” | **Grand Leader**; *Clone Wars*, once/encounter bonus HP to eligible allies, LOS and range. |
| `OF-MT11` | “I want to put an important order into motion before my own allies have begun their first moves.” | **Commander's Prerogative**; *Unknown Regions*, first-round ally initiative ordering and must use share talent or specified tree ability; trained Initiative prerequisite. |
| `OF-MT12` | “I want to name one high-priority threat and make the whole unit's attacks against it count.” | **Assault Tactics**; Core, extra damage with group attacks if Knowledge (tactics) check succeeds, mind-affecting. |
| `OF-MT13` | “I want an ally and me to be able to divide the harm from a single attack instead of letting one of us bear it alone.” | **One for the Team**; Core, adjacent damage-sharing reaction, Deployment Tactics prerequisite. |
| `OF-MT14` | “I want our irregular tactics to make hostile strategists misjudge what our people will do next.” | **Irregular Tactics**; *Unknown Regions*, counter-tactics Knowledge (tactics) check after Share Talent, requires that class feature. |
| `OF-MT15` | “I want my unit to learn a tactic from watching me perform it before I pass that ability on to them.” | **Lead by Example (Military Tactics)**; *Unknown Regions*, requires Share Talent, not *Force Unleashed* homonym. |
| `OF-MT16` | “I want to disrupt the timing of an enemy formation so its next moves come too late.” | **Turn the Tide (Military Tactics)**; **PROVISIONAL/QUARANTINED**, *Unknown Regions* has unresolved `Command Decision` prerequisite, plus Commander's Prerogative and trained Initiative. Not the same as the Commanding Presence sub-option. |

#### D. Naval Officer — 5 answers (OF-NO01–05)

| ID | First-person player answer | Developer-only canonical anchor |
|---|---|---|
| `OF-NO01` | “I want the batteries of a ship to focus their fire so that a marked target cannot withstand the barrage.” | **Combined Fire**; *Starships of the Galaxy* p. 18, weapon batteries / target and tactical fire restrictions. |
| `OF-NO02` | “I want a capital ship under my command to fight with the coordination and protection of an experienced flagship.” | **Legendary Commander**; commander of capital ship; Charisma 13, Intelligence 13, Born Leader prerequisite. No owned ship implied. |
| `OF-NO03` | “I want to shift several ships into position together before the enemy can react to the maneuver.” | **Fleet Deployment**; full-round action, LOS vehicle movement, Charisma 13 prerequisite. |
| `OF-NO04` | “I want gunners across allied ships to concentrate on a single enemy vessel at the decisive moment.” | **Fleet Tactics**; tactical Knowledge check, allied gunners, specific LOS and Charisma 13/Fleet Deployment prerequisites. |
| `OF-NO05` | “I want to recognize an enemy fleet trap and give a pilot the chance to move before it closes.” | **It's a Trap!**; once/encounter reaction, immediate pilot move action, vehicle LOS. |

#### E. Fugitive Commander — 6 answers (OF-FC01–06)

| ID | First-person player answer | Developer-only canonical anchor |
|---|---|---|
| `OF-FC01` | “I want our scouts to compare what they notice, so one sharp observation can protect the group.” | **Group Perception**; *Legacy Era*, collective check effect, within 6 squares. |
| `OF-FC02` | “I want to pull several allies out of an exposed position before retreat becomes a rout.” | **Hasty Withdrawal**; *Legacy Era*, swift action group withdrawal, number/range/LOS constraints. |
| `OF-FC03` | “I want a withdrawing ally to disappear into cover before the pursuers can see where they went.” | **Stealthy Withdrawal**; *Legacy Era*, follows Hasty Withdrawal and cover/concealment check. |
| `OF-FC04` | “I want to drive fear out of a shaken ally and give them the strength to stay in the fight.” | **Stay in the Fight (Fugitive Commander)**; *Legacy Era*, removes fear/mind-affecting and grants bonus HP; Stalwart Subordinates prerequisite. **NOT** Rebel Recruiter same-name talent. |
| `OF-FC05` | “I want hostile pressure and psychological tricks to have a harder time breaking my subordinates' resolve.” | **Stalwart Subordinates**; *Legacy Era*, skill-vs-Will rolls twice/lowest against ally; LOS/range. |
| `OF-FC06` | “I want an ally to recover a botched attempt at deception or stealth while we still have a way through.” | **Disciplined Trickery**; *Legacy Era*, reroll Deception/Stealth, keep second result even if worse. |

#### F. Rebel Recruiter — 5 answers (OF-RR01–05)

| ID | First-person player answer | Developer-only canonical anchor |
|---|---|---|
| `OF-RR01` | “I want my people to find the resolve to endure when someone we've won over falls defending our side.” | **Noble Sacrifice**; *Rebellion Era*, converted target later dropped by an enemy; no bonus if self/ally causes reduction, Recruit Enemy prereq. |
| `OF-RR02` | “I want converting an opponent into an ally to strengthen the morale of everyone fighting alongside us.” | **Bolstered Numbers**; *Rebellion Era*, morale attack bonus after Recruit Enemy succeeds. |
| `OF-RR03` | “I want a moment when I could kill an enemy to become a chance to persuade them to fight with us instead.” | **Recruit Enemy**; *Rebellion Era*, once/encounter potentially lethal damage to living creature, Persuasion vs Will, mind-affecting, immunities and half-damage/condition effects. |
| `OF-RR04` | “I want my unit to be able to offer an opponent that chance to switch sides when an ally lands the decisive blow.” | **Team Recruiting**; *Rebellion Era*, applies Recruit Enemy to ally's qualifying lethal attack. |
| `OF-RR05` | “I want a newly converted ally to catch a second wind and contribute before the fight is over.” | **Stay in the Fight (Rebel Recruiter)**; *Rebellion Era*, recruited target uses second wind, Recruit Enemy prerequisite; **NOT** Fugitive Commander same-name talent. |

### 21.4 Class-feature ambitions — 2 (OF-CF01–02)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `OF-CF01` | “I want to keep my command position secure among my people, using their nearby formation as protection when enemies aim at me.” | **Command Cover**, Officer level 2 onward, +1 cover Reflex for each adjacent ally, max floor(Officer class level/2), maximum +5. Not obtained at entry level 1. |
| `OF-CF02` | “I want skills I've already mastered to become practical techniques my allies can use when a crisis arrives.” | **Share Talent**, first at Officer level 2, then even levels; only **already-owned** Influence, Inspiration, Commando, Military Tactics; one use per day/encounter and recipient limitations; no broad arbitrary sharing. |

### 21.5 Identity, terminal prestige, and neutral — 3 (OF-ID01–03)

| ID | First-person player answer | Developer-only anchor |
|---|---|---|
| `OF-ID01` | “I want my decisions to bring my people home whenever possible, not simply achieve an objective at any cost.” | Character-defining responsibility, not a separate printed talent. Avoid assuming existing subordinate losses or command. |
| `OF-ID02` | “I worked toward the responsibilities of an Officer. I want to spend my career becoming worthy of them without chasing higher ranks.” | **Prestige-as-capstone**; no requirement to become admiral/general or another class. |
| `OF-ID03` | “I know there are many ways to lead. I want to understand what command demands before I choose a specialty.” | Neutral/undecided, no mechanical bias. |

### 21.6 Counts and source-aware editorial status

| Category | Draft answers |
|---|---:|
| Commando | 14 |
| Leadership | 11 |
| Military Tactics | 16 (one quarantined: OF-MT16) |
| Naval Officer | 5 |
| Fugitive Commander | 6 |
| Rebel Recruiter | 5 |
| Class features | 2 |
| Identity / capstone / neutral | 3 |
| **TOTAL** | **62** |

**Pool status:** 62 authored candidate entries; 61 non-quarantined for future editorial consideration, but **zero** certified as legal selections for a given character without prerequisite/state checks. 57 talent-mapped entries span the 57 indexed names, not 57 automatically unlocked talents. Avoid asserting the user approved any of these 62 options. **Answer selection policy/presentation remains DEFERRED**; no number of visible choices, ordering, personalization, rotation or scoring determined in this conversation.

### 21.7 Officer issue ledger — deferred implementation and full certification

1. **OF-IMPL-01 — Core + expansion prerequisite authority.** Core Officer entry (heroic level 7, trained Knowledge (tactics), Leadership or Commando talent, qualifying organization). *Galaxy at War* adds Veteran as entry-qualifying. Confirm canonical typed skill/feat/talent/affiliation resolver for both, not just text descriptor.
2. **OF-IMPL-02 — Six-tree entitlement.** Check live V2 class schema against three Core trees plus Naval Officer (SotG), Fugitive Commander (Legacy Era), Rebel Recruiter (Rebellion Era); validate all applicable per-talent prerequisites. Do not treat supplement locale/era as an automatic background the character possesses.
3. **OF-IMPL-03 — Share Talent versus selectable talents.** Share Talent even levels specifically accepts previously acquired Influence/Inspiration/Commando/Military Tactics, whereas odd-level talents are from a different six-tree class-access list. Ensure implementation keeps these authorities separate and requires proven existing talent ownership.
4. **OF-IMPL-04 — Correct feature cadence.** Talent odd levels, Share Talent 2/4/6/8/10, Command Cover from level 2; no Share Talent or cover at Officer entry level 1.
5. **OF-IMPL-05 — Command Cover scaling.** +1 per adjacent ally max floor(officer class level / 2), maximum +5, not all allies within range or general defense. Compare repo scaling model (`basis=officerClassLevel`) to printed table.
6. **OF-IMPL-06 — Same-name `Stay in the Fight` collision.** Fugitive Commander (fear/mind-affecting removal + bonus HP) and Rebel Recruiter (converted target second wind) differ. Use exact source/tree ID to resolve, never display or map via bare talent name.
7. **OF-IMPL-07 — Other collisions.** `Out of Harm's Way` Commando versus Protection; `Commanding Presence` Galaxy at War Leadership versus *Force Unleashed* appearance; `Turn the Tide` Military Tactics versus Commanding Presence subaction; `Lead by Example` *Unknown Regions* Officer versus *Force Unleashed* alternate talent.
8. **OF-IMPL-08 — Turn the Tide unresolved prerequisite.** *Unknown Regions* lists `Command Decision` but no direct definition was located in the supplied TXT. OF-MT16 **quarantined** until source page/errata/ID/legal availability confirmed; do not silently waive a missing prerequisite.
9. **OF-IMPL-09 — Fleet operation limits.** Naval Officer talents operate under vehicle/weapon battery/LOS/capital-ship conditions, Charisma/Intelligence/Born Leader prerequisites. Do not imply every Officer is a pilot, ship owner, or naval officer.
10. **OF-IMPL-10 — Rebel Recruiter severe gate.** Recruit Enemy is a once/encounter potentially lethal attack against a living creature with a mind-affecting Persuasion vs Will gate and immunities, not generic negotiation or blanket mind control; GM determines permanence. Distinguish from a nonlethal choice to surrender before combat.
11. **OF-IMPL-11 — Korr history and rank.** Do not invent that character already commanded soldiers, completed an operation, lost personnel, personally served alongside Korr, holds Admiral/General rank, or has proven success; his authored later level greetings sometimes assert these without actor evidence. His voice is sober, responsible, authoritative; use existing dedicated JSON, not generic military bark.
12. **OF-IMPL-12 — Class vs thematic archetype.** Officer need not be logistics specialist, tactical commander, fleet admiral, rebel, or high commander; some talent profiles support several kinds of command. No downstream prestige destination forced; capstone answer preserved.
13. **OF-IMPL-13 — Canonical source verification threshold.** Searchable TXT and targeted visual primary page audit support editorial wording, but not a line-by-line production talent certification for all 57 indexed names. Before implementation require printed page, rules text, prerequisites, identity, schema mapping, legal access and test cases; no shims, name-only matches or assumptions based solely on index/registry.
14. **OF-IMPL-14 — Deferred selection.** No selection policy, screen count, ranking, tree quota, adaptive rotation, scoring or ontology weight is owner-approved. Q1 authoring only; don't expand to Q2 or commit code.

**Change log (v0.18, local):** Added Officer's six-tree / 57-talent source-aware editorial audit, **62** first-person draft answers, three Korr introduction candidates, class-feature and even-level Share Talent distinction, same-name source identity collisions, the Turn the Tide prereq quarantine and 14-item issue ledger. Sourcebooks directly inspected via attached PDFs/TXT; GitHub class/tree/mentor/profiles read only. **Everything from v0.17 preserved. No repository changes, Q2 work or answer-display decision.**


## 22. Core Rulebook prestige class #11 — Sith Apprentice Q1 (Darth Malbada; local v0.19)
**Status:** DRAFT, not owner-approved. Q1 only. **Primary rules:** *Core Rulebook* printed pp. 222–224 (physical PDF images 222–224); *Knights of the Old Republic Campaign Guide* Sith tree expansion; *Jedi Academy Training Manual* Sith Alchemy tree pp. 21–22; *Legacy Era Campaign Guide* Sith Commander tree pp. 42–43; supplemental universal Force Technique material. PDFs rendered and inspected for class rules and key supplement tree sections; searchable provided TXT used for exact talent names and descriptions. Registry below is repository metadata, not blanket mechanical certification.

**Core RAW:** Sith Apprentice requires heroic level **7**, Use the Force trained, Force Sensitivity, Weapon Proficiency (lightsabers), Sith-tradition membership, and **Dark Side Score equal to Wisdom score**, with loss of access to *all* Sith Apprentice class features if it falls below Wisdom. The repo `data/prestige-class-prerequisites.json` instead has explicit project house rule **Dark Side Score ≥ 1**; these are two different authorities, unresolved until owner selects a production policy. The printed class grants +2 Fortitude/Reflex/Will, BAB +1 per level, 1d10 HP/level + Constitution, a talent at odd class levels **1/3/5/7/9**, and a Force Technique at even levels **2/4/6/8/10**. It does **not** grant Force Techniques at entry level 1. Existing Jedi class features persist for a fallen Jedi except light-side Force powers become unusable under the printed rule.

**Talent access:** The Core class lists Armor Specialist, Duelist, Lightsaber Combat, and Sith. *Jedi Academy Training Manual* adds **Sith Alchemy** (four talents) specifically to Sith Apprentice; *Legacy Era Campaign Guide* adds **Sith Commander** (four talents). The repository `packs/classes.db` correctly indexes **six** trees: `armor_specialist`, `duelist`, `lightsaber_combat`, `sith`, `sith_alchemy`, `sith_commander`. Indexed tree totals: **6 + 11 + 11 + 12 + 4 + 4 = 48**, but the Sith tree includes **Stolen Form**, an entry seen only as an NPC talent name in the supplied corpus and not located as a defined player talent; it is **quarantined**, not source-certified. The two talents titled **Sith Alchemy** are *different printed talents*: *Knights of the Old Republic* version is in Sith tree (alchemical talisman/weapon; Dark Side Adept + Master prerequisites); *Jedi Academy Training Manual* version is in Sith Alchemy tree (amulet/armor/talisman/etc.). Never merge by name.



### 22.1 Darth Malbada — Mentor introduction (DRAFT)
Source: `data/dialogue/mentors/darth_malbada/darth_malbada_dialogue.json`: sadistic, derisive, demanding, hungry for dominance, approving genuine ambition through a cruel lens. Avoid fabricating direct apprenticeship, personalized torture, a pre-existing bond, or an actual pledge to Malbada. She can be theatrical but should not impose that she is literally the player's Sith Master.

**Preferred Q1 line:** “So. You have earned a place among the Sith. A title is nothing without the strength to keep it. Will you sharpen your blade, bend minds, make servants of your enemies—or learn to turn your own pain into power? Choose. I dislike hesitation.”

**Question:** “As a Sith Apprentice, what form of power or discipline do you intend to master?”

**Shorter alternative:** “You survived the threshold. Do not confuse that with victory. What will you make of the power before you?”



### 22.2 Sith Apprentice — complete Q1 player answer library


#### Armor Specialist — 6 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SA-AR01` | “I want protective armor without abandoning the battle instincts I have already earned.” | Armored Defense; Core Rulebook Armor Specialist tree; named talent mechanics require individual prerequisite review. |
| `SA-AR02` | “I want my personal defenses and my armor to reinforce one another.” | Improved Armored Defense; Core Rulebook Armor Specialist tree; named talent mechanics require individual prerequisite review. |
| `SA-AR03` | “I want to move and fight in armor without letting its weight control me.” | Armor Mastery; Core Rulebook Armor Specialist tree; named talent mechanics require individual prerequisite review. |
| `SA-AR04` | “I want to drive through an engagement in armor without surrendering my speed.” | Juggernaut; Core Rulebook Armor Specialist tree; named talent mechanics require individual prerequisite review. |
| `SA-AR05` | “I want to keep a protective shield functioning when enemies concentrate their fire on me.” | Shield Expert; Core Rulebook Armor Specialist tree; named talent mechanics require individual prerequisite review. |
| `SA-AR06` | “I want armor that feels like a natural part of my survival rather than a burden.” | Second Skin; Core Rulebook Armor Specialist tree; named talent mechanics require individual prerequisite review. |



#### Duelist — 11 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SA-DU01` | “I want to wield a shoto beside my lightsaber with disciplined precision.” | Shoto Master; Core p. 218; separate from generic Jedi Knight class access. |
| `SA-DU02` | “I want the accuracy of my lightsaber attacks to surpass what ordinary training can teach.” | Greater Weapon Focus (Lightsabers); Core p. 218; separate from generic Jedi Knight class access. |
| `SA-DU03` | “I want a blaster bolt turned aside to become a deliberate threat to its sender.” | Improved Redirect; Core p. 218; separate from generic Jedi Knight class access. |
| `SA-DU04` | “I want a thrown blade to keep an escaping enemy within my reach.” | Thrown Lightsaber Mastery; Core p. 218; separate from generic Jedi Knight class access. |
| `SA-DU05` | “I want to control the path of a thrown lightsaber and recover it as part of my attack.” | Improved Lightsaber Throw; Core p. 218; separate from generic Jedi Knight class access. |
| `SA-DU06` | “I want an opponent to discover that a blocked strike can be answered immediately.” | Improved Riposte; Core p. 218; separate from generic Jedi Knight class access. |
| `SA-DU07` | “I want my practiced strikes to carry greater force, not merely greater speed.” | Greater Weapon Specialization (Lightsabers); Core p. 218; separate from generic Jedi Knight class access. |
| `SA-DU08` | “I want the Force to sustain me through a blow that should have ended my fight.” | Force Fortification; Core p. 218; separate from generic Jedi Knight class access. |
| `SA-DU09` | “I want the means to cripple an adversary with a precise strike when killing them would waste my advantage.” | Severing Strike; Core p. 218; separate from generic Jedi Knight class access. |
| `SA-DU10` | “I want to recover an expended lightsaber-form power before an enemy expects another.” | Lightsaber Form Savant; Core p. 218; separate from generic Jedi Knight class access. |
| `SA-DU11` | “I want to strike repeatedly with my lightsaber without losing the accuracy that makes each blow count.” | Multiattack Proficiency (lightsabers); Core p. 218; separate from generic Jedi Knight class access. |



#### Lightsaber Combat — 11 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SA-LC01` | “I want my blade to stop a melee attack before it finds an opening.” | Block; Core p. 41 and supplemental expansions; equipment and talent chains apply. |
| `SA-LC02` | “I want to turn aside blaster fire while I close on an enemy.” | Deflect; Core p. 41 and supplemental expansions; equipment and talent chains apply. |
| `SA-LC03` | “I want my fighting stance to make me harder to strike.” | Lightsaber Defense; Core p. 41 and supplemental expansions; equipment and talent chains apply. |
| `SA-LC04` | “I want each successful lightsaber strike to have greater effect.” | Weapon Specialization (Lightsabers); Core p. 41 and supplemental expansions; equipment and talent chains apply. |
| `SA-LC05` | “I want enemies beyond arm’s reach to remain vulnerable to my lightsaber.” | Lightsaber Throw; Core p. 41 and supplemental expansions; equipment and talent chains apply. |
| `SA-LC06` | “I want to send an enemy’s own blaster fire back against them.” | Redirect Shot; Core p. 41 and supplemental expansions; equipment and talent chains apply. |
| `SA-LC07` | “I want to defend against lightsabers using specialized equipment when I cannot rely on my blade.” | Cortosis Gauntlet Block; Core p. 41 and supplemental expansions; equipment and talent chains apply. |
| `SA-LC08` | “I want the blaster fire I redirect to strike harder once I have mastered its angle.” | Precise Redirect; Core p. 41 and supplemental expansions; equipment and talent chains apply. |
| `SA-LC09` | “I want a precise strike to hinder an enemy’s movement and keep them from escaping.” | Precision; Core p. 41 and supplemental expansions; equipment and talent chains apply. |
| `SA-LC10` | “I want a successful defense to set up my own counterattack.” | Riposte; Core p. 41 and supplemental expansions; equipment and talent chains apply. |
| `SA-LC11` | “I want the short blade in my other hand to be just as dependable as my main weapon.” | Shoto Focus; Core p. 41 and supplemental expansions; equipment and talent chains apply. |



#### Sith — 12 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SA-SI01` | “I want to heal my own wounds by drawing the life from a nearby opponent.” | Dark Healing; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. |
| `SA-SI02` | “I want to make my attacks against Jedi more dangerous than my attacks against ordinary enemies.” | Dark Scourge; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. |
| `SA-SI03` | “I want to master dark-side powers well enough to attempt their use again when my first effort falters.” | Dark Side Adept; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. |
| `SA-SI04` | “I want my mastery of dark-side powers to let me keep a stronger result when I spend the necessary power.” | Dark Side Master; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. |
| `SA-SI05` | “I want my skill with the Force to conceal my intentions more convincingly than ordinary lies.” | Force Deception; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. |
| `SA-SI06` | “I want to draw life from farther away, even when my victim resists me.” | Improved Dark Healing; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. |
| `SA-SI07` | “I want a critical lightsaber blow to leave an opponent weakened and unable to answer effectively.” | Wicked Strike; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. |
| `SA-SI08` | “I want a damaging Force power to continue hurting an enemy even after the initial attack.” | Affliction; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. |
| `SA-SI09` | “I want to drain life from several opponents at once and turn their injuries into my recovery.” | Dark Healing Field; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. |
| `SA-SI10` | “I want to rob a Force-sensitive opponent of strength and reclaim a spent power for myself.” | Drain Force; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. |
| `SA-SI11` | “I want to imbue a talisman or weapon with dark power through the old Sith arts.” | Sith Alchemy [KOTOR Sith-tree identity]; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. |
| `SA-SI12` | “I want to learn a forbidden fighting form by taking what other masters never meant to teach me.” | Stolen Form; Core pp. 223–224 + Knights of the Old Republic Sith talent expansion; the last record is not source-certified. **QUARANTINE — unverified or incompatible** |



#### Sith Alchemy — 4 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SA-AL01` | “I want to alter my melee weapon in the middle of an encounter so it serves my next attack better.” | Rapid Alchemy; Jedi Academy Training Manual pp. 21–22; high cost, labs, Force Point, and Dark Side Score effects. |
| `SA-AL02` | “I want to create powerful Sith amulets, armor, and other objects through carefully prepared dark-side transformations.” | Sith Alchemy [Jedi Academy Sith-Alchemy-tree identity]; Jedi Academy Training Manual pp. 21–22; high cost, labs, Force Point, and Dark Side Score effects. |
| `SA-AL03` | “I want to use forbidden alchemical processes to reshape living creatures into obedient instruments of my power.” | Cause Mutation; Jedi Academy Training Manual pp. 21–22; high cost, labs, Force Point, and Dark Side Score effects. |
| `SA-AL04` | “I want to modify an alchemical object with a particular trait that serves my purpose.” | Sith Alchemy Specialist; Jedi Academy Training Manual pp. 21–22; high cost, labs, Force Point, and Dark Side Score effects. |



#### Sith Commander — 4 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SA-CM01` | “I want hatred to give wounded allies a final reserve of strength before a fight ends.” | Power of Hatred; Legacy Era Campaign Guide pp. 42–43; ally LOS/range, limited uses, penalties and prereqs. |
| `SA-CM02` | “I want to turn the fear felt by my troops into renewed endurance, even at the cost of their accuracy.” | Focus Terror; Legacy Era Campaign Guide pp. 42–43; ally LOS/range, limited uses, penalties and prereqs. |
| `SA-CM03` | “I want to drive my followers into a more dangerous attack by feeding their anger.” | Incite Rage; Legacy Era Campaign Guide pp. 42–43; ally LOS/range, limited uses, penalties and prereqs. |
| `SA-CM04` | “I want frightened followers to attack immediately, accepting that desperation makes their strikes less precise.” | Desperate Measures; Legacy Era Campaign Guide pp. 42–43; ally LOS/range, limited uses, penalties and prereqs. |



#### Future Force Technique development — 7 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SA-FT01` | “I want to recover some of the Force energy I have spent when a conflict is over.” | Force Point Recovery; Core pp. 101–102; *not* granted at Sith Apprentice level 1; available on even class levels. |
| `SA-FT02` | “I want one Force power to remain reliable when distractions and pressure would unsettle me.” | Force Power Mastery; Core pp. 101–102; *not* granted at Sith Apprentice level 1; available on even class levels. |
| `SA-FT03` | “I want to recover more effectively through a disciplined Force trance.” | Improved Force Trance; Core pp. 101–102; *not* granted at Sith Apprentice level 1; available on even class levels. |
| `SA-FT04` | “I want to detect a nearby use of the Force more readily, before it threatens me.” | Improved Sense Force; Core pp. 101–102; *not* granted at Sith Apprentice level 1; available on even class levels. |
| `SA-FT05` | “I want to perceive what surrounds me without spending as much time searching.” | Improved Sense Surroundings; Core pp. 101–102; *not* granted at Sith Apprentice level 1; available on even class levels. |
| `SA-FT06` | “I want to communicate my thoughts through the Force with fewer chances of failure.” | Improved Telepathy; Core pp. 101–102; *not* granted at Sith Apprentice level 1; available on even class levels. |
| `SA-FT07` | “I want to move small objects through the Force with less effort and greater control.” | Improved Move Light Object; Core pp. 101–102; *not* granted at Sith Apprentice level 1; available on even class levels. |



#### Identity, fulfillment, and neutral — 3 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SA-ID01` | “I want the trials of Sith training to leave me less dependent on anyone else’s approval.” | Character development; editorial identity choices, not talent grants. |
| `SA-ID02` | “This discipline is what I worked to reach. I want to perfect it rather than assume I must pursue another title.” | Prestige-as-capstone; editorial identity choices, not talent grants. |
| `SA-ID03` | “I intend to study what each part of Sith training offers before I commit to one specialty.” | Neutral; editorial identity choices, not talent grants. |



### 22.3 Sith Apprentice counts, selection deferral, and issue ledger
**Full editorial library:** 58 first-person draft answers = 48 talent-linked candidates (including **1 quarantined** `Stolen Form`) + 7 future Force Technique candidates + 3 identity/neutral answers. **57 non-quarantined editorial candidates**, but none is certified as universally legal for an individual character. Answer-count, display, adaptation, and weighting policies remain **DEFERRED**.

**Deferred issues (SITH-APP-01 through SITH-APP-12):**

1. **SITH-APP-01 — printed Dark Side gating versus labeled house rule**: Core requires DSS **equal to Wisdom**, both to enter and to retain benefits; repository explicitly lists **DSS ≥ 1** as project house rule. Owner/rules authority must settle production behavior.
2. **SITH-APP-02 — Sith tradition membership** must be validated as real affiliation, not inferred from a chosen Q1 response or a Mentor assignment.
3. **SITH-APP-03 — six talent trees**: four Core plus JATM Sith Alchemy and Legacy Sith Commander; tree IDs and supplement access need legal verification.
4. **SITH-APP-04 — two distinct Sith Alchemy talents** with different sources and effects; preserve tree/source ID and never key solely by display name.
5. **SITH-APP-05 — Stolen Form** is indexed in the Sith tree but not found as a defined player talent in the supplied TXT; quarantined pending original primary-page/errata identity certification.
6. **SITH-APP-06 — dark-side alchemy consequences**: printed alchemical transformations can increase DSS, require Force Points, money, labs, special materials and days; answers do not imply these resources are owned.
7. **SITH-APP-07 — prerequisite chains**: Greater Weapon Specialization, Dark Side Master, Wicked Strike, Dark Healing Field, Cause Mutation, etc., require specified prerequisite talents/feats; aspiration must not masquerade as eligibility.
8. **SITH-APP-08 — class timing**: talent at odd Sith Apprentice levels, Force Technique at even levels; no immediate first-level Force Technique.
9. **SITH-APP-09 — cross-class access**: Force Sensitivity can supply universal Force talent choices at other opportunities, but the Sith Apprentice *class feature* lists its six class trees, not a blanket Sith-Lord-style “any Force tree” grant.
10. **SITH-APP-10 — Malbada voice**: preserve demanding sadism and contempt but do not claim she is the actor's actual trainer, prior torturer, or direct Sith sponsor without character evidence.
11. **SITH-APP-11 — no forced destination**: despite lore of Sith advancement, this survey preserves an Apprentice capstone identity rather than requiring Sith Lord as a later goal.
12. **SITH-APP-12 — player-choice semantics**: Q1 is educational interest, not acquisition, morality change, allegiance grant, or sanctioned respec.




## 23. Core Rulebook prestige class #12 — Sith Lord Q1 (Darth Miedo; local v0.19)
**Status:** DRAFT, not owner-approved, Q1 only. **Primary rules** *Core Rulebook* printed pp. 224–225 (rendered/visually verified); *Jedi Academy Training Manual* class-independent Force talent-tree clarification (text p. 15), Force Secret supplements; existing Force Disciple/Jedi Master Force Secret inventories in Sections 17 and 20 of this file reused as editorial reference. The following are rules-grounded aspirations, **not** certification of every talent for a particular character.

**Core RAW:** minimum heroic level **12**, trained Use the Force, Force Sensitivity and lightsaber proficiency, **at least one known Force Technique**, Sith-tradition membership, and **Dark Side Score equal to Wisdom**; loss of Sith Lord class features if DSS falls below Wisdom. The repository prerequisite file carries a labeled **DSS ≥ 1 house rule** instead. Sith Lord is **five levels**: first level grants +3 to three defenses, **Fearless**, **Temptation**, and a talent; levels 2, 3, 4, and 5 each grant a Force Secret; levels 3 and 5 also grant talents. The class feature **Temptation** uses a standard-action Persuasion vs the Will Defense of an opponent in line of sight, setting a conditional penalty if the opponent spends Force/Destiny Points before the next turn. It does **not** control a victim or force a point expenditure.

**Talent access, critical discrepancy:** The printed Core Rulebook permits Sith Lord talents from the **Sith** tree **or ANY eligible Force talent tree**. The JATM defines eligible Force trees as those not limited to a class and accessible with Force Sensitivity: Alter, Control, Dark Side, Light Side, Sense, Guardian Spirit, qualifying tradition trees. **The repo indexes only `sith`**, omitting these general Force trees. A Sith Lord does **not** automatically gain class-specific Sith Commander or Sith Alchemy trees merely because it has “Sith” in the title. Light Side requires DSS 0, which is incompatible with the class's normal printed DSS=Wisdom rule; four Light Side talents are excluded from active Q1 drafts and explicitly gated. Tradition trees need actual tradition membership. The Sith tree includes the unresolved `Stolen Form` name (quarantined).



### 23.1 Darth Miedo — Mentor introduction (DRAFT)
Source: `data/dialogue/mentors/darth_miedo/darth_miedo_dialogue.json`: quiet, controlled, absolute, calculating, patient. Unlike Malbada, he needs no shouted threat or theatrical praise. His voice should reflect certainty and command, **not assume this player personally apprenticed to him or follows the Rule of Two rather than another Sith era**. The established `sith_lord` level-1 dialogue calls the already-qualified player “apprentice”; preserve as a deferred Mentor issue rather than repeat here.

**Preferred Q1 line:** “You have reached the threshold of Sith Lord. A blade can end a life. A secret can outlast a century. The Force can make others mistake your will for their own. Titles do none of this. Decide which mastery will endure when you are gone.”

**Question:** “As a Sith Lord, which part of your power or influence will you bring under greater control?”

**Shorter alternative:** “Authority is not declared. It is demonstrated. Choose the discipline that will make your will unavoidable.”



### 23.2 Sith Lord — complete Q1 player answer library


#### Sith (class-access tree) — 12 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SL-SI01` | “I want the life of an adversary to sustain me when my own strength is failing.” | Dark Healing; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. |
| `SL-SI02` | “I want my hatred of the Jedi to make my attacks against them more decisive.” | Dark Scourge; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. |
| `SL-SI03` | “I want dark-side Force powers to answer more reliably when my first attempt falters.” | Dark Side Adept; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. |
| `SL-SI04` | “I want the power to keep the stronger outcome when drawing on the dark side costs me a Force Point.” | Dark Side Master; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. |
| `SL-SI05` | “I want to deceive others through mastery of the Force rather than rely on an ordinary lie.” | Force Deception; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. |
| `SL-SI06` | “I want to draw vitality from opponents farther away and still take something when they resist.” | Improved Dark Healing; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. |
| `SL-SI07` | “I want a critical blow of my lightsaber to leave even a powerful rival severely weakened.” | Wicked Strike; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. |
| `SL-SI08` | “I want the suffering caused by my Force powers to persist after the first attack.” | Affliction; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. |
| `SL-SI09` | “I want to turn the suffering of several opponents into the strength I need to continue.” | Dark Healing Field; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. |
| `SL-SI10` | “I want to strip a Force-sensitive adversary of resources and regain a power of my own.” | Drain Force; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. |
| `SL-SI11` | “I want to build a legacy through Sith-talismans and weapons charged with the dark side.” | Sith Alchemy — KOTOR Sith tree; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. |
| `SL-SI12` | “I want to turn another master’s forbidden lightsaber teachings into a weapon of my own.” | Stolen Form — unverified printed talent; Core p. 223 + KOTOR; `Stolen Form` remains quarantined. **QUARANTINE — unverified or incompatible** |



#### Force Secrets — future level 2–5 choices — 15 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SL-FS01` | “I want a Force attack to strike harder when the result must be decisive.” | Devastating Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS02` | “I want to wield a Force power beyond its usual range while still observing its limits.” | Distant Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS03` | “I want one power to reach several subjects instead of one.” | Multitarget Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS04` | “I want a Force power to act within an instant another opponent would waste.” | Quicken Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS05` | “I want my area powers to spare the few I still find useful.” | Shaped Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS06` | “I want a sustained Force power to demand less of my immediate attention.” | Extend Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS07` | “I want to prepare one Force power to follow another at precisely the time I choose.” | Linked Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS08` | “I want my self-directed powers to remain effective even when pain and weakness impede me.” | Unconditional Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS09` | “I want a dark-side power to overcome other Force-users through the corruption I have embraced.” | Corrupted Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS10` | “I want the damage from my powers to leave enemies less capable of resisting afterward.” | Debilitating Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS11` | “I want a destructive or controlling Force power to influence a larger area.” | Enlarged Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS12` | “I want to strengthen a light-side Force power against darkness without surrendering my Sith identity.” | Pure Power — light-side restriction; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. **QUARANTINE — unverified or incompatible** |
| `SL-FS13` | “I want to choose a point of origin for an area power other than my own position.” | Remote Power; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS14` | “I want to collect and preserve the knowledge of the Force so it outlives my body.” | Holocron Loremaster; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. |
| `SL-FS15` | “I want an apprentice I have genuinely trained to wield part of my knowledge when the time comes.” | Mentor — completed-apprentice prerequisite; Core p. 103 (5); Clone Wars (3); Force Unleashed (5); Jedi Academy (2); `Pure Power` incompatible with normal Sith Dark Side gating. **CONDITIONAL** |



#### Alter — general Force talent tree — 15 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SL-AL01` | “I want to shape destructive Force effects so they strike the intended victims, not my useful servants.” | Disciplined Strike; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL02` | “I want a moment of exceptional telekinetic control to grant me an immediate advantage.” | Telekinetic Power; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL03` | “I want others to hesitate before closing with me, as though space itself resists them.” | Aversion; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL04` | “I want to maintain a trusted mental link with an ally I have chosen.” | Telepathic Link; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL05` | “I want my thoughts to shape decisions without my intentions being spoken aloud.” | Telepathic Influence; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL06` | “I want enough telekinetic strength to move objects that reshape a battlefield.” | Move Massive Object; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL07` | “I want an illusion convincing enough that my enemies act on what I want them to believe.” | Illusion; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL08` | “I want an expanding command of telekinesis without depending on a single familiar trick.” | Telekinetic Prodigy; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL09` | “I want my appearance to become what a watcher expects rather than what I truly am.” | Masquerade; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL10` | “I want to draw an advantage from the moments when use of the Force does not go as planned.” | Force Flow; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL11` | “I want illusions to remain useful in the minds of those I have already deceived.” | Illusion Bond; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL12` | “I want to renew a spent mind-influencing power when another person remains to be persuaded.” | Influence Savant; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL13` | “I want a spent telekinetic power available again when an obstacle remains.” | Telekinetic Savant; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL14` | “I want more than one Force-user to combine their efforts when acting separately would be weaker.” | Link; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |
| `SL-AL15` | “I want to interfere with another Force-user’s powers before they can threaten me.” | Suppress Force; Core pp. 100–101 plus supplements; role and effect may require specific powers/feats. |



#### Control — general Force talent tree — 12 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SL-CT01` | “I want to remain planted when an opponent tries to shove me aside.” | Telekinetic Stability; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |
| `SL-CT02` | “I want the Force to soften a blow that could otherwise kill me.” | Damage Reduction 10; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |
| `SL-CT03` | “I want to invoke a Force talent without spending my usual reserve once in a decisive encounter.” | Force Harmony; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |
| `SL-CT04` | “I want my mental influence to reach creatures others would dismiss as too difficult to direct.” | Beast Trick; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |
| `SL-CT05` | “I want to push through physical strain to use the power I most need one additional time.” | Force Exertion; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |
| `SL-CT06` | “I want to blunt the Force power of an enemy whose rebuke I have met.” | Force Suppression; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |
| `SL-CT07` | “I want to wall off my thoughts from mind-affecting attacks when my choices must remain my own.” | Indomitable Will; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |
| `SL-CT08` | “I want the Force to help me recover more effectively from wounds.” | Force Recovery; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |
| `SL-CT09` | “I want to regain a Force power through concentration rather than wait for another opportunity.” | Force Focus; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |
| `SL-CT10` | “I want a negated energy attack to become an opening for me to unleash a Force power.” | Channel Energy; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |
| `SL-CT11` | “I want to answer an assault on my will with the Force, even at a temporary cost to my focus.” | The Will To Resist; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |
| `SL-CT12` | “I want to clear harmful conditions before they prevent me from imposing my will.” | Equilibrium; Core and supplements; conditional activation, Force Point limits, and prerequisites apply. |



#### Sense — general Force talent tree — 12 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SL-SE01` | “I want my connection to the Force to guide my way when instruments and maps are not enough.” | Instinctive Navigation; Core and supplements; visions do not give unlimited future knowledge. |
| `SL-SE02` | “I want a keener sense of danger before an enemy even becomes visible.” | Heightened Awareness; Core and supplements; visions do not give unlimited future knowledge. |
| `SL-SE03` | “I want to sense the currents of the Force in a place before deciding how to act.” | Feel the Force; Core and supplements; visions do not give unlimited future knowledge. |
| `SL-SE04` | “I want to bring my Force perception to the controls of a vessel when direct flight is necessary.” | Force Pilot; Core and supplements; visions do not give unlimited future knowledge. |
| `SL-SE05` | “I want to draw hidden history from an object another being once possessed.” | Psychometry; Core and supplements; visions do not give unlimited future knowledge. |
| `SL-SE06` | “I want to turn to a different kind of perception when darkness or distance limits ordinary sight.” | Shift Sense; Core and supplements; visions do not give unlimited future knowledge. |
| `SL-SE07` | “I want the Force to reveal danger, deception, and concealed intent.” | Force Perception; Core and supplements; visions do not give unlimited future knowledge. |
| `SL-SE08` | “I want a glimpse of what comes next to make my preparations harder to defeat.” | Foresight; Core and supplements; visions do not give unlimited future knowledge. |
| `SL-SE09` | “I want precognition to help me react when an attack arrives sooner than expected.” | Force Reflexes; Core and supplements; visions do not give unlimited future knowledge. |
| `SL-SE10` | “I want to perceive the strength of another being’s connection to the Force before I choose an approach.” | Gauge Force Potential; Core and supplements; visions do not give unlimited future knowledge. |
| `SL-SE11` | “I want to see the path of an incoming attack early enough to step clear.” | Motion of the Future; Core and supplements; visions do not give unlimited future knowledge. |
| `SL-SE12` | “I want uncertain glimpses of what has happened or might happen, without mistaking them for certainty.” | Visions; Core and supplements; visions do not give unlimited future knowledge. |



#### Dark Side — general Force talent tree — 10 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SL-DS01` | “I want a Force power to answer as swiftly as a command when hesitation would cost victory.” | Swift Power; Core and supplements; all Dark Side Score and Force Point consequences apply. |
| `SL-DS02` | “I want to deny my own weakening by paying the further cost of darkness.” | Dark Preservation; Core and supplements; all Dark Side Score and Force Point consequences apply. |
| `SL-DS03` | “I want the darkness surrounding me to strengthen the defenses of those I command.” | Dark Presence; Core and supplements; all Dark Side Score and Force Point consequences apply. |
| `SL-DS04` | “I want to draw an advantage on crucial attacks from power that others fear to use.” | Power of the Dark Side; Core and supplements; all Dark Side Score and Force Point consequences apply. |
| `SL-DS05` | “I want to restore a dark-side power to my grasp without surrendering a Force Point each time.” | Dark Side Savant; Core and supplements; all Dark Side Score and Force Point consequences apply. |
| `SL-DS06` | “I want to sacrifice a measure of mental defense for the strength of my next attack.” | Consumed by Darkness; Core and supplements; all Dark Side Score and Force Point consequences apply. |
| `SL-DS07` | “I want to preserve my essence beyond death by risking its transfer into a body or object.” | Transfer Essence; Core and supplements; all Dark Side Score and Force Point consequences apply. |
| `SL-DS08` | “I want the loss of an ally to become the rage that drives my remaining attacks.” | Revenge; Core and supplements; all Dark Side Score and Force Point consequences apply. |
| `SL-DS09` | “I want to rip a useful skill or secret from an enemy’s mind and use it myself.” | Drain Knowledge; Core and supplements; all Dark Side Score and Force Point consequences apply. |
| `SL-DS10` | “I want an exceptionally successful Force attack to leave its damage lingering into the next moment.” | Wrath of the Dark Side; Core and supplements; all Dark Side Score and Force Point consequences apply. |



#### Guardian Spirit — general Force talent tree — 5 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SL-GS01` | “I want guidance from an unseen presence that understands powers I have not yet learned.” | Guardian Spirit; Jedi Academy Training Manual; a guardian spirit is not auto-created by a Q1 answer, and narrative compatibility needs GM authority. |
| `SL-GS02` | “I want a spirit’s encouragement to help sustain me when my strength fails.” | Vital Encouragement; Jedi Academy Training Manual; a guardian spirit is not auto-created by a Q1 answer, and narrative compatibility needs GM authority. |
| `SL-GS03` | “I want to hear useful counsel from a guardian spirit when a skill check goes wrong.” | Crucial Advice; Jedi Academy Training Manual; a guardian spirit is not auto-created by a Q1 answer, and narrative compatibility needs GM authority. |
| `SL-GS04` | “I want a guardian spirit capable of appearing beside me when circumstances demand it.” | Manifest Guardian Spirit; Jedi Academy Training Manual; a guardian spirit is not auto-created by a Q1 answer, and narrative compatibility needs GM authority. |
| `SL-GS05` | “I want the presence of a manifested guardian spirit to distract an enemy while I act.” | Distracting Apparition; Jedi Academy Training Manual; a guardian spirit is not auto-created by a Q1 answer, and narrative compatibility needs GM authority. |



#### Qualifying Force traditions — restricted — 3 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SL-TR01` | “I want to bring the teachings of a Force-and-armor tradition under my command if I have genuinely trained in it.” | Jensaarai Defender; Jedi Academy general access clarification; affiliation/training and printed prerequisites are non-negotiable. **CONDITIONAL** |
| `SL-TR02` | “I want to combine my Force knowledge with the beast- and spell-work of a tradition I have actually learned.” | Dathomiri Witch; Jedi Academy general access clarification; affiliation/training and printed prerequisites are non-negotiable. **CONDITIONAL** |
| `SL-TR03` | “I want to use the techniques of my real Force tradition alongside my knowledge of the Sith without inventing a history I never lived.” | Other qualifying Force tradition; Jedi Academy general access clarification; affiliation/training and printed prerequisites are non-negotiable. **CONDITIONAL** |



#### Sith Lord class features — 2 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SL-CF01` | “I want to stand unmoved when an enemy tries to command me through fear.” | Fearless; Core p. 225; acquired at class level 1, not optional talent picks. |
| `SL-CF02` | “I want to make another Force-user hesitate before drawing on their power, forcing them to weigh its consequences.” | Temptation; Core p. 225; acquired at class level 1, not optional talent picks. |



#### Identity, capstone, and neutral — 3 draft responses
| ID | First-person player response | Developer-only anchor / status |
|---|---|---|
| `SL-ID01` | “I want my authority to survive beyond a single victory, grounded in discipline, knowledge, and those who carry out my will.” | Identity; editorial role choices, not automatically conferred power, rank over NPCs, or faction membership. |
| `SL-ID02` | “I intended to reach the station of Sith Lord. I want to master it rather than chase another title.” | Apex / capstone; editorial role choices, not automatically conferred power, rank over NPCs, or faction membership. |
| `SL-ID03` | “I have reached this threshold, but I will decide what kind of Lord I am through what I choose to develop next.” | Neutral; editorial role choices, not automatically conferred power, rank over NPCs, or faction membership. |



### 23.3 Sith Lord counts and issue ledger
**Full editorial library:** 89 first-person answers. **2 quarantined**: Sith tree `Stolen Form` (undefined player talent in inspected sources) and Force Secret `Pure Power` (Light Side/DSS 0 incompatible with this class's normal printed dark-side requirement). **87 non-quarantined editorial candidates**, including three **conditional** tradition branches and one completed-apprentice Force Secret requiring particular history. None is a blanket certification of individual mechanical legality; no selection policy, visible answer quota, ranking, or weighting has been approved.

**Deferred issues (SITH-LORD-01 through SITH-LORD-15):**

1. **SITH-LORD-01 — original DSS threshold vs labeled house rule.** Core requires DSS equal to Wisdom to enter and retain; repository labels DSS ≥ 1 as a house rule. Do not silently choose.
2. **SITH-LORD-02 — expanded Force talent access.** Core and JATM authorize the Sith tree **plus any class-independent eligible Force tree**. `packs/classes.db` and prestige profile list only Sith. Needs V2 authority audit.
3. **SITH-LORD-03 — do not inherit Sith Apprentice class trees.** Armor Specialist, Duelist, Lightsaber Combat, Sith Commander, and Sith Alchemy are not Sith Lord class-tree grants; use only if separately held or gained from legitimate other sources.
4. **SITH-LORD-04 — class cadence.** Five class levels, three talents (1/3/5) and four Force Secrets (2/3/4/5), Temptation/Fearless at 1. No first-level Secret.
5. **SITH-LORD-05 — Temptation limits.** Requires check against one visible target and only matters on their voluntary expenditure of Force/Destiny Points before next turn; does not impose a point spend or compel obedience.
6. **SITH-LORD-06 — Pure Power is incompatible with normal entry.** Light Side Score zero required, while Sith Lord normally maintains DSS=Wisdom. Exclude from active selection, regardless of generic Force Secret indexing.
7. **SITH-LORD-07 — light-side tree exclusion.** Source grants any Force tree *subject to prerequisites*; Light Side tree requires DSS zero, ordinarily incompatible with Sith Lord RAW. No free selection because tree is on the universal list.
8. **SITH-LORD-08 — Stolen Form undefined talent.** Only NPC record naming found; quarantine until printed definition and source/tree ID certified.
9. **SITH-LORD-09 — Force traditions need genuine eligibility.** JATM clarification does not create Jensaarai/Dathomiri membership or training.
10. **SITH-LORD-10 — same-name Sith Alchemy collision.** KOTOR Sith-tree version versus JATM Sith Apprentice-only tree version; neither should be confused with general Force talent access.
11. **SITH-LORD-11 — Force Secret `Mentor` history** requires completion of teaching an apprentice to knighthood/equivalent; not presumed by class title or Miedo dialogue.
12. **SITH-LORD-12 — Force Secrets prerequisites and expenditure** (e.g. Corrupted Power, Holocron Loremaster, multiple-target limitations) must be evaluated, not inferred from survey aspiration.
13. **SITH-LORD-13 — Miedo personality vs printed lore**: calm, inevitable, patient, absolute; do not assume direct personal apprentice relation, Rule of Two campaign era, previously held Sith Lord title, empire leadership, or an NPC following the player.
14. **SITH-LORD-14 — apex fulfillment and separate future goal**: Sith Lord is a natural prestige endpoint, but Q1 does not automatically overwrite character's originally declared career goal or transform an unrelated class aspiration.
15. **SITH-LORD-15 — source-identity certification**: published talent descriptions, exact source/page, prerequisites, schema IDs, legal class tree grants, Force talent expansion and automated rules tests require a separate pass before code implementation.




## 24. Q1 Book 1 completion checkpoint (v0.19)
**Core Rulebook prestige classes #1–#12 now have DRAFT Q1 libraries:** Ace Pilot (Mayu); Bounty Hunter (Kex Varon); Crime Lord (Tío the Hutt); Elite Trooper (Breach); Force Adept (Seeker Vera); Force Disciple (Riquis); Gunslinger (Rajma); Jedi Knight (Miraj); Jedi Master (Miraj); Officer (Admiral Korr); **Sith Apprentice (Darth Malbada)**; **Sith Lord (Darth Miedo)**. This closes first-pass book-order **authoring**, not owner sign-off, production mechanic certification, selected answer count, or implementation. Each Mentor introduction and player response is DRAFT unless separately approved. Talent/Force-Secret grants are never conferred by Q1. Keep all original issue ledgers, prior answer banks and deferred selection rules unchanged. No repo modifications or commits made during v0.19.

**This double-class pass:** Sith Apprentice **58** Q1 draft responses (1 quarantined) + Sith Lord **89** Q1 draft responses (2 quarantined) = **147** new responses. Sourcebooks verified via searchable attached text and rendered primary PDF pages; class and mentor JSON read-only from repository main.


---

## 25. KOTOR Campaign Guide — three new prestige classes: Q1 first-pass (2026-11-14)

**Scope:** Corporate Agent, Gladiator, Melee Duelist, in printed book order. Their Q1 talent answer banks are DRAFT and are not approval, legal certification, weighting, or implementation. Keep the original Core Q1 books and prior 25 sections unchanged.

### 25.1 Verified book and V2 audit

The *Knights of the Old Republic Campaign Guide* chapter New Prestige Classes introduces exactly **three** new prestige classes, Corporate Agent, Gladiator, and Melee Duelist. The printed chapter also contributes talents to **existing** prestige classes; these are expansions to the Core classes already drafted, not additional new prestige-class identities. Relevant pages inspected from the scanned PDF and the corresponding searchable text.

| Class | Current `packs/classes.db` talent trees | Current indexed talent counts | Core class feature | Mentor |
|---|---|---|---|---|
| Corporate Agent | Leadership; Lineage; Corporate Power | 11 + 7 + 7 = 25 | Executive Leadership at even levels | Marl Skindar |
| Gladiator | Armor Specialist; Awareness; Gladiatorial Combat | 6 + 8 + 8 = 22 | Unflinching at even levels | Pegar |
| Melee Duelist | Brawler; Weapon Specialist; Melee Duelist | 22 + 9 + 9 = 40 | Master of Movement at even levels | Blade Master Kharjo |

Each has talent selection at class levels 1/3/5/7/9 and its named class feature scales at class levels 2/4/6/8/10. All use the printed level-7 entry requirement, with distinct additional prerequisites. The repo inventory totals **87** indexed talent names, some from later sourcebooks and NOT individually source-certified here. Q1 also includes 3 class-feature anchors and 9 identity/neutral choices, **99 editorial responses** total.

### 25.1a KOTOR changes to already-drafted Core prestige classes (inventory only)

The same KOTOR prestige chapter also adds content to existing Core prestige classes. Its explicit headings cover **Elite Trooper** (Mandalorian Warrior talent tree), **Force Adept** (Force Item tree additions), **Gunslinger** (Gunslinger tree addition), **Jedi Knight** (Duelist additions, plus Jedi Battlemaster, Jedi Shadow, and Jedi Watchman talent trees), and **Sith Apprentice** (Sith tree additions). These are not additional prestige classes. Some are reflected in earlier broad answer banks, but their source-to-record certification remains an independent reconciliation task. This Q1 pass creates no parallel identities or duplicate classes.

### 25.2 Published legal requirements (distinguish from implementation)

- **Corporate Agent:** level 7; trained Gather Information and Knowledge (bureaucracy); Skill Focus (Knowledge [bureaucracy]); employed by major interstellar corporation. Printed Employment Required means no additional Corporate Agent levels while not employed by an eligible corporation. Cannot infer undercover work, intelligence-agency affiliation, or exact employer from this requirement.
- **Gladiator:** level 7, BAB +7, Improved Damage Threshold, Weapon Proficiency (advanced melee weapons). Source allows formal nonlethal games, underground matches, compelled participants, and different local laws; don't assert the player is a killer, former slave, or champion. **Crowd Response** is a separate arena situational rule, not a universally granted class feature.
- **Melee Duelist:** level 7, BAB +7, Melee Defense, Rapid Strike, and **Weapon Focus in an exotic melee weapon or advanced melee weapons**. Repository prose is less specific. The class can be taken by non-Force-users, Jedi, or Sith; no Force abilities are granted by the class.

### 25.3 Mentor and provenance issues

- **Marl Skindar:** `data/dialogue/mentors/marl_skindar/skindar_dialogue.json`, dry/impatient covert intelligence agent personally. Corporate Agent itself encompasses overt security, administration, construction, fraud investigation, espionage, and management. Skindar must not impose HIS Republic Intelligence cover story on the player's character.
- **Pegar:** `data/dialogue/mentors/pegar/pegar_dialogues.json`, ancient, bemused, reflective, survival-oriented. Statements about centuries/immortality/many identities are *Pegar's* stories, not player history.
- **Blade Master Kharjo:** `data/dialogue/mentors/kharjo/kharjo_dialogue.json`; measured, exact, unboastful instructor. **MENTOR-001 open:** per-Mentor JSON exists but Kharjo is missing from `mentor_registry.json`. Do not use an unrelated fallback Mentor.
- For all three, preserve the difference between **future interest** (Q1 selected answer), **actual possessed talents**, **entry qualification**, and **legally acquired prestige class**. Wording does not assert unrecorded achievements.

### 25.4 Validation and editorial issues (OPEN)

1. **KOTOR-001 (P1):** Verify every shared-tree indexed expansion in primary sources before accepting mechanically precise semantics; KOTOR itself validates the new Corporate Power (7), Gladiatorial Combat (8), and Melee Duelist (9) talents.
2. **KOTOR-002 (P1):** Corporate Agent's Employment Required is a continuing condition on further class levels, not automatic loss of previously acquired talents.
3. **KOTOR-003 (P1):** Gladiator crowd support depends on GM-assigned crowd attitudes and arena circumstances; do not claim spectators or bonuses outside a qualifying setting.
4. **KOTOR-004 (P1):** Melee Duelist's precise Weapon Focus weapon-type requirement must be represented in the authority (repo prose currently says generic Weapon Focus).
5. **KOTOR-005 (P1):** Kharjo is not listed in the mentor registry (MENTOR-001); do not silently substitute another Mentor.
6. **KOTOR-006 (P1):** Corporate Agent is not synonymous with a spy; neither is every Gladiator a voluntary killer nor every Melee Duelist a lightsaber user.
7. **KOTOR-007 (P1):** Some indexed Brawler and Weapon Specialist talents depend on ranged weapons, grapples, or prerequisites and may fit a Melee Duelist only with a specific build. Keep source/capability filters separate from narrative appeal.
8. **KOTOR-008 (P1):** Prerequisites for feat and talent chains must be validated per candidate before a later equipment or talent suggestion; Q1 grants none.
9. **KOTOR-009 (P2):** Existing Mentor level greetings presume previous arena wins, operational assignments, and undefeated duels. Survey intros must avoid those unsupported claims.
10. **KOTOR-010 (P2):** The previous Core Q1 section remains intact; cross-book expansions to other Core PrCs are a separate reconciliation pass, not a rewrite of the approved book-order workflow.
11. **KOTOR-011 (P2):** Reuse 297 archetype registry, 190-tag ontology and existing V2 engine authorities; editorial IDs are not canonical talent IDs or new archetypes.
12. **KOTOR-012 (P2):** Presentation/answer selection remains deferred, as requested. No repo edits, GitHub commits, implementation, scoring changes, or Q2–Q6 authoring.

### 25.5 Complete class-by-class candidate bank

## Corporate Agent — KOTOR Q1 (DRAFT)
**Mentor:** Marl Skindar  
**Source:** Knights of the Old Republic Campaign Guide, printed pp. 41-43 (corporate agent and corporate power).  
**Core prompt:** As a Corporate Agent, what kind of professional influence do you want to develop?

> Corporate authority. A comforting phrase, until somebody asks you to make a decision. Your employer gives you access; it doesn't give you judgment. Are you here to lead people, build connections, or make competitors hesitate? Spare me the slogan.

**Editorial/source note:** Corporate Power is KOTOR-origin. Leadership and Lineage are existing trees with later expansions indexed in the repository. The printed employment rule is a gate on taking additional Corporate Agent class levels.

### Leadership — 11 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| LE01 | Fearless Leader | "I want my people to hold steady when threats and intimidation threaten the work." |
| LE02 | Trust | "I want to give a trusted ally the chance to act when their judgment matters more than mine." |
| LE03 | Unwavering Ally | "I want someone working beside me to stay ready even when danger catches everyone off guard." |
| LE04 | Distant Command | "I want my guidance to keep helping the team after I move away from them." |
| LE05 | Rally | "I want to restore the confidence of an ally who's hurting and close to giving up." |
| LE06 | Coordinate | "I want the people working together to make each other's efforts more effective." |
| LE07 | Reactionary Attack | "I want my allies to seize an opening when an opponent tries to hurt one of us." |
| LE08 | Born Leader | "I want my presence to improve how effectively the people around me act." |
| LE09 | Commanding Presence | "I want one decisive move to bring the rest of my team into step." |
| LE10 | Tactical Savvy | "I want to recognize the moment when a colleague can turn one critical effort into success." |
| LE11 | Coordinated Leadership | "I want several capable leaders to reinforce each other rather than issue competing directions." |

### Lineage — 7 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| LI01 | Wealth | "I want the resources to build opportunities that last beyond a single contract." |
| LI02 | Educated | "I want broad knowledge that helps me recognize what matters in an unfamiliar business or negotiation." |
| LI03 | Influential Friends | "I want useful contacts who can help when ordinary channels close their doors." |
| LI04 | Powerful Friends | "I want relationships with influential people who will listen when I need their help." |
| LI05 | Spontaneous Skill | "I want to draw on an unexpected skill when an assignment changes without warning." |
| LI06 | Engineer | "I want to understand the technical side of an operation well enough to improve it when needed." |
| LI07 | Connections | "I want a network that can locate hard-to-find resources without making every request a public affair." |

### Corporate Power — 7 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| CP01 | Competitive Drive | "I want the resolve to reconsider a difficult decision and find a better result under pressure." |
| CP02 | Competitive Edge | "I want the people working with me to be ready to act the instant a negotiation turns dangerous." |
| CP03 | Corporate Clout | "I want to make an opponent rethink the value of fighting us, perhaps even accept a better arrangement." |
| CP04 | Impose Confusion | "I want my words to unsettle several opponents at once, costing them the time they need to act." |
| CP05 | Impose Hesitation | "I want an entire group of adversaries to hesitate when I speak, giving my side a moment to respond." |
| CP06 | Willful Resolve | "I want the mental discipline to reject a single effort to intimidate or manipulate me." |
| CP07 | Wrong Decision | "I want someone who tries to hurt me to become more vulnerable to the pressure I apply next." |

### Class feature — 1 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| CF01 | Executive Leadership | "I want to learn how to give an ally a timely boost to their speed, accuracy, or defenses." |

### Identity / neutral — 3 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| ID01 | Career identity | "I want to protect the people affected by a corporation's decisions, even when doing so costs influence." |
| ID02 | Capstone fulfillment | "I want corporate leadership to be my destination, not a step toward another title." |
| NEUTRAL | Undecided | "I want to understand the different kinds of corporate influence before choosing how to use mine." |

**Corporate Agent total:** 29 editorial candidates.  All talent/prerequisite mapping remains provisional pending canonical per-record verification.

## Gladiator — KOTOR Q1 (DRAFT)
**Mentor:** Pegar  
**Source:** Knights of the Old Republic Campaign Guide, printed pp. 43-45 (gladiator, combat talents, Unflinching, audience rule).  
**Core prompt:** As a Gladiator, what part of arena fighting do you want to make your own?

> Ah, the arena. I've seen a match teach the same lesson twice. Not many fighters enjoy the second one. You've reached the threshold; what would you rather master—staying alive, reading the next move, or giving the crowd something worth remembering?

**Editorial/source note:** Gladiatorial Combat is KOTOR-origin; Awareness and Armor Specialist include indexed expansions. Crowd Response is a conditional optional arena rule, not a class-granted talent.

### Armor Specialist — 6 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| AR01 | Armored Defense | "I want armor to protect me without giving up the defenses I've earned through experience." |
| AR02 | Improved Armored Defense | "I want my skill and my armor to strengthen each other when the arena turns dangerous." |
| AR03 | Armor Mastery | "I want to move and defend myself naturally even in equipment that weighs me down." |
| AR04 | Juggernaut | "I want to keep advancing in armor instead of letting it slow me at a critical moment." |
| AR05 | Shield Expert | "I want to hold a shield's protection together when an opponent keeps pressing the attack." |
| AR06 | Second Skin | "I want the armor I wear to feel like another part of my fighting style." |

### Awareness — 8 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| AW01 | Acute Senses | "I want to notice a shift in an opponent's stance before the real attack begins." |
| AW02 | Expert Tracker | "I want to follow an opponent's movements even when they try to shake me after a match." |
| AW03 | Improved Initiative | "I want to seize the first opening in a bout instead of waiting for my opponent to move." |
| AW04 | Reset Initiative | "I want to regain my timing when the rhythm of a fight turns against me." |
| AW05 | Keen Shot | "I want to land a clean ranged strike even when smoke or poor visibility obscures the target." |
| AW06 | Uncanny Dodge I | "I want to react when an opponent tries to catch me flat-footed." |
| AW07 | Uncanny Dodge II | "I want to avoid being trapped between attackers who think they've found my blind spot." |
| AW08 | Weak Point | "I want to see where a formidable opponent's protection can actually be overcome." |

### Gladiatorial Combat — 8 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| GC01 | Brutal Attack | "I want to make a powerful hit count for more when it breaks through an opponent's endurance." |
| GC02 | Call Out | "I want to single out a rival and make them pay for ignoring me to attack someone else." |
| GC03 | Distracting Attack | "I want a solid blow to leave an opponent more exposed to the next attack." |
| GC04 | Exotic Weapons Master | "I want to handle strange arena weapons without treating each new one as a mystery." |
| GC05 | Lockdown Strike | "I want to stop an opponent's movement the moment they try to get past me." |
| GC06 | Multiattack Proficiency (exotic weapons) | "I want to make several attacks with an exotic weapon without losing the control each one requires." |
| GC07 | Personal Vendetta | "I want a challenge from me to draw opponents' attention away from the people beside me." |
| GC08 | Unstoppable | "I want to shake off one debilitating blow and keep fighting when a match should have ended." |

### Class feature — 1 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| CF01 | Unflinching | "I want to brace myself against a dangerous blow or attempt to break my will at the exact moment it matters." |

### Identity / neutral — 3 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| ID01 | Arena identity | "I want to win contests through skill and showmanship, without needing to kill the person across from me." |
| ID02 | Capstone fulfillment | "I want to make gladiatorial mastery my destination rather than a step toward another title." |
| NEUTRAL | Undecided | "I want to learn which parts of arena fighting suit me before deciding what kind of champion to become." |

**Gladiator total:** 26 editorial candidates.  All talent/prerequisite mapping remains provisional pending canonical per-record verification.

## Melee Duelist — KOTOR Q1 (DRAFT)
**Mentor:** Blade Master Kharjo  
**Source:** Knights of the Old Republic Campaign Guide, printed pp. 46-47 (Melee Duelist tree and Master of Movement).  
**Core prompt:** As a Melee Duelist, what kind of close-combat expertise do you want to perfect?

> A duel is not won by reputation. It is decided by distance, timing, and the choices made when another fighter moves. You have earned the chance to study this craft. Which part will you train until it no longer demands thought?

**Editorial/source note:** Melee Duelist is KOTOR-origin. Brawler and Weapon Specialist are preexisting trees with later expansions indexed in the repository. Published Weapon Focus requirement is specifically for exotic melee weapons or advanced melee weapons.

### Brawler — 22 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| BR01 | Unrelenting Assault | "I want to keep pressure on an opponent until they can no longer dictate the pace of our exchange." |
| BR02 | Cantina Brawler | "I want to be dangerous in a fight even when there's no formal arena and nothing but what is nearby." |
| BR03 | Hammerblow | "I want one committed unarmed blow to matter more than a flurry of weak strikes." |
| BR04 | Sucker Punch | "I want to exploit the instant an opponent fails to anticipate my first strike." |
| BR05 | Entangler | "I want to keep a difficult opponent within reach instead of letting them break away." |
| BR06 | Strong Grab | "I want to hold an opponent firmly once I've managed to catch them." |
| BR07 | Expert Grappler | "I want to control a struggle at close quarters through practiced grappling." |
| BR08 | Make Do | "I want to turn an object at hand into a useful weapon when my usual one isn't available." |
| BR09 | Grabber | "I want the first successful grab to become the beginning of control, not the end of it." |
| BR10 | Bayonet Master | "I want to remain dangerous with a mounted blade when a ranged weapon is forced into close combat." |
| BR11 | Experienced Brawler | "I want my experience in improvised fights to keep paying off against practiced opponents." |
| BR12 | Devastating Melee Smash | "I want a heavy melee strike to leave a tough opponent less able to endure the next blow." |
| BR13 | Man Down | "I want to take advantage of the opening that appears when someone goes to the ground." |
| BR14 | Counterpunch | "I want an enemy's failed close-range attack to become my opportunity to answer." |
| BR15 | Pick a Fight | "I want to draw a particular opponent into a confrontation on terms I can influence." |
| BR16 | Gun Club | "I want to use a ranged weapon effectively at arm's length when there's no space to fire." |
| BR17 | Melee Smash | "I want to make a measured melee blow hit harder instead of relying only on speed." |
| BR18 | Stunning Strike | "I want a forceful unarmed strike to stagger an opponent rather than simply wound them." |
| BR19 | Unbalance Opponent | "I want to upset an opponent's footing and make their next attack less dependable." |
| BR20 | Crowd Control | "I want to keep my footing and protect myself when several enemies crowd into reach." |
| BR21 | Disarm and Engage | "I want taking away an enemy's weapon to create an immediate close-combat opening." |
| BR22 | Reverse Strength | "I want to turn a physically stronger opponent's efforts against them in a close struggle." |

### Weapon Specialist — 9 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| WS01 | Disarming Attack | "I want a precise attack to separate an opponent from the weapon they trust." |
| WS02 | Weapon Specialization | "I want the weapon I've practiced with to deliver more decisive blows." |
| WS03 | Impaling Assault | "I want a penetrating strike to make it harder for an opponent to ignore the wound." |
| WS04 | Improved Suppression Fire | "I want the ability to suppress an opponent effectively when my equipment and tactics call for ranged fire." |
| WS05 | Stinging Assault | "I want a well-placed attack to leave an opponent feeling its effect after the initial hit." |
| WS06 | Crushing Assault | "I want a heavy strike to overwhelm someone who thought they could absorb it." |
| WS07 | Devastating Attack | "I want my chosen weapon to make a tough opponent more likely to feel the full force of a hit." |
| WS08 | Penetrating Attack | "I want to get a strike through defenses that would blunt a less practiced attack." |
| WS09 | Autofire Assault | "I want to use sustained fire when a close-combat duel turns into a larger engagement." |

### Melee Duelist — 9 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| MD01 | Advantageous Strike | "I want to punish the instant an opponent moves carelessly within my reach." |
| MD02 | Dirty Tricks | "I want to feint quickly enough that my opponent has less time to read my next strike." |
| MD03 | Dual Weapon Flourish I | "I want the opening created by one blade to let my second blade strike the same opponent." |
| MD04 | Dual Weapon Flourish II | "I want two-weapon attacks to become fast enough that I can commit to a full exchange without losing the moment." |
| MD05 | Master of Elegance | "I want precise handwork and agility, rather than brute strength, to put force behind a light blade." |
| MD06 | Multiattack Proficiency (advanced melee weapons) | "I want to deliver several blows with an advanced melee weapon without sacrificing control." |
| MD07 | Out of Nowhere | "I want a successful feint to lead immediately into a surprise strike with my blade." |
| MD08 | Single Weapon Flourish I | "I want to move freely through a duel even while committing to multiple strikes with one blade." |
| MD09 | Single Weapon Flourish II | "I want a full sequence of strikes with one blade to fit into the opening most opponents would use for a single attack." |

### Class feature — 1 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| CF01 | Master of Movement | "I want difficult terrain and obstacles to stop deciding where I can move in a duel." |

### Identity / neutral — 3 answers

| ID | Mechanical anchor (developer-only) | First-person player answer |
|---|---|---|
| ID01 | Single-combat identity | "I want the discipline to meet a formidable opponent alone without relying on spectacle or an audience." |
| ID02 | Capstone fulfillment | "I want to perfect the art of the duel for its own sake, without needing another title." |
| NEUTRAL | Undecided | "I want to understand the different approaches to close combat before choosing the style I will perfect." |

**Melee Duelist total:** 44 editorial candidates.  All talent/prerequisite mapping remains provisional pending canonical per-record verification.

## 26. The Force Unleashed Campaign Guide - six prestige-class Q1 editorial libraries (2026-11-14)
**Status: DRAFT ONLY.** Read-only repository checks and direct printed-book inspections; no class entry, acquired abilities, Mentor ownership, mechanical scoring or production source has been changed. The owner has requested the book pass in published order. No Q2-Q6 drafting or Q1 answer-count/UI policy decision is made here.
**Primary authority:** *The Force Unleashed Campaign Guide*, Chapter III, printed pp. 41-57, especially pp. 43-57 for six new prestige classes. Scans directly rendered from the project PDF and checked against the project searchable TXT. Supplemental tree names were checked in other uploaded searchable books when explicitly indicated. Repository inventory inspected read-only via `packs/classes.db`, `packs/talent_trees.db`, `data/prestige-class-prerequisites.json`, `data/dialogue/mentor-suggestions/mentor-personalities.json`, `data/dialogue/mentor_registry.json`, and six Mentor dialogue JSONs. Printed book outranks unchecked repository fields for canonical rule wording.
**Restriction:** Talent-anchored Q1 statements are aspirational descriptions, not evidence that a talent is owned, immediately legal, granted, or mechanically mapped to a specific archetype. Class-feature statements similarly describe future class development, not elective class talents. Preserve prerequisites and source limitations.

### Book-level source and repository audit
| Class | Mentor | Registered trees | Indexed talent anchors | Class-feature interest answers | Identity / neutral | Total draft responses |
|---|---|---:|---:|---:|---:|---:|
| Enforcer | Krag the Immovable | 2 | 11 | 2 | 3 | 16 |
| Independent Droid | Seraphim | 3 | 18 | 2 | 3 | 23 |
| Infiltrator | Delta | 4 | 27 | 2 | 3 | 32 |
| Master Privateer | The Captain | 4 | 34 | 2 | 3 | 39 |
| Medic | Kyber | 2 | 12 | 7 | 3 | 22 |
| Saboteur | Spark | 4 | 36 | 4 | 3 | 43 |
| **Total** |  | 19 | 138 | 19 | 18 | 175 |

**Original book-specific tree vs expansion distinction:** Original Chapter III talent choices must be interpreted alongside later explicitly granted prestige-tree expansions, not automatically inferred from any class sharing a base-class tree. Independent Droid Elite Droid and certain Autonomy/Specialized talents are from *Scavenger's Guide to Droids*; Master Privateer Piracy and related expanded choices are from *Scum and Villainy*, and a specific later Piracy talent occurs in *Rebellion Era Campaign Guide*. This bank is inclusive of the current registry without certifying that every expansion is legal in every era or at prestige entry.

### 1. Enforcer - Krag the Immovable

**Rules/source:** The Force Unleashed Campaign Guide, printed pp. 43–45 (PDF indices 43–45).

**Entry requirements (printed):** Minimum level 7; Gather Information and Perception trained; one Survivor/Survival-tree talent; membership in a law-enforcement or similar security organization.

**Class features:** Resources grants restricted/military equipment with value based on heroic level and accumulation option; Targeted Suspect begins at class level 2 after observing a suspect in combat.

**Mentor characterization:** Printed book admits both honest and corrupt officers, so dialogue must not assume virtue, corruption, police rank, or a past arrest.

**Mentor opening (DRAFT):**

> Got an organization behind you. Fine. That means nothing if you can't handle the next problem. You want to track somebody down, bring them in, or make sure they don't try anything? Pick what works.

**Q1:** As an Enforcer, which kind of investigative or enforcement expertise do you intend to develop?

**Talent-backed player response candidates:**

#### Survivor - 4 talent-anchored responses (core_shared)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| SV01 | Evasion | "I want to evade the worst of an explosion or other area attack when I cannot get clear." |
| SV02 | Extreme Effort | "I want a brief surge of strength when lifting an obstacle or carrying someone to safety demands it." |
| SV03 | Sprint | "I want to close the distance on a fleeing suspect before they disappear into the crowd." |
| SV04 | Surefooted | "I want rough ground and obstacles to slow me less when someone needs to be reached." |

#### Enforcement - 7 talent-anchored responses (tfu_printed)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| EN01 | Intentional Crash | "I want to disable a suspect's vehicle with a calculated ram without sacrificing my own vehicle." |
| EN02 | Pursuit | "I want to run a twisting chase route without losing speed every time it changes direction." |
| EN03 | Nonlethal Tactics | "I want reliable stun techniques that let me take a dangerous suspect alive." |
| EN04 | Respected Officer | "I want my standing to earn cooperation from people who would otherwise keep their distance." |
| EN05 | Cover Bracing | "I want to bring automatic fire under control quickly when cover is available." |
| EN06 | Slowing Stun | "I want a stunning attack to hinder a suspect's escape as well as wear them down." |
| EN07 | Takedown | "I want a charge to put a resisting opponent on the ground before they can recover." |

#### Class-feature development - 2 interest responses (not talents)
| ID | Class feature / future feature choice | First-person Q1 response |
|---|---|---|
| CF01 | Resources | "I want to make careful use of equipment supplied by my organization instead of paying for every tool personally." |
| CF02 | Targeted Suspect | "I want observation of a particular suspect to give me an edge when it is time to confront them." |

#### Identity / capstone / neutral
| ID | Role | First-person Q1 response |
|---|---|---|
| ID01 | identity / undecided | "I want to preserve public safety and take suspects alive whenever the circumstances permit." |
| ID02 | identity / undecided | "This work is the calling I earned. I want to become exceptional at it without needing another title." |
| NEUTRAL | identity / undecided | "I know there are several ways to enforce the rules. I want to understand them before choosing my specialty." |

**Enforcer total:** 16 candidate answers (11 talent linked + 2 feature-linked + 3 identity / undecided). **Not production-certified.**

#### Certification / implementation ledger (DRAFT)
1. Printed entry text calls the required tree "Survival" in one place, while class talent access and repository use "Survivor"; reconcile canonical token and printed wording.
2. Resources represents organizational restricted/military equipment, not a direct credit payout; verify deferral/ownership rules.
3. Do not require a police badge: corporate security and other qualifying organizations are legitimate printed examples.

### 2. Independent Droid - Seraphim

**Rules/source:** The Force Unleashed Campaign Guide, printed pp. 46–48; additional Elite Droid and expanded Autonomy/Specialized talents in Scavenger's Guide to Droids.

**Entry requirements (printed):** Minimum level 3; droid only; Use Computer trained; Heuristic Processor system.

**Class features:** Sapience (level 1) permits beneficial mind-affecting effects by choosing to suspend droid immunity and grants independence from behavioral inhibitors/restraining bolts. Independent Spirit begins at level 2 and increases a defense for a reaction once per encounter.

**Mentor characterization:** A program-breaking event is a recommended narrative origin, not a license to invent a specific memory wipe, owner, abuse, or event for the player.

**Mentor opening (DRAFT):**

> <Diagnostic: Independence confirmed.> Your former specifications describe a function. They do not determine your next decision. Will you defend your autonomy, modify your systems, or surpass the limits of your model? Choose deliberately.

**Q1:** As an Independent Droid, how do you intend to develop beyond your original programming?

**Talent-backed player response candidates:**

#### Autonomy - 7 talent-anchored responses (tfu_plus_droid_supplement)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| AU01 | Defensive Electronics | "I want my mind to resist attempts to reprogram my choices without permission." |
| AU02 | Ion Resistance 10 | "I want my systems to withstand ion damage that would disable an ordinary droid." |
| AU03 | Soft Reset | "I want a failsafe that brings me back online after certain nonlethal shutdowns." |
| AU04 | Modification Specialist | "I want to alter and reprogram my own systems without the usual self-maintenance penalty." |
| AU05 | Repair Self | "I want my repairs to restore more of my own structural integrity." |
| AU06 | Just a Droid | "I want to pass unnoticed as an ordinary unit when revealing my independence would be dangerous." |
| AU07 | Swift Droid | "I want a quick movement option when someone sees through my disguise or stealth." |

#### Specialized Droid - 7 talent-anchored responses (tfu_plus_droid_supplement)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| SD01 | Power Surge | "I want a temporary physical performance boost, even if it leaves my systems needing repairs afterward." |
| SD02 | Power Boost | "I want to use a power surge to overcome difficult jumps or increase my hover reach." |
| SD03 | Computer Language | "I want social communication skills to help me interface with computer systems in unusual ways." |
| SD04 | Computer Master | "I want to recover from failed contests against hostile computer security." |
| SD05 | Enhanced Manipulation | "I want precise movements to remain dependable even when someone threatens me." |
| SD06 | Hotwired Processor | "I want to overclock my processor for a brief advantage, despite the strain it leaves behind." |
| SD07 | Skill Conversion | "I want to reconfigure my trained routines so a different specialty becomes more refined." |

#### Elite Droid - 4 talent-anchored responses (droid_supplement_additional_tree)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| ED01 | Break Program | "I want to interrupt another droid's behavioral inhibitors through a compatible data link." |
| ED02 | Heuristic Mastery | "I want to apply flexible problem-solving even to skills outside my formal routines." |
| ED03 | Scripted Routines | "I want preset combat, defense, and skill routines ready when fast decisions matter." |
| ED04 | Ultra Resilient | "I want emergency safeguards that let me survive a blow exceeding my usual damage threshold." |

#### Class-feature development - 2 interest responses (not talents)
| ID | Class feature / future feature choice | First-person Q1 response |
|---|---|---|
| CF01 | Sapience | "I want my independence to include the choice to accept useful mental encouragement without surrendering my will." |
| CF02 | Independent Spirit | "I want to shield my chosen defenses by an act of self-determination when danger comes unexpectedly." |

#### Identity / capstone / neutral
| ID | Role | First-person Q1 response |
|---|---|---|
| ID01 | identity / undecided | "I want to decide what I am for myself, rather than let my original model or an owner define it." |
| ID02 | identity / undecided | "Independence is the goal I worked toward. I want to perfect it without needing a more prestigious designation." |
| NEUTRAL | identity / undecided | "My autonomy opens too many possibilities to select one yet. I want to examine them first." |

**Independent Droid total:** 23 candidate answers (18 talent linked + 2 feature-linked + 3 identity / undecided). **Not production-certified.**

#### Certification / implementation ledger (DRAFT)
1. The level-3 entry and droid-only requirement are exceptional; normal prestige-level assumptions must not be applied.
2. Elite Droid and Just a Droid/Swift Droid/Power Boost are not in the original Force Unleashed class chapter; these are explicit later additions from Scavenger's Guide to Droids.
3. Class pack uses a mixed-form UUID for Autonomy and `system.talent_trees` contains a UUID-like value; verify normalized identity before implementing tree access.
4. Sapience does not automatically negate all droid immunities; it enables a choice concerning mind-affecting effects.

### 3. Infiltrator - Delta

**Rules/source:** The Force Unleashed Campaign Guide, printed pp. 48–50 (PDF indices 48–50); shared Spy/Camouflage expansions elsewhere.

**Entry requirements (printed):** Minimum level 7; Perception and Stealth trained; Skill Focus (Stealth); two Camouflage or Spy talents.

**Class features:** Unarmed Stun begins at level 2 and scales at 6 and 10. Lead Infiltrator begins at level 4 and expands at level 8, sharing the infiltrator's Stealth check with limited allies.

**Mentor characterization:** The printed archetype includes both planted spies and aggressive commandos; no assumption of killing or a previous infiltration mission.

**Mentor opening (DRAFT):**

> Nice. You made it into a profession where nobody's supposed to remember your face. So what're we working on: getting inside, staying unnoticed, learning their secrets, or dropping a guard before the alarm goes off?

**Q1:** As an Infiltrator, which part of covert operations do you want to master?

**Talent-backed player response candidates:**

#### Camouflage - 10 talent-anchored responses (core_shared_plus_expansions)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| CA01 | Improved Stealth | "I want to conceal my movements reliably even when the opposition is actively looking for me." |
| CA02 | Hunker Down | "I want prepared cover to help me remain hidden under pressure." |
| CA03 | Total Concealment | "I want an enemy to have trouble targeting me even after they suspect where I am." |
| CA04 | Shadow Striker | "I want to exploit a hidden position when I finally choose to make an attack." |
| CA05 | Hidden Movement | "I want to move without giving away where I am going." |
| CA06 | Hide in Plain Sight | "I want to vanish from view when my circumstances offer little obvious cover." |
| CA07 | Dig In | "I want to prepare a concealed position that holds up when a mission turns dangerous." |
| CA08 | Ghost Assailant | "I want attacks from concealment to leave enemies unsure where the threat originated." |
| CA09 | Slip By | "I want to pass through guarded positions without giving sentries the opening they expect." |
| CA10 | Extended Ambush | "I want the first strike from hiding to shape more of the encounter before the enemy adjusts." |

#### Bothan SpyNet - 6 talent-anchored responses (tfu_printed_conditional)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| BS01 | Six Questions | "I want to learn a target's capabilities by asking just the right questions before an operation." |
| BS02 | Spynet Agent | "I want field intelligence contacts and information gathering to deepen my research skills." |
| BS03 | Bothan Resources | "I want intelligence contacts to help obtain equipment and transport at better terms." |
| BS04 | Knowledge Is Life | "I want reliable knowledge about a selected enemy to strengthen my defenses against them." |
| BS05 | Knowledge Is Power | "I want careful research to expose the best moment for a critical strike against one target." |
| BS06 | Knowledge Is Strength | "I want intelligence about a chosen opponent to improve my ability to hit them." |

#### Infiltration - 5 talent-anchored responses (tfu_printed)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| IT01 | Creeping Approach | "I want to close on an unaware sentry without giving them the usual chance to notice me." |
| IT02 | Always Ready | "I want to hold an action for the right moment without losing my place in the fight." |
| IT03 | Concealed Weapon Expert | "I want a second shot at a missed attack with a small concealable weapon, accepting the new result." |
| IT04 | Set for Stun | "I want a carefully prepared stun shot to incapacitate a guard more effectively." |
| IT05 | Silent Takedown | "I want an ambushed guard to be unable to call out an alarm immediately." |

#### Spy - 6 talent-anchored responses (tfu_shared_spy_tree)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| SY01 | Incognito | "I want a convincing disguise to survive scrutiny while I move through hostile circles." |
| SY02 | Improved Surveillance | "I want observations of a target to reveal more useful information before the mission begins." |
| SY03 | Traceless Tampering | "I want to alter a device without leaving a clear record that I was there." |
| SY04 | Blend In | "I want to disappear into a crowd rather than attract the attention of guards." |
| SY05 | Intimate Knowledge | "I want experience from past operations to make difficult knowledge checks more dependable." |
| SY06 | Surveillance | "I want observation of a marked target to help my allies coordinate their attacks against it." |

#### Class-feature development - 2 interest responses (not talents)
| ID | Class feature / future feature choice | First-person Q1 response |
|---|---|---|
| CF01 | Unarmed Stun | "I want an unarmed strike to disable a guard quietly when a blaster would give away the mission." |
| CF02 | Lead Infiltrator | "I want a team to follow my careful route without each member risking the whole operation." |

#### Identity / capstone / neutral
| ID | Role | First-person Q1 response |
|---|---|---|
| ID01 | identity / undecided | "I want to get in, learn what matters, and leave without a single unnecessary fight." |
| ID02 | identity / undecided | "The craft of infiltration is the career I wanted. I want to refine it rather than seek a new title." |
| NEUTRAL | identity / undecided | "I have not decided whether I favor disguises, stealth, intelligence, or close action. I want to understand each path." |

**Infiltrator total:** 32 candidate answers (27 talent linked + 2 feature-linked + 3 identity / undecided). **Not production-certified.**

#### Certification / implementation ledger (DRAFT)
1. Bothan Spynet requires Spynet Agent to access most talents. Spynet Agent requires Bothan species OR two Infiltration talents; do not treat non-Bothans as categorically excluded.
2. Lead Infiltrator is a class feature, not a talent selection; its ally count depends on Charisma bonus and line of sight.
3. Class record has literal "Bothan SpyNet" among `talent_trees` IDs and normalized UUID `d20682671d035cef` elsewhere; normalize typed IDs before implementation.

### 4. Master Privateer - The Captain

**Rules/source:** The Force Unleashed Campaign Guide, printed pp. 51–52; additional Master Privateer/Piracy and expanded Spacer options in Scum and Villainy and later supplements.

**Entry requirements (printed):** Minimum level 7; Deception and Pilot trained; Vehicular Combat; two talents from Misfortune, Smuggling, or Spacehound (later repository description says Spacer—requires exact source identity reconciliation).

**Class features:** Piracy is a progression restriction if character is lost to dark side, not a bonus loot feature; Veteran Privateer begins at class level 2 and offers occasional +2 on an attack.

**Mentor characterization:** Privateering is authorized raiding under a sponsor, not merely undirected piracy. Avoid asserting the player already owns a starship, crew, commission, or legal letter of marque.

**Mentor opening (DRAFT):**

> Ah, now that is a profession with a lovely reputation: respectable to whoever hires you, pirate to whoever you stop. Tell me—will you master the boarding action, preserve a prize worth taking, or make your crew's name carry farther than the ship?

**Q1:** As a Master Privateer, what kind of raiding or command expertise do you intend to develop?

**Talent-backed player response candidates:**

#### Infamy - 11 talent-anchored responses (core_shared_plus_expansions)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| IF01 | Frighten | "I want my arrival to make an opponent question whether fighting me is worth the risk." |
| IF02 | Inspire Fear II | "I want my reputation to help the crew hold its nerve under pressure." |
| IF03 | Terrify | "I want fear to make an enemy retreat when our ship or crew is in danger." |
| IF04 | Shared Notoriety | "I want the name I build to give my people an advantage when I am not beside them." |
| IF05 | Notorious | "I want my reputation to open doors and make hostile contacts reconsider an insult." |
| IF06 | Unsavory Reputation | "I want people to think twice before provoking an encounter with my crew." |
| IF07 | Inspire Fear III | "I want the fear I inspire to strengthen my allies even when danger closes in." |
| IF08 | Inspire Fear I | "I want my people to face difficult odds without losing their nerve." |
| IF09 | Fear Me! | "I want an opponent facing me to recognize the threat before I need to fire." |
| IF10 | Master Manipulator | "I want one successful negotiation to give me another chance to extract concessions." |
| IF11 | Small Favor | "I want favors owed across ports to yield useful information when I need it." |

#### Spacer - 7 talent-anchored responses (core_shared_plus_expansions)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| SP01 | Starship Raider | "I want to bring my crew's experience to bear when we board or attack enemy ships." |
| SP02 | Make a Break for It | "I want to disengage cleanly when staying in the fight would cost us our ship." |
| SP03 | Hyperdriven | "I want to press a ship's drive systems beyond ordinary performance when escape depends on it." |
| SP04 | Cramped Quarters Fighting | "I want to fight effectively in crowded passageways and cramped compartments." |
| SP05 | Stellar Warrior | "I want a lifetime in space to sharpen how I perform during a shipboard fight." |
| SP06 | Spacehound | "I want to operate confidently aboard starships even when conditions make others struggle." |
| SP07 | Deep Space Raider | "I want to exploit familiarity with remote space routes to gain an edge in raids." |

#### Privateer - 9 talent-anchored responses (tfu_printed)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| PV01 | Armored Spacer | "I want heavy protective gear to help me survive hazards during a boarding action." |
| PV02 | Boarder | "I want cover inside a ship's corridors to protect defenders less from my ranged attacks." |
| PV03 | Blaster and Blade III | "I want to turn a full exchange with pistol and blade into a faster attack sequence." |
| PV04 | Blaster and Blade II | "I want my melee weapon to strike with greater force even when I also carry a pistol." |
| PV05 | Attract Privateer | "I want to recruit a dependable lieutenant who can share the risks and rewards of a voyage." |
| PV06 | Blaster and Blade I | "I want one well-timed melee strike to create an opening for my pistol." |
| PV07 | Preserving Shot | "I want to disable a target ship rather than destroy the prize I came to claim." |
| PV08 | Ion Mastery | "I want ion weapons to disable vehicles and droids more reliably for capture." |
| PV09 | Multiattack Proficiency (advanced melee weapons) | "I want to make repeated close-combat attacks aboard ship without wasting accuracy." |

#### Piracy - 7 talent-anchored responses (scum_and_rebellion_expansion)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| PY01 | Bloodthirsty | "I want a swift defeat of one enemy to intimidate those still facing my crew." |
| PY02 | Raider's Frenzy | "I want a coordinated attack to turn one successful hit into greater pressure from the crew." |
| PY03 | Raider's Surge | "I want my nerve and presence to unsettle several opponents before we close the distance." |
| PY04 | Savage Reputation | "I want my reputation to make hostile forces hesitate when they recognize me." |
| PY05 | Fight to the Death | "I want my crew to keep fighting through a dangerous assault when there is no safe retreat." |
| PY06 | Take Them Alive | "I want a raid to end in live prisoners rather than unnecessary deaths when a target is subdued." |
| PY07 | Keep Them Reeling | "I want to force an enemy to lose position when a close-quarters strike finds its mark." |

#### Class-feature development - 2 interest responses (not talents)
| ID | Class feature / future feature choice | First-person Q1 response |
|---|---|---|
| CF01 | Piracy class restriction | "I want to maintain the discipline of a privateer without letting raiding become indiscriminate predation." |
| CF02 | Veteran Privateer | "I want experience from repeated engagements to give me a precise edge when I attack." |

#### Identity / capstone / neutral
| ID | Role | First-person Q1 response |
|---|---|---|
| ID01 | identity / undecided | "I want to be known for taking valuable prizes while preserving ships and lives whenever possible." |
| ID02 | identity / undecided | "I want this freedom and responsibility to be my career, not preparation for another title." |
| NEUTRAL | identity / undecided | "I have not settled on boarding, command, ship combat, or reputation as my specialty." |

**Master Privateer total:** 39 candidate answers (34 talent linked + 2 feature-linked + 3 identity / undecided). **Not production-certified.**

#### Certification / implementation ledger (DRAFT)
1. Original Force Unleashed class page grants Infamy and Privateer; later Scum and Villainy adds Piracy and expands available talents. Repository lists Infamy/Spacer/Privateer/Piracy. Verify the later grant list for possible Fortune access.
2. Printed prerequisite reads Spacehound, not Spacer in the original book (searchable OCR shows "Space-hound"); reconcile names, not assume alias or change requirement.
3. Piracy class feature is a restriction on taking further levels if lost to dark side, not an automatic mechanical reward for piracy.
4. Privateer Attract Privateer grants a nonheroic lieutenant with XP-sharing consequences; it does not create a fully free player-controlled heroic companion.
5. Verify per-talent identities for Piracy expansions due to poor searchable OCR quality in Scum and Villainy; do not equate same-name Keep Them Reeling with Rebellion Era Ambusher tree.

### 5. Medic - Kyber

**Rules/source:** The Force Unleashed Campaign Guide, printed pp. 53–54, including seven printed Medical Secrets.

**Entry requirements (printed):** Minimum level 7; Knowledge (life sciences) and Treat Injury trained; Surgical Expertise feat.

**Class features:** Talents at odd Medic levels; Medical Secrets at even levels. Individual Medical Secrets are distinct choices with one-time selection restrictions and do not arrive at Medic level 1.

**Mentor characterization:** Medic covers altruistic practitioners, corporate doctors, ship medics, back-alley clinics, and criminal physicians; do not assume moral alignment or prior rescues.

**Mentor opening (DRAFT):**

> Welcome to the part of the job where somebody else's bad day becomes your emergency. You can learn to work faster, save someone the others have given up on, or keep your hands steady while the room falls apart. Which skill needs the training?

**Q1:** As a Medic, what kind of healing or emergency-care expertise do you want to develop?

**Talent-backed player response candidates:**

#### Survivor - 4 talent-anchored responses (core_shared)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| SV01 | Evasion | "I want to survive area attacks long enough to reach my patients afterward." |
| SV02 | Extreme Effort | "I want a brief surge of strength when lifting an obstacle or carrying someone to safety demands it." |
| SV03 | Sprint | "I want to cross a battlefield fast when an injured patient needs me now." |
| SV04 | Surefooted | "I want unstable terrain to interfere less with getting someone to safety." |

#### Advanced Medicine - 8 talent-anchored responses (tfu_printed)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| AM01 | Natural Healing | "I want to treat injuries and illness using appropriate natural substitutes when standard equipment is unavailable." |
| AM02 | Extra First Aid | "I want to give a patient an additional first-aid treatment when the usual daily limit is not enough." |
| AM03 | Battlefield Medic | "I want first aid to take less time while danger continues around us." |
| AM04 | Bring Them Back | "I want a better chance to revive someone who has been dead longer than the normal window." |
| AM05 | Second Chance | "I want a failed treatment to avoid making an already critical patient worse." |
| AM06 | Emergency Team | "I want to coordinate other helpers so their assistance improves difficult treatment reliably." |
| AM07 | Medical Miracle | "I want my care to help a conscious patient find the strength for a second wind at a crucial moment." |
| AM08 | Steady Under Pressure | "I want a second attempt at a medical check when the first result is not good enough." |

#### Class-feature development - 7 interest responses (not talents)
| ID | Class feature / future feature choice | First-person Q1 response |
|---|---|---|
| CF01 | Medical Secret: Improved First Aid | "I want skilled first aid to restore more health through the same treatment." |
| CF02 | Medical Secret: Improved Heal Damage | "I want surgery to restore more health after a serious injury." |
| CF03 | Medical Secret: Improved Long-Term Care | "I want ongoing care to accelerate a recovering patient's healing." |
| CF04 | Medical Secret: Improved Perform Surgery | "I want to complete necessary surgery in less time when waiting could be dangerous." |
| CF05 | Medical Secret: Improved Revivify | "I want to attempt resuscitation quickly, before the opportunity closes." |
| CF06 | Medical Secret: Improved Treatment | "I want to treat disease or radiation faster and help more patients at once." |
| CF07 | Medical Secret: Personal Physician | "I want to treat my own injuries without the normal self-treatment penalty." |

#### Identity / capstone / neutral
| ID | Role | First-person Q1 response |
|---|---|---|
| ID01 | identity / undecided | "I want to keep people alive in the places where proper hospitals cannot reach them." |
| ID02 | identity / undecided | "I have reached the profession I wanted. I want to keep refining medicine rather than pursuing another rank." |
| NEUTRAL | identity / undecided | "I want to understand the different medical specialties before committing to one." |

**Medic total:** 22 candidate answers (12 talent linked + 7 feature-linked + 3 identity / undecided). **Not production-certified.**

#### Certification / implementation ledger (DRAFT)
1. Printed Medical Secrets are seven distinct even-level class-feature selections; do not display as level-1 talent grants.
2. Bring Them Back extends the revivify time window; Improved Revivify changes the action cost; keep these distinct.
3. The printed book lists poison for Natural Healing, but Improved Treatment addresses disease or radiation; preserve the published categories.

### 6. Saboteur - Spark

**Rules/source:** The Force Unleashed Campaign Guide, printed pp. 55–57; shared Slicer/Misfortune expansions elsewhere.

**Entry requirements (printed):** Minimum level 7; Deception, Mechanics, and Use Computer trained.

**Class features:** Unexpected Results at level 1; Destructive at level 2; Quick Sabotage at 4,6,8; Master Saboteur at 10. These are automatic class features, not selectable talents.

**Mentor characterization:** Printed text favors precision and minimizing collateral damage; Spark is enthusiastic about targeted effects, not indiscriminate explosions.

**Mentor opening (DRAFT):**

> Good sabotage doesn't break everything. It breaks the one thing that makes everything else work. Want to cut a circuit, reshape a blast, assemble a turret, or make their whole operation stumble? Let's choose the interesting failure point.

**Q1:** As a Saboteur, what kind of disruption or technical expertise do you want to master?

**Talent-backed player response candidates:**

#### Misfortune - 17 talent-anchored responses (core_shared_plus_expansions)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| MF01 | Sudden Strike | "I want to use a sudden opening before an enemy has time to defend against it." |
| MF02 | Sneak Attack | "I want an unsuspecting guard to suffer the consequences of leaving their defenses open." |
| MF03 | Befuddle | "I want to interrupt an enemy's decision-making long enough to give the operation time to move." |
| MF04 | Hesitate | "I want doubt to slow an opponent at the moment they expect to act." |
| MF05 | Walk the Line | "I want to provoke an opponent into mistakes that disrupt their ability to fight." |
| MF06 | Sow Confusion | "I want confusion among enemies to upset their coordination without a direct confrontation." |
| MF07 | Skirmisher | "I want repositioning between attacks to make my next shot more dependable." |
| MF08 | Disruptive | "I want to deny enemies the teamwork bonuses they rely on." |
| MF09 | Cunning Strategist | "I want intelligence and preparation to turn the enemy's habits against them." |
| MF10 | Weakening Strike | "I want a precise attack to weaken the target's next attempt to fight back." |
| MF11 | Dastardly Strike | "I want a hit against an unprepared enemy to impair their ability to keep fighting." |
| MF12 | Improved Skirmisher | "I want constant movement to improve my attacks without remaining exposed." |
| MF13 | Seize Object | "I want an opening to take or disable the object an enemy needs for their plan." |
| MF14 | Stymie | "I want to interfere with the skill an opponent is depending on to stop us." |
| MF15 | Backstabber | "I want a surprise opening against an enemy to make a close attack count." |
| MF16 | Improved Sneak Attack | "I want to deepen the effectiveness of an ambush when the target is truly vulnerable." |
| MF17 | Seducer | "I want social influence to coax information out of someone before they realize the cost." |

#### Slicer - 7 talent-anchored responses (core_shared)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| SL01 | Electronic Sabotage | "I want to lock down a computer terminal so that unauthorized operators struggle to gain access." |
| SL02 | Electronic Forgery | "I want my technical skills to make forged electronic credentials look convincing." |
| SL03 | Security Slicer | "I want to bypass electronic security that would stop an ordinary operator." |
| SL04 | Trace | "I want to follow a transmission or digital trail back to where it began." |
| SL05 | Gimmick | "I want an electronic device to perform a useful function it was not intended to perform." |
| SL06 | Virus | "I want to introduce software that disrupts the system relying on it." |
| SL07 | Master Slicer | "I want to overcome sophisticated computer defenses through focused technical expertise." |

#### Sabotage - 6 talent-anchored responses (tfu_printed)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| SB01 | Device Jammer | "I want to disable a chosen category of nearby electronics without detonating a charge." |
| SB02 | Shaped Explosion | "I want a blast directed toward its objective instead of spreading equally in every direction." |
| SB03 | Droid Jammer | "I want a jammer that interferes with hostile droids while they remain in range." |
| SB04 | Mine Mastery | "I want to deploy a mine quickly when the team has little time to prepare." |
| SB05 | Skilled Demolitionist | "I want to set a charge faster and with less risk of it detonating during setup." |
| SB06 | Extreme Explosion | "I want to extend an explosive blast when a larger target truly requires it." |

#### Turret - 6 talent-anchored responses (tfu_printed)
| ID | Exact repository talent anchor (developer only) | First-person Q1 response |
|---|---|---|
| TU01 | Turret Self-Destruct | "I want a turret to self-destruct when destroyed, denying enemies an intact machine." |
| TU02 | Blaster Turret II | "I want a sturdier turret I can direct without standing immediately beside it." |
| TU03 | Blaster Turret I | "I want to construct a temporary automated blaster turret for a specific encounter." |
| TU04 | Stun Turret | "I want a turret designed to incapacitate targets rather than inflict lethal wounds." |
| TU05 | Blaster Turret III | "I want a tougher deployable turret able to attack twice in a round at an accuracy cost." |
| TU06 | Ion Turret | "I want a turret whose ion attacks disable hostile droids or equipment rather than relying on ordinary damage." |

#### Class-feature development - 4 interest responses (not talents)
| ID | Class feature / future feature choice | First-person Q1 response |
|---|---|---|
| CF01 | Unexpected Results | "I want enemy weapons to malfunction unexpectedly when a disastrous attack roll exposes their weakness." |
| CF02 | Destructive | "I want attacks against unattended equipment and vehicles to be significantly more destructive." |
| CF03 | Quick Sabotage | "I want to disable increasingly complex equipment with less preparation time." |
| CF04 | Master Saboteur | "I want enough technical mastery to retry a failed disable-device or explosives check and keep the better result." |

#### Identity / capstone / neutral
| ID | Role | First-person Q1 response |
|---|---|---|
| ID01 | identity / undecided | "I want to make systems fail in ways that stop the enemy while minimizing harm to people nearby." |
| ID02 | identity / undecided | "Mastering this work is the career I chose. I want to keep learning how things fail, not seek another title." |
| NEUTRAL | identity / undecided | "I have not decided whether I prefer slicing, demolition, turrets, or covert disruption. I want to explore them first." |

**Saboteur total:** 43 candidate answers (36 talent linked + 4 feature-linked + 3 identity / undecided). **Not production-certified.**

#### Certification / implementation ledger (DRAFT)
1. Two same-named Keep Them Reeling talents exist across the corpus; never match by display text without tree/source identity.
2. Blaster Turret II/III, Ion Turret, Stun Turret, and Turret Self-Destruct require the printed Blaster Turret prerequisite chain; preserve encounter and proximity constraints.
3. Droid Jammer does not affect droids immune to restraining bolts; preserve that printed exception.
4. All sabotage/equipment effects require canonical V2 object, droid, device, and turret fields; editorial Q1 cannot create runtime effects.

### Core + KOTOR + Force Unleashed first-pass checkpoint
- Core Rulebook new prestige/apex Q1: **12/12 classes** in earlier sections.
- KOTOR Campaign Guide new prestige Q1: **3/3 classes** in earlier sections.
- Force Unleashed Campaign Guide new prestige Q1: **6/6 classes** drafted here.
- **Total first-pass prestige classes: 21/32** in the earlier 32-class repo census; still owner-unapproved and mechanically uncertified.
- Approved Q1 answer-selection policy remains **DEFERRED**; do not promote draft counts or the earlier Ace Pilot presentation proposal into a mandatory UI contract.
- No GitHub write, commit, migration, backward-compatibility shim, or Foundry production change is authorized by this file.



## 27. Scum and Villainy - Outlaw-focused historical pass and Master Privateer addendum (2026-11-14)

**Status:** DRAFT ONLY. Source-book chronological pass following *The Force Unleashed Campaign Guide*. This dated pass authored **Outlaw** (pp. 34-35) only. **CORRECTED BOOK CENSUS (v0.26):** *Scum and Villainy* actually introduces three prestige classes—**Assassin, Charlatan and Outlaw**; Assassin and Charlatan were added later in §§34–35. Its pp. 32-33 present an **updated reprint** of **Master Privateer**, not a fourth new class. This section is appended to v0.21; earlier twenty-one class libraries are unchanged. No GitHub modifications, commits, UI selection/count contracts, Q2-Q6 drafting, or mechanical scoring.

**Primary sources directly inspected:** *Scum and Villainy* printed pp. 32-35, including the reprinted Master Privateer rules and Outlaw's full printed class/talent progression (local PDF page indices 33-36); *Core Rulebook* printed Fringer and Survivor talent sections; *The Force Unleashed Campaign Guide* printed Slicer expansion; the attached searchable text editions served as locating aids. Repository read-only: `packs/classes.db`, `packs/talent_trees.db`, `data/prestige-class-prerequisites.json`, `data/dialogue/mentor_registry.json`, `data/dialogue/mentors/rogue/rogue_dialogue.json`, `data/dialogue/mentor-suggestions/mentor-personalities.json`, prestige Q1 profile and existing Outlaw survey skeleton. Printed rule text wins where an unchecked database label conflicts.

### 27.1 Book and class census

| Book content | Treatment |
|---|---|
| Outlaw (new prestige class) | New 32-candidate Q1 bank; 26 currently source-supported editorial candidates and 6 quarantined talent candidates. |
| Master Privateer (reprinted/updated from Force Unleashed) | Source-access reconciliation with prior Master Privateer v0.21; NOT counted as a new prestige class. |
| Expansions to Core prestige talents and base talent trees | Previously reflected where verified; this is a source checkpoint, not permission to treat any same-name registry talent as canon. |

**Updated count:** 22 of 32 repository prestige-class identities now have first-pass Q1 draft libraries (12 Core, 3 KOTOR, 6 Force Unleashed, 1 Scum and Villainy). Owner approval, mechanical certification, source tree eligibility, and live runtime correctness remain separate.

### 27.2 Outlaw - Rogue

**Published entry requirements (p. 34):** Minimum character level 7; trained Stealth and Survival; at least one talent from **Disgrace** or **Misfortune**; wanted by authorities in at least one star system. **Disgrace and Misfortune are qualification trees, not automatically new Outlaw selectable class trees.**

**Published class features:** +2 Fortitude and +4 Reflex class defense bonuses on entering; one talent at Outlaw levels 1, 3, 5, 7, 9; **Fugitive** at levels 2, 4, 6, 8, 10. Fugitive is an encounter-limited increase to withdrawal movement, scaling +1 to +5 squares; it is not a talent or a permanent base-speed increase. Published talent access: **Outlaw, Slicer, Fringer, Survivor**. Hit die d8, medium base attack.

**Mentor source:** registry `rogue` -> ID `m23`, dedicated path `data/dialogue/mentors/rogue/rogue_dialogue.json`, display name Rogue, title 'The Untouchable'. Established voice: confident, amused, unapologetic, self-determining; values freedom and turning pursuit into a game. Do NOT imply a specific crime, prison escape, bounty amount, rebel affiliation or personally shared history just because the character legally qualifies.

**Mentor introduction (DRAFT):**

> Someone in authority wants you caught. Congratulations - they finally admitted you matter. You can run, disappear, outsmart them, or turn their own pursuit against them. So tell me: which part of staying free are you going to make an art?

**Q1:** Now that you have earned a place among the outlaws, how do you want to protect your freedom?

**Player-answer authoring:** All text below is an interest in future development, not an ownership claim or a level-1 ability grant. Quarantined entries stay visible to reviewers with their provenance problem, but are **not eligible for player-facing publication** before primary-source resolution.


#### Outlaw - 8 indexed talents (8 source-supported draft; 0 quarantine)

| ID | Exact talent anchor (developer-only) | First-person Q1 response | Source / restriction |
|---|---|---|---|
| `OL-OL01` | Uncanny Instincts | "I want a blow that catches me off guard to become my chance to slip out of reach before the next one lands." | Source verified: once/encounter reaction after taking damage; move 1 square, no attacks of opportunity. |
| `OL-OL02` | Tangle Up | "I want one well-placed attack to stop a pursuer from moving again so soon." | Source verified: standard-action single non-area attack; opponent loses next move action; requires Uncanny Instincts. |
| `OL-OL03` | Confounding Attack | "I want a pursuer who hurts me to discover that I can counterattack and change places before they regain their footing." | Source verified: forgo Uncanny Instincts movement; attack as reaction, successful damaging melee attack switches positions; requires Tangle Up, Uncanny Instincts. |
| `OL-OL04` | Seize the Moment | "I want to act the instant an ally creates an opening against a common enemy." | Source verified: once/round reaction to ally damaging a target; extra swift action. |
| `OL-OL05` | Find an Opening | "I want an ally-created opening to give me time to line up my next attack more carefully." | Source verified: forgo Seize the Moment extra swift; aim as single swift on following turn; requires Seize the Moment. |
| `OL-OL06` | Double Up | "I want to turn an ally-created opening into an immediate attack, making our combined effort count against hard targets." | Source verified: once/encounter, forgo extra swift to immediate attack; combine damage for DR/SR/damage threshold; requires Find an Opening, Seize the Moment. |
| `OL-OL07` | Opportunistic Defense | "I want to meet an enemy hit with a sudden defensive stance instead of always retreating." | Source verified: forgo Uncanny Instincts movement; +5 Reflex through end of next turn; requires Uncanny Instincts. |
| `OL-OL08` | Preternatural Senses | "I want my instincts to sharpen the defense that matters most when danger arrives." | Source verified: once/encounter reaction add half class level to one defense score. |

#### Fringer - 9 indexed talents (4 source-supported draft; 5 quarantine)

| ID | Exact talent anchor (developer-only) | First-person Q1 response | Source / restriction |
|---|---|---|---|
| `OL-FR01` | Barter | "I want to negotiate better deals when supplies and credits determine how far I can get." | CORE SOURCE VERIFIED: reroll Persuasion to haggle, accept reroll. |
| `OL-FR02` | Fringe Savant | "I want an exceptional feat of skill to give me one more reserve of luck when I need it." | CORE SOURCE VERIFIED: natural 20 on skill check in encounter grants temporary Force Point. |
| `OL-FR03` | Long Stride | "I want to travel light and stay a step ahead of anyone trying to run me down." | CORE SOURCE VERIFIED: speed increases when light/no armor, not medium/heavy. |
| `OL-FR04` | Jury-Rigger | "I want to improvise the repair that keeps my gear or getaway working when proper parts are out of reach." | CORE SOURCE VERIFIED: reroll Mechanics on jury-rigged repair; accept reroll. |
| `OL-FR05` | Surge | "I want a sudden reserve of effort to help me push through a dangerous moment." | QUARANTINE: repository-indexed name; exact Fringer-tree printed provenance/mechanics not established. |
| `OL-FR06` | Keep it Together | "I want equipment I depend on to withstand damage long enough for me to escape." | QUARANTINE: Core text names Keep It Together in the SPACE(R) tree rather than printed Fringer tree; potential cross-tree registry contamination. |
| `OL-FR07` | Flee | "I want escape to remain an option even when my enemies think they have closed the last route." | QUARANTINE: repository-indexed; cannot certify printed Fringer talent identity. |
| `OL-FR08` | Sidestep | "I want to move away from a threat before it can pin me where I stand." | QUARANTINE: repository-indexed; cannot certify printed Fringer talent identity. |
| `OL-FR09` | Swift Strider | "I want to improve my pace when every square of movement decides whether I am caught." | QUARANTINE: repository-indexed; cannot certify printed Fringer talent identity. |

#### Survivor - 4 indexed talents (4 source-supported draft; 0 quarantine)

| ID | Exact talent anchor (developer-only) | First-person Q1 response | Source / restriction |
|---|---|---|---|
| `OL-SV01` | Evasion | "I want to escape the worst of area attacks without having to withstand every blast." | CORE SOURCE VERIFIED: area-attack mitigation depends on whether attack hits or misses. |
| `OL-SV02` | Extreme Effort | "I want one brief surge of strength when a barricade or obstacle blocks the only way out." | CORE SOURCE VERIFIED: two swift actions for bonus to one Strength-based check same round. |
| `OL-SV03` | Sprint | "I want to run farther when I must break pursuit before my enemies can regroup." | CORE SOURCE VERIFIED: run action 5x speed rather than 4x. |
| `OL-SV04` | Surefooted | "I want rough ground to slow my pursuers more than it slows me." | CORE SOURCE VERIFIED: speed not reduced by difficult terrain. |

#### Slicer - 7 indexed talents (6 source-supported draft; 1 quarantine)

| ID | Exact talent anchor (developer-only) | First-person Q1 response | Source / restriction |
|---|---|---|---|
| `OL-SL01` | Electronic Sabotage | "I want to lock down a computer terminal so the people chasing me cannot easily use it after I leave." | FORCE UNLEASHED VERIFIED: Use Computer-based lockdown and attitude mechanics; trained Use Computer prerequisite. |
| `OL-SL02` | Electronic Forgery | "I want forged digital credentials to hold up when access depends on convincing electronic records." | FORCE UNLEASHED VERIFIED: Use Computer in place of Deception for forged electronic documents; trained Use Computer prerequisite. |
| `OL-SL03` | Security Slicer | "I want to neutralize a security system without depending on specialized tools every time." | FORCE UNLEASHED VERIFIED: Mechanics checks without security kit and altered failure threshold; trained Mechanics prerequisite. |
| `OL-SL04` | Trace | "I want to use networks and terminals to learn what ordinary inquiries cannot reveal about a pursuit." | CORE SOURCE VERIFIED: substitute Use Computer for Gather Information with network access. |
| `OL-SL05` | Gimmick | "I want to work a computer quickly enough that a routine command barely costs me a moment." | CORE SOURCE VERIFIED: routine command as swift action. |
| `OL-SL06` | Master Slicer | "I want to be able to try again when a stubborn computer refuses to grant me access." | CORE SOURCE VERIFIED: reroll Use Computer to improve access, keeping better result; requires Gimmick. |
| `OL-SL07` | Virus | "I want to learn to disrupt a system remotely rather than rely on leaving a visible mark." | QUARANTINE: repo index names Virus; published Slicer talent with this identity/effect not certified in consulted Core and Force Unleashed passages. |


#### Outlaw class-feature development and identity options

| ID | Development / function | First-person Q1 response |
|---|---|---|
| `OL-CF01` | Fugitive (automatic at class levels 2-10; not talent) | "I want to turn every withdrawal into a little more distance before the authorities can close in." |
| `OL-ID01` | Alternative moral/role identity | "I want to use my life outside the law to help people the authorities have failed or betrayed." |
| `OL-ID02` | Career capstone / fulfillment | "I worked to live on my own terms. I could spend my whole career protecting that freedom without needing another title." |
| `OL-NEUTRAL` | Genuine uncertainty | "I'm not sure whether speed, stealth, technical skill, or quick thinking will define me. I want to explore what keeps me free." |

**Totals:** 28 indexed talent-name answers (8 Outlaw, 9 Fringer, 4 Survivor, 7 Slicer), plus one class-feature and three identity/neutral responses = **32 editorial candidate answers**. Of 28 talent-indexed names, **6 are quarantined**, leaving **22 source-supported talent candidates**, plus four class-feature/identity candidates = **26 currently usable *editorial* candidates** (NOT mechanically certified, automatically legal, or implementation-approved).

### 27.3 Master Privateer - explicit supplemental reconciliation (no second class)

*Scum and Villainy* printed p. 32 explicitly says its Master Privateer presentation is an update to *The Force Unleashed Campaign Guide* and explicitly permits using Force Unleashed Master Privateer talents **in addition to** the reprint's talent list. Printed p. 33 lists Piracy, Infamy and Spacer in the updated version; the *Force Unleashed* original includes the original-specific Privateer tree. Accordingly the repository union of **Infamy, Spacer, Privateer, Piracy** has *publication-level* support, but individual talents, printed prerequisites and era/campaign policy still require certification. Do not mistake the reprint's omission of the original Privateer tree from its *local* list for its revocation: the book expressly says to retain earlier available talents.

The updated reprint on p. 33 lists entry **two talents from Misfortune**, rather than the repository's wider `Misfortune / Smuggling / Spacer` prerequisite alternatives. Flag this as a source/house-rule difference, not as silently certified revised entry law. The book additionally highlights piracy with **Take Them Alive**, allowing a raider to spare a defeated opponent; the existing Captain Q1 bank should preserve this nonlethal identity alongside fear/violence. The bank is already present at §26 and is NOT duplicated here.

### 27.4 Source certification and implementation debt (DRAFT)

1. **Fringer tree mismatch:** Core Rulebook clearly defines Barter, Fringe Savant, Jury-Rigger and Long Stride. Five repository names (Surge, Keep it Together, Flee, Sidestep, Swift Strider) were not verified as printed Fringer talents in this source pass; Keep It Together is visibly printed under the **Spacer** tree. Treat all five as quarantined until exact identity / source and tree access are certified.
2. **Slicer extra name:** Core Slicer plus *Force Unleashed* expansion provide verified Gimmick, Master Slicer, Trace, Electronic Forgery, Electronic Sabotage, Security Slicer. Repository also indexes **Virus**. Without its exact published talent source and mechanics, quarantine it.
3. **Talent prerequisites:** Confounding Attack needs Tangle Up and Uncanny Instincts; Double Up needs Find an Opening and Seize the Moment; Opportunistic Defense and Tangle Up need Uncanny Instincts; Find an Opening needs Seize the Moment. Do not show these as immediate level-1 picks without the actual actor's prerequisite state.
4. **Class-feature differentiation:** Fugitive applies to **withdrawal** movement and is encounter-limited; never use as passive base-speed bonus, bonus movement on every round, a talent, or a starting feature.
5. **Legal status at entry:** Being wanted somewhere is an explicit printed entry requirement, but no particular crime, bounty, faction or imprisonment is established. Rogue's previously authored greetings sometimes invent posters, bounty history, and escapes; gate them on verified character history if reused.
6. **Source distinction:** Disgrace/Misfortune are Outlaw entry talent requirements, not selectable class talent trees; do not expand the class Q1 bank with them by default.
7. **Master Privateer reprint:** Printed text explicitly carries forward the original Privateer talent access while listing additional Piracy and Spacer. Preserve the p. 33 entry-prerequisite mismatch in a rules-source ledger and do not silently override the project's house rule.
8. **Published-book census:** Do not count this updated Master Privateer presentation as a second new prestige class; update completion to **22/32** only.
9. **Existing profile entries:** Two `outlaw:` entries were found in `prestige-survey-profiles.js`; confirm whether they belong to distinct objects or create competing runtime authorities before implementation. No production code changed.
10. **Presentation policy remains deferred:** Do not infer one-per-tree, fixed answer count, weighting, automatic archetype inference, or new choices/conditions from this editorial inventory.

**Change log (local v0.22):** Inspected printed Scum and Villainy pp. 32-35 and searchable source; read the Rogue mentor dialogue and class/tree/prerequisites read-only on GitHub. Appended Outlaw's 32-candidate Q1 bank with six explicit source quarantines, plus publication-level Master Privateer reprint reconciliation. Earlier §1-26 copied intact except top-level revision/scope header. No git edits/commits.

## 28. Clone Wars Campaign Guide — three new prestige-class Q1 libraries (2026-11-14; local v0.23)

**Status: EDITORIAL FIRST PASS, NOT PLAYER-READY OR MECHANICALLY CERTIFIED.** The source printed *The Clone Wars Campaign Guide* chapter 3, prestige section pp. 42–47, was inspected using supplied searchable text and selected rendered PDF pages. Read-only repo data: `packs/classes.db`, `packs/talent_trees.db`, `data/prestige-class-prerequisites.json`, Mentor registry, personality file, individual dedicated dialogue JSON, and prestige survey profiles. Supplemental shared-tree talent names are exact repository inventory anchors but not each certified against publication in this turn. No changes to code or GitHub.

### 28.1 New class census and design guardrails

| Printed new prestige class | Mentor (registry) | Selectable tree families | Talent-indexed answer count | Total Q1 options |
|---|---|---|---:|---:|
| Droid Commander | General Axiom | Droid Commander, Inspiration, Leadership | 26 | 30 |
| Military Engineer | Chief Engineer Rax | Military Engineer, Outlaw Tech | 14 | 18 |
| Vanguard | Shield Captain Theron | Vanguard, Awareness, Survivor | 20 | 24 |

**Book-wide:** 60 one-to-one named-talent editorial anchors plus 3 future class-feature directions, 6 identity/capstone directions, 3 genuine-uncertainty choices = **72 Q1 candidates across 3 classes**. These are *not* talent grants. The three new classes are separate from any already-inventoried expansions to existing classes. Do not confuse class qualification trees with normal talent access. Q1 answer visibility, rotation, scoring, ontology mapping, recommendation engine, Q2–Q6, or Foundry implementation remain deferred.


### 28.2 Droid Commander — General Axiom (30 Q1 draft answers)


**Mentor voice, from dedicated dialogue source:** General Axiom uses clinical declarations, efficient tactical calculations, and procedural imperatives; this voice differs from the self-ownership emphasis of Seraphim for Independent Droid.


**Mentor Q1 introduction (DRAFT):**

> <Assessment: Command eligibility confirmed.> A unit is not effective because its orders are loud. It is effective because information, timing, and support reach the right droids. Identify your priority: coordination, resilience, or decisive action.

**Question:** As a Droid Commander, which command function do you intend to develop?


**Published eligibility:** Character level 7; trained Knowledge (tactics), Use Computer; at least one Leadership OR Commando talent; **droids only**. The qualification talent is distinct from the selectable class talent trees (Droid Commander, Inspiration, Leadership). **Networked Mind** starts at class level 2 and scales to five selected droid allies by level 10. It enables beneficial mind-affecting effects on selected droid allies and a communication-based line-of-sight relation; it does not grant universal mind-affecting immunity bypass or perfect network reach through jammed comlinks. Prerequisite to **Automated Strike**: Double Attack with the relevant weapon. **Droid Mettle**, **Overclocked Troops**, and **Reinforced Commands** require Droid Defense; Inspire Competence requires Expanded Sensors. This class does not imply a specific Separatist/Republic allegiance or ownership of a squad.


#### Droid Commander — 8 indexed talent anchors

**Authority status:** Clone Wars printed pp. 43–44 (8 named talents); source text visually checked. A proposed answer does not assert present ownership.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `DC-DCT01` | Expanded Sensors | "I want the droids with me to share sighting reports so one unit detecting a threat helps the others respond." |
| `DC-DCT02` | Droid Defense | "I want tactical information to improve my droid allies' defenses when an attack is imminent." |
| `DC-DCT03` | Automated Strike | "I want to coordinate a burst of extra attacks from properly equipped droid allies when the opening appears." |
| `DC-DCT04` | Droid Mettle | "I want to reinforce a damaged droid ally long enough for it to survive the next exchange." |
| `DC-DCT05` | Inspire Competence | "I want to calculate the one adjustment that makes an ally's next attack more precise." |
| `DC-DCT06` | Maintain Focus | "I want my droid allies to recover from combat penalties more efficiently when the pressure rises." |
| `DC-DCT07` | Overclocked Troops | "I want networked droids to reposition immediately on command rather than lose the opportunity to move." |
| `DC-DCT08` | Reinforced Commands | "I want the morale and insight benefits I transmit to droid allies to carry greater effect." |

#### Inspiration — 7 indexed talent anchors

**Authority status:** Core and later supplements; exact talent-by-talent expansion/chain not fully certified in this pass. A proposed answer does not assert present ownership.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `DC-INS01` | Ignite Fervor | "I want one successful strike of mine to give an ally the confidence to make their next hit count harder." |
| `DC-INS02` | Inspire Zeal | "I want my droid allies to exploit a decisive hit before their target has time to recover." |
| `DC-INS03` | Beloved | "I want to become the sort of commander whose allies stay committed to the mission when protecting me carries risk." |
| `DC-INS04` | Inspire Confidence | "I want the droids fighting beside me to perform their attacks and tasks with greater confidence." |
| `DC-INS05` | Willpower | "I want to lend my force of resolve to allies when an enemy attempts to break their concentration." |
| `DC-INS06` | Inspire Haste | "I want an ally to perform a crucial technical task faster when every moment counts." |
| `DC-INS07` | Bolster Ally | "I want to help a struggling ally recover enough to keep participating in the fight." |

#### Leadership — 11 indexed talent anchors

**Authority status:** Core and later supplements; exact talent-by-talent expansion/chain not fully certified in this pass. A proposed answer does not assert present ownership.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `DC-LEA01` | Fearless Leader | "I want those following my commands to maintain discipline when fear would otherwise disrupt the unit." |
| `DC-LEA02` | Trust | "I want to give a trusted subordinate the opening to act when its action matters more than my own." |
| `DC-LEA03` | Unwavering Ally | "I want my directions to keep an ally alert when enemies try to catch it unprepared." |
| `DC-LEA04` | Distant Command | "I want the benefits of my leadership to persist when a droid moves out of sight." |
| `DC-LEA05` | Rally | "I want to help an ally recover from setbacks before its performance deteriorates further." |
| `DC-LEA06` | Coordinate | "I want the assistance one droid gives another to be more effective than a simple routine." |
| `DC-LEA07` | Reactionary Attack | "I want the unit to answer an attack on an ally with a timely counterattack." |
| `DC-LEA08` | Born Leader | "I want the droids who can see me to benefit from an immediate command to improve their accuracy." |
| `DC-LEA09` | Commanding Presence | "I want my own decisive action to become a clear signal for the rest of the unit." |
| `DC-LEA10` | Tactical Savvy | "I want my tactical calculations to improve the value of an ally's critical attack roll." |
| `DC-LEA11` | Coordinated Leadership | "I want my commands to complement those of other capable leaders instead of competing with them." |

#### Class feature, identity, capstone, and neutral choices

| ID | Authority or function | First-person future-oriented Q1 answer |
|---|---|---|
| `DC-CF01` | Networked Mind (from class level 2) | "I want a protected communications network that lets selected droid allies benefit from commands and effects they would normally be unable to receive." |
| `DC-ID01` | Identity; command without imposed faction | "I want my command methods to make a droid unit dependable without requiring allegiance to a particular army." |
| `DC-ID02` | Capstone / fulfillment | "I wanted to master command of droid units. I want to keep developing that discipline without needing another title." |
| `DC-NEUTRAL` | Genuine uncertainty | "I want to evaluate whether coordination, protection, mobility, or morale should shape my next command protocols." |

**Count:** 26 indexed-tree talent options + 4 class/identity/neutral directions = 30 total. All are first-pass draft text; eligibility and precise benefit wording remain mechanical authority work.


### 28.3 Military Engineer — Chief Engineer Rax (18 Q1 draft answers)


**Mentor voice, from dedicated dialogue source:** Rax is cold, mathematical, practical, and concerned with preparation and structural failure points; not interchangeable with Spark's exuberant controlled sabotage.


**Mentor Q1 introduction (DRAFT):**

> An army does not fail only when its soldiers fall. It fails when a vehicle stops, a route closes, or one component breaks at the wrong moment. Those are engineering problems. Choose the problem you intend to solve first.

**Question:** As a Military Engineer, which form of battlefield engineering do you intend to perfect?


**Published eligibility:** base attack bonus +7; trained Mechanics and Use Computer. *No named organization membership requirement is printed in the prestige entry.* Published selectable trees are Military Engineer and Outlaw Tech; technical skills do not imply the character has a particular military rank. **Field-Created Weapon** begins at class level 2; weapon creation has a Mechanics check, class-level value/proficiency limits, a once-per-encounter limit, and the weapon is destroyed at the end of the encounter. **Quick Modifications** requires Repairs on the Fly and the Tech Specialist feat. **Droid Expert** requires Repairs on the Fly. **Tech Savant** requires trained Knowledge (technology).


#### Military Engineer — 10 indexed talent anchors

**Authority status:** Clone Wars printed pp. 44–46 (10 named talents); source text visually checked. A proposed answer does not assert present ownership.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `ME-ENG01` | Repairs on the Fly | "I want to restore a damaged droid, object, or vehicle quickly enough to matter during the fight." |
| `ME-ENG02` | Problem Solver | "I want to guide a vehicle through difficult ground and hazards with precise technical advice." |
| `ME-ENG03` | Quick Modifications | "I want improvised field-built weapons to carry a useful technical modification from the moment I assemble them." |
| `ME-ENG04` | Prepared Explosive | "I want a fixed explosive to change the terrain in a controlled way instead of merely causing damage." |
| `ME-ENG05` | Vehicular Boost | "I want to reinforce a vehicle under threat long enough to finish the mission." |
| `ME-ENG06` | Breaching Explosive | "I want correctly placed charges to defeat a barrier without wasting the blast on its strongest points." |
| `ME-ENG07` | Droid Expert | "I want to repair a droid more thoroughly when my skill exceeds the minimum needed for the job." |
| `ME-ENG08` | Breach Cover | "I want area-effect weapons to reach enemies whose cover would protect them from an ordinary attack." |
| `ME-ENG09` | Tech Savant | "I want to adjust a nearby machine so it moves faster for the next critical maneuver." |
| `ME-ENG10` | Sabotage Device | "I want to turn a powered object into a temporary explosive when no purpose-built charge is available." |

#### Outlaw Tech — 4 indexed talent anchors

**Authority status:** Starships of the Galaxy printed p. 16 (4 named talents); searchable source directly checked. A proposed answer does not assert present ownership.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `ME-OT01` | Personalized Modifications | "I want to tune a powered weapon to my own handling so it performs better for the rest of an encounter." |
| `ME-OT02` | Fast Repairs | "I want a jury-rigged machine to withstand more damage while an emergency fix lasts." |
| `ME-OT03` | Hot Wire | "I want to use engineering knowledge to bypass a computer's access restrictions when standard credentials fail." |
| `ME-OT04` | Quick Fix | "I want to make a temporary equipment repair before the machinery has actually broken down." |

#### Class feature, identity, capstone, and neutral choices

| ID | Authority or function | First-person future-oriented Q1 answer |
|---|---|---|
| `ME-CF01` | Field-Created Weapon (from class level 2) | "I want to scavenge parts into a temporary weapon suited to the immediate problem, knowing it will not last." |
| `ME-ID01` | Identity; repair before destruction | "I want to keep people and their equipment operational, not judge my engineering only by what I can destroy." |
| `ME-ID02` | Capstone / fulfillment | "This field-engineering craft is the career I worked to achieve. I want to refine it without needing another rank." |
| `ME-NEUTRAL` | Genuine uncertainty | "I want to explore repair, structural control, vehicle support, and rapid improvisation before committing to one discipline." |

**Count:** 14 indexed-tree talent options + 4 class/identity/neutral directions = 18 total. All are first-pass draft text; eligibility and precise benefit wording remain mechanical authority work.


### 28.4 Vanguard — Shield Captain Theron (24 Q1 draft answers)


**Mentor voice, from dedicated dialogue source:** Theron is calm, protective, steadfast and duty-focused. His current dialogue is thematically too fortress-oriented for the printed reconnaissance class, so this intro honors the defender's commitment to protecting others through warning and intelligence, without assigning him a replacement personality.


**Mentor Q1 introduction (DRAFT):**

> The first line of defense begins before the enemy reaches us. Someone must find the danger, remain unseen, and get the warning home. You have earned a place at that edge. Which duty will you sharpen?

**Question:** As a Vanguard, what part of forward reconnaissance do you want to master?


**Published eligibility:** character level 7; trained Perception and Stealth; any two qualifying talents drawn from Camouflage or Commando. **Camouflage and Commando are entry-gating trees, not automatic selectable Vanguard trees**. Published selectable talent trees are Vanguard, Awareness, Survivor. **Surprise Attack** begins at class level 2, scaling on even class levels. It affects the first attack roll each round against a target that is unaware or otherwise denied its Dexterity bonus to Reflex Defense, not every attack, not damage, and not every target. Published job description: advance reconnaissance and reporting enemy positions, *not* primarily an immovable frontline wall. **Impenetrable Cover** and **Invisible Attacker** require Maximize Cover; **Shellshock** requires Soften the Target; **Triangulate** requires Enhanced Vision.


#### Vanguard — 8 indexed talent anchors

**Authority status:** Clone Wars printed pp. 46–47 (8 named talents); source text visually checked. A proposed answer does not assert present ownership.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `VG-VGT01` | Mark the Target | "I want a well-placed shot to expose an enemy to the next attack from an ally." |
| `VG-VGT02` | Soften the Target | "I want my ranged attack to open a path through an enemy's protection for the ally who follows." |
| `VG-VGT03` | Impenetrable Cover | "I want the cover I choose to protect me from heavy blows while I observe an enemy position." |
| `VG-VGT04` | Triangulate | "I want the unit to combine several lines of sight so its next ranged shot has a better chance of reaching the target." |
| `VG-VGT05` | Enhanced Vision | "I want to spot concealed enemies quickly without spending the whole moment searching." |
| `VG-VGT06` | Shellshock | "I want an area attack against an unsuspecting enemy to leave them exposed for my allies." |
| `VG-VGT07` | Maximize Cover | "I want to keep my cover even when an opponent tries to aim around it." |
| `VG-VGT08` | Invisible Attacker | "I want to strike harder from concealment when the enemy has not detected me." |

#### Awareness — 8 indexed talent anchors

**Authority status:** Core and later supplements; some indexed talent expansions need source-by-source certification. A proposed answer does not assert present ownership.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `VG-AW01` | Expert Tracker | "I want to follow tracks at normal pace without losing the trail." |
| `VG-AW02` | Weak Point | "I want to recognize a brief opportunity to get past a target's damage reduction." |
| `VG-AW03` | Reset Initiative | "I want to recover the initiative later in a fight when the situation suddenly changes." |
| `VG-AW04` | Improved Initiative | "I want a second chance at acting before the enemy when the first moment matters most." |
| `VG-AW05` | Keen Shot | "I want to take a reliable shot through partial concealment after spotting the target." |
| `VG-AW06` | Uncanny Dodge II | "I want to remain difficult to trap even when opponents attack from opposite sides." |
| `VG-AW07` | Uncanny Dodge I | "I want to keep my defensive instincts when an unseen attacker catches me off guard." |
| `VG-AW08` | Acute Senses | "I want to notice something I missed at first before the whole team walks into danger." |

#### Survivor — 4 indexed talent anchors

**Authority status:** Core Rulebook original four talents. A proposed answer does not assert present ownership.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `VG-SV01` | Evasion | "I want to reduce the harm from area attacks while moving across exposed ground." |
| `VG-SV02` | Extreme Effort | "I want to find one short reserve of strength when an obstacle blocks our escape route." |
| `VG-SV03` | Sprint | "I want to cover more distance when getting a warning back matters more than fighting." |
| `VG-SV04` | Surefooted | "I want rough terrain to stop slowing me when I must stay ahead of a pursuer." |

#### Class feature, identity, capstone, and neutral choices

| ID | Authority or function | First-person future-oriented Q1 answer |
|---|---|---|
| `VG-CF01` | Surprise Attack (from class level 2) | "I want the first attack against an unaware target to be more accurate when stealth has given me an opening." |
| `VG-ID01` | Identity; reconnaissance over frontal defense | "I want my work ahead of the main force to prevent a battle or ambush, not merely win the fight after it starts." |
| `VG-ID02` | Capstone / fulfillment | "I set out to become the scout others trust to bring them home. I can keep perfecting that work without pursuing another title." |
| `VG-NEUTRAL` | Genuine uncertainty | "I want to learn whether observation, protection, movement, or precision attacks should define my role at the front." |

**Count:** 20 indexed-tree talent options + 4 class/identity/neutral directions = 24 total. All are first-pass draft text; eligibility and precise benefit wording remain mechanical authority work.


### 28.5 Source/implementation debt ledger — NEW, DO NOT IMPLEMENT YET

1. **CW-IMPL-01 — Droid only:** Confirm `Droid Commander` eligibility is enforced for droid characters and not merely assigned through a loose name/tag alias. The published entry also needs a Leadership/Commando talent, but those are entry prerequisites, not permanent Droid Commander talent access.
2. **CW-IMPL-02 — Networked Mind:** Ensure mind-affecting benefit transfer, select-count by half class level, selected beneficiaries per encounter, active comlinks, line-of-sight semantics, and communications jamming are modeled accurately. No invented squad units or always-on buffs.
3. **CW-IMPL-03 — Shared-tree expansion provenance:** Some later indexed Leadership, Inspiration and Awareness talent names need individual book/tree and prerequisite certification. Do not treat all 60 candidates as source-certified just because their index names resolve.
4. **CW-IMPL-04 — Droid Commander action/prereq gates:** Automated Strike requires Double Attack with a chosen weapon group; Droid Defense/Expanded Sensors gate chains. Preserve each talent's swift/standard action and encounter limit; Q1 cannot confer these benefits.
5. **CW-IMPL-05 — Military Engineer classification:** Core printed book entry requires BAB +7, Mechanics, Use Computer, not a generic character-level-7 substitute; no assumed organization membership. Outlaw Tech is licensed as a selectable tree by the printed class.
6. **CW-IMPL-06 — Temporary weapons:** Field-Created Weapon is an even-level limited-use ability, not a persistent stock inventory weapon. Confirm parts consumption, cost, proficiency, Mechanics DC, encounter destruction, bonus and conditions in V2 item authority.
7. **CW-IMPL-07 — Engineer feat/skill prerequisites:** Quick Modifications (Tech Specialist and Repairs on the Fly), Droid Expert (Repairs on the Fly), Tech Savant (trained Knowledge technology) and other specific gating must survive suggestion-to-choice binding.
8. **CW-IMPL-08 — Vanguard access vs prerequisite:** Two Camouflage/Commando talents are *entry eligibility*; only Vanguard/Awareness/Survivor are listed as class selectable trees. No automatic grant of scouting allies or a squad.
9. **CW-IMPL-09 — Surprise Attack semantics:** Bonus applies to the first qualifying attack roll each round versus unaware/flat-footed targets, scaling by half Vanguard class level; don't implement as global damage, free surprise round, or blanket accuracy.
10. **CW-IMPL-10 — Mentor mismatch:** Theron's dedicated dialogue says frontline immovable shield repeatedly, while printed Vanguard is reconnaissance and intelligence support. Preserve his calm protective personality but revise future prestige survey class teaching and examine level greetings for canonical alignment.
11. **CW-IMPL-11 — Mentor history assumptions:** Axiom, Rax and Theron greetings imply achieved battle results, unit ownership or past military careers. Q1 and Q6 must only assert personal history from recorded evidence. Do not auto-grant Clone Wars faction or veteran status.
12. **CW-IMPL-12 — Scope and certification:** Q1 is editorial only. No scoring policy, answer-count cap, display algorithm, mechanical link generation, ontology ID creation, GitHub writes, tests claiming production coverage or advancement to Q2–Q6.

### 28.6 Checkpoint and next-source treatment

- New prestige classes covered in this pass: **Droid Commander, Military Engineer, Vanguard**.
- Existing count before this book: 22 of 32 first-pass prestige libraries. After this book: **25 of 32**. This is a registry-based inventory, not final campaign/source mechanical certification.
- Published expansions in the same sourcebook (for other classes and base-class talent trees) must be preserved in the book-wide expansion audit; this pass does not overwrite earlier class libraries or silently mark their expansion talents individually certified.
- Next sourcebook's new prestige-class census must be verified from its printed chapter and repo before authoring.

## 29. Galaxy at War — Martial Arts Master Q1 (Master Zhen; local v0.24)

**Status:** DRAFT; read-only repository + supplied primary PDF/TXT inspection. Printed *Galaxy at War*, pp. 32–33, Chapter I. No approved Q1 selection mechanics.

### 29.1 Class and Mentor facts

- **Mentor:** Master Zhen, `data/dialogue/mentors/zhen/zhen_dialogue.json`, registered as `zhen`. Calm, deliberate, patiently metaphorical, balancing body and mind. Do not use Blade Master Kharjo's technical duelist persona.
- **Entry:** BAB +7; Martial Arts I, Martial Arts II, Melee Defense; **at least one** of eight named martial-art Training feats (Echani, Hijkata, K'tara, K'thri, Stava, Tae-Jitsu, Teräs Käsi, Wrruushi); and one Brawler or Survivor talent. Repository's compact `1 Martial Arts Feat` description is **not** sufficiently specific.
- **Access:** Awareness, Master of Teräs Käsi, Martial Arts Forms, Unarmed Mastery (four trees); do not confuse entry prerequisite Brawler/Survivor with talent-tree access.
- **Progression:** talent at class levels 1/3/5/7/9; Tough as Durasteel at 2/4/6/8/10, granting conditional bonus HP after dealing damage with unarmed attack in light/no armor, **not automatic damage reduction**. No automatic martial-arts style selection through Q1.
- **Source caveat:** The supplied *Threats of the Galaxy*, printed p. 53, identifies Teräs Käsi talent names in an NPC example, but does not provide standalone complete rules descriptions for all five talent records. *Galaxy at War* explicitly permits the tree to Martial Arts Master. **Entitlement is verified; rules-content certification for five individual talents is not.** Do not infer that Elite Trooper also gets the tree.

### 29.2 Master Zhen — Q1 opening

> "The hand that reaches for a weapon has one answer. The empty hand has many. You have earned the right to study beyond the foundations. Will you train your sight, your movement, your hold, or the strike that ends a struggle? Choose with care."

**Q1:** "As a Martial Arts Master, which discipline of the empty hand do you want to deepen?"

The mentor acknowledges qualification, not prior wins, vows, past instruction or a spiritual allegiance. His quiet focus on patience differs from Kharjo's technical swordcraft.

### 29.3 First-person candidate bank


#### Awareness — 8 indexed talent anchors

**Status:** DRAFT: individual benefit/prerequisite and source-identity certification required; future interests only.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `MAM-AW01` | Expert Tracker | "I want to follow a trail without slowing my pursuit every time the signs become faint." |
| `MAM-AW02` | Weak Point | "I want to recognize where an opponent is vulnerable even when their defenses seem difficult to penetrate." |
| `MAM-AW03` | Reset Initiative | "I want to regain the initiative when a fight changes and the next moment becomes decisive." |
| `MAM-AW04` | Improved Initiative | "I want another chance to react before the opponent when our encounter begins." |
| `MAM-AW05` | Keen Shot | "I want to keep my aim steady when concealment obscures the threat I have spotted." |
| `MAM-AW06` | Uncanny Dodge II | "I want to remain difficult to overwhelm when foes try to trap me between them." |
| `MAM-AW07` | Uncanny Dodge I | "I want my training to protect me when an unseen enemy catches me off guard." |
| `MAM-AW08` | Acute Senses | "I want to notice the smallest change in my surroundings before it becomes an attack." |

#### Martial Arts Forms — 7 indexed talent anchors

**Status:** DRAFT: individual benefit/prerequisite and source-identity certification required; future interests only.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `MAM-MF01` | Echani Expertise | "I want to refine my unarmed strikes until a small opening can become a decisive blow." |
| `MAM-MF02` | Hijkata Expertise | "I want each successful strike to disrupt my opponent’s next attack." |
| `MAM-MF03` | K'tara Expertise | "I want to use my empty hands to strip an armed opponent of their weapon." |
| `MAM-MF04` | K'thri Expertise | "I want an opponent to pay for remaining within my reach when my stance is ready." |
| `MAM-MF05` | Stava Expertise | "I want to control a grapple so my opponent cannot simply pull away from my grip." |
| `MAM-MF06` | Tae-Jitsu Expertise | "I want a well-placed unarmed blow to weaken an opponent’s ability to keep fighting." |
| `MAM-MF07` | Wrruushi Expertise | "I want a successful unarmed strike to interrupt what an opponent can do next." |

#### Unarmed Mastery — 3 indexed talent anchors

**Status:** DRAFT: individual benefit/prerequisite and source-identity certification required; future interests only.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `MAM-UM01` | Flurry of Blows | "I want successive unarmed blows to stay accurate rather than lose precision through haste." |
| `MAM-UM02` | Hardened Strike | "I want repeated unarmed attacks to wear down protection that would ordinarily blunt my strikes." |
| `MAM-UM03` | Punishing Strike | "I want an exceptional unarmed hit to create the opening for another immediate strike." |

#### Master of Teräs Käsi — QUARANTINED — 5 indexed talent anchors

**Status:** QUARANTINED: illustrative character intent only; missing full authoritative published talent rules; do not show or implement as an eligible talent until verified.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `MAM-TK01` | Teräs Käsi Basics | "I want to study the foundations of Teräs Käsi until its movements become instinct." |
| `MAM-TK02` | Unarmed Counterstrike | "I want to learn the discipline of answering an attack without first reaching for a weapon." |
| `MAM-TK03` | Unarmed Parry | "I want to learn how to defend myself through empty-handed control and positioning." |
| `MAM-TK04` | Ignore Damage Reduction | "I want to develop unarmed techniques for opponents protected by extraordinary defenses." |
| `MAM-TK05` | Teräs Käsi Mastery | "I want to deepen the Teräs Käsi tradition beyond its fundamental techniques." |


#### Class features, career identity, fulfillment, and neutral direction

| ID | Mechanical anchor or purpose | First-person future-oriented Q1 answer |
|---|---|---|
| `MAM-CF01` | Tough as Durasteel — scaling class feature from level 2 | "I want my strikes to help me endure the retaliation that follows in a long fight." |
| `MAM-ID01` | Identity — self-reliant unarmed defense | "I want to defend myself and others without needing a weapon to be close at hand." |
| `MAM-ID02` | Career fulfillment / capstone | "I worked to perfect the empty hand. I want to keep refining it without pursuing another title." |
| `MAM-NEUTRAL` | Uncertain intent | "I want to explore precision, awareness, grappling, and endurance before choosing the discipline I will perfect." |


**Count:** 23 talent-name-linked proposals (5 quarantined Teräs Käsi) + 4 feature/identity/neutral answers = **27** editorial candidates, **22 non-quarantined**.


## 30. Legacy Era Campaign Guide — Imperial Knight Q1 (Dezmin; local v0.24)

**Status:** DRAFT; read-only repository + supplied primary PDF/TXT inspection. Printed *Legacy Era Campaign Guide*, pp. 43–45, Chapter III. No approved Q1 selection mechanics.

### 30.1 Class and Mentor facts

- **Mentor:** Dezmin, `data/dialogue/mentors/dezmin/dezmin_dialogue.json`, registered as `dezmin`. Measured, honor-bound, authoritative; vows and self-command rather than Miraj's Jedi spirituality.
- **Entry:** BAB +7, trained Use the Force, Armor Proficiency (light and medium), Force Sensitivity, Weapon Proficiency (lightsabers), **sworn defender of Emperor Roan Fel**. This is a campaign-specific oath, not a generic assumed Empire faction.
- **Access:** Armor Specialist, Duelist, Lightsaber Combat, Knight's Armor, Knight's Resolve (five trees).
- **Progression:** talents at class levels 1/3/5/7/9, Force Techniques at 2/4/6/8/10. Force Techniques are **future interests**, not a free class-level-1 pick.
- **Characterization conflict:** Printed Imperial Knights explicitly **reject use of the dark side**. Dezmin's current level dialogue repeatedly calls the tradition a “gray path” and says the Force serves its wielder. Preserve his restrained manner while correcting Q1 teaching to published convictions; do not infer 'morally gray Force use' as printed canon.
- **Identity collision:** Armor Mastery in Knight's Armor has a distinct source and rules identity from Armor Mastery in Armor Specialist. No same-name merge until canonical identity is resolved.

### 30.2 Dezmin — Q1 opening

> "Your oath gives your service its direction; it does not decide every action you will take. An Imperial Knight must guard with judgment, not merely obey with a blade. Will you deepen your defense, your lightsaber discipline, your care for those beside you, or your command of the Force?"

**Q1:** "As an Imperial Knight, which duty or discipline will you strengthen first?"

No assumed personal assignment, Emperor's meeting, battle record, or future promotion. The class has an actual oath prerequisite, but class entry doesn't establish a particular mission history.

### 30.3 First-person talent candidate bank


#### Armor Specialist — 6 indexed talent anchors

**Status:** DRAFT: individual benefit/prerequisite and source-identity certification required; future interests only.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `IK-AR01` | Armored Defense | "I want armor to serve me without sacrificing the defensive awareness I have earned through experience." |
| `IK-AR02` | Improved Armored Defense | "I want experience and armor to contribute together to my protection instead of competing." |
| `IK-AR03` | Armor Mastery | "I want to move in armor with the practiced ease of a warrior who understands its limitations." |
| `IK-AR04` | Juggernaut | "I want armor to protect me without slowing my movement to those who need me." |
| `IK-AR05` | Shield Expert | "I want to use a shield generator more reliably when an enemy presses our position." |
| `IK-AR06` | Second Skin | "I want the protective value of my armor to become a natural part of how I fight." |

#### Duelist — 11 indexed talent anchors

**Status:** DRAFT: individual benefit/prerequisite and source-identity certification required; future interests only.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `IK-DU01` | Shoto Master | "I want to make a short companion lightsaber an exact part of my dueling technique." |
| `IK-DU02` | Greater Weapon Focus (Lightsabers) | "I want years of practice to make my lightsaber strikes more precise." |
| `IK-DU03` | Improved Redirect | "I want to return an incoming blaster bolt with greater control and economy of movement." |
| `IK-DU04` | Thrown Lightsaber Mastery | "I want a thrown lightsaber to disrupt an enemy who believes distance grants safety." |
| `IK-DU05` | Improved Lightsaber Throw | "I want to carry a thrown blade through an engagement and reclaim it through the Force." |
| `IK-DU06` | Improved Riposte | "I want a successful block to become the moment for a careful counterstrike." |
| `IK-DU07` | Greater Weapon Specialization (Lightsabers) | "I want every successful lightsaber blow to carry the weight of deeper training." |
| `IK-DU08` | Force Fortification | "I want to draw on the Force to survive a strike that would otherwise overwhelm my defenses." |
| `IK-DU09` | Severing Strike | "I want the capacity to disable a dangerous foe instead of killing them, while accepting the lasting consequences of that choice." |
| `IK-DU10` | Lightsaber Form Savant | "I want to call upon a practiced lightsaber form again when the situation demands it." |
| `IK-DU11` | Multiattack Proficiency (lightsabers) | "I want to maintain precision when I must deliver several lightsaber attacks." |

#### Lightsaber Combat — 11 indexed talent anchors

**Status:** DRAFT: individual benefit/prerequisite and source-identity certification required; future interests only.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `IK-LC01` | Block | "I want my lightsaber to intercept a melee blow before it reaches me." |
| `IK-LC02` | Deflect | "I want to turn away blaster fire when distance does not provide protection." |
| `IK-LC03` | Lightsaber Defense | "I want a disciplined stance that makes every moment of defense more dependable." |
| `IK-LC04` | Weapon Specialization (Lightsabers) | "I want my practiced lightsaber hits to be more effective when force is unavoidable." |
| `IK-LC05` | Lightsaber Throw | "I want to reach a distant threat with my lightsaber without surrendering the weapon." |
| `IK-LC06` | Redirect Shot | "I want a blaster bolt I deflect to become a controlled answer to its source." |
| `IK-LC07` | Cortosis Gauntlet Block | "I want to learn a means of stopping a lightsaber strike when a blade is not available." |
| `IK-LC08` | Precise Redirect | "I want a redirected blaster bolt to carry greater force once I have turned it away." |
| `IK-LC09` | Precision | "I want a lightsaber strike to interfere with an opponent’s ability to move away." |
| `IK-LC10` | Riposte | "I want to answer a blocked melee blow with a measured immediate attack." |
| `IK-LC11` | Shoto Focus | "I want a short off-hand lightsaber to remain accurate under pressure." |

#### Knight's Armor — 5 indexed talent anchors

**Status:** DRAFT: individual benefit/prerequisite and source-identity certification required; future interests only.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `IK-KA01` | Cortosis Retaliation | "I want a successful cortosis-gauntlet parry to become an immediate chance to counterattack." |
| `IK-KA02` | Armored Augmentation II | "I want the Force to deepen the protection of my armor when a fight turns dangerous." |
| `IK-KA03` | Armored Augmentation I | "I want to channel the Force through my armor so it helps me withstand a devastating blow." |
| `IK-KA04` | Armor Mastery | "I want to integrate my armor and combat experience without giving up sound defensive technique." |
| `IK-KA05` | Cortosis Defense | "I want to meet a hostile lightsaber with a carefully trained cortosis-gauntlet defense." |

#### Knight's Resolve — 5 indexed talent anchors

**Status:** DRAFT: individual benefit/prerequisite and source-identity certification required; future interests only.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `IK-KR01` | Oath of Duty | "I want another Knight’s successful strike to fortify my resolve to remain in the fight." |
| `IK-KR02` | Praetoria Ishu | "I want to defend an adjacent ally with Block and Deflect, not merely protect myself." |
| `IK-KR03` | Strength of the Empire | "I want a fellow Knight’s effective lightsaber strike to create strength for my own next attack." |
| `IK-KR04` | Praetoria Vonil | "I want to master a two-handed lightsaber attack that turns deliberate movement into additional impact." |
| `IK-KR05` | Knight's Morale | "I want the success of an allied lightsaber wielder to strengthen my defenses as we stand together." |


#### Core Force Technique future-development directions — 7

These are printed Core Rulebook Force Techniques, available only at even Imperial Knight levels, not level-1 talent picks.

| ID | Published Force Technique (developer only) | First-person future-oriented Q1 answer |
|---|---|---|

| `IK-FT01` | Force Point Recovery | "I want to recover spent Force energy after an encounter so I can be ready for the next duty." |

| `IK-FT02` | Force Power Mastery | "I want one carefully chosen Force power to remain dependable even under pressure." |

| `IK-FT03` | Improved Force Trance | "I want disciplined meditation to restore my strength when there is time to recover." |

| `IK-FT04` | Light Object | "I want to move a small object through the Force quickly when an instant matters." |

| `IK-FT05` | Sense Force | "I want to notice disturbances in the Force without surrendering the initiative." |

| `IK-FT06` | Sense Surroundings | "I want to widen my awareness of the immediate area without losing the moment to act." |

| `IK-FT07` | Telepathy | "I want to make a mental connection more reliably when ordinary communication fails." |



#### Class features, career identity, fulfillment, and neutral direction

| ID | Mechanical anchor or purpose | First-person future-oriented Q1 answer |
|---|---|---|
| `IK-ID01` | Identity — sworn protection and individual judgment | "I want to serve as a guardian whose loyalty is expressed through restraint and responsible protection." |
| `IK-ID02` | Capstone / fulfillment | "I set out to earn the responsibilities of an Imperial Knight. I want to perfect this service without chasing another title." |
| `IK-NEUTRAL` | Uncertain intent | "I want to understand whether armor, lightsaber technique, defending allies, or Force discipline should shape my service first." |


**Count:** 38 talent-linked + 7 future Force Technique + 3 identity/neutral = **48** editorial candidates.


## 31. Legacy Era Campaign Guide — Shaper Q1 (Shaper Urza; local v0.24)

**Status:** DRAFT; read-only repository + supplied primary PDF/TXT inspection. Printed *Legacy Era Campaign Guide*, pp. 46–47, Chapter III. No approved Q1 selection mechanics.

### 31.1 Class and Mentor facts

- **Mentor:** Shaper Urza, `data/dialogue/mentors/urza/urza_dialogue.json`, registered as `urza`; curious, lightly amused, unconventional, scientist-like. Distinct from mechanical craft mentors and Force mystics.
- **Entry:** level 7; **Yuuzhan Vong species**; Biotech Specialist feat; trained Knowledge (life sciences) and Treat Injury. Not a generic biotech class for all species.
- **Access:** Advanced Medicine (*Force Unleashed*), Implant (*Legacy Era*), Shaper (*Legacy Era*).
- **Progression:** talent at class levels 1/3/5/7/9; Shaper Lore scales at even levels; Shaper Hand is a class-level-6 body modification with cultural expectations, not a player-free automatic item from Q1.
- **Force Point exception:** The printed class explicitly states Yuuzhan Vong shapers **never gain Force Points**. Repo `grants_force_points:false` agrees.
- **Implant warning:** Implant-tree effects require *willing adjacent living creatures*, last for an encounter, and carry a severe **persistent -3 condition-track step penalty after the encounter**; recovery requires 8 hours of rest or surgery. Avoid showcasing the benefit without its substantial consequence.
- **Biotech feat identity:** Biotech Specialist (entry and Biotech Mastery) differs from **Biotech Surgery** (Skilled Implanter prerequisite).
- **Ethical/context:** Published lore discusses taboos on shaping non-Yuuzhan Vong; do not assume this character has violated any protocols, created an organism, or received a shaper hand.

### 31.2 Shaper Urza — Q1 opening

> "A living tool does not remain what it was yesterday. Neither does its maker. You have earned the discipline to shape what grows and heals—and what changes another being. Which of those responsibilities will you learn to carry with precision?"

**Q1:** "As a Shaper, which part of living technology do you wish to master?"

### 31.3 First-person candidate bank


#### Advanced Medicine — 8 indexed talent anchors

**Status:** DRAFT: individual benefit/prerequisite and source-identity certification required; future interests only.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `SH-AM01` | Natural Healing | "I want to use suitable natural materials to provide medical care when a prepared medical kit is unavailable." |
| `SH-AM02` | Extra First Aid | "I want to administer additional first aid when someone has already received the day’s usual treatment." |
| `SH-AM03` | Battlefield Medic | "I want to perform urgent first aid quickly enough that a crisis does not outpace me." |
| `SH-AM04` | Bring Them Back | "I want a longer window to attempt to revive someone whose life has just been lost." |
| `SH-AM05` | Second Chance | "I want a failed treatment attempt to avoid making a wounded patient worse." |
| `SH-AM06` | Emergency Team | "I want assistants working beside me to contribute more reliably to a difficult treatment." |
| `SH-AM07` | Medical Miracle | "I want to help a patient draw on their own reserve of strength when the need is immediate." |
| `SH-AM08` | Steady Under Pressure | "I want my training to give a difficult medical procedure a better chance of success." |

#### Implant — 5 indexed talent anchors

**Status:** DRAFT: individual benefit/prerequisite and source-identity certification required; future interests only.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `SH-IM01` | Adrenaline Implant | "I want to provide a willing patient with temporary resilience through an adrenaline implant, while accounting for its aftermath." |
| `SH-IM02` | Precision Implant | "I want a willing ally to gain temporary accuracy through a carefully prepared implant, with its costs understood." |
| `SH-IM03` | Resilience Implant | "I want to strengthen a willing ally’s damage threshold temporarily through a living implant, without ignoring the recovery required." |
| `SH-IM04` | Strength Implant | "I want to enhance a willing ally’s melee impact for one encounter through biotech, while planning for the lasting strain afterward." |
| `SH-IM05` | Speed Implant | "I want to give a willing ally temporary speed through an implant, fully aware of the toll it takes after the fight." |

#### Shaper — 5 indexed talent anchors

**Status:** DRAFT: individual benefit/prerequisite and source-identity certification required; future interests only.

| ID | Exact repository talent name (developer only) | First-person future-oriented Q1 answer |
|---|---|---|
| `SH-SH01` | Expedient Mending | "I want to stabilize a damaged living device quickly when there is no time for a lengthy repair." |
| `SH-SH02` | Master Mender | "I want a temporary biotech repair to restore more function and last long enough to matter." |
| `SH-SH03` | Skilled Implanter | "I want to improve the care and precision of implant surgery so installing biotech is less dangerous to its recipient." |
| `SH-SH04` | Expert Shaper | "I want a second chance to repair or modify a living device when my first treatment fails." |
| `SH-SH05` | Biotech Mastery | "I want to alter biotechnology with greater efficiency, reducing wasted time and resources while retaining exact control." |


#### Class features, career identity, fulfillment, and neutral direction

| ID | Mechanical anchor or purpose | First-person future-oriented Q1 answer |
|---|---|---|
| `SH-CF01` | Shaper Lore — bonus beginning class level 2 | "I want deeper understanding of living devices to improve the way I study, modify, and repair them." |
| `SH-CF02` | Shaper Hand — class-level-6 cultural/physical option | "I want to understand the tools and obligations of a shaping hand before deciding whether to accept one." |
| `SH-ID01` | Identity / responsible biotech | "I want my creations to serve a purpose I can defend, rather than shape living things simply because I can." |
| `SH-ID02` | Career fulfillment / capstone | "I intend to perfect the craft of shaping living technology. I need no higher title for that work to matter." |
| `SH-NEUTRAL` | Uncertain intent | "I want to explore repair, medicine, living implants, and new biotech designs before committing to one specialty." |


**Count:** 18 talent-linked + 5 feature/identity/neutral = **23** editorial candidates.


## 32. Book-sequence and certification checkpoint — v0.24

### 32.1 Three-class book pass

| Source and class | Mentor | Tree-linked candidates | Other candidates | Total | Quarantined |
|---|---|---:|---:|---:|---:|
| *Galaxy at War* — Martial Arts Master | Master Zhen | 23 | 4 | 27 | 5 Teräs Käsi |
| *Legacy Era Campaign Guide* — Imperial Knight | Dezmin | 38 | 10 | 48 | 0 |
| *Legacy Era Campaign Guide* — Shaper | Shaper Urza | 18 | 5 | 23 | 0 |
| **Total** | | **79** | **19** | **98** | **5** |

**Scope:** Galaxy of Intrigue provides prestige talent additions, but no new prestige class. The Legacy book introduces exactly the two new prestige classes addressed here. The sourcebook-specific class census and the 32-class repository census are different audit lanes.

### 32.2 Previous count correction

- Before this pass: 25 individual prestige Q1 libraries existed in the rolling file.
- After this pass: **28 of 32** repository prestige classes now have first-pass Q1 libraries, but **five Martial Arts Master candidates are quarantined**, and many tree-linked candidates remain individually uncertified.
- **Charlatan remains missing:** Previous Scum and Villainy book completion claim was incomplete; Charlatan appears in the source and in the repository but has no authored Q1 bank. It is not counted among the 28.
- Remaining unauthored registry classes: **Assassin, Charlatan, Improviser, Pathfinder**. This is the current explicit four-class backlog.
- No GitHub writes, commits or pushes occurred; no changes to the approved Q1–Q6 architecture.

### 32.3 New deferred implementation / source-certification ledger


- **N3-01 — Martial Arts Master — entry qualification:** Keep BAB +7, Martial Arts I/II, Melee Defense, named style-training feat and one Brawler/Survivor talent distinct; repair vague prerequisite description only after implementation authorization.

- **N3-02 — Teräs Käsi talent rules:** Source explicitly grants this tree to Martial Arts Master, but supplied Threats of the Galaxy p. 53 shows example NPC talent membership, not standalone rules text. Five answers quarantined; avoid auto-certification or applying eligibility to Elite Trooper.

- **N3-03 — Tough as Durasteel:** Conditional bonus hit points on damaging an unarmed foe while lightly/unarmored; do not implement as DR, always-on HP, generic class defense, or first-level ability.

- **N3-04 — Sourcebooks with zero new classes:** Galaxy of Intrigue adds prestige-talent expansions but no original new prestige-class definition. Do not confuse new talents with new class census.

- **N3-05 — Imperial oath:** Printed oath to Emperor Roan Fel is a specific faction/time context and an eligibility gate; do not fabricate already completed missions or personal familiarity.

- **N3-06 — Imperial dark-side interpretation:** Printed Imperial Knights reject the dark side; Dezmin original dialogue calling the tradition a gray path needs review. Use printed rule for survey teaching; do not overwrite Mentor biography without owner direction.

- **N3-07 — Knight’s Armor Armor Mastery name collision:** Armor Mastery in Knight’s Armor and Armor Specialist are not automatically one same mechanic; each has distinct source and effect. Preserve tree-specific canonical identity.

- **N3-08 — Knight’s Resolve prerequisites:** Praetoria Ishu needs Block and Deflect; Praetoria Vonil needs Weapon Focus (lightsabers); Strength of the Empire needs Knight’s Morale; other talents have action and line-of-sight requirements.

- **N3-09 — Imperial Force Techniques:** Force Techniques appear at even Imperial Knight levels only; Q1 aspirations are not immediately selectable feats, talents, or powers.

- **N3-10 — Shaper species and Force Point constraints:** Yuuzhan Vong-only entry and no Force Points; forbid Force-point-derived shaper mechanics. No genetic upgrades from survey answers.

- **N3-11 — Shaper implant downstream harm:** Consent/willing target, proximity, action economy, encounter lifetime and post-encounter -3 persistent condition track with recovery must be retained in any recommendations and actual mechanics.

- **N3-12 — Shaper Hand optional physical process:** At level 6, lore permits installing a biotech shaper hand; do not mutate actor species/body/equipment automatically or treat a Q1 preference as consent to modification.

- **N3-13 — Biotech Specialist vs Biotech Surgery:** Distinct prerequisite feats. Skilled Implanter requires Biotech Surgery; default to published exact feat mapping.

- **N3-14 — Scum and Villainy skipped class: Charlatan:** Earlier v0.22 incorrectly described Scum and Villainy as containing one new prestige class (Outlaw). Printed book also introduces Assassin and Charlatan; mark its Q1 as MISSING, preserve the 32-class registry denominator, schedule catch-up before overall completion.

- **N3-15 — Conservative acceptance:** All Q1 responses express future intent only, never grant talent/Force technique/feat/equipment, imply established history, or finalize commitment. The 297 archetype/190 tag framework stays unchanged. No Q2-Q6 authoring or presentation/scoring decisions.


**LOCAL DRAFT ONLY.** Candidate answers are editorial source-linked intentions; no implementation policy, weighting, visible answer count, new ontology, acquisition or certification is authorized.


---

## 33. Final four prestige classes — authority audit and editor instructions (v0.25)

**Status:** DRAFT / read-only repository inspection / local editorial compilation. Covers the final registry classes Assassin, Charlatan, Improviser and Pathfinder. Maintains the existing locked six-question architecture; **only Q1 is authored**. Q1 responses express potential class development; no scoring, weighting, answer-count, rotation, tagged archetype selection, talent grant, membership grant, story invention, or implementation is approved.

### Primary printed references

- *Scum and Villainy*, printed pp. 28–32: Assassin (including Assassin/GenoHaradan talent trees and class Mark) and Charlatan (Trickery/Disgrace/Fortune and Score/Swindle).
- *Threats of the Galaxy*, printed p. 13: the Malkite Poisoner talent tree used by Assassin (five talent rules).
- *Rebellion Era Campaign Guide*, printed pp. 41–45: Improviser (Outlaw Tech, Procurement, Improviser; No Tools Required and Contraband) and Pathfinder (Awareness, Survivor, Pathfinder; Create Cover).
- *Core Rulebook* and *Starships of the Galaxy*: shared talent trees, as named above. Expansions indexed in the repository still require talent-level provenance certification.

### Class-feature progression, access, prerequisites

| Class | Entry evidence | Printed selectable trees | Features that are **not** talents |
|---|---|---|---|
| Assassin | Min level 7; trained Stealth; Sniper feat; Dastardly Strike talent | Assassin, GenoHaradan, Misfortune, Malkite Poisoner | Mark begins class level 2, grows at even levels |
| Charlatan | Min level 7; trained Deception/Persuasion; one Disgrace/Influence/Lineage talent | Trickery, Disgrace, **Fortune** | Score at class level 2; Swindle begins level 4, scales |
| Improviser | Min level 7; trained Mechanics/Use Computer; Skill Focus (Mechanics) | Improviser, Procurement, Outlaw Tech | No Tools Required at class level 1; Contraband at level 2 and later even levels |
| Pathfinder | Min level 7; trained Perception/Survival; at least two talents from Awareness/Camouflage/Survivor | Pathfinder, Awareness, Survivor | Create Cover begins class level 2, increases at even levels |

**Conflict — Charlatan Fortune missing from class access:** Printed *Scum and Villainy* explicitly permits the Fortune tree, while `packs/classes.db` currently lists `disgrace` and `trickery` only. Treat Fortune choices as **printed-rule supported but currently blocked by registry class-tree access**. Do not silently add to production data during this editorial pass.

**Conflict — Assassin unresolved raw tree reference:** The repository's `Assassin.system.talent_trees` contains literal `GenoHaradan`, while its ID/UUID authority points to `da7b731a3e434a7a`. Resolve source-reference normalization later. Do not discard GenoHaradan because of the raw field error.

**Mentors:** Delta (Assassin), Silvertongue Sela (Charlatan), Lucky Jack (Improviser), Lead (Pathfinder). Read from their actual repository dialogue. Lead lacks a `pathfinder` classPath greeting; the new line adapts her established Scout persona without assuming new campaign events.

**Scope distinction:** Malkite Poisoner and GenoHaradan access describes an Assassin's selectable tree set, not proof of enrollment in a specific organization or possession of toxins. Charlatan's trickery need not mean historical criminal convictions. Pathfinder is not automatically an Alliance soldier. Improviser does not start with Contraband or permanent devices. All class-level timings remain separate from aspirations.


## 34. Assassin — Q1 complete candidate answer library

**Source:** Scum and Villainy, printed pp. 28–30. **Mentor:** Delta. **State:** DRAFT; first-person character statements, not mechanical grants. **Candidate count:** 35 talent-linked + 4 class-feature/identity/neutral = **39**.

### Mentor introductory dialogue (candidate)

> "Heard you qualified to make a name disappear. Cute. The hard part isn’t landing a shot—it’s knowing when to move, when to wait, and how to get out. So what’s your specialty gonna be?"
>
> **Q1:** As an Assassin, what technique or discipline do you want to develop?

### Misfortune — 17 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `ASN-MI01` | Sudden Strike | “I want to exploit the instant a fight begins, before my target has settled into a defense.” |
| `ASN-MI02` | Sneak Attack | “I want to make an unexpected hit count when an opponent cannot properly guard against it.” |
| `ASN-MI03` | Befuddle | “I want misdirection to throw a target off balance before anyone commits to the next move.” |
| `ASN-MI04` | Hesitate | “I want a moment of uncertainty to steal the action an opponent needed to stop me.” |
| `ASN-MI05` | Walk the Line | “I want to control nearby space so a careless enemy has to reckon with my position.” |
| `ASN-MI06` | Sow Confusion | “I want to turn a target’s uncertainty into confusion that affects the people around them.” |
| `ASN-MI07` | Skirmisher | “I want to remain dangerous while moving, not only while holding a perfect firing position.” |
| `ASN-MI08` | Disruptive | “I want to interfere with an enemy’s plans without having to overpower them directly.” |
| `ASN-MI09` | Cunning Strategist | “I want a well-timed decision to make my allies more effective when our approach changes.” |
| `ASN-MI10` | Weakening Strike | “I want a precise hit to leave a target less capable of continuing the fight.” |
| `ASN-MI11` | Dastardly Strike | “I want a strike against an exposed target to leave them worse off than the wound alone would suggest.” |
| `ASN-MI12` | Improved Skirmisher | “I want constant movement to create a stronger advantage in the attacks that follow.” |
| `ASN-MI13` | Seize Object | “I want to take something important away from an enemy while exploiting a close opening.” |
| `ASN-MI14` | Stymie | “I want to interrupt the technique or advantage an opponent expects to rely on.” |
| `ASN-MI15` | Backstabber | “I want my positioning with allies to turn a distracted opponent into a vulnerable one.” |
| `ASN-MI16` | Improved Sneak Attack | “I want my attacks against unguarded enemies to become more decisive as my skill grows.” |
| `ASN-MI17` | Seducer | “I want charm and apparent harmlessness to create openings that brute force cannot.” |

### Malkite Poisoner — 5 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `ASN-MP01` | Numbing Poison | “I want a carefully applied poison to leave a victim unable to defend as effectively while it takes hold.” |
| `ASN-MP02` | Modify Poison | “I want to adapt the delivery of a poison when circumstances make the usual method impossible.” |
| `ASN-MP03` | Malkite Techniques | “I want to master the precise application of toxins to a suitable blade rather than depend on a crude strike.” |
| `ASN-MP04` | Vicious Poison | “I want my poisons to be harder for a victim’s body to resist.” |
| `ASN-MP05` | Undetectable Poison | “I want the effects of a poison I have used to be harder to treat or neutralize.” |

### Assassin — 9 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `ASN-AS01` | Murderous Arts I | “I want my attacks against a target I have marked to grow more dangerous through practiced precision.” |
| `ASN-AS02` | Sniping Master | “I want to settle my aim quickly when a target enters close firing distance.” |
| `ASN-AS03` | Get Some Distance | “I want to strike at close range and withdraw before an enemy can pin me down.” |
| `ASN-AS04` | Sniping Marksman | “I want an accurately prepared shot to overcome defenses that protect targets farther away.” |
| `ASN-AS05` | Murderous Arts II | “I want to carry the lessons of my first marked-target discipline into a more demanding level of mastery.” |
| `ASN-AS06` | Sniping Assassin | “I want a close-range precision shot to inflict damage beyond what an ordinary hit could do.” |
| `ASN-AS07` | Ruthless | “I want the defeat of one foe to give me a chance to act again before the battlefield settles.” |
| `ASN-AS08` | Shift | “I want to change position by a small, deliberate step without handing an enemy an easy opening.” |
| `ASN-AS09` | Advantageous Positioning | “I want to exploit opponents who are already outmaneuvered, rather than force every advantage alone.” |

### GenoHaradan — 4 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `ASN-GH01` | Deadly Repercussions | “I want the defeat of a chosen target to unsettle the other enemies who witness it.” |
| `ASN-GH02` | Manipulating Strike | “I want to use the pressure of an attack to steer an opponent into a mistake that benefits me.” |
| `ASN-GH03` | Improved Manipulating Strike | “I want to refine that manipulation until a successful strike creates a more consequential opening.” |
| `ASN-GH04` | Pulling the Strings | “I want influence over the outcome of a conflict without making my own role obvious.” |

### Class features, personal identity, capstone and neutral

| ID | Anchor / intent | First-person Q1 answer |
|---|---|---|
| `ASN-CF01` | Mark — acquired at Assassin level 2 | “I want to study a chosen opponent closely enough that each encounter with them becomes more dangerous for them.” |
| `ASN-ID01` | Identity / controlled violence | “I want to be exact about when force is necessary instead of making violence my answer to every problem.” |
| `ASN-ID02` | Career fulfillment | “I worked to become an Assassin. I could spend the rest of my career perfecting this trade without pursuing another title.” |
| `ASN-NEUTRAL` | Uncertain direction | “I want to understand the differences between stealth, sniping, maneuver, poisons, and manipulation before choosing my specialty.” |

**Count verified:** 35 talent-linked + 4 other = **39 candidates**.


## 35. Charlatan — Q1 complete candidate answer library

**Source:** Scum and Villainy, printed pp. 30–32. **Mentor:** Silvertongue Sela. **State:** DRAFT; first-person character statements, not mechanical grants. **Candidate count:** 25 talent-linked + 5 class-feature/identity/neutral = **30**.

### Mentor introductory dialogue (candidate)

> "Darling, a convincing smile opens more doors than a blaster ever will. After that, it’s a question of timing: a well-placed lie, a useful distraction, or a little luck. Which part of the art would you like to perfect?"
>
> **Q1:** As a Charlatan, what kind of social craft or calculated misdirection do you want to master?

### Disgrace — 6 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `CHA-DG01` | Unreadable | “I want people studying my manner and intentions to come away with less certainty, not more.” |
| `CHA-DG02` | Dirty Tactics | “I want an artful feint to make an opponent vulnerable to the allies fighting beside me.” |
| `CHA-DG03` | Misplaced Loyalty | “I want to talk a hostile person into withholding an attack, even if only for a moment.” |
| `CHA-DG04` | Ambush | “I want a few carefully chosen words before a fight to help my allies move into better positions.” |
| `CHA-DG05` | Castigate | “I want a sharp rebuke to unsettle an opponent before their next decision.” |
| `CHA-DG06` | Two-Faced | “I want to use conflicting appearances and sudden betrayals to control how an opponent reacts.” |

### Trickery — 6 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `CHA-TR01` | Innocuous | “I want enemies to underestimate me as harmless until their next attack is already compromised.” |
| `CHA-TR02` | Improved Soft Cover | “I want to position myself beside another person and make that proximity protect me from an attack.” |
| `CHA-TR03` | Cunning Distraction | “I want a successful feint to create room for me to move before the opponent adjusts.” |
| `CHA-TR04` | Damaging Deception | “I want to talk a target into revealing an opening that my allies can exploit.” |
| `CHA-TR05` | Distracting Shout | “I want a perfectly timed warning or distraction to help an ally evade an incoming attack.” |
| `CHA-TR06` | Treacherous | “I want my apparent cooperation to conceal the moment when I turn the situation to my advantage.” |

### Fortune — 13 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `CHA-FT01` | Fool's Luck | “I want one streak of outrageous luck to carry me through a task I had no business attempting.” |
| `CHA-FT02` | Ricochet Shot | “I want an unlikely angle or bouncing shot to reach an opponent who thought they were safe.” |
| `CHA-FT03` | Lucky Shot | “I want one fortunate opening to salvage a shot that would normally miss.” |
| `CHA-FT04` | Dumb Luck | “I want a bad decision to leave me one last lucky chance rather than a certain failure.” |
| `CHA-FT05` | Gambler | “I want to read a wager well enough to risk my credits only when the odds can turn my way.” |
| `CHA-FT06` | Lucky Stop | “I want a stroke of fortune to prevent the hit that would otherwise bring me down.” |
| `CHA-FT07` | Fortune's Favor | “I want a particularly successful move to grant me the momentum to do something more.” |
| `CHA-FT08` | Knack | “I want a second attempt when I fumble a skill I normally know well.” |
| `CHA-FT09` | Better Lucky than Dead | “I want to survive the unexpected blow that should have ended my story.” |
| `CHA-FT10` | Unlikely Shot | “I want an improbable attack to work when my ordinary methods have run out.” |
| `CHA-FT11` | Labyrinthine Mind | “I want my thoughts to be difficult to predict or manipulate when someone probes for a weakness.” |
| `CHA-FT12` | Uncanny Luck | “I want to turn an extraordinary stroke of luck into a way around a dangerous situation.” |
| `CHA-FT13` | Avert Disaster | “I want one last chance to prevent a catastrophe just as it is about to happen.” |

### Class features, personal identity, capstone and neutral

| ID | Anchor / intent | First-person Q1 answer |
|---|---|---|
| `CHA-CF01` | Score — acquired at Charlatan level 2 | “I want to turn my practiced charm into real opportunities for credits and favors.” |
| `CHA-CF02` | Swindle — acquired at Charlatan level 4 | “I want to become better at winning a valuable concession from someone convinced the deal was their idea.” |
| `CHA-ID01` | Identity / social ingenuity | “I want to solve problems through negotiation, appearances, and nerve rather than force.” |
| `CHA-ID02` | Career fulfillment | “I chose the art of the con as my career. I do not need another title to keep getting better at it.” |
| `CHA-NEUTRAL` | Uncertain direction | “I want to explore deception, luck, influence, and distraction before deciding what kind of Charlatan I will be.” |

**Count verified:** 25 talent-linked + 5 other = **30 candidates**.


## 36. Improviser — Q1 complete candidate answer library

**Source:** Rebellion Era Campaign Guide, printed pp. 41–43. **Mentor:** Lucky Jack. **State:** DRAFT; first-person character statements, not mechanical grants. **Candidate count:** 14 talent-linked + 5 class-feature/identity/neutral = **19**.

### Mentor introductory dialogue (candidate)

> "Okay, so you’ve got no tools, half a broken machine, and exactly the wrong spare parts. That’s practically a vacation! Are we fixing something, making something, or finding the one person who has what we need?"
>
> **Q1:** As an Improviser, what problem-solving specialty do you want to develop?

### Outlaw Tech — 4 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `IMP-OT01` | Personalized Modifications | “I want to tune a powered weapon for the encounter at hand without rebuilding it from scratch.” |
| `IMP-OT02` | Fast Repairs | “I want a hurried field repair to keep failing machinery useful long enough to matter.” |
| `IMP-OT03` | Hot Wire | “I want my mechanical knowledge to help me bypass computerized access when a console stands in the way.” |
| `IMP-OT04` | Quick Fix | “I want to patch equipment before it completely fails, buying the team a little more time.” |

### Procurement — 5 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `IMP-PR01` | Just What Is Needed | “I want to find the right replacement parts and help others restore more from a difficult repair.” |
| `IMP-PR02` | Excellent Kit | “I want the equipment I obtain for the team to be tougher and easier to maintain.” |
| `IMP-PR03` | Only the Finest | “I want to source expertly modified gear without paying an extra premium for every improvement.” |
| `IMP-PR04` | Black Market Buyer | “I want to locate someone who can supply restricted equipment without wasting days searching.” |
| `IMP-PR05` | Right Gear for the Job | “I want to produce the tool that lets an ally attempt a specialized task they were not trained to handle.” |

### Improviser — 5 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `IMP-IM01` | Improved Jury-Rig | “I want to bring a badly damaged machine back into the fight with one fast, reliable repair.” |
| `IMP-IM02` | Improvised Device | “I want to turn spare parts into a temporary but functional device when proper equipment is unavailable.” |
| `IMP-IM03` | Capture Droid | “I want to reactivate a disabled enemy droid and temporarily bring it to our side.” |
| `IMP-IM04` | Custom Model | “I want to apply a specialist modification to a device I assemble in the field.” |
| `IMP-IM05` | Bigger Bang | “I want an improvised explosive to deliver more force when a carefully measured blast is required.” |

### Class features, personal identity, capstone and neutral

| ID | Anchor / intent | First-person Q1 answer |
|---|---|---|
| `IMP-CF01` | No Tools Required — first-level class feature | “I want to work with incomplete equipment and still find a workable technical solution.” |
| `IMP-CF02` | Contraband — acquired at Improviser level 2 | “I want to maintain access to useful hard-to-find gear when ordinary supplies cannot meet the mission.” |
| `IMP-ID01` | Identity / adaptive engineering | “I want people to know that a broken plan is still solvable when I am around.” |
| `IMP-ID02` | Career fulfillment | “I wanted a career making things work. I can keep refining that craft without chasing another class.” |
| `IMP-NEUTRAL` | Uncertain direction | “I want to try repairs, custom gear, sourcing supplies, and field inventions before deciding where to specialize.” |

**Count verified:** 14 talent-linked + 5 other = **19 candidates**.


## 37. Pathfinder — Q1 complete candidate answer library

**Source:** Rebellion Era Campaign Guide, printed pp. 43–45. **Mentor:** Lead. **State:** DRAFT; first-person character statements, not mechanical grants. **Candidate count:** 22 talent-linked + 4 class-feature/identity/neutral = **26**.

### Mentor introductory dialogue (candidate)

> "Finding a route is the easy part. Making sure everyone can use it—and has somewhere defensible to stop—is the job. So what are you developing: sharper reconnaissance, better movement, or positions the whole team can trust?"
>
> **Q1:** As a Pathfinder, what part of scouting and establishing safe ground do you want to master?

### Awareness — 8 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `PTH-AW01` | Expert Tracker | “I want to follow difficult trails so our group is not led astray by fading evidence.” |
| `PTH-AW02` | Weak Point | “I want to identify a flaw in an enemy’s protection when ordinary attacks cannot get through.” |
| `PTH-AW03` | Reset Initiative | “I want to recover the advantage of timing after a fight begins to turn against us.” |
| `PTH-AW04` | Improved Initiative | “I want to recognize the start of trouble before the rest of the group is caught flat-footed.” |
| `PTH-AW05` | Keen Shot | “I want to remain accurate when smoke, poor light, or concealment obscures a threat.” |
| `PTH-AW06` | Uncanny Dodge II | “I want to remain aware enough that enemies on opposite sides cannot easily trap me.” |
| `PTH-AW07` | Uncanny Dodge I | “I want a sudden ambush to find me ready to defend myself.” |
| `PTH-AW08` | Acute Senses | “I want to notice small changes in terrain or sound before they endanger the team.” |

### Survivor — 4 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `PTH-SV01` | Evasion | “I want to get clear of the worst of explosions and other broad attacks.” |
| `PTH-SV02` | Extreme Effort | “I want a brief burst of strength when a barrier blocks the only safe route.” |
| `PTH-SV03` | Sprint | “I want to cross dangerous ground quickly when the others need a route opened.” |
| `PTH-SV04` | Surefooted | “I want to move across rough terrain without losing ground to it.” |

### Pathfinder — 10 candidate answers

**Status:** Source-tree anchored editorial candidates; individual prerequisites and full effects must be rechecked before player-facing certification.

| ID | Talent name (developer only) | First-person Q1 answer |
|---|---|---|
| `PTH-PF01` | Obscuring Defenses | “I want enemies firing into our prepared position to have a harder time landing their shots.” |
| `PTH-PF02` | Escort Fighter | “I want to move with a nearby ally so neither of us is stranded while changing position.” |
| `PTH-PF03` | Enhance Cover | “I want to help someone make more effective use of the cover they already have.” |
| `PTH-PF04` | Safe Zone | “I want to identify a defensible area where my allies can withstand danger more confidently.” |
| `PTH-PF05` | Defensive Measures | “I want the ground around our safe position to slow enemies trying to rush us.” |
| `PTH-PF06` | Relocate | “I want to abandon an old position deliberately and help my team move swiftly toward the next one.” |
| `PTH-PF07` | Launch Point | “I want allies advancing out of our secure position to strike with better timing.” |
| `PTH-PF08` | Zone of Recuperation | “I want injured allies who catch their breath inside our secure position to recover more strength.” |
| `PTH-PF09` | Bunker Blaster | “I want to find a firing angle from cover without wasting time lining up a distant target.” |
| `PTH-PF10` | Safe Passage | “I want to give an ally a clear moment to move and be ready to punish anyone who attacks them in transit.” |

### Class features, personal identity, capstone and neutral

| ID | Anchor / intent | First-person Q1 answer |
|---|---|---|
| `PTH-CF01` | Create Cover — acquired at Pathfinder level 2 | “I want to turn nearby terrain and loose materials into useful cover before the enemy closes in.” |
| `PTH-ID01` | Identity / team safety | “I want the people following my route to reach their destination alive, not merely arrive first.” |
| `PTH-ID02` | Career fulfillment | “I worked to find ground worth defending and help others hold it. I could do this for my entire career.” |
| `PTH-NEUTRAL` | Uncertain direction | “I want to develop my eye for terrain, my survival skills, and my ability to prepare safe positions before choosing a specialty.” |

**Count verified:** 22 talent-linked + 4 other = **26 candidates**.


## 38. Completion and certification ledger — v0.25

### Four-class pass summary

| Class | Mentor | Talent-linked | Feature/identity/neutral | All candidates |
|---|---|---:|---:|---:|
| Assassin | Delta | 35 | 4 | 39 |
| Charlatan | Silvertongue Sela | 25 | 5 | 30 |
| Improviser | Lucky Jack | 14 | 5 | 19 |
| Pathfinder | Lead | 22 | 4 | 26 |
| **TOTAL** | | **96** | **18** | **114** |

### Remaining review and implementation issues

1. **F4-01 — Charlatan omitted Fortune tree:** Printed permission contradicts repository class-tree list; preserve Fortune as qualified conditional candidates until production class-tree authority is repaired. Do not confuse **entry talents** Disgrace/Influence/Lineage with selectable class talents Disgrace/Trickery/Fortune.
2. **F4-02 — Assassin GenoHaradan tree ID:** The raw `talent_trees` contains text `GenoHaradan` rather than normal tree source ID; `talentTreeSourceIds` and `talentTreeUuids` supply the actual reference. Separate membership narrative from printed access.
3. **F4-03 — Malkite Poisoner published source:** Talent tree exists in *Threats of the Galaxy*, printed p. 13; poison delivery, Fortitude checks, cure DC, applications, prerequisites and equipment must be respected. A Q1 answer does not provide poison or authorize use.
4. **F4-04 — Assassin Mark timing:** Mark begins at level 2; it is not the first-level talent, immediate hidden target marker, or unconditional bonus against all foes.
5. **F4-05 — Expanded shared Misfortune/Fortune/Outlaw Tech talents:** Some tree names span several books; use exact source identity and prerequisites rather than infer book provenance from class tree membership alone.
6. **F4-06 — Charlatan class progression:** Score and Swindle belong to class features; no credits, rerolls, or material benefit results directly from expressing Q1 interest.
7. **F4-07 — Improviser Contraband:** Per-class-level allocation, purchasing timing, item availability, credit ceilings and reset behavior belong to its printed feature. Not starting cash or ordinary unlimited equipment access.
8. **F4-08 — Improviser device lifecycle:** Improvised Device is temporary, has a DC and time/cost restrictions, and is not a permanent item creation path. Capture Droid temporarily changes a qualifying disabled droid to an ally and the droid is destroyed at encounter end.
9. **F4-09 — Pathfinder two different tree sets:** Entry talents may come from Camouflage but Pathfinder class-level talent choices may not. Its Safe Zone is a talent with prerequisites; Create Cover is a separate class feature.
10. **F4-10 — Pathfinder alliance identity:** The source states many work for Alliance Pathfinders but does not require that membership. Lead's dialogue should preserve Scout personality and not fabricate a military assignment.
11. **F4-11 — Mentor diction:** Delta is casual and barbed; Sela playful and persuasive; Jack fast and inventive; Lead skeptical and practical. Intro lines do not presume personal mentorship, prior kills, completed scams, invented repairs, or former missions.
12. **F4-12 — Full registry coverage vs certification:** 32/32 prestige classes now have editorial Q1 libraries. This is **not** evidence that every answer is source-certified, class eligible, owner approved, correctly scored, or ready for Foundry. Maintain earlier quarantine entries unchanged and perform a cross-book final pass.
13. **F4-13 — Cross-survey locks:** Do not implement answer rotation, count, weighting, archetype/tag changes, or Q2–Q6; no migration, GitHub changes, or chat-to-live actor writes.

### First-pass completeness result

**32 / 32 distinct `packs/classes.db` prestige class identities now have a Q1 first-pass draft in the rolling design**, including the four previously missing classes. Source-level and mechanical certification remains open. No repo write or commit.
---

## 39. Cross-book Q1 audit, corrections, and V2 implementation handoff (v0.26; 2026-11-14)

**Audit disposition: STRUCTURAL COVERAGE VERIFIED; EDITORIAL CORRECTIONS APPLIED; INDIVIDUAL MECHANICAL CERTIFICATION INCOMPLETE. This document is design authority, NOT a production-ready talent eligibility database.** Its legacy sections preserve the dates and status of earlier local-only passes. The present GitHub commit authorizes publishing the design record, **not** applying survey rules to actors or merging unfinished survey code.

### 39.1 Decision precedence and the Q1/Q2 boundary (critical)

1. **The later owner-requested pivot in §8 supersedes the earlier predominantly retrospective Q1 draft in §§1–7 for purposes of this class-specific bank.** Q1 is a light *class-discovery* conversation: the Mentor acknowledges the earned threshold, and the player says in first person which **future class capability or vocation** interests them. It is not an assertion that the character has acquired the named talent. Historical journey recognition remains in the Mentor's framing and the actor-evidence context. This conclusion corrects an initially suspected conflict found when reading only §1; §8 explicitly resolves it.
2. **Q2 remains distinct:** teach and validate actual newly available class abilities, level timing, prerequisites, and legal choices. Q1's educational answer may point Q2 toward a relevant explanation but never selects a talent, feat, Force Technique, Force Secret, Medical Secret, asset, organization, or equipment.
3. Q3 responsibility scenarios, Q4 Dip/Dive/Swim/Undecided future depth (bridge is a separate intent), Q5 fulfillment/optional new goal, and Q6 full shared Mentor Reflection including NOT/AM correction remain exactly as approved. Do not reinstate the legacy four-question `prestigeMeaning/commitmentDepth/specialization/profileReading` survey or its bias-pruning semantics.
4. **No answer count, rotation, weighting, archetype target, or tag transformation is approved.** The complete class banks are browseable editorial candidates, not a mandate to render hundreds of controls. The Ace Pilot six-tree sample (§12) is a *proposal*, not a global configuration.

### 39.2 Cross-book corrections made in v0.26

| Finding | Correction / implementation treatment | Status |
|---|---|---|
| The earlier Scum and Villainy pass called Outlaw the book's only new prestige class. | **Three** new prestige classes are in that book: **Assassin, Charlatan, Outlaw**; the Master Privateer chapter is an updated reprint, not a fourth new class. Assassin and Charlatan were authored in §§34–35. The v0.22 **22/32** figure is preserved only as a dated checkpoint, not the final book census. | CORRECTED global/book census; earlier history retained |
| Fourteen capstone/fulfillment statements began with impersonal phrases such as “This is,” “Being,” or “Becoming.” | Revised those 14 answer texts to unambiguously begin with the player's “I...” voice while preserving their meaning, ID, and prestige-as-possible-capstone intent. | CORRECTED answer text |
| The original Q1-Journey wording appears to conflict with forward-looking class Q1 banks. | Follow the later §8 class-discovery pivot. Do not change the six-question order or substitute Q2 for Q1. | RESOLVED via documented owner direction |
| Charlatan's printed class access includes Fortune; `packs/classes.db` contains Disgrace/Trickery only. | Retain the 13 Fortune answers as printed-rule candidates, **not selectable through the current class tree authority** until the class record and validators are reconciled. | BLOCKED for production |
| Jedi Master and Sith Lord can select an eligible general Force talent tree under their published class text; the current class records list only Duelist or Sith respectively. | The repository's one-tree entries are incomplete. Use printed grant + exact prerequisites to determine eligible general Force trees; never auto-inherit unrelated Jedi Knight/Sith Apprentice class-specific trees. | BLOCKED for production |
| Sith class dark-side threshold conflicts with a repository house rule. | Core requires **Dark Side Score equal to Wisdom** for the published Sith class-feature condition; repository has **Dark Side Score at least 1**, labeled a house rule. Require explicit GM/system decision; do not pretend these authorities agree. | RULE CHOICE REQUIRED |
| Same-name talents occur in distinct published trees (examples: Sith Alchemy; Stay in the Fight; Armor Mastery). | Track exact `(source, tree, record/printed identity)` rather than joining by display name; do not merge capabilities, prerequisites, or provenance. | SOURCE-ID GATE |
| Mismatched identifiers/routes exist for Assassin's GenoHaradan tree, Independent Droid's tree UUID, and the Kharjo Mentor registry. | Resolve exact class-tree references and the `Melee Duelist -> Kharjo` registry entry before enabling production. **Lead/Pathfinder** has no dedicated greeting; use the verified Lead personality, not an invented mission. | ROUTING GATE |
| Some authored talent candidates remain not demonstrably supported by complete printed mechanics (including Master of Teräs Käsi, Gunslinger Pistoleer titles, Outlaw Fringer/Virus and selected Sith cases). | Preserve them in the research record with **QUARANTINE**, never as enabled selections. Source verification must inspect the exact book/page, ability text, tree and prerequisites; an NPC build or pack label alone cannot certify the rule. | QUARANTINE |
| Imperial Knight dialogue sometimes describes a “gray” doctrine, and Theron sometimes portrays Vanguard only as a stationary shield. | For Q1, apply printed **Imperial Knight dark-side rejection** and printed **Vanguard advance-scout** identity; keep Dezmin's discipline and Theron's protection as distinctive voices. Do not copy contrary legacy greetings verbatim. | EDITORIAL GUARDRAIL |

### 39.3 Coverage and evidence quality

- The repository inventory contains **32 prestige class records**. All **32 distinct class identities** have candidate Q1 libraries in this file. Exact class count does **not** mean complete one-to-one certification of every indexed talent or every response.
- A structural pass found **no repeated IDs among the 938 backtick-delimited table ID occurrences** (including seven non-answer Ace Pilot routing examples). This is a *bounded syntax check*, not a claim that only 938 options exist: earlier sections use multiple table formats. The complete bank was preserved, not pruned.
- Individual editorial replies have been spot-audited against the supplied Core, KOTOR, Force Unleashed, Scum and Villainy, Clone Wars, Galaxy at War, Legacy Era, Rebellion Era and other relevant text/PDF source layers. **Not every talent effect across the complete corpus has been independently re-certified.** The source TXT is a locating aid; verify uncertain effects visually in the printed PDF.
- Source-status vocabulary for a future machine-readable extraction: `SOURCE_CERTIFIED` = primary printed book/page, correct talent/tree identity, benefit, prerequisites and class access cross-checked; `EDITORIAL_DRAFT` = plausible, not completely re-certified; `CONDITIONAL` = printed but not legal unless specific character/campaign restrictions are met; `QUARANTINE` = unreliable, missing or contradictory rule identity. **Only SOURCE_CERTIFIED items that also pass the current actor's legal gates may influence recommendations.** Neither Q1 text nor selection grants a mechanic.
- All existing earlier quarantine entries stay on hold. Later corrections have precedence over historic checkpoint language; keep historic notes for traceability, not as active runtime authority.

### 39.4 V2 implementation plan — follow in this order, no compatibility shims

**Phase A — Freeze and certify the source catalog (no actor writes).** Read `packs/classes.db`, `packs/talent_trees.db`, the authoritative talent definitions and source/audit artifacts, and the printed books. Establish for each of the 32 classes: stable class ID, canonical Mentor key, available tree IDs, per-tree canonical talent identities, eligibility gates, level-by-level features, source/page, source status and quarantine. Reconcile the blocking exceptions in §39.2; do not guess new talents from names. The 190-tag ontology and 297-archetype registry are existing authorities to be read, not rebuilt from Q1 prose.

**Phase B — Normalize presentation data.** Extract every first-person candidate as data keyed by **(prestige class ID, unique answer ID)** with player text, Mentor introductory line, source identity references, class feature vs talent vs identity vs neutral type, source status, prerequisites/eligibility notes and optional book/page. Keep `talentTreeIds` and canonical printed tree references distinct from source prerequisites that merely qualify entry. Preserve neutral and the capstone option for every class. Do not mutate `packs/*.db` in this phase. Uncertified, quarantined and disallowed entries must not appear as enabled mechanics-driven recommendations.

**Phase C — Implement new six-question prestige survey alongside V2 finalization authority, then remove the old competing execution path in an intentional cutover.** The current `scripts/mentor/mentor-survey/definition-builder.js` still constructs four legacy questions; `scripts/apps/progression-framework/steps/prestige-survey-step.js` still reads and writes `mentorBuildIntentBiases`, including `mergePrestigeBias`, `pruneWeight`, and a combined `Bridge` depth value. Trace all live consumers before replacing these. Do **not** silently attach new content to this four-question weighted flow. Use a verified candidate class ID and pending/finalized transaction state. Resolve Mentor by exact class->Mentor mapping; fail closed for unknown IDs rather than substituting Ol' Salty.

**Phase D — Render Q1 class discovery without promising ownership.** Before final class acquisition use *threshold/eligibility* tense, not “You already have [feature/rank].” Acknowledge completed entry requirements only if verified. Allow the player to review all supported specialization families and a neutral option; the exact initial count, browsing/rotation, history-aware ordering and weights require **owner approval**. Do not hide entire legal trees simply because an unapproved ranking would omit them. Store an answer ID, original text/version, candidate class, Mentor, primary-source evidence references and an actor snapshot pointer; do **not** create an acquired feat/talent/Force power or an explicit new career-goal event.

**Phase E — Preserve independent authority lanes and atomic completion.** Keep (1) declared career goal, (2) inferred identity, (3) mechanical eligibility, (4) acquired finalized choices, and (5) survey self-report independently typed and provenance-linked. Q6 may amend inference but may not rewrite past goals or owned feats. On cancel/retake, do not claim or persist a completed class; use idempotent event/transaction IDs and ensure a repeated survey does not double-apply interpretation. Existing player state must not be destroyed by prune multipliers or rebuilt from display strings.

**Phase F — Validate and switch over.** Before retiring old flows, run tests with Foundry VTT v13 and V2 progression for each class at earliest legal entry, later levels and multiclass pathways. Tests must cover class restrictions (Droid, Yuuzhan Vong, Sith/Jedi/Imperial traditions, dark-side score, affiliation), sourcebook access, prerequisites, contested same-name talents, one-tree class gaps, all 32 Mentor routes, no invented actor history, neutral/capstone semantics, false pending-finalized narration, replay/cancel/revert, Q6 NOT/AM preservation, unknown IDs, and source-quarantine exclusion. Do not ship without evidence of clean fail-closed behavior and regression test results.

### 39.5 Implementation acceptance checklist

- [ ] Confirm source-verified class/tree/talent/feature catalog for every class, with book/page and per-answer status; unresolved names excluded.
- [ ] Resolve Charlatan Fortune, general Force access, raw tree ID/UUID anomalies, Mentor Kharjo mapping, and applicable Sith RAW-versus-house-rule decision.
- [ ] Approve Q1 initial slate/count and browse policy; do not conflate presentation with talent acquisition.
- [ ] Approve how answer interest relates to existing archetypes/tags before coding any scoring.
- [ ] Use the later §8 Q1 class-discovery decision with Mentor retrospective framing; reserve exact capability/legal-grant explanation for Q2.
- [ ] Keep Q4 bridge separate from Dip/Dive/Swim/Undecided; never force upward prestige class progression.
- [ ] Validate all 32 classes under pending and finalized progression, with exact Mentor voice and no fabricated history.
- [ ] Verify all Q6 A–E interpretation branches and D/E NOT/AM corrections without pruning prior actor choices.
- [ ] Add a cutover/removal test so the four-question legacy survey and weighted pruning do not run in parallel with the approved design.
- [ ] Obtain explicit owner signoff for content, policy and rules exceptions before enabling the new player-facing survey.

**Audit scope of this commit:** documentation-only; it does **not** amend the current Foundry VTT runtime, class packs, Mentor registry, schema, source audit database, or archetype weights. All earlier local-version “no GitHub modification” statements refer to their original dated passes; this v0.26 publication is the subsequent authorized documentation commit.
