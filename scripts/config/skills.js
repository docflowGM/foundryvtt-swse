/**
 * SWSE Skills Configuration
 * Centralized skill definitions to avoid hardcoding in templates
 */

/**
 * Complete skill definitions for SWSE
 * Each skill includes its key ability and whether it can be used untrained
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
 * @param {string} skillKey - The skill key
 * @returns {Object} Skill configuration
 */
export function getSkillConfig(skillKey) {
  return SWSE_SKILLS[skillKey] || null;
}

/**
 * Get all skills as an array
 * @returns {Array} Array of skill objects with keys
 */
export function getSkillsArray() {
  return Object.entries(SWSE_SKILLS).map(([key, config]) => ({
    key,
    ...config
  }));
}

/**
 * Get skills grouped by ability
 * @returns {Object} Skills grouped by ability score
 */
export function getSkillsByAbility() {
  const grouped = {
    str: [],
    dex: [],
    con: [],
    int: [],
    wis: [],
    cha: []
  };

  Object.entries(SWSE_SKILLS).forEach(([key, config]) => {
    if (grouped[config.ability]) {
      grouped[config.ability].push({ key, ...config });
    }
  });

  return grouped;
}

/**
 * Get trainable vs untrained skills
 * @returns {Object} Object with trainable and untrained skill arrays
 */
export function getSkillsByTrainability() {
  const skills = getSkillsArray();
  return {
    trainable: skills.filter(s => !s.untrained),
    untrained: skills.filter(s => s.untrained)
  };
}

/**
 * Check if a skill can be used untrained
 * @param {string} skillKey - The skill key
 * @returns {boolean}
 */
export function canUseUntrained(skillKey) {
  const skill = getSkillConfig(skillKey);
  return skill ? skill.untrained : false;
}

/**
 * Get the ability for a skill
 * @param {string} skillKey - The skill key
 * @returns {string} The ability abbreviation (str, dex, etc.)
 */
export function getSkillAbility(skillKey) {
  const skill = getSkillConfig(skillKey);
  return skill ? skill.ability : '';
}

/**
 * Register Handlebars helper for skills
 */
Hooks.once('init', () => {
  Handlebars.registerHelper('skillAbility', function(skillKey) {
    return getSkillAbility(skillKey).toUpperCase();
  });

  Handlebars.registerHelper('skillLabel', function(skillKey) {
    const skill = getSkillConfig(skillKey);
    return skill ? skill.label : skillKey;
  });

  Handlebars.registerHelper('canUseUntrained', function(skillKey) {
    return canUseUntrained(skillKey);
  });
});
