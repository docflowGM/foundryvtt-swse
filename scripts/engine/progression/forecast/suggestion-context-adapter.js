/**
 * Suggestion Context Adapter — Phase 4 Work Package B
 *
 * Builds a unified, canonical context object that suggestion engines consume.
 * Replaces ad-hoc context assembly scattered across individual engines.
 *
 * Source of Truth:
 * - progression session (selections from Phase 1)
 * - projected character (derived model from Phase 3)
 * - current node (from spine/registry)
 * - actor snapshot (immutable baseline)
 * - forecast data (from ForecastEngine)
 *
 * Output Schema:
 * {
 *   mode: 'chargen' | 'levelup',
 *   subtype: 'actor' | 'npc' | 'droid',
 *   currentStepId: string,
 *   currentNode: ProgressionNode,
 *   selectionKey: string,  // What we're selecting (feats, talents, etc.)
 *
 *   // Sources
 *   progressionSession: ProgressionSession,
 *   projectedCharacter: ProjectedCharacter,
 *   actorSnapshot: Actor,
 *
 *   // Available options (pre-filtered to legal + visible)
 *   legalOptions: [],
 *   visibleOptions: [],
 *
 *   // Forecast context
 *   forecastByOption: {
 *     [optionId]: ForecastResult
 *   },
 *
 *   // Build signals (explicit + inferred)
 *   buildSignals: {
 *     explicit: {
 *       declaredArchetypes: [],
 *       declaredTargets: [],
 *       surveyAnswers: {}
 *     },
 *     inferred: {
 *       inferredArchetypes: [],
 *       inferredRoles: [],
 *       mentorSignals: []
 *     }
 *   },
 *
 *   // Contextual constraints
 *   constraints: {
 *     totalPicksAvailable: number,
 *     picksRemaining: number,
 *     lockedChoices: [],
 *     restrictedOptions: []
 *   }
 * }
 */

