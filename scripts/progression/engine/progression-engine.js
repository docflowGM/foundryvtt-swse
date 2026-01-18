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
    swseLogger.log(`[PROGRESSION-ENGINE] acquireLock: Acquiring lock for actor ${actor.id} (${actor.name})`);
    const flag = actor.getFlag("swse", "progressionLock");
    if (flag) {
      swseLogger.error(`[PROGRESSION-ENGINE] ERROR: acquireLock failed - lock already held for actor ${actor.id}`);
      throw new Error("Progression lock held");
    }
    await actor.setFlag("swse", "progressionLock", true);
    swseLogger.log(`[PROGRESSION-ENGINE] acquireLock: Lock acquired successfully for actor ${actor.id}`);
  }

  /**
   * Release progression lock (legacy method)
   */
  static async releaseLock(actor) {
    swseLogger.log(`[PROGRESSION-ENGINE] releaseLock: Releasing lock for actor ${actor.id}`);
    await actor.unsetFlag("swse", "progressionLock");
    swseLogger.log(`[PROGRESSION-ENGINE] releaseLock: Lock released successfully for actor ${actor.id}`);
  }

  /**
   * Get or create a progression engine instance for an actor
   * @private
   */
  static _getEngine(actor, mode = "chargen") {
    swseLogger.log(`[PROGRESSION-ENGINE] _getEngine: Getting/creating engine for actor ${actor.id} (${actor.name}), mode: ${mode}`);

    // Check if actor already has an active engine
    if (actor._progressionEngine) {
      swseLogger.log(`[PROGRESSION-ENGINE] _getEngine: Reusing existing engine for actor ${actor.id}`);
      return actor._progressionEngine;
    }

    // Create new engine
    swseLogger.log(`[PROGRESSION-ENGINE] _getEngine: Creating NEW SWSEProgressionEngine for actor ${actor.id} with mode: ${mode}`);
    const engine = new SWSEProgressionEngine(actor, mode);
    actor._progressionEngine = engine;
    swseLogger.log(`[PROGRESSION-ENGINE] _getEngine: Engine created successfully for actor ${actor.id}`);
    return engine;
  }

  /**
   * Apply a character generation step
   * Delegates to new engine with backward compatibility
   */
  static async applyChargenStep(actor, stepId, payload = {}) {
    console.group("🚀 SWSE | PROGRESSION ENGINE ENTRY");
    console.log("Actor:", actor?.name, actor?.id);
    console.log("Actor type:", actor?.type);
    console.log("Step ID:", stepId);
    console.log("Payload:", payload);
    console.trace("Invocation stack");
    console.groupEnd();

    swseLogger.log(`[PROGRESSION-ENGINE] applyChargenStep: START - actor: ${actor.id} (${actor.name}), stepId: ${stepId}, payload:`, payload);
    await this.acquireLock(actor);
    try {
      // Get or create engine instance
      swseLogger.log(`[PROGRESSION-ENGINE] applyChargenStep: Getting engine instance for chargen mode...`);
      const engine = this._getEngine(actor, "chargen");
      swseLogger.log(`[PROGRESSION-ENGINE] applyChargenStep: Engine obtained successfully`);

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
      swseLogger.log(`[PROGRESSION-ENGINE] applyChargenStep: Mapped stepId "${stepId}" to action "${action}"`);

      if (action) {
        // Use new engine
        swseLogger.log(`[PROGRESSION-ENGINE] applyChargenStep: Executing action "${action}" via new engine...`);
        await engine.doAction(action, payload);
        swseLogger.log(`[PROGRESSION-ENGINE] applyChargenStep: Action "${action}" completed successfully`);
      } else {
        // Fallback to old implementation
        swseLogger.warn(`[PROGRESSION-ENGINE] WARNING: applyChargenStep - No mapped action for step "${stepId}", using legacy implementation...`);
        await this._applyStepLegacy(actor, stepId, payload);
        swseLogger.log(`[PROGRESSION-ENGINE] applyChargenStep: Legacy implementation completed for step "${stepId}"`);
      }

      // Finalize and trigger force powers
      swseLogger.log(`[PROGRESSION-ENGINE] applyChargenStep: Finalizing actor progression...`);
      await ActorProgressionUpdater.finalize(actor);
      swseLogger.log(`[PROGRESSION-ENGINE] applyChargenStep: Actor finalized, triggering force powers...`);
      await this._triggerForcePowers(actor);
      swseLogger.log(`[PROGRESSION-ENGINE] applyChargenStep: COMPLETE - All steps applied successfully`);

    } catch (err) {
      swseLogger.error(`[PROGRESSION-ENGINE] ERROR in applyChargenStep for actor ${actor.id}:`, err);
      swseLogger.error(`[PROGRESSION-ENGINE] Error stack:`, err.stack);
      throw err;
    } finally {
      await this.releaseLock(actor);
    }
  }

  /**
   * Apply level up
   * Delegates to new engine with backward compatibility
   */
  static async applyLevelUp(actor, { classId, level, selections = {} } = {}) {
    swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: START - actor: ${actor.id} (${actor.name}), classId: ${classId}, level: ${level}, selections:`, selections);
    await this.acquireLock(actor);
    try {
      // Get or create engine instance
      swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Getting engine instance for levelup mode...`);
      const engine = this._getEngine(actor, "levelup");
      swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Engine obtained successfully`);

      // Apply class level through new engine
      swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Applying class level - classId: ${classId}...`);
      await engine.doAction("confirmClass", { classId });
      swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Class level applied successfully`);

      // Apply selections
      swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Processing selections - skills: ${selections.skills ? 'YES' : 'NO'}, feats: ${selections.feats ? 'YES' : 'NO'}, talents: ${selections.talents ? 'YES' : 'NO'}`);

      if (selections.skills) {
        swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Applying ${selections.skills.length} skill selections...`);
        await engine.doAction("confirmSkills", { skills: selections.skills });
        swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Skills applied successfully`);
      }
      if (selections.feats) {
        swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Applying ${selections.feats.length} feat selections...`);
        await engine.doAction("confirmFeats", { featIds: selections.feats });
        swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Feats applied successfully`);
      }
      if (selections.talents) {
        swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Applying ${selections.talents.length} talent selections...`);
        await engine.doAction("confirmTalents", { talentIds: selections.talents });
        swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Talents applied successfully`);
      }

      // Finalize
      swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Finalizing actor progression...`);
      await ActorProgressionUpdater.finalize(actor);
      swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: Actor finalized, triggering force powers...`);
      await this._triggerForcePowers(actor);
      swseLogger.log(`[PROGRESSION-ENGINE] applyLevelUp: COMPLETE - Level up applied successfully`);

    } catch (err) {
      swseLogger.error(`[PROGRESSION-ENGINE] ERROR in applyLevelUp for actor ${actor.id}:`, err);
      swseLogger.error(`[PROGRESSION-ENGINE] Error stack:`, err.stack);
      throw err;
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
    swseLogger.log(`[PROGRESSION-ENGINE] getAvailableOptions: Getting options for actor ${actor.id} (${actor.name}), stepId: ${stepId}`);
    let result = [];

    switch (stepId) {
      case "species":
        result = Object.keys(PROGRESSION_RULES.species || {});
        swseLogger.log(`[PROGRESSION-ENGINE] getAvailableOptions: Species options found: ${result.length}`, result);
        break;
      case "background":
        result = Object.keys(PROGRESSION_RULES.backgrounds || {});
        swseLogger.log(`[PROGRESSION-ENGINE] getAvailableOptions: Background options found: ${result.length}`, result);
        break;
      case "class":
        result = Object.keys(PROGRESSION_RULES.classes || {});
        swseLogger.log(`[PROGRESSION-ENGINE] getAvailableOptions: Class options found: ${result.length}`, result);
        if (result.length === 0) {
          swseLogger.error(`[PROGRESSION-ENGINE] ERROR: No classes found in PROGRESSION_RULES!`);
        }
        break;
      default:
        swseLogger.warn(`[PROGRESSION-ENGINE] WARNING: getAvailableOptions - Unknown stepId: "${stepId}"`);
        result = [];
    }

    return result;
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
    if (typeof ForcePowerEngine === "undefined") return;

    const summary = {};

    actor._swseLastProgressionUpdate = summary;
    await actor.setFlag("swse", "lastProgressionUpdate", summary);

    ForcePowerEngine.handleForcePowerTriggers(actor, summary);
  } catch (e) {
    swseLogger.warn("ForcePowerEngine trigger failed", e);
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
    swseLogger.log(`[PROGRESSION-ENGINE] _applyClass: START - actor: ${actor.id} (${actor.name}), classId: ${payload.classId}`);
    swseLogger.log(`[PROGRESSION-ENGINE] _applyClass: Current progression:`, actor.system.progression);

    const progression = actor.system.progression || {};
    const classLevels = Array.from(progression.classLevels || []);

    swseLogger.log(`[PROGRESSION-ENGINE] _applyClass: Current classLevels count: ${classLevels.length}`);
    swseLogger.log(`[PROGRESSION-ENGINE] _applyClass: Adding class level:`, { class: payload.classId, level: 1, choices: payload.choices || {} });

    classLevels.push({
      class: payload.classId,
      level: 1,
      choices: payload.choices || {}
    });

    swseLogger.log(`[PROGRESSION-ENGINE] _applyClass: Updated classLevels count: ${classLevels.length}`);
    swseLogger.log(`[PROGRESSION-ENGINE] _applyClass: Updating actor with new classLevels...`);

    try {
      await globalThis.SWSE.ActorEngine.updateActor(actor, {
        "system.progression.classLevels": classLevels
      });
      swseLogger.log(`[PROGRESSION-ENGINE] _applyClass: Class applied successfully`);
    } catch (err) {
      swseLogger.error(`[PROGRESSION-ENGINE] ERROR in _applyClass:`, err);
      throw err;
    }
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
