// scripts/engine/progression/xp-constants.js

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
 * Get base XP value for defeating an enemy of a given Challenge Level.
 * Formula: CL x 200
 * @param {number} cl - Challenge Level of the enemy
 * @returns {number} Base XP value
 */
export function getXPFromCL(cl) {
  const level = Number(cl);
  if (!Number.isFinite(level) || level < 0) return 0;
  return level * 200;
}
