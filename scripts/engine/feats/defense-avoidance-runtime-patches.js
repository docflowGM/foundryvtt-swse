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

function getDefenseRules(item) {
  return asArray(item?.system?.abilityMeta?.defenseRules);
}

function collectRules(actor, type) {
  const rules = [];
  for (const feat of actorItems(actor)) {
    if (feat?.type !== 'feat' || feat?.system?.disabled === true) continue;
    for (const rule of getDefenseRules(feat)) {
      if (rule?.type !== type) continue;
      rules.push({ ...rule, sourceName: feat.name, sourceId: feat.id });
    }
  }
  return rules;
}

function contextAffirms(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function numeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function hasFeat(actor, featName) {
  const wanted = normalizeKey(featName);
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeKey(item?.name) === wanted);
}

function selectedOptionKeys(context = {}) {
  const keys = new Set();
  for (const key of asArray(context.selectedAdvisoryOptions)) keys.add(normalizeKey(key));
  for (const key of asArray(context.selectedAttackOptions)) keys.add(normalizeKey(key));
  for (const key of asArray(context.workflowContext?.selectedAdvisoryOptions)) keys.add(normalizeKey(key));
  for (const key of asArray(context.workflowContext?.selectedAttackOptions)) keys.add(normalizeKey(key));
  return keys;
}

function getBaseAttackBonus(actor, context = {}) {
  return numeric(context.baseAttackBonus ?? context.bab ?? context.workflowContext?.baseAttackBonus
    ?? actor?.system?.attributes?.bab?.value
    ?? actor?.system?.bab
    ?? actor?.system?.derived?.baseAttackBonus
    ?? actor?.system?.baseAttackBonus,
    0);
}

function actorFlatFooted(context = {}) {
  return contextAffirms(context.actorFlatFooted)
    || contextAffirms(context.flatFooted)
    || contextAffirms(context.workflowContext?.actorFlatFooted)
    || contextAffirms(context.workflowContext?.flatFooted);
}

function isMeleeWeaponProficientThreatContext(context = {}) {
  const melee = contextAffirms(context.meleeWeaponThreat)
    || contextAffirms(context.threatensWithMeleeWeapon)
    || contextAffirms(context.workflowContext?.meleeWeaponThreat)
    || contextAffirms(context.workflowContext?.threatensWithMeleeWeapon);
  const proficient = context.weaponProficient === undefined && context.workflowContext?.weaponProficient === undefined
    ? true
    : contextAffirms(context.weaponProficient ?? context.workflowContext?.weaponProficient);
  return melee && proficient;
}

function getSelectableAttackAdvisories(actor) {
  return collectRules(actor, 'ATTACK_ADVISORY_OPTION')
    .filter(rule => rule?.selection?.playerSelectable === true)
    .map(rule => ({
      key: rule.selection?.key ?? rule.id,
      id: rule.id,
      label: rule.selection?.label ?? rule.label,
      prompt: rule.selection?.prompt ?? rule.summary,
      defaultSelected: rule.selection?.defaultSelected === true,
      source: rule.sourceName ?? rule.source ?? rule.label,
      rule
    }));
}

function applySelectedAttackAdvisoryBonuses(result, actor, context = {}) {
  const selected = selectedOptionKeys(context);
  if (!selected.size) return;
  for (const rule of collectRules(actor, 'ATTACK_ADVISORY_OPTION')) {
    const key = normalizeKey(rule.selection?.key ?? rule.id);
    if (!selected.has(key)) continue;
    const bonus = numeric(rule.attack?.bonus, 0);
    if (!bonus) continue;
    result.attackBonus = numeric(result.attackBonus, 0) + bonus;
    result.breakdown ??= [];
    result.breakdown.push({
      label: rule.sourceName ?? rule.label,
      value: bonus,
      type: rule.attack?.bonusType ?? 'advisory'
    });
    result.flags ??= {};
    result.flags[`${key}AdvisoryBonus`] = true;
    if (rule.selection?.enablesTargetDeniedDexFeatContext === true) {
      result.flags.targetDeniedDexFeatContext = true;
    }
  }
}

function resolveTumbleDefenseRiders(actor, context = {}) {
  if (!actor || actorFlatFooted(context) || !isMeleeWeaponProficientThreatContext(context)) return [];
  return collectRules(actor, 'TUMBLE_DC_RIDER').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'tumbleDcRider',
    dcBonus: getBaseAttackBonus(actor, context),
    target: rule.dcBonus?.target ?? 'acrobatics.tumble.dc',
    failureRider: rule.failureRider,
    advisoryOnly: true,
    note: rule.summary,
    rule
  }));
}

