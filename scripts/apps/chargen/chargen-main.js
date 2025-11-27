// ============================================
// Main CharacterGenerator class
// Orchestrates all chargen functionality
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { PrerequisiteValidator } from '../../utils/prerequisite-validator.js';

// Import all module functions
import * as SharedModule from './chargen-shared.js';
import * as DroidModule from './chargen-droid.js';
import * as SpeciesModule from './chargen-species.js';
import * as ClassModule from './chargen-class.js';
import * as AbilitiesModule from './chargen-abilities.js';
import * as SkillsModule from './chargen-skills.js';
import * as FeatsTalentsModule from './chargen-feats-talents.js';

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
      droids: null
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
      template: "systems/swse/templates/apps/chargen.hbs",
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
    const packNames = {
      species: "swse.species",
      feats: "swse.feats",
      talents: "swse.talents",
      classes: "swse.classes",
      droids: "swse.droids"
    };

    let hasErrors = false;
    const failedPacks = [];

    for (const [k, packName] of Object.entries(packNames)) {
      try {
        const pack = game.packs.get(packName);
        if (!pack) {
          SWSELogger.error(`chargen: compendium pack "${packName}" not found!`);
          this._packs[k] = [];
          hasErrors = true;
          failedPacks.push(k);
          continue;
        }
        const docs = await pack.getDocuments();
        this._packs[k] = docs.map(d => d.toObject());
        SWSELogger.log(`chargen: loaded ${docs.length} items from ${packName}`);
      } catch (err) {
        SWSELogger.error(`chargen: failed to load pack ${packName}:`, err);
        this._packs[k] = [];
        hasErrors = true;
        failedPacks.push(k);
      }
    }

    // Notify user if any packs failed to load
    if (hasErrors) {
      const failedList = failedPacks.join(', ');
      ui.notifications.error(
        `Failed to load some compendium data: ${failedList}. Some options may be unavailable. Check the console for details.`,
        { permanent: false }
      );
    }

    // Load skills
    try {
      const resp = await fetch("systems/swse/data/skills.json");
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
      const resp = await fetch("systems/swse/data/feat-metadata.json");
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
  }

  async getData() {
    const context = super.getData();
    if (!this._packs.species) await this._loadData();

    context.characterData = this.characterData;
    context.currentStep = this.currentStep;
    context.isLevelUp = !!this.actor;
    context.freeBuild = this.freeBuild;
    context.packs = foundry.utils.deepClone(this._packs);
    context.skillsJson = this._skillsJson || [];

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
        // Check multiple possible field names and formats
        const talentTree = t.system?.tree || t.system?.talent_tree || t.system?.talentTree || '';
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
    const classSkills = selectedClass?.system?.class_skills || [];

    // Available skills for selection with bonuses
    const halfLevel = Math.floor(this.characterData.level / 2);
    context.availableSkills = this._getAvailableSkills().map(skill => {
      const abilityMod = this.characterData.abilities[skill.ability]?.mod || 0;
      const isTrained = this.characterData.skills[skill.key]?.trained || false;
      const isClassSkill = classSkills.some(cs =>
        cs.toLowerCase().includes(skill.name.toLowerCase()) ||
        skill.name.toLowerCase().includes(cs.toLowerCase())
      );

      const baseBonus = halfLevel + abilityMod;
      const currentBonus = baseBonus + (isTrained ? 5 : 0);
      const trainedBonus = baseBonus + 5;

      return {
        ...skill,
        trained: isTrained,
        isClassSkill: isClassSkill,
        currentBonus: currentBonus,
        trainedBonus: trainedBonus,
        abilityMod: abilityMod,
        halfLevel: halfLevel
      };
    });

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

    // Progress step navigation (only in Free Build mode)
    if (this.freeBuild) {
      $html.find('.progress-step').addClass('clickable');
      $html.find('.progress-step').click(this._onJumpToStep.bind(this));
    }
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
    $html.find('.skill-select').change(this._onSkillSelect.bind(this));
    $html.find('.train-skill-btn').click(this._onTrainSkill.bind(this));
    $html.find('.untrain-skill-btn').click(this._onUntrainSkill.bind(this));
    $html.find('.reset-skills-btn').click(this._onResetSkills.bind(this));

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
  }

  _getSteps() {
    if (this.actor) {
      return ["class", "feats", "talents", "skills", "summary"];
    }

    // Include type selection (living/droid) after name
    const steps = ["name", "type"];

    // If droid, show degree and size selection; if living, show species
    if (this.characterData.isDroid) {
      steps.push("degree", "size", "droid-builder");
    } else {
      steps.push("species");
    }

    // NPC workflow: skip class and talents, go straight to abilities/feats/skills
    if (this.actorType === "npc") {
      steps.push("abilities", "feats", "skills", "summary");
    } else {
      // PC workflow: normal flow with class and talents
      steps.push("abilities", "class", "feats", "talents", "skills", "summary", "shop");
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
      const nextStep = steps[idx + 1];

      // Create character when moving from summary to shop
      if (this.currentStep === "summary" && nextStep === "shop") {
        this._finalizeCharacter();
        if (!this.actor) {
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
    if (!this.freeBuild) {
      ui.notifications.warn("Enable Free Build mode to jump between steps.");
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const targetStep = event.currentTarget.dataset.step;
    const steps = this._getSteps();

    if (!steps.includes(targetStep)) {
      SWSELogger.warn(`CharGen | Invalid step: ${targetStep}`);
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
    this.freeBuild = event.currentTarget.checked;

    if (this.freeBuild) {
      new Dialog({
        title: "Free Build Mode",
        content: `
          <div class="form-group">
            <p><i class="fas fa-unlock-alt"></i> <strong>Free Build Mode Enabled</strong></p>
            <p>You can now:</p>
            <ul style="margin-left: 20px;">
              <li>Skip validation requirements</li>
              <li>Select any feats or talents</li>
              <li>Bypass prerequisite checks</li>
              <li>Train any skills without class restrictions</li>
              <li>Build your character freely</li>
            </ul>
            <p style="margin-top: 15px; color: #999;">
              <em>Note: This is intended for experienced players or GMs who want quick character creation.</em>
            </p>
          </div>
        `,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: "Continue"
          }
        },
        default: "ok"
      }, {
        width: 400
      }).render(true);
    } else {
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
    const system = {
      level: this.characterData.level,
      race: this.characterData.species,  // Map species → race for actor system
      size: this.characterData.size || "Medium",
      abilities: this.characterData.abilities,
      skills: this.characterData.skills,
      hp: this.characterData.hp,
      forcePoints: this.characterData.forcePoints,
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
      speciesSource: this.characterData.speciesSource || ""
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

    try {
      const created = await Actor.create(actorData);

      // Create embedded items (feats, talents, powers)
      const items = [];
      for (const f of (this.characterData.feats || [])) {
        items.push(f);
      }
      for (const t of (this.characterData.talents || [])) {
        items.push(t);
      }
      for (const p of (this.characterData.powers || [])) {
        items.push(p);
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
              "gather_information", "initiative", "jump",
              "knowledge_bureaucracy", "knowledge_galactic_lore",
              "knowledge_life_sciences", "knowledge_physical_sciences",
              "knowledge_social_sciences", "knowledge_tactics",
              "knowledge_technology", "mechanics", "perception",
              "persuasion", "pilot", "ride", "stealth", "survival",
              "swim", "treat_injury", "use_computer"
            ],
            forceSensitive: false,
            talent_trees: []
          }
        };
        items.push(nonheroicClass);
      }

      if (items.length > 0) {
        await created.createEmbeddedDocuments("Item", items);
      }

      // Apply starting class features (weapon proficiencies, class features, etc.)
      // Skip for NPCs since they don't have class features
      if (this.actorType !== "npc" && this.characterData.classes && this.characterData.classes.length > 0) {
        const className = this.characterData.classes[0].name;
        const classDoc = this._packs.classes.find(c => c.name === className || c._id === className);
        if (classDoc) {
          await this._applyStartingClassFeatures(created, classDoc);
        }
      }

      // Save character generation data to flags for reference
      await created.setFlag("swse", "chargenData", this.characterData);

      // Store the actor reference
      this.actor = created;

      // Open the character sheet
      created.sheet.render(true);

      ui.notifications.info(`Character ${this.characterData.name} created successfully!`);
    } catch (err) {
      SWSELogger.error("chargen: actor creation failed", err);
      ui.notifications.error("Failed to create character. See console for details.");
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
    
    await this.actor.update(updates);
    
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
      'Jedi': { icon: 'fa-jedi', description: 'Force-wielding guardians of peace and justice' },
      'Noble': { icon: 'fa-crown', description: 'Leaders, diplomats, and aristocrats of influence' },
      'Scoundrel': { icon: 'fa-mask', description: 'Rogues, smugglers, and fortune seekers' },
      'Scout': { icon: 'fa-binoculars', description: 'Explorers, trackers, and wilderness experts' },
      'Soldier': { icon: 'fa-shield-alt', description: 'Warriors, tacticians, and military specialists' }
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
          metadata: metadata
        });
      } else {
        uncategorized.push(feat);
      }
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
}

// Mix in all module methods
Object.assign(CharacterGenerator.prototype, SharedModule);
Object.assign(CharacterGenerator.prototype, DroidModule);
Object.assign(CharacterGenerator.prototype, SpeciesModule);
Object.assign(CharacterGenerator.prototype, ClassModule);
Object.assign(CharacterGenerator.prototype, AbilitiesModule);
Object.assign(CharacterGenerator.prototype, SkillsModule);
Object.assign(CharacterGenerator.prototype, FeatsTalentsModule);
