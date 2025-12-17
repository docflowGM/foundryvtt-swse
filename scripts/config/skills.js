/**
 * SWSE Skills Configuration
 * Now loads from swse.skills compendium with fallback to hardcoded data
 */

/**
 * Skill cache loaded from compendium
 * @type {Map<string, Object>}
 */
let skillsCache = null;
let loadingPromise = null;

/**
 * Load skills from compendium
 * @returns {Promise<Map<string, Object>>} Map of skill key to skill config
 */
async function loadSkillsFromCompendium() {
  if (skillsCache) {
    return skillsCache;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    const cache = new Map();

    try {
      // Safety checks for game initialization
      if (!game?.packs) {
        console.warn('SWSE Skills: game.packs not available yet, using fallback');
        skillsCache = cache;
        loadingPromise = null;
        return cache;
      }

      const pack = game.packs.get('swse.skills');
      if (!pack) {
        console.warn('SWSE Skills: swse.skills compendium not found, using fallback');
        skillsCache = cache;
        loadingPromise = null;
        return cache;
      }

      // Ensure pack is indexed before getting documents
      if (!pack.indexed) {
        await pack.getIndex();
      }

      const docs = await pack.getDocuments();

      if (!docs || docs.length === 0) {
        console.warn('SWSE Skills: No skills found in compendium, using fallback');
      } else {
        for (const doc of docs) {
          // Convert skill name to key format (e.g., "Acrobatics" -> "acrobatics")
          const key = doc.name.toLowerCase().replace(/\s+/g, '-');
          cache.set(key, {
            label: doc.name,
            ability: doc.system.ability?.toLowerCase() || 'int',
            untrained: true, // Most skills can be used untrained in SWSE
            description: doc.system.description || ''
          });
        }

        console.log(`SWSE Skills: Loaded ${cache.size} skills from compendium`);
      }
    } catch (err) {
      console.warn('SWSE Skills: Failed to load from compendium, using fallback', err);
    }

    skillsCache = cache;
    loadingPromise = null;
    return cache;
  })();

  return loadingPromise;
}

/**
 * Complete skill definitions for SWSE (FALLBACK)
 * Each skill includes its key ability and whether it can be used untrained
 * Used when compendium is not available
 */
export const SWSE_SKILLS = {
  acrobatics: {
    label: 'Acrobatics',
    ability: 'dex',
    untrained: true,
    description: 'Balance, tumble, and perform acrobatic stunts'
  },
  climb: {
    label: 'Climb',
    ability: 'str',
    untrained: true,
    description: 'Scale walls, cliffs, and other vertical surfaces'
  },
  deception: {
    label: 'Deception',
    ability: 'cha',
    untrained: true,
    description: 'Lie, disguise yourself, and feint in combat'
  },
  endurance: {
    label: 'Endurance',
    ability: 'con',
    untrained: true,
    description: 'Resist fatigue, starvation, and environmental hazards'
  },
  'gather-information': {
    label: 'Gather Information',
    ability: 'cha',
    untrained: true,
    description: 'Collect rumors and information in social settings'
  },
  initiative: {
    label: 'Initiative',
    ability: 'dex',
    untrained: true,
    description: 'Act quickly in combat situations'
  },
  jump: {
    label: 'Jump',
    ability: 'str',
    untrained: true,
    description: 'Leap over obstacles and gaps'
  },
  'knowledge-bureaucracy': {
    label: 'Knowledge (Bureaucracy)',
    ability: 'int',
    untrained: false,
    description: 'Know about governmental procedures and regulations'
  },
  'knowledge-galactic-lore': {
    label: 'Knowledge (Galactic Lore)',
    ability: 'int',
    untrained: false,
    description: 'Know about planets, systems, and galactic history'
  },
  'knowledge-life-sciences': {
    label: 'Knowledge (Life Sciences)',
    ability: 'int',
    untrained: false,
    description: 'Know about biology, medicine, and xenobiology'
  },
  'knowledge-physical-sciences': {
    label: 'Knowledge (Physical Sciences)',
    ability: 'int',
    untrained: false,
    description: 'Know about physics, chemistry, and astronomy'
  },
  'knowledge-social-sciences': {
    label: 'Knowledge (Social Sciences)',
    ability: 'int',
    untrained: false,
    description: 'Know about psychology, philosophy, and sociology'
  },
  'knowledge-tactics': {
    label: 'Knowledge (Tactics)',
    ability: 'int',
    untrained: false,
    description: 'Know about military strategy and combat tactics'
  },
  'knowledge-technology': {
    label: 'Knowledge (Technology)',
    ability: 'int',
    untrained: false,
    description: 'Know about computers, droids, and technology'
  },
  mechanics: {
    label: 'Mechanics',
    ability: 'int',
    untrained: true,
    description: 'Repair and modify devices and equipment'
  },
  perception: {
    label: 'Perception',
    ability: 'wis',
    untrained: true,
    description: 'Notice things with your senses'
  },
  persuasion: {
    label: 'Persuasion',
    ability: 'cha',
    untrained: true,
    description: 'Influence others through diplomacy and negotiation'
  },
  'pilot': {
    label: 'Pilot',
    ability: 'dex',
    untrained: true,
    description: 'Operate vehicles and starships'
  },
  'ride': {
    label: 'Ride',
    ability: 'dex',
    untrained: true,
    description: 'Control and ride creatures and beasts'
  },
  stealth: {
    label: 'Stealth',
    ability: 'dex',
    untrained: true,
    description: 'Hide, move silently, and avoid detection'
  },
  survival: {
    label: 'Survival',
    ability: 'wis',
    untrained: true,
    description: 'Track, hunt, and survive in the wilderness'
  },
  swim: {
    label: 'Swim',
    ability: 'str',
    untrained: true,
    description: 'Move through water and aquatic environments'
  },
  'treat-injury': {
    label: 'Treat Injury',
    ability: 'wis',
    untrained: false,
    description: 'Provide medical care and treat wounds'
  },
  'use-computer': {
    label: 'Use Computer',
    ability: 'int',
    untrained: true,
    description: 'Access computer systems and slice security'
  },
  'use-the-force': {
    label: 'Use the Force',
    ability: 'cha',
    untrained: false,
    description: 'Channel and manipulate the Force'
  }
};

