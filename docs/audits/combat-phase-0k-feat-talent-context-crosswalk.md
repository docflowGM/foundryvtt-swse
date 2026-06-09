# Combat Phase 0K - Feat/Talent Context Crosswalk Audit
Audit-only pass. No runtime files were changed. This pass crosswalks the combat rules seams from Phases 0A-0J against feat/talent metadata and likely runtime context needs.
## Scope
- Feats pack: `414` documents.
- Talents pack: `1005` documents.
- Primary sources inspected: `packs/feats.db`, `packs/talents.db`, `data/feat-metadata.json`, `data/feat-combat-actions.json`, `data/talent-enhancements.json`, `data/talent-action-links.json`, `scripts/engine/combat/combat-option-resolver.js`, `scripts/combat/multi-attack.js`, `scripts/engine/combat/full-attack-executor.js`, reaction/damage/healing engines.
## Executive finding
The combat feat/talent metadata is much richer than the live routing contract. Many items are correctly classified as attack options, riders, manual rules, or skill-use rules, but the runtime often lacks the exact context flags these rules require. The highest-risk class is not missing metadata; it is **metadata that cannot wake up because the attack/action/damage context is not durable or normalized**.
## Crosswalk counts by audited subsystem
| Subsystem | Feats | Talents | Why it matters |
|---|---:|---:|---|
| `autofire_burst_area` | 25 | 63 | Autofire, Burst Fire, Evasion, area damage, and ammo all require preserved attack/damage context. |
| `firing_into_melee` | 7 | 5 | Precise Shot can only work after the base firing-into-melee penalty exists; Elusive Target is target/GM contextual. |
| `aim_deadeye_careful` | 12 | 12 | Careful Shot, Deadeye, and multiple aim talents require consistent aim state/context. |
| `charge_context` | 15 | 17 | Charge-gated options need `charge` context plus defense state persistence. |
| `maneuver_disarm` | 2 | 5 | Disarm-gated feats need maneuver context, not a generic attack. |
| `grapple_state_machine` | 34 | 11 | Pin/Trip/Crush and related feats need the actual Grab/Grapple/Pin lifecycle. |
| `full_attack_multiattack_dual` | 14 | 32 | Double/Triple/Dual/Multiattack rules need full-attack routing and selected weapon groups. |
| `reaction_deflect_block` | 30 | 52 | Block/Deflect and reaction talents depend on attack snapshots and damage packet details. |
| `special_damage_semantics` | 41 | 71 | Stun/Ion/Sonic/Fire/Acid rules require damage packets, target type, and recurring effects. |
| `healing_repair_bonus_hp` | 26 | 107 | Healing/repair feats depend on target type, gear requirements, once-per-day limits, and bonus HP stacking. |
| `defense_state_options` | 60 | 164 | Fight Defensively/Total Defense/Melee Defense/Cover/Prone need durable state and expiration. |

## Ability metadata rule-type signal
These counts show that the project already has a significant amount of semantic metadata, especially `ATTACK_OPTION`, `GRAPPLE_RIDER`, `RUNTIME_CONTEXT_REFERENCE`, and special rider types. The audit conclusion is therefore to route context into existing metadata instead of inventing new feat-specific systems.

