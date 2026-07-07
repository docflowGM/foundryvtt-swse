import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getExistingResourceRules(item, key) {
  return asArray(item?.system?.abilityMeta?.resourceRules?.[key]);
}

function getExistingMetaRules(item, key) {
  return asArray(item?.system?.abilityMeta?.[key]);
}

function hasRuleWithSource(rules = [], source) {
  const wanted = normalizeName(source);
  return rules.some(rule => normalizeName(rule?.source ?? rule?.sourceName ?? '') === wanted);
}

function rulesForFeat(name) {
  const normalized = normalizeName(name);

  if (normalized === 'force boon') {
    return {
      executionModel: 'PASSIVE',
      subType: 'RESOURCE',
      mechanicsMode: 'force_point_resource',
      resourceRules: {
        forcePoints: [{ type: 'MAX_BONUS', value: 3, source: 'Force Boon', summary: '+3 Force Points at each level.' }]
      }
    };
  }

  if (normalized === 'strong in the force') {
    return {
      executionModel: 'PASSIVE',
      subType: 'RESOURCE',
      mechanicsMode: 'force_point_resource',
      resourceRules: {
        forcePoints: [{ type: 'DIE_SIZE', value: 8, dieSize: 8, appliesTo: ['attack', 'skill', 'ability'], source: 'Strong in the Force', summary: 'Roll d8s instead of d6s when spending a Force Point to adjust an attack roll, skill check, or ability check.' }]
      }
    };
  }

  if (normalized === 'force readiness') {
    return {
      executionModel: 'PASSIVE',
      subType: 'RESOURCE',
      mechanicsMode: 'force_point_timing',
      resourceRules: {
        forcePoints: [{ type: 'SPEND_ACTION_TIMING', action: 'free', allowOffTurn: true, restrictionsStillApply: true, source: 'Force Readiness', summary: 'Force Points may be spent as a Free Action even when it is not your turn.' }]
      }
    };
  }

  if (normalized === 'jedi familiarity') {
    return {
      executionModel: 'REACTION',
      subType: 'RESOURCE',
      mechanicsMode: 'force_point_trigger',
      resourceRules: {
        forcePoints: [{ type: 'TEMP_FP_ON_ALLIED_FORCE_EFFECT', amount: 1, oncePer: 'encounter', expires: 'encounter', requiresAlly: true, requiresForcePowerOrTalent: true, excludesDamageOrConditionShift: true, source: 'Jedi Familiarity', summary: 'Once per encounter, gain 1 temporary Force Point when affected by an allied Force Power or Force Talent that does not damage you or move you down the Condition Track.' }]
      }
    };
  }

  if (normalized === 'confident success') {
    return {
      executionModel: 'REACTION',
      subType: 'RESOURCE',
      mechanicsMode: 'force_point_trigger',
      resourceRules: {
        forcePoints: [{ type: 'GAIN_NORMAL_FP_ON_SKILL_APPLICATION_SUCCESS', amount: 1, skill: 'gatherInformation', application: 'learnSecretInformation', maxPerLevel: 3, capToLevelStartMax: true, source: 'Confident Success', summary: 'Gain 1 Force Point after successfully using Gather Information to Learn Secret Information, up to 3 per level and not above the Force Points gained at the current level.' }]
      }
    };
  }

  if (normalized === 'spacer s surge' || normalized === "spacer's surge") {
    return {
      executionModel: 'REACTION',
      subType: 'RESOURCE',
      mechanicsMode: 'force_point_trigger',
      resourceRules: {
        forcePoints: [{ type: 'TEMP_FP_ON_NATURAL_20_SKILL_CHECK', amount: 1, skill: 'pilot', natural: 20, expires: 'encounter', source: "Spacer's Surge", summary: 'Gain 1 temporary Force Point after rolling a natural 20 on a Pilot check; it expires at encounter end.' }]
      }
    };
  }

  if (normalized === 'gungan weapon master') {
    return {
      executionModel: 'PASSIVE',
      subType: 'RESOURCE',
      mechanicsMode: 'force_point_die_context',
      resourceRules: {
        forcePoints: [{ type: 'DIE_STEP', steps: 1, maxDie: 10, appliesTo: ['attack'], requiresWeaponText: ['atlatl', 'cesta'], source: 'Gungan Weapon Master', summary: 'When spending a Force Point on an Atlatl or Cesta attack roll, increase the Force Point die type by one step.' }]
      }
    };
  }

  if (normalized === 'jedi heritage') {
    return {
      executionModel: 'PASSIVE',
      subType: 'RESOURCE',
      mechanicsMode: 'force_training_slots',
      resourceRules: {
        forceTraining: [{ type: 'FORCE_TRAINING_ABILITY_SCORE_BONUS', ability: 'configuredForceTrainingAbility', value: 4, source: 'Jedi Heritage', summary: 'For Force Training power count only, treat the configured Force Training ability score as 4 higher before calculating its modifier.' }]
      }
    };
  }

  if (normalized === 'pall of the dark side') {
    return {
      executionModel: 'PASSIVE',
      subType: 'SKILL_RULE',
      mechanicsMode: 'force_skill_context',
      skillRules: [{ type: 'UTF_SENSE_FORCE_DETECTION_RESIST_BONUS', skill: 'useTheForce', application: 'senseForce', mode: 'resistDetection', formula: 'max(1, floor(darkSideScore / 2))', source: 'Pall of the Dark Side', summary: 'Add one-half Dark Side Score, minimum 1, to Use the Force checks made to resist Sense Force detection.' }]
    };
  }

  if (normalized === 'unstoppable force') {
    return {
      executionModel: 'PASSIVE',
      subType: 'DEFENSE_RULE',
      mechanicsMode: 'force_defense_context',
      defenseRules: [{ type: 'DEFENSE_BONUS_VS_USE_THE_FORCE_EFFECT', defenses: ['fortitude', 'will'], bonusType: 'insight', value: 5, source: 'Unstoppable Force', summary: '+5 insight bonus to Fortitude and Will Defense against attacks/effects requiring a Use the Force check.' }]
    };
  }

  return null;
}

