# Force Unleashed feat implementation readiness report

Generated: Phase 9F

## Summary

- Total feats: 31
- Accuracy counts: `{"implemented_correct": 2, "implemented_incorrect": 1, "implemented_partial": 21, "metadata_correct": 1, "not_implemented": 6}`
- Review queue: 28

## Source-review / implementation-review queue

### Advantageous Attack

- Proposed bucket: Combat / Damage & Threshold
- Proposed mode: `damage_result_timing_hook`
- Current status: `implemented_incorrect`
- Description: When you make a successful attack against an enemy who has not yet acted in combat, you add your full Heroic Level to damage rolls.
- Review reason: The catalog metadata describes an attack bonus keyed to target speed, but the source rule is a damage rider against an enemy who has not yet acted. This is the exact kind of wrong-shape implementation that must not count as implemented.

### Advantageous Cover

- Proposed bucket: Combat / Defense & Avoidance
- Proposed mode: `cover_area_damage_rule`
- Current status: `implemented_partial`
- Description: When you have Cover, you take no damage from Area Attacks, even if the attack roll exceeds your Reflex Defense.
- Review reason: Metadata preserves the cover context, but no proven runtime hook reduces or alters area-attack damage using cover state. Correct implementation needs area attack + cover result context, not static defense.

### Angled Throw

- Proposed bucket: Combat / Area & Explosives
- Proposed mode: `grenade_cover_bypass_option`
- Current status: `implemented_partial`
- Description: When throwing a Grenade or grenadelike weapon, you can attempt to bounce it off a wall or other surface close to your target. If you attack roll exceeds a Reflex Defense of 15, you ignore Cover and Improved Cover (but not Total Cover) with your attack.
- Review reason: Attack-option metadata exists, but the runtime must verify grenade/grenadelike thrown attack, bounce permissibility, Reflex 15 threshold, and cover vs total cover distinction. Current metadata is not enough for fully correct automation.

### Bad Feeling

- Proposed bucket: Combat / Action Economy
- Proposed mode: `surprise_round_action_capability`
- Current status: `implemented_partial`
- Description: You can always take a Move Action during a Surprise Round, even if you are Surprised. If you are not Surprised, you can take this Move Action in addition to any other Actions you are normally allowed to take in the Surprise Round.
- Review reason: Action metadata exists, but a real surprise-round action economy hook is not proven. Correct implementation grants/permits a Move Action during surprise rounds without altering ordinary action totals.

### Blaster Barrage

- Proposed bucket: Combat / Area & Explosives
- Proposed mode: `autofire_ally_bonus_context`
- Current status: `implemented_partial`
- Description: When you make an attack with a weapon set on Autofire that deals damage to at least one target within the designated area, you grant a +2 circumstance bonus on any of your allies' Autofire attacks made against that same target until the beginning of your next turn.
- Review reason: Autofire rider metadata exists, but full correctness requires an autofire result hook and ally participation context. It should not be a passive attack bonus.

### Controlled Rage

- Proposed bucket: Recovery & Survival / Endurance & Resilience
- Proposed mode: `rage_action_state_rule`
- Current status: `not_implemented`
- Description: You enter a Rage as a Free Action. Your Rage ends 1 round after you declare it is finished.
- Review reason: Requires free-action rage entry/end control. The current metadata does not prove a rage-state runtime flow that changes activation/ending action cost.

### Crossfire

- Proposed bucket: Combat / Attack Options
- Proposed mode: `ranged_miss_soft_cover_followup`
- Current status: `implemented_partial`
- Description: If you miss when making a ranged attack against a target that has Soft Cover (that is, Cover provided by another character, creature, or Droid), you can immediately make an attack roll (with the same weapon and at the same attack bonus) against the target that is providing the Soft Cover. You can only use this Feat once per round.
- Review reason: Metadata exists, but full correctness requires detecting a missed ranged attack due to soft cover and identifying the soft-cover provider for the follow-up attack.

### Crush

- Proposed bucket: Combat / Grapple & Unarmed
- Proposed mode: `grapple_pin_damage_rider`
- Current status: `implemented_partial`
- Description: If you successfully Pin an opponent with a Grapple attack (see Pin Feat for more details), you can immediately deal bludgeoning damage to it equal to your Unarmed damage or claw damage, whichever is greater.
- Review reason: Metadata/source classification exists, but a correct implementation needs a successful Pin/grapple state and damage rider. It is not a Force feat and should not become static damage.

