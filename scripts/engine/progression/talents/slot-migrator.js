/**
 * Talent Slot Migrator - Phase 1
 *
 * Backward-compatible migration for existing actors.
 * Converts numeric talent counters to structured slot objects.
 */

import { TalentSlotSchema } from './talent-slot-schema.js';
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class TalentSlotMigrator {
  /**
   * Migrate existing actor to structured slot model (if needed)
   * @param {Object} actor - Actor document
   * @returns {Object} {migrated: boolean, slots: Array, message: string}
   */
  static migrateActorIfNeeded(actor) {
    // If already has structured slots, no migration needed
    if (actor.system?.progression?.talentSlots && Array.isArray(actor.system.progression.talentSlots)) {
      return {
        migrated: false,
        slots: actor.system.progression.talentSlots,
        message: 'Already has structured slots'
      };
    }

    // If no numeric counter either, create default L1 slots
    if (typeof actor.system?.talentsRequired !== 'number') {
      const slots = [TalentSlotSchema.createClassSlot(actor.system?.classes?.[0]?._id, 1)];
      return {
        migrated: true,
        slots,
        message: 'Created default L1 slots'
      };
    }

    // Reconstruct slots from numeric counter
    const talentsRequired = actor.system.talentsRequired || 1;
    const existingTalents = actor.items.filter(item => item.type === 'talent') || [];
    const slots = [];

    SWSELogger.log(
      `[TalentSlotMigrator] Migrating actor: ${talentsRequired} slots, ${existingTalents.length} existing talents`
    );

    // Create slots based on numeric counter
    for (let i = 0; i < talentsRequired; i++) {
      let slot;

      // Infer slot type from source field if available
      const correspondingTalent = existingTalents[i];
      const source = correspondingTalent?.system?.source || '';

      if (source.includes('Class') || source.includes('class')) {
        // Appears to be a class slot
        slot = TalentSlotSchema.createClassSlot(actor.system?.classes?.[0]?._id, 1);
      } else {
        // Assume heroic slot
        slot = TalentSlotSchema.createHeroicSlot('migration', 1);
      }

      // Mark as consumed if talent exists
      if (correspondingTalent) {
        slot.consumed = true;
        slot.talentId = correspondingTalent._id;
        SWSELogger.log(`[TalentSlotMigrator] Slot ${i + 1}: Consumed by ${correspondingTalent.name}`);
      }

      slots.push(slot);
    }

    return {
      migrated: true,
      slots,
      message: `Migrated ${talentsRequired} numeric slots to structured objects`
    };
  }

  /**
   * Apply migration to actor document (updates system data)
   * @param {Object} actor - Actor document
   * @returns {Promise<Object>} Updated actor data
   */
  static async applyMigrationToActor(actor) {
    const migration = this.migrateActorIfNeeded(actor);

    if (!migration.migrated) {
      return { migrated: false, slots: migration.slots };
    }

    // Update actor with structured slots
    const updateData = {
      'system.progression.talentSlots': migration.slots
    };

    SWSELogger.log(`[TalentSlotMigrator] Applying migration: ${migration.message}`);

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
    const hasStructuredSlots = actor.system?.progression?.talentSlots &&
                               Array.isArray(actor.system.progression.talentSlots) &&
                               actor.system.progression.talentSlots.length > 0;

    const hasNumericCounter = typeof actor.system?.talentsRequired === 'number';

    // Needs migration if it has numeric counter but no structured slots
    return hasNumericCounter && !hasStructuredSlots;
  }
}

export default TalentSlotMigrator;
