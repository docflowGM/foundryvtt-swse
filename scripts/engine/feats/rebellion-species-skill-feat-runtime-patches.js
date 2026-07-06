import { SkillFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/skills/skill-feat-resolver.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

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

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  try { return foundry?.utils?.deepClone?.(value) ?? JSON.parse(JSON.stringify(value)); }
  catch (_err) { return JSON.parse(JSON.stringify(value)); }
}

function normalizeSkill(value = '') {
  return SkillFeatResolver.normalizeSkillKey?.(value) ?? SkillFeatResolver.normalizeSkillKey?.(normalizeKey(value)) ?? value;
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function itemRules(item) {
  return asArray(item?.system?.abilityMeta?.rules)
    .map(rule => ({ ...clone(rule), source: rule.source ?? item?.name, sourceName: item?.name, sourceId: item?.id }));
}

function skillMatches(rule, skillKey) {
  const wanted = normalizeSkill(skillKey);
  const skills = [rule.skill, rule.skillKey, ...asArray(rule.skillKeys), ...asArray(rule.skills)]
    .map(normalizeSkill)
    .filter(Boolean);
  return !skills.length || skills.includes('any') || skills.includes(wanted);
}

function extraUseMatches(rule, context = {}) {
  const extraUse = normalizeKey(context.extraUseId ?? context.useKey ?? context.skillUse?.id ?? context.skillUse?.key ?? '');
  const uses = [rule.extraUse, rule.extraUseId, ...asArray(rule.extraUses), ...asArray(rule.useKeys)]
    .map(normalizeKey)
    .filter(Boolean);
  if (!uses.length || !extraUse) return true;
  return uses.includes(extraUse) || uses.some(use => use.endsWith(extraUse) || extraUse.endsWith(use));
}

function contextMatches(rule, context = {}) {
  const gates = rule.requiresContext ?? rule.context ?? {};
  for (const [key, expected] of Object.entries(gates)) {
    const actual = context[key] ?? context.workflowContext?.[key] ?? context.skillUse?.[key] ?? context.skillUse?.system?.[key];
    if (typeof expected === 'boolean') {
      const affirmed = actual === true || actual === 'true' || actual === 1 || actual === '1';
      if (affirmed !== expected) return false;
      continue;
    }
    if (normalizeKey(actual) !== normalizeKey(expected)) return false;
  }
  return true;
}

function collectRules(actor, predicate) {
  const rules = [];
  for (const item of actorItems(actor)) {
    if (item?.type !== 'feat' || item?.system?.disabled === true) continue;
    for (const rule of itemRules(item)) {
      if (predicate(rule, item)) rules.push(rule);
    }
  }
  return rules;
}

function abilityMod(actor, ability) {
  const key = String(ability || '').toLowerCase().slice(0, 3);
  if (!key) return 0;
  const value = actor?.system?.derived?.attributes?.[key]?.mod
    ?? actor?.system?.abilities?.[key]?.mod
    ?? actor?.system?.attributes?.[key]?.mod
    ?? actor?.system?.derived?.abilities?.[key]?.mod
    ?? 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function collectSpeciesSkillBonuses(actor, skillKey, context = {}) {
  const runtimeSkill = normalizeSkill(skillKey);
  const rules = collectRules(actor, rule => {
    const type = normalizeKey(rule.type);
    return ['species-skill-ability-substitution', 'species-extra-skill-use-bonus'].includes(type)
      && skillMatches(rule, runtimeSkill)
      && extraUseMatches(rule, context)
      && contextMatches(rule, context);
  });

  const bonuses = [];
  for (const rule of rules) {
    const type = normalizeKey(rule.type);
    if (type === 'species-skill-ability-substitution') {
      const from = abilityMod(actor, rule.fromAbility);
      const to = abilityMod(actor, rule.toAbility ?? rule.ability);
      const value = Math.max(0, to - from);
      if (value <= 0) continue;
      bonuses.push({
        id: rule.id,
        sourceId: rule.sourceId,
        sourceName: rule.sourceName ?? rule.label,
        type: 'ability-substitution',
        value,
        description: `${rule.sourceName ?? rule.label}: use ${String(rule.toAbility ?? rule.ability).toUpperCase()} instead of ${String(rule.fromAbility).toUpperCase()} (+${value})`,
        rule
      });
      continue;
    }

    const value = Number(rule.value ?? 0) || 0;
    if (!value) continue;
    bonuses.push({
      id: rule.id,
      sourceId: rule.sourceId,
      sourceName: rule.sourceName ?? rule.label,
      type: rule.bonusType ?? 'species',
      value,
      description: `${rule.sourceName ?? rule.label}: ${value >= 0 ? '+' : ''}${value} ${rule.bonusType ?? 'species'}`,
      rule
    });
  }
  return bonuses;
}

function collectRerollOutcomeOverrides(actor, skillKey) {
  const runtimeSkill = normalizeSkill(skillKey);
  return collectRules(actor, rule => normalizeKey(rule.type) === 'skill-reroll-outcome-override' && skillMatches(rule, runtimeSkill));
}

function applyRerollOutcomeOverrides(actor, skillKey, options = []) {
  const overrides = collectRerollOutcomeOverrides(actor, skillKey);
  if (!overrides.length || !options.length) return options;
  const source = overrides[0];
  return options.map(option => ({
    ...option,
    outcome: 'keepBetter',
    outcomeLabel: 'Keep better result',
    useHigherResult: true,
    mustKeepSecond: false,
    speciesRerollOutcomeOverride: true,
    speciesRerollOutcomeSource: source.sourceName ?? source.label,
    description: option.description || source.summary || `${source.sourceName ?? source.label}: keep better result on rerolls.`
  }));
}

function getForcePointDieUpgrade(actor, skillKey, context = {}) {
  const runtimeSkill = normalizeSkill(skillKey);
  const rules = collectRules(actor, rule => normalizeKey(rule.type) === 'skill-force-point-die-upgrade' && skillMatches(rule, runtimeSkill) && contextMatches(rule, context));
  if (!rules.length) return null;
  const best = rules.reduce((winner, rule) => Number(rule.dieUpgradeSteps ?? 0) > Number(winner.dieUpgradeSteps ?? 0) ? rule : winner, rules[0]);
  return {
    steps: Number(best.dieUpgradeSteps ?? 0) || 0,
    source: best.sourceName ?? best.label,
    sourceId: best.sourceId,
    rule: best
  };
}

function collectContextualSpeciesRules(actor, type, skillKey = null, context = {}) {
  const wanted = normalizeKey(type);
  return collectRules(actor, rule => normalizeKey(rule.type) === wanted && (!skillKey || skillMatches(rule, skillKey)) && extraUseMatches(rule, context) && contextMatches(rule, context));
}

function patchSkillCheckBonuses() {
  if (SkillFeatResolver.__swseRebellionSpeciesSkillBonusPatched === true) return;
  const original = SkillFeatResolver.getSkillCheckBonuses?.bind(SkillFeatResolver);
  SkillFeatResolver.getSkillCheckBonuses = function patchedRebellionSpeciesSkillCheckBonuses(actor, skillKey, context = {}) {
    const base = typeof original === 'function' ? original(actor, skillKey, context) : { total: 0, bonuses: [] };
    const species = collectSpeciesSkillBonuses(actor, skillKey, context);
    if (!species.length) return base;
    return {
      total: Number(base?.total ?? 0) + species.reduce((sum, bonus) => sum + Number(bonus.value || 0), 0),
      bonuses: [...asArray(base?.bonuses), ...species]
    };
  };
  SkillFeatResolver.__swseRebellionSpeciesSkillBonusPatched = true;
}

function patchRerollOptions() {
  if (SkillFeatResolver.__swseRebellionSpeciesRerollOutcomePatched === true) return;
  const original = SkillFeatResolver.getSkillRerollOptions?.bind(SkillFeatResolver);
  SkillFeatResolver.getSkillRerollOptions = function patchedRebellionSpeciesRerollOptions(actor, skillKey, context = {}) {
    const base = typeof original === 'function' ? original(actor, skillKey, context) : [];
    return applyRerollOutcomeOverrides(actor, skillKey, base);
  };
  SkillFeatResolver.__swseRebellionSpeciesRerollOutcomePatched = true;
}

export const RebellionSpeciesSkillFeatRuntime = {
  collectSpeciesSkillBonuses,
  collectRerollOutcomeOverrides,
  applyRerollOutcomeOverrides,
  getForcePointDieUpgrade,
  collectContextualSpeciesRules
};

export function registerRebellionSpeciesSkillFeatRuntimePatches() {
  if (registered) return;
  registered = true;
  patchSkillCheckBonuses();
  patchRerollOptions();
  game.swse ??= {};
  game.swse.skills ??= {};
  game.swse.skills.rebellionSpeciesSkillFeatRuntime = RebellionSpeciesSkillFeatRuntime;
  SWSELogger.log('[RebellionSpeciesSkillFeats] Runtime patches registered');
}

export default registerRebellionSpeciesSkillFeatRuntimePatches;
