# SWSE L1 Adaptive Mentor Survey - Q1 Jedi Review Draft v0.1

**Date:** 2026-11-13
**Status:** PROPOSAL ONLY; not approved/implemented.
**Git:** Local only, no commit/push authorized.
**Scope:** One class (Jedi), Q1 only. Other four classes and Q2-Q5 question design remain open.

## Presentation contract

- Show Miraj's **fixed stage introduction** first:

> "Before we begin, tell me what you'd like to learn. Not what you believe you're supposed to be good at, but what you genuinely wish to understand."

- Then show the **separate substantive Q1 question**:

> **Which part of your Jedi training would you most like to develop first?**

- Then show the **player's selectable first-person responses**. These are intentions, not declarations of acquired feats, talents, trained skills, or classes.

## Proposed player responses (for review, not yet approved)

| Direction | Player first-person choice | Source-supported direction, subject to typed-identity verification |
| --- | --- | --- |
| Lightsaber proficiency | "I want to master the lightsaber, learning to fight with precision and defend myself in a duel." | Lightsaber Combat talent tree (e.g., Block, Deflect, Lightsaber Defense); Weapon Focus (lightsabers) as separately selected feat. |
| Force mastery | "I want to deepen my understanding of the Force and learn to wield its powers." | Use the Force class skill and Force Training feat, only when its prerequisites are met; Force Sensitivity is an automatic Jedi starting feat, not separate evidence of this preference. |
| Protection of others | "I want to become someone others can depend on when danger threatens." | Jedi Guardian's ally-facing Battle Meditation and Jedi Consular's Skilled Advisor; defensive Jedi talents may contribute to survival. Protection is not a claim of an automatic ally-protection mechanic. |
| Awareness and investigation | "I want to sharpen my senses, uncover hidden dangers, and understand what others overlook." | Perception and Knowledge (all) are Jedi class skills; Jedi Sentinel includes Clear Mind and Dark Side Sense. |
| Negotiation and peacemaking | "I want to resolve conflicts through patience, understanding, and words before drawing a weapon." | Jedi Consular's Adept Negotiator, Force Persuasion (after its prerequisite); **Persuasion is not a default Jedi class skill** and must not be presented as already trained. |

### Potential missing lane

The original five Q1 archetype labels do not explicitly represent a Jedi who values **mobility, acrobatics, and initiative**. The Core Rulebook has Acrobatics and Initiative as Jedi class skills and Guardian options such as Acrobatic Recovery and Force Intuition. Consider whether a sixth choice is warranted before locking Q1; do not silently add or reject it.

## Current implementation versus target design

- Existing `scripts/mentor/mentor-survey/definitions/L1_Jedi_Survey.js` Q1 asks **"What type of Jedi do you want to be?"** and shows **Jedi Guardian / Sentinel / Consular / Watchman / Duelist** as five archetype-labeled answers.
- These existing entries have local pseudo-archetype IDs (`precision_striker`, `sentinel_generalist`, `battlefield_controller`, `tank_guardian`, `force_burst_striker`) and bias maps; they must not be treated as canonical parent archetype identity.
- Several existing labels conflate class development, combat role, and future specialization and some are mechanically misleading. Salvage useful *intent themes* but replace identity-assignment behavior.
- Q1 should capture **one explicit immediate development preference** and feed Q2 career ranking as a signal, with no automatic feat/talent grant or prestige identity.
- The survey must read currently selected chargen class and other pending character context. Attributes/species can influence relevance, not turn automatically granted features into evidence of the player's ambitions.
- No numeric weights, IDs, tag mappings, or availability gates are approved in this file.

## Source grounding

- `Core Rulebook_djvu.txt`, Jedi class features and class skills section; Jedi Consular, Jedi Guardian, Jedi Sentinel, and Lightsaber Combat talent tree sections; Force Training feat prerequisites.
- GitHub `main`, `scripts/mentor/mentor-survey/definitions/L1_Jedi_Survey.js`, current Q1 and Q2; code inspected read-only 2026-11-13.
- Published PDFs remain the final authority if OCR/text and printed rules conflict. No mechanic reference IDs have been certified against the V2 production registries in this draft.
