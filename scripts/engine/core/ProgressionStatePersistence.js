/* ============================================================================
   PROGRESSION STATE PERSISTENCE
   Ensures progression steps don't reset, selections persist, navigation is stable
   Stores state in actor flags (survives renders, reloads, everything)
   ============================================================================ */

import { UpdatePipeline } from './UpdatePipeline.js';
import { SWSELogger } from '../../utils/logger.js';

export class ProgressionStatePersistence {
  static SCOPE = 'swse';
  static FLAG_KEY = 'progression';

  /**
   * Get current progression state from actor
   * @param {Actor} actor - The character actor
   * @returns {Object} - Current progression state
   */
  static getState(actor) {
    if (!actor) return null;

    const state = UpdatePipeline.getFlag(actor, this.SCOPE, this.FLAG_KEY);

    if (!state) {
      // Initialize default state if none exists
      return {
        currentStep: null,
        completedSteps: [],
        selections: {},
        startedAt: Date.now(),
        version: 1
      };
    }

    return state;
  }

  /**
   * Set current step without clearing selections
   * @param {Actor} actor - The character actor
   * @param {string} stepId - The step ID to move to
   * @returns {Promise<Object>} - Updated state
   */
  static async setCurrentStep(actor, stepId) {
    if (!actor) {
      throw new Error('[ProgressionStatePersistence] Actor required');
    }

    const state = this.getState(actor);
    state.currentStep = stepId;

    return this._persist(actor, state);
  }

  /**
   * Mark step as completed without clearing selections
   * @param {Actor} actor - The character actor
   * @param {string} stepId - The step ID to mark complete
   * @returns {Promise<Object>} - Updated state
   */
  static async markStepComplete(actor, stepId) {
    if (!actor) {
      throw new Error('[ProgressionStatePersistence] Actor required');
    }

    const state = this.getState(actor);

    if (!state.completedSteps.includes(stepId)) {
      state.completedSteps.push(stepId);
    }

    return this._persist(actor, state);
  }

  /**
   * Save a selection within current step
   * @param {Actor} actor - The character actor
   * @param {string} fieldKey - The field being selected (e.g., "species", "class")
   * @param {*} value - The selected value
   * @returns {Promise<Object>} - Updated state
   */
  static async saveSelection(actor, fieldKey, value) {
    if (!actor) {
      throw new Error('[ProgressionStatePersistence] Actor required');
    }

    const state = this.getState(actor);

    if (!state.selections) {
      state.selections = {};
    }

    state.selections[fieldKey] = {
      value,
      selectedAt: Date.now()
    };

    return this._persist(actor, state);
  }

  /**
   * Get a saved selection
   * @param {Actor} actor - The character actor
   * @param {string} fieldKey - The field to get
   * @returns {*} - The selected value or null
   */
  static getSelection(actor, fieldKey) {
    if (!actor) return null;

    const state = this.getState(actor);
    const selection = state.selections?.[fieldKey];

    return selection?.value ?? null;
  }

  /**
   * Get all selections at once
   * @param {Actor} actor - The character actor
   * @returns {Object} - Map of fieldKey: value
   */
  static getAllSelections(actor) {
    if (!actor) return {};

    const state = this.getState(actor);
    const result = {};

    for (const [key, data] of Object.entries(state.selections || {})) {
      result[key] = data.value;
    }

    return result;
  }

  /**
   * Clear all selections (fresh start)
   * @param {Actor} actor - The character actor
   * @returns {Promise<Object>} - Updated state
   */
  static async clearSelections(actor) {
    if (!actor) {
      throw new Error('[ProgressionStatePersistence] Actor required');
    }

    const state = this.getState(actor);
    state.selections = {};
    state.completedSteps = [];
    state.currentStep = null;

    return this._persist(actor, state);
  }

  /**
   * Restore state from a previous save point
   * Useful for "restart progression" feature
   * @param {Actor} actor - The character actor
   * @param {string} toStep - Step to go back to
   * @returns {Promise<Object>} - Updated state
   */
  static async rewindToStep(actor, toStep) {
    if (!actor) {
      throw new Error('[ProgressionStatePersistence] Actor required');
    }

    const state = this.getState(actor);

    // Remove selections made after this step
    const newSelections = {};
    for (const [key, data] of Object.entries(state.selections || {})) {
      newSelections[key] = data;
    }

    state.selections = newSelections;
    state.completedSteps = state.completedSteps.filter(s => s !== toStep);
    state.currentStep = toStep;

    return this._persist(actor, state);
  }

  /**
   * Check if a step has been completed
   * @param {Actor} actor - The character actor
   * @param {string} stepId - Step to check
   * @returns {boolean}
   */
  static isStepComplete(actor, stepId) {
    if (!actor) return false;

    const state = this.getState(actor);
    return state.completedSteps?.includes(stepId) ?? false;
  }

  /**
   * Get current step
   * @param {Actor} actor - The character actor
   * @returns {string|null}
   */
  static getCurrentStep(actor) {
    if (!actor) return null;

    const state = this.getState(actor);
    return state.currentStep ?? null;
  }

  /**
   * Get all completed steps
   * @param {Actor} actor - The character actor
   * @returns {string[]}
   */
  static getCompletedSteps(actor) {
    if (!actor) return [];

    const state = this.getState(actor);
    return state.completedSteps ?? [];
  }

  /**
   * Persist state to actor flag
   * @private
   * @param {Actor} actor - The character actor
   * @param {Object} state - The state object
   * @returns {Promise<Object>} - The persisted state
   */
  static async _persist(actor, state) {
    try {
      await UpdatePipeline.setFlag(actor, this.SCOPE, this.FLAG_KEY, state);
      SWSELogger.debug('[ProgressionStatePersistence] State persisted', state);
      return state;
    } catch (err) {
      SWSELogger.error('[ProgressionStatePersistence] Failed to persist state:', err);
      throw err;
    }
  }
}
