/**
 * SWSE Force Training Auto-Grants
 * Automatically grants force powers when Force Training feat is taken
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { FeatGrantEntitlementResolver } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js";

/**
 * Auto-grant force powers for Force Training feat
 * Grants 1 + WIS modifier force powers
 * @param {Actor} actor - The actor taking Force Training
 * @param {Object} pending - Pending progression data
 */
export async function autoGrantForceTrainingPowers(actor, pending) {
  const count = FeatGrantEntitlementResolver.getForceTrainingSlotsPerInstance(actor);

  swseLogger.log(
    `Force Training: ${count} force power slot(s) unlocked; power selection is deferred to the Force Power progression step.`
  );

  pending.forcePowerEntitlements ??= [];
  pending.forcePowerEntitlements.push({
    grantType: 'forcePowerSlots',
    sourceType: 'feat',
    sourceName: 'Force Training',
    count,
    countFormula: 'max(1, 1 + configuredForceTrainingAbilityModifier)',
    dynamic: true
  });
}

/**
 * Check if actor is taking Force Training feat
 * @param {Object} pending - Pending progression data
 * @returns {boolean}
 */
export function isTakingForceTraining(pending) {
  if (!pending || !pending.feats) {return false;}

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
