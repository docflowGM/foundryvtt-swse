/**
 * Rollout Controller — Phase 7 Step 3
 *
 * Applies rollout settings to the progression system.
 * Controls:
 * - Which features are exposed in the shell
 * - Which entry points are available
 * - Recovery and fallback behavior
 * - UI visibility based on settings
 *
 * Design principle: Single unified system, controlled exposure.
 * No alternate build engines, just feature gates on the main pipeline.
 */

import { RolloutSettings } from './rollout-settings.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class RolloutController {
  /**
   * Determine which progression shell entry point to use for an actor.
   *
   * @param {Actor} actor - The actor to build
   * @returns {Object} Entry point spec: { type, shell, mode, fallbackAvailable }
   */
  static determineEntryPoint(actor) {
    const mode = RolloutSettings.getRolloutMode();
    const useUnified = RolloutSettings.shouldUseUnifiedProgressionByDefault();
    const legacyAvailable = RolloutSettings.shouldSupportLegacyFallback();

    swseLogger.log(`[RolloutController] Determining entry point for ${actor.name}`, {
      rolloutMode: mode,
      useUnified,
      legacyAvailable,
    });

    // Check if actor should use unified progression
    const shouldUseUnified = this._canUseUnifiedProgression(actor);

    return {
      type: shouldUseUnified ? 'unified-progression' : 'legacy-system',
      shell: shouldUseUnified ? 'ProgressionShell' : 'LegacyChargen',
      mode,
      fallbackAvailable: legacyAvailable,
      reason: this._getEntryPointReason(actor, shouldUseUnified),
    };
  }

  /**
   * Check if unified progression can be used for an actor.
   * @private
   */
  static _canUseUnifiedProgression(actor) {
    const mode = RolloutSettings.getRolloutMode();

    // In "legacy-fallback" mode, unified is not primary
    if (mode === 'legacy-fallback') {
      return false;
    }

    // Check if actor type is supported by unified system
    const actorType = actor.type;
    const subtype = actor.system?.details?.subtype;

    const supportedTypes = ['character']; // Droid support is PARTIAL, NPC/Follower are STRUCTURAL
    const partiallySupported = ['droid'];

    if (!supportedTypes.includes(actorType) && !partiallySupported.includes(actorType)) {
      swseLogger.info(`[RolloutController] ${actorType} not supported by unified progression, using legacy`);
      return false;
    }

    // If partially supported (droid), check if support is enabled
    if (partiallySupported.includes(actorType)) {
      // For now, allow droid with support warning
      return true;
    }

    return true;
  }

  /**
   * Get reason for entry point decision (for logging).
   * @private
   */
  static _getEntryPointReason(actor, isUnified) {
    if (isUnified) {
      return 'Unified progression enabled as primary pipeline';
    } else {
      return `Legacy system: ${actor.type} not fully supported by unified system`;
    }
  }

  /**
   * Configure shell based on rollout settings.
   * Called after shell is created, before render.
   *
   * @param {ProgressionShell} shell - The shell to configure
   */
  static configureShell(shell) {
    if (!shell) return;

    shell._rolloutConfig = {
      // Features
      templatesEnabled: RolloutSettings.isFeatureEnabled('templates'),
      advisoryEnabled: RolloutSettings.isFeatureEnabled('advisory'),
      forecastEnabled: RolloutSettings.isFeatureEnabled('forecast'),
      explainabilityEnabled: RolloutSettings.isFeatureEnabled('explainability'),
      templateProvenanceEnabled: RolloutSettings.isFeatureEnabled('template-provenance'),
      supportWarningsEnabled: RolloutSettings.isFeatureEnabled('support-warnings'),

      // Recovery
      sessionResumeEnabled: RolloutSettings.isFeatureEnabled('session-resume'),
      applyRetryEnabled: RolloutSettings.isFeatureEnabled('apply-retry'),

      // Debug
      debugToolsEnabled: RolloutSettings.isFeatureEnabled('debug-tools'),

      // Mode
      rolloutMode: RolloutSettings.getRolloutMode(),
    };

    swseLogger.log('[RolloutController] Configured shell with rollout settings', shell._rolloutConfig);

    // Apply configuration
    this._applyFeatureGates(shell);
    this._applyUIVisibility(shell);
    this._applyRecoveryBehavior(shell);
  }

  /**
   * Apply feature gates (enable/disable major systems).
   * @private
   */
  static _applyFeatureGates(shell) {
    // If templates disabled, hide template mode UI
    if (!shell._rolloutConfig.templatesEnabled) {
      shell._hideTemplateSelection = true;
      swseLogger.log('[RolloutController] Template mode hidden (disabled)');
    }

    // If advisory disabled, don't show suggestions
    if (!shell._rolloutConfig.advisoryEnabled) {
      shell._hideAdvisory = true;
      swseLogger.log('[RolloutController] Advisory system hidden (disabled)');
    }

    // If forecast disabled, don't show projections
    if (!shell._rolloutConfig.forecastEnabled) {
      shell._hideForecast = true;
      swseLogger.log('[RolloutController] Forecast hidden (disabled)');
    }
  }

  /**
   * Apply UI visibility based on explainability settings.
   * @private
   */
  static _applyUIVisibility(shell) {
    // Hide explainability badges if disabled
    if (!shell._rolloutConfig.explainabilityEnabled) {
      shell._hideExplanationBadges = true;
      swseLogger.log('[RolloutController] Explanation badges hidden (disabled)');
    }

    // Hide template provenance indicators if disabled
    if (!shell._rolloutConfig.templateProvenanceEnabled) {
      shell._hideTemplateProvenance = true;
      swseLogger.log('[RolloutController] Template provenance hidden (disabled)');
    }

    // Hide support warnings if disabled
    if (!shell._rolloutConfig.supportWarningsEnabled) {
      shell._hideSupportWarnings = true;
      swseLogger.log('[RolloutController] Support warnings hidden (disabled)');
    }

    // Show debug tools if enabled
    if (shell._rolloutConfig.debugToolsEnabled) {
      shell._showDebugTools = true;
      swseLogger.log('[RolloutController] Debug tools visible (enabled)');
    }
  }

  /**
   * Apply recovery behavior based on settings.
   * @private
   */
  static _applyRecoveryBehavior(shell) {
    // If session resume disabled, always start fresh
    if (!shell._rolloutConfig.sessionResumeEnabled) {
      shell._allowSessionResume = false;
      swseLogger.log('[RolloutController] Session resume disabled');
    }

    // If apply retry disabled, stop on failure
    if (!shell._rolloutConfig.applyRetryEnabled) {
      shell._allowApplyRetry = false;
      swseLogger.log('[RolloutController] Apply retry disabled');
    }
  }

  /**
   * Get warning banner for partial-support features.
   *
   * @param {string} featurePath - Feature being used (e.g., 'droid', 'prestige-class')
   * @returns {Object|null} Warning to display, or null if no warning needed
   */
  static getSupportWarningForFeature(featurePath) {
    if (!RolloutSettings.isFeatureEnabled('support-warnings')) {
      return null; // Support warnings disabled
    }

    const supportLevels = {
      'droid': 'PARTIAL',
      'prestige-class': 'PARTIAL',
      'follower': 'STRUCTURAL',
      'nonheroic': 'STRUCTURAL',
      'npc': 'STRUCTURAL',
      'near-human': 'PARTIAL',
      'vehicle-operations': 'PARTIAL',
      'starship-operations': 'PARTIAL',
    };

    const level = supportLevels[featurePath];

    if (!level) return null;

    if (level === 'PARTIAL') {
      return {
        severity: 'caution',
        title: 'Feature Support',
        message: `This feature is partially supported. Some edge cases may not work correctly.`,
        hint: 'Please report any issues you encounter.',
      };
    }

    if (level === 'STRUCTURAL') {
      return {
        severity: 'warning',
        title: 'Experimental Feature',
        message: `This feature is still being integrated into the unified progression system.`,
        hint: 'This is experimental. Use with caution and check the results carefully.',
      };
    }

    return null;
  }

  /**
   * Check if fallback to legacy is appropriate.
   *
   * @param {Error} error - Error that occurred in unified system
   * @returns {boolean} True if fallback is recommended
   */
  static shouldFallbackToLegacy(error) {
    if (!RolloutSettings.shouldSupportLegacyFallback()) {
      return false; // Legacy not available
    }

    // Only fallback on certain error types
    const fallbackableErrors = [
      'VALIDATION_ERROR',
      'MUTATION_ERROR',
      'PREREQUISITE_ERROR',
    ];

    const isErrorFallbackable = fallbackableErrors.includes(error.type);

    swseLogger.warn('[RolloutController] Evaluating fallback', {
      errorType: error.type,
      isErrorFallbackable,
      legacyAvailable: RolloutSettings.shouldSupportLegacyFallback(),
    });

    return isErrorFallbackable;
  }

  /**
   * Generate a rollout status report (for admin panel).
   * @returns {Object} Current rollout state
   */
  static generateStatusReport() {
    return RolloutSettings.generateRolloutReport();
  }

  /**
   * Validate rollout configuration for consistency.
   * @returns {Object} Validation result with any warnings
   */
  static validateRolloutConfig() {
    const result = {
      valid: true,
      warnings: [],
      info: [],
    };

    const mode = RolloutSettings.getRolloutMode();
    const features = RolloutSettings.getActiveFeatures();

    // Check for inconsistencies
    if (mode === 'default' && !features.templates) {
      result.warnings.push('Rollout mode is "default" but templates are disabled. GMs may expect template support.');
    }

    if (mode === 'internal' && features['legacy-entry-points']) {
      result.info.push('Legacy entry points are visible in "internal" mode. Consider disabling.');
    }

    if (mode === 'beta' && !features['support-warnings']) {
      result.info.push('Support warnings are disabled in "beta" mode. Players may not realize partial features.');
    }

    // Check that at least some build capability is enabled
    const hasBuildCapability = true; // Unified system is always available
    if (!hasBuildCapability) {
      result.valid = false;
      result.warnings.push('No build system is enabled. Players cannot create characters.');
    }

    swseLogger.log('[RolloutController] Validated rollout config', result);

    return result;
  }
}
