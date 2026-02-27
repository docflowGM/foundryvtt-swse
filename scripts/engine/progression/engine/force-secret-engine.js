/**
 * force-secret-engine.js
 * Unified Force Secret engine for SWSE progression.
 *
 * PURE ENGINE LAYER - NO UI IMPORTS
 *
 * Responsibilities:
 * - Collect available secrets from compendium (data layer)
 * - Apply selected secrets to actor via ActorEngine (mutation)
 * - Return structured results (no UI orchestration)
 *
 * Note: UI orchestration (opening pickers, user interaction) belongs in apps/ layer.
 * Apps should call collectAvailableSecrets(), show UI, then call applySelected().
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export class ForceSecretEngine {
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
   * Apply selected secrets to the actor
   * @param {Actor} actor - The actor
   * @param {Array} selectedItems - Selected secret documents/objects
   * @returns {Promise<Object>} Result object with applied items
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
        await ActorEngine.createEmbeddedDocuments(actor, 'Item', toCreate);
        return { success: true, applied: toCreate.length };
      }
      return { success: true, applied: 0 };
    } catch (e) {
      swseLogger.error('ForceSecretEngine.applySelected error', e);
      return { success: false, error: e.message };
    }
  }
}
