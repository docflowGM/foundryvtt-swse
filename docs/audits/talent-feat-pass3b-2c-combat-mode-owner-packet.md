# Pass 3B.2C — Combat Mode Primitives: Owner Evidence Packet

Evidence extraction only. No recommendation, proposed change, semantic conclusion or disposition is made. Structural labels describe wording only. Every decision belongs to the owner.

## Totals

- Entries (record × detector): **9** (O 9); unique records: **9**; records with more than one distinct matching clause: 2
- By detector: O.full_attack 1, O.dual_wield 1, O.stun 7
- By domain: FEAT 3, TALENT 6
- Not in this packet: O.melee, O.ranged, O.lightsaber, O.pistol, O.unarmed (weapon-scope batch); O.heavy_weapon and O.exotic_weapon tag-convention questions (not expanded); findings already closed by a prior owner ruling or owner decision

## O.full_attack → `full_attack` (1)

### Rapid Assault — FEAT `4be60753991eec43`

- Family: O. Weapon / combat mode; detector O.full_attack (HIGH); compared tag `full_attack`; compared tag currently present: **false**
- Source: Saga Edition FAQ — Official Optional Rules p.e2; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:4be60753991eec43|full_attack|O.full_attack`
- Current tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action. Normal penalties for two-weapon fighting or Double Attack still apply. You cannot make more than two attacks through Rapid Assault regardless of how many attacks your normal Full Attack could produce. This is an official optional rule, not a mandatory Core rule. Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties.

Matching clause(s) (1):

1. Matched: "Full Attack" — structural labels: MERELY_REFERENCES_A_NORMAL_FULL_ATTACK
   > You cannot make more than two attacks through Rapid Assault regardless of how many attacks your normal Full Attack could produce.

Opposite-domain comparator(s) carrying the tag:

- **Multiattack Proficiency (rifles)** — TALENT `ecb678c47bb2cb43` (Legacy Era Campaign Guide p.41, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ranged`, `full_attack`, `sustained_damage`, `precision`, `weapon_training`
  - labels: MERELY_REFERENCES_A_NORMAL_FULL_ATTACK — "Whenever you make multiple attacks with any type of rifle as a full attack action (see page 154 of the Saga Edition core rulebook), you reduce the penalty of your attack rolls by 2."
