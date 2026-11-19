> **2026-11-13 OWNER-APPROVED PRESENTATION OVERRIDE:** All player-visible selectable answers must be first-person quoted statements **only**, with no role/path/classification labels or headings. Existing direction labels, tables, and mechanical mappings in this document are developer-facing design metadata. See `SWSE_L1_Player_Response_Display_Contract_2026-11-13.md`.

# SWSE L1 Adaptive Mentor Survey — Scout Q1 Review Draft v0.1

**Date:** 2026-11-13  
**Status:** Draft for owner review; **not approved**.  
**Scope:** Scout Q1 only. No implementation. No GitHub commit or push.  
**Rule source:** *Star Wars Saga Edition Core Rulebook*, printed pp. 48–50 (PDF file `Star Wars Saga Edition.pdf`, PDF pages 49–51; searched against `Core Rulebook_djvu.txt`).  
**Current repository source:** `scripts/mentor/mentor-survey/definitions/L1_Scout_Survey.js`, read-only on `main`.

## 1. Approved fixed Mentor introduction

**Lead (Scout):**

> "You can't be good at everything. Anyone who tells you otherwise is either lying or about to become a casualty. So, where do you want to put your effort?"

This introduction is fixed and independent of Q1 response. The substantive Q1 question and options appear after it.

## 2. Canonical Scout class audit

- Starting HP: **24 + Constitution modifier**. Later Scout class levels provide **1d8 + Constitution modifier** HP (the printed PDF has a typographical class-name error in this sentence).
- BAB at Scout level 1: **+0**; Scout level 20: **+15**.
- Class defense bonuses: **+1 Fortitude, +2 Reflex**.
- Trained skills at first level: **5 + Intelligence modifier**.
- Scout class skills: Climb, Endurance, Initiative, Jump, Knowledge (all specialties, individually selected), Mechanics, Perception, Pilot, Ride, Stealth, Survival, Swim.
- Starting feats: **Weapon Proficiency (pistols)**, **Weapon Proficiency (rifles)**, **Weapon Proficiency (simple weapons)**, and **Shake It Off only if its prerequisites are met** (Constitution 13 and trained in Endurance). Do not treat conditional Shake It Off as universally possessed.
- Scout talents: first Scout level and every odd Scout level thereafter; bonus feats at even Scout levels. Every selected talent/feat must satisfy prerequisites.
- Four Core Scout class talent trees:
  - **Awareness** — Acute Senses, Expert Tracker (requires Acute Senses), Improved Initiative (requires Acute Senses), Keen Shot (requires Acute Senses), Uncanny Dodge I/II (prerequisite chains).
  - **Camouflage** — Improved Stealth, Hidden Movement (requires Improved Stealth), Total Concealment (requires Hidden Movement and Improved Stealth).
  - **Fringer** — Barter, Fringe Savant, Long Stride, Jury-Rigger.
  - **Survivor** — Evasion, Extreme Effort, Sprint, Surefooted.
- Core Scout bonus feats include Armor Proficiency (light, medium, or heavy), Careful Shot, Deadeye, Dodge, Far Shot, Linguist, Mobility, Point Blank Shot, Precise Shot, Rapid Shot, Running Attack, Skill Focus, Skill Training, Sniper, Vehicular Combat, Weapon Proficiency (advanced melee weapons). These are potential later options, subject to prerequisites, not automatic level-1 Scout bonus feats.
- Important negative skill fact: **Persuasion and Deception are not default Scout class skills**, although the Fringer Barter talent explicitly interacts with Persuasion checks.
- Starting feats are mechanical capabilities, not separate preference evidence; chosen Q1 answers are explicit intent evidence. Q1 must not imply automatic possession of talents or optional trained skills.

## 3. Existing Q1 and recommended reuse

Existing question: **"What kind of operator are you?"**

Existing five options and internal local IDs:

1. Skirmisher — `mobile_skirmisher`
2. Survivalist — `wilderness_survivalist`
3. Sniper — `recon_sniper`
4. Ranger — `condition_harrier`
5. Pilot — `pilot_operative`

The five names are reusable as player-facing labels, **not automatically as canonical archetype SSOT IDs**. The existing `conditionTrack`-weighted Ranger description is not mechanically established by the Core Scout talent trees; describe Ranger primarily as tracking/pursuit rather than guaranteed condition-track damage.

## 4. Proposed player-facing Q1

**Question:** "Which part of your Scout training do you most want to develop first?"

| Direction | First-person selectable answer | Core-supported development direction |
| --- | --- | --- |
| **Skirmisher** | "I want to stay mobile, react quickly, and learn how to keep enemies from pinning me down." | Survivor (Sprint, Surefooted, Evasion); Fringer (Long Stride); Initiative; later mobility-oriented feats. |
| **Explorer / Survivalist** | "I want to explore unfamiliar places, find a path where others can't, and keep myself and my companions alive far from help." | Survival, Endurance, Knowledge, Mechanics; Survivor talents; Jury-Rigger and fieldcraft. |
| **Sniper / Recon Marksman** | "I want to become a patient observer and accurate marksman, knowing when and where a single shot will matter most." | Perception, Stealth, Awareness (Keen Shot), and later Sniper, Careful Shot, Deadeye and related ranged feats as legal. |
| **Ranger / Tracker** | "I want to learn to read tracks, follow targets, and find what others have lost or tried to hide." | Survival, Perception, Stealth; Awareness talents Acute Senses and Expert Tracker. |
| **Pilot / Outrider** | "I want to master piloting and travel, getting my crew into difficult places and bringing them safely back out." | Pilot skill; later Vehicular Combat feat if eligible; Initiative and Scout mobility/survival talents useful in travel and field operations. |
| **I'm not sure yet** | "I'm not sure yet. I want to learn what I'm capable of before I decide where to concentrate my training." | **Zero declared specialization preference.** Continue Q2 using actual selected class, species and attributes; do not assume a generalist career preference. |

## 5. Design rationale and open questions

- These retain the five existing familiar Scout identities while grounding each in Core mechanics and adding a genuine neutral option.
- **Skirmisher vs Ranger:** Skirmisher = tactical movement/evasion; Ranger = tracking/pursuit. Do not let both simply score generic mobility.
- **Survivalist vs Ranger:** Survivalist = exploration, endurance and fieldcraft; Ranger = following tracks and locating targets.
- **Sniper** is an evocative direction supported by class proficiencies, skills and bonus-feat options but not a separately named Core Scout talent tree.
- **Pilot** is a Scout class skill and Vehicular Combat is a Scout bonus-feat possibility; the Scout **does not** have the Core Scoundrel's Spacer talent tree by default.
- Missing as a stand-alone direction: field technician/repair specialist. Core Scout has Mechanics and Jury-Rigger, so this is a legitimate optional sixth specialist direction, but adding it has not been decided. Include field repair as a secondary emphasis under Survivalist unless the owner requests a separate choice.
- Q1 should remain about initial class development, not a commitment to a Q2 career or prestige class.
- The original local archetype IDs and scores require an independent canonical data audit before implementation. No automatic mapping to `data/archetypes.json` is authorized.
- All content here remains **draft** until owner explicitly approves.
