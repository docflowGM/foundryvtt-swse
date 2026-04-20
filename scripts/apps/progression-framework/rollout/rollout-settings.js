/**
 * Rollout Settings — Phase 7 Step 3
 *
 * Centralized feature flag registry for controlling progression system rollout.
 * Goals:
 * - Enable/disable new build modes without code changes
 * - Control template mode exposure
 * - Manage debug/diagnostic overlays
 * - Show/hide support-level warnings
 * - Define rollout modes (internal → GM opt-in → beta → default)
 *
 * Design:
 * - Single source of truth for all feature gates
 * - No split-brain behavior (unified system, not alternate paths)
 * - Clear defaults (safe by default)
 * - Settings are user-facing (GM can change)
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';

export class RolloutSettings {
  /**
   * Initialize all rollout settings.
   * Call during module init, before creating any progression shells.
   */
  static async registerSettings() {
    // -----------------------------------------------------------------------
    // MODE SELECTION: Which build system to use
    // -----------------------------------------------------------------------

    game.settings.register('foundryvtt-swse', 'progression-rollout-mode', {
      name: 'Character Progression: Rollout Mode',
      hint: 'Controls which build systems are available. "Default" enables the unified progression system as the primary build pipeline.',
      scope: 'world',
      config: true,
      type: String,
      choices: {
        'internal': 'Internal/Development (unified system only)',
        'gm-opt-in': 'GM Opt-In (legacy available, unified opt-in)',
        'beta': 'Beta (unified is default, legacy available)',
        'default': 'Default (unified system is the primary pipeline)',
        'legacy-fallback': 'Legacy Fallback (for troubleshooting)',
      },
      default: 'beta',
    });

    // -----------------------------------------------------------------------
    // FEATURE GATES: Enable/disable specific progression features
    // -----------------------------------------------------------------------

    game.settings.register('foundryvtt-swse', 'progression-enable-templates', {
      name: 'Character Progression: Enable Template Mode',
      hint: 'Allow players to use packaged build templates and fast-build flows. When disabled, only manual build is available.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
    });

    game.settings.register('foundryvtt-swse', 'progression-enable-advisory', {
      name: 'Character Progression: Enable Advisory System',
      hint: 'Show mentor suggestions, signal alignment, and build guidance. When disabled, players make all choices manually.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
    });

    game.settings.register('foundryvtt-swse', 'progression-enable-forecast', {
      name: 'Character Progression: Enable Build Forecast',
      hint: 'Show projections of character outcomes (damage, defense, synergies) as player makes choices.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
    });

    // -----------------------------------------------------------------------
    // PLAYER-FACING CONTROLS: Explanation and transparency
    // -----------------------------------------------------------------------

    game.settings.register('foundryvtt-swse', 'progression-show-explainability', {
      name: 'Character Progression: Show Explanations',
      hint: 'Display badges and tooltips explaining why steps are present, why suggestions are made, and why choices became invalid.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
    });

    game.settings.register('foundryvtt-swse', 'progression-show-template-provenance', {
      name: 'Character Progression: Show Template Provenance',
      hint: 'Indicate which choices came from the selected template vs. player choice (locked, suggested, etc.).',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
    });

    // -----------------------------------------------------------------------
    // GM/ADMIN CONTROLS: Diagnostics and support level visibility
    // -----------------------------------------------------------------------

    game.settings.register('foundryvtt-swse', 'progression-show-support-warnings', {
      name: 'Character Progression: Show Support Level Warnings',
      hint: 'Warn GMs/players when using partial-support or experimental features (droids, followers, etc.).',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
    });

    game.settings.register('foundryvtt-swse', 'progression-enable-debug-tools', {
      name: 'Character Progression: Enable Debug Tools',
      hint: 'Show debug panels, node activation traces, and detailed error information. For GMs and content maintainers only.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
    });

    game.settings.register('foundryvtt-swse', 'progression-log-level', {
      name: 'Character Progression: Logging Level',
      hint: 'Control verbosity of progression system logs (for debugging).',
      scope: 'world',
      config: true,
      type: String,
      choices: {
        'error': 'Errors only',
        'warn': 'Warnings and errors',
        'info': 'Info, warnings, and errors',
        'debug': 'Full debug logging',
      },
      default: 'warn',
    });

    // -----------------------------------------------------------------------
    // RECOVERY AND RESILIENCE
    // -----------------------------------------------------------------------

    game.settings.register('foundryvtt-swse', 'progression-allow-session-resume', {
      name: 'Character Progression: Allow Session Resume',
      hint: 'Let players resume in-progress progression sessions if they reopen the build interface. When disabled, always start fresh.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
    });

    game.settings.register('foundryvtt-swse', 'progression-allow-apply-retry', {
      name: 'Character Progression: Allow Apply Retry',
      hint: 'If character creation fails, allow players to fix issues and retry. When disabled, show error and stop.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true,
    });

    // -----------------------------------------------------------------------
    // LEGACY COMPATIBILITY: Bridge to old systems
    // -----------------------------------------------------------------------

    game.settings.register('foundryvtt-swse', 'progression-legacy-fallback-enabled', {
      name: 'Character Progression: Enable Legacy Fallback',
      hint: 'If unified progression fails, allow fallback to legacy build systems. For emergency use only.',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
    });

    game.settings.register('foundryvtt-swse', 'progression-legacy-entry-points-visible', {
      name: 'Character Progression: Show Legacy Entry Points',
      hint: 'Display old "Quick Build" and legacy chargen buttons alongside the new unified interface (for migration period only).',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
    });

    swseLogger.log('[RolloutSettings] Registered all rollout settings');
  }

  /**
   * Get the current rollout mode.
   * @returns {'internal' | 'gm-opt-in' | 'beta' | 'default' | 'legacy-fallback'}
   */
  static getRolloutMode() {
    return HouseRuleService.getString('progression-rollout-mode', 'beta');
  }

  /**
   * Check if a feature is enabled.
   * @param {string} featureName - Feature to check
   * @returns {boolean}
   */
  static isFeatureEnabled(featureName) {
    switch (featureName) {
      case 'templates':
        return HouseRuleService.getBoolean('progression-enable-templates', true);
      case 'advisory':
        return HouseRuleService.getBoolean('progression-enable-advisory', true);
      case 'forecast':
        return HouseRuleService.getBoolean('progression-enable-forecast', true);
      case 'explainability':
        return HouseRuleService.getBoolean('progression-show-explainability', true);
      case 'template-provenance':
        return HouseRuleService.getBoolean('progression-show-template-provenance', true);
      case 'support-warnings':
        return HouseRuleService.getBoolean('progression-show-support-warnings', true);
      case 'debug-tools':
        return HouseRuleService.getBoolean('progression-enable-debug-tools', false);
      case 'session-resume':
        return HouseRuleService.getBoolean('progression-allow-session-resume', true);
      case 'apply-retry':
        return HouseRuleService.getBoolean('progression-allow-apply-retry', true);
      case 'legacy-fallback':
        return HouseRuleService.getBoolean('progression-legacy-fallback-enabled', false);
      case 'legacy-entry-points':
        return HouseRuleService.getBoolean('progression-legacy-entry-points-visible', false);
      default:
        return false;
    }
  }

  /**
   * Check if unified progression should be the default entry point.
   * @returns {boolean}
   */
  static shouldUseUnifiedProgressionByDefault() {
    const mode = this.getRolloutMode();
    return mode === 'beta' || mode === 'default' || mode === 'internal';
  }

  /**
   * Check if legacy systems should still be available.
   * @returns {boolean}
   */
  static shouldSupportLegacyFallback() {
    const mode = this.getRolloutMode();
    return mode === 'gm-opt-in' || mode === 'beta' || mode === 'legacy-fallback' ||
           this.isFeatureEnabled('legacy-fallback');
  }

  /**
   * Get all active feature toggles (for UI display).
   * @returns {Object} Feature name → enabled
   */
  static getActiveFeatures() {
    return {
      'templates': this.isFeatureEnabled('templates'),
      'advisory': this.isFeatureEnabled('advisory'),
      'forecast': this.isFeatureEnabled('forecast'),
      'explainability': this.isFeatureEnabled('explainability'),
      'template-provenance': this.isFeatureEnabled('template-provenance'),
      'support-warnings': this.isFeatureEnabled('support-warnings'),
      'debug-tools': this.isFeatureEnabled('debug-tools'),
      'session-resume': this.isFeatureEnabled('session-resume'),
      'apply-retry': this.isFeatureEnabled('apply-retry'),
    };
  }

  /**
   * Generate a settings report (for admin diagnostics).
   * @returns {Object} Complete rollout state
   */
  static generateRolloutReport() {
    return {
      rolloutMode: this.getRolloutMode(),
      timestamp: new Date().toISOString(),
      features: this.getActiveFeatures(),
      behavior: {
        useUnifiedByDefault: this.shouldUseUnifiedProgressionByDefault(),
        supportLegacyFallback: this.shouldSupportLegacyFallback(),
        debugToolsEnabled: this.isFeatureEnabled('debug-tools'),
      },
      recommendations: this._generateRecommendations(),
    };
  }

  /**
   * Generate recommendations based on current settings.
   * @private
   */
  static _generateRecommendations() {
    const recommendations = [];
    const mode = this.getRolloutMode();

    // Check for inconsistent settings
    if (mode === 'internal' && this.isFeatureEnabled('legacy-entry-points')) {
      recommendations.push({
        level: 'info',
        message: 'Legacy entry points are visible in "internal" mode. Consider disabling for clarity.',
      });
    }

    if (mode === 'default' && !this.isFeatureEnabled('templates')) {
      recommendations.push({
        level: 'warn',
        message: 'Templates are disabled but progression is default. GMs may expect template support.',
      });
    }

    if (!this.isFeatureEnabled('debug-tools') && this.isFeatureEnabled('legacy-fallback')) {
      recommendations.push({
        level: 'info',
        message: 'Debug tools are disabled but legacy fallback is enabled. Enable debug tools for troubleshooting.',
      });
    }

    if (this.isFeatureEnabled('support-warnings') && mode === 'internal') {
      recommendations.push({
        level: 'info',
        message: 'Support warnings are shown in "internal" mode. Consider disabling for cleaner dev experience.',
      });
    }

    return recommendations;
  }
}
