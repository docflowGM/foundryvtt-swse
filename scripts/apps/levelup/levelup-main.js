/**
 * SWSE Enhanced Level Up System - Main Application
 * Main orchestration class that coordinates all level-up modules
 * - Multi-classing support with feat/skill choices
 * - Prestige class integration
 * - Visual talent tree selection
 * - Class prerequisite checking
 * - Mentor-based narration system
 */

import { SWSELogger } from '../../utils/logger.js';
import { getMentorForClass, getMentorGreeting, getMentorGuidance, getLevel1Class, setLevel1Class } from '../mentor-dialogues.js';

// Import shared utilities
import {
  isBaseClass,
  getCharacterClasses,
  getClassLevel,
  calculateHPGain,
  calculateTotalBAB,
  calculateDefenseBonuses,
  getsAbilityIncrease,
  getsMilestoneFeat
} from './levelup-shared.js';

// Import class module functions
import {
  getAvailableClasses,
  getAvailableSpecies,
  selectSpecies,
  selectClass,
  applyPrestigeClassFeatures,
  applyClassFeatures,
  createOrUpdateClassItem,
  bindAbilitiesUI
} from './levelup-class.js';

// Import feat module functions
import {
  loadFeats,
  getsBonusFeat,
  selectBonusFeat,
  selectMulticlassFeat
} from './levelup-feats.js';

// Import talent module functions
import {
  getsTalent,
  getTalentTrees,
  loadTalentData,
  showEnhancedTreeSelection,
  showEnhancedTalentTree,
  showTalentTreeDialog,
  selectTalent
} from './levelup-talents.js';

// Import skill module functions
import {
  selectMulticlassSkill,
  applyTrainedSkills,
  checkIntModifierIncrease
} from './levelup-skills.js';

