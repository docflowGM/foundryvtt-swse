> **2026-11-13 OWNER-APPROVED PRESENTATION OVERRIDE:** All player-visible selectable answers must be first-person quoted statements **only**, with no role/path/classification labels or headings. Existing direction labels, tables, and mechanical mappings in this document are developer-facing design metadata. See `SWSE_L1_Player_Response_Display_Contract_2026-11-13.md`.

# SWSE L1 Adaptive Mentor Survey — Scoundrel Q1 review draft v0.1

Date: 2026-11-13
Status: PROPOSAL ONLY, not approved by the project owner.
Storage: local-only. Do not commit, push, or publish to GitHub without explicit authorization.
Scope: Q1 for starting-class Scoundrel only. Mentor introduction is a separate fixed authored line; the Q1 content is player-selectable first-person intent.

## Primary-source check

Source: *Star Wars Roleplaying Game: Saga Edition Core Rulebook*, printed pp. 45–47 (class introduction, statistics, features, talent trees, bonus feat list). Reviewed against scanned PDF pages and source TXT. Legacy repo comparison: `scripts/mentor/mentor-survey/definitions/L1_Scoundrel_Survey.js` on `main`, read-only review.

- Hit points at first level: 18 + Constitution modifier; subsequent Scoundrel levels: 1d6 + Constitution modifier.
- Base attack bonus: +0 at Scoundrel level 1; +15 at level 20.
- Class defense bonuses: +2 Reflex, +1 Will at level 1.
- Number of trained class skills: 4 + Intelligence modifier.
- Starting class feats (automatic; zero inferred preference weight): Point Blank Shot; Weapon Proficiency (pistols); Weapon Proficiency (simple weapons).
- Scoundrel class skills: Acrobatics, Deception, Gather Information, Initiative, Knowledge (specialties separately), Mechanics, Perception, Persuasion, Pilot, Stealth, Use Computer.
- Talents: at Scoundrel levels 1, 3, 5, etc. Subject to individual talent prerequisites.
- Scoundrel bonus feats: at Scoundrel levels 2, 4, 6, etc. Core list: Deadeye, Dodge, Melee Defense, Mobility, Precise Shot, Quick Draw, Rapid Shot, Running Attack, Skill Focus, Skill Training, Vehicular Combat, Weapon Proficiency (advanced melee weapons). Prerequisites still apply.
- Core talent trees: Fortune (Fool's Luck, Fortune's Favor, Gambler, Knack, Lucky Shot), Misfortune (Dastardly Strike, Disruptive, Skirmisher, Sneak Attack, Walk the Line), Slicer (Gimmick, Master Slicer, Trace), Spacer (Hyperdriven, Spacehound, Starship Raider, Stellar Warrior).
- Starting credits: 3d4 x 250.

### Source-to-survey distinctions

These four core talent trees are neither five official subclasses nor fixed roles; a Scoundrel can select talents across trees while meeting prerequisites. The old survey's archetype IDs and bias fields are *not* canonical identities and must not be reused as an SSOT. A Q1 choice expresses interest, not possession, class entitlement, prestige-class qualification, or a future career commitment. The Q2 career-calling selector remains the authority for selecting a broad parent aspiration. Automatic starting feats count as mechanics, never independent evidence of preference.

## Approved fixed Mentor introduction — Ol' Salty

> Arr! Pick yer path wisely, matey! The right tricks make the difference between a chest o' credits and a long walk out a short airlock.

This is displayed as the separate static Mentor stage introduction; it is not one of the player choices.

## Proposed Q1 question

**Which part of being a Scoundrel do you want to get good at first?**

## Proposed selectable first-person answers (NOT YET APPROVED)

1. **Pirate / Spacer:** “I want to master life among the stars—piloting, improvising, and knowing how to get myself and my crew out of trouble.”
2. **Trickster / Gambler:** “I want to outwit my enemies, take calculated risks, and turn bad odds in my favor.”
3. **Gunslinger:** “I want to become fast and accurate with a blaster, making every shot count when trouble starts.”
4. **Con Artist:** “I want to learn how to read people, talk my way past obstacles, and make the right deal at the right time.”
5. **Slicer / Saboteur:** “I want to master computers and machinery, bypass security, and make complicated systems work for me—or fail for my enemies.”
6. **I'm not sure yet:** “I'm not sure yet. I want to see what I'm capable of before deciding what to specialize in.”

### Proposed mechanical mapping (examples; do not treat as granted or guaranteed)

| Q1 direction | Starting-class support | Potential later advancement |
| --- | --- | --- |
| Pirate / Spacer | Pilot, Deception, Initiative | Spacer tree: Hyperdriven, Spacehound, Starship Raider; Vehicular Combat when legal |
| Trickster / Gambler | Deception, Initiative; Fortune and Misfortune tree access | Fool's Luck, Knack, Gambler, Lucky Shot (prerequisite Knack), Disruptive or Skirmisher |
| Gunslinger | Weapon Proficiency (pistols), Point Blank Shot, Initiative | Quick Draw, Precise Shot, Deadeye, Rapid Shot, Sneak Attack or Skirmisher as legal |
| Con Artist | Deception, Persuasion, Gather Information | Skill Focus / Skill Training, compatible Misfortune/Fortune talents, later legal social specialization routes |
| Slicer / Saboteur | Use Computer, Mechanics, Knowledge | Slicer tree: Gimmick, Master Slicer (requires Gimmick), Trace; other legitimate technical feats/talents |
| I'm not sure yet | Entire Scoundrel kit and legal choices | No declared specialization preference; no positive or negative tag vote |

### Review issues

- Legacy **Pirate**, **Trickster**, **Gunslinger**, **Con-Man**, and **Saboteur** labels are recognizable and mostly reusable. The proposal slightly broadens Pirate→Pirate/Spacer, Trickster→Trickster/Gambler, and Saboteur→Slicer/Saboteur so all four core trees are visible, while retaining distinct social versus misdirection interests.
- Con Artist is primarily a skill development emphasis, not a standalone core Scoundrel talent tree. Do not invent a class talent for it.
- Passive acquisition of Point Blank Shot or pistol proficiency is not preference evidence; a Q1 chosen Gunslinger interest is evidence.
- Keep Q1 about development methods, not selecting a formal profession. Let Q2 handle parent career choices such as pirate, smuggler, bounty hunter, charlatan, or technical specialist.
- The existing Scoundrel Q1 options and their generic prestige biases are not production-ready for the canonical adaptive ranker.
- No number weights, exact tags, or typed feat/talent IDs are approved here.

## Decision requested

Approve these five recognizable directions plus a neutral undecided response, or request substitutions before Q1 is locked. Remain on Scoundrel until approved; Scout is next.
