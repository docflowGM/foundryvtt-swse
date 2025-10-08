// ============================================
// FILE: rolls/utils.js
// ============================================
export function getAbilityMod(score) {
  if (score === null || score === undefined) return 0;
  return Math.floor((score - 10) / 2);
}

export function halfLevel(level) {
  return Math.floor((level || 1) / 2);
}

export function fullLevel(level) {
  return level || 1;
}