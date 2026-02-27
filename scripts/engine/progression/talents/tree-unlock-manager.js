/**
 * Talent Tree Unlock Manager - Phase 1
 *
 * Manages talent tree unlock state at L1.
 * Minimal implementation: tracks which trees are accessible for talent selection.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class TreeUnlockManager {
  /**
   * Initialize L1 tree unlocks for a character
   * @param {Object} classDoc - Class item document
   * @param {Object} characterData - CharGen characterData object
   * @returns {Array<string>} List of unlocked tree IDs
   */
  static initializeL1TreeUnlocks(classDoc, characterData = {}) {
    const unlockedTrees = [];

    // Unlock class talent trees
    if (classDoc.system?.talent_trees && Array.isArray(classDoc.system.talent_trees)) {
      unlockedTrees.push(...classDoc.system.talent_trees);
      SWSELogger.log(
        `[TreeUnlockManager] Unlocked ${classDoc.system.talent_trees.length} class trees ` +
        `for ${classDoc.name}`
      );
    }

    // Phase 1: Force tree only unlocked if Force Sensitivity selected
    // (Full Force unlock validation deferred to Phase 2)
    if (characterData.hasForcePoints || characterData.forcePoints > 0) {
      // Add force tree identifier if it exists
      // For now, just mark as available for validation
      SWSELogger.log('[TreeUnlockManager] Force tree marked as accessible (Force Sensitivity detected)');
    }

    SWSELogger.log(
      `[TreeUnlockManager] L1 tree initialization complete: ${unlockedTrees.length} trees unlocked`
    );

    return unlockedTrees;
  }

  /**
   * Check if a talent tree is unlocked
   * @param {string} treeId - Tree ID to check
   * @param {Array<string>} unlockedTrees - List of unlocked tree IDs
   * @returns {boolean} True if tree is unlocked
   */
  static isTreeUnlocked(treeId, unlockedTrees = []) {
    if (!Array.isArray(unlockedTrees)) {
      return false;
    }
    return unlockedTrees.includes(treeId);
  }

  /**
   * Get list of unlocked trees for chargen display
   * @param {Array<string>} unlockedTrees - List of unlocked tree IDs
   * @returns {Array<string>} Filtered list of accessible trees
   */
  static getAccessibleTrees(unlockedTrees = []) {
    return Array.isArray(unlockedTrees) ? [...unlockedTrees] : [];
  }
}

export default TreeUnlockManager;
