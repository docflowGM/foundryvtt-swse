/**
 * SWSE Enhanced Level Up System
 * - Multi-classing support with feat/skill choices
 * - Prestige class integration
 * - Visual talent tree selection
 * - Class prerequisite checking
 * - Mentor-based narration system
 */

import { getMentorForClass, getMentorGreeting, getMentorGuidance, getLevel1Class, setLevel1Class } from './mentor-dialogues.js';
import { PrerequisiteValidator } from '../utils/prerequisite-validator.js';

export class SWSELevelUpEnhanced extends FormApplication {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'levelup-dialog'],
      template: 'systems/swse/templates/apps/levelup.hbs',
      width: 800,
      height: 600,
      tabs: [{ navSelector: '.tabs', contentSelector: '.tab-content', initial: 'class' }],
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  constructor(actor, options = {}) {
    super(actor, options);
    this.actor = actor;
    this.currentStep = 'class'; // class, multiclass-bonus, ability-increase, feat, talent, skills, summary
    this.selectedClass = null;
    this.selectedTalent = null;
    this.selectedFeats = [];
    this.selectedSkills = [];
    this.abilityIncreases = {}; // Track ability score increases
    this.hpGain = 0;
    this.talentData = null;
    this.featData = null;

    // Mentor system - initially use base class mentor, will update when class is selected
    const level1Class = getLevel1Class(this.actor);
    this.mentor = getMentorForClass(level1Class);

    // Get the class level for the starting class to show appropriate mentor greeting
    const characterClasses = this._getCharacterClasses();
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

    // Get available classes
    data.availableClasses = await this._getAvailableClasses();

    // Get character's current classes
    data.characterClasses = this._getCharacterClasses();

    // Multi-class bonus choice from houserules
    data.multiclassBonusChoice = game.settings.get("swse", "multiclassBonusChoice");

    // Talent tree restriction from houserules
    data.talentTreeRestriction = game.settings.get("swse", "talentTreeRestriction");

    // Ability increase settings
    data.abilityIncreaseMethod = game.settings.get("swse", "abilityIncreaseMethod") || "flexible";
    data.getsAbilityIncrease = this._getsAbilityIncrease();
    data.abilityIncreases = this.abilityIncreases;

    // Feat selection
    data.getsBonusFeat = this._getsBonusFeat();
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
      data.talentTrees = await this._getTalentTrees(this.selectedClass);
    }

    return data;
  }

  /**
   * Get mentor guidance for the current step
   * @returns {string}
   */
  _getMentorGuidanceForCurrentStep() {
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

  /**
   * Check if the new level grants an ability score increase
   * @returns {boolean}
   */
  _getsAbilityIncrease() {
    const newLevel = this.actor.system.level + 1;
    return [4, 8, 12, 16, 20].includes(newLevel);
  }

  /**
   * Check if the new level grants a bonus feat
   * In SWSE, characters get a feat at every odd level (1, 3, 5, 7, 9, 11, 13, 15, 17, 19)
   * @returns {boolean}
   */
  _getsBonusFeat() {
    const newLevel = this.actor.system.level + 1;
    return newLevel % 2 === 1; // Odd levels grant feats
  }

  /**
   * Check if the new level grants a milestone feat
   * @returns {boolean}
   */
  _getsMilestoneFeat() {
    const newLevel = this.actor.system.level + 1;
    return [3, 6, 9, 12, 15, 18].includes(newLevel);
  }

  activateListeners(html) {
    super.activateListeners(html);

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
  }

  // ========================================
  // FEAT LOADING AND SELECTION
  // ========================================

  async _loadFeats() {
    try {
      const featPack = game.packs.get('swse.feats');
      if (!featPack) {
        this.featData = [];
        return;
      }

      const allFeats = await featPack.getDocuments();
      const featObjects = allFeats.map(f => f.toObject());

      // Prepare pending data for prerequisite checking
      const pendingData = {
        selectedFeats: this.selectedFeats,
        selectedClass: this.selectedClass,
        abilityIncreases: this.abilityIncreases,
        selectedSkills: this.selectedSkills
      };

      // Filter feats based on prerequisites
      this.featData = PrerequisiteValidator.filterQualifiedFeats(featObjects, this.actor, pendingData);

      console.log(`SWSE LevelUp | Loaded ${this.featData.length} feats, ${this.featData.filter(f => f.isQualified).length} qualified`);
    } catch (err) {
      console.error("SWSE LevelUp | Failed to load feats:", err);
      this.featData = [];
    }
  }

  async _onSelectBonusFeat(event) {
    event.preventDefault();
    const featId = event.currentTarget.dataset.featId;

    const feat = this.featData.find(f => f._id === featId);
    if (feat && !this.selectedFeats.find(f => f._id === featId)) {
      this.selectedFeats.push(feat);
      ui.notifications.info(`Selected feat: ${feat.name}`);
      await this.render();
    }
  }

  // ========================================
  // CLASS SELECTION
  // ========================================

  async _getAvailableClasses() {
    const classPack = game.packs.get('swse.classes');
    if (!classPack) return [];

    const allClasses = await classPack.getDocuments();
    const availableClasses = [];

    // Check prerequisites for each class
    for (const classDoc of allClasses) {
      if (this._meetsPrerequisites(classDoc)) {
        availableClasses.push({
          id: classDoc._id,
          name: classDoc.name,
          system: classDoc.system,
          isBase: this._isBaseClass(classDoc.name),
          isPrestige: !this._isBaseClass(classDoc.name)
        });
      }
    }

    return availableClasses;
  }

  _isBaseClass(className) {
    const baseClasses = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier'];
    return baseClasses.includes(className);
  }

  _meetsPrerequisites(classDoc) {
    // Base classes have no prerequisites
    if (this._isBaseClass(classDoc.name)) return true;

    // Hardcoded prerequisites for prestige classes (from SWSE core rules)
    const prestigePrerequisites = this._getPrestigeClassPrerequisites(classDoc.name);

    // If we have hardcoded prerequisites, use those
    if (prestigePrerequisites) {
      const check = PrerequisiteValidator.checkClassPrerequisites(
        { system: { prerequisites: prestigePrerequisites } },
        this.actor,
        {
          selectedFeats: this.selectedFeats,
          selectedClass: this.selectedClass,
          abilityIncreases: this.abilityIncreases,
          selectedSkills: this.selectedSkills
        }
      );
      return check.valid;
    }

    // Fall back to checking classDoc prerequisites
    const pendingData = {
      selectedFeats: this.selectedFeats,
      selectedClass: this.selectedClass,
      abilityIncreases: this.abilityIncreases,
      selectedSkills: this.selectedSkills
    };

    const check = PrerequisiteValidator.checkClassPrerequisites(classDoc, this.actor, pendingData);
    return check.valid;
  }

  /**
   * Get hardcoded prerequisites for prestige classes
   * Based on SWSE Core Rulebook and supplements
   * @param {string} className - Name of the prestige class
   * @returns {string|null} - Prerequisite string or null
   */
  _getPrestigeClassPrerequisites(className) {
    const prerequisites = {
      // Core Rulebook Prestige Classes
      "Ace Pilot": "Trained in Pilot, BAB +2",
      "Bounty Hunter": "Trained in Gather Information, BAB +3",
      "Crime Lord": "Trained in Deception, Trained in Persuasion",
      "Elite Trooper": "Armor Proficiency (Light), Armor Proficiency (Medium), BAB +5",
      "Force Adept": "Force Sensitive, Trained in Use the Force",
      "Force Disciple": "Force Sensitive, Trained in Use the Force, BAB +1",
      "Gunslinger": "Weapon Proficiency (Pistols), BAB +3",
      "Jedi Knight": "Jedi 7, Force Sensitive, Trained in Use the Force, BAB +5",
      "Jedi Master": "Jedi Knight 5, Force Sensitive, Trained in Use the Force, BAB +10",
      "Officer": "Trained in Knowledge (Tactics), BAB +2",
      "Sith Apprentice": "Force Sensitive, Trained in Use the Force, Dark Side Score 1",
      "Sith Lord": "Sith Apprentice 5, Force Sensitive, BAB +7, Dark Side Score 5",

      // Knights of the Old Republic Campaign Guide
      "Sith Assassin": "Force Sensitive, Trained in Stealth, Trained in Use the Force",
      "Sith Marauder": "Force Sensitive, Trained in Use the Force, BAB +5",

      // Legacy Era Campaign Guide
      "Imperial Knight": "Force Sensitive, Trained in Use the Force, BAB +3",
      "Sith Trooper": "Armor Proficiency (Light), Weapon Proficiency (Rifles), BAB +3",

      // The Force Unleashed Campaign Guide
      "Sith Acolyte": "Force Sensitive, Trained in Use the Force",

      // Scum and Villainy
      "Charlatan": "Trained in Deception, Trained in Persuasion",
      "Enforcer": "BAB +2",
      "Gambler": "Trained in Deception, Trained in Perception",
      "Saboteur": "Trained in Mechanics, Trained in Stealth",

      // Clone Wars Campaign Guide
      "Clone Commander": "Soldier 1, BAB +3",
      "Jedi Padawan": "Jedi 1, Force Sensitive, Trained in Use the Force",

      // Rebellion Era Campaign Guide
      "Rebel Ace": "Trained in Pilot, BAB +2",
      "Rebel Leader": "Trained in Persuasion, Character level 3rd",

      // Add more prestige classes as needed
    };

    return prerequisites[className] || null;
  }

  _getCharacterClasses() {
    const classItems = this.actor.items.filter(i => i.type === 'class');
    const classes = {};

    classItems.forEach(classItem => {
      if (classes[classItem.name]) {
        classes[classItem.name]++;
      } else {
        classes[classItem.name] = 1;
      }
    });

    return classes;
  }

  async _onSelectClass(event) {
    event.preventDefault();
    const classId = event.currentTarget.dataset.classId;

    const classPack = game.packs.get('swse.classes');
    const classDoc = await classPack.getDocument(classId);

    if (!classDoc) {
      ui.notifications.error("Class not found!");
      return;
    }

    this.selectedClass = classDoc;
    console.log(`SWSE LevelUp | Selected class: ${classDoc.name}`, classDoc.system);

    // Update mentor for prestige classes
    const isPrestige = !this._isBaseClass(classDoc.name);
    if (isPrestige) {
      // For prestige classes, use the prestige class mentor
      this.mentor = getMentorForClass(classDoc.name);
      this.currentMentorClass = classDoc.name;
      console.log(`SWSE LevelUp | Switched to prestige class mentor: ${this.mentor.name}`);
    } else {
      // For base classes, use the level 1 class mentor
      const level1Class = getLevel1Class(this.actor);
      this.mentor = getMentorForClass(level1Class);
      this.currentMentorClass = level1Class;
    }

    // Get appropriate greeting for the current class level
    // For prestige classes, we need to know which level of that prestige class this is
    const currentClasses = this._getCharacterClasses();
    const classLevel = (currentClasses[classDoc.name] || 0) + 1;
    this.mentorGreeting = getMentorGreeting(this.mentor, classLevel, this.actor);

    // Calculate HP gain
    await this._calculateHPGain(classDoc);

    // Determine next step
    const isMulticlassing = Object.keys(currentClasses).length > 0 && !currentClasses[classDoc.name];
    const isBaseClass = this._isBaseClass(classDoc.name);
    const getsAbilityIncrease = this._getsAbilityIncrease();

    const getsBonusFeat = this._getsBonusFeat();

    // Determine next step in order: multiclass bonus -> ability increase -> feat -> talent -> summary
    if (isMulticlassing && isBaseClass) {
      // Taking a new base class - offer multiclass bonus
      this.currentStep = 'multiclass-bonus';
    } else if (getsAbilityIncrease) {
      // This level grants ability score increases
      this.currentStep = 'ability-increase';
    } else if (getsBonusFeat) {
      // This level grants a bonus feat
      this.currentStep = 'feat';
    } else if (classDoc.system.forceSensitive || classDoc.system.talentTrees?.length > 0) {
      // Class has talents - go to talent selection
      this.currentStep = 'talent';
    } else {
      // No talents - go to summary
      this.currentStep = 'summary';
    }

    // Apply prestige class level 1 features if applicable
    if (!isBaseClass) {
      await this._applyPrestigeClassFeatures(classDoc);
    }

    this.render();
  }

  async _calculateHPGain(classDoc) {
    const hitDie = classDoc.system.hitDie || 6;
    const conMod = this.actor.system.abilities.con?.mod || 0;
    const hpGeneration = game.settings.get("swse", "hpGeneration") || "average";
    const maxHPLevels = game.settings.get("swse", "maxHPLevels") || 1;
    const newLevel = this.actor.system.level + 1;

    let hpGain = 0;

    if (newLevel <= maxHPLevels) {
      hpGain = hitDie + conMod;
    } else {
      switch (hpGeneration) {
        case "maximum":
          hpGain = hitDie + conMod;
          break;
        case "average":
          hpGain = Math.floor(hitDie / 2) + 1 + conMod;
          break;
        case "roll":
          hpGain = Math.floor(Math.random() * hitDie) + 1 + conMod;
          break;
        case "average_minimum":
          const rolled = Math.floor(Math.random() * hitDie) + 1;
          const average = Math.floor(hitDie / 2) + 1;
          hpGain = Math.max(rolled, average) + conMod;
          break;
        default:
          hpGain = Math.floor(hitDie / 2) + 1 + conMod;
      }
    }

    this.hpGain = Math.max(1, hpGain);
    console.log(`SWSE LevelUp | HP gain: ${this.hpGain} (d${hitDie}, method: ${hpGeneration})`);
  }

  // ========================================
  // MULTICLASS BONUS
  // ========================================

  async _onSelectMulticlassFeat(event) {
    event.preventDefault();
    const featId = event.currentTarget.dataset.featId;

    const featPack = game.packs.get('swse.feats');
    const feat = await featPack.getDocument(featId);

    if (feat) {
      this.selectedFeats = [feat];
      ui.notifications.info(`Selected feat: ${feat.name}`);
      this._onNextStep();
    }
  }

  async _onSelectMulticlassSkill(event) {
    event.preventDefault();
    const skillName = event.currentTarget.dataset.skill;

    this.selectedSkills = [skillName];
    ui.notifications.info(`Selected trained skill: ${skillName}`);
    this._onNextStep();
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

  async _getTalentTrees(classDoc) {
    const talentTreeRestriction = game.settings.get("swse", "talentTreeRestriction");
    let availableTrees = [];

    if (talentTreeRestriction === "current") {
      // Only talent trees from the selected class
      availableTrees = classDoc.system.talentTrees || [];
    } else {
      // Talent trees from any class the character has levels in
      const characterClasses = this._getCharacterClasses();
      const classPack = game.packs.get('swse.classes');

      for (const className of Object.keys(characterClasses)) {
        const classDoc = await classPack.index.find(c => c.name === className);
        if (classDoc) {
          const fullClass = await classPack.getDocument(classDoc._id);
          if (fullClass.system.talentTrees) {
            availableTrees.push(...fullClass.system.talentTrees);
          }
        }
      }

      // Add current class trees
      if (classDoc.system.talentTrees) {
        availableTrees.push(...classDoc.system.talentTrees);
      }

      // Remove duplicates
      availableTrees = [...new Set(availableTrees)];
    }

    return availableTrees;
  }

  async _onSelectTalentTree(event) {
    event.preventDefault();
    const treeName = event.currentTarget.dataset.tree;

    // Show visual talent tree dialog (reuse from chargen-narrative)
    await this._showTalentTreeDialog(treeName);
  }

  async _showTalentTreeDialog(treeName) {
    // Load talent data if not already loaded
    if (!this.talentData) {
      const talentPack = game.packs.get('swse.talents');
      if (talentPack) {
        this.talentData = await talentPack.getDocuments();
      }
    }

    const talents = this.talentData.filter(t =>
      t.system?.talent_tree === treeName || t.name.includes(treeName)
    );

    if (talents.length === 0) {
      ui.notifications.warn(`No talents found for ${treeName}`);
      return;
    }

    // Build prerequisite graph
    const talentGraph = this._buildTalentGraph(talents);

    // Generate HTML with talent tree visualization
    const treeHtml = this._generateTalentTreeHtml(treeName, talentGraph);

    // Show dialog
    new Dialog({
      title: `${treeName} Talent Tree`,
      content: treeHtml,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: "Close"
        }
      },
      default: "close",
      render: (html) => {
        // Add click handlers for talent selection
        html.find('.talent-node').click((e) => {
          const talentName = $(e.currentTarget).data('talent-name');
          this._selectTalent(talentName);
          $(e.currentTarget).closest('.dialog').find('.window-close').click();
        });

        // Highlight prerequisites on hover
        html.find('.talent-node').hover(
          (e) => {
            const talentName = $(e.currentTarget).data('talent-name');
            const node = talentGraph[talentName];
            if (node) {
              node.prereqs.forEach(prereq => {
                html.find(`[data-talent-name="${prereq}"]`).addClass('highlight-prereq');
              });
              node.dependents.forEach(dep => {
                html.find(`[data-talent-name="${dep}"]`).addClass('highlight-dependent');
              });
            }
          },
          () => {
            html.find('.talent-node').removeClass('highlight-prereq highlight-dependent');
          }
        );
      }
    }, {
      width: 800,
      height: 600,
      classes: ['talent-tree-dialog']
    }).render(true);
  }

  _buildTalentGraph(talents) {
    const talentGraph = {};

    talents.forEach(talent => {
      talentGraph[talent.name] = {
        talent: talent,
        prereqs: [],
        dependents: []
      };
    });

    // Map prerequisites
    talents.forEach(talent => {
      const prereq = talent.system?.prerequisites || talent.system?.prereqassets;
      if (prereq && prereq !== 'null') {
        const prereqNames = prereq.split(',').map(p => p.trim());
        prereqNames.forEach(pName => {
          if (talentGraph[pName]) {
            talentGraph[talent.name].prereqs.push(pName);
            talentGraph[pName].dependents.push(talent.name);
          }
        });
      }
    });

    return talentGraph;
  }

  _generateTalentTreeHtml(treeName, talentGraph) {
    const groupDeflectBlock = game.settings.get("swse", "groupDeflectBlock") || false;

    let html = `
      <div class="talent-tree-container">
        <h3>${treeName}</h3>
        <p class="hint">Click a talent to select it for your level-up</p>
        <div class="talent-tree-canvas">
          <svg class="talent-connections" width="100%" height="100%">
    `;

    // Organize talents into tiers
    const tiers = this._organizeTalentsIntoTiers(talentGraph);
    const talentPositions = {};
    let yPos = 50;

    // Position talents
    tiers.forEach((tier, tierIndex) => {
      const xSpacing = 100 / (tier.length + 1);
      tier.forEach((talentName, index) => {
        const xPos = (index + 1) * xSpacing;
        talentPositions[talentName] = { x: xPos, y: yPos };
      });
      yPos += 120;
    });

    // Draw connection lines
    let svgLines = '';
    Object.entries(talentGraph).forEach(([talentName, node]) => {
      const talentPos = talentPositions[talentName];
      if (!talentPos) return;

      node.prereqs.forEach(prereqName => {
        const prereqPos = talentPositions[prereqName];
        if (!prereqPos) return;

        svgLines += `
          <line
            x1="${prereqPos.x}%"
            y1="${prereqPos.y + 30}"
            x2="${talentPos.x}%"
            y2="${talentPos.y}"
            class="talent-connection"
            stroke="#00d9ff"
            stroke-width="2"
          />
        `;
      });
    });

    html += svgLines + '</svg><div class="talent-nodes">';

    // Render talent nodes
    Object.entries(talentPositions).forEach(([talentName, pos]) => {
      const talent = talentGraph[talentName].talent;
      const isGrouped = groupDeflectBlock && (talentName === 'Block' || talentName === 'Deflect');
      const hasPrereq = talentGraph[talentName].prereqs.length > 0;

      html += `
        <div class="talent-node ${isGrouped ? 'grouped-talent' : ''}"
             style="left: ${pos.x}%; top: ${pos.y}px;"
             data-talent-name="${talentName}"
             title="${talent.system?.benefit || 'No description'}">
          <div class="talent-icon">
            <img src="${talent.img}" alt="${talentName}" />
          </div>
          <div class="talent-name">${talentName}</div>
          ${hasPrereq ? '<div class="prereq-indicator">★</div>' : ''}
        </div>
      `;
    });

    html += `
        </div>
      </div>
    </div>
    <style>
      .talent-tree-container {
        position: relative;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 8px;
        padding: 1rem;
        min-height: 500px;
      }
      .talent-tree-canvas {
        position: relative;
        width: 100%;
        height: 500px;
      }
      .talent-connections {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
        pointer-events: none;
      }
      .talent-nodes {
        position: relative;
        z-index: 2;
        height: 100%;
      }
      .talent-node {
        position: absolute;
        width: 80px;
        text-align: center;
        cursor: pointer;
        transform: translate(-50%, 0);
        transition: all 0.3s;
      }
      .talent-node:hover {
        transform: translate(-50%, -5px) scale(1.1);
        z-index: 10;
      }
      .talent-icon {
        width: 60px;
        height: 60px;
        margin: 0 auto;
        border: 3px solid #0a74da;
        border-radius: 50%;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.5);
      }
      .talent-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .talent-name {
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #e0e0e0;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      }
      .prereq-indicator {
        position: absolute;
        top: -5px;
        right: 10px;
        color: #ffd700;
        font-size: 1.2rem;
        text-shadow: 0 0 5px rgba(255, 215, 0, 0.8);
      }
      .grouped-talent .talent-icon {
        border-color: #ffa500;
        box-shadow: 0 0 10px rgba(255, 165, 0, 0.6);
      }
      .highlight-prereq {
        filter: brightness(1.5);
      }
      .highlight-prereq .talent-icon {
        border-color: #00ff00;
        box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
      }
      .highlight-dependent {
        filter: brightness(1.3);
      }
      .highlight-dependent .talent-icon {
        border-color: #ff00ff;
        box-shadow: 0 0 15px rgba(255, 0, 255, 0.8);
      }
      .hint {
        text-align: center;
        color: #00d9ff;
        font-style: italic;
        margin-bottom: 1rem;
      }
    </style>
    `;

    return html;
  }

  _organizeTalentsIntoTiers(talentGraph) {
    const tiers = [];
    const assigned = new Set();

    // Find root talents (no prerequisites)
    const roots = Object.entries(talentGraph)
      .filter(([name, node]) => node.prereqs.length === 0)
      .map(([name]) => name);

    if (roots.length > 0) {
      tiers.push(roots);
      roots.forEach(r => assigned.add(r));
    }

    // Assign remaining talents to tiers
    let currentTier = roots;
    while (assigned.size < Object.keys(talentGraph).length && currentTier.length > 0) {
      const nextTier = [];

      currentTier.forEach(talentName => {
        const node = talentGraph[talentName];
        node.dependents.forEach(depName => {
          if (!assigned.has(depName)) {
            const depNode = talentGraph[depName];
            if (depNode.prereqs.every(p => assigned.has(p))) {
              nextTier.push(depName);
              assigned.add(depName);
            }
          }
        });
      });

      if (nextTier.length > 0) {
        tiers.push(nextTier);
        currentTier = nextTier;
      } else {
        break;
      }
    }

    return tiers;
  }

  _selectTalent(talentName) {
    const talent = this.talentData.find(t => t.name === talentName);
    if (!talent) return;

    // Check prerequisites
    const pendingData = {
      selectedFeats: this.selectedFeats,
      selectedClass: this.selectedClass,
      abilityIncreases: this.abilityIncreases,
      selectedSkills: this.selectedSkills,
      selectedTalents: this.selectedTalent ? [this.selectedTalent] : []
    };

    const check = PrerequisiteValidator.checkTalentPrerequisites(talent, this.actor, pendingData);
    if (!check.valid) {
      ui.notifications.warn(`Cannot select ${talentName}: ${check.reasons.join(', ')}`);
      return;
    }

    this.selectedTalent = talent;
    ui.notifications.info(`Selected talent: ${talentName}`);
    console.log(`SWSE LevelUp | Selected talent: ${talentName}`);
  }

  // ========================================
  // PRESTIGE CLASS FEATURES
  // ========================================

  async _applyPrestigeClassFeatures(classDoc) {
    console.log(`SWSE LevelUp | Applying prestige class features for ${classDoc.name}`);

    const startingFeatures = classDoc.system.startingFeatures || [];

    // Apply all level 1 features (except max HP which is handled separately)
    for (const feature of startingFeatures) {
      if (feature.type === 'proficiency' || feature.type === 'class_feature') {
        console.log(`SWSE LevelUp | Auto-applying: ${feature.name}`);
        // Features will be applied in _onCompleteLevelUp
      }
    }
  }

  // ========================================
  // NAVIGATION
  // ========================================

  _onNextStep() {
    const getsAbilityIncrease = this._getsAbilityIncrease();
    const getsBonusFeat = this._getsBonusFeat();
    const hasTalents = this.selectedClass?.system.forceSensitive || this.selectedClass?.system.talentTrees?.length > 0;

    // Determine next step dynamically based on what's applicable
    switch (this.currentStep) {
      case 'class':
        this.currentStep = 'multiclass-bonus'; // This won't show if not multiclassing
        break;
      case 'multiclass-bonus':
        if (getsAbilityIncrease) {
          this.currentStep = 'ability-increase';
        } else if (getsBonusFeat) {
          this.currentStep = 'feat';
        } else if (hasTalents) {
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
        if (getsBonusFeat) {
          this.currentStep = 'feat';
        } else if (hasTalents) {
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
        if (hasTalents) {
          this.currentStep = 'talent';
        } else {
          this.currentStep = 'summary';
        }
        break;
      case 'talent':
        this.currentStep = 'summary';
        break;
    }

    this.render();
  }

  _onPrevStep() {
    const getsAbilityIncrease = this._getsAbilityIncrease();
    const getsBonusFeat = this._getsBonusFeat();
    const characterClasses = this._getCharacterClasses();
    const isMulticlassing = Object.keys(characterClasses).length > 0 && !characterClasses[this.selectedClass?.name];
    const isBaseClass = this.selectedClass ? this._isBaseClass(this.selectedClass.name) : false;
    const hasTalents = this.selectedClass?.system.forceSensitive || this.selectedClass?.system.talentTrees?.length > 0;

    // Go back one step dynamically
    switch (this.currentStep) {
      case 'multiclass-bonus':
        this.currentStep = 'class';
        break;
      case 'ability-increase':
        if (isMulticlassing && isBaseClass) {
          this.currentStep = 'multiclass-bonus';
        } else {
          this.currentStep = 'class';
        }
        break;
      case 'feat':
        if (getsAbilityIncrease) {
          this.currentStep = 'ability-increase';
        } else if (isMulticlassing && isBaseClass) {
          this.currentStep = 'multiclass-bonus';
        } else {
          this.currentStep = 'class';
        }
        break;
      case 'talent':
        if (getsBonusFeat) {
          this.currentStep = 'feat';
        } else if (getsAbilityIncrease) {
          this.currentStep = 'ability-increase';
        } else if (isMulticlassing && isBaseClass) {
          this.currentStep = 'multiclass-bonus';
        } else {
          this.currentStep = 'class';
        }
        break;
      case 'summary':
        if (hasTalents) {
          this.currentStep = 'talent';
        } else if (getsBonusFeat) {
          this.currentStep = 'feat';
        } else if (getsAbilityIncrease) {
          this.currentStep = 'ability-increase';
        } else if (isMulticlassing && isBaseClass) {
          this.currentStep = 'multiclass-bonus';
        } else {
          this.currentStep = 'class';
        }
        break;
    }

    this.render();
  }

  // ========================================
  // BAB AND DEFENSE CALCULATIONS
  // ========================================

  /**
   * Calculate total BAB from all class items
   * @returns {number} Total BAB
   */
  _calculateTotalBAB() {
    const classItems = this.actor.items.filter(i => i.type === 'class');
    let totalBAB = 0;

    for (const classItem of classItems) {
      const classLevel = classItem.system.level || 1;
      const className = classItem.name;

      // Check if class has level_progression data with BAB
      if (classItem.system.level_progression && Array.isArray(classItem.system.level_progression)) {
        const levelData = classItem.system.level_progression.find(lp => lp.level === classLevel);
        if (levelData && typeof levelData.bab === 'number') {
          totalBAB += levelData.bab;
          continue;
        }
      }

      // Fallback: Use babProgression if available
      if (classItem.system.babProgression) {
        totalBAB += Math.floor(classLevel * classItem.system.babProgression);
        continue;
      }

      // Fallback: Calculate from known class names
      const fullBABClasses = ['Jedi', 'Soldier'];
      if (fullBABClasses.includes(className)) {
        totalBAB += classLevel;
      } else {
        // 3/4 BAB for other base classes
        totalBAB += Math.floor(classLevel * 0.75);
      }
    }

    return totalBAB;
  }

  /**
   * Calculate defense bonuses from all class items
   * In SWSE, class defense bonuses are applied ONCE per class, not per level
   * Good defense = +2 class bonus, Poor defense = +0 class bonus
   * @returns {{fortitude: number, reflex: number, will: number}}
   */
  _calculateDefenseBonuses() {
    const classItems = this.actor.items.filter(i => i.type === 'class');
    const bonuses = { fortitude: 0, reflex: 0, will: 0 };

    // Defense bonuses by class (good = +2 once, poor = +0)
    // These are ONE-TIME bonuses, not multiplied by level
    const defenseProgression = {
      'Jedi': { fortitude: 2, reflex: 2, will: 2 },
      'Noble': { fortitude: 0, reflex: 0, will: 2 },
      'Scoundrel': { fortitude: 0, reflex: 2, will: 0 },
      'Scout': { fortitude: 0, reflex: 2, will: 0 },
      'Soldier': { fortitude: 2, reflex: 0, will: 0 },

      // Prestige classes (one-time bonuses)
      'Ace Pilot': { fortitude: 0, reflex: 2, will: 0 },
      'Bounty Hunter': { fortitude: 2, reflex: 0, will: 0 },
      'Crime Lord': { fortitude: 0, reflex: 0, will: 2 },
      'Elite Trooper': { fortitude: 2, reflex: 0, will: 0 },
      'Force Adept': { fortitude: 0, reflex: 0, will: 2 },
      'Force Disciple': { fortitude: 0, reflex: 0, will: 2 },
      'Gunslinger': { fortitude: 0, reflex: 2, will: 0 },
      'Jedi Knight': { fortitude: 2, reflex: 2, will: 2 },
      'Jedi Master': { fortitude: 2, reflex: 2, will: 2 },
      'Officer': { fortitude: 0, reflex: 0, will: 2 },
      'Sith Apprentice': { fortitude: 0, reflex: 0, will: 2 },
      'Sith Lord': { fortitude: 2, reflex: 2, will: 2 },
      'Imperial Knight': { fortitude: 2, reflex: 2, will: 2 }
    };

    for (const classItem of classItems) {
      const className = classItem.name;

      // Check if class item has defenses specified (not multiplied by level!)
      if (classItem.system.defenses) {
        bonuses.fortitude += (classItem.system.defenses.fortitude || 0);
        bonuses.reflex += (classItem.system.defenses.reflex || 0);
        bonuses.will += (classItem.system.defenses.will || 0);
        continue;
      }

      // Use known defense progressions (not multiplied by level!)
      const progression = defenseProgression[className];
      if (progression) {
        bonuses.fortitude += progression.fortitude;
        bonuses.reflex += progression.reflex;
        bonuses.will += progression.will;
      } else {
        // Default: assume poor/poor/poor for unknown classes
        console.warn(`SWSE LevelUp | Unknown defense progression for class ${className}, using defaults`);
      }
    }

    return bonuses;
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

      // Check if character already has this class
      const existingClass = this.actor.items.find(i => i.type === 'class' && i.name === this.selectedClass.name);

      if (existingClass) {
        // Level up existing class
        await existingClass.update({
          'system.level': (existingClass.system.level || 1) + 1
        });
      } else {
        // Create new class item with full class data
        const classItem = {
          name: this.selectedClass.name,
          type: "class",
          img: this.selectedClass.img,
          system: {
            level: 1,
            hitDie: this.selectedClass.system.hitDie || 6,
            babProgression: this.selectedClass.system.babProgression || 0.75,
            defenses: {
              fortitude: this.selectedClass.system.defenses?.fortitude || 0,
              reflex: this.selectedClass.system.defenses?.reflex || 0,
              will: this.selectedClass.system.defenses?.will || 0
            },
            description: this.selectedClass.system.description || '',
            classSkills: this.selectedClass.system.classSkills || [],
            talentTrees: this.selectedClass.system.talentTrees || [],
            forceSensitive: this.selectedClass.system.forceSensitive || false
          }
        };

        await this.actor.createEmbeddedDocuments("Item", [classItem]);
      }

      // Add selected talent if any
      if (this.selectedTalent) {
        await this.actor.createEmbeddedDocuments("Item", [this.selectedTalent.toObject()]);
      }

      // Add multiclass feats if any
      if (this.selectedFeats.length > 0) {
        const featObjects = this.selectedFeats.map(f => f.toObject());
        await this.actor.createEmbeddedDocuments("Item", featObjects);
      }

      // Check for milestone feat at levels 3, 6, 9, 12, 15, 18
      const newLevel = this.actor.system.level + 1;
      const getMilestoneFeat = [3, 6, 9, 12, 15, 18].includes(newLevel);
      if (getMilestoneFeat) {
        ui.notifications.info(`Level ${newLevel}! You gain a bonus general feat.`);
        console.log(`SWSE LevelUp | Level ${newLevel} milestone - bonus general feat granted`);
      }

      // Update trained skills if selected
      const updates = {};
      if (this.selectedSkills.length > 0) {
        this.selectedSkills.forEach(skill => {
          updates[`system.skills.${skill}.trained`] = true;
        });
      }

      // Store old modifiers before applying ability increases
      const oldIntMod = this.actor.system.abilities.int?.mod || 0;
      const oldConMod = this.actor.system.abilities.con?.mod || 0;

      // Apply ability score increases if any
      let intIncreased = false;
      let conIncreased = false;
      if (Object.keys(this.abilityIncreases).length > 0) {
        for (const [ability, increase] of Object.entries(this.abilityIncreases)) {
          if (increase > 0) {
            const currentBase = this.actor.system.abilities[ability].base || 10;
            const newBase = currentBase + increase;
            updates[`system.abilities.${ability}.base`] = newBase;
            console.log(`SWSE LevelUp | Increasing ${ability} by +${increase} (${currentBase} → ${newBase})`);

            // Track if INT or CON increased
            if (ability === 'int') intIncreased = true;
            if (ability === 'con') conIncreased = true;
          }
        }
      }

      // Update actor level and HP
      // newLevel already declared above at line 892
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
      if (intIncreased && newIntMod > oldIntMod) {
        console.log(`SWSE LevelUp | INT modifier increased from ${oldIntMod} to ${newIntMod} - granting bonus skill`);
        bonusSkillGranted = true;
        ui.notifications.info("Intelligence increased! You may train an additional skill.");
      }

      // If CON modifier increased, grant retroactive HP
      if (conIncreased && newConMod > oldConMod) {
        const modIncrase = newConMod - oldConMod;
        retroactiveHPGain = newLevel * modIncrase;
        totalHPGain += retroactiveHPGain;
        console.log(`SWSE LevelUp | CON modifier increased from ${oldConMod} to ${newConMod} - granting ${retroactiveHPGain} retroactive HP`);
        ui.notifications.info(`Constitution increased! You gain ${retroactiveHPGain} retroactive HP!`);
      }

      // Update HP with any retroactive gains
      const newHPMax = this.actor.system.hp.max + totalHPGain;
      const newHPValue = this.actor.system.hp.value + totalHPGain;

      await this.actor.update({
        "system.hp.max": newHPMax,
        "system.hp.value": newHPValue
      });

      // Recalculate BAB and defense bonuses from all class items
      const totalBAB = this._calculateTotalBAB();
      const defenseBonuses = this._calculateDefenseBonuses();

      console.log(`SWSE LevelUp | Updating BAB to ${totalBAB}`);
      console.log(`SWSE LevelUp | Updating defense bonuses: Fort +${defenseBonuses.fortitude}, Ref +${defenseBonuses.reflex}, Will +${defenseBonuses.will}`);

      await this.actor.update({
        "system.bab": totalBAB,
        "system.defenses.fortitude.class": defenseBonuses.fortitude,
        "system.defenses.reflex.class": defenseBonuses.reflex,
        "system.defenses.will.class": defenseBonuses.will
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
          ${getMilestoneFeat ? `<p><strong>Milestone Feat:</strong> Gain 1 bonus general feat!</p>` : ''}
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
      console.error("SWSE LevelUp | Error completing level up:", err);
      ui.notifications.error("Failed to complete level up. See console for details.");
    }
  }

  async _updateObject(event, formData) {
    // Not used - level up is handled by _onCompleteLevelUp
  }
}
