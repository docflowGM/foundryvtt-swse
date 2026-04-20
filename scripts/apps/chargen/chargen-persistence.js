/**
 * Persistence and Actor Creation Helpers for Character Generator
 * Provides utilities for actor creation, updates, and data transformation
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { canonicalizeSkillKey } from "/systems/foundryvtt-swse/scripts/utils/skill-normalization.js";
import { BackgroundRegistry } from "/systems/foundryvtt-swse/scripts/registries/background-registry.js";
import { LanguageRegistry } from "/systems/foundryvtt-swse/scripts/registries/language-registry.js";
import { ClassesDB } from "/systems/foundryvtt-swse/scripts/data/classes-db.js";

/**
 * Build actor system data from character data
 * @param {Object} characterData - The character data
 * @returns {Object} System data for actor
 */
export function buildActorSystemData(characterData) {
  // Convert abilities → attributes
  const attributes = {};
  for (const [key, ability] of Object.entries(characterData.abilities)) {
    attributes[key] = {
      base: ability.base || 10,
      racial: ability.racial || 0,
      enhancement: 0,
      temp: ability.temp || 0
    };
  }

  // Build skills object
  const skills = {};
  for (const [key, skill] of Object.entries(characterData.skills || {})) {
    skills[key] = {
      trained: skill.trained || false,
      focused: skill.focused || false,
      miscMod: skill.misc || 0,
      selectedAbility: skill.selectedAbility || getDefaultAbilityForSkill(key),
      ranks: skill.ranks || 0
    };
  }

  return {
    level: characterData.level,
    species: characterData.species,
    size: characterData.size || 'medium',
    isDroid: characterData.isDroid || false,
    droidDegree: characterData.droidDegree || '',
    attributes: attributes,
    skills: skills,
    hp: characterData.hp,
    forcePoints: characterData.forcePoints,
    forceSensitive: characterData.forceSensitive || false,
    destinyPoints: characterData.destinyPoints,
    secondWind: characterData.secondWind,
    defenses: characterData.defenses,
    classes: characterData.classes,
    bab: characterData.bab,
    speed: Number.isFinite(characterData.speed) ? characterData.speed : 6,
    damageThresholdMisc: characterData.damageThresholdMisc || 0,
    credits: characterData.isDroid
      ? characterData.droidCredits.remaining
      : (characterData.credits || 1000),
    weapons: [],
    specialAbilities: characterData.specialAbilities || [],
    languages: characterData.languages || [],
    racialSkillBonuses: characterData.racialSkillBonuses || [],
    speciesSource: characterData.speciesSource || ''
  };
}

/**
 * Get default ability for a skill
 * @param {string} skillKey - The skill key
 * @returns {string} The default ability
 */
function getDefaultAbilityForSkill(skillKey) {
  const skillDefaults = {
    acrobatics: 'dex', climb: 'str', deception: 'cha', endurance: 'con',
    gatherInformation: 'cha', initiative: 'dex', jump: 'str',
    knowledgeBureaucracy: 'int', knowledgeGalacticLore: 'int',
    knowledgeLifeSciences: 'int', knowledgePhysicalSciences: 'int',
    knowledgeSocialSciences: 'int', knowledgeTactics: 'int',
    knowledgeTechnology: 'int', mechanics: 'int', perception: 'wis',
    persuasion: 'cha', pilot: 'dex', ride: 'dex', stealth: 'dex',
    survival: 'wis', swim: 'str', treatInjury: 'wis', useComputer: 'int'
  };
  return skillDefaults[skillKey] || 'str';
}

/**
 * Build progression structure for actor
 * @param {Object} characterData - The character data
 * @returns {Promise<Object>} Progression structure
 */
