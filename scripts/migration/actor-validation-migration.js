/**
 * Actor Validation Migration
 * Comprehensive migration to fix all actor validation errors
 *
 * This migration fixes:
 * 1. Size values - converts capitalized size values to lowercase
 * 2. Integer fields - ensures all number fields that require integers are actually integers
 * 3. Defense schema - ensures all defense fields exist and have proper integer values
 *
 * Runs automatically on world ready (GM only) if not already executed
 */

export class ActorValidationMigration {

  static MIGRATION_VERSION = "1.1.116";
  static MIGRATION_KEY = "actorValidationMigration";

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
   * Main migration entry point
   */
  static async run() {
    // Only GMs can run migrations
    if (!game.user.isGM) {
      console.log("SWSE | Skipping actor validation migration (not GM)");
      return;
    }

    // Check if migration needed
    if (!(await this.needsMigration())) {
      console.log("SWSE | Actor validation migration already complete");
      return;
    }

    console.log("SWSE | Starting actor validation migration...");
    ui.notifications.info("Running actor data migration, please wait...");

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    const validSizes = [
      'fine', 'diminutive', 'tiny', 'small', 'medium',
      'large', 'huge', 'gargantuan', 'colossal', 'colossal2'
    ];

    for (const actor of game.actors) {
      try {
        const updates = {};
        let needsUpdate = false;

        // ============================================
        // Fix Size Values
        // ============================================
        const currentSize = actor.system?.size;
        if (currentSize && currentSize !== currentSize.toLowerCase()) {
          const newSize = currentSize.toLowerCase();
          if (validSizes.includes(newSize)) {
            updates['system.size'] = newSize;
            needsUpdate = true;
            console.log(`Fixing ${actor.name}: size "${currentSize}" -> "${newSize}"`);
          }
        }

        // ============================================
        // Fix Integer Fields
        // ============================================

        // Initiative
        if (actor.system?.initiative !== undefined &&
            !Number.isInteger(actor.system.initiative)) {
          updates['system.initiative'] = Math.floor(Number(actor.system.initiative) || 0);
          needsUpdate = true;
          console.log(`Fixing ${actor.name}: initiative to integer`);
        }

        // Speed
        if (actor.system?.speed !== undefined &&
            !Number.isInteger(actor.system.speed)) {
          updates['system.speed'] = Math.floor(Number(actor.system.speed) || 6);
          needsUpdate = true;
          console.log(`Fixing ${actor.name}: speed to integer`);
        }

        // Damage Threshold
        if (actor.system?.damageThreshold !== undefined &&
            !Number.isInteger(actor.system.damageThreshold)) {
          updates['system.damageThreshold'] = Math.floor(Number(actor.system.damageThreshold) || 10);
          needsUpdate = true;
          console.log(`Fixing ${actor.name}: damageThreshold to integer`);
        }

        // BAB
        if (actor.system?.bab !== undefined &&
            !Number.isInteger(actor.system.bab)) {
          updates['system.bab'] = Math.floor(Number(actor.system.bab) || 0);
          needsUpdate = true;
          console.log(`Fixing ${actor.name}: bab to integer`);
        }

        // Base Attack
        if (actor.system?.baseAttack !== undefined &&
            !Number.isInteger(actor.system.baseAttack)) {
          updates['system.baseAttack'] = Math.floor(Number(actor.system.baseAttack) || 0);
          needsUpdate = true;
          console.log(`Fixing ${actor.name}: baseAttack to integer`);
        }

        // ============================================
        // Fix Defense Integer Fields
        // ============================================

        if (actor.system?.defenses) {
          const defenses = actor.system.defenses;

          // Helper to ensure integer
          const ensureInt = (value) => {
            if (value === null || value === undefined || value === "") {
              return 0;
            }
            const num = Number(value);
            return Number.isInteger(num) ? num : Math.floor(num) || 0;
          };

          // Fix Reflex defense
          if (defenses.reflex) {
            if (!Number.isInteger(defenses.reflex.ability)) {
              updates['system.defenses.reflex.ability'] = ensureInt(defenses.reflex.ability);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.reflex.armor)) {
              updates['system.defenses.reflex.armor'] = ensureInt(defenses.reflex.armor);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.reflex.classBonus)) {
              updates['system.defenses.reflex.classBonus'] = ensureInt(defenses.reflex.classBonus);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.reflex.misc)) {
              updates['system.defenses.reflex.misc'] = ensureInt(defenses.reflex.misc);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.reflex.base)) {
              updates['system.defenses.reflex.base'] = ensureInt(defenses.reflex.base) || 10;
              needsUpdate = true;
            }
          }

