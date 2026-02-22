/**
 * MigrationEngine
 * PHASE 11: Centralized migration authority for actor schema versioning
 *
 * Responsibilities:
 * 1. Register versioned migrations
 * 2. Build migration plans (non-mutating)
 * 3. Execute migrations atomically via ActorEngine
 * 4. Attach migration context metadata
 * 5. Prevent hook recursion during migration
 * 6. Ensure deterministic version transitions
 *
 * CRITICAL: MigrationEngine is NOT a mutation authority.
 * It ONLY builds plans.
 * ActorEngine is the ONLY executor.
 */

import { swseLogger } from '../../utils/logger.js';

export const MigrationEngine = {
  // Registry of versioned migrations
  #migrations: new Map(),

  // Track active migrations to prevent recursion
  #activeMigrations: new Set(),

  /**
   * Register a migration function for a specific version
   * @param {string} version - Target version (e.g., "3.3.0")
   * @param {Function} migrationFn - Function that builds migration plan
   *
   * Migration function signature:
   * (actor: Actor) => { updates: Object, deletes?: string[], creates?: Object[] }
   */
  register(version, migrationFn) {
    if (typeof migrationFn !== 'function') {
      throw new Error(`Migration for version ${version} must be a function`);
    }
    this.#migrations.set(version, migrationFn);
    swseLogger.log(`[Migration] Registered migration: ${version}`);
  },

  /**
   * Build a migration plan for an actor
   * PHASE 11: Non-mutating plan builder
   *
   * @param {Actor} actor - Actor to migrate
   * @param {string} targetVersion - Target schema version
   * @returns {Object} Migration plan
   *
   * Returns:
   * {
   *   success: boolean,
   *   actor: Actor,
   *   targetVersion: string,
   *   updateData: Object,
   *   meta: { origin: "migration", version: string },
   *   reason?: string
   * }
   */
  buildMigrationPlan(actor, targetVersion) {
    try {
      if (!actor) {
        return {
          success: false,
          reason: 'buildMigrationPlan called with no actor'
        };
      }

      if (!targetVersion) {
        return {
          success: false,
          reason: 'buildMigrationPlan called without targetVersion'
        };
      }

      const currentVersion = actor.system?.meta?.schemaVersion || 0;

      // If already at target or newer, no migration needed
      if (this.#compareVersions(currentVersion, targetVersion) >= 0) {
        return {
          success: true,
          actor,
          targetVersion,
          updateData: {},
          meta: { origin: 'migration', version: targetVersion, skipped: true }
        };
      }

      // Get migration function for target version
      const migrationFn = this.#migrations.get(targetVersion);
      if (!migrationFn) {
        return {
          success: false,
          reason: `No migration registered for version ${targetVersion}`
        };
      }

      // Build plan by calling migration function
      // This must be non-mutating
      const plan = migrationFn(actor);

      if (!plan || typeof plan !== 'object') {
        return {
          success: false,
          reason: `Migration for version ${targetVersion} returned invalid plan`
        };
      }

      // Ensure plan has required structure
      const updates = plan.updates || {};

      // Always update schema version
      updates['system.meta.schemaVersion'] = targetVersion;
      updates['system.meta.lastMigration'] = {
        version: targetVersion,
        timestamp: Date.now()
      };

      return {
        success: true,
        actor,
        targetVersion,
        updateData: updates,
        meta: { origin: 'migration', version: targetVersion }
      };

    } catch (err) {
      swseLogger.error(`buildMigrationPlan failed for ${actor?.name ?? 'unknown'}:`, err);
      return {
        success: false,
        reason: err.message
      };
    }
  },

  /**
   * Execute a migration plan for an actor
   * PHASE 11: Atomic execution via ActorEngine
   *
   * @param {Actor} actor - Actor to migrate
   * @param {string} targetVersion - Target schema version
   * @returns {Promise<Object>} Result object
   */
  async migrateActor(actor, targetVersion) {
    try {
      if (!actor) {
        throw new Error('migrateActor called with no actor');
      }

      if (!targetVersion) {
        throw new Error('migrateActor called without targetVersion');
      }

      // Check for recursion
      const actorKey = `${actor.id}:${targetVersion}`;
      if (this.#activeMigrations.has(actorKey)) {
        swseLogger.warn(`Recursive migration detected for ${actor.name}, skipping`);
        return {
          success: false,
          reason: 'Recursive migration prevented',
          actor
        };
      }

      // Mark as active
      this.#activeMigrations.add(actorKey);

      try {
        // Build plan (non-mutating)
        const plan = this.buildMigrationPlan(actor, targetVersion);

        if (!plan.success) {
          return plan;
        }

        // Skip if no updates needed
        if (plan.meta.skipped) {
          swseLogger.debug(`Migration skipped for ${actor.name} (already at version ${targetVersion})`);
          return {
            success: true,
            skipped: true,
            actor,
            targetVersion
          };
        }

        // Execute via ActorEngine (ONLY mutation authority)
        if (!globalThis.SWSE?.ActorEngine?.updateActor) {
          throw new Error('ActorEngine not available for migration execution');
        }

        swseLogger.log(`[Migration] Migrating ${actor.name} to version ${targetVersion}`);

        await globalThis.SWSE.ActorEngine.updateActor(actor, plan.updateData, {
          meta: plan.meta
        });

        swseLogger.log(`[Migration] ✅ Migrated ${actor.name} to version ${targetVersion}`);

        return {
          success: true,
          actor,
          targetVersion,
          migrated: true,
          timestamp: new Date().toISOString()
        };

      } finally {
        // Always clear active flag
        this.#activeMigrations.delete(actorKey);
      }

    } catch (err) {
      swseLogger.error(`migrateActor failed for ${actor?.name ?? 'unknown'}:`, err);
      return {
        success: false,
        error: err.message,
        actor
      };
    }
  },

  /**
   * Migrate all actors in the world to a target version
   * @param {string} targetVersion - Target schema version
   * @returns {Promise<Object>} Summary of migrations
   */
  async migrateAllActors(targetVersion) {
    try {
      if (!targetVersion) {
        throw new Error('migrateAllActors requires targetVersion');
      }

      const actors = game.actors.contents || [];
      const results = {
        total: actors.length,
        migrated: 0,
        skipped: 0,
        failed: 0,
        errors: []
      };

      swseLogger.log(`[Migration] Starting world migration to version ${targetVersion}`);

      for (const actor of actors) {
        try {
          const result = await this.migrateActor(actor, targetVersion);

          if (result.success) {
            if (result.skipped) {
              results.skipped++;
            } else {
              results.migrated++;
            }
          } else {
            results.failed++;
            results.errors.push({
              actor: actor.name,
              error: result.reason || result.error
            });
          }
        } catch (err) {
          results.failed++;
          results.errors.push({
            actor: actor.name,
            error: err.message
          });
        }
      }

      swseLogger.log(`[Migration] ✅ World migration complete:`, results);
      return results;

    } catch (err) {
      swseLogger.error(`migrateAllActors failed:`, err);
      throw err;
    }
  },

  /**
   * Compare semantic versions
   * @private
   * @returns {number} -1 if a < b, 0 if a === b, 1 if a > b
   */
  #compareVersions(a, b) {
    const aParts = String(a).split('.').map(Number);
    const bParts = String(b).split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }

    return 0;
  },

  /**
   * Get list of registered migration versions
   * @returns {string[]} Sorted list of version strings
   */
  getRegisteredVersions() {
    return Array.from(this.#migrations.keys()).sort((a, b) =>
      this.#compareVersions(a, b)
    );
  }
};
