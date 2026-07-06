# Weapon & Armor Feat Leftovers Start

Date: 2026-07-05

This note starts the Weapon & Armor leftover implementation pass after the strict Combat bucket was closed.

## Baseline assumptions

The following strict Combat feats were also completed before this pass and should be treated as closed for the combat bucket:

- Opportunistic Shooter
- Mighty Throw
- Advantageous Attack
- Attack Combo (Ranged)

## Implemented in this pass

| Feat | Status | Implementation note |
| --- | --- | --- |
| Two-Weapon Fighting | fully_implemented | Wired into the existing dual-wield runtime. The dual-wield resolver now detects the base Two-Weapon Fighting feat and reduces the proficient two-weapon/double-weapon full-attack penalty from -10 to -8 when no Dual Weapon Mastery feat is present. Dual Weapon Mastery I/II/III remain higher-priority overrides at -5/-2/0. Runtime flags now expose `twoWeaponFighting` and `dualWieldPenaltySource` for roll/breakdown consumers. |
| Improved Rapid Strike | fully_implemented | Normalized as a Rapid Strike rider and patched into `CombatOptionResolver.collectAttackModifiers`. When Rapid Strike is active with a light melee weapon or lightsaber, it replaces the Rapid Strike math with -5 attack/+2 weapon dice, or -10 attack if Dexterity is below 13. It also suppresses Mighty Swing's extra die when both are selected. |
| Savage Attack | implemented_as_full_attack_rider | Normalized as a Full Attack/Double Attack rider. Runtime exposes `savageAttackRiderAvailable` during Full Attack + Double Attack contexts and applies +1 weapon die to follow-up attacks when first attack hit/same-target context is supplied by the full-attack workflow. |
| Collateral Damage | implemented_with_manual_secondary_target_resolution | Normalized as a Rapid Shot rider. Runtime marks `collateralDamageAvailable` and emits a secondary-attack hit rider for non-area ranged Rapid Shot attacks: once/turn, -2 secondary attack, target within 2 squares, half original damage. Final secondary target legality remains GM/workflow adjudicated. |
| Hobbling Strike | fully_implemented_with_sneak_attack_stub | Normalized as an extra-damage rider for Rapid Shot, Rapid Strike, and a Sneak Attack context stub. Runtime lets the selected rider forgo available extra damage dice to apply a target Speed -1 square encounter rider. |
| Staggering Attack | fully_implemented_with_manual_forced_movement_resolution | Normalized as an extra-damage rider for Rapid Shot, Rapid Strike, Sneak Attack, or any extra-damage-dice source. Runtime lets the selected rider forgo available extra damage dice to emit forced movement equal to 2 squares per die sacrificed; movement placement remains manual/GM/workflow adjudicated and does not provoke AoOs. |
| Martial Arts I | fully_implemented | Normalized as a PASSIVE STATE feat with two consumers: `abilityMeta.rules` mutates the automatic virtual Unarmed Strike via `UnarmedAttackHelper` (+1 unarmed die step and no AoO), while `abilityMeta.modifiers` gives DefenseCalculator +1 Reflex dodge. No CombatOptionResolver runtime patch is used. |
| Martial Arts II | fully_implemented | Normalized as a PASSIVE STATE feat with `abilityMeta.rules` mutating the automatic virtual Unarmed Strike by +1 additional unarmed die step, and `abilityMeta.modifiers` giving DefenseCalculator +1 additional Reflex dodge. |
| Martial Arts III | fully_implemented | Normalized as a PASSIVE STATE feat with `abilityMeta.rules` mutating the automatic virtual Unarmed Strike by +1 additional unarmed die step, and `abilityMeta.modifiers` giving DefenseCalculator +1 additional Reflex dodge. |
| Echani Training | implemented_as_virtual_unarmed_style | Normalized as virtual-unarmed style metadata: single-attack Strength damage multiplier and once/encounter Fortitude follow-up to knock prone, including size/stability defense bonuses. |
| Hijkata Training | implemented_as_virtual_unarmed_style | Normalized as virtual-unarmed style metadata: once/round unarmed AoO counter at -5, once/encounter unarmed AoO damage rider that applies a Dex-based attack penalty, plus Hijkata Expertise synergy slot. |
| K'tara Training | implemented_as_virtual_unarmed_style | Normalized as virtual-unarmed style metadata: +1 damage die vs flat-footed target once/turn, once/encounter Fortitude follow-up to silence as a Stunning effect, plus K'tara Expertise synergy slot. |
| K'thri Training | implemented_as_virtual_unarmed_style | Normalized as virtual-unarmed style metadata: swift unarmed attack with base unarmed damage only, once/encounter half damage on miss, light/no armor gate, plus K'thri Expertise synergy slot. |
| Stava Training | implemented_as_virtual_unarmed_style | Normalized as virtual-unarmed style metadata: grab/grapple size-category mutators, free Grab after a charging unarmed hit, light/no armor gate, plus Stava Expertise synergy slot. |
| Tae-Jitsu Training | implemented_as_virtual_unarmed_style | Normalized as virtual-unarmed style metadata: critical unarmed damage +1 die step, primary adversary encounter mark action, plus Tae-Jitsu Expertise synergy slot. |
| Teras Kasi Training | implemented_as_virtual_unarmed_style | Normalized as virtual-unarmed style metadata: once/round successful unarmed hit reduces target DT by 5 for current attack resolution, plus Teras Kasi Basics synergy slot for future/talent-backed virtual unarmed damage size increase. |
| Wrruushi Training | implemented_as_virtual_unarmed_style | Normalized as virtual-unarmed style metadata: temp HP on unarmed hit, once/encounter unarmed attack vs Fortitude that suppresses Fortitude equipment bonus, light/no armor gate, plus Wrruushi Expertise synergy slot. |
| Weapon Focus | fully_implemented | Normalized selected-choice metadata so the existing scoped combat feat resolver can apply the selected weapon/group +1 attack bonus without duplicate generic rule math. |
| Weapon Finesse | fully_implemented | Normalized as an `ATTACK_ABILITY_SUBSTITUTION` passive rule for eligible melee weapons: light/light-melee, lightsabers, and unarmed/natural attacks use the better of Dexterity and Strength for attack rolls. |
| Weapon Proficiency variants | fully_implemented | Weapon Proficiency (simple weapons, pistols, rifles, heavy weapons, lightsabers), Advanced Melee Weapon Proficiency, Heavy Weapon Proficiency, Lightsaber Proficiency, and Exotic Weapon Proficiency now normalize to actor `system.proficiencies.weapon` flags so canonical attack math can remove the nonproficiency penalty. Exotic proficiency also preserves the selected weapon choice when present. |
| Halt | implemented_as_hit_rider | Normalized as a selected-weapon `HIT_RIDER` for attacks of opportunity. On hit, the attack workflow receives a structured rider to compare the same attack roll against the target's grapple check, stop movement, knock prone, end charge if applicable, and remove remaining actions if damage threshold is exceeded. |
| Heavy Hitter | implemented_as_hit_rider | Normalized as a vehicle/emplacement `HIT_RIDER`. On hit, the attack workflow receives a structured rider to add +1 damage per 5 points by which the attack exceeds Reflex, and to suppress attacks/reduce speed on the target's next turn if damage threshold is exceeded. |
| Improvised Weapon Mastery | implemented_as_hit_rider | Normalized as improvised-weapon metadata: improvised weapons are treated as simple weapons, and successful improvised weapon hits receive a single +1d6 damage rider. |
| Critical Strike | fully_implemented | Normalized as an ACTIVE `ATTACK_OPTION` rather than a passive crit modifier. The option requires a melee attack with a weapon matching an owned Weapon Focus choice, requires two consecutive Swift Actions, and when selected sets the next qualifying attack's critical threat minimum to 19 without making non-natural-20 threats automatic hits. |
| Autofire Assault | implemented_as_context_gated_attack_option | Normalized as an ACTIVE autofire `ATTACK_OPTION` gated by autofire, matching owned Weapon Focus choice, and a `sameAutofireAreaAsLastTurn` context flag. It reduces the expected normal autofire penalty from -5 to -2, or to -1 when `bracedAutofireOnlyWeapon` / `controlledBurstTalent` context is present, adds +1 weapon die only on a hit, and is marked incompatible with Autofire Sweep and Burst Fire. |
| Autofire Sweep | implemented_as_area_metadata | Normalized as an ACTIVE autofire `ATTACK_OPTION` gated by autofire and matching owned Weapon Focus choice. When selected, it emits 180-degree 6-square cone metadata whose origin must be a visible point in point-blank range; target selection/area placement remains GM/workflow adjudicated. It is marked incompatible with Autofire Assault and Burst Fire and compatible with Improved Suppression Fire. |

## Weapon & Armor leftovers still queued

These remain the next implementation pool, pending source/rule mapping and runtime wiring:

- Lightsaber & Weapon Styles: Long Haft Strike, remaining non-unarmed weapon-style feats if source-confirmed.
- Weapon Proficiency: Triple Crit Specialist, Relentless Attack, Returning Bug, Sport Hunter, Savage Attack, Withdrawal Strike.
- Armor Proficiency & Use: Grand Army of the Republic Training.

## Already implemented / not part of this queue

The earlier combat pass already marked the following Weapon & Armor-adjacent feats implemented or covered by existing runtime:

- Mighty Swing
- Quick Draw
- Riflemaster
- Pistoleer
- Dual Weapon Mastery I
- Dual Weapon Mastery II
- Dual Weapon Mastery III

Mighty Swing remains listed in the generated taxonomy bucket, but it is closed by the strict combat pass and should not be reimplemented.
