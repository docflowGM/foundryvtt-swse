/**
 * SWSE Talent Slot Schema - Phase 1
 *
 * Structured replacement for numeric talent counters.
 * Supports RAW, house rules, and prestige grants via explicit source tagging.
 *
 * Single validation path: SlotType determines behavior, Source is metadata only.
 */

/**
 * Talent Slot Object
 * @typedef {Object} TalentSlot
 * @property {string} slotType - ENUM: 'class' | 'heroic'
 * @property {string} source - Grant source for audit trail. Examples: 'class', 'houserule:talentEveryLevelExtraL1'
 * @property {string|null} classId - For class slots: the class providing this slot
 * @property {number} levelGranted - Character level when slot was granted
 * @property {boolean} consumed - Whether a talent has been selected for this slot
 * @property {string|null} talentId - ID of selected talent (if consumed)
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
      slotType: 'class',
      source: 'class',
      classId,
      levelGranted: level,
      consumed: false,
      talentId: null
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
      slotType: 'heroic',
      source,
      classId: null,
      levelGranted: level,
      consumed: false,
      talentId: null
    };
  },

  /**
   * Mark a slot as consumed with a talent
   * @param {Object} slot - Slot to mark consumed
   * @param {string} talentId - ID of selected talent
   * @returns {Object} Updated slot
   */
  consumeSlot(slot, talentId) {
    return {
      ...slot,
      consumed: true,
      talentId
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
      ['class', 'heroic'].includes(slot.slotType) &&
      typeof slot.source === 'string' &&
      typeof slot.consumed === 'boolean' &&
      (slot.classId === null || typeof slot.classId === 'string') &&
      (slot.talentId === null || typeof slot.talentId === 'string') &&
      typeof slot.levelGranted === 'number'
    );
  }
};

export default TalentSlotSchema;
