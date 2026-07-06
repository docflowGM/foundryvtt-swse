import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const SOURCE = 'Condition Track feat normalization';

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeId(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function resourceRulesFor(item, key) {
  return asArray(item?.system?.abilityMeta?.resourceRules?.[key]);
}

function hasResourceRule(item, key, id) {
  const wanted = normalizeId(id);
  return resourceRulesFor(item, key).some(rule => normalizeId(rule?.id ?? rule?.key ?? rule?.ruleId) === wanted);
}

function rule(type, id, label, extras = {}) {
  return {
    type,
    id,
    label,
    source: label,
    sourceBook: extras.sourceBook ?? null,
    summary: extras.summary ?? '',
    ...extras
  };
}

const FEAT_RESOURCE_RULES = {
  'shake it off': {
    conditionTrack: [rule('SWIFT_ACTION_CONDITION_RECOVERY', 'shake-it-off-two-swift-recovery', 'Shake It Off', {
      trigger: 'actorConditionRecoveryAction',
      actionCost: 'twoSwiftActions',
      swiftActionCost: 2,
      conditionTrackSteps: -1,
      recoveryMethod: 'featAction',
      sourceBook: 'Core Rulebook',
      summary: 'Spend two Swift Actions instead of three to move +1 step on the Condition Track.'
    })]
  },

  'stay up': {
    conditionTrack: [rule('STAY_UP_HALF_DAMAGE_AND_CT', 'stay-up-half-damage-once-per-encounter', 'Stay Up', {
      trigger: 'incomingAttackDamageBeforeApplication',
      oncePer: 'encounter',
      damageMultiplier: 0.5,
      conditionTrackCost: 1,
      sourceBook: 'Scum and Villainy',
      summary: 'Once per encounter, when you would take damage from an attack, take half damage and move -1 step on the Condition Track.'
    })]
  },

  'galactic alliance military training': {
    damage: [rule('PREVENT_FIRST_THRESHOLD_EXCEEDANCE_PER_ENCOUNTER', 'gamt-prevent-first-threshold-ct-shift', 'Galactic Alliance Military Training', {
      trigger: 'firstAttackExceedsDamageThresholdEachEncounter',
      sourceBook: 'Legacy Era Campaign Guide',
      summary: 'Do not move down the Condition Track the first time an attack exceeds your Damage Threshold in an encounter.'
    })]
  },

  'damage conversion': {
    conditionTrack: [rule('DROID_DAMAGE_CONVERSION_THRESHOLD_REPLACEMENT', 'damage-conversion-extra-damage-instead-of-ct', 'Damage Conversion', {
      trigger: 'attackDamageEqualsOrExceedsDamageThreshold',
      requiresDroid: true,
      excludesAreaAttack: true,
      excludesDamageTypes: ['ion', 'force'],
      additionalDamageBase: 10,
      additionalDamageIncrementPerEncounterUse: 5,
      replacesConditionTrackShift: true,
      sourceBook: "Scavenger's Guide to Droids",
      summary: 'When qualifying attack damage equals or exceeds DT, take extra damage instead of moving down the Condition Track; extra damage starts at +10 and increases by +5 each later use that encounter.'
    })]
  },

  'ion shielding': {
    damage: [rule('CAP_ION_DAMAGE_CT_TO_1_STEP', 'ion-shielding-cap-ion-ct-shift', 'Ion Shielding', {
      trigger: 'ionDamageEqualsOrExceedsDamageThreshold',
      sourceBook: "Scavenger's Guide to Droids",
      summary: 'If ion damage before halving equals or exceeds DT, move only -1 step on the Condition Track.'
    })]
  },

  'pinpoint accuracy': {
    conditionTrack: [rule('PREVENT_TARGET_RECOVER_AFTER_AIMING_ACCURACY_DAMAGE', 'pinpoint-accuracy-block-recover-next-turn', 'Pinpoint Accuracy', {
      trigger: 'damagedTargetWithAimingAccuracy',
      requiresAimingAccuracy: true,
      duration: 'untilEndOfTargetNextTurn',
      sourceBook: "Scavenger's Guide to Droids",
      summary: 'When using Aiming Accuracy, a target you damage cannot take the Recover Action until the end of its next turn.'
    })]
  },

  'quick comeback': {
    conditionTrack: [rule('QUICK_COMEBACK_SINGLE_SWIFT_RECOVERY', 'quick-comeback-one-swift-after-threshold-hit', 'Quick Comeback', {
      trigger: 'movedDownConditionTrackByDamageThresholdAttack',
      swiftActionCost: 1,
      oncePerAttack: true,
      duration: 'untilEndOfActorNextTurn',
      sourceBook: 'Rebellion Era Campaign Guide',
      summary: 'When moved down the Condition Track by a damaging attack that equals or exceeds DT, you may move +1 step as a single Swift Action until the end of your next turn.'
    })]
  },

  'sadistic strike': {
    conditionTrack: [rule('MOVE_TARGET_CT_ON_COUP_DE_GRACE', 'sadistic-strike-coup-de-grace-los-opponents', 'Sadistic Strike', {
      trigger: 'successfulCoupDeGrace',
      actionCost: 'none',
      target: 'opponentsInLineOfSight',
      conditionTrackSteps: 1,
      duration: 'encounter',
      requiresWorkflowTargets: true,
      sourceBook: 'Galaxy of Intrigue',
      summary: 'When delivering a Coup de Grace to a Helpless creature, opponents within line of sight move -1 step on the Condition Track until encounter end.'
    })]
  }
};

function rulesForConditionTrackFeat(name) {
  return FEAT_RESOURCE_RULES[normalizeName(name)] ?? null;
}

async function normalizeConditionTrackFeat(item, options = {}) {
  if (options?.swseConditionTrackFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const spec = rulesForConditionTrackFeat(item.name);
  if (!spec) return false;

  const resourceRules = item.system?.abilityMeta?.resourceRules ?? {};
  const updates = {};
  for (const [key, rules] of Object.entries(spec)) {
    const newRules = asArray(rules).filter(rule => !hasResourceRule(item, key, rule.id));
    if (!newRules.length) continue;
    updates[key] = [...resourceRulesFor(item, key), ...newRules];
  }

  if (!Object.keys(updates).length) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'condition_track_rule',
      'system.abilityMeta.applicationScope': 'condition_track',
      'system.abilityMeta.staticSheetPolicy': 'exclude',
      'system.abilityMeta.resourceRules': {
        ...resourceRules,
        ...updates
      }
    }], {
      source: SOURCE,
      swseConditionTrackFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[ConditionTrackFeats] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerConditionTrackFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeConditionTrackFeat(item, options));
  Hooks.on('updateItem', async (item, _data, options) => normalizeConditionTrackFeat(item, options));
  SWSELogger.log('[ConditionTrackFeats] Normalization hooks registered');
}

export { normalizeConditionTrackFeat, rulesForConditionTrackFeat };

export default registerConditionTrackFeatNormalizationHooks;
