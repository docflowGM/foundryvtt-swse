/**
 * State Management for Character Generator
 * Handles characterData initialization, hydration, and state helpers
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ChargenDataCache } from "/systems/foundryvtt-swse/scripts/apps/chargen/chargen-shared.js";
import { HouseRuleTalentCombination } from "/systems/foundryvtt-swse/scripts/houserules/houserule-talent-combination.js";

/**
 * Initialize characterData object with default values
 * @returns {Object} Initialized characterData
 */
export function initializeCharacterData() {
  return {
    name: '',
    isDroid: false,
    droidDegree: '',
    droidSize: 'medium',
    species: '',
    size: 'Medium',
    specialAbilities: [],
    languages: [],
    racialSkillBonuses: [],
    speciesSource: '',
    speciesFilters: {
      attributeBonus: null,
      attributePenalty: null,
      size: null
    },
    background: null,
    backgroundCategory: 'events',
    backgroundSkills: [],
    backgroundNarratorComment: '',
    skillFilter: null,
    languageFilter: null,
    allowHomebrewPlanets: false,
    occupationBonus: null,
    importedDroidData: null,
    preselectedSkills: [],
    droidSystems: {
      locomotion: null,
      processor: { name: 'Heuristic Processor', cost: 0, weight: 5 },
      appendages: [
        { name: 'Hand', cost: 0, weight: 5 },
        { name: 'Hand', cost: 0, weight: 5 }
      ],
      accessories: [],
      totalCost: 0,
      totalWeight: 10
    },
    droidCredits: {
      base: 1000,
      class: 0,
      spent: 0,
      remaining: 1000
    },
    classes: [],
    abilities: {
      str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
      dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
      con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
      int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
      wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
      cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
    },
    abilitiesAssigned: false,
    skills: {},
    trainedSkills: [],
    classSkillsList: [],
    trainedSkillsAllowed: 0,
    feats: [],
    featsRequired: 1,
    talents: [],
    talentsRequired: 1,
    powers: [],
    forcePowersRequired: 0,
    starshipManeuvers: [],
    starshipManeuversRequired: 0,
    level: 1,
    hp: { value: 1, max: 1, temp: 0 },
    forcePoints: { value: 5, max: 5, die: '1d6' },
    destinyPoints: { value: 1 },
    secondWind: { uses: 1, max: 1, misc: 0, healing: 0 },
    defenses: {
      fort: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10, ability: 'con' },
      reflex: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 12, ability: 'dex' },
      will: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 11, ability: 'wis' }
    },
    bab: 0,
    speed: 6,
    damageThresholdMisc: 0,
    credits: 1000
  };
}

/**
 * Load character data from an existing actor
 * @param {Actor} actor - The actor to load from
 * @param {Object} characterData - The character data object to populate
 */
export function loadFromActor(actor, characterData) {
  const system = actor.system;

  // Load basic info
  characterData.name = actor.name || '';
  characterData.level = system.level || 0;

  // Load species/droid status
  if (system.species) {
    characterData.species = system.species;
    characterData.isDroid = false;
  }
  if (system.isDroid) {
    characterData.isDroid = true;
    characterData.droidDegree = system.droidDegree || '';
    characterData.droidSize = system.size || 'medium';
  }

  // Load abilities
  if (system.attributes) {
    for (const [key, value] of Object.entries(system.attributes)) {
      if (characterData.abilities[key]) {
        characterData.abilities[key].total = value.total ?? 10;
        characterData.abilities[key].base = value.base ?? 10;
      }
    }
  }

  // Load speed
  if (system.speed && Number.isFinite(system.speed)) {
    characterData.speed = system.speed;
  } else {
    characterData.speed = 6;
  }

  // Load classes
  const classItems = actor.items.filter(item => item.type === 'class');
  characterData.classes = classItems.map(cls => ({
    name: cls.name,
    level: cls.system.level || 1
  }));

  // Load existing items as full objects
  characterData.feats = actor.items.filter(item => item.type === 'feat').map(f => ({
    name: f.name,
    _id: f.id,
    type: f.type,
    system: f.system
  }));
  characterData.talents = actor.items.filter(item => item.type === 'talent').map(t => ({
    name: t.name,
    _id: t.id,
    type: t.type,
    system: t.system
  }));
}

/**
 * Load compendium data into packs cache
 * @param {Object} packs - The packs cache object to populate
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function loadPacksData(packs) {
  const showLoading = !ChargenDataCache.isCached();
  const loadingNotif = showLoading ? ui.notifications.info(
    'Loading character generation data...',
    { permanent: true }
  ) : null;

  try {
    const cachedPacks = await ChargenDataCache.getData();
    Object.assign(packs, { ...cachedPacks });

    // Apply Block/Deflect combination to talents if house rule enabled
    if (packs.talents) {
      packs.talents = HouseRuleTalentCombination.processBlockDeflectCombination(packs.talents);
    }

    // Validate critical packs
    const criticalPacks = ['species', 'classes', 'feats'];
    const missingCriticalPacks = [];

    for (const key of criticalPacks) {
      if (!packs[key] || packs[key].length === 0) {
        missingCriticalPacks.push(`swse.${key}`);
      }
    }

    if (missingCriticalPacks.length > 0) {
      const missingList = missingCriticalPacks.join(', ');
      ui.notifications.error(
        `Character generation cannot continue. Missing critical compendium packs: ${missingList}. Please ensure all SWSE compendium packs are properly installed.`,
        { permanent: true }
      );
      SWSELogger.error(`chargen: blocking due to missing critical packs: ${missingList}`);
      return false;
    }

    return true;
  } finally {
    if (loadingNotif) {
      loadingNotif.remove();
    }
  }
}

/**
 * Load skills from JSON
 * @param {Function} getDefaultSkills - Fallback function to get default skills
 * @returns {Promise<Object>} Skills data
 */
export async function loadSkillsData(getDefaultSkills) {
  try {
    const resp = await fetch('systems/foundryvtt-swse/data/skills.json');
    if (resp.ok) {
      const data = await resp.json();
      SWSELogger.log('chargen: skills.json loaded successfully');
      return data;
    } else {
      SWSELogger.warn('chargen: failed to fetch skills.json, using defaults');
      return getDefaultSkills();
    }
  } catch (e) {
    SWSELogger.error('chargen: error loading skills.json:', e);
    return getDefaultSkills();
  }
}

/**
 * Load feat metadata from JSON
 * @returns {Promise<Object|null>} Feat metadata or null
 */
export async function loadFeatMetadata() {
  try {
    const resp = await fetch('systems/foundryvtt-swse/data/feat-metadata.json');
    if (resp.ok) {
      const data = await resp.json();
      SWSELogger.log('chargen: feat-metadata.json loaded successfully');
      return data;
    } else {
      SWSELogger.warn('chargen: failed to fetch feat-metadata.json');
      return null;
    }
  } catch (e) {
    SWSELogger.error('chargen: error loading feat-metadata.json:', e);
    return null;
  }
}

/**
 * Filter out Force-dependent talents/feats for droids
 * @param {Array} items - Array of talents or feats
 * @param {boolean} isDroid - Whether character is a droid
 * @returns {Array} Filtered array
 */
export function filterForceDependentItems(items, isDroid) {
  if (!isDroid) {
    return items;
  }

  return items.filter(item => {
    const prereqs = item.system?.prerequisites || '';
    const preqsLower = prereqs.toLowerCase();
    return !(
      preqsLower.includes('force sensitivity') ||
      preqsLower.includes('force technique') ||
      preqsLower.includes('force secret') ||
      preqsLower.includes('force point')
    );
  });
}
