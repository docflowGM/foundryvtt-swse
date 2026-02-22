/**
 * Shared Scoring Utilities
 *
 * Common functions used across all suggestion engines:
 * - Damage band normalization
 * - Score clamping and NaN protection
 * - Category normalization helpers
 * - Peer grouping (O(n) via Map)
 */

import { getTierFromScore, getTierKeyFromScore } from './suggestion-tiers-canonical.js';

/**
 * Clamp and validate numeric score
 * @param {number} score - Raw score
 * @param {number} min - Minimum (default 0)
 * @param {number} max - Maximum (default 100)
 * @returns {number} Validated score in range [min, max]
 */
export function clampScore(score, min = 0, max = 100) {
  if (!Number.isFinite(score)) return min;
  return Math.max(min, Math.min(max, score));
}

/**
 * Normalize 0-1 scale to 0-100 scale
 * @param {number} normalizedScore - Score in range [0, 1]
 * @returns {number} Score in range [0, 100]
 */
export function scaleNormalizedTo100(normalizedScore) {
  const valid = clampScore(normalizedScore, 0, 1);
  return valid * 100;
}

/**
 * Normalize 0-100 scale to 0-1 scale
 * @param {number} score - Score in range [0, 100]
 * @returns {number} Score in range [0, 1]
 */
export function scale100ToNormalized(score) {
  const valid = clampScore(score, 0, 100);
  return valid / 100;
}

/**
 * Assign tier based on final score
 * @param {number} finalScore - Score 0-100
 * @returns {string} Tier label (canonical)
 */
export function assignTier(finalScore) {
  return getTierFromScore(finalScore);
}

/**
 * Get tier key (PERFECT, EXCELLENT, etc)
 * @param {number} finalScore - Score 0-100
 * @returns {string} Tier key
 */
export function getTierKey(finalScore) {
  return getTierKeyFromScore(finalScore);
}

/**
 * Build peer group index (O(n) instead of O(n²))
 * Groups items by category/type
 * @param {Array} items - Items to group
 * @param {Function} groupKeyFn - Function to extract grouping key from item
 * @returns {Map} Map of group key -> array of items
 */
export function buildPeerGroupIndex(items, groupKeyFn) {
  const peerIndex = new Map();

  items.forEach(item => {
    const key = groupKeyFn(item);
    if (!peerIndex.has(key)) {
      peerIndex.set(key, []);
    }
    peerIndex.get(key).push(item);
  });

  return peerIndex;
}

/**
 * Get peer group for an item (O(1) lookup)
 * @param {Object} item - The item
 * @param {Map} peerIndex - Pre-built peer index
 * @param {Function} groupKeyFn - Function to extract grouping key
 * @returns {Array} Peer group (including item itself)
 */
export function getPeerGroup(item, peerIndex, groupKeyFn) {
  const key = groupKeyFn(item);
  return peerIndex.get(key) || [item];
}

/**
 * Compute category-relative adjustment
 * Suppress overpriced/inferior items within category
 * @param {Object} item - The item being scored
 * @param {Array} peerGroup - Items in same category
 * @param {Function} scoreFn - Function to extract score from item (for debugging)
 * @returns {Object} { adjustment: number, reason: string }
 */
export function computeCategoryAdjustment(item, peerGroup, scoreFn = null) {
  if (peerGroup.length <= 1) {
    return { adjustment: 0, reason: 'solo-in-category' };
  }

  // Find best and worst in peer group
  let bestScore = -Infinity;
  let worstScore = Infinity;

  peerGroup.forEach(peer => {
    const score = scoreFn ? scoreFn(peer) : (peer._categoryScore || 50);
    bestScore = Math.max(bestScore, score);
    worstScore = Math.min(worstScore, score);
  });

  const range = bestScore - worstScore;

  if (range < 5) {
    return { adjustment: 0, reason: 'homogeneous-category' };
  }

  // Suppress the bottom quartile
  const quartileThreshold = worstScore + range * 0.25;
  const itemScore = scoreFn ? scoreFn(item) : (item._categoryScore || 50);

  if (itemScore <= quartileThreshold) {
    return { adjustment: -6, reason: 'inferior-in-category' };
  }

  // Slightly boost clearly superior items
  if (itemScore >= bestScore - range * 0.1) {
    return { adjustment: 2, reason: 'superior-in-category' };
  }

  return { adjustment: 0, reason: 'normal-in-category' };
}

