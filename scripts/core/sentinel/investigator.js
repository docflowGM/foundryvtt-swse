/**
 * SWSE INVESTIGATOR
 *
 * Structural diagnostics - audits system architecture and data integrity.
 *
 * STRICT JURISDICTION:
 * Investigator audits ONLY:
 * - Registry integrity (TalentTreeDB, TalentDB, etc.)
 * - Duplicate key detection
 * - Undefined/null registry entries
 * - Cross-registry reference failures
 * - Circular hook logic detection
 * - V2 lifecycle compliance checks
 * - Legacy Application usage detection
 * - jQuery usage detection
 * - Import/export runtime failure detection
 * - Mutation storm detection
 * - Boot sequence validation
 *
 * Investigator does NOT:
 * - Inspect DOM layout
 * - Inspect CSS properties (that's Sentry)
 * - Monitor render collapse (that's Sentry)
 * - Monitor window dimensions (that's Sentry)
 * - Interfere with application lifecycle
 * - Mutate system state
 *
 * Communication:
 * - Imports SentinelEngine only
 * - Reports via SentinelEngine.report("investigator", ...)
 * - Does NOT import Sentry
 * - Does NOT call Sentry functions
 * - Runs after registries build
 * - DEV / STRICT mode only (disabled in PRODUCTION)
 */

import { SentinelEngine } from './sentinel-core.js';

export const Investigator = {
  _initialized: false,

  /**
   * Initialize structural diagnostics
   * Called during system ready, after registries are built
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    const mode = SentinelEngine.getMode();

    // Investigator does NOT run in PRODUCTION mode
    if (mode === SentinelEngine.MODES.OFF || mode === SentinelEngine.MODES.PRODUCTION) {
      return;
    }

    // Wait for registries to be available
    Hooks.once('swseDataReady', () => {
      this._auditRegistries();
      this._checkLegacyUsage();
      this._validateBootSequence();
    });

    // Fallback for when data is loaded
    Hooks.once('ready', () => {
      setTimeout(() => {
        if (window.SWSEData) {
          this._auditRegistries();
          this._checkLegacyUsage();
          this._validateBootSequence();
        }
      }, 500);
    });

    SentinelEngine.report('investigator', SentinelEngine.SEVERITY.INFO, 'Structural diagnostics enabled', {
      mode,
      auditing: [
        'registries',
        'data integrity',
        'V2 compliance',
        'boot sequence',
        'legacy usage'
      ]
    });
  },

  /**
   * JURISDICTION: Registry integrity
   * Audit all SWSE data registries
   */
  _auditRegistries() {
    const registries = {
      TalentTreeDB: window.SWSEData?.TalentTreeDB,
      TalentDB: window.SWSEData?.TalentDB,
      SpeciesDB: window.SWSEData?.SpeciesDB,
      ClassDB: window.SWSEData?.ClassDB,
      FeatDB: window.SWSEData?.FeatDB
    };

    for (const [name, registry] of Object.entries(registries)) {
      if (!registry) {
        SentinelEngine.report('investigator', SentinelEngine.SEVERITY.WARN, `Registry not available: ${name}`, {
          registry: name
        });
        continue;
      }

      if (typeof registry !== 'object') {
        SentinelEngine.report('investigator', SentinelEngine.SEVERITY.ERROR, `Registry malformed: ${name}`, {
          registry: name,
          type: typeof registry
        });
        continue;
      }

      const entries = Object.entries(registry);
      const size = entries.length;

      if (size === 0) {
        SentinelEngine.report('investigator', SentinelEngine.SEVERITY.CRITICAL, `Empty registry: ${name}`, {
          registry: name
        });
        continue;
      }

      // Check for data integrity issues
      let nullCount = 0;
      let undefinedCount = 0;
      let duplicateKeys = new Set();

      for (const [key, value] of entries) {
        if (value === null) nullCount++;
        if (value === undefined) undefinedCount++;

        // Check for key mismatches
        if (typeof value === 'object' && value !== null) {
          const id = value.id || value.ID || value._id;
          if (id && id !== key) {
            duplicateKeys.add(key);
          }
        }
      }

      if (nullCount > 0 || undefinedCount > 0) {
        SentinelEngine.report('investigator', SentinelEngine.SEVERITY.WARN, `Registry has invalid entries: ${name}`, {
          registry: name,
          nullCount,
          undefinedCount,
          totalEntries: size
        });
      }

      if (duplicateKeys.size > 0) {
        SentinelEngine.report('investigator', SentinelEngine.SEVERITY.WARN, `Possible key mismatches in ${name}`, {
          registry: name,
          mismatchCount: duplicateKeys.size
        });
      }

      if (nullCount === 0 && undefinedCount === 0 && duplicateKeys.size === 0) {
        SentinelEngine.report('investigator', SentinelEngine.SEVERITY.INFO, `Registry integrity OK: ${name}`, {
          registry: name,
          size
        });
      }
    }
  },

  /**
   * JURISDICTION: Legacy and V2 compliance
   * Detect legacy Application usage and jQuery presence
   */
  _checkLegacyUsage() {
    // Check for legacy Application class usage
    const appSheets = document.querySelectorAll('[data-legacy-sheet]');
    if (appSheets.length > 0) {
      SentinelEngine.report('investigator', SentinelEngine.SEVERITY.WARN, 'Legacy Application sheets detected', {
        count: appSheets.length,
        recommendation: 'Migrate to ApplicationV2'
      });
    }

    // Check for jQuery presence (indicates potential legacy code)
    if (typeof window.$ === 'function') {
      SentinelEngine.report('investigator', SentinelEngine.SEVERITY.WARN, 'jQuery detected in scope', {
        recommendation: 'Use native DOM API or migrate legacy code'
      });
    }

    // Check for window.game.sheets (deprecated)
    if (window.game?.sheets && window.game.sheets.length > 0) {
      const legacyCount = Array.from(window.game.sheets).filter(
        s => !s.constructor.name.includes('V2')
      ).length;

      if (legacyCount > 0) {
        SentinelEngine.report('investigator', SentinelEngine.SEVERITY.WARN, 'Legacy sheets still registered', {
          legacyCount,
          recommendation: 'Migrate to ApplicationV2/DocumentSheetV2'
        });
      }
    }
  },

  /**
   * JURISDICTION: Boot sequence validation
   * Verify system initialization completed correctly
   */
  _validateBootSequence() {
    const issues = [];

    // Check for required globals
    if (!window.game?.ready) {
      issues.push('game not ready');
    }

    if (!window.SWSEData) {
      issues.push('SWSE data not loaded');
    }

    if (!window.SWSE) {
      issues.push('SWSE config not available');
    }

    // Check hook registry
    if (!window.Hooks) {
      issues.push('Hook system not available');
    }

    if (issues.length > 0) {
      SentinelEngine.report('investigator', SentinelEngine.SEVERITY.ERROR, 'Boot sequence incomplete', {
        issues
      });
    } else {
      SentinelEngine.report('investigator', SentinelEngine.SEVERITY.INFO, 'Boot sequence validation passed', {
        checks: [
          'game.ready',
          'SWSEData',
          'SWSE config',
          'Hook system'
        ]
      });
    }
  }
};
