import { SWSELogger } from '../utils/logger.js';
/**
 * Item Validation Migration
 * Fixes validation errors in class items
 *
 * This migration fixes:
 * 1. babProgression - converts numeric values to string choices ("slow", "medium", "fast")
 * 2. fortSave, refSave, willSave - adds missing save progression fields
 *
 * Runs automatically on world ready (GM only) if not already executed
 */

export class ItemValidationMigration {

  static MIGRATION_VERSION = "1.1.139";
  static MIGRATION_KEY = "itemValidationMigration";

  /**
   * Check if migration has been run for current version
   */
  static async needsMigration() {
    const lastVersion = game.settings.get('swse', this.MIGRATION_KEY);
    return lastVersion !== this.MIGRATION_VERSION;
  }

  /**
   * Mark migration as complete
   */
  static async markComplete() {
    await game.settings.set('swse', this.MIGRATION_KEY, this.MIGRATION_VERSION);
  }

  /**
   * Convert numeric BAB progression to string choice
   */
  static convertBabProgression(value) {
    if (typeof value === 'string') return value; // Already converted

    const numValue = Number(value);
    if (numValue <= 0.5) return "slow";      // 0 or 0.5 BAB per level
    if (numValue < 1) return "medium";       // 0.75 BAB per level
    return "fast";                            // 1 BAB per level
  }

  /**
   * Get default save progression based on class name
   * This is a best-effort guess based on common SWSE class patterns
   */
  static getDefaultSaveProgression(className) {
    const name = (className || '').toLowerCase();

    // Jedi classes typically have good Will saves
    if (name.includes('jedi') || name.includes('force')) {
      return {
        fortSave: "fast",
        refSave: "fast",
        willSave: "fast"
      };
    }

    // Soldier typically has good Fort
    if (name.includes('soldier')) {
      return {
        fortSave: "fast",
        refSave: "slow",
        willSave: "slow"
      };
    }

    // Scout typically has good Reflex and Fort
    if (name.includes('scout')) {
      return {
        fortSave: "fast",
        refSave: "fast",
        willSave: "slow"
      };
    }

    // Noble/Scoundrel typically have good Reflex and Will
    if (name.includes('noble') || name.includes('scoundrel')) {
      return {
        fortSave: "slow",
        refSave: "fast",
        willSave: "fast"
      };
    }

    // Default: assume slow for all (safest default)
    return {
      fortSave: "slow",
      refSave: "slow",
      willSave: "slow"
    };
  }

  /**
   * Fix a single class item
   */
  static fixClassItem(item, itemName, parentName = null) {
    const updates = {};
    let needsUpdate = false;

    // Fix babProgression if it's numeric
    const babProg = item.babProgression;
    if (typeof babProg === 'number' || (typeof babProg === 'string' && !isNaN(Number(babProg)))) {
      const converted = this.convertBabProgression(babProg);
      if (converted !== babProg) {
        updates['system.babProgression'] = converted;
        needsUpdate = true;
        SWSELogger.log(`  ${parentName ? parentName + ' > ' : ''}${itemName}: babProgression ${babProg} -> "${converted}"`);
      }
    }

    // Check if save progressions are missing
    const defaultSaves = this.getDefaultSaveProgression(itemName);

    if (!item.fortSave) {
      updates['system.fortSave'] = defaultSaves.fortSave;
      needsUpdate = true;
      SWSELogger.log(`  ${parentName ? parentName + ' > ' : ''}${itemName}: adding fortSave = "${defaultSaves.fortSave}"`);
    }

    if (!item.refSave) {
      updates['system.refSave'] = defaultSaves.refSave;
      needsUpdate = true;
      SWSELogger.log(`  ${parentName ? parentName + ' > ' : ''}${itemName}: adding refSave = "${defaultSaves.refSave}"`);
    }

    if (!item.willSave) {
      updates['system.willSave'] = defaultSaves.willSave;
      needsUpdate = true;
      SWSELogger.log(`  ${parentName ? parentName + ' > ' : ''}${itemName}: adding willSave = "${defaultSaves.willSave}"`);
    }

    return { updates, needsUpdate };
  }

  /**
   * Main migration entry point
   */
  static async run() {
    // Only GMs can run migrations
    if (!game.user.isGM) {
      SWSELogger.log("SWSE | Skipping item validation migration (not GM)");
      return;
    }

    // Check if migration needed
    if (!(await this.needsMigration())) {
      SWSELogger.log("SWSE | Item validation migration already complete");
      return;
    }

    SWSELogger.log("SWSE | Starting item validation migration...");
    ui.notifications.info("Running item data migration, please wait...");

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
        if (item.type !== 'class') {
          skipped++;
          continue;
        }

        const { updates, needsUpdate } = this.fixClassItem(item.system, item.name);

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
    // Fix class items embedded in actors
    // ============================================
    SWSELogger.log("SWSE | Checking actor embedded items...");
    for (const actor of game.actors) {
      try {
        let actorNeedsUpdate = false;

        for (const item of actor.items) {
          if (item.type !== 'class') continue;

          const { updates, needsUpdate } = this.fixClassItem(item.system, item.name, actor.name);

          if (needsUpdate) {
            await item.update(updates);
            actorNeedsUpdate = true;
          }
        }

        if (actorNeedsUpdate) {
          fixedActors++;
        }

      } catch (err) {
        SWSELogger.error(`Error fixing items in actor ${actor.name}:`, err);
        errors++;
      }
    }

    SWSELogger.log("=".repeat(60));
    SWSELogger.log("SWSE | Item Validation Migration Complete");
    SWSELogger.log(`✓ Fixed: ${fixedItems} world items`);
    SWSELogger.log(`✓ Fixed: ${fixedActors} actors with embedded class items`);
    SWSELogger.log(`○ Skipped: ${skipped} items (already valid or not class items)`);
    if (errors > 0) {
      SWSELogger.log(`✗ Errors: ${errors} items`);
    }
    SWSELogger.log("=".repeat(60));

    // Mark migration as complete
    await this.markComplete();

    const total = fixedItems + fixedActors;
    if (total > 0) {
      ui.notifications.info(`Item migration complete! Fixed ${total} class items.`);
    } else {
      ui.notifications.info("Item migration complete! No fixes needed.");
    }

    return { fixedItems, fixedActors, skipped, errors };
  }
}

// Make available globally for manual runs
Hooks.once('init', () => {
  if (!game.swse) game.swse = {};
  if (!game.swse.migrations) game.swse.migrations = {};
  game.swse.migrations.fixItemValidation = ItemValidationMigration.run.bind(ItemValidationMigration);
});

// Auto-run on ready
Hooks.once('ready', async () => {
  if (game.user.isGM) {
    try {
      await ItemValidationMigration.run();
    } catch (err) {
      SWSELogger.error("SWSE | Item validation migration failed:", err);
      ui.notifications.error(`Item migration failed: ${err.message || err}`, { permanent: true });
    }
  }
});

SWSELogger.log("SWSE | Item validation migration script loaded. Manual run: await game.swse.migrations.fixItemValidation()");
