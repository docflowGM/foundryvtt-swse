/**
 * Canonical Suggestion Tier System
 *
 * SINGLE SOURCE OF TRUTH for tier definitions.
 * All suggestion engines must use this.
 * Score range: 0-100 (universal).
 */

export const SUGGESTION_TIERS = {
  PERFECT: { min: 90, max: 100, label: 'Perfect', order: 6 },
  EXCELLENT: { min: 80, max: 89, label: 'Excellent', order: 5 },
  GOOD: { min: 70, max: 79, label: 'Good', order: 4 },
  VIABLE: { min: 55, max: 69, label: 'Viable', order: 3 },
  MARGINAL: { min: 35, max: 54, label: 'Marginal', order: 2 },
  POOR: { min: 0, max: 34, label: 'Poor', order: 1 }
};

/**
 * Get tier label from numeric score
 * @param {number} score - Score 0-100
 * @returns {string} Tier label
 */
export function getTierFromScore(score) {
  if (!Number.isFinite(score)) return SUGGESTION_TIERS.POOR.label;

  const normalized = Math.max(0, Math.min(100, score));

  if (normalized >= SUGGESTION_TIERS.PERFECT.min) return SUGGESTION_TIERS.PERFECT.label;
  if (normalized >= SUGGESTION_TIERS.EXCELLENT.min) return SUGGESTION_TIERS.EXCELLENT.label;
  if (normalized >= SUGGESTION_TIERS.GOOD.min) return SUGGESTION_TIERS.GOOD.label;
  if (normalized >= SUGGESTION_TIERS.VIABLE.min) return SUGGESTION_TIERS.VIABLE.label;
  if (normalized >= SUGGESTION_TIERS.MARGINAL.min) return SUGGESTION_TIERS.MARGINAL.label;
  return SUGGESTION_TIERS.POOR.label;
}

/**
 * Get tier key from score
 * @param {number} score - Score 0-100
 * @returns {string} Tier key (PERFECT, EXCELLENT, etc)
 */
export function getTierKeyFromScore(score) {
  if (!Number.isFinite(score)) return 'POOR';

  const normalized = Math.max(0, Math.min(100, score));

  if (normalized >= SUGGESTION_TIERS.PERFECT.min) return 'PERFECT';
  if (normalized >= SUGGESTION_TIERS.EXCELLENT.min) return 'EXCELLENT';
  if (normalized >= SUGGESTION_TIERS.GOOD.min) return 'GOOD';
  if (normalized >= SUGGESTION_TIERS.VIABLE.min) return 'VIABLE';
  if (normalized >= SUGGESTION_TIERS.MARGINAL.min) return 'MARGINAL';
  return 'POOR';
}

export default SUGGESTION_TIERS;
