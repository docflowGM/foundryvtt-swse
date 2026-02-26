/**
 * force-technique-engine.js
 * Unified Force Technique engine for SWSE progression.
 * Handles trigger detection, collection, and selection of force techniques.
 */

import { ForceTechniquePicker } from '../../../apps/progression/force-technique-picker.js';
import { swseLogger } from '../../../utils/logger.js';
import { ActorEngine } from '../../../governance/actor-engine/actor-engine.js';
import { ForceRegistry } from '../../../engine/registries/force-registry.js';

export class ForceTechniqueEngine {
  /**
   * Handle force technique triggers (from feature dispatcher)
   * @param {Actor} actor - The actor gaining techniques
   * @param {number} count - Number of techniques to select
   */
  static async handleForceTechniqueTriggers(actor, count = 1) {
    if (count > 0) {
      await this.openPicker(actor, count);
    }
  }

  /**
   * Collect available techniques from compendium
   * @param {Actor} actor - The actor (unused but for API consistency)
   * @returns {Promise<Array>} Array of technique documents
   */
  static async collectAvailableTechniques(actor) {
    try {
      const techniques = ForceRegistry.getByType('technique');
      if (!techniques || techniques.length === 0) {
        swseLogger.warn('Force Technique Engine: No force techniques available in registry');
        return [];
      }

      // Fetch full documents
      const result = [];
      for (const entry of techniques) {
        const doc = await ForceRegistry._getDocument(entry.id);
        if (doc) {
          result.push(doc);
        }
      }

      return result;
    } catch (e) {
      swseLogger.error('ForceTechniqueEngine: Failed to collect techniques from compendium', e);
      return [];
    }
  }

  /**
   * Open the force technique picker UI
   * @param {Actor} actor - The actor selecting techniques
   * @param {number} count - Number of techniques to select
   */
  static async openPicker(actor, count) {
    const available = await this.collectAvailableTechniques(actor);
    const selected = await ForceTechniquePicker.select(available, count, actor);

    if (selected && selected.length) {
      await this.applySelected(actor, selected);
    }
  }

  /**
   * Apply selected techniques to the actor
   * @param {Actor} actor - The actor
   * @param {Array} selectedItems - Selected technique documents/objects
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
        // PHASE 3: Route through ActorEngine
        await ActorEngine.createEmbeddedDocuments(actor, 'Item', toCreate);
      }
    } catch (e) {
      swseLogger.error('ForceTechniqueEngine.applySelected error', e);
    }
  }
}
