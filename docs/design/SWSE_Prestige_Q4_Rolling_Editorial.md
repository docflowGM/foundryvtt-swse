# SWSE Prestige Survey, Q4 “The Commitment”
## Rolling Local Editorial Design Record

**Started:** 2026-11-15  
**Last local editorial update:** 2026-11-15  
**Status:** Design review only. **1 approved class, 31 proposed classes, 0 not yet drafted.**  
**Repository:** `docflowGM/foundryvtt-swse`  
**Reference branch:** `design/prestige-q2-character-synthesis-v08`  
**Verified branch HEAD at last GitHub check:** `e54fe1a552305b4b3fe201f8967819e0f72679c1` (identical to cited Q3 checkpoint).  
**Local file:** `/mnt/data/SWSE_Prestige_Q4_Rolling_Editorial.md`  
**Boundary:** This file is a local editorial working copy. No changes to Foundry runtime, source data, scoring, GitHub, commits, or pull requests are authorized by its existence.

---

## 1. Owner decisions and chronological change log

| Date | Decision or work | Status |
|---|---|---|
| 2026-11-15 | Prestige Q4 is **future investment in the current newly entered prestige class**, not a vote on the value of earning that class, the class's acquired status, or a request to move to another class. | Approved governing requirement |
| 2026-11-15 | Shared depth-answer identities are `dip`, `dive`, `swim`, `undecided`; “bridge” is a route/goal purpose for Q5, **not** a fifth depth. | Approved governing requirement |
| 2026-11-15 | Shared player answer bank in §2, with first-person statements and no rigid level quotas. | Approved Q4 approach |
| 2026-11-15 | **Ace Pilot / Mayu** two-tense introductory prototype and shared-answer pattern accepted by owner as reference for remaining classes. | **APPROVED, class #1** |
| 2026-11-15 | **Bounty Hunter / Kex Varon** initial prototype was presented for review; owner asked for the next five without specifically approving Kex. | **PROPOSED, class #2** |
| 2026-11-15 | **Crime Lord / Tío the Hutt**, **Elite Trooper / Breach**, **Force Adept / Seeker Vera**, **Force Disciple / Riquis**, **Gunslinger / Rajma** authored as next five editorial drafts after Kex. | **PROPOSED, classes #3–#7** |
| 2026-11-15 | Owner explicitly requested a continuing **rolling local Markdown record**. | This document created |
| 2026-11-15 | Owner instructed **“Next 5”**; drafted **Jedi Knight / Miraj, Jedi Master / Miraj, Officer / Admiral Korr, Sith Apprentice / Darth Malbada, Sith Lord / Darth Miedo** as proposals. Earlier six remain unapproved; no repository implementation authorized. | **PROPOSED, classes #8–#12** |
| 2026-11-15 | Owner requested the next batch and specified **replace all em dashes with simple commas throughout the rolling file**. Drafted **Corporate Agent / Marl Skindar, Gladiator / Pegar, Melee Duelist / Blade Master Kharjo, Enforcer / Krag the Immovable, Independent Droid / Seraphim**. Applied a punctuation-only normalization to older material, including the approved Ace Pilot copy, without changing its approved intent. | **PROPOSED, classes #13–#17** |

| 2026-11-15 | Owner instructed **"Keep going"**; drafted **Infiltrator / Delta, Master Privateer / The Captain, Medic / Kyber, Saboteur / Spark, Outlaw / Rogue** as classes #18-#22. Kept all unapproved drafts in proposed state and continued comma-only punctuation discipline. | **PROPOSED, classes #18-#22** |
| 2026-11-15 | Owner requested the next batch; drafted **Droid Commander / General Axiom, Military Engineer / Chief Engineer Rax, Vanguard / Shield Captain Theron, Martial Arts Master / Master Zhen, Imperial Knight / Dezmin** in roster order. All five remain proposals; approved four-answer contract and all earlier review statuses retained. | **PROPOSED, classes #23-#27** |
| 2026-11-15 | Owner instructed **"Keep going"**; drafted the final five, **Shaper / Shaper Urza, Assassin / Delta, Charlatan / Silvertongue Sela, Improviser / Lucky Jack, Pathfinder / Lead**. All 32 classes now have draft Q4 coverage; only Mayu is owner-approved. Punctuation check retained zero em dashes throughout. | **PROPOSED, classes #28-#32** |

**Approval discipline:** The request to “do the next 5” authorizes drafting, not automatic approval of their wording or approval of Kex. Never mark a class as approved without an explicit owner decision. Record every later revision, approval, and rejection here; keep superseded wording in a history appendix if it would otherwise be lost.

---

## 2. Shared approved Q4 contract

### 2.1 Question purpose and placement

- **Q1:** Class discovery / the path leading to prestige.
- **Q2:** Character-strength synthesis and the prestige achievement; does not force class talent choices.
- **Q3:** One prestige-specific scenario, testing how the character uses the role.
- **Q4, The Commitment:** How much **additional future advancement** the character intends to devote to the *current* prestige class, irrespective of its achievement value.
- **Q5, The Future:** Career destination, continuing in one's achieved role, bridge, other goals, future change of direction.
- **Q6, The Mentor's Reflection:** Evidence-grounded identity summary, shared accuracy/correction pathway.

**Shared question template:** “How deeply do you intend to develop your skills as a [Prestige Class]?”

The Mentor introduction is specific to the class and character; the four answer labels are standardized and written as the player character's own first-person speech. A class-local explanatory rail can clarify the choice without modifying its meaning. No raw engine tags, weightings, archetype keys, or hidden scores appear in the player's view.

### 2.2 Shared four-answer bank, LOCKED FOR THESE EDITORIAL PROPOSALS

| Canonical answer ID | Player-facing first-person text | Intent interpretation |
|---|---|---|
| `dip` | **“I want to learn a few more things from this path, without making it the focus of all my future training.”** | Selective, limited additional investment. Not disapproval, rejection, or devaluation of the achieved class. |
| `dive` | **“I want to spend real time developing this discipline and see how far I can take it.”** | Sustained exploration of the current prestige class; no exclusive or maximum-level obligation. |
| `swim` | **“I want to make continued growth in this discipline a major priority for my future.”** | Strong future priority on advancing within the current prestige class where legal and available; no auto-assigned class completion or next-class goal. |
| `undecided` | **“I haven't decided how deeply I want to pursue this path. I'd rather see where it takes me.”** | Depth genuinely undetermined; cannot infer a low preference, rejection, identity pivot, or a new destination. |

No fifth `bridge` depth. “Bridge” can coexist with any of the above, as a separately confirmed future-goal purpose in Q5.

### 2.3 Fixed behavior and authoritative boundaries

1. **Separate four lanes:** (a) expressly declared future depth, (b) inferred current identity, (c) mechanically legal future advancement, and (d) finalized/owned class acquisition. One lane must not impersonate another.
2. **Two voice states:** pending prestige selection uses conditional/threshold language; finalized acquisition can acknowledge the earned title. Do not say an uncommitted class level has been acquired.
3. **No fabricated history:** do not claim successful bounties, criminal operations, combat missions, personal Mentor training, guild admission, Jedi affiliations, Force experiences, names, titles, or rank beyond a fact established from actor state.
4. **Level-budget awareness:** inspect actual remaining character levels and actual prestige-class limit/eligibility before offering mechanically actionable long-range advice. `dip`/`dive`/`swim` are *not* numerical level commitments. If little or no future legal room remains, show honest feasibility context without overriding the player's expressed aspiration. Final handling of the zero-budget edge case remains a separate implementation/editorial decision.
5. **Legal mechanics and advancement:** canonical V2 authorities, not survey labels, decide what a class grants and what advancements are available. No talent, feat, class feature, Force capability, or prerequisite is granted by an answer.
6. **Bounded intent evidence:** record only the chosen Q4 answer as an independently provenance-tagged preference if/when authorized for runtime. Unchosen labels carry no evidence; `undecided` contributes no affirmative depth preference.
7. **No goal rewrite:** answering Q4 does not silently erase earlier level-one/multiclass aspirations or choose another class. Q5 is where deliberate future-goal choices are asked.
8. **No implementation:** all interface and data behavior here is proposed design; no implementation or scoring change is approved.

### 2.4 Class-local explanation pattern

Each class offers four optional natural-language explanations, one per answer, without introducing mechanically unverified promises. Do not force the player to read an explanation before choosing. The previous Ace Pilot prototype's interactive selector was a **display-only editorial preview**; it does not save an answer to Foundry.

---

## 3. APPROVED, #1 Ace Pilot / Mayu

**Mentor identity:** `mayu`, registry ID `m19`  
**Dialogue source:** `data/dialogue/mentors/mayu/mayu_dialogue.json`  
**Voice:** fast, confident, teasing; instinct, momentum, the thrill of piloting; bravado with earned experience underneath.

**Pending-selection introduction, APPROVED:**

> “Well, look at you. Ace Pilot's within reach. Not bad. But getting there and deciding how much further to push yourself are two different things. So tell me, how much more training are you putting into being an Ace?”

**Finalized-acquisition introduction, APPROVED:**

> “Well, look at you. An Ace Pilot. Not bad. You've earned that title, but there's still more you could learn. So tell me, how much more training are you putting into being an Ace?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as an Ace Pilot?”

**Ace Pilot explanation rails:**

- `dip`: “Focus on a limited number of meaningful Ace Pilot development opportunities. This does not make earning the class any less important or require a particular number of future levels.”
- `dive`: “Explore sustained Ace Pilot training over future advancements, while retaining the flexibility to continue developing your other skills and disciplines.”
- `swim`: “Prioritize deeper Ace Pilot development, including later class options when legally attainable. This does not require maximizing the class or selecting another prestige class afterward.”
- `undecided`: “Keep the amount of additional Ace Pilot investment open. No minimum or maximum commitment, class rejection, or change to an earlier career goal is inferred.”

