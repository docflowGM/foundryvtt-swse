import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { EffectiveWeaponQualityResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/effective-weapon-quality-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/[’']/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function contextAffirms(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeKey(featName);
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeKey(item.name) === wanted);
}

function collectRules(actor, type) {
  const out = [];
  for (const item of actorItems(actor)) {
    if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
    for (const rule of asArray(item?.system?.abilityMeta?.rules)) {
      if (rule?.type !== type) continue;
      out.push({ ...rule, sourceName: item.name, sourceId: item.id });
    }
  }
  return out;
}

function collectRuleTypes(actor, types = []) {
  return types.flatMap(type => collectRules(actor, type));
}

function weaponText(weapon, context = {}) {
  const system = weapon?.system ?? {};
  return [
    context.weaponCategory,
    context.weaponType,
    context.weaponGroup,
    context.damageType,
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.weaponCategory,
    system.group,
    system.category,
    system.type,
    system.subtype,
    system.damageType,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties
  ].map(normalizeKey).filter(Boolean).join(' ');
}

function weaponMatchesText(weapon, rule, context = {}) {
  const text = weaponText(weapon, context);
  const required = asArray(rule.requiresWeaponText).map(normalizeKey).filter(Boolean);
  if (!required.length) return true;
  return required.some(value => text.includes(value));
}

function isRangedContext(context = {}) {
  const attackType = normalizeKey(context.attackType ?? context.workflowContext?.attackType ?? '');
  return !attackType || attackType === 'ranged';
}

function isProficientContext(context = {}) {
  const explicit = context.weaponProficient ?? context.isWeaponProficient ?? context.workflowContext?.weaponProficient ?? context.workflowContext?.isWeaponProficient;
  return explicit === undefined ? true : contextAffirms(explicit);
}

function isDroidActor(actor) {
  const system = actor?.system ?? {};
  const values = [actor?.type, actor?.name, system.actorType, system.creatureType, system.details?.type, system.details?.creatureType, system.species, system.details?.species];
  return values.map(normalizeKey).some(value => value.includes('droid')) || contextAffirms(system.isDroid);
}

function isCyborgHybridActor(actor) {
  const system = actor?.system ?? {};
  const values = [actor?.type, actor?.name, system.actorType, system.creatureType, system.details?.type, system.details?.creatureType, system.species, system.details?.species, system.template, system.details?.template];
  return values.map(normalizeKey).some(value => value.includes('cyborg-hybrid') || value.includes('cyborghybrid')) || contextAffirms(system.isCyborgHybrid);
}

function isDroidOrCyborgHybridActor(actor) {
  return isDroidActor(actor) || isCyborgHybridActor(actor);
}

function isOrganicTarget(context = {}) {
  if (contextAffirms(context.targetIsOrganic) || contextAffirms(context.workflowContext?.targetIsOrganic)) return true;
  if (contextAffirms(context.targetIsDroid) || contextAffirms(context.workflowContext?.targetIsDroid)) return false;
  const target = context.target ?? context.targetActor ?? context.workflowContext?.target ?? context.workflowContext?.targetActor ?? null;
  const system = target?.system ?? {};
  const values = [target?.type, target?.name, system.actorType, system.creatureType, system.details?.type, system.details?.creatureType, system.species, system.details?.species];
  return !values.map(normalizeKey).some(value => value.includes('droid'));
}

function getAbilityModifier(actor, ability) {
  const key = normalizeKey(ability);
  const aliases = key === 'intelligence' || key === 'int' ? ['int', 'intelligence'] : [key];
  for (const alias of aliases) {
    const data = actor?.system?.abilities?.[alias] ?? actor?.system?.attributes?.[alias] ?? actor?.system?.stats?.[alias];
    const mod = Number(data?.mod ?? data?.modifier);
    if (Number.isFinite(mod)) return mod;
    const score = Number(data?.score ?? data?.total ?? data?.value);
    if (Number.isFinite(score)) return Math.floor((score - 10) / 2);
  }
  return 0;
}

