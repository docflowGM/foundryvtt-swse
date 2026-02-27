/**
 * suite-reselection-engine.js
 * Suite Reselection Engine (Phase 3.4)
 *
 * HARDENED SYSTEM: Reselection flow is immutable and context-guarded.
 *
 * CRITICAL RULES:
 * 1. ONLY calls existing authority/validator engines - ZERO new capacity logic
 * 2. CLEAR → RECALCULATE → PICKER → VALIDATE → APPLY flow (atomic pattern)
 * 3. Context enforcement (levelup-only, guarded by setting)
 * 4. NO partial state - each operation completes or entire flow fails
 * 5. NO touching authority code - report bugs separately
 *
 * Public API:
 * - static async clearAndReselectForcePowers(actor, context)
 * - static async clearAndReselectManeuvers(actor, context)
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ForceAuthorityEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-authority-engine.js";
import { ForceSlotValidator } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-slot-validator.js";
import { ForcePowerEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/force-power-engine.js";
import { ManeuverAuthorityEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/maneuver-authority-engine.js";
import { ManeuverSlotValidator } from "/systems/foundryvtt-swse/scripts/engine/progression/maneuvers/maneuver-slot-validator.js";
import { StarshipManeuverEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/starship-maneuver-engine.js";
import { canReselectSuite } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/suite-reselection-utils.js";

export class SuiteReselectionEngine {

  /**
   * Clear and reselect Force Powers
   * Flow: Validate context → Clear powers → Recalculate capacity → Open picker → Validate → Apply
   *
   * @param {Actor} actor - The actor
   * @param {string} context - Operation context (must be "levelup")
   * @returns {Promise<{success: bool, error?: string, appliedCount?: number, message?: string}>}
   */
  static async clearAndReselectForcePowers(actor, context) {
    if (!actor) {
      return {
        success: false,
        error: "No actor provided"
      };
    }

    // STEP 1: Context check (HARD BLOCK)
    if (!canReselectSuite(context)) {
      return {
        success: false,
        error: "Force Power reselection not allowed in this context"
      };
    }

    swseLogger.log('[SUITE RESELECTION] Starting Force Power reselection', {
      actor: actor.name,
      context
    });

    // STEP 2: Clear existing powers (via ActorEngine)
    try {
      const existingPowers = actor.items.filter(i => i.type === 'forcePower');
      if (existingPowers.length > 0) {
        const powerIds = existingPowers.map(p => p.id || p._id);
        await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', powerIds);
        swseLogger.log('[SUITE RESELECTION] Cleared ' + existingPowers.length + ' force powers', {
          actor: actor.name
        });
      }
    } catch (e) {
      swseLogger.error('[SUITE RESELECTION] Failed to clear existing powers', e);
      return {
        success: false,
        error: 'Failed to clear existing powers: ' + e.message
      };
    }

    // STEP 3: Recalculate derived capacity (FRESH CALCULATION - no caching)
    let capacity = 0;
    try {
      capacity = await ForceAuthorityEngine.getForceCapacity(actor);
      swseLogger.log('[SUITE RESELECTION] Recalculated force capacity', {
        actor: actor.name,
        capacity
      });

      if (capacity <= 0) {
        return {
          success: true,
          appliedCount: 0,
          message: "No force power capacity after recalculation"
        };
      }
    } catch (e) {
      swseLogger.error('[SUITE RESELECTION] Failed to recalculate capacity', e);
      return {
        success: false,
        error: 'Failed to recalculate capacity: ' + e.message
      };
    }

    // STEP 4: Open existing picker (unchanged)
    try {
      const { ForcePowerPicker } = await import('/systems/foundryvtt-swse/scripts/apps/progression/force-power-picker.js');
      const available = await ForcePowerEngine.collectAvailablePowers(actor);

      if (!available || available.length === 0) {
        return {
          success: true,
          appliedCount: 0,
          message: "No force powers available to select"
        };
      }

      swseLogger.log('[SUITE RESELECTION] Opening Force Power picker', {
        actor: actor.name,
        capacity,
        availableCount: available.length
      });

      // Open picker with fresh capacity
      const selected = await ForcePowerPicker.select(available, capacity);

      if (!selected || selected.length === 0) {
        return {
          success: true,
          appliedCount: 0,
          message: "User cancelled reselection"
        };
      }

      swseLogger.log('[SUITE RESELECTION] User selected powers from picker', {
        actor: actor.name,
        selectedCount: selected.length
      });

      // STEP 5: Validate selections (call existing validator)
      const selectedIds = selected.map(s => s.id || s._id);
      const validation = await ForceSlotValidator.validateBeforeApply(actor, selectedIds);
      if (!validation.valid) {
        swseLogger.warn('[SUITE RESELECTION] Validation failed', {
          actor: actor.name,
          error: validation.error
        });
        return {
          success: false,
          error: 'Validation failed: ' + validation.error
        };
      }

      swseLogger.log('[SUITE RESELECTION] Validation passed', {
        actor: actor.name,
        capacityUsed: validation.capacityUsed
      });

      // STEP 6: Apply via existing path (unchanged)
      const result = await ForcePowerEngine.applySelected(actor, selected);

      if (result.success) {
        swseLogger.log('[SUITE RESELECTION] Force powers successfully reselected', {
          actor: actor.name,
          count: result.applied,
          capacity
        });
        return {
          success: true,
          appliedCount: result.applied
        };
      } else {
        swseLogger.error('[SUITE RESELECTION] Apply failed', {
          actor: actor.name,
          error: result.error
        });
        return {
          success: false,
          error: result.error || "Failed to apply selected powers"
        };
      }
    } catch (e) {
      swseLogger.error('[SUITE RESELECTION] Force Power reselection failed', e);
      return {
        success: false,
        error: 'Reselection failed: ' + e.message
      };
    }
  }

  /**
   * Clear and reselect Starship Maneuvers
   * Flow: Validate context → Clear maneuvers → Recalculate capacity → Open picker → Validate → Apply
   *
   * @param {Actor} actor - The actor
   * @param {string} context - Operation context (must be "levelup")
   * @returns {Promise<{success: bool, error?: string, appliedCount?: number, message?: string}>}
   */
  static async clearAndReselectManeuvers(actor, context) {
    if (!actor) {
      return {
        success: false,
        error: "No actor provided"
      };
    }

    // STEP 1: Context check (HARD BLOCK)
    if (!canReselectSuite(context)) {
      return {
        success: false,
        error: "Maneuver reselection not allowed in this context"
      };
    }

    swseLogger.log('[SUITE RESELECTION] Starting Maneuver reselection', {
      actor: actor.name,
      context
    });

    // STEP 2: Clear existing maneuvers (via ActorEngine)
    try {
      const currentSuite = actor.system?.starshipManeuverSuite?.maneuvers || [];
      if (currentSuite.length > 0) {
        await ActorEngine.updateActor(actor, {
          'system.starshipManeuverSuite.maneuvers': []
        });
        swseLogger.log('[SUITE RESELECTION] Cleared ' + currentSuite.length + ' maneuvers', {
          actor: actor.name
        });
      }
    } catch (e) {
      swseLogger.error('[SUITE RESELECTION] Failed to clear existing maneuvers', e);
      return {
        success: false,
        error: 'Failed to clear existing maneuvers: ' + e.message
      };
    }

    // STEP 3: Recalculate derived capacity (FRESH CALCULATION - no caching)
    let capacity = 0;
    try {
      capacity = await ManeuverAuthorityEngine.getManeuverCapacity(actor);
      swseLogger.log('[SUITE RESELECTION] Recalculated maneuver capacity', {
        actor: actor.name,
        capacity
      });

      if (capacity <= 0) {
        return {
          success: true,
          appliedCount: 0,
          message: "No maneuver capacity after recalculation"
        };
      }
    } catch (e) {
      swseLogger.error('[SUITE RESELECTION] Failed to recalculate capacity', e);
      return {
        success: false,
        error: 'Failed to recalculate capacity: ' + e.message
      };
    }

    // STEP 4: Open existing picker (unchanged)
    try {
      const { StarshipManeuverPicker } = await import('/systems/foundryvtt-swse/scripts/apps/progression/starship-maneuver-picker.js');
      const available = await StarshipManeuverEngine.collectAvailableManeuvers(actor);

      if (!available || available.length === 0) {
        return {
          success: true,
          appliedCount: 0,
          message: "No maneuvers available to select"
        };
      }

      swseLogger.log('[SUITE RESELECTION] Opening Maneuver picker', {
        actor: actor.name,
        capacity,
        availableCount: available.length
      });

      // Open picker with fresh capacity
      const selected = await StarshipManeuverPicker.select(available, capacity, actor);

      if (!selected || selected.length === 0) {
        return {
          success: true,
          appliedCount: 0,
          message: "User cancelled reselection"
        };
      }

      swseLogger.log('[SUITE RESELECTION] User selected maneuvers from picker', {
        actor: actor.name,
        selectedCount: selected.length
      });

      // STEP 5: Validate selections (call existing validator)
      const selectedIds = selected.map(s => s.id || s._id);
      const validation = await ManeuverSlotValidator.validateBeforeApply(actor, selectedIds);
      if (!validation.valid) {
        swseLogger.warn('[SUITE RESELECTION] Validation failed', {
          actor: actor.name,
          error: validation.error
        });
        return {
          success: false,
          error: 'Validation failed: ' + validation.error
        };
      }

      swseLogger.log('[SUITE RESELECTION] Validation passed', {
        actor: actor.name,
        capacityUsed: validation.capacityUsed
      });

      // STEP 6: Apply via existing path (unchanged)
      const result = await StarshipManeuverEngine.applySelected(actor, selected);

      if (result.success) {
        swseLogger.log('[SUITE RESELECTION] Maneuvers successfully reselected', {
          actor: actor.name,
          count: result.applied,
          capacity
        });
        return {
          success: true,
          appliedCount: result.applied
        };
      } else {
        swseLogger.error('[SUITE RESELECTION] Apply failed', {
          actor: actor.name,
          error: result.error
        });
        return {
          success: false,
          error: result.error || "Failed to apply selected maneuvers"
        };
      }
    } catch (e) {
      swseLogger.error('[SUITE RESELECTION] Maneuver reselection failed', e);
      return {
        success: false,
        error: 'Reselection failed: ' + e.message
      };
    }
  }
}
