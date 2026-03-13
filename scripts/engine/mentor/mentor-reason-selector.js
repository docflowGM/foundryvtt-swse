/**
 * MENTOR REASON SELECTOR
 *
 * PHASE 2 REFACTOR: SuggestionV2 Integration
 *
 * Converts structured ReasonSignal[] from SuggestionV2 into mentor reason atoms.
 *
 * RESPONSIBILITY:
 * - Accept ReasonSignal[] (weighted, typed signals)
 * - Map ReasonType → REASON_ATOMS deterministically
 * - Sort signals by weight (top reasons first)
 * - Select top 3–4 signals
 * - Deduplicate atoms
 * - Compute intensity from signal weight + scoring confidence
 * - Return atoms + intensity for MentorJudgmentEngine
 *
 * INPUT: signals (ReasonSignal[]) from SuggestionV2.signals
 * OUTPUT: { atoms: REASON_ATOMS[], intensity: 'high' | 'medium' | 'low' }
 *
 * BACKWARDS COMPATIBILITY:
 * - Old select(reasonSignals, mentorProfile) still supported (deprecated)
 * - New selectFromSuggestionV2(signals, scoring) is primary
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { REASON_ATOMS } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-reason-atoms.js";
import { INTENSITY_ATOMS } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-intensity-atoms.js";
import {
  mapReasonTypeToAtoms,
  validateReasonTypeMapping
} from "/systems/foundryvtt-swse/scripts/engine/mentor/ReasonTypeToReasonAtomsMapping.js";

export class MentorReasonSelector {
  /**
   * Select mentor atoms from SuggestionV2 signals (PRIMARY)
   *
   * @param {Array<ReasonSignal>} signals - Weighted signals from SuggestionV2.signals
   * @param {Object} scoring - Scoring breakdown { final, confidence }
   * @param {Object} options - Optional: { topN: 3, mentorProfile: {} }
   * @returns {Object} { atoms: REASON_ATOMS[], intensity: 'high'|'medium'|'low' }
   */
  static selectFromSuggestionV2(signals, scoring = {}, options = {}) {
    const { topN = 3, mentorProfile = {} } = options;

    // Validate inputs
    if (!Array.isArray(signals) || signals.length === 0) {
      SWSELogger.debug('[MentorReasonSelector] No signals; returning fallback');
      return this._emptySelection();
    }

    try {
      // Step 1: Sort signals by weight descending
      const sorted = [...signals].sort((a, b) => b.weight - a.weight);

      // Step 2: Select top N signals
      const topSignals = sorted.slice(0, topN);

      // Step 3: Map each ReasonType → REASON_ATOMS + deduplicate
      const atoms = new Set();
      for (const signal of topSignals) {
        const mapped = mapReasonTypeToAtoms(signal.type);
        if (mapped && mapped.length > 0) {
          mapped.forEach(atom => atoms.add(atom));
        } else {
          SWSELogger.warn(`[MentorReasonSelector] Unmapped ReasonType: ${signal.type}`);
        }
      }

      const uniqueAtoms = Array.from(atoms);

      // Step 4: Compute intensity from top signal weight + scoring confidence
      const topWeight = topSignals[0]?.weight || 0;
      const confidence = scoring.confidence || 0.5;
      const intensity = this._computeIntensity(topWeight, confidence);

      SWSELogger.debug('[MentorReasonSelector] Atoms selected:', {
        topSignals: topSignals.length,
        atoms: uniqueAtoms.length,
        intensity,
        topWeight
      });

      return {
        atoms: uniqueAtoms,
        intensity
      };
    } catch (err) {
      SWSELogger.error('[MentorReasonSelector] Error selecting atoms:', err);
      return this._emptySelection();
    }
  }

  /**
   * Legacy support: Select mentor atoms from old reasonSignals format
   *
   * @deprecated Use selectFromSuggestionV2() instead
   * @param {Object} reasonSignals - Old format { alignment, prestigeSupport, ... }
   * @param {Object} mentorProfile - Mentor personality profile (future)
   * @returns {Object} { atoms: REASON_ATOMS[], intensity: 'high', selectedReasons: [...] }
   */
  static select(reasonSignals, mentorProfile = {}) {
    SWSELogger.warn('[MentorReasonSelector] Using deprecated select(); migrate to selectFromSuggestionV2()');

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
    const intensity = this._determineIntensityLegacy(reasonSignals, uniqueAtoms);

    return {
      atoms: uniqueAtoms,
      intensity,
      selectedReasons: [...new Set(selectedReasons)]
    };
  }

  /**
   * Compute intensity from weighted signal + confidence
   *
   * @private
   * @param {number} topWeight - Weight of strongest signal (0–1)
   * @param {number} confidence - Scoring confidence (0–1)
   * @returns {string} Intensity: 'high' | 'medium' | 'low'
   */
  static _computeIntensity(topWeight, confidence) {
    // Combined strength: weight (60%) + confidence (40%)
    const strength = (topWeight * 0.6) + (confidence * 0.4);

    if (strength > 0.65) {
      return 'high';
    } else if (strength > 0.35) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Determine intensity level based on old reasonSignals (legacy)
   *
   * @deprecated Use _computeIntensity() instead
   * @private
   * @param {Object} reasonSignals - The semantic signals
   * @param {string[]} atoms - Selected atoms (for counting)
   * @returns {string} Intensity level: very_low, low, medium, high, very_high
   */
  static _determineIntensityLegacy(reasonSignals, atoms) {
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
      intensity: 'medium'
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

  /**
   * Validate the entire ReasonType→REASON_ATOMS mapping
   * Run at system init to catch incomplete mappings
   *
   * @throws Error if mapping is incomplete
   */
  static validateMapping() {
    try {
      validateReasonTypeMapping();
      return true;
    } catch (err) {
      SWSELogger.error('[MentorReasonSelector] Mapping validation failed:', err);
      throw err;
    }
  }
}