### Feat rule type samples
| Rule type | Count | Sample names |
|---|---:|---|
| `ATTACK_OPTION` | 97 | Advantageous Attack, Aiming Accuracy, Angled Throw, Anointed Hunter, Artillery Shot, Attack Combo (Fire and Strike), Attack Combo (Melee), Attack Combo (Ranged) |
| `RIDER_EFFECT` | 7 | Acrobatic Strike, Bantha Rush, Battering Attack, Collateral Damage, Follow Through, Grappling Strike, Pinpoint Accuracy |
| `WEAPON_DAMAGE_DIE_STEP` | 4 | Disabler, Primitive Warrior, Riflemaster, Sport Hunter |
| `FORCE_POINT_DIE_STEP` | 4 | Gungan Weapon Master, Master Tracker, Nature Specialist, Sharp Senses |
| `GRAPPLE_RIDER` | 4 | Crush, Pin, Throw, Trip |
| `UNARMED_DAMAGE_STEP` | 3 | Martial Arts I, Martial Arts II, Martial Arts III |
| `WEAPON_PROPERTY_OVERRIDE` | 3 | Long Haft Strike, Pistoleer |
| `ATTACK_ABILITY_SUBSTITUTION` | 2 | Noble Fencing Style, Weapon Finesse |
| `WEAPON_CRITICAL_MULTIPLIER_MIN` | 2 | Triple Crit, Triple Crit Specialist |
| `RAGE_ALTERNATE_MODE` | 1 | Channel Rage |
| `REACTION` | 1 | Vehicular Combat |
| `PROFICIENCY_GRANT` | 1 | Vehicular Combat |
| `RAGE_BONUS_HIT_POINTS` | 1 | Wroshyr Rage |
| `EXTRA_ATTACK` | 1 | Cleave |
| `BANTHA_RUSH_PUSH_DISTANCE` | 1 | Improved Bantha Rush |
| `SENSE_RANGE_BONUS` | 1 | Keen Scent |
| `MULTI_TARGET_ATTACK_ACTION` | 1 | Whirlwind Attack |
| `THREATEN_WITH_CONCEALED_WEAPON` | 1 | Knife Trick |

### Talent rule type samples
| Rule type | Count | Sample names |
|---|---:|---|
| `RUNTIME_CONTEXT_REFERENCE` | 70 | Advantageous Positioning, Ambush, Armor Mastery, Armored Augmentation I, Armored Augmentation II, Armored Defense, Cast Suspicion, Castigate |
| `ATTACK_OPTION` | 50 | Ambush, Ambush (Republic Commando), Breach Cover, Cantina Brawler, Controlled Burst, Curved Throw, Dark Scourge, Devastating Melee Smash |
| `HIT_RIDER` | 6 | Blowback, Devastating Attack, Distracting Attack, Greater Devastating Attack, Greater Penetrating Attack, Penetrating Attack |
| `CRITICAL_RIDER` | 5 | Deny Move, Flurry Attack, Knockback, Reduce Defense, Reduce Mobility |
| `EXTEND_CRITICAL_RANGE` | 4 | Extended Critical Range, Extended Critical Range (heavy), Extended Critical Range (rifles), Vaapad |
| `SPORTS_COMBAT_CONTEXT_REFERENCE` | 4 | Centerbreaker Charge, Linebreaker Charge, Smashball Pass, Suktub Defender |
| `UNARMED_EXTRA_WEAPON_DICE` | 2 | Teras Kasi Basics, Teräs Käsi Basics |
| `ZONE_ATTACK_PENALTY` | 1 | Obscuring Defenses |
| `COVER_CONTEXT` | 1 | Enhance Cover |
| `PERCEPTION_CONTEXT` | 1 | Nature Sense |
| `AREA_DAMAGE_MITIGATION` | 1 | Evasion |
| `IGNORE_DAMAGE_REDUCTION_IF_OVERCOME` | 1 | Ignore Damage Reduction |
| `ZONE_REFERENCE` | 1 | Safe Zone |
| `DEFENSE_CONTEXT_BONUS` | 1 | Knowledge is Life |
| `ZONE_EXIT_ATTACK_BONUS` | 1 | Launch Point |
| `REACTION_REFERENCE` | 1 | Warrior's Awareness |
| `ZONE_SECOND_WIND_BONUS` | 1 | Zone of Recuperation |
| `DEFENSE_CONTEXT_REFERENCE` | 1 | Seen It All |

## High-risk crosswalk findings

