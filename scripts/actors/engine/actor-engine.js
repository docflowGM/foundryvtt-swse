// scripts/actors/engine/actor-engine.js
import { swseLogger } from "../../utils/logger.js";
import { applyActorUpdateAtomic } from "../../utils/actor-utils.js";

/**
 * ActorEngine
 * Centralized actor mutation and recalculation pipeline.
 * Modernized for Foundry VTT v13+, avoids deprecated actor.data access.
 */
export const ActorEngine = {
  /**
   * Perform any derived-stat recalculation.
   * Runs after every validated update. Non-blocking.
   */
  async recalcAll(actor) {
    try {
      if (!actor) throw new Error("recalcAll() called with no actor");

      const systemData = actor.system;
      if (!systemData) {
        swseLogger.warn(`ActorEngine.recalcAll: Actor ${actor.name} has no system data.`);
        return;
      }

      // Future recalculations go here.
      swseLogger.debug(`Recalculating derived data for: ${actor.name}`);

      // If system implements a prepareDerivedData hook, call it safely.
      if (typeof actor.prepareDerivedData === "function") {
        actor.prepareDerivedData();
      }

      // Optionally refresh effects, bonuses, etc.
      if (typeof actor.prepareSynthetics === "function") {
        actor.prepareSynthetics();
      }

    } catch (err) {
      swseLogger.error("ActorEngine.recalcAll failed:", err);
    }
  },

  /**
   * Apply a template or module of predefined data to the actor,
   * then rebuild its derived values.
   */
  async applyTemplate(actor, templateData) {
    try {
      if (!actor) throw new Error("applyTemplate() called with no actor");

      await this.updateActor(actor, templateData);
      await this.recalcAll(actor);

    } catch (err) {
      swseLogger.error(`ActorEngine.applyTemplate failed on ${actor?.name ?? "unknown actor"}`, err);
    }
  },

  /**
   * updateActor()
   * Safe wrapper for all actor updates. Uses atomic update utility.
   * Produces full structured debug logs on failure.
   */
  async updateActor(actor, updateData, options = {}) {
    try {
      if (!actor) throw new Error("updateActor() called with no actor");

      if (!updateData || typeof updateData !== "object") {
        throw new Error(`Invalid updateData passed to updateActor for ${actor.name}`);
      }

      swseLogger.debug(`ActorEngine.updateActor → ${actor.name}`, {
        updateData,
        options
      });

      // Perform safe atomic update
      const result = await applyActorUpdateAtomic(actor, updateData, options);

      // Kick off a recalculation pass (async, not awaited)
      setTimeout(() => {
        try {
          this.recalcAll(actor);
        } catch (e) {
          swseLogger.warn(`ActorEngine.recalcAll threw during async pass for ${actor.name}`, e);
        }
      }, 0);

      return result;

    } catch (err) {
      swseLogger.error(`ActorEngine.updateActor failed for ${actor?.name ?? "unknown actor"}`, {
        error: err,
        updateData
      });
      throw err;
    }
  },

  /**
   * Update embedded documents (e.g. owned Items) while preserving the ActorEngine lifecycle.
   *
   * v2 contract: any actor-affecting state change (including embedded Items) must route through ActorEngine.
   *
   * @param {Actor} actor
   * @param {string} embeddedName - Embedded collection name, e.g. "Item"
   * @param {object[]} updates - update objects (must include _id)
   * @param {object} [options={}] - forwarded to updateEmbeddedDocuments
   */
  async updateEmbeddedDocuments(actor, embeddedName, updates, options = {}) {
    try {
      if (!actor) throw new Error("updateEmbeddedDocuments() called with no actor");
      if (!embeddedName) throw new Error("updateEmbeddedDocuments() called without embeddedName");
      if (!Array.isArray(updates)) throw new Error("updateEmbeddedDocuments() requires updates array");

      swseLogger.debug(`ActorEngine.updateEmbeddedDocuments → ${actor.name}`, {
        embeddedName,
        updates,
        options
      });

      const result = await actor.updateEmbeddedDocuments(embeddedName, updates, options);

      setTimeout(() => {
        try {
          this.recalcAll(actor);
        } catch (e) {
          swseLogger.warn(`ActorEngine.recalcAll threw during async pass for ${actor.name}`, e);
        }
      }, 0);

      return result;
    } catch (err) {
      swseLogger.error(`ActorEngine.updateEmbeddedDocuments failed for ${actor?.name ?? "unknown actor"}`, {
        error: err,
        embeddedName,
        updates
      });
      throw err;
    }
  },

  /**
   * Convenience wrapper for updating owned Items through ActorEngine.
   * @param {Actor} actor
   * @param {object[]} updates
   * @param {object} [options={}] 
   */
  async updateOwnedItems(actor, updates, options = {}) {
    return this.updateEmbeddedDocuments(actor, "Item", updates, options);
  },

  /**
   * Create embedded documents while preserving the ActorEngine lifecycle.
   * Primarily used for ActiveEffect toggles from rules engines.
   */
  async createEmbeddedDocuments(actor, embeddedName, data, options = {}) {
    try {
      if (!actor) throw new Error("createEmbeddedDocuments() called with no actor");
      if (!embeddedName) throw new Error("createEmbeddedDocuments() called without embeddedName");
      if (!Array.isArray(data)) throw new Error("createEmbeddedDocuments() requires data array");

      const result = await actor.createEmbeddedDocuments(embeddedName, data, options);
      setTimeout(() => this.recalcAll(actor), 0);
      return result;
    } catch (err) {
      swseLogger.error(`ActorEngine.createEmbeddedDocuments failed for ${actor?.name ?? "unknown actor"}`, err);
      throw err;
    }
  },

  /**
   * Delete embedded documents while preserving the ActorEngine lifecycle.
   */
  async deleteEmbeddedDocuments(actor, embeddedName, ids, options = {}) {
    try {
      if (!actor) throw new Error("deleteEmbeddedDocuments() called with no actor");
      if (!embeddedName) throw new Error("deleteEmbeddedDocuments() called without embeddedName");
      if (!Array.isArray(ids)) throw new Error("deleteEmbeddedDocuments() requires ids array");

      const result = await actor.deleteEmbeddedDocuments(embeddedName, ids, options);
      setTimeout(() => this.recalcAll(actor), 0);
      return result;
    } catch (err) {
      swseLogger.error(`ActorEngine.deleteEmbeddedDocuments failed for ${actor?.name ?? "unknown actor"}`, err);
      throw err;
    }
  },

};
