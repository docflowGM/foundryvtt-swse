# Pass 3B.1 — Mechanical Primitives: Owner Evidence Packet

Evidence extraction only. No recommendation, interpretation, proposed disposition, tag change or overlay is made. Clause labels describe wording structure only. Every decision belongs to the owner.

## Totals

- Unresolved entries (record × detector): **57**; unique records: **50**; records with more than one distinct matching clause: 3
- By domain: TALENT 42, FEAT 15
- By compared tag: `reaction` 3, `swift_action` 4, `move_action` 3, `standard_action` 4, `action_economy` 13, `reliability` 5, `reroll` 1, `force_point_spend` 12, `resource_spend` 3, `resource_recovery` 5, `once-per-encounter` 3, `force_capacity` 1

| Detector | Compared tag | Unresolved | Feats | Talents | Not included: prior-ruled | Not included: no comparator | Detected and already carrying tag |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A.cost_reaction | `reaction` | 3 | 0 | 3 | 0 | 0 | 136 |
| A.cost_swift | `swift_action` | 4 | 1 | 3 | 0 | 0 | 184 |
| A.cost_move | `move_action` | 3 | 2 | 1 | 0 | 0 | 24 |
| A.cost_standard | `standard_action` | 4 | 0 | 4 | 0 | 0 | 136 |
| A.grants_action | `action_economy` | 0 | 0 | 0 | 0 | 0 | 11 |
| A.any_action_cost | `action_economy` | 13 | 8 | 5 | 0 | 0 | 484 |
| B.reroll | `reroll` | 2 | 0 | 2 | 0 | 0 | 96 |
| B.roll_twice_keep | `reliability` | 1 | 1 | 0 | 0 | 0 | 28 |
| B.take_10_20 | `reliability` | 3 | 2 | 1 | 2 | 0 | 16 |
| B.automatic_success | `reliability` | 0 | 0 | 0 | 0 | 0 | 8 |
| C.force_point_spend | `force_point_spend` | 12 | 0 | 12 | 0 | 0 | 137 |
| C.resource_spend | `resource_spend` | 3 | 0 | 3 | 0 | 0 | 132 |
| C.resource_recovery | `resource_recovery` | 5 | 0 | 5 | 0 | 0 | 10 |
| C.once_per_encounter | `once-per-encounter` | 3 | 0 | 3 | 0 | 0 | 203 |
| C.force_capacity | `force_capacity` | 1 | 1 | 0 | 0 | 0 | 6 |

## A.cost_reaction → `reaction` (3)

### Dumb Luck — TALENT `7a024dac260bf9ec`

- Detector: A.cost_reaction (HIGH); compared tag `reaction`; compared tag currently present: **false**
- Source: Scum and Villainy p.14; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:7a024dac260bf9ec|reaction|A.cost_reaction`
- Current tags: `once-per-encounter`, `standard_action`, `action_economy`, `melee`, `ranged`, `defense`, `evasion`, `mobility`, `movement`, `positioning`, `precision`, `setup`
- Implication rule(s) that would apply if the owner later authorizes the tag: reaction -> action_economy (`action_economy` currently present)

Complete canonical mechanic text used by the detector:

> You can use each of the following actions once per encounter as a standard action. Elude Enemy: Make a single melee or ranged attack against any target within range; if you damage the target, you gain a +2 bonus to your Reflex Defense against that target until the beginning of your next turn. Escape: Make a single melee or ranged attack against any target within range; if the target successfully damages you before the start of your next turn, you can immediately move 2 squares as a reaction without provoking attacks of opportunity. Make your Own Luck: Make a single melee or ranged attack against any target within range; if you miss this target, you gain a +2 bonus on your next attack roll.

Matching clause(s) (1):

1. Matched: "as a reaction" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION
   > Escape: Make a single melee or ranged attack against any target within range; if the target successfully damages you before the start of your next turn, you can immediately move 2 squares as a reaction without provoking attacks of opportunity.

Opposite-domain comparator(s) carrying the tag:

- **Conditioning** — FEAT `0ac76f1c0c1677cb` (Knights of the Old Republic Campaign Guide p.32, FEAT_CANONICAL_RULES_SHAPE); tags: `reroll`, `reliability`, `skills`, `defense`, `reaction`, `action_economy`, `once-per-encounter`, `resilience`, `climb`, `jump`, `swim`, `endurance`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Once per encounter as a reaction, add your Strength bonus to Fortitude Defense until the beginning of your next turn."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Reroll trained Strength/Constitution-based skills and once per encounter add Strength bonus to Fortitude as a reaction."
- **Logic Upgrade: Self-Defense** — FEAT `191aacaecaa92ce1` (Knights of the Old Republic Campaign Guide p.34, FEAT_CANONICAL_RULES_SHAPE); tags: `defense`, `reaction`, `action_economy`, `once-per-encounter`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Once per encounter as a reaction, choose one defense and gain +2 morale to it until the end of your next turn."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Once per encounter as a reaction, give one chosen defense +2 morale through the end of your next turn."

### Outmaneuver — TALENT `95697c5a4459d7e4`

- Detector: A.cost_reaction (HIGH); compared tag `reaction`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.222; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:95697c5a4459d7e4|reaction|A.cost_reaction`
- Current tags: `knowledge`, `tactics`, `skills`, `standard_action`, `action_economy`, `control`, `battlefield_control`, `opposed_check`, `morale`, `defense`, `targeting`
- Implication rule(s) that would apply if the owner later authorizes the tag: reaction -> action_economy (`action_economy` currently present)

Complete canonical mechanic text used by the detector:

> An Officer learns to counter the tactics of their enemies. As a Standard Action, you can make a DC 15 Knowledge (Tactics) check. If the check succeeds, opponents in your line of sight lose all competence, insight, and morale bonuses on attack rolls, as well as any dodge bonuses to Reflex Defense, until the start of your next turn. If one or more enemy Officers are within your line of sight, the highest level Officer among them can attempt to Oppose your Knowledge (Tactics) check as a Reaction. If their Skill Check result is higher than yours, your attempt to Outmaneuver your opponents fails.

Matching clause(s) (1):

1. Matched: "as a Reaction" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION
   > If one or more enemy Officers are within your line of sight, the highest level Officer among them can attempt to Oppose your Knowledge (Tactics) check as a Reaction.

Opposite-domain comparator(s) carrying the tag:

- **Conditioning** — FEAT `0ac76f1c0c1677cb` (Knights of the Old Republic Campaign Guide p.32, FEAT_CANONICAL_RULES_SHAPE); tags: `reroll`, `reliability`, `skills`, `defense`, `reaction`, `action_economy`, `once-per-encounter`, `resilience`, `climb`, `jump`, `swim`, `endurance`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Once per encounter as a reaction, add your Strength bonus to Fortitude Defense until the beginning of your next turn."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Reroll trained Strength/Constitution-based skills and once per encounter add Strength bonus to Fortitude as a reaction."
- **Logic Upgrade: Self-Defense** — FEAT `191aacaecaa92ce1` (Knights of the Old Republic Campaign Guide p.34, FEAT_CANONICAL_RULES_SHAPE); tags: `defense`, `reaction`, `action_economy`, `once-per-encounter`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Once per encounter as a reaction, choose one defense and gain +2 morale to it until the end of your next turn."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Once per encounter as a reaction, give one chosen defense +2 morale through the end of your next turn."

### Tactical Superiority — TALENT `f259cf27c1b62c47`

- Detector: A.cost_reaction (HIGH); compared tag `reaction`; compared tag currently present: **false**
- Source: Scum and Villainy p.27; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:f259cf27c1b62c47|reaction|A.cost_reaction`
- Current tags: `swift_action`, `action_economy`, `ally_support`, `support`, `teamwork`, `mobility`, `movement`, `evasion`, `attack_of_opportunity`
- Implication rule(s) that would apply if the owner later authorizes the tag: reaction -> action_economy (`action_economy` currently present)

Complete canonical mechanic text used by the detector:

> Spend two swift actions to select two allies. Each ally can move 2 squares as a reaction. This movement does not provoke attacks of opportunity.

Matching clause(s) (1):

1. Matched: "as a reaction" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION
   > Each ally can move 2 squares as a reaction.

Opposite-domain comparator(s) carrying the tag:

- **Conditioning** — FEAT `0ac76f1c0c1677cb` (Knights of the Old Republic Campaign Guide p.32, FEAT_CANONICAL_RULES_SHAPE); tags: `reroll`, `reliability`, `skills`, `defense`, `reaction`, `action_economy`, `once-per-encounter`, `resilience`, `climb`, `jump`, `swim`, `endurance`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Once per encounter as a reaction, add your Strength bonus to Fortitude Defense until the beginning of your next turn."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Reroll trained Strength/Constitution-based skills and once per encounter add Strength bonus to Fortitude as a reaction."
- **Logic Upgrade: Self-Defense** — FEAT `191aacaecaa92ce1` (Knights of the Old Republic Campaign Guide p.34, FEAT_CANONICAL_RULES_SHAPE); tags: `defense`, `reaction`, `action_economy`, `once-per-encounter`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Once per encounter as a reaction, choose one defense and gain +2 morale to it until the end of your next turn."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Once per encounter as a reaction, give one chosen defense +2 morale through the end of your next turn."

## A.cost_swift → `swift_action` (4)

### Signature Device — FEAT `313095ada7504547`

- Detector: A.cost_swift (HIGH); compared tag `swift_action`; compared tag currently present: **false**
- Source: Scum and Villainy p.24; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:313095ada7504547|swift_action|A.cost_swift`
- Current tags: `tech`, `mechanics`, `modification`, `equipment`, `reliability`
- Implication rule(s) that would apply if the owner later authorizes the tag: swift_action -> action_economy (`action_economy` currently absent)

Complete canonical mechanic text used by the detector:

> Designate one weapon, armor, vehicle, or other item as your signature item. You may Take 10 on Mechanics checks to modify it. It may have two Tech Specialist traits; installing the second requires DC 30 Mechanics. Only one trait can be active at a time; switch active trait as a swift action. Only one signature device at a time; designating another removes all Tech Specialist traits from the former signature item. Designate one signature item, Take 10 on its Tech Specialist modifications, install two traits, and switch the active trait as a swift action.

Matching clause(s) (2):

1. Matched: "as a swift action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION
   > Only one trait can be active at a time; switch active trait as a swift action.
2. Matched: "as a swift action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION
   > Designate one signature item, Take 10 on its Tech Specialist modifications, install two traits, and switch the active trait as a swift action.

Opposite-domain comparator(s) carrying the tag:

- **Band Together** — TALENT `03123bd5c86beaa0` (Unknown Regions p.19, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `ally_support`, `support`, `teamwork`, `leadership`, `target-designation`, `damage_bonus`, `will_defense`, `persuasion`, `social`, `mind-affecting`, `control`, `swift_action`, `action_economy`, `once-per-encounter`, `sustained_damage`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Directed Attack: As a swift action, designate one enemy character or vehicle; until the end of your next turn, whenever an ally within 12 squares hits that target, add 1d6 damage to each hit."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Strength in Numbers: As a swift action, grant all allies within 12 squares and line of sight a +5 bonus to Will Defense until the end of your next turn; you must have at least two allies to use this action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Temporary Allies: With a successful Persuasion check, turn a Gamemaster character whose attitude is unfriendly or indifferent into an ally willing to aid you and follow your direction for the remainder of the encounter; as a swift action you direct that character to attack, aid another, or use a skill to aid you or your allies."
- **Blind Spot** — TALENT `0be2881047fe9919` (Starships of the Galaxy p.17, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `vehicle`, `pilot`, `skills`, `swift_action`, `action_economy`, `opposed_check`, `mobility`, `positioning`, `precision`, `defense`, `evasion`, `targeting`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "As a swift action, make an opposed Pilot check against the target."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "You move with your target if it moves (assuming your vehicle has sufficient speed to keep up), and you must make another opposed Pilot check each round as a swift action to stay in its blind spot."

### Out of Harm's Way — TALENT `1946e16d1e6c831c`

- Detector: A.cost_swift (HIGH); compared tag `swift_action`; compared tag currently present: **false**
- Source: Unknown Regions p.23; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:1946e16d1e6c831c|swift_action|A.cost_swift`
- Current tags: `reaction`, `ally_support`, `support`, `teamwork`, `mobility`, `positioning`, `evasion`, `survivability`, `action_economy`
- Implication rule(s) that would apply if the owner later authorizes the tag: swift_action -> action_economy (`action_economy` currently present)

Complete canonical mechanic text used by the detector:

> As a reaction, when you use Harm's Way, which still requires a swift action to activate, you can move into the square of the ally you are protecting and move the ally to any legal square adjacent to you. This movement does not provoke an attack of opportunity.

Matching clause(s) (1):

1. Matched: "requires a swift action" — syntax labels: CHARACTER_SPENDS_OR_COSTS_ACTION, ACTION_TYPE_STATED_AS_ACTIVATION
   > As a reaction, when you use Harm's Way, which still requires a swift action to activate, you can move into the square of the ally you are protecting and move the ally to any legal square adjacent to you.

Opposite-domain comparator(s) carrying the tag:

- **Pincer** — FEAT `09d4eedfce05c6a3` (Scavenger's Guide to Droids p.24, FEAT_CANONICAL_RULES_SHAPE); tags: `grapple`, `restrain`, `swift_action`, `action_economy`, `sustained_damage`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Make later grapple checks against the pinned enemy as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Maintain a Pin and make later grapple checks as a swift action, applying Crush on successful checks."
- **Close Combat Escape** — FEAT `1ec2b64343aca60e` (Scum and Villainy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `acrobatics`, `grapple`, `evasion`, `swift_action`, `action_economy`, `melee`, `unarmed`, `setup`, `control`
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "After successfully using Acrobatics to escape a grapple, spend a swift action to make one melee or unarmed attack against the former grappler."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "Escape a grapple with Acrobatics, then spend a swift action for a melee/unarmed counterattack that can leave the former grappler flat-footed."

### Sow Confusion — TALENT `6b09fe0c6fe98367`

- Detector: A.cost_swift (HIGH); compared tag `swift_action`; compared tag currently present: **false**
- Source: Scum and Villainy p.15; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:6b09fe0c6fe98367|swift_action|A.cost_swift`
- Current tags: `once-per-encounter`, `standard_action`, `action_economy`, `deception`, `social`, `skills`, `will_defense`, `control`, `battlefield_control`
- Implication rule(s) that would apply if the owner later authorizes the tag: swift_action -> action_economy (`action_economy` currently present)

Complete canonical mechanic text used by the detector:

> Once per encounter, as a standard action, you can make a Deception check and compare the result to the Will Defense of all enemies in your line of sight. If the check result equals or exceeds an enemy's Will Defense, that enemy must spend a swift action in addition to a standard action to make an attack until the start of your next turn.

Matching clause(s) (1):

1. Matched: "spend a swift action" — syntax labels: CHARACTER_SPENDS_OR_COSTS_ACTION
   > If the check result equals or exceeds an enemy's Will Defense, that enemy must spend a swift action in addition to a standard action to make an attack until the start of your next turn.

Opposite-domain comparator(s) carrying the tag:

- **Close Combat Escape** — FEAT `1ec2b64343aca60e` (Scum and Villainy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `acrobatics`, `grapple`, `evasion`, `swift_action`, `action_economy`, `melee`, `unarmed`, `setup`, `control`
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "After successfully using Acrobatics to escape a grapple, spend a swift action to make one melee or unarmed attack against the former grappler."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "Escape a grapple with Acrobatics, then spend a swift action for a melee/unarmed counterattack that can leave the former grappler flat-footed."
- **Tae-Jitsu Training** — FEAT `6b6a0dc594ad4e3c` (Galaxy at War p.28, FEAT_CANONICAL_RULES_SHAPE); tags: `martial_arts`, `unarmed`, `melee`, `critical_hit`, `damage_bonus`, `defense`, `target-designation`, `targeting`, `swift_action`, `action_economy`, `once-per-encounter`, `control`
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "Once per encounter after a successful unarmed attack, spend a swift action to designate that enemy as primary adversary; until encounter end, Dodge applies against that enemy and one other enemy you choose."

### Hard Target — TALENT `7f4edcb8aa830972`

- Detector: A.cost_swift (HIGH); compared tag `swift_action`; compared tag currently present: **false**
- Source: Threats of the Galaxy p.95; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:7f4edcb8aa830972|swift_action|A.cost_swift`
- Current tags: `healing`, `recovery`, `reaction`, `action_economy`, `survivability`
- Implication rule(s) that would apply if the owner later authorizes the tag: swift_action -> action_economy (`action_economy` currently present)

Complete canonical mechanic text used by the detector:

> You can catch a second wind as a reaction instead of as a swift action.

Matching clause(s) (1):

1. Matched: "as a swift action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING
   > You can catch a second wind as a reaction instead of as a swift action.

Opposite-domain comparator(s) carrying the tag:

- **Quick Draw** — FEAT `44705a692e2f01a6` (Saga Edition Core Rulebook p.87, FEAT_CANONICAL_RULES_SHAPE); tags: `equipment`, `swift_action`, `action_economy`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING — "Draw or holster a weapon as a swift action instead of a move action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Draw or holster a weapon as a swift action."
- **Pincer** — FEAT `09d4eedfce05c6a3` (Scavenger's Guide to Droids p.24, FEAT_CANONICAL_RULES_SHAPE); tags: `grapple`, `restrain`, `swift_action`, `action_economy`, `sustained_damage`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Make later grapple checks against the pinned enemy as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Maintain a Pin and make later grapple checks as a swift action, applying Crush on successful checks."

## A.cost_move → `move_action` (3)

### Ascension Specialists — FEAT `125c328c4573890a`

- Detector: A.cost_move (HIGH); compared tag `move_action`; compared tag currently present: **false**
- Source: Galaxy at War p.28; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:125c328c4573890a|move_action|A.cost_move`
- Current tags: `teamwork`, `climb`, `movement`, `mobility`, `scaling`
- Implication rule(s) that would apply if the owner later authorizes the tag: move_action -> action_economy (`action_economy` currently absent)

Complete canonical mechanic text used by the detector:

> Gain +3 competence on Climb checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, climb at half speed as a move action or normal speed as a full-round action. Team Feat: +3 Climb, scaling by nearby allies with the same feat to +7, plus a Climb-specific teamwork benefit.

Matching clause(s) (1):

1. Matched: "as a move action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > Additionally, climb at half speed as a move action or normal speed as a full-round action.

Opposite-domain comparator(s) carrying the tag:

- **Swift Strider** — TALENT `cae4f000dcfddd99` (Scum and Villainy p.17, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `melee`, `ranged`, `mobility`, `movement`, `defense`, `evasion`, `positioning`, `standard_action`, `move_action`, `action_economy`, `attack_of_opportunity`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Blurring Burst: As a move action move up to your speed and gain a +2 bonus to your Reflex Defense until the end of the encounter."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Weaving Stride: Move up to your speed as a move action; you gain a cumulative +2 dodge bonus to Reflex Defense for each attack of opportunity made against you during this movement, lasting until the beginning of your next turn."
- **Fall Back** — TALENT `16b020752725d7a9` (Galaxy at War p.31, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `move_action`, `action_economy`, `ally_support`, `support`, `teamwork`, `leadership`, `command`, `mobility`, `positioning`, `evasion`, `attack_of_opportunity`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "As a move action, you can enable each member of your squad to immediately move two squares."

### Aquatic Specialists — FEAT `55483fd350b3ba28`

- Detector: A.cost_move (HIGH); compared tag `move_action`; compared tag currently present: **false**
- Source: Galaxy at War p.28; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:55483fd350b3ba28|move_action|A.cost_move`
- Current tags: `teamwork`, `swim`, `movement`, `mobility`, `scaling`
- Implication rule(s) that would apply if the owner later authorizes the tag: move_action -> action_economy (`action_economy` currently absent)

Complete canonical mechanic text used by the detector:

> Gain +3 competence on Swim checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, swim at half speed as a move action or full speed as a full-round action. Team Feat: +3 Swim, scaling by nearby allies with the same feat to +7, plus a Swim-specific teamwork benefit.

Matching clause(s) (1):

1. Matched: "as a move action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > Additionally, swim at half speed as a move action or full speed as a full-round action.

Opposite-domain comparator(s) carrying the tag:

- **Swift Strider** — TALENT `cae4f000dcfddd99` (Scum and Villainy p.17, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `melee`, `ranged`, `mobility`, `movement`, `defense`, `evasion`, `positioning`, `standard_action`, `move_action`, `action_economy`, `attack_of_opportunity`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Blurring Burst: As a move action move up to your speed and gain a +2 bonus to your Reflex Defense until the end of the encounter."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Weaving Stride: Move up to your speed as a move action; you gain a cumulative +2 dodge bonus to Reflex Defense for each attack of opportunity made against you during this movement, lasting until the beginning of your next turn."
- **Fall Back** — TALENT `16b020752725d7a9` (Galaxy at War p.31, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `move_action`, `action_economy`, `ally_support`, `support`, `teamwork`, `leadership`, `command`, `mobility`, `positioning`, `evasion`, `attack_of_opportunity`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "As a move action, you can enable each member of your squad to immediately move two squares."

### Jedi Quarry — TALENT `dfb9e58c7bcb095c`

- Detector: A.cost_move (HIGH); compared tag `move_action`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.20; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:dfb9e58c7bcb095c|move_action|A.cost_move`
- Current tags: `swift_action`, `action_economy`, `target-designation`, `pursuit`, `mobility`, `movement`, `positioning`, `setup`
- Implication rule(s) that would apply if the owner later authorizes the tag: move_action -> action_economy (`action_economy` currently present)

Complete canonical mechanic text used by the detector:

> As a swift action, you designate a single target creature as the focus of your attentions. You gain a +2 bonus to your speed any time you spend a move action to move, provided that you end your movement adjacent to the target. You retain this bonus (and may not use this talent again) until your target surrenders, is reduced to 0 hit points, or moves to the bottom of the condition track, or until the encounter ends.

Matching clause(s) (1):

1. Matched: "spend a move action" — syntax labels: CHARACTER_SPENDS_OR_COSTS_ACTION
   > You gain a +2 bonus to your speed any time you spend a move action to move, provided that you end your movement adjacent to the target.

Opposite-domain comparator(s) carrying the tag:

- **Bad Feeling** — FEAT `37aa58a3833bf34a` (The Force Unleashed Campaign Guide p.32, FEAT_CANONICAL_RULES_SHAPE); tags: `surprise_round`, `move_action`, `action_economy`, `movement`, `mobility`, `ambush_defense`, `initiative`
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION, CHARACTER_MAY_TAKE_ACTION — "You may always take a move action during a surprise round, even if surprised."
- **Burst of Speed** — FEAT `cbea70febcf834cd` (Scum and Villainy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `move_action`, `action_economy`, `movement`, `mobility`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "As a move action, move up to twice your speed."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Move up to twice your speed as a move action, then take -1 CT."

## A.cost_standard → `standard_action` (4)

### Deep Space Raider — TALENT `696f7eed2cc08299`

- Detector: A.cost_standard (HIGH); compared tag `standard_action`; compared tag currently present: **false**
- Source: Unknown Regions p.21; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:696f7eed2cc08299|standard_action|A.cost_standard`
- Current tags: `vehicle`, `pilot`, `space`, `ranged`, `mobility`, `positioning`, `control`, `battlefield_control`, `pursuit`, `shields`, `action_economy`, `once-per-encounter`
- Implication rule(s) that would apply if the owner later authorizes the tag: standard_action -> action_economy (`action_economy` currently present)

Complete canonical mechanic text used by the detector:

> You can use each of the following actions once per encounter. Clear a Path: While fighting aboard a starship, as a standard action make a ranged attack; if it hits, on its next turn the target must move its speed to a square not adjacent to you, or if it is an enemy starfighter in a dogfight it must attempt to disengage. Covering Fire: As a full-round action while piloting a vehicle, move the vehicle up to twice its speed and make one ranged attack with a pilot-controlled weapon at any point during the movement; if you damage a vehicle, it takes -2 on attack rolls against your vehicle until the end of your next turn. Disabling Fire: Make a ranged attack with a vehicle weapon; if you damage a vehicle, choose until the end of your next turn to disable one weapon, reduce its SR to 0, disable its hyperdrive, or reduce its speed to 2 squares.

Matching clause(s) (1):

1. Matched: "as a standard action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION
   > Clear a Path: While fighting aboard a starship, as a standard action make a ranged attack; if it hits, on its next turn the target must move its speed to a square not adjacent to you, or if it is an enemy starfighter in a dogfight it must attempt to disengage.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Silver Tongue** — FEAT `8ff15069dbf6270d` (Galaxy of Intrigue p.29, FEAT_CANONICAL_RULES_SHAPE); tags: `persuasion`, `intimidation`, `social`, `manipulation`, `standard_action`, `action_economy`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING, FULL_ROUND_ACTION_WORDING — "Intimidate a creature or Change Attitude as a standard action instead of the normal full-round action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING — "Intimidate or Change Attitude as a standard action."

### Harrying Shot — TALENT `8306c13c16ae0af8`

- Detector: A.cost_standard (HIGH); compared tag `standard_action`; compared tag currently present: **false**
- Source: Galaxy at War p.31; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:8306c13c16ae0af8|standard_action|A.cost_standard`
- Current tags: `ranged`, `offense_ranged`, `sniper`, `precision`, `targeting`, `setup`, `control`, `battlefield_control`, `action_economy`, `stun`
- Implication rule(s) that would apply if the owner later authorizes the tag: standard_action -> action_economy (`action_economy` currently present)

Complete canonical mechanic text used by the detector:

> When you make a successful ranged attack against an enemy that you have aimed at and the attack deals damage, the target cannot use a standard action to make an attack roll on his or her next turn. This counts as a stunning effect.

Matching clause(s) (1):

1. Matched: "use a standard action" — syntax labels: CHARACTER_SPENDS_OR_COSTS_ACTION
   > When you make a successful ranged attack against an enemy that you have aimed at and the attack deals damage, the target cannot use a standard action to make an attack roll on his or her next turn.

Opposite-domain comparator(s) carrying the tag:

- **Melee Defense** — FEAT `3a847230d573a623` (Saga Edition Core Rulebook p.86, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `melee_defense`, `defense`, `fighting_defensively`, `precision`, `standard_action`, `action_economy`
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "When using a standard action for a melee attack, take an attack penalty up to -5 and add the same amount as dodge Reflex Defense."
- **Multi-Grab** — FEAT `821e127ba3b83c1a` (Legacy Era Campaign Guide p.36, FEAT_CANONICAL_RULES_SHAPE); tags: `grab`, `grapple`, `standard_action`, `action_economy`, `control`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "As a standard action, make a separate grab attack against each of two targets adjacent to you."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "Use a standard action to make separate grab attacks against two adjacent targets while both hands are empty."

### Scripted Routines — TALENT `8d0657e7ade688bd`

- Detector: A.cost_standard (HIGH); compared tag `standard_action`; compared tag currently present: **false**
- Source: Scavenger's Guide to Droids p.29; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:8d0657e7ade688bd|standard_action|A.cost_standard`
- Current tags: `droid`, `once-per-encounter`, `action_economy`, `skills`, `scaling`, `defense`, `ability_enhancement`
- Implication rule(s) that would apply if the owner later authorizes the tag: standard_action -> action_economy (`action_economy` currently present)

Complete canonical mechanic text used by the detector:

> Your extensive experience allows you to preset specific routines that give you an advantage in some situations. Once per encounter you can use each of the following actions: Attack Script: You can use a feat or a talent that modifies your attack roll as one action less (for example, a full-round action becomes a standard action, a standard action becomes a move action, a move action becomes a swift action, a swift action becomes a free action). Defense Script: You can apply your Independent Spirit bonus a second time during a single encounter. Skill Script: While in combat, you can apply a bonus equal to one-half of your class level to any single skill that requires a standard action or less to use. You must be trained in the skill.

Matching clause(s) (1):

1. Matched: "requires a standard action" — syntax labels: CHARACTER_SPENDS_OR_COSTS_ACTION
   > Skill Script: While in combat, you can apply a bonus equal to one-half of your class level to any single skill that requires a standard action or less to use.

Opposite-domain comparator(s) carrying the tag:

- **Melee Defense** — FEAT `3a847230d573a623` (Saga Edition Core Rulebook p.86, FEAT_CANONICAL_RULES_SHAPE); tags: `melee`, `melee_defense`, `defense`, `fighting_defensively`, `precision`, `standard_action`, `action_economy`
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "When using a standard action for a melee attack, take an attack penalty up to -5 and add the same amount as dodge Reflex Defense."
- **Multi-Grab** — FEAT `821e127ba3b83c1a` (Legacy Era Campaign Guide p.36, FEAT_CANONICAL_RULES_SHAPE); tags: `grab`, `grapple`, `standard_action`, `action_economy`, `control`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "As a standard action, make a separate grab attack against each of two targets adjacent to you."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "Use a standard action to make separate grab attacks against two adjacent targets while both hands are empty."

### Battle Mount — TALENT `f557b3331b5158c8`

- Detector: A.cost_standard (HIGH); compared tag `standard_action`; compared tag currently present: **false**
- Source: Unknown Regions p.22; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:f557b3331b5158c8|standard_action|A.cost_standard`
- Current tags: `mount`, `ride`, `rider`, `cover`, `defense`, `mobility`, `positioning`, `swift_action`, `action_economy`, `once-per-encounter`
- Implication rule(s) that would apply if the owner later authorizes the tag: standard_action -> action_economy (`action_economy` currently present)

Complete canonical mechanic text used by the detector:

> You can use each of the following actions once per encounter. Covered Attack: When using Use Mount as Cover, but not improved cover, you can make an attack as a standard action if you have a free hand. Reduce Profile: When you succeed at Use Mount as Cover, you gain improved cover; if you fail by less than 10, you still gain normal cover, and if you fail by 10 or more you gain no benefit. Swift Attack Mount: Once per encounter, the mount you are riding can make an attack as a swift action instead of a standard action.

Matching clause(s) (1):

1. Matched: "as a standard action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION
   > Covered Attack: When using Use Mount as Cover, but not improved cover, you can make an attack as a standard action if you have a free hand.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Silver Tongue** — FEAT `8ff15069dbf6270d` (Galaxy of Intrigue p.29, FEAT_CANONICAL_RULES_SHAPE); tags: `persuasion`, `intimidation`, `social`, `manipulation`, `standard_action`, `action_economy`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING, FULL_ROUND_ACTION_WORDING — "Intimidate a creature or Change Attitude as a standard action instead of the normal full-round action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING — "Intimidate or Change Attitude as a standard action."

## A.grants_action

No unresolved entries.

## A.any_action_cost → `action_economy` (13)

### Ascension Specialists — FEAT `125c328c4573890a`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Galaxy at War p.28; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:125c328c4573890a|action_economy|A.any_action_cost`
- Current tags: `teamwork`, `climb`, `movement`, `mobility`, `scaling`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Gain +3 competence on Climb checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, climb at half speed as a move action or normal speed as a full-round action. Team Feat: +3 Climb, scaling by nearby allies with the same feat to +7, plus a Climb-specific teamwork benefit.

Matching clause(s) (1):

1. Matched: "as a move action", "as a full-round action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > Additionally, climb at half speed as a move action or normal speed as a full-round action.

Opposite-domain comparator(s) carrying the tag:

- **Protector Actions** — TALENT `254b51a34600e2ef` (Clone Wars Campaign Guide p.23, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `followers`, `ally_support`, `support`, `teamwork`, `standard_action`, `action_economy`, `melee`, `ranged`, `counterattack`, `reaction`, `mobility`, `movement`, `control`, `battlefield_control`, `defense`, `targeting`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "You can use any of the following actions on your turn: Bodyguard: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Until the end of your next turn, if that target damages you with an attack or Force Power, as a Reaction you can choose to redirect the attack or Force Power to an adjacent follower; the attack or Force Power is resolved against that ally as normal."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Diversion Attack: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "The Best Defense: As a Standard Action, you can make a melee or ranged attack against a target within Range."
- **Beloved** — TALENT `444c032c563c18a1` (Scum and Villainy p.14, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `ally_support`, `support`, `teamwork`, `swift_action`, `standard_action`, `action_economy`, `defense`, `reaction`, `counterattack`, `mobility`, `movement`, `evasion`, `positioning`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Guardian: Choose one ally as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Reprisal: Make a single melee or ranged attack against any target within range as a standard action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "If your attack roll succeeds and that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a reaction."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "To Me!: Spend a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a reaction; this movement does not provoke attacks of opportunity."

### Signature Device — FEAT `313095ada7504547`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Scum and Villainy p.24; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:313095ada7504547|action_economy|A.any_action_cost`
- Current tags: `tech`, `mechanics`, `modification`, `equipment`, `reliability`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Designate one weapon, armor, vehicle, or other item as your signature item. You may Take 10 on Mechanics checks to modify it. It may have two Tech Specialist traits; installing the second requires DC 30 Mechanics. Only one trait can be active at a time; switch active trait as a swift action. Only one signature device at a time; designating another removes all Tech Specialist traits from the former signature item. Designate one signature item, Take 10 on its Tech Specialist modifications, install two traits, and switch the active trait as a swift action.

Matching clause(s) (2):

1. Matched: "as a swift action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION
   > Only one trait can be active at a time; switch active trait as a swift action.
2. Matched: "as a swift action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION
   > Designate one signature item, Take 10 on its Tech Specialist modifications, install two traits, and switch the active trait as a swift action.

Opposite-domain comparator(s) carrying the tag:

- **Protector Actions** — TALENT `254b51a34600e2ef` (Clone Wars Campaign Guide p.23, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `followers`, `ally_support`, `support`, `teamwork`, `standard_action`, `action_economy`, `melee`, `ranged`, `counterattack`, `reaction`, `mobility`, `movement`, `control`, `battlefield_control`, `defense`, `targeting`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "You can use any of the following actions on your turn: Bodyguard: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Until the end of your next turn, if that target damages you with an attack or Force Power, as a Reaction you can choose to redirect the attack or Force Power to an adjacent follower; the attack or Force Power is resolved against that ally as normal."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Diversion Attack: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "The Best Defense: As a Standard Action, you can make a melee or ranged attack against a target within Range."
- **Beloved** — TALENT `444c032c563c18a1` (Scum and Villainy p.14, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `ally_support`, `support`, `teamwork`, `swift_action`, `standard_action`, `action_economy`, `defense`, `reaction`, `counterattack`, `mobility`, `movement`, `evasion`, `positioning`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Guardian: Choose one ally as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Reprisal: Make a single melee or ranged attack against any target within range as a standard action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "If your attack roll succeeds and that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a reaction."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "To Me!: Spend a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a reaction; this movement does not provoke attacks of opportunity."

### Aquatic Specialists — FEAT `55483fd350b3ba28`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Galaxy at War p.28; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:55483fd350b3ba28|action_economy|A.any_action_cost`
- Current tags: `teamwork`, `swim`, `movement`, `mobility`, `scaling`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Gain +3 competence on Swim checks. At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7. Additionally, swim at half speed as a move action or full speed as a full-round action. Team Feat: +3 Swim, scaling by nearby allies with the same feat to +7, plus a Swim-specific teamwork benefit.

Matching clause(s) (1):

1. Matched: "as a move action", "as a full-round action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > Additionally, swim at half speed as a move action or full speed as a full-round action.

Opposite-domain comparator(s) carrying the tag:

- **Protector Actions** — TALENT `254b51a34600e2ef` (Clone Wars Campaign Guide p.23, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `followers`, `ally_support`, `support`, `teamwork`, `standard_action`, `action_economy`, `melee`, `ranged`, `counterattack`, `reaction`, `mobility`, `movement`, `control`, `battlefield_control`, `defense`, `targeting`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "You can use any of the following actions on your turn: Bodyguard: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Until the end of your next turn, if that target damages you with an attack or Force Power, as a Reaction you can choose to redirect the attack or Force Power to an adjacent follower; the attack or Force Power is resolved against that ally as normal."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Diversion Attack: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "The Best Defense: As a Standard Action, you can make a melee or ranged attack against a target within Range."
- **Beloved** — TALENT `444c032c563c18a1` (Scum and Villainy p.14, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `ally_support`, `support`, `teamwork`, `swift_action`, `standard_action`, `action_economy`, `defense`, `reaction`, `counterattack`, `mobility`, `movement`, `evasion`, `positioning`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Guardian: Choose one ally as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Reprisal: Make a single melee or ranged attack against any target within range as a standard action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "If your attack roll succeeds and that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a reaction."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "To Me!: Spend a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a reaction; this movement does not provoke attacks of opportunity."

### Whirlwind Attack — FEAT `600f43af4edb16f7`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.89; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:600f43af4edb16f7|action_economy|A.any_action_cost`
- Current tags: `melee`, `battlefield_control`, `sustained_damage`, `targeting`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> As a full-round action, make one melee area attack roll and apply it against every target within your reach. Official errata changes the first-printing word 'opponent' to 'target'. Full-round melee area attack against every target within reach using one attack roll.

Matching clause(s) (1):

1. Matched: "As a full-round action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > As a full-round action, make one melee area attack roll and apply it against every target within your reach.

Opposite-domain comparator(s) carrying the tag:

- **Protector Actions** — TALENT `254b51a34600e2ef` (Clone Wars Campaign Guide p.23, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `followers`, `ally_support`, `support`, `teamwork`, `standard_action`, `action_economy`, `melee`, `ranged`, `counterattack`, `reaction`, `mobility`, `movement`, `control`, `battlefield_control`, `defense`, `targeting`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "You can use any of the following actions on your turn: Bodyguard: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Until the end of your next turn, if that target damages you with an attack or Force Power, as a Reaction you can choose to redirect the attack or Force Power to an adjacent follower; the attack or Force Power is resolved against that ally as normal."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Diversion Attack: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "The Best Defense: As a Standard Action, you can make a melee or ranged attack against a target within Range."
- **Beloved** — TALENT `444c032c563c18a1` (Scum and Villainy p.14, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `ally_support`, `support`, `teamwork`, `swift_action`, `standard_action`, `action_economy`, `defense`, `reaction`, `counterattack`, `mobility`, `movement`, `evasion`, `positioning`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Guardian: Choose one ally as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Reprisal: Make a single melee or ranged attack against any target within range as a standard action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "If your attack roll succeeds and that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a reaction."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "To Me!: Spend a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a reaction; this movement does not provoke attacks of opportunity."

### Aiming Accuracy — FEAT `80805c30ea6dd11e`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Scavenger's Guide to Droids p.22; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:80805c30ea6dd11e|action_economy|A.any_action_cost`
- Current tags: `ranged`, `precision`, `targeting`, `setup`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Aim at a target as a full-round action instead of two swift actions. Gain +5 on your next attack in the following round against that target. The target must remain in your line of sight. Spend a full round aiming to gain +5 on your next attack against the same visible target in the following round.

Matching clause(s) (1):

1. Matched: "as a full-round action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > Aim at a target as a full-round action instead of two swift actions.

Opposite-domain comparator(s) carrying the tag:

- **Protector Actions** — TALENT `254b51a34600e2ef` (Clone Wars Campaign Guide p.23, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `followers`, `ally_support`, `support`, `teamwork`, `standard_action`, `action_economy`, `melee`, `ranged`, `counterattack`, `reaction`, `mobility`, `movement`, `control`, `battlefield_control`, `defense`, `targeting`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "You can use any of the following actions on your turn: Bodyguard: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Until the end of your next turn, if that target damages you with an attack or Force Power, as a Reaction you can choose to redirect the attack or Force Power to an adjacent follower; the attack or Force Power is resolved against that ally as normal."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Diversion Attack: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "The Best Defense: As a Standard Action, you can make a melee or ranged attack against a target within Range."
- **Beloved** — TALENT `444c032c563c18a1` (Scum and Villainy p.14, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `ally_support`, `support`, `teamwork`, `swift_action`, `standard_action`, `action_economy`, `defense`, `reaction`, `counterattack`, `mobility`, `movement`, `evasion`, `positioning`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Guardian: Choose one ally as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Reprisal: Make a single melee or ranged attack against any target within range as a standard action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "If your attack roll succeeds and that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a reaction."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "To Me!: Spend a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a reaction; this movement does not provoke attacks of opportunity."

### Feat of Strength — FEAT `9af3ba38a2c671b8`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Legacy Era Campaign Guide p.35; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:9af3ba38a2c671b8|action_economy|A.any_action_cost`
- Current tags: `skills`, `skill_mastery`, `reliability`, `once-per-encounter`, `climb`, `jump`, `swim`, `endurance`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Once per encounter as a full-round action, Take 20 on one Strength check or a Strength-based skill check in which you are trained, even while distracted or threatened. After the first use in an encounter, make a DC 15 Endurance check as a free action. On a successful Endurance check, you may use the feat once more during that encounter. Take 20 on a Strength or trained Strength-based skill check in one full round, with an Endurance check potentially granting a second use.

Matching clause(s) (1):

1. Matched: "as a full-round action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > Once per encounter as a full-round action, Take 20 on one Strength check or a Strength-based skill check in which you are trained, even while distracted or threatened.

Opposite-domain comparator(s) carrying the tag:

- **Protector Actions** — TALENT `254b51a34600e2ef` (Clone Wars Campaign Guide p.23, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `followers`, `ally_support`, `support`, `teamwork`, `standard_action`, `action_economy`, `melee`, `ranged`, `counterattack`, `reaction`, `mobility`, `movement`, `control`, `battlefield_control`, `defense`, `targeting`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "You can use any of the following actions on your turn: Bodyguard: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Until the end of your next turn, if that target damages you with an attack or Force Power, as a Reaction you can choose to redirect the attack or Force Power to an adjacent follower; the attack or Force Power is resolved against that ally as normal."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Diversion Attack: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "The Best Defense: As a Standard Action, you can make a melee or ranged attack against a target within Range."
- **Beloved** — TALENT `444c032c563c18a1` (Scum and Villainy p.14, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `ally_support`, `support`, `teamwork`, `swift_action`, `standard_action`, `action_economy`, `defense`, `reaction`, `counterattack`, `mobility`, `movement`, `evasion`, `positioning`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Guardian: Choose one ally as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Reprisal: Make a single melee or ranged attack against any target within range as a standard action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "If your attack roll succeeds and that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a reaction."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "To Me!: Spend a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a reaction; this movement does not provoke attacks of opportunity."

### Logic Upgrade: Skill Swap — FEAT `d48614f7ae500a5b`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Scavenger's Guide to Droids p.22; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:d48614f7ae500a5b|action_economy|A.any_action_cost`
- Current tags: `skill_substitution`, `skills`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Choose a skill you are not trained in, other than Use the Force. As a full-round action, swap that skill for one trained skill. You lose the original trained skill's benefit while swapped. The swapped-in skill remains untrained: no trained-only options or trained bonus; roll with normal half-level plus ability. If later trained in the selected skill, choose another; repeatable for different skills. Temporarily exchange access to a trained skill for an untrained skill, but the swapped-in skill remains untrained.

Matching clause(s) (1):

1. Matched: "As a full-round action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > As a full-round action, swap that skill for one trained skill.

Opposite-domain comparator(s) carrying the tag:

- **Protector Actions** — TALENT `254b51a34600e2ef` (Clone Wars Campaign Guide p.23, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `followers`, `ally_support`, `support`, `teamwork`, `standard_action`, `action_economy`, `melee`, `ranged`, `counterattack`, `reaction`, `mobility`, `movement`, `control`, `battlefield_control`, `defense`, `targeting`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "You can use any of the following actions on your turn: Bodyguard: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Until the end of your next turn, if that target damages you with an attack or Force Power, as a Reaction you can choose to redirect the attack or Force Power to an adjacent follower; the attack or Force Power is resolved against that ally as normal."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Diversion Attack: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "The Best Defense: As a Standard Action, you can make a melee or ranged attack against a target within Range."
- **Beloved** — TALENT `444c032c563c18a1` (Scum and Villainy p.14, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `ally_support`, `support`, `teamwork`, `swift_action`, `standard_action`, `action_economy`, `defense`, `reaction`, `counterattack`, `mobility`, `movement`, `evasion`, `positioning`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Guardian: Choose one ally as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Reprisal: Make a single melee or ranged attack against any target within range as a standard action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "If your attack roll succeeds and that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a reaction."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "To Me!: Spend a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a reaction; this movement does not provoke attacks of opportunity."

### Metamorph — FEAT `f59c9679c02b8896`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Scum and Villainy p.23; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:f59c9679c02b8896|action_economy|A.any_action_cost`
- Current tags: `defense`, `stealth`, `damage_threshold`, `survivability`, `melee`, `positioning`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Full-round action while using Shapeshift to increase or decrease size by one step; maintain for rounds/day equal Constitution score. Small: +1 Reflex, +5 Stealth, carrying capacity x0.75. Large: -1 Reflex, -5 Stealth, carrying capacity x2, +5 Damage Threshold, reach +1. Use Shapeshift as a full-round action to become one size smaller or larger, gaining the corresponding Reflex/Stealth/carrying/DT/reach changes.

Matching clause(s) (1):

1. Matched: "as a full-round action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > Use Shapeshift as a full-round action to become one size smaller or larger, gaining the corresponding Reflex/Stealth/carrying/DT/reach changes.

Opposite-domain comparator(s) carrying the tag:

- **Protector Actions** — TALENT `254b51a34600e2ef` (Clone Wars Campaign Guide p.23, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `followers`, `ally_support`, `support`, `teamwork`, `standard_action`, `action_economy`, `melee`, `ranged`, `counterattack`, `reaction`, `mobility`, `movement`, `control`, `battlefield_control`, `defense`, `targeting`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "You can use any of the following actions on your turn: Bodyguard: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Until the end of your next turn, if that target damages you with an attack or Force Power, as a Reaction you can choose to redirect the attack or Force Power to an adjacent follower; the attack or Force Power is resolved against that ally as normal."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Diversion Attack: As a Standard Action, you can make a melee or ranged attack against a target within Range."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "The Best Defense: As a Standard Action, you can make a melee or ranged attack against a target within Range."
- **Beloved** — TALENT `444c032c563c18a1` (Scum and Villainy p.14, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `once-per-encounter`, `ally_support`, `support`, `teamwork`, `swift_action`, `standard_action`, `action_economy`, `defense`, `reaction`, `counterattack`, `mobility`, `movement`, `evasion`, `positioning`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Guardian: Choose one ally as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Reprisal: Make a single melee or ranged attack against any target within range as a standard action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "If your attack roll succeeds and that target attacks you before the end of your next turn, one ally within 6 squares can make an attack against that target as a reaction."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "To Me!: Spend a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Whenever you take any damage before the beginning of your next turn, each ally within line of sight can move 2 squares as a reaction; this movement does not provoke attacks of opportunity."

### Infuse Weapon — TALENT `0df15b0ea7721c50`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.93; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:0df15b0ea7721c50|action_economy|A.any_action_cost`
- Current tags: `force`, `force_point_spend`, `resource_spend`, `empowerment`, `weapon_empowerment`, `equipment`, `melee`, `damage_reduction`, `durability`, `damage_bonus`, `sustained_damage`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> You can spend a Force Point to infuse an unpowered melee weapon (one that does not require an energy cell) with the strength of the Force, making it resistant to the attacks of other weapons. Infusing the weapon takes a full-round action. From that point forward, when you wield the weapon, its damage reduction is doubled, and lightsabers do not ignore the weapon's damage reduction. When you spend a Force Point to modify the attack roll of an infused weapon, you also add 2 x the Force Point's result to the damage roll if the attack is a success.

Matching clause(s) (1):

1. Matched: "takes a full-round action" — syntax labels: CHARACTER_SPENDS_OR_COSTS_ACTION, FULL_ROUND_ACTION_WORDING
   > Infusing the weapon takes a full-round action.

Opposite-domain comparator(s) carrying the tag:

- **Close Combat Escape** — FEAT `1ec2b64343aca60e` (Scum and Villainy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `acrobatics`, `grapple`, `evasion`, `swift_action`, `action_economy`, `melee`, `unarmed`, `setup`, `control`
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "After successfully using Acrobatics to escape a grapple, spend a swift action to make one melee or unarmed attack against the former grappler."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "Escape a grapple with Acrobatics, then spend a swift action for a melee/unarmed counterattack that can leave the former grappler flat-footed."
- **Bad Feeling** — FEAT `37aa58a3833bf34a` (The Force Unleashed Campaign Guide p.32, FEAT_CANONICAL_RULES_SHAPE); tags: `surprise_round`, `move_action`, `action_economy`, `movement`, `mobility`, `ambush_defense`, `initiative`
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION, CHARACTER_MAY_TAKE_ACTION — "You may always take a move action during a surprise round, even if surprised."

### Planetary Attunement — TALENT `1204459eaaff9efa`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.75; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:1204459eaaff9efa|action_economy|A.any_action_cost`
- Current tags: `force`, `force_point_spend`, `resource_spend`, `exploration`, `survival`, `nature`, `defense`, `mobility`, `senses`, `precognition`, `planning`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Whenever you arrive on a new planet, you can spend 10 minutes and a Force Point to acclimate yourself to the planet's unique ebb and flow of Force energy. While on the planet, you gain a +2 Force bonus to all defenses against naturally occurring hazards on the world, your speed increases by 1 square, and you can sense what the weather will be like in the immediate area up to 24 hours in advance as a full-round action.

Matching clause(s) (1):

1. Matched: "as a full-round action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > While on the planet, you gain a +2 Force bonus to all defenses against naturally occurring hazards on the world, your speed increases by 1 square, and you can sense what the weather will be like in the immediate area up to 24 hours in advance as a full-round action.

Opposite-domain comparator(s) carrying the tag:

- **Silver Tongue** — FEAT `8ff15069dbf6270d` (Galaxy of Intrigue p.29, FEAT_CANONICAL_RULES_SHAPE); tags: `persuasion`, `intimidation`, `social`, `manipulation`, `standard_action`, `action_economy`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING, FULL_ROUND_ACTION_WORDING — "Intimidate a creature or Change Attitude as a standard action instead of the normal full-round action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING — "Intimidate or Change Attitude as a standard action."
- **Pincer** — FEAT `09d4eedfce05c6a3` (Scavenger's Guide to Droids p.24, FEAT_CANONICAL_RULES_SHAPE); tags: `grapple`, `restrain`, `swift_action`, `action_economy`, `sustained_damage`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Make later grapple checks against the pinned enemy as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Maintain a Pin and make later grapple checks as a swift action, applying Crush on successful checks."

### Turn the Tide — TALENT `4a3fdcd0f32062b2`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Unknown Regions p.31; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:4a3fdcd0f32062b2|action_economy|A.any_action_cost`
- Current tags: `tactics`, `knowledge`, `skills`, `initiative`, `control`, `battlefield_control`, `planning`, `once-per-encounter`, `reroll`, `ally_support`, `support`, `teamwork`, `reliability`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Once per encounter, after the first round of combat, make a Knowledge (tactics) check as a full-round action and compare the result to the Will Defense of all enemies within 12 squares and line of sight. Affected enemies must reroll Initiative at the start of the next round. Allies within your line of sight can choose whether to reroll. Rerolls and other Initiative modifiers apply normally.

Matching clause(s) (1):

1. Matched: "as a full-round action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > Once per encounter, after the first round of combat, make a Knowledge (tactics) check as a full-round action and compare the result to the Will Defense of all enemies within 12 squares and line of sight.

Opposite-domain comparator(s) carrying the tag:

- **Silver Tongue** — FEAT `8ff15069dbf6270d` (Galaxy of Intrigue p.29, FEAT_CANONICAL_RULES_SHAPE); tags: `persuasion`, `intimidation`, `social`, `manipulation`, `standard_action`, `action_economy`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING, FULL_ROUND_ACTION_WORDING — "Intimidate a creature or Change Attitude as a standard action instead of the normal full-round action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING — "Intimidate or Change Attitude as a standard action."
- **Pincer** — FEAT `09d4eedfce05c6a3` (Scavenger's Guide to Droids p.24, FEAT_CANONICAL_RULES_SHAPE); tags: `grapple`, `restrain`, `swift_action`, `action_economy`, `sustained_damage`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Make later grapple checks against the pinned enemy as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Maintain a Pin and make later grapple checks as a swift action, applying Crush on successful checks."

### Bomb Thrower — TALENT `959f16cb707d8360`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Galaxy of Intrigue p.21; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:959f16cb707d8360|action_economy|A.any_action_cost`
- Current tags: `mechanics`, `skills`, `crafting`, `equipment`, `tech`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> You are skilled in making and handling impromptu explosives. You gain a +5 bonus to Mechanics checks for the purposes of handling explosives. In addition, you can spend a full-round action to craft the equivalent of a frag grenade from spare parts you have on hand. You must have access to the appropriate supplies, such as an old blaster, a toolkit, or materials found inside a hangar bay.

Matching clause(s) (1):

1. Matched: "spend a full-round action" — syntax labels: CHARACTER_SPENDS_OR_COSTS_ACTION, FULL_ROUND_ACTION_WORDING
   > In addition, you can spend a full-round action to craft the equivalent of a frag grenade from spare parts you have on hand.

Opposite-domain comparator(s) carrying the tag:

- **Close Combat Escape** — FEAT `1ec2b64343aca60e` (Scum and Villainy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `acrobatics`, `grapple`, `evasion`, `swift_action`, `action_economy`, `melee`, `unarmed`, `setup`, `control`
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "After successfully using Acrobatics to escape a grapple, spend a swift action to make one melee or unarmed attack against the former grappler."
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION — "Escape a grapple with Acrobatics, then spend a swift action for a melee/unarmed counterattack that can leave the former grappler flat-footed."
- **Bad Feeling** — FEAT `37aa58a3833bf34a` (The Force Unleashed Campaign Guide p.32, FEAT_CANONICAL_RULES_SHAPE); tags: `surprise_round`, `move_action`, `action_economy`, `movement`, `mobility`, `ambush_defense`, `initiative`
  - labels: CHARACTER_SPENDS_OR_COSTS_ACTION, CHARACTER_MAY_TAKE_ACTION — "You may always take a move action during a surprise round, even if surprised."

### Dull the Pain — TALENT `d32459fe16029f2a`

- Detector: A.any_action_cost (HIGH); compared tag `action_economy`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.102; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:d32459fe16029f2a|action_economy|A.any_action_cost`
- Current tags: `treat_injury`, `medicine`, `medical`, `recovery`, `condition_removal`, `ally_support`, `support`, `skills`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> As a full-round action, you can make a DC 15 Treat Injury check on an adjacent living creature to move it +1 step along the condition track.

Matching clause(s) (1):

1. Matched: "As a full-round action" — syntax labels: ACTION_TYPE_STATED_AS_ACTIVATION, FULL_ROUND_ACTION_WORDING
   > As a full-round action, you can make a DC 15 Treat Injury check on an adjacent living creature to move it +1 step along the condition track.

Opposite-domain comparator(s) carrying the tag:

- **Silver Tongue** — FEAT `8ff15069dbf6270d` (Galaxy of Intrigue p.29, FEAT_CANONICAL_RULES_SHAPE); tags: `persuasion`, `intimidation`, `social`, `manipulation`, `standard_action`, `action_economy`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING, FULL_ROUND_ACTION_WORDING — "Intimidate a creature or Change Attitude as a standard action instead of the normal full-round action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION, ACTION_TYPE_MODIFIES_TIMING — "Intimidate or Change Attitude as a standard action."
- **Pincer** — FEAT `09d4eedfce05c6a3` (Scavenger's Guide to Droids p.24, FEAT_CANONICAL_RULES_SHAPE); tags: `grapple`, `restrain`, `swift_action`, `action_economy`, `sustained_damage`
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Make later grapple checks against the pinned enemy as a swift action."
  - labels: ACTION_TYPE_STATED_AS_ACTIVATION — "Maintain a Pin and make later grapple checks as a swift action, applying Crush on successful checks."

## B.reroll → `reliability` (2)

### Visionary Defense — TALENT `153f4b3c6510023d`

- Detector: B.reroll (HIGH); compared tag `reliability`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.25; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:153f4b3c6510023d|reliability|bundle:reroll>reliability`; surfaced by cross-domain bundle `reroll`
- Current tags: `force`, `force_power_synergy`, `visions`, `use_the_force`, `reaction`, `action_economy`, `ally_support`, `support`, `teamwork`, `defense`, `melee_defense`, `ranged_defense`, `will_defense`, `resource_spend`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> As a reaction, you can make a Use the Force check after you or an ally within 12 squares is the target of a melee or ranged attack (but before the results of the attack roll are known), removing one use of the farseeing Force power from your active suite (as though you had just activated the power). If your check result exceeds the Will Defense of the attacker, you grant the target of the attack a +5 Force bonus to Reflex Defense against that attack. This counts as using the farseeing Force power against the attacker, but this talent replaces the normal rules and effect of that power. Any attack can only be affected by this talent once (thus, multiple characters cannot use this talent on the same attack to allow multiple rerolls). You take a cumulative -5 penalty on Use the Force checks until the beginning of your next turn when you use this talent.

Matching clause(s) (1):

1. Matched: "reroll" — syntax labels: —
   > Any attack can only be affected by this talent once (thus, multiple characters cannot use this talent on the same attack to allow multiple rerolls).

Opposite-domain comparator(s) carrying the tag:

- **Conditioning** — FEAT `0ac76f1c0c1677cb` (Knights of the Old Republic Campaign Guide p.32, FEAT_CANONICAL_RULES_SHAPE); tags: `reroll`, `reliability`, `skills`, `defense`, `reaction`, `action_economy`, `once-per-encounter`, `resilience`, `climb`, `jump`, `swim`, `endurance`
  - labels: — — "Reroll any Strength- or Constitution-based skill check for a skill in which you are trained; accept the second result."
  - labels: — — "Reroll trained Strength/Constitution-based skills and once per encounter add Strength bonus to Fortitude as a reaction."
- **Cut the Red Tape** — FEAT `2bb34366776f0371` (Galaxy of Intrigue p.27, FEAT_CANONICAL_RULES_SHAPE); tags: `knowledge`, `gather_information`, `skill_substitution`, `skills`, `reroll`, `reliability`
  - labels: — — "If entitled to a Gather Information reroll, reroll the substituted Knowledge check under the same restrictions."
  - labels: — — "Use Knowledge (Bureaucracy) for Gather Information, including eligible rerolls, and count as trained for the substituted check."

### Visionary Defense — TALENT `153f4b3c6510023d`

- Detector: B.reroll (HIGH); compared tag `reroll`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.25; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:153f4b3c6510023d|reroll|B.reroll`
- Current tags: `force`, `force_power_synergy`, `visions`, `use_the_force`, `reaction`, `action_economy`, `ally_support`, `support`, `teamwork`, `defense`, `melee_defense`, `ranged_defense`, `will_defense`, `resource_spend`
- Implication rule(s) that would apply if the owner later authorizes the tag: reroll -> reliability (`reliability` currently absent)

Complete canonical mechanic text used by the detector:

> As a reaction, you can make a Use the Force check after you or an ally within 12 squares is the target of a melee or ranged attack (but before the results of the attack roll are known), removing one use of the farseeing Force power from your active suite (as though you had just activated the power). If your check result exceeds the Will Defense of the attacker, you grant the target of the attack a +5 Force bonus to Reflex Defense against that attack. This counts as using the farseeing Force power against the attacker, but this talent replaces the normal rules and effect of that power. Any attack can only be affected by this talent once (thus, multiple characters cannot use this talent on the same attack to allow multiple rerolls). You take a cumulative -5 penalty on Use the Force checks until the beginning of your next turn when you use this talent.

Matching clause(s) (1):

1. Matched: "reroll" — syntax labels: —
   > Any attack can only be affected by this talent once (thus, multiple characters cannot use this talent on the same attack to allow multiple rerolls).

Opposite-domain comparator(s) carrying the tag:

- **Conditioning** — FEAT `0ac76f1c0c1677cb` (Knights of the Old Republic Campaign Guide p.32, FEAT_CANONICAL_RULES_SHAPE); tags: `reroll`, `reliability`, `skills`, `defense`, `reaction`, `action_economy`, `once-per-encounter`, `resilience`, `climb`, `jump`, `swim`, `endurance`
  - labels: — — "Reroll any Strength- or Constitution-based skill check for a skill in which you are trained; accept the second result."
  - labels: — — "Reroll trained Strength/Constitution-based skills and once per encounter add Strength bonus to Fortitude as a reaction."
- **Cut the Red Tape** — FEAT `2bb34366776f0371` (Galaxy of Intrigue p.27, FEAT_CANONICAL_RULES_SHAPE); tags: `knowledge`, `gather_information`, `skill_substitution`, `skills`, `reroll`, `reliability`
  - labels: — — "If entitled to a Gather Information reroll, reroll the substituted Knowledge check under the same restrictions."
  - labels: — — "Use Knowledge (Bureaucracy) for Gather Information, including eligible rerolls, and count as trained for the substituted check."

## B.roll_twice_keep → `reliability` (1)

### Force of Personality — FEAT `baff0da30d0bc8ee`

- Detector: B.roll_twice_keep (MEDIUM); compared tag `reliability`; compared tag currently present: **false**
- Source: Galaxy at War p.23; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:baff0da30d0bc8ee|reliability|B.roll_twice_keep`
- Current tags: `will_defense`, `defense`, `ability_enhancement`, `resilience`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Use either Wisdom modifier or Charisma modifier to determine Will Defense. Use the better applicable Wisdom or Charisma modifier for Will Defense.

Matching clause(s) (1):

1. Matched: "Use the better" — syntax labels: —
   > Use the better applicable Wisdom or Charisma modifier for Will Defense.

Opposite-domain comparator(s) carrying the tag:

- **Illicit Dealings** — TALENT `0681e1ea8e72f362` (Force Unleashed Campaign Guide p.27, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `persuasion`, `social`, `skills`, `resources`, `reroll`, `reliability`
  - labels: — — "When using Persuasion to haggle for restricted, military, or illegal goods you may roll twice, keeping the better result."
- **Focused Attack** — TALENT `2fc019fa8c4108a7` (Clone Wars Campaign Guide p.53, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `force`, `light_side`, `dark_side`, `force_point_spend`, `resource_spend`, `reroll`, `reliability`, `precision`
  - labels: — — "You can spend a Force Point to reroll an attack against a creature with a Dark Side Score of 1 or higher, keeping the better of the two rolls."

## B.take_10_20 → `reliability` (3)

### Damage Conversion — FEAT `1f404db00518aeed`

- Detector: B.take_10_20 (MEDIUM); compared tag `reliability`; compared tag currently present: **false**
- Source: Scavenger's Guide to Droids p.22; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:1f404db00518aeed|reliability|B.take_10_20`
- Current tags: `damage_threshold`, `resilience`, `survivability`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> When a non-area, non-ion, non-Force attack meets or exceeds your damage threshold, take 10 additional damage instead of moving down the condition track. Each later use in the same encounter increases the additional damage by 5. Trade a condition-track step from a qualifying hit for extra damage, increasing the extra damage with repeated use.

Matching clause(s) (1):

1. Matched: "take 10" — syntax labels: —
   > When a non-area, non-ion, non-Force attack meets or exceeds your damage threshold, take 10 additional damage instead of moving down the condition track.

Opposite-domain comparator(s) carrying the tag:

- **Full Throttle** — TALENT `34ff9dc64050028d` (Saga Edition Core Rulebook p.207, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `vehicle`, `pilot`, `skills`, `mobility`, `movement`, `pursuit`, `reliability`
  - labels: — — "You can take 10 on Pilot checks made to increase your vehicle's speed."
- **Enhanced Manipulation** — TALENT `37cdbac0dee1b93a` (Force Unleashed Campaign Guide p.47, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `skills`, `skill_mastery`, `reliability`
  - labels: — — "You can take 10 when making any Dexterity-based skill check, even if you are threatened or would not normally be able to take 10."

### Biotech Specialist — FEAT `bf6c01fa590a3f75`

- Detector: B.take_10_20 (MEDIUM); compared tag `reliability`; compared tag currently present: **false**
- Source: Legacy Era Campaign Guide p.34; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:bf6c01fa590a3f75|reliability|B.take_10_20`
- Current tags: `biotech`, `tech`, `mechanics`, `modification`, `equipment`, `armor`, `vehicle`, `weapon_empowerment`, `ability_enhancement`, `durability`, `skills`, `mobility`, `treat_injury`, `medical`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Modify Yuuzhan Vong biotech devices, armor, weapons, or vehicles with one of the printed biotech traits. Only one modification may be performed at a time; normal one-benefit-per-item and no-duplicate-benefit limits apply unless noted otherwise. Pay one-tenth item cost or 1,000 credits, whichever is more; modification time is one day per 1,000 credits. Make a DC 20 Mechanics check; Take 10/20 is not allowed; failure loses the spent credits but allows another attempt. Only other characters with Biotech Specialist may assist; assistance can reduce time and aid the final Mechanics check. Modified market value equals base cost plus twice successful modification cost. Nobles and scoundrels may add the feat to their bonus-feat lists. The feat removes the -5 Treat Injury penalty for biotechnology. Use Mechanics to perform Tech-Specialist-style custom upgrades on Yuuzhan Vong biotechnology, with its own assistance and biotech rules.

Matching clause(s) (1):

1. Matched: "Take 10" — syntax labels: —
   > Make a DC 20 Mechanics check; Take 10/20 is not allowed; failure loses the spent credits but allows another attempt.

Opposite-domain comparator(s) carrying the tag:

- **Full Throttle** — TALENT `34ff9dc64050028d` (Saga Edition Core Rulebook p.207, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `vehicle`, `pilot`, `skills`, `mobility`, `movement`, `pursuit`, `reliability`
  - labels: — — "You can take 10 on Pilot checks made to increase your vehicle's speed."
- **Enhanced Manipulation** — TALENT `37cdbac0dee1b93a` (Force Unleashed Campaign Guide p.47, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `skills`, `skill_mastery`, `reliability`
  - labels: — — "You can take 10 when making any Dexterity-based skill check, even if you are threatened or would not normally be able to take 10."

### Electronic Sabotage — TALENT `0290634450ab1637`

- Detector: B.take_10_20 (MEDIUM); compared tag `reliability`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.27; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:0290634450ab1637|reliability|B.take_10_20`
- Current tags: `use_computer`, `slicing`, `tech`, `skills`, `standard_action`, `action_economy`, `control`, `network`, `infiltration`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> You excel at causing havoc with computers and electronics. As a standard action, you can lock down a computer terminal by making a Use Computer check, making it potentially difficult for anyone else to access. That computer is considered unfriendly to anyone other than you who attempts to use it, and the result of your Use Computer check replaces the computer's Will Defense on an attempt to change its attitude. This effect ends if anyone else succeeds in adjusting the computer's attitude to indifferent. You cannot take 20 on this Use Computer check.

Matching clause(s) (1):

1. Matched: "take 20" — syntax labels: —
   > You cannot take 20 on this Use Computer check.

Opposite-domain comparator(s) carrying the tag:

- **Wary Sentries** — FEAT `0053d97632b02e4a` (Galaxy at War p.30, FEAT_CANONICAL_RULES_SHAPE); tags: `teamwork`, `perception`, `awareness`, `scaling`, `reliability`
  - labels: — — "Additionally, take 10 on Perception checks even when threatened or rushed."
- **Signature Device** — FEAT `313095ada7504547` (Scum and Villainy p.24, FEAT_CANONICAL_RULES_SHAPE); tags: `tech`, `mechanics`, `modification`, `equipment`, `reliability`
  - labels: — — "You may Take 10 on Mechanics checks to modify it."
  - labels: — — "Designate one signature item, Take 10 on its Tech Specialist modifications, install two traits, and switch the active trait as a swift action."

## B.automatic_success

No unresolved entries.

## C.force_point_spend → `force_point_spend` (12)

### Past Visions — TALENT `462df9a631ee50f4`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.58; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:462df9a631ee50f4|force_point_spend|C.force_point_spend`
- Current tags: `force`, `force_power_synergy`, `use_the_force`, `visions`, `senses`, `investigation`, `recon`, `exploration`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently absent)

Complete canonical mechanic text used by the detector:

> The long-lived Draethos are particularly adept at searching and understanding the past. When using farseeing to look into the past, reduce your DC numbers by half. Also, you are able to see everything within 6 squares of your target clearly without spending a Force Point.

Matching clause(s) (1):

1. Matched: "spending a Force Point" — syntax labels: RESOURCE_SPENT, EFFECT_WITHOUT_SPENDING_THE_RESOURCE
   > Also, you are able to see everything within 6 squares of your target clearly without spending a Force Point.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Surge of Light — TALENT `8223d30bfce0c14d`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Clone Wars Campaign Guide p.53; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:8223d30bfce0c14d|force_point_spend|C.force_point_spend`
- Current tags: `force`, `light_side`, `force_power_synergy`, `force_capacity`, `resource_recovery`, `recovery`, `swift_action`, `action_economy`, `once-per-encounter`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently absent)

Complete canonical mechanic text used by the detector:

> Once per encounter, as a swift action, you can return any Force power with the [light side] descriptor to your suite without spending a Force Point. You can select this talent multiple times. Each time you select it, you can use this talent one additional time per encounter.

Matching clause(s) (1):

1. Matched: "spending a Force Point" — syntax labels: RESOURCE_SPENT, EFFECT_WITHOUT_SPENDING_THE_RESOURCE
   > Once per encounter, as a swift action, you can return any Force power with the [light side] descriptor to your suite without spending a Force Point.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Telekinetic Vigilance — TALENT `8ddbbeb09758295d`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.91; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:8ddbbeb09758295d|force_point_spend|C.force_point_spend`
- Current tags: `force`, `force_power_synergy`, `telekinesis`, `force_capacity`, `resource_recovery`, `swift_action`, `action_economy`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently absent)

Complete canonical mechanic text used by the detector:

> You can return the intercept Force power to your Force suite as a swift action without spending a Force Point.

Matching clause(s) (1):

1. Matched: "spending a Force Point" — syntax labels: RESOURCE_SPENT, EFFECT_WITHOUT_SPENDING_THE_RESOURCE
   > You can return the intercept Force power to your Force suite as a swift action without spending a Force Point.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### WatchCircle Initiate — TALENT `ab9f1497d0b2d7c2`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.25; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:ab9f1497d0b2d7c2|force_point_spend|C.force_point_spend`
- Current tags: `force`, `force_power_synergy`, `visions`, `use_the_force`, `reaction`, `action_economy`, `ally_support`, `support`, `teamwork`, `force_support`, `force_capacity`, `resources`, `resource_spend`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently present)

Complete canonical mechanic text used by the detector:

> As a reaction, you can make a Use the Force check (DC 15) and remove one use of the farseeing Force power from your active suite (as though you had activated the power). You subtract 1 from your Force Point total (this cannot be subtracted from temporary Force Points, and does not count as spending a Force Point) and add 1 to the Force Point total of an ally within line of sight. This counts as using the farseeing Force power against that target, but this talent replaces the normal rules and effect of that power.

Matching clause(s) (1):

1. Matched: "spending a Force Point" — syntax labels: RESOURCE_SPENT
   > You subtract 1 from your Force Point total (this cannot be subtracted from temporary Force Points, and does not count as spending a Force Point) and add 1 to the Force Point total of an ally within line of sight.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Force Flow — TALENT `b0898acb0a19a3cd`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.52; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:b0898acb0a19a3cd|force_point_spend|C.force_point_spend`
- Current tags: `force`, `resources`, `force_capacity`, `use_the_force`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently absent)

Complete canonical mechanic text used by the detector:

> For reasons unknown to you, the Living Force flows through you in an irregular fashion. Whenever you roll a natural 1 on an attack roll or Use the Force check, you gain one temporary Force Point. If you do not spend this Force Point before the end of the encounter, it is lost.

Matching clause(s) (1):

1. Matched: "spend this Force Point" — syntax labels: RESOURCE_SPENT, SPENDING_PREVENTED_OR_REDUCED
   > If you do not spend this Force Point before the end of the encounter, it is lost.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Dark Side Savant — TALENT `b47beb909e6fce63`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.16; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:b47beb909e6fce63|force_point_spend|C.force_point_spend`
- Current tags: `force`, `dark_side`, `force_power_synergy`, `force_capacity`, `resource_recovery`, `recovery`, `swift_action`, `action_economy`, `once-per-encounter`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently absent)

Complete canonical mechanic text used by the detector:

> Once per encounter as a swift action, you can return one Force power with the [dark side] descriptor to your Force suite without spending a Force Point. You can select this talent multiple times. Each time you select it, you can use it one additional time per encounter.

Matching clause(s) (1):

1. Matched: "spending a Force Point" — syntax labels: RESOURCE_SPENT, EFFECT_WITHOUT_SPENDING_THE_RESOURCE
   > Once per encounter as a swift action, you can return one Force power with the [dark side] descriptor to your Force suite without spending a Force Point.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Influence Savant — TALENT `ced81064716debaa`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.15; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:ced81064716debaa|force_point_spend|C.force_point_spend`
- Current tags: `force`, `force_power_synergy`, `mind-affecting`, `force_capacity`, `resource_recovery`, `recovery`, `swift_action`, `action_economy`, `once-per-encounter`, `scaling`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently absent)

Complete canonical mechanic text used by the detector:

> Once per encounter as a swift action, you can return one Force power with the [mind-affecting] descriptor to your Force suite without spending a Force Point. You can select this talent multiple times. Each time you select it, you can use it one additional time per encounter.

Matching clause(s) (1):

1. Matched: "spending a Force Point" — syntax labels: RESOURCE_SPENT, EFFECT_WITHOUT_SPENDING_THE_RESOURCE
   > Once per encounter as a swift action, you can return one Force power with the [mind-affecting] descriptor to your Force suite without spending a Force Point.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Surrender to the Current — TALENT `d1ced133cee0a6fa`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.77; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:d1ced133cee0a6fa|force_point_spend|C.force_point_spend`
- Current tags: `force`, `force_power_synergy`, `force_capacity`, `resource_recovery`, `recovery`, `swift_action`, `action_economy`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently absent)

Complete canonical mechanic text used by the detector:

> As a swift action, you can choose to sur-render to the White Current and allow it to flow around you and fuel your Force powers. Until the end of the encounter, you cannot use Force powers that do not have "You" as the sole target. However, once per turn as a swift action, you can recover one spent Force power that has “You" as the sole target without spending a Force Point, adding that power back to your Force suite.

Matching clause(s) (1):

1. Matched: "spending a Force Point" — syntax labels: RESOURCE_SPENT, EFFECT_WITHOUT_SPENDING_THE_RESOURCE, RESOURCE_RECOVERED_OR_REGAINED
   > However, once per turn as a swift action, you can recover one spent Force power that has “You" as the sole target without spending a Force Point, adding that power back to your Force suite.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Telekinetic Savant — TALENT `ddacb8e4517da6b5`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.100; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:ddacb8e4517da6b5|force_point_spend|C.force_point_spend`
- Current tags: `force`, `force_power_synergy`, `telekinesis`, `force_capacity`, `resource_recovery`, `recovery`, `swift_action`, `action_economy`, `once-per-encounter`, `scaling`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently absent)

Complete canonical mechanic text used by the detector:

> Once per encounter as a swift action, you may return one of the following Force powers to your suite without spending a Force Point: Force disarm, Force grip, Force slam, Force thrust, or move object. You may select this talent multiple times; each time you select it, you may use it one additional time per encounter.

Matching clause(s) (1):

1. Matched: "spending a Force Point" — syntax labels: RESOURCE_SPENT, EFFECT_WITHOUT_SPENDING_THE_RESOURCE
   > Once per encounter as a swift action, you may return one of the following Force powers to your suite without spending a Force Point: Force disarm, Force grip, Force slam, Force thrust, or move object.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Sheltering Stance — TALENT `f541b5e57c5af27e`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.40; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:f541b5e57c5af27e|force_point_spend|C.force_point_spend`
- Current tags: `force`, `block`, `deflect`, `ally_support`, `support`, `teamwork`, `defense`, `melee_defense`, `ranged_defense`, `positioning`, `force_support`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently absent)

Complete canonical mechanic text used by the detector:

> Whenever you are adjacent to an ally, you may use the Block or Deflect talents on attacks that target that ally without the need to spend a Force Point.

Matching clause(s) (1):

1. Matched: "spend a Force Point" — syntax labels: RESOURCE_SPENT
   > Whenever you are adjacent to an ally, you may use the Block or Deflect talents on attacks that target that ally without the need to spend a Force Point.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Wrath of the Dark Side — TALENT `f5ebaf5d77257e0c`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.88; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:f5ebaf5d77257e0c|force_point_spend|C.force_point_spend`
- Current tags: `force`, `dark_side`, `force_power_synergy`, `critical_success`, `damage_bonus`, `burst_damage`, `sustained_damage`, `force_offense`, `force_multiplier`, `scaling`, `use_the_force`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently absent)

Complete canonical mechanic text used by the detector:

> When you roll a natural 20 on a Use the Force check to activate a Force power that directly deals damage to a target, you can choose not to regain all of your spent Force powers as normal and instead the targets damaged by the power take half that damage again at the start of their next turn. Only powers that directly damage the target are subject to this talent, including corruption, Force blast, Force grip, Force lightning, Force slam, Force storm, Force thrust (only when spending a Force Point), and repulse (only when spending a Force Point).

Matching clause(s) (1):

1. Matched: "spending a Force Point", "spending a Force Point" — syntax labels: RESOURCE_SPENT
   > Only powers that directly damage the target are subject to this talent, including corruption, Force blast, Force grip, Force lightning, Force slam, Force storm, Force thrust (only when spending a Force Point), and repulse (only when spending a Force Point).

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Lightsaber Form Savant — TALENT `fcc6357b5b33dbb7`

- Detector: C.force_point_spend (HIGH); compared tag `force_point_spend`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.19; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:fcc6357b5b33dbb7|force_point_spend|C.force_point_spend`
- Current tags: `force`, `force_power_synergy`, `lightsaber`, `melee`, `force_capacity`, `resource_recovery`, `recovery`, `swift_action`, `action_economy`, `once-per-encounter`
- Implication rule(s) that would apply if the owner later authorizes the tag: force_point_spend -> resource_spend (`resource_spend` currently absent)

Complete canonical mechanic text used by the detector:

> Once per encounter as a swift action, you can return any one spent Force power with the [lightsaber form] descriptor to your Force suite without spending a Force Point. You can select this talent multiple times, Each time you select it, you can use it one additional time per encounter.

Matching clause(s) (1):

1. Matched: "spending a Force Point" — syntax labels: RESOURCE_SPENT, EFFECT_WITHOUT_SPENDING_THE_RESOURCE
   > Once per encounter as a swift action, you can return any one spent Force power with the [lightsaber form] descriptor to your Force suite without spending a Force Point.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

## C.resource_spend → `resource_spend` (3)

### Force Flow — TALENT `b0898acb0a19a3cd`

- Detector: C.resource_spend (MEDIUM); compared tag `resource_spend`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.52; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:b0898acb0a19a3cd|resource_spend|C.resource_spend`
- Current tags: `force`, `resources`, `force_capacity`, `use_the_force`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> For reasons unknown to you, the Living Force flows through you in an irregular fashion. Whenever you roll a natural 1 on an attack roll or Use the Force check, you gain one temporary Force Point. If you do not spend this Force Point before the end of the encounter, it is lost.

Matching clause(s) (1):

1. Matched: "spend this Force Point" — syntax labels: RESOURCE_SPENT, SPENDING_PREVENTED_OR_REDUCED
   > If you do not spend this Force Point before the end of the encounter, it is lost.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Suppress Force — TALENT `ec3e6a05561ddc07`

- Detector: C.resource_spend (MEDIUM); compared tag `resource_spend`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.15; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:ec3e6a05561ddc07|resource_spend|C.resource_spend`
- Current tags: `force`, `use_the_force`, `force_power_synergy`, `mind-affecting`, `reaction`, `action_economy`, `control`, `battlefield_control`, `opposed_check`, `anti-force`, `targeting`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> You can convince others that they have been cut off from the Force, even if that is not the case, preventing them from making Use the Force checks. Whenever a target with an Intelligence of 3 or higher within 12 squares of you and in your line of sight attempts to make a Use the Force check for any reason, you can spend one use of the mind trick Force power as a reaction. You make a Use the Force check, and if your Use the Force check equals or exceeds the target's Use the Force check result, that target's skill check is negated, and the action it was attempting fails.

Matching clause(s) (1):

1. Matched: "spend one use of the mind trick Force power" — syntax labels: RESOURCE_SPENT
   > Whenever a target with an Intelligence of 3 or higher within 12 squares of you and in your line of sight attempts to make a Use the Force check for any reason, you can spend one use of the mind trick Force power as a reaction.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

### Sheltering Stance — TALENT `f541b5e57c5af27e`

- Detector: C.resource_spend (MEDIUM); compared tag `resource_spend`; compared tag currently present: **false**
- Source: Knights of the Old Republic Campaign Guide p.40; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:f541b5e57c5af27e|resource_spend|C.resource_spend`
- Current tags: `force`, `block`, `deflect`, `ally_support`, `support`, `teamwork`, `defense`, `melee_defense`, `ranged_defense`, `positioning`, `force_support`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Whenever you are adjacent to an ally, you may use the Block or Deflect talents on attacks that target that ally without the need to spend a Force Point.

Matching clause(s) (1):

1. Matched: "spend a Force Point" — syntax labels: RESOURCE_SPENT
   > Whenever you are adjacent to an ally, you may use the Block or Deflect talents on attacks that target that ally without the need to spend a Force Point.

Opposite-domain comparator(s) carrying the tag:

- **Rapid Assault** — FEAT `4be60753991eec43` (Saga Edition FAQ — Official Optional Rules p.e2, FEAT_CANONICAL_RULES_SHAPE); tags: `dual_wield`, `sustained_damage`, `standard_action`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action."
  - labels: RESOURCE_SPENT — "Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties."
- **Turn and Burn** — FEAT `6342effd242f0b61` (Scavenger's Guide to Droids p.25, FEAT_CANONICAL_RULES_SHAPE); tags: `movement`, `mobility`, `attack_of_opportunity`, `evasion`, `reaction`, `action_economy`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw."
  - labels: RESOURCE_SPENT — "Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent."

## C.resource_recovery → `resource_recovery` (5)

### Skillful Recovery — TALENT `323cc243fef47675`

- Detector: C.resource_recovery (MEDIUM); compared tag `resource_recovery`; compared tag currently present: **false**
- Source: Galaxy of Intrigue p.21; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:323cc243fef47675|resource_recovery|C.resource_recovery`
- Current tags: `skills`, `skill_mastery`, `force-point`, `force_capacity`, `resources`, `setup`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> When you select this talent, choose one skill. Whenever you fail a skill check with that skill, you gain one temporary Force Point. That Force Point can only be spent to add to a skill check with the skill you chose for this talent. If the Force Point is not spent by the end of the encounter, it is lost. For the purposes of this talent, failing a skill check means failing to get the minimum possible result from the skill check. You can select this talent multiple times. Each time you do so, you must choose a different skill to gain the benefits of this talent.

Matching clause(s) (1):

1. Matched: "not spent" — syntax labels: RESOURCE_SPENT, SPENDING_PREVENTED_OR_REDUCED
   > If the Force Point is not spent by the end of the encounter, it is lost.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: RESOURCE_SPENT, RESOURCE_RECOVERED_OR_REGAINED — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."

### Force Recovery — TALENT `a691cc0212b6176c`

- Detector: C.resource_recovery (MEDIUM); compared tag `resource_recovery`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.101; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:a691cc0212b6176c|resource_recovery|C.resource_recovery`
- Current tags: `force`, `healing`, `recovery`, `survivability`, `scaling`, `force_multiplier`, `resources`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Whenever you use your second wind, you regain additional hit points equal to 1d6 per Force Point you possess, to a maximum of 10d6.

Matching clause(s) (1):

1. Matched: "regain additional hit points equal to 1d6 per Force Point" — syntax labels: RESOURCE_RECOVERED_OR_REGAINED, CAPACITY_OR_MAXIMUM_INCREASED
   > Whenever you use your second wind, you regain additional hit points equal to 1d6 per Force Point you possess, to a maximum of 10d6.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: RESOURCE_SPENT, RESOURCE_RECOVERED_OR_REGAINED — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."

### Master Advisor — TALENT `e6c4f05db6ac6c06`

- Detector: C.resource_recovery (MEDIUM); compared tag `resource_recovery`; compared tag currently present: **false**
- Source: Clone Wars Campaign Guide p.41; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:e6c4f05db6ac6c06|resource_recovery|C.resource_recovery`
- Current tags: `force`, `ally_support`, `support`, `teamwork`, `resources`, `force_capacity`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> When you use the Skilled Advisor Talent, the ally you aid gains one temporary Force Point at the end of their next turn. If the Force Point is not spent before the end of the encounter, it is lost.

Matching clause(s) (1):

1. Matched: "not spent" — syntax labels: RESOURCE_SPENT, SPENDING_PREVENTED_OR_REDUCED
   > If the Force Point is not spent before the end of the encounter, it is lost.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: RESOURCE_SPENT, RESOURCE_RECOVERED_OR_REGAINED — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."

### Wrath of the Dark Side — TALENT `f5ebaf5d77257e0c`

- Detector: C.resource_recovery (MEDIUM); compared tag `resource_recovery`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.88; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:f5ebaf5d77257e0c|resource_recovery|C.resource_recovery`
- Current tags: `force`, `dark_side`, `force_power_synergy`, `critical_success`, `damage_bonus`, `burst_damage`, `sustained_damage`, `force_offense`, `force_multiplier`, `scaling`, `use_the_force`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> When you roll a natural 20 on a Use the Force check to activate a Force power that directly deals damage to a target, you can choose not to regain all of your spent Force powers as normal and instead the targets damaged by the power take half that damage again at the start of their next turn. Only powers that directly damage the target are subject to this talent, including corruption, Force blast, Force grip, Force lightning, Force slam, Force storm, Force thrust (only when spending a Force Point), and repulse (only when spending a Force Point).

Matching clause(s) (1):

1. Matched: "regain all of your spent Force powers" — syntax labels: RESOURCE_SPENT, RESOURCE_RECOVERED_OR_REGAINED
   > When you roll a natural 20 on a Use the Force check to activate a Force power that directly deals damage to a target, you can choose not to regain all of your spent Force powers as normal and instead the targets damaged by the power take half that damage again at the start of their next turn.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: RESOURCE_SPENT, RESOURCE_RECOVERED_OR_REGAINED — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."

### Precognitive Meditation — TALENT `f8ac7fecc8d3c8ff`

- Detector: C.resource_recovery (MEDIUM); compared tag `resource_recovery`; compared tag currently present: **false**
- Source: Jedi Academy Training Manual p.75; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:f8ac7fecc8d3c8ff|resource_recovery|C.resource_recovery`
- Current tags: `force`, `meditation`, `precognition`, `visions`, `planning`, `setup`, `force_point_spend`, `resource_spend`, `defense`, `evasion`, `vehicle`, `pilot`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Once per day, you can spend 10 minutes meditating to seek visions of the future. At that time, you can spend a Force Point as a part of this meditation. Once during the rest of the day, whenever you or a vehicle you pilot are the target of an attack, you can choose to negate that attack provided the attack roll is not a natural 20. At the end of the day, if you did not use this ability, you regain the Force Point spent on the meditation.

Matching clause(s) (1):

1. Matched: "regain the Force Point spent" — syntax labels: RESOURCE_SPENT, RESOURCE_RECOVERED_OR_REGAINED
   > At the end of the day, if you did not use this ability, you regain the Force Point spent on the meditation.

Opposite-domain comparator(s) carrying the tag:

- **Tactical Genius** — FEAT `da8e272f5dae09b9` (Starships of the Galaxy p.21, FEAT_CANONICAL_RULES_SHAPE); tags: `vehicle`, `space`, `tactics`, `resource_recovery`, `critical_success`, `pilot`
  - labels: RESOURCE_SPENT, RESOURCE_RECOVERED_OR_REGAINED — "Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll."

## C.once_per_encounter → `once-per-encounter` (3)

### Mystical Link — TALENT `45c4e72d74c44acb`

- Detector: C.once_per_encounter (HIGH); compared tag `once-per-encounter`; compared tag currently present: **false**
- Source: Unknown Regions p.30; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:45c4e72d74c44acb|once-per-encounter|C.once_per_encounter`
- Current tags: `force`, `use_the_force`, `standard_action`, `action_economy`, `force_capacity`, `resource_recovery`, `resources`, `reliability`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> As a standard action, make a DC 30 Use the Force check. If successful, gain one benefit selected by the Gamemaster: return one Force power to your Force suite; gain one Force Point that is lost if not spent before the end of the encounter; gain an additional use of a Force-related talent or feat normally restricted to once per encounter; or roll an additional die when making a Force check and select the highest die rolled.

Matching clause(s) (1):

1. Matched: "once per encounter" — syntax labels: RESOURCE_SPENT, SPENDING_PREVENTED_OR_REDUCED
   > If successful, gain one benefit selected by the Gamemaster: return one Force power to your Force suite; gain one Force Point that is lost if not spent before the end of the encounter; gain an additional use of a Force-related talent or feat normally restricted to once per encounter; or roll an additional die when making a Force check and select the highest die rolled.

Opposite-domain comparator(s) carrying the tag:

- **Strong Bellow** — FEAT `1a9091174116f6ff` (Rebellion Era Campaign Guide p.36, FEAT_CANONICAL_RULES_SHAPE); tags: `resilience`, `once-per-encounter`
  - labels: NO_RESOURCE_STRUCTURE_MATCHED — "Once per encounter when you use Bellow, move one fewer step down the condition track."
  - labels: SPENDING_PREVENTED_OR_REDUCED — "Once per encounter, reduce Bellow's condition-track cost by one step."
- **Tae-Jitsu Training** — FEAT `6b6a0dc594ad4e3c` (Galaxy at War p.28, FEAT_CANONICAL_RULES_SHAPE); tags: `martial_arts`, `unarmed`, `melee`, `critical_hit`, `damage_bonus`, `defense`, `target-designation`, `targeting`, `swift_action`, `action_economy`, `once-per-encounter`, `control`
  - labels: RESOURCE_SPENT — "Once per encounter after a successful unarmed attack, spend a swift action to designate that enemy as primary adversary; until encounter end, Dodge applies against that enemy and one other enemy you choose."

### Armored Augmentation I — TALENT `98355ed4f6473028`

- Detector: C.once_per_encounter (HIGH); compared tag `once-per-encounter`; compared tag currently present: **false**
- Source: Legacy Era Campaign Guide p.45; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:98355ed4f6473028|once-per-encounter|C.once_per_encounter`
- Current tags: `armor`, `force`, `force_point_spend`, `resource_spend`, `swift_action`, `action_economy`, `damage_threshold`, `defense`, `survivability`, `empowerment`, `equipment`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Once per encounter, you may spend a Force Point as a swift action to augment your own ability to withstand damage by imbuing the armor you are wearing with the Force. This allows you to add your armor bonus to Reflex Defense to your damage threshold until the end of the encounter.

Matching clause(s) (1):

1. Matched: "Once per encounter" — syntax labels: RESOURCE_SPENT
   > Once per encounter, you may spend a Force Point as a swift action to augment your own ability to withstand damage by imbuing the armor you are wearing with the Force.

Opposite-domain comparator(s) carrying the tag:

- **Tae-Jitsu Training** — FEAT `6b6a0dc594ad4e3c` (Galaxy at War p.28, FEAT_CANONICAL_RULES_SHAPE); tags: `martial_arts`, `unarmed`, `melee`, `critical_hit`, `damage_bonus`, `defense`, `target-designation`, `targeting`, `swift_action`, `action_economy`, `once-per-encounter`, `control`
  - labels: RESOURCE_SPENT — "Once per encounter after a successful unarmed attack, spend a swift action to designate that enemy as primary adversary; until encounter end, Dodge applies against that enemy and one other enemy you choose."
- **Acrobatic Dodge** — FEAT `cda6cb7b58f96a2f` (The Unknown Regions p.24, FEAT_PASS1_MECHANIC_SUMMARY); tags: `reaction`, `action_economy`, `movement`, `mobility`, `evasion`, `attack_of_opportunity`, `once-per-encounter`, `force_point_spend`, `resource_spend`
  - labels: RESOURCE_SPENT — "Once per encounter as a reaction after a melee attack misses, immediately moves to an adjacent square without provoking an attack of opportunity; spending a Force Point enables a second use."

### Feared Warrior — TALENT `cfd5d3f677b2bf1a`

- Detector: C.once_per_encounter (HIGH); compared tag `once-per-encounter`; compared tag currently present: **false**
- Source: Force Unleashed Campaign Guide p.29; evidence tier: TALENT_CERTIFIED_PACK_BENEFIT_TEXT; discovery ref: `TALENT:cfd5d3f677b2bf1a|once-per-encounter|C.once_per_encounter`
- Current tags: `persuasion`, `intimidation`, `social`, `skills`, `fear`, `mind-affecting`, `will_defense`, `control`, `battlefield_control`, `action_economy`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Your abilities on the battlefield are well known and feared. When you reduce an enemy to 0 hit points with an attack, you can make a Persuasion check as a free action against all targets within 6 squares. Jf your Persuasion check exceeds a target's Will Defense, that target takes a -2 penalty on attack rolls for the remainder of the encounter. This talent affects any given target only once per encounter. This is a mind-affecting fear effect.

Matching clause(s) (1):

1. Matched: "once per encounter" — syntax labels: NO_RESOURCE_STRUCTURE_MATCHED
   > This talent affects any given target only once per encounter.

Opposite-domain comparator(s) carrying the tag:

- **Wrruushi Training** — FEAT `1d0291d930abda15` (Galaxy at War p.28, FEAT_CANONICAL_RULES_SHAPE); tags: `martial_arts`, `unarmed`, `melee`, `survivability`, `resilience`, `control`, `once-per-encounter`, `critical_hit`, `damage`
  - labels: NO_RESOURCE_STRUCTURE_MATCHED — "Once per encounter, make an unarmed attack against Fortitude instead of Reflex; on success, deal damage and remove the target's equipment bonuses to Fortitude until encounter end."
  - labels: NO_RESOURCE_STRUCTURE_MATCHED — "Special - Wrruushi Expertise: once per encounter on an unarmed critical, deal normal damage and move target -2 CT regardless of damage result; light/no armor required."
  - labels: NO_RESOURCE_STRUCTURE_MATCHED — "In light/no armor, successful unarmed attacks can grant bonus HP and once per encounter strip equipment Fortitude bonuses."
- **K'thri Training** — FEAT `b00e0a883da4edda` (Galaxy at War p.27, FEAT_CANONICAL_RULES_SHAPE); tags: `martial_arts`, `unarmed`, `melee`, `swift_action`, `action_economy`, `once-per-encounter`, `damage`, `reroll`, `reliability`, `full_attack`
  - labels: NO_RESOURCE_STRUCTURE_MATCHED — "Once per encounter, an unarmed miss deals half damage."
  - labels: NO_RESOURCE_STRUCTURE_MATCHED — "Special - K'thri Expertise: once per encounter during a full attack, reroll one unarmed attack and keep the reroll; light/no armor required."
  - labels: NO_RESOURCE_STRUCTURE_MATCHED — "In light/no armor, make swift-action unarmed attacks and once per encounter deal half damage on an unarmed miss."

## C.force_capacity → `force_capacity` (1)

### Force Boon — FEAT `53444cc061d81627`

- Detector: C.force_capacity (MEDIUM); compared tag `force_capacity`; compared tag currently present: **false**
- Source: Saga Edition Core Rulebook p.85; evidence tier: FEAT_CANONICAL_RULES_SHAPE; discovery ref: `FEAT:53444cc061d81627|force_capacity|C.force_capacity`
- Current tags: `force`, `force-point`, `resource_recovery`, `resources`, `scaling`
- Implication rule(s) that would apply if the owner later authorizes the tag: none

Complete canonical mechanic text used by the detector:

> Gain three additional Force Points at each level. Gain 3 additional Force Points each level.

Matching clause(s) (2):

1. Matched: "additional Force Points" — syntax labels: CAPACITY_OR_MAXIMUM_INCREASED
   > Gain three additional Force Points at each level.
2. Matched: "additional Force Points" — syntax labels: CAPACITY_OR_MAXIMUM_INCREASED
   > Gain 3 additional Force Points each level.

Opposite-domain comparator(s) carrying the tag:

- **Mystic Mastery** — TALENT `4ec766d6818c373f` (Jedi Academy Training Manual p.18, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `force`, `force_capacity`, `resources`, `scaling`
  - labels: CAPACITY_OR_MAXIMUM_INCREASED — "Whenever you gain a level, you also gain a number of additional Force Points equal to the number of Force talents you possess (maximum +6)."
- **Victorious Force Mastery** — TALENT `0742d901c13ea130` (Clone Wars Campaign Guide p.56, TALENT_CERTIFIED_PACK_BENEFIT_TEXT); tags: `force`, `force_capacity`, `resource_recovery`, `recovery`, `action_economy`, `setup`
  - labels: RESOURCE_SPENT — "Whenever an enemy you have damaged in this encounter is reduced to 0 Hit Points, you may automatically return one spent Force Power to your Force Power Suite as a Free Action."
