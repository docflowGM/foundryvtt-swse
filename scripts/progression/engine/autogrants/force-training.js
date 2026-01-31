/**
 * SWSE Force Training Auto-Grants
 * Automatically grants force powers when Force Training feat is taken
 */

import { swseLogger } from '../../../utils/logger.js';

/**
 * Auto-grant force powers for Force Training feat
 * Grants 1 + WIS modifier force powers
 * @param {Actor} actor - The actor taking Force Training
 * @param {Object} pending - Pending progression data
 */
export async function autoGrantForceTrainingPowers(actor, pending) {
  const wisMod = actor.system.attributes?.wis?.mod ?? 0;
  const count = Math.max(1, 1 + wisMod);

  swseLogger.log(`Force Training: Granting ${count} force powers (1 + WIS mod ${wisMod})`);

  // Get available force powers from registry
  const available = game.swse?.forceRegistry?._powers;
  if (!available || !Array.isArray(available)) {
    swseLogger.warn('Force Training: Force power registry not available');
    return;
  }

  const chosen = [];

  // Select first N available powers
  for (let i = 0; i < count && i < available.length; i++) {
    const next = available[i];
    if (!next) break;
    chosen.push(next.name);
  }

  // Store in pending data for UI selection
  if (!pending.forcePowers) {
    pending.forcePowers = [];
  }

  // Merge with any existing pending force powers
  for (const power of chosen) {
    if (!pending.forcePowers.includes(power)) {
      pending.forcePowers.push(power);
    }
  }

  swseLogger.log(`Force Training: Auto-selected ${chosen.length} powers: ${chosen.join(', ')}`);
}

/**
 * Check if actor is taking Force Training feat
 * @param {Object} pending - Pending progression data
 * @returns {boolean}
 */
export function isTakingForceTraining(pending) {
  if (!pending || !pending.feats) return false;

  return pending.feats.some(f =>
    typeof f === 'string' && f.toLowerCase().includes('force training')
  );
}

/**
 * FIXED: Bug #5 - Check if actor is force-sensitive (required for Force Training feat)
 * @param {Actor} actor - The actor
 * @param {Object} pending - Pending progression data
 * @returns {Object} { allowed: boolean, reason: string }
 */
export function canTakeForceTraining(actor, pending) {
  const progression = actor.system.progression || {};
  const classLevels = progression.classLevels || [];

  // Check if any class taken is force-sensitive
  const hasForceSensitiveClass = classLevels.some(cl => {
    const className = cl.class;
    // Jedi and Jedi Knight are force-sensitive by default
    return className === 'Jedi' || className === 'Jedi Knight';
  });

  // Check if has Force Sensitivity feat
  const hasForceFeats = [
    ...(progression.startingFeats || []),
    ...(progression.feats || [])
  ];
  const hasForceSensitivityFeat = hasForceFeats.some(f =>
    typeof f === 'string' && f.toLowerCase().includes('force sensitivity')
  );

  if (!hasForceSensitiveClass && !hasForceSensitivityFeat) {
    return {
      allowed: false,
      reason: 'Force Training feat requires Force Sensitivity or a Force-Sensitive class (Jedi, Jedi Knight)'
    };
  }

  return { allowed: true, reason: 'Force-sensitive character may take Force Training' };
}
