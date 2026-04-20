/**
 * Legacy Entry Point Manager — Phase 7 Steps 3-4
 *
 * Manages migration off legacy build systems:
 * - Identifies remaining legacy entry points
 * - Wraps legacy calls to unified progression
 * - Shows deprecation warnings
 * - Tracks deprecation status for each entry point
 *
 * Goals:
 * - Retire old systems cleanly
 * - Provide grace period with clear warnings
 * - Redirect users to new system
 * - Support fallback for compatibility
 */

import { RolloutSettings } from './rollout-settings.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { launchProgression } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js';

export class LegacyEntryPointManager {
  /**
   * Registry of all known legacy entry points.
   * Maps old entry points to their new equivalents in unified system.
   */
  static LEGACY_ENTRY_POINTS = {
    'chargen-main': {
      label: 'Character Generation (Old)',
      path: 'scripts/apps/chargen/chargen-main.js',
      type: 'chargen',
      status: 'deprecated', // 'active', 'deprecated', 'retired'
      replacedBy: 'ProgressionShell (chargen mode)',
      deprecatedSince: '1.0.0',
      retireDate: null, // Will retire in 1.5.0
      showWarning: true,
    },
    'levelup-main': {
      label: 'Level Up (Old)',
      path: 'scripts/apps/levelup/levelup-main.js',
      type: 'levelup',
      status: 'deprecated',
      replacedBy: 'ProgressionShell (levelup mode)',
      deprecatedSince: '1.0.0',
      retireDate: null,
      showWarning: true,
    },
    'quick-build': {
      label: 'Quick Build (Old)',
      path: 'scripts/apps/quickbuild/',
      type: 'quick-build',
      status: 'deprecated',
      replacedBy: 'ProgressionShell with templates',
      deprecatedSince: '1.0.0',
      retireDate: null,
      showWarning: true,
    },
    'direct-actor-mutation': {
      label: 'Direct Actor Mutation (Legacy API)',
      path: 'ActorEngine (legacy methods)',
      type: 'api',
      status: 'deprecated',
      replacedBy: 'MutationPlan + ProgressionReconciler',
      deprecatedSince: '1.0.0',
      retireDate: null,
      showWarning: false, // Only show in debug mode
    },
  };

  /**
   * Check if a legacy entry point is being used.
   * @param {string} entryPointId - ID from LEGACY_ENTRY_POINTS
   * @returns {boolean}
   */
  static isLegacyEntryPointActive(entryPointId) {
    const entry = this.LEGACY_ENTRY_POINTS[entryPointId];
    if (!entry) return false;

    // Check rollout settings
    if (entry.status === 'retired') {
      return false; // Entry point no longer exists
    }

    if (entry.status === 'deprecated') {
      const shouldShowLegacy = RolloutSettings.isFeatureEnabled('legacy-entry-points');
      return shouldShowLegacy; // Only show if explicitly enabled
    }

    return true; // Active entry points are always available
  }

  /**
   * Get deprecation warning for a legacy entry point.
   * @param {string} entryPointId - ID from LEGACY_ENTRY_POINTS
   * @returns {Object|null} Warning details, or null if no warning
   */
  static getDeprecationWarning(entryPointId) {
    const entry = this.LEGACY_ENTRY_POINTS[entryPointId];
    if (!entry || !entry.showWarning || entry.status === 'retired') {
      return null;
    }

    return {
      severity: entry.status === 'deprecated' ? 'warning' : 'info',
      title: `${entry.label} is deprecated`,
      message: `This system is being phased out. Please use "${entry.replacedBy}" instead.`,
      hint: entry.retireDate
        ? `This will be removed on ${entry.retireDate}.`
        : 'A new unified build system is now available.',
      action: {
        label: 'Learn more',
        url: '/help/progression',
      },
    };
  }

  /**
   * Wrap a legacy entry point call to unified progression.
   *
   * @param {Actor} actor - Actor being built
   * @param {string} legacyType - 'chargen', 'levelup', 'quick-build'
   * @returns {Promise} Unified progression shell/flow
   */
  static async migrateToUnifiedProgression(actor, legacyType) {
    swseLogger.warn(`[LegacyEntryPointManager] Migrating ${legacyType} for ${actor.name}`, {
      actor: actor.name,
      legacyType,
    });

    // Show migration warning to user
    this._showMigrationDialog(actor, legacyType);

    return launchProgression(actor, {
      source: `legacy-entry-point.${legacyType}`
    });
  }

