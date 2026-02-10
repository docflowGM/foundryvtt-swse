/**
 * Tradeoff Resolver
 *
 * Combines Axis A (Damage) and Axis B (Hit Likelihood) into final relevance scores.
 * Resolves fundamental weapon tradeoffs:
 *   - High damage, low accuracy vs low damage, high accuracy
 *   - Mobile vs heavy builds
 *   - Single-target vs autofire
 *
 * Philosophy: No railroading. Multiple strategies are viable.
 * Score reflects "how well does this weapon fit?"
 */

export class TradeoffResolver {
  /**
   * Resolve tradeoff and compute final score
   * @param {Object} axisA - Damage-on-hit score
   * @param {Object} axisB - Hit-likelihood bias score
   * @param {Object} charContext - Character context
   * @returns {Object} Final combined score
   */
  static resolveTradeoff(axisA, axisB, charContext) {
    const dScore = axisA.normalizedScore; // 0-1
    const hScore = axisB.normalizedScore; // 0-1

    // Identify tradeoff type
    const tradeoffType = this._identifyTradeoffType(dScore, hScore);

    // Compute final score based on tradeoff type
    const finalScore = this._computeFinalScore(dScore, hScore, tradeoffType, charContext);

    // Assign tier (for easy bucketing)
    const tier = this._assignTier(finalScore);

    return {
      finalScore,      // 0-1 relevance score
      tier,            // 'perfect', 'excellent', 'good', 'viable', 'marginal', 'poor'
      tradeoffType,    // What kind of tradeoff this weapon represents

      // Components for analysis
      damageScore: dScore,
      hitScore: hScore,

      // Rationale
      rationale: this._generateRationale(dScore, hScore, tradeoffType, charContext),

      // Guidance for users
      guidance: this._generateGuidance(tradeoffType, charContext),

      // Debug info
      computationMethod: 'harmonic-mean-weighted'
    };
  }

  /**
   * Identify what kind of tradeoff this weapon represents
   * @private
   */
  static _identifyTradeoffType(damageScore, hitScore) {
    const dHigh = damageScore > 0.7;
    const dLow = damageScore < 0.3;
    const hHigh = hitScore > 0.7;
    const hLow = hitScore < 0.3;

    if (dHigh && hHigh) {
      return 'balanced-excellent'; // Best of both worlds
    }
    if (dHigh && hLow) {
      return 'high-risk-high-reward'; // Powerful but risky
    }
    if (dLow && hHigh) {
      return 'reliable-consistent'; // Always hits, lower impact
    }
    if (dLow && hLow) {
      return 'poor-both'; // Weak at both axes
    }

    // Middle ground
    if (dHigh && Math.abs(damageScore - hitScore) > 0.2) {
      return 'damage-focused'; // Emphasizes damage over accuracy
    }
    if (hHigh && Math.abs(damageScore - hitScore) > 0.2) {
      return 'accuracy-focused'; // Emphasizes accuracy over damage
    }

    return 'balanced';
  }

  /**
   * Compute final score using weighted harmonic mean
   * This emphasizes balance while still rewarding specialist weapons
   * @private
   */
  static _computeFinalScore(damageScore, hitScore, tradeoffType, charContext) {
    // Weight based on character playstyle
    let dWeight = 0.5;
    let hWeight = 0.5;

    // Adjust weights based on playstyle hints
    if (charContext.playstyleHints?.includes('tank')) {
      hWeight = 0.6; // Tank values reliability
      dWeight = 0.4;
    }

    if (charContext.playstyleHints?.includes('mobile')) {
      // Mobile characters can afford lower hit chance if damage is high
      // But they also benefit from high accuracy for hit-and-run tactics
      dWeight = 0.55;
      hWeight = 0.45;
    }

    if (charContext.playstyleHints?.includes('stationary')) {
      // Stationary characters should value damage more (fewer attacks per turn)
      dWeight = 0.6;
      hWeight = 0.4;
    }

    // Apply tradeoff-specific weighting
    switch (tradeoffType) {
      case 'high-risk-high-reward':
        // Don't penalize high damage + lower hit chance
        // Risk-takers like these weapons
        dWeight = 0.7;
        hWeight = 0.3;
        break;

      case 'reliable-consistent':
        // Don't penalize low damage + high hit chance
        // Consistent players like these weapons
        hWeight = 0.7;
        dWeight = 0.3;
        break;

      case 'balanced-excellent':
      case 'balanced':
        dWeight = 0.5;
        hWeight = 0.5;
        break;

      case 'damage-focused':
        dWeight = 0.65;
        hWeight = 0.35;
        break;

      case 'accuracy-focused':
        dWeight = 0.35;
        hWeight = 0.65;
        break;
    }

    // Compute weighted harmonic mean
    // Harmonic mean emphasizes balance, penalizes extreme imbalance
    if (damageScore === 0 || hitScore === 0) {
      return 0; // One axis completely missing = not viable
    }

    const harmonicMean = 2 / ((1 / damageScore) + (1 / hitScore));
    const weightedScore = harmonicMean * 0.5 + (dWeight * damageScore + hWeight * hitScore) * 0.5;

    // Normalize to 0-1
    return Math.min(1.0, Math.max(0.0, weightedScore));
  }

