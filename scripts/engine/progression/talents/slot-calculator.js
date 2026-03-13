/**
 * Talent Slot Calculator - Phase 1/2
 *
 * Calculates talent slots at L1 chargen based on class + house rules.
 * Uses TalentCadenceEngine as the single source of truth for talent progression.
 * Supports RAW + house rules via explicit source tagging.
 *
 * PHASE 2: Now delegates talent cadence rules to TalentCadenceEngine
 * for consistency with levelup and other systems.
 */

import { TalentSlotSchema } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-slot-schema.js";
import { TalentCadenceEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-cadence-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class TalentSlotCalculator {
  /**
   * Calculate talent slots for L1 chargen
   * PHASE 2: Now uses TalentCadenceEngine for authoritative talent progression
   *
   * @param {Object} classDoc - Class item document
   * @param {Object} settings - DEPRECATED - house rules are now read from TalentCadenceEngine
   * @returns {Array<Object>} Array of TalentSlot objects
   */
  static calculateL1Slots(classDoc, settings = {}) {
    const slots = [];

    // PHASE 2: Use TalentCadenceEngine as single source of truth
    const talentCount = TalentCadenceEngine.calculateL1TalentCount();
    const cadenceDesc = TalentCadenceEngine.getDescription();

    // RAW + House Rules: TalentCadenceEngine determines slot composition
    // Always grant 1 class talent slot at L1
    slots.push(TalentSlotSchema.createClassSlot(classDoc._id, 1));
    SWSELogger.log('[TalentSlotCalculator] L1: Added 1 class slot (RAW requirement)');

    // If talentCount > 1, add the extra slot (heroic for house rule)
    if (talentCount > 1) {
      slots.push(TalentSlotSchema.createHeroicSlot('houserule:talentEveryLevelExtraL1', 1));
      SWSELogger.log('[TalentSlotCalculator] L1: Added heroic slot via house rule (talentCadenceEngine)');
    }

    SWSELogger.log(
      `[TalentSlotCalculator] L1 slots calculated: ${slots.length} total ` +
      `(class=${slots.filter(s => s.slotType === 'class').length}, ` +
      `heroic=${slots.filter(s => s.slotType === 'heroic').length}) ` +
      `Cadence: ${cadenceDesc}`
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
