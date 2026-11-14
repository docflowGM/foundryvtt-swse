> **2026-11-13 OWNER-APPROVED PRESENTATION OVERRIDE:** All player-visible selectable answers must be first-person quoted statements **only**, with no role/path/classification labels or headings. Existing direction labels, tables, and mechanical mappings in this document are developer-facing design metadata. See `SWSE_L1_Player_Response_Display_Contract_2026-11-13.md`.

# SWSE L1 Adaptive Mentor Survey — Jedi Q1 Approved Working Design v0.3

**Date:** 2026-11-13  
**Scope:** Jedi Q1 only; other classes and Q2-Q5 remain in design.  
**Status:** OWNER APPROVED in conversation, 2026-11-13: six Q1 choices, including the specific specialists Jedi Watchman and Jedi Duelist, with the presented first-person wording. Implementation metadata, scoring, and mechanical mappings remain unapproved and require canonical validation.  
**Publication:** LOCAL ONLY. Do not commit, push, or publish without explicit permission.

## 1. Fixed Miraj introduction (previously accepted)

> Before we begin, tell me what you'd like to learn. Not what you believe you're supposed to be good at, but what you genuinely wish to understand.

This static mentor introduction appears before the separate substantive question.

## 2. Q1 substantive question — approved working text

**What kind of Jedi would you most like to develop into?**

## 3. Six first-person player answers — approved working text

| Option | First-person answer | Development interpretation |
| --- | --- | --- |
| Jedi Guardian | I want to become a Jedi Guardian, developing the strength and courage to face danger and protect others. | Combat readiness, defense, resilience, battlefield support; not a mandatory combat-only route. |
| Jedi Sentinel | I want to become a Jedi Sentinel, combining my skills, awareness, and knowledge of the Force to overcome challenges. | Broad versatility, awareness and practical skills, with Force-related threat detection and resistance. |
| Jedi Consular | I want to become a Jedi Consular, deepening my understanding of the Force and learning to guide others through wisdom and diplomacy. | Negotiation, advising, diplomacy and Force-oriented interest; no claim of automatically trained Persuasion or Force powers. |
| Jedi Watchman — specialist | I want to become a Jedi Watchman, investigating hidden dangers and uncovering threats before they can harm others. | Focused investigation and vigilant protection. This is a descriptive specialization, not a level-1 class/tree entitlement. |
| Jedi Duelist — specialist | I want to become a Jedi Duelist, dedicating myself to mastering the lightsaber and refining my combat technique. | Focused lightsaber combat, relevant feats and talents when eligible; not offensive Force-power specialization. |
| I'm not sure yet | I'm not sure yet. I would like to explore what the Force and my training have to offer before choosing a path. | Explicitly undecided: no positive or negative specialization preference evidence; do not insert an artificial 'generalist' or 'flexibility' vote. |

The owner explicitly approved Jedi Watchman and Jedi Duelist as the two specialist choices. These are development aspirations, not starting classes or automatically awarded mechanical paths.

## 4. Why these six

- Preserve three iconic, source-supported Jedi directions: Jedi Guardian, Jedi Sentinel, Jedi Consular.
- Offer two narrower aspirational development directions, separately from the broad three: a watchful investigator and a dedicated lightsaber duelist.
- Offer a genuine noncommittal choice without penalizing or fabricating preferences.
- Avoid turning choices into false statements of class ownership, specializations already achieved, or currently acquired trained skills, talents, feats or Force powers.
- Continue to Q2 even when the player is undecided, using the actual pending character-creation context for relevance rather than inventing a declaration of intent.
- Keep all answers as first-person utterances. Miraj's dialogue remains fixed and separate from this adaptive question-and-answer layer.

## 5. Known issues to resolve before implementation

1. Guardian, Sentinel, and Consular are **Jedi talent-tree identities and familiar fan labels**, not separate starting classes. This is a player-friendly direction menu, not selection of a second class.
2. Watchman and Sentinel are both approved options; implementation must preserve a clear investigation-focused Watchman versus broad adaptive Sentinel distinction and avoid double-counting tags.
3. Existing runtime `L1_Jedi_Survey.js` inaccurately models Watchman as a generic tank (`tank_guardian`) and Duelist as Force burst (`force_burst_striker`); **never reuse those bias maps unchanged**.
4. Existing pseudo-archetype labels and IDs are not canonical parent IDs in `data/archetypes.json`. Q1 does not grant Q2's parent career or restrict the player's ability to browse all canonical parents.
5. The system must use canonical typed skills, feats and talents only after eligibility and provenance verification. Automatic class features and starting feats provide mechanical capability but no additional preference votes.
6. Exact scoring, IDs, and quantitative weights remain unapproved. The undecided option records that Q1 was answered without creating specialization-preference evidence.

## 6. Source basis

- `Star Wars Saga Edition` Core Rulebook, Jedi class and Jedi Consular, Guardian, Sentinel, Lightsaber Combat talent trees (printed pp. 38-41).
- Local prior audit: `SWSE_L1_Q1_Jedi_Canonical_Class_Audit_2026-11-13.md`.
- GitHub main, inspected read-only: `scripts/mentor/mentor-survey/definitions/L1_Jedi_Survey.js` (current five legacy labels).

No production files or Git state were modified for this draft.
