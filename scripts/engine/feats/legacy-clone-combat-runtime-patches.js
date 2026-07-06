import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { EncounterUseTracker } from "/systems/foundryvtt-swse/scripts/engine/feats/encounter-use-tracker.js";
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
  for (const feat of actorItems(actor)) {
    if (feat?.type !== 'feat' || feat?.system?.disabled === true) continue;
    for (const rule of asArray(feat?.system?.abilityMeta?.rules)) {
      if (rule?.type !== type) continue;
      rules.push({ ...rule, sourceName: feat.name, sourceId: feat.id });
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

function isThrownWeapon(weapon, context = {}) {
  return /thrown|throwing|grenade/.test(weaponText(weapon, context)) || contextAffirms(context.thrownWeapon) || contextAffirms(context.workflowContext?.thrownWeapon);
}

function isIonDamage(weapon, context = {}) {
  return /ion/.test(weaponText(weapon, context)) || contextAffirms(context.ionDamage) || contextAffirms(context.workflowContext?.ionDamage);
}

function isDroidTarget(context = {}) {
  if (contextAffirms(context.targetIsDroid) || contextAffirms(context.workflowContext?.targetIsDroid)) return true;
  const target = context.target ?? context.targetActor ?? context.workflowContext?.target ?? context.workflowContext?.targetActor ?? null;
  const system = target?.system ?? {};
  const fields = [target?.type, target?.name, system.actorType, system.creatureType, system.details?.type, system.details?.creatureType, system.species, system.details?.species];
  return fields.map(normalizeKey).some(value => value.includes('droid'));
}

function isWeaponProficientContext(context = {}) {
  const explicit = context.weaponProficient ?? context.isWeaponProficient ?? context.workflowContext?.weaponProficient ?? context.workflowContext?.isWeaponProficient;
  return explicit === undefined ? true : contextAffirms(explicit);
}

function getAdvisoryCombatModifiers(actor, weapon, context = {}) {
  const modifiers = [];
  for (const rule of collectRules(actor, 'ADVISORY_ATTACK_MODIFIER')) {
    if (rule.id === 'anointedHunterThrownAfterMove') {
      const moved = Number(context.movedSquaresFromTurnStart ?? context.workflowContext?.movedSquaresFromTurnStart ?? 0) || 0;
      if (!isThrownWeapon(weapon, context) || moved < Number(rule.requiresMovedAtLeastSquaresFromStart ?? 2)) continue;
    }
    if (rule.id === 'separatistMilitaryTrainingAdjacentAllyAttackBonus') {
      if (!contextAffirms(context.adjacentAlly) && !contextAffirms(context.workflowContext?.adjacentAlly)) continue;
    }
    modifiers.push({
      id: rule.id,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'advisoryAttackModifier',
      attackBonus: Number(rule.attackBonus ?? 0) || 0,
      bonusType: rule.bonusType,
      oncePerTurn: rule.oncePerTurn === true,
      advisoryOnly: true,
      rule
    });
  }

  for (const rule of collectRules(actor, 'ADVISORY_DAMAGE_MODIFIER')) {
    if (rule.id === 'droidHunterDroidDamageBonus') {
      if (!isWeaponProficientContext(context) || !isDroidTarget(context)) continue;
      const damageBonus = isIonDamage(weapon, context) ? Number(rule.ionDamageBonus ?? 4) || 4 : Number(rule.damageBonus ?? 2) || 2;
      modifiers.push({
        id: rule.id,
        source: rule.sourceName ?? rule.source ?? rule.label,
        label: rule.label,
        type: 'advisoryDamageModifier',
        damageBonus,
        bonusType: rule.bonusType,
        advisoryOnly: true,
        rule
      });
    }
  }

  return modifiers;
}

function getDamageOutcomeChoices(actor, context = {}) {
  if (!actor) return [];
  const trigger = normalizeKey(context.trigger ?? context.damageOutcomeTrigger ?? context.workflowContext?.trigger ?? context.workflowContext?.damageOutcomeTrigger ?? '');
  return collectRules(actor, 'DAMAGE_OUTCOME_CHOICE').filter(rule => {
    if (!trigger) return true;
    return normalizeKey(rule.trigger) === trigger;
  }).map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'damageOutcomeChoice',
    trigger: rule.trigger,
    choice: rule.choice,
    bypassesDamageThresholdKillRequirement: rule.bypassesDamageThresholdKillRequirement === true,
    advisoryOnly: rule.advisoryOnly !== false,
    rule
  }));
}

