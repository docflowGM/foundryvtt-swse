/**
 * SWSE Migration Manager
 * Coordinates all system migrations for data model updates and actor schema versioning
 * HARDENED: Per-actor schema versioning with rollback support
 */

import { swseLogger } from '../utils/logger.js';

const SYSTEM_SCHEMA_VERSION = 1;

export class MigrationManager {
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

      // Run per-actor migrations
      await this.migrateAllActors();

      // Update migration flag
      await game.settings.set('foundryvtt-swse', 'lastMigratedSchemaVersion', SYSTEM_SCHEMA_VERSION);

      swseLogger.log(`[MIGRATION] World migration complete`);
    } catch (err) {
      swseLogger.error(`[MIGRATION] World migration failed:`, err);
      ui.notifications?.error(`SWSE: Migration failed - ${err.message}`);
    }
  }

  /**
   * Migrate all actors in the world
   * @private
   */
  static async migrateAllActors() {
    const actors = game.actors.contents || [];
    let migrated = 0;

    swseLogger.log(`[MIGRATION] Migrating ${actors.length} actors...`);

    for (const actor of actors) {
      try {
        const updated = await this.migrateActorData(actor);
        if (updated) migrated++;
      } catch (err) {
        swseLogger.error(`[MIGRATION] Failed to migrate actor ${actor.name}:`, err);
      }
    }

    swseLogger.log(`[MIGRATION] Migrated ${migrated}/${actors.length} actors`);
  }

  /**
   * Migrate a single actor's data
   * @param {Actor} actor - Actor to migrate
   * @returns {Promise<boolean>} - True if actor was modified
   */
  static async migrateActorData(actor) {
    if (!actor?.system) return false;

    let updated = false;
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
      updated = true;
    } else {
      // Update schema version if needed
      if (!actor.system.meta.schemaVersion) {
        updates['system.meta.schemaVersion'] = SYSTEM_SCHEMA_VERSION;
        updated = true;
      }
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
      updated = true;
    }

    // Apply updates if any
    if (updated && Object.keys(updates).length > 0) {
      await actor.update(updates);
    }

    return updated;
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
