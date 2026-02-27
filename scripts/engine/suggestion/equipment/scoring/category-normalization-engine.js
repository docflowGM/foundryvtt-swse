/**
 * Category Normalization Engine
 *
 * Applies small, floating, category-relative adjustments to prevent trap items
 * from floating to the top.
 *
 * Philosophy:
 * - This is RELATIVE comparison within peer groups, not absolute judgment
 * - Trap items still appear, they just don't float to top
 * - Niche builds can still surface them if context fits
 * - Never says "weapon is bad" - says "weapon is weaker than peers"
 *
 * Design Constraints:
 * - Peer groups are narrow and mechanical (Blaster Pistols, not Pistols)
 * - Adjustments are small (-6 to +4) and never dominant
 * - Always computed from compendium data, never hand-authored
 * - Explainable in one sentence
 * - Applied LAST in scoring pipeline
 */

export class CategoryNormalizationEngine {
  /**
   * Compute category relative adjustment
   * @param {Object} weapon - The weapon item
   * @param {Array} peerGroup - All weapons in same category
   * @returns {Object} Category adjustment breakdown
   */
  static computeCategoryAdjustment(weapon, peerGroup = []) {
    if (!peerGroup || peerGroup.length < 2) {
      // Cannot compare if no peers
      return {
        adjustment: 0,
        explanation: 'No peers to compare (insufficient data)',
        confidence: 0.0,
        peerCount: peerGroup?.length || 0
      };
    }

    // Compute baselines for peer group
    const baselines = this._computePeerGroupBaselines(peerGroup);

    // Compare weapon to baselines
    const comparison = this._compareToBaselines(weapon, baselines);

    // Compute adjustment
    const adjustment = this._computeAdjustment(comparison, baselines);

    // Generate explanation
    const explanation = this._generateExplanation(comparison, adjustment);

    // Confidence in this adjustment
    const confidence = this._calculateConfidence(comparison, peerGroup.length);

    return {
      adjustment: Math.max(-6, Math.min(4, adjustment)), // Hard cap
      explanation,
      confidence,
      comparison,
      baselines,
      peerCount: peerGroup.length,
      weaponId: weapon.id,
      weaponName: weapon.name
    };
  }

  /**
   * Compute baseline metrics for a peer group
   * @private
   */
  static _computePeerGroupBaselines(peerGroup) {
    const damages = [];
    const prices = [];
    const hasAccurate = [];
    const hasInaccurate = [];
    const hasSpecial = [];

    peerGroup.forEach(weapon => {
      // PHASE 2: Read from v2 structured schema with fallback
      const damageDice = weapon.system.combat?.damage?.dice ?? weapon.system.damage;
      if (damageDice) {
        const avgDamage = this._calculateAverageDamage(damageDice);
        damages.push(avgDamage);
      }

      if (weapon.system?.price) {
        prices.push(weapon.system.price);
      }

      const accuracy = (weapon.system?.accuracy || '').toLowerCase();
      if (accuracy.includes('accurate')) hasAccurate.push(true);
      if (accuracy.includes('inaccurate')) hasInaccurate.push(true);
      if (accuracy.includes('special') || weapon.system?.isUnique) hasSpecial.push(true);
    });

    return {
      damageMedian: this._median(damages),
      damageMean: this._mean(damages),
      damageMin: Math.min(...damages),
      damageMax: Math.max(...damages),

      priceMedian: this._median(prices),
      priceMean: this._mean(prices),
      priceMin: Math.min(...prices),
      priceMax: Math.max(...prices),

      traitFrequency: {
        accurate: hasAccurate.length / peerGroup.length,
        inaccurate: hasInaccurate.length / peerGroup.length,
        special: hasSpecial.length / peerGroup.length
      },

      totalWeapons: peerGroup.length
    };
  }

  /**
   * Compare weapon to peer baselines
   * @private
   */
  static _compareToBaselines(weapon, baselines) {
    const weaponDamage = this._calculateAverageDamage(weapon.system?.damage || '');
    const weaponPrice = weapon.system?.price || 0;
    const weaponAccuracy = (weapon.system?.accuracy || '').toLowerCase();

    // Damage ratio
    const damageRatio = baselines.damageMedian > 0
      ? weaponDamage / baselines.damageMedian
      : 1.0;

    // Price ratio
    const priceRatio = baselines.priceMedian > 0
      ? weaponPrice / baselines.priceMedian
      : 1.0;

    // Trait presence
    const hasAccurate = weaponAccuracy.includes('accurate');
    const hasInaccurate = weaponAccuracy.includes('inaccurate');
    const traitCount = [hasAccurate, hasInaccurate].filter(Boolean).length;

    // Expected trait count (from baseline frequency)
    const expectedTraits = baselines.traitFrequency.accurate > 0.5 ? 1 : 0;

    return {
      damageRatio,     // 1.0 = at median, <1.0 = below median
      priceRatio,      // 1.0 = at median, >1.0 = more expensive
      traitCount,      // Actual traits
      expectedTraits,  // Expected based on peers
      hasAccurate,
      hasInaccurate,
      weaponDamage,
      weaponPrice
    };
  }

