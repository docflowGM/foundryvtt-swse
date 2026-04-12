/**
 * Force Power selection for SWSE Level Up system
 * Handles Force Sensitivity (from level 1 Jedi) and Force Training feats
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ForcePowerEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-power-engine.js";
import { getClassLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { CAPABILITY_SLUGS } from "/systems/foundryvtt-swse/scripts/constants/capability-slugs.js";

/**
 * Determine if character gains force powers on this level up
 * Uses canonical capability signals: feats actually granted or owned
 * (NOT direct Jedi class membership - Jedi grants Force Sensitivity feat)
 *
 * @param {Actor} actor - The actor
 * @param {Array} selectedFeats - Currently selected feats
 * @returns {boolean} True if character gains force powers
 */
export function getsForcePowers(actor, selectedFeats = []) {
  // Check 1: Character has Force Sensitivity feat (granted at level 1 for Jedi, or selected)
  // This is the ACTUAL capability source, not class membership
  const hasForceSensitivity = actor.items?.some(i =>
    i.type === 'feat' && i.name?.toLowerCase().includes('force sensitivity')
  ) || selectedFeats.some(f => {
    const name = typeof f === 'string' ? f : f.name;
    return name?.toLowerCase().includes('force sensitivity');
  });

  if (hasForceSensitivity) {return true;}

  // Check 2: Character is selecting Force Training feat
  const hasForceTraining = selectedFeats.some(f => {
    const slug = typeof f === 'string' ? f : f.system?.slug || f.name?.toLowerCase().replace(/\s+/g, '-');
    return slug === CAPABILITY_SLUGS.FORCE_TRAINING ||
           (typeof f === 'string' ? f === 'Force Training' : f.name === 'Force Training');
  });

  if (hasForceTraining) {return true;}

  return false;
}

/**
 * Count how many force powers the character gains
 * Uses canonical capability signals: feats actually granted or owned
 *
 * @param {Actor} actor - The actor
 * @param {Array} selectedFeats - Currently selected feats
 * @returns {number} Number of powers to select
 */
export async function countForcePowersGained(actor, selectedFeats = []) {
  let count = 0;

  // Check 1: Force Sensitivity feat (if being acquired this level)
  // The actor may already have it, but we count if they're gaining it NOW
  const gainsForceSensitivity = selectedFeats.some(f => {
    const name = typeof f === 'string' ? f : f.name;
    return name?.toLowerCase().includes('force sensitivity');
  });

  if (gainsForceSensitivity) {
    count += 1;
  }

  // Check 2: Force Training feat (each grants 1 + WIS/CHA mod, minimum 1)
  for (const feat of selectedFeats) {
    const featName = typeof feat === 'string' ? feat : feat.name;
    const featSlug = typeof feat === 'string' ? feat : (feat.system?.slug || featName?.toLowerCase().replace(/\s+/g, '-'));
    if (featSlug === CAPABILITY_SLUGS.FORCE_TRAINING || featName === 'Force Training') {
      // Force Training grants 1 + WIS/CHA mod (based on game setting), minimum 1
      const forceAbility = game.settings?.get('foundryvtt-swse', 'forceTrainingAttribute') || 'wisdom';
      const mod = forceAbility === 'charisma'
        ? (actor.system.abilities?.cha?.mod ?? 0)
        : (actor.system.abilities?.wis?.mod ?? 0);

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

  // Remove the light side powers via ActorEngine (SOVEREIGNTY)
  const removedIds = lightSidePowers.map(p => p.id);
  const ActorEngineModule = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
  await ActorEngineModule.ActorEngine.deleteEmbeddedDocuments(actor, 'Item', removedIds);

  SWSELogger.log(`SWSE LevelUp | Removed ${removedIds.length} Light Side powers for Sith prestige class:`, lightSidePowers.map(p => p.name));

  return removedIds;
}

/**
 * Backward compatibility export
 * @deprecated Use removeLightSidePowersForSith instead
 */
export const removeLightSidePowersForSithApprentice = removeLightSidePowersForSith;
