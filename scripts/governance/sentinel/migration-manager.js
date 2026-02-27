/**
 * SWSE Migration Manager
 * Coordinates all system migrations for data model updates and actor schema versioning
 * PHASE 11: All migrations route through MigrationEngine and ActorEngine
 * HARDENED: Per-actor schema versioning with rollback support
 */

import { swseLogger } from '../../utils/logger.js';
import { MigrationEngine } from '../engine/migration/MigrationEngine.js';

const SYSTEM_SCHEMA_VERSION = 1;

// Define migration functions (non-mutating plan builders)
const migrations = {
  1: (actor) => {
    const updates = {};

    // Ensure meta field exists (required for street legal tracking)
    if (!actor.system.meta) {
      updates['system.meta'] = {
        schemaVersion: SYSTEM_SCHEMA_VERSION,
        streetLegal: true,
        lastValidation: {
          passed: true,
          errors: [],
          timestamp: Date.now()
        }
      };
    }

    // Ensure progression structure exists
    if (!actor.system.progression) {
      updates['system.progression'] = {
        classLevels: [],
        feats: [],
        talents: [],
        skills: [],
        abilities: {}
      };
    }

    return { updates };
  }
};

export class MigrationManager {
  /**
   * Initialize migration system
   * Called from Hooks.once("init") as per Foundry conventions
   */
  static init() {
    // Register all migrations with MigrationEngine
    for (const [version, migrationFn] of Object.entries(migrations)) {
      MigrationEngine.register(String(version), migrationFn);
    }

    swseLogger.log(`[MIGRATION] Migration system initialized with ${Object.keys(migrations).length} migrations`);
  }

  /**
   * Run all system migrations
   * Called from Hooks.once("init") as per Foundry conventions
   */
  static async migrateWorld() {
    if (!game.user.isGM) return; // Only GMs can run migrations

    swseLogger.log(`[MIGRATION] Starting world migration checks (schema version ${SYSTEM_SCHEMA_VERSION})`);

    try {
      // Get current migration version from world settings
      const lastMigratedVersion = game.settings.get('foundryvtt-swse', 'lastMigratedSchemaVersion') || 0;

      if (lastMigratedVersion >= SYSTEM_SCHEMA_VERSION) {
        swseLogger.log(`[MIGRATION] World already at schema version ${SYSTEM_SCHEMA_VERSION}`);
        return;
      }

      swseLogger.log(`[MIGRATION] Migrating from version ${lastMigratedVersion} to ${SYSTEM_SCHEMA_VERSION}`);

      // PHASE 11: Use MigrationEngine for all actor migrations
      // Atomic, governed, auditable
      const results = await MigrationEngine.migrateAllActors(String(SYSTEM_SCHEMA_VERSION));

      // Update migration flag
      await game.settings.set('foundryvtt-swse', 'lastMigratedSchemaVersion', SYSTEM_SCHEMA_VERSION);

      swseLogger.log(`[MIGRATION] ✅ World migration complete:`, {
        migrated: results.migrated,
        skipped: results.skipped,
        failed: results.failed
      });

    } catch (err) {
      swseLogger.error(`[MIGRATION] World migration failed:`, err);
      ui.notifications?.error(`SWSE: Migration failed - ${err.message}`);
    }
  }

  /**
   * Migrate all actors in the world
   * @deprecated Use MigrationEngine.migrateAllActors instead
   * @private
   */
  static async migrateAllActors() {
    // This method is now delegated to MigrationEngine
    return MigrationEngine.migrateAllActors(String(SYSTEM_SCHEMA_VERSION));
  }

  /**
   * Migrate a single actor's data
   * @deprecated Use MigrationEngine.migrateActor instead
   * @param {Actor} actor - Actor to migrate
   * @returns {Promise<boolean>} - True if actor was modified
   */
  static async migrateActorData(actor) {
    const result = await MigrationEngine.migrateActor(actor, String(SYSTEM_SCHEMA_VERSION));
    return result.success && !result.skipped;
  }

  /**
   * Register migration settings
   * Called during system init
   */
  static registerSettings() {
    game.settings.register('foundryvtt-swse', 'lastMigratedSchemaVersion', {
      scope: 'world',
      config: false,
      type: Number,
      default: 0
    });
  }
}
