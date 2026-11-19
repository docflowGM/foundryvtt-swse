# SWSE Prestige Survey, Q6 and Final Editorial Review
## Fresh Chat Handoff, 2026-11-15

**Repository:** `docflowGM/foundryvtt-swse`  
**Working branch:** `design/prestige-q2-character-synthesis-v08`  
**Last confirmed branch commit after Q5 publication:** `ec76c65f7e372d7a3e7fbd3dd2edf60e0c229bef`  
**Q5 commit message:** `docs: record complete prestige Q5 future-purpose editorial for 32 classes`  
**Q5 GitHub document:** `docs/design/SWSE_Prestige_Q5_Rolling_Editorial.md`  
**Status:** Q1 through Q5 have 32-class editorial coverage. Q6 prestige-specific dialogue and end-to-end editorial reconciliation are NEXT. There is no authorization for Foundry runtime implementation, schema migrations, scoring edits, new class grants, production PRs, or mechanical recertification. This handoff itself is a design work plan, not implementation permission.

## 0. Your immediate assignment

You are the next ChatGPT continuing the Star Wars Saga Edition Foundry VTT v13, V2-framework convergence project's **prestige survey**. Your job is to finish **Q6, The Mentor's Reflection**, in all 32 established prestige-class Mentor voices and conduct a **final Q1 to Q6 editorial consistency review**, without treating a drafted class as automatically approved.

Begin by reading the referenced GitHub documents **on the branch shown above**, checking that the branch still contains the Q5 commit. Verify the source-ledger status. Do not start over with a generic Q6 system or invent replacement Mentor personalities.

Suggested first response to the owner: summarize the verified Q1 to Q5 checkpoint, restate the existing approved Q6 A to E / NOT-and-AM architecture, and propose **one class-specific Q6 prototype for Ace Pilot / Mayu**. Ask for editorial approval of that prototype before scaling, unless the owner explicitly asks for large batches. Preserve the established style and user review process. Keep a rolling Markdown design record and commit only when the owner explicitly requests it.

## 1. Source documents and priority

Read these files, in this order. Paths are repository-relative:

| Priority | Path / ref | Role |
|---|---|---|
| 1 | `docs/design/SWSE_Multiclass_Prestige_Survey_Rolling_Design.md` at commit `1d56ae4279c53fa2f1a7ead2c312b4ef73ec7e79`, especially sections 9 and 13 | OWNER-CONFIRMED cross-survey rules: six question architecture, Q6 A to E, two-stage D/E correction, four authority lanes, Explore / Affirm goal handling, no-negative-exploration |
| 2 | `docs/design/SWSE_Multiclass_Survey_Rolling_Design.md` at commit `eb531a6b0fc5482edd62eedfea4dfebd312946ee`, especially `MC-Q6-PASS-A-REFLECTION-LIBRARY-01` and `MC-Q6-PASS-B-CORRECTION-LIBRARY-01` | The already-authored multiclass Q6 dynamic identity reflection and correction library. Reuse its CONTRACT and canonical references, do not copy the five base-class Mentor voices to prestige Mentors |
| 3 | `docs/design/SWSE_Prestige_Survey_Rolling_Design.md` on the working branch, current v0.26 | Prestige Q1 and mechanics/repository authority audit, Mentor roster, 32-class editorial libraries, source anomalies and remaining release gates. Its early Q1 designs are historical; use its later class-discovery pivot |
| 4 | `docs/design/SWSE_Prestige_Survey_Q2_Character_Synthesis.md` on the working branch, current v0.8 | Q2 editorial synthesis of previously developed, verified strengths, not a second talent-tree lecture or a future-career vote; 32 classes and 1,293 Q1 routes inventoried |
| 5 | `docs/design/SWSE_Prestige_Q3_All_32_Classes_Consolidated_v01.md` on the working branch | Q3 scenario bank, 32 classes, 160 scenes, 800 first-person answer options, Q1 route mapping; only the Ace Pilot scenario is owner-approved |
| 6 | `docs/design/SWSE_Prestige_Q4_Rolling_Editorial.md` on the working branch | Q4, four standardized depth identities (`dip`, `dive`, `swim`, `undecided`), 32 Mentor drafts, only Ace Pilot / Mayu explicitly approved |
| 7 | `docs/design/SWSE_Prestige_Q5_Rolling_Editorial.md` on the working branch, commit `ec76c65f7e372d7a3e7fbd3dd2edf60e0c229bef` | Q5 completed 32-class editorial record, 224 class-specific first-person answers, 64 two-tense introductions, 32 secondary-purpose prompts; Mayu's seven answers accepted positively by owner, all other Mentor wording is proposed |
| 8 | `data/dialogue/mentor_registry.json`, `data/mentor-dialogues.json` and each assigned `data/dialogue/mentors/<name>/*dialogue*.json` on the working branch | Actual Mentor voice and ID authorities. Some assignments are shared by two classes, with distinct relationship/role variants |
| 9 | `data/archetypes.json`, `scripts/engine/archetype/archetype-ssot-contract.js`, `scripts/engine/archetype/archetype-registry.js`, `data/audits/talent-feat-phase3-final-ontology.json` | Canonical identity and semantic references for evidence-based reflection. Do not invent archetypes, tags or class features |

