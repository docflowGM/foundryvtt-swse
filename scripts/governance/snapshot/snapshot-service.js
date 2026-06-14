/**
 * SnapshotService
 *
 * Owns: Snapshot restore orchestration
 * Delegates to: ActorEngine (all mutations)
 * Never owns: Snapshot creation/storage (SnapshotManager), raw actor mutations
 *
 * Contract:
 * - All mutations go through ActorEngine
 * - No direct actor.update() or embedded document API calls
 * - Preserves operation order: root → delete items → create items → delete effects → create effects
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export class SnapshotService {
  /**
   * restoreFromSnapshot() — Atomic snapshot restoration
   *
   * Restores complete actor state from snapshot:
   * 1. Update root actor data (system, name, img, prototypeToken)
   * 2. Delete all current items, then create snapshot items
   * 3. Delete all current effects, then create snapshot effects
   * 4. All in single mutation transaction
   *
   * @param {Actor} actor - target actor
   * @param {Object} snapshot - snapshot object with { system, name, img, prototypeToken, items, effects }
   * @param {Object} [options={}] - mutation options
   * @returns {{ success, actor, itemsDeleted, itemsCreated, effectsDeleted, effectsCreated, timestamp }}
   */
  static async restoreFromSnapshot(actor, snapshot, options = {}) {
    try {
      if (!actor) {throw new Error('restoreFromSnapshot() requires actor');}
      if (!snapshot) {throw new Error('restoreFromSnapshot() requires snapshot');}

      SWSELogger.log(`[SNAPSHOT] Restoring ${actor.name} from snapshot`, {
        systemFieldCount: Object.keys(snapshot.system || {}).length,
        itemCount: (snapshot.items || []).length,
        effectCount: (snapshot.effects || []).length
      });

      // ====================================================================
      // PHASE 1: ROOT UPDATE (system, name, img, prototypeToken)
      // ====================================================================
      const system = foundry.utils.deepClone(snapshot.system ?? {});
      const name = snapshot.name ?? actor.name;
      const img = snapshot.img ?? actor.img;
      const prototypeToken = foundry.utils.deepClone(snapshot.prototypeToken ?? {});

      await ActorEngine.updateActor(actor, {
        name,
        img,
        system,
        prototypeToken
      }, {
        ...options,
        source: options.source ?? 'snapshot-restore',
        isRecomputeHPCall: true
      });

      // ====================================================================
      // PHASE 2: ITEM RESTORATION (delete all, recreate from snapshot)
      // ====================================================================
      const currentItemIds = actor.items?.map?.(i => i.id) ?? [];
      if (currentItemIds.length > 0) {
        await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', currentItemIds, options);
      }

      const itemsToCreate = (snapshot.items ?? []).map(i => {
        const copy = foundry.utils.deepClone(i);
        delete copy._id;
        return copy;
      });
      if (itemsToCreate.length > 0) {
        await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToCreate, options);
      }

      // ====================================================================
      // PHASE 3: EFFECT RESTORATION (delete all, recreate from snapshot)
      // ====================================================================
      const currentEffectIds = actor.effects?.map?.(e => e.id) ?? [];
      if (currentEffectIds.length > 0) {
        await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', currentEffectIds, options);
      }

      const effectsToCreate = (snapshot.effects ?? []).map(e => {
        const copy = foundry.utils.deepClone(e);
        delete copy._id;
        return copy;
      });
      if (effectsToCreate.length > 0) {
        await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', effectsToCreate, options);
      }

      SWSELogger.log(`[SNAPSHOT] Restoration complete for ${actor.name}`, {
        itemsDeleted: currentItemIds.length,
        itemsCreated: itemsToCreate.length,
        effectsDeleted: currentEffectIds.length,
        effectsCreated: effectsToCreate.length
      });

      return {
        success: true,
        actor,
        itemsDeleted: currentItemIds.length,
        itemsCreated: itemsToCreate.length,
        effectsDeleted: currentEffectIds.length,
        effectsCreated: effectsToCreate.length,
        timestamp: new Date().toISOString()
      };

    } catch (err) {
      SWSELogger.error(`SnapshotService.restoreFromSnapshot failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        snapshotItemCount: (snapshot?.items || []).length
      });
      throw err;
    }
  }
}
