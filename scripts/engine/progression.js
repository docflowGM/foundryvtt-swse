// scripts/engine/progression.js
import { swseLogger } from '../utils/logger.js';
import { applyActorUpdateAtomic } from '../utils/actor-utils.js';

/**
 * Unified SWSE Progression Engine
 * Single source of truth for character generation and level-up
 */
export class SWSEProgressionEngine {
  constructor(actor, mode = "chargen") {
    this.actor = actor;
    this.mode = mode; // "chargen" or "levelup"
    this.current = null;
    this.completedSteps = [];
    this.data = {};

    // Load saved state from actor
    this.loadStateFromActor();

    // Initialize steps
    this._initializeSteps();

    // Set initial step
    if (!this.current) {
      this.current = this.steps[0]?.id || null;
    }

    swseLogger.log(`ProgressionEngine initialized: ${mode} for ${actor.name}`);
  }

  /**
   * Initialize step definitions
   * @private
   */
  _initializeSteps() {
    if (this.mode === "chargen") {
      this.chargenSteps = [
        {
          id: "species",
          label: "Species",
          subtitle: "Choose your species",
          icon: "glyph-species"
        },
        {
          id: "background",
          label: "Background",
          subtitle: "Choose your background",
          icon: "glyph-background"
        },
        {
          id: "attributes",
          label: "Attributes",
          subtitle: "Set your ability scores",
          icon: "glyph-attributes"
        },
        {
          id: "class",
          label: "Class",
          subtitle: "Choose your class",
          icon: "glyph-class"
        },
        {
          id: "skills",
          label: "Skills",
          subtitle: "Train your skills",
          icon: "glyph-skills"
        },
        {
          id: "feats",
          label: "Feats",
          subtitle: "Select your feats",
          icon: "glyph-feats"
        },
        {
          id: "talents",
          label: "Talents",
          subtitle: "Choose your talents",
          icon: "glyph-talents"
        },
        {
          id: "finalize",
          label: "Finalize",
          subtitle: "Review and confirm",
          icon: "glyph-finalize"
        }
      ];
    } else {
      this.levelUpSteps = [
        {
          id: "class",
          label: "Class",
          subtitle: "Choose class for this level",
          icon: "glyph-class"
        },
        {
          id: "hp",
          label: "Hit Points",
          subtitle: "Roll or take average",
          icon: "glyph-hp"
        },
        {
          id: "skills",
          label: "Skills",
          subtitle: "Allocate skill points",
          icon: "glyph-skills"
        },
        {
          id: "feats",
          label: "Feats",
          subtitle: "Select new feats",
          icon: "glyph-feats"
        },
        {
          id: "talents",
          label: "Talents",
          subtitle: "Choose new talents",
          icon: "glyph-talents"
        },
        {
          id: "abilities",
          label: "Abilities",
          subtitle: "Increase ability score (if applicable)",
          icon: "glyph-attributes"
        },
        {
          id: "finalize",
          label: "Finalize",
          subtitle: "Review and apply",
          icon: "glyph-finalize"
        }
      ];
    }
  }

  /**
   * Get normalized steps
   * @returns {Array} Normalized step array
   */
  getSteps() {
    const base = this.mode === "chargen" ? this.chargenSteps : this.levelUpSteps;
    return this.normalizeSteps(base);
  }

  /**
   * Normalize step schema
   * @param {Array} steps - Raw steps
   * @returns {Array} Normalized steps
   */
  normalizeSteps(steps) {
    return steps.map((s, i) => ({
      id: s.id ?? `step-${i}`,
      label: s.label ?? "",
      subtitle: s.subtitle ?? "",
      icon: s.icon ?? "glyph-generic",
      locked: !this._isStepAvailable(s.id),
      completed: this._isStepCompleted(s.id),
      current: s.id === this.current
    }));
  }

