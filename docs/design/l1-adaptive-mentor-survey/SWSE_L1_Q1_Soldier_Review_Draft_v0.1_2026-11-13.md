# SWSE Level 1 Adaptive Mentor Survey — Soldier Q1 Review Draft v0.1

**Date:** 2026-11-13  
**Status:** Draft for owner review; **not approved**, not implemented  
**Location:** Local only; no GitHub writes authorized  
**Starting class:** Soldier  
**Mentor:** Breach

## Approved dialogue reused verbatim

> "Pick what feels right in your hands. Doesn't have to be a cannon, though I recommend one! So, what do you want to get good at?"

The Mentor dialogue is authored/static. The substantive question and six first-person player answers follow it. The character speaks only the response text; the interface does not display labels such as Tank, Sergeant, or Heavy Weapons Specialist.

## Proposed player-facing question

**Q1 — Which part of your Soldier training do you most want to develop first?**

### Player-visible responses — only these quotes appear

- "I want to master heavy weapons and learn how to put overwhelming firepower where it matters most."
- "I want to get good at fighting in armor, holding my ground, and protecting the people beside me."
- "I want to become a reliable marksman. Give me a rifle and a clear target, and I'll make the shot count."
- "I want to get in close and win the fight with my own strength, whether I'm armed or not."
- "I want to learn to read the battlefield, keep my squad working together, and bring everyone home."
- "I'm not sure yet. I'd rather see what training suits me before choosing a specialty."

## Developer-only interpretation — never display in player response list

| Response order | Legacy direction for human review | Supported Core Rulebook development examples | Guardrails |
| --- | --- | --- | --- |
| 1 | Heavy Weapons Specialist | Weapon Proficiency (heavy weapons) can be selected as an appropriate feat; Weapon Specialist talents and ranged/weapon feats when qualified; Mechanics and Knowledge (tactics) provide complementary skills. | Heavy weapon proficiency is **not** a starting Soldier feat. Do not fabricate a Core 'heavy weapons' talent tree or presume a specific weapon is owned. |
| 2 | Tank / Armor Specialist | Armor Specialist tree: Armored Defense, Armor Mastery, Improved Armored Defense, Juggernaut, Second Skin (prerequisites apply); Endurance and protective feats. | Light and medium armor proficiency is granted automatically, and contributes mechanical capability, not independent preference weight; heavy armor proficiency is not automatic. |
| 3 | Infantry / Marksman | Weapon Specialist tree; starting Weapon Proficiency (rifles); Perception, Initiative; Weapon Focus, Point Blank Shot, Precise Shot or other appropriate feat selections when qualified. | The rifle proficiency is automatic and does not independently show player preference. |
| 4 | Brawler / Close Quarters | Brawler tree: Melee Smash, Gun Club, Expert Grappler, Stunning Strike, Unbalance Opponent (prerequisites apply); Martial Arts feats, Power Attack and melee development. | Does not imply existing proficiency in advanced melee weapons. |
| 5 | Sergeant / Squad Support | Commando tree: Battle Analysis, Cover Fire, Harm's Way, Indomitable; Knowledge (tactics), Initiative, Treat Injury. | Do not invent a core Soldier 'command' talent tree; Draw Fire uses Persuasion, which is not a default Soldier class skill. |
| 6 | Undecided | No declared specialization preference. Q2 may still use the selected Soldier class, actual species mechanics, pending attributes, and other legitimate context. | Zero Q1 specialization vote, no negative evidence, no implied generic/generalist preference. |

The five labels above are for preserving the existing survey's design concepts during review; they are **not** canonical parent archetype IDs, class identities, tags, or labels to render in the player UI. A direct SSOT mapping is still required before implementation.

## Primary source checks

**Star Wars Saga Edition Core Rulebook**, Chapter III, printed pp. 51–53, visually reviewed against the provided PDF and text corpus. Relevant facts:

- Starting Soldier: 30 + Constitution modifier hit points; +1 BAB; +2 Fortitude/+1 Reflex class bonuses; 3 + Intelligence modifier trained class skills; talent at first and every odd Soldier level; bonus Soldier feat at even Soldier levels.
- Starting feats: Armor Proficiency (light), Armor Proficiency (medium), Weapon Proficiency (pistols), Weapon Proficiency (rifles), Weapon Proficiency (simple weapons).
- Class skills: Climb, Endurance, Initiative, Jump, Knowledge (tactics), Mechanics, Perception, Pilot, Swim, Treat Injury, Use Computer.
- Core Soldier talent trees: Armor Specialist, Brawler, Commando, Weapon Specialist.
- Soldier bonus feat list includes Weapon Proficiency (heavy weapons), Armor Proficiency (heavy), Weapon Focus, and many combat options; individual prerequisites must be evaluated.

## Existing Foundry survey baseline (read only)

`scripts/mentor/mentor-survey/definitions/L1_Soldier_Survey.js` currently offers five Q1 labels: Heavy Weapons Specialist, Tank, Infantry, Brawler, Sergeant. Its legacy `archetypeHint`, `prestigeBias`, and broad `talentBias` keys should not be copied directly into the new V2 canonical evidence contract.

## Acceptance points for owner review

- [ ] Approve/revise five first-person choices plus neutral 'I'm not sure yet'.
- [ ] Confirm wording of the substantive Q1 question after Breach's fixed introduction.
- [ ] Confirm player UI shows **only first-person response quotes** (no labels, scores, hints, or debug tags).
- [ ] Ensure all development examples remain advisory, source-validated, and prerequisite-aware.
- [ ] Preserve acquisition provenance: automatic starting feats count as capabilities, not preference events.

No changes have been made to the repo, runtime survey, or other local design references.
