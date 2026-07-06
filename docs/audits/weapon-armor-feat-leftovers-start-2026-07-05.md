# Weapon & Armor Feat Leftovers Start

Date: 2026-07-05

This note starts the Weapon & Armor leftover implementation pass after the strict Combat bucket was closed.

## Baseline assumptions

The following strict Combat feats were also completed before this pass and should be treated as closed for the combat bucket:

- Opportunistic Shooter
- Mighty Throw
- Advantageous Attack
- Attack Combo (Ranged)

## First implementation in this pass

| Feat | Status | Implementation note |
| --- | --- | --- |
| Two-Weapon Fighting | fully_implemented | Wired into the existing dual-wield runtime. The dual-wield resolver now detects the base Two-Weapon Fighting feat and reduces the proficient two-weapon/double-weapon full-attack penalty from -10 to -8 when no Dual Weapon Mastery feat is present. Dual Weapon Mastery I/II/III remain higher-priority overrides at -5/-2/0. Runtime flags now expose `twoWeaponFighting` and `dualWieldPenaltySource` for roll/breakdown consumers. |

## Weapon & Armor leftovers still queued

These remain the next implementation pool, pending source/rule mapping and runtime wiring:

- Multiattack & Dual Weapon: Staggering Attack, Collateral Damage, Two-Weapon Fighting, Improved Rapid Strike, Hobbling Strike, Mighty Swing.
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
