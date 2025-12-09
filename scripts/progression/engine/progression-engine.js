/**
 * SWSE Progression Engine - Backward Compatibility Layer
 *
 * This provides the old static API while delegating to the new SWSEProgressionEngine.
 * New code should use SWSEProgressionEngine directly from scripts/engine/progression.js
 *
 * Public API (backward compatible):
 *  await ProgressionEngine.applyChargenStep(actor, stepId, payload)
 *  await ProgressionEngine.applyLevelUp(actor, { classId, level, selections })
 *  await ProgressionEngine.applyTemplateBuild(actor, templateId, options)
 *  const opts = ProgressionEngine.getAvailableOptions(actor, stepId)
 */

import { swseLogger } from "../../utils/logger.js";
import { SWSEProgressionEngine } from "../../engine/progression.js";
import { ForcePowerEngine } from "./force-power-engine.js";
import { PROGRESSION_RULES } from "../data/progression-data.js";
import { ActorProgressionUpdater } from "./progression-actor-updater.js";
import { TemplateEngine } from "./template-engine.js";

export class ProgressionEngine {
  /**
   * Acquire progression lock (legacy method)
   * New engine handles locking internally
   */
  static async acquireLock(actor) {
    const flag = actor.getFlag("swse", "progressionLock");
    if (flag) throw new Error("Progression lock held");
    await actor.setFlag("swse", "progressionLock", true);
  }

  /**
   * Release progression lock (legacy method)
   */
  static async releaseLock(actor) {
    await actor.unsetFlag("swse", "progressionLock");
  }

  /**
   * Get or create a progression engine instance for an actor
   * @private
   */
  static _getEngine(actor, mode = "chargen") {
    // Check if actor already has an active engine
    if (actor._progressionEngine) {
      return actor._progressionEngine;
    }

    // Create new engine
    const engine = new SWSEProgressionEngine(actor, mode);
    actor._progressionEngine = engine;
    return engine;
  }

  /**
   * Apply a character generation step
   * Delegates to new engine with backward compatibility
   */
  static async applyChargenStep(actor, stepId, payload = {}) {
    await this.acquireLock(actor);
    try {
      // Get or create engine instance
      const engine = this._getEngine(actor, "chargen");

      // Map old step names to new action names
      const actionMap = {
        "species": "confirmSpecies",
        "background": "confirmBackground",
        "abilities": "confirmAbilities",
        "class": "confirmClass",
        "skills": "confirmSkills",
        "feats": "confirmFeats",
        "talents": "confirmTalents"
      };

      const action = actionMap[stepId];
      if (action) {
        // Use new engine
        await engine.doAction(action, payload);
      } else {
        // Fallback to old implementation
        await this._applyStepLegacy(actor, stepId, payload);
      }

      // Finalize and trigger force powers
      await ActorProgressionUpdater.finalize(actor);
      await this._triggerForcePowers(actor);

    } finally {
      await this.releaseLock(actor);
    }
  }

  /**
   * Apply level up
   * Delegates to new engine with backward compatibility
   */
  static async applyLevelUp(actor, { classId, level, selections = {} } = {}) {
    await this.acquireLock(actor);
    try {
      // Get or create engine instance
      const engine = this._getEngine(actor, "levelup");

      // Apply class level through new engine
      await engine.doAction("confirmClass", { classId });

      // Apply selections
      if (selections.skills) {
        await engine.doAction("confirmSkills", { skills: selections.skills });
      }
      if (selections.feats) {
        await engine.doAction("confirmFeats", { featIds: selections.feats });
      }
      if (selections.talents) {
        await engine.doAction("confirmTalents", { talentIds: selections.talents });
      }

      // Finalize
      await ActorProgressionUpdater.finalize(actor);
      await this._triggerForcePowers(actor);

    } finally {
      await this.releaseLock(actor);
    }
  }

