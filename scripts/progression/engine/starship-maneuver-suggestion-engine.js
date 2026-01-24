/**
 * starship-maneuver-suggestion-engine.js
 * Provides mentor suggestions for Starship Maneuvers
 */

export class StarshipManeuverSuggestionEngine {
  /**
   * Suggest a Starship Maneuver based on character state
   * @param {Actor} actor - The character
   * @param {Array} available - Available maneuvers
   * @param {Set} selected - Already selected maneuver IDs
   * @returns {Promise<Object>} Suggested maneuver
   */
  static async suggestManeuver(actor, available = [], selected = new Set()) {
    try {
      // Try to load the full suggestion engine
      const existingEngine = game.modules?.get('foundryvtt-swse')?.data?.flags?.suggestionEngine;

      if (existingEngine && typeof existingEngine.suggestStarshipManeuver === 'function') {
        return await existingEngine.suggestStarshipManeuver(actor, available, selected);
      }

      // Fallback: Simple suggestion based on piloting skill
      return this._simpleSuggest(actor, available, selected);
    } catch (e) {
      console.warn('StarshipManeuverSuggestionEngine error:', e);
      return this._simpleSuggest(actor, available, selected);
    }
  }

  /**
   * Simple suggestion: suggest first available maneuver not yet selected
   * @private
   */
  static _simpleSuggest(actor, available = [], selected = new Set()) {
    for (const maneuver of available) {
      const id = maneuver.id || maneuver._id || maneuver.name;
      if (!selected.has(id)) {
        return maneuver;
      }
    }
    return available[0] || null;
  }
}
