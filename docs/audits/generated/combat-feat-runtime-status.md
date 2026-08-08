# Combat Feat Runtime Status

Generated: 2026-08-07T02:32:22.848Z
Git commit: 214d9fe27a3e25c01bd23eb5a66c813fc41a0fee

**This is a partial audit, not a complete inventory.** ~150 candidate combat-relevant feats were identified (taxonomy bucket "Combat", plus "Weapon & Armor" and "Starship & Vehicle" feats that are actually universal personal-combat feats mis-bucketed — see the architecture doc). Of those, the entries below received individual evidence-based tracing this pass. The single biggest finding: `scripts/engine/feats/register-feat-runtime.js` is the load-bearing import gate for `scripts/engine/feats/`, and roughly half of that directory (~20+ of ~40 files) is never imported by anything reachable from `index.js` — code that looks fully implemented is often inert.

## Totals

- Entries audited: 94
- blocked_missing_shared_infrastructure: 8
- metadata_only: 10
- not_implemented: 26
- runtime_complete: 22
- runtime_partial: 28

## Entries

| Feat | Family | Status | Consumer | Evidence |
|---|---|---|---|---|
| Aiming Accuracy | F | `runtime_partial` | droid-combat-feat-normalization-hooks.js:80-93 (registered, base +5 rule baked into catalog abilityMeta); secondary CT-block rider producer (condition-track-feat-normalization-hooks.js) is orphaned | catalog abilityMeta.rules[0] type ATTACK_OPTION baked in directly (confirmed present in data/feat-catalog.json), so the base +5-next-attack option is live via C… |
| Autofire Assault | C | `not_implemented` | weapon-autofire-feat-normalization-hooks.js + weapon-autofire-rider-runtime-patches.js (both orphaned) | entire family unregistered |
| Autofire Sweep | C | `not_implemented` | weapon-autofire-feat-normalization-hooks.js (orphaned) | entire family unregistered |
| Bantha Rush | E | `runtime_partial` | core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Battering Attack | K | `runtime_partial` | grapple-feat-normalization-hooks.js / grapple-runtime-patches.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Burst Fire | C | `not_implemented` | weapon-autofire-feat-normalization-hooks.js (orphaned) | entire family unregistered |
| Careful Shot | D | `runtime_complete` | core-attack-option-action-economy.js:51,172-179 (registered family) | enforces the Aim-prerequisite spend check directly in the registered family |
| Charging Fire | E | `runtime_complete` | scripts/engine/combat/combat-option-resolver.js DEFAULT_ATTACK_OPTIONS.chargingFire (requiresCharge, ranged, -2 untyped Reflex until start of next turn) | combat-option-resolver.js built-in option definition, live in the confirmed pipeline |
| Collateral Damage | F | `not_implemented` | weapon-armor-rider-runtime-patches.js (orphaned) | same as Hobbling Strike |
| Combat Reflexes | H | `runtime_partial` | core-combat-reaction-normalization-hooks.js + core-combat-reaction-runtime-patches.js (registered, register-feat-runtime.js group 5) | family registered and listens on real hooks (Hooks.on("swse.damageApplied"), Hooks.on("updateActor")) exposed via CoreCombatReactionFeatActions on game.swse; Ao… |
| Crush | K | `runtime_partial` | grapple-feat-normalization-hooks.js / grapple-runtime-patches.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Cunning Attack | I | `metadata_only` | defense-avoidance-runtime-patches.js (orphaned) | same pattern as Trench Warrior |
| Deadeye | D | `runtime_complete` | core-attack-option-action-economy.js:57,172-179 (registered family) | same registered Aim-gated pipeline as Careful Shot |
| Deft Charge | E | `runtime_partial` | core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Destructive Force | B | `blocked_missing_shared_infrastructure` | starship-vehicle-feat-normalization-hooks.js (orphaned) | same vehicle-gunnery family |
| Distracting Droid | F | `runtime_partial` | droid-combat-feat-normalization-hooks.js + droid-combat-runtime-patches.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Double Attack | C | `runtime_partial` | scripts/combat/multi-attack.js (getDoubleAttackGroups) + scripts/engine/combat/features/combat-feature-handlers.js:110-119; extra-die rider in orphaned weapon-armor-rider-runtime-patches.js is inert | Attack-count/penalty mechanic wired via multi-attack.js/combat-feature-handlers.js:110 (real, reached via combat-feature-action-router.js <- squad-actions-init.… |
| Droid Hunter | F | `not_implemented` | legacy-clone-combat-feat-normalization-hooks.js (orphaned) | entire family unregistered |
| Dual Weapon Mastery I | C | `runtime_partial` | dual-weapon-mastery-normalization-hooks.js + dual-wield-runtime-patches.js | family registered; feat-specific line not individually confirmed this pass |
| Dual Weapon Mastery II | C | `runtime_partial` | dual-weapon-mastery-normalization-hooks.js + dual-wield-runtime-patches.js | family registered; feat-specific line not individually confirmed this pass |
| Dual Weapon Mastery III | C | `runtime_partial` | dual-weapon-mastery-normalization-hooks.js + dual-wield-runtime-patches.js | family registered; feat-specific line not individually confirmed this pass |
| Exotic Weapon Proficiency | A | `runtime_complete` | same as Weapon Proficiency | same gating mechanism |
| Extra Second Wind | L | `not_implemented` | second-wind-feat-normalization-hooks.js (orphaned) | label-only entry in an orphaned file; no direct-name-check found in meta-resource-feat-resolver.js (unlike Fast Surge/Vitality Surge/Forceful Recovery) |
| Far Shot | A | `runtime_complete` | scripts/engine/combat/combat-option-resolver.js (getAvailableAttackOptions/collectAttackModifiers, ATTACK_OPTION rule, control:"passive") | data/feat-catalog.json Far Shot abilityMeta.rules[0] = {type:"ATTACK_OPTION",option:"farShot",control:"passive",rangePenaltyAdjustment:"oneStepCloser"}; combat-… |
| Fast Surge | L | `runtime_complete` | meta-resource-feat-resolver.js:308 (direct this.hasFeat(actor,"Fast Surge") check) | meta-resource-feat-resolver.js:308 sets rules.freeAction=true directly by name, bypassing the orphaned normalization sibling entirely |
| Fight Through Pain | A | `runtime_complete` | defense-avoidance-feat-normalization-hooks.js:98,107 -> meta-resource-feat-resolver.js:221 | USE_WILL_AS_BASE rule consumed by meta-resource-feat-resolver.js |
| Flurry | C | `runtime_complete` | core-attack-option-action-economy.js:30 + core-attack-option-runtime-patches.js:118-174 (registered) | filterFlurryOption/allEquippedWeaponsAllowFlurry, real registered family |
| Forceful Recovery | L | `runtime_complete` | meta-resource-feat-resolver.js:988,1010 | meta-resource-feat-resolver.js implements the pending-recovery resolution and chat card directly |
| Grab Back | H | `not_implemented` | unknown-regions-combat-runtime-patches.js (orphaned) | reader function getGrabGrappleReactionRiders exists but is never called by anything |
| Great Cleave | H | `runtime_complete` | core-combat-reaction-normalization-hooks.js:60-61 + core-combat-reaction-runtime-patches.js | "Great Cleave: No Cleave Limit" rule defined and consumed by the registered core-combat-reaction family |
| Great Fortitude | I | `runtime_complete` | defense-avoidance-feat-normalization-hooks.js:48 -> defense-feat-runtime-patches.js (patches ModifierEngine._getFeatModifiers) | defense-avoidance-feat-normalization-hooks.js:48 defenseRules STATIC_DEFENSE_BONUS target defense.fortitude value 2; defense-feat-runtime-patches.js is register… |
| Halt | H | `not_implemented` | unknown-regions-combat-feat-normalization-hooks.js + unknown-regions-combat-runtime-patches.js (both orphaned) | doubly-orphaned: producer and a matching reader method both exist but neither is ever invoked/registered |
| Hobbling Strike | F | `not_implemented` | weapon-armor-rider-runtime-patches.js (orphaned) | dice-math-looking code present but registerWeaponArmorRiderRuntimePatches() never called |
| Impetuous Move | L | `not_implemented` | second-wind-feat-normalization-hooks.js (orphaned) | label-only entry, no direct-check found |
| Improved Bantha Rush | E | `runtime_partial` | core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Improved Charge | E | `runtime_partial` | core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Improved Damage Threshold | A | `runtime_complete` | defense-avoidance-feat-normalization-hooks.js:78,86 -> meta-resource-feat-resolver.js:197-200 | resourceRules.damageThreshold FLAT_BONUS value 5, consumed by meta-resource-feat-resolver.js (registered family) |
| Ion Shielding | F | `metadata_only` | condition-track-feat-normalization-hooks.js (orphaned) | CAP_ION_DAMAGE_CT_TO_1_STEP rule producer never runs |
| Knock Heads | H | `runtime_partial` | grapple-feat-normalization-hooks.js + grapple-feat-actions.js (registered family) | referenced in both registered grapple-family files; feat-specific line not individually confirmed this pass |
| Lightning Draw | L | `metadata_only` | attack-options-feat-normalization-hooks.js (registered, normalization only) -> action-speed-runtime-patches.js (orphaned) | execution logic exists but its file is never imported |
| Lightning Reflexes | I | `runtime_complete` | defense-avoidance-feat-normalization-hooks.js:61 -> defense-feat-runtime-patches.js | same pipeline as Great Fortitude, target defense.reflex |
| Long Haft Strike | F | `not_implemented` | not located this pass | no consumer found in files surveyed |
| Martial Arts I | A | `not_implemented` | martial-arts-feat-normalization-hooks.js:61-69 (orphaned) | entire family unregistered |
| Martial Arts II | A | `not_implemented` | martial-arts-feat-normalization-hooks.js (orphaned) | entire family unregistered |
| Martial Arts III | A | `not_implemented` | martial-arts-feat-normalization-hooks.js (orphaned) | entire family unregistered |
| Mechanical Martial Arts | F | `runtime_partial` | droid-combat-feat-normalization-hooks.js + droid-combat-runtime-patches.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Melee Defense | E | `runtime_partial` | core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Mighty Swing | C | `runtime_partial` | core-attack-option-normalization-hooks.js / core-attack-option-action-economy.js (registered family) | family registered; feat-specific dice-modifier line not individually confirmed this pass |
| Mounted Defense | I | `blocked_missing_shared_infrastructure` | starship-vehicle-feat-normalization-hooks.js (orphaned) | same vehicle-gunnery family |
| Moving Target | I | `metadata_only` | defense-avoidance-runtime-patches.js (orphaned) | rule type ACTIVATED_DEFENSE_RIDER; resolveMovingTargetRiders() never called externally |
| Multi-Grab | K | `runtime_complete` | grapple-feat-actions.js:120,149,162 (registered family) | grapple-feat-actions.js:120-162 implements Multi-Grab directly, family registered register-feat-runtime.js group 1 |
| Multi-Targeting | F | `runtime_partial` | droid-combat-feat-normalization-hooks.js + droid-combat-runtime-patches.js (registered family) | family registered (register-feat-runtime.js group 3); feat-specific line not individually confirmed this pass |
| Pin | K | `runtime_partial` | grapple-feat-normalization-hooks.js / grapple-runtime-patches.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Pincer | K | `runtime_partial` | grapple-feat-actions.js / grapple-runtime-patches.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Point-Blank Shot | A | `runtime_complete` | scripts/engine/feat/scoped-combat-feat-resolver.js (hardcoded point-blank-shot branch) | scoped-combat-feat-resolver.js explicitFeatBonus(): +1 attack/damage when isRangedWeapon && isPointBlankContext; summed via combat-roll-math.js:467/591 |
| Powerful Charge | E | `runtime_complete` | scripts/engine/combat/combat-option-resolver.js DEFAULT_ATTACK_OPTIONS.powerfulCharge (requiresCharge, +2 attack, +half-level damage) | combat-option-resolver.js built-in option definition, requiresCharge gated, live in the confirmed collectAttackModifiers pipeline |
| Precise Shot | A | `runtime_complete` | scripts/engine/combat/combat-roll-math.js:198 (direct actorHasFeatNamed check) + combat-option-resolver.js ATTACK_OPTION rule | combat-roll-math.js:198 actorHasFeatNamed(actor,"Precise Shot") suppresses firing-into-melee penalty directly in the SSOT; catalog also carries a matching ATTAC… |
| Predictive Defense | I | `metadata_only` | defense-avoidance-runtime-patches.js (orphaned) | rule type DEFENSE_ABILITY_SUBSTITUTION_ADVISORY; same orphaned/uncalled consumer as Tumble Defense |
| Quick Draw | L | `runtime_partial` | attack-options-feat-normalization-hooks.js:74-121 (registered family) | family registered; the normalization file's own comment at line 121 says the combined draw+attack workflow needs validation — this audit did not confirm a separ… |
| Rancor Crush | K | `runtime_complete` | grapple-runtime-patches.js:271 (ActorEngine.applyConditionShift) | grapple-runtime-patches.js:271 directly applies a condition-track shift via ActorEngine, registered family |
| Rapid Reaction | H | `not_implemented` | not located this pass | no consumer found in files surveyed |
| Rapid Shot | C | `runtime_complete` | core-attack-option-action-economy.js + core-attack-option-runtime-patches.js:145 (registered family) | core-attack-option-runtime-patches.js:145 applies "Rapid Shot: Strength below 13" attack penalty via the registered CombatOptionResolver patch |
| Rapid Strike | C | `not_implemented` | weapon-armor-rider-normalization-hooks.js (orphaned), force-scoundrel-combat-feat-normalization-hooks.js (orphaned) | only referenced inside two orphaned families |
| Recovering Surge | L | `not_implemented` | second-wind-feat-normalization-hooks.js (orphaned) | label-only entry, no direct-check found |
| Resilient Strength | I | `metadata_only` | defense-avoidance-runtime-patches.js (orphaned) | DEFENSE_ABILITY_SUBSTITUTION_ADVISORY-family rule; same orphaned consumer |
| Resurgence | L | `not_implemented` | second-wind-feat-normalization-hooks.js (orphaned) | label-only entry, no direct-check found |
| Return Fire | H | `not_implemented` | return-fire-feat-normalization-hooks.js + return-fire-runtime-patches.js (both orphaned) | choiceMeta-scoped feat with a fully-built dialog prompt path but zero live effect — neither file is registered |
| Running Attack | E | `runtime_partial` | core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Savage Attack | F | `not_implemented` | weapon-armor-rider-runtime-patches.js (orphaned) | same as Hobbling Strike |
| Slammer | K | `runtime_partial` | grapple-feat-actions.js / grapple-runtime-patches.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Sniper Shot | A | `blocked_missing_shared_infrastructure` | starship-vehicle-feat-normalization-hooks.js (orphaned) | same vehicle-gunnery family |
| Sport Hunter | G | `not_implemented` | sport-hunter-normalization-hooks.js + sport-hunter-runtime-patches.js (both orphaned) | damageDiceRerolls logic present but registration function never called |
| Staggering Attack | F | `not_implemented` | weapon-armor-rider-runtime-patches.js (orphaned) | same as Hobbling Strike |
| Starship Tactics | L | `blocked_missing_shared_infrastructure` | starship-vehicle-feat-normalization-hooks.js (orphaned) | same vehicle-gunnery family; also carries choiceMeta.resolution:"grant_entitlement" (deferred grant pool) |
| Tactical Genius | L | `blocked_missing_shared_infrastructure` | starship-vehicle-feat-normalization-hooks.js (orphaned) | same vehicle-gunnery family |
| Throw | K | `runtime_partial` | grapple-feat-normalization-hooks.js (registered) for the base grapple maneuver; force-scoundrel-combat-feat-normalization-hooks.js (orphaned) for an "Angled Throw" rider | base mechanic real via registered grapple family; Angled Throw rider inert |
| Tool Frenzy | L | `runtime_partial` | droid-combat-feat-normalization-hooks.js:360-379 (registered family) | actionName defined and family registered; usage-limit enforcement not individually confirmed this pass (see Phase 14) |
| Trench Warrior | I | `metadata_only` | defense-avoidance-runtime-patches.js (orphaned) | ATTACK_ADVISORY_OPTION rule; applySelectedAttackAdvisoryBonuses() depends on context.selectedAdvisoryOptions, which nothing in the live attack pipeline ever pop… |
| Trip | K | `runtime_partial` | grapple-feat-normalization-hooks.js / grapple-runtime-patches.js (registered family) | family registered; feat-specific line not individually confirmed this pass |
| Triple Attack | C | `runtime_partial` | scripts/combat/multi-attack.js (getTripleAttackGroups) + combat-feature-handlers.js:120-125 | same split as Double Attack: attack-count real, any extra-die rider inert |
| Triple Crit | G | `not_implemented` | weapon-leftover-feat-normalization-hooks.js (orphaned) | tripleCritRules() built but the whole file is unregistered |
| Triple Crit Specialist | G | `not_implemented` | weapon-leftover-feat-normalization-hooks.js (orphaned) | same as Triple Crit |
| Tumble Defense | I | `metadata_only` | defense-avoidance-runtime-patches.js (orphaned — never imported by register-feat-runtime.js or any other file) | rule type TUMBLE_DC_RIDER defined at defense-avoidance-feat-normalization-hooks.js; only reader is defense-avoidance-runtime-patches.js, confirmed unregistered |
| Two-Weapon Fighting | C | `runtime_partial` | dual-weapon-mastery-normalization-hooks.js + dual-wield-runtime-patches.js (both registered, register-feat-runtime.js:55-56,124-126) | family is wired; this task did not individually line-trace the specific dice/penalty math for this exact feat name within the family — classified runtime_partia… |
| Unified Squadron | L | `blocked_missing_shared_infrastructure` | starship-vehicle-feat-normalization-hooks.js (orphaned) | same vehicle-gunnery family |
| Unstoppable Combatant | L | `not_implemented` | second-wind-feat-normalization-hooks.js (orphaned) | label-only entry, no direct-check found |
| Vehicular Combat | A | `blocked_missing_shared_infrastructure` | starship-vehicle-feat-normalization-hooks.js (orphaned) | same vehicle-gunnery family |
| Vitality Surge | L | `runtime_complete` | meta-resource-feat-resolver.js:307 (direct name check) | rules.allowAboveHalfHp=true set directly by name |
| Wary Defender | I | `metadata_only` | defense-avoidance-runtime-patches.js (orphaned) | FIGHT_DEFENSIVELY_DEFENSE_RIDER rule; resolveFightDefensivelyRiders() never called externally |
| Weapon Focus | A | `runtime_complete` | scripts/engine/feat/scoped-combat-feat-resolver.js (ScopedCombatFeatResolver.getBonus), wired into scripts/engine/combat/combat-roll-math.js:467 resolveAttackBonus | combat-roll-math.js:467 scopedFeatBonus summed into attack total; scoped-combat-feat-resolver.js explicitFeatBonus() matches weapon-focus name + weaponMatchesSe… |
| Weapon Proficiency | A | `runtime_complete` | gates ScopedCombatFeatResolver/weaponMatchesSelectedChoice for other feats via actor item presence; not itself a modifier source | existence as an owned item with the correct system.selectedChoice is what other feats (Weapon Focus, etc.) check via FeatChoiceResolver-derived matching — the f… |
| Whirlwind Attack | C | `metadata_only` | area-explosives-feat-normalization-hooks.js (registered, normalization only) -> area-explosives-runtime-patches.js (orphaned) | normalization is registered but its runtime-patches consumer is never imported |
| Withdrawal Strike | J | `not_implemented` | remaining-weapon-armor-feat-normalization-hooks.js (orphaned) | only reference found repo-wide is inside the orphaned remaining-weapon-armor-feat-normalization-hooks.js |
| Zero Range | A | `blocked_missing_shared_infrastructure` | starship-vehicle-feat-normalization-hooks.js (orphaned) | starship/vehicle gunnery family entirely unregistered |

Full evidence/notes/missingInfrastructure text for every entry: see the JSON report.

