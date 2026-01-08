/**
 * Starship Maneuver selection for SWSE Level Up system
 * Handles starship maneuver selection with prerequisite validation
 */

import { SWSELogger } from '../../utils/logger.js';
import { warnGM } from '../../utils/warn-gm.js';
import { StarshipManeuverManager } from '../../utils/starship-maneuver-manager.js';

/**
 * Check if actor can learn starship maneuvers
 * @param {Actor} actor - The actor
 * @returns {boolean} True if actor has Starship Tactics feat
 */
export function canLearnStarshipManeuvers(actor) {
  return actor.items.some(i =>
    i.type === 'feat' && (i.name === 'Starship Tactics' || i.name.includes('Starship Tactics'))
  );
}

/**
 * Get count of maneuvers to select
 * @param {Actor} actor - The actor
 * @returns {Number} Number of maneuvers to select
 */
export function getManeuverSelectionCount(actor) {
  // Only grant maneuvers if character has Starship Tactics feat
  const tacticsFeatCount = actor.items.filter(item =>
    item.type === 'feat' &&
    (item.name === 'Starship Tactics' || item.name.includes('Starship Tactics'))
  ).length;

  if (tacticsFeatCount === 0) {
    return 0;
  }

  // Starship Tactics grants 1 + WIS modifier maneuvers per feat
  const wisModifier = Math.floor((actor.system.attributes.wis.value - 10) / 2);
  const maneuverCount = 1 + Math.max(0, wisModifier);

  return maneuverCount * tacticsFeatCount;
}

/**
 * Get available starship maneuvers for selection
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections (feats, class, etc.)
 * @returns {Promise<Array>} Available starship maneuvers with qualification info
 */
export async function getAvailableStarshipManeuvers(actor, pendingData = {}) {
  // Check if character can learn Starship maneuvers
  if (!canLearnStarshipManeuvers(actor)) {
    SWSELogger.log('SWSE LevelUp | Character does not have Starship Tactics feat');
    return [];
  }

  // Get all maneuvers from the static definitions
  const allManeuvers = StarshipManeuverManager._getAllManeuverDefinitions();
  SWSELogger.log(`SWSE LevelUp | Loaded ${allManeuvers.length} starship maneuvers`);

  // Get already learned maneuvers
  const learnedManeuvers = new Set(
    actor.items
      .filter(item => item.type === 'maneuver')
      .map(item => item.name)
  );

  // Filter by prerequisites and existing selections
  const qualifiedManeuvers = [];

  for (const maneuver of allManeuvers) {
    // Skip already learned
    if (learnedManeuvers.has(maneuver.name)) {
      continue;
    }

    // Check prerequisites
    const prereqCheck = await StarshipManeuverManager._checkManeuverPrerequisites(actor, maneuver);
    const isQualified = prereqCheck.valid;
    const reasons = prereqCheck.reasons || [];

    qualifiedManeuvers.push({
      ...maneuver,
      isQualified,
      prerequisiteReasons: reasons
    });
  }

  SWSELogger.log(`SWSE LevelUp | ${qualifiedManeuvers.filter(m => m.isQualified).length} qualified starship maneuvers`);

  return qualifiedManeuvers;
}

/**
 * Select a starship maneuver
 * @param {string} maneuverName - The maneuver name
 * @returns {Promise<Object|null>} The selected maneuver or null
 */
export async function selectStarshipManeuver(maneuverName) {
  const allManeuvers = StarshipManeuverManager._getAllManeuverDefinitions();
  const maneuver = allManeuvers.find(m => m.name === maneuverName);

  if (maneuver) {
    SWSELogger.log(`SWSE LevelUp | Selected starship maneuver: ${maneuver.name}`);
  }

  return maneuver || null;
}
