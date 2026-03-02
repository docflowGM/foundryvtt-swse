/**
 * Force Power selection for SWSE Level Up system
 * Handles Force Sensitivity (from level 1 Jedi) and Force Training feats
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ForcePowerEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-power-engine.js";
import { getClassLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";

/**
 * Determine if character gains force powers on this level up
 * - Jedi at level 1 gets Force Sensitivity (1 power)
 * - Force Training feat grants 1 + WIS/CHA mod (min 1)
 * @param {Actor} actor - The actor
 * @param {Array} selectedFeats - Currently selected feats
 * @returns {boolean} True if character gains force powers
 */
export function getsForcePowers(actor, selectedFeats = []) {
  // Check if character is level 1 Jedi (gets Force Sensitivity)
  const newLevel = actor.system.level + 1;
  if (newLevel === 2) {
    // If this is level 2, they were level 1. Check if they're Jedi
    if (getClassLevel(actor, 'jedi') > 0) {return true;}
  }

  // Check if Force Training is in selected feats
  const hasForceTraining = selectedFeats.some(f =>
    typeof f === 'string' ? f === 'Force Training' : f.name === 'Force Training'
  );
  if (hasForceTraining) {return true;}

  return false;
}

/**
 * Count how many force powers the character gains
 * @param {Actor} actor - The actor
 * @param {Array} selectedFeats - Currently selected feats
 * @returns {number} Number of powers to select
 */
export async function countForcePowersGained(actor, selectedFeats = []) {
  let count = 0;

  // Check for Force Sensitivity (level 1 Jedi)
  const newLevel = actor.system.level + 1;
  if (newLevel === 2) {
    if (getClassLevel(actor, 'jedi') > 0) {count += 1;}
  }

  // Check for Force Training feat
  for (const feat of selectedFeats) {
    const featName = typeof feat === 'string' ? feat : feat.name;
    if (featName === 'Force Training') {
      // Force Training grants 1 + WIS mod (or CHA mod with house rule), minimum 1
      const wisAbility = actor.system.abilities?.wis;
      const chaAbility = actor.system.abilities?.cha;

      // Check for house rule to use CHA instead of WIS
      const useCha = game.settings?.get('foundryvtt-swse', 'forceTrainingUseCha') ?? false;
      const mod = (useCha ? chaAbility?.mod : wisAbility?.mod) ?? 0;

      count += Math.max(1, 1 + mod);
    }
  }

  return count;
}

/**
 * Load available force powers for selection
 * @returns {Promise<Array>} Array of force power objects
 */
export async function loadForcePowers() {
  try {
    return await ForcePowerEngine.collectAvailablePowers();
  } catch (err) {
    SWSELogger.error('SWSE LevelUp | Failed to load force powers:', err);
    return [];
  }
}

/**
 * Get available force powers for selection, filtered by prestige class restrictions
 * @param {Actor} actor - The character
 * @param {Object} options - Options object
 * @returns {Promise<Array>} Array of available force power objects
 */
export async function getAvailableForcePowers(actor, options = {}) {
  try {
    const allPowers = await ForcePowerEngine.collectAvailablePowers();
    if (!allPowers || allPowers.length === 0) {return [];}

    // Check if character has Sith Apprentice or Sith Lord (filters light side powers)
    const hasSithClass =
      getClassLevel(actor, 'sith_apprentice') > 0 ||
      getClassLevel(actor, 'sith_lord') > 0;

    // If Sith prestige class, filter out Light Side powers
    if (hasSithClass) {
      return allPowers.filter(power => {
        const powerDesc = `${power.name || ''} ${power.system?.description || ''} ${power.system?.descriptor || ''}`.toLowerCase();
        return !powerDesc.includes('light side');
      });
    }

    return allPowers;
  } catch (err) {
    SWSELogger.error('SWSE LevelUp | Failed to get available force powers:', err);
    return [];
  }
}

/**
 * Select a force power
 * @param {string} powerId - The power ID/name to select
 * @param {Array} availablePowers - List of available powers
 * @param {Array} selectedPowers - Currently selected powers
 * @returns {Array} Updated selected powers array
 */
export function selectForcePower(powerId, availablePowers, selectedPowers = []) {
  const power = availablePowers.find(p => (p.id || p._id || p.name) === powerId);
  if (!power) {return selectedPowers;}

  const powersWithoutThis = selectedPowers.filter(p => (p.id || p._id || p.name) !== powerId);

  // Toggle on/off
  if (powersWithoutThis.length === selectedPowers.length) {
    // Not found, add it
    return [...powersWithoutThis, power];
  } else {
    // Found, remove it
    return powersWithoutThis;
  }
}

/**
 * Remove Light Side descriptor powers from actor when taking Sith prestige class
 * Called for both Sith Apprentice and Sith Lord
 * @param {Actor} actor - The character
 * @returns {Promise<Array>} Array of removed power IDs
 */
export async function removeLightSidePowersForSith(actor) {
  if (!actor?.items) {return [];}

  const lightSidePowers = actor.items.filter(item => {
    if (item.type !== 'forcepower') {return false;}

    const powerDesc = `${item.name || ''} ${item.system?.description || ''} ${item.system?.descriptor || ''}`.toLowerCase();
    return powerDesc.includes('light side');
  });

  if (lightSidePowers.length === 0) {return [];}

  // Remove the light side powers
  const removedIds = lightSidePowers.map(p => p.id);
  await actor.deleteEmbeddedDocuments('Item', removedIds);

  SWSELogger.log(`SWSE LevelUp | Removed ${removedIds.length} Light Side powers for Sith prestige class:`, lightSidePowers.map(p => p.name));

  return removedIds;
}

/**
 * Backward compatibility export
 * @deprecated Use removeLightSidePowersForSith instead
 */
export const removeLightSidePowersForSithApprentice = removeLightSidePowersForSith;