### ctx-burst-fire-single-target-not-area
- **Severity:** critical
- **System:** autofire-burst
- **Affected examples:** Burst Fire, Controlled Burst, Trigger Work, Hailfire, Autofire Assault, Autofire Sweep
- **Current evidence:** Burst Fire feat metadata correctly has ATTACK_OPTION burstFire with damageExtraWeaponDice 2, ammunitionCost 5, strengthPenaltyIfBelow 13, and nonStackingWith Deadeye/Rapid Shot. Older data/feat-combat-actions.json still labels Burst Fire as full-round, and legacy helper findings from 0D/0E suggested Burst Fire could inherit autofire half-on-miss behavior if routed through the wrong path.
- **Rule expectation:** Burst Fire is a Standard Action single-target ranged attack option using autofire capability/mode. It is not an Area Attack, does not half-damage on miss, and Evasion does not apply.
- **Context needed:** `attackMode: burstFire, singleTarget: true, areaAttack: false, halfDamageOnMiss: false, ammoCost: 5, extraWeaponDice: 2, nonStackingDamageOptions: deadeye, rapidShot`
- **Automation boundary:** automate attack/damage/ammo math; GM does not need to adjudicate area because there is no area
- **Recommended future phase:** 4

### ctx-autofire-area-evasion-target-aware-damage
- **Severity:** critical
- **System:** autofire-area-damage
- **Affected examples:** Evasion, Vehicular Evasion, Autofire Assault, Autofire Sweep, Suppression Fire, Friendly Fire Avoidance, Targeted Area
- **Current evidence:** Evasion talent metadata says existing_runtime in enhanced-rolls area attack damage resolution, but 0D/0E identified fragmented damage context and unsafe legacy behavior. Attack-to-damage buttons do not preserve enough hit/miss/area/target context.
- **Rule expectation:** Autofire is Standard Action area attack: -5 attack, Reflex per affected creature, full damage on hit, half on miss, no critical double damage. Evasion changes hit to half and miss to zero for area attacks only.
- **Context needed:** `attackMode: autofire, areaAttack: true, gmManagedTargets: true, hitOutcomeByTarget, damageOnMiss: half, criticalDoublesDamage: false, targetHasEvasion`
- **Automation boundary:** assist/automate math once GM identifies targets; do not automate grid area or LoS
- **Recommended future phase:** 4

### ctx-precise-shot-firing-into-melee-elusive-target
- **Severity:** high
- **System:** ranged-attack-penalties
- **Affected examples:** Precise Shot, Elusive Target, Crossfire, Friendly Fire Avoidance, Meat Shield
- **Current evidence:** Precise Shot metadata suppresses firingIntoMeleePenalty, but 0C found no reliable source that applies the base -5 penalty. Elusive Target metadata is manualResolution, which matches user preference because it depends on enemy targeting and melee engagement context.
- **Rule expectation:** Ranged/throwing into melee is -5 unless Precise Shot suppresses it. Elusive Target adds another -5 against the protected target when that target is fighting in melee; GM adjudicated checkbox/reminder is preferred.
- **Context needed:** `firingIntoMelee: true, targetHasElusiveTarget: optional/manual, preciseShotSuppressed: true`
- **Automation boundary:** player checkbox for firing into melee; GM/manual checkbox or reminder for Elusive Target
- **Recommended future phase:** 2

### ctx-aim-deadeye-careful-shot-name-drift
- **Severity:** high
- **System:** aim-context
- **Affected examples:** Careful Shot, Deadeye, Aiming Accuracy, Hunter's Mark, Debilitating Shot, Knockdown Shot, Sniping Master
- **Current evidence:** CombatOptionResolver expects context.aim === true for Careful Shot/Deadeye, while 0C found preroller context uses situational.aiming/charging. talent-enhancements.json also defines aim-triggered talent riders.
- **Rule expectation:** Aimed state should be durable, action-economy backed, consumed by the next qualifying attack, and visible to attack options/talent riders.
- **Context needed:** `aim: true, aimState: aimed, aimTarget optional/GM, consumeAimOnAttack: true`
- **Automation boundary:** automate state and math; GM adjudicates LoS/invalidating interruptions when not modeled
- **Recommended future phase:** 5