function degreeText(value) {
  const key = normalizeKey(value);
  if (!key) return '';
  if (key.includes('1') || key.includes('first')) return '1st-degree';
  if (key.includes('2') || key.includes('second')) return '2nd-degree';
  if (key.includes('3') || key.includes('third')) return '3rd-degree';
  if (key.includes('4') || key.includes('fourth')) return '4th-degree';
  if (key.includes('5') || key.includes('fifth')) return '5th-degree';
  return key;
}

function actorDroidDegree(actor, context = {}) {
  const system = actor?.system ?? {};
  return degreeText(context.droidDegree
    ?? context.targetDroidDegree
    ?? context.sourceDroidDegree
    ?? system.droid?.degree
    ?? system.degree
    ?? system.details?.degree
    ?? system.chassis?.degree
    ?? system.model?.degree);
}

function damageTypeText(context = {}) {
  return [context.damageType, context.damageTypes, context.workflowContext?.damageType, context.workflowContext?.damageTypes]
    .flatMap(value => Array.isArray(value) ? value : [value])
    .map(normalizeKey)
    .filter(Boolean)
    .join(' ');
}

function hasExcludedDamageType(context = {}, excluded = []) {
  const text = damageTypeText(context);
  return asArray(excluded).map(normalizeKey).some(type => text.includes(type));
}

function addBreakdown(result, label, value, type) {
  result.breakdown ??= [];
  if (!result.breakdown.some(entry => entry?.label === label && entry?.type === type)) {
    result.breakdown.push({ label, value, type });
  }
}

function applyDisabler(result, actor, weapon, context = {}) {
  if (!actor || !weapon || !isRangedContext(context) || !isProficientContext(context)) return result;
  const hasDisabler = actorHasFeat(actor, 'Disabler') || collectRules(actor, 'WEAPON_TEMPLATE_MUTATION').some(rule => rule.source === 'Disabler');
  if (!hasDisabler) return result;

  for (const rule of collectRules(actor, 'WEAPON_TEMPLATE_MUTATION')) {
    if (rule.id !== 'disablerIonGrenadeBurstRadius' || !weaponMatchesText(weapon, rule, context)) continue;
    result.areaTemplateMutations = asArray(result.areaTemplateMutations).concat({
      id: rule.id,
      source: rule.sourceName ?? rule.source,
      label: rule.label,
      type: 'weaponTemplateMutation',
      property: rule.property,
      value: rule.value,
      burstRadius: rule.value,
      rule
    });
    result.flags ??= {};
    result.flags.disablerIonGrenadeBurstRadius = true;
  }

  for (const rule of collectRules(actor, 'WEAPON_DAMAGE_DIE_SIZE_SET')) {
    if (rule.id !== 'disablerIonPistolDamageD8' || !weaponMatchesText(weapon, rule, context)) continue;
    result.damageDieSizeSet = Math.max(Number(result.damageDieSizeSet ?? 0) || 0, Number(rule.toDieSize ?? 8) || 8);
    result.flags ??= {};
    result.flags.disablerIonPistolDamageD8 = true;
    addBreakdown(result, rule.label, rule.toDieSize, 'damageDieSizeSet');
  }

  for (const rule of collectRules(actor, 'WEAPON_PROPERTY_OVERRIDE')) {
    if (rule.id !== 'disablerIonRifleAccurate' || !weaponMatchesText(weapon, rule, context)) continue;
    EffectiveWeaponQualityResolver.apply(result, [{ quality: 'accurate', mode: 'add', label: rule.label }], 'Disabler');
    result.flags ??= {};
    result.flags.disablerIonRifleAccurate = true;
  }

  return result;
}

