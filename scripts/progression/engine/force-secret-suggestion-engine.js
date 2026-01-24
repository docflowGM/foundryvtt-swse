/**
 * force-secret-suggestion-engine.js
 * Provides mentor suggestions for Force Secrets
 */

export class ForceSecretSuggestionEngine {
  /**
   * Suggest a Force Secret based on character state
   * @param {Actor} actor - The character
   * @param {Array} available - Available secrets
   * @param {Set} selected - Already selected secret IDs
   * @returns {Promise<Object>} Suggested secret
   */
  static async suggestSecret(actor, available = [], selected = new Set()) {
    try {
      // Try to load the full suggestion engine
      const existingEngine = game.modules?.get('foundryvtt-swse')?.data?.flags?.suggestionEngine;

      if (existingEngine && typeof existingEngine.suggestForceSecret === 'function') {
        return await existingEngine.suggestForceSecret(actor, available, selected);
      }

      // Fallback: Simple suggestion based on archetype
      return this._simpleSuggest(actor, available, selected);
    } catch (e) {
      console.warn('ForceSecretSuggestionEngine error:', e);
      return this._simpleSuggest(actor, available, selected);
    }
  }

  /**
   * Simple suggestion: suggest first available secret not yet selected
   * @private
   */
  static _simpleSuggest(actor, available = [], selected = new Set()) {
    for (const secret of available) {
      const id = secret.id || secret._id || secret.name;
      if (!selected.has(id)) {
        return secret;
      }
    }
    return available[0] || null;
  }
}
