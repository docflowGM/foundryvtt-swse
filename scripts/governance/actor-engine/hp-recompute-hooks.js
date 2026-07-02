/**
 * HP Recomputation Hook Registry
 * Registers hooks to trigger ActorEngine.recomputeHP() when relevant actor/item changes occur
 *
 * Triggers:
 * - actor.system.level change
 * - actor.system.attributes.con.* changes
 * - actor.system.hp.bonus changes
 * - Class item create/update/delete
 * - HP-affecting feat create/update/delete, such as Toughness
 *
 * Guard:
 * - Skips if options.meta.guardKey === "hp-recompute" (prevents recursion)
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { traceLog, actorSummary } from "/systems/foundryvtt-swse/scripts/utils/mutation-trace.js";

function normalizeFeatName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function itemAffectsHpMax(item) {
  if (!item) return false;
  if (item.type === 'class') return true;
  if (item.type !== 'feat') return false;
  if (normalizeFeatName(item.name) === 'toughness') return true;
  const rules = item.system?.abilityMeta?.resourceRules?.hitPoints;
  return Array.isArray(rules) && rules.length > 0;
}

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
   * On class or HP-affecting feat CREATE, UPDATE, or DELETE, recompute HP.
   * @private
   */
  static _registerItemHooks() {
    const maybeRecomputeFromItem = async (item, reason) => {
      if (!itemAffectsHpMax(item)) return;
      if (!item.actor) return;

      SWSELogger.debug(`[HPRecomputeHooks] HP-affecting item ${reason} for ${item.actor.name}`, {
        item: item.name,
        itemType: item.type
      });

      try {
        await ActorEngine.recomputeHP(item.actor, { fromHook: true });
      } catch (err) {
        SWSELogger.error(`[HPRecomputeHooks] Failed to recompute HP after item ${reason}`, { error: err });
      }
    };

    Hooks.on("createItem", async (item, options, userId) => {
      await maybeRecomputeFromItem(item, 'create');
    });

    Hooks.on("updateItem", async (item, data, options, userId) => {
      await maybeRecomputeFromItem(item, 'update');
    });

    Hooks.on("deleteItem", async (item, options, userId) => {
      await maybeRecomputeFromItem(item, 'delete');
    });
  }
}
