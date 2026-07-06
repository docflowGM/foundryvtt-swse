import { SkillFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/skills/skill-feat-resolver.js";
import { SkillFeatRuleResolver } from "/systems/foundryvtt-swse/scripts/engine/skills/skill-feat-rule-resolver.js";
import { EncounterUseTracker } from "/systems/foundryvtt-swse/scripts/engine/feats/encounter-use-tracker.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
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

const SKILL_ALIASES = Object.freeze({
  'acrobatics': 'acrobatics',
  'athletics': 'athletics',
  'climb': 'climb',
  'deception': 'deception',
  'endurance': 'endurance',
  'gather-information': 'gatherInformation',
  'gatherinformation': 'gatherInformation',
  'initiative': 'initiative',
  'jump': 'jump',
  'knowledge': 'knowledge',
  'knowledge-bureaucracy': 'knowledgeBureaucracy',
  'knowledgebureaucracy': 'knowledgeBureaucracy',
  'knowledge-galactic-lore': 'knowledgeGalacticLore',
  'knowledgegalacticlore': 'knowledgeGalacticLore',
  'knowledge-life-sciences': 'knowledgeLifeSciences',
  'knowledgelifesciences': 'knowledgeLifeSciences',
  'knowledge-physical-sciences': 'knowledgePhysicalSciences',
  'knowledgephysicalsciences': 'knowledgePhysicalSciences',
  'knowledge-social-sciences': 'knowledgeSocialSciences',
  'knowledgesocialsciences': 'knowledgeSocialSciences',
  'knowledge-tactics': 'knowledgeTactics',
  'knowledgetactics': 'knowledgeTactics',
  'knowledge-technology': 'knowledgeTechnology',
  'knowledgetechnology': 'knowledgeTechnology',
  'mechanics': 'mechanics',
  'perception': 'perception',
  'persuasion': 'persuasion',
  'pilot': 'pilot',
  'ride': 'ride',
  'stealth': 'stealth',
  'survival': 'survival',
  'swim': 'swim',
  'treat-injury': 'treatInjury',
  'treatinjury': 'treatInjury',
  'use-computer': 'useComputer',
  'usecomputer': 'useComputer',
  'use-the-force': 'useTheForce',
  'usetheforce': 'useTheForce'
});

function toRuntimeSkillKey(value) {
  if (!value) return null;
  const normalized = normalizeKey(value);
  return SKILL_ALIASES[normalized] ?? SkillFeatResolver.normalizeSkillKey?.(value) ?? value;
}

function getSkillRow(actor, skillKey) {
  const key = toRuntimeSkillKey(skillKey) ?? skillKey;
  return actor?.system?.derived?.skills?.[key]
    ?? actor?.system?.skills?.[key]
    ?? null;
}

function isSkillTrained(actor, skillKey) {
  const key = toRuntimeSkillKey(skillKey) ?? skillKey;
  const row = getSkillRow(actor, key);
  if (row?.trained === true) return true;
  if (key === 'athletics') {
    const skills = actor?.system?.skills ?? {};
    return ['acrobatics', 'climb', 'jump', 'swim'].some(component => skills?.[component]?.trained === true || actor?.system?.derived?.skills?.[component]?.trained === true);
  }
  return false;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dailyFeatureKey(ruleId) {
  return `skillFeatDailyUses.${ruleId}`;
}

function encounterFeatureKey(prefix, ruleId) {
  return `${prefix}-${ruleId}`;
}

function getDailyUses(actor) {
  return actor?.getFlag?.('foundryvtt-swse', 'skillFeatDailyUses') ?? actor?.flags?.['foundryvtt-swse']?.skillFeatDailyUses ?? {};
}

function canUseDaily(actor, ruleId) {
  const uses = getDailyUses(actor);
  return uses?.[ruleId] !== todayKey();
}

async function markDailyUsed(actor, ruleId) {
  if (!actor?.setFlag || !ruleId) return false;
  const uses = { ...getDailyUses(actor), [ruleId]: todayKey() };
  await actor.setFlag('foundryvtt-swse', 'skillFeatDailyUses', uses);
  return true;
}

function isRuleAvailable(actor, skillKey, rule) {
  const raw = rule?.rule ?? rule;
  if (raw?.requiresTrained === true && !isSkillTrained(actor, skillKey)) return false;
  if (rule?.oncePer === 'day' && !canUseDaily(actor, dailyFeatureKey(rule.id))) return false;
  return true;
}

function toRerollOption(actor, skillKey, rule) {
  const runtimeSkill = toRuntimeSkillKey(skillKey) ?? skillKey;
  return {
    id: rule.id,
    sourceId: rule.sourceId ?? rule.rule?.sourceId ?? '',
    sourceName: rule.source ?? rule.label ?? 'Skill Reroll',
    label: rule.label ?? rule.source ?? 'Skill Reroll',
    outcome: rule.outcome === 'keepBetter' || rule.keep === 'better' ? 'keepBetter' : 'keepSecond',
    skillKey: runtimeSkill,
    description: rule.rule?.summary ?? rule.summary ?? '',
    oncePer: rule.oncePer ?? null,
    rule: rule.rule ?? rule,
    actorId: actor?.id ?? ''
  };
}

function dedupeOptions(options) {
  const seen = new Set();
  const result = [];
  for (const option of options) {
    const key = `${option.sourceId ?? ''}:${option.id ?? option.label ?? ''}:${option.skillKey ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(option);
  }
  return result;
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function itemRules(item) {
  return asArray(item?.system?.abilityMeta?.rules)
    .map(rule => ({ ...rule, source: rule.source ?? item?.name, sourceName: item?.name, sourceId: item?.id }));
}

function collectAbilityRules(actor, predicate) {
  const rules = [];
  for (const item of actorItems(actor)) {
    if (!['feat', 'talent', 'species', 'class'].includes(item?.type) || item?.system?.disabled === true) continue;
    for (const rule of itemRules(item)) {
      if (predicate(rule, item)) rules.push(rule);
    }
  }
  return rules;
}

function contextAffirms(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function actorAbilityMod(actor, ability) {
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

function currentActionCost(context = {}) {
  return normalizeKey(
    context.actionCost
    ?? context.actionType
    ?? context.skillUse?.actionCost
    ?? context.skillUse?.actionType
    ?? context.skillUse?.system?.actionCost
    ?? context.skillUse?.system?.actionType
    ?? ''
  );
}

function reduceActionCost(actionCost, actionEconomy = {}) {
  const cost = normalizeKey(actionCost);
  if (!cost) return null;
  if (cost === 'full-round' || cost === 'fullround') return actionEconomy.fullRoundTo ?? 'standard';
  if (cost === 'standard') return actionEconomy.standardTo ?? 'move';
  if (cost === 'move') return actionEconomy.moveTo ?? 'swift';
  return null;
}

function resolveSkillActionEconomyOptions(actor, skillKey, extraUseId = null, context = {}) {
  const runtimeSkill = toRuntimeSkillKey(skillKey) ?? skillKey;
  const actionCost = currentActionCost(context);
  const rules = SkillFeatRuleResolver.collectSkillActionOverrides(actor, runtimeSkill, extraUseId, context);
  return rules.map(rule => {
    const actionEconomy = rule.actionEconomy ?? {};
    const featureKey = encounterFeatureKey('skill-action-economy', rule.id ?? rule.sourceId ?? rule.label ?? 'rule');
    const reducedActionCost = reduceActionCost(actionCost, actionEconomy);
    const longTask = contextAffirms(context.longTask)
      || contextAffirms(context.skillUse?.longTask)
      || contextAffirms(context.skillUse?.system?.longTask)
      || normalizeKey(actionCost).includes('minute')
      || normalizeKey(actionCost).includes('hour');
    const applies = Boolean(reducedActionCost) || longTask;
    return {
      id: rule.id,
      label: rule.label ?? rule.source ?? 'Skill action economy',
      source: rule.source ?? rule.sourceName ?? rule.label,
      sourceId: rule.sourceId,
      skillKey: runtimeSkill,
      extraUseId,
      originalActionCost: actionCost || null,
      actionCost: reducedActionCost ?? actionCost ?? null,
      longTaskTimeMultiplier: longTask ? Number(actionEconomy.longTaskTimeMultiplier ?? 1) || 1 : 1,
      longTaskPenalty: longTask ? Number(actionEconomy.longTaskPenalty ?? 0) || 0 : 0,
      reduceMultiSwiftBy: Number(actionEconomy.reduceMultiSwiftBy ?? 0) || 0,
      oncePer: rule.oncePer ?? null,
      featureKey,
      canUse: !rule.oncePer || EncounterUseTracker.canUse(actor, featureKey, { oncePer: rule.oncePer }),
      applies,
      summary: rule.summary ?? '',
      rule
    };
  }).filter(option => option.applies);
}

function resolveSkillActionEconomy(actor, skillKey, extraUseId = null, context = {}) {
  return resolveSkillActionEconomyOptions(actor, skillKey, extraUseId, context).find(option => option.canUse) ?? null;
}

async function consumeSkillActionEconomy(actor, option = null) {
  if (!actor || !option) return { allowed: false, reason: 'Skill action economy option not found.' };
  if (!option.oncePer) return { allowed: true };
  return EncounterUseTracker.checkAndMarkUsed(actor, option.featureKey, { oncePer: option.oncePer });
}

function getMovementSkillRiders(actor, context = {}) {
  const rules = collectAbilityRules(actor, rule => normalizeKey(rule.type) === 'movement-skill-rider');
  const result = {
    climbSpeedBonusSquares: 0,
    swimSpeedBonusSquares: 0,
    jumpDistanceBonusSquares: 0,
    retainDexBonusToReflexWhileClimbing: false,
    sources: []
  };
  for (const rule of rules) {
    result.climbSpeedBonusSquares = Math.max(result.climbSpeedBonusSquares, Number(rule.climbSpeedBonusSquares ?? 0) || 0);
    result.swimSpeedBonusSquares = Math.max(result.swimSpeedBonusSquares, Number(rule.swimSpeedBonusSquares ?? 0) || 0);
    result.jumpDistanceBonusSquares = Math.max(result.jumpDistanceBonusSquares, Number(rule.jumpDistanceBonusSquares ?? 0) || 0);
    result.retainDexBonusToReflexWhileClimbing ||= rule.retainDexBonusToReflexWhileClimbing === true;
    result.sources.push({ id: rule.id, source: rule.source ?? rule.label, sourceId: rule.sourceId, rule });
  }
  return result;
}

function retainsDexBonusToReflexWhileClimbing(actor, context = {}) {
  const mode = normalizeKey(context.mode ?? context.movementMode ?? context.skillKey ?? '');
  if (mode && mode !== 'climb' && mode !== 'athletics') return false;
  return getMovementSkillRiders(actor, context).retainDexBonusToReflexWhileClimbing === true;
}

function isAreaAttackContext(context = {}, options = {}) {
  const attack = context.attack ?? {};
  const ruleData = context.ruleData ?? {};
  return attack.isArea === true
    || contextAffirms(context.areaAttack)
    || contextAffirms(context.isAreaAttack)
    || contextAffirms(ruleData.areaAttack)
    || contextAffirms(options.areaAttack)
    || asArray(context.contextTags).map(normalizeKey).includes('area-attack')
    || asArray(context.contextTags).map(normalizeKey).includes('areaattack');
}

function hasCoverContext(context = {}, options = {}) {
  const defense = context.defense ?? {};
  const targetContext = context.targetContext ?? options.targetContext ?? {};
  const coverValue = context.cover ?? options.cover ?? defense.cover ?? targetContext.cover ?? context.targetCover ?? options.targetCover;
  if (contextAffirms(coverValue) || contextAffirms(context.hasCover) || contextAffirms(options.hasCover)) return true;
  const coverText = normalizeKey(coverValue ?? context.coverState ?? options.coverState ?? targetContext.coverState ?? '');
  return ['cover', 'improved-cover', 'total-cover', 'partial-cover'].includes(coverText) || coverText.endsWith('-cover');
}

function getAreaAttackCoverDamageRules(actor, context = {}) {
  return collectAbilityRules(actor, rule => normalizeKey(rule.type) === 'area-attack-cover-damage-negation')
    .filter(rule => rule.requiresCover !== true || hasCoverContext(context))
    .filter(rule => rule.appliesToAreaAttacks !== true || isAreaAttackContext(context));
}

function resolveAreaAttackCoverDamageDisposition(actor, context = {}, { disposition = null, options = {} } = {}) {
  if (!actor || !isAreaAttackContext(context, options) || !hasCoverContext(context, options)) return null;
  const rules = getAreaAttackCoverDamageRules(actor, context);
  if (!rules.length) return null;
  const source = rules[0]?.source ?? rules[0]?.label ?? 'Advantageous Cover';
  return {
    ...(disposition ?? {}),
    damageAllowed: false,
    multiplier: 0,
    reason: `${source}: cover negates area attack damage.`,
    hit: disposition?.hit ?? context?.damage?.hit,
    areaAttack: true,
    advantageousCover: true,
    cover: true,
    source,
    sourceId: rules[0]?.sourceId ?? null,
    rule: rules[0]
  };
}

function getTemporaryDefenseReactionRules(actor, context = {}) {
  return collectAbilityRules(actor, rule => normalizeKey(rule.type) === 'temporary-defense-reaction');
}

function temporaryDefenseRuleFromReaction(actor, rule) {
  const value = rule.valueFormula === 'abilityModifier'
    ? actorAbilityMod(actor, rule.ability)
    : Number(rule.value ?? 0) || 0;
  return {
    id: rule.id ?? `${rule.sourceId}-temp-defense-reaction`,
    sourceId: rule.sourceId,
    sourceName: rule.source ?? rule.sourceName ?? rule.label ?? 'Temporary Defense',
    label: rule.label ?? rule.source ?? 'Temporary Defense',
    cost: rule.cost ?? 'reaction',
    value,
    valueFormula: rule.valueFormula ?? null,
    ability: rule.ability ?? null,
    duration: rule.duration ?? '1round',
    roundsRemaining: Number(rule.roundsRemaining ?? 1) || 1,
    targets: Array.isArray(rule.targets) ? rule.targets : ['defense.fortitude'],
    description: rule.summary ?? rule.description ?? '',
    oncePer: rule.oncePer ?? null,
    featureKey: encounterFeatureKey('temporary-defense-reaction', rule.id ?? rule.sourceId ?? rule.label ?? 'rule'),
    rule
  };
}

function patchTemporaryDefenseRules() {
  if (MetaResourceFeatResolver.__swseSkillFeatTemporaryDefensePatched === true) return;
  const originalGet = MetaResourceFeatResolver.getTemporaryDefenseRules?.bind(MetaResourceFeatResolver);
  const originalApply = MetaResourceFeatResolver.applyTemporaryDefenseRule?.bind(MetaResourceFeatResolver);

  MetaResourceFeatResolver.getTemporaryDefenseRules = function patchedGetTemporaryDefenseRules(actor) {
    const base = typeof originalGet === 'function' ? originalGet(actor) : [];
    const reactionRules = getTemporaryDefenseReactionRules(actor).map(rule => temporaryDefenseRuleFromReaction(actor, rule));
    return [...base, ...reactionRules].filter(rule => !rule.oncePer || EncounterUseTracker.canUse(actor, rule.featureKey, { oncePer: rule.oncePer }));
  };

  MetaResourceFeatResolver.applyTemporaryDefenseRule = async function patchedApplyTemporaryDefenseRule(actor, ruleOrId = null) {
    if (typeof originalApply !== 'function') return { success: false, reason: 'Temporary defense resolver is not available.' };
    const rule = typeof ruleOrId === 'object'
      ? ruleOrId
      : this.getTemporaryDefenseRules(actor).find(candidate => !ruleOrId || candidate.id === ruleOrId || candidate.sourceId === ruleOrId);
    if (rule?.oncePer) {
      const allowed = await EncounterUseTracker.checkAndMarkUsed(actor, rule.featureKey, { oncePer: rule.oncePer });
      if (!allowed.allowed) return { success: false, reason: allowed.reason ?? `${rule.sourceName} has already been used.` };
    }
    return originalApply(actor, rule ?? ruleOrId);
  };

  MetaResourceFeatResolver.__swseSkillFeatTemporaryDefensePatched = true;
}

export const SkillFeatRuntime = {
  isSkillTrained,
  canUseDaily,
  resolveSkillActionEconomyOptions,
  resolveSkillActionEconomy,
  consumeSkillActionEconomy,
  getMovementSkillRiders,
  retainsDexBonusToReflexWhileClimbing,
  getAreaAttackCoverDamageRules,
  resolveAreaAttackCoverDamageDisposition,
  getTemporaryDefenseReactionRules
};

function patchSkillRerollOptions() {
  if (SkillFeatResolver.__swseSkillFeatRuleRerollPatched === true) return;
  const original = SkillFeatResolver.getSkillRerollOptions?.bind(SkillFeatResolver);
  SkillFeatResolver.getSkillRerollOptions = function patchedGetSkillRerollOptions(actor, skillKey, context = {}) {
    const base = typeof original === 'function' ? original(actor, skillKey, context) : [];
    const runtimeSkill = toRuntimeSkillKey(skillKey) ?? skillKey;
    const collected = SkillFeatRuleResolver.collectSkillRerolls(actor, runtimeSkill, context?.extraUseId ?? null, context)
      .filter(rule => isRuleAvailable(actor, runtimeSkill, rule))
      .map(rule => toRerollOption(actor, runtimeSkill, rule));
    return dedupeOptions([...base, ...collected]);
  };
  SkillFeatResolver.__swseSkillFeatRuleRerollPatched = true;
}

function patchSkillRerollButton() {
  if (SkillFeatResolver.__swseSkillFeatDailyRerollPatched === true) return;
  const original = SkillFeatResolver.resolveChatRerollButton?.bind(SkillFeatResolver);
  SkillFeatResolver.resolveChatRerollButton = async function patchedResolveChatRerollButton(button, options = {}) {
    if (!(button instanceof HTMLElement) || typeof original !== 'function') return null;
    const oncePer = button.dataset.oncePer;
    const ruleId = button.dataset.ruleId || button.dataset.sourceId || '';
    const actor = game.actors?.get?.(button.dataset.actorId);
    if (oncePer === 'day' && actor && ruleId) {
      const featureKey = dailyFeatureKey(ruleId);
      if (!canUseDaily(actor, featureKey)) {
        ui?.notifications?.warn?.(`${button.dataset.sourceName || 'Skill reroll'} has already been used today.`);
        return null;
      }
      const result = await original(button, options);
      if (result) await markDailyUsed(actor, featureKey);
      return result;
    }
    return original(button, options);
  };
  SkillFeatResolver.__swseSkillFeatDailyRerollPatched = true;
}

function patchSkillUseSubstitution() {
  if (SkillFeatResolver.__swseSkillFeatRuleSubstitutionPatched === true) return;
  const original = SkillFeatResolver.resolveSkillUseSubstitution?.bind(SkillFeatResolver);
  SkillFeatResolver.resolveSkillUseSubstitution = function patchedResolveSkillUseSubstitution(actor, skillUse = {}, currentSkillKey = null, context = {}) {
    const base = typeof original === 'function' ? original(actor, skillUse, currentSkillKey, context) : null;
    if (base) return base;

    const runtimeSkill = toRuntimeSkillKey(currentSkillKey) ?? currentSkillKey;
    const substitutions = SkillFeatRuleResolver.collect(actor, {
      skillId: runtimeSkill,
      extraUseId: context?.extraUseId ?? context?.useKey ?? null,
      context: { ...context, skillUse }
    }).skillSubstitutions;

    for (const rule of substitutions) {
      const toSkill = toRuntimeSkillKey(rule.alternateSkill ?? rule.toSkill ?? rule.skill ?? rule.toSkillKey);
      if (!toSkill) continue;
      return {
        skillKey: toSkill,
        sourceName: rule.source ?? rule.label ?? 'Skill substitution',
        sourceId: rule.sourceId,
        description: rule.summary ?? `${rule.source ?? rule.label}: use ${SkillFeatResolver.getSkillLabel?.(toSkill) ?? toSkill} for this skill use`,
        originalSkillKey: runtimeSkill,
        grantsTrainingForUse: rule.grantsTrainingForUse === true,
        rule
      };
    }

    return null;
  };
  SkillFeatResolver.__swseSkillFeatRuleSubstitutionPatched = true;
}

export function registerSkillFeatRuntimePatches() {
  if (registered) return;
  registered = true;
  patchSkillRerollOptions();
  patchSkillRerollButton();
  patchSkillUseSubstitution();
  patchTemporaryDefenseRules();
  game.swse ??= {};
  game.swse.skills ??= {};
  game.swse.skills.skillFeatRuntime = SkillFeatRuntime;
  SWSELogger.log('[SkillFeatRuntime] Skill feat runtime bridges registered');
}

export default registerSkillFeatRuntimePatches;
