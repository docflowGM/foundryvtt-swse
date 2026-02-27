/**
 * Weighted Score Engine
 *
 * Applies bounded, additive weights to produce final scores.
 * No single component dominates. Scores saturate rather than scale infinitely.
 *
 * This is a replacement for (or enhancement of) the simple harmonic mean
 * tradeoff resolver, providing explicit control over component influence.
 */

import {
  WEIGHT_CAPS,
  BASE_RELEVANCE,
  ROLE_ALIGNMENT,
  AXIS_A_DAMAGE_BANDS,
  AXIS_A_DAMPENERS,
  AXIS_B_ATTRIBUTE_ALIGNMENT,
  AXIS_B_ACCURACY_TRAITS,
  AXIS_B_RANGE_COMPATIBILITY,
  AXIS_B_CAP,
  TRADEOFF_ADJUSTMENTS,
  PRICE_BIAS,
  EXPLAINABILITY_MAP
} from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/scoring/weight-config.js';

export class WeightedScoreEngine {
  /**
   * Compute final score using bounded, additive weights
   * @param {Object} weapon - Weapon item
   * @param {Object} charContext - Character context
   * @param {Object} axisA - Axis A breakdown
   * @param {Object} axisB - Axis B breakdown
   * @param {Object} options - Scoring options
   * @returns {Object} Final weighted score breakdown
   */
  static computeWeightedScore(weapon, charContext, axisA, axisB, options = {}) {
    const breakdown = {
      components: {},
      componentExplanations: [],
      finalScore: 0,
      tier: 'poor'
    };

    // Component 1: Base Relevance
    const baseRelevance = this._scoreBaseRelevance(weapon, charContext);
    breakdown.components.baseRelevance = baseRelevance;

    // Component 2: Role Alignment (primary human signal)
    const roleAlignment = this._scoreRoleAlignment(weapon, charContext, options);
    breakdown.components.roleAlignment = roleAlignment;

    // Component 3: Axis A (Damage If Hit)
    const axisAScore = this._scoreAxisA(weapon, axisA, charContext);
    breakdown.components.axisA = axisAScore;

    // Component 4: Axis B (Hit Likelihood Bias)
    // This is clamped to prevent any single factor from dominating
    const axisBScore = this._scoreAxisB(weapon, axisB, charContext);
    breakdown.components.axisB = axisBScore;

    // Component 5: Tradeoff Adjustments
    const tradeoffScore = this._scoreTradeoffAdjustments(weapon, charContext, axisA, axisB);
    breakdown.components.tradeoff = tradeoffScore;

    // Component 6: Price Bias
    const priceScore = this._scorePriceBias(weapon);
    breakdown.components.price = priceScore;

    // Sum all components (additive, not multiplicative)
    const total =
      baseRelevance.score +
      roleAlignment.score +
      axisAScore.score +
      axisBScore.score +
      tradeoffScore.score +
      priceScore.score;

    // Clamp final score to [0, 100]
    breakdown.finalScore = Math.max(0, Math.min(100, total));

    // Assign tier
    breakdown.tier = this._assignTier(breakdown.finalScore);

    // Generate component explanations (for debugging/UI)
    breakdown.componentExplanations = this._generateComponentExplanations(breakdown);

    // Summary breakdown (for display)
    breakdown.summary = {
      score: breakdown.finalScore,
      tier: breakdown.tier,
      scoreBreakdown: {
        baseRelevance: baseRelevance.score,
        roleAlignment: roleAlignment.score,
        axisA: axisAScore.score,
        axisB: axisBScore.score,
        tradeoff: tradeoffScore.score,
        price: priceScore.score
      }
    };

    return breakdown;
  }

