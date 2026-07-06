import { CombatActionsMapper } from "/systems/foundryvtt-swse/scripts/combat/utils/combat-actions-mapper.js";
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

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeKey(featName);
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeKey(item?.name) === wanted);
}

function getActionSpeedRules(item) {
  return [
    ...asArray(item?.system?.abilityMeta?.attackOptionRules),
    ...asArray(item?.system?.abilityMeta?.rules)
  ].filter(rule => ['ACTION_SPEED_MUTATION', 'ACTION_COMPOSITION_MUTATION'].includes(String(rule?.type ?? '').toUpperCase()));
}

function collectActionSpeedRules(actor) {
  const rules = [];
  for (const feat of actorItems(actor)) {
    if (feat?.type !== 'feat' || feat?.system?.disabled === true) continue;
    for (const rule of getActionSpeedRules(feat)) {
      if (rule.prerequisiteFeat && !actorHasFeat(actor, rule.prerequisiteFeat)) continue;
      rules.push({ ...rule, sourceName: feat.name, sourceId: feat.id });
    }
  }
  return rules;
}

function actionMatchesRule(actionId, rule) {
  const wanted = normalizeKey(actionId);
  if (!wanted) return false;
  const candidates = [rule.actionId, rule.id, ...(Array.isArray(rule.aliases) ? rule.aliases : [])].map(normalizeKey);
  return candidates.includes(wanted);
}

function resolveActionCost(actor, actionId, context = {}) {
  const matches = collectActionSpeedRules(actor)
    .filter(rule => String(rule.type).toUpperCase() === 'ACTION_SPEED_MUTATION')
    .filter(rule => actionMatchesRule(actionId, rule));

  if (!matches.length) return null;
  const rule = matches[0];
  return {
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    actionId: rule.actionId,
    baseActionCost: rule.baseActionCost ?? rule.actionEconomy?.from ?? null,
    mutatedActionCost: rule.mutatedActionCost ?? rule.actionEconomy?.to ?? rule.actionEconomy?.spend ?? null,
    usesPerEncounter: rule.usesPerEncounter ?? null,
    requiresWorkflowValidation: rule.requiresWorkflowValidation === true || rule.actionEconomy?.workflowRequired === true,
    weaponAction: rule.weaponAction ?? null,
    combinedEffects: asArray(rule.combinedEffects).filter(effect => !effect.requiresFeat || actorHasFeat(actor, effect.requiresFeat)),
    context,
    rule
  };
}

function resolveActionComposition(actor, actionId, context = {}) {
  const matches = collectActionSpeedRules(actor)
    .filter(rule => String(rule.type).toUpperCase() === 'ACTION_COMPOSITION_MUTATION')
    .filter(rule => actionMatchesRule(actionId, rule));

  if (!matches.length) return null;
  const rule = matches[0];
  return {
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    actionId: rule.actionId,
    composedActions: asArray(rule.composedActions),
    actionCost: rule.composedActionCost ?? rule.actionEconomy?.spend ?? 'standard',
    usesPerEncounter: rule.usesPerEncounter ?? null,
    requiresWorkflowValidation: rule.requiresWorkflowValidation === true || rule.actionEconomy?.workflowRequired === true,
    weaponAction: rule.weaponAction ?? null,
    context,
    rule
  };
}

function getActionSpeedMutations(actor, context = {}) {
  return collectActionSpeedRules(actor).map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: rule.type,
    actionId: rule.actionId,
    aliases: asArray(rule.aliases),
    baseActionCost: rule.baseActionCost ?? rule.actionEconomy?.from ?? null,
    mutatedActionCost: rule.mutatedActionCost ?? rule.composedActionCost ?? rule.actionEconomy?.to ?? rule.actionEconomy?.spend ?? null,
    usesPerEncounter: rule.usesPerEncounter ?? null,
    requiresWorkflowValidation: rule.requiresWorkflowValidation === true || rule.actionEconomy?.workflowRequired === true,
    context,
    rule
  }));
}

function syntheticLightningDrawAction(actor) {
  const composition = resolveActionComposition(actor, 'lightningDrawAttack', { workflowValidated: true });
  if (!composition) return null;
  return {
    id: 'lightningDrawAttack',
    key: 'lightningDrawAttack',
    name: 'Lightning Draw Attack',
    actionType: composition.actionCost,
    actionCost: composition.actionCost,
    actionTypeRaw: composition.actionCost,
    cost: 1,
    notes: composition.rule?.summary ?? 'Draw a holstered weapon and attack with it as a standard action once per encounter.',
    description: composition.rule?.summary,
    relatedSkills: [{ skill: 'Attack Roll', outcome: 'Resolve the attack with the drawn weapon after workflow validation.' }],
    executable: true,
    trigger: 'manual',
    resolutionMode: 'attack',
    automationBoundary: 'metadata',
    manualResolution: true,
    contextTags: ['attack', 'drawWeapon', 'lightningDraw'],
    requiredContext: ['Weapon is holstered', 'Lightning Draw use is available this encounter', 'Attack is made with the drawn weapon'],
    ruleData: { actionComposition: composition }
  };
}

function patchCombatActionsMapper() {
  if (CombatActionsMapper.__swseActionSpeedRuntimePatched === true) return;

  const originalGetAllCombatActions = CombatActionsMapper.getAllCombatActions.bind(CombatActionsMapper);
  CombatActionsMapper.getAllCombatActions = function patchedGetAllCombatActions(actor = null, context = {}) {
    const actions = originalGetAllCombatActions();
    const selectedActor = actor ?? this.getSelectedActor?.() ?? null;
    const extra = selectedActor ? [syntheticLightningDrawAction(selectedActor)].filter(Boolean) : [];
    return [...actions, ...extra];
  };

  const originalGetAllActionsBySkill = CombatActionsMapper.getAllActionsBySkill.bind(CombatActionsMapper);
  CombatActionsMapper.getAllActionsBySkill = function patchedGetAllActionsBySkill(actor = null, context = {}) {
    const result = originalGetAllActionsBySkill();
    const selectedActor = actor ?? this.getSelectedActor?.() ?? null;
    const lightning = selectedActor ? syntheticLightningDrawAction(selectedActor) : null;
    if (lightning) {
      result.attackRoll ??= { combatActions: [], extraUses: [], hasActions: true };
      result.attackRoll.combatActions.push(lightning);
      result.attackRoll.hasActions = true;
    }
    return result;
  };

  CombatActionsMapper.resolveFeatActionCost = resolveActionCost;
  CombatActionsMapper.resolveFeatActionComposition = resolveActionComposition;
  CombatActionsMapper.getFeatActionSpeedMutations = getActionSpeedMutations;
  CombatActionsMapper.__swseActionSpeedRuntimePatched = true;
}

export function registerActionSpeedRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatActionsMapper();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.resolveActionCost = resolveActionCost;
  game.swse.feats.resolveActionComposition = resolveActionComposition;
  game.swse.feats.getActionSpeedMutations = getActionSpeedMutations;
  SWSELogger.log('[ActionSpeedRuntime] Runtime helpers registered');
}

export {
  resolveActionCost,
  resolveActionComposition,
  getActionSpeedMutations
};

export default registerActionSpeedRuntimePatches;