  /**
   * Show dialog explaining migration.
   * @private
   */
  static _showMigrationDialog(actor, legacyType) {
    const entry = Object.values(this.LEGACY_ENTRY_POINTS)
      .find(e => e.type === legacyType);

    if (!entry) return;

    const warning = this.getDeprecationWarning(Object.keys(this.LEGACY_ENTRY_POINTS)
      .find(key => this.LEGACY_ENTRY_POINTS[key].type === legacyType));

    if (!warning) return;

    swseLogger.info(`[LegacyEntryPointManager] Showing migration warning for ${entry.label}`, warning);

    // In a real implementation, this would show a UI dialog or toast
    // For now, just log it
  }

  /**
   * Get all legacy entry points and their status.
   * Useful for admin/GM interface.
   *
   * @returns {Object[]} Array of entry point status objects
   */
  static getLegacyEntryPointStatus() {
    return Object.entries(this.LEGACY_ENTRY_POINTS).map(([id, entry]) => ({
      id,
      ...entry,
      isActive: this.isLegacyEntryPointActive(id),
      deprecationWarning: this.getDeprecationWarning(id),
    }));
  }

  /**
   * Generate deprecation report (for roadmap docs).
   * @returns {Object} Status of all legacy systems
   */
  static generateDeprecationReport() {
    const now = new Date();
    const status = {
      generatedAt: now.toISOString(),
      entryPoints: [],
      summary: {
        activeCount: 0,
        deprecatedCount: 0,
        retiredCount: 0,
      },
    };

    Object.entries(this.LEGACY_ENTRY_POINTS).forEach(([id, entry]) => {
      const isActive = this.isLegacyEntryPointActive(id);

      status.entryPoints.push({
        id,
        label: entry.label,
        status: entry.status,
        isVisible: isActive,
        replacedBy: entry.replacedBy,
        deprecatedSince: entry.deprecatedSince,
        retireDate: entry.retireDate || 'TBD',
        migrationGuide: `See MIGRATION.md for ${entry.type}`,
      });

      status.summary[`${entry.status}Count`]++;
    });

    return status;
  }

  /**
   * Check if all legacy entry points are retired.
   * (Phase 7 complete condition)
   *
   * @returns {boolean}
   */
  static areAllLegacyEntryPointsRetired() {
    return Object.values(this.LEGACY_ENTRY_POINTS)
      .every(entry => entry.status === 'retired');
  }

  /**
   * Get migration checklist for content creators/GMs.
   * @returns {Object[]} Migration tasks
   */
  static getMigrationChecklist() {
    return [
      {
        title: 'Switch to Unified Progression',
        status: 'recommended',
        description: 'The unified progression system is now the default. You can use it for character creation and level-up.',
        steps: [
          'Open a character sheet',
          'Click "Create Character" or "Level Up"',
          'Use the new unified interface',
        ],
      },
      {
        title: 'Enable Legacy Entry Points (if needed)',
        status: 'optional',
        description: 'If you need to use the old system for any reason, you can enable legacy entry points.',
        steps: [
          'Open system settings',
          'Search for "Legacy Entry Points"',
          'Enable "Show Legacy Entry Points"',
          'Old buttons will appear alongside the new interface',
        ],
      },
      {
        title: 'Test Template Mode',
        status: 'recommended',
        description: 'Try the new template-based fast-build feature.',
        steps: [
          'Open character creation',
          'Select a template (e.g., "Soldier", "Jedi")',
          'Review the guided fast-build flow',
          'Compare to manual build for power-building',
        ],
      },
      {
        title: 'Report Issues',
        status: 'important',
        description: 'If anything breaks, report it with details about what you were doing.',
        steps: [
          'Note what went wrong',
          'Save error message if shown',
          'Open an issue on GitHub or contact support',
          'Include actor name, mode (chargen/levelup), and error details',
        ],
      },
    ];
  }
}
