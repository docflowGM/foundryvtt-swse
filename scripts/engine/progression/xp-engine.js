// scripts/engine/progression/xp-engine.js

import {
  XP_LEVEL_THRESHOLDS,
  getXPFromCL,
  determineLevelFromXP   // 🔥 ADD THIS
} from "/systems/foundryvtt-swse/scripts/engine/shared/xp-system.js";

import { getTotalLevel } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";

/* -------------------------------------------------------------------------- */
/*                            HOMEBREW GUARD                                  */
/* -------------------------------------------------------------------------- */

export function isXPEnabled() {
  try {
    return HouseRuleService.get('enableExperienceSystem') !== false;
  } catch {
    return true;
  }
}

/* -------------------------------------------------------------------------- */
/*                       LEVEL DETERMINATION (SHARED)                         */
/* -------------------------------------------------------------------------- */

// Backward compatibility re-export
export { determineLevelFromXP };

/* -------------------------------------------------------------------------- */
/*                    ENCOUNTER XP CALCULATION                                */
/* -------------------------------------------------------------------------- */

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

  const totalAdjustedXP = challengeLevels
    .map(cl => {
      const level = Number(cl) || 0;
      let xp = getXPFromCL(level);

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

export async function applyXP(actor, amount) {

  if (!isXPEnabled()) return null;
  if (!actor) return null;

  const xpAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (xpAmount === 0) return null;

  const currentTotal = Number(actor.system?.xp?.total) || 0;
  const currentLevel = determineLevelFromXP(currentTotal);

  const newTotal = currentTotal + xpAmount;
  const newLevel = determineLevelFromXP(newTotal);

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
      ? Math.min(
          100,
          ((totalXP - currentThreshold) /
          (nextThreshold - currentThreshold)) * 100
        )
      : 100
  };
}