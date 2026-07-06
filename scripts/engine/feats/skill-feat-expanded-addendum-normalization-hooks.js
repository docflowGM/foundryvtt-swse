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

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  try { return foundry?.utils?.deepClone?.(value) ?? JSON.parse(JSON.stringify(value)); }
  catch (_err) { return JSON.parse(JSON.stringify(value)); }
}

function hasRule(item, id) {
  const wanted = normalizeId(id);
  return asArray(item?.system?.abilityMeta?.rules).some(rule => normalizeId(rule?.id ?? rule?.key ?? rule?.ruleId) === wanted);
}

function improvedSleightOfHandRules() {
  return [
    {
      type: 'SKILL_OPPOSED_COMPOSITE_RIDER',
      id: 'improved-sleight-of-hand-deception-cover-check',
      label: 'Improved Sleight of Hand',
      skillKeys: ['stealth', 'deception'],
      extraUses: ['stealth.sleight-of-hand'],
      setupSkill: 'deception',
      setupActionCost: 'swift',
      primarySkill: 'stealth',
      opposedSkill: 'perception',
      observerMustExceedAll: ['deceptionCheckTotal', 'stealthCheckTotal'],
      sourceBook: 'Unknown Regions',
      summary: 'Before a Sleight of Hand Stealth check, make a swift-action Deception check. Observers must exceed both the Deception check and the Stealth check with Perception.'
    },
    {
      type: 'EXTRA_SKILL_USE_GRANT',
      id: 'improved-sleight-of-hand-draw-and-palm-weapon',
      label: 'Improved Sleight of Hand: Draw and Palm Weapon',
      skillKeys: ['stealth'],
      extraUse: {
        id: 'stealth.draw-and-palm-weapon',
        key: 'draw-and-palm-weapon',
        name: 'Draw and Palm Weapon',
        skill: 'stealth',
        actionCost: 'single-action',
        checkActionCost: 'free',
        weaponSizeLimit: 'twoSizesSmallerThanActor',
        concealsInHand: true,
        repalmAfterUseActionCost: 'swift'
      },
      sourceBook: 'Unknown Regions',
      summary: 'As a single action, draw and palm a weapon two sizes smaller than the actor; make the concealment Stealth check as a free action, and repalm after use as a swift action.'
    }
  ];
}

function intimidatorRules() {
  return [{
    type: 'EXTRA_SKILL_USE_SUCCESS_RIDER',
    id: 'intimidator-replace-intimidate-result',
    label: 'Intimidator',
    skillKeys: ['persuasion'],
    extraUses: ['persuasion.intimidate'],
    replacesNormalResult: true,
    incompatibleFeats: ['Maniacal Charge'],
    successRider: {
      targetSkillPenalty: -5,
      includeUseTheForce: true,
      targetAttackPenalty: -2,
      appliesWhileTargetHasLineOfSightToActor: true,
      vehicleContextRequiresEnemyCanSeeOrDetectVehicle: true,
      duration: 'untilEndOfYourNextTurn'
    },
    sourceBook: 'Unknown Regions',
    summary: 'On a successful Intimidate, replace normal results: target takes -5 to all skill checks, including Use the Force, and -2 attacks while it can see the actor until end of the actor\'s next turn. Cannot be used with Maniacal Charge.'
  }];
}

function niktoSurvivalRules() {
  return [{
    type: 'CONFIGURED_SKILL_REROLL',
    id: 'nikto-survival-native-environment-reroll',
    label: 'Nikto Survival',
    skillKeys: ['survival'],
    requiresSpecies: 'Nikto',
    requiresConfiguration: true,
    configurationKey: 'niktoSubspecies',
    configurationChoices: [
      { key: 'kajainsa-nikto', label: "Kajain'sa'Nikto", environment: 'desert' },
      { key: 'kadassa-nikto', label: "Kadas'sa'Nikto", environment: 'forest' },
      { key: 'esralsa-nikto', label: "Esral'sa'Nikto", environment: 'mountains' },
      { key: 'glusssa-nikto', label: "Gluss'sa'Nikto", environment: 'ocean' },
      { key: 'mshentosu-nikto', label: "M'shento'su,Nikto", environment: 'arctic' }
    ],
    reroll: {
      keep: 'better',
      appliesWhen: 'nativeSubspeciesAdvantageousEnvironment'
    },
    sourceBook: 'Unknown Regions',
    summary: 'Choose a Nikto subspecies. In that native advantageous environment, reroll Survival checks and keep the better result. Requires a feat-choice modal.'
  }];
}