export class SWSELevelUpEnhanced extends FormApplication {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'levelup-dialog'],
      template: 'systems/swse/templates/apps/levelup.hbs',
      width: 800,
      height: 600,
      resizable: true,
      tabs: [{ navSelector: '.tabs', contentSelector: '.tab-content', initial: 'class' }],
      submitOnChange: false,
      closeOnSubmit: false,
      left: null,  // Allow Foundry to center
      top: null    // Allow Foundry to center
    });
  }

  constructor(actor, options = {}) {
    super(actor, options);
    this.actor = actor;

    // For level 0 characters, start with species selection
    const isLevel0 = (this.actor.system.level || 0) === 0;
    this.currentStep = isLevel0 ? 'species' : 'class'; // species, attributes, class, multiclass-bonus, ability-increase, feat, talent, skills, summary

    this.selectedClass = null;
    this.selectedTalent = null;
    this.selectedFeats = [];
    this.selectedSkills = [];
    this.abilityIncreases = {}; // Track ability score increases
    this.hpGain = 0;
    this.talentData = null;
    this.featData = null;
    this.selectedSpecies = null; // For level 0 characters
    this.abilityScores = {}; // For level 0 characters

    // Mentor system - initially use base class mentor, will update when class is selected
    const level1Class = getLevel1Class(this.actor);
    this.mentor = getMentorForClass(level1Class);

    // Get the class level for the starting class to show appropriate mentor greeting
    const characterClasses = getCharacterClasses(this.actor);
    const level1ClassLevel = (characterClasses[level1Class] || 0) + 1;
    this.mentorGreeting = getMentorGreeting(this.mentor, level1ClassLevel, this.actor);
    this.currentMentorClass = level1Class; // Track which class's mentor we're showing
  }

  get title() {
    return `Level Up ${this.actor.name} (${this.actor.system.level} → ${this.actor.system.level + 1})`;
  }

  async getData() {
    const data = await super.getData();

    data.actor = this.actor;
    data.currentLevel = this.actor.system.level;
    data.newLevel = this.actor.system.level + 1;
    data.currentStep = this.currentStep;
    data.isLevel0 = this.actor.system.level === 0;

    // For level 0 characters, get available species
    if (data.isLevel0) {
      data.availableSpecies = await getAvailableSpecies();
      data.selectedSpecies = this.selectedSpecies;
      data.abilityScores = this.abilityScores;
    }

    // Get available classes
    const pendingData = {
      selectedFeats: this.selectedFeats,
      selectedClass: this.selectedClass,
      abilityIncreases: this.abilityIncreases,
      selectedSkills: this.selectedSkills
    };
    data.availableClasses = await getAvailableClasses(this.actor, pendingData);

    // Get character's current classes
    data.characterClasses = getCharacterClasses(this.actor);

    // Multi-class bonus choice from houserules
    data.multiclassBonusChoice = game.settings.get("swse", "multiclassBonusChoice");

    // Talent tree restriction from houserules
    data.talentTreeRestriction = game.settings.get("swse", "talentTreeRestriction");

    // Ability increase settings
    data.abilityIncreaseMethod = game.settings.get("swse", "abilityIncreaseMethod") || "flexible";
    data.getsAbilityIncrease = getsAbilityIncrease(data.newLevel);
    data.abilityIncreases = this.abilityIncreases;

    // Feat selection
    data.getsBonusFeat = getsBonusFeat(this.selectedClass, this.actor);
    if (data.getsBonusFeat && !this.featData) {
      // Load feats asynchronously if needed
      await this._loadFeats();
    }
    // Only show feats the character qualifies for
    data.availableFeats = (this.featData || []).filter(f => f.isQualified);
    data.allFeats = this.featData || [];  // For debugging/info
    data.selectedFeats = this.selectedFeats;

    // Mentor data
    data.mentor = this.mentor;
    data.mentorGreeting = this.mentorGreeting;
    data.mentorGuidance = this._getMentorGuidanceForCurrentStep();

    // If class selected, get talent trees
    if (this.selectedClass) {
      data.selectedClass = this.selectedClass;
      data.talentTrees = await getTalentTrees(this.selectedClass, this.actor);
    }

    return data;
  }

  /**
   * Get mentor guidance for the current step
   * @returns {string}
   */
  _getMentorGuidanceForCurrentStep() {
    // Special guidance for level 0 character creation steps
    if (this.currentStep === 'species') {
      return "Lets take a look at yer, What species are ye?";
    }
    if (this.currentStep === 'attributes') {
      return "Lets see what kinda build we're working with.";
    }

    const guidanceMap = {
      'class': 'class',
      'multiclass-bonus': 'multiclass',
      'ability-increase': 'ability',
      'talent': 'talent',
      'skills': 'skill',
      'summary': 'hp'
    };

    const choiceType = guidanceMap[this.currentStep] || 'class';
    return getMentorGuidance(this.mentor, choiceType);
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Level 0 character creation steps
    html.find('.select-species-btn').click(this._onSelectSpecies.bind(this));
    html.find('.confirm-attributes-btn').click(this._onConfirmAttributes.bind(this));

    // Class selection
    html.find('.select-class-btn').click(this._onSelectClass.bind(this));

    // Multiclass bonus selection
    html.find('.select-feat-btn').click(this._onSelectMulticlassFeat.bind(this));
    html.find('.select-skill-btn').click(this._onSelectMulticlassSkill.bind(this));

    // Ability score increases
    html.find('.ability-increase-btn').click(this._onAbilityIncrease.bind(this));

    // Bonus feat selection
    html.find('.select-bonus-feat').click(this._onSelectBonusFeat.bind(this));

    // Talent tree selection
    html.find('.select-talent-tree').click(this._onSelectTalentTree.bind(this));

    // Navigation
    html.find('.next-step').click(this._onNextStep.bind(this));
    html.find('.prev-step').click(this._onPrevStep.bind(this));

    // Final level up
    html.find('.complete-levelup').click(this._onCompleteLevelUp.bind(this));

    // Bind ability score UI for level 0 attributes step
    if (this.currentStep === 'attributes') {
      bindAbilitiesUI(html[0]);
    }
  }

  // ========================================
  // FEAT LOADING AND SELECTION
  // ========================================

  async _loadFeats() {
    const pendingData = {
      selectedFeats: this.selectedFeats,
      selectedClass: this.selectedClass,
      abilityIncreases: this.abilityIncreases,
      selectedSkills: this.selectedSkills
    };

    this.featData = await loadFeats(this.actor, this.selectedClass, pendingData);
  }

  async _onSelectBonusFeat(event) {
    event.preventDefault();
    const featId = event.currentTarget.dataset.featId;

    const feat = selectBonusFeat(featId, this.featData, this.selectedFeats);
    if (feat) {
      this.selectedFeats.push(feat);
      ui.notifications.info(`Selected feat: ${feat.name}`);
      await this.render();
    }
  }

  // ========================================
  // LEVEL 0 CHARACTER CREATION HANDLERS
  // ========================================

  /**
   * Handle species selection for level 0 characters
   * @param {Event} event - Click event
   */
  async _onSelectSpecies(event) {
    event.preventDefault();
    const speciesId = event.currentTarget.dataset.speciesId;
    const speciesName = event.currentTarget.dataset.speciesName;

    const speciesDoc = await selectSpecies(speciesId, speciesName);
    if (speciesDoc) {
      this.selectedSpecies = speciesDoc;
      ui.notifications.info(`Species selected: ${speciesName}`);

      // Move to attributes step
      this.currentStep = 'attributes';
      this.render();
    }
  }

  /**
   * Handle attributes confirmation for level 0 characters
   * @param {Event} event - Click event
   */
  async _onConfirmAttributes(event) {
    event.preventDefault();

    // Gather ability scores from the form
    const form = event.currentTarget.closest('section');
    const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    this.abilityScores = {};

    for (const ability of abilities) {
      const input = form.querySelector(`[name="ability_${ability}"]`);
      if (input) {
        this.abilityScores[ability] = parseInt(input.value) || 10;
      }
    }

    SWSELogger.log(`SWSE LevelUp | Confirmed ability scores:`, this.abilityScores);

    // Move to class selection step
    this.currentStep = 'class';
    ui.notifications.info("Ability scores confirmed");
    this.render();
  }

  // ========================================
  // CLASS SELECTION
  // ========================================

  async _onSelectClass(event) {
    event.preventDefault();
    const classId = event.currentTarget.dataset.classId;

    const context = {
      mentor: this.mentor,
      currentMentorClass: this.currentMentorClass,
      mentorGreeting: this.mentorGreeting
    };

    const classDoc = await selectClass(classId, this.actor, context);
    if (!classDoc) return;

    this.selectedClass = classDoc;
    this.mentor = context.mentor;
    this.currentMentorClass = context.currentMentorClass;
    this.mentorGreeting = context.mentorGreeting;

    // Calculate HP gain
    const newLevel = this.actor.system.level + 1;
    this.hpGain = calculateHPGain(classDoc, this.actor, newLevel);

    // Determine next step
    const currentClasses = getCharacterClasses(this.actor);
    const isMulticlassing = Object.keys(currentClasses).length > 0 && !currentClasses[classDoc.name];
    const isBase = isBaseClass(classDoc.name);
    const getsAbilityIncr = getsAbilityIncrease(newLevel);
    const getsBonusFt = getsBonusFeat(classDoc, this.actor);
    const getsTal = getsTalent(classDoc, this.actor);

    if (isMulticlassing && isBase) {
      // Taking a new base class - offer multiclass bonus
      this.currentStep = 'multiclass-bonus';
    } else if (getsAbilityIncr) {
      // This level grants ability score increases
      this.currentStep = 'ability-increase';
    } else if (getsBonusFt) {
      // This level grants a bonus feat from this class
      this.currentStep = 'feat';
    } else if (getsTal) {
      // This level grants a talent from this class
      this.currentStep = 'talent';
    } else {
      // No special selections - go to summary
      this.currentStep = 'summary';
    }

    // Apply prestige class level 1 features if applicable
    if (!isBase) {
      await applyPrestigeClassFeatures(classDoc);
    }

    this.render();
  }

  // ========================================
  // MULTICLASS BONUS
  // ========================================

  async _onSelectMulticlassFeat(event) {
    event.preventDefault();
    const featId = event.currentTarget.dataset.featId;

    const feat = await selectMulticlassFeat(featId);
    if (feat) {
      this.selectedFeats = [feat];
      ui.notifications.info(`Selected feat: ${feat.name}`);
      await this.render();
    }
  }

  async _onSelectMulticlassSkill(event) {
    event.preventDefault();
    const skillName = event.currentTarget.dataset.skill;

    const skill = selectMulticlassSkill(skillName);
    this.selectedSkills = [skill];
    ui.notifications.info(`Selected trained skill: ${skillName}`);
    await this.render();
  }

  // ========================================
  // ABILITY SCORE INCREASES
  // ========================================

  _onAbilityIncrease(event) {
    event.preventDefault();
    const ability = event.currentTarget.dataset.ability;
    const abilityIncreaseMethod = game.settings.get("swse", "abilityIncreaseMethod");

    if (!this.abilityIncreases[ability]) {
      this.abilityIncreases[ability] = 0;
    }

    // Calculate total points allocated
    const totalAllocated = Object.values(this.abilityIncreases).reduce((sum, val) => sum + val, 0);

    if (abilityIncreaseMethod === "flexible") {
      // Flexible: Can do 1+1 or 2 to one attribute
      if (totalAllocated >= 2) {
        ui.notifications.warn("You've already allocated 2 ability points!");
        return;
      }

      // Check if adding this point would exceed 2 total
      if (this.abilityIncreases[ability] >= 2) {
        ui.notifications.warn("You can't add more than 2 points to a single ability!");
        return;
      }

      this.abilityIncreases[ability]++;
      ui.notifications.info(`+1 to ${ability.toUpperCase()} (Total increases: ${totalAllocated + 1}/2)`);

    } else {
      // Standard: Must allocate 1 point to 2 different attributes
      if (totalAllocated >= 2) {
        ui.notifications.warn("You've already allocated 2 ability points!");
        return;
      }

      if (this.abilityIncreases[ability] >= 1) {
        ui.notifications.warn("Standard method: You must allocate to 2 different attributes!");
        return;
      }

      this.abilityIncreases[ability]++;
      ui.notifications.info(`+1 to ${ability.toUpperCase()} (Total increases: ${totalAllocated + 1}/2)`);
    }

    this.render();
  }

  // ========================================
  // TALENT TREE SELECTION
  // ========================================

  async _onSelectTalentTree(event) {
    event.preventDefault();

    // If clicking on a tree name directly (old behavior)
    if (event.currentTarget.dataset.tree) {
      const treeName = event.currentTarget.dataset.tree;
      await this._showEnhancedTalentTree(treeName);
      return;
    }

    // Show enhanced tree selection interface
    await this._showEnhancedTreeSelection();
  }

  /**
   * Show enhanced tree selection interface with hover previews
   */
  async _showEnhancedTreeSelection() {
    // Load talent data if not already loaded
    if (!this.talentData) {
      this.talentData = await loadTalentData();
    }

    await showEnhancedTreeSelection(
      this.selectedClass,
      this.actor,
      this.talentData,
      (talentName) => this._selectTalent(talentName)
    );
  }

  /**
   * Show enhanced talent tree for a specific tree
   */
  async _showEnhancedTalentTree(treeName) {
    // Load talent data if not already loaded
    if (!this.talentData) {
      this.talentData = await loadTalentData();
    }

    await showEnhancedTalentTree(
      treeName,
      this.talentData,
      this.actor,
      (talentName) => this._selectTalent(talentName)
    );
  }

  _selectTalent(talentName) {
    const pendingData = {
      selectedFeats: this.selectedFeats,
      selectedClass: this.selectedClass,
      abilityIncreases: this.abilityIncreases,
      selectedSkills: this.selectedSkills,
      selectedTalents: this.selectedTalent ? [this.selectedTalent] : []
    };

    const talent = selectTalent(talentName, this.talentData, this.actor, pendingData);
    if (talent) {
      this.selectedTalent = talent;
      ui.notifications.info(`Selected talent: ${talentName}`);
    }
  }

  // ========================================
  // NAVIGATION
  // ========================================

  _onNextStep() {
    const newLevel = this.actor.system.level + 1;
    const getsAbilityIncr = getsAbilityIncrease(newLevel);
    const getsBonusFt = getsBonusFeat(this.selectedClass, this.actor);
    const getsTal = getsTalent(this.selectedClass, this.actor);

    // Determine next step dynamically based on what's applicable
    switch (this.currentStep) {
      case 'class':
        this.currentStep = 'multiclass-bonus'; // This won't show if not multiclassing
        break;
      case 'multiclass-bonus':
        if (getsAbilityIncr) {
          this.currentStep = 'ability-increase';
        } else if (getsBonusFt) {
          this.currentStep = 'feat';
        } else if (getsTal) {
          this.currentStep = 'talent';
        } else {
          this.currentStep = 'summary';
        }
        break;
      case 'ability-increase':
        // Check if they've allocated all 2 points
        const totalAllocated = Object.values(this.abilityIncreases).reduce((sum, val) => sum + val, 0);
        if (totalAllocated < 2) {
          ui.notifications.warn("You must allocate all 2 ability points before continuing!");
          return;
        }
        if (getsBonusFt) {
          this.currentStep = 'feat';
        } else if (getsTal) {
          this.currentStep = 'talent';
        } else {
          this.currentStep = 'summary';
        }
        break;
      case 'feat':
        // Check if they selected a feat
        if (this.selectedFeats.length === 0) {
          ui.notifications.warn("You must select a feat before continuing!");
          return;
        }
        if (getsTal) {
          this.currentStep = 'talent';
        } else {
          this.currentStep = 'summary';
        }
        break;
      case 'talent':
        // Check if they selected a talent (if required)
        if (!this.selectedTalent) {
          ui.notifications.warn("You must select a talent before continuing!");
          return;
        }
        this.currentStep = 'summary';
        break;
    }

    this.render();
  }

  _onPrevStep() {
    const newLevel = this.actor.system.level + 1;
    const getsAbilityIncr = getsAbilityIncrease(newLevel);
    const getsBonusFt = getsBonusFeat(this.selectedClass, this.actor);
    const getsTal = getsTalent(this.selectedClass, this.actor);
    const characterClasses = getCharacterClasses(this.actor);
    const isMulticlassing = Object.keys(characterClasses).length > 0 && !characterClasses[this.selectedClass?.name];
    const isBase = this.selectedClass ? isBaseClass(this.selectedClass.name) : false;

    // Go back one step dynamically
    switch (this.currentStep) {
      case 'multiclass-bonus':
        this.currentStep = 'class';
        break;
      case 'ability-increase':
        if (isMulticlassing && isBase) {
          this.currentStep = 'multiclass-bonus';
        } else {
          this.currentStep = 'class';
        }
        break;
      case 'feat':
        if (getsAbilityIncr) {
          this.currentStep = 'ability-increase';
        } else if (isMulticlassing && isBase) {
          this.currentStep = 'multiclass-bonus';
        } else {
          this.currentStep = 'class';
        }
        break;
      case 'talent':
        if (getsBonusFt) {
          this.currentStep = 'feat';
        } else if (getsAbilityIncr) {
          this.currentStep = 'ability-increase';
        } else if (isMulticlassing && isBase) {
          this.currentStep = 'multiclass-bonus';
        } else {
          this.currentStep = 'class';
        }
        break;
      case 'summary':
        if (getsTal) {
          this.currentStep = 'talent';
        } else if (getsBonusFt) {
          this.currentStep = 'feat';
        } else if (getsAbilityIncr) {
          this.currentStep = 'ability-increase';
        } else if (isMulticlassing && isBase) {
          this.currentStep = 'multiclass-bonus';
        } else {
          this.currentStep = 'class';
        }
        break;
    }

    this.render();
  }

  // ========================================
  // COMPLETE LEVEL UP
  // ========================================

  async _onCompleteLevelUp(event) {
    event.preventDefault();

    try {
      // If this is level 1, save the starting class for mentor system
      if (this.actor.system.level === 1) {
        await setLevel1Class(this.actor, this.selectedClass.name);
      }

      // Create or update class item
      const classLevel = await createOrUpdateClassItem(this.selectedClass, this.actor);

      // Add selected talent if any
      if (this.selectedTalent) {
        const talentObject = typeof this.selectedTalent.toObject === 'function'
          ? this.selectedTalent.toObject()
          : this.selectedTalent;
        await this.actor.createEmbeddedDocuments("Item", [talentObject]);
      }

      // Add multiclass feats if any
      if (this.selectedFeats.length > 0) {
        const featObjects = this.selectedFeats.map(f =>
          typeof f.toObject === 'function' ? f.toObject() : f
        );
        await this.actor.createEmbeddedDocuments("Item", featObjects);
      }

      // Check for milestone feat at levels 3, 6, 9, 12, 15, 18
      const newLevel = this.actor.system.level + 1;
      const getMilestoneFt = getsMilestoneFeat(newLevel);
      if (getMilestoneFt) {
        ui.notifications.info(`Level ${newLevel}! You gain a bonus general feat.`);
        SWSELogger.log(`SWSE LevelUp | Level ${newLevel} milestone - bonus general feat granted`);
      }

      // Store old modifiers before applying ability increases
      const oldIntMod = this.actor.system.abilities.int?.mod || 0;
      const oldConMod = this.actor.system.abilities.con?.mod || 0;

      // Apply ability score increases and trained skills
      const updates = {};

      // Update trained skills if selected
      if (this.selectedSkills.length > 0) {
        this.selectedSkills.forEach(skill => {
          updates[`system.skills.${skill}.trained`] = true;
        });
      }

      // Apply ability score increases if any
      let intIncreased = false;
      let conIncreased = false;
      if (Object.keys(this.abilityIncreases).length > 0) {
        for (const [ability, increase] of Object.entries(this.abilityIncreases)) {
          if (increase > 0) {
            const currentBase = this.actor.system.abilities[ability].base || 10;
            const newBase = currentBase + increase;
            updates[`system.abilities.${ability}.base`] = newBase;
            SWSELogger.log(`SWSE LevelUp | Increasing ${ability} by +${increase} (${currentBase} → ${newBase})`);

            // Track if INT or CON increased
            if (ability === 'int') intIncreased = true;
            if (ability === 'con') conIncreased = true;
          }
        }
      }

      // Update actor level and HP
      let totalHPGain = this.hpGain;
      updates["system.level"] = newLevel;

      // Apply updates first so we can calculate new modifiers
      await this.actor.update(updates);

      // Now check if modifiers actually increased
      const newIntMod = this.actor.system.abilities.int?.mod || 0;
      const newConMod = this.actor.system.abilities.con?.mod || 0;

      let bonusSkillGranted = false;
      let retroactiveHPGain = 0;

      // If INT modifier increased, grant additional trained skill
      if (intIncreased) {
        bonusSkillGranted = checkIntModifierIncrease(this.actor, oldIntMod, newIntMod, newLevel);
      }

      // If CON modifier increased, grant retroactive HP
      if (conIncreased && newConMod > oldConMod) {
        const modIncrease = newConMod - oldConMod;
        retroactiveHPGain = newLevel * modIncrease;
        totalHPGain += retroactiveHPGain;
        SWSELogger.log(`SWSE LevelUp | CON modifier increased from ${oldConMod} to ${newConMod} - granting ${retroactiveHPGain} retroactive HP`);
        ui.notifications.info(`Constitution increased! You gain ${retroactiveHPGain} retroactive HP!`);
      }

      // Update HP with any retroactive gains
      const newHPMax = this.actor.system.hp.max + totalHPGain;
      const newHPValue = this.actor.system.hp.value + totalHPGain;

      await this.actor.update({
        "system.hp.max": newHPMax,
        "system.hp.value": newHPValue
      });

      // Apply class features for this level
      await applyClassFeatures(this.selectedClass, classLevel, this.actor);

      // Recalculate BAB and defense bonuses from all class items
      const totalBAB = calculateTotalBAB(this.actor);
      const defenseBonuses = calculateDefenseBonuses(this.actor);

      SWSELogger.log(`SWSE LevelUp | Updating BAB to ${totalBAB}`);
      SWSELogger.log(`SWSE LevelUp | Updating defense bonuses: Fort +${defenseBonuses.fortitude}, Ref +${defenseBonuses.reflex}, Will +${defenseBonuses.will}`);

      await this.actor.update({
        "system.bab": totalBAB,
        "system.defenses.fortitude.classBonus": defenseBonuses.fortitude,
        "system.defenses.reflex.classBonus": defenseBonuses.reflex,
        "system.defenses.will.classBonus": defenseBonuses.will
      });

      // Build ability increases text
      let abilityText = '';
      if (Object.keys(this.abilityIncreases).length > 0) {
        const increases = Object.entries(this.abilityIncreases)
          .filter(([_, val]) => val > 0)
          .map(([ability, val]) => `${ability.toUpperCase()} +${val}`)
          .join(', ');
        abilityText = `<p><strong>Ability Increases:</strong> ${increases}</p>`;

        // Add bonus messages
        if (bonusSkillGranted) {
          abilityText += `<p><em>INT modifier increased! May train 1 additional skill.</em></p>`;
        }
        if (retroactiveHPGain > 0) {
          abilityText += `<p><em>CON modifier increased! Gained ${retroactiveHPGain} retroactive HP.</em></p>`;
        }
      }

      // Build HP gain text
      let hpGainText = `${this.hpGain}`;
      if (retroactiveHPGain > 0) {
        hpGainText += ` (+ ${retroactiveHPGain} from CON increase)`;
      }

      // Create chat message with mentor narration
      const chatContent = `
        <div class="swse level-up-message">
          <h3><i class="fas fa-level-up-alt"></i> Level Up!</h3>
          <div class="mentor-narration" style="background: rgba(0,0,0,0.3); padding: 0.5rem; border-left: 3px solid #00d9ff; margin: 0.5rem 0; font-style: italic;">
            <strong>${this.mentor.name}, ${this.mentor.title}:</strong><br>
            "${this.mentorGreeting}"
          </div>
          <p><strong>${this.actor.name}</strong> advanced to level <strong>${newLevel}</strong>!</p>
          <p><strong>Class:</strong> ${this.selectedClass.name}</p>
          <p><strong>HP Gained:</strong> ${hpGainText}</p>
          <p><strong>New HP Total:</strong> ${newHPMax}</p>
          ${abilityText}
          ${this.selectedTalent ? `<p><strong>Talent:</strong> ${this.selectedTalent.name}</p>` : ''}
          ${this.selectedFeats.length > 0 ? `<p><strong>Feat:</strong> ${this.selectedFeats.map(f => f.name).join(', ')}</p>` : ''}
          ${getMilestoneFt ? `<p><strong>Milestone Feat:</strong> Gain 1 bonus general feat!</p>` : ''}
        </div>
      `;

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        content: chatContent,
        type: CONST.CHAT_MESSAGE_TYPES.OTHER
      });

      ui.notifications.success(`${this.actor.name} leveled up to level ${newLevel}!`);

      // Close dialog and re-render actor sheet to show changes
      this.close();
      this.actor.sheet.render(true);

    } catch (err) {
      SWSELogger.error("SWSE LevelUp | Error completing level up:", err);
      ui.notifications.error("Failed to complete level up. See console for details.");
    }
  }

  async _updateObject(event, formData) {
    // Not used - level up is handled by _onCompleteLevelUp
  }
}