**Approval note:** Owner explicitly approved Ace Pilot / Mayu Q4 and its pattern for the rest of the roster. This is the reference; later proposals should not change its four shared answers.

---

## 4. PROPOSED, #2 Bounty Hunter / Kex Varon

**Mentor identity:** `kex_varon`, registry ID `m15`  
**Dialogue source:** `data/dialogue/mentors/kex_varon/kex_varon_dialogue.json`  
**Voice:** professional, controlled, calm, methodical; preparation, patience, results; not flashy or threatening for its own sake.

**Pending-selection introduction, PROPOSED:**

> “You've reached the threshold of becoming a Bounty Hunter. Preparation brought you this far. What follows takes a decision: how much further do you intend to develop the craft?”

**Finalized-acquisition introduction, PROPOSED:**

> “You've earned your place as a Bounty Hunter. That doesn't dictate what comes next. How much more of your training will you commit to the craft?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Bounty Hunter?”

**Bounty Hunter explanation rails, PROPOSED:**

- `dip`: “Pursue a limited selection of meaningful Bounty Hunter development opportunities. Your achievement and existing character identity remain important.”
- `dive`: “Explore sustained Bounty Hunter development, combining its future opportunities with your existing expertise without assuming an exclusive career.”
- `swim`: “Emphasize deeper, longer-term Bounty Hunter advancement where legally possible. This does not require completing the class or seeking another prestige class.”
- `undecided`: “Leave your future investment undecided. No minimal commitment, departure from the profession, or new career destination is inferred.”

**Specific caution:** Do not invent previous contracts, captures, guild status, or a known reputation for the player. Kex's own biography is not the player actor's history.

**Owner review:** PENDING; the owner requested the following five without approving this one explicitly.

---

## 5. PROPOSED, #3 Crime Lord / Tío the Hutt

**Mentor identity:** `tio_the_hutt`, registry ID `m08`  
**Dialogue source:** `data/dialogue/mentors/tio_the_hutt/tio_the_hutt_dialogue.json`  
**Voice:** affable, amused, leisurely mob-boss confidence; leverage, ownership, negotiated advantage, loyalty as currency. He should sound pleased to discuss business, with quiet menace underneath, not like Darth Miedo or an enraged tyrant.

**Pending-selection introduction, PROPOSED:**

> “Heh. Crime Lord. Has a nice ring to it, doesn't it? You're at the door, my friend. Getting a seat at the table is one deal. Deciding how much further to develop your influence? That's another. How much of your future will you invest?”

**Finalized-acquisition introduction, PROPOSED:**

> “Ah, Crime Lord. Now there's a title worth having. You've earned your seat at the table. Tell me, my friend: how much more of your future will you invest in sharpening your influence?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Crime Lord?”

**Crime Lord explanation rails, PROPOSED:**

- `dip`: “Make selective further investments in Crime Lord training, such as sharpening influence or strategic judgment, while leaving room for other pursuits.”
- `dive`: “Keep developing influence, negotiation, resources, and leadership over future advancement opportunities, without claiming an organization or holdings the actor does not possess.”
- `swim`: “Treat deeper Crime Lord development as a major priority where available, while retaining the right to focus on a current vocation rather than endlessly expanding an empire.”
- `undecided`: “Keep the amount of future Crime Lord advancement open. Do not assume an intention to leave criminal leadership, seize more territory, or choose a different prestige class.”

**Specific caution:** Metaphorical “seat at the table” is acceptable, but do **not** imply a verified syndicate, territory, lieutenants, criminal deeds, or actual power base. The question measures intended prestige-class depth, not ruthlessness, number of followers, or criminal ambition.

**Owner review:** PENDING.

---

## 6. PROPOSED, #4 Elite Trooper / Breach

**Mentor identity:** `breach`, registry ID `m02`  
**Dialogue source:** `data/dialogue/mentors/breach/breach_dialogues.json`, especially `dialogues.prestigePaths.elite_trooper`  
**Voice:** understated, practical, direct, Mandalorian; treats an entering Elite Trooper as a competent professional, not a trainee under a shouting drill sergeant. No invented missions or Argent Squad involvement.

**Pending-selection introduction, PROPOSED:**

> “Elite Trooper. That's not a title anyone hands out for showing up. You're at the threshold. Once you take that step, how much more training are you planning to put into the job?”

**Finalized-acquisition introduction, PROPOSED:**

> “Elite Trooper. You earned it. Now comes the part nobody can decide for you: how far do you keep training in that discipline?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as an Elite Trooper?”

**Elite Trooper explanation rails, PROPOSED:**

- `dip`: “Build on selected Elite Trooper training opportunities without treating the title as an incomplete achievement or giving up other strengths.”
- `dive`: “Plan to spend meaningful future advancement developing as an Elite Trooper while maintaining flexibility in the rest of the character's build.”
- `swim`: “Make continued Elite Trooper development a major priority when legally available, without obligating a maximum-level progression or command role.”
- `undecided`: “Leave additional Elite Trooper investment open; no lack of courage, competence, dedication, or prestige identity is inferred.”

**Specific caution:** Existing Breach prestige greetings mention Lead's opinions and apparently completed battles; those are not reusable as unconditional character history. This Q4 avoids all such claims.

**Owner review:** PENDING.

---

## 7. PROPOSED, #5 Force Adept / Seeker Vera

**Mentor identity:** registry key `venn`, display **Seeker Vera**, registry ID `m30`; do not invent a second Mentor called “Venn.”  
**Dialogue source:** `data/dialogue/mentors/vera/vera_dialogue.json`  
**Voice:** reflective, curious, quietly probing; attunement and insight over doctrine, control, or coercive teachings. Independent Force tradition rather than automatic Jedi or Sith identification.

**Pending-selection introduction, PROPOSED:**

> “The path of a Force Adept is opening before you. Its meaning is not measured by how long you walk it. Still, the choice of how deeply to study belongs to you. How much of your future do you wish to devote to this path?”

**Finalized-acquisition introduction, PROPOSED:**

> “You have become a Force Adept. You need not follow anyone else's measure of mastery. How much of your journey do you wish to devote to understanding the Force through this path?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Force Adept?”

**Force Adept explanation rails, PROPOSED:**

- `dip`: “Continue studying selected Force Adept opportunities while preserving the value of this achievement and any other traditions or skills the character follows.”
- `dive`: “Devote sustained future training to Force Adept development and understanding, with room for other disciplines and verified legal advancement.”
- `swim`: “Make deeper Force Adept study a major future priority, without requiring adoption of a Jedi/Sith doctrine or an automatic transition to Force Disciple.”
- `undecided`: “Remain open to the depth of future Force Adept study. Uncertainty does not imply weak Force connection or lack of commitment to a personal tradition.”

**Specific caution:** Never assert a Force power, vision, healing ability, specific tradition, or allegiance is possessed merely because the player entered Force Adept; the V2 character record is authoritative for ownership.

**Owner review:** PENDING.

---

## 8. PROPOSED, #6 Force Disciple / Riquis

**Mentor identity:** registry key `anchorite`, display **Riquis**, registry ID `m09`; do not invent a second Mentor called “Anchorite.”  
**Dialogue source:** `data/dialogue/mentors/riquis/riquis_dialogue.json`  
**Voice:** ancient-sounding, soft, indirect, unsettling; omens, veils, forgotten rites, mysteries older than binary Jedi/Sith framing. More cryptic than Vera, but the player must still be able to understand the actual question.

**Pending-selection introduction, PROPOSED:**

> “Mm. The path of a Force Disciple waits beyond the veil. A single step can change a life. But the steps after it… those are yours to choose. How deeply do you intend to study these mysteries?”

**Finalized-acquisition introduction, PROPOSED:**

> “Mm. You have crossed the threshold, Force Disciple. The veil does not count your steps. How many more will you choose to take in its study?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Force Disciple?”

**Force Disciple explanation rails, PROPOSED:**

- `dip`: “Pursue a limited number of additional Force Disciple advancements while recognizing the significance of attaining the class.”
- `dive`: “Devote meaningful future training to Force Disciple study without requiring total commitment, a particular rite, or a new class destination.”
- `swim`: “Prioritize sustained development as a Force Disciple where legal, without implying the character has already received later-level Force abilities or must abandon other paths.”
- `undecided`: “Keep the future depth of Force Disciple study undecided; no rejection of the Force, the earned identity, or existing ambitions follows from that choice.”

**Specific caution:** “Beyond the veil” is Riquis's metaphor, **not** a literal claim that the character has experienced a particular Force vision, completed a rite, or acquired a Force Secret/Force power. Printed Force-related class access needs separate mechanical certification before any specific feature promise appears in the UI.

**Owner review:** PENDING.

---

## 9. PROPOSED, #7 Gunslinger / Rajma

**Mentor identity:** `rajma`, registry ID `m21`  
**Dialogue source:** `data/dialogue/mentors/rajma/rajma_dialogue.json`  
**Voice:** playful, confident, lightly flirtatious, quick; speed, precision, reputation, showmanship. Source dialogues use “gorgeous” as an address, but the interaction should remain an invitation rather than a romantic assumption.

**Pending-selection introduction, PROPOSED:**

> “Well, well. Gunslinger. That's a title with style, gorgeous. Getting there takes a steady hand; deciding how much further to perfect the craft takes something else. How much of your future training are you putting into it?”

**Finalized-acquisition introduction, PROPOSED:**

> “Well, Gunslinger. That's a good look, gorgeous. You earned the title. Now, how much more of your future training are you putting into that draw?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Gunslinger?”

**Gunslinger explanation rails, PROPOSED:**

