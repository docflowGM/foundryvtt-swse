/**
 * OpportunityCostAnalyzer
 *
 * Identifies hidden costs of choices (prestige delay, locked trees, stat conflicts).
 * Enables regret-prevention warnings without blocking suggestions.
 *
 * Phase 1B: Stubs only. Phase 1C: Implement cost detection.
 */

import { SWSELogger } from '../utils/logger.js';

export class OpportunityCostAnalyzer {

  /**
   * Compute opportunity cost of a suggestion
   * @param {Object} suggestion
   * @param {Actor} actor
   * @param {Object} pendingData - Pending selections
   * @returns {Object} { hasCost: boolean, cost: 0-1, reasons: [strings] }
   */
  static computeCost(suggestion, actor, pendingData) {
    // TODO: Phase 1C - Check for prestige locks, tree locks, stat issues
    return {
      hasCost: false,
      cost: 0,
      reasons: []
    };
  }

  /**
   * Check if suggestion delays prestige class entry
   * @param {Object} suggestion
   * @param {Actor} actor
   * @returns {Object} { delaysPrestige: boolean, prestigeName: string, delayLevels: number }
   */
  static checkPrestigeLock(suggestion, actor) {
    // TODO: Phase 1C - Analyze if taking this delays prestige prereqs
    return {
      delaysPrestige: false,
      prestigeName: null,
      delayLevels: 0
    };
  }

  /**
   * Check if suggestion causes stat conflicts
   * @param {Object} suggestion
   * @param {Actor} actor
   * @returns {Object} { hasConflict: boolean, conflicts: [{ stat, reason }] }
   */
  static checkStatConflict(suggestion, actor) {
    // TODO: Phase 1C - Check for MAD issues, scaling conflicts
    return {
      hasConflict: false,
      conflicts: []
    };
  }

  /**
   * Check if suggestion locks out alternative paths
   * @param {Object} suggestion
   * @param {Actor} actor
   * @returns {Object} { locksOut: [alternatives], severity: 0-1 }
   */
  static checkPathLockout(suggestion, actor) {
    // TODO: Phase 1C - Check for talent tree exclusivity, etc
    return {
      locksOut: [],
      severity: 0
    };
  }

  /**
   * Get human-readable cost warnings
   * @param {Object} costAnalysis - From computeCost()
   * @returns {Array} Array of warning messages
   */
  static getWarningMessages(costAnalysis) {
    // TODO: Phase 1C - Convert cost analysis to UI messages
    if (!costAnalysis?.reasons) return [];
    return costAnalysis.reasons;
  }
}
