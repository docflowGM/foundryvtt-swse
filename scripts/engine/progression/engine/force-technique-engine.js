/**
 * force-technique-engine.js
 * Unified Force Technique engine for SWSE progression.
 *
 * PURE ENGINE LAYER - NO UI IMPORTS
 *
 * Responsibilities:
 * - Collect available techniques from compendium (data layer)
 * - Apply selected techniques to actor via ActorEngine (mutation)
 * - Return structured results (no UI orchestration)
 *
 * Note: UI orchestration (opening pickers, user interaction) belongs in apps/ layer.
 * Apps should call collectAvailableTechniques(), show UI, then call applySelected().
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export class ForceTechniqueEngine {
  /**
   * Collect available techniques from compendium
   * @param {Actor} actor - The actor (unused but for API consistency)
   * @returns {Promise<Array>} Array of technique documents
   */
  static async collectAvailableTechniques(actor) {
    try {
      const pack = game.packs.get('foundryvtt-swse.forcetechniques');

      if (!pack) {
        swseLogger.warn('Force Technique Engine: foundryvtt-swse.forcetechniques compendium not found!');
        return [];
      }

      if (!pack.indexed) {
        await pack.getIndex();
      }

      const docs = pack.getDocuments
        ? await pack.getDocuments()
        : pack.index.map(e => e);

      return docs ?? [];
    } catch (e) {
      swseLogger.error('ForceTechniqueEngine: Failed to collect techniques from compendium', e);
      return [];
    }
  }

  /**
   * Apply selected techniques to the actor
   * @param {Actor} actor - The actor
   * @param {Array} selectedItems - Selected technique documents/objects
   * @returns {Promise<Object>} Result object with applied items
   */
  static async applySelected(actor, selectedItems = []) {
    const existing = new Set(
      actor.items
        .filter(i => i.type === 'feat')
        .filter(i => i.system?.tags?.includes('force_technique'))
        .map(i => i.name.toLowerCase())
    );

    const filtered = selectedItems.filter(
      t => t?.name && !existing.has(t.name.toLowerCase())
    );

    try {
      const toCreate = [];

      for (const it of filtered) {
        if (typeof it.toObject === 'function') {
          toCreate.push(it.toObject());
        } else if (it.document) {
          toCreate.push(it.document.toObject());
        } else {
          toCreate.push({
            name: it.name || 'Force Technique',
            type: 'feat',
            img: it.img || 'icons/svg/mystery-man.svg',
            system: it.system || {}
          });
        }
      }

      if (toCreate.length) {
        await ActorEngine.createEmbeddedDocuments(actor, 'Item', toCreate);
        return { success: true, applied: toCreate.length };
      }
      return { success: true, applied: 0 };
    } catch (e) {
      swseLogger.error('ForceTechniqueEngine.applySelected error', e);
      return { success: false, error: e.message };
    }
  }
}
