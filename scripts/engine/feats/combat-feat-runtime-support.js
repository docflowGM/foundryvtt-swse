import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";

const INSTALL_FLAG = Symbol.for("swse.combatFeatRuntimeSupport.installed");

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function selectedValue(options, id) {
  const combat = options?.combatOptions ?? options?.attackOptions ?? {};
  const value = combat?.[id] ?? options?.[id] ?? 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function isOptionActive(option, context = {}) {
  if (!option?.id) return false;
  if (option.control === "passive") return true;
  if (option.control === "flag") {
    return Boolean(context?.combatOptions?.[option.id] ?? context?.attackOptions?.[option.id] ?? context?.[option.id]);
  }
  return selectedValue(context, option.id) > 0;
}

function annotateEffects(effects, source) {
  return asArray(effects)
    .filter(effect => effect && typeof effect === "object")
    .map(effect => ({
      ...effect,
      sourceOption: effect.sourceOption ?? source.id,
      sourceName: effect.sourceName ?? source.label ?? source.name ?? source.id
    }));
}

function addBreakdown(result, label, value, type) {
  result.breakdown ??= [];
  result.breakdown.push({ label, value, type });
}

function applyAreaMetadata(result, option) {
  const bonusSquares = Number(option.areaBonusSquares ?? option.additionalAreaSquares ?? option.bonusSquares ?? 0);
  const radiusBonus = Number(option.areaRadiusBonus ?? option.burstRadiusBonus ?? option.splashRadiusBonus ?? 0);
  const widenedArea = bonusSquares || radiusBonus || option.areaModifier || option.areaShape;
  if (!widenedArea) return;

  result.areaModifiers ??= [];
  const modifier = {
    sourceOption: option.id,
    sourceName: option.label,
    bonusSquares: Number.isFinite(bonusSquares) ? bonusSquares : 0,
    radiusBonus: Number.isFinite(radiusBonus) ? radiusBonus : 0,
    placement: option.areaBonusPlacement ?? option.placement ?? "adjacent",
    appliesTo: option.appliesTo ?? option.applicationScope ?? "area-attack"
  };
  result.areaModifiers.push(modifier);
  result.flags ??= {};
  result.flags.areaBonusSquares = Number(result.flags.areaBonusSquares ?? 0) + modifier.bonusSquares;
  result.flags.areaRadiusBonus = Number(result.flags.areaRadiusBonus ?? 0) + modifier.radiusBonus;
  addBreakdown(result, `${option.label} area`, modifier.bonusSquares || modifier.radiusBonus, "areaModifier");
}

function applyDefenseSuppressionMetadata(result, option) {
  const suppressed = [
    ...asArray(option.suppressesTargetDefenseBonuses),
    ...asArray(option.suppressesDefenseBonuses),
    ...asArray(option.ignoredTargetDefenseBonuses),
    ...asArray(option.ignoreTargetDefenseBonuses)
  ].map(normalizeKey).filter(Boolean);

  if (!suppressed.length) return;
  result.flags ??= {};
  result.targetDefenseSuppression ??= [];
  for (const key of suppressed) {
    result.flags[`suppressesTargetDefenseBonus.${key}`] = true;
    if (!result.targetDefenseSuppression.includes(key)) result.targetDefenseSuppression.push(key);
  }
  addBreakdown(result, `${option.label} defense suppression`, 0, "targetDefenseSuppression");
}

function applyMarginDamageMetadata(result, option) {
  const dicePerMargin = Number(option.damageDicePerMargin ?? option.bonusDamageDicePerMargin ?? option.extraDicePerMargin ?? 0);
  const marginStep = Number(option.marginStep ?? option.perMargin ?? option.perPointsOverDefense ?? 0);
  if (!Number.isFinite(dicePerMargin) || dicePerMargin <= 0 || !Number.isFinite(marginStep) || marginStep <= 0) return;

  result.marginDamageRules ??= [];
  const rule = {
    sourceOption: option.id,
    sourceName: option.label,
    dicePerMargin,
    marginStep,
    maxDice: Number(option.maxBonusDice ?? option.maxDice ?? 0) || null,
    appliesTo: option.appliesTo ?? "damage"
  };
  result.marginDamageRules.push(rule);
  result.flags ??= {};
  result.flags.hasMarginDamageRules = true;
  addBreakdown(result, `${option.label} margin damage`, dicePerMargin, "marginDamageRule");
}

function applyAttackRiderMetadata(result, option) {
  const hitEffects = annotateEffects(option.targetEffectsOnHit ?? option.effectsOnHit, option);
  const criticalEffects = annotateEffects(option.targetEffectsOnCritical ?? option.effectsOnCritical, option);

  if (hitEffects.length) {
    result.targetEffectsOnHit ??= [];
    for (const effect of hitEffects) {
      if (!result.targetEffectsOnHit.some(existing => JSON.stringify(existing) === JSON.stringify(effect))) {
        result.targetEffectsOnHit.push(effect);
      }
    }
  }

  if (criticalEffects.length) {
    result.targetEffectsOnCritical ??= [];
    for (const effect of criticalEffects) {
      if (!result.targetEffectsOnCritical.some(existing => JSON.stringify(existing) === JSON.stringify(effect))) {
        result.targetEffectsOnCritical.push(effect);
      }
    }
  }
}

function applyOptionRuntimeMetadata(result, activeOptions = []) {
  result.flags ??= {};
  for (const option of activeOptions) {
    applyAreaMetadata(result, option);
    applyDefenseSuppressionMetadata(result, option);
    applyMarginDamageMetadata(result, option);
    applyAttackRiderMetadata(result, option);

    if (option.targetDefenseType && !result.targetDefenseType) {
      result.targetDefenseType = String(option.targetDefenseType).toLowerCase();
    }

    if (option.requiresManualResolution || option.manualResolution) {
      result.flags.requiresManualResolution = true;
      result.flags[`manualResolution.${option.id}`] = true;
    }
  }
  return result;
}

function collectAidRulesFromItem(item) {
  const meta = item?.system?.abilityMeta ?? {};
  const rules = [];
  for (const rule of asArray(meta.aidAnotherRules)) rules.push(rule);
  for (const rule of asArray(meta.rules)) {
    const type = normalizeKey(rule?.type);
    if (type === "aid-another" || type === "aid-another-rider" || type === "aid-another-damage-scaling") {
      rules.push(rule);
    }
  }
  return rules.filter(rule => rule && typeof rule === "object");
}

function normalizeAidRule(rule, item) {
  const dicePerMargin = Number(rule.dicePerMargin ?? rule.bonusDamageDicePerMargin ?? rule.extraDicePerMargin ?? 1);
  const marginStep = Number(rule.marginStep ?? rule.perPointsOverDefense ?? rule.perMargin ?? 3);
  const maxDice = Number(rule.maxDice ?? rule.maxBonusDice ?? 5);
  return {
    sourceItemId: item?.id ?? item?._id ?? null,
    sourceName: item?.name ?? rule.label ?? "Aid Another feat",
    mode: rule.mode ?? rule.effect ?? "damage-dice-per-margin",
    appliesTo: rule.appliesTo ?? rule.context ?? "ally-attack",
    dicePerMargin: Number.isFinite(dicePerMargin) ? dicePerMargin : 1,
    marginStep: Number.isFinite(marginStep) ? marginStep : 3,
    maxDice: Number.isFinite(maxDice) ? maxDice : 5,
    requiresAidedAttack: rule.requiresAidedAttack !== false,
    countMatchingAiders: rule.countMatchingAiders !== false
  };
}

export function registerCombatFeatRuntimeSupport() {
  if (CombatOptionResolver[INSTALL_FLAG]) return;
  CombatOptionResolver[INSTALL_FLAG] = true;

  const originalCollectAttackModifiers = CombatOptionResolver.collectAttackModifiers.bind(CombatOptionResolver);

  CombatOptionResolver.collectAttackModifiers = function collectAttackModifiersWithCombatFeatMetadata(actor, weapon, options = {}) {
    const result = originalCollectAttackModifiers(actor, weapon, options) ?? {};
    const activeOptions = this.summarizeAttackOptions(actor, weapon, options).filter(option => isOptionActive(option, options));
    return applyOptionRuntimeMetadata(result, activeOptions);
  };

  CombatOptionResolver.collectAidAnotherModifiers = function collectAidAnotherModifiers(actor, options = {}) {
    const result = {
      rules: [],
      damageDicePerMargin: 0,
      marginStep: null,
      maxBonusDice: 0,
      flags: {},
      breakdown: []
    };

    for (const item of actorItems(actor)) {
      for (const rule of collectAidRulesFromItem(item)) {
        const normalized = normalizeAidRule(rule, item);
        result.rules.push(normalized);
        result.damageDicePerMargin += normalized.dicePerMargin;
        result.marginStep = result.marginStep == null
          ? normalized.marginStep
          : Math.min(result.marginStep, normalized.marginStep);
        result.maxBonusDice = Math.max(result.maxBonusDice, normalized.maxDice);
        result.flags.hasAidAnotherDamageScaling = true;
        result.breakdown.push({
          label: normalized.sourceName,
          value: normalized.dicePerMargin,
          type: "aidAnotherDamageDicePerMargin"
        });
      }
    }

    const margin = Number(options.marginOverDefense ?? options.attackMargin ?? options.margin ?? 0);
    if (Number.isFinite(margin) && margin > 0 && result.marginStep) {
      const byMargin = Math.floor(margin / result.marginStep) * Math.max(1, result.damageDicePerMargin || 1);
      const aidingFeatCount = Number(options.aidingFeatCount ?? options.matchingAiderCount ?? result.rules.length ?? 0) || result.rules.length;
      const cap = Math.min(result.maxBonusDice || 5, aidingFeatCount || result.maxBonusDice || 5);
      result.resolvedBonusDice = Math.max(0, Math.min(byMargin, cap));
    }

    return result;
  };

  globalThis.SWSE ??= {};
  globalThis.SWSE.CombatFeatRuntimeSupport = {
    collectAidAnotherModifiers: CombatOptionResolver.collectAidAnotherModifiers.bind(CombatOptionResolver),
    applyOptionRuntimeMetadata
  };
}

export default registerCombatFeatRuntimeSupport;
