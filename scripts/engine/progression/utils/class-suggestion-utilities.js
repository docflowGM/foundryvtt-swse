/**
 * Class Suggestion Utilities
 * Pure engine-layer utilities for class calculations
 *
 * These utilities support ClassSuggestionEngine and other engine layers.
 * No dependencies on apps/ or chargen/ layer.
 */

/**
 * List of base classes in SWSE
 */
export const BASE_CLASSES = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier'];

/**
 * Convert BAB progression string to numeric multiplier
 * @param {string|number} progression - "slow", "medium", "fast" or a number
 * @returns {number} - Per-level BAB multiplier
 */
function convertBabProgression(progression) {
  if (typeof progression === 'number') {
    return progression;
  }

  const progressionMap = {
    'slow': 0.5,
    'medium': 0.75,
    'fast': 1.0
  };

  return progressionMap[progression] || 0.75; // default to medium
}

/**
 * Navigate nested object properties safely
 * @param {Object} obj - Object to navigate
 * @param {string} path - Dot-separated path (e.g., "system.levelProgression")
 * @param {*} defaultValue - Default if not found
 * @returns {*} Value or defaultValue
 */
function getNestedProperty(obj, path, defaultValue = null) {
  if (!obj || typeof path !== 'string') {
    return defaultValue;
  }

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return defaultValue;
    }
  }

  return current;
}

/**
 * Calculate total BAB from all class items
 * Engine-layer version: accesses class item properties directly without chargen utilities
 *
 * @param {Actor} actor - The actor
 * @returns {number} Total BAB
 */
export function calculateTotalBAB(actor) {
  const classItems = actor.items.filter(i => i.type === 'class');
  let totalBAB = 0;

  for (const classItem of classItems) {
    const classLevel = classItem.system.level || 1;
    const className = classItem.name;

    // Check if class has level_progression data with BAB
    const levelProgression = getNestedProperty(classItem, 'system.levelProgression', []);
    if (Array.isArray(levelProgression) && levelProgression.length > 0) {
      const levelData = levelProgression.find(lp => lp.level === classLevel);
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
