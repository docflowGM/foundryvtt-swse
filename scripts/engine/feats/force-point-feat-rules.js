function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeToken(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function asArray(value) {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function actorFeatItems(actor) {
  return actorItems(actor).filter(item => item?.type === 'feat' && item?.system?.disabled !== true);
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeName(featName);
  return actorFeatItems(actor).some(item => normalizeName(item?.name) === wanted);
}

function resourceRules(item, key) {
  const rules = item?.system?.abilityMeta?.resourceRules?.[key];
  return Array.isArray(rules) ? rules : [];
}

function collectResourceRules(actor, key) {
  const rules = [];
  for (const item of actorFeatItems(actor)) {
    for (const rule of resourceRules(item, key)) {
      rules.push({ ...rule, sourceName: rule.sourceName ?? rule.source ?? item.name, sourceId: rule.sourceId ?? item.id });
    }
  }
  return rules;
}

function collectMetaRules(actor, key) {
  const rules = [];
  for (const item of actorFeatItems(actor)) {
    const value = item?.system?.abilityMeta?.[key];
    const list = Array.isArray(value) ? value : [];
    for (const rule of list) rules.push({ ...rule, sourceName: rule.sourceName ?? rule.source ?? item.name, sourceId: rule.sourceId ?? item.id });
  }
  return rules;
}

function contextReason(context = {}) {
  return normalizeToken(context.reason ?? context.rollType ?? context.checkType ?? context.forcePointUse ?? context.use ?? context.domain ?? '');
}

function contextWeaponText(context = {}) {
  const weapon = context.weapon ?? context.item ?? null;
  const fields = [
    context.weaponName,
    context.weaponType,
    context.weaponGroup,
    weapon?.name,
    weapon?.system?.weaponType,
    weapon?.system?.weaponGroup,
    weapon?.system?.group,
    weapon?.system?.category,
    weapon?.system?.type,
    weapon?.system?.properties,
    weapon?.system?.traits
  ];
  return fields.flatMap(value => Array.isArray(value) ? value : [value]).map(normalizeToken).filter(Boolean).join(' ');
}

function ruleAppliesToForcePointContext(rule = {}, context = {}) {
  const appliesTo = asArray(rule.appliesTo ?? rule.appliesToRolls ?? rule.forcePointUses).map(normalizeToken).filter(Boolean);
  if (!appliesTo.length) return true;
  const reason = contextReason(context);
  if (!reason) return true;
  if (appliesTo.includes(reason)) return true;
  if (reason.includes('attack') && appliesTo.includes('attack')) return true;
  if (reason.includes('skill') && appliesTo.includes('skill')) return true;
  if (reason.includes('ability') && appliesTo.includes('ability')) return true;
  if (reason.includes('check') && appliesTo.includes('check')) return true;
  return false;
}

function ruleMatchesWeapon(rule = {}, context = {}) {
  const required = asArray(rule.requiresWeaponText ?? rule.weaponText ?? rule.weapons ?? rule.weaponNames).map(normalizeToken).filter(Boolean);
  if (!required.length) return true;
  const text = contextWeaponText(context);
  if (!text) return false;
  return required.some(value => text.includes(value));
}

function stepDieSize(current, steps = 0, maxDie = 12) {
  const ladder = [6, 8, 10, 12];
  let index = ladder.indexOf(Number(current) || 6);
  if (index < 0) index = 0;
  const maxIndex = ladder.indexOf(Number(maxDie) || 12);
  const cap = maxIndex >= 0 ? maxIndex : ladder.length - 1;
  return ladder[Math.max(0, Math.min(cap, index + Math.max(0, Number(steps) || 0)))] ?? current;
}

function darkSideScore(actor) {
  const value = actor?.system?.darkSide?.value
    ?? actor?.system?.darkSideScore?.value
    ?? actor?.system?.darkSide
    ?? actor?.system?.dss
    ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function isUseTheForceContext(context = {}) {
  const text = [
    context.skill,
    context.skillKey,
    context.attackSkill,
    context.checkSkill,
    context.sourceSkill,
    context.requiredSkill,
    context.effectSkill,
    context.domain,
    context.source,
    context.actionId,
    context.actionKey
  ].map(normalizeToken).join(' ');
  return context.requiresUseTheForceCheck === true
    || context.useTheForce === true
    || text.includes('use-the-force')
    || text.includes('usetheforce')
    || text.includes('utf');
}

export class ForcePointFeatRules {
  static getForcePointMaxBonus(actor) {
    let total = 0;
    for (const rule of collectResourceRules(actor, 'forcePoints')) {
      if (rule?.type !== 'MAX_BONUS') continue;
      const value = Number(rule.value ?? 0);
      if (Number.isFinite(value)) total += value;
    }
    if (!total && actorHasFeat(actor, 'Force Boon')) total += 3;
    return total;
  }

  static getForcePointDieSize(actor, context = {}) {
    let dieSize = 6;
    for (const rule of collectResourceRules(actor, 'forcePoints')) {
      if (rule?.type === 'DIE_SIZE' && ruleAppliesToForcePointContext(rule, context) && ruleMatchesWeapon(rule, context)) {
        const value = Number(rule.value ?? rule.dieSize ?? 0);
        if (Number.isFinite(value)) dieSize = Math.max(dieSize, value);
      }
    }
    if (actorHasFeat(actor, 'Strong in the Force')) dieSize = Math.max(dieSize, 8);

    for (const rule of collectResourceRules(actor, 'forcePoints')) {
      if (!['DIE_STEP', 'DIE_SIZE_STEP'].includes(rule?.type)) continue;
      if (!ruleAppliesToForcePointContext(rule, context) || !ruleMatchesWeapon(rule, context)) continue;
      dieSize = stepDieSize(dieSize, rule.steps ?? rule.value ?? 1, rule.maxDie ?? rule.maximumDie ?? 10);
    }
    return dieSize;
  }

  static canSpendOffTurn(actor) {
    if (actorHasFeat(actor, 'Force Readiness')) return true;
    return collectResourceRules(actor, 'forcePoints').some(rule => rule?.type === 'SPEND_ACTION_TIMING' && rule.allowOffTurn === true);
  }

  static getForcePointActionPolicy(actor) {
    const forceReadiness = collectResourceRules(actor, 'forcePoints').find(rule => rule?.type === 'SPEND_ACTION_TIMING' && rule.allowOffTurn === true);
    if (forceReadiness || actorHasFeat(actor, 'Force Readiness')) {
      return {
        source: forceReadiness?.sourceName ?? forceReadiness?.source ?? 'Force Readiness',
        action: forceReadiness?.action ?? 'free',
        allowOffTurn: true,
        restrictionsStillApply: true
      };
    }
    return { source: 'Core Force Point Rules', action: 'free', allowOffTurn: false, restrictionsStillApply: true };
  }

  static getForceTrainingAbilityScoreBonus(actor) {
    let bonus = 0;
    for (const rule of collectResourceRules(actor, 'forceTraining')) {
      if (rule?.type !== 'FORCE_TRAINING_ABILITY_SCORE_BONUS') continue;
      const value = Number(rule.value ?? rule.abilityScoreBonus ?? 0);
      if (Number.isFinite(value)) bonus = Math.max(bonus, value);
    }
    if (actorHasFeat(actor, 'Jedi Heritage')) bonus = Math.max(bonus, 4);
    return bonus;
  }

  static getForceTrainingPowerBonusPerInstance(actor) {
    // Backward-compatible accessor for old callers. Jedi Heritage is intentionally
    // not represented as a fixed +2 slot bonus because the RAW calculation is
    // max(1, 1 + modifier(configuredForceTrainingAbility + 4)). Low ability scores
    // therefore can grant +0 or +1 instead of always +2.
    for (const rule of collectResourceRules(actor, 'forceTraining')) {
      if (rule?.type !== 'FORCE_TRAINING_POWER_BONUS_PER_INSTANCE') continue;
      const value = Number(rule.value ?? rule.powerBonusPerForceTraining ?? rule.extraPowersPerForceTraining ?? 0);
      if (Number.isFinite(value)) return Math.max(0, value);
    }
    return 0;
  }

  static getForceTrainingExtraPowerTotal(actor) {
    return this.getForceTrainingPowerBonusPerInstance(actor);
  }

  static getForcePointGainRules(actor) {
    return collectResourceRules(actor, 'forcePoints').filter(rule => String(rule?.type ?? '').includes('GAIN') || String(rule?.type ?? '').includes('TEMP_FP'));
  }

  static getSenseForceDetectionResistanceBonus(actor, context = {}) {
    const rules = collectMetaRules(actor, 'skillRules');
    const hasRule = rules.some(rule => rule?.type === 'UTF_SENSE_FORCE_DETECTION_RESIST_BONUS') || actorHasFeat(actor, 'Pall of the Dark Side');
    if (!hasRule) return 0;
    if (context?.application && normalizeToken(context.application) !== 'sense-force') return 0;
    if (context?.mode && normalizeToken(context.mode) !== 'detect') return 0;
    return Math.max(1, Math.floor(darkSideScore(actor) / 2));
  }

  static getUseTheForceDefenseBonus(actor, context = {}) {
    const defense = normalizeToken(context.defense ?? context.defenseType ?? context.targetDefense ?? '');
    if (defense && !['fortitude', 'will'].includes(defense)) return 0;
    const hasRule = collectMetaRules(actor, 'defenseRules').some(rule => rule?.type === 'DEFENSE_BONUS_VS_USE_THE_FORCE_EFFECT') || actorHasFeat(actor, 'Unstoppable Force');
    if (!hasRule) return 0;
    if (!isUseTheForceContext(context)) return 0;
    return 5;
  }

  static collectResourceRules(actor, key) {
    return collectResourceRules(actor, key);
  }

  static collectSkillRules(actor) {
    return collectMetaRules(actor, 'skillRules');
  }

  static collectDefenseRules(actor) {
    return collectMetaRules(actor, 'defenseRules');
  }
}

export default ForcePointFeatRules;
