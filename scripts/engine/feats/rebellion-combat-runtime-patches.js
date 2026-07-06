import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
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

function collectRules(actor, type) {
  const rules = [];
  for (const item of actorItems(actor)) {
    if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
    for (const rule of asArray(item?.system?.abilityMeta?.rules)) {
      if (rule?.type !== type) continue;
      rules.push({ ...rule, sourceName: item.name, sourceId: item.id });
    }
  }
  return rules;
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

function isRangedAttack(weapon, context = {}) {
  const type = normalizeKey(context.attackType ?? context.workflowContext?.attackType ?? '');
  if (type === 'ranged') return true;
  if (type === 'melee') return false;
  return /ranged|blaster|pistol|rifle|bowcaster|slugthrower|grenade/.test(weaponText(weapon, context));
}

function isMeleeAttack(weapon, context = {}) {
  const type = normalizeKey(context.attackType ?? context.workflowContext?.attackType ?? '');
  if (type === 'melee') return true;
  if (type === 'ranged') return false;
  return /melee|lightsaber|vibro|unarmed|blade/.test(weaponText(weapon, context));
}

function isHeavyOrVehicleWeapon(weapon, context = {}) {
  const text = weaponText(weapon, context);
  return text.includes('heavy-weapon') || text.includes('heavy-weapons') || text.includes('vehicle-weapon') || text.includes('vehicle-weapons') || text.includes('starship-weapon') || contextAffirms(context.heavyWeapon) || contextAffirms(context.vehicleWeapon);
}

function optionActive(context = {}, id) {
  return contextAffirms(context[id])
    || contextAffirms(context.attackOptions?.[id])
    || contextAffirms(context.combatOptions?.[id])
    || asArray(context.selectedOptions).map(normalizeKey).includes(normalizeKey(id))
    || asArray(context.workflowContext?.selectedOptions).map(normalizeKey).includes(normalizeKey(id));
}

function targetAdjacentContext(context = {}) {
  return contextAffirms(context.targetWithinFightingSpace)
    || contextAffirms(context.targetAdjacentToFightingSpace)
    || contextAffirms(context.targetAdjacent)
    || contextAffirms(context.workflowContext?.targetWithinFightingSpace)
    || contextAffirms(context.workflowContext?.targetAdjacentToFightingSpace)
    || contextAffirms(context.workflowContext?.targetAdjacent);
}

function shortRangeOrCloserContext(context = {}) {
  const band = normalizeKey(context.rangeBand ?? context.rangeCategory ?? context.workflowContext?.rangeBand ?? context.workflowContext?.rangeCategory ?? '');
  if (!band) return contextAffirms(context.shortRangeOrCloser) || contextAffirms(context.workflowContext?.shortRangeOrCloser);
  return ['point-blank', 'pointblank', 'short', 'short-range', 'close'].includes(band);
}

function noAllyCloserContext(context = {}) {
  return contextAffirms(context.noAllyCloserToTarget) || contextAffirms(context.workflowContext?.noAllyCloserToTarget);
}

function runningAttackBeforeAfterContext(context = {}) {
  return contextAffirms(context.runningAttackMovedBeforeAndAfterAttack)
    || contextAffirms(context.workflowContext?.runningAttackMovedBeforeAndAfterAttack)
    || (contextAffirms(context.runningAttack) && contextAffirms(context.movedBeforeAttack) && contextAffirms(context.movedAfterAttack));
}

function isVehicleCombatContext(context = {}) {
  return contextAffirms(context.vehicleCombat) || contextAffirms(context.workflowContext?.vehicleCombat);
}

function collectPointBlankRiderModifiers(actor, weapon, context = {}) {
  if (!actor || !isRangedAttack(weapon, context)) return [];
  const modifiers = [];
  for (const rule of collectRules(actor, 'POINT_BLANK_RIDER_ATTACK_OPTION')) {
    if (rule.id === 'zeroRangeAdjacentRangedAttackRider') {
      if (!targetAdjacentContext(context)) continue;
      if (isHeavyOrVehicleWeapon(weapon, context) || isVehicleCombatContext(context)) continue;
      const suppressDamage = optionActive(context, 'burstFire') || optionActive(context, 'rapidShot');
      modifiers.push({
        id: rule.id,
        source: rule.sourceName ?? rule.source ?? rule.label,
        label: rule.label,
        type: 'pointBlankRiderModifier',
        attackBonus: Number(rule.attackBonus ?? 1) || 1,
        damageExtraWeaponDice: suppressDamage ? 0 : (Number(rule.damageExtraWeaponDice ?? 1) || 1),
        suppressedDamageReason: suppressDamage ? 'Burst Fire or Rapid Shot extra damage already selected' : null,
        advisoryOnly: false,
        rule
      });
    }
    if (rule.id === 'primeShotNoCloserAlliesAttackBonus') {
      if (!shortRangeOrCloserContext(context) || !noAllyCloserContext(context)) continue;
      modifiers.push({
        id: rule.id,
        source: rule.sourceName ?? rule.source ?? rule.label,
        label: rule.label,
        type: 'pointBlankRiderModifier',
        attackBonus: Number(rule.attackBonus ?? 1) || 1,
        bonusType: rule.bonusType ?? 'circumstance',
        selectable: true,
        advisoryOnly: false,
        rule
      });
    }
  }
  return modifiers;
}

function getActionEconomyRiders(actor, context = {}) {
  const actionKey = normalizeKey(context.actionKey ?? context.key ?? context.workflowContext?.actionKey ?? '');
  return collectRules(actor, 'ACTION_ECONOMY_RIDER').filter(rule => {
    if (!actionKey) return true;
    return normalizeKey(rule.actionKey) === actionKey;
  }).map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'actionEconomyRider',
    actionKey: rule.actionKey,
    trigger: rule.trigger,
    removesTurnEndsAfterCharge: rule.removesTurnEndsAfterCharge === true,
    allowsAfterCharge: asArray(rule.allowsAfterCharge),
    rule
  }));
}

