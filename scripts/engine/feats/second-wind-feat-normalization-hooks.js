import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

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

function hasRule(item, id) {
  const wanted = normalizeId(id);
  return asArray(item?.system?.abilityMeta?.secondWindRules).some(rule => normalizeId(rule?.id ?? rule?.key ?? rule?.ruleId) === wanted);
}

const SOURCE = 'Second Wind feat normalization';

const SECOND_WIND_FEAT_RULES = {
  'regenerative healing': [{
    type: 'SECOND_WIND_POST_USE_RIDER',
    id: 'regenerative-healing-delayed-second-wind',
    label: 'Regenerative Healing',
    postUse: {
      delayedHealing: {
        amountPerTurn: 5,
        timing: 'endOfEachTurn',
        limit: 'fullHpOrEncounterEnd',
        oncePer: 'day',
        optional: true,
        noImmediateHealing: true,
        source: 'Regenerative Healing'
      },
      noImmediateHealing: true
    },
    noImmediateHealingOnUse: true,
    sourceBook: 'Rebellion Era Campaign Guide',
    summary: 'Once per day, when catching a Second Wind, optionally regain no HP immediately and instead regain 5 HP at the end of each turn until full HP or encounter end.'
  }],

  'resurgent vitality': [{
    type: 'SECOND_WIND_HEALING',
    id: 'resurgent-vitality-extra-healing',
    label: 'Resurgent Vitality',
    healing: {
      conModMultiplier: 2,
      minimum: 2,
      bonusType: 'untyped'
    },
    sourceBook: 'Rebellion Era Campaign Guide',
    summary: 'Whenever catching a Second Wind, regain additional HP equal to twice Constitution bonus, minimum +2.'
  }],

  'extra second wind': [{
    type: 'SECOND_WIND_DAILY_USES',
    id: 'extra-second-wind-daily-use',
    label: 'Extra Second Wind',
    bonusUses: 1,
    allowNonHeroicUse: true,
    repeatable: true,
    sourceBook: 'Core Rulebook',
    summary: 'Gain one additional Second Wind use per day. Still limited to one Second Wind per encounter unless another rule changes the encounter cap.'
  }],

  'resurgence': [{
    type: 'SECOND_WIND_POST_USE_ACTION',
    id: 'resurgence-grant-move-action',
    label: 'Resurgence',
    postUse: {
      grantMoveAction: true,
      mustUseImmediately: true
    },
    sourceBook: 'Scum and Villainy',
    summary: 'When catching a Second Wind, immediately gain a Move Action to be used immediately.'
  }],

  'impetuous move': [{
    type: 'SECOND_WIND_POST_USE_ACTION',
    id: 'impetuous-move-half-heal-movement',
    label: 'Impetuous Move',
    postUse: {
      grantMovement: true,
      halfHealingForMovement: true,
      movement: {
        distance: 'halfSpeed',
        provokesAttacksOfOpportunity: false,
        optional: true,
        selectionFlag: 'impetuousMove'
      }
    },
    halfHealingForMovement: true,
    sourceBook: 'Scum and Villainy',
    summary: 'When catching a Second Wind, optionally regain half normal HP and immediately move up to half Speed without provoking attacks of opportunity.'
  }],

  'fast surge': [{
    type: 'SECOND_WIND_ACTION_ECONOMY',
    id: 'fast-surge-free-second-wind',
    label: 'Fast Surge',
    actionEconomy: {
      action: 'free',
      swiftActions: 0,
      timing: 'onTurn'
    },
    sourceBook: 'Rebellion Era Campaign Guide',
    summary: 'On your turn, catch a Second Wind as a free action instead of a swift action.'
  }],

  'recovering surge': [{
    type: 'SECOND_WIND_CONDITION_RECOVERY',
    id: 'recovering-surge-condition-recovery',
    label: 'Recovering Surge',
    steps: 1,
    sourceBook: 'Rebellion Era Campaign Guide',
    summary: 'When catching a Second Wind, move +1 step on the Condition Track.'
  }],

  'unstoppable combatant': [{
    type: 'SECOND_WIND_IGNORE_ENCOUNTER_CAP',
    id: 'unstoppable-combatant-ignore-encounter-cap',
    label: 'Unstoppable Combatant',
    sourceBook: 'Rebellion Era Campaign Guide',
    summary: 'You can catch more than one Second Wind per encounter, limited by remaining daily uses.'
  }],

  'vitality surge': [{
    type: 'SECOND_WIND_ALLOW_ABOVE_HALF_HP',
    id: 'vitality-surge-above-half-hp',
    label: 'Vitality Surge',
    sourceBook: 'Rebellion Era Campaign Guide',
    summary: 'You can catch a Second Wind even if above half maximum Hit Points.'
  }],

  'forceful recovery': [{
    type: 'SECOND_WIND_POST_USE_RIDER',
    id: 'forceful-recovery-regain-force-power',
    label: 'Forceful Recovery',
    postUse: {
      regainForcePower: true,
      choice: 'oneExpendedForcePower'
    },
    sourceBook: 'Galaxy of Intrigue',
    summary: 'Whenever catching a Second Wind, choose one expended Force Power and return it to the Force Power Suite.'
  }]
};

function rulesForSecondWindFeat(name) {
  return SECOND_WIND_FEAT_RULES[normalizeName(name)] ?? [];
}

async function normalizeSecondWindFeat(item, options = {}) {
  if (options?.swseSecondWindFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  const rules = rulesForSecondWindFeat(item.name);
  if (!rules.length) return false;

  const existingRules = asArray(item.system?.abilityMeta?.secondWindRules);
  const newRules = rules.filter(rule => !hasRule(item, rule.id));
  if (!newRules.length) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'second_wind_rider_rule',
      'system.abilityMeta.applicationScope': 'second_wind',
      'system.abilityMeta.staticSheetPolicy': 'exclude',
      'system.abilityMeta.secondWindRules': [...existingRules, ...newRules]
    }], {
      source: SOURCE,
      swseSecondWindFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[SecondWindFeats] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerSecondWindFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeSecondWindFeat(item, options));
  Hooks.on('updateItem', async (item, _data, options) => normalizeSecondWindFeat(item, options));
  SWSELogger.log('[SecondWindFeats] Normalization hooks registered');
}

export { normalizeSecondWindFeat, rulesForSecondWindFeat };

export default registerSecondWindFeatNormalizationHooks;
