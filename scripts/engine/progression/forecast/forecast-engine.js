/**
 * Forecast Engine — Phase 4 Work Package A
 *
 * Extends the prerequisite authority with forward-looking APIs.
 *
 * Architecture:
 * - Wraps PrerequisiteChecker for legality validation
 * - Adds hypothetical/projected evaluation
 * - Provides unified forecast schema
 * - No second rules engine; all legality flows through PrerequisiteChecker
 *
 * Public APIs:
 * - forecastAcquisition(actor, candidate, context) → forecast result
 * - evaluateTargetPath(targetId, projectedContext) → path viability
 * - compareOptionForecasts(options, context) → ranked options by forecast
 *
 * Forecast Result Schema:
 * {
 *   candidate: { id, name, type },
 *   legalNow: boolean,
 *   visibleNow: boolean,
 *   missingNow: [],
 *   unlocks: [],
 *   blocks: [],
 *   delays: { targetId: delayLevels },
 *   preserves: [],
 *   nearEligibleTargets: [],
 *   warnings: []
 * }
 */

import { PrerequisiteChecker } from '/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class ForecastEngine {
  /**
   * Forecast the consequences of acquiring a candidate item.
   *
   * @param {Object} actor - Current actor (or mock actor with projected state)
   * @param {Object} candidate - Item being evaluated (feat, talent, class, power, etc.)
   * @param {Object} context - Additional context
   * @param {Object} context.progressionSession - Phase 1 session with current state
   * @param {Object} context.projectedCharacter - Phase 3 projected character
   * @param {string} context.mode - 'chargen' | 'levelup'
   * @returns {Object} Forecast result
   */
  static forecastAcquisition(actor, candidate, context = {}) {
    try {
      const forecast = {
        candidate: this._normalizeCandidateId(candidate),
        legalNow: false,
        visibleNow: true,
        missingNow: [],
        unlocks: [],
        blocks: [],
        delays: {},
        preserves: [],
        nearEligibleTargets: [],
        warnings: [],
      };

      if (!actor || !candidate) {
        forecast.warnings.push('Invalid actor or candidate');
        return forecast;
      }

      // Phase 1: Check current legality
      const currentLegality = PrerequisiteChecker.checkFeatPrerequisites(actor, candidate);
      forecast.legalNow = currentLegality.met === true;
      forecast.missingNow = currentLegality.missing || [];

      if (!forecast.legalNow) {
        // Check if near-eligible (missing only a few things)
        forecast.nearEligibleTargets = this._findNearEligiblePaths(actor, candidate, context);
      }

      // Phase 2: Hypothetical evaluation
      // If we added this item, what would unlock or block?
      if (forecast.legalNow) {
        const hypothetical = this._projectWithCandidate(actor, candidate, context);
        forecast.unlocks = hypothetical.unlocks || [];
        forecast.blocks = hypothetical.blocks || [];
        forecast.preserves = hypothetical.preserves || [];
      }

      // Phase 3: Prestige class impact
      if (context.projectedCharacter?.identity?.class) {
        const prestigeImpact = this._evaluatePrestigeImpact(actor, candidate, context);
        if (prestigeImpact) {
          Object.assign(forecast.delays, prestigeImpact.delays || {});
          if (prestigeImpact.warnings) {
            forecast.warnings.push(...prestigeImpact.warnings);
          }
        }
      }

      swseLogger.debug('[ForecastEngine] Forecast complete:', {
        candidateName: candidate.name || candidate.id,
        legalNow: forecast.legalNow,
        unlocksCount: forecast.unlocks.length,
      });

      return forecast;
    } catch (err) {
      swseLogger.error('[ForecastEngine] Error during forecast:', err);
      return {
        candidate: this._normalizeCandidateId(candidate),
        legalNow: false,
        visibleNow: true,
        missingNow: [err.message || 'Forecast error'],
        unlocks: [],
        blocks: [],
        delays: {},
        preserves: [],
        nearEligibleTargets: [],
        warnings: ['Forecast failed; data may be incomplete'],
      };
    }
  }

  /**
   * Evaluate the path to a long-term target (prestige class, talent tree, etc.).
   *
   * @param {string} targetId - Target identifier (e.g., 'Jedi Knight', 'Force domain:Control')
   * @param {Object} projectedContext - Projected actor state + session
   * @param {number} maxLevels - Maximum levels to project (default 6)
   * @returns {Object} Path viability { reachable, blockingRequirements, delayLevels, milestones }
   */
  static evaluateTargetPath(targetId, projectedContext, maxLevels = 6) {
    try {
      const pathResult = {
        targetId,
        reachable: false,
        blockingRequirements: [],
        delayLevels: 0,
        milestones: [],
        warnings: [],
      };

      if (!targetId || !projectedContext?.actor) {
        pathResult.warnings.push('Invalid target or context');
        return pathResult;
      }

      // Placeholder: This will be expanded with target registry in Phase 4 Work Package F
      // For now, just check if target is a prestige class
      const prestigeResult = this._evaluatePrestigeClassPath(
        targetId,
        projectedContext,
        maxLevels
      );

      if (prestigeResult) {
        Object.assign(pathResult, prestigeResult);
      }

      return pathResult;
    } catch (err) {
      swseLogger.error('[ForecastEngine] Error evaluating target path:', err);
      return {
        targetId,
        reachable: false,
        blockingRequirements: [err.message],
        delayLevels: maxLevels,
        milestones: [],
        warnings: ['Path evaluation failed'],
      };
    }
  }

  /**
   * Compare forecasts for multiple options to rank by future value.
   *
   * @param {Array} options - Array of { candidate, forecast } objects
   * @param {Object} context - Ranking context (targets, buildSignals, etc.)
   * @returns {Array} Sorted array with forecast score added
   */
  static compareOptionForecasts(options, context = {}) {
    if (!Array.isArray(options)) return [];

    const scored = options.map(opt => {
      const score = this._scoreForecast(opt.forecast, context);
      return {
        ...opt,
        forecastScore: score,
      };
    });

    // Sort by score descending (higher = better)
    return scored.sort((a, b) => (b.forecastScore || 0) - (a.forecastScore || 0));
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Normalize candidate to { id, name, type } format.
   * @private
   */
  static _normalizeCandidateId(candidate) {
    if (typeof candidate === 'string') {
      return { id: candidate, name: candidate, type: 'unknown' };
    }
    if (candidate?.id || candidate?.name) {
      return {
        id: candidate.id || candidate.name,
        name: candidate.name || candidate.id,
        type: candidate.type || 'unknown',
      };
    }
    return { id: 'unknown', name: 'Unknown', type: 'unknown' };
  }

  /**
   * Find targets that would become available if prerequisite was met.
   * @private
   */
  static _findNearEligiblePaths(actor, candidate, context) {
    // planned: Phase 4 Work Package F - target registry
    // For now, return empty array; will be populated with explicit targets
    return [];
  }

  /**
   * Project what becomes available/blocked if candidate is added.
   * @private
   */
  static _projectWithCandidate(actor, candidate, context) {
    const result = {
      unlocks: [],
      blocks: [],
      preserves: [],
    };

    // Placeholder for hypothetical projection
    // Would use projection engine + forecast to determine cascading effects
    // planned: Phase 4 Work Package C - forecast-aware scoring

    return result;
  }

  /**
   * Evaluate impact on prestige class eligibility.
   * @private
   */
  static _evaluatePrestigeImpact(actor, candidate, context) {
    // planned: Integrate prestige-delay-calculator results
    // For now, return null (no prestige impact)
    return null;
  }

  /**
   * Evaluate path to a prestige class target.
   * @private
   */
  static _evaluatePrestigeClassPath(targetId, projectedContext, maxLevels) {
    // planned: Integrate with prestige-delay-calculator
    // Simulate forward levels and check eligibility
    return null;
  }

  /**
   * Score a forecast result for ranking purposes.
   * @private
   */
  static _scoreForecast(forecast, context) {
    if (!forecast) return 0;

    let score = 0;

    // Legal now is baseline
    if (forecast.legalNow) {
      score += 10;
    }

    // Unlocks matter
    if (forecast.unlocks && forecast.unlocks.length > 0) {
      score += forecast.unlocks.length * 5;
    }

    // Delays are negative
    const delayCount = Object.keys(forecast.delays || {}).length;
    if (delayCount > 0) {
      score -= delayCount * 3;
    }

    // Warnings reduce score
    if (forecast.warnings && forecast.warnings.length > 0) {
      score -= forecast.warnings.length * 2;
    }

    return score;
  }
}
