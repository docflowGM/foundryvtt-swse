# SWSE L1 Adaptive Mentor Survey — Jedi Q1 Working Design v0.2

**Date:** 2026-11-13  
**Scope:** Jedi Q1 only; other classes and Q2-Q5 remain in design.  
**Status:** User direction adopted: keep Jedi Guardian / Sentinel / Consular; six total answers including two specialists and an undecided response. Exact specialist selections and final prose remain subject to user approval.  
**Publication:** LOCAL ONLY. Do not commit, push, or publish without explicit permission.

## 1. Fixed Miraj introduction (previously accepted)

> Before we begin, tell me what you'd like to learn. Not what you believe you're supposed to be good at, but what you genuinely wish to understand.

This static mentor introduction appears before the separate substantive question.

## 2. Q1 substantive question — proposed

**What kind of Jedi would you most like to develop into?**

## 3. Six first-person player answers — proposed wording

| Option | First-person answer | Development interpretation |
| --- | --- | --- |
| Jedi Guardian | I want to become a Jedi Guardian, developing the strength and courage to face danger and protect others. | Combat readiness, defense, resilience, battlefield support; not a mandatory combat-only route. |
| Jedi Sentinel | I want to become a Jedi Sentinel, combining my skills, awareness, and knowledge of the Force to overcome challenges. | Broad versatility, awareness and practical skills, with Force-related threat detection and resistance. |
| Jedi Consular | I want to become a Jedi Consular, deepening my understanding of the Force and learning to guide others through wisdom and diplomacy. | Negotiation, advising, diplomacy and Force-oriented interest; no claim of automatically trained Persuasion or Force powers. |
| Jedi Watchman — specialist *candidate* | I want to become a Jedi Watchman, investigating hidden dangers and uncovering threats before they can harm others. | Focused investigation and vigilant protection. This is a descriptive specialization, not a level-1 class/tree entitlement. |
| Jedi Duelist — specialist *candidate* | I want to become a Jedi Duelist, dedicating myself to mastering the lightsaber and refining my combat technique. | Focused lightsaber combat, relevant feats and talents when eligible; not offensive Force-power specialization. |
| I'm not sure yet | I'm not sure yet. I would like to explore what the Force and my training have to offer before choosing a path. | Explicitly undecided: no positive or negative specialization preference evidence; do not insert an artificial 'generalist' or 'flexibility' vote. |

The last two named specialist lanes are proposed as the most direct reuse of the existing five option labels from the current L1 Jedi survey. They are **not** claimed to have been specifically chosen by the user yet. Alternative specialist lanes can be considered if greater mechanical separation is desired.

## 4. Why these six

- Preserve three iconic, source-supported Jedi directions: Jedi Guardian, Jedi Sentinel, Jedi Consular.
- Offer two narrower aspirational development directions, separately from the broad three: a watchful investigator and a dedicated lightsaber duelist.
- Offer a genuine noncommittal choice without penalizing or fabricating preferences.
- Avoid turning choices into false statements of class ownership, specializations already achieved, or currently acquired trained skills, talents, feats or Force powers.
- Continue to Q2 even when the player is undecided, using the actual pending character-creation context for relevance rather than inventing a declaration of intent.
- Keep all answers as first-person utterances. Miraj's dialogue remains fixed and separate from this adaptive question-and-answer layer.

## 5. Known issues to resolve before implementation

1. Guardian, Sentinel, and Consular are **Jedi talent-tree identities and familiar fan labels**, not separate starting classes. This is a player-friendly direction menu, not selection of a second class.
2. Watchman may semantically overlap with Sentinel. Its investigation focus must be demonstrably narrower than the broad Sentinel direction, or another specialist should be chosen.
3. Existing runtime `L1_Jedi_Survey.js` inaccurately models Watchman as a generic tank (`tank_guardian`) and Duelist as Force burst (`force_burst_striker`); **never reuse those bias maps unchanged**.
4. Existing pseudo-archetype labels and IDs are not canonical parent IDs in `data/archetypes.json`. Q1 does not grant Q2's parent career or restrict the player's ability to browse all canonical parents.
5. The system must use canonical typed skills, feats and talents only after eligibility and provenance verification. Automatic class features and starting feats provide mechanical capability but no additional preference votes.
6. Exact scoring, IDs, and quantitative weights remain unapproved. The undecided option records that Q1 was answered without creating specialization-preference evidence.

## 6. Source basis

- `Star Wars Saga Edition` Core Rulebook, Jedi class and Jedi Consular, Guardian, Sentinel, Lightsaber Combat talent trees (printed pp. 38-41).
- Local prior audit: `SWSE_L1_Q1_Jedi_Canonical_Class_Audit_2026-11-13.md`.
- GitHub main, inspected read-only: `scripts/mentor/mentor-survey/definitions/L1_Jedi_Survey.js` (current five legacy labels).

No production files or Git state were modified for this draft.
