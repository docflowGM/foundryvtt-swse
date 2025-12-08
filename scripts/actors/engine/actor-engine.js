// scripts/actors/engine/actor-engine.js
import { swseLogger } from "../../utils/logger.js";

export const ActorEngine = {
  async recalcAll(actor) {
    try {
      // Example derived stat recalculation
      const sys = actor.system || actor.data?.system || {};
      // TODO: implement full SWSE specific derivations
      // Placeholder: recalc defenses based on dex/armor
      // Placeholder: globalThis.SWSE.ActorEngine.updateActor(actor, ...) should be called with validated updates
      swseLogger.info(`Recalculating actor ${actor.name}`);
    } catch (err) {
      swseLogger.error("ActorEngine.recalcAll failed", err);
    }
  },

  async applyTemplate(actor, templateData) {
    try {
      // Merge templateData into actor and recalc
      await globalThis.SWSE.ActorEngine.updateActor(actor, templateData);
      await this.recalcAll(actor);
    } catch (err) {
      swseLogger.error("ActorEngine.applyTemplate failed", err);
    }
  }


  /**
   * updateActor - wrapper to centralize actor.update calls.
   * It calls globalThis.SWSE.ActorEngine.updateActor(actor, ...) and then triggers actor recalculation.
   * Usage: await globalThis.SWSE.ActorEngine.updateActor(actor, updateData);
   */
  async updateActor(actor, updateData, options={}) {
    try {
      // Make sure actor exists
      if (!actor) throw new Error("ActorEngine.updateActor called without an actor");
      // Use actor.update as the source-of-truth; keep this centralized so additional validation can be added.
      const res = await globalThis.SWSE.ActorEngine.updateActor(actor, updateData, options);
      // Trigger a recalculation pass
      try {
        this.recalcAll?.(actor);
      } catch(e) {
        console.warn("SWSE ActorEngine.recalcAll failed", e);
      }
      return res;
    } catch (err) {
      console.error("SWSE ActorEngine.updateActor failed", err);
      throw err;
    }
  }

};