### ctx-charge-powerful-charging-fire-drift
- **Severity:** high
- **System:** charge-context
- **Affected examples:** Powerful Charge, Charging Fire, Improved Charge, Deft Charge, Reckless Charge, Maniacal Charge, Slashing Charge, Centerbreaker Charge, Linebreaker Charge
- **Current evidence:** CombatOptionResolver expects context.charge === true. 0C found dialog context may use charging rather than charge. Defense penalties from charge-like options need persistent state handling.
- **Rule expectation:** Charge context should wake charge-gated feats/talents while movement/path legality remains GM/table adjudicated.
- **Context needed:** `charge: true, movementDeclared: true/manual, chargeDefensePenaltyState, attackType melee/ranged for Charging Fire`
- **Automation boundary:** automate roll/defense modifiers; GM adjudicates movement legality and route
- **Recommended future phase:** 5

### ctx-grapple-feats-state-machine
- **Severity:** critical
- **System:** grapple-state-machine
- **Affected examples:** Pin, Trip, Crush, Rancor Crush, Bone Crusher, Throw, Improved Grapple, Grappling Strike, Expert Grappler, Grabber, Entangler, Strong Grab
- **Current evidence:** Feat metadata has GRAPPLE_RIDER entries for Pin/Trip/Crush. 0F found enhanced grappling code exists but uses mismatched gates and state effects; feat-action-listeners has future comments for Rancor Crush/Bone Crusher rather than live hooks.
- **Rule expectation:** Grab/Grapple/Pin are three distinct states with specific escape/action/defense effects. Pin/Trip feat gates allow immediate Grapple upgrade and riders. Attacker succeeds on meet-or-beat in opposed grapple checks.
- **Context needed:** `grappleState: grabbed/grappled/pinned, hasPinOrTripGate, lastGrappleCheckResult, attackerWinsTie: true, lightOrNaturalWeaponException, pinnedLoseDexToReflex`
- **Automation boundary:** assist/automate state math where actors are known; GM adjudicates positioning and special edge cases
- **Recommended future phase:** 6

### ctx-full-attack-dual-multiattack-route
- **Severity:** high
- **System:** full-attack-multiattack
- **Affected examples:** Double Attack, Triple Attack, Dual Weapon Mastery I, Dual Weapon Mastery II, Dual Weapon Mastery III, Two-Weapon Fighting, Multiattack Proficiency (pistols), Multiattack Proficiency (rifles), Hailfire, Twin Shot, Dash and Blast
- **Current evidence:** multi-attack.js and full-attack-executor.js are strong skeletons. 0I found combat action rows can route fullAttack, but action mapping may drop routing fields. Some metadata notes still say future picker/resolver for Multiattack Proficiency.
- **Rule expectation:** Full Attack should be the canonical execution surface for dual/multiattack choices with weapon group choices and penalty reductions.
- **Context needed:** `resolutionMode: fullAttack, primaryWeapon, offhandWeapon optional, selectedDoubleTripleGroup, dualWeaponMode, multiattackProficiencyGroup, attackSequenceSnapshot`
- **Automation boundary:** automate sequence/penalties; players/GM choose targets per attack
- **Recommended future phase:** 3

### ctx-melee-defense-fight-defensively-total-defense-persist
- **Severity:** high
- **System:** defensive-options
- **Affected examples:** Melee Defense, Dodge, Mobility, Acrobatic Dodge, Duck and Cover, Advantageous Cover
- **Current evidence:** Melee Defense metadata produces defenseModifier untilStartOfNextTurn, but 0H found defensive option state persistence is split and Fight Defensively/Total Defense have parallel implementations with Acrobatics mismatch.
- **Rule expectation:** Defensive combat options spend correct actions and create round-limited defense states. Fight Defensively is Standard Action RAW; Acrobatics trained raises +2/+5 to +5/+10.
- **Context needed:** `combatDefenseMode, actionCost: standard unless houserule, acrobaticsTrained, attackPenaltyState, reflexDodgeBonusState, expiresStartNextTurn`
- **Automation boundary:** automate sheet-state/defense math; houserule controls alternate action costs
- **Recommended future phase:** 8

