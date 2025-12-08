import { ProgressionEngine } from "./scripts/progression/engine/progression-engine.js";
import { ForcePowerEngine } from "./force-power-engine.js";
/**
 * SWSE Progression Engine - single source for chargen, level-up and templates.
 *
 * Public API:
 *  await ProgressionEngine.applyChargenStep(actor, stepId, payload)
 *  await ProgressionEngine.applyLevelUp(actor, { classId, level, selections })
 *  await ProgressionEngine.applyTemplateBuild(actor, templateId, options)
 *  const opts = ProgressionEngine.getAvailableOptions(actor, stepId)
 *
 * This is a skeleton. Fill PROGRESSION_RULES in progression-data.js with real SWSE rules.
 */

import { PROGRESSION_RULES } from "../data/progression-data.js";
import { ActorProgressionUpdater } from "./progression-actor-updater.js";
import { TemplateEngine } from "./template-engine.js";

export class ProgressionEngine {
  static async acquireLock(actor) {
    const flag = actor.getFlag("swse", "progressionLock");
    if (flag) throw new Error("Progression lock held");
    await actor.setFlag("swse", "progressionLock", true);
  }
  static async releaseLock(actor) {
    await actor.unsetFlag("swse", "progressionLock");
  }

  static async applyChargenStep(actor, stepId, payload = {}) {
    await this.acquireLock(actor);
    try {
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
      await ActorProgressionUpdater.finalize(actor);
    try {
      // Force power triggers: pass a lightweight update summary if available
      if (typeof ForcePowerEngine !== 'undefined') {
        await ForcePowerEngine.handleForcePowerTriggers(actor, actor._swseLastProgressionUpdate || {});
      }
    } catch(e) { swseLogger.warn('ForcePowerEngine trigger failed', e); }

    } finally {
      await this.releaseLock(actor);
    }
  }

  static async applyLevelUp(actor, { classId, level, selections = {} } = {}) {
    await this.acquireLock(actor);
    try {
      await this._applyClassLevel(actor, { classId, level, selections });
      await ActorProgressionUpdater.finalize(actor);
    try {
      // Force power triggers: pass a lightweight update summary if available
      if (typeof ForcePowerEngine !== 'undefined') {
        await ForcePowerEngine.handleForcePowerTriggers(actor, actor._swseLastProgressionUpdate || {});
      }
    } catch(e) { swseLogger.warn('ForcePowerEngine trigger failed', e); }

    } finally {
      await this.releaseLock(actor);
    }
  }

  static async applyTemplateBuild(actor, templateId, options = {}) {
    await this.acquireLock(actor);
    try {
      await TemplateEngine.applyTemplate(actor, templateId, options);
      await ActorProgressionUpdater.finalize(actor);
    try {
      // Force power triggers: pass a lightweight update summary if available
      if (typeof ForcePowerEngine !== 'undefined') {
        await ForcePowerEngine.handleForcePowerTriggers(actor, actor._swseLastProgressionUpdate || {});
      }
    } catch(e) { swseLogger.warn('ForcePowerEngine trigger failed', e); }

    } finally {
      await this.releaseLock(actor);
    }
  }

  /* -------------------------
     Private helpers (skeletons)
     ------------------------- */

  static async _applySpecies(actor, { speciesId } = {}) {
    const rules = PROGRESSION_RULES.species || {};
    if (!rules[speciesId]) throw new Error(`Unknown species: ${speciesId}`);
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.species": speciesId });
globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.species": speciesId });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.species": speciesId }); */

  }

  static async _applyBackground(actor, { backgroundId } = {}) {
    const rules = PROGRESSION_RULES.backgrounds || {};
    if (!rules[backgroundId]) throw new Error(`Unknown background: ${backgroundId}`);
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.background": backgroundId });
globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.background": backgroundId });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.background": backgroundId }); */

  }

  static async _applyAbilities(actor, { method, values } = {}) {
    // values: { str, dex, con, int, wis, cha }
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.abilities": values || {} });
globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.abilities": values || {} });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.abilities": values || {} }); */

  }

  static async _applyClass(actor, payload) {
    const progression = actor.system.progression || {};
    const classLevels = Array.from(progression.classLevels || []);
    classLevels.push({ class: payload.classId, level: 1, choices: payload.choices || {} });
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.classLevels": classLevels });
globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.classLevels": classLevels });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.classLevels": classLevels }); */

  }

  static async _applyClassLevel(actor, { classId, level, selections }) {
    const progression = actor.system.progression || {};
    const classLevels = Array.from(progression.classLevels || []);
    classLevels.push({ class: classId, level, selections });
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.classLevels": classLevels });
globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.classLevels": classLevels });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.classLevels": classLevels }); */

  }

  static async _applySkills(actor, payload) {
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.skills": payload.skills || [] });
globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.skills": payload.skills || [] });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.skills": payload.skills || [] }); */

  }

  static async _applyFeats(actor, { featIds = [] } = {}) {
    const progression = actor.system.progression || {};
    const feats = Array.from(new Set([...(progression.feats||[]), ...featIds]));
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.feats": feats });
globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.feats": feats });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.feats": feats }); */

  }

  static async _applyTalents(actor, { talentIds = [] } = {}) {
    const progression = actor.system.progression || {};
    const talents = Array.from(new Set([...(progression.talents||[]), ...talentIds]));
    await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.talents": talents });
globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.talents": talents });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { "system.progression.talents": talents }); */

  }

  static getAvailableOptions(actor, stepId) {
    switch (stepId) {
      case "species": return Object.keys(PROGRESSION_RULES.species || {});
      case "background": return Object.keys(PROGRESSION_RULES.backgrounds || {});
      case "class": return Object.keys(PROGRESSION_RULES.classes || {});
      default: return [];
    }
  }
}