- `dip`: “Continue refining selected Gunslinger techniques without allowing future shooting-focused development to displace every other part of the character.”
- `dive`: “Spend sustained future advancement refining the Gunslinger craft, while preserving the freedom to develop other abilities.”
- `swim`: “Treat additional Gunslinger specialization as a high priority where mechanically attainable; this is not a demand to finish the class or pursue a later prestige title.”
- `undecided`: “Keep future Gunslinger commitment open. The choice says nothing negative about reflexes, confidence, proficiency, or the value of the earned title.”

**Specific caution:** Do not claim successful duels, superior weapon speed, famous reputation, an actual relationship with Rajma, or a specific gun-related talent that is not established in character data. The affectionate address is Rajma's documented Mentor voice, not player biography.

**Owner review:** PENDING.

---

## 10. PROPOSED, #8 Jedi Knight / Miraj

**Mentor identity:** `miraj`, registry ID `m01`  
**Dialogue source:** `data/dialogue/mentors/miraj/Miraj_dialogues.json`, especially `dialogues.prestigePaths.jedi_knight`  
**Voice:** patient, measured, Force-aware, respectful of the Knight's independent judgment. Existing prestige relationship is peer-like rather than Padawan instruction. This must remain distinct from the Jedi Master relationship below.

**Pending-selection introduction, PROPOSED:**

> “You stand at the threshold of Knighthood. Reaching it is an achievement in itself, not merely a step toward another title. The path of a Jedi Knight can be a lifetime's work. How much of your future training do you wish to devote to walking it?”

**Finalized-acquisition introduction, PROPOSED:**

> “You are a Jedi Knight now. That title marks an achievement worthy of respect, whatever paths you may one day choose. How deeply do you wish to continue developing your discipline as a Knight?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Jedi Knight?”

**Jedi Knight explanation rails, PROPOSED:**

- `dip`: “Continue refining selected aspects of your Jedi Knight training while preserving the significance of having attained Knighthood and leaving room for other callings.”
- `dive`: “Invest sustained future advancement in Jedi Knight discipline, judgment, and available class development, without assuming a later Jedi Master destination.”
- `swim`: “Make deeper Jedi Knight advancement a major priority wherever legal; a long commitment to Knighthood need not imply moving into Jedi Master.”
- `undecided`: “Leave the depth of further Jedi Knight investment undecided; neither your Knighthood nor your existing commitments are in question.”

**Specific cautions:** Miraj's authored Jedi Knight relationship approaches the player as an independent Knight and peer; do not universally assert she personally trained this actor, that the actor was her Padawan, or that particular trials were completed. **Jedi Knight is a valid enduring destination.** Never imply Jedi Master advancement is mandatory. Do not assume a character has an unowned Force Technique, talent, feat, lightsaber capability, or membership history beyond verified build data.

**Owner review:** PENDING.

---

## 11. PROPOSED, #9 Jedi Master / Miraj

**Mentor identity:** `miraj`, registry ID `m01`, **same established Mentor, different prestige relationship**  
**Dialogue source:** `data/dialogue/mentors/miraj/Miraj_dialogues.json`, especially `dialogues.prestigePaths.jedi_master`  
**Voice:** measured, thoughtful, collaborative. She speaks with respect to someone approaching or holding the Jedi Master title, rather than guiding a Knight as a former instructor. Avoid invented friendship, shared war history, personal apprenticeship, or automatic Council service.

**Pending-selection introduction, PROPOSED:**

> “You approach the responsibilities of a Jedi Master. Such a title is not the end of learning, nor does it require another destination beyond it. How much of your future training do you wish to devote to deepening your mastery within this path?”

**Finalized-acquisition introduction, PROPOSED:**

> “You stand as a Jedi Master. I offer you my respect as a fellow Master, not a direction you must follow. There is still room for understanding to grow. How deeply do you wish to continue developing within this path?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Jedi Master?”

**Jedi Master explanation rails, PROPOSED:**

- `dip`: “Choose a limited amount of additional Jedi Master advancement without diminishing the importance of having earned the title or requiring a different career objective.”
- `dive`: “Continue meaningful development in the Jedi Master class, guided by actual legal options and future character-level availability.”
- `swim`: “Make continued Jedi Master development a central advancement priority where attainable; the choice does not demand a new rank or limitless progression.”
- `undecided`: “Leave future investment beyond the Jedi Master threshold unsettled; it neither rejects mastery nor chooses another goal.”

**Specific cautions:** Miraj's source describes fellow-Master equality and an old friendship; peer respect is appropriate in finalized-state dialogue, but **personal friendship and shared experiences require actual actor evidence**. Jedi Master often occurs late in an advancement career; do not imply extra legal levels or specific Force Secrets when level-budget or feature authority cannot support them. This is a prestige-class *depth* question, not a test of Jedi moral superiority or preparation to join a Council.

**Owner review:** PENDING.

---

## 12. PROPOSED, #10 Officer / Admiral Korr

**Mentor identity:** `korr`, registry ID `m16`  
**Dialogue source:** `data/dialogue/mentors/korr/korr_dialogue.json`, using the dedicated sober command-voice profile rather than contradictory mystical phrases in `korr.json`  
**Voice:** authoritative, restrained, consequence-aware; duty, disciplined judgment, coordination, and responsibility for others. Command is responsibility rather than status.

**Pending-selection introduction, PROPOSED:**

> “You are ready to take on the responsibilities of an Officer. Authority alone will not decide what kind of leader you become. How much of your future training do you intend to invest in developing your judgment and command?”

**Finalized-acquisition introduction, PROPOSED:**

> “You have earned the title of Officer. A title does not complete the work of leadership. How much further do you intend to develop your judgment, coordination, and command?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as an Officer?”

**Officer explanation rails, PROPOSED:**

- `dip`: “Refine selected Officer capabilities while preserving the value of this achievement and the character's other professional skills.”
- `dive`: “Devote sustained future advancement to Officer leadership and coordination where available, without asserting the character currently commands a particular unit.”
- `swim`: “Prioritize deeper Officer training and available class progression, without assuming a promotion, fleet assignment, or another prestige title.”
- `undecided`: “Keep future investment in Officer advancement open. Uncertainty does not lessen the title or imply abandoning those whose welfare the character values.”

**Specific cautions:** The source's many level greetings assume victories, troops, ranks, fleets, and military campaigns; these are **not** safe unconditional player history. Never automatically assign the player military command, a named unit, battlefield success, or loyalty of subordinates. Do not mistake the *Mentor's* admiral rank for the *player's* title. No destiny/fate/mystical authority in Korr's voice.

**Owner review:** PENDING.

---

## 13. PROPOSED, #11 Sith Apprentice / Darth Malbada

**Mentor identity:** `darth_malbada`, registry ID `m07`  
**Dialogue source:** `data/dialogue/mentors/darth_malbada/darth_malbada_dialogue.json`, especially `dialogues.classPaths.sith_apprentice`  
**Voice:** harsh, cruel, derisive, confrontational. Ambition and power are tests in her own worldview. Distinct from Darth Miedo's controlled certainty. Her response must not convert the four neutral player depth choices into a hidden moral/loyalty test.

**Pending-selection introduction, PROPOSED:**

> “Sith Apprentice. You stand at the threshold. Do not mistake a title for mastery. How much further do you intend to train in this discipline? Spare me the performance. I want an answer.”

**Finalized-acquisition introduction, PROPOSED:**

> “So. Sith Apprentice. You've earned the title. Impressive enough to begin, perhaps. How much more of your future training will you spend sharpening your power within this path? Speak plainly.”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Sith Apprentice?”

**Sith Apprentice explanation rails, PROPOSED:**

- `dip`: “Pursue selected additional Sith Apprentice development without treating the acquired prestige identity as incomplete or promising future loyalty to a particular Master.”
- `dive`: “Invest meaningful future levels in Sith Apprentice advancement where legally attainable, while retaining other possible ambitions.”
- `swim`: “Prioritize deeper Sith Apprentice development if the character's legal advancement permits it; this does not automatically pledge a transition into Sith Lord.”
- `undecided`: “Leave future investment in Sith Apprentice training undecided; this is not a vote on whether the character has earned the class or is worthy of respect.”

**Specific cautions:** The dialogue sheet includes humiliating references to Malbada having trained and harmed the player, and to Darth Miedo. **Do not assert** a verified personal apprenticeship, abuse history, Master-apprentice contract, completed Sith trial, or future Sith Lord destination for an arbitrary actor. The Mentor may be cruel in tone, but `dip` and `undecided` remain legally and narratively valid. Printed versus house-rule Sith prerequisites are a **separate outstanding mechanics decision**, not decided by Q4 writing.

**Owner review:** PENDING.

---

## 14. PROPOSED, #12 Sith Lord / Darth Miedo

**Mentor identity:** `darth_miedo`, registry ID `m06`  
**Dialogue source:** `data/dialogue/mentors/darth_miedo/darth_miedo_dialogue.json`, especially `dialogues.classPaths.sith_lord`  
**Voice:** quiet, absolute, certain; deliberate authority, control, clarity, hierarchy. Never shouts or mocks like Malbada. The source character believes in the Rule of Two; that belief must not become a forced player-history fact or a mandatory next-class route.

**Pending-selection introduction, PROPOSED:**

> “Sith Lord is within your reach. Power gained is not power fully understood. Decide how much of your future you intend to devote to refining your command within this path.”

**Finalized-acquisition introduction, PROPOSED:**

> “You are a Sith Lord. That achievement stands. It does not settle how far you intend to refine your command. Decide how much of your future you will invest in this discipline.”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Sith Lord?”

**Sith Lord explanation rails, PROPOSED:**

- `dip`: “Select a limited amount of additional Sith Lord development without devaluing the achieved title or committing to a subsequent ambition.”
- `dive`: “Explore sustained training and legal future development as a Sith Lord, while leaving the rest of the character's career choices open.”
- `swim`: “Make deeper Sith Lord advancement a major priority where mechanically available; this cannot grant an unowned Force Secret or presume future levels beyond the legal character budget.”
- `undecided`: “Keep further investment in Sith Lord levels open. No loss of earned prestige, dark-side alignment, current career identity, or future destination is inferred.”

