/**
 * SWSE Talent Slot Schema - Phase 1
 *
 * Structured replacement for numeric talent counters.
 * Supports RAW, house rules, and prestige grants via explicit source tagging.
 *
 * Single validation path: SlotType determines behavior, Source is metadata only.
 */

/**
 * Talent Slot Object (unified schema)
 * @typedef {Object} TalentSlot
 * @property {string} slotKind - Always "talent" for talent slots (Phase 1.5)
 * @property {string} slotType - ENUM: 'class' | 'heroic'
 * @property {string} source - Grant source for audit trail. Examples: 'class', 'houserule:talentEveryLevelExtraL1'
 * @property {string|null} classId - For class slots: the class providing this slot
 * @property {number} levelGranted - Character level when slot was granted
 * @property {boolean} consumed - Whether a talent has been selected for this slot
 * @property {string|null} itemId - ID of selected talent (if consumed) — unified with feat/maneuver model
 */

export const TalentSlotSchema = {
  /**
   * Create a class talent slot (RAW)
   * @param {string} classId - Class granting the slot
   * @param {number} level - Level at which granted
   * @returns {Object} Slot object
   */
  createClassSlot(classId, level = 1) {
    return {
      slotKind: 'talent',        // Phase 1.5: Unified slot model
      slotType: 'class',
      source: 'class',
      classId,
      levelGranted: level,
      consumed: false,
      itemId: null               // Phase 1.5: Renamed from talentId for unified model
    };
  },

  /**
   * Create a heroic talent slot (RAW or house rule)
   * @param {string} source - Source identifier ('houserule:talentEveryLevelExtraL1', etc.)
   * @param {number} level - Level at which granted (usually 1 for L1)
   * @returns {Object} Slot object
   */
  createHeroicSlot(source = 'heroic', level = 1) {
    return {
      slotKind: 'talent',        // Phase 1.5: Unified slot model
      slotType: 'heroic',
      source,
      classId: null,
      levelGranted: level,
      consumed: false,
      itemId: null               // Phase 1.5: Renamed from talentId for unified model
    };
  },

  /**
   * Mark a slot as consumed with a talent
   * @param {Object} slot - Slot to mark consumed
   * @param {string} itemId - ID of selected talent
   * @returns {Object} Updated slot
   */
  consumeSlot(slot, itemId) {
    return {
      ...slot,
      consumed: true,
      itemId                     // Phase 1.5: Unified property name
    };
  },

  /**
   * Validate slot object structure
   * @param {Object} slot - Slot to validate
   * @returns {boolean} True if valid structure
   */
  isValid(slot) {
    return (
      slot &&
      slot.slotKind === 'talent' &&  // Phase 1.5: Validate slotKind
      ['class', 'heroic'].includes(slot.slotType) &&
      typeof slot.source === 'string' &&
      typeof slot.consumed === 'boolean' &&
      (slot.classId === null || typeof slot.classId === 'string') &&
      (slot.itemId === null || typeof slot.itemId === 'string') &&  // Phase 1.5: Unified property
      typeof slot.levelGranted === 'number'
    );
  }
};

export default TalentSlotSchema;
