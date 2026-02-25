/**
 * starship-maneuver-engine.js
 * Unified Starship Maneuver engine for SWSE progression.
 * Handles trigger detection, collection, and selection of starship maneuvers.
 */

import { StarshipManeuverPicker } from '../../../apps/progression/starship-maneuver-picker.js';
import { swseLogger } from '../../../utils/logger.js';
import { ActorEngine } from '../../../governance/actor-engine/actor-engine.js';

export class StarshipManeuverEngine {
  /**
   * Handle starship maneuver triggers (from feature dispatcher)
   * @param {Actor} actor - The actor gaining maneuvers
   * @param {number} count - Number of maneuvers to select
   */
  static async handleStarshipManeuverTriggers(actor, count = 1) {
    if (count > 0) {
      await this.openPicker(actor, count);
    }
  }

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
   * Open the starship maneuver picker UI
   * @param {Actor} actor - The actor selecting maneuvers
   * @param {number} count - Number of maneuvers to select
   */
  static async openPicker(actor, count) {
    const available = await this.collectAvailableManeuvers(actor);
    const selected = await StarshipManeuverPicker.select(available, count, actor);

    if (selected && selected.length) {
      await this.applySelected(actor, selected);
    }
  }

  /**
   * Apply selected maneuvers to the actor
   * @param {Actor} actor - The actor
   * @param {Array} selectedItems - Selected maneuver documents/objects
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

        // PHASE 3: Route through ActorEngine
        await ActorEngine.updateActor(actor, {
          'system.starshipManeuverSuite.maneuvers': Array.from(existing)
        });
      }
    } catch (e) {
      swseLogger.error('StarshipManeuverEngine.applySelected error', e);
    }
  }
}
