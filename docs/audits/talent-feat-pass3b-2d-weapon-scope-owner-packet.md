# Pass 3B.2D — Weapon-Scope Semantics: Owner Evidence Packet

Evidence extraction only. No recommendation, proposed change, semantic conclusion or disposition is made. Structural labels describe wording only. Every decision belongs to the owner.

## Totals

- Entries (record × detector): **44** (O 44); unique records: **37**; records with more than one distinct matching clause: 9
- Scope evidence (structural only): entries with a CLOSED_SCOPE clause 17; with an OPEN_GENERIC_SCOPE clause 17; only not-determinable 11; clause tally {"SCOPE_NOT_DETERMINABLE_FROM_WORDING":17,"OPEN_GENERIC_SCOPE":17,"CLOSED_SCOPE":20}
- By detector: O.melee 15, O.ranged 11, O.lightsaber 10, O.pistol 6, O.unarmed 2
- By domain: FEAT 15, TALENT 29
- Not in this packet: O.heavy_weapon and O.exotic_weapon tag-convention questions (not expanded); full_attack, dual_wield, stun, double_weapon, martial_arts, fighting_defensively, flanking, nonlethal (not reopened); already-convergent weapon-mode records and findings closed by a prior owner ruling or owner decision

## O.melee → `melee` (15)

### Knife Trick — FEAT `61c053191d05d0a2`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Scum and Villainy p.23; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:61c053191d05d0a2|melee|O.melee`
- Current tags: `attack_of_opportunity`, `stealth`, `concealment`, `equipment`, `action_economy`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Official errata: if you have a successfully concealed weapon, you threaten squares as though armed with a melee weapon. When an attack of opportunity is available, you may draw a successfully concealed weapon and make the attack. The weapon qualification is based on successful concealment, not on weapon-name keywords. A successfully concealed weapon lets you threaten and draw it for an attack of opportunity.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: MECHANIC_CONCERNS_A_MELEE_WEAPON; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > Official errata: if you have a successfully concealed weapon, you threaten squares as though armed with a melee weapon.

Opposite-domain comparator(s) carrying the tag:

