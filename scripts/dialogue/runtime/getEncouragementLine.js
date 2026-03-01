/**
 * getEncouragementLine
 *
 * Deterministic encouragement selector.
 * Retrieves index 0 of the tier array from mentorData.judgments.encouragement.
 *
 * No randomness. No fallback tier. Throws on any missing structure.
 */

/**
 * @param {Object} mentorData - Loaded mentor JSON data
 * @param {string} tier - Intensity tier: very_low | low | medium | high | very_high
 * @returns {string} Encouragement line
 * @throws {Error} If pool, tier, or array is missing/empty
 */
export function getEncouragementLine(mentorData, tier) {
  if (!mentorData) {
    throw new Error("[getEncouragementLine] mentorData missing");
  }

  if (!mentorData.judgments) {
    throw new Error("[getEncouragementLine] mentorData.judgments missing");
  }

  const pool = mentorData.judgments.encouragement;

  if (!pool) {
    throw new Error("[getEncouragementLine] Encouragement pool missing");
  }

  const tierPool = pool[tier];

  if (!tierPool || !Array.isArray(tierPool) || tierPool.length === 0) {
    throw new Error(`[getEncouragementLine] Encouragement tier missing or empty: ${tier}`);
  }

  return tierPool[0];
}