  /**
   * Apply template build
   */
  static async applyTemplateBuild(actor, templateId, options = {}) {
    await this.acquireLock(actor);
    try {
      await TemplateEngine.applyTemplate(actor, templateId, options);
      await ActorProgressionUpdater.finalize(actor);
      await this._triggerForcePowers(actor);
    } finally {
      await this.releaseLock(actor);
    }
  }

  /**
   * Get available options for a step
   */
  static getAvailableOptions(actor, stepId) {
    switch (stepId) {
      case "species": return Object.keys(PROGRESSION_RULES.species || {});
      case "background": return Object.keys(PROGRESSION_RULES.backgrounds || {});
      case "class": return Object.keys(PROGRESSION_RULES.classes || {});
      default: return [];
    }
  }

  /* -------------------------
     Private helper methods
     ------------------------- */

  /**
   * Trigger force power updates
   * @private
   */
  static async _triggerForcePowers(actor) {
    try {
      if (typeof ForcePowerEngine !== 'undefined') {
        await ForcePowerEngine.handleForcePowerTriggers(
          actor,
          actor._swseLastProgressionUpdate || {}
        );
      }
    } catch(e) {
      swseLogger.warn('ForcePowerEngine trigger failed', e);
    }
  }

  /**
   * Legacy step application (fallback)
   * @private
   */
  static async _applyStepLegacy(actor, stepId, payload) {
    switch (stepId) {
      case "species": await this._applySpecies(actor, payload); break;
      case "background": await this._applyBackground(actor, payload); break;
      case "abilities": await this._applyAbilities(actor, payload); break;
      case "class": await this._applyClass(actor, payload); break;
      case "skills": await this._applySkills(actor, payload); break;
      case "feats": await this._applyFeats(actor, payload); break;
      case "talents": await this._applyTalents(actor, payload); break;
      default: throw new Error(`Unknown step: ${stepId}`);
    }
  }

  /**
   * Legacy implementations (kept for backward compatibility)
   * These are only used as fallback if new engine fails
   * @private
   */

  static async _applySpecies(actor, { speciesId } = {}) {
    const rules = PROGRESSION_RULES.species || {};
    if (!rules[speciesId]) throw new Error(`Unknown species: ${speciesId}`);
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      "system.progression.species": speciesId
    });
  }

  static async _applyBackground(actor, { backgroundId } = {}) {
    const rules = PROGRESSION_RULES.backgrounds || {};
    if (!rules[backgroundId]) throw new Error(`Unknown background: ${backgroundId}`);
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      "system.progression.background": backgroundId
    });
  }

  static async _applyAbilities(actor, { method, values } = {}) {
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      "system.progression.abilities": values || {}
    });
  }

  static async _applyClass(actor, payload) {
    const progression = actor.system.progression || {};
    const classLevels = Array.from(progression.classLevels || []);
    classLevels.push({
      class: payload.classId,
      level: 1,
      choices: payload.choices || {}
    });
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      "system.progression.classLevels": classLevels
    });
  }

  static async _applyClassLevel(actor, { classId, level, selections }) {
    const progression = actor.system.progression || {};
    const classLevels = Array.from(progression.classLevels || []);
    classLevels.push({ class: classId, level, selections });
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      "system.progression.classLevels": classLevels
    });
  }

  static async _applySkills(actor, payload) {
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      "system.progression.skills": payload.skills || []
    });
  }

  static async _applyFeats(actor, { featIds = [] } = {}) {
    const progression = actor.system.progression || {};
    const feats = Array.from(new Set([...(progression.feats || []), ...featIds]));
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      "system.progression.feats": feats
    });
  }

  static async _applyTalents(actor, { talentIds = [] } = {}) {
    const progression = actor.system.progression || {};
    const talents = Array.from(new Set([...(progression.talents || []), ...talentIds]));
    await globalThis.SWSE.ActorEngine.updateActor(actor, {
      "system.progression.talents": talents
    });
  }
}

// Also export the new engine for direct access
export { SWSEProgressionEngine } from "../../engine/progression.js";

swseLogger.log("Progression Engine (compatibility layer) loaded");