function getAimActionRiders(actor, context = {}) {
  if (!actor) return [];
  const actionKey = normalizeKey(context.actionKey ?? context.workflowContext?.actionKey ?? 'aim');
  const rules = collectRuleTypes(actor, ['AIM_ACTION_VARIANT', 'AIM_ACTION_RIDER']);
  return rules.filter(rule => {
    if (rule.requiresDroid && !isDroidActor(actor)) return false;
    if (rule.requiresProficientWeapon && !isProficientContext(context)) return false;
    if (rule.id === 'aimingAccuracyFullRoundAim' && actionKey && actionKey !== 'aiming-accuracy') return false;
    return true;
  }).map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: rule.type === 'AIM_ACTION_VARIANT' ? 'aimActionVariant' : 'aimActionRider',
    actionKey: rule.actionKey,
    actionName: rule.actionName,
    actionCost: rule.actionCost,
    effect: rule.effect,
    permitsNonConsecutiveRoundAimSwifts: rule.permitsNonConsecutiveRoundAimSwifts === true,
    permitsOtherTargetAttacksBeforeAimComplete: rule.permitsOtherTargetAttacksBeforeAimComplete === true,
    losesAimIfTargetOutOfLineOfSight: rule.losesAimIfTargetOutOfLineOfSight === true,
    rule
  }));
}

function getUnarmedHitRiders(actor, context = {}) {
  if (!actor) return [];
  const unarmed = contextAffirms(context.unarmedAttack) || contextAffirms(context.workflowContext?.unarmedAttack);
  const damaged = contextAffirms(context.damageDealt) || contextAffirms(context.workflowContext?.damageDealt);
  if (!unarmed || !damaged) return [];
  return collectRules(actor, 'UNARMED_HIT_RIDER').filter(rule => {
    if (rule.requiresDroid && !isDroidActor(actor)) return false;
    if (rule.requiresOrganicTarget && !isOrganicTarget(context)) return false;
    return true;
  }).map(rule => {
    const isAoo = contextAffirms(context.attackOfOpportunity) || contextAffirms(context.workflowContext?.attackOfOpportunity);
    return {
      id: rule.id,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'unarmedHitRider',
      targetPenalty: {
        ...rule.targetPenalty,
        duration: isAoo ? rule.targetPenalty?.attackOfOpportunityDuration : rule.targetPenalty?.duration
      },
      rule
    };
  });
}

function getDroidSpecialAttackActions(actor, context = {}) {
  if (!actor || !isDroidActor(actor)) return [];
  return collectRules(actor, 'SPECIAL_UNARMED_ATTACK_ACTION').filter(rule => {
    const actionKey = normalizeKey(context.actionKey ?? '');
    if (actionKey && normalizeKey(rule.actionKey) !== actionKey) return false;
    return true;
  }).map(rule => {
    const hasCrush = actorHasFeat(actor, 'Crush');
    return {
      id: rule.id,
      key: rule.actionKey,
      source: rule.sourceName ?? rule.source ?? rule.label,
      name: rule.actionName,
      label: rule.label,
      type: 'specialUnarmedAttackAction',
      actionCost: rule.actionCost ?? 'standard',
      attackType: rule.attackType ?? 'melee',
      attackBonus: Number(rule.attackBonus ?? 0) || 0,
      virtualWeapon: rule.virtualWeapon,
      selfPenalty: rule.selfPenalty,
      onExceedsDamageThreshold: rule.onExceedsDamageThreshold,
      crushFeatRider: hasCrush ? rule.crushFeatRider : null,
      unarmedExtraWeaponDice: hasCrush ? Number(rule.crushFeatRider?.unarmedExtraWeaponDice ?? 0) || 0 : 0,
      advisoryOnly: true,
      rule
    };
  });
}

function getAimingAccuracyDamageRiders(actor, context = {}) {
  if (!actor || !isDroidActor(actor)) return [];
  const usedAimingAccuracy = contextAffirms(context.aimingAccuracy) || normalizeKey(context.actionKey ?? context.workflowContext?.actionKey ?? '') === 'aiming-accuracy';
  const damaged = contextAffirms(context.damageDealt) || contextAffirms(context.workflowContext?.damageDealt);
  if (!usedAimingAccuracy || !damaged) return [];
  return collectRules(actor, 'AIMING_ACCURACY_DAMAGE_RIDER').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source,
    label: rule.label,
    type: 'aimingAccuracyDamageRider',
    targetCannotRecover: rule.targetCannotRecover === true,
    duration: rule.duration,
    rule
  }));
}

