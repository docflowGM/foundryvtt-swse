# Combat Feat Fully Implemented Note

Date: 2026-07-05

This note records the combat feat work that is now considered `fully_implemented` for the current SWSE Foundry V13 architecture.

`fully_implemented` means the feat has either direct runtime behavior, a registered runtime helper, or exact metadata consumed by the appropriate current workflow boundary. Feats that require spatial adjudication, target path legality, line of sight, or GM/player context remain fully implemented as metadata/runtime advisories rather than automatic canvas movement or automatic target selection.

## Attack Options / Action Speed

| Feat | Status | Implementation note |
| --- | --- | --- |
| Quick Draw | fully_implemented | `ACTION_SPEED_MUTATION`; draw/holster weapon move action becomes swift, with combined-effect metadata for two one-handed weapons and draw/ignite lightsaber cases. Runtime bridge exposes action-cost mutation helpers. |
| Lightning Draw | fully_implemented | `ACTION_COMPOSITION_MUTATION`; once per encounter draw holstered weapon and attack as a standard action. Runtime bridge exposes composition helpers and injects a synthetic Lightning Draw Attack action for actor-aware action browsing. |
| Rapid Reaction | fully_implemented | `REACTION_TIMING_ADVISORY`; timing metadata is available to the reaction workflow. Exact trigger remains workflow-supplied. |
| Accelerated Strike | fully_implemented | `ACTION_SPEED_MUTATION`; once per encounter Full Attack can become a standard action when workflow validation confirms only proficient weapon use. Runtime bridge exposes action-cost mutation helpers. |
| Great Cleave | fully_implemented | `EXTRA_ATTACK_LIMIT_OVERRIDE`; removes Cleave's once-per-round limit. Core combat reaction runtime checks Great Cleave when resolving Cleave availability and limits. |

## Core Attack Options / Charge and Movement

| Feat | Status | Implementation note |
| --- | --- | --- |
| Power Attack | fully_implemented | Core attack option with attack penalty and melee damage bonus; runtime handles two-handed and object/vehicle edge cases. |
| Melee Defense | fully_implemented | Core attack option trading melee attack bonus for Reflex dodge bonus until next turn. |
| Rapid Shot | fully_implemented | Core attack option for ranged attacks with attack penalty and extra weapon die; runtime applies the Strength-below-13 penalty edge case. |
| Rapid Strike | fully_implemented | Core attack option for melee attacks with attack penalty and extra weapon die. |
| Careful Shot | fully_implemented | Core attack option requiring Aim and ranged attack, applying +1 attack. |
| Deadeye | fully_implemented | Core attack option requiring Aim and ranged attack, applying +1 weapon die damage. |
| Burst Fire | fully_implemented | Core attack option requiring Autofire, applying -5 attack and +2 weapon dice. |
| Powerful Charge | fully_implemented | Charge rider requiring melee charge; applies +2 attack and half-level damage. |
| Charging Fire | fully_implemented | Ranged charge rider; suppresses normal charge attack bonus while retaining Reflex penalty. |
| Improved Charge | fully_implemented | Charge rider that offsets/suppresses the normal charge Reflex penalty. |
| Deft Charge | fully_implemented | Charge movement rider; path legality remains workflow/GM adjudicated. |
| Bantha Rush | fully_implemented | Melee maneuver rider; qualifying hit pushes target 1 square as advisory/GM-adjudicated movement. |
| Improved Bantha Rush | fully_implemented | Bantha Rush rider increasing push distance to 2 squares. |
| Running Attack | fully_implemented | Standard attack plus split movement rider; movement validation remains workflow/GM adjudicated. |
| Improved Disarm | fully_implemented | Core attack option for melee disarm attempts, applying +5 and suppressing failed-disarm counterattack metadata. |
| Mighty Swing | fully_implemented | Core attack option requiring two swift actions, adding one weapon die to next melee attack. |
| Flurry | fully_implemented | Core attack option with runtime weapon eligibility filtering. |

## Area & Explosives / Area Attacks

| Feat | Status | Implementation note |
| --- | --- | --- |
| Targeted Area | fully_implemented | Area damage rider applying +5 damage before Evasion to one selected hit target. |
| Spray Shot | fully_implemented | `AUTOFIRE_SHAPE_MUTATION`; Autofire 2x2 area can become a 1-square area. Runtime helper exposes selectable shape mutation. |
| Flood of Fire | fully_implemented | `AUTOFIRE_TARGET_DEFENSE_RIDER`; Autofire targets lose dodge and deflection bonuses to Reflex Defense for the attack. Runtime helper exposes target-defense mutation. |
| Forceful Blast | fully_implemented | `GRENADE_DAMAGE_RIDER`; damaging grenade/thermal detonator can move eligible targets 1 square if attack roll equals/exceeds Fortitude. Runtime helper exposes forced-movement advisories. |
| Strafe | fully_implemented | `AUTOFIRE_SHAPE_MUTATION`; Autofire 2x2 area can become a 1x4 line, with Jet Pack special targeting as advisory metadata. |
| Whirlwind Attack | fully_implemented | `SPECIAL_AREA_ATTACK_ACTION`; full-round melee area attack against all targets within reach using one attack roll. Runtime helper exposes special action metadata. |
| Mobility | fully_implemented | Movement-provoked AoO defense advisory: +5 dodge Reflex against qualifying AoOs. Actual spatial provocation remains workflow/GM supplied. |

