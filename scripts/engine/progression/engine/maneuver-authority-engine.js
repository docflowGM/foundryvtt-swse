/**
 * maneuver-authority-engine.js
 * Starship Maneuver Authority & Capacity Management
 *
 * PHASE 3.1: Core authority engine for maneuver access and capacity validation.
 *
 * Core Rules:
 * 1. Requires "Starship Tactics" feat
 * 2. Requires "starship-maneuvers" domain unlock
 * 3. Capacity = 1 + max(0, WIS modifier)
 * 4. Pure derivation - ZERO mutations
 *
 * Public API:
 * - getManeuverCapacity(actor) -> {number}
 * - validateManeuverAccess(actor) -> {valid: bool, reason: string}
 * - validateManeuverSelection(actor, maneuverIds) -> {valid: bool, reason: string, capacityUsed?: number}
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ManeuverAuthorityEngine {
  /**
   * Calculate maneuver capacity for an actor
   * Capacity = 1 + max(0, WIS modifier)
   * Only applies if actor has Starship Tactics feat
   *
   * @param {Actor} actor - The actor
   * @returns {Promise<number>} Maneuver capacity
   */
  static async getManeuverCapacity(actor) {
    if (!actor) {
      swseLogger.warn('[MANEUVER CAPACITY] Called with no actor');
      return 0;
    }

    try {
      // Check for Starship Tactics feat
      const hasFeat = actor.items.some(
        i => i.type === 'feat' &&
             (i.name === 'Starship Tactics' || i.name.toLowerCase().includes('starship tactics'))
      );

      if (!hasFeat) {
        return 0;
      }

      // Get WIS ability score and modifier
      const wisAbility = actor.system?.abilities?.wis;
      const wisMod = wisAbility?.mod ?? 0;

      // Capacity = 1 + max(0, WIS modifier)
      const capacity = 1 + Math.max(0, wisMod);

      swseLogger.log('[MANEUVER CAPACITY]', {
        actor: actor.name,
        wisMod,
        capacity
      });

      return capacity;
    } catch (e) {
      swseLogger.error('[MANEUVER CAPACITY] Error calculating capacity', e);
      return 0;
    }
  }

  /**
   * Validate that an actor has access to the maneuver system
   * Requirements:
   * 1. Must have "Starship Tactics" feat
   * 2. Must have "starship-maneuvers" domain unlocked
   *
   * @param {Actor} actor - The actor
   * @returns {Promise<{valid: bool, reason: string}>}
   */
  static async validateManeuverAccess(actor) {
    if (!actor) {
      return {
        valid: false,
        reason: 'No actor provided'
      };
    }

    try {
      // Check 1: Has Starship Tactics feat
      const hasFeat = actor.items.some(
        i => i.type === 'feat' &&
             (i.name === 'Starship Tactics' || i.name.toLowerCase().includes('starship tactics'))
      );

      if (!hasFeat) {
        return {
          valid: false,
          reason: 'Starship Tactics feat required'
        };
      }

      // Check 2: Domain unlocked
      const unlockedDomains = actor.system?.progression?.unlockedDomains || [];
      if (!unlockedDomains.includes('starship-maneuvers')) {
        return {
          valid: false,
          reason: 'Starship maneuvers domain not unlocked'
        };
      }

      return { valid: true };
    } catch (e) {
      swseLogger.error('[MANEUVER ACCESS] Validation error', e);
      return {
        valid: false,
        reason: 'Access validation failed'
      };
    }
  }

  /**
   * Validate a maneuver selection for an actor
   * Checks:
   * 1. All IDs are valid (item exists on actor)
   * 2. No duplicate IDs
   * 3. Total count <= capacity
   * 4. Optional: Check prerequisites (via PrerequisiteEngine if available)
   *
   * @param {Actor} actor - The actor
   * @param {Array<string>} maneuverIds - Array of maneuver item IDs
   * @returns {Promise<{valid: bool, reason: string, capacityUsed?: number}>}
   */
  static async validateManeuverSelection(actor, maneuverIds = []) {
    if (!actor) {
      return {
        valid: false,
        reason: 'No actor provided'
      };
    }

    if (!Array.isArray(maneuverIds)) {
      return {
        valid: false,
        reason: 'maneuverIds must be an array'
      };
    }

    try {
      // Check 1: Verify all IDs are valid (item exists on actor)
      for (const id of maneuverIds) {
        const item = actor.items.find(i => i.id === id || i._id === id);
        if (!item) {
          return {
            valid: false,
            reason: `Invalid maneuver ID: ${id}`
          };
        }
      }

      // Check 2: No duplicates
      const uniqueIds = new Set(maneuverIds);
      if (uniqueIds.size !== maneuverIds.length) {
        return {
          valid: false,
          reason: 'Duplicate maneuver selection'
        };
      }

      // Check 3: Capacity check
      const capacity = await this.getManeuverCapacity(actor);
      if (maneuverIds.length > capacity) {
        return {
          valid: false,
          reason: `Over capacity: ${maneuverIds.length} > ${capacity}`
        };
      }

      // Check 4: Prerequisites (deferred - PrerequisiteEngine integration optional)
      // If PrerequisiteEngine exists, check each maneuver
      // For now, we skip this to avoid coupling

      return {
        valid: true,
        capacityUsed: maneuverIds.length
      };
    } catch (e) {
      swseLogger.error('[MANEUVER SELECTION] Validation error', e);
      return {
        valid: false,
        reason: 'Selection validation failed'
      };
    }
  }
}