function getDroidMovementRiders(actor, context = {}) {
  if (!actor || !isDroidActor(actor)) return [];
  return collectRuleTypes(actor, ['WITHDRAW_ACTION_RIDER', 'MOBILITY_DODGE_TRADEOFF']).map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source,
    label: rule.label,
    type: rule.type === 'WITHDRAW_ACTION_RIDER' ? 'withdrawActionRider' : 'mobilityDodgeTradeoff',
    actionCost: rule.actionCost,
    threatenedSquaresWithoutOpportunity: rule.threatenedSquaresWithoutOpportunity,
    movementLimit: rule.movementLimit,
    forcePointReaction: rule.forcePointReaction,
    maxSpeedReductionSquares: rule.maxSpeedReductionSquares,
    dodgeBonusPerSpeedSquare: rule.dodgeBonusPerSpeedSquare,
    minimumSquaresMoved: rule.minimumSquaresMoved,
    duration: rule.duration,
    requiresLocomotion: rule.requiresLocomotion,
    rule
  }));
}

function getDroidShieldRiders(actor, context = {}) {
  if (!actor || (!isDroidOrCyborgHybridActor(actor) && !isDroidActor(actor))) return [];
  return collectRuleTypes(actor, ['VEHICLE_SHIELD_DAMAGE_REDUCTION_REACTION', 'DROID_SHIELD_RECHARGE_RIDER']).map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source,
    label: rule.label,
    type: rule.type === 'VEHICLE_SHIELD_DAMAGE_REDUCTION_REACTION' ? 'vehicleShieldDamageReductionReaction' : 'droidShieldRechargeRider',
    actionCost: rule.actionCost,
    trigger: rule.trigger,
    damageReductionLimit: rule.damageReductionLimit,
    shieldRatingCostPerDamageReduced: rule.shieldRatingCostPerDamageReduced,
    blockRechargeShieldsForRounds: rule.blockRechargeShieldsForRounds,
    autoSucceedEnduranceCheck: rule.autoSucceedEnduranceCheck === true,
    restoreShieldRating: rule.restoreShieldRating,
    swiftActionsRequired: rule.swiftActionsRequired,
    requiresDirectDataLink: rule.requiresDirectDataLink === true,
    rule
  }));
}

function getDroidSensorActions(actor, context = {}) {
  if (!actor || !isDroidOrCyborgHybridActor(actor)) return [];
  return collectRules(actor, 'SENSOR_LINK_ACTION').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source,
    label: rule.label,
    type: 'sensorLinkAction',
    actionCost: rule.actionCost,
    rangeSquares: rule.rangeSquares,
    targetTypes: rule.targetTypes,
    sharesAwareness: rule.sharesAwareness === true,
    enablesAidAnotherPerceptionWithoutLineOfSight: rule.enablesAidAnotherPerceptionWithoutLineOfSight === true,
    mutualSensorLinkPerceptionBonus: rule.mutualSensorLinkPerceptionBonus,
    rule
  }));
}

function getDroidSkillSwapActions(actor, context = {}) {
  if (!actor || !isDroidActor(actor)) return [];
  return collectRules(actor, 'DROID_SKILL_SWAP_ACTION').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source,
    label: rule.label,
    type: 'droidSkillSwapAction',
    actionCost: rule.actionCost,
    selectedSkill: rule.selectedSkill,
    excludesSkills: rule.excludesSkills,
    swapOutRequiresTrainedSkill: rule.swapOutRequiresTrainedSkill === true,
    swappedInCountsAsTrained: rule.swappedInCountsAsTrained === true,
    permitsUntrainedAttempt: rule.permitsUntrainedAttempt === true,
    suppressesOriginalTrainedSkillBenefitWhileSwapped: rule.suppressesOriginalTrainedSkillBenefitWhileSwapped === true,
    rule
  }));
}

