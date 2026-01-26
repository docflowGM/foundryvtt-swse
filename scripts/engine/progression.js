// scripts/engine/progression.js
import { swseLogger } from '../utils/logger.js';
import { applyActorUpdateAtomic } from '../utils/actor-utils.js';
import { FinalizeIntegration } from '../progression/integration/finalize-integration.js';

/**
 * Unified SWSE Progression Engine
 * Single source of truth for character generation and level-up
 */
export class SWSEProgressionEngine {
  constructor(actor, mode = "chargen") {
    swseLogger.log(`[PROGRESSION] ====== ENGINE CONSTRUCTOR START ======`);
    swseLogger.log(`[PROGRESSION] Constructor params: mode="${mode}", actor="${actor?.name || 'UNKNOWN'}", actor.id="${actor?.id || 'UNKNOWN'}"`);

    // Validate actor
    if (!actor) {
      swseLogger.error(`[PROGRESSION] FATAL: Actor is null/undefined in constructor`);
      throw new Error('SWSEProgressionEngine requires valid actor');
    }

    this.actor = actor;
    this.mode = mode; // "chargen" or "levelup"
    this.current = null;
    this.completedSteps = [];
    this.data = {};

    swseLogger.log(`[PROGRESSION] Loading state from actor...`);
    // Load saved state from actor
    try {
      this.loadStateFromActor();
      swseLogger.log(`[PROGRESSION] State loaded successfully`);
    } catch (err) {
      swseLogger.error(`[PROGRESSION] Error loading state from actor:`, err);
      throw err;
    }

    // Initialize steps
    swseLogger.log(`[PROGRESSION] Initializing steps for mode: ${mode}`);
    try {
      this._initializeSteps();
      swseLogger.log(`[PROGRESSION] Steps initialized successfully`);
    } catch (err) {
      swseLogger.error(`[PROGRESSION] Error initializing steps:`, err);
      throw err;
    }

    // Set initial step
    if (!this.current) {
      this.current = this.steps[0]?.id || null;
      swseLogger.log(`[PROGRESSION] Current step set to: ${this.current}`);
    } else {
      swseLogger.log(`[PROGRESSION] Current step already set to: ${this.current}`);
    }

    swseLogger.log(`[PROGRESSION] ====== ENGINE CONSTRUCTOR COMPLETE ======`);
    swseLogger.log(`ProgressionEngine initialized: ${mode} for ${actor.name}`);
  }

  /**
   * Initialize step definitions
   * @private
   */
  _initializeSteps() {
    swseLogger.log(`[PROGRESSION-STEPS] _initializeSteps() called with mode: "${this.mode}"`);

    if (this.mode === "chargen") {
      swseLogger.log(`[PROGRESSION-STEPS] Setting up CHARGEN steps...`);
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
          id: "force-techniques",
          label: "Force Techniques",
          subtitle: "Select Force Techniques",
          icon: "glyph-force-techniques",
          conditional: true
        },
        {
          id: "force-secrets",
          label: "Force Secrets",
          subtitle: "Select Force Secrets",
          icon: "glyph-force-secrets",
          conditional: true
        },
        {
          id: "starship-maneuvers",
          label: "Starship Maneuvers",
          subtitle: "Select Maneuvers",
          icon: "glyph-starship-maneuvers",
          conditional: true
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
          id: "force-techniques",
          label: "Force Techniques",
          subtitle: "Select Force Techniques",
          icon: "glyph-force-techniques",
          conditional: true
        },
        {
          id: "force-secrets",
          label: "Force Secrets",
          subtitle: "Select Force Secrets",
          icon: "glyph-force-secrets",
          conditional: true
        },
        {
          id: "starship-maneuvers",
          label: "Starship Maneuvers",
          subtitle: "Select Maneuvers",
          icon: "glyph-starship-maneuvers",
          conditional: true
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
      swseLogger.log(`[PROGRESSION-STEPS] Setting up LEVELUP steps...`);
      swseLogger.log(`[PROGRESSION-STEPS] LEVELUP steps initialized: ${this.levelUpSteps.map(s => s.id).join(', ')}`);
    }
  }

  /**
 * Get normalized steps
 * @returns {Array} Normalized step array
 */
getSteps() {
  swseLogger.log(`[PROGRESSION-STEPS] getSteps() called - mode: ${this.mode}`);
  const base = this.mode === "chargen"
    ? this.chargenSteps
    : this.levelUpSteps;

  if (!base) {
    swseLogger.error(`[PROGRESSION-STEPS] ERROR: base steps is null/undefined for mode ${this.mode}`);
    swseLogger.error(`[PROGRESSION-STEPS] chargenSteps exists: ${!!this.chargenSteps}`);
    swseLogger.error(`[PROGRESSION-STEPS] levelUpSteps exists: ${!!this.levelUpSteps}`);
    return [];
  }

  // Filter out conditional steps that shouldn't be shown
  const filtered = base.filter(s => {
    if (s.conditional) {
      return this._shouldShowConditionalStep(s.id);
    }
    return true;
  });

  swseLogger.log(`[PROGRESSION-STEPS] Normalizing ${filtered.length} steps...`);
  const normalized = this.normalizeSteps(filtered);
  swseLogger.log(`[PROGRESSION-STEPS] Normalized steps: ${normalized.map(s => s.id).join(', ')}`);
  return normalized;
}

/**
 * Expose normalized steps as a property.
 * Required because the constructor references this.steps[0].
 */
get steps() {
  return this.getSteps();
}

/**
 * Normalize step schema
 * @param {Array} steps - Raw steps (pre-filtered)
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

/* ========================
 * HELPER METHODS
 * Used by Feature Dispatcher and related systems
 * ======================== */

/**
 * Get the currently selected class level
 * Used by feature dispatcher for scaling expressions
 */
getSelectedClassLevel() {
  const progression = this.actor.system.progression || {};
  const classLevels = progression.classLevels || [];
  return classLevels.length > 0 ? classLevels[classLevels.length - 1].level : 1;
}

/**
 * Get the new character level after progression
 * For chargen, returns 1; for level-up, returns current level + 1
 */
getNewCharacterLevel() {
  if (this.mode === 'chargen') {
    return 1;
  }
  return (this.actor.system.level || 0) + 1;
}

/**
 * Get ability modifier for an ability score
 */
getAbilityMod(ability) {
  return this.actor.system.attributes?.[ability]?.mod ?? 0;
}

/**
 * Get all ability modifiers as an object
 */
getAllAbilityMods() {
  const abilities = this.actor.system.attributes || {};
  return {
    str: abilities.str?.mod ?? 0,
    dex: abilities.dex?.mod ?? 0,
    con: abilities.con?.mod ?? 0,
    int: abilities.int?.mod ?? 0,
    wis: abilities.wis?.mod ?? 0,
    cha: abilities.cha?.mod ?? 0
  };
}

/**
 * Grant a feat to the actor
 */
async grantFeat(name) {
  const { ProgressionEngineHelpers: H } = await import('../progression/engine/engine-helpers.js');
  const data = H.makeItemData(name, 'feat');
  return await H.addItemIfMissing(this.actor, data);
}

/**
 * Grant a class feature to the actor
 */
async grantClassFeature(name, feature) {
  const { ProgressionEngineHelpers: H } = await import('../progression/engine/engine-helpers.js');
  const data = H.makeItemData(name, 'classFeature', feature);
  return await H.addItemIfMissing(this.actor, data);
}

/**
 * Grant a force power to the actor
 */
async grantForcePower(name) {
  const { ProgressionEngineHelpers: H } = await import('../progression/engine/engine-helpers.js');
  const data = H.makeItemData(name, 'forcepower');
  return await H.addItemIfMissing(this.actor, data);
}

/**
 * Grant a language to the actor
 */
async grantLanguage(name) {
  const { LanguageEngine } = await import('../progression/engine/language-engine.js');
  return await LanguageEngine.grantLanguage(this.actor, name);
}

/**
 * Grant equipment to the actor
 */
async grantEquipment(items) {
  if (!items || !Array.isArray(items)) return;
  const { EquipmentEngine } = await import('../progression/engine/equipment-engine.js');
  for (const item of items) {
    const itemObj = typeof item === 'string' ? { name: item, type: 'equipment' } : item;
    await EquipmentEngine.grantEquipment(this.actor, [itemObj]);
  }
}

/**
 * Apply a scaling feature with formula resolution
 */
async applyScalingFeature(feature) {
  const { ProgressionEngineHelpers: H } = await import('../progression/engine/engine-helpers.js');
  const value = H.resolveScaling(feature, this);
  const name = feature.name;

  const data = H.makeItemData(name, 'scalingFeature', {
    value,
    description: `${name} (Scaling: ${value})`
  });

  return await H.grantOrReplace(this.actor, data);
}


