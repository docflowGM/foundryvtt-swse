/**
 * MENTOR REASON SELECTOR
 *
 * Converts SuggestionEngine semantic signals into mentor reason atoms.
 *
 * RESPONSIBILITY:
 * - Transform reasonSignals (facts) into semantic atoms
 * - Apply mentor personality weighting (future)
 * - Determine intensity based on conviction
 * - Select appropriate reasons.json keys for judgment engine
 * - Deterministic selection (same signals → same atoms)
 *
 * INPUT: reasonSignals from SuggestionEngine
 * OUTPUT: atoms array + intensity level
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { REASON_ATOMS } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-reason-atoms.js';
import { INTENSITY_ATOMS } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-intensity-atoms.js';

export class MentorReasonSelector {
  /**
   * Select mentor reason atoms based on semantic signals
   *
   * @param {Object} reasonSignals - Semantic signals from SuggestionEngine
   * @param {Object} mentorProfile - Mentor personality profile (future use)
   * @returns {Object} { atoms: [...], intensity: 'high', selectedReasons: [...] }
   */
  static select(reasonSignals, mentorProfile = {}) {
    if (!reasonSignals || typeof reasonSignals !== 'object') {
      SWSELogger.warn('[MentorReasonSelector] Invalid reasonSignals');
      return this._emptySelection();
    }

    const atoms = [];
    const selectedReasons = [];

    // ALIGNMENT SIGNALS
    if (reasonSignals.alignment === 'prestige') {
      atoms.push(REASON_ATOMS.CommitmentDeclared);
      atoms.push(REASON_ATOMS.GoalAdvancement);
      selectedReasons.push('prestige_path_consistency');
    } else if (reasonSignals.alignment === 'archetype') {
      atoms.push(REASON_ATOMS.PatternAlignment);
      atoms.push(REASON_ATOMS.CommitmentDeclared);
      selectedReasons.push('feat_supports_existing_role');
    } else if (reasonSignals.alignment === 'mentor') {
      atoms.push(REASON_ATOMS.PatternAlignment);
      selectedReasons.push('pattern_alignment');
    }

    // PRESTIGE SUPPORT
    if (reasonSignals.prestigeSupport) {
      atoms.push(REASON_ATOMS.DependencyChain);
      selectedReasons.push('prestige_prerequisites_met');
    }

    // MECHANICAL SYNERGY
    if (reasonSignals.mechanicalSynergy) {
      atoms.push(REASON_ATOMS.SynergyPresent);
      selectedReasons.push('synergy_present');
    }

    // CHAIN CONTINUATION
    if (reasonSignals.chainContinuation) {
      atoms.push(REASON_ATOMS.RecentChoiceImpact);
      selectedReasons.push('feat_chain_continuation');
    }

    // DEVIATION (negative signal)
    if (reasonSignals.deviation) {
      atoms.push(REASON_ATOMS.PatternConflict);
      atoms.push(REASON_ATOMS.GoalDeviation);
      selectedReasons.push('goal_deviation');
    }

    // MATCHED ATTRIBUTES → ReadinessMet
    if (reasonSignals.matchedAttributes && reasonSignals.matchedAttributes.length > 0) {
      atoms.push(REASON_ATOMS.ReadinessMet);
      selectedReasons.push('attribute_matches_feature_focus');
    }

    // MATCHED SKILLS → SynergyPresent
    if (reasonSignals.matchedSkills && reasonSignals.matchedSkills.length > 0) {
      if (!atoms.includes(REASON_ATOMS.SynergyPresent)) {
        atoms.push(REASON_ATOMS.SynergyPresent);
      }
      selectedReasons.push('skill_prerequisite_met');
    }

    // Deduplicate atoms
    const uniqueAtoms = [...new Set(atoms)];

    // Determine intensity based on conviction and signal strength
    const intensity = this._determineIntensity(reasonSignals, uniqueAtoms);

    return {
      atoms: uniqueAtoms,
      intensity,
      selectedReasons: [...new Set(selectedReasons)]
    };
  }

  /**
   * Determine intensity level based on signals
   *
   * @private
   * @param {Object} reasonSignals - The semantic signals
   * @param {string[]} atoms - Selected atoms (for counting)
   * @returns {string} Intensity level: very_low, low, medium, high, very_high
   */
  static _determineIntensity(reasonSignals, atoms) {
    const signalCount = [
      reasonSignals.prestigeSupport,
      reasonSignals.mechanicalSynergy,
      reasonSignals.chainContinuation,
      reasonSignals.deviation
    ].filter(Boolean).length;

    const conviction = reasonSignals.conviction || 0;

    // Base intensity from signal count
    let baseIntensity;
    if (signalCount >= 3) {
      baseIntensity = 'very_high';
    } else if (signalCount === 2) {
      baseIntensity = 'high';
    } else if (signalCount === 1) {
      baseIntensity = conviction >= 0.7 ? 'high' : 'medium';
    } else {
      baseIntensity = conviction >= 0.5 ? 'medium' : 'low';
    }

    return baseIntensity;
  }

  /**
   * Empty selection (fallback)
   * @private
   */
  static _emptySelection() {
    return {
      atoms: [REASON_ATOMS.ReadinessMet],
      intensity: 'low',
      selectedReasons: []
    };
  }

  /**
   * Validate that selected atoms are all valid
   *
   * @param {string[]} atoms - Array of atom strings
   * @returns {boolean} True if all atoms are valid
   */
  static validateAtoms(atoms) {
    if (!Array.isArray(atoms)) {
      return false;
    }

    const validAtomList = Object.values(REASON_ATOMS);
    return atoms.every(atom => validAtomList.includes(atom));
  }
}
