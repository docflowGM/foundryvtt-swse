/**
 * SynergyEvaluator
 *
 * Scores how well a feat/talent synergizes with the actor's build.
 * Checks for feat chains, talent synergy, and class alignment.
 * Keeps ConfidenceCalculator from bloating.
 *
 * Phase 1B: Stubs only. Phase 1C: Implement scoring logic.
 */

import { SWSELogger } from '../utils/logger.js';

export class SynergyEvaluator {

  /**
   * Score how well a feat/talent synergizes with actor's build
   * @param {Object} suggestion - { itemId, itemName, category }
   * @param {Actor} actor
   * @returns {number} 0-1 synergy score
   */
  static evaluateSynergy(suggestion, actor) {
    // TODO: Phase 1C - Check feat/talent chains, class alignment, etc
    // Aggregate all synergy checks, return combined score
    return 0.5;
  }

  /**
   * Check if suggestion builds on existing feat/talent
   * @param {Object} suggestion
   * @param {Actor} actor
   * @returns {Object|null} { baseItem, chainScore: 0-1 } or null
   */
  static findChainBase(suggestion, actor) {
    // TODO: Phase 1C - Detect prerequisite-based chains
    // Look for prerequisites that actor has
    return null;
  }

  /**
   * Check if suggestion synergizes with talents
   * @param {Object} suggestion
   * @param {Actor} actor
   * @returns {Object} { synergizes: boolean, talentNames: [], score: 0-1 }
   */
  static checkTalentSynergy(suggestion, actor) {
    // TODO: Phase 1C - Check if suggestion works with trained talents
    return {
      synergizes: false,
      talentNames: [],
      score: 0
    };
  }

  /**
   * Check class-specific synergy
   * @param {Object} suggestion
   * @param {Actor} actor
   * @returns {number} 0-1 class synergy score
   */
  static evaluateClassSynergy(suggestion, actor) {
    // TODO: Phase 1C - Check if prestige class signals match
    return 0.5;
  }

  /**
   * Get all synergies for a suggestion
   * @param {Object} suggestion
   * @param {Actor} actor
   * @returns {Array} Array of { type, target, score }
   */
  static getAllSynergies(suggestion, actor) {
    // TODO: Phase 1C - Aggregate all synergy checks
    return [];
  }
}
