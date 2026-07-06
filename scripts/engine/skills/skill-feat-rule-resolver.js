import { ExtraSkillUseRegistry } from "/systems/foundryvtt-swse/scripts/engine/skills/extra-skill-use-registry.js";
import { SkillRules } from "/systems/foundryvtt-swse/scripts/engine/skills/SkillRules.js";

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

function normalizeSkill(value = '') {
  const key = normalizeKey(value);
  return SkillRules.normalizeSkillKey(key) ?? key;
}

function normalizeExtraUse(value = '') {
  return normalizeKey(value).replace(/\./g, '.');
}

function contextAffirms(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function ruleSkillMatches(rule, skillId) {
  const wanted = normalizeSkill(skillId);
  const skillValues = [rule.skill, rule.skillId, rule.skillKey, rule.baseSkill, ...asArray(rule.skills), ...asArray(rule.skillKeys)]
    .map(normalizeSkill)
    .filter(Boolean);
  if (!skillValues.length || !wanted) return true;
  return skillValues.includes(wanted) || skillValues.includes('any');
}

function ruleExtraUseMatches(rule, extraUseId) {
  const wanted = normalizeExtraUse(extraUseId);
  const useValues = [rule.extraUse, rule.extraUseId, rule.useKey, rule.actionKey, ...asArray(rule.extraUses), ...asArray(rule.useKeys)]
    .map(normalizeExtraUse)
    .filter(Boolean);
  if (!useValues.length || !wanted) return true;
  return useValues.includes(wanted) || useValues.some(value => value.endsWith(`.${wanted}`));
}

function ruleContextMatches(rule, context = {}) {
  const gates = rule.requiresContext ?? rule.context ?? {};
  for (const [key, expected] of Object.entries(gates)) {
    const actual = context[key] ?? context.workflowContext?.[key];
    if (typeof expected === 'boolean') {
      if (contextAffirms(actual) !== expected) return false;
      continue;
    }
    if (Array.isArray(expected)) {
      if (!expected.map(normalizeKey).includes(normalizeKey(actual))) return false;
      continue;
    }
    if (normalizeKey(actual) !== normalizeKey(expected)) return false;
  }
  return true;
}

function isSkillRule(rule = {}) {
  const type = normalizeKey(rule.type ?? rule.ruleType ?? '');
  return type.includes('skill')
    || type.includes('extra-use')
    || type.includes('extra-skill-use')
    || type.includes('reroll')
    || type.includes('take-10')
    || type.includes('retry');
}

function collectRawRules(actor) {
  const rules = [];
  for (const item of actorItems(actor)) {
    if (!['feat', 'talent', 'species', 'class'].includes(item?.type) || item?.system?.disabled === true) continue;
    const rawRules = [
      ...asArray(item?.system?.abilityMeta?.rules),
      ...asArray(item?.system?.abilityMeta?.skillRules),
      ...asArray(item?.system?.skillRules)
    ];
    for (const rule of rawRules) {
      if (!isSkillRule(rule)) continue;
      rules.push({ ...clone(rule), sourceName: item.name, sourceType: item.type, sourceId: item.id });
    }
  }
  return rules;
}

function normalizeRerollRule(rule) {
  const rawKeep = normalizeKey(rule.keep ?? rule.outcome ?? rule.resultPolicy ?? rule.rerollPolicy ?? 'better');
  const keepSecond = ['second', 'new', 'keep-second', 'must-keep-second', 'worse'].includes(rawKeep);
  return {
    id: rule.id ?? rule.key ?? `${rule.sourceId ?? 'skill'}-reroll`,
    source: rule.sourceName ?? rule.source ?? rule.label,
    sourceId: rule.sourceId,
    label: rule.label ?? rule.sourceName ?? 'Skill Reroll',
    type: 'skillRerollResource',
    skill: rule.skill ?? rule.skillId ?? rule.skillKey,
    extraUse: rule.extraUse ?? rule.extraUseId ?? rule.useKey,
    oncePer: rule.oncePer ?? rule.frequency ?? null,
    consumes: rule.consumes ?? rule.cost ?? null,
    keep: keepSecond ? 'second' : 'better',
    outcome: keepSecond ? 'keepSecond' : 'keepBetter',
    mustKeepSecond: keepSecond,
    useHigherResult: !keepSecond,
    mayChooseAfterRoll: rule.mayChooseAfterRoll === true,
    appliesAfterFailureKnown: rule.appliesAfterFailureKnown === true,
    advisoryOnly: rule.advisoryOnly === true,
    rule
  };
}

export class SkillFeatRuleResolver {
  static collectRules(actor, { skillId = null, extraUseId = null, context = {} } = {}) {
    return collectRawRules(actor).filter(rule => ruleSkillMatches(rule, skillId) && ruleExtraUseMatches(rule, extraUseId) && ruleContextMatches(rule, context));
  }

  static collect(actor, { skillId = null, extraUseId = null, context = {} } = {}) {
    const rules = this.collectRules(actor, { skillId, extraUseId, context });
    const result = {
      bonuses: [],
      extraUseBonuses: [],
      abilitySubstitutions: [],
      skillSubstitutions: [],
      actionEconomyOverrides: [],
      grantedExtraUses: [],
      rerolls: [],
      resultRiders: [],
      dcOverrides: [],
      take10Overrides: [],
      retryOverrides: [],
      advisory: [],
      rules
    };

    for (const rule of rules) {
      const type = normalizeKey(rule.type ?? rule.ruleType);
      const entry = { ...clone(rule), source: rule.sourceName ?? rule.source ?? rule.label, sourceId: rule.sourceId };
      switch (type) {
        case 'skill-bonus':
          result.bonuses.push(entry);
          break;
        case 'extra-skill-use-bonus':
        case 'extra-use-bonus':
          result.extraUseBonuses.push(entry);
          break;
        case 'skill-ability-substitution':
          result.abilitySubstitutions.push(entry);
          break;
        case 'extra-skill-use-skill-substitution':
        case 'skill-substitution':
          result.skillSubstitutions.push(entry);
          break;
        case 'extra-skill-use-grant':
        case 'extra-use-grant':
          result.grantedExtraUses.push(entry);
          break;
        case 'skill-action-economy-override':
        case 'extra-skill-use-action-economy-override':
        case 'skill-action-override':
          result.actionEconomyOverrides.push(entry);
          break;
        case 'skill-reroll-resource':
        case 'extra-skill-use-reroll-resource':
        case 'skill-reroll':
          result.rerolls.push(normalizeRerollRule(entry));
          break;
        case 'skill-result-rider':
          result.resultRiders.push(entry);
          break;
        case 'skill-dc-override':
          result.dcOverrides.push(entry);
          break;
        case 'skill-take-10-override':
          result.take10Overrides.push(entry);
          break;
        case 'skill-retry-override':
          result.retryOverrides.push(entry);
          break;
        default:
          if (entry.advisoryOnly === true || type.includes('advisory')) result.advisory.push(entry);
          break;
      }
    }

    return result;
  }

  static collectSkillModifiers(actor, skillId, context = {}) {
    const collected = this.collect(actor, { skillId, context });
    return [...collected.bonuses, ...collected.advisory.filter(rule => rule.skillBonus || rule.bonus || rule.value)];
  }

  static collectExtraSkillUseModifiers(actor, skillId, extraUseId, context = {}) {
    const collected = this.collect(actor, { skillId, extraUseId, context });
    return [...collected.extraUseBonuses, ...collected.bonuses];
  }

  static collectSkillActionOverrides(actor, skillId, extraUseId, context = {}) {
    return this.collect(actor, { skillId, extraUseId, context }).actionEconomyOverrides;
  }

  static collectSkillRerolls(actor, skillId, extraUseId = null, context = {}) {
    return this.collect(actor, { skillId, extraUseId, context }).rerolls;
  }

  static getGrantedExtraSkillUses(actor, skillId = null, context = {}) {
    return this.collect(actor, { skillId, context }).grantedExtraUses.map(rule => {
      const use = rule.extraUse ?? rule.extraSkillUse ?? rule.grant ?? {};
      if (typeof use === 'string') {
        return ExtraSkillUseRegistry.get(use, skillId) ?? { id: normalizeExtraUse(use), key: normalizeExtraUse(use), skill: normalizeSkill(skillId), source: rule.source };
      }
      return { ...clone(use), source: rule.source, sourceId: rule.sourceId };
    });
  }

  static getAllowedSkillsForExtraUse(actor, extraUseId, context = {}) {
    const base = ExtraSkillUseRegistry.get(extraUseId);
    const allowed = new Set(base?.allowedSkills ?? []);
    const substitutions = this.collect(actor, { extraUseId, context }).skillSubstitutions;
    for (const sub of substitutions) {
      for (const skill of [sub.alternateSkill, sub.skill, sub.toSkill, ...asArray(sub.allowedSkills)]) {
        const normalized = normalizeSkill(skill);
        if (normalized) allowed.add(normalized);
      }
    }
    return Array.from(allowed);
  }

  static getAbilityOptions(actor, skillId, extraUseId = null, context = {}) {
    return this.collect(actor, { skillId, extraUseId, context }).abilitySubstitutions.map(rule => ({
      source: rule.source,
      fromAbility: rule.fromAbility,
      toAbility: rule.toAbility ?? rule.ability,
      mode: rule.mode ?? 'mayUse',
      rule
    }));
  }

  static registerGlobals() {
    game.swse ??= {};
    game.swse.skills ??= {};
    game.swse.skills.SkillFeatRuleResolver = SkillFeatRuleResolver;
    game.swse.skills.ExtraSkillUseRegistry = ExtraSkillUseRegistry;
  }
}

export function registerSkillFeatRuleResolver() {
  ExtraSkillUseRegistry.registerDefaults();
  SkillFeatRuleResolver.registerGlobals();
}

export default SkillFeatRuleResolver;
