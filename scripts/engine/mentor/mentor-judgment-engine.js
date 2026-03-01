/**
 * MENTOR JUDGMENT ENGINE
 *
 * Converts semantic atoms into mentor-voiced explanations.
 *
 * INPUT: atoms (semantic decision factors), mentor name, intensity level
 * OUTPUT: Natural language explanation reflecting mentor personality
 *
 * Design:
 * - Takes atoms from MentorReasonSelector
 * - Maps atoms to mentor-specific phrases
 * - Combines phrases into coherent explanation
 * - Applies intensity scaling
 * - Handles fallback gracefully
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { getMentorAtomPhrase, MENTOR_ATOM_PHRASES } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-atom-phrases.js';

export class MentorJudgmentEngine {
  /**
   * Build a mentor-voiced explanation from semantic atoms
   *
   * @param {string[]} atoms - Array of atom keys (e.g., ['CommitmentDeclared', 'GoalAdvancement'])
   * @param {string} mentorName - Mentor name (e.g., 'Miraj', 'Lead')
   * @param {string} context - Decision context (feat_selection, talent_selection, etc.)
   * @param {string} intensity - Intensity level (very_high, high, medium, low, very_low)
   * @returns {string} Natural language explanation
   */
  static buildExplanation(atoms, mentorName, context = 'feat_selection', intensity = 'medium') {
    if (!Array.isArray(atoms) || atoms.length === 0) {
      return this._getGenericExplanation(mentorName, intensity);
    }

    try {
      // Get phrases for each atom
      const phrases = atoms
        .map(atom => this._getAtomPhrase(atom, mentorName, intensity))
        .filter(phrase => phrase !== null && phrase !== undefined);

      if (phrases.length === 0) {
        return this._getGenericExplanation(mentorName, intensity);
      }

      // Combine phrases into explanation
      return this._combinePhrasesIntoExplanation(phrases, intensity);
    } catch (err) {
      SWSELogger.warn('[MentorJudgmentEngine] buildExplanation failed:', err);
      return this._getGenericExplanation(mentorName, intensity);
    }
  }

  /**
   * Get a phrase for a specific atom
   * @private
   */
  static _getAtomPhrase(atom, mentorName, intensity) {
    try {
      const phrase = getMentorAtomPhrase(atom, mentorName, intensity);
      return phrase;
    } catch (err) {
      SWSELogger.warn(`[MentorJudgmentEngine] Failed to get phrase for atom ${atom}:`, err);
      return null;
    }
  }

  /**
   * Combine multiple phrases into a coherent explanation
   * @private
   */
  static _combinePhrasesIntoExplanation(phrases, intensity) {
    if (phrases.length === 0) {
      return "This is a sound choice.";
    }

    if (phrases.length === 1) {
      return this._capitalize(phrases[0]);
    }

    if (phrases.length === 2) {
      return this._capitalize(phrases[0]) + ' ' + phrases[1];
    }

    // 3+ phrases: combine with sentence structure
    const firstPhrase = this._capitalize(phrases[0]);
    const lastPhrase = phrases[phrases.length - 1];
    const middlePhrases = phrases.slice(1, -1);

    if (middlePhrases.length === 0) {
      return `${firstPhrase} ${lastPhrase}`;
    }

    const combined = [firstPhrase]
      .concat(middlePhrases)
      .concat([lastPhrase])
      .join(' ');

    return combined;
  }

  /**
   * Capitalize first letter
   * @private
   */
  static _capitalize(str) {
    if (!str) {return '';}
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get a generic fallback explanation
   * @private
   */
  static _getGenericExplanation(mentorName, intensity) {
    const explanations = {
      'Miraj': {
        very_high: "This choice resonates with the Force itself.",
        high: "The Force guides you toward this choice.",
        medium: "Consider this path with care.",
        low: "This is a viable choice.",
        very_low: "This is an option worth considering."
      },
      'Lead': {
        very_high: "This is the right tactical call.",
        high: "This is a solid choice.",
        medium: "This works for your mission.",
        low: "You can make this work.",
        very_low: "This is an option."
      },
      'default': {
        very_high: "This is an excellent choice.",
        high: "This is a good choice.",
        medium: "This is a sound choice.",
        low: "This is a viable option.",
        very_low: "This is a possible selection."
      }
    };

    const mentorExplanations = explanations[mentorName] || explanations['default'];
    return mentorExplanations[intensity] || mentorExplanations['medium'];
  }

  /**
   * Validate that atoms are recognized
   *
   * @param {string[]} atoms - Array of atom keys
   * @returns {Object} { valid: boolean, invalid: string[] }
   */
  static validateAtoms(atoms) {
    const validAtoms = new Set();

    // Collect all valid atoms from any mentor
    for (const mentorName in MENTOR_ATOM_PHRASES) {
      const mentorPhrases = MENTOR_ATOM_PHRASES[mentorName];
      for (const atom in mentorPhrases) {
        validAtoms.add(atom);
      }
    }

    const invalid = atoms.filter(atom => !validAtoms.has(atom));
    return {
      valid: invalid.length === 0,
      invalid
    };
  }

  /**
   * Get all available atoms
   *
   * @returns {string[]} Array of atom names
   */
  static getAllAtoms() {
    const atoms = new Set();
    const defaultPhrases = MENTOR_ATOM_PHRASES['default'] || {};

    for (const atom in defaultPhrases) {
      atoms.add(atom);
    }

    return Array.from(atoms).sort();
  }

  /**
   * Get all available mentors
   *
   * @returns {string[]} Array of mentor names
   */
  static getAllMentors() {
    return Object.keys(MENTOR_ATOM_PHRASES)
      .filter(name => name !== 'default')
      .sort();
  }

  /**
   * Build explanation using a specific strategy
   * Useful for testing different combination approaches
   *
   * @param {string[]} atoms - Array of atoms
   * @param {string} mentorName - Mentor name
   * @param {string} intensity - Intensity level
   * @param {string} strategy - Combination strategy ('simple', 'detailed', 'minimal')
   * @returns {string} Explanation using specified strategy
   */
  static buildExplanationWithStrategy(atoms, mentorName, intensity, strategy = 'simple') {
    if (!Array.isArray(atoms) || atoms.length === 0) {
      return this._getGenericExplanation(mentorName, intensity);
    }

    const phrases = atoms
      .map(atom => this._getAtomPhrase(atom, mentorName, intensity))
      .filter(phrase => phrase !== null);

    if (phrases.length === 0) {
      return this._getGenericExplanation(mentorName, intensity);
    }

    switch (strategy) {
      case 'minimal':
        return this._capitalize(phrases[0]);

      case 'detailed':
        return this._combinePhrasesIntoExplanation(phrases, intensity) + ' Your choices shape your destiny.';

      case 'simple':
      default:
        return this._combinePhrasesIntoExplanation(phrases, intensity);
    }
  }
}
