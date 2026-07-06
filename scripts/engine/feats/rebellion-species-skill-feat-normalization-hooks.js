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

const SOURCE = 'Rebellion Era Campaign Guide';
const INT_SKILLS = ['knowledge', 'knowledgeBureaucracy', 'knowledgeGalacticLore', 'knowledgeLifeSciences', 'knowledgePhysicalSciences', 'knowledgeSocialSciences', 'knowledgeTactics', 'knowledgeTechnology', 'mechanics', 'useComputer'];

function mindOfReasonRules() {
  return [{
    type: 'SPECIES_SKILL_ABILITY_SUBSTITUTION',
    id: 'mind-of-reason-wis-for-int-skills',
    label: 'Mind of Reason',
    skillKeys: INT_SKILLS,
    fromAbility: 'int',
    toAbility: 'wis',
    mode: 'mayUseIfBetter',
    sourceBook: SOURCE,
    summary: 'May use Wisdom bonus instead of Intelligence bonus for all Intelligence-based skill checks.'
  }];
}

function lastingInfluenceRules() {
  return [{
    type: 'SKILL_SUCCESS_STATE_RIDER',
    id: 'lasting-influence-favorable-persuasion',
    label: 'Lasting Influence',
    skillKeys: ['persuasion'],
    trigger: 'successfulPersuasionVsWillDefense',
    successState: {
      id: 'lasting-influence-favorable-circumstances',
      targetScoped: true,
      grantsFavorableCircumstances: true,
      appliesToSkills: ['persuasion'],
      duration: '24 hours'
    },
    sourceBook: SOURCE,
    summary: 'After a successful Persuasion check against a target\'s Will Defense, gain favorable circumstances on future Persuasion checks against that target for 24 hours.'
  }];
}

function confidentSuccessRules() {
  return [{
    type: 'SKILL_SUCCESS_RESOURCE_GRANT',
    id: 'confident-success-learn-secret-force-point',
    label: 'Confident Success',
    skillKeys: ['gatherInformation'],
    extraUses: ['gather-information.learn-secret-information'],
    trigger: 'successfulLearnSecretInformation',
    resource: 'forcePoint',
    amount: 1,
    maxGrantedPerLevel: 3,
    cannotExceedForcePointsGainedAtCurrentLevel: true,
    sourceBook: SOURCE,
    summary: 'On successful Learn Secret Information, gain 1 Force Point, max 3 from this feat per level and not beyond the Force Points gained for the current level.'
  }];
}

function rerollOutcomeRule({ id, label, skillKey, species }) {
  return {
    type: 'SKILL_REROLL_OUTCOME_OVERRIDE',
    id,
    label,
    skillKeys: [skillKey],
    keep: 'better',
    appliesToAnyReroll: true,
    requiresSpecies: species,
    sourceBook: SOURCE,
    summary: `Whenever rerolling ${label === 'Perfect Intuition' ? 'Initiative' : skillKey} checks, keep the better result even if a reroll ability would normally require the second result.`
  };
}

function spacersSurgeRules() {
  return [{
    type: 'NATURAL_20_RESOURCE_GRANT',
    id: 'spacers-surge-pilot-temp-force-point',
    label: "Spacer's Surge",
    skillKeys: ['pilot'],
    trigger: 'natural20OnSkillCheck',
    resource: 'temporaryForcePoint',
    amount: 1,
    spendRestriction: 'anyBeforeEncounterEnd',
    expires: 'encounterEnd',
    sourceBook: SOURCE,
    summary: 'On a natural 20 on a Pilot check, gain 1 temporary Force Point that expires at the end of the encounter.'
  }];
}

function veteranSpacerRules() {
  return [{
    type: 'SPECIES_EXTRA_SKILL_USE_BONUS',
    id: 'veteran-spacer-astrogate-starship-bonus',
    label: 'Veteran Spacer',
    skillKeys: ['useComputer'],
    extraUses: ['use-computer.astrogate'],
    requiresContext: { aboardStarship: true },
    value: 5,
    bonusType: 'species',
    sourceBook: SOURCE,
    summary: '+5 species bonus to Use Computer checks made to Astrogate aboard a Starship.'
  }];
}

