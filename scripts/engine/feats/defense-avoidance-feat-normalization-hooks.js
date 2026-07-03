import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getDefenseRules(item) {
  return asArray(item?.system?.abilityMeta?.defenseRules);
}

function getResourceRules(item) {
  const rules = item?.system?.abilityMeta?.resourceRules;
  return rules && typeof rules === 'object' ? rules : {};
}

function hasDefenseAvoidanceRule(item, source) {
  const wanted = normalizeName(source);
  const defenseHit = getDefenseRules(item).some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted);
  const resourceRules = getResourceRules(item);
  const resourceHit = Object.values(resourceRules).flatMap(asArray).some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted);
  return defenseHit || resourceHit;
}

function staticDefenseBonus({ id, label, target, value, type = 'feat', source, summary }) {
  return {
    type: 'STATIC_DEFENSE_BONUS',
    id,
    label,
    target,
    value,
    bonusType: type,
    source,
    summary
  };
}

function advisoryDefenseRule({ id, label, trigger, target = 'defense.reflex', value = null, type = 'conditional', source, summary, conditions = {} }) {
  return {
    type: 'DEFENSE_AVOIDANCE_ADVISORY',
    id,
    label,
    trigger,
    defenseModifier: {
      target,
      value,
      type,
      conditions
    },
    advisoryOnly: true,
    source,
    summary
  };
}

function buildPayloadForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'great fortitude') {
    return {
      defenseRules: [staticDefenseBonus({
        id: 'greatFortitude',
        label: 'Great Fortitude',
        target: 'defense.fortitude',
        value: 2,
        source: 'Great Fortitude',
        summary: 'Adds +2 feat bonus to Fortitude Defense.'
      })]
    };
  }

  if (normalized === 'lightning reflexes') {
    return {
      defenseRules: [staticDefenseBonus({
        id: 'lightningReflexes',
        label: 'Lightning Reflexes',
        target: 'defense.reflex',
        value: 2,
        source: 'Lightning Reflexes',
        summary: 'Adds +2 feat bonus to Reflex Defense.'
      })]
    };
  }

  if (normalized === 'improved damage threshold') {
    return {
      resourceRules: {
        damageThreshold: [{
          type: 'FLAT_BONUS',
          value: 5,
          source: 'Improved Damage Threshold',
          summary: 'Adds +5 to Damage Threshold.'
        }]
      },
      defenseRules: [{
        type: 'DAMAGE_THRESHOLD_BONUS',
        id: 'improvedDamageThreshold',
        value: 5,
        source: 'Improved Damage Threshold',
        summary: 'Adds +5 to Damage Threshold; consumed by MetaResourceFeatResolver damageThreshold rules.'
      }]
    };
  }

  if (normalized === 'fight through pain') {
    return {
      resourceRules: {
        damageThreshold: [{
          type: 'USE_WILL_AS_BASE',
          useBest: true,
          source: 'Fight Through Pain',
          summary: 'Allows damage threshold calculations to use the better of Fortitude or Will when supported by the damage-threshold resolver.'
        }]
      },
      defenseRules: [{
        type: 'DAMAGE_THRESHOLD_BASE_OVERRIDE',
        id: 'fightThroughPain',
        useWillAsBase: true,
        useBestFortitudeOrWill: true,
        source: 'Fight Through Pain',
        summary: 'Damage Threshold base override metadata; consumed by MetaResourceFeatResolver damageThreshold rules.'
      }]
    };
  }

  if (normalized === 'tumble defense') {
    return {
      defenseRules: [advisoryDefenseRule({
        id: 'tumbleDefense',
        label: 'Tumble Defense',
        trigger: 'acrobaticMovementOrTumbleContext',
        target: 'defense.reflex',
        source: 'Tumble Defense',
        summary: 'Stores tumble/movement defense metadata. Exact bonus application waits for movement/AoO workflow context.'
      })]
    };
  }

  if (normalized === 'predictive defense') {
    return {
      defenseRules: [advisoryDefenseRule({
        id: 'predictiveDefense',
        label: 'Predictive Defense',
        trigger: 'knownIncomingAttackOrChosenDefenseContext',
        target: 'defense.reflex',
        source: 'Predictive Defense',
        summary: 'Stores predictive/conditional defense metadata. Exact trigger and target attack context remain workflow adjudicated.'
      })]
    };
  }

  if (normalized === 'moving target') {
    return {
      defenseRules: [advisoryDefenseRule({
        id: 'movingTarget',
        label: 'Moving Target',
        trigger: 'movedBeforeIncomingAttack',
        target: 'defense.reflex',
        source: 'Moving Target',
        summary: 'Stores movement-dependent Reflex defense metadata. Requires workflow context proving movement before application.'
      })]
    };
  }

  if (normalized === 'trench warrior') {
    return {
      defenseRules: [advisoryDefenseRule({
        id: 'trenchWarrior',
        label: 'Trench Warrior',
        trigger: 'coverOrEntrenchedPositionContext',
        target: 'defense.reflex',
        source: 'Trench Warrior',
        summary: 'Stores cover/entrenched-position defense metadata; exact cover state remains GM/workflow adjudicated.'
      })]
    };
  }

  if (normalized === 'cunning attack') {
    return {
      defenseRules: [{
        type: 'OFFENSIVE_DEFENSE_CONTEXT_ADVISORY',
        id: 'cunningAttack',
        label: 'Cunning Attack',
        trigger: 'targetDeniedDexOrFlatFootedContext',
        targetState: 'deniedDexOrFlatFooted',
        source: 'Cunning Attack',
        summary: 'Stores target-vulnerability attack metadata. Actual attack modifier belongs to attack workflow once target state is known.'
      }]
    };
  }

  if (normalized === 'resilient strength') {
    return {
      defenseRules: [{
        type: 'CONDITION_RESILIENCE_ADVISORY',
        id: 'resilientStrength',
        label: 'Resilient Strength',
        trigger: 'strengthOrConditionTrackContext',
        source: 'Resilient Strength',
        summary: 'Stores resilience metadata for condition/strength related defensive handling. Exact modifier waits for condition workflow context.'
      }]
    };
  }

  if (normalized === 'wary defender') {
    return {
      defenseRules: [advisoryDefenseRule({
        id: 'waryDefender',
        label: 'Wary Defender',
        trigger: 'defensiveAwarenessOrSurpriseContext',
        target: 'defense.reflex',
        source: 'Wary Defender',
        summary: 'Stores situational defensive awareness metadata; surprise/awareness context remains workflow adjudicated.'
      })]
    };
  }

  return null;
}