## Defense & Avoidance

| Feat | Status | Implementation note |
| --- | --- | --- |
| Great Fortitude | fully_implemented | Static +2 feat bonus to Fortitude Defense. |
| Lightning Reflexes | fully_implemented | Static +2 feat bonus to Reflex Defense. |
| Improved Damage Threshold | fully_implemented | +5 Damage Threshold resource metadata. |
| Fight Through Pain | fully_implemented | Damage Threshold metadata allowing better of Fortitude or Will as supported by resolver. |
| Tumble Defense | fully_implemented | `TUMBLE_DC_RIDER`; adds BAB to opponent Tumble DC when actor is not flat-footed and threatens with a proficient melee weapon. Runtime helper exposes rider. |
| Predictive Defense | fully_implemented | Defense ability substitution advisory: Reflex may use Dexterity or Intelligence. Sheet/player handles selection. |
| Moving Target | fully_implemented | `ACTIVATED_DEFENSE_RIDER`; +1 dodge Reflex until start of next turn when movement condition is met or workflow marks active. Runtime helper exposes rider. |
| Trench Warrior | fully_implemented | Selectable attack advisory applying +1 circumstance attack bonus when adjacent cover condition is satisfied. |
| Cunning Attack | fully_implemented | Selectable attack advisory applying +2 attack against flat-footed/Dex-denied targets and flags denied-Dex feat context. |
| Resilient Strength | fully_implemented | Defense ability substitution advisory: Fortitude may use Strength or Constitution. Sheet/player handles selection. |
| Wary Defender | fully_implemented | `FIGHT_DEFENSIVELY_DEFENSE_RIDER`; +2 competence Fortitude and Will while Fight Defensively is active. Runtime helper exposes rider. |

## Mobility & Positioning

| Feat | Status | Implementation note |
| --- | --- | --- |
| Bantha Herder | fully_implemented | Ranged damage rider; eligible target can be moved 1 square if attack roll equals/exceeds Will. Runtime helper exposes forced-movement advisories. |
| Fleet-Footed | fully_implemented | Running Attack rider; +2 squares Speed until end of turn when actor moves before and after the Running Attack. Runtime helper exposes rider. |
| Tactical Advantage | fully_implemented | Attack-of-Opportunity damage rider; immediate 1-square self-movement without provoking after damaging AoO. Runtime helper exposes rider. |
| Opportunistic Retreat | fully_implemented | Attack-of-Opportunity replacement rider; sacrifice AoO once per turn to move half Speed without provoking. Runtime helper exposes rider. |
| Impulsive Flight | fully_implemented | Withdraw action rider; +1 extra withdraw square. Runtime helper exposes rider. |
| Steadying Position | fully_implemented | Aim/ranged/prone rider; target loses Dexterity bonus to Reflex Defense for that attack. Runtime helper exposes target-defense mutation. |
| Cornered | fully_implemented | Player-selectable attack advisory applying +2 attack when cornered context is selected/validated. |

## Rage

| Feat | Status | Implementation note |
| --- | --- | --- |
| Extra Rage | fully_implemented | `RAGE_USES_BONUS +1`; RageEngine also retains name fallback. |
| Dreadful Rage | fully_implemented | `RAGE_ATTACK_DAMAGE_BONUS_OVERRIDE 5`; RageEngine also retains name fallback. |
| Controlled Rage | fully_implemented | `RAGE_ACTION_MODE`; can end rage at will, with RageEngine name fallback. |

## Grapple / Unarmed / Cleave Runtime

| Feat | Status | Implementation note |
| --- | --- | --- |
| Cleave | fully_implemented | Reaction rule for extra melee attack when dropping a target to 0 HP; runtime emits availability and chat prompt. |
| Great Cleave | fully_implemented | Removes Cleave's once-per-round limit through runtime limit override. |
| Frightening Cleave | fully_implemented | Cleave rider effect runtime prompt/event for encounter-long mind-affecting penalty. |
| Combat Reflexes | fully_implemented | Reaction capacity override; runtime increases available reactions/AoOs based on Dexterity and supports flat-footed AoO allowance. |
| Grapple feat action set | fully_implemented | Existing grapple runtime/action helpers cover implemented grapple maneuver feats using manual/GM spatial boundaries. |

## Explicitly not implemented / invalid

| Entry | Status | Reason |
| --- | --- | --- |
| Improved Stun | invalid_not_implemented | Not a valid SWSE feat. Removed from Attack Options normalizer. |
| Spring Attack | invalid_not_implemented | Rejected by strict Combat validity audit. |
| Reckless Charge | invalid_not_implemented | Rejected by strict Combat validity audit. |
| Wounding Strike | invalid_not_implemented | Rejected by strict Combat validity audit. |
| Friendly Fire Avoidance | invalid_not_implemented | Rejected by strict Combat validity audit. |
| Heroic Surge | invalid_not_implemented | Rejected by strict Combat validity audit. |
| Grappling Strike | invalid_not_implemented | Rejected by strict Combat validity audit. |
| Improved Knock Prone | invalid_not_implemented | Rejected by strict Combat validity audit. |
| Knock Prone | invalid_not_implemented | Rejected by strict Combat validity audit. |
| Hew | invalid_not_implemented | Rejected by strict Combat validity audit. |
| Delay Damage | invalid_not_implemented | Class feature, not a feat. |