function ampleForagingRules() {
  return [{
    type: 'SKILL_SUCCESS_AURA_DEFENSE_RIDER',
    id: 'ample-foraging-basic-survival-fortitude',
    label: 'Ample Foraging',
    skillKeys: ['survival'],
    extraUses: ['survival.basic-survival'],
    trigger: 'basicSurvivalFoodConsumed',
    target: 'creaturesConsumingFoundFood',
    defenseBonus: { defense: 'fortitude', value: 2, bonusType: 'morale', duration: 'untilStartOfNextDay' },
    sourceBook: SOURCE,
    summary: 'Creatures that consume food found by the actor\'s Basic Survival check gain +2 morale Fortitude Defense until the start of the next day.'
  }];
}

function keenScentRules() {
  return [{
    type: 'SENSE_RANGE_OVERRIDE',
    id: 'keen-scent-range-20',
    label: 'Keen Scent',
    sense: 'scent',
    rangeSquares: 20,
    sourceBook: SOURCE,
    summary: 'Increase Scent ability range to 20 squares.'
  }];
}

function quickComebackRules() {
  return [{
    type: 'CONDITION_TRACK_RECOVERY_RIDER',
    id: 'quick-comeback-damage-threshold-recovery',
    label: 'Quick Comeback',
    trigger: 'movedDownConditionTrackByDamageThresholdAttack',
    actionCost: 'swift',
    conditionTrackStepsRecovered: 1,
    duration: 'untilEndOfNextTurn',
    oncePerTriggeringAttack: true,
    sourceBook: SOURCE,
    summary: 'When moved down the condition track by an attack whose damage equals or exceeds Damage Threshold, until end of next turn recover +1 CT step as a single swift action, once for that attack.'
  }];
}

function forcePointDieUpgradeRule({ id, label, skillKey }) {
  return {
    type: 'SKILL_FORCE_POINT_DIE_UPGRADE',
    id,
    label,
    skillKeys: [skillKey],
    dieUpgradeSteps: 2,
    sourceBook: SOURCE,
    summary: `When spending a Force Point to add to a ${skillKey} check, increase the Force Point die type by two steps.`
  };
}

function readTheWindsRules() {
  return [{
    type: 'PERCEPTION_COVER_CONCEALMENT_IGNORE',
    id: 'read-the-winds-ignore-cover-concealment-perception',
    label: 'Read the Winds',
    skillKeys: ['perception'],
    rangeSquares: 10,
    ignoresCover: true,
    ignoresConcealment: true,
    appliesTo: 'perceptionChecksAgainstTargets',
    sourceBook: SOURCE,
    summary: 'Ignore concealment and cover for Perception checks against targets within 10 squares.'
  }];
}

function fastSwimmerRules() {
  return [{
    type: 'MOVEMENT_SKILL_RIDER',
    id: 'fast-swimmer-swim-speed-plus-two',
    label: 'Fast Swimmer',
    skillKeys: ['swim'],
    swimSpeedBonusSquares: 2,
    sourceBook: SOURCE,
    summary: 'Increase Swim Speed by 2 squares.'
  }];
}

function monCalamariShipwrightRules() {
  return [{
    type: 'EXTRA_SKILL_USE_ACTION_ECONOMY_OVERRIDE',
    id: 'mon-calamari-shipwright-reroute-power',
    label: 'Mon Calamari Shipwright',
    skillKeys: ['mechanics'],
    extraUses: ['mechanics.reroute-power'],
    automaticSuccess: true,
    actionEconomy: { normalSwiftActions: 3, swiftActions: 2, removesCheck: true },
    sourceBook: SOURCE,
    summary: 'Reroute Power with two swift actions instead of three and automatically succeed on Mechanics checks to Reroute Power.'
  }];
}

function darknessDwellerRules() {
  return [{
    type: 'ENEMY_SKILL_PENALTY_AURA',
    id: 'darkness-dweller-stealth-penalty-aura',
    label: 'Darkness Dweller',
    skillKeys: ['stealth'],
    affects: 'enemies',
    rangeSquares: 10,
    value: -2,
    penaltyType: 'untyped',
    nonStackingSameRule: true,
    sourceBook: SOURCE,
    summary: 'Enemies making Stealth checks within 10 squares take -2; this penalty does not stack with other Darkness Dweller auras.'
  }];
}

