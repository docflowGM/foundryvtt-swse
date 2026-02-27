/**
 * force-slot-validator.js
 * Force Power Slot Validation (Phase 3.3)
 *
 * CRITICAL RULE: Does NOT compute capacity itself — it CALLS ForceAuthorityEngine
 *
 * Responsibilities:
 * 1. Orchestrate pre-mutation validation
 * 2. Check access via ForceAuthorityEngine
 * 3. Check selection via ForceAuthorityEngine
 * 4. Return structured validation result
 *
 * This is NOT an authority engine - it's a validation coordinator
 * that delegates to ForceAuthorityEngine.
 */

import { ForceAuthorityEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-authority-engine.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ForceSlotValidator {
  /**
   * Validate force power selection before application
   *
   * Steps:
   * 1. Check access (domain unlock + feat)
   * 2. Check selection (capacity + IDs + duplicates)
   * 3. Return success with capacity used
   *
   * @param {Actor} actor - The actor
   * @param {Array<string>} powerIds - Force power IDs to validate
   * @returns {Promise<{valid: bool, error?: string, capacityUsed?: number}>}
   */
  static async validateBeforeApply(actor, powerIds = []) {
    if (!actor) {
      return {
        valid: false,
        error: 'No actor provided'
      };
    }

    try {
      // Step 1: Check access (domain unlock + feat)
      const accessCheck = await ForceAuthorityEngine.validateForceAccess(actor);
      if (!accessCheck.valid) {
        swseLogger.warn('[FORCE VALIDATOR] Access check failed', {
          actor: actor.name,
          reason: accessCheck.reason
        });
        return {
          valid: false,
          error: accessCheck.reason
        };
      }

      // Step 2: Check selection (capacity + IDs + duplicates)
      const selectionCheck = await ForceAuthorityEngine.validateForceSelection(
        actor,
        powerIds
      );
      if (!selectionCheck.valid) {
        swseLogger.warn('[FORCE VALIDATOR] Selection check failed', {
          actor: actor.name,
          reason: selectionCheck.reason
        });
        return {
          valid: false,
          error: selectionCheck.reason
        };
      }

      // Step 3: Return success with capacity used
      swseLogger.log('[FORCE VALIDATOR] Validation passed', {
        actor: actor.name,
        capacityUsed: selectionCheck.capacityUsed
      });

      return {
        valid: true,
        capacityUsed: selectionCheck.capacityUsed
      };
    } catch (e) {
      swseLogger.error('[FORCE VALIDATOR] Validation error', e);
      return {
        valid: false,
        error: 'Validation failed: ' + e.message
      };
    }
  }
}