The project also contains published SWSE PDF sources and searchable TXT transcriptions. TXT is useful for search, but the corresponding published PDF is final source authority for ambiguous mechanical wording, class identity or page interpretation. Q6 editorial drafting must avoid promising unverified mechanics.

IMPORTANT: older documents may retain historically true statements such as "local only" or "no GitHub write" from the time they were drafted. The Q5 file was subsequently committed by explicit user request. Do not confuse historical editorial status descriptions with current branch state; verify commit/ref directly.

## 2. Approved survey purpose by question

| Question | Purpose | Keep distinct from Q6 |
|---|---|---|
| Q1, The Journey | How previously developed choices and capabilities brought the character toward the chosen prestige path. The later Q1 class-discovery treatment supersedes early drafts. | No invented accomplishments or automatic class feature ownership |
| Q2, The Achievement | Synthesis of verified strengths the player developed before or while approaching the prestige identity. | No new destination choice or disguised future talent entitlement |
| Q3, The Responsibility | Applied hypothetical decision within the prestige vocation. | The hypothetical is not proof of a completed mission or a real-life preference outside the scenario |
| Q4, The Commitment | Additional future investment in this prestige class. `dip` / `dive` / `swim` / `undecided` are about depth. | The prestige class has already been earned or is being chosen; Q4 does not decide whether achievement has value, and no numerical level quotas are forced |
| Q5, The Future | What the achievement should mean to the character's future, whether it is fulfillment in itself, refinement, contribution, personal ambitions, a different career, exploration, or uncertainty. | Class-specific player statements, one required and at most one optional second; no automatic next-class goal |
| **Q6, The Mentor's Reflection** | Synthesized, evidence-grounded present-identity reading and player calibration/correction. | NOT a sixth ordinary preference-vote, a new goal editor, an entitlement system, or a forced transition into a new class |

A prestige class is often the **realization of a character's earlier ambition**, not merely a qualification for another prestige class. The system must recognize fulfilled goals without coercing the player to invent a subsequent target, even at character level 20 or in a short campaign. Q4 future depth and Q5 future purpose can independently differ without contradiction.

## 3. Q6 fixed contract, OWNER APPROVED

### 3.1 What the Mentor must reflect

Build a personalized reading from **finalized**, verified Actor state and available survey evidence:

1. **Current inferred identity**, based on the existing canonical parent archetype / specialization authority where reliably available. Identity is a reading, never a claim that the corresponding prestige class is owned.
2. **Up to roughly three real mechanical observations** supporting the reading, from actually owned class levels, feats, talents, trained skills and valid ability/feature evidence. Use fewer when evidence is sparse. Do not manufacture three examples merely to fill a quota.
3. **Previously declared future goal**, if one actually exists, quoted and distinguished from observed identity. A goal is not inferred from a viewed suggestion, Q5 exploratory choice or a generic answer category. If no such goal exists, acknowledge that the future destination is not declared rather than inventing one.
4. **Optional relationship** between current build and stated ambition, such as supports, complements, appears different from or unknown, if that conclusion itself has grounded evidence and is phrased without judgment.
5. **Fulfillment of a past declared ambition**, if an exact typed canonical goal is verifiably achieved in finalized class state. This is an achievement fact, separate from whether the PLAYER feels fulfilled and separate from any new goal. If fulfillment is not verifiable, do not claim it.
6. Ask whether the Mentor has understood the character **as the person they have become**, using the fixed A to E calibration choices. In prestige, the Mentor's achieved-milestone relationship differs from multiclass's incremental-development framing.

