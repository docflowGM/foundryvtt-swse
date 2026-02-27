/**
 * Talent Slot Validator - Phase 1
 *
 * SINGLE VALIDATION PATH for talent slot usage.
 * All validation goes through this class - no parallel logic branches.
 * SlotType determines slot behavior; Source is metadata only.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { TreeUnlockManager } from './tree-unlock-manager.js';

export class TalentSlotValidator {
  /**
   * Validate if a talent can be selected for a specific slot
   * CANONICAL: Only validator that answers "is this selection valid?"
   *
   * @param {Object} talent - Talent item to select
   * @param {Object} slot - TalentSlot to fill
   * @param {Array<string>} unlockedTrees - List of unlocked tree IDs
   * @param {Object} chargenData - Full chargen data (for prerequisites)
   * @returns {Object} {valid: boolean, message: string}
   */
  static validateTalentForSlot(talent, slot, unlockedTrees = [], chargenData = {}) {
    const errors = [];

    // Validate slot structure
    if (!slot || typeof slot !== 'object') {
      return {
        valid: false,
        message: 'Invalid slot object provided to validator'
      };
    }

    // Validate talent structure
    if (!talent || !talent._id) {
      return {
        valid: false,
        message: 'Invalid talent provided to validator'
      };
    }

    // Check 1: Slot not already consumed
    if (slot.consumed) {
      errors.push('This slot has already been filled');
    }

    // Check 2: Tree access based on slotType
    // Key principle: Validation is IDENTICAL for all slot types
    // Only slot AVAILABILITY differs, not validation rules
    if (slot.slotType === 'class') {
      // Class slots must select from class's talent tree
      const talentTree = talent.system?.talent_tree || talent.system?.talentTree;
      if (slot.classId && talentTree) {
        // Simplistic check: class slot's classId should match or be in accessible trees
        // (Full tree validation deferred to Phase 2)
        if (!TreeUnlockManager.isTreeUnlocked(talentTree, unlockedTrees)) {
          if (unlockedTrees.length > 0) {
            // Only error if trees are tracked and this isn't one of them
            errors.push(`Talent tree not unlocked for class slots: ${talentTree}`);
          }
        }
      }
    } else if (slot.slotType === 'heroic') {
      // Heroic slots can select from any unlocked tree
      const talentTree = talent.system?.talent_tree || talent.system?.talentTree;
      if (talentTree && unlockedTrees.length > 0) {
        if (!TreeUnlockManager.isTreeUnlocked(talentTree, unlockedTrees)) {
          errors.push(`Talent tree not unlocked: ${talentTree}`);
        }
      }
    }

    // Check 3: Prerequisites (if system has prerequisite checker)
    // Deferred to Phase 2 hardening

    SWSELogger.log(
      `[TalentSlotValidator] Validation for ${talent.name} to ${slot.slotType} slot: ` +
      `${errors.length === 0 ? 'PASS' : 'FAIL'}`
    );

    return {
      valid: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : 'Valid'
    };
  }

  /**
   * Validate that total selection count matches available slots
   * @param {Array<Object>} selectedTalents - Talents being selected
   * @param {Array<Object>} talentSlots - Available slots
   * @returns {Object} {valid: boolean, availableSlots: number, selectedCount: number, message: string}
   */
  static validateTotalSlots(selectedTalents = [], talentSlots = []) {
    const availableSlots = talentSlots.filter(s => !s.consumed).length;
    const selectedCount = selectedTalents.length;

    if (selectedCount > availableSlots) {
      return {
        valid: false,
        availableSlots,
        selectedCount,
        message: `Selected ${selectedCount} talents but only ${availableSlots} slots available`
      };
    }

    return {
      valid: true,
      availableSlots,
      selectedCount,
      message: `${selectedCount}/${availableSlots} slots used`
    };
  }

  /**
   * Validate all talent selections in chargen are valid
   * @param {Array<Object>} selectedTalents - All selected talents
   * @param {Array<Object>} talentSlots - All available slots
   * @param {Array<string>} unlockedTrees - Unlocked tree IDs
   * @param {Object} chargenData - Full chargen data
   * @returns {Object} {valid: boolean, message: string}
   */
  static validateAllSelections(selectedTalents = [], talentSlots = [], unlockedTrees = [], chargenData = {}) {
    // Check total slot count
    const totalValidation = this.validateTotalSlots(selectedTalents, talentSlots);
    if (!totalValidation.valid) {
      return {
        valid: false,
        message: totalValidation.message
      };
    }

    // Check each talent against its slot (order matters for class vs heroic)
    const errors = [];
    for (let i = 0; i < selectedTalents.length; i++) {
      const talent = selectedTalents[i];
      const slot = talentSlots[i];

      if (slot) {
        const validation = this.validateTalentForSlot(talent, slot, unlockedTrees, chargenData);
        if (!validation.valid) {
          errors.push(`Talent ${i + 1} (${talent.name}): ${validation.message}`);
        }
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        message: errors.join('; ')
      };
    }

    return {
      valid: true,
      message: 'All talents valid'
    };
  }
}

export default TalentSlotValidator;
