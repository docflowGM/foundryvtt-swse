/**
 * Shared utilities for SWSE Level Up system
 * Contains helper functions and constants used across multiple level-up modules
 */

import { SWSELogger } from '../../utils/logger.js';

/**
 * List of base classes in SWSE
 */
export const BASE_CLASSES = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier'];

/**
 * Check if a class name is a base class
 * @param {string} className - Name of the class
 * @returns {boolean}
 */
export function isBaseClass(className) {
  return BASE_CLASSES.includes(className);
}

/**
 * Get the current level in a specific class
 * @param {Actor} actor - The actor
 * @param {string} className - Name of the class
 * @returns {number} Current level in that class
 */
export function getClassLevel(actor, className) {
  const classItem = actor.items.find(i => i.type === 'class' && i.name === className);
  return classItem ? (classItem.system.level || 0) : 0;
}

/**
 * Get character's current classes as a map of className -> level
 * @param {Actor} actor - The actor
 * @returns {Object} Map of class names to levels
 */
export function getCharacterClasses(actor) {
  const classItems = actor.items.filter(i => i.type === 'class');
  const classes = {};

  classItems.forEach(classItem => {
    if (classes[classItem.name]) {
      classes[classItem.name]++;
    } else {
      classes[classItem.name] = 1;
    }
  });

  return classes;
}

/**
 * Get defense bonuses for a specific class
 * In SWSE, class defense bonuses are applied ONCE per class, not per level
 * @param {string} className - Name of the class
 * @returns {{fortitude: number, reflex: number, will: number}} Defense bonuses
 */
export function getClassDefenseBonuses(className) {
  // Defense bonuses by class (applied once per class, NOT multiplied by level)
  // Format: Reflex/Fortitude/Will
  const defenseProgression = {
    // Base Classes
    'Jedi': { reflex: 1, fortitude: 1, will: 1 },
    'Noble': { reflex: 1, fortitude: 0, will: 2 },
    'Scout': { reflex: 2, fortitude: 1, will: 0 },
    'Soldier': { reflex: 1, fortitude: 2, will: 0 },
    'Scoundrel': { reflex: 2, fortitude: 0, will: 1 },

    // Prestige Classes - Core Rulebook
    'Ace Pilot': { reflex: 4, fortitude: 2, will: 0 },
    'Bounty Hunter': { reflex: 4, fortitude: 2, will: 0 },
    'Crime Lord': { reflex: 2, fortitude: 0, will: 4 },
    'Elite Trooper': { reflex: 2, fortitude: 4, will: 0 },
    'Force Adept': { reflex: 2, fortitude: 2, will: 4 },
    'Force Disciple': { reflex: 3, fortitude: 3, will: 6 },
    'Gunslinger': { reflex: 4, fortitude: 0, will: 2 },
    'Jedi Knight': { reflex: 2, fortitude: 2, will: 2 },
    'Jedi Master': { reflex: 3, fortitude: 3, will: 3 },
    'Officer': { reflex: 2, fortitude: 0, will: 4 },
    'Sith Apprentice': { reflex: 2, fortitude: 2, will: 2 },
    'Sith Lord': { reflex: 3, fortitude: 3, will: 3 },

    // Additional Prestige Classes
    'Corporate Agent': { reflex: 2, fortitude: 0, will: 4 },
    'Gladiator': { reflex: 4, fortitude: 2, will: 0 },
    'Melee Duelist': { reflex: 4, fortitude: 0, will: 2 },
    'Enforcer': { reflex: 4, fortitude: 0, will: 2 },
    'Independent Droid': { reflex: 2, fortitude: 0, will: 4 },
    'Infiltrator': { reflex: 4, fortitude: 0, will: 2 },
    'Master Privateer': { reflex: 2, fortitude: 0, will: 4 },
    'Medic': { reflex: 0, fortitude: 4, will: 2 },
    'Saboteur': { reflex: 2, fortitude: 0, will: 4 },
    'Assassin': { reflex: 4, fortitude: 2, will: 0 },
    'Charlatan': { reflex: 2, fortitude: 0, will: 4 },
    'Outlaw': { reflex: 4, fortitude: 2, will: 0 },
    'Droid Commander': { reflex: 2, fortitude: 2, will: 2 },
    'Military Engineer': { reflex: 2, fortitude: 2, will: 2 },
    'Vanguard': { reflex: 2, fortitude: 4, will: 0 },
    'Imperial Knight': { reflex: 2, fortitude: 2, will: 2 },
    'Shaper': { reflex: 0, fortitude: 2, will: 4 },
    'Improviser': { reflex: 2, fortitude: 0, will: 4 },
    'Pathfinder': { reflex: 2, fortitude: 4, will: 0 },
    'Martial Arts Master': { reflex: 2, fortitude: 4, will: 0 }
  };

  return defenseProgression[className] || { reflex: 0, fortitude: 0, will: 0 };
}

