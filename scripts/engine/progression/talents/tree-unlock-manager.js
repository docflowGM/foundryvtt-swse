/**
 * Talent Tree Unlock Manager - Phase 1 / Phase 4
 *
 * Manages talent tree unlock state at L1.
 * Minimal implementation: tracks which trees are accessible for talent selection.
 *
 * Phase 4: Route all mutations through ActorEngine (governance compliance).
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

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

  /**
   * Remove domains that are no longer valid due to feat removal
   * Called when a feat that unlocked a domain is removed from the actor
   *
   * PHASE 2.1: Runtime domain cleanup for live removals
   *
   * @param {Actor} actor - The actor document
   * @param {Object} removedFeat - The feat being removed
   * @returns {Object|null} Update object for actor or null if no change
   */
  static removeDomainsForRemovedFeat(actor, removedFeat) {
    if (!actor || !removedFeat) {return null;}

    const currentDomains = actor.system?.progression?.unlockedDomains || [];
    const updatedDomains = [...currentDomains];
    let changed = false;

    // Check which domains this feat unlocked
    const featName = removedFeat.name || removedFeat;
    const featNameLower = typeof featName === 'string' ? featName.toLowerCase() : '';

    // Force Sensitivity feat unlocks force domain
    if (featNameLower.includes('force sensitivity')) {
      if (updatedDomains.includes('force')) {
        updatedDomains.splice(updatedDomains.indexOf('force'), 1);
        changed = true;

        SWSELogger.log(
          `[TreeUnlockManager] Force domain removed due to Force Sensitivity feat removal from ${actor.name}`
        );
      }
    }

    // Return update object if domains changed
    if (changed) {
      return {
        'system.progression.unlockedDomains': updatedDomains
      };
    }

    return null;
  }

  /**
   * Remove inaccessible talents when a domain is unlocked
   * Called after domain cleanup to remove talents from affected trees
   *
   * PHASE 2.1: Talent cleanup for domain removal
   *
   * @param {Actor} actor - The actor document
   * @param {Array<string>} removedDomains - Domains that were removed
   * @returns {Promise<void>}
   */
  static async removeInaccessibleTalents(actor, removedDomains) {
    if (!actor || !removedDomains || removedDomains.length === 0) {return;}

    const talentToRemove = [];

    // Find talents in removed domains
    for (const talent of actor.items) {
      if (talent.type !== 'talent') {continue;}

      const treeId = talent.system?.talent_tree ||
                     talent.system?.talentTree ||
                     talent.system?.tree;

      // Check if this talent's tree is in a removed domain
      if (treeId) {
        for (const domain of removedDomains) {
          if (treeId.toLowerCase().includes(domain.toLowerCase())) {
            talentToRemove.push(talent.id);
            SWSELogger.log(
              `[TreeUnlockManager] Talent "${talent.name}" (tree: ${treeId}) marked for removal ` +
              `(domain "${domain}" no longer unlocked)`
            );
            break;
          }
        }
      }
    }

    // Delete inaccessible talents via ActorEngine (Phase 4: governance compliance)
    if (talentToRemove.length > 0) {
      try {
        await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', talentToRemove);
        SWSELogger.log(
          `[TreeUnlockManager] Removed ${talentToRemove.length} inaccessible talents from ${actor.name}`
        );
      } catch (err) {
        SWSELogger.error(
          `[TreeUnlockManager] Failed to remove inaccessible talents:`,
          err
        );
      }
    }
  }
}

export default TreeUnlockManager;