function disarmingCharmRules() {
  return [{
    type: 'SKILL_SUCCESS_STATE_RIDER',
    id: 'disarming-charm-change-attitude-bonus',
    label: 'Disarming Charm',
    skillKeys: ['persuasion'],
    extraUses: ['persuasion.change-attitude'],
    trigger: 'successfulChangeAttitude',
    successState: {
      id: 'disarming-charm-target-bonus',
      targetScoped: true,
      appliesToSkills: ['deception', 'persuasion'],
      value: 2,
      bonusType: 'circumstance',
      duration: '24 hours'
    },
    sourceBook: SOURCE,
    summary: 'After successfully changing a target\'s attitude, gain +2 circumstance bonus to Deception and Persuasion checks against that target for 24 hours.'
  }];
}

function sureClimberRules() {
  return [{
    type: 'MOVEMENT_SKILL_RIDER',
    id: 'sure-climber-natural-climb-speed',
    label: 'Sure Climber',
    skillKeys: ['climb'],
    naturalClimbSpeedSquares: 4,
    requiresNotDistracted: true,
    requiresNotThreatened: true,
    sourceBook: SOURCE,
    summary: 'When not distracted or threatened, gain a natural Climb Speed of 4 squares.'
  }];
}

function survivorOfRylothRules() {
  return [{
    type: 'ENVIRONMENT_DEFENSE_SUBSTITUTION_RIDER',
    id: 'survivor-of-ryloth-extreme-temperature-survival',
    label: 'Survivor of Ryloth',
    skillKeys: ['survival'],
    frequency: 'oncePerHour',
    environments: ['extremeHeat', 'extremeCold'],
    maxAllies: 10,
    substituteSkillResultForDefense: 'fortitude',
    appliesTo: 'hourlyExtremeTemperatureAttack',
    sourceBook: SOURCE,
    summary: 'Once per hour in extreme heat or cold, make Survival; actor and up to 10 allies can use the result instead of Fortitude Defense against the hourly environmental attack.'
  }];
}

function instinctivePerceptionRules() {
  return [{
    type: 'SKILL_REROLL_FAILURE_RESOURCE_RIDER',
    id: 'instinctive-perception-second-result-temp-force-point',
    label: 'Instinctive Perception',
    skillKeys: ['perception'],
    trigger: 'rerollMustKeepSecondAndSecondIsLower',
    resource: 'temporaryForcePoint',
    amount: 1,
    spendRestriction: 'perceptionChecksOnly',
    expires: 'encounterEnd',
    sourceBook: SOURCE,
    summary: 'When a Perception reroll that must take the second result is lower than the first, gain 1 temporary Force Point usable only on Perception checks until encounter end.'
  }];
}

function unwaveringFocusRules() {
  return [{
    type: 'DEFENSIVE_SKILL_PENALTY_REACTION',
    id: 'unwavering-focus-mind-affecting-skill-penalty',
    label: 'Unwavering Focus',
    actionCost: 'reaction',
    trigger: 'targetedByMindAffectingSkillAgainstWill',
    targetDefense: 'will',
    skillCheckPenalty: -2,
    sourceBook: SOURCE,
    summary: 'As a reaction when targeted by a mind-affecting effect requiring a skill check against Will Defense, impose -2 to that skill check.'
  }];
}

