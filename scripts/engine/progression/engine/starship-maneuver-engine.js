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
}
