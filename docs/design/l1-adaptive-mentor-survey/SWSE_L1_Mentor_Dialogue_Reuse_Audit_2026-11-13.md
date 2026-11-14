# SWSE Level 1 Mentor Dialogue Reuse Audit

**Date:** 2026-11-13  
**Status:** Read-only design inventory; proposals are not approved implementation instructions.  
**Repository:** `docflowGM/foundryvtt-swse` (`main`, inspected through the GitHub connector).  
**Publication:** Local-only. Do not commit, push, open a PR, or merge without explicit owner approval.  
**Scope:** Level 1 Adaptive Mentor Survey, five questions only.

## 1. Summary

**Keep the Mentors and authored material. Replace the obsolete five-question structure, not the personalities.** The current files include extensive character-appropriate writing, class-specific skill/tactic scenarios, descriptions, and first-person statements. None of the old archetype identifiers, ad-hoc bias weights, or implicit prerequisites are automatically approved for reuse.

The new L1 order remains: Q1 class development; Q2 adaptive canonical parent career; Q3 career situation A; Q4 independent career situation B; Q5 long-term ambition. Stage-specific Mentor framing can be curated and fixed, while substantive questions and options adapt to pending chargen class, species, attributes and actual survey selections. No L1 Q6.

## 2. Authoritative content and live wiring

- `data/mentor-dialogues.json`: source of truth for Mentor personality, identity, portraits, guidance, level greetings, and gated Mentor stories.
- `scripts/engine/mentor/mentor-dialogues.data.js`: generated copy of that source; **do not edit directly**.
- `scripts/engine/mentor/mentor-dialogues.js`: exports Mentors, resolves Mentor data and guidance, including a `surveyGuidance` path.
- `scripts/mentor/mentor-survey/definitions/L1_{Jedi,Noble,Scoundrel,Scout,Soldier}_Survey.js`: five legacy banks; useful as a *copy and concepts library*, not as canonical archetype authority.
- `scripts/mentor/mentor-survey/definition-builder.js`: resolves class Mentor identity, title, portrait, `classGuidance` and `summaryGuidance`; does **not** currently expose `surveyGuidance` on its resolved Mentor subset.
- `scripts/apps/progression-framework/steps/l1-survey-step.js`: currently renders generic `_getCurrentMentorDialogue()` lines (intro/question/response/complete), overriding the value of distinct authored voice for live stage dialogue. It also has `voiceSurveyClarification()` with individualized Mentor framing for the Ask Mentor clarification path. `getStepData()` uses resolved portraits and class/summary guidance in its template fields.

Source links:
- https://github.com/docflowGM/foundryvtt-swse/blob/main/data/mentor-dialogues.json
- https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/engine/mentor/mentor-dialogues.data.js
- https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/engine/mentor/mentor-dialogues.js
- https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/apps/progression-framework/steps/l1-survey-step.js
- https://github.com/docflowGM/foundryvtt-swse/blob/main/scripts/mentor/mentor-survey/definition-builder.js

## 3. Per-Mentor preservation assessment

| Class | Mentor | Authentic authored line suitable to preserve or adapt | Caveat |
| --- | --- | --- | --- |
| Jedi | Miraj | "Answer honestly. I am not measuring perfection; I am listening for the shape of your intent." (`surveyGuidance`) | Very strong survey framing; reuse verbatim as an introduction or Q2 framing, subject to flow review. |
| Noble | J0-N1 | "Master, select pursuits that enhance both skill and social standing. Strategic refinement ensures maximum efficacy." (`classGuidance`) | Useful Q1 voice. Its current `surveyGuidance` is a generic developer-sounding instruction and should be replaced. |
| Scoundrel | Ol' Salty | "Arr! Pick yer path wisely, matey! The right tricks make the difference between a chest o' credits and a long swim in the void." (`classGuidance`) | Excellent Q1 voice. Its `surveyGuidance` and `featGuidance` are generic technical copy, not pirate voice. |
| Scout | Lead | "Skills are contingency plans. Train what lets you adapt when terrain, people, or plans change. Survival favors preparation." (`skillGuidance`; source uses paragraph breaks) | Good for a scenario-stage intro. Its current survey line says "better soldiers"; consider refining this to Scouts/field operators. |
| Soldier | Breach | "Pick what feels right in your hands. Same rule as weapons. If it fits, use it." (`classGuidance`) | Strong Q1 voice. Its current `surveyGuidance` and `featGuidance` are generic technical copy. |

**Do not blindly reuse level-one `levelGreetings`**: for Lead, Ol' Salty, and J0-N1 these narrate completed missions/scraps/accomplishments before initial character creation. These are good for advancement, not automatically valid for new characters. Miraj's and Breach's greetings may be more plausible for initial onboarding.

