/**
 * getJudgmentOverlay
 *
 * Deterministic judgment category overlay selector.
 * Uses emotionalRoutingMatrix to route advisory type → judgment category.
 * Retrieves index 0 of the tier array.
 *
 * No randomness. No fallback tier. No dynamic inference.
 * Throws on any missing structure.
 *
 * Usage:
 *   const overlay = getJudgmentOverlay(mentorData, "conflict", "high");
 *   output = overlay + "\n\n" + advisoryText;
 */

import { emotionalRoutingMatrix } from "/systems/foundryvtt-swse/scripts/dialogue/runtime/emotionalRoutingMatrix.js";

/**
 * @param {Object} mentorData - Loaded mentor JSON data
 * @param {string} advisoryType - Type of advisory (conflict, drift, prestige_planning, etc.)
 * @param {string} tier - Intensity tier: very_low | low | medium | high | very_high
 * @returns {string} Judgment overlay line
 * @throws {Error} If routing, category, tier, or array is missing/empty
 */
export function getJudgmentOverlay(mentorData, advisoryType, tier) {
  if (!mentorData) {
    throw new Error("[getJudgmentOverlay] mentorData missing");
  }

  if (!advisoryType) {
    throw new Error("[getJudgmentOverlay] advisoryType missing");
  }

  if (!tier) {
    throw new Error("[getJudgmentOverlay] tier missing");
  }

  // Lookup routing entry for this advisory type
  const routingEntry = emotionalRoutingMatrix[advisoryType];

  if (!routingEntry) {
    throw new Error(`[getJudgmentOverlay] Unknown advisoryType: ${advisoryType}`);
  }

  // Lookup category for this tier
  const category = routingEntry[tier];

  if (!category) {
    throw new Error(
      `[getJudgmentOverlay] No routing for advisoryType '${advisoryType}', tier '${tier}'`
    );
  }

  // Validate mentor judgments structure
  if (!mentorData.judgments) {
    throw new Error(
      `[getJudgmentOverlay] mentorData.judgments missing for advisoryType '${advisoryType}'`
    );
  }

  const pool = mentorData.judgments[category];

  if (!pool) {
    throw new Error(
      `[getJudgmentOverlay] Judgment category '${category}' missing (routed from '${advisoryType}')`
    );
  }

  const tierPool = pool[tier];

  if (!tierPool || !Array.isArray(tierPool) || tierPool.length === 0) {
    throw new Error(
      `[getJudgmentOverlay] Judgment tier '${tier}' missing or empty for category '${category}'`
    );
  }

  return tierPool[0];
}
