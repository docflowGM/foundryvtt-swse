/**
 * Data Layer - Verifies registry and data integrity
 *
 * Monitors for:
 * - Empty registries (TalentTreeDB, TalentDB, etc.)
 * - Duplicate keys in registries
 * - Undefined or null entries
 * - Registry size anomalies
 *
 * Non-mutating observation only
 */

import { Sentinel } from './sentinel-core.js';

export const DataLayer = {
  /**
   * Initialize data monitoring
   */
  init() {
    // Wait for data to be loaded before checking
    Hooks.once('swseDataReady', () => {
      this.auditRegistries();
    });

    // Also check on ready hook as fallback
    Hooks.once('ready', () => {
      setTimeout(() => this.auditRegistries(), 1000);
    });
  },

  /**
   * Audit all SWSE registries for integrity
   */
  auditRegistries() {
    const registries = {
      TalentTreeDB: window.SWSEData?.TalentTreeDB,
      TalentDB: window.SWSEData?.TalentDB,
      SpeciesDB: window.SWSEData?.SpeciesDB,
      ClassDB: window.SWSEData?.ClassDB,
      FeatDB: window.SWSEData?.FeatDB
    };

    for (const [name, registry] of Object.entries(registries)) {
      if (!registry) {
        Sentinel.report('data', Sentinel.SEVERITY.WARN, `Registry not loaded yet: ${name}`, {
          available: Object.keys(window.SWSEData || {})
        });
        continue;
      }

      if (typeof registry !== 'object') {
        Sentinel.report('data', Sentinel.SEVERITY.ERROR, `Registry is not an object: ${name}`, {
          type: typeof registry
        });
        continue;
      }

      const entries = Object.entries(registry);
      const size = entries.length;

      if (size === 0) {
        Sentinel.report('data', Sentinel.SEVERITY.CRITICAL, `Empty registry detected: ${name}`, {
          registry: name
        });
        continue;
      }

      // Check for anomalies
      let nullCount = 0;
      let undefinedCount = 0;
      let duplicateKeyPatterns = new Set();

      for (const [key, value] of entries) {
        if (value === null) nullCount++;
        if (value === undefined) undefinedCount++;

        // Check for suspicious key patterns
        if (typeof value === 'object' && value !== null) {
          const id = value.id || value.ID || value._id;
          if (id && id !== key) {
            duplicateKeyPatterns.add(`${key} -> ${id}`);
          }
        }
      }

      if (nullCount > 0 || undefinedCount > 0) {
        Sentinel.report('data', Sentinel.SEVERITY.WARN, `Registry contains null/undefined entries: ${name}`, {
          registry: name,
          totalEntries: size,
          nullCount,
          undefinedCount
        });
      }

      if (duplicateKeyPatterns.size > 5) {
        Sentinel.report('data', Sentinel.SEVERITY.WARN, `Possible key-ID mismatches in ${name}`, {
          registry: name,
          mismatchCount: duplicateKeyPatterns.size,
          examples: Array.from(duplicateKeyPatterns).slice(0, 3)
        });
      }

      Sentinel.report('data', Sentinel.SEVERITY.INFO, `Registry audit: ${name}`, {
        registry: name,
        size,
        integrity: nullCount === 0 && undefinedCount === 0 ? 'OK' : 'ISSUES'
      });
    }
  }
};