/**
 * Get skill configuration by key
 * Async version that loads from compendium
 * @param {string} skillKey - The skill key
 * @returns {Promise<Object|null>} Skill configuration
 */
export async function getSkillConfig(skillKey) {
  const skills = await loadSkillsFromCompendium();
  if (skills.size > 0) {
    return skills.get(skillKey) || null;
  }
  // Fallback to hardcoded
  return SWSE_SKILLS[skillKey] || null;
}

/**
 * Get all skills as an array
 * Async version that loads from compendium
 * @returns {Promise<Array>} Array of skill objects with keys
 */
export async function getSkillsArray() {
  const skills = await loadSkillsFromCompendium();
  if (skills.size > 0) {
    return Array.from(skills.entries()).map(([key, config]) => ({
      key,
      ...config
    }));
  }
  // Fallback to hardcoded
  return Object.entries(SWSE_SKILLS).map(([key, config]) => ({
    key,
    ...config
  }));
}

/**
 * Get skills grouped by ability
 * Async version that loads from compendium
 * @returns {Promise<Object>} Skills grouped by ability score
 */
export async function getSkillsByAbility() {
  const grouped = {
    str: [],
    dex: [],
    con: [],
    int: [],
    wis: [],
    cha: []
  };

  const skillsArray = await getSkillsArray();
  skillsArray.forEach(({ key, ...config }) => {
    if (grouped[config.ability]) {
      grouped[config.ability].push({ key, ...config });
    }
  });

  return grouped;
}

/**
 * Get trainable vs untrained skills
 * Async version that loads from compendium
 * @returns {Promise<Object>} Object with trainable and untrained skill arrays
 */
export async function getSkillsByTrainability() {
  const skills = await getSkillsArray();
  return {
    trainable: skills.filter(s => !s.untrained),
    untrained: skills.filter(s => s.untrained)
  };
}

/**
 * Check if a skill can be used untrained
 * Async version that loads from compendium
 * @param {string} skillKey - The skill key
 * @returns {Promise<boolean>}
 */
export async function canUseUntrained(skillKey) {
  const skill = await getSkillConfig(skillKey);
  return skill ? skill.untrained : false;
}

/**
 * Get the ability for a skill
 * Async version that loads from compendium
 * @param {string} skillKey - The skill key
 * @returns {Promise<string>} The ability abbreviation (str, dex, etc.)
 */
export async function getSkillAbility(skillKey) {
  const skill = await getSkillConfig(skillKey);
  return skill ? skill.ability : '';
}

/**
 * Synchronous fallback for getting skill config (for Handlebars helpers)
 * Uses cached data if available, otherwise uses hardcoded fallback
 * @param {string} skillKey - The skill key
 * @returns {Object|null} Skill configuration
 */
function getSkillConfigSync(skillKey) {
  if (skillsCache && skillsCache.size > 0) {
    return skillsCache.get(skillKey) || null;
  }
  return SWSE_SKILLS[skillKey] || null;
}

/**
 * Register Handlebars helpers and preload skills
 */
Hooks.once('init', () => {
  // Preload skills from compendium
  loadSkillsFromCompendium().catch(err => {
    console.warn('SWSE Skills: Failed to preload skills', err);
  });

  Handlebars.registerHelper('skillAbility', function(skillKey) {
    const skill = getSkillConfigSync(skillKey);
    return skill ? skill.ability.toUpperCase() : '';
  });

  Handlebars.registerHelper('skillLabel', function(skillKey) {
    const skill = getSkillConfigSync(skillKey);
    return skill ? skill.label : skillKey;
  });

  Handlebars.registerHelper('canUseUntrained', function(skillKey) {
    const skill = getSkillConfigSync(skillKey);
    return skill ? skill.untrained : false;
  });
});
