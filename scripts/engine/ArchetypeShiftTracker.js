/**
 * ArchetypeShiftTracker
 *
 * Tracks archetype changes and triggers acknowledgements when dominant archetype shifts.
 * Applies temporary scoring bonus to new archetype to prevent oscillation.
 */

import { SWSELogger } from '../utils/logger.js';

/**
 * Detect if archetype has shifted from previously stored value
 * @param {Actor} actor - Character actor
 * @param {string} newArchetypeId - New dominant archetype ID
 * @param {number} newConfidence - New confidence score
 * @returns {Promise<Object>} {shifted: boolean, from: string, to: string, acknowledgementKey: string}
 */
export async function detectArchetypeShift(actor, newArchetypeId, newConfidence = 0) {
  if (!actor) {
    return { shifted: false, from: null, to: null, acknowledgementKey: null };
  }

  try {
    const stored = await actor.getFlag('foundryvtt-swse', 'previousArchetype') || {};
    const previousId = stored.id;
    const previousLevel = stored.level;
    const currentLevel = actor.system?.level || 1;

    // Store new archetype info
    await actor.setFlag('foundryvtt-swse', 'previousArchetype', {
      id: newArchetypeId,
      confidence: newConfidence,
      level: currentLevel,
      timestamp: Date.now()
    });

    // Determine if shift occurred
    const shifted = previousId && previousId !== newArchetypeId;

    if (shifted) {
      const acknowledgementKey = _selectAcknowledgement(previousId, newArchetypeId);
      SWSELogger.log(
        `[ArchetypeShiftTracker] Shift detected: ${previousId} → ${newArchetypeId} at level ${currentLevel}`
      );

      return {
        shifted: true,
        from: previousId,
        to: newArchetypeId,
        acknowledgementKey,
        levelChanged: currentLevel !== previousLevel
      };
    }

    return { shifted: false, from: previousId, to: newArchetypeId, acknowledgementKey: null };
  } catch (err) {
    SWSELogger.error('[ArchetypeShiftTracker] Failed to detect shift:', err);
    return { shifted: false, from: null, to: null, acknowledgementKey: null };
  }
}

/**
 * Apply temporary scoring bonus to new archetype for 1 level
 * Prevents oscillation between similar archetypes
 * @param {Object} archetypeScores - { id: score, ... }
 * @param {Actor} actor - Character actor
 * @returns {Object} Modified scores with stability bonus applied
 */
export function applyStabilityBonus(archetypeScores, actor) {
  if (!actor) return archetypeScores;

  try {
    const stored = actor.flags?.swse?.previousArchetype || {};
    const previousId = stored.id;
    const previousLevel = stored.level;
    const currentLevel = actor.system?.level || 1;

    // Apply bonus only if within 1 level of shift
    if (previousId && currentLevel === previousLevel) {
      const modified = { ...archetypeScores };
      if (modified[previousId] !== undefined) {
        modified[previousId] += 2; // +2 stability bonus
      }
      return modified;
    }

    return archetypeScores;
  } catch (err) {
    SWSELogger.warn('[ArchetypeShiftTracker] Failed to apply stability bonus:', err);
    return archetypeScores;
  }
}

/**
 * Select acknowledgement key based on archetype shift
 * @private
 */
function _selectAcknowledgement(fromId, toId) {
  const from = (fromId || '').toLowerCase();
  const to = (toId || '').toLowerCase();

  // Major shifts (force vs non-force, ranged vs melee)
  if ((from.includes('force') && !to.includes('force')) ||
      (!from.includes('force') && to.includes('force'))) {
    return 'major_shift_force';
  }

  if ((from.includes('ranged') && to.includes('melee')) ||
      (from.includes('melee') && to.includes('ranged'))) {
    return 'shift_combat_style';
  }

  if ((from.includes('leader') && !to.includes('leader')) ||
      (!from.includes('leader') && to.includes('leader'))) {
    return 'shift_role';
  }

  // Generic shift
  return 'archetype_shift_generic';
}

/**
 * Get mentor acknowledgement lines for archetype shift
 * @param {string} acknowledgementKey - Key from detectArchetypeShift
 * @param {string} fromId - Previous archetype
 * @param {string} toId - New archetype
 * @returns {Array<string>} Mentor lines
 */
export function getAcknowledgementLines(acknowledgementKey, fromId, toId) {
  const lines = {
    major_shift_force: [
      "Your path is shifting—adapt, but do so with purpose.",
      "A new direction calls. Walk it with intention.",
      "What was once clear now changes. Trust your instincts."
    ],
    shift_combat_style: [
      "Your methods evolve. Master this new approach.",
      "From one way to another—refocus your training.",
      "The blade speaks differently now. Listen."
    ],
    shift_role: [
      "Your burden changes. Carry it well.",
      "The group looks to you differently now.",
      "Your place in the struggle shifts. Accept it."
    ],
    archetype_shift_generic: [
      "Your character defines itself anew.",
      "What you were and what you become—both have value.",
      "Evolution is the path of those who survive."
    ]
  };

  return lines[acknowledgementKey] || lines.archetype_shift_generic;
}