Use the **fixed Mentor opening, dynamically constructed identity reading, Mentor closing, A to E player choices** pattern established in multiclass Q6 Pass A. Reuse the canonical identity candidate and correction model from multiclass Pass B. Author prestige-specific Mentor opening/closing, branch dialogue and editorial alternatives in each established personality. Do not generate a meaningless 32 x 297 static speech matrix.

### 3.2 A to E calibration semantics

The five player choices MUST be first person, natural character speech; no percentages, diagnostic scales or internal labels are shown. The shared conceptual bands and illustrative midpoints are in the cross-survey v0.9 design and are NOT production-approved scoring constants:

| Internal answer | General meaning | Hidden band | Example midpoint | Follow-up |
|---|---|---|---|---|
| A | Substantially accurate | 80 to 100% | 0.90 | No follow-up, acknowledgment only; no self-amplifying repeated agreement |
| B | Mostly accurate, some correction | 60 to 80% | 0.70 | Targeted correction to roughly 1 to 2 shown interpretations |
| C | Uncertain or materially mixed | 40 to 60% | 0.50 | Soft realignment, roughly 1 to 3 shown inaccurate interpretations |
| D | Significant change since earlier reading | 20 to 40% | 0.30 | Two parts: select roughly 3 to 5 inaccurate/outdated interpretations, THEN select affirmative first-person statements for what DOES describe me |
| E | Fundamentally inaccurate | 0 to 20% | 0.10 | Two parts: select roughly 5 to 7 inaccurate interpretations, THEN select affirmative first-person statements for what DOES describe me |

Sparse evidence requires fewer genuine displayed options rather than fabricated items to satisfy nominal counts. The number of affirmative options is **not** required to equal the number rejected. Every negative correction must refer to an actual **inference shown in the frozen reading**, not a real acquired fact that the user is trying to delete by interpretation vote. Corrections must preserve acquired features, history, typed future goals and verified legal eligibility. The owner expressly required **both** NOT and AM stages for D and E; never collapse this into only the negative stage.

### 3.3 Use existing multiclass Q6 libraries correctly

- **Pass A:** 170 authored base-Mentor dynamic clause variants; composes current identity, owned evidence, stated ambition and uncertainty. The 297 archetype candidate registry covers 97 parents and 200 specializations, but do not assume the current live suggestion scorer ranks all of them. Exact typed IDs, `kind`, parent relationship and actor evidence are required. Thin/unresolved states are first-class outcomes.
- **Pass B:** First-person negative interpretation choices tied to **displayed claim kinds**, including parent/specialization, role inference, method, mechanical theme, trend, goal relationship, motivation inference and overconfidence; plus affirmative canonical self-identification candidates. Do not let negative choices dispute a factual feat or erase a goal.
- Multiclass Mentor voices **Miraj, J0-N1, Ol' Salty, Lead and Breach** are existing examples. Prestige includes 30+ different Mentor identities and two shared-personality cases. Reuse contract, evidence and correction semantics, not the wrong voice.
- An on-demand Talk to Mentor question, "What path am I currently following?", should reuse this Q6 identity interpretation and calibration contract rather than create a second separate identity engine.

### 3.4 Four independent authority lanes, non-negotiable

`declared_future_goal != inferred_current_identity != verified_mechanical_eligibility != finalized_acquisition`

- **Declared future goal:** A direct, affirmative first-person statement specifying a typed canonical target, provenance and history. Career discovery and exploration are NOT declarations. Explicit revision/supersession only, no inferred goal deletion.
- **Inferred current identity:** Evidence-based interpretation of finalized build and scoped Q6 correction, never a class grant.
- **Mechanical eligibility:** Determined solely by V2 rules/actor authority; an identity statement and future goal cannot unlock illegal options.
- **Finalized acquisition:** Class/level, features, feats and talents actually persisted by the authoritative transaction, not draft selections or previews.

A "no", "not yet" or exploration-only answer does **not** create negative weights on the entire class's tags, skills or ontology. Repeated career exploration, Q6 agreement or dialog must not infinitely compound signals. Keep Q6 reading snapshots and their actor/model/provenance context identifiable on retakes. Proposed coefficients from the historical design are **illustrative only** and must not be coded during editorial work.

