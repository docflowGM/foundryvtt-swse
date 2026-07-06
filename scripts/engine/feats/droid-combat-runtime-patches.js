import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { EffectiveWeaponQualityResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/effective-weapon-quality-resolver.js";
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

function contextAffirms(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeKey(featName);
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeKey(item.name) === wanted);
}

function collectRules(actor, type) {
  const out = [];
  for (const item of actorItems(actor)) {
    if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
    for (const rule of asArray(item?.system?.abilityMeta?.rules)) {
      if (rule?.type !== type) continue;
      out.push({ ...rule, sourceName: item.name, sourceId: item.id });
    }
  }
  return out;
}

function weaponText(weapon, context = {}) {
  const system = weapon?.system ?? {};
  return [
    context.weaponCategory,
    context.weaponType,
    context.weaponGroup,
    context.damageType,
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.weaponCategory,
    system.group,
    system.category,
    system.type,
    system.subtype,
    system.damageType,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties
  ].map(normalizeKey).filter(Boolean).join(' ');
}

function weaponMatchesText(weapon, rule, context = {}) {
  const text = weaponText(weapon, context);
  const required = asArray(rule.requiresWeaponText).map(normalizeKey).filter(Boolean);
  if (!required.length) return true;
  return required.some(value => text.includes(value));
}

function isRangedContext(context = {}) {
  const attackType = normalizeKey(context.attackType ?? context.workflowContext?.attackType ?? '');
  return !attackType || attackType === 'ranged';
}

function isProficientContext(context = {}) {
  const explicit = context.weaponProficient ?? context.isWeaponProficient ?? context.workflowContext?.weaponProficient ?? context.workflowContext?.isWeaponProficient;
  return explicit === undefined ? true : contextAffirms(explicit);
}

function isDroidActor(actor) {
  const system = actor?.system ?? {};
  const values = [actor?.type, actor?.name, system.actorType, system.creatureType, system.details?.type, system.details?.creatureType, system.species, system.details?.species];
  return values.map(normalizeKey).some(value => value.includes('droid')) || contextAffirms(system.isDroid);
}

function isOrganicTarget(context = {}) {
  if (contextAffirms(context.targetIsOrganic) || contextAffirms(context.workflowContext?.targetIsOrganic)) return true;
  if (contextAffirms(context.targetIsDroid) || contextAffirms(context.workflowContext?.targetIsDroid)) return false;
  const target = context.target ?? context.targetActor ?? context.workflowContext?.target ?? context.workflowContext?.targetActor ?? null;
  const system = target?.system ?? {};
  const values = [target?.type, target?.name, system.actorType, system.creatureType, system.details?.type, system.details?.creatureType, system.species, system.details?.species];
  return !values.map(normalizeKey).some(value => value.includes('droid'));
}

function addBreakdown(result, label, value, type) {
  result.breakdown ??= [];
  if (!result.breakdown.some(entry => entry?.label === label && entry?.type === type)) {
    result.breakdown.push({ label, value, type });
  }
}

function applyDisabler(result, actor, weapon, context = {}) {
  if (!actor || !weapon || !isRangedContext(context) || !isProficientContext(context)) return result;
  const hasDisabler = actorHasFeat(actor, 'Disabler') || collectRules(actor, 'WEAPON_TEMPLATE_MUTATION').some(rule => rule.source === 'Disabler');
  if (!hasDisabler) return result;

  for (const rule of collectRules(actor, 'WEAPON_TEMPLATE_MUTATION')) {
    if (rule.id !== 'disablerIonGrenadeBurstRadius' || !weaponMatchesText(weapon, rule, context)) continue;
    result.areaTemplateMutations = asArray(result.areaTemplateMutations).concat({
      id: rule.id,
      source: rule.sourceName ?? rule.source,
      label: rule.label,
      type: 'weaponTemplateMutation',
      property: rule.property,
      value: rule.value,
      burstRadius: rule.value,
      rule
    });
    result.flags ??= {};
    result.flags.disablerIonGrenadeBurstRadius = true;
  }

  for (const rule of collectRules(actor, 'WEAPON_DAMAGE_DIE_SIZE_SET')) {
    if (rule.id !== 'disablerIonPistolDamageD8' || !weaponMatchesText(weapon, rule, context)) continue;
    result.damageDieSizeSet = Math.max(Number(result.damageDieSizeSet ?? 0) || 0, Number(rule.toDieSize ?? 8) || 8);
    result.flags ??= {};
    result.flags.disablerIonPistolDamageD8 = true;
    addBreakdown(result, rule.label, rule.toDieSize, 'damageDieSizeSet');
  }

  for (const rule of collectRules(actor, 'WEAPON_PROPERTY_OVERRIDE')) {
    if (rule.id !== 'disablerIonRifleAccurate' || !weaponMatchesText(weapon, rule, context)) continue;
    EffectiveWeaponQualityResolver.apply(result, [{ quality: 'accurate', mode: 'add', label: rule.label }], 'Disabler');
    result.flags ??= {};
    result.flags.disablerIonRifleAccurate = true;
  }

  return result;
}