/**
 * Calculate total BAB from all class items
 * @param {Actor} actor - The actor
 * @returns {number} Total BAB
 */
/**
 * Convert BAB progression string to numeric multiplier
 * @param {string|number} progression - "slow", "medium", "fast" or a number
 * @returns {number} - Per-level BAB multiplier
 */
function convertBabProgression(progression) {
  if (typeof progression === 'number') return progression;

  const progressionMap = {
    'slow': 0.5,
    'medium': 0.75,
    'fast': 1.0
  };

  return progressionMap[progression] || 0.75; // default to medium
}

export function calculateTotalBAB(actor) {
  const classItems = actor.items.filter(i => i.type === 'class');
  let totalBAB = 0;

  for (const classItem of classItems) {
    const classLevel = classItem.system.level || 1;
    const className = classItem.name;

    // Check if class has level_progression data with BAB
    if (classItem.system.level_progression && Array.isArray(classItem.system.level_progression)) {
      const levelData = classItem.system.level_progression.find(lp => lp.level === classLevel);
      if (levelData && typeof levelData.bab === 'number') {
        totalBAB += levelData.bab;
        continue;
      }
    }

    // Fallback: Use babProgression if available
    if (classItem.system.babProgression) {
      const babMultiplier = convertBabProgression(classItem.system.babProgression);
      totalBAB += Math.floor(classLevel * babMultiplier);
      continue;
    }

    // Fallback: Calculate from known class names
    const fullBABClasses = ['Jedi', 'Soldier'];
    if (fullBABClasses.includes(className)) {
      totalBAB += classLevel;
    } else {
      // 3/4 BAB for other base classes
      totalBAB += Math.floor(classLevel * 0.75);
    }
  }

  return totalBAB;
}

/**
 * Calculate defense bonuses from all class items
 * In SWSE, class defense bonuses are FLAT per class and do NOT scale with class level
 * When multiclassing, use the HIGHEST defense bonus from any class (not additive)
 * @param {Actor} actor - The actor
 * @returns {{fortitude: number, reflex: number, will: number}}
 */
export function calculateDefenseBonuses(actor) {
  const classItems = actor.items.filter(i => i.type === 'class');
  const bonuses = { fortitude: 0, reflex: 0, will: 0 };

  for (const classItem of classItems) {
    const className = classItem.name;

    // Check if class item has defenses specified (FLAT bonuses, not per level!)
    if (classItem.system.defenses &&
        (classItem.system.defenses.fortitude || classItem.system.defenses.reflex || classItem.system.defenses.will)) {
      // Take the MAXIMUM defense bonus from any class, not additive
      bonuses.fortitude = Math.max(bonuses.fortitude, classItem.system.defenses.fortitude || 0);
      bonuses.reflex = Math.max(bonuses.reflex, classItem.system.defenses.reflex || 0);
      bonuses.will = Math.max(bonuses.will, classItem.system.defenses.will || 0);
    } else {
      // Use known defense progressions (FLAT bonuses, take maximum)
      const progression = getClassDefenseBonuses(className);
      bonuses.fortitude = Math.max(bonuses.fortitude, progression.fortitude);
      bonuses.reflex = Math.max(bonuses.reflex, progression.reflex);
      bonuses.will = Math.max(bonuses.will, progression.will);

      // If defenses aren't set on the class item, update it to store them
      if (classItem.system.defenses === undefined ||
          (!classItem.system.defenses.fortitude && !classItem.system.defenses.reflex && !classItem.system.defenses.will)) {
        SWSELogger.log(`SWSE LevelUp | Updating ${className} with defense bonuses: Fort +${progression.fortitude}, Ref +${progression.reflex}, Will +${progression.will}`);
        classItem.update({
          'system.defenses': {
            fortitude: progression.fortitude,
            reflex: progression.reflex,
            will: progression.will
          }
        });
      }
    }
  }

  return bonuses;
}

/**
 * Check if the new level grants an ability score increase
 * @param {number} newLevel - The new character level
 * @param {boolean} isNonheroic - Whether this is a nonheroic class level
 * @returns {boolean}
 */
export function getsAbilityIncrease(newLevel, isNonheroic = false) {
  // NONHEROIC RULE: Nonheroic characters get ability increases every 4 levels (same levels)
  // But they only get to increase 1 ability score by 1 point (instead of 2 scores)
  return [4, 8, 12, 16, 20].includes(newLevel);
}

