# Ion damage: source-cited decision matrix (P6C-3A)

Every rule below is classified, per the project's decision hierarchy, as **PUBLISHED_RULE**, **EXISTING_ENGINE_AUTHORITY**,
**PROJECT_INTERPRETATION** or **SOURCE_UNRESOLVED**. The adopted column is executed by the engine and pinned by
`tests/vehicle-universal-phase4e-p27-ion-damage.test.mjs` ("DECISION MATRIX"), which also runs the prior reading as a reference
model so the differences below are reproducible.

## What the sources print

| # | Statement | Source | Class |
|---|---|---|---|
| 1 | "First subtract half of the ion damage from the target's hit points." | Core Rulebook, Ion Damage, pp. 159-160 | PUBLISHED_RULE |
| 2 | Creatures without cybernetic prosthetics "are singed by the ion energy but suffer no other ill effects." Droids, vehicles, electronic devices and cybernetically enhanced creatures "may suffer additional effects". | Core, Ion Damage | PUBLISHED_RULE |
| 3 | Ion damage that reduces the target to 0 HP: -5 steps and unconscious/disabled. Ion damage "(before being halved)" equal to or above the damage threshold: -2 steps. | Core, Ion Damage | PUBLISHED_RULE |
| 4 | "Unlike other creatures, a creature with cybernetic prosthetics takes full damage from weapons and attacks that deal ion damage." | Core, Cybernetic Prosthesis, p. 137 | PUBLISHED_RULE |
| 5 | Shield rating reduces the damage first; the remaining damage is dealt to hit points "applying damage reduction normally" (shield rating, then damage reduction). | Core, Shield Rating, p. 161 | PUBLISHED_RULE |
| 6 | A droid, object or vehicle reduced to 0 HP is disabled (-5 steps); "however, if the damage that reduced it to 0 hit points equals or exceeds its damage threshold, [it] is destroyed instead" (a creature is killed). | Core, Hit Points / Damage Threshold | PUBLISHED_RULE (generic) |
| 7 | The threshold is compared to the damage a single attack "deals" (the ordinary engine measures it after shield rating and damage reduction). | Core, Damage Threshold; ActorEngine / DamageResolutionEngine | EXISTING_ENGINE_AUTHORITY |
| 8 | The ion text does not say whether the "before being halved" amount is taken before or after shield rating and damage reduction. | Core, Ion Damage | SOURCE_UNRESOLVED -> resolved by PROJECT_INTERPRETATION below |
| 9 | The ion text says only "disabled" at 0 HP; the generic rule (6) says "destroyed" when the damage also meets the threshold. | Core | SOURCE_UNRESOLVED -> resolved by PROJECT_INTERPRETATION below |
| 10 | AAT-1: "Due to a design flaw, the AAT takes double damage from ion weapons." (damage reduction 15, damage threshold 33) | Core, AAT-1, p. 176 | PUBLISHED_RULE (the vulnerability); its sequencing is SOURCE_UNRESOLVED -> PROJECT_INTERPRETATION |

## Adopted project interpretation (owner-approved 2026-11-04; V-P6C-04 and V-P6C-05)

1. Weapon damage dice and published multiplier (and battery extra dice). 2. A source-backed vulnerability multiplies the incoming ion
damage once. 3. Shield rating. 4. Damage reduction. 5. The remaining amount is kept (full, unhalved). 6. Hit points take the ion modifier
(half; full for a creature with prosthetics; half and nothing else for an ordinary organic). 7. The kept amount is compared to the
damage threshold. 8. The ion condition-track result: -2 at the threshold; -5 and disabled at 0 HP, as one outcome, **specific over
general** (an ion-only hit that reaches 0 HP is disabled, not destroyed). The damage type stays **ion** for every target; only the ion
special effects are switched off for an ordinary organic. Stun keeps its own existing handling.

## The five scenarios (ion roll -> hit points / threshold measure / condition track / state)

Each row shows the PRIOR reading (the rolled amount compared to the threshold; the generic 0-HP rule) against the ADOPTED reading.

| # | Scenario | Prior | Adopted | Printed rule alone decides? |
|---|---|---|---|---|
| 1 | Unshielded droid, 50 HP, DT 40, roll 60 | HP -30; measure 60; -2 steps; operational | HP -30; measure 60; -2 steps; operational | Yes (items 1, 3) |
| 2 | Vehicle, 100 HP, DT 40, SR 20, roll 50 | HP -15; measure 50; **-2 steps** | HP -15; measure **30**; no condition-track move | No (item 8) |
| 3 | Vehicle, 100 HP, DT 40, DR 15, roll 50 | HP -17; measure 50; **-2 steps** | HP -17; measure **35**; no condition-track move | No (item 8) |
| 4 | Vehicle, 100 HP, DT 40, SR 60, roll 50 (threshold met, nothing gets through) | HP 0; measure 50; **-2 steps** | HP 0; measure **0**; no condition-track move | No (item 8); the prior reading moves a target that took no damage |
| 5 | Vehicle, 10 HP, DT 40, roll 60 (reaches 0 HP and the threshold) | 0 HP; **destroyed** (generic rule) | 0 HP; **disabled, -5 steps**; not destroyed; no extra -2 | No (items 6, 9) |

AAT-1 worked example (roll 40, DR 15, DT 33): 40 -> 80 (vulnerability) -> 65 after DR -> HP floor(65/2) = 32 -> 65 vs 33 meets the
threshold -> -2 steps. With shield rating 30: 80 -> 50 -> 35 -> HP 17 -> 35 vs 33 -> -2 steps.

## Target kinds

| Target | HP | Ion special effects | Source |
|---|---|---|---|
| Droid, vehicle, object, electronic device | half | yes | Core, Ion Damage |
| Creature with cybernetic prosthetics (equipment tagged `cybernetic` + `prosthesis`, or the per-attack cybernetic class answer) | **full** | yes | Core p. 137 |
| Ordinary organic | half | no ("no other ill effects") | Core, Ion Damage |

## Limits recorded

* A prosthesis the actor does not own as a tagged equipment item is invisible to the rule (no sheet UI sets it).
* The "cybernetically enhanced creature" of the ion text and the "creature with cybernetic prosthetics" of the prosthesis text are read as the same set.
* The two-step ion baseline and the optional double-threshold house rule combine as the larger, not additive.
* R-28 "medium ion cannons" (Legacy Era Campaign Guide, p. 85): the statblock prints `Dmg 6d10x2` with no ion type and the narrative calls "the fire-linked ion cannons" the ship's "nonlethal munitions". The canonical group evidence does not type the damage and canonical records are not edited, so the group stays refused; enabling it needs a source-evidence amendment, not a name match.
