/**
 * Character Generation Finalizer
 *
 * Single boundary where character snapshot is converted to actual Actor with Items.
 * This is the ONLY place where:
 * - Documents are created
 * - ActiveEffects are applied
 * - Validation is expected
 *
 * All other chargen logic operates on immutable snapshots and patches.
 */

import { SWSELogger } from '../../utils/logger.js';
import { EffectSanitizer } from '../../core/effect-sanitizer.js';
import { createActor, createItemInActor } from '../../core/document-api-v13.js';

export class ChargenFinalizer {

  /**
   * Finalize character from snapshot
   * Converts pending character data into an actual Actor with all items and effects
   *
   * @param {Object} snapshot - Character data snapshot from chargen
   * @param {Actor} actor - Actor to update (or null to create new)
   * @returns {Promise<Actor>} - The finalized actor
   * @throws {Error} if validation fails
   */
  static async finalize(snapshot, actor = null) {
    try {
      SWSELogger.log('[CHARGEN FINALIZER] Starting character finalization');

      if (!snapshot) {
        throw new Error('Character snapshot is required for finalization');
      }

      // Step 1: Create or update actor with basic data
      const actorData = this._buildActorData(snapshot);
      let finalActor = actor;

      if (!actor) {
        SWSELogger.log('[CHARGEN FINALIZER] Creating new character actor');
        finalActor = await createActor(actorData, { temporary: false });
      } else {
        SWSELogger.log('[CHARGEN FINALIZER] Updating existing actor');
        await finalActor.update(actorData);
      }

      if (!finalActor) {
        throw new Error('Failed to create or update actor');
      }

      // Step 2: Create items with sanitized effects
      const itemsToCreate = this._buildItemsData(snapshot);
      if (itemsToCreate.length > 0) {
        SWSELogger.log(`[CHARGEN FINALIZER] Creating ${itemsToCreate.length} items`);

        // Sanitize effects on all items before creation
        const sanitizedItems = itemsToCreate.map(item => {
          const sanitized = foundry.utils.deepClone(item);
          if (sanitized.effects) {
            sanitized.effects = EffectSanitizer.sanitizeEffects(sanitized.effects);
          }
          return sanitized;
        });

        await finalActor.createEmbeddedDocuments('Item', sanitizedItems);
      }

      // Step 3: Validate final actor
      try {
        await finalActor.validate();
        SWSELogger.log('[CHARGEN FINALIZER] Actor validation passed');
      } catch (validationError) {
        SWSELogger.error('[CHARGEN FINALIZER] Validation failed:', validationError);
        throw new Error(`Character validation failed: ${validationError.message}`);
      }

      SWSELogger.log('[CHARGEN FINALIZER] Character finalization complete');
      return finalActor;

    } catch (error) {
      SWSELogger.error('[CHARGEN FINALIZER] Finalization failed:', error);
      throw error;
    }
  }

  /**
   * Build actor data from snapshot
   * @private
   */
  static _buildActorData(snapshot) {
    const actorData = {
      type: snapshot.type || 'character',
      name: snapshot.characterName || 'New Character',
      system: {}
    };

    // Copy system data from snapshot
    if (snapshot.systemData) {
      Object.assign(actorData.system, snapshot.systemData);
    }

    return actorData;
  }

  /**
   * Build items array from snapshot
   * @private
   */
  static _buildItemsData(snapshot) {
    const items = [];

    // Add feats
    if (snapshot.selectedFeats && Array.isArray(snapshot.selectedFeats)) {
      for (const feat of snapshot.selectedFeats) {
        if (feat) {
          items.push(feat);
        }
      }
    }

    // Add talents
    if (snapshot.selectedTalents && Array.isArray(snapshot.selectedTalents)) {
      for (const talent of snapshot.selectedTalents) {
        if (talent) {
          items.push(talent);
        }
      }
    }

    // Add Force powers
    if (snapshot.selectedForcePowers && Array.isArray(snapshot.selectedForcePowers)) {
      for (const power of snapshot.selectedForcePowers) {
        if (power) {
          items.push(power);
        }
      }
    }

    // Add equipment/items
    if (snapshot.equipment && Array.isArray(snapshot.equipment)) {
      for (const item of snapshot.equipment) {
        if (item) {
          items.push(item);
        }
      }
    }

    return items;
  }
}
