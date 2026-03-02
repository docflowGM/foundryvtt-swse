/**
 * maneuver-slot-validator.js
 * Pre-mutation validation orchestrator for starship maneuver selection
 *
 * PHASE 3.1: Validates maneuver slots before any mutations occur.
 *
 * Responsibilities:
 * 1. Orchestrate access validation (via ManeuverAuthorityEngine)
 * 2. Orchestrate selection validation (via ManeuverAuthorityEngine)
 * 3. Return combined validation result
 * 4. DO NOT compute capacity - delegate to engine
 *
 * NOTE: This is a thin validation orchestrator.
 * All capacity logic lives in ManeuverAuthorityEngine.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ManeuverAuthorityEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/maneuver-authority-engine.js";

export class ManeuverSlotValidator {
  /**
   * Validate maneuver selection before applying to actor
   *
   * Steps:
   * 1. Check access (domain unlock + feat)
   * 2. Check selection (capacity + IDs + duplicates)
   * 3. Return success with capacity used
   *
   * @param {Actor} actor - The actor
   * @param {Array<string>} maneuverIds - Array of maneuver item IDs to apply
   * @returns {Promise<{valid: bool, error?: string, capacityUsed?: number}>}
   */
  static async validateBeforeApply(actor, maneuverIds = []) {
    if (!actor) {
      return {
        valid: false,
        error: 'No actor provided'
      };
    }

    try {
      // Step 1: Check access (domain unlock + feat)
      const accessCheck = await ManeuverAuthorityEngine.validateManeuverAccess(actor);
      if (!accessCheck.valid) {
        swseLogger.warn('[MANEUVER VALIDATOR] Access check failed:', accessCheck.reason);
        return {
          valid: false,
          error: accessCheck.reason
        };
      }

      // Step 2: Check selection (capacity + IDs + duplicates)
      const selectionCheck = await ManeuverAuthorityEngine.validateManeuverSelection(
        actor,
        maneuverIds
      );
      if (!selectionCheck.valid) {
        swseLogger.warn('[MANEUVER VALIDATOR] Selection check failed:', selectionCheck.reason);
        return {
          valid: false,
          error: selectionCheck.reason
        };
      }

      // Step 3: Return success with capacity used
      swseLogger.log('[MANEUVER VALIDATOR] Validation passed', {
        actor: actor.name,
        maneuverCount: maneuverIds.length,
        capacityUsed: selectionCheck.capacityUsed
      });

      return {
        valid: true,
        capacityUsed: selectionCheck.capacityUsed
      };
    } catch (e) {
      swseLogger.error('[MANEUVER VALIDATOR] Validation error', e);
      return {
        valid: false,
        error: 'Validation failed: ' + e.message
      };
    }
  }
}
