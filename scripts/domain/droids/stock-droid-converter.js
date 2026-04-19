/**
 * Stock Droid Converter
 * Converts stock statblock droids to builder-native playable droids via bounded inference.
 *
 * Phase 2 strategy:
 * - Infer ONLY what can be grounded in repo logic or clear repo data
 * - Preserve provenance and mark all inferred values
 * - Be honest about confidence and unknowns
 * - Produce a builder seed, not a perfect reconstruction
 * - Leave unresolvable fields unresolved for user review
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { DROID_SYSTEMS } from "/systems/foundryvtt-swse/scripts/data/droid-systems.js";

export class StockDroidConverter {
  /**
   * Convert a normalized stock droid to a builder seed
   * @param {Object} normalized - Normalized stock droid from StockDroidNormalizer
   * @param {Object} options - Conversion options
   * @returns {Object} Builder seed with inferred values, confidence, and unresolved fields
   */
  static convertStockDroidToBuilderSeed(normalized, options = {}) {
    if (!normalized) {
      return this._emptyBuilderSeed();
    }

    const identity = normalized.identity || {};
    const totals = normalized.publishedTotals || {};
    const assumptions = [];
    const warnings = [];

    // Infer degree (high confidence if present in normalized identity)
    const degree = this._inferDegree(identity.degree, assumptions, warnings);

    // Infer size (high confidence if present)
    const size = this._inferSize(identity.size, assumptions, warnings);

    // Infer locomotion from published speed (medium confidence)
    const locomotionInference = this._inferLocomotionFromSpeed(
      totals.speed || 6,
      size,
      assumptions,
      warnings
    );

    // Infer armor from defenses and HP (low confidence)
    const armorInference = this._inferArmorFromDefenses(
      totals.defenses,
      totals.hp,
      size,
      assumptions,
      warnings
    );

    // Ability seed: use published totals as reference (low confidence)
    const abilitySeed = this._buildAbilitySeed(totals.abilities, assumptions, warnings);

    // Cost seed: estimate from published data if available
    const costSeed = this._estimateCostSeed(locomotionInference, armorInference, assumptions, warnings);

    // Determine overall conversion confidence
    const confidence = this._determineConfidence(
      degree,
      size,
      locomotionInference,
      armorInference
    );

    return {
      source: {
        sourceId: normalized.source.compendiumId,
        sourceName: normalized.source.name,
        importMode: 'statblock'
      },

      inferredSeed: {
        degree,
        size,
        locomotion: locomotionInference,
        armor: armorInference,
        abilitySeed,
        speedSeed: totals.speed || 6,
        costSeed,
        appendages: [],  // Cannot infer, must be user-selected
        sensors: [],     // Cannot infer, must be user-selected
        processor: null  // Cannot infer, must be user-selected
      },

      unresolved: {
        droidSystems: [
          'processor',
          'appendages',
          'sensors',
          'accessories'
        ],
        blockers: [
          'Processor type cannot be reliably inferred from statblock',
          'Appendages cannot be determined from published totals',
          'Sensors are optional and not present in statblock'
        ],
        unknowns: [
          'Original builder degree/size/chassis combination (multiple valid decompositions exist)',
          'Exact equipment configuration'
        ]
      },

      conversionMeta: {
        confidence,
        assumptions,
        warnings,
        timestamp: Date.now(),
        convertedFrom: 'stock-statblock-normalized'
      }
    };
  }

  /**
   * Infer degree from identity or defaults
   * @private
   */
  static _inferDegree(identityDegree, assumptions, warnings) {
    if (identityDegree && ['1st-degree', '2nd-degree', '3rd-degree', 'Third-Degree', 'Second-Degree', 'First-Degree'].includes(identityDegree)) {
      // Found in source data
      assumptions.push(`Using degree from stock droid source: ${identityDegree}`);
      return this._normalizeDegree(identityDegree);
    }

    // Default to 2nd-degree if not found
    warnings.push('Degree not found in statblock; defaulting to Second-Degree');
    return 'Second-Degree';
  }

  /**
   * Normalize degree naming to canonical format
   * @private
   */
  static _normalizeDegree(degree) {
    const map = {
      '1st-degree': 'First-Degree',
      '2nd-degree': 'Second-Degree',
      '3rd-degree': 'Third-Degree',
      'First-Degree': 'First-Degree',
      'Second-Degree': 'Second-Degree',
      'Third-Degree': 'Third-Degree'
    };
    return map[degree] || 'Second-Degree';
  }

  /**
   * Infer size from identity
   * @private
   */
  static _inferSize(identitySize, assumptions, warnings) {
    const validSizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge'];

    if (identitySize && validSizes.includes(identitySize)) {
      assumptions.push(`Using size from stock droid source: ${identitySize}`);
      return identitySize;
    }

    // Default to Medium if not found
    warnings.push('Size not found in statblock; defaulting to Medium');
    return 'Medium';
  }

  /**
   * Infer locomotion system from published speed
   * Uses DROID_SYSTEMS.locomotion speed mappings for inference
   * Confidence is medium-to-low because speed alone doesn't uniquely identify locomotion
   * @private
   */
  static _inferLocomotionFromSpeed(speed, size, assumptions, warnings) {
    if (!speed || speed === 0) {
      warnings.push('Published speed is 0; assuming Stationary locomotion (low confidence)');
      return {
        id: 'stationary',
        name: 'Stationary',
        confidence: 'low',
        reason: 'Speed is 0'
      };
    }

    // Try to match published speed to a locomotion system
    // This is a best-effort heuristic; multiple systems can have same speed
    const sizeLower = (size || 'Medium').toLowerCase();

    // Check each locomotion type for a matching speed
    let bestMatch = null;
    let matchingTypes = [];

    for (const locomotion of DROID_SYSTEMS.locomotion) {
      const sizeKey = sizeLower === 'tiny' ? 'tiny'
        : sizeLower === 'small' ? 'small'
        : sizeLower === 'medium' ? 'medium'
        : sizeLower === 'large' ? 'large'
        : sizeLower === 'huge' ? 'huge'
        : 'medium';

      const baseSpeed = locomotion.baseSpeed?.[sizeKey] || locomotion.speeds?.[sizeKey];

      if (baseSpeed === speed) {
        matchingTypes.push({
          id: locomotion.id,
          name: locomotion.name,
          baseSpeed
        });
      }
    }

    if (matchingTypes.length === 1) {
      // Exact match found
      const match = matchingTypes[0];
      assumptions.push(`Inferred locomotion from speed match: ${match.name} (${match.baseSpeed} squares)`);
      return {
        id: match.id,
        name: match.name,
        confidence: 'medium',
        reason: 'Speed matches locomotion system'
      };
    } else if (matchingTypes.length > 1) {
      // Multiple matches; default to Walking (most common)
      const walking = matchingTypes.find(m => m.id === 'walking') || matchingTypes[0];
      warnings.push(`Multiple locomotion types have speed ${speed}; selecting ${walking.name} (user should verify)`);
      return {
        id: walking.id,
        name: walking.name,
        confidence: 'low',
        reason: 'Multiple matches; chose most common'
      };
    } else {
      // No exact match; recommend Walking as default
      warnings.push(`No locomotion system matches speed ${speed}; recommend user verify in builder`);
      return {
        id: null,
        name: null,
        confidence: 'none',
        reason: 'No matching speed found; requires user selection'
      };
    }
  }

  /**
   * Infer armor from defenses and HP
   * This is very low confidence because defense totals include ability mods, class bonuses, etc.
   * @private
   */
  static _inferArmorFromDefenses(defenses, hp, size, assumptions, warnings) {
    warnings.push('Armor type cannot be reliably inferred from defenses alone; user should select');

    // For future: could use heuristics like high defenses + medium HP = light armor
    // But without knowing ability mods and class, this is just guessing

    return {
      id: null,
      name: null,
      confidence: 'none',
      reason: 'Defenses are derived from multiple factors; armor cannot be determined from statblock alone'
    };
  }

  /**
   * Build ability seed from published totals
   * Low confidence because totals include baked-in bonuses
   * @private
   */
  static _buildAbilitySeed(abilityTotals, assumptions, warnings) {
    warnings.push('Ability scores from statblock are published totals and include degree/size bonuses');
    warnings.push('Recommend reviewing ability distribution after selecting degree/size in builder');

    if (!abilityTotals) {
      return {
        reference: {},
        confidence: 'none'
      };
    }

    // Store published totals for reference, but don't try to decompose
    return {
      reference: abilityTotals,
      confidence: 'low',
      note: 'Published totals for reference; builder will recompute based on degree/size'
    };
  }

  /**
   * Estimate total cost seed
   * @private
   */
  static _estimateCostSeed(locomotionInference, armorInference, assumptions, warnings) {
    // Without knowing exact systems, cost estimation is too uncertain
    // Default to standard 2000 credit budget and let builder calculate

    return {
      total: 2000,
      confidence: 'low',
      reason: 'Cannot calculate cost without system selections'
    };
  }

  /**
   * Determine overall conversion confidence
   * @private
   */
  static _determineConfidence(degree, size, locomotionInference, armorInference) {
    let confidenceLevel = 'high';

    if (!degree || degree === 'Second-Degree') {
      confidenceLevel = 'medium';  // Using default/inferred degree
    }

    if (!size || size === 'Medium') {
      if (confidenceLevel !== 'high') confidenceLevel = 'low';
    }

    if (locomotionInference.confidence === 'none' || locomotionInference.confidence === 'low') {
      confidenceLevel = 'low';
    }

    if (armorInference.confidence === 'none') {
      confidenceLevel = 'low';
    }

    return confidenceLevel;
  }

  /**
   * Return empty seed for null input
   * @private
   */
  static _emptyBuilderSeed() {
    return {
      source: {
        sourceId: null,
        sourceName: 'Unknown',
        importMode: 'unknown'
      },
      inferredSeed: {
        degree: 'Second-Degree',
        size: 'Medium',
        locomotion: { id: null, name: null, confidence: 'none' },
        armor: { id: null, name: null, confidence: 'none' },
        abilitySeed: { reference: {}, confidence: 'none' },
        speedSeed: 6,
        costSeed: { total: 2000, confidence: 'none' },
        appendages: [],
        sensors: [],
        processor: null
      },
      unresolved: {
        droidSystems: [
          'degree',
          'size',
          'processor',
          'appendages',
          'armor',
          'sensors'
        ],
        blockers: [
          'Source data is invalid or empty'
        ],
        unknowns: []
      },
      conversionMeta: {
        confidence: 'none',
        assumptions: [],
        warnings: [
          'Could not convert: source data is empty or invalid'
        ],
        timestamp: Date.now(),
        convertedFrom: 'invalid-source'
      }
    };
  }
}

export default StockDroidConverter;
