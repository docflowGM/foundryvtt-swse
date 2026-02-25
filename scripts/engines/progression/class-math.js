/**
 * ClassMath - Pure calculation service for class-related metrics
 *
 * This module contains mathematical calculations that derive from class data.
 * It is NOT part of the data registry; it is a pure calculation service.
 *
 * Extracted from progression-data.js to enforce pure-data registry principle.
 */

/**
 * Calculate total Base Attack Bonus from class levels.
 *
 * @param {Array} classLevels - Array of {class, level} objects
 * @returns {Promise<number>} - Total BAB
 */
export async function calculateBAB(classLevels) {
  const { getClassData } = await import('../utils/class-data-loader.js');

  let totalBAB = 0;

  for (const classLevel of classLevels) {
    const classData = await getClassData(classLevel.class);

    if (!classData) {
      console.warn(`BAB calculation: Unknown class "${classLevel.class}", skipping`);
      continue;
    }

    const rawData = classData._raw;
    const levelProgression = rawData?.level_progression || [];
    const levelsInClass = classLevel.level || 1;

    if (levelsInClass > 0 && levelsInClass <= levelProgression.length) {
      const finalLevelData = levelProgression[levelsInClass - 1];
      totalBAB += finalLevelData.bab || 0;
    }
  }

  return totalBAB;
}

/**
 * Calculate the highest save bonus a character gets from their classes.
 *
 * @param {Array} classLevels - Array of {class, level} objects
 * @param {string} saveType - Save type: 'fort', 'ref', or 'will'
 * @returns {Promise<number>} - Highest save bonus
 */
export async function calculateSaveBonus(classLevels, saveType) {
  const { getClassData } = await import('../utils/class-data-loader.js');

  let maxBonus = 0;
  const uniqueClasses = new Set(classLevels.map(cl => cl.class));

  for (const className of uniqueClasses) {
    const classData = await getClassData(className);

    if (!classData) {
      console.warn(`Save calculation: Unknown class "${className}", skipping`);
      continue;
    }

    const saveKey =
      saveType === 'fort' ? 'fortitude' :
      saveType === 'ref' ? 'reflex' :
      'will';

    const classBonus = classData.defenses?.[saveKey] || 0;
    maxBonus = Math.max(maxBonus, classBonus);
  }

  return maxBonus;
}
