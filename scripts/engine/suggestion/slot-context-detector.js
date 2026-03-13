/**
 * Slot Context Detector - Phase 2A
 *
 * Deterministically detects which slot type is active for an actor.
 * Priority order: Feat → Talent → Force Technique → Attribute Increase
 *
 * Used by: CandidatePoolBuilder, SuggestionEngine
 */

import { getAllowedTalentTrees } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js";
import { AttributeIncreaseHandler } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/attribute-increase-handler.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Detect the active slot context for an actor
 * Returns first unconsumed slot from priority queue
 *
 * @param {Object} actor - Actor document
 * @param {Object} pendingData - Pending selections from level-up flow (optional)
 * @returns {Object|null} slotContext object {slotKind, slotType, classId, domains, pointsAvailable, activeSlotIndex} or null
 */
export function getActiveSlotContext(actor, pendingData = {}) {
  if (!actor) {
    return null;
  }

  const progression = actor.system?.progression || {};

  // PRIORITY 1: Feat slots (first unconsumed)
  const featSlots = progression.featSlots || [];
  for (let i = 0; i < featSlots.length; i++) {
    const slot = featSlots[i];
    if (!slot.consumed) {
      const context = {
        slotKind: "feat",
        slotType: slot.slotType, // "class" | "heroic"
        classId: slot.classId,   // null for heroic
        domains: null,           // not used for feats
        pointsAvailable: null,
        activeSlotIndex: i
      };
      SWSELogger.log(`[SlotContextDetector] Active slot: feat/${slot.slotType} at index ${i}`);
      return context;
    }
  }

  // PRIORITY 2: Talent slots (first unconsumed)
  const talentSlots = progression.talentSlots || [];
  for (let i = 0; i < talentSlots.length; i++) {
    const slot = talentSlots[i];
    if (!slot.consumed) {
      // Get allowed trees for this slot
      const domains = getAllowedTalentTrees(actor, slot);

      const context = {
        slotKind: "talent",
        slotType: slot.slotType, // "class" | "heroic"
        classId: slot.classId,   // null for heroic
        domains,                 // allowed tree IDs
        pointsAvailable: null,
        activeSlotIndex: i
      };
      SWSELogger.log(`[SlotContextDetector] Active slot: talent/${slot.slotType} (trees: ${domains.length}) at index ${i}`);
      return context;
    }
  }

  // PRIORITY 3: Force Technique slots (if available in pending data)
  // Note: forceTechniqueChoices not persisted on actor, only tracked during advancement
  if (pendingData.forceTechniqueChoices && Array.isArray(pendingData.forceTechniqueChoices)) {
    for (let i = 0; i < pendingData.forceTechniqueChoices.length; i++) {
      const slot = pendingData.forceTechniqueChoices[i];
      if (!slot.consumed) {
        const context = {
          slotKind: "forceTechnique",
          slotType: null,              // N/A for techniques
          classId: null,
          domains: null,
          pointsAvailable: null,
          activeSlotIndex: i
        };
        SWSELogger.log(`[SlotContextDetector] Active slot: forceTechnique at index ${i}`);
        return context;
      }
    }
  }

  // PRIORITY 4: Attribute Increase slot (if level qualifies)
  const currentLevel = actor.system?.level || 0;
  if (AttributeIncreaseHandler.qualifiesForIncrease(currentLevel)) {
    const pending = actor.getFlag('foundryvtt-swse', 'pendingAttributeGains');
    if (!pending) {
      // Attribute increase is available and not yet consumed
      const heroicLevel = AttributeIncreaseHandler._getHeroicLevel(actor);
      const availablePoints = heroicLevel > 0 ? 2 : 1; // heroic=2, nonheroic=1

      const context = {
        slotKind: "attributeIncrease",
        slotType: null,              // N/A for attributes
        classId: null,
        domains: null,
        pointsAvailable: availablePoints,
        activeSlotIndex: 0
      };
      SWSELogger.log(`[SlotContextDetector] Active slot: attributeIncrease (${availablePoints} pts)`);
      return context;
    }
  }

  // No active slot
  SWSELogger.log(`[SlotContextDetector] No active slot detected for ${actor.name}`);
  return null;
}

/**
 * Check if a slot context is for a feat
 */
export function isFeatSlot(slotContext) {
  return slotContext?.slotKind === "feat";
}

/**
 * Check if a slot context is for a talent
 */
export function isTalentSlot(slotContext) {
  return slotContext?.slotKind === "talent";
}

/**
 * Check if a slot context is for a force technique
 */
export function isForceTechniqueSlot(slotContext) {
  return slotContext?.slotKind === "forceTechnique";
}

/**
 * Check if a slot context is for an attribute increase
 */
export function isAttributeIncreaseSlot(slotContext) {
  return slotContext?.slotKind === "attributeIncrease";
}

export default {
  getActiveSlotContext,
  isFeatSlot,
  isTalentSlot,
  isForceTechniqueSlot,
  isAttributeIncreaseSlot
};
