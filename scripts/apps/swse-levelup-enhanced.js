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
import { TalentTreeVisualizer } from './talent-tree-visualizer.js';

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
    data.isLevel0 = this.actor.system.level === 0;

    // For level 0 characters, get available species
    if (data.isLevel0) {
      data.availableSpecies = await this._getAvailableSpecies();
      data.selectedSpecies = this.selectedSpecies;
      data.abilityScores = this.abilityScores;
    }

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

  /**
   * Check if the new level grants an ability score increase
   * @returns {boolean}
   */
  _getsAbilityIncrease() {
    const newLevel = this.actor.system.level + 1;
    return [4, 8, 12, 16, 20].includes(newLevel);
  }

  /**
   * Check if the new level grants a bonus feat from the selected class
   * Checks the class's level_progression data for feat_choice features
   * @returns {boolean}
   */
  _getsBonusFeat() {
    if (!this.selectedClass) return false;

    const newLevel = this.actor.system.level + 1;
    const classLevel = this._getClassLevel(this.selectedClass.name) + 1;

    // Check level_progression for this class level
    const levelProgression = this.selectedClass.system.level_progression;
    if (!levelProgression || !Array.isArray(levelProgression)) return false;

    const levelData = levelProgression.find(lp => lp.level === classLevel);
    if (!levelData || !levelData.features) return false;

    // Check if this level grants a feat_choice feature
    return levelData.features.some(f => f.type === 'feat_choice');
  }

  /**
   * Check if the new level grants a talent from the selected class
   * Checks the class's level_progression data for talent_choice features
   * @returns {boolean}
   */
  _getsTalent() {
    if (!this.selectedClass) return false;

    const classLevel = this._getClassLevel(this.selectedClass.name) + 1;

    // Check level_progression for this class level
    const levelProgression = this.selectedClass.system.level_progression;
    if (!levelProgression || !Array.isArray(levelProgression)) {
      // Fallback: if no level_progression, check if class has talent trees
      const trees = this.selectedClass.system.talent_trees || this.selectedClass.system.talentTrees;
      return (this.selectedClass.system.forceSensitive || trees?.length > 0);
    }

    const levelData = levelProgression.find(lp => lp.level === classLevel);
    if (!levelData || !levelData.features) return false;

    // Check if this level grants a talent_choice feature
    return levelData.features.some(f => f.type === 'talent_choice');
  }

  /**
   * Get the current level in a specific class
   * @param {string} className - Name of the class
   * @returns {number} Current level in that class
   */
  _getClassLevel(className) {
    const classItem = this.actor.items.find(i => i.type === 'class' && i.name === className);
    return classItem ? (classItem.system.level || 0) : 0;
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
      this._bindAbilitiesUI(html[0]);
    }
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
      let featObjects = allFeats.map(f => f.toObject());

      // Filter by class bonus feats if a class is selected and this is a class bonus feat level
      if (this.selectedClass && this.selectedClass.name) {
        const className = this.selectedClass.name;
        const classLevel = this._getClassLevel(className) + 1;

        // Check if this level grants a bonus feat specific to this class
        const levelProgression = this.selectedClass.system.level_progression;
        if (levelProgression && Array.isArray(levelProgression)) {
          const levelData = levelProgression.find(lp => lp.level === classLevel);
          if (levelData && levelData.features) {
            // Find the feat_choice feature to see if it specifies a feat list
            const featFeature = levelData.features.find(f => f.type === 'feat_choice');
            if (featFeature && featFeature.list) {
              // This class has a specific feat list (e.g., "jedi_feats", "noble_feats")
              console.log(`SWSE LevelUp | Filtering feats by list: ${featFeature.list} for ${className}`);

              // Filter to only feats that have this class in their bonus_feat_for array
              featObjects = featObjects.filter(f => {
                const bonusFeatFor = f.system?.bonus_feat_for || [];
                return bonusFeatFor.includes(className) || bonusFeatFor.includes('all');
              });

              console.log(`SWSE LevelUp | Filtered to ${featObjects.length} bonus feats for ${className}`);
            }
          }
        }
      }

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
      const isBaseClass = this._isBaseClass(classDoc.name) || classDoc.system.base_class === true;

      if (this._meetsPrerequisites(classDoc)) {
        availableClasses.push({
          id: classDoc._id,
          name: classDoc.name,
          system: classDoc.system,
          isBase: isBaseClass,
          isPrestige: !isBaseClass
        });
      }
    }

    return availableClasses;
  }

  /**
   * Get available species from the species compendium
   * @returns {Array} - Array of species objects
   */
  async _getAvailableSpecies() {
    const speciesPack = game.packs.get('swse.species');
    if (!speciesPack) {
      console.warn('SWSE LevelUp | Species compendium not found!');
      return [];
    }

    const allSpecies = await speciesPack.getDocuments();
    console.log(`SWSE LevelUp | Loaded ${allSpecies.length} species from compendium`);

    const availableSpecies = [];

    for (const speciesDoc of allSpecies) {
      availableSpecies.push({
        id: speciesDoc.id || speciesDoc._id,
        name: speciesDoc.name,
        system: speciesDoc.system,
        img: speciesDoc.img
      });
      console.log(`SWSE LevelUp | Species: ${speciesDoc.name} (ID: ${speciesDoc.id || speciesDoc._id})`);
    }

    if (availableSpecies.length === 0) {
      console.warn('SWSE LevelUp | No species found in compendium!');
    }

    // Sort by source material (Core first, then alphabetically)
    return this._sortSpeciesBySource(availableSpecies);
  }

  /**
   * Sort species by source material, prioritizing Core Rulebook first
   * @param {Array} species - Array of species documents
   * @returns {Array} Sorted species array
   */
  _sortSpeciesBySource(species) {
    if (!species || species.length === 0) return species;

    // Define source priority order (Core first, then alphabetically)
    const sourcePriority = {
      "Core": 0,
      "Core Rulebook": 0,
      "Knights of the Old Republic": 1,
      "KotOR": 1,
      "KOTOR": 1,
      "Clone Wars": 2,
      "Rebellion Era": 3,
      "Legacy Era": 4,
      "The Force Unleashed": 5,
      "Galaxy at War": 6,
      "Unknown Regions": 7,
      "Scum and Villainy": 8,
      "Threats of the Galaxy": 9,
      "Jedi Academy": 10
    };

    // Sort species
    return species.sort((a, b) => {
      const sourceA = a.system?.source || "Unknown";
      const sourceB = b.system?.source || "Unknown";

      // Get priority (default to 999 for unknown sources)
      const priorityA = sourcePriority[sourceA] ?? 999;
      const priorityB = sourcePriority[sourceB] ?? 999;

      // First sort by source priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // If same priority (or both unknown), sort by source name alphabetically
      if (sourceA !== sourceB) {
        return sourceA.localeCompare(sourceB);
      }

      // Within same source, sort by species name alphabetically
      return (a.name || "").localeCompare(b.name || "");
    });
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
      "Ace Pilot": "Character Level 7, Trained in Pilot, Vehicular Combat",
      "Bounty Hunter": "Character Level 7, Trained in Survival, 2 Awareness Talents",
      "Crime Lord": "Character Level 7, Trained in Deception, Trained in Persuasion, 1 Fortune/Lineage/Misfortune Talent",
      "Elite Trooper": "BAB +7, Armor Proficiency (Medium), Martial Arts I, Point-Blank Shot or Flurry, 1 Armor Specialist/Commando/Mercenary/Weapon Specialist Talent",
      "Force Adept": "Character Level 7, Trained in Use the Force, Force Sensitivity, 3 Force Talents",
      "Force Disciple": "Character Level 12, Trained in Use the Force, Force Sensitivity, 2 Dark Side Devotee/Force Adept/Force Item Talents, Farseeing Power, 1 Force Technique",
      "Gunslinger": "Character Level 7, Point-Blank Shot, Precise Shot, Quick Draw, Weapon Proficiency (Pistols)",
      "Jedi Knight": "BAB +7, Trained in Use the Force, Force Sensitivity, Weapon Proficiency (Lightsabers), Member of The Jedi",
      "Jedi Master": "Character Level 12, Trained in Use the Force, Force Sensitivity, Weapon Proficiency (Lightsabers), 1 Force Technique, Member of The Jedi",
      "Officer": "Character Level 7, Trained in Knowledge (Tactics), 1 Leadership/Commando/Veteran Talent, Military/Paramilitary Organization",
      "Sith Apprentice": "Character Level 7, Trained in Use the Force, Force Sensitivity, Weapon Proficiency (Lightsabers), Dark Side Score Equal to Wisdom, Member of The Sith",
      "Sith Lord": "Character Level 12, Trained in Use the Force, Force Sensitivity, Weapon Proficiency (Lightsabers), 1 Force Technique, Dark Side Score Equal to Wisdom, Member of The Sith",

      // Knights of the Old Republic Campaign Guide
      "Corporate Agent": "Character Level 7, Trained in Gather Information, Trained in Knowledge (Bureaucracy), Skill Focus (Knowledge (Bureaucracy)), Employed by Major Corporation",
      "Gladiator": "Character Level 7, BAB +7, Improved Damage Threshold, Weapon Proficiency (Advanced Melee Weapons)",
      "Melee Duelist": "Character Level 7, BAB +7, Melee Defense, Rapid Strike, Weapon Focus (Melee Weapon)",

      // The Force Unleashed Campaign Guide
      "Enforcer": "Character Level 7, Trained in Gather Information, Trained in Perception, 1 Survivor Talent, Law Enforcement Organization",
      "Independent Droid": "Character Level 3, Trained in Use Computer, Heuristic Processor",
      "Infiltrator": "Character Level 7, Trained in Perception, Trained in Stealth, Skill Focus (Stealth), 2 Camouflage/Spy Talents",
      "Master Privateer": "Character Level 7, Trained in Deception, Trained in Pilot, Vehicular Combat, 2 Misfortune/Smuggling/Spacer Talents",
      "Medic": "Character Level 7, Trained in Knowledge (Life Sciences), Trained in Treat Injury, Surgical Expertise",
      "Saboteur": "Character Level 7, Trained in Deception, Trained in Mechanics, Trained in Use Computer",

      // Scum and Villainy
      "Assassin": "Character Level 7, Trained in Stealth, Sniper, Dastardly Strike Talent",
      "Charlatan": "Character Level 7, Trained in Deception, Trained in Persuasion, 1 Disgrace/Influence/Lineage Talent",
      "Outlaw": "Character Level 7, Trained in Stealth, Trained in Survival, 1 Disgrace/Misfortune Talent, Wanted in at Least One System",

      // Clone Wars Campaign Guide
      "Droid Commander": "Character Level 7, Trained in Knowledge (Tactics), Trained in Use Computer, 1 Leadership/Commando Talent, Must be a Droid",
      "Military Engineer": "BAB +7, Trained in Mechanics, Trained in Use Computer",
      "Vanguard": "Character Level 7, Trained in Perception, Trained in Stealth, 2 Camouflage/Commando Talents",

      // Legacy Era Campaign Guide
      "Imperial Knight": "BAB +7, Trained in Use the Force, Armor Proficiency (Medium), Force Sensitivity, Weapon Proficiency (Lightsabers), Sworn Defender of Fel Empire",
      "Shaper": "Character Level 7, Yuuzhan Vong Species, Trained in Knowledge (Life Sciences), Trained in Treat Injury, Biotech Specialist",

      // Rebellion Era Campaign Guide
      "Improviser": "Character Level 7, Trained in Mechanics, Trained in Use Computer, Skill Focus (Mechanics)",
      "Pathfinder": "Character Level 7, Trained in Perception, Trained in Survival, 2 Awareness/Camouflage/Survivor Talents",

      // Galaxy at War
      "Martial Arts Master": "BAB +7, Martial Arts II, Melee Defense, 1 Martial Arts Feat, 1 Brawler/Survivor Talent"
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

    console.log(`SWSE LevelUp | Attempting to select species: ${speciesName} (ID: ${speciesId})`);

    const speciesPack = game.packs.get('swse.species');
    if (!speciesPack) {
      console.error('SWSE LevelUp | Species compendium not found!');
      ui.notifications.error("Species compendium not found! Please check that the swse.species compendium exists.");
      return;
    }

    const speciesDoc = await speciesPack.getDocument(speciesId);

    if (!speciesDoc) {
      console.error(`SWSE LevelUp | Species not found with ID: ${speciesId}`);
      console.log('SWSE LevelUp | Available species in pack:', await speciesPack.getDocuments());
      ui.notifications.error(`Species "${speciesName}" not found! The species compendium may be empty or the ID is incorrect.`);
      return;
    }

    this.selectedSpecies = speciesDoc;
    console.log(`SWSE LevelUp | Selected species: ${speciesName}`, speciesDoc.system);

    // Move to attributes step
    this.currentStep = 'attributes';
    ui.notifications.info(`Species selected: ${speciesName}`);
    this.render();
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

    console.log(`SWSE LevelUp | Confirmed ability scores:`, this.abilityScores);

    // Move to class selection step
    this.currentStep = 'class';
    ui.notifications.info("Ability scores confirmed");
    this.render();
  }

  /**
   * Bind the abilities UI for point buy, standard roll, and organic roll
   * Adapted from chargen.js
   * @param {HTMLElement} root - Root element
   */
  _bindAbilitiesUI(root) {
    const doc = root || this.element[0];
    const ablist = ["str", "dex", "con", "int", "wis", "cha"];

    // Point buy system
    let pool = 32;
    const pointCosts = (from, to) => {
      const costForIncrement = (v) => {
        if (v < 12) return 1;
        if (v < 14) return 2;
        return 3;
      };
      let cost = 0;
      for (let v = from; v < to; v++) cost += costForIncrement(v);
      return cost;
    };

    const updatePointRemaining = () => {
      const el = doc.querySelector("#point-remaining");
      if (el) el.textContent = pool;
    };

    const initPointBuy = () => {
      pool = 32;
      ablist.forEach(a => {
        const inp = doc.querySelector(`[name="ability_${a}"]`);
        if (inp) inp.value = 8;
        const plus = doc.querySelector(`[data-plus="${a}"]`);
        const minus = doc.querySelector(`[data-minus="${a}"]`);
        if (plus) plus.onclick = () => adjustAttribute(a, +1);
        if (minus) minus.onclick = () => adjustAttribute(a, -1);
      });
      updatePointRemaining();
      recalcPreview();
    };

    const adjustAttribute = (ab, delta) => {
      const el = doc.querySelector(`[name="ability_${ab}"]`);
      if (!el) return;

      let cur = Number(el.value || 8);
      const newVal = Math.max(8, Math.min(18, cur + delta));
      const costNow = pointCosts(8, cur);
      const costNew = pointCosts(8, newVal);
      const deltaCost = costNew - costNow;

      if (deltaCost > pool) {
        ui.notifications.warn("Not enough point-buy points remaining.");
        return;
      }

      pool -= deltaCost;
      el.value = newVal;
      updatePointRemaining();
      recalcPreview();
    };

    // Standard array roll
    const rollStandard = async () => {
      const results = [];
      for (let i = 0; i < 6; i++) {
        const r = await new Roll("4d6kh3").evaluate();
        const total = r.total;
        results.push({ total });
      }

      const container = doc.querySelector("#roll-results");
      if (container) {
        container.innerHTML = "";
        results.forEach(res => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "assign-roll";
          btn.textContent = `${res.total}`;
          btn.dataset.value = res.total;
          btn.onclick = () => assignRollToNext(res.total);
          container.appendChild(btn);
        });
        ui.notifications.info("Standard rolls generated — click a result then click an ability to assign.");
      }
    };

    const assignRollToNext = (val) => {
      let target = doc.querySelector(".ability-input:focus");
      if (!target) {
        const inputs = ablist.map(a => doc.querySelector(`[name="ability_${a}"]`)).filter(Boolean);
        inputs.sort((x, y) => Number(x.value) - Number(y.value));
        target = inputs[0];
      }
      if (target) {
        target.value = val;
        recalcPreview();
      }
    };

    // Organic roll
    const rollOrganic = async () => {
      const r = await new Roll("24d6").evaluate();
      if (!r.dice || !r.dice[0] || !r.dice[0].results) {
        ui.notifications.error("Failed to roll dice. Please try again.");
        console.error("SWSE | Roll failed:", r);
        return;
      }
      const rolls = r.dice[0].results.map(x => x.result).sort((a, b) => b - a);
      const kept = rolls.slice(0, 18);

      const groups = [];
      for (let i = 0; i < 6; i++) {
        groups.push(kept.slice(i * 3, (i + 1) * 3));
      }

      const container = doc.querySelector("#organic-groups");
      if (container) {
        container.innerHTML = "";
        groups.forEach((g, idx) => {
          const div = document.createElement("div");
          div.className = "organic-group";
          const s = g.reduce((a, b) => a + b, 0);
          div.textContent = `${g.join(", ")} = ${s}`;
          div.dataset.sum = s;
          div.onclick = () => selectOrganicGroup(div);
          container.appendChild(div);
        });
        ui.notifications.info("Organic roll completed — click a group, then click an ability to assign.");
      }
      doc._selectedOrganic = null;
    };

    const selectOrganicGroup = (div) => {
      doc.querySelectorAll(".organic-group").forEach(d => d.classList.remove("selected-group"));
      div.classList.add("selected-group");
      doc._selectedOrganic = Number(div.dataset.sum);

      ablist.forEach(a => {
        const input = doc.querySelector(`[name="ability_${a}"]`);
        if (input) {
          input.onclick = () => {
            if (doc._selectedOrganic == null) return;
            input.value = doc._selectedOrganic;
            recalcPreview();
            doc.querySelectorAll(".organic-group").forEach(d => d.classList.remove("selected-group"));
            doc._selectedOrganic = null;
          };
        }
      });
    };

    const recalcPreview = () => {
      ablist.forEach(a => {
        const inp = doc.querySelector(`[name="ability_${a}"]`);
        const display = doc.querySelector(`#display_${a}`);
        const base = Number(inp?.value || 10);
        const total = base;
        const mod = Math.floor((total - 10) / 2);

        if (display) display.textContent = `Total: ${total} (Mod: ${mod >= 0 ? "+" : ""}${mod})`;
      });
    };

    // Mode switching function
    const switchMode = (modeName) => {
      // Hide all mode divs
      const modes = ['point-mode', 'standard-mode', 'organic-mode', 'free-mode'];
      modes.forEach(mode => {
        const modeDiv = doc.querySelector(`#${mode}`);
        if (modeDiv) modeDiv.style.display = 'none';
      });

      // Show selected mode
      const selectedMode = doc.querySelector(`#${modeName}`);
      if (selectedMode) selectedMode.style.display = 'block';

      // Update button states
      const buttons = doc.querySelectorAll('.method-button');
      buttons.forEach(btn => btn.classList.remove('active'));
    };

    // Wire buttons with mode switching
    const stdBtn = doc.querySelector("#std-roll-btn");
    if (stdBtn) {
      stdBtn.onclick = () => {
        switchMode('standard-mode');
        stdBtn.classList.add('active');
        rollStandard();
      };
    }

    const orgBtn = doc.querySelector("#org-roll-btn");
    if (orgBtn) {
      orgBtn.onclick = () => {
        switchMode('organic-mode');
        orgBtn.classList.add('active');
        rollOrganic();
      };
    }

    const pbInit = doc.querySelector("#pb-init");
    if (pbInit) {
      pbInit.onclick = () => {
        switchMode('point-mode');
        pbInit.classList.add('active');
        initPointBuy();
      };
    }

    // Initialize
    switchMode('point-mode');
    if (pbInit) pbInit.classList.add('active');
    initPointBuy();
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

    // Update mentor based on class type and character level
    const isPrestige = !this._isBaseClass(classDoc.name);
    const currentLevel = this.actor.system.level || 0;

    if (isPrestige) {
      // For prestige classes, use the prestige class mentor
      this.mentor = getMentorForClass(classDoc.name);
      this.currentMentorClass = classDoc.name;
      console.log(`SWSE LevelUp | Switched to prestige class mentor: ${this.mentor.name}`);
    } else if (currentLevel === 0 || currentLevel === 1) {
      // For level 0->1 or level 1->2, use the selected base class mentor
      this.mentor = getMentorForClass(classDoc.name);
      this.currentMentorClass = classDoc.name;
      console.log(`SWSE LevelUp | Switched to base class mentor: ${this.mentor.name}`);
    } else {
      // For higher levels, use the level 1 class mentor
      const level1Class = getLevel1Class(this.actor);
      this.mentor = getMentorForClass(level1Class || classDoc.name);
      this.currentMentorClass = level1Class || classDoc.name;
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
    const getsTalent = this._getsTalent();

    if (isMulticlassing && isBaseClass) {
      // Taking a new base class - offer multiclass bonus
      this.currentStep = 'multiclass-bonus';
    } else if (getsAbilityIncrease) {
      // This level grants ability score increases
      this.currentStep = 'ability-increase';
    } else if (getsBonusFeat) {
      // This level grants a bonus feat from this class
      this.currentStep = 'feat';
    } else if (getsTalent) {
      // This level grants a talent from this class
      this.currentStep = 'talent';
    } else {
      // No special selections - go to summary
      this.currentStep = 'summary';
    }

    // Apply prestige class level 1 features if applicable
    if (!isBaseClass) {
      await this._applyPrestigeClassFeatures(classDoc);
    }

    this.render();
  }

  async _calculateHPGain(classDoc) {
    // Parse hit die from string like "1d10" to get the die size (10)
    const hitDieString = classDoc.system.hit_die || classDoc.system.hitDie || "1d6";
    const hitDie = parseInt(hitDieString.match(/\d+d(\d+)/)?.[1] || "6");
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
      await this.render();
    }
  }

  async _onSelectMulticlassSkill(event) {
    event.preventDefault();
    const skillName = event.currentTarget.dataset.skill;

    this.selectedSkills = [skillName];
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

  async _getTalentTrees(classDoc) {
    const talentTreeRestriction = game.settings.get("swse", "talentTreeRestriction");
    let availableTrees = [];

    if (talentTreeRestriction === "current") {
      // Only talent trees from the selected class
      availableTrees = classDoc.system.talent_trees || classDoc.system.talentTrees || [];
    } else {
      // Talent trees from any class the character has levels in
      const characterClasses = this._getCharacterClasses();
      const classPack = game.packs.get('swse.classes');

      for (const className of Object.keys(characterClasses)) {
        const classDoc = await classPack.index.find(c => c.name === className);
        if (classDoc) {
          const fullClass = await classPack.getDocument(classDoc._id);
          const trees = fullClass.system.talent_trees || fullClass.system.talentTrees;
          if (trees) {
            availableTrees.push(...trees);
          }
        }
      }

      // Add current class trees
      const trees = classDoc.system.talent_trees || classDoc.system.talentTrees;
      if (trees) {
        availableTrees.push(...trees);
      }

      // Remove duplicates
      availableTrees = [...new Set(availableTrees)];
    }

    return availableTrees;
  }

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
      const talentPack = game.packs.get('swse.talents');
      if (talentPack) {
        this.talentData = await talentPack.getDocuments();
      }
    }

    // Get available talent trees
    const talentTrees = await this._getTalentTrees(this.selectedClass);

    // Show enhanced tree selection
    await TalentTreeVisualizer.showTreeSelection(
      talentTrees,
      this.talentData,
      this.actor,
      (talent) => this._selectTalent(talent.name)
    );
  }

  /**
   * Show enhanced talent tree for a specific tree
   */
  async _showEnhancedTalentTree(treeName) {
    // Load talent data if not already loaded
    if (!this.talentData) {
      const talentPack = game.packs.get('swse.talents');
      if (talentPack) {
        this.talentData = await talentPack.getDocuments();
      }
    }

    await TalentTreeVisualizer.showEnhancedTalentTree(
      treeName,
      this.talentData,
      this.actor,
      (talent) => this._selectTalent(talent.name)
    );
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
    const getsTalent = this._getsTalent();

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
        } else if (getsTalent) {
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
        } else if (getsTalent) {
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
        if (getsTalent) {
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
    const getsAbilityIncrease = this._getsAbilityIncrease();
    const getsBonusFeat = this._getsBonusFeat();
    const getsTalent = this._getsTalent();
    const characterClasses = this._getCharacterClasses();
    const isMulticlassing = Object.keys(characterClasses).length > 0 && !characterClasses[this.selectedClass?.name];
    const isBaseClass = this.selectedClass ? this._isBaseClass(this.selectedClass.name) : false;

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
        if (getsTalent) {
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
   * Get defense bonuses for a specific class
   * @param {string} className - Name of the class
   * @returns {{fortitude: number, reflex: number, will: number}} Defense bonuses
   */
  _getClassDefenseBonuses(className) {
    // Defense bonuses by class (applied once per class, NOT multiplied by level)
    // Format: Reflex/Fortitude/Will
    const defenseProgression = {
      // Base Classes
      'Jedi': { reflex: 1, fortitude: 1, will: 1 },
      'Noble': { reflex: 1, fortitude: 0, will: 2 },
      'Scout': { reflex: 2, fortitude: 1, will: 0 },
      'Soldier': { reflex: 1, fortitude: 2, will: 0 },
      'Scoundrel': { reflex: 2, fortitude: 0, will: 1 },

      // Prestige Classes - Core Rulebook
      'Ace Pilot': { reflex: 4, fortitude: 2, will: 0 },
      'Bounty Hunter': { reflex: 4, fortitude: 2, will: 0 },
      'Crime Lord': { reflex: 2, fortitude: 0, will: 4 },
      'Elite Trooper': { reflex: 2, fortitude: 4, will: 0 },
      'Force Adept': { reflex: 2, fortitude: 2, will: 4 },
      'Force Disciple': { reflex: 3, fortitude: 3, will: 6 },
      'Gunslinger': { reflex: 4, fortitude: 0, will: 2 },
      'Jedi Knight': { reflex: 2, fortitude: 2, will: 2 },
      'Jedi Master': { reflex: 3, fortitude: 3, will: 3 },
      'Officer': { reflex: 2, fortitude: 0, will: 4 },
      'Sith Apprentice': { reflex: 2, fortitude: 2, will: 2 },
      'Sith Lord': { reflex: 3, fortitude: 3, will: 3 },

      // Additional Prestige Classes
      'Corporate Agent': { reflex: 2, fortitude: 0, will: 4 },
      'Gladiator': { reflex: 4, fortitude: 2, will: 0 },
      'Melee Duelist': { reflex: 4, fortitude: 0, will: 2 },
      'Enforcer': { reflex: 4, fortitude: 0, will: 2 },
      'Independent Droid': { reflex: 2, fortitude: 0, will: 4 },
      'Infiltrator': { reflex: 4, fortitude: 0, will: 2 },
      'Master Privateer': { reflex: 2, fortitude: 0, will: 4 },
      'Medic': { reflex: 0, fortitude: 4, will: 2 },
      'Saboteur': { reflex: 2, fortitude: 0, will: 4 },
      'Assassin': { reflex: 4, fortitude: 2, will: 0 },
      'Charlatan': { reflex: 2, fortitude: 0, will: 4 },
      'Outlaw': { reflex: 4, fortitude: 2, will: 0 },
      'Droid Commander': { reflex: 2, fortitude: 2, will: 2 },
      'Military Engineer': { reflex: 2, fortitude: 2, will: 2 },
      'Vanguard': { reflex: 2, fortitude: 4, will: 0 },
      'Imperial Knight': { reflex: 2, fortitude: 2, will: 2 },
      'Shaper': { reflex: 0, fortitude: 2, will: 4 },
      'Improviser': { reflex: 2, fortitude: 0, will: 4 },
      'Pathfinder': { reflex: 2, fortitude: 4, will: 0 },
      'Martial Arts Master': { reflex: 2, fortitude: 4, will: 0 }
    };

    return defenseProgression[className] || { reflex: 0, fortitude: 0, will: 0 };
  }

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
   * Format: { reflex, fortitude, will }
   * @returns {{fortitude: number, reflex: number, will: number}}
   */
  _calculateDefenseBonuses() {
    const classItems = this.actor.items.filter(i => i.type === 'class');
    const bonuses = { fortitude: 0, reflex: 0, will: 0 };

    for (const classItem of classItems) {
      const className = classItem.name;

      // Check if class item has defenses specified (not multiplied by level!)
      if (classItem.system.defenses &&
          (classItem.system.defenses.fortitude || classItem.system.defenses.reflex || classItem.system.defenses.will)) {
        bonuses.fortitude += (classItem.system.defenses.fortitude || 0);
        bonuses.reflex += (classItem.system.defenses.reflex || 0);
        bonuses.will += (classItem.system.defenses.will || 0);
      } else {
        // Use known defense progressions
        const progression = this._getClassDefenseBonuses(className);
        bonuses.fortitude += progression.fortitude;
        bonuses.reflex += progression.reflex;
        bonuses.will += progression.will;

        // If defenses aren't set on the class item, update it to store them
        if (classItem.system.defenses === undefined ||
            (!classItem.system.defenses.fortitude && !classItem.system.defenses.reflex && !classItem.system.defenses.will)) {
          console.log(`SWSE LevelUp | Updating ${className} with defense bonuses: Fort +${progression.fortitude}, Ref +${progression.reflex}, Will +${progression.will}`);
          classItem.update({
            'system.defenses': {
              fortitude: progression.fortitude,
              reflex: progression.reflex,
              will: progression.will
            }
          });
        }
      }
    }

    return bonuses;
  }

  // ========================================
  // COMPLETE LEVEL UP
  // ========================================

  /**
   * Apply class features for a specific level
   * @param {Object} classDoc - The class document
   * @param {number} classLevel - The level in this class
   */
  async _applyClassFeatures(classDoc, classLevel) {
    const levelProgression = classDoc.system.level_progression;
    if (!levelProgression || !Array.isArray(levelProgression)) return;

    const levelData = levelProgression.find(lp => lp.level === classLevel);
    if (!levelData) return;

    console.log(`SWSE LevelUp | Applying class features for ${classDoc.name} level ${classLevel}:`, levelData);

    // Apply Force Points if specified
    if (levelData.force_points && levelData.force_points > 0) {
      const currentMax = this.actor.system.forcePoints?.max || 5;
      const newMax = currentMax + levelData.force_points;
      const currentValue = this.actor.system.forcePoints?.value || 5;
      const newValue = currentValue + levelData.force_points;

      await this.actor.update({
        "system.forcePoints.max": newMax,
        "system.forcePoints.value": newValue
      });

      console.log(`SWSE LevelUp | Increased Force Points by ${levelData.force_points} (${currentMax} → ${newMax})`);
      ui.notifications.info(`Force Points increased by ${levelData.force_points}!`);
    }

    // Process each feature that's not a choice (talents and feats are already handled)
    if (levelData.features) {
      for (const feature of levelData.features) {
        if (feature.type === 'proficiency' || feature.type === 'class_feature' || feature.type === 'feat_grant') {
          console.log(`SWSE LevelUp | Granting class feature: ${feature.name}`);

          // Create a feature item on the actor
          const featureItem = {
            name: feature.name,
            type: "feat", // Use feat type for class features
            img: "icons/svg/upgrade.svg",
            system: {
              description: `Class feature from ${classDoc.name} level ${classLevel}`,
              source: `${classDoc.name} ${classLevel}`,
              type: feature.type
            }
          };

          // Check if this feature already exists
          const existingFeature = this.actor.items.find(i =>
            i.name === feature.name && i.system.source === featureItem.system.source
          );

          if (!existingFeature) {
            await this.actor.createEmbeddedDocuments("Item", [featureItem]);
            ui.notifications.info(`Gained class feature: ${feature.name}`);
          }
        }
      }
    }
  }

  async _onCompleteLevelUp(event) {
    event.preventDefault();

    try {
      // If this is level 1, save the starting class for mentor system
      if (this.actor.system.level === 1) {
        await setLevel1Class(this.actor, this.selectedClass.name);
      }

      // Check if character already has this class
      const existingClass = this.actor.items.find(i => i.type === 'class' && i.name === this.selectedClass.name);

      // Calculate what level in this class the character will be
      const classLevel = existingClass ? (existingClass.system.level || 0) + 1 : 1;

      if (existingClass) {
        // Level up existing class
        await existingClass.update({
          'system.level': classLevel
        });
      } else {
        // Create new class item with full class data
        // Get defense bonuses for this class
        const defenses = this.selectedClass.system.defenses?.fortitude ||
                        this.selectedClass.system.defenses?.reflex ||
                        this.selectedClass.system.defenses?.will
          ? this.selectedClass.system.defenses
          : this._getClassDefenseBonuses(this.selectedClass.name);

        const classItem = {
          name: this.selectedClass.name,
          type: "class",
          img: this.selectedClass.img,
          system: {
            level: 1,
            hitDie: this.selectedClass.system.hit_die || this.selectedClass.system.hitDie || "1d6",
            babProgression: this.selectedClass.system.babProgression || 0.75,
            defenses: {
              fortitude: defenses.fortitude || 0,
              reflex: defenses.reflex || 0,
              will: defenses.will || 0
            },
            description: this.selectedClass.system.description || '',
            classSkills: this.selectedClass.system.classSkills || [],
            talentTrees: this.selectedClass.system.talentTrees || [],
            forceSensitive: this.selectedClass.system.forceSensitive || false
          }
        };

        console.log(`SWSE LevelUp | Creating ${classItem.name} with defense bonuses: Fort +${classItem.system.defenses.fortitude}, Ref +${classItem.system.defenses.reflex}, Will +${classItem.system.defenses.will}`);

        await this.actor.createEmbeddedDocuments("Item", [classItem]);
      }

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

      // Apply class features for this level
      await this._applyClassFeatures(this.selectedClass, classLevel);

      // Recalculate BAB and defense bonuses from all class items
      const totalBAB = this._calculateTotalBAB();
      const defenseBonuses = this._calculateDefenseBonuses();

      console.log(`SWSE LevelUp | Updating BAB to ${totalBAB}`);
      console.log(`SWSE LevelUp | Updating defense bonuses: Fort +${defenseBonuses.fortitude}, Ref +${defenseBonuses.reflex}, Will +${defenseBonuses.will}`);

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