export async function buildProgressionStructure(characterData) {
  const backgroundSlug = characterData.background?.id || '';
  const bgRecord = backgroundSlug ? await BackgroundRegistry.getBySlug(backgroundSlug) : null;
  const backgroundInternalId = bgRecord?.internalId || '';
  const backgroundUuid = bgRecord?.uuid || '';

  const languageNames = Array.isArray(characterData.languages) ? characterData.languages : [];
  const languageInternalIds = [];
  const languageUuids = [];

  for (const name of languageNames) {
    const rec = await LanguageRegistry.getByName(name);
    if (rec?.internalId) { languageInternalIds.push(rec.internalId); }
    if (rec?.uuid) { languageUuids.push(rec.uuid); }
  }

  const backgroundClassSkills = [];
  const backgroundSkillNames = characterData.background?.trainedSkills || [];
  for (const skillName of backgroundSkillNames) {
    const canonicalKey = canonicalizeSkillKey(skillName);
    if (canonicalKey) {
      backgroundClassSkills.push(canonicalKey);
    }
  }

  return {
    classLevels: (characterData.classes || []).map(cls => ({
      class: cls.name,
      level: cls.level || 1,
      choices: {}
    })),
    species: characterData.species || '',
    background: backgroundSlug,
    backgroundInternalId,
    backgroundTrainedSkills: characterData.background?.trainedSkills || [],
    feats: (characterData.feats || []).map(feat => feat.name || feat),
    talents: (characterData.talents || []).map(talent => talent.name || talent),
    trainedSkills: characterData.trainedSkills || [],
    abilityIncreases: characterData.abilityIncreases || []
  };
}

/**
 * Build biography fields from background
 * @param {Object} characterData - The character data
 * @returns {Object} Biography fields
 */
export function buildBiographyFields(characterData) {
  return {
    event: characterData.background && characterData.background.category === 'event' ? characterData.background.name : '',
    profession: characterData.background && characterData.background.category === 'occupation' ? characterData.background.name : '',
    planetOfOrigin: characterData.background && characterData.background.category === 'planet' ? characterData.background.name : ''
  };
}

/**
 * Build mentor system data
 * @param {Object} characterData - The character data
 * @returns {Object} Mentor system data
 */
export function buildMentorSystemData(characterData) {
  return {
    surveyBias: characterData.mentorBiases || {
      mechanicalBias: {},
      roleBias: {},
      attributeBias: {}
    },
    mentorBuildIntentBiases: characterData.mentorBiases?.mechanicalBias ? {} : (characterData.mentorBiases || {}),
    mentorSurveyCompleted: characterData.mentorSurveyCompleted || false
  };
}

/**
 * Create a Nonheroic class item for NPCs
 * @returns {Object} Nonheroic class item
 */
export function createNonheroicClassItem() {
  return {
    name: 'Nonheroic',
    type: 'class',
    system: {
      level: 1,
      hitDie: '1d4',
      babProgression: 'medium',
      isNonheroic: true,
      defenses: {
        fortitude: 0,
        reflex: 0,
        will: 0
      },
      classSkills: [
        'acrobatics', 'climb', 'deception', 'endurance',
        'gatherInformation', 'initiative', 'jump',
        'knowledgeBureaucracy', 'knowledgeGalacticLore',
        'knowledgeLifeSciences', 'knowledgePhysicalSciences',
        'knowledgeSocialSciences', 'knowledgeTactics',
        'knowledgeTechnology', 'mechanics', 'perception',
        'persuasion', 'pilot', 'ride', 'stealth', 'survival',
        'swim', 'treatInjury', 'useComputer'
      ],
      forceSensitive: false,
      talentTrees: []
    }
  };
}

/**
 * Create a class item from class data
 * @param {Object} classDoc - Class document from pack
 * @param {Object} classData - Class data from character
 * @returns {Object} Class item
 */
export function createClassItem(classDoc, classData) {
  const classDef = ClassesDB.byName(classDoc.name);

  if (!classDef) {
    const errorMsg = `Class "${classDoc.name}" not found in ClassesDB. Character cannot be created without valid class definitions.`;
    SWSELogger.error(`CharGen | ${errorMsg}`);
    throw new Error(errorMsg);
  }

  return {
    name: classDoc.name,
    type: 'class',
    img: classDoc.img,
    system: {
      classId: classDef.id,
      level: classData.level || 1
    }
  };
}

/**
 * Log character creation success
 * @param {string} characterName - Character name
 * @param {Object} actor - Created actor
 */
export function logCreationSuccess(characterName, actor) {
  SWSELogger.log(`[CHARGEN] Character created successfully: ${characterName} (id: ${actor.id})`);
  ui.notifications.info(`Character ${characterName} created successfully!`);
}

/**
 * Log character creation error
 * @param {string} characterName - Character name
 * @param {Error} error - The error
 */
export function logCreationError(characterName, error) {
  SWSELogger.error(`chargen: actor creation failed for ${characterName}`, error);
  ui.notifications.error(`Failed to create character: ${error.message}. See console for details.`);
}