### Focused Rage

- Proposed bucket: Recovery & Survival / Endurance & Resilience
- Proposed mode: `rage_skill_permission`
- Current status: `not_implemented`
- Description: While Raging, you can use Skills that require patience and concentration, at a -5 penalty.
- Review reason: Requires allowing patience/concentration-type skill usage while raging at the correct contextual penalty. No proven rage skill-permission hook exists.

### Forceful Blast

- Proposed bucket: Combat / Area & Explosives
- Proposed mode: `grenade_hit_rider`
- Current status: `implemented_partial`
- Description: When you damage a Large or smaller creature with a Grenade or Thermal Detonator, compare the result of your attack roll to the target's Fortitude Defense. If your result equals or exceeds the target's Fortitude Defense, you can move the target 1 square in any direction as a Free Action. If the Grenade deals damage to multiple eligible creatures, you can use this benefit against all of them. You can't move a target that's being Grabbed or Grappled, and you can't move a target into a solid object or into another creature's Fighting Space.
- Review reason: Metadata identifies a grenade/thermal detonator rider, but full correctness requires a hit-result rider with push/prone/forced-movement handling. It is not a Force feat despite the name.

### Forceful Grip

- Proposed bucket: Force / Force Training & Powers
- Proposed mode: `scoped_force_power_activation_bonus`
- Current status: `implemented_partial`
- Description: You gain a +2 bonus on Use the Force checks made to activate Force Grip.
- Review reason: Skill bonus metadata exists, but full correctness requires Force power activation context that applies +2 only to Force Grip activation checks and never to generic Use the Force.

### Forceful Recovery

- Proposed bucket: Force / Force Point & Destiny
- Proposed mode: `second_wind_force_power_recovery`
- Current status: `not_implemented`
- Description: Whenever you catch a Second Wind, choose one expended Force Power and return that power to your Force Power Suite.
- Review reason: Requires a second-wind hook and player/GM choice of one expended Force power to return to the suite. No proven hook exists.

### Forceful Saber Throw

- Proposed bucket: Force / Force Training & Powers
- Proposed mode: `scoped_force_power_activation_bonus`
- Current status: `implemented_partial`
- Description: You gain a +2 bonus on Use the Force checks made to activate Saber Throw.
- Review reason: Skill bonus metadata exists, but full correctness requires activation context for Saber Throw only.

### Forceful Slam

- Proposed bucket: Force / Force Training & Powers
- Proposed mode: `scoped_force_power_activation_bonus`
- Current status: `implemented_partial`
- Description: You gain a +2 bonus on Use the Force checks made to activate Force Slam.
- Review reason: Skill bonus metadata exists, but full correctness requires activation context for Force Slam only.

### Forceful Strike

- Proposed bucket: Force / Force Point & Destiny
- Proposed mode: `force_point_power_result_rider`
- Current status: `implemented_partial`
- Description: You may spend a Force Point to move a target -1 step down the condition track when using Force Stun.
- Review reason: Rider metadata exists, but full correctness requires a Force Stun result hook, Force Point spend prompt, and condition-track application.

### Forceful Stun

- Proposed bucket: Force / Force Training & Powers
- Proposed mode: `scoped_force_power_activation_bonus`
- Current status: `implemented_partial`
- Description: You gain a +2 bonus on Use the Force checks made to activate Force Stun.
- Review reason: Skill bonus metadata exists, but full correctness requires activation context for Force Stun only.

### Forceful Telekinesis

- Proposed bucket: Force / Force Point & Destiny
- Proposed mode: `force_point_power_result_rider`
- Current status: `implemented_partial`
- Description: You may spend a Force Point to move a target -1 step down the condition track when using Move Object.
- Review reason: Rider metadata exists, but full correctness requires a Move Object result hook, Force Point spend prompt, and condition-track application.

### Forceful Throw

- Proposed bucket: Force / Force Training & Powers
- Proposed mode: `scoped_force_power_activation_bonus`
- Current status: `not_implemented`
- Description: You gain a +2 bonus on Use the Force checks made to activate Move Object.
- Review reason: This should be +2 only when activating Move Object, but no matching scoped skill-bonus metadata/hook is proven in the current catalog snapshot.

### Forceful Vitality