### ctx-reactions-block-deflect-sonic-mixed-damage
- **Severity:** high
- **System:** reactions-deflect-damage-types
- **Affected examples:** Block, Deflect, Redirect Shot, Improved Redirect, Precise Redirect, Force Readiness, Sonic weapon/template effects, Lightsaber Evasion
- **Current evidence:** Reaction registry has Block/Deflect infrastructure. Some talent metadata still says manual mapping. 0G found Sonic requires packet-level handling because ranged Sonic cannot be Deflected and bonus Sonic damage may still apply after normal damage is deflected.
- **Rule expectation:** Reactions should know attack type, weapon type, damage packets, cumulative Use the Force penalties, and whether Sonic prevents/partially bypasses Deflect.
- **Context needed:** `reactionTriggerAttackSnapshot, damagePackets, canBeDeflected per packet, countsAsEnergy, reactionUsesSinceLastTurn, forceReadinessException`
- **Automation boundary:** automate prompts/checks when context exists; GM/manual fallback when attack snapshot lacks packet context
- **Recommended future phase:** 9

### ctx-stun-ion-special-damage-target-gating
- **Severity:** high
- **System:** special-damage
- **Affected examples:** Improved Stun, Set for Stun, Slowing Stun, Take Them Alive, Ion Shielding, Ion Mastery, Ion Resistance 10, Droid Hunter
- **Current evidence:** Threshold engine and damage-resolution-engine have some Stun/Ion hooks; 0G found current system still needs split damage packets and target category gating. Weapon state adapter has Stun/Ion mode card support but attack/damage context preservation is not complete.
- **Rule expectation:** Stun/Ion HP damage is halved while DT checks use original damage. Stun applies to creatures; Ion special effects apply to droids, vehicles, electronics, and cybernetically enhanced creatures.
- **Context needed:** `damageType: stun/ion, originalDamage, hpDamageMultiplier: 0.5, targetCategory, cyberneticEnhanced, dtUsesOriginalDamage`
- **Automation boundary:** automate math when target category known; GM fallback for cybernetics/electronics classification
- **Recommended future phase:** 9

### ctx-healing-repair-bonus-hp-sources
- **Severity:** high
- **System:** healing-repair
- **Affected examples:** Extra Second Wind, Experienced Medic, Wilderness First Aid, Medical Team, Droidcraft, Expert Droid Repair, Battlefield Medic, Extra First Aid, Bolster Ally, Oath of Duty, Force Recovery, Force Repair, Heal Droid
- **Current evidence:** 0J found Second Wind is strongest existing healing subsystem, but Treat Injury/repair/gear requirements are inconsistent and bonus HP needs a canonical model. Several feats/talents are metadata-only skill-use rules until gear/action/use workflows exist.
- **Rule expectation:** Healing, repair, and bonus HP need separate packets: organic HP healing, droid/object repair via Mechanics, persistent condition removal, medpac/tool kit use, bonus HP highest-only stacking and encounter expiration.
- **Context needed:** `healingPacketType, targetCategory, gearRequirement, actionCost/timeCost, oncePer24h keys, bonusHpSource/value/expiration, persistentConditionRemoval`
- **Automation boundary:** assist/automate common HP math; gear stubs until inventory use system is implemented
- **Recommended future phase:** 10

## Context contract recommendation
Future implementation should define a single combat context packet that travels from action card/dialog to attack roll to chat card to damage resolution. Minimum fields needed by this crosswalk:

```js
{
  actionId,
  resolutionMode,
  actionCost,
  attackType,
  attackMode,
  maneuver,
  weaponId,
  targetIds,
  aim,
  charge,
  braced,
  firingIntoMelee,
  areaAttack,
  gmManagedTargets,
  singleTarget,
  ammoCost,
  damagePackets,
  hitOutcomeByTarget,
  defenseStateChanges,
  sourceFeatTalentIds,
  automationBoundary,
}
```

## Audit-only conclusion
Phase 0K confirms that the next implementation phase should not begin by hardcoding individual feat effects. It should begin by preserving and normalizing context so the existing metadata can resolve. The biggest future wins are: attack/action routing contract, attack context builder, full-attack routing, area/damage packet preservation, and state persistence.