          // Fix Fortitude defense
          if (defenses.fortitude) {
            if (!Number.isInteger(defenses.fortitude.ability)) {
              updates['system.defenses.fortitude.ability'] = ensureInt(defenses.fortitude.ability);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.fortitude.armor)) {
              updates['system.defenses.fortitude.armor'] = ensureInt(defenses.fortitude.armor);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.fortitude.classBonus)) {
              updates['system.defenses.fortitude.classBonus'] = ensureInt(defenses.fortitude.classBonus);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.fortitude.misc)) {
              updates['system.defenses.fortitude.misc'] = ensureInt(defenses.fortitude.misc);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.fortitude.base)) {
              updates['system.defenses.fortitude.base'] = ensureInt(defenses.fortitude.base) || 10;
              needsUpdate = true;
            }
          }

          // Fix Will defense
          if (defenses.will) {
            if (!Number.isInteger(defenses.will.ability)) {
              updates['system.defenses.will.ability'] = ensureInt(defenses.will.ability);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.will.armor)) {
              updates['system.defenses.will.armor'] = ensureInt(defenses.will.armor);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.will.classBonus)) {
              updates['system.defenses.will.classBonus'] = ensureInt(defenses.will.classBonus);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.will.misc)) {
              updates['system.defenses.will.misc'] = ensureInt(defenses.will.misc);
              needsUpdate = true;
            }
            if (!Number.isInteger(defenses.will.base)) {
              updates['system.defenses.will.base'] = ensureInt(defenses.will.base) || 10;
              needsUpdate = true;
            }
          }
        }

        // ============================================
        // Apply Updates
        // ============================================

        if (needsUpdate) {
          console.log(`Updating ${actor.name} with fixes:`, updates);
          await actor.update(updates);
          fixed++;
        } else {
          skipped++;
        }

      } catch (err) {
        console.error(`Error fixing ${actor.name}:`, err);
        errors++;
      }
    }

    console.log("=".repeat(60));
    console.log("SWSE | Actor Validation Migration Complete");
    console.log(`✓ Fixed: ${fixed} actors`);
    console.log(`○ Skipped: ${skipped} actors (already valid)`);
    if (errors > 0) {
      console.log(`✗ Errors: ${errors} actors`);
    }
    console.log("=".repeat(60));

    // Mark migration as complete
    await this.markComplete();

    if (fixed > 0) {
      ui.notifications.info(`Actor migration complete! Fixed ${fixed} actors.`);
    } else {
      ui.notifications.info("Actor migration complete! No fixes needed.");
    }

    return { fixed, skipped, errors };
  }
}

// Make available globally for manual runs
Hooks.once('init', () => {
  if (!game.swse) game.swse = {};
  if (!game.swse.migrations) game.swse.migrations = {};
  game.swse.migrations.fixActorValidation = ActorValidationMigration.run.bind(ActorValidationMigration);
});

// Auto-run on ready
Hooks.once('ready', async () => {
  if (game.user.isGM) {
    try {
      await ActorValidationMigration.run();
    } catch (err) {
      console.error("SWSE | Actor validation migration failed:", err);
      ui.notifications.error("Actor migration failed. Check console for details.");
    }
  }
});

console.log("SWSE | Actor validation migration script loaded. Manual run: await game.swse.migrations.fixActorValidation()");