- Proposed bucket: Recovery & Survival / Endurance & Resilience
- Proposed mode: `skill_bonus_and_encounter_reroll`
- Current status: `implemented_partial`
- Description: You gain a +2 bonus on Endurance checks and may reroll a failed Endurance check once per encounter.
- Review reason: Skill bonus/reroll metadata exists and the skill feat resolver can read those rule families, but full correctness requires once-per-encounter failed Endurance reroll usage tracking.

### Forceful Weapon

- Proposed bucket: Force / Force Training & Powers
- Proposed mode: `scoped_force_power_activation_bonus`
- Current status: `implemented_partial`
- Description: You gain a +2 bonus on Use the Force checks made to activate Battle Strike.
- Review reason: Skill bonus metadata exists, but full correctness requires activation context for Battle Strike only.

### Forceful Will

- Proposed bucket: Force / Force Defenses
- Proposed mode: `conditional_defense_and_reroll`
- Current status: `implemented_partial`
- Description: You gain a +2 bonus on Will Defense against mind-affecting effects and may reroll a failed Will Defense check once per encounter.
- Review reason: Conditional Will metadata exists, but full correctness requires mind-affecting context and once-per-encounter failed Will reroll handling. It must not become always-on Will Defense.

### Improved Bantha Rush

- Proposed bucket: Combat / Mobility & Positioning
- Proposed mode: `combat_maneuver_distance_rule`
- Current status: `implemented_partial`
- Description: When making a Bantha Rush, you push your opponent a number of additional squares away from you equal to half your Strength modifier (Round down, minimum 2 squares pushed total).
- Review reason: Metadata exists, but full correctness requires Bantha Rush maneuver resolution and push-distance adjustment. It should not be static attack/damage math.

### Mighty Throw

- Proposed bucket: Combat / Thrown Weapons
- Proposed mode: `thrown_weapon_attack_formula_and_range`
- Current status: `implemented_partial`
- Description: You can add your Strength modifier (in addition to your Dexterity modifier) to your ranged attack bonus when using Thrown Weapons (including Grenades and grenadelike weapons). Also, you can increase the length of each Range category by a number of squares equal to your Strength modifier.
- Review reason: The combat option resolver supports ATTACK_ABILITY_BONUS for thrown weapons, but full correctness also requires extending range categories by Strength modifier. Do not mark correct until range-band math is proven.

### Powerful Rage

- Proposed bucket: Recovery & Survival / Endurance & Resilience
- Proposed mode: `rage_state_damage_bonus`
- Current status: `not_implemented`
- Description: You gain a +4 bonus to Strength checks and Strength -based Skill Checks when Raging.
- Review reason: Requires rage-state damage handling. No proven runtime hook applies only while raging.

### Rapport

- Proposed bucket: Leadership & Allies / Aid Another & Teamwork
- Proposed mode: `aid_another_bonus_and_range`
- Current status: `implemented_partial`
- Description: When using the Aid Another Action, you grant an additional +2 insight bonus on Skill Checks and attack rolls to the character you are assisting. This bonus does not stack with any bonus provided by the Noble's Coordinate Talent.
- Review reason: Metadata can describe the support relationship, but correct automation needs Aid Another context, ally range/communication, and target action connection.

### Strafe

- Proposed bucket: Combat / Area & Explosives
- Proposed mode: `autofire_shape_attack_option`
- Current status: `not_implemented`
- Description: When you make an Autofire attack, instead of attacking a 2-square-by-2-square area, you may attack a line 1 square wide and 4 squares long.
- Review reason: Requires a specific autofire attack shape option. No proven action card/template hook exists.

### Swarm

- Proposed bucket: Combat / Mobility & Positioning
- Proposed mode: `target_position_context_bonus`
- Current status: `implemented_partial`
- Description: You gain a +1 circumstance bonus on melee attack rolls for each allied character adjacent to your target.
- Review reason: Metadata can express positioning context, but full correctness requires target adjacency/ally count checks in attack or damage context.

### Unstoppable Force

- Proposed bucket: Force / Force Defenses
- Proposed mode: `conditional_force_defense_bonus`
- Current status: `implemented_partial`
- Description: You gain a +5 insight bonus to Fortitude Defense and Will Defense against any attack or effect requiring a Use the Force check.
- Review reason: Metadata/context summary may exist, but full correctness requires target-effect context for Force powers and should not become always-on defenses.