- **Flurry of Blows** — TALENT `11b45afc4136594c` (Galaxy at War p.33, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `unarmed`, `martial_arts`, `melee`, `full_attack`, `sustained_damage`, `scaling`, `precision`
  - labels: DIRECTLY_PERFORMS_A_FULL_ATTACK, MODIFIES_FULL_ATTACK_PENALTIES — "When you make multiple unarmed attacks as a full attack action, you reduce the penalty to your attack roll by 2."

## O.dual_wield → `dual_wield` (1)

### Synchronized Fire — TALENT `388f30468a80f221`

- Family: O. Weapon / combat mode; detector O.dual_wield (MEDIUM); compared tag `dual_wield`; compared tag currently present: **false**
- Source: Starships of the Galaxy p.17; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:388f30468a80f221|dual_wield|O.dual_wield`
- Current tags: `once-per-encounter`, `ally_support`, `support`, `teamwork`, `ranged`, `damage_reduction`, `shields`, `damage_threshold`, `burst_damage`, `setup`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Once per encounter, you may ready to fire a single weapon at the same target as an ally, and you coordinate with a single weapon of your ally. If both attacks hit, you add the damage of the two weapons together before applying the target's SR or DR, and treat it as a single attack for purposes of exceeding the target's damage threshold.

Matching clause(s) (1):

1. Matched: "two weapons" — structural labels: DIRECTLY_USES_TWO_WEAPONS
   > If both attacks hit, you add the damage of the two weapons together before applying the target's SR or DR, and treat it as a single attack for purposes of exceeding the target's damage threshold.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: DIRECTLY_USES_TWO_WEAPONS — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: MODIFIES_TWO_WEAPON_ATTACKS_OR_PENALTIES — "Normal penalties for two-weapon fighting or Double Attack still apply."
  - labels: MODIFIES_TWO_WEAPON_ATTACKS_OR_PENALTIES — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Dual Weapon Mastery I** — FEAT `84d8866a57381620` (Saga Edition Core Rulebook p.84, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `double_weapon`, `full_attack`, `precision`, `sustained_damage`
  - labels: DIRECTLY_USES_TWO_WEAPONS — "When full-attacking with two weapons or both ends of a double weapon, take -5 instead of -10 on all attacks until the start of your next turn."
  - labels: MODIFIES_TWO_WEAPON_ATTACKS_OR_PENALTIES — "Reduce two-weapon/double-weapon Full Attack penalty to -5."

## O.stun → `stun` (7)

### Ion Shielding — FEAT `43a4b873d9a9984d`

- Family: O. Weapon / combat mode; detector O.stun (HIGH); compared tag `stun`; compared tag currently present: **false**
- Source: Scavenger's Guide to Droids p.22; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:43a4b873d9a9984d|stun|O.stun`
- Current tags: `damage_threshold`, `resilience`, `survivability`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> If ion damage before being halved equals or exceeds damage threshold, move only 1 step down the condition track instead of the normal 2. Qualifying ion damage moves you only one step down the condition track instead of two.

Matching clause(s) (2):

1. Matched: "ion damage" — structural labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED
   > If ion damage before being halved equals or exceeds damage threshold, move only 1 step down the condition track instead of the normal 2.
2. Matched: "ion damage" — structural labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED
   > Qualifying ion damage moves you only one step down the condition track instead of two.

Opposite-domain comparator(s) carrying the tag:

- **Set for Stun** — TALENT `878d89b7232413cf` (Force Unleashed Campaign Guide p.49, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ranged`, `stun`, `nonlethal`, `swift_action`, `action_economy`, `damage_threshold`, `control`, `battlefield_control`, `targeting`, `setup`
  - labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED — "You are particularly adept with stun weapons."
  - labels: MODIFIES_STUN_DAMAGE_OR_STUN_MODE — "If you are using a ranged weapon that deals stun damage (including a lethal weapon set to stun), you can spend two consecutive swift actions in the same round to activate this talent."
  - labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED — "If the stun damage on your next attack exceeds the target's damage threshold, you move the target -3 steps along the condition track instead of the normal -2."
- **Take Them Alive** — TALENT `cf59931d6a0c0719` (Scum and Villainy p.33, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ally_support`, `support`, `teamwork`, `nonlethal`, `stun`, `survivability`, `control`
  - labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED — "Whenever you or any of your allies within 6 squares of you reduces a target to 0 hit points, you can choose to treat that opponent as though they had been reduced to 0 by stun damage and thus remain stable."

### Droid Hunter — FEAT `5d17898fc9652370`

- Family: O. Weapon / combat mode; detector O.stun (HIGH); compared tag `stun`; compared tag currently present: **false**
- Source: Clone Wars Campaign Guide p.29; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:5d17898fc9652370|stun|O.stun`
- Current tags: `droid`, `damage_bonus`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Gain +2 damage against droids, or +4 damage when using a weapon that deals ion damage. With a proficient weapon, deal +2 damage to droids, or +4 with ion damage.

Matching clause(s) (2):

1. Matched: "ion damage" — structural labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED
   > Gain +2 damage against droids, or +4 damage when using a weapon that deals ion damage.
2. Matched: "ion damage" — structural labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED
   > With a proficient weapon, deal +2 damage to droids, or +4 with ion damage.

Opposite-domain comparator(s) carrying the tag:

- **Set for Stun** — TALENT `878d89b7232413cf` (Force Unleashed Campaign Guide p.49, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ranged`, `stun`, `nonlethal`, `swift_action`, `action_economy`, `damage_threshold`, `control`, `battlefield_control`, `targeting`, `setup`
  - labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED — "You are particularly adept with stun weapons."
  - labels: MODIFIES_STUN_DAMAGE_OR_STUN_MODE — "If you are using a ranged weapon that deals stun damage (including a lethal weapon set to stun), you can spend two consecutive swift actions in the same round to activate this talent."
  - labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED — "If the stun damage on your next attack exceeds the target's damage threshold, you move the target -3 steps along the condition track instead of the normal -2."
- **Take Them Alive** — TALENT `cf59931d6a0c0719` (Scum and Villainy p.33, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ally_support`, `support`, `teamwork`, `nonlethal`, `stun`, `survivability`, `control`
  - labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED — "Whenever you or any of your allies within 6 squares of you reduces a target to 0 hit points, you can choose to treat that opponent as though they had been reduced to 0 by stun damage and thus remain stable."

### Sudden Storm — TALENT `c101826c205debf2`

- Family: O. Weapon / combat mode; detector O.stun (HIGH); compared tag `stun`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.83; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:c101826c205debf2|stun|O.stun`
- Current tags: `force`, `force_point_spend`, `resource_spend`, `unarmed`, `melee`, `burst_damage`, `battlefield_control`, `mobility`, `positioning`, `action_economy`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Instead of a normal melee attack at the end of the charge, you can spend a Force Point to make a Whirlwind Attack (as per the feat) at the end of a charge, provided you are not wielding any weapons (except combat gloves or stun gauntlets).

Matching clause(s) (1):

1. Matched: "stun" — structural labels: REFERENCES_A_STUN_WEAPON_OR_EFFECT_ONLY_AS_AN_EXCEPTION
   > Instead of a normal melee attack at the end of the charge, you can spend a Force Point to make a Whirlwind Attack (as per the feat) at the end of a charge, provided you are not wielding any weapons (except combat gloves or stun gauntlets).

Opposite-domain comparator(s) carrying the tag:

- **K'tara Training** — FEAT `1dfbddf5f1aa57c3` (Galaxy at War p.27, FEAT_CANONICAL_RULES_SHAPE); tags: `martial_arts`, `unarmed`, `melee`, `ambush`, `damage_bonus`, `stun`, `control`, `once-per-encounter`, `swift_action`, `action_economy`, `setup`
  - labels: APPLIES_A_STUNNED_OR_STUNNING_EFFECT, RESISTS_OR_REMOVES_A_STUN_EFFECT — "Once per encounter after unarmed damage to a target denied Dexterity to Reflex, make a free unarmed attack vs Fortitude; on success, target cannot speak until end of your next turn; stunning effect."

### Ion Resistance 10 — TALENT `c113b29cde344fafb6aa376a843639d3`

- Family: O. Weapon / combat mode; detector O.stun (HIGH); compared tag `stun`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.47; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:c113b29cde344fafb6aa376a843639d3|stun|O.stun`
- Current tags: `damage_reduction`, `defense`, `resilience`, `survivability`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You gain DR 10 against ion damage.

Matching clause(s) (1):

1. Matched: "ion damage" — structural labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED
   > You gain DR 10 against ion damage.

Opposite-domain comparator(s) carrying the tag:

- **K'tara Training** — FEAT `1dfbddf5f1aa57c3` (Galaxy at War p.27, FEAT_CANONICAL_RULES_SHAPE); tags: `martial_arts`, `unarmed`, `melee`, `ambush`, `damage_bonus`, `stun`, `control`, `once-per-encounter`, `swift_action`, `action_economy`, `setup`
  - labels: APPLIES_A_STUNNED_OR_STUNNING_EFFECT, RESISTS_OR_REMOVES_A_STUN_EFFECT — "Once per encounter after unarmed damage to a target denied Dexterity to Reflex, make a free unarmed attack vs Fortitude; on success, target cannot speak until end of your next turn; stunning effect."

### Ion Turret — TALENT `c2f332d1e74e3e1a`

- Family: O. Weapon / combat mode; detector O.stun (HIGH); compared tag `stun`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.57; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:c2f332d1e74e3e1a|stun|O.stun`
- Current tags: `crafting`, `tech`, `equipment`, `ranged`, `droid`, `control`, `modification`, `power_systems`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You can construct a turret that is highly effective against droids. The turret deals ion damage instead of normal damage.

Matching clause(s) (1):

1. Matched: "ion damage" — structural labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED
   > The turret deals ion damage instead of normal damage.

Opposite-domain comparator(s) carrying the tag:

- **K'tara Training** — FEAT `1dfbddf5f1aa57c3` (Galaxy at War p.27, FEAT_CANONICAL_RULES_SHAPE); tags: `martial_arts`, `unarmed`, `melee`, `ambush`, `damage_bonus`, `stun`, `control`, `once-per-encounter`, `swift_action`, `action_economy`, `setup`
  - labels: APPLIES_A_STUNNED_OR_STUNNING_EFFECT, RESISTS_OR_REMOVES_A_STUN_EFFECT — "Once per encounter after unarmed damage to a target denied Dexterity to Reflex, make a free unarmed attack vs Fortitude; on success, target cannot speak until end of your next turn; stunning effect."

### Seyugi Cyclone — TALENT `cc90a9fc255f4dc4`

- Family: O. Weapon / combat mode; detector O.stun (HIGH); compared tag `stun`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.83; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:cc90a9fc255f4dc4|stun|O.stun`
- Current tags: `force`, `force_point_spend`, `resource_spend`, `standard_action`, `action_economy`, `unarmed`, `martial_arts`, `melee`, `full_attack`, `burst_damage`, `battlefield_control`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> If you are wielding no weapons (other than combat gloves or stun gauntlets), you can use the Whirlwind Attack feat as a standard action by spending a Force Point even if you do not possess the Whirlwind Attack feat. Additionally, this talent satisfies the prerequisites for the Whirlwind Attack feat.

Matching clause(s) (1):

1. Matched: "stun" — structural labels: REFERENCES_A_STUN_WEAPON_OR_EFFECT_ONLY_AS_AN_EXCEPTION
   > If you are wielding no weapons (other than combat gloves or stun gauntlets), you can use the Whirlwind Attack feat as a standard action by spending a Force Point even if you do not possess the Whirlwind Attack feat.

Opposite-domain comparator(s) carrying the tag:

- **K'tara Training** — FEAT `1dfbddf5f1aa57c3` (Galaxy at War p.27, FEAT_CANONICAL_RULES_SHAPE); tags: `martial_arts`, `unarmed`, `melee`, `ambush`, `damage_bonus`, `stun`, `control`, `once-per-encounter`, `swift_action`, `action_economy`, `setup`
  - labels: APPLIES_A_STUNNED_OR_STUNNING_EFFECT, RESISTS_OR_REMOVES_A_STUN_EFFECT — "Once per encounter after unarmed damage to a target denied Dexterity to Reflex, make a free unarmed attack vs Fortitude; on success, target cannot speak until end of your next turn; stunning effect."

### Ion Mastery — TALENT `df9c25340dcb7c95`

- Family: O. Weapon / combat mode; detector O.stun (HIGH); compared tag `stun`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.52; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:df9c25340dcb7c95|stun|O.stun`
- Current tags: `ranged`, `offense_ranged`, `precision`, `damage_bonus`, `nonlethal`, `droid`, `vehicle`, `sustained_damage`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You know the typical weaknesses of vehicles and droids, and you know how to preserve such targets for capture rather than destroying them. When attacking with ion weapons, you gain a +1 bonus on attack rolls and deal +1 die of ion damage.

Matching clause(s) (1):

1. Matched: "ion damage" — structural labels: STUN_WORDING_NO_OTHER_STRUCTURE_MATCHED
   > When attacking with ion weapons, you gain a +1 bonus on attack rolls and deal +1 die of ion damage.

Opposite-domain comparator(s) carrying the tag:

- **K'tara Training** — FEAT `1dfbddf5f1aa57c3` (Galaxy at War p.27, FEAT_CANONICAL_RULES_SHAPE); tags: `martial_arts`, `unarmed`, `melee`, `ambush`, `damage_bonus`, `stun`, `control`, `once-per-encounter`, `swift_action`, `action_economy`, `setup`
  - labels: APPLIES_A_STUNNED_OR_STUNNING_EFFECT, RESISTS_OR_REMOVES_A_STUN_EFFECT — "Once per encounter after unarmed damage to a target denied Dexterity to Reflex, make a free unarmed attack vs Fortitude; on success, target cannot speak until end of your next turn; stunning effect."
