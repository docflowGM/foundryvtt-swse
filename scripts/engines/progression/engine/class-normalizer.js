/**
 * Backward-compat ClassNormalizer (thin wrapper).
 *
 * Authoritative class schema normalization lives in:
 *   scripts/progression/utils/class-normalizer.js (normalizeClassData)
 *
 * Rule: only ONE file should "think" about class normalization.
 */
import { normalizeClassData } from '../../utils/class-normalizer.js';

export const ClassNormalizer = {
  /**
   * Normalize a class document for downstream consumers.
   * @param {object} classDoc Foundry Item/Document-ish object
   * @returns {object} normalized clone
   */
  normalizeClassDoc(classDoc) {
    return normalizeClassData(classDoc);
  }
};
