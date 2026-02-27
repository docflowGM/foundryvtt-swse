/**
 * force-authority-engine.js
 * Force Authority & Capacity Management (Phase 3.3)
 *
 * CRITICAL RULES:
 * 1. ZERO mutations - pure derivation + validation only
 * 2. Multi-source additive capacity:
 *    - Force Sensitivity feat: +1 power
 *    - Force Training feats: +(1 + WIS modifier) per feat (STACKS)
 *    - Class level grants: +X per level
 *    - Template grants: +X if template applies
 * 3. Capacity is RECALCULATED every time - NEVER cached
 *
 * Public API:
 * - getForceCapacity(actor) -> {number}
 * - validateForceAccess(actor) -> {valid: bool, reason: string}
 * - validateForceSelection(actor, powerIds) -> {valid: bool, reason: string, capacityUsed?: number}
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

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
   * Validate a force power selection for an actor
   * Checks:
   * 1. All IDs are valid (power exists on actor)
   * 2. No duplicate IDs
   * 3. Total count <= capacity
   *
   * @param {Actor} actor - The actor
   * @param {Array<string>} powerIds - Array of force power item IDs
   * @returns {Promise<{valid: bool, reason: string, capacityUsed?: number}>}
   */
  static async validateForceSelection(actor, powerIds = []) {
    if (!actor) {
      return {
        valid: false,
        reason: 'No actor provided'
      };
    }

    if (!Array.isArray(powerIds)) {
      return {
        valid: false,
        reason: 'powerIds must be an array'
      };
    }

    try {
      // Check 1: Verify all IDs are valid (item exists on actor)
      for (const id of powerIds) {
        const exists = actor.items.some(
          i => i.type === 'forcePower' && (i.id === id || i._id === id)
        );
        if (!exists) {
          return {
            valid: false,
            reason: `Invalid power ID: ${id}`
          };
        }
      }

      // Check 2: No duplicates
      const uniqueIds = new Set(powerIds);
      if (uniqueIds.size !== powerIds.length) {
        return {
          valid: false,
          reason: 'Duplicate power selection'
        };
      }

      // Check 3: Capacity check
      const capacity = await this.getForceCapacity(actor);
      if (powerIds.length > capacity) {
        return {
          valid: false,
          reason: `Over capacity: ${powerIds.length} > ${capacity}`
        };
      }

      // Check 4: Prerequisites (deferred - PrerequisiteEngine integration optional)
      // If PrerequisiteEngine exists, check each power
      // For now, we skip this to avoid coupling

      return {
        valid: true,
        capacityUsed: powerIds.length
      };
    } catch (e) {
      swseLogger.error('[FORCE SELECTION] Validation error', e);
      return {
        valid: false,
        reason: 'Selection validation failed'
      };
    }
  }
}