  /**
   * Check if step is available
   * @param {string} id - Step ID
   * @returns {boolean}
   * @private
   */
  _isStepAvailable(id) {
    // First step is always available
    const steps = this.mode === "chargen" ? this.chargenSteps : this.levelUpSteps;
    if (id === steps[0]?.id) {
      return true;
    }

    // Chargen specific logic
    if (this.mode === "chargen") {
      if (id === "background") return this.completedSteps.includes("species");
      if (id === "attributes") return this.completedSteps.includes("background");
      if (id === "class") return this.completedSteps.includes("attributes");
      if (id === "skills") return this.completedSteps.includes("class");
      if (id === "feats") return this.completedSteps.includes("skills");
      if (id === "talents") return this.completedSteps.includes("feats");
      if (id === "finalize") return this.completedSteps.includes("talents");
    }

    // Level-up specific logic
    if (this.mode === "levelup") {
      if (id === "hp") return this.completedSteps.includes("class");
      if (id === "skills") return this.completedSteps.includes("hp");
      if (id === "feats") return this.completedSteps.includes("skills");
      if (id === "talents") return this.completedSteps.includes("feats");
      if (id === "abilities") return this.completedSteps.includes("talents");
      if (id === "finalize") return this.completedSteps.includes("abilities");
    }

    return true;
  }

  /**
   * Check if step is completed
   * @param {string} id - Step ID
   * @returns {boolean}
   * @private
   */
  _isStepCompleted(id) {
    return this.completedSteps.includes(id);
  }

  /**
   * Navigate to a step
   * @param {string} id - Step ID
   */
  goToStep(id) {
    // Check if step is available
    if (!this._isStepAvailable(id)) {
      ui.notifications?.warn(`Step "${id}" is not yet available`);
      return false;
    }

    this.current = id;

    // Emit events
    Hooks.call('swse:progression:stepChanged', id);
    Hooks.call('swse:progression:updated');

    swseLogger.log(`Progression: navigated to ${id}`);
    return true;
  }

  /**
   * Mark step as completed
   * @param {string} id - Step ID
   */
  async completeStep(id) {
    if (!this.completedSteps.includes(id)) {
      this.completedSteps.push(id);

      // Save state
      await this.saveStateToActor();

      // Emit event
      Hooks.call('swse:progression:updated');

      swseLogger.log(`Progression: completed step ${id}`);
    }

    // Auto-advance to next step if not at finalize
    if (id !== "finalize") {
      const steps = this.getSteps();
      const currentIndex = steps.findIndex(s => s.id === id);
      const nextStep = steps[currentIndex + 1];

      if (nextStep && this._isStepAvailable(nextStep.id)) {
        this.goToStep(nextStep.id);
      }
    }
  }

  /**
   * Execute an action for a step
   * @param {string} action - Action name
   * @param {*} payload - Action payload
   * @returns {Promise<*>} Action result
   */
  async doAction(action, payload) {
    const fn = this[`_action_${action}`];

    if (typeof fn === "function") {
      try {
        const result = await fn.call(this, payload);
        Hooks.call('swse:progression:updated');
        return result;
      } catch (err) {
        swseLogger.error(`Progression action "${action}" failed:`, err);
        ui.notifications?.error(`Action failed: ${err.message}`);
        throw err;
      }
    } else {
      const msg = `Unknown progression action: ${action}`;
      swseLogger.warn(msg);
      ui.notifications?.warn(msg);
    }
  }

  /**
   * Validate all steps
   */
  validateSteps() {
    for (const step of this.getSteps()) {
      step.locked = !this._isStepAvailable(step.id);
      step.completed = this._isStepCompleted(step.id);
      step.current = step.id === this.current;
    }
  }

  /**
   * Load state from actor flags
   */
  loadStateFromActor() {
    const data = this.actor.getFlag('swse', 'progression') || {};
    this.completedSteps = data.completedSteps || [];
    this.current = data.currentStep || null;
    this.mode = data.mode || this.mode;
    this.data = data.data || {};

    swseLogger.log(`Loaded progression state:`, { completedSteps: this.completedSteps, current: this.current });
  }

  /**
   * Save state to actor flags
   */
  async saveStateToActor() {
    await this.actor.setFlag('swse', 'progression', {
      completedSteps: this.completedSteps,
      currentStep: this.current,
      mode: this.mode,
      data: this.data
    });
  }

  /**
   * Clear saved state
   */
  async clearState() {
    await this.actor.unsetFlag('swse', 'progression');
    this.completedSteps = [];
    this.current = null;
    this.data = {};
  }

