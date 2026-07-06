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

const KNOWLEDGE_SKILLS = [
  'knowledge',
  'knowledgeBureaucracy',
  'knowledgeGalacticLore',
  'knowledgeLifeSciences',
  'knowledgePhysicalSciences',
  'knowledgeSocialSciences',
  'knowledgeTactics',
  'knowledgeTechnology'
];

const CONDITIONING_SKILLS = ['climb', 'jump', 'swim', 'endurance', 'athletics'];

function skillRerollRule({ id, label, skillKeys, keep = 'second', oncePer = null, summary, sourceBook }) {
  return {
    type: 'SKILL_REROLL_RESOURCE',
    id,
    label,
    skillKeys,
    keep,
    oncePer,
    requiresTrained: true,
    sourceBook,
    summary
  };
}

function advisoryRule({ id, label, skillKeys = ['any'], summary, sourceBook, data = {} }) {
  return {
    type: 'SKILL_ADVISORY',
    id,
    label,
    skillKeys,
    advisoryOnly: true,
    sourceBook,
    summary,
    ...clone(data)
  };
}

function cyberneticSurgeryRules() {
  return [
    {
      type: 'EXTRA_SKILL_USE_GRANT',
      id: 'cybernetic-surgery-install-cybernetic-device',
      label: 'Install Cybernetic Device',
      skillKeys: ['treatInjury'],
      extraUse: {
        id: 'treat-injury.install-cybernetic-device',
        key: 'install-cybernetic-device',
        name: 'Install Cybernetic Device',
        skill: 'treatInjury',
        trainedOnly: true,
        actionCost: '1 hour',
        dc: 20,
        retry: 'afterAnotherUninterruptedHour',
        selfInstallPenalty: -5,
        selfInstallAllowedDevices: ['cybernetic-prosthesis', 'energy-binding-prosthesis'],
        selfInstallForbiddenDevices: ['rhen-orm-biocomputer', 'subelectronic-converter']
      },
      sourceBook: 'Star Wars Saga Edition Core Rulebook',
      summary: 'Grants the Treat Injury procedure to install cybernetic devices on living beings. Surgical Expertise can reduce the time to 10 minutes.'
    },
    advisoryRule({
      id: 'cybernetic-surgery-procedure-reference',
      label: 'Cybernetic Surgery Procedure',
      skillKeys: ['treatInjury'],
      sourceBook: 'Star Wars Saga Edition Core Rulebook',
      summary: 'Manual procedure: 1 hour uninterrupted work, DC 20 Treat Injury. Failure does not install the device; retry after another uninterrupted hour. Self-install only applies to listed prostheses and takes -5.',
      data: {
        procedure: 'cyberneticInstallation',
        dc: 20,
        timeRequired: '1 hour',
        failureRetry: 'another uninterrupted hour',
        staticSheetPolicy: 'exclude',
        automationBoundary: 'procedureReference'
      }
    })
  ];
}

function surgicalExpertiseRules() {
  return [
    {
      type: 'EXTRA_SKILL_USE_ACTION_ECONOMY_OVERRIDE',
      id: 'surgical-expertise-surgery-time',
      label: 'Surgical Expertise',
      skillKeys: ['treatInjury'],
      extraUses: ['treat-injury.surgery', 'treat-injury.install-cybernetic-device'],
      actionEconomy: {
        replacesTimeRequiredWith: '10 minutes',
        normalTimeRequired: '1 hour',
        appliesTo: ['surgery', 'cyberneticInstallation']
      },
      sourceBook: 'Star Wars Saga Edition Core Rulebook',
      summary: 'Perform Surgery in 10 minutes instead of 1 hour; also shortens Cybernetic Surgery installation procedures where that feat references Surgical Expertise.'
    }
  ];
}

