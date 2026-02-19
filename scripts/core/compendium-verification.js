/**
 * Compendium Integrity Verification
 *
 * Verifies required compendiums exist and contain expected data
 * Runs at startup and fails fast if anything is missing
 */

import { swseLogger } from '../utils/logger.js';
import { StructuredLogger, SEVERITY } from './structured-logger.js';

export class CompendiumVerification {
  /**
   * Required compendium configurations
   * Format: { packName: 'system.packName', minDocuments: number, expectedKeys: [key1, key2] }
   */
  static REQUIRED_COMPENDIUMS = [
    { packName: 'foundryvtt-swse.classes', minDocuments: 1, expectedKeys: ['_id', 'name', 'system'] },
    { packName: 'foundryvtt-swse.skills', minDocuments: 1, expectedKeys: ['_id', 'name', 'system'] },
    { packName: 'foundryvtt-swse.talents', minDocuments: 1, expectedKeys: ['_id', 'name', 'system'] },
    { packName: 'foundryvtt-swse.species', minDocuments: 1, expectedKeys: ['_id', 'name', 'system'] },
    { packName: 'foundryvtt-swse.feats', minDocuments: 1, expectedKeys: ['_id', 'name', 'system'] }
  ];

  /**
   * Verify all required compendiums
   * Throws if any critical issues found
   */
  static async verifyCompendiums() {
    StructuredLogger.compendium(SEVERITY.INFO, 'Starting compendium verification');

    const results = {
      verified: [],
      missing: [],
      corrupted: [],
      warnings: []
    };

    for (const config of this.REQUIRED_COMPENDIUMS) {
      try {
        await this._verifyPack(config, results);
      } catch (error) {
        results.corrupted.push({
          pack: config.packName,
          error: error.message
        });
        StructuredLogger.compendium(SEVERITY.ERROR, `Pack verification failed: ${config.packName}`, {
          error: error.message
        });
      }
    }

    // Log summary
    this._logVerificationSummary(results);

    // Fail if any critical packs are missing
    if (results.missing.length > 0) {
      const missingPacks = results.missing.map(m => m.pack).join(', ');
      throw new Error(
        `SWSE: Required compendiums are missing or inaccessible: ${missingPacks}`
      );
    }

    // Warn about corrupted packs
    if (results.corrupted.length > 0) {
      const msg = `${results.corrupted.length} compendium(s) have integrity issues`;
      StructuredLogger.compendium(SEVERITY.WARN, msg, {
        corrupted: results.corrupted
      });
    }

    return results;
  }

  /**
   * Verify a single pack
   */
  static async _verifyPack(config, results) {
    const pack = game.packs.get(config.packName);

    if (!pack) {
      results.missing.push({ pack: config.packName, reason: 'Pack not found in registry' });
      throw new Error(`Pack ${config.packName} not found in registry`);
    }

    // Get pack index (v13: returns Map)
    try {
      const indexMap = await pack.getIndex();

      // Convert Map to array safely
      const index = Array.from(indexMap ?? []);

      if (!index || index.length === 0) {
        results.corrupted.push({
          pack: config.packName,
          reason: 'Pack index is empty'
        });
        throw new Error(`Pack ${config.packName} is empty or inaccessible`);
      }

      // Check minimum document count
      if (index.length < config.minDocuments) {
        results.warnings.push({
          pack: config.packName,
          warning: `Pack has fewer documents than expected (found ${index.length}, expected at least ${config.minDocuments})`
        });
      }

      // Spot-check first document for expected keys
      const first = index[0];

      // Safely filter for missing keys (handle undefined entries)
      if (!first || typeof first !== 'object') {
        results.corrupted.push({
          pack: config.packName,
          reason: 'Pack index contains invalid entries'
        });
        throw new Error(`Pack ${config.packName} has corrupted index entries`);
      }

      const missingKeys = config.expectedKeys.filter(key => !(key in first));

      if (missingKeys.length > 0) {
        results.corrupted.push({
          pack: config.packName,
          reason: `Missing expected keys: ${missingKeys.join(', ')}`
        });
        throw new Error(
          `Pack ${config.packName} missing expected keys: ${missingKeys.join(', ')}`
        );
      }
    } catch (err) {
      // Re-throw with clear context
      if (err.message.includes('Pack')) throw err;
      throw new Error(`Failed to verify pack ${config.packName}: ${err.message}`);
    }

    // Verify no orphaned references (if applicable)
    const orphaned = await this._checkOrphanedReferences(pack);
    if (orphaned.length > 0) {
      results.warnings.push({
        pack: config.packName,
        warning: `Found ${orphaned.length} potentially orphaned document(s)`
      });
    }

    results.verified.push({
      pack: config.packName,
      documentCount: index.length
    });

    StructuredLogger.compendium(SEVERITY.DEBUG, `Pack verified: ${config.packName}`, {
      documentCount: index.length
    });
  }

  /**
   * Check for orphaned references in pack
   */
  static async _checkOrphanedReferences(pack) {
    // This is a basic check - can be expanded for specific references
    const orphaned = [];
    const index = await pack.getIndex();

    // Sample check: if pack contains references, spot-check them
    // (Detailed implementation depends on pack structure)

    return orphaned;
  }

  /**
   * Log verification summary
   */
  static _logVerificationSummary(results) {
    const summary = `Compendium verification: ${results.verified.length} verified, ${results.missing.length} missing, ${results.corrupted.length} corrupted, ${results.warnings.length} warnings`;

    if (results.corrupted.length === 0 && results.missing.length === 0) {
      StructuredLogger.compendium(SEVERITY.INFO, summary);
    } else {
      StructuredLogger.compendium(SEVERITY.WARN, summary, results);
    }
  }
}
