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
      // Save progression state
      await this.saveStateToActor();

      // Apply derived stats (HP, defenses, BAB, etc.)
      const { ActorProgressionUpdater } = await import('../progression/engine/progression-actor-updater.js');
      await ActorProgressionUpdater.finalize(this.actor);

      // Create feat/talent/skill items from progression data
      await this._createProgressionItems();

      // Trigger force powers (if applicable)
      try {
        const { ForcePowerEngine } = await import('../progression/engine/force-power-engine.js');
        const progression = this.actor.system.progression || {};

        // Build proper updateSummary for force power triggers
        const updateSummary = {
          level: this.actor.system.level,
          mode: this.mode
        };

        // Add class levels from progression (for class-based force power grants)
        if (progression.classLevels && progression.classLevels.length > 0) {
          // Get the most recently added class level
          const latestClassLevel = progression.classLevels[progression.classLevels.length - 1];
          updateSummary.classLevelsAdded = [{
            class: latestClassLevel.class,
            level: latestClassLevel.level
          }];
        }

        // Add feats from progression (for feat-based force power grants like Force Training)
        if (progression.feats && progression.feats.length > 0) {
          updateSummary.featsAdded = [...progression.feats];
        }

        await ForcePowerEngine.handleForcePowerTriggers(this.actor, updateSummary);
      } catch (e) {
        swseLogger.warn('ForcePowerEngine trigger failed (may not be available)', e);
      }

      // Emit completion event (triggers language module, etc.)
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
          updates[`system.abilities.${ability}.racial`] = mod;
        }
      }
    }

    // Handle human ability choice (+2 to any one ability)
    if (speciesData.abilityChoice && abilityChoice) {
      updates[`system.abilities.${abilityChoice}.racial`] = 2;
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
    const { method, values } = payload;

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

    const updates = {
      "system.progression.abilityMethod": method
    };

    // Update base ability scores
    for (const [ability, data] of Object.entries(values)) {
      const value = data.value || data;
      updates[`system.abilities.${ability}.base`] = value;
    }

    await applyActorUpdateAtomic(this.actor, updates);
    this.data.abilities = { method, values };
    await this.completeStep("attributes");
  }

  async _action_confirmClass(payload) {
    const { classId } = payload;
    const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
    const { getClassData } = await import('../progression/utils/class-data-loader.js');

    // Try hardcoded data first (faster for core classes)
    let classData = PROGRESSION_RULES.classes[classId];

    // If not found, or if hardcoded data lacks levelProgression, load from compendium
    if (!classData || !classData.levelProgression) {
      const compendiumData = await getClassData(classId);
      if (compendiumData) {
        classData = compendiumData;
      }
    }

    if (!classData) {
      throw new Error(`Unknown class: ${classId}`);
    }

    const progression = this.actor.system.progression || {};
    const classLevels = Array.from(progression.classLevels || []);

    // Determine which level of THIS CLASS is being taken
    // Count how many levels of this specific class the character already has
    const existingLevelsInClass = classLevels.filter(cl => cl.class === classId).length;
    const levelInClass = existingLevelsInClass + 1;

    // Add class level entry
    // SWSE skill trainings: At character creation, you get (class trainings + INT mod + Human bonus) skills to train
    // At level-up, you don't get new trainings (except from feats like Skill Training or INT increases)
    const intMod = this.actor.system.abilities?.int?.mod || 0;
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
    const allStartingFeats = Array.from(new Set([...existingStartingFeats, ...classStartingFeats]));

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

    this.data.class = classId;
    await this.completeStep("class");
  }

  async _action_confirmSkills(payload) {
    const { skills } = payload;
    const { PROGRESSION_RULES } = await import('../progression/data/progression-data.js');
    const { getClassData } = await import('../progression/utils/class-data-loader.js');

    // Validate skill structure
    if (!Array.isArray(skills)) {
      throw new Error("Skills must be an array");
    }

    // Calculate available skill TRAININGS (not points!)
    // SWSE uses trainings: you pick N skills to be "trained" (+5 bonus)
    // No ranks, no points per level - just trainings at character creation
    const classLevels = this.actor.system.progression?.classLevels || [];
    if (classLevels.length === 0) {
      throw new Error("Must select a class before selecting skills");
    }

    // Get class data (try hardcoded first, then compendium)
    const firstClass = classLevels[0];
    let classData = PROGRESSION_RULES.classes[firstClass.class];
    if (!classData) {
      classData = await getClassData(firstClass.class);
    }

    if (!classData) {
      throw new Error(`Unknown class: ${firstClass.class}`);
    }

    const intMod = this.actor.system.abilities.int?.mod || 0;
    const progression = this.actor.system.progression || {};

    // Available trainings = class base + INT modifier
    // (Background trainings are automatic and don't count against this)
    const availableTrainings = classData.skillPoints + intMod;

    // Count background trainings (already applied, don't count against budget)
    const backgroundTrainings = progression.backgroundTrainedSkills || [];

    // Count selected trainings (exclude background skills)
    const selectedSkills = skills.map(s => typeof s === 'string' ? s : (s.key || s.name));
    const nonBackgroundSelections = selectedSkills.filter(
      skill => !backgroundTrainings.includes(skill)
    );

    if (nonBackgroundSelections.length > availableTrainings) {
      throw new Error(
        `Too many skill trainings selected: ${nonBackgroundSelections.length}/${availableTrainings} ` +
        `(${backgroundTrainings.length} background trainings are automatic)`
      );
    }

    // Normalize to simple array of skill names (trained skills)
    // No ranks - just a list of trained skills
    const trainedSkills = selectedSkills.map(s => typeof s === 'string' ? s : (s.key || s.name));

    await applyActorUpdateAtomic(this.actor, {
      "system.progression.trainedSkills": trainedSkills
    });
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
    const { talentIds } = payload;
    const progression = this.actor.system.progression || {};

    // Get talent budget from progression (set by _action_confirmClass based on level features)
    const talentBudget = progression.talentBudget || 0;
    const currentTalents = progression.talents || [];

    // Count how many NEW talents are being selected (not already in the list)
    const newTalents = talentIds.filter(id => !currentTalents.includes(id));
    const talentsAfterSelection = currentTalents.length + newTalents.length;

    if (talentsAfterSelection > talentBudget) {
      throw new Error(
        `Too many talents selected: ${talentsAfterSelection}/${talentBudget} ` +
        `(${currentTalents.length} already selected, trying to add ${newTalents.length})`
      );
    }

    // Merge and deduplicate
    const talents = Array.from(new Set([...currentTalents, ...talentIds]));

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
    const currentBase = this.actor.system.abilities?.[ability]?.base || 10;

    await applyActorUpdateAtomic(this.actor, {
      [`system.abilities.${ability}.base`]: currentBase + 1
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