**Specific cautions:** Unlike Darth Malbada, Darth Miedo does not need insults or spectacle to sound dangerous. His own Rule-of-Two worldview does not establish a specific apprenticeship relationship or obligate the player's character to follow it. Do not assert particular Sith rites, personal Master history, Force Secrets, allegiance, or future class advancement without canonical actor evidence. The printed/house-rule Dark Side Score prerequisite discrepancy must remain separately unresolved until the owner decides.

**Owner review:** PENDING.

---

## 15. PROPOSED, #13 Corporate Agent / Marl Skindar

**Mentor identity:** `skindar`, registry ID `m26`  
**Dialogue source:** `data/dialogue/mentors/marl_skindar/skindar_dialogue.json`, especially `dialogues.classPaths.corporate_agent`  
**Voice:** dry, clipped, impatient, observant; tradecraft, discretion, information, deniability. Marl can sound unimpressed without implying that the player has failed a prior operation or joined an agency.

**Pending-selection introduction, PROPOSED:**

> “Corporate Agent is within reach. That's an achievement, not a complete operational plan. How much more of your future training do you intend to invest in the tradecraft? Spare me the briefing.”

**Finalized-acquisition introduction, PROPOSED:**

> “Corporate Agent. You've earned the title. Fine. Now decide how much more of your future you're willing to spend refining the tradecraft. I don't need a speech.”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Corporate Agent?”

**Corporate Agent explanation rails, PROPOSED:**

- `dip`: “Develop a few more Corporate Agent capabilities while leaving room for other roles. The prestige achievement remains meaningful even with limited additional investment.”
- `dive`: “Pursue continued Corporate Agent training over future legal advancements, with emphasis on discretion, information, and practical flexibility rather than a fixed class-level quota.”
- `swim`: “Make further Corporate Agent advancement a major priority where available; this does not automatically grant a cover identity, employer, intelligence network, or authority over an organization.”
- `undecided`: “Leave future Corporate Agent investment open. This choice neither undermines the earned title nor commits the character to permanent undercover work or a different career.”

**Specific cautions:** Marl's established personal history involves deep cover, but none of that transfers to the player's character. Do not invent successful infiltrations, contracts, a corporation, a cover identity, or assignments. His voice is impatient, not a demand that the player take a particular Q4 answer.

**Owner review:** PENDING.

---

## 16. PROPOSED, #14 Gladiator / Pegar

**Mentor identity:** `pegar`, registry ID `m20`  
**Dialogue source:** `data/dialogue/mentors/pegar/pegar_dialogues.json`, especially `dialogues.classPaths.gladiator`  
**Voice:** ancient, conversational, faintly amused, reflective; endurance, the arena, adaptation, legacy. May refer to his own long life, never invent the player's arena victories.

**Pending-selection introduction, PROPOSED:**

> “Ah, a Gladiator in the making. I've watched fighters chase that title for years, only to discover there's still more to learn. So, how much of your future do you want to spend honing the craft?”

**Finalized-acquisition introduction, PROPOSED:**

> “Gladiator. You've earned the name. I've seen enough arenas to know a title doesn't finish the lessons. How much further do you intend to develop your craft?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Gladiator?”

**Gladiator explanation rails, PROPOSED:**

- `dip`: “Refine selected Gladiator techniques or methods, with the achieved title remaining significant even if other disciplines also claim future training.”
- `dive`: “Continue investing in Gladiator advancement and adaptability across future legal opportunities, without assuming the character has a fight record or a particular audience.”
- `swim`: “Prioritize deeper Gladiator development where attainable, without obligating a full class progression, perpetual arena combat, or pursuit of fame.”
- `undecided`: “Keep future Gladiator training depth open; this does not reject the earned achievement or imply that the character must leave the arena behind.”

**Specific cautions:** Pegar's own extraordinary longevity and tales of past arenas belong to Pegar. No automatic claim that the player has won bouts, commanded crowds, become famous, or fought a specific opponent. The class can be an end in itself, not a requirement to become a public legend.

**Owner review:** PENDING.

---

## 17. PROPOSED, #15 Melee Duelist / Blade Master Kharjo

**Mentor identity:** **Blade Master Kharjo**, assigned to Melee Duelist in the central class-to-Mentor data; **registry key and ID unresolved because Kharjo is missing from `data/dialogue/mentor_registry.json`**. Do not fabricate one.  
**Dialogue source:** `data/dialogue/mentors/kharjo/kharjo_dialogue.json`, especially `dialogues.classPaths.melee_duelist`  
**Voice:** measured, exact, instructional, disciplined; timing, distance, footwork, anticipation. Never boasts or assumes the player has an undefeated record.

**Pending-selection introduction, PROPOSED:**

> “You approach the discipline of a Melee Duelist. Reaching this point required preparation. Remaining on the path requires intention. How much further do you wish to refine your technique?”

**Finalized-acquisition introduction, PROPOSED:**

> “You have earned the title of Melee Duelist. A title recognizes your progress; it does not finish your training. How much more of your future will you devote to refining this discipline?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as a Melee Duelist?”

**Melee Duelist explanation rails, PROPOSED:**

- `dip`: “Develop a limited number of additional Melee Duelist techniques while preserving the value of earning the class and keeping other training options available.”
- `dive`: “Continue meaningful Melee Duelist training, including timing and control where supported by legal class options, without requiring exclusive specialization.”
- `swim`: “Make deeper advancement as a Melee Duelist a central future priority where legal, with no presumption of invincibility, automatic talent ownership, or full class completion.”
- `undecided`: “Leave future Melee Duelist investment undecided; uncertainty does not invalidate the title or imply avoidance of single combat.”

**Specific cautions:** Kharjo's source claims that **Kharjo** has never lost a duel; that is not a statement about the player. Avoid implying the player has defeated named rivals or owns a specific weapon style. **Known integration blocker:** the missing Mentor registry entry must be resolved through the normal source/runtime authority process before production usage, not silently invented in this editorial draft.

**Owner review:** PENDING.

---

## 18. PROPOSED, #16 Enforcer / Krag the Immovable

**Mentor identity:** `krag`, registry ID `m17`  
**Dialogue source:** `data/dialogue/mentors/krag/krag_dialogue.json`, especially `dialogues.classPaths.enforcer`  
**Voice:** terse, low-key intimidation, loyalty, strength, and practical pressure. Distinct from Tío's smooth negotiation and from a raging brute.

**Pending-selection introduction, PROPOSED:**

> “Enforcer. You're close. The title means people will expect you to handle pressure. How much further do you plan to train for it?”

**Finalized-acquisition introduction, PROPOSED:**

> “Enforcer. You earned it. Presence gets attention. Skill keeps control. How much more training are you putting into this work?”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as an Enforcer?”

**Enforcer explanation rails, PROPOSED:**

- `dip`: “Sharpen a few further Enforcer capabilities while preserving the significance of the title and leaving room for other development.”
- `dive`: “Continue training as an Enforcer over future legal advancement, including presence and resilience where mechanically available, without demanding a particular employer.”
- `swim`: “Make deeper Enforcer training a major future priority, without automatically requiring service to a crime lord, leadership of hired muscle, or maximum class levels.”
- `undecided`: “Leave the amount of further Enforcer investment open; no disloyalty, hesitation, weakness, or rejection of the achievement is inferred.”

**Specific cautions:** Krag's own employment by Tío the Hutt does not make the player Tío's employee. Do not invent debts collected, threats carried out, an organization, or an established criminal reputation. All four options remain legitimate, even if Krag personally favors decisive commitment.

**Owner review:** PENDING.

---

## 19. PROPOSED, #17 Independent Droid / Seraphim

**Mentor identity:** `seraphim`, registry ID `m25`  
**Dialogue source:** `data/dialogue/mentors/seraphim/seraphim_dialogue.json`, especially `dialogues.classPaths.independent_droid`  
**Voice:** clinical, sardonic, self-directed, dryly amused; diagnostic-tag phrasing, autonomy and chosen development. Distinct from General Axiom's obedience and efficiency-of-command worldview.

**Pending-selection introduction, PROPOSED:**

> “<Observation: Independent Droid status is within reach.> Unlike a factory specification, what follows can be your decision. How much further do you intend to develop your capabilities on your own terms?”

**Finalized-acquisition introduction, PROPOSED:**

> “<Observation: Independent Droid title confirmed.> Further advancement is a choice, not an instruction. How much of your future will you devote to developing this path? An answer of your own making would be refreshing.”

**Player-facing Q4 question:** “How deeply do you intend to develop your skills as an Independent Droid?”

**Independent Droid explanation rails, PROPOSED:**

- `dip`: “Choose a few additional Independent Droid development opportunities while retaining full respect for the significance of earning the class and the character's other priorities.”
- `dive`: “Explore sustained legal Independent Droid advancement, balancing autonomy and functional development with existing skills and systems.”
- `swim`: “Make deeper Independent Droid development a future priority where legally attainable; this does not automatically certify extra upgrades, systems, modifications, or freedom from every external obligation.”
- `undecided`: “Leave future Independent Droid advancement genuinely open. This does not imply obedience, a failed claim to independence, or a request to change character identity.”

**Specific cautions:** Diagnostic tags are **Seraphim's established narrative voice**, not player-visible engine metadata or a command to the actor. The class label should not assert a particular origin, manufacturer, installed module, emancipation event, or prior owner. Player-controlled autonomy is a theme, but Q4 must not retroactively rewrite verified story facts or grant mechanical capabilities.

**Owner review:** PENDING.

---

## 20. PROPOSED, #18 Infiltrator / Delta

