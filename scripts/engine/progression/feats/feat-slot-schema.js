/**
 * Feat Slot Schema - Phase 1.5
 *
 * Structured feat slot objects matching unified slot model.
 * Symmetric with talent slots to ensure consistent grant/authority system.
 */

/**
 * Feat Slot Object (unified schema)
 * @typedef {Object} FeatSlot
 * @property {string} slotKind - Always "feat" for feat slots
 * @property {string} slotType - ENUM: 'class' | 'heroic'
 * @property {string|null} classId - For class bonus slots: the class providing this slot
 * @property {string} source - Grant source for audit trail. Examples: 'class', 'houserule'
 * @property {number} levelGranted - Character level when slot was granted
 * @property {boolean} consumed - Whether a feat has been selected for this slot
 * @property {string|null} itemId - ID of selected feat (if consumed)
 */

export const FeatSlotSchema = {
  /**
   * Create a class bonus feat slot (RAW)
   * @param {string} classId - Class granting the slot
   * @param {number} level - Level at which granted
   * @returns {Object} Slot object
   */
  createClassSlot(classId, level = 1) {
    return {
      slotKind: 'feat',
      slotType: 'class',
      classId,
      source: 'class',
      levelGranted: level,
      consumed: false,
      itemId: null
    };
  },

  /**
   * Create a heroic (general) feat slot
   * @param {string} source - Source identifier (usually 'heroic' or 'species')
   * @param {number} level - Level at which granted
   * @returns {Object} Slot object
   */
  createHeroicSlot(source = 'heroic', level = 1) {
    return {
      slotKind: 'feat',
      slotType: 'heroic',
      classId: null,
      source,
      levelGranted: level,
      consumed: false,
      itemId: null
    };
  },

  /**
   * Mark a slot as consumed with a feat
   * @param {Object} slot - Slot to mark consumed
   * @param {string} itemId - ID of selected feat
   * @returns {Object} Updated slot
   */
  consumeSlot(slot, itemId) {
    return {
      ...slot,
      consumed: true,
      itemId
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
      slot.slotKind === 'feat' &&
      ['class', 'heroic'].includes(slot.slotType) &&
      typeof slot.source === 'string' &&
      typeof slot.consumed === 'boolean' &&
      (slot.classId === null || typeof slot.classId === 'string') &&
      (slot.itemId === null || typeof slot.itemId === 'string') &&
      typeof slot.levelGranted === 'number'
    );
  }
};

export default FeatSlotSchema;
