/**
 * Talent Tree Authority - Phase 2
 *
 * Derived talent tree authority model.
 * Single authoritative function for tree access control.
 * No persistence - all authority derived from actor state.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { TalentTreeRegistry } from "./TalentTreeRegistry.js";

/**
 * Get allowed talent trees for a given slot
 * CANONICAL: Single source of truth for tree access
 *
 * @param {Object} actor - Actor document
 * @param {Object} slot - TalentSlot object {slotType, classId, ...}
 * @returns {Array<string>} Array of allowed tree IDs
 */
export function getAllowedTalentTrees(actor, slot) {
  if (!actor || !slot) {
    return [];
  }

  const allowedTrees = [];

  // Rule 1: Class slots restrict to that class's trees ONLY
  if (slot.slotType === "class" && slot.classId) {
    const classes = actor.system?.classes || [];
    const classDoc = classes.find(c => c._id === slot.classId);

    if (classDoc?.system?.talent_trees) {
      SWSELogger.log(
        `[TreeAuthority] Class slot: Adding ${classDoc.system.talent_trees.length} trees for class ${classDoc.name}`
      );
      return classDoc.system.talent_trees;
    }

    SWSELogger.log(
      `[TreeAuthority] Class slot: No trees found for class ${slot.classId}`
    );
    return [];
  }

  // Rule 2: Heroic slots can access multiple tree categories
  if (slot.slotType === "heroic") {
    const classes = actor.system?.classes || [];

    // Add all trees from character's classes
    for (const classDoc of classes) {
      if (classDoc.system?.talent_trees) {
        allowedTrees.push(...classDoc.system.talent_trees);
        SWSELogger.log(
          `[TreeAuthority] Heroic slot: Added ${classDoc.system.talent_trees.length} trees from class ${classDoc.name}`
        );
      }
    }

    // Add Force trees only if Force domain is unlocked
    const unlockedDomains = actor.system?.progression?.unlockedDomains || [];
    if (unlockedDomains.includes("force")) {
      try {
        // Get Force talent trees from registry
        // NOTE: This assumes Force trees are tagged/identifiable in registry
        const forceTreeIds = TalentTreeRegistry.getTreesByDomain?.("force") || [];
        if (forceTreeIds.length > 0) {
          allowedTrees.push(...forceTreeIds);
          SWSELogger.log(
            `[TreeAuthority] Heroic slot: Added ${forceTreeIds.length} Force trees (domain unlocked)`
          );
        }
      } catch (err) {
        SWSELogger.warn("[TreeAuthority] Failed to retrieve Force trees:", err);
      }
    }

    // Return deduplicated list
    const deduplicated = [...new Set(allowedTrees)];
    SWSELogger.log(
      `[TreeAuthority] Heroic slot: Total ${deduplicated.length} allowed trees`
    );
    return deduplicated;
  }

  // Invalid slot type
  SWSELogger.warn(
    `[TreeAuthority] Unknown slot type: ${slot.slotType}. Denying access.`
  );
  return [];
}

/**
 * Check if a talent tree is accessible for a given slot
 * @param {Object} actor - Actor document
 * @param {Object} slot - TalentSlot object
 * @param {string} treeId - Tree ID to check
 * @returns {boolean} True if tree is allowed for this slot
 */
export function isTreeAccessible(actor, slot, treeId) {
  const allowed = getAllowedTalentTrees(actor, slot);
  return allowed.includes(treeId);
}

export default {
  getAllowedTalentTrees,
  isTreeAccessible
};