  /**
   * Check if a conditional step should be shown
   * @param {string} id - Step ID
   * @returns {boolean}
   * @private
   */
  _shouldShowConditionalStep(id) {
    switch (id) {
      case "force-techniques":
        return this.data?.forceTechniqueChoices?.length > 0;
      case "force-secrets":
        return this.data?.forceSecretChoices?.length > 0;
      case "starship-maneuvers":
        return this.data?.starshipManeuverChoices?.length > 0;
      default:
        return false;
    }
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
      if (id === "force-techniques") return this.completedSteps.includes("feats");
      if (id === "force-secrets") return this.completedSteps.includes("force-techniques") || !this._shouldShowConditionalStep("force-techniques");
      if (id === "starship-maneuvers") return this.completedSteps.includes("force-secrets") || !this._shouldShowConditionalStep("force-secrets");
      if (id === "talents") return this.completedSteps.includes("starship-maneuvers") || !this._shouldShowConditionalStep("starship-maneuvers");
      if (id === "finalize") return this.completedSteps.includes("talents");
    }

    // Level-up specific logic
    if (this.mode === "levelup") {
      if (id === "hp") return this.completedSteps.includes("class");
      if (id === "skills") return this.completedSteps.includes("hp");
      if (id === "feats") return this.completedSteps.includes("skills");
      if (id === "force-techniques") return this.completedSteps.includes("feats");
      if (id === "force-secrets") return this.completedSteps.includes("force-techniques") || !this._shouldShowConditionalStep("force-techniques");
      if (id === "starship-maneuvers") return this.completedSteps.includes("force-secrets") || !this._shouldShowConditionalStep("force-secrets");
      if (id === "talents") return this.completedSteps.includes("starship-maneuvers") || !this._shouldShowConditionalStep("starship-maneuvers");
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

    // Mentor guidance integration
    try {
      Hooks.call("swse:mentor:guidance", {
        actor: this.actor,
        step: id
      });
    } catch (e) {
      swseLogger.warn("Mentor guidance hook failed:", e);
    }

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
    console.group("🚀 SWSE | doAction ENTRY");
    console.log("Action:", action);
    console.log("Engine mode:", this.mode);
    console.log("Actor:", this.actor?.name, this.actor?.id);
    console.log("Current step:", this.current);
    console.log("Payload:", payload);
    console.trace("Invocation stack");
    console.groupEnd();

    swseLogger.log(`[PROGRESSION-ACTION] ======== ACTION START: "${action}" ========`);
    swseLogger.log(`[PROGRESSION-ACTION] Actor: ${this.actor.name} (${this.actor.id})`);
    swseLogger.log(`[PROGRESSION-ACTION] Mode: ${this.mode}`);
    swseLogger.log(`[PROGRESSION-ACTION] Current step: ${this.current}`);
    swseLogger.log(`[PROGRESSION-ACTION] Payload:`, payload);

    const fn = this[`_action_${action}`];

    if (typeof fn === "function") {
      swseLogger.log(`[PROGRESSION-ACTION] Found action handler: _action_${action}`);
      try {
        swseLogger.log(`[PROGRESSION-ACTION] Calling _action_${action}...`);
        const result = await fn.call(this, payload);
        swseLogger.log(`[PROGRESSION-ACTION] Action completed successfully`);
        swseLogger.log(`[PROGRESSION-ACTION] Result:`, result);

        swseLogger.log(`[PROGRESSION-ACTION] Firing hook: swse:progression:updated`);
        Hooks.call('swse:progression:updated');

        swseLogger.log(`[PROGRESSION-ACTION] ======== ACTION END: "${action}" ========`);
        console.warn("✅ SWSE | Action executing successfully, returning result");
        return result;
      } catch (err) {
        swseLogger.error(`[PROGRESSION-ACTION] FATAL ERROR in action "${action}":`, err);
        swseLogger.error(`[PROGRESSION-ACTION] Error message: ${err.message}`);
        swseLogger.error(`[PROGRESSION-ACTION] Error stack:`, err.stack);
        ui.notifications?.error(`Action failed: ${err.message}`);
        throw err;
      }
    } else {
      const msg = `Unknown progression action: ${action}`;
      console.warn("⛔ SWSE | KILLER GUARD: Action handler not found");
      console.warn("⛔ Requested action:", action);
      console.warn("⛔ Available methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(m => m.startsWith('_action_')));
      swseLogger.warn(`[PROGRESSION-ACTION] ${msg}`);
      swseLogger.warn(`[PROGRESSION-ACTION] Available methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(m => m.startsWith('_action_')));
      ui.notifications?.warn(msg);
    }
  }

  /**
   * Validate all steps
   */
  validateSteps() {
    swseLogger.log(`[PROGRESSION-VALIDATE] Validating all steps...`);
    const steps = this.getSteps();
    swseLogger.log(`[PROGRESSION-VALIDATE] Total steps: ${steps.length}`);

    for (const step of steps) {
      step.locked = !this._isStepAvailable(step.id);
      step.completed = this._isStepCompleted(step.id);
      step.current = step.id === this.current;
      swseLogger.log(`[PROGRESSION-VALIDATE] Step "${step.id}": locked=${step.locked}, completed=${step.completed}, current=${step.current}`);
    }

    swseLogger.log(`[PROGRESSION-VALIDATE] Validation complete`);
  }

  /**
   * Load state from actor flags
   */
  loadStateFromActor() {
    swseLogger.log(`[PROGRESSION-STATE] Loading state from actor flags...`);
    const data = this.actor.getFlag('swse', 'progression') || {};

    swseLogger.log(`[PROGRESSION-STATE] Flag data exists: ${!!data}`);
    swseLogger.log(`[PROGRESSION-STATE] Completed steps: ${data.completedSteps?.length || 0}`, data.completedSteps);
    swseLogger.log(`[PROGRESSION-STATE] Current step: ${data.currentStep || 'none'}`);
    swseLogger.log(`[PROGRESSION-STATE] Mode: ${data.mode || 'none'}`);

    this.completedSteps = data.completedSteps || [];
    this.current = data.currentStep || null;
    this.mode = data.mode || this.mode;
    this.data = data.data || {};

    swseLogger.log(`[PROGRESSION-STATE] State loaded - completedSteps: ${this.completedSteps.length}, current: ${this.current}, mode: ${this.mode}`);

    // For levelup mode, store the previous state so we can track what's new
    // This prevents double-granting force powers on subsequent finalize calls
    if (this.mode === 'levelup') {
      swseLogger.log(`[PROGRESSION-STATE] Levelup mode detected - loading previous state...`);
      const progression = this.actor.system.progression || {};
      this.data._previousClassLevels = [...(progression.classLevels || [])];
      this.data._previousFeats = [...(progression.feats || [])];
      this.data._previousTalents = [...(progression.talents || [])];
      swseLogger.log(`[PROGRESSION-STATE] Previous state loaded - classLevels: ${this.data._previousClassLevels.length}, feats: ${this.data._previousFeats.length}, talents: ${this.data._previousTalents.length}`);
    }

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
      // Autoprompt required selections BEFORE modifying the actor
      if (!(await this._autoPromptSelections())) {
        return false; // User must finish choices
      }

      // Save progression state
      await this.saveStateToActor();

      // Capture before-state for diff generation
      const beforeSnapshot = this.actor.toObject(false);

      // Apply derived stats (HP, defenses, BAB, etc.)
      const { ActorProgressionUpdater } = await import('../progression/engine/progression-actor-updater.js');
      await ActorProgressionUpdater.finalize(this.actor);

      // Create feat/talent/skill items from progression data
      await this._createProgressionItems();

      // Run integrated finalization with new subsystems
      // This handles snapshots, specialized engines (Force, Language, Equipment),
      // derived stat recalculation, and diff generation
      try {
        await FinalizeIntegration.quickIntegrate(this.actor, this.mode);
        swseLogger.log('Integrated subsystem finalization completed');
      } catch (integrationErr) {
        swseLogger.warn('Integrated finalization encountered issues:', integrationErr);
        // Continue with legacy flow as fallback
      }

      // Trigger force powers (if applicable) - Legacy handler for compatibility
      try {
        const { ForcePowerEngine } = await import('../progression/engine/force-power-engine.js');
        const progression = this.actor.system.progression || {};

        // Build proper updateSummary for force power triggers
        const updateSummary = {
          level: this.actor.system.level,
          mode: this.mode
        };

        // Add ALL class levels from progression (for class-based force power grants)
        // This ensures multiclass characters get force powers from all their force classes
        if (progression.classLevels && progression.classLevels.length > 0) {
          // For chargen mode, include all class levels since they're all new
          // For levelup mode, we track which class levels are new in this session
          if (this.mode === 'chargen') {
            // All class levels are new during character generation
            updateSummary.classLevelsAdded = progression.classLevels.map(cl => ({
              class: cl.class,
              level: cl.level
            }));
          } else {
            // For levelup, check which class levels were added in this session
            // We compare against the stored state before this session started
            const previousClassLevels = this.data._previousClassLevels || [];
            const newClassLevels = progression.classLevels.slice(previousClassLevels.length);
            updateSummary.classLevelsAdded = newClassLevels.map(cl => ({
              class: cl.class,
              level: cl.level
            }));
          }
        }

        // Add ONLY newly selected feats (not all feats from progression)
        // This prevents double-granting force powers on subsequent finalize calls
        if (this.mode === 'chargen') {
          // For chargen, all feats are new
          if (progression.feats && progression.feats.length > 0) {
            updateSummary.featsAdded = [...progression.feats];
          }
        } else {
          // For levelup, only include feats selected in this session
          const previousFeats = this.data._previousFeats || [];
          const currentFeats = progression.feats || [];
          const newFeats = currentFeats.filter(f => !previousFeats.includes(f));
          if (newFeats.length > 0) {
            updateSummary.featsAdded = newFeats;
          }
        }

        await ForcePowerEngine.handleForcePowerTriggers(this.actor, updateSummary);
      } catch (e) {
        swseLogger.warn('ForcePowerEngine trigger failed (may not be available)', e);
      }

      // Emit completion event (triggers language module, etc.)
      // Use callAll to ensure all handlers run, and wrap in try-catch for safety
      try {
        const hookData = {
          actor: this.actor,
          mode: this.mode,
          level: this.actor.system.level
        };

        // Call the hook and wait for any async handlers
        // Note: Hooks.callAll is synchronous, but handlers can be async
        // We emit the hook and give time for async handlers to complete
        Hooks.callAll('swse:progression:completed', hookData);

        // Allow async handlers (like language module) time to complete
        // This is a compromise since Hooks don't natively support async await
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (hookError) {
        swseLogger.warn('Error in progression completion hooks:', hookError);
        // Don't throw - hooks failing shouldn't prevent progression completion
      }

      // -------------------------
      // Mentor Greeting Integration
      // -------------------------
      try {
        const {
          getMentorForClass,
          getMentorGreeting,
          getLevel1Class
        } = await import('../apps/mentor-dialogues.js');

        const newLevel = this.actor.system.level;

        // Determine the character's starting class → mentor identity
        const startingClass = getLevel1Class(this.actor);
        const mentor = getMentorForClass(startingClass);

        // Retrieve greeting text for this level
        const message = getMentorGreeting(mentor, newLevel, this.actor);

        // Create a styled chat card for the greeting
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          content: `
          <div class="swse-mentor-greeting">
            <div style="display:flex; gap:10px; align-items:flex-start;">
              <img src="${mentor.portrait}" width="64" height="64" style="border-radius:6px;" />
              <div>
                <h3 style="margin:0; font-size:1.2em;">${mentor.name}</h3>
                <div style="opacity:0.75; margin-bottom:4px;">${mentor.title}</div>
                <p style="margin:0;">${message}</p>
              </div>
            </div>
          </div>
          `
        });

        // Store the last greeting (useful for UI modules, recap panels, etc.)
        await this.actor.setFlag("swse", "lastMentorGreeting", {
          level: newLevel,
          class: startingClass,
          mentor: mentor.name,
          message
        });

      } catch (err) {
        swseLogger.warn("Mentor greeting failed:", err);
      }

      // -------------------------
      // Dynamic Mentor Switching (Prestige Classes)
      // -------------------------
      try {
        const { getMentorForPrestigeClass } = await import('../apps/mentor-transitions.js');
        const { setMentorOverride, getActiveMentor } = await import('../apps/mentor-dialogues.js');

        const progression = this.actor.system.progression || {};
        const classLevels = progression.classLevels || [];

        // Check the last class level to see if it's a prestige class
        if (classLevels.length > 0) {
          const lastClass = classLevels[classLevels.length - 1]?.class;
          const newMentorKey = getMentorForPrestigeClass(lastClass);

          // Only apply automatic mentor switching if:
          // 1. This is a prestige class with a mentor transition
          // 2. No manual override is already set
          if (newMentorKey) {
            const currentOverride = this.actor.getFlag("swse", "mentorOverride");

            // Only auto-switch if no manual override has been set
            if (!currentOverride) {
              await setMentorOverride(this.actor, newMentorKey);
              swseLogger.log(`Mentor switched to ${newMentorKey} for prestige class ${lastClass}`);
            }
          }
        }
      } catch (err) {
        swseLogger.warn("Mentor transition failed:", err);
      }

      // -------------------------
      // Mentor Logbook Tracking
      // -------------------------
      try {
        const {
          getActiveMentor,
          getMentorGreeting,
          getLevel1Class
        } = await import('../apps/mentor-dialogues.js');

        const newLevel = this.actor.system.level;
        const activeMentor = getActiveMentor(this.actor);
        const startingClass = getLevel1Class(this.actor);

        // Get the greeting message if available
        const message = getMentorGreeting(activeMentor, newLevel, this.actor);

        // Retrieve existing logbook or create new one
        const log = this.actor.getFlag("swse", "mentorLog") || [];

        // Add new entry to logbook
        log.push({
          level: newLevel,
          mentor: activeMentor.name,
          class: startingClass,
          message: message,
          timestamp: new Date().toISOString()
        });

        // Store updated logbook
        await this.actor.setFlag("swse", "mentorLog", log);

        // Emit hook for other systems (UI panels, journal entries, etc.)
        Hooks.callAll("swse:mentor:logUpdated", {
          actor: this.actor,
          log: log,
          lastEntry: log[log.length - 1]
        });

      } catch (err) {
        swseLogger.warn("Mentor logbook tracking failed:", err);
      }

      // Auto-recalculate derived stats after finalization
      try {
        const { recalcDerivedStats } = await import('../progression/engine/autocalc/derived-stats.js');
        await recalcDerivedStats(this.actor);
      } catch (err) {
        swseLogger.warn("Derived stats recalculation failed:", err);
      }

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

  /**
   * Dry run simulation of progression changes
   * Returns a simulated actor state without actually applying changes
   * @returns {Object} - Simulated actor object
   */
  async dryRun() {
    try {
      // Clone current actor state
      const clone = foundry.utils.deepClone(this.actor.toObject());

      // Simulate level increase
      clone.system.level = (clone.system.level ?? 0) + 1;

      // Simulate HP gain
      if (this.data.hp?.value) {
        clone.system.hp.max = (clone.system.hp?.max ?? 0) + this.data.hp.value;
      }

      // Simulate class level addition
      if (this.data.class) {
        const progression = clone.system.progression || {};
        const classLevels = progression.classLevels || [];

        // Find if class already exists
        const existingLevelsInClass = classLevels.filter(cl => cl.class === this.data.class).length;
        const levelInClass = existingLevelsInClass + 1;

        classLevels.push({
          class: this.data.class,
          level: levelInClass,
          choices: {}
        });

        clone.system.progression.classLevels = classLevels;
      }

      // Simulate feat additions
      if (this.data.feats && Array.isArray(this.data.feats)) {
        for (const featName of this.data.feats) {
          clone.items.push({
            name: featName,
            type: 'feat',
            system: { description: 'Simulated feat' }
          });
        }
      }

      // Simulate talent additions
      if (this.data.talents && Array.isArray(this.data.talents)) {
        for (const talentName of this.data.talents) {
          clone.items.push({
            name: talentName,
            type: 'talent',
            system: { description: 'Simulated talent' }
          });
        }
      }

      // Simulate ability score increases
      if (this.data.abilityIncrease) {
        const ability = this.data.abilityIncrease;
        const currentBase = clone.system.attributes?.[ability]?.base || 10;
        clone.system.attributes[ability].base = currentBase + 1;
      }

      swseLogger.log('Dry run simulation completed');

      return clone;
    } catch (err) {
      swseLogger.error('Dry run simulation failed:', err);
      throw err;
    }
  }

  /**
   * Create Item documents from progression data
   * @private
   */
  async _createProgressionItems() {
    const prog = this.actor.system.progression || {};
    const itemsToCreate = [];

    // Get starting feats (automatic proficiencies from class)
    const startingFeats = prog.startingFeats || [];
    const chosenFeats = prog.feats || [];
    const allFeats = [...startingFeats, ...chosenFeats];

    // Create feat items (if they don't already exist)
    for (const featName of allFeats) {
      const existing = this.actor.items.find(i => i.type === 'feat' && i.name === featName);
      if (!existing) {
        itemsToCreate.push({
          name: featName,
          type: 'feat',
          system: {
            description: `Granted by progression`,
            source: this.mode === 'chargen' ? 'Starting Feat' : 'Level Up'
          }
        });
      }
    }

    // Create talent items
    const talents = prog.talents || [];
    for (const talentName of talents) {
      const existing = this.actor.items.find(i => i.type === 'talent' && i.name === talentName);
      if (!existing) {
        itemsToCreate.push({
          name: talentName,
          type: 'talent',
          system: {
            description: `Granted by progression`,
            source: 'Class Talent'
          }
        });
      }
    }

    // Create items if any
    if (itemsToCreate.length > 0) {
      await this.actor.createEmbeddedDocuments('Item', itemsToCreate);
      swseLogger.log(`Created ${itemsToCreate.length} items from progression`);
    }
  }

  /* ========================
   * ACTION HANDLERS
   * ======================== */

  async _action_confirmSpecies(payload) {
    const { speciesId, abilityChoice } = payload;
    const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
    const speciesData = PROGRESSION_RULES.species[speciesId];

    if (!speciesData) {
      throw new Error(`Unknown species: ${speciesId}`);
    }

    const updates = {
      "system.progression.species": speciesId
    };

    // Apply species ability modifiers
    if (speciesData.abilityMods) {
      for (const [ability, mod] of Object.entries(speciesData.abilityMods)) {
        if (mod !== 0) {
          updates[`system.attributes.${ability}.racial`] = mod;
        }
      }
    }

    // Handle human ability choice (+2 to any one ability)
    if (speciesData.abilityChoice && abilityChoice) {
      updates[`system.attributes.${abilityChoice}.racial`] = 2;
      updates["system.progression.speciesAbilityChoice"] = abilityChoice;
    }

    // Apply size and speed
    if (speciesData.size) updates["system.size"] = speciesData.size;
    if (speciesData.speed !== undefined) updates["system.speed"] = speciesData.speed;

    await applyActorUpdateAtomic(this.actor, updates);
    this.data.species = speciesId;
    await this.completeStep("species");
  }

  async _action_confirmBackground(payload) {
    const { backgroundId } = payload;
    const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
    const backgroundData = PROGRESSION_RULES.backgrounds[backgroundId];

    if (!backgroundData) {
      throw new Error(`Unknown background: ${backgroundId}`);
    }

    await applyActorUpdateAtomic(this.actor, {
      "system.progression.background": backgroundId,
      "system.progression.backgroundTrainedSkills": backgroundData.trainedSkills || []
    });
    this.data.background = backgroundId;
    await this.completeStep("background");
  }

  async _action_confirmAbilities(payload) {
    const { method, values, increases } = payload;

    const updates = {};

    // Handle level-up ability increases (at levels 4, 8, 12, 16, 20)
    if (increases) {
      // Validate total increases (should be 2 points total)
      const totalIncreases = Object.values(increases).reduce((sum, val) => sum + val, 0);
      if (totalIncreases > 2) {
        throw new Error(`Too many ability increases: ${totalIncreases}/2`);
      }

      // Apply increases to existing base scores
      for (const [ability, increase] of Object.entries(increases)) {
        if (increase > 0) {
          const currentBase = this.actor.system.attributes?.[ability]?.base || 10;
          const newBase = currentBase + increase;
          updates[`system.attributes.${ability}.base`] = newBase;
          swseLogger.log(`Progression: Increasing ${ability} by +${increase} (${currentBase} → ${newBase})`);
        }
      }

      // Track ability increases in progression data
      updates["system.progression.abilityIncreases"] = increases;

      await applyActorUpdateAtomic(this.actor, updates);
      this.data.abilityIncreases = increases;
      // Don't complete a step for level-up ability increases
      return;
    }

    // Handle chargen ability score setting (point buy, roll, etc.)
    // Validate point buy if using that method
    if (method === "pointBuy") {
      const cost = this._calculatePointBuyCost(values);
      // Get point buy pool from house rules (default 25 for living, 20 for droids)
      const isDroid = this.actor.system?.isDroid || this.data.species === 'Droid';
      let pointBuyPool;
      if (isDroid) {
        pointBuyPool = game.settings?.get('foundryvtt-swse', 'droidPointBuyPool') ?? 20;
      } else {
        pointBuyPool = game.settings?.get('foundryvtt-swse', 'livingPointBuyPool') ??
                       game.settings?.get('foundryvtt-swse', 'pointBuyPool') ?? 25;
      }
      if (cost > pointBuyPool) {
        throw new Error(`Point buy exceeded ${pointBuyPool} points (spent ${cost})`);
      }
    }

    updates["system.progression.abilityMethod"] = method;

    // Update base ability scores
    for (const [ability, data] of Object.entries(values)) {
      const value = data.value || data;
      updates[`system.attributes.${ability}.base`] = value;
    }

    await applyActorUpdateAtomic(this.actor, updates);
    this.data.abilities = { method, values };
    await this.completeStep("attributes");
  }

  async _action_confirmClass(payload) {
    console.group("🎯 SWSE | confirmClass ACTION ENTRY");
    console.log("Payload:", payload);
    console.trace("Stack trace");
    console.groupEnd();

    swseLogger.log(`[PROGRESSION-CLASS] ======== CONFIRM CLASS START ========`);
    swseLogger.log(`[PROGRESSION-CLASS] Payload:`, payload);

    const { classId, skipPrerequisites = false } = payload;

    if (!classId) {
      swseLogger.error(`[PROGRESSION-CLASS] FATAL: classId is null/undefined`);
      throw new Error('classId is required');
    }

    swseLogger.log(`[PROGRESSION-CLASS] Loading progression rules...`);
    const { PROGRESSION_RULES, REQUIRED_PRESTIGE_LEVEL } = await import('../progression/data/progression-data.js');
    const { getClassData } = await import('../progression/utils/class-data-loader.js');

    console.group("📦 SWSE | CLASS LOAD ATTEMPT");
    console.log("PROGRESSION_RULES.classes exists:", !!PROGRESSION_RULES.classes);
    console.log("Classes available:", Object.keys(PROGRESSION_RULES.classes || {}).length);

    const pack = game.packs.get("foundryvtt-swse.classes");
    console.log("Pack exists:", !!pack);
    if (!pack) {
      console.error("❌ Class compendium not found");
    } else {
      try {
        const classes = await pack.getDocuments();
        console.log("Classes loaded from pack:", classes.length);
        console.table(classes.map(c => ({
          name: c.name,
          base: c.system?.base_class
        })));
      } catch (e) {
        console.error("Error loading pack documents:", e);
      }
    }
    console.groupEnd();

    swseLogger.log(`[PROGRESSION-CLASS] PROGRESSION_RULES.classes keys:`, Object.keys(PROGRESSION_RULES.classes || {}));

    // Try hardcoded data first (faster for core classes)
    swseLogger.log(`[PROGRESSION-CLASS] Looking up class "${classId}" in PROGRESSION_RULES...`);
    let classData = PROGRESSION_RULES.classes[classId];

    swseLogger.log(`[PROGRESSION-CLASS] Found in hardcoded data: ${!!classData}`);
    if (classData) {
      swseLogger.log(`[PROGRESSION-CLASS] Hardcoded data:`, { name: classData.name, levelProgression: !!classData.levelProgression });
    }

    // If not found, or if hardcoded data lacks levelProgression, load from compendium
    if (!classData || !classData.levelProgression) {
      swseLogger.log(`[PROGRESSION-CLASS] Loading from compendium for "${classId}"...`);
      try {
        const compendiumData = await getClassData(classId);
        swseLogger.log(`[PROGRESSION-CLASS] Compendium data found: ${!!compendiumData}`);
        if (compendiumData) {
          classData = compendiumData;
          swseLogger.log(`[PROGRESSION-CLASS] Using compendium data:`, { name: compendiumData.name, levelProgression: !!compendiumData.levelProgression });
        }
      } catch (err) {
        swseLogger.error(`[PROGRESSION-CLASS] Error loading from compendium:`, err);
      }
    }

    if (!classData) {
      swseLogger.error(`[PROGRESSION-CLASS] FATAL: Class data not found for "${classId}"`);
      throw new Error(`Unknown class: ${classId}`);
    }

    swseLogger.log(`[PROGRESSION-CLASS] Class data loaded successfully: ${classData.name}`);

    // Prerequisite validation (can be skipped for free build mode)
    if (!skipPrerequisites) {
      const progression = this.actor.system.progression || {};
      const classLevels = progression.classLevels || [];
      const currentLevel = classLevels.length;

      // Check prestige class prerequisites
      if (classData.prestigeClass) {
        // Prestige classes require minimum level (default 7)
        const requiredLevel = REQUIRED_PRESTIGE_LEVEL || 7;
        if (currentLevel < requiredLevel) {
          throw new Error(`Prestige class "${classId}" requires character level ${requiredLevel}. Current level: ${currentLevel}`);
        }

        // Check for additional prerequisites from compendium
        if (classData._raw?.prerequisites) {
          const prereqs = classData._raw.prerequisites;

          // Check BAB prerequisite
          if (prereqs.bab) {
            const { calculateBAB } = await import('../progression/data/progression-data.js');
            const currentBAB = await calculateBAB(classLevels);
            if (currentBAB < prereqs.bab) {
              throw new Error(`Prestige class "${classId}" requires BAB +${prereqs.bab}. Current BAB: +${currentBAB}`);
            }
          }

          // Check trained skills prerequisite
          if (prereqs.trainedSkills && Array.isArray(prereqs.trainedSkills)) {
            const trainedSkills = progression.trainedSkills || [];
            const missingSkills = prereqs.trainedSkills.filter(s => !trainedSkills.includes(s));
            if (missingSkills.length > 0) {
              throw new Error(`Prestige class "${classId}" requires trained skills: ${missingSkills.join(', ')}`);
            }
          }

          // Check required feats prerequisite
          if (prereqs.feats && Array.isArray(prereqs.feats)) {
            const allFeats = [...(progression.feats || []), ...(progression.startingFeats || [])];
            const missingFeats = prereqs.feats.filter(f => !allFeats.some(pf => pf.toLowerCase() === f.toLowerCase()));
            if (missingFeats.length > 0) {
              throw new Error(`Prestige class "${classId}" requires feats: ${missingFeats.join(', ')}`);
            }
          }

          // Check force sensitivity prerequisite
          if (prereqs.forceSensitive === true) {
            const hasForceSensitivity = (progression.startingFeats || []).some(f =>
              f.toLowerCase().includes('force sensitivity')
            );
            const isForceSensitiveClass = classLevels.some(cl => {
              const clData = PROGRESSION_RULES.classes[cl.class];
              return clData?.forceSensitive;
            });

            if (!hasForceSensitivity && !isForceSensitiveClass) {
              throw new Error(`Prestige class "${classId}" requires Force Sensitivity`);
            }
          }
        }
      }
    }

    const progression = this.actor.system.progression || {};
    const classLevels = Array.from(progression.classLevels || []);

    // Determine which level of THIS CLASS is being taken
    // Count how many levels of this specific class the character already has
    const existingLevelsInClass = classLevels.filter(cl => cl.class === classId).length;
    const levelInClass = existingLevelsInClass + 1;

    // Store the character's starting class for mentor system
    if (levelInClass === 1) {
      try {
        const { setLevel1Class } = await import('../apps/mentor-dialogues.js');
        await setLevel1Class(this.actor, classData.name);
      } catch (e) {
        swseLogger.warn("Failed to record starting class for mentor system:", e);
      }
    }

    // Add class level entry
    // SWSE skill trainings: At character creation, you get (class trainings + INT mod + Human bonus) skills to train
    // At level-up, you don't get new trainings (except from feats like Skill Training or INT increases)
    const intMod = this.actor.system.attributes?.int?.mod || 0;
    const isFirstCharacterLevel = classLevels.length === 0;
    const species = progression.species || '';
    const humanBonus = (species === 'Human' || species === 'human') ? 1 : 0;

    // Calculate skill trainings for this class level entry
    // Only the first character level grants skill trainings (no 4x multiplier - that's D&D 3.5e)
    const skillTrainings = isFirstCharacterLevel ? (classData.skillPoints + intMod + humanBonus) : 0;

    classLevels.push({
      class: classId,
      level: levelInClass,
      choices: {},
      skillPoints: skillTrainings
    });

    // Get level-specific features from compendium
    const levelFeatures = classData.levelProgression?.[levelInClass] || {
      features: [],
      bonusFeats: 0,
      talents: 0,
      forcePoints: 0
    };

    swseLogger.log(
      `Progression: Taking ${classId} level ${levelInClass}. ` +
      `Grants: ${levelFeatures.bonusFeats} bonus feats, ${levelFeatures.talents} talents, ` +
      `${levelFeatures.forcePoints || 0} force points`
    );

    // Calculate feat budget based on what THIS SPECIFIC LEVEL grants
    let featBudget = progression.featBudget || 0;

    // First character level: everyone gets 1 feat, plus species bonus
    if (classLevels.length === 1) {
      const speciesData = PROGRESSION_RULES.species[progression.species];
      featBudget = 1; // Everyone gets 1 feat at level 1
      if (speciesData?.bonusFeat) featBudget++; // Humans get +1
    }

    // Add bonus feats from this class level
    if (levelFeatures.bonusFeats > 0) {
      featBudget += levelFeatures.bonusFeats;
    }

    // Calculate talent budget based on what THIS SPECIFIC LEVEL grants
    let talentBudget = progression.talentBudget || 0;
    if (levelFeatures.talents > 0) {
      talentBudget += levelFeatures.talents;
    }

    // Accumulate starting feats from all classes (level 1 of each class grants automatic feats)
    const existingStartingFeats = progression.startingFeats || [];
    const classStartingFeats = (levelInClass === 1) ? (classData.startingFeats || []) : [];

    // Deduplicate starting feats with case-insensitive comparison
    // Normalize feat names by trimming whitespace
    const normalizedExisting = existingStartingFeats.map(f => f.trim());
    const normalizedNew = classStartingFeats.map(f => f.trim());

    // Use case-insensitive Set-like deduplication
    const featMap = new Map();
    for (const feat of normalizedExisting) {
      featMap.set(feat.toLowerCase(), feat);
    }
    for (const feat of normalizedNew) {
      if (!featMap.has(feat.toLowerCase())) {
        featMap.set(feat.toLowerCase(), feat);
      }
    }
    const allStartingFeats = Array.from(featMap.values());

    swseLogger.log(
      `Progression: New budgets - Feat budget: ${featBudget}, Talent budget: ${talentBudget}, ` +
      `Starting feats: [${allStartingFeats.join(', ')}]`
    );

    await applyActorUpdateAtomic(this.actor, {
      "system.progression.classLevels": classLevels,
      "system.progression.startingFeats": allStartingFeats,
      "system.progression.featBudget": featBudget,
      "system.progression.talentBudget": talentBudget
    });

    // Apply class auto-grants (starting feats/proficiencies) for level 1 only
    if (levelInClass === 1) {
      try {
        await this._applyClassAutoGrants(classId);
      } catch (err) {
        swseLogger.warn(`Failed to apply auto-grants for ${classId}:`, err);
      }
    }

    this.data.class = classId;
    await this.completeStep("class");
  }

  async _action_confirmSkills(payload) {
    swseLogger.log(`[PROGRESSION-SKILLS] ======== CONFIRM SKILLS START ========`);
    swseLogger.log(`[PROGRESSION-SKILLS] Payload:`, payload);

    const { skills } = payload;
    const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
    const { getClassData } = await import('../progression/utils/class-data-loader.js');

    // Validate skill structure
    if (!Array.isArray(skills)) {
      swseLogger.error(`[PROGRESSION-SKILLS] FATAL: skills is not an array`);
      throw new Error("Skills must be an array");
    }

    swseLogger.log(`[PROGRESSION-SKILLS] Selected skills: ${skills.length} items`, skills);

    // Calculate available skill TRAININGS (not points!)
    // SWSE uses trainings: you pick N skills to be "trained" (+5 bonus)
    // No ranks, no points per level - just trainings at character creation
    const classLevels = this.actor.system.progression?.classLevels || [];
    swseLogger.log(`[PROGRESSION-SKILLS] Class levels: ${classLevels.length}`, classLevels);

    if (classLevels.length === 0) {
      swseLogger.error(`[PROGRESSION-SKILLS] FATAL: No class levels found`);
      throw new Error("Must select a class before selecting skills");
    }

    // Get class data (try hardcoded first, then compendium)
    const firstClass = classLevels[0];
    if (!firstClass || !firstClass.class) {
      swseLogger.error(`[PROGRESSION-SKILLS] FATAL: Invalid class level data`, firstClass);
      throw new Error("Invalid class level data");
    }

    swseLogger.log(`[PROGRESSION-SKILLS] Looking up class: ${firstClass.class}`);
    let classData = PROGRESSION_RULES.classes[firstClass.class];
    swseLogger.log(`[PROGRESSION-SKILLS] Found in PROGRESSION_RULES: ${!!classData}`);

    if (!classData) {
      swseLogger.log(`[PROGRESSION-SKILLS] Loading from compendium...`);
      classData = await getClassData(firstClass.class);
      swseLogger.log(`[PROGRESSION-SKILLS] Loaded from compendium: ${!!classData}`);
    }

    if (!classData) {
      swseLogger.error(`[PROGRESSION-SKILLS] FATAL: Unknown class: ${firstClass.class}`);
      throw new Error(`Unknown class: ${firstClass.class}`);
    }

    swseLogger.log(`[PROGRESSION-SKILLS] Class data: ${classData.name}`);

    // Ensure skillPoints is a valid number
    const skillPoints = typeof classData.skillPoints === 'number' ? classData.skillPoints : 4;
    const intMod = this.actor.system.attributes?.int?.mod || 0;
    const progression = this.actor.system.progression || {};

    swseLogger.log(`[PROGRESSION-SKILLS] INT mod: ${intMod}, skill points: ${skillPoints}`);

    // Available trainings = class base + INT modifier (minimum 1)
    // (Background trainings are automatic and don't count against this)
    const availableTrainings = Math.max(1, skillPoints + intMod);
    swseLogger.log(`[PROGRESSION-SKILLS] Available trainings: ${availableTrainings}`);

    // Count background trainings (already applied, don't count against budget)
    const backgroundTrainings = Array.isArray(progression.backgroundTrainedSkills)
      ? progression.backgroundTrainedSkills
      : [];

    // Normalize skills to strings and filter out invalid entries
    const selectedSkills = skills
      .map(s => {
        if (typeof s === 'string') return s;
        if (s && typeof s === 'object') return s.key || s.name || null;
        return null;
      })
      .filter(s => s !== null && typeof s === 'string' && s.trim() !== '');

    // Count selected trainings (exclude background skills)
    const nonBackgroundSelections = selectedSkills.filter(
      skill => !backgroundTrainings.includes(skill)
    );

    if (nonBackgroundSelections.length > availableTrainings) {
      throw new Error(
        `Too many skill trainings selected: ${nonBackgroundSelections.length}/${availableTrainings} ` +
        `(${backgroundTrainings.length} background trainings are automatic)`
      );
    }

    // Store trained skills (deduplicated)
    const trainedSkills = [...new Set(selectedSkills)];

    // Check for Miraluka conditional bonus feat
    // Miraluka who have Use the Force as a trained skill gain Force Training as a bonus feat
    let updateData = {
      "system.progression.trainedSkills": trainedSkills
    };

    if (progression.species === 'Miraluka' && trainedSkills.includes('useTheForce')) {
      // Automatically grant Force Training feat (doesn't consume feat budget)
      const currentFeats = progression.feats || [];

      // Add Force Training if not already there
      if (!currentFeats.includes('Force Training')) {
        updateData["system.progression.feats"] = [...currentFeats, 'Force Training'];
      }

      swseLogger.log(`Progression: Miraluka has Use the Force trained - granting Force Training bonus feat`);
    }

    await applyActorUpdateAtomic(this.actor, updateData);
    this.data.skills = trainedSkills;
    await this.completeStep("skills");
  }

  async _action_confirmFeats(payload) {
    const { featIds } = payload;

    // Get feat budget from progression
    const featBudget = this.actor.system.progression?.featBudget || 0;
    const progression = this.actor.system.progression || {};
    const currentFeats = progression.feats || [];

    // Validate feat budget (don't count starting feats)
    if (currentFeats.length + featIds.length > featBudget) {
      throw new Error(`Too many feats selected: ${currentFeats.length + featIds.length}/${featBudget}`);
    }

    // Merge and deduplicate
    const feats = Array.from(new Set([...currentFeats, ...featIds]));

    await applyActorUpdateAtomic(this.actor, {
      "system.progression.feats": feats
    });
    this.data.feats = featIds;
    await this.completeStep("feats");
  }

  async _action_confirmTalents(payload) {
    swseLogger.log(`[PROGRESSION-TALENTS] ======== CONFIRM TALENTS START ========`);
    swseLogger.log(`[PROGRESSION-TALENTS] Payload:`, payload);

    const { talentIds } = payload;

    if (!Array.isArray(talentIds)) {
      swseLogger.error(`[PROGRESSION-TALENTS] FATAL: talentIds is not an array`);
      throw new Error("talentIds must be an array");
    }

    const progression = this.actor.system.progression || {};

    // Get talent budget from progression (set by _action_confirmClass based on level features)
    const talentBudget = progression.talentBudget || 0;
    const currentTalents = progression.talents || [];

    swseLogger.log(`[PROGRESSION-TALENTS] Talent budget: ${talentBudget}`);
    swseLogger.log(`[PROGRESSION-TALENTS] Currently selected: ${currentTalents.length}`, currentTalents);
    swseLogger.log(`[PROGRESSION-TALENTS] New talents to select: ${talentIds.length}`, talentIds);

    // Count how many NEW talents are being selected (not already in the list)
    const newTalents = talentIds.filter(id => !currentTalents.includes(id));
    const talentsAfterSelection = currentTalents.length + newTalents.length;

    swseLogger.log(`[PROGRESSION-TALENTS] After selection: ${talentsAfterSelection} talents`);

    if (talentsAfterSelection > talentBudget) {
      swseLogger.error(`[PROGRESSION-TALENTS] FATAL: Talent budget exceeded!`);
      swseLogger.error(`[PROGRESSION-TALENTS] ${talentsAfterSelection} > ${talentBudget}`);
      throw new Error(
        `Too many talents selected: ${talentsAfterSelection}/${talentBudget} ` +
        `(${currentTalents.length} already selected, trying to add ${newTalents.length})`
      );
    }

    // Merge and deduplicate
    const talents = Array.from(new Set([...currentTalents, ...talentIds]));

    swseLogger.log(`[PROGRESSION-TALENTS] Final talents array: ${talents.length}`, talents);

    await applyActorUpdateAtomic(this.actor, {
      "system.progression.talents": talents
    });
    this.data.talents = talentIds;
    await this.completeStep("talents");
    swseLogger.log(`[PROGRESSION-TALENTS] Completed step: talents`);
  }

  async _action_rollHP(payload) {
    const { roll, value } = payload;
    this.data.hp = { roll, value };
    await this.completeStep("hp");
  }

  async _action_increaseAbility(payload) {
    const { ability } = payload;
    const currentBase = this.actor.system.attributes?.[ability]?.base || 10;

    await applyActorUpdateAtomic(this.actor, {
      [`system.attributes.${ability}.base`]: currentBase + 1
    });
    this.data.abilityIncrease = ability;
    await this.completeStep("abilities");
  }

  /* ========================
   * HELPER METHODS
   * ======================== */

  /**
   * Calculate point buy cost for ability scores
   * @private
   */
  _calculatePointBuyCost(abilities) {
    const costs = {
      8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5,
      14: 6, 15: 8, 16: 10, 17: 13, 18: 16
    };

    let totalCost = 0;
    for (const [ability, data] of Object.entries(abilities)) {
      const value = data.value || data;
      if (value < 8 || value > 18) {
        throw new Error(`Invalid ability score: ${ability}=${value} (must be 8-18)`);
      }
      totalCost += costs[value] || 0;
    }

    return totalCost;
  }

  /**
   * Autoprompt required selections BEFORE modifying the actor.
   * Returns false if user still must choose something.
   * @private
   */
  async _autoPromptSelections() {
    // Talent needed
    if (this.mustChooseTalent() && !this.pending?.talents?.length) {
      this.ui?.showTalentPrompt();
      return false;
    }

    // Feat needed
    if (this.mustChooseFeat() && !this.pending?.feats?.length) {
      this.ui?.showFeatPrompt();
      return false;
    }

    // Force Power (Feat: Force Training)
    if (this.mustChooseForcePowers() && !this.pending?.forcePowers?.length) {
      this.ui?.showForcePowerPrompt();
      return false;
    }

    // Force Technique / Secret
    if (this.mustChooseForceTechnique() && !this.pending?.forceTechniques?.length) {
      this.ui?.showForceTechniquePrompt();
      return false;
    }

    if (this.mustChooseForceSecret() && !this.pending?.forceSecrets?.length) {
      this.ui?.showForceSecretPrompt();
      return false;
    }

    return true;
  }

  /**
   * Check if talent selection is required
   * @returns {boolean}
   */
  mustChooseTalent() {
    const progression = this.actor.system.progression || {};
    const talentBudget = progression.talentBudget || 0;
    const currentTalents = progression.talents || [];
    return currentTalents.length < talentBudget;
  }

  /**
   * Check if feat selection is required
   * @returns {boolean}
   */
  mustChooseFeat() {
    const progression = this.actor.system.progression || {};
    const featBudget = progression.featBudget || 0;
    const currentFeats = progression.feats || [];
    return currentFeats.length < featBudget;
  }

  /**
   * Check if force power selection is required
   * @returns {boolean}
   */
  mustChooseForcePowers() {
    return false;
  }

  /**
   * Check if force technique selection is required
   * @returns {boolean}
   */
  mustChooseForceTechnique() {
    return false;
  }

  /**
   * Check if force secret selection is required
   * @returns {boolean}
   */
  mustChooseForceSecret() {
    return false;
  }

  /**
   * Apply class auto-grants (starting feats/proficiencies)
   * @param {string} className - Name of the class
   * @private
   */
  async _applyClassAutoGrants(className) {
    const { ClassAutoGrants } = await import('../progression/engine/autogrants/class-autogrants.js');
    const { canTakeFeat } = await import('../progression/engine/validators/feat-duplication.js');

    const grants = ClassAutoGrants[className];
    if (!grants || grants.length === 0) {
      swseLogger.log(`No auto-grants for class: ${className}`);
      return;
    }

    const featPack = game.packs.get("foundryvtt-swse.feats");
    if (!featPack) {
      swseLogger.warn("Feats compendium not found, skipping auto-grants");
      return;
    }

    // Ensure pack index is loaded
    await featPack.getIndex();

    for (const name of grants) {
      // Skip if actor already has this feat
      if (!canTakeFeat(this.actor, name)) {
        swseLogger.log(`Skipping ${name} - already granted`);
        continue;
      }

      // Find feat in compendium
      const entry = featPack.index.find(i => i.name === name);
      if (!entry) {
        swseLogger.warn(`Auto-grant feat not found in compendium: ${name}`);
        continue;
      }

      try {
        // Get the feat document and create it on the actor
        const doc = await featPack.getDocument(entry._id);
        await this.actor.createEmbeddedDocuments("Item", [doc.toObject()]);
        swseLogger.log(`Auto-granted feat: ${name}`);
      } catch (err) {
        swseLogger.error(`Failed to auto-grant feat ${name}:`, err);
      }
    }
  }

  /* ========================
   * SUGGESTION ENGINE INTEGRATION
   * ======================== */

  /**
   * Get suggested feats for the character
   * Integrated with BuildIntent and other suggestion engines
   * @param {Array} feats - Array of feat objects to suggest from
   * @param {Object} pendingData - Pending selections for context
   * @returns {Promise<Array>} Feats with suggestion metadata
   */
  async getSuggestedFeats(feats, pendingData = {}) {
    if (!game.swse?.suggestions?.suggestFeats) {
      swseLogger.warn('Suggestion engines not initialized');
      return feats;
    }
    return await game.swse.suggestions.suggestFeats(feats, this.actor, pendingData);
  }

  /**
   * Get suggested talents for the character
   * Integrated with BuildIntent and other suggestion engines
   * @param {Array} talents - Array of talent objects to suggest from
   * @param {Object} pendingData - Pending selections for context
   * @returns {Promise<Array>} Talents with suggestion metadata
   */
  async getSuggestedTalents(talents, pendingData = {}) {
    if (!game.swse?.suggestions?.suggestTalents) {
      swseLogger.warn('Suggestion engines not initialized');
      return talents;
    }
    return await game.swse.suggestions.suggestTalents(talents, this.actor, pendingData);
  }

  /**
   * Get suggested classes for the character
   * Integrated with BuildIntent and other suggestion engines
   * @param {Array} classes - Array of class objects to suggest from
   * @param {Object} pendingData - Pending selections for context
   * @returns {Promise<Array>} Classes with suggestion metadata
   */
  async getSuggestedClasses(classes, pendingData = {}) {
    if (!game.swse?.suggestions?.suggestClasses) {
      swseLogger.warn('Suggestion engines not initialized');
      return classes;
    }
    return await game.swse.suggestions.suggestClasses(classes, this.actor, pendingData);
  }

  /**
   * Analyze character's build direction
   * @param {Object} pendingData - Pending selections for context
   * @returns {Promise<Object>} BuildIntent analysis
   */
  async analyzeBuildIntent(pendingData = {}) {
    if (!game.swse?.suggestions?.analyzeBuildIntent) {
      swseLogger.warn('Suggestion engines not initialized');
      return null;
    }
    return await game.swse.suggestions.analyzeBuildIntent(this.actor, pendingData);
  }

  /**
   * Get active meta synergies for the character
   * @param {Object} pendingData - Pending selections for context
   * @returns {Promise<Array>} Active synergy combinations
   */
  async getActiveSynergies(pendingData = {}) {
    if (!game.swse?.suggestions?.getActiveSynergies) {
      swseLogger.warn('Suggestion engines not initialized');
      return [];
    }
    return await game.swse.suggestions.getActiveSynergies(this.actor, pendingData);
  }

  /**
   * Generate prestige class qualification previews
   * @param {Object} pendingData - Pending selections for context
   * @returns {Promise<Array>} Path preview data
   */
  async generatePathPreviews(pendingData = {}) {
    if (!game.swse?.suggestions?.generatePathPreviews) {
      swseLogger.warn('Suggestion engines not initialized');
      return [];
    }
    return await game.swse.suggestions.generatePathPreviews(this.actor, pendingData);
  }

  /**
   * Get suggested Force options for the character
   * Integrated with BuildIntent and other suggestion engines
   * @param {Array} options - Array of Force option objects
   * @param {Object} pendingData - Pending selections for context
   * @returns {Promise<Array>} Force options with suggestion metadata
   */
  async getSuggestedForceOptions(options, pendingData = {}) {
    if (!game.swse?.suggestions?.suggestForceOptions) {
      swseLogger.warn('Force option suggestion engine not initialized');
      return options;
    }
    return await game.swse.suggestions.suggestForceOptions(options, this.actor, pendingData);
  }

  /**
   * Get the Force option catalog
   * @returns {Object} Force options catalog
   */
  getForceOptionCatalog() {
    if (!game.swse?.suggestions?.getForceOptionCatalog) {
      swseLogger.warn('Force option catalog not available');
      return {};
    }
    return game.swse.suggestions.getForceOptionCatalog();
  }

  /**
   * Suggest skills for level 1 character with attribute weighting
   * @param {Array} skills - Available skills
   * @param {Object} pendingData - Pending selections
   * @returns {Promise<Array>} Skills with suggestions
   */
  async getSuggestedLevel1Skills(skills, pendingData = {}) {
    if (!game.swse?.suggestions?.suggestLevel1Skills) {
      swseLogger.warn('Level 1 skill suggestion engine not initialized');
      return skills;
    }
    return await game.swse.suggestions.suggestLevel1Skills(skills, this.actor, pendingData);
  }

  /**
   * Get attribute increase suggestions for levels 4, 8, 12, 16, 20
   * @param {Object} pendingData - Pending selections (trained skills, etc)
   * @returns {Promise<Array>} Abilities with suggestion metadata
   */
  async getSuggestedAttributeIncreases(pendingData = {}) {
    if (!game.swse?.suggestions?.suggestAttributeIncreases) {
      swseLogger.warn('Attribute increase suggestion engine not initialized');
      return [];
    }
    return await game.swse.suggestions.suggestAttributeIncreases(this.actor, pendingData);
  }

  /**
   * Derive attribute-aware build profile
   * Identifies primary/secondary abilities and combat/force focus
   * @returns {Object} Attribute build profile
   */
  deriveAttributeBuildIntent() {
    if (!game.swse?.suggestions?.deriveAttributeBuildIntent) {
      swseLogger.warn('Progression advisor not initialized');
      return null;
    }
    return game.swse.suggestions.deriveAttributeBuildIntent(this.actor);
  }

  /**
   * Apply attribute weighting to suggestion tiers
   * Attributes influence PRIORITY, never legality
   * @param {number} baseTier - Base tier
   * @param {Object} buildIntent - Attribute profile
   * @param {string} relevantAttribute - Ability for scoring
   * @param {Object} options - Modifier options
   * @returns {number} Weighted tier
   */
  applyAttributeWeight(baseTier, buildIntent, relevantAttribute, options = {}) {
    if (!game.swse?.suggestions?.applyAttributeWeight) {
      return baseTier;
    }
    return game.swse.suggestions.applyAttributeWeight(baseTier, buildIntent, relevantAttribute, options);
  }

  /**
   * Clear cached BuildIntent for this actor when starting new progression
   */
  clearSuggestionCache() {
    if (game.swse?.suggestions?.clearBuildIntentCache) {
      game.swse.suggestions.clearBuildIntentCache(this.actor.id);
    }
  }

  // ============================================================================
  // PUBLIC API METHODS - For use by Chargen, Templates, and Level-up UI
  // ============================================================================
  // These methods provide a clean interface for external callers to interact
  // with the progression engine without needing to know about internal _action_* methods

  /**
   * PUBLIC: Confirm species selection
   * @param {string} speciesId - Compendium ID of species
   * @param {Object} options - Options (e.g., { abilityChoice: 'str' } for human)
   * @returns {Promise<void>}
   */
  async confirmSpecies(speciesId, options = {}) {
    return this.doAction('confirmSpecies', { speciesId, ...options });
  }

  /**
   * PUBLIC: Confirm background selection
   * @param {string} backgroundId - Compendium ID of background
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async confirmBackground(backgroundId, options = {}) {
    return this.doAction('confirmBackground', { backgroundId, ...options });
  }

  /**
   * PUBLIC: Confirm ability scores
   * @param {Object} abilities - Ability scores { str, dex, con, int, wis, cha }
   * @param {string} method - Method used ('preset', 'pointbuy', 'standard', 'heroic', 'dice')
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async confirmAbilities(abilities, method = 'preset', options = {}) {
    return this.doAction('confirmAbilities', { abilities, method, ...options });
  }

  /**
   * PUBLIC: Confirm class selection
   * @param {string} classId - Compendium ID of class
   * @param {Object} options - Options (e.g., { skipPrerequisites: true })
   * @returns {Promise<void>}
   */
  async confirmClass(classId, options = {}) {
    return this.doAction('confirmClass', { classId, ...options });
  }

  /**
   * PUBLIC: Confirm skill selections
   * @param {Array<string>} skills - Array of skill IDs to train
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async confirmSkills(skills, options = {}) {
    return this.doAction('confirmSkills', { skills, ...options });
  }

  /**
   * PUBLIC: Confirm multiple feats at once
   * @param {Array<string>} featIds - Array of feat IDs
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async confirmFeats(featIds, options = {}) {
    return this.doAction('confirmFeats', { featIds, ...options });
  }

  /**
   * PUBLIC: Confirm single feat (convenience method)
   * @param {string} featId - Feat ID
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async confirmFeat(featId, options = {}) {
    return this.confirmFeats([featId], options);
  }

  /**
   * PUBLIC: Confirm multiple talents at once
   * @param {Array<string>} talentIds - Array of talent IDs
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async confirmTalents(talentIds, options = {}) {
    return this.doAction('confirmTalents', { talentIds, ...options });
  }

  /**
   * PUBLIC: Confirm single talent (convenience method)
   * @param {string} talentId - Talent ID
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async confirmTalent(talentId, options = {}) {
    return this.confirmTalents([talentId], options);
  }

  /**
   * PUBLIC: Confirm mentor selection
   * @param {string} mentorClass - Mentor class/type (e.g., 'Jedi', 'Scout', 'Scoundrel', 'Noble')
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async confirmMentor(mentorClass, options = {}) {
    // Store mentor data in progression state for consistency
    await applyActorUpdateAtomic(this.actor, {
      'system.progression.mentor': mentorClass,
      'system.mentorMemory': {
        class: mentorClass,
        biases: this._getMentorBiases(mentorClass),
        dialogueHistory: []
      }
    });
    this.data.mentor = mentorClass;
  }

  /**
   * PUBLIC: Apply a template package (all template data at once)
   * @param {string} templateId - Template ID
   * @param {Object} options - Options to override template data
   * @returns {Promise<boolean>} - Success status
   */
  async applyTemplatePackage(templateId, options = {}) {
    const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
    const template = PROGRESSION_RULES.templates?.[templateId];

    if (!template) {
      throw new Error(`Unknown template: ${templateId}`);
    }

    try {
      // Apply template selections in order
      if (template.species) {
        const speciesOpt = options.species || {};
        await this.confirmSpecies(template.species, speciesOpt);
      }

      if (template.background) {
        await this.confirmBackground(template.background, options.background || {});
      }

      if (template.abilities) {
        await this.confirmAbilities(template.abilities, 'preset', options.abilities || {});
      }

      if (template.class) {
        const classOpt = { skipPrerequisites: true, ...options.class };
        await this.confirmClass(template.class, classOpt);
      }

      if (template.skills && Array.isArray(template.skills)) {
        await this.confirmSkills(template.skills, options.skills || {});
      }

      if (template.feats && Array.isArray(template.feats)) {
        await this.confirmFeats(template.feats, options.feats || {});
      }

      if (template.talents && Array.isArray(template.talents)) {
        await this.confirmTalents(template.talents, options.talents || {});
      }

      if (template.forcePowers && Array.isArray(template.forcePowers)) {
        await this.doAction('confirmForceTechniques', { techniqueIds: template.forcePowers });
      }

      if (template.mentor) {
        await this.confirmMentor(template.mentor, options.mentor || {});
      }

      return true;
    } catch (err) {
      swseLogger.error(`[PROGRESSION-TEMPLATE] Error applying template ${templateId}:`, err);
      throw err;
    }
  }

  /**
   * INTERNAL: Get mentor biases for a given mentor
   * Used by confirmMentor to populate initial biases
   * @param {string} mentorClass
   * @returns {Object} Mentor biases object
   */
  _getMentorBiases(mentorClass) {
    // This will be populated with real mentor data from the unified mentor system
    // For now, return empty object - mentor system consolidation will fill this in
    return {};
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