function rulesForRebellionSpeciesSkillFeat(name) {
  const normalized = normalizeName(name);
  if (normalized === 'mind of reason') return mindOfReasonRules();
  if (normalized === 'lasting influence') return lastingInfluenceRules();
  if (normalized === 'confident success') return confidentSuccessRules();
  if (normalized === 'perfect intuition') return [rerollOutcomeRule({ id: 'perfect-intuition-initiative-keep-better', label: 'Perfect Intuition', skillKey: 'initiative', species: 'Cerean' })];
  if (normalized === 'flawless pilot') return [rerollOutcomeRule({ id: 'flawless-pilot-reroll-keep-better', label: 'Flawless Pilot', skillKey: 'pilot', species: 'Duros' })];
  if (normalized === 'spacer s surge' || normalized === 'spacers surge') return spacersSurgeRules();
  if (normalized === 'veteran spacer') return veteranSpacerRules();
  if (normalized === 'ample foraging') return ampleForagingRules();
  if (normalized === 'forest stalker') return [rerollOutcomeRule({ id: 'forest-stalker-stealth-keep-better', label: 'Forest Stalker', skillKey: 'stealth', species: 'Ewok' })];
  if (normalized === 'keen scent') return keenScentRules();
  if (normalized === 'quick comeback') return quickComebackRules();
  if (normalized === 'perfect swimmer') return [rerollOutcomeRule({ id: 'perfect-swimmer-swim-keep-better', label: 'Perfect Swimmer', skillKey: 'swim', species: 'Gungan' })];
  if (normalized === 'nature specialist') return [forcePointDieUpgradeRule({ id: 'nature-specialist-life-sciences-force-point-die', label: 'Nature Specialist', skillKey: 'knowledgeLifeSciences' })];
  if (normalized === 'read the winds') return readTheWindsRules();
  if (normalized === 'fast swimmer') return fastSwimmerRules();
  if (normalized === 'mon calamari shipwright') return monCalamariShipwrightRules();
  if (normalized === 'sharp senses') return [forcePointDieUpgradeRule({ id: 'sharp-senses-perception-force-point-die', label: 'Sharp Senses', skillKey: 'perception' })];
  if (normalized === 'hunter s instincts' || normalized === 'hunters instincts') return [rerollOutcomeRule({ id: 'hunters-instincts-perception-keep-better', label: "Hunter's Instincts", skillKey: 'perception', species: 'Rodian' })];
  if (normalized === 'master tracker') return [forcePointDieUpgradeRule({ id: 'master-tracker-survival-force-point-die', label: 'Master Tracker', skillKey: 'survival' })];
  if (normalized === 'darkness dweller') return darknessDwellerRules();
  if (normalized === 'disarming charm') return disarmingCharmRules();
  if (normalized === 'sure climber') return sureClimberRules();
  if (normalized === 'imperceptible liar') return [forcePointDieUpgradeRule({ id: 'imperceptible-liar-deception-force-point-die', label: 'Imperceptible Liar', skillKey: 'deception' })];
  if (normalized === 'survivor of ryloth') return survivorOfRylothRules();
  if (normalized === 'instinctive perception') return instinctivePerceptionRules();
  if (normalized === 'unwavering focus') return unwaveringFocusRules();
  return [];
}

async function normalizeRebellionSpeciesSkillFeat(item, options = {}) {
  if (options?.swseRebellionSpeciesSkillFeatNormalization === true) return false;
  if (!item?.actor || item.type !== 'feat') return false;
  const rules = rulesForRebellionSpeciesSkillFeat(item.name);
  if (!rules.length) return false;

  const existingRules = asArray(item.system?.abilityMeta?.rules);
  const newRules = rules.filter(rule => !hasRule(item, rule.id));
  if (!newRules.length) return false;

  try {
    await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{
      _id: item.id,
      'system.executionModel': 'ACTIVE',
      'system.subType': 'RULE',
      'system.abilityMeta.mechanicsMode': 'species_skill_feat_rule',
      'system.abilityMeta.applicationScope': 'skill_roll_or_contextual_action',
      'system.abilityMeta.staticSheetPolicy': 'exclude',
      'system.abilityMeta.rules': [...existingRules, ...newRules]
    }], {
      source: 'RebellionSpeciesSkillFeats.normalization',
      swseRebellionSpeciesSkillFeatNormalization: true,
      render: false
    });
    return true;
  } catch (err) {
    SWSELogger.error(`[RebellionSpeciesSkillFeats] Failed to normalize ${item.name}`, { error: err });
    return false;
  }
}

export function registerRebellionSpeciesSkillFeatNormalizationHooks() {
  Hooks.on('createItem', async (item, options) => normalizeRebellionSpeciesSkillFeat(item, options));
  Hooks.on('updateItem', async (item, _data, options) => normalizeRebellionSpeciesSkillFeat(item, options));
  SWSELogger.log('[RebellionSpeciesSkillFeats] Normalization hooks registered');
}

export { normalizeRebellionSpeciesSkillFeat, rulesForRebellionSpeciesSkillFeat };

export default registerRebellionSpeciesSkillFeatNormalizationHooks;