  /**
   * Finalize progression
   */
  async finalize() {
    try {
      // Apply all changes
      await this.saveStateToActor();

      // Emit completion event
      Hooks.call('swse:progression:completed', {
        actor: this.actor,
        mode: this.mode,
        level: this.actor.system.level
      });

      swseLogger.log(`Progression finalized for ${this.actor.name}`);

      // Optional: Clear state after completion
      // await this.clearState();

      return true;
    } catch (err) {
      swseLogger.error('Progression finalize failed:', err);
      ui.notifications?.error(`Failed to finalize: ${err.message}`);
      throw err;
    }
  }

  /* ========================
   * ACTION HANDLERS
   * ======================== */

  async _action_confirmSpecies(payload) {
    const { speciesId } = payload;
    await applyActorUpdateAtomic(this.actor, {
      "system.progression.species": speciesId
    });
    this.data.species = speciesId;
    await this.completeStep("species");
  }

  async _action_confirmBackground(payload) {
    const { backgroundId } = payload;
    await applyActorUpdateAtomic(this.actor, {
      "system.progression.background": backgroundId
    });
    this.data.background = backgroundId;
    await this.completeStep("background");
  }

  async _action_confirmAbilities(payload) {
    const { method, values } = payload;
    await applyActorUpdateAtomic(this.actor, {
      "system.abilities": values
    });
    this.data.abilities = { method, values };
    await this.completeStep("attributes");
  }

  async _action_confirmClass(payload) {
    const { classId } = payload;
    const progression = this.actor.system.progression || {};
    const classLevels = Array.from(progression.classLevels || []);
    classLevels.push({ class: classId, level: 1, choices: {} });

    await applyActorUpdateAtomic(this.actor, {
      "system.progression.classLevels": classLevels
    });
    this.data.class = classId;
    await this.completeStep("class");
  }

  async _action_confirmSkills(payload) {
    const { skills } = payload;
    await applyActorUpdateAtomic(this.actor, {
      "system.progression.skills": skills
    });
    this.data.skills = skills;
    await this.completeStep("skills");
  }

  async _action_confirmFeats(payload) {
    const { featIds } = payload;
    const progression = this.actor.system.progression || {};
    const feats = Array.from(new Set([...(progression.feats || []), ...featIds]));

    await applyActorUpdateAtomic(this.actor, {
      "system.progression.feats": feats
    });
    this.data.feats = featIds;
    await this.completeStep("feats");
  }

  async _action_confirmTalents(payload) {
    const { talentIds } = payload;
    const progression = this.actor.system.progression || {};
    const talents = Array.from(new Set([...(progression.talents || []), ...talentIds]));

    await applyActorUpdateAtomic(this.actor, {
      "system.progression.talents": talents
    });
    this.data.talents = talentIds;
    await this.completeStep("talents");
  }

  async _action_rollHP(payload) {
    const { roll, value } = payload;
    this.data.hp = { roll, value };
    await this.completeStep("hp");
  }

  async _action_increaseAbility(payload) {
    const { ability } = payload;
    const currentValue = this.actor.system.abilities?.[ability]?.value || 10;

    await applyActorUpdateAtomic(this.actor, {
      [`system.abilities.${ability}.value`]: currentValue + 1
    });
    this.data.abilityIncrease = ability;
    await this.completeStep("abilities");
  }
}

/**
 * Initialize progression system hooks
 */
export function initializeProgressionHooks() {
  // Navigation hook
  Hooks.on("swse:sidebar:navigate", (id) => {
    try {
      game.swse.progression?.goToStep(id);
    } catch (e) {
      swseLogger.warn("SWSE progression navigation failed:", e);
    }
  });

  // Reopen last step on ready (if in progress)
  Hooks.once('ready', () => {
    const engine = game.swse?.progression;
    if (engine?.current && engine.completedSteps.length > 0 && !engine.completedSteps.includes('finalize')) {
      swseLogger.log(`Resuming progression at step: ${engine.current}`);
      Hooks.call('swse:progression:resume', engine.current);
    }
  });

  swseLogger.log('Progression hooks initialized');
}

export default SWSEProgressionEngine;