function getActionEconomyOverrides(actor, context = {}) {
  if (!actor) return [];
  const actionKey = normalizeKey(context.actionKey ?? context.key ?? context.workflowContext?.actionKey ?? '');
  const actionName = normalizeKey(context.actionName ?? context.name ?? context.workflowContext?.actionName ?? '');
  return collectRules(actor, 'ACTION_ECONOMY_OVERRIDE').filter(rule => {
    const ruleKey = normalizeKey(rule.actionKey);
    const ruleName = normalizeKey(rule.actionName);
    if (!actionKey && !actionName) return true;
    return (actionKey && ruleKey === actionKey) || (actionName && ruleName === actionName);
  }).map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'actionEconomyOverride',
    actionKey: rule.actionKey,
    actionName: rule.actionName,
    fromActionCost: rule.fromActionCost,
    toActionCost: rule.toActionCost,
    rule
  }));
}

function getConditionTrackInterrupts(actor, context = {}) {
  if (!actor) return [];
  const trigger = normalizeKey(context.trigger ?? context.workflowContext?.trigger ?? 'attackExceedsDamageThreshold');
  return collectRules(actor, 'CONDITION_TRACK_INTERRUPT_RESOURCE').filter(rule => normalizeKey(rule.trigger) === trigger).map(rule => {
    const featureKey = rule.id;
    return {
      id: rule.id,
      key: featureKey,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'conditionTrackInterruptResource',
      ignoreConditionTrackMovement: rule.ignoreConditionTrackMovement === true,
      oncePer: rule.firstTimePer ?? 'encounter',
      available: EncounterUseTracker.canUse(actor, featureKey, { oncePer: rule.firstTimePer ?? 'encounter' }),
      rule
    };
  });
}

async function spendConditionTrackInterrupt(actor, featureKey = 'galacticAllianceTrainingIgnoreFirstDtConditionStep') {
  return EncounterUseTracker.checkAndMarkUsed(actor, featureKey, { oncePer: 'encounter' });
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseLegacyCloneCombatRuntimePatched === true) return;
  const originalCollect = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof originalCollect === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedLegacyCloneCollect(actor, weapon, options = {}) {
      const result = originalCollect(actor, weapon, options) ?? {};
      try {
        const advisory = getAdvisoryCombatModifiers(actor, weapon, options);
        if (advisory.length) {
          result.advisoryCombatModifiers = asArray(result.advisoryCombatModifiers).concat(advisory);
          result.flags ??= {};
          result.flags.hasAdvisoryCombatModifiers = true;
        }
      } catch (err) {
        SWSELogger.warn('[LegacyCloneCombatRuntime] Failed to collect advisory combat modifiers', { error: err });
      }
      return result;
    };
  }
  CombatOptionResolver.getAdvisoryCombatModifiers = getAdvisoryCombatModifiers;
  CombatOptionResolver.getDamageOutcomeChoices = getDamageOutcomeChoices;
  CombatOptionResolver.getActionEconomyOverrides = getActionEconomyOverrides;
  CombatOptionResolver.getConditionTrackInterrupts = getConditionTrackInterrupts;
  CombatOptionResolver.spendConditionTrackInterrupt = spendConditionTrackInterrupt;
  CombatOptionResolver.__swseLegacyCloneCombatRuntimePatched = true;
}

export function registerLegacyCloneCombatRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.getAdvisoryCombatModifiers = getAdvisoryCombatModifiers;
  game.swse.feats.getDamageOutcomeChoices = getDamageOutcomeChoices;
  game.swse.feats.getActionEconomyOverrides = getActionEconomyOverrides;
  game.swse.feats.getConditionTrackInterrupts = getConditionTrackInterrupts;
  game.swse.feats.spendConditionTrackInterrupt = spendConditionTrackInterrupt;
  SWSELogger.log('[LegacyCloneCombatRuntime] Runtime helpers registered');
}

export {
  getAdvisoryCombatModifiers,
  getDamageOutcomeChoices,
  getActionEconomyOverrides,
  getConditionTrackInterrupts,
  spendConditionTrackInterrupt
};

export default registerLegacyCloneCombatRuntimePatches;