  /**
   * Assign tier based on final score
   * @private
   */
  static _assignTier(finalScore) {
    if (finalScore >= 0.9) return 'perfect';
    if (finalScore >= 0.8) return 'excellent';
    if (finalScore >= 0.7) return 'good';
    if (finalScore >= 0.55) return 'viable';
    if (finalScore >= 0.35) return 'marginal';
    return 'poor';
  }

  /**
   * Generate human-readable rationale for the score
   * @private
   */
  static _generateRationale(damageScore, hitScore, tradeoffType, charContext) {
    const reasons = [];

    if (damageScore >= 0.8) {
      reasons.push('High damage potential if hit');
    } else if (damageScore >= 0.6) {
      reasons.push('Moderate damage output');
    } else if (damageScore >= 0.4) {
      reasons.push('Lower damage but reliable');
    } else {
      reasons.push('Light damage, best for finishing');
    }

    if (hitScore >= 0.8) {
      if (damageScore >= 0.8) {
        reasons.push('Strong match for your attributes and playstyle');
      } else {
        reasons.push('Well-suited to your build, despite moderate damage');
      }
    } else if (hitScore >= 0.6) {
      reasons.push('Reasonable fit for your attributes');
    } else if (hitScore >= 0.4) {
      reasons.push('Not ideal for your current build');
    } else {
      reasons.push('Poor match for your attributes');
    }

    // Playstyle-specific
    if (charContext.playstyleHints?.includes('tank')) {
      if (tradeoffType === 'reliable-consistent') {
        reasons.push('Fits tanking role well');
      } else if (tradeoffType === 'high-risk-high-reward') {
        reasons.push('Risky for defensive playstyle');
      }
    }

    if (charContext.playstyleHints?.includes('mobile')) {
      if (tradeoffType === 'balanced' || tradeoffType === 'balanced-excellent') {
        reasons.push('Versatile for mobile tactics');
      }
    }

    return reasons;
  }

  /**
   * Generate guidance for using this weapon
   * @private
   */
  static _generateGuidance(tradeoffType, charContext) {
    const guidance = [];

    switch (tradeoffType) {
      case 'high-risk-high-reward':
        guidance.push('Use when you can afford to miss or want burst damage');
        guidance.push('Pair with accuracy bonuses (feats, talents) for consistency');
        break;

      case 'reliable-consistent':
        guidance.push('Excellent for hit-and-run tactics');
        guidance.push('Build incremental damage over multiple rounds');
        break;

      case 'balanced-excellent':
        guidance.push('Reliable and potent - this is a solid all-around choice');
        guidance.push('Works well in any tactical situation');
        break;

      case 'damage-focused':
        guidance.push('Best used when accuracy is boosted by other sources (flanking, allies)');
        guidance.push('Prioritize positioning for advantage');
        break;

      case 'accuracy-focused':
        guidance.push('Excellent for single-target focus fire');
        guidance.push('May pair well with crowd control or support abilities');
        break;

      case 'balanced':
        guidance.push('Versatile option that works in most situations');
        break;

      case 'poor-both':
        guidance.push('Consider alternatives that better match your build');
        break;
    }

    return guidance;
  }

  /**
   * Describe how this weapon resolves tradeoffs relative to character
   */
  static describeTradeoff(tradeoffType, charContext) {
    const descriptions = {
      'balanced-excellent': 'Excellent balance of damage and accuracy',
      'high-risk-high-reward': 'High damage, lower accuracy - gamble for big hits',
      'reliable-consistent': 'Consistent accuracy, moderate damage - steady approach',
      'poor-both': 'Weak in both damage and accuracy',
      'balanced': 'Balanced approach to damage and accuracy',
      'damage-focused': 'Emphasizes damage over accuracy',
      'accuracy-focused': 'Emphasizes accuracy over damage'
    };

    return descriptions[tradeoffType] || 'Specialized weapon';
  }
}

export default TradeoffResolver;
