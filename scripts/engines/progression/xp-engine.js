// scripts/engine/progression/xp-engine.js

import { XP_LEVEL_THRESHOLDS, XP_MAX_LEVEL, getXPFromCL } from '../shared/xp-system.js';
import { getTotalLevel } from '../../actors/derived/level-split.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';
import { HouseRuleService } from '../system/HouseRuleService.js';

/* -------------------------------------------------------------------------- */
/*                            HOMEBREW GUARD                                  */
/* -------------------------------------------------------------------------- */

/**
 * Check whether the XP system is enabled via houserule toggle.
 * @returns {boolean}
 */
export function isXPEnabled() {
  try {
    return HouseRuleService.get('enableExperienceSystem') !== false;
  } catch {
    // Setting not yet registered (early boot) — default enabled
    return true;
  }
}

/* -------------------------------------------------------------------------- */
/*                       LEVEL DETERMINATION (SHARED)                         */
/* -------------------------------------------------------------------------- */

// Re-export determineLevelFromXP from shared layer for backward compatibility
export { determineLevelFromXP } from '../shared/xp-system.js';

/* -------------------------------------------------------------------------- */
/*                    ENCOUNTER XP CALCULATION                                */
/* -------------------------------------------------------------------------- */

/**
 * Calculate XP per character from an encounter with one or more enemies.
 *
 * RAW rules applied per-CL:
 *   1. Base XP = CL x 200 for each enemy
 *   2. If individual CL <= averageLevel - 5, that enemy's XP is divided by 10
 *   3. Sum total adjusted XP
 *   4. Multiply by GM multiplier
 *   5. Divide by party size
 *   6. Floor the result
 *
 * @param {object} params
 * @param {number[]} params.challengeLevels - Array of enemy CLs
 * @param {number} params.partySize - Number of heroes in the party
 * @param {number} params.averageLevel - Average party level
 * @param {number} [params.gmMultiplier=1] - GM pacing adjustment
 * @returns {number} XP per character (floored)
 */
export function calculateEncounterXP({
  challengeLevels = [],
  partySize,
  averageLevel,
  gmMultiplier = 1
} = {}) {
  if (!isXPEnabled()) return 0;

  const party = Number(partySize);
  const avgLvl = Number(averageLevel);
  const mult = Number(gmMultiplier) || 1;

  if (!Number.isFinite(party) || party < 1) return 0;
  if (!Number.isFinite(avgLvl) || avgLvl < 1) return 0;

  // Apply reduction per-CL individually, then sum (RAW faithful)
  const totalAdjustedXP = challengeLevels
    .map(cl => {
      const level = Number(cl) || 0;
      let xp = getXPFromCL(level);

      // Low-level threat rule: if this enemy's CL <= avgLevel - 5, award 1/10 XP
      if (level <= avgLvl - 5) {
        xp = Math.floor(xp / 10);
      }

      return xp;
    })
    .reduce((sum, xp) => sum + xp, 0);

  return Math.floor((totalAdjustedXP * mult) / party);
}

/* -------------------------------------------------------------------------- */
/*                          APPLY XP TO ACTOR                                 */
/* -------------------------------------------------------------------------- */

/**
 * Apply XP to an actor. Detects level increase and fires hook.
 * Does NOT auto-apply class levels.
 *
 * @param {Actor} actor - The actor to receive XP
 * @param {number} amount - XP to add (positive integer)
 * @returns {Promise<{newTotal: number, newLevel: number, leveledUp: boolean}|null>}
 */
export async function applyXP(actor, amount) {
  if (!isXPEnabled()) return null;
  if (!actor) return null;

  const xpAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (xpAmount === 0) return null;

  const currentTotal = Number(actor.system?.xp?.total) || 0;
  const currentLevel = determineLevelFromXP(currentTotal);

  const newTotal = currentTotal + xpAmount;
  const newLevel = determineLevelFromXP(newTotal);
  const nextThreshold = XP_LEVEL_THRESHOLDS[newLevel + 1] ?? null;

  // PHASE 3: Route through ActorEngine
  await ActorEngine.updateActor(actor, {
    'system.xp.total': newTotal
  });

  const leveledUp = newLevel > currentLevel;

  if (leveledUp) {
    Hooks.call('swseXPLevelGained', actor, newLevel);
  }

  return { newTotal, newLevel, leveledUp };
}

/* -------------------------------------------------------------------------- */
/*                     DERIVED XP COMPUTATION                                 */
/* -------------------------------------------------------------------------- */

/**
 * Compute derived XP fields for an actor during prepareDerivedData.
 * Pure function — no side effects, no actor mutations.
 *
 * @param {Actor} actor
 * @param {object} system - actor.system reference
 */
export function computeXpDerived(actor, system) {
  if (!isXPEnabled()) {
    system.derived.xp = null;
    return;
  }

  const totalXP = Number(system.xp?.total) || 0;
  const xpLevel = determineLevelFromXP(totalXP);
  const currentThreshold = XP_LEVEL_THRESHOLDS[xpLevel] ?? 0;
  const nextThreshold = XP_LEVEL_THRESHOLDS[xpLevel + 1] ?? null;
  const xpToNext = nextThreshold !== null ? nextThreshold - totalXP : 0;

  // Check for mismatch with progression-engine level
  const progressionLevel = getTotalLevel(actor);
  if (progressionLevel > 0 && xpLevel !== progressionLevel) {
    console.warn(
      `SWSE XP | Level mismatch for "${actor.name}": ` +
      `XP-derived level ${xpLevel} vs progression level ${progressionLevel}`
    );
  }

  system.derived.xp = {
    total: totalXP,
    level: xpLevel,
    currentLevelAt: currentThreshold,
    nextLevelAt: nextThreshold,
    xpToNext,
    progressPercent: nextThreshold !== null
      ? Math.min(100, ((totalXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
      : 100
  };
}
