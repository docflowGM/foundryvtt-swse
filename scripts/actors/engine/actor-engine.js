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
  }
};