function getRunningAttackRiders(actor, context = {}) {
  if (!runningAttackBeforeAfterContext(context)) return [];
  return collectRules(actor, 'RUNNING_ATTACK_RIDER').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'runningAttackRider',
    defense: rule.defense ?? 'reflex',
    defenseBonus: Number(rule.defenseBonus ?? 0) || 0,
    bonusType: rule.bonusType ?? 'dodge',
    duration: rule.duration ?? 'untilStartOfNextTurn',
    rule
  }));
}

function getDropTargetRiders(actor, weapon, context = {}) {
  const dropped = contextAffirms(context.targetReducedToZeroHp) || contextAffirms(context.workflowContext?.targetReducedToZeroHp);
  if (!dropped || !isMeleeAttack(weapon, context)) return [];
  return collectRules(actor, 'DROPS_TARGET_RIDER').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'dropsTargetRider',
    movement: rule.movement,
    oncePer: rule.oncePer ?? 'turn',
    cleaveInteraction: rule.cleaveInteraction,
    rule
  }));
}

function getDamageOutcomeAdjacencyRiders(actor, context = {}) {
  const targetType = normalizeKey(context.targetType ?? context.workflowContext?.targetType ?? context.target?.type ?? context.targetActor?.type ?? '');
  const objectOrVehicle = contextAffirms(context.targetIsObject) || contextAffirms(context.targetIsVehicle) || ['object', 'vehicle', 'starship'].includes(targetType);
  const qualifies = objectOrVehicle
    && contextAffirms(context.damageAtLeastDamageThreshold)
    && contextAffirms(context.targetReducedToZeroHp);
  if (!qualifies) return [];
  return collectRules(actor, 'DAMAGE_OUTCOME_RIDER').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'damageOutcomeAdjacencyRider',
    adjacentTargetDamage: rule.adjacentTargetDamage,
    advisoryOnly: rule.adjacentTargetDamage?.advisoryOnly !== false,
    rule
  }));
}

function applyPointBlankRiderModifiers(result, actor, weapon, context = {}) {
  const modifiers = collectPointBlankRiderModifiers(actor, weapon, context);
  if (!modifiers.length) return;
  result.pointBlankRiderModifiers = asArray(result.pointBlankRiderModifiers).concat(modifiers);
  result.flags ??= {};
  result.flags.pointBlankRiderModifiers = true;
  result.breakdown ??= [];
  for (const mod of modifiers) {
    if (mod.attackBonus) {
      result.attackBonus = Number(result.attackBonus ?? 0) + mod.attackBonus;
      result.breakdown.push({ label: mod.label, value: mod.attackBonus, type: 'attack' });
    }
    if (mod.damageExtraWeaponDice) {
      result.damageExtraWeaponDice = Number(result.damageExtraWeaponDice ?? 0) + mod.damageExtraWeaponDice;
      result.damageDiceStepBonus = Number(result.damageDiceStepBonus ?? 0) + mod.damageExtraWeaponDice;
      result.breakdown.push({ label: mod.label, value: mod.damageExtraWeaponDice, type: 'damageExtraWeaponDice' });
    }
  }
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseRebellionCombatRuntimePatched === true) return;
  const originalCollect = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof originalCollect === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedRebellionCollect(actor, weapon, options = {}) {
      const result = originalCollect(actor, weapon, options) ?? {};
      try {
        applyPointBlankRiderModifiers(result, actor, weapon, options);
      } catch (err) {
        SWSELogger.warn('[RebellionCombatRuntime] Failed to apply point-blank rider modifiers', { error: err });
      }
      return result;
    };
  }
  CombatOptionResolver.collectPointBlankRiderModifiers = collectPointBlankRiderModifiers;
  CombatOptionResolver.getActionEconomyRiders = getActionEconomyRiders;
  CombatOptionResolver.getRunningAttackRiders = getRunningAttackRiders;
  CombatOptionResolver.getDropTargetRiders = getDropTargetRiders;
  CombatOptionResolver.getDamageOutcomeAdjacencyRiders = getDamageOutcomeAdjacencyRiders;
  CombatOptionResolver.__swseRebellionCombatRuntimePatched = true;
}

export function registerRebellionCombatRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.collectPointBlankRiderModifiers = collectPointBlankRiderModifiers;
  game.swse.feats.getActionEconomyRiders = getActionEconomyRiders;
  game.swse.feats.getRunningAttackRiders = getRunningAttackRiders;
  game.swse.feats.getDropTargetRiders = getDropTargetRiders;
  game.swse.feats.getDamageOutcomeAdjacencyRiders = getDamageOutcomeAdjacencyRiders;
  SWSELogger.log('[RebellionCombatRuntime] Runtime helpers registered');
}

export {
  collectPointBlankRiderModifiers,
  getActionEconomyRiders,
  getRunningAttackRiders,
  getDropTargetRiders,
  getDamageOutcomeAdjacencyRiders
};

export default registerRebellionCombatRuntimePatches;
