import { SkillFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/skills/skill-feat-resolver.js";
import { SkillFeatRuleResolver } from "/systems/foundryvtt-swse/scripts/engine/skills/skill-feat-rule-resolver.js";
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
  if (rule?.oncePer === 'day' && !canUseDaily(actor, rule.id)) return false;
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
  game.swse ??= {};
  game.swse.skills ??= {};
  game.swse.skills.skillFeatRuntime = {
    isSkillTrained,
    canUseDaily
  };
  SWSELogger.log('[SkillFeatRuntime] Skill feat runtime bridges registered');
}

export default registerSkillFeatRuntimePatches;