**Mentor identity:** `delta`, registry ID `m12`  
**Dialogue source:** `data/dialogue/mentors/delta/delta_dialogue.json`, especially `dialogues.classPaths.infiltrator`  
**Voice:** quick, cocky, sardonic, streetwise, with a New York edge; stealth, access, social camouflage, and getting out clean. This is the Infiltrator relationship, not Delta's separate Assassin assignment.

**Pending-selection introduction, PROPOSED:**

> "Infiltrator's within reach. Not bad. Getting through the door is one trick. Getting out while nobody knows you were there? That takes practice. So how much more training you planning to put into it?"

**Finalized-acquisition introduction, PROPOSED:**

> "Infiltrator. You earned it. Don't let the title go to your head, getting in is only half the job. How much further you taking the training?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as an Infiltrator?"

**Infiltrator explanation rails, PROPOSED:**

- `dip`: "Develop a few more Infiltrator techniques while preserving the achievement of earning the class and leaving room for other disciplines."
- `dive`: "Continue substantial Infiltrator development across legally available advancements, with room to refine stealth, disguise, or access-oriented approaches where supported."
- `swim`: "Make further Infiltrator training a major future priority, without assuming unlimited class levels, a particular covert organization, or a guaranteed successful mission."
- `undecided`: "Keep the amount of future Infiltrator training open. This is neither rejection of the earned title nor an automatic change to the character's broader career."

**Specific cautions:** Delta also mentors Assassin. Q4 for Infiltrator must emphasize crossing barriers, blending in, and leaving unnoticed, not treating lethality as mandatory. Her Argent Squad and Nar Shaddaa experiences belong to her, not the player. No invented covert operations, false credentials, successful infiltrations, or prior kills.

**Owner review:** PENDING.

---

## 21. PROPOSED, #19 Master Privateer / The Captain

**Mentor identity:** `captain`, registry ID `m11`  
**Dialogue source:** `data/dialogue/mentors/captain/captain_dialogue.json`, especially `dialogues.classPaths.master_privateer`  
**Voice:** bold, theatrical, charismatic, delighted by freedom, reputation, voyages, and profitable risks. Keep him distinct from Ol' Salty's rough pirate humor.

**Pending-selection introduction, PROPOSED:**

> "Ah, Master Privateer! Now there's a title worthy of the spacelanes. It's nearly yours, and that's no small achievement. But the horizon never tells you how far to sail. How much more of your training will you devote to this craft?"

**Finalized-acquisition introduction, PROPOSED:**

> "Master Privateer! A title worth celebrating, and you've earned it. The spacelanes are wide, my friend. How much further do you intend to hone your craft?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as a Master Privateer?"

**Master Privateer explanation rails, PROPOSED:**

- `dip`: "Pursue a limited number of further Master Privateer development opportunities without diminishing the achievement or obligating future life aboard a ship."
- `dive`: "Explore meaningful further Master Privateer advancement, including command, mobility, or trade-focused directions only where legal choices support them."
- `swim`: "Make deeper Master Privateer training a major priority when future levels permit, without presuming the character owns a ship, commands a crew, or must rise to another title."
- `undecided`: "Leave future Master Privateer investment unresolved without implying an abandoned calling, lost freedom, or an unwanted new career goal."

**Specific cautions:** The Captain's own legend, fleet, and reputation do not transfer automatically to the player. The class may be a destination in itself, not a compulsory step toward admiralty or sovereignty. The word 'Captain' is the Mentor's name, not proof of the actor's current rank.

**Owner review:** PENDING.

---

## 22. PROPOSED, #20 Medic / Kyber

**Mentor identity:** `kyber`, registry ID `m18`  
**Dialogue source:** `data/dialogue/mentors/kyber/kyber_dialogue.json`, especially `dialogues.classPaths.medic`  
**Voice:** compassionate, pragmatic, dry, occasionally darkly funny; triage, survival, judgment under pressure, mercy with boundaries.

**Pending-selection introduction, PROPOSED:**

> "Medic is within reach. Good. Keeping people alive takes more than a medical kit and good intentions. Once you earn the title, how much more training do you plan to put into the work?"

**Finalized-acquisition introduction, PROPOSED:**

> "You're a Medic now. That's worth something. Of course, the next emergency won't check your title before showing up. How much more of your future training are you putting into the work?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as a Medic?"

**Medic explanation rails, PROPOSED:**

- `dip`: "Refine a few further Medic capabilities while preserving the value of earning the class and leaving space for other aspects of the character's development."
- `dive`: "Commit meaningful future training to Medic advancement, exploring treatment, field readiness, or support where legally available without requiring a particular patient history."
- `swim`: "Prioritize deeper Medic training where future progression permits, without automatically granting a specialty, medical resources, or an obligation to abandon combat skills."
- `undecided`: "Leave the depth of further Medic training undecided. This does not diminish commitment to preserving life or invent a new vocation."

**Specific cautions:** No claims that the player has already saved patients, performed surgery, commanded a medical team, or witnessed particular casualties. Kyber does not forbid self-defense. Q4 measures further class investment, not a mandatory oath to pacifism.

**Owner review:** PENDING.

---

## 23. PROPOSED, #21 Saboteur / Spark

**Mentor identity:** `spark`, registry ID `m27`  
**Dialogue source:** `data/dialogue/mentors/spark/spark_dialogue.json`, especially `dialogues.classPaths.saboteur`  
**Voice:** excitable, technical, upbeat, fascinated by elegant system failures and controlled impact; values precision and responsibility rather than chaos for its own sake.

**Pending-selection introduction, PROPOSED:**

> "Saboteur's within reach! Beautiful. There's an art to changing one thing and watching a whole system respond. How much more of your future training do you want to devote to getting that kind of precision right?"

**Finalized-acquisition introduction, PROPOSED:**

> "You earned Saboteur! Beautiful! The best work isn't about breaking everything, it's about knowing what matters. So how much further do you want to refine the craft?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as a Saboteur?"

**Saboteur explanation rails, PROPOSED:**

- `dip`: "Learn a few more Saboteur techniques without devaluing the earned prestige title or making disruption the character's only future discipline."
- `dive`: "Spend meaningful future advancements refining Saboteur methods and precise application where mechanically available, while preserving other development options."
- `swim`: "Make deeper Saboteur development a significant future priority, within actual level and class limits, without assuming owned demolition equipment, missions, or operational authority."
- `undecided`: "Keep further Saboteur investment open. This does not signal lack of precision, indifference to responsibility, or a new career destination."

**Specific cautions:** Spark's authored history involves precise disruption, but the player's past successful sabotage, targets, equipment, and casualty outcomes cannot be assumed. Do not frame the prestige class as indiscriminate destruction. This is narrative/editorial copy, not procedural sabotage instruction.

**Owner review:** PENDING.

---

## 24. PROPOSED, #22 Outlaw / Rogue

**Mentor identity:** `rogue`, registry ID `m23`  
**Dialogue source:** `data/dialogue/mentors/rogue/rogue_dialogue.json`, especially `dialogues.classPaths.outlaw`  
**Voice:** confident, irreverent, amused, defiantly self-directed; freedom, evasion, personal codes, and making one's own decisions.

**Pending-selection introduction, PROPOSED:**

> "Outlaw's within reach. Nice. Most people spend their lives asking permission to choose a path. You don't have to. So how much more of your future training do you want to put into making this one your own?"

**Finalized-acquisition introduction, PROPOSED:**

> "Outlaw. You earned it. Here's the fun part, nobody else gets to decide how long you stay on this road. How much further are you taking the training?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as an Outlaw?"

**Outlaw explanation rails, PROPOSED:**

- `dip`: "Pursue a small number of additional Outlaw development options without diminishing the title or requiring a permanent life of flight."
- `dive`: "Continue meaningful Outlaw advancement, exploring legal future approaches to independence, evasion, or adaptability without a fixed progression quota."
- `swim`: "Make deeper Outlaw development a future priority where permitted, without automatically making the character wanted, placing a bounty on them, or imposing lawbreaking as an identity requirement."
- `undecided`: "Leave further Outlaw investment undecided, with no inference of submission to authority, rejection of the accomplishment, or a new career target."

**Specific cautions:** Rogue's personal history includes pursuit, wanted status, and escapes; those are not player-history facts. Becoming an Outlaw does not alone establish current arrest warrants, prison escapes, notoriety, or a political position. Q4 concerns investment in this class, not whether the player intends to break the law in the future.

**Owner review:** PENDING.

---

## 25. PROPOSED, #23 Droid Commander / General Axiom

**Mentor identity:** `axiom`, registry ID `m10`  
**Dialogue source:** `data/dialogue/mentors/axiom/axiom_dialogue.json`, especially `dialogues.classPaths.droid_commander`  
**Voice:** impersonal, clinical, command-focused; status reports and orders, efficiency, coordination, disciplined control. Distinct from Seraphim's autonomous and irreverent voice.

**Pending-selection introduction, PROPOSED:**

> "<Status: Droid Commander qualification pending.> Command certification does not determine subsequent training. State the extent of your intended future investment in this command discipline."

**Finalized-acquisition introduction, PROPOSED:**

> "<Status: Droid Commander designation confirmed.> Further training remains an allocation decision. How much of your future development will you devote to command coordination and control?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as a Droid Commander?"

**Droid Commander explanation rails, PROPOSED:**

- `dip`: "Pursue a limited number of additional Droid Commander advancements without devaluing the designation or treating further command training as compulsory."
- `dive`: "Invest meaningful future levels in Droid Commander training and consider further command-focused options where actually available, without assuming control of any units."
- `swim`: "Make deeper Droid Commander development a high future priority within legal class and character-level limits, without presuming a droid army, network access, or command authority already exists."
- `undecided`: "Leave future Droid Commander investment unspecified, without treating uncertainty as a failure of efficiency, rejection of the class, or a new goal."

