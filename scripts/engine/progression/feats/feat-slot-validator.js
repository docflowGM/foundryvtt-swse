/**
 * Feat Slot Validator - Phase 1.5
 *
 * Validates feat selection against structured feat slots.
 * Mirrors TalentSlotValidator for symmetry.
 * Single validation path - no branching on source.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ClassFeatRegistry } from './class-feat-registry.js';

export class FeatSlotValidator {
  /**
   * Validate if a feat can be selected for a specific slot
   * CANONICAL: Only validator that answers "is this feat selection valid?"
   *
   * @param {Object} feat - Feat item to select
   * @param {Object} slot - FeatSlot to fill
   * @param {Object} actor - Actor (for context)
   * @returns {Promise<Object>} {valid: boolean, message: string}
   */
  static async validateFeatForSlot(feat, slot, actor = null) {
    const errors = [];

    // Validate slot structure
    if (!slot || typeof slot !== 'object') {
      return {
        valid: false,
        message: 'Invalid slot object provided to validator'
      };
    }

    // Validate feat structure
    if (!feat || !feat._id) {
      return {
        valid: false,
        message: 'Invalid feat provided to validator'
      };
    }

    // Check 1: Slot not already consumed
    if (slot.consumed) {
      errors.push('This slot has already been filled');
    }

    // Check 2: Eligibility based on slotType (NOT source)
    // Key principle: Validation is IDENTICAL for all slot types
    if (slot.slotType === 'class') {
      // Class bonus feat slots restrict to class-specific feats
      if (slot.classId) {
        const allowed = await ClassFeatRegistry.getClassBonusFeats(slot.classId);
        if (allowed.length > 0 && !allowed.includes(feat._id)) {
          errors.push(`Feat not allowed for class bonus slot: must be from class feat list`);
        }
      }
    } else if (slot.slotType === 'heroic') {
      // Heroic slots allow any feat (no restriction)
      // Validation handled by prerequisite checks elsewhere
    }

    SWSELogger.log(
      `[FeatSlotValidator] Validation for ${feat.name} to ${slot.slotType} slot: ` +
      `${errors.length === 0 ? 'PASS' : 'FAIL'}`
    );

    return {
      valid: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : 'Valid'
    };
  }

  /**
   * Validate that total selection count matches available slots
   * @param {Array<Object>} selectedFeats - Feats being selected
   * @param {Array<Object>} featSlots - Available slots
   * @returns {Object} {valid: boolean, availableSlots: number, selectedCount: number, message: string}
   */
  static validateTotalSlots(selectedFeats = [], featSlots = []) {
    const availableSlots = featSlots.filter(s => !s.consumed).length;
    const selectedCount = selectedFeats.length;

    if (selectedCount > availableSlots) {
      return {
        valid: false,
        availableSlots,
        selectedCount,
        message: `Selected ${selectedCount} feats but only ${availableSlots} slots available`
      };
    }

    return {
      valid: true,
      availableSlots,
      selectedCount,
      message: `${selectedCount}/${availableSlots} slots used`
    };
  }
}

export default FeatSlotValidator;
