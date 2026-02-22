/**
 * force-secret-engine.js
 * Unified Force Secret engine for SWSE progression.
 * Handles trigger detection, collection, and selection of force secrets.
 */

import { ForceSecretPicker } from '../ui/force-secret-picker.js';
import { swseLogger } from '../../utils/logger.js';
import { ActorEngine } from '../../governance/actor-engine/actor-engine.js';

export class ForceSecretEngine {
  /**
   * Handle force secret triggers (from feature dispatcher)
   * @param {Actor} actor - The actor gaining secrets
   * @param {number} count - Number of secrets to select
   */
  static async handleForceSecretTriggers(actor, count = 1) {
    if (count > 0) {
      await this.openPicker(actor, count);
    }
  }

  /**
   * Collect available secrets from compendium
   * @param {Actor} actor - The actor (unused but for API consistency)
   * @returns {Promise<Array>} Array of secret documents
   */
  static async collectAvailableSecrets(actor) {
    try {
      const pack = game.packs.get('foundryvtt-swse.forcesecrets');

      if (!pack) {
        swseLogger.warn('Force Secret Engine: foundryvtt-swse.forcesecrets compendium not found!');
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
      swseLogger.error('ForceSecretEngine: Failed to collect secrets from compendium', e);
      return [];
    }
  }

  /**
   * Open the force secret picker UI
   * @param {Actor} actor - The actor selecting secrets
   * @param {number} count - Number of secrets to select
   */
  static async openPicker(actor, count) {
    const available = await this.collectAvailableSecrets(actor);
    const selected = await ForceSecretPicker.select(available, count, actor);

    if (selected && selected.length) {
      await this.applySelected(actor, selected);
    }
  }

  /**
   * Apply selected secrets to the actor
   * @param {Actor} actor - The actor
   * @param {Array} selectedItems - Selected secret documents/objects
   */
  static async applySelected(actor, selectedItems = []) {
    const existing = new Set(
      actor.items
        .filter(i => i.type === 'feat')
        .filter(i => i.system?.tags?.includes('force_secret'))
        .map(i => i.name.toLowerCase())
    );

    const filtered = selectedItems.filter(
      s => s?.name && !existing.has(s.name.toLowerCase())
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
            name: it.name || 'Force Secret',
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
      swseLogger.error('ForceSecretEngine.applySelected error', e);
    }
  }
}
