// scripts/engine/shared/xp-system.js
//
// Pure XP computation utilities — shared across all engine layers.
// No external dependencies. No side effects.
// Used by: ActorEngine, xp-engine, and utilities.

/**
 * XP Level Thresholds — SWSE RAW
 * Maps character level to cumulative XP required.
 * Level 1 requires 0 XP. Level 20 requires 190,000 XP.
 */
export const XP_LEVEL_THRESHOLDS = Object.freeze({
  1: 0,
  2: 1000,
  3: 3000,
  4: 6000,
  5: 10000,
  6: 15000,
  7: 21000,
  8: 28000,
  9: 36000,
  10: 45000,
  11: 55000,
  12: 66000,
  13: 78000,
  14: 91000,
  15: 105000,
  16: 120000,
  17: 136000,
  18: 153000,
  19: 171000,
  20: 190000
});

/**
 * Maximum level supported by the threshold table.
 */
export const XP_MAX_LEVEL = 20;

/**
 * Determine character level from total XP using threshold table.
 * Returns the highest level whose threshold the XP meets or exceeds.
 * Pure function — no side effects.
 *
 * @param {number} totalXP - Total accumulated experience points
 * @returns {number} Level (1–20)
 */
export function determineLevelFromXP(totalXP) {
  const xp = Number(totalXP) || 0;
  let level = 1;
  for (let i = XP_MAX_LEVEL; i >= 1; i--) {
    if (xp >= XP_LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  return level;
}

/**
 * Get base XP value for defeating an enemy of a given Challenge Level.
 * Formula: CL x 200
 * Pure function — no side effects.
 *
 * @param {number} cl - Challenge Level of the enemy
 * @returns {number} Base XP value
 */
export function getXPFromCL(cl) {
  const level = Number(cl);
  if (!Number.isFinite(level) || level < 0) return 0;
  return level * 200;
}