function conditioningRules() {
  return [
    skillRerollRule({
      id: 'conditioning-trained-str-con-skill-reroll',
      label: 'Conditioning',
      skillKeys: CONDITIONING_SKILLS,
      keep: 'second',
      sourceBook: 'Knights of the Old Republic Campaign Guide',
      summary: 'Reroll a trained Strength- or Constitution-based skill check and keep the second result.'
    }),
    {
      type: 'TEMPORARY_DEFENSE_REACTION',
      id: 'conditioning-fortitude-reaction',
      label: 'Conditioning: Fortitude Reaction',
      skillKeys: ['endurance'],
      cost: 'reaction',
      oncePer: 'encounter',
      targets: ['defense.fortitude'],
      valueFormula: 'abilityModifier',
      ability: 'str',
      duration: 'untilBeginningOfNextTurn',
      roundsRemaining: 1,
      sourceBook: 'Knights of the Old Republic Campaign Guide',
      summary: 'Once per encounter as a reaction, add Strength modifier to Fortitude Defense until the beginning of your next turn.'
    }
  ];
}

function gearheadRules() {
  return [
    {
      type: 'SKILL_ACTION_ECONOMY_OVERRIDE',
      id: 'gearhead-technical-check-speed',
      label: 'Gearhead',
      skillKeys: ['mechanics', 'useComputer'],
      oncePer: 'encounter',
      actionEconomy: {
        fullRoundTo: 'standard',
        standardTo: 'move',
        moveTo: 'swift',
        reduceMultiSwiftBy: 1,
        longTaskTimeMultiplier: 0.5,
        longTaskPenalty: -10
      },
      sourceBook: 'Knights of the Old Republic Campaign Guide',
      summary: 'Once per encounter, make a Mechanics or Use Computer check more quickly; long tasks take half time at -10.'
    }
  ];
}

function increasedAgilityRules() {
  return [
    {
      type: 'MOVEMENT_SKILL_RIDER',
      id: 'increased-agility-movement-rider',
      label: 'Increased Agility',
      skillKeys: ['climb', 'jump', 'swim', 'athletics'],
      movementRider: true,
      climbSpeedBonusSquares: 2,
      swimSpeedBonusSquares: 2,
      jumpDistanceBonusSquares: 2,
      retainDexBonusToReflexWhileClimbing: true,
      prerequisiteFeat: 'Conditioning',
      sourceBook: 'Knights of the Old Republic Campaign Guide',
      summary: 'Increase climb speed, swim speed, and jump distance by 2 squares; do not lose Dexterity bonus to Reflex Defense while climbing.'
    }
  ];
}

function quickSkillRules() {
  return [
    advisoryRule({
      id: 'quick-skill-take-10-when-rushed',
      label: 'Quick Skill: Take 10 When Rushed',
      skillKeys: ['any'],
      sourceBook: 'Knights of the Old Republic Campaign Guide',
      summary: 'Once per encounter, take 10 when rushed on a trained skill unless that skill explicitly forbids taking 10.',
      data: {
        requiresTrained: true,
        oncePer: 'encounter',
        take10: {
          allowedWhenRushed: true,
          unlessSkillExplicitlyForbids: true
        },
        automationBoundary: 'advisoryOnly'
      }
    }),
    advisoryRule({
      id: 'quick-skill-take-20-half-time',
      label: 'Quick Skill: Take 20 Half Time',
      skillKeys: ['any'],
      sourceBook: 'Knights of the Old Republic Campaign Guide',
      summary: 'Alternatively, take 20 with a trained skill in half the normal time.',
      data: {
        requiresTrained: true,
        oncePer: 'encounter',
        take20: true,
        timeMultiplier: 0.5,
        automationBoundary: 'advisoryOnly'
      }
    })
  ];
}