/**
 * Get the number of ability score increases at this level
 * @param {number} newLevel - The new character level
 * @param {boolean} isNonheroic - Whether this is a nonheroic class level
 * @returns {number} - Number of ability scores that can be increased (1 or 2)
 */
export function getAbilityIncreaseCount(newLevel, isNonheroic = false) {
  if (![4, 8, 12, 16, 20].includes(newLevel)) {
    return 0;
  }

  // NONHEROIC RULE: Nonheroic characters only get 1 ability score increase (instead of 2)
  return isNonheroic ? 1 : 2;
}

/**
 * Check if the new level grants a milestone feat
 * @param {number} newLevel - The new character level
 * @returns {boolean}
 */
export function getsMilestoneFeat(newLevel) {
  return [3, 6, 9, 12, 15, 18].includes(newLevel);
}

/**
 * Calculate HP gain for a level-up
 * @param {Object} classDoc - The class document
 * @param {Actor} actor - The actor
 * @param {number} newLevel - The new character level
 * @returns {number} HP to gain
 */
export function calculateHPGain(classDoc, actor, newLevel) {
  // Check if this is a nonheroic class
  const isNonheroic = classDoc.system.isNonheroic || false;

  let hitDie;

  // NONHEROIC RULE: Nonheroic characters gain 1d4 HP + CON per level
  if (isNonheroic) {
    hitDie = 4;
  } else {
    // SWSE Official Hit Dice by Class
    const classHitDice = {
      // d12 classes
      'Elite Trooper': 12,
      'Independent Droid': 12,
      // d10 classes
      'Assassin': 10,
      'Bounty Hunter': 10,
      'Droid Commander': 10, // Changed from d6
      'Gladiator': 10,
      'Imperial Knight': 10,
      'Jedi': 10,
      'Jedi Knight': 10,
      'Jedi Master': 10,
      'Master Privateer': 10,
      'Martial Arts Master': 10,
      'Pathfinder': 10,
      'Sith Apprentice': 10,
      'Sith Lord': 10,
      'Soldier': 10,
      'Vanguard': 10,
      // d8 classes
      'Ace Pilot': 8, // Changed from d6
      'Beast Rider': 8,
      'Charlatan': 8,
      'Corporate Agent': 8,
      'Crime Lord': 8, // Changed from d6
      'Enforcer': 8,
      'Force Adept': 8, // Changed from d6
      'Force Disciple': 8,
      'Gunslinger': 8,
      'Improviser': 8,
      'Infiltrator': 8,
      'Medic': 8,
      'Melee Duelist': 8,
      'Military Engineer': 8,
      'Officer': 8, // Changed from d6
      'Outlaw': 8,
      'Saboteur': 8, // Changed from d6
      'Scout': 8,
      'Shaper': 8,
      // d6 classes
      'Noble': 6,
      'Scoundrel': 6,
      'Slicer': 6
    };

    // Get hit die - first check our mapping by class name, then fall back to class data
    const className = classDoc.name;
    hitDie = classHitDice[className];

    if (!hitDie) {
      // Fallback: parse from class data
      const hitDieString = classDoc.system.hit_die || classDoc.system.hitDie || "1d6";
      hitDie = parseInt(hitDieString.match(/\d+d(\d+)/)?.[1] || "6");
      SWSELogger.warn(`SWSE LevelUp | Class "${className}" not in hit dice map, using ${hitDie} from class data`);
    }
  }
  const conMod = actor.system.abilities.con?.mod || 0;
  const hpGeneration = game.settings.get("swse", "hpGeneration") || "average";
  const maxHPLevels = game.settings.get("swse", "maxHPLevels") || 1;

  let hpGain = 0;

  if (newLevel <= maxHPLevels) {
    hpGain = hitDie + conMod;
  } else {
    switch (hpGeneration) {
      case "maximum":
        hpGain = hitDie + conMod;
        break;
      case "average":
        hpGain = Math.floor(hitDie / 2) + 1 + conMod;
        break;
      case "roll":
        hpGain = Math.floor(Math.random() * hitDie) + 1 + conMod;
        break;
      case "average_minimum":
        const rolled = Math.floor(Math.random() * hitDie) + 1;
        const average = Math.floor(hitDie / 2) + 1;
        hpGain = Math.max(rolled, average) + conMod;
        break;
      default:
        hpGain = Math.floor(hitDie / 2) + 1 + conMod;
    }
  }

  const finalHPGain = Math.max(1, hpGain);
  SWSELogger.log(`SWSE LevelUp | HP gain: ${finalHPGain} (d${hitDie}${isNonheroic ? ' [nonheroic]' : ''}, method: ${hpGeneration})`);

  return finalHPGain;
}