- **Master of Elegance** — TALENT `fc986d810732ff3a` (Knights of the Old Republic Campaign Guide p.46, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `melee`, `lightsaber`, `ability_enhancement`, `damage_bonus`, `sustained_damage`
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "You may add your Dexterity bonus (instead of your Strength bonus) on damage rolls when wielding a light melee weapon."
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "When you wield a light melee weapon two-handed, you may apply double your Dexterity bonus (instead of double your Strength bonus) to the damage."
- **Noble Fencing Style** — TALENT `00c3231e4a4173fa` (Knights of the Old Republic Campaign Guide p.27, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `melee`, `precision`, `ability_enhancement`
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "When using a light melee weapon or a lightsaber that you are proficient with, you can use your Charisma modifier instead of your Strength modifier on attack rolls."

### Charging Fire — FEAT `a945e2f5ffb5a7ed`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.82; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:a945e2f5ffb5a7ed|melee|O.melee`
- Current tags: `ranged`, `movement`, `mobility`, `positioning`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> When charging, make a ranged attack instead of the normal melee attack at the end of movement. You gain no normal charge attack bonus, but still take the -2 Reflex Defense penalty. Charge into a ranged attack: no charge attack bonus, but still take -2 Reflex.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: MELEE_WORDING_NO_STRUCTURE_MATCHED; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > When charging, make a ranged attack instead of the normal melee attack at the end of movement.

Opposite-domain comparator(s) carrying the tag:

- **Elusive Target** — TALENT `a0ace6dcc1c67d48` (Saga Edition Core Rulebook p.40, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `melee`, `ranged`, `ranged_defense`, `defense`, `evasion`, `positioning`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "When fighting an opponent or multiple opponents in melee, other opponents attempting to target you with ranged attacks take a -5 penalty."
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "This penalty is in addition to the normal -5 penalty for firing into melee, making the penalty to target you -10."
- **Devastating Melee Smash** — TALENT `d7e9b15e21ea1c4e` (Knights of the Old Republic Campaign Guide p.29, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `melee`, `damage_bonus`, `burst_damage`, `scaling`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "Once per encounter, you can attempt a devastating melee smash."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "You must declare this special melee attack before making the attack roll."
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "If the attack roll succeeds add half your level to the damage instead of the normal +1 for Melee Smash."

### Precise Shot — FEAT `c180eee7d3bc29b2`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.87; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:c180eee7d3bc29b2|melee|O.melee`
- Current tags: `ranged`, `precision`, `positioning`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Ignore the normal -5 penalty for shooting/throwing a ranged weapon at an opponent engaged in melee with one or more allies. Ignore the -5 penalty for ranged attacks into melee.

Matching clause(s) (2):

1. Matched: "melee" — structural labels: MELEE_WORDING_NO_STRUCTURE_MATCHED; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > Ignore the normal -5 penalty for shooting/throwing a ranged weapon at an opponent engaged in melee with one or more allies.
2. Matched: "melee" — structural labels: MELEE_WORDING_NO_STRUCTURE_MATCHED; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > Ignore the -5 penalty for ranged attacks into melee.

Opposite-domain comparator(s) carrying the tag:

- **Elusive Target** — TALENT `a0ace6dcc1c67d48` (Saga Edition Core Rulebook p.40, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `melee`, `ranged`, `ranged_defense`, `defense`, `evasion`, `positioning`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "When fighting an opponent or multiple opponents in melee, other opponents attempting to target you with ranged attacks take a -5 penalty."
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "This penalty is in addition to the normal -5 penalty for firing into melee, making the penalty to target you -10."
- **Devastating Melee Smash** — TALENT `d7e9b15e21ea1c4e` (Knights of the Old Republic Campaign Guide p.29, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `melee`, `damage_bonus`, `burst_damage`, `scaling`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "Once per encounter, you can attempt a devastating melee smash."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "You must declare this special melee attack before making the attack roll."
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "If the attack roll succeeds add half your level to the damage instead of the normal +1 for Melee Smash."

### Acrobatic Dodge — FEAT `cda6cb7b58f96a2f`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: The Unknown Regions p.24; evidence tier: FEAT_PASS1_MECHANIC_SUMMARY; discovery ref: `FEAT:cda6cb7b58f96a2f|melee|O.melee`
- Current tags: `reaction`, `action_economy`, `movement`, `mobility`, `evasion`, `attack_of_opportunity`, `once-per-encounter`, `force_point_spend`, `resource_spend`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Once per encounter as a reaction after a melee attack misses, immediately moves to an adjacent square without provoking an attack of opportunity; spending a Force Point enables a second use.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: MELEE_WORDING_NO_STRUCTURE_MATCHED; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > Once per encounter as a reaction after a melee attack misses, immediately moves to an adjacent square without provoking an attack of opportunity; spending a Force Point enables a second use.

Opposite-domain comparator(s) carrying the tag:

- **Elusive Target** — TALENT `a0ace6dcc1c67d48` (Saga Edition Core Rulebook p.40, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `melee`, `ranged`, `ranged_defense`, `defense`, `evasion`, `positioning`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "When fighting an opponent or multiple opponents in melee, other opponents attempting to target you with ranged attacks take a -5 penalty."
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "This penalty is in addition to the normal -5 penalty for firing into melee, making the penalty to target you -10."
- **Devastating Melee Smash** — TALENT `d7e9b15e21ea1c4e` (Knights of the Old Republic Campaign Guide p.29, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `melee`, `damage_bonus`, `burst_damage`, `scaling`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "Once per encounter, you can attempt a devastating melee smash."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "You must declare this special melee attack before making the attack roll."
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "If the attack roll succeeds add half your level to the damage instead of the normal +1 for Melee Smash."

### Weapon Proficiency — FEAT `ecc2471ac96ec2d4`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.89; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:ecc2471ac96ec2d4|melee|O.melee`
- Current tags: `weapon_training`, `equipment`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Choose advanced melee weapons, heavy weapons, lightsabers, pistols, rifles, or simple weapons; become proficient with all weapons in that group. Normally nonproficiency gives -5 attacks. Repeatable for a different weapon group each time. Exotic weapons are not a valid group choice; use Exotic Weapon Proficiency for a specific exotic weapon. Choose a weapon group and become proficient with it; repeatable for other groups, while exotic weapons use Exotic Weapon Proficiency.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: MECHANIC_CONCERNS_A_MELEE_WEAPON; scope evidence: OPEN_GENERIC_SCOPE
   > Choose advanced melee weapons, heavy weapons, lightsabers, pistols, rifles, or simple weapons; become proficient with all weapons in that group.

Opposite-domain comparator(s) carrying the tag:

- **Master of Elegance** — TALENT `fc986d810732ff3a` (Knights of the Old Republic Campaign Guide p.46, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `melee`, `lightsaber`, `ability_enhancement`, `damage_bonus`, `sustained_damage`
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "You may add your Dexterity bonus (instead of your Strength bonus) on damage rolls when wielding a light melee weapon."
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "When you wield a light melee weapon two-handed, you may apply double your Dexterity bonus (instead of double your Strength bonus) to the damage."
- **Noble Fencing Style** — TALENT `00c3231e4a4173fa` (Knights of the Old Republic Campaign Guide p.27, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `melee`, `precision`, `ability_enhancement`
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "When using a light melee weapon or a lightsaber that you are proficient with, you can use your Charisma modifier instead of your Strength modifier on attack rolls."

### Visionary Defense — TALENT `153f4b3c6510023d`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.25; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:153f4b3c6510023d|melee|O.melee`
- Current tags: `force`, `force_power_synergy`, `visions`, `use_the_force`, `reaction`, `action_economy`, `ally_support`, `support`, `teamwork`, `defense`, `melee_defense`, `ranged_defense`, `will_defense`, `resource_spend`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: Pass 3B 3B.1 owner decision — `reroll` NO_CHANGE; Pass 3B 3B.1 owner decision — `reliability` NO_CHANGE

Complete canonical mechanic text used by the detector:

> As a reaction, you can make a Use the Force check after you or an ally within 12 squares is the target of a melee or ranged attack (but before the results of the attack roll are known), removing one use of the farseeing Force power from your active suite (as though you had just activated the power). If your check result exceeds the Will Defense of the attacker, you grant the target of the attack a +5 Force bonus to Reflex Defense against that attack. This counts as using the farseeing Force power against the attacker, but this talent replaces the normal rules and effect of that power. Any attack can only be affected by this talent once (thus, multiple characters cannot use this talent on the same attack to allow multiple rerolls). You take a cumulative -5 penalty on Use the Force checks until the beginning of your next turn when you use this talent.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: MELEE_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE; scope evidence: OPEN_GENERIC_SCOPE
   > As a reaction, you can make a Use the Force check after you or an ally within 12 squares is the target of a melee or ranged attack (but before the results of the attack roll are known), removing one use of the farseeing Force power from your active suite (as though you had just activated the power).

Opposite-domain comparator(s) carrying the tag:

- **Tool Frenzy** — FEAT `203f7fa521105d0b` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `unarmed`, `melee`, `precision`, `standard_action`, `action_economy`, `defense`
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "As a standard action with appendages not normally considered weapons, make a single unarmed melee attack with +2."
  - labels: MELEE_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "True melee or ranged weapons are not tools for this feat."
- **Running Attack** — FEAT `4d6a68d553fb0449` (Saga Edition Core Rulebook p.88, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `positioning`, `melee`, `ranged`
  - labels: MELEE_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "When making a melee or ranged weapon attack, move both before and after it as long as total movement does not exceed speed."

### Praetoria Ishu — TALENT `16aa9efd54967320`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Legacy Era Campaign Guide p.45; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:16aa9efd54967320|melee|O.melee`
- Current tags: `force`, `use_the_force`, `block`, `deflect`, `lightsaber`, `melee_defense`, `ranged_defense`, `ally_support`, `support`, `teamwork`, `defense`, `positioning`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You can use the Block talent to negate a melee attack made against an adjacent ally. In addition, you can use the Deflect talent to negate a ranged attack made against an adjacent ally.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: MELEE_WORDING_NO_STRUCTURE_MATCHED; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > You can use the Block talent to negate a melee attack made against an adjacent ally.

Opposite-domain comparator(s) carrying the tag:

- **Close Combat Escape** — FEAT `1ec2b64343aca60e` (Scum and Villainy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `acrobatics`, `grapple`, `evasion`, `swift_action`, `action_economy`, `melee`, `unarmed`, `setup`, `control`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "After successfully using Acrobatics to escape a grapple, spend a swift action to make one melee or unarmed attack against the former grappler."
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "Escape a grapple with Acrobatics, then spend a swift action for a melee/unarmed counterattack that can leave the former grappler flat-footed."
- **Attack Combo (Fire and Strike)** — FEAT `52f1a7f7eb33a1f4` (Legacy Era Campaign Guide p.34, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `ranged`, `unarmed`, `damage_bonus`, `sustained_damage`, `setup`, `attack_of_opportunity`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "If you hit one target with two consecutive ranged, melee, and/or unarmed attacks during the same turn, later ranged, melee, or unarmed attacks through the end of your next turn deal +1 die of damage on a hit."
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "Two consecutive hits on one target prime +1 die damage on later melee, unarmed, or ranged attacks through the end of your next turn."

### Beloved — TALENT `444c032c563c18a1`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Scum and Villainy p.14; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:444c032c563c18a1|melee|O.melee`
- Current tags: `once-per-encounter`, `ally_support`, `support`, `teamwork`, `swift_action`, `standard_action`, `action_economy`, `defense`, `reaction`, `counterattack`, `mobility`, `movement`, `evasion`, `positioning`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: Pass 3B 3B.2B owner decision — `attack_of_opportunity` ADD

Complete canonical mechanic text used by the detector:

> Your allies hold you in such esteem that when you are threatened or injured, you can impel them to action. You can use each of the following actions once per encounter. Guardian: Choose one ally as a swift action. As long as you remain within 6 squares of the ally, you gain a +2 bonus to your Reflex Defense until the start of your next turn. Reprisal: Make a single melee or ranged attack against any target within range as a standard action. If your attack roll succeeds and that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a reaction. To Me!: Spend a swift action. Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a reaction; this movement does not provoke attacks of opportunity.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: MELEE_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE; scope evidence: OPEN_GENERIC_SCOPE
   > Reprisal: Make a single melee or ranged attack against any target within range as a standard action.

Opposite-domain comparator(s) carrying the tag:

- **Tool Frenzy** — FEAT `203f7fa521105d0b` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `unarmed`, `melee`, `precision`, `standard_action`, `action_economy`, `defense`
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "As a standard action with appendages not normally considered weapons, make a single unarmed melee attack with +2."
  - labels: MELEE_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "True melee or ranged weapons are not tools for this feat."
- **Running Attack** — FEAT `4d6a68d553fb0449` (Saga Edition Core Rulebook p.88, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `positioning`, `melee`, `ranged`
  - labels: MELEE_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "When making a melee or ranged weapon attack, move both before and after it as long as total movement does not exceed speed."

### Thunderclap — TALENT `7f63f6f3fec96bf3`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.85; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:7f63f6f3fec96bf3|melee|O.melee`
- Current tags: `force`, `force_power_synergy`, `force_offense`, `battlefield_control`, `control`, `movement`, `positioning`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> When you use a Force power that deals damage, you can use the Bantha Rush feat against that target as though you had made a melee attack.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK; scope evidence: CLOSED_SCOPE
   > When you use a Force power that deals damage, you can use the Bantha Rush feat against that target as though you had made a melee attack.

Opposite-domain comparator(s) carrying the tag:

- **Follow Through** — FEAT `f2cbe2ac10195858` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `movement`, `mobility`, `positioning`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "If a melee attack reduces an opponent to 0 hit points, immediately move up to your speed."
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "If you have Cleave, you may move up to your speed before making Cleave's extra melee attack."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "Drop an enemy with a melee attack to immediately move up to your speed once per turn; Cleave can occur after that movement."
- **Staggering Attack** — FEAT `192923f60db38831` (Galaxy at War p.26, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `skills`, `control`, `precision`
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "With a melee weapon, choose -2 attack; if the attack deals damage, target takes -2 skill checks until end of your next turn."
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "Take -2 or -5 on a melee attack to impose the same penalty on the damaged target's skill checks through your next turn."

### Force Throw — TALENT `86565bbe8b8fd1a2`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.38; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:86565bbe8b8fd1a2|melee|O.melee`
- Current tags: `force_power_synergy`, `telekinesis`, `ranged`, `weapon_training`, `standard_action`, `action_economy`, `equipment`, `damage`, `sustained_damage`, `control`, `battlefield_control`, `force`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You can hurl a simple or advanced melee weapon your size or smaller as a standard action, treating it as a thrown weapon. You are considered proficient with the thrown weapon. The thrown weapon deals normal weapon damage if it hits. If the weapon deals piercing or slashing damage, it becomes embedded in your target, remaining there and causing an additional die of damage each round at the end of the target's turn, and also when it is removed (removing the embedded weapon is a swift action and an adjacent ally can remove the embedded weapon for you). Your target must be within 6 squares of you. The weapon does not automatically return to you, but you can retrieve it with move object (dealing an additional die of damage in the process, if the weapon is embedded in the target, as above).

Matching clause(s) (1):

1. Matched: "melee" — structural labels: MECHANIC_CONCERNS_A_MELEE_WEAPON; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > You can hurl a simple or advanced melee weapon your size or smaller as a standard action, treating it as a thrown weapon.

Opposite-domain comparator(s) carrying the tag:

- **Primitive Warrior** — FEAT `047f06ec480d841f` (Rebellion Era Campaign Guide p.34, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `damage_bonus`, `weapon_training`
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "Deal +1 die of damage with simple melee weapons."
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "Deal +1 damage die with simple melee weapons."
- **Weapon Finesse** — FEAT `252b67d6e31c377e` (Saga Edition Core Rulebook p.89, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `lightsaber`, `precision`, `ability_enhancement`
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "With a light melee weapon or lightsaber, use Dexterity modifier instead of Strength modifier on attack rolls."
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "Use Dexterity instead of Strength for attacks with light melee weapons and lightsabers."

### Nimble Dodge — TALENT `913a0ca43e032caa`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Galaxy at War p.21; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:913a0ca43e032caa|melee|O.melee`
- Current tags: `reaction`, `evasion`, `mobility`, `positioning`, `melee_defense`, `defense`, `survivability`, `action_economy`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> If an enemy misses you with a melee attack, as a reaction you can move up to 2 squares, but you must end your movement adjacent to your attacker.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK; scope evidence: CLOSED_SCOPE
   > If an enemy misses you with a melee attack, as a reaction you can move up to 2 squares, but you must end your movement adjacent to your attacker.

Opposite-domain comparator(s) carrying the tag:

- **Follow Through** — FEAT `f2cbe2ac10195858` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `movement`, `mobility`, `positioning`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "If a melee attack reduces an opponent to 0 hit points, immediately move up to your speed."
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "If you have Cleave, you may move up to your speed before making Cleave's extra melee attack."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "Drop an enemy with a melee attack to immediately move up to your speed once per turn; Cleave can occur after that movement."
- **Staggering Attack** — FEAT `192923f60db38831` (Galaxy at War p.26, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `skills`, `control`, `precision`
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "With a melee weapon, choose -2 attack; if the attack deals damage, target takes -2 skill checks until end of your next turn."
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "Take -2 or -5 on a melee attack to impose the same penalty on the damaged target's skill checks through your next turn."

### Block — TALENT `9379daa94a228c04`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.41; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:9379daa94a228c04|melee|O.melee`
- Current tags: `force`, `use_the_force`, `lightsaber`, `block`, `melee_defense`, `defense`, `reaction`, `action_economy`, `evasion`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> As a reaction, you may negate a melee attack by making a successful Use the Force check. The DC equals the result of the attack roll you wish to negate, and you take a cumulative -5 penalty on your Use the Force check for every time you have used Block or Deflect since the beginning of your last turn. You must have a lightsaber drawn and ignited, be aware of the attack, and not be flat-footed.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK; scope evidence: CLOSED_SCOPE
   > As a reaction, you may negate a melee attack by making a successful Use the Force check.

Opposite-domain comparator(s) carrying the tag:

- **Follow Through** — FEAT `f2cbe2ac10195858` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `movement`, `mobility`, `positioning`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "If a melee attack reduces an opponent to 0 hit points, immediately move up to your speed."
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "If you have Cleave, you may move up to your speed before making Cleave's extra melee attack."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "Drop an enemy with a melee attack to immediately move up to your speed once per turn; Cleave can occur after that movement."
- **Staggering Attack** — FEAT `192923f60db38831` (Galaxy at War p.26, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `skills`, `control`, `precision`
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "With a melee weapon, choose -2 attack; if the attack deals damage, target takes -2 skill checks until end of your next turn."
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "Take -2 or -5 on a melee attack to impose the same penalty on the damaged target's skill checks through your next turn."

### Primitive Block — TALENT `d043a3c0494345ac`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.38; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:d043a3c0494345ac|melee|O.melee`
- Current tags: `force`, `use_the_force`, `block`, `melee_defense`, `defense`, `reaction`, `action_economy`, `evasion`, `equipment`, `weapon_empowerment`, `force_point_spend`, `resource_spend`, `ally_support`, `support`, `teamwork`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> As a reaction, you may negate a melee attack by making a successful Use the Force check. The DC of the skill check is equal to the result of the attack roll you wish to negate, and you take a cumulative -5 penalty on your Use the Force checks to use this talent for every time you have used Primitive Block since the beginning of your last turn. You must have a weapon you have empowered drawn to use this talent, and you must be aware of the attack and not flat-footed. You may spend a Force Point to use this talent to negate an attack against an adjacent character. You may use the Primitive Block talent to negate melee area attacks, such as those made by the Whirlwind Attack feat. If you succeed on the Use the Force check, you take half damage if the attack hits and no damage if the attack misses.

Matching clause(s) (2):

1. Matched: "melee" — structural labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK; scope evidence: CLOSED_SCOPE
   > As a reaction, you may negate a melee attack by making a successful Use the Force check.
2. Matched: "melee" — structural labels: MELEE_APPEARS_ONLY_AS_EXAMPLE_PREREQUISITE_OR_REFERENCE; scope evidence: OPEN_GENERIC_SCOPE
   > You may use the Primitive Block talent to negate melee area attacks, such as those made by the Whirlwind Attack feat.

Opposite-domain comparator(s) carrying the tag:

- **Follow Through** — FEAT `f2cbe2ac10195858` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `movement`, `mobility`, `positioning`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "If a melee attack reduces an opponent to 0 hit points, immediately move up to your speed."
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "If you have Cleave, you may move up to your speed before making Cleave's extra melee attack."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "Drop an enemy with a melee attack to immediately move up to your speed once per turn; Cleave can occur after that movement."
- **Staggering Attack** — FEAT `192923f60db38831` (Galaxy at War p.26, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `skills`, `control`, `precision`
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "With a melee weapon, choose -2 attack; if the attack deals damage, target takes -2 skill checks until end of your next turn."
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "Take -2 or -5 on a melee attack to impose the same penalty on the damaged target's skill checks through your next turn."

### Intimidating Defense — TALENT `de751f28fc269c85`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.26; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:de751f28fc269c85|melee|O.melee`
- Current tags: `once-per-encounter`, `reaction`, `action_economy`, `persuasion`, `intimidation`, `social`, `skills`, `will_defense`, `mind-affecting`, `defense`, `melee_defense`, `ranged_defense`, `control`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Once per encounter, as a reaction, you can make a Persuasion check to intimidate one creature that has made a melee or ranged attack against you if that creature is within line of sight. If you succeed, you impose a —5 penalty to that attack roll. If the target is higher level than you, it gains a +5 bonus to its Will Defense against the Intimidating Defense. This is a mind-affecting effect.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: MELEE_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE; scope evidence: OPEN_GENERIC_SCOPE
   > Once per encounter, as a reaction, you can make a Persuasion check to intimidate one creature that has made a melee or ranged attack against you if that creature is within line of sight.

Opposite-domain comparator(s) carrying the tag:

- **Tool Frenzy** — FEAT `203f7fa521105d0b` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `unarmed`, `melee`, `precision`, `standard_action`, `action_economy`, `defense`
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "As a standard action with appendages not normally considered weapons, make a single unarmed melee attack with +2."
  - labels: MELEE_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "True melee or ranged weapons are not tools for this feat."
- **Running Attack** — FEAT `4d6a68d553fb0449` (Saga Edition Core Rulebook p.88, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `positioning`, `melee`, `ranged`
  - labels: MELEE_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "When making a melee or ranged weapon attack, move both before and after it as long as total movement does not exceed speed."

### Cover Escape — TALENT `fcd7c1e0bd15df71`

- Family: O. Weapon / combat mode; detector O.melee (HIGH); compared tag `melee`; compared tag currently present: **false**
- Source: Galaxy at War p.18; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:fcd7c1e0bd15df71|melee|O.melee`
- Current tags: `force`, `force_defense`, `block`, `deflect`, `force_point_spend`, `resource_spend`, `ally_support`, `support`, `teamwork`, `mobility`, `movement`, `positioning`, `evasion`, `attack_of_opportunity`, `action_economy`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> When you successfully spend a Force Point to negate a melee attack against an adjacent ally with the Block or Deflect talents, that ally can move up to 2 squares as a free action. This movement does not provoke an attack of opportunity.

Matching clause(s) (1):

1. Matched: "melee" — structural labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK; scope evidence: CLOSED_SCOPE
   > When you successfully spend a Force Point to negate a melee attack against an adjacent ally with the Block or Deflect talents, that ally can move up to 2 squares as a free action.

Opposite-domain comparator(s) carrying the tag:

- **Follow Through** — FEAT `f2cbe2ac10195858` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `movement`, `mobility`, `positioning`
  - labels: MELEE_WORDING_NO_STRUCTURE_MATCHED — "If a melee attack reduces an opponent to 0 hit points, immediately move up to your speed."
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "If you have Cleave, you may move up to your speed before making Cleave's extra melee attack."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "Drop an enemy with a melee attack to immediately move up to your speed once per turn; Cleave can occur after that movement."
- **Staggering Attack** — FEAT `192923f60db38831` (Galaxy at War p.26, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `skills`, `control`, `precision`
  - labels: MECHANIC_CONCERNS_A_MELEE_WEAPON — "With a melee weapon, choose -2 attack; if the attack deals damage, target takes -2 skill checks until end of your next turn."
  - labels: DIRECTLY_MODIFIES_MELEE_ATTACKS, DIRECTLY_PERMITS_OR_REQUIRES_A_MELEE_ATTACK — "Take -2 or -5 on a melee attack to impose the same penalty on the damaged target's skill checks through your next turn."

## O.ranged → `ranged` (11)

### Tool Frenzy — FEAT `203f7fa521105d0b`

- Family: O. Weapon / combat mode; detector O.ranged (HIGH); compared tag `ranged`; compared tag currently present: **false**
- Source: Scavenger's Guide to Droids p.25; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:203f7fa521105d0b|ranged|O.ranged`
- Current tags: `unarmed`, `melee`, `precision`, `standard_action`, `action_economy`, `defense`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> As a standard action with appendages not normally considered weapons, make a single unarmed melee attack with +2. Take -2 Reflex Defense until the end of your next turn. Use the damage die of the highest-rated appendage. True melee or ranged weapons are not tools for this feat. Make a +2 unarmed tool-appendage attack using the best appendage damage die, at -2 Reflex until the end of your next turn.

Matching clause(s) (1):

1. Matched: "ranged" — structural labels: RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE, MECHANIC_CONCERNS_A_RANGED_WEAPON; scope evidence: OPEN_GENERIC_SCOPE
   > True melee or ranged weapons are not tools for this feat.

Opposite-domain comparator(s) carrying the tag:

- **Reconnaissance Actions** — TALENT `cf16d7c9bb7a70ad` (Clone Wars Campaign Guide p.25, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `followers`, `ally_support`, `support`, `teamwork`, `standard_action`, `action_economy`, `melee`, `ranged`, `precision`, `stealth`, `perception`, `skills`, `recon`, `targeting`, `scaling`
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK, RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "You can use any of the following actions on your turn: Forward Scouting: As a Standard Action, you can make a melee or ranged attack against a target in Range."
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "For each of your Followers armed with a ranged weapon who has line of sight to your target, you can grant one ally a +2 insight bonus on attack rolls against the target until the end of your next turn."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK, RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "Group Sniping: As a Standard Action, you can make a melee or ranged attack against a target in Range."
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "For each of your Followers armed with a ranged weapon who has line of sight to your target, you and each of your followers gains a +1 circumstance bonus to Stealth checks until the end of your next turn."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK, RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "Sweep the Area: As a Standard Action, you can make a melee or ranged attack against a target in Range."
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "For each of your Followers armed with a ranged weapon who has line of sight to your target, you and each of your Followers gains a +1 circumstance bonus on Perception checks until the end of your next turn."
- **Protector Actions** — TALENT `254b51a34600e2ef` (Clone Wars Campaign Guide p.23, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `followers`, `ally_support`, `support`, `teamwork`, `standard_action`, `action_economy`, `melee`, `ranged`, `counterattack`, `reaction`, `mobility`, `movement`, `control`, `battlefield_control`, `defense`, `targeting`
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK, RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "You can use any of the following actions on your turn: Bodyguard: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK, RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "Diversion Attack: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK, RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE — "The Best Defense: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "For each of your followers armed with a ranged weapon and having line of sight to the target, that target takes a -1 penalty on attack rolls until the beginning of your next turn."

### Dive for Cover — FEAT `2866d953b4b6245d`

- Family: O. Weapon / combat mode; detector O.ranged (HIGH); compared tag `ranged`; compared tag currently present: **false**
- Source: Galaxy at War p.23; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:2866d953b4b6245d|ranged|O.ranged`
- Current tags: `jump`, `reaction`, `action_economy`, `movement`, `mobility`, `cover`, `ranged_defense`, `evasion`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Once per turn, as a reaction to being targeted by a ranged attack, make a horizontal Jump check. If you land in a square providing cover from the attacker, gain that cover bonus against the triggering attack even though you lacked it when targeted. You always land prone. Once per turn, react to a ranged attack by jumping into cover; if you reach cover it protects against that attack, and you land prone.

Matching clause(s) (2):

1. Matched: "ranged" — structural labels: RANGED_WORDING_NO_STRUCTURE_MATCHED; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > Once per turn, as a reaction to being targeted by a ranged attack, make a horizontal Jump check.
2. Matched: "ranged" — structural labels: RANGED_WORDING_NO_STRUCTURE_MATCHED; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > Once per turn, react to a ranged attack by jumping into cover; if you reach cover it protects against that attack, and you land prone.

Opposite-domain comparator(s) carrying the tag:

- **Friend or Foe** — TALENT `014d291a6e16cc12` (Legacy Era Campaign Guide p.27, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ally-trigger`, `reaction`, `action_economy`, `ranged`, `counterattack`, `control`, `positioning`, `evasion`
  - labels: RANGED_WORDING_NO_STRUCTURE_MATCHED — "Whenever an ally within your line of sight is missed by a ranged attack, you can (as a reaction, once per turn) designate one enemy adjacent to that ally."
- **Friendly Fire** — TALENT `5cb9f0f6011a1bab` (Clone Wars Campaign Guide p.23, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ranged`, `melee`, `counterattack`, `control`, `battlefield_control`, `positioning`, `evasion`
  - labels: RANGED_WORDING_NO_STRUCTURE_MATCHED — "If you are engaged in melee combat with an adjacent enemy and are the target of a ranged attack that misses you, compare the attack roll to the Reflex Defense of one adjacent enemy; if the attack equals or exceeds the target's Reflex Defense, that enemy becomes the new target of the attack, which is resolved as normal."

### Visionary Defense — TALENT `153f4b3c6510023d`

- Family: O. Weapon / combat mode; detector O.ranged (HIGH); compared tag `ranged`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.25; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:153f4b3c6510023d|ranged|O.ranged`
- Current tags: `force`, `force_power_synergy`, `visions`, `use_the_force`, `reaction`, `action_economy`, `ally_support`, `support`, `teamwork`, `defense`, `melee_defense`, `ranged_defense`, `will_defense`, `resource_spend`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: Pass 3B 3B.1 owner decision — `reroll` NO_CHANGE; Pass 3B 3B.1 owner decision — `reliability` NO_CHANGE

Complete canonical mechanic text used by the detector:

> As a reaction, you can make a Use the Force check after you or an ally within 12 squares is the target of a melee or ranged attack (but before the results of the attack roll are known), removing one use of the farseeing Force power from your active suite (as though you had just activated the power). If your check result exceeds the Will Defense of the attacker, you grant the target of the attack a +5 Force bonus to Reflex Defense against that attack. This counts as using the farseeing Force power against the attacker, but this talent replaces the normal rules and effect of that power. Any attack can only be affected by this talent once (thus, multiple characters cannot use this talent on the same attack to allow multiple rerolls). You take a cumulative -5 penalty on Use the Force checks until the beginning of your next turn when you use this talent.

Matching clause(s) (1):

1. Matched: "ranged" — structural labels: RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE; scope evidence: OPEN_GENERIC_SCOPE
   > As a reaction, you can make a Use the Force check after you or an ally within 12 squares is the target of a melee or ranged attack (but before the results of the attack roll are known), removing one use of the farseeing Force power from your active suite (as though you had just activated the power).

Opposite-domain comparator(s) carrying the tag:

- **Running Attack** — FEAT `4d6a68d553fb0449` (Saga Edition Core Rulebook p.88, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `positioning`, `melee`, `ranged`
  - labels: RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE, MECHANIC_CONCERNS_A_RANGED_WEAPON — "When making a melee or ranged weapon attack, move both before and after it as long as total movement does not exceed speed."
- **Point-Blank Shot** — FEAT `05459ac4d439f229` (Saga Edition Core Rulebook p.87, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `precision`, `damage_bonus`, `positioning`
  - labels: DIRECTLY_MODIFIES_RANGED_ATTACKS — "Gain +1 on ranged attack and damage rolls against targets within point-blank range."
  - labels: DIRECTLY_MODIFIES_RANGED_ATTACKS — "Gain +1 ranged attack and damage within point-blank range."

### Praetoria Ishu — TALENT `16aa9efd54967320`

- Family: O. Weapon / combat mode; detector O.ranged (HIGH); compared tag `ranged`; compared tag currently present: **false**
- Source: Legacy Era Campaign Guide p.45; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:16aa9efd54967320|ranged|O.ranged`
- Current tags: `force`, `use_the_force`, `block`, `deflect`, `lightsaber`, `melee_defense`, `ranged_defense`, `ally_support`, `support`, `teamwork`, `defense`, `positioning`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You can use the Block talent to negate a melee attack made against an adjacent ally. In addition, you can use the Deflect talent to negate a ranged attack made against an adjacent ally.

Matching clause(s) (1):

1. Matched: "ranged" — structural labels: RANGED_WORDING_NO_STRUCTURE_MATCHED; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > In addition, you can use the Deflect talent to negate a ranged attack made against an adjacent ally.

Opposite-domain comparator(s) carrying the tag:

- **Crossfire** — FEAT `6e3b0ca6413e607c` (The Force Unleashed Campaign Guide p.33, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `cover`, `counterattack`, `targeting`
  - labels: RANGED_WORDING_NO_STRUCTURE_MATCHED — "If a ranged attack misses a target with soft cover, immediately make an attack with the same weapon and attack bonus against the creature providing that soft cover."
  - labels: RANGED_WORDING_NO_STRUCTURE_MATCHED — "Once per round, a ranged miss against a target with soft cover can redirect the same attack to the cover provider."
- **Bantha Herder** — FEAT `982b00394a73719e` (Galaxy at War p.22, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `will_defense`, `control`, `battlefield_control`, `movement`, `positioning`
  - labels: RANGED_WORDING_NO_STRUCTURE_MATCHED — "When a ranged attack damages a Large-or-smaller creature, compare the attack roll to the target's Will Defense."
  - labels: RANGED_WORDING_NO_STRUCTURE_MATCHED — "A damaging proficient ranged attack can move a Large-or-smaller target 1 square if the attack roll also beats Will."

### Beloved — TALENT `444c032c563c18a1`

- Family: O. Weapon / combat mode; detector O.ranged (HIGH); compared tag `ranged`; compared tag currently present: **false**
- Source: Scum and Villainy p.14; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:444c032c563c18a1|ranged|O.ranged`
- Current tags: `once-per-encounter`, `ally_support`, `support`, `teamwork`, `swift_action`, `standard_action`, `action_economy`, `defense`, `reaction`, `counterattack`, `mobility`, `movement`, `evasion`, `positioning`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: Pass 3B 3B.2B owner decision — `attack_of_opportunity` ADD

Complete canonical mechanic text used by the detector:

> Your allies hold you in such esteem that when you are threatened or injured, you can impel them to action. You can use each of the following actions once per encounter. Guardian: Choose one ally as a swift action. As long as you remain within 6 squares of the ally, you gain a +2 bonus to your Reflex Defense until the start of your next turn. Reprisal: Make a single melee or ranged attack against any target within range as a standard action. If your attack roll succeeds and that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a reaction. To Me!: Spend a swift action. Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a reaction; this movement does not provoke attacks of opportunity.

Matching clause(s) (1):

1. Matched: "ranged" — structural labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK, RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE; scope evidence: OPEN_GENERIC_SCOPE
   > Reprisal: Make a single melee or ranged attack against any target within range as a standard action.

Opposite-domain comparator(s) carrying the tag:

- **Grazing Shot** — FEAT `1228a537592ad145` (Galaxy of Intrigue p.27, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `targeting`, `positioning`, `action_economy`, `damage`
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK — "After a successful ranged attack against one target, make a second attack against another target in direct line of sight and within 6 squares of the first."
  - labels: RANGED_WORDING_NO_STRUCTURE_MATCHED — "After hitting one ranged target, test a second nearby LOS target; success splits one damage roll between both, failure deals no damage to either."
- **Running Attack** — FEAT `4d6a68d553fb0449` (Saga Edition Core Rulebook p.88, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `positioning`, `melee`, `ranged`
  - labels: RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE, MECHANIC_CONCERNS_A_RANGED_WEAPON — "When making a melee or ranged weapon attack, move both before and after it as long as total movement does not exceed speed."

### Deflect — TALENT `72c644f7a09b1186`

- Family: O. Weapon / combat mode; detector O.ranged (HIGH); compared tag `ranged`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.41; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:72c644f7a09b1186|ranged|O.ranged`
- Current tags: `force`, `use_the_force`, `lightsaber`, `deflect`, `ranged_defense`, `defense`, `reaction`, `action_economy`, `evasion`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> As a reaction, you may negate a ranged attack by making a successful Use the Force check. The DC equals the result of the attack roll you wish to negate, and you take a cumulative -5 penalty on your Use the Force check for every time you have used Block or Deflect since the beginning of your last turn. You must have a lightsaber drawn and ignited, be aware of the attack, and not be flat-footed. Against an autofire attack, a successful check makes you take half damage if the attack hits and no damage if it misses. Deflect has no effect on other area attacks such as grenades, missiles, and flamethrowers, and cannot negate attacks from Colossal (frigate) or larger vehicles unless made with a point-defense weapon.

Matching clause(s) (1):

1. Matched: "ranged" — structural labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK; scope evidence: CLOSED_SCOPE
   > As a reaction, you may negate a ranged attack by making a successful Use the Force check.

Opposite-domain comparator(s) carrying the tag:

- **Grazing Shot** — FEAT `1228a537592ad145` (Galaxy of Intrigue p.27, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `targeting`, `positioning`, `action_economy`, `damage`
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK — "After a successful ranged attack against one target, make a second attack against another target in direct line of sight and within 6 squares of the first."
  - labels: RANGED_WORDING_NO_STRUCTURE_MATCHED — "After hitting one ranged target, test a second nearby LOS target; success splits one damage roll between both, failure deals no damage to either."
- **Sniper** — FEAT `56367f3943ee8c17` (Saga Edition Core Rulebook p.88, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `sniper`, `cover`, `precision`, `targeting`
  - labels: RANGED_WORDING_NO_STRUCTURE_MATCHED — "Always ignore soft cover from characters, creatures, or droids on ranged attacks."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK — "Ignore creature-provided soft cover with ranged attacks."

### Shield Gauntlet Defense — TALENT `852bca9332684a2b`

- Family: O. Weapon / combat mode; detector O.ranged (HIGH); compared tag `ranged`; compared tag currently present: **false**
- Source: Rebellion Era Campaign Guide p.37; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:852bca9332684a2b|ranged|O.ranged`
- Current tags: `shields`, `equipment`, `reaction`, `action_economy`, `ranged_defense`, `defense`, `evasion`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Once per turn as a reaction, you can gain a +2 deflection bonus to your Reflex Defense against any one ranged attack. To use this talent, you must be wearing an active shield gauntlet, you must be aware of the attack, and you must not be flat-footed.

Matching clause(s) (1):

1. Matched: "ranged" — structural labels: DIRECTLY_MODIFIES_RANGED_ATTACKS; scope evidence: CLOSED_SCOPE
   > Once per turn as a reaction, you can gain a +2 deflection bonus to your Reflex Defense against any one ranged attack.

Opposite-domain comparator(s) carrying the tag:

- **Point-Blank Shot** — FEAT `05459ac4d439f229` (Saga Edition Core Rulebook p.87, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `precision`, `damage_bonus`, `positioning`
  - labels: DIRECTLY_MODIFIES_RANGED_ATTACKS — "Gain +1 on ranged attack and damage rolls against targets within point-blank range."
  - labels: DIRECTLY_MODIFIES_RANGED_ATTACKS — "Gain +1 ranged attack and damage within point-blank range."
- **Careful Shot** — FEAT `62fdf44c56b24507` (Saga Edition Core Rulebook p.82, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `targeting`, `setup`, `precision`
  - labels: DIRECTLY_MODIFIES_RANGED_ATTACKS — "If you aim before a ranged attack, gain +1 on the attack roll."
  - labels: DIRECTLY_MODIFIES_RANGED_ATTACKS — "Aim before a ranged attack to gain +1 attack."

### Champion — TALENT `a7aea0411eb4fbc0`

- Family: O. Weapon / combat mode; detector O.ranged (HIGH); compared tag `ranged`; compared tag currently present: **false**
- Source: Unknown Regions p.23; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:a7aea0411eb4fbc0|ranged|O.ranged`
- Current tags: `once-per-encounter`, `recovery`, `condition_removal`, `resilience`, `survivability`, `fear`, `mind-affecting`, `damage_threshold`, `control`, `melee`, `unarmed`, `burst_damage`, `scaling`, `precision`, `healing`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You can use each of the following actions once per encounter. Champion's Pride: When you use your second wind, you move +1 step on the condition track and remove one fear effect or mind-affecting effect in addition to the normal benefit of second wind. Disarming Hit: When you hit and damage a creature and that damage equals or exceeds its damage threshold, you can make a Disarm Attack against that target as a free action; if using a ranged weapon, you must also have the Ranged Disarm feat. Masterful Strike: When making a successful unarmed or melee attack other than with a lightsaber, increase your damage by 2 for every 5 points by which your attack roll exceeds the target's Reflex Defense.

Matching clause(s) (1):

1. Matched: "ranged", "Ranged" — structural labels: MECHANIC_CONCERNS_A_RANGED_WEAPON; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > Disarming Hit: When you hit and damage a creature and that damage equals or exceeds its damage threshold, you can make a Disarm Attack against that target as a free action; if using a ranged weapon, you must also have the Ranged Disarm feat.

Opposite-domain comparator(s) carrying the tag:

- **Zero Range** — FEAT `0dbd1d12c0b99725` (Legacy Era Campaign Guide p.37, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `precision`, `damage_bonus`, `positioning`
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "When firing a ranged weapon at a target within or adjacent to your fighting space, gain +1 on the attack roll and +1 die of damage on a hit."
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "At zero range, gain +1 attack and +1 die damage with eligible ranged weapons, excluding heavy/vehicle/starship use and Burst Fire/Rapid Shot stacking."
- **Return Fire** — FEAT `80c52cf7838095c1` (Legacy Era Campaign Guide p.37, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `reaction`, `action_economy`, `counterattack`, `once-per-encounter`
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "Choose one exotic ranged weapon or weapon group."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK — "Once per encounter as a reaction, make one ranged attack with that chosen weapon/group against an enemy that misses you with a ranged attack, provided you have line of sight."
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "With a chosen ranged weapon family, react to a missed ranged attack by shooting back; Combat Reflexes increases uses and the feat is repeatable for other weapon scopes."

### Bayonet Master — TALENT `b6e600188cf5597f`

- Family: O. Weapon / combat mode; detector O.ranged (HIGH); compared tag `ranged`; compared tag currently present: **false**
- Source: Clone Wars Campaign Guide p.26; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:b6e600188cf5597f|ranged|O.ranged`
- Current tags: `full_attack`, `double_weapon`, `melee`, `weapon_training`, `precision`, `sustained_damage`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> When you take a full attack action, you can treat a ranged weapon with a bayonet as a double melee weapon. You can attack with the bayonet and club a target with your ranged weapon (as with the Gun Club talent), ignoring the normal penalties for attacking with both ends of a double weapon.

Matching clause(s) (2):

1. Matched: "ranged" — structural labels: MECHANIC_CONCERNS_A_RANGED_WEAPON; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > When you take a full attack action, you can treat a ranged weapon with a bayonet as a double melee weapon.
2. Matched: "ranged" — structural labels: MECHANIC_CONCERNS_A_RANGED_WEAPON; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > You can attack with the bayonet and club a target with your ranged weapon (as with the Gun Club talent), ignoring the normal penalties for attacking with both ends of a double weapon.

Opposite-domain comparator(s) carrying the tag:

- **Zero Range** — FEAT `0dbd1d12c0b99725` (Legacy Era Campaign Guide p.37, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `precision`, `damage_bonus`, `positioning`
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "When firing a ranged weapon at a target within or adjacent to your fighting space, gain +1 on the attack roll and +1 die of damage on a hit."
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "At zero range, gain +1 attack and +1 die damage with eligible ranged weapons, excluding heavy/vehicle/starship use and Burst Fire/Rapid Shot stacking."
- **Return Fire** — FEAT `80c52cf7838095c1` (Legacy Era Campaign Guide p.37, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `reaction`, `action_economy`, `counterattack`, `once-per-encounter`
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "Choose one exotic ranged weapon or weapon group."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK — "Once per encounter as a reaction, make one ranged attack with that chosen weapon/group against an enemy that misses you with a ranged attack, provided you have line of sight."
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "With a chosen ranged weapon family, react to a missed ranged attack by shooting back; Combat Reflexes increases uses and the feat is repeatable for other weapon scopes."

### Shield Gauntlet Deflect — TALENT `da5096b45d174f36`

- Family: O. Weapon / combat mode; detector O.ranged (HIGH); compared tag `ranged`; compared tag currently present: **false**
- Source: Rebellion Era Campaign Guide p.37; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:da5096b45d174f36|ranged|O.ranged`
- Current tags: `force`, `use_the_force`, `shields`, `equipment`, `reaction`, `action_economy`, `ranged_defense`, `defense`, `deflect`, `force_point_spend`, `resource_spend`, `ally_support`, `support`, `teamwork`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Once per round as a reaction, you can negate a ranged attack by making a successful Use the Force check. The DC of the skill check is equal to the result of the attack roll you wish to negate. To use this talent, you must be wearing an active shield gauntlet, you must be aware of the attack, and you must not be flat-footed. You can spend a Force Point to use this talent to negate a ranged attack against an adjacent character. You can use Shield Gauntlet Deflect to deflect some of the barrage of shots fired from a ranged weapon set on autofire. If your Use the Force check succeeds, you take half damage if the attack hits and no damage if the attack misses.

Matching clause(s) (3):

1. Matched: "ranged" — structural labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK; scope evidence: CLOSED_SCOPE
   > Once per round as a reaction, you can negate a ranged attack by making a successful Use the Force check.
2. Matched: "ranged" — structural labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK; scope evidence: CLOSED_SCOPE
   > You can spend a Force Point to use this talent to negate a ranged attack against an adjacent character.
3. Matched: "ranged" — structural labels: MECHANIC_CONCERNS_A_RANGED_WEAPON; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > You can use Shield Gauntlet Deflect to deflect some of the barrage of shots fired from a ranged weapon set on autofire.

Opposite-domain comparator(s) carrying the tag:

- **Return Fire** — FEAT `80c52cf7838095c1` (Legacy Era Campaign Guide p.37, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `reaction`, `action_economy`, `counterattack`, `once-per-encounter`
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "Choose one exotic ranged weapon or weapon group."
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK — "Once per encounter as a reaction, make one ranged attack with that chosen weapon/group against an enemy that misses you with a ranged attack, provided you have line of sight."
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "With a chosen ranged weapon family, react to a missed ranged attack by shooting back; Combat Reflexes increases uses and the feat is repeatable for other weapon scopes."
- **Zero Range** — FEAT `0dbd1d12c0b99725` (Legacy Era Campaign Guide p.37, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `precision`, `damage_bonus`, `positioning`
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "When firing a ranged weapon at a target within or adjacent to your fighting space, gain +1 on the attack roll and +1 die of damage on a hit."
  - labels: MECHANIC_CONCERNS_A_RANGED_WEAPON — "At zero range, gain +1 attack and +1 die damage with eligible ranged weapons, excluding heavy/vehicle/starship use and Burst Fire/Rapid Shot stacking."

### Intimidating Defense — TALENT `de751f28fc269c85`

- Family: O. Weapon / combat mode; detector O.ranged (HIGH); compared tag `ranged`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.26; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:de751f28fc269c85|ranged|O.ranged`
- Current tags: `once-per-encounter`, `reaction`, `action_economy`, `persuasion`, `intimidation`, `social`, `skills`, `will_defense`, `mind-affecting`, `defense`, `melee_defense`, `ranged_defense`, `control`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Once per encounter, as a reaction, you can make a Persuasion check to intimidate one creature that has made a melee or ranged attack against you if that creature is within line of sight. If you succeed, you impose a —5 penalty to that attack roll. If the target is higher level than you, it gains a +5 bonus to its Will Defense against the Intimidating Defense. This is a mind-affecting effect.

Matching clause(s) (1):

1. Matched: "ranged" — structural labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK, CHANGES_DEFENSE_AGAINST_RANGED_ATTACKS, RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE; scope evidence: OPEN_GENERIC_SCOPE
   > Once per encounter, as a reaction, you can make a Persuasion check to intimidate one creature that has made a melee or ranged attack against you if that creature is within line of sight.

Opposite-domain comparator(s) carrying the tag:

- **Grazing Shot** — FEAT `1228a537592ad145` (Galaxy of Intrigue p.27, FEAT_CANONICAL_RULES_SHAPE); tags: `ranged`, `targeting`, `positioning`, `action_economy`, `damage`
  - labels: DIRECTLY_PERMITS_OR_REQUIRES_A_RANGED_ATTACK — "After a successful ranged attack against one target, make a second attack against another target in direct line of sight and within 6 squares of the first."
  - labels: RANGED_WORDING_NO_STRUCTURE_MATCHED — "After hitting one ranged target, test a second nearby LOS target; success splits one damage roll between both, failure deals no damage to either."
- **Running Attack** — FEAT `4d6a68d553fb0449` (Saga Edition Core Rulebook p.88, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `positioning`, `melee`, `ranged`
  - labels: RANGED_APPEARS_IN_AN_OPEN_MELEE_OR_RANGED_SCOPE, MECHANIC_CONCERNS_A_RANGED_WEAPON — "When making a melee or ranged weapon attack, move both before and after it as long as total movement does not exceed speed."

## O.lightsaber → `lightsaber` (10)

### Flurry — FEAT `0536f81eff886234`

- Family: O. Weapon / combat mode; detector O.lightsaber (HIGH); compared tag `lightsaber`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.33; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:0536f81eff886234|lightsaber|O.lightsaber`
- Current tags: `melee`, `precision`, `defense`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> While wielding only light weapons or lightsabers, take -5 Reflex Defense and gain +2 on melee attack rolls until the start of your next turn. May substitute for Point Blank Shot when qualifying for elite trooper. Trade -5 Reflex for +2 melee attacks while wielding only light weapons/lightsabers; also substitutes for Point Blank Shot for elite trooper qualification.

Matching clause(s) (2):

1. Matched: "lightsabers" — structural labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE; scope evidence: CLOSED_SCOPE
   > While wielding only light weapons or lightsabers, take -5 Reflex Defense and gain +2 on melee attack rolls until the start of your next turn.
2. Matched: "lightsabers" — structural labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > Trade -5 Reflex for +2 melee attacks while wielding only light weapons/lightsabers; also substitutes for Point Blank Shot for elite trooper qualification.

Opposite-domain comparator(s) carrying the tag:

- **Improved Lightsaber Throw** — TALENT `705f100f5703e707` (Force Unleashed Campaign Guide p.43, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `force`, `lightsaber`, `ranged`, `offense_ranged`, `force_point_spend`, `resource_spend`, `standard_action`, `swift_action`, `action_economy`, `targeting`, `precision`, `use_the_force`, `equipment`
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "You can spend a Force Point as a standard action to throw your lightsaber at a group of opponents."
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "You make a single ranged attack roll (treating the lightsaber as a thrown weapon) and compare the result to the Reflex Defense of all targets in a 6-square line originating in your square."
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "If your attack roll result exceeds a target’s Reflex Defense, you deal normal lightsaber damage to that target (dealing half damage if you fail to exceed the target’s Reflex Defense)."
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "You can pull your lightsaber back to your hand as a swift action by making a DC 20 Use the Force check."
- **Masterwork Lightsaber** — TALENT `a64c01df9eba3147` (Jedi Academy Training Manual p.19, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `force`, `use_the_force`, `lightsaber`, `melee`, `crafting`, `modification`, `equipment`, `weapon_empowerment`, `reroll`, `reliability`, `ally_support`, `support`, `teamwork`
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "Whenever you build a lightsaber, you do so with such expertise that it makes the weapon even more refined and elegant."
  - labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When you build a lightsaber, you can choose to add one extra accessory to the lightsaber at the time of creation, and when you hit a target with a lightsaber that you built, you can always choose to reroll one damage die from your damage roll, but you must keep the second result, even if it is worse."
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "In addition, you can mentor another character while he constructs his own lightsaber."
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When you do so, you reduce the Use the Force check DC for constructing the lightsaber by -5."

### Improved Rapid Strike — FEAT `cb6aea7e256e4c8c`

- Family: O. Weapon / combat mode; detector O.lightsaber (HIGH); compared tag `lightsaber`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.33; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:cb6aea7e256e4c8c|lightsaber|O.lightsaber`
- Current tags: `melee`, `damage_bonus`, `precision`, `burst_damage`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> With a light melee weapon or lightsaber and Rapid Strike, take -5 on the attack to gain +2 dice of damage. Does not stack with Rapid Strike itself or other extra-damage sources that do not stack with Rapid Strike, such as Mighty Swing. If Dexterity is below 13, the attack penalty becomes -10. Upgrade Rapid Strike with a light melee weapon/lightsaber to +2 damage dice for -5 attack, or -10 if Dexterity is below 13.

Matching clause(s) (2):

1. Matched: "lightsaber" — structural labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE; scope evidence: CLOSED_SCOPE
   > With a light melee weapon or lightsaber and Rapid Strike, take -5 on the attack to gain +2 dice of damage.
2. Matched: "lightsaber" — structural labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE; scope evidence: CLOSED_SCOPE
   > Upgrade Rapid Strike with a light melee weapon/lightsaber to +2 damage dice for -5 attack, or -10 if Dexterity is below 13.

Opposite-domain comparator(s) carrying the tag:

- **Ataru** — TALENT `0b3f4075ed84aee0` (Saga Edition Core Rulebook p.218, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `lightsaber`, `melee`, `ability_enhancement`, `damage_bonus`, `sustained_damage`
  - labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "You may add your Dexterity bonus instead of your Strength bonus on damage rolls when wielding a lightsaber."
  - labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When you wield a lightsaber two-handed, you may apply double your Dexterity bonus instead of double your Strength bonus to the damage."
- **Greater Weapon Focus (Lightsabers)** — TALENT `3038f4c26de19e39` (Saga Edition Core Rulebook p.218, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `lightsaber`, `melee`, `precision`, `weapon_training`
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "You gain a +1 bonus on melee attack rolls with Lightsabers."
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "This bonus stacks with the bonus granted by the Weapon Focus (Lightsabers) feat."

### Weapon Proficiency — FEAT `ecc2471ac96ec2d4`

- Family: O. Weapon / combat mode; detector O.lightsaber (HIGH); compared tag `lightsaber`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.89; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:ecc2471ac96ec2d4|lightsaber|O.lightsaber`
- Current tags: `weapon_training`, `equipment`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Choose advanced melee weapons, heavy weapons, lightsabers, pistols, rifles, or simple weapons; become proficient with all weapons in that group. Normally nonproficiency gives -5 attacks. Repeatable for a different weapon group each time. Exotic weapons are not a valid group choice; use Exotic Weapon Proficiency for a specific exotic weapon. Choose a weapon group and become proficient with it; repeatable for other groups, while exotic weapons use Exotic Weapon Proficiency.

Matching clause(s) (1):

1. Matched: "lightsabers" — structural labels: LIGHTSABER_IS_ONE_POSSIBLE_GENERIC_WEAPON_SELECTION; scope evidence: OPEN_GENERIC_SCOPE
   > Choose advanced melee weapons, heavy weapons, lightsabers, pistols, rifles, or simple weapons; become proficient with all weapons in that group.

Opposite-domain comparator(s) carrying the tag:

- **Oath of Duty** — TALENT `001ae84d5862af55` (Legacy Era Campaign Guide p.45, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ally-trigger`, `lightsaber`, `durability`, `survivability`, `scaling`, `positioning`
  - labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When an ally within 12 squares of you and within your line of sight hits with a lightsaber attack, you gain bonus hit points equal to 3 x your class level until the end of your next turn."
- **Dual Weapon Flourish II** — TALENT `02c69474cc7bbedd` (Knights of the Old Republic Campaign Guide p.46, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `dual_wield`, `melee`, `lightsaber`, `full_attack`, `standard_action`, `action_economy`, `sustained_damage`
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When wielding only two light melee weapons or two lightsabers, whenever you make a single attack as a standard action with one weapon you can make a single attack with the other weapon as a free action against the same target."

### Noble Fencing Style — TALENT `00c3231e4a4173fa`

- Family: O. Weapon / combat mode; detector O.lightsaber (HIGH); compared tag `lightsaber`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.27; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:00c3231e4a4173fa|lightsaber|O.lightsaber`
- Current tags: `melee`, `precision`, `ability_enhancement`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> This style of swordplay uses wit and force of personality to increase accuracy, taunting and distracting an opponent with feints, misdirection, and deception. When using a light melee weapon or a lightsaber that you are proficient with, you can use your Charisma modifier instead of your Strength modifier on attack rolls.

Matching clause(s) (1):

1. Matched: "lightsaber" — structural labels: MECHANIC_REQUIRES_A_LIGHTSABER; scope evidence: CLOSED_SCOPE
   > When using a light melee weapon or a lightsaber that you are proficient with, you can use your Charisma modifier instead of your Strength modifier on attack rolls.

Opposite-domain comparator(s) carrying the tag:

- **Long Haft Strike** — FEAT `b60e581b6c102cfc` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `lightsaber`, `lightsaber_polearm`, `double_weapon`
  - labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When using a lightsaber pike or long-handle lightsaber, you may attack with both ends and treat the weapon as a double weapon."
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "Treat a lightsaber pike or long-handle lightsaber as a double weapon and attack with both ends."
- **Weapon Finesse** — FEAT `252b67d6e31c377e` (Saga Edition Core Rulebook p.89, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `lightsaber`, `precision`, `ability_enhancement`
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "With a light melee weapon or lightsaber, use Dexterity modifier instead of Strength modifier on attack rolls."
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "Use Dexterity instead of Strength for attacks with light melee weapons and lightsabers."

### Infuse Weapon — TALENT `0df15b0ea7721c50`

- Family: O. Weapon / combat mode; detector O.lightsaber (HIGH); compared tag `lightsaber`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.93; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:0df15b0ea7721c50|lightsaber|O.lightsaber`
- Current tags: `force`, `force_point_spend`, `resource_spend`, `empowerment`, `weapon_empowerment`, `equipment`, `melee`, `damage_reduction`, `durability`, `damage_bonus`, `sustained_damage`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: Pass 3B 3B.1 owner decision — `action_economy` ADD

Complete canonical mechanic text used by the detector:

> You can spend a Force Point to infuse an unpowered melee weapon (one that does not require an energy cell) with the strength of the Force, making it resistant to the attacks of other weapons. Infusing the weapon takes a full-round action. From that point forward, when you wield the weapon, its damage reduction is doubled, and lightsabers do not ignore the weapon's damage reduction. When you spend a Force Point to modify the attack roll of an infused weapon, you also add 2 x the Force Point's result to the damage roll if the attack is a success.

Matching clause(s) (1):

1. Matched: "lightsabers" — structural labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE; scope evidence: CLOSED_SCOPE
   > From that point forward, when you wield the weapon, its damage reduction is doubled, and lightsabers do not ignore the weapon's damage reduction.

Opposite-domain comparator(s) carrying the tag:

- **Long Haft Strike** — FEAT `b60e581b6c102cfc` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `lightsaber`, `lightsaber_polearm`, `double_weapon`
  - labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When using a lightsaber pike or long-handle lightsaber, you may attack with both ends and treat the weapon as a double weapon."
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "Treat a lightsaber pike or long-handle lightsaber as a double weapon and attack with both ends."
- **Weapon Finesse** — FEAT `252b67d6e31c377e` (Saga Edition Core Rulebook p.89, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `lightsaber`, `precision`, `ability_enhancement`
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "With a light melee weapon or lightsaber, use Dexterity modifier instead of Strength modifier on attack rolls."
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "Use Dexterity instead of Strength for attacks with light melee weapons and lightsabers."

### Accurate Blow — TALENT `32df92c3114b5c94`

- Family: O. Weapon / combat mode; detector O.lightsaber (HIGH); compared tag `lightsaber`; compared tag currently present: **false**
- Source: Clone Wars Campaign Guide p.39; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:32df92c3114b5c94|lightsaber|O.lightsaber`
- Current tags: `melee`, `precision`, `damage_bonus`, `burst_damage`, `weapon_training`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Choose one Exotic Weapon (Melee) or one of the following Weapon Groups in which you are proficient: Advanced Melee Weapons, Lightsabers, or Simple Weapons (Melee). When you make a Melee Attack with a Weapon from the chosen group and the attack roll exceeds the target's Reflex Defense by 5 or more, you deal +1 die of damage with the attack.

Matching clause(s) (1):

1. Matched: "Lightsabers" — structural labels: LIGHTSABER_APPEARS_ONLY_AS_PREREQUISITE_WORDING, LIGHTSABER_IS_ONE_POSSIBLE_GENERIC_WEAPON_SELECTION; scope evidence: OPEN_GENERIC_SCOPE
   > Choose one Exotic Weapon (Melee) or one of the following Weapon Groups in which you are proficient: Advanced Melee Weapons, Lightsabers, or Simple Weapons (Melee).

Opposite-domain comparator(s) carrying the tag:

- **Weapon Finesse** — FEAT `252b67d6e31c377e` (Saga Edition Core Rulebook p.89, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `lightsaber`, `precision`, `ability_enhancement`
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "With a light melee weapon or lightsaber, use Dexterity modifier instead of Strength modifier on attack rolls."
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "Use Dexterity instead of Strength for attacks with light melee weapons and lightsabers."
- **Long Haft Strike** — FEAT `b60e581b6c102cfc` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `lightsaber`, `lightsaber_polearm`, `double_weapon`
  - labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When using a lightsaber pike or long-handle lightsaber, you may attack with both ends and treat the weapon as a double weapon."
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "Treat a lightsaber pike or long-handle lightsaber as a double weapon and attack with both ends."

### Empower Weapon — TALENT `5218d5971b78119b`

- Family: O. Weapon / combat mode; detector O.lightsaber (HIGH); compared tag `lightsaber`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.214; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:5218d5971b78119b|lightsaber|O.lightsaber`
- Current tags: `force`, `force_point_spend`, `resource_spend`, `melee`, `equipment`, `weapon_empowerment`, `empowerment`, `crafting`, `damage_bonus`, `sustained_damage`, `action_economy`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You may spend a Force Point to empower a melee weapon. Empowering the weapon takes a Full-Round Action. From that point forward, the Empowered Weapon deals an additional die of damage, but only when wielded by you. For example, an empowered Lightsaber deals 3d8 points of damage, instead of 2d8 points of damage. Others who wield the weapon do not gain the bonus damage die.

Matching clause(s) (1):

1. Matched: "Lightsaber" — structural labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE, LIGHTSABER_APPEARS_ONLY_AS_AN_EXAMPLE; scope evidence: OPEN_GENERIC_SCOPE
   > For example, an empowered Lightsaber deals 3d8 points of damage, instead of 2d8 points of damage.

Opposite-domain comparator(s) carrying the tag:

- **Long Haft Strike** — FEAT `b60e581b6c102cfc` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `lightsaber`, `lightsaber_polearm`, `double_weapon`
  - labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When using a lightsaber pike or long-handle lightsaber, you may attack with both ends and treat the weapon as a double weapon."
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "Treat a lightsaber pike or long-handle lightsaber as a double weapon and attack with both ends."
- **Weapon Finesse** — FEAT `252b67d6e31c377e` (Saga Edition Core Rulebook p.89, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `lightsaber`, `precision`, `ability_enhancement`
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "With a light melee weapon or lightsaber, use Dexterity modifier instead of Strength modifier on attack rolls."
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "Use Dexterity instead of Strength for attacks with light melee weapons and lightsabers."

### Champion — TALENT `a7aea0411eb4fbc0`

- Family: O. Weapon / combat mode; detector O.lightsaber (HIGH); compared tag `lightsaber`; compared tag currently present: **false**
- Source: Unknown Regions p.23; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:a7aea0411eb4fbc0|lightsaber|O.lightsaber`
- Current tags: `once-per-encounter`, `recovery`, `condition_removal`, `resilience`, `survivability`, `fear`, `mind-affecting`, `damage_threshold`, `control`, `melee`, `unarmed`, `burst_damage`, `scaling`, `precision`, `healing`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> You can use each of the following actions once per encounter. Champion's Pride: When you use your second wind, you move +1 step on the condition track and remove one fear effect or mind-affecting effect in addition to the normal benefit of second wind. Disarming Hit: When you hit and damage a creature and that damage equals or exceeds its damage threshold, you can make a Disarm Attack against that target as a free action; if using a ranged weapon, you must also have the Ranged Disarm feat. Masterful Strike: When making a successful unarmed or melee attack other than with a lightsaber, increase your damage by 2 for every 5 points by which your attack roll exceeds the target's Reflex Defense.

Matching clause(s) (1):

1. Matched: "lightsaber" — structural labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE; scope evidence: CLOSED_SCOPE
   > Masterful Strike: When making a successful unarmed or melee attack other than with a lightsaber, increase your damage by 2 for every 5 points by which your attack roll exceeds the target's Reflex Defense.

Opposite-domain comparator(s) carrying the tag:

- **Long Haft Strike** — FEAT `b60e581b6c102cfc` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `lightsaber`, `lightsaber_polearm`, `double_weapon`
  - labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When using a lightsaber pike or long-handle lightsaber, you may attack with both ends and treat the weapon as a double weapon."
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "Treat a lightsaber pike or long-handle lightsaber as a double weapon and attack with both ends."
- **Weapon Finesse** — FEAT `252b67d6e31c377e` (Saga Edition Core Rulebook p.89, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `lightsaber`, `precision`, `ability_enhancement`
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "With a light melee weapon or lightsaber, use Dexterity modifier instead of Strength modifier on attack rolls."
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "Use Dexterity instead of Strength for attacks with light melee weapons and lightsabers."

### Precision Fire — TALENT `bef731c3743c2c7f`

- Family: O. Weapon / combat mode; detector O.lightsaber (HIGH); compared tag `lightsaber`; compared tag currently present: **false**
- Source: Legacy Era Campaign Guide p.40; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:bef731c3743c2c7f|lightsaber|O.lightsaber`
- Current tags: `anti-force`, `ranged`, `precision`, `targeting`, `deflect`, `setup`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> The Jedi are skilled at blocking and deflecting ranged attacks with their lightsabers, and you are able to compensate for this to some degree by taking careful shots. Whenever you aim before making a ranged attack, you increase the difficulty of Deflect attempts to negate your attack by +5.

Matching clause(s) (1):

1. Matched: "lightsabers" — structural labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > The Jedi are skilled at blocking and deflecting ranged attacks with their lightsabers, and you are able to compensate for this to some degree by taking careful shots.

Opposite-domain comparator(s) carrying the tag:

- **Weapon Finesse** — FEAT `252b67d6e31c377e` (Saga Edition Core Rulebook p.89, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `lightsaber`, `precision`, `ability_enhancement`
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "With a light melee weapon or lightsaber, use Dexterity modifier instead of Strength modifier on attack rolls."
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "Use Dexterity instead of Strength for attacks with light melee weapons and lightsabers."
- **Long Haft Strike** — FEAT `b60e581b6c102cfc` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `lightsaber`, `lightsaber_polearm`, `double_weapon`
  - labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When using a lightsaber pike or long-handle lightsaber, you may attack with both ends and treat the weapon as a double weapon."
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "Treat a lightsaber pike or long-handle lightsaber as a double weapon and attack with both ends."

### Transfer Essence — TALENT `c1be1f29c00436d5`

- Family: O. Weapon / combat mode; detector O.lightsaber (HIGH); compared tag `lightsaber`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.16; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:c1be1f29c00436d5|lightsaber|O.lightsaber`
- Current tags: `force`, `dark_side`, `use_the_force`, `standard_action`, `action_economy`, `will_defense`, `stun`, `damage`, `control`, `manipulation`, `survivability`, `resilience`, `equipment`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> When you die, you become a dark side spirit (see page 118) until the end of the encounter. You continue to occupy a space in this form, but other creatures can occupy the same space or move through your space without impediment. As a standard action, you can attempt to possess an adjacent target. You must succeed on a Use the Force check against an adjacent target's Will Defense. If your check result equals or exceeds the target's Will Defense, you deal 8d6 points of stun damage to the target; if you reduce the target to 0 hit points or move it to the bottom of the condition track with this attack, you possess the target as though it were a willing host (see the dark spirit template for details). Alternately, as a standard action, you can transfer your essence into a single adjacent object, such as a holocron or a lightsaber. If you do so, you lie dormant within the object until another creature attempts to use that object, at which time you can emerge and attempt to possess the creature, as described above. If you do not possess a creature or object within 10 rounds of manifesting as a dark spirit, your spirit dissipates and ceases to exist.

Matching clause(s) (1):

1. Matched: "lightsaber" — structural labels: LIGHTSABER_APPEARS_ONLY_AS_AN_EXAMPLE; scope evidence: OPEN_GENERIC_SCOPE
   > Alternately, as a standard action, you can transfer your essence into a single adjacent object, such as a holocron or a lightsaber.

Opposite-domain comparator(s) carrying the tag:

- **Weapon Finesse** — FEAT `252b67d6e31c377e` (Saga Edition Core Rulebook p.89, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `lightsaber`, `precision`, `ability_enhancement`
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "With a light melee weapon or lightsaber, use Dexterity modifier instead of Strength modifier on attack rolls."
  - labels: MERELY_REFERENCES_INTERACTION_WITH_LIGHTSABERS — "Use Dexterity instead of Strength for attacks with light melee weapons and lightsabers."
- **Long Haft Strike** — FEAT `b60e581b6c102cfc` (Jedi Academy Training Manual p.23, FEAT_CANONICAL_RULES_SHAPE); tags: `lightsaber`, `lightsaber_polearm`, `double_weapon`
  - labels: MECHANIC_REQUIRES_A_LIGHTSABER, DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "When using a lightsaber pike or long-handle lightsaber, you may attack with both ends and treat the weapon as a double weapon."
  - labels: DIRECTLY_MODIFIES_LIGHTSABER_ATTACKS_DAMAGE_DEFENSE_OR_USE — "Treat a lightsaber pike or long-handle lightsaber as a double weapon and attack with both ends."

## O.pistol → `pistol` (6)

### Sport Hunter — FEAT `8778b4271420f789`

- Family: O. Weapon / combat mode; detector O.pistol (HIGH); compared tag `pistol`; compared tag currently present: **false**
- Source: Galaxy at War p.25; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:8778b4271420f789|pistol|O.pistol`
- Current tags: `ranged`, `weapon_training`, `damage_bonus`, `reroll`, `reliability`, `precision`, `targeting`, `setup`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Slugthrower pistol at point-blank range: +1 damage die. Slugthrower rifle: damage dice increase from d8 to d12. Sporting blaster pistol: reroll damage-die results of 1 until a non-1 result. Sporting blaster rifle: +1 attack when you aim before firing. Gain weapon-specific benefits with proficient slugthrowers and sporting weapons.

Matching clause(s) (2):

1. Matched: "pistol" — structural labels: MODIFIES_PISTOL_ATTACKS_OR_USE; scope evidence: CLOSED_SCOPE
   > Slugthrower pistol at point-blank range: +1 damage die.
2. Matched: "pistol" — structural labels: MODIFIES_PISTOL_ATTACKS_OR_USE; scope evidence: CLOSED_SCOPE
   > Sporting blaster pistol: reroll damage-die results of 1 until a non-1 result.

Opposite-domain comparator(s) carrying the tag:

- **Flanking Fire** — TALENT `1f6b9d509a07f881` (Scum and Villainy p.28, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `pistol`, `ranged`, `dual_wield`, `flanking`, `full_attack`, `standard_action`, `action_economy`, `sustained_damage`, `positioning`
  - labels: EXPLICITLY_REQUIRES_OR_USES_A_PISTOL, MODIFIES_PISTOL_ATTACKS_OR_USE — "Whenever you are flanked by two or more opponents and are wielding two pistols, you can make a full attack action as a standard action instead of a full-round action."
- **Hailfire** — TALENT `223ba62ffbabb9c2` (Scum and Villainy p.28, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `dual_wield`, `pistol`, `ranged`, `burst_damage`, `standard_action`, `action_economy`
  - labels: EXPLICITLY_REQUIRES_OR_USES_A_PISTOL, MODIFIES_PISTOL_ATTACKS_OR_USE, PISTOL_IS_ONE_GENERIC_SELECTABLE_WEAPON_GROUP — "When you are wielding two pistols, as a standard action you can make an autofire attack with one of the pistols as though the weapon were set to autofire, even if the pistol would not normally be capable of autofire."
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "The normal penalties for autofire still apply to this attack roll, and you may split the number of shots consumed between the two pistols."

### Disabler — FEAT `94023012303ad257`

- Family: O. Weapon / combat mode; detector O.pistol (HIGH); compared tag `pistol`; compared tag currently present: **false**
- Source: Galaxy at War p.23; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:94023012303ad257|pistol|O.pistol`
- Current tags: `ranged`, `weapon_empowerment`, `precision`, `damage_bonus`, `battlefield_control`, `droid`, `vehicle`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Ion grenade: burst radius becomes 3 squares instead of 2. Ion pistol: damage dice increase from d6 to d8. Ion rifle: treat it as an accurate weapon. Gain weapon-specific benefits when attacking with a proficient ion grenade, ion pistol, or ion rifle.

Matching clause(s) (2):

1. Matched: "pistol" — structural labels: MODIFIES_PISTOL_ATTACKS_OR_USE; scope evidence: CLOSED_SCOPE
   > Ion pistol: damage dice increase from d6 to d8.
2. Matched: "pistol" — structural labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED; scope evidence: SCOPE_NOT_DETERMINABLE_FROM_WORDING
   > Gain weapon-specific benefits when attacking with a proficient ion grenade, ion pistol, or ion rifle.

Opposite-domain comparator(s) carrying the tag:

- **Hailfire** — TALENT `223ba62ffbabb9c2` (Scum and Villainy p.28, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `dual_wield`, `pistol`, `ranged`, `burst_damage`, `standard_action`, `action_economy`
  - labels: EXPLICITLY_REQUIRES_OR_USES_A_PISTOL, MODIFIES_PISTOL_ATTACKS_OR_USE, PISTOL_IS_ONE_GENERIC_SELECTABLE_WEAPON_GROUP — "When you are wielding two pistols, as a standard action you can make an autofire attack with one of the pistols as though the weapon were set to autofire, even if the pistol would not normally be capable of autofire."
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "The normal penalties for autofire still apply to this attack roll, and you may split the number of shots consumed between the two pistols."
- **Flanking Fire** — TALENT `1f6b9d509a07f881` (Scum and Villainy p.28, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `pistol`, `ranged`, `dual_wield`, `flanking`, `full_attack`, `standard_action`, `action_economy`, `sustained_damage`, `positioning`
  - labels: EXPLICITLY_REQUIRES_OR_USES_A_PISTOL, MODIFIES_PISTOL_ATTACKS_OR_USE — "Whenever you are flanked by two or more opponents and are wielding two pistols, you can make a full attack action as a standard action instead of a full-round action."

### Weapon Proficiency — FEAT `ecc2471ac96ec2d4`

- Family: O. Weapon / combat mode; detector O.pistol (HIGH); compared tag `pistol`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.89; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:ecc2471ac96ec2d4|pistol|O.pistol`
- Current tags: `weapon_training`, `equipment`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Choose advanced melee weapons, heavy weapons, lightsabers, pistols, rifles, or simple weapons; become proficient with all weapons in that group. Normally nonproficiency gives -5 attacks. Repeatable for a different weapon group each time. Exotic weapons are not a valid group choice; use Exotic Weapon Proficiency for a specific exotic weapon. Choose a weapon group and become proficient with it; repeatable for other groups, while exotic weapons use Exotic Weapon Proficiency.

Matching clause(s) (1):

1. Matched: "pistols" — structural labels: PISTOL_IS_ONE_GENERIC_SELECTABLE_WEAPON_GROUP; scope evidence: OPEN_GENERIC_SCOPE
   > Choose advanced melee weapons, heavy weapons, lightsabers, pistols, rifles, or simple weapons; become proficient with all weapons in that group.

Opposite-domain comparator(s) carrying the tag:

- **Hailfire** — TALENT `223ba62ffbabb9c2` (Scum and Villainy p.28, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `dual_wield`, `pistol`, `ranged`, `burst_damage`, `standard_action`, `action_economy`
  - labels: EXPLICITLY_REQUIRES_OR_USES_A_PISTOL, MODIFIES_PISTOL_ATTACKS_OR_USE, PISTOL_IS_ONE_GENERIC_SELECTABLE_WEAPON_GROUP — "When you are wielding two pistols, as a standard action you can make an autofire attack with one of the pistols as though the weapon were set to autofire, even if the pistol would not normally be capable of autofire."
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "The normal penalties for autofire still apply to this attack roll, and you may split the number of shots consumed between the two pistols."
- **Guaranteed Shot** — TALENT `52a4914cca90cc4d` (Scum and Villainy p.28, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `dual_wield`, `pistol`, `ranged`, `standard_action`, `action_economy`, `reliability`, `damage`, `scaling`
  - labels: EXPLICITLY_REQUIRES_OR_USES_A_PISTOL, MODIFIES_PISTOL_ATTACKS_OR_USE, PISTOL_IS_ONE_GENERIC_SELECTABLE_WEAPON_GROUP — "If you are wielding two pistols and make a single ranged attack with one of those pistols as a standard action, even if you miss you deal damage equal to half your heroic level to the target."

### Cover Fire — TALENT `049820827d7ef32b`

- Family: O. Weapon / combat mode; detector O.pistol (HIGH); compared tag `pistol`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.52; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:049820827d7ef32b|pistol|O.pistol`
- Current tags: `ranged`, `ally_support`, `support`, `teamwork`, `defense`, `ranged_defense`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> When you make a ranged attack with a Pistol or Rifle, all allies within 6 squares of you when you made the attack gain a +1 bonus to Reflex Defense until the start of your next turn. Allies within range don't need to be within your line of sight to gain the bonus.

Matching clause(s) (1):

1. Matched: "Pistol" — structural labels: EXPLICITLY_REQUIRES_OR_USES_A_PISTOL; scope evidence: CLOSED_SCOPE
   > When you make a ranged attack with a Pistol or Rifle, all allies within 6 squares of you when you made the attack gain a +1 bonus to Reflex Defense until the start of your next turn.

Opposite-domain comparator(s) carrying the tag:

- **Pistoleer** — FEAT `da2e6fb7a11b3d63` (Galaxy at War p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `pistol`, `ranged`, `weapon_training`, `precision`, `ambush`
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "Blaster pistol: treat as accurate."
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "Heavy blaster pistol: do not treat as inaccurate."
  - labels: MODIFIES_PISTOL_ATTACKS_OR_USE — "Hold-out blaster pistol: against a target that has not yet acted, gain +2 attacks with that weapon until that target acts."
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "Gain a different specialization benefit with a proficient blaster pistol, heavy blaster pistol, or hold-out blaster pistol."

### Blaster Turret I — TALENT `7b56d0b92582ae88`

- Family: O. Weapon / combat mode; detector O.pistol (HIGH); compared tag `pistol`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.57; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:7b56d0b92582ae88|pistol|O.pistol`
- Current tags: `crafting`, `tech`, `equipment`, `ranged`, `targeting`, `target-designation`, `once-per-encounter`, `standard_action`, `action_economy`, `sustained_damage`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Once per encounter, as standard action you can create a blaster turret (Size Tiny, Initiative +4, Perception +4, Reflex Defense 10, 10 hp, Threshold 8) that can be mounted to any flat surface. The turret fires as a standard blaster pistol once per round, using your base attack bonus plus your Intelligence bonus and dealing 3d6 points of damage. The turret fires at any target you designate (a free action, once per round on your turn), though you must remain adjacent to the turret to control it. The turret is expended at the end of the encounter.

Matching clause(s) (1):

1. Matched: "pistol" — structural labels: MODIFIES_PISTOL_ATTACKS_OR_USE; scope evidence: CLOSED_SCOPE
   > The turret fires as a standard blaster pistol once per round, using your base attack bonus plus your Intelligence bonus and dealing 3d6 points of damage.

Opposite-domain comparator(s) carrying the tag:

- **Pistoleer** — FEAT `da2e6fb7a11b3d63` (Galaxy at War p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `pistol`, `ranged`, `weapon_training`, `precision`, `ambush`
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "Blaster pistol: treat as accurate."
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "Heavy blaster pistol: do not treat as inaccurate."
  - labels: MODIFIES_PISTOL_ATTACKS_OR_USE — "Hold-out blaster pistol: against a target that has not yet acted, gain +2 attacks with that weapon until that target acts."
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "Gain a different specialization benefit with a proficient blaster pistol, heavy blaster pistol, or hold-out blaster pistol."

### Greater Weapon Specialization — TALENT `e9820b341bf94de1`

- Family: O. Weapon / combat mode; detector O.pistol (HIGH); compared tag `pistol`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.212; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:e9820b341bf94de1|pistol|O.pistol`
- Current tags: `weapon_specialization`, `weapon_training`, `damage_bonus`, `melee`, `ranged`, `sustained_damage`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Choose one exotic weapon or one of the following weapon groups: advanced melee weapons, heavy weapons, pistols, rifles, or simple weapons. You gain a +2 bonus on damage rolls with the chosen weapon. This stacks with Weapon Specialization. You may select this talent multiple times for different weapons.

Matching clause(s) (1):

1. Matched: "pistols" — structural labels: PISTOL_IS_ONE_GENERIC_SELECTABLE_WEAPON_GROUP; scope evidence: OPEN_GENERIC_SCOPE
   > Choose one exotic weapon or one of the following weapon groups: advanced melee weapons, heavy weapons, pistols, rifles, or simple weapons.

Opposite-domain comparator(s) carrying the tag:

- **Pistoleer** — FEAT `da2e6fb7a11b3d63` (Galaxy at War p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `pistol`, `ranged`, `weapon_training`, `precision`, `ambush`
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "Blaster pistol: treat as accurate."
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "Heavy blaster pistol: do not treat as inaccurate."
  - labels: MODIFIES_PISTOL_ATTACKS_OR_USE — "Hold-out blaster pistol: against a target that has not yet acted, gain +2 attacks with that weapon until that target acts."
  - labels: PISTOL_WORDING_NO_STRUCTURE_MATCHED — "Gain a different specialization benefit with a proficient blaster pistol, heavy blaster pistol, or hold-out blaster pistol."

## O.unarmed → `unarmed` (2)

### Triple Crit — FEAT `3d4a4e93ced26712`

- Family: O. Weapon / combat mode; detector O.unarmed (HIGH); compared tag `unarmed`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.89; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:3d4a4e93ced26712|unarmed|O.unarmed`
- Current tags: `critical_hit`, `damage_bonus`, `weapon_specialization`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: none

Complete canonical mechanic text used by the detector:

> Choose one weapon, including unarmed attack if desired. Critical hits with the selected weapon deal triple damage instead of double. Repeatable for different weapons; effects do not stack. Choose a proficient weapon; its critical hits deal triple damage; repeatable for different weapons.

Matching clause(s) (1):

1. Matched: "unarmed" — structural labels: UNARMED_STRIKE_IS_ONE_SELECTABLE_WEAPON_OR_GROUP_OPTION; scope evidence: OPEN_GENERIC_SCOPE
   > Choose one weapon, including unarmed attack if desired.

Opposite-domain comparator(s) carrying the tag:

- **Simultaneous Strike** — TALENT `040e50766b518ea6` (Jedi Academy Training Manual p.89, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `unarmed`, `martial_arts`, `melee`, `standard_action`, `action_economy`, `burst_damage`, `positioning`
  - labels: DIRECTLY_REQUIRES_AN_UNARMED_ATTACK — "As a standard action, you can make two unarmed attacks, each against different targets."
- **Martial Resurgence** — TALENT `0fb750f0f0e6f767` (Jedi Academy Training Manual p.89, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `unarmed`, `martial_arts`, `melee`, `critical_hit`, `force`, `force_power_synergy`, `force_capacity`, `resource_recovery`, `recovery`
  - labels: UNARMED_WORDING_NO_STRUCTURE_MATCHED — "You recover all spent Force powers, adding them to your Force suite again, whenever you roll a natural 20 on an unarmed attack."

### Weapon Focus — FEAT `c41814601364b643`

- Family: O. Weapon / combat mode; detector O.unarmed (HIGH); compared tag `unarmed`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.89; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:c41814601364b643|unarmed|O.unarmed`
- Current tags: `weapon_specialization`, `weapon_training`, `precision`
- Implication rule(s) that would apply if the owner later authorizes the tag: none
- Applicable prior owner policies: Prerequisite inheritance is not semantic inheritance.
- Prior owner rulings on this record: Pass 3B 3B.2B owner decision — `grapple` NO_CHANGE

Complete canonical mechanic text used by the detector:

> Choose one exotic weapon or weapon group, including unarmed strike or grapple if desired, and gain +1 attacks with it. Repeatable for different selections; effects do not stack on the same selection. Choose a proficient weapon/group for +1 attacks; repeatable for different selections.

Matching clause(s) (1):

1. Matched: "unarmed" — structural labels: MODIFIES_UNARMED_ATTACKS_OR_DAMAGE, UNARMED_STRIKE_IS_ONE_SELECTABLE_WEAPON_OR_GROUP_OPTION; scope evidence: OPEN_GENERIC_SCOPE
   > Choose one exotic weapon or weapon group, including unarmed strike or grapple if desired, and gain +1 attacks with it.

Opposite-domain comparator(s) carrying the tag:

- **Flurry of Blows** — TALENT `11b45afc4136594c` (Galaxy at War p.33, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `unarmed`, `martial_arts`, `melee`, `full_attack`, `sustained_damage`, `scaling`, `precision`
  - labels: DIRECTLY_REQUIRES_AN_UNARMED_ATTACK, MODIFIES_UNARMED_ATTACKS_OR_DAMAGE — "When you make multiple unarmed attacks as a full attack action, you reduce the penalty to your attack roll by 2."
- **Hammerblow** — TALENT `4356ac9986934fbf` (Legacy Era Campaign Guide p.31, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `unarmed`, `martial_arts`, `melee`, `precision`, `ability_enhancement`, `scaling`
  - labels: MODIFIES_UNARMED_ATTACKS_OR_DAMAGE — "If you are unarmed and holding no items, you double your Strength bonus on unarmed attack rolls."
