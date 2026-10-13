# Phase 5D-I-D-B4 — weapon durability (audit classification; no runtime change)

Scope: `weaponDR`, `weaponDRValue`, `weaponDRAppliesAgainstLightsabers`, `powerAttackExtraDamageAppliesToObjectsAndVehicles`.

## Finding
Only three records carry these keys: **Electrostaff** (`weaponDR: 20`, applies against lightsabers; the only mapped identity), and the **unmapped** Shockstaff (DR value `not_stated_in_KOTOR_entry`) and Power Hammer (no canonical identity exists, so no runtime weapon can carry it).

I inspected the combat, customization, item and upgrade code. There is **no weapon-object damage event**: nothing applies damage *to* a weapon Item (no sunder action, no object hit points, no GM-applied weapon damage). The Electrostaff's `objectDurability` block carries only `damageReduction: 20` (`breakDC` and `strength` are null). Applying DR needs that event; building one would fabricate object hit points and must not reuse the target-damage path or the creature-side lightsaber DR-ignore rule. Per the B-series guardrail, **no consumer was fabricated and no runtime code changed.**

## Dispositions
| Key | Disposition | Why |
| --- | --- | --- |
| weaponDR | BLOCKED (MISSING_CONSUMER) | needs the weapon-object damage event; tripwire `no-weapon-object-damage` |
| weaponDRAppliesAgainstLightsabers | BLOCKED (MISSING_CONSUMER) | flag read by that same event; same tripwire |
| weaponDRValue | DATA_COMPLETENESS | Shockstaff (unmapped) states no DR number; none invented |
| powerAttackExtraDamageAppliesToObjectsAndVehicles | DATA_COMPLETENESS | Power Hammer is unmapped; the general Power Attack rule for objects must be reconciled with the source first; no object/vehicle target type feeds the term |

The Verpine Shattergun `fragile-disable-on-damage` special mechanic needs the same event; it stays deferred (not claimed).

## Tripwire
`no-weapon-object-damage` (no `sunderWeapon` / `sunderAttack` / `weaponObjectDamage` / `damageWeaponObject` / `applyDamageToWeapon` / `itemHitPoints` in executable scripts). If a weapon-object damage subsystem is ever added, the census fails and these BLOCKED rows must be reclassified.

## Counters
Operation keys without a consumer: unchanged (42 unique / 47 raw). I-D: IMPLEMENTED 33, DATA_COMPLETENESS 2 → 4, BLOCKED 1 → 3, deferred 34 → 30.

## Decision needed
A weapon-object damage subsystem (object HP, Core Damage-to-Objects DR, a sunder / GM-applied action) is a separate design, not a weapon-key consumer. It also unblocks the Verpine fragile rule. Recommend scheduling it with the Equipment Modification Convergence work, not here.

Foundry smoke: NOT RUN.
