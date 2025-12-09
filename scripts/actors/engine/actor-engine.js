// scripts/actors/engine/actor-engine.js
import { swseLogger } from "../../utils/logger.js";
import { applyActorUpdateAtomic } from "../../utils/actor-utils.js";

export const ActorEngine = {
  async recalcAll(actor) {
    try {
      // Example derived stat recalculation
      const sys = actor.system || actor.data?.system || {};
      // Derived stats are automatically recalculated by data models
      // This method is kept for future custom derivations
      swseLogger.info(`Recalculating actor ${actor.name}`);
    } catch (err) {
      swseLogger.error("ActorEngine.recalcAll failed", err);
    }
  },

  async applyTemplate(actor, templateData) {
    try {
      // Merge templateData into actor and recalc
      await this.updateActor(actor, templateData);
      await this.recalcAll(actor);
    } catch (err) {
      swseLogger.error("ActorEngine.applyTemplate failed", err);
    }
  },

  /**
   * updateActor - wrapper to centralize actor.update calls.
   * Uses atomic update helper to ensure safe, validated updates.
   * Usage: await ActorEngine.updateActor(actor, updateData);
   */
  async updateActor(actor, updateData, options = {}) {
    try {
      // Make sure actor exists
      if (!actor) throw new Error("ActorEngine.updateActor called without an actor");

      // Use atomic update helper
      const res = await applyActorUpdateAtomic(actor, updateData, options);

      // Trigger a recalculation pass (async, non-blocking)
      try {
        this.recalcAll?.(actor);
      } catch (e) {
        swseLogger.warn("SWSE ActorEngine.recalcAll failed", e);
      }

      return res;
    } catch (err) {
      swseLogger.error("SWSE ActorEngine.updateActor failed", err);
      throw err;
    }
  }
};
