/**
 * HP Recomputation Hook Registry
 * Registers hooks to trigger ActorEngine.recomputeHP() when relevant actor/item changes occur
 *
 * Triggers:
 * - actor.system.level change
 * - actor.system.attributes.con.* changes
 * - actor.system.hp.bonus changes
 * - Class item create/update/delete
 *
 * Guard:
 * - Skips if options.meta.guardKey === "hp-recompute" (prevents recursion)
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { traceLog, actorSummary } from "/systems/foundryvtt-swse/scripts/utils/mutation-trace.js";

export class HPRecomputeHooks {
  static _initialized = false;

  /**
   * Initialize HP recomputation hooks
   * Called once during system ready
   * @static
   */
  static initialize() {
    if (this._initialized) return;
    this._initialized = true;

    this._registerActorUpdateHook();
    this._registerItemHooks();

    SWSELogger.log("[HPRecomputeHooks] HP recalculation triggers registered");
  }

  /**
   * On actor update, watch for HP trigger keys (using flattened keys for nested detection)
   * @private
   */
  static _registerActorUpdateHook() {
    Hooks.on("updateActor", async (actor, data, options, userId) => {
      // Skip tokens
      if (!actor || actor.isToken) return;

      // Skip if this update came from recomputeHP itself (recursion guard)
      if (options?.meta?.guardKey === "hp-recompute") {
        return;
      }

      // PHASE 3: Skip if actor is currently in an in-flight mutation transaction
      // This prevents re-entrant writes during the original update
      if (ActorEngine.isActorMutationInFlight(actor.id)) {
        traceLog('HOOK:updateActor[HPRecomputeHooks]', 'deferred due to in-flight mutation guard', {
          actor: actorSummary(actor),
          reason: 'actor mutation already in flight'
        });
        SWSELogger.debug(`[HPRecomputeHooks] Deferring HP recompute for ${actor.name} — mutation in flight`);
        return;
      }

      // Flatten the update to detect nested changes like system.attributes.con.base
      const flat = foundry.utils.flattenObject(data);

      const triggerKeys = [
        "system.level",
        "system.attributes.con.base",
        "system.attributes.con.racial",
        "system.attributes.con.enhancement",
        "system.attributes.con.temp",
        "system.hp.bonus"
      ];

      const changed = triggerKeys.some(key => key in flat);

      if (changed) {
        const changedKeys = Object.keys(flat).filter(k => triggerKeys.some(tk => k === tk || k.startsWith(tk)));
        SWSELogger.debug(`[HPRecomputeHooks] Trigger detected for ${actor.name}`, { changedKeys });

        // [MUTATION TRACE] HOOK:updateActor — HPRecomputeHooks about to trigger recomputeHP → updateActor
        traceLog('HOOK:updateActor[HPRecomputeHooks]', 'triggering recomputeHP (writes back to actor via ActorEngine.updateActor)', {
          actor:        actorSummary(actor),
          changedKeys,
          guardKeyUsed: 'hp-recompute'
        });

        try {
          await ActorEngine.recomputeHP(actor, { fromHook: true });
        } catch (err) {
          SWSELogger.error(`[HPRecomputeHooks] Failed to recompute HP for ${actor.name}`, { error: err });
        }
      }
    });
  }

  /**
   * On class item CREATE, UPDATE, or DELETE, recompute HP
   * @private
   */
  static _registerItemHooks() {
    // createItem hook
    Hooks.on("createItem", async (item, options, userId) => {
      if (item.type !== "class") return;
      if (!item.actor) return;

      SWSELogger.debug(`[HPRecomputeHooks] Class item created for ${item.actor.name}`);

      try {
        await ActorEngine.recomputeHP(item.actor, { fromHook: true });
      } catch (err) {
        SWSELogger.error(`[HPRecomputeHooks] Failed to recompute HP after class item create`, { error: err });
      }
    });

    // updateItem hook
    Hooks.on("updateItem", async (item, data, options, userId) => {
      if (item.type !== "class") return;
      if (!item.actor) return;

      SWSELogger.debug(`[HPRecomputeHooks] Class item updated for ${item.actor.name}`);

      try {
        await ActorEngine.recomputeHP(item.actor, { fromHook: true });
      } catch (err) {
        SWSELogger.error(`[HPRecomputeHooks] Failed to recompute HP after class item update`, { error: err });
      }
    });

    // deleteItem hook
    Hooks.on("deleteItem", async (item, options, userId) => {
      if (item.type !== "class") return;
      if (!item.actor) return;

      SWSELogger.debug(`[HPRecomputeHooks] Class item deleted for ${item.actor.name}`);

      try {
        await ActorEngine.recomputeHP(item.actor, { fromHook: true });
      } catch (err) {
        SWSELogger.error(`[HPRecomputeHooks] Failed to recompute HP after class item delete`, { error: err });
      }
    });
  }
}
