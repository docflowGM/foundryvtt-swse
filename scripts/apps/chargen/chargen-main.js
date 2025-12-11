// ============================================
// Main CharacterGenerator class
// Orchestrates all chargen functionality
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { PrerequisiteValidator } from '../../utils/prerequisite-validator.js';
import { getTalentTreeName, getClassProperty, getTalentTrees, getHitDie } from './chargen-property-accessor.js';

// Import all module functions
import * as SharedModule from './chargen-shared.js';
import { ChargenDataCache } from './chargen-shared.js';
import * as DroidModule from './chargen-droid.js';
import * as SpeciesModule from './chargen-species.js';
import * as BackgroundsModule from './chargen-backgrounds.js';
import * as ClassModule from './chargen-class.js';
import * as AbilitiesModule from './chargen-abilities.js';
import * as SkillsModule from './chargen-skills.js';
import * as LanguagesModule from './chargen-languages.js';
import * as FeatsTalentsModule from './chargen-feats-talents.js';
import * as ForcePowersModule from './chargen-force-powers.js';

export default class CharacterGenerator extends Application {
  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor;
    this.actorType = options.actorType || "character"; // "character" for PCs, "npc" for NPCs
    this.characterData = {
      name: "",
      isDroid: false,
      droidDegree: "",
      droidSize: "medium",
      species: "",
      size: "Medium",  // Character size (Small, Medium, Large)
      specialAbilities: [],  // Racial special abilities
      languages: [],  // Known languages
      racialSkillBonuses: [],  // Racial skill bonuses (e.g., "+2 Perception")
      speciesSource: "",  // Source book for species
      background: null,  // Selected background (Event, Occupation, or Planet)
      backgroundCategory: "events",  // Current background category tab
      backgroundSkills: [],  // Skills selected from background
      backgroundNarratorComment: "",  // Ol' Salty's comment for current category
      allowHomebrewPlanets: false,  // Toggle for homebrew planets
      occupationBonus: null,  // Occupation untrained skill bonuses
      importedDroidData: null,
      preselectedSkills: [],
      droidSystems: {
        locomotion: null,
        processor: { name: "Heuristic Processor", cost: 0, weight: 5 }, // Free
        appendages: [
          { name: "Hand", cost: 0, weight: 5 }, // Free
          { name: "Hand", cost: 0, weight: 5 }  // Free
        ],
        accessories: [],
        totalCost: 0,
        totalWeight: 10
      },
      droidCredits: {
        base: 1000,
        class: 0,
        spent: 0,
        remaining: 1000
      },
      classes: [],
      abilities: {
        str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
      },
      skills: {},
      feats: [],
      featsRequired: 1, // Base 1, +1 for Human
      talents: [],
      powers: [],
      forcePowersRequired: 0, // Calculated based on Force Sensitivity and Force Training feats
      level: 1,
      hp: { value: 1, max: 1, temp: 0 },
      forcePoints: { value: 0, max: 0, die: "1d6" },
      destinyPoints: { value: 1 },
      secondWind: { uses: 1, max: 1, misc: 0, healing: 0 },
      defenses: {
        fortitude: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 },
        reflex: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 },
        will: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10 }
      },
      bab: 0,
      speed: 6,
      damageThresholdMisc: 0,
      credits: 1000  // Starting credits
    };
    this.currentStep = "name";
    this.selectedTalentTree = null;  // For two-step talent selection
    this.freeBuild = false;  // Free build mode bypasses validation

    // Caches for compendia
    this._packs = {
      species: null,
      feats: null,
      talents: null,
      classes: null,
      droids: null,
      forcePowers: null
    };
    this._skillsJson = null;
    this._featMetadata = null;

    // If an actor is provided, populate characterData from it
    if (this.actor) {
      this._loadFromActor(actor);
    }
  }

  /**
   * Load character data from an existing actor
   * @param {Actor} actor - The actor to load from
   * @private
   */
  _loadFromActor(actor) {
    const system = actor.system;

    // Load basic info
    this.characterData.name = actor.name || "";
    this.characterData.level = system.level || 0;

    // Load species/droid status
    if (system.species) {
      this.characterData.species = system.species;
      this.characterData.isDroid = false;
    }
    if (system.isDroid) {
      this.characterData.isDroid = true;
      this.characterData.droidDegree = system.droidDegree || "";
      this.characterData.droidSize = system.size || "medium";
    }

    // Load abilities
    if (system.abilities) {
      for (const [key, value] of Object.entries(system.abilities)) {
        if (this.characterData.abilities[key]) {
          this.characterData.abilities[key].total = value.total || value.value || 10;
          this.characterData.abilities[key].base = value.base || value.value || 10;
        }
      }
    }

    // Load classes
    const classItems = actor.items.filter(item => item.type === 'class');
    this.characterData.classes = classItems.map(cls => ({
      name: cls.name,
      level: cls.system.level || 1
    }));

    // Load existing items as references
    this.characterData.feats = actor.items.filter(item => item.type === 'feat').map(f => f.name);
    this.characterData.talents = actor.items.filter(item => item.type === 'talent').map(t => t.name);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "chargen"],
      template: "systems/foundryvtt-swse/templates/apps/chargen.hbs",
      width: 900,
      height: 700,
      title: "Character Generator",
      resizable: true,
      draggable: true,
      scrollY: [".chargen-content", ".step-content", ".window-content"],
      left: null,  // Allow Foundry to center
      top: null    // Allow Foundry to center
    });
  }

  async _loadData() {
    // Show loading notification (only if cache is empty)
    const showLoading = !ChargenDataCache.isCached();
    const loadingNotif = showLoading ? ui.notifications.info(
      "Loading character generation data...",
      { permanent: true }
    ) : null;

    try {
      // Use cached data if available, otherwise load
      const cachedPacks = await ChargenDataCache.getData();
      this._packs = foundry.utils.deepClone(cachedPacks);

      // Validate critical packs
      const criticalPacks = ['species', 'classes', 'feats'];
      const missingCriticalPacks = [];

      for (const key of criticalPacks) {
        if (!this._packs[key] || this._packs[key].length === 0) {
          missingCriticalPacks.push(`swse.${key}`);
        }
      }

      // Block chargen if critical packs are missing
      if (missingCriticalPacks.length > 0) {
        const missingList = missingCriticalPacks.join(', ');
        ui.notifications.error(
          `Character generation cannot continue. Missing critical compendium packs: ${missingList}. Please ensure all SWSE compendium packs are properly installed.`,
          { permanent: true }
        );
        SWSELogger.error(`chargen: blocking due to missing critical packs: ${missingList}`);
        this.close();
        return false;
      }

      // Load skills
      try {
        const resp = await fetch("systems/foundryvtt-swse/data/skills.json");
        if (resp.ok) {
          this._skillsJson = await resp.json();
          SWSELogger.log("chargen: skills.json loaded successfully");
        } else {
          SWSELogger.warn("chargen: failed to fetch skills.json, using defaults");
          this._skillsJson = this._getDefaultSkills();
          ui.notifications.warn("Failed to load skills data. Using defaults.");
        }
      } catch (e) {
        SWSELogger.error("chargen: error loading skills.json:", e);
        this._skillsJson = this._getDefaultSkills();
        ui.notifications.warn("Failed to load skills data. Using defaults.");
      }

      // Load feat metadata
      try {
        const resp = await fetch("systems/foundryvtt-swse/data/feat-metadata.json");
        if (resp.ok) {
          this._featMetadata = await resp.json();
          SWSELogger.log("chargen: feat-metadata.json loaded successfully");
        } else {
          SWSELogger.warn("chargen: failed to fetch feat-metadata.json");
          this._featMetadata = null;
        }
      } catch (e) {
        SWSELogger.error("chargen: error loading feat-metadata.json:", e);
        this._featMetadata = null;
      }

      return true;
    } finally {
      // Clear loading notification
      if (loadingNotif) {
        loadingNotif.remove();
      }
    }
  }

  async getData() {
    const context = super.getData();
    if (!this._packs.species) {
      const loaded = await this._loadData();
      if (loaded === false) {
        // Critical packs missing, chargen will close
        return context;
      }
    }

    context.characterData = this.characterData;
    context.currentStep = this.currentStep;
    context.isLevelUp = !!this.actor;
    context.freeBuild = this.freeBuild;
    context.packs = foundry.utils.deepClone(this._packs);
    context.skillsJson = this._skillsJson || [];

    // Helper function for chevron navigation
    const steps = this._getSteps();
    const currentIndex = steps.indexOf(this.currentStep);
    context.stepIsPrevious = (step) => {
      const stepIndex = steps.indexOf(step);
      return stepIndex >= 0 && stepIndex < currentIndex;
    };

    // Sort species by source material (Core first, then alphabetically)
    if (context.packs.species) {
      context.packs.species = this._sortSpeciesBySource(context.packs.species);
    }

    // Calculate half level for display
    context.halfLevel = Math.floor(this.characterData.level / 2);

    // Droid degree data
    context.droidDegrees = [
      { key: "1st-degree", name: "1st-Degree Droid", bonuses: "+2 INT, +2 WIS, -2 STR", description: "Medical and scientific droids" },
      { key: "2nd-degree", name: "2nd-Degree Droid", bonuses: "+2 INT, -2 CHA", description: "Engineering and technical droids" },
      { key: "3rd-degree", name: "3rd-Degree Droid", bonuses: "+2 WIS, +2 CHA, -2 STR", description: "Protocol and service droids" },
      { key: "4th-degree", name: "4th-Degree Droid", bonuses: "+2 DEX, -2 INT, -2 CHA", description: "Security and military droids" },
      { key: "5th-degree", name: "5th-Degree Droid", bonuses: "+4 STR, -4 INT, -4 CHA", description: "Labor and utility droids" }
    ];

    // Filter to only show core SWSE classes and add metadata
    if (context.packs.classes) {
      const coreClasses = ["Jedi", "Noble", "Scout", "Scoundrel", "Soldier"];
      context.packs.classes = context.packs.classes.filter(c => {
        return coreClasses.includes(c.name);
      });

      // Further filter for level 0 droids (no Jedi classes)
      if (this.characterData.isDroid && this.characterData.level === 0) {
        context.packs.classes = context.packs.classes.filter(c => {
          const className = (c.name || "").toLowerCase();
          return !className.includes("jedi");
        });
      }

      // Add icons and descriptions to classes
      context.packs.classes = context.packs.classes.map(c => {
        const classMetadata = this._getClassMetadata(c.name);
        return {
          ...c,
          icon: classMetadata.icon,
          description: classMetadata.description
        };
      });
    }

    // Filter feats based on prerequisites
    if (context.packs.feats) {
      // NONHEROIC RULE: Filter to restricted feat list for NPCs
      if (this.actorType === "npc") {
        const nonheroicFeats = [
          "Armor Proficiency (Light)",
          "Armor Proficiency (Medium)",
          "Skill Focus",
          "Skill Training",
          "Weapon Proficiency (Advanced Melee Weapons)",
          "Weapon Proficiency (Heavy Weapons)",
          "Weapon Proficiency (Pistols)",
          "Weapon Proficiency (Rifles)",
          "Weapon Proficiency (Simple Weapons)"
        ];

        context.packs.feats = context.packs.feats.filter(f => {
          return nonheroicFeats.some(allowed => f.name.includes(allowed));
        });

        SWSELogger.log(`CharGen | NPC mode: Filtered to ${context.packs.feats.length} nonheroic feats`);

        // Organize by category
        if (this._featMetadata && this._featMetadata.categories) {
          context.featCategories = this._organizeFeatsByCategory(context.packs.feats);
          context.featCategoryList = Object.keys(this._featMetadata.categories)
            .map(key => ({ key, ...this._featMetadata.categories[key] }))
            .sort((a, b) => a.order - b.order);
        }
      }
      // In Free Build mode or for level 1 characters, show all feats without strict filtering
      else if (this.freeBuild || this.characterData.level === 1) {
        SWSELogger.log(`CharGen | Showing all feats (Free Build: ${this.freeBuild}, Level: ${this.characterData.level})`);

        // Still organize feats by category for better UX
        if (this._featMetadata && this._featMetadata.categories) {
          context.featCategories = this._organizeFeatsByCategory(context.packs.feats);
          // Store category keys sorted by order
          context.featCategoryList = Object.keys(this._featMetadata.categories)
            .map(key => ({ key, ...this._featMetadata.categories[key] }))
            .sort((a, b) => a.order - b.order);
        }
      } else {
        // Create a temporary actor-like object for prerequisite checking during character generation
        const tempActor = this.actor || this._createTempActorForValidation();

        // Prepare pending data
        const pendingData = {
          selectedFeats: this.characterData.feats || [],
          selectedClass: this.characterData.classes?.[0],
          abilityIncreases: {},
          selectedSkills: Object.keys(this.characterData.skills).filter(k => this.characterData.skills[k]?.trained),
          selectedTalents: this.characterData.talents || []
        };

        // Filter feats based on prerequisites (show all qualified feats, not just class bonus feats)
        const filteredFeats = PrerequisiteValidator.filterQualifiedFeats(context.packs.feats, tempActor, pendingData);
        context.packs.feats = filteredFeats.filter(f => f.isQualified);
        context.packs.allFeats = filteredFeats; // Include all feats with qualification status

        SWSELogger.log(`CharGen | Filtered feats: ${context.packs.feats.length} qualified out of ${filteredFeats.length} total`);

        // Organize feats by category
        if (this._featMetadata && this._featMetadata.categories) {
          context.featCategories = this._organizeFeatsByCategory(context.packs.feats);
          // Store category keys sorted by order
          context.featCategoryList = Object.keys(this._featMetadata.categories)
            .map(key => ({ key, ...this._featMetadata.categories[key] }))
            .sort((a, b) => a.order - b.order);
        }
      }

      // Store class bonus feats separately for when we need to show only those
      if (this.characterData.classes && this.characterData.classes.length > 0) {
        const selectedClass = this.characterData.classes[0];
        const className = selectedClass.name || selectedClass;
        const bonusFeats = context.packs.feats.filter(f => {
          const bonusFeatFor = f.system?.bonus_feat_for || [];
          return bonusFeatFor.includes(className);
        });
        context.packs.classBonusFeats = bonusFeats;
        SWSELogger.log(`CharGen | Available class bonus feats for ${className}: ${bonusFeats.length}`);
      }
    }

    // Talent trees and filtering
    context.availableTalentTrees = this._getAvailableTalentTrees();
    context.selectedTalentTree = this.selectedTalentTree;

    // Filter talents by selected tree (if a tree is selected)
    if (this.selectedTalentTree && context.packs.talents) {
      const selectedTree = this.selectedTalentTree.toLowerCase().trim();
      context.packs.talentsInTree = context.packs.talents.filter(t => {
        // Use property accessor to get talent tree name
        const talentTree = getTalentTreeName(t);
        const talentName = t.name || '';

        // Compare case-insensitive and trimmed
        const treeMatch = talentTree.toLowerCase().trim() === selectedTree;

        // Also check if talent name starts with tree name (e.g., "Lightsaber Combat - Deflect")
        const nameMatch = talentName.toLowerCase().includes(selectedTree.replace(/\s+/g, '').toLowerCase());

        return treeMatch || nameMatch;
      });
      SWSELogger.log(`CharGen | Talents in tree "${this.selectedTalentTree}": ${context.packs.talentsInTree.length}`, context.packs.talentsInTree.map(t => t.name));
    } else {
      context.packs.talentsInTree = [];
    }

    // Force powers
    context.characterData.forcePowersRequired = this._getForcePowersNeeded();
    context.availableForcePowers = await this._getAvailableForcePowers();
    SWSELogger.log(`CharGen | Force powers required: ${context.characterData.forcePowersRequired}, available: ${context.availableForcePowers.length}`);

    // Point buy pools
    context.droidPointBuyPool = game.settings.get("swse", "droidPointBuyPool") || 20;
    context.livingPointBuyPool = game.settings.get("swse", "livingPointBuyPool") || 25;

    // Seraphim's dialogue for droid creation
    if (this.characterData.isDroid) {
      context.seraphimDialogue = this._getSeraphimDialogue();
    }

    // Skills count for skills step
    context.characterData.trainedSkillsCount = Object.values(this.characterData.skills).filter(s => s.trained).length;

    // Get class skills for the selected class
    const selectedClass = this.characterData.classes && this.characterData.classes.length > 0
      ? this._packs.classes?.find(c => c.name === this.characterData.classes[0].name)
      : null;
    const classSkills = selectedClass ? getClassProperty(selectedClass, 'classSkills', []) : [];

    // Available skills for selection with bonuses
    const halfLevel = Math.floor(this.characterData.level / 2);
    // Get background class skills
    const backgroundClassSkills = this._getBackgroundClassSkills ? this._getBackgroundClassSkills() : [];

    context.availableSkills = this._getAvailableSkills().map(skill => {
      const abilityMod = this.characterData.abilities[skill.ability]?.mod || 0;
      const isTrained = this.characterData.skills[skill.key]?.trained || false;

      // Check if skill is a class skill from class OR background
      const isClassSkillFromClass = classSkills.some(cs =>
        cs.toLowerCase().includes(skill.name.toLowerCase()) ||
        skill.name.toLowerCase().includes(cs.toLowerCase())
      );
      const isClassSkillFromBackground = backgroundClassSkills.includes(skill.key);
      const isClassSkill = isClassSkillFromClass || isClassSkillFromBackground;

      const baseBonus = halfLevel + abilityMod;
      const currentBonus = baseBonus + (isTrained ? 5 : 0);
      const trainedBonus = baseBonus + 5;

      return {
        ...skill,
        trained: isTrained,
        isClassSkill: isClassSkill,
        isBackgroundSkill: isClassSkillFromBackground, // Mark skills that came from background
        currentBonus: currentBonus,
        trainedBonus: trainedBonus,
        abilityMod: abilityMod,
        halfLevel: halfLevel
      };
    });

    // Language data for languages step
    if (this.currentStep === 'languages') {
      // Initialize languages if not already done
      if (!this.characterData.languageData) {
        await this._initializeLanguages();
      }

      // Get available languages organized by category
      context.languageCategories = await this._getAvailableLanguages();
    }

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Ensure html is jQuery object for compatibility
    const $html = html instanceof jQuery ? html : $(html);

    // Activate Foundry tooltips for feat descriptions
    if (game.tooltip) {
      game.tooltip.activate(html[0] || html, {
        selector: '[data-tooltip]'
      });
    }

    // Free Build toggle
    $html.find('.free-build-toggle').change(this._onToggleFreeBuild.bind(this));

    // Navigation
    $html.find('.next-step').click(this._onNextStep.bind(this));
    $html.find('.prev-step').click(this._onPrevStep.bind(this));

    // Chevron step navigation (clickable for previous steps or in Free Build mode)
    $html.find('.chevron-step.clickable').click(this._onJumpToStep.bind(this));
    $html.find('.finish').click(this._onFinish.bind(this));

    // Selections
    $html.find('.select-type').click(this._onSelectType.bind(this));
    $html.find('.select-degree').click(this._onSelectDegree.bind(this));
    $html.find('.select-size').click(this._onSelectSize.bind(this));
    $html.find('.import-droid-btn').click(this._onImportDroid.bind(this));
    $html.find('.select-species').click(this._onSelectSpecies.bind(this));
    $html.find('.select-class').click(this._onSelectClass.bind(this));
    $html.find('.class-choice-btn').click(this._onSelectClass.bind(this));
    $html.find('.select-feat').click(this._onSelectFeat.bind(this));
    $html.find('.remove-feat').click(this._onRemoveFeat.bind(this));
    $html.find('.select-talent-tree').click(this._onSelectTalentTree.bind(this));
    $html.find('.back-to-talent-trees').click(this._onBackToTalentTrees.bind(this));
    $html.find('.select-talent').click(this._onSelectTalent.bind(this));
    $html.find('.select-power').click(this._onSelectForcePower.bind(this));
    $html.find('.remove-power').click(this._onRemoveForcePower.bind(this));
    $html.find('.skill-select').change(this._onSkillSelect.bind(this));
    $html.find('.train-skill-btn').click(this._onTrainSkill.bind(this));
    $html.find('.untrain-skill-btn').click(this._onUntrainSkill.bind(this));
    $html.find('.reset-skills-btn').click(this._onResetSkills.bind(this));

    // Language selection
    $html.find('.select-language').click(this._onSelectLanguage.bind(this));
    $html.find('.remove-language').click(this._onRemoveLanguage.bind(this));
    $html.find('.reset-languages-btn').click(this._onResetLanguages.bind(this));
    $html.find('.add-custom-language-btn').click(this._onAddCustomLanguage.bind(this));

    // Droid builder/shop
    $html.find('.shop-tab').click(this._onShopTabClick.bind(this));
    $html.find('.accessory-tab').click(this._onAccessoryTabClick.bind(this));
    $html.find('.purchase-system').click(this._onPurchaseSystem.bind(this));
    $html.find('.remove-system').click(this._onRemoveSystem.bind(this));

    // Name input - use 'input' event to capture changes in real-time
    $html.find('input[name="character-name"]').on('input change', (ev) => {
      this.characterData.name = ev.target.value;
    });

    // Level input
    $html.find('input[name="target-level"]').on('input change', (ev) => {
      this.targetLevel = parseInt(ev.target.value) || 1;
    });

    // Shop button
    $html.find('.open-shop-btn').click(this._onOpenShop.bind(this));

    // Abilities UI
    if (this.currentStep === "abilities") {
      this._bindAbilitiesUI($html[0]);
    }

    // Skills UI
    if (this.currentStep === "skills") {
      this._bindSkillsUI($html[0]);
    }

    // Droid Builder UI
    if (this.currentStep === "droid-builder") {
      this._populateDroidBuilder($html[0]);
    }

    // Class change
    $html.find('[name="class_select"]').change(async (ev) => {
      await this._onClassChanged(ev, $html[0]);
    });

    // Background step - render cards if on background step
    if (this.currentStep === "background") {
      const bgContainer = $html.find('#background-selection-grid')[0];
      if (bgContainer && !this.characterData.background) {
        this._renderBackgroundCards(bgContainer);
      }

      // Update narrator comment
      if (!this.characterData.backgroundNarratorComment) {
        const category = this.characterData.backgroundCategory || 'events';
        this.characterData.backgroundNarratorComment = this._getBackgroundNarratorComment(category);
      }
    }
  }

  _getSteps() {
    if (this.actor) {
      return ["class", "feats", "talents", "skills", "languages", "summary"];
    }

    // Include type selection (living/droid) after name
    const steps = ["name", "type"];

    // If droid, show degree and size selection; if living, show species
    if (this.characterData.isDroid) {
      steps.push("degree", "size", "droid-builder");
    } else {
      steps.push("species");
    }

    // NPC workflow: skip class and talents, go straight to abilities/skills/languages/feats
    if (this.actorType === "npc") {
      steps.push("abilities", "skills", "languages", "feats", "summary");
    } else {
      // PC workflow: normal flow with class and talents
      // Note: skills before feats to allow Skill Focus validation
      steps.push("abilities", "class", "skills", "feats", "talents");

      // Add force powers step if character is Force-sensitive
      if (this.characterData.forceSensitive && this._getForcePowersNeeded() > 0) {
        steps.push("force-powers");
      }

      steps.push("summary", "shop");
    }
    return steps;
  }

  async _onNextStep(event) {
    event.preventDefault();

    // Capture name from input before validation (in case the input event hasn't fired yet)
    if (this.currentStep === "name") {
      const form = event.currentTarget.closest('.chargen-app');
      const nameInput = form?.querySelector('input[name="character-name"]');
      if (nameInput) {
        this.characterData.name = nameInput.value;
      }
    }

    // Validate current step
    if (!this._validateCurrentStep()) {
      return;
    }

    const steps = this._getSteps();
    const idx = steps.indexOf(this.currentStep);
    if (idx >= 0 && idx < steps.length - 1) {
      let nextStep = steps[idx + 1];

      // Auto-skip languages step if no additional languages to select
      if (nextStep === "languages") {
        await this._initializeLanguages();
        const languageData = this.characterData.languageData;
        if (languageData && languageData.additional <= 0) {
          // Skip languages step - move to next step
          SWSELogger.log("CharGen | Auto-skipping languages step (no additional languages to select)");
          const languagesIdx = steps.indexOf("languages");
          if (languagesIdx >= 0 && languagesIdx < steps.length - 1) {
            nextStep = steps[languagesIdx + 1];
          }
        }
      }

      // Create character when moving from summary to shop
      if (this.currentStep === "summary" && nextStep === "shop") {
        this._finalizeCharacter();
        if (!this.actor) {
          // Validate before creating
          const isValid = await this._validateFinalCharacter();
          if (!isValid) {
            return; // Don't proceed to shop if validation fails
          }
          await this._createActor();
        }
      }

      this.currentStep = nextStep;

      // Auto-calculate derived values when moving forward
      if (this.currentStep === "summary") {
        this._finalizeCharacter();
      }

      await this.render();
    }
  }

  async _onPrevStep(event) {
    event.preventDefault();
    const steps = this._getSteps();
    const idx = steps.indexOf(this.currentStep);
    if (idx > 0) {
      this.currentStep = steps[idx - 1];
      await this.render();
    }
  }

  async _onJumpToStep(event) {
    event.preventDefault();
    event.stopPropagation();

    const targetStep = event.currentTarget.dataset.step;
    const steps = this._getSteps();

    if (!steps.includes(targetStep)) {
      SWSELogger.warn(`CharGen | Invalid step: ${targetStep}`);
      return;
    }

    // Check if step is clickable (previous or free build mode)
    const currentIndex = steps.indexOf(this.currentStep);
    const targetIndex = steps.indexOf(targetStep);

    if (!this.freeBuild && targetIndex > currentIndex) {
      ui.notifications.warn("You cannot jump forward to future steps.");
      return;
    }

    SWSELogger.log(`CharGen | Jumping to step: ${targetStep}`);
    this.currentStep = targetStep;
    await this.render();
  }

  /**
   * Toggle free build mode
   */
  async _onToggleFreeBuild(event) {
    const checkbox = event.currentTarget;
    const wantsToEnable = checkbox.checked;

    // If enabling, ask for confirmation first
    if (wantsToEnable && !this.freeBuild) {
      const confirmed = await Dialog.confirm({
        title: "Enable Free Build Mode?",
        content: `
          <div style="margin-bottom: 10px;">
            <p><i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i> <strong>Enable Free Build Mode?</strong></p>
            <p>Free Build Mode removes all validation and restrictions.</p>
            <p style="margin-top: 10px;">You will be able to:</p>
            <ul style="margin-left: 20px; margin-top: 5px;">
              <li>✓ Skip validation requirements</li>
              <li>✓ Select any feats or talents (ignore prerequisites)</li>
              <li>✓ Train any skills without class restrictions</li>
              <li>✓ Jump between steps freely</li>
              <li>✓ Set any ability scores</li>
            </ul>
            <p style="margin-top: 15px; padding: 10px; background: rgba(255, 107, 107, 0.1); border-left: 3px solid #ff6b6b;">
              <strong>Warning:</strong> This is intended for experienced users who understand SWSE rules.
              Characters created in Free Build mode may not follow standard rules.
            </p>
          </div>
        `,
        defaultYes: false
      });

      if (!confirmed) {
        // User cancelled, uncheck the checkbox
        checkbox.checked = false;
        return;
      }

      // User confirmed, enable free build
      this.freeBuild = true;
      ui.notifications.info("Free Build Mode enabled. All restrictions removed.");
    } else if (!wantsToEnable && this.freeBuild) {
      // Disabling free build mode
      this.freeBuild = false;
      ui.notifications.info("Free Build Mode disabled. Validation rules will now apply.");
    }

    await this.render();
  }

  _validateCurrentStep() {
    // Skip validation if free build is enabled
    if (this.freeBuild) {
      return true;
    }
    switch (this.currentStep) {
      case "name":
        if (!this.characterData.name || this.characterData.name.trim() === "") {
          ui.notifications.warn("Please enter a character name.");
          return false;
        }
        break;
      case "type":
        // Type is set by button click, isDroid will be true or false
        break;
      case "degree":
        if (!this.characterData.droidDegree) {
          ui.notifications.warn("Please select a droid degree.");
          return false;
        }
        break;
      case "size":
        if (!this.characterData.droidSize) {
          ui.notifications.warn("Please select a droid size.");
          return false;
        }
        break;
      case "droid-builder":
        return this._validateDroidBuilder();
      case "species":
        if (!this.characterData.species) {
          ui.notifications.warn("Please select a species.");
          return false;
        }
        break;
      case "abilities":
        // Validate that ability scores are properly set
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const allSet = abilities.every(ab => {
          const base = this.characterData.abilities[ab]?.base;
          return base !== undefined && base >= 8 && base <= 18;
        });

        if (!allSet) {
          ui.notifications.warn("Please set all ability scores.");
          return false;
        }

        // Only validate point buy budget if point buy method was used
        if (this.characterData.abilityGenerationMethod === 'point-mode') {
          // Validate point buy budget (rough check)
          // Calculate points spent based on current ability scores
          const pointCosts = (value) => {
            let cost = 0;
            for (let v = 8; v < value; v++) {
              if (v < 12) cost += 1;
              else if (v < 14) cost += 2;
              else cost += 3;
            }
            return cost;
          };

          const totalSpent = abilities.reduce((sum, ab) => {
            return sum + pointCosts(this.characterData.abilities[ab]?.base || 8);
          }, 0);

          // Get the correct point buy pool based on character type
          const pointBuyPool = this.characterData.isDroid
            ? (game.settings.get("swse", "droidPointBuyPool") || 20)
            : (game.settings.get("swse", "livingPointBuyPool") || 25);

          // Allow some flexibility (within 2 points of the budget)
          if (totalSpent > pointBuyPool) {
            ui.notifications.warn(`You've overspent your point buy budget! (${totalSpent}/${pointBuyPool} points)`);
            return false;
          }

          if (totalSpent < pointBuyPool - 2) {
            ui.notifications.warn(`You still have ${pointBuyPool - totalSpent} point buy points to spend. Use them all!`);
            return false;
          }
        }
        break;
      case "class":
        if (this.characterData.classes.length === 0) {
          ui.notifications.warn("Please select a class.");
          return false;
        }
        break;
    }
    return true;
  }

  /**
   * Validate final character data before creation
   * This runs EVEN in free build mode to prevent broken characters
   * @returns {Promise<boolean>} True if valid, false otherwise
   */
  async _validateFinalCharacter() {
    const errors = [];

    // Always required: Character name
    if (!this.characterData.name || this.characterData.name.trim() === '') {
      errors.push("Character must have a name");
    }

    // Droid-specific minimum validation
    if (this.characterData.isDroid) {
      if (!this.characterData.droidSystems?.locomotion) {
        errors.push("Droids must have a locomotion system");
      }
      if (!this.characterData.droidSystems?.processor) {
        errors.push("Droids must have a processor");
      }
      if (!this.characterData.droidDegree) {
        errors.push("Droids must have a degree selected");
      }
    }

    // Living beings need a species
    if (!this.characterData.isDroid && !this.characterData.species) {
      errors.push("Living characters must have a species");
    }

    // Class required for all characters
    if (!this.characterData.classes || this.characterData.classes.length === 0) {
      errors.push("Character must have at least one class");
    }

    // Show errors
    if (errors.length > 0) {
      if (!this.freeBuild) {
        // In normal mode, just show the errors and block
        ui.notifications.error(`Validation errors:\n${errors.join('\n')}`);
        return false;
      } else {
        // In free build mode, show a confirmation dialog
        const confirmed = await Dialog.confirm({
          title: "Validation Warnings",
          content: `
            <p><strong>The following issues were found:</strong></p>
            <ul>
              ${errors.map(e => `<li>${e}</li>`).join('')}
            </ul>
            <p>Creating a character with these issues may cause problems.</p>
            <p><strong>Continue anyway?</strong></p>
          `,
          defaultYes: false
        });
        return confirmed;
      }
    }

    return true;
  }

  _finalizeCharacter() {
    // Final recalculations before character creation
    this._recalcAbilities();
    this._recalcDefenses();
    
    // Second Wind
    const conMod = this.characterData.abilities.con.mod || 0;
    const hpMax = this.characterData.hp.max;
    this.characterData.secondWind.healing = Math.max(Math.floor(hpMax / 4), conMod) + 
      (this.characterData.secondWind.misc || 0);
    
    // Damage Threshold = Fortitude Defense
    this.characterData.damageThreshold = this.characterData.defenses.fortitude.total;
  }

  async _onFinish(event) {
    event.preventDefault();

    this._finalizeCharacter();

    // Perform minimal validation even in free build mode
    const isValid = await this._validateFinalCharacter();
    if (!isValid) {
      return; // Don't proceed if validation fails
    }

    if (this.actor) {
      await this._updateActor();
    } else {
      await this._createActor();
    }

    this.close();
  }

  async _onOpenShop(event) {
    event.preventDefault();

    // Ensure character has been created
    if (!this.actor) {
      this._finalizeCharacter();

      // Validate before creating
      const isValid = await this._validateFinalCharacter();
      if (!isValid) {
        return; // Don't open shop if validation fails
      }

      await this._createActor();
    }

    // Import and open the store
    try {
      const { SWSEStore } = await import('../store.js');
      const store = new SWSEStore(this.actor);
      store.render(true);
    } catch (err) {
      SWSELogger.error("SWSE | Failed to open store:", err);
      ui.notifications.error("Failed to open the shop. You can access it from your character sheet.");
    }
  }

  async _createActor() {
    // Build proper actor data structure matching SWSEActorSheet expectations
    // Note: The actor system uses 'race' as the property name for species data
    // IMPORTANT: CharacterDataModel uses 'attributes' not 'abilities'
    // Convert abilities → attributes to match DataModel schema
    const attributes = {};
    for (const [key, ability] of Object.entries(this.characterData.abilities)) {
      attributes[key] = {
        base: ability.base || 10,
        racial: ability.racial || 0,
        enhancement: 0, // No enhancements at character creation
        temp: ability.temp || 0
      };
    }

    // Build skills object (using camelCase keys)
    const skills = {};
    for (const [key, skill] of Object.entries(this.characterData.skills || {})) {
      skills[key] = {
        trained: skill.trained || false,
        focused: skill.focused || false,
        miscMod: skill.misc || 0,
        selectedAbility: skill.selectedAbility || this._getDefaultAbilityForSkill(key)
      };
    }

    const system = {
      level: this.characterData.level,
      race: this.characterData.species,  // Map species → race for actor system
      size: this.characterData.size || "medium", // Lowercase for DataModel schema
      isDroid: this.characterData.isDroid || false, // DataModel requires this field
      droidDegree: this.characterData.droidDegree || "", // DataModel field for droids
      attributes: attributes, // Use attributes instead of abilities
      skills: skills, // Normalized skills with DataModel structure
      hp: this.characterData.hp,
      forcePoints: this.characterData.forcePoints,
      forceSensitive: this.characterData.forceSensitive || false, // Persist force sensitivity flag
      destinyPoints: this.characterData.destinyPoints,
      secondWind: this.characterData.secondWind,
      defenses: this.characterData.defenses,
      classes: this.characterData.classes,
      bab: this.characterData.bab,
      speed: this.characterData.speed,
      damageThresholdMisc: this.characterData.damageThresholdMisc || 0,
      credits: this.characterData.isDroid
        ? this.characterData.droidCredits.remaining
        : (this.characterData.credits || 1000),
      weapons: [],
      // Species data
      specialAbilities: this.characterData.specialAbilities || [],
      languages: this.characterData.languages || [],
      racialSkillBonuses: this.characterData.racialSkillBonuses || [],
      speciesSource: this.characterData.speciesSource || "",
      // Background data for biography tab
      event: this.characterData.background && this.characterData.background.category === 'event' ? this.characterData.background.name : "",
      profession: this.characterData.background && this.characterData.background.category === 'occupation' ? this.characterData.background.name : "",
      planetOfOrigin: this.characterData.background && this.characterData.background.category === 'planet' ? this.characterData.background.name : ""
    };

    // For NPCs, auto-create a Nonheroic class
    if (this.actorType === "npc" && (!this.characterData.classes || this.characterData.classes.length === 0)) {
      this.characterData.classes = [{ name: "Nonheroic", level: 1 }];
    }

    const actorData = {
      name: this.characterData.name || "Unnamed Character",
      type: this.actorType, // Use the actorType passed in constructor
      system: system,
      prototypeToken: {
        name: this.characterData.name || "Unnamed Character",
        actorLink: true
      }
    };

    let created = null;
    try {
      // Create the actor
      created = await Actor.create(actorData);

      if (!created) {
        throw new Error("Actor creation returned null or undefined");
      }

      // Create embedded items (feats, talents, powers)
      // DEFENSIVE CLONE: Ensure fresh copies for actor creation
      const items = [];
      for (const f of (this.characterData.feats || [])) {
        items.push(foundry.utils.deepClone(f));
      }
      for (const t of (this.characterData.talents || [])) {
        items.push(foundry.utils.deepClone(t));
      }
      for (const p of (this.characterData.powers || [])) {
        items.push(foundry.utils.deepClone(p));
      }

      // Create class items for player characters (matching level-up behavior)
      // This ensures talent trees and other class data are available on the character sheet
      if (this.actorType !== "npc" && this.characterData.classes) {
        for (const classData of this.characterData.classes) {
          const classDoc = this._packs.classes.find(c => c.name === classData.name);
          if (classDoc) {
            // Get defenses from class doc or use defaults
            const defenses = classDoc.system.defenses?.fortitude !== undefined ||
                            classDoc.system.defenses?.reflex !== undefined ||
                            classDoc.system.defenses?.will !== undefined
              ? classDoc.system.defenses
              : { fortitude: 0, reflex: 0, will: 0 };

            const classItem = {
              name: classDoc.name,
              type: "class",
              img: classDoc.img,
              system: {
                level: classData.level || 1,
                hitDie: getHitDie(classDoc),
                babProgression: getClassProperty(classDoc, 'babProgression', 0.75),
                defenses: {
                  fortitude: defenses.fortitude || 0,
                  reflex: defenses.reflex || 0,
                  will: defenses.will || 0
                },
                description: classDoc.system.description || '',
                classSkills: getClassProperty(classDoc, 'classSkills', []),
                talentTrees: getTalentTrees(classDoc),
                forceSensitive: classDoc.system.forceSensitive || false
              }
            };
            items.push(classItem);
            SWSELogger.log(`CharGen | Created class item for ${classDoc.name} with talent trees:`, classItem.system.talentTrees);
          }
        }
      }

      // For NPCs, create a Nonheroic class item
      if (this.actorType === "npc") {
        const nonheroicClass = {
          name: "Nonheroic",
          type: "class",
          system: {
            level: 1,
            hitDie: "1d4",
            babProgression: "medium", // Will be overridden by nonheroic BAB table
            isNonheroic: true,
            defenses: {
              fortitude: 0,
              reflex: 0,
              will: 0
            },
            classSkills: [
              "acrobatics", "climb", "deception", "endurance",
              "gatherInformation", "initiative", "jump",
              "knowledgeBureaucracy", "knowledgeGalacticLore",
              "knowledgeLifeSciences", "knowledgePhysicalSciences",
              "knowledgeSocialSciences", "knowledgeTactics",
              "knowledgeTechnology", "mechanics", "perception",
              "persuasion", "pilot", "ride", "stealth", "survival",
              "swim", "treatInjury", "useComputer"
            ],
            forceSensitive: false,
            talentTrees: []
          }
        };
        items.push(nonheroicClass);
      }

      // Create embedded documents with error handling
      if (items.length > 0) {
        try {
          const createdItems = await created.createEmbeddedDocuments("Item", items);
          if (!createdItems || createdItems.length !== items.length) {
            throw new Error(`Item creation mismatch: expected ${items.length}, got ${createdItems?.length || 0}`);
          }
        } catch (itemError) {
          // Rollback: delete the actor if item creation fails
          await created.delete();
          throw new Error(`Failed to create character items: ${itemError.message}`);
        }
      }

      // Apply starting class features (weapon proficiencies, class features, etc.)
      // Skip for NPCs since they don't have class features
      if (this.actorType !== "npc" && this.characterData.classes && this.characterData.classes.length > 0) {
        const className = this.characterData.classes[0].name;
        const classDoc = this._packs.classes.find(c => c.name === className || c._id === className);
        if (classDoc) {
          try {
            await this._applyStartingClassFeatures(created, classDoc);
          } catch (featureError) {
            SWSELogger.warn("Failed to apply starting class features:", featureError);
            ui.notifications.warn("Character created, but some class features may be missing. Check your character sheet.");
            // Don't rollback here - character is usable without starting features
          }
        }
      }

      // Apply background (Event abilities, Occupation bonuses, etc.)
      if (this.characterData.background) {
        try {
          await this._applyBackgroundToActor(created);
        } catch (backgroundError) {
          SWSELogger.warn("Failed to apply background features:", backgroundError);
          ui.notifications.warn("Character created, but background features may not have been applied correctly.");
          // Non-critical error, continue
        }
      }

      // Save character generation data to flags for reference
      try {
        await created.setFlag("swse", "chargenData", this.characterData);
      } catch (flagError) {
        SWSELogger.warn("Failed to save chargen data to flags:", flagError);
        // Non-critical error, continue
      }

      // Verify the actor has the expected structure
      if (!created.system || !created.name) {
        await created.delete();
        throw new Error("Created actor has invalid structure");
      }

      // Store the actor reference
      this.actor = created;

      // Emit chargen completion hook for modules to handle
      Hooks.call('swse:progression:completed', {
        actor: created,
        mode: 'chargen',
        level: this.characterData.level || 1
      });

      // Open the character sheet
      created.sheet.render(true);

      ui.notifications.info(`Character ${this.characterData.name} created successfully!`);
    } catch (err) {
      SWSELogger.error("chargen: actor creation failed", err);
      ui.notifications.error(`Failed to create character: ${err.message}. See console for details.`);

      // Ensure we clean up if something went wrong and actor exists
      if (created && !this.actor) {
        try {
          await created.delete();
          SWSELogger.log("Rolled back partial actor creation");
        } catch (deleteError) {
          SWSELogger.error("Failed to rollback actor creation:", deleteError);
        }
      }
    }
  }

  async _updateActor() {
    // Level-up: increment level and add new items
    const newLevel = (this.actor.system.level || 1) + 1;
    const updates = { "system.level": newLevel };
    
    // Recalculate HP for new level
    const conMod = this.actor.system.abilities.con.mod || 0;
    const classDoc = this._packs.classes.find(c => 
      c.name === this.characterData.classes[0]?.name
    );
    const hitDie = classDoc?.system?.hitDie || 6;
    const hpGain = Math.floor(hitDie / 2) + 1 + conMod;
    updates["system.hp.max"] = this.actor.system.hp.max + hpGain;
    updates["system.hp.value"] = this.actor.system.hp.value + hpGain;
    
    await globalThis.SWSE.ActorEngine.updateActor(this.actor, updates);
    
    // Add new feats/talents/powers
    const items = [];
    for (const f of (this.characterData.feats || [])) items.push(f);
    for (const t of (this.characterData.talents || [])) items.push(t);
    for (const p of (this.characterData.powers || [])) items.push(p);
    
    if (items.length > 0) {
      await this.actor.createEmbeddedDocuments("Item", items);
    }
    
    ui.notifications.info(`${this.actor.name} leveled up to level ${newLevel}!`);
  }

  /**
   * Get class metadata (icon and description)
   */
  _getClassMetadata(className) {
    const metadata = {
      // Base Classes
      'Jedi': { icon: 'fa-jedi', description: 'Force-wielding guardians of peace and justice' },
      'Noble': { icon: 'fa-crown', description: 'Leaders, diplomats, and aristocrats of influence' },
      'Scoundrel': { icon: 'fa-mask', description: 'Rogues, smugglers, and fortune seekers' },
      'Scout': { icon: 'fa-binoculars', description: 'Explorers, trackers, and wilderness experts' },
      'Soldier': { icon: 'fa-shield-alt', description: 'Warriors, tacticians, and military specialists' },

      // Prestige Classes
      'Ace Pilot': { icon: 'fa-fighter-jet', description: 'Elite pilots who master vehicle combat' },
      'Assassin': { icon: 'fa-crosshairs', description: 'Deadly killers who strike from the shadows' },
      'Bounty Hunter': { icon: 'fa-bullseye', description: 'Trackers who hunt targets for profit' },
      'Charlatan': { icon: 'fa-theater-masks', description: 'Masters of deception and disguise' },
      'Corporate Agent': { icon: 'fa-briefcase', description: 'Operatives working for corporate interests' },
      'Crime Lord': { icon: 'fa-chess-king', description: 'Leaders of criminal organizations' },
      'Droid Commander': { icon: 'fa-robot', description: 'Tacticians who lead and coordinate droids' },
      'Elite Trooper': { icon: 'fa-user-shield', description: 'Elite military specialists and commandos' },
      'Enforcer': { icon: 'fa-gavel', description: 'Intimidating agents who enforce their will' },
      'Force Adept': { icon: 'fa-hand-sparkles', description: 'Force users without formal Jedi training' },
      'Force Disciple': { icon: 'fa-book-open', description: 'Students devoted to studying the Force' },
      'Gladiator': { icon: 'fa-shield', description: 'Arena fighters who excel in melee combat' },
      'Gunslinger': { icon: 'fa-gun', description: 'Quick-draw experts with ranged weapons' },
      'Imperial Knight': { icon: 'fa-chess-knight', description: 'Force-wielding servants of the Empire' },
      'Improviser': { icon: 'fa-tools', description: 'Resourceful experts who adapt to any situation' },
      'Independent Droid': { icon: 'fa-battery-full', description: 'Self-aware droids with independent thinking' },
      'Infiltrator': { icon: 'fa-user-ninja', description: 'Stealth experts who infiltrate enemy territory' },
      'Jedi Knight': { icon: 'fa-jedi', description: 'Experienced Jedi who have proven their worth' },
      'Jedi Master': { icon: 'fa-star', description: 'Elite Jedi who have achieved mastery of the Force' },
      'Martial Arts Master': { icon: 'fa-fist-raised', description: 'Unarmed combat specialists and fighters' },
      'Master Privateer': { icon: 'fa-ship', description: 'Legendary spacers and ship captains' },
      'Medic': { icon: 'fa-medkit', description: 'Healers skilled in medicine and first aid' },
      'Melee Duelist': { icon: 'fa-skull-crossbones', description: 'Masters of one-on-one melee combat' },
      'Military Engineer': { icon: 'fa-hard-hat', description: 'Combat engineers and demolitions experts' },
      'Officer': { icon: 'fa-medal', description: 'Military leaders and tactical commanders' },
      'Outlaw': { icon: 'fa-ban', description: 'Criminals who live outside the law' },
      'Pathfinder': { icon: 'fa-compass', description: 'Expert guides and wilderness scouts' },
      'Saboteur': { icon: 'fa-bomb', description: 'Specialists in sabotage and demolitions' },
      'Shaper': { icon: 'fa-cube', description: 'Biotechnologists who manipulate living organisms' },
      'Sith Apprentice': { icon: 'fa-user-secret', description: 'Dark side Force users in training' },
      'Sith Lord': { icon: 'fa-skull', description: 'Masters of the dark side of the Force' },
      'Vanguard': { icon: 'fa-flag', description: 'Front-line warriors who lead the charge' }
    };
    return metadata[className] || { icon: 'fa-user', description: 'Unknown class' };
  }

  /**
   * Organize feats by category using feat metadata
   */
  _organizeFeatsByCategory(feats) {
    if (!this._featMetadata || !this._featMetadata.feats || !this._featMetadata.categories) {
      return { uncategorized: feats };
    }

    const categorized = {};
    const uncategorized = [];

    // Initialize each category
    for (const [catKey, catInfo] of Object.entries(this._featMetadata.categories)) {
      categorized[catKey] = {
        ...catInfo,
        feats: []
      };
    }

    // Organize feats
    for (const feat of feats) {
      const metadata = this._featMetadata.feats[feat.name];
      if (metadata && metadata.category && categorized[metadata.category]) {
        categorized[metadata.category].feats.push({
          ...feat,
          metadata: metadata,
          chain: metadata.chain,
          chainOrder: metadata.chainOrder,
          prerequisiteFeat: metadata.prerequisiteFeat
        });
      } else {
        uncategorized.push(feat);
      }
    }

    // Sort feats within each category and calculate indent levels
    for (const category of Object.values(categorized)) {
      if (!category.feats) continue;

      // Sort by chain and chain order
      category.feats.sort((a, b) => {
        if (a.chain && b.chain) {
          if (a.chain === b.chain) {
            return (a.chainOrder || 0) - (b.chainOrder || 0);
          }
          return a.chain.localeCompare(b.chain);
        }
        if (a.chain) return -1;
        if (b.chain) return 1;
        return a.name.localeCompare(b.name);
      });

      // Calculate indent levels
      category.feats.forEach(feat => {
        if (!feat.chain) {
          feat.indentLevel = 0;
          return;
        }

        let indentLevel = 0;
        let currentPrereq = feat.prerequisiteFeat;

        while (currentPrereq) {
          indentLevel++;
          const prereqFeat = category.feats.find(f => f.name === currentPrereq);
          currentPrereq = prereqFeat?.prerequisiteFeat;

          if (indentLevel > 10) break;
        }

        feat.indentLevel = indentLevel;
      });
    }

    // Add uncategorized if any exist
    if (uncategorized.length > 0) {
      categorized.uncategorized = {
        name: "Other Feats",
        description: "Feats without a specific category",
        icon: "📋",
        order: 999,
        feats: uncategorized
      };
    }

    return categorized;
  }

  /**
   * Get default ability for a skill key (snake_case format)
   * @param {string} skillKey - The skill key in snake_case
   * @returns {string} The default ability key
   */
  _getDefaultAbilityForSkill(skillKey) {
    const abilityMap = {
      acrobatics: 'dex',
      climb: 'str',
      deception: 'cha',
      endurance: 'con',
      gatherInformation: 'cha',
      initiative: 'dex',
      jump: 'str',
      knowledgeBureaucracy: 'int',
      knowledgeGalacticLore: 'int',
      knowledgeLifeSciences: 'int',
      knowledgePhysicalSciences: 'int',
      knowledgeSocialSciences: 'int',
      knowledgeTactics: 'int',
      knowledgeTechnology: 'int',
      mechanics: 'int',
      perception: 'wis',
      persuasion: 'cha',
      pilot: 'dex',
      ride: 'dex',
      stealth: 'dex',
      survival: 'wis',
      swim: 'str',
      treatInjury: 'wis',
      useComputer: 'int',
      useTheForce: 'cha'
    };
    return abilityMap[skillKey] || 'int';
  }

  /**
   * Get default skills list when skills.json fails to load
   * @returns {Array} Array of default skill objects
   */
  _getDefaultSkills() {
    return [
      { key: "acrobatics", name: "Acrobatics", ability: "dex", trained: false, armorCheck: true },
      { key: "climb", name: "Climb", ability: "str", trained: false, armorCheck: true },
      { key: "deception", name: "Deception", ability: "cha", trained: false },
      { key: "endurance", name: "Endurance", ability: "con", trained: false, armorCheck: true },
      { key: "gatherInformation", name: "Gather Information", ability: "cha", trained: false },
      { key: "initiative", name: "Initiative", ability: "dex", trained: false },
      { key: "jump", name: "Jump", ability: "str", trained: false, armorCheck: true },
      { key: "knowledge", name: "Knowledge", ability: "int", trained: true },
      { key: "mechanics", name: "Mechanics", ability: "int", trained: true },
      { key: "perception", name: "Perception", ability: "wis", trained: false },
      { key: "persuasion", name: "Persuasion", ability: "cha", trained: false },
      { key: "pilot", name: "Pilot", ability: "dex", trained: false },
      { key: "ride", name: "Ride", ability: "dex", trained: false },
      { key: "stealth", name: "Stealth", ability: "dex", trained: false, armorCheck: true },
      { key: "survival", name: "Survival", ability: "wis", trained: false },
      { key: "swim", name: "Swim", ability: "str", trained: false, armorCheck: true },
      { key: "treatInjury", name: "Treat Injury", ability: "wis", trained: false },
      { key: "useComputer", name: "Use Computer", ability: "int", trained: true },
      { key: "useTheForce", name: "Use the Force", ability: "cha", trained: true }
    ];
  }
}

// Mix in all module methods
Object.assign(CharacterGenerator.prototype, SharedModule);
Object.assign(CharacterGenerator.prototype, DroidModule);
Object.assign(CharacterGenerator.prototype, SpeciesModule);
Object.assign(CharacterGenerator.prototype, BackgroundsModule);
Object.assign(CharacterGenerator.prototype, ClassModule);
Object.assign(CharacterGenerator.prototype, AbilitiesModule);
Object.assign(CharacterGenerator.prototype, SkillsModule);
Object.assign(CharacterGenerator.prototype, LanguagesModule);
Object.assign(CharacterGenerator.prototype, FeatsTalentsModule);
Object.assign(CharacterGenerator.prototype, ForcePowersModule);
