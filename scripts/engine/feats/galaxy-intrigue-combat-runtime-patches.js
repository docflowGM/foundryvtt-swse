import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { EncounterUseTracker } from "/systems/foundryvtt-swse/scripts/engine/feats/encounter-use-tracker.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeKey(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

function optionActive(context = {}, id) {
  const key = normalizeKey(id);
  return contextAffirms(context[id])
    || contextAffirms(context[key])
    || contextAffirms(context.attackOptions?.[id])
    || contextAffirms(context.attackOptions?.[key])
    || contextAffirms(context.combatOptions?.[id])
    || contextAffirms(context.combatOptions?.[key])
    || asArray(context.selectedOptions).map(normalizeKey).includes(key)
    || asArray(context.workflowContext?.selectedOptions).map(normalizeKey).includes(key);
}

function isChargeContext(context = {}) {
  return contextAffirms(context.charge)
    || contextAffirms(context.isCharge)
    || normalizeKey(context.actionKey ?? context.workflowContext?.actionKey ?? '') === 'charge'
    || normalizeKey(context.attackMode ?? context.workflowContext?.attackMode ?? '') === 'charge';
}

function isAttackOfOpportunityDamageContext(context = {}) {
  const aoo = contextAffirms(context.attackOfOpportunity)
    || contextAffirms(context.isAttackOfOpportunity)
    || normalizeKey(context.actionKey ?? context.workflowContext?.actionKey ?? '') === 'attack-of-opportunity';
  const damaged = contextAffirms(context.damageDealt)
    || contextAffirms(context.workflowContext?.damageDealt)
    || Number(context.damageTotal ?? context.workflowContext?.damageTotal ?? 0) > 0;
  return aoo && damaged;
}

function isRangedAttack(weapon, context = {}) {
  const type = normalizeKey(context.attackType ?? context.workflowContext?.attackType ?? '');
  if (type === 'ranged') return true;
  if (type === 'melee') return false;
  const system = weapon?.system ?? {};
  const text = [weapon?.name, system.weaponType, system.weaponGroup, system.category, system.type, system.subtype, system.traits, system.properties]
    .flatMap(value => Array.isArray(value) ? value : [value])
    .map(normalizeKey)
    .filter(Boolean)
    .join(' ');
  return /ranged|blaster|pistol|rifle|bowcaster|slugthrower|grenade|thrown/.test(text);
}

function getAttackOfOpportunityDamageRiders(actor, context = {}) {
  if (!actor || !isAttackOfOpportunityDamageContext(context)) return [];
  return collectRules(actor, 'ATTACK_OF_OPPORTUNITY_DAMAGE_RIDER').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'attackOfOpportunityDamageRider',
    freeAction: rule.freeAction,
    trigger: rule.trigger,
    target: 'damagedOpponent',
    rule
  }));
}

function getChargeAttackRiders(actor, context = {}) {
  if (!actor || !isChargeContext(context)) return [];
  return collectRules(actor, 'CHARGE_ATTACK_RIDER').map(rule => {
    const key = `${rule.id}:${rule.sourceId}`;
    return {
      id: rule.id,
      key,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'chargeAttackRider',
      selectedOption: rule.selectedOption,
      oncePer: rule.oncePer,
      available: EncounterUseTracker.canUse(actor, key, { oncePer: rule.oncePer }),
      criticalThreatNaturalMin: rule.criticalThreatNaturalMin,
      criticalThreatNaturalMax: rule.criticalThreatNaturalMax,
      rule
    };
  });
}

async function spendChargeAttackRider(actor, riderKey) {
  return EncounterUseTracker.checkAndMarkUsed(actor, riderKey, { oncePer: 'encounter' });
}

