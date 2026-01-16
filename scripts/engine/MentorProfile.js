/**
 * MentorProfile (BiasProfile)
 *
 * Encapsulates mentor questionnaire results and intent biasing.
 * Stores bias weights for each dimension (combatStyle, forceFocus, melee, etc).
 * Enables mentor re-ask and profile evolution.
 *
 * Phase 1B: Stubs only. Phase 1C: Implement storage + retrieval.
 */

import { SWSELogger } from '../utils/logger.js';

export class MentorProfile {

  /**
   * Get bias weight for a specific dimension
   * @param {Actor} actor
   * @param {string} dimension - "combatStyle", "forceFocus", "melee", etc
   * @returns {number} 0-1 bias weight
   */
  static getBias(actor, dimension) {
    // TODO: Phase 1C - Retrieve from actor.system.suggestionEngine.mentorProfile.biases
    if (!actor.system.suggestionEngine?.mentorProfile?.biases) return 0;
    return actor.system.suggestionEngine.mentorProfile.biases[dimension] || 0;
  }

  /**
   * Get all mentor biases as object
   * @param {Actor} actor
   * @returns {Object} { forceFocus: 0.3, melee: 0.2, ... }
   */
  static getAllBiases(actor) {
    // TODO: Phase 1C - Return entire bias profile
    if (!actor.system.suggestionEngine?.mentorProfile?.biases) return {};
    return actor.system.suggestionEngine.mentorProfile.biases;
  }

  /**
   * Update a single bias dimension
   * @param {Actor} actor
   * @param {string} dimension
   * @param {number} weight - 0-1
   * @returns {Promise<void>}
   */
  static async setBias(actor, dimension, weight) {
    // TODO: Phase 1C - Update and save
    if (!actor.system.suggestionEngine?.mentorProfile) return;
    actor.system.suggestionEngine.mentorProfile.biases[dimension] = weight;
    SWSELogger.log(`[MentorProfile] Bias updated: ${dimension} = ${weight}`);
  }

  /**
   * Check if mentor profile has been completed
   * @param {Actor} actor
   * @returns {boolean}
   */
  static isComplete(actor) {
    // TODO: Phase 1C - Check completedAt timestamp
    return !!actor.system.suggestionEngine?.mentorProfile?.completedAt;
  }

  /**
   * Initialize mentor profile from survey answers
   * @param {Actor} actor
   * @param {Object} surveyAnswers - { question: biases }
   * @returns {Promise<void>}
   */
  static async initializeFromSurvey(actor, surveyAnswers) {
    // TODO: Phase 1C - Aggregate survey biases into profile
    if (!actor.system.suggestionEngine) {
      actor.system.suggestionEngine = {};
    }
    actor.system.suggestionEngine.mentorProfile = {
      completedAt: Date.now(),
      biases: surveyAnswers || {}
    };
    SWSELogger.log('[MentorProfile] Initialized from survey');
  }
}
