#!/usr/bin/env node

/**
 * generate-combat-feat-runtime-status.mjs — Combat Feat Runtime Mechanics
 * Audit, Phase 1. Assembles docs/audits/generated/combat-feat-runtime-status.{json,md}
 * from a hand-curated classification data set (COMBAT_FEAT_STATUS below).
 *
 * This is NOT a static-analysis tool: whether a feat's mechanic actually
 * executes at runtime required manually tracing production code (which
 * catalog metadata shape a feat uses, which of several competing consumer
 * files is actually imported from index.js, whether a "runtime-patches"
 * file's registration function is ever called). That tracing was done by
 * hand/agent research for this audit; this script only (a) validates every
 * entry against the live catalog and validity registry so no invalid or
 * hallucinated feat name can enter the report, and (b) renders the report
 * in the schema this task's audit requires.
 *
 *   node tools/generate-combat-feat-runtime-status.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const catalogPath = path.join(repoRoot, 'data', 'feat-catalog.json');
const registryPath = path.join(repoRoot, 'data', 'feat-validity-registry.json');
const outJsonPath = path.join(repoRoot, 'docs', 'audits', 'generated', 'combat-feat-runtime-status.json');
const outMdPath = path.join(repoRoot, 'docs', 'audits', 'generated', 'combat-feat-runtime-status.md');

function gitCommit() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot }).toString().trim(); }
  catch { return null; }
}

const VALID_STATUSES = new Set([
  'runtime_complete',
  'runtime_partial',
  'metadata_only',
  'manual_by_design',
  'blocked_missing_shared_infrastructure',
  'not_implemented',
  'source_review_required',
]);

// ---------------------------------------------------------------------
// Classification data set.
//
// Field meaning:
//   name                 canonical feat name (must exist in data/feat-catalog.json)
//   mechanicFamily        one of the Phase 3 families (A-L letter code, see doc)
//   currentConsumer       file(s) that actually execute the mechanic, or the
//                         orphaned file(s) that WOULD if registered
//   runtimeStatus         one of VALID_STATUSES
//   evidence              file:line or "verified via harness probe" citation
//   missingInfrastructure only set when runtimeStatus is
//                         blocked_missing_shared_infrastructure
//   notes                 concise, honest caveat on confidence where relevant
// ---------------------------------------------------------------------
const COMBAT_FEAT_STATUS = [
  // --- A. Static/conditional attack modifiers — verified directly this task ---
  { name: 'Weapon Focus', mechanicFamily: 'A', currentConsumer: 'scripts/engine/feat/scoped-combat-feat-resolver.js (ScopedCombatFeatResolver.getBonus), wired into scripts/engine/combat/combat-roll-math.js:467 resolveAttackBonus', runtimeStatus: 'runtime_complete', evidence: 'combat-roll-math.js:467 scopedFeatBonus summed into attack total; scoped-combat-feat-resolver.js explicitFeatBonus() matches weapon-focus name + weaponMatchesSelectedChoice(item, weapon) reading system.selectedChoice; verified via harness probe: matching weapon +1, mismatched weapon +0', notes: 'Uses the canonical system.selectedChoice choice contract correctly.' },
  { name: 'Point-Blank Shot', mechanicFamily: 'A', currentConsumer: 'scripts/engine/feat/scoped-combat-feat-resolver.js (hardcoded point-blank-shot branch)', runtimeStatus: 'runtime_complete', evidence: 'scoped-combat-feat-resolver.js explicitFeatBonus(): +1 attack/damage when isRangedWeapon && isPointBlankContext; summed via combat-roll-math.js:467/591', notes: 'Also carries a second, unconsumed abilityMeta.modifiers[] block (predicates/mechanicsMode shape) in the catalog — the real effect comes from ScopedCombatFeatResolver, not that block. See "duplicate metadata shapes" note in the architecture doc.' },
  { name: 'Far Shot', mechanicFamily: 'A', currentConsumer: 'scripts/engine/combat/combat-option-resolver.js (getAvailableAttackOptions/collectAttackModifiers, ATTACK_OPTION rule, control:"passive")', runtimeStatus: 'runtime_complete', evidence: 'data/feat-catalog.json Far Shot abilityMeta.rules[0] = {type:"ATTACK_OPTION",option:"farShot",control:"passive",rangePenaltyAdjustment:"oneStepCloser"}; combat-option-resolver.js getRangePenaltyAdjustment() applies it; passive options are always active once the feat item is owned (hydrateOption: control==="passive" => checked:true)', notes: 'Mis-bucketed under taxonomy "Starship & Vehicle / Gunnery & Weapons" despite being a universal personal-combat feat — see Phase 1 taxonomy-reliability note.' },
  { name: 'Precise Shot', mechanicFamily: 'A', currentConsumer: 'scripts/engine/combat/combat-roll-math.js:198 (direct actorHasFeatNamed check) + combat-option-resolver.js ATTACK_OPTION rule', runtimeStatus: 'runtime_complete', evidence: 'combat-roll-math.js:198 actorHasFeatNamed(actor,"Precise Shot") suppresses firing-into-melee penalty directly in the SSOT; catalog also carries a matching ATTACK_OPTION rule (option:"preciseShot", suppresses:["firingIntoMeleePenalty"])', notes: 'Mis-bucketed under "Starship & Vehicle / Pilot & Maneuvers".' },
  { name: 'Great Fortitude', mechanicFamily: 'I', currentConsumer: 'defense-avoidance-feat-normalization-hooks.js:48 -> defense-feat-runtime-patches.js (patches ModifierEngine._getFeatModifiers)', runtimeStatus: 'runtime_complete', evidence: 'defense-avoidance-feat-normalization-hooks.js:48 defenseRules STATIC_DEFENSE_BONUS target defense.fortitude value 2; defense-feat-runtime-patches.js is registered in register-feat-runtime.js', notes: '' },
  { name: 'Lightning Reflexes', mechanicFamily: 'I', currentConsumer: 'defense-avoidance-feat-normalization-hooks.js:61 -> defense-feat-runtime-patches.js', runtimeStatus: 'runtime_complete', evidence: 'same pipeline as Great Fortitude, target defense.reflex', notes: '' },
  { name: 'Improved Damage Threshold', mechanicFamily: 'A', currentConsumer: 'defense-avoidance-feat-normalization-hooks.js:78,86 -> meta-resource-feat-resolver.js:197-200', runtimeStatus: 'runtime_complete', evidence: 'resourceRules.damageThreshold FLAT_BONUS value 5, consumed by meta-resource-feat-resolver.js (registered family)', notes: '' },
  { name: 'Fight Through Pain', mechanicFamily: 'A', currentConsumer: 'defense-avoidance-feat-normalization-hooks.js:98,107 -> meta-resource-feat-resolver.js:221', runtimeStatus: 'runtime_complete', evidence: 'USE_WILL_AS_BASE rule consumed by meta-resource-feat-resolver.js', notes: '' },

  // --- A/I. Defense-avoidance riders — real consumer file is orphaned ---
  { name: 'Tumble Defense', mechanicFamily: 'I', currentConsumer: 'defense-avoidance-runtime-patches.js (orphaned — never imported by register-feat-runtime.js or any other file)', runtimeStatus: 'metadata_only', evidence: 'rule type TUMBLE_DC_RIDER defined at defense-avoidance-feat-normalization-hooks.js; only reader is defense-avoidance-runtime-patches.js, confirmed unregistered', missingInfrastructure: '', notes: 'Even if registered, resolveTumbleDefenseRiders() is never called by anything else in the repo (verified: repo-wide grep found zero external callers) — registering the file alone would not surface this to players.' },
  { name: 'Predictive Defense', mechanicFamily: 'I', currentConsumer: 'defense-avoidance-runtime-patches.js (orphaned)', runtimeStatus: 'metadata_only', evidence: 'rule type DEFENSE_ABILITY_SUBSTITUTION_ADVISORY; same orphaned/uncalled consumer as Tumble Defense', notes: '' },
  { name: 'Moving Target', mechanicFamily: 'I', currentConsumer: 'defense-avoidance-runtime-patches.js (orphaned)', runtimeStatus: 'metadata_only', evidence: 'rule type ACTIVATED_DEFENSE_RIDER; resolveMovingTargetRiders() never called externally', notes: '' },
  { name: 'Trench Warrior', mechanicFamily: 'I', currentConsumer: 'defense-avoidance-runtime-patches.js (orphaned)', runtimeStatus: 'metadata_only', evidence: 'ATTACK_ADVISORY_OPTION rule; applySelectedAttackAdvisoryBonuses() depends on context.selectedAdvisoryOptions, which nothing in the live attack pipeline ever populates', notes: '' },
  { name: 'Cunning Attack', mechanicFamily: 'I', currentConsumer: 'defense-avoidance-runtime-patches.js (orphaned)', runtimeStatus: 'metadata_only', evidence: 'same pattern as Trench Warrior', notes: '' },
  { name: 'Resilient Strength', mechanicFamily: 'I', currentConsumer: 'defense-avoidance-runtime-patches.js (orphaned)', runtimeStatus: 'metadata_only', evidence: 'DEFENSE_ABILITY_SUBSTITUTION_ADVISORY-family rule; same orphaned consumer', notes: '' },
  { name: 'Wary Defender', mechanicFamily: 'I', currentConsumer: 'defense-avoidance-runtime-patches.js (orphaned)', runtimeStatus: 'metadata_only', evidence: 'FIGHT_DEFENSIVELY_DEFENSE_RIDER rule; resolveFightDefensivelyRiders() never called externally', notes: '' },

  // --- C. Full-attack / multiattack ---
  { name: 'Double Attack', mechanicFamily: 'C', currentConsumer: 'scripts/combat/multi-attack.js (getDoubleAttackGroups) + scripts/engine/combat/features/combat-feature-handlers.js:110-119; extra-die rider in orphaned weapon-armor-rider-runtime-patches.js is inert', runtimeStatus: 'runtime_partial', evidence: 'Attack-count/penalty mechanic wired via multi-attack.js/combat-feature-handlers.js:110 (real, reached via combat-feature-action-router.js <- squad-actions-init.js <- index.js); the "+1 weapon die on subsequent hits" rider (weapon-armor-rider-normalization-hooks.js:70) has no live consumer', missingInfrastructure: '', notes: 'Mis-bucketed under "Starship & Vehicle / Gunnery & Weapons". Weapon-scope enforcement (system.selectedChoice matching) for this specific mechanic needs the direct verification in Phase 6/13 of this audit before claiming full correctness — see architecture doc weapon-group-matching fragmentation note.' },
  { name: 'Triple Attack', mechanicFamily: 'C', currentConsumer: 'scripts/combat/multi-attack.js (getTripleAttackGroups) + combat-feature-handlers.js:120-125', runtimeStatus: 'runtime_partial', evidence: 'same split as Double Attack: attack-count real, any extra-die rider inert', notes: 'Mis-bucketed under "Starship & Vehicle / Gunnery & Weapons".' },
  { name: 'Rapid Shot', mechanicFamily: 'C', currentConsumer: 'core-attack-option-action-economy.js + core-attack-option-runtime-patches.js:145 (registered family)', runtimeStatus: 'runtime_complete', evidence: 'core-attack-option-runtime-patches.js:145 applies "Rapid Shot: Strength below 13" attack penalty via the registered CombatOptionResolver patch', notes: '' },
  { name: 'Rapid Strike', mechanicFamily: 'C', currentConsumer: 'weapon-armor-rider-normalization-hooks.js (orphaned), force-scoundrel-combat-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'only referenced inside two orphaned families', notes: '' },
  { name: 'Flurry', mechanicFamily: 'C', currentConsumer: 'core-attack-option-action-economy.js:30 + core-attack-option-runtime-patches.js:118-174 (registered)', runtimeStatus: 'runtime_complete', evidence: 'filterFlurryOption/allEquippedWeaponsAllowFlurry, real registered family', notes: '' },
  { name: 'Whirlwind Attack', mechanicFamily: 'C', currentConsumer: 'area-explosives-feat-normalization-hooks.js (registered, normalization only) -> area-explosives-runtime-patches.js (orphaned)', runtimeStatus: 'metadata_only', evidence: 'normalization is registered but its runtime-patches consumer is never imported', notes: '' },
  { name: 'Two-Weapon Fighting', mechanicFamily: 'C', currentConsumer: 'dual-weapon-mastery-normalization-hooks.js + dual-wield-runtime-patches.js (both registered, register-feat-runtime.js:55-56,124-126)', runtimeStatus: 'runtime_partial', evidence: 'family is wired; this task did not individually line-trace the specific dice/penalty math for this exact feat name within the family — classified runtime_partial pending that trace rather than claimed complete without it', notes: 'High confidence the family executes; feat-specific line not confirmed this pass.' },
  { name: 'Dual Weapon Mastery I', mechanicFamily: 'C', currentConsumer: 'dual-weapon-mastery-normalization-hooks.js + dual-wield-runtime-patches.js', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Dual Weapon Mastery II', mechanicFamily: 'C', currentConsumer: 'dual-weapon-mastery-normalization-hooks.js + dual-wield-runtime-patches.js', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Dual Weapon Mastery III', mechanicFamily: 'C', currentConsumer: 'dual-weapon-mastery-normalization-hooks.js + dual-wield-runtime-patches.js', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Autofire Assault', mechanicFamily: 'C', currentConsumer: 'weapon-autofire-feat-normalization-hooks.js + weapon-autofire-rider-runtime-patches.js (both orphaned)', runtimeStatus: 'not_implemented', evidence: 'entire family unregistered', notes: '' },
  { name: 'Autofire Sweep', mechanicFamily: 'C', currentConsumer: 'weapon-autofire-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'entire family unregistered', notes: '' },
  { name: 'Burst Fire', mechanicFamily: 'C', currentConsumer: 'weapon-autofire-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'entire family unregistered', notes: '' },
  { name: 'Mighty Swing', mechanicFamily: 'C', currentConsumer: 'core-attack-option-normalization-hooks.js / core-attack-option-action-economy.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific dice-modifier line not individually confirmed this pass', notes: '' },

  // --- F. Condition-track riders ---
  { name: 'Aiming Accuracy', mechanicFamily: 'F', currentConsumer: 'droid-combat-feat-normalization-hooks.js:80-93 (registered, base +5 rule baked into catalog abilityMeta); secondary CT-block rider producer (condition-track-feat-normalization-hooks.js) is orphaned', runtimeStatus: 'runtime_partial', evidence: 'catalog abilityMeta.rules[0] type ATTACK_OPTION baked in directly (confirmed present in data/feat-catalog.json), so the base +5-next-attack option is live via CombatOptionResolver; the "blocks target Recover after Aiming Accuracy damage" rider (type PREVENT_TARGET_RECOVER_AFTER_AIMING_ACCURACY_DAMAGE) has a real reader at scripts/engine/combat/damage-resolution-engine.js:261-271 but its producer (condition-track-feat-normalization-hooks.js) is orphaned and the static catalog does not bake that specific rule in either', notes: 'Split feat: base option works, CT-block rider does not.' },
  { name: 'Ion Shielding', mechanicFamily: 'F', currentConsumer: 'condition-track-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'metadata_only', evidence: 'CAP_ION_DAMAGE_CT_TO_1_STEP rule producer never runs', notes: '' },
  { name: 'Halt', mechanicFamily: 'H', currentConsumer: 'unknown-regions-combat-feat-normalization-hooks.js + unknown-regions-combat-runtime-patches.js (both orphaned)', runtimeStatus: 'not_implemented', evidence: 'doubly-orphaned: producer and a matching reader method both exist but neither is ever invoked/registered', notes: '' },
  { name: 'Hobbling Strike', mechanicFamily: 'F', currentConsumer: 'weapon-armor-rider-runtime-patches.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'dice-math-looking code present but registerWeaponArmorRiderRuntimePatches() never called', notes: '' },
  { name: 'Staggering Attack', mechanicFamily: 'F', currentConsumer: 'weapon-armor-rider-runtime-patches.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'same as Hobbling Strike', notes: 'See docs/audits/generated/feat-primary-source-review-queue.md — this feat also has a catalog-vs-authority prerequisite text conflict from the prior phase (unrelated to runtime status).' },
  { name: 'Savage Attack', mechanicFamily: 'F', currentConsumer: 'weapon-armor-rider-runtime-patches.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'same as Hobbling Strike', notes: '' },
  { name: 'Collateral Damage', mechanicFamily: 'F', currentConsumer: 'weapon-armor-rider-runtime-patches.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'same as Hobbling Strike', notes: '' },
  { name: 'Multi-Targeting', mechanicFamily: 'F', currentConsumer: 'droid-combat-feat-normalization-hooks.js + droid-combat-runtime-patches.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered (register-feat-runtime.js group 3); feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Withdrawal Strike', mechanicFamily: 'J', currentConsumer: 'remaining-weapon-armor-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'only reference found repo-wide is inside the orphaned remaining-weapon-armor-feat-normalization-hooks.js', notes: '' },
  { name: 'Long Haft Strike', mechanicFamily: 'F', currentConsumer: 'not located this pass', runtimeStatus: 'not_implemented', evidence: 'no consumer found in files surveyed', notes: '' },
  { name: 'Droid Hunter', mechanicFamily: 'F', currentConsumer: 'legacy-clone-combat-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'entire family unregistered', notes: '' },
  { name: 'Mechanical Martial Arts', mechanicFamily: 'F', currentConsumer: 'droid-combat-feat-normalization-hooks.js + droid-combat-runtime-patches.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Distracting Droid', mechanicFamily: 'F', currentConsumer: 'droid-combat-feat-normalization-hooks.js + droid-combat-runtime-patches.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Tool Frenzy', mechanicFamily: 'L', currentConsumer: 'droid-combat-feat-normalization-hooks.js:360-379 (registered family)', runtimeStatus: 'runtime_partial', evidence: 'actionName defined and family registered; usage-limit enforcement not individually confirmed this pass (see Phase 14)', notes: '' },

  // --- G. Reroll / crit ---
  { name: 'Triple Crit', mechanicFamily: 'G', currentConsumer: 'weapon-leftover-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'tripleCritRules() built but the whole file is unregistered', notes: '' },
  { name: 'Triple Crit Specialist', mechanicFamily: 'G', currentConsumer: 'weapon-leftover-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'same as Triple Crit', notes: '' },
  { name: 'Sport Hunter', mechanicFamily: 'G', currentConsumer: 'sport-hunter-normalization-hooks.js + sport-hunter-runtime-patches.js (both orphaned)', runtimeStatus: 'not_implemented', evidence: 'damageDiceRerolls logic present but registration function never called', notes: '' },

  // --- H. Reaction / interrupt ---
  { name: 'Combat Reflexes', mechanicFamily: 'H', currentConsumer: 'core-combat-reaction-normalization-hooks.js + core-combat-reaction-runtime-patches.js (registered, register-feat-runtime.js group 5)', runtimeStatus: 'runtime_partial', evidence: 'family registered and listens on real hooks (Hooks.on("swse.damageApplied"), Hooks.on("updateActor")) exposed via CoreCombatReactionFeatActions on game.swse; AoO-count-specific line not individually confirmed this pass', notes: '' },
  { name: 'Great Cleave', mechanicFamily: 'H', currentConsumer: 'core-combat-reaction-normalization-hooks.js:60-61 + core-combat-reaction-runtime-patches.js', runtimeStatus: 'runtime_complete', evidence: '"Great Cleave: No Cleave Limit" rule defined and consumed by the registered core-combat-reaction family', notes: '' },
  { name: 'Return Fire', mechanicFamily: 'H', currentConsumer: 'return-fire-feat-normalization-hooks.js + return-fire-runtime-patches.js (both orphaned)', runtimeStatus: 'not_implemented', evidence: 'choiceMeta-scoped feat with a fully-built dialog prompt path but zero live effect — neither file is registered', notes: 'Notable: this feat has real, correct scoped-choice metadata (Phase 2 of the prior task would recognize it) but zero runtime execution — a clean example of choice-persistence being solved while the mechanic itself remains unimplemented.' },
  { name: 'Grab Back', mechanicFamily: 'H', currentConsumer: 'unknown-regions-combat-runtime-patches.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'reader function getGrabGrappleReactionRiders exists but is never called by anything', notes: '' },
  { name: 'Rapid Reaction', mechanicFamily: 'H', currentConsumer: 'not located this pass', runtimeStatus: 'not_implemented', evidence: 'no consumer found in files surveyed', notes: '' },
  { name: 'Knock Heads', mechanicFamily: 'H', currentConsumer: 'grapple-feat-normalization-hooks.js + grapple-feat-actions.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'referenced in both registered grapple-family files; feat-specific line not individually confirmed this pass', notes: '' },

  // --- K. Grapple family (weapon-scoped/action-based) ---
  { name: 'Multi-Grab', mechanicFamily: 'K', currentConsumer: 'grapple-feat-actions.js:120,149,162 (registered family)', runtimeStatus: 'runtime_complete', evidence: 'grapple-feat-actions.js:120-162 implements Multi-Grab directly, family registered register-feat-runtime.js group 1', notes: '' },
  { name: 'Pincer', mechanicFamily: 'K', currentConsumer: 'grapple-feat-actions.js / grapple-runtime-patches.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Slammer', mechanicFamily: 'K', currentConsumer: 'grapple-feat-actions.js / grapple-runtime-patches.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Battering Attack', mechanicFamily: 'K', currentConsumer: 'grapple-feat-normalization-hooks.js / grapple-runtime-patches.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Throw', mechanicFamily: 'K', currentConsumer: 'grapple-feat-normalization-hooks.js (registered) for the base grapple maneuver; force-scoundrel-combat-feat-normalization-hooks.js (orphaned) for an "Angled Throw" rider', runtimeStatus: 'runtime_partial', evidence: 'base mechanic real via registered grapple family; Angled Throw rider inert', notes: '' },
  { name: 'Trip', mechanicFamily: 'K', currentConsumer: 'grapple-feat-normalization-hooks.js / grapple-runtime-patches.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Crush', mechanicFamily: 'K', currentConsumer: 'grapple-feat-normalization-hooks.js / grapple-runtime-patches.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Pin', mechanicFamily: 'K', currentConsumer: 'grapple-feat-normalization-hooks.js / grapple-runtime-patches.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Rancor Crush', mechanicFamily: 'K', currentConsumer: 'grapple-runtime-patches.js:271 (ActorEngine.applyConditionShift)', runtimeStatus: 'runtime_complete', evidence: 'grapple-runtime-patches.js:271 directly applies a condition-track shift via ActorEngine, registered family', notes: '' },

  // --- Action economy / activated ---
  { name: 'Quick Draw', mechanicFamily: 'L', currentConsumer: 'attack-options-feat-normalization-hooks.js:74-121 (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; the normalization file\'s own comment at line 121 says the combined draw+attack workflow needs validation — this audit did not confirm a separate action-economy consumer enforcing the actual combined action', notes: '' },
  { name: 'Lightning Draw', mechanicFamily: 'L', currentConsumer: 'attack-options-feat-normalization-hooks.js (registered, normalization only) -> action-speed-runtime-patches.js (orphaned)', runtimeStatus: 'metadata_only', evidence: 'execution logic exists but its file is never imported', notes: '' },
  { name: 'Careful Shot', mechanicFamily: 'D', currentConsumer: 'core-attack-option-action-economy.js:51,172-179 (registered family)', runtimeStatus: 'runtime_complete', evidence: 'enforces the Aim-prerequisite spend check directly in the registered family', notes: '' },
  { name: 'Deadeye', mechanicFamily: 'D', currentConsumer: 'core-attack-option-action-economy.js:57,172-179 (registered family)', runtimeStatus: 'runtime_complete', evidence: 'same registered Aim-gated pipeline as Careful Shot', notes: '' },
  { name: 'Improved Charge', mechanicFamily: 'E', currentConsumer: 'core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Powerful Charge', mechanicFamily: 'E', currentConsumer: 'scripts/engine/combat/combat-option-resolver.js DEFAULT_ATTACK_OPTIONS.powerfulCharge (requiresCharge, +2 attack, +half-level damage)', runtimeStatus: 'runtime_complete', evidence: 'combat-option-resolver.js built-in option definition, requiresCharge gated, live in the confirmed collectAttackModifiers pipeline', notes: '' },
  { name: 'Bantha Rush', mechanicFamily: 'E', currentConsumer: 'core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Improved Bantha Rush', mechanicFamily: 'E', currentConsumer: 'core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Deft Charge', mechanicFamily: 'E', currentConsumer: 'core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Charging Fire', mechanicFamily: 'E', currentConsumer: 'scripts/engine/combat/combat-option-resolver.js DEFAULT_ATTACK_OPTIONS.chargingFire (requiresCharge, ranged, -2 untyped Reflex until start of next turn)', runtimeStatus: 'runtime_complete', evidence: 'combat-option-resolver.js built-in option definition, live in the confirmed pipeline', notes: '' },
  { name: 'Running Attack', mechanicFamily: 'E', currentConsumer: 'core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },
  { name: 'Melee Defense', mechanicFamily: 'E', currentConsumer: 'core-attack-option-action-economy.js / core-attack-option-normalization-hooks.js (registered family)', runtimeStatus: 'runtime_partial', evidence: 'family registered; feat-specific line not individually confirmed this pass', notes: '' },

  // --- Force Point family (real, registered) ---
  { name: 'Extra Second Wind', mechanicFamily: 'L', currentConsumer: 'second-wind-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'label-only entry in an orphaned file; no direct-name-check found in meta-resource-feat-resolver.js (unlike Fast Surge/Vitality Surge/Forceful Recovery)', notes: '' },
  { name: 'Fast Surge', mechanicFamily: 'L', currentConsumer: 'meta-resource-feat-resolver.js:308 (direct this.hasFeat(actor,"Fast Surge") check)', runtimeStatus: 'runtime_complete', evidence: 'meta-resource-feat-resolver.js:308 sets rules.freeAction=true directly by name, bypassing the orphaned normalization sibling entirely', notes: 'Proof that orphan status of a sibling normalization file does not always mean a feat is non-functional.' },
  { name: 'Recovering Surge', mechanicFamily: 'L', currentConsumer: 'second-wind-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'label-only entry, no direct-check found', notes: '' },
  { name: 'Forceful Recovery', mechanicFamily: 'L', currentConsumer: 'meta-resource-feat-resolver.js:988,1010', runtimeStatus: 'runtime_complete', evidence: 'meta-resource-feat-resolver.js implements the pending-recovery resolution and chat card directly', notes: '' },
  { name: 'Vitality Surge', mechanicFamily: 'L', currentConsumer: 'meta-resource-feat-resolver.js:307 (direct name check)', runtimeStatus: 'runtime_complete', evidence: 'rules.allowAboveHalfHp=true set directly by name', notes: '' },
  { name: 'Impetuous Move', mechanicFamily: 'L', currentConsumer: 'second-wind-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'label-only entry, no direct-check found', notes: '' },
  { name: 'Unstoppable Combatant', mechanicFamily: 'L', currentConsumer: 'second-wind-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'label-only entry, no direct-check found', notes: '' },
  { name: 'Resurgence', mechanicFamily: 'L', currentConsumer: 'second-wind-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'label-only entry, no direct-check found', notes: '' },

  // --- Weapon Proficiency chain ---
  { name: 'Weapon Proficiency', mechanicFamily: 'A', currentConsumer: 'gates ScopedCombatFeatResolver/weaponMatchesSelectedChoice for other feats via actor item presence; not itself a modifier source', runtimeStatus: 'runtime_complete', evidence: 'existence as an owned item with the correct system.selectedChoice is what other feats (Weapon Focus, etc.) check via FeatChoiceResolver-derived matching — the feat itself has no independent roll effect to apply, "runtime_complete" here means "correctly gates downstream mechanics," matching manual_by_design-adjacent RAW (Weapon Proficiency itself only removes the non-proficiency attack penalty, handled by combat-roll-math.js proficiencyPenalty logic, not this feat file family)', notes: 'Mis-bucketed under "Starship & Vehicle / Gunnery & Weapons".' },
  { name: 'Exotic Weapon Proficiency', mechanicFamily: 'A', currentConsumer: 'same as Weapon Proficiency', runtimeStatus: 'runtime_complete', evidence: 'same gating mechanism', notes: '' },

  // --- Not located / needs further trace, honestly flagged rather than guessed ---
  { name: 'Zero Range', mechanicFamily: 'A', currentConsumer: 'starship-vehicle-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'blocked_missing_shared_infrastructure', evidence: 'starship/vehicle gunnery family entirely unregistered', missingInfrastructure: 'Vehicle/starship feat adapter — explicitly deferred by this task\'s brief ("vehicle/station-specific feat automation requiring the future vehicle feat adapter").', notes: '' },
  { name: 'Sniper Shot', mechanicFamily: 'A', currentConsumer: 'starship-vehicle-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'blocked_missing_shared_infrastructure', evidence: 'same vehicle-gunnery family', missingInfrastructure: 'Vehicle/starship feat adapter (deferred).', notes: '' },
  { name: 'Starship Tactics', mechanicFamily: 'L', currentConsumer: 'starship-vehicle-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'blocked_missing_shared_infrastructure', evidence: 'same vehicle-gunnery family; also carries choiceMeta.resolution:"grant_entitlement" (deferred grant pool)', missingInfrastructure: 'Vehicle/starship feat adapter (deferred).', notes: '' },
  { name: 'Vehicular Combat', mechanicFamily: 'A', currentConsumer: 'starship-vehicle-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'blocked_missing_shared_infrastructure', evidence: 'same vehicle-gunnery family', missingInfrastructure: 'Vehicle/starship feat adapter (deferred).', notes: '' },
  { name: 'Tactical Genius', mechanicFamily: 'L', currentConsumer: 'starship-vehicle-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'blocked_missing_shared_infrastructure', evidence: 'same vehicle-gunnery family', missingInfrastructure: 'Vehicle/starship feat adapter (deferred).', notes: '' },
  { name: 'Unified Squadron', mechanicFamily: 'L', currentConsumer: 'starship-vehicle-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'blocked_missing_shared_infrastructure', evidence: 'same vehicle-gunnery family', missingInfrastructure: 'Vehicle/starship feat adapter (deferred).', notes: '' },
  { name: 'Mounted Defense', mechanicFamily: 'I', currentConsumer: 'starship-vehicle-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'blocked_missing_shared_infrastructure', evidence: 'same vehicle-gunnery family', missingInfrastructure: 'Vehicle/starship feat adapter (deferred).', notes: '' },
  { name: 'Destructive Force', mechanicFamily: 'B', currentConsumer: 'starship-vehicle-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'blocked_missing_shared_infrastructure', evidence: 'same vehicle-gunnery family', missingInfrastructure: 'Vehicle/starship feat adapter (deferred).', notes: '' },

  // --- Martial arts / unarmed style training — entire family orphaned ---
  { name: 'Martial Arts I', mechanicFamily: 'A', currentConsumer: 'martial-arts-feat-normalization-hooks.js:61-69 (orphaned)', runtimeStatus: 'not_implemented', evidence: 'entire family unregistered', notes: '' },
  { name: 'Martial Arts II', mechanicFamily: 'A', currentConsumer: 'martial-arts-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'entire family unregistered', notes: '' },
  { name: 'Martial Arts III', mechanicFamily: 'A', currentConsumer: 'martial-arts-feat-normalization-hooks.js (orphaned)', runtimeStatus: 'not_implemented', evidence: 'entire family unregistered', notes: '' },
];

// ---------------------------------------------------------------------

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const catalogByName = new Map(catalog.map((d) => [d.name, d]));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const invalidNames = new Set(
  registry.entries
    .filter((e) => ['invalid_not_swse_feat', 'class_feature_not_feat', 'talent_domain_not_feat'].includes(e.status))
    .map((e) => e.name)
);

const errors = [];
const entries = [];
for (const row of COMBAT_FEAT_STATUS) {
  const doc = catalogByName.get(row.name);
  if (!doc) { errors.push(`"${row.name}" does not exist in data/feat-catalog.json`); continue; }
  if (invalidNames.has(row.name)) { errors.push(`"${row.name}" is a known-invalid/talent-domain name and must not appear in a feat runtime status report`); continue; }
  if (!VALID_STATUSES.has(row.runtimeStatus)) { errors.push(`"${row.name}" has unrecognized runtimeStatus "${row.runtimeStatus}"`); continue; }
  entries.push({
    name: row.name,
    source: doc.system?.sourcebook ?? doc.system?.source ?? null,
    selectedChoice: Boolean(doc.system?.choiceMeta),
    mechanicFamily: row.mechanicFamily,
    currentConsumer: row.currentConsumer,
    runtimeStatus: row.runtimeStatus,
    evidence: row.evidence,
    missingInfrastructure: row.missingInfrastructure ?? '',
    notes: row.notes ?? '',
  });
}

if (errors.length) {
  console.error('FAIL: combat feat status data set has errors:');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

const statusCounts = {};
for (const e of entries) statusCounts[e.runtimeStatus] = (statusCounts[e.runtimeStatus] ?? 0) + 1;

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  gitCommit: gitCommit(),
  purpose: 'Combat feat runtime mechanics audit, Phase 1. Every entry required hand/agent tracing of production code — this is NOT a static-analysis-derived report. Feats not yet listed here have not been individually audited this pass; see docs/audits/combat-feat-runtime-architecture.md for the pipeline this audit traced and the taxonomy-reliability caveat before assuming absence means "fine."',
  totals: { entriesAudited: entries.length, statusCounts },
  entries,
};

fs.mkdirSync(path.dirname(outJsonPath), { recursive: true });
fs.writeFileSync(outJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [];
lines.push('# Combat Feat Runtime Status');
lines.push('');
lines.push(`Generated: ${report.generatedAt}`);
lines.push(`Git commit: ${report.gitCommit ?? 'unknown'}`);
lines.push('');
lines.push('**This is a partial audit, not a complete inventory.** ~150 candidate combat-relevant feats were identified (taxonomy bucket "Combat", plus "Weapon & Armor" and "Starship & Vehicle" feats that are actually universal personal-combat feats mis-bucketed — see the architecture doc). Of those, the entries below received individual evidence-based tracing this pass. The single biggest finding: `scripts/engine/feats/register-feat-runtime.js` is the load-bearing import gate for `scripts/engine/feats/`, and roughly half of that directory (~20+ of ~40 files) is never imported by anything reachable from `index.js` — code that looks fully implemented is often inert.');
lines.push('');
lines.push('## Totals');
lines.push('');
lines.push(`- Entries audited: ${entries.length}`);
for (const [status, count] of Object.entries(statusCounts).sort()) lines.push(`- ${status}: ${count}`);
lines.push('');
lines.push('## Entries');
lines.push('');
lines.push('| Feat | Family | Status | Consumer | Evidence |');
lines.push('|---|---|---|---|---|');
for (const e of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
  lines.push(`| ${e.name} | ${e.mechanicFamily} | \`${e.runtimeStatus}\` | ${e.currentConsumer} | ${e.evidence.slice(0, 160)}${e.evidence.length > 160 ? '…' : ''} |`);
}
lines.push('');
lines.push('Full evidence/notes/missingInfrastructure text for every entry: see the JSON report.');
lines.push('');

fs.writeFileSync(outMdPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`Wrote ${path.relative(repoRoot, outJsonPath)} and ${path.relative(repoRoot, outMdPath)}.`);
console.log(`Entries: ${entries.length}. Status breakdown: ${JSON.stringify(statusCounts)}`);
