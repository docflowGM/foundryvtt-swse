/**
 * Talent Tree Authority - Phase 2
 *
 * Derived talent tree authority model.
 * Single authoritative function for tree access control.
 * No persistence - all authority derived from actor state.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { TalentTreeRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/TalentTreeRegistry.js";
import { resolveClassModel, getClassTalentTreeLookupKeys } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js";

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

  const normalizeAccessKeys = (classDoc) => {
    const model = resolveClassModel(classDoc) || classDoc || {};
    const lookup = getClassTalentTreeLookupKeys(model) || {};
    return [
      ...(lookup.treeIds || []),
      ...(lookup.treeNames || []),
      ...(model.talentTreeIds || []),
      ...(model.talentTreeSourceIds || []),
      ...(model.talentTreeNames || []),
      ...(model.system?.talent_trees || []),
      ...(model.system?.talentTrees || []),
      ...(model.system?.talentTreeIds || []),
    ].filter(Boolean);
  };

  const ownedClassDocs = [
    ...(Array.isArray(actor.system?.classes) ? actor.system.classes : []),
    ...(actor.items?.filter?.(item => item?.type === 'class') || []),
  ];

  // Rule 1: Class slots restrict to the selected/owning class's access list.
  // Trees categorize talents; they do not own talents or grant selections by themselves.
  if (slot.slotType === "class") {
    const selectedClass = slot.classModel || slot.class || slot.selectedClass || null;
    const classDoc = selectedClass || ownedClassDocs.find(c =>
      c?._id === slot.classId || c?.id === slot.classId || c?.system?.id === slot.classId
    );
    const keys = normalizeAccessKeys(classDoc);

    SWSELogger.log(
      `[TreeAuthority] Class slot: ${keys.length} tree access keys for ${classDoc?.name || slot.classId || 'selected class'}`
    );
    return [...new Set(keys)];
  }

  // Rule 2: Heroic slots can access multiple tree categories derived from classes/domains.
  if (slot.slotType === "heroic") {
    // Add all trees from character's classes
    for (const classDoc of ownedClassDocs) {
      const keys = normalizeAccessKeys(classDoc);
      if (keys.length) {
        allowedTrees.push(...keys);
        SWSELogger.log(
          `[TreeAuthority] Heroic slot: Added ${keys.length} tree access keys from class ${classDoc.name}`
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