function getDroidThresholdRiders(actor, context = {}) {
  if (!actor) return [];
  const isArea = contextAffirms(context.areaAttack) || contextAffirms(context.workflowContext?.areaAttack);
  return collectRuleTypes(actor, ['ION_DAMAGE_THRESHOLD_RIDER', 'DAMAGE_THRESHOLD_REPLACEMENT_REACTION']).filter(rule => {
    if (rule.requiresDroid && !isDroidActor(actor)) return false;
    if (rule.requiresDroidOrCyborgHybrid && !isDroidOrCyborgHybridActor(actor)) return false;
    if (rule.excludesAreaAttack && isArea) return false;
    if (hasExcludedDamageType(context, rule.excludesDamageTypes)) return false;
    return true;
  }).map(rule => {
    const priorUses = Number(context.priorEncounterUses ?? context.workflowContext?.priorEncounterUses ?? actor?.getFlag?.('foundryvtt-swse', 'damageConversionUsesThisEncounter') ?? 0) || 0;
    const extraDamage = Number(rule.baseExtraDamage ?? 0) + (Number(rule.additionalExtraDamagePerPriorEncounterUse ?? 0) * Math.max(0, priorUses));
    return {
      id: rule.id,
      source: rule.sourceName ?? rule.source,
      label: rule.label,
      type: rule.type === 'ION_DAMAGE_THRESHOLD_RIDER' ? 'ionDamageThresholdRider' : 'damageThresholdReplacementReaction',
      conditionTrackSteps: rule.conditionTrackSteps,
      replacesConditionTrackSteps: rule.replacesConditionTrackSteps,
      replaceConditionTrackShift: rule.replaceConditionTrackShift === true,
      baseExtraDamage: rule.baseExtraDamage,
      additionalExtraDamagePerPriorEncounterUse: rule.additionalExtraDamagePerPriorEncounterUse,
      extraDamage,
      trigger: rule.trigger,
      rule
    };
  });
}

function getLeaderOfDroidsPolicy(actor, context = {}) {
  if (!actor) return null;
  const rule = collectRules(actor, 'DROID_MIND_AFFECTING_IMMUNITY_BRIDGE')[0];
  if (!rule) return null;
  const beneficial = context.beneficial !== false && contextAffirms(context.mindAffecting ?? context.workflowContext?.mindAffecting);
  if (context.requireMatchingContext && !beneficial) return null;
  return {
    id: rule.id,
    source: rule.sourceName ?? rule.source,
    label: rule.label,
    type: 'droidMindAffectingImmunityBridge',
    maxDroids: Math.max(1, getAbilityModifier(actor, 'intelligence')),
    requiresWillingDroidAllies: rule.requiresWillingDroidAllies === true,
    immunityIgnoredForThisEffectOnly: rule.immunityIgnoredForThisEffectOnly === true,
    rule
  };
}

function getDroidFocusBonuses(actor, context = {}) {
  if (!actor) return { skillBonus: 0, defenseBonus: 0, rules: [] };
  const skill = normalizeKey(context.skill ?? context.skillKey ?? context.workflowContext?.skill ?? '');
  const targetDegree = degreeText(context.targetDroidDegree ?? actorDroidDegree(context.targetActor ?? context.target, context));
  const sourceDegree = degreeText(context.sourceDroidDegree ?? actorDroidDegree(context.sourceActor ?? context.attacker, context));
  let skillBonus = 0;
  let defenseBonus = 0;
  const applied = [];
  for (const rule of collectRules(actor, 'DROID_FOCUS_CONTEXT_BONUS')) {
    const selected = degreeText(rule.selectedDegree);
    if (!selected) continue;
    const skills = asArray(rule.skills).map(normalizeKey);
    if (targetDegree && targetDegree === selected && (!skill || skills.includes(skill))) {
      skillBonus = Math.max(skillBonus, Number(rule.skillBonus ?? 0) || 0);
      applied.push(rule);
    }
    if (sourceDegree && sourceDegree === selected) {
      defenseBonus = Math.max(defenseBonus, Number(rule.defenseBonus ?? 0) || 0);
      applied.push(rule);
    }
  }
  return {
    skillBonus,
    defenseBonus,
    rules: applied.map(rule => ({ id: rule.id, source: rule.sourceName ?? rule.source, selectedDegree: rule.selectedDegree, label: rule.label }))
  };
}

