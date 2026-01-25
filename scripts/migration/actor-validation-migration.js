import { SWSELogger } from '../utils/logger.js';
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

  static MIGRATION_VERSION = "1.1.130";
  static MIGRATION_KEY = "actorValidationMigration";

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
   * Main migration entry point
   */
  static async run() {
    // Only GMs can run migrations
    if (!game.user.isGM) {
      SWSELogger.log("SWSE | Skipping actor validation migration (not GM)");
      return;
    }

    // Check if migration needed
    if (!(await this.needsMigration())) {
      SWSELogger.log("SWSE | Actor validation migration already complete");
      return;
    }

    SWSELogger.log("SWSE | Starting actor validation migration...");
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
            SWSELogger.log(`Fixing ${actor.name}: size "${currentSize}" -> "${newSize}"`);
          }
        }

        // ============================================
        // Fix Integer Fields
        // ============================================

        // Initiative
        if (actor.system?.initiative === undefined || !Number.isInteger(actor.system.initiative)) {
          const initValue = actor.system?.initiative;
          updates['system.initiative'] = Math.floor(Number(initValue) || 0);
          needsUpdate = true;
          SWSELogger.log(`Fixing ${actor.name}: initiative to integer (was ${initValue})`);
        }

        // Speed (skip for vehicles as they use string speed values)
        if (actor.type !== 'vehicle') {
          if (actor.system?.speed === undefined || !Number.isInteger(actor.system.speed)) {
            const speedValue = actor.system?.speed;
            updates['system.speed'] = Math.floor(Number(speedValue) || 6);
            needsUpdate = true;
            SWSELogger.log(`Fixing ${actor.name}: speed to integer (was ${speedValue})`);
          }
        }

        // Damage Threshold
        if (actor.system?.damageThreshold === undefined || !Number.isInteger(actor.system.damageThreshold)) {
          const dtValue = actor.system?.damageThreshold;
          updates['system.damageThreshold'] = Math.floor(Number(dtValue) || 10);
          needsUpdate = true;
          SWSELogger.log(`Fixing ${actor.name}: damageThreshold to integer (was ${dtValue})`);
        }

        // BAB
        if (actor.system?.bab === undefined || !Number.isInteger(actor.system.bab)) {
          const babValue = actor.system?.bab;
          updates['system.bab'] = Math.floor(Number(babValue) || 0);
          needsUpdate = true;
          SWSELogger.log(`Fixing ${actor.name}: bab to integer (was ${babValue})`);
        }

        // Base Attack
        if (actor.system?.baseAttack === undefined || !Number.isInteger(actor.system.baseAttack)) {
          const baseAttackValue = actor.system?.baseAttack;
          updates['system.baseAttack'] = Math.floor(Number(baseAttackValue) || 0);
          needsUpdate = true;
          SWSELogger.log(`Fixing ${actor.name}: baseAttack to integer (was ${baseAttackValue})`);
        }

        // ============================================
        // Fix Defense Integer Fields
        // ============================================

        // Helper to ensure integer
        const ensureInt = (value, defaultValue = 0) => {
          if (value === null || value === undefined || value === "") {
            return defaultValue;
          }
          const num = Number(value);
          return Number.isInteger(num) ? num : Math.floor(num) || defaultValue;
        };

        // Ensure defenses object exists
        if (!actor.system?.defenses) {
          SWSELogger.log(`Fixing ${actor.name}: creating missing defenses structure`);
          updates['system.defenses'] = {
            reflex: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 },
            fort: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 },
            will: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 }
          };
          needsUpdate = true;
        } else {
          const defenses = actor.system.defenses;

          // Fix Reflex defense - create if missing
          if (!defenses.reflex) {
            SWSELogger.log(`Fixing ${actor.name}: creating missing reflex defense`);
            updates['system.defenses.reflex'] = { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 };
            needsUpdate = true;
          } else {
            // Fix individual fields
            if (defenses.reflex.ability === undefined || !Number.isInteger(defenses.reflex.ability)) {
              updates['system.defenses.reflex.ability'] = ensureInt(defenses.reflex.ability);
              needsUpdate = true;
            }
            if (defenses.reflex.armor === undefined || !Number.isInteger(defenses.reflex.armor)) {
              updates['system.defenses.reflex.armor'] = ensureInt(defenses.reflex.armor);
              needsUpdate = true;
            }
            if (defenses.reflex.classBonus === undefined || !Number.isInteger(defenses.reflex.classBonus)) {
              updates['system.defenses.reflex.classBonus'] = ensureInt(defenses.reflex.classBonus);
              needsUpdate = true;
            }
            if (defenses.reflex.misc === undefined || !Number.isInteger(defenses.reflex.misc)) {
              updates['system.defenses.reflex.misc'] = ensureInt(defenses.reflex.misc);
              needsUpdate = true;
            }
            if (defenses.reflex.base === undefined || !Number.isInteger(defenses.reflex.base)) {
              updates['system.defenses.reflex.base'] = ensureInt(defenses.reflex.base, 10);
              needsUpdate = true;
            }
          }

          // Fix Fortitude defense - create if missing
          if (!defenses.fort) {
            SWSELogger.log(`Fixing ${actor.name}: creating missing fortitude defense`);
            updates['system.defenses.fort'] = { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 };
            needsUpdate = true;
          } else {
            // Fix individual fields
            if (defenses.fort.ability === undefined || !Number.isInteger(defenses.fort.ability)) {
              updates['system.defenses.fort.ability'] = ensureInt(defenses.fort.ability);
              needsUpdate = true;
            }
            if (defenses.fort.armor === undefined || !Number.isInteger(defenses.fort.armor)) {
              updates['system.defenses.fort.armor'] = ensureInt(defenses.fort.armor);
              needsUpdate = true;
            }
            if (defenses.fort.classBonus === undefined || !Number.isInteger(defenses.fort.classBonus)) {
              updates['system.defenses.fort.classBonus'] = ensureInt(defenses.fort.classBonus);
              needsUpdate = true;
            }
            if (defenses.fort.misc === undefined || !Number.isInteger(defenses.fort.misc)) {
              updates['system.defenses.fort.misc'] = ensureInt(defenses.fort.misc);
              needsUpdate = true;
            }
            if (defenses.fort.base === undefined || !Number.isInteger(defenses.fort.base)) {
              updates['system.defenses.fort.base'] = ensureInt(defenses.fort.base, 10);
              needsUpdate = true;
            }
          }

          // Fix Will defense - create if missing
          if (!defenses.will) {
            SWSELogger.log(`Fixing ${actor.name}: creating missing will defense`);
            updates['system.defenses.will'] = { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 };
            needsUpdate = true;
          } else {
            // Fix individual fields
            if (defenses.will.ability === undefined || !Number.isInteger(defenses.will.ability)) {
              updates['system.defenses.will.ability'] = ensureInt(defenses.will.ability);
              needsUpdate = true;
            }
            if (defenses.will.armor === undefined || !Number.isInteger(defenses.will.armor)) {
              updates['system.defenses.will.armor'] = ensureInt(defenses.will.armor);
              needsUpdate = true;
            }
            if (defenses.will.classBonus === undefined || !Number.isInteger(defenses.will.classBonus)) {
              updates['system.defenses.will.classBonus'] = ensureInt(defenses.will.classBonus);
              needsUpdate = true;
            }
            if (defenses.will.misc === undefined || !Number.isInteger(defenses.will.misc)) {
              updates['system.defenses.will.misc'] = ensureInt(defenses.will.misc);
              needsUpdate = true;
            }
            if (defenses.will.base === undefined || !Number.isInteger(defenses.will.base)) {
              updates['system.defenses.will.base'] = ensureInt(defenses.will.base, 10);
              needsUpdate = true;
            }
          }
        }

        // ============================================
        // Apply Updates
        // ============================================

        if (needsUpdate) {
          SWSELogger.log(`Updating ${actor.name} with fixes:`, updates);
          await actor.update(updates);
          fixed++;
        } else {
          skipped++;
        }

      } catch (err) {
        SWSELogger.error(`Error fixing ${actor.name}:`, err);
        errors++;
      }
    }

    SWSELogger.log("=".repeat(60));
    SWSELogger.log("SWSE | Actor Validation Migration Complete");
    SWSELogger.log(`✓ Fixed: ${fixed} actors`);
    SWSELogger.log(`○ Skipped: ${skipped} actors (already valid)`);
    if (errors > 0) {
      SWSELogger.log(`✗ Errors: ${errors} actors`);
    }
    SWSELogger.log("=".repeat(60));

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
      SWSELogger.error("SWSE | Actor validation migration failed:", err);
      ui.notifications.error("Actor migration failed. Check console for details.");
    }
  }
});

SWSELogger.log("SWSE | Actor validation migration script loaded. Manual run: await game.swse.migrations.fixActorValidation()");