  /**
   * Score Base Relevance (10-20 points)
   * Anchor: prevents junk from ranking high
   * @private
   */
  static _scoreBaseRelevance(weapon, charContext) {
    let score = 0;
    const reasons = [];

    // Item type matches context (+10)
    if (weapon.type === 'weapon' || weapon.type === 'armor' || weapon.type === 'equipment') {
      score += BASE_RELEVANCE.type_match;
      reasons.push('Compatible item type');
    }

    // Proficiency check (+5)
    const group = (weapon.system?.group || '').toLowerCase();
    const { proficiencies } = charContext;

    if (group.includes('simple')) {
      if (proficiencies.simple) {
        score += BASE_RELEVANCE.proficiency_exists;
        reasons.push('You are proficient');
      }
    } else if (group.includes('advanced') || group.includes('rifle')) {
      if (proficiencies.advanced) {
        score += BASE_RELEVANCE.proficiency_exists;
        reasons.push('You have advanced proficiency');
      }
    } else {
      // Unknown or exotic - assume usable
      score += BASE_RELEVANCE.proficiency_exists * 0.5;
      reasons.push('Proficiency status unclear');
    }

    // Item is usable (+5)
    score += BASE_RELEVANCE.usable;
    reasons.push('Item is usable');

    return {
      score: Math.min(BASE_RELEVANCE._total, score),
      breakdown: reasons,
      _cap: BASE_RELEVANCE._total
    };
  }

  /**
   * Score Role Alignment (-10 to +25 points)
   * PRIMARY human signal: how the character fights
   * @private
   */
  static _scoreRoleAlignment(weapon, charContext, options = {}) {
    let score = 0;
    const reasons = [];

    const primaryRole = charContext.primaryRole || 'generalist';
    const weaponRole = weapon.system?.role || options.impliedRole || 'general';

    // Match weapon role to character's combat role
    if (weaponRole === primaryRole) {
      score += ROLE_ALIGNMENT.perfect_match;
      reasons.push(`Perfect match for ${primaryRole} role`);
    } else if (this._hasRoleOverlap(weaponRole, primaryRole)) {
      const overlap = this._calculateOverlapStrength(weaponRole, primaryRole);
      if (overlap >= 0.8) {
        score += ROLE_ALIGNMENT.strong_partial;
        reasons.push(`Strong overlap with ${primaryRole}`);
      } else if (overlap >= 0.5) {
        score += ROLE_ALIGNMENT.moderate_partial;
        reasons.push(`Moderate overlap with ${primaryRole}`);
      }
    } else {
      // Check for mild or strong mismatch
      const mismatchScore = this._calculateMismatchScore(weaponRole, primaryRole);
      if (mismatchScore > 0.5) {
        score += ROLE_ALIGNMENT.strong_mismatch;
        reasons.push(`Poor fit for ${primaryRole}`);
      } else {
        score += ROLE_ALIGNMENT.mild_mismatch;
        reasons.push(`Not ideal for ${primaryRole}`);
      }
    }

    return {
      score: Math.max(
        ROLE_ALIGNMENT.min,
        Math.min(ROLE_ALIGNMENT.max, score)
      ),
      breakdown: reasons,
      characterRole: primaryRole,
      weaponRole,
      _range: [ROLE_ALIGNMENT.min, ROLE_ALIGNMENT.max]
    };
  }

  /**
   * Score Axis A (Damage) (0-16 points base + dampeners)
   * @private
   */
  static _scoreAxisA(weapon, axisA, charContext) {
    let score = 0;
    const reasons = [];

    const damage = axisA.averageDamage || 0;

    // Determine band and base score
    let band = 'low';
    if (damage <= AXIS_A_DAMAGE_BANDS.low.threshold) {
      score = AXIS_A_DAMAGE_BANDS.low.score;
      band = 'low';
    } else if (damage <= AXIS_A_DAMAGE_BANDS.medium_low.threshold) {
      score = AXIS_A_DAMAGE_BANDS.medium_low.score;
      band = 'medium_low';
    } else if (damage <= AXIS_A_DAMAGE_BANDS.medium.threshold) {
      score = AXIS_A_DAMAGE_BANDS.medium.score;
      band = 'medium';
    } else if (damage <= AXIS_A_DAMAGE_BANDS.medium_high.threshold) {
      score = AXIS_A_DAMAGE_BANDS.medium_high.score;
      band = 'medium_high';
    } else {
      score = AXIS_A_DAMAGE_BANDS.high.score;
      band = 'high';
    }

    reasons.push(`${band} damage (${damage.toFixed(1)} avg)`);

    // Apply dampeners (context-specific reductions)
    // Area vs single-target
    if (weapon.system?.isArea && !charContext.combatRoles?.includes('controller')) {
      score += AXIS_A_DAMPENERS.area_vs_single_target;
      reasons.push('Area weapon for single-target build (-4)');
    }

    // Clamp to never go below 0
    score = Math.max(AXIS_A_DAMPENERS._minimum_floor, score);

    // Cap at band maximum
    score = Math.min(AXIS_A_DAMAGE_BANDS.high.score, score);

    return {
      score,
      band,
      damage,
      breakdown: reasons,
      _cap: AXIS_A_DAMAGE_BANDS.high.score
    };
  }