function getAimActionRiders(actor, context = {}) {
  if (!actor) return [];
  const actionKey = normalizeKey(context.actionKey ?? context.workflowContext?.actionKey ?? 'aim');
  const rules = [
    ...collectRules(actor, 'AIM_ACTION_VARIANT'),
    ...collectRules(actor, 'AIM_ACTION_RIDER')
  ];
  return rules.filter(rule => {
    if (rule.requiresDroid && !isDroidActor(actor)) return false;
    if (rule.requiresProficientWeapon && !isProficientContext(context)) return false;
    if (rule.id === 'aimingAccuracyFullRoundAim' && actionKey && actionKey !== 'aiming-accuracy') return false;
    return true;
  }).map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: rule.type === 'AIM_ACTION_VARIANT' ? 'aimActionVariant' : 'aimActionRider',
    actionKey: rule.actionKey,
    actionName: rule.actionName,
    actionCost: rule.actionCost,
    effect: rule.effect,
    permitsNonConsecutiveRoundAimSwifts: rule.permitsNonConsecutiveRoundAimSwifts === true,
    permitsOtherTargetAttacksBeforeAimComplete: rule.permitsOtherTargetAttacksBeforeAimComplete === true,
    losesAimIfTargetOutOfLineOfSight: rule.losesAimIfTargetOutOfLineOfSight === true,
    rule
  }));
}

function getUnarmedHitRiders(actor, context = {}) {
  if (!actor) return [];
  const unarmed = contextAffirms(context.unarmedAttack) || contextAffirms(context.workflowContext?.unarmedAttack);
  const damaged = contextAffirms(context.damageDealt) || contextAffirms(context.workflowContext?.damageDealt);
  if (!unarmed || !damaged) return [];
  return collectRules(actor, 'UNARMED_HIT_RIDER').filter(rule => {
    if (rule.requiresDroid && !isDroidActor(actor)) return false;
    if (rule.requiresOrganicTarget && !isOrganicTarget(context)) return false;
    return true;
  }).map(rule => {
    const isAoo = contextAffirms(context.attackOfOpportunity) || contextAffirms(context.workflowContext?.attackOfOpportunity);
    return {
      id: rule.id,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'unarmedHitRider',
      targetPenalty: {
        ...rule.targetPenalty,
        duration: isAoo ? rule.targetPenalty?.attackOfOpportunityDuration : rule.targetPenalty?.duration
      },
      rule
    };
  });
}

function getDroidSpecialAttackActions(actor, context = {}) {
  if (!actor || !isDroidActor(actor)) return [];
  return collectRules(actor, 'SPECIAL_UNARMED_ATTACK_ACTION').filter(rule => {
    const actionKey = normalizeKey(context.actionKey ?? '');
    if (actionKey && normalizeKey(rule.actionKey) !== actionKey) return false;
    return true;
  }).map(rule => {
    const hasCrush = actorHasFeat(actor, 'Crush');
    return {
      id: rule.id,
      key: rule.actionKey,
      source: rule.sourceName ?? rule.source ?? rule.label,
      name: rule.actionName,
      label: rule.label,
      type: 'specialUnarmedAttackAction',
      actionCost: rule.actionCost ?? 'standard',
      attackType: rule.attackType ?? 'melee',
      attackBonus: Number(rule.attackBonus ?? 0) || 0,
      virtualWeapon: rule.virtualWeapon,
      selfPenalty: rule.selfPenalty,
      onExceedsDamageThreshold: rule.onExceedsDamageThreshold,
      crushFeatRider: hasCrush ? rule.crushFeatRider : null,
      unarmedExtraWeaponDice: hasCrush ? Number(rule.crushFeatRider?.unarmedExtraWeaponDice ?? 0) || 0 : 0,
      advisoryOnly: true,
      rule
    };
  });
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseDroidCombatRuntimePatched === true) return;
  const originalCollect = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof originalCollect === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedDroidCombatCollect(actor, weapon, options = {}) {
      const result = originalCollect(actor, weapon, options) ?? {};
      try {
        applyDisabler(result, actor, weapon, options);
      } catch (err) {
        SWSELogger.warn('[DroidCombatRuntime] Failed to apply Disabler weapon mutations', { error: err });
      }
      return result;
    };
  }
  CombatOptionResolver.getAimActionRiders = getAimActionRiders;
  CombatOptionResolver.getUnarmedHitRiders = getUnarmedHitRiders;
  CombatOptionResolver.getDroidSpecialAttackActions = getDroidSpecialAttackActions;
  CombatOptionResolver.__swseDroidCombatRuntimePatched = true;
}

export function registerDroidCombatRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.getAimActionRiders = getAimActionRiders;
  game.swse.feats.getUnarmedHitRiders = getUnarmedHitRiders;
  game.swse.feats.getDroidSpecialAttackActions = getDroidSpecialAttackActions;
  SWSELogger.log('[DroidCombatRuntime] Runtime helpers registered');
}

export { getAimActionRiders, getUnarmedHitRiders, getDroidSpecialAttackActions };

export default registerDroidCombatRuntimePatches;