  /**
   * Compute adjustment from comparison
   * @private
   */
  static _computeAdjustment(comparison, baselines) {
    let adjustment = 0;

    // Trap item detection:
    // Below median damage + lacking traits + more expensive
    if (comparison.damageRatio < 0.9) {
      // Below median damage
      if (comparison.traitCount < comparison.expectedTraits) {
        // Lacks compensating traits
        if (comparison.priceRatio > 1.0) {
          // More expensive than median
          adjustment -= 6;
          return adjustment; // Strong trap signal
        } else if (comparison.priceRatio > 0.8) {
          // Similar price but weaker
          adjustment -= 4;
          return adjustment;
        } else {
          // Cheap and weak - but still marked down
          adjustment -= 2;
          return adjustment;
        }
      } else if (comparison.priceRatio > 1.1) {
        // Below median but has trait, priced high
        adjustment -= 3;
        return adjustment;
      }
    }

    // Slightly weak items
    if (comparison.damageRatio < 0.95 && comparison.priceRatio >= 1.0) {
      adjustment -= 1;
    }

    // Premium items (slightly above median)
    if (comparison.damageRatio > 1.05 && comparison.priceRatio <= 0.9) {
      adjustment += 2;
    }

    // Exceptional items (notably better)
    if (comparison.damageRatio > 1.15 && comparison.hasAccurate && comparison.priceRatio <= 1.0) {
      adjustment += 4;
    }

    return Math.max(-6, Math.min(4, adjustment));
  }

  /**
   * Generate human explanation for adjustment
   * @private
   */
  static _generateExplanation(comparison, adjustment) {
    if (adjustment < -4) {
      return 'Significantly weaker than similar options in its category';
    }

    if (adjustment === -3) {
      return 'Less effective than most weapons in its category';
    }

    if (adjustment === -2) {
      return 'Slightly underperforms compared to peer weapons';
    }

    if (adjustment === -1) {
      return 'Marginally weaker than category average';
    }

    if (adjustment === 0) {
      return '(no category adjustment)';
    }

    if (adjustment === 1) {
      return 'Slightly better than category average';
    }

    if (adjustment === 2) {
      return 'Good value - better than similar options';
    }

    if (adjustment >= 3) {
      return 'Outperforms common alternatives in its category';
    }

    return '(no category adjustment)';
  }

  /**
   * Calculate confidence in this adjustment
   * Higher confidence with more peers
   * @private
   */
  static _calculateConfidence(comparison, peerCount) {
    if (peerCount < 3) return 0.3; // Too few peers
    if (peerCount < 5) return 0.5;
    if (peerCount < 10) return 0.7;
    return 0.9; // Good confidence with 10+ peers
  }

  /**
   * Calculate average damage from formula
   * @private
   */
  static _calculateAverageDamage(damageFormula) {
    if (!damageFormula || typeof damageFormula !== 'string') {
      return 0;
    }

    const match = damageFormula.match(/(\d+)d(\d+)([+-]?\d+)?/i);
    if (!match) {
      return 0;
    }

    const numDice = parseInt(match[1], 10);
    const diceSize = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    return (numDice * (diceSize + 1)) / 2 + modifier;
  }

  /**
   * Calculate median of array
   * @private
   */
  static _median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate mean of array
   * @private
   */
  static _mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Define peer groups from compendium
   * These are narrow, mechanical categories
   *
   * This should eventually be data-driven, but for v1:
   * It's semi-hand-authored based on tag analysis
   */
  static getPeerGroups(weapons) {
    const groups = {
      'Blaster Pistols': [],
      'Blaster Rifles': [],
      'Heavy Blasters': [],
      'Simple Vibroweapons': [],
      'Advanced Vibroweapons': [],
      'Lightsabers (Single)': [],
      'Lightsabers (Double)': [],
      'Grenades': [],
      'Exotic Weapons': []
    };

    // Classify each weapon
    weapons.forEach(weapon => {
      const group = this._classifyWeapon(weapon);
      if (groups[group]) {
        groups[group].push(weapon);
      }
    });

    return Object.fromEntries(
      Object.entries(groups).filter(([_, weapons]) => weapons.length > 1)
    );
  }

  /**
   * Classify weapon into peer group
   * @private
   */
  static _classifyWeapon(weapon) {
    const name = (weapon.name || '').toLowerCase();
    const group = (weapon.system?.group || '').toLowerCase();

    if (name.includes('lightsaber')) {
      return name.includes('double') ? 'Lightsabers (Double)' : 'Lightsabers (Single)';
    }

    if (name.includes('grenade') || name.includes('explosive')) {
      return 'Grenades';
    }

    if (group.includes('blaster') || name.includes('blaster')) {
      if (name.includes('pistol')) return 'Blaster Pistols';
      if (name.includes('rifle') || name.includes('rifle')) return 'Blaster Rifles';
      if (name.includes('heavy') || name.includes('cannon')) return 'Heavy Blasters';
      return 'Blaster Rifles';
    }

    if (group.includes('vibro') || name.includes('vibro')) {
      if (group.includes('simple')) return 'Simple Vibroweapons';
      return 'Advanced Vibroweapons';
    }

    return 'Exotic Weapons';
  }

  /**
   * Format category adjustment for UI
   */
  static formatAdjustment(result) {
    return {
      bonus: result.adjustment,
      explanation: result.explanation,
      confidence: result.confidence,
      tier: this._getAdjustmentTier(result.adjustment)
    };
  }

  /**
   * Categorize adjustment strength
   * @private
   */
  static _getAdjustmentTier(adjustment) {
    if (adjustment <= -4) return 'strong-penalty';
    if (adjustment <= -2) return 'moderate-penalty';
    if (adjustment === -1) return 'mild-penalty';
    if (adjustment === 0) return 'neutral';
    if (adjustment === 1) return 'mild-bonus';
    if (adjustment === 2) return 'moderate-bonus';
    return 'strong-bonus';
  }
}

export default CategoryNormalizationEngine;