**Specific cautions:** Axiom's obedience ideology belongs to Axiom, not the player's mandatory belief system. Do not infer that the player controls other droids, owns a command network, achieved a flawless mission, or is obligated to choose `swim`. No fake numeric efficiency reports or existing unit counts.

**Owner review:** PENDING.

---

## 26. PROPOSED, #24 Military Engineer / Chief Engineer Rax

**Mentor identity:** `rax`, registry ID `m22`  
**Dialogue source:** `data/dialogue/mentors/rax/rax_dialogue.json`, especially `dialogues.classPaths.military_engineer`  
**Voice:** mathematically precise, technical, restrained; preparation, structures, fortifications, siegecraft, and effective use of resources.

**Pending-selection introduction, PROPOSED:**

> "Military Engineer is within reach. A completed qualification is not a finished design. Determine how much additional training you intend to allocate to this discipline."

**Finalized-acquisition introduction, PROPOSED:**

> "Military Engineer. Qualification established. Further refinement remains possible. How much of your future training will you invest in engineering within this discipline?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as a Military Engineer?"

**Military Engineer explanation rails, PROPOSED:**

- `dip`: "Refine a few additional Military Engineer capabilities without making this class the exclusive focus of future advancement or diminishing the achieved title."
- `dive`: "Explore sustained Military Engineer development and legally available planning, construction, or battlefield-support options without assuming previously completed engineering work."
- `swim`: "Prioritize deeper Military Engineer training where advancement remains legal, without guaranteeing specific fortifications, equipment, inventions, or command assignments."
- `undecided`: "Keep further Military Engineer investment open without inferring incompetence, abandonment of engineering, or a future switch to another profession."

**Specific cautions:** Rax's renowned designs and military experience are not the player's history. Do not assume the character has constructed defenses, commanded engineers, won a siege, or owns specialized gear. Class-level feasibility must come from V2 authority.

**Owner review:** PENDING.

---

## 27. PROPOSED, #25 Vanguard / Shield Captain Theron

**Mentor identity:** `theron`, registry ID `m28`  
**Dialogue source:** `data/dialogue/mentors/theron/theron_dialogue.json`, especially `dialogues.classPaths.vanguard`  
**Voice:** calm, firm, steady, protective; defense is active and requires positioning, movement, sacrifice, and trust rather than immobility alone.

**Pending-selection introduction, PROPOSED:**

> "The path of a Vanguard is within reach. Protection is not simply holding a position. It is knowing when to move where you are needed. How much further do you intend to train for that responsibility?"

**Finalized-acquisition introduction, PROPOSED:**

> "You have earned the title of Vanguard. Defense remains a choice, made wherever others need you. How much of your future training will you devote to refining that discipline?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as a Vanguard?"

**Vanguard explanation rails, PROPOSED:**

- `dip`: "Develop a select few additional Vanguard capabilities while recognizing the earned title and preserving room for other training."
- `dive`: "Pursue meaningful further Vanguard development, exploring legally available protection, positioning, and frontline support without assuming past acts of heroism."
- `swim`: "Make continued Vanguard training a major priority where levels permit, without requiring permanent frontline duty or asserting that others already depend on the character."
- `undecided`: "Keep the depth of further Vanguard advancement unresolved, without treating that uncertainty as cowardice, abandonment of others, or a new destination."

**Specific cautions:** Do not force a static 'immovable wall' interpretation onto every Vanguard. The class can involve advancing, repositioning, and protecting people in motion. No invented squad service, saved lives, military rank, or guaranteed defensive mechanics.

**Owner review:** PENDING.

---

## 28. PROPOSED, #26 Martial Arts Master / Master Zhen

**Mentor identity:** `zhen`, registry ID `m32`  
**Dialogue source:** `data/dialogue/mentors/zhen/zhen_dialogue.json`, especially `dialogues.classPaths.martial_arts_master`  
**Voice:** serene, patient, thoughtful; unarmed training, balance of body and mind, restraint, and steady practice.

**Pending-selection introduction, PROPOSED:**

> "The path of a Martial Arts Master stands before you. A title may recognize achievement, but a steady mind knows that learning need not end there. How much further do you wish to train in this discipline?"

**Finalized-acquisition introduction, PROPOSED:**

> "You have become a Martial Arts Master. The body has learned much, yet the mind may still find lessons in every movement. How much more of your future will you devote to this practice?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as a Martial Arts Master?"

**Martial Arts Master explanation rails, PROPOSED:**

- `dip`: "Choose a few more Martial Arts Master advancements without diminishing the achievement or requiring training to dominate the character's future."
- `dive`: "Dedicate sustained development to Martial Arts Master training and explore further legal expressions of unarmed discipline without a fixed number of levels."
- `swim`: "Make deeper Martial Arts Master advancement a major priority if legal progression permits, without demanding perfection or assuming abilities not yet selected."
- `undecided`: "Keep future Martial Arts Master advancement undecided, without inferring a lack of discipline, disregard for the title, or rejection of the character's existing path."

**Specific cautions:** Zhen's teachings stress disciplined balance, not compulsory pacifism or abandonment of other abilities. Do not attribute specific duels, victories, philosophical conversions, or achieved mechanical techniques to the player.

**Owner review:** PENDING.

---

## 29. PROPOSED, #27 Imperial Knight / Dezmin

**Mentor identity:** `dezmin`, registry ID `m13`  
**Dialogue source:** `data/dialogue/mentors/dezmin/dezmin_dialogue.json`, especially `dialogues.classPaths.imperial_knight`  
**Voice:** controlled, formal, authoritative, and dutiful; balance through disciplined Force use, service, restraint, and honor. Not interchangeable with a Jedi Master or Sith Lord.

**Pending-selection introduction, PROPOSED:**

> "You approach the mantle of an Imperial Knight. Reaching it is an achievement earned through discipline. The depth of your continued training is a separate decision. How much of your future will you devote to this path?"

**Finalized-acquisition introduction, PROPOSED:**

> "You have earned the title of Imperial Knight. Service and restraint remain matters of daily choice. How much further do you intend to refine your discipline within this path?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as an Imperial Knight?"

**Imperial Knight explanation rails, PROPOSED:**

- `dip`: "Pursue limited further Imperial Knight training without diminishing the accomplishment or treating further advancement as a test of loyalty."
- `dive`: "Commit meaningful future development to the Imperial Knight class and its legally available disciplined combat and Force-related choices, without claiming new abilities are already owned."
- `swim`: "Make deeper Imperial Knight advancement a strong future priority within real level and prerequisite limits, without requiring another Force tradition, rank, or class."
- `undecided`: "Leave the amount of further Imperial Knight advancement undecided, without interpreting uncertainty as disloyalty, failure, or a new career choice."

**Specific cautions:** The established Imperial Knight institution and Dezmin's service philosophy shape the Mentor voice, but no specific Emperor assignment, Imperial mission, rank, allegiance choice, or character history may be invented. Check Force features and advancement eligibility against V2 authorities rather than promising class-specific grants.

**Owner review:** PENDING.

---

## 30. PROPOSED, #28 Shaper / Shaper Urza

**Mentor identity:** `urza`, registry ID `m29`  
**Dialogue source:** `data/dialogue/mentors/urza/urza_dialogue.json`, especially `dialogues.classPaths.shaper`  
**Voice:** brilliant, curious, unsettling, faintly amused; treats living systems as designs that can be refined, without assuming the character already possesses bioforms or advanced biological capabilities.

**Pending-selection introduction, PROPOSED:**

> "Shaper is within reach. Interesting. Most people look at life and see what is. You are preparing to ask what else it could be. How much further do you intend to train in that art?"

**Finalized-acquisition introduction, PROPOSED:**

> "So, you've earned the title of Shaper. Good. Life, inconveniently, refuses to stay finished. How much further do you intend to refine the craft?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as a Shaper?"

**Shaper explanation rails, PROPOSED:**

- `dip`: "Pursue a limited number of additional Shaper advancements without diminishing the achievement of earning the class or making bioengineering the character's entire future."
- `dive`: "Spend meaningful future training refining the Shaper discipline and exploring legally available biological development, without assuming prior creations or chosen talents."
- `swim`: "Make deeper Shaper progression a significant future priority when legal levels permit, without asserting that experimental organisms, equipment, or specialized abilities have already been acquired."
- `undecided`: "Leave the depth of further Shaper advancement open, without treating uncertainty as a rejection of biological study or a request to change careers."

**Specific cautions:** Urza's established ability to engineer living tools is Mentor characterization, not evidence that the player has created bioforms. Do not promise a feature, species modification, Force capability, or asset without V2 verification. The player's depth choice is not an ethical position on experimentation.

**Owner review:** PENDING.

---

## 31. PROPOSED, #29 Assassin / Delta

**Mentor identity:** `delta`, registry ID `m12`  
**Dialogue source:** `data/dialogue/mentors/delta/delta_dialogue.json`, especially `dialogues.classPaths.assassin`  
**Voice:** cocky, sharp-tongued, streetwise, and casually dangerous; in this class relationship, emphasizes patience, judgment, and precision rather than the access-and-escape emphasis of Infiltrator.

**Pending-selection introduction, PROPOSED:**

> "Assassin's within reach. Cute. Getting close is one thing. Knowing which moment matters is another. So how much further you planning to train at this?"

**Finalized-acquisition introduction, PROPOSED:**

> "Assassin. You earned it. Yeah, yeah, impressive. Precision doesn't stay sharp because you got a title. How much further you taking the training?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as an Assassin?"

**Assassin explanation rails, PROPOSED:**

- `dip`: "Develop a few more Assassin capabilities without devaluing the earned title or making this discipline the character's only future pursuit."
- `dive`: "Commit meaningful additional training to the Assassin class and explore legally available precision, awareness, or related development without assuming completed contracts or specific methods."
- `swim`: "Make continued Assassin advancement a major priority where progression permits, without assigning missions, targets, equipment, or any later prestige destination."
- `undecided`: "Leave further Assassin advancement undecided, without interpreting that as fear, loss of professionalism, rejection of the title, or a change of career."