**Treat `mentorStory.tiers` as separately gated authored content.** Even attractive tier-one backstory lines should not be silently repurposed into ordinary L1 survey frames if doing so bypasses their original reveal rules.

## 4. Legacy survey content with reuse potential

| Class | Good legacy conceptual material | Example existing first-person or character-voice response | Disposition |
| --- | --- | --- | --- |
| Jedi | Lightsaber, Force, protection, investigation, diplomacy; understanding, service, future purpose | "I am the shield that protects the innocent." | Reuse as a seed for Q1 class direction or an applicable future situation, after source/legal validation. |
| Noble | Command, diplomacy, preparation, political leverage, support | "A conflict settled is worth more than a battle won." | Reuse conceptual content and adjust to first-person voice (e.g., "I believe..."). |
| Scoundrel | Smuggling, deception, slicing, salvage, bounty work, pilot, sabotage; existing clever statements | "The stars don't care about the law, and neither do I." | Strong reusable statement; only actually chosen answer should count as interest. |
| Scout | Reconnaissance, movement, stealth, frontier repairs, trail guiding, rescue, surveying, piloting | "Every trail ends somewhere. I just get there first." | Useful situation/scenario response material, converted into clear first-person where necessary. |
| Soldier | Suppression, lineholding, close-quarters combat, command, combat engineering, squad protection | "I hold the ground. Others decide what to do with it." | Reuse as a style indicator in Q1 or scenario; not as evidence of already acquired talents. |

The legacy banks currently have class-specific archetype labels in their Q1, static combat/past-experience/future-career questions in Q2–Q4, and Q5 branches driven by the Q1 selection. The new L1 design's Q2 must rank **canonical parent archetypes from `data/archetypes.json`**, and its Q3/Q4 must use a reusable many-to-many scenario library. Old static answers can be repurposed as scenario concepts; old Q5 branch statements can be candidates for Q1 or scenario response phrasing. Do not preserve legacy Q-numbering or branch mechanics.

## 5. Proposed stage-frame reuse approach (pending approval)

1. **Q1 / class development:** Prefer the Mentor's class-specific `classGuidance` or adapted equivalent; does not imply career selection.
2. **Q2 / career calling:** Preserve Miraj's `surveyGuidance`; preserve Lead's mission-brief voice; compose authentic replacements for J0-N1, Ol' Salty and Breach rather than using technical copy.
3. **Q3 / situation A:** Draw from the Mentor's appropriate `skillGuidance` or existing clarifying speech, but keep the scenario itself adaptive and career-relevant.
4. **Q4 / situation B:** Draw from `talentGuidance`, authored class guidance, or additional voice lines, without repeating Q3's narrative setup.
5. **Q5 / long-term ambition:** Use curated reflection/summary language, but avoid statements saying the profile is complete before the player actually answers Q5.

The five **stage frames are fixed by Mentor and stage**. The substantive question and answer sets are chosen adaptively from valid character context. This preserves consistency and makes authored voices easy to review.

## 6. Required safeguards

- Preserve exact name, portrait and class-to-Mentor mapping: Jedi/Miraj; Noble/J0-N1; Scoundrel/Ol' Salty; Scout/Lead; Soldier/Breach.
- The user-facing choices must be first-person declarations, not mechanical/debug labels. Some old Q5 answers are generic aphorisms or claims of accomplished mastery and need rewrites.
- The new Q2 is not a class-owned archetype selector; it is the canonical parent career choice, ranked by pending class, species, attributes and chosen Q1 interest, with unrestricted browsing of all canonical parents.
- Preserve hint/detail prose only when semantically correct. Verify skills/feats/talents against SWSE books and V2 typed authorities; no automatically inferred ownership or eligibility.
- Automatic house-rule/class/species grants count for capability but **zero** independent direct or indirect player-preference weight. Discretionary player selections can carry both capability and preference evidence; avoid double counting.
- Merely previewing, browsing or being offered an answer produces **no** intent event. Skipping leaves no implied rejection; editing an earlier answer invalidates dependent computed answers/evidence.
- No approval of historical arbitrary numerical weights, ad hoc `prestigeBias` strings, or legacy class-archetype IDs.
- No L1 Q6; the five-question L1 evidence record supports later reflection outside the L1 implementation scope.

## 7. Local-only design next steps

1. Build a **Mentor dialogue inventory** of candidate `Q1..Q5` stage frames sourced to existing JSON keys (with only explicitly marked rewrite proposals where a voice line is missing or inappropriate).
2. Review draft stage scripts with the owner **before** treating any as approved.
3. Reuse legacy answer and detail-rail copy as a curated library of scenario concepts, each revalidated against canonical skills and typed mechanic refs.
4. Finish the Q1 direction/answer banks for all five classes, then proceed to Q2 canonical parent selection and shared Q3/Q4 scenario library.
5. No source/production edits or Git publication without explicit authorization.
