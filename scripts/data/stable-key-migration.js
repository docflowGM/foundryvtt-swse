/**
 * Stable Key Migration
 * Migrates from ID-based relationships to stable key-based relationships
 * Runs during system initialization to ensure all documents have keys
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { toStableKey } from "/systems/foundryvtt-swse/scripts/utils/stable-key.js";

export const StableKeyMigration = {

  /**
   * Stable keys are now generated at registry build layer.
   * This migration is non-destructive and does not mutate compendium documents.
   */
  async runFullMigration() {
    SWSELogger.log('[StableKeyMigration] Registry-based stable key enforcement active.');
  }
};
