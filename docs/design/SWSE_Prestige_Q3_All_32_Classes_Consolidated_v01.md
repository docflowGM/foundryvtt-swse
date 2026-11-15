# SWSE Prestige Q3 — Complete 32-Class Review Library

**Assembled:** November 15, 2026 | **Version:** v0.1 | **Purpose:** Consolidated design review, **not a runtime-ready implementation**.

The approved Ace Pilot is the reference. Batches 1–5 and the final six classes are **editorial drafts pending owner review**. All 32 classes have five hypothetical Q3 scenarios and five first-person substantive options per scenario. Exact Q1 route IDs determine the default displayed scene; Q2/actor evidence can inform context without treating unselected responses as additional preference votes.

## Acceptance result

- **32 / 32** unique prestige class identities, **160** scenes, **800** substantive answers.
- **160 / 160** unique scene IDs, **800 / 800** unique answer IDs.
- **1293** exact default Q1 route assignments across all 32 classes; route uniqueness checked within every class.
- All content uses prior published/bank-specific source restrictions and remains subject to proper character prerequisites.
- This assembly **did not** recertify every sourcebook talent, resolve registry mismatches, or create an authorized Suggestion Engine scoring contract.

## Source batch inventory

| File group | Classes | Scenarios | Answers | Q1 routes |
|---|---:|---:|---:|---:|
| Ace Pilot | 1 | 5 | 25 | 33 |
| Batch 1 | 5 | 25 | 125 | 231 |
| Batch 2 | 5 | 25 | 125 | 350 |
| Batch 3 | 5 | 25 | 125 | 204 |
| Batch 4 | 5 | 25 | 125 | 159 |
| Batch 5 | 5 | 25 | 125 | 131 |
| Final Six | 6 | 30 | 150 | 185 |

## Complete prestige roster and Q1 coverage

| # | Prestige class | Mentor | Source group | Q1 routes |
|---:|---|---|---|---:|
| 1 | Ace Pilot | Mayu | Ace Pilot | 33 |
| 2 | Bounty Hunter | Kex Varon | Batch 1 | 43 |
| 3 | Crime Lord | Tío the Hutt | Batch 1 | 34 |
| 4 | Elite Trooper | Breach | Batch 1 | 62 |
| 5 | Force Adept | Seeker Vera | Batch 1 | 40 |
| 6 | Force Disciple | Riquis | Batch 1 | 52 |
| 7 | Gunslinger | Rajma | Batch 2 | 55 |
| 8 | Jedi Knight | Miraj | Batch 2 | 98 |
| 9 | Jedi Master | Miraj | Batch 2 | 77 |
| 10 | Officer | Admiral Korr | Batch 2 | 62 |
| 11 | Sith Apprentice | Darth Malbada | Batch 2 | 58 |
| 12 | Sith Lord | Darth Miedo | Batch 3 | 89 |
| 13 | Corporate Agent | Marl Skindar | Batch 3 | 29 |
| 14 | Gladiator | Pegar | Batch 3 | 26 |
| 15 | Melee Duelist | Blade Master Kharjo | Batch 3 | 44 |
| 16 | Enforcer | Krag the Immovable | Batch 3 | 16 |
| 17 | Independent Droid | Seraphim | Batch 4 | 23 |
| 18 | Infiltrator | Delta | Batch 4 | 32 |
| 19 | Master Privateer | The Captain | Batch 4 | 39 |
| 20 | Medic | Kyber | Batch 4 | 22 |
| 21 | Saboteur | Spark | Batch 4 | 43 |
| 22 | Outlaw | Rogue | Batch 5 | 32 |
| 23 | Droid Commander | General Axiom | Batch 5 | 30 |
| 24 | Military Engineer | Chief Engineer Rax | Batch 5 | 18 |
| 25 | Vanguard | Shield Captain Theron | Batch 5 | 24 |
| 26 | Martial Arts Master | Master Zhen | Batch 5 | 27 |
| 27 | Imperial Knight | Dezmin | Final Six | 48 |
| 28 | Shaper | Shaper Urza | Final Six | 23 |
| 29 | Assassin | Delta | Final Six | 39 |
| 30 | Charlatan | Silvertongue Sela | Final Six | 30 |
| 31 | Improviser | Lucky Jack | Final Six | 19 |
| 32 | Pathfinder | Lead | Final Six | 26 |

## Unresolved implementation blockers (not new design decisions)

- **Force tree access:** Force Disciple, Jedi Master and Sith Lord have printed class-independent Force-tree access beyond current limited repository class-tree lists.
- **Sith gate:** Printed Sith Apprentice/Sith Lord Dark Side Score equals Wisdom requirement differs from explicit project house-rule prerequisite (DSS ≥ 1). Owner must choose runtime policy.
- **Corrected cross-batch Q3 namespace:** Medic kept `ME-Q3`; Military Engineer moved to `MENG-Q3` in corrected Batch 5 v02 to eliminate five scene and 25 response collisions; all Q1 IDs remain unchanged.
- **Mentor registry:** Blade Master Kharjo has dialogue JSON but lacks a matching registry entry as of the source snapshot.
- **Charlatan Fortune:** Printed Fortune-tree access is omitted from the current repository class-tree list.
- **Assassin GenoHaradan:** Resolve raw tree name versus registered source-ID normalization.
- **Talent quarantine:** Preserve identified unresolved individual talents (selected Gunslinger Pistoleer, Outlaw Fringer/Slicer, Teräs Käsi, selected Sith cases and Officer prerequisite collisions) as research—not enabled class selections.
- **Cultural and history gates:** Imperial Knight Roan Fel oath, Shaper Yuuzhan Vong requirement, Force traditions, Bothan SpyNet and other source-specific prerequisites still require real actor evidence.
- **Candidate tags vs rules:** The 125 mechanical-bias / 12 role / 190 ontology vocabulary membership checks do not validate that each selected talent actually possesses those mechanics or that the Suggestion Engine will ingest signals.
- **Workflow:** Q3 never grants a class, talent, item, companion, organization membership or success in an imaginary scene; no implied biography from hypothetical play.

## Editorial integration criteria

1. Review each Mentor’s scene lines and each five-option set for personality, legibility, neutrality and real decision diversity.
2. Resolve printed source identity, talent access and prerequisite/source quarantines without silently rewriting bank identifiers.
3. Confirm Q1-to-Q3 default-route presentation, Q2 influence, and unscored “another situation / undecided” affordances as owner-approved UI policy.
4. Trace a single clicked Q3 answer into an explicit, source-identified preference event and approved mechanical signal mapping; do not implement a parallel shadow scorer.
5. Gate implementation separately, with tests of no invented history, no unearned features, character legality, Q1 route stability, class-level timing and save/restore behavior.

## Included complete dialogue

The remainder of this file concatenates the **original, independently authored Markdown source documents without changing their wording**. The consolidated JSON contains their machine-readable content with a provenance marker for the source batch.


---

# SOURCE DOCUMENT: Ace Pilot — `SWSE_Prestige_Q3_Ace_Pilot_Scenario_Library_v01.md`

# SWSE Prestige Q3 — Ace Pilot Scenario Library

**Version:** v0.1 · 2026-11-14  
**Status:** Editorial draft only — not owner-approved, mechanically certified response mappings, deployed, committed, or pushed.  
**Prestige class:** Ace Pilot · **Mentor:** Mayu (`m19`)  
**Delivery:** 5 scenarios × 5 substantive answers = **25** authorial response choices. Player sees **one** situation with five answers at Q3.

## Purpose and authority

Q3 asks **how** the character would use advanced capability in a specific dilemma. It does not prove past actions (Q1), repeat verified current strengths (Q2), ask investment depth (Q4), force a further career (Q5), or rewrite a prior explicit goal. It follows the L1 situational-survey principle: concrete stakes, meaningful first-person methods, class-appropriate mechanical directions, no morality scoring, and selected-answer-only provenance.

Based on the current prestige Q1/Q2 rolling design on `design/prestige-q2-character-synthesis-v08`, the mentor registry and Mayu dialogue, the 125 mechanical-bias keys in `data/bias-keys-canonical.json`, and the 190-term published feat/talent tag ontology in `data/audits/talent-feat-phase3-final-ontology.json`. Parent Q1 inventory contains 33 Ace Pilot response IDs covering six print-supported talent tree families; all 33 are assigned a deterministic default Q3 situation in this document.

**Important taxonomy boundary:** `mechanicalBiasKeys` (125-key registry) and the 190-tag feat/talent ontology are **not the same vocabulary**. The ontology has exact mechanical-use policies (including an exact-skill policy). The topic associations here are for editorial review only; they are **not** certified evidence that a feat/talent provides the tagged effect, and not proof of existing code ingestion. The existing tag projection is partial and sometimes uses names outside the canonical ontology. No new scoring or projection path is authorized by this draft.

## Shared Mentor setup

**Mayu (draft):** "All right, ace. Knowing what you want to be good at is one thing. Choosing what to do when things go sideways? That tells me more. Try this."

**Question model:** Mayu speaks a short fixed lead-in before the authored situation and asks for a concrete choice. The player response, not Mayu’s narration, is the intent evidence. The situation describes only a hypothetical, not recorded history. No extra Mentor interpretation is claimed.

## Five situations and player answers

### AP-Q3-S01 — The Closing Passage

**Narrative focus:** Evacuation under pursuit: whom and how to protect when no route is risk-free  
**Q1 primary routes:** `AP-Q1-WM01`, `AP-Q1-WM02`, `AP-Q1-WM03`, `AP-Q1-BR01`, `AP-Q1-BR04`, `AP-Q1-EP02`, `AP-Q1-BR03`  
**Printed directions represented:** Wingman, Blockade Runner

**Mayu:** "Tight passage, bad timing, two transports, and one very unfriendly patrol. Cute. Tell me what you do."

**Situation:** You are piloting one of two transports carrying evacuees through shifting debris. The safe opening will close in moments. The other transport is losing speed, and a pursuing patrol craft is gaining. Both pilots can communicate, and your instruments can still read the debris. You have no authority over the other pilot.

**Question:** You have moments to make a call. How do you handle it?

| Answer | Player-facing first-person statement | Candidate bias keys | Candidate ontology topics |
|---|---|---|---|
| **A** | I keep my transport moving through the opening. If I lose the escape for the people aboard, I have failed the responsibility already in my hands. | `pilotMastery`, `evasion` · role `defender` | `vehicle`, `evasion`, `pursuit` |
| **B** | I move between the patrol and the damaged transport and try to spoil its line of fire. I want the other pilot to have a chance to get clear. | `allySupport`, `reactionDefense`, `pilotMastery` · role `support` | `vehicle`, `ally_support`, `defense` |
| **C** | I call the other pilot and propose one timed path through the debris. We have a better chance if our maneuvers work together. | `formation`, `allySupport`, `tacticalAwareness` · role `leader` | `vehicle`, `teamwork`, `tactics` |
| **D** | I read the debris and look for a second opening before I commit. A route neither of us noticed could save both transports. | `tacticalAwareness`, `skillUtility` · role `scout` | `vehicle`, `sensors`, `tactics` |
| **E** | I cut across the patrol's approach and try to draw it away from the damaged transport. If it takes the bait, I can bring it through a different gap. | `pilotMastery`, `evasion`, `allySupport` · role `flex` | `vehicle`, `pursuit`, `positioning` |

**Developer-only distinctions (not read to player):**

- **A:** Protect the current passengers through committed extraction; not a judgment against rescue.
- **B:** Protect another vehicle with defensive positioning; not proof of owning Run Interference or immunity to attack.
- **C:** Offer coordination without claiming command, organizational rank, or an owned Squadron Leader talent.
- **D:** Prioritize observation and route analysis; no guaranteed alternate route or new sensor ability.
- **E:** Use mobile distraction to create space for another; outcome remains contingent on enemy behavior.

**Mechanical learning / legal boundary:** Relevant possible development paths include Wingman protection and positioning (Rebellion Era Campaign Guide p. 40), Blockade Runner escape/movement (Scum and Villainy pp. 25–26), and Expert Pilot maneuver/survival (Core Rulebook p. 207). This scenario never presumes Escort Pilot, Run Interference, Outrun, Vehicular Evasion, an owned vessel, or command of the second transport.

### AP-Q3-S02 — The Disabled Target

**Narrative focus:** Vehicle gunnery and mission judgment when firepower has competing uses  
**Q1 primary routes:** `AP-Q1-GN01`, `AP-Q1-GN02`, `AP-Q1-GN03`, `AP-Q1-GN04`, `AP-Q1-GN05`, `AP-Q1-GN06`, `AP-Q1-EP05`, `AP-Q1-WM05`  
**Printed directions represented:** Gunner, Expert Pilot, Wingman

**Mayu:** "You have a target in sight. Congratulations. That was the easy part. Now tell me what that shot is actually for."

**Situation:** During a relief-ship escort, you are temporarily operating a weapon station aboard an armed patrol craft while someone else pilots. A raider that fired on the convoy has lost much of its engine power, but its weapons are still active. A damaged freighter is nearby, and another friendly patrol craft is approaching. The raider may fire again before help arrives.

**Question:** What do you do with the opportunity?

| Answer | Player-facing first-person statement | Candidate bias keys | Candidate ontology topics |
|---|---|---|---|
| **A** | I line up a careful shot at the raider's active weapons. I would rather remove its ability to threaten the convoy than simply tear the craft apart. | `accuracy`, `vehicularDamage`, `tacticalAwareness` · role `controller` | `vehicle`, `targeting`, `precision` |
| **B** | I fire as soon as I have a clear shot. Letting the raider keep its guns trained on the freighter is a risk I will not extend. | `initiative`, `vehicularDamage` · role `striker` | `vehicle`, `offense_ranged`, `targeting` |
| **C** | I contact the approaching patrol and coordinate one focused volley. Two attacks at the right moment may end the danger faster than scattered fire. | `formation`, `allySupport`, `accuracy` · role `support` | `vehicle`, `teamwork`, `targeting` |
| **D** | I tell our pilot to interpose the patrol craft between the raider and the freighter. Protecting the freighter matters more than taking the final shot. | `tacticalAwareness`, `allySupport`, `reactionDefense` · role `defender` | `vehicle`, `positioning`, `defense` |
| **E** | I track the raider's weapon arcs and relay a clear threat report to the approaching patrol. I want them ready to act without guessing. | `tacticalAwareness`, `skillUtility`, `allySupport` · role `scout` | `vehicle`, `recon`, `sensors` |

**Developer-only distinctions (not read to player):**

- **A:** Select precision and systems-disruption intent; do not infer a condition-track hit or owned System Hit talent.
- **B:** Favor prompt vehicle fire; do not imply an extra reaction attack or attack outside normal action rules.
- **C:** Prefer cooperative gunnery; do not assume the Synchronized Fire talent or a bonus from merely coordinating.
- **D:** Choose protective positioning while operating as a gunner; the pilot may accept or refuse, and no defensive reaction talent is assumed.
- **E:** Contribute threat information and target assessment; no guaranteed tactical bonus or specialized sensor package.

**Mechanical learning / legal boundary:** Potential class directions include Gunner talents for accuracy and systems disruption (Expert Gunner; System Hit; Crippling Hit), rapid firing (Quick Trigger; Fast Attack Specialist), and coordination (Synchronized Fire). These are printed directions, not a promise of ownership or permission to bypass attack actions, prerequisites, or weapon limitations (Core Rulebook p. 207; Starships of the Galaxy p. 17; Unknown Regions p. 29).

### AP-Q3-S03 — The Broken Formation

**Narrative focus:** Cooperative flight when coordination breaks down and nobody has appointed command  
**Q1 primary routes:** `AP-Q1-SL01`, `AP-Q1-SL02`, `AP-Q1-SL03`, `AP-Q1-SL04`, `AP-Q1-EP07`, `AP-Q1-WM04`, `AP-Q1-EP01`  
**Printed directions represented:** Squadron Leader, Expert Pilot, Wingman

**Mayu:** "Everyone looks brilliant in a perfect formation. Then the comms crackle and things get interesting. Your move, ace."

**Situation:** You are one of several independent pilots helping escort survey craft through dangerous airspace. Interference disrupts their shared navigation channel, and the loose formation begins to scatter. One hostile fast craft slips toward an exposed flank. A short-range voice channel still works, but nobody has appointed you to command the group.

**Question:** How do you respond to the break in coordination?

| Answer | Player-facing first-person statement | Candidate bias keys | Candidate ontology topics |
|---|---|---|---|
| **A** | I use the surviving channel to suggest a simple regrouping pattern. We can close the gaps if everyone understands the same plan. | `formation`, `allySupport`, `tacticalAwareness` · role `leader` | `vehicle`, `teamwork`, `tactics` |
| **B** | I move to the exposed flank and hold a defensive line. If the intruder commits to an attack, I want it coming through me first. | `reactionDefense`, `allySupport`, `pilotMastery` · role `defender` | `vehicle`, `defense`, `positioning` |
| **C** | I move to intercept the intruder before it reaches the survey craft. If it has to react to me, the others get time to regroup. | `pilotMastery`, `initiative`, `tacticalAwareness` · role `skirmisher` | `vehicle`, `pursuit`, `positioning` |
| **D** | I match the course of one isolated escort and stay with it. Keeping two craft together is better than letting each be picked off alone. | `formation`, `allySupport`, `pilotMastery` · role `support` | `vehicle`, `teamwork`, `positioning` |
| **E** | I use the instruments we still have to call out the intruder's position and relay course changes. Everyone should be working from the same picture. | `tacticalAwareness`, `skillUtility`, `allySupport` · role `scout` | `vehicle`, `sensors`, `recon` |

**Developer-only distinctions (not read to player):**

- **A:** Coordinate by proposal rather than authority; does not confer rank or a command feature.
- **B:** Favor defensive presence and protection, not invulnerability or automatic interception.
- **C:** Proactive pursuit and tempo, without asserting a special dogfight maneuver is available.
- **D:** Close escort and mutual positioning; does not imply owned Wingman feats or adjacent-vehicle mechanical benefits.
- **E:** Threat awareness and shared information, rather than formal command or a granted tactical bonus.

**Mechanical learning / legal boundary:** Possible development directions include Squadron Leader group maneuvers (Starships of the Galaxy pp. 17–18), Wingman escort/linked-fire support (Rebellion Era Campaign Guide p. 40), and Expert Pilot positioning/pursuit (Core Rulebook p. 207). Several Squadron Leader talents have Charisma and other prerequisites; none is assumed owned.

### AP-Q3-S04 — The Failing Systems

**Narrative focus:** Shipboard emergency across zero gravity, damaged controls, trapped passengers, and uncertain boarding risk  
**Q1 primary routes:** `AP-Q1-SP01`, `AP-Q1-SP02`, `AP-Q1-SP03`, `AP-Q1-SP04`, `AP-Q1-EP04`, `AP-Q1-EP06`, `AP-Q1-ID01`  
**Printed directions represented:** Spacer, Expert Pilot, Broad vehicle identity

**Mayu:** "Gravity's off, the hatch is jammed, the bridge is yelling, and a mystery ship wants to say hello. Nice little quiet trip. What do you do?"

**Situation:** You are aboard a transport that has lost power while crossing a dangerous stretch of space. Artificial gravity has failed, a security hatch has trapped passengers in an aft compartment, and the bridge reports unstable maneuvering controls. An unidentified craft is approaching the airlock without answering hails. Maintenance access and internal comms still work. Nobody has appointed you to command the response.

**Question:** Where do you put your effort first?

| Answer | Player-facing first-person statement | Candidate bias keys | Candidate ontology topics |
|---|---|---|---|
| **A** | I make my way through the zero-gravity passage to help the bridge regain control. If the transport cannot maneuver, every other danger gets worse. | `pilotMastery`, `skillUtility` · role `flex` | `vehicle`, `movement`, `mobility` |
| **B** | I open the maintenance access and work to restore essential power. That could free the hatch and give the bridge more control. | `engineeringMastery`, `resourcefulness` · role `utility` | `vehicle`, `tech`, `power_systems` |
| **C** | I head toward the trapped passengers and find a way to move them to a safer compartment. Getting people clear is the problem I can solve now. | `allySupport`, `evasion`, `tacticalAwareness` · role `support` | `vehicle`, `ally_support`, `movement` |
| **D** | I take a position near the airlock and watch the approaching craft. I do not know if it is hostile, but I will not leave that entrance unguarded. | `reactionDefense`, `tacticalAwareness`, `skillUtility` · role `defender` | `vehicle`, `recon`, `positioning` |
| **E** | I use the comms to suggest a split response: someone on power, someone helping passengers, and someone watching the airlock. We need all three covered. | `formation`, `allySupport`, `tacticalAwareness` · role `leader` | `vehicle`, `teamwork`, `tactics` |

**Developer-only distinctions (not read to player):**

- **A:** Use mobility in an unusual environment to support flight control; neither zero-g training nor a Pilot check bonus is presumed.
- **B:** Technical systems focus; no proven Mechanics training, jury-rig capability, repair access or guaranteed fix.
- **C:** Prioritize evacuating occupants from danger; no claim of a built-in protective feat or automatic hatch release.
- **D:** Prepare shipboard defense without assuming the approaching craft is hostile or an automatic attack/reaction.
- **E:** Propose coordination, not assume formal leadership or confer a Squadron Leader talent.

**Mechanical learning / legal boundary:** Spacer talents offer zero-gravity and shipboard combat/movement directions (Core Rulebook p. 47; Scum and Villainy p. 16; Unknown Regions pp. 18–19). Expert Pilot can support vehicle control/survival (Core Rulebook p. 207). Engineering answers are valid hypothetical approaches, but no Spacer talent, trained Mechanics skill, Zero-G feat, particular ship, or special boarding combat technique is granted by answering.

### AP-Q3-S05 — The Impossible Route

**Narrative focus:** Time-sensitive navigation, intelligent risk, and alternative mission design  
**Q1 primary routes:** `AP-Q1-EP03`, `AP-Q1-BR02`, `AP-Q1-ID02`, `AP-Q1-NEUTRAL`  
**Printed directions represented:** Expert Pilot, Blockade Runner, Capstone or undecided identity

**Mayu:** "Short route, bad weather, ticking clock. Whoever planned this job clearly has a sense of humor. What's your play?"

**Situation:** An isolated medical station needs supplies before a storm front closes the landing zone. You are piloting the delivery vehicle. The marked route is safer but probably too slow; an unfamiliar canyon route is much shorter and has dangerous crosswinds. An old survey buoy offers incomplete weather readings. Another pilot in the area can answer your comms, and the station can coordinate a different handoff if asked.

**Question:** How do you give the delivery its best chance?

| Answer | Player-facing first-person statement | Candidate bias keys | Candidate ontology topics |
|---|---|---|---|
| **A** | I take the canyon and rely on disciplined control to handle the crosswinds. The faster route is risky, but reaching the station in time matters. | `pilotMastery`, `tacticalAwareness` · role `flex` | `vehicle`, `movement`, `mobility` |
| **B** | I study the buoy's readings and chart the least dangerous line through the canyon. I want a shortcut I understand, not a blind leap. | `tacticalAwareness`, `skillUtility` · role `scout` | `vehicle`, `sensors`, `tactics` |
| **C** | I use the marked route and look for safe opportunities to increase my pace. A dependable delivery is better than wrecking the only supplies. | `pilotMastery`, `evasion` · role `defender` | `vehicle`, `movement`, `evasion` |
| **D** | I contact the other pilot and ask for live crosswind reports as I approach. Sharing information may make the unfamiliar route manageable. | `tacticalAwareness`, `allySupport`, `skillUtility` · role `support` | `vehicle`, `teamwork`, `sensors` |
| **E** | I ask the station to prepare a pickup point closer to the canyon mouth. Changing the handoff could solve a problem raw speed will not. | `resourcefulness`, `allySupport`, `tacticalAwareness` · role `utility` | `vehicle`, `tactics`, `teamwork` |

**Developer-only distinctions (not read to player):**

- **A:** Commit to a calculated high-tempo route; not a claim of Full Throttle ownership or automatic speed modification.
- **B:** Choose navigation research and informed approach; does not assume a specific sensor mechanic.
- **C:** Favor speed within risk limits; not an automatic Outrun benefit.
- **D:** Seek active pilot cooperation; the other pilot is not presumed subordinate or already an ally.
- **E:** Reframe the logistics and coordinate with the recipient; no automatic feat, talent, or mechanical bonus.

**Mechanical learning / legal boundary:** Possible growth directions include Expert Pilot pursuit/speed/control (e.g., Full Throttle; Core Rulebook p. 207) and Blockade Runner speed/evasion (e.g., Outrun; Scum and Villainy pp. 25–26). Printed activation circumstances and prerequisites still apply. An Ace Pilot can be a durable end vocation rather than a stepping stone; the scenario does not presume any further class.

## Q1 → Q3 default routing and coverage

| Default scenario | Q1 IDs assigned | Count |
|---|---|---:|
| AP-Q3-S01 — The Closing Passage | `AP-Q1-WM01`, `AP-Q1-WM02`, `AP-Q1-WM03`, `AP-Q1-BR01`, `AP-Q1-BR04`, `AP-Q1-EP02`, `AP-Q1-BR03` | 7 |
| AP-Q3-S02 — The Disabled Target | `AP-Q1-GN01`, `AP-Q1-GN02`, `AP-Q1-GN03`, `AP-Q1-GN04`, `AP-Q1-GN05`, `AP-Q1-GN06`, `AP-Q1-EP05`, `AP-Q1-WM05` | 8 |
| AP-Q3-S03 — The Broken Formation | `AP-Q1-SL01`, `AP-Q1-SL02`, `AP-Q1-SL03`, `AP-Q1-SL04`, `AP-Q1-EP07`, `AP-Q1-WM04`, `AP-Q1-EP01` | 7 |
| AP-Q3-S04 — The Failing Systems | `AP-Q1-SP01`, `AP-Q1-SP02`, `AP-Q1-SP03`, `AP-Q1-SP04`, `AP-Q1-EP04`, `AP-Q1-EP06`, `AP-Q1-ID01` | 7 |
| AP-Q3-S05 — The Impossible Route | `AP-Q1-EP03`, `AP-Q1-BR02`, `AP-Q1-ID02`, `AP-Q1-NEUTRAL` | 4 |

**Audit:** Exactly 33 distinct Ace Pilot Q1 IDs from the source Q1 bank appear once in the default Q3 routing matrix: 7 Expert Pilot + 6 Gunner + 4 Spacer + 4 Squadron Leader + 4 Blockade Runner + 5 Wingman + 2 class-identity + 1 undecided. The route is **scenario relevance**, not additional Q1 scoring. Other situations remain discoverable via non-scoring navigation.

## Data and interaction contract (proposed)

1. **Question placement:** one of five Mayu scenarios in Q3, independent of Q4/Q5. Display five substantive first-person choices A–E. Do not make the player answer all five situations.
2. **Selection:** explicit Q1 response ID identifies the default. Q2 and a provenance-backed actor snapshot may influence alternate situation ordering or safe conditional wording, but cannot overwrite declared interest or invent experience. A Q1 undecided route must remain unbiased and permit an alternate situation.
3. **Alternate controls:** "Something else / another situation" changes the situation without scoring; "I cannot decide yet" is an always-available neutral selection and contributes no directional data. Both are outside the **25** substantive answer total. An unchosen response is **not a negative preference**.
4. **One event per final chosen response:** proposed event contains `survey=prestige`, `question=Q3`, typed prestige class ID, `scenarioId`, `responseId`, original first-person text version, Mentor ID, actor snapshot reference, declared Q1 route, timestamp/advancement transaction reference, and candidate keys validated at runtime. This is an event proposal, not a verified existing DTO.
5. **No independent scoring:** no coefficients, automatic weights, new keys, morality/alignment interpretation, hard specialization locks, or automatic feat/talent/class acquisition. Preserve the existing Suggestion Engine as mechanical and legality authority.
6. **Tag translation gate:** only exact current 125 mechanical-bias keys, 12 role keys and 190 ontology terms are listed. Crosswalk from a survey intent choice to production Suggestion Engine input is **unverified**. Audit identity survey bias, tag signal engine, duplicate evidence paths, ontology exact-skill policies and action finalization before implementation.
7. **Mechanical education:** optional player-visible concise notes can link the answer to plausible printed paths, but only after source/level/prerequisite checks. Notes are explanatory and do not emit votes. Do not turn examples such as Run Interference, Crippling Hit, Full Throttle, or Squadron Tactics into already-owned features.

## Required QA / acceptance

- [x] Five scenario IDs; 25 unique answer IDs; first-person A–E; five semantically different decisions in each situation.
- [x] All 33 source Q1 Ace Pilot response IDs assigned once to default situations; all six published talent-tree families represented.
- [x] Every proposed mechanicalBias/role key and ontology topic name checked against source-retrieved canonical name lists (not yet certified as a valid binding or effect).
- [x] Mentor voice compared with Mayu’s dedicated dialogue JSON; avoids false acquaintance and invented heroics.
- [x] No assumed ship ownership, command rank, feat/talent ownership, automatically acquired Vehicle Dodge or forced next prestige class.
- [ ] Owner review of five dilemmas, response tradeoffs, Mayu lines, and six-tree fairness.
- [ ] Mechanically certify each teaching hint against its exact book page, prerequisites, character progression and current V2 pack; unverified engine/event contract.
- [ ] Confirm a production-authorized schema for candidate-intent keys and optional ontology topics, including policy-safe handling of direct skill tags and partial projection gaps.
- [ ] Exercise build fixtures with Q1 route + Q2 evidence, sparse actors, unusual vehicles, character capstone, navigation, retake/re-entry, and legality gating.

## Test cases to run before implementation

| Fixture | Q1 / context | Expected presentation and side effects |
|---|---|---|
| Wingman in training | `AP-Q1-WM03`, no owned Escort Pilot / Run Interference | Default S01; five answers; no earned talent inferred; only final answer event scored. |
| Vehicle gunner | `AP-Q1-GN03`, no personal vehicle | Default S02; story assigns temporary hypothetical gunner station; system never asserts ownership or system-disabling talent. |
| Would-be coordinator | `AP-Q1-SL04`, no rank or squad | Default S03; asks how to cooperate; neither Mayu nor options call the PC a commander. |
| Multi-vehicle enthusiast | `AP-Q1-ID01`, sparse technical history | Default S04; shipboard/technical approaches are aspirations, not proven zero-g or Mechanics abilities. |
| Ace as life vocation | `AP-Q1-ID02`, original career goal also recorded | Default S05; no need to acquire another prestige class; original declared goal persists. |
| Q1 undecided | `AP-Q1-NEUTRAL`, sparse actor | Stable default S05 but offer browsing; does not invent expertise or a declared specialty. |
| Navigate or leave unanswered | Any route, press "another situation" or neutral | Zero positive/negative bias keys; never count viewed answers or changed story choices as votes. |
| Distinct divergent answers | Q1 defensive, Q3 selects precision fire | Preserve both independently; do not treat Q3 as contradiction or erase prior survey evidence. |

## Expansion to remaining 31 PrCs

Use the **same record shape**, not the same five generic dilemmas. Each PrC needs five situationally distinct contexts and five class-appropriate approaches per situation; class-specific Mentor voice, printed mechanical paths, 125-key validation, 190-topic name validation and Q1 coverage are mandatory. The overall 32-class production target is 160 scenarios and 800 substantive responses. This package covers **one** PrC (5/160 scenarios, 25/800 responses), not the other 31.

## Machine-readable companion

`SWSE_Prestige_Q3_Ace_Pilot_Scenario_Library_v01.json` contains exact scenario IDs, 25 response IDs, tentative validated canonical vocabulary strings, routing arrays, and non-scoring/consumption boundaries. This JSON is a **design artifact**, not runtime-importable production data.


---

# SOURCE DOCUMENT: Batch 1 — `SWSE_Prestige_Q3_Batch1_Five_Classes_v01.md`

# SWSE Prestige Survey — Q3 *The Responsibility* — Batch 1 (Five Classes)

**Version:** 0.1 · 2026-11-14
**State:** Complete first-pass editorial draft for owner review. **Not mechanically certified, live implemented, committed, or pushed.**
**Anchor:** Owner-approved Ace Pilot Q3 reference (5 scenarios × 5 responses).

## Purpose, constraints and data authorities

This batch develops five Q3 situations and five first-person player responses **per class**: Bounty Hunter, Crime Lord, Elite Trooper, Force Adept and Force Disciple. The player receives **one** contextually appropriate situation at Q3, not five in succession. Q3 investigates how a character *would act*, not which skills were already demonstrated or which abilities have been granted.

The authored content takes its scenario-and-method model from the Level 1 adaptive Mentor survey while preserving the separate prestige survey Q1–Q6 identity boundaries. The Ace Pilot file is the owner-approved editorial reference; this five-class batch itself is submitted for review.

- **Sources:** Prestige Q1 rolling design and Q2 synthesis from `design/prestige-q2-character-synthesis-v08`; the five individual Mentor JSON files; `data/dialogue/mentor_registry.json`; printed SWSE material cited by the source-audited Q1 design; `data/bias-keys-canonical.json` (125 mechanical, 12 role, 6 attribute keys) and `data/audits/talent-feat-phase3-final-ontology.json` (190 tags).
- **Selection:** Resolve the player's exact selected Q1 ID to exactly one primary Q3 situation per class. Verified Q2/actor evidence can adjust relevance or give a choice of alternate authored scenarios without counting Q1/Q2 again. Never synthesize live uncensored prompts from guesses about biography.
- **Five answers:** A–E are independent substantive, first-person methods. Add a separate unscored **“I am not sure yet”** option and an unscored **“Try another situation”** navigation control, not a sixth scoring answer.
- **Signals:** Only the chosen A–E response proposes one Q3 intent event with `scenarioId`, `responseId`, chosen Mentor and class, acquisition state and provenanced snapshot. Other options, the narrator, opening screens and route selection do not score. Numeric weight, score addition and projection to actual engine consumers require a separate architectural audit.
- **Strict taxonomy:** `mechanicalBiasKeys` and `roleBiasKey` refer to canonical keys. `ontologyTopicCandidates` are **editorial topic candidates only**, **not certified effects** of any feat, talent or existing actor capability. The 190-tag ontology applies exact-skill and other operative-mechanics policies; no automatic conversion is approved.
- **Eligibility:** Q3 is always a hypothetical. Never imply ownership of a feat/talent, a Force secret or technique, a Minion, a named ally or ship, a Force tradition, Dark Side Score, an order's membership, a military commission, or prior missions. Answer labels must remain legible without developer notes.

## Structural completion and review checkpoint

| Class | Mentor | Scenarios | Substantive answers | Unique Q1 routes covered |
|---|---|---:|---:|---:|
| Bounty Hunter | Kex Varon | 5 | 25 | 43 / 43 |
| Crime Lord | Tío the Hutt | 5 | 25 | 34 / 34 |
| Elite Trooper | Breach | 5 | 25 | 62 / 62 |
| Force Adept | Seeker Vera | 5 | 25 | 40 / 40 |
| Force Disciple | Riquis | 5 | 25 | 52 / 52 |
| **Batch total** | | **25** | **125** | **231 / 231** |

**Validation:** PASS on exact route partition, 5×5 response coverage, first-person answer format, unique scenario and answer IDs, 125-key canonical vocabulary membership and 190-ontology name membership. **NOT tested:** scored engine ingestion, actual actor eligibility, full printed per-talent mechanics, production class routing, alignment conditions, Mentor owner approval or visual UI QA.

## Bounty Hunter — Kex Varon (`m15`)

**Mentor file:** `data/dialogue/mentors/kex_varon/kex_varon_dialogue.json`

**Shared Mentor Q3 opening — DRAFT:**
> A reputation gets you noticed. A decision under pressure tells me whether you finish the contract. Consider this.

### BH-Q3-S01 — The Vanishing Trail

**Narrative focus:** Investigation and patient tracking without an automatic combat conclusion
**Primary Q1 routes:** `AW01`, `AW02`, `BH03`, `BH12`, `BH13`, `BH14`, `BH15`, `BH16`
**Published development domains (not guaranteed class grants):** Awareness, Bounty Hunter: investigation

**Kex Varon:** “A missing person, three false leads, and a clock. A trigger finger will not find the right door.”

**Situation:** A client wants a missing courier found alive. Records put the courier at a busy port, but the trail ends there. Witnesses disagree, surveillance is incomplete, and the client cannot explain why the courier vanished. You have no evidence that the courier is guilty or in immediate danger.

**Question:** Where do you begin?

**Five first-person methods:**

**A — I examine the last reliable sighting and rebuild the route from small physical details before I follow anyone's accusation.**

Developer interpretation: Physical evidence first; distinguish the courier from the rumors around them.
Candidate existing bias keys: `trackingMastery`, `tacticalAwareness` · role `scout`. Candidate ontology topics (NOT certified operative effects): `tracking`, `investigation`.
Printed development connection (conditional): Awareness: Acute Senses, Expert Tracker (conditional prerequisites).

**B — I question the people who handled the courier's business, comparing their accounts until a contradiction gives me a solid lead.**

Developer interpretation: Patient interviewing and information verification instead of presumed intimidation.
Candidate existing bias keys: `informationControl`, `knowledgeMastery` · role `utility`. Candidate ontology topics (NOT certified operative effects): `investigation`, `social`.
Printed development connection (conditional): Bounty Hunter: Nowhere to Hide, Detective; Gather Information applications are conditional.

**C — I trace travel payments, terminal access, and communications to find a route the courier could not easily erase.**

Developer interpretation: Digital records as a method; never assume computer access or a hacking feat.
Candidate existing bias keys: `hackingSkills`, `informationControl` · role `utility`. Candidate ontology topics (NOT certified operative effects): `tech`, `investigation`.
Printed development connection (conditional): Bounty Hunter: Electronic Trail requires Nowhere to Hide and trained Use Computer.

**D — I inspect who gains from the disappearance before I commit to any one story. A false client is as dangerous as a false trail.**

Developer interpretation: Context and incentives; avoid equating a contract with objective truth.
Candidate existing bias keys: `tacticalAwareness`, `knowledgeMastery` · role `scout`. Candidate ontology topics (NOT certified operative effects): `investigation`, `planning`.
Printed development connection (conditional): Bounty Hunter: investigative talent directions; class does not establish guilt.

**E — I watch the last known location discreetly and let anyone following the same trail expose themselves before I move.**

Developer interpretation: Surveillance and controlled observation without claiming a capture.
Candidate existing bias keys: `stealth`, `tacticalAwareness` · role `scout`. Candidate ontology topics (NOT certified operative effects): `stealth`, `awareness`.
Printed development connection (conditional): Awareness and Misfortune are separate trees; stealth is an approach, not a grant.

**Mechanical teaching and legality guardrail:** Possible published development: Acute Senses, Expert Tracker (Awareness); Nowhere to Hide, Detective, Electronic Trail (Bounty Hunter). Electronic Trail requires its printed trained-skill/prerequisite chain; these are paths, not possessed talents.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### BH-Q3-S02 — The Live Handoff

**Narrative focus:** Capturing a quarry alive without assuming a method, warrant, or restraint talent
**Primary Q1 routes:** `BH17`, `BH-Q1-ID01`
**Published development domains (not guaranteed class grants):** Bounty Hunter: live capture, Awareness: positioning

**Kex Varon:** “The contract says alive. That does not mean the quarry intends to cooperate.”

**Situation:** You have located a courier who is wanted for questioning under a valid contract specifying live delivery. The courier is in a crowded market and looks ready to flee. Armed security personnel are nearby, but they are not working for you. A violent confrontation could injure bystanders or make a lawful handoff impossible.

**Question:** How do you attempt the capture?

**Five first-person methods:**

**A — I approach openly, identify the contract, and offer the courier a chance to come peacefully before anyone reaches for a weapon.**

Developer interpretation: Voluntary cooperation over coercion; contract alone does not compel surrender.
Candidate existing bias keys: `persuasionMastery`, `tacticalAwareness` · role `utility`. Candidate ontology topics (NOT certified operative effects): `persuasion`, `social`.
Printed development connection (conditional): Professional negotiation; Persuasion skill if actually trained or otherwise usable.

**B — I take a position that cuts off the clearest exit, keeping the crowd out of the line of any confrontation.**

Developer interpretation: Control escape lanes without invented restraint or free movement suppression.
Candidate existing bias keys: `trackingMastery`, `areaControl` · role `controller`. Candidate ontology topics (NOT certified operative effects): `positioning`, `pursuit`.
Printed development connection (conditional): Bounty Hunter: Nowhere to Run is a later prerequisite-gated path.

**C — I look for a safe moment to seize and restrain the courier without drawing a crowd into the struggle.**

Developer interpretation: Close capture using applicable normal rules, without promising an automatic grapple success.
Candidate existing bias keys: `grappling`, `skillUtility` · role `controller`. Candidate ontology topics (NOT certified operative effects): `grab`, `control`.
Printed development connection (conditional): Bounty Hunter: Quick Cuffs requires Quick Draw, binder cuffs and successful grab.

**D — I coordinate a lawful handoff with local security so the courier has less reason to panic or fight.**

Developer interpretation: Cooperation offered to independent security, not an assumed authority over them.
Candidate existing bias keys: `allySupport`, `informationControl` · role `support`. Candidate ontology topics (NOT certified operative effects): `teamwork`, `social`.
Printed development connection (conditional): Contact/coordination is narrative; no automatic minion or command feature.

**E — I let the courier move and follow from a distance until there is a safer place to make the attempt.**

Developer interpretation: Patient pursuit trades immediate capture for a less crowded encounter.
Candidate existing bias keys: `trackingMastery`, `stealth` · role `scout`. Candidate ontology topics (NOT certified operative effects): `tracking`, `stealth`.
Printed development connection (conditional): Awareness: tracker; class Bounty Hunter: locating targets.

**Mechanical teaching and legality guardrail:** Possible directions: Quick Cuffs (Unknown Regions, requires Quick Draw, appropriate binder cuffs and a successful grab), Nowhere to Run (Scum and Villainy, prerequisites), and tracking/negotiation. Do not imply any free nonlethal combat mechanic or owned restraints.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### BH-Q3-S03 — The Price of the Contract

**Narrative focus:** Reputation, leverage and professional ethics when the assignment changes
**Primary Q1 routes:** `BH04`, `BH05`, `BH07`, `BH08`, `BH09`, `BH-Q1-ID02`
**Published development domains (not guaranteed class grants):** Bounty Hunter: reputation, Negotiation and target verification

**Kex Varon:** “The target was the easy part. The payment conversation is where mistakes become expensive.”

**Situation:** You reach a meeting with a prospective employer who wants a fugitive located. The employer offers a high fee but refuses to disclose why the fugitive is wanted. A separate witness claims the employer has concealed important facts. The employer demands a decision before another hunter takes the offer.

**Question:** What terms do you set?

**Five first-person methods:**

**A — I refuse to accept a target on the employer's word alone. I verify the contract and the fugitive's status before I agree.**

Developer interpretation: Evidence verification and professionalism, not a moral alignment reward.
Candidate existing bias keys: `informationControl`, `knowledgeMastery` · role `scout`. Candidate ontology topics (NOT certified operative effects): `investigation`, `planning`.
Printed development connection (conditional): Nowhere to Hide and Detective support later investigation-oriented directions.

**B — I negotiate for clear conditions, a fair fee, and payment terms that do not leave me carrying all the risk.**

Developer interpretation: Contract leverage and commercial judgment, not automatic bonus credits.
Candidate existing bias keys: `persuasionMastery`, `businessAcumen` · role `utility`. Candidate ontology topics (NOT certified operative effects): `persuasion`, `resources`.
Printed development connection (conditional): Bounty Hunter: Ruthless Negotiator requires Notorious.

**C — I make it clear that my reputation has a price. If the employer wants my services, they answer my questions first.**

Developer interpretation: Reputation as pressure; no automatic obedience or mind-affecting effect.
Candidate existing bias keys: `intimidation`, `authorityPresence` · role `leader`. Candidate ontology topics (NOT certified operative effects): `intimidation`, `social`.
Printed development connection (conditional): Bounty Hunter: Notorious; Fearsome or Dread only with prerequisites.

**D — I speak to the witness privately and test both accounts. I want enough information to make my own decision.**

Developer interpretation: Cross-check conflicting sources instead of treating a witness as proven truthful.
Candidate existing bias keys: `informationControl`, `networkInfluence` · role `scout`. Candidate ontology topics (NOT certified operative effects): `investigation`, `social`.
Printed development connection (conditional): Bounty Hunter: investigative paths; no established informant network assumed.

**E — I decline this offer and take a lower-paying assignment whose objective and limits I can actually judge.**

Developer interpretation: Professional autonomy and risk management; does not declare pacifism.
Candidate existing bias keys: `independence`, `resourceControl` · role `utility`. Candidate ontology topics (NOT certified operative effects): `resources`, `planning`.
Printed development connection (conditional): Class identity: independent hunter, capstone remains a legitimate destination.

**Mechanical teaching and legality guardrail:** Published directions: Notorious, Ruthless Negotiator, Fearsome, Dread and Signature Item have individual prerequisites and limits; invoking a reputation in fiction does not grant mechanical fear, an item, or a negotiation reroll.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### BH-Q3-S04 — The Quarry Who Feels You Coming

**Narrative focus:** Specialized approach to a potentially Force-sensitive target without presumed Force access
**Primary Q1 routes:** `FH01`, `FH02`, `FH03`, `FH04`, `FH05`, `FH06`, `GF01`, `GF02`, `GF03`, `GF04`, `BH18`, `AW03`
**Published development domains (not guaranteed class grants):** Force Hunter, Gand Findsman: conditional cultural route, Awareness

**Kex Varon:** “Some targets see the net before it closes. Then you check the net twice.”

**Situation:** A credible lead suggests a missing suspect can sense danger through the Force. You are not certain what the suspect can do. You have a public sighting, a possible safe house, and a witness who will only talk at dusk. The contract permits capture, but you must first decide how to approach someone who may anticipate you.

**Question:** How do you adjust your plan?

**Five first-person methods:**

**A — I keep my approach ordinary and quiet, using observation and cover instead of betting on tricks I do not possess.**

Developer interpretation: Subtle entry; does not claim Force Blank or a trained Stealth skill.
Candidate existing bias keys: `stealth`, `infiltration` · role `scout`. Candidate ontology topics (NOT certified operative effects): `stealth`, `concealment`.
Printed development connection (conditional): Force Hunter: Force Blank is a conditional later talent, not guaranteed invisibility.

**B — I study the suspect's known habits and prepare fallback positions so one sensed approach does not end the hunt.**

Developer interpretation: Preparation and adaptability without omniscient knowledge of Force powers.
Candidate existing bias keys: `tacticalAwareness`, `trackingMastery` · role `scout`. Candidate ontology topics (NOT certified operative effects): `planning`, `pursuit`.
Printed development connection (conditional): Awareness tracking and Force Hunter responsive tactics.

**C — I choose a position with a clear retreat and keep my distance until I understand what the suspect can do.**

Developer interpretation: Survival through spacing rather than direct resistance to all Force powers.
Candidate existing bias keys: `evasion`, `reactionDefense` · role `defender`. Candidate ontology topics (NOT certified operative effects): `evasion`, `positioning`.
Printed development connection (conditional): Force Hunter: Lightsaber Evasion, Telekinetic Resistance are narrowly scoped.

**D — I speak with the witness and look for a way to earn the suspect's cooperation before forcing an encounter.**

Developer interpretation: De-escalation and intelligence; no guarantee of mind reading or persuasion success.
Candidate existing bias keys: `persuasionMastery`, `informationControl` · role `utility`. Candidate ontology topics (NOT certified operative effects): `social`, `investigation`.
Printed development connection (conditional): Generic negotiation and investigative routes remain legitimate.

**E — I consider the rites of a tradition I have actually trained in, if that path is open to me; otherwise I rely on what I can verify.**

Developer interpretation: Conditional spiritual method, never implies Gand identity or Force Sensitivity.
Candidate existing bias keys: `knowledgeMastery`, `mysticalInfluence` · role `utility`. Candidate ontology topics (NOT certified operative effects): `force`, `awareness`.
Printed development connection (conditional): Gand Findsman talent paths require exact printed eligibility and costs.

**Mechanical teaching and legality guardrail:** Force Hunter tree in Legacy Era p.40 has narrowly defined defenses and tactics. Gand Findsman in Scum and Villainy is a restricted tradition with Force Sensitivity and further talent prerequisites. Narrative omens/Force resistance cannot grant tradition access or special immunity.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### BH-Q3-S05 — The Hunter Becomes the Mark

**Narrative focus:** Tactical judgment when the target appears to be baiting the pursuer
**Primary Q1 routes:** `AW04`, `AW05`, `AW06`, `BH01`, `BH02`, `BH06`, `BH10`, `BH11`, `MF01`, `MF02`, `MF03`, `MF04`, `MF05`, `MF06`, `BH-Q1-NEUTRAL`
**Published development domains (not guaranteed class grants):** Bounty Hunter: tactical pursuit, Misfortune, Awareness: danger response

**Kex Varon:** “You have the lead. Then the lead turns around and looks right at you. That is the part worth planning for.”

**Situation:** You locate a dangerous fugitive at an abandoned loading yard. The fugitive has taken cover near several unoccupied cargo containers and seems to be waiting. The exits are visible but there may be accomplices nearby. You can communicate with one independent contact who is a few blocks away.

**Question:** What is your next move?

**Five first-person methods:**

**A — I hold my distance and watch for movement until I know whether the fugitive is alone or trying to draw me in.**

Developer interpretation: Information before engagement; no guaranteed detection of ambush.
Candidate existing bias keys: `tacticalAwareness`, `trackingMastery` · role `scout`. Candidate ontology topics (NOT certified operative effects): `awareness`, `investigation`.
Printed development connection (conditional): Awareness: Acute Senses and anti-ambush development.

**B — I prepare one deliberate shot against the threat that matters most, rather than firing at every movement.**

Developer interpretation: Focused offense; does not assert an owned Hunter's Mark.
Candidate existing bias keys: `accuracy`, `singleTargetDamage` · role `striker`. Candidate ontology topics (NOT certified operative effects): `targeting`, `precision`.
Printed development connection (conditional): Bounty Hunter: Hunter's Mark and Hunter's Target are prerequisite-gated.

**C — I move between covered positions, looking for an angle that denies the fugitive an easy escape.**

Developer interpretation: Mobile pressure and controlled approach, not a free skirmish bonus.
Candidate existing bias keys: `evasion`, `stealth` · role `skirmisher`. Candidate ontology topics (NOT certified operative effects): `mobility`, `positioning`.
Printed development connection (conditional): Misfortune: Skirmisher requires movement and applies only under printed rules.

**D — I call my contact, share what I can confirm, and ask them to watch the far exit rather than charge in.**

Developer interpretation: Coordination with a willing contact, not a follower grant or command.
Candidate existing bias keys: `allySupport`, `informationControl` · role `support`. Candidate ontology topics (NOT certified operative effects): `teamwork`, `tracking`.
Printed development connection (conditional): Bounty Hunter: Tag is conditional; ordinary communications do not grant its effects.

**E — I signal the fugitive that I know this may be a trap and offer a chance to stand down before I close.**

Developer interpretation: Verbal pressure and conditional surrender; never automatic fear or compliance.
Candidate existing bias keys: `intimidation`, `persuasionMastery` · role `controller`. Candidate ontology topics (NOT certified operative effects): `intimidation`, `persuasion`.
Printed development connection (conditional): Bounty Hunter: Dread/Notorious depend on exact prerequisites and uses.

**Mechanical teaching and legality guardrail:** Core Bounty Hunter: Hunter's Mark/Hunter's Target and Misfortune: Skirmisher/Dastardly Strike are conditional. Scum and Villainy: Tag/Nowhere to Run demand prerequisite chains. No free favored enemy, sneak attack or movement-triggered attack.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

## Crime Lord — Tío the Hutt (`m08`)

**Mentor file:** `data/dialogue/mentors/tio_the_hutt/tio_the_hutt_dialogue.json`

**Shared Mentor Q3 opening — DRAFT:**
> Ah, my friend. Influence is not what you possess; it is what you do when everyone wants something. Let us talk business.

### CL-Q3-S01 — The Deal With Two Prices

**Narrative focus:** Negotiating leverage without equating influence with threats
**Primary Q1 routes:** `CL-IF08`, `CL-IF09`, `CL-IN01`, `CL-IN02`, `CL-IN03`, `CL-IN04`, `CL-IN05`, `CL-IN06`
**Published development domains (not guaranteed class grants):** Influence, Infamy: relationships

**Tío the Hutt:** “Ah, two offers and neither is the whole truth. Business is improving already.”

**Situation:** Two freight operators want your help negotiating access to a disputed warehouse. Both promise future favors, but each is withholding something about the lease. The warehouse also supplies a neighborhood clinic. You have influence with neither party yet, and neither is obligated to follow your advice.

**Question:** How would you try to shape the deal?

**Five first-person methods:**

**A — I ask what each operator really needs, then offer an exchange that gives both a reason to honor the agreement.**

Developer interpretation: Mutual-interest negotiation rather than coercion.
Candidate existing bias keys: `persuasionMastery`, `businessAcumen` · role `utility`. Candidate ontology topics (NOT certified operative effects): `persuasion`, `social`.
Printed development connection (conditional): Influence: Persuasion-oriented development; no guaranteed settlement.

**B — I establish which legal claim is strongest and make access contingent on a transparent record of obligations.**

Developer interpretation: Verify information and define obligations rather than assuming lawful ownership.
Candidate existing bias keys: `knowledgeMastery`, `resourceControl` · role `utility`. Candidate ontology topics (NOT certified operative effects): `investigation`, `resources`.
Printed development connection (conditional): Mastermind planning; no automatic legal authority or Property feat.

**C — I let each party see that a dishonest deal will cost them access to my help and to each other.**

Developer interpretation: Reputation-based bargaining pressure without assumed fear effects.
Candidate existing bias keys: `socialManipulation`, `intimidation` · role `controller`. Candidate ontology topics (NOT certified operative effects): `intimidation`, `social`.
Printed development connection (conditional): Infamy: Notorious/Shared Notoriety require exact talents and conditions.

**D — I bring the clinic into the negotiation so its needs become the condition both operators must account for.**

Developer interpretation: Third-party coalition and protective use of influence, not a moral score.
Candidate existing bias keys: `networkInfluence`, `allySupport` · role `support`. Candidate ontology topics (NOT certified operative effects): `social`, `support`.
Printed development connection (conditional): Mastermind/Influence paths, but no automatic minion or institutional allegiance.

**E — I decline to settle a deal built on missing facts and quietly investigate why both sides want the warehouse.**

Developer interpretation: Information gathering and refusal to be rushed; may sacrifice influence.
Candidate existing bias keys: `informationControl`, `tacticalAwareness` · role `scout`. Candidate ontology topics (NOT certified operative effects): `intrigue`, `investigation`.
Printed development connection (conditional): Infamy: Small Favor only if owned and its uses met.

**Mechanical teaching and legality guardrail:** The published Influence tree includes Presence, Demand Surrender, Weaken Resolve, Fluster and Intimidating Defense, with important combat and Persuasion prerequisites. The Infamy tree includes Master Manipulator and Small Favor. Negotiating a dispute is narrative intent, not an automatic Persuasion bonus or established criminal asset.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### CL-Q3-S02 — The Broken Network

**Narrative focus:** Building a reliable operation through delegation, redundancy and alliances
**Primary Q1 routes:** `CL-MM01`, `CL-MM13`, `CL-MM14`, `CL-ID01`
**Published development domains (not guaranteed class grants):** Mastermind: recruitment, Institutional purpose without empire

**Tío the Hutt:** “You want people to depend on your word? Start by learning what happens when one of them stops answering.”

**Situation:** A small coalition of traders and neighborhood organizers has asked you to advise its delivery network. One courier has disappeared, another threatens to quit, and a local rival is offering easier terms to defectors. You do not own this network or command the people in it. Without a plan, deliveries may stop.

**Question:** What do you advise first?

**Five first-person methods:**

**A — I meet the couriers individually, find out why trust has failed, and offer a reason to stay that goes beyond threats.**

Developer interpretation: Retention by confidence and honest incentives, no commanded allegiance.
Candidate existing bias keys: `persuasionMastery`, `moraleBonus` · role `leader`. Candidate ontology topics (NOT certified operative effects): `persuasion`, `leadership`.
Printed development connection (conditional): Mastermind: recruitment and support directions; not an owned minion.

**B — I divide critical deliveries among independent routes so one missing courier cannot collapse everything.**

Developer interpretation: Redundancy and contingency planning; no guaranteed resources.
Candidate existing bias keys: `tacticalAwareness`, `resourceControl` · role `utility`. Candidate ontology topics (NOT certified operative effects): `planning`, `resources`.
Printed development connection (conditional): Mastermind: contingency / coordination directions; grants not presumed.

**C — I propose recruiting a specialist who understands the rival's methods before we expand the network.**

Developer interpretation: Skilled outside help, not a follower stat block.
Candidate existing bias keys: `networkInfluence`, `knowledgeMastery` · role `utility`. Candidate ontology topics (NOT certified operative effects): `network`, `investigation`.
Printed development connection (conditional): Attract Superior Minion has printed talent prerequisites, not immediate availability.

**D — I speak with the rival directly and see whether a limited partnership serves both sides better than a prolonged contest.**

Developer interpretation: Strategic alliance rather than universal dominance.
Candidate existing bias keys: `businessAcumen`, `persuasionMastery` · role `utility`. Candidate ontology topics (NOT certified operative effects): `social`, `resources`.
Printed development connection (conditional): Influence and Mastermind are independent development possibilities.

**E — I secure the most vulnerable delivery first and let the coalition judge the results before asking for more responsibility.**

Developer interpretation: Proof through a bounded service instead of presumptive command.
Candidate existing bias keys: `allySupport`, `resourcefulness` · role `support`. Candidate ontology topics (NOT certified operative effects): `support`, `resources`.
Printed development connection (conditional): No class feature automatically grants ownership of routes or allies.

**Mechanical teaching and legality guardrail:** Mastermind talents Attract Minion, Wealth of Allies and Attract Superior Minion have class level, prerequisite, and follower limits; they do not create a free company or obligate the fictional coalition to obey. Crime Lord need not be malicious.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### CL-Q3-S03 — The Public Challenge

**Narrative focus:** Fear, persuasion and restraint when others are watching
**Primary Q1 routes:** `CL-IF01`, `CL-IF02`, `CL-IF03`, `CL-IF04`, `CL-IF05`, `CL-IF06`, `CL-IF07`, `CL-MM08`
**Published development domains (not guaranteed class grants):** Infamy: fear and reputation, Mastermind: shared attention

**Tío the Hutt:** “One loud rival and an audience. Careful. The audience is the part you keep afterward.”

**Situation:** At a public meeting, a rival broker accuses you of cheating a mutual client and demands that you surrender an agreed payment. The broker has several supporters, but nobody is yet violent. Some witnesses doubt the accusation; others are waiting to see whether you escalate.

**Question:** How do you respond?

**Five first-person methods:**

**A — I ask the broker to state the accusation clearly in front of witnesses and answer it with evidence.**

Developer interpretation: Credibility by public fact checking, not guaranteed truth.
Candidate existing bias keys: `informationControl`, `persuasionMastery` · role `utility`. Candidate ontology topics (NOT certified operative effects): `investigation`, `persuasion`.
Printed development connection (conditional): Influence: social Persuasion path; no specified check outcome.

**B — I make a quiet, unmistakable warning about the cost of spreading a charge the broker cannot prove.**

Developer interpretation: Controlled menace distinct from initiating combat.
Candidate existing bias keys: `intimidation`, `authorityPresence` · role `controller`. Candidate ontology topics (NOT certified operative effects): `intimidation`, `social`.
Printed development connection (conditional): Infamy: Inspire Fear/Notorious have precise eligibility and limits.

**C — I offer a fair private review of the payment and let the broker withdraw the accusation without humiliation.**

Developer interpretation: Face-saving negotiation and reputational resilience.
Candidate existing bias keys: `socialManipulation`, `businessAcumen` · role `utility`. Candidate ontology topics (NOT certified operative effects): `persuasion`, `intrigue`.
Printed development connection (conditional): Infamy: Master Manipulator is conditional; no guaranteed second check.

**D — I ask neutral witnesses to recount what they know, so the crowd evaluates the broker rather than choosing sides by volume.**

Developer interpretation: Distributed credibility and voluntary allied help.
Candidate existing bias keys: `networkInfluence`, `informationControl` · role `leader`. Candidate ontology topics (NOT certified operative effects): `social`, `investigation`.
Printed development connection (conditional): No automatic Shared Notoriety or Inspire Wrath effects.

**E — I leave the meeting before the confrontation becomes violent and make arrangements to settle the dispute where nobody is cornered.**

Developer interpretation: Restraint and strategic timing, not a concession of guilt.
Candidate existing bias keys: `tacticalAwareness`, `resourceControl` · role `defender`. Candidate ontology topics (NOT certified operative effects): `planning`, `positioning`.
Printed development connection (conditional): Mastermind: Contingency Plan is a different, limited mechanical reaction.

**Mechanical teaching and legality guardrail:** Infamy includes Inspire Fear, Notorious, Shared Notoriety, Frighten, Terrify and related talents with tight mind-affecting, minion, level and prerequisite conditions. Mastermind Inspire Wrath concerns allied targeting. Fictional intimidation is not an automatic forced-movement or morale effect.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### CL-Q3-S04 — The Failed Operation

**Narrative focus:** Coordinating a withdrawal and an alternative plan without assumed command
**Primary Q1 routes:** `CL-MM02`, `CL-MM03`, `CL-MM04`, `CL-MM10`, `CL-MM11`, `CL-MM12`, `CL-MM15`, `CL-ID02`
**Published development domains (not guaranteed class grants):** Mastermind: action support, Contingencies and capstone competence

**Tío the Hutt:** “A plan that survives first contact is a fine holonovella. Real work needs a second page.”

**Situation:** A group of willing associates has invited you to coordinate a legal shipment through a contested port. A checkpoint closes early, one vehicle stalls, and an angry crowd blocks the fallback route. The associates are looking to you for advice, but they retain control of their own actions.

**Question:** What do you propose?

**Five first-person methods:**

**A — I assign each willing driver one clear task and coordinate their movement so the stalled vehicle does not trap the rest.**

Developer interpretation: Volunteer-led coordination instead of presumed command authority.
Candidate existing bias keys: `unitCoordination`, `formation` · role `leader`. Candidate ontology topics (NOT certified operative effects): `teamwork`, `tactics`.
Printed development connection (conditional): Mastermind: Impel Ally and Tactical Superiority paths require talents and action costs.

**B — I reroute the undamaged cargo through a documented legal entrance while the stalled vehicle is repaired.**

Developer interpretation: Objective preservation and supply management; no certain alternate route.
Candidate existing bias keys: `tacticalAwareness`, `resourceControl` · role `utility`. Candidate ontology topics (NOT certified operative effects): `planning`, `resources`.
Printed development connection (conditional): Mastermind: contingency and logistics concepts, no granted cargo.

**C — I ask the group to protect the disabled driver and withdraw together before the crowd reaches the vehicles.**

Developer interpretation: Protective group withdrawal, not a free mechanical ally action.
Candidate existing bias keys: `allySupport`, `formation` · role `support`. Candidate ontology topics (NOT certified operative effects): `ally_support`, `teamwork`, `support`.
Printed development connection (conditional): Mastermind: Tactical Withdrawal is limited and prerequisite-gated.

**D — I bargain with the checkpoint supervisor for a temporary exception, knowing the attempt may fail.**

Developer interpretation: Relationship leverage distinct from imposed authority.
Candidate existing bias keys: `persuasionMastery`, `networkInfluence` · role `utility`. Candidate ontology topics (NOT certified operative effects): `persuasion`, `social`.
Printed development connection (conditional): Influence/Persuasion development; no predetermined bypass.

**E — I abandon this run, document the losses, and design a safer schedule before anyone risks the same trap again.**

Developer interpretation: Long-term risk management over short-term winning; no destiny or alignment label.
Candidate existing bias keys: `resourceControl`, `knowledgeMastery` · role `utility`. Candidate ontology topics (NOT certified operative effects): `resources`, `planning`.
Printed development connection (conditional): Mastermind: Contingency Plan has a specific encounter trigger; this is a separate judgment.

**Mechanical teaching and legality guardrail:** Mastermind Impel Ally I-III, Tactical Superiority/Withdrawal, Urgency and Contingency Plan have defined turn actions, sight/range and encounter restrictions; advising willing associates does not grant any action, repositioning, or an owned subordinate.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### CL-Q3-S05 — The Door Between You and Danger

**Narrative focus:** Safety, guards and control of escalation
**Primary Q1 routes:** `CL-MM05`, `CL-MM06`, `CL-MM07`, `CL-MM09`, `CL-MM16`, `CL-NEUTRAL`
**Published development domains (not guaranteed class grants):** Mastermind: bodyguard, Influence and personal risk

**Tío the Hutt:** “Everybody enjoys loyal protection. Until they learn what it costs. Then you learn who is loyal.”

**Situation:** A negotiating session turns tense when armed intruders enter a nearby corridor. Two willing escorts who accompanied the negotiators ask how to respond. There is an unlocked secondary exit, an exposed doorway, and time for only one initial instruction. You are not automatically the escorts' employer.

**Question:** What do you tell them?

**Five first-person methods:**

**A — I direct the escorts to protect the negotiators and guide everyone toward the secondary exit.**

Developer interpretation: Protect others through volunteered cooperation, without granting an extra move.
Candidate existing bias keys: `allySupport`, `unitCoordination` · role `support`. Candidate ontology topics (NOT certified operative effects): `ally_support`, `teamwork`, `support`.
Printed development connection (conditional): Mastermind: Tactical Withdrawal / Impel Ally are possible future talents.

**B — I position myself behind available cover and ask an escort to watch the exposed doorway.**

Developer interpretation: Self-preservation and sensible cover, not a Shelter bonus.
Candidate existing bias keys: `reactionDefense`, `tacticalAwareness` · role `defender`. Candidate ontology topics (NOT certified operative effects): `cover`, `positioning`.
Printed development connection (conditional): Mastermind: Shelter needs an adjacent minion and prerequisites.

**C — I demand that the intruders identify themselves and state what they want before anyone fires.**

Developer interpretation: Verbal challenge and de-escalation without magical authority.
Candidate existing bias keys: `authorityPresence`, `persuasionMastery` · role `controller`. Candidate ontology topics (NOT certified operative effects): `persuasion`, `control`.
Printed development connection (conditional): Influence: Presence, Demand Surrender only under their stated circumstances.

**D — I order no one to fire yet. I want a clear line of escape and a chance to identify the real threat before committing to a fight.**

Developer interpretation: Assess threat and avoid accidental escalation, no automatic command check.
Candidate existing bias keys: `tacticalAwareness`, `informationControl` · role `scout`. Candidate ontology topics (NOT certified operative effects): `awareness`, `planning`.
Printed development connection (conditional): Mastermind's orders are a talent, not a generic literal order.

**E — I ask the escorts to hold the corridor long enough for the others to escape, accepting that we may need to withdraw ourselves.**

Developer interpretation: A deliberate defensive stand, not mandatory self-sacrifice or guaranteed bodyguard interception.
Candidate existing bias keys: `formation`, `allySupport` · role `defender`. Candidate ontology topics (NOT certified operative effects): `teamwork`, `defense`.
Printed development connection (conditional): Bodyguard I-III are minion-dependent conditional talents.

**Mechanical teaching and legality guardrail:** Mastermind Bodyguard I-III, Shelter and Master's Orders require Attract Minion, Impel Ally, adjacency, attack or reroll conditions depending on the talent. Their benefits are not generalized to arbitrary hired guards or this scenario.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

## Elite Trooper — Breach (`m02`)

**Mentor file:** `data/dialogue/mentors/breach/breach_dialogues.json`

**Shared Mentor Q3 opening — DRAFT:**
> Training is easy to talk about. Then the plan breaks. Tell me what you do when it counts.

### ET-Q3-S01 — The Unseen Approach

**Narrative focus:** Covert movement and first contact under ambiguous threat
**Primary Q1 routes:** `ET-CM01`, `ET-CM02`, `ET-CM03`, `ET-CM04`, `ET-CM05`, `ET-CM06`, `ET-CM07`, `ET-RC01`
**Published development domains (not guaranteed class grants):** Camouflage, Republic Commando: conditional ambush direction

**Breach:** “You have a defended route and one chance to reach the objective quietly. No speeches. What is your approach?”

**Situation:** You and two volunteers must retrieve a medical transmitter from a warehouse being watched by armed sentries. The sentries have not noticed you, the warehouse has a maintenance entrance, and the transmitter is urgently needed elsewhere. It is unclear whether the sentries are hostile or merely protecting the site.

**Question:** How do you approach the warehouse?

**Five first-person methods:**

**A — I scout the sentries' sight lines and choose a concealed path to the maintenance door before anyone commits.**

Developer interpretation: Reconnaissance before exposure, no automatic concealment.
Candidate existing bias keys: `stealth`, `tacticalAwareness` · role `scout`. Candidate ontology topics (NOT certified operative effects): `stealth`, `recon`.
Printed development connection (conditional): Camouflage: Hidden Movement and Improved Stealth have individual conditions.

**B — I approach with the transmitter's purpose made clear and give the sentries a chance to let us through.**

Developer interpretation: Direct contact and identification, not automatic surrender.
Candidate existing bias keys: `persuasionMastery`, `informationControl` · role `utility`. Candidate ontology topics (NOT certified operative effects): `persuasion`, `social`.
Printed development connection (conditional): General class-compatible method; no printed Diplomacy talent implied.

**C — I take the safest covered position and prepare to protect the others if the sentries open fire.**

Developer interpretation: Prepared defense, not free Hunker Down or Dig In protection.
Candidate existing bias keys: `reactionDefense`, `allySupport` · role `defender`. Candidate ontology topics (NOT certified operative effects): `cover`, `defense`.
Printed development connection (conditional): Camouflage: Hunker Down, Dig In depend on rules and prerequisites.

**D — I send one willing teammate around the blind side while I draw the sentries' attention away from the door.**

Developer interpretation: Coordinated diversion with an independent teammate; no command or teleportation.
Candidate existing bias keys: `formation`, `tacticalAwareness` · role `support`. Candidate ontology topics (NOT certified operative effects): `teamwork`, `positioning`.
Printed development connection (conditional): Commando: Coordinated Effort and relevant team tactics are potential paths.

**E — I prepare a short, decisive entry only if the sentries prove hostile, focusing on one clear opening instead of indiscriminate fire.**

Developer interpretation: Conditional tactical attack; no claim of a surprise round or owned Ambush.
Candidate existing bias keys: `initiative`, `accuracy` · role `striker`. Candidate ontology topics (NOT certified operative effects): `ambush`, `precision`.
Printed development connection (conditional): Republic Commando: Ambush; Camouflage: Extended Ambush are separate talents.

**Mechanical teaching and legality guardrail:** Camouflage Hidden Movement, Improved Stealth, Hunker Down and related expansions cover distinct conditions. Republic Commando Ambush is a printed expansion, not evidence of Republic military service. A covert approach does not automatically authorize sneak attack or silent takedown.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### ET-Q3-S02 — The Breached Shelter

**Narrative focus:** Protection and survivability when a defensive position fails
**Primary Q1 routes:** `ET-PR01`, `ET-PR02`, `ET-PR03`, `ET-PR04`, `ET-PR05`, `ET-PR06`, `ET-CO05`, `ET-CO06`, `ET-CO08`
**Published development domains (not guaranteed class grants):** Protection, Commando: defensive options

**Breach:** “The wall is failing, people are behind it, and the enemy does not care about your plan. Move.”

**Situation:** A temporary shelter holds wounded evacuees and two defenders. Incoming fire has broken part of the outer wall, and another volley may reach the sheltered group. A service corridor offers an exit, but crossing the open floor exposes anyone who moves.

**Question:** What do you do first?

**Five first-person methods:**

**A — I put my position and available cover between the incoming fire and the most exposed evacuees.**

Developer interpretation: Protective positioning, no guaranteed damage transfer.
Candidate existing bias keys: `allySupport`, `reactionDefense` · role `defender`. Candidate ontology topics (NOT certified operative effects): `cover`, `ally_support`, `support`.
Printed development connection (conditional): Protection: Ward/Armored Guard are potential talent directions.

**B — I organize a staggered evacuation down the service corridor, getting the wounded moving while defenders cover the crossing.**

Developer interpretation: Sequenced withdrawal; not an extra granted action.
Candidate existing bias keys: `unitCoordination`, `formation` · role `leader`. Candidate ontology topics (NOT certified operative effects): `teamwork`, `tactics`.
Printed development connection (conditional): Commando: Out of Harm's Way; Squad Leader: Fall Back are conditional talents.

**C — I hold the broken section as long as it buys the evacuees time, then pull back before I am trapped.**

Developer interpretation: Endurance and position holding, not a claim of already owning Damage Reduction.
Candidate existing bias keys: `combatStamina`, `damageReduction` · role `defender`. Candidate ontology topics (NOT certified operative effects): `durability`, `defense`.
Printed development connection (conditional): Elite Trooper: Delay Damage at first prestige level; DR begins later, with limits.

**D — I focus on identifying the incoming fire's position and stopping the next volley rather than waiting for another hit.**

Developer interpretation: Threat suppression as a way to defend others; no promised suppressive effect.
Candidate existing bias keys: `tacticalAwareness`, `accuracy` · role `striker`. Candidate ontology topics (NOT certified operative effects): `recon`, `targeting`.
Printed development connection (conditional): Commando: Cover Fire or Weapon Master paths only if selected.

**E — I go to the wounded first and find who can move, who needs help, and what supplies are available.**

Developer interpretation: Evacuation triage and practical assistance; no unowned medical ability claimed.
Candidate existing bias keys: `allySupport`, `resourcefulness` · role `support`. Candidate ontology topics (NOT certified operative effects): `support`, `resources`.
Printed development connection (conditional): Skill/aid actions under actual actor capabilities; not free Protection talent.

**Mechanical teaching and legality guardrail:** Elite Trooper Delay Damage at class level 1 is not immunity and does not negate a hit; Damage Reduction starts at class level 2. Protection Ward, Bodyguard's Sacrifice, Lifesaver, Take the Hit etc. require actual talent selection. No automatic ability to take hits for others.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### ET-Q3-S03 — The Last Open Lane

**Narrative focus:** Choice of offensive technique when the objective is contested
**Primary Q1 routes:** `ET-WM01`, `ET-WM02`, `ET-WM03`, `ET-WM04`, `ET-WM05`, `ET-WM06`, `ET-WM07`, `ET-WM08`, `ET-WM09`, `ET-CR01`, `ET-CR02`, `ET-CR03`, `ET-CR04`, `ET-CR05`, `ET-CR06`, `ET-ME01`, `ET-ME02`, `ET-ME03`, `ET-ME04`, `ET-ME05`, `ET-TK01`, `ET-TK02`, `ET-TK03`, `ET-TK04`, `ET-MW01`, `ET-MW03`, `ET-MW04`
**Published development domains (not guaranteed class grants):** Weapon Master, Critical Master, Melee Specialist, Mandalorian Warrior, Quarantined: Teras Kasi

**Breach:** “One hostile position. Too many ways to attack it. The wrong choice wastes your only opening.”

**Situation:** Hostile combatants hold a narrow equipment depot entrance. An ally needs to retrieve a critical power unit from inside. The defenders have cover, several are close together, and a maintenance gap offers a difficult flanking approach. You have only the equipment your character actually owns.

**Question:** What method do you choose to clear a path?

**Five first-person methods:**

**A — I use my best available ranged weapon to make a precise shot at the defender controlling the entrance.**

Developer interpretation: Focused ranged technique; no invented critical hit or accuracy modifier.
Candidate existing bias keys: `accuracy`, `firepower` · role `striker`. Candidate ontology topics (NOT certified operative effects): `offense_ranged`, `precision`.
Printed development connection (conditional): Weapon Master: Greater Weapon Focus/Specialization and Critical Master options are conditional.

**B — I suppress the defenders' line of sight long enough for the ally to cross to the power unit.**

Developer interpretation: Covering fire as an intended tactic, not guaranteed suppression condition.
Candidate existing bias keys: `areaControl`, `allySupport` · role `support`. Candidate ontology topics (NOT certified operative effects): `tactics`, `ally_support`, `support`.
Printed development connection (conditional): Commando: Cover Fire; Weapon Master: Controlled Burst require talents.

**C — I circle through the maintenance gap to strike from a position the defenders are not watching.**

Developer interpretation: Flanking mobility, no free sneak attack or concealment.
Candidate existing bias keys: `infiltration`, `initiative` · role `skirmisher`. Candidate ontology topics (NOT certified operative effects): `positioning`, `stealth`.
Printed development connection (conditional): Camouflage and close-quarters directions may eventually support this approach.

**D — I close into a safe reachable gap and use the melee or unarmed training I actually possess to break the hold on the doorway.**

Developer interpretation: Close fighting without presuming Teras Kasi access or a feat.
Candidate existing bias keys: `meleeDamage`, `combatAdaptability` · role `bruiser`. Candidate ontology topics (NOT certified operative effects): `melee`, `unarmed`.
Printed development connection (conditional): Melee Specialist paths only where legal; ET-TK tree access quarantined.

**E — I hold back until the defenders expose a genuine weakness, then commit to one decisive attack.**

Developer interpretation: Timing and high-value opportunity; no forced critical or bonus damage.
Candidate existing bias keys: `tacticalAwareness`, `critDamage` · role `striker`. Candidate ontology topics (NOT certified operative effects): `precision`, `targeting`.
Printed development connection (conditional): Critical Master and Weapon Master talents are individually prerequisite-gated.

**Mechanical teaching and legality guardrail:** Core Weapon Master includes Greater Weapon Focus/Specialization, Controlled Burst and related conditional mechanics. Melee Specialist/Critical Master and Mandalorian Warrior expansions have prerequisites. ET-TK routes are **quarantined** because printed Elite Trooper access to the Teras Kasi tree is not certified; route to broadly legal scenario, not an asserted tree grant.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### ET-Q3-S04 — The Disordered Line

**Narrative focus:** Coordination and resilience when a small team loses its formation
**Primary Q1 routes:** `ET-CO01`, `ET-CO02`, `ET-CO07`, `ET-RC04`, `ET-SL01`, `ET-SL02`, `ET-SL03`, `ET-SL04`, `ET-SL05`, `ET-ID02`
**Published development domains (not guaranteed class grants):** Commando: battle assessment and teamwork, Squad Leader, Republic Commando: support

**Breach:** “Your team is scattered. The enemy still has a plan. Give your people one.”

**Situation:** A small group of willing defenders is protecting a transit corridor. An explosion separates the group into three positions, one radio cuts out, and a wounded defender calls for assistance. No one has assigned you a formal rank, but the others are listening for a useful suggestion.

**Question:** How do you help the group regain the initiative?

**Five first-person methods:**

**A — I assess which position can still fire and give the others the clearest route to concentrate their defense.**

Developer interpretation: Battle analysis and practical coordination, no command rank assumed.
Candidate existing bias keys: `tacticalAwareness`, `formation` · role `leader`. Candidate ontology topics (NOT certified operative effects): `tactics`, `teamwork`.
Printed development connection (conditional): Commando: Battle Analysis; Squad Leader: Form Up under printed requirements.

**B — I make covering the wounded defender our first priority and coordinate a safe move toward them.**

Developer interpretation: Rescue coordination over immediate attack, not an automatic movement grant.
Candidate existing bias keys: `allySupport`, `unitCoordination` · role `support`. Candidate ontology topics (NOT certified operative effects): `ally_support`, `teamwork`, `support`.
Printed development connection (conditional): Protection and Commando: Out of Harm's Way; Squad Leader: Fall Back.

**C — I take the exposed position myself to hold enemy attention while the others re-form.**

Developer interpretation: Self-risking defense, not a promise to absorb all fire.
Candidate existing bias keys: `reactionDefense`, `combatStamina` · role `defender`. Candidate ontology topics (NOT certified operative effects): `defense`, `positioning`.
Printed development connection (conditional): Commando: Draw Fire/Defensive Position depend on rules.

**D — I direct short, controlled bursts toward the enemy's advance and use the pause to reconnect the separated positions.**

Developer interpretation: Fire support intended to deny maneuver; no extra mechanical suppression.
Candidate existing bias keys: `areaControl`, `formation` · role `controller`. Candidate ontology topics (NOT certified operative effects): `tactics`, `offense_ranged`.
Printed development connection (conditional): Commando: Cover Fire; Squad Leader: Full Advance are different future paths.

**E — I work through the communications failure and coordinate simple signals the group can all see.**

Developer interpretation: Improvised signals and technical adaptation, not an owned repair talent.
Candidate existing bias keys: `resourcefulness`, `allySupport` · role `utility`. Candidate ontology topics (NOT certified operative effects): `teamwork`, `tech`.
Printed development connection (conditional): Commando: Coordinated Effort; available skill actions depend on actor.

**Mechanical teaching and legality guardrail:** Squad Leader tree appears in a printed expansion and the Q1 audit; it is absent from the current prestige profile. Its formation and withdrawal benefits are future talent paths, not free orders. Republic Commando mechanics do not grant Republic affiliation.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### ET-Q3-S05 — The Incomplete Briefing

**Narrative focus:** Improvisation, demolition, close-quarters and rapid adaptation
**Primary Q1 routes:** `ET-CO03`, `ET-CO04`, `ET-MW02`, `ET-RC02`, `ET-RC03`, `ET-RC05`, `ET-ID01`, `ET-NEUTRAL`
**Published development domains (not guaranteed class grants):** Commando: demolition and resilience, Mandalorian Warrior: combat tempo, Republic Commando: operational improvisation

**Breach:** “Intelligence is late. Your equipment is what it is. The situation is not waiting.”

**Situation:** A secured passage must be opened to deliver supplies. The access mechanism is damaged, a portable obstacle blocks the lane, and a hostile patrol may return. One available route would require a careful repair, another a controlled demolition, and a third a physically difficult detour. The people with you have mixed abilities.

**Question:** What do you try?

**Five first-person methods:**

**A — I examine the damaged mechanism for a quick repair that could open the passage without causing a bigger problem.**

Developer interpretation: Technical problem solving within available equipment and skills.
Candidate existing bias keys: `mechanicalMastery`, `resourcefulness` · role `utility`. Candidate ontology topics (NOT certified operative effects): `tech`, `repair`.
Printed development connection (conditional): General technical route; no automatic Mechanics training from Elite Trooper.

**B — I look for a controlled way to remove the obstruction with the explosives we actually have, keeping everyone clear.**

Developer interpretation: Demolition only if explosive resources, training and safe positioning exist.
Candidate existing bias keys: `explosiveMastery`, `tacticalAwareness` · role `controller`. Candidate ontology topics (NOT certified operative effects): `equipment`, `tactics`.
Printed development connection (conditional): Commando: Demolitionist; Republic Commando: Higher Yield prerequisites apply.

**C — I lead a cautious detour, conserving supplies and avoiding a fight we do not have time to finish.**

Developer interpretation: Operational survival and pathfinding; no claim of special vehicle or gear.
Candidate existing bias keys: `survivalism`, `tacticalAwareness` · role `scout`. Candidate ontology topics (NOT certified operative effects): `movement`, `planning`.
Printed development connection (conditional): Camouflage and skill-led scouting paths where legal.

**D — I prepare the team to defend the access point while the person best suited to the mechanism works on it.**

Developer interpretation: Support the specialist; no presumption of personal repair skill.
Candidate existing bias keys: `formation`, `allySupport` · role `support`. Candidate ontology topics (NOT certified operative effects): `teamwork`, `defense`.
Printed development connection (conditional): Commando/Squad Leader teamwork capabilities are talent-gated.

**E — I keep a weapon ready for the returning patrol and plan a rapid withdrawal if the passage cannot be opened.**

Developer interpretation: Contingency and readiness, not free Mandalorian Advance or Rapid Reload.
Candidate existing bias keys: `initiative`, `combatAdaptability` · role `skirmisher`. Candidate ontology topics (NOT certified operative effects): `awareness`, `mobility`.
Printed development connection (conditional): Republic Commando: Rapid Reload; Mandalorian Warrior: Advance require legal access.

**Mechanical teaching and legality guardrail:** Demolitionist, Higher Yield and Rapid Reload have separate requirements; a hypothetical repair is not a granted Mechanics proficiency. Mandalorian Warrior does not establish the actor's culture, armor, or allegiance. Elite Trooper can be a career capstone.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

## Force Adept — Seeker Vera (`m30`)

**Mentor file:** `data/dialogue/mentors/vera/vera_dialogue.json`

**Shared Mentor Q3 opening — DRAFT:**
> Knowing a path through the Force is one thing. Choosing where it carries you is another. Consider a moment of uncertainty.

### FA-Q3-S01 — The Frightened Creature

**Narrative focus:** Connection with living beasts without assuming a bonded mount
**Primary Q1 routes:** `FA-BW01`, `FA-BW02`, `FA-BW03`, `FA-BW04`, `FA-BW05`, `FA-ID01`
**Published development domains (not guaranteed class grants):** Beastwarden, Independent Force tradition identity

**Seeker Vera:** “A frightened creature hears threats in the air that we have not yet noticed. What would you listen for?”

**Situation:** On a remote road, a large injured beast blocks a caravan's path. It is frightened rather than openly attacking. Its movement threatens to overturn a supply cart, and several travelers are preparing to frighten it away with weapons. You do not know the beast's intelligence or temperament.

**Question:** What do you attempt?

**Five first-person methods:**

**A — I lower the tension around the beast, approach carefully, and see whether I can calm it rather than drive it away.**

Developer interpretation: Calm and protection as intentions; no guaranteed mental influence.
Candidate existing bias keys: `biologicalControl`, `allySupport` · role `support`. Candidate ontology topics (NOT certified operative effects): `beast`, `support`.
Printed development connection (conditional): Beastwarden: Charm Beast/Soothing Presence are conditional Force talents.

**B — I examine its injuries and ask the travelers to give it space while we find a way to treat it.**

Developer interpretation: Practical treatment and compassion; no unowned healing spell or medical skill assumed.
Candidate existing bias keys: `healingMastery`, `medicalKnowledge` · role `support`. Candidate ontology topics (NOT certified operative effects): `beast`, `healing`.
Printed development connection (conditional): Force Adept: Force Treatment is a possible talent direction.

**C — I watch its reactions and search for whatever frightened it before I ask anyone to move closer.**

Developer interpretation: Behavioral observation and investigation, not automatic Wild Sense.
Candidate existing bias keys: `tacticalAwareness`, `knowledgeMastery` · role `scout`. Candidate ontology topics (NOT certified operative effects): `awareness`, `beast`.
Printed development connection (conditional): Beastwarden: Wild Sense requires Charm Beast and printed conditions.

**D — I organize the caravan to take another route and leave the animal undisturbed if we cannot help it safely.**

Developer interpretation: Noncontact problem solving that respects risk to beast and travelers.
Candidate existing bias keys: `explorationMastery`, `allySupport` · role `utility`. Candidate ontology topics (NOT certified operative effects): `exploration`, `support`.
Printed development connection (conditional): Force class does not require use of supernatural effects.

**E — I attempt to communicate with the animal through the Force only as far as my actual training allows, seeking cooperation rather than obedience.**

Developer interpretation: Conditional Force communication, not blanket control of beasts.
Candidate existing bias keys: `mysticalInfluence`, `biologicalControl` · role `controller`. Candidate ontology topics (NOT certified operative effects): `beast`, `force`.
Printed development connection (conditional): Beastwarden: Charm Beast/Entreat Beast require applicable legal talents.

**Mechanical teaching and legality guardrail:** Beastwarden Charm Beast, Bonded Mount, Entreat Beast, Soothing Presence and Wild Sense (Jedi Academy Training Manual) all have creature, attitude, range and prerequisite limits. A generic Force Adept does not acquire beast communication, Force domination, or a mount by default.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### FA-Q3-S02 — The Unfinished Talisman

**Narrative focus:** Force item work, safety and responsibilities of enhancement
**Primary Q1 routes:** `FA-FI01`, `FA-FI02`, `FA-FI03`, `FA-FI04`, `FA-FI05`, `FA-FI06`, `FA-DS05`
**Published development domains (not guaranteed class grants):** Force Item, Dark Side Devotee: conditional talisman direction

**Seeker Vera:** “A crafted thing can carry an intention long after its maker is gone. What intention would you leave behind?”

**Situation:** An artisan offers to show you an unfinished ceremonial talisman and a damaged melee weapon found beside it. Both are said to have Force-related significance, but neither has been verified as safe or functional. The artisan wants your advice before altering either object.

**Question:** How do you proceed?

**Five first-person methods:**

**A — I study how the objects were made and ask the artisan to leave them untouched until we understand their risks.**

Developer interpretation: Inquiry and restraint before modification; no claim of detecting enchantments at will.
Candidate existing bias keys: `knowledgeMastery`, `informationControl` · role `utility`. Candidate ontology topics (NOT certified operative effects): `knowledge`, `crafting`.
Printed development connection (conditional): Force Item tree and Knowledge-based investigation where available.

**B — I would focus on making a defensive talisman that protects its wearer, if the materials and my training permit it.**

Developer interpretation: Protective item aspiration, not present ownership or an instant bonus.
Candidate existing bias keys: `itemEnchantment`, `reactionDefense` · role `defender`. Candidate ontology topics (NOT certified operative effects): `talisman`, `defense`.
Printed development connection (conditional): Force Item: Force Talisman/Greater Force Talisman and prerequisites.

**C — I would work on attuning the melee weapon to one willing wielder so it serves that person's control rather than brute force.**

Developer interpretation: Precision through an eligible melee weapon; no assumed weapon grant.
Candidate existing bias keys: `itemEnchantment`, `accuracy` · role `striker`. Candidate ontology topics (NOT certified operative effects): `crafting`, `melee`.
Printed development connection (conditional): Force Item: Attune Weapon applies to a melee weapon under printed rules.

**D — I would explore whether the talisman can help sustain one Force power, rather than trying to make it do everything.**

Developer interpretation: Specialized Force resource focus, not universal power recovery.
Candidate existing bias keys: `forceRecovery`, `itemEnchantment` · role `utility`. Candidate ontology topics (NOT certified operative effects): `talisman`, `force_power`.
Printed development connection (conditional): Force Item: Focused Force Talisman requires Force Talisman and further conditions.

**E — I would leave the objects as they are and preserve the artisan's records until we can judge the traditions involved.**

Developer interpretation: Cultural preservation without claiming Force item powers.
Candidate existing bias keys: `knowledgeMastery`, `resourceControl` · role `utility`. Candidate ontology topics (NOT certified operative effects): `knowledge`, `resources`.
Printed development connection (conditional): Not every Force Adept must pursue the Force Item tree.

**Mechanical teaching and legality guardrail:** Force Item Attune Weapon, Empower Weapon, Force Talisman, Focused Force Talisman, Force Throw and Primitive Block have exact weapon category, crafting and prerequisite restrictions. Dark Side Talisman is separately dark-side-related. The found objects are not automatically the actor's or guaranteed magical.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### FA-Q3-S03 — The Message Without a Voice

**Narrative focus:** Telepathy, consent and safeguarding private information
**Primary Q1 routes:** `FA-TP01`, `FA-TP02`, `FA-TP03`, `FA-TP04`, `FA-TP05`, `FA-FA06`
**Published development domains (not guaranteed class grants):** Telepath, Force Adept: Long Call

**Seeker Vera:** “A thought reaches farther than a spoken word. It can also cross a boundary the speaker never meant to open.”

**Situation:** At a temporary shelter, a visitor claims to hear fragments of a distant person's thoughts through the Force. The visitor fears that person is in danger but cannot give a location. Another resident warns that the messages may be misleading or may expose private memories. No direct telepathic link has been established by your character.

**Question:** What approach do you take?

**Five first-person methods:**

**A — I ask the visitor to describe what they experienced, then look for independent signs that the distant person is actually in danger.**

Developer interpretation: Corroboration over supernatural certainty.
Candidate existing bias keys: `informationControl`, `knowledgeMastery` · role `scout`. Candidate ontology topics (NOT certified operative effects): `investigation`, `awareness`.
Printed development connection (conditional): Force Adept/Telepath are optional paths; no existing power assumed.

**B — I would attempt a clear, consensual message through the Force if I knew a legal way to reach the person.**

Developer interpretation: Consent-first contact; no guaranteed distant range or full reply.
Candidate existing bias keys: `mysticalInfluence`, `allySupport` · role `support`. Candidate ontology topics (NOT certified operative effects): `telepathy`, `force`.
Printed development connection (conditional): Telepath: Perfect Telepathy; Force Adept: Long Call have different conditions.

**C — I would protect the visitor's thoughts from unwanted intrusion before asking them to attempt contact again.**

Developer interpretation: Mental privacy and resilience, not a blanket mind-blocking power.
Candidate existing bias keys: `reactionDefense`, `forceDC` · role `defender`. Candidate ontology topics (NOT certified operative effects): `telepathy`, `defense`.
Printed development connection (conditional): Telepath: Psychic Citadel / Psychic Defenses require legal talent choices.

**D — I would ask whether the visitor is comfortable sharing only the details relevant to safety, without probing memories they want private.**

Developer interpretation: Noninvasive social trust and boundaries; no automatic mind reading.
Candidate existing bias keys: `persuasionMastery`, `allySupport` · role `support`. Candidate ontology topics (NOT certified operative effects): `social`, `telepathy`.
Printed development connection (conditional): Mind Probe is an active restricted ability, not the default answer.

**E — I would investigate the source of the mental signal itself before trusting it, even if that delays direct contact.**

Developer interpretation: Signal skepticism and source tracing; no invented detect-telepathy mechanic.
Candidate existing bias keys: `informationControl`, `tacticalAwareness` · role `scout`. Candidate ontology topics (NOT certified operative effects): `investigation`, `force`.
Printed development connection (conditional): Telepath and Force Adept development may support deeper understanding later.

**Mechanical teaching and legality guardrail:** Telepath Mind Probe, Perfect Telepathy, Psychic Citadel/Defenses and Telepathic Intruder have separate consent, range, opposed-check or target restrictions. Long Call requires Mystical Link. Do not automatically establish a link or treat a hypothetical message as verified fact.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### FA-Q3-S04 — The Failing Sanctuary

**Narrative focus:** Healing, finite Force resources and cost of intervention
**Primary Q1 routes:** `FA-FA02`, `FA-FA03`, `FA-FA04`, `FA-FA05`, `FA-MY01`, `FA-MY03`, `FA-MY04`, `FA-MY05`, `FA-FT01`
**Published development domains (not guaranteed class grants):** Force Adept: treatment and techniques, Mystic: disciplined Force use

**Seeker Vera:** “When a vessel empties, the next gift has a cost. What will you spend, and why?”

**Situation:** A storm has damaged a remote sanctuary. Several residents are hurt, one has inhaled a dangerous substance, and the settlement's supplies are almost gone. Volunteers can provide basic aid and move people to safer rooms. You cannot assume any particular healing talent, Force power, or Force Point reserve beyond the actual character sheet.

**Question:** How do you help?

**Five first-person methods:**

**A — I assess who is in the greatest immediate danger and use ordinary treatment methods within my training before anything else.**

Developer interpretation: Triage and direct medicine; no Force Treatment ownership assumed.
Candidate existing bias keys: `treatingInjury`, `medicalKnowledge` · role `support`. Candidate ontology topics (NOT certified operative effects): `medical`, `healing`.
Printed development connection (conditional): Treat Injury skill and Force Treatment are distinct routes with legal conditions.

**B — I would use the Force to treat the wounded only where my actual training permits it, starting with someone who cannot wait.**

Developer interpretation: Conditional supernatural aid; no guaranteed healing amount or disease cure.
Candidate existing bias keys: `healingMastery`, `forceArtistry` · role `support`. Candidate ontology topics (NOT certified operative effects): `force_support`, `healing`.
Printed development connection (conditional): Force Adept: Force Treatment substitutes Use the Force for specified medical tasks.

**C — I organize the volunteers and supplies so fewer people are harmed while we arrange longer-term care.**

Developer interpretation: Coordination and scarce-resource management, not a magic heal effect.
Candidate existing bias keys: `allySupport`, `resourceControl` · role `leader`. Candidate ontology topics (NOT certified operative effects): `support`, `resources`.
Printed development connection (conditional): Support-oriented development is valid without chosen Force healing talents.

**D — I would accept a measured personal cost to sustain an essential Force effort, if I actually know the technique and its limits.**

Developer interpretation: Resource-risk judgment; not a free Force Point or unconditional Channel Vitality.
Candidate existing bias keys: `forceRecovery`, `combatStamina` · role `utility`. Candidate ontology topics (NOT certified operative effects): `resource_spend`, `force`.
Printed development connection (conditional): Mystic: Channel Vitality has condition-track cost; Force techniques are later.

**E — I use the Force to seek insight into the cause of the danger, but I make sure the volunteers keep working while I look.**

Developer interpretation: Investigation and contemplation alongside concrete aid; no guaranteed prophecy.
Candidate existing bias keys: `knowledgeMastery`, `mysticalInfluence` · role `scout`. Candidate ontology topics (NOT certified operative effects): `force`, `investigation`.
Printed development connection (conditional): Mystical Link is GM-discretionary; Instrument of the Force has special costs.

**Mechanical teaching and legality guardrail:** Force Treatment is an elective talent, Fortified Body requires Equilibrium, Mystical Link has a GM-selected benefit, and Channel Vitality carries a condition-track cost. Force Techniques occur at even Force Adept class levels; do not advertise them as level-1 grants.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### FA-Q3-S05 — The Cost of Intervention

**Narrative focus:** Conflict, temptation and defensive resolve without alignment scoring
**Primary Q1 routes:** `FA-DS01`, `FA-DS02`, `FA-DS03`, `FA-DS04`, `FA-II01`, `FA-II02`, `FA-II03`, `FA-II04`, `FA-FA01`, `FA-MY02`, `FA-ID02`, `FA-NEUTRAL`
**Published development domains (not guaranteed class grants):** Dark Side Devotee: possible temptation, not presumed choice, Imperial Inquisitor: restricted, Force Adept: autonomous judgment, Mystic: mental defense

**Seeker Vera:** “Power can change a room. It cannot spare you the choice of why you enter it.”

**Situation:** A local strongman is threatening residents who oppose a proposed excavation near a sacred site. Some of the strongman's guards have Force training, and the residents disagree over whether to resist, negotiate, or evacuate. The strongman has offered to speak privately before any confrontation. You have no established allegiance to the guards, the residents, the Jedi, the Sith, or any inquisitorial order.

**Question:** How would you respond?

**Five first-person methods:**

**A — I meet the strongman, listen for what might change his decision, and set a clear boundary against harming the residents.**

Developer interpretation: Negotiation under pressure without a Force compulsion.
Candidate existing bias keys: `persuasionMastery`, `mysticalInfluence` · role `utility`. Candidate ontology topics (NOT certified operative effects): `persuasion`, `social`.
Printed development connection (conditional): Force Adept and Telepath routes do not guarantee influence over a will.

**B — I help the residents prepare a safe withdrawal while refusing to let the guards dictate everyone's choices.**

Developer interpretation: Protection through organization; not a scored alignment commitment.
Candidate existing bias keys: `allySupport`, `reactionDefense` · role `defender`. Candidate ontology topics (NOT certified operative effects): `support`, `defense`.
Printed development connection (conditional): Force Adept: defensive Force options require owned powers/talents.

**C — I study the guards' abilities and look for a way to disrupt their threats without letting fear decide my timing.**

Developer interpretation: Force-aware caution, not automatic inquisitorial access.
Candidate existing bias keys: `tacticalAwareness`, `forceDC` · role `controller`. Candidate ontology topics (NOT certified operative effects): `tactics`, `force_defense`.
Printed development connection (conditional): Mystic: Closed Mind; Dark Side/Imperial paths require separate legal gates.

**D — I would meet force with force if the threat becomes immediate, accepting that the method I choose could change who I become.**

Developer interpretation: Decisive offensive intent; explicitly no automatic Dark Side Score adjustment for choosing an option.
Candidate existing bias keys: `burstDamage`, `forceArtistry` · role `striker`. Candidate ontology topics (NOT certified operative effects): `force_offense`, `force`.
Printed development connection (conditional): Dark Side Devotee: Channel Aggression/Anger are possible costly talents.

**E — I search the excavation's purpose and the sacred site's history before deciding what intervention is justified.**

Developer interpretation: Open inquiry with urgent boundaries, not refusal to ever act.
Candidate existing bias keys: `knowledgeMastery`, `informationControl` · role `scout`. Candidate ontology topics (NOT certified operative effects): `knowledge`, `investigation`.
Printed development connection (conditional): Force Adept independent/tradition paths; eligibility always separate.

**Mechanical teaching and legality guardrail:** Dark Side Devotee offers costly or alignment-relevant paths; Imperial Inquisitor requires Inquisitorius membership and DSS >=1 and is NOT general Force Adept access. Closed Mind has specific restrictions. No moral/alignment score, assumed dark-side status, or instantaneous talent acquisition.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

## Force Disciple — Riquis (`m09`)

**Mentor file:** `data/dialogue/mentors/riquis/riquis_dialogue.json`

**Shared Mentor Q3 opening — DRAFT:**
> The veil opens for a moment. Five ways forward, and none is free of consequence. Which footstep is yours?

### FD-Q3-S01 — The Forking Vision

**Narrative focus:** Prophecy, evidence and uncertainty without assured foresight
**Primary Q1 routes:** `FD-SE01`, `FD-SE02`, `FD-SE03`, `FD-SE04`, `FD-SE05`, `FD-GS01`, `FD-CF02`
**Published development domains (not guaranteed class grants):** Universal Sense, Guardian Spirit: conditional, Force Disciple: Prophet

**Riquis:** “A dream points to two roads. Beware the certainty that makes one of them real.”

**Situation:** An elder brings you an account of a troubling vision: a flood will threaten a settlement, but the vision places the danger in two different valleys at once. The weather is changing, and moving everyone without evidence could create a different danger. You have heard the account; you have not necessarily received a vision yourself.

**Question:** How do you decide where to act?

**Five first-person methods:**

**A — I compare the elder's account with weather, terrain, and the settlements' immediate vulnerabilities before treating either valley as certain.**

Developer interpretation: Evidence-based risk assessment rather than certainty from prophecy.
Candidate existing bias keys: `knowledgeMastery`, `tacticalAwareness` · role `scout`. Candidate ontology topics (NOT certified operative effects): `investigation`, `planning`.
Printed development connection (conditional): Sense and ordinary Knowledge/Perception possibilities, not guaranteed Visions.

**B — I would seek guidance through the Force if I have a legitimate way to do so, while remembering that a vision can be incomplete.**

Developer interpretation: Conditional spiritual inquiry, no claimed prophetic ownership.
Candidate existing bias keys: `mysticalInfluence`, `knowledgeMastery` · role `utility`. Candidate ontology topics (NOT certified operative effects): `visions`, `force`.
Printed development connection (conditional): Universal Sense: Visions/Foresight require their printed gates.

**C — I warn both settlements of plausible danger and help them prepare without declaring either future inevitable.**

Developer interpretation: Distributed readiness over a single all-or-nothing prediction.
Candidate existing bias keys: `allySupport`, `resourceControl` · role `leader`. Candidate ontology topics (NOT certified operative effects): `support`, `planning`.
Printed development connection (conditional): Support-oriented Force use is optional; no free mass communication.

**D — I visit the terrain most likely to hide the flood's cause and look for physical signs that would distinguish the two warnings.**

Developer interpretation: Field observation and empirical follow-up, no instant clairvoyance.
Candidate existing bias keys: `explorationMastery`, `tacticalAwareness` · role `scout`. Candidate ontology topics (NOT certified operative effects): `exploration`, `investigation`.
Printed development connection (conditional): Universal Sense: Force Perception is an elective substitution talent.

**E — I ask the elder how the warning came and what might have been misunderstood before I change anyone's fate.**

Developer interpretation: Interpretation and source criticism; doesn't assume deception by elder.
Candidate existing bias keys: `informationControl`, `persuasionMastery` · role `utility`. Candidate ontology topics (NOT certified operative effects): `social`, `knowledge`.
Printed development connection (conditional): Guardian Spirit/Prophet do not certify precise future events.

**Mechanical teaching and legality guardrail:** Force Disciple Prophet does not guarantee control of visions or information from a GM. Sense tree Force Perception, Foresight, Visions and Gauge Force Potential have individual prerequisites/conditions. Guardian Spirit is a separate legal talent path, not an automatic companion.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### FD-Q3-S02 — The Shifting Current

**Narrative focus:** Control of powerful effects and cost of scope, timing and reach
**Primary Q1 routes:** `FD-FS01`, `FD-FS02`, `FD-FS03`, `FD-FS04`, `FD-FS05`, `FD-FS06`, `FD-FS07`, `FD-FS09`, `FD-FS10`, `FD-FS11`, `FD-FS13`, `FD-AL01`, `FD-AL02`, `FD-DS01`, `FD-DS03`
**Published development domains (not guaranteed class grants):** Force Secrets: later-level choices, Universal Alter, Dark Side: morality-gated

**Riquis:** “The current is strong enough to drown the shoreline. The question is where you let it flow.”

**Situation:** A dangerous energy disturbance is spreading through an abandoned industrial platform. An automated defense system fires at anyone approaching the shutdown controls. A rescue team is nearby but not in the direct line of fire. You may have Force powers, conventional tools, or neither of the specialized secrets suggested by this problem; only actual owned abilities can be used.

**Question:** What would be your preferred way to resolve the threat?

**Five first-person methods:**

**A — I aim to affect the defense system precisely and spare the rescue team, even if that means using a smaller effect.**

Developer interpretation: Selective intervention instead of maximum damage, not an owned Shaped Power secret.
Candidate existing bias keys: `forceArtistry`, `accuracy` · role `controller`. Candidate ontology topics (NOT certified operative effects): `force_control`, `precision`.
Printed development connection (conditional): Force Secrets: Shaped Power; Universal Alter: Disciplined Strike are distinct future abilities.

**B — I would extend the reach of a power I actually possess so I could reach the shutdown point without bringing others into danger.**

Developer interpretation: Distance and placement as a preferred development direction, not a guaranteed range.
Candidate existing bias keys: `forceSecret`, `tacticalAwareness` · role `utility`. Candidate ontology topics (NOT certified operative effects): `force_power`, `positioning`.
Printed development connection (conditional): Force Secrets: Distant Power / Remote Power have different scope and costs.

**C — I would use one rapid, decisive effort when the defenses expose a safe opening, rather than letting the threat grow.**

Developer interpretation: Action timing and decisive effect, no automatic Quicken Power or Swift Power.
Candidate existing bias keys: `initiative`, `burstDamage` · role `striker`. Candidate ontology topics (NOT certified operative effects): `force_offense`, `action_economy`.
Printed development connection (conditional): Force Secret: Quicken Power differs from Dark Side talent Swift Power.

**D — I would coordinate several carefully placed effects to protect the rescue team's approach, choosing restraint over the broadest blast.**

Developer interpretation: Layered control and protection, not automatic multitarget or linked powers.
Candidate existing bias keys: `areaControl`, `allySupport` · role `support`. Candidate ontology topics (NOT certified operative effects): `force_support`, `tactics`.
Printed development connection (conditional): Force Secrets: Multitarget, Linked, Enlarged and Shaped Power are separately gated.

**E — I would first search for a conventional shutdown or a way to reduce the disturbance before spending a scarce Force resource.**

Developer interpretation: Resource conservation and technical investigation; no implication that Force use is wrong.
Candidate existing bias keys: `resourceControl`, `knowledgeMastery` · role `utility`. Candidate ontology topics (NOT certified operative effects): `tech`, `resources`.
Printed development connection (conditional): Force Secrets often consume Force/Destiny Points; technical solution must exist in fiction.

**Mechanical teaching and legality guardrail:** Force Secrets are first selected at later Force Disciple levels, not assumed at first class level. Devastating, Distant, Multitarget, Quicken, Shaped, Extend, Linked, Corrupted, Debilitating, Enlarged and Remote Power have distinct target/area/action/resource costs. Dark Side talents require actual morality gates. No free Force Point or uncontrolled unlimited power.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### FD-Q3-S03 — The Burden of the Vessel

**Narrative focus:** Healing, defense and recovery when Force resources are strained
**Primary Q1 routes:** `FD-FS08`, `FD-FS12`, `FD-FA01`, `FD-FA02`, `FD-FA03`, `FD-FA04`, `FD-FA05`, `FD-FA06`, `FD-CT01`, `FD-CT02`, `FD-CT03`, `FD-CT04`, `FD-LS03`, `FD-GS02`, `FD-GS03`, `FD-DS02`
**Published development domains (not guaranteed class grants):** Force Adept class tree, Universal Control, Light/Dark access: conditional, Force Secrets later, Guardian Spirit: conditional

**Riquis:** “The body is a vessel. So is a promise. Which one will you ask to carry the weight?”

**Situation:** A small group has escaped a hazardous area. One person is injured, another is exhausted, and an unstable barrier still threatens the group's shelter. Supplies are scarce, and everyone has a different idea of which danger comes first. You know only what the current character sheet confirms about your Force and medical capabilities.

**Question:** Where do you place your effort?

**Five first-person methods:**

**A — I care for the injured person first, using treatment methods and any Force healing I have actually learned.**

Developer interpretation: Immediate aid with honest capability boundaries.
Candidate existing bias keys: `healingMastery`, `allySupport` · role `support`. Candidate ontology topics (NOT certified operative effects): `healing`, `force_support`.
Printed development connection (conditional): Force Adept: Force Treatment is elective; Universal Control: Force Recovery is different.

**B — I work to strengthen the shelter's defense so no one is injured again while help is arranged.**

Developer interpretation: Prevention through shielding rather than immediate medical intervention.
Candidate existing bias keys: `reactionDefense`, `damageReduction` · role `defender`. Candidate ontology topics (NOT certified operative effects): `defense`, `force_defense`.
Printed development connection (conditional): Universal Control: Damage Reduction 10 has Force Point cost and duration.

**C — I direct the group to conserve supplies and rotate the exhausted person out of danger while we make a plan.**

Developer interpretation: Nonmagical group coordination with no promised healing effects.
Candidate existing bias keys: `resourceControl`, `allySupport` · role `leader`. Candidate ontology topics (NOT certified operative effects): `resources`, `support`.
Printed development connection (conditional): Force Disciple's talents don't automatically confer command authority.

**D — I look for a way to recover a spent Force power within my actual limits before using another effect.**

Developer interpretation: Sustainability as intent, not a promise of free recovery.
Candidate existing bias keys: `forceRecovery`, `knowledgeMastery` · role `utility`. Candidate ontology topics (NOT certified operative effects): `resource_recovery`, `force`.
Printed development connection (conditional): Universal Control: Force Focus; Light Side: Surge of Light has DSS 0 and prerequisites.

**E — I would use a rare, demanding Force technique to steady those around me only if I had learned it and could meet its price.**

Developer interpretation: Willingness for costly specialized support, conditional on actual selection and resources.
Candidate existing bias keys: `forceSecret`, `allySupport` · role `support`. Candidate ontology topics (NOT certified operative effects): `force_support`, `resources`.
Printed development connection (conditional): Force Secrets at later levels; Guardian Spirit and Dark Presence have strict access gates.

**Mechanical teaching and legality guardrail:** Force Disciple has potential access to the Force Adept tree and universal Force talent trees as printed, not guaranteed possession. Force Treatment is a specific Use the Force/Treat Injury substitution. Equilibrium, Force Focus, Force Recovery and other talents have prerequisites. Pure Power or Unconditional Power are Force Secrets with level/access costs; dark/light paths require alignment eligibility.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### FD-Q3-S04 — The Voice Behind the Thought

**Narrative focus:** Mental coercion, private agency and nonviolent countermeasures
**Primary Q1 routes:** `FD-CF01`, `FD-AL03`, `FD-AL04`, `FD-LS01`, `FD-LS02`
**Published development domains (not guaranteed class grants):** Force Disciple: Indomitable, Universal Alter: mind effects, Light Side: gated restraint

**Riquis:** “An unwanted voice arrives inside a thought. The first question is whether you must answer it at all.”

**Situation:** Several travelers report that an unseen presence has tried to influence their decisions near an abandoned shrine. One traveler has begun repeating a stranger's instructions. Others are frightened, but nobody can identify the source. You can reach the shrine on foot, or keep the group safely away while investigating.

**Question:** How do you respond?

**Five first-person methods:**

**A — I move the travelers away from the shrine and help them make choices without the unseen voice pressing on them.**

Developer interpretation: Agency-preserving extraction without conferring Indomitable on allies.
Candidate existing bias keys: `allySupport`, `reactionDefense` · role `defender`. Candidate ontology topics (NOT certified operative effects): `support`, `force_defense`.
Printed development connection (conditional): Class feature Indomitable only applies to the character under its exact scope.

**B — I investigate the source carefully, looking for evidence of a device, trick or Force effect before confronting it.**

Developer interpretation: Evidence-led diagnosis without a presumed Force detection talent.
Candidate existing bias keys: `informationControl`, `knowledgeMastery` · role `scout`. Candidate ontology topics (NOT certified operative effects): `investigation`, `tech`.
Printed development connection (conditional): Universal Sense and ordinary investigation paths; no free detection power.

**C — I would use an honest, voluntary mental link with a willing traveler if I knew how, to understand what they are experiencing.**

Developer interpretation: Consensual information sharing rather than invasive thought control.
Candidate existing bias keys: `forceBond`, `informationControl` · role `support`. Candidate ontology topics (NOT certified operative effects): `telepathy`, `force`.
Printed development connection (conditional): Universal Alter: Telepathic Link requires a willing Force-sensitive ally and prerequisites.

**D — I would confront the influence directly, relying on the mental defenses I actually possess rather than treating every thought as an order.**

Developer interpretation: Personal resilience and boundaries, no blanket psychic immunity.
Candidate existing bias keys: `reactionDefense`, `forceDC` · role `defender`. Candidate ontology topics (NOT certified operative effects): `force_defense`, `defense`.
Printed development connection (conditional): Indomitable class feature scope; separate Universal Control defensive talents.

**E — I would challenge the false instructions aloud so the travelers can test them against what they know.**

Developer interpretation: Collective reasoning over Force dominance, no automatic mind-effect removal.
Candidate existing bias keys: `persuasionMastery`, `informationControl` · role `utility`. Candidate ontology topics (NOT certified operative effects): `persuasion`, `social`.
Printed development connection (conditional): No talent grants universal persuasion against a hidden Force source.

**Mechanical teaching and legality guardrail:** Indomitable at Force Disciple class level 1 concerns immunity to mind-affecting effects, NOT all Will Defense checks or a power protecting every bystander. Illusion, Telepathic Link and light-side At Peace/Focused Attack require actual ownership, alignment or prerequisites; Force Disciple is not automatic Jedi affiliation.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

### FD-Q3-S05 — The Unfinished Teaching

**Narrative focus:** Preserving knowledge, tradition and voluntary mentorship
**Primary Q1 routes:** `FD-FS14`, `FD-FS15`, `FD-AL05`, `FD-TR01`, `FD-TR02`, `FD-TR03`, `FD-ID01`, `FD-ID02`, `FD-UN00`
**Published development domains (not guaranteed class grants):** Force Secrets: learning and teaching, Universal Alter, Conditional Force traditions, Identity and capstone

**Riquis:** “A secret is a seed. Plant it carelessly, and you may never know what grows.”

**Situation:** A keeper of an old sanctuary offers to show you a damaged archive containing Force teachings from several traditions. The keeper asks whether the archive should be restored, shared with students, or sealed until its origin is understood. Some passages appear to require initiation into traditions you have not established any connection with.

**Question:** What responsibility would you accept?

**Five first-person methods:**

**A — I preserve the archive as faithfully as I can and document what is known before anyone changes the texts.**

Developer interpretation: Conservation and provenance over rushed interpretation.
Candidate existing bias keys: `knowledgeMastery`, `resourceControl` · role `utility`. Candidate ontology topics (NOT certified operative effects): `knowledge`, `resources`.
Printed development connection (conditional): Force Secrets: Holocron Loremaster is later-level and not automatically possessed.

**B — I compare the teachings with what I have truly learned, separating common principles from practices reserved for their own traditions.**

Developer interpretation: Cross-tradition research without unauthorized tree access.
Candidate existing bias keys: `knowledgeMastery`, `mysticalInfluence` · role `scout`. Candidate ontology topics (NOT certified operative effects): `knowledge`, `force`.
Printed development connection (conditional): Jensaarai/Dathomiri traditions require eligible membership/training.

**C — I would teach a willing student only what I can responsibly explain and demonstrate, leaving the rest for further study.**

Developer interpretation: Gradual voluntary mentorship, no assumed student or apprenticeship history.
Candidate existing bias keys: `allySupport`, `knowledgeMastery` · role `support`. Candidate ontology topics (NOT certified operative effects): `support`, `knowledge`.
Printed development connection (conditional): Force Secret Mentor has a trained-to-knighthood prerequisite; not a Mentor NPC benefit.

**D — I seek the keeper's consent to share carefully selected portions with other qualified seekers, so important knowledge is not lost.**

Developer interpretation: Selective dissemination via willing collaborators, not a new follower network.
Candidate existing bias keys: `networkInfluence`, `allySupport` · role `support`. Candidate ontology topics (NOT certified operative effects): `social`, `knowledge`.
Printed development connection (conditional): Holocron Loremaster does not grant arbitrary power transfer.

**E — I leave the most uncertain teachings sealed for now and go find someone with firsthand knowledge of their tradition.**

Developer interpretation: Humility and field research over forced acquisition; title can be a capstone.
Candidate existing bias keys: `explorationMastery`, `knowledgeMastery` · role `scout`. Candidate ontology topics (NOT certified operative effects): `exploration`, `investigation`.
Printed development connection (conditional): Tradition-specific Force talents are not universally legal to Force Disciple.

**Mechanical teaching and legality guardrail:** Holocron Loremaster and Mentor are later Force Secrets, with Mentor requiring an actually trained apprentice to knighthood/equivalent. Specific Jensaarai, Dathomiri and other tradition trees are gated to actual training/membership. Archive custody does not grant holocrons, apprentices, Force Secrets, or unrecorded traditions.

**Unscored controls:** “I am not sure yet” (no inferred intent) and “Try another situation” (navigation only, may select another authored scenario).

---

## Cross-class issue ledger for implementation review

1. **P3 engine blocker:** Existing `IdentityEngine.computeTotalBias` includes multiple signal sources; an observed-only mechanical projection and Q3 event ingestion were not established by this authoring work. Do not invent a score or reuse a mixed observed/pending layer as historical proof.
2. **Restricted and quarantined development:** Bounty Hunter Gand Findsman requires qualifying tradition/Force rules. Force Adept Imperial Inquisitor requires Inquisitorius affiliation plus Dark Side Score 1+. Force Disciple tradition trees require actual qualifying instruction, with light/dark options independently gated. Elite Trooper Teras Kasi access remains unverified and must not be advertised as a class-legal talent tree.
3. **Later progression:** Bounty Hunter Familiar Foe is not a first-class-level grant. Elite Trooper Damage Reduction starts at class level 2; Delay Damage at level 1 is not immediate damage immunity. Force Adept Force Techniques are later even class levels. Force Disciple Force Secrets are later level selections, not class-entry gifts.
4. **Class vs. biography:** Crime Lord does not assume owned criminal organization, minions, clients or evil alignment; Elite Trooper does not assume Republic membership or Mandalorian culture; Force Adept is not automatically Jedi/Sith; Force Disciple does not own a guardian spirit, holocron, apprentice or vision; Bounty Hunter contracts do not prove quarry guilt.
5. **Mentor routing:** The registry currently keys Seeker Vera as `venn` and Riquis as `anchorite`; use exact ID resolution, not text-match alias fallback. These are repository identifiers, not indications that the player knows these Mentors.
6. **Tag ontology:** Names were validated, but mechanical candidate meanings cannot substitute for the ontology's exact operative rules. A narrative scenario mentioning a skill or ally does not prove the related feat/talent has that tag.
7. **UI and review:** Finalize introductions and first-person answers with the owner; test scenario relevance to all Q1 directions, including neutral, capstone, and restricted-focus routes; confirm one response event only and no reweighting from exposure.

## Source book starting points for mechanical review

| Class | Source anchors used by predecessor Q1 audits |
|---|---|
| Bounty Hunter | Core Rulebook pp. 49, 208; Scum and Villainy (Bounty Hunter and Gand Findsman); Legacy Era Campaign Guide p. 40; Force Unleashed Campaign Guide; Galaxy of Intrigue; Unknown Regions. |
| Crime Lord | Core Rulebook pp. 43, 209–210; Scum and Villainy pp. 26–27; KOTOR Campaign Guide; Galaxy of Intrigue; Unknown Regions. |
| Elite Trooper | Core Rulebook pp. 211–212; KOTOR Campaign Guide (Mandalorian Warrior); Scum/Galaxy at War and other supplements audited in Q1; Teras Kasi class access unresolved. |
| Force Adept | Core Rulebook pp. 212–214; Jedi Academy Training Manual (Beastwarden, Mystic, Telepath); Force Unleashed Campaign Guide (restricted Inquisitor); KOTOR/Clone Wars/Unknown Regions expansions. |
| Force Disciple | Core Rulebook pp. 214–215 and p. 103 (Force Secrets); Jedi Academy Training Manual (general Force-tree access clarification); Clone Wars / Force Unleashed secret expansions. |

**Source-certification limitation:** These are continuation anchors from the prior Q1 source-review pass, not a fresh claim that all 125 individual Q3 signal→feat mappings were independently mechanically certified. Implement only after those associations have been checked against primary sources and V2 engines.

## Next batch gate

This batch is a **complete five-class editorial submission**. Do not move these Q3 records into production without owner dialogue approval, per-route QA and signal scoring/eligibility verification. No repository mutation is part of this package.


---

# SOURCE DOCUMENT: Batch 2 — `SWSE_Prestige_Q3_Batch2_Five_Classes_v01.md`

# SWSE Prestige Survey — Q3 *The Responsibility* — Batch 2 (Five Classes)

**Version:** 0.1 · 2026-11-15
**State:** Complete first-pass editorial draft for owner review. **Not source-certified per-talent, engine-scored, runtime-implemented, committed or pushed.**
**Anchor:** Owner-approved Ace Pilot Q3 reference (5 scenarios × 5 responses) and previously authored Batch 1.

## Architecture and mechanical boundaries

The five classes in this batch are Gunslinger, Jedi Knight, Jedi Master, Officer and Sith Apprentice. One scenario is selected from five authored scenarios for the chosen class based chiefly on the exact Q1 route. Q2 and verified character evidence may refine relevance but must not be scored again. Showing a scenario or its answers creates **no** vote. Only the selected A–E first-person response can later create one provenance-backed hypothetical-intent event.

- Five substantive A–E decisions per scenario, plus a separate always-available **“I am not sure yet”** unscored answer. A **“Try another situation”** control can expose alternatives without an intent event. Neither neutral nor browse changes scores.
- `mechanicalBiasKeys` use existing canonical names, `roleBiasKey` one of 12 canonical roles, and `ontologyTopicCandidates` only existing owner-defined tags. These are **candidate editorial classifications**, not source-certified operative effects or a new scoring formula. Per-character prerequisites and current-vs-pending abilities remain authoritative.
- Narratives presume no unverified former Mentor, assigned student, military rank or command, fleet or crew, Force Secret, Force Technique, special weapon, affiliation, past battle, or other acquisition. Mentors are established characters, not necessarily people the character previously met.
- All five families have class-specific source caveats, including later features, rank/affiliation and quarantined Q1 talent names. A Q1 route may select a related scenario without certifying its underlying published talent.

## Structural completion

| Prestige class | Mentor | Scenarios | Answers | Q1 routes |
|---|---|---:|---:|---:|
| Gunslinger | Rajma | 5 | 25 | 55 / 55 |
| Jedi Knight | Miraj | 5 | 25 | 98 / 98 |
| Jedi Master | Miraj | 5 | 25 | 77 / 77 |
| Officer | Admiral Korr | 5 | 25 | 62 / 62 |
| Sith Apprentice | Darth Malbada | 5 | 25 | 58 / 58 |
| **Batch total** | | **25** | **125** | **350 / 350** |

**Automated structural validation:** PASS: 25 unique scenario IDs, 125 unique response IDs and texts, exactly 350 Q1 routes assigned once, five A–E first-person answers per scene, developer bias and ontology candidate names all from canonical vocabularies. **Not tested:** production engine event ingestion, weights, per-character legal acquisitions, scene UI, full source-specific talent rule identity, or Mentor editorial approval.

## Gunslinger — Rajma (`m21`)

**Mentor source:** `data/dialogue/mentors/rajma/rajma_dialogue.json`

**Shared Q3 Mentor opening — DRAFT:**

> Fast hands are fun. Good decisions keep them attached. Let's see what kind of shooter you are when the room stops cooperating.

**Q1 anchor caveat:** Some source Q1 routes are restricted or quarantined. They can route to hypothetical scenarios, but the underlying Q1 talent is not certified or granted. Specific flagged routes are preserved in the JSON.

### GL-Q3-S01 — A Draw Nobody Wants

**Focus:** Fast reaction versus provocation and disciplined defense
**Primary Q1 routes (11):** `GL-AW03`, `GL-AW04`, `GL-AW06`, `GL-AW07`, `GL-FT12`, `GL-GS04`, `GL-GS06`, `GL-GS11`, `GL-GS17`, `GL-ID02`, `GL-NEUTRAL`
**Publication development domains:** Gunslinger, Awareness, Fortune

**Rajma:** “There's the stare. There's the silence. And there's the fool who thinks you have to draw first.”

**Situation:** A dispute in a crowded docking concourse turns into a standoff. An armed challenger fingers their holster while bystanders crowd the exits. You can see their hands but cannot know whether they intend to fire. The crowd has no cover and no one has drawn yet.

**Question:** What do you do before the first shot?

**Five first-person choices:**

**A — I watch their hands and weight shift, ready to react only when the threat becomes real.**

Developer rationale: Read actual danger instead of treating bravado as an attack.
Candidate existing mechanical keys: `initiative`, `tacticalAwareness` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `awareness`, `initiative`.
Published development direction (conditional): Awareness: Improved Initiative or Uncanny Dodge, with individual conditions.

**B — I draw to a controlled position and make it clear that they can leave without a firefight.**

Developer rationale: Establish deterrence without asserting a successful intimidation check.
Candidate existing mechanical keys: `quickDraw`, `authorityPresence` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `precision`, `positioning`.
Published development direction (conditional): Gunslinger: Improved Quick Draw; relevant trained skills only if possessed.

**C — I angle toward the crowd so my body and line of fire keep civilians out of the exchange.**

Developer rationale: Interpose position and safeguard bystanders rather than pursue a duel.
Candidate existing mechanical keys: `reactionDefense`, `allySupport` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `defense`, `positioning`.
Published development direction (conditional): Gunslinger: defensive use of positioning; no automatically granted bodyguard talent.

**D — I break the rhythm with a remark and force the challenger to reconsider before either of us fires.**

Developer rationale: Use social tempo as a tactical option; no guaranteed mind control.
Candidate existing mechanical keys: `socialManipulation`, `tacticalAwareness` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `social`, `tactics`.
Published development direction (conditional): Gunslinger: Deceptive Shot is a possible future combat direction; social skill legality is separate.

**E — I move toward cover and refuse to give anyone a clean opening while the threat is uncertain.**

Developer rationale: Prioritize safe positioning over winning a showdown.
Candidate existing mechanical keys: `evasion`, `reactionDefense` · role `skirmisher`.
Ontology topic candidates (NOT certified mechanical effects): `cover`, `evasion`.
Published development direction (conditional): Awareness: defensive pathways; no automatic Evasion or Uncanny Dodge ownership.

**Shared mechanical teaching (developer only):** Potential paths: Improved Quick Draw and Deceptive Shot (Gunslinger); Improved Initiative and Uncanny Dodge (Awareness); Fortune can support attempts to recover from failure. None confers a free opening attack.

### GL-Q3-S02 — The Weapon in the Crowd

**Focus:** Surgical accuracy, disarming and protecting nearby people
**Primary Q1 routes (9):** `GL-GS01`, `GL-GS02`, `GL-GS03`, `GL-GS05`, `GL-GS08`, `GL-GS09`, `GL-CB02`, `GL-CB07`, `GL-ID01`
**Publication development domains:** Gunslinger, Awareness, Carbineer

**Rajma:** “One shot can solve a problem. Or make a hundred new ones. Try this one.”

**Situation:** In a marketplace, a frightened thief draws a blaster while holding a stolen case. Their finger is on the trigger, but several shoppers stand behind them. A security officer is approaching from the wrong angle. The thief has not fired.

**Question:** How do you end the threat?

**Five first-person choices:**

**A — I take the narrow opening to shoot the blaster from their hand before anyone is hurt.**

Developer rationale: Attempt a precision disarm with obvious line-of-fire risk.
Candidate existing mechanical keys: `accuracy`, `triggerDiscipline` · role `striker`.
Ontology topic candidates (NOT certified mechanical effects): `precision`, `targeting`.
Published development direction (conditional): Gunslinger: Ranged Disarm; Damaging Disarm has separate requirements.

**B — I keep my weapon steady and order the officer to change position before anyone creates a crossfire.**

Developer rationale: Coordinate a safer angle rather than assume command rank.
Candidate existing mechanical keys: `tacticalAwareness`, `allySupport` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `teamwork`, `positioning`.
Published development direction (conditional): Gunslinger: suppression/disarm themes; actual teamwork features require separate proof.

**C — I find a clear line and aim to stop the thief from moving, not to maximize the harm I cause.**

Developer rationale: Intent to inhibit movement, not automatic condition-track damage.
Candidate existing mechanical keys: `accuracy`, `conditionTrack` · role `controller`.
Ontology topic candidates (NOT certified mechanical effects): `targeting`, `control`.
Published development direction (conditional): Gunslinger: Slowing Shot or Debilitating Shot, according to individual prerequisites.

**D — I close the distance behind a stall and try to talk them into setting the case and blaster down.**

Developer rationale: Combine cover with a peaceful exit, not a morality score.
Candidate existing mechanical keys: `evasion`, `persuasionMastery` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `cover`, `persuasion`.
Published development direction (conditional): General movement and Persuasion rules, if appropriate; no class-only surrender power.

**E — I draw their attention onto me and give the shoppers a chance to retreat from the firing lane.**

Developer rationale: Protect by diversion; no presumption of an owned shield talent.
Candidate existing mechanical keys: `allySupport`, `reactionDefense` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `ally_support`, `defense`.
Published development direction (conditional): Gunslinger: protective identity from Core; defensive positioning and reaction features remain conditional.

**Shared mechanical teaching (developer only):** Potential paths: Ranged Disarm, Damaging Disarm, Debilitating Shot, Slowing Shot, Knockdown Shot (Gunslinger); Keen Shot (Awareness); rifle/carbines via qualified Carbineer direction. None is automatically available.

### GL-Q3-S03 — Smoke over the Platform

**Focus:** Concealment, perception, feint and unconventional shooting
**Primary Q1 routes (7):** `GL-AW01`, `GL-AW02`, `GL-AW05`, `GL-FT06`, `GL-FT07`, `GL-GS13`, `GL-GS14`
**Publication development domains:** Awareness, Gunslinger, Fortune

**Rajma:** “Hard to look stylish when you can't see your boots. That's when the real shooting starts.”

**Situation:** An attacker fires from somewhere across a smoke-filled loading platform. The shapes of crates and machinery are visible, but the shooter is not. An ally is pinned behind a loading arm. You have only scattered clues about the attacker’s position.

**Question:** How do you respond?

**Five first-person choices:**

**A — I study the muzzle flashes and sound before committing to a shot at the most likely location.**

Developer rationale: Use evidence to distinguish a target from a shadow.
Candidate existing mechanical keys: `tacticalAwareness`, `accuracy` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `awareness`, `targeting`.
Published development direction (conditional): Awareness: Keen Shot has specific concealment limitations.

**B — I shift along the crates until I have an angle that doesn't put my ally behind the target.**

Developer rationale: Prioritize maneuver and line of fire.
Candidate existing mechanical keys: `evasion`, `accuracy` · role `skirmisher`.
Ontology topic candidates (NOT certified mechanical effects): `positioning`, `cover`.
Published development direction (conditional): Gunslinger: Mobile Attack (pistols) source timing needs certification.

**C — I use short, deliberate shots to keep the attacker occupied while my ally moves.**

Developer rationale: Suppress to create an ally's opening.
Candidate existing mechanical keys: `allySupport`, `firepower` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `support`, `offense_ranged`.
Published development direction (conditional): Gunslinger: Keep Them Honest is conditional, and suppressive mechanics require correct rules.

**D — I look for a safe ricochet angle off the machinery rather than fire blindly into the smoke.**

Developer rationale: A calculated unconventional shot rather than random fire.
Candidate existing mechanical keys: `improvisation`, `accuracy` · role `striker`.
Ontology topic candidates (NOT certified mechanical effects): `targeting`, `precision`.
Published development direction (conditional): Fortune: Ricochet Shot, if prerequisites and geometry permit.

**E — I stop firing, relocate quietly, and wait for the attacker to betray their position.**

Developer rationale: Surveillance and repositioning over attempted damage.
Candidate existing mechanical keys: `stealth`, `tacticalAwareness` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `stealth`, `awareness`.
Published development direction (conditional): Gunslinger and Awareness: perception and concealment directions; no inferred stealth talent.

**Shared mechanical teaching (developer only):** Potential paths: Keen Shot versus concealment (Awareness), Blind Shot under its printed conditions (Gunslinger), Ranged Flank, Ricochet Shot and related Fortune approaches. Do not erase normal concealment limits.

### GL-Q3-S04 — Crossing the Killing Floor

**Focus:** Moving fire, two weapons, rifle/carbine and covering others
**Primary Q1 routes (14):** `GL-FT11`, `GL-GS07`, `GL-GS12`, `GL-GS15`, `GL-GS16`, `GL-PT01`, `GL-PTQ01`, `GL-PTQ02`, `GL-PTQ03`, `GL-PTQ04`, `GL-CB01`, `GL-CB03`, `GL-CB04`, `GL-CB08`
**Publication development domains:** Gunslinger, Pistoleer, Carbineer, Fortune

**Rajma:** “You can stand still and be a lovely target. Or you can do something useful.”

**Situation:** Two exposed doors connect a workshop to an evacuation tunnel. Hostile fire crosses the open floor between them. A small group must pass through, and an unattended carbine and a spare pistol lie among the tools. Taking either weapon costs time.

**Question:** How do you get everyone across?

**Five first-person choices:**

**A — I sprint between hard points and fire only when movement gives me a clean, useful shot.**

Developer rationale: Mobile shooting without assuming free attacks.
Candidate existing mechanical keys: `evasion`, `quickDraw` · role `skirmisher`.
Ontology topic candidates (NOT certified mechanical effects): `mobility`, `positioning`.
Published development direction (conditional): Pistoleer: Dash and Blast requires Dual Weapon Mastery I and Running Attack.

**B — I take the carbine, set a stable firing lane, and cover each person as they cross.**

Developer rationale: Use sustained cover rather than a lone duel.
Candidate existing mechanical keys: `firepower`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `offense_ranged`, `teamwork`.
Published development direction (conditional): Carbineer: rifle focus; weapon access in scenario is not proof of trained proficiency.

**C — I carry a pistol in each hand and try to keep the attackers occupied while I move with the group.**

Developer rationale: Dual-weapon moving approach is a future development possibility.
Candidate existing mechanical keys: `dualWield`, `evasion` · role `skirmisher`.
Ontology topic candidates (NOT certified mechanical effects): `dual_wield`, `mobility`.
Published development direction (conditional): Pistoleer: Dash and Blast; do NOT cite quarantined Hailfire/Twin Shot as certified.

**D — I direct one person to watch the exit while I time the others' movement between enemy volleys.**

Developer rationale: Small-team coordination without asserting officer status.
Candidate existing mechanical keys: `tacticalAwareness`, `allySupport` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `tactics`, `teamwork`.
Published development direction (conditional): Gunslinger: Ranged Flank/Keep Them Honest can inform team play if properly acquired.

**E — I draw the attackers toward one side, then retreat behind cover so the tunnel stays open.**

Developer rationale: Diversion through position; risk managed rather than traded for glory.
Candidate existing mechanical keys: `evasion`, `improvisation` · role `skirmisher`.
Ontology topic candidates (NOT certified mechanical effects): `cover`, `positioning`.
Published development direction (conditional): Gunslinger: Retreating Fire has printed action/attack restrictions.

**Shared mechanical teaching (developer only):** Potential paths: Dash and Blast (Pistoleer, printed), Retreating Fire, Keep Them Honest (Gunslinger), Carbineer rifle tactics. Four unverified Pistoleer names from the current pack are *quarantined* and not evidence of published talents.

### GL-Q3-S05 — The Last Charge

**Focus:** Fortune, limited resources, restraint and precision under pressure
**Primary Q1 routes (14):** `GL-AW08`, `GL-FT01`, `GL-FT02`, `GL-FT03`, `GL-FT04`, `GL-FT05`, `GL-FT08`, `GL-FT09`, `GL-FT10`, `GL-FT13`, `GL-GS10`, `GL-CB05`, `GL-CB06`, `GL-CF01`
**Publication development domains:** Fortune, Awareness, Gunslinger, Carbineer

**Rajma:** “Lucky shots exist. So do bad plans wearing a nice hat. Which is this going to be?”

**Situation:** An armored mercenary blocks the only passage to an emergency control panel. Your blaster holds enough power for one reliable shot; its reserve cell is damaged. Behind the mercenary, a heavy door will seal in moments. You do not know how well the armor will hold.

**Question:** What's your last useful move?

**Five first-person choices:**

**A — I take time for one careful shot at the clearest weakness I can identify.**

Developer rationale: One reliable attack; no guaranteed armor bypass.
Candidate existing mechanical keys: `accuracy`, `triggerDiscipline` · role `striker`.
Ontology topic candidates (NOT certified mechanical effects): `precision`, `targeting`.
Published development direction (conditional): Awareness: Weak Point under correct conditions; Gunslinger precision options.

**B — I gamble on a fast shot to distract the mercenary, then rush the door before it seals.**

Developer rationale: High-speed action with acknowledged risk.
Candidate existing mechanical keys: `quickDraw`, `improvisation` · role `skirmisher`.
Ontology topic candidates (NOT certified mechanical effects): `reaction`, `mobility`.
Published development direction (conditional): Gunslinger: quick-draw themes; Fortune: conditional rescue from failed rolls.

**C — I aim at the doorway mechanism instead of the mercenary, hoping to change the problem without winning a duel.**

Developer rationale: Target the environment rather than injury; damage and mechanics rules still apply.
Candidate existing mechanical keys: `tacticalAwareness`, `mechanicalMastery` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `tech`, `targeting`.
Published development direction (conditional): Gunslinger: precise ranged attacks; Mechanics skill not automatically trained.

**D — I hold the shot as a threat and demand room to reach the controls.**

Developer rationale: Use threat and negotiation instead of an automatic hit.
Candidate existing mechanical keys: `authorityPresence`, `persuasionMastery` · role `controller`.
Ontology topic candidates (NOT certified mechanical effects): `social`, `intimidation`.
Published development direction (conditional): Persuasion skill use is separate; no guaranteed intimidation effect.

**E — I abandon the shot and search for a second path or an emergency release before the door closes.**

Developer rationale: Adapt objective and evaluate alternatives under time pressure.
Candidate existing mechanical keys: `resourcefulness`, `tacticalAwareness` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `planning`, `investigation`.
Published development direction (conditional): Fortune: broader adaptability; no free mechanical escape granted.

**Shared mechanical teaching (developer only):** Potential paths: Fortune luck/reroll and survival talents, Weak Point (Awareness), Pistol Duelist or precise Gunslinger techniques, Trusty Sidearm *later* class feature, Carbineer later weapon routes.

---

## Jedi Knight — Miraj (`m01`)

**Mentor source:** `data/dialogue/mentors/miraj/Miraj_dialogues.json`

**Shared Q3 Mentor opening — DRAFT:**

> A Knight is measured as much by the choices made in uncertainty as by skill. Consider what you would do when more than one duty asks for your attention.

### JK-Q3-S01 — The Bridge under Fire

**Focus:** Martial protection, armor, defense, coordinated movement and measured offense
**Primary Q1 routes (42):** `JK-AR01`, `JK-AR02`, `JK-AR03`, `JK-AR04`, `JK-AR05`, `JK-AR06`, `JK-DU01`, `JK-DU02`, `JK-DU03`, `JK-DU05`, `JK-DU06`, `JK-DU07`, `JK-DU08`, `JK-DU09`, `JK-DU11`, `JK-LC01`, `JK-LC03`, `JK-LC04`, `JK-LC06`, `JK-LC07`, `JK-LC08`, `JK-LC10`, `JK-LC11`, `JK-LF01`, `JK-LF02`, `JK-LF04`, `JK-LF05`, `JK-LF06`, `JK-LF08`, `JK-LF10`, `JK-LF12`, `JK-BM01`, `JK-BM02`, `JK-BM03`, `JK-WM01`, `JK-WM02`, `JK-WM03`, `JK-WM04`, `JK-WM05`, `JK-FT01`, `JK-FT06`, `JK-ID02`
**Publication development domains:** Armor Specialist, Duelist, Lightsaber Combat, Lightsaber Forms, Jedi Battlemaster, Jedi Weapon Master

**Miraj:** “A blade can stop an attack. Judgment must decide where the blade belongs.”

**Situation:** A damaged footbridge leads civilians away from a collapsing district. Armed raiders fire from the far approach while people are still crossing. A security team can defend one end but cannot cover the entire span. You have a lightsaber if your build actually provides one; otherwise assume a suitable available weapon without special properties.

**Question:** How do you protect the crossing?

**Five first-person choices:**

**A — I take the exposed position and turn aside attacks until the last civilian reaches safety.**

Developer rationale: Protect people in the firing lane through defense.
Candidate existing mechanical keys: `reactionDefense`, `allySupport` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `deflect`, `defense`.
Published development direction (conditional): Lightsaber Combat: deflection paths; actual Deflect/Block prerequisites and weapon access must be checked.

**B — I cross to confront the raiders directly so they cannot keep firing on the bridge.**

Developer rationale: Disrupt the source of incoming attacks with controlled assault.
Candidate existing mechanical keys: `formMastery`, `meleeDamage` · role `striker`.
Ontology topic candidates (NOT certified mechanical effects): `melee`, `positioning`.
Published development direction (conditional): Duelist, Lightsaber Forms and Jedi Weapon Master directions, depending on owned requirements.

**C — I organize the security team into alternating cover and escort groups so the bridge is never undefended.**

Developer rationale: Coordinate protection without claiming formal command.
Candidate existing mechanical keys: `formation`, `allySupport` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `teamwork`, `tactics`.
Published development direction (conditional): Jedi Battlemaster or team-oriented defensive talents, conditional on real access.

**D — I look for a defensible place to hold the approach rather than chase the raiders into an unknown position.**

Developer rationale: Defend position and avoid overextension.
Candidate existing mechanical keys: `armorMastery`, `tacticalAwareness` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `cover`, `defense`.
Published development direction (conditional): Armor Specialist defense directions; no assumed armor ownership.

**E — I attempt to bring down or isolate the raiders’ firing platform without harming the people crossing below.**

Developer rationale: Control the threat and geometry rather than simply deal damage.
Candidate existing mechanical keys: `tacticalAwareness`, `areaControl` · role `controller`.
Ontology topic candidates (NOT certified mechanical effects): `battlefield_control`, `targeting`.
Published development direction (conditional): Force talent/power access must come from actual actor abilities, not the prestige title.

**Shared mechanical teaching (developer only):** Potential paths: Armor Specialist defensive talents, Lightsaber Combat deflection/redirect where acquired, Duelist precision, Lightsaber Forms, Jedi Battlemaster and Jedi Weapon Master; class does not grant all trees at entry.

### JK-Q3-S02 — A Vanished Witness

**Focus:** Investigation, shadow work, watchfulness and noncombat service
**Primary Q1 routes (20):** `JK-DU04`, `JK-SH01`, `JK-SH02`, `JK-SH03`, `JK-SH04`, `JK-SH05`, `JK-WA01`, `JK-WA02`, `JK-WA03`, `JK-WA04`, `JK-WA05`, `JK-IV01`, `JK-IV02`, `JK-IV03`, `JK-IV04`, `JK-IV05`, `JK-RF01`, `JK-RF03`, `JK-RF04`, `JK-ID03`
**Publication development domains:** Jedi Shadow, Jedi Watchman, Jedi Investigator, Jedi Refugee, Jedi Archivist

**Miraj:** “The danger we cannot name is often the one we are quickest to misjudge.”

**Situation:** A witness to a series of disappearances has stopped answering messages. The only leads are a sealed transit record, contradictory testimony, and rumors that an isolated neighborhood shelters the witness. Entering openly might alert whoever is watching them; sneaking in could breach the trust of people who need your help.

**Question:** Where do you begin?

**Five first-person choices:**

**A — I reconstruct the last known journey and test each lead before deciding whom to confront.**

Developer rationale: Follow traceable evidence without presuming villainy.
Candidate existing mechanical keys: `informationControl`, `knowledgeMastery` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `investigation`, `recon`.
Published development direction (conditional): Jedi Investigator or archivist-inspired study; typed talents and prerequisites remain separate.

**B — I enter quietly and watch for the person watching the witness, keeping myself out of sight.**

Developer rationale: Covert observation as an approach rather than a presumed Shadow ability.
Candidate existing mechanical keys: `stealth`, `infiltration` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `stealth`, `infiltration`.
Published development direction (conditional): Jedi Shadow or Jedi Refugee paths; individual prerequisites and era context apply.

**C — I speak openly with neighborhood residents and ask what would make them comfortable sharing what they know.**

Developer rationale: Build consent and trust instead of assuming access.
Candidate existing mechanical keys: `persuasionMastery`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `persuasion`, `social`.
Published development direction (conditional): Jedi Watchman/Investigator service themes; no automatic social skill grant.

**D — I check the transit system and archived records for a pattern that the witnesses could not have seen.**

Developer rationale: Corroborate historical and technical information.
Candidate existing mechanical keys: `knowledgeMastery`, `hackingSkills` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `knowledge`, `investigation`.
Published development direction (conditional): Jedi Archivist/Investigator themes; Use Computer skill not inferred.

**E — I establish a safe way for the missing witness to contact us without exposing their location.**

Developer rationale: Build a protected communications channel instead of forcing disclosure.
Candidate existing mechanical keys: `tacticalAwareness`, `allySupport` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `support`, `planning`.
Published development direction (conditional): Jedi Watchman/protection themes; no presumed allies or surveillance infrastructure.

**Shared mechanical teaching (developer only):** Potential paths: Jedi Shadow/Watchman/Investigator investigative talents, Jedi Refugee concealment or evasion, and relevant archival analysis. Watchman appointment or Council mandate must not be assumed.

### JK-Q3-S03 — The Infirmary at Dawn

**Focus:** Healing, endurance, hard choices and Force restraint
**Primary Q1 routes (9):** `JK-LF09`, `JK-HE01`, `JK-HE02`, `JK-HE03`, `JK-HE04`, `JK-RF02`, `JK-FT02`, `JK-FT03`, `JK-FT05`
**Publication development domains:** Jedi Healer, Lightsaber Forms, Force Technique, Jedi Refugee, Armor Specialist

**Miraj:** “Not every life can be saved by moving faster. Sometimes the challenge is knowing what help can truly do.”

**Situation:** A settlement infirmary suffers a power failure during a storm. Three injured people need different kinds of care, a local medic has limited supplies, and the generator is failing. The medic knows the patients but asks for your help prioritizing. None is guaranteed to survive through Force use alone.

**Question:** What do you do first?

**Five first-person choices:**

**A — I help the medic assess who needs immediate treatment and work beside them instead of replacing their judgment.**

Developer rationale: Support triage and professional expertise.
Candidate existing mechanical keys: `healingMastery`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `medical`, `support`.
Published development direction (conditional): Jedi Healer themes; Treat Injury or Force treatment must be legal for the specific actor.

**B — I focus on stabilizing the generator so the medic has light, equipment and time to work.**

Developer rationale: Technical support as care; avoid invented Mechanics training.
Candidate existing mechanical keys: `mechanicalMastery`, `engineeringMastery` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `repair`, `tech`.
Published development direction (conditional): Jedi Artisan technical direction if applicable; otherwise normal skill rules.

**C — I organize the people outside to move patients and gather what supplies the settlement still has.**

Developer rationale: Logistics and cooperation, no medical superpower assumed.
Candidate existing mechanical keys: `formation`, `resourceControl` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `teamwork`, `resources`.
Published development direction (conditional): Jedi Battlemaster/Instructor cooperative themes, if separately accessible.

**D — I use a protective Force ability I truly know to keep a patient safe while the medic works.**

Developer rationale: Explicitly conditioned on known powers; intent to protect not a grant.
Candidate existing mechanical keys: `healingMastery`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `force_support`, `defense`.
Published development direction (conditional): Jedi Healer/Force powers where possessed; Force Technique is not a level-1 class grant.

**E — I secure the structure against the storm before more people are injured, then return to assist treatment.**

Developer rationale: Prevent further harm before allocating scarce care.
Candidate existing mechanical keys: `tacticalAwareness`, `resourcefulness` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `defense`, `survivability`.
Published development direction (conditional): Armor/defense themes and general protective skill use; no assumed damage reduction.

**Shared mechanical teaching (developer only):** Potential paths: Jedi Healer talents and relevant Force powers only if known; Control and Force Techniques are distinct and may be later-level. Treat Injury is not granted automatically by Knighthood.

### JK-Q3-S04 — The Disputed Archive

**Focus:** Research, relic ethics, craft and cultural responsibility
**Primary Q1 routes (10):** `JK-AV01`, `JK-AV02`, `JK-AV03`, `JK-AV04`, `JK-AV05`, `JK-AT01`, `JK-AT02`, `JK-AT03`, `JK-AT04`, `JK-AT05`
**Publication development domains:** Jedi Archivist, Jedi Artisan, Jedi Investigator, Jedi Instructor, Jedi Watchman

**Miraj:** “Knowledge can survive a war only if we decide whose trust we are willing to honor.”

**Situation:** Two communities claim an ancient artifact found inside a damaged archive. One asks for its immediate return; the other fears that moving it will destroy inscriptions essential to their shared history. A researcher believes it can be stabilized, but the process may erase faint markings. There is no evidence either community acts in bad faith.

**Question:** How do you proceed?

**Five first-person choices:**

**A — I document the artifact and the surrounding evidence before anyone changes its condition.**

Developer rationale: Preservation through accurate observation.
Candidate existing mechanical keys: `knowledgeMastery`, `informationControl` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `knowledge`, `investigation`.
Published development direction (conditional): Jedi Archivist directions; no automatic archive access.

**B — I consult the researcher about reversible stabilization before deciding whether the artifact can safely be moved.**

Developer rationale: Prefer reversible technical intervention, not guaranteed results.
Candidate existing mechanical keys: `engineeringMastery`, `technicalInnovation` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `crafting`, `tech`.
Published development direction (conditional): Jedi Artisan development, conditional equipment and skill prerequisites.

**C — I invite both communities to decide together what evidence matters and who may handle the artifact.**

Developer rationale: Facilitate consent and cooperation rather than impose authority.
Candidate existing mechanical keys: `persuasionMastery`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `social`, `teamwork`.
Published development direction (conditional): Service/diplomacy approaches, not a mandated Jedi Council ruling.

**D — I investigate the excavation record to learn how the artifact reached this disputed site.**

Developer rationale: Trace provenance before making an ownership judgment.
Candidate existing mechanical keys: `knowledgeMastery`, `tacticalAwareness` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `investigation`, `galactic_lore`.
Published development direction (conditional): Jedi Investigator/Archivist themes; exact skill tags are not automatic.

**E — I propose making accurate copies and teaching both communities how to preserve the original.**

Developer rationale: Share knowledge while safeguarding the source.
Candidate existing mechanical keys: `knowledgeMastery`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `knowledge`, `support`.
Published development direction (conditional): Jedi Instructor and Archivist themes, no assumed teaching talent ownership.

**Shared mechanical teaching (developer only):** Potential paths: Archivist investigation, Artisan crafting/technical preservation, Investigator verification, Instructor teaching and diplomatic service. None permits overriding ownership or fabricating a Council directive.

### JK-Q3-S05 — A Young Defender’s Choice

**Focus:** Mentoring, discipline, nonlethal restraint and judgment
**Primary Q1 routes (17):** `JK-DU10`, `JK-LC02`, `JK-LC05`, `JK-LC09`, `JK-LF03`, `JK-LF07`, `JK-LF11`, `JK-BM04`, `JK-BM05`, `JK-IN01`, `JK-IN02`, `JK-IN03`, `JK-IN04`, `JK-IN05`, `JK-FT04`, `JK-FT07`, `JK-ID01`
**Publication development domains:** Jedi Instructor, Jedi Battlemaster, Duelist, Lightsaber Combat, Lightsaber Forms

**Miraj:** “A lesson becomes dangerous when the teacher confuses being obeyed with being understood.”

**Situation:** A newly trained volunteer wants to join a dangerous rescue and believes courage alone makes them ready. The rescue team is short-handed; another volunteer argues that sending them would be reckless. You have been asked for an assessment, not appointed their teacher or commander.

**Question:** What guidance do you give?

**Five first-person choices:**

**A — I test the volunteer with a limited practical task and explain what their result shows about the real danger.**

Developer rationale: Assess readiness through evidence, not status.
Candidate existing mechanical keys: `knowledgeMastery`, `tacticalAwareness` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `skills`, `tactics`.
Published development direction (conditional): Jedi Instructor development is aspirational, not proof of a Padawan.

**B — I give the volunteer a safer supporting role so they contribute without bearing risks they cannot yet manage.**

Developer rationale: Adapt role to capacity rather than exclude them entirely.
Candidate existing mechanical keys: `allySupport`, `formation` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `support`, `teamwork`.
Published development direction (conditional): Jedi Battlemaster/Instructor cooperative paths, conditional talent availability.

**C — I demonstrate how to defend and disengage, then ask the volunteer to repeat the movement under controlled pressure.**

Developer rationale: Teach defensively before exposure to live combat.
Candidate existing mechanical keys: `formMastery`, `reactionDefense` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `melee_defense`, `skills`.
Published development direction (conditional): Lightsaber Forms/Combat and Duelist, subject to legal ability and weapon state.

**D — I speak privately about what they hope to prove and whether that motive is clouding their judgment.**

Developer rationale: Explore motivation and self-knowledge.
Candidate existing mechanical keys: `persuasionMastery`, `knowledgeMastery` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `social`, `investigation`.
Published development direction (conditional): Instructor/Watchman mentorship themes; not an alignment grade.

**E — I decline to approve the dangerous assignment and offer to prepare them for a later mission instead.**

Developer rationale: Accountability with a longer path to competence.
Candidate existing mechanical keys: `tacticalAwareness`, `allySupport` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `planning`, `support`.
Published development direction (conditional): Jedi Instructor and defensive progression themes, not a direct mechanical veto feature.

**Shared mechanical teaching (developer only):** Potential paths: Jedi Instructor and Battlemaster support, Duelist or Lightsaber Forms controlled technique, relevant Force Technique later-level development. No learner, Padawan, or Council role is presumed.

---

## Jedi Master — Miraj (`m01`)

**Mentor source:** `data/dialogue/mentors/miraj/Miraj_dialogues.json`

**Shared Q3 Mentor opening — DRAFT:**

> A Master’s decisions may outlive the moment in which they are made. We should examine not only what you can do, but what others must live with afterward.

**Q1 anchor caveat:** Some source Q1 routes are restricted or quarantined. They can route to hypothetical scenarios, but the underlying Q1 talent is not certified or granted. Specific flagged routes are preserved in the JSON.

### JM-Q3-S01 — A Council That Is Not Yours

**Focus:** Institutional restraint, combat readiness, fear and independent judgment
**Primary Q1 routes (15):** `JM-DU01`, `JM-DU02`, `JM-DU03`, `JM-DU04`, `JM-DU05`, `JM-DU06`, `JM-DU07`, `JM-DU08`, `JM-DU09`, `JM-DU10`, `JM-DU11`, `JM-CT01`, `JM-CT02`, `JM-CF01`, `JM-ID03`
**Publication development domains:** Duelist, Master class identity, Control

**Miraj:** “A title offers no immunity from error. Even those who speak with confidence may need to be questioned.”

**Situation:** At a neutral settlement, a delegation asks you to endorse a preemptive strike against a suspected raider camp. The evidence is incomplete, but the delegates fear another attack. Armed escorts await a decision. You hold no authority over this settlement and have not been appointed to a Jedi Council.

**Question:** How do you respond to the request?

**Five first-person choices:**

**A — I require a fuller account of the alleged threat before lending my name to an attack.**

Developer rationale: Withhold endorsement pending actionable evidence.
Candidate existing mechanical keys: `knowledgeMastery`, `tacticalAwareness` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `investigation`, `planning`.
Published development direction (conditional): Jedi Master: deliberative judgment; Sense-oriented Force talents require individual legality.

**B — I offer to approach the camp under a truce and determine whether a peaceful response is possible.**

Developer rationale: Accept personal diplomatic exposure rather than order soldiers into danger.
Candidate existing mechanical keys: `persuasionMastery`, `reactionDefense` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `social`, `defense`.
Published development direction (conditional): Duelist defensive alternatives; social checks and Force use remain conditional.

**C — I prepare defenses for the settlement while the delegates seek proof of an imminent attack.**

Developer rationale: Protect against the possibility without treating suspicion as certainty.
Candidate existing mechanical keys: `tacticalAwareness`, `allySupport` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `defense`, `tactics`.
Published development direction (conditional): Duelist/Control defensive directions; Fearless is a feature only after legal acquisition.

**D — I explain the foreseeable costs of a strike and ask the delegation to own the decision instead of borrowing my title.**

Developer rationale: Use influence to clarify responsibility, not substitute jurisdiction.
Candidate existing mechanical keys: `knowledgeMastery`, `authorityPresence` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `leadership`, `social`.
Published development direction (conditional): Jedi Master identity and knowledge; no inherited political command.

**E — I quietly investigate the camp myself so the settlement does not risk a whole patrol on an unverified threat.**

Developer rationale: Limited reconnaissance, with danger acknowledged.
Candidate existing mechanical keys: `evasion`, `knowledgeMastery` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `recon`, `investigation`.
Published development direction (conditional): Sense and other class-independent Force talents if actually acquired.

**Shared mechanical teaching (developer only):** Potential paths: Duelist defensive mastery, Control Force talents and the Jedi Master Fearless/Serenity class features upon finalized acquisition. A Master is not automatically a Council member or commander.

### JM-Q3-S02 — The Uncontrolled Surge

**Focus:** Force power shaping, protection, timing and resource judgment
**Primary Q1 routes (18):** `JM-FS01`, `JM-FS02`, `JM-FS04`, `JM-FS05`, `JM-FS06`, `JM-FS07`, `JM-FS08`, `JM-FS10`, `JM-FS11`, `JM-FS13`, `JM-AL01`, `JM-AL02`, `JM-AL03`, `JM-AL05`, `JM-AL06`, `JM-AL08`, `JM-AL10`, `JM-CT06`
**Publication development domains:** Force Secrets, Alter, Control, Duelist

**Miraj:** “Greater reach can magnify an error as surely as a success. Where would you place your effort?”

**Situation:** An unstable power conduit at a research outpost begins releasing dangerous energy. Workers are trapped on two sides of the chamber, with volatile equipment between them. You believe a suitable Force power might help, but you do not know which powers are available to this character beyond the verified build.

**Question:** What is your first plan?

**Five first-person choices:**

**A — I would shape a power I actually know around the workers, even if that limits how much of the chamber I can affect.**

Developer rationale: Selectivity and restraint under area risk.
Candidate existing mechanical keys: `areaControl`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `force_power`, `force_support`.
Published development direction (conditional): Force Secret: Shaped Power is a later-level eligible aspiration, never a level-one grant.

**B — I would bring a protective Force effect to the most exposed worker first, then reassess the others.**

Developer rationale: Prioritize immediate protection and then update plan.
Candidate existing mechanical keys: `allySupport`, `tacticalAwareness` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `force_defense`, `ally_support`.
Published development direction (conditional): Control talents and self/ally Force powers if available; no automatic new power.

**C — I would wait for the conduit to cycle, then time one decisive intervention to interrupt the next surge.**

Developer rationale: Timing and efficient activation over raw magnitude.
Candidate existing mechanical keys: `tacticalAwareness`, `flowState` · role `controller`.
Ontology topic candidates (NOT certified mechanical effects): `tactics`, `force_power`.
Published development direction (conditional): Quicken Power and Linked Power are future Force Secret directions with costs and timing constraints.

**D — I would coordinate an evacuation while the technicians isolate the equipment, using the Force only where it can safely help.**

Developer rationale: Operational coordination with specialists rather than presumed omnipotence.
Candidate existing mechanical keys: `allySupport`, `technicalMastery` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `teamwork`, `tech`.
Published development direction (conditional): Master-level leadership and Control/Alter support; technicians are scenario NPCs, not owned followers.

**E — I would study the surge pattern first and choose the smallest intervention that can change its course.**

Developer rationale: Diagnose before activating powerful effects.
Candidate existing mechanical keys: `knowledgeMastery`, `tacticalAwareness` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `awareness`, `planning`.
Published development direction (conditional): Sense Force talent directions and technical knowledge; no forced Use the Force success.

**Shared mechanical teaching (developer only):** Published future paths include Shaped Power, Multitarget Power, Distant Power, Remote Power, Quicken Power and other Force Secrets only at Jedi Master levels 2–5; Control/Alter talents require specific ownership and prerequisites.

### JM-Q3-S03 — The Shrine with Two Voices

**Focus:** Light/dark restrictions, tradition, spiritual inquiry and restraint
**Primary Q1 routes (16):** `JM-FS09`, `JM-FS12`, `JM-AL09`, `JM-LS01`, `JM-LS02`, `JM-LS03`, `JM-LS04`, `JM-DS01`, `JM-DS02`, `JM-DS03`, `JM-DS04`, `JM-DS05`, `JM-TR01`, `JM-TR02`, `JM-TR03`, `JM-ID01`
**Publication development domains:** Light Side, Dark Side, Eligible traditions, Guardian Spirit, Force Secrets

**Miraj:** “The Force is heard through many traditions. Some answers ask for a price their seekers have not considered.”

**Situation:** An old shrine reacts to the presence of Force-sensitive visitors. One chamber offers knowledge recorded by a long-dead teacher; another radiates a presence that promises immediate strength. Local custodians warn that either interaction could change the site. No teacher, guardian spirit, or tradition membership is established for your character.

**Question:** Which path do you take?

**Five first-person choices:**

**A — I listen to the custodians and study the shrine before entering either chamber.**

Developer rationale: Respect context and seek evidence before power.
Candidate existing mechanical keys: `knowledgeMastery`, `informationControl` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `knowledge`, `galactic_lore`.
Published development direction (conditional): Universal Sense and qualifying tradition talents; ownership must be actor-certified.

**B — I attempt a calm, limited contact with the recorded teacher, prepared to end it if the shrine changes.**

Developer rationale: Controlled inquiry into preserved knowledge.
Candidate existing mechanical keys: `mysticalInfluence`, `knowledgeMastery` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `force`, `knowledge`.
Published development direction (conditional): Holocron Loremaster is a later Secret with specific requirements; do not assume a holocron.

**C — I secure the entrance and protect the visitors before investigating the promise of power.**

Developer rationale: Contain unknown danger and protect those nearby.
Candidate existing mechanical keys: `reactionDefense`, `allySupport` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `defense`, `force_defense`.
Published development direction (conditional): Control defensive talents and legal Guardian Spirit paths, where truly available.

**D — I examine the source of the promised strength to understand its cost without accepting the bargain immediately.**

Developer rationale: Investigate temptation without scoring player alignment.
Candidate existing mechanical keys: `knowledgeMastery`, `tacticalAwareness` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `force`, `investigation`.
Published development direction (conditional): Dark Side talents/Corrupted Power remain restricted, and selecting this answer does not change Dark Side Score.

**E — I ask the visitors to leave and preserve the shrine until someone with verified training in its tradition can examine it.**

Developer rationale: Defer action when expertise and access are uncertain.
Candidate existing mechanical keys: `allySupport`, `knowledgeMastery` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `support`, `planning`.
Published development direction (conditional): Force traditions require actual qualification; no invented spiritual authority.

**Shared mechanical teaching (developer only):** Light Side and Dark Side talent access is separately restricted; Force tradition trees require eligible training/membership. Corrupted Power and Pure Power are later Force Secrets with Dark Side Score requirements, not default Jedi Master options.

### JM-Q3-S04 — The Fractured Accord

**Focus:** Healing, mediation, telepathic consent and alliance protection
**Primary Q1 routes (8):** `JM-FS03`, `JM-AL04`, `JM-AL07`, `JM-CT03`, `JM-CT05`, `JM-CT07`, `JM-CT08`, `JM-CT09`
**Publication development domains:** Alter, Control, Force support, Master identity

**Miraj:** “To end a conflict is not always to defeat its fiercest speaker.”

**Situation:** Two relief convoys have stopped cooperating after each accuses the other of hoarding medicine. The wounded are waiting, and a rumor spreads that one convoy has sabotaged the other. Both representatives agree to meet if they are not forced to submit to mental scrutiny.

**Question:** How do you help them move forward?

**Five first-person choices:**

**A — I check the medicine inventories with representatives from both convoys so their claims can be tested together.**

Developer rationale: Shared verified facts rather than presumed deceit.
Candidate existing mechanical keys: `resourceControl`, `knowledgeMastery` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `resources`, `investigation`.
Published development direction (conditional): Universal knowledge/skills; Jedi Master does not automatically access Jedi Archivist or Healer trees.

**B — I treat the most urgent injuries with whatever healing skill or known Force power I can legally use.**

Developer rationale: Care is urgent, independent of diplomacy.
Candidate existing mechanical keys: `healingMastery`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `medical`, `healing`.
Published development direction (conditional): Any healing skill or Force talent must come from actual character build.

**C — I guide a negotiation with clear agreements about supplies and independent verification.**

Developer rationale: Build an enforceable settlement rather than seize resources.
Candidate existing mechanical keys: `persuasionMastery`, `networkInfluence` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `social`, `teamwork`.
Published development direction (conditional): Social skills, possibly earlier-class features; no Council or command mandate.

**D — I quietly protect the waiting patients while the representatives settle their accusations.**

Developer rationale: Keep vulnerable people out of retaliatory danger.
Candidate existing mechanical keys: `damageMitigationAura`, `allySupport` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `support`, `defense`.
Published development direction (conditional): Control Force defensive directions, conditional on owned powers.

**E — I propose a temporary shared distribution team and offer to monitor it until trust returns.**

Developer rationale: Create cooperative process without becoming permanent ruler.
Candidate existing mechanical keys: `formation`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `teamwork`, `resources`.
Published development direction (conditional): General collaborative role; later-level Multitarget/Extend Power is not assumed.

**Shared mechanical teaching (developer only):** Possible directions: Force Treatment only if separately legally accessible, Universal Control support, Alter telepathy and allied support, plus later Force Secrets for modified powers. Do not infer compulsory mind reading or class access to Jedi Healer tree.

### JM-Q3-S05 — The Vision Before the Storm

**Focus:** Prophetic interpretation, senses, preparation and humility
**Primary Q1 routes (20):** `JM-FS14`, `JM-FS15`, `JM-CT04`, `JM-SE01`, `JM-SE02`, `JM-SE03`, `JM-SE04`, `JM-SE05`, `JM-SE06`, `JM-SE07`, `JM-SE08`, `JM-SE09`, `JM-SE10`, `JM-GS01`, `JM-GS02`, `JM-GS03`, `JM-GS04`, `JM-GS05`, `JM-CF02`, `JM-ID02`
**Publication development domains:** Sense, Guardian Spirit, Force Secrets, Class identity

**Miraj:** “A vision is a warning about possible choices, not a certificate of certainty.”

**Situation:** A strange vision—or a report from a credible seer, if the character has no relevant power—suggests a coastal town could be flooded by a coming storm. The details are symbolic: a broken bell, a crowded quay, and ships without lights. Weather readings are inconclusive; evacuation would be costly.

**Question:** What do you do with the warning?

**Five first-person choices:**

**A — I seek additional observations and test the warning against the town’s weather records.**

Developer rationale: Corroborate impressions with evidence.
Candidate existing mechanical keys: `knowledgeMastery`, `tacticalAwareness` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `investigation`, `awareness`.
Published development direction (conditional): Sense talent themes including Force Perception and Visions, if legal.

**B — I organize a precautionary evacuation plan without claiming the disaster is inevitable.**

Developer rationale: Prepare proportionately under uncertainty.
Candidate existing mechanical keys: `tacticalAwareness`, `allySupport` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `planning`, `support`.
Published development direction (conditional): Jedi Master responsibility and existing build support; no command authority inferred.

**C — I search for the broken bell and unlit ships to discover whether the images describe something other than a storm.**

Developer rationale: Interpret symbolism without literal certainty.
Candidate existing mechanical keys: `informationControl`, `knowledgeMastery` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `investigation`, `galactic_lore`.
Published development direction (conditional): Sense and knowledge routes, conditional on existing capabilities.

**D — I consult a qualified seer or preserved teaching and compare their perspective with my own doubts.**

Developer rationale: Seek independent interpretation, not proof of an owned mentor or holocron.
Candidate existing mechanical keys: `networkInfluence`, `knowledgeMastery` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `knowledge`, `visions`.
Published development direction (conditional): Guardian Spirit and Holocron Loremaster remain special, gated avenues.

**E — I make sure the harbor workers understand the risk and let them help decide what precautions are worth taking.**

Developer rationale: Share decisions with those affected.
Candidate existing mechanical keys: `persuasionMastery`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `social`, `teamwork`.
Published development direction (conditional): Service/leadership intent only; no automatic persuasion or leadership talent.

**Shared mechanical teaching (developer only):** Sense talents and Guardian Spirit options require actual access; Visions is not proof of a fixed future. Holocron Loremaster and Mentor Secret are later-level and specifically gated. Do not imply current prophecy ownership.

---

## Officer — Admiral Korr (`m16`)

**Mentor source:** `data/dialogue/mentors/korr/korr_dialogue.json`

**Shared Q3 Mentor opening — DRAFT:**

> An officer’s judgment is tested where orders meet the people who must carry them out. Consider these decisions before deciding what kind of leader you intend to be.

**Q1 anchor caveat:** Some source Q1 routes are restricted or quarantined. They can route to hypothetical scenarios, but the underlying Q1 talent is not certified or granted. Specific flagged routes are preserved in the JSON.

### OF-Q3-S01 — The Divided Evacuation

**Focus:** Casualty protection, withdrawal and adaptive operational priorities
**Primary Q1 routes (15):** `OF-CO01`, `OF-CO03`, `OF-CO05`, `OF-CO07`, `OF-CO09`, `OF-CO10`, `OF-CO11`, `OF-CO12`, `OF-CO14`, `OF-LE01`, `OF-LE03`, `OF-MT08`, `OF-FC05`, `OF-CF01`, `OF-ID03`
**Publication development domains:** Commando, Leadership, Military Tactics, Fugitive Commander

**Admiral Korr:** “No plan can protect everyone equally. An officer must make the danger visible, not merely hide it in an order.”

**Situation:** A relief column must move civilians through two passages: the shorter route has been shelled recently, while the longer route is exposed to extreme weather. Volunteers and a small security detachment are willing to help, but you are only advising the operation and do not automatically command them.

**Question:** What do you recommend?

**Five first-person choices:**

**A — I scout both approaches before moving the civilians so we choose from evidence rather than guesswork.**

Developer rationale: Reconnaissance before operational commitment.
Candidate existing mechanical keys: `tacticalAwareness`, `informationControl` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `recon`, `planning`.
Published development direction (conditional): Commando: Battle Analysis under specific Knowledge (tactics) rules.

**B — I divide the volunteers into escort and medical groups and coordinate movement to reduce exposure.**

Developer rationale: Coordinate safety through roles and logistics.
Candidate existing mechanical keys: `formation`, `allySupport` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `teamwork`, `tactics`.
Published development direction (conditional): Leadership/Military Tactics; no automatic additional actions for allies.

**C — I place defensive fire teams along the threatened approach while the first civilians cross.**

Developer rationale: Protect movement through cover rather than seek kills.
Candidate existing mechanical keys: `tacticalSupport`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `support`, `offense_ranged`.
Published development direction (conditional): Commando: Cover Fire/Keep Them at Bay when owned.

**D — I insist on a route that keeps wounded and vulnerable people out of the heaviest fire, even if it delays arrival.**

Developer rationale: Prioritize vulnerability and supply constraints.
Candidate existing mechanical keys: `resourceControl`, `allySupport` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `planning`, `support`.
Published development direction (conditional): Fugitive Commander support or leadership themes, conditionally.

**E — I prepare a clear withdrawal signal and fallback assembly point before authorizing anyone to advance.**

Developer rationale: Design an exit before proceeding.
Candidate existing mechanical keys: `tacticalAwareness`, `rapidResponse` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `planning`, `tactics`.
Published development direction (conditional): Military Tactics and Commando withdrawal paths; no guaranteed shared movement.

**Shared mechanical teaching (developer only):** Possible development: Cover Fire, Harm’s Way, Tactical Withdrawal, condition and morale support, and Military Tactics; each has prerequisites and situational limits. No automatic military rank or unit ownership.

### OF-Q3-S02 — The Broken Chain

**Focus:** Communication, morale, delegation and leadership legitimacy
**Primary Q1 routes (14):** `OF-CO06`, `OF-CO13`, `OF-LE02`, `OF-LE04`, `OF-LE05`, `OF-LE06`, `OF-LE08`, `OF-LE10`, `OF-LE11`, `OF-MT02`, `OF-FC01`, `OF-FC02`, `OF-CF02`, `OF-ID01`
**Publication development domains:** Leadership, Fugitive Commander, Military Tactics, Officer class features

**Admiral Korr:** “Orders that never reach the people responsible for them are not a plan. They are a hope.”

**Situation:** During a joint disaster response, two field teams receive conflicting instructions from different coordinators. Communications are intermittent, and both team leaders believe they are following the correct plan. You are asked to mediate but have no authority to dismiss either leader.

**Question:** How do you restore coordination?

**Five first-person choices:**

**A — I establish one verified objective and ask both leaders to repeat it in their own words.**

Developer rationale: Create shared understanding, not coerced obedience.
Candidate existing mechanical keys: `commandAuthority`, `formation` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `command`, `teamwork`.
Published development direction (conditional): Leadership and Military Tactics, conditional on actual talent ownership.

**B — I compare the teams’ reports to locate where the instructions diverged before changing either plan.**

Developer rationale: Trace the source of conflicting orders.
Candidate existing mechanical keys: `informationControl`, `tacticalAwareness` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `investigation`, `tactics`.
Published development direction (conditional): Military Tactics and Knowledge (tactics) use, if applicable.

**C — I give each team a limited, independent task they can complete even if the connection drops again.**

Developer rationale: Build resilience with scoped delegation.
Candidate existing mechanical keys: `unitCoordination`, `adaptability` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `teamwork`, `planning`.
Published development direction (conditional): Leadership and Fugitive Commander alternatives; no preset ranks.

**D — I focus on calming the people most shaken by the conflicting orders before I issue new recommendations.**

Developer rationale: Restore trust and willingness to act.
Candidate existing mechanical keys: `moraleBonus`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `morale`, `support`.
Published development direction (conditional): Leadership morale paths; do not claim a free mind-affecting removal feature.

**E — I arrange a fallback signal and timetable so the teams can reunite without continuous communications.**

Developer rationale: Contingency process as operational design.
Candidate existing mechanical keys: `tacticalAwareness`, `resourcefulness` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `planning`, `tech`.
Published development direction (conditional): Military Tactics and general signal equipment; possession of devices is not assumed.

**Shared mechanical teaching (developer only):** Potential paths: Leadership and Military Tactics group benefits; Share Talent is an Officer even-level feature with a strict previously possessed talent list, not a free shared ability at entry.

### OF-Q3-S03 — The Disputed Target

**Focus:** Tactical assessment, restraint, force allocation and evidence
**Primary Q1 routes (14):** `OF-CO02`, `OF-CO04`, `OF-CO08`, `OF-LE07`, `OF-MT01`, `OF-MT05`, `OF-MT06`, `OF-MT09`, `OF-MT10`, `OF-MT11`, `OF-MT12`, `OF-MT13`, `OF-MT15`, `OF-MT16`
**Publication development domains:** Military Tactics, Commando, Leadership

**Admiral Korr:** “A target on a map is still a place where consequences happen.”

**Situation:** A reconnaissance report marks a fortified warehouse as an enemy supply point. A second report suggests civilians have been sheltering there. A strike window is closing. A joint task force asks you for a tactical recommendation; no one has verified which report is current.

**Question:** What do you recommend?

**Five first-person choices:**

**A — I delay the strike recommendation until scouts can distinguish civilians from the reported enemy supplies.**

Developer rationale: Corroborate intelligence before irreversible force.
Candidate existing mechanical keys: `informationControl`, `tacticalAwareness` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `recon`, `investigation`.
Published development direction (conditional): Commando: Battle Analysis and Military Tactics, under their actual action rules.

**B — I propose isolating the warehouse and controlling the exits rather than attacking it directly.**

Developer rationale: Contain the location and create options.
Candidate existing mechanical keys: `areaControl`, `unitCoordination` · role `controller`.
Ontology topic candidates (NOT certified mechanical effects): `battlefield_control`, `tactics`.
Published development direction (conditional): Military Tactics and Commando positioning, not free battlefield powers.

**C — I identify the smallest target that could stop hostile operations without endangering the shelter area.**

Developer rationale: Discriminate a limited target over maximal damage.
Candidate existing mechanical keys: `accuracy`, `tacticalAwareness` · role `striker`.
Ontology topic candidates (NOT certified mechanical effects): `targeting`, `planning`.
Published development direction (conditional): Military Tactics and designated fire coordination, with normal weapon rules.

**D — I position relief and evacuation teams before any strike decision so civilians have an exit.**

Developer rationale: Protect civilians even if another officer decides to attack.
Candidate existing mechanical keys: `allySupport`, `formation` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `teamwork`, `support`.
Published development direction (conditional): Leadership and Commando safety/support paths.

**E — I lay out the uncertainty and consequences for the task force instead of disguising them behind a confident prediction.**

Developer rationale: Exercise accountable professional judgment, not magical certainty.
Candidate existing mechanical keys: `knowledgeMastery`, `authorityPresence` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `leadership`, `knowledge`.
Published development direction (conditional): Officer identity; no assumption of supreme command or official rank.

**Shared mechanical teaching (developer only):** Possible paths: Knowledge (tactics) and Military Tactics planning, Commando suppression and tactical analysis, targeted attacks, protection. No invented authorization to order airstrikes.

### OF-Q3-S04 — The Distant Fleet

**Focus:** Naval command, coordination, formation and information limits
**Primary Q1 routes (8):** `OF-MT03`, `OF-MT04`, `OF-MT07`, `OF-NO01`, `OF-NO02`, `OF-NO03`, `OF-NO04`, `OF-NO05`
**Publication development domains:** Naval Officer, Military Tactics, Leadership

**Admiral Korr:** “You do not need a flag on your sleeve to understand why ships must move together.”

**Situation:** Three allied vessels are evacuating a frontier station. Their crews agree to cooperate, but sensor contact is intermittent and a hostile patrol is closing. One vessel is faster, another carries most evacuees, and the third has damaged engines. You have been invited to propose a plan over the shared channel.

**Question:** What is your recommendation?

**Five first-person choices:**

**A — I build a shared movement schedule based on each vessel’s actual speed and damage before issuing any proposed formation.**

Developer rationale: Coordinate realistic capabilities, not an imaginary perfect fleet.
Candidate existing mechanical keys: `unitCoordination`, `tacticalAwareness` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `vehicle`, `tactics`.
Published development direction (conditional): Naval Officer talents and Knowledge (tactics), with ship and range prerequisites.

**B — I propose screening the evacuee transport with the more maneuverable ship while leaving an escape lane open.**

Developer rationale: Prioritize protection via ship placement.
Candidate existing mechanical keys: `formation`, `allySupport` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `positioning`, `teamwork`.
Published development direction (conditional): Naval Officer defensive formation themes; no automatically granted Escort Pilot.

**C — I ask each crew to transmit its latest sensor reading and combine the reports before choosing a course.**

Developer rationale: Improve shared situational awareness.
Candidate existing mechanical keys: `informationControl`, `technicalMastery` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `sensors`, `recon`.
Published development direction (conditional): Naval Officer communications; Use Computer and sensor systems require normal access.

**D — I make the hostile patrol spend time chasing the fastest ship while the damaged one withdraws.**

Developer rationale: Create separation with decoy risk, not a guaranteed feint.
Candidate existing mechanical keys: `tacticalAwareness`, `evasionTactics` · role `controller`.
Ontology topic candidates (NOT certified mechanical effects): `tactics`, `movement`.
Published development direction (conditional): Naval Officer and military feint directions where legally acquired.

**E — I coordinate a staggered retreat so no vessel is left alone when its engines fail.**

Developer rationale: Adapt formation to weakest asset.
Candidate existing mechanical keys: `allySupport`, `unitCoordination` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `teamwork`, `vehicle`.
Published development direction (conditional): Military Tactics/Naval Officer, with no assumed flagship or squadron control.

**Shared mechanical teaching (developer only):** Potential paths: Naval Officer and Military Tactics ship coordination; talent restrictions, ship requirements and communication conditions apply. No assumed command of ships, crews, or fleet.

### OF-Q3-S05 — The Enemy at the Table

**Focus:** Recruitment, broken alliances, diplomacy and duty under uncertainty
**Primary Q1 routes (11):** `OF-LE09`, `OF-MT14`, `OF-FC03`, `OF-FC04`, `OF-FC06`, `OF-RR01`, `OF-RR02`, `OF-RR03`, `OF-RR04`, `OF-RR05`, `OF-ID02`
**Publication development domains:** Fugitive Commander, Rebel Recruiter, Leadership, Military Tactics

**Admiral Korr:** “Recruitment is not simply changing a uniform. Loyalty must survive the first inconvenient decision.”

**Situation:** A deserter from an opposing militia offers operational information in return for safe passage. Local defenders fear a trap; the deserter insists others could be persuaded to leave if treated fairly. You do not know whether the deserter is sincere, and you have no jurisdiction to promise immunity.

**Question:** What do you recommend?

**Five first-person choices:**

**A — I verify one harmless, independently testable claim before treating the deserter as a reliable source.**

Developer rationale: Incremental verification with bounded risk.
Candidate existing mechanical keys: `informationControl`, `tacticalAwareness` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `investigation`, `planning`.
Published development direction (conditional): Military Tactics and investigation; no automatic interrogation power.

**B — I negotiate temporary protection with the people who actually have the authority to provide it.**

Developer rationale: Respect jurisdiction while seeking a constructive agreement.
Candidate existing mechanical keys: `persuasionMastery`, `networkInfluence` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `social`, `leadership`.
Published development direction (conditional): Rebel Recruiter dialogue themes; no affiliation or conversion talent assumed.

**C — I request a supervised debrief and separate the useful intelligence from the deserter’s motives.**

Developer rationale: Professional fact-gathering without assumed guilt.
Candidate existing mechanical keys: `knowledgeMastery`, `informationControl` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `investigation`, `knowledge`.
Published development direction (conditional): Fugitive Commander/Military Tactics informational pathways.

**D — I outline a safe, voluntary route for other militia members to leave rather than pressure them to fight us.**

Developer rationale: De-escalation through credible exit options.
Candidate existing mechanical keys: `allySupport`, `moraleBonus` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `support`, `morale`.
Published development direction (conditional): Rebel Recruiter: Recruit Enemy applies only with strict printed restrictions.

**E — I keep a guarded contingency ready in case the meeting is a lure, while avoiding an attack without evidence.**

Developer rationale: Couple openness to an executable security plan.
Candidate existing mechanical keys: `tacticalAwareness`, `formation` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `defense`, `planning`.
Published development direction (conditional): Commando/Military Tactics defense and leadership paths.

**Shared mechanical teaching (developer only):** Potential paths: Fugitive Commander and Rebel Recruiter conditional support/recruitment. Rebel Recruiter talents have living-target, persuasion and combat gates, and are not universal Rebel allegiance. Talent homonyms require source-keyed identity.

---

## Sith Apprentice — Darth Malbada (`m07`)

**Mentor source:** `data/dialogue/mentors/darth_malbada/darth_malbada_dialogue.json`

**Shared Q3 Mentor opening — DRAFT:**

> Potential means nothing if you cannot wield it when a choice becomes costly. Show me what you would do, and do not expect admiration for merely wanting power.

**Q1 anchor caveat:** Some source Q1 routes are restricted or quarantined. They can route to hypothetical scenarios, but the underlying Q1 talent is not certified or granted. Specific flagged routes are preserved in the JSON.

### SA-Q3-S01 — The Blade at the Gate

**Focus:** Dueling, armor, survival and defensive timing
**Primary Q1 routes (22):** `SA-AR01`, `SA-AR02`, `SA-AR03`, `SA-AR04`, `SA-AR05`, `SA-AR06`, `SA-DU01`, `SA-DU02`, `SA-DU03`, `SA-DU05`, `SA-DU06`, `SA-DU07`, `SA-DU09`, `SA-DU11`, `SA-LC01`, `SA-LC02`, `SA-LC04`, `SA-LC05`, `SA-LC06`, `SA-LC08`, `SA-LC09`, `SA-LC11`
**Publication development domains:** Armor Specialist, Duelist, Lightsaber Combat

**Darth Malbada:** “A challenge at the threshold. How tiresome. At least it may teach you something useful.”

**Situation:** An armed rival blocks the only safe entrance to a sealed training compound and demands a duel before allowing passage. They are alert, but have not attacked. The rival wears protective gear and has an unknown fighting style. Bystanders are behind you, beyond the rival’s immediate reach.

**Question:** How do you claim passage?

**Five first-person choices:**

**A — I watch the rival’s stance and make the first exchange a test of their reach and habits.**

Developer rationale: Study and control rather than open with maximum force.
Candidate existing mechanical keys: `formMastery`, `tacticalAwareness` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `melee`, `tactics`.
Published development direction (conditional): Duelist and Lightsaber Combat, conditional on owned feats and talents.

**B — I force the duel forward with aggressive attacks before the rival settles into a rhythm.**

Developer rationale: Apply pressure through weapon skill; risk remains.
Candidate existing mechanical keys: `meleeDamage`, `combatFlow` · role `striker`.
Ontology topic candidates (NOT certified mechanical effects): `offense_melee`, `melee`.
Published development direction (conditional): Duelist: offensive precision and specialization, with prerequisites.

**C — I maintain a guarded position and let the rival expose an opening by attacking first.**

Developer rationale: Defensive counter as a deliberate style.
Candidate existing mechanical keys: `reactionDefense`, `counterMastery` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `defense`, `counterattack`.
Published development direction (conditional): Duelist: Improved Riposte / defensive reactions if acquired.

**D — I choose protection and steady movement over speed so I can withstand a failed exchange.**

Developer rationale: Armor-led endurance, not the assumption of worn armor or DR.
Candidate existing mechanical keys: `armorMastery`, `damageReduction` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `armor`, `durability`.
Published development direction (conditional): Armor Specialist: Armored Defense, Improved Armored Defense, Armor Mastery; eligibility varies.

**E — I refuse the duel’s terms and seek another way into the compound that does not expose my back to the rival.**

Developer rationale: Reject the premise and solve access strategically.
Candidate existing mechanical keys: `tacticalAwareness`, `resourcefulness` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `planning`, `evasion`.
Published development direction (conditional): General skills and Sith cunning; no free bypass ability.

**Shared mechanical teaching (developer only):** Potential paths: Duelist precision/counters, Lightsaber Combat defensive options, Armor Specialist protective training, subject to talent prerequisites and actual weapons. No automatic unarmed opponent defeat or duel right.

### SA-Q3-S02 — The Cracked Oath

**Focus:** Influence, intimidation, independent ambition and shifting loyalties
**Primary Q1 routes (8):** `SA-SI03`, `SA-SI04`, `SA-SI05`, `SA-SI07`, `SA-SI09`, `SA-SI10`, `SA-SI12`, `SA-ID01`
**Publication development domains:** Sith, Sith Commander, Identity

**Darth Malbada:** “Promises make such beautiful chains. Tell me which link you would break.”

**Situation:** A group of mercenaries guarding a hidden cache has split over an agreement with a powerful patron. One faction will honor the contract, another wants to leave, and a third threatens violence if anyone withdraws. You have no verified authority over the group; they ask whether you can offer them a workable settlement.

**Question:** What do you do?

**Five first-person choices:**

**A — I identify what each faction wants and propose a bargain that makes cooperation more profitable than betrayal.**

Developer rationale: Leverage incentives without claiming a legal contract talent.
Candidate existing mechanical keys: `socialManipulation`, `networkInfluence` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `social`, `intrigue`.
Published development direction (conditional): Sith influence/deception development if class and actor prerequisites allow.

**B — I expose the one faction’s bluff in front of the others so its threat loses credibility.**

Developer rationale: Target credibility and authority through confrontation.
Candidate existing mechanical keys: `intimidation`, `tacticalAwareness` · role `controller`.
Ontology topic candidates (NOT certified mechanical effects): `intimidation`, `investigation`.
Published development direction (conditional): Sith talent directions may support fear, with actual mind-affecting constraints.

**C — I offer the faction that wants to leave a safe exit in exchange for useful information.**

Developer rationale: Turn defection into information without forced allegiance.
Candidate existing mechanical keys: `persuasionMastery`, `informationControl` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `social`, `investigation`.
Published development direction (conditional): Social skill use; Sith Commander recruitment does not follow automatically.

**D — I refuse to negotiate while weapons are raised and secure a defensible position before returning to terms.**

Developer rationale: Protect position instead of performing automatic intimidation.
Candidate existing mechanical keys: `reactionDefense`, `authorityPresence` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `defense`, `positioning`.
Published development direction (conditional): Armor Specialist/Duelist support where acquired.

**E — I challenge the patron’s assumptions about loyalty and ask the mercenaries to decide who truly earns their service.**

Developer rationale: Influence through alternatives; no invented title or personal followers.
Candidate existing mechanical keys: `commandAuthority`, `moraleBonus` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `leadership`, `morale`.
Published development direction (conditional): Sith Commander morale/leadership paths have printed conditions.

**Shared mechanical teaching (developer only):** Potential paths: Sith intimidation/influence talents, Sith Commander limited group tactics; faction membership, possessed minions and actual command are separate from class identity. Selecting an approach does not change Dark Side Score.

### SA-Q3-S03 — The Price of the Relic

**Focus:** Alchemy, technical inquiry and calculated sacrifice
**Primary Q1 routes (5):** `SA-SI11`, `SA-AL01`, `SA-AL02`, `SA-AL03`, `SA-AL04`
**Publication development domains:** Sith Alchemy, Sith, Armor Specialist

**Darth Malbada:** “Power that arrives without a price is usually a trap. Even I prefer to know where it closes.”

**Situation:** A sealed workshop contains a damaged Sith artifact and notes describing how it might be restored. The notes propose using rare materials and a dangerous ritual. A technician can stabilize its casing without using the Force, but claims the artifact may lose some of its unique properties. You have not performed this rite before in the scenario.

**Question:** How do you approach the artifact?

**Five first-person choices:**

**A — I study the inscriptions and the two different restoration methods before committing a resource.**

Developer rationale: Investigate process and cost instead of instant power.
Candidate existing mechanical keys: `knowledgeMastery`, `sithAlchemy` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `knowledge`, `alchemy`.
Published development direction (conditional): Sith Alchemy is future talent development, with two distinct printed source identities.

**B — I ask the technician to preserve the casing first, keeping the artifact intact for later study.**

Developer rationale: Stabilization and reversible work over immediate activation.
Candidate existing mechanical keys: `technicalMastery`, `resourceControl` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `repair`, `tech`.
Published development direction (conditional): Technical skills/equipment not presumed; Sith Alchemy tree does not grant Mechanics training.

**C — I test a limited ritual on a harmless component to learn what energy the artifact will demand.**

Developer rationale: Bounded experiment with an uncertain outcome.
Candidate existing mechanical keys: `sithAlchemy`, `ritualMastery` · role `controller`.
Ontology topic candidates (NOT certified mechanical effects): `alchemy`, `resource_spend`.
Published development direction (conditional): Sith Alchemy/ritual talents require exact dark-side and material prerequisites.

**D — I accept the loss of some unique properties in exchange for a safer, usable artifact.**

Developer rationale: Prefer reliability and risk control over maximal potency.
Candidate existing mechanical keys: `resourcefulness`, `mechanicalMastery` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `crafting`, `modification`.
Published development direction (conditional): Crafting/engineering rules are distinct from talent grants.

**E — I seal the workshop and prevent anyone from activating the relic until its dangers are understood.**

Developer rationale: Contain hazardous technology through procedure.
Candidate existing mechanical keys: `tacticalAwareness`, `areaControl` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `control`, `planning`.
Published development direction (conditional): Sith Alchemy remains optional; no protective wards invented.

**Shared mechanical teaching (developer only):** Potential paths: Jedi Academy Sith Alchemy tree versus the distinct KOTOR Sith-tree talent with the same name; both source identities and prerequisites must be kept separate. No automatic materials, rituals, or illicit actions are granted.

### SA-Q3-S04 — The Unseen Advance

**Focus:** Team tactics, concealment and timing under uncertainty
**Primary Q1 routes (6):** `SA-DU04`, `SA-SI06`, `SA-CM01`, `SA-CM02`, `SA-CM03`, `SA-CM04`
**Publication development domains:** Sith Commander, Lightsaber Combat, Sith

**Darth Malbada:** “An impressive march is also an impressive target. There are subtler ways to arrive.”

**Situation:** A small strike party wants to pass a defended observation post to recover data from a hidden relay. Some members favor an open assault; others can move quietly but have limited equipment. They have asked for your assessment, not sworn service. If the alarm sounds, reinforcements may arrive.

**Question:** What is your plan?

**Five first-person choices:**

**A — I study sentry cycles and slip the team through the least-observed approach.**

Developer rationale: Observation and covert movement over direct combat.
Candidate existing mechanical keys: `stealth`, `tacticalAwareness` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `stealth`, `infiltration`.
Published development direction (conditional): Sith/Force abilities and normal Stealth use only if actually available.

**B — I divide the party into a diversion and a retrieval team, synchronizing their actions by a clear signal.**

Developer rationale: Coordinate consent-based allies for a timed distraction.
Candidate existing mechanical keys: `formation`, `unitCoordination` · role `leader`.
Ontology topic candidates (NOT certified mechanical effects): `teamwork`, `tactics`.
Published development direction (conditional): Sith Commander talents require printed prerequisites and eligible participants.

**C — I move alone to disable the alarm first, reducing risk for the others.**

Developer rationale: Technical sabotage as hypothetical intent, not owned skill.
Candidate existing mechanical keys: `sabotageExpertise`, `infiltration` · role `scout`.
Ontology topic candidates (NOT certified mechanical effects): `tech`, `infiltration`.
Published development direction (conditional): Use Computer/Mechanics and specific Force or Sith talents require actual access.

**D — I recommend a brief, overwhelming strike on the exposed sentry position before reinforcements respond.**

Developer rationale: Short decisive assault with a known escalation risk.
Candidate existing mechanical keys: `burstDamage`, `combatFlow` · role `striker`.
Ontology topic candidates (NOT certified mechanical effects): `burst_damage`, `offense_melee`.
Published development direction (conditional): Sith combat and Duelist talents; no automatic extra attack.

**E — I organize a withdrawal route and signal before approaching, so failure does not trap the team.**

Developer rationale: Plan an exit and protect allied participants.
Candidate existing mechanical keys: `tacticalAwareness`, `allySupport` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `planning`, `teamwork`.
Published development direction (conditional): Sith Commander/defensive directions; no class-granted extraction power.

**Shared mechanical teaching (developer only):** Potential paths: Sith Commander coordination, Sith stealth/Force influence, Lightsaber Combat and Armor Specialist if acquired through legal talents. No automatic minions, squad, stealth talent or Sith rank.

### SA-Q3-S05 — The Unbound Current

**Focus:** Force technique aspiration, resource cost and control of escalation
**Primary Q1 routes (17):** `SA-DU08`, `SA-DU10`, `SA-LC03`, `SA-LC07`, `SA-LC10`, `SA-SI01`, `SA-SI02`, `SA-SI08`, `SA-FT01`, `SA-FT02`, `SA-FT03`, `SA-FT04`, `SA-FT05`, `SA-FT06`, `SA-FT07`, `SA-ID02`, `SA-ID03`
**Publication development domains:** Sith, Future Force Techniques, Lightsaber Combat

**Darth Malbada:** “There. Power without a steady hand. Decide what you intend to do before it decides for you.”

**Situation:** An ancient regulator in an abandoned reactor complex emits unstable Force-charged pulses. A sealed door protects researchers on the far side, but the next surge might break it. A strong Force intervention might redirect the energy; a smaller action could buy time. You only have powers and Force techniques your build actually supports.

**Question:** What do you try?

**Five first-person choices:**

**A — I concentrate on redirecting the next pulse into an unoccupied channel instead of meeting it head-on.**

Developer rationale: Redirect dangerous energy, contingent on known Force power.
Candidate existing mechanical keys: `areaControl`, `tacticalAwareness` · role `controller`.
Ontology topic candidates (NOT certified mechanical effects): `force_control`, `battlefield_control`.
Published development direction (conditional): Future Force Technique directions at even levels only; current powers must exist.

**B — I use a defensive Force ability I already possess to protect the sealed door while the researchers escape.**

Developer rationale: Protect an exit with actual known abilities.
Candidate existing mechanical keys: `reactionDefense`, `damageReduction` · role `defender`.
Ontology topic candidates (NOT certified mechanical effects): `force_defense`, `defense`.
Published development direction (conditional): Sith/Control Force talents may be separate class-independent paths; ownership required.

**C — I test one controlled pulse to learn how the regulator responds before risking a full intervention.**

Developer rationale: Measured experiment ahead of escalation.
Candidate existing mechanical keys: `knowledgeMastery`, `mysticalInfluence` · role `utility`.
Ontology topic candidates (NOT certified mechanical effects): `force`, `investigation`.
Published development direction (conditional): Sith talent and Force Technique later-level aspirations, no guarantee of a particular power.

**D — I force the energy into the regulator’s weakest point in one decisive attempt, accepting the danger of a larger surge.**

Developer rationale: Aggressive approach with explicit risk; not a Dark Side Score event.
Candidate existing mechanical keys: `burstDamage`, `singleTargetDamage` · role `striker`.
Ontology topic candidates (NOT certified mechanical effects): `force_offense`, `burst_damage`.
Published development direction (conditional): Sith Force/offense directions; actual attack and descriptor restrictions remain.

**E — I withdraw the researchers and seal the room rather than assume my strength can stabilize unknown machinery.**

Developer rationale: Limit potential harm through non-Force containment.
Candidate existing mechanical keys: `resourcefulness`, `tacticalAwareness` · role `support`.
Ontology topic candidates (NOT certified mechanical effects): `planning`, `survivability`.
Published development direction (conditional): Nonmagical contingency and class identity; no implied future title or oath.

**Shared mechanical teaching (developer only):** Sith Apprentice gains Force Techniques at even class levels, not first prestige level; damaging or controlling Force powers must be verified individually. Printed Dark Side Score equals Wisdom; repo house rule >=1 is unresolved, so never represent this question as resolving eligibility.

---

## Routing, QA and implementation handoff

The JSON `primaryQ1Routes` arrays partition the existing 350 Q1 response IDs without overlap. The default routing is an editorial starting point, not an approved deterministic production selector. Validate against the player-selected Q1 ID, Q2 achievement context, observed-only build evidence, available published class mechanics, and exact source identifiers before runtime use. If a player has no Q1 route or requests another context, offer alternate authored situations without silently scoring the navigation.

### Required production gates

1. Review all five Mentors’ introductions and 125 player choices for tone and realistic, varied decision tradeoffs; confirm Miraj keeps Knight-versus-Master distinction.
2. Verify every proposed per-answer talent/prerequisite mapping against printed sources, canonical owned-feature ID and actual eligibility. Resolve quarantined Gunslinger Pistoleer entries, Officer Turn the Tide, and Sith Apprentice Stolen Form source identities.
3. Reconcile Sith Apprentice printed DSS==Wisdom with the project house-rule DSS>=1 **by owner decision**; this Q3 draft does not change either.
4. Verify Jedi Master Force-talent tree access versus underinclusive compendium class list, and do not treat Jedi Knight Force Techniques, Jedi Master Force Secrets or Sith Apprentice Force Techniques as entry-level grants.
5. Build a tested provenance-backed projected intent event consumer (Q3 only), with no new scoring formula, duplicate Q1/Q2 event, ontology-key invention, moral alignment inference or eligibility override.
6. UI test one selected scenario per character plus five choices, neutral, browse; ensure hidden data never leaks into player buttons; confirm no route excludes legal alternative aspirations.

### Explicit exclusions

**Not done:** Runtime code, GitHub branch changes, commit/push/PR, live actor tests, approval of numeric weights, source-specific per-talent certification, or production Suggestion Engine integration.



---

# SOURCE DOCUMENT: Batch 3 — `SWSE_Prestige_Q3_Batch3_Five_Classes_v01.md`

# SWSE Prestige Survey - Q3 The Responsibility - Batch 3 (Five Classes)

**Version:** 0.1 | **Date:** November 15, 2026
**Status:** Completed first-pass editorial draft for owner review. NOT source-certified per-talent, engine-scored, owner-approved, runtime-implemented, committed or pushed.

**Reference:** Owner-approved Ace Pilot Q3 prototype; prior completed Batch 1 and 2 drafting format; repository Q1 sections 23, 25, 26.

## Survey design and event policy

One of five authored scenarios is displayed for the selected prestige class. Its first default routing uses **both the prestige class identity and an exact Q1 ID**. Because the KOTOR and Force Unleashed Q1 sections use local IDs like `ID01`, the class key is essential to prevent mistaken cross-class identity. Q2 demonstrated strengths and verified actor data can improve the context match, but displaying previous information is not a new score contribution.

- Five substantive, first-person A-E choices per scenario. Separate always-available **"I am not sure yet"** adds no directional tag. An unscored **"Try another situation"** control may expose other authored scenarios.
- Only the selected A-E response can eventually emit **one** provenance-backed hypothetical-intent event. Unselected, displayed, browsed or neutral answers produce no positive or negative vote.
- `mechanicalBiasKeys` and `roleBiasKey` reference the existing canonical bias vocabulary. `ontologyTopicCandidates` are actual tag spellings in the Phase 3 owner-defined ontology but remain **editorial topic candidates**, NOT a certified operation-level rules classification or scoring implementation.
- Scene situations and tactical methods never confer feats, talent picks, Force Secrets, character memories, military/security authority, equipment, salaries, followers, or future prestige classes.
- Mentor introductions are newly drafted in their established character voices, rather than unsafely assuming the Mentor personally trained or knows this actor.

## Completion summary

| Prestige class | Mentor | Scenarios | Substantive choices | Current Q1 routes |
|---|---|---:|---:|---:|
| Sith Lord | Darth Miedo | 5 | 25 | 89/89 |
| Corporate Agent | Marl Skindar | 5 | 25 | 29/29 |
| Gladiator | Pegar | 5 | 25 | 26/26 |
| Melee Duelist | Blade Master Kharjo | 5 | 25 | 44/44 |
| Enforcer | Krag the Immovable | 5 | 25 | 16/16 |
| **Total** | | **25** | **125** | **204/204** |

## Source and implementation caution ledger

The following are unresolved gates, NOT permission for the survey to bypass any printed prerequisites.

### Sith Lord

- Printed DSS==Wisdom requirement conflicts with repository DSS>=1 house rule; no owner policy resolution in Q3.
- Repository class list omits eligible class-independent Force trees allowed by printed Sith Lord class/JATM.
- Sith Alchemy and Sith Commander do not automatically become Sith Lord selectable talent trees.
- Stolen Form source undefined and Pure Power normally incompatible; both Q1 routes are quarantined.

### Corporate Agent

- Published employment/organization restriction affects additional class levels; preserve progression gate.
- Mentor Marl Skindar has covert Republic intelligence biography; do not assign this biography to actor.

### Gladiator

- Crowd Response is an optional arena rule, not a class talent or guaranteed audience bonus.
- No assumed prior arena victory, notoriety or adopted fighting equipment.

### Melee Duelist

- Blade Master Kharjo source dialogue exists but mentor_registry.json lacks the Kharjo entry; do not fabricate id.
- Published Weapon Focus entry is specific to advanced/exotic melee weapons; avoid other category assumptions.

### Enforcer

- Class entry requires qualifying law enforcement/security organization, not necessarily police rank or ethical disposition.
- Targeted Suspect starts at Enforcer level 2; Resources has published equipment restrictions.

---

## Sith Lord - Darth Miedo

**Mentor registry:** `darth_miedo` / `m06`
**Mentor dialogue source:** `data/dialogue/mentors/darth_miedo/darth_miedo_dialogue.json`

**Shared Mentor opening - DRAFT:**

> Strength has no meaning until it is tested by consequence. Consider the choice before you. Decide what you intend to control.

**Q1 source flags:** 24 exact routes carry explicit restriction/quarantine notes in JSON. None of these identifies an acquired talent.

### SL-Q3-S01 - The Unwelcome Challenger

**Focus:** Direct confrontation, fear, defense and precision
**Primary Q1 routes (21):** `SL-SI01`, `SL-SI02`, `SL-SI03`, `SL-SI07`, `SL-SI12`, `SL-FS04`, `SL-FS05`, `SL-FS10`, `SL-AL01`, `SL-AL06`, `SL-CT01`, `SL-CT02`, `SL-CT06`, `SL-CT07`, `SL-CT08`, `SL-CT10`, `SL-CT12`, `SL-DS01`, `SL-DS03`, `SL-DS08`, `SL-CF01`
**Development domains:** Sith, Alter, Control, Dark Side

**Darth Miedo:** "The challenger has chosen the hour. You will choose what that hour costs."

**Situation:** At an abandoned observatory, a rival Force-user challenges your claim to examine the sealed records inside. Several independent researchers stand nearby and may be caught in a clash. The rival has drawn a weapon but has not attacked; neither party has an established right to command the others.

**Question:** How do you answer the challenge?

**Five first-person choices:**

**A - I challenge the rival to face me away from the researchers, where skill can decide who proceeds.**

Developer interpretation: Personal combat with deliberate separation of bystanders.
Candidate canonical mechanical keys: `dualistMastery`, `meleeDamage` | role `striker`.
Ontology topic candidates (not certified effects): `melee`, `tactics`.
Publication-based development direction, conditional: Sith combat or relevant owned melee capabilities; no guaranteed duel bonus.

**B - I make the cost of attacking clear and demand that the rival stand aside without bloodshed.**

Developer interpretation: Pressure and deterrence rather than an immediate attack.
Candidate canonical mechanical keys: `intimidation`, `authorityPresence` | role `controller`.
Ontology topic candidates (not certified effects): `intimidation`, `fear`.
Publication-based development direction, conditional: Sith influence directions; normal Persuasion and mind-affecting limits apply.

**C - I watch the rival closely for a weakness and refuse to commit until their intentions become clear.**

Developer interpretation: Information-gathering before an irreversible choice.
Candidate canonical mechanical keys: `tacticalAwareness`, `knowledgeMastery` | role `scout`.
Ontology topic candidates (not certified effects): `awareness`, `investigation`.
Publication-based development direction, conditional: Sense Force and investigation routes require current supported capabilities.

**D - I protect the researchers and hold a defensive position, allowing the rival to expose an opening.**

Developer interpretation: Defense and deliberate protection rather than immediate offense.
Candidate canonical mechanical keys: `reactionDefense`, `allySupport` | role `defender`.
Ontology topic candidates (not certified effects): `defense`, `ally_support`.
Publication-based development direction, conditional: Control Force and defensive talents are conditional on legal access.

**E - I offer the rival a limited exchange of access and knowledge, keeping the larger prize within reach.**

Developer interpretation: Negotiated leverage using terms rather than force.
Candidate canonical mechanical keys: `socialManipulation`, `resourceControl` | role `utility`.
Ontology topic candidates (not certified effects): `persuasion`, `intrigue`.
Publication-based development direction, conditional: No assumed social authority, Force mind trick, or established bargaining network.

**Developer teaching:** Sith-tree dark offense, Control defense and general Force discipline are possible future directions. No Force power, lightsaber talent, status over researchers, or specific alignment act is automatically granted.

### SL-Q3-S02 - The Sealed Testament

**Focus:** Dangerous knowledge, Force Secrets and limited resources
**Primary Q1 routes (15):** `SL-SI08`, `SL-SI11`, `SL-FS01`, `SL-FS06`, `SL-FS07`, `SL-FS08`, `SL-FS11`, `SL-FS13`, `SL-AL05`, `SL-AL07`, `SL-AL11`, `SL-AL12`, `SL-AL15`, `SL-CT03`, `SL-CT05`
**Development domains:** Future Force Secrets, Sith, Alter, Control

**Darth Miedo:** "There is always a price for opening a door. The foolish pay it without asking."

**Situation:** A Force-inscribed vault contains a record that may explain an ancient technique. The entrance has a failing energy barrier, and further attempts to open it may destroy the archive. A specialist offers assistance but insists on receiving a copy of everything recovered.

**Question:** Which path do you take?

**Five first-person choices:**

**A - I study the barrier and its pattern until I can identify a way to open it with minimal damage.**

Developer interpretation: Methodical technical and Force investigation.
Candidate canonical mechanical keys: `knowledgeMastery`, `mysticalInfluence` | role `utility`.
Ontology topic candidates (not certified effects): `knowledge`, `force`.
Publication-based development direction, conditional: Force-related knowledge and eligible Alter/Sense directions; no automatic vault-opening power.

**B - I make a carefully measured attempt with a Force ability I already know, testing the barrier one step at a time.**

Developer interpretation: Controlled experimentation rather than a promised new Force Secret.
Candidate canonical mechanical keys: `forceDC`, `tacticalAwareness` | role `controller`.
Ontology topic candidates (not certified effects): `force_control`, `planning`.
Publication-based development direction, conditional: Owned Force power only; future Force Secrets have strict timing and costs.

**C - I bargain for the specialist to safeguard the archive while I negotiate access to the contents.**

Developer interpretation: Delegation with explicit consent and negotiated obligations.
Candidate canonical mechanical keys: `socialManipulation`, `networkInfluence` | role `leader`.
Ontology topic candidates (not certified effects): `social`, `intrigue`.
Publication-based development direction, conditional: No automatic minion, follower, or coercion class feature.

**D - I risk a decisive breach before the barrier collapses, accepting that the record may be lost in the attempt.**

Developer interpretation: Direct powerful intervention with an explicit destructive tradeoff.
Candidate canonical mechanical keys: `burstDamage`, `forceDC` | role `striker`.
Ontology topic candidates (not certified effects): `force_offense`, `burst_damage`.
Publication-based development direction, conditional: Requires an actual applicable Force or technical ability, not a free secret.

**E - I stabilize the entrance and withdraw with what can be recorded safely, leaving the vault intact for later.**

Developer interpretation: Preservation and fallback rather than immediate possession.
Candidate canonical mechanical keys: `resourceControl`, `resourcefulness` | role `support`.
Ontology topic candidates (not certified effects): `resources`, `planning`.
Publication-based development direction, conditional: Existing skills and logistics; no special artifact ownership assumed.

**Developer teaching:** Force Secrets are granted by Sith Lord progression from class level 2 onward, not on entry. Any archived power, holocron and related artifact must be obtained through actual play; the scene promises none.

### SL-Q3-S03 - The Fractured Circle

**Focus:** Influence, competing loyalties, leadership and strategic control
**Primary Q1 routes (7):** `SL-SI09`, `SL-FS03`, `SL-FS15`, `SL-DS04`, `SL-DS06`, `SL-ID01`, `SL-ID02`
**Development domains:** Sith, Dark Side, Guardian Spirit, Qualifying Force traditions

**Darth Miedo:** "A follower who obeys without understanding will fail when your eyes turn elsewhere."

**Situation:** Three independent Force adepts offer to help prevent a dangerous relic from being stolen. They disagree about whether to conceal it, relocate it or destroy it, and none has pledged allegiance to you. Their dispute threatens to expose the location.

**Question:** How do you turn disagreement into action?

**Five first-person choices:**

**A - I set a clear objective and assign separate tasks only after the adepts agree to work together.**

Developer interpretation: Bounded coordination that does not invent servants.
Candidate canonical mechanical keys: `commandAuthority`, `unitCoordination` | role `leader`.
Ontology topic candidates (not certified effects): `command`, `teamwork`.
Publication-based development direction, conditional: Potential command and group-support identity; no free ally actions.

**B - I demand that the adepts obey my judgment and make refusal costly enough to discourage further delay.**

Developer interpretation: Explicit coercive intent, not automatically successful control.
Candidate canonical mechanical keys: `intimidation`, `forcedControl` | role `controller`.
Ontology topic candidates (not certified effects): `intimidation`, `control`.
Publication-based development direction, conditional: Normal social and Force power resistance; no automatic Dark Side score change.

**C - I question each adept separately to find the concern or secret behind the disagreement.**

Developer interpretation: Information leverage before making a commitment.
Candidate canonical mechanical keys: `informationControl`, `socialManipulation` | role `scout`.
Ontology topic candidates (not certified effects): `investigation`, `intrigue`.
Publication-based development direction, conditional: Sense and social routes; mental intrusion requires separately owned powers.

**D - I arrange a temporary concealment and keep the adepts from revealing the relic while evidence is gathered.**

Developer interpretation: Secure information and reduce exposure to theft.
Candidate canonical mechanical keys: `stealth`, `resourceControl` | role `utility`.
Ontology topic candidates (not certified effects): `concealment`, `planning`.
Publication-based development direction, conditional: Stealth and resources are voluntary approaches, not promised class talents.

**E - I accept the risk of relocation and personally guard the relic until a safer solution becomes possible.**

Developer interpretation: Take operational risk on oneself without claiming a subordinate.
Candidate canonical mechanical keys: `reactionDefense`, `combatStamina` | role `defender`.
Ontology topic candidates (not certified effects): `defense`, `survivability`.
Publication-based development direction, conditional: Sith and Control defensive directions only when available.

**Developer teaching:** Sith Lord status grants no automatic apprentices, cult, office, army or personal followers. Sith leadership is one possible ambition, not a granted social rank.

### SL-Q3-S04 - A Mind That Will Not Yield

**Focus:** Force influence, resistance and alternative information paths
**Primary Q1 routes (20):** `SL-SI04`, `SL-SI05`, `SL-SI06`, `SL-SI10`, `SL-FS09`, `SL-FS12`, `SL-AL02`, `SL-AL03`, `SL-AL04`, `SL-AL09`, `SL-AL10`, `SL-SE01`, `SL-SE02`, `SL-SE07`, `SL-DS02`, `SL-DS05`, `SL-DS07`, `SL-DS09`, `SL-DS10`, `SL-CF02`
**Development domains:** Sith, Sense, Alter, Dark Side

**Darth Miedo:** "Control is not a synonym for understanding. A stubborn mind can teach you the difference."

**Situation:** A captured courier knows the location of a stolen device that may harm a settlement. The courier refuses to answer questions and might be hiding the device to protect someone else. The local authorities ask for help, not for summary punishment. Your available Force powers are only those the actor actually knows.

**Question:** How do you seek the location?

**Five first-person choices:**

**A - I try to compel the courier to disclose what they know, accepting the risk that forceful pressure may close other paths.**

Developer interpretation: Coercive approach as hypothetical intent, not a resolved mental effect.
Candidate canonical mechanical keys: `forcedControl`, `darkSideAffinity` | role `controller`.
Ontology topic candidates (not certified effects): `manipulation`, `force`.
Publication-based development direction, conditional: Force mental powers only if actually owned and legal; resistance applies.

**B - I study the courier and their movements for clues about who entrusted them with the device.**

Developer interpretation: Observational investigation rather than presumed mind reading.
Candidate canonical mechanical keys: `tacticalAwareness`, `informationControl` | role `scout`.
Ontology topic candidates (not certified effects): `investigation`, `awareness`.
Publication-based development direction, conditional: Sense Force or ordinary investigative actions as actually available.

**C - I offer safe passage for those the courier fears for, in exchange for a verifiable account of the device.**

Developer interpretation: Negotiated protection using reciprocal terms.
Candidate canonical mechanical keys: `persuasionMastery`, `socialManipulation` | role `utility`.
Ontology topic candidates (not certified effects): `persuasion`, `social`.
Publication-based development direction, conditional: No automatic mind-affecting effect or authority to promise legal immunity.

**D - I trace the courier's contacts and travel records without relying on what they choose to tell me.**

Developer interpretation: Follow external leads instead of extracting an answer directly.
Candidate canonical mechanical keys: `informationControl`, `networkInfluence` | role `scout`.
Ontology topic candidates (not certified effects): `investigation`, `network`.
Publication-based development direction, conditional: Actual contacts and tools remain conditional; no free computer access.

**E - I organize immediate precautions for the settlement while others investigate where the device went.**

Developer interpretation: Prioritize risk containment alongside the search.
Candidate canonical mechanical keys: `allySupport`, `resourceControl` | role `support`.
Ontology topic candidates (not certified effects): `support`, `planning`.
Publication-based development direction, conditional: Only actual willing participants and available resources are assumed.

**Developer teaching:** Do not imply Sith Lord receives Mind Probe, mind trick, telepathy, interrogation powers or Dark Side talents automatically. Each method has normal legality and ethical consequences decided in play, not by hidden survey morality scoring.

### SL-Q3-S05 - The Vision of Ruin

**Focus:** Visions, foresight, self-mastery and future secret ambitions
**Primary Q1 routes (26):** `SL-FS02`, `SL-FS14`, `SL-AL08`, `SL-AL13`, `SL-AL14`, `SL-CT04`, `SL-CT09`, `SL-CT11`, `SL-SE03`, `SL-SE04`, `SL-SE05`, `SL-SE06`, `SL-SE08`, `SL-SE09`, `SL-SE10`, `SL-SE11`, `SL-SE12`, `SL-GS01`, `SL-GS02`, `SL-GS03`, `SL-GS04`, `SL-GS05`, `SL-TR01`, `SL-TR02`, `SL-TR03`, `SL-ID03`
**Development domains:** Sense, Guardian Spirit, Future Force Secrets, Control, Qualifying Force traditions

**Darth Miedo:** "A vision is information. Treating it as certainty is a different choice."

**Situation:** A troubling Force vision suggests a distant research station may suffer a catastrophic failure. The symbols are ambiguous: you cannot tell whether you saw the future, a warning about the past or a deception. There is no confirmed crisis and no ready fleet to command.

**Question:** What do you do with the warning?

**Five first-person choices:**

**A - I investigate the symbols through records and other perspectives before deciding that the warning is literal.**

Developer interpretation: Independent verification before decisive action.
Candidate canonical mechanical keys: `knowledgeMastery`, `mysticalInfluence` | role `scout`.
Ontology topic candidates (not certified effects): `visions`, `knowledge`.
Publication-based development direction, conditional: Sense, lore and eligible vision talents require qualification.

**B - I use whatever sensing power I already possess to learn whether the station faces danger now.**

Developer interpretation: Current observation kept distinct from promised precognition.
Candidate canonical mechanical keys: `tacticalAwareness`, `forceDC` | role `scout`.
Ontology topic candidates (not certified effects): `force`, `awareness`.
Publication-based development direction, conditional: Use the Force only with actual known abilities; no guaranteed vision confirmation.

**C - I move to the station to prepare its people for a possible failure while evidence is gathered.**

Developer interpretation: Practical precaution without presuming prophetic accuracy.
Candidate canonical mechanical keys: `rapidResponse`, `allySupport` | role `support`.
Ontology topic candidates (not certified effects): `planning`, `support`.
Publication-based development direction, conditional: Transport, authority and aid require normal fictional means.

**D - I seek guidance through a Force tradition I have actually studied, comparing its teaching with my own judgment.**

Developer interpretation: Tradition-informed reflection, not manufactured cultural membership.
Candidate canonical mechanical keys: `ritualMastery`, `knowledgeMastery` | role `utility`.
Ontology topic candidates (not certified effects): `meditation`, `knowledge`.
Publication-based development direction, conditional: Restricted tradition and Guardian Spirit prerequisites must be verified.

**E - I keep the vision private, position myself to intervene if the threat becomes real and avoid acting on uncertainty.**

Developer interpretation: Contingency and discretion without claiming infallibility.
Candidate canonical mechanical keys: `stealth`, `tacticalAwareness` | role `defender`.
Ontology topic candidates (not certified effects): `planning`, `awareness`.
Publication-based development direction, conditional: No automatic stealth, divination, or reaction granted.

**Developer teaching:** Vision and Guardian Spirit talent routes are conditional. An apparent vision does not prove the actor already knows Visions, farseeing, or any Force Secret; secrets begin at later Sith Lord levels.

---

## Corporate Agent - Marl Skindar

**Mentor registry:** `skindar` / `m26`
**Mentor dialogue source:** `data/dialogue/mentors/marl_skindar/skindar_dialogue.json`

**Shared Mentor opening - DRAFT:**

> Corporate influence sounds impressive until the numbers stop agreeing. Here are five ways an ordinary decision can go wrong. Try to be useful.

**Q1 source flags:** 1 exact routes carry explicit restriction/quarantine notes in JSON. None of these identifies an acquired talent.

### CA-Q3-S01 - The Poisoned Contract

**Focus:** Corporate leverage, ethics, due diligence and bargaining
**Primary Q1 routes (3):** `CP01`, `ID02`, `NEUTRAL`
**Development domains:** Corporate Power, Lineage, Leadership

**Marl Skindar:** "An offer that arrives just before the deadline is usually designed to keep you from reading it."

**Situation:** A transport consortium offers a frontier community an urgent supply contract. Its price is attractive, but a hidden clause gives the consortium control over local warehouses if a shipment is late. Community representatives ask you to assess the deal; you do not own either organization.

**Question:** What do you recommend?

**Five first-person choices:**

**A - I examine the penalty clause and calculate exactly who carries the cost when deliveries fail.**

Developer interpretation: Financial risk analysis and informed assessment.
Candidate canonical mechanical keys: `businessAcumen`, `knowledgeMastery` | role `utility`.
Ontology topic candidates (not certified effects): `knowledge`, `investigation`.
Publication-based development direction, conditional: Lineage knowledge and skills; no free skill training from class name.

**B - I negotiate a smaller penalty and a shared inspection process before anyone signs.**

Developer interpretation: Contract negotiation and practical safeguards.
Candidate canonical mechanical keys: `persuasionMastery`, `corporateInfluence` | role `utility`.
Ontology topic candidates (not certified effects): `persuasion`, `social`.
Publication-based development direction, conditional: Corporate Power influence is conditional; no automatic concession.

**C - I identify alternative suppliers so the community can bargain without depending on one bidder.**

Developer interpretation: Build independent leverage through actual alternatives.
Candidate canonical mechanical keys: `networkInfluence`, `resourceControl` | role `scout`.
Ontology topic candidates (not certified effects): `network`, `resources`.
Publication-based development direction, conditional: Lineage contacts and resources require eligible talents or real assets.

**D - I convene both sides to set measurable delivery responsibilities and a way to resolve disputes.**

Developer interpretation: Operational coordination by agreement rather than claimed rank.
Candidate canonical mechanical keys: `commandAuthority`, `allySupport` | role `leader`.
Ontology topic candidates (not certified effects): `leadership`, `teamwork`.
Publication-based development direction, conditional: Leadership talents require class selection and specific prerequisites.

**E - I advise rejecting the contract until its terms can survive an open review, even if supplies arrive later.**

Developer interpretation: Prioritize verification over a hurried apparent advantage.
Candidate canonical mechanical keys: `tacticalAwareness`, `resourcefulness` | role `defender`.
Ontology topic candidates (not certified effects): `planning`, `investigation`.
Publication-based development direction, conditional: General corporate judgment rather than an invented anti-contract feature.

**Developer teaching:** Corporate Power and social talents can support persuasion, resolve and leverage. Corporate Agent status does not grant legal authority over the parties, automatic contacts or a company of the actor's own.

### CA-Q3-S02 - The Rival Ledger

**Focus:** Information control, verification, technical investigation and discretion
**Primary Q1 routes (2):** `LI02`, `LI07`
**Development domains:** Lineage, Corporate Power, Leadership

**Marl Skindar:** "Someone adjusted the numbers. That is not yet proof that you know who."

**Situation:** During an authorized review of a shipping cooperative, several inventory records conflict with actual deliveries. A rival firm has a motive, but two employees have made unexplained changes as well. The audit team has legitimate access to the ledgers, not to private messages or unrelated systems.

**Question:** Where do you begin?

**Five first-person choices:**

**A - I reconcile the physical shipment records with the ledger before accusing anyone of theft.**

Developer interpretation: Build a timeline from evidence, not suspicion.
Candidate canonical mechanical keys: `informationControl`, `knowledgeMastery` | role `scout`.
Ontology topic candidates (not certified effects): `investigation`, `knowledge`.
Publication-based development direction, conditional: Lineage education and knowledge routes; no automatic forensic tool.

**B - I speak separately with the clerks who handled the deliveries and look for contradictions.**

Developer interpretation: Interviews and pattern comparison.
Candidate canonical mechanical keys: `persuasionMastery`, `informationControl` | role `scout`.
Ontology topic candidates (not certified effects): `persuasion`, `investigation`.
Publication-based development direction, conditional: Normal Persuasion and Gather Information rules if appropriately trained.

**C - I ask the systems staff to inspect the change history within the scope of the authorized audit.**

Developer interpretation: Technical review through authorized collaboration.
Candidate canonical mechanical keys: `technicalMastery`, `allySupport` | role `utility`.
Ontology topic candidates (not certified effects): `tech`, `teamwork`.
Publication-based development direction, conditional: Engineer/Spontaneous Skill are conditional; no forced access or slicing talent.

**D - I discreetly ask verified industry contacts whether the missing cargo appears in another market.**

Developer interpretation: Trace external circulation without invented contacts.
Candidate canonical mechanical keys: `networkInfluence`, `resourceControl` | role `scout`.
Ontology topic candidates (not certified effects): `network`, `investigation`.
Publication-based development direction, conditional: Lineage Connections/Influential Friends only if legally available.

**E - I secure the remaining stock and preserve the records so the supply chain stays functional during the inquiry.**

Developer interpretation: Contain the operational exposure while evidence remains intact.
Candidate canonical mechanical keys: `resourceControl`, `tacticalAwareness` | role `defender`.
Ontology topic candidates (not certified effects): `resources`, `planning`.
Publication-based development direction, conditional: No automatic ability to seize property; requires the cooperative's consent.

**Developer teaching:** Information gathering, technical expertise, contacts and corporate pressure are potential directions. The actor has no automatically granted slicing, system access, private informant or espionage history.

### CA-Q3-S03 - The Meeting Without a Vote

**Focus:** Leadership, persuasion, resolve and corporate pressure
**Primary Q1 routes (11):** `LE01`, `LE03`, `LE04`, `LE07`, `LE08`, `LE09`, `LE11`, `LI04`, `CP02`, `CP03`, `CF01`
**Development domains:** Leadership, Corporate Power, Class feature

**Marl Skindar:** "The room is full of titles. None of them will do the thinking for you."

**Situation:** At a tense emergency meeting, two departments refuse to share cargo space needed to deliver medical supplies. The directors have equal authority and the vote is tied. You have been asked to present a proposal, but you cannot order either department to comply.

**Question:** How do you break the deadlock?

**Five first-person choices:**

**A - I offer a shared schedule that gives each department a workable share of the cargo capacity.**

Developer interpretation: Solve the constrained allocation problem.
Candidate canonical mechanical keys: `businessAcumen`, `resourceControl` | role `utility`.
Ontology topic candidates (not certified effects): `planning`, `resources`.
Publication-based development direction, conditional: Lineage/Corporate Power planning paths, subject to specific owned resources.

**B - I appeal to the directors' common responsibility for the patients waiting on those supplies.**

Developer interpretation: Persuade by consequences for others.
Candidate canonical mechanical keys: `persuasionMastery`, `allySupport` | role `support`.
Ontology topic candidates (not certified effects): `persuasion`, `support`.
Publication-based development direction, conditional: Normal social checks; no assured morale bonus or successful vote.

**C - I put the likely public and financial costs of delay on the record and demand an immediate decision.**

Developer interpretation: Hard bargaining and pressure with clear risk of backlash.
Candidate canonical mechanical keys: `corporateInfluence`, `intimidation` | role `controller`.
Ontology topic candidates (not certified effects): `social`, `intimidation`.
Publication-based development direction, conditional: Corporate Clout/Impose Hesitation remain conditional and mind-affecting where printed.

**D - I ask each director to name one nonnegotiable need, then build an agreement around those limits.**

Developer interpretation: Structured mediation and diagnosis of priorities.
Candidate canonical mechanical keys: `socialManipulation`, `tacticalAwareness` | role `leader`.
Ontology topic candidates (not certified effects): `social`, `leadership`.
Publication-based development direction, conditional: No automatic change of attitude or mental compulsion.

**E - I secure a temporary smaller shipment now and plan a second delivery once the directors finish deliberating.**

Developer interpretation: Contingency action that preserves partial progress.
Candidate canonical mechanical keys: `resourcefulness`, `rapidResponse` | role `utility`.
Ontology topic candidates (not certified effects): `planning`, `resources`.
Publication-based development direction, conditional: No automatic access to spare vessels or stock.

**Developer teaching:** Leadership, Corporate Power and the future Executive Leadership class feature are developer avenues. No rank, extra ally actions or immunity to manipulation follows merely from choosing a survey response.

### CA-Q3-S04 - Assets on a Deadline

**Focus:** Logistics, engineering, contacts and organizational resilience
**Primary Q1 routes (7):** `LE02`, `LE06`, `LE10`, `LI01`, `LI03`, `LI05`, `LI06`
**Development domains:** Lineage, Leadership, Corporate Power

**Marl Skindar:** "A fragile operation is one that needs every piece to behave exactly as the brochure promised."

**Situation:** A manufacturing site is hours from missing a crucial shipment. A cooling unit has failed, a courier service has canceled, and the replacement budget is limited. You are acting as an outside consultant; the site manager may accept your plan but has not delegated control of the company.

**Question:** What is your first priority?

**Five first-person choices:**

**A - I ask the technicians to isolate the failed unit and see whether a safe temporary repair can keep production running.**

Developer interpretation: Technical continuity with a safety boundary.
Candidate canonical mechanical keys: `engineeringMastery`, `resourcefulness` | role `utility`.
Ontology topic candidates (not certified effects): `tech`, `repair`.
Publication-based development direction, conditional: Engineer and skill routes are conditional; no guaranteed repair success.

**B - I call qualified transport providers and compare their availability before committing more credits.**

Developer interpretation: Find alternative logistics based on real availability.
Candidate canonical mechanical keys: `networkInfluence`, `businessAcumen` | role `scout`.
Ontology topic candidates (not certified effects): `network`, `resources`.
Publication-based development direction, conditional: Connections/Influential Friends talents require actual ownership.

**C - I reorganize the workload around the usable equipment instead of waiting for the broken unit.**

Developer interpretation: Operational redesign subject to manager consent.
Candidate canonical mechanical keys: `commandAuthority`, `adaptability` | role `leader`.
Ontology topic candidates (not certified effects): `leadership`, `planning`.
Publication-based development direction, conditional: Leadership/Executive Leadership themes only; no free worker action grants.

**D - I preserve the most time-sensitive materials and accept a partial delivery rather than destroy the whole batch.**

Developer interpretation: Protect constrained inventory and minimize losses.
Candidate canonical mechanical keys: `resourceControl`, `tacticalAwareness` | role `defender`.
Ontology topic candidates (not certified effects): `resources`, `planning`.
Publication-based development direction, conditional: No special storage or item creation assumed.

**E - I renegotiate the client deadline now, trading a concession for enough time to deliver safely.**

Developer interpretation: Commercial negotiation rather than technical improvisation.
Candidate canonical mechanical keys: `persuasionMastery`, `businessAcumen` | role `utility`.
Ontology topic candidates (not certified effects): `persuasion`, `intrigue`.
Publication-based development direction, conditional: Corporate Power social influence remains subject to printed checks.

**Developer teaching:** Resource-management, Engineer, Connections and teamwork aspirations are possible. No automatic equipment, corporate credit, repair talent, transport or employed staff is implied.

### CA-Q3-S05 - The Public Statement

**Focus:** Reputation, responsibility, confidentiality and strategic communication
**Primary Q1 routes (6):** `LE05`, `CP04`, `CP05`, `CP06`, `CP07`, `ID01`
**Development domains:** Corporate Power, Lineage, Leadership, Class feature

**Marl Skindar:** "A public statement is easy. Living with the facts behind it is the difficult part."

**Situation:** A local contractor is accused of selling faulty safety equipment. Independent tests are incomplete, a whistleblower fears retaliation, and a news network wants a statement immediately. The contractor's staff ask you to advise them. You have no automatic power to silence the press or dismiss employees.

**Question:** What do you advise?

**Five first-person choices:**

**A - I publish only the confirmed test results and clearly identify what remains unverified.**

Developer interpretation: Evidence-first public communication.
Candidate canonical mechanical keys: `informationControl`, `knowledgeMastery` | role `utility`.
Ontology topic candidates (not certified effects): `investigation`, `social`.
Publication-based development direction, conditional: No special disclosure authority is inherent in class identity.

**B - I arrange independent testing and delay any definitive claim until the results can withstand scrutiny.**

Developer interpretation: Verification and contingency under uncertainty.
Candidate canonical mechanical keys: `businessAcumen`, `tacticalAwareness` | role `scout`.
Ontology topic candidates (not certified effects): `planning`, `investigation`.
Publication-based development direction, conditional: Knowledge or Lineage directions; no new investigative class feature.

**C - I negotiate a public repair-and-compensation plan that the affected customers can actually verify.**

Developer interpretation: Credible restorative settlement without moral scoring.
Candidate canonical mechanical keys: `persuasionMastery`, `allySupport` | role `support`.
Ontology topic candidates (not certified effects): `persuasion`, `support`.
Publication-based development direction, conditional: Corporate Clout and social skill paths only when qualified.

**D - I craft a narrow statement that protects the contractor's position while the inquiry proceeds.**

Developer interpretation: Controlled messaging without inventing a guaranteed lie.
Candidate canonical mechanical keys: `deceptionMastery`, `corporateInfluence` | role `utility`.
Ontology topic candidates (not certified effects): `deception`, `intrigue`.
Publication-based development direction, conditional: Actual Deception skill and Corporate Power requirements apply.

**E - I protect the whistleblower's identity and establish a trusted channel for further evidence.**

Developer interpretation: Confidentiality and evidence-gathering through a voluntary process.
Candidate canonical mechanical keys: `informationControl`, `networkInfluence` | role `defender`.
Ontology topic candidates (not certified effects): `investigation`, `network`.
Publication-based development direction, conditional: No automatic espionage authority or cyber access.

**Developer teaching:** Corporate influence, social negotiation and risk analysis may suit different future builds. Do not treat deceptive advocacy as proof of criminal history, or public protection as automatic moral alignment.

---

## Gladiator - Pegar

**Mentor registry:** `pegar` / `m20`
**Mentor dialogue source:** `data/dialogue/mentors/pegar/pegar_dialogues.json`

**Shared Mentor opening - DRAFT:**

> An arena teaches you how to fight. If you are fortunate, it also teaches when the crowd is wrong. I have had time to learn both.

**Q1 source flags:** 1 exact routes carry explicit restriction/quarantine notes in JSON. None of these identifies an acquired talent.

### GD-Q3-S01 - The Bell Before the Strike

**Focus:** Initiative, reading opponents, defensive armor and controlled offense
**Primary Q1 routes (5):** `AW01`, `AW03`, `GC01`, `ID02`, `NEUTRAL`
**Development domains:** Awareness, Gladiatorial Combat, Armor Specialist

**Pegar:** "The first three heartbeats tell you more than the last ten blows. Provided you are listening."

**Situation:** At the start of an exhibition match, an opponent known for rushing across the sand advances immediately. You have space to move, an ordinary melee weapon and an agreed rule against attacking spectators. The opponent has not yet committed to a specific strike.

**Question:** How do you open the exchange?

**Five first-person choices:**

**A - I watch the opponent's feet and shoulders until their first move reveals where they are vulnerable.**

Developer interpretation: Read cues and choose the right moment, not imagined foresight.
Candidate canonical mechanical keys: `tacticalAwareness`, `initiative` | role `scout`.
Ontology topic candidates (not certified effects): `awareness`, `initiative`.
Publication-based development direction, conditional: Awareness talents are conditional; Initiative is an exact skill mechanic where appropriate.

**B - I step forward with a hard opening attack before they can settle into their charge.**

Developer interpretation: Immediate offense with exposure to a counterattack.
Candidate canonical mechanical keys: `meleeDamage`, `burstDamage` | role `striker`.
Ontology topic candidates (not certified effects): `melee`, `offense_melee`.
Publication-based development direction, conditional: Gladiatorial Combat Brutal Attack under its actual rules.

**C - I brace behind my protection and make them spend their momentum against a prepared defense.**

Developer interpretation: Absorb the initial pressure rather than chase the crowd's excitement.
Candidate canonical mechanical keys: `armorMastery`, `reactionDefense` | role `defender`.
Ontology topic candidates (not certified effects): `armor`, `defense`.
Publication-based development direction, conditional: Armor Specialist options require actual worn armor and legal talents.

**D - I shift to the side and let the rushing fighter overcommit before I answer.**

Developer interpretation: Evasion and timing rather than matching force.
Candidate canonical mechanical keys: `evasion`, `counterAttack` | role `skirmisher`.
Ontology topic candidates (not certified effects): `positioning`, `counterattack`.
Publication-based development direction, conditional: Awareness and general defensive maneuvers; no free counterattack talent.

**E - I call out a challenge and try to make the opponent focus on me instead of changing targets.**

Developer interpretation: Draw attention without presuming a compelled taunt.
Candidate canonical mechanical keys: `intimidation`, `areaControl` | role `controller`.
Ontology topic candidates (not certified effects): `intimidation`, `control`.
Publication-based development direction, conditional: Gladiatorial Combat Call Out has specific activation limits.

**Developer teaching:** Awareness and Gladiatorial Combat options may alter initiative, attack pressure and defense. No automatic Unflinching feature, exceptional weapon proficiency or free first strike is inferred.

### GD-Q3-S02 - The Unfamiliar Weapon

**Focus:** Weapon versatility, adaptability and improvisation
**Primary Q1 routes (4):** `AR01`, `AR05`, `AW08`, `GC04`
**Development domains:** Gladiatorial Combat, Armor Specialist, Awareness

**Pegar:** "I once won with a weapon I could not name. The important part was learning what end to hold."

**Situation:** An arena exhibition uses unfamiliar equipment. A long hooked blade, a heavy shield, a short staff and a weighted net lie at separate markers. You may reach one before your opponent closes, but none is a weapon you have been promised proficiency with.

**Question:** What do you do?

**Five first-person choices:**

**A - I choose the strange hooked blade and test its balance rather than shy away from an unfamiliar weapon.**

Developer interpretation: Cultivate broad weapon familiarity.
Candidate canonical mechanical keys: `weaponVersatility`, `arenaExpertise` | role `flex`.
Ontology topic candidates (not certified effects): `exotic_weapon`, `weapon_training`.
Publication-based development direction, conditional: Gladiatorial Combat Exotic Weapons Master is a possible progression path.

**B - I take the shield and make the opponent work to find an opening before committing to attack.**

Developer interpretation: Protection and measured engagement.
Candidate canonical mechanical keys: `armorMastery`, `reactionDefense` | role `defender`.
Ontology topic candidates (not certified effects): `defense`, `armor`.
Publication-based development direction, conditional: Armor Specialist talents depend on actual gear and proficiency.

**C - I reach for the net and try to limit the opponent's movement before closing in.**

Developer interpretation: Control space with a risky unfamiliar tool.
Candidate canonical mechanical keys: `grappling`, `areaControl` | role `controller`.
Ontology topic candidates (not certified effects): `restrain`, `control`.
Publication-based development direction, conditional: Ordinary weapon and grapple rules; no guaranteed entanglement effect.

**D - I stay mobile and use the markers as obstacles while I judge which weapon the opponent fears most.**

Developer interpretation: Adaptable positioning over a preferred weapon.
Candidate canonical mechanical keys: `evasion`, `tacticalAwareness` | role `skirmisher`.
Ontology topic candidates (not certified effects): `mobility`, `positioning`.
Publication-based development direction, conditional: Awareness and combat movement; no granted speed bonus.

**E - I take the simple staff and concentrate on precise, repeatable strikes rather than spectacular ones.**

Developer interpretation: Focused technique rather than novelty.
Candidate canonical mechanical keys: `weaponMastery`, `accuracy` | role `striker`.
Ontology topic candidates (not certified effects): `melee`, `precision`.
Publication-based development direction, conditional: Core combat and possible Gladiatorial Combat accuracy directions; eligibility separate.

**Developer teaching:** Exotic Weapons Master and related paths require class-access and individual prerequisites. Found objects in a hypothetical scene are not owned items on the actor.

### GD-Q3-S03 - Two Against One

**Focus:** Arena control, threat management and survival
**Primary Q1 routes (6):** `AW04`, `AW06`, `AW07`, `GC02`, `GC05`, `GC06`
**Development domains:** Awareness, Gladiatorial Combat, Armor Specialist

**Pegar:** "Three fighters in the sand. That means three stories. Make certain you are still in yours at the end."

**Situation:** A three-contender arena bout begins with two rivals moving toward you from different angles. The rules allow temporary cooperation, but no side has agreed to an alliance. The open floor has one raised platform and no reliable cover.

**Question:** How do you keep the encounter manageable?

**Five first-person choices:**

**A - I move to the platform so only one opponent can approach me cleanly at a time.**

Developer interpretation: Break an unfavorable pincer using terrain.
Candidate canonical mechanical keys: `tacticalAwareness`, `evasion` | role `defender`.
Ontology topic candidates (not certified effects): `positioning`, `defense`.
Publication-based development direction, conditional: Awareness and normal movement; no automatic battlefield-control talent.

**B - I concentrate on the more aggressive rival and try to put them down before the other can engage.**

Developer interpretation: Focused removal of one threat with obvious risk.
Candidate canonical mechanical keys: `singleTargetDamage`, `meleeDamage` | role `striker`.
Ontology topic candidates (not certified effects): `melee`, `damage`.
Publication-based development direction, conditional: Gladiatorial Combat pressure and weapon talents are conditional.

**C - I call out the more cautious contender and attempt to draw their attention while keeping the other in sight.**

Developer interpretation: Threat manipulation through challenge rather than guaranteed compulsion.
Candidate canonical mechanical keys: `intimidation`, `areaControl` | role `controller`.
Ontology topic candidates (not certified effects): `intimidation`, `control`.
Publication-based development direction, conditional: Call Out or Personal Vendetta only if legally selected.

**D - I offer a temporary truce to the opponent who seems least committed to fighting me.**

Developer interpretation: Negotiated temporary cooperation without assuming loyalty.
Candidate canonical mechanical keys: `persuasionMastery`, `tacticalAwareness` | role `utility`.
Ontology topic candidates (not certified effects): `social`, `tactics`.
Publication-based development direction, conditional: Normal Persuasion and action economy; no forced cooperation.

**E - I conserve my strength, defend against both angles and wait for the rivals to expose each other.**

Developer interpretation: Endurance and defensive patience.
Candidate canonical mechanical keys: `combatStamina`, `reactionDefense` | role `defender`.
Ontology topic candidates (not certified effects): `survivability`, `defense`.
Publication-based development direction, conditional: Unflinching and Unstoppable have specific printed timing and limits.

**Developer teaching:** Positioning, multiple attacks, Call Out and Unstoppable-style endurance are development directions. No crowd bonus is automatic; optional Crowd Response rules depend on campaign adoption.

### GD-Q3-S04 - The Fallen Contender

**Focus:** Mercy, crowd pressure, restraint and combat pragmatism
**Primary Q1 routes (3):** `GC03`, `GC07`, `ID01`
**Development domains:** Gladiatorial Combat, Awareness, Class feature

**Pegar:** "The crowd never walks home with your wounds. Remember that when it starts shouting."

**Situation:** An opponent falls to one knee in an exhibition. Their weapon lies within reach, but they have not surrendered. The audience demands a finishing blow, and the official will stop the match if either combatant clearly signals a surrender. The opponent is watching your next step.

**Question:** How do you handle the moment?

**Five first-person choices:**

**A - I demand that the opponent surrender and keep enough distance to prevent a desperate attack.**

Developer interpretation: Pressure paired with a careful threat boundary.
Candidate canonical mechanical keys: `intimidation`, `tacticalAwareness` | role `controller`.
Ontology topic candidates (not certified effects): `intimidation`, `positioning`.
Publication-based development direction, conditional: Gladiatorial Combat challenge directions; normal Persuasion checks apply.

**B - I move to secure the loose weapon before committing to another exchange.**

Developer interpretation: Remove immediate danger by controlling an object.
Candidate canonical mechanical keys: `initiative`, `weaponVersatility` | role `skirmisher`.
Ontology topic candidates (not certified effects): `positioning`, `weapon_training`.
Publication-based development direction, conditional: Ordinary movement and disarm rules; no automatic action or success.

**C - I hold my stance and let the official confirm whether the fight is continuing.**

Developer interpretation: Patience without surrendering readiness.
Candidate canonical mechanical keys: `reactionDefense`, `combatStamina` | role `defender`.
Ontology topic candidates (not certified effects): `defense`, `survivability`.
Publication-based development direction, conditional: Awareness and Unflinching-inspired development, with legal feature timing.

**D - I press the advantage with a controlled strike, knowing the opponent still has a chance to fight back.**

Developer interpretation: Calculated offense without an automatic killing intention.
Candidate canonical mechanical keys: `accuracy`, `meleeDamage` | role `striker`.
Ontology topic candidates (not certified effects): `melee`, `precision`.
Publication-based development direction, conditional: Gladiatorial Combat and weapon attack choices, subject to normal combat rules.

**E - I offer the opponent a clear way to yield and make the official hear it over the crowd.**

Developer interpretation: Create a voluntary, rules-compliant exit.
Candidate canonical mechanical keys: `persuasionMastery`, `authorityPresence` | role `support`.
Ontology topic candidates (not certified effects): `persuasion`, `social`.
Publication-based development direction, conditional: Arena conduct and social competence, not a hidden morality assessment.

**Developer teaching:** The scenario tests control under public pressure, not good-versus-evil. Intent to finish, disarm, protect, persuade or reposition is not an alignment score or a free attack.

### GD-Q3-S05 - The Changing Arena

**Focus:** Hazard recognition, footing and flexible tactics
**Primary Q1 routes (8):** `AR02`, `AR03`, `AR04`, `AR06`, `AW02`, `AW05`, `GC08`, `CF01`
**Development domains:** Awareness, Gladiatorial Combat, Armor Specialist, Class feature

**Pegar:** "Some arenas have a habit of trying to fight you too. I always respected that."

**Situation:** Midway through a public match, floor plates rise, smoke vents open and the fighting area narrows to a rotating platform. Your opponent knows the hazards only as well as you do. The environmental machinery is controlled by officials beyond the ring.

**Question:** How do you adapt?

**Five first-person choices:**

**A - I spend a moment studying the new cycle so I can move when the floor is most stable.**

Developer interpretation: Observe environmental timing before acting.
Candidate canonical mechanical keys: `tacticalAwareness`, `arenaExpertise` | role `scout`.
Ontology topic candidates (not certified effects): `awareness`, `planning`.
Publication-based development direction, conditional: Awareness under actual Perception/Initiative mechanics.

**B - I stay close to the opponent and deny them the space they need to exploit the rotating platform.**

Developer interpretation: Limit the opposing fighter's mobility.
Candidate canonical mechanical keys: `areaControl`, `grappling` | role `controller`.
Ontology topic candidates (not certified effects): `positioning`, `restrain`.
Publication-based development direction, conditional: Lockdown Strike and grab abilities are conditional.

**C - I change my route with the platforms and keep moving to avoid becoming a stationary target.**

Developer interpretation: Sustain mobility as the environment changes.
Candidate canonical mechanical keys: `evasion`, `adaptability` | role `skirmisher`.
Ontology topic candidates (not certified effects): `movement`, `mobility`.
Publication-based development direction, conditional: Awareness and general movement; no free speed advantage.

**D - I use my armor and guard to absorb the worst of the disruption until a safe opening appears.**

Developer interpretation: Protection through equipment rather than mobility.
Candidate canonical mechanical keys: `armorMastery`, `damageReduction` | role `defender`.
Ontology topic candidates (not certified effects): `armor`, `survivability`.
Publication-based development direction, conditional: Armor-dependent talents require actual armor; no default DR from class.

**E - I launch one decisive attack when the opponent loses footing instead of matching every shift of the floor.**

Developer interpretation: Timed exploitation of vulnerability, not guaranteed knockdown.
Candidate canonical mechanical keys: `accuracy`, `burstDamage` | role `striker`.
Ontology topic candidates (not certified effects): `precision`, `offense_melee`.
Publication-based development direction, conditional: Gladiatorial Combat attack paths, with printed conditions.

**Developer teaching:** Environmental movement, bracing, multiattack, Unflinching and Awareness are possible themes. The character has no power to control arena machinery merely by entering Gladiator.

---

## Melee Duelist - Blade Master Kharjo

**Mentor registry:** **MISSING** - Kharjo dialogue exists but no verified registry record; implementation must resolve this before shipping.
**Mentor dialogue source:** `data/dialogue/mentors/kharjo/kharjo_dialogue.json`

**Shared Mentor opening - DRAFT:**

> The blade begins a conversation before it touches another. What matters is which question you choose to answer.

**Q1 source flags:** 1 exact routes carry explicit restriction/quarantine notes in JSON. None of these identifies an acquired talent.

### MD-Q3-S01 - The First Opening

**Focus:** Single combat timing, riposte, disarm and footwork
**Primary Q1 routes (13):** `BR01`, `BR12`, `BR14`, `BR17`, `WS02`, `WS03`, `WS05`, `WS06`, `WS07`, `WS08`, `MD01`, `ID01`, `NEUTRAL`
**Development domains:** Melee Duelist, Weapon Specialist, Brawler

**Blade Master Kharjo:** "Distance is a decision. The first fighter to ignore that has already yielded something."

**Situation:** A challenger with a heavy vibroblade faces you on a narrow bridge above an empty drainage channel. Both have room to advance but little room to circle. The challenger lowers their shoulder as if preparing a committed attack. Neither has struck yet.

**Question:** How do you take the opening?

**Five first-person choices:**

**A - I keep my distance until their heavy attack passes, then answer into the opening.**

Developer interpretation: Turn timing and defense into a potential reply.
Candidate canonical mechanical keys: `counterMastery`, `defensiveSwordsmanship` | role `defender`.
Ontology topic candidates (not certified effects): `counterattack`, `melee_defense`.
Publication-based development direction, conditional: Melee Duelist Advantageous Strike and reactive combat choices require prerequisites.

**B - I close before their swing reaches full force and drive a precise strike into their guard.**

Developer interpretation: Immediate close-range accuracy rather than sheer weight.
Candidate canonical mechanical keys: `accuracy`, `meleeDamage` | role `striker`.
Ontology topic candidates (not certified effects): `melee`, `precision`.
Publication-based development direction, conditional: Weapon Specialist precision directions and normal attack rules.

**C - I feint toward the centerline to draw their blade away from the lane I intend to use.**

Developer interpretation: Create a tactical opening through misdirection.
Candidate canonical mechanical keys: `deceptionMastery`, `dualistTechnique` | role `skirmisher`.
Ontology topic candidates (not certified effects): `feint`, `positioning`.
Publication-based development direction, conditional: Melee Duelist Dirty Tricks/Out of Nowhere require legal feats and timing.

**D - I aim to disarm the challenger rather than trade heavy blows on a narrow bridge.**

Developer interpretation: Separate opponent from weapon without asserting a free disarm.
Candidate canonical mechanical keys: `weaponMastery`, `grappling` | role `controller`.
Ontology topic candidates (not certified effects): `melee`, `control`.
Publication-based development direction, conditional: Weapon Specialist Disarming Attack is a conditional future direction.

**E - I give ground to wider footing and refuse a duel on terrain chosen by the challenger.**

Developer interpretation: Change the terms of the fight by moving.
Candidate canonical mechanical keys: `evasion`, `combatAdaptability` | role `skirmisher`.
Ontology topic candidates (not certified effects): `movement`, `positioning`.
Publication-based development direction, conditional: Master of Movement is a class feature only when granted; does not eliminate all risks.

**Developer teaching:** Melee Duelist talent directions include Advantageous Strike, Dirty Tricks and weapon flourishes; no extra attack, legal weapon proficiency or winning reputation is automatic.

### MD-Q3-S02 - The Second Blade

**Focus:** One blade versus two, flurries and disrupting cadence
**Primary Q1 routes (5):** `BR19`, `MD03`, `MD04`, `MD05`, `MD06`
**Development domains:** Melee Duelist, Weapon Specialist, Brawler

**Blade Master Kharjo:** "Two weapons do not make twice the fighter. They make twice the rhythm to study."

**Situation:** At a training tournament, a rival uses two short blades and alternates quick feints with coordinated attacks. You may choose how to answer using the weapons you are actually proficient with. The practice bout ends with a touch, disarm or agreed yield.

**Question:** Which method do you practice?

**Five first-person choices:**

**A - I match their two-blade rhythm with a pair of my own, working toward a coordinated combination.**

Developer interpretation: Develop two-weapon technique as a future focus.
Candidate canonical mechanical keys: `dualWield`, `dualistTechnique` | role `striker`.
Ontology topic candidates (not certified effects): `dual_wield`, `melee`.
Publication-based development direction, conditional: Dual Weapon Flourish has prerequisites and legal equipment requirements.

**B - I keep one blade and use space efficiently, waiting until the opponent overextends.**

Developer interpretation: Single-weapon control and calm reading.
Candidate canonical mechanical keys: `defensiveSwordsmanship`, `tacticalAwareness` | role `defender`.
Ontology topic candidates (not certified effects): `melee_defense`, `positioning`.
Publication-based development direction, conditional: Single Weapon Flourish talent options are conditional on actual access.

**C - I attack the weapon hand with a disarming motion when the two blades cross.**

Developer interpretation: Precision aimed at disrupting the rival's equipment.
Candidate canonical mechanical keys: `accuracy`, `weaponMastery` | role `controller`.
Ontology topic candidates (not certified effects): `precision`, `melee`.
Publication-based development direction, conditional: Disarming Attack and printed combat maneuver rules apply.

**D - I move outside the paired attacks and force the rival to turn before they can strike together.**

Developer interpretation: Break coordination by positional change.
Candidate canonical mechanical keys: `evasion`, `combatAdaptability` | role `skirmisher`.
Ontology topic candidates (not certified effects): `mobility`, `positioning`.
Publication-based development direction, conditional: Master of Movement and movement talents remain state-dependent.

**E - I threaten a close grapple when both blades come forward and leave their guard exposed.**

Developer interpretation: Transition toward unarmed control at substantial risk.
Candidate canonical mechanical keys: `grappling`, `unarmeddMastery` | role `bruiser`.
Ontology topic candidates (not certified effects): `grapple`, `unarmed`.
Publication-based development direction, conditional: Brawler Strong Grab/Expert Grappler directions require legal access.

**Developer teaching:** Dual Weapon Flourish I/II and Single Weapon Flourish I/II are talent chains, not default style grants. A scenario does not supply dual-wield feats or chosen weapons.

### MD-Q3-S03 - The Weapon Taken

**Focus:** Improvisation, unarmed skill and recovering from disarm
**Primary Q1 routes (11):** `BR02`, `BR03`, `BR05`, `BR06`, `BR07`, `BR08`, `BR09`, `BR11`, `BR16`, `BR18`, `BR22`
**Development domains:** Brawler, Weapon Specialist, Melee Duelist

**Blade Master Kharjo:** "A lost weapon is a fact. Panic is an addition you make yourself."

**Situation:** During a practice challenge in a workshop, an opponent hooks your weapon away. It slides behind a workbench. Your opponent is advancing, and nearby are a loose tool handle, a length of cable and a doorway to open ground. The fight remains a controlled sparring exercise.

**Question:** How do you continue?

**Five first-person choices:**

**A - I use the tool handle as an improvised weapon and maintain enough range to keep fighting.**

Developer interpretation: Practical tool substitution.
Candidate canonical mechanical keys: `improvisation`, `weaponVersatility` | role `flex`.
Ontology topic candidates (not certified effects): `improvised_weapon`, `melee`.
Publication-based development direction, conditional: Brawler Make Do, Cantina Brawler and ordinary improvised-weapon penalties.

**B - I close into a grapple so the opponent's reach matters less than control of their arms.**

Developer interpretation: Hand-to-hand control without a guaranteed pin.
Candidate canonical mechanical keys: `grappling`, `unarmeddMastery` | role `controller`.
Ontology topic candidates (not certified effects): `grapple`, `unarmed`.
Publication-based development direction, conditional: Brawler grab and grappling talents each need eligibility checks.

**C - I move through the doorway and recover distance before retrieving my weapon.**

Developer interpretation: Preserve options rather than trade unarmed blows.
Candidate canonical mechanical keys: `evasion`, `combatAdaptability` | role `skirmisher`.
Ontology topic candidates (not certified effects): `mobility`, `movement`.
Publication-based development direction, conditional: Melee Duelist Master of Movement and ordinary movement, if applicable.

**D - I fake a rush, then dart around the workbench to recover the weapon while their guard shifts.**

Developer interpretation: Feint for recovery rather than damage.
Candidate canonical mechanical keys: `deceptionMastery`, `initiative` | role `skirmisher`.
Ontology topic candidates (not certified effects): `feint`, `positioning`.
Publication-based development direction, conditional: Dirty Tricks and Out of Nowhere are conditional possible directions.

**E - I take the immediate defensive stance and wait for a chance to counter or disarm their own weapon.**

Developer interpretation: Defensive response while under-armed.
Candidate canonical mechanical keys: `counterMastery`, `reactionDefense` | role `defender`.
Ontology topic candidates (not certified effects): `counterattack`, `melee_defense`.
Publication-based development direction, conditional: Counterpunch or Disarm and Engage only with actual qualifying features.

**Developer teaching:** Brawler paths include Make Do, grappling and unarmed counters. The available tool handle is scenario equipment, not an actor-owned specialist weapon or a free improvised-weapon talent.

### MD-Q3-S04 - The False Courtesy

**Focus:** Adaptation to changing duel terms and public expectations
**Primary Q1 routes (7):** `BR04`, `BR15`, `BR21`, `WS01`, `MD02`, `MD07`, `ID02`
**Development domains:** Melee Duelist, Brawler, Weapon Specialist

**Blade Master Kharjo:** "The rules may change. Your discipline should not have to vanish with them."

**Situation:** In a formal exhibition, your opponent agreed to fight without outside equipment. Halfway through, they draw a concealed shock device and the referee has not yet noticed. The audience believes the bout remains fair. You can signal the official, change tactics or continue, but no one has declared you champion.

**Question:** What do you do?

**Five first-person choices:**

**A - I alert the referee and keep a safe guard until the device can be removed from the bout.**

Developer interpretation: Use procedural correction without abandoning readiness.
Candidate canonical mechanical keys: `tacticalAwareness`, `reactionDefense` | role `defender`.
Ontology topic candidates (not certified effects): `awareness`, `defense`.
Publication-based development direction, conditional: No automatic ability to force the referee's ruling.

**B - I use the opponent's moment of concealment as the opening for a swift, precise counterattack.**

Developer interpretation: Exploit distracted timing in close combat.
Candidate canonical mechanical keys: `counterMastery`, `accuracy` | role `striker`.
Ontology topic candidates (not certified effects): `counterattack`, `precision`.
Publication-based development direction, conditional: Advantageous Strike and weapon techniques require printed prerequisites.

**C - I try to disarm the shock device before it can be used against me.**

Developer interpretation: Neutralize a tool rather than the person.
Candidate canonical mechanical keys: `weaponMastery`, `grappling` | role `controller`.
Ontology topic candidates (not certified effects): `melee`, `control`.
Publication-based development direction, conditional: Weapon Specialist Disarming Attack and combat maneuver rules apply.

**D - I break their rhythm with a convincing feint and make them expose the device in plain sight.**

Developer interpretation: Reveal misconduct through tactical deception.
Candidate canonical mechanical keys: `deceptionMastery`, `dualistTechnique` | role `utility`.
Ontology topic candidates (not certified effects): `feint`, `social`.
Publication-based development direction, conditional: Melee Duelist feint talent options only when owned.

**E - I retreat to open space and refuse to remain in range of the device until I understand what it does.**

Developer interpretation: Information and distance over confrontation.
Candidate canonical mechanical keys: `evasion`, `tacticalAwareness` | role `skirmisher`.
Ontology topic candidates (not certified effects): `mobility`, `awareness`.
Publication-based development direction, conditional: Master of Movement applies only at its actual awarded class level.

**Developer teaching:** The scene distinguishes tactical responses to cheating without scoring honor or morality. Any disarm, feint or attack remains subject to normal action and weapon rules.

### MD-Q3-S05 - The Corridor of Obstacles

**Focus:** Close-quarters movement, defensive spacing and finishing position
**Primary Q1 routes (8):** `BR10`, `BR13`, `BR20`, `WS04`, `WS09`, `MD08`, `MD09`, `CF01`
**Development domains:** Melee Duelist, Brawler, Weapon Specialist, Class feature

**Blade Master Kharjo:** "A perfect technique in an empty room is only half a technique."

**Situation:** Inside a crowded repair corridor, a hostile fighter advances with a long cutting weapon. Workers are retreating through a narrow hatch behind you, while loose crates and conduits block a straight line of movement. You have no automatic authority over the workers.

**Question:** How do you resolve the approach?

**Five first-person choices:**

**A - I move around the crates to draw the attacker away from the hatch before closing in.**

Developer interpretation: Use terrain to separate threat from bystanders.
Candidate canonical mechanical keys: `evasion`, `combatAdaptability` | role `skirmisher`.
Ontology topic candidates (not certified effects): `positioning`, `mobility`.
Publication-based development direction, conditional: Master of Movement/movement capabilities only when actually available.

**B - I hold the narrow approach and make the attacker come through my blade's best distance.**

Developer interpretation: Control a choke point and prevent easy bypass.
Candidate canonical mechanical keys: `defensiveSwordsmanship`, `areaControl` | role `defender`.
Ontology topic candidates (not certified effects): `positioning`, `melee_defense`.
Publication-based development direction, conditional: Melee Duelist and Weapon Specialist defensive development.

**C - I press into close quarters, where the attacker's long weapon will be harder to maneuver.**

Developer interpretation: Shorten distance to reduce weapon advantage.
Candidate canonical mechanical keys: `grappling`, `meleeDamage` | role `bruiser`.
Ontology topic candidates (not certified effects): `grapple`, `melee`.
Publication-based development direction, conditional: Brawler and ordinary melee/grab rules; no automatic reach negation.

**D - I attempt a fast disarm so the workers can finish retreating without a prolonged duel.**

Developer interpretation: Protect retreat through a targeted action.
Candidate canonical mechanical keys: `accuracy`, `allySupport` | role `support`.
Ontology topic candidates (not certified effects): `melee`, `ally_support`.
Publication-based development direction, conditional: Weapon Specialist disarm paths and ordinary action economy.

**E - I use the loose crates as a diversion, forcing the attacker to change direction before I strike.**

Developer interpretation: Environmental manipulation and disciplined follow-up.
Candidate canonical mechanical keys: `improvisation`, `dualistTechnique` | role `controller`.
Ontology topic candidates (not certified effects): `improvised_weapon`, `positioning`.
Publication-based development direction, conditional: Brawler improvisation and Melee Duelist technique; no free trap creation.

**Developer teaching:** Master of Movement is a class feature with a defined acquisition point and mechanical scope. Neither the talent name nor a survey answer creates free movement, protected ally actions or extra damage.

---

## Enforcer - Krag the Immovable

**Mentor registry:** `krag` / `m17`
**Mentor dialogue source:** `data/dialogue/mentors/krag/krag_dialogue.json`

**Shared Mentor opening - DRAFT:**

> When trouble runs, someone has to decide how to stop it. You can make noise. Or you can finish the job. Choose.

**Q1 source flags:** 1 exact routes carry explicit restriction/quarantine notes in JSON. None of these identifies an acquired talent.

### EN-Q3-S01 - The Moving Suspect

**Focus:** Pursuit, target observation and crowd safety
**Primary Q1 routes (4):** `SV03`, `SV04`, `EN02`, `NEUTRAL`
**Development domains:** Survivor, Enforcement, Future class feature

**Krag the Immovable:** "Fast feet are useful. A good head tells you where to put them."

**Situation:** A suspect carrying stolen access credentials runs through a busy transit market. They have not threatened anyone, but reaching the platform could let them disappear into a departing crowd. Two security volunteers offer help; you do not command them automatically.

**Question:** How do you respond?

**Five first-person choices:**

**A - I follow the suspect through the crowd and adjust my route so I do not lose them at the platform.**

Developer interpretation: Direct pursuit with situational navigation.
Candidate canonical mechanical keys: `trackingMastery`, `rapidResponse` | role `scout`.
Ontology topic candidates (not certified effects): `pursuit`, `mobility`.
Publication-based development direction, conditional: Enforcement Pursuit and Survivor Sprint/Surefooted, if selected.

**B - I ask the volunteers to watch the exits and report movement instead of all joining the chase.**

Developer interpretation: Coordinate willing assistance to cover a larger area.
Candidate canonical mechanical keys: `unitCoordination`, `allySupport` | role `leader`.
Ontology topic candidates (not certified effects): `teamwork`, `recon`.
Publication-based development direction, conditional: No free command feature or automatic police backup.

**C - I watch the suspect's habits and try to predict which entrance they will choose next.**

Developer interpretation: Pattern assessment before immediate confrontation.
Candidate canonical mechanical keys: `tacticalAwareness`, `informationControl` | role `scout`.
Ontology topic candidates (not certified effects): `investigation`, `awareness`.
Publication-based development direction, conditional: Targeted Suspect is a later class feature, not currently assumed.

**D - I cut across a safer side street and try to reach the platform before the suspect.**

Developer interpretation: Indirect interception rather than a straight chase.
Candidate canonical mechanical keys: `evasion`, `adaptability` | role `skirmisher`.
Ontology topic candidates (not certified effects): `movement`, `positioning`.
Publication-based development direction, conditional: Survivor movement talents only if owned.

**E - I alert transit security and provide the suspect's description before the train arrives.**

Developer interpretation: Use an authorized channel to coordinate interception.
Candidate canonical mechanical keys: `lawEnforcement`, `networkInfluence` | role `support`.
Ontology topic candidates (not certified effects): `network`, `leadership`.
Publication-based development direction, conditional: No fabricated office or guaranteed security response.

**Developer teaching:** Enforcer printed Survivor access, Pursuit and Targeted Suspect later feature are candidate directions. No police rank, automatic arrest authority, and no level-2 Targeted Suspect benefit at initial entry.

### EN-Q3-S02 - The Stun Window

**Focus:** Nonlethal tactics, restraint and protective positioning
**Primary Q1 routes (5):** `SV01`, `EN03`, `EN06`, `EN07`, `ID01`
**Development domains:** Enforcement, Survivor

**Krag the Immovable:** "A living suspect can answer questions. A bystander in the line of fire cannot. Keep both in mind."

**Situation:** A desperate saboteur backs into a maintenance bay with a charged blaster. A mechanic is sheltering behind a low crate, and the saboteur is still looking for an exit. Stun equipment may be available only if the character or local security actually possesses it.

**Question:** How do you contain the threat?

**Five first-person choices:**

**A - I use an available stun setting or weapon to stop the saboteur without needing a lethal shot.**

Developer interpretation: Seek controlled capture through actual equipment.
Candidate canonical mechanical keys: `lawEnforcement`, `accuracy` | role `controller`.
Ontology topic candidates (not certified effects): `nonlethal`, `stun`.
Publication-based development direction, conditional: Enforcement Nonlethal Tactics/Slowing Stun, if owned and applicable.

**B - I approach under cover and try to close enough to restrain them without a clear firing lane to the mechanic.**

Developer interpretation: Nonshooting capture with exposure to close-range danger.
Candidate canonical mechanical keys: `grappling`, `reactionDefense` | role `defender`.
Ontology topic candidates (not certified effects): `cover`, `grapple`.
Publication-based development direction, conditional: Normal grab/restraint rules; Takedown talent requires selection.

**C - I keep the saboteur talking while moving the mechanic toward a safer position.**

Developer interpretation: Protect the bystander through de-escalation and distance.
Candidate canonical mechanical keys: `persuasionMastery`, `allySupport` | role `support`.
Ontology topic candidates (not certified effects): `persuasion`, `support`.
Publication-based development direction, conditional: General Persuasion and willing movement; no assumed officer authority.

**D - I take a defensible position at the exit so a breakout would expose the saboteur rather than the mechanic.**

Developer interpretation: Contain a route without a gratuitous attack.
Candidate canonical mechanical keys: `tacticalAwareness`, `areaControl` | role `defender`.
Ontology topic candidates (not certified effects): `positioning`, `control`.
Publication-based development direction, conditional: Enforcement and Survivor approaches; action limits apply.

**E - I make it clear that leaving the weapon behind is the only safe way out of the bay.**

Developer interpretation: Deterrence and conditional surrender demand.
Candidate canonical mechanical keys: `intimidation`, `authorityPresence` | role `controller`.
Ontology topic candidates (not certified effects): `intimidation`, `social`.
Publication-based development direction, conditional: No automatic forced compliance or class-provided social power.

**Developer teaching:** Nonlethal Tactics, Slowing Stun and Takedown are conditional options, not automatic stun capability, a free successful grab or guaranteed nonlethal outcome.

### EN-Q3-S03 - A Street Full of Witnesses

**Focus:** Investigation, trusted reports and measured enforcement
**Primary Q1 routes (2):** `EN04`, `CF02`
**Development domains:** Survivor, Enforcement, Future class feature

**Krag the Immovable:** "Everybody saw something. That does not mean everybody saw the same thing."

**Situation:** An armored courier was attacked outside a depot. Witnesses disagree about whether one or two suspects fled. A damaged datapad and scattered containers remain, but the street is reopening and some witnesses want to leave. A local investigator asks for your assessment.

**Question:** How do you reconstruct the event?

**Five first-person choices:**

**A - I inspect the damaged containers and positions of the debris before the site is disturbed.**

Developer interpretation: Physical evidence before testimony is lost.
Candidate canonical mechanical keys: `tacticalAwareness`, `informationControl` | role `scout`.
Ontology topic candidates (not certified effects): `investigation`, `perception`.
Publication-based development direction, conditional: Ordinary Perception and trained investigative checks; no invented detective talent.

**B - I interview witnesses separately so one account does not change what the others remember.**

Developer interpretation: Source independence and cross-checking.
Candidate canonical mechanical keys: `persuasionMastery`, `informationControl` | role `utility`.
Ontology topic candidates (not certified effects): `gather_information`, `investigation`.
Publication-based development direction, conditional: Gather Information trained by entry requirement, not guaranteed success.

**C - I ask the investigator to secure the datapad and examine its records under the proper authority.**

Developer interpretation: Chain-of-custody and technical review without unauthorized access.
Candidate canonical mechanical keys: `technicalMastery`, `lawEnforcement` | role `utility`.
Ontology topic candidates (not certified effects): `tech`, `investigation`.
Publication-based development direction, conditional: Use Computer requires relevant access; no default hacking entitlement.

**D - I search the nearby exits for signs of hurried movement that could confirm the direction of escape.**

Developer interpretation: Follow physical escape indicators.
Candidate canonical mechanical keys: `trackingMastery`, `rapidResponse` | role `scout`.
Ontology topic candidates (not certified effects): `tracking`, `pursuit`.
Publication-based development direction, conditional: Survivor and Enforcement chase themes; no free tracking feature.

**E - I keep the witnesses safe and organize an orderly reopening while the investigator preserves the evidence.**

Developer interpretation: Public protection and operations coordination.
Candidate canonical mechanical keys: `allySupport`, `unitCoordination` | role `support`.
Ontology topic candidates (not certified effects): `support`, `teamwork`.
Publication-based development direction, conditional: Voluntary cooperation, not proof of an official commanding rank.

**Developer teaching:** Perception/Gather Information entry training and investigative skill use are not automatic success. Targeted Suspect requires its later-level trigger and printed observation conditions.

### EN-Q3-S04 - The Crash at the Barrier

**Focus:** Vehicle interception, public safety and operational risk
**Primary Q1 routes (2):** `SV02`, `EN01`
**Development domains:** Enforcement, Survivor, Class-feature resources

**Krag the Immovable:** "A bad stop can be worse than a clean escape. Pick your ground."

**Situation:** A fleeing suspect drives a stolen utility vehicle toward a checkpoint where civilians are crossing. Security has time to change the road barriers, but stopping the vehicle could send it skidding into the crossing. The suspect is not yet firing on anyone.

**Question:** How would you stop the escape?

**Five first-person choices:**

**A - I guide the checkpoint team to clear the pedestrians and open a safer interception lane.**

Developer interpretation: Clear third-party exposure before risky maneuvering.
Candidate canonical mechanical keys: `allySupport`, `unitCoordination` | role `leader`.
Ontology topic candidates (not certified effects): `teamwork`, `vehicle`.
Publication-based development direction, conditional: No automatically owned squad or police authority; requires volunteers.

**B - I try to maintain visual contact and follow at a safe distance until the vehicle reaches open ground.**

Developer interpretation: Deferred capture with less immediate collateral risk.
Candidate canonical mechanical keys: `evasionTactics`, `trackingMastery` | role `scout`.
Ontology topic candidates (not certified effects): `pursuit`, `vehicle`.
Publication-based development direction, conditional: Enforcement Pursuit, where legally selected; no guaranteed evasion of obstacles.

**C - I choose a controlled vehicle interception on open pavement instead of letting the suspect reach the crossing.**

Developer interpretation: Risk-managed attempt to block or collide.
Candidate canonical mechanical keys: `pilotMastery`, `lawEnforcement` | role `controller`.
Ontology topic candidates (not certified effects): `vehicle`, `positioning`.
Publication-based development direction, conditional: Intentional Crash rules require actual vehicle, skill and talent qualification.

**D - I direct warning signals and coordinate remote barriers to steer the vehicle away from the busiest path.**

Developer interpretation: Infrastructure use through available personnel and equipment.
Candidate canonical mechanical keys: `tacticalAwareness`, `resourcefulness` | role `support`.
Ontology topic candidates (not certified effects): `tech`, `tactics`.
Publication-based development direction, conditional: No automatic hacking or electronic barrier control.

**E - I prioritize getting everyone clear, even if it means letting the suspect pass and resuming the pursuit later.**

Developer interpretation: Protect civilians despite operational setback.
Candidate canonical mechanical keys: `allySupport`, `rapidResponse` | role `defender`.
Ontology topic candidates (not certified effects): `support`, `pursuit`.
Publication-based development direction, conditional: Enforcer identity and common movement; no hidden moral score.

**Developer teaching:** Intentional Crash is a specialized vehicle talent with rules and risk, not a granted license to ram. Enforcer Resources is class-limited equipment access, not unlimited vehicles or military gear.

### EN-Q3-S05 - The Evidence Locker

**Focus:** Authority, intimidation, equipment stewardship and accountability
**Primary Q1 routes (3):** `EN05`, `CF01`, `ID02`
**Development domains:** Enforcement, Survivor, Resources class feature

**Krag the Immovable:** "A badge, a uniform, a name. None of those makes bad evidence good."

**Situation:** A disputed shipment of confiscated weapons is being transferred for inspection. A senior contractor insists that the crates be released without signatures, claiming the paperwork can follow. The warehouse staff are uncertain whether the order is valid. You are present as an authorized security adviser, not necessarily the ranking official.

**Question:** How do you handle the transfer?

**Five first-person choices:**

**A - I stop the transfer until the issuing authority and chain-of-custody documents can be verified.**

Developer interpretation: Verify legal process before moving dangerous items.
Candidate canonical mechanical keys: `lawEnforcement`, `tacticalAwareness` | role `defender`.
Ontology topic candidates (not certified effects): `investigation`, `planning`.
Publication-based development direction, conditional: No assumption that the character can unilaterally countermand orders.

**B - I press the contractor to explain the missing authorization while keeping the staff out of the confrontation.**

Developer interpretation: Direct pressure paired with protection of workers.
Candidate canonical mechanical keys: `intimidation`, `allySupport` | role `controller`.
Ontology topic candidates (not certified effects): `intimidation`, `support`.
Publication-based development direction, conditional: Respected Officer may help eligible social situations, but does not guarantee obedience.

**C - I inventory the crates with the warehouse staff and preserve a shared record of any discrepancy.**

Developer interpretation: Accountable tracking of equipment.
Candidate canonical mechanical keys: `resourceControl`, `informationControl` | role `utility`.
Ontology topic candidates (not certified effects): `resources`, `investigation`.
Publication-based development direction, conditional: Resources class feature has source-specific gear limits; not instant requisition.

**D - I contact the issuing office through a verified channel and ask another official to witness the decision.**

Developer interpretation: Independent authorization and institutional accountability.
Candidate canonical mechanical keys: `networkInfluence`, `lawEnforcement` | role `support`.
Ontology topic candidates (not certified effects): `network`, `teamwork`.
Publication-based development direction, conditional: No invented superiors, personal contacts, or binding command privilege.

**E - I position security at the exits while the transfer is checked so nobody can quietly remove a crate.**

Developer interpretation: Prevent unauthorized movement with limited operational security.
Candidate canonical mechanical keys: `areaControl`, `unitCoordination` | role `leader`.
Ontology topic candidates (not certified effects): `positioning`, `tactics`.
Publication-based development direction, conditional: Requires willing security personnel; no free minions or special suppression.

**Developer teaching:** Respected Officer and Resources have individual prerequisites and restricted effects. Enforcer entry requires security/law-enforcement association, not unquestionable power to seize or distribute equipment.

---

## Cross-batch QA and production gates

**Completed structural tests:** 25 unique scenario IDs; 125 unique response IDs and player texts; five A-E, first-person choices per scene; 204 authored Q1 routes covered once and only once, partitioned by typed class. All candidate mechanical/role bias keys and ontology tag spellings belong to the known canonical vocabularies.

**Not yet tested or certified:** per-talent printed effects, live actor legal eligibility, engine ingestion, actual signal weighting, current-score isolation, Mentor runtime registry fixes, UI interaction, or owner editorial signoff. Proposed interpretations are not mechanical grants.

**Next production checks:**

1. Confirm each Mentor voice, especially Miedo's quiet certainty, Skindar's abrasive tradecraft, Pegar's amused longevity, Kharjo's measured precision, and Krag's low practical authority.

2. Resolve Kharjo registry absence with an approved exact class -> Mentor ID. Do not substitute a different Mentor by heuristic fallback.

3. Resolve the Sith Lord DSS print-vs-house-rule conflict and missing class-independent Force talent tree access. Keep Sith Lord secrets at class levels 2-5; do not auto-allow light-side or tradition-restricted choices.

4. Compare Corporate Agent progression employment restriction and Enforcer Resources/Targeted Suspect class features against player actor state; confirm Gladiator optional Crowd Response policy and Melee Duelist exact Weapon Focus entry requirements.

5. Validate final selected response -> provenance-backed Q3-only intent event against existing V2 Suggestion Engine with no new scoring formula, unapproved tag mapping, duplicate Q1/Q2 contribution, or morale-alignment judgment.

**No GitHub change, commit, push, PR or runtime implementation was made by this document-generation task.**



---

# SOURCE DOCUMENT: Batch 4 — `SWSE_Prestige_Q3_Batch4_Five_Classes_v01.md`

# SWSE Prestige Survey — Q3 *The Responsibility* — Batch 4 (Five Classes)

**Version:** v0.1 | **Date:** November 15, 2026 | **Status:** COMPLETE FIRST-PASS EDITORIAL DRAFT FOR OWNER REVIEW.

**Scope:** Independent Droid, Infiltrator, Master Privateer, Medic and Saboteur. The five remaining Force Unleashed Campaign Guide prestige classes after Enforcer.

**Not approved or done:** Exact printed talent mechanics for every answer, actor-level eligibility, Q3 score coefficients, Suggestion Engine event ingestion, live Foundry QA, runtime code, GitHub commit/push or PR.

## Survey implementation contract (editorial, not an API)

One of five authored scenarios appears according to the selected prestige class and an exact previously submitted Q1 response ID. Q2 and verified actor context may refine the scene match, but **neither displaying Q1/Q2 nor merely showing an option creates an additional bias vote**. The player selects one of five first-person decisions; the eventual implementation records exactly one Q3 hypothetical-method preference, separately from historical build facts and explicit career goals.

Each scene permits **"I am not sure yet"** as a separate zero-evidence answer and unscored **"Try another situation"** navigation. The five A-E alternatives must remain genuine decisions, not one predetermined correct answer and four failures. No moral/alignment score is derived from a method.

`mechanicalBiasKeys` and `roleBiasKey` are candidate names from the repository's existing 125/12 vocabularies. `ontologyTopicCandidates` are candidate spellings from the 190-tag owner-defined ontology. They are **not** source-certified operative effect classifications: in particular, a narrative reference to a skill does not automatically satisfy the ontology's EXACT_SKILL_POLICY. Do not use these objects as direct additive weights until a verified provenance-preserving V2 consumer exists.

### Completion

| Class | Mentor | Scenarios | Substantive answers | Exact Q1 routes |
|---|---|---:|---:|---:|
| Independent Droid | Seraphim | 5 | 25 | 23/23 |
| Infiltrator | Delta | 5 | 25 | 32/32 |
| Master Privateer | The Captain | 5 | 25 | 39/39 |
| Medic | Kyber | 5 | 25 | 22/22 |
| Saboteur | Spark | 5 | 25 | 43/43 |
| **Total** | | **25** | **125** | **159/159** |

## Technical/source caution ledger

These are source-led constraints, not new class restrictions or assumed actor facts.

### Independent Droid

- Autonomy is not a declaration that the actor was abused, memory-wiped or forcibly restrained.
- Sapience is an entry-level feature; Independent Spirit begins at Independent Droid 2.
- Elite Droid expanded tree and specific class-tree IDs require full compendium/source reconciliation.
- No free chassis change, credit grant, repair result, independent social standing or programming immunity.

### Infiltrator

- Bothan SpyNet class-tree source IDs and membership/affiliation requirements need typed canonical reconciliation.
- Unarmed Stun begins at Infiltrator 2 and Lead Infiltrator begins at 4, with further progression; neither granted on entry.
- Spying is not automatically assassination; no presumed prior infiltration, victim, or secrecy clearance.
- No unverified contact network, cover identity, badge, weapon ownership or actual group leadership.

### Master Privateer

- No presumed starship, ship ownership, crew, sponsor, legal letter of marque, cargo prize or personal command.
- The Privateer entry tree is named Spacehound in some printed references but Spacer in repository metadata; exact source identity must be reconciled.
- Core Spacer Hyperdriven has a Scoundrel-class-level scaling clause; do not promise Privateer level scaling.
- Piracy is a class restriction concerning dark-side status, not free loot or automatic lawful authority.
- Veteran Privateer begins at Master Privateer level 2 and is not acquired on entry.

### Medic

- Medical Secrets are earned at even Medic levels (2,4,6,8,10), not Medic 1; seven published secrets have their own restrictions.
- Surgical Expertise is a printed entry prerequisite; no prior surgery, successful treatment or heroic rescue is inferred.
- Kyber does not make every patient a civilian or every Medic altruistic; treatment intent does not create alignment scoring.
- No unconditional self-healing, long-range medical aid, ready medical kit or hospital facilities outside stated scene context.

### Saboteur

- Unexpected Results is an entry-level class feature; Destructive starts at level 2, Quick Sabotage at 4/6/8, Master Saboteur at 10.
- Saboteur tactics should minimize unnecessary collateral damage without scoring moral alignment.
- No automatic turret construction, software execution, device access, explosions, weapons or demolition material awarded by the scenario.
- Slicer/Misfortune talent names and tree membership require exact printed prerequisites and actor legality.

## Complete scenario dialogue and developer interpretations

## Independent Droid — Seraphim (`m25`)

**Mentor authority:** `data/dialogue/mentors/seraphim/seraphim_dialogue.json`

**Shared Mentor introduction (DRAFT):**

> <Assessment: Independence is a capability, not an automatic answer.> I will supply complications. You will supply decisions. Try not to confuse those functions.

### ID-Q3-S01 — The Override Request

**Distinct focus:** Autonomy, privacy, consent and resilience
**Default Q1 route IDs (6):** `AU01`, `AU02`, `AU03`, `AU06`, `CF01`, `ID01`
**Coverage domains:** Autonomy, Sapience

**Seraphim (scene introduction):** “<Diagnostic: Unauthorized priority escalation.> An appealingly familiar procedure.”

**Situation:** At a civilian repair depot, a technician asks you to accept a temporary remote-control link to speed up repairs. The software requests broader access than the stated repair requires. The technician appears sincere, but the access would let someone alter your decisions until the link is closed.

**Question:** How do you handle the request?

**Player options (all first-person):**

**A.** I reject the broad access and request a precise, limited diagnostic procedure instead.

Developer intent: Self-determination with a narrow technical alternative.
Candidate mechanical bias: `independence`, `selfProgram`; role `utility`.
Candidate ontology topics: `droid`, `tech`.
Possible development (conditional): Autonomy: Defensive Electronics; Sapience is a class feature, not a free choice of additional talents.

**B.** I isolate the connection in a monitored subsystem and review each command before allowing it through.

Developer intent: Technical verification before trusting a link.
Candidate mechanical bias: `technicalMastery`, `informationControl`; role `controller`.
Candidate ontology topics: `tech`, `droid`.
Possible development (conditional): Autonomy: Defensive Electronics; possible Use Computer activity if the actor can perform it.

**C.** I explain exactly what access I will authorize and negotiate a different repair arrangement.

Developer intent: Exercise autonomy through consent and negotiation.
Candidate mechanical bias: `independence`, `persuasionMastery`; role `utility`.
Candidate ontology topics: `social`, `droid`.
Possible development (conditional): General social rules; Independent Droid is not automatically trained in Persuasion.

**D.** I leave the depot and search for someone who can repair me without controlling my judgment.

Developer intent: Disengage and preserve control of own systems.
Candidate mechanical bias: `evasionTactics`, `independence`; role `scout`.
Candidate ontology topics: `evasion`, `droid`.
Possible development (conditional): Autonomy: Just a Droid or Swift Droid can support future concealment or disengagement; no automatic disguise.

**E.** I permit a narrow, supervised repair test and retain the ability to disconnect when it goes beyond its purpose.

Developer intent: Conditional trust and monitored cooperation.
Candidate mechanical bias: `adaptability`, `mechanicalMastery`; role `flex`.
Candidate ontology topics: `tech`, `repair`.
Possible development (conditional): Class Sapience concerns independent choice; specific system-control protections require legal mechanics.

**Mechanical teaching (developer only):** Possible developments include Defensive Electronics, Just a Droid, and Sapience. None grants universal immunity to reprogramming or proves a past owner or memory wipe.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### ID-Q3-S02 — The Damage You Choose

**Distinct focus:** Self-repair, modification and physical strain
**Default Q1 route IDs (4):** `AU04`, `AU05`, `SD01`, `SD02`
**Coverage domains:** Autonomy, Specialized Droid

**Seraphim (scene introduction):** “<Warning: Functionality and self-preservation are now competing priorities.> Inconvenient, but educational.”

**Situation:** A collapsed service tunnel blocks a group of stranded travelers from an exit. A heavy maintenance gate might be shifted if you drive your actuators beyond safe load, but doing so risks disabling one of your own systems. An intact repair kit is available, though using it will delay the opening.

**Question:** What is your first move?

**Player options (all first-person):**

**A.** I examine the hinge assembly and attempt a small mechanical adjustment before risking my chassis.

Developer intent: Seek a targeted engineering solution before overloading hardware.
Candidate mechanical bias: `mechanicalMastery`, `resourcefulness`; role `utility`.
Candidate ontology topics: `tech`, `repair`.
Possible development (conditional): Autonomy: Modification Specialist; general Mechanics access is separately verified.

**B.** I attempt a short burst of excess power to shift the gate, accepting that repairs may be necessary afterward.

Developer intent: Accept a bounded strain tradeoff for immediate physical effect.
Candidate mechanical bias: `technicalMastery`, `adaptability`; role `bruiser`.
Candidate ontology topics: `power_systems`, `droid`.
Possible development (conditional): Specialized Droid: Power Surge or Power Boost; neither is assumed owned or without cost.

**C.** I use the repair kit to reinforce my actuators and keep them functioning throughout the work.

Developer intent: Prepare and sustain capability instead of gambling it in one burst.
Candidate mechanical bias: `selfProgram`, `resourceControl`; role `defender`.
Candidate ontology topics: `repair`, `durability`.
Possible development (conditional): Autonomy: Repair Self and Modification Specialist; actual kit and checks require rules resolution.

**D.** I organize the travelers to clear smaller debris while I work on the gate controls.

Developer intent: Divide tasks and coordinate noncombat help.
Candidate mechanical bias: `allySupport`, `unitCoordination`; role `leader`.
Candidate ontology topics: `teamwork`, `tech`.
Possible development (conditional): Elite Droid: flexible routines; allies do not automatically gain a bonus or controlled actions.

**E.** I search for a second exit rather than risk disabling the only functioning helper at the gate.

Developer intent: Use alternate-path reconnaissance to lower total risk.
Candidate mechanical bias: `explorationMastery`, `tacticalAwareness`; role `scout`.
Candidate ontology topics: `exploration`, `awareness`.
Possible development (conditional): General skill development; no automatic sensor suite or navigation success.

**Mechanical teaching (developer only):** Power Surge, Power Boost, Repair Self and Modification Specialist are potential class-tree directions, each with separate costs and prerequisites; the character is not presumed to own them.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### ID-Q3-S03 — The Silent Network

**Distinct focus:** Computer interfaces, other droids and information rights
**Default Q1 route IDs (4):** `SD03`, `SD04`, `ED01`, `ED02`
**Coverage domains:** Specialized Droid, Elite Droid

**Seraphim (scene introduction):** “<Analysis: Another machine is asking for help without using the word help.> Organics rarely notice the distinction.”

**Situation:** A damaged logistics droid at a transit hub sends a repetitive distress packet. Its operator insists it is only a malfunction and orders it wiped. The packet includes signs of a locked behavior routine and references to misdirected emergency shipments. You have limited access to the hub terminal.

**Question:** What do you investigate?

**Player options (all first-person):**

**A.** I inspect the packet and preserve a copy before anyone erases the evidence.

Developer intent: Secure records and determine what the signal actually means.
Candidate mechanical bias: `hackingSkills`, `informationControl`; role `scout`.
Candidate ontology topics: `use_computer`, `investigation`.
Possible development (conditional): Specialized Droid: Computer Master; relevant Use Computer checks and access limitations remain.

**B.** I speak to the droid through its own protocol and ask what it is trying to communicate.

Developer intent: Prioritize direct communication over treating the device as property alone.
Candidate mechanical bias: `technicalMastery`, `allySupport`; role `support`.
Candidate ontology topics: `droid`, `tech`.
Possible development (conditional): Specialized Droid: Computer Language; no assumed telepathy or universal interface.

**C.** I test whether an external inhibitor is forcing the message, without rewriting the droid myself.

Developer intent: Diagnose control rather than automatically cancel it.
Candidate mechanical bias: `droidControl`, `technicalMastery`; role `controller`.
Candidate ontology topics: `droid`, `slicing`.
Possible development (conditional): Elite Droid: Break Program requires a compatible link and rules conditions.

**D.** I compare the shipment records against the packet and find out who benefits from the diverted cargo.

Developer intent: Connect technical symptoms to operational motive.
Candidate mechanical bias: `informationControl`, `knowledgeMastery`; role `scout`.
Candidate ontology topics: `investigation`, `tech`.
Possible development (conditional): Specialized Droid: computer expertise; no guarantee of complete records or successful accusation.

**E.** I warn the hub staff that a wipe could destroy evidence and propose isolating the droid pending review.

Developer intent: Preserve both evidence and operational safety.
Candidate mechanical bias: `persuasionMastery`, `resourceControl`; role `leader`.
Candidate ontology topics: `social`, `tech`.
Possible development (conditional): General Persuasion and technical options; no invented legal authority over the hub.

**Mechanical teaching (developer only):** Computer Master, Computer Language, Break Program and Heuristic Mastery are possible future branches; interacting with another droid does not establish authority to free, command or rewrite it.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### ID-Q3-S04 — Emergency Routines

**Distinct focus:** Defensive programming, timing and crisis resilience
**Default Q1 route IDs (5):** `SD05`, `SD06`, `ED03`, `ED04`, `CF02`
**Coverage domains:** Autonomy, Specialized Droid, Elite Droid, Independent Spirit

**Seraphim (scene introduction):** “<Status: Two emergencies, one response window.> A textbook way to discover whether a routine deserves to exist.”

**Situation:** During an evacuation drill that abruptly becomes real, a suspended cargo lifter breaks loose above a crowded walkway. The nearest control console is sparking, and an electrical surge has affected your movement servos. People are still beneath the load.

**Question:** How do you react?

**Player options (all first-person):**

**A.** I use a prepared emergency routine to reach the release controls before the load falls.

Developer intent: Favor a rehearsed contingency for a time-critical response.
Candidate mechanical bias: `rapidResponse`, `selfProgram`; role `utility`.
Candidate ontology topics: `droid`, `action_economy`.
Possible development (conditional): Elite Droid: Scripted Routines; no free action or automatic success assumed.

**B.** I stabilize my damaged servos and maneuver into a position where I can act precisely.

Developer intent: Maintain functioning and control before making a risky intervention.
Candidate mechanical bias: `reactionDefense`, `technicalMastery`; role `defender`.
Candidate ontology topics: `repair`, `defense`.
Possible development (conditional): Specialized Droid: Enhanced Manipulation; Independent Spirit begins at class level 2.

**C.** I accept a brief processor overclock to calculate a safe route for the people below.

Developer intent: Make a rapid calculation while accepting system strain as a possibility.
Candidate mechanical bias: `adaptiveAI`, `tacticalAwareness`; role `scout`.
Candidate ontology topics: `droid`, `awareness`.
Possible development (conditional): Specialized Droid: Hotwired Processor; any actual overclock cost follows printed rules.

**D.** I put my chassis between the falling equipment and the people who cannot move in time.

Developer intent: Prioritize physical protection without assuming damage immunity.
Candidate mechanical bias: `damageReduction`, `allySupport`; role `defender`.
Candidate ontology topics: `durability`, `ally_support`.
Possible development (conditional): Elite Droid: Ultra Resilient is conditional and not an automatic bodyguard feature.

**E.** I coordinate nearby workers to cut power and evacuate the walkway while I warn others.

Developer intent: Distributed response reduces dependence on one machine.
Candidate mechanical bias: `allySupport`, `formation`; role `leader`.
Candidate ontology topics: `teamwork`, `tech`.
Possible development (conditional): General teamwork; no ability to compel droids or people is implied.

**Mechanical teaching (developer only):** Scripted Routines, Ultra Resilient, Enhanced Manipulation, Hotwired Processor and Independent Spirit represent distinct prospective or later-level defensive paths.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### ID-Q3-S05 — More Than a Designation

**Distinct focus:** Identity, adaptation and chosen cooperation
**Default Q1 route IDs (4):** `AU07`, `SD07`, `ID02`, `NEUTRAL`
**Coverage domains:** Autonomy, Specialized Droid, Elite Droid, Identity

**Seraphim (scene introduction):** “<Observation: A designation tells observers what to expect.> It does not have to tell you what to become.”

**Situation:** A research expedition offers you a role matching your original manufactured function. It pays reliably, but the lead researcher dismisses a different contribution you believe you could make. The team needs someone to respond to an unexplored ruin, and the decision must be made before departure.

**Question:** What role do you choose?

**Player options (all first-person):**

**A.** I explain the role I want and insist that my own assessment be part of the assignment.

Developer intent: Directly assert agency without treating dissent as universal refusal.
Candidate mechanical bias: `independence`, `persuasionMastery`; role `utility`.
Candidate ontology topics: `droid`, `social`.
Possible development (conditional): Independent Droid class identity and general social capability; no skill grant.

**B.** I offer to retrain my routines for the unfamiliar work rather than accept a fixed job definition.

Developer intent: Seek broadened or redirected practical expertise.
Candidate mechanical bias: `skillUtility`, `selfProgram`; role `flex`.
Candidate ontology topics: `skills`, `droid`.
Possible development (conditional): Specialized Droid: Skill Conversion, if eligible and selected.

**C.** I propose an exploratory test to demonstrate how my flexible problem-solving can help.

Developer intent: Demonstrate value through inquiry and a bounded trial.
Candidate mechanical bias: `adaptiveAI`, `knowledgeMastery`; role `scout`.
Candidate ontology topics: `exploration`, `skills`.
Possible development (conditional): Elite Droid: Heuristic Mastery; no automatic competence in unknown ruin skills.

**D.** I take the known assignment for now, but set clear terms for reviewing my responsibilities.

Developer intent: Choose deliberate cooperation with defined terms.
Candidate mechanical bias: `resourceControl`, `adaptability`; role `support`.
Candidate ontology topics: `resources`, `social`.
Possible development (conditional): Independent Droid identity; no automatic employment or financial resource is implied.

**E.** I decline the role and pursue another expedition where I can define my own purpose.

Developer intent: Prefer autonomy even at the price of short-term security.
Candidate mechanical bias: `freedomPursuit`, `independence`; role `scout`.
Candidate ontology topics: `exploration`, `droid`.
Possible development (conditional): Autonomy: Swift Droid or Just a Droid may support related future playstyles, not immediate benefits.

**Mechanical teaching (developer only):** Skill Conversion, Heuristic Mastery, Swift Droid and autonomy themes support development beyond original design; a droid need not embrace conflict or reject all cooperation to be independent.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

## Infiltrator — Delta (`m12`)

**Mentor authority:** `data/dialogue/mentors/delta/delta_dialogue.json`

**Shared Mentor introduction (DRAFT):**

> You get one job: come back with the answer and as little noise as you can manage. I got five ways that plan can go sideways. Pick how you handle it.

### IN-Q3-S01 — The Guarded Archive

**Distinct focus:** Concealment, movement and silent access
**Default Q1 route IDs (6):** `CA01`, `CA05`, `CA06`, `CA09`, `IT01`, `ID01`
**Coverage domains:** Camouflage, Infiltration, Spy

**Delta (scene introduction):** “Locked archive. Guards. Bad sight lines. Cute. The front door is optional.”

**Situation:** A public registry holds information needed to identify a hidden trafficking route. The office is closed, with two security officers circling the reading room. A maintenance corridor may connect to the record stacks, but its cameras are active. The records can be copied without damaging the archive.

**Question:** How do you enter and secure the information?

**Player options (all first-person):**

**A.** I observe the patrol timing, then slip through the least watched gap without confronting anyone.

Developer intent: Choose timing and movement rather than force.
Candidate mechanical bias: `stealthMastery`, `tacticalAwareness`; role `scout`.
Candidate ontology topics: `stealth`, `infiltration`.
Possible development (conditional): Camouflage: Hidden Movement, Slip By and Improved Stealth, each under printed conditions.

**B.** I enter with the evening maintenance traffic and look as though I belong there.

Developer intent: Use a credible cover identity to enter unnoticed.
Candidate mechanical bias: `identityShift`, `deceptionMastery`; role `utility`.
Candidate ontology topics: `deception`, `infiltration`.
Possible development (conditional): Spy: Incognito or Blend In; no actual disguise kit or access badge granted.

**C.** I test the camera pattern from a safe position and find the stretch the system sees least clearly.

Developer intent: Technical reconnaissance before action.
Candidate mechanical bias: `informationControl`, `stealth`; role `scout`.
Candidate ontology topics: `recon`, `tech`.
Possible development (conditional): General Use Computer/Perception where available; no automatic camera hack.

**D.** I move close enough to question a guard quietly about the archive procedure before I commit.

Developer intent: Exploit human routine for actionable intelligence.
Candidate mechanical bias: `socialManipulation`, `informationControl`; role `utility`.
Candidate ontology topics: `investigation`, `social`.
Possible development (conditional): Spy: observational tradecraft; character still needs valid social abilities.

**E.** I wait for a routine shift change and use the distraction to reach the records with minimal risk.

Developer intent: Prefer patience and a lower-risk opening.
Candidate mechanical bias: `tacticalAwareness`, `infiltration`; role `scout`.
Candidate ontology topics: `planning`, `infiltration`.
Possible development (conditional): Camouflage: stealth and prepared-position directions; no guaranteed shift schedule.

**Mechanical teaching (developer only):** Hidden Movement, Slip By, Creeping Approach, Hide in Plain Sight and Blend In are different conditional future developments; none means the actor is automatically invisible.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### IN-Q3-S02 — An Identity Under Inspection

**Distinct focus:** Disguise, credibility and improvised social cover
**Default Q1 route IDs (5):** `SY01`, `SY04`, `SY05`, `BS02`, `ID02`
**Coverage domains:** Spy, Bothan SpyNet, Identity

**Delta (scene introduction):** “Worst moment to invent your backstory? Halfway through a security interview. So think ahead.”

**Situation:** At an invitation-only reception, an investigator is comparing guest credentials against a shifting list. You have a believable invitation under a cover identity, but a minor detail in the supporting documents does not match. Leaving would forfeit an opportunity to identify a financier.

**Question:** How do you preserve your cover?

**Player options (all first-person):**

**A.** I redirect the conversation toward verifiable details in my cover story and keep the false claim narrow.

Developer intent: Keep a consistent identity instead of multiplying lies.
Candidate mechanical bias: `deceptionMastery`, `identityShift`; role `utility`.
Candidate ontology topics: `deception`, `social`.
Possible development (conditional): Spy: Incognito; actual Deception resolution remains separate.

**B.** I quietly identify the discrepancy and request a routine correction before the investigator escalates it.

Developer intent: Resolve through procedure rather than evasion.
Candidate mechanical bias: `persuasionMastery`, `resourcefulness`; role `utility`.
Candidate ontology topics: `persuasion`, `investigation`.
Possible development (conditional): General social capability; no official authority to change the list assumed.

**C.** I let another guest speak first and study the investigator’s questions before taking my turn.

Developer intent: Gather intelligence about the inspection process.
Candidate mechanical bias: `tacticalAwareness`, `informationControl`; role `scout`.
Candidate ontology topics: `awareness`, `recon`.
Possible development (conditional): Spy: Intimate Knowledge/Improved Surveillance are distinct legal directions.

**D.** I abandon the cover identity before it collapses and follow the financier through a less exposed route.

Developer intent: Prefer mission continuity to defending a compromised cover.
Candidate mechanical bias: `evasionTactics`, `stealthMastery`; role `scout`.
Candidate ontology topics: `stealth`, `exploration`.
Possible development (conditional): Spy: Blend In; no guaranteed shadowing success.

**E.** I turn the attention toward the actual guest list and compare the financier’s entry for inconsistencies.

Developer intent: Editorial goal is investigative counter-questioning.
Candidate mechanical bias: `knowledgeMastery`, `informationControl`; role `utility`.
Candidate ontology topics: `investigation`, `intrigue`.
Possible development (conditional): Use existing keys: informationControl and knowledgeMastery; no automatic counterintelligence talent.

**Mechanical teaching (developer only):** Incognito, Blend In, Intimate Knowledge and Six Questions describe different reconnaissance/social directions. Bothan SpyNet access and identity links are unresolved and cannot be assumed.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### IN-Q3-S03 — Six Missing Minutes

**Distinct focus:** Surveillance, intelligence networks and accurate targeting
**Default Q1 route IDs (6):** `BS01`, `BS04`, `BS05`, `BS06`, `SY02`, `SY06`
**Coverage domains:** Bothan SpyNet, Spy, Camouflage

**Delta (scene introduction):** “Everybody thinks the camera tells the truth. It tells you what it saw. Usually.”

**Situation:** A surveillance feed from a warehouse shows six unexplained minutes of black screen immediately before a shipment disappeared. The operator blames a power fault; witness statements conflict. A person you may need to confront is identified in the footage, but the evidence against them is incomplete.

**Question:** What do you do with the gap in the record?

**Player options (all first-person):**

**A.** I reconstruct the missing interval using maintenance logs and independent observations.

Developer intent: Corroborate evidence before drawing a conclusion.
Candidate mechanical bias: `informationControl`, `knowledgeMastery`; role `scout`.
Candidate ontology topics: `investigation`, `recon`.
Possible development (conditional): Spy: Surveillance/Improved Surveillance; technical access is separately checked.

**B.** I interview witnesses separately and test which details remain consistent between accounts.

Developer intent: Prioritize reliable testimony, not fast accusations.
Candidate mechanical bias: `informationControl`, `persuasionMastery`; role `utility`.
Candidate ontology topics: `investigation`, `social`.
Possible development (conditional): Bothan SpyNet: Six Questions is conditional; normal Gather Information has its own rules.

**C.** I follow the likely suspect discreetly and look for an observable connection to the shipment.

Developer intent: Seek direct evidence while preserving cover.
Candidate mechanical bias: `stealth`, `trackingMastery`; role `scout`.
Candidate ontology topics: `stealth`, `recon`.
Possible development (conditional): Spy/Camouflage: stealth and surveillance directions; no automatic tracking feat.

**D.** I send the partial findings to trusted analysts and ask them to find contradictions I missed.

Developer intent: Corroboration through cooperation; analysts are hypothetical scene actors.
Candidate mechanical bias: `networkInfluence`, `allySupport`; role `support`.
Candidate ontology topics: `teamwork`, `investigation`.
Possible development (conditional): Bothan SpyNet: Spynet Agent or resource talents require confirmed affiliation; this answer grants no network.

**E.** I map the suspect’s routines and prepare for a confrontation only after I understand their capabilities.

Developer intent: Prefer preparation and situational awareness before conflict.
Candidate mechanical bias: `tacticalAwareness`, `accuracy`; role `controller`.
Candidate ontology topics: `planning`, `targeting`.
Possible development (conditional): Bothan SpyNet: Knowledge Is Life/Power/Strength are restricted; no automatic combat benefit.

**Mechanical teaching (developer only):** Surveillance, Improved Surveillance and conditional Bothan SpyNet information talents can aid investigation; no SpyNet membership, special contacts or automatic target bonuses are presumed.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### IN-Q3-S04 — The Guard at the Beacon

**Distinct focus:** Ambush, nonlethal methods and alarm prevention
**Default Q1 route IDs (7):** `CA04`, `CA08`, `CA10`, `IT03`, `IT04`, `IT05`, `CF01`
**Coverage domains:** Camouflage, Infiltration, Unarmed Stun

**Delta (scene introduction):** “One guard, one alarm, one very short window. There are better plans than a loud one.”

**Situation:** A courier is trapped beyond a signal beacon in a fenced facility. One armed guard is approaching the manual alarm beside the exit. The guard has not noticed you, and the courier is unarmed. A silent route remains open if you can keep the beacon from being activated.

**Question:** How do you deal with the approaching guard?

**Player options (all first-person):**

**A.** I close from concealment and attempt to restrain the guard before they reach the beacon.

Developer intent: Favor control and access preservation over killing.
Candidate mechanical bias: `infiltrationMastery`, `grappling`; role `controller`.
Candidate ontology topics: `infiltration`, `grab`.
Possible development (conditional): Infiltration: Creeping Approach; actual grab/stealth actions follow normal rules.

**B.** I take a carefully prepared stun shot from cover, aiming to stop the alarm without a lethal wound.

Developer intent: Nonlethal ranged interception is a development direction.
Candidate mechanical bias: `accuracy`, `conditionTrack`; role `controller`.
Candidate ontology topics: `stun`, `targeting`.
Possible development (conditional): Infiltration: Set for Stun; stun rules and gear are not automatically granted.

**C.** I trigger a harmless distraction away from the beacon, then guide the courier toward the exit.

Developer intent: Misdirection that gives an ally a route.
Candidate mechanical bias: `deceptionMastery`, `allySupport`; role `support`.
Candidate ontology topics: `deception`, `teamwork`.
Possible development (conditional): Camouflage: Hidden Movement; no feat-specific distraction effect presumed.

**D.** I remain concealed and wait for the guard to pass before moving the courier out.

Developer intent: Reduce contact and avoid escalation.
Candidate mechanical bias: `stealthMastery`, `tacticalAwareness`; role `scout`.
Candidate ontology topics: `stealth`, `planning`.
Possible development (conditional): Camouflage: Improved Stealth or Hunker Down in their proper circumstances.

**E.** I position myself where I can disable the beacon manually if the guard moves toward it.

Developer intent: Prepare a contingency targeting equipment, not a person.
Candidate mechanical bias: `sabotageExpertise`, `rapidResponse`; role `utility`.
Candidate ontology topics: `tech`, `reaction`.
Possible development (conditional): Spy: Traceless Tampering may eventually support discreet changes; no free immediate sabotage.

**Mechanical teaching (developer only):** Set for Stun and Silent Takedown are talent directions; Unarmed Stun is a later-level class feature. No assumption the actor can silence a target automatically.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### IN-Q3-S05 — The Route That Changed

**Distinct focus:** Exfiltration, protecting partners and evidence integrity
**Default Q1 route IDs (8):** `CA02`, `CA03`, `CA07`, `BS03`, `IT02`, `SY03`, `CF02`, `NEUTRAL`
**Coverage domains:** Camouflage, Infiltration, Spy, Lead Infiltrator

**Delta (scene introduction):** “Entry was easy. Congratulations. Now the exit’s gone. That’s the job.”

**Situation:** You and two temporary partners have copied documents exposing a covert weapons shipment. Your arranged exit has been sealed, and security is searching adjacent corridors. One partner is injured and cannot move quickly; the other suggests abandoning the files to draw off pursuit.

**Question:** How do you get the team out?

**Player options (all first-person):**

**A.** I scout another route and guide both partners through it at the pace the injured one can sustain.

Developer intent: Protect the group while preserving stealth.
Candidate mechanical bias: `allySupport`, `stealthMastery`; role `support`.
Candidate ontology topics: `teamwork`, `infiltration`.
Possible development (conditional): Lead Infiltrator is a later-level option, not acquired now.

**B.** I hide the documents in a place we can recover later and concentrate on getting everyone clear.

Developer intent: Protect lives before immediate information delivery.
Candidate mechanical bias: `resourceControl`, `tacticalAwareness`; role `utility`.
Candidate ontology topics: `planning`, `stealth`.
Possible development (conditional): Spy: Traceless Tampering or concealment directions are conditional.

**C.** I create a false trail away from the injured partner and draw security toward an empty corridor.

Developer intent: Use misdirection and personal risk to open an exit.
Candidate mechanical bias: `deceptionMastery`, `evasionTactics`; role `scout`.
Candidate ontology topics: `deception`, `infiltration`.
Possible development (conditional): Spy: Blend In or Incognito; no guaranteed successful decoy.

**D.** I hold a covered position while the others move and intervene only if security discovers them.

Developer intent: Use defensive overwatch to make withdrawal possible.
Candidate mechanical bias: `reactionDefense`, `allySupport`; role `defender`.
Candidate ontology topics: `cover`, `teamwork`.
Possible development (conditional): Infiltration: Always Ready; action-readying remains RAW-governed.

**E.** I split the copied files into redundant records and coordinate two different escape paths.

Developer intent: Preserve information through redundancy and diversified movement.
Candidate mechanical bias: `informationControl`, `tacticalAwareness`; role `leader`.
Candidate ontology topics: `resources`, `tactics`.
Possible development (conditional): Spy intelligence direction; no network or duplicate device ownership assumed.

**Mechanical teaching (developer only):** Lead Infiltrator begins at class level 4; sharing a Stealth check cannot be assumed at entry. Scenario does not require the group to possess a specific talent.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

## Master Privateer — The Captain (`m11`)

**Mentor authority:** `data/dialogue/mentors/captain/captain_dialogue.json`

**Shared Mentor introduction (DRAFT):**

> Ah, a fine title, but the spacelanes won't salute it. The real test comes when prize, crew and conscience point in different directions. What would you do?

### MP-Q3-S01 — The Prize in the Crossfire

**Distinct focus:** Capturing rather than destroying a ship, pursuit and defensive options
**Default Q1 route IDs (6):** `PV07`, `PV08`, `SP02`, `SP03`, `CF02`, `ID01`
**Coverage domains:** Privateer, Spacer, Veteran Privateer

**The Captain (scene introduction):** “There she is—a lovely prize with the bad manners to keep moving. Don't spoil her before we count the profit.”

**Situation:** A cargo vessel suspected of carrying stolen relief supplies attempts to escape a lawful interception. Its engines are exposed for a moment, but a direct strike risks rupturing a compartment where noncombatants may be working. Your available vessel is not guaranteed to have an ion weapon or boarding party.

**Question:** What is your opening decision?

**Player options (all first-person):**

**A.** I aim to disable propulsion rather than destroy the cargo vessel, even if it costs me the easy attack.

Developer intent: Prefer target-specific disabling over maximum destruction.
Candidate mechanical bias: `accuracy`, `vehicularDamage`; role `controller`.
Candidate ontology topics: `vehicle`, `targeting`.
Possible development (conditional): Privateer: Preserving Shot or Ion Mastery, with exact weapon and talent requirements.

**B.** I maneuver to cut off its escape route and make surrender the safer choice.

Developer intent: Use positioning and containment rather than a damaging shot.
Candidate mechanical bias: `pilotMastery`, `tacticalAwareness`; role `controller`.
Candidate ontology topics: `pursuit`, `vehicle`.
Possible development (conditional): Spacer or vehicle piloting rules; no automatic blockade or dogfight immunity.

**C.** I hail the other vessel and present the evidence and terms of a peaceful inspection.

Developer intent: Negotiate compliance without claiming a personal command.
Candidate mechanical bias: `persuasionMastery`, `commandAuthority`; role `utility`.
Candidate ontology topics: `social`, `leadership`.
Possible development (conditional): Infamy: Notorious or Master Manipulator are conditional; no free official authority.

**D.** I protect the suspected civilian compartment by holding fire while I verify the ship layout.

Developer intent: Seek evidence and preserve lives despite time pressure.
Candidate mechanical bias: `informationControl`, `allySupport`; role `support`.
Candidate ontology topics: `recon`, `sensors`.
Possible development (conditional): General sensor checks when the ship can perform them; class does not grant sensor hardware.

**E.** I keep the target in range while preparing a controlled boarding opportunity rather than gambling on a single shot.

Developer intent: Prepare capture using timing and future close-quarter capability.
Candidate mechanical bias: `spacefarerMastery`, `tacticalAwareness`; role `scout`.
Candidate ontology topics: `vehicle`, `planning`.
Possible development (conditional): Privateer: Boarder and Spacer shipboard talents are possible directions, not automatic grants.

**Mechanical teaching (developer only):** Preserving Shot, Ion Mastery, Veteran Privateer and Spacer piloting are distinct conditional development routes; do not invent a ship, crew or commission as permanent actor assets.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### MP-Q3-S02 — The Narrow Boarding Lock

**Distinct focus:** Shipboard close quarters, mixed weapons and defensive leadership
**Default Q1 route IDs (10):** `SP01`, `SP04`, `SP05`, `SP06`, `PV01`, `PV02`, `PV03`, `PV04`, `PV06`, `PV09`
**Coverage domains:** Spacer, Privateer

**The Captain (scene introduction):** “A corridor just wide enough for bad decisions. Classic boarding weather.”

**Situation:** A disabled courier craft has one functioning pressure lock. Inside are sealed cargo cases, an automated door and two nervous defenders who have not fired. Any boarding party would be exposed in the narrow airlock, and damaging the controls could leave everyone trapped.

**Question:** How do you approach the lock?

**Player options (all first-person):**

**A.** I use the lock geometry as cover and advance only after I know where the defenders can shoot.

Developer intent: Tactical spacing and personal defense in cramped terrain.
Candidate mechanical bias: `tacticalAwareness`, `reactionDefense`; role `defender`.
Candidate ontology topics: `cover`, `positioning`.
Possible development (conditional): Privateer: Boarder; Spacer: Cramped Quarters Fighting, with exact printed conditions.

**B.** I tell the defenders I want the cargo, not their lives, and offer them a route to stand down.

Developer intent: Negotiated de-escalation with a credible but not guaranteed offer.
Candidate mechanical bias: `persuasionMastery`, `intimidation`; role `utility`.
Candidate ontology topics: `social`, `nonlethal`.
Possible development (conditional): Infamy: Notorious is conditional; no automatic surrender effect.

**C.** I move first to secure the control panel before anyone accidentally cycles the lock.

Developer intent: Prioritize safe control of dangerous infrastructure.
Candidate mechanical bias: `mechanicalMastery`, `rapidResponse`; role `utility`.
Candidate ontology topics: `tech`, `planning`.
Possible development (conditional): General Mechanics if qualified; privateer has no automatic panel-bypass talent.

**D.** I keep my pistol ready while using a close weapon to protect the approach, changing range as the corridor demands.

Developer intent: Favor adaptable mixed-weapon close combat.
Candidate mechanical bias: `weaponVersatility`, `meleeDamage`; role `skirmisher`.
Candidate ontology topics: `melee`, `pistol`.
Possible development (conditional): Privateer: Blaster and Blade I–III, conditional on equipment and prerequisites.

**E.** I arrange a deliberate covering advance so nobody enters alone and exposed.

Developer intent: Use coordinated movement and risk sharing.
Candidate mechanical bias: `formation`, `allySupport`; role `leader`.
Candidate ontology topics: `teamwork`, `cover`.
Possible development (conditional): Spacer/Privateer themes do not grant followers or a crew; scene allies exist only in this hypothetical.

**Mechanical teaching (developer only):** Starship Raider, Cramped Quarters Fighting, Boarder, Armored Spacer and Blaster and Blade talents are individually gated. No unverified boarding party or melee/pistol equipment.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### MP-Q3-S03 — The Contract with Two Prices

**Distinct focus:** Reputation, sponsors, bargaining and political consequences
**Default Q1 route IDs (6):** `IF01`, `IF05`, `IF10`, `IF11`, `PV05`, `IF06`
**Coverage domains:** Infamy, Privateer, Piracy

**The Captain (scene introduction):** “My favorite kind of cargo: a contract with a hidden compartment.”

**Situation:** A port representative offers a privateer commission against smugglers operating near relief convoys. A second representative offers more credits for the same captured ships, but refuses to identify who will receive the cargo. Both offers are plausible; neither has yet supplied signed authority or evidence that the targets are legitimate prizes.

**Question:** How do you judge the offers?

**Player options (all first-person):**

**A.** I demand written authority and a clear list of lawful targets before accepting either payment.

Developer intent: Prefer verifiable scope and sponsor accountability.
Candidate mechanical bias: `informationControl`, `businessAcumen`; role `utility`.
Candidate ontology topics: `investigation`, `resources`.
Possible development (conditional): Privateer role context and normal negotiations; no automatic institutional commission.

**B.** I negotiate harder on the transparent offer, using uncertainty to secure protection for my people.

Developer intent: Use leverage to improve terms and reduce expedition risk.
Candidate mechanical bias: `persuasionMastery`, `resourceControl`; role `leader`.
Candidate ontology topics: `social`, `resources`.
Possible development (conditional): Infamy: Master Manipulator or Small Favor, subject to prerequisites.

**C.** I investigate the larger payer and trace who would ultimately profit from the seizures.

Developer intent: Seek hidden interests before committing.
Candidate mechanical bias: `networkInfluence`, `informationControl`; role `scout`.
Candidate ontology topics: `investigation`, `social_network`.
Possible development (conditional): Infamy: Small Favor/contacts are optional future paths, not already owned.

**D.** I refuse both contracts until I can establish whether the supposed smugglers are actually transporting relief supplies.

Developer intent: Put target verification before raids.
Candidate mechanical bias: `tacticalAwareness`, `knowledgeMastery`; role `scout`.
Candidate ontology topics: `investigation`, `planning`.
Possible development (conditional): No automatic Perception or Gather Information results; verified assets only.

**E.** I accept a small, limited trial under the clearer contract and build a reputation from how I handle it.

Developer intent: Make a bounded commitment to gather operational evidence.
Candidate mechanical bias: `businessAcumen`, `adaptability`; role `flex`.
Candidate ontology topics: `resources`, `leadership`.
Possible development (conditional): Privateer reputation themes; acceptance itself creates no future item, income or commission.

**Mechanical teaching (developer only):** A privateer's authorization and sponsor must be real where required; reputation and infamy talents do not grant legal title, a ship, or a guaranteed support network.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### MP-Q3-S04 — The Crew at the Threshold

**Distinct focus:** Crew cohesion, fear, protective timing and authority without ownership
**Default Q1 route IDs (7):** `IF02`, `IF03`, `IF04`, `IF07`, `IF08`, `IF09`, `PY05`
**Coverage domains:** Infamy, Piracy, Privateer

**The Captain (scene introduction):** “A captain can win a fight and lose every soul aboard. Poor exchange rate.”

**Situation:** During a hypothetical joint raid, a team of volunteer crew members becomes trapped between a security sweep and a damaged pressure door. One voice calls for immediate withdrawal; another wants to force the door and keep the prize. You are coordinating the moment, but the crew members have not agreed to follow an unconditional order.

**Question:** What do you ask the team to do?

**Player options (all first-person):**

**A.** I call for an organized withdrawal while the door can still be bypassed safely.

Developer intent: Prioritize cohesion and safe extraction over the prize.
Candidate mechanical bias: `formation`, `allySupport`; role `leader`.
Candidate ontology topics: `teamwork`, `planning`.
Possible development (conditional): Privateer leadership and Spacer withdrawal directions, each conditional.

**B.** I take the exposed position myself and cover the volunteers while they move.

Developer intent: Lead by assuming risk instead of commanding others into it.
Candidate mechanical bias: `reactionDefense`, `allySupport`; role `defender`.
Candidate ontology topics: `cover`, `ally_support`.
Possible development (conditional): Armor and combat development possible; no damage-interception talent implied.

**C.** I let the two voices explain their risks, then present a short plan with clear stop conditions.

Developer intent: Resolve disagreement through operational clarity.
Candidate mechanical bias: `commandAuthority`, `tacticalAwareness`; role `leader`.
Candidate ontology topics: `leadership`, `tactics`.
Possible development (conditional): Infamy/Privateer leadership themes; no automatic morale bonus.

**D.** I use my reputation to convince the defenders that their own retreat is better than fighting us.

Developer intent: Attempt credible deterrence to reduce fighting.
Candidate mechanical bias: `intimidation`, `moraleImpact`; role `controller`.
Candidate ontology topics: `fear`, `social`.
Possible development (conditional): Infamy: Inspire Fear/Notorious conditions apply; no guaranteed mind-affecting result.

**E.** I direct a coordinated push to open the door, but only after everyone agrees on a fallback route.

Developer intent: Calculated teamwork with an exit plan.
Candidate mechanical bias: `commandoTactics`, `allySupport`; role `leader`.
Candidate ontology topics: `teamwork`, `positioning`.
Possible development (conditional): Piracy: Fight to the Death or Raider talents are separate choices; no assumed action grants.

**Mechanical teaching (developer only):** Attract Privateer, Infamy influence and Piracy raider talents represent different eligible paths; none gives the actor an existing crew, authority to compel, or permission to harm civilians.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### MP-Q3-S05 — The Refugee Hold

**Distinct focus:** Freedom, prize handling and responsibility on a dangerous route
**Default Q1 route IDs (10):** `SP07`, `PY01`, `PY02`, `PY03`, `PY04`, `PY06`, `PY07`, `CF01`, `ID02`, `NEUTRAL`
**Coverage domains:** Spacer, Piracy, Privateer, Identity

**The Captain (scene introduction):** “A full hold and a short clock. Now we find out what your legend is worth.”

**Situation:** A captured freighter carries valuable contraband alongside a locked compartment of displaced passengers. Its damaged drive can reach either a nearby safe port or an isolated rendezvous where a buyer will pay a fortune. The freighter's log is incomplete; the people aboard demand immediate safety.

**Question:** Where do you take the freighter?

**Player options (all first-person):**

**A.** I steer toward the safe port and put the passengers ashore before deciding anything about the cargo.

Developer intent: Protect passengers while separating welfare from prize value.
Candidate mechanical bias: `pilotMastery`, `allySupport`; role `support`.
Candidate ontology topics: `vehicle`, `ally_support`.
Possible development (conditional): Spacer vehicle operation and Privateer preserving-prize direction; no owned freighter inferred.

**B.** I stabilize the damaged drive and take the safest navigable course, even if the valuable cargo loses value.

Developer intent: Evaluate repair and navigation before financial reward.
Candidate mechanical bias: `mechanicalMastery`, `spacefarerMastery`; role `utility`.
Candidate ontology topics: `repair`, `space`.
Possible development (conditional): Spacer shipboard competence; Hyperdriven scales with Scoundrel class level, not Privateer level.

**C.** I contact independent port officials and seek inspection terms that protect both passengers and rightful owners.

Developer intent: Use transparent third-party process to resolve contested cargo.
Candidate mechanical bias: `persuasionMastery`, `informationControl`; role `utility`.
Candidate ontology topics: `social`, `investigation`.
Possible development (conditional): Privateer authorization requirements remain; no automatic lawful ownership.

**D.** I learn who placed the passengers in that hold and trace the shipment before delivering any prize.

Developer intent: Seek the underlying operation, not just the visible cargo.
Candidate mechanical bias: `informationControl`, `networkInfluence`; role `scout`.
Candidate ontology topics: `investigation`, `network`.
Possible development (conditional): Infamy: Small Favor or contacts require individual entitlement.

**E.** I arrange an escort to keep the passengers secure while the cargo is inventoried and the ship stabilized.

Developer intent: Coordinate protection and logistics without moral scoring.
Candidate mechanical bias: `formation`, `resourceControl`; role `leader`.
Candidate ontology topics: `teamwork`, `resources`.
Possible development (conditional): Piracy: Take Them Alive or ally support themes are future talent options, not general grants.

**Mechanical teaching (developer only):** Take Them Alive and shipboard survival/raiding are possible future directions, but cargo seizure and humanitarian concern do not automatically prove lawful authority or moral alignment.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

## Medic — Kyber (`m18`)

**Mentor authority:** `data/dialogue/mentors/kyber/kyber_dialogue.json`

**Shared Mentor introduction (DRAFT):**

> Right. Five cases. None of them neat, and none of them fixed by sounding heroic. I want to know what you actually do when the medical kit is open and time is running out.

### ME-Q3-S01 — Three Patients, One Minute

**Distinct focus:** Triage, rapid first aid and coordinating helpers
**Default Q1 route IDs (7):** `SV03`, `AM03`, `AM06`, `CF01`, `CF03`, `CF06`, `ID01`
**Coverage domains:** Survivor, Advanced Medicine, Medical Secrets

**Kyber (scene introduction):** “Three patients. One set of hands. A terrible staffing model. Work with what we have.”

**Situation:** An accident at a transit platform injures three people. One is losing blood, one is awake but struggling to breathe, and a third has an injured leg and is near an unstable gantry. Two untrained bystanders are willing to help; the nearest clinic is several minutes away.

**Question:** Where do you begin?

**Player options (all first-person):**

**A.** I assess immediate threats to life and treat the person whose condition will worsen fastest without intervention.

Developer intent: Prioritize time-sensitive clinical triage rather than responder prestige.
Candidate mechanical bias: `treatingInjury`, `medicalKnowledge`; role `support`.
Candidate ontology topics: `treat_injury`, `medical`.
Possible development (conditional): Advanced Medicine: Battlefield Medic; Medical Secrets require later acquisition.

**B.** I assign the bystanders simple safe tasks so I can treat the most critical patient without losing track of the others.

Developer intent: Coordinate additional hands under actual supervision.
Candidate mechanical bias: `allySupport`, `tacticalSupport`; role `leader`.
Candidate ontology topics: `teamwork`, `medical`.
Possible development (conditional): Advanced Medicine: Emergency Team; no free proficiency is conferred on bystanders.

**C.** I move the person beneath the gantry into a safe position before beginning detailed treatment.

Developer intent: Recognize environmental danger as part of patient care.
Candidate mechanical bias: `rapidResponse`, `allySupport`; role `support`.
Candidate ontology topics: `movement`, `medical`.
Possible development (conditional): Survivor: Sprint/Surefooted and regular movement rules; no automatically granted carrying feat.

**D.** I start with the breathing emergency and keep the other two informed while I work.

Developer intent: Prioritize airway and communication under time pressure.
Candidate mechanical bias: `treatingInjury`, `rapidResponse`; role `support`.
Candidate ontology topics: `medical`, `awareness`.
Possible development (conditional): Advanced Medicine: Battlefield Medic/Extra First Aid, all conditional.

**E.** I use the first moments to call for professional backup and set up a clear transfer plan for all three.

Developer intent: Organize transport and clinical handoff before resources arrive.
Candidate mechanical bias: `resourceControl`, `allySupport`; role `leader`.
Candidate ontology topics: `resources`, `teamwork`.
Possible development (conditional): Medic career theme; no automatic ambulance or guaranteed rescue response.

**Mechanical teaching (developer only):** Battlefield Medic, Emergency Team and Improved First Aid / Long-Term Care are separate development directions. Medical Secrets begin at Medic class level 2, not entry.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### ME-Q3-S02 — The Operating Table

**Distinct focus:** Urgent surgery, critical decisions and treatment reliability
**Default Q1 route IDs (6):** `AM04`, `AM05`, `AM08`, `CF02`, `CF04`, `CF05`
**Coverage domains:** Advanced Medicine, Medical Secrets

**Kyber (scene introduction):** “An operation doesn't care how impressive your title sounds. Timing and clean decisions matter.”

**Situation:** A patient with a severe internal injury arrives at a makeshift surgical room. The local team can stabilize them briefly, but transport to a full hospital will be delayed. A surgical attempt now carries risk; waiting may make the injury worse. You have access to an appropriate basic surgical setup, not specialized future Medic abilities.

**Question:** What is your next decision?

**Player options (all first-person):**

**A.** I review the available clinical findings and decide whether the patient can be stabilized safely for transport.

Developer intent: Make the risk assessment before choosing an invasive procedure.
Candidate mechanical bias: `medicalKnowledge`, `treatingInjury`; role `support`.
Candidate ontology topics: `medical`, `investigation`.
Possible development (conditional): Advanced Medicine: Second Chance; ordinary Treat Injury processes apply.

**B.** I prepare for surgery now, allocating time to the intervention that can actually reverse the injury.

Developer intent: Prioritize decisive treatment when delay is dangerous.
Candidate mechanical bias: `surgicalMastery`, `rapidResponse`; role `support`.
Candidate ontology topics: `medical`, `medicine`.
Possible development (conditional): Medical Secret: Improved Perform Surgery is available only at later class levels.

**C.** I bring the available medical team into a clear supporting plan before any incision.

Developer intent: Reduce procedural error through coordination.
Candidate mechanical bias: `allySupport`, `surgicalMastery`; role `leader`.
Candidate ontology topics: `teamwork`, `medicine`.
Possible development (conditional): Advanced Medicine: Emergency Team if selected; assistance rules must be resolved.

**D.** I focus on the treatment steps most likely to prevent a failed attempt from worsening the patient.

Developer intent: Favor treatment reliability and risk reduction.
Candidate mechanical bias: `treatmentExpertise`, `medicalKnowledge`; role `support`.
Candidate ontology topics: `medical`, `reliability`.
Possible development (conditional): Advanced Medicine: Second Chance or Steady Under Pressure, with individual conditions.

**E.** I ask the patient, if conscious and capable, about the risks they are willing to accept before proceeding.

Developer intent: Respect informed patient preference without assuming cooperation.
Candidate mechanical bias: `persuasionMastery`, `healingMastery`; role `utility`.
Candidate ontology topics: `social`, `medical`.
Possible development (conditional): General treatment judgment; no automatic Persuasion training or restorative bonus.

**Mechanical teaching (developer only):** Bring Them Back, Second Chance and Steady Under Pressure have different mechanical effects. Improved surgery-related Medical Secrets are even-level development options, not prerequisites automatically met.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### ME-Q3-S03 — No Clinic for a Day

**Distinct focus:** Improvised care, scarce supplies and self-preservation
**Default Q1 route IDs (4):** `AM01`, `SV02`, `SV04`, `CF07`
**Coverage domains:** Survivor, Advanced Medicine, Medical Secrets

**Kyber (scene introduction):** “Excellent. Improvised clinic, questionable lighting, and half a medpac. This should be educational.”

**Situation:** A remote settlement has suffered a water-purification failure. Several residents are ill, but the supply shuttle is grounded until the next day. You have ordinary medical supplies and access to local plants whose safety has not been established. The only clean treatment room must also serve as an isolation space.

**Question:** How do you organize care?

**Player options (all first-person):**

**A.** I first identify the illness and isolate potential contamination before using any unfamiliar remedies.

Developer intent: Diagnose and limit exposure before experimenting.
Candidate mechanical bias: `medicalKnowledge`, `informationControl`; role `scout`.
Candidate ontology topics: `medical`, `investigation`.
Possible development (conditional): Advanced Medicine: Natural Healing only allows appropriate substitutes under its exact rules.

**B.** I reserve the clean room for the highest-risk patients and set up safe care areas for the others.

Developer intent: Allocate scarce clinical space through triage.
Candidate mechanical bias: `resourceControl`, `treatingInjury`; role `support`.
Candidate ontology topics: `resources`, `medical`.
Possible development (conditional): Medical Secrets: Improved Treatment/Long-Term Care are later choices.

**C.** I ask local residents to help gather familiar supplies while I check what can be used safely.

Developer intent: Combine local knowledge with safety verification.
Candidate mechanical bias: `allySupport`, `resourcefulness`; role `support`.
Candidate ontology topics: `teamwork`, `medical`.
Possible development (conditional): Advanced Medicine: Natural Healing, not guaranteed efficacy.

**D.** I prepare a mobile treatment station so I can reach patients who cannot be brought to the clinic.

Developer intent: Adapt access to patients rather than relying on one room.
Candidate mechanical bias: `survivalism`, `rapidResponse`; role `utility`.
Candidate ontology topics: `survival`, `medical`.
Possible development (conditional): Survivor: Surefooted/Sprint may be future options; training and terrain still matter.

**E.** I establish a rotation that includes rest and self-care so I do not become the next patient.

Developer intent: Protect the care provider to sustain the response.
Candidate mechanical bias: `treatmentExpertise`, `resourceControl`; role `support`.
Candidate ontology topics: `recovery`, `resources`.
Possible development (conditional): Medical Secret: Personal Physician is later-level and selection-dependent.

**Mechanical teaching (developer only):** Natural Healing is a conditional medical talent, not license to treat with any plant. Personal Physician is a later Medical Secret; no automatic self-treatment bonus.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### ME-Q3-S04 — Under Fire, Under Cover

**Distinct focus:** Rescue under threat, medical support and risk control
**Default Q1 route IDs (2):** `SV01`, `AM07`
**Coverage domains:** Survivor, Advanced Medicine, Medical Secrets

**Kyber (scene introduction):** “Patients have terrible timing. So do people shooting at them. Pick the problem you can fix first.”

**Situation:** A wounded civilian is trapped near the entrance to a warehouse as hostile fire crosses an open yard. The civilian is conscious but cannot stand. A nearby security barrier offers cover, and another rescuer can attempt a diversion. Moving now is risky; waiting could worsen the injury.

**Question:** How do you reach the patient?

**Player options (all first-person):**

**A.** I coordinate a diversion with the other rescuer and cross only when the firing lane changes.

Developer intent: Use coordinated timing to avoid unnecessary danger.
Candidate mechanical bias: `tacticalAwareness`, `allySupport`; role `support`.
Candidate ontology topics: `teamwork`, `cover`.
Possible development (conditional): Survivor: Evasion or Sprint are conditional and do not guarantee cover.

**B.** I find the safest covered route to the civilian, even if it takes longer than a straight sprint.

Developer intent: Reduce exposure rather than outrun all incoming fire.
Candidate mechanical bias: `evasion`, `tacticalAwareness`; role `scout`.
Candidate ontology topics: `evasion`, `positioning`.
Possible development (conditional): Survivor: Evasion/Surefooted, with exact area and terrain restrictions.

**C.** I call out precise stabilization instructions the patient can follow until I can reach them.

Developer intent: Use communication to provide aid before physical contact.
Candidate mechanical bias: `medicalKnowledge`, `allySupport`; role `support`.
Candidate ontology topics: `medical`, `social`.
Possible development (conditional): General medical coaching; Medical Miracle does not grant distant healing.

**D.** I move to the barrier first, set up basic cover, and prepare to carry the civilian out.

Developer intent: Plan protective access and evacuation.
Candidate mechanical bias: `rapidResponse`, `treatingInjury`; role `support`.
Candidate ontology topics: `movement`, `medical`.
Possible development (conditional): Survivor movement skills and Advanced Medicine support, subject to actual checks.

**E.** I focus on securing the area with the other rescuer so a rescue attempt does not create another casualty.

Developer intent: Prioritize scene safety before treatment.
Candidate mechanical bias: `tacticalSupport`, `allySupport`; role `defender`.
Candidate ontology topics: `defense`, `teamwork`.
Possible development (conditional): No automatic suppression talent, military command or combat proficiency assumed.

**Mechanical teaching (developer only):** Evasion, Sprint, Surefooted and Medical Miracle can support different future approaches; no miraculous on-demand healing or physical immunity.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### ME-Q3-S05 — The Patient Who Returns

**Distinct focus:** Repeated treatment, long-term recovery and care priorities
**Default Q1 route IDs (3):** `AM02`, `ID02`, `NEUTRAL`
**Coverage domains:** Advanced Medicine, Medical Secrets, Identity

**Kyber (scene introduction):** “Saving somebody today is good. Keeping them alive next week? Annoyingly, that takes more work.”

**Situation:** A recovering patient returns to a field clinic after an earlier injury flares up. The clinic also has several first-time patients needing basic care. You have limited treatment supplies and room, and the returning patient wants a risky quick fix so they can leave immediately.

**Question:** What do you prioritize?

**Player options (all first-person):**

**A.** I re-evaluate the returning patient before repeating treatment that may no longer be appropriate.

Developer intent: Treat the current condition rather than follow a familiar routine.
Candidate mechanical bias: `treatingInjury`, `medicalKnowledge`; role `support`.
Candidate ontology topics: `treat_injury`, `investigation`.
Possible development (conditional): Advanced Medicine: Extra First Aid and Second Chance are conditional.

**B.** I design a longer recovery plan and explain why the quick fix may put the patient at greater risk.

Developer intent: Prioritize sustainable recovery and informed choice.
Candidate mechanical bias: `treatmentExpertise`, `persuasionMastery`; role `support`.
Candidate ontology topics: `recovery`, `medical`.
Possible development (conditional): Medical Secret: Improved Long-Term Care is available at later Medic levels.

**C.** I triage the whole clinic and schedule the returning patient without abandoning the new arrivals.

Developer intent: Balance multiple people's needs under scarcity.
Candidate mechanical bias: `resourceControl`, `allySupport`; role `leader`.
Candidate ontology topics: `resources`, `teamwork`.
Possible development (conditional): Advanced Medicine: Emergency Team if legally selected; no administrative rank assumed.

**D.** I explore whether the recurring injury has a preventable underlying cause before deciding on treatment.

Developer intent: Prefer diagnosis and prevention to repeated intervention.
Candidate mechanical bias: `medicalKnowledge`, `knowledgeMastery`; role `scout`.
Candidate ontology topics: `medical`, `investigation`.
Possible development (conditional): General Treat Injury and Knowledge (life sciences), no auto diagnosis.

**E.** I prepare a focused additional first-aid intervention if the patient needs it and the rules permit it.

Developer intent: Express interest in carefully repeatable medical aid.
Candidate mechanical bias: `healingMastery`, `treatingInjury`; role `support`.
Candidate ontology topics: `healing`, `treat_injury`.
Possible development (conditional): Advanced Medicine: Extra First Aid; daily and timing limits remain.

**Mechanical teaching (developer only):** Extra First Aid and Improved Long-Term Care are distinct paths, and Medical Secrets are later-level selections. No patient outcome or legal obligation is automatically determined by Q3.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

## Saboteur — Spark (`m27`)

**Mentor authority:** `data/dialogue/mentors/spark/spark_dialogue.json`

**Shared Mentor introduction (DRAFT):**

> Sabotage is an equation with a lot of people standing near the answer. Five situations, five ways to be clever. Let's see what you break—and what you leave standing.

### SB-Q3-S01 — The Wrong Support Beam

**Distinct focus:** Precision demolition, blast control and site safety
**Default Q1 route IDs (5):** `SB02`, `SB05`, `SB06`, `CF02`, `ID01`
**Coverage domains:** Sabotage, Misfortune, Destructive

**Spark (scene introduction):** “I love a clean failure point. But the wrong one? That is a very expensive lesson.”

**Situation:** A fortified transmission tower is directing hostile drones toward a settlement. The tower stands beside a civilian power substation, and both share an older support platform. A collapse could stop the signal but would likely damage the substation. The mission objective is to interrupt transmissions, not destroy the whole site.

**Question:** How do you disable the tower?

**Player options (all first-person):**

**A.** I look for a small, isolated failure point that disables the transmitter without collapsing the support platform.

Developer intent: Target functional failure while limiting collateral effects.
Candidate mechanical bias: `sabotageExpertise`, `tacticalAwareness`; role `controller`.
Candidate ontology topics: `tech`, `control`.
Possible development (conditional): Sabotage: Shaped Explosion or Skilled Demolitionist, subject to printed rules.

**B.** I use the access controls to shut down the signal rather than placing any explosive charge.

Developer intent: Choose electronic interruption over physical damage.
Candidate mechanical bias: `hackingSkills`, `technicalMastery`; role `utility`.
Candidate ontology topics: `slicing`, `tech`.
Possible development (conditional): Slicer: Security Slicer or Electronic Sabotage; no guaranteed access.

**C.** I wait until nearby workers clear the area before attempting to disable the tower.

Developer intent: Sequence the job around predictable safety constraints.
Candidate mechanical bias: `tacticalAwareness`, `allySupport`; role `support`.
Candidate ontology topics: `planning`, `ally_support`.
Possible development (conditional): Sabotage: printed demolition talents; no automatic evacuation authority.

**D.** I set a contingency that disables the signal only if the tower starts directing another drone attack.

Developer intent: Prefer bounded timing and triggered objectives, not generic damage.
Candidate mechanical bias: `improvisation`, `informationControl`; role `controller`.
Candidate ontology topics: `planning`, `tech`.
Possible development (conditional): Class Quick Sabotage arrives at later levels; no free remote detonator or timed action granted.

**E.** I gather more structural information before choosing a method, even if the delay risks losing the opportunity.

Developer intent: Prioritize correct system understanding before acting.
Candidate mechanical bias: `engineeringMastery`, `knowledgeMastery`; role `scout`.
Candidate ontology topics: `investigation`, `science`.
Possible development (conditional): Mechanics and technical knowledge are actor-state-dependent; no assumed perfect map.

**Mechanical teaching (developer only):** Shaped Explosion and Skilled Demolitionist are selectable talent directions, not presumed blast-shaping access; Destructive is a later class feature. Avoid numeric explosive instructions or real-world construction detail.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### SB-Q3-S02 — The Network That Lies

**Distinct focus:** Slicing, forged credentials and information integrity
**Default Q1 route IDs (8):** `SL01`, `SL02`, `SL03`, `SL04`, `SL05`, `SL06`, `SL07`, `MF14`
**Coverage domains:** Slicer, Misfortune

**Spark (scene introduction):** “Systems are honest right up until somebody programs them not to be. That's where the fun starts.”

**Situation:** A logistics network is forwarding location data to an adversary. A legitimate technician account can access a maintenance console, but the network logs also contain emergency medical dispatch records. Disabling the whole system would hide the convoy routes and interrupt aid. The operator requests a targeted solution.

**Question:** What do you change?

**Player options (all first-person):**

**A.** I isolate the suspicious forwarding function while keeping the medical dispatch service running.

Developer intent: Separate malicious traffic from essential operations.
Candidate mechanical bias: `hackingSkills`, `sabotageExpertise`; role `controller`.
Candidate ontology topics: `slicing`, `tech`.
Possible development (conditional): Slicer: Electronic Sabotage, Security Slicer; all checks and system access remain gated.

**B.** I examine the transmission records to identify where the information is being sent.

Developer intent: Gather attribution evidence before changing anything.
Candidate mechanical bias: `informationControl`, `hackingSkills`; role `scout`.
Candidate ontology topics: `investigation`, `slicing`.
Possible development (conditional): Slicer: Trace; no guaranteed remote access or detection result.

**C.** I create a plausible decoy route in the feed so the real convoy can continue unseen.

Developer intent: Favor misdirection over shutting down public infrastructure.
Candidate mechanical bias: `deceptionMastery`, `technicalMastery`; role `utility`.
Candidate ontology topics: `deception`, `slicing`.
Possible development (conditional): Slicer: Electronic Forgery; false records are not automatically successful or lawful.

**D.** I preserve an untouched log of the transmissions and report the suspected compromise before modifying the system.

Developer intent: Preserve evidence and coordinate oversight.
Candidate mechanical bias: `informationControl`, `resourceControl`; role `scout`.
Candidate ontology topics: `investigation`, `tech`.
Possible development (conditional): General technical/investigation directions; no special legal status.

**E.** I seek authorization for a narrow, reversible intervention that can be tested without interrupting medical records.

Developer intent: Favor reversible experiments and controlled side effects.
Candidate mechanical bias: `tacticalAwareness`, `resourcefulness`; role `utility`.
Candidate ontology topics: `planning`, `tech`.
Possible development (conditional): Slicer: Gimmick or Master Slicer if qualified; no free guaranteed exploit or script.

**Mechanical teaching (developer only):** Electronic Forgery, Trace, Virus, Electronic Sabotage, Gimmick and Security Slicer are distinct technical ambitions; do not treat the scenario as a code-execution or exploit recipe.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### SB-Q3-S03 — The Temporary Perimeter

**Distinct focus:** Deployable defenses, turret choice and restraint
**Default Q1 route IDs (6):** `TU01`, `TU02`, `TU03`, `TU04`, `TU05`, `TU06`
**Coverage domains:** Turret, Sabotage

**Spark (scene introduction):** “Turret problems are wonderful. The important question is what you want the turret to stop.”

**Situation:** A workshop preparing emergency repairs expects hostile droids to approach through two entrances. Engineers must keep moving between rooms, and a fixed automated turret could accidentally block their escape. You have time to plan a defensive emplacement, but no turret is assumed already built.

**Question:** What defensive plan do you prefer?

**Player options (all first-person):**

**A.** I plan a turret position where it can cover the hostile approach without firing into the engineers’ escape route.

Developer intent: Optimize coverage and safe firing angles.
Candidate mechanical bias: `engineeringMastery`, `tacticalAwareness`; role `defender`.
Candidate ontology topics: `positioning`, `tactics`.
Possible development (conditional): Turret: Blaster Turret I–III; printed creation, placement and attack limits govern.

**B.** I favor ion defenses designed to interfere with the attacking droids rather than damage the whole workshop.

Developer intent: Select technology suited to mechanical threats.
Candidate mechanical bias: `droidControl`, `technicalMastery`; role `controller`.
Candidate ontology topics: `ion`, `droid`.
Possible development (conditional): Turret: Ion Turret, separate from ordinary blaster or stun turret rules.

**C.** I set out to develop a nonlethal turret that can stop intruders without causing lasting injury.

Developer intent: Prefer incapacitation and protection of bystanders.
Candidate mechanical bias: `technicalMastery`, `allySupport`; role `support`.
Candidate ontology topics: `stun`, `tech`.
Possible development (conditional): Turret: Stun Turret; no automatic nonlethal result or free turret.

**D.** I place observers at both entrances and use their reports to decide whether any automated weapon is needed.

Developer intent: Prioritize threat confirmation before deployment.
Candidate mechanical bias: `tacticalAwareness`, `informationControl`; role `scout`.
Candidate ontology topics: `recon`, `teamwork`.
Possible development (conditional): General observation and teamwork; turret creation remains a later, separate talent decision.

**E.** I plan for a damaged turret to be disabled and removed safely, rather than leave a weapon system uncontrolled.

Developer intent: Control the hazard created by the defensive device itself.
Candidate mechanical bias: `sabotageExpertise`, `resourceControl`; role `utility`.
Candidate ontology topics: `equipment`, `tech`.
Possible development (conditional): Turret: Turret Self-Destruct has specific conditions; do not assume silent or risk-free removal.

**Mechanical teaching (developer only):** Blaster Turret I–III, Stun Turret, Ion Turret and Turret Self-Destruct are different selected talent directions; this question does not build or grant a turret.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### SB-Q3-S04 — The Guarded Relay

**Distinct focus:** Covert disruption, timing and minimizing exposure
**Default Q1 route IDs (10):** `MF01`, `MF02`, `MF04`, `MF07`, `MF10`, `MF11`, `MF12`, `MF15`, `MF16`, `CF03`
**Coverage domains:** Misfortune, Sabotage, Quick Sabotage

**Spark (scene introduction):** “One relay, three patrols, and no second chance to look inconspicuous. This is where elegance pays.”

**Situation:** A compact relay in a secure depot coordinates the transfer of confiscated medical supplies. Guards circulate along an access hall, and two maintenance workers use the same passage. Disabling the relay at the wrong moment could trap workers behind security doors. The objective is to halt the transfer without injuring anyone.

**Question:** How do you reach and interrupt the relay?

**Player options (all first-person):**

**A.** I map the patrol route and slip in only after the maintenance workers have left the passage.

Developer intent: Choose timing that preserves cover and avoids workers.
Candidate mechanical bias: `stealthMastery`, `tacticalAwareness`; role `scout`.
Candidate ontology topics: `stealth`, `planning`.
Possible development (conditional): Misfortune: Skirmisher or Sudden Strike are different combat talents, not generic stealth bonuses.

**B.** I tamper with the relay discreetly and leave before the guards realize it has changed.

Developer intent: Prefer quiet technical disruption over confrontation.
Candidate mechanical bias: `sabotageExpertise`, `infiltration`; role `utility`.
Candidate ontology topics: `tech`, `infiltration`.
Possible development (conditional): Saboteur Quick Sabotage is later-level; ordinary Mechanics still requires checks.

**C.** I set up a diversion on the far side of the depot so the guards move away from the relay.

Developer intent: Misdirect attention to create access while minimizing harm.
Candidate mechanical bias: `deceptionMastery`, `tacticalAwareness`; role `controller`.
Candidate ontology topics: `deception`, `tactics`.
Possible development (conditional): Misfortune: Befuddle or Sow Confusion are conditional, not generic mind control.

**D.** I interrupt the transfer through the access system from a terminal outside the guarded hall.

Developer intent: Choose remote system control if available.
Candidate mechanical bias: `hackingSkills`, `technicalMastery`; role `utility`.
Candidate ontology topics: `slicing`, `tech`.
Possible development (conditional): Slicer: Electronic Sabotage/Security Slicer, subject to access and talent selection.

**E.** I prepare an exit route first so the team can withdraw if the relay cannot be safely reached.

Developer intent: Safety and exfiltration are integrated into the plan.
Candidate mechanical bias: `infiltrationMastery`, `allySupport`; role `support`.
Candidate ontology topics: `planning`, `teamwork`.
Possible development (conditional): Misfortune: movement and tactical talent directions; no guaranteed cooperative action.

**Mechanical teaching (developer only):** Skirmisher, Sneak Attack, Stymie and Quick Sabotage have different timing and prerequisites; later Quick Sabotage does not allow arbitrary instant device shutdown.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

### SB-Q3-S05 — The Wrong Enemy

**Distinct focus:** Deception, jamming and surgical countermeasures
**Default Q1 route IDs (14):** `MF03`, `MF05`, `MF06`, `MF08`, `MF09`, `MF13`, `MF17`, `SB01`, `SB03`, `SB04`, `CF01`, `CF04`, `ID02`, `NEUTRAL`
**Coverage domains:** Misfortune, Sabotage, Slicer, Turret, Identity

**Spark (scene introduction):** “Everybody wants a bigger bang. The clever answer is often no bang at all.”

**Situation:** A hostile force is operating from a crowded processing complex. Their communications relay, a squad of security droids and an improvised weapons cache share the same wing as civilian employees. The client wants the operation stopped immediately, but an indiscriminate attack would likely injure workers.

**Question:** Which system do you neutralize first?

**Player options (all first-person):**

**A.** I disrupt the droid control link so hostile units lose coordination without damaging the inhabited wing.

Developer intent: Prefer targeted communications disruption.
Candidate mechanical bias: `hackingSkills`, `droidControl`; role `controller`.
Candidate ontology topics: `droid`, `slicing`.
Possible development (conditional): Sabotage: Droid Jammer/Device Jammer; range and eligible device restrictions apply.

**B.** I plant misleading information that draws the hostile force away from the employees before I attempt any shutdown.

Developer intent: Use information manipulation to separate combatants from bystanders.
Candidate mechanical bias: `deceptionMastery`, `informationControl`; role `controller`.
Candidate ontology topics: `deception`, `tactics`.
Possible development (conditional): Misfortune: Sow Confusion or Slicer: Electronic Forgery, only if legally acquired.

**C.** I focus on disabling the weapons cache access while leaving the building’s safety systems untouched.

Developer intent: Select a contained objective instead of a destructive spectacle.
Candidate mechanical bias: `sabotageExpertise`, `engineeringMastery`; role `utility`.
Candidate ontology topics: `tech`, `control`.
Possible development (conditional): Sabotage: Device Jammer/precision tech, depending on actual mechanism.

**D.** I observe the guards and find which supervisor controls the operation before deciding what to disrupt.

Developer intent: Identify controlling dependencies before committing resources.
Candidate mechanical bias: `informationControl`, `tacticalAwareness`; role `scout`.
Candidate ontology topics: `recon`, `investigation`.
Possible development (conditional): Misfortune: Cunning Strategist and Slicer Trace are possible future directions.

**E.** I arrange a controlled evacuation and set a stopping point if civilians enter the danger area.

Developer intent: Use explicit abort criteria and safe sequencing.
Candidate mechanical bias: `allySupport`, `resourceControl`; role `support`.
Candidate ontology topics: `teamwork`, `planning`.
Possible development (conditional): Saboteur precise-demolition philosophy; no automatic command over workers.

**Mechanical teaching (developer only):** Device Jammer, Droid Jammer, Mine Mastery and multiple Misfortune options are conditional developments; scene answers must not imply a fully effective jamming field, an available mine, or unrestricted explosive access.

**Always available, unscored:** "I am not sure yet". **Browse:** "Try another situation" (navigation only).

---

## Validation ledger and remaining production requirements

Structural tests executed against generated JSON: five classes, five scenarios per class, five A–E substantive answers per scenario, 25 unique scenario IDs, 125 unique answer IDs, 125 unique first-person texts, 159 class-scoped Q1 routes assigned to exactly one default scenario, every suggested key a member of the checked canonical-name vocabularies, and non-empty developer interpretations.

### Source-derived caution versus proposed interpretation

Published-talent references in the `printedDevelopmentDirections` fields are **design touchpoints** drawn from Q1 source analysis, not conclusive proof the actor may select those talents at a particular advancement. In the actual game, the published rules, precise source provenance, restrictions, typed owned-item state and finalized class level control legality. Candidate ontology topics summarize player interest only; they are not reclassification of canonical talent operations.

### Before production

1. Owner/editor reviews all 25 scene frames, each Mentor lead, and 125 first-person responses; adjust tone and eliminate genuinely synonymous options.
2. Source-certify each proposed talent/feature touchpoint, eligibility and level under printed book pages and canonical V2 authorities; resolve Independent Droid/Spynet tree identity and Privateer Spacehound/Spacer terminology.
3. Verify Mentor routing uses exact registry IDs `m25`, `m12`, `m11`, `m18`, `m27` and does not invent past acquaintance, ownership or special assets.
4. Resolve actor-observed-only source projections, save a provenance-backed selected-answer Q3 event, apply exactly one new intent signal using existing scoring authority, and keep Q1/Q2 events separate.
5. Test neutral answer, unscored browse, alternate situation selection, career-as-capstone identity, sparse-data actors and multiple-class characters.

**Repository changes:** None. No commit, push, PR or production runtime change.


---

# SOURCE DOCUMENT: Batch 5 — `SWSE_Prestige_Q3_Batch5_Five_Classes_v02.md`

# SWSE Prestige Survey — Q3 *The Responsibility* — Batch 5 (Five Classes)

**Version:** v0.2 | **Date:** November 15, 2026 | **Status:** COMPLETE FIRST-PASS EDITORIAL DRAFT, PENDING OWNER REVIEW.

**Scope:** Outlaw; Droid Commander; Military Engineer; Vanguard; Martial Arts Master. These are the next five previously uncompleted prestige identities in sourcebook order, after Batch 4.

**Not performed:** full talent effect/prerequisite certification, actor-level legal eligibility, actual Suggestion Engine score ingestion, Foundry execution, GitHub modification/commit/push or PR.

## Editorial contract and provenance

A class routes the character to **one of five authored hypothetical situations**, with five meaningful first-person answer options. The default route uses the exact submitted Q1 response ID and can be refined by Q2 and observed actor evidence without converting those inputs into extra Q3 votes. Only the player-selected Q3 answer can become one provenance-marked hypothetical-method preference.

The interface also includes a separate unscored **“I am not sure yet”** and unscored **“Try another situation”** navigation. The five substantive choices are not right/wrong, faction, morality or alignment questions. None claims an owned talent, recent mission, personal companion, specific faction, class-acquisition transaction or prior Mentor relationship.

**Important ontology boundary:** The candidate `mechanicalBiasKeys`, `roleBiasKey` and `ontologyTopicCandidates` are **existing canonical strings**, not published talent-effect tags, confirmed suggestion weights, or permission to run an unreviewed parallel scorer. The ontology’s EXACT_SKILL_POLICY must be upheld by later rule-level mapping; a hypothetical activity referencing Mechanics, Stealth, etc. is not itself an operative published skill mechanic.

**Source basis:** Current committed Q1 authoring audit `docs/design/SWSE_Prestige_Survey_Rolling_Design.md` sections 27–29, Q2 synthesis, mentor registry and five dedicated Mentor JSON sources; current bias-key list and 190-tag ontology. Published book findings are carried forward from the already source-reviewed Q1 audit rather than newly represented as independently mechanically recertified.

### Completion summary

| Class | Mentor | Scenarios | Substantive answers | Exact Q1 routes |
|---|---|---:|---:|---:|
| Outlaw | Rogue | 5 | 25 | 32/32 |
| Droid Commander | General Axiom | 5 | 25 | 30/30 |
| Military Engineer | Chief Engineer Rax | 5 | 25 | 18/18 |
| Vanguard | Shield Captain Theron | 5 | 25 | 24/24 |
| Martial Arts Master | Master Zhen | 5 | 25 | 27/27 |
| **Total** | | **25** | **125** | **131/131** |

## Canonical/mechanical issue ledger

### Outlaw
- Outlaw entry requires wanted status in at least one system; do not invent an offense, prison escape, affiliation, or reward amount.
- Six Q1 talent candidates quarantined: OL-FR05..OL-FR09 and OL-SL07. Preserve Q1 routing but never promote their mechanical anchors as legal talents.
- Disgrace and Misfortune are entry-prerequisite trees, not Outlaw selectable talent trees.
- Fugitive is a later even-level class feature; no first-level speed bonus or unlimited chase immunity.

### Droid Commander
- Droid-only class; trained Knowledge (tactics), Use Computer, and specific qualifying talent required by published entry.
- Networked Mind begins at level 2, respects line of sight/comlinks and is not universal unrestricted remote command.
- Automated Strike requires Double Attack; Mettle, Overclocked Troops, Reinforced Commands require Droid Defense; Inspire Competence requires Expanded Sensors.
- General Axiom is procedural and efficiency-oriented, not Seraphim’s philosophical self-determination persona.

### Military Engineer
- Entry is BAB +7 with trained Mechanics and Use Computer; no generic military rank requirement.
- Field-Created Weapon starts at level 2 and produces a temporary encounter-limited item, not permanent inventory.
- Quick Modifications requires Repairs on the Fly and Tech Specialist; Tech Savant requires trained Knowledge (technology); Droid Expert requires Repairs on the Fly.
- Outlaw Tech is a printed selectable class tree; individual talents still have distinct prerequisites.

### Vanguard
- Vanguard is forward reconnaissance/intelligence support, not primarily an immovable frontline shield.
- Entry requires Perception and Stealth training plus two Camouflage/Commando qualifying talents; these two trees are not automatically selectable Vanguard trees.
- Vanguard selects Vanguard, Awareness and Survivor tree talents only, subject to additional expansions.
- Surprise Attack starts at Vanguard class level 2, modifies the first qualifying attack roll per round and does not grant blanket accuracy or damage.

### Martial Arts Master
- Entry specifically requires Martial Arts I, II, Melee Defense, one of eight named style Training feats, plus a Brawler/Survivor talent.
- Martial Arts Master explicitly has Master of Teräs Käsi tree access, but five indexed talent-effect descriptions are source-quarantined.
- Tough as Durasteel at levels 2/4/6/8/10 produces conditional bonus HP in light/no armor after unarmed damage, not permanent DR.
- Master Zhen is patient and discipline-focused; do not imply prior personal training or victories.

## Complete scene library and candidate signals

## Outlaw — Rogue (`m23`)

**Mentor voice source:** `data/dialogue/mentors/rogue/rogue_dialogue.json`

**Shared introduction (DRAFT):**

> Funny thing about being wanted: somebody else thinks they get to decide where you belong. Let’s see how you keep that choice yours.

### OL-Q3-S01 — The Checkpoint That Was Not There

**Decision focus:** Crossing a surprise security cordon without surrendering personal freedom

**Default Q1 routes (7):** `OL-SL02`, `OL-SL03`, `OL-SL04`, `OL-SL05`, `OL-SL06`, `OL-FR01`, `OL-FR09`

**Coverage domains:** Slicer, Fringer, Outlaw

> **Rogue:** Oh, look. An official checkpoint. Somebody spent real credits hoping you would stop.

An inspection cordon has appeared across the only obvious route into a settlement. Security officers are checking identities and electronic travel records. You need to pass through, and one false move could start a pursuit. There are civilians waiting in the same line.

**What is your first move?**

**A. I find a safe terminal and try to establish a legitimate-looking digital passage record before approaching the line.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `hackingSkills`, `deceptionMastery`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `use_computer`, `deception`.
- **Interpretation:** I find a safe terminal and try to establish a legitimate-looking digital passage record before approaching the line.
- **Published development direction / legal boundary:** Slicer: Electronic Forgery; requires trained Use Computer, and any actual forgery must be resolved.

**B. I look for a legal service entrance and offer something useful in exchange for passage.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `persuasionMastery`, `resourcefulness`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `social`, `resources`.
- **Interpretation:** I look for a legal service entrance and offer something useful in exchange for passage.
- **Published development direction / legal boundary:** Fringer: Barter supports haggling; no automatic Persuasion success or helpful contact.

**C. I study guard rotations and slip through a gap rather than force the whole queue into a confrontation.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `stealth`, `evasionTactics`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `stealth`, `positioning`.
- **Interpretation:** I study guard rotations and slip through a gap rather than force the whole queue into a confrontation.
- **Published development direction / legal boundary:** Outlaw evasion and trained Stealth; do not assert Hide in Plain Sight or an unverified Fringer talent.

**D. I keep my head down and take the long route around the cordon before anyone notices me.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `survivalSkills`, `evasionTactics`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `survival`, `mobility`.
- **Interpretation:** I keep my head down and take the long route around the cordon before anyone notices me.
- **Published development direction / legal boundary:** Survivor: Surefooted or Sprint are possible, subject to talent ownership and terrain.

**E. I observe which record they rely on and work out whether that single system is giving them the wrong picture.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `informationControl`, `hackingSkills`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `recon`, `tech`.
- **Interpretation:** I observe which record they rely on and work out whether that single system is giving them the wrong picture.
- **Published development direction / legal boundary:** Slicer: Trace, Electronic Sabotage; no free system compromise.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Potential directions: Electronic Forgery, Trace and Security Slicer (conditional trained skill requirements); Barter, Long Stride, and Outlaw defensive choices. A hypothetical credential is not automatically produced.
**Special caution:** Outlaw qualification includes being wanted somewhere, but no crime, bounty value or particular warrant is assumed.

### OL-Q3-S02 — The Pursuit Changes Direction

**Decision focus:** Reaction under pursuit, defensive instinct and coordinated openings

**Default Q1 routes (10):** `OL-OL01`, `OL-OL02`, `OL-OL03`, `OL-OL04`, `OL-OL05`, `OL-OL06`, `OL-OL07`, `OL-OL08`, `OL-SV03`, `OL-CF01`

**Coverage domains:** Outlaw, Survivor

> **Rogue:** Running is easy. Knowing when to make the hunter run? That is art.

A hired tracker catches sight of you in a crowded service yard. Another figure moves to block the nearest exit. A nearby traveler sees the trap and offers to distract one pursuer, but they are not part of your crew. Seconds remain before the exits close.

**How do you turn the situation to your advantage?**

**A. I use the traveler’s distraction as my moment to move, without treating them as a permanent ally.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `tacticalAwareness`; `roleBiasKey`: `skirmisher`; `ontologyTopicCandidates`: `teamwork`, `mobility`.
- **Interpretation:** I use the traveler’s distraction as my moment to move, without treating them as a permanent ally.
- **Published development direction / legal boundary:** Outlaw: Seize the Moment, Find an Opening; prerequisites and reaction triggers apply.

**B. I bait the nearest pursuer into overcommitting, then change position while they recover.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `counterAttack`, `evasion`; `roleBiasKey`: `skirmisher`; `ontologyTopicCandidates`: `counterattack`, `positioning`.
- **Interpretation:** I bait the nearest pursuer into overcommitting, then change position while they recover.
- **Published development direction / legal boundary:** Outlaw: Uncanny Instincts, Confounding Attack, Tangle Up; conditional talent chain.

**C. I protect my exit instead of racing for it, ready to answer the first attack that comes.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `reactionDefense`, `tacticalAwareness`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `defense`, `reaction`.
- **Interpretation:** I protect my exit instead of racing for it, ready to answer the first attack that comes.
- **Published development direction / legal boundary:** Outlaw: Opportunistic Defense or Preternatural Senses, each with explicit conditions.

**D. I break across the rough storage lanes where speed and footing matter more than a straight shot.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `survivalism`, `evasionTactics`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `mobility`, `positioning`.
- **Interpretation:** I break across the rough storage lanes where speed and footing matter more than a straight shot.
- **Published development direction / legal boundary:** Survivor: Surefooted and Sprint are distinct legal development choices.

**E. I turn one pursuer’s pressure into an opening for the traveler to get clear as well.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `adaptability`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `teamwork`, `evasion`.
- **Interpretation:** I turn one pursuer’s pressure into an opening for the traveler to get clear as well.
- **Published development direction / legal boundary:** Outlaw: Seize the Moment / Double Up are conditional shared-offense routes; ordinary aid remains possible.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Outlaw: Uncanny Instincts, Tangle Up, Seize the Moment, Opportunistic Defense, Preternatural Senses. Survivor: Sprint and Evasion. Later Fugitive increases withdrawal movement at specific levels, not passively.
**Special caution:** A traveler is a hypothetical momentary helper, not proof of an owned companion.

### OL-Q3-S03 — The Price of a Spare Part

**Decision focus:** Resource scarcity, negotiation and technical improvisation

**Default Q1 routes (6):** `OL-FR02`, `OL-FR04`, `OL-FR05`, `OL-FR06`, `OL-SV02`, `OL-ID02`

**Coverage domains:** Fringer, Slicer, Outlaw

> **Rogue:** Freedom costs credits. Sometimes it costs a cleverer offer.

Your transport arrangement falls apart when a replacement component is needed. A supplier can sell the part now but demands a favor you dislike. Other suppliers are farther away; an abandoned workshop contains scrap but not a ready-made solution.

**What do you do?**

**A. I bargain for a price and terms I can actually live with, rather than agreeing to a favor I cannot repay.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `persuasionMastery`, `resourceControl`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `social`, `resources`.
- **Interpretation:** I bargain for a price and terms I can actually live with, rather than agreeing to a favor I cannot repay.
- **Published development direction / legal boundary:** Fringer: Barter may support haggling checks; obligations are player choices.

**B. I inspect the scrap and attempt a temporary repair instead of buying my way out of trouble.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `mechanicalMastery`, `improvisation`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `jury_rig`, `repair`.
- **Interpretation:** I inspect the scrap and attempt a temporary repair instead of buying my way out of trouble.
- **Published development direction / legal boundary:** Fringer: Jury-Rigger; use normal Mechanics and jury-rig rules, no permanent repair promise.

**C. I find out who else buys this component and use that information to negotiate a different supplier.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `informationControl`, `networkInfluence`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `investigation`, `social`.
- **Interpretation:** I find out who else buys this component and use that information to negotiate a different supplier.
- **Published development direction / legal boundary:** Slicer: Trace can offer an investigative direction; no automatic offscreen contacts.

**D. I trade a useful service for the component, taking responsibility for a limited agreement I can complete.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `resourcefulness`, `skillUtility`; `roleBiasKey`: `flex`; `ontologyTopicCandidates`: `skills`, `resources`.
- **Interpretation:** I trade a useful service for the component, taking responsibility for a limited agreement I can complete.
- **Published development direction / legal boundary:** Fringer: Barter and general skill checks; a hypothetical service need not be completed in character history.

**E. I abandon the component and change the route before the supplier can make me dependent on them.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `freedomPursuit`, `adaptability`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `evasion`, `mobility`.
- **Interpretation:** I abandon the component and change the route before the supplier can make me dependent on them.
- **Published development direction / legal boundary:** Survivor/Outlaw mobility; no free vehicle or route guarantee.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Development examples: Barter, Jury-Rigger, Fringe Savant, Electronic Forgery, and Gimmick. No mechanic supplies free credits, a repaired craft or a successful forged record.
**Special caution:** The unverified Fringer Surge/Keep it Together identities may route to this non-gated problem but must not be recommended as legal talents.

### OL-Q3-S04 — A Fugitive at Your Door

**Decision focus:** Mutual aid, separation, collective survival and personal code

**Default Q1 routes (4):** `OL-SV01`, `OL-SV04`, `OL-ID01`, `OL-NEUTRAL`

**Coverage domains:** Outlaw, Survivor, Fringer

> **Rogue:** Somebody else wants out. You cannot call that irrelevant without making a choice.

A frightened fugitive asks you to guide them past patrols. They have little equipment and attract attention, but know an alternate way through the district. You have no prior obligation to them, and helping could put both of you at greater risk.

**How will you respond?**

**A. I guide us through terrain that makes detection harder, even if it costs me time.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `survivalism`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `survival`, `mobility`.
- **Interpretation:** I guide us through terrain that makes detection harder, even if it costs me time.
- **Published development direction / legal boundary:** Survivor: Surefooted; no granted stealth/invisibility feature.

**B. I teach the fugitive how to stay out of sight, then let them decide whether to follow me.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `knowledgeMastery`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `support`, `stealth`.
- **Interpretation:** I teach the fugitive how to stay out of sight, then let them decide whether to follow me.
- **Published development direction / legal boundary:** General cooperation and trained skills; Outlaw does not gain an automatic teaching talent.

**C. I take the more dangerous route myself to draw attention away from their escape.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `evasionTactics`, `allySupport`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `evasion`, `ally_support`.
- **Interpretation:** I take the more dangerous route myself to draw attention away from their escape.
- **Published development direction / legal boundary:** Outlaw evasive reactions; no supernatural threat redirection.

**D. I question their alternative route and choose only after checking whether it puts us both in a trap.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalAwareness`, `informationControl`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `recon`, `awareness`.
- **Interpretation:** I question their alternative route and choose only after checking whether it puts us both in a trap.
- **Published development direction / legal boundary:** Outlaw defensive instincts; ordinary Perception and Survival checks subject to real actor abilities.

**E. I refuse the escort but give them the best practical information I can without surrendering my own escape.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `independence`, `skillUtility`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `knowledge`, `support`.
- **Interpretation:** I refuse the escort but give them the best practical information I can without surrendering my own escape.
- **Published development direction / legal boundary:** Fringer/general skill utility; not a negative ally-support inference for other contexts.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Survivor: Sprint, Surefooted, Evasion; Outlaw: Seize the Moment and later Fugitive. Protecting a stranger is hypothetical intent, not a moral or alignment verdict.
**Special caution:** Do not infer a saved civilian or prior crime from a hypothetical willingness to help.

### OL-Q3-S05 — The Terminal with Two Stories

**Decision focus:** Information manipulation, digital exit and reputational survival

**Default Q1 routes (5):** `OL-FR03`, `OL-FR07`, `OL-FR08`, `OL-SL01`, `OL-SL07`

**Coverage domains:** Slicer, Fringer, Survivor

> **Rogue:** A terminal can betray you without ever telling a lie. Usually somebody programmed it that way.

An electronic registry describes you as a dangerous suspect and marks your current location for patrol response. The registry also contains records of other people, some of whom may be innocent. You can reach a public terminal for a short interval before security arrives.

**Which approach best fits you?**

**A. I trace where the report came from before touching it; the source may matter more than the notice.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `informationControl`, `trackingMastery`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `investigation`, `use_computer`.
- **Interpretation:** I trace where the report came from before touching it; the source may matter more than the notice.
- **Published development direction / legal boundary:** Slicer: Trace; requires viable network access and valid skill use.

**B. I try to block the registry from sending another alert while leaving unrelated records untouched.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `hackingSkills`, `sabotageExpertise`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `slicing`, `tech`.
- **Interpretation:** I try to block the registry from sending another alert while leaving unrelated records untouched.
- **Published development direction / legal boundary:** Slicer: Electronic Sabotage; no blanket hack success or area access.

**C. I use a brief system command to create an opening for my withdrawal rather than changing anyone’s file.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `hackingSkills`, `initiative`; `roleBiasKey`: `skirmisher`; `ontologyTopicCandidates`: `action_economy`, `use_computer`.
- **Interpretation:** I use a brief system command to create an opening for my withdrawal rather than changing anyone’s file.
- **Published development direction / legal boundary:** Slicer: Gimmick; timing and command availability still apply.

**D. I change nothing and use the time to identify a route the next patrol is least likely to cover.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalAwareness`, `evasionTactics`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `awareness`, `mobility`.
- **Interpretation:** I change nothing and use the time to identify a route the next patrol is least likely to cover.
- **Published development direction / legal boundary:** Outlaw evasion and general Perception; neither implies talent ownership.

**E. I compare the record with public information to expose errors before deciding whether to challenge it or disappear.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `informationControl`, `deceptionMastery`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `investigation`, `tech`.
- **Interpretation:** I compare the record with public information to expose errors before deciding whether to challenge it or disappear.
- **Published development direction / legal boundary:** Slicer: Trace/Electronic Forgery are possible directions, not automatic evidence alteration.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Slicer: Trace, Electronic Sabotage, Gimmick and Master Slicer (with access and training conditions). Virus is quarantined. Exact Use Computer mechanics require separate certification.
**Special caution:** The Slicer Virus candidate is quarantined; route its Q1 expression here without treating it as a certified legal choice.

## Droid Commander — General Axiom (`m10`)

**Mentor voice source:** `data/dialogue/mentors/axiom/axiom_dialogue.json`

**Shared introduction (DRAFT):**

> <Assessment: Command potential recorded.> A unit is judged by what it accomplishes, not how loudly it receives orders. Evaluate the following operational failures.

### DC-Q3-S01 — The Silent Relay

**Decision focus:** Command integrity and sensor sharing when communications degrade

**Default Q1 routes (7):** `DC-DCT01`, `DC-DCT02`, `DC-DCT06`, `DC-CF01`, `DC-LEA04`, `DC-LEA09`, `DC-INS04`

**Coverage domains:** Droid Commander, Leadership, Inspiration

> **General Axiom:** <Alert: Data exchange interrupted.> Unit coordination is no longer guaranteed.

A temporary droid work-and-security team is protecting an evacuation corridor. Interference breaks the shared relay, and different units begin reporting conflicting positions. Your own link still reaches some units directly, but not all of them.

**Which command protocol do you prioritize?**

**A. I reestablish a reliable picture of the corridor from the units that can still see one another.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `informationControl`, `tacticalAwareness`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `sensors`, `recon`.
- **Interpretation:** I reestablish a reliable picture of the corridor from the units that can still see one another.
- **Published development direction / legal boundary:** Droid Commander: Expanded Sensors; sighting transmission requires real network capability.

**B. I issue a defensive fallback order so isolated units can protect themselves until the links recover.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `commandAuthority`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `defense`, `leadership`.
- **Interpretation:** I issue a defensive fallback order so isolated units can protect themselves until the links recover.
- **Published development direction / legal boundary:** Droid Commander: Droid Defense, Maintain Focus; do not assume either talent is owned.

**C. I keep my instructions short and direct, using the few units I can reach to relay them onward.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `formation`, `unitCoordination`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `teamwork`, `command`.
- **Interpretation:** I keep my instructions short and direct, using the few units I can reach to relay them onward.
- **Published development direction / legal boundary:** Leadership: Distant Command and Commanding Presence, with printed limits.

**D. I give each reachable unit a simple independent objective rather than pretending the whole network is intact.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalAwareness`, `adaptability`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `tactics`, `leadership`.
- **Interpretation:** I give each reachable unit a simple independent objective rather than pretending the whole network is intact.
- **Published development direction / legal boundary:** Leadership and Droid Commander tactics; no perfect remote synchronization granted.

**E. I prioritize restoring the line between the medical evacuation and the defenders before improving our own attack plan.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `resourceControl`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `support`, `tech`.
- **Interpretation:** I prioritize restoring the line between the medical evacuation and the defenders before improving our own attack plan.
- **Published development direction / legal boundary:** Droid Commander/Leadership support routes; hypothetical droid allies only.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Droid Commander: Expanded Sensors, Droid Defense, Maintain Focus; Leadership: Distant Command and Commanding Presence. Networked Mind starts at class level 2 and respects comlink requirements.
**Special caution:** Do not treat a signal interruption as something Networked Mind can automatically bypass.

### DC-Q3-S02 — The Damaged Unit

**Decision focus:** Droid protection, resilience and sacrificing tempo to preserve function

**Default Q1 routes (6):** `DC-DCT04`, `DC-LEA05`, `DC-INS07`, `DC-INS03`, `DC-LEA03`, `DC-LEA01`

**Coverage domains:** Droid Commander, Inspiration, Leadership

> **General Axiom:** <Status: Friendly droid disabled in a forward position.> Recovery and objective completion now compete.

A droid assigned to a temporary escort formation suffers damage while holding a narrow access way. Other units can withdraw with the evacuees or remain to cover recovery. Staying longer risks the remaining units; abandoning the position leaves the damaged droid exposed.

**What do you direct?**

**A. I organize a covered withdrawal and protect the disabled unit as we move it out.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `formation`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `teamwork`, `defense`.
- **Interpretation:** I organize a covered withdrawal and protect the disabled unit as we move it out.
- **Published development direction / legal boundary:** Droid Commander: Droid Defense and Droid Mettle; obey ally/range/activation limits.

**B. I stabilize the formation around the access way long enough to make a recovery attempt possible.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalSupport`, `fortifications`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `cover`, `positioning`.
- **Interpretation:** I stabilize the formation around the access way long enough to make a recovery attempt possible.
- **Published development direction / legal boundary:** Leadership protective coordination; real repairs still require relevant mechanics.

**C. I shift the unaffected units into positions where they can continue the escort while one unit handles recovery.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `unitCoordination`, `tacticalAwareness`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `leadership`, `tactics`.
- **Interpretation:** I shift the unaffected units into positions where they can continue the escort while one unit handles recovery.
- **Published development direction / legal boundary:** Leadership: Rally and Coordinate where eligible; do not conjure additional units.

**D. I tell the damaged droid to conserve its remaining systems while the others take over the dangerous work.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `resourceControl`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `support`, `droid`.
- **Interpretation:** I tell the damaged droid to conserve its remaining systems while the others take over the dangerous work.
- **Published development direction / legal boundary:** Droid Commander: Droid Mettle; not actual self-repair or automatic recovery.

**E. I secure the evacuees first, then return for the droid if doing so is still possible.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `commandAuthority`, `adaptability`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `tactics`, `movement`.
- **Interpretation:** I secure the evacuees first, then return for the droid if doing so is still possible.
- **Published development direction / legal boundary:** Droid Commander and Leadership are about order priority; no moral score for this tradeoff.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Droid Commander: Droid Mettle and Droid Defense; Inspiration: Bolster Ally; Leadership: Rally, Fearless Leader, Unwavering Ally. None replaces an actual repair or creates extra droids.
**Special caution:** Damaged droid is a scene NPC, not an actor-owned follower.

### DC-Q3-S03 — A Narrow Opening

**Decision focus:** Coordinating precision, movement and decisive combined attacks

**Default Q1 routes (7):** `DC-DCT03`, `DC-DCT05`, `DC-DCT07`, `DC-INS01`, `DC-INS02`, `DC-LEA07`, `DC-LEA10`

**Coverage domains:** Droid Commander, Inspiration, Leadership

> **General Axiom:** <Tactical opportunity: Brief.> Excessive deliberation will expire it.

A hostile automated turret rotates away from a corridor for a few seconds. Two friendly droids are in position to act, but the turret will reacquire its target if they move carelessly. There may be only one safe opportunity to disrupt its fire.

**How do you exploit the opening?**

**A. I call the precise firing window and concentrate the available weapons on the turret.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `unitCoordination`, `accuracy`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `targeting`, `teamwork`.
- **Interpretation:** I call the precise firing window and concentrate the available weapons on the turret.
- **Published development direction / legal boundary:** Droid Commander: Automated Strike is a future, prerequisite-gated talent direction.

**B. I move the droids into better positions before asking them to risk a shot.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `formation`, `rapidResponse`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `movement`, `positioning`.
- **Interpretation:** I move the droids into better positions before asking them to risk a shot.
- **Published development direction / legal boundary:** Droid Commander: Overclocked Troops, gated by Droid Defense.

**C. I give the most accurate unit the clearest target data and let its shot set the sequence.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `tacticalAwareness`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `sensors`, `precision`.
- **Interpretation:** I give the most accurate unit the clearest target data and let its shot set the sequence.
- **Published development direction / legal boundary:** Droid Commander: Inspire Competence requires Expanded Sensors.

**D. I coordinate a short supporting burst that lets the vulnerable droid cross the corridor safely.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `tacticalSupport`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `teamwork`, `support`.
- **Interpretation:** I coordinate a short supporting burst that lets the vulnerable droid cross the corridor safely.
- **Published development direction / legal boundary:** Inspiration and Leadership cooperative aid; no unverified turret suppression effects.

**E. I wait just long enough to confirm the turret is not tracking the evacuees before committing to the strike.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `informationControl`, `initiative`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `recon`, `tactics`.
- **Interpretation:** I wait just long enough to confirm the turret is not tracking the evacuees before committing to the strike.
- **Published development direction / legal boundary:** Command tactical judgment, not an extra action or automatic initiative bonus.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Droid Commander: Automated Strike (requires Double Attack with chosen weapon), Inspire Competence (requires Expanded Sensors), Overclocked Troops (requires Droid Defense); Inspiration: Inspire Zeal. No bonus attack without legal talent.
**Special caution:** Temporary scene units are not an owned squad. Automated Strike prereqs are not automatically satisfied.

### DC-Q3-S04 — Two Conflicting Directives

**Decision focus:** Trust, multi-leader coordination and procedural initiative

**Default Q1 routes (5):** `DC-LEA02`, `DC-LEA06`, `DC-LEA11`, `DC-INS05`, `DC-INS06`

**Coverage domains:** Leadership, Inspiration

> **General Axiom:** <Conflict: Parallel orders detected.> Obedience to both commands is impossible.

Two droid team leaders receive different instructions from separate authorized coordinators. Both orders appear valid, but one sends units toward a damaged power junction while the other sends them to protect a civilian loading area. You have enough time to clarify one priority, not enough to execute both in full.

**What do you do?**

**A. I ask both leaders for their immediate casualty and failure estimates, then issue one clear priority.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalAwareness`, `commandAuthority`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `leadership`, `planning`.
- **Interpretation:** I ask both leaders for their immediate casualty and failure estimates, then issue one clear priority.
- **Published development direction / legal boundary:** Leadership: Coordinated Leadership; no actual military appointment is inferred.

**B. I entrust the leader at the power junction to make the local call while I direct protection of the loading area.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `unitCoordination`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `command`, `teamwork`.
- **Interpretation:** I entrust the leader at the power junction to make the local call while I direct protection of the loading area.
- **Published development direction / legal boundary:** Leadership: Trust; conditional action sharing only if mechanically eligible.

**C. I coordinate both groups around a common safety threshold so their actions no longer compete.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `formation`, `tacticalSupport`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `teamwork`, `tactics`.
- **Interpretation:** I coordinate both groups around a common safety threshold so their actions no longer compete.
- **Published development direction / legal boundary:** Leadership: Coordinate and related ally-support directions.

**D. I send one fast technical instruction to the junction while keeping the main formation on evacuation duty.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `rapidResponse`, `knowledgeMastery`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `action_economy`, `tech`.
- **Interpretation:** I send one fast technical instruction to the junction while keeping the main formation on evacuation duty.
- **Published development direction / legal boundary:** Inspiration: Inspire Haste is a future option with prerequisites/limits.

**E. I focus on maintaining discipline while the leaders reconcile the details, preventing panic from spreading between teams.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `moraleBonus`, `allySupport`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `leadership`, `support`.
- **Interpretation:** I focus on maintaining discipline while the leaders reconcile the details, preventing panic from spreading between teams.
- **Published development direction / legal boundary:** Inspiration: Willpower; not guaranteed success against all fear/mind-affecting effects.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Leadership: Trust, Coordinate, Coordinated Leadership; Inspiration: Willpower, Inspire Haste. Cooperation does not override class ownership, hierarchy, or ally consent.
**Special caution:** Multiple scene leaders do not prove the actor owns minions or formal authority.

### DC-Q3-S05 — The Objective Has Changed

**Decision focus:** Reprioritization when original orders no longer fit reality

**Default Q1 routes (5):** `DC-DCT08`, `DC-LEA08`, `DC-ID01`, `DC-ID02`, `DC-NEUTRAL`

**Coverage domains:** Droid Commander, Leadership, Identity

> **General Axiom:** <Objective revision received.> Compliance with obsolete instructions would now cause avoidable losses.

During a rescue simulation, your droid team receives a revised objective: preserve a medical shipment rather than occupy an empty checkpoint. Several units still follow the old route, and one carries the only reliable scanner. The new objective leaves the enemy free to approach another way.

**How do you restructure the operation?**

**A. I redirect the scanner unit to the shipment and revise the rest of the team around verified information.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `informationControl`, `formation`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `sensors`, `tactics`.
- **Interpretation:** I redirect the scanner unit to the shipment and revise the rest of the team around verified information.
- **Published development direction / legal boundary:** Droid Commander: Expanded Sensors and Reinforced Commands; requires relevant talents.

**B. I issue a new rally point and have every reachable unit confirm the order before moving.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `commandAuthority`, `unitCoordination`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `command`, `teamwork`.
- **Interpretation:** I issue a new rally point and have every reachable unit confirm the order before moving.
- **Published development direction / legal boundary:** Leadership: Born Leader and Coordinate are gated choices, not inherent digital command.

**C. I leave a small delaying force at the approach while shifting the remainder to preserve the shipment.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalAwareness`, `fortifications`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `positioning`, `tactics`.
- **Interpretation:** I leave a small delaying force at the approach while shifting the remainder to preserve the shipment.
- **Published development direction / legal boundary:** Droid Commander/Leadership protective formation; do not invent a unit count.

**D. I allow local droids to propose a better route, then select the one that meets the new objective with least exposure.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `adaptability`, `allySupport`; `roleBiasKey`: `flex`; `ontologyTopicCandidates`: `planning`, `teamwork`.
- **Interpretation:** I allow local droids to propose a better route, then select the one that meets the new objective with least exposure.
- **Published development direction / legal boundary:** Leadership: Trust; command does not imply ownership or mind control.

**E. I protect the shipment first and treat the abandoned checkpoint as a cost of changing priorities.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `resourceControl`, `commandAuthority`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `resources`, `leadership`.
- **Interpretation:** I protect the shipment first and treat the abandoned checkpoint as a cost of changing priorities.
- **Published development direction / legal boundary:** Droid Commander logistical priorities; no alignment or obedience scoring.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Droid Commander: Reinforced Commands; Leadership: Born Leader. This dilemma is about selected tactical priorities, not compelled obedience or new organizational allegiance.
**Special caution:** Neutral Q1 routes to a balanced scene but does not create a Q1 directional signal.

## Military Engineer — Chief Engineer Rax (`m22`)

**Mentor voice source:** `data/dialogue/mentors/rax/rax_dialogue.json`

**Shared introduction (DRAFT):**

> A battlefield is a collection of stresses, loads, and failure points. I will give you constraints. You will decide which failure is acceptable.

### MENG-Q3-S01 — The Last Crossing

**Decision focus:** Route engineering, terrain design and safety versus speed

**Default Q1 routes (2):** `ME-ENG02`, `ME-ENG04`

**Coverage domains:** Military Engineer

> **Chief Engineer Rax:** Assessment: a route is not usable simply because it still exists.

A relief convoy must cross a damaged narrow bridge before a storm closes the valley. One support has shifted, heavy vehicles cannot easily turn around, and hostile patrols may reach the crossing later. A bypass runs through unstable ground.

**How would you manage the crossing?**

**A. I assess the load-bearing damage and set a safe crossing sequence before moving the heaviest vehicle.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `engineeringMastery`, `tacticalAwareness`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `tech`, `planning`.
- **Interpretation:** I assess the load-bearing damage and set a safe crossing sequence before moving the heaviest vehicle.
- **Published development direction / legal boundary:** Military Engineer: Problem Solver and ordinary Mechanics analysis; no guaranteed structural safety.

**B. I reinforce the failing span with available material so the essential vehicles can cross at reduced load.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `fortifications`, `resourcefulness`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `crafting`, `tech`.
- **Interpretation:** I reinforce the failing span with available material so the essential vehicles can cross at reduced load.
- **Published development direction / legal boundary:** Military Engineer: repair/structural engineering direction; no free material or repair talent.

**C. I survey the bypass and guide the convoy around the worst terrain instead of forcing a risky bridge crossing.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalSupport`, `adaptability`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `movement`, `tactics`.
- **Interpretation:** I survey the bypass and guide the convoy around the worst terrain instead of forcing a risky bridge crossing.
- **Published development direction / legal boundary:** Military Engineer: Problem Solver, vehicle terrain support.

**D. I prepare a controlled way to remove a dangerous section if it begins to fail, keeping it away from the convoy.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `engineeringMastery`, `explosiveMastery`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `tech`, `battlefield_control`.
- **Interpretation:** I prepare a controlled way to remove a dangerous section if it begins to fail, keeping it away from the convoy.
- **Published development direction / legal boundary:** Military Engineer: Prepared Explosive is subject to setup and placement rules.

**E. I choose which cargo can be left behind so the remaining vehicles have a better chance of reaching safety.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `resourceControl`, `commandAuthority`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `resources`, `planning`.
- **Interpretation:** I choose which cargo can be left behind so the remaining vehicles have a better chance of reaching safety.
- **Published development direction / legal boundary:** General load management and technical judgment; class does not supply command rank.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Military Engineer: Problem Solver, Prepared Explosive, Breaching Explosive. Use Mechanics/Use Computer only when conditions allow; no automatic bridge reconstruction.
**Special caution:** Scene convoy is hypothetical; the character does not own vehicles or hold military command.

### MENG-Q3-S02 — The Disabled Walker

**Decision focus:** Combat repair, droid maintenance and protecting damaged hardware

**Default Q1 routes (4):** `ME-ENG01`, `ME-ENG05`, `ME-ENG07`, `ME-OT02`

**Coverage domains:** Military Engineer, Outlaw Tech

> **Chief Engineer Rax:** Two minutes until the position is lost. The solution must fit within that limit.

A defensive walker stalls during an evacuation. Its drive system has failed, a nearby droid carries replacement diagnostic data, and incoming fire threatens both. There is not enough time for a full workshop repair.

**Where do you direct your effort?**

**A. I make the fastest defensible repair to the drive system, accepting that a temporary fix may fail later.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `mechanicalMastery`, `rapidResponse`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `repair`, `vehicle`.
- **Interpretation:** I make the fastest defensible repair to the drive system, accepting that a temporary fix may fail later.
- **Published development direction / legal boundary:** Military Engineer: Repairs on the Fly; normal repair/check limits remain.

**B. I reinforce the walker’s vulnerable section first so it survives long enough for the evacuees to pass.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `fortifications`, `tacticalSupport`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `vehicle`, `defense`.
- **Interpretation:** I reinforce the walker’s vulnerable section first so it survives long enough for the evacuees to pass.
- **Published development direction / legal boundary:** Military Engineer: Vehicular Boost, if legally owned and triggered.

**C. I retrieve the droid’s technical record and use its information to narrow the repair before touching the walker.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `technicalMastery`, `informationControl`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `droid`, `tech`.
- **Interpretation:** I retrieve the droid’s technical record and use its information to narrow the repair before touching the walker.
- **Published development direction / legal boundary:** Military Engineer: Droid Expert is prerequisite-gated; no automatic read access.

**D. I divert available components to a temporary repair that will hold only until the walker reaches cover.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `improvisation`, `resourcefulness`; `roleBiasKey`: `flex`; `ontologyTopicCandidates`: `jury_rig`, `repair`.
- **Interpretation:** I divert available components to a temporary repair that will hold only until the walker reaches cover.
- **Published development direction / legal boundary:** Outlaw Tech: Fast Repairs; engineering repairs still require parts and checks.

**E. I stabilize the droid rather than the walker if that keeps the route’s only diagnostic capability intact.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `resourceControl`, `allySupport`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `droid`, `repair`.
- **Interpretation:** I stabilize the droid rather than the walker if that keeps the route’s only diagnostic capability intact.
- **Published development direction / legal boundary:** Military Engineer: Droid Expert; this choice reveals priority, not actor ownership of a droid.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Military Engineer: Repairs on the Fly, Vehicular Boost, Droid Expert; Outlaw Tech: Fast Repairs and Quick Fix. All require real assets/checks and specific talent access.
**Special caution:** A disabled machine in a scene is not proof the actor owns one or can repair without equipment.

### MENG-Q3-S03 — A Wall with One Weak Point

**Decision focus:** Controlled breaching, cover and selective system destruction

**Default Q1 routes (3):** `ME-ENG06`, `ME-ENG08`, `ME-ENG10`

**Coverage domains:** Military Engineer

> **Chief Engineer Rax:** A heavy barrier invites heavy weapons. A calculated opening needs less.

A hostile outpost is blocking access to a captured water processor. The outer wall shelters armed guards but also borders occupied equipment rooms. Destroying the whole facade could ruin the processor; a narrow service access has multiple locks.

**What is your engineering approach?**

**A. I calculate a small breach at the weakest isolated section and keep the blast away from the processor.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `explosiveMastery`, `engineeringMastery`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `tech`, `battlefield_control`.
- **Interpretation:** I calculate a small breach at the weakest isolated section and keep the blast away from the processor.
- **Published development direction / legal boundary:** Military Engineer: Breaching Explosive; strict placement and equipment checks apply.

**B. I suppress the guards’ cover with a technically planned attack so another team can move into position.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalSupport`, `allySupport`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `cover`, `teamwork`.
- **Interpretation:** I suppress the guards’ cover with a technically planned attack so another team can move into position.
- **Published development direction / legal boundary:** Military Engineer: Breach Cover; exact area-weapon and ally effect rules apply.

**C. I attempt to disable the wall’s control and power systems rather than collapse its structure.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `sabotageExpertise`, `technicalMastery`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `power_systems`, `tech`.
- **Interpretation:** I attempt to disable the wall’s control and power systems rather than collapse its structure.
- **Published development direction / legal boundary:** Military Engineer: Sabotage Device is a future talent, not a guaranteed shutdown.

**D. I map the load paths and look for an alternative access that preserves the building’s essential systems.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `knowledgeMastery`, `engineeringMastery`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `planning`, `tech`.
- **Interpretation:** I map the load paths and look for an alternative access that preserves the building’s essential systems.
- **Published development direction / legal boundary:** Military Engineer: Problem Solver/structural analysis, subject to skill use.

**E. I fortify our own approach before attempting any breach, accepting slower progress for a safer withdrawal.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `fortifications`, `tacticalAwareness`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `cover`, `defense`.
- **Interpretation:** I fortify our own approach before attempting any breach, accepting slower progress for a safer withdrawal.
- **Published development direction / legal boundary:** General construction and battlefield cover; no automatic fortification granted.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Military Engineer: Breaching Explosive, Breach Cover, Sabotage Device. Do not equate all demolition with area damage or ignore collateral effects.
**Special caution:** The water processor is a fictional scene device. Do not interpret as actor-owned or mission-history fact.

### MENG-Q3-S04 — Built from Scrap

**Decision focus:** Encounter-limited improvisation and the costs of temporary tools

**Default Q1 routes (5):** `ME-ENG03`, `ME-ENG09`, `ME-CF01`, `ME-ID02`, `ME-OT01`

**Coverage domains:** Military Engineer, Outlaw Tech

> **Chief Engineer Rax:** Parts available: inadequate. Time available: worse. An engineer makes those quantities useful.

A rescue team is stranded in a depot with damaged hand tools, a few power cells and salvaged mechanical parts. An automated defense unit blocks the exit. Any improvised weapon or device could be useful for only a few moments, and carrying the parts slows escape.

**What do you build or prioritize?**

**A. I assemble the simplest temporary tool that can disable the exit control without a prolonged firefight.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `improvisation`, `mechanicalMastery`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `crafting`, `tech`.
- **Interpretation:** I assemble the simplest temporary tool that can disable the exit control without a prolonged firefight.
- **Published development direction / legal boundary:** Field-Created Weapon is a level-2 ability with limited-use and destruction conditions, not immediate level-1 access.

**B. I tune a working powered weapon to be more reliable rather than constructing an untested device from scratch.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `technicalInnovation`, `resourcefulness`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `modification`, `tech`.
- **Interpretation:** I tune a working powered weapon to be more reliable rather than constructing an untested device from scratch.
- **Published development direction / legal boundary:** Outlaw Tech: Personalized Modifications is weapon-scoped; Quick Modifications has separate Tech Specialist and Repairs on the Fly prerequisites.

**C. I overdrive the depot’s existing mechanism briefly to open an escape window.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `technicalMastery`, `rapidResponse`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `power_systems`, `tech`.
- **Interpretation:** I overdrive the depot’s existing mechanism briefly to open an escape window.
- **Published development direction / legal boundary:** Military Engineer: Tech Savant; trained Knowledge technology requirement.

**D. I use the scrap to create cover and a safer path, keeping our attention on evacuation rather than the defender.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `fortifications`, `allySupport`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `cover`, `positioning`.
- **Interpretation:** I use the scrap to create cover and a safer path, keeping our attention on evacuation rather than the defender.
- **Published development direction / legal boundary:** General construction/positioning; a Field-Created Weapon is not assumed.

**E. I set a firm time limit on experimentation and leave unfinished devices behind if the route becomes unsafe.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `resourceControl`, `tacticalAwareness`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `resources`, `planning`.
- **Interpretation:** I set a firm time limit on experimentation and leave unfinished devices behind if the route becomes unsafe.
- **Published development direction / legal boundary:** Technical logistics and judgment; no new action-economy feature granted.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Military Engineer: Quick Modifications (Tech Specialist + Repairs on the Fly), Tech Savant (trained Knowledge technology), Field-Created Weapon at class level 2 only. No persistent free item.
**Special caution:** Field-Created Weapon only begins at Military Engineer 2 and creates a temporary encounter-limited item.

### MENG-Q3-S05 — Locked Out of the Controls

**Decision focus:** Digital access, emergency troubleshooting and technical priority

**Default Q1 routes (4):** `ME-OT03`, `ME-OT04`, `ME-ID01`, `ME-NEUTRAL`

**Coverage domains:** Outlaw Tech, Military Engineer

> **Chief Engineer Rax:** The panel is locked. The pumps are failing. Neither fact accepts excuses.

A municipal cooling station begins to overheat after a security update locks the maintenance interface. The primary pump still runs, but its automatic settings will shut it off too soon. There is a manual bypass in a narrow service shaft, and local staff can verify only part of the new access policy.

**What is your response?**

**A. I attempt a narrow access bypass that changes the failing pump setting without disturbing the rest of the system.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `hackingSkills`, `technicalMastery`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `use_computer`, `tech`.
- **Interpretation:** I attempt a narrow access bypass that changes the failing pump setting without disturbing the rest of the system.
- **Published development direction / legal boundary:** Outlaw Tech: Hot Wire; actual access restrictions/Use Computer checks apply.

**B. I open the service shaft and make a small mechanical adjustment that buys more time.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `mechanicalMastery`, `improvisation`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `mechanics`, `jury_rig`.
- **Interpretation:** I open the service shaft and make a small mechanical adjustment that buys more time.
- **Published development direction / legal boundary:** Outlaw Tech: Quick Fix; emergency repair limitations apply.

**C. I fine-tune the pump’s intact power components first so it can survive the existing shutdown schedule.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `technicalInnovation`, `resourceControl`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `power_systems`, `modification`.
- **Interpretation:** I fine-tune the pump’s intact power components first so it can survive the existing shutdown schedule.
- **Published development direction / legal boundary:** General Mechanics/Use Computer planning. Outlaw Tech Personalized Modifications is weapon-scoped, not a blanket powered-pump upgrade.

**D. I ask staff to confirm which operations are truly essential before altering anything else.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `knowledgeMastery`, `allySupport`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `planning`, `support`.
- **Interpretation:** I ask staff to confirm which operations are truly essential before altering anything else.
- **Published development direction / legal boundary:** Technical decision making; no assumed bureaucratic clearance or class command authority.

**E. I choose a controlled partial shutdown rather than risk a cascade failure throughout the station.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalAwareness`, `resourceControl`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `planning`, `resources`.
- **Interpretation:** I choose a controlled partial shutdown rather than risk a cascade failure throughout the station.
- **Published development direction / legal boundary:** General emergency engineering judgment; does not itself award a repair talent.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Outlaw Tech: Hot Wire, Quick Fix, Personalized Modifications; no unrestricted hacking, permanent repair or free equipment.
**Special caution:** Do not assume a protagonist can hack security using a class label without actual talent/training.

## Vanguard — Shield Captain Theron (`m28`)

**Mentor voice source:** `data/dialogue/mentors/theron/theron_dialogue.json`

**Shared introduction (DRAFT):**

> A shield is not only something raised when the attack arrives. Sometimes it is the warning that prevents the attack. Show me how you would serve at the front.

### VG-Q3-S01 — The Unmarked Patrol

**Decision focus:** Observation and reporting before hostile contact

**Default Q1 routes (4):** `VG-VGT05`, `VG-AW08`, `VG-AW01`, `VG-ID01`

**Coverage domains:** Vanguard, Awareness

> **Shield Captain Theron:** The danger we do not recognize is the one we cannot protect others against.

You are scouting a ridge ahead of a relief column. Figures in unmarked armor are moving toward the road, but you cannot tell whether they are a hostile patrol or frightened local guards. They have not spotted you, and the column will reach the ridge soon.

**What do you do first?**

**A. I observe their numbers, equipment and behavior long enough to give the column a useful warning.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `informationControl`, `tacticalAwareness`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `recon`, `awareness`.
- **Interpretation:** I observe their numbers, equipment and behavior long enough to give the column a useful warning.
- **Published development direction / legal boundary:** Vanguard: Enhanced Vision; actual Perception and sight limitations apply.

**B. I follow the patrol’s route from a safe distance to learn where it intends to intercept the road.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `trackingMastery`, `stealth`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `tracking`, `stealth`.
- **Interpretation:** I follow the patrol’s route from a safe distance to learn where it intends to intercept the road.
- **Published development direction / legal boundary:** Awareness: Expert Tracker; requires Acute Senses and relevant Survival activity.

**C. I warn the column of an uncertain contact and recommend a temporary halt while I verify the threat.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `tacticalAwareness`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `support`, `recon`.
- **Interpretation:** I warn the column of an uncertain contact and recommend a temporary halt while I verify the threat.
- **Published development direction / legal boundary:** Recon reporting and tactical support; no automatic droid or comm network.

**D. I find an observation point that keeps me concealed while giving the widest view of both patrol and road.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `stealth`, `evasion`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `concealment`, `positioning`.
- **Interpretation:** I find an observation point that keeps me concealed while giving the widest view of both patrol and road.
- **Published development direction / legal boundary:** Vanguard: enhanced observation/cover themes; not a free stealth talent.

**E. I look for signs the patrol is avoiding danger itself before treating it as an enemy.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `knowledgeMastery`, `informationControl`; `roleBiasKey`: `utility`; `ontologyTopicCandidates`: `awareness`, `investigation`.
- **Interpretation:** I look for signs the patrol is avoiding danger itself before treating it as an enemy.
- **Published development direction / legal boundary:** Ordinary situational evaluation; do not score presumed alignment or morality.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Vanguard: Enhanced Vision and tactical reconnaissance; Awareness: Acute Senses and Expert Tracker. No detection is automatically successful and no squad is owned.
**Special caution:** Theron remains protective but not merely a fortification or shield-bearing combatant.

### VG-Q3-S02 — Three Lines of Fire

**Decision focus:** Target designation, sight lines and cooperative precision

**Default Q1 routes (5):** `VG-VGT01`, `VG-VGT02`, `VG-VGT04`, `VG-AW02`, `VG-AW05`

**Coverage domains:** Vanguard, Awareness

> **Shield Captain Theron:** A single clear sight line can protect more people than a dozen unplanned shots.

During a reconnaissance exercise, a hostile observation droid watches a narrow pass. One friendly lookout can see its antenna, another its route, and you can see its body through broken cover. The droid will transmit the column’s location if it completes its next scan.

**Which method do you use?**

**A. I identify the droid’s exact position and designate it for the lookout with the clearest follow-up shot.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `accuracy`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `targeting`, `teamwork`.
- **Interpretation:** I identify the droid’s exact position and designate it for the lookout with the clearest follow-up shot.
- **Published development direction / legal boundary:** Vanguard: Mark the Target; targeting benefit must satisfy printed restrictions.

**B. I take an opening shot meant to weaken its defenses for whoever fires next.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalSupport`, `accuracy`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `targeting`, `precision`.
- **Interpretation:** I take an opening shot meant to weaken its defenses for whoever fires next.
- **Published development direction / legal boundary:** Vanguard: Soften the Target; avoid implying a particular vehicle-mounted weapon.

**C. I combine the lookouts’ sight reports into a single firing solution before committing anyone.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `formation`, `informationControl`; `roleBiasKey`: `leader`; `ontologyTopicCandidates`: `tactics`, `sensors`.
- **Interpretation:** I combine the lookouts’ sight reports into a single firing solution before committing anyone.
- **Published development direction / legal boundary:** Vanguard: Triangulate, prerequisite Enhanced Vision; allied positioning is conditional.

**D. I study the exposed antenna and choose the part most likely to disrupt the scan.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalAwareness`, `accuracy`; `roleBiasKey`: `striker`; `ontologyTopicCandidates`: `precision`, `awareness`.
- **Interpretation:** I study the exposed antenna and choose the part most likely to disrupt the scan.
- **Published development direction / legal boundary:** Awareness: Weak Point and general tactical shot selection; no guaranteed mechanical system disable.

**E. I use the cover to wait for a clean shot rather than firing through uncertain concealment.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `accuracy`, `stealth`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `concealment`, `precision`.
- **Interpretation:** I use the cover to wait for a clean shot rather than firing through uncertain concealment.
- **Published development direction / legal boundary:** Awareness: Keen Shot addresses concealment, not automatic total-concealment bypass.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Vanguard: Mark the Target, Soften the Target, Triangulate (requires Enhanced Vision); Awareness: Weak Point and Keen Shot. Not automatic team-wide damage or unsupported network sharing.
**Special caution:** Lookouts exist only within the hypothetical scenario; no assumed actor squad.

### VG-Q3-S03 — The Position That Must Hold

**Decision focus:** Cover selection while reconning exposed ground

**Default Q1 routes (5):** `VG-VGT03`, `VG-VGT07`, `VG-AW06`, `VG-AW07`, `VG-SV01`

**Coverage domains:** Vanguard, Awareness, Survivor

> **Shield Captain Theron:** Courage does not replace geometry. Choose the cover that gives you time to report.

A scout observation post is discovered by long-range fire. You can crawl toward a collapsed wall, cross to a drainage ditch, or stay behind a thin service panel to finish transmitting your report. Each position exposes you to a different risk.

**How do you respond?**

**A. I move to solid cover that protects me while leaving a workable line for a final report.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `reactionDefense`, `tacticalAwareness`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `cover`, `positioning`.
- **Interpretation:** I move to solid cover that protects me while leaving a workable line for a final report.
- **Published development direction / legal boundary:** Vanguard: Maximize Cover; no blanket improvement outside printed cover rules.

**B. I change position as soon as the enemy starts to aim around the panel.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `evasion`, `initiative`; `roleBiasKey`: `skirmisher`; `ontologyTopicCandidates`: `evasion`, `mobility`.
- **Interpretation:** I change position as soon as the enemy starts to aim around the panel.
- **Published development direction / legal boundary:** Vanguard: Maximize Cover and Awareness reaction options; no automatic second movement.

**C. I keep my head down and endure just long enough to transmit the precise location of the attack.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `reactionDefense`, `informationControl`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `cover`, `recon`.
- **Interpretation:** I keep my head down and endure just long enough to transmit the precise location of the attack.
- **Published development direction / legal boundary:** Vanguard: Impenetrable Cover requires Maximize Cover; does not grant unconditional DR.

**D. I watch for a flanking attacker rather than trusting the wall to protect me from every direction.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalAwareness`, `reactionDefense`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `awareness`, `ambush_defense`.
- **Interpretation:** I watch for a flanking attacker rather than trusting the wall to protect me from every direction.
- **Published development direction / legal boundary:** Awareness: Uncanny Dodge I/II are separately prerequisite-gated.

**E. I reach the drainage ditch before the next area strike, sacrificing visibility for survivability.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `evasion`, `adaptability`; `roleBiasKey`: `skirmisher`; `ontologyTopicCandidates`: `evasion`, `mobility`.
- **Interpretation:** I reach the drainage ditch before the next area strike, sacrificing visibility for survivability.
- **Published development direction / legal boundary:** Survivor: Evasion has specific area-attack rules; not immunity to every explosion.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Vanguard: Maximize Cover, Impenetrable Cover; Awareness: Uncanny Dodge I/II; Survivor: Evasion. Cover and reflex benefits remain talent- and circumstance-dependent.
**Special caution:** Damage-reduction candidate expresses desire for durability, not claim that Impenetrable Cover equals DR.

### VG-Q3-S04 — The First Shot

**Decision focus:** Judgment under surprise: strike, wait, disable or warn

**Default Q1 routes (5):** `VG-VGT06`, `VG-VGT08`, `VG-AW03`, `VG-AW04`, `VG-CF01`

**Coverage domains:** Vanguard, Awareness

> **Shield Captain Theron:** The first shot is a responsibility. It tells everyone else what kind of battle follows.

You find a concealed firing position above a camp where an armed raiding party is preparing to move. They are not yet aware of you. A supply cart nearby may contain stolen medicine, but you cannot tell whether civilians are inside the camp. The relief column needs warning soon.

**What is your first action?**

**A. I observe just long enough to identify the raiders’ route, then send a warning rather than start a fight.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `informationControl`, `stealth`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `recon`, `concealment`.
- **Interpretation:** I observe just long enough to identify the raiders’ route, then send a warning rather than start a fight.
- **Published development direction / legal boundary:** Vanguard scouting and reporting; no automatic communication device.

**B. I attack the most dangerous visible weapon from concealment before the group can react.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `deadlyPrecision`, `initiative`; `roleBiasKey`: `striker`; `ontologyTopicCandidates`: `ambush`, `precision`.
- **Interpretation:** I attack the most dangerous visible weapon from concealment before the group can react.
- **Published development direction / legal boundary:** Vanguard: Invisible Attacker / Surprise Attack directions, each with distinct prerequisites and levels.

**C. I choose a shot meant to expose the raiders to the column’s defenders instead of chasing the largest hit.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `allySupport`, `tacticalSupport`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `targeting`, `teamwork`.
- **Interpretation:** I choose a shot meant to expose the raiders to the column’s defenders instead of chasing the largest hit.
- **Published development direction / legal boundary:** Vanguard: Mark the Target or Soften the Target; no shared attack grant by default.

**D. I stay hidden, reposition and verify whether the supply cart contains people before selecting a target.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalAwareness`, `evasion`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `stealth`, `awareness`.
- **Interpretation:** I stay hidden, reposition and verify whether the supply cart contains people before selecting a target.
- **Published development direction / legal boundary:** Awareness: Improved Initiative/Reset Initiative may support readiness, not proof of combat history.

**E. I strike an exposed area to disrupt the raiders’ approach, then retreat before they can surround me.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `areaControl`, `commandoTactics`; `roleBiasKey`: `skirmisher`; `ontologyTopicCandidates`: `battlefield_control`, `mobility`.
- **Interpretation:** I strike an exposed area to disrupt the raiders’ approach, then retreat before they can surround me.
- **Published development direction / legal boundary:** Vanguard: Shellshock requires Soften the Target; ordinary area attack rules remain.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Vanguard: Invisible Attacker (requires Maximize Cover), Shellshock (requires Soften the Target), Surprise Attack starts class level 2 and applies to first qualifying attack roll per round, not automatic bonus damage.
**Special caution:** First-shot choices do not imply the actor owns Surprise Attack before Vanguard 2.

### VG-Q3-S05 — Carry the Warning Home

**Decision focus:** Reconnaissance extraction under environmental pressure

**Default Q1 routes (5):** `VG-SV02`, `VG-SV03`, `VG-SV04`, `VG-ID02`, `VG-NEUTRAL`

**Coverage domains:** Survivor, Vanguard, Identity

> **Shield Captain Theron:** A warning that dies with its messenger protects no one.

A storm sweeps across the trail behind your observation post. The direct path back to the column is exposed, a rocky shortcut is difficult to traverse, and a narrow tunnel may be watched by enemy scouts. You have confirmed hostile movement and need to relay it.

**How do you get the information back?**

**A. I take the rocky shortcut and use careful footing to stay ahead of the approaching scouts.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `survivalSkills`, `evasionTactics`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `mobility`, `survival`.
- **Interpretation:** I take the rocky shortcut and use careful footing to stay ahead of the approaching scouts.
- **Published development direction / legal boundary:** Survivor: Surefooted; terrain and check conditions still apply.

**B. I run the exposed route before the storm closes it, trusting speed rather than concealment.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `rapidResponse`, `initiative`; `roleBiasKey`: `skirmisher`; `ontologyTopicCandidates`: `movement`, `mobility`.
- **Interpretation:** I run the exposed route before the storm closes it, trusting speed rather than concealment.
- **Published development direction / legal boundary:** Survivor: Sprint; only applies to legal run-action movement.

**C. I shift a fallen obstacle long enough to make a passable route for myself and anyone behind me.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `resourcefulness`, `allySupport`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `movement`, `support`.
- **Interpretation:** I shift a fallen obstacle long enough to make a passable route for myself and anyone behind me.
- **Published development direction / legal boundary:** Survivor: Extreme Effort is a limited Strength-check boost, not automatic clearance.

**D. I use cover to approach the tunnel and verify who is watching it before committing to the passage.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `stealth`, `tacticalAwareness`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `recon`, `cover`.
- **Interpretation:** I use cover to approach the tunnel and verify who is watching it before committing to the passage.
- **Published development direction / legal boundary:** Vanguard/Awareness and normal skill use; no assumed stealth invisibility.

**E. I send the shortest reliable warning I can now and then choose the safest route back.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `informationControl`, `allySupport`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `recon`, `support`.
- **Interpretation:** I send the shortest reliable warning I can now and then choose the safest route back.
- **Published development direction / legal boundary:** Vanguard advance-warning role; no guaranteed communications hardware.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Survivor: Extreme Effort, Sprint and Surefooted; Vanguard: reconnaissance role. Speed/terrain talents do not automatically permit stealth or avoid every encounter.
**Special caution:** Do not invent an owned squad, tracking feat or guaranteed communication channel.

## Martial Arts Master — Master Zhen (`m32`)

**Mentor voice source:** `data/dialogue/mentors/zhen/zhen_dialogue.json`

**Shared introduction (DRAFT):**

> An empty hand offers many answers. The first test is not how hard you strike. It is whether you understand what the moment asks of you.

### MAM-Q3-S01 — The Blade in the Market

**Decision focus:** Unarmed restraint, disarm and civilian protection

**Default Q1 routes (5):** `MAM-MF03`, `MAM-MF05`, `MAM-TK03`, `MAM-ID01`, `MAM-AW07`

**Coverage domains:** Martial Arts Forms, Master of Teras Kasi, Awareness

> **Master Zhen:** A weapon can frighten a crowd. The hand that meets it must not become another weapon without thought.

An armed aggressor threatens a merchant in a crowded market passage. People are close enough that a reckless strike could injure someone else. The aggressor has not noticed the clear path behind you, and you have no weapon in hand.

**How do you intervene?**

**A. I close the distance carefully and try to take the weapon without turning the crowd into the battlefield.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `unarmeddMastery`, `grappling`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `unarmed`, `control`.
- **Interpretation:** I close the distance carefully and try to take the weapon without turning the crowd into the battlefield.
- **Published development direction / legal boundary:** Martial Arts Forms: K’tara Expertise; disarming still uses printed conditions.

**B. I move between the aggressor and the merchant, keeping my defense intact until the crowd clears.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `reactionDefense`, `allySupport`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `defense`, `positioning`.
- **Interpretation:** I move between the aggressor and the merchant, keeping my defense intact until the crowd clears.
- **Published development direction / legal boundary:** General defensive action; awareness and martial-arts form mechanics require qualification.

**C. I use a short, controlled unarmed strike to interrupt the threat instead of trying to overpower them.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `unarmeddMastery`, `conditionTrack`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `unarmed`, `martial_arts`.
- **Interpretation:** I use a short, controlled unarmed strike to interrupt the threat instead of trying to overpower them.
- **Published development direction / legal boundary:** Martial Arts Forms: Hijkata/Tae-Jitsu concepts; do not assume automatic incapacitation.

**D. I watch their grip and footwork for the moment they can be redirected away from the merchant.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalAwareness`, `reactionDefense`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `awareness`, `positioning`.
- **Interpretation:** I watch their grip and footwork for the moment they can be redirected away from the merchant.
- **Published development direction / legal boundary:** Awareness and martial movement; does not grant unverified Teräs Käsi Unarmed Parry.

**E. I speak firmly and leave them a route to surrender before I commit to an exchange.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `persuasionMastery`, `allySupport`; `roleBiasKey`: `support`; `ontologyTopicCandidates`: `social`, `support`.
- **Interpretation:** I speak firmly and leave them a route to surrender before I commit to an exchange.
- **Published development direction / legal boundary:** A character can attempt ordinary persuasion; no Martial Arts Master talent is automatically a social success.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Martial Arts Forms: K’tara Expertise (disarm); K’thri and related discipline options require specific legal ownership. The Master of Teräs Käsi tree is printed-accessible but five individual source records remain quarantined for effect-level certification.
**Special caution:** The source-incomplete Teräs Käsi record must not be presented as granted protection or an exact selectable effect.

### MAM-Q3-S02 — Two Angles, One Breath

**Decision focus:** Awareness and mobility against multiple attackers

**Default Q1 routes (6):** `MAM-AW06`, `MAM-AW08`, `MAM-AW04`, `MAM-MF04`, `MAM-UM01`, `MAM-TK02`

**Coverage domains:** Awareness, Martial Arts Forms, Unarmed Mastery

> **Master Zhen:** One opponent draws the eyes. The other waits for the mind to forget them.

Two opponents approach from different sides in a training ring. One advances rapidly while the other waits to strike when you turn. The ring is small, and your footing changes on loose sand. The exercise ends if you lose balance or leave the marked boundary.

**How do you meet the attack?**

**A. I keep both opponents in view and change my position so neither reaches my back.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `tacticalAwareness`, `evasion`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `positioning`, `awareness`.
- **Interpretation:** I keep both opponents in view and change my position so neither reaches my back.
- **Published development direction / legal boundary:** Awareness: Uncanny Dodge II is a distinct prerequisite-gated talent.

**B. I watch the patient opponent for their first real commitment rather than reacting to every feint.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `initiative`, `knowledgeMastery`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `awareness`, `tactics`.
- **Interpretation:** I watch the patient opponent for their first real commitment rather than reacting to every feint.
- **Published development direction / legal boundary:** Awareness: Improved Initiative/Acute Senses are potential directions; exact Initiative tag needs operative check interaction.

**C. I move with the first attack, using that momentum to keep the second opponent out of reach.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `combatFlow`, `combatAdaptability`; `roleBiasKey`: `skirmisher`; `ontologyTopicCandidates`: `movement`, `unarmed`.
- **Interpretation:** I move with the first attack, using that momentum to keep the second opponent out of reach.
- **Published development direction / legal boundary:** Martial Arts Forms movement/stance; does not imply a free additional move action.

**D. I meet the first opening with several controlled unarmed attacks while preserving my footing for the second.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `unarmeddMastery`, `accuracy`; `roleBiasKey`: `striker`; `ontologyTopicCandidates`: `unarmed`, `precision`.
- **Interpretation:** I meet the first opening with several controlled unarmed attacks while preserving my footing for the second.
- **Published development direction / legal boundary:** Unarmed Mastery: Flurry of Blows; attack-roll limits and prerequisites apply.

**E. I take a defensive stance and let the impatient opponent show me where their balance fails.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `combatAdaptability`, `reactionDefense`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `fighting_defensively`, `unarmed`.
- **Interpretation:** I take a defensive stance and let the impatient opponent show me where their balance fails.
- **Published development direction / legal boundary:** General defensive action; Teräs Käsi Unarmed Counterstrike is not mechanically certified.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Awareness: Acute Senses, Improved Initiative, Uncanny Dodge II; Martial Arts Forms: K’thri Expertise; Unarmed Mastery: Flurry of Blows. None is assumed already owned.
**Special caution:** Training ring and opponents are hypothetical, not remembered martial-arts history.

### MAM-Q3-S03 — The Opponent Who Will Not Fall

**Decision focus:** Managing an armored opponent using control, precision and stamina

**Default Q1 routes (5):** `MAM-AW02`, `MAM-MF01`, `MAM-MF06`, `MAM-UM02`, `MAM-TK04`

**Coverage domains:** Martial Arts Forms, Unarmed Mastery, Awareness

> **Master Zhen:** Armor is an answer to a certain kind of force. Do not ask that question again and again.

A physically powerful opponent in reinforced armor blocks a doorway during a rescue. Your hands are empty, and pushing straight through the armor is unlikely to end the struggle quickly. The opponent is aggressive but slow to recover their stance after each charge.

**Which technique do you choose?**

**A. I look for the joint or exposed opening where a precise unarmed blow matters more than brute force.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `deadlyPrecision`, `unarmeddMastery`; `roleBiasKey`: `striker`; `ontologyTopicCandidates`: `precision`, `unarmed`.
- **Interpretation:** I look for the joint or exposed opening where a precise unarmed blow matters more than brute force.
- **Published development direction / legal boundary:** Martial Arts Forms: Echani Expertise; no unconditional armor or DR bypass.

**B. I build pressure through repeated measured strikes rather than spending everything on one blow.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `combatStamina`, `unarmeddMastery`; `roleBiasKey`: `bruiser`; `ontologyTopicCandidates`: `unarmed`, `sustained_damage`.
- **Interpretation:** I build pressure through repeated measured strikes rather than spending everything on one blow.
- **Published development direction / legal boundary:** Unarmed Mastery: Hardened Strike; damage-resolution conditions apply.

**C. I redirect the next charge into the doorway frame and use the moment to pass rather than win a contest of strength.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `combatAdaptability`, `evasion`; `roleBiasKey`: `skirmisher`; `ontologyTopicCandidates`: `positioning`, `control`.
- **Interpretation:** I redirect the next charge into the doorway frame and use the moment to pass rather than win a contest of strength.
- **Published development direction / legal boundary:** Martial Arts Forms/positioning choices; no free forced movement effect.

**D. I target the opponent’s balance and make them spend effort recovering before they can attack again.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `grappling`, `areaControl`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `unarmed`, `control`.
- **Interpretation:** I target the opponent’s balance and make them spend effort recovering before they can attack again.
- **Published development direction / legal boundary:** Martial Arts Forms: Tae-Jitsu / Hijkata conditions; no generic condition-track shift.

**E. I keep the exchange short and safe, waiting for an opening to restrain them instead of gambling on damage.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `reactionDefense`, `grappling`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `grapple`, `defense`.
- **Interpretation:** I keep the exchange short and safe, waiting for an opening to restrain them instead of gambling on damage.
- **Published development direction / legal boundary:** General grapple rules; Teräs Käsi Ignore Damage Reduction not mechanically certified.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Martial Arts Forms: Echani and Tae-Jitsu options; Unarmed Mastery: Hardened Strike. Teräs Käsi Ignore Damage Reduction remains effect-level source-quarantined.
**Special caution:** A printed access tree is not an endorsement of quarantined effect-level records.

### MAM-Q3-S04 — The Grip That Becomes a Trap

**Decision focus:** Grapple, disarm and control without an unnecessary finishing blow

**Default Q1 routes (6):** `MAM-MF02`, `MAM-MF07`, `MAM-TK01`, `MAM-TK05`, `MAM-ID02`, `MAM-NEUTRAL`

**Coverage domains:** Martial Arts Forms, Master of Teras Kasi, Identity

> **Master Zhen:** A contest of strength ends when someone understands the hold. Not when someone proves they can break a bone.

A rival challenges you to stop them escaping a practice circle without striking their head or throat. They are stronger than you and know how to shift their weight when grabbed. A successful hold must be controlled; injury would forfeit the exercise.

**What approach do you take?**

**A. I let them commit their weight, then move my grip to the side where their strength cannot help them.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `grappling`, `tacticalAwareness`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `grapple`, `positioning`.
- **Interpretation:** I let them commit their weight, then move my grip to the side where their strength cannot help them.
- **Published development direction / legal boundary:** Martial Arts Forms: Stava Expertise; resolve normal opposed grapple rules.

**B. I maintain distance until I can establish one secure hold, rather than reaching repeatedly into a counter.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `reactionDefense`, `grappling`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `defense`, `unarmed`.
- **Interpretation:** I maintain distance until I can establish one secure hold, rather than reaching repeatedly into a counter.
- **Published development direction / legal boundary:** Martial Arts Forms and general defense; not an automatic Teräs Käsi mastery feature.

**C. I use their escape attempt to shift our footing and make their next move harder.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `combatFlow`, `areaControl`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `grapple`, `control`.
- **Interpretation:** I use their escape attempt to shift our footing and make their next move harder.
- **Published development direction / legal boundary:** Stava-related grapple control is the candidate direction; do not award movement denial without a source-certified talent.

**D. I disengage when the hold becomes unsafe, then take a calmer opening instead of forcing the result.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `evasion`, `adaptability`; `roleBiasKey`: `skirmisher`; `ontologyTopicCandidates`: `mobility`, `unarmed`.
- **Interpretation:** I disengage when the hold becomes unsafe, then take a calmer opening instead of forcing the result.
- **Published development direction / legal boundary:** General defensive/mobility rules; candidate Teräs Käsi effects are quarantined.

**E. I finish the exercise by controlling their movement, not by causing injury that violates its purpose.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `unarmeddMastery`, `combatAdaptability`; `roleBiasKey`: `controller`; `ontologyTopicCandidates`: `grapple`, `nonlethal`.
- **Interpretation:** I finish the exercise by controlling their movement, not by causing injury that violates its purpose.
- **Published development direction / legal boundary:** Martial Arts Forms: Stava expertise; nonlethal outcomes are not guaranteed by intent.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Martial Arts Forms: Stava Expertise and related unarmed control; Teräs Käsi Basics/Mastery talent names are indexed but their complete printed effect descriptions remain unverified.
**Special caution:** The opponent and exercise are hypothetical. No formal school, student, or learned tradition is implied.

### MAM-Q3-S05 — The Trail and the Last Exchange

**Decision focus:** Tracking an opponent through difficult terrain into an exhausting final exchange

**Default Q1 routes (5):** `MAM-AW01`, `MAM-AW03`, `MAM-AW05`, `MAM-UM03`, `MAM-CF01`

**Coverage domains:** Awareness, Unarmed Mastery, Class Features

> **Master Zhen:** Fatigue reveals what the body has memorized. The mind must still decide.

An opponent carrying stolen medical supplies flees over stony ground, leaving an uneven trail before stopping at a narrow archway. They shift stance and begin attacking in irregular bursts. The trail may reveal another escape route, but fatigue is making both pursuit and defense harder.

**How do you use the next exchange?**

**A. I read the trail and the changes in their footwork before deciding where to close the distance.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `trackingMastery`, `tacticalAwareness`; `roleBiasKey`: `scout`; `ontologyTopicCandidates`: `awareness`, `tactics`.
- **Interpretation:** Recover pursuit intelligence without assuming a trained special tracking technique.
- **Published development direction / legal boundary:** Awareness: Expert Tracker (with Acute Senses prerequisite); tracking is not a free class feature.

**B. I take the smallest opening with one precise strike rather than chase a reckless finishing blow.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `accuracy`, `unarmeddMastery`; `roleBiasKey`: `striker`; `ontologyTopicCandidates`: `precision`, `unarmed`.
- **Interpretation:** I take the smallest opening with one precise strike rather than chase a reckless finishing blow.
- **Published development direction / legal boundary:** Martial Arts Forms: Echani / Unarmed Mastery attack precision directions.

**C. I keep my stance and breathing steady so fatigue does not decide my timing for me.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `combatStamina`, `reactionDefense`; `roleBiasKey`: `defender`; `ontologyTopicCandidates`: `resilience`, `defense`.
- **Interpretation:** I keep my stance and breathing steady so fatigue does not decide my timing for me.
- **Published development direction / legal boundary:** Tough as Durasteel is later-level conditional bonus HP, not passive DR.

**D. I use one successful hit as the beginning of a controlled second strike, if the opening truly remains.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `combatFlow`, `unarmeddMastery`; `roleBiasKey`: `striker`; `ontologyTopicCandidates`: `unarmed`, `action_economy`.
- **Interpretation:** I use one successful hit as the beginning of a controlled second strike, if the opening truly remains.
- **Published development direction / legal boundary:** Unarmed Mastery: Punishing Strike; confirm critical/trigger and action conditions.

**E. I step back and reset the distance rather than let the opponent’s new rhythm dictate the rest of the fight.**

- **Developer signals — candidate only:** `mechanicalBiasKeys`: `evasion`, `combatAdaptability`; `roleBiasKey`: `skirmisher`; `ontologyTopicCandidates`: `mobility`, `positioning`.
- **Interpretation:** I step back and reset the distance rather than let the opponent’s new rhythm dictate the rest of the fight.
- **Published development direction / legal boundary:** Awareness and general defensive movement; no automatic free withdrawal.

**Separate unscored option:** “I am not sure how I would handle this yet.”

**Unscored navigation:** “Try another situation.”

**Developer teaching note:** Awareness: Expert Tracker, Reset Initiative, Keen Shot as indexed mixed-domain options; Unarmed Mastery: Punishing Strike. Tough as Durasteel begins at class level 2 and gives conditional bonus HP after unarmed damage in light/no armor, not damage reduction.
**Special caution:** Tough as Durasteel begins at Martial Arts Master level 2, not level 1, and is not DR.

## Routing and acceptance gates

Each route ID below is an **exact Q1 response ID**, preserved from the already-authored Q1 bank. This is **default scene relevance**, not a scored Q1→Q3 conversion and not proof the underlying Q1 mechanical anchor is source certified.

### Outlaw — all 32 Q1 routes

- `OL-Q3-S01` The Checkpoint That Was Not There: `OL-SL02`, `OL-SL03`, `OL-SL04`, `OL-SL05`, `OL-SL06`, `OL-FR01`, `OL-FR09`
- `OL-Q3-S02` The Pursuit Changes Direction: `OL-OL01`, `OL-OL02`, `OL-OL03`, `OL-OL04`, `OL-OL05`, `OL-OL06`, `OL-OL07`, `OL-OL08`, `OL-SV03`, `OL-CF01`
- `OL-Q3-S03` The Price of a Spare Part: `OL-FR02`, `OL-FR04`, `OL-FR05`, `OL-FR06`, `OL-SV02`, `OL-ID02`
- `OL-Q3-S04` A Fugitive at Your Door: `OL-SV01`, `OL-SV04`, `OL-ID01`, `OL-NEUTRAL`
- `OL-Q3-S05` The Terminal with Two Stories: `OL-FR03`, `OL-FR07`, `OL-FR08`, `OL-SL01`, `OL-SL07`

### Droid Commander — all 30 Q1 routes

- `DC-Q3-S01` The Silent Relay: `DC-DCT01`, `DC-DCT02`, `DC-DCT06`, `DC-CF01`, `DC-LEA04`, `DC-LEA09`, `DC-INS04`
- `DC-Q3-S02` The Damaged Unit: `DC-DCT04`, `DC-LEA05`, `DC-INS07`, `DC-INS03`, `DC-LEA03`, `DC-LEA01`
- `DC-Q3-S03` A Narrow Opening: `DC-DCT03`, `DC-DCT05`, `DC-DCT07`, `DC-INS01`, `DC-INS02`, `DC-LEA07`, `DC-LEA10`
- `DC-Q3-S04` Two Conflicting Directives: `DC-LEA02`, `DC-LEA06`, `DC-LEA11`, `DC-INS05`, `DC-INS06`
- `DC-Q3-S05` The Objective Has Changed: `DC-DCT08`, `DC-LEA08`, `DC-ID01`, `DC-ID02`, `DC-NEUTRAL`

### Military Engineer — all 18 Q1 routes

- `MENG-Q3-S01` The Last Crossing: `ME-ENG02`, `ME-ENG04`
- `MENG-Q3-S02` The Disabled Walker: `ME-ENG01`, `ME-ENG05`, `ME-ENG07`, `ME-OT02`
- `MENG-Q3-S03` A Wall with One Weak Point: `ME-ENG06`, `ME-ENG08`, `ME-ENG10`
- `MENG-Q3-S04` Built from Scrap: `ME-ENG03`, `ME-ENG09`, `ME-CF01`, `ME-ID02`, `ME-OT01`
- `MENG-Q3-S05` Locked Out of the Controls: `ME-OT03`, `ME-OT04`, `ME-ID01`, `ME-NEUTRAL`

### Vanguard — all 24 Q1 routes

- `VG-Q3-S01` The Unmarked Patrol: `VG-VGT05`, `VG-AW08`, `VG-AW01`, `VG-ID01`
- `VG-Q3-S02` Three Lines of Fire: `VG-VGT01`, `VG-VGT02`, `VG-VGT04`, `VG-AW02`, `VG-AW05`
- `VG-Q3-S03` The Position That Must Hold: `VG-VGT03`, `VG-VGT07`, `VG-AW06`, `VG-AW07`, `VG-SV01`
- `VG-Q3-S04` The First Shot: `VG-VGT06`, `VG-VGT08`, `VG-AW03`, `VG-AW04`, `VG-CF01`
- `VG-Q3-S05` Carry the Warning Home: `VG-SV02`, `VG-SV03`, `VG-SV04`, `VG-ID02`, `VG-NEUTRAL`

### Martial Arts Master — all 27 Q1 routes

- `MAM-Q3-S01` The Blade in the Market: `MAM-MF03`, `MAM-MF05`, `MAM-TK03`, `MAM-ID01`, `MAM-AW07`
- `MAM-Q3-S02` Two Angles, One Breath: `MAM-AW06`, `MAM-AW08`, `MAM-AW04`, `MAM-MF04`, `MAM-UM01`, `MAM-TK02`
- `MAM-Q3-S03` The Opponent Who Will Not Fall: `MAM-AW02`, `MAM-MF01`, `MAM-MF06`, `MAM-UM02`, `MAM-TK04`
- `MAM-Q3-S04` The Grip That Becomes a Trap: `MAM-MF02`, `MAM-MF07`, `MAM-TK01`, `MAM-TK05`, `MAM-ID02`, `MAM-NEUTRAL`
- `MAM-Q3-S05` The Trail and the Last Exchange: `MAM-AW01`, `MAM-AW03`, `MAM-AW05`, `MAM-UM03`, `MAM-CF01`

### Structural validation executed

- Five class identities; five preauthored scenarios per class; five substantive A–E options per scenario: **PASS**.
- 25 distinct scenario IDs, 125 distinct response IDs, and 125 distinct first-person response texts: **PASS**.
- 131/131 Q1 answer IDs routed exactly once with no repeated or missing IDs: **PASS**.
- All emitted candidate bias names, role names and ontology topic identifiers occur in the repository-inspected canonical vocabularies: **PASS (identifier membership only)**.
- Source-specific restrictions remain cautions; automatic feature grants and unverified Q1 quarantined records are not converted into legal selectable talents: **editorial review required before production**.
- No Foundry actor transaction, no live engine scores, no registered suggestion weights, no GitHub operations were executed.

**Owner gate:** Review dialogue, scenario diversity, class-identity fit and each developer mapping before any promotion from this editorial v0.1 library to V2 runtime. Keep prior batch approvals independent.


> **v0.2 namespace erratum:** Military Engineer Q3 IDs now use `MENG-Q3-` to prevent collision with Medic `ME-Q3-` from Batch 4. This changes five scene IDs and 25 answer IDs only; Q1 IDs, text, routes and mechanical interpretations are otherwise unchanged. Original Batch 5 v0.1 remains archived.


---

# SOURCE DOCUMENT: Final Six — `SWSE_Prestige_Q3_Final_Six_Classes_v01.md`

# SWSE Prestige Survey — Q3 The Responsibility — Final Six Classes

**Date:** November 15, 2026  |  **Version:** v0.1  |  **Status:** COMPLETE FIRST-PASS EDITORIAL DRAFT; PENDING OWNER REVIEW AND MECHANICAL CERTIFICATION.

**Scope:** Imperial Knight, Shaper, Assassin, Charlatan, Improviser and Pathfinder. These finish the 32-prestige-class sourcebook census; the first 26 classes remain in their earlier approved/reference and draft packages.

## Operating contract

A character receives one of five authored class-specific hypothetical situations according to the actual prior Q1 response ID. They choose one of five first-person responses. Q1 and Q2 do not become additional votes in Q3; actual Q3 selection alone is hypothetical future-method evidence. All scenario decisions are *aspirational*, not claims that the actor has already completed a mission, learned a specific ability, commanded a squad, acquired equipment, or met the Mentor.

All suggested `mechanicalBiasKeys`, `roleBiasKey` and `ontologyTopicCandidates` are **editorial candidate strings** existing in observed V2 data, not validated talent-to-ontology effects or confirmed Suggestion Engine intake/weights. The 190-tag ontology EXACT_SKILL_POLICY is not bypassed by narrative references to technical skills. Do not add any new scorer, crosswalk, runtime signal weights or actor mutations from this design alone.

**Draft UX (not owner-approved):** A separate, unscored “I am not sure yet” and an unscored “Try another situation” option may be offered without counting as one of the five substantive answers.

## Six-class completion ledger

| Class | Mentor | Scenes | Answers | Q1 route coverage |
|---|---|---:|---:|---:|
| Imperial Knight | Dezmin | 5 | 25 | 48/48 |
| Shaper | Shaper Urza | 5 | 25 | 23/23 |
| Assassin | Delta | 5 | 25 | 39/39 |
| Charlatan | Silvertongue Sela | 5 | 25 | 30/30 |
| Improviser | Lucky Jack | 5 | 25 | 19/19 |
| Pathfinder | Lead | 5 | 25 | 26/26 |
| **Total** | | **30** | **150** | **185/185** |

## Source-specific issue ledger — preserve until owner and mechanic review

### Imperial Knight
- Printed entry includes being a sworn defender of Emperor Roan Fel; no invented posting, personal audience, rank, or prior service is assumed.
- Imperial Knights reject dark-side use under printed rules. Mentor level-greeting references to a gray path are not treated as canonical permission.
- Force Techniques start at Imperial Knight level 2, not the first prestige talent selection.
- Armor Mastery exists as separate Armor Specialist and Knight’s Armor rules identities; do not merge by identical display name.

### Shaper
- Shaper entry specifically requires Yuuzhan Vong species, Biotech Specialist feat and trained Knowledge (life sciences) and Treat Injury.
- Shapers never gain Force Points under printed class rules; do not generate Force-based development signals.
- Implants require a willing adjacent living subject and have a significant persistent -3 condition-track cost after their encounter; no risk-free enhancement.
- Shaper Lore starts at class level 2 and Shaper Hand at class level 6; the Q3 narrative grants neither.
- Biotech Specialist and Biotech Surgery are different prerequisites; informed consent is not a substitute for either.

### Assassin
- Entry includes trained Stealth, Sniper feat and Dastardly Strike; these are verified prerequisites only when actual actor data confirms them.
- Assassin’s Mark is a class feature at level 2, not granted at entry. No assumed murder history, paid contract, or personal kill count.
- Malkite Poisoner names are talent directions only; no poison possession, automatic application, or exemption from relevant saves and prerequisites.
- GenoHaradan talent-tree reference has conflicting raw registry name vs source-ID data; source-key reconciliation remains open. Access is not proof of faction membership.
- Delta is cocky, sharp and technically practical, not a solemn, anonymous assassin archetype.

### Charlatan
- Printed Charlatan access includes Disgrace, Trickery, and Fortune, but repository class-tree list omits Fortune; keep source-backed editorial routes and flag runtime access.
- Score starts at Charlatan level 2; Swindle starts at level 4. Neither grants credits, favors or automatic Persuasion success at entry.
- Disgrace/Influence/Lineage entry prerequisites do not all become Charlatan selectable class talent trees.
- No prior con, false identity, criminal conviction, romance, or successful theft is assumed for the player.
- Sela’s speech remains warm, teasing, confident, and playful; choices cannot be interpreted as automatic moral alignment.

### Improviser
- Improviser entry requires level 7, trained Mechanics and Use Computer, and Skill Focus (Mechanics).
- No Tools Required is a first-level class feature. Contraband begins at class level 2, not a stockpile or automatic starting equipment.
- Improvised Device is temporary and has time, DC, material/cost, and encounter limitations; it is not a permanent inventory item.
- Capture Droid applies to a qualifying disabled droid, lasts temporarily, and destroys the controlled droid at encounter end. No assumption of ethical entitlement or droid ownership.
- Lucky Jack’s chaotic, fast, playful voice is preserved without claiming he trained the player or that prior repairs occurred.

### Pathfinder
- Entry includes trained Perception and Survival plus two qualifying Awareness/Camouflage/Survivor talents. Camouflage is entry qualification, not a selectable Pathfinder class talent tree.
- Pathfinder may select Pathfinder, Awareness and Survivor talents; no assumed Rebel Alliance affiliation or assigned military unit.
- Create Cover begins at class level 2 and is separate from the Safe Zone talent and ordinary terrain cover.
- Lead has established dry, skeptical Scout/Argent Squad dialogue. Her Pathfinder greetings imply specific training history that is not used as fact for an unproven character.

## All 30 scenes and 150 first-person answers

## Imperial Knight — Dezmin (`m13`)

**Voice authority:** `data/dialogue/mentors/dezmin/dezmin_dialogue.json`  |  **Printed book:** Legacy Era Campaign Guide, printed pp. 43–45

**Shared Mentor introduction (DRAFT)**
> The oath directs your service. It does not replace judgment. Consider what your duty will require when the easy response is the wrong one.

### IK-Q3-S01 — A Convoy Between Two Fires

**Decision focus:** Protecting vulnerable travelers while coordinating allied defense
**Primary Q1 routes (13):** `IK-KR01`, `IK-KR02`, `IK-KR03`, `IK-KR04`, `IK-KR05`, `IK-LC01`, `IK-LC02`, `IK-LC03`, `IK-LC06`, `IK-LC07`, `IK-LC08`, `IK-LC10`, `IK-ID01`
**Coverage domains:** Knight’s Resolve, Lightsaber Combat, Identity

> **Dezmin:** An oath is tested where another person must trust your restraint.

A civilian relief convoy is trapped between automated turrets and a collapsed retaining wall. An allied guard has taken position beside the lead transport, and another moves to clear a path. The civilians can remain sheltered only briefly; a direct charge would draw fire toward them.

**How do you take responsibility for this passage?**

**A. I stay close to the guard and focus my blade on intercepting attacks that threaten the people behind us.**

- **Developer candidate identifiers:** `allySupport`, `reactionDefense`  |  role `defender`  |  ontology `block`, `deflect`
- **Interpretation:** Protection is the primary priority, with movement and weapon use subordinated to it.
- **Printed development / safety boundary:** Knight’s Resolve: Praetoria Ishu; Lightsaber Combat: Block/Deflect require actual talent access and valid attacks.

**B. I find the turret with the clearest angle and strike precisely enough to give the transports a moment to move.**

- **Developer candidate identifiers:** `accuracy`, `meleeDamage`  |  role `striker`  |  ontology `lightsaber`, `precision`
- **Interpretation:** Precision offense intended to open an evacuation window.
- **Printed development / safety boundary:** Lightsaber Combat: Weapon Specialization and general melee options; no automatic turret disabling.

**C. I watch my ally’s advance and time my own counterattack to support their next opening.**

- **Developer candidate identifiers:** `allySupport`, `counterAttack`  |  role `support`  |  ontology `ally-trigger`, `counterattack`
- **Interpretation:** Coordination prioritizes allied timing over solo aggression.
- **Printed development / safety boundary:** Knight’s Resolve: Strength of the Empire and Oath of Duty have specific allied triggers; no free combined attack.

**D. I draw incoming fire away from the crowded transport while we establish more secure cover.**

- **Developer candidate identifiers:** `armorMastery`, `defensiveSwordsmanship`  |  role `defender`  |  ontology `armor`, `cover`
- **Interpretation:** Durable interposition and positional defense.
- **Printed development / safety boundary:** Armor Specialist and Knight’s Armor offer distinct armor-related development, subject to prerequisites.

**E. I communicate a deliberate withdrawal sequence rather than ask the civilians to run into an uncertain opening.**

- **Developer candidate identifiers:** `commandAuthority`, `tacticalAwareness`  |  role `leader`  |  ontology `tactics`, `teamwork`
- **Interpretation:** Duty expressed as controlled evacuation planning.
- **Printed development / safety boundary:** An Imperial Knight oath is not an unrestricted command feature; any orders need cooperation or authority.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Knight’s Resolve: Praetoria Ishu, Oath of Duty, Knight’s Morale; Lightsaber Combat: Block and Deflect. Each needs its actual prerequisites and triggering situation.

### IK-Q3-S02 — The Disarmed Duel

**Decision focus:** Decisive action, disarmament, and lightsaber technique
**Primary Q1 routes (15):** `IK-DU01`, `IK-DU02`, `IK-DU03`, `IK-DU04`, `IK-DU05`, `IK-DU06`, `IK-DU07`, `IK-DU08`, `IK-DU09`, `IK-DU10`, `IK-DU11`, `IK-LC04`, `IK-LC05`, `IK-LC09`, `IK-LC11`
**Coverage domains:** Duelist, Lightsaber Combat

> **Dezmin:** Control the exchange. A strike need not become an execution.

A hostile lightsaber wielder blocks a narrow stairwell to an occupied shelter. Their weapon stance is aggressive, but a gap opens whenever they turn to threaten the people below. You have room for one committed action before the doorway closes.

**How do you use the opening?**

**A. I meet the next strike defensively and counter only when their momentum exposes a clear target.**

- **Developer candidate identifiers:** `counterMastery`, `reactionDefense`  |  role `defender`  |  ontology `block`, `counterattack`
- **Interpretation:** Patient defense creates a counterattack rather than gambling on initiative.
- **Printed development / safety boundary:** Duelist: Improved Riposte; Lightsaber Combat: Riposte and Block are prerequisite-gated.

**B. I aim for the weapon-bearing side to end the threat without making a killing blow my first choice.**

- **Developer candidate identifiers:** `deadlyPrecision`, `defensiveSwordsmanship`  |  role `controller`  |  ontology `melee`, `precision`
- **Interpretation:** Controlled disabling over elimination.
- **Printed development / safety boundary:** Duelist: Severing Strike is a specifically bounded damaging talent; do not promise safe automatic dismemberment.

**C. I use an off-hand blade only if it offers the shorter, cleaner path through their guard.**

- **Developer candidate identifiers:** `dualWield`, `formMastery`  |  role `striker`  |  ontology `dual_wield`, `lightsaber`
- **Interpretation:** Technical specialization in paired lightsabers.
- **Printed development / safety boundary:** Duelist: Shoto Master and Lightsaber Combat: Shoto Focus require suitable weapons/talents.

**D. I use a measured Force-guided throw to keep them from closing on the civilians.**

- **Developer candidate identifiers:** `meleeDamage`, `forceArtistry`  |  role `controller`  |  ontology `lightsaber`, `telekinesis`
- **Interpretation:** Reach and displacement through a disciplined blade technique.
- **Printed development / safety boundary:** Duelist: Thrown Lightsaber Mastery/Improved Lightsaber Throw and Lightsaber Combat: Lightsaber Throw have distinct conditions.

**E. I maintain precise footing and press with one reliable attack instead of losing control to a long flurry.**

- **Developer candidate identifiers:** `accuracy`, `dualistTechnique`  |  role `striker`  |  ontology `melee`, `weapon_specialization`
- **Interpretation:** Reliability and trained technique over risky volume.
- **Printed development / safety boundary:** Duelist: Greater Weapon Focus, Greater Weapon Specialization, and Multiattack Proficiency are separate effects.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Duelist: Improved Riposte, Severing Strike, shoto/two-weapon and lightsaber-focus options; no blanket entitlement to nonlethal limb removal.

### IK-Q3-S03 — The Armor Warning

**Decision focus:** Choosing protection when armor and equipment are compromised
**Primary Q1 routes (11):** `IK-AR01`, `IK-AR02`, `IK-AR03`, `IK-AR04`, `IK-AR05`, `IK-AR06`, `IK-KA01`, `IK-KA02`, `IK-KA03`, `IK-KA04`, `IK-KA05`
**Coverage domains:** Armor Specialist, Knight’s Armor

> **Dezmin:** Armor is a tool of service. Do not mistake it for judgment.

During a hazardous passage, your borrowed armor’s status display reports damage around one joint and a failing shield module. A companion has fallen behind near an exposed doorway. The next corridor has little cover and could bring another close fight.

**What receives your attention first?**

**A. I slow down just enough to stabilize the armor and keep my defenses reliable through the corridor.**

- **Developer candidate identifiers:** `armorMastery`, `reactionDefense`  |  role `defender`  |  ontology `armor`, `defense`
- **Interpretation:** Defense and equipment discipline before advancing.
- **Printed development / safety boundary:** Armor Specialist: Armored Defense/Improved Armored Defense; no free field repair or improved armor rating.

**B. I press forward with a controlled pace, trusting movement more than waiting in the exposed passage.**

- **Developer candidate identifiers:** `armorMastery`, `rapidResponse`  |  role `skirmisher`  |  ontology `armor`, `mobility`
- **Interpretation:** Mobility in armor prioritized under pressure.
- **Printed development / safety boundary:** Armor Specialist: Juggernaut or Armor Mastery; class talents do not replace movement requirements.

**C. I channel the Force into surviving the next heavy blow long enough to reach the companion.**

- **Developer candidate identifiers:** `forceDC`, `damageReduction`  |  role `defender`  |  ontology `force_defense`, `armor`
- **Interpretation:** Force-supported armored resilience rather than speed.
- **Printed development / safety boundary:** Knight’s Armor: Armored Augmentation I/II depend on specific action and prerequisites.

**D. I ready the gauntlet for the possibility that an armed opponent blocks the doorway.**

- **Developer candidate identifiers:** `counterMastery`, `defensiveSwordsmanship`  |  role `defender`  |  ontology `block`, `melee_defense`
- **Interpretation:** Close-range specialized defensive training.
- **Printed development / safety boundary:** Knight’s Armor: Cortosis Defense/Retaliation require the actual gauntlet and triggering events.

**E. I use the corridor’s remaining cover to protect both of us rather than count on damaged equipment alone.**

- **Developer candidate identifiers:** `tacticalAwareness`, `allySupport`  |  role `support`  |  ontology `cover`, `positioning`
- **Interpretation:** Situation-aware protection without assuming a special talent.
- **Printed development / safety boundary:** General positioning and equipment decisions; do not infer a class-level cover-sharing feature.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Armor Specialist: Armored Defense/Improved Armored Defense/Armor Mastery, Juggernaut and Second Skin; Knight’s Armor: Armored Augmentation and Cortosis Defense. Source identities differ.

### IK-Q3-S04 — Orders and Judgment

**Decision focus:** Responsible duty amid conflicting requests
**Primary Q1 routes (4):** `IK-ID02`, `IK-NEUTRAL`, `IK-FT01`, `IK-FT03`
**Coverage domains:** Knight identity, Force Technique

> **Dezmin:** Duty is not evaded by demanding that another person make the choice.

Two legitimate authorities request immediate assistance at the same frontier settlement. One asks you to secure the command center; another asks you to keep a medical evacuation corridor open. Neither request contains enough information to know which danger is greater, and the local dispatch network is failing.

**How do you approach the competing demands?**

**A. I check who will be exposed by each delay before agreeing to an order that cannot be reversed.**

- **Developer candidate identifiers:** `tacticalAwareness`, `knowledgeMastery`  |  role `leader`  |  ontology `planning`, `awareness`
- **Interpretation:** Deliberate information gathering before choosing a duty.
- **Printed development / safety boundary:** No universal command override; use real tactical information and local authority.

**B. I prioritize the corridor where people have no other defender and tell the other authority what I can still provide.**

- **Developer candidate identifiers:** `allySupport`, `commandAuthority`  |  role `defender`  |  ontology `leadership`, `support`
- **Interpretation:** Protective prioritization with transparent coordination.
- **Printed development / safety boundary:** Duty-driven identity intent; does not establish automatic authority over NPCs.

**C. I seek a quiet moment to center my judgment rather than decide from fear or anger.**

- **Developer candidate identifiers:** `forceRecovery`, `combatStamina`  |  role `utility`  |  ontology `meditation`, `force_training`
- **Interpretation:** Self-command and reflective preparation.
- **Printed development / safety boundary:** Future Force Technique: Improved Force Trance; not awarded at level 1.

**D. I conserve the resources I may need for the second emergency instead of spending them all on the first.**

- **Developer candidate identifiers:** `resourceControl`, `forceRecovery`  |  role `support`  |  ontology `resources`, `resource_recovery`
- **Interpretation:** Long-horizon resource discipline.
- **Printed development / safety boundary:** Future Force Technique: Force Point Recovery; resource limits and use timing remain printed mechanics.

**E. I state what I do not yet know and ask both parties for a verifiable update before dividing effort.**

- **Developer candidate identifiers:** `informationControl`, `allySupport`  |  role `leader`  |  ontology `tactics`, `teamwork`
- **Interpretation:** Shared facts over blind hierarchy.
- **Printed development / safety boundary:** Reasonable coordination is not mechanically guaranteed by class access.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** The Imperial Knight oath is canonically specific, but this hypothetical does not confer authority, resolve chains of command, or authorize dark-side compromises. Force Point Recovery and Improved Force Trance are later technique directions.

### IK-Q3-S05 — The Broken Signal

**Decision focus:** Force discipline and perception when conventional communication fails
**Primary Q1 routes (5):** `IK-FT02`, `IK-FT04`, `IK-FT05`, `IK-FT06`, `IK-FT07`
**Coverage domains:** Force Technique, Lightsaber discipline

> **Dezmin:** A silent channel is not the same thing as an empty battlefield.

A sensor blackout cuts off the emergency team at a remote relay. One ally is visible across a ravine; others are behind sealed blast doors. The local alarms provide contradictory information, and an unstable mechanical arm is moving above the walkway.

**What is the first technique or method you rely on?**

**A. I test the immediate area for danger rather than follow the loudest false alarm.**

- **Developer candidate identifiers:** `tacticalAwareness`, `forceArtistry`  |  role `scout`  |  ontology `senses`, `precognition`
- **Interpretation:** Perception and restraint before intervention.
- **Printed development / safety boundary:** Future Force Technique: Sense Surroundings; verify timing and limits.

**B. I look for a disturbance in the Force that might distinguish a living threat from faulty machinery.**

- **Developer candidate identifiers:** `knowledgeMastery`, `forceArtistry`  |  role `scout`  |  ontology `force`, `senses`
- **Interpretation:** Force sensitivity used as an information source.
- **Printed development / safety boundary:** Future Force Technique: Sense Force; no certainty about hidden creatures.

**C. I attempt a brief mental contact with the ally across the ravine instead of shouting over the alarms.**

- **Developer candidate identifiers:** `forceArtistry`, `allySupport`  |  role `support`  |  ontology `telepathy`, `force_support`
- **Interpretation:** Coordination through Force communication.
- **Printed development / safety boundary:** Future Force Technique: Telepathy; target and communication restrictions still govern.

**D. I move the small control lever out of danger if my skill allows it, not the entire broken mechanical arm.**

- **Developer candidate identifiers:** `forceArtistry`, `rapidResponse`  |  role `controller`  |  ontology `telekinesis`, `swift_action`
- **Interpretation:** Subtle action-economy use of telekinesis.
- **Printed development / safety boundary:** Future Force Technique: Light Object; object/size/use limits apply.

**E. I prepare one Force power that I can execute reliably when the actual threat becomes clear.**

- **Developer candidate identifiers:** `forceDC`, `forceSecret`  |  role `flex`  |  ontology `force_power`, `force_training`
- **Interpretation:** Reliability of a trained Force power over speculation.
- **Printed development / safety boundary:** Future Force Technique: Force Power Mastery; not a free Force Secret or level-one class selection.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Force Techniques are available only at later Imperial Knight class levels and require exact text; no Sense Surroundings/Sense Force/Telepathy automatic talent at entry.

## Shaper — Shaper Urza (`m29`)

**Voice authority:** `data/dialogue/mentors/urza/urza_dialogue.json`  |  **Printed book:** Legacy Era Campaign Guide, printed pp. 46–47; Force Unleashed Advanced Medicine

**Shared Mentor introduction (DRAFT)**
> The interesting problem with living tools is that they change while you are deciding. What would you change first—and what are you prepared to preserve?

### SH-Q3-S01 — The Living Pump

**Decision focus:** Stabilizing living equipment amid pressure and incomplete information
**Primary Q1 routes (5):** `SH-SH01`, `SH-SH02`, `SH-SH04`, `SH-SH05`, `SH-AM01`
**Coverage domains:** Shaper, Advanced Medicine

> **Shaper Urza:** A machine that breathes gives you warnings. Learn to listen to them.

A living irrigation pump pulses irregularly beneath a small settlement. Its nutrient line is blocked, but a hastily cut channel might injure the organism that keeps the settlement supplied with water. There are salvaged tools and a short window before the reservoir runs dry.

**How would you address the failure?**

**A. I examine the living channels and make the smallest repair likely to keep the pump functioning.**

- **Developer candidate identifiers:** `biotechMastery`, `mechanicalMastery`  |  role `utility`  |  ontology `biotech`, `repair`
- **Interpretation:** Minimal viable living-tech repair.
- **Printed development / safety boundary:** Shaper: Expedient Mending; valid biotech device and repair rules apply.

**B. I reinforce the damaged tissue temporarily rather than risk a complete rebuild in the field.**

- **Developer candidate identifiers:** `biotechMastery`, `treatmentExpertise`  |  role `support`  |  ontology `biotech`, `healing`
- **Interpretation:** Temporary recovery over redesign.
- **Printed development / safety boundary:** Shaper: Master Mender; actual effect and prerequisites govern.

**C. I attempt a careful second repair after examining why the first method did not work.**

- **Developer candidate identifiers:** `biotechMastery`, `skillUtility`  |  role `utility`  |  ontology `reroll`, `biotech`
- **Interpretation:** Iterative skill improvement and evaluation.
- **Printed development / safety boundary:** Shaper: Expert Shaper; reroll benefits only where applicable.

**D. I consider a low-cost redesign that will reduce future failures rather than simply hide this one.**

- **Developer candidate identifiers:** `technicalInnovation`, `biotechMastery`  |  role `utility`  |  ontology `crafting`, `biotech`
- **Interpretation:** Engineering for future reliability.
- **Printed development / safety boundary:** Shaper: Biotech Mastery; cost/time changes apply only to eligible biotech modifications.

**E. I protect the healthy neighboring tissue before acting on the blocked line.**

- **Developer candidate identifiers:** `medicalKnowledge`, `biologicalControl`  |  role `support`  |  ontology `medicine`, `biotech`
- **Interpretation:** Care-first risk management.
- **Printed development / safety boundary:** Advanced Medicine: Natural Healing direction; does not guarantee success repairing devices.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Shaper: Expedient Mending, Master Mender, Expert Shaper, Biotech Mastery; Advanced Medicine: Natural Healing. No universal authority to shape all organisms.

### SH-Q3-S02 — Triage in a Living Corridor

**Decision focus:** Care under limited time when medical outcomes differ
**Primary Q1 routes (5):** `SH-AM02`, `SH-AM03`, `SH-AM04`, `SH-AM05`, `SH-AM06`
**Coverage domains:** Advanced Medicine

> **Shaper Urza:** The body will not wait for a perfect theory. Neither should the healer.

After an accident in a bioengineering conservatory, three conscious workers need care. One has a serious wound, one is struggling to remain upright, and the third is stable but cannot be left unattended. Supplies are incomplete. Another worker offers to assist with treatment.

**What is your initial priority?**

**A. I stabilize the most critical wound and spend the first moments on the patient least able to wait.**

- **Developer candidate identifiers:** `healingMastery`, `treatingInjury`  |  role `support`  |  ontology `medical`, `treat_injury`
- **Interpretation:** Prioritize urgency, not simplicity.
- **Printed development / safety boundary:** Advanced Medicine: Battlefield Medic if legitimately acquired; normal triage applies.

**B. I assign the assistant a narrow role so their help improves the treatment rather than adding confusion.**

- **Developer candidate identifiers:** `allySupport`, `medicalKnowledge`  |  role `leader`  |  ontology `teamwork`, `medicine`
- **Interpretation:** Medical teamwork with bounded delegation.
- **Printed development / safety boundary:** Advanced Medicine: Emergency Team; requires valid helpers and conditions.

**C. I check which patient has already received treatment so another attempt does not exceed safe limits.**

- **Developer candidate identifiers:** `treatmentExpertise`, `knowledgeMastery`  |  role `utility`  |  ontology `medicine`, `healing`
- **Interpretation:** Careful use of scarce treatments.
- **Printed development / safety boundary:** Advanced Medicine: Extra First Aid; exact daily restrictions still apply.

**D. I plan for the possibility that an initial treatment fails without making the injury worse.**

- **Developer candidate identifiers:** `treatmentExpertise`, `adaptability`  |  role `support`  |  ontology `medical`, `reliability`
- **Interpretation:** Error tolerance in life-critical care.
- **Printed development / safety boundary:** Advanced Medicine: Second Chance; cannot retroactively guarantee a successful check.

**E. I prepare for emergency resuscitation if a patient deteriorates beyond ordinary first aid.**

- **Developer candidate identifiers:** `surgicalMastery`, `rapidResponse`  |  role `support`  |  ontology `medical`, `healing`
- **Interpretation:** Capacity for a rare catastrophic deterioration.
- **Printed development / safety boundary:** Advanced Medicine: Bring Them Back; strict revive window and checks.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Advanced Medicine: Extra First Aid, Battlefield Medic, Bring Them Back, Second Chance, Emergency Team. Class does not confer medical success or a free treatment kit.

### SH-Q3-S03 — The Enhancement Consent

**Decision focus:** Implant benefits, autonomy, and the price paid afterward
**Primary Q1 routes (6):** `SH-IM01`, `SH-IM02`, `SH-IM03`, `SH-IM04`, `SH-IM05`, `SH-SH03`
**Coverage domains:** Implant, Shaper

> **Shaper Urza:** Improving a living system is easy to describe. The recovery cost is harder to ignore.

A willing expedition volunteer asks whether a temporary living implant might help them escort a medical carrier through dangerous terrain. The implant options can improve speed, resilience, precision, or strength for a limited encounter, but the ensuing physical penalty is severe and persistent until treated or rested away.

**What guides your recommendation?**

**A. I discuss the speed option while making clear that the recovery period could make the return journey harder.**

- **Developer candidate identifiers:** `biotechMastery`, `rapidResponse`  |  role `support`  |  ontology `implant`, `mobility`
- **Interpretation:** Enhanced movement with explicit lifecycle costs.
- **Printed development / safety boundary:** Implant: Speed Implant; consent and post-encounter penalty remain mandatory.

**B. I weigh temporary resilience against the danger of worsening the volunteer’s condition afterward.**

- **Developer candidate identifiers:** `biotechMastery`, `damageReduction`  |  role `defender`  |  ontology `implant`, `durability`
- **Interpretation:** Protective enhancement with risk analysis.
- **Printed development / safety boundary:** Implant: Resilience Implant; modifies damage threshold under printed limitations, not universal damage reduction.

**C. I offer the precision option only if the mission truly needs an increased chance of accurate action.**

- **Developer candidate identifiers:** `biotechMastery`, `accuracy`  |  role `support`  |  ontology `implant`, `precision`
- **Interpretation:** Task-specific accuracy rather than indiscriminate enhancement.
- **Printed development / safety boundary:** Implant: Precision Implant; requires willingness and the standard later penalty.

**D. I compare the strength and adrenaline options and help the volunteer choose based on their specific assignment.**

- **Developer candidate identifiers:** `biotechMastery`, `medicalKnowledge`  |  role `utility`  |  ontology `implant`, `ability_enhancement`
- **Interpretation:** Individualized enhancement selection.
- **Printed development / safety boundary:** Implant: Strength or Adrenaline Implant; both subject to actual effects and significant aftermath.

**E. I refuse to proceed until the volunteer understands the cost and the procedure is actually safe to attempt.**

- **Developer candidate identifiers:** `surgicalMastery`, `treatmentExpertise`  |  role `support`  |  ontology `implant`, `medical`
- **Interpretation:** Procedural competence and informed consent.
- **Printed development / safety boundary:** Shaper: Skilled Implanter requires Biotech Surgery; consent does not bypass surgery checks.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Implant tree: Adrenaline, Precision, Resilience, Strength and Speed implants require consent, proximity and the persistent -3 post-encounter condition-track effect. Skilled Implanter has Biotech Surgery prerequisite.

### SH-Q3-S04 — The Unfinished Design

**Decision focus:** Knowledge, restraint and deciding whether to reshape living instruments
**Primary Q1 routes (4):** `SH-CF01`, `SH-CF02`, `SH-ID01`, `SH-AM07`
**Coverage domains:** Shaper, Class development, Identity

> **Shaper Urza:** A design can be clever and still unworthy of deployment.

A research enclosure contains a new living sensor that reacts beautifully to movement—but repeatedly harms the small organisms it uses to calibrate itself. A supervisor wants a quick demonstration. A second researcher has proposed an alternative that may take much longer to evaluate.

**How would you approach the choice?**

**A. I document the harm precisely and require safer tests before any public demonstration.**

- **Developer candidate identifiers:** `knowledgeMastery`, `biotechMastery`  |  role `utility`  |  ontology `science`, `biotech`
- **Interpretation:** Measured scientific validation.
- **Printed development / safety boundary:** Shaper Lore aids knowledge at later class levels; no research success is automatic.

**B. I propose a reversible adjustment to the sensor rather than replacing living components without understanding them.**

- **Developer candidate identifiers:** `technicalInnovation`, `biologicalControl`  |  role `utility`  |  ontology `modification`, `biotech`
- **Interpretation:** Controlled iteration that minimizes harm.
- **Printed development / safety boundary:** Shaper: Biotech Mastery and Expert Shaper are subject to actual item scope and prerequisites.

**C. I ask who will bear the consequences if the sensor is deployed before its behavior is understood.**

- **Developer candidate identifiers:** `medicalKnowledge`, `allySupport`  |  role `support`  |  ontology `medical`, `planning`
- **Interpretation:** Accountability for living subjects.
- **Printed development / safety boundary:** Responsible identity intent; not a new class-granted ethical mechanic.

**D. I study the traditions governing shaping hands and decide whether their obligations match the work I want to do.**

- **Developer candidate identifiers:** `knowledgeMastery`, `biotechMastery`  |  role `utility`  |  ontology `galactic_lore`, `biotech`
- **Interpretation:** Cultural and long-term career responsibility.
- **Printed development / safety boundary:** Shaper Hand is a level-6 class feature choice; no assumed acquisition or cultural violation.

**E. I compare alternative prototypes and record the limits of what our tests actually demonstrate.**

- **Developer candidate identifiers:** `biotechMastery`, `resourceControl`  |  role `utility`  |  ontology `science`, `resources`
- **Interpretation:** Scientific humility in deployment decisions.
- **Printed development / safety boundary:** Future Shaper Lore and ordinary Knowledge (life sciences); results remain uncertain.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Shaper Lore is later-level; Shaper Hand is a still-later cultural/body choice, not a granted tool or automatic bodily transformation.

### SH-Q3-S05 — The Last Procedure

**Decision focus:** Decision-making between continued treatment and technical repair
**Primary Q1 routes (3):** `SH-AM08`, `SH-ID02`, `SH-NEUTRAL`
**Coverage domains:** Advanced Medicine, Class identity

> **Shaper Urza:** When two systems are failing, understanding which one is alive is not enough.

A small mobile clinic relies on a bioengineered filtration unit. A patient needs another procedure, while the filter’s living membrane begins to fail. Only one workstation has power, and moving either the patient or the filter would create additional risk.

**What comes first in your plan?**

**A. I repeat the relevant diagnosis carefully before attempting treatment that might worsen the patient’s condition.**

- **Developer candidate identifiers:** `treatmentExpertise`, `knowledgeMastery`  |  role `support`  |  ontology `medical`, `reliability`
- **Interpretation:** Reliable treatment under pressure.
- **Printed development / safety boundary:** Advanced Medicine: Steady Under Pressure provides a bounded reroll where eligible.

**B. I help the conscious patient use their own limited reserve while we prepare a safer procedure.**

- **Developer candidate identifiers:** `healingMastery`, `allySupport`  |  role `support`  |  ontology `healing`, `treat_injury`
- **Interpretation:** Patient-focused emergency support.
- **Printed development / safety boundary:** Advanced Medicine: Medical Miracle is conditional, not a free second wind.

**C. I arrange a temporary repair to the filter so the clinic can retain a safe treatment area.**

- **Developer candidate identifiers:** `biotechMastery`, `resourceControl`  |  role `utility`  |  ontology `biotech`, `repair`
- **Interpretation:** Keep essential infrastructure stable.
- **Printed development / safety boundary:** Shaper device talents are limited to qualified living-tech repairs.

**D. I explain both risks openly and seek a decision from those whose lives will be affected.**

- **Developer candidate identifiers:** `medicalKnowledge`, `persuasionMastery`  |  role `support`  |  ontology `social`, `medicine`
- **Interpretation:** Collaborative medical decision-making.
- **Printed development / safety boundary:** Social decision-making, not a mechanical guarantee of consent or aid.

**E. I accept that a capable Shaper must sometimes choose which work to defer, without claiming certainty I do not have.**

- **Developer candidate identifiers:** `adaptability`, `biotechMastery`  |  role `flex`  |  ontology `planning`, `biotech`
- **Interpretation:** Adaptable judgment without false certainty.
- **Printed development / safety boundary:** Identity/uncertainty signal only; neither specialization nor moral alignment is inferred.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Advanced Medicine: Steady Under Pressure and Medical Miracle; Shaper identity capstone/neutral do not prescribe one ethical result.

## Assassin — Delta (`m12`)

**Voice authority:** `data/dialogue/mentors/delta/delta_dialogue.json`  |  **Printed book:** Scum and Villainy pp. 28–30; Threats of the Galaxy p. 13 (Malkite Poisoner)

**Shared Mentor introduction (DRAFT)**
> A clean job doesn’t mean the obvious shot. It means you saw the problem before it saw you. So, what happens when the plan gets ugly?

### ASN-Q3-S01 — A Rooftop with Two Exits

**Decision focus:** Observation and precision before choosing an engagement
**Primary Q1 routes (10):** `ASN-MI01`, `ASN-MI02`, `ASN-MI11`, `ASN-MI16`, `ASN-AS01`, `ASN-AS02`, `ASN-AS04`, `ASN-AS06`, `ASN-AS09`, `ASN-CF01`
**Coverage domains:** Assassin, Misfortune, Mark development

> **Delta:** Nice angle. Terrible assumptions. Fix the second part.

You are watching a dangerous courier from the upper level of a crowded transit station. Their route crosses a public walkway and then splits between two guarded exits. Your objective is to stop the courier carrying an encrypted case, but you do not yet know which exit they will choose or whether their guards are aware of you.

**What is your first move?**

**A. I study both exits and hold position until I can isolate the courier without involving the crowd.**

- **Developer candidate identifiers:** `stealthMastery`, `tacticalAwareness`  |  role `scout`  |  ontology `perception`, `stealth`
- **Interpretation:** Patience and target selection over immediate damage.
- **Printed development / safety boundary:** Assassin: Sniping Master/Marksman and general observation; no guaranteed shot or target mark.

**B. I look for a brief, clear shot at the case or its carrier only after I know what the line of fire contains.**

- **Developer candidate identifiers:** `deadlyPrecision`, `accuracy`  |  role `striker`  |  ontology `sniper`, `precision`
- **Interpretation:** Precision first, not indiscriminate fire.
- **Printed development / safety boundary:** Assassin: Sniping Assassin and Murderous Arts I/II are prerequisite- and range-limited; object targeting resolved normally.

**C. I reposition to a second angle where the guards cannot see me approach the closer exit.**

- **Developer candidate identifiers:** `stealth`, `infiltration`  |  role `skirmisher`  |  ontology `stealth`, `positioning`
- **Interpretation:** Changing position to obtain an opening.
- **Printed development / safety boundary:** Assassin: Advantageous Positioning; Misfortune: Skirmisher requires appropriate movement.

**D. I try to identify which guard actually controls the exits so I can disrupt the right person.**

- **Developer candidate identifiers:** `informationControl`, `predatoryInstinct`  |  role `controller`  |  ontology `investigation`, `targeting`
- **Interpretation:** Targeted intelligence and prioritization.
- **Printed development / safety boundary:** Assassin: later Mark is not automatically active; analysis and actual checks still matter.

**E. I wait for the courier to pass the public walkway before committing to an interception.**

- **Developer candidate identifiers:** `tacticalAwareness`, `deadlyPrecision`  |  role `flex`  |  ontology `planning`, `precision`
- **Interpretation:** Delaying action to reduce collateral danger.
- **Printed development / safety boundary:** Assassin identity and Sniping development; holding fire grants no automatic bonus.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Assassin: Sniping Master, Sniping Marksman, Sniping Assassin, Advantageous Positioning; Misfortune: Sneak Attack/Dastardly Strike require specific conditions. Mark begins at level 2.

### ASN-Q3-S02 — The Uncertain Vial

**Decision focus:** Controlled treatment of a dangerous toxin-related encounter
**Primary Q1 routes (6):** `ASN-MP01`, `ASN-MP02`, `ASN-MP03`, `ASN-MP04`, `ASN-MP05`, `ASN-MI10`
**Coverage domains:** Malkite Poisoner, Misfortune

> **Delta:** A vial nobody checked? Great. That’s how a clean operation turns into a funeral.

At a remote security post, an armed opponent carries a sealed toxin vial alongside their usual equipment. A nearby technician is already ill, and an unlabelled antidote kit is locked inside the post. You need the suspect stopped and the technician protected, but guessing what the vial contains could make matters worse.

**What do you do first?**

**A. I identify the dangerous material and keep it from being released before I consider any other attack.**

- **Developer candidate identifiers:** `tacticalAwareness`, `resourceControl`  |  role `controller`  |  ontology `poison`, `perception`
- **Interpretation:** Containment rather than toxin use.
- **Printed development / safety boundary:** Poison handling is governed by real equipment/skill rules; a Malkite talent does not grant a safe extraction method.

**B. I try to disarm the opponent or force them away from the technician before a vial can be used.**

- **Developer candidate identifiers:** `deadlyPrecision`, `combatAdaptability`  |  role `controller`  |  ontology `targeting`, `nonlethal`
- **Interpretation:** Separation of threat and bystander.
- **Printed development / safety boundary:** General disarm/combat rules; Malkite techniques do not guarantee nonlethal capture.

**C. I study the material and its delivery limits so I do not make the danger worse through a careless choice.**

- **Developer candidate identifiers:** `knowledgeMastery`, `biotechMastery`  |  role `utility`  |  ontology `poison`, `knowledge`
- **Interpretation:** Specialized technical understanding.
- **Printed development / safety boundary:** Malkite Poisoner: Modify Poison/Techniques are conditional; no new toxin formulation is described.

**D. I make the technician’s evacuation the priority and leave the vial untouched until it can be assessed.**

- **Developer candidate identifiers:** `allySupport`, `evasionTactics`  |  role `support`  |  ontology `survivability`, `medical`
- **Interpretation:** Protect the exposed person before pursuing the suspect.
- **Printed development / safety boundary:** Ordinary movement and aid; no automatic healing or antidote entitlement.

**E. I avoid using the suspect’s own toxin against them until its effect and consequences can be established.**

- **Developer candidate identifiers:** `tacticalAwareness`, `deadlyPrecision`  |  role `flex`  |  ontology `poison`, `reliability`
- **Interpretation:** Restraint and informed targeting.
- **Printed development / safety boundary:** Malkite talent effects require specific actual talent and available poison; intent does not waive saving throws.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Malkite Poisoner: Numbing Poison, Modify Poison, Malkite Techniques, Vicious Poison, Undetectable Poison. No recipe, free poison kit or guaranteed treatment is provided.

### ASN-Q3-S03 — The Message Behind the Contract

**Decision focus:** Covert intelligence and pressure without assumed organization membership
**Primary Q1 routes (9):** `ASN-GH01`, `ASN-GH02`, `ASN-GH03`, `ASN-GH04`, `ASN-MI03`, `ASN-MI05`, `ASN-MI06`, `ASN-MI14`, `ASN-MI17`
**Coverage domains:** GenoHaradan, Misfortune, Manipulation

> **Delta:** Somebody wants you to pull one string so you don’t notice the other four.

A mysterious client sends a packet identifying a supposed traitor in a local supply network. A second message arrives anonymously, warning that the client altered the original evidence. Two intermediaries are waiting for instructions, and neither knows what the other has been told.

**How do you determine your response?**

**A. I compare the two messages and trace where the claims conflict before acting against anyone.**

- **Developer candidate identifiers:** `informationControl`, `knowledgeMastery`  |  role `scout`  |  ontology `investigation`, `knowledge`
- **Interpretation:** Verify the intelligence before committing.
- **Printed development / safety boundary:** Misfortune: Cunning Strategist direction; ordinary research still requires evidence and checks.

**B. I ask each intermediary separate, narrow questions to learn who is trying to influence the other.**

- **Developer candidate identifiers:** `deceptionMastery`, `persuasionMastery`  |  role `utility`  |  ontology `social`, `deception`
- **Interpretation:** Social inquiry through controlled conversations.
- **Printed development / safety boundary:** Misfortune: Seducer/other social methods subject to precise conditions; no auto-truth detection.

**C. I reveal only a small harmless detail to see whether it reaches the person manipulating the messages.**

- **Developer candidate identifiers:** `informationControl`, `infiltrationMastery`  |  role `controller`  |  ontology `intrigue`, `deception`
- **Interpretation:** Indirect testing of the information network.
- **Printed development / safety boundary:** GenoHaradan: Pulling the Strings is a source-keyed talent; affiliation not assumed.

**D. I prepare a way to disrupt the instigator’s next move instead of attacking the named suspect immediately.**

- **Developer candidate identifiers:** `tacticalAwareness`, `areaControl`  |  role `controller`  |  ontology `setup`, `control`
- **Interpretation:** Control future confrontation without premature blame.
- **Printed development / safety boundary:** GenoHaradan: Manipulating Strike/Improved Manipulating Strike are bounded attacks, not universal manipulation.

**E. I make the consequences of a hostile attack visible enough to deter the other intermediaries from escalating.**

- **Developer candidate identifiers:** `intimidation`, `predatoryInstinct`  |  role `controller`  |  ontology `fear`, `morale`
- **Interpretation:** Use of pressure and reputation rather than secret damage bonuses.
- **Printed development / safety boundary:** GenoHaradan: Deadly Repercussions has its own qualifying trigger and target rules.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** GenoHaradan talent anchors describe options; no presumption of membership, command authority, preexisting informants, or a published talent grant.

### ASN-Q3-S04 — The Exit After the Strike

**Decision focus:** Withdrawal and movement when an apparent victory turns uncertain
**Primary Q1 routes (7):** `ASN-AS03`, `ASN-AS07`, `ASN-AS08`, `ASN-MI07`, `ASN-MI12`, `ASN-MI13`, `ASN-MI15`
**Coverage domains:** Assassin, Misfortune, Mobility

> **Delta:** Everybody plans the entry. That’s why the exit’s where the amateurs get caught.

An attempted interception has forced the courier to abandon the encrypted case. The corridor shutters start closing, guards are approaching from two directions, and the only route to a public transport platform crosses an exposed loading gantry. You can retreat, interfere with the guards, or try to secure the case.

**Which method would you use?**

**A. I move through the nearest unguarded gap before it closes, even if it means leaving the case behind.**

- **Developer candidate identifiers:** `evasionTactics`, `stealth`  |  role `skirmisher`  |  ontology `mobility`, `stealth`
- **Interpretation:** Prioritizes survival and escape.
- **Printed development / safety boundary:** Assassin: Get Some Distance/Shift are conditional; ordinary withdrawal rules still apply.

**B. I use the guards’ poor alignment to cross where they cannot support each other.**

- **Developer candidate identifiers:** `tacticalAwareness`, `combatFlow`  |  role `skirmisher`  |  ontology `flanking`, `positioning`
- **Interpretation:** Positioning for an unequal encounter.
- **Printed development / safety boundary:** Assassin: Advantageous Positioning; no guaranteed flat-footed condition from this choice.

**C. I interrupt the guard carrying the shutter control so the escape route stays open longer.**

- **Developer candidate identifiers:** `deadlyPrecision`, `areaControl`  |  role `controller`  |  ontology `targeting`, `action_economy`
- **Interpretation:** Disrupt the key action rather than attack indiscriminately.
- **Printed development / safety boundary:** Misfortune: Stymie or Seize Object only applies with exact prerequisites and valid effects.

**D. I keep up a moving defense that discourages pursuit while I guide the others out.**

- **Developer candidate identifiers:** `combatAdaptability`, `allySupport`  |  role `support`  |  ontology `movement`, `teamwork`
- **Interpretation:** Mobile team-oriented extraction.
- **Printed development / safety boundary:** Misfortune: Skirmisher/Improved Skirmisher; does not confer suppressing fire automatically.

**E. I recover the case only if it can be taken without trapping the entire group on the gantry.**

- **Developer candidate identifiers:** `resourceControl`, `tacticalAwareness`  |  role `flex`  |  ontology `equipment`, `planning`
- **Interpretation:** Mission value balanced against extraction risk.
- **Printed development / safety boundary:** General retrieval and judgment; no class-granted item capture effect.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Assassin: Get Some Distance, Shift, Ruthless; Misfortune: Skirmisher, Improved Skirmisher, Seize Object, Backstabber. Movement and attack triggers are not free.

### ASN-Q3-S05 — The Wrong Target

**Decision focus:** Deciding how to act when identity and purpose are uncertain
**Primary Q1 routes (7):** `ASN-MI04`, `ASN-MI08`, `ASN-MI09`, `ASN-AS05`, `ASN-ID01`, `ASN-ID02`, `ASN-NEUTRAL`
**Coverage domains:** Misfortune, Assassin identity, Neutral

> **Delta:** Bad intel gets people hurt. Worse intel makes you think the job’s done.

At the last moment before a planned confrontation, the person you expected to intercept is replaced by someone wearing the same uniform. An ally believes the replacement is the real target, while a frightened witness insists they have seen two identical uniforms moving in opposite directions.

**What do you do now?**

**A. I delay the confrontation until I can confirm which person actually matches the evidence.**

- **Developer candidate identifiers:** `tacticalAwareness`, `informationControl`  |  role `scout`  |  ontology `investigation`, `awareness`
- **Interpretation:** Evidence over premature commitment.
- **Printed development / safety boundary:** Misfortune: Cunning Strategist and information use; no automatic identity detection.

**B. I reposition quietly so I can observe both routes without alerting either uniformed person.**

- **Developer candidate identifiers:** `stealthMastery`, `adaptability`  |  role `scout`  |  ontology `stealth`, `recon`
- **Interpretation:** Observation from concealment.
- **Printed development / safety boundary:** General Stealth and tactical movement; class talents subject to checks and line of sight.

**C. I create a harmless distraction to test which person reacts to the hidden signal.**

- **Developer candidate identifiers:** `deceptionMastery`, `areaControl`  |  role `controller`  |  ontology `deception`, `feint`
- **Interpretation:** Behavioral testing via misdirection.
- **Printed development / safety boundary:** Misfortune: Befuddle/Hesitate require actual mechanics; no free mind-affecting effect.

**D. I warn my ally that certainty is missing and arrange a fallback rather than let them act alone.**

- **Developer candidate identifiers:** `allySupport`, `tacticalAwareness`  |  role `support`  |  ontology `teamwork`, `planning`
- **Interpretation:** Protective coordination while evidence is weak.
- **Printed development / safety boundary:** Identity response only; no automatic ally reroll or initiative adjustment.

**E. I accept that abandoning this attempt may be better than acting against the wrong person.**

- **Developer candidate identifiers:** `adaptability`, `predatoryInstinct`  |  role `flex`  |  ontology `evasion`, `precision`
- **Interpretation:** Outcome discipline over a forced confrontation.
- **Printed development / safety boundary:** Capstone/uncertainty identity; not an alignment or pacifism score.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Some combat and deception options are later/prerequisite-gated. A preference for caution or aggression does not itself prove actor morality, record a kill, or award Mark.

## Charlatan — Silvertongue Sela (`m24`)

**Voice authority:** `data/dialogue/mentors/sela/sela_dialogue.json`  |  **Printed book:** Scum and Villainy pp. 30–32; Core Fortune shared talents

**Shared Mentor introduction (DRAFT)**
> Darling, the truth isn’t always the part people notice. Let’s find out which part of the story you would change before they realize there was a choice.

### CHA-Q3-S01 — The Wrong Guest List

**Decision focus:** Reputation, appearances and redirecting a conversation
**Primary Q1 routes (9):** `CHA-DG01`, `CHA-DG02`, `CHA-DG03`, `CHA-DG04`, `CHA-DG05`, `CHA-DG06`, `CHA-TR03`, `CHA-TR04`, `CHA-TR06`
**Coverage domains:** Disgrace, Trickery

> **Silvertongue Sela:** Oh, a guest list. A tiny document with such an inflated opinion of itself.

A reception controls access to a hearing where a witness intends to speak. A guard discovers that your name appears on the wrong list, and two guests have begun arguing loudly over who has permission to enter. You may have only a short conversation before the doors close.

**How do you handle the social pressure?**

**A. I give a calm, plausible explanation and let the guard correct the list without feeling challenged.**

- **Developer candidate identifiers:** `persuasionMastery`, `deceptionMastery`  |  role `utility`  |  ontology `social`, `deception`
- **Interpretation:** Convincing, low-pressure misdirection.
- **Printed development / safety boundary:** Disgrace: Unreadable; no automatic admission or forged identification.

**B. I redirect the argument between guests so their own words clarify which door is actually open.**

- **Developer candidate identifiers:** `socialManipulation`, `informationControl`  |  role `controller`  |  ontology `intrigue`, `persuasion`
- **Interpretation:** Change the conversation rather than defeat the guard.
- **Printed development / safety boundary:** Disgrace: Misplaced Loyalty/Castigate require their own social triggers and checks.

**C. I feign confusion long enough to slip into the correct line while attention moves elsewhere.**

- **Developer candidate identifiers:** `deceptionMastery`, `stealth`  |  role `skirmisher`  |  ontology `feint`, `mobility`
- **Interpretation:** Distraction as a mobility opening.
- **Printed development / safety boundary:** Trickery: Cunning Distraction if conditions apply; no free stealth or movement action.

**D. I enlist an ally to answer the guard while I identify what the guest list actually controls.**

- **Developer candidate identifiers:** `allySupport`, `informationControl`  |  role `support`  |  ontology `teamwork`, `investigation`
- **Interpretation:** Shared responsibility with a narrow intelligence goal.
- **Printed development / safety boundary:** Disgrace: Ambush is a specific tactical talent, not a generic social group-action feature.

**E. I choose one claim I can support instead of weaving a story too elaborate to survive another question.**

- **Developer candidate identifiers:** `deceptionMastery`, `tacticalAwareness`  |  role `utility`  |  ontology `deception`, `reliability`
- **Interpretation:** Minimal-risk social deception.
- **Printed development / safety boundary:** Trickery: Damaging Deception and Disgrace: Two-Faced are distinct mechanics; no granted lie-detection immunity.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Disgrace: Unreadable, Castigate, Misplaced Loyalty, Ambush, Dirty Tactics/Two-Faced; Trickery: Cunning Distraction, Damaging Deception and Treacherous have bounded effects.

### CHA-Q3-S02 — A Familiar Face in the Crowd

**Decision focus:** Remaining underestimated while protecting a vulnerable ally
**Primary Q1 routes (5):** `CHA-TR01`, `CHA-TR02`, `CHA-TR05`, `CHA-FT11`, `CHA-ID01`
**Coverage domains:** Trickery, Fortune, Identity

> **Silvertongue Sela:** If they think you’re harmless, darling, consider it a compliment you can spend later.

A courier carrying testimony notices someone following them across a packed market. You are nearby, but the pursuer does not know you are involved. The courier may panic if approached too directly, and a sudden fight would endanger shoppers.

**What kind of intervention do you make?**

**A. I approach as an ordinary shopper and offer a believable reason for the courier to leave with me.**

- **Developer candidate identifiers:** `deceptionMastery`, `socialManipulation`  |  role `utility`  |  ontology `deception`, `social`
- **Interpretation:** Harmless persona as protective intervention.
- **Printed development / safety boundary:** Trickery: Innocuous is situational, not total invisibility or automatic trust.

**B. I use the busy crowd to shield our movement without dragging shoppers into a direct fight.**

- **Developer candidate identifiers:** `evasionTactics`, `resourcefulness`  |  role `skirmisher`  |  ontology `cover`, `mobility`
- **Interpretation:** Survival through environmental cover.
- **Printed development / safety boundary:** Trickery: Improved Soft Cover; normal cover and position rules still apply.

**C. I call out a perfectly timed warning so the courier sees the dangerous turn before taking it.**

- **Developer candidate identifiers:** `allySupport`, `rapidResponse`  |  role `support`  |  ontology `ally_support`, `reaction`
- **Interpretation:** Aid through timing and distraction.
- **Printed development / safety boundary:** Trickery: Distracting Shout has attack/defense timing restrictions.

**D. I keep my true purpose difficult to read and test whether the follower is reacting to me or the courier.**

- **Developer candidate identifiers:** `deceptionMastery`, `tacticalAwareness`  |  role `scout`  |  ontology `deception`, `awareness`
- **Interpretation:** Concealed intention and counter-observation.
- **Printed development / safety boundary:** Fortune: Labyrinthine Mind has its own mechanical scope and missing repository class-tree access.

**E. I change the courier’s expectations with an honest warning rather than build another lie that could collapse.**

- **Developer candidate identifiers:** `persuasionMastery`, `allySupport`  |  role `support`  |  ontology `social`, `persuasion`
- **Interpretation:** Trust-building over deception when appropriate.
- **Printed development / safety boundary:** Social judgment; no talent prerequisite waiver or free Persuasion outcome.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Trickery: Innocuous, Improved Soft Cover, Distracting Shout. Fortune: Labyrinthine Mind is source-authorized but runtime Fortune access is missing.

### CHA-Q3-S03 — The Debt Behind the Favor

**Decision focus:** Negotiating value, favors and competing social obligations
**Primary Q1 routes (7):** `CHA-FT01`, `CHA-FT02`, `CHA-FT05`, `CHA-FT08`, `CHA-FT13`, `CHA-CF01`, `CHA-CF02`
**Coverage domains:** Fortune, Charlatan features

> **Silvertongue Sela:** That sounds like a favor. Check the price tag before you smile.

A shipping broker agrees to release emergency cargo only after someone settles an old disputed invoice. The broker would prefer credits, but a union representative argues the delay violates an earlier promise. Each party has a different account of the original agreement.

**How would you seek an outcome?**

**A. I compare the two accounts and try to offer a deal that gives both parties something they can verify.**

- **Developer candidate identifiers:** `businessAcumen`, `persuasionMastery`  |  role `utility`  |  ontology `persuasion`, `resources`
- **Interpretation:** Reframe the negotiation around verifiable value.
- **Printed development / safety boundary:** Score/Swindle are later class features; no credits or negotiation success conferred now.

**B. I ask the broker which single concession would matter most instead of haggling blindly.**

- **Developer candidate identifiers:** `socialManipulation`, `informationControl`  |  role `controller`  |  ontology `social`, `intrigue`
- **Interpretation:** Identify leverage with minimal conflict.
- **Printed development / safety boundary:** Class later Score and Swindle direction; Persuasion remains a check.

**C. I attempt the difficult calculation myself and use an improved second try if I genuinely have the training for it.**

- **Developer candidate identifiers:** `skillUtility`, `adaptability`  |  role `utility`  |  ontology `reroll`, `skills`
- **Interpretation:** Skill resilience rather than social pressure.
- **Printed development / safety boundary:** Fortune: Knack; only where talent and its reroll conditions apply.

**D. I risk a small, clearly bounded wager to break the stalemate without putting the cargo itself at stake.**

- **Developer candidate identifiers:** `resourceControl`, `adaptability`  |  role `flex`  |  ontology `resources`, `reroll`
- **Interpretation:** Controlled risk-taking.
- **Printed development / safety boundary:** Fortune: Gambler has a specific gambling scope; this choice is not a guaranteed profitable bet.

**E. I prioritize preventing the cargo from being lost while the parties keep disputing who owes what.**

- **Developer candidate identifiers:** `resourcefulness`, `tacticalAwareness`  |  role `support`  |  ontology `planning`, `resources`
- **Interpretation:** Protecting the substantive objective.
- **Printed development / safety boundary:** Fortune: Avert Disaster has its own trigger/cost; emergency logistics is not a free talent effect.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Fortune: Fool’s Luck, Knack, Gambler, Avert Disaster; class features Score (level 2), Swindle (level 4) are not initially awarded.

### CHA-Q3-S04 — Odds That Changed at Midnight

**Decision focus:** Using uncertainty and momentum in a risky exchange
**Primary Q1 routes (6):** `CHA-FT03`, `CHA-FT06`, `CHA-FT07`, `CHA-FT09`, `CHA-FT10`, `CHA-FT12`
**Coverage domains:** Fortune

> **Silvertongue Sela:** The odds moved. Sweetheart, that’s not bad news; that’s news.

At a crowded game hall, the winnings from a legitimate contest could pay for urgent passage offworld. A rival announces they have changed the final terms; another guest offers a side bet that would cover the cost but adds considerable risk. Security is watching for disturbances.

**How would you play the next moment?**

**A. I check the actual rules and change my approach rather than betting on the rival’s confidence.**

- **Developer candidate identifiers:** `tacticalAwareness`, `businessAcumen`  |  role `utility`  |  ontology `knowledge`, `planning`
- **Interpretation:** Informed risk assessment.
- **Printed development / safety boundary:** Fortune: Gambler concerns gambling; other Fortune talents do not guarantee favorable odds.

**B. I accept only the smaller wager that I can afford to lose if the other offer is a trap.**

- **Developer candidate identifiers:** `resourceControl`, `adaptability`  |  role `flex`  |  ontology `resources`, `reliability`
- **Interpretation:** Limit exposure to uncertain outcomes.
- **Printed development / safety boundary:** Fortune: Better Lucky than Dead is a combat survival talent, not unlimited financial protection.

**C. I exploit one unexpected opening in the rules without trying to change the whole contest.**

- **Developer candidate identifiers:** `resourcefulness`, `skillUtility`  |  role `utility`  |  ontology `reroll`, `skills`
- **Interpretation:** Opportunistic generalist thinking.
- **Printed development / safety boundary:** Fortune: Knack or Dumb Luck; actual rules determine the eligible check.

**D. I keep an exit and backup plan in mind in case the room becomes hostile instead of debating the wager.**

- **Developer candidate identifiers:** `evasionTactics`, `tacticalAwareness`  |  role `skirmisher`  |  ontology `evasion`, `mobility`
- **Interpretation:** Survival-aware planning.
- **Printed development / safety boundary:** Fortune: Lucky Stop/Uncanny Luck have bounded combat effects; no automatic escape.

**E. I use the rival’s attempt to impress the room as a chance to redirect attention toward a fair outcome.**

- **Developer candidate identifiers:** `socialManipulation`, `persuasionMastery`  |  role `controller`  |  ontology `social`, `persuasion`
- **Interpretation:** Social momentum used as leverage.
- **Printed development / safety boundary:** Fortune: Fortune’s Favor is trigger-limited; not a universal social action grant.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Fortune: Lucky Shot, Lucky Stop, Fortune’s Favor, Better Lucky than Dead, Unlikely Shot, Uncanny Luck and Ricochet Shot are mechanical candidates; not every luck talent applies to gambling.

### CHA-Q3-S05 — The Story That Almost Worked

**Decision focus:** Identity and adaptation when an elegant fiction is disproved
**Primary Q1 routes (3):** `CHA-FT04`, `CHA-ID02`, `CHA-NEUTRAL`
**Coverage domains:** Fortune, Identity, Neutral

> **Silvertongue Sela:** And there it is—the moment a beautiful story meets an inconvenient fact.

You propose a compromise to two rival merchants. One quietly produces records that contradict an assumption behind your argument. The merchants are listening, but their patience is nearly gone; neither is committed to violence or deceit yet.

**What do you do after being challenged?**

**A. I correct the assumption and build a smaller agreement around the facts we can still verify.**

- **Developer candidate identifiers:** `persuasionMastery`, `adaptability`  |  role `utility`  |  ontology `persuasion`, `knowledge`
- **Interpretation:** Adapt through accountable reframing.
- **Printed development / safety boundary:** Normal negotiation and possibly Fortune skill resilience; no automatic successful Swindle.

**B. I turn the question back to what each merchant actually needs and let them argue less about my wording.**

- **Developer candidate identifiers:** `socialManipulation`, `informationControl`  |  role `controller`  |  ontology `social`, `intrigue`
- **Interpretation:** Redirect focus onto shared interests.
- **Printed development / safety boundary:** Charlatan social disciplines; no automatic control of an NPC’s choices.

**C. I make a light joke to buy one moment to examine the newly revealed record.**

- **Developer candidate identifiers:** `resourcefulness`, `skillUtility`  |  role `utility`  |  ontology `social`, `skills`
- **Interpretation:** Recover from error through flexible improvisation.
- **Printed development / safety boundary:** Fortune: Dumb Luck requires its exact conditions; humor is not a mechanical reroll.

**D. I withdraw the disputed claim rather than demand that everyone believe an account I can no longer support.**

- **Developer candidate identifiers:** `deceptionMastery`, `adaptability`  |  role `flex`  |  ontology `deception`, `reliability`
- **Interpretation:** Restraint when false claims have been exposed.
- **Printed development / safety boundary:** Identity response; not an alignment or honesty score.

**E. I ask for a pause because I still cannot tell which strategy will produce a workable agreement.**

- **Developer candidate identifiers:** `knowledgeMastery`, `resourcefulness`  |  role `flex`  |  ontology `planning`, `social`
- **Interpretation:** Recognizes unresolved uncertainty.
- **Printed development / safety boundary:** Neutral career uncertainty must remain unscored unless explicitly selected substantive answer interpretation is owner-approved.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Fortune: Dumb Luck is a distinct talent with published limits; an admitted uncertain career choice cannot be turned into a negative scoring tag.

## Improviser — Lucky Jack (`m14`)

**Voice authority:** `data/dialogue/mentors/jack/jack_dialogue.json`  |  **Printed book:** Rebellion Era Campaign Guide pp. 41–43

**Shared Mentor introduction (DRAFT)**
> So! Everything broke, the good tools are missing, and the clock’s running? Great conditions for an interesting idea. What do you try?

### IMP-Q3-S01 — The Jammed Hatch

**Decision focus:** Making a credible repair with incomplete equipment
**Primary Q1 routes (4):** `IMP-OT02`, `IMP-OT04`, `IMP-IM01`, `IMP-CF01`
**Coverage domains:** Outlaw Tech, Improviser features

> **Lucky Jack:** Door’s stuck. Tool kit’s gone. Fantastic—we’re down to the fun options.

An emergency hatch refuses to open as smoke creeps down a corridor. The access panel is damaged, the nearest toolbox has been emptied, and a service drone is still using the adjacent repair junction. The group needs a safe route but could lose valuable time trying to force the door.

**What do you work on first?**

**A. I use the damaged junction as the starting point for a fast mechanical repair, even without a complete kit.**

- **Developer candidate identifiers:** `mechanicalMastery`, `resourcefulness`  |  role `utility`  |  ontology `repair`, `jury_rig`
- **Interpretation:** Repair under constrained equipment.
- **Printed development / safety boundary:** Improviser: No Tools Required and Improved Jury-Rig; checks and limits remain.

**B. I patch the hatch’s simplest failed component before committing to a full rebuild.**

- **Developer candidate identifiers:** `technicalMastery`, `improvisation`  |  role `utility`  |  ontology `repair`, `tech`
- **Interpretation:** Minimal intervention and rapid operation.
- **Printed development / safety boundary:** Outlaw Tech: Quick Fix; a temporary patch does not remove all damage.

**C. I borrow a usable part from the service drone only after checking whether that would disable a second essential system.**

- **Developer candidate identifiers:** `resourceControl`, `engineeringMastery`  |  role `utility`  |  ontology `equipment`, `mechanics`
- **Interpretation:** Use materials without thoughtless collateral loss.
- **Printed development / safety boundary:** Outlaw Tech: Fast Repairs; removing parts may have ordinary equipment consequences.

**D. I test whether I can reach the lock from a different service interface instead of cutting the door open.**

- **Developer candidate identifiers:** `hackingSkills`, `technicalMastery`  |  role `controller`  |  ontology `use_computer`, `tech`
- **Interpretation:** Alternate computer-based approach.
- **Printed development / safety boundary:** Outlaw Tech: Hot Wire; not unrestricted digital access.

**E. I give the group a firm time to attempt repair, then switch to a safer route if the hatch stays jammed.**

- **Developer candidate identifiers:** `adaptability`, `tacticalAwareness`  |  role `leader`  |  ontology `planning`, `survival`
- **Interpretation:** Adapt when the first solution may fail.
- **Printed development / safety boundary:** Identity and emergency coordination; no free mechanics or command rank.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Outlaw Tech: Fast Repairs/Quick Fix; Improviser: Improved Jury-Rig; No Tools Required is entry-class feature but still subject to its printed scope.

### IMP-Q3-S02 — The Workbench of Spare Parts

**Decision focus:** Constructing a temporary solution versus modifying working gear
**Primary Q1 routes (4):** `IMP-OT01`, `IMP-IM02`, `IMP-IM04`, `IMP-PR01`
**Coverage domains:** Improviser, Outlaw Tech, Procurement

> **Lucky Jack:** A beautiful machine? We don’t have time for beautiful. We have time for useful.

A transport must cross a damaged loading bridge. Its guidance beacon is broken, and you have assorted parts, a small power cell and a working blaster. You can rebuild the beacon, fashion a temporary locator, or tune another device for the crossing. The bridge will become impassable if repairs take too long.

**What do you make or adjust?**

**A. I assemble a temporary locator from spare components and accept that it may be useful only for this crossing.**

- **Developer candidate identifiers:** `improvisation`, `engineeringMastery`  |  role `utility`  |  ontology `crafting`, `tech`
- **Interpretation:** Build the minimum temporary device.
- **Printed development / safety boundary:** Improviser: Improvised Device is bounded and temporary; not automatically added to permanent gear.

**B. I modify a working instrument rather than gamble on a completely new prototype.**

- **Developer candidate identifiers:** `technicalInnovation`, `resourcefulness`  |  role `utility`  |  ontology `modification`, `equipment`
- **Interpretation:** Improve tested equipment rather than invent from nothing.
- **Printed development / safety boundary:** Improviser: Custom Model and Outlaw Tech: Personalized Modifications have separate scope/prerequisites.

**C. I find which substitute parts match the beacon and use only those, keeping the rest available for later failures.**

- **Developer candidate identifiers:** `resourceControl`, `technicalMastery`  |  role `utility`  |  ontology `equipment`, `repair`
- **Interpretation:** Selective component procurement.
- **Printed development / safety boundary:** Procurement: Just What Is Needed supplies parts under its actual use constraints; no free stockroom.

**D. I check the powered weapon for a repairable component that could safely provide a useful temporary output.**

- **Developer candidate identifiers:** `weaponEngineering`, `mechanicalMastery`  |  role `flex`  |  ontology `equipment`, `tech`
- **Interpretation:** Equipment repurposing with technical limits.
- **Printed development / safety boundary:** Outlaw Tech: Personalized Modifications applies to defined powered weapons; do not convert into an unrestricted beacon upgrade.

**E. I reduce the crossing to one simple test and stop revising the design once the test is good enough.**

- **Developer candidate identifiers:** `tacticalAwareness`, `resourcefulness`  |  role `support`  |  ontology `planning`, `reliability`
- **Interpretation:** Fast design iteration with a stopping rule.
- **Printed development / safety boundary:** Improviser: Custom Model is not a general reroll; ordinary testing is not an automatic success.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Improviser: Improvised Device, Custom Model; Outlaw Tech: Personalized Modifications. Scope and temporary item lifecycle matter.

### IMP-Q3-S03 — The Supplier’s Locked Counter

**Decision focus:** Finding the right equipment under supply constraints
**Primary Q1 routes (5):** `IMP-PR02`, `IMP-PR03`, `IMP-PR04`, `IMP-PR05`, `IMP-CF02`
**Coverage domains:** Procurement, Class development

> **Lucky Jack:** Well, now we’re shopping. Somebody hide the credit account from me.

A medical relay station needs replacement tools and protective equipment before an approaching storm. Local sellers have an incomplete catalog, and one specialist claims the best components are restricted stock. Several cheaper alternatives are available but may fail during the repair.

**How would you obtain what is needed?**

**A. I compare durability and repair needs before selecting the least fragile available kit.**

- **Developer candidate identifiers:** `resourceControl`, `technicalMastery`  |  role `utility`  |  ontology `equipment`, `durability`
- **Interpretation:** Procurement for reliability.
- **Printed development / safety boundary:** Procurement: Excellent Kit is item-scoped; no guaranteed universal protection.

**B. I look for a specialist supplier who already has suitably modified gear rather than pay to rebuild it ourselves.**

- **Developer candidate identifiers:** `networkInfluence`, `resourcefulness`  |  role `utility`  |  ontology `social_network`, `equipment`
- **Interpretation:** Supplier expertise as leverage.
- **Printed development / safety boundary:** Procurement: Only the Finest has acquisition/cost restrictions.

**C. I explore legal alternatives first, then investigate restricted supply channels only if the task genuinely demands them.**

- **Developer candidate identifiers:** `resourcefulness`, `criminalExpertise`  |  role `utility`  |  ontology `resources`, `network`
- **Interpretation:** Conditional sourcing under scarcity.
- **Printed development / safety boundary:** Procurement: Black Market Buyer and future Contraband; the survey gives no restricted items or credits.

**D. I identify which one tool would let an ally carry out the repair instead of buying everything on the list.**

- **Developer candidate identifiers:** `allySupport`, `resourceControl`  |  role `support`  |  ontology `equipment`, `skills`
- **Interpretation:** Targeted tool support for colleagues.
- **Printed development / safety boundary:** Procurement: Right Gear for the Job; must match printed skill and item rules.

**E. I reserve scarce components for the critical repair and postpone the upgrades that can wait until later.**

- **Developer candidate identifiers:** `resourceControl`, `tacticalAwareness`  |  role `leader`  |  ontology `resources`, `planning`
- **Interpretation:** Resource prioritization over novelty.
- **Printed development / safety boundary:** Contraband begins at Improviser level 2; no automatic equipment purchase ability.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Procurement: Excellent Kit, Only the Finest, Black Market Buyer, Right Gear for the Job, Just What Is Needed; Contraband is later-level and limited.

### IMP-Q3-S04 — The Shutdown Droid

**Decision focus:** Responding to a disabled machine and the temptation to repurpose it
**Primary Q1 routes (3):** `IMP-IM03`, `IMP-IM05`, `IMP-OT03`
**Coverage domains:** Improviser, Outlaw Tech

> **Lucky Jack:** Okay, that droid’s down. We could fix it, borrow its brain, or, hear me out, not make things worse.

A security droid has been disabled in a depot that is losing power. It could potentially be reactivated to reach a sealed control station, but another injured service droid is nearby. A timed failsafe is about to seal the depot’s exits.

**Which intervention do you choose?**

**A. I try the control station’s own access panel first rather than rely on controlling the disabled droid.**

- **Developer candidate identifiers:** `hackingSkills`, `technicalMastery`  |  role `utility`  |  ontology `use_computer`, `tech`
- **Interpretation:** Solve the access problem directly.
- **Printed development / safety boundary:** Outlaw Tech: Hot Wire; the use still requires applicable skill checks.

**B. I consider activating the disabled security droid only after accounting for its limited and destructive aftermath.**

- **Developer candidate identifiers:** `droidControl`, `resourceControl`  |  role `controller`  |  ontology `droid`, `control`
- **Interpretation:** Conditional tool use with lifecycle awareness.
- **Printed development / safety boundary:** Improviser: Capture Droid only affects a valid target and ends with droid destruction.

**C. I attempt a bounded temporary repair on the injured service droid to restore a safer alternative.**

- **Developer candidate identifiers:** `mechanicalMastery`, `allySupport`  |  role `support`  |  ontology `droid`, `repair`
- **Interpretation:** Preserve a non-hostile machine as first option.
- **Printed development / safety boundary:** Improviser: Improved Jury-Rig/Outlaw Tech: Quick Fix if legally held.

**D. I prepare a controlled diversion only if the doors cannot be opened through repair or access controls.**

- **Developer candidate identifiers:** `explosiveMastery`, `improvisation`  |  role `controller`  |  ontology `equipment`, `damage`
- **Interpretation:** Deliberate high-impact fallback.
- **Printed development / safety boundary:** Improviser: Bigger Bang requires appropriate explosive use; no free charge or indiscriminate blast.

**E. I split attention between the droid and the timer, stopping any experiment that risks trapping us inside.**

- **Developer candidate identifiers:** `tacticalAwareness`, `adaptability`  |  role `leader`  |  ontology `planning`, `resources`
- **Interpretation:** Time-aware safety over completing an experiment.
- **Printed development / safety boundary:** General technical coordination; not proof of prior droid captures.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Improviser: Capture Droid is temporary and destroys the captured droid at encounter end; Bigger Bang has strictly bounded explosives; Hot Wire is not full command authority over droids.

### IMP-Q3-S05 — A Plan That Outlived Its Parts

**Decision focus:** Accepting uncertainty and improving a failed design
**Primary Q1 routes (3):** `IMP-ID01`, `IMP-ID02`, `IMP-NEUTRAL`
**Coverage domains:** Improviser identity, Neutral

> **Lucky Jack:** First idea broke? Excellent. Now we know exactly one thing that doesn’t work.

A team attempts to set up a temporary field transmitter from salvaged equipment. The signal reaches its destination but fails unpredictably when the equipment overheats. You have enough material for one more adjustment before the receiver window closes, and nobody agrees on the source of the fault.

**How do you make the next decision?**

**A. I run the smallest test that distinguishes a heat problem from a power problem before changing anything else.**

- **Developer candidate identifiers:** `technicalMastery`, `knowledgeMastery`  |  role `utility`  |  ontology `science`, `tech`
- **Interpretation:** Diagnosis before risky alteration.
- **Printed development / safety boundary:** Ordinary Mechanics and Use Computer; no special research skill granted.

**B. I make a reversible alteration and keep the old parts ready in case the output degrades.**

- **Developer candidate identifiers:** `improvisation`, `resourcefulness`  |  role `utility`  |  ontology `jury_rig`, `modification`
- **Interpretation:** Reversible experimentation.
- **Printed development / safety boundary:** Improviser: Improvised Device/Custom Model are potential development, not proof of ownership.

**C. I ask each teammate for the part of the failure they actually observed instead of voting on guesses.**

- **Developer candidate identifiers:** `allySupport`, `informationControl`  |  role `support`  |  ontology `teamwork`, `investigation`
- **Interpretation:** Use observations from multiple sources.
- **Printed development / safety boundary:** Teamwork is ordinary coordination, not automatic aid-another success.

**D. I choose the reliable but less ambitious signal if it will reach the receiver before the window closes.**

- **Developer candidate identifiers:** `adaptability`, `resourceControl`  |  role `flex`  |  ontology `reliability`, `resources`
- **Interpretation:** Performance sufficient for the current objective.
- **Printed development / safety boundary:** General class identity; does not force another career direction.

**E. I leave the specialization open until I know which kind of technical challenge keeps recurring in my work.**

- **Developer candidate identifiers:** `resourcefulness`, `technicalInnovation`  |  role `flex`  |  ontology `planning`, `tech`
- **Interpretation:** Exploration before committing to specialization.
- **Printed development / safety boundary:** Neutrality remains unscored as a separate UX option; no negative technical bias is inferred.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** This scene can serve broad Q1 identity/neutral selections. It does not score a chosen prestige capstone as a mandatory later class, or infer a completed technical history.

## Pathfinder — Lead (`m03`)

**Voice authority:** `data/dialogue/mentors/lead/Lead_dialogues.json`  |  **Printed book:** Rebellion Era Campaign Guide pp. 43–45

**Shared Mentor introduction (DRAFT)**
> Terrain tells you what it wants to do to a careless team. The question is whether you notice in time to keep them moving.

### PTH-Q3-S01 — The Washed Crossing

**Decision focus:** Reconnaissance, route finding and choosing a defensible path
**Primary Q1 routes (6):** `PTH-AW01`, `PTH-AW02`, `PTH-AW05`, `PTH-AW08`, `PTH-SV04`, `PTH-PF04`
**Coverage domains:** Awareness, Survivor, Pathfinder

> **Lead:** That crossing looked fine yesterday. Terrain doesn’t owe us consistency.

A sudden storm has washed out the bridge to a remote village. The river is rising, the slopes above it are unstable, and a small group of travelers needs a route before dark. A faint track leads toward the ridge, but it may be a dead end.

**What do you check or choose first?**

**A. I examine the faint ridge track and test whether it remains usable beyond the first bend.**

- **Developer candidate identifiers:** `trackingMastery`, `tacticalAwareness`  |  role `scout`  |  ontology `tracking`, `perception`
- **Interpretation:** Trail evidence before leading anyone into danger.
- **Printed development / safety boundary:** Awareness: Expert Tracker requires Acute Senses; normal tracking/Survival rules still apply.

**B. I identify the most stable high ground before committing the group to any route.**

- **Developer candidate identifiers:** `wildernessLore`, `survivalSkills`  |  role `scout`  |  ontology `survival`, `exploration`
- **Interpretation:** Conservative terrain evaluation.
- **Printed development / safety boundary:** Survivor: Surefooted; terrain benefits depend on actual acquired talent.

**C. I establish a temporary defensible waiting area so travelers are not exposed while we test the crossing.**

- **Developer candidate identifiers:** `fortifications`, `allySupport`  |  role `defender`  |  ontology `cover`, `positioning`
- **Interpretation:** Protective position before further movement.
- **Printed development / safety boundary:** Pathfinder: Safe Zone has prerequisites and size/duration limits.

**D. I watch for signs of movement or ambush above the ridge while another traveler checks the river.**

- **Developer candidate identifiers:** `tacticalAwareness`, `allySupport`  |  role `support`  |  ontology `perception`, `recon`
- **Interpretation:** Distributed observation and danger sensing.
- **Printed development / safety boundary:** Awareness: Acute Senses and perception mechanics; no automatic detection.

**E. I identify a fallback route first, even if the primary path appears passable.**

- **Developer candidate identifiers:** `resourcefulness`, `tacticalAwareness`  |  role `leader`  |  ontology `planning`, `mobility`
- **Interpretation:** Contingency-first travel planning.
- **Printed development / safety boundary:** General reconnaissance; Pathfinder talents do not guarantee route safety.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Awareness: Expert Tracker, Acute Senses, Keen Shot; Survivor: Surefooted; Pathfinder: Safe Zone. No guaranteed safe path or automatic scouting report.

### PTH-Q3-S02 — Cover That Will Not Last

**Decision focus:** Preparing a safe position before a threatened engagement
**Primary Q1 routes (6):** `PTH-PF01`, `PTH-PF03`, `PTH-PF05`, `PTH-PF08`, `PTH-PF09`, `PTH-CF01`
**Coverage domains:** Pathfinder, Create Cover

> **Lead:** That wall stops sight, maybe. It won’t stop everything. Measure your assumptions.

A medical team must wait beside an exposed communications shelter for a shuttle pickup. Low crates, broken masonry and scattered machine housings offer partial protection. A hostile patrol may arrive before the shuttle, and the surrounding ground is too open for an easy escape.

**How do you make the position safer?**

**A. I choose the part of the shelter with the strongest existing cover and adjust how the team uses it.**

- **Developer candidate identifiers:** `fortifications`, `allySupport`  |  role `defender`  |  ontology `cover`, `ally_support`
- **Interpretation:** Improve existing defense before improvising new terrain.
- **Printed development / safety boundary:** Pathfinder: Enhance Cover; depends on terrain and actual talent ownership.

**B. I prepare an approach that slows a patrol reaching the shelter without trapping our own evacuees.**

- **Developer candidate identifiers:** `areaControl`, `tacticalSupport`  |  role `controller`  |  ontology `battlefield_control`, `movement`
- **Interpretation:** Control incoming movement.
- **Printed development / safety boundary:** Pathfinder: Defensive Measures and Safe Zone require printed conditions.

**C. I lay out a protected area where wounded travelers can recover while the pickup is delayed.**

- **Developer candidate identifiers:** `healingMastery`, `fortifications`  |  role `support`  |  ontology `recovery`, `cover`
- **Interpretation:** Support recovery from a designated position.
- **Printed development / safety boundary:** Pathfinder: Zone of Recuperation requires its own zone rules; not automatic healing.

**D. I identify one firing position that provides cover without losing sight of the likely approach.**

- **Developer candidate identifiers:** `accuracy`, `tacticalAwareness`  |  role `striker`  |  ontology `cover`, `precision`
- **Interpretation:** Prepared support fire from a defended position.
- **Printed development / safety boundary:** Pathfinder: Bunker Blaster has exact ranged/cover limits.

**E. I use loose material to build extra cover only if the time and tools make it practical.**

- **Developer candidate identifiers:** `improvisation`, `fortifications`  |  role `defender`  |  ontology `cover`, `crafting`
- **Interpretation:** Incremental fortification with realistic resources.
- **Printed development / safety boundary:** Pathfinder: Create Cover begins at level 2; no free construction at first entry.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Pathfinder: Obscuring Defenses, Enhance Cover, Defensive Measures, Zone of Recuperation, Bunker Blaster; Create Cover begins at prestige level 2.

### PTH-Q3-S03 — The Relocation Window

**Decision focus:** Coordinating team movement between defended positions
**Primary Q1 routes (5):** `PTH-PF02`, `PTH-PF06`, `PTH-PF07`, `PTH-PF10`, `PTH-SV03`
**Coverage domains:** Pathfinder, Survivor

> **Lead:** Holding is easy to say. Moving without becoming targets is the useful skill.

A scouting party has made a temporary safe position in a rocky hollow. A friendly messenger arrives with news that the intended destination has moved. The group must cross open ground to a second hollow while hostile observers may be tracking the route.

**How do you arrange the movement?**

**A. I coordinate with a nearby ally so we move together rather than leave one person isolated on the crossing.**

- **Developer candidate identifiers:** `allySupport`, `formation`  |  role `support`  |  ontology `teamwork`, `movement`
- **Interpretation:** Paired movement and mutual support.
- **Printed development / safety boundary:** Pathfinder: Escort Fighter has proximity and move restrictions.

**B. I select a new protected position and call the relocation only when the route is clear enough to risk.**

- **Developer candidate identifiers:** `tacticalAwareness`, `formation`  |  role `leader`  |  ontology `positioning`, `leadership`
- **Interpretation:** Planned redeployment to a safer location.
- **Printed development / safety boundary:** Pathfinder: Relocate depends on safe-zone and other prerequisites.

**C. I ready a supporting action at the launch point so others can move at the right moment.**

- **Developer candidate identifiers:** `allySupport`, `accuracy`  |  role `support`  |  ontology `setup`, `ally_support`
- **Interpretation:** Use of the position to support departure.
- **Printed development / safety boundary:** Pathfinder: Launch Point; requires actual triggering conditions and established position.

**D. I cover an ally’s move and remain ready to answer anyone who attacks them during the crossing.**

- **Developer candidate identifiers:** `reactionDefense`, `tacticalSupport`  |  role `defender`  |  ontology `reaction`, `overwatch`
- **Interpretation:** Protection while someone is in transit.
- **Printed development / safety boundary:** Pathfinder: Safe Passage; attack conditions and reach matter.

**E. I cross the most exposed stretch quickly and then scout back for whoever is still moving.**

- **Developer candidate identifiers:** `survivalSkills`, `rapidResponse`  |  role `scout`  |  ontology `mobility`, `survival`
- **Interpretation:** Speed used for reconnection and scouting.
- **Printed development / safety boundary:** Survivor: Sprint has the printed run-action effect, not a general bonus move.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Pathfinder: Escort Fighter, Relocate, Launch Point, Safe Passage; Survivor: Sprint. These are separate talent mechanics; no free extra move or attack.

### PTH-Q3-S04 — A Signal in the Dust

**Decision focus:** Ambush awareness and surviving a disrupted retreat
**Primary Q1 routes (5):** `PTH-AW03`, `PTH-AW04`, `PTH-AW06`, `PTH-AW07`, `PTH-SV01`
**Coverage domains:** Awareness, Survivor

> **Lead:** One footprint’s wrong. That’s usually the one that matters.

A forward team receives a garbled warning as dust blows across an old trade road. Two sentries appear at opposite ends of a shallow canyon, and a flare ignites near the group’s intended exit. You have only a moment to assess whether the team is being drawn into an ambush.

**How do you respond to the warning?**

**A. I identify the probable ambush line and warn the group before anyone charges toward the flare.**

- **Developer candidate identifiers:** `tacticalAwareness`, `initiative`  |  role `scout`  |  ontology `awareness`, `initiative`
- **Interpretation:** Early danger recognition.
- **Printed development / safety boundary:** Awareness: Improved Initiative; no universal prescience or guaranteed first turn.

**B. I keep moving defensively in case the sentries are trying to trap us between their positions.**

- **Developer candidate identifiers:** `evasion`, `combatAdaptability`  |  role `skirmisher`  |  ontology `ambush_defense`, `movement`
- **Interpretation:** Avoiding flanked or exposed ground.
- **Printed development / safety boundary:** Awareness: Uncanny Dodge I/II are separate talents with prerequisites.

**C. I brace for an area attack and take the best available escape route rather than trying to outshoot the flare.**

- **Developer candidate identifiers:** `evasionTactics`, `survivalSkills`  |  role `defender`  |  ontology `evasion`, `survivability`
- **Interpretation:** Survive the area threat.
- **Printed development / safety boundary:** Survivor: Evasion has area-attack hit/miss rules, not total immunity.

**D. I adjust our order of movement as the situation changes so we can regain initiative after the first shock.**

- **Developer candidate identifiers:** `initiative`, `tacticalAwareness`  |  role `leader`  |  ontology `initiative`, `tactics`
- **Interpretation:** Regroup and change tempo.
- **Printed development / safety boundary:** Awareness: Reset Initiative works with its own use rules and timing.

**E. I try to distinguish the actual threat from dust and misdirection before choosing the direction of retreat.**

- **Developer candidate identifiers:** `informationControl`, `trackingMastery`  |  role `scout`  |  ontology `perception`, `tracking`
- **Interpretation:** Truthful situational assessment under concealment.
- **Printed development / safety boundary:** Awareness: Acute Senses; line-of-sight and senses are not overridden.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Awareness: Reset/Improved Initiative, Uncanny Dodge I/II; Survivor: Evasion. All are restricted to their actual triggers and actions.

### PTH-Q3-S05 — The Route Nobody Likes

**Decision focus:** Choosing between speed, endurance and group safety
**Primary Q1 routes (4):** `PTH-SV02`, `PTH-ID01`, `PTH-ID02`, `PTH-NEUTRAL`
**Coverage domains:** Survivor, Pathfinder identity

> **Lead:** Every route costs something. Pick the cost you can actually pay.

A group must deliver life-support filters across uneven ground before a shelter’s reserves run low. One route climbs a steep ridge and risks exhaustion; another is longer but offers stable footing; a third passes through a narrow defile with a damaged gate. The travelers are tired, and weather is changing.

**Which responsibility do you take first?**

**A. I test the damaged gate and use a brief burst of strength only if it can safely open the defile.**

- **Developer candidate identifiers:** `survivalSkills`, `combatStamina`  |  role `utility`  |  ontology `endurance`, `movement`
- **Interpretation:** Measured strength under time pressure.
- **Printed development / safety boundary:** Survivor: Extreme Effort applies to qualifying Strength checks and specific action costs.

**B. I select the longer stable route if it gives every traveler a realistic chance to arrive safely.**

- **Developer candidate identifiers:** `survivalism`, `allySupport`  |  role `leader`  |  ontology `survival`, `teamwork`
- **Interpretation:** Safety and team endurance over speed.
- **Printed development / safety boundary:** General route choice; no automatic travel-speed bonus.

**C. I scout the ridge alone only far enough to verify the first obstacle before asking anyone else to climb.**

- **Developer candidate identifiers:** `explorationMastery`, `tacticalAwareness`  |  role `scout`  |  ontology `exploration`, `perception`
- **Interpretation:** Limited reconnaissance to reduce uncertainty.
- **Printed development / safety boundary:** Normal Survival and Perception checks; scouting does not reveal the whole route for free.

**D. I organize short rest and carry rotations so exhaustion does not decide the outcome for the weakest traveler.**

- **Developer candidate identifiers:** `allySupport`, `resourceControl`  |  role `support`  |  ontology `endurance`, `resources`
- **Interpretation:** Group pacing and resource sharing.
- **Printed development / safety boundary:** Pathfinder safe-zone talents have bounded mechanics; this is ordinary logistics.

**E. I explain the tradeoffs plainly and choose a route we can revise if the terrain proves worse than expected.**

- **Developer candidate identifiers:** `adaptability`, `knowledgeMastery`  |  role `flex`  |  ontology `planning`, `exploration`
- **Interpretation:** Transparent route decision-making under incomplete information.
- **Printed development / safety boundary:** An uncertain player choice cannot silently rewrite class or career aspiration.

**Separate unscored choice (draft):** I am not sure yet.  **Unscored navigation (draft):** Try another situation.

**Developer mechanical note:** Survivor: Extreme Effort; Pathfinder identity is to find and hold a safe route, not an assumed Rebel assignment or required future prestige class.

## Route appendix

### Imperial Knight
- `IK-Q3-S01` — A Convoy Between Two Fires: `IK-KR01`, `IK-KR02`, `IK-KR03`, `IK-KR04`, `IK-KR05`, `IK-LC01`, `IK-LC02`, `IK-LC03`, `IK-LC06`, `IK-LC07`, `IK-LC08`, `IK-LC10`, `IK-ID01`
- `IK-Q3-S02` — The Disarmed Duel: `IK-DU01`, `IK-DU02`, `IK-DU03`, `IK-DU04`, `IK-DU05`, `IK-DU06`, `IK-DU07`, `IK-DU08`, `IK-DU09`, `IK-DU10`, `IK-DU11`, `IK-LC04`, `IK-LC05`, `IK-LC09`, `IK-LC11`
- `IK-Q3-S03` — The Armor Warning: `IK-AR01`, `IK-AR02`, `IK-AR03`, `IK-AR04`, `IK-AR05`, `IK-AR06`, `IK-KA01`, `IK-KA02`, `IK-KA03`, `IK-KA04`, `IK-KA05`
- `IK-Q3-S04` — Orders and Judgment: `IK-ID02`, `IK-NEUTRAL`, `IK-FT01`, `IK-FT03`
- `IK-Q3-S05` — The Broken Signal: `IK-FT02`, `IK-FT04`, `IK-FT05`, `IK-FT06`, `IK-FT07`

### Shaper
- `SH-Q3-S01` — The Living Pump: `SH-SH01`, `SH-SH02`, `SH-SH04`, `SH-SH05`, `SH-AM01`
- `SH-Q3-S02` — Triage in a Living Corridor: `SH-AM02`, `SH-AM03`, `SH-AM04`, `SH-AM05`, `SH-AM06`
- `SH-Q3-S03` — The Enhancement Consent: `SH-IM01`, `SH-IM02`, `SH-IM03`, `SH-IM04`, `SH-IM05`, `SH-SH03`
- `SH-Q3-S04` — The Unfinished Design: `SH-CF01`, `SH-CF02`, `SH-ID01`, `SH-AM07`
- `SH-Q3-S05` — The Last Procedure: `SH-AM08`, `SH-ID02`, `SH-NEUTRAL`

### Assassin
- `ASN-Q3-S01` — A Rooftop with Two Exits: `ASN-MI01`, `ASN-MI02`, `ASN-MI11`, `ASN-MI16`, `ASN-AS01`, `ASN-AS02`, `ASN-AS04`, `ASN-AS06`, `ASN-AS09`, `ASN-CF01`
- `ASN-Q3-S02` — The Uncertain Vial: `ASN-MP01`, `ASN-MP02`, `ASN-MP03`, `ASN-MP04`, `ASN-MP05`, `ASN-MI10`
- `ASN-Q3-S03` — The Message Behind the Contract: `ASN-GH01`, `ASN-GH02`, `ASN-GH03`, `ASN-GH04`, `ASN-MI03`, `ASN-MI05`, `ASN-MI06`, `ASN-MI14`, `ASN-MI17`
- `ASN-Q3-S04` — The Exit After the Strike: `ASN-AS03`, `ASN-AS07`, `ASN-AS08`, `ASN-MI07`, `ASN-MI12`, `ASN-MI13`, `ASN-MI15`
- `ASN-Q3-S05` — The Wrong Target: `ASN-MI04`, `ASN-MI08`, `ASN-MI09`, `ASN-AS05`, `ASN-ID01`, `ASN-ID02`, `ASN-NEUTRAL`

### Charlatan
- `CHA-Q3-S01` — The Wrong Guest List: `CHA-DG01`, `CHA-DG02`, `CHA-DG03`, `CHA-DG04`, `CHA-DG05`, `CHA-DG06`, `CHA-TR03`, `CHA-TR04`, `CHA-TR06`
- `CHA-Q3-S02` — A Familiar Face in the Crowd: `CHA-TR01`, `CHA-TR02`, `CHA-TR05`, `CHA-FT11`, `CHA-ID01`
- `CHA-Q3-S03` — The Debt Behind the Favor: `CHA-FT01`, `CHA-FT02`, `CHA-FT05`, `CHA-FT08`, `CHA-FT13`, `CHA-CF01`, `CHA-CF02`
- `CHA-Q3-S04` — Odds That Changed at Midnight: `CHA-FT03`, `CHA-FT06`, `CHA-FT07`, `CHA-FT09`, `CHA-FT10`, `CHA-FT12`
- `CHA-Q3-S05` — The Story That Almost Worked: `CHA-FT04`, `CHA-ID02`, `CHA-NEUTRAL`

### Improviser
- `IMP-Q3-S01` — The Jammed Hatch: `IMP-OT02`, `IMP-OT04`, `IMP-IM01`, `IMP-CF01`
- `IMP-Q3-S02` — The Workbench of Spare Parts: `IMP-OT01`, `IMP-IM02`, `IMP-IM04`, `IMP-PR01`
- `IMP-Q3-S03` — The Supplier’s Locked Counter: `IMP-PR02`, `IMP-PR03`, `IMP-PR04`, `IMP-PR05`, `IMP-CF02`
- `IMP-Q3-S04` — The Shutdown Droid: `IMP-IM03`, `IMP-IM05`, `IMP-OT03`
- `IMP-Q3-S05` — A Plan That Outlived Its Parts: `IMP-ID01`, `IMP-ID02`, `IMP-NEUTRAL`

### Pathfinder
- `PTH-Q3-S01` — The Washed Crossing: `PTH-AW01`, `PTH-AW02`, `PTH-AW05`, `PTH-AW08`, `PTH-SV04`, `PTH-PF04`
- `PTH-Q3-S02` — Cover That Will Not Last: `PTH-PF01`, `PTH-PF03`, `PTH-PF05`, `PTH-PF08`, `PTH-PF09`, `PTH-CF01`
- `PTH-Q3-S03` — The Relocation Window: `PTH-PF02`, `PTH-PF06`, `PTH-PF07`, `PTH-PF10`, `PTH-SV03`
- `PTH-Q3-S04` — A Signal in the Dust: `PTH-AW03`, `PTH-AW04`, `PTH-AW06`, `PTH-AW07`, `PTH-SV01`
- `PTH-Q3-S05` — The Route Nobody Likes: `PTH-SV02`, `PTH-ID01`, `PTH-ID02`, `PTH-NEUTRAL`

## Executed structural acceptance checks

- 6 distinct prestige classes, 30 scenarios and 150 five-choice answer slots: **PASS**.
- All 30 scenario IDs and all 150 answer IDs unique; all 150 texts unique and first person: **PASS**.
- All 185 authored Q1 answer IDs assigned to exactly one primary Q3 scene: **PASS**.
- All proposed mechanical bias names, role identifiers and ontology topic strings belong to the 125 / 12 / 190 existing-identifier vocabularies from the live Q1 audit: **PASS (identifier validation only)**.
- No printed-rule eligibility, actor prerequisites, class feature acquisition, Mentor history or scoring behavior inferred merely from the route: **editorial review required**.
- No repository write, GitHub commit or push, Foundry actor changes or production API integration performed.


