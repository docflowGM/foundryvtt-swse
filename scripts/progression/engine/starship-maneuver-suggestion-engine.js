/**
 * starship-maneuver-suggestion-engine.js
 * Provides mentor suggestions for Starship Maneuvers
 * Suggests based on Piloting skill, maneuver complexity, and combat role
 */

export class StarshipManeuverSuggestionEngine {
  static MANEUVER_DIFFICULTY = {
    'Evasive Action': 1,
    'Snap Roll': 2,
    'Tallon Roll': 3,
    'Segnor\'s Loop': 3,
    'Darklighter Spin': 4,
    'Skywalker Loop': 4,
    'Corellian Slip': 3,
    'Target Lock': 1,
    'Skim the Surface': 2,
    'Howlrunner Formation': 3,
    'Strike Formation': 3,
    'Attack Formation Zeta Nine': 4,
    'Afterburn': 2,
    'I Have You Now': 3,
    'Intercept': 2,
    'Counter': 3,
    'Devastating Hit': 3,
    'Engine Hit': 3,
    'Shield Hit': 3,
    'Explosive Shot': 3,
    'Thruster Hit': 3,
    'Wotan Weave': 4,
    'Ackbar Slash': 4,
    'Angle Deflector Shields': 2,
    'Overwhelming Assault': 3,
    'Target Sense': 2 // Requires Force training
  };

  /**
   * Suggest a Starship Maneuver based on character state
   * @param {Actor} actor - The character
   * @param {Array} available - Available maneuvers
   * @param {Set} selected - Already selected maneuver IDs
   * @returns {Promise<Object>} Suggested maneuver
   */
  static async suggestManeuver(actor, available = [], selected = new Set()) {
    try {
      // Try to load external suggestion engine first
      const existingEngine = game.modules?.get('foundryvtt-swse')?.data?.flags?.suggestionEngine;
      if (existingEngine && typeof existingEngine.suggestStarshipManeuver === 'function') {
        return await existingEngine.suggestStarshipManeuver(actor, available, selected);
      }

      // Use intelligent suggestion based on character abilities
      return this._intelligentSuggest(actor, available, selected);
    } catch (e) {
      console.warn('StarshipManeuverSuggestionEngine error:', e);
      return this._simpleSuggest(actor, available, selected);
    }
  }

  /**
   * Intelligent suggestion based on pilot skill and synergies
   * @private
   */
  static _intelligentSuggest(actor, available = [], selected = new Set()) {
    if (!available.length) {return null;}

    // Get pilot's Piloting skill bonus
    const pilotingSkill = actor.system?.skills?.piloting?.bonus || 0;
    const wisdomMod = actor.system?.abilities?.wis?.mod || 0;
    const hasForceTraining = actor.items?.some(i => i.name === 'Use the Force' || i.system?.tags?.includes('force_trained'));

    // Score each available maneuver
    const scored = available.map(maneuver => {
      const id = maneuver.id || maneuver._id || maneuver.name;
      if (selected.has(id)) {return null;}

      let score = 0;
      const name = maneuver.name || '';
      const difficulty = this.MANEUVER_DIFFICULTY[name] || 2;

      // Base score: easier maneuvers are preferred early
      score += (5 - difficulty);

      // Skill affinity: pilots with high Piloting bonus can handle harder maneuvers
      if (pilotingSkill >= difficulty * 2) {
        score += 3;
      }

      // Formation maneuvers for higher-level pilots
      if (name.includes('Formation') && pilotingSkill >= 4) {
        score += 2;
      }

      // Force maneuvers only if Force trained
      if (name === 'Target Sense' && !hasForceTraining) {
        score -= 10; // Heavily discourage if not qualified
      }

      // Evasive action is always useful for low-level pilots
      if (name === 'Evasive Action' && pilotingSkill < 3) {
        score += 3;
      }

      // Encourage defensive maneuvers based on WIS
      if (name.includes('Deflector') && wisdomMod > 0) {
        score += wisdomMod;
      }

      return { maneuver, score };
    }).filter(x => x);

    // Return highest scored maneuver
    if (scored.length === 0) {return this._simpleSuggest(actor, available, selected);}

    scored.sort((a, b) => b.score - a.score);
    return scored[0].maneuver;
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
