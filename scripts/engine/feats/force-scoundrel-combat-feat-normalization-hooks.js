import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function withoutExistingRules(rules, ids) {
  const remove = new Set(ids.map(String));
  return asArray(rules).filter(rule => !remove.has(String(rule?.id ?? rule?.key ?? '')));
}

function angledThrowRule() {
  return {
    type: 'ATTACK_OPTION',
    id: 'angledThrow',
    label: 'Angled Throw',
    control: 'toggle',
    requiresAttackType: 'grenade',
    requiresWeaponText: ['grenade', 'grenadelike', 'grenade-like'],
    coverOverrideAfterRoll: {
      ignoreCoverTypes: ['cover', 'improvedCover'],
      doesNotIgnore: ['totalCover'],
      requiresAttackTotalExceedsReflex: 15,
      note: 'If the grenade attack roll exceeds Reflex Defense 15, ignore Cover and Improved Cover but not Total Cover.'
    },
    source: 'Angled Throw',
    summary: 'Grenade option: bounce the throw to ignore Cover/Improved Cover if attack roll exceeds Reflex 15.'
  };
}

function blasterBarrageRule() {
  return {
    type: 'AUTOFIRE_DAMAGE_RIDER',
    id: 'blasterBarrageAllyAutofireBonus',
    requiresAutofire: true,
    requiresDamage: true,
    targetEffectsOnDamage: [{
      type: 'ally-autofire-attack-bonus-against-damaged-target',
      sourceName: 'Blaster Barrage',
      bonus: 2,
      bonusType: 'circumstance',
      appliesTo: 'allyAutofireAttacksAgainstSameTarget',
      duration: 'untilBeginningOfSourceNextTurn',
      targetScoped: true
    }],
    source: 'Blaster Barrage',
    label: 'Blaster Barrage: allies gain +2 circumstance on Autofire against damaged target'
  };
}

function crossfireRule() {
  return {
    type: 'MISS_RIDER',
    id: 'crossfireSoftCoverProviderAttack',
    requiresAttackType: 'ranged',
    requiresMiss: true,
    requiresTargetSoftCover: true,
    oncePer: 'round',
    targetEffectsOnMiss: [{
      type: 'immediate-attack-against-soft-cover-provider',
      sourceName: 'Crossfire',
      sameWeapon: true,
      sameAttackBonus: true,
      target: 'softCoverProvider',
      timing: 'immediate',
      manualResolution: false
    }],
    source: 'Crossfire',
    label: 'Crossfire: missed soft-cover target can redirect attack to cover provider once/round'
  };
}

function deadlySniperRule() {
  return {
    type: 'ATTACK_OPTION',
    id: 'deadlySniper',
    label: 'Deadly Sniper',
    control: 'flag',
    requiresAttackType: 'ranged',
    requiresTargetUnawareOfYou: true,
    firstAttackEachTurnOnly: true,
    attackModifier: 2,
    damageExtraWeaponDice: 1,
    source: 'Deadly Sniper',
    summary: 'First ranged attack each turn against a target unaware of you gains +2 attack and +1 weapon die damage.'
  };
}

function desperateGambitRule() {
  return {
    type: 'MISS_REROLL_RESOURCE',
    id: 'desperateGambitMissReroll',
    requiresMiss: true,
    oncePer: 'turn',
    keep: 'second',
    canUseOnNaturalOne: true,
    defensePenaltyOnUse: {
      defense: 'reflex',
      value: -2,
      naturalOneValue: -5,
      duration: 'untilEndOfNextTurn'
    },
    source: 'Desperate Gambit',
    label: 'Desperate Gambit: once/turn miss reroll with Reflex penalty'
  };
}

function wickedStrikeRule() {
  return {
    type: 'HIT_RIDER',
    id: 'wickedStrikeRapidStrikeSecondaryAttack',
    requiresRapidStrike: true,
    requiresAttackType: 'melee',
    requiresSingleNonAreaAttack: true,
    requiresDamage: true,
    oncePer: 'turn',
    targetEffectsOnHit: [{
      type: 'secondary-melee-attack-half-original-damage',
      sourceName: 'Wicked Strike',
      attackPenalty: -2,
      target: 'secondTargetWithinReach',
      damage: 'halfOriginalDamage',
      timing: 'immediate',
      manualResolution: false
    }],
    source: 'Wicked Strike',
    label: 'Wicked Strike: Rapid Strike hit can catch second target within reach'
  };
}

function specForFeat(item) {
  switch (normalizeName(item?.name)) {
    case 'angled throw':
      return { rules: [angledThrowRule()], executionModel: 'ACTIVE', subType: 'ATTACK_OPTION', mode: 'grenade_cover_override_option', scope: 'grenade_attack_cover_context' };
    case 'blaster barrage':
      return { rules: [blasterBarrageRule()], executionModel: 'PASSIVE', subType: 'RULE', mode: 'autofire_damage_rider', scope: 'autofire_damage_context' };
    case 'crossfire':
      return { rules: [crossfireRule()], executionModel: 'PASSIVE', subType: 'RULE', mode: 'ranged_soft_cover_miss_rider', scope: 'ranged_attack_miss_context' };
    case 'deadly sniper':
      return { rules: [deadlySniperRule()], executionModel: 'PASSIVE', subType: 'STATE', mode: 'hidden_ranged_attack_rider', scope: 'first_unaware_target_ranged_attack_context' };
    case 'desperate gambit':
      return { rules: [desperateGambitRule()], executionModel: 'PASSIVE', subType: 'RULE', mode: 'miss_reroll_defense_drawback', scope: 'attack_miss_context' };
    case 'wicked strike':
      return { rules: [wickedStrikeRule()], executionModel: 'PASSIVE', subType: 'RULE', mode: 'rapid_strike_secondary_target_rider', scope: 'rapid_strike_hit_context' };
    default:
      return null;
  }
}

async function normalizeForceScoundrelCombatFeat(item, options = {}) {
  if (options?.swseForceScoundrelCombatFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const spec = specForFeat(item);
  if (!spec) return false;

  const currentRules = asArray(item.system?.abilityMeta?.rules);
  const nextRules = withoutExistingRules(currentRules, spec.rules.map(rule => rule.id));
  nextRules.push(...spec.rules);

  const patch = {
    'system.executionModel': spec.executionModel,
    'system.subType': spec.subType,
    'system.abilityMeta.mechanicsMode': spec.mode,
    'system.abilityMeta.applicationScope': spec.scope,
    'system.abilityMeta.staticSheetPolicy': 'include',
    'system.abilityMeta.requiresRuntimeContext': true,
    'system.abilityMeta.rules': nextRules
  };

  const modelChanged = item.system?.executionModel !== spec.executionModel
    || item.system?.subType !== spec.subType
    || item.system?.abilityMeta?.mechanicsMode !== spec.mode
    || item.system?.abilityMeta?.applicationScope !== spec.scope
    || item.system?.abilityMeta?.requiresRuntimeContext !== true;
  const rulesChanged = JSON.stringify(nextRules) !== JSON.stringify(currentRules);
  if (!rulesChanged && !modelChanged) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }], {
      source: 'ForceScoundrelCombatFeatNormalization.normalize',
      swseForceScoundrelCombatFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[ForceScoundrelCombatFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerForceScoundrelCombatFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeForceScoundrelCombatFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeForceScoundrelCombatFeat(item, options));
  SWSELogger.log('[ForceScoundrelCombatFeatNormalization] Hooks registered');
}

export default registerForceScoundrelCombatFeatNormalizationHooks;