function resolveMovingTargetRiders(actor, context = {}) {
  const moved = numeric(context.distanceFromTurnStartSquares ?? context.workflowContext?.distanceFromTurnStartSquares, 0);
  const explicitlyActivated = contextAffirms(context.movingTargetActive) || contextAffirms(context.workflowContext?.movingTargetActive);
  return collectRules(actor, 'ACTIVATED_DEFENSE_RIDER')
    .filter(rule => !rule.prerequisiteFeat || hasFeat(actor, rule.prerequisiteFeat))
    .filter(rule => explicitlyActivated || moved >= numeric(rule.activation?.distanceFromStartMinimumSquares, 3))
    .map(rule => ({
      id: rule.id,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'activatedDefenseRider',
      target: rule.defenseModifier?.target ?? 'defense.reflex',
      value: numeric(rule.defenseModifier?.value, 1),
      bonusType: rule.defenseModifier?.type ?? 'dodge',
      expires: rule.activation?.expires ?? 'startOfNextTurn',
      rule
    }));
}

function resolveFightDefensivelyRiders(actor, context = {}) {
  const active = contextAffirms(context.fightDefensively)
    || contextAffirms(context.usesFightDefensively)
    || contextAffirms(context.workflowContext?.fightDefensively)
    || normalizeKey(context.actionId ?? context.workflowContext?.actionId ?? '') === 'fight-defensively';
  if (!active) return [];
  return collectRules(actor, 'FIGHT_DEFENSIVELY_DEFENSE_RIDER').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'fightDefensivelyDefenseRider',
    expires: rule.expires ?? 'beginningOfNextTurn',
    defenseModifiers: asArray(rule.defenseModifiers),
    rule
  }));
}

function getDefenseAbilitySubstitutionAdvisories(actor) {
  return collectRules(actor, 'DEFENSE_ABILITY_SUBSTITUTION_ADVISORY').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    defense: rule.defense,
    useEitherAbilityModifier: asArray(rule.useEitherAbilityModifier),
    prerequisite: rule.prerequisite,
    advisoryOnly: true,
    note: rule.summary,
    rule
  }));
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseDefenseAvoidanceRuntimePatched === true) return;
  const original = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof original === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedCollectAttackModifiers(actor, weapon, context = {}) {
      const result = original(actor, weapon, context) ?? {};
      try { applySelectedAttackAdvisoryBonuses(result, actor, context); }
      catch (err) { SWSELogger.warn('[DefenseAvoidanceRuntime] Failed to apply attack advisories', { error: err }); }
      return result;
    };
  }
  CombatOptionResolver.getDefenseAvoidanceAttackAdvisories = getSelectableAttackAdvisories;
  CombatOptionResolver.resolveTumbleDefenseRiders = resolveTumbleDefenseRiders;
  CombatOptionResolver.resolveMovingTargetRiders = resolveMovingTargetRiders;
  CombatOptionResolver.resolveFightDefensivelyRiders = resolveFightDefensivelyRiders;
  CombatOptionResolver.getDefenseAbilitySubstitutionAdvisories = getDefenseAbilitySubstitutionAdvisories;
  CombatOptionResolver.__swseDefenseAvoidanceRuntimePatched = true;
}

export function registerDefenseAvoidanceRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.getDefenseAvoidanceAttackAdvisories = getSelectableAttackAdvisories;
  game.swse.feats.resolveTumbleDefenseRiders = resolveTumbleDefenseRiders;
  game.swse.feats.resolveMovingTargetRiders = resolveMovingTargetRiders;
  game.swse.feats.resolveFightDefensivelyRiders = resolveFightDefensivelyRiders;
  game.swse.feats.getDefenseAbilitySubstitutionAdvisories = getDefenseAbilitySubstitutionAdvisories;
  SWSELogger.log('[DefenseAvoidanceRuntime] Runtime helpers registered');
}

export {
  getSelectableAttackAdvisories,
  resolveTumbleDefenseRiders,
  resolveMovingTargetRiders,
  resolveFightDefensivelyRiders,
  getDefenseAbilitySubstitutionAdvisories
};

export default registerDefenseAvoidanceRuntimePatches;
