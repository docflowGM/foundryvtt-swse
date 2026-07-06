import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { FeatChoiceDialog } from "/systems/foundryvtt-swse/scripts/apps/choices/feat-choice-dialog.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const pendingChoicePrompts = new Set();

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function compact(value) {
  return normalizeName(value).replace(/\s+/g, '');
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function withoutExistingRules(rules, ids) {
  const remove = new Set(ids.map(String));
  return asArray(rules).filter(rule => !remove.has(String(rule?.id ?? rule?.key ?? '')));
}

function hasStoredChoice(item) {
  const choice = item?.system?.selectedChoice ?? item?.system?.selectedChoices ?? item?.system?.choiceMeta?.selectedChoice;
  if (Array.isArray(choice)) return choice.length > 0;
  if (choice && typeof choice === 'object') return Object.keys(choice).length > 0;
  return choice !== undefined && choice !== null && String(choice).trim() !== '';
}

function selectedChoiceFromItem(item) {
  const system = item?.system ?? {};
  const raw = system.selectedChoice ?? system.selectedChoices ?? system.choiceMeta?.selectedChoice ?? system.abilityMeta?.selectedChoice;
  const entry = Array.isArray(raw) ? raw[0] : raw;
  if (typeof entry === 'string' && entry.trim()) return entry.trim();
  if (entry && typeof entry === 'object') {
    const value = entry.value ?? entry.id ?? entry.group ?? entry.weaponGroup ?? entry.label ?? entry.name;
    if (String(value ?? '').trim()) return String(value).trim();
  }
  const paren = String(item?.name ?? '').match(/\(([^)]+)\)/);
  return paren?.[1]?.trim() ?? '';
}

function selectedChoicePatch(item) {
  const selected = selectedChoiceFromItem(item);
  if (!selected) return {};
  return {
    'system.selectedChoice': selected,
    'system.choiceMeta.selectedChoice': selected,
    'system.abilityMeta.selectedChoice': selected,
    'system.abilityMeta.requiresSelectedChoice': true
  };
}

function weaponFocusChoicePatch(choiceKey, label, prompt) {
  return {
    'system.choiceMeta.required': true,
    'system.choiceMeta.repeatable': true,
    'system.choiceMeta.resolution': 'immediate',
    'system.choiceMeta.choiceKind': 'weapon_focus_weapon',
    'system.choiceMeta.choiceSource': 'prerequisiteDerived',
    'system.choiceMeta.choiceKey': choiceKey,
    'system.choiceMeta.storagePath': 'system.selectedChoice',
    'system.choiceMeta.label': label,
    'system.choiceMeta.prompt': prompt,
    'system.choiceMeta.requiresOwnedFeatChoice': { feat: 'Weapon Focus', choicePath: 'system.selectedChoice' },
    'system.abilityMeta.requiresSelectedChoice': true
  };
}

function scheduleChoicePrompt(actor, itemId, isFeat) {
  if (!actor || !itemId || !globalThis.ui || !globalThis.game?.user) return;
  const key = `${actor.id || actor.uuid || 'actor'}:${itemId}`;
  if (pendingChoicePrompts.has(key)) return;
  pendingChoicePrompts.add(key);
  globalThis.setTimeout?.(async () => {
    try {
      const item = actor.items?.get?.(itemId);
      if (!item || !isFeat(item) || hasStoredChoice(item)) return;
      if (item.system?.choiceMeta?.required !== true) return;
      if (actor.isOwner === false && !globalThis.game?.user?.isGM) return;
      await FeatChoiceDialog.promptAndApply(actor, item);
    } catch (err) {
      SWSELogger.warn('[UnknownRegionsCombatFeatNormalization] Failed to open choice prompt', { actorId: actor?.id, itemId, error: err });
    } finally {
      pendingChoicePrompts.delete(key);
    }
  }, 250);
}

