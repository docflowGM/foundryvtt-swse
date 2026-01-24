/**
 * force-technique-suggestion-engine.js
 * Provides mentor suggestions for Force Techniques
 */

export class ForceTechniqueSuggestionEngine {
  /**
   * Suggest a Force Technique based on character state
   * @param {Actor} actor - The character
   * @param {Array} available - Available techniques
   * @param {Set} selected - Already selected technique IDs
   * @returns {Promise<Object>} Suggested technique
   */
  static async suggestTechnique(actor, available = [], selected = new Set()) {
    try {
      // Try to load the full suggestion engine
      const existingEngine = game.modules?.get('foundryvtt-swse')?.data?.flags?.suggestionEngine;

      if (existingEngine && typeof existingEngine.suggestForceTechnique === 'function') {
        return await existingEngine.suggestForceTechnique(actor, available, selected);
      }

      // Fallback: Simple suggestion based on known Force Powers
      return this._simpleSuggest(actor, available, selected);
    } catch (e) {
      console.warn('ForceTechniqueSuggestionEngine error:', e);
      return this._simpleSuggest(actor, available, selected);
    }
  }

  /**
   * Simple suggestion: suggest first available technique not yet selected
   * @private
   */
  static _simpleSuggest(actor, available = [], selected = new Set()) {
    for (const technique of available) {
      const id = technique.id || technique._id || technique.name;
      if (!selected.has(id)) {
        return technique;
      }
    }
    return available[0] || null;
  }
}
