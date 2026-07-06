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

## Weapon & Armor leftovers still queued

These remain the next implementation pool, pending source/rule mapping and runtime wiring:

- Lightsaber & Weapon Styles: K'tara Training, Martial Arts II, Tae-Jitsu Training, Hijkata Training, Martial Arts I, Martial Arts III, Teräs Käsi Training, Long Haft Strike, Echani Training.
- Weapon Proficiency: Exotic Weapon Proficiency, Triple Crit Specialist, Relentless Attack, Returning Bug, Sport Hunter, Savage Attack, Improvised Weapon Mastery, Weapon Focus, Withdrawal Strike, Advanced Melee Weapon Proficiency, Weapon Proficiency variants.
- Weapon Focus & Specialization: Weapon Finesse, Halt, Autofire Assault, Critical Strike, Autofire Sweep.
- Armor Proficiency & Use: Grand Army of the Republic Training, Stava Training, K'thri Training.

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