  /**
   * Score Axis B (Hit Likelihood Bias) (-15 to +20 clamped)
   * Composed of sub-components
   * @private
   */
  static _scoreAxisB(weapon, axisB, charContext) {
    let score = 0;
    const reasons = [];

    // Sub-component 1: Attribute Alignment
    const attributeScore = this._scoreAttributeAlignment(weapon, charContext);
    score += attributeScore.score;
    reasons.push(...attributeScore.reasons);

    // Sub-component 2: Accuracy Traits
    const accuracyScore = this._scoreAccuracyTraits(weapon, charContext);
    score += accuracyScore.score;
    reasons.push(...accuracyScore.reasons);

    // Sub-component 3: Range Compatibility
    const rangeScore = this._scoreRangeCompatibility(weapon, charContext);
    score += rangeScore.score;
    reasons.push(...rangeScore.reasons);

    // CLAMP total Axis B to cap
    const clampedScore = Math.max(
      AXIS_B_CAP.min,
      Math.min(AXIS_B_CAP.max, score)
    );

    if (Math.abs(clampedScore - score) > 0.1) {
      reasons.push(`(clamped from ${score.toFixed(1)} to ${clampedScore.toFixed(1)})`);
    }

    return {
      score: clampedScore,
      breakdown: reasons,
      subcomponents: {
        attribute: attributeScore.score,
        accuracy: accuracyScore.score,
        range: rangeScore.score
      },
      _cap: [AXIS_B_CAP.min, AXIS_B_CAP.max]
    };
  }

  /**
   * Score attribute alignment (sub-component of Axis B)
   * @private
   */
  static _scoreAttributeAlignment(weapon, charContext) {
    const attr = (weapon.system?.attackAttribute || 'str').toLowerCase();
    const charStr = charContext.attributes?.str || 0;
    const charDex = charContext.attributes?.dex || 0;

    let score = 0;
    let reason = '';

    if (attr === 'str') {
      const diff = charStr - charDex;
      if (diff >= 4) {
        score = AXIS_B_ATTRIBUTE_ALIGNMENT.strong_advantage;
        reason = 'Strong STR advantage';
      } else if (diff >= 2) {
        score = AXIS_B_ATTRIBUTE_ALIGNMENT.moderate_advantage;
        reason = 'Moderate STR advantage';
      } else if (diff >= 0) {
        score = AXIS_B_ATTRIBUTE_ALIGNMENT.slight_advantage;
        reason = 'Slight STR alignment';
      } else if (diff >= -2) {
        score = AXIS_B_ATTRIBUTE_ALIGNMENT.slight_disadvantage;
        reason = 'Slight STR disadvantage';
      } else {
        score = AXIS_B_ATTRIBUTE_ALIGNMENT.strong_disadvantage;
        reason = 'Strong STR disadvantage';
      }
    } else if (attr === 'dex') {
      const diff = charDex - charStr;
      if (diff >= 4) {
        score = AXIS_B_ATTRIBUTE_ALIGNMENT.strong_advantage;
        reason = 'Strong DEX advantage';
      } else if (diff >= 2) {
        score = AXIS_B_ATTRIBUTE_ALIGNMENT.moderate_advantage;
        reason = 'Moderate DEX advantage';
      } else if (diff >= 0) {
        score = AXIS_B_ATTRIBUTE_ALIGNMENT.slight_advantage;
        reason = 'Slight DEX alignment';
      } else if (diff >= -2) {
        score = AXIS_B_ATTRIBUTE_ALIGNMENT.slight_disadvantage;
        reason = 'Slight DEX disadvantage';
      } else {
        score = AXIS_B_ATTRIBUTE_ALIGNMENT.strong_disadvantage;
        reason = 'Strong DEX disadvantage';
      }
    }

    return {
      score,
      reasons: [reason],
      attribute: attr,
      charStr,
      charDex
    };
  }

