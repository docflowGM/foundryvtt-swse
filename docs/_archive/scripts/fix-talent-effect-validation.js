import { SWSELogger } from '../../../scripts/utils/logger.js';

/**
 * Talent Effect Validation Migration
 *
 * Fixes validation errors for talent effects by removing invalid 'type' fields
 * that don't conform to Foundry v13+ ActiveEffect standards.
 *
 * Effects stored in the talents database have type: "talent-effect" which is a
 * custom value that Foundry v13+ rejects. The fix removes these invalid type
 * fields (the effect type info is preserved in flags.swse.type).
 */

export class TalentEffectValidationMigration {

  static MIGRATION_VERSION = '1.1.140';
  static MIGRATION_KEY = 'talentEffectValidationMigration';

  /**
   * Check if migration has been run for current version
   */
  static async needsMigration() {
    try {
      const lastVersion = game.settings.get('foundryvtt-swse', this.MIGRATION_KEY);
      return lastVersion !== this.MIGRATION_VERSION;
    } catch (err) {
      // Setting not yet registered or inaccessible, assume migration needs to run
      SWSELogger.warn(`SWSE | Could not check migration status for ${this.MIGRATION_KEY}:`, err.message);
      return true;
    }
  }

  /**
   * Mark migration as complete
   */
  static async markComplete() {
    try {
      await game.settings.set('foundryvtt-swse', this.MIGRATION_KEY, this.MIGRATION_VERSION);
    } catch (err) {
      SWSELogger.warn(`SWSE | Could not mark migration complete for ${this.MIGRATION_KEY}:`, err.message);
    }
  }

  /**
   * Check if an effect has an invalid type field
   * Valid Foundry effect types are specific values or should be undefined
   * Custom types like "talent-effect" are not valid in v13+
   */
  static isInvalidEffectType(effectType) {
    if (effectType === undefined || effectType === null) {return false;}

    // These are potentially valid custom types, but in v13+ we should avoid them
    // Valid Foundry types are typically not set or are specific system types
    const customTypes = ['talent-effect', 'feat-effect', 'custom-effect'];
    return customTypes.includes(effectType);
  }

  /**
   * Sanitize an effect object by removing invalid type field
   */
  static sanitizeEffect(effect) {
    const sanitized = { ...effect };

    if (this.isInvalidEffectType(sanitized.type)) {
      delete sanitized.type;
    }

    return sanitized;
  }

  /**
   * Fix effects on a single item
   */
  static async fixItemEffects(item) {
    let fixedCount = 0;
    const updates = {};

    // Get all effects on this item
    if (!item.effects || item.effects.size === 0) {
      return { fixedCount, needsUpdate: false };
    }

    const effectsData = [];
    let hasInvalidEffects = false;

    // Check each effect for invalid type field
    for (const effect of item.effects) {
      if (this.isInvalidEffectType(effect.type)) {
        hasInvalidEffects = true;
        fixedCount++;

        // Prepare sanitized data - only keep the sanitized effect data
        const sanitized = this.sanitizeEffect(effect.toObject());
        effectsData.push({
          _id: effect.id,
          type: undefined // Explicitly set to undefined to remove it
        });

        SWSELogger.log(`  Fixed effect "${effect.name}" on item "${item.name}" - removed invalid type: ${effect.type}`);
      }
    }

    if (hasInvalidEffects) {
      try {
        // Update effects to remove invalid type field
        await item.updateEmbeddedDocuments('ActiveEffect', effectsData);
        return { fixedCount, needsUpdate: true };
      } catch (err) {
        SWSELogger.error(`  Error updating effects on item "${item.name}":`, err);
        return { fixedCount, needsUpdate: false };
      }
    }

    return { fixedCount, needsUpdate: false };
  }

