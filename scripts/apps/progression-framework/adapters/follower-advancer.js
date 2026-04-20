/**
 * Follower Level Advancer
 *
 * Handles follower level-by-level advancement from initial level to target level.
 * Reuses FollowerCreator logic and template rules without duplication.
 *
 * Phase 3: Core helper for heroic-level parity progression through the spine.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { getHeroicLevel } from '/systems/foundryvtt-swse/scripts/actors/derived/level-split.js';
import { FollowerCreator } from '../../follower-creator.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';

/**
 * Compute the follower advancement plan (which levels need to be applied)
 * @param {number} currentFollowerLevel - Current level of follower (or 0 if new)
 * @param {number} targetHeroicLevel - Target heroic level (owner's heroic level)
 * @returns {Object} Plan with levelsToApply, isNewFollower, targetLevel
 */
export function computeFollowerAdvancementPlan(currentFollowerLevel, targetHeroicLevel) {
  const targetLevel = Math.max(1, targetHeroicLevel || 1);
  const current = Math.max(0, currentFollowerLevel || 0);

  return {
    isNewFollower: current === 0,
    currentLevel: current,
    targetLevel,
    levelsToApply: Array.from({ length: Math.max(0, targetLevel - current) },
      (_, i) => current + i + 1  // Levels to apply: [current+1, ..., targetLevel]
    ),
    needsAdvancement: targetLevel > current
  };
}

/**
 * Get follower advancement context for projection/finalization
 * @param {ProgressionSession} session - The progression session
 * @param {Actor} ownerActor - The owner actor
 * @param {Actor|null} followerActor - The existing follower (null if new)
 * @returns {Promise<Object>} Context with plan, template, owner level info
 */
export async function getFollowerAdvancementContext(session, ownerActor, followerActor = null) {
  if (!session?.dependencyContext) {
    swseLogger.warn('[FollowerAdvancer] No dependency context in session');
    return null;
  }

  const ownerHeroicLevel = getHeroicLevel(ownerActor) || 1;
  const currentFollowerLevel = followerActor?.system?.level || 0;
  const plan = computeFollowerAdvancementPlan(currentFollowerLevel, ownerHeroicLevel);

  const templates = await FollowerCreator.getFollowerTemplates();
  const templateType = session.dependencyContext.templateType;
  const template = templates[templateType];

  return {
    ownerActor,
    followerActor,
    ownerHeroicLevel,
    template,
    templateType,
    plan,
    grantingTalent: session.dependencyContext.grantingTalent
  };
}

/**
 * Apply follower advancement from current level to target level
 * This is the core of level-by-level parity.
 * @param {Actor} follower - The follower actor
 * @param {Actor} owner - The owner actor
 * @param {string} templateType - Template type (aggressive, defensive, utility)
 * @param {number} targetHeroicLevel - Target heroic level
 * @returns {Promise<void>}
 */
export async function advanceFollowerToLevel(follower, owner, templateType, targetHeroicLevel) {
  const currentLevel = follower.system?.level || 1;
  const targetLevel = Math.max(currentLevel, targetHeroicLevel || 1);

  if (currentLevel >= targetLevel) {
    swseLogger.debug('[FollowerAdvancer] Follower already at or above target level', {
      currentLevel,
      targetLevel
    });
    return;
  }

  swseLogger.log('[FollowerAdvancer] Advancing follower from level', currentLevel, 'to', targetLevel);

  const templates = await FollowerCreator.getFollowerTemplates();
  const template = templates[templateType];

  if (!template) {
    swseLogger.error('[FollowerAdvancer] Invalid template type:', templateType);
    return;
  }

  // For each level from current+1 to target, apply the BAB progression
  // Future: could add selective level-up choices here if needed
  for (let level = currentLevel + 1; level <= targetLevel; level++) {
    const bab = template.babProgression?.[Math.min(level - 1, 19)] ?? 0;

    // Update BAB and level
    await ActorEngine.updateActor(follower, {
      'system.level': level,
      'system.baseAttackBonus': bab
    }, { source: 'FollowerAdvancer.advanceFollowerToLevel' });

    swseLogger.debug('[FollowerAdvancer] Applied level', level, '- BAB now', bab);
  }

  swseLogger.log('[FollowerAdvancer] Follower advancement complete. Now at level', targetLevel);
}

/**
 * Reset follower to initial state (for re-creation scenarios)
 * @param {Actor} follower - The follower actor to reset
 * @returns {Promise<void>}
 */
export async function resetFollowerToInitial(follower) {
  swseLogger.log('[FollowerAdvancer] Resetting follower to initial state');

  // This would be called if a follower needs to be rebuilt from scratch
  // For now, just mark the transaction in logs
  // Actual reset logic deferred to Phase 3+ enhancements
}
