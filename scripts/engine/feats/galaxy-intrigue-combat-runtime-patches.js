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

function abilityModifier(actor, ability) {
  const key = normalizeKey(ability).slice(0, 3);
  const value = actor?.system?.abilities?.[key]?.mod
    ?? actor?.system?.attributes?.[key]?.mod
    ?? actor?.system?.stats?.[key]?.mod
    ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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

function weaponText(weapon, context = {}) {
  const system = weapon?.system ?? {};
  return [
    context.weaponCategory,
    context.weaponType,
    context.weaponGroup,
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.weaponCategory,
    system.group,
    system.category,
    system.type,
    system.subtype,
    Array.isArray(system.traits) ? system.traits.join(' ') : system.traits,
    Array.isArray(system.properties) ? system.properties.join(' ') : system.properties
  ].map(normalizeKey).filter(Boolean).join(' ');
}

function isProficientContext(context = {}) {
  const explicit = context.weaponProficient ?? context.isWeaponProficient ?? context.workflowContext?.weaponProficient ?? context.workflowContext?.isWeaponProficient;
  return explicit === undefined ? true : contextAffirms(explicit);
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

function getDefenseReactionResources(actor, context = {}) {
  if (!actor) return [];
  const trigger = normalizeKey(context.trigger ?? context.workflowContext?.trigger ?? 'willDefenseAssault');
  return collectRules(actor, 'DEFENSE_REACTION_RESOURCE').filter(rule => !trigger || normalizeKey(rule.trigger) === trigger).map(rule => {
    const key = `${rule.id}:${rule.sourceId}`;
    const bonus = abilityModifier(actor, rule.bonusAbility ?? 'charisma');
    return {
      id: rule.id,
      key,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'defenseReactionResource',
      actionType: rule.actionType ?? 'reaction',
      oncePer: rule.oncePer,
      available: EncounterUseTracker.canUse(actor, key, { oncePer: rule.oncePer }),
      defense: rule.defense,
      defenseBonus: bonus,
      bonusAbility: rule.bonusAbility,
      bonusType: rule.bonusType,
      duration: rule.duration,
      rule
    };
  });
}

async function spendDefenseReactionResource(actor, resourceKey) {
  return EncounterUseTracker.checkAndMarkUsed(actor, resourceKey, { oncePer: 'encounter' });
}

function getCoverRiders(actor, context = {}) {
  if (!actor) return [];
  const qualifies = contextAffirms(context.attackerInCoverProvidedByCharacterCreatureOrDroid)
    || contextAffirms(context.workflowContext?.attackerInCoverProvidedByCharacterCreatureOrDroid);
  if (!qualifies) return [];
  return collectRules(actor, 'ADVISORY_COVER_RIDER').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'advisoryCoverRider',
    grantsCoverAgainstTriggeringOpponent: rule.grantsCoverAgainstTriggeringOpponent === true,
    advisoryOnly: rule.advisoryOnly !== false,
    rule
  }));
}

function getCoupDeGraceRiders(actor, context = {}) {
  if (!actor) return [];
  const trigger = normalizeKey(context.trigger ?? context.workflowContext?.trigger ?? 'coupDeGraceDeliveredToHelplessCreature');
  return collectRules(actor, 'COUP_DE_GRACE_RIDER').filter(rule => !trigger || normalizeKey(rule.trigger) === trigger).map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'coupDeGraceRider',
    affectedTargets: rule.affectedTargets,
    conditionTrackSteps: rule.conditionTrackSteps,
    duration: rule.duration,
    rule
  }));
}

function getAllyReactionRiders(actor, context = {}) {
  if (!actor) return [];
  const tookDamage = contextAffirms(context.tookDamage) || contextAffirms(context.sourceTakesDamage) || contextAffirms(context.workflowContext?.tookDamage);
  if (!tookDamage) return [];
  return collectRules(actor, 'ALLY_REACTION_RIDER').map(rule => {
    const key = `${rule.id}:${rule.sourceId}`;
    return {
      id: rule.id,
      key,
      source: rule.sourceName ?? rule.source ?? rule.label,
      label: rule.label,
      type: 'allyReactionRider',
      oncePer: rule.oncePer,
      available: EncounterUseTracker.canUse(actor, key, { oncePer: rule.oncePer }),
      advisoryOnly: rule.advisoryOnly !== false,
      allies: rule.allies,
      rule
    };
  });
}

async function spendAllyReactionRider(actor, riderKey) {
  return EncounterUseTracker.checkAndMarkUsed(actor, riderKey, { oncePer: 'encounter' });
}

