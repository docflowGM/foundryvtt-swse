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
import { getDroidTalentTreeName } from "/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-trait-rules.js";

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

  const extractDroidDegree = () => {
    const activeShell = globalThis.game?.__swseActiveProgressionShell;
    const selections = slot?.shell?.progressionSession?.draftSelections || activeShell?.progressionSession?.draftSelections || {};
    const droid = selections.droid || selections.droidBuild || selections.droidPackage || selections.droidSystems || {};
    const candidates = [
      slot?.droidDegree,
      droid.degree,
      droid.droidDegree,
      droid.selectedDegree,
      droid.chassis?.degree,
      droid.chassis?.droidDegree,
      selections.droidDegree,
      selections.pendingDroidContext?.degree,
      selections.pendingDroidContext?.droidDegree,
      actor.system?.droidDegree,
      actor.system?.species,
      actor.system?.details?.species,
    ];
    for (const value of candidates) {
      const text = String(value || '').toLowerCase();
      const match = text.match(/([1-5])(?:st|nd|rd|th)?[-_\s]*degree/);
      if (match) return `${match[1]}${match[1] === '1' ? 'st' : match[1] === '2' ? 'nd' : match[1] === '3' ? 'rd' : 'th'}-degree`;
      const wordMap = { first: '1st-degree', second: '2nd-degree', third: '3rd-degree', fourth: '4th-degree', fifth: '5th-degree' };
      for (const [word, degree] of Object.entries(wordMap)) {
        if (text.includes(word)) return degree;
      }
    }
    return null;
  };

  const droidDegreeTreeKeys = () => {
    const degree = extractDroidDegree();
    const treeName = degree ? getDroidTalentTreeName(degree) : null;
    if (!treeName) return [];
    const compact = treeName.replace(/\s*Talent\s+Tree$/i, '');
    return [treeName, compact, compact.replace(/-/g, ' '), compact.replace(/[\s-]+/g, '')]
      .map(value => String(value || '').trim())
      .filter(Boolean);
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
    // Add all trees from character's existing classes plus the pending chargen/level-up class.
    const selectedClass = slot.classModel || slot.class || slot.selectedClass || null;
    const heroicClassDocs = [
      ...ownedClassDocs,
      ...(selectedClass ? [selectedClass] : []),
    ];
    const seenClassKeys = new Set();
    for (const classDoc of heroicClassDocs) {
      const classKey = String(classDoc?.id || classDoc?._id || classDoc?.name || classDoc?.system?.class_name || '').toLowerCase();
      if (classKey && seenClassKeys.has(classKey)) continue;
      if (classKey) seenClassKeys.add(classKey);
      const keys = normalizeAccessKeys(classDoc);
      if (keys.length) {
        allowedTrees.push(...keys);
        SWSELogger.log(
          `[TreeAuthority] Heroic slot: Added ${keys.length} tree access keys from class ${classDoc.name || classDoc?.system?.class_name || classKey}`
        );
      }
    }

    const droidKeys = droidDegreeTreeKeys();
    if (droidKeys.length) {
      allowedTrees.push(...droidKeys);
      SWSELogger.log(`[TreeAuthority] Heroic slot: Added ${droidKeys.length} Droid degree tree access keys for ${extractDroidDegree()}`);
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