/**
 * Extract damage bands from item
 * Standard damage notation: "2d6+5" or "1d8" etc
 * @param {Object} item - Item with damage data
 * @returns {Array} Damage dice bands [{ dice: "2d6", bonus: 5 }, ...]
 */
export function extractDamageBands(item) {
  const bands = [];

  // Check for primary damage
  if (item.system?.damage?.primary) {
    const primary = item.system.damage.primary;
    if (primary.dice) {
      bands.push({
        type: 'primary',
        dice: primary.dice,
        bonus: primary.bonus || 0,
        average: computeDiceAverage(primary.dice, primary.bonus || 0)
      });
    }
  }

  // Check for secondary damage
  if (item.system?.damage?.secondary) {
    const secondary = item.system.damage.secondary;
    if (secondary.dice) {
      bands.push({
        type: 'secondary',
        dice: secondary.dice,
        bonus: secondary.bonus || 0,
        average: computeDiceAverage(secondary.dice, secondary.bonus || 0)
      });
    }
  }

  return bands;
}

/**
 * Compute average damage from dice notation
 * Supports: "2d6+5", "1d8", "3d12", etc
 * @param {string} diceNotation - Dice string like "2d6"
 * @param {number} bonus - Flat bonus
 * @returns {number} Average damage
 */
export function computeDiceAverage(diceNotation, bonus = 0) {
  if (!diceNotation) return bonus;

  const match = diceNotation.match(/^(\d+)d(\d+)$/);
  if (!match) return bonus;

  const [, numDice, diceSize] = match.map(Number);
  const avgPerDie = (diceSize + 1) / 2;
  return numDice * avgPerDie + bonus;
}

/**
 * Normalize damage score to 0-100 scale
 * Calibrated for SWSE weapon damage ranges
 * @param {number} averageDamage - Average damage from computeDiceAverage
 * @returns {number} Normalized score 0-100
 */
export function normalizeDamageScore(averageDamage) {
  // SWSE typical damage ranges:
  // Low:  1-5 damage
  // Mid:  6-12 damage
  // High: 13-20 damage
  // Extreme: 20+
  const normalized = Math.min(1.0, averageDamage / 20);
  return scaleNormalizedTo100(normalized);
}

/**
 * Compute weighted axis combination
 * Both axes normalized 0-100
 * @param {number} axisA - Axis A score (0-100)
 * @param {number} axisB - Axis B score (0-100)
 * @param {number} weightA - Weight for A (0-1)
 * @param {number} weightB - Weight for B (0-1, auto-computed if not given)
 * @returns {number} Combined score 0-100
 */
export function computeWeightedCombined(axisA, axisB, weightA = 0.5, weightB = null) {
  const validA = clampScore(axisA, 0, 100);
  const validB = clampScore(axisB, 0, 100);
  const wA = Math.max(0, Math.min(1, weightA));
  const wB = weightB !== null ? Math.max(0, Math.min(1, weightB)) : 1 - wA;

  return (validA * wA) + (validB * wB);
}

export default {
  clampScore,
  scaleNormalizedTo100,
  scale100ToNormalized,
  assignTier,
  getTierKey,
  buildPeerGroupIndex,
  getPeerGroup,
  computeCategoryAdjustment,
  extractDamageBands,
  computeDiceAverage,
  normalizeDamageScore,
  computeWeightedCombined
};
