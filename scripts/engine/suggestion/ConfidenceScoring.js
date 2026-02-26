/**
 * Confidence Scoring
 *
 * Computes confidence scores (0-1) alongside suggestion tiers.
 * Confidence reflects how certain the engine is in the suggestion.
 *
 * Does NOT affect tier assignment (immutable).
 * Used for:
 * - Mentor tone modulation (high confidence = assertive, low = tentative)
 * - UI styling (green for high, yellow for moderate, etc.)
 * - Sorting when tiers are equal (if needed)
 *
 * Confidence factors:
 * - Reason strength (average of supporting reasons)
 * - Player commitment level (locked anchor = higher confidence)
 * - Data completeness (more chosen feats/talents = higher)
 * - Tier level (higher tiers naturally have higher confidence)
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { BuildIdentityAnchor, ANCHOR_STATE } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildIdentityAnchor.js";

import { getLevelSplit } from "/systems/foundryvtt-swse/scripts/actors/derived/level-split.js";
export class ConfidenceScoring {
  /**
   * Compute confidence for a suggestion
   * @param {Object} suggestion - Suggestion with tier, reasons, etc.
   * @param {Actor} actor - The character
   * @param {Object} options - { includePriors, weight }
   * @returns {number} Confidence score (0-1)
   */
  static computeConfidence(suggestion, actor, options = {}) {
    try {
      const { includePriors = true, weight = {} } = options;

      const weights = {
        reasonStrength: weight.reasonStrength ?? 0.4,
        tierLevel: weight.tierLevel ?? 0.3,
        commitment: weight.commitment ?? 0.2,
        completeness: weight.completeness ?? 0.1
      };

      let score = 0;

      // Factor 1: Reason strength (if reasons available)
      const reasonScore = this._scoreReasonStrength(suggestion.reasons ?? []);
      score += reasonScore * weights.reasonStrength;

      // Factor 2: Tier level
      const tierScore = this._scoreTierLevel(suggestion?.suggestion?.tier ?? 0);
      score += tierScore * weights.tierLevel;

      // Factor 3: Player commitment
      if (includePriors && actor) {
        const commitmentScore = this._scoreCommitment(actor);
        score += commitmentScore * weights.commitment;
      }

      // Factor 4: Build completeness
      if (includePriors && actor) {
        const completenessScore = this._scoreCompleteness(actor);
        score += completenessScore * weights.completeness;
      }

      // Clamp to 0-1
      return Math.max(0, Math.min(1, score));
    } catch (err) {
      SWSELogger.warn('[ConfidenceScoring] Error computing confidence:', err);
      return 0.5; // Default to moderate confidence on error
    }
  }

  /**
   * Score based on strength of supporting reasons
   * @private
   */
  static _scoreReasonStrength(reasons) {
    if (!Array.isArray(reasons) || reasons.length === 0) {
      return 0.5; // Neutral if no reasons
    }

    // Average strength of all reasons
    const strengthSum = reasons.reduce((sum, r) => sum + (r?.strength ?? 0.5), 0);
    return strengthSum / reasons.length;
  }

  /**
   * Score based on tier level
   * Higher tiers = higher confidence
   * @private
   */
  static _scoreTierLevel(tier) {
    const tierScores = {
      6: 0.95,
      5: 0.90,
      4: 0.80,
      3: 0.70,
      2: 0.60,
      1: 0.45,
      0: 0.30
    };

    return tierScores[tier] ?? 0.5;
  }

  /**
   * Score based on player commitment/anchor state
   * Locked anchor = high confidence, no anchor = low
   * @private
   */
  static _scoreCommitment(actor) {
    try {
      const primaryAnchor = BuildIdentityAnchor.getAnchor(actor, 'primary');

      if (!primaryAnchor) {
        return 0.4; // Low confidence when no anchor
      }

      if (primaryAnchor.state === ANCHOR_STATE.LOCKED) {
        return 0.9; // High confidence for locked anchor
      }

      if (primaryAnchor.state === ANCHOR_STATE.PROPOSED) {
        return 0.7; // Moderate-high for proposed anchor
      }

      return 0.5; // Default moderate
    } catch (err) {
      return 0.5;
    }
  }

  /**
   * Score based on build completeness
   * More feats/talents chosen = more complete = higher confidence
   * @private
   */
  static _scoreCompleteness(actor) {
    try {
      const feats = actor.items.filter(i => i.type === 'feat').length;
      const talents = actor.items.filter(i => i.type === 'talent').length;
      const skills = Object.values(actor.system?.skills ?? {}).filter(s => s?.trained).length;
      const level = actor.system?.level ?? 1;

      // Expected items per level (ballpark)
      const expectedFeats = Math.max(1, level - 1); // 1st level gets 0
      const { heroicLevel } = getLevelSplit(actor);
      const expectedTalents = Math.floor((Number(heroicLevel) || 0) / 2); // heroic-only
      const expectedSkills = Math.max(1, level); // Should train at least 1 skill

      // Completeness = how close to expected
      let completeness = 0;
      completeness += Math.min(1, feats / Math.max(1, expectedFeats)) * 0.5;
      completeness += Math.min(1, talents / Math.max(1, expectedTalents)) * 0.3;
      completeness += Math.min(1, skills / Math.max(1, expectedSkills)) * 0.2;

      return completeness;
    } catch (err) {
      return 0.5;
    }
  }

  /**
   * Get confidence description (human readable)
   * @param {number} confidence - Confidence score (0-1)
   * @returns {string} Description like "high", "moderate", "low"
   */
  static getConfidenceLabel(confidence) {
    if (confidence >= 0.8) {return 'very high';}
    if (confidence >= 0.65) {return 'high';}
    if (confidence >= 0.5) {return 'moderate';}
    if (confidence >= 0.35) {return 'low';}
    return 'very low';
  }

  /**
   * Get confidence color for UI
   * @param {number} confidence - Confidence score (0-1)
   * @returns {string} CSS color class or hex
   */
  static getConfidenceColor(confidence) {
    if (confidence >= 0.8) {return '#22c55e';} // green
    if (confidence >= 0.65) {return '#3b82f6';} // blue
    if (confidence >= 0.5) {return '#f59e0b';} // amber
    if (confidence >= 0.35) {return '#f97316';} // orange
    return '#ef4444'; // red
  }

  /**
   * Adjust mentor tone based on confidence
   * @param {number} confidence - Confidence score (0-1)
   * @param {string} baseMessage - Base mentor message
   * @returns {string} Message with confidence-adjusted tone
   */
  static adjustToneForConfidence(confidence, baseMessage) {
    if (!baseMessage) {return baseMessage;}

    if (confidence >= 0.8) {
      // High confidence: assertive tone
      return baseMessage
        .replace(/could work/i, 'will work')
        .replace(/might/i, 'will')
        .replace(/consider/i, 'take')
        .replace(/I suggest/i, 'I recommend');
    } else if (confidence <= 0.4) {
      // Low confidence: tentative tone
      return baseMessage
        .replace(/will work/i, 'could work')
        .replace(/will/i, 'might')
        .replace(/recommend/i, 'suggest')
        .replace(/take/i, 'consider');
    }

    return baseMessage; // Moderate confidence: keep as is
  }
}
