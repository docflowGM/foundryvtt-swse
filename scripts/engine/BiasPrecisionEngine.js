/**
 * SWSE Bias Precision Engine
 *
 * Tracks player selection patterns over time and adjusts suggestion weights
 * based on actual choices vs recommendations. Implements temporal decay so
 * recent decisions matter more than older ones.
 *
 * Key Features:
 * - Tracks acceptance/rejection rates for each suggestion tier
 * - Applies time decay to older decisions (exponential decay)
 * - Adjusts tier weights based on player behavior
 * - Persists data in actor flags for continuity across sessions
 * - Supports per-actor and per-player learning profiles
 */

import { SWSELogger } from '../utils/logger.js';

export class BiasPrecisionEngine {
  /**
   * Decay half-life in milliseconds (30 days = ~2.6M ms)
   * After this time, a decision's weight is halved
   */
  static DECAY_HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;

  /**
   * Minimum sample size before adjusting tier weights
   * Prevents overfitting to small sample sizes
   */
  static MIN_SAMPLE_SIZE = 5;

  /**
   * Maximum tier weight adjustment (multiplier)
   * Prevents extreme bias corrections
   */
  static MAX_WEIGHT_ADJUSTMENT = 2.0;
  static MIN_WEIGHT_ADJUSTMENT = 0.5;

  /**
   * Record a player decision (accepted or rejected a suggestion)
   * @param {Actor} actor - The character making the decision
   * @param {string} suggestionType - Type of suggestion (feat, talent, class, etc)
   * @param {number} tier - The suggestion tier that was recommended
   * @param {boolean} accepted - Whether the player accepted the suggestion
   * @param {string} itemName - Name of the item for detailed tracking
   */
  static async recordDecision(actor, suggestionType, tier, accepted, itemName = null) {
    try {
      const profile = this._getOrCreateProfile(actor);
      const timestamp = Date.now();

      // Initialize type tracking if needed
      if (!profile.decisions[suggestionType]) {
        profile.decisions[suggestionType] = {};
      }

      // Initialize tier tracking if needed
      if (!profile.decisions[suggestionType][tier]) {
        profile.decisions[suggestionType][tier] = {
          accepted: [],
          rejected: [],
          totalAccepted: 0,
          totalRejected: 0
        };
      }

      const tierData = profile.decisions[suggestionType][tier];

      // Record decision with timestamp
      const decision = { timestamp, itemName };
      if (accepted) {
        tierData.accepted.push(decision);
        tierData.totalAccepted++;
      } else {
        tierData.rejected.push(decision);
        tierData.totalRejected++;
      }

      // Update last decision timestamp
      profile.lastUpdated = timestamp;

      // Persist to actor flags
      await this._saveProfile(actor, profile);

      SWSELogger.log(`BiasEngine | Recorded ${accepted ? 'acceptance' : 'rejection'} for ${suggestionType} tier ${tier}${itemName ? `: ${itemName}` : ''}`);
    } catch (err) {
      SWSELogger.error('Failed to record decision:', err);
    }
  }

  /**
   * Get tier weight adjustments based on player's historical decisions
   * Returns multipliers for each tier (1.0 = no adjustment)
   * @param {Actor} actor - The character
   * @param {string} suggestionType - Type of suggestion
   * @returns {Object} Tier weight multipliers {tier: multiplier}
   */
  static getTierWeights(actor, suggestionType) {
    try {
      const profile = this._getOrCreateProfile(actor);
      const now = Date.now();
      const weights = {};

      // Get decisions for this suggestion type
      const typeDecisions = profile.decisions[suggestionType] || {};

      // Calculate weight for each tier
      for (const [tier, tierData] of Object.entries(typeDecisions)) {
        const tierNum = parseInt(tier);

        // Calculate weighted acceptance rate with time decay
        const { acceptanceRate, totalWeight } = this._calculateDecayedAcceptanceRate(
          tierData.accepted,
          tierData.rejected,
          now
        );

        // Only adjust if we have enough samples
        if (totalWeight < this.MIN_SAMPLE_SIZE) {
          weights[tierNum] = 1.0;
          continue;
        }

        // Convert acceptance rate to weight multiplier
        // High acceptance (player likes these suggestions) → increase weight
        // Low acceptance (player ignores these) → decrease weight
        let multiplier = 1.0;

        if (acceptanceRate > 0.7) {
          // Player likes this tier - boost it
          multiplier = 1.0 + ((acceptanceRate - 0.7) / 0.3) * (this.MAX_WEIGHT_ADJUSTMENT - 1.0);
        } else if (acceptanceRate < 0.3) {
          // Player ignores this tier - reduce it
          multiplier = 1.0 - ((0.3 - acceptanceRate) / 0.3) * (1.0 - this.MIN_WEIGHT_ADJUSTMENT);
        }

        // Clamp to safe range
        weights[tierNum] = Math.max(
          this.MIN_WEIGHT_ADJUSTMENT,
          Math.min(this.MAX_WEIGHT_ADJUSTMENT, multiplier)
        );

        SWSELogger.log(`BiasEngine | Tier ${tierNum} weight: ${weights[tierNum].toFixed(2)} (acceptance: ${(acceptanceRate * 100).toFixed(1)}%, samples: ${totalWeight.toFixed(1)})`);
      }

      return weights;
    } catch (err) {
      SWSELogger.error('Failed to calculate tier weights:', err);
      return {};
    }
  }