async function normalizeDefenseAvoidanceFeat(item, options = {}) {
  if (options?.swseDefenseAvoidanceFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const payload = buildPayloadForFeat(item.name);
  if (!payload) return false;
  if (hasDefenseAvoidanceRule(item, item.name)) return false;

  const currentResourceRules = getResourceRules(item);
  const mergedResourceRules = { ...currentResourceRules };
  for (const [key, rules] of Object.entries(payload.resourceRules ?? {})) {
    mergedResourceRules[key] = [...asArray(currentResourceRules[key]), ...asArray(rules)];
  }

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'PASSIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'defense_avoidance_rule',
      'system.abilityMeta.applicationScope': 'defense_or_damage_threshold_context',
      'system.abilityMeta.staticSheetPolicy': 'include',
      'system.abilityMeta.defenseRules': [
        ...getDefenseRules(item),
        ...asArray(payload.defenseRules)
      ],
      'system.abilityMeta.resourceRules': mergedResourceRules
    }], {
      source: 'DefenseAvoidanceFeatNormalization.normalize',
      swseDefenseAvoidanceFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[DefenseAvoidanceFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerDefenseAvoidanceFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeDefenseAvoidanceFeat(item, options));
  Hooks.on('updateItem', async (item, data, options) => normalizeDefenseAvoidanceFeat(item, options));
  SWSELogger.log('[DefenseAvoidanceFeatNormalization] Hooks registered');
}

export default registerDefenseAvoidanceFeatNormalizationHooks;