function getSpecialRangedAttackActions(actor, weapon, context = {}) {
  if (!actor) return [];
  return collectRules(actor, 'SPECIAL_RANGED_ATTACK_ACTION').filter(rule => {
    const actionKey = normalizeKey(context.actionKey ?? '');
    if (actionKey && normalizeKey(rule.actionKey) !== actionKey) return false;
    if (rule.requiresAttackType === 'ranged' && !isRangedAttack(weapon, context)) return false;
    return true;
  }).map(rule => ({
    id: rule.id,
    key: rule.actionKey,
    source: rule.sourceName ?? rule.source ?? rule.label,
    name: rule.actionName,
    label: rule.label,
    type: 'specialRangedAttackAction',
    actionCost: rule.actionCost ?? 'standard',
    secondAttack: rule.secondAttack,
    damageResolution: rule.damageResolution,
    requiresSingleTargetPrimaryAttack: rule.requiresSingleTargetPrimaryAttack === true,
    advisoryOnly: true,
    rule
  }));
}

function applyFlecheChargeRider(result, actor, context = {}) {
  if (!actor || !isChargeContext(context) || !optionActive(context, 'fleche')) return;
  const riders = getChargeAttackRiders(actor, context).filter(rider => rider.id === 'flecheChargeCriticalThreat17' && rider.available);
  if (!riders.length) return;
  const rider = riders[0];
  result.flags ??= {};
  result.flags.flecheChargeCriticalThreat17 = true;
  result.criticalThreatNaturalMin = Math.min(Number(result.criticalThreatNaturalMin ?? 20) || 20, Number(rider.criticalThreatNaturalMin ?? 17) || 17);
  result.criticalThreatNaturalMax = Math.max(Number(result.criticalThreatNaturalMax ?? 20) || 20, Number(rider.criticalThreatNaturalMax ?? 20) || 20);
  result.chargeAttackRiders = asArray(result.chargeAttackRiders).concat(rider);
  result.breakdown ??= [];
  if (!result.breakdown.some(entry => entry?.label === rider.label)) {
    result.breakdown.push({ label: rider.label, value: '17-20', type: 'criticalThreat' });
  }
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseGalaxyIntrigueCombatRuntimePatched === true) return;
  const originalCollect = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof originalCollect === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedGalaxyIntrigueCollect(actor, weapon, options = {}) {
      const result = originalCollect(actor, weapon, options) ?? {};
      try {
        applyFlecheChargeRider(result, actor, options);
      } catch (err) {
        SWSELogger.warn('[GalaxyIntrigueCombatRuntime] Failed to apply Flèche charge rider', { error: err });
      }
      return result;
    };
  }
  CombatOptionResolver.getAttackOfOpportunityDamageRiders = getAttackOfOpportunityDamageRiders;
  CombatOptionResolver.getChargeAttackRiders = getChargeAttackRiders;
  CombatOptionResolver.spendChargeAttackRider = spendChargeAttackRider;
  CombatOptionResolver.getSpecialRangedAttackActions = getSpecialRangedAttackActions;
  CombatOptionResolver.__swseGalaxyIntrigueCombatRuntimePatched = true;
}

export function registerGalaxyIntrigueCombatRuntimePatches() {
  if (registered) return;
  registered = true;
  patchCombatOptionResolver();
  game.swse ??= {};
  game.swse.feats ??= {};
  game.swse.feats.getAttackOfOpportunityDamageRiders = getAttackOfOpportunityDamageRiders;
  game.swse.feats.getChargeAttackRiders = getChargeAttackRiders;
  game.swse.feats.spendChargeAttackRider = spendChargeAttackRider;
  game.swse.feats.getSpecialRangedAttackActions = getSpecialRangedAttackActions;
  SWSELogger.log('[GalaxyIntrigueCombatRuntime] Runtime helpers registered');
}

export {
  getAttackOfOpportunityDamageRiders,
  getChargeAttackRiders,
  spendChargeAttackRider,
  getSpecialRangedAttackActions
};

export default registerGalaxyIntrigueCombatRuntimePatches;