function rulesForFeat(item) {
  switch (compact(item?.name)) {
    case 'acrobaticdodge':
      return { executionModel: 'PASSIVE', subType: 'REACTION', mode: 'melee_miss_reaction_movement', scope: 'incoming_melee_miss_context', rules: [{ type: 'REACTION_MOVEMENT_RESOURCE', id: 'acrobaticDodgeAdjacentStepOnMeleeMiss', trigger: 'meleeAttackMissesYou', actionType: 'reaction', oncePer: 'encounter', requiresAwareOfAttacker: true, movement: { squares: 1, destination: 'adjacentSquare', doesNotProvoke: true, advisoryOnly: true }, forcePointRefresh: { spendForcePointToUseAgain: true }, source: 'Acrobatic Dodge', label: 'Acrobatic Dodge: reaction adjacent step after melee miss' }] };
    case 'combattrickery':
      return { executionModel: 'ACTIVE', subType: 'COMBAT_ACTION', mode: 'special_feint_action', scope: 'deception_feint_context', rules: [{ type: 'SPECIAL_COMBAT_ACTION', id: 'combatTrickeryTwoSwiftFeint', actionKey: 'combat-trickery', actionName: 'Combat Trickery', actionCost: 'two-swift-same-turn', skill: 'deception', opposedDefense: 'will', successEffect: { condition: 'flat-footed', appliesTo: 'sourceNextAttackAgainstTarget', duration: 'untilEndOfSourceNextTurn' }, forcePointOption: { extendDuration: 'untilEndOfEncounter' }, source: 'Combat Trickery', label: 'Combat Trickery: two-swift Deception feint with Force Point extension' }] };
    case 'frighteningcleave':
      return { executionModel: 'PASSIVE', subType: 'RULE', mode: 'cleave_rider', scope: 'cleave_resolution_context', rules: [{ type: 'CLEAVE_RIDER', id: 'frighteningCleaveFearPenalty', trigger: 'afterSuccessfulCleaveFeatUse', affectedTargets: 'enemiesWithin6SquaresAndLineOfSight', penalty: { reflexDefense: -1, attackRolls: -1, skillChecksAgainstSource: -1, stacksToMaximum: -5, duration: 'untilEndOfEncounter', mindAffecting: true }, source: 'Frightening Cleave', label: 'Frightening Cleave: stacking fear penalty after Cleave' }] };
    case 'grabback':
      return { executionModel: 'PASSIVE', subType: 'REACTION', mode: 'grab_grapple_reaction_rider', scope: 'incoming_grab_grapple_context', rules: [{ type: 'GRAB_GRAPPLE_DEFENSE_RIDER', id: 'grabBackReflexDefenseAgainstGrabGrapple', trigger: 'grabOrGrappleAttackAgainstYou', defense: 'reflex', defenseBonus: 2, source: 'Grab Back', label: 'Grab Back: +2 Reflex vs Grab/Grapple' }, { type: 'REACTION_GRAPPLE_COUNTER', id: 'grabBackCounterGrabOrGrapple', trigger: 'enemyMissesGrabOrGrappleAgainstYou', actionType: 'reaction', counterAttack: { default: 'grab', mayUseGrappleFeatManeuver: true, target: 'triggeringEnemy' }, source: 'Grab Back', label: 'Grab Back: counter Grab/Grapple reaction' }] };
    case 'halt':
      return { executionModel: 'PASSIVE', subType: 'RULE', mode: 'selected_weapon_aoo_rider', scope: 'attack_of_opportunity_resolution_context', choice: weaponFocusChoicePatch('halt_weapon', 'Halt Weapon', 'Choose one Weapon Focus weapon group or exotic weapon for Halt.'), needsChoice: true, rules: [{ type: 'ATTACK_OF_OPPORTUNITY_HIT_RIDER', id: 'haltStopMovementProneRider', trigger: 'attackOfOpportunityHits', selectedChoice: true, requiresWeaponFocusChoice: true, maxTargetSizeRelativeToSource: 1, compareSameDieRollTo: 'targetGrappleCheck', onSuccess: { haltMovement: true, applyProne: true, chargeEndsAndCannotChargeAgainThisTurn: true }, onDamageExceedsThreshold: { loseRemainingActions: true, endTurnImmediately: true }, source: 'Halt', label: 'Halt: stop movement and knock prone on AoO' }] };
    case 'heavyhitter':
      return { executionModel: 'PASSIVE', subType: 'RULE', mode: 'emplacement_vehicle_weapon_damage_rider', scope: 'vehicle_weapon_attack_resolution_context', rules: [{ type: 'VEHICLE_WEAPON_ATTACK_RIDER', id: 'heavyHitterExcessAttackDamageAndSuppression', requiresWeaponText: ['weapon-emplacement', 'weapon-system', 'vehicle-weapon'], damagePerExcessAttackMargin: { per: 5, damage: 1 }, onDamageExceedsThreshold: { targetNextTurnCannotAttack: true, speedPenaltySquares: 2, starshipScaleSpeedPenaltySquares: 1 }, source: 'Heavy Hitter', label: 'Heavy Hitter: extra damage by attack margin and DT rider' }] };
    case 'instinctiveattack':
      return { executionModel: 'PASSIVE', subType: 'RULE', mode: 'force_point_attack_rider', scope: 'force_point_attack_context', rules: [{ type: 'FORCE_POINT_ATTACK_RIDER', id: 'instinctiveAttackRerollKeepBetter', excludesDroids: true, requiresProficientWeapon: true, trigger: 'forcePointSpentOnAttack', rerollAttack: true, keep: 'better', applyForcePointDieToBetterResult: true, source: 'Instinctive Attack', label: 'Instinctive Attack: Force Point attack reroll keep better' }] };
    case 'instinctivedefense':
      return { executionModel: 'ACTIVE', subType: 'COMBAT_ACTION', mode: 'force_point_defense_action', scope: 'free_action_force_point_defense_context', rules: [{ type: 'SPECIAL_COMBAT_ACTION', id: 'instinctiveDefenseForcePointDefenses', actionKey: 'instinctive-defense', actionName: 'Instinctive Defense', actionCost: 'free', requiresOwnTurn: true, consumesForcePoint: true, defenseBonus: { allDefenses: 2, duration: 'untilStartOfNextTurn' }, source: 'Instinctive Defense', label: 'Instinctive Defense: spend FP for +2 all defenses' }] };
    case 'maniacalcharge':
      return { executionModel: 'PASSIVE', subType: 'RULE', mode: 'charge_intimidate_rider', scope: 'charge_path_and_target_context', rules: [{ type: 'CHARGE_SKILL_RIDER', id: 'maniacalChargeIntimidatePathAndTarget', trigger: 'chargeAction', incompatibleFeats: ['Intimidator'], freeActionSkill: { skill: 'persuasion', use: 'intimidate' }, pathTargets: { enemiesPassedWithinSquares: 1, successEffect: { cannotMakeAttackOfOpportunityAgainstSource: true } }, finalTarget: { successEffect: { losesDexterityBonus: true, condition: 'flat-footed', duration: 'untilStartOfSourceNextTurn' } }, source: 'Maniacal Charge', label: 'Maniacal Charge: Intimidate during Charge' }] };
    case 'trample':
      return { executionModel: 'PASSIVE', subType: 'RULE', mode: 'mounted_charge_rider', scope: 'mounted_charge_path_context', rules: [{ type: 'MOUNTED_CHARGE_RIDER', id: 'trampleMountFreePathAttack', trigger: 'mountedChargeAction', featMayBeOnRiderOrMount: true, mountAttack: { actionCost: 'free', attackType: 'melee', compareOneRollAgainstEachEnemyInPath: true, damage: 'mountNaturalWeaponPlusStrength' }, regularEndAttackStillAllowed: true, source: 'Trample', label: 'Trample: mount free attack against enemies charged through' }] };
    case 'rapidassault':
      return { executionModel: 'ACTIVE', subType: 'COMBAT_ACTION', mode: 'optional_force_point_multiattack_action', scope: 'standard_action_multiattack_context', rules: [{ type: 'OPTIONAL_RULE_COMBAT_ACTION', id: 'rapidAssaultForcePointTwoAttacks', actionKey: 'rapid-assault', actionName: 'Rapid Assault', optionalRule: { key: 'enableRapidAssaultOptionalFeat', defaultEnabled: true }, actionCost: 'standard', consumesForcePoint: true, requiresDoubleAttackOrDualWeaponMasteryI: true, maxAttacks: 2, preservesNormalMultiattackPenalties: true, source: 'Rapid Assault', label: 'Rapid Assault: spend FP for two attacks as Standard Action' }] };
    default:
      return null;
  }
}

