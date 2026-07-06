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

function conditionTrackRules(item) {
  return asArray(item?.system?.abilityMeta?.resourceRules?.conditionTrack);
}

function hasRule(item, id) {
  const wanted = normalizeId(id);
  return conditionTrackRules(item).some(rule => normalizeId(rule?.id ?? rule?.key ?? rule?.ruleId) === wanted);
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

const CONDITION_TRACK_FEAT_RULES = {
  'shake it off': [rule('SWIFT_ACTION_CONDITION_RECOVERY', 'shake-it-off-two-swift-recovery', 'Shake It Off', {
    trigger: 'actorConditionRecoveryAction',
    actionCost: 'twoSwiftActions',
    swiftActionCost: 2,
    conditionTrackSteps: -1,
    recoveryMethod: 'featAction',
    sourceBook: 'Core Rulebook',
    summary: 'Spend two Swift Actions to move +1 step on the Condition Track.'
  })],

  'sadistic strike': [rule('MOVE_TARGET_CT_ON_COUP_DE_GRACE', 'sadistic-strike-coup-de-grace-condition-shift', 'Sadistic Strike', {
    trigger: 'successfulCoupDeGrace',
    actionCost: 'none',
    target: 'coupDeGraceTarget',
    conditionTrackSteps: 1,
    sourceBook: 'Scum and Villainy',
    summary: 'When delivering a Coup de Grace, move the affected target -1 step on the Condition Track.'
  })],

  'damage conversion': [rule('SPEND_CT_TO_REDUCE_DAMAGE', 'damage-conversion-spend-condition-reduce-damage', 'Damage Conversion', {
    trigger: 'incomingDamageBeforeApplication',
    actionCost: 'reactionPrompt',
    conditionTrackCost: 1,
    damageReduction: 10,
    sourceBook: 'Scum and Villainy',
    summary: 'Optionally move -1 step on the Condition Track to reduce incoming damage by 10 before damage is applied.'
  })],

  'stay up': [rule('SPEND_CT_TO_REDUCE_DAMAGE', 'stay-up-spend-condition-reduce-damage', 'Stay Up', {
    trigger: 'incomingDamageBeforeApplication',
    actionCost: 'reactionPrompt',
    conditionTrackCost: 1,
    damageReduction: 10,
    sourceBook: 'Scum and Villainy',
    summary: 'Optionally move -1 step on the Condition Track to reduce incoming damage by 10 before damage is applied.'
  })]
};

function rulesForConditionTrackFeat(name) {
  return CONDITION_TRACK_FEAT_RULES[normalizeName(name)] ?? [];
}

async function normalizeConditionTrackFeat(item, options = {}) {
  if (options?.swseConditionTrackFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const newRules = rulesForConditionTrackFeat(item.name).filter(rule => !hasRule(item, rule.id));
  if (!newRules.length) return false;

  const resourceRules = item.system?.abilityMeta?.resourceRules ?? {};
  const existingRules = conditionTrackRules(item);

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
        conditionTrack: [...existingRules, ...newRules]
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
