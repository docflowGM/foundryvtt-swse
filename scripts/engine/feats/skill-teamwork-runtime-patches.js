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
    .toLowerCase();
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

function abilityModifier(actor, ability) {
  const key = normalizeKey(ability).replace(/-/g, '');
  const aliases = { intelligence: 'int', int: 'int' };
  const abilityKey = aliases[key] ?? key;
  const value = actor?.system?.abilities?.[abilityKey]?.mod
    ?? actor?.system?.abilities?.[abilityKey]?.modifier
    ?? actor?.system?.stats?.[abilityKey]?.mod
    ?? actor?.system?.attributes?.[abilityKey]?.mod
    ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function contextMatchesSkillUse(rule, context = {}) {
  const skill = normalizeKey(context.skill ?? context.skillName ?? context.workflowContext?.skill ?? context.workflowContext?.skillName ?? '');
  const use = normalizeKey(context.use ?? context.skillUse ?? context.procedure ?? context.workflowContext?.use ?? context.workflowContext?.skillUse ?? context.workflowContext?.procedure ?? '');
  if (skill && normalizeKey(rule.skill) !== skill) return false;
  if (use && normalizeKey(rule.use) !== use) return false;
  return true;
}

function getSkillProcedureRules(actor, context = {}) {
  const timeOverrides = collectRules(actor, 'SKILL_USE_TIME_OVERRIDE')
    .filter(rule => contextMatchesSkillUse(rule, context))
    .map(rule => ({
      id: rule.id,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'skillUseTimeOverride',
      skill: rule.skill,
      use: rule.use,
      duration: rule.newDuration,
      rule
    }));

  const capacities = collectRules(actor, 'SKILL_PROCEDURE_CAPACITY')
    .filter(rule => contextMatchesSkillUse(rule, context))
    .map(rule => {
      const abilityMod = abilityModifier(actor, rule.capacityAbility);
      return {
        id: rule.id,
        source: rule.sourceName ?? rule.source ?? rule.label,
        label: rule.label,
        type: 'skillProcedureCapacity',
        skill: rule.skill,
        use: rule.use,
        targetType: rule.targetType,
        capacity: Math.max(Number(rule.minimumCapacity ?? 1) || 1, abilityMod),
        capacityAbility: rule.capacityAbility,
        minimumCapacity: Number(rule.minimumCapacity ?? 1) || 1,
        simultaneous: rule.simultaneous === true,
        separateChecksRequired: rule.separateChecksRequired !== false,
        rule
      };
    });

  return { timeOverrides, capacities };
}

function getAidAnotherDamageRiders(actor, context = {}) {
  const mode = normalizeKey(context.aidAnotherMode ?? context.mode ?? context.workflowContext?.aidAnotherMode ?? context.workflowContext?.mode ?? 'attack');
  return collectRules(actor, 'AID_ANOTHER_DAMAGE_RIDER').filter(rule => normalizeKey(rule.aidAnotherMode ?? 'attack') === mode).map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'aidAnotherDamageRider',
    damageDicePerMarginStep: Number(rule.damageDicePerMarginStep ?? 1) || 1,
    marginStep: Number(rule.marginStep ?? 3) || 3,
    marginDefense: rule.marginDefense ?? 'reflex',
    maximumDice: Number(rule.maximumDice ?? 5) || 5,
    capByAidingAlliesWithFeat: rule.capByAidingAlliesWithFeat === true,
    appliesToAllyAttack: rule.appliesToAllyAttack !== false,
    rule
  }));
}

function resolveAidAnotherDamageDice(actor, context = {}) {
  const attackTotal = Number(context.allyAttackTotal ?? context.attackTotal ?? context.workflowContext?.allyAttackTotal ?? context.workflowContext?.attackTotal ?? 0) || 0;
  const defense = Number(context.targetReflexDefense ?? context.targetDefense?.reflex ?? context.workflowContext?.targetReflexDefense ?? context.workflowContext?.targetDefense?.reflex ?? 0) || 0;
  const aidingAlliesWithFeat = Number(context.aidingAlliesWithFeat ?? context.workflowContext?.aidingAlliesWithFeat ?? 1) || 1;
  const riders = getAidAnotherDamageRiders(actor, context);
  return riders.map(rider => {
    const margin = Math.max(0, attackTotal - defense);
    const diceFromMargin = Math.floor(margin / rider.marginStep) * rider.damageDicePerMarginStep;
    const cap = rider.capByAidingAlliesWithFeat ? Math.min(rider.maximumDice, aidingAlliesWithFeat) : rider.maximumDice;
    return {
      ...rider,
      margin,
      dice: Math.max(0, Math.min(diceFromMargin, cap)),
      cap
    };
  });
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseSkillTeamworkRuntimePatched === true) return;
  CombatOptionResolver.getSkillProcedureRules = getSkillProcedureRules;
  CombatOptionResolver.getAidAnotherDamageRiders = getAidAnotherDamageRiders;
  CombatOptionResolver.resolveAidAnotherDamageDice = resolveAidAnotherDamageDice;
  CombatOptionResolver.__swseSkillTeamworkRuntimePatched = true;
}

export function registerSkillTeamworkRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.getSkillProcedureRules = getSkillProcedureRules;
  game.swse.feats.getAidAnotherDamageRiders = getAidAnotherDamageRiders;
  game.swse.feats.resolveAidAnotherDamageDice = resolveAidAnotherDamageDice;
  SWSELogger.log('[SkillTeamworkRuntime] Runtime helpers registered');
}

export {
  getSkillProcedureRules,
  getAidAnotherDamageRiders,
  resolveAidAnotherDamageDice
};

export default registerSkillTeamworkRuntimePatches;