function getDistractingDroidActions(actor, context = {}) {
  if (!actor || !isDroidActor(actor)) return [];
  return collectRules(actor, 'AREA_SKILL_ATTACK_ACTION').filter(rule => normalizeKey(rule.actionKey) === 'distracting-droid').map(rule => ({
    id: rule.id,
    key: rule.actionKey,
    source: rule.sourceName ?? rule.source,
    name: rule.actionName,
    label: rule.label,
    type: 'areaSkillAttackAction',
    actionCost: rule.actionCost,
    skill: rule.skill,
    targetDefense: rule.targetDefense,
    rangeSquares: rule.rangeSquares,
    mindAffecting: rule.mindAffecting === true,
    requiresTargetCanSeeOrHearSource: rule.requiresTargetCanSeeOrHearSource === true,
    onSuccess: rule.onSuccess,
    onSuccessBy10: rule.onSuccessBy10,
    rule
  }));
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseDroidCombatRuntimePatched === true) return;
  const originalCollect = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof originalCollect === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedDroidCombatCollect(actor, weapon, options = {}) {
      const result = originalCollect(actor, weapon, options) ?? {};
      try {
        applyDisabler(result, actor, weapon, options);
        const focus = getDroidFocusBonuses(actor, options);
        if (focus.skillBonus || focus.defenseBonus) {
          result.droidFocus = focus;
        }
      } catch (err) {
        SWSELogger.warn('[DroidCombatRuntime] Failed to apply droid combat weapon/context rules', { error: err });
      }
      return result;
    };
  }
  CombatOptionResolver.getAimActionRiders = getAimActionRiders;
  CombatOptionResolver.getUnarmedHitRiders = getUnarmedHitRiders;
  CombatOptionResolver.getDroidSpecialAttackActions = getDroidSpecialAttackActions;
  CombatOptionResolver.getAimingAccuracyDamageRiders = getAimingAccuracyDamageRiders;
  CombatOptionResolver.getDroidMovementRiders = getDroidMovementRiders;
  CombatOptionResolver.getDroidShieldRiders = getDroidShieldRiders;
  CombatOptionResolver.getDroidSensorActions = getDroidSensorActions;
  CombatOptionResolver.getDroidSkillSwapActions = getDroidSkillSwapActions;
  CombatOptionResolver.getDroidThresholdRiders = getDroidThresholdRiders;
  CombatOptionResolver.getLeaderOfDroidsPolicy = getLeaderOfDroidsPolicy;
  CombatOptionResolver.getDroidFocusBonuses = getDroidFocusBonuses;
  CombatOptionResolver.getDistractingDroidActions = getDistractingDroidActions;
  CombatOptionResolver.__swseDroidCombatRuntimePatched = true;
}

export function registerDroidCombatRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.getAimActionRiders = getAimActionRiders;
  game.swse.feats.getUnarmedHitRiders = getUnarmedHitRiders;
  game.swse.feats.getDroidSpecialAttackActions = getDroidSpecialAttackActions;
  game.swse.feats.getAimingAccuracyDamageRiders = getAimingAccuracyDamageRiders;
  game.swse.feats.getDroidMovementRiders = getDroidMovementRiders;
  game.swse.feats.getDroidShieldRiders = getDroidShieldRiders;
  game.swse.feats.getDroidSensorActions = getDroidSensorActions;
  game.swse.feats.getDroidSkillSwapActions = getDroidSkillSwapActions;
  game.swse.feats.getDroidThresholdRiders = getDroidThresholdRiders;
  game.swse.feats.getLeaderOfDroidsPolicy = getLeaderOfDroidsPolicy;
  game.swse.feats.getDroidFocusBonuses = getDroidFocusBonuses;
  game.swse.feats.getDistractingDroidActions = getDistractingDroidActions;
  SWSELogger.log('[DroidCombatRuntime] Runtime helpers registered');
}

export {
  getAimActionRiders,
  getUnarmedHitRiders,
  getDroidSpecialAttackActions,
  getAimingAccuracyDamageRiders,
  getDroidMovementRiders,
  getDroidShieldRiders,
  getDroidSensorActions,
  getDroidSkillSwapActions,
  getDroidThresholdRiders,
  getLeaderOfDroidsPolicy,
  getDroidFocusBonuses,
  getDistractingDroidActions
};

export default registerDroidCombatRuntimePatches;
