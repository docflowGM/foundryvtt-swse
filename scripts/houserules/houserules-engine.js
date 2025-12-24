// scripts/houserules/houserules-engine.js
import { swseLogger } from "../utils/logger.js";

/**
 * DEPRECATED: House Rules Manager
 * This file is LEGACY code and should not be used for new implementations.
 * Use the modern houserule-settings.js and houserule-menus.js system instead.
 *
 * This class is kept for backwards compatibility but is no longer active.
 */
export class HouseRules {
  /**
   * Initialize the house rules system (stub for backwards compatibility)
   */
  static init() {
    swseLogger.warn("HouseRules.init() called - this is legacy code. Modern house rules system is used instead.");
  }

  /**
   * DEPRECATED: Register all houserule settings with Foundry
   * @deprecated Use houserule-settings.js instead
   */
  static registerSettings() {
    try {
      const namespace = "foundryvtt-swse";

      const rules = {
        useCustomCritical: {
          name: "Use Custom Critical Rules",
          hint: "Enables SWSE-specific critical hit modifications.",
          scope: "world",
          config: true,
          default: false,
          type: Boolean,
        },

        enableDamageShifting: {
          name: "Enable Damage Shifting",
          hint: "Allows shifting damage types according to SWSE house rules.",
          scope: "world",
          config: true,
          default: false,
          type: Boolean,
        },

        enableSkillRerollRule: {
          name: "Skill Reroll Variant",
          hint: "If enabled, players auto-reroll failed skill checks once per encounter.",
          scope: "world",
          config: true,
          default: false,
          type: Boolean,
        }
      };

      for (const [key, data] of Object.entries(rules)) {
        // Register only once; Foundry will not re-register the same key
        if (!game.settings.storage.get("world")?.has(`${namespace}.${key}`)) {
          game.settings.register(namespace, key, data);
        }
      }

      swseLogger.info("HouseRules | Settings registered");
    } catch (err) {
      swseLogger.error("HouseRules.registerSettings failed", err);
    }
  }

  /**
   * Initialize all houserule hooks
   */
  static initHooks() {
    try {
      Hooks.on("preCreateChatMessage", (message, data, userId) => {
        if (!HouseRules.isEnabled("useCustomCritical")) return;

        return HouseRules._handleCriticalIntercept(message, data, userId);
      });

      Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
        if (!HouseRules.isEnabled("enableDamageShifting")) return;

        HouseRules._handleDamageShift(actor, changes);
      });

      Hooks.on("dnd5e.preRollSkill", (actor, skillId, rollConfig) => {
        if (!HouseRules.isEnabled("enableSkillRerollRule")) return;

        HouseRules._applySkillReroll(actor, skillId, rollConfig);
      });

      swseLogger.info("HouseRules | Hooks initialized");
    } catch (err) {
      swseLogger.error("HouseRules.initHooks failed", err);
    }
  }

  /**
   * Simple accessor to read houserule settings safely
   */
  static isEnabled(key) {
    try {
      return game.settings.get("foundryvtt-swse", key);
    } catch (err) {
      swseLogger.warn(`HouseRules | Attempted to read invalid key: ${key}`);
      return false;
    }
  }

  // ============================================================
  // HOUSERULE IMPLEMENTATIONS
  // ============================================================

  /**
   * Intercepts ChatMessage to apply custom critical hit behavior
   */
  static _handleCriticalIntercept(message, data, userId) {
    try {
      // only proceed on attack rolls
      if (!data?.flags?.swse?.isAttackRoll) return;

      const roll = data.rolls?.[0];
      if (!roll) return;

      if (roll._total >= roll.options?.criticalThreshold ?? 20) {
        // Insert custom crit behavior here
        message.updateSource({
          flavor: `${data.flavor ?? ""} <strong>(Custom Critical Applied)</strong>`
        });
      }
    } catch (err) {
      swseLogger.error("HouseRules._handleCriticalIntercept failed", err);
    }
  }

  /**
   * Damage shifting variant rule implementation
   */
  static _handleDamageShift(actor, changes) {
    try {
      if (!changes?.system?.hp?.value) return;

      // Example: shift 1 point of damage from hp to condition track
      const damage = actor.system.hp.max - changes.system.hp.value;
      if (damage > 0) {
        const ct = actor.system.condition ?? 0;
        changes["system.condition"] = ct + 1;
      }
    } catch (err) {
      swseLogger.error("HouseRules._handleDamageShift failed", err);
    }
  }

  /**
   * One free reroll on failed skill checks per encounter
   */
  static _applySkillReroll(actor, skillId, rollConfig) {
    try {
      const skill = actor.system.skills?.[skillId];
      if (!skill) return;

      if (rollConfig.roll.total < skill.dc && !skill._rerolledThisEncounter) {
        rollConfig.disadvantage = false;
        rollConfig.advantage = true;

        skill._rerolledThisEncounter = true;
      }
    } catch (err) {
      swseLogger.error("HouseRules._applySkillReroll failed", err);
    }
  }
}

// Called by system init
export const registerHouseRules = () => {
  HouseRules.registerSettings();
  HouseRules.initHooks();
};
