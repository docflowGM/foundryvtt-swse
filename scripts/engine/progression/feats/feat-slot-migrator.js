/**
 * Feat Slot Migrator - Phase 1.5
 *
 * Backward-compatible migration for existing actors.
 * Converts existing feat arrays into structured feat slot objects.
 */

import { FeatSlotSchema } from './feat-slot-schema.js';
import { ClassFeatRegistry } from './class-feat-registry.js';
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class FeatSlotMigrator {
  /**
   * Migrate existing actor to structured feat slot model (if needed)
   * @param {Object} actor - Actor document
   * @returns {Promise<Object>} {migrated: boolean, slots: Array, message: string}
   */
  static async migrateActorIfNeeded(actor) {
    // If already has structured slots, no migration needed
    if (actor.system?.progression?.featSlots && Array.isArray(actor.system.progression.featSlots)) {
      return {
        migrated: false,
        slots: actor.system.progression.featSlots,
        message: 'Already has structured feat slots'
      };
    }

    // Get actor's class for slot inference
    const primaryClass = actor.system?.classes?.[0];
    const classId = primaryClass?._id;

    // Get feats from actor items
    const existingFeats = actor.items.filter(item => item.type === 'feat') || [];

    // Get bonus feats for this class (if applicable)
    let classBonusFeats = [];
    if (classId) {
      classBonusFeats = await ClassFeatRegistry.getClassBonusFeats(classId);
    }

    // Infer slots from existing feats
    const slots = [];

    for (const feat of existingFeats) {
      let slot;

      // Infer slot type from class bonus list
      if (classBonusFeats.includes(feat._id)) {
        // This appears to be a class bonus feat
        slot = FeatSlotSchema.createClassSlot(classId, 1);
        slot.consumed = true;
        slot.itemId = feat._id;
      } else {
        // Treat as heroic (general) feat slot
        slot = FeatSlotSchema.createHeroicSlot('migration', 1);
        slot.consumed = true;
        slot.itemId = feat._id;
      }

      slots.push(slot);
      SWSELogger.log(`[FeatSlotMigrator] Slot for feat ${feat.name}: ${slot.slotType}`);
    }

    // Add empty slots based on featsRequired
    const featsRequired = actor.system?.featsRequired || 1;
    const emptySlots = featsRequired - existingFeats.length;

    for (let i = 0; i < emptySlots; i++) {
      slots.push(FeatSlotSchema.createHeroicSlot('species', 1));
    }

    SWSELogger.log(
      `[FeatSlotMigrator] Migrated actor: ${existingFeats.length} existing feats, ${emptySlots} empty slots`
    );

    return {
      migrated: true,
      slots,
      message: `Migrated ${existingFeats.length} feats and ${emptySlots} empty slots to structured model`
    };
  }

  /**
   * Apply migration to actor document (updates system data)
   * @param {Object} actor - Actor document
   * @returns {Promise<Object>} Updated actor data
   */
  static async applyMigrationToActor(actor) {
    const migration = await this.migrateActorIfNeeded(actor);

    if (!migration.migrated) {
      return { migrated: false, slots: migration.slots };
    }

    // Update actor with structured slots
    const updateData = {
      'system.progression.featSlots': migration.slots
    };

    SWSELogger.log(`[FeatSlotMigrator] Applying migration: ${migration.message}`);

    return {
      migrated: true,
      slots: migration.slots,
      updateData,
      message: migration.message
    };
  }

  /**
   * Check if an actor needs migration
   * @param {Object} actor - Actor document
   * @returns {boolean} True if migration needed
   */
  static needsMigration(actor) {
    const hasStructuredSlots = actor.system?.progression?.featSlots &&
                               Array.isArray(actor.system.progression.featSlots) &&
                               actor.system.progression.featSlots.length > 0;

    const hasFeats = actor.items && actor.items.some(item => item.type === 'feat');

    // Needs migration if it has feats but no structured slots
    return hasFeats && !hasStructuredSlots;
  }
}

export default FeatSlotMigrator;