  /**
   * Calculate acceptance rate with exponential time decay
   * Recent decisions matter more than old ones
   * @param {Array} accepted - Array of accepted decisions with timestamps
   * @param {Array} rejected - Array of rejected decisions with timestamps
   * @param {number} now - Current timestamp
   * @returns {Object} {acceptanceRate, totalWeight}
   * @private
   */
  static _calculateDecayedAcceptanceRate(accepted, rejected, now) {
    let weightedAccepted = 0;
    let weightedRejected = 0;

    // Process accepted decisions
    for (const decision of accepted) {
      const weight = this._calculateDecayWeight(decision.timestamp, now);
      weightedAccepted += weight;
    }

    // Process rejected decisions
    for (const decision of rejected) {
      const weight = this._calculateDecayWeight(decision.timestamp, now);
      weightedRejected += weight;
    }

    const totalWeight = weightedAccepted + weightedRejected;
    const acceptanceRate = totalWeight > 0 ? weightedAccepted / totalWeight : 0.5;

    return { acceptanceRate, totalWeight };
  }

  /**
   * Calculate exponential decay weight for a decision based on age
   * Weight = 2^(-age / halfLife)
   * @param {number} timestamp - Decision timestamp
   * @param {number} now - Current timestamp
   * @returns {number} Decay weight (0 to 1)
   * @private
   */
  static _calculateDecayWeight(timestamp, now) {
    const ageMs = now - timestamp;
    const halfLives = ageMs / this.DECAY_HALF_LIFE_MS;
    return Math.pow(2, -halfLives);
  }

  /**
   * Get or create bias profile for an actor
   * @param {Actor} actor - The character
   * @returns {Object} Bias profile
   * @private
   */
  static _getOrCreateProfile(actor) {
    const flags = actor.getFlag('swse', 'biasProfile');
    if (flags) {
      return flags;
    }

    // Create new profile
    return {
      version: 1,
      created: Date.now(),
      lastUpdated: Date.now(),
      decisions: {}
    };
  }

  /**
   * Save bias profile to actor flags
   * @param {Actor} actor - The character
   * @param {Object} profile - Bias profile
   * @private
   */
  static async _saveProfile(actor, profile) {
    await actor.setFlag('swse', 'biasProfile', profile);
  }

  /**
   * Get detailed bias statistics for debugging/display
   * @param {Actor} actor - The character
   * @param {string} suggestionType - Type of suggestion
   * @returns {Object} Detailed statistics
   */
  static getStatistics(actor, suggestionType) {
    const profile = this._getOrCreateProfile(actor);
    const now = Date.now();
    const typeDecisions = profile.decisions[suggestionType] || {};
    const stats = {};

    for (const [tier, tierData] of Object.entries(typeDecisions)) {
      const { acceptanceRate, totalWeight } = this._calculateDecayedAcceptanceRate(
        tierData.accepted,
        tierData.rejected,
        now
      );

      stats[tier] = {
        totalAccepted: tierData.totalAccepted,
        totalRejected: tierData.totalRejected,
        weightedAcceptanceRate: acceptanceRate,
        effectiveSampleSize: totalWeight,
        recentAccepted: tierData.accepted.slice(-5),
        recentRejected: tierData.rejected.slice(-5)
      };
    }

    return {
      suggestionType,
      profileAge: now - profile.created,
      lastUpdated: profile.lastUpdated,
      tiers: stats
    };
  }

  /**
   * Clear bias profile for an actor (useful for testing or fresh start)
   * @param {Actor} actor - The character
   */
  static async clearProfile(actor) {
    await actor.unsetFlag('swse', 'biasProfile');
    SWSELogger.log(`BiasEngine | Cleared profile for ${actor.name}`);
  }

  /**
   * Export bias profile for analysis or transfer
   * @param {Actor} actor - The character
   * @returns {Object} Exportable profile data
   */
  static exportProfile(actor) {
    return this._getOrCreateProfile(actor);
  }

  /**
   * Import bias profile from external data
   * @param {Actor} actor - The character
   * @param {Object} profileData - Profile data to import
   */
  static async importProfile(actor, profileData) {
    await this._saveProfile(actor, profileData);
    SWSELogger.log(`BiasEngine | Imported profile for ${actor.name}`);
  }
}