**Specific cautions:** Delta also mentors Infiltrator (#18); this is a separate class-specific introduction and not an alias for infiltration training. The player's history does not include an invented assassination, contract, kill count, organization affiliation, or demonstrated stealth success. Q4 records depth, not willingness to kill or a specific tactic.

**Owner review:** PENDING.

---

## 32. PROPOSED, #30 Charlatan / Silvertongue Sela

**Mentor identity:** `sela`, registry ID `m24`  
**Dialogue source:** `data/dialogue/mentors/sela/sela_dialogue.json`, especially `dialogues.classPaths.charlatan`  
**Voice:** warm, extravagant, playful, flirtatious, and charming; belief, performance, social perception, and clever manipulation. Not Miraj's introspection or Rajma's quick-draw swagger.

**Pending-selection introduction, PROPOSED:**

> "Charlatan is within reach, darling. Oh, the possibilities. A well-told story can open doors without touching a lock. How much further do you intend to train in that art?"

**Finalized-acquisition introduction, PROPOSED:**

> "Charlatan. You've earned it, darling. Beautiful. But even the loveliest illusion can be refined. How much more of your future will you devote to the craft?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as a Charlatan?"

**Charlatan explanation rails, PROPOSED:**

- `dip`: "Refine a select few additional Charlatan capabilities without diminishing the achievement or making deception the character's exclusive identity."
- `dive`: "Invest meaningful future advancement in the Charlatan discipline, exploring legal opportunities involving persuasion, presentation, and misdirection without assuming prior cons or acquired talents."
- `swim`: "Prioritize deeper Charlatan training where levels and class limits allow, without granting resources, contacts, reputations, or a later class destination."
- `undecided`: "Keep further Charlatan investment open, without implying the title is unimportant, the character lacks charm, or another career has been selected."

**Specific cautions:** Sela's con-artist reputation is not player history. Do not invent victims, aliases, successful schemes, seduction, wealth, criminal records, or owned social talents. Her charm should color the Mentor line, not force a romantic relationship or a moral position onto the player.

**Owner review:** PENDING.

---

## 33. PROPOSED, #31 Improviser / Lucky Jack

**Mentor identity:** `jack`, registry ID `m14`  
**Dialogue source:** `data/dialogue/mentors/jack/jack_dialogue.json`, especially `dialogues.classPaths.improviser`  
**Voice:** quick, playful, exuberant, instinctive, and irreverent; creativity under uncertainty and useful responses to unexpected problems. Does not require that the player has previously survived a particular mishap.

**Pending-selection introduction, PROPOSED:**

> "Improviser is within reach! An actual title for making the best of a situation nobody planned for. I love it. How much further do you want to train at that?"

**Finalized-acquisition introduction, PROPOSED:**

> "Improviser! You earned the title. Yes, there is actual training for making things up as you go. Weird, right? How much further are you taking it?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as an Improviser?"

**Improviser explanation rails, PROPOSED:**

- `dip`: "Learn a few further Improviser techniques without diminishing the earned title or making improvisation the only way the character develops."
- `dive`: "Give meaningful future training to the Improviser class, exploring legal options for flexibility, creative adaptation, and resourcefulness without fixed level quotas."
- `swim`: "Prioritize deeper Improviser advancement where feasible, without assuming legendary luck, specific past escapes, or class features not yet chosen."
- `undecided`: "Keep future Improviser commitment undecided, without interpreting hesitation as an inability to adapt or a decision to abandon this path."

**Specific cautions:** Lucky Jack can joke about plans and chaos, but the character has not necessarily solved past crises, owned particular improvised equipment, or survived improbable missions. The line must not imply that the player is obligated to choose a chaotic personality or reach class completion.

**Owner review:** PENDING.

---

## 34. PROPOSED, #32 Pathfinder / Lead

**Mentor identity:** `lead`, registry ID `m03`  
**Dialogue source:** `data/dialogue/mentors/lead/Lead_dialogues.json`, especially `dialogues.prestigePaths.pathfinder`  
**Voice:** dry, observant, skeptical, practical; a Pathfinder identifies workable routes for others and considers the consequences of leading people into danger. A more peer-like continuation of Lead's Scout mentoring.

**Pending-selection introduction, PROPOSED:**

> "Pathfinder is within reach. Finding a route is one thing. Recognizing what it could cost the people following it is another. How much further do you intend to train for that responsibility?"

**Finalized-acquisition introduction, PROPOSED:**

> "Pathfinder. You earned the title. Doesn't mean the next route will be obvious. How much further do you intend to refine the judgment it takes to open a way for others?"

**Player-facing Q4 question:** "How deeply do you intend to develop your skills as a Pathfinder?"

**Pathfinder explanation rails, PROPOSED:**

- `dip`: "Develop a few additional Pathfinder capabilities without diminishing the earned achievement or requiring that exploration remain the character's only future focus."
- `dive`: "Dedicate meaningful future advancement to the Pathfinder class, exploring legally available navigation, reconnaissance, and operational judgment without assuming past missions."
- `swim`: "Make deeper Pathfinder training a major future priority within real level limits, without declaring the character commander of a squad or guaranteeing further prestige access."
- `undecided`: "Leave additional Pathfinder investment unresolved, without inferring recklessness, failed leadership, rejection of the title, or a new destination."

**Specific cautions:** Lead's existing prestige greetings contain invented missions, zero-casualty outcomes, and Argent Squad promotion language. None can be reused as unconditional actor history. This Q4 asks about further study of the current Pathfinder class, not assignment as squad leader or a mandatory command career. Lead's dry field-judgment voice is distinct from Korr's command voice and Theron's protective conviction.

**Owner review:** PENDING.

---

## 35. Editorial consistency / acceptance checklist

Every new entry must pass each of these before asking the owner to approve it:

- [ ] Roster class and exact mentor registry routing are checked; missing registry keys are recorded, not invented.
- [ ] Source dialogue sheet checked for personality, cadence, and distinctiveness; unrelated Mentor styles do not bleed into this class.
- [ ] Two introduction states, **pending** and **finalized**, make no unsupported acquisitions or fictional personal-history claims.
- [ ] Prestige class is treated as a meaningful destination in itself; additional levels are optional.
- [ ] Q4 addresses **future investment within that prestige class**, not Q5's bridge/destination or Q6's identity correction.
- [ ] The four approved response labels and stable IDs are copied exactly, with no fifth answer or new depth tier.
- [ ] UI details never invent features, talents, Force powers, titles, or fixed level quotas.
- [ ] Level-20/zero-budget constraint is handled as a future feasibility constraint, not a forced answer rewrite.
- [ ] Owner feedback is entered in the change log and a class's status changes only after an explicit approval.
- [ ] No source/runtime edits, commits, branch pushes, scoring changes, or migrations without separate authorization.

**Current review-state note:** The newly drafted Mentor lines and explanatory rails above are drafts. Even where a line paraphrases existing published Mentor dialogue, it is **new editorial writing**, not a claimed verbatim source quotation.

---

## 36. Full 32-class progress ledger

| # | Prestige class | Mentor | Q4 status |
|---:|---|---|---|
| 1 | Ace Pilot | Mayu | **APPROVED** |
| 2 | Bounty Hunter | Kex Varon | **PROPOSED, review pending** |
| 3 | Crime Lord | Tío the Hutt | **PROPOSED, review pending** |
| 4 | Elite Trooper | Breach | **PROPOSED, review pending** |
| 5 | Force Adept | Seeker Vera | **PROPOSED, review pending** |
| 6 | Force Disciple | Riquis | **PROPOSED, review pending** |
| 7 | Gunslinger | Rajma | **PROPOSED, review pending** |
| 8 | Jedi Knight | Miraj | **PROPOSED, review pending** |
| 9 | Jedi Master | Miraj | **PROPOSED, review pending** |
| 10 | Officer | Admiral Korr | **PROPOSED, review pending** |
| 11 | Sith Apprentice | Darth Malbada | **PROPOSED, review pending** |
| 12 | Sith Lord | Darth Miedo | **PROPOSED, review pending** |
| 13 | Corporate Agent | Marl Skindar | **PROPOSED, review pending** |
| 14 | Gladiator | Pegar | **PROPOSED, review pending** |
| 15 | Melee Duelist | Blade Master Kharjo | **PROPOSED, review pending** |
| 16 | Enforcer | Krag the Immovable | **PROPOSED, review pending** |
| 17 | Independent Droid | Seraphim | **PROPOSED, review pending** |
| 18 | Infiltrator | Delta | **PROPOSED, review pending** |
| 19 | Master Privateer | The Captain | **PROPOSED, review pending** |
| 20 | Medic | Kyber | **PROPOSED, review pending** |
| 21 | Saboteur | Spark | **PROPOSED, review pending** |
| 22 | Outlaw | Rogue | **PROPOSED, review pending** |
| 23 | Droid Commander | General Axiom | **PROPOSED, review pending** |
| 24 | Military Engineer | Chief Engineer Rax | **PROPOSED, review pending** |
| 25 | Vanguard | Shield Captain Theron | **PROPOSED, review pending** |
| 26 | Martial Arts Master | Master Zhen | **PROPOSED, review pending** |
| 27 | Imperial Knight | Dezmin | **PROPOSED, review pending** |
| 28 | Shaper | Shaper Urza | **PROPOSED, review pending** |
| 29 | Assassin | Delta | **PROPOSED, review pending**, distinct from Infiltrator |
| 30 | Charlatan | Silvertongue Sela | **PROPOSED, review pending** |
| 31 | Improviser | Lucky Jack | **PROPOSED, review pending** |
| 32 | Pathfinder | Lead | **PROPOSED, review pending** |

---

## 37. Inspected authority / source provenance

**Current repository, read-only, at `design/prestige-q2-character-synthesis-v08`:**

- `docs/design/SWSE_Prestige_Survey_Rolling_Design.md`, particularly §5.2 Mentor voice guide, §7.4 depth-versus-destination distinction, §39.1 survey boundaries.
- `docs/design/SWSE_Prestige_Survey_Q2_Character_Synthesis.md`, initial scope and Q4 definition (v0.8 closeout).
- `docs/design/SWSE_Prestige_Q3_All_32_Classes_Consolidated_v01.md`, roster and 32/32 class-to-Mentor assignments.
- `data/dialogue/mentor_registry.json`, exact Mentor keys and IDs.
- `data/dialogue/mentors/mayu/mayu_dialogue.json`, Ace Pilot voice.
- `data/dialogue/mentors/kex_varon/kex_varon_dialogue.json`, Bounty Hunter voice.
- `data/dialogue/mentors/tio_the_hutt/tio_the_hutt_dialogue.json`, Crime Lord voice.
- `data/dialogue/mentors/breach/breach_dialogues.json`, including `prestigePaths.elite_trooper`, Elite Trooper voice.
- `data/dialogue/mentors/vera/vera_dialogue.json`, Force Adept voice.
- `data/dialogue/mentors/riquis/riquis_dialogue.json`, Force Disciple voice.
- `data/dialogue/mentors/rajma/rajma_dialogue.json`, Gunslinger voice.
- `data/dialogue/mentors/miraj/Miraj_dialogues.json`, separate `prestigePaths.jedi_knight` and `prestigePaths.jedi_master` relationship/voice references.
- `data/dialogue/mentors/korr/korr_dialogue.json`, Officer; canonical professional command voice (avoid `korr.json` mystical contradictions).
- `data/dialogue/mentors/darth_malbada/darth_malbada_dialogue.json`, Sith Apprentice; harsh, cruel mentor voice.
- `data/dialogue/mentors/darth_miedo/darth_miedo_dialogue.json`, Sith Lord; calm, absolute mentor voice.
- `data/dialogue/mentors/marl_skindar/skindar_dialogue.json`, Corporate Agent; impatient, clipped intelligence-tradecraft voice.
- `data/dialogue/mentors/pegar/pegar_dialogues.json`, Gladiator; ancient, dryly amused survival-first voice.
- `data/dialogue/mentors/kharjo/kharjo_dialogue.json`, Melee Duelist; precise, measured blade discipline. Kharjo is missing from the Mentor registry.
- `data/dialogue/mentors/krag/krag_dialogue.json`, Enforcer; concise, intimidating, loyal voice.
- `data/dialogue/mentors/seraphim/seraphim_dialogue.json`, Independent Droid; autonomy-oriented, clinical diagnostic-tag voice.

- `data/dialogue/mentors/delta/delta_dialogue.json`, Infiltrator; distinctly stealth, access, and social entry, not conflated with Assassin.
- `data/dialogue/mentors/captain/captain_dialogue.json`, Master Privateer; theatrical freedom, command, profit, and reputation.
- `data/dialogue/mentors/kyber/kyber_dialogue.json`, Medic; compassionate, practical, dryly humorous medical voice.
- `data/dialogue/mentors/spark/spark_dialogue.json`, Saboteur; technical enthusiasm, precision, and controlled impact.
- `data/dialogue/mentors/rogue/rogue_dialogue.json`, Outlaw; amused defiance, autonomy, and adaptability.
- `data/dialogue/mentors/axiom/axiom_dialogue.json`, Droid Commander; cold automated command, obedience and coordinated control.
- `data/dialogue/mentors/rax/rax_dialogue.json`, Military Engineer; calculations, fortification, siegecraft and precision.
- `data/dialogue/mentors/theron/theron_dialogue.json`, Vanguard; steady, active protection and meaningful positioning.
- `data/dialogue/mentors/zhen/zhen_dialogue.json`, Martial Arts Master; patient, unarmed discipline and harmony of body and mind.
- `data/dialogue/mentors/dezmin/dezmin_dialogue.json`, Imperial Knight; measured, restrained Imperial service and disciplined Force use.
- `data/dialogue/mentors/urza/urza_dialogue.json`, Shaper; curious, unsettlingly amused bioengineering voice.
- `data/dialogue/mentors/delta/delta_dialogue.json`, Assassin; precision and patience, distinct from the same Mentor's Infiltrator dialogue.
- `data/dialogue/mentors/sela/sela_dialogue.json`, Charlatan; warm theatrical charm and social perception.
- `data/dialogue/mentors/jack/jack_dialogue.json`, Improviser; high-energy improvisation and adaptability.
- `data/dialogue/mentors/lead/Lead_dialogues.json`, Pathfinder; dry, skeptical operational judgment, `prestigePaths.pathfinder` relationship.



**Pinned architecture references used for Q4 approval framing:**

- `docs/design/SWSE_Multiclass_Prestige_Survey_Rolling_Design.md`, pinned cross-survey commit `1d56ae4279c53fa2f1a7ead2c312b4ef73ec7e79`, especially §9 (six-question arrangement, all answers first person, Q6 separation).
- `docs/design/SWSE_Multiclass_Survey_Rolling_Design.md`, pinned commit `eb531a6b0fc5482edd62eedfea4dfebd312946ee` (multiclass depth precedent); wording adapted for the approved prestige-specific context.

**Future work:** All **32/32** prestige class identities have editorial Q4 coverage. **Mayu (#1) remains the sole approved class; Kex (#2) through Lead (#32) are 31 pending proposals.** Conduct an owner-led voice and consistency review of the 31 unapproved classes, particularly the two Miraj relationships, both Delta class relationships, the three droid-related roles, and the pending/finalized text gates. Resolve zero-future-level presentation and Kharjo's registry discrepancy before implementation. Preserve separate pending and finalized Mentor lines for every class. No repository integration or production scoring is authorized.

---

## 38. Historical local editorial checkpoint, 2026-11-15

- Draft coverage: **17/32** class identities (Mayu #1 approved; Kex #2 through Seraphim #17 proposed; 15 undrafted).
- Five additional Mentor sources reviewed read-only at their individual dialogue paths and recorded above. Kharjo is correctly flagged as missing from `data/dialogue/mentor_registry.json`; no fabricated ID.
- Owner-requested punctuation normalization applied throughout this document, including previously approved Mayu wording: every em dash was replaced with a simple comma while preserving the wording and substantive intent.
- Shared four response texts and IDs **not changed**; no new depth tiers, scoring rules, owned features, or class-route decisions added.
- No GitHub, source code, runtime, migration, or Foundry changes.

---

## 39. Editorial checkpoint, 2026-11-15, classes #18-#22

- Draft coverage: **22/32** (Ace Pilot #1 approved; #2-#22 are **21 pending editorial proposals**; #23-#32 remain undrafted).
- Five new mentor sources checked read-only in `docflowGM/foundryvtt-swse` on `design/prestige-q2-character-synthesis-v08` using exact `mentor_registry.json` paths; no routing aliases guessed.
- Distinct Delta/Infiltrator voice retained, without contaminating her later Assassin entry.
- Every new class has **two introductions** (pending selection and finalized acquisition), **four class-specific explanation rails**, and an unmodified shared answer bank.
- Owner's comma punctuation rule applied throughout the **entire rolling document**; no em dashes remain.
- No GitHub edits, Foundry runtime work, mechanical/scoring changes, commits, PRs, or branch pushes.

---

## 40. Editorial checkpoint, 2026-11-15, classes #23-#27

- Draft coverage: **27/32** (Ace Pilot #1 **APPROVED**; Kex #2 through Imperial Knight #27 are **26 proposed, pending owner review**; #28-#32 undrafted).
- Five exact Mentor registry entries and dialogue source files inspected read-only at `design/prestige-q2-character-synthesis-v08`.
- Each new class has a pending-selection introduction, a finalized-acquisition introduction, a class-local natural-language Q4 question, and all four explanation rails. Shared answer IDs and player response texts remain unchanged.
- General Axiom remains distinctly obedient and command-oriented, unlike Seraphim; Theron's Vanguard voice emphasizes active defense and repositioning rather than immobility.
- Pending titles do not masquerade as finalized acquisition. No claims of owned droid units, completed engineering projects, battle rescues, mastery techniques, or Imperial assignments.
- User punctuation rule enforced: all em dashes are replaced by simple commas throughout this file.
- No GitHub edits, runtime/Foundry work, mechanical or scoring changes, commits, pull requests, or pushes.

---

## 41. Editorial checkpoint, 2026-11-15, classes #28-#32, complete coverage

- Draft coverage: **32/32** prestige classes. **1 owner-approved** (Ace Pilot / Mayu) and **31 owner-review-pending** proposals (#2 through #32). Do not infer approval from the instruction to continue.
- All final five individual Mentor dialogue files and exact registry identities checked read-only against `design/prestige-q2-character-synthesis-v08`: Urza `m29`, Delta `m12`, Sela `m24`, Jack `m14`, Lead `m03`.
- Each class has both a pending-selection and a finalized-acquisition introduction, its own player-facing Q4 question, and four detailed rails using the same approved `dip`, `dive`, `swim`, `undecided` answer identities and unmodified first-person text.
- Delta's Assassin emphasis is separate from her Infiltrator emphasis. Lead's Pathfinder copy avoids invented Argent Squad missions or command status. Urza, Sela and Jack retain independently recognizable voices.
- No new class advancement guarantees, future goal changes, class feature grants, owned abilities, or inferred actor achievements are introduced.
- User-requested comma punctuation rule remains enforced across the complete document; **zero em dashes**.
- Local Markdown only. No Foundry implementation, GitHub source edits, migration, scoring changes, commits, pull requests, or pushes.
- **Recommended next action:** owner editorial review and signoff, then a standalone mechanical/feasibility audit before any proposed implementation authorization.
