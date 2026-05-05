/**
 * ActorAbilityBridge
 *
 * Controlled access layer for querying actor abilities through registries.
 * Enforces SSOT: Registry is source of truth, actor.items is only for ownership verification.
 *
 * All callers should use this bridge instead of direct actor.items filtering.
 */

import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { ClassesDB } from "/systems/foundryvtt-swse/scripts/data/classes-db.js";
import { ForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/force-registry.js";
import { ActorItemIndex } from "/systems/foundryvtt-swse/scripts/adapters/ActorItemIndex.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ActorAbilityBridge {
  /**
   * Get all feats owned by actor, resolved through FeatRegistry
   * @param {Actor} actor - The actor
   * @returns {Array} Array of feat definitions from registry
   */
  static getFeats(actor) {
    if (!actor) {
      return [];
    }

    try {
      const index = ActorItemIndex.build(actor);

      // Return only feats that exist in registry AND are owned by actor
      if (!FeatRegistry.getAll) {
        SWSELogger.warn("[ActorAbilityBridge] FeatRegistry.getAll not available");
        return [];
      }

      return FeatRegistry.getAll().filter(feat => {
        // Check if actor owns this feat (by ID or name)
        return index.feats.has(feat.id) || index.feats.has(feat.name.toLowerCase());
      });
    } catch (e) {
      SWSELogger.error("[ActorAbilityBridge] Error getting feats", e);
      return [];
    }
  }

  /**
   * Check if actor has a specific feat
   * @param {Actor} actor - The actor
   * @param {string} featNameOrId - Feat name or ID to check
   * @returns {boolean} True if actor has the feat
   */
  static hasFeat(actor, featNameOrId) {
    if (!actor || !featNameOrId) {
      return false;
    }

    try {
      const index = ActorItemIndex.build(actor);

      // Try to resolve the feat from registry first
      let featDef = null;
      if (FeatRegistry.getByName) {
        featDef = FeatRegistry.getByName(featNameOrId);
      }
      if (!featDef && FeatRegistry.getById) {
        featDef = FeatRegistry.getById(featNameOrId);
      }

      if (!featDef) {
        // Feat not in registry, cannot confirm ownership
        return false;
      }

      // Check if actor owns this feat
      return index.feats.has(featDef.id) || index.feats.has(featDef.name.toLowerCase());
    } catch (e) {
      SWSELogger.error("[ActorAbilityBridge] Error checking feat", e);
      return false;
    }
  }

  /**
   * Get all classes owned by actor, resolved through ClassesDB
   * @param {Actor} actor - The actor
   * @returns {Array} Array of class definitions from ClassesDB
   */
  static getClasses(actor) {
    if (!actor) {
      return [];
    }

    try {
      const index = ActorItemIndex.build(actor);
      const classes = [];

      for (const [classId, classLevel] of index.classes) {
        const classDef = ClassesDB.get(classId);
        if (classDef) {
          // Attach level info from actor
          classes.push({
            ...classDef,
            level: classLevel.level || 1
          });
        }
      }

      return classes;
    } catch (e) {
      SWSELogger.error("[ActorAbilityBridge] Error getting classes", e);
      return [];
    }
  }

  /**
   * Get all force powers owned by actor, resolved through ForceRegistry
   * @param {Actor} actor - The actor
   * @returns {Array} Array of force power definitions from registry
   */
  static getForcePowers(actor) {
    if (!actor) {
      return [];
    }

    try {
      const index = ActorItemIndex.build(actor);

      // Return only powers that exist in registry AND are owned by actor
      if (!ForceRegistry.getAll) {
        SWSELogger.warn("[ActorAbilityBridge] ForceRegistry.getAll not available");
        return [];
      }

      return ForceRegistry.getAll().filter(power => {
        return index.forcePowers.has(power.id) || index.forcePowers.has(power.name.toLowerCase());
      });
    } catch (e) {
      SWSELogger.error("[ActorAbilityBridge] Error getting force powers", e);
      return [];
    }
  }

  /**
   * Check if actor has a specific force power
   * @param {Actor} actor - The actor
   * @param {string} powerNameOrId - Force power name or ID to check
   * @returns {boolean} True if actor has the power
   */
  static hasForcePower(actor, powerNameOrId) {
    if (!actor || !powerNameOrId) {
      return false;
    }

    try {
      const index = ActorItemIndex.build(actor);

      // Try to resolve the power from registry
      let powerDef = null;
      if (ForceRegistry.getByName) {
        powerDef = ForceRegistry.getByName(powerNameOrId);
      }
      if (!powerDef && ForceRegistry.getById) {
        powerDef = ForceRegistry.getById(powerNameOrId);
      }

      if (!powerDef) {
        return false;
      }

      return index.forcePowers.has(powerDef.id) || index.forcePowers.has(powerDef.name.toLowerCase());
    } catch (e) {
      SWSELogger.error("[ActorAbilityBridge] Error checking force power", e);
      return false;
    }
  }
}
