/**
 * Force power selection for SWSE Level Up system
 * Placeholder for future force power selection functionality
 */

import { SWSELogger } from '../../utils/logger.js';

/**
 * Get available force powers for selection
 * @param {Actor} actor - The actor
 * @returns {Promise<Array>} Available force powers
 */
export async function getAvailableForcePowers(actor) {
  const forcePowerPack = game.packs.get('swse.force-powers');
  if (!forcePowerPack) {
    SWSELogger.warn('SWSE LevelUp | Force powers compendium not found');
    return [];
  }

  const allPowers = await forcePowerPack.getDocuments();
  SWSELogger.log(`SWSE LevelUp | Loaded ${allPowers.length} force powers from compendium`);

  // TODO: Filter by prerequisites and character level
  return allPowers;
}

/**
 * Select a force power
 * @param {string} powerId - The force power ID
 * @returns {Promise<Object|null>} The selected force power or null
 */
export async function selectForcePower(powerId) {
  const forcePowerPack = game.packs.get('swse.force-powers');
  if (!forcePowerPack) return null;

  const power = await forcePowerPack.getDocument(powerId);
  if (power) {
    SWSELogger.log(`SWSE LevelUp | Selected force power: ${power.name}`);
  }

  return power || null;
}