function advantageousCoverRules() {
  return [
    {
      type: 'AREA_ATTACK_COVER_DAMAGE_NEGATION',
      id: 'advantageous-cover-area-damage-negation',
      label: 'Advantageous Cover',
      requiresCover: true,
      appliesToAreaAttacks: true,
      damageDisposition: 'noDamage',
      sourceBook: 'Force Unleashed Campaign Guide',
      summary: 'When you have cover, you take no damage from area attacks even if the attack roll exceeds your Reflex Defense.'
    },
    advisoryRule({
      id: 'advantageous-cover-cover-state-reminder',
      label: 'Advantageous Cover',
      skillKeys: ['stealth'],
      sourceBook: 'Force Unleashed Campaign Guide',
      summary: 'Requires cover state from combat workflow or GM/table adjudication.'
    })
  ];
}

function informerRules() {
  return [
    {
      type: 'EXTRA_SKILL_USE_SKILL_SUBSTITUTION',
      id: 'informer-perception-for-gather-information',
      label: 'Informer',
      skillKeys: ['gatherInformation'],
      extraUses: ['gather-information.gather-information'],
      baseSkill: 'gatherInformation',
      alternateSkill: 'perception',
      grantsTrainingForUse: true,
      rerollRedirect: {
        fromSkill: 'gatherInformation',
        toSkill: 'perception'
      },
      favorableConditionTimeMultiplier: 0.5,
      sourceBook: 'Force Unleashed Campaign Guide',
      summary: 'Use Perception instead of Gather Information for Gather Information checks, count as trained for that use, and halve the time under favorable conditions.'
    }
  ];
}

function rapportRules() {
  return [
    {
      type: 'AID_ANOTHER_RIDER',
      id: 'rapport-aid-another-extra-insight-bonus',
      label: 'Rapport',
      aidAnotherContext: 'any',
      insightBonus: 2,
      bonusTargets: ['skillChecks', 'attackRolls'],
      stacksWithCoordinate: false,
      sourceBook: 'Force Unleashed Campaign Guide',
      summary: 'When using Aid Another, grant an additional +2 insight bonus on skill checks and attack rolls; does not stack with Coordinate.'
    }
  ];
}

function recallRules() {
  return [
    skillRerollRule({
      id: 'recall-trained-knowledge-reroll',
      label: 'Recall',
      skillKeys: KNOWLEDGE_SKILLS,
      keep: 'better',
      oncePer: 'day',
      sourceBook: 'Force Unleashed Campaign Guide',
      summary: 'Once per day, reroll a trained Knowledge check and keep the better result.'
    })
  ];
}

function rulesForFeat(name) {
  const normalized = normalizeName(name);
  if (normalized === 'cybernetic surgery') return cyberneticSurgeryRules();
  if (normalized === 'surgical expertise') return surgicalExpertiseRules();
  if (normalized === 'conditioning') return conditioningRules();
  if (normalized === 'gearhead') return gearheadRules();
  if (normalized === 'increased agility') return increasedAgilityRules();
  if (normalized === 'quick skill') return quickSkillRules();
  if (normalized === 'advantageous cover') return advantageousCoverRules();
  if (normalized === 'informer') return informerRules();
  if (normalized === 'rapport') return rapportRules();
  if (normalized === 'recall') return recallRules();
  return [];
}

async function normalizeSkillFeat(item, options = {}) {
  if (options?.swseSkillFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;

  const rules = rulesForFeat(item.name);
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
      'system.abilityMeta.applicationScope': 'roll_or_action_context',
      'system.abilityMeta.staticSheetPolicy': 'exclude',
      'system.abilityMeta.rules': [
        ...existingRules,
        ...newRules
      ]
    }], {
      source: 'SkillFeats.normalization',
      swseSkillFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[SkillFeats] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerSkillFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeSkillFeat(item, options));
  Hooks.on('updateItem', async (item, _data, options) => normalizeSkillFeat(item, options));
  SWSELogger.log('[SkillFeats] Normalization hooks registered');
}

export { normalizeSkillFeat, rulesForFeat };

export default registerSkillFeatNormalizationHooks;
