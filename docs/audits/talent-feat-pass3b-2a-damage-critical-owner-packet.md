# Pass 3B.2A — Damage + Critical Mechanics: Owner Evidence Packet

Evidence extraction only. No recommendation, proposed change, semantic conclusion or disposition is made. Structural labels describe wording only. Every decision belongs to the owner.

## Totals

- Entries (record × detector): **17** (D 8, E 9); unique records: **17**; records with more than one distinct matching clause: 1
- By detector: D.damage_threshold 3, D.damage_bonus 4, D.sustained_damage 1, E.natural_20 9
- By domain: TALENT 12, FEAT 5
- Not in this packet: D.burst_damage (tag-convention question; later policy review); D.damage_generic (LOW confidence; evidence only); D.precision; D.precision_damage; E.critical_hit (already convergent; not reopened)

## D.damage_threshold → `damage_threshold` (3)

### Soft Reset — TALENT `2739921a657a49a496885c456bcace65`

- Family: D. Damage mechanics; detector D.damage_threshold (HIGH); compared tag `damage_threshold`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.47; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:2739921a657a49a496885c456bcace65|damage_threshold|D.damage_threshold`
- Current tags: `droid`, `self_repair`, `recovery`, `condition_removal`, `durability`, `resilience`, `survivability`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You are adept at rerouting your internal electronics. If you are moved to the bottom of the condition track by any means other than taking damage exceeding your damage threshold, you automatically move +1 step along the condition track after being disabled for 2 rounds.

Matching clause(s) (1):

1. Matched: "damage threshold" — structural labels: DAMAGE_THRESHOLD_COMPARED_TO_DAMAGE, CONSEQUENCE_OF_EXCEEDING_THRESHOLD_CHANGED
   > If you are moved to the bottom of the condition track by any means other than taking damage exceeding your damage threshold, you automatically move +1 step along the condition track after being disabled for 2 rounds.

Opposite-domain comparator(s) carrying the tag:

- **Galactic Alliance Military Training** — FEAT `03593bdccdd70fa2` (Legacy Era Campaign Guide p.36, FEAT_CANONICAL_RULES_SHAPE); tags: `damage_threshold`, `resilience`, `survivability`, `once-per-encounter`
  - labels: DAMAGE_THRESHOLD_COMPARED_TO_DAMAGE, CONSEQUENCE_OF_EXCEEDING_THRESHOLD_CHANGED — "The first time in an encounter that an attack exceeds your damage threshold, you do not move down the condition track."
  - labels: DAMAGE_THRESHOLD_COMPARED_TO_DAMAGE — "Ignore the condition-track movement from the first attack each encounter that exceeds your damage threshold."
- **Damage Conversion** — FEAT `1f404db00518aeed` (Scavenger's Guide to Droids p.22, FEAT_CANONICAL_RULES_SHAPE); tags: `damage_threshold`, `resilience`, `survivability`
  - labels: DAMAGE_THRESHOLD_COMPARED_TO_DAMAGE, CONSEQUENCE_OF_EXCEEDING_THRESHOLD_CHANGED — "When a non-area, non-ion, non-Force attack meets or exceeds your damage threshold, take 10 additional damage instead of moving down the condition track."

### Recruit Enemy — TALENT `43ac0c4b1759507a`

- Family: D. Damage mechanics; detector D.damage_threshold (HIGH); compared tag `damage_threshold`; compared tag currently present: **false**
- Source: Rebellion Era Campaign Guide p.41; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:43ac0c4b1759507a|damage_threshold|D.damage_threshold`
- Current tags: `once-per-encounter`, `persuasion`, `social`, `skills`, `will_defense`, `mind-affecting`, `control`, `manipulation`, `nonlethal`, `target-designation`, `survivability`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Once per encounter when you deal damage to a living creature that is equal to or greater than the target's current Hit Points and the target's Damage Threshold (that is, when you deal enough damage to kill the target), you can use this Talent. Make a Persuasion check against the target's Will Defense; if your result equals or exceeds the target's Will Defense, instead of dealing full damage, you deal half damage to the target and move it -1 step on the Condition Track. In addition, the target becomes your ally, and its Attitude toward you immediately shifts to Friendly. The target fights on your side until the end of the encounter, at which point it departs (or, if the GM wishes, the target might become your ally permanently and join your party). Anyone Hostile to you becomes Hostile to the target. This is a Mind-Affecting effect. If the target is a higher level than you, it gains a +5 bonus to its Will Defense. Enemies that cannot be bribed, blackmailed, or seduced (such as Stormtroopers) are immune to this effect.

