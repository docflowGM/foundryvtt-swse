/**
 * Migration Mutation Layer - PHASE 11
 * Detects direct mutations in migration code
 *
 * Enforces:
 * - No actor.update() directly in migration files
 * - No createEmbeddedDocuments() directly in migration
 * - No system field writes outside ActorEngine
 * - No clone+update bypass patterns
 * - All migrations must use meta.origin
 */

import { Sentinel } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

export const MigrationMutationLayer = {
  #originalUpdate: null,
  #originalCreateEmbedded: null,
  #originalDeleteEmbedded: null,
  #migrationStack: [],

  /**
   * Initialize migration mutation monitoring
   */
  init() {
    this.instrumentMigrationFiles();
    this.instrumentActorMutations();
  },

  /**
   * Track migration execution context
   */
  instrumentMigrationFiles() {
    // Wrap MigrationEngine methods to track context
    const MigrationEngine = globalThis.SWSE?.MigrationEngine;
    if (!MigrationEngine) {
      console.warn('[Sentinel] MigrationEngine not found, migration monitoring disabled');
      return;
    }

    const self = this;
    const originalMigrateActor = MigrationEngine.migrateActor;

    MigrationEngine.migrateActor = async function(actor, targetVersion) {
      self.#migrationStack.push({
        actor: actor?.id,
        actorName: actor?.name,
        targetVersion,
        startTime: performance.now()
      });

      try {
        return await originalMigrateActor.call(this, actor, targetVersion);
      } finally {
        self.#migrationStack.pop();
      }
    };

    console.log('[Sentinel] Migration mutation layer: MigrationEngine instrumented');
  },

  /**
   * Detect direct mutations in migration context
   */
  instrumentActorMutations() {
    const self = this;
    const originalUpdate = Actor.prototype.update;
    const originalCreateEmbedded = Actor.prototype.createEmbeddedDocuments;
    const originalDeleteEmbedded = Actor.prototype.deleteEmbeddedDocuments;

    // Track direct actor.update() calls during migration
    Actor.prototype.update = async function(data, options = {}) {
      if (self.#migrationStack.length > 0) {
        const currentMigration = self.#migrationStack[self.#migrationStack.length - 1];
        const hasMeta = options?.meta?.origin === 'migration';

        const stack = new Error().stack || '';
        const isMigrationFile = stack.includes('migration') || stack.includes('Migration');

        if (isMigrationFile && !hasMeta) {
          Sentinel.report(
            'migration',
            Sentinel.SEVERITY.WARN,
            `Direct actor.update() detected in migration context without meta.origin`,
            {
              actor: this.name,
              targetVersion: currentMigration.targetVersion,
              hasMeta,
              stack: stack.split('\n').slice(0, 5).join('\n')
            }
          );
        }
      }

      return originalUpdate.call(this, data, options);
    };

    // Track direct createEmbeddedDocuments() calls
    Actor.prototype.createEmbeddedDocuments = async function(embeddedName, data, options = {}) {
      if (self.#migrationStack.length > 0) {
        const currentMigration = self.#migrationStack[self.#migrationStack.length - 1];
        const hasMeta = options?.meta?.origin === 'migration';

        const stack = new Error().stack || '';
        const isMigrationFile = stack.includes('migration') || stack.includes('Migration');

        if (isMigrationFile && !hasMeta) {
          Sentinel.report(
            'migration',
            Sentinel.SEVERITY.WARN,
            `Direct createEmbeddedDocuments("${embeddedName}") detected in migration context`,
            {
              actor: this.name,
              targetVersion: currentMigration.targetVersion,
              embeddedName,
              count: (data || []).length
            }
          );
        }
      }

      return originalCreateEmbedded.call(this, embeddedName, data, options);
    };

    // Track direct deleteEmbeddedDocuments() calls
    Actor.prototype.deleteEmbeddedDocuments = async function(embeddedName, ids, options = {}) {
      if (self.#migrationStack.length > 0) {
        const currentMigration = self.#migrationStack[self.#migrationStack.length - 1];
        const hasMeta = options?.meta?.origin === 'migration';

        const stack = new Error().stack || '';
        const isMigrationFile = stack.includes('migration') || stack.includes('Migration');

        if (isMigrationFile && !hasMeta) {
          Sentinel.report(
            'migration',
            Sentinel.SEVERITY.WARN,
            `Direct deleteEmbeddedDocuments("${embeddedName}") detected in migration context`,
            {
              actor: this.name,
              targetVersion: currentMigration.targetVersion,
              embeddedName,
              count: (ids || []).length
            }
          );
        }
      }

      return originalDeleteEmbedded.call(this, embeddedName, ids, options);
    };

    console.log('[Sentinel] Migration mutation layer: Actor mutations instrumented');
  },

  /**
   * Check if currently in migration context
   */
  isInMigration() {
    return this.#migrationStack.length > 0;
  },

  /**
   * Get current migration context
   */
  getCurrentMigration() {
    return this.#migrationStack.length > 0
      ? this.#migrationStack[this.#migrationStack.length - 1]
      : null;
  }
};