## 4. Q5 user decisions carried forward

The owner explicitly selected three Q5 architectural rules and then positively accepted Mayu's seven first-person answer lines:

- **Fully class-specific answer banks**, not universal statements with the prestige class inserted.
- **Seven distinct conceptual categories**, but **do not show category names/titles** above player-facing answers. Show only the complete first-person statement.
- **One primary selection and up to one optional secondary purpose** from the remaining six. Do not silently give the secondary option numeric voting weight or turn it into a second career declaration.

The seven internal Q5 concepts are enduring calling, continued refinement, contribution, personal non-class dream, another professional destination, active exploration and undecided. All 32 classes have seven distinct first-person statements, both pending/finalized Mentor introductions, a class-local optional-second-purpose line, and a shared first-person decline option. Broad "another career" interest merely opens a **Discover -> Explore -> Affirm** conversation; an actual typed target is declared only after explicit affirmative player choice, and replacing a prior goal needs a separate confirmation. Q5 does not rewrite Q4 or Q6.

The Q5 GitHub file has **32 class sections, 224 purpose options, 64 Mentor introductions and 32 secondary prompts**. Ace Pilot / Mayu's **seven selectable statements** were positively accepted; Mayu intros and conditional career branches remain editorial proposals. For classes 2 to 32, drafting completion is NOT wording approval.

## 5. Q1 through Q5 status ledger for final review

| Question | Coverage confirmed | Owner approval status | What still needs review |
|---|---|---|---|
| Q1 | 32/32 class editorial libraries in prestige rolling design v0.26 | Foundational six-question architecture accepted; individual Q1 candidate wording and publication-sensitive mappings not all approved | Later Q1 class-discovery pivot must prevail over earlier historical drafts, verify identity and mechanics of selectable capabilities |
| Q2 | v0.8, 32/32 class synthesis coverage, 1,293 Q1 route IDs structurally inventoried | Synthesis direction owner-endorsed, complete prose NOT automatically approved | Routes, templates, time tense, actor evidence, mechanic ownership, quarantine issues |
| Q3 | 32/32 classes, 160 scenarios, 800 substantive first-person options, 1,293 Q1 route assignments | Ace Pilot Q3 owner-approved reference; remaining class wording proposed | Scenario uniqueness, class-specific situations, choice semantics, false history, route handling |
| Q4 | 32/32 Mentor intros and four-choice coverage | Shared 4-answer pattern approved; Ace Pilot / Mayu approved; other 31 class Mentor intros proposed | Wording and alignment with future class development only; no extra `bridge` depth |
| Q5 | 32/32, 224 first-person options, 64 intros, 32 optional followups | Owner-approved architecture; Ace Pilot seven player lines positively accepted; other 31 classes proposed | No titles above first-person choices, optional second, goal branches, unresolved wording |
| Q6 | Cross-survey Q6 structure approved, multiclass Pass A/B authored | Prestige-specific 32-class opening/closing and branches not yet fully drafted/approved | Primary assignment of next chat |

An owner's instruction to "continue", "next five", "next ten" or "finish" directed drafting, NOT approval of each class's words. Do not mark any of 31 unreviewed classes as approved based on inclusion in a GitHub file.

## 6. Complete class to Mentor sequence

Keep the established sequence and verify the live registry source before production mapping:

| # | Prestige class | Assigned Mentor |
|---|---|---|
| 1 | Ace Pilot | Mayu |
| 2 | Bounty Hunter | Kex Varon |
| 3 | Crime Lord | Tío the Hutt |
| 4 | Elite Trooper | Breach |
| 5 | Force Adept | Seeker Vera |
| 6 | Force Disciple | Riquis |
| 7 | Gunslinger | Rajma |
| 8 | Jedi Knight | Miraj |
| 9 | Jedi Master | Miraj |
| 10 | Officer | Admiral Korr |
| 11 | Sith Apprentice | Darth Malbada |
| 12 | Sith Lord | Darth Miedo |
| 13 | Corporate Agent | Marl Skindar |
| 14 | Gladiator | Pegar |
| 15 | Melee Duelist | Blade Master Kharjo |
| 16 | Enforcer | Krag the Immovable |
| 17 | Independent Droid | Seraphim |
| 18 | Infiltrator | Delta |
| 19 | Master Privateer | The Captain |
| 20 | Medic | Kyber |
| 21 | Saboteur | Spark |
| 22 | Outlaw | Rogue |
| 23 | Droid Commander | General Axiom |
| 24 | Military Engineer | Chief Engineer Rax |
| 25 | Vanguard | Shield Captain Theron |
| 26 | Martial Arts Master | Master Zhen |
| 27 | Imperial Knight | Dezmin |
| 28 | Shaper | Shaper Urza |
| 29 | Assassin | Delta |
| 30 | Charlatan | Silvertongue Sela |
| 31 | Improviser | Lucky Jack |
| 32 | Pathfinder | Lead |