Matching clause(s) (1):

1. Matched: "Damage Threshold" — structural labels: THRESHOLD_BELONGS_TO_ANOTHER_REFERENCED_MECHANIC
   > Once per encounter when you deal damage to a living creature that is equal to or greater than the target's current Hit Points and the target's Damage Threshold (that is, when you deal enough damage to kill the target), you can use this Talent.

Opposite-domain comparator(s) carrying the tag:

- **Teräs Käsi Training** — FEAT `b0feacaeae4860e9` (Galaxy at War p.28, FEAT_CANONICAL_RULES_SHAPE); tags: `martial_arts`, `unarmed`, `melee`, `damage_threshold`, `damage_bonus`
  - labels: DAMAGE_THRESHOLD_MODIFIED, THRESHOLD_BELONGS_TO_ANOTHER_REFERENCED_MECHANIC — "Once per round on a successful unarmed attack, reduce the target's Damage Threshold by 5 for determining that attack's effect."
  - labels: THRESHOLD_BELONGS_TO_ANOTHER_REFERENCED_MECHANIC — "Once per round, a successful unarmed attack treats the target's Damage Threshold as 5 lower."
- **Destructive Force** — FEAT `42dc0158ce091479` (Galaxy at War p.22, FEAT_CANONICAL_RULES_SHAPE); tags: `damage`, `damage_threshold`, `vehicle`, `burst_damage`, `battlefield_control`
  - labels: DAMAGE_THRESHOLD_COMPARED_TO_DAMAGE, THRESHOLD_BELONGS_TO_ANOTHER_REFERENCED_MECHANIC — "When damage to an object or vehicle both equals/exceeds its Damage Threshold and reduces it to 0 HP, deal 1 die of the same damage type to all adjacent targets, including allies."

### Akk Dog Trainer's Actions — TALENT `ad7fd3e1a2b04c30`

- Family: D. Damage mechanics; detector D.damage_threshold (HIGH); compared tag `damage_threshold`; compared tag currently present: **false**
- Source: Clone Wars Campaign Guide p.57; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:ad7fd3e1a2b04c30|damage_threshold|D.damage_threshold`
- Current tags: `beast_companion`, `followers`, `ally_support`, `support`, `teamwork`, `standard_action`, `action_economy`, `melee`, `ranged`, `damage_bonus`, `burst_damage`, `precision`, `sustained_damage`, `targeting`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You and your akk dog have bonded through the Force and can fight in concert. You can use any of the following actions on your turn. Attack in Concert: As a standard action, you can make a melee or ranged attack against a target in range. If your akk dog follower is adjacent to the target and your attack hits, the target also takes piercing damage equal to 1d6 + the akk dog's Strength modifier. This additional damage is considered part of your attack for the purposes of resolving damage, DR, SR, and overcoming damage threshold. Fall Upon Prey: As a standard action, you can make a melee or ranged attack against a target in range, and your akk dog can take the charge action against a target within its range. However, both you and your akk dog take a -5 penalty on your attack rolls (this replaces the bonus to attack rolls granted by the charge action). Paired Maul: As a standard action, you can make a melee or ranged attack against a target in range. If the attack hits, your akk dog follower gains a +2 competence bonus on its next attack roll against that target.

Matching clause(s) (1):

1. Matched: "damage threshold" — structural labels: DAMAGE_THRESHOLD_MENTIONED_NO_STRUCTURE_MATCHED
   > This additional damage is considered part of your attack for the purposes of resolving damage, DR, SR, and overcoming damage threshold.

Opposite-domain comparator(s) carrying the tag:

- **Fight Through Pain** — FEAT `a51721a36b699c7c` (Galaxy at War p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `will_defense`, `defense`, `damage_threshold`, `resilience`, `survivability`
  - labels: DAMAGE_THRESHOLD_MENTIONED_NO_STRUCTURE_MATCHED — "You may use Will Defense instead of Fortitude Defense when determining your Damage Threshold."
  - labels: DAMAGE_THRESHOLD_MENTIONED_NO_STRUCTURE_MATCHED — "Use Will Defense instead of Fortitude Defense to determine Damage Threshold."
- **Knock Heads** — FEAT `c0bd186e6fb23619` (Legacy Era Campaign Guide p.36, FEAT_CANONICAL_RULES_SHAPE); tags: `grab`, `grapple`, `unarmed`, `damage`, `damage_threshold`, `control`
  - labels: THRESHOLD_BELONGS_TO_ANOTHER_REFERENCED_MECHANIC — "Treat each target's damage threshold as 5 lower for this damage."
  - labels: DAMAGE_THRESHOLD_MENTIONED_NO_STRUCTURE_MATCHED — "After a successful two-target Multi-Grab, deal automatic 1d6 + Strength bludgeoning damage to both with effectively -5 damage threshold."

## D.damage_bonus → `damage_bonus` (4)

### Damage Conversion — FEAT `1f404db00518aeed`

- Family: D. Damage mechanics; detector D.damage_bonus (MEDIUM); compared tag `damage_bonus`; compared tag currently present: **false**
- Source: Scavenger's Guide to Droids p.22; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:1f404db00518aeed|damage_bonus|D.damage_bonus`
- Current tags: `damage_threshold`, `resilience`, `survivability`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: Pass 3B 3B.1 owner decision — `reliability` NO_CHANGE

