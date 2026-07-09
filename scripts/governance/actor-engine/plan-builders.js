/**
 * ActorEngine Plan Builders
 *
 * Pure, non-mutating builders for embedded-document / clone operation plans.
 * Extracted from ActorEngine (Phase 6) behind the facade: ActorEngine still owns
 * the public methods (as thin delegates) and remains the ONLY module that
 * executes these plans. Nothing here calls actor.update() or any mutation API —
 * these functions only read the actor (toObject) and build plain plan objects.
 *
 * Contract:
 * - No side effects, no actor mutation, no document writes.
 * - Behavior is identical to the original ActorEngine method bodies.
 * - Plans are executed elsewhere, exclusively via ActorEngine.executeEmbeddedPlan().
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Build a plan to create embedded documents (Item, ActiveEffect, etc.)
 *
 * @param {Actor} actor - Target actor
 * @param {string} embeddedName - Document type ('Item', 'ActiveEffect', etc.)
 * @param {Array} documents - Array of document data to create
 * @returns {Object} Plan object with { success, embeddedName, actor, documents, mutations }
 */
export function buildEmbeddedCreatePlan(actor, embeddedName, documents) {
  try {
    if (!actor) {
      return {
        success: false,
        reason: 'buildEmbeddedCreatePlan called with no actor'
      };
    }

    if (!embeddedName) {
      return {
        success: false,
        reason: 'buildEmbeddedCreatePlan called without embeddedName'
      };
    }

    if (!Array.isArray(documents)) {
      return {
        success: false,
        reason: 'buildEmbeddedCreatePlan requires documents array'
      };
    }

    if (documents.length === 0) {
      return {
        success: true,
        embeddedName,
        actor,
        documents: [],
        mutations: []
      };
    }

    // Build mutation for this operation
    const mutation = {
      type: 'createEmbedded',
      embeddedName,
      documents: documents.map(d => foundry.utils.deepClone(d))
    };

    return {
      success: true,
      embeddedName,
      actor,
      documents,
      mutations: [mutation],
      description: `Create ${documents.length} ${embeddedName}(s)`
    };
  } catch (err) {
    SWSELogger.error('buildEmbeddedCreatePlan failed:', err);
    return {
      success: false,
      reason: err.message
    };
  }
}

/**
 * Build a plan to delete embedded documents
 *
 * @param {Actor} actor - Target actor
 * @param {string} embeddedName - Document type ('Item', 'ActiveEffect', etc.)
 * @param {Array} ids - Array of document IDs to delete
 * @returns {Object} Plan object with { success, embeddedName, actor, ids, mutations }
 */
export function buildEmbeddedDeletePlan(actor, embeddedName, ids) {
  try {
    if (!actor) {
      return {
        success: false,
        reason: 'buildEmbeddedDeletePlan called with no actor'
      };
    }

    if (!embeddedName) {
      return {
        success: false,
        reason: 'buildEmbeddedDeletePlan called without embeddedName'
      };
    }

    if (!Array.isArray(ids)) {
      return {
        success: false,
        reason: 'buildEmbeddedDeletePlan requires ids array'
      };
    }

    if (ids.length === 0) {
      return {
        success: true,
        embeddedName,
        actor,
        ids: [],
        mutations: []
      };
    }

    // Build mutation for this operation
    const mutation = {
      type: 'deleteEmbedded',
      embeddedName,
      ids: [...ids]
    };

    return {
      success: true,
      embeddedName,
      actor,
      ids,
      mutations: [mutation],
      description: `Delete ${ids.length} ${embeddedName}(s)`
    };
  } catch (err) {
    SWSELogger.error('buildEmbeddedDeletePlan failed:', err);
    return {
      success: false,
      reason: err.message
    };
  }
}

/**
 * Build a plan to replace embedded documents (delete old, create new)
 *
 * @param {Actor} actor - Target actor
 * @param {string} embeddedName - Document type ('Item', 'ActiveEffect', etc.)
 * @param {Array} idsToDelete - IDs to delete
 * @param {Array} docsToCreate - Documents to create
 * @returns {Object} Plan object with both delete and create mutations
 */
export function buildEmbeddedReplacePlan(actor, embeddedName, idsToDelete, docsToCreate) {
  try {
    if (!actor) {
      return {
        success: false,
        reason: 'buildEmbeddedReplacePlan called with no actor'
      };
    }

    if (!embeddedName) {
      return {
        success: false,
        reason: 'buildEmbeddedReplacePlan called without embeddedName'
      };
    }

    const mutations = [];

    // Add delete mutation if IDs exist
    if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
      mutations.push({
        type: 'deleteEmbedded',
        embeddedName,
        ids: [...idsToDelete]
      });
    }

    // Add create mutation if documents exist
    if (Array.isArray(docsToCreate) && docsToCreate.length > 0) {
      mutations.push({
        type: 'createEmbedded',
        embeddedName,
        documents: docsToCreate.map(d => foundry.utils.deepClone(d))
      });
    }

    if (mutations.length === 0) {
      return {
        success: true,
        embeddedName,
        actor,
        idsToDelete: [],
        docsToCreate: [],
        mutations: []
      };
    }

    return {
      success: true,
      embeddedName,
      actor,
      idsToDelete,
      docsToCreate,
      mutations,
      description: `Replace ${idsToDelete?.length || 0} with ${docsToCreate?.length || 0} ${embeddedName}(s)`
    };
  } catch (err) {
    SWSELogger.error('buildEmbeddedReplacePlan failed:', err);
    return {
      success: false,
      reason: err.message
    };
  }
}

/**
 * Build a plan to clone an actor and apply modifications
 *
 * Prevents the dangerous pattern of: const clone = actor.clone(); await clone.update(...)
 * Instead builds a plan for atomic creation+modification.
 *
 * @param {Actor} actor - Actor to clone
 * @param {Object} modifications - Changes to apply to the clone
 * @param {Object} options - Clone options
 * @returns {Object} Plan object
 */
export function buildCloneActorPlan(actor, modifications = {}, options = {}) {
  try {
    if (!actor) {
      return {
        success: false,
        reason: 'buildCloneActorPlan called with no actor'
      };
    }

    // Clone actor data
    const cloneData = actor.toObject();
    delete cloneData._id;

    // Apply modifications to clone
    const modifiedCloneData = foundry.utils.mergeObject(cloneData, modifications);

    const mutation = {
      type: 'cloneActor',
      originalActorId: actor.id,
      cloneData: modifiedCloneData,
      modifications
    };

    return {
      success: true,
      actor,
      modifications,
      cloneData: modifiedCloneData,
      mutations: [mutation],
      description: `Clone ${actor.name} with modifications`
    };
  } catch (err) {
    SWSELogger.error('buildCloneActorPlan failed:', err);
    return {
      success: false,
      reason: err.message
    };
  }
}