**Important voice/routing distinctions:** Miraj has two distinct prestige relationships, Jedi Knight and Jedi Master; Delta has two distinct relationships, Infiltrator and Assassin; Breach / Lead have more than one foundation/prestige context. Tío's affectionate transactional voice differs from Krag's terse intimidation. Vera is thoughtful and curious, Riquis cryptic. Seraphim emphasizes self-ownership, General Axiom precise command. Darth Malbada is contemptuous and cruel, Darth Miedo quiet and absolute. Lucky Jack improvises playfully, Marl Skindar uses dry impatience, Rajma is playful and occasionally flirtatious. Each Mentor must sound like that established individual, not a generic Star Wars NPC.

**Known mapping discrepancy:** Melee Duelist routes to Blade Master Kharjo and `data/dialogue/mentors/kharjo/kharjo_dialogue.json` exists, but **Kharjo is absent from `data/dialogue/mentor_registry.json`**. Do not invent an ID or claim that this has been fixed.

## 7. Suggested Q6 editorial workflow, not an implementation directive

**Stage A, certify the Q6 source pattern.** Review cross-survey v0.9 sections 9 and 13, multiclass Pass A and Pass B, and the existing canonical archetype/ontology SSOTs. Produce a short acceptance checklist distinguishing owner-approved principles from provisional numeric models.

**Stage B, Ace Pilot / Mayu prototype.** Draft a pending-acquisition and finalized-acquisition Mentor opening, a compositional evidence-grounded identity reflection (including thin/uncertain cases), closing question, five first-person A to E player choices and every required conditional Mentor branch. Demonstrate a B minor correction, C uncertain correction, D two-stage NOT/AM, E two-stage NOT/AM; offer optional goal revision only as its own separate affirmative conversation. Show a case in which the player **already achieved a declared Ace Pilot goal and wants to remain an Ace** with no new destination. Confirm exact player-facing style before batch expansion.

**Stage C, scale by reviewed batches in the 32-class order.** Keep common Q6 evidence and correction semantics, author class-specific Mentor voice lines and meaningful contextual difference. For the same Mentor serving two classes, adjust relationship and thematic emphasis. Track each class as proposed/approved separately.

**Stage D, end-to-end Q1 through Q6 editorial review.** Read each committed Q1-Q5 library against Q6, verify transitions, no duplicate question intent, class-specific voices, first-person answer language, player-facing label restraint, Q1/Q3 routing, goal fulfillment logic, depth vs future, conditional branches and missing/ambiguous data. Document unresolved decisions rather than silently repairing mechanics.

**Stage E, final owner approval gate.** Show clear approved/proposed/open items and an editorial acceptance report. Do not commit unless owner instructs; do not implement until a distinct authorization and source/actor validation plan exist. Roll up final class approvals only when explicit.

## 8. Critical editorial and runtime edge cases for final review