  /**
   * Score accuracy traits (sub-component of Axis B)
   * @private
   */
  static _scoreAccuracyTraits(weapon, charContext) {
    const accuracy = (weapon.system?.accuracy || '').toLowerCase();
    let score = 0;
    let reason = '';

    if (accuracy.includes('accurate')) {
      score = AXIS_B_ACCURACY_TRAITS.accurate;
      reason = 'Accurate trait bonus';
    } else if (accuracy.includes('inaccurate')) {
      score = AXIS_B_ACCURACY_TRAITS.inaccurate;
      reason = 'Inaccurate trait penalty';
    } else if (accuracy.includes('autofire') || accuracy.includes('rapid')) {
      // Context-sensitive
      if (charContext.combatRoles?.includes('controller')) {
        score = AXIS_B_ACCURACY_TRAITS.autofire_controller;
        reason = 'Autofire suits controller role';
      } else {
        score = AXIS_B_ACCURACY_TRAITS.autofire_single_target;
        reason = 'Autofire penalty for single-target';
      }
    } else {
      score = AXIS_B_ACCURACY_TRAITS.standard;
      reason = 'Standard accuracy';
    }

    return {
      score,
      reasons: [reason],
      accuracy
    };
  }

  /**
   * Score range compatibility (sub-component of Axis B)
   * @private
   */
  static _scoreRangeCompatibility(weapon, charContext) {
    const range = (weapon.system?.range || 'melee').toLowerCase();
    const playstyle = charContext.playstyleHints || [];

    let score = 0;
    let reason = '';

    if (range === 'melee' || range === 'close') {
      if (playstyle.includes('melee-preferred')) {
        score = AXIS_B_RANGE_COMPATIBILITY.good_match;
        reason = 'Good melee range match';
      } else if (playstyle.includes('mobile')) {
        score = AXIS_B_RANGE_COMPATIBILITY.poor_match;
        reason = 'Melee range mismatch';
      } else {
        score = AXIS_B_RANGE_COMPATIBILITY.acceptable;
        reason = 'Acceptable melee range';
      }
    } else if (range === 'ranged' || range === 'medium' || range === 'long') {
      if (playstyle.includes('ranged-preferred')) {
        score = AXIS_B_RANGE_COMPATIBILITY.good_match;
        reason = 'Good ranged range match';
      } else if (playstyle.includes('stationary')) {
        score = AXIS_B_RANGE_COMPATIBILITY.acceptable;
        reason = 'Acceptable ranged range';
      } else {
        score = AXIS_B_RANGE_COMPATIBILITY.acceptable;
        reason = 'Acceptable range';
      }
    }

    return {
      score,
      reasons: [reason],
      range
    };
  }

