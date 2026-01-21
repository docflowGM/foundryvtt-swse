import { SWSELogger } from '../utils/logger.js';

/**
 * Item Weight Validation Migration
 * Fixes invalid weight values in weapon, armor, and equipment items
 *
 * This migration fixes:
 * 1. weight field must be a finite number >= 0
 * 2. Sets weight to 1 if null, undefined, NaN, or Infinity
 *
 * Runs automatically on world ready (GM only) if not already executed
 */

export class FixItemWeightMigration {

  static MIGRATION_VERSION = "1.1.140";
  static MIGRATION_KEY = "fixItemWeightMigration";

  /**
   * Check if migration has been run for current version
   */
  static async needsMigration() {
    try {
      const lastVersion = game.settings.get('foundryvtt-swse', this.MIGRATION_KEY);
      return lastVersion !== this.MIGRATION_VERSION;
    } catch (err) {
      // Setting not yet registered, so migration needs to run
      return true;
    }
  }

  /**
   * Mark migration as complete
   */
  static async markComplete() {
    await game.settings.set('foundryvtt-swse', this.MIGRATION_KEY, this.MIGRATION_VERSION);
  }

  /**
   * Check if weight is valid (finite number >= 0)
   */
  static isValidWeight(weight) {
    const num = Number(weight);
    return Number.isFinite(num) && num >= 0;
  }

  /**
   * Fix a single item's weight
   */
  static fixItemWeight(item, itemName, parentName = null) {
    const updates = {};
    let needsUpdate = false;

    // Check if item should have weight (weapon, armor, equipment)
    const typesWithWeight = ['weapon', 'armor', 'equipment'];
    if (!typesWithWeight.includes(item.type)) {
      return { updates, needsUpdate };
    }

    const weight = item.system?.weight;

    // If weight is invalid, set it to 1
    if (!this.isValidWeight(weight)) {
      updates['system.weight'] = 1;
      needsUpdate = true;
      SWSELogger.log(
        `  ${parentName ? parentName + ' > ' : ''}${itemName} (${item.type}): weight ${weight} -> 1`
      );
    }

    return { updates, needsUpdate };
  }

  /**
   * Main migration entry point
   */
  static async run() {
    // Only GMs can run migrations
    if (!game.user.isGM) {
      SWSELogger.log("SWSE | Skipping item weight migration (not GM)");
      return;
    }

    // Check if migration needed
    if (!(await this.needsMigration())) {
      SWSELogger.log("SWSE | Item weight migration already complete");
      return;
    }

    SWSELogger.log("SWSE | Starting item weight validation migration...");
    ui.notifications.info("Running item weight validation migration, please wait...");

    let fixedItems = 0;
    let fixedActors = 0;
    let skipped = 0;
    let errors = 0;

    // ============================================
    // Fix standalone items in the world
    // ============================================
    SWSELogger.log("SWSE | Checking world items...");
    for (const item of game.items) {
      try {
        const { updates, needsUpdate } = this.fixItemWeight(item, item.name);

        if (needsUpdate) {
          await item.update(updates);
          fixedItems++;
        } else {
          skipped++;
        }

      } catch (err) {
        SWSELogger.error(`Error fixing item ${item.name}:`, err);
        errors++;
      }
    }

    // ============================================
    // Fix items embedded in actors
    // ============================================
    SWSELogger.log("SWSE | Checking actor embedded items...");
    for (const actor of game.actors) {
      try {
        let actorHasUpdates = false;

        for (const item of actor.items) {
          const { updates, needsUpdate } = this.fixItemWeight(item, item.name, actor.name);

          if (needsUpdate) {
            await item.update(updates);
            actorHasUpdates = true;
          }
        }

        if (actorHasUpdates) {
          fixedActors++;
        }

      } catch (err) {
        SWSELogger.error(`Error fixing items in actor ${actor.name}:`, err);
        errors++;
      }
    }

    SWSELogger.log("=".repeat(60));
    SWSELogger.log("SWSE | Item Weight Validation Migration Complete");
    SWSELogger.log(`✓ Fixed: ${fixedItems} world items`);
    SWSELogger.log(`✓ Fixed: ${fixedActors} actors with invalid item weights`);
    SWSELogger.log(`○ Skipped: ${skipped} items (already valid)`);
    if (errors > 0) {
      SWSELogger.log(`✗ Errors: ${errors} items`);
    }
    SWSELogger.log("=".repeat(60));

    // Mark migration as complete
    await this.markComplete();

    const total = fixedItems + fixedActors;
    if (total > 0) {
      ui.notifications.info(`Item weight validation complete! Fixed ${total} items.`);
    } else {
      ui.notifications.info("Item weight validation complete! No fixes needed.");
    }

    return { fixedItems, fixedActors, skipped, errors };
  }
}

// Make available globally for manual runs
Hooks.once('init', () => {
  if (!game.swse) game.swse = {};
  if (!game.swse.migrations) game.swse.migrations = {};
  game.swse.migrations.fixItemWeight = FixItemWeightMigration.run.bind(FixItemWeightMigration);
});

// Auto-run on ready
Hooks.once('ready', async () => {
  if (game.user.isGM) {
    try {
      await FixItemWeightMigration.run();
    } catch (err) {
      SWSELogger.error("SWSE | Item weight migration failed:", err);
      ui.notifications.error(`Item weight migration failed: ${err.message || err}`, { permanent: true });
    }
  }
});

SWSELogger.log("SWSE | Item weight migration script loaded. Manual run: await game.swse.migrations.fixItemWeight()");
