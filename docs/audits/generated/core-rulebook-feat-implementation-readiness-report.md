# Core Rulebook Feat Implementation Accuracy Report

Scope: Saga Edition Core Rulebook feats only. This audit separates implementation presence from implementation correctness.

## Totals

- Feats audited: 80
- Source-review queue: 8
- Warnings: 0
- Errors: 0

## Accuracy counts

- implemented_correct: 30
- implemented_partial: 35
- metadata_correct: 3
- not_implemented: 4
- source_review_required: 8

## Implementation modes

- attack_option: 17
- conditional_roll_modifier: 11
- force_point_rule: 2
- force_power_selection: 2
- grapple_rider: 4
- language_selection: 1
- manual_workflow: 2
- organization_metadata: 1
- procedure_metadata: 2
- reaction_prompt: 6
- recovery_rule: 1
- resource_rule: 3
- scoped_choice_static: 14
- skill_action_option: 3
- skill_reroll_hook: 2
- static_sheet_math: 8
- vehicle_starship_reaction: 1

## Implemented incorrectly

- None

## Partial implementations

- Advanced Melee Weapon Proficiency
- Armor Proficiency (heavy)
- Armor Proficiency (light)
- Armor Proficiency (medium)
- Cleave
- Combat Reflexes
- Dodge
- Double Attack
- Dual Weapon Mastery I
- Dual Weapon Mastery II
- Dual Weapon Mastery III
- Exotic Weapon Proficiency
- Force Sensitivity
- Force Training
- Great Cleave
- Heavy Weapon Proficiency
- Martial Arts I
- Martial Arts II
- Martial Arts III
- Mobility
- Pin
- Precise Shot
- Running Attack
- Shake It Off
- Throw
- Trip
- Triple Attack
- Two-Weapon Fighting
- Vehicular Combat
- Weapon Focus
- Weapon Proficiency
- Weapon Proficiency (Heavy Weapons)
- Weapon Proficiency (Pistols)
- Weapon Proficiency (Rifles)
- Weapon Proficiency (Simple Weapons)

## Source-review queue

### Coordinated Attack

Description: You are automatically successful when using the Aid Another action to aid an ally's attack, or suppress an enemy as long as the target is adjacent to you or within Point-Blank Range.

Proposed bucket: Leadership & Allies / Teamwork & Aid Another

Proposed implementation mode: skill_action_option

Reason: Contextual action/reaction mechanics require book-context confirmation and in-world workflow testing before marking complete.

### Fast Talk

Description: You may make a Persuasion check to feint in combat as a swift action instead of a standard action.

Proposed bucket: Skills / Social Skills

Proposed implementation mode: skill_action_option

Reason: Contextual action/reaction mechanics require book-context confirmation and in-world workflow testing before marking complete.

### Frightful Presence

Description: As a standard action, you may make a Persuasion check to intimidate all enemies within 6 squares. On a success, targets move -1 step down the condition track.

Proposed bucket: Social & Intrigue / Persuasion & Influence

Proposed implementation mode: skill_action_option

Reason: Contextual action/reaction mechanics require book-context confirmation and in-world workflow testing before marking complete.

### Hew

Description: When you use Power Attack, you ignore an amount of damage reduction equal to your base attack bonus.

Proposed bucket: Combat / Damage & Threshold

Proposed implementation mode: conditional_roll_modifier

Reason: Contextual action/reaction mechanics require book-context confirmation and in-world workflow testing before marking complete.

### Mounted Combat

Description: You can make a DC 20 Ride check as a Swift Action to spur your living Mount to move faster than its normal speed. If the check fails, your Mount's Speed does not increase and it moves -1 step on the Condition Track. If the check succeeds, your Mount's Speed increases by 2 squares until the start of your next turn. You cannot Take 10 on this check. Your Mo...

Proposed bucket: Starship & Vehicle / Pilot & Maneuvers

Proposed implementation mode: reaction_prompt

Reason: Contextual action/reaction mechanics require book-context confirmation and in-world workflow testing before marking complete.

### Natural Leader

Description: You become the leader of an Organization of your design. The Organization has a scale equal to one-half your Heroic Level plus your Charisma bonus and continues to grow in scale as you gain levels. You automatically begin with a +10 bonus to your Organization Score for your new Organization.

Proposed bucket: Leadership & Allies / Command & Organization

Proposed implementation mode: organization_metadata

Reason: Contextual action/reaction mechanics require book-context confirmation and in-world workflow testing before marking complete.

### Saber Throw

Description: You may throw your lightsaber as a ranged attack using Use the Force instead of a ranged attack roll. The lightsaber returns to your hand at the end of the turn.

Proposed bucket: Weapon & Armor / Lightsaber & Weapon Styles

Proposed implementation mode: attack_option

Reason: Contextual action/reaction mechanics require book-context confirmation and in-world workflow testing before marking complete.

### Whirlwind Attack

Description: As a Full-Round Action, you can make an Area Attack with your melee weapon, striking every target within your reach. This Whirlwind Attack uses the Area Attack rules; you make one attack roll and apply the result to every target in range.

Proposed bucket: Combat / Area & Explosives

Proposed implementation mode: attack_option

Reason: Contextual action/reaction mechanics require book-context confirmation and in-world workflow testing before marking complete.

## Errors

- None

