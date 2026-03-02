/**
 * force-authority-engine.js
 * Force Authority & Capacity Management (Phase 3.3 + 3.5)
 *
 * CRITICAL RULES:
 * 1. ZERO mutations - pure derivation + validation only
 * 2. Multi-source additive BASE capacity:
 *    - Force Sensitivity feat: +1 power
 *    - Force Training feats: +(1 + WIS modifier) per feat (STACKS)
 *    - Class level grants: +X per level
 *    - Template grants: +X if template applies
 * 3. Capacity is RECALCULATED every time - NEVER cached
 * 4. (Phase 3.5) Selection context enriched by SelectionModifierHookRegistry
 *    - Talent hooks may add conditional bonus slots (descriptor-restricted)
 *    - Base capacity formula is NEVER modified by hooks
 *
 * Public API:
 * - getForceCapacity(actor) -> {number}                          [base capacity only]
 * - getSelectionContext(actor) -> {SelectionContext}             [Phase 3.5: full context]
 * - validateForceAccess(actor) -> {valid: bool, reason: string}
 * - validateForceSelection(actor, powerIds) -> {valid: bool, reason: string, capacityUsed?: number}
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SelectionModifierHookRegistry } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/selection-modifier-hook-registry.js";

export class ForceAuthorityEngine {
  /**
   * Calculate total force power capacity for an actor
   * Multi-source additive: Force Sensitivity + Force Training + Class + Template
   *
   * @param {Actor} actor - The actor
   * @returns {Promise<number>} Total force power capacity
   */
  static async getForceCapacity(actor) {
    if (!actor) {
      return 0;
    }

    try {
      let capacity = 0;

      // Source 1: Force Sensitivity feat (+1)
      const hasForceSensitivity = actor.items.some(
        i => i.type === 'feat' && i.name.toLowerCase().includes('force sensitivity')
      );
      if (hasForceSensitivity) {
        capacity += 1;
        swseLogger.debug('[FORCE CAPACITY] Force Sensitivity: +1');
      }

      // Source 2: Force Training feats (+1 + WIS per feat, STACKS)
      const forceTrainingFeats = actor.items.filter(
        i => i.type === 'feat' && i.name.toLowerCase().includes('force training')
      );
      if (forceTrainingFeats.length > 0) {
        const wisMod = actor.system?.abilities?.wis?.mod ?? 0;
        const perFeat = 1 + Math.max(0, wisMod);
        const trainingCapacity = forceTrainingFeats.length * perFeat;
        capacity += trainingCapacity;
        swseLogger.debug('[FORCE CAPACITY] Force Training', {
          count: forceTrainingFeats.length,
          wisMod,
          perFeat,
          total: trainingCapacity
        });
      }

      // Source 3 & 4: Class level grants and Template grants
      // TODO: Implement if class data structure available
      // For now, defer to class-based feature dispatcher

      swseLogger.log('[FORCE CAPACITY] Final capacity', {
        actor: actor.name,
        capacity,
        sources: {
          forceSensitivity: hasForceSensitivity ? 1 : 0,
          forceTraining: forceTrainingFeats.length > 0 ? forceTrainingFeats.length * (1 + Math.max(0, actor.system?.abilities?.wis?.mod ?? 0)) : 0
        }
      });

      return capacity;
    } catch (e) {
      swseLogger.error('[FORCE CAPACITY] Error calculating capacity', e);
      return 0;
    }
  }

  /**
   * Derive the full SelectionContext for an actor (Phase 3.5)
   *
   * Returns base capacity plus any conditional bonus slots granted by talents
   * (via SelectionModifierHookRegistry). All values are freshly derived — never cached.
   *
   * SelectionContext shape:
   * {
   *   baseCapacity: number,
   *   conditionalBonusSlots: Array<{
   *     id: string,
   *     sourceHookId: string,
   *     sourceFeatInstanceIndex: number,
   *     descriptorRestrictions: string[],
   *     powerNameHint: string[]
   *   }>,
   *   totalCapacity: number
   * }
   *
   * @param {Actor} actor - The actor
   * @returns {Promise<Object>} SelectionContext
   */
  static async getSelectionContext(actor) {
    const baseCapacity = await this.getForceCapacity(actor);

    const context = {
      baseCapacity,
      conditionalBonusSlots: [],
      totalCapacity: baseCapacity // Updated by registry after hooks run
    };

    if (actor) {
      SelectionModifierHookRegistry.applyAll(actor, context);
    }

    swseLogger.debug('[FORCE SELECTION CONTEXT]', {
      actor: actor?.name,
      baseCapacity: context.baseCapacity,
      bonusSlots: context.conditionalBonusSlots.length,
      totalCapacity: context.totalCapacity
    });

    return context;
  }

  /**
   * Check whether a force power item satisfies a conditional bonus slot's restrictions (Phase 3.5)
   *
   * Matching priority:
   * 1. powerNameHint: power name contains one of the hint strings (case-insensitive)
   * 2. descriptorRestrictions: power's system.descriptors contains the restriction
   *
   * @param {Item} power - The force power item
   * @param {Object} slot - ConditionalBonusSlot
   * @returns {boolean}
   */
  static _powerMatchesSlotRestriction(power, slot) {
    if (!power) return false;
    if (!slot.descriptorRestrictions || slot.descriptorRestrictions.length === 0) return true;

    const powerName = power.name?.toLowerCase() ?? '';

    // 1. Check power name hints (talent-defined specific power names)
    if (slot.powerNameHint?.length > 0) {
      if (slot.powerNameHint.some(hint => powerName.includes(hint.toLowerCase()))) {
        return true;
      }
    }

    // 2. Check system descriptors
    const rawDescriptors = power.system?.descriptors ?? power.system?.descriptor ?? [];
    const descriptorArray = Array.isArray(rawDescriptors)
      ? rawDescriptors.map(d => String(d).toLowerCase())
      : [String(rawDescriptors).toLowerCase()];

    return slot.descriptorRestrictions.some(r => descriptorArray.includes(r.toLowerCase()));
  }

  /**
   * Validate that an actor has access to the force system
   * Requirements:
   * 1. Must have "Force Sensitivity" feat
   * 2. Must have "force" domain unlocked
   *
   * @param {Actor} actor - The actor
   * @returns {Promise<{valid: bool, reason: string}>}
   */
  static async validateForceAccess(actor) {
    if (!actor) {
      return {
        valid: false,
        reason: 'No actor provided'
      };
    }

    try {
      // Check 1: Has Force Sensitivity feat
      const hasForceSensitivity = actor.items.some(
        i => i.type === 'feat' && i.name.toLowerCase().includes('force sensitivity')
      );
      if (!hasForceSensitivity) {
        return {
          valid: false,
          reason: 'Force Sensitivity feat required'
        };
      }

      // Check 2: Domain unlocked
      const unlockedDomains = actor.system?.progression?.unlockedDomains || [];
      if (!unlockedDomains.includes('force')) {
        return {
          valid: false,
          reason: 'Force domain not unlocked'
        };
      }

      return { valid: true };
    } catch (e) {
      swseLogger.error('[FORCE ACCESS] Validation error', e);
      return {
        valid: false,
        reason: 'Access validation failed'
      };
    }
  }

  /**
   * Validate a force power selection for an actor (Phase 3.3 + 3.5)
   *
   * Checks:
   * 1. All IDs are valid (power exists on actor)
   * 2. No duplicate IDs
   * 3. Total count <= totalCapacity (base + conditional bonus slots)
   * 4. (Phase 3.5) Any power consuming a conditional bonus slot must satisfy
   *    that slot's descriptor restrictions
   *
   * DOES NOT mutate actor. Pure derivation + validation only.
   *
   * @param {Actor} actor - The actor
   * @param {Array<string>} powerIds - Array of force power item IDs
   * @returns {Promise<{valid: bool, reason: string, capacityUsed?: number}>}
   */
  static async validateForceSelection(actor, powerIds = []) {
    if (!actor) {
      return { valid: false, reason: 'No actor provided' };
    }

    if (!Array.isArray(powerIds)) {
      return { valid: false, reason: 'powerIds must be an array' };
    }

    try {
      // Check 1: Verify all IDs are valid (item exists on actor)
      for (const id of powerIds) {
        const exists = actor.items.some(
          i => i.type === 'forcePower' && (i.id === id || i._id === id)
        );
        if (!exists) {
          return { valid: false, reason: `Invalid power ID: ${id}` };
        }
      }

      // Check 2: No duplicates
      const uniqueIds = new Set(powerIds);
      if (uniqueIds.size !== powerIds.length) {
        return { valid: false, reason: 'Duplicate power selection' };
      }

      // Check 3: Context-aware capacity check (base + conditional bonus slots)
      const context = await this.getSelectionContext(actor);
      if (powerIds.length > context.totalCapacity) {
        return {
          valid: false,
          reason: `Over capacity: ${powerIds.length} > ${context.totalCapacity}`
        };
      }

      // Check 4 (Phase 3.5): Descriptor restrictions for conditional bonus slot usage
      // Powers beyond baseCapacity must each satisfy a conditional slot's restrictions
      if (powerIds.length > context.baseCapacity && context.conditionalBonusSlots.length > 0) {
        const excessCount = powerIds.length - context.baseCapacity;

        // Resolve each power item from actor.items
        const powers = powerIds.map(id =>
          actor.items.find(i => (i.id === id || i._id === id) && i.type === 'forcePower')
        );

        // Count how many selected powers are eligible for a conditional bonus slot
        const eligibleForBonus = powers.filter(power =>
          context.conditionalBonusSlots.some(slot =>
            this._powerMatchesSlotRestriction(power, slot)
          )
        );

        if (eligibleForBonus.length < excessCount) {
          return {
            valid: false,
            reason: `Descriptor restriction: ${excessCount} bonus slot(s) require descriptor-restricted powers (e.g., telekinetic)`
          };
        }
      }

      return {
        valid: true,
        capacityUsed: powerIds.length
      };
    } catch (e) {
      swseLogger.error('[FORCE SELECTION] Validation error', e);
      return { valid: false, reason: 'Selection validation failed' };
    }
  }
}