function wildernessFirstAidRules() {
  return [
    {
      type: 'EXTRA_SKILL_USE_GRANT',
      id: 'wilderness-first-aid-survival-check',
      label: 'Wilderness First Aid',
      skillKeys: ['survival'],
      extraUse: {
        id: 'survival.wilderness-first-aid',
        key: 'wilderness-first-aid',
        name: 'Wilderness First Aid',
        skill: 'survival',
        dc: 20,
        actionCost: 'varies',
        oncePer: 'day',
        gmCanAdjustDcByEnvironment: true
      },
      sourceBook: 'Unknown Regions',
      summary: 'Once per day, make a DC 20 Survival check, subject to GM environmental adjustment, to prepare natural materials for field treatment.'
    },
    {
      type: 'SKILL_RESULT_STATE_RIDER',
      id: 'wilderness-first-aid-medpac-equivalent',
      label: 'Wilderness First Aid: Medpac Equivalent',
      skillKeys: ['survival'],
      extraUses: ['survival.wilderness-first-aid'],
      successState: {
        id: 'wilderness-first-aid-medpac-equivalent',
        appliesToSkill: 'treatInjury',
        appliesWhenUsing: 'survival.basic-survival',
        countsAsHavingItem: 'Medpac',
        duration: 'untilEndOfDay'
      },
      sourceBook: 'Unknown Regions',
      summary: 'On success, Basic Survival lets the actor count as having a Medpac for Treat Injury checks until the end of the day.'
    }
  ];
}

function dreadfulCountenanceRules() {
  return [
    {
      type: 'SKILL_REROLL',
      id: 'dreadful-countenance-persuasion-fear-reroll',
      label: 'Dreadful Countenance',
      skillKeys: ['persuasion'],
      contextTags: ['fear'],
      reroll: { keep: 'second', mustAcceptSecondResult: true },
      sourceBook: 'Web Enhancements (Behind the Threat: The Sith)',
      summary: 'When making a Persuasion check to activate a Fear effect, reroll the check but accept the second result.'
    },
    {
      type: 'SKILL_REROLL',
      id: 'dreadful-countenance-use-the-force-fear-reroll',
      label: 'Dreadful Countenance: Use the Force Fear',
      skillKeys: ['useTheForce'],
      contextTags: ['fear'],
      reroll: { keep: 'second', mustAcceptSecondResult: true },
      sourceBook: 'Web Enhancements (Behind the Threat: The Sith)',
      summary: 'When making a Use the Force check to activate a Fear effect, reroll the check but accept the second result.'
    }
  ];
}

function rulesForExpandedSkillFeatAddendum(name) {
  const normalized = normalizeName(name);
  if (normalized === 'improved sleight of hand') return improvedSleightOfHandRules();
  if (normalized === 'intimidator') return intimidatorRules();
  if (normalized === 'nikto survival') return niktoSurvivalRules();
  if (normalized === 'wilderness first aid') return wildernessFirstAidRules();
  if (normalized === 'dreadful countenance') return dreadfulCountenanceRules();
  return [];
}

async function normalizeExpandedSkillFeatAddendum(item, options = {}) {
  if (options?.swseExpandedSkillFeatAddendumNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  const rules = rulesForExpandedSkillFeatAddendum(item.name);
  if (!rules.length) return false;

  const existingRules = asArray(item.system?.abilityMeta?.rules);
  const newRules = rules.filter(rule => !hasRule(item, rule.id));
  if (!newRules.length) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'skill_feat_rule',
      'system.abilityMeta.applicationScope': 'roll_action_or_combat_context',
      'system.abilityMeta.staticSheetPolicy': 'exclude',
      'system.abilityMeta.rules': [...existingRules, ...newRules]
    }], {
      source: 'ExpandedSkillFeats.addendumNormalization',
      swseExpandedSkillFeatAddendumNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[ExpandedSkillFeatAddendum] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerExpandedSkillFeatAddendumNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeExpandedSkillFeatAddendum(item, options));
  Hooks.on('updateItem', async (item, _data, options) => normalizeExpandedSkillFeatAddendum(item, options));
  SWSELogger.log('[ExpandedSkillFeatAddendum] Normalization hooks registered');
}

export { normalizeExpandedSkillFeatAddendum, rulesForExpandedSkillFeatAddendum };

export default registerExpandedSkillFeatAddendumNormalizationHooks;
