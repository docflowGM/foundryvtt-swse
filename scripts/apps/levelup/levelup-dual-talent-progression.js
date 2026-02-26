/**
 * Dual Talent Progression System for SWSE
 *
 * Players gain talents through TWO separate progressions:
 * 1. Heroic Level Progression: 1 talent at levels 1, 3, 5, 7, 9, 11, 13, 15, 17, 19
 *    - Can pick from ANY talent tree unlocked by their class(es)
 *
 * 2. Class Progression: 1 talent at class levels 1, 3, 5, 7, 9, 11, 13, 15, 17, 19
 *    - Can ONLY pick from that specific class's talent trees
 *    - Applied when leveling up a specific class
 */

import { SWSELogger } from '../../utils/logger.js';
import { getClassLevel, getCharacterClasses } from './levelup-shared.js';
import { ClassesRegistry } from '../../engine/registries/classes-registry.js';
import { getTalentTrees } from '../chargen/chargen-property-accessor.js';
import { AbilityEngine } from '../../engine/abilities/AbilityEngine.js';

/**
 * Calculate available talents at the current heroic level
 * @param {Actor} actor - The character actor
 * @returns {number} Number of talents available at current heroic level (0 or 1)
 */
export function getTalentCountAtHeroicLevel(actor) {
  if (!actor) {return 0;}

  const totalLevel = actor.system?.details?.level || 1;
  const isOddLevel = totalLevel % 2 === 1;

  SWSELogger.log(`[DUAL-TALENTS] getTalentCountAtHeroicLevel: level ${totalLevel}, isOdd: ${isOddLevel}`);

  // Talents only at odd levels: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19
  return isOddLevel ? 1 : 0;
}

/**
 * Calculate available talents from class progression
 * @param {Object} selectedClass - The class item being leveled
 * @param {Actor} actor - The character actor
 * @returns {number} Number of talents from this class at its current level
 */
export function getTalentCountAtClassLevel(selectedClass, actor) {
  if (!selectedClass) {return 0;}

  const classLevel = getClassLevel(actor, selectedClass.name) + 1; // +1 for pending level
  const isOddLevel = classLevel % 2 === 1;

  SWSELogger.log(`[DUAL-TALENTS] getTalentCountAtClassLevel: class "${selectedClass.name}" level ${classLevel}, isOdd: ${isOddLevel}`);

  // Nonheroic classes don't grant talents
  if (selectedClass.system?.isNonheroic) {
    SWSELogger.log(`[DUAL-TALENTS] getTalentCountAtClassLevel: "${selectedClass.name}" is nonheroic, returning 0`);
    return 0;
  }

  // Talents only at odd class levels: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19
  return isOddLevel ? 1 : 0;
}

/**
 * Get total talent grants for this levelup event
 * Combines both heroic level and class level talents
 * @param {Object} selectedClass - The class being leveled
 * @param {Actor} actor - The character actor
 * @returns {Object} { heroic: number, class: number, total: number }
 */
export function getTalentProgressionInfo(selectedClass, actor) {
  const heroicTalent = getTalentCountAtHeroicLevel(actor);
  const classTalent = getTalentCountAtClassLevel(selectedClass, actor);

  const result = {
    heroic: heroicTalent,
    class: classTalent,
    total: heroicTalent + classTalent
  };

  SWSELogger.log(`[DUAL-TALENTS] getTalentProgressionInfo:`, result);
  return result;
}

/**
 * Get available talent trees for heroic-level talents
 * Returns the UNION of:
 * - All talent trees available to the character's classes
 * - Force Talent Trees (if Force Sensitive)
 * Example: If character has Soldier (3 trees) and Scout (2 trees), can access all 5 combined
 * @param {Actor} actor - The character actor
 * @returns {Set<string>} Union of talent trees from classes + Force Talent Trees
 */
