# SWSE Multiclass Mentor Survey — Consolidated Rolling Design

**Date opened:** 2026-11-14  
**Revision:** v0.11 consolidated editorial design (Q1–Q6; Q6 Pass A and Pass B)  
**Repository:** `docflowGM/foundryvtt-swse`  
**Reference design:** `docs/design/SWSE_Multiclass_Prestige_Survey_Rolling_Design.md` v0.9, commit `1d56ae4279c53fa2f1a7ead2c312b4ef73ec7e79`  
**Proposed repository document:** `docs/design/SWSE_Multiclass_Survey_Rolling_Design.md` (documentation-only feature branch).  
**Related L1 reference:** L1 adaptive survey v0.19, documentation commit `ff7f605a340c82b1389845d1b1a61ebc8e30c3a5`  
**Status:** Owner-authorized design-document GitHub commit; no Foundry runtime implementation. Architecture includes approved decisions; drafted dialogue and mechanical bindings still need runtime/source certification.

## Working agreement

Maintain one rolling Markdown design. The owner authorized a consolidated GitHub documentation commit on 2026-11-14 after Q6 Pass B. Preserve accepted decisions separately from editorial drafts; no implementation or production changes are authorized by this documentation commit.

## Existing approved framework (recovered from v0.9)

The multiclass survey is triggered on first acquisition of a new foundation class, guided by the **destination class's own Mentor**. It has five substantive questions plus Q6 Mentor Reflection:

1. Q1 — Class Discovery: teach distinctive and verifiable destination-class capabilities; record what specifically interests the player.
2. Q2 — Build Integration: how new class relates to all existing classes and previous stated goals.
3. Q3 — Commitment: Dip/Dive/Swim/Undecided; Bridge is a purpose, not a depth.
4. Q4 — Applied Scenario: one relevant situation showing intended use.
5. Q5 — Next Milestone: near-term objective and relation to long-term ambitions.
6. Q6 — Mentor's Reflection: evidence-based current-path reading and A–E correction, including two-part negative/affirmative D/E follow-ups.

Q1 is discovery rather than a second career election or class-investment commitment. Character-selectable answers are first-person. Fixed mentor intros use the destination class Mentor's established voice; mechanical metadata and IDs are hidden. Informational displays do not count as selections. Future capability is not present ownership. Explicit career intent, inferred identity, eligibility, and achieved acquisitions remain distinct.

## Draft MC-Q1-JEDI-01 — Noble enters Jedi

**Example context:** Existing Noble character obtains first Jedi level. This example does not assume any specific trained Noble skill, feat, species, Force Sensitivity, prior Level 1 aspiration, or talent. Those must be read from the actual build when implemented.

**Destination Mentor:** Miraj (Jedi). The Noble mentor J0-N1 does not narrate the new Jedi survey.

**Proposed fixed Miraj stage introduction — DRAFT:**

> "You have learned that words can change a life. There are other ways to meet the galaxy now, but you need not leave that wisdom behind. Tell me, what draws you toward the Jedi path?"

**Question — DRAFT:**

> "As you begin your Jedi training, what would you most like to learn?"

**Selectable player answers — all draft; player-visible text only:**

1. "I want to sense the Force and understand what it can teach me about the world around me."
2. "I want to learn how to resolve a confrontation with patience and words, even when others are ready to fight."
3. "I want to master a lightsaber so I can stand between danger and the people who depend on me."
4. "I want to recognize threats others cannot see and confront darkness before it harms anyone."
5. "I want to learn how to strengthen my companions when they need guidance and courage."
6. "I don't know enough about this path to choose yet. I want to discover what I'm capable of."

**Option count note:** Five directed options plus one neutral undecided option follow the L1 presentation pattern as a *proposal*. The multiclass v0.9 design leaves exact Q1 option count open; this is not a locked requirement.

### Internal design interpretation — NOT player-visible

| Answer | Indicative Jedi capability | Canonical reference / verification requirement | Survey intent | Status |
|---|---|---|---|---|
| 1 | Force sensitivity and eventual Use the Force training / Force powers | Force Sensitivity is one available Jedi multiclass starting feat, not automatic; class skill access does not train the skill, and Force Training requires trained Use the Force | Force-awareness interest | Needs exact canonical ontology mapping and actor-state gating |
| 2 | Consular talents such as Adept Negotiator; leverage existing social capability when owned | Jedi Consular tree, Core Jedi class; do not assume Noble Persuasion is trained | Diplomacy / nonviolent intervention interest | Needs exact canonical mapping |
| 3 | Weapon Proficiency (lightsabers) and Jedi combat/guardian training | Multiclass only grants one Jedi starting feat, so lightsaber proficiency is not automatic; specific talents have individual prerequisites | Protective melee/lightsaber development interest | Needs exact canonical mapping |
| 4 | Sentinel talents including Dark Side Sense; Force awareness | Jedi Sentinel tree; Dark Side Sense references Use the Force and needs appropriate Force access for use | Vigilance / identifying threats interest | Needs exact canonical mapping |
| 5 | Skilled Advisor or Battle Meditation (different talent trees) | Jedi Consular and Guardian trees; prerequisites and costs must be verified for actual option | Ally-support / teamwork interest | Needs exact canonical mapping |
| 6 | No direction selected | No default/generalist scoring from indecision | None | Proposed neutral handling |

### Verified rules boundary used for this example

SWSE Core Rulebook multiclass rules: a new class expands class-skill access but does **not** grant newly trained skills; a multiclass character selects **one** starting feat from the added class rather than obtaining all of them; a first Jedi class level grants a Jedi talent; not all future Force options are immediately available. Jedi starting feats list Force Sensitivity, Weapon Proficiency (lightsabers), and Weapon Proficiency (simple weapons). Force Training requires Force Sensitivity and trained Use the Force. This means responses discuss aspirations, never automatic ownership.

### Explicitly open for review

- Whether Miraj's draft line matches her exact established characterization.
- Whether five directed choices plus a neutral sixth is the best Q1 option count.
- Whether these five Jedi directions are genuinely distinct and educational enough.
- Whether the Q1 question should mention prior Noble abilities at all (the design reserves build integration for Q2).
- Source/ontology certification against existing 190-tag vocabulary and exact feat/talent IDs.
- Separate on-demand mechanical explanatory text ('detail rail') if the UI supports it without violating first-person-only response buttons.

## Change log

- **2026-11-14 — v0.10 local draft opened:** Established no-commit working agreement and drafted one Noble → Jedi Q1 Class Discovery example. No code/GitHub mutations.

---

## Draft MC-Q1-MENTOR-TRANSITIONS-01 — Origin-aware mentor introductions

**Received:** 2026-11-14  
**Status:** Supplied draft, preserved verbatim as working dialogue. **Not approved or locked.**  
**Scope:** Q1 — Class Discovery only. Separate from the class capability answer bank and Q2 Build Integration.

### Design objective

Each destination-class Mentor should recognize the character's previous training and explain what the destination discipline adds. Multiclass training is additive, not recruitment away from an earlier life. The Mentor introduces exploration, not guaranteed ownership of a particular starting feat, class feature, skill, or talent.

### Character voice and verified relationship boundaries

- **Miraj (Jedi):** Reflective, patient, individually attentive. Invites consideration rather than pronouncements. Relationship with Argent is established; specific personal exchanges with Lead/Breach are **not** sufficiently established to invent anecdotes.
- **Lead (Scout):** Careful, deliberate, practical, occasionally sardonic. Values adaptability, observation, specialization, and preparation. Also a hunter, rifleman, and Argent commander. Breach reports to her; she trusts his loyalty and dangerous-fieldwork capability, affectionately/critically calling him a 'big oaf' at times; she sees him as more than brute force.
- **Breach (Soldier):** Direct, personable, martially capable, straightforward understated humor; Mandalorian upbringing, Argent loyalty. Not a drill sergeant. Respects Lead's command and judgment and can tease her without undermining her. Do not invent a rivalry or close history with Miraj.

### Destination: Jedi — Miraj

**Origin Noble — standard**

> “You’re accustomed to a world where words, decisions, and the people you know can carry considerable influence. The Force may give you a different understanding of that influence. What would you like to learn about it?”

**Origin Scoundrel — standard**

> “I imagine you’ve learned to rely on your instincts, particularly when things don’t go as expected. That experience needn’t be forgotten here. Tell me, what interests you about learning the ways of the Jedi?”

**Origin Scout — standard**

> “You’ve learned to observe your surroundings and recognize things that others might overlook. Those are valuable habits, especially when learning to sense the Force. What would you like to explore first?”

**Origin Soldier — standard**

> “Your training has taught you discipline and how to act when circumstances become dangerous. Those lessons will serve you here as well, though you may find that the Force asks something different of you. What are you hoping to learn?”

**Origin Scout / confirmed former Mentor Lead — personalized**

> “You’ve trained with Lead, then. She has a remarkable ability to notice what other people miss, though I imagine you’ve discovered that already. I’m curious to see how that experience shapes your understanding of the Force. What would you like to learn?”

**Origin Soldier / confirmed former Mentor Breach — personalized**

> “Ah, you’ve been learning from Breach. I imagine he’s taught you quite a bit about what you’re capable of when you put your strength to use. Now, I’m interested in what you hope to discover beyond that. What draws you to the Force?”

### Destination: Scout — Lead

**Origin Jedi — standard**

> “Jedi training gives you a few advantages most people don’t have. Doesn’t mean you can’t benefit from knowing how to work without them. So, what are you looking to learn?”

**Origin Noble — standard**

> “You’re probably accustomed to getting information out of people. Useful skill. Out here, though, there’s plenty of information that nobody’s going to volunteer. What would you like to get better at finding for yourself?”

**Origin Scoundrel — standard**

> “You’re used to thinking on your feet. Good. I’d like to see what you can do when you’ve got time to prepare instead. What skills are you interested in developing?”

**Origin Soldier — standard**

> “You already know how to handle yourself in a fight. That’s useful, but sometimes the best fight is the one you see coming early enough to avoid. What would you like to work on?”

**Origin Jedi / confirmed former Mentor Miraj — personalized**

> “So, Miraj has been teaching you. Good. You’ve probably learned a thing or two about trusting your senses. I can teach you how to check what they’re telling you. What interests you about scouting?”

**Origin Soldier / confirmed former Mentor Breach — personalized**

> “Breach, huh? Well, I suppose you know how to make an entrance. He’s very good at that. I’m going to teach you how to find another entrance before you start blowing holes in things. What would you like to learn?”

### Destination: Soldier — Breach

**Origin Jedi — standard**

> “Ah, a Jedi! You’ve got those lightsabers and the Force and all that. Pretty useful! But there’s plenty more to fighting than swinging one of those things around. What do you want to learn?”

**Origin Noble — standard**

> “So, you’re used to talking your way through trouble, eh? Good skill to have. But if somebody decides to stop listening, it’s nice to have another option! What do you want to get better at?”

**Origin Scoundrel — standard**

> “Ha! I like someone who knows how to get out of trouble. Though I suppose learning to stand your ground wouldn’t hurt either. What do you want me to teach you?”

**Origin Scout — standard**

> “Scouting, eh? So you’re good at finding trouble before it finds you. That’s useful! Now, what would you like to learn about dealing with it?”

**Origin Jedi / confirmed former Mentor Miraj — personalized**

> “Miraj’s been teaching you? Well, good! Jedi can do some impressive things, I’ll give them that. But you can’t expect the Force to do all the work for you! So, what do you want to learn?”

**Origin Scout / confirmed former Mentor Lead — personalized**

> “Oh, Lead sent you my way, did she? Ha! She probably wants you to learn how to shoot something without spending an hour figuring out where to stand first. Don’t tell her I said that! So, what do you want to get good at?”

### Personalized transition matrix

| Confirmed prior Mentor | Destination Mentor | Voice goal |
|---|---|---|
| Miraj | Lead | Practical verification complements Jedi perception |
| Miraj | Breach | Friendly confidence in martial technique, with respect for Jedi |
| Lead | Miraj | Thoughtful recognition of practiced observation |
| Lead | Breach | Trusting, familiar teasing about Lead's patience |
| Breach | Miraj | Respect for strength and desire to expand capability |
| Breach | Lead | Dry humor about Breach's directness, without implying incompetence |

### Review flags — preserve options above until owner chooses changes

1. **Major gating issue: class does not prove a Mentor relationship.** Being a Jedi, Scout, or Soldier does not by itself prove Miraj, Lead, or Breach personally trained this character. Personalized variants require an explicitly recorded or player-confirmed former Mentor. Otherwise use the origin-class standard, not an invented personal connection.
2. **Major multi-class issue: 'previous class' is ambiguous when an actor has three or more classes.** The design must define which class gets an origin-aware intro, and how to avoid disregarding other owned classes. Q2 still recognizes the complete build. No origin should be silently inferred from last-listed class without an explicit rule.
3. **Strongest wording concern:** 'Lead sent you my way' in Breach's personalized Lead → Breach line claims an actual referral that may never have occurred. If the user has not confirmed that referral, replace with a noncommittal reference to earlier training while preserving Breach's teasing tone.
4. **Avoid assuming particular training acquisitions:** Breach's 'you've got those lightsabers and the Force' assumes specific Jedi starting feats and/or abilities. A multiclass Jedi might not have either feature. Rework or condition on build facts. Likewise references to a Noble's diplomacy or a Scout's observed skill should be broad expectations, not fixed history or enforced personality.
5. **Fixed script compatibility:** Earlier v0.9 required fixed destination-class Mentor dialogue, independent of earlier *survey responses*. These introductions can remain deterministic, **pre-authored variants selected from verified actor history**, not runtime-generated speeches or a replacement of the Mentor voice. Need explicit owner approval of this expansion to class-specific origin variants.
6. **Avoid implied insults:** Lead's jokes about Breach must remain affectionate/respectful; Breach's comments on Lead must not undermine her command; Miraj's connections are restrained and should not be embellished.
7. **Previous Noble → Jedi example:** The earlier Miraj line in `MC-Q1-JEDI-01` remains in the file as an alternative example; the supplied origin-Noble line above is now an additional *candidate*, not silently substituted or finalized.
8. **Coverage scope:** This supply covers 12 standard class-to-class introductions plus 6 conditional Mentor-to-Mentor alternatives for the three destination Mentors. J0-N1 (Noble) and Ol' Salty (Scoundrel) destination-class introductions are still outstanding if origin-aware Q1 coverage is required for all five classes.

### Approval ledger

- **Received as working source text:** all 18 introductions and characterization/relationship boundaries.
- **Owner-approved lines:** none yet.
- **Implementation status:** not implemented, not mechanically certified, no GitHub changes.

## Change log, continued

- **2026-11-14 — local dialogue intake:** Appended 12 standard and 6 conditional personalized Mentor introductions, established voice/relationship notes, and eight review flags. Preserved original Noble → Jedi sample and distinguished draft from approved. No commit or push.


---

## Draft MC-Q2-Q6-MENTOR-LINES-01 — Fixed introductions and conditional reflection

**Received:** 2026-11-14  
**Status:** Owner-supplied dialogue drafts, **proposed only**, not yet approved or locked.  
**Source:** Dialogue and characterization review supplied directly by the owner following the previous Q1 mentor-transition draft. Wording preserved, with typographic quotation marks normalized to ASCII.  
**Scope:** Destination Mentor dialogue for Q2-Q5, and Q6 open / dynamic assessment / close / A-E corrective branches for Miraj, Lead, and Breach. No new mechanical answer banks, scoring, registry entries, or runtime implementation.

### Structure and presentation contracts

- **Q2-Q5:** One *fixed*, class-Mentor-specific introduction per question, independent of former class and former Mentor. These introductions are distinct from the dynamic player-selectable answer text or the dynamic Q4 scenario itself.
- **Q6:** Fixed Mentor opening, followed by an **evidence-grounded, inserted character assessment**, then a fixed closing question. Avoid inventing dialogue about the character's biography or acquired abilities.
- **Q6 A-E:** The Mentor's conditional responses below are spoken **after** a player selects the approved *first-person* agreement response. The agreement answer text and hidden bands remain defined in the v0.9 design; these Mentor lines are not replacements for the player's A-E selectable statements.
- **Q6 D and E:** Each contains two distinct stages: **what I am NOT** and **what I AM**. Both must be offered for a substantive correction. Neither stage edits acquired mechanics or silently overwrites an explicit career ambition.
- No class acquisition, eligibility, inferred identity, or declared career goal should be represented as interchangeable. The Q6 assessment distinguishes observed development from stated future intentions.

### Q2 — Build Integration

**Purpose:** Ask how the destination class fits the character's accumulated experience and development. Complement, reinforce, address gaps, or consider a deliberate change without assuming departure from previous classes.

**Miraj — proposed fixed introduction**

> "You haven't come here empty-handed. Everything you've learned before still has its place, and these lessons may give you new ways to use it. How do you hope they'll fit together?"

**Lead — proposed fixed introduction**

> "You've already got experience, so we're not starting from scratch. Think about what you do well and what you'd like to do differently. Where do you want this training to help?"

**Breach — proposed fixed introduction**

> "You've got some experience already. Good! We can build on that, patch up what isn't working, or try something new. What sounds useful to you?"

**Owner's characterization notes:** Miraj respects accumulated experience; Lead treats development as practical evaluation; Breach sees previous training as useful rather than requiring correction. The owner particularly likes Breach's "patch up what isn't working" as natural problem-solving language.

### Q3 — Investment Depth

**Purpose:** Ask about intended investment in the destination class without a mandatory level schedule. Four player choices remain **Dip / Dive / Swim / Undecided** (not necessarily spoken using those exact labels). Bridge remains a separate purpose, not a depth.

**Miraj — proposed fixed introduction**

> "Some students come looking for a few useful lessons. Others discover they want to keep learning for years. You don't need to decide forever, but how far would you like to pursue this?"

**Lead — proposed fixed introduction**

> "I can teach you a few useful things, or we can put some real time into this. Maybe you don't know yet. How much are you planning to commit to your training?"

**Breach — proposed fixed introduction**

> "Nothing wrong with learning a little, and nothing wrong with wanting to learn everything! You don't have to make up your mind today, either. How far do you think you'll take this?"

**Owner's characterization notes:** Miraj allows changing interests; Lead assesses realistic resource and training commitment; Breach remains encouraging about both limited and substantial investment. Lead's focus is commitment, not grand ambition.

### Q4 — Applied Scenario

**Purpose:** Set up a dynamically selected, class/build-relevant hypothetical scenario. The fixed line must not determine the scenario's solution or replace the scenario itself.

**Miraj — proposed fixed introduction**

> "Let's try something. I'd like you to consider a situation and tell me how you would approach it. Take a moment to think before answering."

**Lead — proposed fixed introduction**

> "All right, here's one to think through. Pay attention to what you know, what you don't, and what you have available. What would you do?"

**Breach — proposed fixed introduction**

> "All right, here's a problem for you. Don't worry about giving me the answer you think I want. Tell me how you'd handle it!"

**Owner's characterization notes:** Miraj invites judgment without prescribing moral conduct; Lead encourages situational appraisal without assuming stealth; Breach accepts valid approaches other than violence. Their function is intentionally similar here; revisit voice differentiation only if naturalness suffers.

### Q5 — Next Milestone

**Purpose:** Link the new discipline to a feasible near-term objective and, where declared, the character's longer-term aspiration, without assuming a prestige route or level-20 horizon.

**Miraj — proposed fixed introduction**

> "You don't need to know everything you'll eventually become. For now, think about what's ahead of you. What's something you hope these lessons will help you accomplish?"

**Lead — proposed fixed introduction**

> "Big ambitions are fine, but we should start with something you can actually work toward. What's your next objective, and how do you see this training helping you reach it?"

**Breach — proposed fixed introduction**

> "Good! Now tell me what you want to do with all this. Doesn't have to be some grand, heroic thing. Just something worth working toward. What's next for you?"

**Owner's characterization notes:** Lead translates ambition into an actionable objective; Breach asks whether the milestone matters to the character personally; Miraj invites direction without demanding certainty.

### Q6 — The Mentor's Reflection

**Purpose:** A fixed opening and closing surround a personalized reading of the character's *current inferred path*, supported by actual actor-state facts and qualified by uncertainty. Previously declared future ambitions may be mentioned **separately**. The assessment may not claim an unowned ability, a fictional past incident, or confirmed eligibility without verification.

#### Miraj — Jedi Mentor

**Opening**

> "I've listened to what you've told me, and I've considered the training you've undertaken so far. Let me see whether I've understood the person you're becoming."

**[INSERT PERSONALIZED CHARACTER ASSESSMENT — observed current direction first; declared future intent separately; cite only real evidence internally]**

**Closing**

> "Does that sound like you? Or is there something important I've misunderstood?"

**A — Substantially agrees**

> "Then I'm glad I've understood you correctly. We can continue from there."

**B — Minor correction**

> "Of course. Tell me which part you'd like to change. The rest needn't be discarded."

**C — Uncertain / several corrections**

> "That's all right. Sometimes it's difficult to put these things into words. Tell me which parts don't quite fit, and we'll work through them."

**D — Substantially disagrees**

- **Stage 1 — What I am NOT:** "Then I've made some assumptions I shouldn't have. Let's begin with what no longer describes you."
- **Stage 2 — What I AM:** "And what would you say describes you better now?"

**E — Rejects interpretation**

- **Stage 1 — What I am NOT:** "Then I've misunderstood you. Tell me what I've said that isn't true of you, and I won't hold on to those assumptions."
- **Stage 2 — What I AM:** "Now I'd like to hear it from you. How would you describe yourself?"

**Owner's characterization notes:** Miraj receives corrections without defensiveness; she seeks to understand the person, not defend the accuracy of her initial interpretation.

#### Lead — Scout Mentor

**Opening**

> "I've looked at what you've actually trained in and what you've said you want to do next. Those aren't necessarily the same thing, so I'm keeping them separate. Here's how I see it."

**[INSERT PERSONALIZED CHARACTER ASSESSMENT — observed current direction first; declared future intent separately; cite only real evidence internally]**

**Closing**

> "Have I got you right, or am I missing something?"

**A — Substantially agrees**

> "Good. Then I know what we're working with."

**B — Minor correction**

> "Fair enough. Point me toward the part I got wrong. No reason to start the whole thing over."

**C — Uncertain / several corrections**

> "Then I haven't got the full picture yet. Show me where it's off, and we'll sort it out."

**D — Substantially disagrees**

- **Stage 1 — What I am NOT:** "All right. Start with what no longer fits. I'd rather know where I'm wrong than keep working from a bad assumption."
- **Stage 2 — What I AM:** "Now give me the better description. What should I understand about you instead?"

**E — Rejects interpretation**

- **Stage 1 — What I am NOT:** "Then scrap my interpretation. First, tell me exactly what I got wrong."
- **Stage 2 — What I AM:** "All right. Your turn. Tell me how you'd describe yourself, and we'll work from that."

**Owner's characterization notes:** Lead treats disagreement as valuable information and avoids wasting resources on an inaccurate assessment. Her replies are economical but not dismissive.

#### Breach — Soldier Mentor

**Opening**

> "All right, let's see what we've got here. You've learned some things already, and you've got ideas about where you want to go next. Here's what I make of it."

**[INSERT PERSONALIZED CHARACTER ASSESSMENT — observed current direction first; declared future intent separately; cite only real evidence internally]**

**Closing**

> "Sound like you? Don't worry about correcting me if I've got something wrong."

**A — Substantially agrees**

> "Good! Then we know what we're working with."

**B — Minor correction**

> "Ah, nearly had it! All right, which bit needs fixing?"

**C — Uncertain / several corrections**

> "That's fine. I'm probably missing a few things. Tell me what I haven't understood."

**D — Substantially disagrees**

- **Stage 1 — What I am NOT:** "Oh! Then I got more wrong than I thought. All right, let's start with what you aren't."
- **Stage 2 — What I AM:** "Right. Now tell me what you are, in your own words."

**E — Rejects interpretation**

- **Stage 1 — What I am NOT:** "Well, I made a mess of that! Fair enough. Tell me what I got wrong."
- **Stage 2 — What I AM:** "Then help me get it right. Tell me who you are, not who I guessed you'd be."

**Owner's characterization notes:** Breach accepts student corrections without defensiveness; his occasional self-directed humor does not mock the character.

### Characterization review — supplied with drafts

| Mentor | Editorial characterization status | Especially strong sections | Unresolved voice consideration |
|---|---|---|---|
| Miraj | **Provisional voice** | Q2 and Q5 emphasize individual development without inflated mysticism | Compare with actual original campaign dialogue before locking; Q4 is necessarily generic |
| Lead | **Strong working fit** | Q2, Q4, Q6 center practical choices and sound assessment | Could sharpen Q3 with restrained dry humor later, not mandatory |
| Breach | **Strong working fit** | Q2, Q5 are approachable; Q4 avoids violence as a default | Preserve restrained, situational humor rather than making every line a joke |

### Open review / implementation boundaries

1. **Draft versus approval:** All lines in this section remain unapproved working dialogue. Do not equate the owner's stated preference for a line with formal locking or mechanical certification.
2. **Fixed intro vs dynamic content:** Q2-Q5 lines never interpolate unverified former-class claims. Q4's actual hypothetical challenge and first-person selectable methods must be designed and independently verified later.
3. **Dynamic assessment ownership:** Q6 opening and closing are fixed; the assessment is an evidence-grounded insertion, not freeform fictional narration. If character evidence is thin (especially first multiclass at level 2), qualify the current-path inference and offer fewer correction readings rather than padding it.
4. **A-E response semantics:** Preserve the v0.9 agreement and follow-up contracts, all *player* answers first-person; the above are spoken *Mentor responses*. B minor nudge; C 1-3 corrected readings where supported; D and E mandatory two-part negative-plus-affirmative correction. Do not assume numeric targets can be met with sparse evidence.
5. **No destructive calibration:** Lead's "scrap my interpretation" is narrative shorthand for replacing her *current inferred reading*, **not** deleting historical survey evidence or actual feats, skills, class levels, or explicitly declared career ambitions. The same restriction applies to all Q6 rejection lines.
6. **Q3 intensity language:** Breach's "learn everything" is enthusiasm, not a promise to acquire all Soldier features or a level threshold. Dip/Dive/Swim classifications remain independent of level distribution, Bridge route purpose, and actual ownership.
7. **Q5 goal continuity:** No question or answer silently replaces a previous selected canonical career goal. A true goal pivot needs a separate explicit player affirmation.
8. **Historical missing destinations note (resolved in subsequent section):** This earlier checkpoint covered three Mentors. A subsequent local appendix now drafts Q2-Q6 for J0-N1 (Noble) and Ol' Salty (Scoundrel).
9. **Formal content review:** Prior to approval check each line against actual source-of-character NPC dialogue, then audit flow for dynamic assessment, the approved A-E player response UI, and correction branch mechanics. No new weights, tag maps, feasibility rules, code, or Git changes are authorized by this dialogue section.

### Acceptance / approval ledger (Q2-Q6 dialogue)

- **Received in local file:** 12 fixed Q2-Q5 intros (4 stages x 3 Mentors), 3 fixed Q6 openings, 3 fixed closings, 15 conditional A-E Mentor replies (D and E each contain both necessary stages), the supplied characterization analysis, and review boundaries.
- **Owner-approved text:** None yet. All supplied lines are still working drafts.
- **Design-approved structure carried over from v0.9:** 5 substantive questions plus Q6, conditional calibration inside Q6, independently tracked goals and verified achievements.
- **Commit / push:** None.

## Change log, continued

- **2026-11-14 — local Q2-Q6 dialogue intake:** Appended all three destination Mentors' fixed Q2-Q5 introductions and complete Q6 introduction/reflection/closing/correction branches, plus characterization review and flow guardrails. No repository edits or Git commits.

---

## Multiclass dialogue continuation — J0-N1 and Ol' Salty (2026-11-14)

**Status:** Source-grounded editorial working draft; not owner-approved, mechanics-certified, or implemented. Based on the actual five fixed L1 lines for each Mentor in `SWSE_L1_Adaptive_Mentor_Survey_Rolling_Design_v0.19_2026-11-13.md`, Appendix A, and current `scripts/engine/mentor/mentor-dialogues.data.js` personality text. J0-N1 is a protocol droid/personal butler with a formal assessment style, explicit care for the Master's personal fulfillment; Ol' Salty is a nautical, irreverent space-pirate mentor whose practical counsel includes survival, cunning and reputation. Both support additive multiclassing.

### Q1 — Class Discovery: J0-N1 (entering Noble)

These introductions are keyed to **prior foundation class**, not automatically to a named former Mentor. Do not assume a real mentor/student relationship from a class level alone.

- **From Jedi:** “Observation: Your Jedi studies have given you a different perspective on the decisions people make, Master. Noble training offers ways to bring people together and put those decisions into motion. Which abilities would you most like to develop?”
- **From Scoundrel:** “Observation: Your previous training may have taught you to improvise when circumstances turn against you, Master. I can also help you shape those circumstances beforehand. Which of these skills interests you?”
- **From Scout:** “Assessment: Learning to recognize what others overlook is useful, Master. Learning how to act upon that information through planning, negotiation, or leadership can be equally valuable. What would you like to cultivate?”
- **From Soldier:** “Observation: Your martial training offers ways to face a threat directly, Master. Noble instruction can also help you organize allies, manage resources, and resolve disputes before they become battles. Which capability would you prefer to explore?”

### Q1 — Class Discovery: Ol' Salty (entering Scoundrel)

- **From Jedi:** “So ye've studied the Jedi way, eh? A steady head'll serve ye well out here, matey. Now let's see what quick thinking, clever talk, and a few less respectable tricks can add. What catches yer fancy?”
- **From Noble:** “Ye've learned there's power in knowin' how to deal with people, matey. Out beyond the fancy ports, it also pays to know how to slip past trouble when talk won't do. What trick would ye like to pick up?”
- **From Scout:** “Know how to find yer way through rough country, do ye? Good! But a locked hatch or a crooked deal can be just as dangerous as a wild beast. What would ye like ol' Salty to teach ye?”
- **From Soldier:** “Know yer way around a fight, eh? Handy skill, matey. But a fast getaway or a well-timed bluff can save ye a heap o' ammunition. Which new trick interests ye?”

### Q2 — Build Integration (fixed, destination-specific)

**J0-N1:** “Assessment: Your previous training is an asset, Master, not something to be discarded. We can add the skills to coordinate people, resources, and information around what you already do well. How would you like these capabilities to work together?”

**Ol' Salty:** “Ye've already got a few tricks aboard, matey. I'm not here to toss 'em overboard. What would ye like to add to yer kit, and how'll ye use it alongside what ye know?”

### Q3 — Investment Depth (fixed, destination-specific)

**J0-N1:** “Planning Inquiry: A brief course of study may serve one purpose; sustained training may serve another. Neither is inherently superior, Master. How much of your time would you like to devote to this discipline?”

**Ol' Salty:** “Some folk learn one good trick and sail on. Others stay till they know every rope aboard. Maybe ye haven't decided yet. How deep are ye plannin' to go, matey?”

*Dip/Dive/Swim/Undecided remain intent categories, not mandatory class-level thresholds; Bridge is a separate purpose.*

### Q4 — Applied Scenario (fixed introduction, dynamic challenge)

**J0-N1:** “Hypothetical Scenario: A complication now requires your judgment, Master. I recommend considering both the information and the resources available to you. How would you proceed?”

**Ol' Salty:** “Right, matey, here's a scrape worth thinkin' about. Might be more than one way through it. How would ye play it?”

### Q5 — Next Milestone (fixed, destination-specific)

**J0-N1:** “Long-Term Projection: I can outline several promising avenues, Master, but I would prefer to begin with a goal that matters to you. What would you like your next step to accomplish?”

**Ol' Salty:** “Can't chart the whole galaxy in one jump, matey. Pick the next port worth reachin'. What d'ye want this training to help ye pull off?”

### Q6 — Mentor's Reflection (fixed framing + evidence-grounded inserted assessment)

#### J0-N1 — Noble Mentor

**Opening:** “Observation: Your acquired training suggests one direction, Master, while your stated ambitions may point toward another. I have prepared a provisional assessment. Your corrections would be most valuable.”

`[INSERT EVIDENCE-GROUNDED CHARACTER ASSESSMENT: CURRENT INTERPRETED IDENTITY; SEPARATE DECLARED FUTURE GOAL; UNCERTAINTY WHERE NEEDED]`

**Closing:** “Does this reflect the person you are becoming, or have I misunderstood your intentions?”

- **A — substantially agrees:** “Acknowledged, Master. I shall use that as our present working understanding.”
- **B — minor correction:** “Correction requested. Please indicate the detail that needs adjusting; the rest may still be useful.”
- **C — uncertain/several corrections:** “Uncertainty noted, Master. Let us identify the parts that do not fit before drawing firmer conclusions.”
- **D — substantially disagrees, Stage 1 / What I am NOT:** “Then my assessment relied on assumptions that no longer serve. Which descriptions should I set aside?”
- **D — Stage 2 / What I AM:** “Thank you. Which statements better describe your present direction?”
- **E — rejects interpretation, Stage 1 / What I am NOT:** “I owe you an apology, Master. This interpretation is evidently unsound. Let us identify precisely what I misunderstood.”
- **E — Stage 2 / What I AM:** “Now please select the statements that describe you more faithfully. I would rather learn than repeat the error.”

#### Ol' Salty — Scoundrel Mentor

**Opening:** “Been watchin' what ye've learned and listenin' to where ye say ye want to go. Not always the same heading, those two. Here's the course I reckon ye're sailin'.”

`[INSERT EVIDENCE-GROUNDED CHARACTER ASSESSMENT: CURRENT INTERPRETED IDENTITY; SEPARATE DECLARED FUTURE GOAL; UNCERTAINTY WHERE NEEDED]`

**Closing:** “Sound like yer voyage, matey, or have I got me charts upside down?”

- **A — substantially agrees:** “Good! Then we'll keep that heading in mind, matey.”
- **B — minor correction:** “Ah, one mark off on the chart? Show me which one, and I'll fix it.”
- **C — uncertain/several corrections:** “Fair enough. Hard to steer by a chart that's only half right. Which bits don't fit ye?”
- **D — substantially disagrees, Stage 1 / What I am NOT:** “Then I've marked the wrong waters, have I? Show me what don't belong on this chart.”
- **D — Stage 2 / What I AM:** “Right. Now tell me which heading's closer to the one ye're actually sailin'.”
- **E — rejects interpretation, Stage 1 / What I am NOT:** “Well, blast me compass. Got the whole thing wrong, did I? Show me what I've mistaken.”
- **E — Stage 2 / What I AM:** “Now give me the proper bearings, matey. What does describe ye?”

### Editorial / implementation boundaries

1. **Source fidelity:** J0-N1's tagged speech prefixes and `Master` address match the L1 reference; avoid making every line clinical because his L1 Q5 explicitly values happiness over predicted success. Salty's language intentionally echoes L1 nautical slang, but does not imply that every Scoundrel must be criminal.
2. **Special prior-Mentor lines:** No personal history has yet been verified between J0-N1 or Ol' Salty and Miraj, Lead, or Breach. Do not invent named-mentor references solely because the actor has their former class; such variants require later narrative approval and an actual prior-mentor signal.
3. **Q1 assumptions:** The prior class gives broad possible training, not proof of exact feats, talents, skills, powers, spoken promises, or adventures. Verify capabilities from current actor data before describing them as owned.
4. **Q6 authority:** Assessment is dynamic and grounded in actual persisted training; inferred present identity and explicitly declared future goal are separate. A–E correct the interpretation only; D/E have mandatory NOT and AM selection stages. No correction removes owned mechanics or silently changes a declared goal.
5. **UI language:** Dialogue describing selection of statements assumes first-person selectable player choices; do not imply free text is necessary.
6. **Approval:** All new lines are editorial proposals until reviewed by the owner. No code, metadata mapping, weights, commits, pushes, or merges authorized.

### Acceptance / approval ledger — J0-N1 and Ol' Salty

- **Received in local working file:** 8 prior-class Q1 introductions, 8 fixed Q2-Q5 introductions, 2 Q6 openings, 2 Q6 closings, 10 A–E outcomes, with separate D/E stages (14 spoken branch utterances total).
- **Owner-approved text:** None yet; L1 source lines remain historical reference, not automatic multiclass approval.
- **Coverage:** Five destination class Mentors now have draft Q2-Q6 dialogue; the two newest also have four prior-class Q1 variants each.
- **Commit/push:** None.

## Change log, continued

- **2026-11-14 — local J0-N1 / Ol' Salty dialogue extension:** Inspected L1 v0.19 Appendix A and repository Mentor source, then appended two destination Mentors' Q1 previous-class variations, fixed Q2–Q5, Q6 reflection framing and A–E conditional branches. All proposed and local only.

---

## Draft MC-Q1-NOBLE-ORIGIN-VARIANTS-01 — Noble discovery answers keyed by previous class (2026-11-14)

**Status:** PROPOSED FOR OWNER REVIEW; *not* approved, ontology-mapped, rules-certified per response, implemented, or committed.

### Design revision: origin-sensitive answer banks

Owner correction: Q1 player answers should **vary with the class from which the character is entering Noble**, not be a single Noble answer bank reused for Jedi, Scoundrel, Scout, and Soldier. The destination Mentor **J0-N1** remains fixed. His corresponding Q1 opening is already drafted separately for each previous foundation class. The proposed Q1 interface has **five substantive, first-person player replies plus one neutral 'I am not sure' reply** for each ordered transition, giving Noble 24 drafts across its four inbound transitions. This modifies the earlier generic Noble Q1 proposal; do not use generic answers as the final authority.

This makes Q1 a **comparative discovery** of what Noble training *adds* to the character's past discipline. Q2 remains distinct: it integrates the chosen direction with all actual classes/skills/feats/talents/equipment and previously declared goals. Origin-specific wording cannot imply the player owns a particular prior-class ability without checking actual acquired character records.

**Future routing decision needed for characters already having 2+ different existing foundation classes:** Source the transition origin from an explicit progression-context origin where available; otherwise define a transparent and deterministic selection rule. Do **not** assume an actor's original level-1 class always remains the relevant origin, or use arbitrary array order. Independent actual-build evidence is still required for any individualized mechanical guidance.

### Noble rules context (source audit for editorial direction)

- Core Noble available talent trees: **Influence** (pressure, surrender/intimidation); **Inspiration** (bolster and rally companions); **Leadership** (Born Leader, Coordinate, Rally, Trust); **Lineage** (Connections, Educated, Spontaneous Skill, Wealth). The Noble has broad trained-skill *list* including Persuasion, Deception, Gather Information, Perception, Knowledge, Treat Injury, Pilot and Use Computer; gaining Noble by multiclass does **not** automatically grant newly trained skills.
- Starting feats when entering Noble by multiclass: choose **one** from Noble's starting feat list, subject to prerequisites. Core starting feats include Linguist (Int 13 prerequisite), Weapon Proficiency (pistols), and Weapon Proficiency (simple weapons); do **not** imply all are granted or that a previously owned feat represents a new benefit. The first Noble level also grants a Noble talent. Core Noble bonus feats come at **even Noble levels**, not merely at even character levels.
- Supplements broaden legitimate Noble directions: **Collaborator** and **Loyal Protector** (Clone Wars Campaign Guide); **Fencing** (Knights of the Old Republic Campaign Guide); **Ideologue** and expanded Lineage/Inspiration (Force Unleashed Campaign Guide); expanded **Leadership** tactical talents (Galaxy at War); further Lineage and technical options (Starships of the Galaxy). Individual examples are *candidate references*, not automatically legal for every character; printed requirements and repository SSOT identities still need exact per-answer certification.
- Character aspirations, current ownership, formal prerequisite eligibility, and achieved acquisition must remain separate. The wording below expresses *future interest*, not present capability. A neutral answer records **no** specialization preference.

### Origin: Jedi -> Noble

**Destination mentor:** J0-N1. **Q1 focus:** how persuasion, group leadership, organizational reach, and worldly knowledge could extend the character's existing Jedi discipline.

1. "I want to learn how to persuade people and settle disputes through understanding rather than relying on the abilities I've trained in before."
2. "I want to learn to organize people around a shared purpose, so my companions can act together when it matters."
3. "I want to help others keep their courage and recover when a situation begins to overwhelm them."
4. "I want to understand governments, cultures, and institutions well enough to recognize what is really shaping a conflict."
5. "I want to build connections and secure resources that help the people and causes I choose to support."
6. "I'm not sure yet. I want to understand what Noble training could offer me before choosing a direction."

### Origin: Scoundrel -> Noble

**Destination mentor:** J0-N1. **Q1 focus:** how adaptable individual techniques can become influence, coordination, education, and lasting support.

1. "I want to become more convincing when the stakes are high, whether I'm bargaining, bluffing, or asking someone to trust me."
2. "I want to turn my ability to improvise into a way to coordinate a whole group, not just get myself out of trouble."
3. "I want to cultivate useful contacts and resources so I'm not always depending on whatever I can find at the last moment."
4. "I want to understand organizations and information networks well enough to recognize opportunities before they appear."
5. "I want to learn how to encourage and support my companions so our success doesn't depend on one person getting lucky."
6. "I'm not sure yet. I'd rather explore the possibilities before deciding what kind of Noble training suits me."

### Origin: Scout -> Noble

**Destination mentor:** J0-N1. **Q1 focus:** turning observation, exploration, preparedness, and field experience into command, diplomacy, support, organizational reach, or broad expertise.

1. "I want to learn how to turn what I discover into plans that help an entire team work together."
2. "I want to become better at questioning people and negotiating for information that observation alone can't uncover."
3. "I want to be able to steady my companions and help them keep going when an expedition becomes dangerous."
4. "I want to establish contacts and obtain support before we head into unfamiliar territory, instead of relying only on what we carry."
5. "I want to broaden my knowledge and practical expertise so I can handle unfamiliar problems without depending on a specialist."
6. "I'm not sure yet. I'd like to see which of these skills would actually broaden what I can do."

### Origin: Soldier -> Noble

**Destination mentor:** J0-N1. **Q1 focus:** adding command, morale, negotiation, logistics, or tactical finesse to martial training without implying that every Soldier is aggressive or already possesses any particular combat option.

1. "I want to learn how to direct and coordinate allies, so I can contribute more than my own actions in a fight."
2. "I want to be the person who keeps a team confident, organized, and capable when things begin to go badly."
3. "I want to learn how to negotiate, pressure an opponent to surrender, or prevent a confrontation from becoming a battle."
4. "I want to build the contacts and resources needed to keep my companions equipped and ready before trouble arrives."
5. "I want to refine my fighting technique with feints and precise timing, opening opportunities that raw strength alone might miss."
6. "I'm not sure yet. I want to learn what Noble training adds before deciding where to focus."

### Provisional developer-only relationship to mechanical authorities (NOT scoring tags)

| Inbound class | Answer 1 | Answer 2 | Answer 3 | Answer 4 | Answer 5 |
|---|---|---|---|---|---|
| Jedi | Influence / Persuasion | Leadership / Coordinate | Inspiration / Bolster Ally | Lineage / Educated; Knowledge | Lineage / Connections, Wealth |
| Scoundrel | Influence / Persuasion, Deception | Leadership / Coordinate | Lineage / Connections, Wealth | Lineage / Educated; Knowledge, Gather Information | Inspiration / Inspire Confidence |
| Scout | Leadership / Coordinate | Persuasion, Gather Information; Influence | Inspiration / Bolster Ally | Lineage / Connections | Lineage / Educated, Spontaneous Skill |
| Soldier | Leadership / Born Leader, Coordinate | Inspiration / Inspire Confidence; Leadership / Rally | Influence / Demand Surrender, Presence | Lineage / Connections, Wealth | Fencing talent tree (KOTOR), subject to prerequisites |

**Uncertified names and relationships:** Rows above are *editorial teaching references only*. Verify source-accurate mechanics, prerequisites, exact repository talent IDs, and frozen ontology 190-tag mappings. Avoid treating core skill access as automatic training. If Soldier's Fencing option is too specialized for a first-page Q1 bank, replace with an intelligence/tactics or ally-action option after owner review.

### Open review questions

1. Approve or revise the **5 substantive + 1 neutral** cardinality for every origin-specific bank?
2. Do these four origins produce sufficiently different *player-facing* choices, or is additional contrast needed in each bank?
3. For a character with more than one earlier class, what is the authoritative 'previous class' for Q1 routing?
4. Does the Soldier -> Noble fifth choice belong to a specialist fencing path, or should it emphasize intelligence/tactical knowledge instead?

**No production changes or GitHub actions authorized by this draft.**

## Change log, continued

- **2026-11-14 — Q1 origin-specific revision:** Added 24 proposed Noble Q1 first-person responses covering Jedi, Scoundrel, Scout, and Soldier -> Noble; six per origin including a neutral option; documented core and supplemental Noble mechanical directions, multiclass grant restrictions, developer-only candidate mechanics, and multiclass origin-selection open questions. Not yet owner-approved or mechanically certified.

---

## Draft MC-Q1-JEDI-ORIGIN-VARIANTS-01 — Jedi discovery answers keyed by previous class (2026-11-14)

**Status:** PROPOSED FOR OWNER REVIEW. Not line-approved, mechanically certified at record/ID level, ontology mapped, implemented, or committed.

### Scope and routing

- **Destination:** Jedi; **Mentor:** Miraj. Use the already-drafted Miraj Q1 introductions for each origin (and the personalized Lead/Breach introductions only where the specific previous Mentor relationship is evidenced).
- **Origins:** Noble, Scoundrel, Scout, Soldier. Five substantive *first-person* selections plus one neutral undecided selection per origin = **24 proposed player replies**.
- The earlier **MC-Q1-JEDI-01 Noble -> Jedi** six-answer example at the beginning of this file is **SUPERSEDED as a candidate bank** by the Noble -> Jedi subsection below. Retain the old version as design history, not as an additional active bank.
- These answers concern the aspects of **Jedi training the player wishes to pursue**, not verified possession of Force powers, class feats, training, equipment, social skills, combat maneuvers, or a future prestige class.
- An origin label supplies a *framing lens*, not a claim about actual feats/talents/skills the character selected. Q2 remains responsible for all-class integration and reconciliation with the full actual build. If the actor has multiple pre-existing foundation classes, a deterministic authoritative selection policy is still an open design decision.
- The neutral sixth answer records *no positive Jedi specialization intent*, *no negative intent*, and is not treated as choosing generalist Jedi training. Merely viewing answers records no preference.

### Published-rule basis (editorial verification; no production certification)

Checked against `Core Rulebook_djvu.txt` (Jedi class and multiclass rules, Force Sensitivity/Training feat descriptions, Force powers, and core Jedi talent trees), `Jedi Academy Training Manual_djvu.txt`, `Knights of the Old Republic Campaign Guide_djvu.txt`, `Clone Wars Campaign Guide_djvu.txt`, `Force Unleashed Campaign Guide_djvu.txt`, and `Rebellion Era Campaign Guide_djvu.txt` (Jedi talent expansions).

- **Core class talent trees:** Jedi Consular (Adept Negotiator, Force Persuasion, Skilled Advisor), Jedi Guardian (Battle Meditation, Force Intuition, Acrobatic Recovery, Resilience), Jedi Sentinel (Clear Mind, Dark Side Sense, Force Haze), and Lightsaber Combat (Block, Deflect, Lightsaber Defense, Weapon Specialization, Lightsaber Throw, etc.).
- **Further options:** Clone Wars adds Consular's Vitality (ally support), Guardian Strike (protecting allies by threatening foes), and Sentinel's Observation; Jedi Academy adds Adversary Lore (enemy weaknesses), Grenade Defense (Force-based defensive utility), and Hold the Line (movement control); KOTOR adds Improved Battle Meditation and Sentinel Strike. These are examples of legitimate Jedi directions, not universal free abilities.
- **Force talents are an explicit, independently selectable development lane, not a footnote to Force powers.** The `Force Sensitivity` feat allows a character to choose an eligible **Force talent in place of a normal class talent whenever a class level grants one**, whether that talent opportunity comes from Jedi or another heroic class. The four core non-class Force talent trees are **Alter, Control, Sense, and Dark Side**, with additional eligible tradition/supplemental Force talent trees subject to membership and individual prerequisites. Examples: **Sense / Force Perception, Foresight, Force Pilot**; **Alter / Disciplined Strike, Telekinetic Power, Telekinetic Savant**. Dark Side talent access has additional dark-side prerequisites and should never be silently presumed. Jedi Consular, Guardian, Sentinel, and Lightsaber Combat are **Jedi class talent trees**, distinct from the universally accessible (for Force-Sensitive characters) Force talent trees.
- **Force-facing paths** may also involve trained Use the Force, the separate Force Training feat, and specific Force powers (for example, *surge*, *move object*, *mind trick*, *farseeing*, *vital transfer*). **Force Sensitivity alone does not grant training in Use the Force or a power suite.** Force Training requires both Force Sensitivity **and trained Use the Force**. A Jedi multiclass entrant who *already* possesses Force Sensitivity need not select that feat again to become eligible for appropriate Force talents; the one Jedi multiclass starting feat may be used for another eligible choice. Neither Force talents nor Force powers are all automatically gained by taking a Jedi level.
- **Multiclass rules:** entering Jedi selects **one** Jedi starting feat, not all starting feats; it provides a Jedi talent, Jedi class-skill access (not automatic training), the relevant class defense bonus as nonstacking with other class bonuses, and normal class level progression. Core Jedi starting feats are Force Sensitivity, Weapon Proficiency (lightsabers), and Weapon Proficiency (simple weapons). Starting-character lightsaber equipment is **not** automatically awarded to a multiclass entrant. `Force Training` requires Force Sensitivity **and trained Use the Force**.
- **Per-record verification still required:** exact printed feat/talent/power prerequisites, active-level feasibility, repository IDs/SSOT authority, the frozen 190-tag semantic ontology, and player educational detail-rail text. Do not treat suggested examples in the mapping table as a guarantee of availability, immediate selection, or automatic grant.

### Origin: Noble -> Jedi

**Focus:** Add Force-based understanding, de-escalation, protection, group support, and new ways of acting to a character who previously trained as a Noble; do *not* assume they selected Persuasion or leadership abilities.

1. "I want to understand how the Force can help me reach people and resolve conflicts when ordinary words aren't enough."
2. "I want to learn how to protect others with a lightsaber, especially when negotiations fail and someone is in danger."
3. "I want to strengthen and guide my companions through the Force so we can face difficult situations together."
4. "I want to sense dangers and hidden intentions that I might not recognize through observation or conversation alone."
5. "I want to discover what else the Force can let me do, from moving obstacles to finding new ways around a problem."
6. "I'm not sure yet. I want to understand what Jedi training makes possible before choosing where to focus."

### Origin: Scoundrel -> Jedi

**Focus:** Complement improvisation, ingenuity, mobility, and adaptable tactics with Jedi stealth, finesse, perception, defense, and Force-enabled problem solving; do *not* imply dishonesty, criminality, or possession of a specific Scoundrel feat.

1. "I want to learn how to conceal myself and my companions through the Force when being noticed would put us in danger."
2. "I want to develop a quick, precise lightsaber style that lets me handle a fight without depending on a blaster."
3. "I want to learn how the Force can help me influence a confrontation without having to trick or threaten anyone."
4. "I want to sharpen my reactions so I can sense an attack coming and defend myself or others before it lands."
5. "I want to use the Force in unexpected ways, turning obstacles, distance, and difficult escapes into opportunities."
6. "I'm not sure yet. I've learned there are usually several ways to solve a problem, and I'd like to explore these before choosing one."

### Origin: Scout -> Jedi

**Focus:** Extend awareness, field mobility, reconnaissance, protection, group coordination, and concealment through Jedi capabilities; avoid assuming any particular Scout trained skill or that the Scout only works in wilderness terrain.

1. "I want to sense threats and disturbances that even careful observation might miss."
2. "I want to learn how the Force can help me cross dangerous terrain and overcome barriers when the normal route fails."
3. "I want to protect the people traveling with me, using Jedi defenses when danger catches us in the open."
4. "I want to help a team act with greater coordination when everything depends on a few well-timed decisions."
5. "I want to learn how to stay unseen and shield my companions from detection when we need to move quietly."
6. "I'm not sure yet. I'd like to see which Jedi abilities would actually broaden what I can do in the field."

### Origin: Soldier -> Jedi

**Focus:** Add Jedi offensive discipline, defense, team support, Force control, and nonviolent resolution to a character with Soldier training; do not presume violence is their preferred solution or that they are already proficient with lightsabers.

1. "I want to master lightsaber techniques that give me a different way to face an opponent in close combat."
2. "I want to learn how to turn aside attacks and hold my ground when someone else needs protection."
3. "I want to use the Force to help my allies fight and work together more effectively, not just improve my own performance."
4. "I want to learn how to move or restrain threats through the Force, changing a dangerous situation without relying only on weapons."
5. "I want to develop the judgment and techniques to end a confrontation without fighting when there is another way."
6. "I'm not sure yet. I know what my previous training offers, but I want to understand how Jedi methods could add to it."

### Candidate mechanical references — developer-only (NOT player answer labels or scored ontology tags)

| Origin | Answer 1 | Answer 2 | Answer 3 | Answer 4 | Answer 5 |
|---|---|---|---|---|---|
| Noble | Jedi Consular / Adept Negotiator, Force Persuasion; optional Force power *mind trick* | Lightsaber Combat / Block, Deflect; lightsaber proficiency as applicable | Guardian / Battle Meditation; Consular / Skilled Advisor, Consular's Vitality | **Sense Force talent / Force Perception, Foresight**; Sentinel / Dark Side Sense; Guardian / Force Intuition | **Alter Force talents / Telekinetic Savant, Telekinetic Power**; optional Force powers *move object*, *surge* if Force Training is acquired |
| Scoundrel | Sentinel / Clear Mind -> Force Haze; Unseen Eyes where eligible | Lightsaber Combat / Lightsaber Defense, Weapon Specialization (lightsabers); Guardian / Acrobatic Recovery | Consular / Adept Negotiator, Force Persuasion; power *mind trick* | **Sense Force talent / Foresight, Force Perception**; Lightsaber Combat / Block, Deflect; Guardian / Force Intuition | **Alter Force talents / Telekinetic Power or Savant**; separate Force powers *surge*, *move object* when acquired |
| Scout | **Sense Force talent / Force Perception, Foresight**; Sentinel / Dark Side Sense; Guardian / Force Intuition | Separate Force powers *surge*, *move object* when acquired; Control/Alter Force talent development as appropriate | Lightsaber Combat / Block, Deflect; Guardian / Guardian Strike where eligible | Guardian / Battle Meditation; Consular / Skilled Advisor; optional Improved Battle Meditation | Sentinel / Clear Mind -> Force Haze; Clone Wars / Unseen Eyes |
| Soldier | Lightsaber Combat / Weapon Specialization (lightsabers); Guardian / Exposing Strike | Lightsaber Combat / Block, Deflect, Lightsaber Defense; Guardian / Hold the Line | Guardian / Battle Meditation; Consular / Skilled Advisor or Consular's Vitality | **Alter Force talents / Disciplined Strike, Telekinetic Savant**; separate Force powers *move object*, *Force slam* when acquired | Consular / Adept Negotiator, Master Negotiator; Force Persuasion where eligible |

**Editorial flags:** (0) Jedi class talent trees and Force talent trees are distinct; Force Sensitivity qualifies a character to select Force talents on eligible talent gains *in any heroic class*, without automatically granting a Force power suite. (1) Scoundrel's response 2 and 4 intentionally distinguish *offensive lightsaber technique* from *reactive defense*. (2) Scout's response 1 and 5 distinguish *detecting threats* from *concealing a party*; avoid overbroad shared tag mappings. (3) All Force-dependent references must be gated to the actual actor's Force Sensitivity, training, feat access, and per-feature prerequisites; even a character without any Force access can express *future interest* in them. (4) The precise text/availability of *Force slam*, *Force Haze*, *Unseen Eyes*, and *Hold the Line* must be independently verified before machine-readable certification; these are editorial candidate connections only. (5) Existing class-specific origin variants are conversational context, never proof of a concrete earlier feature.

### Open owner-review questions

1. Are these **five distinct Jedi directions + neutral sixth** suitable for each origin, or should one transition trade a niche response for a wider Force-development direction?
2. In the Scoundrel bank, do offensive and defensive lightsaber paths feel sufficiently differentiated?
3. Should Noble and Scout both have ally-support directions (expressed differently), or should one focus on a more distinctive Jedi option?
4. Should a presently non-Force-Sensitive character see a short educational note on the required route to Force Training and powers, rather than omitting Force-related *aspirations*?
5. Define a deterministic Q1 origin-selection rule for heroes with more than one preexisting class. Do not solve that routing issue by pretending the previous class always equals the first class taken.

**No GitHub operations or production mutations authorized.**

## Change log, continued

- **2026-11-14 — Jedi Q1 origin-sensitive draft:** Added 24 provisional first-person Jedi discovery choices across Noble/Scoundrel/Scout/Soldier origins (five concrete directions plus one neutral per origin). Superseded the older generic Noble -> Jedi example as an active candidate bank while preserving it for history; recorded published rules basis, candidate mechanical connections, requirements/SSOT gates, and open editorial decisions. No commits or pushes.

- **2026-11-14 — Jedi Q1 Force-talent clarification:** Explicitly distinguished four core Force talent trees (Alter/Control/Sense/Dark Side) from Jedi class talent trees and Force powers; added representative Force talent candidates to four origin-aware rows. Confirmed Force Sensitivity authorizes selection of eligible Force talents when the character gains a normal class talent, irrespective of which heroic class granted it; multiclass Jedi starting feat selection and Use the Force / Force Training prerequisites remain independent. All records still provisional. No commits or pushes.

## Draft MC-Q1-SCOUT-ORIGIN-VARIANTS-01 — Scout discovery answers keyed by previous class (2026-11-14)

**Status:** PROPOSED FOR OWNER REVIEW. These are editorial player statements and candidate mechanical connections, **not** locked dialogue, certified tags/IDs, class grants, implemented data, or GitHub changes.

### Design and source basis

- **Destination class:** Scout. **Mentor:** Lead. Use Lead's already-drafted origin-sensitive Q1 spoken introduction. Do not make a claim that Miraj, J0-N1, Ol' Salty, or Breach was personally the character's trainer unless that is established separately.
- **Origin variants:** Jedi, Noble, Scoundrel, Soldier. Each has **five substantive first-person choices plus one neutral undecided choice**: 24 proposed replies. The earlier class-independent Scout Q1 answer concept is superseded for authoring purposes.
- **Primary material consulted:** `Core Rulebook_djvu.txt`, Scout class description, class skills, multiclass rules, starting feats, Scout talent trees (Awareness, Camouflage, Fringer, Survivor); `Clone Wars Campaign Guide_djvu.txt`, Reconnaissance and Surveillance Scout talent trees; `Force Unleashed Campaign Guide_djvu.txt`, Spy Scout talents (Surveillance, Intimate Knowledge, Traceless Tampering) and Reset Initiative; `Knights of the Old Republic Campaign Guide_djvu.txt`, Hyperspace Explorer talents (Guidance, Hyperspace Savant, Vehicle Sneak); `Unknown Regions_djvu.txt`, Master Scout and Mobile Scout talent trees and Camouflage expansion. Text corpus is an editorial search layer; exact printed pages/record IDs and any OCR ambiguity require later source/SSOT certification.
- **Multiclass rules:** The first Scout class level grants **one choice of an eligible Scout starting feat**, not every Scout starting feat; one Scout class talent, subject to prerequisites; expansion of available class skill lists, **not** automatic newly trained skills. Core Scout starting feats include Weapon Proficiency (pistols), Weapon Proficiency (rifles), Weapon Proficiency (simple weapons), and Shake It Off (its prerequisites include Constitution 13 and trained Endurance). Standard class features apply as appropriate, and class defense bonuses do not stack. Later Scout class bonus feats are selected only at qualifying Scout class levels and within eligibility.
- **Scoring boundary:** The *prior class* guides presentation, not proof of any prior talent, feat, trained skill, behavior, or Mentor relationship. Q2 examines the entire actual multiclass build. Merely viewing an answer scores nothing; choosing the neutral answer scores **no specialization intent and no negative inference**. Selection describes desired future training only, not a presently owned Scout ability.

### Origin: Jedi -> Scout

**Editorial focus:** Add ordinary observation, non-Force-dependent field methods, evasion, piloting/navigation, and practical team reconnaissance to a Jedi's existing training without assuming that they actually possess Force Sensitivity, lightsaber proficiency, or Force powers.

1. "I want to become better at noticing tracks, hidden dangers, and ordinary clues that can tell me what is happening around us."
2. "I want to learn how to move quietly and keep our approach concealed when attracting attention would put people at risk."
3. "I want to cross hazardous ground and survive attacks or difficult conditions when avoiding danger is better than confronting it."
4. "I want to learn how to navigate unfamiliar routes and handle vehicles when the safe way forward isn't obvious."
5. "I want to scout ahead and turn what I discover into useful warnings and better opportunities for my companions."
6. "I'm not sure yet. I'd like to learn what practical Scout training can add to the abilities I've already developed."

### Origin: Noble -> Scout

**Editorial focus:** Firsthand information instead of relying entirely on reports; discreet investigation; physical independence; mobility/navigation; turning field intelligence into effective coordinated decisions. Do not presume the Noble character is wealthy, an aristocrat, or a practiced diplomat.

1. "I want to gather information firsthand, recognizing clues and following trails instead of always depending on someone else's report."
2. "I want to move discreetly and investigate places where a public approach or a formal introduction would attract attention."
3. "I want to learn how to survive and keep moving in difficult environments without always needing someone else to guide or protect me."
4. "I want to understand routes, vehicles, and unfamiliar territory well enough to plan and undertake journeys myself."
5. "I want to bring back the right intelligence at the right moment so my companions can make better decisions together."
6. "I'm not sure yet. I want to discover which field skills would give me capabilities I don't already have."

### Origin: Scoundrel -> Scout

**Editorial focus:** Careful detection versus improvisation, reliable concealment, escaping harsh environments, low-signature vehicle operation, and reconnaissance that benefits allies. Do not presume criminality, dishonesty, or use of a blaster.

1. "I want to spot hidden watchers and follow someone's trail even when they're trying hard not to be found."
2. "I want to slip through watched areas without being noticed, even when I can't afford to stay still."
3. "I want to keep my footing, avoid hazards, and get out alive when a quick escape becomes dangerous."
4. "I want to learn how to navigate unfamiliar space and approach in a vehicle without giving away our position."
5. "I want to study a target carefully and share what I learn so my companions can act at the right moment."
6. "I'm not sure yet. I know how useful improvisation can be, but I'd like to explore what more deliberate Scout training offers."

### Origin: Soldier -> Scout

**Editorial focus:** Advance warning, concealed approaches, battlefield survival/mobility, field repair/technical improvisation, and reconnaissance that improves allies' tactical decisions. Do not presume the Soldier is reckless, combat-only, or necessarily a squad commander.

1. "I want to learn how to spot approaching enemies and recognize danger early enough to keep my companions out of an ambush."
2. "I want to approach a dangerous position without being seen, so we can choose when and how to act."
3. "I want to move across hazardous ground and survive area attacks instead of relying only on standing my ground."
4. "I want to learn how to make practical repairs and keep essential equipment working when we're far from support."
5. "I want to gather battlefield intelligence that helps my allies identify threats and coordinate their actions."
6. "I'm not sure yet. I want to see how Scout methods could expand what I contribute beyond my current training."

### Candidate mechanical connections — developer-only, not ontology certification

| Origin | Answer 1 | Answer 2 | Answer 3 | Answer 4 | Answer 5 |
|---|---|---|---|---|---|
| Jedi | Awareness / Acute Senses, Expert Tracker; Perception and Survival development | Camouflage / Improved Stealth, Hidden Movement | Survivor / Evasion, Surefooted, Sprint; Fringer / Long Stride | Scout class-skill access / Pilot, Survival; Hyperspace Explorer / Hyperspace Savant, Guidance if prerequisites met | Clone Wars Surveillance / Spotter, Reconnaissance / Reconnaissance Team Leader, Reconnaissance Actions |
| Noble | Awareness / Acute Senses, Expert Tracker | Camouflage / Improved Stealth, Hidden Movement; Spy / Blend In if eligible | Survivor / Surefooted, Evasion; Fringer / Long Stride | Hyperspace Explorer / Hyperspace Savant, Guidance; Pilot, Survival training if later legally obtained | Clone Wars Surveillance / Spotter; Spy / Surveillance; Reconnaissance / Reconnaissance Team Leader |
| Scoundrel | Awareness / Acute Senses, Expert Tracker; Surveillance / Hidden Eyes | Camouflage / Improved Stealth, Hidden Movement, Total Concealment | Survivor / Evasion, Sprint, Surefooted; Fringer / Long Stride | Hyperspace Explorer / Vehicle Sneak, Hyperspace Savant (trained Pilot prerequisite) | Spy / Surveillance; Clone Wars Surveillance / Spotter, Advanced Intel when eligible |
| Soldier | Awareness / Acute Senses, Expert Tracker; Surveillance / Hunt the Hunter when eligible | Camouflage / Improved Stealth, Hidden Movement; Unknown Regions / Extended Ambush when eligible | Survivor / Evasion, Surefooted, Sprint; Fringer / Long Stride | Fringer / Jury-Rigger; Master Scout / Tripwire, Quicktrap when prerequisites satisfied; trained Mechanics where needed | Clone Wars Surveillance / Spotter, Advanced Intel; Reconnaissance / Reconnaissance Team Leader, Reconnaissance Actions |

**Review-critical rules/interpretation flags:**

1. The descriptions are aspirations only, not proof that the character has chosen any relevant talent or skill. Scout class-skill access is not a grant of training; talent prerequisites must be checked against the character's actual build.
2. Some of these are **distinct talent trees** (e.g., Spy and Clone Wars Surveillance) with similarly themed but not identical talents; maintain precise book, tree, talent, and repository identities during certification.
3. Reconnaissance Team Leader is a follower-based talent; a response about helping allies should **not** be mechanically represented as granting followers or a team-wide bonus without the requisite selection and legal circumstances.
4. `Vehicle Sneak`, `Hyperspace Savant`, `Expert Tracker`, `Spotter`, `Evasion`, `Jury-Rigger`, and `Quicktrap` have distinct actual effects. Source-check and then map them to the intended capability, not a vague generic `scout` tag.
5. Proposed connections must be checked against exact printed prerequisites, source-page authority, item/feat/talent identifiers, current V2 schemas, and the frozen 190-tag ontology before machine-readable implementation.
6. **Do not equate the most recently acquired class with original class or first Mentor** for characters who already have more than one pre-existing class. Origin routing remains an explicit design decision.

### Open questions for owner review

1. Do the Jedi and Noble versions offer enough difference, or should one lean more heavily into a distinct Scout path such as technical exploration or intelligence operations?
2. Does Soldier's answer 4 (field repairs) feel more interesting than a dedicated Scout path for tracking, marksmanship, or vehicle operation?
3. Is the Scoundrel navigation/vehicle-concealment direction broad enough to be useful to characters who do not pilot ships?
4. Should the standard presentation include a short educational rail identifying *actual current* options versus *future* talent-tree possibilities, while keeping selected answers strictly first person?

**No GitHub operations, runtime edits, or production data changes authorized.**

## Change log, continued

- **2026-11-14 — Scout Q1 origin-sensitive draft:** Added 24 first-person Scout discovery answers across Jedi/Noble/Scoundrel/Soldier origins, each with five development directions and one neutral answer. Documented Core and supplemental Scout trees, multiclass prerequisites and other boundaries, candidate mechanical links, and editorial review questions. Local document only; no commits or pushes.

---

## Draft MC-Q1-SOLDIER-ORIGIN-VARIANTS-01 — Soldier class discovery answers keyed by previous class (2026-11-14)

**Status:** PROPOSED FOR OWNER REVIEW. These answers are not approved, ontology-mapped, individually source-certified, implemented, or committed.

**Destination class and Mentor:** Soldier / Breach. The earlier authored origin-specific Breach Q1 introductions continue to precede these selectable first-person replies. The standard prior-class version is used unless there is recorded evidence that the earlier Mentor was personally involved. These answer banks are selected by the prior-class routing rule (still an open design decision in three-or-more-class builds), not by invented prior behavior.

### Soldier source context for the first editorial pass

- **Core Soldier talent trees:** Armor Specialist (e.g., Armored Defense, Improved Armored Defense, Juggernaut), Brawler (Expert Grappler, Gun Club, Melee Smash), Commando (Battle Analysis, Cover Fire, Draw Fire, Harm's Way, Demolitionist, Indomitable), and Weapon Specialist (Devastating Attack, Penetrating Attack, Weapon Specialization). They span protection, close combat, tactical support, explosives, condition resilience and focused offensive training.
- **Further printed Soldier options:** *The Clone Wars Campaign Guide* adds Trooper (Comrades in Arms, Focused Targeting, Watch Your Back) and Squad Leader (Commanding Officer, Squad Actions), plus expansions to Brawler and Commando. *Galaxy at War* adds Shockboxer and Veteran (including Battlefield Remedy, requiring trained Treat Injury), plus Commando and Weapon Specialist expansions. *The Force Unleashed Campaign Guide* adds Mercenary. *Knights of the Old Republic Campaign Guide* adds Rocket Jumper and expands core Soldier trees. *The Rebellion Era Campaign Guide* adds Ambusher; *Legacy Era Campaign Guide* adds Brute Squad; *The Unknown Regions* adds Warrior and expands Commando. Named examples here are candidate references, not a claim every character meets their prerequisites.
- **Class features and multiclass boundary:** The first Soldier level adds +1 base attack bonus, a d10 hit die (not first-character-level maximized/tripled HP), the applicable nonstacking class defense bonus, and a Soldier class talent. Entering Soldier grants a choice of **one** Soldier starting feat, rather than all starting feats. Core Soldier starting options include Armor Proficiency (light), Armor Proficiency (medium), and Weapon Proficiency (pistols, rifles, simple weapons), subject to the exact multiclass rules. Soldier class-skill access expands, but **no automatically trained new skill** is granted by multiclassing. Soldier class bonus feats arrive at even **Soldier class levels**, not every even character level. Talents and feats require their individual prerequisites and legal selection circumstances.
- **Force-sensitive Soldier exception:** If the character actually possesses Force Sensitivity, a talent gained from a Soldier level may instead be selected from eligible Force talent trees under the normal multiclass talent rules. Do not assume every character with a Jedi level possesses Force Sensitivity, Use the Force training, Force powers, or lightsaber proficiency; nor does becoming a Soldier independently confer those abilities. The Soldier Q1 choices below emphasize Soldier's added disciplines rather than silently rerouting a Force-sensitive player's development into unrelated Force talents.
- **Evidence rules:** All replies represent *aspirations*, not already-owned feats, talents, equipment, training, or career changes. Selecting the undecided option records no Soldier specialization intent and no negative inference. Mere viewing and pagination score nothing. Q2 integrates the entire observed build and explicitly stated ambitions; Q1 only compares the destination Soldier class with the selected prior-class context.

### Origin: Jedi -> Soldier

**Editorial focus:** Practical weapon options, armor/endurance, unarmed or close-quarters technique, protective combat support, and battlefield coordination; do not assume the character owns a lightsaber or Force abilities.

1. "I want to become more capable with ordinary weapons and ranged tactics, so I can protect people even when getting close would be dangerous."
2. "I want to learn to fight in armor and endure a sustained attack while keeping others safe."
3. "I want to develop close-quarters techniques for grappling and fighting when I can't count on a particular weapon."
4. "I want to learn how to cover my companions and draw danger away from them when they're vulnerable."
5. "I want to read a battlefield and coordinate people under pressure, rather than focusing only on the threat directly in front of me."
6. "I'm not sure yet. I want to understand which Soldier techniques would add something useful to the training I've already undertaken."

### Origin: Noble -> Soldier

**Editorial focus:** Personal defense, sustained resilience, decisive weapon specialization, battlefield team coordination, and direct protection of others; do not assume diplomacy, wealth, command rank, or bodyguards.

1. "I want to learn how to defend myself and others with weapons when planning or negotiation isn't enough."
2. "I want to learn how to stay on my feet under fire, using armor and endurance instead of depending on someone else to protect me."
3. "I want to become more accurate and disciplined with a chosen weapon, so that when I must fight, every action counts."
4. "I want to turn organizing people into effective battlefield teamwork, helping a group act together when a plan begins to fall apart."
5. "I want to learn how to step between danger and someone vulnerable, protecting them directly rather than only arranging help from a distance."
6. "I'm not sure yet. I'd like to see what Soldier training can offer beyond the skills I've developed so far."

### Origin: Scoundrel -> Soldier

**Editorial focus:** Dependable firepower without relying on surprise, close combat when cornered, armored staying power, covering/suppressive support, and battlefield demolitions; do not presume crime, deception, a gun, or a particular heist history.

1. "I want to become a reliable shot in a straight fight, not just when I've managed to find an advantage first."
2. "I want to learn how to handle myself in a close fight, so being cornered doesn't mean I've run out of options."
3. "I want armor and disciplined training that help me stay in the fight when there isn't a clean way out."
4. "I want to learn to keep enemies pinned down and cover my companions while they move to safety."
5. "I want to learn to handle explosives and break through obstacles when clever workarounds aren't enough."
6. "I'm not sure yet. I've always valued having options, and I want to see which Soldier skills are worth adding."

### Origin: Scout -> Soldier

**Editorial focus:** Precision after spotting threats, deliberate ambush tactics, team covering fire, armored resilience when withdrawal fails, and treatment of battlefield injuries. Do not presume a trained skill, weapon, or history of ambushes.

1. "I want to become a better marksman, able to stop a threat once I've identified it rather than only warn others that it's there."
2. "I want to learn how to set up an effective ambush and use the first moments of a fight to give my companions the advantage."
3. "I want to provide covering fire and help my team move together when staying hidden is no longer possible."
4. "I want to learn to survive an exchange I can't evade, relying on armor and endurance when retreat isn't an option."
5. "I want to learn how to care for wounded companions in a fight and help them recover enough to keep going."
6. "I'm not sure yet. I'd like to explore what Soldier training can add once reconnaissance is over and the situation turns dangerous."

### Candidate mechanical mappings — developer-only; not certified 190-tag ontology IDs

| Origin | Chosen answer | Printed mechanical direction to verify | Certification cautions |
|---|---|---|---|
| Jedi | 1 | Soldier starting weapon proficiency choice; Weapon Specialist; permitted ranged-combat feats | Actual owned proficiencies and prerequisites vary; no auto-grant of multiple proficiencies. |
| Jedi | 2 | Armor Specialist / Armored Defense, Improved Armored Defense, Juggernaut | Armor proficiency, prerequisite chain, and present equipment must be checked. |
| Jedi | 3 | Brawler / Expert Grappler, Melee Smash, Gun Club; Shockboxer if eligible | Avoid implying disarm/grapple feat benefits not owned. |
| Jedi | 4 | Commando / Cover Fire, Draw Fire, Harm's Way; Trooper / Phalanx | Harm's Way has trained Initiative prerequisite; each protection method has distinct effect. |
| Jedi | 5 | Commando / Battle Analysis; Trooper / Comrades in Arms, Focused Targeting; Squad Leader | Squad Leader's Commanding Officer creates a follower only on actual legal selection; do not imply it is granted. |
| Noble | 1 | Soldier starting weapon proficiency choice; broad Soldier class weapon/attack support | Does not mean the character is unable to fight now. |
| Noble | 2 | Armor Specialist / Armored Defense, Second Skin; Commando / Indomitable | Armor and condition-track options are not interchangeable. |
| Noble | 3 | Weapon Specialist / Weapon Specialization, Penetrating Attack, Devastating Attack; Weapon Focus feat | Verify specific weapon proficiency and Weapon Focus prerequisites. |
| Noble | 4 | Trooper / Comrades in Arms and Focused Targeting; Squad Leader / Commanding Officer | Team tactics do not automatically mean the character owns or commands followers. |
| Noble | 5 | Commando / Harm's Way, Draw Fire, Cover Fire | Distinguish direct substitution of harm, drawing fire and conditional cover bonuses. |
| Scoundrel | 1 | Weapon Specialist / Weapon Specialization; Soldier ranged bonus-feat choices | No assumed current blaster proficiency or prior reliance on surprise. |
| Scoundrel | 2 | Brawler / Melee Smash, Expert Grappler; Warrior / Warrior's Determination | Distinguish grappling, melee damage and defensive effects. |
| Scoundrel | 3 | Armor Specialist / Armored Defense, Juggernaut; Veteran / Tested in Battle | Veteran talents have prerequisite chains; armor benefits require proficiency. |
| Scoundrel | 4 | Commando / Cover Fire, Battle Analysis; Clone Wars / Keep Them at Bay; Weapon Specialist / Improved Suppression Fire | Suppression, protective ranged fire and enemy attack penalties are different mechanics. |
| Scoundrel | 5 | Commando / Demolitionist; Soldier's Mechanics class skill and relevant equipment | Mechanics training is not automatically granted; explosives need actual legal use. |
| Scout | 1 | Weapon Specialist / Weapon Specialization, Penetrating Attack; weapon-specific bonus feats | No inference that Scout already is an expert sniper or holds Weapon Focus. |
| Scout | 2 | Rebellion Era / Ambusher / Ambush Specialist, Spring the Trap | Ambusher effects have specific surprise/initiative conditions and prerequisites. |
| Scout | 3 | Commando / Cover Fire, Battle Analysis; Trooper / Watch Your Back, Comrades in Arms | Team protection differs by proximity and circumstances. |
| Scout | 4 | Armor Specialist / Armored Defense, Improved Armored Defense; Commando / Indomitable | Heavy armor proficiency is not a free first-level Soldier starting feat. |
| Scout | 5 | Galaxy at War / Veteran / Battlefield Remedy; Treat Injury skill | Battlefield Remedy requires trained Treat Injury, not merely class-skill access. |

### Review issues before owner approval

1. **Jedi overlap:** Does Jedi answer 3 (close-quarters) provide an attractive non-lightsaber choice, or would an explicit explosives or mobile-armor direction offer more contrast?
2. **Noble overlap:** Noble answers 1 and 3 both involve weapons; 1 is broad direct self-defense, 3 emphasizes deliberate specialization. Verify they remain distinct in the player-facing learning rail.
3. **Scoundrel bridge:** The demolition answer should remain appealing even to a Scoundrel who has never been dishonest or involved in illegal work.
4. **Scout versatility:** Battlefield medical support is deliberately included to distinguish Soldier from just a more heavily armed Scout; confirm it is preferable to an armored-mobile or technical breach direction.
5. **Routing:** For pre-existing multi-foundation-class builds, prior-class selection cannot be taken from an arbitrary class-list position; Q2 must still consider the entire build. Previous Mentor-specific Q1 intro variations require confirmed Mentor history, not just a class label.
6. **Source/SSOT gate:** Before production, verify candidate talent-to-effect alignment, printed prerequisites and page references, canonical repository IDs, selection availability, and frozen 190-tag ontology mappings for all 20 substantive responses. No automatic mechanical grants or hidden scoring for the undecided option.

**Working-count checkpoint:** Noble 24, Jedi 24, Scout 24, Soldier 24 = **96 proposed origin-sensitive Q1 replies**, including 16 neutral responses; Scoundrel is the remaining foundation destination (24 additional responses anticipated). No code changes, commits, pushes, or PRs.

## Change log, continued

- **2026-11-14 — Soldier Q1 origin-sensitive draft:** Used Core Soldier and multiclass rules plus Soldier talent-tree expansions from Clone Wars, Galaxy at War, Force Unleashed, Knights of the Old Republic, Rebellion Era, Legacy Era, and Unknown Regions to draft 24 first-person Soldier discovery responses across Jedi/Noble/Scoundrel/Scout origins, including one neutral response per origin. Added provisional mechanical mappings, prerequisites, editorial review questions and explicit rules/identity boundaries. Local file only; no GitHub commit or push.

## Draft MC-Q1-SCOUNDREL-ORIGIN-VARIANTS-01 — Scoundrel class discovery answers keyed by previous class (2026-11-14)

**Status:** PROPOSED FOR OWNER REVIEW. This completes the **editorial first-draft coverage** of the 20 ordered transitions among the five foundation classes. It is **not** owner approval, full source/ID/prerequisite certification, ontology mapping, a tested implementation, or permission to commit.

**Destination class and Mentor:** Scoundrel / Ol' Salty. The previously drafted Scoundrel-destination Mentor introduction must be selected according to the previous class, with a personalized previous-Mentor variant only when that relationship is actually established. The Q1 bank below is selected for class context, not a presumption about a character's behavior or morality. All spoken choices are first person. The sixth option is neutral and records no development preference.

### Scoundrel published mechanics — editorial source review

- **Core Scoundrel class:** Talent at Scoundrel class level 1 and subsequent odd Scoundrel levels. Core talent trees are **Fortune** (e.g., Fool's Luck, Knack, Lucky Shot), **Misfortune** (e.g., Dastardly Strike, Disruptive, Skirmisher, Sneak Attack, Walk the Line), **Slicer** (e.g., Gimmick, Master Slicer, Trace), and **Spacer** (e.g., Spacehound, Hyperdriven, Starship Raider). Core class skills include Acrobatics, Deception, Gather Information, Initiative, Knowledge, Mechanics, Perception, Persuasion, Pilot, Stealth, and Use Computer. These are available class-skill categories, not automatic training.
- **Published expansions consulted:** *The Force Unleashed Campaign Guide* adds **Smuggling** (Art of Concealment, Fast Talker, Hidden Weapons, Illicit Dealings, Surprise Strike) and additional Slicer options (Electronic Forgery, Electronic Sabotage, Security Slicer). *Knights of the Old Republic Campaign Guide* adds **Run and Gun** (Opportunistic Strike, No Escape, Slippery Strike, etc.) and expands Fortune. *The Clone Wars Campaign Guide* adds **Opportunist**, including Advantageous Opening and Retribution, plus Misfortune additions. *Galaxy of Intrigue* includes **Revolutionary**, for clandestine/sabotage-oriented paths; these are merely additional possible directions, not an assumed political affiliation. *The Unknown Regions* expands Spacer with Deep Space Raider. Printed prerequisites, actual accessible trees, exact effects and repository IDs must be individually certified prior to production.
- **New-class boundary:** Taking first Scoundrel level by multiclass grants a Scoundrel talent and **one chosen Scoundrel starting feat** under the normal multiclass rule, not all Scoundrel starting feats. Core starting feats: Point Blank Shot, Weapon Proficiency (pistols), Weapon Proficiency (simple weapons). A character receives the normal new class level effects, not first-character-level triple hit points. Scoundrel's class bonus feats arrive at even **Scoundrel class levels**; none is awarded merely for taking Scoundrel 1. Entry does not automatically train a Scoundrel class skill or guarantee a feat/talent prerequisite.
- **Design distinction:** Smuggling/Deception/Slicer options may support heroic covert work, criminal work, trade, intelligence, or survival. The first-person responses should not assign criminal history, dishonesty, a weapon or spacecraft, or specific skill training the character has never selected. Q1 is aspiration, not current ownership. If Force Sensitivity is actually possessed, the broader legal Force-talent option remains subject to the authoritative talent-selection rules; this bank does not assume it or rewrite Jedi identity.

### Origin: Jedi -> Scoundrel

**Editorial emphasis:** Quiet/non-Force misdirection, computer/security techniques, mobile opportunistic methods, spacefaring, and broadly applicable improvisation. Do not assume the character has Force powers, a lightsaber, or a particular Jedi code.

1. "I want to learn how to pass unnoticed and misdirect attention when a quiet approach would work better than confronting someone directly."
2. "I want to understand computers and electronic security well enough to uncover information and get past systems that would otherwise stop me."
3. "I want to move unpredictably in a fight, take advantage of an opening, and get clear before an enemy can pin me down."
4. "I want to become more capable aboard a ship, especially when the situation changes quickly or the crew needs someone who can improvise."
5. "I want to get better at making the most of uncertain situations, finding a useful second chance when my first attempt doesn't work."
6. "I'm not sure yet. I want to explore the practical tricks Scoundrel training offers before deciding what fits me."

### Origin: Noble -> Scoundrel

**Editorial emphasis:** Discreet entry and deceptive appearances, technical bypasses, self-directed survival in fast fights, unorthodox deals and information gathering, and hands-on spacefaring. Avoid assuming political status, prior diplomacy, a criminal motive, or existing wealth.

1. "I want to learn how to blend in and maintain a convincing cover when introducing myself openly would close doors."
2. "I want to bypass digital obstacles and uncover information for myself, instead of relying on someone else to access it."
3. "I want to learn to stay mobile and exploit openings when a situation turns into a fight I didn't plan for."
4. "I want to find information, contacts, and workable deals outside the usual channels when the formal approach gets me nowhere."
5. "I want to take a more active role in navigating ships and getting a crew through trouble rather than relying entirely on someone else at the controls."
6. "I'm not sure yet. I'd like to see how these practical Scoundrel skills might broaden what I can do."

### Origin: Scout -> Scoundrel

**Editorial emphasis:** Social concealment in addition to physical stealth, electronic infiltration, exploitation of combat openings, spacecraft operations, and Fortune-style improvisation. Do not assume the Scout is a wilderness tracker or already trained in Stealth/Pilot.

1. "I want to learn how to talk my way past suspicion and maintain a convincing story when simply staying hidden isn't an option."
2. "I want to learn to defeat computer locks and electronic security when the safest route is blocked by technology instead of terrain."
3. "I want to turn movement and positioning into a tactical advantage, striking when an opponent leaves an opening."
4. "I want to expand my ability to operate aboard starships, handling unfamiliar conditions and acting when a voyage turns dangerous."
5. "I want to improve my knack for adapting when a plan fails, finding another chance to make a difficult action succeed."
6. "I'm not sure yet. I want to see which Scoundrel methods would add something new to what I already know."

### Origin: Soldier -> Scoundrel

**Editorial emphasis:** Disruption/opportunism rather than additional heavy combat, evasive mobile attacks, slicing/technical access, social de-escalation and misdirection, and spacefaring versatility. No claim that the character is already armed, violent or a veteran of any specific war.

1. "I want to learn how to unsettle an opponent and exploit a mistake, rather than depending on who can hit harder."
2. "I want to stay quick and difficult to pin down, choosing when to strike and when to get clear."
3. "I want to understand computers and security systems so that a locked door or electronic defense doesn't always require force."
4. "I want to become better at bluffing, bargaining, and changing someone's mind when I can avoid a fight altogether."
5. "I want to broaden my abilities aboard ships, including handling weapons and other problems in unfamiliar conditions."
6. "I'm not sure yet. I'd like to learn what a Scoundrel's methods can contribute alongside my existing training."

### Provisional mechanical relationships — internal only; NOT player-visible or certified ontology IDs

| Origin | Answer | Candidate printed talent / capability direction | Rules and evidence caveat |
|---|---:|---|---|
| Jedi | 1 | Deception, Stealth, Smuggling: Art of Concealment; Fast Talker | Skills not automatically trained; deception does not require a dishonest character identity. |
| Jedi | 2 | Slicer: Gimmick, Master Slicer; Electronic Sabotage / Security Slicer | Verify individual trained-skill prerequisites and actual effect distinctions. |
| Jedi | 3 | Misfortune: Skirmisher, Dastardly Strike; Run and Gun: Slippery Strike | Skirmisher movement trigger and denied-Dexterity conditions are distinct. |
| Jedi | 4 | Spacer: Spacehound, Hyperdriven, Starship Raider | Spacehound does not grant all Pilot benefits; starship-specific effect limits apply. |
| Jedi | 5 | Fortune: Knack, Fool's Luck, Lucky Shot | Knack and Lucky Shot are limited-use; Fool's Luck has a Force Point cost. |
| Noble | 1 | Deception; Smuggling: Art of Concealment, Fast Talker | Cover identity and item concealment are different mechanics. |
| Noble | 2 | Use Computer / Mechanics; Slicer tree | Existing skill training and talent prerequisites must be checked. |
| Noble | 3 | Misfortune: Skirmisher; Run and Gun: Opportunistic Strike | Opportunistic Strike has a specific attack-of-opportunity trigger. |
| Noble | 4 | Gather Information, Persuasion; Smuggling: Illicit Dealings | Illicit Dealings has a specific restricted-goods haggling effect; not universal contacts or free wealth. |
| Noble | 5 | Pilot; Spacer: Spacehound, Hyperdriven | Pilot training is not granted by multiclassing. |
| Scout | 1 | Deception; Smuggling: Fast Talker, Art of Concealment | Distinct from a general grant of Stealth; prerequisites for later talents apply. |
| Scout | 2 | Slicer: Gimmick, Security Slicer, Electronic Sabotage | Electronic security interactions have differing skill requirements. |
| Scout | 3 | Misfortune: Skirmisher, Dastardly Strike; Run and Gun: Opportunistic Strike | Positioning, flat-footed attacks and opportunity attacks are separate rules. |
| Scout | 4 | Spacer: Spacehound, Starship Raider; Deep Space Raider (later path) | Deep Space Raider requires other Spacer talents and is not a level-one grant. |
| Scout | 5 | Fortune: Knack, Fool's Luck | Force Point spending is not a free or guaranteed reroll. |
| Soldier | 1 | Misfortune: Disruptive, Dastardly Strike, Walk the Line; Opportunist: Advantageous Opening | Suppression of bonuses, condition steps, defense penalties, and extra attacks are not interchangeable. |
| Soldier | 2 | Misfortune: Skirmisher; Run and Gun: Slippery Strike / No Escape | Check legal prerequisites and per-encounter limits. |
| Soldier | 3 | Slicer: Gimmick, Master Slicer, Security Slicer | A trained skill may be required; no automatic electronic bypass on entering class. |
| Soldier | 4 | Deception / Persuasion; Smuggling: Fast Talker, Illicit Dealings | Bluffing and negotiations are distinct skill uses; avoid implying guaranteed persuasion. |
| Soldier | 5 | Spacer: Spacehound, Starship Raider, Hyperdriven | Starship weapons proficiency via Spacehound is specifically situational. |

### Q1 coverage checkpoint — complete editorial first drafts, not certified production

| Destination class | Previous class variants | Choices per variant | Total proposed choices | Neutral options |
|---|---:|---:|---:|---:|
| Noble | 4 | 6 | 24 | 4 |
| Jedi | 4 | 6 | 24 | 4 |
| Scout | 4 | 6 | 24 | 4 |
| Soldier | 4 | 6 | 24 | 4 |
| Scoundrel | 4 | 6 | 24 | 4 |
| **Total** | **20 ordered transitions** | **6** | **120** | **20** |

**Result:** 100 substantive developmental choices, 20 neutral options. The 20 neutral options must carry **no** positive or negative tag, class-route, specialization, ambition, identity, or mechanical grant. Browsing / reading answer choices also has no scoring effect. Only committed, completed responses become survey intent evidence.

### Outstanding approval and implementation gates

1. **Owner line review:** The Scoundrel 24 responses and the prior Noble/Jedi/Scout/Soldier drafts all remain proposed until explicitly approved; no claim of 120 certified or implemented responses.
2. **Mechanical certification:** For every one of the 100 substantive answer IDs (IDs to be assigned), validate actual printed feat/talent/feature associations, prerequisite chains, class-talent availability, page numbers, V2 canonical registry references, and special/first-level multiclass selections. Treat unavailable future paths as aspirations, not current choices.
3. **Canonical ontology:** Map each scored response to zero or more **existing** frozen 190-tag ontology IDs only after explicit review; no prose-derived invented tags or shadow registry. A neutral response has empty mapping.
4. **Origin routing:** Define how a prior class is selected for characters already possessing multiple foundation classes; avoid assuming most-recent class automatically determines the character's identity. Always use the full existing build for Q2; separately verify personalized Mentor-history flags.
5. **Talent asymmetry:** A Scoundrel's choices are not restricted to four core trees; expansions include Smuggling, Run and Gun, Opportunist, Revolutionary, and others. The five-choice survey is a curated introduction, not an exhaustive talent browser; future mechanics discovery must not be hidden merely because it was absent from Q1.
6. **Player-facing presentation:** Retain five meaningful first-person choices plus one neutral per context; preserve Ol' Salty's distinct introductory dialogue, with no class-label or internal routing metadata exposed. Do not imply that all character Scoundrels are smugglers, criminals or pirates.
7. **Cross-coverage tests:** Validate all 20 ordered first-entry class transitions, repeated base-class levels (which should not trigger a first-entry survey), late multiclassing, multi-class origin ambiguity, back navigation, retakes, and meaningful no-answer/undecided behavior.

## Change log, continued

- **2026-11-14 — Scoundrel Q1 completed editorial bank:** Consulted Core Rulebook class, starting feats, multiclassing and Fortune/Misfortune/Slicer/Spacer material; cross-checked Smuggling and Slicer expansions in Force Unleashed, Run and Gun in KOTOR, Opportunist in Clone Wars, Revolutionary in Galaxy of Intrigue, and Spacer expansion in Unknown Regions. Authored four origin-conditioned Scoundrel banks (24 first-person options, four neutral); provisional developer-only mechanical mapping and outstanding certification notes. This completes all **120 proposed Q1 utterances across 20 ordered base-class transitions**, not owner approval or production readiness. Local rolling Markdown only; **no GitHub commit, push, PR, or code edit**.

---

## Draft MC-Q2-BUILD-INTEGRATION-01 — Evidence-aware integration responses (2026-11-14)

**Status:** PROPOSED FOR OWNER REVIEW. Q2 answer-selection policy and example player speech only; not approved, canonical-ID certified, ontology mapped, implemented, committed, or pushed. Fixed Mentor Q2 introductions for all five destination classes are already included earlier in this same rolling document; do not replace them with contextual Mentor narration.

### Source authority and reason for a different Q2 design

The source rolling multiclass/prestige design v0.9 section 6.1-6.2 defines Q2 as *Build Integration*: compare the added foundation-class discipline against **the entire existing build**, the explicitly selected L1 parent career, and the L1 Q5 longer-term ambition. The destination Mentor's opening is fixed; the question/first-person responses may be populated from verified character evidence. The owner has separately approved a context-aware origin-conditioned Q1 answer bank. **Do not mechanically duplicate Q1's 20 origin -> destination banks for Q2:** prior class is only a clue to possible capability, while actual chosen feats/talents/skills, all other classes, career, and long-term ambition provide the authoritative Q2 context. This proposal does not settle how Q1 chooses a single previous-class framing lens when a character already owns multiple classes.

**Proposed shared player-facing question (UI, not Mentor speech):** "How do you want this new training to fit with what you already know and what you hope to accomplish?"

**Proposed UI count:** Five substantive **first-person character statements** chosen from a validated, context-dependent candidate pool plus one first-person neutral/undecided statement. Five is a draft to match the Q1 UX, not a v0.9-approved requirement. Do not fill with empty, false, or redundant statements simply to reach five; if only a smaller number can be grounded, show fewer real alternatives rather than fabricate a history or goal. The neutral choice produces no tag, mechanical, career, path, or negative evidence.

### What Q2 determines (and what it does not)

- Q1: "What new capability interests me?" — development direction, destination class.
- **Q2: "Why and how would that capability fit the build and career I already have?"** — synergy/purpose, contribution to the team, continuity with explicitly stated ambitions, and possible exploratory redirection.
- Q3: "How deeply will I invest?" — Dip/Dive/Swim/Undecided; Q2 does not infer numeric class levels.
- Q4: "What would I actually do?" — one applied scenario, not repeated by Q2.
- Q5: "What will I work toward next?" — concrete legal/feasible milestone; Q2 does not set a required schedule.
- Q6: "Does the Mentor understand my current direction?" — evidence-grounded reflection and scoped identity recalibration, not a review of Q2 answers alone.

**Candidate purpose channels (developer-only editorial labels, NOT a new canonical ontology):**

| Purpose (not player-visible) | Evidence needed to show a personalized statement | What the selected answer communicates |
|---|---|---|
| Reinforce | An actually owned, relevant prior feat/talent/trained skill/ability/class investment and a distinct new capability that enhances its use | "I want new training to make something I already do more effective." |
| Complement | An actually owned prior approach plus a different new-class approach that works alongside it | "I want another way to handle the same sorts of challenges." |
| Cover a gap | Real, actor-observable unmet capability or a character-affirmed weakness; *do not assert absence just because diagnostic capture is incomplete* | "I want tools for situations my present training does not address well." |
| Team contribution | Character's actual established role when available, or hypothetical future group contribution without claiming an old role | "I want my new discipline to help the people around me." |
| Continue an existing ambition / Bridge | Actual recorded L1 chosen career/Q5 ambition or later explicitly declared target, kept separate from present identity; any future class/prerequisite context must be independently verified | "I still want my established destination, and this is another means of pursuing it." Bridge is *route purpose*, not a class-depth or automatic prestige identity. |
| Explore a change in direction | Player affirmatively expresses exploration or reconsideration; do not fabricate a previous declared goal | "I may want a different emphasis or career; I want to investigate that possibility." **Not** an automatic replacement of the current declared goal. |
| Undecided | Always available | No preference, no rejection, no evidence of a Dip or Pivot. |

**Selection notes:** Construct a richer pool than the five displayed options. Rank for *distinct* functions with evidence-supported specificity (actual owned mechanic and stated ambition > class stereotype); give the user meaningful alternatives beyond simply repeating Q1's skill/talent interests. Where a career or objective is absent, replace goal-specific candidates with non-invented options, not a fictional declaration. Where a path is merely a future goal and prerequisite evidence is incomplete, say "work toward" and leave legality to canonical authorities. At least one answer should allow genuine expansion rather than force a return to the old class. A potential pivot is not a confirmed career rewrite.

**Evidence read contract (design only):** Pre-advancement **finalized** actor class levels, selected feat and talent IDs and their verified trees, trained skills, class features, other relevant owned equipment/abilities, selected L1 Q2 career target, selected L1 Q5 ambition, any newer explicitly declared goal, actual Q1 response, and exact destination class/mentor; separately identify pending, acquired, eligible, unverified, and intended mechanics. No assumption from a class name alone that the character owns a particular skill, feat, talent, career, vehicle, or Mentor relationship. Do not score displayed, unselected, merely explored, or incomplete-draft alternatives.

### Five prototype examples — one per destination class

These **five are illustrative actor fixtures**, NOT automatically valid for a different actor. When a stated fact is described as owned or declared, the example expressly assumes that fact is present in the actor/survey snapshot. The same structural patterns should generate other actual builds; do not hardcode these five scenarios as universal response banks. Each prototype includes five meaningful responses and one neutral answer. The categories in brackets are editorial only; **do not display them in the UI**.

#### Prototype A — Noble 1 -> Jedi 1 (Miraj): Persuasion and diplomatic ambition

**Verified hypothetical state:** Noble has trained Persuasion; L1 Q2 explicitly selected a diplomacy-related career parent; L1 Q5 selected the aspiration to resolve disputes without weapons. New Jedi Q1 selected interest in Force awareness. Jedi class level and starting feat/talent are pending finalization, not yet "owned" for this prompt.

1. [Reinforce] "I've trained to persuade people with words. I want this new discipline to help me recognize what a difficult conversation is missing."
2. [Complement] "I still want to talk through conflict, but I also want another way to protect people when the conversation breaks down."
3. [Cover a gap] "I want to recognize dangers earlier, so I can make better decisions before the people around me are at risk."
4. [Continue ambition] "I still want to help settle conflicts without fighting. I see Jedi training as another way to work toward that life."
5. [Explore change] "I'm beginning to wonder whether my place is somewhere other than diplomacy. I want to explore what this new training could mean for me."
6. [Neutral] "I'm not sure how my old and new training fit together yet. I want to understand the possibilities before deciding."

**Review caution:** 1 and 4 are intentionally distinct in *evidence grounding versus explicit career continuity*, but may sound similar; revise to increase distinctness. Force awareness in 1 or 3 is an aspiration unless the actor actually acquires/possesses an appropriate relevant ability.

#### Prototype B — Soldier 1 -> Noble 1 (J0-N1): weapon training and protecting a squad

**Verified hypothetical state:** Soldier's owned weapons training is confirmed in the actor; L1 Q5 declared intent to keep companions safe; Noble Q1 selected coordinating allies. Do not assume a trained Persuasion skill or any Noble talent has been acquired yet.

1. [Reinforce] "My experience has taught me how to act under fire. I want to learn how to help a whole team act together when things go wrong."
2. [Complement] "I know how to face an immediate threat. I want another way to deal with trouble before anyone has to draw a weapon."
3. [Cover a gap] "I want to become more capable at arranging help and resources before we're caught in a crisis."
4. [Continue ambition] "I still want to keep my companions safe. Learning to organize and support them could make me more useful to everyone."
5. [Explore change] "I'm starting to consider whether guiding people interests me as much as fighting alongside them. I want to see where that could lead."
6. [Neutral] "I'm not sure how this training fits with what I've learned as a Soldier. I'd like to explore it first."

#### Prototype C — Scoundrel 1 -> Scout 1 (Lead): trained Pilot and long-term travel ambition

**Verified hypothetical state:** Scoundrel has trained Pilot; L1 long-term ambition was to pilot a crew through dangerous travel; new Scout Q1 selected awareness/reconnaissance. These are example data, not generic Scoundrel starting grants.

1. [Reinforce] "I already know how to handle a ship. I want to learn how to recognize dangerous approaches before I commit to a route."
2. [Complement] "I'm used to finding a way through trouble as it happens. I'd like to learn how to see it coming and prepare another route."
3. [Cover a gap] "I can operate a vehicle, but I want to survive and navigate when a ship can't carry us any farther."
4. [Continue ambition] "I still want to get my crew safely wherever they need to go. I think learning more about what lies ahead could help me do that."
5. [Explore change] "I'm wondering whether I want to spend more of my life exploring unfamiliar places, rather than focusing on the journey between them."
6. [Neutral] "I'm not sure yet how to fit Scout training into what I already do. I want to try the possibilities first."

#### Prototype D — Scout 1 -> Soldier 1 (Breach): trained Perception and protecting an expedition

**Verified hypothetical state:** Scout has trained Perception; L1 Q5 selected a long-term aim to bring companions home safely; Soldier Q1 selected protective covering fire. No talent or feat is assumed unless checked.

1. [Reinforce] "I've learned to spot threats early. I want to become more capable at dealing with them when warning my companions isn't enough."
2. [Complement] "I can look for safer approaches, but I also want to help my companions when we're already caught in a fight."
3. [Cover a gap] "I want to withstand a confrontation we can't avoid, rather than always relying on finding a way around it."
4. [Continue ambition] "I still want to bring everyone home safely. More disciplined combat training could help me protect them when a mission goes wrong."
5. [Explore change] "I'm considering whether standing with my companions in a fight should become as important to me as scouting ahead."
6. [Neutral] "I'm not sure what role Soldier training should play alongside my field skills yet. I'd rather see what it offers first."

#### Prototype E — Soldier 1 -> Scoundrel 1 (Ol' Salty): weapons competence; no explicit career target recorded

**Verified hypothetical state:** Soldier owns a relevant weapon proficiency; the L1 Q2 parent career was skipped, and no later explicit goal is recorded. New Scoundrel Q1 selected technical access and bypass. Do not invent a missing career; this prototype intentionally demonstrates the no-career fallback.

1. [Reinforce] "I know how to handle myself in a fight. I want to learn ways to choose the moment and keep the advantage instead of trading shots."
2. [Complement] "I want to be able to get past security without making a fight of every obstacle in our way."
3. [Cover a gap] "I can respond when things turn dangerous, but I want to learn how to get information and open a route before it comes to that."
4. [Team contribution / no goal invented] "I want to give the people alongside me more options, especially when a direct fight would put them at risk."
5. [Explore change] "I'm interested in trying work that calls for more than my current combat skills. I haven't decided where that might take me."
6. [Neutral] "I'm not sure yet how these different skills would work together. I'd like to find out before choosing a direction."

### Editorial review and production gates

1. **Q2 purpose clarity:** Owner review must determine whether five selected functions plus one neutral are right, whether a goal-continuity response should always appear when one exists, and whether related responses (e.g., Reinforce vs Continue Ambition) feel adequately distinct.
2. **No manufactured history:** Class alone cannot establish trained skill, selected feat/talent, ownership of a ship/weapon, chosen L1 career, or a specific preference. Require evidence-gated wording. Detect missing/stale build and survey context; fail to a truthful generalized alternative, not false factual dialogue.
3. **Respect all classes:** For an actor with three or more prior classes, use all owned classes and features and label the relevant observed capability accurately; do not describe the most recent class as the character's complete past.
4. **Canonical relationship and eligibility:** Only mechanic-specific details and hidden references verified against current SSOT and frozen 190-tag ontology may be used as production evidence; no invented semantic IDs or class identity crosswalk. Distinguish immediately legal and future possibilities.
5. **Goal isolation:** Present prior declared career and L1 Q5 ambition as explicit future intent; never reassign on Q2 pivot exploration. Separate affirmative goal-revision flow if the player later confirms a different goal. A prestige Bridge purpose may be considered when exact declared target and prerequisite authority support the explanation, never as guaranteed eligibility or numeric investment depth.
6. **Selection integrity:** Record only a chosen answer in a *completed* survey, with Q2 purpose, verified actor evidence reference, relevant Q1 response, and option provenance. A displayed/explored/undecided choice creates no bias, negative inference, or acquisition.
7. **Coverage:** 20 ordered 2-class transitions, multi-class existing builds, low-information level-2 cases, no L1 career selection, contradicted Q1-Q2 interests, goal pivot without silent goal rewrite, bridge aspirations, retake/back-navigation, and late-level character entry must be tested.
8. **Status:** These five illustrative banks demonstrate a data-backed answer contract. **The 20 transitions do NOT yet have 20 actor-evidence-aware production banks.** No production code change, ontology score, approval, Git commit, or push has occurred.

## Change log, continued

- **2026-11-14 — Q2 Build Integration first draft:** Consulted the exact v0.9 multiclass Q2 definition and the local v0.10 fixed Mentor Q2 dialogue; proposed a full-build, actor-evidence-aware five-substantive-plus-neutral Q2 answer selector instead of blindly repeating Q1's former-class matrix; authored five fully first-person example six-answer sets (one per destination class), specified evidence/survey goal separation, and documented owner decisions and validation gates. Local Markdown only, no commits or pushes.

---

## Draft MC-Q2-SUGGESTION-AUTHORITY-02 — Reuse the existing Suggestion Engine for Q2 contextual selection (2026-11-14)

**Status:** Owner has expressed a positive design preference: reuse the existing Suggestion Engine scoring/actor context rather than independently deriving the entire Q2 profile. This is a **design refinement**, not authorization for code changes, confirmed runtime operation, new survey scoring weights, or a Git commit. Retain the five-substantive-plus-one-neutral Q2 prototype and fixed Mentor dialogue pending final approval.

### Current repository inspection (read-only; default branch observed 2026-11-14)

The following implemented entrypoints exist in `docflowGM/foundryvtt-swse`:

| Code authority | Existing behavior observed in source | Appropriate Q2 reuse |
|---|---|---|
| `scripts/engine/suggestion/BuildIntent.js` | `BuildIntent.analyze(actor,pendingData)` combines owned/pending feats and talents, talent trees, trained/pending skills, class item levels, attributes, equipment themes, prestige affinities, and survey context. Its `signals`, `primaryThemes`, `prestigeAffinities`, and milestone output are available. Some internal associations rely on names, so they must not be treated as canonical ID certifications. | Read build themes and their factual underlying evidence; distinguish pending and owned state. |
| `scripts/engine/prestige/identity-engine.js` | `IdentityEngine.computeTotalBias(actor, options)` computes survey, class chassis, observed behavior, equipment, archetype, specialist, prestige, and reinforcement bias. The active `computeSurveyBias` reads `system.swse.surveyBias` and `system.swse.classSurveyBias`. | Read as inferred context only; never call a high bias an explicitly declared goal or a mechanically owned ability. |
| `scripts/engine/suggestion/SuggestionEngineCoordinator.js` | `analyzeBuildIntent` has actor/snapshot/pending-data keyed caching; `suggestFeats`, `suggestTalents`, and other domain functions combine build intent, identity bias and legal candidate pools. | Reuse the existing orchestration; do not fork the scoring formulas. |
| `scripts/engine/suggestion/SuggestionService.js` | `getSuggestions(actor,context,options)` supports explicit candidate domains and pending data and returns ranked/reasoned candidates with request caching and result enrichment. The default aggregated path is feats plus Force powers, **not** a general-purpose Q2 integration response generator. | Obtain scored legal *mechanical candidates* and explanations, then translate supported evidence into editorially approved Q2 response templates. |
| `scripts/engine/suggestion/SuggestionStateService.js` | Stores `swse.suggestionEngine` flag metadata including pivot detector state. Other suggestion state is stored separately in `foundryvtt-swse.suggestionState`. | Do not assume one persisted actor field contains a comprehensive always-current score vector. Read from the authoritative current engine API and actor snapshot. |
| `scripts/apps/progression-framework/steps/base-class-survey-step.js` | Current completed class surveys are stored in draft/session structures and their biases aggregated into `system.swse.classSurveyBias` / `classSurveyResponses`. | Existing runtime behavior, **not yet** the independently aged, provenance-complete survey-event architecture required by the accepted v0.9 design. Do not treat it as certification that future Q2 semantics already run. |

**Verification boundary:** Source inspection verifies that the engine and integrations exist; this conversation has not executed Foundry or demonstrated a live actor with current suggestion scores. The Q2 design must be tested against actual Foundry actor snapshots before calling the connection runtime verified.

### Proposed Q2 read path — reuse, do not duplicate

1. Resolve the **authoritative pre-advancement actor snapshot** (all existing class levels, owned feats/talents, verified trained skills, class features and applicable equipment); record actor/progression revision. Separately resolve the **pending new class**, Q1 answer, and any other pending choices. Never confuse pending selections with finalized acquisitions.
2. Resolve explicitly declared L1 parent career, L1 Q5 long-term ambition and newer *affirmatively* declared future goals through the existing declared-goal authority. Keep these distinct from inferred current archetype, legal eligibility, and acquired class/feature identity.
3. Request the current actor's `BuildIntent` and `IdentityEngine` context via the existing Suggestion Engine coordinator. For relevant domains, ask `SuggestionService` for scored recommendations **using actual legal candidate lists and pending-data context** supplied by canonical progression/prerequisite authorities. Do not use unfiltered candidate scoring as proof of legality.
4. Inspect each relevant candidate's exact canonical ID, source, legal status, reason packet, and existing ontology/archetype relations. **Do not** construct canonical identities by string similarity, invent semantic tags, use legacy class-archetype records as a new SSOT, or assume the scorer's approximate theme label is a verified ontology member.
5. Select a diverse set of context-supported **integration purposes**, not simply the six highest-ranked feat cards: (a) reinforce, (b) complement, (c) fill a gap, (d) continue a declared ambition when one exists, (e) explore a change, plus (f) undecided. If an ambition is absent, substitute an honest class/build-relevant option rather than making up one. Do not force exactly five evidence-specific statements if facts are insufficient; use safe generic, prospective phrasing where appropriate.
6. Render destination Mentor's **fixed** approved Q2 introduction, then **first-person character responses** drawn from certified templates. Optional educational detail can reference a verifiable feature and identify whether it is owned, newly eligible, attainable later or unverified. Never show engine scores, tag IDs, hidden role classifications, or confidence numbers.
7. Record **only the selected Q2 answer when the full survey is completed**, tagged with response ID/version, integration purpose, actor snapshot ID, relevant observed/pending references, certified ontology tag IDs, Q1 response ID, selected class, previous survey/goal references and question provenance. Merely generating, viewing, ranking, or skipping an answer records **zero preference**. The undecided answer creates no assumed specialization or pivot.
8. Feed the completed Q2 answer as **new explicit survey-intent evidence**, independently attributable and independently decaying by the eventual approved survey-event policy. Do not turn Suggestion Engine recommendation scores into new user preference scores, double-count prior survey input, or let the engine's own recommendation output recursively reinforce its future analysis.

### Example: Soldier + new Noble level (illustrative; not a runtime trace)

Suppose the finalized character has Soldier weapon proficiency and a combat-oriented feat, an L1 stated ambition to protect allies, and a pending Noble entry. The current engine may rank combat support and command-related mechanical options highly. Q2 should **not** present five paraphrases of 'become a commander.' Its answer set could instead convey these distinct intentions:

- **Reinforce:** "I know how to act under fire. I want to learn how to help a whole team act together when things go wrong."
- **Complement:** "I know how to face an immediate threat. I want another way to deal with trouble before anyone has to draw a weapon."
- **Gap:** "I want to become more capable at arranging help and resources before we're caught in a crisis."
- **Goal continuity:** "I still want to keep my companions safe. Learning to organize and support them could make me more useful to everyone."
- **Exploratory change:** "I'm starting to consider whether guiding people interests me as much as fighting alongside them. I want to see where that could lead."
- **Undecided:** "I'm not sure how this training fits with what I've learned as a Soldier. I'd like to explore it first."

All six statements remain editorial prototypes. The engine supplies **which certified explanations and potential mechanical examples are most relevant**, but no score can decide for the player what they personally intend.

### Open certification and integration gates

- Confirm active class/suggestion hooks actually execute at the **new-foundation-class survey** step inside Foundry v13, with the correct pending selected class and candidate pool; source presence alone is insufficient.
- Confirm the real actor schema and availability of canonical IDs/verified talent-tree IDs versus name-based legacy helpers; exclude unsupported associations from Q2 evidence until certified.
- Establish a read-only API or adapter to request existing scorer outputs for Q2, without a second ranking engine or user-visible raw scoring UI.
- Audit legacy `class-archetypes.json` read paths and current survey bias aggregation; do not allow compatibility-only or derived aggregates to become parallel authorities. Preserve independently aged completed multiclass survey events per the accepted v0.9 requirements when implemented.
- Evaluate Q2 relevance and diversity across 20 ordered base-class transitions, late-level and 3+-class builds, thin L2 data, absent L1 career/ambition, incompatible/contradictory Q1 selections, pending-vs-owned fields, no legal near-term options, stale cache, retakes and navigation.
- Keep `declared_goal != inferred_current_identity != legal_eligibility != finalized_acquisition`; avoid assuming that a candidate suggestion or scorer's confidence entails intent, skill ownership, or eligibility.

**Local update only:** No GitHub commit, push, PR, implementation or runtime testing performed.

---

## Draft MC-Q2-DUAL-SIGNAL-03 — Q2 must synthesize selected Q1 answer AND current Suggestion Engine scoring (2026-11-14)

**Owner correction / design direction:** Q2 is **not** driven by suggestion-engine scoring alone, nor by a generic five-role response bank. Its answers must emerge from the **intersection of the player's actual Q1 selection** and **the character-specific Suggestion Engine assessment**. This refinement supersedes any implication in `MC-Q2-SUGGESTION-AUTHORITY-02` that Q1 is merely optional background. Editorial approach accepted in principle; exact ranking coefficients, mappings, implementation, and player wording remain unapproved.

### Two indispensable signals

| Input | Authority | Function in Q2 | Forbidden inference |
|---|---|---|---|
| **Actual selected Q1 answer** (stable response ID, destination class, prior class, verified capability focus) | First-person **explicit developmental intent**, pending until completed survey | Determines which newly learned class capability the player wishes to integrate; should strongly shape the Q2 contextual answer set | Does not prove capability acquisition or prerequisite eligibility; viewing unselected Q1 answers contributes nothing |
| **Current Suggestion Engine build analysis and scored mechanical candidates** (`BuildIntent`, identity context, `SuggestionService`/coordinator, reason packets) | **Inferred mechanical relevance**, grounded in actual actor and pending progression snapshot | Identifies owned strengths, complementary tactics, coverage gaps, feasible options, career-related pathways and explanatory mechanics; disambiguates *how* the Q1 choice can contribute | High-scoring suggestions are not declared intent, acquired features, guaranteed legal future selections, or evidence that the player wants only those outcomes |

Additionally, read the *separate* declared-goal/ambition authority (L1 Q2 parent and Q5, plus any explicit later revisions). Goals contextualize answer variants but must **not** be reconstructed from recommendation score or overwrite observed current build identity.

### Q2 proposed selection contract

1. **Freeze inputs together:** after an actual Q1 answer is selected, construct one immutable evaluation context: actor revision; all finalized class levels/items/skills/equipment; pending new destination class; exact Q1 `responseId` and approved canonical capability references; current L1 and later explicit goals; current pending class/feat/talent choices as distinctly pending. No Q1 selection, an undecided Q1 choice, or an unavailable response mapping must be represented as **no positive Q1 specialization signal**, not fabricated agreement.
2. **Request existing engine scoring with this context:** reuse `SuggestionEngineCoordinator.analyzeBuildIntent` and the existing `SuggestionService` legal candidate-ranking facilities. The scorer's actual candidate domains are feats/talents/classes/Force choices etc., **not Q2 answers**. Do not claim a Q2 scoring API already exists. Candidate lists and prerequisites must come from canonical progression authority; only verified candidate references may underpin specific player-facing language.
3. **Join Q1's certified capability focus to ranked candidate evidence:** use existing canonical mechanical/ontology relations and reason packets to find synergy between the *explicitly chosen new-class capability* and the *existing build*. This is a context-sensitive **interpretation/selection layer**, not a competing suggestion score formula. Prefer direct Q1-supported integration candidates when available while preserving alternative meaningful uses (complement, gap, ongoing ambition, possible change).
4. **Build diverse Q2 first-person replies:** target five distinct substantive statements plus one neutral undecided statement. Cover, when grounded: **(a)** direct Q1-to-owned-build synergy; **(b)** different method/role for that interest; **(c)** capability gap that the new class might address; **(d)** explicitly declared long-term ambition continuity; **(e)** credible exploration of a changed or additional direction. The five are *candidate intents*, not obligatory fixed labels or five paraphrases of the same high-ranking mechanic. If an ambition was not declared, substitute a truthful build-relevant option. If available evidence is weak, use noncommittal future-tense statements rather than asserting ownership.
5. **Keep origin/destination context:** Q1 has 20 origin-to-destination editorial banks, but Q2 must account for **all owned classes** when the character has more than two. The Q1 selected answer remains the controlling *new-development focus*, regardless of which earlier class selected the Q1 bank; Q2 does not discard other classes or available gear, feats, talents and trained skills.
6. **Resolve conflict without suppressing player voice:** if Q1 says `leadership` but the engine sees a heavily ranged-combat-focused character, offer statements about leading a ranged team, protecting allies, planning resources, and exploring new direction; **do not** replace the leadership choice with five combat-only replies. If Q1 is undecided, engine evidence can surface diverse concrete possibilities, but cannot create a fictitious Q1 intent.
7. **Do not double count Q1 through scoring:** if the suggestion engine already ingests survey or pending Q1 preferences, an inferred candidate score may partly reflect Q1 itself. Record this provenance; never treat the scored match as a **second independent endorsement** of the same Q1 tag. The **selected Q2 answer**, once the overall survey is completed, becomes a new attributable Q2 declaration; mere exposure, nonselection, and engine scores add zero user-intent evidence.
8. **Recompute deterministically:** changing Q1 invalidates Q2's old option context; regenerate the Q2 response set using the new Q1 answer and latest valid actor/progression snapshot. Preserve the user's prior Q2 selection by stable option ID only if its factual premises and mechanical eligibility remain true, otherwise request an explicit reconfirmation. Same snapshot/Q1 must yield the same options and order, with no unexplained mentor flip-flops.
9. **Presentation and eligibility:** the destination Mentor's Q2 introduction stays fixed. All selectable answers are first-person character speech. No scores, tags, weights, or hidden goal classes visible. A mechanical teaching detail may distinguish owned, currently eligible, future aspirational and unavailable/unverified, but no answer grants the mechanic. If no scored legal option matches the desired Q1 theme, represent that honestly rather than pretending it is already accessible.
10. **Certification:** before implementation, demonstrate that actual actor snapshots and engine scores for all 20 ordered foundation-class transitions support this synthesis; test multi-class actors, missing L1 goals, undecided Q1, score/Q1 conflict, canonical-reference gaps, retakes, back-navigation, unchanged snapshot determinism, and no preference leakage from displayed options.

### Worked dual-signal example — Soldier -> Noble (hypothetical)

- **Selected Q1 (explicit):** "I want to learn how to direct and coordinate allies, so I can contribute more than my own actions in a fight."
- **Observed existing build (hypothetical, must be confirmed for a real actor):** Soldier weapons training and combat-oriented feat/talent(s). Suggestion Engine infers a strong combat role and identifies relevant command/support possibilities based on the actual legal candidate pool.
- **Declared L1 ambition (conditional):** protect companions; only present a corresponding answer if this was truly declared.
- **Q2 Mentor:** J0-N1's already drafted and fixed Q2 introduction.

**First-person Q2 answer prototypes:**

1. **Direct Q1 + scorer synergy:** "I already know how to handle myself in combat. I want to learn how to direct others so we can fight more effectively as a team."
2. **Complementary role:** "I want to use my battlefield experience to recognize when my companions need guidance, encouragement, or support."
3. **Gap / preparation:** "I've learned how important preparation is in a fight. I want to become better at organizing the resources and people we need before trouble starts."
4. **Declared goal continuity, only when sourced:** "I still want to protect my companions. Learning to lead them could help me keep everyone safe, not just those standing beside me."
5. **Explore broader purpose:** "I'm interested in learning whether the skills of a leader could take me beyond the battlefield into something different."
6. **Neutral:** "I'm not sure yet how these abilities fit together. I'd like to explore the possibilities before making a decision."

**Critical counterexample:** If Q1 selected Noble **resources and connections** instead, the same combat actor must see materially different Q2 answers about logistical support, networks and preparedness. A high combat score cannot silently override Q1's explicit resource interest. Conversely, Q1's resource selection cannot imply the character has already acquired Connections, Wealth, or any other Noble talent.

**Status:** Owner clarified the combined-signal requirement; this section is the current Q2 **design direction** for review, not an approved mapping/weight formula or running feature. Local working Markdown only. **No Git commit, push, PR, or production code edit.**

## Change log, continued

- **2026-11-14 — Q2 dual-signal correction:** Revised Q2 to explicitly synthesize **selected Q1 response + existing Suggestion Engine scoring** in a single snapshot-based, evidence- and goal-aware answer selection process. Added precedence/conflict handling, six-answer Soldier-to-Noble example, no-double-counting rule, deterministic regeneration and acceptance gates. Local documentation only; no commits or production changes.

---

## MC-Q1-Q2-TEMPORAL-CONTRACT-04 — Q1 looks forward; Q2 starts with who the character is now (2026-11-14)

**Owner-confirmed design distinction (supersedes ambiguous Q2 wording):**

- **Q1 — Future capability discovery:** "What do I want to learn or become capable of through this newly selected foundation class?" The selected first-person statement is **prospective intent**, not an assertion of current ownership or eligibility. Q1 is informed by destination-class rules and framed by the previous class, but points forward.
- **Q2 — Present build integration:** "Given what I have actually learned, acquired, and chosen so far, how would the Q1 capability fit into my character today?" Begin with the character's **current mechanically substantiated identity and capabilities**, combining the selected Q1 future interest with **the existing Suggestion Engine's scored, evidence-backed analysis of the present build**. The offered answers then let the player decide the *relationship* between present strengths/gaps/ambitions and future training. Q2 may state a hoped-for application but must not masquerade as a second Q1 wishlist.

**Time/authority boundary:** Explicit Q1 desire is a future-direction signal; finalized classes, feats, talents, trained skills, relevant equipment and prior commitments are present/past facts; Suggestion Engine themes/affinities/reasons are **interpretations** of those facts, not additional player declarations. Pending newly selected class abilities are **not automatically owned**. The L1 declared career and long-term ambition are existing *future intentions* that may contextualize continuity but must not be relabeled as observed achievements.

### Q2 answer-authoring test

For every meaningful Q2 reply, an editor must be able to answer all three questions:

1. **Present:** Which actually owned build feature, documented experience, confirmed prior interest, or verifiably absent capability gives this option its anchor? If none, write the answer prospectively and do not invent a current feat/talent.
2. **Future:** Which exact selected Q1 development direction is this answer responding to? Do not replace that direction with an unrelated high scorer recommendation.
3. **Bridge:** What distinct relationship does the player propose between the present character and the future Q1 interest: reinforcing, complementing, filling a verified gap, furthering an explicitly stated aspiration, or exploring a possible different direction?

**Example — Soldier -> Noble:** Q1: "I want to learn how to direct and coordinate allies..." (future). Existing Soldier's selected weapons/feat/talent and actual class levels (present), assessed with the Suggestion Engine, inform Q2 options such as "I've learned how to handle myself under fire. I want to understand how those instincts could help me coordinate my companions." A different Q1 choice, such as contacts/resources, must produce a different Q2 set even for the same actor. Do not pretend the new Noble already has Born Leader or Connections unless legally and actually acquired.

**Scoring hygiene:** Use actual pre-advancement actor plus clearly marked pending selections and Q1 choice for answer **selection**, not a second independent preference vote; guard against the scorer echoing its own prior survey inputs. Only the character's explicitly selected Q2 statement becomes new intent evidence on full survey completion. An "I'm not sure" answer must not claim agreement with current inferred identity or assign a focus.

**Editorial status:** This time-orientation split is owner-confirmed. Exact Q2 banks, ontology mappings, scorer integration, coefficients and runtime verification are pending. Local rolling Markdown only; no Git actions.

## Change log, continued

- **2026-11-14 — Q1/Q2 time-orientation correction:** Owner clarified that Q1 looks to the future (desired new-class capability), while Q2 looks at the player's current build and asks how that specifically chosen future interest fits what they already are and know. Added a three-part authoring test (present anchor, Q1 direction, integration bridge), snapshot/ownership and scoring safeguards. No commit or code edits.

---

## MC-Q2-ARCHETYPE-LIBRARY-05 — Canonical archetype-aware Q2 response-library sizing (2026-11-14)

**Status: PROPOSED library architecture, not yet owner approval of quantities, scripts, data edits, or runtime integration.** Owner highlighted the scale of the current canonical archetype catalog: **97 parent career archetypes and 200 direct child specializations (297 total)**. This design uses them as a substantial contextual asset without treating inferred archetype identity as a declared goal or generating a separate archetype registry.

### Source and lane separation

- **Q1 prospective class capability:** one player-selected exact Q1 response/route, from the 20 class-transition banks with six options each. The undecided selection conveys no specific specialization.
- **Actor current facts:** finalized owned classes and levels, feats, talents with certified trees, trained skills, abilities, gear and other verified development facts. Clearly distinguish current actor facts from pending steps.
- **Suggestion Engine interpretations:** reuse the existing `BuildIntent` / `IdentityEngine` / `SuggestionEngineCoordinator` / `SuggestionService` outputs and candidate reason packets, ideally with the common actor/pending-state snapshot. A scored result is evidence-based interpretation, not a player declaration, observed acquisition, or a probability.
- **Canonical archetype graph:** use `ArchetypeRegistry` as the sole authority for the 97 parents, 200 children, parent relationships, descriptions, and certified 190-tag ontology relationships. Current inferred parent and child matches can inform present-day Q2 phrasing **only to the extent supported by observed mechanical evidence**. Never manufacture or assume a unique archetype identity from a ranking, and do not confuse a descriptive archetype with ownership of a prestige class.
- **Long-term player declarations:** L1 selected career parent and Q5 future ambition are independent declared future intent. They may inform a *continuity* choice, but must not become claims of present ownership or falsely inflate inferred present identity. A new Q2 exploration choice does not silently replace a declaration.

### Proposed library cardinality and decomposition

The complete exhaustive cross-product would be **20 ordered class transitions x 6 Q1 routes x 297 archetype identities x 5 substantive Q2 answer purposes = 178,200 distinct contexts** *before* accounting for multiclass history, character mechanics, and multiple relevant archetypes. This number is a **coverage-space illustration**, not a target of 178,200 handwritten statements or a demand to assign exactly one archetype to a character.

1. **Transition + Q1 + integration-purpose bank:** 20 x 6 x 5 = **600 authored content slots**; recommend 2-3 genuine alternative first-person phrasings per slot (roughly **1,200-1,800 narrative variants**) to support specificity without repetitive language. These are content records, not a scoring registry.
2. **Archetype contextual bank:** up to **297 canonical archetype entries** (97 parent + 200 child) with conditional first-person interpretation material for relevant integration purposes. A planning ceiling of five possible purpose relationships per archetype is **up to 1,485 authored contextual variants**; require genuinely distinct meaning and evidence for each authored variant, not five arbitrary paraphrases. Parent and child are separate typed identities; a child is never inferred or declared merely because a parent scores highly.
3. **Mechanically verified evidence bindings:** maintain nonduplicated references to current feats, talents, trained skills, class features, equipment and corresponding canonical IDs/tags through existing authorities. An authored Q2 record may require such facts and may cite specific verified candidate recommendations in its educational detail, but **must not** invent skill training, item ownership, prerequisite fulfillment, or an already-acquired new-class talent.
4. **One neutral answer slot per Q2 display:** consistently offer a first-person 'I'm not sure' / still exploring answer with no new specialization/purpose evidence. It can be authored per destination Mentor and adjusted for neutral versus known-Q1 context; does not need hundreds of shallow paraphrases.
5. **Context composition, not adjective splicing:** combine explicit source-backed Q1 direction, a demonstrable current fact, an optional archetype explanation, and one meaningful integration purpose into a **fully natural first-person answer**. Prefer hand-authored complete patterns with constrained, verified substitutions over concatenating fragments into awkward speech. Skip optional clauses when their evidence is unavailable.

### Q2 display intent and reranking

- Display **five differentiated, credible first-person integration answers plus one neutral** wherever meaningful. Proposed editorial purposes: **Reinforce existing strength; Complement existing role; Address a demonstrable gap; Support an explicitly declared ambition; Explore a possible alternate direction**. These are *internal purpose slots*, not forced player-visible categories or mandatory assumptions.
- All substantive options must be responsive to the selected **Q1 future capability**, not just the highest suggestion score. If Q1 was neutral, display diverse current-build-grounded options without attributing a specific Q1 aspiration.
- Use scored candidate relevance and attributable mechanic/archetype evidence to **rank/select** authored answers; no new independent score authority and no weight formula approved yet. One Q1 intent source is not counted twice when reused in presentation and later Q2 interpretation.
- The most recently taken base class is **not** a proxy for the entire build. All already-owned classes and feats/talents/skills participate; an inferred archetype can be ambiguous, and low-confidence cases must avoid certainty.
- If a genuine grounded source for a particular purpose is missing, either offer an honest prospective statement (no asserted past feat/skill/goal), or omit/rebalance it. Never manufacture a gap, inferred child specialty, or past goal to reach five choices. If coverage is thin, display fewer substantive answers and preserve the neutral answer rather than invent claims.
- Read-only offering, browsing, ranking, and nonselection create **zero declared preference/tag penalties or bonuses**. Only the player's committed Q2 selection in the completed survey contributes attributable new integration intent. Reopening without changing Q1/actor/snapshot should preserve answer IDs and choices; changing Q1 should recompute Q2 and ask for reconfirmation if prior choice no longer matches.

### Worked illustration: Soldier -> Noble (hypothetical actor evidence)

- **Q1 (future):** 'I want to learn how to direct and coordinate allies, so I can contribute more than my own actions in a fight.'
- **Current actual facts:** hypothetical character owns a rifle-focused feat and has Soldier class levels; anything more specific is only permissible if present in the actor snapshot.
- **Suggestion Engine:** finds combat-focused present build and evaluates suitable Noble development candidates; archetype registry may reveal mechanically supported parent/specialization matches, not guaranteed unique identity.
- **Q2 reinforce:** 'I've trained to make my shots count. I want to use that battlefield experience to help coordinate what the whole team does.'
- **Q2 complement:** 'I know how to respond when a fight starts. I want to learn to organize my companions before things reach that point.'
- **Q2 future-declaration continuity:** 'I still want to keep my companions safe. I think learning to lead them could help me do more for them.' **Show only if the character truly declared this goal.**
- **Q2 alternative:** 'I want to see whether organizing others could become as important to me as fighting alongside them.' **This is exploration, not an automatic career change.**

### Acceptance requirements before production

- Complete coverage testing for all **20 transitions**, all **120 Q1 route contexts** including undecided, all **97 parent and 200 child** archetype identities where they can legitimately supply present interpretation, and diverse low/high-level multifoundation-class actor builds. Coverage is *valid ability to compose or truthfully omit*, not a requirement to assert that every character fits every archetype.
- Source-backed assertions for every conditional phrase naming an acquired mechanic, a specialization, or a declared goal; record source domain, exact canonical ID, actor snapshot and explanation provenance.
- Test mismatch cases: Q1 interest outside the current top-ranked build; ambiguous archetype matches; no prior declared career; multiple class levels; current target class already partially acquired; no matching recommendation; inactive/unverified archetype associations; and changed Q1 mid-survey.
- No fabricated mechanical grants, no new archetype/tag registry, no treating candidate affinity as calibrated probability, and no performance-heavy full 178,200 combination materialization per actor.
- Confirm the existing scorer's currently executed and deployed path before claiming that this new Q2 selector is live. Proposed content and schema are **design only**, and actual implementation remains separately authorized.

**Owner decisions still required:** (a) five purpose slots versus a more diverse dynamic five, (b) the target size and editorial review standard for the contextual archetype bank, (c) whether current ambiguous archetype names should appear in player-facing Q2 answers at all, and (d) exact Q2 option ordering and preservation semantics. No code or Git actions authorized.

## Change log, continued

- **2026-11-14 — Q2 canonical archetype library proposal:** Added a proposed Q2 multi-layer editorial library leveraging **97 canonical parent archetypes / 200 child specializations** without a combinatorial explosion or a shadow archetype authority. Separated Q1 future, actor-owned present facts, scorer inference, archetype interpretation, and earlier declared goals; proposed 600 core content slots, 1,200-1,800 narrative variants, up to 1,485 archetype-context variants, evidence-bound assembly, neutral choice and test gates. Editorial only; no implementation or commits.

---

## Q2 — OWNER-CLARIFIED TOP-FOUR EXISTING-SCORES CONTRACT (2026-11-14)

**Authority:** This section supersedes earlier Q2 *library-size* proposals for 600 fixed transition/Q1/purpose slots, 1,200–1,800 variants, and up to 1,485 per-archetype contextual variants as implementation requirements. Those figures were exploratory sizing illustrations and are **not needed** to assemble the new Q2 answer set. It also supersedes any suggestion that Q2 calculate, duplicate, or independently tune mechanical-tag scoring.

**Accepted direction:** Q1 is future-facing (the player's explicitly selected new-class development interest). Q2 is present-facing (what the character's mechanically evidenced current build shows), combining that Q1 answer with the **four highest-ranked mechanically relevant tags already scored by the current Suggestion Engine**. Q2 is a read-only consumer of existing scoring output, not a second engine or a parallel tag index.

### Candidate answer composition

- **A–D:** For each of four highest-quality, meaningfully distinct scored present-build mechanical tags, select an authored first-person *integration* response joining that specific supported current strength with the chosen Q1 future direction. These four tags should be different enough to produce substantively different player answers; avoid using near-synonymous alias tags as separate directions.
- **E:** One first-person alternative to the dominant current build direction, still responsive to Q1. It is a possible exploration or shift in approach, **not** a confirmed career pivot or a rejection of any tag.
- **F:** One first-person “I'm not sure how these fit together yet” answer, which adds **no** new specialization/intent evidence.
- If fewer than four distinct, credible scored present-build tags exist, **do not invent or pad current evidence**. Offer as many genuinely grounded A–D responses as are available, optionally fill with truthful prospective alternatives, and always retain F. Specific exact six-option cardinality under sparse evidence remains for final UI approval.

### Inputs, output, and technical boundary

1. Input one: the **stable selected Q1 answer ID** and its *certified* class-specific future-capability references/tags, or a recorded neutral Q1 selection. A Q1 neutral choice adds **no manufactured future direction**.
2. Input two: the **existing Suggestion Engine's ranked mechanical-tag scores and their evidence/provenance** for the actor's *currently owned/observed build*, across **all** existing classes, acquired feats, acquired talents, trained skills, equipment as supported by existing scorer, and valid actor-derived signals. Do not reinterpret a ranked candidate feat/talent as an already possessed ability. Do not re-score tags in Q2.
3. Filter to **canonical approved tags** and evidence-backed statements. The currently existing `tag-signal-engine.js` exposes `buildTagBiasMap(...)` and other candidate-oriented mappings, but a ready-made public “top four actor mechanical tags with provenance” interface was **not yet verified**. If that read interface does not exist, implementation must expose an appropriate **read-only scored-output projection** from the existing authority, not create new weights or another scorer. Verify that the projected ranks are **present-build evidence** rather than feedback from uncommitted Q1 or a previous suggestion.
4. Q2 response generation is **lookup/composition of authored, mechanically supported first-person sentences**, *not* new intelligence/scoring. It may use class/Mentor dialogue and certified Q1-to-tag integrations for grammatical and mechanical fit. Retain stable option IDs and actor/Q1/scorer snapshot provenance.
5. Only the player's **committed Q2 choice** supplies Q2 declaration evidence to future suggestions. Display, navigation, no-choice, neutral answers, nonselection, or declining an alternate direction are not negative preference votes. Career parents and 200 specializations remain **canonical context**, not an obligatory exhaustive Q2 dialogue-bank cross-product. A Q1/Q2 aspiration never implies eligibility or acquired mechanics.

### Illustrative Soldier → Noble, Q1 leadership

Assume the existing engine scores `offense_ranged`, `survivability`, `initiative`, and `ally_support` as four **distinct**, evidenced current tag directions (illustration only; not an assertion of actual actor output or certification that these are the true highest four). Q1 chooses interest in directing and coordinating allies. Q2 offers first-person statements relating *each demonstrated present strength* to future Noble leadership, plus a distinct possibility and “not sure” option. Specific statements that claim trained weapons, feats, or talents require owned-item evidence rather than a tag alone.

### Required coverage/QA

- Test high/low-level characters, multiple class histories, Q1 neutral, sparse tags, ties, alias families, scorer changes while navigating, and Q1 changes while Q2 has a selection.
- Show that Q2 *consumes* existing scored tags without any duplicate mechanical score formula, new 190-tag ontology, parallel archetype registry, or generated unsupported feat/talent assertions.
- Do not claim runtime already provides the read-only top-four accessor or that scorer results are persisted on actor; verify the actual exposed surface before implementation.
- **No GitHub changes, commits, PRs, or production code edits** from this local design decision.

## Change log, continued — top-four Q2 simplification

- **2026-11-14 — Owner-confirmed Q2 top-four scored mechanical tags:** Replaced combinatorial authored archetype/transition Q2 bank as the design target with a small authored integration-response framework that reuses the existing Suggestion Engine's **already scored** top-four present-build mechanical tags alongside Q1's explicit future development choice. No secondary tag scoring, no duplicate registry or archetype cross-product. Confirm actual read interface and observed-only evidence provenance before implementation. Local design only.

---

## Q2 — COMPLETE MECHANICAL-BIAS × DESTINATION-CLASS DIALOGUE LIBRARY v0.1 (LOCAL DRAFT; 2026-11-14)

**Status:** Working editorial draft only. No implementation, owner approval of individual lines, or GitHub change. **625 distinct first-person player-response records** cover **125 exact canonical mechanical-bias keys × all five foundation destination classes**. These are the four scored-present-build candidate types for Q2 A–D, *not* 625 options shown at once.

**Exact source:** `data/bias-keys-canonical.json` (`mechanicalBias`: 125 keys, version 1.0, inspected 2026-11-14). The 125 keys are the existing bias vocabulary, **not** the distinct 190-tag final semantic ontology (`data/audits/talent-feat-phase3-final-ontology.json`). Preserve literal key spelling; `unarmeddMastery`, `tacticalVerse`, and `dualistTechnique` are source keys, not editorial corrections. An existing engine score for a key is not proof it is directly backed by an acquired ability; require attributable present-build evidence before a current-strength line is shown.

### Q2 rendering contract for this authored library

1. Q1 future selection remains the **single explicit future-intent authority**. On entry to Q2, compile a certified, **short lower-case noun phrase** called `q1_focus`, such as `better coordination of my allies`, `more effective field reconnaissance`, or `more disciplined use of the Force`, from the *specific selected Q1 answer* (not mechanically inferred). For neutral Q1, use a neutral truthful phrase such as `what this new training could offer`, **without adding inferred future intent**. Author/QA that phrase catalog separately with the Q1 bank; never use unconstrained text generation or blindly insert a complete first-person Q1 sentence.
2. Reuse the **already-scored existing Suggestion Engine outputs**; do **not** implement 125 additional weights or score values. Select top four **distinct** present-build-backed mechanical bias keys, and resolve each key plus the newly entered destination class to **exactly one** row below. If the engine exposes candidate semantic tags instead of scored mechanical-bias keys, an explicit mapping/projection needs owner approval; do not silently substitute the 190-tag vocabulary for this 125-key bank.
3. Substitute only `{{q1_focus}}` (a certified noun phrase) into the fixed authored sentence. The surrounding response is **first-person player speech**, never a Mentor line. Keep Q1 + tag + score provenance + actor snapshot hash + response ID; never claim a currently unowned new-class feat/talent, change the selected career, or silently infer that a skill has been trained.
4. A–D correspond to up to four scored **current** strengths; Q2 E (alternate direction) and F (undecided) are separate authored answers already specified elsewhere. **Do not** use these 625 entries to fabricate missing present strengths when the actor has fewer than four evidenced distinct tags.
5. This is an exhaustive **editorial join library** across the legacy mechanical-bias key vocabulary, not evidence that all 125 keys are actively emitted by the live top-four scorer. Before implementation, verify the scoring read interface, its ranked field vocabulary, evidence origin, and access/eligibility boundaries. Never feed Q1 intent back into the present-state top-four ranking unless the scorer already explicitly distinguishes that source.

### Destination: Noble — 125 first-person Q2 candidates

Each bold identifier is internal only; the quoted text is the player-visible response template. Display no key labels or scores to players.

- **`forceSecret`** — “I've learned that rare Force techniques can carry consequences beyond their immediate effect. I want that caution to guide the people I influence while pursuing {{q1_focus}}.”
- **`forceDC`** — “I've focused on making difficult Force effects harder to resist. I want to understand when influence helps more than pressure while pursuing {{q1_focus}}.”
- **`forceRecovery`** — “I've put value on recovering strength after demanding use of the Force. I want to think about how to sustain others, not only myself, while pursuing {{q1_focus}}.”
- **`burstDamage`** — “I have concentrated on ending dangerous exchanges with one decisive burst. I want to learn when a decisive move is better than a prolonged dispute while pursuing {{q1_focus}}.”
- **`singleTargetDamage`** — “My strongest approach has been bringing focused pressure against one target. I want to make that focus useful when identifying the one problem a group must solve while pursuing {{q1_focus}}.”
- **`areaDamage`** — “I have experience with attacks that can affect an entire area. I want to better account for everyone affected by a decision while pursuing {{q1_focus}}.”
- **`areaControl`** — “I have learned the value of controlling where an opponent can move. I want to shape situations before anyone is forced into a bad choice while pursuing {{q1_focus}}.”
- **`conditionTrack`** — “My methods have focused on steadily wearing down an opponent's effectiveness. I want to understand when pressure can settle a conflict without escalation while pursuing {{q1_focus}}.”
- **`counterAttack`** — “I have become attentive to openings created by an opponent's actions. I want to learn how to turn another person's mistake into a better outcome while pursuing {{q1_focus}}.”
- **`reactionDefense`** — “I have invested in reacting quickly when danger comes without warning. I want to use that awareness to keep other people from being caught unprepared while pursuing {{q1_focus}}.”
- **`damageReduction`** — “I have built my approach around taking a hit and remaining effective. I want to use that steadiness to reassure people under pressure while pursuing {{q1_focus}}.”
- **`damageMitigationAura`** — “I've focused on ways to lessen harm to people near me. I want to broaden that protective instinct into responsible leadership while pursuing {{q1_focus}}.”
- **`evasion`** — “I have learned to survive by moving out of danger rather than absorbing it. I want to recognize when getting people clear is the best decision while pursuing {{q1_focus}}.”
- **`accuracy`** — “I have spent time making deliberate actions land where I intend. I want that precision to inform how I judge people and problems while pursuing {{q1_focus}}.”
- **`critRange`** — “I have looked for techniques that create more opportunities for a telling strike. I want to learn to spot the rare moment when a decision can shift everything while pursuing {{q1_focus}}.”
- **`critDamage`** — “I have focused on making an especially well-placed strike decisive. I want to understand the consequences before committing to such force while pursuing {{q1_focus}}.”
- **`initiative`** — “I value acting before an opponent can seize control of events. I want to turn quick judgment into preparation for everyone while pursuing {{q1_focus}}.”
- **`dualWield`** — “I have practiced managing more than one weapon at once. I want to bring that coordination to balancing several responsibilities while pursuing {{q1_focus}}.”
- **`sithAlchemy`** — “My experience has involved the dangerous possibilities of dark-side alchemy. I want to weigh power against the cost it imposes on others while pursuing {{q1_focus}}.”
- **`darkSideAffinity`** — “My path has been shaped by attraction to the dark side's power. I want to consider what that power costs the people who rely on me while pursuing {{q1_focus}}.”
- **`lightSideAffinity`** — “I have placed importance on self-control and using power responsibly. I want to carry those principles into decisions that affect others while pursuing {{q1_focus}}.”
- **`formMastery`** — “I have been developing a particular discipline of lightsaber technique. I want to apply that patience and preparation beyond a duel while pursuing {{q1_focus}}.”
- **`meleeDamage`** — “I have built much of my effectiveness around fighting at close range. I want to know when close confrontation is necessary and when another approach will do while pursuing {{q1_focus}}.”
- **`firepower`** — “I have relied on sustained ranged force to keep threats at a distance. I want to understand how that leverage can protect people without needless escalation while pursuing {{q1_focus}}.”
- **`pilotMastery`** — “I have developed confidence operating vehicles under difficult conditions. I want to understand how movement and transport can serve a larger mission while pursuing {{q1_focus}}.”
- **`vehicularDamage`** — “I have concentrated on making vehicle-mounted attacks effective. I want to consider the wider consequences of using that kind of firepower while pursuing {{q1_focus}}.”
- **`unarmeddMastery`** — “I have invested in defending myself without depending on a weapon. I want that self-reliance to inform how I help others while pursuing {{q1_focus}}.”
- **`strikeForce`** — “I have focused on delivering powerful physical strikes. I want to know when firmness helps and when it only closes doors while pursuing {{q1_focus}}.”
- **`flowState`** — “I have sought a rhythm in which one action naturally leads into the next. I want to bring that sense of timing to group decisions while pursuing {{q1_focus}}.”
- **`combatFlow`** — “I have learned to influence the tempo of an encounter. I want to recognize when changing the pace changes the outcome while pursuing {{q1_focus}}.”
- **`combatStamina`** — “I have trained to remain effective through prolonged exertion. I want endurance to support the people counting on me while pursuing {{q1_focus}}.”
- **`commandAuthority`** — “I have become comfortable making decisions others depend on. I want to distinguish responsible leadership from simply giving orders while pursuing {{q1_focus}}.”
- **`formation`** — “I understand how much reliable positioning matters to a group. I want to build cooperation that lasts beyond a formal formation while pursuing {{q1_focus}}.”
- **`allySupport`** — “I have focused on making other people more effective. I want to build on that habit through clearer guidance and preparation while pursuing {{q1_focus}}.”
- **`moraleBonus`** — “I have put effort into helping companions stay confident. I want to learn how to make encouragement useful even when confidence is shaken while pursuing {{q1_focus}}.”
- **`moraleImpact`** — “I understand how fear and resolve can change a confrontation. I want to use that knowledge responsibly when dealing with people while pursuing {{q1_focus}}.”
- **`stealth`** — “I have built experience in avoiding attention when it matters. I want to know when discretion creates space for a better conversation while pursuing {{q1_focus}}.”
- **`infiltration`** — “I have learned to enter difficult places without drawing a crowd. I want to bring back information that helps others act wisely while pursuing {{q1_focus}}.”
- **`trackingMastery`** — “I have invested in finding people and following traces they leave behind. I want to turn what I find into useful decisions for others while pursuing {{q1_focus}}.”
- **`deceptionMastery`** — “I have used misdirection to shape how others read a situation. I want to know when honesty will serve me better than an elaborate cover while pursuing {{q1_focus}}.”
- **`knowledgeMastery`** — “I have built my decisions on study and accumulated expertise. I want to use what I know to guide people through unfamiliar problems while pursuing {{q1_focus}}.”
- **`skillUtility`** — “I have learned to approach problems with several practical skills. I want to choose the right specialist or tool for each challenge while pursuing {{q1_focus}}.”
- **`resourceControl`** — “I have spent time getting the most from limited supplies. I want to prepare people so scarcity becomes less dangerous while pursuing {{q1_focus}}.”
- **`informationControl`** — “I have learned that knowing something early can change every decision after it. I want to share the right facts with the right people while pursuing {{q1_focus}}.”
- **`networkInfluence`** — “I have learned how much can depend on having the right contacts. I want those relationships to support a purpose larger than personal favors while pursuing {{q1_focus}}.”
- **`predatoryInstinct`** — “I have become alert to the weakness an opponent tries to conceal. I want to understand when exploiting that weakness is necessary and when it is cruel while pursuing {{q1_focus}}.”
- **`tacticalAwareness`** — “I have trained myself to read a tense situation quickly. I want to turn that awareness into better decisions for a whole group while pursuing {{q1_focus}}.”
- **`armorMastery`** — “I have made protective equipment an important part of how I stay effective. I want to plan for safety rather than treat protection as someone else's concern while pursuing {{q1_focus}}.”
- **`grappling`** — “I have worked on controlling a threat at arm's length. I want to understand when restraint can settle a conflict while pursuing {{q1_focus}}.”
- **`ritualMastery`** — “I have studied the preparation and patience demanded by complex Force rituals. I want to bring that sense of responsibility to collective decisions while pursuing {{q1_focus}}.”
- **`itemEnchantment`** — “I have explored how unusual powers can change the nature of an object. I want to consider who benefits from such work and who might be harmed while pursuing {{q1_focus}}.”
- **`forceArtistry`** — “I have been drawn to expressing ideas and feeling through the Force. I want to communicate that understanding to people who may never share it while pursuing {{q1_focus}}.”
- **`droidControl`** — “I have worked with systems that direct or coordinate droids. I want to think about the responsibility that comes with directing others while pursuing {{q1_focus}}.”
- **`hackingSkills`** — “I have learned to work through computer systems others expect to stay closed. I want to make information access serve a clear purpose while pursuing {{q1_focus}}.”
- **`sabotageExpertise`** — “I understand how a complex system can be disabled at its weak point. I want to consider when shutting something down solves a problem and when it creates a worse one while pursuing {{q1_focus}}.”
- **`explosiveMastery`** — “I know that controlled blasts can change a situation in an instant. I want to account for the consequences before anyone gives the order while pursuing {{q1_focus}}.”
- **`biotechMastery`** — “My technical interests include living systems and their modification. I want to balance innovation against the people affected by it while pursuing {{q1_focus}}.”
- **`geneticEngineering`** — “I have explored the possibilities and risks of changing inherited traits. I want to consider whose interests those changes truly serve while pursuing {{q1_focus}}.”
- **`livingWeaponCrafting`** — “I understand that biological creations can be designed for violence. I want to judge the responsibility of anyone who commissions such work while pursuing {{q1_focus}}.”
- **`biologicalControl`** — “I have studied how living creatures can be influenced or directed. I want to use that understanding without treating life as a resource to command while pursuing {{q1_focus}}.”
- **`surgicalMastery`** — “I have focused on precise interventions when a life may depend on them. I want to make hard decisions with care for those affected while pursuing {{q1_focus}}.”
- **`healingMastery`** — “I have invested in restoring others after they are hurt. I want to connect that care with the decisions that keep people safe earlier while pursuing {{q1_focus}}.”
- **`treatingInjury`** — “I have developed practical experience caring for wounds. I want to improve the preparations that keep emergencies manageable while pursuing {{q1_focus}}.”
- **`engineeringMastery`** — “I have spent time understanding how structures and systems fit together. I want to see how that planning can make a larger operation work while pursuing {{q1_focus}}.”
- **`tacticalSupport`** — “I know how technical work can make a team more effective. I want to coordinate the people who can turn preparation into success while pursuing {{q1_focus}}.”
- **`fortifications`** — “I have learned to make a position safer before danger arrives. I want to prepare people and resources as carefully as I prepare defenses while pursuing {{q1_focus}}.”
- **`weaponEngineering`** — “I have worked on understanding what makes a weapon effective and reliable. I want to consider why a tool is needed, not only how to improve it, while pursuing {{q1_focus}}.”
- **`improvisation`** — “I have learned to find a workable answer when the original plan fails. I want to turn that flexibility into better decisions for everyone while pursuing {{q1_focus}}.”
- **`mechanicalMastery`** — “I have become comfortable diagnosing and handling complex machinery. I want that technical understanding to improve the choices a group makes while pursuing {{q1_focus}}.”
- **`technicalInnovation`** — “I have enjoyed finding technical solutions that did not exist before. I want to make sure a clever invention actually serves the people relying on it while pursuing {{q1_focus}}.”
- **`resourcefulness`** — “I have learned to get results with whatever is at hand. I want to stretch that habit into planning for people with different needs while pursuing {{q1_focus}}.”
- **`spacefarerMastery`** — “I have grown familiar with the demands of life and work aboard ships. I want to make a crew's needs part of every larger decision while pursuing {{q1_focus}}.”
- **`smugglingExpertise`** — “I understand the practical difficulties of moving cargo without attracting attention. I want to weigh the needs of a crew against the consequences of every shipment while pursuing {{q1_focus}}.”
- **`illegalTrade`** — “I have learned how complicated trade becomes outside recognized rules. I want to understand which deals help people and which simply exploit them while pursuing {{q1_focus}}.”
- **`evasionTactics`** — “I have worked on staying ahead of pursuit. I want to understand when a withdrawal serves the mission better than a confrontation while pursuing {{q1_focus}}.”
- **`outlawSkills`** — “I have experience operating where ordinary protections and rules offer little help. I want to understand the duties I still owe others outside those rules while pursuing {{q1_focus}}.”
- **`survivalism`** — “I have built my habits around enduring conditions others would avoid. I want that experience to guide preparations for people less accustomed to hardship while pursuing {{q1_focus}}.”
- **`criminalExpertise`** — “I understand how illicit operations hide their methods and intentions. I want to use that knowledge to make better judgments about whom to trust while pursuing {{q1_focus}}.”
- **`freedomPursuit`** — “I have made escaping confinement or control an important priority. I want to turn that need for freedom into protection for others while pursuing {{q1_focus}}.”
- **`explorationMastery`** — “I have been drawn to reaching places others have not understood. I want to turn discovery into knowledge that benefits more than myself while pursuing {{q1_focus}}.”
- **`wildernessLore`** — “I have learned to read the signs of unfamiliar natural environments. I want that understanding to shape sensible plans for other travelers while pursuing {{q1_focus}}.”
- **`survivalSkills`** — “I know how much basic fieldcraft matters when conditions turn bad. I want to prepare companions so nobody is left depending on luck while pursuing {{q1_focus}}.”
- **`adaptability`** — “I have become used to changing my approach when circumstances change. I want to help others adjust without losing sight of the goal while pursuing {{q1_focus}}.”
- **`infiltrationMastery`** — “I have concentrated on reaching well-defended places without being discovered. I want to put that access to good use when others need reliable information while pursuing {{q1_focus}}.”
- **`identityShift`** — “I have experience changing how others recognize or understand me. I want to find a trustworthy way to represent myself when roles change while pursuing {{q1_focus}}.”
- **`stealthMastery`** — “I have developed a highly deliberate approach to remaining unseen. I want to use that discretion to solve problems before they become public crises while pursuing {{q1_focus}}.”
- **`deadlyPrecision`** — “I have focused on striking vulnerable targets with extreme accuracy. I want to recognize the responsibility that comes with that kind of power while pursuing {{q1_focus}}.”
- **`silentKill`** — “I have studied methods of ending a threat without alerting others. I want to weigh whether secrecy justifies the consequences while pursuing {{q1_focus}}.”
- **`businessAcumen`** — “I have learned to recognize the real cost and value of a deal. I want to put that judgment to work for people depending on my decisions while pursuing {{q1_focus}}.”
- **`corporateInfluence`** — “I understand how large organizations make and resist decisions. I want to use that knowledge to navigate institutions without losing my purpose while pursuing {{q1_focus}}.”
- **`socialManipulation`** — “I have learned how carefully chosen words can alter another person's choices. I want to distinguish persuasion from taking advantage of trust while pursuing {{q1_focus}}.”
- **`persuasionMastery`** — “I have become comfortable helping others see a different point of view. I want to use that strength to bring people together while pursuing {{q1_focus}}.”
- **`conArtistry`** — “I understand how a convincing confidence scheme can draw someone in. I want to recognize when trust is being exploited while pursuing {{q1_focus}}.”
- **`intimidation`** — “I understand how projecting danger can change someone's behavior. I want to learn when a firm boundary is enough without a threat while pursuing {{q1_focus}}.”
- **`authorityPresence`** — “I know what it means to command attention when I enter a room. I want to make that attention serve people, not merely my status, while pursuing {{q1_focus}}.”
- **`brutalForce`** — “I have relied on overwhelming force when a threat refuses to give way. I want to know when strength serves my purpose and when it undermines trust while pursuing {{q1_focus}}.”
- **`lawEnforcement`** — “I understand the practical demands of enforcing rules and keeping order. I want to balance lawful authority with the needs of the people affected while pursuing {{q1_focus}}.”
- **`unitCoordination`** — “I have focused on making several people act as one effective unit. I want to turn that teamwork into lasting trust and good planning while pursuing {{q1_focus}}.”
- **`specialOps`** — “I have experience thinking about missions where discretion and precision matter. I want to weigh the political and personal consequences before choosing such an approach while pursuing {{q1_focus}}.”
- **`commandoTactics`** — “I have concentrated on small-team action under dangerous conditions. I want to coordinate preparation and support beyond the immediate team while pursuing {{q1_focus}}.”
- **`rapidResponse`** — “I have trained to act quickly when the situation changes suddenly. I want to make fast decisions that still account for other people's needs while pursuing {{q1_focus}}.”
- **`tacticalVerse`** — “I have worked on meeting several different tactical demands rather than relying on one method. I want to choose the right response for a complicated group situation while pursuing {{q1_focus}}.”
- **`dualistTechnique`** — “I have invested in the timing and control demanded by a duel. I want to carry that patience into difficult negotiations while pursuing {{q1_focus}}.”
- **`defensiveSwordsmanship`** — “I have practiced defending myself with a blade rather than chasing every opening. I want that restraint to inform how I protect others while pursuing {{q1_focus}}.”
- **`counterMastery`** — “I have focused on answering an opponent's move with a deliberate response. I want to recognize when a measured reply changes an entire conversation while pursuing {{q1_focus}}.”
- **`combatAdaptability`** — “I have learned to shift techniques when an opponent changes approach. I want to help a group adapt when the first plan fails while pursuing {{q1_focus}}.”
- **`dualistMastery`** — “I have made one-on-one combat a significant part of my training. I want to see how that discipline can serve people beyond a single contest while pursuing {{q1_focus}}.”
- **`weaponVersatility`** — “I have practiced staying capable with more than one kind of weapon. I want to extend that adaptability to the people and problems I face while pursuing {{q1_focus}}.”
- **`weaponMastery`** — “I have devoted considerable attention to mastering a chosen weapon. I want to bring that same dedication to a responsibility beyond combat while pursuing {{q1_focus}}.”
- **`arenaExpertise`** — “I understand how combat changes when the ground and audience limit every choice. I want to recognize when a confrontation is being staged for someone else's benefit while pursuing {{q1_focus}}.”
- **`heavyWeaponMastery`** — “I have concentrated on handling weapons that bring substantial destructive power. I want to take responsibility for the consequences before such force is used while pursuing {{q1_focus}}.”
- **`quickDraw`** — “I have trained to respond before an opponent can finish making their move. I want to turn that readiness into thoughtful preparation while pursuing {{q1_focus}}.”
- **`precisePistolry`** — “I have developed careful aim and control with a pistol. I want that attention to detail to influence my broader decisions while pursuing {{q1_focus}}.”
- **`triggerDiscipline`** — “I have trained myself to fire only when the moment is right. I want that restraint to carry into difficult decisions involving others while pursuing {{q1_focus}}.”
- **`forceBond`** — “I have been shaped by a deep connection through the Force. I want to understand how that bond affects the obligations I accept while pursuing {{q1_focus}}.”
- **`imperialDuty`** — “My sense of purpose has been shaped by service to Imperial authority. I want to examine what I owe to an institution and what I owe to individuals while pursuing {{q1_focus}}.”
- **`enforceAuthority`** — “I have experience ensuring that orders or rules are followed. I want to learn when cooperation works better than coercion while pursuing {{q1_focus}}.”
- **`forcedControl`** — “I have studied methods that compel others rather than persuade them. I want to think carefully about the trust such methods destroy while pursuing {{q1_focus}}.”
- **`mysticalInfluence`** — “I have seen how unusual or spiritual authority can shape people's actions. I want to understand where belief helps a community and where it can be exploited while pursuing {{q1_focus}}.”
- **`medicalKnowledge`** — “I have put time into understanding injury, illness, and care. I want to make that knowledge part of protecting a community while pursuing {{q1_focus}}.”
- **`treatmentExpertise`** — “I have developed an approach to choosing appropriate care in an emergency. I want to help organize support before an emergency overwhelms everyone while pursuing {{q1_focus}}.”
- **`selfProgram`** — “I have experience changing the routines that guide my own operation. I want to consider how self-direction changes my responsibilities to others while pursuing {{q1_focus}}.”
- **`independence`** — “I have learned to operate without constant direction from others. I want to choose when independence helps a group and when cooperation matters more while pursuing {{q1_focus}}.”
- **`technicalMastery`** — “I have committed myself to understanding and operating sophisticated systems. I want to make technical expertise accessible to the people relying on it while pursuing {{q1_focus}}.”
- **`adaptiveAI`** — “My capabilities involve adjusting decisions as new information changes the problem. I want to understand how independent adaptation can serve people without overriding them while pursuing {{q1_focus}}.”

### Destination: Jedi — 125 first-person Q2 candidates

Each bold identifier is internal only; the quoted text is the player-visible response template. Display no key labels or scores to players.

- **`forceSecret`** — “I've learned that rare Force techniques can carry consequences beyond their immediate effect. I want deeper discipline to guide my use of those techniques as I pursue {{q1_focus}}.”
- **`forceDC`** — “I've focused on making difficult Force effects harder to resist. I want to refine control rather than rely on raw power while pursuing {{q1_focus}}.”
- **`forceRecovery`** — “I've put value on recovering strength after demanding use of the Force. I want to build endurance and restraint into my continued training toward {{q1_focus}}.”
- **`burstDamage`** — “I have concentrated on ending dangerous exchanges with one decisive burst. I want to balance decisive action with restraint while pursuing {{q1_focus}}.”
- **`singleTargetDamage`** — “My strongest approach has been bringing focused pressure against one target. I want to direct my attention carefully rather than lash out at everyone while pursuing {{q1_focus}}.”
- **`areaDamage`** — “I have experience with attacks that can affect an entire area. I want to learn restraint when one action could harm many while pursuing {{q1_focus}}.”
- **`areaControl`** — “I have learned the value of controlling where an opponent can move. I want to protect others by managing space without unnecessary harm while pursuing {{q1_focus}}.”
- **`conditionTrack`** — “My methods have focused on steadily wearing down an opponent's effectiveness. I want to recognize the difference between stopping a threat and punishing someone while pursuing {{q1_focus}}.”
- **`counterAttack`** — “I have become attentive to openings created by an opponent's actions. I want to respond with control instead of anger while pursuing {{q1_focus}}.”
- **`reactionDefense`** — “I have invested in reacting quickly when danger comes without warning. I want to develop calm defensive instincts while pursuing {{q1_focus}}.”
- **`damageReduction`** — “I have built my approach around taking a hit and remaining effective. I want to pair endurance with the judgment to avoid needless harm while pursuing {{q1_focus}}.”
- **`damageMitigationAura`** — “I've focused on ways to lessen harm to people near me. I want to make protection, not display, the center of my next lessons toward {{q1_focus}}.”
- **`evasion`** — “I have learned to survive by moving out of danger rather than absorbing it. I want to combine motion with awareness and restraint while pursuing {{q1_focus}}.”
- **`accuracy`** — “I have spent time making deliberate actions land where I intend. I want careful attention to guide my judgment as well as my technique while pursuing {{q1_focus}}.”
- **`critRange`** — “I have looked for techniques that create more opportunities for a telling strike. I want to recognize openings without becoming fixated on striking while pursuing {{q1_focus}}.”
- **`critDamage`** — “I have focused on making an especially well-placed strike decisive. I want to learn when precision calls for restraint rather than greater power while pursuing {{q1_focus}}.”
- **`initiative`** — “I value acting before an opponent can seize control of events. I want to pair quick reactions with patience while pursuing {{q1_focus}}.”
- **`dualWield`** — “I have practiced managing more than one weapon at once. I want to develop greater control over each movement while pursuing {{q1_focus}}.”
- **`sithAlchemy`** — “My experience has involved the dangerous possibilities of dark-side alchemy. I want to face the moral consequences of that knowledge while pursuing {{q1_focus}}.”
- **`darkSideAffinity`** — “My path has been shaped by attraction to the dark side's power. I want to decide deliberately what kind of Force user I will become while pursuing {{q1_focus}}.”
- **`lightSideAffinity`** — “I have placed importance on self-control and using power responsibly. I want to deepen that discipline instead of treating it as an achievement already finished while pursuing {{q1_focus}}.”
- **`formMastery`** — “I have been developing a particular discipline of lightsaber technique. I want to deepen the principles behind my chosen form while pursuing {{q1_focus}}.”
- **`meleeDamage`** — “I have built much of my effectiveness around fighting at close range. I want to pair courage up close with restraint while pursuing {{q1_focus}}.”
- **`firepower`** — “I have relied on sustained ranged force to keep threats at a distance. I want to choose carefully when force from a distance is justified while pursuing {{q1_focus}}.”
- **`pilotMastery`** — “I have developed confidence operating vehicles under difficult conditions. I want to bring calm judgment to the moments when speed alone isn't enough while pursuing {{q1_focus}}.”
- **`vehicularDamage`** — “I have concentrated on making vehicle-mounted attacks effective. I want to judge when heavy force is necessary and when it causes more harm while pursuing {{q1_focus}}.”
- **`unarmeddMastery`** — “I have invested in defending myself without depending on a weapon. I want control over my body and reactions to strengthen my discipline while pursuing {{q1_focus}}.”
- **`strikeForce`** — “I have focused on delivering powerful physical strikes. I want to balance strength with compassion while pursuing {{q1_focus}}.”
- **`flowState`** — “I have sought a rhythm in which one action naturally leads into the next. I want to make calm, deliberate movement part of my discipline while pursuing {{q1_focus}}.”
- **`combatFlow`** — “I have learned to influence the tempo of an encounter. I want to control my reactions instead of allowing a fight to control me while pursuing {{q1_focus}}.”
- **`combatStamina`** — “I have trained to remain effective through prolonged exertion. I want to develop discipline that lasts after the first effort while pursuing {{q1_focus}}.”
- **`commandAuthority`** — “I have become comfortable making decisions others depend on. I want to lead by judgment and example while pursuing {{q1_focus}}.”
- **`formation`** — “I understand how much reliable positioning matters to a group. I want to support unity without forcing everyone into the same role while pursuing {{q1_focus}}.”
- **`allySupport`** — “I have focused on making other people more effective. I want my new lessons to serve the people beside me while pursuing {{q1_focus}}.”
- **`moraleBonus`** — “I have put effort into helping companions stay confident. I want to offer steadiness rather than false certainty while pursuing {{q1_focus}}.”
- **`moraleImpact`** — “I understand how fear and resolve can change a confrontation. I want to understand the difference between inspiring courage and exploiting fear while pursuing {{q1_focus}}.”
- **`stealth`** — “I have built experience in avoiding attention when it matters. I want to move quietly without losing sight of why I'm there while pursuing {{q1_focus}}.”
- **`infiltration`** — “I have learned to enter difficult places without drawing a crowd. I want to understand the purpose of a quiet approach, not just the technique, while pursuing {{q1_focus}}.”
- **`trackingMastery`** — “I have invested in finding people and following traces they leave behind. I want to understand what a trail reveals before judging the person who made it while pursuing {{q1_focus}}.”
- **`deceptionMastery`** — “I have used misdirection to shape how others read a situation. I want to judge the ethics of influencing a person's choices while pursuing {{q1_focus}}.”
- **`knowledgeMastery`** — “I have built my decisions on study and accumulated expertise. I want to turn knowledge into deeper understanding instead of mere answers while pursuing {{q1_focus}}.”
- **`skillUtility`** — “I have learned to approach problems with several practical skills. I want to combine practical skill with thoughtful judgment while pursuing {{q1_focus}}.”
- **`resourceControl`** — “I have spent time getting the most from limited supplies. I want to decide what truly matters before spending what we cannot replace while pursuing {{q1_focus}}.”
- **`informationControl`** — “I have learned that knowing something early can change every decision after it. I want to distinguish useful insight from the temptation to control others while pursuing {{q1_focus}}.”
- **`networkInfluence`** — “I have learned how much can depend on having the right contacts. I want to judge which bonds deserve trust while pursuing {{q1_focus}}.”
- **`predatoryInstinct`** — “I have become alert to the weakness an opponent tries to conceal. I want to see vulnerability clearly without losing compassion while pursuing {{q1_focus}}.”
- **`tacticalAwareness`** — “I have trained myself to read a tense situation quickly. I want to stay aware of everyone affected by my choices while pursuing {{q1_focus}}.”
- **`armorMastery`** — “I have made protective equipment an important part of how I stay effective. I want to understand the balance between protection and freedom of movement while pursuing {{q1_focus}}.”
- **`grappling`** — “I have worked on controlling a threat at arm's length. I want to protect others without escalating every confrontation while pursuing {{q1_focus}}.”
- **`ritualMastery`** — “I have studied the preparation and patience demanded by complex Force rituals. I want to deepen my understanding of what those rites demand while pursuing {{q1_focus}}.”
- **`itemEnchantment`** — “I have explored how unusual powers can change the nature of an object. I want to understand the responsibility that comes with altered objects while pursuing {{q1_focus}}.”
- **`forceArtistry`** — “I have been drawn to expressing ideas and feeling through the Force. I want to explore the meaning behind my control of the Force while pursuing {{q1_focus}}.”
- **`droidControl`** — “I have worked with systems that direct or coordinate droids. I want to distinguish control from genuine cooperation while pursuing {{q1_focus}}.”
- **`hackingSkills`** — “I have learned to work through computer systems others expect to stay closed. I want to understand the consequences of entering systems that were not mine to open while pursuing {{q1_focus}}.”
- **`sabotageExpertise`** — “I understand how a complex system can be disabled at its weak point. I want to choose the least harmful intervention that will work while pursuing {{q1_focus}}.”
- **`explosiveMastery`** — “I know that controlled blasts can change a situation in an instant. I want to be certain that power is used only when it is justified while pursuing {{q1_focus}}.”
- **`biotechMastery`** — “My technical interests include living systems and their modification. I want to consider how knowledge of living things shapes my responsibilities while pursuing {{q1_focus}}.”
- **`geneticEngineering`** — “I have explored the possibilities and risks of changing inherited traits. I want to keep the value of an individual separate from what can be engineered while pursuing {{q1_focus}}.”
- **`livingWeaponCrafting`** — “I understand that biological creations can be designed for violence. I want to face the ethical danger in treating living things as weapons while pursuing {{q1_focus}}.”
- **`biologicalControl`** — “I have studied how living creatures can be influenced or directed. I want to draw a line between guidance and domination while pursuing {{q1_focus}}.”
- **`surgicalMastery`** — “I have focused on precise interventions when a life may depend on them. I want to carry that respect for life into every new discipline while pursuing {{q1_focus}}.”
- **`healingMastery`** — “I have invested in restoring others after they are hurt. I want to deepen my understanding of healing without overlooking the person in pain while pursuing {{q1_focus}}.”
- **`treatingInjury`** — “I have developed practical experience caring for wounds. I want to bring patience and compassion to difficult choices while pursuing {{q1_focus}}.”
- **`engineeringMastery`** — “I have spent time understanding how structures and systems fit together. I want to approach each new problem with the same care for its underlying structure while pursuing {{q1_focus}}.”
- **`tacticalSupport`** — “I know how technical work can make a team more effective. I want to make every practical improvement serve the people it protects while pursuing {{q1_focus}}.”
- **`fortifications`** — “I have learned to make a position safer before danger arrives. I want to understand protection as something built before a crisis while pursuing {{q1_focus}}.”
- **`weaponEngineering`** — “I have worked on understanding what makes a weapon effective and reliable. I want to temper technical skill with judgment about its use while pursuing {{q1_focus}}.”
- **`improvisation`** — “I have learned to find a workable answer when the original plan fails. I want to stay open to the unexpected without losing my principles while pursuing {{q1_focus}}.”
- **`mechanicalMastery`** — “I have become comfortable diagnosing and handling complex machinery. I want to learn when fixing a machine is less important than understanding its impact while pursuing {{q1_focus}}.”
- **`technicalInnovation`** — “I have enjoyed finding technical solutions that did not exist before. I want creativity to stay grounded in responsibility while pursuing {{q1_focus}}.”
- **`resourcefulness`** — “I have learned to get results with whatever is at hand. I want to recognize value where others see only scraps while pursuing {{q1_focus}}.”
- **`spacefarerMastery`** — “I have grown familiar with the demands of life and work aboard ships. I want to stay steady when the stars offer no simple answer while pursuing {{q1_focus}}.”
- **`smugglingExpertise`** — “I understand the practical difficulties of moving cargo without attracting attention. I want to examine whether the route and the cargo deserve the risks they carry while pursuing {{q1_focus}}.”
- **`illegalTrade`** — “I have learned how complicated trade becomes outside recognized rules. I want to weigh responsibility against the temptation of an easy profit while pursuing {{q1_focus}}.”
- **`evasionTactics`** — “I have worked on staying ahead of pursuit. I want to choose restraint without mistaking it for weakness while pursuing {{q1_focus}}.”
- **`outlawSkills`** — “I have experience operating where ordinary protections and rules offer little help. I want to choose what is right even when there is no one to enforce it while pursuing {{q1_focus}}.”
- **`survivalism`** — “I have built my habits around enduring conditions others would avoid. I want to find steadiness through discomfort while pursuing {{q1_focus}}.”
- **`criminalExpertise`** — “I understand how illicit operations hide their methods and intentions. I want to recognize manipulation without letting cynicism guide every choice while pursuing {{q1_focus}}.”
- **`freedomPursuit`** — “I have made escaping confinement or control an important priority. I want to decide how freedom and responsibility fit together while pursuing {{q1_focus}}.”
- **`explorationMastery`** — “I have been drawn to reaching places others have not understood. I want wonder and caution to guide my next steps while pursuing {{q1_focus}}.”
- **`wildernessLore`** — “I have learned to read the signs of unfamiliar natural environments. I want to treat the living world as more than an obstacle while pursuing {{q1_focus}}.”
- **`survivalSkills`** — “I know how much basic fieldcraft matters when conditions turn bad. I want to stay composed when comfort and certainty disappear while pursuing {{q1_focus}}.”
- **`adaptability`** — “I have become used to changing my approach when circumstances change. I want to remain open to new lessons without abandoning my principles while pursuing {{q1_focus}}.”
- **`infiltrationMastery`** — “I have concentrated on reaching well-defended places without being discovered. I want to remember the purpose behind slipping past defenses while pursuing {{q1_focus}}.”
- **`identityShift`** — “I have experience changing how others recognize or understand me. I want to know which parts of myself remain steady beneath a changing appearance while pursuing {{q1_focus}}.”
- **`stealthMastery`** — “I have developed a highly deliberate approach to remaining unseen. I want quiet movement to reflect careful intention while pursuing {{q1_focus}}.”
- **`deadlyPrecision`** — “I have focused on striking vulnerable targets with extreme accuracy. I want to choose restraint even when a decisive strike is within reach while pursuing {{q1_focus}}.”
- **`silentKill`** — “I have studied methods of ending a threat without alerting others. I want to question whether silence should ever matter more than mercy while pursuing {{q1_focus}}.”
- **`businessAcumen`** — “I have learned to recognize the real cost and value of a deal. I want to remember that a fair outcome matters more than a profitable one while pursuing {{q1_focus}}.”
- **`corporateInfluence`** — “I understand how large organizations make and resist decisions. I want to judge power by what it asks of people while pursuing {{q1_focus}}.”
- **`socialManipulation`** — “I have learned how carefully chosen words can alter another person's choices. I want to treat another person's will as something worth respecting while pursuing {{q1_focus}}.”
- **`persuasionMastery`** — “I have become comfortable helping others see a different point of view. I want to listen as carefully as I speak while pursuing {{q1_focus}}.”
- **`conArtistry`** — “I understand how a convincing confidence scheme can draw someone in. I want to consider whether clever persuasion serves anyone beyond myself while pursuing {{q1_focus}}.”
- **`intimidation`** — “I understand how projecting danger can change someone's behavior. I want to stop confusing fear with genuine respect while pursuing {{q1_focus}}.”
- **`authorityPresence`** — “I know what it means to command attention when I enter a room. I want to earn the right to be heard through conduct while pursuing {{q1_focus}}.”
- **`brutalForce`** — “I have relied on overwhelming force when a threat refuses to give way. I want to find a disciplined answer to the temptation to overpower others while pursuing {{q1_focus}}.”
- **`lawEnforcement`** — “I understand the practical demands of enforcing rules and keeping order. I want to distinguish justice from obedience while pursuing {{q1_focus}}.”
- **`unitCoordination`** — “I have focused on making several people act as one effective unit. I want to keep individual judgment alive within a coordinated effort while pursuing {{q1_focus}}.”
- **`specialOps`** — “I have experience thinking about missions where discretion and precision matter. I want to remember the people behind a mission, not just its success, while pursuing {{q1_focus}}.”
- **`commandoTactics`** — “I have concentrated on small-team action under dangerous conditions. I want to bring discipline and restraint to the hardest moments while pursuing {{q1_focus}}.”
- **`rapidResponse`** — “I have trained to act quickly when the situation changes suddenly. I want to act without letting urgency replace judgment while pursuing {{q1_focus}}.”
- **`tacticalVerse`** — “I have worked on meeting several different tactical demands rather than relying on one method. I want to remain adaptable without losing my center while pursuing {{q1_focus}}.”
- **`dualistTechnique`** — “I have invested in the timing and control demanded by a duel. I want technique to serve judgment rather than pride while pursuing {{q1_focus}}.”
- **`defensiveSwordsmanship`** — “I have practiced defending myself with a blade rather than chasing every opening. I want to deepen a style built on patience and careful response while pursuing {{q1_focus}}.”
- **`counterMastery`** — “I have focused on answering an opponent's move with a deliberate response. I want to make every response proportional to the threat while pursuing {{q1_focus}}.”
- **`combatAdaptability`** — “I have learned to shift techniques when an opponent changes approach. I want to treat a changing fight as a test of judgment, not ego, while pursuing {{q1_focus}}.”
- **`dualistMastery`** — “I have made one-on-one combat a significant part of my training. I want to understand when a duel protects others and when it only proves pride while pursuing {{q1_focus}}.”
- **`weaponVersatility`** — “I have practiced staying capable with more than one kind of weapon. I want to select a tool because it is appropriate, not merely familiar, while pursuing {{q1_focus}}.”
- **`weaponMastery`** — “I have devoted considerable attention to mastering a chosen weapon. I want to balance technique with the judgment of whether to use it while pursuing {{q1_focus}}.”
- **`arenaExpertise`** — “I understand how combat changes when the ground and audience limit every choice. I want to remember that the purpose of a fight matters more than applause while pursuing {{q1_focus}}.”
- **`heavyWeaponMastery`** — “I have concentrated on handling weapons that bring substantial destructive power. I want to understand when a powerful weapon is less useful than a measured decision while pursuing {{q1_focus}}.”
- **`quickDraw`** — “I have trained to respond before an opponent can finish making their move. I want to decide when speed is warranted and when calm matters more while pursuing {{q1_focus}}.”
- **`precisePistolry`** — “I have developed careful aim and control with a pistol. I want to pair technical precision with responsible judgment while pursuing {{q1_focus}}.”
- **`triggerDiscipline`** — “I have trained myself to fire only when the moment is right. I want to strengthen the patience behind every deliberate action while pursuing {{q1_focus}}.”
- **`forceBond`** — “I have been shaped by a deep connection through the Force. I want to explore the responsibility and trust inside that connection while pursuing {{q1_focus}}.”
- **`imperialDuty`** — “My sense of purpose has been shaped by service to Imperial authority. I want to decide whether duty and conscience can remain aligned while pursuing {{q1_focus}}.”
- **`enforceAuthority`** — “I have experience ensuring that orders or rules are followed. I want to separate justified authority from the habit of demanding obedience while pursuing {{q1_focus}}.”
- **`forcedControl`** — “I have studied methods that compel others rather than persuade them. I want to face the moral difference between influence and domination while pursuing {{q1_focus}}.”
- **`mysticalInfluence`** — “I have seen how unusual or spiritual authority can shape people's actions. I want to judge the difference between genuine insight and a convincing display while pursuing {{q1_focus}}.”
- **`medicalKnowledge`** — “I have put time into understanding injury, illness, and care. I want to remember the individual person behind every difficult choice while pursuing {{q1_focus}}.”
- **`treatmentExpertise`** — “I have developed an approach to choosing appropriate care in an emergency. I want patience and attention to guide the help I offer while pursuing {{q1_focus}}.”
- **`selfProgram`** — “I have experience changing the routines that guide my own operation. I want to examine which choices define me beyond a set of instructions while pursuing {{q1_focus}}.”
- **`independence`** — “I have learned to operate without constant direction from others. I want to balance self-reliance with responsibility toward others while pursuing {{q1_focus}}.”
- **`technicalMastery`** — “I have committed myself to understanding and operating sophisticated systems. I want to recognize where skill alone is not enough to make a wise choice while pursuing {{q1_focus}}.”
- **`adaptiveAI`** — “My capabilities involve adjusting decisions as new information changes the problem. I want to test whether changing my methods can still reflect stable principles while pursuing {{q1_focus}}.”

### Destination: Scoundrel — 125 first-person Q2 candidates

Each bold identifier is internal only; the quoted text is the player-visible response template. Display no key labels or scores to players.

- **`forceSecret`** — “I've learned that rare Force techniques can carry consequences beyond their immediate effect. I want to recognize when an unusual technique is worth the risk while pursuing {{q1_focus}}.”
- **`forceDC`** — “I've focused on making difficult Force effects harder to resist. I want to use subtlety before showing my full strength while pursuing {{q1_focus}}.”
- **`forceRecovery`** — “I've put value on recovering strength after demanding use of the Force. I want to keep something in reserve for the unexpected while pursuing {{q1_focus}}.”
- **`burstDamage`** — “I have concentrated on ending dangerous exchanges with one decisive burst. I want to recognize the one opening that changes everything while pursuing {{q1_focus}}.”
- **`singleTargetDamage`** — “My strongest approach has been bringing focused pressure against one target. I want to choose the right target instead of wasting an advantage while pursuing {{q1_focus}}.”
- **`areaDamage`** — “I have experience with attacks that can affect an entire area. I want to find openings that spare the people who are not my target while pursuing {{q1_focus}}.”
- **`areaControl`** — “I have learned the value of controlling where an opponent can move. I want to turn routes and bottlenecks into advantages while pursuing {{q1_focus}}.”
- **`conditionTrack`** — “My methods have focused on steadily wearing down an opponent's effectiveness. I want to exploit a weakening defense without getting reckless while pursuing {{q1_focus}}.”
- **`counterAttack`** — “I have become attentive to openings created by an opponent's actions. I want to turn a poorly timed move into an opportunity while pursuing {{q1_focus}}.”
- **`reactionDefense`** — “I have invested in reacting quickly when danger comes without warning. I want to stay difficult to catch off guard while pursuing {{q1_focus}}.”
- **`damageReduction`** — “I have built my approach around taking a hit and remaining effective. I want to stay standing when a clever escape is no longer possible while pursuing {{q1_focus}}.”
- **`damageMitigationAura`** — “I've focused on ways to lessen harm to people near me. I want to keep companions safe even when our plans come apart while pursuing {{q1_focus}}.”
- **`evasion`** — “I have learned to survive by moving out of danger rather than absorbing it. I want to preserve a route out of trouble while pursuing {{q1_focus}}.”
- **`accuracy`** — “I have spent time making deliberate actions land where I intend. I want to make each small advantage count while pursuing {{q1_focus}}.”
- **`critRange`** — “I have looked for techniques that create more opportunities for a telling strike. I want to make good luck less necessary by finding more openings while pursuing {{q1_focus}}.”
- **`critDamage`** — “I have focused on making an especially well-placed strike decisive. I want to use the right opening, not just the biggest one, while pursuing {{q1_focus}}.”
- **`initiative`** — “I value acting before an opponent can seize control of events. I want to get ahead of trouble instead of scrambling after it while pursuing {{q1_focus}}.”
- **`dualWield`** — “I have practiced managing more than one weapon at once. I want to keep my options open without losing accuracy while pursuing {{q1_focus}}.”
- **`sithAlchemy`** — “My experience has involved the dangerous possibilities of dark-side alchemy. I want to recognize where forbidden techniques create leverage and danger while pursuing {{q1_focus}}.”
- **`darkSideAffinity`** — “My path has been shaped by attraction to the dark side's power. I want to understand how temptation can cloud a good plan while pursuing {{q1_focus}}.”
- **`lightSideAffinity`** — “I have placed importance on self-control and using power responsibly. I want to hold to those principles when an easy shortcut appears while pursuing {{q1_focus}}.”
- **`formMastery`** — “I have been developing a particular discipline of lightsaber technique. I want to understand what a disciplined fighter can learn from improvisation while pursuing {{q1_focus}}.”
- **`meleeDamage`** — “I have built much of my effectiveness around fighting at close range. I want to turn dangerous proximity into a tactical choice rather than a trap while pursuing {{q1_focus}}.”
- **`firepower`** — “I have relied on sustained ranged force to keep threats at a distance. I want to make a distant advantage count before enemies close in while pursuing {{q1_focus}}.”
- **`pilotMastery`** — “I have developed confidence operating vehicles under difficult conditions. I want to use timing and unexpected routes to our advantage while pursuing {{q1_focus}}.”
- **`vehicularDamage`** — “I have concentrated on making vehicle-mounted attacks effective. I want to exploit a ship's advantages without betting everything on its guns while pursuing {{q1_focus}}.”
- **`unarmeddMastery`** — “I have invested in defending myself without depending on a weapon. I want an answer ready even if I lose every tool at hand while pursuing {{q1_focus}}.”
- **`strikeForce`** — “I have focused on delivering powerful physical strikes. I want to use a strong opening without getting trapped in a brawl while pursuing {{q1_focus}}.”
- **`flowState`** — “I have sought a rhythm in which one action naturally leads into the next. I want to stay responsive when the plan changes between one heartbeat and the next while pursuing {{q1_focus}}.”
- **`combatFlow`** — “I have learned to influence the tempo of an encounter. I want to keep opponents responding to my choices while pursuing {{q1_focus}}.”
- **`combatStamina`** — “I have trained to remain effective through prolonged exertion. I want to outlast trouble rather than gamble on one lucky move while pursuing {{q1_focus}}.”
- **`commandAuthority`** — “I have become comfortable making decisions others depend on. I want to earn trust without leaning on rank or a title while pursuing {{q1_focus}}.”
- **`formation`** — “I understand how much reliable positioning matters to a group. I want to use spacing and movement to give companions better options while pursuing {{q1_focus}}.”
- **`allySupport`** — “I have focused on making other people more effective. I want to support a teammate without drawing unnecessary attention to them while pursuing {{q1_focus}}.”
- **`moraleBonus`** — “I have put effort into helping companions stay confident. I want to keep spirits up when there's no obvious way out while pursuing {{q1_focus}}.”
- **`moraleImpact`** — “I understand how fear and resolve can change a confrontation. I want to know when a convincing show of confidence can avoid a fight while pursuing {{q1_focus}}.”
- **`stealth`** — “I have built experience in avoiding attention when it matters. I want to turn a quiet approach into a real advantage while pursuing {{q1_focus}}.”
- **`infiltration`** — “I have learned to enter difficult places without drawing a crowd. I want to slip into position and keep a safe way back while pursuing {{q1_focus}}.”
- **`trackingMastery`** — “I have invested in finding people and following traces they leave behind. I want to know how to stay a step behind without being seen while pursuing {{q1_focus}}.”
- **`deceptionMastery`** — “I have used misdirection to shape how others read a situation. I want to make a convincing story hold together under pressure while pursuing {{q1_focus}}.”
- **`knowledgeMastery`** — “I have built my decisions on study and accumulated expertise. I want to notice where specialist knowledge creates an unexpected opening while pursuing {{q1_focus}}.”
- **`skillUtility`** — “I have learned to approach problems with several practical skills. I want to keep multiple solutions ready when a single plan fails while pursuing {{q1_focus}}.”
- **`resourceControl`** — “I have spent time getting the most from limited supplies. I want to keep an emergency reserve when a job turns expensive while pursuing {{q1_focus}}.”
- **`informationControl`** — “I have learned that knowing something early can change every decision after it. I want to know what to reveal, what to verify, and what to keep quiet while pursuing {{q1_focus}}.”
- **`networkInfluence`** — “I have learned how much can depend on having the right contacts. I want to call in help without leaving people owing dangerous favors while pursuing {{q1_focus}}.”
- **`predatoryInstinct`** — “I have become alert to the weakness an opponent tries to conceal. I want to recognize an opening before it closes while pursuing {{q1_focus}}.”
- **`tacticalAwareness`** — “I have trained myself to read a tense situation quickly. I want to identify the least expected way through trouble while pursuing {{q1_focus}}.”
- **`armorMastery`** — “I have made protective equipment an important part of how I stay effective. I want to be ready when hiding or escaping stops being possible while pursuing {{q1_focus}}.”
- **`grappling`** — “I have worked on controlling a threat at arm's length. I want a way to stop someone without relying on a weapon while pursuing {{q1_focus}}.”
- **`ritualMastery`** — “I have studied the preparation and patience demanded by complex Force rituals. I want to tell useful knowledge apart from dangerous spectacle while pursuing {{q1_focus}}.”
- **`itemEnchantment`** — “I have explored how unusual powers can change the nature of an object. I want to recognize when a useful object may carry a hidden price while pursuing {{q1_focus}}.”
- **`forceArtistry`** — “I have been drawn to expressing ideas and feeling through the Force. I want to find unexpected ways to express an intention without resorting to force while pursuing {{q1_focus}}.”
- **`droidControl`** — “I have worked with systems that direct or coordinate droids. I want to know how to turn a machine's predictable behavior into an advantage while pursuing {{q1_focus}}.”
- **`hackingSkills`** — “I have learned to work through computer systems others expect to stay closed. I want a reliable way past digital obstacles without drawing attention while pursuing {{q1_focus}}.”
- **`sabotageExpertise`** — “I understand how a complex system can be disabled at its weak point. I want to use one precise disruption instead of a noisy confrontation while pursuing {{q1_focus}}.”
- **`explosiveMastery`** — “I know that controlled blasts can change a situation in an instant. I want to recognize when an explosive solution is worth the noise and risk while pursuing {{q1_focus}}.”
- **`biotechMastery`** — “My technical interests include living systems and their modification. I want to recognize when a biological solution is useful and when it is too risky while pursuing {{q1_focus}}.”
- **`geneticEngineering`** — “I have explored the possibilities and risks of changing inherited traits. I want to recognize the unintended consequences hidden in an elegant design while pursuing {{q1_focus}}.”
- **`livingWeaponCrafting`** — “I understand that biological creations can be designed for violence. I want to understand how to avoid becoming dependent on a dangerous creation while pursuing {{q1_focus}}.”
- **`biologicalControl`** — “I have studied how living creatures can be influenced or directed. I want to understand behavior well enough to avoid a needless fight while pursuing {{q1_focus}}.”
- **`surgicalMastery`** — “I have focused on precise interventions when a life may depend on them. I want to stay steady when an emergency leaves no room for guesswork while pursuing {{q1_focus}}.”
- **`healingMastery`** — “I have invested in restoring others after they are hurt. I want a way to help when a clever escape still leaves someone injured while pursuing {{q1_focus}}.”
- **`treatingInjury`** — “I have developed practical experience caring for wounds. I want to keep useful medical judgment when chaos makes planning impossible while pursuing {{q1_focus}}.”
- **`engineeringMastery`** — “I have spent time understanding how structures and systems fit together. I want to spot where a small technical change can alter an entire plan while pursuing {{q1_focus}}.”
- **`tacticalSupport`** — “I know how technical work can make a team more effective. I want to put useful devices in place before the trouble starts while pursuing {{q1_focus}}.”
- **`fortifications`** — “I have learned to make a position safer before danger arrives. I want to see how an obstacle can buy time without trapping us while pursuing {{q1_focus}}.”
- **`weaponEngineering`** — “I have worked on understanding what makes a weapon effective and reliable. I want to know when modifying equipment gives us an advantage we cannot otherwise get while pursuing {{q1_focus}}.”
- **`improvisation`** — “I have learned to find a workable answer when the original plan fails. I want to make surprises work for me instead of against me while pursuing {{q1_focus}}.”
- **`mechanicalMastery`** — “I have become comfortable diagnosing and handling complex machinery. I want to use a device's quirks to get out of trouble while pursuing {{q1_focus}}.”
- **`technicalInnovation`** — “I have enjoyed finding technical solutions that did not exist before. I want unusual devices to give me options no one expected while pursuing {{q1_focus}}.”
- **`resourcefulness`** — “I have learned to get results with whatever is at hand. I want to turn a shortage into a workable opening while pursuing {{q1_focus}}.”
- **`spacefarerMastery`** — “I have grown familiar with the demands of life and work aboard ships. I want to keep a ship useful when the voyage goes off plan while pursuing {{q1_focus}}.”
- **`smugglingExpertise`** — “I understand the practical difficulties of moving cargo without attracting attention. I want to turn careful timing and quiet movement into an advantage while pursuing {{q1_focus}}.”
- **`illegalTrade`** — “I have learned how complicated trade becomes outside recognized rules. I want to recognize a deal that brings more danger than credits while pursuing {{q1_focus}}.”
- **`evasionTactics`** — “I have worked on staying ahead of pursuit. I want to keep an exit ready before trouble arrives while pursuing {{q1_focus}}.”
- **`outlawSkills`** — “I have experience operating where ordinary protections and rules offer little help. I want to judge when an unofficial solution is the only workable one while pursuing {{q1_focus}}.”
- **`survivalism`** — “I have built my habits around enduring conditions others would avoid. I want to stay capable when supplies and safe shelter disappear while pursuing {{q1_focus}}.”
- **`criminalExpertise`** — “I understand how illicit operations hide their methods and intentions. I want to see how an illicit plan works before deciding whether to disrupt it while pursuing {{q1_focus}}.”
- **`freedomPursuit`** — “I have made escaping confinement or control an important priority. I want to keep my choices open when someone tries to close every exit while pursuing {{q1_focus}}.”
- **`explorationMastery`** — “I have been drawn to reaching places others have not understood. I want to discover opportunities the obvious routes never reveal while pursuing {{q1_focus}}.”
- **`wildernessLore`** — “I have learned to read the signs of unfamiliar natural environments. I want to find useful shelter and quiet routes when civilization offers none while pursuing {{q1_focus}}.”
- **`survivalSkills`** — “I know how much basic fieldcraft matters when conditions turn bad. I want to keep moving without ideal gear while pursuing {{q1_focus}}.”
- **`adaptability`** — “I have become used to changing my approach when circumstances change. I want to see a sudden change as a possible opportunity while pursuing {{q1_focus}}.”
- **`infiltrationMastery`** — “I have concentrated on reaching well-defended places without being discovered. I want to get where I need to be without leaving a trail of alarms while pursuing {{q1_focus}}.”
- **`identityShift`** — “I have experience changing how others recognize or understand me. I want to adopt the right cover without forgetting my real objective while pursuing {{q1_focus}}.”
- **`stealthMastery`** — “I have developed a highly deliberate approach to remaining unseen. I want to remain unnoticed even when a plan becomes complicated while pursuing {{q1_focus}}.”
- **`deadlyPrecision`** — “I have focused on striking vulnerable targets with extreme accuracy. I want to act only when the opening is worth the cost while pursuing {{q1_focus}}.”
- **`silentKill`** — “I have studied methods of ending a threat without alerting others. I want to understand the risks of relying on lethal secrecy while pursuing {{q1_focus}}.”
- **`businessAcumen`** — “I have learned to recognize the real cost and value of a deal. I want to spot the opportunity hidden in a bad bargain while pursuing {{q1_focus}}.”
- **`corporateInfluence`** — “I understand how large organizations make and resist decisions. I want to recognize which incentives make a powerful group change direction while pursuing {{q1_focus}}.”
- **`socialManipulation`** — “I have learned how carefully chosen words can alter another person's choices. I want to recognize which story a listener is already prepared to believe while pursuing {{q1_focus}}.”
- **`persuasionMastery`** — “I have become comfortable helping others see a different point of view. I want to find the words that open a door without threats while pursuing {{q1_focus}}.”
- **`conArtistry`** — “I understand how a convincing confidence scheme can draw someone in. I want to understand the risk of every story I ask someone to believe while pursuing {{q1_focus}}.”
- **`intimidation`** — “I understand how projecting danger can change someone's behavior. I want to recognize when a bluff will work without making things worse while pursuing {{q1_focus}}.”
- **`authorityPresence`** — “I know what it means to command attention when I enter a room. I want to know when being noticed helps and when I should blend in while pursuing {{q1_focus}}.”
- **`brutalForce`** — “I have relied on overwhelming force when a threat refuses to give way. I want to recognize when a threat is meant to distract me from a better option while pursuing {{q1_focus}}.”
- **`lawEnforcement`** — “I understand the practical demands of enforcing rules and keeping order. I want to recognize when a procedure can help and when it becomes an obstacle while pursuing {{q1_focus}}.”
- **`unitCoordination`** — “I have focused on making several people act as one effective unit. I want to exploit teamwork without making every plan depend on perfect timing while pursuing {{q1_focus}}.”
- **`specialOps`** — “I have experience thinking about missions where discretion and precision matter. I want to keep a quiet operation flexible when intelligence proves incomplete while pursuing {{q1_focus}}.”
- **`commandoTactics`** — “I have concentrated on small-team action under dangerous conditions. I want to use surprise without making every problem a raid while pursuing {{q1_focus}}.”
- **`rapidResponse`** — “I have trained to act quickly when the situation changes suddenly. I want to exploit the moment before an opponent regains balance while pursuing {{q1_focus}}.”
- **`tacticalVerse`** — “I have worked on meeting several different tactical demands rather than relying on one method. I want to switch approaches when an opponent expects only one trick while pursuing {{q1_focus}}.”
- **`dualistTechnique`** — “I have invested in the timing and control demanded by a duel. I want to read an opponent's habits before committing to an opening while pursuing {{q1_focus}}.”
- **`defensiveSwordsmanship`** — “I have practiced defending myself with a blade rather than chasing every opening. I want to stay safe until a better opportunity presents itself while pursuing {{q1_focus}}.”
- **`counterMastery`** — “I have focused on answering an opponent's move with a deliberate response. I want to invite a mistake without exposing myself carelessly while pursuing {{q1_focus}}.”
- **`combatAdaptability`** — “I have learned to shift techniques when an opponent changes approach. I want to keep an unfamiliar opponent from deciding the terms while pursuing {{q1_focus}}.”
- **`dualistMastery`** — “I have made one-on-one combat a significant part of my training. I want to use a duel's rhythm to control an otherwise chaotic encounter while pursuing {{q1_focus}}.”
- **`weaponVersatility`** — “I have practiced staying capable with more than one kind of weapon. I want to have a workable answer when my usual equipment is unavailable while pursuing {{q1_focus}}.”
- **`weaponMastery`** — “I have devoted considerable attention to mastering a chosen weapon. I want to find the surprising advantage hidden inside a familiar technique while pursuing {{q1_focus}}.”
- **`arenaExpertise`** — “I understand how combat changes when the ground and audience limit every choice. I want to read the rules of a confrontation before committing to it while pursuing {{q1_focus}}.”
- **`heavyWeaponMastery`** — “I have concentrated on handling weapons that bring substantial destructive power. I want to find the few moments when heavy fire changes the situation for the better while pursuing {{q1_focus}}.”
- **`quickDraw`** — “I have trained to respond before an opponent can finish making their move. I want to keep the first move without turning every disagreement into a fight while pursuing {{q1_focus}}.”
- **`precisePistolry`** — “I have developed careful aim and control with a pistol. I want to make a small weapon effective when the situation gives me little room while pursuing {{q1_focus}}.”
- **`triggerDiscipline`** — “I have trained myself to fire only when the moment is right. I want to keep my advantage without acting a moment too soon while pursuing {{q1_focus}}.”
- **`forceBond`** — “I have been shaped by a deep connection through the Force. I want to recognize when loyalty strengthens a plan and when it blinds me while pursuing {{q1_focus}}.”
- **`imperialDuty`** — “My sense of purpose has been shaped by service to Imperial authority. I want to understand when following a mission's rules becomes dangerous while pursuing {{q1_focus}}.”
- **`enforceAuthority`** — “I have experience ensuring that orders or rules are followed. I want to recognize when a firm approach will solve a problem and when it will create one while pursuing {{q1_focus}}.”
- **`forcedControl`** — “I have studied methods that compel others rather than persuade them. I want to understand when coercion will make a plan collapse later while pursuing {{q1_focus}}.”
- **`mysticalInfluence`** — “I have seen how unusual or spiritual authority can shape people's actions. I want to recognize when a reputation for strange power creates leverage while pursuing {{q1_focus}}.”
- **`medicalKnowledge`** — “I have put time into understanding injury, illness, and care. I want to be ready when an otherwise successful plan leaves someone hurt while pursuing {{q1_focus}}.”
- **`treatmentExpertise`** — “I have developed an approach to choosing appropriate care in an emergency. I want to work calmly when the situation gives me only imperfect options while pursuing {{q1_focus}}.”
- **`selfProgram`** — “I have experience changing the routines that guide my own operation. I want to adapt my own routines when the plan stops working while pursuing {{q1_focus}}.”
- **`independence`** — “I have learned to operate without constant direction from others. I want to keep enough freedom to make a useful decision when orders fail while pursuing {{q1_focus}}.”
- **`technicalMastery`** — “I have committed myself to understanding and operating sophisticated systems. I want to use complex equipment in ways that surprise an obstacle while pursuing {{q1_focus}}.”
- **`adaptiveAI`** — “My capabilities involve adjusting decisions as new information changes the problem. I want to recognize new patterns quickly and respond without waiting for a perfect plan while pursuing {{q1_focus}}.”

### Destination: Scout — 125 first-person Q2 candidates

Each bold identifier is internal only; the quoted text is the player-visible response template. Display no key labels or scores to players.

- **`forceSecret`** — “I've learned that rare Force techniques can carry consequences beyond their immediate effect. I want to recognize the warning signs around unfamiliar powers while pursuing {{q1_focus}}.”
- **`forceDC`** — “I've focused on making difficult Force effects harder to resist. I want to recognize when precision matters more than force while pursuing {{q1_focus}}.”
- **`forceRecovery`** — “I've put value on recovering strength after demanding use of the Force. I want to judge my limits before entering dangerous ground while pursuing {{q1_focus}}.”
- **`burstDamage`** — “I have concentrated on ending dangerous exchanges with one decisive burst. I want to prepare the ground so a decisive move is used only when needed while pursuing {{q1_focus}}.”
- **`singleTargetDamage`** — “My strongest approach has been bringing focused pressure against one target. I want to identify the true threat before committing to it while pursuing {{q1_focus}}.”
- **`areaDamage`** — “I have experience with attacks that can affect an entire area. I want to map danger zones before anyone enters them while pursuing {{q1_focus}}.”
- **`areaControl`** — “I have learned the value of controlling where an opponent can move. I want to spot choke points and safe passages early while pursuing {{q1_focus}}.”
- **`conditionTrack`** — “My methods have focused on steadily wearing down an opponent's effectiveness. I want to notice when danger is fading and change course while pursuing {{q1_focus}}.”
- **`counterAttack`** — “I have become attentive to openings created by an opponent's actions. I want to notice those mistakes before a situation turns against us while pursuing {{q1_focus}}.”
- **`reactionDefense`** — “I have invested in reacting quickly when danger comes without warning. I want to spot warning signs sooner so I need fewer last-second saves while pursuing {{q1_focus}}.”
- **`damageReduction`** — “I have built my approach around taking a hit and remaining effective. I want to survive harsh conditions without slowing the expedition while pursuing {{q1_focus}}.”
- **`damageMitigationAura`** — “I've focused on ways to lessen harm to people near me. I want to carry that protection into unfamiliar and exposed terrain while pursuing {{q1_focus}}.”
- **`evasion`** — “I have learned to survive by moving out of danger rather than absorbing it. I want to read terrain so I can avoid hazards before they close in while pursuing {{q1_focus}}.”
- **`accuracy`** — “I have spent time making deliberate actions land where I intend. I want observation and precision to reinforce each other while pursuing {{q1_focus}}.”
- **`critRange`** — “I have looked for techniques that create more opportunities for a telling strike. I want to observe patterns that reveal those openings while pursuing {{q1_focus}}.”
- **`critDamage`** — “I have focused on making an especially well-placed strike decisive. I want to identify vulnerable points without putting everyone at risk while pursuing {{q1_focus}}.”
- **`initiative`** — “I value acting before an opponent can seize control of events. I want to spot danger early enough to choose the first move while pursuing {{q1_focus}}.”
- **`dualWield`** — “I have practiced managing more than one weapon at once. I want to know when versatility helps and when it complicates an approach while pursuing {{q1_focus}}.”
- **`sithAlchemy`** — “My experience has involved the dangerous possibilities of dark-side alchemy. I want to recognize the signs of corrupted objects and places while pursuing {{q1_focus}}.”
- **`darkSideAffinity`** — “My path has been shaped by attraction to the dark side's power. I want to recognize how fear and anger alter judgment while pursuing {{q1_focus}}.”
- **`lightSideAffinity`** — “I have placed importance on self-control and using power responsibly. I want to let concern for others guide how I face danger while pursuing {{q1_focus}}.”
- **`formMastery`** — “I have been developing a particular discipline of lightsaber technique. I want to notice the movements and habits that give away an opponent while pursuing {{q1_focus}}.”
- **`meleeDamage`** — “I have built much of my effectiveness around fighting at close range. I want to judge when the terrain favors a close approach while pursuing {{q1_focus}}.”
- **`firepower`** — “I have relied on sustained ranged force to keep threats at a distance. I want to identify better positions and safer lines of sight while pursuing {{q1_focus}}.”
- **`pilotMastery`** — “I have developed confidence operating vehicles under difficult conditions. I want to read routes and terrain as carefully as the controls while pursuing {{q1_focus}}.”
- **`vehicularDamage`** — “I have concentrated on making vehicle-mounted attacks effective. I want to find useful firing positions without losing our escape route while pursuing {{q1_focus}}.”
- **`unarmeddMastery`** — “I have invested in defending myself without depending on a weapon. I want to travel prepared for the moments when equipment fails while pursuing {{q1_focus}}.”
- **`strikeForce`** — “I have focused on delivering powerful physical strikes. I want to judge obstacles and dangerous ground before forcing a way through while pursuing {{q1_focus}}.”
- **`flowState`** — “I have sought a rhythm in which one action naturally leads into the next. I want to read changing conditions without losing my rhythm while pursuing {{q1_focus}}.”
- **`combatFlow`** — “I have learned to influence the tempo of an encounter. I want to use timing and terrain to slow a dangerous advance while pursuing {{q1_focus}}.”
- **`combatStamina`** — “I have trained to remain effective through prolonged exertion. I want to keep moving when the journey becomes harder than expected while pursuing {{q1_focus}}.”
- **`commandAuthority`** — “I have become comfortable making decisions others depend on. I want to know when to lead and when to listen to the person who knows the ground while pursuing {{q1_focus}}.”
- **`formation`** — “I understand how much reliable positioning matters to a group. I want to recognize the route that keeps a group together and safe while pursuing {{q1_focus}}.”
- **`allySupport`** — “I have focused on making other people more effective. I want to make sure the team benefits from what I discover while pursuing {{q1_focus}}.”
- **`moraleBonus`** — “I have put effort into helping companions stay confident. I want to help people hold together on a difficult journey while pursuing {{q1_focus}}.”
- **`moraleImpact`** — “I understand how fear and resolve can change a confrontation. I want to recognize the warning signs when a group is near breaking while pursuing {{q1_focus}}.”
- **`stealth`** — “I have built experience in avoiding attention when it matters. I want to cross unfamiliar ground without announcing our presence while pursuing {{q1_focus}}.”
- **`infiltration`** — “I have learned to enter difficult places without drawing a crowd. I want to plan an approach that leaves as few traces as possible while pursuing {{q1_focus}}.”
- **`trackingMastery`** — “I have invested in finding people and following traces they leave behind. I want to follow small signs through unfamiliar territory while pursuing {{q1_focus}}.”
- **`deceptionMastery`** — “I have used misdirection to shape how others read a situation. I want to spot when someone else is leaving a false trail while pursuing {{q1_focus}}.”
- **`knowledgeMastery`** — “I have built my decisions on study and accumulated expertise. I want my research to be useful when the trail grows cold while pursuing {{q1_focus}}.”
- **`skillUtility`** — “I have learned to approach problems with several practical skills. I want to be useful wherever the expedition needs another set of hands while pursuing {{q1_focus}}.”
- **`resourceControl`** — “I have spent time getting the most from limited supplies. I want to know what an expedition needs before the supply line disappears while pursuing {{q1_focus}}.”
- **`informationControl`** — “I have learned that knowing something early can change every decision after it. I want to check reports against what the ground actually tells me while pursuing {{q1_focus}}.”
- **`networkInfluence`** — “I have learned how much can depend on having the right contacts. I want to find local guides and allies before entering unfamiliar places while pursuing {{q1_focus}}.”
- **`predatoryInstinct`** — “I have become alert to the weakness an opponent tries to conceal. I want to study a target's habits before making a move while pursuing {{q1_focus}}.”
- **`tacticalAwareness`** — “I have trained myself to read a tense situation quickly. I want to notice patterns and exits before danger closes in while pursuing {{q1_focus}}.”
- **`armorMastery`** — “I have made protective equipment an important part of how I stay effective. I want to stay mobile and useful even when I need heavier protection while pursuing {{q1_focus}}.”
- **`grappling`** — “I have worked on controlling a threat at arm's length. I want to handle a close encounter before it ruins a quiet approach while pursuing {{q1_focus}}.”
- **`ritualMastery`** — “I have studied the preparation and patience demanded by complex Force rituals. I want to recognize places where an old ritual has left its mark while pursuing {{q1_focus}}.”
- **`itemEnchantment`** — “I have explored how unusual powers can change the nature of an object. I want to identify unfamiliar relics without rushing to use them while pursuing {{q1_focus}}.”
- **`forceArtistry`** — “I have been drawn to expressing ideas and feeling through the Force. I want to notice how people and places respond to subtle influences while pursuing {{q1_focus}}.”
- **`droidControl`** — “I have worked with systems that direct or coordinate droids. I want to understand what automated helpers can tell us about a place while pursuing {{q1_focus}}.”
- **`hackingSkills`** — “I have learned to work through computer systems others expect to stay closed. I want to recognize electronic barriers before they block an expedition while pursuing {{q1_focus}}.”
- **`sabotageExpertise`** — “I understand how a complex system can be disabled at its weak point. I want to spot vulnerable infrastructure without putting civilians at risk while pursuing {{q1_focus}}.”
- **`explosiveMastery`** — “I know that controlled blasts can change a situation in an instant. I want to judge unstable ground and structures before they become hazards while pursuing {{q1_focus}}.”
- **`biotechMastery`** — “My technical interests include living systems and their modification. I want to identify biological hazards before anyone handles them while pursuing {{q1_focus}}.”
- **`geneticEngineering`** — “I have explored the possibilities and risks of changing inherited traits. I want to read biological clues carefully rather than jump to assumptions while pursuing {{q1_focus}}.”
- **`livingWeaponCrafting`** — “I understand that biological creations can be designed for violence. I want to recognize a manufactured biological threat before anyone approaches it while pursuing {{q1_focus}}.”
- **`biologicalControl`** — “I have studied how living creatures can be influenced or directed. I want to observe what a creature needs before trying to change its actions while pursuing {{q1_focus}}.”
- **`surgicalMastery`** — “I have focused on precise interventions when a life may depend on them. I want to keep companions alive far from a proper medical facility while pursuing {{q1_focus}}.”
- **`healingMastery`** — “I have invested in restoring others after they are hurt. I want to keep an expedition healthy when help is far away while pursuing {{q1_focus}}.”
- **`treatingInjury`** — “I have developed practical experience caring for wounds. I want to help a wounded companion without stopping the whole journey while pursuing {{q1_focus}}.”
- **`engineeringMastery`** — “I have spent time understanding how structures and systems fit together. I want to judge whether an unfamiliar structure can carry us safely while pursuing {{q1_focus}}.”
- **`tacticalSupport`** — “I know how technical work can make a team more effective. I want to identify where a simple improvement gives an expedition an edge while pursuing {{q1_focus}}.”
- **`fortifications`** — “I have learned to make a position safer before danger arrives. I want to choose defensible ground without losing the ability to move while pursuing {{q1_focus}}.”
- **`weaponEngineering`** — “I have worked on understanding what makes a weapon effective and reliable. I want to keep essential tools functioning far from a workshop while pursuing {{q1_focus}}.”
- **`improvisation`** — “I have learned to find a workable answer when the original plan fails. I want to adapt to unfamiliar ground using what is available while pursuing {{q1_focus}}.”
- **`mechanicalMastery`** — “I have become comfortable diagnosing and handling complex machinery. I want to keep working equipment in the field when replacement is impossible while pursuing {{q1_focus}}.”
- **`technicalInnovation`** — “I have enjoyed finding technical solutions that did not exist before. I want to solve field problems with more than the equipment we started with while pursuing {{q1_focus}}.”
- **`resourcefulness`** — “I have learned to get results with whatever is at hand. I want to get a small expedition through trouble without ideal supplies while pursuing {{q1_focus}}.”
- **`spacefarerMastery`** — “I have grown familiar with the demands of life and work aboard ships. I want to read approaches and routes before a ship reaches unfamiliar territory while pursuing {{q1_focus}}.”
- **`smugglingExpertise`** — “I understand the practical difficulties of moving cargo without attracting attention. I want to read routes and patrol patterns before a cargo run while pursuing {{q1_focus}}.”
- **`illegalTrade`** — “I have learned how complicated trade becomes outside recognized rules. I want to identify which unfamiliar contacts and routes are trustworthy while pursuing {{q1_focus}}.”
- **`evasionTactics`** — “I have worked on staying ahead of pursuit. I want to identify escape routes as carefully as the path in while pursuing {{q1_focus}}.”
- **`outlawSkills`** — “I have experience operating where ordinary protections and rules offer little help. I want to move through places where established support cannot be expected while pursuing {{q1_focus}}.”
- **`survivalism`** — “I have built my habits around enduring conditions others would avoid. I want to keep a group alive in places with little margin for error while pursuing {{q1_focus}}.”
- **`criminalExpertise`** — “I understand how illicit operations hide their methods and intentions. I want to follow the traces people leave when they think no one is looking while pursuing {{q1_focus}}.”
- **`freedomPursuit`** — “I have made escaping confinement or control an important priority. I want to recognize the routes that let people get clear safely while pursuing {{q1_focus}}.”
- **`explorationMastery`** — “I have been drawn to reaching places others have not understood. I want to read unfamiliar terrain and follow a promising lead while pursuing {{q1_focus}}.”
- **`wildernessLore`** — “I have learned to read the signs of unfamiliar natural environments. I want to interpret small changes in the land before they become danger while pursuing {{q1_focus}}.”
- **`survivalSkills`** — “I know how much basic fieldcraft matters when conditions turn bad. I want to find food, water, and safe ground when there is no easy resupply while pursuing {{q1_focus}}.”
- **`adaptability`** — “I have become used to changing my approach when circumstances change. I want to revise a route when the ground proves our assumptions wrong while pursuing {{q1_focus}}.”
- **`infiltrationMastery`** — “I have concentrated on reaching well-defended places without being discovered. I want to plan the entire approach and withdrawal before entering while pursuing {{q1_focus}}.”
- **`identityShift`** — “I have experience changing how others recognize or understand me. I want to recognize when another person is using a disguise to mislead us while pursuing {{q1_focus}}.”
- **`stealthMastery`** — “I have developed a highly deliberate approach to remaining unseen. I want to understand the ground well enough to move through it without a trace while pursuing {{q1_focus}}.”
- **`deadlyPrecision`** — “I have focused on striking vulnerable targets with extreme accuracy. I want to identify the true danger before choosing where to strike while pursuing {{q1_focus}}.”
- **`silentKill`** — “I have studied methods of ending a threat without alerting others. I want to recognize a dangerous infiltrator before anyone is hurt while pursuing {{q1_focus}}.”
- **`businessAcumen`** — “I have learned to recognize the real cost and value of a deal. I want to understand what a region needs before proposing a deal while pursuing {{q1_focus}}.”
- **`corporateInfluence`** — “I understand how large organizations make and resist decisions. I want to identify who actually controls access to a remote project while pursuing {{q1_focus}}.”
- **`socialManipulation`** — “I have learned how carefully chosen words can alter another person's choices. I want to notice when a friendly conversation is concealing pressure while pursuing {{q1_focus}}.”
- **`persuasionMastery`** — “I have become comfortable helping others see a different point of view. I want to negotiate passage or help before an expedition runs into trouble while pursuing {{q1_focus}}.”
- **`conArtistry`** — “I understand how a convincing confidence scheme can draw someone in. I want to recognize false promises before they cost the expedition time or supplies while pursuing {{q1_focus}}.”
- **`intimidation`** — “I understand how projecting danger can change someone's behavior. I want to judge whether hostile posturing is a real warning or a distraction while pursuing {{q1_focus}}.”
- **`authorityPresence`** — “I know what it means to command attention when I enter a room. I want to use a commanding presence without overlooking quieter voices while pursuing {{q1_focus}}.”
- **`brutalForce`** — “I have relied on overwhelming force when a threat refuses to give way. I want to see the dangers that cannot be overcome simply by pushing harder while pursuing {{q1_focus}}.”
- **`lawEnforcement`** — “I understand the practical demands of enforcing rules and keeping order. I want to understand local rules before they complicate a mission while pursuing {{q1_focus}}.”
- **`unitCoordination`** — “I have focused on making several people act as one effective unit. I want to learn how dispersed teams can share accurate field information while pursuing {{q1_focus}}.”
- **`specialOps`** — “I have experience thinking about missions where discretion and precision matter. I want to gather enough field evidence to prevent a blind insertion while pursuing {{q1_focus}}.”
- **`commandoTactics`** — “I have concentrated on small-team action under dangerous conditions. I want to find the route that lets a small group act and withdraw safely while pursuing {{q1_focus}}.”
- **`rapidResponse`** — “I have trained to act quickly when the situation changes suddenly. I want to recognize a developing problem before it becomes an emergency while pursuing {{q1_focus}}.”
- **`tacticalVerse`** — “I have worked on meeting several different tactical demands rather than relying on one method. I want to notice which conditions demand a different plan while pursuing {{q1_focus}}.”
- **`dualistTechnique`** — “I have invested in the timing and control demanded by a duel. I want to observe the small movements that reveal someone's intentions while pursuing {{q1_focus}}.”
- **`defensiveSwordsmanship`** — “I have practiced defending myself with a blade rather than chasing every opening. I want to recognize when a defensive stance buys time for an escape while pursuing {{q1_focus}}.”
- **`counterMastery`** — “I have focused on answering an opponent's move with a deliberate response. I want to study patterns so a counter is ready before the danger arrives while pursuing {{q1_focus}}.”
- **`combatAdaptability`** — “I have learned to shift techniques when an opponent changes approach. I want to assess a threat quickly enough to change our route or position while pursuing {{q1_focus}}.”
- **`dualistMastery`** — “I have made one-on-one combat a significant part of my training. I want to read an opponent's movements before committing to a contest while pursuing {{q1_focus}}.”
- **`weaponVersatility`** — “I have practiced staying capable with more than one kind of weapon. I want to travel prepared without carrying more than the mission demands while pursuing {{q1_focus}}.”
- **`weaponMastery`** — “I have devoted considerable attention to mastering a chosen weapon. I want to understand where my chosen weapon helps and where the terrain defeats it while pursuing {{q1_focus}}.”
- **`arenaExpertise`** — “I understand how combat changes when the ground and audience limit every choice. I want to use confined terrain without becoming trapped by it while pursuing {{q1_focus}}.”
- **`heavyWeaponMastery`** — “I have concentrated on handling weapons that bring substantial destructive power. I want to choose ground that makes heavy equipment useful without slowing us down while pursuing {{q1_focus}}.”
- **`quickDraw`** — “I have trained to respond before an opponent can finish making their move. I want to notice trouble early enough that a quick draw isn't my only answer while pursuing {{q1_focus}}.”
- **`precisePistolry`** — “I have developed careful aim and control with a pistol. I want to judge distances and cover before reaching for a sidearm while pursuing {{q1_focus}}.”
- **`triggerDiscipline`** — “I have trained myself to fire only when the moment is right. I want to verify what I'm seeing before I commit to an attack while pursuing {{q1_focus}}.”
- **`forceBond`** — “I have been shaped by a deep connection through the Force. I want to remain attentive to companions even when we are apart while pursuing {{q1_focus}}.”
- **`imperialDuty`** — “My sense of purpose has been shaped by service to Imperial authority. I want to learn how institutions affect the people we meet in the field while pursuing {{q1_focus}}.”
- **`enforceAuthority`** — “I have experience ensuring that orders or rules are followed. I want to understand local authority before forcing a confrontation while pursuing {{q1_focus}}.”
- **`forcedControl`** — “I have studied methods that compel others rather than persuade them. I want to recognize when someone is acting under another person's control while pursuing {{q1_focus}}.”
- **`mysticalInfluence`** — “I have seen how unusual or spiritual authority can shape people's actions. I want to observe how unfamiliar traditions influence a place while pursuing {{q1_focus}}.”
- **`medicalKnowledge`** — “I have put time into understanding injury, illness, and care. I want to identify health risks before an expedition runs into them while pursuing {{q1_focus}}.”
- **`treatmentExpertise`** — “I have developed an approach to choosing appropriate care in an emergency. I want to know what treatment is possible with the supplies we can carry while pursuing {{q1_focus}}.”
- **`selfProgram`** — “I have experience changing the routines that guide my own operation. I want to adjust how I operate when unfamiliar conditions demand it while pursuing {{q1_focus}}.”
- **`independence`** — “I have learned to operate without constant direction from others. I want to make sound judgments alone without losing track of the team while pursuing {{q1_focus}}.”
- **`technicalMastery`** — “I have committed myself to understanding and operating sophisticated systems. I want to keep critical systems working when specialist help is unavailable while pursuing {{q1_focus}}.”
- **`adaptiveAI`** — “My capabilities involve adjusting decisions as new information changes the problem. I want to update my approach as unfamiliar territory reveals new information while pursuing {{q1_focus}}.”

### Destination: Soldier — 125 first-person Q2 candidates

Each bold identifier is internal only; the quoted text is the player-visible response template. Display no key labels or scores to players.

- **`forceSecret`** — “I've learned that rare Force techniques can carry consequences beyond their immediate effect. I want the judgment to use exceptional abilities without losing sight of my team while pursuing {{q1_focus}}.”
- **`forceDC`** — “I've focused on making difficult Force effects harder to resist. I want to bring that precision to tense confrontations while pursuing {{q1_focus}}.”
- **`forceRecovery`** — “I've put value on recovering strength after demanding use of the Force. I want to keep contributing after the first hard exchange while pursuing {{q1_focus}}.”
- **`burstDamage`** — “I have concentrated on ending dangerous exchanges with one decisive burst. I want to make that opening count without exposing the rest of the squad while pursuing {{q1_focus}}.”
- **`singleTargetDamage`** — “My strongest approach has been bringing focused pressure against one target. I want my precision to serve a wider plan while pursuing {{q1_focus}}.”
- **`areaDamage`** — “I have experience with attacks that can affect an entire area. I want to control where force lands so my allies can move safely while pursuing {{q1_focus}}.”
- **`areaControl`** — “I have learned the value of controlling where an opponent can move. I want my battlefield positioning to open room for allies while pursuing {{q1_focus}}.”
- **`conditionTrack`** — “My methods have focused on steadily wearing down an opponent's effectiveness. I want to disable a threat efficiently and give the team room to act while pursuing {{q1_focus}}.”
- **`counterAttack`** — “I have become attentive to openings created by an opponent's actions. I want to defend the line and answer pressure at the right moment while pursuing {{q1_focus}}.”
- **`reactionDefense`** — “I have invested in reacting quickly when danger comes without warning. I want to cover the team when the first attack comes while pursuing {{q1_focus}}.”
- **`damageReduction`** — “I have built my approach around taking a hit and remaining effective. I want my resilience to give my companions a safer place to stand while pursuing {{q1_focus}}.”
- **`damageMitigationAura`** — “I've focused on ways to lessen harm to people near me. I want to make the space around me safer for allies while pursuing {{q1_focus}}.”
- **`evasion`** — “I have learned to survive by moving out of danger rather than absorbing it. I want to maneuver without leaving my companions exposed while pursuing {{q1_focus}}.”
- **`accuracy`** — “I have spent time making deliberate actions land where I intend. I want to apply that consistency under pressure while pursuing {{q1_focus}}.”
- **`critRange`** — “I have looked for techniques that create more opportunities for a telling strike. I want to give the team an advantage whenever an opening appears while pursuing {{q1_focus}}.”
- **`critDamage`** — “I have focused on making an especially well-placed strike decisive. I want my strongest attacks to serve a clear tactical purpose while pursuing {{q1_focus}}.”
- **`initiative`** — “I value acting before an opponent can seize control of events. I want to turn a fast response into an organized team response while pursuing {{q1_focus}}.”
- **`dualWield`** — “I have practiced managing more than one weapon at once. I want to make complicated weapon work reliable under pressure while pursuing {{q1_focus}}.”
- **`sithAlchemy`** — “My experience has involved the dangerous possibilities of dark-side alchemy. I want to understand the threat such creations pose before anyone faces them while pursuing {{q1_focus}}.”
- **`darkSideAffinity`** — “My path has been shaped by attraction to the dark side's power. I want to keep my choices deliberate even in a brutal fight while pursuing {{q1_focus}}.”
- **`lightSideAffinity`** — “I have placed importance on self-control and using power responsibly. I want to remember why I'm fighting when the pressure rises while pursuing {{q1_focus}}.”
- **`formMastery`** — “I have been developing a particular discipline of lightsaber technique. I want to make practiced form hold together when combat turns chaotic while pursuing {{q1_focus}}.”
- **`meleeDamage`** — “I have built much of my effectiveness around fighting at close range. I want to make the most of my reach without leaving allies unsupported while pursuing {{q1_focus}}.”
- **`firepower`** — “I have relied on sustained ranged force to keep threats at a distance. I want to coordinate effective fire rather than simply send more shots downrange while pursuing {{q1_focus}}.”
- **`pilotMastery`** — “I have developed confidence operating vehicles under difficult conditions. I want to keep the whole crew safe when the vehicle comes under pressure while pursuing {{q1_focus}}.”
- **`vehicularDamage`** — “I have concentrated on making vehicle-mounted attacks effective. I want to support coordinated vehicle combat rather than fight as a lone gunner while pursuing {{q1_focus}}.”
- **`unarmeddMastery`** — “I have invested in defending myself without depending on a weapon. I want to stay effective when a fight closes too fast for weapons while pursuing {{q1_focus}}.”
- **`strikeForce`** — “I have focused on delivering powerful physical strikes. I want to make physical force purposeful instead of wasteful while pursuing {{q1_focus}}.”
- **`flowState`** — “I have sought a rhythm in which one action naturally leads into the next. I want my timing to fit the team's movements while pursuing {{q1_focus}}.”
- **`combatFlow`** — “I have learned to influence the tempo of an encounter. I want to set a pace my allies can sustain while pursuing {{q1_focus}}.”
- **`combatStamina`** — “I have trained to remain effective through prolonged exertion. I want to remain useful when the rest of the squad is exhausted while pursuing {{q1_focus}}.”
- **`commandAuthority`** — “I have become comfortable making decisions others depend on. I want my orders to reflect the people who must carry them out while pursuing {{q1_focus}}.”
- **`formation`** — “I understand how much reliable positioning matters to a group. I want to keep a formation adaptable when plans break down while pursuing {{q1_focus}}.”
- **`allySupport`** — “I have focused on making other people more effective. I want to help the squad succeed instead of chasing only my own results while pursuing {{q1_focus}}.”
- **`moraleBonus`** — “I have put effort into helping companions stay confident. I want to keep the team focused when the odds look bad while pursuing {{q1_focus}}.”
- **`moraleImpact`** — “I understand how fear and resolve can change a confrontation. I want to keep panic from spreading through a squad while pursuing {{q1_focus}}.”
- **`stealth`** — “I have built experience in avoiding attention when it matters. I want to give the team options before the enemy knows we're there while pursuing {{q1_focus}}.”
- **`infiltration`** — “I have learned to enter difficult places without drawing a crowd. I want to prepare a team to move through defenses without unnecessary fighting while pursuing {{q1_focus}}.”
- **`trackingMastery`** — “I have invested in finding people and following traces they leave behind. I want to bring dependable target information to the squad while pursuing {{q1_focus}}.”
- **`deceptionMastery`** — “I have used misdirection to shape how others read a situation. I want to recognize deception before it puts the squad in danger while pursuing {{q1_focus}}.”
- **`knowledgeMastery`** — “I have built my decisions on study and accumulated expertise. I want to give the team reliable answers when quick decisions matter while pursuing {{q1_focus}}.”
- **`skillUtility`** — “I have learned to approach problems with several practical skills. I want to fill the gaps a small team cannot otherwise cover while pursuing {{q1_focus}}.”
- **`resourceControl`** — “I have spent time getting the most from limited supplies. I want to keep the squad operating after the easy resources run out while pursuing {{q1_focus}}.”
- **`informationControl`** — “I have learned that knowing something early can change every decision after it. I want to turn reliable intelligence into timely action while pursuing {{q1_focus}}.”
- **`networkInfluence`** — “I have learned how much can depend on having the right contacts. I want dependable support behind the team when we're far from home while pursuing {{q1_focus}}.”
- **`predatoryInstinct`** — “I have become alert to the weakness an opponent tries to conceal. I want to identify the threat's weak point and use it only when the team is ready while pursuing {{q1_focus}}.”
- **`tacticalAwareness`** — “I have trained myself to read a tense situation quickly. I want to keep track of allies, threats, and opportunities at the same time while pursuing {{q1_focus}}.”
- **`armorMastery`** — “I have made protective equipment an important part of how I stay effective. I want to make armor work for the mission instead of slowing the team while pursuing {{q1_focus}}.”
- **`grappling`** — “I have worked on controlling a threat at arm's length. I want to secure a dangerous opponent while the squad deals with the wider threat while pursuing {{q1_focus}}.”
- **`ritualMastery`** — “I have studied the preparation and patience demanded by complex Force rituals. I want to prepare carefully before unusual powers become a battlefield threat while pursuing {{q1_focus}}.”
- **`itemEnchantment`** — “I have explored how unusual powers can change the nature of an object. I want to judge what specialized equipment can and cannot safely do while pursuing {{q1_focus}}.”
- **`forceArtistry`** — “I have been drawn to expressing ideas and feeling through the Force. I want to keep creativity alive even when discipline and danger demand my attention while pursuing {{q1_focus}}.”
- **`droidControl`** — “I have worked with systems that direct or coordinate droids. I want droid support to fit safely into the team's movements while pursuing {{q1_focus}}.”
- **`hackingSkills`** — “I have learned to work through computer systems others expect to stay closed. I want to neutralize digital threats before they endanger the squad while pursuing {{q1_focus}}.”
- **`sabotageExpertise`** — “I understand how a complex system can be disabled at its weak point. I want to stop a dangerous device before it becomes a fight while pursuing {{q1_focus}}.”
- **`explosiveMastery`** — “I know that controlled blasts can change a situation in an instant. I want to use that knowledge to open a route without endangering the team while pursuing {{q1_focus}}.”
- **`biotechMastery`** — “My technical interests include living systems and their modification. I want to understand what a biological threat requires before the squad confronts it while pursuing {{q1_focus}}.”
- **`geneticEngineering`** — “I have explored the possibilities and risks of changing inherited traits. I want to anticipate what engineered organisms may do under stress while pursuing {{q1_focus}}.”
- **`livingWeaponCrafting`** — “I understand that biological creations can be designed for violence. I want to prepare the team to face an unfamiliar living threat while pursuing {{q1_focus}}.”
- **`biologicalControl`** — “I have studied how living creatures can be influenced or directed. I want to keep the team safe without making every animal an enemy while pursuing {{q1_focus}}.”
- **`surgicalMastery`** — “I have focused on precise interventions when a life may depend on them. I want to make urgent treatment possible even under pressure while pursuing {{q1_focus}}.”
- **`healingMastery`** — “I have invested in restoring others after they are hurt. I want to protect the squad both during and after danger while pursuing {{q1_focus}}.”
- **`treatingInjury`** — “I have developed practical experience caring for wounds. I want to stabilize people quickly when the fight does not pause for us while pursuing {{q1_focus}}.”
- **`engineeringMastery`** — “I have spent time understanding how structures and systems fit together. I want engineering knowledge to support a reliable position and a safe withdrawal while pursuing {{q1_focus}}.”
- **`tacticalSupport`** — “I know how technical work can make a team more effective. I want to combine equipment and positioning to support allies while pursuing {{q1_focus}}.”
- **`fortifications`** — “I have learned to make a position safer before danger arrives. I want to make a position hold without sacrificing a safe exit while pursuing {{q1_focus}}.”
- **`weaponEngineering`** — “I have worked on understanding what makes a weapon effective and reliable. I want to make the team's weapons dependable instead of merely impressive while pursuing {{q1_focus}}.”
- **`improvisation`** — “I have learned to find a workable answer when the original plan fails. I want to keep the squad effective when orders no longer fit the situation while pursuing {{q1_focus}}.”
- **`mechanicalMastery`** — “I have become comfortable diagnosing and handling complex machinery. I want to stop mechanical failures from becoming battlefield disasters while pursuing {{q1_focus}}.”
- **`technicalInnovation`** — “I have enjoyed finding technical solutions that did not exist before. I want practical innovation to give the team new choices under pressure while pursuing {{q1_focus}}.”
- **`resourcefulness`** — “I have learned to get results with whatever is at hand. I want to make limited equipment count for the whole squad while pursuing {{q1_focus}}.”
- **`spacefarerMastery`** — “I have grown familiar with the demands of life and work aboard ships. I want shipboard experience to support the crew when danger closes in while pursuing {{q1_focus}}.”
- **`smugglingExpertise`** — “I understand the practical difficulties of moving cargo without attracting attention. I want to get people and supplies through a dangerous approach while pursuing {{q1_focus}}.”
- **`illegalTrade`** — “I have learned how complicated trade becomes outside recognized rules. I want to keep questionable cargo from placing the entire team at risk while pursuing {{q1_focus}}.”
- **`evasionTactics`** — “I have worked on staying ahead of pursuit. I want to break contact without leaving companions behind while pursuing {{q1_focus}}.”
- **`outlawSkills`** — “I have experience operating where ordinary protections and rules offer little help. I want to make sound decisions when help and authority are far away while pursuing {{q1_focus}}.”
- **`survivalism`** — “I have built my habits around enduring conditions others would avoid. I want the squad to remain effective when the environment becomes another enemy while pursuing {{q1_focus}}.”
- **`criminalExpertise`** — “I understand how illicit operations hide their methods and intentions. I want to recognize threats that won't announce themselves as enemies while pursuing {{q1_focus}}.”
- **`freedomPursuit`** — “I have made escaping confinement or control an important priority. I want to help companions break free without leaving anyone behind while pursuing {{q1_focus}}.”
- **`explorationMastery`** — “I have been drawn to reaching places others have not understood. I want to make the path safe before bringing the rest of the team forward while pursuing {{q1_focus}}.”
- **`wildernessLore`** — “I have learned to read the signs of unfamiliar natural environments. I want to keep the team from overlooking threats hidden in the landscape while pursuing {{q1_focus}}.”
- **`survivalSkills`** — “I know how much basic fieldcraft matters when conditions turn bad. I want to keep the squad capable when the environment wears us down while pursuing {{q1_focus}}.”
- **`adaptability`** — “I have become used to changing my approach when circumstances change. I want to adjust tactics quickly while keeping the squad together while pursuing {{q1_focus}}.”
- **`infiltrationMastery`** — “I have concentrated on reaching well-defended places without being discovered. I want to give the squad an advantage without wasting lives on a frontal attack while pursuing {{q1_focus}}.”
- **`identityShift`** — “I have experience changing how others recognize or understand me. I want to keep disguises from becoming a weakness in the team's plan while pursuing {{q1_focus}}.”
- **`stealthMastery`** — “I have developed a highly deliberate approach to remaining unseen. I want to secure a position before the enemy realizes anyone is there while pursuing {{q1_focus}}.”
- **`deadlyPrecision`** — “I have focused on striking vulnerable targets with extreme accuracy. I want each precise strike to support the squad's objective while pursuing {{q1_focus}}.”
- **`silentKill`** — “I have studied methods of ending a threat without alerting others. I want to protect the team from threats that strike without warning while pursuing {{q1_focus}}.”
- **`businessAcumen`** — “I have learned to recognize the real cost and value of a deal. I want to see how supply and cost affect the team's choices while pursuing {{q1_focus}}.”
- **`corporateInfluence`** — “I understand how large organizations make and resist decisions. I want to understand the institutions behind a conflict before we fight their agents while pursuing {{q1_focus}}.”
- **`socialManipulation`** — “I have learned how carefully chosen words can alter another person's choices. I want to avoid allowing a smooth talker to steer the squad into danger while pursuing {{q1_focus}}.”
- **`persuasionMastery`** — “I have become comfortable helping others see a different point of view. I want to resolve a confrontation before anyone needs to fire while pursuing {{q1_focus}}.”
- **`conArtistry`** — “I understand how a convincing confidence scheme can draw someone in. I want to keep the squad from walking into a trap disguised as an opportunity while pursuing {{q1_focus}}.”
- **`intimidation`** — “I understand how projecting danger can change someone's behavior. I want to end a standoff decisively without pushing it into unnecessary violence while pursuing {{q1_focus}}.”
- **`authorityPresence`** — “I know what it means to command attention when I enter a room. I want my presence to steady allies rather than simply impress enemies while pursuing {{q1_focus}}.”
- **`brutalForce`** — “I have relied on overwhelming force when a threat refuses to give way. I want to keep power under control so it does not put my squad at risk while pursuing {{q1_focus}}.”
- **`lawEnforcement`** — “I understand the practical demands of enforcing rules and keeping order. I want to protect others without mistaking authority for a blank check while pursuing {{q1_focus}}.”
- **`unitCoordination`** — “I have focused on making several people act as one effective unit. I want to keep the squad synchronized even when communication breaks down while pursuing {{q1_focus}}.”
- **`specialOps`** — “I have experience thinking about missions where discretion and precision matter. I want a clear objective and a safe extraction plan while pursuing {{q1_focus}}.”
- **`commandoTactics`** — “I have concentrated on small-team action under dangerous conditions. I want each squad member to know the plan and the fallback while pursuing {{q1_focus}}.”
- **`rapidResponse`** — “I have trained to act quickly when the situation changes suddenly. I want a coordinated first response instead of several competing reactions while pursuing {{q1_focus}}.”
- **`tacticalVerse`** — “I have worked on meeting several different tactical demands rather than relying on one method. I want to give the team options across more than one kind of fight while pursuing {{q1_focus}}.”
- **`dualistTechnique`** — “I have invested in the timing and control demanded by a duel. I want to maintain control in a close fight without losing awareness of allies while pursuing {{q1_focus}}.”
- **`defensiveSwordsmanship`** — “I have practiced defending myself with a blade rather than chasing every opening. I want to hold a threatened position without drawing companions into unnecessary danger while pursuing {{q1_focus}}.”
- **`counterMastery`** — “I have focused on answering an opponent's move with a deliberate response. I want to defend my companions and answer only when the opening is real while pursuing {{q1_focus}}.”
- **`combatAdaptability`** — “I have learned to shift techniques when an opponent changes approach. I want to adjust my role in the squad as conditions shift while pursuing {{q1_focus}}.”
- **`dualistMastery`** — “I have made one-on-one combat a significant part of my training. I want to stay aware of the wider fight even when facing one dangerous adversary while pursuing {{q1_focus}}.”
- **`weaponVersatility`** — “I have practiced staying capable with more than one kind of weapon. I want to fill whichever weapons role the squad needs while pursuing {{q1_focus}}.”
- **`weaponMastery`** — “I have devoted considerable attention to mastering a chosen weapon. I want reliable mastery to anchor the squad when the fight turns chaotic while pursuing {{q1_focus}}.”
- **`arenaExpertise`** — “I understand how combat changes when the ground and audience limit every choice. I want to keep a plan when space is tight and retreat is difficult while pursuing {{q1_focus}}.”
- **`heavyWeaponMastery`** — “I have concentrated on handling weapons that bring substantial destructive power. I want to give the squad support without endangering the people we're protecting while pursuing {{q1_focus}}.”
- **`quickDraw`** — “I have trained to respond before an opponent can finish making their move. I want my response to protect allies rather than start a firefight too soon while pursuing {{q1_focus}}.”
- **`precisePistolry`** — “I have developed careful aim and control with a pistol. I want to use accurate close-range fire without interfering with the squad while pursuing {{q1_focus}}.”
- **`triggerDiscipline`** — “I have trained myself to fire only when the moment is right. I want my fire to be controlled enough that allies can trust it while pursuing {{q1_focus}}.”
- **`forceBond`** — “I have been shaped by a deep connection through the Force. I want to turn that connection into steadiness for people who depend on me while pursuing {{q1_focus}}.”
- **`imperialDuty`** — “My sense of purpose has been shaped by service to Imperial authority. I want to carry out obligations without surrendering my judgment while pursuing {{q1_focus}}.”
- **`enforceAuthority`** — “I have experience ensuring that orders or rules are followed. I want to keep order without treating every refusal as an enemy action while pursuing {{q1_focus}}.”
- **`forcedControl`** — “I have studied methods that compel others rather than persuade them. I want to protect the squad from threats that strip people of their choices while pursuing {{q1_focus}}.”
- **`mysticalInfluence`** — “I have seen how unusual or spiritual authority can shape people's actions. I want to know when an enemy's mystique is affecting the squad more than its actual strength while pursuing {{q1_focus}}.”
- **`medicalKnowledge`** — “I have put time into understanding injury, illness, and care. I want to help the squad recognize when a wounded companion needs immediate attention while pursuing {{q1_focus}}.”
- **`treatmentExpertise`** — “I have developed an approach to choosing appropriate care in an emergency. I want to keep effective first response close to the front line while pursuing {{q1_focus}}.”
- **`selfProgram`** — “I have experience changing the routines that guide my own operation. I want to make my adjustments reliable under battlefield pressure while pursuing {{q1_focus}}.”
- **`independence`** — “I have learned to operate without constant direction from others. I want to act decisively when I cannot wait for instructions while pursuing {{q1_focus}}.”
- **`technicalMastery`** — “I have committed myself to understanding and operating sophisticated systems. I want to make reliable technology part of the squad's plan while pursuing {{q1_focus}}.”
- **`adaptiveAI`** — “My capabilities involve adjusting decisions as new information changes the problem. I want to adapt to changing conditions while keeping my teammates informed while pursuing {{q1_focus}}.”

### Validation and acceptance record

- Mechanical bias source keys: **125 / 125** (one-to-one, exact spelling, canonical source order).
- Destination classes: **5 / 5**.
- First-person answer templates: **625 / 625**; unique stable IDs **625**; unique authored text **625**.
- Substitution slot: exactly one `{{q1_focus}}` per response. Current evidence and player preference remain distinct. This check establishes **editorial coverage**, not mechanical correctness, runtime quality, tone approval, or Source→Tag→Actor provenance certification.
- **Editorial follow-up:** read all 625 statements in the actual Mentor UI with realistic Q1 noun phrases; flag contextually incongruent or repetitive choices. Keep core Q2 Mentor opening lines fixed per Mentor; do not invent per-tag Mentor dialogue.

## Change log, continued — Q2 625 dialogue library

- **2026-11-14 — Owner-directed full 125×5 Q2 library:** Added a full local, unapproved 625-row first-person dialogue lookup keyed to the existing 125 mechanical-bias keys and five foundation destination classes. These are current-build integration responses with a bounded Q1 future-focus phrase slot, not a new mechanical scoring algorithm. No GitHub commit, push, PR, or production code modification.

---

## Q3 — OWNER-APPROVED INVESTMENT-DEPTH DESIGN (2026-11-14, LOCAL)

**Approval status:** OWNER-APPROVED **design and player-facing wording**, not implemented or runtime-verified. Supersedes the earlier Q3 working proposal. Retain the existing prestige survey's accessible Dip/Dive/Swim presentation and educational detail-rail pattern; adapt it for **foundation-class multiclassing**, rather than copying prestige-specific mechanics.

### Verified implementation starting point (read-only)

- `scripts/mentor/mentor-survey/definition-builder.js`, `prestigeQuestions(...).commitmentDepth`: existing prestige survey offers `dip`, `dive`, `swim`, and `bridge` with accessible descriptions, detail rails, and planning metadata.
- `scripts/apps/progression-framework/steps/prestige-survey-step.js`: prestige commitment affects advice through weights and prior-identity retention; these particular numeric multipliers and pruning effects are **not** approved for multiclassing.
- `scripts/mentor/mentor-survey/base-class-survey-definitions.js`: existing base-class survey does **not** yet include a separate depth question. The approved design is for future implementation, not a claim that this functionality is already active.
- The five fixed destination Mentor Q3 introductions are already authored above and remain the intended voice lines: **Miraj, J0-N1, Ol' Salty, Lead, Breach**. Their wording is a separate draft/voice review until explicitly approved; do not replace them with tag-generated Mentor dialogue.

### Q3 question and selectable answers — approved

**Player-facing intent:** “How deeply do I intend to pursue this new class?” This is a plan, not a contract or a class-level quota. Each answer appears as first-person player-character speech. The Dip/Dive/Swim/Undecided labels may be educational UI labels but must not be the only player-readable meaning.

| Stable response ID | Planning intent | Player-visible first-person response | Detail rail (educational, not a promised outcome) |
|---|---|---|---|
| `dip` | Focused, limited investment | “I want to learn a few useful things from this path, without making it the center of my training.” | Favor useful near-term opportunities that complement existing development; no commitment to a specific number of class levels. |
| `dive` | Sustained secondary discipline | “I want to spend real time developing this discipline and see how far I can take it.” | Consider coherent class development over multiple future choices without assuming this class replaces prior training or long-term goals. |
| `swim` | Major long-term class priority | “I want this discipline to become a major part of how I grow and what I can do.” | Give additional planning emphasis to deeper investment and class-defining options, subject to eligibility and future choices; not an automatic career change. |
| `undecided` | No depth preference | “I haven't decided how deeply I want to study this yet. I'd rather see where the training takes me.” | Leave investment depth open. Do not infer Dip, Pivot, rejection, weak conviction about Q1, or a numeric planning commitment. |

### Integration contract — approved behavior, implementation pending

1. **Sequence and information roles:** Q1 = future capability sought; Q2 = present build strengths tied to Q1, derived from the existing Suggestion Engine's top four scored mechanical biases; Q3 = the player's **separate declared intended investment depth**. Q3 does not choose a new class specialty, re-score those four mechanical tags, or re-ask Q1/Q2.
2. **No invented score authority:** Reuse the current suggestion/identity/planning services for reading current build and evaluating legal options. Store Q3 as a distinct intent field, not as an invented mechanical tag, role tag, feat/talent ownership record, or newly authored numeric multiplier. Any translation into ranking adjustments is subject to future calibration and tests.
3. **Bridge is purpose, not depth:** Do not show `bridge` as a Q3 investment-depth answer in multiclass. A player may take a Dip, Dive, or Swim **for a Bridge purpose** toward an explicitly declared further career/prestige goal; future-route and prerequisite planning remain separate signals. Do not assume eligibility merely from aspiration.
4. **No fixed level thresholds:** Dip/Dive/Swim have no hard-coded 1–2, 3–5, or end-to-level-20 mandates. Actual class levels remain observed mechanics; Q3 remains a date/level-scoped self-report. The player can later choose differently without breaking chargen or falsifying earlier answers.
5. **No identity erasure:** Neither Dive nor Swim may automatically demote prior classes, overwrite the declared Level 1 career/Q5 ambition, or prune acquired skill/feat/talent evidence. The existing prestige survey's `prestigeWeight`/`oldIdentityRetention` arithmetic is not transplanted into Q3. Explicit career-change confirmation must be separate.
6. **Persistence boundary:** On completed survey only, record `{ questionId: 'investmentDepth', answerId: 'dip'|'dive'|'swim'|'undecided', declaredClassInvestmentDepth: 'dip'|'dive'|'swim'|null, destinationClassId, surveyDefinitionVersion, completedAt, completedAtLevel, provenance: 'player_declared_multiclass_q3' }` as a proposed event payload; this is a **design contract**, not a verified runtime API or new actor schema. Draft, back-navigation, or skipped answers create no durable preference. Retakes preserve historical completed events with correction/supersession as designed.
7. **Planning and recommendations:** Dip favors efficient *legal* near-term candidates; Dive favors internally coherent future class options; Swim allows a longer-horizon class investment emphasis; Undecided applies no depth-driven ranking change. The exact weighting formula and horizon limits remain open and require tested calibration; an aspiration must never turn an illegal candidate into a legal one.
8. **UI/voice and safety:** Present the four first-person answers and their distinct educational details after the destination Mentor's already authored Q3 introduction. The player sees no scoring coefficients, hidden ontology keys, ranking internals, or assumptions about specific future class levels. No answer blocks progression or makes an automatic selection.
9. **Cross-class consistency:** Use the same four Q3 answer IDs and meanings for every transition among the five foundation classes; class-specific personality is confined to the Mentor's introduction. In contrast to Q2, **no 125-tag response library is needed** for Q3.

### Acceptance checks for future implementation

- All five destination Mentors present the same four answer choices and the correct Mentor-specific Q3 introduction across all 20 directed two-class transitions; multiclass with 3+ existing foundation classes still works.
- `undecided` produces **no** depth commitment; it does not default to Dip or suppress Q1/Q2 signals.
- The same actor build and Q1/Q2 answers produce the same mechanical preference evidence regardless of Q3; Q3 only changes allowed depth-planning emphasis in appropriately calibrated advice.
- Swim does not automatically change a declared career, cancel an aspiration, erase previous class levels, or lower acquired-mechanics authority; Bridge intent is a separate field/route.
- Later actual class-level distributions can diverge from the declared Dip/Dive/Swim without corruption. Backtracking, retaking, partial surveys and duplicate renders do not double-write intent.
- Any future recommendation advice remains based on current authoritative prerequisite checks and displays no inaccessible mechanics as granted.

**Owner decision:** APPROVED Q3 copy and behavior, 2026-11-14. **Next design work item: Q4 Applied Scenario.** Q4 is intentionally *not* drafted or changed in this approval pass. **Repository and Foundry runtime unchanged.**

## Change log, continued — Q3 approval

- **2026-11-14:** Owner approved preserving the existing prestige-style Dip/Dive/Swim experience for multiclass Q3, using `undecided` rather than `bridge` as its fourth investment-depth option. Recorded finalized first-person responses, distinct detail-rail explanations, runtime integration boundaries, and acceptance checks. No GitHub commit/push or production code edits.


---

## Q4 — OWNER-APPROVED SCENARIO ARCHITECTURE + AUTHORING SEED LIBRARY (2026-11-14, LOCAL)

**Status:** Owner approved the Q4 scenario-based design on 2026-11-14. This entry makes its selection, evidence, and presentation contracts explicit and provides **36 fully authored scenario/response seed records**, mapping every one of the **100 substantive Q1 responses across 20 directed class transitions** to a relevant seed. These 36 seeds are a testable first tranche, **not** the complete proposed 150–250-scene production library. All copy is a working draft pending line-level editorial review and runtime/canonical certification. No Foundry or GitHub changes.

### Owner-approved principles

1. Q4 is **one meaningful applied scenario**, not another statement of future specialization or current build strength. Its distinct signal is **the preferred method of acting under pressure**.
2. Scene selection depends primarily on the **exact selected Q1 answer** (mapped to a destination-specific capability family). Q2 supplies the player-chosen current mechanical strength, used **only when verified current-build evidence warrants contextual flavor** or to choose among equally relevant scenario variants. Q3 Dip/Dive/Swim is **not** a reason to change scenario or retroactively assume skill ownership.
3. The destination Mentor retains their established **fixed Q4 introduction**. The scenario itself is separately authored in that Mentor's voice; the engine must never improvise new lore, dialogue, mechanical claims, or a purported relationship.
4. Five distinct **first-person** player approaches plus a neutral **“I'm not sure”** option. Do not imply one response is objectively right, or assign alignment/morality/personality judgments from a single scenario answer.
5. No player response may claim an unowned feat, trained skill, Force power, talent, or class feature. They can express intent to investigate, consult, protect, plan, communicate, coordinate, maneuver, negotiate, or attempt an ordinary task subject to the rules.
6. Maintain provenance separation: Q1 future interest, Q2 selected current tag evidence, Q3 depth intent, Q4 method preference, L1 declared career, Q6 inferred current identity/correction, and actual actor ownership are different channels. **Do not count repeated semantic overlap as independent proof of the same interest.**
7. Q4 choice is narrative/declarative evidence for later recommendations; it never runs a game mechanic, grants an ability, validates eligibility, changes career, or automatically changes any feat or talent selection.

### Read-only runtime candidate contract (design, not verified API)

```json
{
  "destinationClassId": "scout",
  "originClassId": "soldier",
  "q1AnswerId": "q1_soldier_to_scout_1",
  "q1CapabilityFamilyId": "scout.tracking",
  "q2SelectedMechanicalBiasKey": "accuracy",
  "q2EvidenceRefs": ["<exact-actor-acquired-item-id-if-verified>"],
  "q3DeclaredDepth": "dive",
  "scenarioId": "q4.scout.tracking.seed01",
  "playerAnswerId": "q4.scout.tracking.seed01.method03",
  "declaredMethodSignal": "<canonical-method-ref-to-be-certified>",
  "evidenceSource": "player_declared_multiclass_q4",
  "recordedOn": "survey_completion_only"
}
```

**Important:** `q2SelectedMechanicalBiasKey` is the specific one among the top-four Q2 choices that the player **selected**. Do not substitute all four tags as Q4 character facts, nor confuse the Suggestion Engine's inferred key weights with owned abilities. The JSON illustrates a proposed evidence record; its field names are not established runtime persistence authority.

### Q1 route → Q4 scenario-family mapping (all 100 substantive selections)

**Notation:** Values are the family keys for Q1 answers **1, 2, 3, 4, 5** in that origin/destination bank. The sixth undecided Q1 answer is deliberately excluded: it invokes a neutral destination-class scenario from the seed collection, without manufacturing a desired capability. Actual implementation must use stable Q1 response IDs and an explicit mapping table, not rely on UI positions.

| Entering | Previous class | Q1 #1 | Q1 #2 | Q1 #3 | Q1 #4 | Q1 #5 |
|---|---|---|---|---|---|---|
| Noble | Jedi | `influence` | `leadership` | `inspiration` | `knowledge` | `connections` |
| Noble | Scoundrel | `influence` | `leadership` | `connections` | `knowledge` | `inspiration` |
| Noble | Scout | `leadership` | `influence` | `inspiration` | `connections` | `knowledge` |
| Noble | Soldier | `leadership` | `inspiration` | `influence` | `connections` | `fencing` |
| Jedi | Noble | `consular` | `saber_defense` | `force_ally` | `sense` | `alter` |
| Jedi | Scoundrel | `conceal` | `saber_finesse` | `consular` | `sense` | `alter` |
| Jedi | Scout | `sense` | `alter_mobility` | `saber_defense` | `force_ally` | `conceal` |
| Jedi | Soldier | `saber_finesse` | `saber_defense` | `force_ally` | `alter` | `consular` |
| Scout | Jedi | `tracking` | `stealth` | `terrain` | `vehicles` | `recon` |
| Scout | Noble | `tracking` | `stealth` | `terrain` | `vehicles` | `recon` |
| Scout | Scoundrel | `tracking` | `stealth` | `terrain` | `vehicles` | `recon` |
| Scout | Soldier | `tracking` | `stealth` | `terrain` | `techrepair` | `recon` |
| Soldier | Jedi | `weapon` | `armor` | `unarmed` | `defense_ally` | `tactics` |
| Soldier | Noble | `weapon` | `armor` | `precision` | `tactics` | `defense_ally` |
| Soldier | Scoundrel | `precision` | `unarmed` | `armor` | `defense_ally` | `demolitions` |
| Soldier | Scout | `precision` | `ambush` | `defense_ally` | `armor` | `fieldmed` |
| Scoundrel | Jedi | `disguise` | `tech` | `opportunist` | `spacer` | `fortune` |
| Scoundrel | Noble | `disguise` | `tech` | `opportunist` | `contacts` | `spacer` |
| Scoundrel | Scout | `disguise` | `tech` | `opportunist` | `spacer` | `fortune` |
| Scoundrel | Soldier | `opportunist` | `evasive` | `tech` | `contacts` | `spacer` |

**Undecided Q1 route:** choose a low-assumption scenario in the same destination class whose situation is understandable without specialist training; do not tag the selection as a future mechanical interest. Avoid repetitive reuse if the character retakes an incomplete survey. **Q2 uncertainty:** if no verified actor evidence supports the selected Q2 response, select the same Q1-linked scenario without a Q2-specific insertion.

### Candidate selection and response signal rules

- Resolve the Q1 answer's **verified origin/class/answer ID → family ID** first; never infer the family from vague text similarity at runtime. Filter authored scenarios to the destination class and that family. Sample from eligible, authored candidates in a stable, reproducible order using survey-instance seed/version. Reopening the same unchanged draft must display the same scene.
- If several scenarios have equal family relevance, use only the **existing engine's** Q2 tag score/evidence to choose more fitting contextual settings. Do **not** create a second scoring model or numeric weights. When no supporting evidence or Q1 was undecided, return a valid generalist scenario, not a fabricated specialization.
- Q4 choice should express **one new method preference** such as investigate, coordinate, negotiate, defend, improvise, seek safe alternative. The exact mechanical/semantic tag assignment per option is a **future certified authoring pass** against the 190-tag ontology and applicable mechanical records. The seed options below are intentionally text-only pending that pass; do not auto-map them to new bias keys by string matching.
- Do not add a generic score for answering Q4, punish neutrality, treat nonchosen methods as rejected, or multiply Q1/Q2 signals merely because they appear again in the scenario. Q4 may reinforce a method only when the player explicitly selects it; keep event provenance separate from pre-existing bias evidence.
- If the participant changes Q1 or Q2 before Q4 completion, **invalidate the Q4 draft selection** and regenerate/reselect for the new stable context; show what changed to the player. Back-navigation without changing upstream answers retains the same question. Record durable Q4 intent only on fully completed survey. History is append-only across completed retakes.
- Prefer case-specific Q4 scenarios with limited, meaningful context. Avoid pretending the character actually participated in a campaign event, knows an NPC, or possesses an ability solely from a hypothetical. A no-trick answer and a no-combat answer should remain credible where the stakes allow.

### Fully authored seed scenario library — 36 capability families

**Authoring pattern:** One carefully scoped, voice-specific situation for each family, five distinct first-person methods, plus neutral. The seed record is routed to every matching Q1 selection in the explicit table above. Later expansion should provide at least four further *distinct* scenes per family to reach **180 authored scenarios**, while retaining these 36 seed IDs and the exact Q1 mappings. The number 180 is a planning target, not a current completion claim.

#### `q4.noble.influence.seed01` — The fragile agreement

**Destination:** Noble · **Q1 family:** `influence` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario: Two settlement leaders are prepared to sign a truce, Master, but one has just accused the other of hiding essential supplies. Their representatives are losing patience. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would speak with each leader separately to learn what they actually fear losing.”
2. **`method02`** — “I would ask them to identify one verifiable condition that would let negotiations continue.”
3. **`method03`** — “I would bring in a trusted neutral witness so neither side feels trapped by the other's account.”
4. **`method04`** — “I would focus first on keeping their followers calm before returning to the agreement.”
5. **`method05`** — “I would investigate the missing supplies before putting my name behind either claim.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.noble.leadership.seed01` — The divided response

**Destination:** Noble · **Q1 family:** `leadership` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario: An evacuation team has three capable volunteers, Master. Each proposes a different route, and precious minutes are being lost in argument. No one has accepted responsibility for the final decision. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would define the immediate goal and assign each volunteer a clear responsibility.”
2. **`method02`** — “I would ask each volunteer to explain the strongest risk in the route they oppose before choosing.”
3. **`method03`** — “I would make a decision promptly and explain what evidence would cause us to change course.”
4. **`method04`** — “I would divide the team into complementary tasks so no useful expertise goes to waste.”
5. **`method05`** — “I would find a way for the team to agree on a decision-maker before we move.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.noble.inspiration.seed01` — After the setback

**Destination:** Noble · **Q1 family:** `inspiration` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario: An exhausted rescue crew has failed to reach a trapped family on its first attempt, Master. The next opportunity is approaching, but the crew's confidence has collapsed. What would you do?'

**Player choices:**

1. **`method01`** — “I would ask each person what went wrong and help turn the answers into a workable second attempt.”
2. **`method02`** — “I would take a difficult task myself to show the others we are still moving forward.”
3. **`method03`** — “I would remind the group whom we are trying to reach and why their work matters.”
4. **`method04`** — “I would move the most overwhelmed crew members into roles they can manage and support.”
5. **`method05`** — “I would insist on a brief rest and a clearer plan before asking anyone to risk another attempt.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.noble.knowledge.seed01` — The forgotten statute

**Destination:** Noble · **Q1 family:** `knowledge` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario: A local official invokes an obscure emergency regulation to confiscate medical supplies, Master. The regulation sounds authentic, but its application is disputed. The clinic is running out of time. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would research the regulation's original purpose and whether the emergency condition truly applies.”
2. **`method02`** — “I would interview people who have dealt with this rule before and compare their accounts.”
3. **`method03`** — “I would negotiate a temporary release of supplies while the legal question is settled.”
4. **`method04`** — “I would look for another lawful source of medicine so the clinic is not dependent on the dispute.”
5. **`method05`** — “I would document the official's claim and arrange for someone with recognized authority to review it.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.noble.connections.seed01` — The missing shipment

**Destination:** Noble · **Q1 family:** `connections` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario: A relief shipment is held at a busy orbital port, Master. No single office admits responsibility, and a remote colony needs the cargo urgently. Which avenue would you pursue?'

**Player choices:**

1. **`method01`** — “I would use trusted contacts to find the person who can actually authorize its release.”
2. **`method02`** — “I would secure an alternative supplier before the delay turns into a shortage.”
3. **`method03`** — “I would meet the port officials and identify the paperwork or concessions that would move the shipment.”
4. **`method04`** — “I would organize the colony's needs into a clear request that potential allies could support.”
5. **`method05`** — “I would investigate why the shipment was delayed before asking anyone to spend favors on it.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.noble.fencing.seed01` — The guarded passage

**Destination:** Noble · **Q1 family:** `fencing` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario: You must pass an armed guard to reach an injured ally, Master. The guard is alert but not yet attacking; the corridor leaves little room to maneuver. What would you attempt?'

**Player choices:**

1. **`method01`** — “I would try to talk the guard into letting me reach the injured person.”
2. **`method02`** — “I would look for an opening to move past without committing to a prolonged fight.”
3. **`method03`** — “I would position myself defensively and focus on keeping the guard away from the injured person.”
4. **`method04`** — “I would draw the guard's attention while a companion approaches from a safer angle.”
5. **`method05`** — “I would search for another passage or a way to remove the immediate reason for the confrontation.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.jedi.consular.seed01` — The frightened witness

**Destination:** Jedi · **Q1 family:** `consular` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'A witness knows why a settlement has been threatened, but fear has made her unwilling to speak. The guards are pressing for an answer. What would you do?'

**Player choices:**

1. **`method01`** — “I would give her space to explain what she is afraid will happen if she talks.”
2. **`method02`** — “I would ask the guards to step away so the conversation can happen without pressure.”
3. **`method03`** — “I would focus on understanding her feelings before trying to change her mind.”
4. **`method04`** — “I would find a way to protect her before asking her to share information.”
5. **`method05`** — “I would seek independent evidence so she does not have to bear the entire risk alone.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.jedi.saber_defense.seed01` — The crowded platform

**Destination:** Jedi · **Q1 family:** `saber_defense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'A panicked crowd is fleeing across a landing platform while armed pursuers close in. One person has fallen behind. You cannot protect everyone by standing in one place. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would put myself between the pursuers and the person who has fallen.”
2. **`method02`** — “I would help the crowd move to cover so fewer people remain exposed.”
3. **`method03`** — “I would try to distract the pursuers long enough for someone else to reach the straggler.”
4. **`method04`** — “I would look for a way to separate the pursuers from the civilians without a fight.”
5. **`method05`** — “I would coordinate with the others so protection and evacuation happen together.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.jedi.force_ally.seed01` — The broken formation

**Destination:** Jedi · **Q1 family:** `force_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'A small search party is crossing an unstable bridge. One companion loses confidence and freezes just as the support cables begin to fail. The others hesitate. What would you do?'

**Player choices:**

1. **`method01`** — “I would speak calmly to the companion and guide them through the next safe movement.”
2. **`method02`** — “I would ask the others to stabilize the crossing and make room for someone to help.”
3. **`method03`** — “I would focus on protecting the most vulnerable person before trying to move everyone at once.”
4. **`method04`** — “I would seek a practical way to secure the bridge so the group can regain confidence.”
5. **`method05`** — “I would take the lead across the safe section and invite the others to follow at their own pace.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.jedi.sense.seed01` — The quiet warning

**Destination:** Jedi · **Q1 family:** `sense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Your party reaches a deserted research outpost. Nothing obvious is wrong, yet the silence feels deliberate. A companion wants to enter immediately. What do you do?'

**Player choices:**

1. **`method01`** — “I would pause and carefully observe the outpost before anyone goes inside.”
2. **`method02`** — “I would listen to my unease and ask the group to approach more cautiously.”
3. **`method03`** — “I would search for signs of recent activity that could explain the silence.”
4. **`method04`** — “I would send someone to a safe vantage point while the rest remain together.”
5. **`method05`** — “I would ask the eager companion what they have noticed and compare our impressions.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.jedi.alter.seed01` — The sealed conduit

**Destination:** Jedi · **Q1 family:** `alter` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'A collapsed service conduit blocks the only known access to a damaged habitat. People are running short of air on the other side. The blockage may be unstable. How would you approach it?'

**Player choices:**

1. **`method01`** — “I would study the debris to understand what might shift if we disturb it.”
2. **`method02`** — “I would organize a careful effort to move the obstruction without endangering those beyond it.”
3. **`method03`** — “I would look for an alternate access point before putting pressure on the damaged structure.”
4. **`method04`** — “I would communicate with the trapped people and learn how much time we have.”
5. **`method05`** — “I would ask which companions have tools or abilities suited to helping us clear a safe opening.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.jedi.conceal.seed01` — The watched courtyard

**Destination:** Jedi · **Q1 family:** `conceal` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'A patrol is searching a monastery courtyard while refugees wait behind a thin wall. Drawing attention to their hiding place could endanger them. What would you do?'

**Player choices:**

1. **`method01`** — “I would study the patrol's pattern and guide the refugees toward a quieter route.”
2. **`method02`** — “I would create a harmless distraction somewhere away from the refugees.”
3. **`method03`** — “I would speak to the patrol and try to direct their attention toward another concern.”
4. **`method04`** — “I would keep the refugees still and calm until the search moves farther away.”
5. **`method05`** — “I would find a way to make their position safer before attempting any movement.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.jedi.saber_finesse.seed01` — The narrow crossing

**Destination:** Jedi · **Q1 family:** `saber_finesse` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'An armed opponent stands at the far end of a narrow footbridge. A companion is injured behind you, and there is no room for reckless movement. How would you handle this confrontation?'

**Player choices:**

1. **`method01`** — “I would keep my movements controlled and focus on protecting the injured companion.”
2. **`method02`** — “I would study the opponent's timing before attempting to move closer.”
3. **`method03`** — “I would try to speak with the opponent and learn whether a fight can be avoided.”
4. **`method04`** — “I would look for a position that prevents the opponent from rushing past me.”
5. **`method05`** — “I would work with my companions to find another route rather than accept the opponent's terms.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.jedi.alter_mobility.seed01` — The broken ascent

**Destination:** Jedi · **Q1 family:** `alter_mobility` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'A storm has broken the lifts leading out of a flooded canyon. The path ahead is steep, and a few travelers cannot climb it unaided. What would you try first?'

**Player choices:**

1. **`method01`** — “I would inspect the cliff for a safe route the whole group can manage.”
2. **`method02`** — “I would help the weakest travelers reach secure footing before moving farther.”
3. **`method03`** — “I would ask the group what equipment or abilities could assist the ascent.”
4. **`method04`** — “I would look for another crossing that trades speed for safety.”
5. **`method05`** — “I would divide the ascent into short stages so no one has to make the whole climb at once.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scout.tracking.seed01` — The disturbed trail

**Destination:** Scout · **Q1 family:** `tracking` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Three supply carriers have gone missing on the road to the frontier camp. There are boot marks in the mud, but a storm is coming and the search team wants to split up. What's your move?'

**Player choices:**

1. **`method01`** — “I would read the tracks and identify which direction gives us the strongest lead.”
2. **`method02`** — “I would mark our route and keep the team together until we know what we are following.”
3. **`method03`** — “I would search for signs that the carriers left the road willingly rather than under threat.”
4. **`method04`** — “I would interview the last people who saw the carriers before committing to a trail.”
5. **`method05`** — “I would prepare a sheltered fallback point in case the storm cuts off the search.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scout.stealth.seed01` — The surveillance line

**Destination:** Scout · **Q1 family:** `stealth` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'A patrol has set up scanners along the only short route into an occupied depot. There's another way in, but it adds a full day. What do you do?'

**Player choices:**

1. **`method01`** — “I would watch the patrol long enough to understand the gaps in its coverage.”
2. **`method02`** — “I would take the longer route if it gives us a safer approach.”
3. **`method03`** — “I would look for cover and terrain that break the scanners' lines of sight.”
4. **`method04`** — “I would arrange a diversion that lets the team pass without a confrontation.”
5. **`method05`** — “I would find out who controls the checkpoint and whether there is a reason to grant access.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scout.terrain.seed01` — The rising flood

**Destination:** Scout · **Q1 family:** `terrain` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'A flash flood has cut the team off from the main trail. There's a ridge to the east, a fast current to the west, and fading light overhead. Which problem do you solve first?'

**Player choices:**

1. **`method01`** — “I would study the terrain and find a route that stays above the water.”
2. **`method02`** — “I would move everyone to secure ground before choosing a way out.”
3. **`method03`** — “I would check supplies and injuries so the group can survive a night here if necessary.”
4. **`method04`** — “I would send a short, controlled scouting effort to test the ridge before moving the whole team.”
5. **`method05`** — “I would signal for help while keeping a fallback route ready.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scout.vehicles.seed01` — The uncertain approach

**Destination:** Scout · **Q1 family:** `vehicles` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Your transport must reach a remote landing zone, but the navigation data is old and the weather is getting worse. The pilot asks whether to continue. What's your call?'

**Player choices:**

1. **`method01`** — “I would compare the map with what we can observe before recommending an approach.”
2. **`method02`** — “I would scout for a safer landing site instead of committing to the original one.”
3. **`method03`** — “I would talk through an abort plan with the pilot before we descend.”
4. **`method04`** — “I would check the transport and its equipment for problems that could matter in the storm.”
5. **`method05`** — “I would contact someone familiar with the area before trusting the outdated information.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scout.recon.seed01` — The silent perimeter

**Destination:** Scout · **Q1 family:** `recon` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'An allied patrol needs to pass an abandoned processing plant. You can spot movement inside, but you can't tell whether it's scavengers or hostiles. The patrol leader wants an answer. How do you help?'

**Player choices:**

1. **`method01`** — “I would observe longer and report only what I can confirm.”
2. **`method02`** — “I would identify safe cover and the best route before telling the patrol to move.”
3. **`method03`** — “I would coordinate watchers on different angles so we don't miss a second approach.”
4. **`method04`** — “I would try to contact whoever is inside before assuming they're a threat.”
5. **`method05`** — “I would advise holding position while we check whether the movement is connected to our mission.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scout.techrepair.seed01` — The failed field sensor

**Destination:** Scout · **Q1 family:** `techrepair` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'The team depends on a portable sensor to cross a mine-scarred plain. It has stopped working, and a technician won't arrive before dark. We still need to move. What do you do?'

**Player choices:**

1. **`method01`** — “I would examine the sensor and attempt a careful field repair with what we have.”
2. **`method02`** — “I would find another way to check the route without depending on the broken device.”
3. **`method03`** — “I would organize a slow, marked crossing so no one loses track of safe ground.”
4. **`method04`** — “I would search the nearby wreckage for parts or a usable replacement.”
5. **`method05`** — “I would delay the crossing and establish a safe camp if the risk is too uncertain.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.soldier.weapon.seed01` — The exposed corridor

**Destination:** Soldier · **Q1 family:** `weapon` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'We've got civilians moving through a hangar corridor, and someone has started firing from the far end. There's cover, but not enough for everyone. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would find a clear line of fire that keeps the civilians out of danger.”
2. **`method02`** — “I would cover the group's movement while someone guides them toward shelter.”
3. **`method03`** — “I would reposition to make the attacker choose between firing and protecting their own cover.”
4. **`method04`** — “I would try to force a pause in the shooting so the civilians can escape.”
5. **`method05`** — “I would coordinate with the others before engaging so we don't make the corridor more dangerous.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.soldier.armor.seed01` — The long hold

**Destination:** Soldier · **Q1 family:** `armor` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'A blast door is jammed open, and a security team has to hold the passage while a shuttle loads evacuees. The enemy keeps testing the line. How do you keep people standing?'

**Player choices:**

1. **`method01`** — “I would identify the best defensive positions and keep exposure as low as possible.”
2. **`method02`** — “I would take the most dangerous position if it helps protect the evacuees.”
3. **`method03`** — “I would rotate exhausted defenders before their concentration starts slipping.”
4. **`method04`** — “I would look for a way to secure the door instead of depending on a long exchange of fire.”
5. **`method05`** — “I would prepare an orderly withdrawal so nobody has to guess when it's time to move.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.soldier.unarmed.seed01` — The disarmed guard

**Destination:** Soldier · **Q1 family:** `unarmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'You've been separated from your gear in a cramped maintenance bay. A hostile guard blocks the exit, but there's barely room to draw a weapon anyway. What would you try?'

**Player choices:**

1. **`method01`** — “I would keep distance and look for an opening to pass without grappling.”
2. **`method02`** — “I would use the tight space to prevent the guard from controlling where I can move.”
3. **`method03`** — “I would try to restrain the guard long enough for my companions to get clear.”
4. **`method04`** — “I would create a distraction with the equipment around us and head for the exit.”
5. **`method05`** — “I would try talking first if the guard seems willing to listen.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.soldier.defense_ally.seed01` — The fallen teammate

**Destination:** Soldier · **Q1 family:** `defense_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'One of your people is down in the open. Someone can reach them, but enemy fire is still cutting across the street. What do you do?'

**Player choices:**

1. **`method01`** — “I would move to cover the fallen teammate while another person reaches them.”
2. **`method02`** — “I would find the safest route and guide the rescuer through it.”
3. **`method03`** — “I would draw the enemy's attention away from the street without exposing the rest of the team.”
4. **`method04`** — “I would organize a coordinated recovery rather than letting everyone rush out at once.”
5. **`method05`** — “I would look for a way to interrupt the firing before anyone commits to the rescue.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.soldier.tactics.seed01` — The shifting flank

**Destination:** Soldier · **Q1 family:** `tactics` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'You're holding a depot with a mixed squad. A scout reports movement on your left, and the main gate is still under pressure. You can't put everyone in both places. What's your plan?'

**Player choices:**

1. **`method01`** — “I would assign roles around the most immediate threat and keep a reserve ready.”
2. **`method02`** — “I would verify the scout's report before shifting most of the squad.”
3. **`method03`** — “I would strengthen the route between both positions so people can redeploy quickly.”
4. **`method04`** — “I would ask the squad leaders for their assessment and make one clear decision.”
5. **`method05`** — “I would look for a way to break contact at the gate rather than hold an unsustainable position.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.soldier.precision.seed01` — The hostage window

**Destination:** Soldier · **Q1 family:** `precision` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'A captor has a hostage near a factory window. You've got a possible angle, but the light is bad and the captor keeps moving. Nobody wants a bad shot here. What do you do?'

**Player choices:**

1. **`method01`** — “I would take time to understand the angles and refuse a shot without a clear opening.”
2. **`method02`** — “I would coordinate with someone who can draw the captor away from the hostage.”
3. **`method03`** — “I would try to keep the captor talking so we have time to improve our position.”
4. **`method04`** — “I would search for another vantage point that gives us better information.”
5. **`method05`** — “I would prioritize a safe extraction route in case the situation changes suddenly.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.soldier.demolitions.seed01` — The obstructed rescue

**Destination:** Soldier · **Q1 family:** `demolitions` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'A collapsed bulkhead has sealed off the engine room, and two crew members are trapped inside. We could try cutting through, but the structure is already damaged. How would you get them out?'

**Player choices:**

1. **`method01`** — “I would assess the damage before considering any method that could shake the bulkhead.”
2. **`method02`** — “I would look for a controlled way to open a passage with the right tools and help.”
3. **`method03`** — “I would check the ship plans for an alternate access route.”
4. **`method04`** — “I would communicate with the trapped crew and find out what conditions are like inside.”
5. **`method05`** — “I would organize support and evacuation so everyone is ready when a safe opening appears.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.soldier.ambush.seed01` — The approaching raiders

**Destination:** Soldier · **Q1 family:** `ambush` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Raiders are heading toward a supply station. You've spotted them first, and they haven't seen us yet. We've got the advantage for the moment. What do you do with it?'

**Player choices:**

1. **`method01`** — “I would use the time to prepare positions that protect the station's people.”
2. **`method02`** — “I would watch the raiders long enough to learn their numbers and intentions.”
3. **`method03`** — “I would arrange a controlled surprise that stops them before they can threaten the station.”
4. **`method04`** — “I would warn the station and prepare a safe retreat before starting any confrontation.”
5. **`method05`** — “I would try to open communications while we still have the option not to fight.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.soldier.fieldmed.seed01` — The crowded aid station

**Destination:** Soldier · **Q1 family:** `fieldmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'We made it to the aid station, but three wounded people just arrived and the medic's already occupied. We've got limited supplies. Where do you start?'

**Player choices:**

1. **`method01`** — “I would help assess who needs immediate attention and what help I can safely provide.”
2. **`method02`** — “I would organize the team to bring supplies and clear working space for the medic.”
3. **`method03`** — “I would keep the injured people calm and gather information about their conditions.”
4. **`method04`** — “I would secure the station so the medic can work without another interruption.”
5. **`method05`** — “I would arrange transport for anyone whose needs exceed what this station can handle.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scoundrel.disguise.seed01` — The occupied terminal

**Destination:** Scoundrel · **Q1 family:** `disguise` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, matey, the dockmaster's terminal has been taken over by folks who ask too many questions. We need to learn which ship took our cargo, and they don't like strangers pokin' around. What's yer play?'

**Player choices:**

1. **`method01`** — “I would learn who belongs here and try to blend in without attracting notice.”
2. **`method02`** — “I would use a convincing explanation to ask the dockmaster for the information openly.”
3. **`method03`** — “I would watch how the staff move before choosing when to approach the terminal.”
4. **`method04`** — “I would find someone willing to share the record without making a scene.”
5. **`method05`** — “I would search for a different source of the same information rather than risk the whole crew.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scoundrel.tech.seed01` — The sealed cargo records

**Destination:** Scoundrel · **Q1 family:** `tech` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Well now, the ship's cargo ledger is locked behind a busted terminal, and the port agent says the manifest's gone for good. Funny how that happens when valuable crates go missin'. How d'ye proceed?'

**Player choices:**

1. **`method01`** — “I would inspect the terminal and see whether the records can be recovered safely.”
2. **`method02`** — “I would compare the ship's loading schedule with other records that might still exist.”
3. **`method03`** — “I would talk to the crew who handled the crates and see whether their accounts match.”
4. **`method04`** — “I would look for a legitimate way to get an authorized copy of the ledger.”
5. **`method05`** — “I would secure the remaining cargo first so we don't lose anything else while investigating.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scoundrel.opportunist.seed01` — The interrupted deal

**Destination:** Scoundrel · **Q1 family:** `opportunist` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'A trade goes sour at the exact moment the lights cut out, matey. Half the room makes for the exits and the other half reaches for blasters. Ye've got seconds to decide. What d'ye do?'

**Player choices:**

1. **`method01`** — “I would find cover and watch for an opening to get my companions clear.”
2. **`method02`** — “I would use the confusion to move the vulnerable people away from the center of the room.”
3. **`method03`** — “I would call for everyone to stand down before the first shot turns a deal into a disaster.”
4. **`method04`** — “I would keep my attention on the person who started the trouble and look for a mistake.”
5. **`method05`** — “I would secure what we came for only if doing so doesn't put the crew at greater risk.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scoundrel.spacer.seed01` — The runaway freighter

**Destination:** Scoundrel · **Q1 family:** `spacer` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Our freighter's lost a thruster just as a patrol closes in, matey. We can nurse her toward the docks, or try one of the old freight lanes. Neither choice comes with a promise. What'll ye do?'

**Player choices:**

1. **`method01`** — “I would ask for the ship's condition before deciding which route she can survive.”
2. **`method02`** — “I would plot a conservative approach that keeps us close to possible help.”
3. **`method03`** — “I would look for an alternate lane the patrol may not expect.”
4. **`method04`** — “I would divide the crew between repairs, navigation, and keeping watch on the patrol.”
5. **`method05`** — “I would hail the patrol and see whether a peaceful arrangement beats a dangerous chase.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scoundrel.fortune.seed01` — The last chance

**Destination:** Scoundrel · **Q1 family:** `fortune` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'We've made three tries to recover a lost data canister from the wreck, and now the current's shiftin'. One more mistake and she's gone. What'll ye change before the next attempt, matey?'

**Player choices:**

1. **`method01`** — “I would examine what failed on our earlier attempts before trying again.”
2. **`method02`** — “I would change the timing and wait for a safer opening.”
3. **`method03`** — “I would ask someone with a different skill to lead the next attempt.”
4. **`method04`** — “I would improvise a simpler way to secure the canister with what we already have.”
5. **`method05`** — “I would decide whether the canister is worth the risk before anyone tries again.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scoundrel.contacts.seed01` — The disputed docking fee

**Destination:** Scoundrel · **Q1 family:** `contacts` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'The harbor official's slapped a surprise fee on our berth. Pay it and we lose most of the job; refuse and we're stuck on the station. Plenty of witnesses, too. How'll ye wriggle through this one?'

**Player choices:**

1. **`method01`** — “I would negotiate the fee and ask what rule the official is applying.”
2. **`method02`** — “I would find another berth or service provider before we lose more time.”
3. **`method03`** — “I would speak to people who know this port and learn whether the charge is normal.”
4. **`method04`** — “I would offer a workable alternative that gets both sides something they need.”
5. **`method05`** — “I would document the dispute and appeal through a channel the official has to respect.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

#### `q4.scoundrel.evasive.seed01` — The closing net

**Destination:** Scoundrel · **Q1 family:** `evasive` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Two patrol craft are pinchin' us toward a debris field, matey. Keep a straight course and they catch us; turn too sharp and the rocks might finish the job. What's yer call?'

**Player choices:**

1. **`method01`** — “I would study the debris and choose the safest gap before making a move.”
2. **`method02`** — “I would change speed and direction to make our course harder to predict.”
3. **`method03`** — “I would ask the crew to coordinate sensors and repairs while I focus on the escape.”
4. **`method04`** — “I would hail the patrol to learn whether there's still a way out without a chase.”
5. **`method05`** — “I would identify a place to stop or hide instead of trying to outrun both craft.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and choices better before deciding what to do.”

### Coverage and acceptance checkpoint

| QA dimension | Verified for this local authored tranche | Remaining gate |
|---|---:|---|
| Destination Mentor voice families | 5 / 5 | Narrative review against established campaign voice |
| Distinct Q1 capability families | 36 / 36 | Canonical detailed Q1 IDs and associations |
| Directed prior→destination transitions | 20 / 20 | Runtime routing, 3+ existing classes |
| Substantive Q1 selections mapped | 100 / 100 | Stable ID association vs display index |
| Complete seed scenarios | 36 / 36 | Expand toward 180 distinct scenarios |
| First-person selectable method texts | 180 / 180 | Mechanical/semantic tag certification per method |
| Neutral choices | 36 / 36 | Confirm no scored intent or negative tag |
| Source/runtime eligibility | Not certified | Verify exact actor ownership and relevant legal opportunities |
| Novel method signal / deduplication | Design only | Compare actual scoring and historical event snapshots |

**Acceptance tests for implementation:** (1) all 100 substantive Q1 variants return an authored Q4 scene; (2) Q1 undecided gets a neutral situation and not an inferred specialization; (3) changing Q1 changes/invalidates downstream scenario state, unchanged reopening does not; (4) all five choices are credible and non-identical; (5) no unowned mechanics are presented as acquired; (6) Q2 tag selection can affect contextual fit but not become a second Q4 mechanical score; (7) Q3 alone changes no scenario; (8) Q4 method evidence never changes legal eligibility or wipes career history; (9) every completed event has deterministic stable IDs, retained selected text, date, level, source, and version; (10) no copied old scenario is counted twice on retry/re-render.

### Remaining Q4 authoring before production

- Scale from 36 to **approximately 180 fully distinct, authored scenarios**, maintaining at least five varied situations per family (combat, social, technical, exploration, rescue where thematically appropriate). Avoid arbitrary quota-fill scenes; meaningful method diversity matters more than the exact count.
- Assign precise canonical ontology IDs to each selectable method only after source/behavior checks. Preserve separate method-intent provenance from Q1 capability intent and Q2 current-mechanics evidence. The actual actor should never be made to look as though it has acquired future options.
- Confirm the final five fixed Mentor Q4 introduction lines and refine line-level scenario voices with the established characterizations; none of these seed scenario passages are approved character dialogue merely because the **scenario architecture** was approved.
- Runtime integration, cache/read contract, scoring tie-break behavior, persistence, preference saturation, cross-class routing, and testing remain **pending**; do not claim a shipped feature.

## Change log, continued — Q4 design approval and 36-scene seed tranche

- **2026-11-14:** Owner authorized proceeding with Q4 scenario-driven architecture. Recorded binding Q1/Q2/Q3 division, 100-way Q1-to-family coverage table, 36 complete authored Mentor-voice scenario seeds (216 responses including neutral), engine boundary and selection/persistence rules, and an eventual ~180-scenario expansion target. Local Markdown only; **no** GitHub commit, push, PR, or production code change.


---

## Q4 — 250-SCENARIO LOCAL LIBRARY EXPANSION (OWNER-REQUESTED TARGET)

**Status:** 250/250 authored hypothetical scenarios in the local design catalog, including the original 36 unchanged seeds and 214 newly authored variants. User-requested size target reached on 2026-11-14. **Editorial draft only:** individual dialogue lines, Q1 routing ID associations, method tags, canonical mechanical references and runtime behavior remain subject to review/certification. No production data or GitHub changes.

**Supersession note:** Earlier Q4 sections in this document refer to a tentative 150–250 or 180-scene expansion and state that 36 seeds were completed. Those statements are historical checkpoints. **This section supersedes the expansion target and authoring counts** without changing the owner-approved architecture or preserving other decisions.

### Exact completion counts

| Destination | Capability families | Original seeds | New scenarios | Total scenarios | Player responses |
|---|---:|---:|---:|---:|---:|
| Jedi | 8 | 8 | 48 | 56 | 336 |
| Noble | 6 | 6 | 35 | 41 | 246 |
| Scoundrel | 7 | 7 | 41 | 48 | 288 |
| Scout | 6 | 6 | 36 | 42 | 252 |
| Soldier | 9 | 9 | 54 | 63 | 378 |
| **Total** | **36** | **36** | **214** | **250** | **1,500** |

**Distribution:** 34 families have seven scenarios each; two families (`noble.influence`, `scoundrel.evasive`) have six each. The original 100 substantive Q1 answers remain mapped to all 36 families as documented above, not multiplied into new artificial paths. A Q1 undecided route remains a no-assumed-specialization fallback.

**Record format:** Every variant uses `q4.<destination>.<family>.seedNN`, one Mentor-voiced hypothetical, and selectable `method01`–`method05` plus `undecided`. Every method text is first-person. Tags are deliberately **unassigned** pending exact certified mechanical/semantic mapping. The neutral answer carries **no score**. Q3 depth is excluded from scenario selection; Q2 provides a selected verified current bias key only for contextual relevance, without a new scorer.

**Companion machine-readable catalog:** `SWSE_Q4_250_Scenario_Library_LOCAL.json` (250 records). This is for review, QA and future integration, not an authorized runtime replacement for canonical registries or the Suggestion Engine.

### Newly authored scenarios (214; original 36 seeds are preserved above)

#### `q4.jedi.alter.seed02` — The blocked ventilation shaft

**Destination:** Jedi · **Q1 family:** `alter` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A ventilation fan has seized behind a heavy access panel. Workers are trapped in a hot chamber, and the nearest cutting tool is far away. How would you respond?'

**Player choices:**

1. **`method01`** — “I would check whether the panel can be safely opened without destabilizing the fan.”
2. **`method02`** — “I would coordinate a manual effort to clear the access point.”
3. **`method03`** — “I would find another route for fresh air while we work.”
4. **`method04`** — “I would ask the trapped workers what they can reach from inside.”
5. **`method05`** — “I would wait for the proper equipment if forcing the panel would endanger them.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.alter.seed03` — The rolling cargo cradle

**Destination:** Jedi · **Q1 family:** `alter` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: A heavy cargo cradle breaks loose on a sloped loading ramp. Workers are in its path and the emergency brake has failed. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would shout a warning and direct the workers out of its route.”
2. **`method02`** — “I would look for a nearby barrier that could slow the cradle safely.”
3. **`method03`** — “I would ask someone to cut power to the loading machinery.”
4. **`method04`** — “I would move to a position where I can help without being struck.”
5. **`method05`** — “I would plan how to secure the load after it stops instead of rushing blindly.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.alter.seed04` — The unstable antenna

**Destination:** Jedi · **Q1 family:** `alter` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A storm bends a communications antenna toward a crowded shelter. The support cables are fraying and the crew cannot reach the upper bracket. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would evacuate the area beneath the antenna first.”
2. **`method02`** — “I would assess which brace might prevent it from falling.”
3. **`method03`** — “I would coordinate the crew's efforts to tension the remaining cables.”
4. **`method04`** — “I would find a safe access point for the repair team.”
5. **`method05`** — “I would use an alternate signal system while the antenna is made safe.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.alter.seed05` — The sealed archive door

**Destination:** Jedi · **Q1 family:** `alter` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: An old blast door traps researchers in a room with diminishing air. The control panel is destroyed, and the mechanism may be corroded. How would you respond?'

**Player choices:**

1. **`method01`** — “I would communicate with the trapped researchers before disturbing the door.”
2. **`method02`** — “I would search for a manual release or maintenance opening.”
3. **`method03`** — “I would clear people away before attempting to shift the damaged panel.”
4. **`method04`** — “I would ask a technician how the lock is meant to operate.”
5. **`method05`** — “I would create an alternate air supply while the door is examined.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.alter.seed06` — The fallen bridge beam

**Destination:** Jedi · **Q1 family:** `alter` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: A bridge beam lies across the only footpath leading out of a flooded village. The water is rising, and moving the beam carelessly could collapse the bank. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would inspect where the beam is bearing weight before touching it.”
2. **`method02`** — “I would organize the villagers to clear lighter debris first.”
3. **`method03`** — “I would find a route around the blockage for children and injured people.”
4. **`method04`** — “I would use available supports to stabilize the riverbank.”
5. **`method05`** — “I would delay movement of the beam until the dangers are better understood.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.alter.seed07` — The drifting supply pallet

**Destination:** Jedi · **Q1 family:** `alter` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A supply pallet has floated beyond a station's external cargo net. A crew member wants to follow it despite limited safety equipment. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would prevent anyone from stepping into danger without a recovery plan.”
2. **`method02`** — “I would identify whether the pallet can be retrieved from a secure position.”
3. **`method03`** — “I would check what equipment and lines are still available.”
4. **`method04`** — “I would coordinate the crew to manage the recovery together.”
5. **`method05`** — “I would let the pallet go if retrieving it would risk a life.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.alter_mobility.seed02` — The broken lift shaft

**Destination:** Jedi · **Q1 family:** `alter_mobility` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A lift is stranded between levels after its suspension fails. People inside are frightened, and the service ladder ends short of the cabin. How would you respond?'

**Player choices:**

1. **`method01`** — “I would determine whether the cabin is stable before sending anyone near it.”
2. **`method02`** — “I would coordinate a safe rope rescue with the maintenance team.”
3. **`method03`** — “I would find an alternate way to reach the cabin without entering the shaft.”
4. **`method04`** — “I would ask the passengers to remain still and describe any damage.”
5. **`method05`** — “I would secure the area until appropriate rescue equipment arrives.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.alter_mobility.seed03` — The cracked mountain path

**Destination:** Jedi · **Q1 family:** `alter_mobility` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: An avalanche has torn away a section of mountain trail. A small group is stranded above the gap as evening approaches. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would look for a less exposed route around the missing section.”
2. **`method02`** — “I would test the remaining ledges before anyone tries to cross.”
3. **`method03`** — “I would organize ropes and anchors for a controlled passage.”
4. **`method04`** — “I would help the stranded group find shelter while a route is prepared.”
5. **`method05`** — “I would wait for more capable climbers if the slope cannot be made safe.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.alter_mobility.seed04` — The rooftop pursuit

**Destination:** Jedi · **Q1 family:** `alter_mobility` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A frightened messenger is trying to escape pursuers across a series of rooftops. One roof is visibly unstable and civilians are below. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would identify a safer route for the messenger to follow.”
2. **`method02`** — “I would alert the people below before loose masonry falls.”
3. **`method03`** — “I would ask the pursuers to stop rather than force a dangerous chase.”
4. **`method04`** — “I would use the stable roofs to reach a position where I can offer help.”
5. **`method05`** — “I would let the messenger move beyond my reach if pursuit would harm bystanders.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.alter_mobility.seed05` — The flooded stairway

**Destination:** Jedi · **Q1 family:** `alter_mobility` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: Water fills the lower stairwell of a residence as people gather on the upper floors. The normal exit is unusable. How would you respond?'

**Player choices:**

1. **`method01`** — “I would locate a safe external route before moving the residents.”
2. **`method02`** — “I would organize a careful descent one person at a time.”
3. **`method03`** — “I would find stable places to anchor ropes or ladders.”
4. **`method04`** — “I would keep the most vulnerable residents sheltered while help approaches.”
5. **`method05`** — “I would check whether the flood has weakened the surrounding structure.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.alter_mobility.seed06` — The broken landing ramp

**Destination:** Jedi · **Q1 family:** `alter_mobility` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: A ship's ramp jams halfway open above a busy docking lane. Crew members must disembark before the next cargo shuttle arrives. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would direct the dock crew to clear the traffic beneath the ramp.”
2. **`method02`** — “I would look for a safe alternate hatch with a stable descent.”
3. **`method03`** — “I would coordinate the passengers so no one rushes the damaged mechanism.”
4. **`method04`** — “I would ask technicians to secure the ramp before it shifts again.”
5. **`method05`** — “I would delay disembarkation if the docking lane cannot be made safe.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.alter_mobility.seed07` — The ravine crossing

**Destination:** Jedi · **Q1 family:** `alter_mobility` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A narrow ravine separates a group from its medical supplies. The only rope bridge is torn, and a badly injured person cannot wait long. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would examine the bridge supports before attempting a repair.”
2. **`method02`** — “I would scout a shorter and safer crossing downstream.”
3. **`method03`** — “I would arrange a relay to move vital medicine first.”
4. **`method04`** — “I would coordinate a controlled crossing with proper safety lines.”
5. **`method05`** — “I would call for aerial assistance if the ravine cannot be crossed responsibly.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.conceal.seed02` — The inspection hall

**Destination:** Jedi · **Q1 family:** `conceal` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A patrol searches a busy transport hall for a missing witness. The witness is frightened and will be recognized if the crowd is stopped. How would you respond?'

**Player choices:**

1. **`method01`** — “I would ask the witness which exits they know and trust.”
2. **`method02`** — “I would use the flow of travelers to move without drawing attention.”
3. **`method03`** — “I would look for a lawful way to delay the inspection without confronting the patrol.”
4. **`method04`** — “I would seek a safe room where the witness can wait unnoticed.”
5. **`method05`** — “I would arrange a discreet escort rather than abandon the witness to the crowd.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.conceal.seed03` — The occupied garden

**Destination:** Jedi · **Q1 family:** `conceal` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: A delegation must reach a meeting place through a garden watched by armed sentries. The guards appear to be looking for a different party. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would observe the sentries' route before deciding where to walk.”
2. **`method02`** — “I would approach as ordinary visitors if that is credible and safe.”
3. **`method03`** — “I would find a less watched entrance that avoids forcing a confrontation.”
4. **`method04`** — “I would send a message to the host requesting a discreet escort.”
5. **`method05`** — “I would postpone the meeting if any passage would endanger the delegation.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.conceal.seed04` — The warehouse spectators

**Destination:** Jedi · **Q1 family:** `conceal` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A small crowd has gathered outside a warehouse where a whistleblower is hiding. Some are curious; others appear to be searching deliberately. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would learn which onlookers are actually watching the exits.”
2. **`method02`** — “I would move the whistleblower away while attention is elsewhere.”
3. **`method03`** — “I would ask an ally to create a harmless reason for the crowd to disperse.”
4. **`method04`** — “I would choose a covered route that does not expose nearby residents.”
5. **`method05`** — “I would keep the whistleblower hidden until a safer departure is possible.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.conceal.seed05` — The unlit riverbank

**Destination:** Jedi · **Q1 family:** `conceal` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A group needs to cross a riverbank without alarming a camp on the opposite shore. Bright searchlights sweep the water at irregular intervals. How would you respond?'

**Player choices:**

1. **`method01`** — “I would watch the searchlights long enough to understand their pattern.”
2. **`method02`** — “I would find a crossing with natural cover rather than rely on speed.”
3. **`method03`** — “I would coordinate the group so no one moves alone.”
4. **`method04`** — “I would seek permission from the camp if a peaceful crossing is possible.”
5. **`method05`** — “I would wait for better conditions instead of risking discovery in the water.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.conceal.seed06` — The watched archive

**Destination:** Jedi · **Q1 family:** `conceal` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: A librarian agrees to share a sensitive document but fears the security guard will report the meeting. The public reading room is crowded. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would arrange a conversation that does not expose the librarian.”
2. **`method02`** — “I would choose a public, ordinary activity that gives us a reason to be there.”
3. **`method03`** — “I would request a copy through an authorized channel if one exists.”
4. **`method04`** — “I would identify a quiet exit before accepting anything sensitive.”
5. **`method05`** — “I would leave without the document if retrieving it would endanger the librarian.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.conceal.seed07` — The threatened family

**Destination:** Jedi · **Q1 family:** `conceal` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A family asks for help leaving a neighborhood controlled by an intimidating militia. The militia is monitoring the usual transport stops. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would ask the family what they can safely carry and where they hope to go.”
2. **`method02`** — “I would plan a departure that blends with ordinary neighborhood activity.”
3. **`method03`** — “I would find an alternate transport route outside the watched stops.”
4. **`method04`** — “I would coordinate trusted escorts rather than send the family alone.”
5. **`method05`** — “I would arrange shelter until the militia's surveillance is less intense.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.consular.seed02` — The silent student

**Destination:** Jedi · **Q1 family:** `consular` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A young trainee has stopped speaking after being accused of hiding information about a missing friend. Their teacher wants an immediate answer, but the room is growing tense. How would you respond?'

**Player choices:**

1. **`method01`** — “I would ask the trainee what would make this conversation feel safe.”
2. **`method02`** — “I would speak to the teacher privately about allowing more time.”
3. **`method03`** — “I would look for evidence that could clarify the accusation without pressure.”
4. **`method04`** — “I would offer to listen without demanding a confession.”
5. **`method05`** — “I would help both of them agree on one next step that respects the missing friend.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.consular.seed03` — The rival petitioners

**Destination:** Jedi · **Q1 family:** `consular` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: Two petitioners seek the same sanctuary for different reasons. Both speak sincerely and each fears the other's presence. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would hear their accounts separately before putting them together.”
2. **`method02`** — “I would ask what each person actually needs from sanctuary.”
3. **`method03`** — “I would find a shared arrangement that gives both some safety.”
4. **`method04`** — “I would explain the sanctuary's limits openly before making promises.”
5. **`method05`** — “I would seek a temporary refuge for one group while tensions ease.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.consular.seed04` — The angry apprentice

**Destination:** Jedi · **Q1 family:** `consular` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: An apprentice believes a respected elder has concealed a mistake. Their anger is drawing others into a confrontation. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would invite the apprentice to describe the mistake without an audience.”
2. **`method02`** — “I would ask the elder for a careful account rather than a defense of status.”
3. **`method03`** — “I would identify what harm needs repair before assigning blame.”
4. **`method04`** — “I would help the apprentices discuss their worries without taking sides.”
5. **`method05`** — “I would seek an independent account if the stories cannot be reconciled.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.consular.seed05` — The fractured council

**Destination:** Jedi · **Q1 family:** `consular` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A community council cannot agree whether to accept aid from a former enemy. Families need supplies before the next storm. How would you respond?'

**Player choices:**

1. **`method01`** — “I would ask each council member what risk they most fear.”
2. **`method02`** — “I would propose safeguards that separate urgent relief from future political promises.”
3. **`method03`** — “I would bring affected families into the conversation before voting.”
4. **`method04`** — “I would invite the former enemy to explain the terms plainly.”
5. **`method05`** — “I would arrange emergency supplies from another source while trust is tested.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.consular.seed06` — The accused healer

**Destination:** Jedi · **Q1 family:** `consular` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: A healer is blamed when a difficult treatment fails. An angry crowd demands that the clinic close immediately. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would speak with the patient's family and acknowledge their loss.”
2. **`method02`** — “I would review the care records without assuming either guilt or innocence.”
3. **`method03`** — “I would ask medical witnesses to explain the limitations of the treatment.”
4. **`method04`** — “I would protect the clinic staff while everyone has time to reflect.”
5. **`method05`** — “I would find another safe place for urgent patients during the dispute.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.consular.seed07` — The abandoned vow

**Destination:** Jedi · **Q1 family:** `consular` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A local mediator wants to abandon a peace pledge after one side breaks a minor condition. Their companion argues that any compromise is weakness. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would ask what the original pledge was meant to protect.”
2. **`method02`** — “I would distinguish a broken condition from a complete loss of trust.”
3. **`method03`** — “I would propose a visible repair that lets the pledge continue.”
4. **`method04`** — “I would listen to the companion's concerns before challenging their conclusion.”
5. **`method05`** — “I would accept that the pledge may need revising if people are being harmed.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.force_ally.seed02` — The scattered stretcher team

**Destination:** Jedi · **Q1 family:** `force_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A rescue team carrying an injured person loses its route when debris blocks the passage. Everyone proposes a different direction. How would you respond?'

**Player choices:**

1. **`method01`** — “I would calm the group and make sure the patient remains stable.”
2. **`method02`** — “I would ask each rescuer what route they know personally.”
3. **`method03`** — “I would assign clear tasks so no one has to guess what to do next.”
4. **`method04`** — “I would investigate the debris before choosing a path through it.”
5. **`method05`** — “I would find a safer temporary place to shelter the patient.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.force_ally.seed03` — The wavering watch

**Destination:** Jedi · **Q1 family:** `force_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: A night watch has endured several false alarms. When a real warning arrives, half the volunteers think it is another mistake. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would have someone verify the warning while I keep the others organized.”
2. **`method02`** — “I would remind the watch of the precautions they agreed to follow.”
3. **`method03`** — “I would distribute responsibilities so everyone has one useful task.”
4. **`method04`** — “I would help the most exhausted volunteers step away from the front.”
5. **`method05`** — “I would ask the watch captain what would restore trust in the warning system.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.force_ally.seed04` — The missed rendezvous

**Destination:** Jedi · **Q1 family:** `force_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: Members of an expedition reach a meeting point without their navigator. A storm makes waiting dangerous, and the team is arguing. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would ask the group to account for the navigator's last known position.”
2. **`method02`** — “I would appoint someone to maintain a safe shelter while others search.”
3. **`method03`** — “I would encourage the group to conserve energy rather than rush blindly.”
4. **`method04`** — “I would organize a signal plan the missing navigator could recognize.”
5. **`method05`** — “I would choose a safer meeting point and communicate the change.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.force_ally.seed05` — The injured mechanic

**Destination:** Jedi · **Q1 family:** `force_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A mechanic is hurt while repairing an essential transport. Their companions are anxious and trying to continue the work without understanding the damage. How would you respond?'

**Player choices:**

1. **`method01`** — “I would make caring for the mechanic the team's first priority.”
2. **`method02`** — “I would ask another worker to explain exactly what remains unfinished.”
3. **`method03`** — “I would organize a repair plan that does not rely on the injured person.”
4. **`method04`** — “I would reassure the companions without pretending the transport is safe.”
5. **`method05`** — “I would seek a replacement vehicle if the repairs cannot be completed responsibly.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.force_ally.seed06` — The divided patrol

**Destination:** Jedi · **Q1 family:** `force_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: Two patrol teams return from the same district with conflicting threat reports. Each accuses the other of carelessness. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would ask both teams to separate observations from assumptions.”
2. **`method02`** — “I would keep the disagreement from turning into a public contest.”
3. **`method03`** — “I would coordinate a shared reconnaissance check with defined responsibilities.”
4. **`method04`** — “I would make sure the teams have time to rest before redeployment.”
5. **`method05`** — “I would tell the settlement what is verified and what still needs checking.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.force_ally.seed07` — The broken morale

**Destination:** Jedi · **Q1 family:** `force_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A group of evacuees has become convinced that the rescue shuttle will not return. A few are preparing to leave the shelter in dangerous weather. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would listen to the evacuees' concerns before arguing with them.”
2. **`method02`** — “I would establish a reliable update schedule that everyone can trust.”
3. **`method03`** — “I would organize small tasks that help people prepare for evacuation.”
4. **`method04`** — “I would ask scouts to verify the shuttle's status without exposing the group.”
5. **`method05`** — “I would accompany anyone who must move to a safer shelter.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_defense.seed02` — The station walkway

**Destination:** Jedi · **Q1 family:** `saber_defense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A frightened security officer raises a weapon near a crowded walkway. Passengers are trapped between the officer and a locked gate. How would you respond?'

**Player choices:**

1. **`method01`** — “I would call for the officer to lower the weapon while keeping my distance.”
2. **`method02`** — “I would guide the nearest passengers behind solid cover.”
3. **`method03`** — “I would look for an escape path that does not cross the officer's line of fire.”
4. **`method04`** — “I would take a position where I could defend others if the officer attacks.”
5. **`method05`** — “I would seek someone the officer trusts to help resolve the standoff.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_defense.seed03` — The darkened market

**Destination:** Jedi · **Q1 family:** `saber_defense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: A power outage plunges a packed market into darkness. Two armed people begin shouting at one another beside a frightened family. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would ask both people to step away from the family before discussing their dispute.”
2. **`method02`** — “I would help the family move toward an open exit.”
3. **`method03`** — “I would use the market stalls as cover rather than rushing into the confrontation.”
4. **`method04`** — “I would locate the source of the panic before assuming who is threatening whom.”
5. **`method05`** — “I would call for trained assistance while keeping bystanders clear.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_defense.seed04` — The train compartment

**Destination:** Jedi · **Q1 family:** `saber_defense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: An armed passenger bars the door of a moving train, claiming that someone inside is dangerous. The other passengers cannot leave. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would ask the passenger what they believe has happened and why.”
2. **`method02`** — “I would move vulnerable travelers away from the blocked doorway.”
3. **`method03`** — “I would identify another emergency exit before the situation worsens.”
4. **`method04`** — “I would keep myself between the weapon and the passengers if necessary.”
5. **`method05`** — “I would request that the conductor slow the train and summon help.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_defense.seed05` — The open landing pad

**Destination:** Jedi · **Q1 family:** `saber_defense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A skirmish has broken out near workers repairing a landing pad. Several workers are stranded on exposed scaffolding. How would you respond?'

**Player choices:**

1. **`method01`** — “I would guide the workers toward the nearest protected stairway.”
2. **`method02`** — “I would identify which threat is preventing them from moving safely.”
3. **`method03`** — “I would coordinate with defenders to cover the evacuation.”
4. **`method04`** — “I would use available barriers to keep the workers out of danger.”
5. **`method05`** — “I would seek a pause in the fighting before anyone risks a crossing.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_defense.seed06` — The broken checkpoint

**Destination:** Jedi · **Q1 family:** `saber_defense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: An abandoned checkpoint still has functioning automated defenses. Refugees want to cross because the longer road is exposed to a storm. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would assess the defenses from safety before approaching the road.”
2. **`method02`** — “I would keep the refugees back until there is a verified safe route.”
3. **`method03`** — “I would look for a way around the checkpoint without disabling anything.”
4. **`method04`** — “I would ask technicians to determine whether the defenses can be shut down.”
5. **`method05`** — “I would organize a protected passage only if the risk becomes manageable.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_defense.seed07` — The disputed weapon

**Destination:** Jedi · **Q1 family:** `saber_defense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A guard demands that a visitor surrender a family heirloom blade at a public ceremony. The visitor refuses, and nearby people are gathering. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would explain the guard's security concern without endorsing unnecessary force.”
2. **`method02`** — “I would ask whether the heirloom can be secured under agreed conditions.”
3. **`method03`** — “I would keep onlookers from crowding the argument.”
4. **`method04`** — “I would stand ready to protect someone if the dispute turns violent.”
5. **`method05`** — “I would suggest moving the discussion away from the ceremony.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_finesse.seed02` — The narrow demonstration

**Destination:** Jedi · **Q1 family:** `saber_finesse` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: Two masters invite a trainee to demonstrate blade control on a narrow platform. Spectators stand too close to the edge. How would you respond?'

**Player choices:**

1. **`method01`** — “I would insist that the platform be cleared before any demonstration.”
2. **`method02`** — “I would study the spacing and use controlled, minimal movements.”
3. **`method03`** — “I would ask for a slower exchange that favors precision over force.”
4. **`method04`** — “I would stop the exercise if a spectator refuses to move.”
5. **`method05`** — “I would offer a safer demonstration of balance and timing instead.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_finesse.seed03` — The impatient challenger

**Destination:** Jedi · **Q1 family:** `saber_finesse` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: A skilled duelist demands an immediate sparring match to settle an argument. Both of you have room to retreat, but the challenger is trying to provoke a mistake. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would keep my movements measured rather than match the challenger's anger.”
2. **`method02`** — “I would ask what the duel is supposed to resolve before accepting.”
3. **`method03`** — “I would observe their footwork before committing to an exchange.”
4. **`method04`** — “I would propose a supervised practice bout with clear limits.”
5. **`method05`** — “I would decline the match if it would turn a disagreement into harm.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_finesse.seed04` — The moving walkway

**Destination:** Jedi · **Q1 family:** `saber_finesse` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A guard confronts a fugitive on a moving cargo walkway. Workers are operating nearby machinery and cannot see the threat. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would warn the workers and keep the confrontation away from them.”
2. **`method02`** — “I would use careful positioning rather than a reckless rush.”
3. **`method03`** — “I would look for a safe place to stop the walkway.”
4. **`method04`** — “I would ask the fugitive to surrender without forcing a fight.”
5. **`method05`** — “I would move to protect anyone caught between the two armed people.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_finesse.seed05` — The fragile gallery

**Destination:** Jedi · **Q1 family:** `saber_finesse` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A ceremonial blade contest is scheduled inside a gallery of priceless artifacts. Competitors are expected to demonstrate restraint. How would you respond?'

**Player choices:**

1. **`method01`** — “I would study the room and mark the surfaces that must remain untouched.”
2. **`method02`** — “I would use deliberate technique that avoids wide uncontrolled movements.”
3. **`method03`** — “I would suggest an alternative practice area with more space.”
4. **`method04`** — “I would ask the judges to clarify the safety conditions.”
5. **`method05`** — “I would withdraw if the contest values spectacle over safety.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_finesse.seed06` — The disrupted lesson

**Destination:** Jedi · **Q1 family:** `saber_finesse` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: A sparring student keeps charging forward and loses control near younger trainees. The instructor asks for a calm intervention. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would slow the exercise down and demonstrate a safer exchange.”
2. **`method02`** — “I would keep the younger trainees away from the practice area.”
3. **`method03`** — “I would ask the student what they are trying to prove with each rush.”
4. **`method04`** — “I would help the instructor set a clearer progression for the lesson.”
5. **`method05`** — “I would end the exercise until the student can follow the safety rules.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.saber_finesse.seed07` — The bridge standoff

**Destination:** Jedi · **Q1 family:** `saber_finesse` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: Two armed rivals face each other on a narrow bridge while travelers wait behind them. Neither has room for a dramatic attack without risking others. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would speak to both rivals before anyone makes the first move.”
2. **`method02`** — “I would move the travelers away from the bridge's approaches.”
3. **`method03`** — “I would keep my stance conservative and protect the nearest bystander.”
4. **`method04`** — “I would look for a way to separate the rivals without driving either over the edge.”
5. **`method05`** — “I would request help from someone both rivals recognize.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.sense.seed02` — The absent vibration

**Destination:** Jedi · **Q1 family:** `sense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: A maintenance officer reports that a power station feels wrong despite normal instrument readings. The crew dismisses the concern as nerves. How would you respond?'

**Player choices:**

1. **`method01`** — “I would ask the officer exactly what changed before the readings appeared normal.”
2. **`method02`** — “I would inspect the station for ordinary warning signs we can verify.”
3. **`method03`** — “I would keep workers away from exposed systems until the concern is resolved.”
4. **`method04`** — “I would compare recent maintenance reports for a pattern.”
5. **`method05`** — “I would ask an experienced technician to review the instruments independently.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.sense.seed03` — The nervous courier

**Destination:** Jedi · **Q1 family:** `sense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: A courier arrives with an urgent message and seems unusually frightened. Their escort claims the journey was uneventful. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would ask the courier what happened along the route.”
2. **`method02`** — “I would observe whether the escort's account matches the visible evidence.”
3. **`method03`** — “I would arrange a quiet place where the courier can speak without pressure.”
4. **`method04`** — “I would verify the message's origin before acting on it.”
5. **`method05`** — “I would warn the team that the situation may be more complicated than it appears.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.sense.seed04` — The too-quiet corridor

**Destination:** Jedi · **Q1 family:** `sense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A ship's passageway is unusually empty, although the duty roster shows that several crew members should be working there. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would check the duty roster against the latest crew reports.”
2. **`method02`** — “I would look for signs of a hurried departure or mechanical failure.”
3. **`method03`** — “I would keep companions together until we understand the absence.”
4. **`method04`** — “I would contact another station before entering the corridor.”
5. **`method05`** — “I would choose a different route if the passage remains unexplained.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.sense.seed05` — The false distress call

**Destination:** Jedi · **Q1 family:** `sense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Consider this: Two distress signals arrive from the same moon with incompatible coordinates. Both claim that lives are in immediate danger. How would you respond?'

**Player choices:**

1. **`method01`** — “I would compare timing and signal characteristics before choosing a destination.”
2. **`method02`** — “I would contact both sources with questions only a real crew could answer.”
3. **`method03`** — “I would alert the rescue team that one report may be unreliable.”
4. **`method04`** — “I would send a remote observer to examine the safer location first.”
5. **`method05`** — “I would prepare a response that can divert quickly if new information appears.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.sense.seed06` — The gathering crowd

**Destination:** Jedi · **Q1 family:** `sense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Imagine finding yourself here: People begin leaving a public ceremony before any alarm has sounded. The officials insist nothing is wrong and order everyone to stay. Where would you begin?'

**Player choices:**

1. **`method01`** — “I would ask those departing what caused their concern.”
2. **`method02`** — “I would inspect likely exits before encouraging anyone to remain.”
3. **`method03`** — “I would quietly inform the safety officers of the unusual movement.”
4. **`method04`** — “I would help people leave in an orderly fashion if they feel unsafe.”
5. **`method05`** — “I would verify whether there is an ordinary explanation before spreading alarm.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.jedi.sense.seed07` — The silent companion

**Destination:** Jedi · **Q1 family:** `sense` · **Status:** draft; not rules-tag certified

**Scenario:** Miraj: 'Suppose this happened: A usually talkative companion becomes withdrawn just before a dangerous journey. They insist they are fine and ask not to be questioned. What seems the right first step to you?'

**Player choices:**

1. **`method01`** — “I would offer to listen without demanding an explanation.”
2. **`method02`** — “I would check whether the journey presents risks they may have noticed.”
3. **`method03`** — “I would respect their privacy while making sure they are not being threatened.”
4. **`method04`** — “I would ask what support they would find helpful.”
5. **`method05`** — “I would remain attentive without interpreting silence as proof of hidden intent.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the situation more clearly before acting.”

#### `q4.noble.connections.seed02` — The stranded relief fleet

**Destination:** Noble · **Q1 family:** `connections` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: Three aid transports have fuel but no clearance to dock. The station chief knows someone who could grant access, yet refuses to call in a favor. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would learn why the chief is reluctant before asking for help.”
2. **`method02`** — “I would contact a trusted port intermediary who can verify the emergency.”
3. **`method03`** — “I would negotiate a written docking arrangement that protects the station.”
4. **`method04`** — “I would locate a secondary depot through existing trade contacts.”
5. **`method05`** — “I would arrange immediate transfers for critical supplies while clearance is discussed.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.connections.seed03` — The empty repair yard

**Destination:** Noble · **Q1 family:** `connections` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: A settlement's only water pump is failing, and the replacement part is unavailable through normal channels for weeks. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would ask local mechanics which substitutes they would actually trust.”
2. **`method02`** — “I would reach out to suppliers who can locate compatible parts.”
3. **`method03`** — “I would arrange transport with a pilot willing to carry a small emergency shipment.”
4. **`method04`** — “I would secure temporary funding without indebting the settlement to a predator.”
5. **`method05`** — “I would negotiate shared use of a nearby working pump while repairs proceed.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.connections.seed04` — The missing translator

**Destination:** Noble · **Q1 family:** `connections` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Assessment exercise, Master: An important meeting is scheduled with visitors whose language no one on the team speaks reliably. The only qualified translator has disappeared. What would you do?'

**Player choices:**

1. **`method01`** — “I would contact the translator's colleagues to learn where they went.”
2. **`method02`** — “I would arrange another qualified interpreter with an impartial reputation.”
3. **`method03`** — “I would postpone the sensitive decisions rather than rely on guessed meanings.”
4. **`method04`** — “I would ask each delegation whether a limited preliminary exchange is acceptable.”
5. **`method05`** — “I would establish a secure channel for written translations that can be checked.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.connections.seed05` — The inaccessible archive

**Destination:** Noble · **Q1 family:** `connections` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: A research expedition needs access to a privately owned archive. Its curator distrusts outsiders after earlier collections were damaged. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would ask the curator what safeguards would earn their trust.”
2. **`method02`** — “I would find a mutual acquaintance who can introduce us properly.”
3. **`method03`** — “I would offer a conservation specialist to protect fragile materials.”
4. **`method04`** — “I would negotiate access to copies before requesting the originals.”
5. **`method05`** — “I would seek parallel records from public institutions if access remains closed.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.connections.seed06` — The isolated outpost

**Destination:** Noble · **Q1 family:** `connections` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: A remote outpost cannot reach its usual resupply service. Several crews could help, but their captains have conflicting obligations. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would contact each captain with a clear account of the urgent need.”
2. **`method02`** — “I would coordinate a partial delivery among multiple willing crews.”
3. **`method03`** — “I would secure payment or guarantees that prevent the crews from taking unfair losses.”
4. **`method04`** — “I would ask local contacts what supplies could be produced nearby.”
5. **`method05`** — “I would prioritize medicine and shelter materials if no full shipment is possible.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.connections.seed07` — The council favor

**Destination:** Noble · **Q1 family:** `connections` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Assessment exercise, Master: A council member offers immediate support for an investigation but expects an unrelated political endorsement in return. What would you do?'

**Player choices:**

1. **`method01`** — “I would clarify the proposed exchange before accepting any assistance.”
2. **`method02`** — “I would seek support from contacts without the same political conditions.”
3. **`method03`** — “I would negotiate a limited transparent agreement tied only to the investigation.”
4. **`method04`** — “I would explain the risk of hidden obligations to the people affected.”
5. **`method05`** — “I would proceed with fewer resources rather than compromise the investigation's independence.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.fencing.seed02` — The formal challenge

**Destination:** Noble · **Q1 family:** `fencing` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: A governor's aide challenges a companion to an exhibition duel after a diplomatic insult. Refusing could damage negotiations, but accepting might inflame the dispute. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would learn the duel's rules and whether the challenge can be withdrawn honorably.”
2. **`method02`** — “I would offer to negotiate a less dangerous demonstration of skill.”
3. **`method03`** — “I would study the aide's stance and choose a patient defensive approach.”
4. **`method04`** — “I would appoint impartial witnesses before anyone draws a blade.”
5. **`method05`** — “I would protect the negotiations by refusing any terms that endanger bystanders.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.fencing.seed03` — The palace corridor

**Destination:** Noble · **Q1 family:** `fencing` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: Two armed guards block a narrow passage during an evacuation. They appear uncertain whether their orders still apply. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would speak to the guards before treating them as enemies.”
2. **`method02`** — “I would look for a route that avoids forcing a fight in the corridor.”
3. **`method03`** — “I would maintain distance and prepare to defend someone who cannot retreat.”
4. **`method04`** — “I would ask who can authorize safe passage through their post.”
5. **`method05`** — “I would move the evacuees to cover while a solution is found.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.fencing.seed04` — The crowded tournament

**Destination:** Noble · **Q1 family:** `fencing` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Assessment exercise, Master: A training tournament is interrupted by an argument between competitors. Spectators are close enough to be injured if weapons are drawn. What would you do?'

**Player choices:**

1. **`method01`** — “I would ask the organizers to separate the competitors before tempers rise.”
2. **`method02`** — “I would place myself between the argument and the nearest spectators.”
3. **`method03`** — “I would encourage a supervised exchange under safe rules.”
4. **`method04`** — “I would watch for signs that one competitor intends a real attack.”
5. **`method05`** — “I would clear a route for the spectators rather than win the argument.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.fencing.seed05` — The captured blade

**Destination:** Noble · **Q1 family:** `fencing` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: A frightened courier hands over a ceremonial sword that a local faction believes was stolen. Both sides are gathering in the square. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would verify the sword's provenance before deciding whom to return it to.”
2. **`method02`** — “I would keep the weapon secured where neither faction can seize it.”
3. **`method03`** — “I would offer a formal handover witnessed by both groups.”
4. **`method04`** — “I would speak to the faction leaders about preventing a public confrontation.”
5. **`method05`** — “I would arrange the courier's safe departure before tensions peak.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.fencing.seed06` — The training dispute

**Destination:** Noble · **Q1 family:** `fencing` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: Two students are sparring far too aggressively because each believes the other is being favored. Their instructor asks you to intervene. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would stop the bout and ask each student to explain the grievance.”
2. **`method02`** — “I would demonstrate how controlled timing matters more than reckless force.”
3. **`method03`** — “I would have them practice defensive exchanges under clear limits.”
4. **`method04`** — “I would ask the instructor to explain the standards used to judge them.”
5. **`method05`** — “I would separate the students until they can work without risking injury.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.fencing.seed07` — The guarded stairwell

**Destination:** Noble · **Q1 family:** `fencing` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Assessment exercise, Master: An armed officer controls access to an upper platform where injured civilians are sheltering. A fight on the stairs would be especially dangerous. What would you do?'

**Player choices:**

1. **`method01`** — “I would try to persuade the officer to allow an orderly evacuation.”
2. **`method02`** — “I would assess the narrow landing before committing to any movement.”
3. **`method03`** — “I would prepare to protect the civilians if the officer attacks.”
4. **`method04`** — “I would send someone to find the officer's superior or a legal clearance.”
5. **`method05`** — “I would use another access point if it keeps the wounded out of danger.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.influence.seed02` — The disputed reservoir

**Destination:** Noble · **Q1 family:** `influence` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: Two villages share a filtration plant, but the western council has shut the valves after accusing its neighbors of taking extra water. A medical convoy waits at the gate. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would review the water records with both councils before supporting either claim.”
2. **`method02`** — “I would propose a temporary shared allotment that keeps the clinics operating.”
3. **`method03`** — “I would invite the plant workers to explain what actually failed.”
4. **`method04`** — “I would ask each council what guarantee would make reopening the valves acceptable.”
5. **`method05`** — “I would secure emergency water elsewhere while we work toward an agreement.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.influence.seed03` — The striking dockworkers

**Destination:** Noble · **Q1 family:** `influence` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: Loading crews refuse to unload relief cargo until the port authority addresses dangerous shifts. The harbor master threatens to bring in armed guards. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would hear the crew representatives without the harbor master present.”
2. **`method02`** — “I would offer a supervised trial shift while safety conditions are reviewed.”
3. **`method03`** — “I would ask an independent inspector to assess the dangerous equipment.”
4. **`method04`** — “I would convince the harbor master that force will delay deliveries longer.”
5. **`method05`** — “I would organize a smaller emergency unloading team with the crews' consent.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.influence.seed04` — The contested inheritance

**Destination:** Noble · **Q1 family:** `influence` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Assessment exercise, Master: Two families claim a community shelter gifted by an absent benefactor. A storm is approaching, and neither will permit evacuees inside. What would you do?'

**Player choices:**

1. **`method01`** — “I would examine the original deed and ask both families to identify their evidence.”
2. **`method02`** — “I would negotiate immediate shared access without settling ownership today.”
3. **`method03`** — “I would speak with residents who remember the benefactor's intentions.”
4. **`method04`** — “I would arrange a respected mediator before resentment becomes permanent.”
5. **`method05`** — “I would secure another shelter first so no one bargains over people's safety.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.influence.seed05` — The border toll

**Destination:** Noble · **Q1 family:** `influence` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: A local governor demands an unexpected transit payment from supply haulers, claiming it funds road repairs. The neighboring settlement calls it extortion. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would ask for the repair budget and compare it with the charges collected.”
2. **`method02`** — “I would negotiate a temporary passage permit while the dispute is examined.”
3. **`method03`** — “I would bring haulers and road workers into the same discussion.”
4. **`method04`** — “I would offer an auditable schedule of tolls instead of discretionary seizures.”
5. **`method05`** — “I would reroute urgent medicine while the authorities reconsider the demand.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.influence.seed06` — The quarantined shuttle

**Destination:** Noble · **Q1 family:** `influence` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: A station administrator blocks a passenger shuttle after an unconfirmed infection report. Travelers insist their families need them immediately. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would establish which medical facts justify keeping the shuttle closed.”
2. **`method02`** — “I would propose a supervised health check and limited passenger release.”
3. **`method03`** — “I would ask the travelers to choose a representative who can speak for them.”
4. **`method04`** — “I would negotiate conditions both medical staff and passengers can accept.”
5. **`method05`** — “I would arrange messages and supplies for everyone still waiting aboard.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.inspiration.seed02` — The unfinished bridge

**Destination:** Noble · **Q1 family:** `inspiration` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: A repair crew has worked through the night after a bridge collapse. Their tools still function, but the exhausted workers have started blaming one another. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would listen to what the crew believes is preventing progress.”
2. **`method02`** — “I would break the repair into achievable steps the team can complete.”
3. **`method03`** — “I would ask the most exhausted workers to rest while others take over.”
4. **`method04`** — “I would work beside the crew on a task that can safely be shared.”
5. **`method05`** — “I would remind everyone who is waiting for the bridge without dismissing their fatigue.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.inspiration.seed03` — The failed first rescue

**Destination:** Noble · **Q1 family:** `inspiration` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: A volunteer boat crew has returned after being driven back by rough water. One member refuses to try again and others are beginning to agree. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would give the crew space to explain exactly what frightened them.”
2. **`method02`** — “I would help them redesign the approach before discussing another attempt.”
3. **`method03`** — “I would assign the reluctant volunteer a useful shore-based role.”
4. **`method04`** — “I would ask an experienced pilot to coach the team through the new route.”
5. **`method05`** — “I would make sure everyone understands that no one has to risk a reckless second attempt.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.inspiration.seed04` — The overwhelmed clinic

**Destination:** Noble · **Q1 family:** `inspiration` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Assessment exercise, Master: A temporary clinic has more patients than beds, and several young aides have begun to panic. The physician needs their help to continue treatment. What would you do?'

**Player choices:**

1. **`method01`** — “I would help the aides focus on one manageable task at a time.”
2. **`method02`** — “I would ask the physician to explain priorities clearly to everyone.”
3. **`method03`** — “I would keep frightened patients informed while the aides regroup.”
4. **`method04`** — “I would recognize which aide needs a break before a mistake occurs.”
5. **`method05`** — “I would take over simple support work so the trained staff can concentrate.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.inspiration.seed05` — The uncertain recruits

**Destination:** Noble · **Q1 family:** `inspiration` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: Newly recruited settlement guards are expected to escort supplies after hearing rumors of an ambush. No one wants to admit they are afraid. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would invite them to describe their concerns without ridicule.”
2. **`method02`** — “I would pair inexperienced guards with people who know the route.”
3. **`method03`** — “I would show them the safety plan and explain when retreat is acceptable.”
4. **`method04`** — “I would organize a short rehearsal so the unfamiliar steps feel manageable.”
5. **`method05`** — “I would suggest another escort arrangement if the recruits are not ready.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.inspiration.seed06` — The abandoned observatory

**Destination:** Noble · **Q1 family:** `inspiration` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: Scholars have spent months restoring an observatory, only to learn that their first readings were corrupted. Funding is now in question. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would ask them what reliable results the project has produced already.”
2. **`method02`** — “I would help them identify one modest experiment that can restore confidence.”
3. **`method03`** — “I would speak to the funders about the value of correcting mistakes openly.”
4. **`method04`** — “I would redistribute tasks so no one carries all the blame.”
5. **`method05`** — “I would encourage a fresh review by someone outside the team.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.inspiration.seed07` — The delayed relief

**Destination:** Noble · **Q1 family:** `inspiration` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Assessment exercise, Master: Distribution volunteers have spent days waiting for promised rations. An angry crowd is approaching, and the volunteers feel abandoned by their supervisors. What would you do?'

**Player choices:**

1. **`method01`** — “I would tell the volunteers exactly what supplies are still available.”
2. **`method02`** — “I would encourage them to meet the crowd respectfully instead of hiding.”
3. **`method03`** — “I would assign manageable duties so people know where to begin.”
4. **`method04`** — “I would seek help from local leaders who can steady the situation.”
5. **`method05`** — “I would stop distribution briefly if conditions become unsafe for everyone.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.knowledge.seed02` — The contradictory star chart

**Destination:** Noble · **Q1 family:** `knowledge` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: A trade delegation carries two official route maps showing different borders. Choosing the wrong route could be taken as a political provocation. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would compare the dates and issuing authorities of both charts.”
2. **`method02`** — “I would consult navigators familiar with the actual border patrols.”
3. **`method03`** — “I would identify a route both governments have previously accepted.”
4. **`method04`** — “I would explain the uncertainty to the delegation before they commit.”
5. **`method05`** — “I would request a temporary transit ruling instead of guessing.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.knowledge.seed03` — The vanished treaty clause

**Destination:** Noble · **Q1 family:** `knowledge` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: A local magistrate cites a clause that appears in one treaty copy but not another. The ruling affects hundreds of displaced people. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would find the oldest authenticated versions of the treaty.”
2. **`method02`** — “I would interview the clerks who recorded the disputed amendment.”
3. **`method03`** — “I would identify which authority has jurisdiction to interpret the clause.”
4. **`method04`** — “I would present the consequences of both interpretations to the affected families.”
5. **`method05`** — “I would seek provisional protection while the document dispute is resolved.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.knowledge.seed04` — The unfamiliar ritual

**Destination:** Noble · **Q1 family:** `knowledge` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Assessment exercise, Master: A remote community refuses medical assistance until a traditional ceremony is completed. Outsiders are dismissing the delay as irrational. What would you do?'

**Player choices:**

1. **`method01`** — “I would learn what the ceremony means to the community before intervening.”
2. **`method02`** — “I would ask the community's healers how urgent care can be accommodated.”
3. **`method03`** — “I would compare the claimed medical danger with what our team can verify.”
4. **`method04`** — “I would explain the visitors' concerns without belittling local beliefs.”
5. **`method05`** — “I would arrange respectful temporary treatment while the ceremony proceeds.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.knowledge.seed05` — The old service droid

**Destination:** Noble · **Q1 family:** `knowledge` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: A municipal droid cites a century-old protocol to prevent access to emergency shelters. The current mayor cannot find the rule it refers to. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would trace the protocol to its original legal and technical source.”
2. **`method02`** — “I would ask technicians what parts of the rule the droid actually enforces.”
3. **`method03`** — “I would research whether the municipal charter superseded that protocol.”
4. **`method04`** — “I would present the mayor with a documented temporary authorization.”
5. **`method05`** — “I would organize an alternate entrance rather than forcing the droid aside.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.knowledge.seed06` — The disputed census

**Destination:** Noble · **Q1 family:** `knowledge` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: A relief grant was denied because the settlement's official population appears too small. Families insist the census missed entire neighborhoods. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would examine how the population count was originally collected.”
2. **`method02`** — “I would compare clinic and school records against the official census.”
3. **`method03`** — “I would interview residents in areas omitted from the map.”
4. **`method04`** — “I would prepare a corrected estimate with uncertainty clearly stated.”
5. **`method05`** — “I would obtain emergency support while the census is independently checked.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.knowledge.seed07` — The conflicting testimony

**Destination:** Noble · **Q1 family:** `knowledge` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Assessment exercise, Master: Witnesses disagree about when a warehouse fire began, and an innocent worker may lose their position. Everyone claims certainty. What would you do?'

**Player choices:**

1. **`method01`** — “I would reconstruct the timeline from independently recorded events.”
2. **`method02`** — “I would identify what each witness could actually have seen.”
3. **`method03`** — “I would separate assumptions from observations before questioning anyone again.”
4. **`method04`** — “I would ask an impartial expert about the fire's likely sequence.”
5. **`method05`** — “I would recommend delaying judgment until the central contradiction is resolved.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.leadership.seed02` — The split search teams

**Destination:** Noble · **Q1 family:** `leadership` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: Two search crews are looking for missing miners. Each believes the other has missed the right tunnel, and neither will share its maps. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would bring both crews together to establish a single search objective.”
2. **`method02`** — “I would divide the tunnels by available equipment rather than pride.”
3. **`method03`** — “I would appoint a liaison to exchange findings every few minutes.”
4. **`method04`** — “I would ask the most experienced miner to identify the gravest shared risk.”
5. **`method05`** — “I would pause the competing searches until we know no one is working in a collapsing shaft.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.leadership.seed03` — The evacuation queue

**Destination:** Noble · **Q1 family:** `leadership` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: A settlement evacuation has stalled because transport captains keep choosing their own passengers. Families are being separated as the weather worsens. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would establish a transparent boarding order and explain it to everyone.”
2. **`method02`** — “I would assign crew members to reunite families before departure.”
3. **`method03`** — “I would ask captains what capacity they can actually guarantee.”
4. **`method04`** — “I would create a small team to find people still missing from the queue.”
5. **`method05`** — “I would reserve one transport for medical emergencies while the others load.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.leadership.seed04` — The damaged command post

**Destination:** Noble · **Q1 family:** `leadership` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Assessment exercise, Master: A communications center loses its commanding officer just as three outlying teams report unrelated emergencies. Everyone looks to the same overloaded dispatcher. What would you do?'

**Player choices:**

1. **`method01`** — “I would establish which emergency threatens lives most immediately.”
2. **`method02`** — “I would delegate each report to a capable person with clear authority.”
3. **`method03`** — “I would set a common update interval so no team is forgotten.”
4. **`method04`** — “I would verify the dispatcher has support before giving more orders.”
5. **`method05`** — “I would move the coordination point to a quieter location where decisions can be made.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.leadership.seed05` — The volunteer disagreement

**Destination:** Noble · **Q1 family:** `leadership` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Hypothetical Scenario, Master: A neighborhood defense group has trained volunteers but no agreed leader. Some want a visible patrol, others favor quiet observation of suspicious activity. How would you proceed?'

**Player choices:**

1. **`method01`** — “I would ask the volunteers to agree on what success looks like first.”
2. **`method02`** — “I would assign separate observation and response roles with clear boundaries.”
3. **`method03`** — “I would appoint temporary leaders and review their decisions after the shift.”
4. **`method04`** — “I would solicit the concerns of residents before sending anyone out.”
5. **`method05`** — “I would keep the volunteers on standby until we know what threat we actually face.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.leadership.seed06` — The stalled restoration

**Destination:** Noble · **Q1 family:** `leadership` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Consider this complication, Master: Engineers, medics, and local officials all need the same generator after a blackout. Their competing plans cannot all work at once. Which action would you take first?'

**Player choices:**

1. **`method01`** — “I would make each group identify the consequences of delaying its work.”
2. **`method02`** — “I would assign generator access according to immediate safety needs.”
3. **`method03`** — “I would arrange a schedule everyone can inspect and challenge.”
4. **`method04`** — “I would find a smaller backup source for the task requiring least power.”
5. **`method05`** — “I would personally check whether the proposed schedule protects vulnerable residents.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.noble.leadership.seed07` — The lost expedition

**Destination:** Noble · **Q1 family:** `leadership` · **Status:** draft; not rules-tag certified

**Scenario:** J0-N1: 'Assessment exercise, Master: An exploration party returns without its leader, carrying conflicting accounts of what happened. Another group is ready to rush out immediately. What would you do?'

**Player choices:**

1. **`method01`** — “I would establish one verified timeline before organizing another departure.”
2. **`method02`** — “I would assign separate responsibilities for navigation, supplies, and rescue.”
3. **`method03`** — “I would ask the returning members who is fit to join a second expedition.”
4. **`method04`** — “I would keep a reserve team ready in case the first plan fails.”
5. **`method05`** — “I would tell the families exactly what we know and what remains uncertain.”
6. **`undecided`** — “I'm not sure yet. I would want to understand the risks and interests involved before deciding.”

#### `q4.scoundrel.contacts.seed02` — The silent fixer

**Destination:** Scoundrel · **Q1 family:** `contacts` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A familiar broker stops responding just as the crew needs a replacement hyperdrive seal. Their last message sounded unusually cautious. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would check whether the broker is safe before requesting another favor.”
2. **`method02`** — “I would ask a trusted intermediary about a legitimate spare supplier.”
3. **`method03`** — “I would seek the part through ordinary repair channels as a backup.”
4. **`method04`** — “I would avoid revealing the broker's location to strangers.”
5. **`method05`** — “I would postpone the jump if the seal cannot be verified.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.contacts.seed03` — The disputed docking berth

**Destination:** Scoundrel · **Q1 family:** `contacts` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A station employee offers to correct an unfair berth assignment in exchange for a personal favor. The crew has urgent cargo. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would ask for the station's published appeal procedure.”
2. **`method02`** — “I would contact a supervisor who can review the assignment openly.”
3. **`method03`** — “I would negotiate a temporary unloading slot without private obligations.”
4. **`method04`** — “I would arrange another port if the delay threatens the cargo.”
5. **`method05`** — “I would decline the favor if it would compromise someone else's rights.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.contacts.seed04` — The vanished recommendation

**Destination:** Scoundrel · **Q1 family:** `contacts` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: A respected pilot promised to introduce the crew to a shipwright, but the shipwright claims no introduction was made. The engines need inspection. What would ye do?'

**Player choices:**

1. **`method01`** — “I would speak to the pilot before assuming anyone lied.”
2. **`method02`** — “I would ask the shipwright what proof of referral they require.”
3. **`method03`** — “I would obtain an independent recommendation from another trusted contact.”
4. **`method04`** — “I would agree to a normal inspection fee rather than demand special treatment.”
5. **`method05`** — “I would seek another repair yard if the relationship cannot be repaired.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.contacts.seed05` — The rumor market

**Destination:** Scoundrel · **Q1 family:** `contacts` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: Several informants offer contradictory information about a missing cargo container. Each expects payment before revealing sources. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would compare what the informants can independently verify.”
2. **`method02`** — “I would offer payment only for specific, useful information.”
3. **`method03`** — “I would ask warehouse staff for records before buying rumors.”
4. **`method04`** — “I would protect any informant whose identity could be exposed.”
5. **`method05`** — “I would accept that the container may remain missing until evidence improves.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.contacts.seed06` — The unreliable safehouse

**Destination:** Scoundrel · **Q1 family:** `contacts` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A friend offers a safehouse for a frightened passenger, but the location may be known to hostile pursuers. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would ask the friend who else knows the address.”
2. **`method02`** — “I would find another place through a different trusted contact.”
3. **`method03`** — “I would arrange transport that does not reveal the passenger's destination.”
4. **`method04`** — “I would tell the passenger what risks remain instead of making guarantees.”
5. **`method05`** — “I would delay the move until a genuinely safer option is found.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.contacts.seed07` — The strained captain's favor

**Destination:** Scoundrel · **Q1 family:** `contacts` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: A captain owes the crew a favor but is preparing to evacuate their own family. You need passage for a medical shipment. What would ye do?'

**Player choices:**

1. **`method01`** — “I would ask the captain whether helping would endanger their family.”
2. **`method02`** — “I would seek shared space with another departing ship.”
3. **`method03`** — “I would offer resources that make both journeys possible.”
4. **`method04`** — “I would arrange a smaller urgent shipment if full passage is unavailable.”
5. **`method05`** — “I would release the captain from the favor if there is no safe way to help.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.disguise.seed02` — The invitation-only banquet

**Destination:** Scoundrel · **Q1 family:** `disguise` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A charity banquet controls access by invitation, and an informant inside wants to pass along evidence of misused donations. Guards watch the entry table. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would learn the banquet's ordinary entry rules before attempting contact.”
2. **`method02`** — “I would arrange a credible introduction through an invited guest.”
3. **`method03`** — “I would ask the informant to meet outside rather than risk them inside.”
4. **`method04`** — “I would blend with the event's public activities without using a false identity.”
5. **`method05`** — “I would leave if the plan would expose the informant to retaliation.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.disguise.seed03` — The mistaken courier

**Destination:** Scoundrel · **Q1 family:** `disguise` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A docking clerk confuses you with an expected courier and offers a sealed package. The real courier may arrive at any moment. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would correct the clerk before accepting property that is not mine.”
2. **`method02`** — “I would ask whether the package can be secured while its owner is verified.”
3. **`method03`** — “I would use the confusion to learn who is waiting without taking the parcel.”
4. **`method04`** — “I would contact the intended courier through the listed delivery service.”
5. **`method05`** — “I would step aside and observe whether the mistake was deliberate.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.disguise.seed04` — The watched festival

**Destination:** Scoundrel · **Q1 family:** `disguise` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: A witness fears recognition by agents attending a crowded festival. Reaching the witness requires passing several costume checkpoints. What would ye do?'

**Player choices:**

1. **`method01`** — “I would ask the witness which costumes or routes would feel safe.”
2. **`method02`** — “I would choose a meeting place where ordinary festival crowds provide cover.”
3. **`method03`** — “I would seek permission to use an event staff entrance if possible.”
4. **`method04`** — “I would coordinate a discreet escort after the witness leaves.”
5. **`method05`** — “I would postpone contact if the agents seem to be targeting the witness.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.disguise.seed05` — The checkpoint resemblance

**Destination:** Scoundrel · **Q1 family:** `disguise` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A security scanner flags a passenger who resembles a wanted saboteur. The passenger claims mistaken identity and asks for help. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would compare verifiable records rather than rely on appearances.”
2. **`method02`** — “I would ask the passenger what documents can establish their identity.”
3. **`method03`** — “I would persuade guards to make the check privately and respectfully.”
4. **`method04`** — “I would find a neutral official who can review the identification.”
5. **`method05`** — “I would avoid manufacturing an identity that could deepen the passenger's trouble.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.disguise.seed06` — The borrowed uniform

**Destination:** Scoundrel · **Q1 family:** `disguise` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A station custodian offers a spare maintenance uniform to help you reach a locked public-records room. The custodian fears losing their job. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would ask whether authorized access can be arranged without a disguise.”
2. **`method02`** — “I would learn who is allowed into the records area and why.”
3. **`method03`** — “I would protect the custodian from being implicated in a risky scheme.”
4. **`method04`** — “I would request a copy through another department if possible.”
5. **`method05`** — “I would decline the uniform unless there is a compelling and safe reason.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.disguise.seed07` — The false inspector

**Destination:** Scoundrel · **Q1 family:** `disguise` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: Someone claiming to be a safety inspector is ordering residents out of their homes. The inspection credentials look convincing but no official notice exists. What would ye do?'

**Player choices:**

1. **`method01`** — “I would ask the visitor to identify the issuing office and contact number.”
2. **`method02`** — “I would compare their behavior with published inspection procedures.”
3. **`method03`** — “I would warn residents not to surrender keys until the claim is verified.”
4. **`method04`** — “I would question the visitor without publicly accusing them first.”
5. **`method05`** — “I would notify the legitimate safety office and preserve the evidence.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.evasive.seed02` — The crowded shuttle approach

**Destination:** Scoundrel · **Q1 family:** `evasive` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A customs patrol closes on a shuttle in a busy approach corridor. The pilot fears a mistake will cause a collision. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would check what the patrol is requesting before attempting to evade it.”
2. **`method02`** — “I would steer toward a clear route with adequate separation from traffic.”
3. **`method03`** — “I would ask the crew to verify our clearance documents.”
4. **`method04`** — “I would hail traffic control to mediate the encounter.”
5. **`method05`** — “I would hold a safe course rather than create danger for other ships.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.evasive.seed03` — The flooded escape street

**Destination:** Scoundrel · **Q1 family:** `evasive` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A pursuing group forces travelers toward a flooded street with poor visibility. The nearest bridge is crowded. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would choose an escape route that avoids the deepest water.”
2. **`method02`** — “I would warn the people on the bridge before the pursuit reaches them.”
3. **`method03`** — “I would use side passages to break sight without scattering the group.”
4. **`method04`** — “I would ask whether a local guide knows another crossing.”
5. **`method05`** — “I would stop fleeing if continuing would endanger uninvolved residents.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.evasive.seed04` — The closing hangar doors

**Destination:** Scoundrel · **Q1 family:** `evasive` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: A freighter's hangar doors begin closing early while workers are still loading a rescue craft. Security is approaching with a disputed detention order. What would ye do?'

**Player choices:**

1. **`method01`** — “I would ask control to halt the doors and verify the order.”
2. **`method02`** — “I would move workers clear of the closing machinery.”
3. **`method03`** — “I would identify a safe departure route that does not force the doors.”
4. **`method04`** — “I would coordinate with the crew to account for everyone aboard.”
5. **`method05`** — “I would remain and resolve the order if departure would risk lives.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.evasive.seed05` — The maze of maintenance lanes

**Destination:** Scoundrel · **Q1 family:** `evasive` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A courier flees into a maintenance district full of dead ends. A companion wants to split up to confuse the pursuers. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would keep the group together until we know the district's exits.”
2. **`method02`** — “I would use local maps to identify routes that actually connect.”
3. **`method03`** — “I would seek a crowded public route where the pursuers may hesitate.”
4. **`method04`** — “I would ask a local worker for a safe way out.”
5. **`method05`** — “I would find a defensible shelter instead of running into another dead end.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.evasive.seed06` — The stalled transit pod

**Destination:** Scoundrel · **Q1 family:** `evasive` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A transit pod stops between stations as security teams converge on both ends of the line. Several ordinary passengers are trapped with the crew. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would learn why the security teams want the pod before acting.”
2. **`method02`** — “I would help the passengers remain calm and accounted for.”
3. **`method03`** — “I would contact transit control for an authorized evacuation.”
4. **`method04`** — “I would look for maintenance access only after checking its safety.”
5. **`method05`** — “I would avoid a desperate escape that leaves others behind.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.fortune.seed02` — The last transport seat

**Destination:** Scoundrel · **Q1 family:** `fortune` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A rescue shuttle has one remaining seat and two stranded travelers. Both claim an urgent reason to leave first, and a storm is approaching. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would find out whether the shuttle can safely return for the second traveler.”
2. **`method02`** — “I would ask each person to explain the risks they face.”
3. **`method03`** — “I would search for another transport option before choosing between them.”
4. **`method04`** — “I would organize shelter for whoever cannot depart immediately.”
5. **`method05`** — “I would make a transparent decision if no other solution exists.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.fortune.seed03` — The faulty card reader

**Destination:** Scoundrel · **Q1 family:** `fortune` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: An old checkpoint reader rejects the group's valid permits twice. A guard offers one final scan before ordering everyone away. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would check the permits for an ordinary data mismatch.”
2. **`method02`** — “I would ask the guard for a manual verification instead of another blind attempt.”
3. **`method03`** — “I would contact the issuing office while we still have access.”
4. **`method04`** — “I would look for a different authorized entry point.”
5. **`method05`** — “I would accept a delay rather than turn a bad scan into a confrontation.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.fortune.seed04` — The narrow rescue window

**Destination:** Scoundrel · **Q1 family:** `fortune` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: An elevator will make one final descent before maintenance crews shut the shaft. A trapped technician may not reach it in time. What would ye do?'

**Player choices:**

1. **`method01`** — “I would ask the operator exactly how long the safe window remains.”
2. **`method02`** — “I would organize helpers to clear the technician's route.”
3. **`method03`** — “I would find another safe means of evacuation before relying on luck.”
4. **`method04`** — “I would communicate the timing clearly to the trapped person.”
5. **`method05`** — “I would refuse a rushed descent if the lift itself is unsafe.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.fortune.seed05` — The unreliable buyer

**Destination:** Scoundrel · **Q1 family:** `fortune` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A buyer offers a rare replacement component at a suspiciously low price. The deal expires when their ship departs. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would inspect the component before paying anything.”
2. **`method02`** — “I would ask why the price is unusually low.”
3. **`method03`** — “I would verify the seller's ownership through a trusted contact.”
4. **`method04`** — “I would negotiate a short hold while a technician checks compatibility.”
5. **`method05`** — “I would walk away if the urgency is meant to prevent questions.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.fortune.seed06` — The one useful signal

**Destination:** Scoundrel · **Q1 family:** `fortune` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A communications blackout leaves the crew with one brief transmission window. Several groups are asking for help at once. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would gather the essential facts before composing the message.”
2. **`method02`** — “I would prioritize the call that can save the most immediate lives.”
3. **`method03`** — “I would request a relay that can carry multiple alerts.”
4. **`method04`** — “I would ask the crew to prepare a second communication method.”
5. **`method05`** — “I would avoid claiming certainty about situations we cannot verify.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.fortune.seed07` — The mislaid clearance

**Destination:** Scoundrel · **Q1 family:** `fortune` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: A docking authority misplaces an approved cargo clearance moments before scheduled departure. The ship risks missing its next connection. What would ye do?'

**Player choices:**

1. **`method01`** — “I would ask the clerk to check the original authorization trail.”
2. **`method02`** — “I would obtain a verified duplicate instead of improvising a false document.”
3. **`method03`** — “I would contact the next port to explain the possible delay.”
4. **`method04`** — “I would use the wait to finish another necessary departure check.”
5. **`method05`** — “I would choose a later connection if the records cannot be resolved.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.opportunist.seed02` — The interrupted auction

**Destination:** Scoundrel · **Q1 family:** `opportunist` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A noisy auction stops when the lights flicker and bidders accuse each other of tampering. A contested artifact is left unattended on the podium. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would make sure the artifact is secured before someone exploits the confusion.”
2. **`method02`** — “I would ask the auctioneer for a public pause and a verified inventory.”
3. **`method03`** — “I would use the interruption to learn what the bidders are hiding.”
4. **`method04`** — “I would offer a practical way to restart fairly.”
5. **`method05`** — “I would leave the artifact alone if touching it would make us suspects.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.opportunist.seed03` — The diverted patrol

**Destination:** Scoundrel · **Q1 family:** `opportunist` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A patrol rushes toward a false alarm, leaving a public square temporarily unguarded. A worried merchant asks for help protecting their stall. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would use the quiet moment to move valuable stock to safer storage.”
2. **`method02`** — “I would ask why the alarm drew every guard away.”
3. **`method03`** — “I would coordinate nearby merchants to watch one another's goods.”
4. **`method04`** — “I would look for evidence that the distraction was deliberate.”
5. **`method05`** — “I would report the exposed square rather than take advantage of it for myself.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.opportunist.seed04` — The stalled chase

**Destination:** Scoundrel · **Q1 family:** `opportunist` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: Two rival couriers lose sight of one another in a crowded transit hub. A package has been dropped between moving passengers. What would ye do?'

**Player choices:**

1. **`method01`** — “I would keep the package from being trampled before deciding who owns it.”
2. **`method02`** — “I would ask nearby travelers what they saw.”
3. **`method03`** — “I would locate the couriers without drawing more people into a chase.”
4. **`method04`** — “I would use the pause to identify a safer meeting place.”
5. **`method05`** — “I would hand the package to a neutral attendant if ownership remains disputed.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.opportunist.seed05` — The unexpected blackout

**Destination:** Scoundrel · **Q1 family:** `opportunist` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A nightclub loses power during a heated negotiation. The exit signs remain lit but security staff seem confused. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would guide companions toward an exit before the crowd surges.”
2. **`method02`** — “I would ask the negotiators to resume somewhere safe.”
3. **`method03`** — “I would watch for anyone exploiting the darkness.”
4. **`method04`** — “I would use the interruption to reconsider whether the deal is worth making.”
5. **`method05`** — “I would help staff restore order rather than start another confrontation.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.opportunist.seed06` — The open service hatch

**Destination:** Scoundrel · **Q1 family:** `opportunist` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A technician leaves a public service hatch open while responding to an alarm. A companion suggests taking a shortcut through the machinery. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would ask the technician whether the passage is safe and permitted.”
2. **`method02`** — “I would look for another way through the building.”
3. **`method03`** — “I would use the chance to study the maintenance layout without entering.”
4. **`method04`** — “I would secure the hatch if it endangers passing civilians.”
5. **`method05`** — “I would wait for a legitimate escort rather than become trapped inside.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.opportunist.seed07` — The surprised rival

**Destination:** Scoundrel · **Q1 family:** `opportunist` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: A rival crew arrives at the wrong docking bay, giving your group a brief advantage in a tense race to retrieve supplies. What would ye do?'

**Player choices:**

1. **`method01`** — “I would verify the supplies belong to our side before moving them.”
2. **`method02`** — “I would use the extra moments to organize a clean departure.”
3. **`method03`** — “I would contact the rival crew and offer a fair handover.”
4. **`method04`** — “I would inspect the shipment for damage while they are delayed.”
5. **`method05`** — “I would avoid escalating the rivalry when we already have time to act.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.spacer.seed02` — The erratic docking beacon

**Destination:** Scoundrel · **Q1 family:** `spacer` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A dock beacon keeps shifting its indicated approach by a few degrees. Other pilots are still following the signal. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would cross-check the approach against independent instruments.”
2. **`method02`** — “I would warn traffic control that the beacon may be unreliable.”
3. **`method03`** — “I would ask the crew to monitor clearance from nearby vessels.”
4. **`method04`** — “I would choose a wider holding pattern until the approach is safe.”
5. **`method05`** — “I would abort docking if the station cannot confirm a stable corridor.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.spacer.seed03` — The failing life-support fan

**Destination:** Scoundrel · **Q1 family:** `spacer` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A small freighter's air-circulation fan slows just before a long transit. The captain insists the trip is too urgent to delay. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would ask the engineer how long the system can safely function.”
2. **`method02`** — “I would locate a suitable spare before committing to the journey.”
3. **`method03`** — “I would prepare an emergency return plan with the crew.”
4. **`method04`** — “I would redistribute passengers to functioning sections if appropriate.”
5. **`method05`** — “I would postpone departure rather than gamble on the air supply.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.spacer.seed04` — The drifting salvage barge

**Destination:** Scoundrel · **Q1 family:** `spacer` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: A salvage barge drifts near an active shipping lane after its pilot loses steering. The cargo is valuable but the crew needs rescue. What would ye do?'

**Player choices:**

1. **`method01`** — “I would contact the barge crew to establish their immediate needs.”
2. **`method02`** — “I would warn incoming ships about the drifting obstruction.”
3. **`method03`** — “I would arrange a controlled tow rather than improvise a collision course.”
4. **`method04`** — “I would prepare a safe transfer point for the stranded crew.”
5. **`method05`** — “I would let the cargo go if recovery would endanger the people aboard.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.spacer.seed05` — The crowded hyperlane exit

**Destination:** Scoundrel · **Q1 family:** `spacer` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: Several ships exit hyperspace close together near a festival station. Their captains are impatient to reach assigned berths. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would establish our position before maneuvering into traffic.”
2. **`method02`** — “I would ask the navigator to identify a low-risk holding area.”
3. **`method03`** — “I would communicate intentions clearly to nearby pilots.”
4. **`method04`** — “I would approach at a pace that allows room for unexpected moves.”
5. **`method05`** — “I would wait for congestion to ease rather than race another ship.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.spacer.seed06` — The cargo balance fault

**Destination:** Scoundrel · **Q1 family:** `spacer` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A transport lifts unevenly after an inexperienced loader shifts heavy crates to one side. A storm is coming, and the pilot wants to launch. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would check the load distribution before the ship leaves the pad.”
2. **`method02`** — “I would ask the loader to explain what changed and why.”
3. **`method03`** — “I would redistribute cargo under the loadmaster's direction.”
4. **`method04`** — “I would secure the crates before another test lift.”
5. **`method05`** — “I would delay departure until the ship handles predictably.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.spacer.seed07` — The silent transponder

**Destination:** Scoundrel · **Q1 family:** `spacer` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: An unidentified light craft approaches the freighter without broadcasting identification. The sensor officer cannot tell whether it is damaged or hostile. What would ye do?'

**Player choices:**

1. **`method01`** — “I would hail the craft using standard distress protocols.”
2. **`method02`** — “I would maneuver to keep a safe distance without provoking it.”
3. **`method03`** — “I would assign the crew to watch for signs of mechanical trouble.”
4. **`method04`** — “I would notify traffic control of the unidentified approach.”
5. **`method05`** — “I would prepare an alternate course if the craft continues closing.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.tech.seed02` — The locked transit ledger

**Destination:** Scoundrel · **Q1 family:** `tech` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A transit terminal's public records are inaccessible after a software update. A passenger needs evidence of a missed evacuation order. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would check which records remain accessible through authorized terminals.”
2. **`method02`** — “I would ask the transit operator for a documented export.”
3. **`method03`** — “I would preserve system logs before anyone resets the terminal.”
4. **`method04`** — “I would locate a backup copy held by another office.”
5. **`method05`** — “I would avoid changing the records while attempting to recover them.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.tech.seed03` — The repeating distress code

**Destination:** Scoundrel · **Q1 family:** `tech` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: An old droid keeps transmitting a distress call that no longer matches its current location. Nearby ships are being diverted unnecessarily. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would inspect the droid's status and last recorded coordinates.”
2. **`method02`** — “I would contact the traffic authority to warn of the incorrect signal.”
3. **`method03`** — “I would try a safe diagnostic before editing any settings.”
4. **`method04`** — “I would ask the droid what event triggered its alert if it can respond.”
5. **`method05`** — “I would isolate the faulty transmission only after arranging another way to call for help.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.tech.seed04` — The forged access token

**Destination:** Scoundrel · **Q1 family:** `tech` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: A security terminal accepts a suspicious credential that appears to belong to a retired employee. Staff fear someone has been entering restricted rooms. What would ye do?'

**Player choices:**

1. **`method01`** — “I would review the terminal logs for actual access events.”
2. **`method02`** — “I would ask the administrator to revoke the obsolete credential.”
3. **`method03`** — “I would check whether any doors were opened rather than assume a break-in.”
4. **`method04`** — “I would preserve a copy of the evidence before changing the system.”
5. **`method05`** — “I would coordinate an authorized inspection of the affected rooms.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.tech.seed05` — The silent cargo manifest

**Destination:** Scoundrel · **Q1 family:** `tech` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Arr, picture this, matey: A freighter's electronic manifest no longer lists a medical shipment the crew remembers loading. The hold seals are intact. What is yer next move?'

**Player choices:**

1. **`method01`** — “I would compare independent loading records with the current manifest.”
2. **`method02`** — “I would interview the crew members who handled the shipment.”
3. **`method03`** — “I would check for a harmless synchronization fault before assuming theft.”
4. **`method04`** — “I would request a supervised hold inspection.”
5. **`method05`** — “I would keep an untouched copy of the manifest for later review.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.tech.seed06` — The clinic authentication error

**Destination:** Scoundrel · **Q1 family:** `tech` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Here is a scrape for ye: A clinic's medical supply cabinet refuses valid staff credentials. Patients are waiting, but forcing the lock could damage sterile storage. How would ye play it?'

**Player choices:**

1. **`method01`** — “I would confirm the staff's permissions with the clinic administrator.”
2. **`method02`** — “I would check whether the cabinet is disconnected from its authority system.”
3. **`method03`** — “I would request an approved emergency override procedure.”
4. **`method04`** — “I would find alternate supplies while technicians investigate.”
5. **`method05`** — “I would preserve the cabinet's logs instead of blindly resetting it.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scoundrel.tech.seed07` — The corrupted scout map

**Destination:** Scoundrel · **Q1 family:** `tech` · **Status:** draft; not rules-tag certified

**Scenario:** Ol' Salty: 'Now, matey, reckon on this: A scout drone returns with a corrupted map of an evacuation route. A single misplaced marker could send travelers into a ravine. What would ye do?'

**Player choices:**

1. **`method01`** — “I would compare the map against earlier verified surveys.”
2. **`method02`** — “I would inspect the drone's storage for recoverable original data.”
3. **`method03`** — “I would mark all uncertain sections before distributing the map.”
4. **`method04`** — “I would ask local guides to verify the dangerous crossings.”
5. **`method05`** — “I would recommend a new survey rather than publish guessed coordinates.”
6. **`undecided`** — “I'm not sure yet. I'd want to see what choices are actually open before making a move.”

#### `q4.scout.recon.seed02` — The hidden checkpoint

**Destination:** Scout · **Q1 family:** `recon` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: A supply caravan reports that a checkpoint appeared overnight on its usual route. No one knows who operates it. What is your move?'

**Player choices:**

1. **`method01`** — “I would observe the checkpoint from a safe distance before approaching.”
2. **`method02`** — “I would record who enters and leaves without assuming anyone's allegiance.”
3. **`method03`** — “I would look for an alternate route that avoids disturbing the checkpoint.”
4. **`method04`** — “I would send a discreet report to the caravan's coordinator.”
5. **`method05`** — “I would arrange a legitimate inquiry about passage conditions.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.recon.seed03` — The uncertain rooftop

**Destination:** Scout · **Q1 family:** `recon` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: Guards say movement has been spotted on a roof near the market. They want to rush the building before checking who is there. Where do you start?'

**Player choices:**

1. **`method01`** — “I would identify what the observer actually saw and when.”
2. **`method02`** — “I would find a vantage point that does not alarm the market.”
3. **`method03`** — “I would check whether residents have lawful reason to be on the roof.”
4. **`method04`** — “I would coordinate the guards to watch exits rather than storm the building.”
5. **`method05`** — “I would report uncertainty rather than claim we have found an enemy.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.recon.seed04` — The disputed camp

**Destination:** Scout · **Q1 family:** `recon` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: Two scouts return with different estimates of how many people occupy a roadside camp. The number matters for a rescue mission. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would compare each scout's observation time and angle.”
2. **`method02`** — “I would make a second observation from another safe position.”
3. **`method03`** — “I would map the tents and vehicles without assuming who is inside.”
4. **`method04`** — “I would ask nearby travelers whether the camp has changed recently.”
5. **`method05`** — “I would communicate the range of possible numbers instead of guessing.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.recon.seed05` — The missing patrol report

**Destination:** Scout · **Q1 family:** `recon` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: A patrol misses its scheduled update near a remote relay tower. Headquarters wants an immediate answer about what happened. What is your move?'

**Player choices:**

1. **`method01`** — “I would check whether the relay itself is working before assuming an ambush.”
2. **`method02`** — “I would review the patrol's last verified position.”
3. **`method03`** — “I would approach the tower cautiously with a clear return route.”
4. **`method04`** — “I would seek other witnesses who may have seen the patrol pass.”
5. **`method05`** — “I would report the facts we have while arranging a search.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.recon.seed06` — The changing perimeter

**Destination:** Scout · **Q1 family:** `recon` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: A relief depot's security pattern has changed three times in one day. Staff assume someone is deliberately testing the guards. Where do you start?'

**Player choices:**

1. **`method01`** — “I would record the actual changes before drawing conclusions.”
2. **`method02`** — “I would ask the guard captain which shifts were planned.”
3. **`method03`** — “I would observe whether the changes create any genuine blind spots.”
4. **`method04`** — “I would suggest temporary watch coverage where evidence supports it.”
5. **`method05`** — “I would check for ordinary staffing problems before looking for an intruder.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.recon.seed07` — The crowded overlook

**Destination:** Scout · **Q1 family:** `recon` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: A high overlook offers a view of a contested road, but tourists and vendors use the same space. A hidden observation team would disrupt them. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would choose a less intrusive observation point.”
2. **`method02`** — “I would ask local vendors what patterns they have noticed.”
3. **`method03`** — “I would record movement without interfering with ordinary travelers.”
4. **`method04`** — “I would coordinate a short watch instead of occupying the overlook all day.”
5. **`method05`** — “I would seek an authorized vantage point if covert observation is unnecessary.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.stealth.seed02` — The bright cargo lane

**Destination:** Scout · **Q1 family:** `stealth` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: A group needs to cross a lit cargo lane while patrols inspect containers. A hurried movement would draw attention. What is your move?'

**Player choices:**

1. **`method01`** — “I would study the patrol timing before choosing a crossing.”
2. **`method02`** — “I would use the containers to limit how much of our movement is visible.”
3. **`method03`** — “I would arrange a distraction that does not endanger dockworkers.”
4. **`method04`** — “I would ask whether a legitimate cargo pass could get us through.”
5. **`method05`** — “I would wait until the lane is less crowded rather than force a crossing.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.stealth.seed03` — The rain-soaked compound

**Destination:** Scout · **Q1 family:** `stealth` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: Rain hides footsteps but makes every metal walkway loud. The group must reach a maintenance shed without alerting a watch crew. Where do you start?'

**Player choices:**

1. **`method01`** — “I would identify the quietest route across the compound.”
2. **`method02`** — “I would coordinate our movements so no one is isolated.”
3. **`method03`** — “I would watch for reflections and lights that could reveal us.”
4. **`method04`** — “I would approach openly as maintenance visitors if that is credible.”
5. **`method05`** — “I would abandon the route if we cannot avoid putting the watch crew at risk.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.stealth.seed04` — The distant sentry

**Destination:** Scout · **Q1 family:** `stealth` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: A sentry watches a ridge through electrobinoculars while a rescue party needs to reach survivors beyond it. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would choose a route below the sentry's line of sight.”
2. **`method02`** — “I would observe how often the sentry scans the ridge.”
3. **`method03`** — “I would send a discreet message requesting safe passage if possible.”
4. **`method04`** — “I would keep the rescue party still while I check the approach.”
5. **`method05`** — “I would move after weather or terrain creates natural cover.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.stealth.seed05` — The night supply run

**Destination:** Scout · **Q1 family:** `stealth` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: A settlement needs supplies delivered across an area monitored by opportunistic raiders. The road is quiet but exposed. What is your move?'

**Player choices:**

1. **`method01`** — “I would scout the road at a distance before bringing the convoy forward.”
2. **`method02`** — “I would conceal the supplies among ordinary local deliveries.”
3. **`method03`** — “I would travel by a less predictable route with suitable cover.”
4. **`method04`** — “I would ask nearby residents which crossings the raiders ignore.”
5. **`method05`** — “I would delay the run if the route cannot be protected.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.stealth.seed06` — The crowded archive hall

**Destination:** Scout · **Q1 family:** `stealth` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: A researcher wants to inspect a catalog without attracting the attention of a hostile delegate. Staff members are working normally nearby. Where do you start?'

**Player choices:**

1. **`method01`** — “I would behave like an ordinary visitor rather than sneak conspicuously.”
2. **`method02`** — “I would choose a time when the delegate is occupied elsewhere.”
3. **`method03`** — “I would ask a staff member for authorized access to the catalog.”
4. **`method04`** — “I would keep the research team from gathering visibly around one shelf.”
5. **`method05`** — “I would leave immediately if someone else would be put at risk by the visit.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.stealth.seed07` — The concealed observation post

**Destination:** Scout · **Q1 family:** `stealth` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: A team wants to watch a suspicious landing field without being discovered. The ground offers little natural cover, and the wind shifts frequently. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would choose an observation point that does not silhouette us against the sky.”
2. **`method02`** — “I would set clear intervals for moving and reporting observations.”
3. **`method03`** — “I would use available terrain rather than advance too close.”
4. **`method04`** — “I would coordinate a fallback route before settling into position.”
5. **`method05`** — “I would collect enough distant evidence before deciding whether approach is necessary.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.techrepair.seed02` — The intermittent water sensor

**Destination:** Scout · **Q1 family:** `techrepair` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: A settlement's water monitor reports dangerous contamination, then immediately clears itself. Residents are unsure whether to drink. What is your move?'

**Player choices:**

1. **`method01`** — “I would check the sensor's calibration before accepting either reading.”
2. **`method02`** — “I would collect an independent sample for testing.”
3. **`method03`** — “I would warn the settlement while explaining the uncertainty.”
4. **`method04`** — “I would inspect the wiring for signs of moisture damage.”
5. **`method05`** — “I would arrange clean water until the readings can be trusted.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.techrepair.seed03` — The failing thermal cloak

**Destination:** Scout · **Q1 family:** `techrepair` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: A research shelter's temperature regulator repeatedly shuts down in the cold. The occupants cannot stay there overnight without heat. Where do you start?'

**Player choices:**

1. **`method01`** — “I would identify which component is failing before taking the unit apart.”
2. **`method02`** — “I would find a temporary heat source that can be used safely.”
3. **`method03`** — “I would ask the occupants what parts and tools they already have.”
4. **`method04`** — “I would repair the simplest verified fault first and retest the system.”
5. **`method05`** — “I would move the occupants elsewhere if the regulator cannot be trusted.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.techrepair.seed04` — The unreliable field scanner

**Destination:** Scout · **Q1 family:** `techrepair` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: A handheld scanner keeps showing movement near an empty trail. The team suspects a stalker but cannot verify the readings. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would test the scanner against a known stationary target.”
2. **`method02`** — “I would inspect its power supply and sensor housing.”
3. **`method03`** — “I would compare its readings with ordinary observations of the trail.”
4. **`method04`** — “I would ask another scout to check the area independently.”
5. **`method05`** — “I would avoid making an accusation until we have dependable evidence.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.techrepair.seed05` — The jammed emergency repeater

**Destination:** Scout · **Q1 family:** `techrepair` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: A remote repeater is stuck transmitting an outdated distress code. Real emergency messages cannot get through. What is your move?'

**Player choices:**

1. **`method01`** — “I would isolate whether the fault is in its power or signal controller.”
2. **`method02`** — “I would use a backup communicator to warn nearby teams.”
3. **`method03`** — “I would inspect the repeater for physical damage before resetting it.”
4. **`method04`** — “I would coordinate a short shutdown with the people depending on it.”
5. **`method05`** — “I would move the team to a safer relay point if repair is uncertain.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.techrepair.seed06` — The damaged survey probe

**Destination:** Scout · **Q1 family:** `techrepair` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: A mapping probe returns with scorched contacts and corrupted route data. The expedition wants to send it out again immediately. Where do you start?'

**Player choices:**

1. **`method01`** — “I would inspect the connectors before powering it back on.”
2. **`method02`** — “I would preserve the remaining data instead of repeatedly resetting the probe.”
3. **`method03`** — “I would ask the operator what happened during its last run.”
4. **`method04`** — “I would attempt a limited test in a controlled area.”
5. **`method05`** — “I would recommend another survey method if the probe may endanger the team.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.techrepair.seed07` — The silent medical cooler

**Destination:** Scout · **Q1 family:** `techrepair` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: A medical cooler has lost its status display while carrying temperature-sensitive medicines. The casing still feels cold. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would measure the actual temperature without trusting the blank display.”
2. **`method02`** — “I would check whether the power source is failing.”
3. **`method03`** — “I would ask the medics how much temperature variation the medicine permits.”
4. **`method04`** — “I would transfer the contents to a verified cooler if one is available.”
5. **`method05`** — “I would label the shipment uncertain until its condition can be established.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.terrain.seed02` — The loose scree slope

**Destination:** Scout · **Q1 family:** `terrain` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: A caravan approaches a steep slope covered in loose stone. The direct climb saves time but a slip could send rocks onto those below. What is your move?'

**Player choices:**

1. **`method01`** — “I would test the slope from a safe edge before moving the caravan.”
2. **`method02`** — “I would find a longer route with more secure footing.”
3. **`method03`** — “I would move the group in small intervals rather than crowd the incline.”
4. **`method04`** — “I would secure loose equipment so it cannot strike people below.”
5. **`method05`** — “I would wait for experienced climbers if the route proves unstable.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.terrain.seed03` — The rising salt flats

**Destination:** Scout · **Q1 family:** `terrain` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: A desert guide warns that a seemingly solid salt flat becomes hazardous after rain. Storm clouds are approaching fast. Where do you start?'

**Player choices:**

1. **`method01`** — “I would examine the ground before committing heavy vehicles.”
2. **`method02`** — “I would seek raised ground while the storm remains distant.”
3. **`method03`** — “I would ask the guide to show us the safest known route.”
4. **`method04`** — “I would redistribute supplies so the group can move if vehicles become stuck.”
5. **`method05`** — “I would establish a retreat point before attempting the crossing.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.terrain.seed04` — The freezing pass

**Destination:** Scout · **Q1 family:** `terrain` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: Nightfall will bring severe cold to a high mountain pass. The shortest route crosses an exposed saddle. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would estimate how much daylight remains before choosing the saddle.”
2. **`method02`** — “I would search for wind shelter and a place to camp.”
3. **`method03`** — “I would check whether everyone has adequate clothing and water.”
4. **`method04`** — “I would reduce the pace to accommodate the slowest traveler.”
5. **`method05`** — “I would turn back if the party cannot cross safely before the temperature falls.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.terrain.seed05` — The unstable mangrove

**Destination:** Scout · **Q1 family:** `terrain` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: A mangrove marsh hides deep water beneath floating vegetation. An injured guide says the village is just beyond the trees. What is your move?'

**Player choices:**

1. **`method01`** — “I would probe the ground before anyone steps off firm footing.”
2. **`method02`** — “I would look for signs of a maintained local walkway.”
3. **`method03`** — “I would organize flotation and support for the injured guide.”
4. **`method04`** — “I would ask the guide to describe landmarks without forcing them to walk.”
5. **`method05`** — “I would find a longer but firmer route around the marsh.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.terrain.seed06` — The canyon wash

**Destination:** Scout · **Q1 family:** `terrain` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: A dry canyon has fresh debris above the trail, suggesting a flash flood might be coming. A herd is moving through the only exit. Where do you start?'

**Player choices:**

1. **`method01`** — “I would inspect the high-water marks and weather signs.”
2. **`method02`** — “I would guide the group toward higher ground immediately.”
3. **`method03`** — “I would keep people clear of the herd rather than stampede it.”
4. **`method04`** — “I would find an alternate route above the canyon floor.”
5. **`method05`** — “I would wait for the danger to pass instead of racing through the wash.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.terrain.seed07` — The volcanic shelf

**Destination:** Scout · **Q1 family:** `terrain` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: A survey party reaches a shelf above steam vents. The route is passable, but the ground trembles underfoot. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would check for unstable cracks before moving closer.”
2. **`method02`** — “I would identify a safe path with the fewest exposed sections.”
3. **`method03`** — “I would mark the danger so those behind us can avoid it.”
4. **`method04`** — “I would organize a retreat plan before attempting any crossing.”
5. **`method05`** — “I would abandon the shortcut if the shelf cannot be assessed safely.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.tracking.seed02` — The overlapping prints

**Destination:** Scout · **Q1 family:** `tracking` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: Two sets of boot prints meet beside a dried riverbed, then disappear into stony ground. A missing surveyor was last seen nearby. What is your move?'

**Player choices:**

1. **`method01`** — “I would compare the prints for differences in weight and direction.”
2. **`method02`** — “I would search for displaced stones where the tracks seem to end.”
3. **`method03`** — “I would ask the survey team which route the missing person knew best.”
4. **`method04`** — “I would mark the site so another searcher can retrace our observations.”
5. **`method05`** — “I would examine nearby shelter points before moving farther away.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.tracking.seed03` — The broken campsite

**Destination:** Scout · **Q1 family:** `tracking` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: A campsite has been abandoned in a hurry. The fire is cold, but food and supplies remain undisturbed. Where do you start?'

**Player choices:**

1. **`method01`** — “I would establish when the camp was last occupied from ordinary signs.”
2. **`method02`** — “I would examine the surrounding ground for an orderly departure route.”
3. **`method03`** — “I would ask local travelers whether they saw the group leave.”
4. **`method04`** — “I would keep the search party together until the situation is clearer.”
5. **`method05`** — “I would search nearby cover for anyone sheltering from danger.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.tracking.seed04` — The shoreline marks

**Destination:** Scout · **Q1 family:** `tracking` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: Fresh drag marks lead toward a tide pool, but incoming water will erase them soon. A small research drone is missing. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would document the marks before the tide reaches them.”
2. **`method02`** — “I would follow the direction of the drag without entering unstable ground.”
3. **`method03`** — “I would question the nearby fishers about recent activity.”
4. **`method04`** — “I would search for a safe vantage point above the pool.”
5. **`method05`** — “I would notify the drone's owners of what we can and cannot verify.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.tracking.seed05` — The false trail

**Destination:** Scout · **Q1 family:** `tracking` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: A fugitive's trail leads directly into exposed scrubland even though a sheltered canyon runs nearby. The route seems unusually obvious. What is your move?'

**Player choices:**

1. **`method01`** — “I would study the ground for signs that the visible trail was deliberately made.”
2. **`method02`** — “I would check the canyon for another set of tracks.”
3. **`method03`** — “I would warn the group that pursuing too quickly could reveal our location.”
4. **`method04`** — “I would ask someone familiar with the terrain about likely escape routes.”
5. **`method05`** — “I would follow at a distance until the pattern makes more sense.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.tracking.seed06` — The disturbed snow

**Destination:** Scout · **Q1 family:** `tracking` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: A mountain outpost reports that a courier vanished during a snowstorm. A few faint impressions remain beside a supply shed. Where do you start?'

**Player choices:**

1. **`method01`** — “I would preserve the faint impressions before anyone walks across them.”
2. **`method02`** — “I would compare the route with the courier's expected destination.”
3. **`method03`** — “I would look for traces of an attempted shelter in the nearby rocks.”
4. **`method04`** — “I would ask the outpost staff who last saw the courier.”
5. **`method05`** — “I would organize a search that accounts for the continuing weather.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.tracking.seed07` — The abandoned speeder

**Destination:** Scout · **Q1 family:** `tracking` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: A speeder sits beside an empty road with its engine still warm. The owner's communicator is on the seat and there is no sign of a struggle. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would examine the roadside for evidence of the driver's movement.”
2. **`method02`** — “I would contact the owner without assuming the speeder was stolen.”
3. **`method03`** — “I would check nearby repair shelters and footpaths.”
4. **`method04`** — “I would mark the vehicle's position for the investigating team.”
5. **`method05`** — “I would wait for support before pursuing an uncertain trail into dangerous terrain.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.vehicles.seed02` — The neglected speeder

**Destination:** Scout · **Q1 family:** `vehicles` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: A rented speeder hesitates at every turn just before a long desert crossing. Its owner insists the machine is reliable. What is your move?'

**Player choices:**

1. **`method01`** — “I would test the steering and brakes before accepting the vehicle.”
2. **`method02`** — “I would ask the owner for maintenance records and known faults.”
3. **`method03`** — “I would choose a route that stays near repair assistance.”
4. **`method04`** — “I would arrange a second vehicle if the trip cannot be postponed.”
5. **`method05`** — “I would refuse to carry passengers until the fault is understood.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.vehicles.seed03` — The crowded docking lane

**Destination:** Scout · **Q1 family:** `vehicles` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: A light freighter must reach a berth while larger ships maneuver across its approach. The tower keeps changing instructions. Where do you start?'

**Player choices:**

1. **`method01`** — “I would confirm our assigned corridor with traffic control.”
2. **`method02`** — “I would slow the approach until I can identify a safe gap.”
3. **`method03`** — “I would ask the crew to monitor the larger ships' movement.”
4. **`method04`** — “I would prepare an alternate berth if the assigned lane remains blocked.”
5. **`method05`** — “I would hold position rather than force our way through traffic.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.vehicles.seed04` — The concealed landing

**Destination:** Scout · **Q1 family:** `vehicles` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: A survey shuttle needs to land near an isolated ruin without alarming the local wildlife. The nearest flat ground is exposed. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would check the terrain for a sheltered landing site.”
2. **`method02`** — “I would approach at a speed that allows a careful survey.”
3. **`method03`** — “I would ask the crew to watch for animals before descent.”
4. **`method04`** — “I would land farther away and complete the approach on foot.”
5. **`method05`** — “I would delay landing if the shuttle would disturb a breeding area.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.vehicles.seed05` — The broken navigation beacon

**Destination:** Scout · **Q1 family:** `vehicles` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Here is the problem: A navigation marker is transmitting an incorrect course through a dangerous asteroid approach. Several pilots are already following it. What is your move?'

**Player choices:**

1. **`method01`** — “I would verify our position using independent navigation references.”
2. **`method02`** — “I would warn other pilots before adjusting our own approach.”
3. **`method03`** — “I would report the faulty beacon to traffic control.”
4. **`method04`** — “I would take a wider approach that does not depend on the signal.”
5. **`method05`** — “I would wait for a safer traffic window if uncertainty remains.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.vehicles.seed06` — The sinking ferry

**Destination:** Scout · **Q1 family:** `vehicles` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'Picture this: A river ferry begins taking on water halfway to shore. Its pilot knows the current but the passengers are panicking. Where do you start?'

**Player choices:**

1. **`method01`** — “I would ask the pilot which bank offers the safest landing.”
2. **`method02`** — “I would organize passengers away from the flooded compartment.”
3. **`method03`** — “I would check available flotation gear before attempting an evacuation.”
4. **`method04`** — “I would call for nearby boats while the ferry still has power.”
5. **`method05`** — “I would keep the group calm rather than crowd the pilot's controls.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.scout.vehicles.seed07` — The unfamiliar scout craft

**Destination:** Scout · **Q1 family:** `vehicles` · **Status:** draft; not rules-tag certified

**Scenario:** Lead: 'All right, try this one: A borrowed reconnaissance craft has excellent sensors but controls the crew has not practiced. The mission is time-sensitive. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would review the essential controls before leaving the hangar.”
2. **`method02`** — “I would ask an experienced pilot to supervise the first flight.”
3. **`method03`** — “I would use a simple, low-risk route to test the craft.”
4. **`method04`** — “I would assign the crew specific sensor and navigation duties.”
5. **`method05`** — “I would choose a familiar vehicle if the new craft cannot be operated safely.”
6. **`undecided`** — “I'm not sure yet. I would gather more dependable information before choosing a route.”

#### `q4.soldier.ambush.seed02` — The false supply trail

**Destination:** Soldier · **Q1 family:** `ambush` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: Raiders are rumored to be following relief convoys through a forest road. The escort considers setting a trap, but ordinary travelers also use the route. What do you do?'

**Player choices:**

1. **`method01`** — “I would identify whether the raiders are actually following the convoy.”
2. **`method02`** — “I would choose an observation point that does not endanger travelers.”
3. **`method03`** — “I would arrange a safe convoy route before considering a confrontation.”
4. **`method04`** — “I would coordinate clear identification rules with the escorts.”
5. **`method05`** — “I would avoid springing a trap where civilians could be caught.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.ambush.seed03` — The hidden approach

**Destination:** Soldier · **Q1 family:** `ambush` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: A hostile patrol may be moving toward a settlement through tall grass. Local defenders want to rush out and meet it. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would confirm the patrol's direction before exposing the defenders.”
2. **`method02`** — “I would prepare covered observation positions along the approach.”
3. **`method03`** — “I would plan a safe retreat route if the patrol proves stronger.”
4. **`method04`** — “I would warn the settlement without creating panic.”
5. **`method05`** — “I would use the terrain to avoid fighting until necessary.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.ambush.seed04` — The deserted crossing

**Destination:** Soldier · **Q1 family:** `ambush` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: An apparently abandoned river crossing lies on the route of an armed smuggling group. The defenders think it is an ideal place to attack. What is your call?'

**Player choices:**

1. **`method01`** — “I would check for bystanders and alternate crossing paths first.”
2. **`method02`** — “I would identify how the group might detect an approach.”
3. **`method03`** — “I would keep the defenders from entering the crossing without reconnaissance.”
4. **`method04`** — “I would propose interception away from vulnerable infrastructure.”
5. **`method05`** — “I would ask whether lawful authorities can resolve the situation without a fight.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.ambush.seed05` — The shadowed canyon

**Destination:** Soldier · **Q1 family:** `ambush` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: Scouts report an enemy force approaching through a canyon with several narrow turns. The defending party has limited manpower. What do you do?'

**Player choices:**

1. **`method01`** — “I would study the canyon exits before committing anyone.”
2. **`method02`** — “I would coordinate observation points that can support one another.”
3. **`method03`** — “I would reserve an escape route if the enemy changes direction.”
4. **`method04`** — “I would delay contact until we know the enemy's numbers.”
5. **`method05`** — “I would guide civilians away from the canyon before any clash.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.ambush.seed06` — The mining convoy

**Destination:** Soldier · **Q1 family:** `ambush` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: A convoy transporting stolen equipment is expected on a remote road. Workers want the goods recovered intact, not destroyed in a firefight. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would verify the convoy's identity before moving to intercept.”
2. **`method02`** — “I would choose a location that allows a safe stop.”
3. **`method03`** — “I would coordinate with workers who can identify the equipment.”
4. **`method04`** — “I would keep a reserve available if the convoy turns back.”
5. **`method05`** — “I would prioritize recovering the goods without endangering drivers or bystanders.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.ambush.seed07` — The night signal

**Destination:** Soldier · **Q1 family:** `ambush` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: A small raiding party uses light signals near a village. The militia wants to attack the first lights they see. What is your call?'

**Player choices:**

1. **`method01`** — “I would establish who is sending the signals before acting.”
2. **`method02`** — “I would observe the likely routes without revealing the militia's position.”
3. **`method03`** — “I would place defenders where they can protect the village.”
4. **`method04`** — “I would prepare a withdrawal plan if the signals are bait.”
5. **`method05`** — “I would ask local contacts whether the lights have an innocent explanation.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.armor.seed02` — The furnace corridor

**Destination:** Soldier · **Q1 family:** `armor` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: A damaged industrial corridor is filled with heat and falling debris. Workers are trapped beyond it, and protective gear is limited. What do you do?'

**Player choices:**

1. **`method01`** — “I would assess which protective equipment is suitable for the hazards.”
2. **`method02`** — “I would organize a rescue plan that limits exposure time.”
3. **`method03`** — “I would ask for equipment rather than assume armor makes the route safe.”
4. **`method04`** — “I would coordinate with engineers to stabilize the corridor first.”
5. **`method05`** — “I would evacuate the trapped workers by another route if one exists.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.armor.seed03` — The freezing guard post

**Destination:** Soldier · **Q1 family:** `armor` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: A remote guard post is facing a bitter night with damaged heating. The defenders have armor but little cold-weather shelter. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would check whether the gear offers any real protection against the cold.”
2. **`method02`** — “I would move the defenders to a more sheltered position.”
3. **`method03`** — “I would organize shorter watches and warming breaks.”
4. **`method04`** — “I would ask for additional survival equipment before the temperature drops.”
5. **`method05`** — “I would reduce the perimeter rather than exhaust the whole team.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.armor.seed04` — The falling scaffold

**Destination:** Soldier · **Q1 family:** `armor` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: A construction scaffold begins dropping metal fragments over a crowded worksite. The foreman asks an armored guard to retrieve someone underneath. What is your call?'

**Player choices:**

1. **`method01`** — “I would clear the workers from the falling debris first.”
2. **`method02`** — “I would check whether the guard's equipment suits the danger.”
3. **`method03`** — “I would coordinate with the foreman to secure the unstable scaffold.”
4. **`method04`** — “I would use cover to reach the trapped person only if the structure is stable.”
5. **`method05`** — “I would wait for rescue equipment rather than rely on armor alone.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.armor.seed05` — The smoke-filled hangar

**Destination:** Soldier · **Q1 family:** `armor` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: A hangar fire spreads behind a line of parked shuttles. Security personnel want to enter wearing combat armor. What do you do?'

**Player choices:**

1. **`method01`** — “I would ask fire crews what protection the situation actually requires.”
2. **`method02`** — “I would direct the security team to keep evacuation routes open.”
3. **`method03`** — “I would help move people away from smoke and fuel.”
4. **`method04`** — “I would bring suitable breathing equipment before entering the hangar.”
5. **`method05`** — “I would support fire crews from a safe position instead of interfering.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.armor.seed06` — The sustained watch

**Destination:** Soldier · **Q1 family:** `armor` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: An exposed settlement wall needs defenders through the night. Heavy armor offers protection but slows movement along the perimeter. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would assign equipment according to each defender's duties.”
2. **`method02`** — “I would keep a mobile reserve that can reach an emergency quickly.”
3. **`method03`** — “I would test whether the wall offers enough cover to reduce exposure.”
4. **`method04`** — “I would rotate the watch so no one becomes dangerously exhausted.”
5. **`method05`** — “I would ask engineers to improve the position instead of relying on armor alone.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.armor.seed07` — The flooded bunker

**Destination:** Soldier · **Q1 family:** `armor` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: Floodwater is rising around an old bunker. The garrison thinks heavy armor will let them walk through the deeper passages. What is your call?'

**Player choices:**

1. **`method01`** — “I would check the depth and current before anyone enters.”
2. **`method02`** — “I would assess how armor affects movement and escape in water.”
3. **`method03`** — “I would organize evacuation while dry routes still exist.”
4. **`method04`** — “I would seek boats or flotation gear rather than guess.”
5. **`method05`** — “I would keep a rescue team ready where it can help safely.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.defense_ally.seed02` — The exposed medic

**Destination:** Soldier · **Q1 family:** `defense_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: A medic is tending an injured traveler beside a road when armed looters appear on the ridge. The patient cannot be moved quickly. What do you do?'

**Player choices:**

1. **`method01`** — “I would direct the medic toward any available cover.”
2. **`method02`** — “I would take a position that gives the patient time to receive care.”
3. **`method03`** — “I would communicate with the looters before assuming they will attack.”
4. **`method04`** — “I would coordinate others to watch the safest evacuation route.”
5. **`method05`** — “I would avoid leaving the medic isolated while pursuing the threat.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.defense_ally.seed03` — The threatened plaza crossing

**Destination:** Soldier · **Q1 family:** `defense_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: A witness is trying to cross a public plaza under threat from an unknown attacker. Crowds make every movement unpredictable. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would plan a protected route through the plaza.”
2. **`method02`** — “I would ask the witness whether they recognize a safer place to wait.”
3. **`method03`** — “I would assign allies to observe approaches without frightening the crowd.”
4. **`method04`** — “I would position myself between the witness and any confirmed threat.”
5. **`method05`** — “I would postpone the crossing if no route can be made reasonably safe.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.defense_ally.seed04` — The failing barricade

**Destination:** Soldier · **Q1 family:** `defense_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: Civilians shelter behind a temporary barricade as debris and scattered fire threaten the street. The barricade begins to slip. What is your call?'

**Player choices:**

1. **`method01`** — “I would move the nearest civilians away from the collapsing section.”
2. **`method02`** — “I would organize allies to support the evacuation.”
3. **`method03`** — “I would look for stronger cover rather than trust the damaged barrier.”
4. **`method04`** — “I would communicate a safe fallback route to everyone.”
5. **`method05`** — “I would stay with the slowest evacuees until they can move.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.defense_ally.seed05` — The crowded boarding ramp

**Destination:** Soldier · **Q1 family:** `defense_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: A shuttle's departure is delayed while frightened passengers crowd the ramp. Distant attackers are approaching but have not reached the dock. What do you do?'

**Player choices:**

1. **`method01`** — “I would organize the queue so the most vulnerable can board safely.”
2. **`method02`** — “I would ask the pilot how much time remains before departure.”
3. **`method03`** — “I would position defenders to protect the boarding area without blocking it.”
4. **`method04`** — “I would keep passengers informed so panic does not slow the evacuation.”
5. **`method05`** — “I would arrange a fallback shelter in case the shuttle cannot depart.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.defense_ally.seed06` — The injured scout

**Destination:** Soldier · **Q1 family:** `defense_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: A scout returns from patrol with a leg injury and warns that pursuers may be close behind. The team has little time to decide how to move. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would secure a safe place for immediate care.”
2. **`method02`** — “I would assign companions to watch the likely approach.”
3. **`method03`** — “I would prepare a route that does not require the scout to run.”
4. **`method04`** — “I would determine whether pursuit is real before committing to a fight.”
5. **`method05`** — “I would ask for transport assistance if carrying the scout is unsafe.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.defense_ally.seed07` — The suspended work crew

**Destination:** Soldier · **Q1 family:** `defense_ally` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: A crew is repairing a power line on elevated platforms when hostile drones appear in the distance. Climbing down will take time. What is your call?'

**Player choices:**

1. **`method01`** — “I would warn the workers and begin an orderly descent.”
2. **`method02`** — “I would coordinate defenders so they protect the platforms instead of pursuing drones.”
3. **`method03`** — “I would identify equipment that could shield the workers during descent.”
4. **`method04`** — “I would request technical help to shut down the unsafe line.”
5. **`method05`** — “I would seek cover beneath the platforms once everyone reaches the ground.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.demolitions.seed02` — The fallen blast door

**Destination:** Soldier · **Q1 family:** `demolitions` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: A damaged blast door blocks the emergency exit of a mining station. The workers propose using stored charges without checking the adjoining tunnel. What do you do?'

**Player choices:**

1. **`method01`** — “I would ask engineers to survey the door and surrounding structure.”
2. **`method02`** — “I would seek a manual release or alternate exit before using force.”
3. **`method03`** — “I would move everyone away from the threatened tunnel.”
4. **`method04`** — “I would evaluate whether the obstruction can be removed without explosives.”
5. **`method05`** — “I would refuse a blast until a safe plan is verified.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.demolitions.seed03` — The unstable quarry wall

**Destination:** Soldier · **Q1 family:** `demolitions` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: A quarry wall has cracked above the only access road. A foreman proposes blasting it down while traffic waits below. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would close the road until the slope is assessed.”
2. **`method02`** — “I would ask geologists where a collapse would actually travel.”
3. **`method03`** — “I would look for a controlled mechanical solution before considering a blast.”
4. **`method04`** — “I would organize evacuation of nearby buildings.”
5. **`method05`** — “I would delay all demolition until trained specialists can confirm the risk.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.demolitions.seed04` — The blocked flood channel

**Destination:** Soldier · **Q1 family:** `demolitions` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: Flood debris jams a spillway, raising water toward a settlement. Local volunteers offer explosives they found in storage. What is your call?'

**Player choices:**

1. **`method01`** — “I would examine whether removing debris could release a dangerous surge.”
2. **`method02`** — “I would ask the water engineers for a safer clearance method.”
3. **`method03`** — “I would move people from the downstream area first.”
4. **`method04`** — “I would coordinate a controlled plan with qualified demolition personnel.”
5. **`method05`** — “I would reject improvised charges when their condition and effects are unknown.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.demolitions.seed05` — The collapsed tunnel

**Destination:** Soldier · **Q1 family:** `demolitions` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: An earthquake closes a transit tunnel with survivors reported on the far side. Cutting through might disturb damaged supports. What do you do?'

**Player choices:**

1. **`method01`** — “I would locate the survivors before selecting a breach point.”
2. **`method02`** — “I would consult structural engineers about the remaining supports.”
3. **`method03`** — “I would establish communication with those trapped beyond the collapse.”
4. **`method04`** — “I would arrange a safe alternate rescue shaft.”
5. **`method05`** — “I would use destructive methods only after the rescue team understands the consequences.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.demolitions.seed06` — The abandoned munitions shed

**Destination:** Soldier · **Q1 family:** `demolitions` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: An old shed contains unstable munitions beside a busy farm road. The owner wants to move everything into a single cargo speeder. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would isolate the area and keep traffic away.”
2. **`method02`** — “I would call qualified disposal personnel rather than handle unknown ordnance.”
3. **`method03`** — “I would ask the owner what records exist of the stored material.”
4. **`method04`** — “I would arrange a safer route for nearby residents.”
5. **`method05`** — “I would prevent untrained helpers from disturbing the shed.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.demolitions.seed07` — The stranded drilling machine

**Destination:** Soldier · **Q1 family:** `demolitions` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: A mining drill is wedged in a narrow shaft and threatens to block cooling airflow. Operators propose a heavy charge to free it. What is your call?'

**Player choices:**

1. **`method01`** — “I would assess whether the machine can be detached mechanically.”
2. **`method02`** — “I would ask ventilation staff how long the cooling system can cope.”
3. **`method03`** — “I would clear the shaft before any hazardous intervention.”
4. **`method04`** — “I would seek technical specialists to evaluate a controlled separation.”
5. **`method05`** — “I would prioritize restoring airflow over recovering the machine intact.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.fieldmed.seed02` — The fractured convoy

**Destination:** Soldier · **Q1 family:** `fieldmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: A supply convoy hits rough ground and several passengers are injured. The only medically trained escort is attending the most serious patient. What do you do?'

**Player choices:**

1. **`method01`** — “I would make the area safe so treatment can continue.”
2. **`method02`** — “I would ask the medic to assign simple support tasks to volunteers.”
3. **`method03`** — “I would identify which injured people need attention most urgently.”
4. **`method04`** — “I would organize transport that will not worsen their injuries.”
5. **`method05`** — “I would record the patients' symptoms for the receiving clinic.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.fieldmed.seed03` — The collapsed training wall

**Destination:** Soldier · **Q1 family:** `fieldmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: A training wall falls onto a group of recruits. Dust obscures the scene and nobody knows how many are trapped. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would secure the unstable area before anyone enters.”
2. **`method02`** — “I would call for qualified medical and rescue assistance.”
3. **`method03`** — “I would ask witnesses where the missing recruits were standing.”
4. **`method04`** — “I would coordinate safe extraction instead of pulling recklessly on debris.”
5. **`method05`** — “I would help keep the injured calm while trained responders work.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.fieldmed.seed04` — The distant field hospital

**Destination:** Soldier · **Q1 family:** `fieldmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: An expedition's medic reports that a patient needs surgery, but the nearest hospital is hours away. The team has limited supplies. What is your call?'

**Player choices:**

1. **`method01`** — “I would ask the medic what support would improve the patient's chances.”
2. **`method02`** — “I would prioritize safe transport rather than attempt treatment beyond our training.”
3. **`method03`** — “I would establish regular communication with the hospital.”
4. **`method04`** — “I would reorganize supplies so the medic has immediate access to essentials.”
5. **`method05`** — “I would keep the patient's companions informed without offering false certainty.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.fieldmed.seed05` — The exhausted aid team

**Destination:** Soldier · **Q1 family:** `fieldmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: Field medics have been working through repeated emergencies and are beginning to make mistakes. Another wave of patients is arriving. What do you do?'

**Player choices:**

1. **`method01`** — “I would organize a rotation so exhausted medics can recover.”
2. **`method02`** — “I would ask the lead medic how volunteers can help without interfering.”
3. **`method03`** — “I would create a clear patient-arrival area to reduce confusion.”
4. **`method04`** — “I would identify additional medical support in nearby settlements.”
5. **`method05`** — “I would postpone nonurgent duties so trained staff can focus on critical care.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.fieldmed.seed06` — The poisoned water rumor

**Destination:** Soldier · **Q1 family:** `fieldmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: Travelers fall ill after using a communal water source. The crowd demands an immediate explanation and some are accusing the caretaker. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would separate care for the sick from the search for a cause.”
2. **`method02`** — “I would ask medical staff what evidence they need to assess the symptoms.”
3. **`method03`** — “I would arrange alternative drinking water while testing proceeds.”
4. **`method04`** — “I would keep the caretaker safe from unsupported accusations.”
5. **`method05`** — “I would document exposure histories so specialists can compare cases.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.fieldmed.seed07` — The storm casualty

**Destination:** Soldier · **Q1 family:** `fieldmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: A rescue boat brings in a severely chilled survivor during a thunderstorm. The landing dock is slippery and the clinic is still preparing. What is your call?'

**Player choices:**

1. **`method01`** — “I would clear a safe route between the boat and clinic.”
2. **`method02`** — “I would ask the medic how the survivor should be moved.”
3. **`method03`** — “I would bring dry coverings and supplies the care team requests.”
4. **`method04`** — “I would coordinate shelter for the other passengers.”
5. **`method05`** — “I would avoid improvising invasive care outside my actual training.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.precision.seed02` — The crowded rooftop

**Destination:** Soldier · **Q1 family:** `precision` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: A drone hovers above a crowded rooftop market. Security believes it may be hostile but has not identified its operator. What do you do?'

**Player choices:**

1. **`method01`** — “I would verify whether the drone is actually threatening anyone.”
2. **`method02`** — “I would move civilians away before considering any shot.”
3. **`method03`** — “I would look for a safer way to interrupt its operation.”
4. **`method04`** — “I would coordinate with someone who can identify the operator.”
5. **`method05`** — “I would hold fire if the background makes a miss unacceptable.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.precision.seed03` — The broken beacon

**Destination:** Soldier · **Q1 family:** `precision` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: A damaged beacon is drawing automated machines toward a settlement. Its control panel is near fragile fuel lines. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would inspect the beacon's vulnerable parts before acting.”
2. **`method02`** — “I would keep people clear of the fuel lines.”
3. **`method03`** — “I would ask technicians whether the device can be disabled safely.”
4. **`method04`** — “I would choose a controlled response rather than firing at the whole assembly.”
5. **`method05`** — “I would wait for more information if a precise action cannot be made safely.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.precision.seed04` — The distant signal light

**Destination:** Soldier · **Q1 family:** `precision` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: A hostile observer uses a signal lamp from a rocky ridge. The team must stop the signaling without striking nearby sheltering travelers. What is your call?'

**Player choices:**

1. **`method01`** — “I would identify exactly where the light originates.”
2. **`method02`** — “I would check whether the travelers are in the same line of sight.”
3. **`method03`** — “I would use cover to approach before deciding on a response.”
4. **`method04`** — “I would seek a way to interrupt the observer's signal without an attack.”
5. **`method05`** — “I would communicate the uncertainty to allies before anyone acts.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.precision.seed05` — The bridge control box

**Destination:** Soldier · **Q1 family:** `precision` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: A bridge's control box is stuck open while a heavy vehicle approaches. An emergency stop is visible but hard to reach. What do you do?'

**Player choices:**

1. **`method01`** — “I would warn the driver before attempting any technical intervention.”
2. **`method02`** — “I would ask a mechanic which control is safe to activate.”
3. **`method03`** — “I would position someone near the stop only with a clear escape route.”
4. **`method04`** — “I would identify a precise way to disable movement without damaging the bridge.”
5. **`method05`** — “I would leave the controls alone if we cannot verify their function.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.precision.seed06` — The hostage at the gate

**Destination:** Soldier · **Q1 family:** `precision` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: An armed suspect holds a guard at a checkpoint gate. The suspect keeps shifting position while bystanders remain nearby. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would try to establish communication with the suspect.”
2. **`method02`** — “I would clear the bystanders and deny the suspect additional pressure.”
3. **`method03`** — “I would study the scene before considering a dangerous intervention.”
4. **`method04`** — “I would coordinate with a negotiator rather than rush into the gate.”
5. **`method05`** — “I would keep the guard's safety above any desire for a quick resolution.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.precision.seed07` — The unstable power coupling

**Destination:** Soldier · **Q1 family:** `precision` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: A damaged coupling threatens to overload a transport engine. Crew members suggest striking it loose to interrupt the circuit. What is your call?'

**Player choices:**

1. **`method01`** — “I would ask an engineer whether the coupling can be isolated safely.”
2. **`method02`** — “I would clear the engine room before attempting any intervention.”
3. **`method03`** — “I would identify exactly which part is failing.”
4. **`method04`** — “I would prefer a controlled shutdown over a destructive shortcut.”
5. **`method05`** — “I would stop the crew from acting until the failure path is understood.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.tactics.seed02` — The shifting river defense

**Destination:** Soldier · **Q1 family:** `tactics` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: An outpost faces threats from two river crossings. Reinforcements can reach only one before dark. What do you do?'

**Player choices:**

1. **`method01`** — “I would compare the urgency and defensibility of each crossing.”
2. **`method02`** — “I would establish scouts at both approaches before moving the reserve.”
3. **`method03`** — “I would choose a position from which defenders can redeploy quickly.”
4. **`method04`** — “I would explain the plan so each unit understands when to withdraw.”
5. **`method05`** — “I would seek civilian evacuation routes that do not depend on holding either crossing.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.tactics.seed03` — The confusing field reports

**Destination:** Soldier · **Q1 family:** `tactics` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: Three patrols report movement near a supply camp, but each uses different landmarks. The commander needs a decision before dusk. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would create a common map from the patrols' verified observations.”
2. **`method02`** — “I would ask each patrol to identify what it did not see.”
3. **`method03`** — “I would assign one unit to confirm the most uncertain report.”
4. **`method04`** — “I would keep a reserve until the reports support a clearer decision.”
5. **`method05`** — “I would warn the camp without declaring an attack inevitable.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.tactics.seed04` — The narrow urban approach

**Destination:** Soldier · **Q1 family:** `tactics` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: A relief convoy must pass through streets with poor visibility. The drivers want to move quickly; escorts worry about ambushes. What is your call?'

**Player choices:**

1. **`method01`** — “I would divide the route into segments with clear checkpoints.”
2. **`method02`** — “I would use observers to identify hazards before the convoy enters.”
3. **`method03`** — “I would assign escorts to guard intersections while vehicles move.”
4. **`method04`** — “I would plan alternate exits if the street becomes blocked.”
5. **`method05`** — “I would prioritize the convoy's civilians rather than attempting to seize territory.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.tactics.seed05` — The distracted squad

**Destination:** Soldier · **Q1 family:** `tactics` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: A squad repeatedly reacts to false alarms in the eastern sector while the western perimeter receives no attention. What do you do?'

**Player choices:**

1. **`method01`** — “I would rebalance watch responsibilities based on verified risks.”
2. **`method02`** — “I would establish a simple reporting standard for all alarms.”
3. **`method03`** — “I would send a small team to inspect the eastern source.”
4. **`method04`** — “I would retain a reserve that can respond to either side.”
5. **`method05`** — “I would brief the squad on what would actually justify redeployment.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.tactics.seed06` — The divided fleet escort

**Destination:** Soldier · **Q1 family:** `tactics` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: Two escort craft disagree about whether to stay close to a cargo ship or search ahead for threats. Their captain asks for a plan. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would define which risks the cargo ship cannot handle alone.”
2. **`method02`** — “I would allocate separate observation and close-protection duties.”
3. **`method03`** — “I would establish clear signals for when the escorts should regroup.”
4. **`method04`** — “I would review the route for places where either tactic becomes dangerous.”
5. **`method05`** — “I would avoid chasing uncertain contacts that would abandon the cargo.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.tactics.seed07` — The abandoned strongpoint

**Destination:** Soldier · **Q1 family:** `tactics` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: Defenders find an apparently empty strongpoint near the road. Occupying it could protect the route, but its condition is unknown. What is your call?'

**Player choices:**

1. **`method01`** — “I would inspect the strongpoint before committing the team.”
2. **`method02`** — “I would keep a mobile group ready outside while others assess it.”
3. **`method03`** — “I would identify safe withdrawal routes before occupying any position.”
4. **`method04`** — “I would ask local residents what happened to the previous defenders.”
5. **`method05`** — “I would use observation from the road rather than seize a position we cannot hold.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.unarmed.seed02` — The crowded detention room

**Destination:** Soldier · **Q1 family:** `unarmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: Two detainees begin fighting in a room filled with bystanders. The guards are reaching for weapons despite the close quarters. What do you do?'

**Player choices:**

1. **`method01`** — “I would direct the bystanders away before intervening.”
2. **`method02`** — “I would ask the detainees to separate while there is still time.”
3. **`method03`** — “I would coordinate with guards to restrain the fighters safely.”
4. **`method04`** — “I would avoid strikes that could injure people trapped nearby.”
5. **`method05`** — “I would request trained assistance if the fight cannot be controlled.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.unarmed.seed03` — The lost sidearm

**Destination:** Soldier · **Q1 family:** `unarmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: A security officer drops their weapon during a struggle on a slippery gangway. Their opponent is trying to grab it. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would move the weapon out of reach if it can be done safely.”
2. **`method02`** — “I would create space between the people before another attack.”
3. **`method03`** — “I would call for help while keeping the gangway clear.”
4. **`method04`** — “I would use controlled restraint only if needed to prevent immediate harm.”
5. **`method05`** — “I would guide nearby workers away from the struggle.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.unarmed.seed04` — The training room dispute

**Destination:** Soldier · **Q1 family:** `unarmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: A close-combat exercise turns into an argument when one student refuses to release a hold. The instructor is momentarily distracted. What is your call?'

**Player choices:**

1. **`method01`** — “I would call for the instructor before the hold causes injury.”
2. **`method02`** — “I would help the students disengage without escalating the conflict.”
3. **`method03`** — “I would clear the area to give everyone room to move.”
4. **`method04`** — “I would ask the student why they ignored the stop signal.”
5. **`method05`** — “I would suspend the lesson until safe practice can resume.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.unarmed.seed05` — The narrow elevator

**Destination:** Soldier · **Q1 family:** `unarmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: An agitated passenger threatens another in a stalled lift. There is barely room to move and rescuers are opening the ceiling hatch. What do you do?'

**Player choices:**

1. **`method01`** — “I would speak calmly to the passenger while keeping distance.”
2. **`method02`** — “I would position myself to shield the threatened person.”
3. **`method03`** — “I would avoid sudden movements that could destabilize the rescue.”
4. **`method04`** — “I would coordinate with the rescuers before attempting any restraint.”
5. **`method05`** — “I would prioritize opening a safe exit over winning a struggle.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.unarmed.seed06` — The checkpoint search

**Destination:** Soldier · **Q1 family:** `unarmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: A visitor resists a security search, saying the guard is abusing their authority. Other travelers are watching and growing angry. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would ask the guard to explain the search procedure clearly.”
2. **`method02`** — “I would offer the visitor an impartial witness.”
3. **`method03`** — “I would keep my hands visible and avoid treating protest as an attack.”
4. **`method04`** — “I would separate the discussion from the waiting crowd.”
5. **`method05`** — “I would use restraint only if someone faces an immediate threat.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.unarmed.seed07` — The sparring injury

**Destination:** Soldier · **Q1 family:** `unarmed` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: A sparring partner falls awkwardly and cannot stand. Another trainee wants to continue the bout to prove a point. What is your call?'

**Player choices:**

1. **`method01`** — “I would stop the session and protect the injured person from further movement.”
2. **`method02`** — “I would ask for medical help before attempting another hold.”
3. **`method03`** — “I would explain that control includes knowing when to stop.”
4. **`method04`** — “I would move bystanders back so care can proceed.”
5. **`method05`** — “I would ask the instructor to review the exercise before anyone resumes.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.weapon.seed02` — The blocked escape lane

**Destination:** Soldier · **Q1 family:** `weapon` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: A repair crew needs to cross a passage watched by armed raiders. A direct firefight would leave the workers exposed. What do you do?'

**Player choices:**

1. **`method01`** — “I would identify the safest covered route for the workers.”
2. **`method02`** — “I would ask the raiders whether they will allow an orderly withdrawal.”
3. **`method03`** — “I would coordinate with allies to watch the dangerous angles.”
4. **`method04`** — “I would use a suitable weapon only if necessary to protect the escape.”
5. **`method05`** — “I would seek another exit before turning the passage into a battlefield.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.weapon.seed03` — The malfunctioning turret

**Destination:** Soldier · **Q1 family:** `weapon` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: A defensive turret tracks passing vehicles after its control console fails. Civilian traffic is approaching the checkpoint. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would warn the approaching drivers to turn back.”
2. **`method02`** — “I would search for a safe control point outside the turret's coverage.”
3. **`method03`** — “I would coordinate a technical shutdown rather than attack the turret blindly.”
4. **`method04`** — “I would position myself to protect anyone stranded in the road.”
5. **`method05`** — “I would ask the guard crew whether an authorized safety override exists.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.weapon.seed04` — The uncertain rifle team

**Destination:** Soldier · **Q1 family:** `weapon` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: Volunteers assigned to defend a clinic have a mix of unfamiliar rifles. Their leader wants them deployed immediately. What is your call?'

**Player choices:**

1. **`method01`** — “I would check which volunteers actually know their assigned equipment.”
2. **`method02`** — “I would organize simple defensive positions with clear lines of sight.”
3. **`method03`** — “I would arrange a short safety briefing before anyone takes a post.”
4. **`method04`** — “I would find noncombat roles for volunteers who are not ready to shoot.”
5. **`method05`** — “I would ask for experienced defenders to supervise the first watch.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.weapon.seed05` — The crowded cargo deck

**Destination:** Soldier · **Q1 family:** `weapon` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'All right, try this: A crew member draws a weapon when an argument breaks out beside volatile cargo. Other workers cannot reach the exit. What do you do?'

**Player choices:**

1. **`method01`** — “I would convince the armed crew member to lower the weapon.”
2. **`method02`** — “I would lead the workers away from the hazardous containers.”
3. **`method03`** — “I would identify cover that will not damage the cargo if struck.”
4. **`method04`** — “I would keep my own weapon secured unless there is no other way to protect someone.”
5. **`method05`** — “I would summon a supervisor the crew member is willing to hear.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.weapon.seed06` — The changing range

**Destination:** Soldier · **Q1 family:** `weapon` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Here is one for you: During an escort, threats appear at distances different from those the guards trained for. A group of civilians needs time to retreat. How do you handle it?'

**Player choices:**

1. **`method01`** — “I would assess the distance before choosing how to respond.”
2. **`method02`** — “I would assign allies to watch separate approaches.”
3. **`method03`** — “I would position the escorts so civilians have a protected route.”
4. **`method04`** — “I would avoid wasting fire where the equipment is ineffective.”
5. **`method05`** — “I would request support if the threat exceeds what our group can safely handle.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

#### `q4.soldier.weapon.seed07` — The ceremonial blockade

**Destination:** Soldier · **Q1 family:** `weapon` · **Status:** draft; not rules-tag certified

**Scenario:** Breach: 'Think through this situation: Armed guards at a ceremonial gate refuse passage to a medical team. The commander insists the order comes from above. What is your call?'

**Player choices:**

1. **`method01`** — “I would ask to see the order before escalating the confrontation.”
2. **`method02`** — “I would bring a medic forward to explain the urgency.”
3. **`method03`** — “I would prepare to shield the team if the guards become hostile.”
4. **`method04`** — “I would look for a lawful alternate entrance.”
5. **`method05`** — “I would keep weapons down while we seek the commander's superior.”
6. **`undecided`** — “I'm not sure yet. I would need a clearer picture of the danger before making a call.”

### Local QA results and remaining certification gates

- **PASS:** exact 36/36 family coverage and 20/20 origin→destination Q1 route coverage (all 100 substantive Q1 choices).
- **PASS:** 250 unique stable scene IDs; 250 unique scenario prompts; 1,250 unique first-person substantive player responses; 250 neutral responses (1,500 choices total); original 36 scenario IDs and texts retained verbatim.
- **PASS:** every scene has five substantive methods and one non-scoring undecided response; no new claims of automatic feats, talents, Force powers or prerequisites.
- **PENDING:** human editorial/characterization review of all Mentor speech and player replies; exact canonical tag and mechanic certification per selected method; QA on live actor/Q1/Q2 contexts, no Q1 indecision misclassification; runtime integration, persistence and regression fixtures.

**Owner scope:** This expansion fulfills the requested **250-scenario authored library**. It does not approve individual drafts automatically, does not implement Foundry behavior, and does not constitute a commit, push or PR.


---

## Q5 — PROPOSED NEXT-MILESTONE DESIGN FOR OWNER REVIEW (2026-11-14, LOCAL)

**Status:** PROPOSAL, NOT YET OWNER-APPROVED. This section does not modify Q1–Q4 decisions, replace established Mentor speech, grant abilities, or authorize production implementation. The user requested the next design discussion after the 250-scenario Q4 editorial expansion. No repository changes.

### Q5's distinct job

**Question:** "What is one realistic next step I want this new training to help me accomplish?"

- **Q1 = desired future capability** in the destination class.
- **Q2 = current mechanical strength** the player chooses to connect to Q1 (from the existing scored top-four mechanical bias output, rather than a new scorer).
- **Q3 = intended investment depth** in the class, with Dip / Dive / Swim / Undecided; it adjusts planning horizon only.
- **Q4 = preferred approach** to a hypothetical challenge (one of the 250 authored scenarios). A Q4 hypothetical is **not** a recorded action the character performed.
- **Q5 = an actionable next milestone**, distinct from a new permanent career election, a prediction that the character can acquire something, or an automatic scheduling of levels.
- **Q6 = evidence-grounded Mentor reflection** on actual build identity and separately declared intentions; no implicit goal replacement.

The Q5 Mentor introduction remains the fixed, already-authored destination-specific line for Miraj, J0-N1, Ol' Salty, Lead, or Breach. The Mentor does not improvise an unverified personal history. Q5's dynamic answer text remains **first-person player-character dialogue**, in the same pattern as Q1–Q4.

### Proposed five substantive answer purposes + undecided

The player should receive **five distinct, actionable, first-person near-term milestones** and **one non-scoring undecided answer**, derived from the Q1 route and supported actor/goal context. The five answer purposes are stable, but the exact narrative text and any verified mechanical detail vary by destination class, Q1 selection, actual owned build, and declared goals.

| Stable milestone type | What the player chooses to accomplish next | Novel information contributed by Q5 | Required guardrail |
|---|---|---|---|
| `develop_core` | Learn, practice, or make tangible progress toward an early capability tied to the chosen Q1 direction. | Immediate training priority | No claim to own an unselected feat/talent/skill/power; named option only when class-access and prerequisite authority support its status. |
| `field_application` | Apply the desired capability in a specific, observable upcoming type of challenge. | In-world practical objective | The Q4 hypothetical is not narrated as a past accomplishment; the milestone may be compatible with Q4's selected method without simply re-asking how to act. |
| `benefit_others` | Use new training to improve a concrete outcome for allies, crew, or people the character chooses to help. | Intended beneficiaries and practical role | Do not assert an existing responsibility or invented personal bond; do not convert this answer into a generic `allySupport` mechanical grant. |
| `career_continuity` | Take an identifiable step toward an **explicitly recorded** L1 career/long-term ambition or affirmed later goal. | Explicit re-affirmation of goal continuity for this training | If no such goal is found, show a truthful alternative about exploring a future vocation; never fabricate L1 choice or invent a career from archetype scores. |
| `prepare_future_route` | Identify and prepare a verified prerequisite, advanced discipline, or promising future avenue without prematurely committing to it. | Future-route curiosity/preparation | Use a named future class/feat/talent only with accurate source identity and prerequisite status; a possible Bridge purpose is not a new depth category or an automatic career replacement. |
| `undecided` | "I am not sure what I want to accomplish first. I would rather see what this training makes possible." | **No milestone specialization** | No guessed goal, no implicit Dip, no negative or generic scoring, no suppressed Q1–Q4 signals. |

**Meaningful milestone test:** Could a player recognize, within a subsequent adventure or one or more legal progression opportunities, whether they have made progress on this goal? A useful milestone need not have an exact session number or predetermined future level. Avoid abstract sentences like "I want to become stronger" as the only objective.

**No forced choice of a known mechanical reward:** An operational milestone (e.g., prepare a safe route, successfully coordinate a group, stabilize a crisis) is as valid as preparing for a feat or talent. Feats, talents, trained skills, Force powers, and advanced routes remain subject to separate canonical rules and actual progression selection.

### Selection algorithm — presentation, not a new scoring engine

1. Read the **actual Q1 selected response** and destination class, or enter an intentionally broad/evidence-limited fallback if Q1 is neutral. Existing 100 substantive Q1 route records map to 36 Q4 capability families, but Q5 should keep the exact Q1 choice ID when authoring detailed goals.
2. Read the **selected Q2 integration answer** and its provenance (current actor's top-four scored mechanical biases and relevant owned evidence). Use it as optional context for wording, not as a second round of mechanical-bias scoring. If Q2 is undecided, do not invent a current strength.
3. Read Q3 depth **only to explain prioritization and planning horizon**; do not hide Q5 goals that are appropriate for another depth and do not turn `swim` into a career switch.
4. Read the **Q4 selected method** as a declared *hypothetical approach preference* (not observed experience), allowing a compatible field-application goal. Q4 neutral yields no method preference.
5. Read the **separate explicit declared-goal authority**: L1 career parent, L1 Q5 longer-term ambition, and any affirmed later revision. Never infer a declared goal from the archetype parent/specialization, mechanical bias score, Suggestion Engine recommendation tier, or Q4 choice.
6. Resolve candidate mechanical milestones through the **existing** progression and eligibility authorities, with `MilestoneComputer` as scheduling/forecast **context** and Suggestion Engine as ranking/explanatory context. A forecast is **not** proof of feat/talent/skill eligibility. Mark possible named mechanics as `available_at_this_choice`, `reachable_later_with_verified_steps`, `future_aspiration_only`, or `unverified`; **do not display unverified options as legal acquisitions**.
7. Present exactly five substantively different first-person options plus `undecided`, each with a stable milestone-type ID and a source-grounded, clearly future-tense detail rail. If `career_continuity` has no declared goal, replace it with an explicit career-exploration alternative; if `prepare_future_route` lacks a verified named route, offer a plain exploration/preparation goal rather than fabricate prerequisites.
8. Store **only the selected Q5 response** on successful completion, as independently attributable player intent. Unselected recommendations/alternatives are not declared goals, no mechanical selection is applied, and pending drafts do not persist as completed preferences.
9. If a selected answer indicates a possible change in long-term career direction, record `exploring_change` and seek a **separate explicit affirmation** before modifying the L1 declared-goal authority. Q6's Mentor reflection is not a substitute for that confirmation.

### Suggested authoring scale (not yet requested/approved)

Unlike Q4, Q5 does **not** need one milestone bank for each of the 250 distinct hypothetical scenes. Q5 is tied most directly to the **100 substantive Q1 development choices** (20 directed transitions × 5), not the incidental scenery or one of the 125 current-build bias keys.

An appropriately detailed production dialogue bank would contain **100 Q1 route IDs × 5 substantive milestone-purpose statements = 500 authored first-person templates**, plus neutral choices and specific conditional goal-continuity / future-route fallbacks. These 500 are **proposed scope only; none are claimed authored by this section**. Mentor Q5 intros remain the five existing fixed utterances. Existing actor/career/eligibility data supplies verified interpolation safely; do not materialize 297 archetypes × 250 scenarios × 125 tags as combinations.

### Worked player-visible Q5 example — Noble adds Jedi (illustrative, no RAW grant)

**Hypothetical Q1:** Wants to develop awareness of the Force. **Q2:** Values connecting new awareness to previously acquired observational judgment, if actual build confirms that strength. **Q3:** Dive. **Q4:** Chooses examining an unfamiliar danger before acting. **Explicit old goal:** Archaeological exploration, **only when separately recorded**. Miraj asks her already-authored fixed Q5 question.

1. `develop_core` — “I want to learn to recognize what my new training can reveal, even when I cannot yet explain what I sense.”
2. `field_application` — “I want to put that awareness to the test the next time we investigate a place we do not understand.”
3. `benefit_others` — “I want to notice the warning signs early enough to help someone else avoid danger.”
4. `career_continuity` — “I want my studies to help me explore ancient places more responsibly, because that is still the work I mean to pursue.” **Only if archival goal confirms this exact direction.**
5. `prepare_future_route` — “I want to understand what further training I would need before I can rely on more advanced Force techniques.”
6. `undecided` — “I am not sure what I want to accomplish first. I would rather see what this training makes possible.”

**Without a recorded archaeology/continuity goal**, replace response #4 rather than invent a dream: “I want to find out what kinds of future work this new understanding could open to me.” Never suggest that the character already has Force Sensitivity, a trained Use the Force skill, a Force power, or a particular Jedi talent unless verified.

### Class-specific example goal diversity — editorial prototypes, not a 500-record bank

These are illustrative **first-person player** objectives to show how the same milestone types can change with the destination class. They are not automatic statements of already acquired skill or capability.

| Destination + example Q1 interest | `develop_core` | `field_application` | `benefit_others` | `career_continuity` when actual goal exists | `prepare_future_route` |
|---|---|---|---|---|---|
| Jedi: Force awareness | “I want to become better at recognizing what I sense.” | “I want to test that awareness the next time a strange place challenges us.” | “I want to recognize a danger early enough to help someone avoid it.” | “I want this training to help me take my next real step toward the calling I already chose.” | “I want to discover what other training would let me understand the Force more deeply.” |
| Noble: coordinating allies | “I want to learn how to make a clear plan others can follow.” | “I want to help organize our next difficult assignment before anyone rushes in.” | “I want people around me to know what they can count on me to do.” | “I want to use better leadership to make progress toward the work I said mattered to me.” | “I want to learn what further training would let me take on greater responsibility.” |
| Scoundrel: technical ingenuity | “I want to become more dependable when an unfamiliar machine gives us trouble.” | “I want to solve a real equipment problem with limited time and tools.” | “I want the crew to have another option when their equipment fails.” | “I want this practical knowledge to help me reach the livelihood I am already pursuing.” | “I want to see which technical specialties are worth learning next.” |
| Scout: reconnaissance | “I want to recognize subtle signs of trouble before I commit to a route.” | “I want to survey our next unfamiliar approach and make a practical recommendation.” | “I want my companions to have warning when I spot a danger they might miss.” | “I want exploration to carry me closer to the objective I already set for myself.” | “I want to know what additional field training would make me a more reliable pathfinder.” |
| Soldier: protecting allies | “I want to improve how I hold a position when someone else needs cover.” | “I want to help get people safely through the next dangerous passage.” | “I want my companions to have a better chance of getting home when a fight breaks out.” | “I want this training to help me fulfill the responsibility I previously chose.” | “I want to identify which defensive techniques I should study next.” |

**Example limitation:** These lines illustrate structure, not finalized route-specific copy. Each individual statement still needs careful review for redundancy, class voice naturalness, verified context, and connection to the actual Q1 answer. Never render the literal abstract "calling I already chose" as though it were a personalized statement if the archive contains a better specific verified reference; prefer genuinely natural sentence assembly, and use the truthful exploration fallback if none exists.

### Proposed completion event (design shape, not current actor schema)

```
{
  questionId: 'nextMilestone',
  answerId: 'field_application',
  milestoneType: 'field_application',
  destinationClassId: 'scout',
  q1ChoiceId: '<verified-choice-id-or-null>',
  q2ChoiceId: '<selected-integrating-answer-id-or-null>',
  q4ScenarioId: '<selected-scenario-id-or-null>',
  q4MethodId: '<selected-method-id-or-null>',
  declaredCareerRefAtTime: '<verified-ref-or-null>',
  goalRelation: 'continuity | exploratory | independent | undecided',
  targetReference: '<canonical-target-id-or-null>',
  targetEligibilityStatus: 'verified | future_conditional | not_applicable | unverified',
  completedAt: '<timestamp>',
  completedAtLevel: '<observed-character-level>',
  provenance: 'player_declared_multiclass_q5'
}
```

The actual implementation should use the repository's validated field/schema conventions rather than blindly copying this pseudocode. `q1`/`q2`/`q4` IDs are **context references**, not a reason to award their signals again when scoring Q5. Keep the player's newly declared milestone distinct from derived inference, currently legal choices, later actual achievement, and old future goals. Avoid writing score weights into the authored dialogue library.

### Tests required before production

- Q5 always supplies **five meaningful differentiated goals + one neutral** for all 20 transitions / 100 non-neutral Q1 routes; Q1 undecided also has safe, truthful fallbacks.
- All five Mentor introductions remain fixed and class-specific; all player options first-person and natural after variable substitution.
- Q5 never states that a feat, talent, Force power, trained skill, equipment ability, or prestige prerequisite is **owned** or **immediately legal** without direct evidence.
- No current declared goal: response #4 is a truthful new-career-exploration option, never a fictional remembered ambition.
- Recorded declared career and long-term ambition: continuity choice references them faithfully; none of the other Q5 choices silently replaces either.
- An explicitly chosen *possible* career pivot triggers a separate confirmation path; no inferred score automatically commits it.
- Q4 scenario choices are preferred hypothetical methods only, never past-event memories or completed achievement evidence.
- No duplicate intent inflation when Q1, Q2, Q3, Q4, and Q5 all reference the same broad capability; one selected Q5 milestone contributes only its distinct goal signal.
- Late-level, multiple foundation classes, no legal short-term options, stale suggestion-cache results, partial drafts, backtracking, rerender, retakes, and completion-event supersession behave deterministically and never overwrite history.
- The proposed future authoring bank must be validated for **semantic diversity**, not just 500 differing strings; Q5's achievement targets should be measurable and varied, not five rewordings of Q1.

**Decision requested:** Approve or refine this Q5 *five milestone-purpose* architecture and proposed 100×5 = 500 authored substantive responses before commissioning the full writing pass. No GitHub or production mutations.

### Local change log

- **2026-11-14 — Q5 planning proposal:** Read the current v0.10 design, fixed destination Q5 Mentor intros, current `SHORT_TERM_GOAL_QUESTION` in `base-class-survey-definitions.js`, `BuildIntent.js`/`MilestoneComputer.js`, and earlier Q5 direction. Added a structured, unapproved design proposal with answer purposes, truthful personalization, eligibility/continuity safeguards, library sizing, prototype dialogue, and acceptance tests. All local only.


## Q5 — 500-RESPONSE LOCAL EDITORIAL LIBRARY (OWNER-AUTHORIZED AUTHORING)

**Status:** 500 substantive first-person responses authored and structurally validated across 100 source-grounded Q1 choices. This supersedes the previous Q5 proposal's *not yet authored* status. Still editorial draft; mechanical, goal-display, and runtime certification remain pending. All work local, no GitHub changes.

**Inputs:** exact Q1 origin→destination choices (20 banks × 5), five approved milestone types, and separately recorded career/ambition context. Source Q1 texts and local design IDs are embedded in the companion JSON.

**Count:** 100 Q1 routes × 5 options = **500 unique first-person substantive dialogue lines**. Each has one additional non-scoring undecided option; Q1 undecided uses five extra destination-class fallback banks with 25 additional substantive responses. Thus the complete display system supports 105 banks, 525 authored substantive variants, and 105 undecided placements. These additional 25 are not included in the headline 500 main-route count.

**Career continuity slot:** `{declared_goal}` is permitted only for the fourth substantive milestone and only if independently verified as an explicitly declared goal. A goal expression must be edited into a grammatically appropriate noun phrase by a trusted presentation adapter. Without verified goal, substitute the destination-specific `noRecordedGoalFallbackText` instead; do not claim any historical choice.

**Source alignment:** Q1 route origin/destination and exact answer wording is retained in JSON; local IDs are provisional until mapped to stable runtime choice IDs. Mentor Q5 introductions remain untouched and fixed per destination.

**Scope caveat:** Distinctness and first-person format are structurally checked. Editorial semantic differentiation, sentence fluency with real player goals, actual eligibility, and runtime behavior are **not yet certified**. No assertion that template lines name legal mechanics or reflect actual owned capabilities.

**Companion files:** `SWSE_Q5_500_Milestone_Library_LOCAL.json`, `SWSE_Q5_500_Validation_LOCAL.json`.

### Full Q5 first-person milestone library

Milestone columns in order: `develop_core`, `field_application`, `benefit_others`, `career_continuity`, `prepare_future_route`; each route has a neutral non-scoring option in the JSON.

#### Jedi → Noble · Q1 #1

**Q1:** “I want to learn how to persuade people and settle disputes through understanding rather than relying on the abilities I've trained in before.”

1. **develop_core:** “I want to practice opening difficult conversations with questions instead of demands.”
2. **field_application:** “I want to help settle the next disagreement before either side reaches for a weapon.”
3. **benefit_others:** “I want to give people on both sides a chance to be heard without putting anyone at greater risk.”
4. **career_continuity:** “I want to make one meaningful diplomatic contact in service of {declared_goal}.”
5. **prepare_future_route:** “I want to identify which negotiating techniques I should study before trying to mediate a larger dispute.”

#### Jedi → Noble · Q1 #2

**Q1:** “I want to learn to organize people around a shared purpose, so my companions can act together when it matters.”

1. **develop_core:** “I want to practice explaining a plan so everyone knows their responsibility.”
2. **field_application:** “I want to organize our next group operation before the first complication appears.”
3. **benefit_others:** “I want my companions to have clear tasks and a way to support one another when our plan changes.”
4. **career_continuity:** “I want to coordinate one useful team effort that advances {declared_goal}.”
5. **prepare_future_route:** “I want to learn what further leadership training would help me guide a larger group responsibly.”

#### Jedi → Noble · Q1 #3

**Q1:** “I want to help others keep their courage and recover when a situation begins to overwhelm them.”

1. **develop_core:** “I want to learn how to recognize when a companion needs encouragement rather than instructions.”
2. **field_application:** “I want to keep our team focused through the next setback without ignoring anyone's concerns.”
3. **benefit_others:** “I want to help someone regain their confidence after a difficult failure.”
4. **career_continuity:** “I want to strengthen the people helping me pursue {declared_goal}.”
5. **prepare_future_route:** “I want to explore what additional supportive training could help me during a prolonged crisis.”

#### Jedi → Noble · Q1 #4

**Q1:** “I want to understand governments, cultures, and institutions well enough to recognize what is really shaping a conflict.”

1. **develop_core:** “I want to study one unfamiliar institution until I understand who actually makes its decisions.”
2. **field_application:** “I want to investigate the local interests behind our next dispute before choosing a side.”
3. **benefit_others:** “I want to share enough reliable background for my companions to avoid a preventable misunderstanding.”
4. **career_continuity:** “I want to uncover one institutional connection relevant to {declared_goal}.”
5. **prepare_future_route:** “I want to identify which areas of history, politics, or specialized knowledge I should study next.”

#### Jedi → Noble · Q1 #5

**Q1:** “I want to build connections and secure resources that help the people and causes I choose to support.”

1. **develop_core:** “I want to learn how to request useful aid without promising more than I can deliver.”
2. **field_application:** “I want to secure a practical contact or supply source before our next difficult assignment.”
3. **benefit_others:** “I want our companions to have the equipment or assistance they need before trouble begins.”
4. **career_continuity:** “I want to establish one trustworthy connection that supports {declared_goal}.”
5. **prepare_future_route:** “I want to learn what would be required to maintain a reliable network beyond a single favor.”

#### Scoundrel → Noble · Q1 #1

**Q1:** “I want to become more convincing when the stakes are high, whether I'm bargaining, bluffing, or asking someone to trust me.”

1. **develop_core:** “I want to practice making an honest, persuasive case as confidently as I can bluff.”
2. **field_application:** “I want to negotiate the terms of our next risky agreement before anyone commits.”
3. **benefit_others:** “I want my companions to understand the bargain and avoid obligations they never accepted.”
4. **career_continuity:** “I want to reach one fair agreement that moves {declared_goal} forward.”
5. **prepare_future_route:** “I want to study how experienced negotiators build credibility when their reputation is uncertain.”

#### Scoundrel → Noble · Q1 #2

**Q1:** “I want to turn my ability to improvise into a way to coordinate a whole group, not just get myself out of trouble.”

1. **develop_core:** “I want to turn an improvised idea into a plan that others can follow.”
2. **field_application:** “I want to lead the preparations for our next job instead of waiting for a crisis to improvise.”
3. **benefit_others:** “I want every member of the crew to know what to do when the original plan fails.”
4. **career_continuity:** “I want to coordinate one successful group effort in pursuit of {declared_goal}.”
5. **prepare_future_route:** “I want to learn how to manage more complicated operations without losing flexibility.”

#### Scoundrel → Noble · Q1 #3

**Q1:** “I want to cultivate useful contacts and resources so I'm not always depending on whatever I can find at the last moment.”

1. **develop_core:** “I want to learn how to distinguish a dependable contact from an attractive offer.”
2. **field_application:** “I want to arrange one useful source of supplies or information before we need it urgently.”
3. **benefit_others:** “I want the crew to have a fallback resource when our first option disappears.”
4. **career_continuity:** “I want to cultivate one contact who can genuinely assist with {declared_goal}.”
5. **prepare_future_route:** “I want to understand what it takes to build a network that survives more than one transaction.”

#### Scoundrel → Noble · Q1 #4

**Q1:** “I want to understand organizations and information networks well enough to recognize opportunities before they appear.”

1. **develop_core:** “I want to learn who controls information inside one organization we may need to deal with.”
2. **field_application:** “I want to trace the source of our next important rumor before acting on it.”
3. **benefit_others:** “I want to warn my companions when a promising lead depends on someone else's hidden interests.”
4. **career_continuity:** “I want to uncover an information channel useful to {declared_goal}.”
5. **prepare_future_route:** “I want to decide which research and information-gathering skills deserve deeper study.”

#### Scoundrel → Noble · Q1 #5

**Q1:** “I want to learn how to encourage and support my companions so our success doesn't depend on one person getting lucky.”

1. **develop_core:** “I want to practice helping a companion recover their focus after a plan goes wrong.”
2. **field_application:** “I want to keep our group working together the next time luck stops favoring us.”
3. **benefit_others:** “I want to make sure someone else's mistake becomes a problem we can solve together.”
4. **career_continuity:** “I want to help the people pursuing {declared_goal} stay organized through an early setback.”
5. **prepare_future_route:** “I want to explore supportive leadership techniques that go beyond encouragement alone.”

#### Scout → Noble · Q1 #1

**Q1:** “I want to learn how to turn what I discover into plans that help an entire team work together.”

1. **develop_core:** “I want to practice turning a field report into clear choices for the group.”
2. **field_application:** “I want to brief my companions on the risks of our next route before we set out.”
3. **benefit_others:** “I want everyone to understand what my observations mean for their safety and responsibilities.”
4. **career_continuity:** “I want to present reliable field findings that help advance {declared_goal}.”
5. **prepare_future_route:** “I want to learn what planning and leadership skills make reconnaissance useful at larger scales.”

#### Scout → Noble · Q1 #2

**Q1:** “I want to become better at questioning people and negotiating for information that observation alone can't uncover.”

1. **develop_core:** “I want to prepare better questions for witnesses who know things the terrain cannot tell me.”
2. **field_application:** “I want to negotiate access to information during our next investigation rather than searching blindly.”
3. **benefit_others:** “I want my companions to avoid wasting time or provoking people who could help us.”
4. **career_continuity:** “I want to obtain one trustworthy account relevant to {declared_goal}.”
5. **prepare_future_route:** “I want to identify which interviewing and diplomatic methods would extend my investigative reach.”

#### Scout → Noble · Q1 #3

**Q1:** “I want to be able to steady my companions and help them keep going when an expedition becomes dangerous.”

1. **develop_core:** “I want to learn how to notice when exhaustion is weakening the whole expedition.”
2. **field_application:** “I want to steady the group through our next difficult stretch without pretending the danger is small.”
3. **benefit_others:** “I want a struggling companion to know they can ask for help before they fall behind.”
4. **career_continuity:** “I want to sustain the team carrying out {declared_goal} through its next challenge.”
5. **prepare_future_route:** “I want to learn more ways to help a group remain effective during extended hardship.”

#### Scout → Noble · Q1 #4

**Q1:** “I want to establish contacts and obtain support before we head into unfamiliar territory, instead of relying only on what we carry.”

1. **develop_core:** “I want to practice identifying what an expedition will need before its route is final.”
2. **field_application:** “I want to arrange the next journey's supplies and local contacts ahead of departure.”
3. **benefit_others:** “I want my companions to have dependable support when the nearest settlement is far away.”
4. **career_continuity:** “I want to obtain one practical resource needed for {declared_goal}.”
5. **prepare_future_route:** “I want to learn how experienced organizers maintain support across several remote stops.”

#### Scout → Noble · Q1 #5

**Q1:** “I want to broaden my knowledge and practical expertise so I can handle unfamiliar problems without depending on a specialist.”

1. **develop_core:** “I want to study an unfamiliar problem well enough to know which questions to ask.”
2. **field_application:** “I want to handle one complication on our next journey without immediately seeking a specialist.”
3. **benefit_others:** “I want to offer the group a useful second option when their usual expert is unavailable.”
4. **career_continuity:** “I want to apply one new area of knowledge directly to {declared_goal}.”
5. **prepare_future_route:** “I want to identify which disciplines would most broaden my ability to solve unfamiliar problems.”

#### Soldier → Noble · Q1 #1

**Q1:** “I want to learn how to direct and coordinate allies, so I can contribute more than my own actions in a fight.”

1. **develop_core:** “I want to practice giving short, clear directions while others are under pressure.”
2. **field_application:** “I want to coordinate our next defensive operation instead of concentrating only on my own position.”
3. **benefit_others:** “I want my companions to know when to move, hold, or assist one another.”
4. **career_continuity:** “I want to lead one coordinated effort that contributes to {declared_goal}.”
5. **prepare_future_route:** “I want to learn what further command training would help me organize a larger team.”

#### Soldier → Noble · Q1 #2

**Q1:** “I want to be the person who keeps a team confident, organized, and capable when things begin to go badly.”

1. **develop_core:** “I want to learn how to restore confidence without offering false reassurance.”
2. **field_application:** “I want to rally the group during our next serious setback and keep our decisions orderly.”
3. **benefit_others:** “I want the people beside me to feel supported rather than abandoned when a plan fails.”
4. **career_continuity:** “I want to keep the group pursuing {declared_goal} effective through a difficult moment.”
5. **prepare_future_route:** “I want to explore ways to sustain a unit's morale over more than one encounter.”

#### Soldier → Noble · Q1 #3

**Q1:** “I want to learn how to negotiate, pressure an opponent to surrender, or prevent a confrontation from becoming a battle.”

1. **develop_core:** “I want to practice offering an opponent a credible way to stand down.”
2. **field_application:** “I want to resolve the next tense standoff without making the first move toward violence.”
3. **benefit_others:** “I want my companions and the opposing side to have a chance to leave safely.”
4. **career_continuity:** “I want to secure one peaceful agreement that supports {declared_goal}.”
5. **prepare_future_route:** “I want to learn when negotiation, authority, or intimidation is appropriate and what each requires.”

#### Soldier → Noble · Q1 #4

**Q1:** “I want to build the contacts and resources needed to keep my companions equipped and ready before trouble arrives.”

1. **develop_core:** “I want to learn how to anticipate supplies before a mission starts running short.”
2. **field_application:** “I want to arrange dependable equipment and support for our next dangerous assignment.”
3. **benefit_others:** “I want my companions to stop losing options because we failed to prepare.”
4. **career_continuity:** “I want to establish one logistical connection needed for {declared_goal}.”
5. **prepare_future_route:** “I want to understand what further training would let me sustain an operation over a longer distance.”

#### Soldier → Noble · Q1 #5

**Q1:** “I want to refine my fighting technique with feints and precise timing, opening opportunities that raw strength alone might miss.”

1. **develop_core:** “I want to practice recognizing the moment when a feint creates a safe opening.”
2. **field_application:** “I want to test a more precise approach in our next controlled sparring session.”
3. **benefit_others:** “I want to create an opening that helps a companion act instead of chasing the strongest blow.”
4. **career_continuity:** “I want to improve my technique for a challenge I expect while pursuing {declared_goal}.”
5. **prepare_future_route:** “I want to investigate which advanced fencing techniques are worth training for later.”

#### Noble → Jedi · Q1 #1

**Q1:** “I want to understand how the Force can help me reach people and resolve conflicts when ordinary words aren't enough.”

1. **develop_core:** “I want to practice listening for what a tense conversation leaves unsaid without assuming I already understand the Force.”
2. **field_application:** “I want to approach our next dispute with patience while I test what Jedi instruction can teach me.”
3. **benefit_others:** “I want to help both parties feel safe enough to speak before conflict becomes unavoidable.”
4. **career_continuity:** “I want to apply what I learn of the Force to a peaceful step toward {declared_goal}.”
5. **prepare_future_route:** “I want to learn what training and prerequisites stand between me and more reliable Force-guided insight.”

#### Noble → Jedi · Q1 #2

**Q1:** “I want to learn how to protect others with a lightsaber, especially when negotiations fail and someone is in danger.”

1. **develop_core:** “I want to begin the disciplined practice needed to handle a lightsaber safely.”
2. **field_application:** “I want to stand ready to protect someone during our next dangerous negotiation if my training permits it.”
3. **benefit_others:** “I want to help a vulnerable companion reach safety rather than seeking a duel for its own sake.”
4. **career_continuity:** “I want to prepare a defensive skill that could help protect {declared_goal}.”
5. **prepare_future_route:** “I want to identify which lightsaber defenses I could eventually train for and what they require.”

#### Noble → Jedi · Q1 #3

**Q1:** “I want to strengthen and guide my companions through the Force so we can face difficult situations together.”

1. **develop_core:** “I want to learn the foundations of using the Force in support of others without assuming I can already do so.”
2. **field_application:** “I want to look for an opportunity to encourage coordinated action during our next difficult task.”
3. **benefit_others:** “I want my companions to benefit from a calm, deliberate effort to keep us working together.”
4. **career_continuity:** “I want to develop support-oriented Jedi training that can serve {declared_goal}.”
5. **prepare_future_route:** “I want to investigate which Force techniques for helping allies are actually open to me later.”

#### Noble → Jedi · Q1 #4

**Q1:** “I want to sense dangers and hidden intentions that I might not recognize through observation or conversation alone.”

1. **develop_core:** “I want to practice separating ordinary observation from impressions I do not yet understand.”
2. **field_application:** “I want to investigate the next unfamiliar site for danger before anyone enters.”
3. **benefit_others:** “I want to give my companions an early warning whenever I discover a credible risk.”
4. **career_continuity:** “I want to bring more careful awareness to the next stage of {declared_goal}.”
5. **prepare_future_route:** “I want to learn what instruction could help me interpret unusual Force-related impressions responsibly.”

#### Noble → Jedi · Q1 #5

**Q1:** “I want to discover what else the Force can let me do, from moving obstacles to finding new ways around a problem.”

1. **develop_core:** “I want to learn the limits of what I can currently attempt with the Force before relying on it.”
2. **field_application:** “I want to find a safe way past the next obstacle that blocks our route.”
3. **benefit_others:** “I want to create another nonviolent option when my companions face a difficult barrier.”
4. **career_continuity:** “I want to investigate whether Force-assisted problem solving can advance {declared_goal}.”
5. **prepare_future_route:** “I want to find out which movement or manipulation techniques require further training before I could attempt them.”

#### Scoundrel → Jedi · Q1 #1

**Q1:** “I want to learn how to conceal myself and my companions through the Force when being noticed would put us in danger.”

1. **develop_core:** “I want to learn the fundamentals of remaining inconspicuous while studying possible Force concealment.”
2. **field_application:** “I want to plan a quiet approach for our next guarded passage without counting on unlearned powers.”
3. **benefit_others:** “I want to help the people with me avoid needless attention during a sensitive mission.”
4. **career_continuity:** “I want to explore discreet Jedi methods that could support {declared_goal}.”
5. **prepare_future_route:** “I want to identify the actual training required before I could rely on Force-assisted concealment.”

#### Scoundrel → Jedi · Q1 #2

**Q1:** “I want to develop a quick, precise lightsaber style that lets me handle a fight without depending on a blaster.”

1. **develop_core:** “I want to practice the footwork and control needed for safe lightsaber handling.”
2. **field_application:** “I want to test a quick, measured close-combat approach in our next training bout.”
3. **benefit_others:** “I want to be able to defend a companion without spraying blaster fire into a crowded space.”
4. **career_continuity:** “I want to build a disciplined defensive option useful to {declared_goal}.”
5. **prepare_future_route:** “I want to learn which precise lightsaber techniques I could legally study as my training develops.”

#### Scoundrel → Jedi · Q1 #3

**Q1:** “I want to learn how the Force can help me influence a confrontation without having to trick or threaten anyone.”

1. **develop_core:** “I want to practice responding to hostility without relying first on a trick or threat.”
2. **field_application:** “I want to seek a peaceful opening during our next confrontation before it hardens into a fight.”
3. **benefit_others:** “I want to help someone make a safer decision without pretending I can control their mind.”
4. **career_continuity:** “I want to build a more deliberate approach to the conflicts surrounding {declared_goal}.”
5. **prepare_future_route:** “I want to understand what further Jedi training is required for Force-based influence.”

#### Scoundrel → Jedi · Q1 #4

**Q1:** “I want to sharpen my reactions so I can sense an attack coming and defend myself or others before it lands.”

1. **develop_core:** “I want to learn to recognize the signals that precede a sudden attack.”
2. **field_application:** “I want to practice responding defensively during our next supervised sparring session.”
3. **benefit_others:** “I want to notice danger early enough to help a companion avoid the first blow.”
4. **career_continuity:** “I want to strengthen my readiness for the dangers associated with {declared_goal}.”
5. **prepare_future_route:** “I want to investigate which Jedi defensive methods could improve my reactions over time.”

#### Scoundrel → Jedi · Q1 #5

**Q1:** “I want to use the Force in unexpected ways, turning obstacles, distance, and difficult escapes into opportunities.”

1. **develop_core:** “I want to study how Jedi address obstacles without depending on an ordinary escape route.”
2. **field_application:** “I want to find an unexpected but safe passage through the next blocked approach.”
3. **benefit_others:** “I want to help the group keep moving when distance or debris threatens to trap us.”
4. **career_continuity:** “I want to explore alternatives that could make {declared_goal} more achievable.”
5. **prepare_future_route:** “I want to learn which Force movement or manipulation options need training I have not yet completed.”

#### Scout → Jedi · Q1 #1

**Q1:** “I want to sense threats and disturbances that even careful observation might miss.”

1. **develop_core:** “I want to learn how to test my observations against the quieter impressions Jedi describe.”
2. **field_application:** “I want to investigate a suspicious route before our next expedition commits to it.”
3. **benefit_others:** “I want my companions to hear a useful warning before the danger becomes obvious.”
4. **career_continuity:** “I want to develop more reliable awareness for the next stage of {declared_goal}.”
5. **prepare_future_route:** “I want to learn how further training might distinguish true Force insight from a mistaken hunch.”

#### Scout → Jedi · Q1 #2

**Q1:** “I want to learn how the Force can help me cross dangerous terrain and overcome barriers when the normal route fails.”

1. **develop_core:** “I want to practice the discipline required before attempting unfamiliar movement techniques.”
2. **field_application:** “I want to identify a safe passage across the next natural obstacle we encounter.”
3. **benefit_others:** “I want to help a companion reach ground they could not safely cross alone.”
4. **career_continuity:** “I want to broaden the possible routes toward {declared_goal}.”
5. **prepare_future_route:** “I want to determine what Jedi movement training would actually be available to me later.”

#### Scout → Jedi · Q1 #3

**Q1:** “I want to protect the people traveling with me, using Jedi defenses when danger catches us in the open.”

1. **develop_core:** “I want to learn the principles of Jedi defense before expecting them to work in the field.”
2. **field_application:** “I want to prepare a protective response for our next exposed crossing.”
3. **benefit_others:** “I want a companion caught without cover to have a better chance of reaching safety.”
4. **career_continuity:** “I want to develop a protective approach that supports {declared_goal}.”
5. **prepare_future_route:** “I want to identify which Jedi defensive abilities require additional feats, talents, or instruction.”

#### Scout → Jedi · Q1 #4

**Q1:** “I want to help a team act with greater coordination when everything depends on a few well-timed decisions.”

1. **develop_core:** “I want to practice recognizing when the group needs one clear decision rather than several competing suggestions.”
2. **field_application:** “I want to coordinate our next time-sensitive departure before confusion slows us down.”
3. **benefit_others:** “I want my companions to act together when a hazard leaves only a moment to respond.”
4. **career_continuity:** “I want to improve team decisions during the work needed for {declared_goal}.”
5. **prepare_future_route:** “I want to understand which Jedi support techniques could eventually extend this teamwork.”

#### Scout → Jedi · Q1 #5

**Q1:** “I want to learn how to stay unseen and shield my companions from detection when we need to move quietly.”

1. **develop_core:** “I want to practice moving quietly while I learn what Force concealment might require.”
2. **field_application:** “I want to plan a discreet passage past our next guarded obstacle.”
3. **benefit_others:** “I want my companions to avoid attracting attention we cannot safely handle.”
4. **career_continuity:** “I want to add a quieter approach to the work involved in {declared_goal}.”
5. **prepare_future_route:** “I want to learn which Force-assisted concealment methods are possible after further training.”

#### Soldier → Jedi · Q1 #1

**Q1:** “I want to master lightsaber techniques that give me a different way to face an opponent in close combat.”

1. **develop_core:** “I want to establish safe lightsaber handling before attempting complicated fighting forms.”
2. **field_application:** “I want to test a disciplined close-combat technique against a willing training partner.”
3. **benefit_others:** “I want to protect someone at close range without losing control of my weapon.”
4. **career_continuity:** “I want to prepare a measured lightsaber option for the challenges tied to {declared_goal}.”
5. **prepare_future_route:** “I want to learn which lightsaber forms I can pursue and the requirements for each.”

#### Soldier → Jedi · Q1 #2

**Q1:** “I want to learn how to turn aside attacks and hold my ground when someone else needs protection.”

1. **develop_core:** “I want to practice recognizing incoming attacks before choosing how to defend.”
2. **field_application:** “I want to hold a defensive position during our next controlled combat exercise.”
3. **benefit_others:** “I want to help a companion pass through danger while I keep my attention on incoming threats.”
4. **career_continuity:** “I want to strengthen the protective side of my work toward {declared_goal}.”
5. **prepare_future_route:** “I want to identify what additional Jedi defensive training could extend the techniques I already know.”

#### Soldier → Jedi · Q1 #3

**Q1:** “I want to use the Force to help my allies fight and work together more effectively, not just improve my own performance.”

1. **develop_core:** “I want to learn how Jedi support a group before assuming I can use the Force in combat.”
2. **field_application:** “I want to coordinate our next encounter with a clear plan and room for adjustment.”
3. **benefit_others:** “I want the people fighting beside me to find it easier to act together.”
4. **career_continuity:** “I want to add group-focused training to the effort behind {declared_goal}.”
5. **prepare_future_route:** “I want to determine which Force support abilities could become available through verified future training.”

#### Soldier → Jedi · Q1 #4

**Q1:** “I want to learn how to move or restrain threats through the Force, changing a dangerous situation without relying only on weapons.”

1. **develop_core:** “I want to learn the principles behind using the Force to affect movement or restraint.”
2. **field_application:** “I want to find a safer response to the next threat that blocks our route.”
3. **benefit_others:** “I want to give companions time to withdraw without causing needless harm.”
4. **career_continuity:** “I want to explore controlled responses that could help achieve {declared_goal}.”
5. **prepare_future_route:** “I want to understand the requirements for any Force techniques that might restrain or move a threat.”

#### Soldier → Jedi · Q1 #5

**Q1:** “I want to develop the judgment and techniques to end a confrontation without fighting when there is another way.”

1. **develop_core:** “I want to practice recognizing an opening for de-escalation before weapons decide the outcome.”
2. **field_application:** “I want to try to end our next confrontation through a credible peaceful option.”
3. **benefit_others:** “I want to give both sides a chance to back away without humiliation or unnecessary loss.”
4. **career_continuity:** “I want to pursue {declared_goal} without accepting every conflict as a battle.”
5. **prepare_future_route:** “I want to find out what further Jedi training could improve my judgment in tense negotiations.”

#### Jedi → Scout · Q1 #1

**Q1:** “I want to become better at noticing tracks, hidden dangers, and ordinary clues that can tell me what is happening around us.”

1. **develop_core:** “I want to practice identifying tracks and signs without relying on extraordinary senses.”
2. **field_application:** “I want to survey the ground around our next campsite before calling it secure.”
3. **benefit_others:** “I want to show my companions exactly which clues suggest a possible threat.”
4. **career_continuity:** “I want to gather reliable field evidence relevant to {declared_goal}.”
5. **prepare_future_route:** “I want to identify which tracking and observation skills deserve formal training next.”

#### Jedi → Scout · Q1 #2

**Q1:** “I want to learn how to move quietly and keep our approach concealed when attracting attention would put people at risk.”

1. **develop_core:** “I want to practice approaching a watched route without leaving obvious signs.”
2. **field_application:** “I want to pass through our next observation point without drawing unnecessary attention.”
3. **benefit_others:** “I want to help the group reach a safe position before anyone notices our arrival.”
4. **career_continuity:** “I want to plan a discreet step toward {declared_goal}.”
5. **prepare_future_route:** “I want to investigate which Scout stealth and mobility techniques would be worth learning later.”

#### Jedi → Scout · Q1 #3

**Q1:** “I want to cross hazardous ground and survive attacks or difficult conditions when avoiding danger is better than confronting it.”

1. **develop_core:** “I want to learn how to judge unstable footing and environmental hazards before I cross.”
2. **field_application:** “I want to find a practical way through the next dangerous stretch of terrain.”
3. **benefit_others:** “I want to help a slower companion cross without taking an avoidable risk.”
4. **career_continuity:** “I want to improve our odds of reaching {declared_goal} despite hazardous conditions.”
5. **prepare_future_route:** “I want to learn what additional survival and evasive training would serve me best.”

#### Jedi → Scout · Q1 #4

**Q1:** “I want to learn how to navigate unfamiliar routes and handle vehicles when the safe way forward isn't obvious.”

1. **develop_core:** “I want to practice reading a map and checking route assumptions before departure.”
2. **field_application:** “I want to navigate our next unfamiliar journey without relying entirely on someone else.”
3. **benefit_others:** “I want to give my companions a reliable alternative when the planned route becomes unsafe.”
4. **career_continuity:** “I want to chart a workable route toward {declared_goal}.”
5. **prepare_future_route:** “I want to determine what vehicle and navigation training could help me travel farther independently.”

#### Jedi → Scout · Q1 #5

**Q1:** “I want to scout ahead and turn what I discover into useful warnings and better opportunities for my companions.”

1. **develop_core:** “I want to practice describing reconnaissance findings so they are useful to someone who was not there.”
2. **field_application:** “I want to scout the next approach and return with a clear account of its dangers.”
3. **benefit_others:** “I want my companions to make informed choices instead of walking into uncertainty.”
4. **career_continuity:** “I want to provide timely intelligence for the next step toward {declared_goal}.”
5. **prepare_future_route:** “I want to learn what further Scout observation techniques could improve my reporting.”

#### Noble → Scout · Q1 #1

**Q1:** “I want to gather information firsthand, recognizing clues and following trails instead of always depending on someone else's report.”

1. **develop_core:** “I want to practice distinguishing actual physical clues from a witness's interpretation.”
2. **field_application:** “I want to follow the next set of tracks or traces myself before drawing a conclusion.”
3. **benefit_others:** “I want my companions to receive a reliable firsthand report instead of another rumor.”
4. **career_continuity:** “I want to gather direct evidence that can help with {declared_goal}.”
5. **prepare_future_route:** “I want to identify which tracking and investigative field skills I should develop next.”

#### Noble → Scout · Q1 #2

**Q1:** “I want to move discreetly and investigate places where a public approach or a formal introduction would attract attention.”

1. **develop_core:** “I want to practice moving through unfamiliar places without advertising my purpose.”
2. **field_application:** “I want to investigate our next sensitive location without announcing our arrival.”
3. **benefit_others:** “I want my companions to avoid needless questions or exposure while we gather facts.”
4. **career_continuity:** “I want to approach a critical part of {declared_goal} discreetly.”
5. **prepare_future_route:** “I want to find which stealth techniques could extend this careful approach later.”

#### Noble → Scout · Q1 #3

**Q1:** “I want to learn how to survive and keep moving in difficult environments without always needing someone else to guide or protect me.”

1. **develop_core:** “I want to learn how to prepare for a difficult journey with only essential equipment.”
2. **field_application:** “I want to manage our next remote crossing without needing constant rescue or guidance.”
3. **benefit_others:** “I want to help companions conserve supplies and avoid unnecessary exposure.”
4. **career_continuity:** “I want to complete a demanding journey that advances {declared_goal}.”
5. **prepare_future_route:** “I want to understand what survival training would make me more self-reliant in hostile terrain.”

#### Noble → Scout · Q1 #4

**Q1:** “I want to understand routes, vehicles, and unfamiliar territory well enough to plan and undertake journeys myself.”

1. **develop_core:** “I want to practice assessing different routes before committing to one.”
2. **field_application:** “I want to plan and navigate our next unfamiliar journey myself.”
3. **benefit_others:** “I want my companions to have a safer alternative when a transport or passage fails.”
4. **career_continuity:** “I want to map a route that serves {declared_goal}.”
5. **prepare_future_route:** “I want to identify the next navigation or vehicle-handling skills worth developing.”

#### Noble → Scout · Q1 #5

**Q1:** “I want to bring back the right intelligence at the right moment so my companions can make better decisions together.”

1. **develop_core:** “I want to learn how to separate actionable intelligence from distracting details.”
2. **field_application:** “I want to return from our next reconnaissance with a briefing the group can actually use.”
3. **benefit_others:** “I want the right information to reach my companions before a decision becomes irreversible.”
4. **career_continuity:** “I want to gather timely field intelligence relevant to {declared_goal}.”
5. **prepare_future_route:** “I want to explore more advanced reconnaissance methods for gathering and presenting evidence.”

#### Scoundrel → Scout · Q1 #1

**Q1:** “I want to spot hidden watchers and follow someone's trail even when they're trying hard not to be found.”

1. **develop_core:** “I want to practice noticing signs that someone is following us.”
2. **field_application:** “I want to track the next suspicious movement without alerting its source.”
3. **benefit_others:** “I want to warn my companions before hidden watchers can choose the moment of an attack.”
4. **career_continuity:** “I want to uncover a concealed lead that bears on {declared_goal}.”
5. **prepare_future_route:** “I want to determine which advanced tracking techniques would help identify careful pursuers.”

#### Scoundrel → Scout · Q1 #2

**Q1:** “I want to slip through watched areas without being noticed, even when I can't afford to stay still.”

1. **develop_core:** “I want to practice keeping my movement controlled when cover is scarce.”
2. **field_application:** “I want to cross the next observed area without drawing the attention of its guards.”
3. **benefit_others:** “I want to help the group move safely without forcing someone else to take a noisy diversion.”
4. **career_continuity:** “I want to make one discreet approach that advances {declared_goal}.”
5. **prepare_future_route:** “I want to learn what additional mobility and stealth training would make this more dependable.”

#### Scoundrel → Scout · Q1 #3

**Q1:** “I want to keep my footing, avoid hazards, and get out alive when a quick escape becomes dangerous.”

1. **develop_core:** “I want to practice judging which escape routes are safe before I need one.”
2. **field_application:** “I want to navigate our next hazardous retreat without losing my footing.”
3. **benefit_others:** “I want to help a companion get clear of a danger that is spreading too quickly.”
4. **career_continuity:** “I want to keep the route toward {declared_goal} viable even when we must withdraw.”
5. **prepare_future_route:** “I want to identify which evasive field techniques are worth learning next.”

#### Scoundrel → Scout · Q1 #4

**Q1:** “I want to learn how to navigate unfamiliar space and approach in a vehicle without giving away our position.”

1. **develop_core:** “I want to study the navigation checks that matter before approaching an unfamiliar location.”
2. **field_application:** “I want to plan our next vehicle approach so we are not forced into an exposed route.”
3. **benefit_others:** “I want the crew to have a safer arrival option if our first heading is watched.”
4. **career_continuity:** “I want to navigate an important stage of {declared_goal} without drawing attention.”
5. **prepare_future_route:** “I want to learn which vehicle and navigation techniques could improve discreet approaches.”

#### Scoundrel → Scout · Q1 #5

**Q1:** “I want to study a target carefully and share what I learn so my companions can act at the right moment.”

1. **develop_core:** “I want to practice identifying which details of a target are worth reporting.”
2. **field_application:** “I want to study our next objective from a safe vantage point before anyone moves.”
3. **benefit_others:** “I want my companions to recognize the moment when the target is least prepared.”
4. **career_continuity:** “I want to gather target intelligence relevant to {declared_goal}.”
5. **prepare_future_route:** “I want to explore higher-level reconnaissance methods without assuming I already know them.”

#### Soldier → Scout · Q1 #1

**Q1:** “I want to learn how to spot approaching enemies and recognize danger early enough to keep my companions out of an ambush.”

1. **develop_core:** “I want to practice recognizing the early signs of an approaching ambush.”
2. **field_application:** “I want to inspect the next vulnerable route before we expose the group to it.”
3. **benefit_others:** “I want to warn my companions while they still have time to change position.”
4. **career_continuity:** “I want to make the journey toward {declared_goal} safer through better reconnaissance.”
5. **prepare_future_route:** “I want to identify which tracking and perception training could improve my early warnings.”

#### Soldier → Scout · Q1 #2

**Q1:** “I want to approach a dangerous position without being seen, so we can choose when and how to act.”

1. **develop_core:** “I want to practice selecting a concealed approach that still leaves a safe exit.”
2. **field_application:** “I want to reach our next contested position before the defenders spot us.”
3. **benefit_others:** “I want to give the group a choice about when to act rather than forcing a rushed attack.”
4. **career_continuity:** “I want to make one discreet advance toward {declared_goal}.”
5. **prepare_future_route:** “I want to investigate which stealth and mobility techniques would make my approaches more reliable.”

#### Soldier → Scout · Q1 #3

**Q1:** “I want to move across hazardous ground and survive area attacks instead of relying only on standing my ground.”

1. **develop_core:** “I want to practice crossing dangerous ground without depending entirely on armor.”
2. **field_application:** “I want to find an evasive route through our next exposed passage.”
3. **benefit_others:** “I want to help my companions get clear when an attack threatens an entire area.”
4. **career_continuity:** “I want to keep progress toward {declared_goal} possible despite hazardous terrain.”
5. **prepare_future_route:** “I want to learn which Scout survival and evasive techniques I could train for later.”

#### Soldier → Scout · Q1 #4

**Q1:** “I want to learn how to make practical repairs and keep essential equipment working when we're far from support.”

1. **develop_core:** “I want to practice diagnosing a common field failure before touching the equipment.”
2. **field_application:** “I want to restore a vital device during our next isolated assignment using the tools available.”
3. **benefit_others:** “I want the group to retain an essential function when no specialist can reach us.”
4. **career_continuity:** “I want to keep equipment needed for {declared_goal} operational in the field.”
5. **prepare_future_route:** “I want to identify which repair and technical skills deserve deeper instruction.”

#### Soldier → Scout · Q1 #5

**Q1:** “I want to gather battlefield intelligence that helps my allies identify threats and coordinate their actions.”

1. **develop_core:** “I want to practice turning observations into a concise tactical report.”
2. **field_application:** “I want to scout the next enemy position before we decide how to approach it.”
3. **benefit_others:** “I want my companions to recognize the most serious threat before they commit.”
4. **career_continuity:** “I want to gather battlefield intelligence useful to {declared_goal}.”
5. **prepare_future_route:** “I want to learn which reconnaissance and tactical skills would strengthen later planning.”

#### Jedi → Soldier · Q1 #1

**Q1:** “I want to become more capable with ordinary weapons and ranged tactics, so I can protect people even when getting close would be dangerous.”

1. **develop_core:** “I want to practice safe ranged-weapon handling before counting on it in a crisis.”
2. **field_application:** “I want to protect someone across an open distance during our next dangerous assignment.”
3. **benefit_others:** “I want to give my companions cover when getting close to a threat would expose them.”
4. **career_continuity:** “I want to add a dependable ranged option to the work needed for {declared_goal}.”
5. **prepare_future_route:** “I want to identify which weapon techniques and proficiencies I would need for a more specialized fighting style.”

#### Jedi → Soldier · Q1 #2

**Q1:** “I want to learn to fight in armor and endure a sustained attack while keeping others safe.”

1. **develop_core:** “I want to learn how to move and defend myself safely while wearing armor.”
2. **field_application:** “I want to hold a defensive position during our next sustained encounter without ignoring an escape route.”
3. **benefit_others:** “I want a vulnerable companion to have time to withdraw while I remain between them and danger.”
4. **career_continuity:** “I want to develop the endurance needed for a difficult stage of {declared_goal}.”
5. **prepare_future_route:** “I want to determine what further armor and defensive training I can legally pursue.”

#### Jedi → Soldier · Q1 #3

**Q1:** “I want to develop close-quarters techniques for grappling and fighting when I can't count on a particular weapon.”

1. **develop_core:** “I want to practice breaking free from a hold without relying on a weapon.”
2. **field_application:** “I want to test a controlled grappling response in our next supervised training session.”
3. **benefit_others:** “I want to help a companion escape someone trying to restrain them.”
4. **career_continuity:** “I want to develop a close-quarters option that could support {declared_goal}.”
5. **prepare_future_route:** “I want to learn which unarmed and grappling techniques are available through additional training.”

#### Jedi → Soldier · Q1 #4

**Q1:** “I want to learn how to cover my companions and draw danger away from them when they're vulnerable.”

1. **develop_core:** “I want to practice choosing a position that lets me protect others without blocking their escape.”
2. **field_application:** “I want to cover our companions during the next retreat through exposed ground.”
3. **benefit_others:** “I want the person under the greatest pressure to have a safe moment to move.”
4. **career_continuity:** “I want to make direct protection part of how I pursue {declared_goal}.”
5. **prepare_future_route:** “I want to identify defensive and covering-fire techniques worth studying for later encounters.”

#### Jedi → Soldier · Q1 #5

**Q1:** “I want to read a battlefield and coordinate people under pressure, rather than focusing only on the threat directly in front of me.”

1. **develop_core:** “I want to practice reading the whole battlefield rather than fixating on one opponent.”
2. **field_application:** “I want to organize our positions before the next confrontation begins.”
3. **benefit_others:** “I want my companions to receive timely warnings when the situation changes.”
4. **career_continuity:** “I want to apply coordinated tactics to the next stage of {declared_goal}.”
5. **prepare_future_route:** “I want to learn which command and battlefield-awareness methods could develop from this foundation.”

#### Noble → Soldier · Q1 #1

**Q1:** “I want to learn how to defend myself and others with weapons when planning or negotiation isn't enough.”

1. **develop_core:** “I want to practice handling a weapon safely under instruction before trusting myself with it.”
2. **field_application:** “I want to defend a threatened position during our next confrontation if I must.”
3. **benefit_others:** “I want to keep someone else from becoming an easy target when diplomacy fails.”
4. **career_continuity:** “I want to gain a practical defensive option for the challenges involved in {declared_goal}.”
5. **prepare_future_route:** “I want to learn which weapon proficiencies and combat techniques I need for my intended role.”

#### Noble → Soldier · Q1 #2

**Q1:** “I want to learn how to stay on my feet under fire, using armor and endurance instead of depending on someone else to protect me.”

1. **develop_core:** “I want to practice moving in armor until I understand its limits.”
2. **field_application:** “I want to remain effective through the next sustained exchange rather than immediately needing rescue.”
3. **benefit_others:** “I want my companions to know they can depend on me to keep my place under pressure.”
4. **career_continuity:** “I want to improve my resilience for an assignment tied to {declared_goal}.”
5. **prepare_future_route:** “I want to identify what endurance and armor training would be useful before facing greater threats.”

#### Noble → Soldier · Q1 #3

**Q1:** “I want to become more accurate and disciplined with a chosen weapon, so that when I must fight, every action counts.”

1. **develop_core:** “I want to practice making deliberate shots rather than rushing a difficult attack.”
2. **field_application:** “I want to test my accuracy against a controlled target before relying on it in the field.”
3. **benefit_others:** “I want to reduce the chance that my companions are endangered by careless fire.”
4. **career_continuity:** “I want to develop disciplined weapon use for a challenge related to {declared_goal}.”
5. **prepare_future_route:** “I want to understand which precision-oriented combat options are open to me after further training.”

#### Noble → Soldier · Q1 #4

**Q1:** “I want to turn organizing people into effective battlefield teamwork, helping a group act together when a plan begins to fall apart.”

1. **develop_core:** “I want to practice turning a group plan into short instructions everyone can follow during a fight.”
2. **field_application:** “I want to coordinate our next defensive formation when the original plan breaks down.”
3. **benefit_others:** “I want my companions to know when to advance, cover one another, or withdraw.”
4. **career_continuity:** “I want to organize an effective field response that advances {declared_goal}.”
5. **prepare_future_route:** “I want to learn which military coordination techniques would help with more demanding operations.”

#### Noble → Soldier · Q1 #5

**Q1:** “I want to learn how to step between danger and someone vulnerable, protecting them directly rather than only arranging help from a distance.”

1. **develop_core:** “I want to practice positioning myself between a threat and someone who needs help.”
2. **field_application:** “I want to escort a vulnerable person through our next dangerous passage.”
3. **benefit_others:** “I want my companions to have direct protection when an unexpected attack leaves no time to negotiate.”
4. **career_continuity:** “I want to build a protective skill that can safeguard the people involved in {declared_goal}.”
5. **prepare_future_route:** “I want to identify which defensive Soldier techniques could make that protection more reliable.”

#### Scoundrel → Soldier · Q1 #1

**Q1:** “I want to become a reliable shot in a straight fight, not just when I've managed to find an advantage first.”

1. **develop_core:** “I want to practice maintaining accuracy when I have no surprise advantage.”
2. **field_application:** “I want to hold my own in our next controlled firefight exercise without relying on a perfect setup.”
3. **benefit_others:** “I want to provide reliable fire when my companions cannot afford missed opportunities.”
4. **career_continuity:** “I want to strengthen my fighting readiness for the work required by {declared_goal}.”
5. **prepare_future_route:** “I want to determine which marksmanship training could improve my performance in a straight fight.”

#### Scoundrel → Soldier · Q1 #2

**Q1:** “I want to learn how to handle myself in a close fight, so being cornered doesn't mean I've run out of options.”

1. **develop_core:** “I want to practice defending myself in tight quarters without room to run.”
2. **field_application:** “I want to test a controlled close-combat response before a real confrontation forces it on me.”
3. **benefit_others:** “I want to help a companion who has been cornered rather than leave them to fight alone.”
4. **career_continuity:** “I want to prepare for close threats that could interrupt {declared_goal}.”
5. **prepare_future_route:** “I want to identify which melee or grappling techniques might be worth learning in depth.”

#### Scoundrel → Soldier · Q1 #3

**Q1:** “I want armor and disciplined training that help me stay in the fight when there isn't a clean way out.”

1. **develop_core:** “I want to learn how to use armor without letting it interfere with my movement.”
2. **field_application:** “I want to endure the next dangerous encounter long enough to act instead of always retreating.”
3. **benefit_others:** “I want to give my companions a dependable partner when there is no safe exit.”
4. **career_continuity:** “I want to improve my ability to persist through the risks of {declared_goal}.”
5. **prepare_future_route:** “I want to learn which protective techniques become available through further Soldier training.”

#### Scoundrel → Soldier · Q1 #4

**Q1:** “I want to learn to keep enemies pinned down and cover my companions while they move to safety.”

1. **develop_core:** “I want to practice covering a moving target without endangering the people beside me.”
2. **field_application:** “I want to help the group withdraw across exposed ground during our next tactical exercise.”
3. **benefit_others:** “I want a companion who is pinned down to have a safe opening to move.”
4. **career_continuity:** “I want to provide reliable covering fire during the next stage of {declared_goal}.”
5. **prepare_future_route:** “I want to investigate which fire-control and teamwork options could improve my support.”

#### Scoundrel → Soldier · Q1 #5

**Q1:** “I want to learn to handle explosives and break through obstacles when clever workarounds aren't enough.”

1. **develop_core:** “I want to learn the safety principles of handling explosive devices before trying to use them.”
2. **field_application:** “I want to evaluate whether a controlled demolition is appropriate for our next blocked passage.”
3. **benefit_others:** “I want the group to have a safe option when a solid barrier traps us.”
4. **career_continuity:** “I want to prepare an obstacle-clearing method relevant to {declared_goal}.”
5. **prepare_future_route:** “I want to identify the training and equipment required for more demanding demolition work.”

#### Scout → Soldier · Q1 #1

**Q1:** “I want to become a better marksman, able to stop a threat once I've identified it rather than only warn others that it's there.”

1. **develop_core:** “I want to practice taking a precise shot after positively identifying a target.”
2. **field_application:** “I want to test my marksmanship on the next controlled range before putting it to use.”
3. **benefit_others:** “I want my companions to benefit from accurate protection once reconnaissance turns into a fight.”
4. **career_continuity:** “I want to develop a dependable marksman's role for work connected with {declared_goal}.”
5. **prepare_future_route:** “I want to find which accuracy-focused weapon techniques I could study next.”

#### Scout → Soldier · Q1 #2

**Q1:** “I want to learn how to set up an effective ambush and use the first moments of a fight to give my companions the advantage.”

1. **develop_core:** “I want to practice choosing an ambush position with a safe withdrawal route.”
2. **field_application:** “I want to plan our next controlled tactical exercise around a well-timed first move.”
3. **benefit_others:** “I want my companions to know their positions before anyone exposes the group.”
4. **career_continuity:** “I want to prepare a deliberate tactical advantage for a challenge tied to {declared_goal}.”
5. **prepare_future_route:** “I want to learn which ambush and initiative techniques would improve a coordinated opening.”

#### Scout → Soldier · Q1 #3

**Q1:** “I want to provide covering fire and help my team move together when staying hidden is no longer possible.”

1. **develop_core:** “I want to practice keeping covering fire clear of my own team's movement.”
2. **field_application:** “I want to help the group advance through the next exposed corridor without leaving anyone isolated.”
3. **benefit_others:** “I want my companions to have space to move when concealment is no longer possible.”
4. **career_continuity:** “I want to provide tactical cover during the next difficult step toward {declared_goal}.”
5. **prepare_future_route:** “I want to identify which suppressive and team-support methods would suit my future training.”

#### Scout → Soldier · Q1 #4

**Q1:** “I want to learn to survive an exchange I can't evade, relying on armor and endurance when retreat isn't an option.”

1. **develop_core:** “I want to practice remaining effective under fire rather than assuming I can always evade it.”
2. **field_application:** “I want to hold a safe position in our next defensive drill when withdrawal is unavailable.”
3. **benefit_others:** “I want my companions to have someone they can rely on during a prolonged exchange.”
4. **career_continuity:** “I want to build the resilience needed for the hazards associated with {declared_goal}.”
5. **prepare_future_route:** “I want to learn which armor and endurance options could strengthen my defenses later.”

#### Scout → Soldier · Q1 #5

**Q1:** “I want to learn how to care for wounded companions in a fight and help them recover enough to keep going.”

1. **develop_core:** “I want to study the steps for giving basic aid without making an injury worse.”
2. **field_application:** “I want to practice stabilizing a simulated casualty during our next field exercise.”
3. **benefit_others:** “I want an injured companion to receive help promptly while more qualified treatment is arranged.”
4. **career_continuity:** “I want to prepare for medical emergencies that could interfere with {declared_goal}.”
5. **prepare_future_route:** “I want to identify which medical skills and training are required for more advanced battlefield care.”

#### Jedi → Scoundrel · Q1 #1

**Q1:** “I want to learn how to pass unnoticed and misdirect attention when a quiet approach would work better than confronting someone directly.”

1. **develop_core:** “I want to practice drawing attention away from a discreet movement without making unnecessary enemies.”
2. **field_application:** “I want to pass through our next guarded checkpoint with minimal notice.”
3. **benefit_others:** “I want my companions to reach their destination without being exposed by my mistakes.”
4. **career_continuity:** “I want to develop a quiet approach for a sensitive step toward {declared_goal}.”
5. **prepare_future_route:** “I want to learn which concealment and misdirection techniques are available for further study.”

#### Jedi → Scoundrel · Q1 #2

**Q1:** “I want to understand computers and electronic security well enough to uncover information and get past systems that would otherwise stop me.”

1. **develop_core:** “I want to practice recognizing the difference between a computer problem and a security restriction.”
2. **field_application:** “I want to investigate the next electronic barrier before anyone tries to force it open.”
3. **benefit_others:** “I want my companions to gain needed information without damaging systems we may depend on.”
4. **career_continuity:** “I want to obtain lawful or justified technical access important to {declared_goal}.”
5. **prepare_future_route:** “I want to identify what computer and security training would let me handle more complex systems.”

#### Jedi → Scoundrel · Q1 #3

**Q1:** “I want to move unpredictably in a fight, take advantage of an opening, and get clear before an enemy can pin me down.”

1. **develop_core:** “I want to practice changing position quickly without losing track of my surroundings.”
2. **field_application:** “I want to test a controlled evasive movement during our next sparring session.”
3. **benefit_others:** “I want my companions to have an opening to withdraw while I draw attention away.”
4. **career_continuity:** “I want to develop mobile combat options for the dangers associated with {declared_goal}.”
5. **prepare_future_route:** “I want to learn which opportunistic fighting techniques require more training before I can use them.”

#### Jedi → Scoundrel · Q1 #4

**Q1:** “I want to become more capable aboard a ship, especially when the situation changes quickly or the crew needs someone who can improvise.”

1. **develop_core:** “I want to learn the roles that keep a ship functioning when a voyage turns difficult.”
2. **field_application:** “I want to take on one useful crew duty during our next journey rather than merely ride along.”
3. **benefit_others:** “I want the crew to have another person ready to respond when a routine system fails.”
4. **career_continuity:** “I want to develop practical shipboard experience that supports {declared_goal}.”
5. **prepare_future_route:** “I want to find which spacer or technical skills would make me more versatile aboard a vessel.”

#### Jedi → Scoundrel · Q1 #5

**Q1:** “I want to get better at making the most of uncertain situations, finding a useful second chance when my first attempt doesn't work.”

1. **develop_core:** “I want to practice reviewing a failed attempt and identifying a genuinely different option.”
2. **field_application:** “I want to solve our next unexpected complication without repeating a method that just failed.”
3. **benefit_others:** “I want my companions to have a fallback plan when our first approach falls apart.”
4. **career_continuity:** “I want to bring flexible problem-solving to a setback on the way to {declared_goal}.”
5. **prepare_future_route:** “I want to learn which Scoundrel techniques could make future second attempts more effective.”

#### Noble → Scoundrel · Q1 #1

**Q1:** “I want to learn how to blend in and maintain a convincing cover when introducing myself openly would close doors.”

1. **develop_core:** “I want to practice maintaining a simple cover story without inventing details I cannot support.”
2. **field_application:** “I want to investigate our next restricted meeting without drawing attention to my usual standing.”
3. **benefit_others:** “I want my companions to avoid unwanted scrutiny while we learn what matters.”
4. **career_continuity:** “I want to use discreet access to gather information relevant to {declared_goal}.”
5. **prepare_future_route:** “I want to identify which disguise and concealment methods would let me operate more convincingly later.”

#### Noble → Scoundrel · Q1 #2

**Q1:** “I want to bypass digital obstacles and uncover information for myself, instead of relying on someone else to access it.”

1. **develop_core:** “I want to practice diagnosing an electronic lock before attempting to bypass it.”
2. **field_application:** “I want to resolve our next digital access problem without resorting immediately to force.”
3. **benefit_others:** “I want the group to recover vital information when a terminal or system blocks the usual route.”
4. **career_continuity:** “I want to learn a technical method useful for the work behind {declared_goal}.”
5. **prepare_future_route:** “I want to determine which computer and security skills are required for more difficult systems.”

#### Noble → Scoundrel · Q1 #3

**Q1:** “I want to learn to stay mobile and exploit openings when a situation turns into a fight I didn't plan for.”

1. **develop_core:** “I want to practice keeping an escape route in mind during a fight I did not choose.”
2. **field_application:** “I want to test a mobile defensive approach in our next training bout.”
3. **benefit_others:** “I want my companions to have time to reposition when an opponent presses too close.”
4. **career_continuity:** “I want to improve my survivability during the risks associated with {declared_goal}.”
5. **prepare_future_route:** “I want to learn which movement and opportunistic combat techniques could expand my options.”

#### Noble → Scoundrel · Q1 #4

**Q1:** “I want to find information, contacts, and workable deals outside the usual channels when the formal approach gets me nowhere.”

1. **develop_core:** “I want to practice comparing an unofficial offer with the risks attached to it.”
2. **field_application:** “I want to find one workable alternate contact during our next stalled negotiation.”
3. **benefit_others:** “I want my companions to have another way forward when formal channels refuse to help.”
4. **career_continuity:** “I want to establish a useful informal lead relevant to {declared_goal}.”
5. **prepare_future_route:** “I want to understand what further information-gathering and networking skills could broaden my reach.”

#### Noble → Scoundrel · Q1 #5

**Q1:** “I want to take a more active role in navigating ships and getting a crew through trouble rather than relying entirely on someone else at the controls.”

1. **develop_core:** “I want to learn how a ship's crew divides its navigation and emergency duties.”
2. **field_application:** “I want to assist with a meaningful task during our next difficult passage.”
3. **benefit_others:** “I want the crew to have more support when conditions at the controls change suddenly.”
4. **career_continuity:** “I want to gain practical flight experience that helps advance {declared_goal}.”
5. **prepare_future_route:** “I want to identify which piloting and shipboard skills I would need for greater responsibility.”

#### Scout → Scoundrel · Q1 #1

**Q1:** “I want to learn how to talk my way past suspicion and maintain a convincing story when simply staying hidden isn't an option.”

1. **develop_core:** “I want to practice maintaining a convincing explanation when someone questions my presence.”
2. **field_application:** “I want to get through our next suspicious encounter without immediately relying on hiding.”
3. **benefit_others:** “I want my companions to have a peaceful way out when a guard starts asking questions.”
4. **career_continuity:** “I want to develop a credible social approach that can assist {declared_goal}.”
5. **prepare_future_route:** “I want to learn which persuasion and deception techniques could make my explanations more reliable.”

#### Scout → Scoundrel · Q1 #2

**Q1:** “I want to learn to defeat computer locks and electronic security when the safest route is blocked by technology instead of terrain.”

1. **develop_core:** “I want to learn how to identify electronic security without damaging an important system.”
2. **field_application:** “I want to assess our next locked terminal for a safe and legitimate access route.”
3. **benefit_others:** “I want the group to find information without sacrificing a working piece of equipment.”
4. **career_continuity:** “I want to overcome a technical obstacle relevant to {declared_goal}.”
5. **prepare_future_route:** “I want to identify which computer-security skills could help with more sophisticated barriers.”

#### Scout → Scoundrel · Q1 #3

**Q1:** “I want to turn movement and positioning into a tactical advantage, striking when an opponent leaves an opening.”

1. **develop_core:** “I want to practice recognizing when movement creates an opening during a fight.”
2. **field_application:** “I want to test a well-timed change of position in our next controlled combat exercise.”
3. **benefit_others:** “I want my companions to have a chance to act while an opponent is distracted.”
4. **career_continuity:** “I want to bring mobile tactics to a confrontation related to {declared_goal}.”
5. **prepare_future_route:** “I want to learn which opportunistic combat methods I could pursue with further training.”

#### Scout → Scoundrel · Q1 #4

**Q1:** “I want to expand my ability to operate aboard starships, handling unfamiliar conditions and acting when a voyage turns dangerous.”

1. **develop_core:** “I want to learn how to respond when a shipboard problem develops far from a safe landing site.”
2. **field_application:** “I want to handle one useful crew responsibility during our next voyage.”
3. **benefit_others:** “I want the crew to have another prepared hand when something goes wrong in transit.”
4. **career_continuity:** “I want to build starship experience for the journeys needed by {declared_goal}.”
5. **prepare_future_route:** “I want to identify which spacer and emergency-handling skills would improve my usefulness aboard ship.”

#### Scout → Scoundrel · Q1 #5

**Q1:** “I want to improve my knack for adapting when a plan fails, finding another chance to make a difficult action succeed.”

1. **develop_core:** “I want to practice changing plans without losing sight of the immediate objective.”
2. **field_application:** “I want to find an alternative during our next mission when the original method stops working.”
3. **benefit_others:** “I want my companions to know we still have options after a setback.”
4. **career_continuity:** “I want to build adaptability into the work needed for {declared_goal}.”
5. **prepare_future_route:** “I want to learn what additional techniques could make difficult second attempts more reliable.”

#### Soldier → Scoundrel · Q1 #1

**Q1:** “I want to learn how to unsettle an opponent and exploit a mistake, rather than depending on who can hit harder.”

1. **develop_core:** “I want to practice recognizing the moment an opponent exposes a mistake.”
2. **field_application:** “I want to test a controlled feint during our next sparring session rather than meeting force with force.”
3. **benefit_others:** “I want to create an opening that helps a companion avoid a prolonged fight.”
4. **career_continuity:** “I want to develop a tactical advantage for a challenge connected with {declared_goal}.”
5. **prepare_future_route:** “I want to identify which misdirection and opportunistic combat techniques deserve deeper training.”

#### Soldier → Scoundrel · Q1 #2

**Q1:** “I want to stay quick and difficult to pin down, choosing when to strike and when to get clear.”

1. **develop_core:** “I want to practice moving away from a threat while keeping track of my surroundings.”
2. **field_application:** “I want to use an alternate position during our next combat drill instead of staying pinned down.”
3. **benefit_others:** “I want my companions to have room to escape when an enemy concentrates on me.”
4. **career_continuity:** “I want to improve mobility during a difficult stage of {declared_goal}.”
5. **prepare_future_route:** “I want to learn which evasive and movement-based combat techniques could increase my options.”

#### Soldier → Scoundrel · Q1 #3

**Q1:** “I want to understand computers and security systems so that a locked door or electronic defense doesn't always require force.”

1. **develop_core:** “I want to learn how to assess a locked system before deciding whether it needs technical access.”
2. **field_application:** “I want to overcome our next electronic obstacle without forcing a physical breach.”
3. **benefit_others:** “I want my companions to get past a security barrier without unnecessary damage or delay.”
4. **career_continuity:** “I want to develop technical alternatives for obstacles along the way to {declared_goal}.”
5. **prepare_future_route:** “I want to identify which computer and security skills I should develop for more complex devices.”

#### Soldier → Scoundrel · Q1 #4

**Q1:** “I want to become better at bluffing, bargaining, and changing someone's mind when I can avoid a fight altogether.”

1. **develop_core:** “I want to practice turning a tense demand into a conversation with choices.”
2. **field_application:** “I want to bargain our way through the next standoff before weapons come out.”
3. **benefit_others:** “I want my companions to have a safer solution when a confrontation can still be talked down.”
4. **career_continuity:** “I want to use negotiation to advance {declared_goal} with less unnecessary fighting.”
5. **prepare_future_route:** “I want to learn which social and persuasive techniques could make my efforts more dependable.”

#### Soldier → Scoundrel · Q1 #5

**Q1:** “I want to broaden my abilities aboard ships, including handling weapons and other problems in unfamiliar conditions.”

1. **develop_core:** “I want to learn the emergency procedures for common shipboard problems.”
2. **field_application:** “I want to assist with shipboard weapons or systems during our next training voyage if assigned and qualified.”
3. **benefit_others:** “I want the crew to have another prepared helper when an unfamiliar system demands attention.”
4. **career_continuity:** “I want to broaden my shipboard role for the work connected with {declared_goal}.”
5. **prepare_future_route:** “I want to identify which shipboard combat or technical specialties would require further training.”

### Q1-undecided truthful fallback banks

If Q1 was neutral, do not pretend it expressed a specialization. Use these five general destination-class milestones.

#### Jedi (Q1 undecided)

1. **develop_core:** “I want to understand the foundations of Jedi training before deciding which techniques to pursue.”
2. **field_application:** “I want to approach our next difficult problem with greater care and see where new instruction might help.”
3. **benefit_others:** “I want to learn how to be a steadier source of help when someone faces danger.”
4. **career_continuity:** “I want to discover whether Jedi training offers a responsible next step toward {declared_goal}.”
5. **prepare_future_route:** “I want to clarify which Jedi abilities would require additional training before committing to them.”

#### Noble (Q1 undecided)

1. **develop_core:** “I want to learn how Noble training could help me contribute to a group before specializing.”
2. **field_application:** “I want to take responsibility for one small part of our next group assignment and learn from it.”
3. **benefit_others:** “I want to find a practical way to make the people around me better prepared.”
4. **career_continuity:** “I want to examine how this new training might support {declared_goal} before choosing a specialty.”
5. **prepare_future_route:** “I want to explore the available leadership, influence, and knowledge paths before choosing more training.”

#### Scout (Q1 undecided)

1. **develop_core:** “I want to practice basic field awareness before deciding on a specific Scout specialty.”
2. **field_application:** “I want to investigate a new route or location and learn what the field actually demands.”
3. **benefit_others:** “I want to help the group avoid one preventable hazard on our next journey.”
4. **career_continuity:** “I want to see how practical field training could advance {declared_goal}.”
5. **prepare_future_route:** “I want to explore tracking, mobility, and survival training before settling on a long-term focus.”

#### Soldier (Q1 undecided)

1. **develop_core:** “I want to learn the foundations of disciplined combat training before choosing a particular technique.”
2. **field_application:** “I want to take part in a controlled exercise that reveals which skills I most need to improve.”
3. **benefit_others:** “I want to be more dependable when a companion needs protection.”
4. **career_continuity:** “I want to see whether Soldier training can help me meet the demands of {declared_goal}.”
5. **prepare_future_route:** “I want to compare the available defensive, weapon, and tactical training before investing further.”

#### Scoundrel (Q1 undecided)

1. **develop_core:** “I want to learn the range of practical Scoundrel methods before picking one to refine.”
2. **field_application:** “I want to handle one unexpected complication with a new approach and see what works.”
3. **benefit_others:** “I want to give our companions an alternative when the obvious solution stops working.”
4. **career_continuity:** “I want to explore whether this flexible training could help me pursue {declared_goal}.”
5. **prepare_future_route:** “I want to investigate technical, social, and mobile methods before choosing a specialty.”

### Missing-goal replacements for career-continuity option

These alternatives replace fourth substantive response if no old career/ambition is explicitly recorded; no invention or career overwrite.

- **Noble:** “I want to discover what kind of work could make good use of these new Noble skills before choosing a career direction.”
- **Jedi:** “I want to explore where Jedi training might lead me without deciding on a lifelong calling today.”
- **Scout:** “I want to find out which journeys or field responsibilities might suit me before committing to a career.”
- **Soldier:** “I want to explore what responsibilities disciplined Soldier training could open to me without choosing a permanent role yet.”
- **Scoundrel:** “I want to see what kind of work these new practical methods could support before claiming a particular livelihood.”

### Q5 editorial acceptance checkpoint

- **status:** EDITORIAL_STRUCTURE_VALIDATED
- **sourceQ1Banks:** 20
- **sourceQ1SubstantiveChoices:** 100
- **authoredMainBanks:** 100
- **authoredMainSubstantiveResponses:** 500
- **mainSubstantiveUniqueText:** 500
- **mainSubstantiveUniqueIDs:** 500
- **allDirectedTransitions:** 20
- **authoredMainBanksPerDestination:** {'jedi': 20, 'noble': 20, 'scoundrel': 20, 'scout': 20, 'soldier': 20}
- **neutralQ1FallbackBanks:** 5
- **neutralQ1FallbackSubstantive:** 25
- **neutralAnswerInstances:** 105
- **missingGoalFallbackTypes:** 5
- **firstPersonMain:** 500
- **firstPersonNeutralQ1:** 25
- **conditionalCareerContinuityTemplates:** 100
- **mechanicalCanonicalCertification:** PENDING
- **goalInterpolationRuntimeValidation:** PENDING
- **semanticDiversityEditorialReview:** PENDING
- **liveSuggestionEngineIntegration:** NOT PERFORMED
- **githubWrites:** 0

**Still open:** Manually review goal-dependent grammar with actual actor goal examples; certify any future mechanically named options with canonical exact IDs; test no-goal, Q1 undecided, Q2 undecided, Q4 undecided, all class transitions, retakes/back navigation, actual Suggestion Engine outputs, and distinct Q5 goal evidence persistence.

### Local change log

- **2026-11-14 — Q5 full first-person response draft:** Authored 500 unique route-specific substantive milestones, 25 Q1-neutral fallbacks, 5 no-declared-goal replacements, and JSON validation report; appended the complete library to the rolling design. No repository writes.


---

## MC-Q6-PASS-A-REFLECTION-LIBRARY-01 — Canonical identity and five-Mentor dynamic reflection

**2026-11-14. Status: AUTHORING COMPLETE (EDITORIAL); NOT LIVE-IMPLEMENTED OR MECHANICALLY CERTIFIED.**

Pass A fills **only** the dynamic assessed-character paragraph between the five already-authored fixed Q6 openings and closings. It does not replace A–E response wording or produce the negative/affirmative Pass B correction library.

**Repository authority:** `data/archetypes.json` at Git blob `76b1ee3aa06dcb29a88ff4ca69bbc8b96cebc3fe` (97 parents / 200 specializations), `scripts/engine/archetype/archetype-ssot-contract.js`, and `scripts/engine/archetype/archetype-registry.js`. The local exact-ID snapshot is in `SWSE_Q6_Archetype_Identity_Index_LOCAL.tsv`; runtime must use the current canonical registry and verify compatibility.

### Input, authority and construction rules

1. **Observed identity:** Read current verified finalized Actor state and the existing suggestion/identity interpretation; resolve any displayed canonical archetype by exact SSOT ID, `kind`, and specialization `parentId`. Do **not** assume the current legacy scorer already scores all 297 SSOT identities. If no safe verified mapping exists, show an uncertainty/no-named-archetype reading.
2. **Evidence:** Include 0–3 truthful owned facts (feats, talents, trained skills, classes and actual feature ownership). Show only observed facts. Each fact needs an item/actor path and canonical identity reference where available. If fewer than three exist, show fewer. Equipment ownership/equipping alone is weaker context, not proof of role.
3. **Future goal:** Explicitly declared long-term career/ambition is a separately quoted and sourced record; if absent, the Mentor says so rather than inventing a career. Q1 future ability desire, Q2 integration choice, Q3 depth, Q4 hypothetical method and Q5 objective do not become observed ownership.
4. **Relationship:** Optionally describe evidence-grounded support/complement/divergence/unknown between observed build and recorded future goal. Never declare eligibility, class ownership, automatic prestige advancement, or goal replacement from this comparison.
5. **Thin evidence:** An unsupported identity/absent evidence uses `unresolved`; no made-up identity. For few verified facts use `thin`/`tentative` instead of asserting a definite archetype. No unapproved numeric confidence thresholds are introduced.
6. **Fixed dialogue:** Preserve Miraj, J0-N1, Ol' Salty, Lead and Breach Q6 opening, closing and A–E branches exactly as already drafted earlier in this rolling file. Only the inserted narrative below is new.
7. **Rendering and provenance:** Freeze the exact shown reading + chosen clauses, actor/revision snapshot, canonical identity key and kind, evidence sources, explicitly declared goal and future-intent quote for later Q6 calibration. Retakes and repeat views must not accumulate self-reinforcing evidence.
8. **Scope:** This is dialogue design only. All recommendation scores, feasibility checks, skill ownership, tag validity and actor writes belong to existing verified system authorities or later implementation and testing.

### Compositional structure

`Fixed Mentor opening → current identity reading (or unresolved) → up to three owned evidence facts → confirmed long-term goal or honest absence → optional exact Q1 future-intent quote → optionally verified relationship → fixed Mentor closing → A–E player self-report.`

**Text library size:** 170 distinct handwritten Mentor-specific clause variants; all 297 canonical identities can be used via exact-ID slot resolution, without creating 1,485 repetitive archetype × Mentor speeches. A complete structural render pass covers every identity for every Mentor at three confidence levels and both text variants. This does NOT establish that the current engine can rank all 297 archetypes for real Actors.

### Complete authored dynamic clause library

#### Miraj — Jedi destination Mentor

**Present identity: canonical parent archetype**

*strong*
> The strongest pattern in your training resembles the {archetype_name} archetype. That tells me something about the path you have walked, not everything about who you are.
> I see a steady direction in what you have learned: a resemblance to the {archetype_name} archetype. You are more than a name for that pattern, of course.

*tentative*
> Part of your training seems to lean toward the {archetype_name} archetype, though I would not say that picture is complete.
> I can see signs of the {archetype_name} archetype in your development. I would like to understand the rest before calling it certain.

*thin*
> There may be an early resemblance to the {archetype_name} archetype, but you have not had enough time to show where it will lead.
> I can make out a hint of the {archetype_name} archetype in your training, though it is only a beginning.

**Present identity: canonical specialization**

*strong*
> Within the {parent_name} archetype, your training most strongly resembles the {archetype_name} specialization. That is an interpretation of what you have learned, not a title I can give you.
> I see the clearest connection to the {archetype_name} specialization, within the {parent_name} archetype. It may describe your current direction without defining your whole future.

*tentative*
> I can see a possible connection to the {archetype_name} specialization within the {parent_name} archetype, though the evidence leaves room for other readings.
> Some of your training calls to mind the {archetype_name} specialization, part of the {parent_name} archetype. I would keep that reading provisional.

*thin*
> Perhaps your first steps have something in common with the {archetype_name} specialization, within the {parent_name} archetype. For now, it is only a possibility.
> There is an early hint of the {archetype_name} specialization in the {parent_name} archetype, but I would not ask you to accept that as a settled description.

**Unresolved identity / no named archetype**
> Your training is still too new or too varied for me to name a particular archetype responsibly. I can tell you what I have observed, and leave the rest open.
> I do not yet have enough reliable evidence to say which archetype best describes your current development. That uncertainty deserves to be said aloud.

**Verified owned evidence fact wrappers**

*one verified fact(s)*
> One thing I can say with confidence is this: {evidence_text} One observation is not a complete portrait.
> There is one clear detail I can point to: {evidence_text} I would not make it carry more meaning than it can.

*two verified fact(s)*
> The details I can actually verify are these: {evidence_text} They suggest a direction without settling it.
> I am drawing that impression from what you have learned: {evidence_text} Both belong in the picture.

*three verified fact(s)*
> Here is what your training actually shows: {evidence_text} Together, those details give this reading some substance.
> I am grounding this in what you have acquired: {evidence_text} Even several clear signs are not the whole of a person.

**Explicit long-term goal or known absence**

*declared*
> You have also told me something about your future: {quoted_goal} I have kept that wish separate from what you have already achieved.
> As for the destination you chose, your words were: {quoted_goal} I would not mistake that hope for something already accomplished.

*unrecorded*
> I have not heard you affirm a particular long-term destination, and I will not choose one on your behalf.
> Your longer-term calling is still yours to decide. I do not have a confirmed choice from you to report.

**Evidence-grounded relation between current pattern and declared goal**

*supports*
> Some of your present training appears to offer a foundation for that ambition, though the road ahead is still your choice.
> There is a useful connection between what you have learned and what you hope to pursue. I would not mistake that for a guarantee.

*complements*
> What you have learned may serve that ambition in a different way than you first expected. The two directions need not compete.
> Your present strengths could complement that hope, even if they do not look like the same path from the outside.

*diverges*
> Your current training seems to point somewhere different from that ambition. I do not see that as a failure, only something worth understanding.
> What your abilities suggest today is not quite the destination you named. Perhaps that difference matters; perhaps it is simply part of your journey.

*unknown*
> I cannot yet tell how directly your present training supports that ambition, and I would rather acknowledge that than assume.
> The connection between what you have learned and what you want remains uncertain to me. We can leave that question open.

**Optional exact Q1 future-interest quotation (never current ownership)**
> In this new training, you also said: {quoted_q1} That is an intention, not evidence that you have mastered it.
> Your answer about what you hope to learn was: {quoted_q1} I have not treated that wish as an ability already gained.

#### J0-N1 — Noble destination Mentor

**Present identity: canonical parent archetype**

*strong*
> Assessment: Your acquired abilities most closely resemble the {archetype_name} archetype, Master. This is a classification of your present development, not an award of status.
> Observation: The most consistent pattern in your training corresponds to the {archetype_name} archetype, Master. I shall refrain from treating the resemblance as a title.

*tentative*
> Preliminary assessment, Master: Your development has some correspondence with the {archetype_name} archetype, but the available evidence is not conclusive.
> I detect a possible {archetype_name} archetype pattern in your current training, Master. My confidence in that interpretation remains limited.

*thin*
> Early observation, Master: A resemblance to the {archetype_name} archetype is possible, but I would be overstating the evidence if I called it established.
> Your present training may be consistent with the {archetype_name} archetype, Master, although our sample of your development is quite small.

**Present identity: canonical specialization**

*strong*
> Assessment: The {archetype_name} specialization within the {parent_name} archetype is the closest present match, Master. That description does not establish formal membership or a class grant.
> Observation: Your demonstrated development is most consistent with the {archetype_name} specialization of the {parent_name} archetype, Master. This remains an interpretive label.

*tentative*
> A provisional match is the {archetype_name} specialization, within the {parent_name} archetype, Master. I would not regard it as definitive.
> The {archetype_name} specialization of the {parent_name} archetype is one plausible reading of your abilities, Master, although alternatives remain.

*thin*
> Initial assessment: I see a slight resemblance to the {archetype_name} specialization within the {parent_name} archetype, Master. It is too early to be certain.
> I can note a possible {archetype_name} specialization pattern within the {parent_name} archetype, Master, but no more than that at present.

**Unresolved identity / no named archetype**
> Insufficient evidence, Master. I cannot responsibly select a present archetype from the information currently verified.
> Assessment deferred, Master. Your completed training does not yet justify a reliable archetype classification.

**Verified owned evidence fact wrappers**

*one verified fact(s)*
> Verified observation: {evidence_text} One fact is not sufficient for a complete identity assessment.
> Current record: {evidence_text} I shall not extrapolate an entire career from that single fact.

*two verified fact(s)*
> The supporting record contains these facts: {evidence_text} I have not treated unacquired options as evidence.
> Two verified observations inform this assessment: {evidence_text} Their interpretation remains open to correction.

*three verified fact(s)*
> The present evidence is as follows: {evidence_text} My conclusion is an interpretation of these facts, not a modification of them.
> I based this on verified training and acquisitions: {evidence_text} I have not counted speculative future choices as completed achievements.

**Explicit long-term goal or known absence**

*declared*
> Your separately recorded ambition is stated in your own words, Master: {quoted_goal} I have not classified that as an accomplished fact.
> As to your future objective, Master, you previously declared: {quoted_goal} That remains a destination rather than a verified achievement.

*unrecorded*
> No independently affirmed long-term career destination is on record, Master. I shall not fabricate one.
> Your long-range career preference remains unconfirmed, Master. No selection will be presumed.

**Evidence-grounded relation between current pattern and declared goal**

*supports*
> The evidence suggests a useful connection to that ambition, Master. I make no claim of current prerequisite eligibility.
> There appears to be a supporting relationship between your acquired training and your declared destination, Master; this is not a completion forecast.

*complements*
> Your present abilities may complement that intended destination by a different route, Master.
> These developed capabilities may assist your stated ambition without making the two identities equivalent, Master.

*diverges*
> Your current development differs from the destination you declared, Master. That is an observation, not an error requiring correction.
> The present evidence and declared future do not yet point in precisely the same direction, Master. I shall not presume which you prefer.

*unknown*
> I cannot certify a meaningful relationship between this reading and the declared ambition from the available facts, Master.
> The connection to your future objective remains uncertain, Master. I recommend against inventing one.

**Optional exact Q1 future-interest quotation (never current ownership)**
> Your interest in the new discipline was expressed as follows, Master: {quoted_q1} That preference is distinct from acquired training.
> You also said, Master: {quoted_q1} I have recorded this as desired development, not demonstrated mastery.

#### Ol' Salty — Scoundrel destination Mentor

**Present identity: canonical parent archetype**

*strong*
> From what ye've actually learned, the {archetype_name} archetype looks like the course ye've been sailin', matey. It's a heading, not a chain round yer ankle.
> If I had to put a name to the trail ye've left in yer training, it'd look most like the {archetype_name} archetype. Doesn't mean the whole voyage is decided.

*tentative*
> I can see some of the {archetype_name} archetype in how ye've trained, but I wouldn't bet me ship on that reading yet.
> Seems ye might be steerin' a little toward the {archetype_name} archetype. Then again, there's more sea ahead than behind.

*thin*
> There might be a touch of the {archetype_name} archetype in yer early training, matey. Too soon to call it a proper heading.
> I've got a hint of the {archetype_name} archetype, and that's all. One small ripple doesn't tell me where the tide's headed.

**Present identity: canonical specialization**

*strong*
> Among the {parent_name} sorts, yer training looks closest to the {archetype_name} specialization. That's me reading of yer skills, not some title I've pinned on ye.
> Ye've got a strong resemblance to the {archetype_name} specialization under the {parent_name} archetype, matey. Still yer choice where to sail next.

*tentative*
> I reckon the {archetype_name} specialization of the {parent_name} archetype might fit what ye've learned. Mind, I could be readin' the chart wrong.
> There's a possible {archetype_name} heading inside the {parent_name} archetype, but I wouldn't put it in ink just yet.

*thin*
> A faint sign of the {archetype_name} specialization, under the {parent_name} archetype, is all I can make out so far.
> Maybe the {archetype_name} specialization of the {parent_name} archetype, matey. Maybe not. We haven't sailed far enough to know.

**Unresolved identity / no named archetype**
> Haven't seen enough of yer training to name a proper archetype, matey. Won't make up a heading just to fill a chart.
> Yer course is still too fresh or too tangled for me to name. Better an honest blank space than a false mark on the map.

**Verified owned evidence fact wrappers**

*one verified fact(s)*
> Here's the bit of yer record I can actually point to: {evidence_text} Not much of a map on its own, is it?
> One solid fact stands out: {evidence_text} I won't dress it up as a whole life story.

*two verified fact(s)*
> What I've got to steer by is this: {evidence_text} It's something, though not the whole chart.
> The bits I can verify are these: {evidence_text} I won't claim ye've done more than that.

*three verified fact(s)*
> I've got more than a hunch to work with: {evidence_text} Still, a sailor can change heading.
> These are the marks actually on yer chart: {evidence_text} That's why I made the guess, matey.

**Explicit long-term goal or known absence**

*declared*
> Ye've also told me where ye hope to wind up: {quoted_goal} Wantin' it and reachin' it aren't the same thing.
> As for the port ye chose for the future, these were yer words: {quoted_goal} I haven't mistaken it for one ye've reached.

*unrecorded*
> Ye haven't settled on a long-term port with me yet, matey. I'm not about to pick one for ye.
> No confirmed destination on yer chart yet. Plenty of time to choose one, if that's what ye want.

**Evidence-grounded relation between current pattern and declared goal**

*supports*
> Some of what ye've learned might help ye reach that port. Doesn't make the voyage certain.
> There's a fair wind between some of yer present training and that future hope, matey. Still more sailing to do.

*complements*
> The skills ye've learned could prove useful on that voyage, even if they came from another course.
> Different heading, useful cargo. What ye know now might still serve that future destination.

*diverges*
> Yer training points a bit away from that port just now. Doesn't mean either heading's wrong.
> The chart of what ye've learned and the port ye named don't quite line up, matey. That's worth talkin' about, not panickin' over.

*unknown*
> Can't tell yet whether this training leads toward that port, and I won't sell ye a false map.
> Haven't enough trustworthy marks to connect the two headings, matey. That part of the chart stays open.

**Optional exact Q1 future-interest quotation (never current ownership)**
> And for what ye want to learn next, ye said: {quoted_q1} That's a wish for new skills, not a claim ye've got 'em already.
> Yer new-class interest was: {quoted_q1} I'll keep that separate from the tricks ye've already learned.

#### Lead — Scout destination Mentor

**Present identity: canonical parent archetype**

*strong*
> Based on the training I can verify, the {archetype_name} archetype is the closest fit. That's a working assessment, not an order.
> The pattern in what you've learned looks a lot like the {archetype_name} archetype. It's what the evidence says today, not what you have to be tomorrow.

*tentative*
> I'm seeing some resemblance to the {archetype_name} archetype, but there are gaps in the picture.
> The {archetype_name} archetype is one plausible reading of your training. I wouldn't call it settled yet.

*thin*
> Maybe a little of the {archetype_name} archetype is starting to show. With this little information, that's a maybe, not a conclusion.
> There's a faint {archetype_name} pattern, but not enough to make a firm call. I'd rather say that now.

**Present identity: canonical specialization**

*strong*
> Of the {parent_name} archetype's specialties, the {archetype_name} specialization is the closest match for your training. A match isn't a qualification or a title.
> Your actual development most resembles the {archetype_name} specialization under {parent_name}. That's an inference; you can correct it.

*tentative*
> I can see a possible {archetype_name} specialization within the {parent_name} archetype. I'm not calling that confirmed.
> You look somewhat like the {archetype_name} specialization of {parent_name}, but another reading could fit.

*thin*
> There's an early hint of the {archetype_name} specialization under {parent_name}. That's thin evidence, so take it as provisional.
> I can barely make out a {archetype_name} specialization pattern within {parent_name}. I'd want more training data before relying on it.

**Unresolved identity / no named archetype**
> Not enough verified training here to say what archetype fits. Making one up wouldn't help either of us.
> Your development doesn't give me a responsible archetype reading yet. Fine. We work with what we actually know.

**Verified owned evidence fact wrappers**

*one verified fact(s)*
> One verified detail stands out: {evidence_text} That's not enough for a complete read.
> Here's the one fact I'm relying on: {evidence_text} Don't read more into it than that.

*two verified fact(s)*
> These are the facts behind my assessment: {evidence_text} They matter, but they aren't the whole story.
> I can verify two things: {evidence_text} That's a start, not a full report.

*three verified fact(s)*
> Here's the basis for the call: {evidence_text} Taken together, they suggest a pattern.
> The record gives me three useful observations: {evidence_text} That's what I'm reading, nothing more.

**Explicit long-term goal or known absence**

*declared*
> You also told me where you want to go: {quoted_goal} That's the objective you named, not something you've already achieved.
> Your stated destination is still on the record: {quoted_goal} I haven't confused the plan with the result.

*unrecorded*
> You haven't confirmed a long-term career destination. I'm leaving that blank until you do.
> No declared final objective yet. I'm not going to pick one for you.

**Evidence-grounded relation between current pattern and declared goal**

*supports*
> Parts of this build seem useful for that objective. It doesn't establish that you qualify for anything yet.
> There's some support for that ambition in your current training. I'd still check the actual requirements before planning around it.

*complements*
> Your current strengths could serve that objective from another angle. That's worth keeping in mind.
> Those skills may complement the direction you want, even if they don't define it.

*diverges*
> Your training points somewhere different from your stated goal right now. That's information, not a mistake.
> I see some distance between the build you've made and the destination you've named. You decide whether that matters.

*unknown*
> I can't tell how those two directions connect from the evidence available. No point pretending I can.
> I don't have enough to establish a relationship between your training and the goal. We can leave it open.

**Optional exact Q1 future-interest quotation (never current ownership)**
> For this new class, you said you want: {quoted_q1} That's the direction you asked to explore, not proof you've learned it.
> Your new training interest was: {quoted_q1} I'm keeping that out of the list of abilities you already own.

#### Breach — Soldier destination Mentor

**Present identity: canonical parent archetype**

*strong*
> All right, from what you've actually trained in, the {archetype_name} archetype looks like your strongest pattern. Pretty solid starting point, but it's not a box you have to stay in.
> You've built up something that resembles the {archetype_name} archetype. I can see why. Doesn't mean you're done growing!

*tentative*
> I'm getting a bit of the {archetype_name} archetype from your training. Could be right, but I won't pretend it's a sure thing.
> Some of what you've learned looks like the {archetype_name} archetype. Not enough to call it definitive, though.

*thin*
> Maybe you're starting toward the {archetype_name} archetype. Maybe you're just getting your feet under you. Too early to be certain!
> I can see a small hint of the {archetype_name} archetype. That's about as far as I'll take the guess for now.

**Present identity: canonical specialization**

*strong*
> Your training looks closest to the {archetype_name} specialization within the {parent_name} archetype. That doesn't mean you've earned some new title. It means I see a pattern!
> Well, here's what stands out: the {archetype_name} specialization under {parent_name} seems to fit your actual training best. You can still take it somewhere else.

*tentative*
> I'm seeing a possible {archetype_name} specialization within {parent_name}. Not calling it certain just yet!
> Part of your training reminds me of the {archetype_name} specialization under the {parent_name} archetype. Might be a good read; might need work.

*thin*
> There's a little hint of the {archetype_name} specialization under {parent_name}, but that's not enough for a confident call.
> Maybe the {archetype_name} specialization within {parent_name} is starting to show up. I'd need to see more before I put weight on that.

**Unresolved identity / no named archetype**
> Not enough confirmed training to put a good archetype name on you. That's all right; no point forcing it.
> Can't make a fair call on your current direction yet. I'd rather admit that than get it wrong and act sure of myself!

**Verified owned evidence fact wrappers**

*one verified fact(s)*
> Here's the one thing I can verify: {evidence_text} That's useful, but it can't tell me everything about you.
> One solid point: {evidence_text} I wouldn't build a whole character assessment on that alone.

*two verified fact(s)*
> I'm basing this on what you actually have: {evidence_text} That's a decent start.
> Two real things stand out: {evidence_text} We can work from those without pretending they're the whole picture.

*three verified fact(s)*
> Here's what you've put together so far: {evidence_text} That's enough to give me a working idea of your training.
> I've got real things to point to: {evidence_text} Not bad! But what they mean to you is still your call.

**Explicit long-term goal or known absence**

*declared*
> And I haven't forgotten what you said you want to work toward: {quoted_goal} That's your goal, not something I'm claiming you've already done.
> You also gave me a future objective in your own words: {quoted_goal} I'm keeping it on the plan, not the list of accomplishments.

*unrecorded*
> You haven't picked a long-term destination yet, and I'm not going to pick it for you. Fair?
> No confirmed career goal from you so far. Nothing wrong with figuring that out later!

**Evidence-grounded relation between current pattern and declared goal**

*supports*
> Some of what you've learned could help you get there. That's encouraging, but we'll still need to check the actual requirements.
> I can see ways your present training supports that goal. Still got work ahead, of course!

*complements*
> Your training could help that goal from the side instead of straight on. Different tools can work together.
> Might not look like the same path, but the abilities you've built could still be useful for that ambition.

*diverges*
> Now, your present training does point somewhere different from your goal. That doesn't mean you've done anything wrong.
> I see two directions here: what you've practiced and what you want. Could be a change coming, or they could work together. That's for you to decide.

*unknown*
> Can't tell how those two pieces fit yet. Not enough information, and I'm not going to fake it.
> I don't have a clear connection between your training and that goal. We'll need more evidence before I call it.

**Optional exact Q1 future-interest quotation (never current ownership)**
> And what you said you want from this new training was: {quoted_q1} That's something you're looking to learn, not something I'm saying you've mastered.
> You said this about your new class: {quoted_q1} Good goal to consider! Still a goal, not a completed lesson.

### Pass A fictional render fixtures

Fixtures demonstrate grammatical interpolation; their owned abilities were invented *solely for unit-style dialogue tests*. They are not statements about a real character or proof the runtime scorer can produce these rankings.

#### Fixture 1: Miraj / Jedi Guardian

Part of your training seems to lean toward the Jedi Guardian archetype, though I would not say that picture is complete.

The details I can actually verify are these: You have the Block talent. You are trained in Use the Force. They suggest a direction without settling it.

You have also told me something about your future: “I want to work toward becoming a Jedi Master.” I have kept that wish separate from what you have already achieved.

In this new training, you also said: “I want to learn techniques that help me protect my companions.” That is an intention, not evidence that you have mastered it.

Some of your present training appears to offer a foundation for that ambition, though the road ahead is still your choice.

#### Fixture 2: J0-N1 / Spymaster

Preliminary assessment, Master: Your development has some correspondence with the Spymaster archetype, but the available evidence is not conclusive.

The supporting record contains these facts: You are trained in Deception. You are trained in Gather Information. I have not treated unacquired options as evidence.

Your separately recorded ambition is stated in your own words, Master: “I want to build a trustworthy network of allies.” I have not classified that as an accomplished fact.

Your interest in the new discipline was expressed as follows, Master: “I want to learn to coordinate people with better judgment.” That preference is distinct from acquired training.

Your present abilities may complement that intended destination by a different route, Master.

#### Fixture 3: Ol' Salty / Smuggler

From what ye've actually learned, the Smuggler archetype looks like the course ye've been sailin', matey. It's a heading, not a chain round yer ankle.

I've got more than a hunch to work with: You are trained in Pilot. You are trained in Mechanics. You have taken the Skill Focus (Pilot) feat. Still, a sailor can change heading.

Ye've also told me where ye hope to wind up: “I want to establish a legitimate transport operation.” Wantin' it and reachin' it aren't the same thing.

And for what ye want to learn next, ye said: “I want to learn better ways to get out of trouble.” That's a wish for new skills, not a claim ye've got 'em already.

The skills ye've learned could prove useful on that voyage, even if they came from another course.

#### Fixture 4: Lead / Salvage Engineer

There's an early hint of the Salvage Engineer specialization under Mechanic. That's thin evidence, so take it as provisional.

One verified detail stands out: You are trained in Mechanics. That's not enough for a complete read.

You haven't confirmed a long-term career destination. I'm leaving that blank until you do.

For this new class, you said you want: “I want to understand how to repair field equipment.” That's the direction you asked to explore, not proof you've learned it.

#### Fixture 5: Breach / Combat Medic

I'm getting a bit of the Combat Medic archetype from your training. Could be right, but I won't pretend it's a sure thing.

I'm basing this on what you actually have: You are trained in Treat Injury. You have taken the Skill Focus (Treat Injury) feat. That's a decent start.

And I haven't forgotten what you said you want to work toward: “I want to keep the people in my squad alive.” That's your goal, not something I'm claiming you've already done.

And what you said you want from this new training was: “I want to learn to protect someone who cannot protect themselves.” That's something you're looking to learn, not something I'm saying you've mastered.

Some of what you've learned could help you get there. That's encouraging, but we'll still need to check the actual requirements.

#### Fixture 6: Miraj / Unresolved

Your training is still too new or too varied for me to name a particular archetype responsibly. I can tell you what I have observed, and leave the rest open.

I have not heard you affirm a particular long-term destination, and I will not choose one on your behalf.

### Pass A validation and remaining gates

| Check | Result |
|---|---|
| Canonical registry identity snapshot | 297 exact IDs (97 parents / 200 specializations) |
| All specialization parent IDs resolve in local snapshot | Pass |
| Five Mentor voices and all clause families | Pass |
| Distinct handwritten dynamic clause variants | 170 |
| Exhaustive render cases including every archetype and Mentor | 8,932 pass |
| Missing slots/undefined required IDs in render fixtures | None |
| Verified runtime actor-level current identity inference for all 297 | **Pending** |
| Actual feat/talent/skill ownership and canonical legality | **Pending** |
| Q6 B/C and D/E first-person correction answer library | **Completed in later Pass B appendix below** |
| GitHub changes | None |

Companion local files: `SWSE_Q6_Pass_A_Reflection_Library_LOCAL.json`, `SWSE_Q6_Archetype_Identity_Index_LOCAL.tsv`, `SWSE_Q6_Pass_A_Validation_LOCAL.json`, `SWSE_Q6_Pass_A_Sample_Readings_LOCAL.md`.

**Important authority note:** The canonical index was transcribed from a read-only GitHub blob and is a frozen design-time reference. The live actor-to-SSOT identity scoring/join is not certified. Any use of the displayed named archetype at runtime must first prove that exact join. The safe fallback is an uncertainty reflection, never a newly invented scorer or freeform unsupported identity claim.

---

## MC-Q6-PASS-B-CORRECTION-LIBRARY-01 — First-person interpretive correction and affirmative identity (2026-11-14)

**Status:** Full authored editorial Pass B library; approved Q6 branch structure preserved; runtime identity join and weighting remain uncertified.

### What stays unchanged

- All fixed Q6 introductions, endings, A–E Mentor response lines and D/E two-stage Mentor prompts for Miraj, J0-N1, Ol’ Salty, Lead, and Breach.
- The agreement bands, A no follow-up, B small targeted nudge, C one to three targeted rejections, D moderate NOT/AM, E comprehensive NOT/AM, with reduced selection count when actor evidence is sparse.
- No bulk pruning or deletion of previously acquired feats, talents, classes, skills, legal eligibility, career goals or historical survey records. The inferred current identity and active explicit long-term ambition remain separate.

### B/C and D/E branch contract

| Branch | NOT stage | AM stage | Meaning |
|---|---|---|---|
| A | None | None | Confirm reading without adding more independent evidence. |
| B | One or two corrections to displayed interpretations | None | Narrow correction only. |
| C | One to three corrections to displayed interpretations | None | Soft, focused uncertainty/realignment. |
| D | Normally three to five displayed interpretations, fewer if not available | Mandatory distinct affirmative stage | Moderate identity reinterpretation, no mutation of actor facts. |
| E | Normally five to seven displayed interpretations, fewer if not available | Mandatory distinct affirmative stage | Comprehensive inferred-identity correction with genuine affirmative self-description. |

All negative selections are **about interpretive claims the player was shown**. A displayed observation such as “You have the Block talent” is a fact, not a rejectable inferential claim. The player may challenge **the inference drawn from that fact**, never silently delete it. The UI must keep claim IDs and source fact IDs behind the scenes, while showing only these first-person selectable statements.

### Negative interpretation choice bank — anchored to displayed claims

**`archetype_parent`** — only if that claim kind was shown in the saved reading.

- “I can see why my training reminded you of the {archetype_name} path, but I don't believe that is what defines me.”
- “I understand the comparison to {archetype_name}. I just don't recognize myself in that interpretation.”

**`archetype_specialization`** — only if that claim kind was shown in the saved reading.

- “I see how my abilities may resemble part of the {specialization_name} specialization, but I don't identify with it.”
- “I can see the resemblance to {specialization_name}, but you have drawn a conclusion about me that I wouldn't draw.”

**`role_inference`** — only if that claim kind was shown in the saved reading.

- “I can take on the {role_phrase} role when needed, but I don't see it as what defines me.”
- “I don't think the {role_phrase} role captures how I usually choose to contribute.”

**`method_preference`** — only if that claim kind was shown in the saved reading.

- “I may use {method_phrase}, but I don't think it is the way I prefer to handle every problem.”
- “I recognize that method in some of my choices, but you've given it more importance than I would.”

**`mechanical_theme_identity`** — only if that claim kind was shown in the saved reading.

- “I know my training includes {theme_phrase}, but those abilities aren't the whole story of who I am.”
- “I know those abilities are part of my training. I don't agree with what you've inferred from them.”

**`past_to_present_trend`** — only if that claim kind was shown in the saved reading.

- “I may once have leaned toward {trend_phrase}, but I don't believe that describes the choices I'm making now.”
- “I understand why you saw a continuing pattern, but I've been looking at my development differently.”

**`goal_relationship`** — only if that claim kind was shown in the saved reading.

- “I haven't abandoned the goal I told you about, but I disagree with how you think my training relates to it.”
- “I know my ambition is still mine to decide. I don't see the connection to my present training the way you do.”

**`motivation_inference`** — only if that claim kind was shown in the saved reading.

- “I can see why you connected my training to {motivation_phrase}, but I haven't said that was my reason.”
- “I don't want my training to be mistaken for a motive I haven't claimed.”

**`unresolved_reading_disagreement`** — only if that claim kind was shown in the saved reading.

- “I don't think you've learned enough about me to say where my path is headed.”
- “I don't feel that your description leaves enough room for what I'm still deciding.”

**`overconfidence`** — only if that claim kind was shown in the saved reading.

- “I think you're more certain about my direction than the evidence really supports.”
- “I haven't made up my mind enough for that reading to be as definite as you make it sound.”

### Canonical self-identification choices — 97 parents and 200 specializations

Each row below is an *optional candidate*, never a guaranteed player-facing option. Show only a short, relevant, evidence-grounded and/or affirmatively player-identified shortlist. Some names encode species, faction, culture, status or historical experience and require explicit plausibility/confirmation checks. No row proves possession of the role, prerequisite qualification or prestige class ownership. Negative identity wording is offered ONLY when the Mentor actually made the corresponding identity inference.

| Canonical ID | Kind / parent | What I am NOT (when actually inferred) | What I AM (candidate affirmative) |
|---|---|---|---|
| `smuggler` | parent | “I can see how my training suggested the Smuggler path, but I don't consider that my defining role.” | “I see myself taking the Smuggler path. I want to get people and cargo where they need to go when the easy routes are closed.” |
| `fringer` | parent | “I can see how my training suggested the Fringer path, but I don't consider that my defining role.” | “I see myself taking the Fringer path. I want to find my own way beyond the comfortable parts of the galaxy.” |
| `free_trader` | parent | “I can see how my training suggested the Free Trader path, but I don't consider that my defining role.” | “I see myself taking the Free Trader path. I want to build opportunities by connecting people who need one another.” |
| `pirate` | parent | “I can see how my training suggested the Pirate path, but I don't consider that my defining role.” | “I see myself taking the Pirate path. I want to choose my own course and stand by the crew that trusts me.” |
| `scavenger` | parent | “I can see how my training suggested the Scavenger path, but I don't consider that my defining role.” | “I see myself taking the Scavenger path. I want to learn the value of what others leave behind.” |
| `gambler` | parent | “I can see how my training suggested the Gambler path, but I don't consider that my defining role.” | “I see myself taking the Gambler path. I want to weigh a risk and know when to take it.” |
| `con_artist` | parent | “I can see how my training suggested the Con Artist path, but I don't consider that my defining role.” | “I see myself taking the Con Artist path. I want to read a person's expectations before I commit to a move.” |
| `fixer` | parent | “I can see how my training suggested the Fixer path, but I don't consider that my defining role.” | “I see myself taking the Fixer path. I want to connect a problem with the right person or resource.” |
| `information_broker` | parent | “I can see how my training suggested the Information Broker path, but I don't consider that my defining role.” | “I see myself taking the Information Broker path. I want to find reliable information and understand who needs it.” |
| `gunslinger` | parent | “I can see how my training suggested the Gunslinger path, but I don't consider that my defining role.” | “I see myself taking the Gunslinger path. I want to stay composed when a quick, precise shot matters.” |
| `bounty_hunter` | parent | “I can see how my training suggested the Bounty Hunter path, but I don't consider that my defining role.” | “I see myself taking the Bounty Hunter path. I want to find the person I'm looking for and bring the pursuit to a conclusion.” |
| `crime_boss` | parent | “I can see how my training suggested the Crime Boss path, but I don't consider that my defining role.” | “I see myself taking the Crime Boss path. I want to build and manage a network of influence.” |
| `enforcer` | parent | “I can see how my training suggested the Enforcer path, but I don't consider that my defining role.” | “I see myself taking the Enforcer path. I want to make my presence count when boundaries are tested.” |
| `courier` | parent | “I can see how my training suggested the Courier path, but I don't consider that my defining role.” | “I see myself taking the Courier path. I want to deliver what I'm entrusted with despite the obstacles.” |
| `cantina_proprietor` | parent | “I can see how my training suggested the Cantina Proprietor path, but I don't consider that my defining role.” | “I see myself taking the Cantina Proprietor path. I want to create a place where people and opportunities meet.” |
| `sector_ranger` | parent | “I can see how my training suggested the Sector Ranger path, but I don't consider that my defining role.” | “I see myself taking the Sector Ranger path. I want to protect people across difficult and distant territory.” |
| `frontier_marshal` | parent | “I can see how my training suggested the Frontier Marshal path, but I don't consider that my defining role.” | “I see myself taking the Frontier Marshal path. I want to keep order where help may be a long way off.” |
| `investigator` | parent | “I can see how my training suggested the Investigator path, but I don't consider that my defining role.” | “I see myself taking the Investigator path. I want to follow the evidence instead of the convenient explanation.” |
| `spy` | parent | “I can see how my training suggested the Spy path, but I don't consider that my defining role.” | “I see myself taking the Spy path. I want to learn what matters without drawing attention to myself.” |
| `spymaster` | parent | “I can see how my training suggested the Spymaster path, but I don't consider that my defining role.” | “I see myself taking the Spymaster path. I want to understand the bigger picture and coordinate reliable intelligence.” |
| `slicer` | parent | “I can see how my training suggested the Slicer path, but I don't consider that my defining role.” | “I see myself taking the Slicer path. I want to understand systems well enough to uncover what they conceal.” |
| `security_specialist` | parent | “I can see how my training suggested the Security Specialist path, but I don't consider that my defining role.” | “I see myself taking the Security Specialist path. I want to anticipate threats before someone pays the price.” |
| `bodyguard` | parent | “I can see how my training suggested the Bodyguard path, but I don't consider that my defining role.” | “I see myself taking the Bodyguard path. I want to keep others safe when danger is close.” |
| `assassin` | parent | “I can see how my training suggested the Assassin path, but I don't consider that my defining role.” | “I see myself taking the Assassin path. I want to work with patience, discretion, and careful timing.” |
| `force_hunter` | parent | “I can see how my training suggested the Force Hunter path, but I don't consider that my defining role.” | “I see myself taking the Force Hunter path. I want to study extraordinary threats without relying on assumptions.” |
| `journalist` | parent | “I can see how my training suggested the Journalist path, but I don't consider that my defining role.” | “I see myself taking the Journalist path. I want to find a defensible account of what actually happened.” |
| `mercenary` | parent | “I can see how my training suggested the Mercenary path, but I don't consider that my defining role.” | “I see myself taking the Mercenary path. I want to do difficult work competently while choosing my own commitments.” |
| `commando` | parent | “I can see how my training suggested the Commando path, but I don't consider that my defining role.” | “I see myself taking the Commando path. I want to approach difficult missions with preparation and discipline.” |
| `veteran` | parent | “I can see how my training suggested the Veteran path, but I don't consider that my defining role.” | “I see myself taking the Veteran path. I want to turn hard-earned experience into better judgment.” |
| `warrior` | parent | “I can see how my training suggested the Warrior path, but I don't consider that my defining role.” | “I see myself taking the Warrior path. I want to meet danger with skill and a reason to stand my ground.” |
| `sniper` | parent | “I can see how my training suggested the Sniper path, but I don't consider that my defining role.” | “I see myself taking the Sniper path. I want to watch carefully and act decisively when a precise shot is needed.” |
| `combat_medic` | parent | “I can see how my training suggested the Combat Medic path, but I don't consider that my defining role.” | “I see myself taking the Combat Medic path. I want to keep people alive when help is difficult to reach.” |
| `combat_engineer` | parent | “I can see how my training suggested the Combat Engineer path, but I don't consider that my defining role.” | “I see myself taking the Combat Engineer path. I want to solve urgent technical problems under pressure.” |
| `saboteur` | parent | “I can see how my training suggested the Saboteur path, but I don't consider that my defining role.” | “I see myself taking the Saboteur path. I want to disable a threat by understanding what holds it together.” |
| `field_commander` | parent | “I can see how my training suggested the Field Commander path, but I don't consider that my defining role.” | “I see myself taking the Field Commander path. I want to help a group act together when the situation gets difficult.” |
| `naval_officer` | parent | “I can see how my training suggested the Naval Officer path, but I don't consider that my defining role.” | “I see myself taking the Naval Officer path. I want to keep a crew and its vessel working toward a shared objective.” |
| `fleet_strategist` | parent | “I can see how my training suggested the Fleet Strategist path, but I don't consider that my defining role.” | “I see myself taking the Fleet Strategist path. I want to see how separate vessels and decisions fit into one larger operation.” |
| `starship_gunner` | parent | “I can see how my training suggested the Starship Gunner path, but I don't consider that my defining role.” | “I see myself taking the Starship Gunner path. I want to make each opportunity to protect a ship count.” |
| `quartermaster` | parent | “I can see how my training suggested the Quartermaster path, but I don't consider that my defining role.” | “I see myself taking the Quartermaster path. I want to make sure the right supplies reach the people who need them.” |
| `partisan` | parent | “I can see how my training suggested the Partisan path, but I don't consider that my defining role.” | “I see myself taking the Partisan path. I want to keep a cause alive under difficult conditions.” |
| `resistance_leader` | parent | “I can see how my training suggested the Resistance Leader path, but I don't consider that my defining role.” | “I see myself taking the Resistance Leader path. I want to bring people together around a cause they choose to defend.” |
| `pilot` | parent | “I can see how my training suggested the Pilot path, but I don't consider that my defining role.” | “I see myself taking the Pilot path. I want to keep control of a craft when the journey becomes dangerous.” |
| `ship_captain` | parent | “I can see how my training suggested the Ship Captain path, but I don't consider that my defining role.” | “I see myself taking the Ship Captain path. I want to take responsibility for a vessel and the people aboard it.” |
| `astrogator` | parent | “I can see how my training suggested the Astrogator path, but I don't consider that my defining role.” | “I see myself taking the Astrogator path. I want to understand the routes that connect distant worlds.” |
| `racer` | parent | “I can see how my training suggested the Racer path, but I don't consider that my defining role.” | “I see myself taking the Racer path. I want to improve my timing, nerve, and control at speed.” |
| `mechanic` | parent | “I can see how my training suggested the Mechanic path, but I don't consider that my defining role.” | “I see myself taking the Mechanic path. I want to understand how things work and keep them working.” |
| `outlaw_tech` | parent | “I can see how my training suggested the Outlaw Tech path, but I don't consider that my defining role.” | “I see myself taking the Outlaw Tech path. I want to find workable technical answers outside familiar systems.” |
| `armorer` | parent | “I can see how my training suggested the Armorer path, but I don't consider that my defining role.” | “I see myself taking the Armorer path. I want to make protective equipment dependable for the people using it.” |
| `droidsmith` | parent | “I can see how my training suggested the Droidsmith path, but I don't consider that my defining role.” | “I see myself taking the Droidsmith path. I want to understand and support the droids people depend on.” |
| `inventor` | parent | “I can see how my training suggested the Inventor path, but I don't consider that my defining role.” | “I see myself taking the Inventor path. I want to turn a useful idea into something that actually works.” |
| `cyberneticist` | parent | “I can see how my training suggested the Cyberneticist path, but I don't consider that my defining role.” | “I see myself taking the Cyberneticist path. I want to understand the meeting point between living beings and machines.” |
| `electronic_warfare_specialist` | parent | “I can see how my training suggested the Electronic Warfare Specialist path, but I don't consider that my defining role.” | “I see myself taking the Electronic Warfare Specialist path. I want to understand and contest the flow of electronic information.” |
| `shipwright` | parent | “I can see how my training suggested the Shipwright path, but I don't consider that my defining role.” | “I see myself taking the Shipwright path. I want to build and repair craft that can survive their journeys.” |
| `scientist` | parent | “I can see how my training suggested the Scientist path, but I don't consider that my defining role.” | “I see myself taking the Scientist path. I want to ask better questions and test my answers against evidence.” |
| `doctor` | parent | “I can see how my training suggested the Doctor path, but I don't consider that my defining role.” | “I see myself taking the Doctor path. I want to care for people with judgment, knowledge, and patience.” |
| `disaster_responder` | parent | “I can see how my training suggested the Disaster Responder path, but I don't consider that my defining role.” | “I see myself taking the Disaster Responder path. I want to help people through a crisis before it grows worse.” |
| `explorer` | parent | “I can see how my training suggested the Explorer path, but I don't consider that my defining role.” | “I see myself taking the Explorer path. I want to find out what lies beyond the routes I already know.” |
| `pathfinder` | parent | “I can see how my training suggested the Pathfinder path, but I don't consider that my defining role.” | “I see myself taking the Pathfinder path. I want to find a safe way forward when the route is uncertain.” |
| `survivalist` | parent | “I can see how my training suggested the Survivalist path, but I don't consider that my defining role.” | “I see myself taking the Survivalist path. I want to endure difficult environments through preparation and resourcefulness.” |
| `search_and_rescue_specialist` | parent | “I can see how my training suggested the Search-and-Rescue Specialist path, but I don't consider that my defining role.” | “I see myself taking the Search-and-Rescue Specialist path. I want to reach people in trouble and help them return safely.” |
| `first_contact_specialist` | parent | “I can see how my training suggested the First-Contact Specialist path, but I don't consider that my defining role.” | “I see myself taking the First-Contact Specialist path. I want to meet unfamiliar people with care and an open mind.” |
| `galactic_archaeologist` | parent | “I can see how my training suggested the Galactic Archaeologist path, but I don't consider that my defining role.” | “I see myself taking the Galactic Archaeologist path. I want to learn from the histories and places others have forgotten.” |
| `prospector` | parent | “I can see how my training suggested the Prospector path, but I don't consider that my defining role.” | “I see myself taking the Prospector path. I want to notice possibilities in places others pass by.” |
| `naturalist` | parent | “I can see how my training suggested the Naturalist path, but I don't consider that my defining role.” | “I see myself taking the Naturalist path. I want to understand living environments before deciding how to act in them.” |
| `colony_pioneer` | parent | “I can see how my training suggested the Colony Pioneer path, but I don't consider that my defining role.” | “I see myself taking the Colony Pioneer path. I want to help a new settlement become a place people can rely on.” |
| `beast_hunter` | parent | “I can see how my training suggested the Beast Hunter path, but I don't consider that my defining role.” | “I see myself taking the Beast Hunter path. I want to understand dangerous creatures before facing them.” |
| `beast_handler` | parent | “I can see how my training suggested the Beast Handler path, but I don't consider that my defining role.” | “I see myself taking the Beast Handler path. I want to work with living creatures through patience and attention.” |
| `beast_rider` | parent | “I can see how my training suggested the Beast Rider path, but I don't consider that my defining role.” | “I see myself taking the Beast Rider path. I want to build trust and coordination with a living mount.” |
| `activist` | parent | “I can see how my training suggested the Activist path, but I don't consider that my defining role.” | “I see myself taking the Activist path. I want to organize people around a change they believe is necessary.” |
| `aristocrat` | parent | “I can see how my training suggested the Aristocrat path, but I don't consider that my defining role.” | “I see myself taking the Aristocrat path. I want to understand the responsibilities and influence that come with status.” |
| `bureaucrat` | parent | “I can see how my training suggested the Bureaucrat path, but I don't consider that my defining role.” | “I see myself taking the Bureaucrat path. I want to navigate complicated institutions without losing sight of people.” |
| `celebrity` | parent | “I can see how my training suggested the Celebrity path, but I don't consider that my defining role.” | “I see myself taking the Celebrity path. I want to use public attention deliberately rather than be ruled by it.” |
| `community_leader` | parent | “I can see how my training suggested the Community Leader path, but I don't consider that my defining role.” | “I see myself taking the Community Leader path. I want to earn trust and help my community make sound decisions.” |
| `corporate_operator` | parent | “I can see how my training suggested the Corporate Operator path, but I don't consider that my defining role.” | “I see myself taking the Corporate Operator path. I want to understand how organizations make choices and use resources.” |
| `courtier` | parent | “I can see how my training suggested the Courtier path, but I don't consider that my defining role.” | “I see myself taking the Courtier path. I want to read a room and choose words carefully when influence matters.” |
| `diplomat` | parent | “I can see how my training suggested the Diplomat path, but I don't consider that my defining role.” | “I see myself taking the Diplomat path. I want to find ways for people in conflict to reach an understanding.” |
| `educator` | parent | “I can see how my training suggested the Educator path, but I don't consider that my defining role.” | “I see myself taking the Educator path. I want to help someone else learn something that changes what they can do.” |
| `entertainer` | parent | “I can see how my training suggested the Entertainer path, but I don't consider that my defining role.” | “I see myself taking the Entertainer path. I want to reach people through an experience they will remember.” |
| `merchant_prince` | parent | “I can see how my training suggested the Merchant Prince path, but I don't consider that my defining role.” | “I see myself taking the Merchant Prince path. I want to understand trade and build relationships that last.” |
| `planetary_governor` | parent | “I can see how my training suggested the Planetary Governor path, but I don't consider that my defining role.” | “I see myself taking the Planetary Governor path. I want to make decisions with an entire community's needs in mind.” |
| `propagandist` | parent | “I can see how my training suggested the Propagandist path, but I don't consider that my defining role.” | “I see myself taking the Propagandist path. I want to understand how stories shape what people believe.” |
| `revolutionary_statesman` | parent | “I can see how my training suggested the Revolutionary Statesman path, but I don't consider that my defining role.” | “I see myself taking the Revolutionary Statesman path. I want to turn a demand for change into something people can sustain.” |
| `spiritual_leader` | parent | “I can see how my training suggested the Spiritual Leader path, but I don't consider that my defining role.” | “I see myself taking the Spiritual Leader path. I want to help people find meaning and direction in difficult moments.” |
| `warrior_priest` | parent | “I can see how my training suggested the Warrior-Priest path, but I don't consider that my defining role.” | “I see myself taking the Warrior-Priest path. I want to hold conviction and action to the same standard.” |
| `jedi_guardian` | parent | “I can see how my training suggested the Jedi Guardian path, but I don't consider that my defining role.” | “I see myself taking the Jedi Guardian path. I want to protect others through discipline and careful action.” |
| `jedi_consular` | parent | “I can see how my training suggested the Jedi Consular path, but I don't consider that my defining role.” | “I see myself taking the Jedi Consular path. I want to seek understanding and resolve conflict without needless harm.” |
| `jedi_sentinel` | parent | “I can see how my training suggested the Jedi Sentinel path, but I don't consider that my defining role.” | “I see myself taking the Jedi Sentinel path. I want to notice hidden threats and respond with judgment.” |
| `sith_warrior` | parent | “I can see how my training suggested the Sith Warrior path, but I don't consider that my defining role.” | “I see myself taking the Sith Warrior path. I want to pursue strength through demanding martial discipline.” |
| `sith_assassin` | parent | “I can see how my training suggested the Sith Assassin path, but I don't consider that my defining role.” | “I see myself taking the Sith Assassin path. I want to work toward mastery of discretion and precise Force-linked methods.” |
| `sith_sorcerer` | parent | “I can see how my training suggested the Sith Sorcerer path, but I don't consider that my defining role.” | “I see myself taking the Sith Sorcerer path. I want to study difficult mysteries and the power they can reveal.” |
| `sith_manipulator` | parent | “I can see how my training suggested the Sith Manipulator path, but I don't consider that my defining role.” | “I see myself taking the Sith Manipulator path. I want to understand influence and how others exercise it.” |
| `dark_side_cultist` | parent | “I can see how my training suggested the Dark-Side Cultist path, but I don't consider that my defining role.” | “I see myself taking the Dark-Side Cultist path. I want to study a demanding and dangerous dark-side tradition.” |
| `force_exile` | parent | “I can see how my training suggested the Force Exile path, but I don't consider that my defining role.” | “I see myself taking the Force Exile path. I want to make sense of my relationship with the Force outside an ordinary order.” |
| `force_mystic` | parent | “I can see how my training suggested the Force Mystic path, but I don't consider that my defining role.” | “I see myself taking the Force Mystic path. I want to explore what the Force may teach beyond familiar methods.” |
| `force_seer` | parent | “I can see how my training suggested the Force Seer path, but I don't consider that my defining role.” | “I see myself taking the Force Seer path. I want to develop the patience to interpret what I sense.” |
| `force_warrior` | parent | “I can see how my training suggested the Force Warrior path, but I don't consider that my defining role.” | “I see myself taking the Force Warrior path. I want to join Force discipline with practical action.” |
| `force_witch` | parent | “I can see how my training suggested the Force Witch path, but I don't consider that my defining role.” | “I see myself taking the Force Witch path. I want to explore a Force tradition connected to living things and old knowledge.” |
| `blockade_runner` | specialization of `smuggler` | “I see how my training might resemble the Blockade Runner specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Blockade Runner path. I want to get people and cargo where they need to go when the easy routes are closed.” |
| `devaronian_wanderer` | specialization of `fringer` | “I see how my training might resemble the Devaronian Wanderer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Devaronian Wanderer path. I want to find my own way beyond the comfortable parts of the galaxy.” |
| `jawa_droid_peddler` | specialization of `free_trader` | “I see how my training might resemble the Jawa Droid Peddler specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jawa Droid Peddler path. I want to build opportunities by connecting people who need one another.” |
| `herglic_free_trader` | specialization of `free_trader` | “I see how my training might resemble the Herglic Free Trader specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Herglic Free Trader path. I want to build opportunities by connecting people who need one another.” |
| `toydarian_junk_merchant` | specialization of `free_trader` | “I see how my training might resemble the Toydarian Junk Merchant specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Toydarian Junk Merchant path. I want to build opportunities by connecting people who need one another.” |
| `privateer` | specialization of `pirate` | “I see how my training might resemble the Privateer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Privateer path. I want to choose my own course and stand by the crew that trusts me.” |
| `blazing_chain_raider` | specialization of `pirate` | “I see how my training might resemble the Blazing Chain Raider specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Blazing Chain Raider path. I want to choose my own course and stand by the crew that trusts me.” |
| `weequay_pirate_captain` | specialization of `pirate` | “I see how my training might resemble the Weequay Pirate Captain specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Weequay Pirate Captain path. I want to choose my own course and stand by the crew that trusts me.” |
| `zygerrian_corsair` | specialization of `pirate` | “I see how my training might resemble the Zygerrian Corsair specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Zygerrian Corsair path. I want to choose my own course and stand by the crew that trusts me.” |
| `salvager` | specialization of `scavenger` | “I see how my training might resemble the Salvager specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Salvager path. I want to learn the value of what others leave behind.” |
| `scavenger_droid` | specialization of `scavenger` | “I see how my training might resemble the Scavenger Droid specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Scavenger Droid path. I want to learn the value of what others leave behind.” |
| `jawa_sandcrawler_salvager` | specialization of `scavenger` | “I see how my training might resemble the Jawa Sandcrawler Salvager specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jawa Sandcrawler Salvager path. I want to learn the value of what others leave behind.” |
| `squib_salvage_broker` | specialization of `scavenger` | “I see how my training might resemble the Squib Salvage Broker specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Squib Salvage Broker path. I want to learn the value of what others leave behind.” |
| `fence` | specialization of `fixer` | “I see how my training might resemble the Fence specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Fence path. I want to connect a problem with the right person or resource.” |
| `ryn_network_gatherer` | specialization of `information_broker` | “I see how my training might resemble the Ryn Network Gatherer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Ryn Network Gatherer path. I want to find reliable information and understand who needs it.” |
| `skip_tracer` | specialization of `bounty_hunter` | “I see how my training might resemble the Skip Tracer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Skip Tracer path. I want to find the person I'm looking for and bring the pursuit to a conclusion.” |
| `gand_findsman` | specialization of `bounty_hunter` | “I see how my training might resemble the Gand Findsman specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Gand Findsman path. I want to find the person I'm looking for and bring the pursuit to a conclusion.” |
| `ubese_masked_hunter` | specialization of `bounty_hunter` | “I see how my training might resemble the Ubese Masked Hunter specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Ubese Masked Hunter path. I want to find the person I'm looking for and bring the pursuit to a conclusion.” |
| `shistavanen_tracker` | specialization of `bounty_hunter` | “I see how my training might resemble the Shistavanen Tracker specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Shistavanen Tracker path. I want to find the person I'm looking for and bring the pursuit to a conclusion.” |
| `falleen_black_sun_noble` | specialization of `crime_boss` | “I see how my training might resemble the Falleen Black Sun Noble specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Falleen Black Sun Noble path. I want to build and manage a network of influence.” |
| `hutt_kajidic_lorda` | specialization of `crime_boss` | “I see how my training might resemble the Hutt Kajidic Lorda specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Hutt Kajidic Lorda path. I want to build and manage a network of influence.” |
| `syndicate_enforcer` | specialization of `enforcer` | “I see how my training might resemble the Syndicate Enforcer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Syndicate Enforcer path. I want to make my presence count when boundaries are tested.” |
| `trianii_ranger` | specialization of `sector_ranger` | “I see how my training might resemble the Trianii Ranger specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Trianii Ranger path. I want to protect people across difficult and distant territory.” |
| `kiffu_guardian` | specialization of `frontier_marshal` | “I see how my training might resemble the Kiffu Guardian specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Kiffu Guardian path. I want to keep order where help may be a long way off.” |
| `undercover_lawman` | specialization of `investigator` | “I see how my training might resemble the Undercover Lawman specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Undercover Lawman path. I want to follow the evidence instead of the convenient explanation.” |
| `forensic_specialist` | specialization of `investigator` | “I see how my training might resemble the Forensic Specialist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Forensic Specialist path. I want to follow the evidence instead of the convenient explanation.” |
| `imperial_agent` | specialization of `spy` | “I see how my training might resemble the Imperial Agent specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Imperial Agent path. I want to learn what matters without drawing attention to myself.” |
| `rebel_operative` | specialization of `spy` | “I see how my training might resemble the Rebel Operative specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Rebel Operative path. I want to learn what matters without drawing attention to myself.” |
| `counterintelligence_officer` | specialization of `spy` | “I see how my training might resemble the Counterintelligence Officer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Counterintelligence Officer path. I want to learn what matters without drawing attention to myself.” |
| `emperors_hand` | specialization of `spy` | “I see how my training might resemble the Emperor's Hand specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Emperor's Hand path. I want to learn what matters without drawing attention to myself.” |
| `bothan_spynet_operative` | specialization of `spy` | “I see how my training might resemble the Bothan SpyNet Operative specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Bothan SpyNet Operative path. I want to learn what matters without drawing attention to myself.” |
| `clawdite_facechanger_operative` | specialization of `spy` | “I see how my training might resemble the Clawdite Facechanger Operative specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Clawdite Facechanger Operative path. I want to learn what matters without drawing attention to myself.” |
| `defel_shadow_operative` | specialization of `spy` | “I see how my training might resemble the Defel Shadow Operative specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Defel Shadow Operative path. I want to learn what matters without drawing attention to myself.” |
| `handler` | specialization of `spymaster` | “I see how my training might resemble the Handler specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Handler path. I want to understand the bigger picture and coordinate reliable intelligence.” |
| `slicer_droid` | specialization of `slicer` | “I see how my training might resemble the Slicer Droid specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Slicer Droid path. I want to understand systems well enough to uncover what they conceal.” |
| `koorivar_fusilier` | specialization of `security_specialist` | “I see how my training might resemble the Koorivar Fusilier specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Koorivar Fusilier path. I want to anticipate threats before someone pays the price.” |
| `diplomatic_security_agent` | specialization of `bodyguard` | “I see how my training might resemble the Diplomatic Security Agent specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Diplomatic Security Agent path. I want to keep others safe when danger is close.” |
| `imperial_royal_guard` | specialization of `bodyguard` | “I see how my training might resemble the Imperial Royal Guard specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Imperial Royal Guard path. I want to keep others safe when danger is close.” |
| `hapan_royal_guard` | specialization of `bodyguard` | “I see how my training might resemble the Hapan Royal Guard specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Hapan Royal Guard path. I want to keep others safe when danger is close.” |
| `wookiee_life_debt_protector` | specialization of `bodyguard` | “I see how my training might resemble the Wookiee Life Debt Protector specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Wookiee Life Debt Protector path. I want to keep others safe when danger is close.” |
| `gamorrean_clan_guard` | specialization of `bodyguard` | “I see how my training might resemble the Gamorrean Clan Guard specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Gamorrean Clan Guard path. I want to keep others safe when danger is close.” |
| `noghri_honor_bodyguard` | specialization of `bodyguard` | “I see how my training might resemble the Noghri Honor Bodyguard specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Noghri Honor Bodyguard path. I want to keep others safe when danger is close.” |
| `assassin_droid` | specialization of `assassin` | “I see how my training might resemble the Assassin Droid specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Assassin Droid path. I want to work with patience, discretion, and careful timing.” |
| `seyugi_dervish` | specialization of `assassin` | “I see how my training might resemble the Seyugi Dervish specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Seyugi Dervish path. I want to work with patience, discretion, and careful timing.” |
| `imperial_inquisitor` | specialization of `force_hunter` | “I see how my training might resemble the Imperial Inquisitor specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Imperial Inquisitor path. I want to study extraordinary threats without relying on assumptions.” |
| `morgukai_warrior` | specialization of `force_hunter` | “I see how my training might resemble the Morgukai Warrior specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Morgukai Warrior path. I want to study extraordinary threats without relying on assumptions.” |
| `investigative_journalist` | specialization of `journalist` | “I see how my training might resemble the Investigative Journalist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Investigative Journalist path. I want to find a defensible account of what actually happened.” |
| `holonet_reporter` | specialization of `journalist` | “I see how my training might resemble the HoloNet Reporter specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the HoloNet Reporter path. I want to find a defensible account of what actually happened.” |
| `war_correspondent` | specialization of `journalist` | “I see how my training might resemble the War Correspondent specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the War Correspondent path. I want to find a defensible account of what actually happened.” |
| `recon_scout` | specialization of `commando` | “I see how my training might resemble the Recon Scout specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Recon Scout path. I want to approach difficult missions with preparation and discipline.” |
| `breacher` | specialization of `commando` | “I see how my training might resemble the Breacher specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Breacher path. I want to approach difficult missions with preparation and discipline.” |
| `boarding_marine` | specialization of `commando` | “I see how my training might resemble the Boarding Marine specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Boarding Marine path. I want to approach difficult missions with preparation and discipline.” |
| `shock_trooper` | specialization of `commando` | “I see how my training might resemble the Shock Trooper specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Shock Trooper path. I want to approach difficult missions with preparation and discipline.” |
| `noghri_death_commando` | specialization of `commando` | “I see how my training might resemble the Noghri Death Commando specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Noghri Death Commando path. I want to approach difficult missions with preparation and discipline.” |
| `battle_droid_veteran` | specialization of `veteran` | “I see how my training might resemble the Battle Droid Veteran specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Battle Droid Veteran path. I want to turn hard-earned experience into better judgment.” |
| `clone_veteran` | specialization of `veteran` | “I see how my training might resemble the Clone Veteran specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Clone Veteran path. I want to turn hard-earned experience into better judgment.” |
| `mandalorian_warrior` | specialization of `warrior` | “I see how my training might resemble the Mandalorian Warrior specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Mandalorian Warrior path. I want to meet danger with skill and a reason to stand my ground.” |
| `clan_champion` | specialization of `warrior` | “I see how my training might resemble the Clan Champion specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Clan Champion path. I want to meet danger with skill and a reason to stand my ground.” |
| `yuuzhan_vong_warrior` | specialization of `warrior` | “I see how my training might resemble the Yuuzhan Vong Warrior specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Yuuzhan Vong Warrior path. I want to meet danger with skill and a reason to stand my ground.” |
| `tusken_tribal_warrior` | specialization of `warrior` | “I see how my training might resemble the Tusken Tribal Warrior specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Tusken Tribal Warrior path. I want to meet danger with skill and a reason to stand my ground.” |
| `wookiee_clan_champion` | specialization of `warrior` | “I see how my training might resemble the Wookiee Clan Champion specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Wookiee Clan Champion path. I want to meet danger with skill and a reason to stand my ground.” |
| `cathar_clan_warrior` | specialization of `warrior` | “I see how my training might resemble the Cathar Clan Warrior specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Cathar Clan Warrior path. I want to meet danger with skill and a reason to stand my ground.” |
| `nagai_duelist` | specialization of `warrior` | “I see how my training might resemble the Nagai Duelist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Nagai Duelist path. I want to meet danger with skill and a reason to stand my ground.” |
| `massassi_temple_warrior` | specialization of `warrior` | “I see how my training might resemble the Massassi Temple Warrior specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Massassi Temple Warrior path. I want to meet danger with skill and a reason to stand my ground.” |
| `nightbrother` | specialization of `warrior` | “I see how my training might resemble the Nightbrother specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Nightbrother path. I want to meet danger with skill and a reason to stand my ground.” |
| `polis_massan_field_medic` | specialization of `combat_medic` | “I see how my training might resemble the Polis Massan Field Medic specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Polis Massan Field Medic path. I want to keep people alive when help is difficult to reach.” |
| `gungan_organic_tech_defender` | specialization of `combat_engineer` | “I see how my training might resemble the Gungan Organic-Tech Defender specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Gungan Organic-Tech Defender path. I want to solve urgent technical problems under pressure.” |
| `demolitions_specialist` | specialization of `saboteur` | “I see how my training might resemble the Demolitions Specialist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Demolitions Specialist path. I want to disable a threat by understanding what holds it together.” |
| `squad_leader` | specialization of `field_commander` | “I see how my training might resemble the Squad Leader specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Squad Leader path. I want to help a group act together when the situation gets difficult.” |
| `tactical_droid` | specialization of `field_commander` | “I see how my training might resemble the Tactical Droid specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Tactical Droid path. I want to help a group act together when the situation gets difficult.” |
| `droid_commander` | specialization of `field_commander` | “I see how my training might resemble the Droid Commander specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Droid Commander path. I want to help a group act together when the situation gets difficult.” |
| `gamorrean_warlord` | specialization of `field_commander` | “I see how my training might resemble the Gamorrean Warlord specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Gamorrean Warlord path. I want to help a group act together when the situation gets difficult.” |
| `chiss_expansionary_fleet_officer` | specialization of `naval_officer` | “I see how my training might resemble the Chiss Expansionary Fleet Officer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Chiss Expansionary Fleet Officer path. I want to keep a crew and its vessel working toward a shared objective.” |
| `hapan_battle_dragon_officer` | specialization of `naval_officer` | “I see how my training might resemble the Hapan Battle Dragon Officer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Hapan Battle Dragon Officer path. I want to keep a crew and its vessel working toward a shared objective.” |
| `mon_calamari_rebel_admiral` | specialization of `fleet_strategist` | “I see how my training might resemble the Mon Calamari Rebel Admiral specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Mon Calamari Rebel Admiral path. I want to see how separate vessels and decisions fit into one larger operation.” |
| `logistics_officer` | specialization of `quartermaster` | “I see how my training might resemble the Logistics Officer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Logistics Officer path. I want to make sure the right supplies reach the people who need them.” |
| `guerrilla` | specialization of `partisan` | “I see how my training might resemble the Guerrilla specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Guerrilla path. I want to keep a cause alive under difficult conditions.” |
| `rebel_cell_leader` | specialization of `resistance_leader` | “I see how my training might resemble the Rebel Cell Leader specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Rebel Cell Leader path. I want to bring people together around a cause they choose to defend.” |
| `underground_organizer` | specialization of `resistance_leader` | “I see how my training might resemble the Underground Organizer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Underground Organizer path. I want to bring people together around a cause they choose to defend.” |
| `droid_revolutionary` | specialization of `resistance_leader` | “I see how my training might resemble the Droid Revolutionary specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Droid Revolutionary path. I want to bring people together around a cause they choose to defend.” |
| `ace_pilot` | specialization of `pilot` | “I see how my training might resemble the Ace Pilot specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Ace Pilot path. I want to keep control of a craft when the journey becomes dangerous.” |
| `squadron_leader` | specialization of `pilot` | “I see how my training might resemble the Squadron Leader specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Squadron Leader path. I want to keep control of a craft when the journey becomes dangerous.” |
| `test_pilot` | specialization of `pilot` | “I see how my training might resemble the Test Pilot specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Test Pilot path. I want to keep control of a craft when the journey becomes dangerous.” |
| `gunship_pilot` | specialization of `pilot` | “I see how my training might resemble the Gunship Pilot specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Gunship Pilot path. I want to keep control of a craft when the journey becomes dangerous.” |
| `bush_pilot` | specialization of `pilot` | “I see how my training might resemble the Bush Pilot specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Bush Pilot path. I want to keep control of a craft when the journey becomes dangerous.” |
| `pilot_droid` | specialization of `pilot` | “I see how my training might resemble the Pilot Droid specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Pilot Droid path. I want to keep control of a craft when the journey becomes dangerous.” |
| `iktotchi_precognitive_pilot` | specialization of `pilot` | “I see how my training might resemble the Iktotchi Precognitive Pilot specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Iktotchi Precognitive Pilot path. I want to keep control of a craft when the journey becomes dangerous.” |
| `freighter_captain` | specialization of `ship_captain` | “I see how my training might resemble the Freighter Captain specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Freighter Captain path. I want to take responsibility for a vessel and the people aboard it.” |
| `unknown_regions_navigator` | specialization of `astrogator` | “I see how my training might resemble the Unknown Regions Navigator specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Unknown Regions Navigator path. I want to understand the routes that connect distant worlds.” |
| `chiss_sky_walker` | specialization of `astrogator` | “I see how my training might resemble the Chiss Sky-walker specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Chiss Sky-walker path. I want to understand the routes that connect distant worlds.” |
| `givin_astrogator` | specialization of `astrogator` | “I see how my training might resemble the Givin Astrogator specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Givin Astrogator path. I want to understand the routes that connect distant worlds.” |
| `duros_hyperspace_trailblazer` | specialization of `astrogator` | “I see how my training might resemble the Duros Hyperspace Trailblazer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Duros Hyperspace Trailblazer path. I want to understand the routes that connect distant worlds.” |
| `sullustan_rebel_navigator` | specialization of `astrogator` | “I see how my training might resemble the Sullustan Rebel Navigator specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Sullustan Rebel Navigator path. I want to understand the routes that connect distant worlds.” |
| `hotshot_racer` | specialization of `racer` | “I see how my training might resemble the Hotshot Racer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Hotshot Racer path. I want to improve my timing, nerve, and control at speed.” |
| `swoop_racer` | specialization of `racer` | “I see how my training might resemble the Swoop Racer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Swoop Racer path. I want to improve my timing, nerve, and control at speed.” |
| `salvage_engineer` | specialization of `mechanic` | “I see how my training might resemble the Salvage Engineer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Salvage Engineer path. I want to understand how things work and keep them working.” |
| `repair_droid` | specialization of `mechanic` | “I see how my training might resemble the Repair Droid specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Repair Droid path. I want to understand how things work and keep them working.” |
| `gree_technology_keeper` | specialization of `mechanic` | “I see how my training might resemble the Gree Technology Keeper specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Gree Technology Keeper path. I want to understand how things work and keep them working.” |
| `weaponsmith` | specialization of `armorer` | “I see how my training might resemble the Weaponsmith specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Weaponsmith path. I want to make protective equipment dependable for the people using it.” |
| `mandalorian_armorer` | specialization of `armorer` | “I see how my training might resemble the Mandalorian Armorer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Mandalorian Armorer path. I want to make protective equipment dependable for the people using it.” |
| `verpine_hive_engineer` | specialization of `inventor` | “I see how my training might resemble the Verpine Hive Engineer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Verpine Hive Engineer path. I want to turn a useful idea into something that actually works.” |
| `rakatan_force_tech_scion` | specialization of `inventor` | “I see how my training might resemble the Rakatan Force-Tech Scion specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Rakatan Force-Tech Scion path. I want to turn a useful idea into something that actually works.” |
| `sluissi_shipwright` | specialization of `shipwright` | “I see how my training might resemble the Sluissi Shipwright specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Sluissi Shipwright path. I want to build and repair craft that can survive their journeys.” |
| `mon_calamari_fleet_architect` | specialization of `shipwright` | “I see how my training might resemble the Mon Calamari Fleet Architect specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Mon Calamari Fleet Architect path. I want to build and repair craft that can survive their journeys.” |
| `xenobiologist` | specialization of `scientist` | “I see how my training might resemble the Xenobiologist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Xenobiologist path. I want to ask better questions and test my answers against evidence.” |
| `droid_behavioral_specialist` | specialization of `scientist` | “I see how my training might resemble the Droid Behavioral Specialist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Droid Behavioral Specialist path. I want to ask better questions and test my answers against evidence.” |
| `yuuzhan_vong_shaper` | specialization of `scientist` | “I see how my training might resemble the Yuuzhan Vong Shaper specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Yuuzhan Vong Shaper path. I want to ask better questions and test my answers against evidence.” |
| `kaminoan_cloner` | specialization of `scientist` | “I see how my training might resemble the Kaminoan Cloner specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Kaminoan Cloner path. I want to ask better questions and test my answers against evidence.” |
| `kaminoan_geneticist` | specialization of `scientist` | “I see how my training might resemble the Kaminoan Geneticist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Kaminoan Geneticist path. I want to ask better questions and test my answers against evidence.” |
| `arkanian_geneticist` | specialization of `scientist` | “I see how my training might resemble the Arkanian Geneticist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Arkanian Geneticist path. I want to ask better questions and test my answers against evidence.” |
| `ssi_ruuk_entechment_technologist` | specialization of `scientist` | “I see how my training might resemble the Ssi-Ruuk Entechment Technologist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Ssi-Ruuk Entechment Technologist path. I want to ask better questions and test my answers against evidence.” |
| `celegian_philosopher_scientist` | specialization of `scientist` | “I see how my training might resemble the Celegian Philosopher-Scientist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Celegian Philosopher-Scientist path. I want to ask better questions and test my answers against evidence.” |
| `surgeon` | specialization of `doctor` | “I see how my training might resemble the Surgeon specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Surgeon path. I want to care for people with judgment, knowledge, and patience.” |
| `medical_droid` | specialization of `doctor` | “I see how my training might resemble the Medical Droid specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Medical Droid path. I want to care for people with judgment, knowledge, and patience.” |
| `medcorps_healer` | specialization of `doctor` | “I see how my training might resemble the MedCorps Healer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the MedCorps Healer path. I want to care for people with judgment, knowledge, and patience.” |
| `selkath_kolto_steward` | specialization of `doctor` | “I see how my training might resemble the Selkath Kolto Steward specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Selkath Kolto Steward path. I want to care for people with judgment, knowledge, and patience.” |
| `explorcorps_seeker` | specialization of `explorer` | “I see how my training might resemble the ExplorCorps Seeker specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the ExplorCorps Seeker path. I want to find out what lies beyond the routes I already know.” |
| `deep_space_surveyor` | specialization of `explorer` | “I see how my training might resemble the Deep Space Surveyor specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Deep Space Surveyor path. I want to find out what lies beyond the routes I already know.” |
| `wilderness_guide` | specialization of `pathfinder` | “I see how my training might resemble the Wilderness Guide specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Wilderness Guide path. I want to find a safe way forward when the route is uncertain.” |
| `antarian_ranger` | specialization of `pathfinder` | “I see how my training might resemble the Antarian Ranger specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Antarian Ranger path. I want to find a safe way forward when the route is uncertain.” |
| `relic_hunter` | specialization of `galactic_archaeologist` | “I see how my training might resemble the Relic Hunter specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Relic Hunter path. I want to learn from the histories and places others have forgotten.” |
| `academic_archaeologist` | specialization of `galactic_archaeologist` | “I see how my training might resemble the Academic Archaeologist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Academic Archaeologist path. I want to learn from the histories and places others have forgotten.” |
| `xenoarchaeologist` | specialization of `galactic_archaeologist` | “I see how my training might resemble the Xenoarchaeologist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Xenoarchaeologist path. I want to learn from the histories and places others have forgotten.” |
| `archaeological_expedition_leader` | specialization of `galactic_archaeologist` | “I see how my training might resemble the Archaeological Expedition Leader specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Archaeological Expedition Leader path. I want to learn from the histories and places others have forgotten.” |
| `agricorps_steward` | specialization of `naturalist` | “I see how my training might resemble the AgriCorps Steward specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the AgriCorps Steward path. I want to understand living environments before deciding how to act in them.” |
| `trandoshan_jagannath_hunter` | specialization of `beast_hunter` | “I see how my training might resemble the Trandoshan Jagannath Hunter specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Trandoshan Jagannath Hunter path. I want to understand dangerous creatures before facing them.” |
| `togruta_pack_hunter` | specialization of `beast_hunter` | “I see how my training might resemble the Togruta Pack Hunter specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Togruta Pack Hunter path. I want to understand dangerous creatures before facing them.” |
| `rodian_great_hunter` | specialization of `beast_hunter` | “I see how my training might resemble the Rodian Great Hunter specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Rodian Great Hunter path. I want to understand dangerous creatures before facing them.” |
| `barabel_great_hunter` | specialization of `beast_hunter` | “I see how my training might resemble the Barabel Great Hunter specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Barabel Great Hunter path. I want to understand dangerous creatures before facing them.” |
| `tusken_bantha_rider` | specialization of `beast_rider` | “I see how my training might resemble the Tusken Bantha Rider specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Tusken Bantha Rider path. I want to build trust and coordination with a living mount.” |
| `gungan_kaadu_cavalier` | specialization of `beast_rider` | “I see how my training might resemble the Gungan Kaadu Cavalier specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Gungan Kaadu Cavalier path. I want to build trust and coordination with a living mount.” |
| `droid_rights_activist` | specialization of `activist` | “I see how my training might resemble the Droid Rights Activist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Droid Rights Activist path. I want to organize people around a change they believe is necessary.” |
| `zygerrian_abolitionist` | specialization of `activist` | “I see how my training might resemble the Zygerrian Abolitionist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Zygerrian Abolitionist path. I want to organize people around a change they believe is necessary.” |
| `hutt_kajidic_heir` | specialization of `aristocrat` | “I see how my training might resemble the Hutt Kajidic Heir specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Hutt Kajidic Heir path. I want to understand the responsibilities and influence that come with status.” |
| `royal_heir` | specialization of `aristocrat` | “I see how my training might resemble the Royal Heir specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Royal Heir path. I want to understand the responsibilities and influence that come with status.” |
| `hapan_court_noble` | specialization of `aristocrat` | “I see how my training might resemble the Hapan Court Noble specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Hapan Court Noble path. I want to understand the responsibilities and influence that come with status.” |
| `sith_pureblood_scion` | specialization of `aristocrat` | “I see how my training might resemble the Sith Pureblood Scion specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Sith Pureblood Scion path. I want to understand the responsibilities and influence that come with status.” |
| `yuuzhan_vong_intendant` | specialization of `bureaucrat` | “I see how my training might resemble the Yuuzhan Vong Intendant specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Yuuzhan Vong Intendant path. I want to navigate complicated institutions without losing sight of people.” |
| `holostar` | specialization of `celebrity` | “I see how my training might resemble the Holostar specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Holostar path. I want to use public attention deliberately rather than be ruled by it.” |
| `geonosian_arena_champion` | specialization of `celebrity` | “I see how my training might resemble the Geonosian Arena Champion specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Geonosian Arena Champion path. I want to use public attention deliberately rather than be ruled by it.” |
| `mandalorian_clan_leader` | specialization of `community_leader` | “I see how my training might resemble the Mandalorian Clan Leader specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Mandalorian Clan Leader path. I want to earn trust and help my community make sound decisions.” |
| `ithorian_herdship_steward` | specialization of `community_leader` | “I see how my training might resemble the Ithorian Herdship Steward specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Ithorian Herdship Steward path. I want to earn trust and help my community make sound decisions.” |
| `corporate_agent` | specialization of `corporate_operator` | “I see how my training might resemble the Corporate Agent specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Corporate Agent path. I want to understand how organizations make choices and use resources.” |
| `corporate_troubleshooter` | specialization of `corporate_operator` | “I see how my training might resemble the Corporate Troubleshooter specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Corporate Troubleshooter path. I want to understand how organizations make choices and use resources.” |
| `quarren_deep_sea_industrialist` | specialization of `corporate_operator` | “I see how my training might resemble the Quarren Deep Sea Industrialist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Quarren Deep Sea Industrialist path. I want to understand how organizations make choices and use resources.” |
| `geonosian_foundry_master` | specialization of `corporate_operator` | “I see how my training might resemble the Geonosian Foundry Master specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Geonosian Foundry Master path. I want to understand how organizations make choices and use resources.” |
| `neimoidian_trade_viceroy` | specialization of `corporate_operator` | “I see how my training might resemble the Neimoidian Trade Viceroy specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Neimoidian Trade Viceroy path. I want to understand how organizations make choices and use resources.” |
| `skakoan_techno_union_technocrat` | specialization of `corporate_operator` | “I see how my training might resemble the Skakoan Techno Union Technocrat specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Skakoan Techno Union Technocrat path. I want to understand how organizations make choices and use resources.” |
| `koorivar_corporate_magnate` | specialization of `corporate_operator` | “I see how my training might resemble the Koorivar Corporate Magnate specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Koorivar Corporate Magnate path. I want to understand how organizations make choices and use resources.” |
| `political_fixer` | specialization of `courtier` | “I see how my training might resemble the Political Fixer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Political Fixer path. I want to read a room and choose words carefully when influence matters.” |
| `hutt_majordomo` | specialization of `courtier` | “I see how my training might resemble the Hutt Majordomo specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Hutt Majordomo path. I want to read a room and choose words carefully when influence matters.” |
| `chiss_house_agent` | specialization of `courtier` | “I see how my training might resemble the Chiss House Agent specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Chiss House Agent path. I want to read a room and choose words carefully when influence matters.” |
| `zeltron_empathic_courtier` | specialization of `courtier` | “I see how my training might resemble the Zeltron Empathic Courtier specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Zeltron Empathic Courtier path. I want to read a room and choose words carefully when influence matters.” |
| `negotiator` | specialization of `diplomat` | “I see how my training might resemble the Negotiator specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Negotiator path. I want to find ways for people in conflict to reach an understanding.” |
| `mediator` | specialization of `diplomat` | “I see how my training might resemble the Mediator specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Mediator path. I want to find ways for people in conflict to reach an understanding.” |
| `protocol_droid` | specialization of `diplomat` | “I see how my training might resemble the Protocol Droid specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Protocol Droid path. I want to find ways for people in conflict to reach an understanding.” |
| `senator` | specialization of `diplomat` | “I see how my training might resemble the Senator specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Senator path. I want to find ways for people in conflict to reach an understanding.” |
| `caamasi_memory_keeper` | specialization of `diplomat` | “I see how my training might resemble the Caamasi Memory Keeper specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Caamasi Memory Keeper path. I want to find ways for people in conflict to reach an understanding.” |
| `anomid_technical_diplomat` | specialization of `diplomat` | “I see how my training might resemble the Anomid Technical Diplomat specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Anomid Technical Diplomat path. I want to find ways for people in conflict to reach an understanding.” |
| `educorps_scholar` | specialization of `educator` | “I see how my training might resemble the EduCorps Scholar specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the EduCorps Scholar path. I want to help someone else learn something that changes what they can do.” |
| `bith_virtuoso` | specialization of `entertainer` | “I see how my training might resemble the Bith Virtuoso specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Bith Virtuoso path. I want to reach people through an experience they will remember.” |
| `muun_banking_magnate` | specialization of `merchant_prince` | “I see how my training might resemble the Muun Banking Magnate specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Muun Banking Magnate path. I want to understand trade and build relationships that last.” |
| `yuuzhan_vong_priest` | specialization of `spiritual_leader` | “I see how my training might resemble the Yuuzhan Vong Priest specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Yuuzhan Vong Priest path. I want to help people find meaning and direction in difficult moments.” |
| `jedi_battlemaster` | specialization of `jedi_guardian` | “I see how my training might resemble the Jedi Battlemaster specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Battlemaster path. I want to protect others through discipline and careful action.” |
| `jedi_temple_guard` | specialization of `jedi_guardian` | “I see how my training might resemble the Jedi Temple Guard specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Temple Guard path. I want to protect others through discipline and careful action.” |
| `jedi_peacekeeper` | specialization of `jedi_guardian` | “I see how my training might resemble the Jedi Peacekeeper specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Peacekeeper path. I want to protect others through discipline and careful action.” |
| `jedi_healer` | specialization of `jedi_consular` | “I see how my training might resemble the Jedi Healer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Healer path. I want to seek understanding and resolve conflict without needless harm.” |
| `jedi_artisan` | specialization of `jedi_consular` | “I see how my training might resemble the Jedi Artisan specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Artisan path. I want to seek understanding and resolve conflict without needless harm.” |
| `jedi_lore_keeper` | specialization of `jedi_consular` | “I see how my training might resemble the Jedi Lore Keeper specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Lore Keeper path. I want to seek understanding and resolve conflict without needless harm.” |
| `jedi_instructor` | specialization of `jedi_consular` | “I see how my training might resemble the Jedi Instructor specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Instructor path. I want to seek understanding and resolve conflict without needless harm.” |
| `jedi_diplomat` | specialization of `jedi_consular` | “I see how my training might resemble the Jedi Diplomat specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Diplomat path. I want to seek understanding and resolve conflict without needless harm.” |
| `jedi_seer` | specialization of `jedi_consular` | “I see how my training might resemble the Jedi Seer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Seer path. I want to seek understanding and resolve conflict without needless harm.” |
| `jedi_archaeologist` | specialization of `jedi_consular` | “I see how my training might resemble the Jedi Archaeologist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Archaeologist path. I want to seek understanding and resolve conflict without needless harm.” |
| `jedi_researcher` | specialization of `jedi_consular` | “I see how my training might resemble the Jedi Researcher specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Researcher path. I want to seek understanding and resolve conflict without needless harm.” |
| `jedi_shadow` | specialization of `jedi_sentinel` | “I see how my training might resemble the Jedi Shadow specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Shadow path. I want to notice hidden threats and respond with judgment.” |
| `jedi_watchman` | specialization of `jedi_sentinel` | “I see how my training might resemble the Jedi Watchman specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Watchman path. I want to notice hidden threats and respond with judgment.” |
| `jedi_investigator` | specialization of `jedi_sentinel` | “I see how my training might resemble the Jedi Investigator specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Investigator path. I want to notice hidden threats and respond with judgment.” |
| `jedi_explorer` | specialization of `jedi_sentinel` | “I see how my training might resemble the Jedi Explorer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jedi Explorer path. I want to notice hidden threats and respond with judgment.” |
| `sith_marauder` | specialization of `sith_warrior` | “I see how my training might resemble the Sith Marauder specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Sith Marauder path. I want to pursue strength through demanding martial discipline.” |
| `sith_alchemist` | specialization of `sith_sorcerer` | “I see how my training might resemble the Sith Alchemist specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Sith Alchemist path. I want to study difficult mysteries and the power they can reveal.” |
| `sith_inquisitor` | specialization of `sith_sorcerer` | “I see how my training might resemble the Sith Inquisitor specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Sith Inquisitor path. I want to study difficult mysteries and the power they can reveal.” |
| `sith_scholar` | specialization of `sith_sorcerer` | “I see how my training might resemble the Sith Scholar specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Sith Scholar path. I want to study difficult mysteries and the power they can reveal.” |
| `dark_prophet` | specialization of `sith_sorcerer` | “I see how my training might resemble the Dark Prophet specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Dark Prophet path. I want to study difficult mysteries and the power they can reveal.” |
| `kissai_dark_priest` | specialization of `sith_sorcerer` | “I see how my training might resemble the Kissai Dark Priest specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Kissai Dark Priest path. I want to study difficult mysteries and the power they can reveal.” |
| `aing_tii_monk` | specialization of `force_mystic` | “I see how my training might resemble the Aing-Tii Monk specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Aing-Tii Monk path. I want to explore what the Force may teach beyond familiar methods.” |
| `tyia_adept` | specialization of `force_mystic` | “I see how my training might resemble the Tyia Adept specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Tyia Adept path. I want to explore what the Force may teach beyond familiar methods.” |
| `fallanassi_adept` | specialization of `force_mystic` | “I see how my training might resemble the Fallanassi Adept specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Fallanassi Adept path. I want to explore what the Force may teach beyond familiar methods.” |
| `force_pilgrim` | specialization of `force_mystic` | “I see how my training might resemble the Force Pilgrim specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Force Pilgrim path. I want to explore what the Force may teach beyond familiar methods.” |
| `force_hermit` | specialization of `force_mystic` | “I see how my training might resemble the Force Hermit specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Force Hermit path. I want to explore what the Force may teach beyond familiar methods.” |
| `baran_do_sage` | specialization of `force_seer` | “I see how my training might resemble the Baran Do Sage specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Baran Do Sage path. I want to develop the patience to interpret what I sense.” |
| `miraluka_force_seer` | specialization of `force_seer` | “I see how my training might resemble the Miraluka Force Seer specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Miraluka Force Seer path. I want to develop the patience to interpret what I sense.” |
| `warden_of_the_sky` | specialization of `force_warrior` | “I see how my training might resemble the Warden of the Sky specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Warden of the Sky path. I want to join Force discipline with practical action.” |
| `zeison_sha_warrior` | specialization of `force_warrior` | “I see how my training might resemble the Zeison Sha Warrior specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Zeison Sha Warrior path. I want to join Force discipline with practical action.” |
| `matukai_adept` | specialization of `force_warrior` | “I see how my training might resemble the Matukai Adept specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Matukai Adept path. I want to join Force discipline with practical action.” |
| `shaper_of_kro_var` | specialization of `force_warrior` | “I see how my training might resemble the Shaper of Kro Var specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Shaper of Kro Var path. I want to join Force discipline with practical action.” |
| `jensaarai_defender` | specialization of `force_warrior` | “I see how my training might resemble the Jensaarai Defender specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Jensaarai Defender path. I want to join Force discipline with practical action.” |
| `imperial_knight` | specialization of `force_warrior` | “I see how my training might resemble the Imperial Knight specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Imperial Knight path. I want to join Force discipline with practical action.” |
| `iron_knight` | specialization of `force_warrior` | “I see how my training might resemble the Iron Knight specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Iron Knight path. I want to join Force discipline with practical action.” |
| `kilian_ranger` | specialization of `force_warrior` | “I see how my training might resemble the Kilian Ranger specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Kilian Ranger path. I want to join Force discipline with practical action.” |
| `nightsister` | specialization of `force_witch` | “I see how my training might resemble the Nightsister specialization, but I don't think that interpretation fits me.” | “I recognize myself more in the Nightsister path. I want to explore a Force tradition connected to living things and old knowledge.” |

### Free-standing first-person affirmative self-descriptions

These provide a truthful affirmative path when no canonical archetype is yet supported or the character does not want a single identity label. They are not new tags and do not assert past deeds.

- **`protect_people`:** “I see myself as someone who tries to keep others safe, even when that means taking the harder position.”
- **`prepare_first`:** “I understand myself as someone who prepares carefully before making a dangerous choice.”
- **`learn_and_investigate`:** “I am someone who wants to understand what is happening before deciding what to do.”
- **`support_allies`:** “I see my role as helping the people beside me do their best work.”
- **`make_own_way`:** “I value being able to make my own decisions and find my own way forward.”
- **`solve_problems`:** “I see myself as someone who solves difficult problems with whatever honest tools I have available.”
- **`take_responsibility`:** “I want to be someone others can depend on when a decision needs to be made.”
- **`find_peaceful_option`:** “I prefer to look for a way through conflict that does not demand another fight.”
- **`act_decisively`:** “I think of myself as someone who takes action when waiting would put others at risk.”
- **`work_discreetly`:** “I am more comfortable making progress quietly than being the center of attention.”
- **`explore_the_unknown`:** “I want to be someone who can face the unfamiliar with care and curiosity.”
- **`technical_care`:** “I understand myself best when I am learning how something works and how to make it useful again.”
- **`trust_and_relationships`:** “I place a great deal of importance on the people I trust and the relationships I build.”
- **`change_is_real`:** “I know my direction has changed. I want my choices now to matter more than the label you gave me before.”
- **`complex_identity`:** “I don't think one role explains all of me. I want you to recognize that I can be several things at once.”
- **`identity_unresolved`:** “I am still working out who I am. I want that uncertainty to be part of your understanding of me.”
- **`limits_of_training`:** “I know what I have learned, but I don't want my current abilities to decide my whole future for me.”
- **`remain_open`:** “I want to keep learning before I choose a single path to describe myself.”

### Composition, scope, and persistence constraints

- Capture immutable Q6 Mentor reading snapshot (rendered words plus individually addressable inference claim IDs and evidence source IDs).
- Generate B/C/D/E negative choices ONLY for inferences actually displayed in that exact snapshot; use canonical archetype ID-specific negative option when claim is an archetype identity.
- Keep observed ownership statements and canonical eligibility separate and non-selectable as identity-rejection targets; the user may dispute inference about them, never erase the facts.
- For D/E show explicit NOT stage, collect scoped rejection IDs, then show explicit AM stage; candidate positives come from supported identity alternatives or plain-language self-reports, never invented achievements.
- Gate species, class, Force tradition, faction, historical status, and specialized archetype self-descriptions against actual actor facts and/or explicit user identification. Do not treat choosing a label as rules eligibility or acquisition.
- If early level or sparse identity produces fewer than nominal negative readings, permit fewer rather than padding; if there are zero inferred readings, allow only the unresolved-reading-disagreement fallback and proceed to the AM stage; do not falsely claim overconfidence.
- Do not allow the same canonical interpretation ID to be simultaneously rejected and affirmed in the same pass without explicit reconciliation; preserve all raw input and ask for confirmation if contradictory.
- Q6 corrections affect ONLY mutable inferred interpretation state. An affirmative response about a future role is scoped exploratory intent; to revise an explicit career goal, launch a distinct affirmatively confirmed career conversation.
- Write one idempotent finalized correction event per survey completion, with reading snapshot, claim IDs, selected response IDs, actor revision/level, timestamp, model/ontology version, and supersession linkage.
- Re-render on navigation or changed actor state with snapshot freshness checks, and never double-count Q6 correction evidence on replay.

**Illustrative event fields:** `surveyInstanceId`, `mentorId`, `actorRevision`, `characterLevel`, `readingSnapshotId`, selected A–E band, `rejectedClaimIds`, selected `affirmedIdentities`, current-versus-exploratory identity scope, optional supersession event, canonical/ontology version. Never set owned-feat/talent/class/skill or career-goal fields based on Q6 selections.

### QA and samples

**Draft library:** `SWSE_Q6_Pass_B_Correction_Library_LOCAL.json`. **Sample flows:** `SWSE_Q6_Pass_B_Sample_Corrections_LOCAL.md`. **Structural verification:** `SWSE_Q6_Pass_B_Validation_LOCAL.json`.

| Editorial check | Result |
|---|---|
| Exact canonical archetype IDs | 297 (97 parent / 200 specialization) |
| Unique first-person archetype affirmative statements | 297 / 297 |
| Unique first-person archetype negative statements | 297 / 297 |
| Additional affirmative first-person self-descriptions | 18 |
| Negative inference claim kinds | 10, with two wording alternatives each |
| All five A–E branches and mandatory D/E dual stages | Complete, per approved structure |
| Actor-specific eligibility/identity evidence, linguistic personalization in Foundry, calibration coefficients | Pending runtime audit and calibration |

### Pass B final editorial implementation gates

1. Prove the runtime actor → existing Suggestion/Identity Engine → SSOT 297-identity mapping without inventing a second scoring system.
2. Distinguish what is displayed as an inference claim from verified actual-owned evidence; persist precise claim and evidence IDs for B/C/D/E.
3. Implement Q6 selection as interpretive correction, not a career change, class gain, prerequisite bypass or mechanic removal.
4. Keep the same Q6 branch engine callable by an on-demand Talk to Mentor current-path reflection.
5. Test low-level thin data, multi-class actors, class/species/culture sensitive identities, no goal, old goal, new goals and repeated survey retries.
6. Verify correction selections remain all first person, the existing five distinct Mentor prompts remain unchanged, and scores/bands/IDs are hidden from players.

**Revision ledger:** Q6 Pass B authored in the same rolling design and validated locally. Approval to commit this consolidated Markdown to the repository was given by the owner on 2026-11-14. This appendix does not claim mechanical certification or deployed functionality.