function getWeaponHandlingRiders(actor, weapon, context = {}) {
  if (!actor || !weapon) return [];
  const oneHanding = contextAffirms(context.oneHandingNormallyTwoHandedWeapon)
    || contextAffirms(context.workflowContext?.oneHandingNormallyTwoHandedWeapon);
  const normallyTwoHanded = contextAffirms(context.normallyTwoHandedWeapon)
    || contextAffirms(context.workflowContext?.normallyTwoHandedWeapon)
    || /two-handed|twohanded|two-hand/.test(weaponText(weapon, context));
  if (!oneHanding || !normallyTwoHanded || !isProficientContext(context)) return [];
  return collectRules(actor, 'ADVISORY_WEAPON_HANDLING_RIDER').map(rule => ({
    id: rule.id,
    source: rule.sourceName ?? rule.source ?? rule.label,
    label: rule.label,
    type: 'advisoryWeaponHandlingRider',
    permitsOneHandedUse: rule.permitsOneHandedUse === true,
    attackPenalty: Number(rule.attackPenalty ?? 0) || 0,
    appliesToAttackTypes: asArray(rule.appliesToAttackTypes),
    advisoryOnly: rule.advisoryOnly !== false,
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

function collectAdvisoryCombatRiders(result, actor, weapon, context = {}) {
  const weaponHandling = getWeaponHandlingRiders(actor, weapon, context);
  if (!weaponHandling.length) return;
  result.advisoryCombatModifiers = asArray(result.advisoryCombatModifiers).concat(weaponHandling);
  result.flags ??= {};
  result.flags.hasAdvisoryCombatModifiers = true;
}

function patchCombatOptionResolver() {
  if (CombatOptionResolver.__swseGalaxyIntrigueCombatRuntimePatched === true) return;
  const originalCollect = CombatOptionResolver.collectAttackModifiers?.bind(CombatOptionResolver);
  if (typeof originalCollect === 'function') {
    CombatOptionResolver.collectAttackModifiers = function patchedGalaxyIntrigueCollect(actor, weapon, options = {}) {
      const result = originalCollect(actor, weapon, options) ?? {};
      try {
        applyFlecheChargeRider(result, actor, options);
        collectAdvisoryCombatRiders(result, actor, weapon, options);
      } catch (err) {
        SWSELogger.warn('[GalaxyIntrigueCombatRuntime] Failed to apply Galaxy of Intrigue combat riders', { error: err });
      }
      return result;
    };
  }
  CombatOptionResolver.getAttackOfOpportunityDamageRiders = getAttackOfOpportunityDamageRiders;
  CombatOptionResolver.getChargeAttackRiders = getChargeAttackRiders;
  CombatOptionResolver.spendChargeAttackRider = spendChargeAttackRider;
  CombatOptionResolver.getSpecialRangedAttackActions = getSpecialRangedAttackActions;
  CombatOptionResolver.getDefenseReactionResources = getDefenseReactionResources;
  CombatOptionResolver.spendDefenseReactionResource = spendDefenseReactionResource;
  CombatOptionResolver.getCoverRiders = getCoverRiders;
  CombatOptionResolver.getCoupDeGraceRiders = getCoupDeGraceRiders;
  CombatOptionResolver.getAllyReactionRiders = getAllyReactionRiders;
  CombatOptionResolver.spendAllyReactionRider = spendAllyReactionRider;
  CombatOptionResolver.getWeaponHandlingRiders = getWeaponHandlingRiders;
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
  game.swse.feats.getDefenseReactionResources = getDefenseReactionResources;
  game.swse.feats.spendDefenseReactionResource = spendDefenseReactionResource;
  game.swse.feats.getCoverRiders = getCoverRiders;
  game.swse.feats.getCoupDeGraceRiders = getCoupDeGraceRiders;
  game.swse.feats.getAllyReactionRiders = getAllyReactionRiders;
  game.swse.feats.spendAllyReactionRider = spendAllyReactionRider;
  game.swse.feats.getWeaponHandlingRiders = getWeaponHandlingRiders;
  SWSELogger.log('[GalaxyIntrigueCombatRuntime] Runtime helpers registered');
}

export {
  getAttackOfOpportunityDamageRiders,
  getChargeAttackRiders,
  spendChargeAttackRider,
  getSpecialRangedAttackActions,
  getDefenseReactionResources,
  spendDefenseReactionResource,
  getCoverRiders,
  getCoupDeGraceRiders,
  getAllyReactionRiders,
  spendAllyReactionRider,
  getWeaponHandlingRiders
};

export default registerGalaxyIntrigueCombatRuntimePatches;
