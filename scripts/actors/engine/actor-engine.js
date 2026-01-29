// ==================================================
// ActorEngine (v2 Bedrock)
// Centralized Actor update + recalculation lifecycle
// ==================================================

import { swseLogger } from "../../utils/logger.js";
import { applyActorUpdateAtomic } from "../../utils/actor-utils.js";

/**
 * ActorEngine
 *
 * RESPONSIBILITIES:
 * - Centralize *when* actor recalculation occurs
 * - Provide a single safe mutation entrypoint
 *
 * NON-RESPONSIBILITIES:
 * - ❌ No rules logic
 * - ❌ No derived stat math
 * - ❌ No UI / sheets / DOM
 * - ❌ No actor-type branching
 *
 * All rules live on Actor classes.
 */
export const ActorEngine = {

  /* -------------------------------------------- */
  /* Full Recalculation Pipeline                  */
  /* -------------------------------------------- */

  /**
   * Recalculate all derived data for an actor.
   * Safe to call repeatedly. Never mutates base data.
   */
  recalcAll(actor) {
    try {
      if (!actor) {
        throw new Error("ActorEngine.recalcAll called with no actor");
      }

      if (!actor.system) {
        swseLogger.warn(
          `ActorEngine.recalcAll: Actor "${actor.name}" has no system data`
        );
        return;
      }

      swseLogger.debug(`[ActorEngine] Recalculating derived data`, {
        actor: actor.name,
        type: actor.type
      });

      // Clear derived cache explicitly (authoritative reset)
      actor.system.derived = {};

      // Foundry lifecycle hooks (authoritative math lives here)
      if (typeof actor.prepareBaseData === "function") {
        actor.prepareBaseData();
      }

      if (typeof actor.prepareDerivedData === "function") {
        actor.prepareDerivedData();
      }

      if (typeof actor.prepareSynthetics === "function") {
        actor.prepareSynthetics();
      }

    } catch (err) {
      swseLogger.error("[ActorEngine] recalcAll failed", {
        actor: actor?.name ?? "unknown",
        error: err
      });
    }
  },

  /* -------------------------------------------- */
  /* Safe Actor Update Wrapper                    */
  /* -------------------------------------------- */

  /**
   * updateActor
   *
   * The ONLY supported way to mutate actor data.
   * Ensures atomic updates + consistent recalculation.
   */
  async updateActor(actor, updateData, options = {}) {
    try {
      if (!actor) {
        throw new Error("ActorEngine.updateActor called with no actor");
      }

      if (!updateData || typeof updateData !== "object") {
        throw new Error(
          `Invalid updateData passed to ActorEngine.updateActor for "${actor.name}"`
        );
      }

      swseLogger.debug(`[ActorEngine] updateActor`, {
        actor: actor.name,
        updateData,
        options
      });

      // Perform atomic update (no derived mutation allowed here)
      const result = await applyActorUpdateAtomic(actor, updateData, options);

      // Queue recalculation on next tick (non-blocking, deterministic)
      queueMicrotask(() => {
        try {
          this.recalcAll(actor);
        } catch (err) {
          swseLogger.warn(
            `[ActorEngine] async recalc failed for "${actor.name}"`,
            err
          );
        }
      });

      return result;

    } catch (err) {
      swseLogger.error("[ActorEngine] updateActor failed", {
        actor: actor?.name ?? "unknown",
        updateData,
        error: err
      });
      throw err;
    }
  },

  /* -------------------------------------------- */
  /* Template / Bulk Application                  */
  /* -------------------------------------------- */

  /**
   * applyTemplate
   *
   * Apply a predefined data module (chargen, species, class, etc)
   * then rebuild derived state.
   */
  async applyTemplate(actor, templateData, options = {}) {
    try {
      if (!actor) {
        throw new Error("ActorEngine.applyTemplate called with no actor");
      }

      swseLogger.debug(`[ActorEngine] applyTemplate`, {
        actor: actor.name,
        templateData
      });

      await this.updateActor(actor, templateData, options);

    } catch (err) {
      swseLogger.error(
        `[ActorEngine] applyTemplate failed for "${actor?.name ?? "unknown"}"`,
        err
      );
      throw err;
    }
  }
};