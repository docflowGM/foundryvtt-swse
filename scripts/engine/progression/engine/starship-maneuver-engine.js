/**
 * starship-maneuver-engine.js
 * Unified Starship Maneuver engine for SWSE progression.
 *
 * PURE ENGINE LAYER - NO UI IMPORTS
 *
 * Responsibilities:
 * - Collect available maneuvers from actor's items (data layer)
 * - Apply selected maneuvers to actor via ActorEngine (mutation)
 * - Return structured results (no UI orchestration)
 *
 * Note: UI orchestration (opening pickers, user interaction) belongs in apps/ layer.
 * Apps should call collectAvailableManeuvers(), show UI, then call applySelected().
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ManeuverSlotValidator } from "/systems/foundryvtt-swse/scripts/engine/progression/maneuvers/maneuver-slot-validator.js";

export class StarshipManeuverEngine {
  /**
   * Collect available maneuvers from actor's items (maneuvers are typically embedded)
   * @param {Actor} actor - The actor selecting maneuvers
   * @returns {Promise<Array>} Array of available maneuver documents
   */
  static async collectAvailableManeuvers(actor) {
    try {
      // Get all maneuver items from actor
      const maneuvers = actor.items.filter(i => i.type === 'maneuver');
      return maneuvers ?? [];
    } catch (e) {
      swseLogger.error('StarshipManeuverEngine: Failed to collect maneuvers', e);
      return [];
    }
  }

  /**
   * Apply selected maneuvers to the actor
   * @param {Actor} actor - The actor
   * @param {Array} selectedItems - Selected maneuver documents/objects
   * @returns {Promise<Object>} Result object with applied maneuvers
   */
  static async applySelected(actor, selectedItems = []) {
    // For maneuvers, we typically just mark them as selected in the suite
    // rather than creating new items
    try {
      const maneuverIds = selectedItems
        .map(m => m.id || m._id)
        .filter(id => id);

      // NEW: Pre-mutation validation
      const validation = await ManeuverSlotValidator.validateBeforeApply(actor, maneuverIds);
      if (!validation.valid) {
        swseLogger.warn('[MANEUVER APPLY] Validation failed: ' + validation.error);
        return { success: false, error: validation.error };
      }

      if (maneuverIds.length > 0) {
        // Update actor's starship maneuver suite
        const currentSuite = actor.system.starshipManeuverSuite || { maneuvers: [] };
        const existing = new Set(currentSuite.maneuvers || []);

        // Add new maneuvers to suite
        maneuverIds.forEach(id => existing.add(id));

        await ActorEngine.updateActor(actor, {
          'system.starshipManeuverSuite.maneuvers': Array.from(existing)
        });
        return { success: true, applied: maneuverIds.length };
      }
      return { success: true, applied: 0 };
    } catch (e) {
      swseLogger.error('StarshipManeuverEngine.applySelected error', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Handle Starship Maneuver selection trigger from finalization/level-up pipeline
   * Opens picker UI and applies selected maneuvers
   *
   * PHASE 3.0: Minimal implementation for emergency stabilization
   * - Opens StarshipManeuverPicker
   * - Applies selected via ActorEngine (no direct mutations)
   * - No advanced authority logic (deferred to Phase 3.1+)
   *
   * @param {Actor} actor - The actor selecting maneuvers
   * @param {Number} count - How many maneuvers to select
   * @returns {Promise<Object>} Result with applied count
   */
  static async handleStarshipManeuverTriggers(actor, count = 1) {
    if (count <= 0) {
      swseLogger.log('StarshipManeuverEngine: No maneuvers to select', { count });
      return { success: true, applied: 0 };
    }

    try {
      // Dynamically import picker to avoid circular dependencies
      const { StarshipManeuverPicker } = await import('/systems/foundryvtt-swse/scripts/apps/progression/starship-maneuver-picker.js');

      // Get available maneuvers (actor's existing maneuver items)
      const available = await this.collectAvailableManeuvers(actor);

      if (available.length === 0) {
        swseLogger.warn('StarshipManeuverEngine: No maneuvers available on actor');
        ui.notifications.warn('No Starship Maneuvers available to select.');
        return { success: true, applied: 0 };
      }

      // Open picker and get selection
      const selected = await StarshipManeuverPicker.select(available, count, actor);

      if (selected && selected.length > 0) {
        // Apply selected maneuvers to suite via ActorEngine
        const result = await this.applySelected(actor, selected);
        swseLogger.log('StarshipManeuverEngine: Maneuvers selected', {
          count: selected.length,
          actorName: actor.name
        });
        return result;
      }

      swseLogger.log('StarshipManeuverEngine: User cancelled maneuver selection');
      return { success: true, applied: 0 };

    } catch (e) {
      swseLogger.error('StarshipManeuverEngine.handleStarshipManeuverTriggers error', e);
      ui.notifications.error('Failed to open Maneuver selection. See console for details.');
      return { success: false, error: e.message };
    }
  }
}
