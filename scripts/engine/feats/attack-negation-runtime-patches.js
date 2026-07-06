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

function optionActive(context = {}, id) {
  return contextAffirms(context[id])
    || contextAffirms(context.attackOptions?.[id])
    || contextAffirms(context.combatOptions?.[id])
    || asArray(context.selectedOptions).map(normalizeKey).includes(normalizeKey(id))
    || asArray(context.workflowContext?.selectedOptions).map(normalizeKey).includes(normalizeKey(id));
}

function collectSelectedAttackNegationPenalties(actor, context = {}) {
  if (!actor || !optionActive(context, 'overwhelmingAttack')) return [];
  return collectRules(actor, 'ATTACK_OPTION').flatMap(rule => {
    if (rule.id !== 'overwhelmingAttack') return [];
    const penalty = rule.attackNegationPenalty ?? {};
    return [{
      id: 'overwhelmingAttackNegationPenalty',
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label ?? 'Overwhelming Attack',
      type: 'attackNegationPenalty',
      value: Number(penalty.value ?? -5) || -5,
      penaltyType: penalty.penaltyType ?? 'untyped',
      appliesTo: asArray(penalty.appliesTo),
      appliesAgainst: asArray(penalty.appliesAgainst),
      targetScoped: penalty.targetScoped !== false,
      thisAttackOnly: penalty.thisAttackOnly !== false,
      expiresOn: asArray(rule.expiresOn),
      swiftActionsRequired: Number(rule.swiftActionsRequired ?? rule.requiresSwiftActions ?? 2) || 2,
      note: penalty.note ?? rule.summary,
      rule
    }];
  });
}

function attackNegationTypeMatches(penalty, context = {}) {
  const type = normalizeKey(context.negationType ?? context.abilityName ?? context.featName ?? context.talentName ?? context.workflowContext?.negationType ?? context.workflowContext?.abilityName ?? '');
  if (!type) return true;
  return asArray(penalty.appliesAgainst).map(normalizeKey).some(candidate => candidate === type || type.includes(candidate) || candidate.includes(type));
}

function resolveAttackNegationPenalty(actor, context = {}) {
  const penalties = asArray(context.attackNegationPenalties)
    .concat(asArray(context.workflowContext?.attackNegationPenalties))
    .concat(collectSelectedAttackNegationPenalties(actor, context));
  let total = 0;
  const applied = [];
  for (const penalty of penalties) {
    if (!attackNegationTypeMatches(penalty, context)) continue;
    const value = Number(penalty.value ?? 0);
    if (!Number.isFinite(value) || value === 0) continue;
    total += value;
    applied.push(penalty);
  }
  return { total, penalties: applied };
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseAttackNegationRuntimePatched === true) return;
  const originalCollect = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);

  if (typeof originalCollect === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedAttackNegationCollect(actor, weapon, options = {}) {
      const result = originalCollect(actor, weapon, options) ?? {};
      try {
        const penalties = collectSelectedAttackNegationPenalties(actor, options);
        if (penalties.length) {
          result.attackNegationPenalties ??= [];
          result.attackNegationPenalties.push(...penalties);
          result.flags ??= {};
          result.flags.attackNegationPenalty = true;
          result.breakdown ??= [];
          if (!result.breakdown.some(entry => entry?.type === 'attackNegationPenalty')) {
            result.breakdown.push({ label: 'Overwhelming Attack: target negation penalty', value: penalties[0].value, type: 'attackNegationPenalty' });
          }
        }
      } catch (err) {
        SWSELogger.warn('[AttackNegationRuntime] Failed to collect attack negation penalties', { error: err });
      }
      return result;
    };
  }

  CombatOptionResolver.collectSelectedAttackNegationPenalties = collectSelectedAttackNegationPenalties;
  CombatOptionResolver.resolveAttackNegationPenalty = resolveAttackNegationPenalty;
  CombatOptionResolver.__swseAttackNegationRuntimePatched = true;
}

export function registerAttackNegationRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.collectSelectedAttackNegationPenalties = collectSelectedAttackNegationPenalties;
  game.swse.feats.resolveAttackNegationPenalty = resolveAttackNegationPenalty;
  SWSELogger.log('[AttackNegationRuntime] Runtime helpers registered');
}

export {
  collectSelectedAttackNegationPenalties,
  resolveAttackNegationPenalty
};

export default registerAttackNegationRuntimePatches;