function buildPatch(item, payload) {
  const patch = {
    _id: item.id,
    'system.executionModel': payload.executionModel,
    'system.subType': payload.subType,
    'system.abilityMeta.mechanicsMode': payload.mechanicsMode,
    'system.abilityMeta.applicationScope': payload.applicationScope ?? 'force_point_engine',
    'system.abilityMeta.staticSheetPolicy': payload.staticSheetPolicy ?? 'include'
  };

  for (const [key, rules] of Object.entries(payload.resourceRules ?? {})) {
    const existing = getExistingResourceRules(item, key);
    const merged = [...existing];
    for (const rule of rules) {
      if (!hasRuleWithSource(merged, rule.source ?? rule.sourceName ?? item.name)) merged.push(rule);
    }
    patch[`system.abilityMeta.resourceRules.${key}`] = merged;
  }

  for (const key of ['skillRules', 'defenseRules']) {
    const rules = payload[key];
    if (!Array.isArray(rules) || !rules.length) continue;
    const existing = getExistingMetaRules(item, key);
    const merged = [...existing];
    for (const rule of rules) {
      if (!hasRuleWithSource(merged, rule.source ?? rule.sourceName ?? item.name)) merged.push(rule);
    }
    patch[`system.abilityMeta.${key}`] = merged;
  }

  return patch;
}

async function normalizeForcePointFeat(item, options = {}) {
  if (options?.swseForcePointFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const payload = rulesForFeat(item.name);
  if (!payload) return false;

  const patch = buildPatch(item, payload);
  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [patch], {
      source: 'ForcePointFeatNormalization.normalize',
      swseForcePointFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[ForcePointFeatNormalization] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerForcePointFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeForcePointFeat(item, options));
  Hooks.on('updateItem', async (item, _data, options) => normalizeForcePointFeat(item, options));
  SWSELogger.log('[ForcePointFeatNormalization] Hooks registered');
}

export default registerForcePointFeatNormalizationHooks;
