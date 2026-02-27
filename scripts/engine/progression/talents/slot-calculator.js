/**
 * Talent Slot Calculator - Phase 1
 *
 * Calculates talent slots at L1 chargen based on class + house rules.
 * Single source of truth for slot generation.
 * Supports RAW + house rules via explicit source tagging.
 */

import { TalentSlotSchema } from './talent-slot-schema.js';
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class TalentSlotCalculator {
  /**
   * Calculate talent slots for L1 chargen
   * @param {Object} classDoc - Class item document
   * @param {Object} settings - House rule settings {talentEveryLevel, talentEveryLevelExtraL1}
   * @returns {Array<Object>} Array of TalentSlot objects
   */
  static calculateL1Slots(classDoc, settings = {}) {
    const slots = [];

    // RAW: Always grant 1 class talent slot at L1
    slots.push(TalentSlotSchema.createClassSlot(classDoc._id, 1));
    SWSELogger.log('[TalentSlotCalculator] L1: Added 1 class slot');

    // House rule: talentEveryLevelExtraL1 grants additional heroic slot at L1
    if (settings.talentEveryLevel && settings.talentEveryLevelExtraL1) {
      slots.push(TalentSlotSchema.createHeroicSlot('houserule:talentEveryLevelExtraL1', 1));
      SWSELogger.log('[TalentSlotCalculator] L1: Added heroic slot via house rule');
    }

    SWSELogger.log(
      `[TalentSlotCalculator] L1 slots calculated: ${slots.length} total ` +
      `(class=${slots.filter(s => s.slotType === 'class').length}, ` +
      `heroic=${slots.filter(s => s.slotType === 'heroic').length})`
    );

    return slots;
  }

  /**
   * Get available (unconsumed) slot count for display/validation
   * @param {Array<Object>} slots - Array of TalentSlot objects
   * @param {string} slotType - Filter by type ('class', 'heroic', or null for all)
   * @returns {number} Count of available slots
   */
  static getAvailableSlotCount(slots, slotType = null) {
    let filtered = slots.filter(s => !s.consumed);
    if (slotType) {
      filtered = filtered.filter(s => s.slotType === slotType);
    }
    return filtered.length;
  }

  /**
   * Get consumed (filled) slot count
   * @param {Array<Object>} slots - Array of TalentSlot objects
   * @returns {number} Count of consumed slots
   */
  static getConsumedSlotCount(slots) {
    return slots.filter(s => s.consumed).length;
  }

  /**
   * Get total slot count (available + consumed)
   * @param {Array<Object>} slots - Array of TalentSlot objects
   * @returns {number} Total slots
   */
  static getTotalSlotCount(slots) {
    return slots.length;
  }
}

export default TalentSlotCalculator;