Complete canonical mechanic text used by the detector:

> When a non-area, non-ion, non-Force attack meets or exceeds your damage threshold, take 10 additional damage instead of moving down the condition track. Each later use in the same encounter increases the additional damage by 5. Trade a condition-track step from a qualifying hit for extra damage, increasing the extra damage with repeated use.

Matching clause(s) (1):

1. Matched: "extra damage", "extra damage" — structural labels: ADDS_NUMERIC_OR_DICE_DAMAGE
   > Trade a condition-track step from a qualifying hit for extra damage, increasing the extra damage with repeated use.

Opposite-domain comparator(s) carrying the tag:

- **Ignite Fervor** — TALENT `0703de963a247170` (Saga Edition Core Rulebook p.43, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ally_support`, `support`, `teamwork`, `damage_bonus`, `melee`, `ranged`, `scaling`, `action_economy`
  - labels: ADDS_NUMERIC_OR_DICE_DAMAGE, BONUS_APPLIES_ONLY_CONDITIONALLY — "Whenever you hit an opponent with a melee or ranged attack, you can, as a free action, choose to give one ally within your line of sight a bonus to damage on the ally's next attack equal to the ally's character level."
- **Ataru** — TALENT `0b3f4075ed84aee0` (Saga Edition Core Rulebook p.218, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `lightsaber`, `melee`, `ability_enhancement`, `damage_bonus`, `sustained_damage`
  - labels: ADDS_NUMERIC_OR_DICE_DAMAGE, BONUS_APPLIES_ONLY_CONDITIONALLY — "You may add your Dexterity bonus instead of your Strength bonus on damage rolls when wielding a lightsaber."

### Hobbling Strike — FEAT `ccc7a6e191e811a4`

- Family: D. Damage mechanics; detector D.damage_bonus (MEDIUM); compared tag `damage_bonus`; compared tag currently present: **false**
- Source: Galaxy of Intrigue p.28; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:ccc7a6e191e811a4|damage_bonus|D.damage_bonus`
- Current tags: `melee`, `ranged`, `control`, `battlefield_control`, `movement`, `mobility`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Whenever one of those abilities would deal extra damage, forgo that extra damage to reduce the target's speed by 1 square until encounter end. Trade Sneak Attack/Rapid Shot/Rapid Strike extra damage to reduce the target's speed by 1 for the encounter.

Matching clause(s) (2):

1. Matched: "extra damage", "extra damage" — structural labels: ADDS_NUMERIC_OR_DICE_DAMAGE, BONUS_APPLIES_ONLY_CONDITIONALLY
   > Whenever one of those abilities would deal extra damage, forgo that extra damage to reduce the target's speed by 1 square until encounter end.
2. Matched: "extra damage" — structural labels: ADDS_NUMERIC_OR_DICE_DAMAGE
   > Trade Sneak Attack/Rapid Shot/Rapid Strike extra damage to reduce the target's speed by 1 for the encounter.

Opposite-domain comparator(s) carrying the tag:

- **Ignite Fervor** — TALENT `0703de963a247170` (Saga Edition Core Rulebook p.43, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ally_support`, `support`, `teamwork`, `damage_bonus`, `melee`, `ranged`, `scaling`, `action_economy`
  - labels: ADDS_NUMERIC_OR_DICE_DAMAGE, BONUS_APPLIES_ONLY_CONDITIONALLY — "Whenever you hit an opponent with a melee or ranged attack, you can, as a free action, choose to give one ally within your line of sight a bonus to damage on the ally's next attack equal to the ally's character level."
- **Ataru** — TALENT `0b3f4075ed84aee0` (Saga Edition Core Rulebook p.218, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `lightsaber`, `melee`, `ability_enhancement`, `damage_bonus`, `sustained_damage`
  - labels: ADDS_NUMERIC_OR_DICE_DAMAGE, BONUS_APPLIES_ONLY_CONDITIONALLY — "You may add your Dexterity bonus instead of your Strength bonus on damage rolls when wielding a lightsaber."

### Metamorph — FEAT `f59c9679c02b8896`

- Family: D. Damage mechanics; detector D.damage_bonus (MEDIUM); compared tag `damage_bonus`; compared tag currently present: **false**
- Source: Scum and Villainy p.23; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:f59c9679c02b8896|damage_bonus|D.damage_bonus`
- Current tags: `defense`, `stealth`, `damage_threshold`, `survivability`, `melee`, `positioning`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: Pass 3B 3B.1 owner decision — `action_economy` ADD

Complete canonical mechanic text used by the detector:

> Full-round action while using Shapeshift to increase or decrease size by one step; maintain for rounds/day equal Constitution score. Small: +1 Reflex, +5 Stealth, carrying capacity x0.75. Large: -1 Reflex, -5 Stealth, carrying capacity x2, +5 Damage Threshold, reach +1. Use Shapeshift as a full-round action to become one size smaller or larger, gaining the corresponding Reflex/Stealth/carrying/DT/reach changes.

Matching clause(s) (1):

1. Matched: "+5 Damage" — structural labels: ADDS_NUMERIC_OR_DICE_DAMAGE
   > Large: -1 Reflex, -5 Stealth, carrying capacity x2, +5 Damage Threshold, reach +1.

Opposite-domain comparator(s) carrying the tag:

- **Ignite Fervor** — TALENT `0703de963a247170` (Saga Edition Core Rulebook p.43, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ally_support`, `support`, `teamwork`, `damage_bonus`, `melee`, `ranged`, `scaling`, `action_economy`
  - labels: ADDS_NUMERIC_OR_DICE_DAMAGE, BONUS_APPLIES_ONLY_CONDITIONALLY — "Whenever you hit an opponent with a melee or ranged attack, you can, as a free action, choose to give one ally within your line of sight a bonus to damage on the ally's next attack equal to the ally's character level."
- **Ataru** — TALENT `0b3f4075ed84aee0` (Saga Edition Core Rulebook p.218, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `lightsaber`, `melee`, `ability_enhancement`, `damage_bonus`, `sustained_damage`
  - labels: ADDS_NUMERIC_OR_DICE_DAMAGE, BONUS_APPLIES_ONLY_CONDITIONALLY — "You may add your Dexterity bonus instead of your Strength bonus on damage rolls when wielding a lightsaber."

### Strength in Numbers — TALENT `22674c41b3d185be`

- Family: D. Damage mechanics; detector D.damage_bonus (MEDIUM); compared tag `damage_bonus`; compared tag currently present: **false**
- Source: Clone Wars Campaign Guide p.40; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:22674c41b3d185be|damage_bonus|D.damage_bonus`
- Current tags: `damage_reduction`, `defense`, `survivability`, `teamwork`, `positioning`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> If you are within 10 squares of an ally, you can add +2 to your Damage Reduction.

Matching clause(s) (1):

1. Matched: "add +2 to your Damage" — structural labels: ADDS_NUMERIC_OR_DICE_DAMAGE, BONUS_APPLIES_ONLY_CONDITIONALLY
   > If you are within 10 squares of an ally, you can add +2 to your Damage Reduction.

Opposite-domain comparator(s) carrying the tag:

- **Burst Fire** — FEAT `0d4d7c147c48cdab` (Saga Edition Core Rulebook p.82, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `damage_bonus`, `burst_damage`, `targeting`
  - labels: ADDS_NUMERIC_OR_DICE_DAMAGE — "With an autofire-capable ranged weapon in autofire mode, make a single-target attack at -5 for +2 damage dice."
  - labels: ADDS_NUMERIC_OR_DICE_DAMAGE — "Does not stack with Deadeye or Rapid Shot extra damage."
  - labels: ADDS_NUMERIC_OR_DICE_DAMAGE, BONUS_APPLIES_ONLY_CONDITIONALLY — "Use autofire against one target at -5 for +2 damage dice; low Strength makes the penalty -10 with non-vehicle weapons."
- **Justice Seeker** — FEAT `3595086bb17d4303` (Rebellion Era Campaign Guide p.34, FEAT_CANONICAL_RULES_SHAPE); tags: `ally-trigger`, `damage_bonus`
  - labels: ADDS_NUMERIC_OR_DICE_DAMAGE, BONUS_APPLIES_ONLY_CONDITIONALLY — "Gain +2 damage on attacks against targets that have damaged one of your allies since the end of your last turn."
  - labels: ADDS_NUMERIC_OR_DICE_DAMAGE, BONUS_APPLIES_ONLY_CONDITIONALLY — "Gain +2 damage against a target that has harmed one of your allies since your last turn ended."

## D.sustained_damage → `sustained_damage` (1)

### Deadly Sniper — FEAT `6fb0f56dd9b9b75c`

- Family: D. Damage mechanics; detector D.sustained_damage (MEDIUM); compared tag `sustained_damage`; compared tag currently present: **false**
- Source: Scum and Villainy p.21; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:6fb0f56dd9b9b75c|sustained_damage|D.sustained_damage`
- Current tags: `ranged`, `sniper`, `ambush`, `precision`, `damage_bonus`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Detailed Benefit: when making a ranged attack against a target unaware of you, gain +2 attack and +1 die damage on the first attack each turn. The printed summary table differs in wording and does not cleanly preserve the detailed prerequisite/effect. Against an unaware target, your first ranged attack each turn gains +2 attack and +1 damage die.

Matching clause(s) (1):

1. Matched: "each turn gains +2 attack and +1 damage" — structural labels: REPEATED_OR_ONGOING_DAMAGE_ACROSS_TURNS
   > Against an unaware target, your first ranged attack each turn gains +2 attack and +1 damage die.

Opposite-domain comparator(s) carrying the tag:

- **Force Throw** — TALENT `86565bbe8b8fd1a2` (Knights of the Old Republic Campaign Guide p.38, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `force_power_synergy`, `telekinesis`, `ranged`, `weapon_training`, `standard_action`, `action_economy`, `equipment`, `damage`, `sustained_damage`, `control`, `battlefield_control`, `force`
  - labels: REPEATED_OR_ONGOING_DAMAGE_ACROSS_TURNS — "If the weapon deals piercing or slashing damage, it becomes embedded in your target, remaining there and causing an additional die of damage each round at the end of the target's turn, and also when it is removed (removing the embedded weapon is a swift action and an adjacent ally can remove the embedded weapon for you)."

## E.natural_20 → `critical_success` (9)

### Critical Strike — FEAT `d9ecf143e6a9f889`

- Family: E. Critical mechanics; detector E.natural_20 (HIGH); compared tag `critical_success`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.32; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:d9ecf143e6a9f889|critical_success|E.natural_20`
- Current tags: `critical_hit`, `melee`, `swift_action`, `action_economy`, `setup`, `precision`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance. | A natural-20 trigger may be `critical_success` without being `critical_hit`.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Spend two consecutive swift actions in the same round to increase the critical threat range of your next melee attack by 1. Only a natural 20 remains an automatic hit. Lose the benefit if you lose line of sight to the target or take another action before the attack. Spend two consecutive swift actions to widen the next melee attack's critical range by 1, provided the sequence and line of sight are maintained.

Matching clause(s) (1):

1. Matched: "natural 20" — structural labels: NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER
   > Only a natural 20 remains an automatic hit.

Opposite-domain comparator(s) carrying the tag:

- **Skill Confidence** — TALENT `07cd591fb8dccb39` (Galaxy of Intrigue p.21, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `skills`, `skill_mastery`, `critical_success`, `durability`, `scaling`, `action_economy`, `setup`
  - labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Whenever you roll a natural 19 or a natural 20 on a skill check with that skill, you gain the benefits of the Critical Skill Success talent and also gain bonus hit points equal to your Charisma modifier."
- **Telekinetic Power** — TALENT `11cae48e1213c407` (Saga Edition Core Rulebook p.100, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `force`, `force_power_synergy`, `telekinesis`, `critical_success`, `action_economy`, `use_the_force`
  - labels: NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Whenever you roll a natural 20 on your Use the Force check to activate Force disarm, Force grip, Force slam, Force thrust, or move object, you may choose to use that Force power again immediately as a free action."

### Extended Critical Range (heavy weapons) — TALENT `04985a42930dff2a`

- Family: E. Critical mechanics; detector E.natural_20 (HIGH); compared tag `critical_success`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.42; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:04985a42930dff2a|critical_success|E.natural_20`
- Current tags: `heavy_weapon`, `ranged`, `critical_hit`, `precision`, `weapon_training`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance. | A natural-20 trigger may be `critical_success` without being `critical_hit`.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> When you are using a heavy weapon, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

Matching clause(s) (1):

1. Matched: "natural 20", "natural 20" — structural labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_EXCEPTION_PREVENTING_OR_ALLOWING_ANOTHER_EFFECT, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT
   > However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."
  - labels: NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Normal rule reminder: only a natural 20 on a Pilot check to activate a starship maneuver normally restores all starship maneuvers."
- **Spacer's Surge** — FEAT `dd6ad0e712e9a314` (Rebellion Era Campaign Guide p.35, FEAT_CANONICAL_RULES_SHAPE); tags: `pilot`, `vehicle`, `critical_success`, `force-point`, `resource_recovery`
  - labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Whenever you roll a natural 20 on a Pilot check, gain 1 temporary Force Point; it expires at encounter end if unused."
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE — "A natural 20 on Pilot grants a temporary Force Point for the encounter."

### Martial Resurgence — TALENT `0fb750f0f0e6f767`

- Family: E. Critical mechanics; detector E.natural_20 (HIGH); compared tag `critical_success`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.89; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:0fb750f0f0e6f767|critical_success|E.natural_20`
- Current tags: `unarmed`, `martial_arts`, `melee`, `critical_hit`, `force`, `force_power_synergy`, `force_capacity`, `resource_recovery`, `recovery`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance. | A natural-20 trigger may be `critical_success` without being `critical_hit`.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You recover all spent Force powers, adding them to your Force suite again, whenever you roll a natural 20 on an unarmed attack.

Matching clause(s) (1):

1. Matched: "natural 20" — structural labels: NAT20_MENTIONED_NO_STRUCTURE_MATCHED
   > You recover all spent Force powers, adding them to your Force suite again, whenever you roll a natural 20 on an unarmed attack.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."
  - labels: NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Normal rule reminder: only a natural 20 on a Pilot check to activate a starship maneuver normally restores all starship maneuvers."
- **Spacer's Surge** — FEAT `dd6ad0e712e9a314` (Rebellion Era Campaign Guide p.35, FEAT_CANONICAL_RULES_SHAPE); tags: `pilot`, `vehicle`, `critical_success`, `force-point`, `resource_recovery`
  - labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Whenever you roll a natural 20 on a Pilot check, gain 1 temporary Force Point; it expires at encounter end if unused."
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE — "A natural 20 on Pilot grants a temporary Force Point for the encounter."

### Extended Critical Range (rifles) — TALENT `141e1a07b365e0fd`

- Family: E. Critical mechanics; detector E.natural_20 (HIGH); compared tag `critical_success`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.42; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:141e1a07b365e0fd|critical_success|E.natural_20`
- Current tags: `ranged`, `critical_hit`, `precision`, `weapon_training`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance. | A natural-20 trigger may be `critical_success` without being `critical_hit`.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> When you are using a rifle, you extend the weapon's critical range by 1 (for example, 19-20 instead of 20). However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

Matching clause(s) (1):

1. Matched: "natural 20", "natural 20" — structural labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_EXCEPTION_PREVENTING_OR_ALLOWING_ANOTHER_EFFECT, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT
   > However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."
  - labels: NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Normal rule reminder: only a natural 20 on a Pilot check to activate a starship maneuver normally restores all starship maneuvers."
- **Spacer's Surge** — FEAT `dd6ad0e712e9a314` (Rebellion Era Campaign Guide p.35, FEAT_CANONICAL_RULES_SHAPE); tags: `pilot`, `vehicle`, `critical_success`, `force-point`, `resource_recovery`
  - labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Whenever you roll a natural 20 on a Pilot check, gain 1 temporary Force Point; it expires at encounter end if unused."
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE — "A natural 20 on Pilot grants a temporary Force Point for the encounter."

### Small Target — TALENT `70a06f3be4e9c216`

- Family: E. Critical mechanics; detector E.natural_20 (HIGH); compared tag `critical_success`; compared tag currently present: **false**
- Source: Scum and Villainy p.25; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:70a06f3be4e9c216|critical_success|E.natural_20`
- Current tags: `vehicle`, `pilot`, `critical_hit`, `defense`, `resilience`, `survivability`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance. | A natural-20 trigger may be `critical_success` without being `critical_hit`.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> When you are the pilot of a Colossal or smaller vehicle, capital ship weapons that take a -20 penalty on attack rolls against your vehicle, such as turbolasers, do not automatically score a critical hit on your vehicle on a natural 20. The attack is only a critical hit if the total attack roll (20 + the weapon's attack bonus) would normally hit your vehicle. Otherwise, the attack deals normal damage.

Matching clause(s) (1):

1. Matched: "natural 20" — structural labels: NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC
   > When you are the pilot of a Colossal or smaller vehicle, capital ship weapons that take a -20 penalty on attack rolls against your vehicle, such as turbolasers, do not automatically score a critical hit on your vehicle on a natural 20.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."
  - labels: NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Normal rule reminder: only a natural 20 on a Pilot check to activate a starship maneuver normally restores all starship maneuvers."
- **Spacer's Surge** — FEAT `dd6ad0e712e9a314` (Rebellion Era Campaign Guide p.35, FEAT_CANONICAL_RULES_SHAPE); tags: `pilot`, `vehicle`, `critical_success`, `force-point`, `resource_recovery`
  - labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Whenever you roll a natural 20 on a Pilot check, gain 1 temporary Force Point; it expires at encounter end if unused."
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE — "A natural 20 on Pilot grants a temporary Force Point for the encounter."

### Extended Critical Range (simple weapons) — TALENT `7cbd576e420a36b0`

- Family: E. Critical mechanics; detector E.natural_20 (HIGH); compared tag `critical_success`; compared tag currently present: **false**
- Source: Unknown Regions p.30; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:7cbd576e420a36b0|critical_success|E.natural_20`
- Current tags: `critical_hit`, `precision`, `weapon_training`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance. | A natural-20 trigger may be `critical_success` without being `critical_hit`.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> When you attack with a simple weapon, extend the weapon's critical range by 1. Anything other than a natural 20 is not an automatic hit; if the attack still misses, you do not score a critical hit.

Matching clause(s) (1):

1. Matched: "natural 20" — structural labels: NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_EXCEPTION_PREVENTING_OR_ALLOWING_ANOTHER_EFFECT, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC
   > Anything other than a natural 20 is not an automatic hit; if the attack still misses, you do not score a critical hit.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."
  - labels: NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Normal rule reminder: only a natural 20 on a Pilot check to activate a starship maneuver normally restores all starship maneuvers."
- **Spacer's Surge** — FEAT `dd6ad0e712e9a314` (Rebellion Era Campaign Guide p.35, FEAT_CANONICAL_RULES_SHAPE); tags: `pilot`, `vehicle`, `critical_success`, `force-point`, `resource_recovery`
  - labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Whenever you roll a natural 20 on a Pilot check, gain 1 temporary Force Point; it expires at encounter end if unused."
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE — "A natural 20 on Pilot grants a temporary Force Point for the encounter."

### Echani Expertise — TALENT `88ca4add87c2a86a`

- Family: E. Critical mechanics; detector E.natural_20 (HIGH); compared tag `critical_success`; compared tag currently present: **false**
- Source: Galaxy at War p.32; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:88ca4add87c2a86a|critical_success|E.natural_20`
- Current tags: `unarmed`, `martial_arts`, `melee`, `critical_hit`, `precision`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance. | A natural-20 trigger may be `critical_success` without being `critical_hit`.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> When making an unarmed attack, you extend your critical threat range by 1, for example 19-20 instead of 20. However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

Matching clause(s) (1):

1. Matched: "natural 20", "natural 20" — structural labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_EXCEPTION_PREVENTING_OR_ALLOWING_ANOTHER_EFFECT, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT
   > However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."
  - labels: NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Normal rule reminder: only a natural 20 on a Pilot check to activate a starship maneuver normally restores all starship maneuvers."
- **Spacer's Surge** — FEAT `dd6ad0e712e9a314` (Rebellion Era Campaign Guide p.35, FEAT_CANONICAL_RULES_SHAPE); tags: `pilot`, `vehicle`, `critical_success`, `force-point`, `resource_recovery`
  - labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Whenever you roll a natural 20 on a Pilot check, gain 1 temporary Force Point; it expires at encounter end if unused."
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE — "A natural 20 on Pilot grants a temporary Force Point for the encounter."

### Knowledge Is Power — TALENT `cdf46b8cdde49733`

- Family: E. Critical mechanics; detector E.natural_20 (HIGH); compared tag `critical_success`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.50; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:cdf46b8cdde49733|critical_success|E.natural_20`
- Current tags: `knowledge`, `galactic_lore`, `skills`, `swift_action`, `action_economy`, `target-designation`, `targeting`, `critical_hit`, `precision`, `investigation`, `setup`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance. | A natural-20 trigger may be `critical_success` without being `critical_hit`.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> As a swift action, you can designate a single target within your line of sight and make a Knowledge (galactic lore) check against a DC equal to 15 + the target's CL. If the check is successful, for the remainder of the encounter you score a critical hit against that target on a natural rol! of 19 or 20. If you have another ability that increases your weapon's critical range against that target (such as the elite trooper's extended critical range talent, or the Jedi Knight's Vaapad talent), you increase this range by 1 (for example, from 19-20 to 18-20). However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

Matching clause(s) (1):

1. Matched: "natural 20", "natural 20" — structural labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_EXCEPTION_PREVENTING_OR_ALLOWING_ANOTHER_EFFECT, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT
   > However, anything other than a natural 20 is not considered an automatic hit; if you roll anything other than a natural 20 and still miss the target, you do not score a critical hit.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."
  - labels: NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Normal rule reminder: only a natural 20 on a Pilot check to activate a starship maneuver normally restores all starship maneuvers."
- **Spacer's Surge** — FEAT `dd6ad0e712e9a314` (Rebellion Era Campaign Guide p.35, FEAT_CANONICAL_RULES_SHAPE); tags: `pilot`, `vehicle`, `critical_success`, `force-point`, `resource_recovery`
  - labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Whenever you roll a natural 20 on a Pilot check, gain 1 temporary Force Point; it expires at encounter end if unused."
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE — "A natural 20 on Pilot grants a temporary Force Point for the encounter."

### Precognitive Meditation — TALENT `f8ac7fecc8d3c8ff`

- Family: E. Critical mechanics; detector E.natural_20 (HIGH); compared tag `critical_success`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.75; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:f8ac7fecc8d3c8ff|critical_success|E.natural_20`
- Current tags: `force`, `meditation`, `precognition`, `visions`, `planning`, `setup`, `force_point_spend`, `resource_spend`, `defense`, `evasion`, `vehicle`, `pilot`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance. | A natural-20 trigger may be `critical_success` without being `critical_hit`.
- Prior owner rulings on this record: Pass 3B 3B.1 owner decision — `resource_recovery` ADD

Complete canonical mechanic text used by the detector:

> Once per day, you can spend 10 minutes meditating to seek visions of the future. At that time, you can spend a Force Point as a part of this meditation. Once during the rest of the day, whenever you or a vehicle you pilot are the target of an attack, you can choose to negate that attack provided the attack roll is not a natural 20. At the end of the day, if you did not use this ability, you regain the Force Point spent on the meditation.

Matching clause(s) (1):

1. Matched: "natural 20" — structural labels: NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT
   > Once during the rest of the day, whenever you or a vehicle you pilot are the target of an attack, you can choose to negate that attack provided the attack roll is not a natural 20.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."
  - labels: NAT20_AUTOMATIC_HIT_OR_BASIC_RULES_REMINDER, NAT20_APPEARS_IN_REFERENCED_OR_BASE_MECHANIC, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Normal rule reminder: only a natural 20 on a Pilot check to activate a starship maneuver normally restores all starship maneuvers."
- **Spacer's Surge** — FEAT `dd6ad0e712e9a314` (Rebellion Era Campaign Guide p.35, FEAT_CANONICAL_RULES_SHAPE); tags: `pilot`, `vehicle`, `critical_success`, `force-point`, `resource_recovery`
  - labels: NAT20_TRIGGERS_THE_RECORDS_BENEFIT, NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE, NAT20_DIRECTLY_MODIFIES_A_CHECK_OR_ATTACK_RESULT — "Whenever you roll a natural 20 on a Pilot check, gain 1 temporary Force Point; it expires at encounter end if unused."
  - labels: NAT20_RESTORES_OR_SPENDS_ANOTHER_RESOURCE — "A natural 20 on Pilot grants a temporary Force Point for the encounter."
