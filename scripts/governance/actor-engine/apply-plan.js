/**
 * ActorEngine.apply (the progression/adoption plan applier) and its adoption preflight (3N-AE.5, extracted verbatim from ActorEngine).
 *
 * ActorEngine.apply stays the public entry point (a thin delegate); this module orchestrates through the engine's existing gateway methods
 * (deleteEmbeddedDocuments / createEmbeddedDocuments / updateActor) and never persists on its own. No rules changes.
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";

export function preflightAdoptionPayloads(engine, mutationPlan) {
    const itemsToCreate = [];
    const effectsToCreate = [];

    if (mutationPlan.createEmbedded?.length > 0) {
      for (const embedded of mutationPlan.createEmbedded) {
        if (!embedded.type || !embedded.data) {
          throw new Error('Invalid createEmbedded in adoption: missing type or data');
        }

        if (embedded.type === 'Item') {
          itemsToCreate.push(embedded.data);
        } else if (embedded.type === 'ActiveEffect') {
          effectsToCreate.push(embedded.data);
        } else {
          throw new Error(`Invalid embedded type in adoption: ${embedded.type}`);
        }
      }
    }

    return { itemsToCreate, effectsToCreate };
  }

export async function applyImpl(engine, actor, mutationPlan, options = {}) {
    try {
      if (!actor) {throw new Error('apply() called with no actor');}
      if (!mutationPlan) {return;} // noop

      const isAdoption = mutationPlan.replaceSystem !== undefined;

      SWSELogger.debug(`ActorEngine.apply → ${actor.name}`, {
        isAdoption,
        mutationPlan: isAdoption ? { adoption: true } : mutationPlan
      });

      // ========================================
      // PHASE 0: ADOPTION (Identity Mutation)
      // ========================================

      if (isAdoption) {
        SWSELogger.info(`[Adoption] ${actor.name} (ID: ${actor.id}) adopting from ${mutationPlan._adoptionSource}`);

        // ---- ADOPTION PREFLIGHT: Validate all replacement payloads BEFORE destructive operations ----
        // This ensures the actor is not left in a broken state if creation fails after deletion.
        const { itemsToCreate, effectsToCreate } = engine._preflightAdoptionPayloads(mutationPlan);

        // ---- ADOPTION PHASE 1: Delete all existing embedded documents ----
        if (actor.items?.length > 0) {
          const itemIds = actor.items.map(i => i.id);
          await engine.deleteEmbeddedDocuments(actor, 'Item', itemIds);
        }

        if (actor.effects?.length > 0) {
          const effectIds = actor.effects.map(e => e.id);
          await engine.deleteEmbeddedDocuments(actor, 'ActiveEffect', effectIds);
        }

        // ---- ADOPTION PHASE 2: Create replacement embedded documents ----
        if (itemsToCreate.length > 0) {
          await engine.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
        }

        if (effectsToCreate.length > 0) {
          await engine.createEmbeddedDocuments(actor, 'ActiveEffect', effectsToCreate);
        }

        // ---- ADOPTION PHASE 3: Replace system ----
        if (mutationPlan.replaceSystem && Object.keys(mutationPlan.replaceSystem).length > 0) {
          // Source tag required: this is an intentionally broad system replacement (adoption).
          // The diagnostic classifier recognizes 'ActorEngine.apply:adoption' → canonical-normalization.
          await engine.updateActor(actor, { system: mutationPlan.replaceSystem }, {
            source: 'ActorEngine.apply:adoption'
          });
        }
      }

      // ========================================
      // PHASE 1-4: Standard Mutations
      // ========================================

      // ---- PHASE 1: Create Embedded Documents (non-adoption) ----
      if (!isAdoption && mutationPlan.createEmbedded?.length > 0) {
        const itemsToCreate = mutationPlan.createEmbedded.map(item => {
          if (!item.type || !item.data) {
            throw new Error('Invalid createEmbedded item: missing type or data');
          }
          return item.data;
        });
        await engine.createEmbeddedDocuments(actor, 'Item', itemsToCreate);
      }

      // ---- PHASE 2: Update Embedded Documents ----
      if (mutationPlan.updateEmbedded?.length > 0) {
        for (const update of mutationPlan.updateEmbedded) {
          if (!update._id || !update.update) {
            throw new Error('Invalid updateEmbedded: missing _id or update');
          }
        }
        await engine.updateEmbeddedDocuments(actor, 'Item', mutationPlan.updateEmbedded);
      }

      // ---- PHASE 3: Delete Embedded Documents (non-adoption) ----
      if (!isAdoption && mutationPlan.deleteEmbedded?.length > 0) {
        const idsToDelete = mutationPlan.deleteEmbedded.map(item => {
          if (!item._id) {
            throw new Error('Invalid deleteEmbedded: missing _id');
          }
          return item._id;
        });
        await engine.deleteEmbeddedDocuments(actor, 'Item', idsToDelete);
      }

      // ---- PHASE 4: Update Actor System (non-adoption) ----
      if (!isAdoption && mutationPlan.update && Object.keys(mutationPlan.update).length > 0) {
        // Guard against derived writes
        for (const path of Object.keys(mutationPlan.update)) {
          if (path.startsWith('system.derived')) {
            throw new Error(
              `ARCHITECTURE VIOLATION: mutationPlan attempted to write to ${path}. ` +
              'Derived fields are computed, not mutated.'
            );
          }
        }
        await engine.updateActor(actor, mutationPlan.update, options);
      }

      if (isAdoption) {
        SWSELogger.log(`[Adoption] Complete: ${actor.name} (ID: ${actor.id})`);
      } else {
        SWSELogger.log(`ActorEngine.apply completed for ${actor.name}`);
      }

    } catch (err) {
      SWSELogger.error(`ActorEngine.apply failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        isAdoption: mutationPlan?.replaceSystem !== undefined,
        mutationPlan: mutationPlan?.replaceSystem ? { adoption: true } : mutationPlan
      });
      throw err;
    }
  }