1. **Pending versus finalized:** Prior to successful acquisition, no completed title, feature, rank or identity milestone can be claimed as owned. On cancellation, no persistent actor change or future-goal declaration may leak from the preview.
2. **Already achieved intended goal:** If a prior declared typed target truly equals the finalized acquired prestige class, state the achievement and allow satisfaction or a continuing calling. Do not force a successor destination. Player-reported fulfillment is separate from verified class ownership.
3. **Uncertain / no goal:** If there was no previous declaration, do not invent a Level 1 goal. Q5 undecided and Q6 unresolved must be valid.
4. **Goal and current build diverge:** Report each in separate clauses without making the character's current development seem erroneous, less authentic, or automatically illegal.
5. **Multiple prestige classes:** Each acquisition stands as a separate finalized event. Earlier prestige identity and declared ambition are not erased by a later class.
6. **Level 20 / low remaining budget:** Do not imply there is legal future advancement or an obligation to complete the class. The apex five-level classes are **Jedi Master, Sith Lord and Force Disciple**, but class cap and eligibility are decided by authoritative V2 rules.
7. **Thin evidence:** Never pad a reflection with fabricated feats, talents, training, missions, organizational associations or three made-up observations. Offer honest uncertainty and fewer correction choices.
8. **Mechanical quarantines:** Prestige design references flag unresolved source/identity cases, including some Gunslinger, Outlaw, martial-arts, Officer and Shaper/Force features; don't turn an uncertified source assertion into a Q6 acquired ability.
9. **Sith RAW / house rule:** There is an unresolved Dark Side Score/house-rule distinction for Sith eligibility. Do not decide it through Q6 narration.
10. **Wrong Mentor/mixed class:** Confirm actual mapped Mentor in current V2 class identity, never assume a relationship with the character based merely on having a related base class. Mentor biographies remain Mentor history, not player character history.
11. **Repeated reflections/retakes:** Snapshot exactly what Q6 asserted, associate the player's reply and corrections with those claims, preserve historical responses and avoid repeating synthetic calibration weight.
12. **Corrections:** D/E each require both NOT and AM, B/C correction scopes are smaller, affirmative alternatives are not forced to equal rejected count, and factual acquisition remains immutable by interpretation feedback.
13. **No title leakage:** Player Q5 answer options show only their first-person lines; by extension Q6 should avoid technical category titles, raw tags, archetype keys and percentages in the player view. Private developer keys remain available for traceability.
14. **No negative weights from refusal:** Declining a career path is not disinterest in all its associated tags, and browsing an option is not a future career declaration.
15. **No unapproved weighting or architecture:** Sections concerning decays, multipliers, half-lives or proposed midpoint math are design notes, not an instruction to overwrite the current suggestion engine.

## 9. Suggested Q6 owner review acceptance matrix

A Q6 class may be called **editorially ready for owner approval** only when these checks pass:

- Two correctly tensed Mentor introductions and an appropriate concluding interpretation question.
- An evidence-grounded compositional reflection with current identity, 0 to 3 verified actual facts, separately sourced declared goal or its honest absence, possible goal fulfillment and justified uncertainty.
- Five natural first-person A to E answers with common shared semantics and NO visible internal code/percentage information.
- A no-op A branch, targeted first-person B/C corrections, D/E negative **and** positive stages, each tied to displayed original inferences.
- Appropriate handling of thin evidence and the inability to meet nominal correction counts honestly.
- No alteration of owned mechanics, previous goal or legality through Q6 and no invented personal history.
- Unique voice consistent with the actual dialogue file, including dual-class Mentors.
- 32-class roster completeness, evidence route provenance, clear proposed/approved status.

The final global editorial pass should also check answer duplication, broken Q1 routes, mistaken Q3 scenario-as-history references, contradictory Q4 investment vs Q5 purpose interpretations, future-class pressure, multiple-goal semantics and pending-state tense. A separate live Foundry test and mechanical certification are required before release; an editorial pass is not runtime verification.

## 10. Handoff boundaries and exact next step

**Allowed right now:** Read repository and project reference files; draft Q6 designs, dialogue, example fixtures, consistency reports and local rolling Markdown; ask owner for content approval. Do not mislabel draft text as accepted.

**Not authorized right now:** Production edits, schema migration/cutover, compendium rewrites, scoring constants, runtime wiring, GitHub commits/pushes/PRs without new user instruction, automatic changes to player actor state or shortcuts around source certification.

**Recommended first deliverable:** An Ace Pilot / Mayu Q6 v0.1 prototype with one real-evidence fixture and one thin-evidence fixture, all A to E responses and D/E NOT/AM follow-up, a short list of owner decisions and explicit acceptance criteria. This prototype should faithfully reuse approved Q6 structure and not reopen the Q5 architecture decision.

**Important tone instruction from the owner:** Do NOT use em dashes in newly authored editorial text; prefer commas or periods. Every player-selectable line, including corrective branches and optional declines, is first person. For Q5 specifically, never display a heading or internal purpose category beside the player's first-person response.

**Verification boundary:** Source and counts in this handoff were checked against the GitHub design documents on `design/prestige-q2-character-synthesis-v08` during the 2026-11-15 session. The next ChatGPT must verify the newest branch HEAD rather than assume the ref can never move.