async function normalizeUnknownRegionsCombatFeat(item, options = {}) {
  if (options?.swseUnknownRegionsCombatFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  const spec = rulesForFeat(item);
  if (!spec) return false;
  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = withoutExistingRules(currentRules, spec.rules.map(rule => rule.id));
  nextRules.push(...spec.rules);
  const patch = {
    'system.executionModel': spec.executionModel,
    'system.subType': spec.subType,
    'system.abilityMeta.mechanicsMode': spec.mode,
    'system.abilityMeta.applicationScope': spec.scope,
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.requiresRuntimeContext': true,
    'system.abilityMeta.rules': nextRules,
    ...(spec.choice ?? {}),
    ...selectedChoicePatch(item)
  };
  const modelChanged = item.system?.executionModel !== spec.executionModel
    || item.system?.subType !== spec.subType
    || item.system?.abilityMeta?.mechanicsMode !== spec.mode
    || item.system?.abilityMeta?.applicationScope !== spec.scope
    || (spec.needsChoice && item.system?.choiceMeta?.required !== true);
  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  if (!rulesChanged && !modelChanged) {
    if (spec.needsChoice && !hasStoredChoice(item)) scheduleChoicePrompt(item.actor, item.id, i => compact(i?.name) === compact(item?.name));
    return false;
  }
  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'UnknownRegionsCombatFeatNormalization.normalize',
      swseUnknownRegionsCombatFeatNormalization: true,
      render: false
    });
    if (spec.needsChoice && !hasStoredChoice(item)) scheduleChoicePrompt(item.actor, item.id, i => compact(i?.name) === compact(item?.name));
    return true;
  } catch (err) {
    SWSELogger.error(`[UnknownRegionsCombatFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerUnknownRegionsCombatFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeUnknownRegionsCombatFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeUnknownRegionsCombatFeat(item, options));
  SWSELogger.log('[UnknownRegionsCombatFeatNormalization] Hooks registered');
}

export default registerUnknownRegionsCombatFeatNormalizationHooks;
