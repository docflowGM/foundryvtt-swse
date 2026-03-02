/**
 * force-slot-validator.js
 * Force Power Slot Validation (Phase 3.3 + 3.5)
 *
 * CRITICAL RULE: Does NOT compute capacity itself — it CALLS ForceAuthorityEngine
 *
 * Responsibilities:
 * 1. Orchestrate pre-mutation validation
 * 2. Check access via ForceAuthorityEngine
 * 3. Check selection via ForceAuthorityEngine (context-aware in Phase 3.5)
 * 4. Return structured validation result including selectionContext
 *
 * This is NOT an authority engine — it's a validation coordinator
 * that delegates to ForceAuthorityEngine.
 *
 * Phase 3.5 additions:
 * - Returns selectionContext in success result so callers can inspect
 *   bonus slot state (conditional slots, descriptor restrictions, etc.)
 * - Conditional slot enforcement is handled inside ForceAuthorityEngine;
 *   this class remains a pure coordinator.
 */

import { ForceAuthorityEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-authority-engine.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ForceSlotValidator {
  /**
   * Validate force power selection before application
   *
   * Steps:
   * 1. Check access (domain unlock + feat)
   * 2. Check selection (capacity + IDs + duplicates + descriptor restrictions)
   * 3. Return success with capacity used and full selection context
   *
   * @param {Actor} actor - The actor
   * @param {Array<string>} powerIds - Force power IDs to validate
   * @returns {Promise<{valid: bool, error?: string, capacityUsed?: number, selectionContext?: Object}>}
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

      // Step 2: Check selection (capacity + IDs + duplicates + descriptor restrictions)
      // ForceAuthorityEngine.validateForceSelection calls getSelectionContext internally,
      // which applies all registered SelectionModifierHooks (Phase 3.5).
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

      // Step 3: Return success with capacity used and selection context for callers
      // selectionContext lets pickers and engines inspect bonus slot state
      const selectionContext = await ForceAuthorityEngine.getSelectionContext(actor);

      swseLogger.log('[FORCE VALIDATOR] Validation passed', {
        actor: actor.name,
        capacityUsed: selectionCheck.capacityUsed,
        baseCapacity: selectionContext.baseCapacity,
        bonusSlots: selectionContext.conditionalBonusSlots.length,
        totalCapacity: selectionContext.totalCapacity
      });

      return {
        valid: true,
        capacityUsed: selectionCheck.capacityUsed,
        selectionContext
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