  /**
   * Main migration entry point
   */
  static async run() {
    // Only GMs can run migrations
    if (!game.user.isGM) {
      SWSELogger.log('SWSE | Skipping talent effect validation migration (not GM)');
      return;
    }

    // Check if migration needed
    if (!(await this.needsMigration())) {
      SWSELogger.log('SWSE | Talent effect validation migration already complete');
      return;
    }

    SWSELogger.log('SWSE | Starting talent effect validation migration...');
    ui.notifications.info('Fixing talent effect validation issues, please wait...');

    let fixedItems = 0;
    let fixedActors = 0;
    let skippedItems = 0;
    let errors = 0;

    // ============================================
    // Fix effects on standalone items in the world
    // ============================================
    SWSELogger.log('SWSE | Checking world items for invalid effect types...');
    for (const item of game.items) {
      try {
        const { fixedCount, needsUpdate } = await this.fixItemEffects(item);

        if (needsUpdate) {
          fixedItems += fixedCount;
        } else {
          skippedItems++;
        }
      } catch (err) {
        SWSELogger.error(`Error fixing effects on item ${item.name}:`, err);
        errors++;
      }
    }

    // ============================================
    // Fix effects on items embedded in actors
    // ============================================
    SWSELogger.log('SWSE | Checking actor items for invalid effect types...');
    for (const actor of game.actors) {
      try {
        let actorFixed = 0;

        for (const item of actor.items) {
          const { fixedCount, needsUpdate } = await this.fixItemEffects(item);

          if (needsUpdate) {
            actorFixed += fixedCount;
          }
        }

        if (actorFixed > 0) {
          fixedActors++;
          SWSELogger.log(`  Fixed ${actorFixed} effect(s) on items in actor "${actor.name}"`);
        }

      } catch (err) {
        SWSELogger.error(`Error fixing items in actor ${actor.name}:`, err);
        errors++;
      }
    }

    // ============================================
    // Fix effects directly on actors
    // ============================================
    SWSELogger.log('SWSE | Checking actors for invalid effect types...');
    for (const actor of game.actors) {
      try {
        if (actor.effects && actor.effects.size > 0) {
          const effectsData = [];
          let hasInvalidEffects = false;

          for (const effect of actor.effects) {
            if (this.isInvalidEffectType(effect.type)) {
              hasInvalidEffects = true;
              effectsData.push({
                _id: effect.id,
                type: undefined
              });

              SWSELogger.log(`  Fixed effect "${effect.name}" on actor "${actor.name}" - removed invalid type: ${effect.type}`);
            }
          }

          if (hasInvalidEffects) {
            await actor.updateEmbeddedDocuments('ActiveEffect', effectsData);
            fixedActors++;
          }
        }
      } catch (err) {
        SWSELogger.error(`Error fixing effects on actor ${actor.name}:`, err);
        errors++;
      }
    }

    SWSELogger.log('='.repeat(60));
    SWSELogger.log('SWSE | Talent Effect Validation Migration Complete');
    SWSELogger.log(`✓ Fixed: ${fixedItems} effects on world items`);
    SWSELogger.log(`✓ Fixed: ${fixedActors} actors with corrected effects`);
    SWSELogger.log(`○ Skipped: ${skippedItems} items (no invalid effects)`);
    if (errors > 0) {
      SWSELogger.log(`✗ Errors: ${errors} items/actors`);
    }
    SWSELogger.log('='.repeat(60));

    // Mark migration as complete
    await this.markComplete();

    const total = fixedItems + fixedActors;
    if (total > 0) {
      ui.notifications.info(`Talent effect validation fixed! Corrected ${total} effect(s).`);
    } else {
      ui.notifications.info('Talent effect validation migration complete! No fixes needed.');
    }

    return { fixedItems, fixedActors, skippedItems, errors };
  }
}

// Register globally for manual runs
Hooks.once('init', () => {
  if (!game.swse) {game.swse = {};}
  if (!game.swse.migrations) {game.swse.migrations = {};}
  game.swse.migrations.fixTalentEffectValidation = TalentEffectValidationMigration.run.bind(TalentEffectValidationMigration);
});

// Auto-run on ready
Hooks.once('ready', async () => {
  if (game.user.isGM) {
    try {
      await TalentEffectValidationMigration.run();
    } catch (err) {
      SWSELogger.error('SWSE | Talent effect validation migration failed:', err);
      ui.notifications.error(`Talent effect validation migration failed: ${err.message || err}`, { permanent: true });
    }
  }
});

SWSELogger.log('SWSE | Talent effect validation migration script loaded. Manual run: await game.swse.migrations.fixTalentEffectValidation()');