  /**
   * Score Tradeoff Adjustments (-10 to +10)
   * Reality check: fix pathological rankings
   * @private
   */
  static _scoreTradeoffAdjustments(weapon, charContext, axisA, axisB) {
    let score = 0;
    const reasons = [];

    // Check for heavy weapon + low STR + mobile character
    if (axisA.averageDamage > 14 && charContext.attributes?.str < 0 && charContext.playstyleHints?.includes('mobile')) {
      score += TRADEOFF_ADJUSTMENTS.heavy_vs_mobile;
      reasons.push('Heavy weapon conflicts with mobile playstyle (-6)');
    }

    // Check for light weapon + high STR + stationary
    if (axisA.averageDamage < 6 && charContext.attributes?.str > 2 && charContext.playstyleHints?.includes('stationary')) {
      score += TRADEOFF_ADJUSTMENTS.light_vs_stationary;
      reasons.push('Light weapon underutilizes strength (-3)');
    }

    // Check for good synergy
    if (axisA.normalizedScore > 0.7 && axisB.normalizedScore > 0.7) {
      score += TRADEOFF_ADJUSTMENTS.light_vs_mobile; // Use as synergy bonus
      reasons.push('Excellent synergy with your build (+5)');
    }

    // Clamp to range
    score = Math.max(TRADEOFF_ADJUSTMENTS._max * -1, Math.min(TRADEOFF_ADJUSTMENTS._max, score));

    return {
      score,
      breakdown: reasons || ['(no tradeoff adjustments)'],
      _range: [-TRADEOFF_ADJUSTMENTS._max, TRADEOFF_ADJUSTMENTS._max]
    };
  }

  /**
   * Score Price Bias (-6 to +4)
   * Never dominant, just a nudge
   * @private
   */
  static _scorePriceBias(weapon) {
    const price = weapon.system?.price || 0;
    const priceCategory = weapon.system?.priceCategory || 'standard';

    let score = 0;
    let reason = '';

    if (priceCategory === 'cheap' || price < 100) {
      score = PRICE_BIAS.cheap;
      reason = 'Good value - cheap';
    } else if (priceCategory === 'inexpensive' || price < 300) {
      score = PRICE_BIAS.somewhat_cheap;
      reason = 'Reasonably priced';
    } else if (priceCategory === 'expensive' || price > 1000) {
      score = PRICE_BIAS.expensive;
      reason = 'Premium cost';
    } else if (priceCategory === 'very_expensive' || price > 3000) {
      score = PRICE_BIAS.very_expensive;
      reason = 'Very expensive item';
    } else {
      score = PRICE_BIAS.average;
      reason = '(average price)';
    }

    // Clamp
    score = Math.max(PRICE_BIAS.min, Math.min(PRICE_BIAS.max, score));

    return {
      score,
      breakdown: [reason],
      price,
      priceCategory,
      _max: PRICE_BIAS.max
    };
  }

  /**
   * Assign tier from final score
   * @private
   */
  static _assignTier(score) {
    if (score >= 90) return 'perfect';
    if (score >= 80) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'viable';
    if (score >= 35) return 'marginal';
    return 'poor';
  }

  /**
   * Generate component explanations
   * @private
   */
  static _generateComponentExplanations(breakdown) {
    return Object.entries(breakdown.components).map(([key, value]) => ({
      component: key,
      score: value.score,
      explanation: value.breakdown?.join('; ') || '(no explanation)'
    }));
  }

  /**
   * Helper: Check if roles have overlap
   * @private
   */
  static _hasRoleOverlap(weaponRole, characterRole) {
    // Simple overlap check - can be expanded
    return (
      weaponRole === characterRole ||
      (weaponRole.includes('striker') && characterRole.includes('striker')) ||
      (weaponRole.includes('controller') && characterRole.includes('controller'))
    );
  }

  /**
   * Helper: Calculate overlap strength (0-1)
   * @private
   */
  static _calculateOverlapStrength(weaponRole, characterRole) {
    if (weaponRole === characterRole) return 1.0;
    if (weaponRole.includes('striker') && characterRole.includes('striker')) return 0.8;
    if (weaponRole.includes('controller') && characterRole.includes('controller')) return 0.8;
    return 0.3;
  }

  /**
   * Helper: Calculate mismatch strength (0-1)
   * @private
   */
  static _calculateMismatchScore(weaponRole, characterRole) {
    if (weaponRole === characterRole) return 0;
    if (this._hasRoleOverlap(weaponRole, characterRole)) return 0.3;
    return 0.7;
  }
}

export default WeightedScoreEngine;