export async function getAvailableTalentTreesForHeroicTalent(actor) {
  const allTrees = new Set();
  const characterClasses = getCharacterClasses(actor);

  // Collect all talent trees from all classes the character has levels in
  for (const [className] of Object.entries(characterClasses)) {
    const classData = ClassesRegistry.getByName(className);
    if (classData) {
      const classDoc = await ClassesRegistry._getDocument(classData.id);
      if (classDoc) {
        const trees = getTalentTrees(classDoc);
        if (trees && trees.length > 0) {
          trees.forEach(tree => allTrees.add(tree));
        }
      }
    }
  }

  // Add Force Talent Trees if character is Force Sensitive
  try {
    const accessRules = await AbilityEngine.loadTalentTreeAccessRules();

    if (accessRules) {
      // Get all Force Talent Trees (both generic and tradition-based)
      const forceTrees = accessRules.talentTreeAccess.filter(t =>
        t.accessRules.some(r => r.type === 'force-generic' || r.type === 'force-tradition')
      );

      // Check which ones the character can access
      for (const treeConfig of forceTrees) {
        const canAccess = await AbilityEngine.canAccessTalentTree(actor, treeConfig.treeId);
        if (canAccess) {
          allTrees.add(treeConfig.treeId);
        }
      }
    }
  } catch (error) {
    SWSELogger.warn('[DUAL-TALENTS] Error loading Force Talent Trees:', error);
  }

  SWSELogger.log(`[DUAL-TALENTS] getAvailableTalentTreesForHeroicTalent: found ${allTrees.size} unique trees from all classes + Force trees:`, Array.from(allTrees));

  return allTrees;
}

/**
 * Get available talent trees for class-level talents (ONLY that class's trees)
 * @param {Object} selectedClass - The class being leveled
 * @returns {Array<string>} Talent trees available to this specific class
 */
export function getAvailableTalentTreesForClassTalent(selectedClass) {
  if (!selectedClass) {return [];}

  const trees = getTalentTrees(selectedClass) || [];
  SWSELogger.log(`[DUAL-TALENTS] getAvailableTalentTreesForClassTalent: class "${selectedClass.name}" has ${trees.length} trees:`, trees);

  return trees;
}

/**
 * Calculate how many talents of each type the character should have
 * @param {Actor} actor - The character actor
 * @returns {Object} { heroicTalents: number, classTalents: { [className]: number } }
 */
export function calculateTotalTalentGrants(actor) {
  const characterClasses = getCharacterClasses(actor);

  let heroicTalents = 0;
  const classTalents = {};

  // Count heroic level talents (1 per odd heroic level)
  const totalLevel = actor.system?.details?.level || 1;
  for (let level = 1; level <= totalLevel; level += 2) {
    heroicTalents++;
  }

  // Count class-specific talents (1 per odd class level)
  for (const [className, classLevel] of Object.entries(characterClasses)) {
    classTalents[className] = 0;
    for (let level = 1; level <= classLevel; level += 2) {
      classTalents[className]++;
    }
  }

  SWSELogger.log(`[DUAL-TALENTS] calculateTotalTalentGrants:`, {
    heroicTalents,
    classTalents
  });

  return {
    heroicTalents,
    classTalents
  };
}

/**
 * Count acquired talents by type
 * @param {Actor} actor - The character actor
 * @returns {Object} { heroic: Array<string>, class: { [className]: Array<string> } }
 */
export function countAcquiredTalents(actor) {
  const talents = actor.items.filter(i => i.type === 'talent');

  const heroic = [];
  const byClass = {};

  for (const talent of talents) {
    const source = talent.system?.source;

    if (source === 'Heroic Level') {
      heroic.push(talent.name);
    } else if (source && source.startsWith('Class:')) {
      const className = source.replace('Class:', '').trim();
      if (!byClass[className]) {byClass[className] = [];}
      byClass[className].push(talent.name);
    }
  }

  SWSELogger.log(`[DUAL-TALENTS] countAcquiredTalents:`, { heroic, byClass });

  return { heroic, byClass };
}

/**
 * Get available talents for selection
 * @param {Actor} actor - The character actor
 * @returns {Object} { availableHeroic: number, availableClass: { [className]: number } }
 */
export function getAvailableTalentSelections(actor) {
  const totalGrants = calculateTotalTalentGrants(actor);
  const acquired = countAcquiredTalents(actor);

  const availableHeroic = Math.max(0, totalGrants.heroicTalents - acquired.heroic.length);

  const availableClass = {};
  for (const [className, classGrants] of Object.entries(totalGrants.classTalents)) {
    const classAcquired = (acquired.byClass[className] || []).length;
    availableClass[className] = Math.max(0, classGrants - classAcquired);
  }

  SWSELogger.log(`[DUAL-TALENTS] getAvailableTalentSelections:`, {
    availableHeroic,
    availableClass
  });

  return {
    availableHeroic,
    availableClass
  };
}
