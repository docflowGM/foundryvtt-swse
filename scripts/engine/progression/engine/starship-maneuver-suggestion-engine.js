/**
 * starship-maneuver-suggestion-engine.js
 * Provides mentor suggestions for Starship Maneuvers
 * Suggests based on Piloting skill, maneuver complexity, and combat role
 */

import {
  FORCE_IDENTIFIERS,
  MANEUVER_NAMES,
  MANEUVER_SCORING,
  MANEUVER_SKILL_THRESHOLDS
} from "/systems/foundryvtt-swse/scripts/engine/progression/engine/suggestion-constants.js';

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
    const hasForceTraining = actor.items?.some(i => i.name === FORCE_IDENTIFIERS.USE_THE_FORCE || i.system?.tags?.includes(FORCE_IDENTIFIERS.FORCE_TRAINED_TAG));

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
      if (pilotingSkill >= difficulty * MANEUVER_SCORING.SKILL_THRESHOLD_MULTIPLIER) {
        score += MANEUVER_SCORING.SKILL_AFFINITY_BOOST;
      }

      // Formation maneuvers for higher-level pilots
      if (name.includes(MANEUVER_NAMES.FORMATION) && pilotingSkill >= MANEUVER_SKILL_THRESHOLDS.HIGH_PILOTING_MIN) {
        score += MANEUVER_SCORING.FORMATION_BOOST;
      }

      // Force maneuvers only if Force trained
      if (name === MANEUVER_NAMES.TARGET_SENSE && !hasForceTraining) {
        score += MANEUVER_SCORING.TARGET_SENSE_PENALTY; // Heavily discourage if not qualified
      }

      // Evasive action is always useful for low-level pilots
      if (name === MANEUVER_NAMES.EVASIVE_ACTION && pilotingSkill < MANEUVER_SKILL_THRESHOLDS.LOW_PILOTING_MAX) {
        score += MANEUVER_SCORING.EVASIVE_BOOST;
      }

      // Encourage defensive maneuvers based on WIS
      if (name.includes(MANEUVER_NAMES.DEFLECTOR) && wisdomMod > 0) {
        score += wisdomMod * MANEUVER_SCORING.DEFLECTOR_BOOST_PER_WIS;
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