import { ForecastEngine } from './forecast-engine.js';
import { PrerequisiteChecker } from '/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class SuggestionContextAdapter {
  /**
   * Build canonical suggestion context from sources.
   *
   * @param {Object} shell - ProgressionShell with all context
   * @param {Array} availableOptions - Raw options (unfiltered)
   * @param {Object} options - Additional options
   * @returns {Object} Canonical suggestion context
   */
  static buildSuggestionContext(shell, availableOptions = [], options = {}) {
    try {
      const context = {
        // Execution environment
        mode: shell.mode || 'chargen',
        subtype: shell.actor?.type === 'npc' ? 'npc' : (shell.isDroid ? 'droid' : 'actor'),
        currentStepId: shell.steps?.[shell.currentStepIndex]?.stepId,
        currentNode: shell.currentNode || null,
        selectionKey: options.selectionKey || null,

        // Sources of truth
        progressionSession: shell.progressionSession,
        projectedCharacter: shell.progressionSession?.currentProjection,
        actorSnapshot: shell.actor,

        // Filtered options
        legalOptions: [],
        visibleOptions: [],

        // Forecast
        forecastByOption: {},

        // Build signals
        buildSignals: this._extractBuildSignals(shell),

        // Constraints
        constraints: this._extractConstraints(shell, availableOptions),
      };

      // Phase 1: Filter available options by legality
      context.legalOptions = this._filterByLegality(availableOptions, shell);
      context.visibleOptions = this._filterByVisibility(context.legalOptions, shell);

      // Phase 2: Build forecast for each legal option
      context.forecastByOption = this._buildForecastMap(
        context.legalOptions,
        shell,
        context.buildSignals
      );

      swseLogger.debug('[SuggestionContextAdapter] Context built:', {
        mode: context.mode,
        currentStep: context.currentStepId,
        legalOptions: context.legalOptions.length,
        visibleOptions: context.visibleOptions.length,
        buildSignalsCount: Object.keys(context.buildSignals).length,
      });

      return context;
    } catch (err) {
      swseLogger.error('[SuggestionContextAdapter] Error building context:', err);
      // Return minimal valid context on error
      return {
        mode: shell?.mode || 'chargen',
        subtype: 'actor',
        currentStepId: null,
        currentNode: null,
        selectionKey: null,
        progressionSession: shell?.progressionSession,
        projectedCharacter: null,
        actorSnapshot: shell?.actor,
        legalOptions: [],
        visibleOptions: [],
        forecastByOption: {},
        buildSignals: { explicit: {}, inferred: {} },
        constraints: { totalPicksAvailable: 0, picksRemaining: 0, lockedChoices: [], restrictedOptions: [] },
      };
    }
  }

  /**
   * Extract explicit and inferred build signals from session/projection.
   * @private
   */
  static _extractBuildSignals(shell) {
    const signals = {
      explicit: {
        declaredArchetypes: [],
        declaredTargets: [],
        surveyAnswers: {},
      },
      inferred: {
        inferredArchetypes: [],
        inferredRoles: [],
        mentorSignals: [],
      },
    };

    const completedSignals = this._extractCompletedSurveySignals(shell);
    signals.explicit.surveyAnswers = completedSignals.surveyAnswers;
    signals.explicit.declaredArchetypes = completedSignals.declaredArchetypes;
    signals.explicit.declaredTargets = completedSignals.declaredTargets;

    // Infer archetypes from projected character
    if (shell.progressionSession?.currentProjection?.identity?.class) {
      signals.inferred.inferredArchetypes.push(
        this._inferArchetypeFromClass(shell.progressionSession.currentProjection.identity.class)
      );
    }

    return signals;
  }



  static _extractCompletedSurveySignals(shell) {
    const surveyAnswers = {};
    const declaredArchetypes = [];
    const declaredTargets = [];
    const addCompletedSurvey = (key, survey) => {
      if (!survey || survey.completed !== true) return;
      surveyAnswers[key] = survey.answers || survey;
      const tags = survey.intentTags || survey.mergedBias || {};
      for (const value of tags.archetypeTags || tags.roleBias || []) {
        if (value && !declaredArchetypes.includes(value)) declaredArchetypes.push(value);
      }
      for (const value of tags.prestigeClassTargets || tags.targetTags || []) {
        if (value && !declaredTargets.includes(value)) declaredTargets.push(value);
      }
    };

    const l1Session = shell.progressionSession?.draftSelections?.survey;
    addCompletedSurvey('l1-current', l1Session);
    for (const [key, survey] of Object.entries(shell.actor?.system?.swse?.surveyResponses || {})) {
      addCompletedSurvey(`l1-${key}`, survey);
    }
    for (const [key, survey] of Object.entries(shell.progressionSession?.draftSelections?.classSurveys || {})) {
      addCompletedSurvey(`class-${key}`, survey);
    }
    for (const [key, survey] of Object.entries(shell.actor?.system?.swse?.classSurveyResponses || {})) {
      addCompletedSurvey(`class-${key}`, survey);
    }
    const prestigeSession = shell.progressionSession?.draftSelections?.prestigeSurvey;
    addCompletedSurvey(`prestige-${prestigeSession?.classId || 'current'}`, prestigeSession);
    for (const [key, survey] of Object.entries(shell.actor?.system?.swse?.prestigeSurveyResponses || {})) {
      addCompletedSurvey(`prestige-${key}`, survey);
    }

    return { surveyAnswers, declaredArchetypes, declaredTargets };
  }

  /**
   * Extract constraints (pick availability, locks, restrictions).
   * @private
   */
  static _extractConstraints(shell, availableOptions) {
    const constraints = {
      totalPicksAvailable: availableOptions.length,
      picksRemaining: this._calculatePicksRemaining(shell),
      lockedChoices: [],
      restrictedOptions: [],
    };

    // planned: Phase 4 Work Package D
    // Extract from reconciliation state, dirty nodes, etc.

    return constraints;
  }

  /**
   * Filter options by legality using AbilityEngine.
   * @private
   */
  static _filterByLegality(options, shell) {
    if (!Array.isArray(options)) return [];

    return options.filter(option => {
      try {
        // Use PrerequisiteChecker for legality
        const result = PrerequisiteChecker.checkFeatPrerequisites(
          shell.actor,
          option
        );
        return result.met === true;
      } catch (err) {
        swseLogger.warn('[SuggestionContextAdapter] Error checking legality:', err);
        // If check fails, exclude the option (fail safe)
        return false;
      }
    });
  }

  /**
   * Filter options by visibility (hidden/restricted options removed).
   * @private
   */
  static _filterByVisibility(options, shell) {
    if (!Array.isArray(options)) return [];

    return options.filter(option => {
      // planned: Phase 4 - check if option is hidden due to:
      // - Dirty node (invalidated by prior change)
      // - Restricted to specific subtype (droid-only, npc-only, etc.)
      // - Requires completed prerequisites (not just met, but node visited)

      // For now, all legal options are visible
      return true;
    });
  }

  /**
   * Build forecast map for all legal options.
   * @private
   */
  static _buildForecastMap(legalOptions, shell, buildSignals) {
    const forecastMap = {};

    for (const option of legalOptions) {
      try {
        const forecast = ForecastEngine.forecastAcquisition(
          shell.actor,
          option,
          {
            progressionSession: shell.progressionSession,
            projectedCharacter: shell.progressionSession?.currentProjection,
            buildSignals,
            mode: shell.mode || 'chargen',
          }
        );

        const optionId = option.id || option.name || option;
        forecastMap[optionId] = forecast;
      } catch (err) {
        swseLogger.warn('[SuggestionContextAdapter] Error forecasting option:', err);
        // Continue with other options
      }
    }

    return forecastMap;
  }

  /**
   * Infer archetype from class selection.
   * @private
   */
  static _inferArchetypeFromClass(className) {
    // planned: Wire to ArchetypeRegistry for proper inference
    // Simple placeholder for now
    if (!className) return null;

    const classToArchetypeMap = {
      'Soldier': 'Warrior',
      'Scout': 'Rogue',
      'Scoundrel': 'Rogue',
      'Jedi': 'Force User',
      'Force Adept': 'Force User',
    };

    return classToArchetypeMap[className] || null;
  }

  /**
   * Calculate remaining picks for current step.
   * @private
   */
  static _calculatePicksRemaining(shell) {
    // planned: Get from current step plugin (getRemainingPicks)
    // For now, return 1 as placeholder
    return 1;
  }
}
