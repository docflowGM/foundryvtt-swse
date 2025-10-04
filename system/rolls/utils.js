/**
 * Get ability modifier
 */
export function getAbilityMod(score) {
  if (score === null || score === undefined) return 0;
  return Math.floor((score - 10) / 2);
}

/**
 * Get half-level bonus
 */
export function halfLevel(level) {
  return Math.floor(level / 2);
}

/**
 * Get full-level bonus
 */
export function fullLevel(level) {
  return level;
}
