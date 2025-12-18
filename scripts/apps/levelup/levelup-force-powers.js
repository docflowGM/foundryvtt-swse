/**
 * Force power selection for SWSE Level Up system
 * Handles force power selection with prerequisite validation
 */

import { SWSELogger } from '../../utils/logger.js';
import { warnGM } from '../../utils/warn-gm.js';
import { PrerequisiteValidator } from '../../utils/prerequisite-validator.js';

/**
 * Check if actor can learn force powers
 * @param {Actor} actor - The actor
 * @returns {boolean} True if actor is Force-sensitive
 */
export function canLearnForcePowers(actor) {
  // Check if character has Force Sensitivity feat
  const hasForceSensitivityFeat = actor.items.some(i =>
    i.type === 'feat' && i.name.toLowerCase().includes('force sensitivity')
  );

  // Check if character has a Force-using class
  const hasForceClass = actor.items.some(i =>
    i.type === 'class' && i.system?.forceSensitive === true
  );

  return hasForceSensitivityFeat || hasForceClass;
}

/**
 * Get available force powers for selection
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections (feats, class, etc.)
 * @returns {Promise<Array>} Available force powers with qualification info
 */
export async function getAvailableForcePowers(actor, pendingData = {}) {
  const forcePowerPack = game.packs.get('foundryvtt-foundryvtt-swse.forcepowers');
  if (!forcePowerPack) {
    SWSELogger.warn('SWSE LevelUp | Force powers compendium not found');
    return [];
  }

  // Check if character can learn Force powers
  if (!canLearnForcePowers(actor)) {
    SWSELogger.log('SWSE LevelUp | Character is not Force-sensitive');
    return [];
  }

  const allPowers = await forcePowerPack.getDocuments();
  SWSELogger.log(`SWSE LevelUp | Loaded ${allPowers.length} force powers from compendium`);

  // -----------------------------------------------------------
  // VALIDATE FORCE POWER DATA STRUCTURE
  // -----------------------------------------------------------

  // Load all trees if your system stores them
  const treePack = game.packs.get('foundryvtt-foundryvtt-swse.forcepowertrees');
  const treeNames = treePack ? treePack.index.map(t => t.name) : [];

  for (const power of allPowers) {

      // 1 — Missing powerLevel
      if (!power.system?.powerLevel) {
          warnGM(
              `Force Power "${power.name}" is missing a "powerLevel" property.`
          );
      }

      // 2 — Unknown Force power tree
      if (power.system?.tree && !treeNames.includes(power.system.tree)) {
          warnGM(
              `Force Power "${power.name}" references missing Force Power tree "${power.system.tree}".`
          );
      }

      // 3 — Missing prerequisite power
      if (power.system?.prerequisitePower) {
          const prereq = power.system.prerequisitePower;
          const exists = allPowers.some(p => p.name === prereq);

          if (!exists) {
              warnGM(
                  `Force Power "${power.name}" requires missing prerequisite power "${prereq}".`
              );
          }
      }
  }

  // Filter by prerequisites and character level
  const characterLevel = actor.system.level || 1;
  const qualifiedPowers = [];

  for (const power of allPowers) {
    const powerLevel = power.system?.powerLevel || 1;

    // Check force power level requirement (must have 5 levels in Force-using class per power level)
    const requiredLevels = powerLevel * 5;
    const forceLevels = actor.items
      .filter(i => i.type === 'class' && i.system?.forceSensitive === true)
      .reduce((sum, cls) => sum + (cls.system?.level || 0), 0);

    const meetsLevelRequirement = forceLevels >= requiredLevels;

    // Check other prerequisites using PrerequisiteValidator
    const prereqCheck = PrerequisiteValidator.checkFeatPrerequisites(power, actor, pendingData);

    const isQualified = meetsLevelRequirement && prereqCheck.valid;
    const reasons = [];

    if (!meetsLevelRequirement) {
      reasons.push(`Requires ${requiredLevels} levels in a Force-using class (you have ${forceLevels})`);
    }
    if (!prereqCheck.valid) {
      reasons.push(...prereqCheck.reasons);
    }

    qualifiedPowers.push({
      ...power,
      isQualified,
      prerequisiteReasons: reasons,
      powerLevel,
      requiredLevels
    });
  }

  SWSELogger.log(`SWSE LevelUp | ${qualifiedPowers.filter(p => p.isQualified).length} qualified force powers`);

  return qualifiedPowers;
}

/**
 * Select a force power
 * @param {string} powerId - The force power ID
 * @returns {Promise<Object|null>} The selected force power or null
 */
export async function selectForcePower(powerId) {
  const forcePowerPack = game.packs.get('foundryvtt-foundryvtt-swse.forcepowers');
  if (!forcePowerPack) return null;

  const power = await forcePowerPack.getDocument(powerId);
  if (power) {
    SWSELogger.log(`SWSE LevelUp | Selected force power: ${power.name}`);
  }

  return power || null;
}
